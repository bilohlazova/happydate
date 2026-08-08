create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  token text not null,
  locale text not null default 'en',
  enabled boolean not null default true,
  last_seen_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint push_devices_platform_check check (platform in ('ios', 'android')),
  constraint push_devices_token_length_check check (char_length(token) between 20 and 4096),
  constraint push_devices_locale_length_check check (char_length(locale) between 2 and 35),
  constraint push_devices_token_unique unique (token)
);

create index push_devices_user_enabled_idx
  on public.push_devices (user_id, last_seen_at desc)
  where enabled;

create trigger push_devices_set_updated_at
before update on public.push_devices
for each row execute function public.set_updated_at();

alter table public.push_devices enable row level security;
revoke all on table public.push_devices from public, anon, authenticated;

create function public.register_my_push_device(
  p_token text,
  p_platform text,
  p_locale text default 'en'
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  normalized_token text := btrim(p_token);
  normalized_locale text := btrim(p_locale);
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'Unsupported push platform' using errcode = '22023';
  end if;
  if char_length(normalized_token) < 20 or char_length(normalized_token) > 4096 then
    raise exception 'Invalid push token' using errcode = '22023';
  end if;
  if char_length(normalized_locale) < 2 or char_length(normalized_locale) > 35 then
    raise exception 'Invalid locale' using errcode = '22023';
  end if;

  insert into public.push_devices (
    user_id, platform, token, locale, enabled, last_seen_at
  ) values (
    current_user_id, p_platform, normalized_token, normalized_locale, true, statement_timestamp()
  )
  on conflict (token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      locale = excluded.locale,
      enabled = true,
      last_seen_at = statement_timestamp();
end;
$function$;

create function public.disable_my_push_devices()
returns void
language sql
security definer
set search_path = ''
as $function$
  update public.push_devices
  set enabled = false
  where user_id = (select auth.uid())
    and (select auth.uid()) is not null;
$function$;

revoke all on function public.register_my_push_device(text, text, text)
  from public, anon, authenticated;
revoke all on function public.disable_my_push_devices()
  from public, anon, authenticated;
grant execute on function public.register_my_push_device(text, text, text)
  to authenticated;
grant execute on function public.disable_my_push_devices()
  to authenticated;

create or replace function private.queue_due_reminder_deliveries(
  p_now timestamptz default statement_timestamp(),
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  candidate record;
  local_time time;
  is_quiet boolean;
  inserted_count integer;
  queued_count integer := 0;
begin
  if p_limit < 1 or p_limit > 500 then
    raise exception 'p_limit must be between 1 and 500' using errcode = '22023';
  end if;

  for candidate in
    select
      reminder.id,
      reminder.user_id,
      reminder.next_remind_at,
      coalesce(preference.timezone, 'UTC') as timezone,
      coalesce(preference.quiet_hours_start, time '22:00') as quiet_start,
      coalesce(preference.quiet_hours_end, time '08:00') as quiet_end,
      coalesce(preference.repeat_interval_minutes, 180) as repeat_minutes,
      coalesce(preference.in_app_enabled, true) as in_app_enabled,
      coalesce(preference.push_enabled, false) as push_enabled
    from public.reminders reminder
    left join public.reminder_preferences preference
      on preference.user_id = reminder.user_id
    where reminder.state in ('pending', 'snoozed')
      and reminder.next_remind_at <= p_now
    order by reminder.next_remind_at, reminder.id
    for update of reminder skip locked
    limit p_limit
  loop
    local_time := (p_now at time zone candidate.timezone)::time;
    is_quiet := candidate.quiet_start <> candidate.quiet_end and (
      (candidate.quiet_start < candidate.quiet_end and local_time >= candidate.quiet_start and local_time < candidate.quiet_end)
      or
      (candidate.quiet_start > candidate.quiet_end and (local_time >= candidate.quiet_start or local_time < candidate.quiet_end))
    );

    inserted_count := 0;
    if not is_quiet then
      insert into public.reminder_deliveries (
        user_id, reminder_id, channel, scheduled_for
      )
      select candidate.user_id, candidate.id, channel.name, candidate.next_remind_at
      from (values
        ('in_app'::text, candidate.in_app_enabled),
        ('push'::text, candidate.push_enabled and exists (
          select 1 from public.push_devices device
          where device.user_id = candidate.user_id and device.enabled
        ))
      ) as channel(name, enabled)
      where channel.enabled
      on conflict (reminder_id, channel, scheduled_for) do nothing;

      get diagnostics inserted_count = row_count;
    end if;

    if inserted_count > 0 then
      update public.reminders
      set state = 'pending',
          snoozed_until = null,
          next_remind_at = p_now + pg_catalog.make_interval(mins => candidate.repeat_minutes)
      where id = candidate.id;
      queued_count := queued_count + inserted_count;
    end if;
  end loop;

  return queued_count;
end;
$function$;

revoke all on function private.queue_due_reminder_deliveries(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function private.queue_due_reminder_deliveries(timestamptz, integer)
  to service_role;
