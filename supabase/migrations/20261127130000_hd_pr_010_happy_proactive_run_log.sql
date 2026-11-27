-- HD-PR-010: technical run log, alerting and retention for HappyBot Proactive.
--
-- Purpose: know whether the scheduled run worked, without keeping personal data.
--   * private.happy_proactive_run_log   one row per run: outcome, HTTP status, time-out,
--                                        duration, counters, `truncated`. Numbers and
--                                        whitelisted codes only (no body, headers, URL,
--                                        message text, token, e-mail, identifier of a person).
--   * collector                         resolves pending runs from net._http_response (kept
--                                        by pg_net for only 6 hours) and ingests failed cron
--                                        runs (cron.job_run_details; the message is mapped to
--                                        a code and never stored).
--   * alerts                            critical: no successful run for more than
--                                        3 h 30 min, last run failed, repeated failures;
--                                        warning: truncated scan, slow run. Optional delivery
--                                        through an HTTPS webhook read from Vault.
--   * retention                         30 days, newest 5,000 rows, hard ceiling 20,000.
--
-- Forward-only. Nothing is scheduled to run: the monitor job is created INACTIVE and the
-- happy-proactive cron job is not touched. Applying this migration changes the invoker
-- private.invoke_happy_proactive() by exactly one block (the run-log insert, wrapped so a
-- logging problem can never block a run); URL/secret guards, the 160 s time-out, security
-- definer, search_path and privileges are identical to 20261127110406.
--
-- Rollback: supabase/rollbacks/20261127130000_hd_pr_010_happy_proactive_run_log.rollback.sql

-- ---------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------
create table if not exists private.happy_proactive_run_log (
  id bigint generated always as identity primary key,
  request_id bigint unique,
  cron_run_id bigint unique,
  started_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  outcome text not null
    check (outcome in ('pending', 'ok', 'truncated', 'http_error', 'timeout', 'no_response', 'cron_failed')),
  http_status integer check (http_status between 100 and 599),
  timed_out boolean,
  error_code text
    check (error_code in (
      'unauthorized', 'unavailable', 'method_not_allowed', 'unexpected_request_payload',
      'proactive_read_failed', 'proactive_write_failed',
      'configuration_missing', 'function_url_invalid', 'secret_invalid', 'other')),
  duration_ms integer check (duration_ms between 0 and 3600000),
  scanned_candidates integer check (scanned_candidates >= 0),
  scan_pages integer check (scan_pages >= 0),
  truncated boolean,
  ideas_created integer check (ideas_created >= 0),
  notifications_created integer check (notifications_created >= 0),
  occasion_scanned integer check (occasion_scanned >= 0),
  check (request_id is not null or cron_run_id is not null)
);

create index if not exists happy_proactive_run_log_started_at_idx
  on private.happy_proactive_run_log (started_at desc);

create table if not exists private.happy_proactive_alerts (
  rule_key text primary key,
  severity text not null check (severity in ('critical', 'warning')),
  status text not null check (status in ('ok', 'firing')),
  since timestamptz not null default now(),
  last_notified_at timestamptz,
  notify_count integer not null default 0,
  detail text check (char_length(detail) <= 120)
);

create table if not exists private.happy_proactive_monitor_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table private.happy_proactive_run_log enable row level security;
alter table private.happy_proactive_alerts enable row level security;
alter table private.happy_proactive_monitor_state enable row level security;

revoke all on table private.happy_proactive_run_log from public, anon, authenticated, service_role;
revoke all on table private.happy_proactive_alerts from public, anon, authenticated, service_role;
revoke all on table private.happy_proactive_monitor_state from public, anon, authenticated, service_role;

insert into private.happy_proactive_monitor_state (key, value)
values
  ('installed_at', now()::text),
  ('cron_last_runid', coalesce((select max(runid) from cron.job_run_details), 0)::text)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------
-- Small helpers (pure, no personal data)
-- ---------------------------------------------------------------------------------------
create or replace function private.happy_proactive_try_jsonb(p_text text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if p_text is null or left(p_text, 1) <> '{' then
    return null;
  end if;
  return p_text::jsonb;
exception when others then
  return null;
end;
$function$;

create or replace function private.happy_proactive_error_code(p_raw text)
returns text
language sql
immutable
security definer
set search_path = ''
as $function$
  select case
    when p_raw in ('unauthorized', 'unavailable', 'method_not_allowed', 'unexpected_request_payload',
                   'proactive_read_failed', 'proactive_write_failed') then p_raw
    else 'other'
  end;
$function$;

create or replace function private.happy_proactive_cron_error_code(p_message text)
returns text
language sql
immutable
security definer
set search_path = ''
as $function$
  select case
    when p_message like '%happy_proactive_cron_configuration_missing%' then 'configuration_missing'
    when p_message like '%happy_proactive_cron_function_url_invalid%' then 'function_url_invalid'
    when p_message like '%happy_proactive_cron_secret_invalid%' then 'secret_invalid'
    else 'other'
  end;
$function$;

create or replace function private.happy_proactive_int(p_json jsonb, p_path text[])
returns integer
language sql
immutable
security definer
set search_path = ''
as $function$
  select case when (p_json #>> p_path) ~ '^[0-9]{1,9}$' then (p_json #>> p_path)::integer end;
$function$;

create or replace function private.happy_proactive_sum_object(p_json jsonb, p_key text)
returns integer
language sql
immutable
security definer
set search_path = ''
as $function$
  select case when jsonb_typeof(p_json -> p_key) = 'object' then
    (select coalesce(sum(value::integer), 0)::integer
     from jsonb_each_text(p_json -> p_key) where value ~ '^[0-9]{1,9}$')
  end;
$function$;

-- ---------------------------------------------------------------------------------------
-- Invoker: same as 20261127110406 plus the run-log insert
-- ---------------------------------------------------------------------------------------
create or replace function private.invoke_happy_proactive()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  function_url text;
  cron_secret text;
  url_ref text;
  sent_request_id bigint;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'happy_proactive_function_url';

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'happy_proactive_cron_authorization';

  if function_url is null or cron_secret is null then
    raise exception using
      errcode = 'P0001',
      message = 'happy_proactive_cron_configuration_missing';
  end if;

  -- HTTPS, no port, no userinfo, no query or fragment, a Supabase project host
  -- (refs are 20 lowercase letters) and the exact function path.
  if function_url !~ '^https://[a-z]{20}\.supabase\.co/functions/v1/happy-proactive$' then
    raise exception using
      errcode = 'P0001',
      message = 'happy_proactive_cron_function_url_invalid';
  end if;

  -- The secret must look like <ref>.<random token> with the SAME ref as the URL.
  -- Supabase API keys (sb_..., eyJ...) can never match this shape.
  url_ref := substring(function_url from '^https://([a-z]{20})\.supabase\.co/');
  if cron_secret !~ '^[a-z]{20}\.[A-Za-z0-9_-]{32,}$'
    or split_part(cron_secret, '.', 1) <> url_ref then
    raise exception using
      errcode = 'P0001',
      message = 'happy_proactive_cron_secret_invalid';
  end if;

  select net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 160000
  ) into sent_request_id;

  -- Technical run log: counters only. A logging problem must never block the run.
  begin
    if (select count(*) from (select 1 from private.happy_proactive_run_log limit 20000) capped) < 20000 then
      insert into private.happy_proactive_run_log (request_id, started_at, outcome)
      values (sent_request_id, clock_timestamp(), 'pending')
      on conflict (request_id) do nothing;
    end if;
  exception when others then
    raise warning 'happy_proactive_run_log_insert_failed %', sqlstate;
  end;

  return sent_request_id;
end;
$function$;

revoke all on function private.invoke_happy_proactive()
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------
-- Collector: pending runs -> outcome; failed cron runs -> rows
-- ---------------------------------------------------------------------------------------
create or replace function private.collect_happy_proactive_run_log()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  last_runid bigint;
  seen_runid bigint;
  changed integer := 0;
  step_count integer;
begin
  with r as (
    select l.id as log_id, resp.status_code, coalesce(resp.timed_out, false) as timed_out,
           private.happy_proactive_try_jsonb(resp.content) as j
    from private.happy_proactive_run_log l
    join net._http_response resp on resp.id = l.request_id
    where l.outcome = 'pending'
  )
  update private.happy_proactive_run_log l
  set http_status = r.status_code,
      timed_out = r.timed_out,
      outcome = case
        when r.timed_out then 'timeout'
        when r.status_code is null then 'http_error'
        when r.status_code = 200 and r.j is null then 'http_error'
        when r.status_code = 200 and (r.j -> 'scan' ->> 'truncated') = 'true' then 'truncated'
        when r.status_code = 200 then 'ok'
        else 'http_error' end,
      error_code = case
        when r.timed_out then null
        when r.status_code is null then 'other'
        when r.status_code = 200 and r.j is null then 'other'
        when r.status_code = 200 then null
        else private.happy_proactive_error_code(r.j ->> 'error') end,
      duration_ms = case when r.status_code = 200 then
        least(private.happy_proactive_int(r.j, array['durationMs']), 3600000) end,
      scanned_candidates = case when r.status_code = 200 then
        private.happy_proactive_int(r.j, array['scannedCandidates']) end,
      scan_pages = case when r.status_code = 200 then
        private.happy_proactive_int(r.j, array['scan', 'pages']) end,
      truncated = case when r.status_code = 200 then (r.j -> 'scan' ->> 'truncated') = 'true' end,
      ideas_created = case when r.status_code = 200 then
        private.happy_proactive_sum_object(r.j, 'ideasCreated') end,
      notifications_created = case when r.status_code = 200 then
        private.happy_proactive_sum_object(r.j, 'notificationsCreated') end,
      occasion_scanned = case when r.status_code = 200 then
        private.happy_proactive_int(r.j, array['occasion', 'scannedCandidates']) end
  from r
  where l.id = r.log_id;
  get diagnostics step_count = row_count;
  changed := changed + step_count;

  -- The response row is gone (pg_net keeps it 6 hours) or never arrived.
  update private.happy_proactive_run_log
  set outcome = 'no_response'
  where outcome = 'pending' and started_at < now() - interval '10 minutes';
  get diagnostics step_count = row_count;
  changed := changed + step_count;

  -- Failed cron runs of the happy-proactive job (message mapped to a code, never stored).
  select value::bigint into last_runid
  from private.happy_proactive_monitor_state where key = 'cron_last_runid';
  select coalesce(max(runid), 0) into seen_runid from cron.job_run_details;

  insert into private.happy_proactive_run_log (cron_run_id, started_at, outcome, error_code)
  select d.runid, coalesce(d.start_time, now()), 'cron_failed',
         private.happy_proactive_cron_error_code(d.return_message)
  from cron.job_run_details d
  where d.runid > greatest(coalesce(last_runid, 0) - 200, 0)
    and d.status = 'failed'
    and d.command like '%private.invoke_happy_proactive()%'
  order by d.runid
  limit 200
  on conflict (cron_run_id) do nothing;
  get diagnostics step_count = row_count;
  changed := changed + step_count;

  insert into private.happy_proactive_monitor_state (key, value)
  values ('cron_last_runid', seen_runid::text)
  on conflict (key) do update set value = excluded.value, updated_at = now();

  return changed;
end;
$function$;

-- ---------------------------------------------------------------------------------------
-- Alert delivery (optional HTTPS webhook from Vault; absent secret = no delivery)
-- ---------------------------------------------------------------------------------------
create or replace function private.send_happy_proactive_alert(
  p_rule text, p_severity text, p_state text, p_detail text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  hook text;
  function_url text;
  env_label text;
  msg text;
begin
  select decrypted_secret into hook
  from vault.decrypted_secrets where name = 'happy_proactive_alert_webhook_url';
  if hook is null or hook !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$' then
    return;
  end if;

  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'happy_proactive_function_url';
  env_label := coalesce(substring(function_url from '^https://([a-z]{20})\.supabase\.co/'), 'unknown');

  msg := format('[%s] HappyBot Proactive %s %s %s %s',
                env_label, upper(p_severity), p_rule, p_state, left(coalesce(p_detail, ''), 120));

  perform net.http_post(
    url := hook,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('text', msg, 'content', msg),
    timeout_milliseconds := 10000
  );
exception when others then
  raise warning 'happy_proactive_alert_send_failed %', sqlstate;
end;
$function$;

create or replace function private.happy_proactive_set_alert(
  p_rule text, p_severity text, p_firing boolean, p_detail text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  cur private.happy_proactive_alerts%rowtype;
begin
  select * into cur from private.happy_proactive_alerts where rule_key = p_rule;

  if not found then
    insert into private.happy_proactive_alerts (rule_key, severity, status, since, last_notified_at, notify_count, detail)
    values (p_rule, p_severity, case when p_firing then 'firing' else 'ok' end, now(),
            case when p_firing then now() end, case when p_firing then 1 else 0 end, left(p_detail, 120));
    if p_firing then
      perform private.send_happy_proactive_alert(p_rule, p_severity, 'FIRING', p_detail);
    end if;
    return;
  end if;

  if p_firing and cur.status = 'ok' then
    update private.happy_proactive_alerts
    set status = 'firing', severity = p_severity, since = now(), last_notified_at = now(),
        notify_count = 1, detail = left(p_detail, 120)
    where rule_key = p_rule;
    perform private.send_happy_proactive_alert(p_rule, p_severity, 'FIRING', p_detail);
  elsif p_firing then
    update private.happy_proactive_alerts set severity = p_severity, detail = left(p_detail, 120)
    where rule_key = p_rule;
    if cur.notify_count < 8 and now() - cur.last_notified_at >= interval '6 hours' then
      update private.happy_proactive_alerts
      set last_notified_at = now(), notify_count = notify_count + 1 where rule_key = p_rule;
      perform private.send_happy_proactive_alert(p_rule, p_severity, 'STILL FIRING', p_detail);
    end if;
  elsif cur.status = 'firing' then
    update private.happy_proactive_alerts
    set status = 'ok', last_notified_at = now(), notify_count = 0, detail = left(p_detail, 120)
    where rule_key = p_rule;
    perform private.send_happy_proactive_alert(p_rule, p_severity, 'RESOLVED', p_detail);
  end if;
end;
$function$;

-- ---------------------------------------------------------------------------------------
-- Alert rules
-- ---------------------------------------------------------------------------------------
create or replace function private.evaluate_happy_proactive_alerts()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  job_active boolean;
  last_ok timestamptz;
  seen_inactive timestamptz;
  installed timestamptz;
  base timestamptz;
  consecutive integer;
  lr_outcome text;
  lr_pages integer;
  lr_duration integer;
  hours numeric;
begin
  select coalesce(bool_or(active), false) into job_active
  from cron.job where command like '%private.invoke_happy_proactive()%';

  -- The "no success" clock starts when the job was last seen inactive, so enabling the
  -- scheduler later cannot trigger an immediate false alert.
  if not job_active then
    insert into private.happy_proactive_monitor_state (key, value)
    values ('job_last_inactive_at', now()::text)
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;

  select value::timestamptz into seen_inactive
  from private.happy_proactive_monitor_state where key = 'job_last_inactive_at';
  select value::timestamptz into installed
  from private.happy_proactive_monitor_state where key = 'installed_at';
  select max(started_at) into last_ok
  from private.happy_proactive_run_log where outcome in ('ok', 'truncated');

  base := greatest(coalesce(last_ok, '-infinity'::timestamptz),
                   coalesce(seen_inactive, '-infinity'::timestamptz),
                   coalesce(installed, '-infinity'::timestamptz));
  hours := round(extract(epoch from now() - base) / 3600.0, 1);

  perform private.happy_proactive_set_alert(
    'no_success_3h30', 'critical',
    job_active and now() - base > interval '3 hours 30 minutes',
    'hours_since_success=' || hours);

  with t as (
    select outcome, row_number() over (order by started_at desc, id desc) as rn
    from private.happy_proactive_run_log
    where outcome <> 'pending'
    order by started_at desc, id desc
    limit 10
  )
  select coalesce((select min(rn) - 1 from t where outcome in ('ok', 'truncated')),
                  (select count(*) from t))
  into consecutive;

  perform private.happy_proactive_set_alert('run_failed', 'critical', consecutive >= 1,
                                            'consecutive_failures=' || consecutive);
  perform private.happy_proactive_set_alert('repeated_failures', 'critical', consecutive >= 2,
                                            'consecutive_failures=' || consecutive);

  select outcome, scan_pages, duration_ms into lr_outcome, lr_pages, lr_duration
  from private.happy_proactive_run_log
  where outcome <> 'pending'
  order by started_at desc, id desc
  limit 1;

  perform private.happy_proactive_set_alert(
    'scan_truncated', 'warning',
    coalesce(lr_outcome = 'truncated' or coalesce(lr_pages, 0) >= 80, false),
    'pages=' || coalesce(lr_pages::text, 'n/a'));
  perform private.happy_proactive_set_alert(
    'slow_run_warning', 'warning', coalesce(lr_duration > 100000, false),
    'duration_ms=' || coalesce(lr_duration::text, 'n/a'));
  perform private.happy_proactive_set_alert(
    'slow_run_critical', 'critical', coalesce(lr_duration >= 130000, false),
    'duration_ms=' || coalesce(lr_duration::text, 'n/a'));
end;
$function$;

-- ---------------------------------------------------------------------------------------
-- Retention: 30 days, newest 5,000 rows (the invoker also refuses to log past 20,000)
-- ---------------------------------------------------------------------------------------
create or replace function private.prune_happy_proactive_run_log()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  removed integer := 0;
  step_count integer;
begin
  delete from private.happy_proactive_run_log
  where started_at < now() - interval '30 days';
  get diagnostics step_count = row_count;
  removed := removed + step_count;

  delete from private.happy_proactive_run_log
  where id <= (select id from private.happy_proactive_run_log order by id desc offset 5000 limit 1);
  get diagnostics step_count = row_count;
  removed := removed + step_count;

  return removed;
end;
$function$;

-- ---------------------------------------------------------------------------------------
-- Monitor entry point (called by the INACTIVE monitor job)
-- ---------------------------------------------------------------------------------------
create or replace function private.run_happy_proactive_monitor()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  problems text := '';
  heartbeat_at timestamptz;
  retention_at timestamptz;
  last_ok timestamptz;
  runs_24h integer;
begin
  begin
    perform private.collect_happy_proactive_run_log();
  exception when others then
    problems := problems || 'collect:' || sqlstate || ' ';
  end;

  begin
    perform private.evaluate_happy_proactive_alerts();
  exception when others then
    problems := problems || 'evaluate:' || sqlstate || ' ';
  end;

  begin
    select value::timestamptz into retention_at
    from private.happy_proactive_monitor_state where key = 'retention_last_run';
    if retention_at is null or retention_at < now() - interval '23 hours' then
      perform private.prune_happy_proactive_run_log();
      insert into private.happy_proactive_monitor_state (key, value)
      values ('retention_last_run', now()::text)
      on conflict (key) do update set value = excluded.value, updated_at = now();
    end if;
  exception when others then
    problems := problems || 'retention:' || sqlstate || ' ';
  end;

  -- Daily heartbeat: if the monitor itself stops, the missing message is the signal.
  begin
    select value::timestamptz into heartbeat_at
    from private.happy_proactive_monitor_state where key = 'heartbeat_sent_at';
    if heartbeat_at is null or heartbeat_at < now() - interval '23 hours' then
      select max(started_at) into last_ok
      from private.happy_proactive_run_log where outcome in ('ok', 'truncated');
      select count(*) into runs_24h
      from private.happy_proactive_run_log where started_at > now() - interval '24 hours';
      perform private.send_happy_proactive_alert(
        'monitor_heartbeat', 'warning', 'ALIVE',
        'runs_24h=' || runs_24h || ' last_success_hours=' ||
        coalesce(round(extract(epoch from now() - last_ok) / 3600.0, 1)::text, 'none'));
      insert into private.happy_proactive_monitor_state (key, value)
      values ('heartbeat_sent_at', now()::text)
      on conflict (key) do update set value = excluded.value, updated_at = now();
    end if;
  exception when others then
    problems := problems || 'heartbeat:' || sqlstate || ' ';
  end;

  if problems <> '' then
    raise exception 'happy_proactive_monitor_failed: %', trim(problems);
  end if;

  insert into private.happy_proactive_monitor_state (key, value)
  values ('last_monitor_ok_at', now()::text)
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$function$;

-- ---------------------------------------------------------------------------------------
-- Read-only health view for the owner (SQL editor)
-- ---------------------------------------------------------------------------------------
create or replace view private.happy_proactive_run_health with (security_invoker = true) as
select
  (select coalesce(bool_or(active), false) from cron.job
    where command like '%private.invoke_happy_proactive()%') as job_active,
  (select max(started_at) from private.happy_proactive_run_log) as last_run_at,
  (select outcome from private.happy_proactive_run_log order by started_at desc, id desc limit 1) as last_outcome,
  (select max(started_at) from private.happy_proactive_run_log where outcome in ('ok', 'truncated')) as last_success_at,
  (select count(*) from private.happy_proactive_run_log
    where started_at > now() - interval '24 hours') as runs_24h,
  (select count(*) from private.happy_proactive_run_log
    where started_at > now() - interval '24 hours'
      and outcome in ('http_error', 'timeout', 'no_response', 'cron_failed')) as failures_24h,
  (select count(*) from private.happy_proactive_run_log
    where started_at > now() - interval '24 hours' and outcome = 'truncated') as truncated_24h,
  (select max(duration_ms) from private.happy_proactive_run_log
    where started_at > now() - interval '24 hours') as max_duration_ms_24h,
  (select count(*) from private.happy_proactive_alerts where status = 'firing') as alerts_firing,
  (select value::timestamptz from private.happy_proactive_monitor_state
    where key = 'last_monitor_ok_at') as monitor_last_ok_at;

-- ---------------------------------------------------------------------------------------
-- Privileges: nobody but the owner (and the SECURITY DEFINER functions) can use any of it
-- ---------------------------------------------------------------------------------------
revoke all on function private.happy_proactive_try_jsonb(text) from public, anon, authenticated, service_role;
revoke all on function private.happy_proactive_error_code(text) from public, anon, authenticated, service_role;
revoke all on function private.happy_proactive_cron_error_code(text) from public, anon, authenticated, service_role;
revoke all on function private.happy_proactive_int(jsonb, text[]) from public, anon, authenticated, service_role;
revoke all on function private.happy_proactive_sum_object(jsonb, text) from public, anon, authenticated, service_role;
revoke all on function private.collect_happy_proactive_run_log() from public, anon, authenticated, service_role;
revoke all on function private.send_happy_proactive_alert(text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function private.happy_proactive_set_alert(text, text, boolean, text) from public, anon, authenticated, service_role;
revoke all on function private.evaluate_happy_proactive_alerts() from public, anon, authenticated, service_role;
revoke all on function private.prune_happy_proactive_run_log() from public, anon, authenticated, service_role;
revoke all on function private.run_happy_proactive_monitor() from public, anon, authenticated, service_role;
revoke all on private.happy_proactive_run_health from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------
-- Monitor job: created INACTIVE. It is enabled only by a separate decision.
-- The happy-proactive cron job is not touched.
-- ---------------------------------------------------------------------------------------
do $monitor_job$
begin
  if not exists (select 1 from cron.job where jobname = 'happydate-happy-proactive-monitor') then
    perform cron.schedule('happydate-happy-proactive-monitor', '*/5 * * * *',
                          'select private.run_happy_proactive_monitor();');
    perform cron.alter_job(
      (select jobid from cron.job where jobname = 'happydate-happy-proactive-monitor'),
      active := false);
  end if;
end;
$monitor_job$;
