-- HD-PR-009: the happy-proactive invoker waited only 30 s for the Edge Function.
--
-- Measured on staging (Edge Function v5, 1,000 synthetic birthdays in the
-- 30-day window): the first run took 31.6 s, so pg_net gave up at 30 s and
-- recorded timed_out=true with no status code, although the function finished
-- and wrote every row. The 30 s value is only the HTTP client's wait for the
-- response: it does not stop the Edge Function.
--
-- The Edge platform returns 504 at 150 s (request idle timeout). The invoker
-- now waits 160 s, so every outcome (200, 401, 500, 503 and the platform 504)
-- is recorded in net._http_response instead of a bare timeout.
--
-- Forward-only replacement of private.invoke_happy_proactive(). The ONLY change
-- against 20261125180000 is timeout_milliseconds (30000 -> 160000). Vault
-- names, URL and secret guards, search_path, security definer and the
-- privileges are identical.
--
-- Rollback: re-run the function from 20261125180000 (timeout_milliseconds := 30000).

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
