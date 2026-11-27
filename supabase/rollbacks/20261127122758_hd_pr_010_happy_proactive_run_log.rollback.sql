-- Rollback of 20261127122758_hd_pr_010_happy_proactive_run_log.sql (HD-PR-010).
-- NOT a migration: it lives outside supabase/migrations on purpose and is run by hand
-- (staging only, after export of the log if it is still wanted).
--
-- Restores private.invoke_happy_proactive() to the 20261127110406 definition
-- (timeout_milliseconds := 160000, no run-log insert), removes the monitor job, the
-- objects and the data. The happy-proactive cron job (job 3) is never touched.
-- Expected invoker md5 afterwards: e36fd71acd695fc4ca416cc396076762.

do $rollback_job$
begin
  if exists (select 1 from cron.job where jobname = 'happydate-happy-proactive-monitor') then
    perform cron.unschedule('happydate-happy-proactive-monitor');
  end if;
end;
$rollback_job$;

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
  request_id bigint;
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
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function private.invoke_happy_proactive()
  from public, anon, authenticated;

drop view if exists private.happy_proactive_run_health;
drop function if exists private.run_happy_proactive_monitor();
drop function if exists private.prune_happy_proactive_run_log();
drop function if exists private.evaluate_happy_proactive_alerts();
drop function if exists private.happy_proactive_set_alert(text, text, boolean, text);
drop function if exists private.send_happy_proactive_alert(text, text, text, text);
drop function if exists private.collect_happy_proactive_run_log();
drop function if exists private.happy_proactive_sum_object(jsonb, text);
drop function if exists private.happy_proactive_int(jsonb, text[]);
drop function if exists private.happy_proactive_cron_error_code(text);
drop function if exists private.happy_proactive_error_code(text);
drop function if exists private.happy_proactive_try_jsonb(text);
drop table if exists private.happy_proactive_monitor_state;
drop table if exists private.happy_proactive_alerts;
drop table if exists private.happy_proactive_run_log;
-- The optional Vault secret happy_proactive_alert_webhook_url (if the owner created it)
-- is removed by the owner in the Dashboard; it is never read by anything after this.
