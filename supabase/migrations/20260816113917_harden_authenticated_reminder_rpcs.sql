create or replace function public.consume_my_in_app_deliveries(
  p_limit integer default 20
)
returns table (
  delivery_id uuid,
  reminder_id uuid,
  scheduled_for timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'p_limit must be between 1 and 50' using errcode = '22023';
  end if;

  return query
  with claimed as (
    select delivery.id
    from public.reminder_deliveries delivery
    where delivery.user_id = current_user_id
      and delivery.channel = 'in_app'
      and delivery.status = 'queued'
    order by delivery.scheduled_for, delivery.id
    for update skip locked
    limit p_limit
  )
  update public.reminder_deliveries delivery
  set status = 'sent',
      attempt_count = delivery.attempt_count + 1,
      sent_at = statement_timestamp(),
      failed_at = null,
      error_code = null
  from claimed
  where delivery.id = claimed.id
  returning delivery.id, delivery.reminder_id, delivery.scheduled_for;
end;
$function$;

create or replace function public.register_my_push_device(
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
  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'Unsupported push platform' using errcode = '22023';
  end if;
  if normalized_token is null
    or char_length(normalized_token) < 20
    or char_length(normalized_token) > 4096 then
    raise exception 'Invalid push token' using errcode = '22023';
  end if;
  if normalized_locale is null
    or char_length(normalized_locale) < 2
    or char_length(normalized_locale) > 35 then
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

create or replace function public.disable_my_push_devices()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.push_devices
  set enabled = false
  where user_id = current_user_id;
end;
$function$;

revoke all on function public.consume_my_in_app_deliveries(integer)
  from public, anon, authenticated;
revoke all on function public.register_my_push_device(text, text, text)
  from public, anon, authenticated;
revoke all on function public.disable_my_push_devices()
  from public, anon, authenticated;

grant execute on function public.consume_my_in_app_deliveries(integer)
  to authenticated;
grant execute on function public.register_my_push_device(text, text, text)
  to authenticated;
grant execute on function public.disable_my_push_devices()
  to authenticated;
