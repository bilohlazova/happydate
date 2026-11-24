-- HD-DB-009: the happy-proactive Edge Function authenticates with
-- @supabase/server `auth: "secret"`, which reads ONLY the `apikey` header
-- (it ignores `Authorization: Bearer ...`). The original cron wrapper sent
-- only an Authorization header, so even with Vault configured and the function
-- deployed the request would be rejected. Forward-only fix: send the secret
-- key on `apikey`. Vault secret names are unchanged; their values are never
-- stored in source.
--
-- happy_proactive_function_url            -> https://<project-ref>.supabase.co/functions/v1/happy-proactive
-- happy_proactive_cron_authorization      -> the project's `default` secret API key (sb_secret_...)
--
-- Configuration problems still fail loudly (the cron run is recorded as failed);
-- nothing here masks a missing secret or a rejected request.

create or replace function private.invoke_happy_proactive()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  function_url text;
  secret_key text;
  request_id bigint;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'happy_proactive_function_url';

  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'happy_proactive_cron_authorization';

  if function_url is null or secret_key is null then
    raise exception using
      errcode = 'P0001',
      message = 'happy_proactive_cron_configuration_missing';
  end if;

  if function_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/happy-proactive$' then
    raise exception using
      errcode = 'P0001',
      message = 'happy_proactive_cron_function_url_invalid';
  end if;

  select net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'apikey', secret_key,
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
