-- A deterministic proactive opportunity has one durable semantic identity per
-- owner and birthday occurrence. NULL remains available for all pre-existing
-- and non-proactive Ideas.
alter table public.happy_ideas
  add column proactive_key text;

alter table public.happy_ideas
  add constraint happy_ideas_proactive_key_check
    check (proactive_key is null or char_length(btrim(proactive_key)) between 1 and 255),
  add constraint happy_ideas_user_proactive_key_key
    unique (user_id, proactive_key);

create index happy_ideas_proactive_key_idx
  on public.happy_ideas (proactive_key)
  where proactive_key is not null;

comment on column public.happy_ideas.proactive_key is
  'Stable backend-owned identity for deterministic proactive opportunities; never supplied by browser clients.';

create function public.try_create_happy_proactive_birthday_idea(
  p_user_id uuid,
  p_person_id uuid,
  p_event_id uuid,
  p_occurrence_date date
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.events event
    join public.people person on person.id = event.person_id
    where event.id = p_event_id
      and event.user_id = p_user_id
      and event.person_id = p_person_id
      and event.date = p_occurrence_date
      and event.category = 'birthday'
      and event.date between (statement_timestamp() at time zone 'UTC')::date
        and ((statement_timestamp() at time zone 'UTC')::date + 14)
      and person.user_id = p_user_id
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.happy_tasks task
    where task.user_id = p_user_id
      and task.person_id = p_person_id
      and task.event_id = p_event_id
      and task.type = 'birthday_preparation'
      and task.status in ('active', 'waiting_user', 'paused')
  ) or exists (
    select 1 from public.gifts gift
    where gift.user_id = p_user_id
      and gift.person_id = p_person_id
      and gift.event_id = p_event_id
      and gift.lifecycle in ('selected', 'purchased')
  ) then
    return false;
  end if;

  insert into public.happy_ideas (
    user_id, person_id, event_id, type, title, message, proactive_key
  ) values (
    p_user_id,
    p_person_id,
    p_event_id,
    'birthday_preparation',
    'Prepare for an upcoming birthday',
    'Start preparing for this birthday.',
    'birthday-preparation:' || p_user_id::text || ':' || p_event_id::text || ':' || p_occurrence_date::text
  ) on conflict (user_id, proactive_key) do nothing;

  return found;
end;
$function$;

create function public.try_create_happy_proactive_birthday_notification(
  p_user_id uuid,
  p_person_id uuid,
  p_event_id uuid,
  p_occurrence_date date
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.events event
    join public.people person on person.id = event.person_id
    where event.id = p_event_id
      and event.user_id = p_user_id
      and event.person_id = p_person_id
      and event.date = p_occurrence_date
      and event.category = 'birthday'
      and event.date between (statement_timestamp() at time zone 'UTC')::date
        and ((statement_timestamp() at time zone 'UTC')::date + 7)
      and person.user_id = p_user_id
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.happy_tasks task
    where task.user_id = p_user_id
      and task.person_id = p_person_id
      and task.event_id = p_event_id
      and task.type = 'birthday_preparation'
      and task.status in ('active', 'waiting_user', 'paused')
  ) or exists (
    select 1 from public.gifts gift
    where gift.user_id = p_user_id
      and gift.person_id = p_person_id
      and gift.event_id = p_event_id
      and gift.lifecycle in ('selected', 'purchased')
  ) then
    return false;
  end if;

  insert into public.happy_notifications (
    user_id, person_id, event_id, type, title, message, priority, dedupe_key
  ) values (
    p_user_id,
    p_person_id,
    p_event_id,
    'birthday_preparation',
    'Birthday preparation',
    'An upcoming birthday may need preparation.',
    'normal',
    'birthday-preparation-notification:' || p_user_id::text || ':' || p_event_id::text || ':' || p_occurrence_date::text
  ) on conflict (user_id, dedupe_key) do nothing;

  return found;
end;
$function$;

revoke all on function public.try_create_happy_proactive_birthday_idea(uuid, uuid, uuid, date)
  from public, anon, authenticated;
revoke all on function public.try_create_happy_proactive_birthday_notification(uuid, uuid, uuid, date)
  from public, anon, authenticated;
grant execute on function public.try_create_happy_proactive_birthday_idea(uuid, uuid, uuid, date)
  to service_role;
grant execute on function public.try_create_happy_proactive_birthday_notification(uuid, uuid, uuid, date)
  to service_role;

-- pg_net only receives an already-authorized Edge Function request. The URL
-- and bearer value live in Vault and are deliberately not encoded in source.
create extension if not exists pg_net;

create function private.invoke_happy_proactive()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  function_url text;
  cron_authorization text;
  request_id bigint;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'happy_proactive_function_url';

  select decrypted_secret into cron_authorization
  from vault.decrypted_secrets
  where name = 'happy_proactive_cron_authorization';

  if function_url is null or cron_authorization is null then
    raise exception using
      errcode = 'P0001',
      message = 'happy_proactive_cron_configuration_missing';
  end if;

  select net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_authorization,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function private.invoke_happy_proactive()
  from public, anon, authenticated;

do $block$
begin
  if not exists (
    select 1 from cron.job
    where jobname = 'happydate-happy-proactive-every-two-hours'
  ) then
    perform cron.schedule(
      'happydate-happy-proactive-every-two-hours',
      '0 */2 * * *',
      $cron$select private.invoke_happy_proactive();$cron$
    );
  end if;
end;
$block$;
