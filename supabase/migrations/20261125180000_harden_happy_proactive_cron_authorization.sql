-- HD-PR-001 / HD-PR-004 / HD-PR-005: the happy-proactive cron caller no longer
-- sends a Supabase secret API key. It sends a dedicated random secret that is
-- valid only for the happy-proactive Edge Function (verified there before any
-- business logic runs). A leak through the pg_net queue, an HTTP redirect or a
-- mistyped URL therefore cannot expose project data.
--
-- Forward-only replacement of private.invoke_happy_proactive(). Vault names are
-- unchanged; values are never stored in source:
--   happy_proactive_function_url        -> https://<20-letter-project-ref>.supabase.co/functions/v1/happy-proactive
--   happy_proactive_cron_authorization  -> <same project ref>.<random token>, never a platform API key
--
-- The same value must be set in the Edge Function secret
-- HAPPY_PROACTIVE_CRON_SECRET. Use a different value for each environment. The
-- secret embeds the project ref: this invoker refuses to send it unless the ref
-- matches the URL, and the Edge Function refuses it unless the ref matches its
-- own platform-provided SUPABASE_URL. A database cannot read its own project
-- ref, so the binding is enforced from both sides instead of by hand.
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
    timeout_milliseconds := 30000
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function private.invoke_happy_proactive()
  from public, anon, authenticated;
