create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  repeat_interval_minutes integer not null default 180,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_preferences_timezone_length_check
    check (char_length(timezone) between 1 and 64),
  constraint reminder_preferences_repeat_interval_check
    check (repeat_interval_minutes in (60, 180, 360, 720, 1440)),
  constraint reminder_preferences_delivery_check
    check (in_app_enabled or push_enabled)
);

create function private.validate_reminder_preferences_timezone()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  perform statement_timestamp() at time zone new.timezone;
  return new;
exception when invalid_parameter_value then
  raise exception 'Invalid IANA timezone' using errcode = '22023';
end;
$function$;

revoke all on function private.validate_reminder_preferences_timezone()
  from public, anon, authenticated;

create trigger reminder_preferences_validate_timezone
before insert or update of timezone on public.reminder_preferences
for each row execute function private.validate_reminder_preferences_timezone();

create trigger reminder_preferences_set_updated_at
before update on public.reminder_preferences
for each row execute function public.set_updated_at();

alter table public.reminder_preferences enable row level security;
revoke all on table public.reminder_preferences from public, anon, authenticated;
grant select, insert, update on table public.reminder_preferences to authenticated;

create policy "reminder_preferences_select_own"
on public.reminder_preferences for select to authenticated
using ((select auth.uid()) = user_id);
create policy "reminder_preferences_insert_own"
on public.reminder_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "reminder_preferences_update_own"
on public.reminder_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  channel text not null default 'in_app',
  scheduled_for timestamptz not null,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  sent_at timestamptz,
  failed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_deliveries_channel_check check (channel in ('in_app', 'push')),
  constraint reminder_deliveries_status_check check (status in ('queued', 'processing', 'sent', 'failed', 'skipped')),
  constraint reminder_deliveries_attempt_count_check check (attempt_count >= 0),
  constraint reminder_deliveries_idempotency_unique unique (reminder_id, channel, scheduled_for)
);

create index reminder_deliveries_user_created_idx
  on public.reminder_deliveries (user_id, created_at desc);
create index reminder_deliveries_queued_idx
  on public.reminder_deliveries (created_at)
  where status = 'queued';

create trigger reminder_deliveries_set_updated_at
before update on public.reminder_deliveries
for each row execute function public.set_updated_at();

alter table public.reminder_deliveries enable row level security;
revoke all on table public.reminder_deliveries from public, anon, authenticated;
grant select on table public.reminder_deliveries to authenticated;
create policy "reminder_deliveries_select_own"
on public.reminder_deliveries for select to authenticated
using ((select auth.uid()) = user_id);

create function private.queue_due_reminder_deliveries(
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
      coalesce(preference.in_app_enabled, true) as in_app_enabled
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

    if not is_quiet and candidate.in_app_enabled then
      insert into public.reminder_deliveries (
        user_id, reminder_id, channel, scheduled_for
      ) values (
        candidate.user_id, candidate.id, 'in_app', candidate.next_remind_at
      ) on conflict (reminder_id, channel, scheduled_for) do nothing;

      if found then
        update public.reminders
        set state = 'pending',
            snoozed_until = null,
            next_remind_at = p_now + pg_catalog.make_interval(mins => candidate.repeat_minutes)
        where id = candidate.id;
        queued_count := queued_count + 1;
      end if;
    end if;
  end loop;

  return queued_count;
end;
$function$;

revoke all on function private.queue_due_reminder_deliveries(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function private.queue_due_reminder_deliveries(timestamptz, integer)
  to service_role;
