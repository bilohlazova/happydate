-- Persist structured registration names before email confirmation creates a session.
-- User metadata is used only as input for user-owned presentation fields, never
-- for authorization or RLS decisions.
create or replace function private.sync_profile_names_from_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  v_last_name text := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
  v_full_name text;
begin
  v_full_name := nullif(pg_catalog.btrim(pg_catalog.concat_ws(' ', v_first_name, v_last_name)), '');

  insert into public.profiles (id, first_name, last_name, full_name)
  values (new.id, v_first_name, v_last_name, v_full_name)
  on conflict (id) do update
  set
    first_name = coalesce(nullif(pg_catalog.btrim(public.profiles.first_name), ''), excluded.first_name),
    last_name = coalesce(nullif(pg_catalog.btrim(public.profiles.last_name), ''), excluded.last_name),
    full_name = coalesce(nullif(pg_catalog.btrim(public.profiles.full_name), ''), excluded.full_name);

  return new;
end;
$$;

revoke all on function private.sync_profile_names_from_auth_metadata() from public, anon, authenticated;

drop trigger if exists sync_profile_names_after_auth_signup on auth.users;
create trigger sync_profile_names_after_auth_signup
after insert on auth.users
for each row execute function private.sync_profile_names_from_auth_metadata();

comment on function private.sync_profile_names_from_auth_metadata() is
  'Creates the canonical user profile from explicit first_name and last_name signup metadata. Never used for authorization.';
