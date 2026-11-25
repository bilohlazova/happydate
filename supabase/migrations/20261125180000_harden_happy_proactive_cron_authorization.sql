-- HD-PR-001 / HD-PR-004 / HD-PR-005: the happy-proactive cron caller no longer
-- sends a Supabase secret API key. It sends a dedicated random secret that is
-- valid only for the happy-proactive Edge Function (verified there before any
-- business logic runs). A leak through the pg_net queue, an HTTP redirect or a
-- mistyped URL therefore cannot expose project data.
--
-- Forward-only replacement of private.invoke_happy_proactive(). Vault names are
-- unchanged; values are never stored in source:
--   happy_proactive_function_url        -> https://<20-letter-project-ref>.supabase.co/functions/v1/happy-proactive
--   happy_proactive_cron_authorization  -> random secret, >= 32 characters, never a platform API key
--
-- The same random value must be set in the Edge Function secret
-- HAPPY_PROACTIVE_CRON_SECRET. Use a different value for each environment, so a
-- value pasted into the wrong environment is rejected (401) instead of working.
--
-- `Authorization` is used on purpose: libcurl drops it when a redirect changes
-- host, whereas custom headers are forwarded. pg_net follows redirects.
--
-- Every configuration problem fails loudly (the cron run is recorded as failed).

create or replace function private.invoke_happy_proactive()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  function_url text;
  cron_secret text;
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

  -- Reject Supabase API keys (admin, publishable, legacy JWT) and anything that
  -- is not a plain random token, so an admin key can never end up in a header.
  if cron_secret ~ '^(sb_|eyJ)'
    or cron_secret !~ '^[A-Za-z0-9+/=_-]{32,}$' then
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
    timeout_milliseconds := 30000
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function private.invoke_happy_proactive()
  from public, anon, authenticated;
