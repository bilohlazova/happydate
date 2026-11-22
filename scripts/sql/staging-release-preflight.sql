-- Metadata-only drift guard, not proof of database identity. The approval/apply
-- payload must also specify project_id=xgelazzdgluuenqkymox (never the prod ref).
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('happydate-staging-release-repair', 0));
do $$
declare fn regprocedure := 'public.save_my_onboarding_survey(text[],text[],text,text,jsonb)'::regprocedure;
begin
  if md5(pg_get_functiondef(fn)) not in ('a6896078c41547ddfa8c3c550b2896fb','7eaa3305ec50272890cd4b73ac16f897') then
    raise exception 'Unreviewed survey RPC drift: stop and compare canonical source';
  end if;
  if not exists(select 1 from pg_proc where oid=fn and prosecdef and proconfig=array['search_path=""'])
     or has_function_privilege('anon',fn,'EXECUTE')
     or not has_function_privilege('authenticated',fn,'EXECUTE') then
    raise exception 'Unreviewed survey RPC security metadata';
  end if;
  if not (select relrowsecurity from pg_class where oid='storage.objects'::regclass) then
    raise exception 'Storage RLS disabled';
  end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname not in (
    'avatars_select_own','avatars_insert_own','avatars_update_own','avatars_delete_own',
    'memory_images_select_own','memory_images_insert_own','memory_images_update_own','memory_images_delete_own',
    'memory_audio_select_own','memory_audio_insert_own','memory_audio_update_own','memory_audio_delete_own',
    'person_symbols_storage_select_own','person_symbols_storage_insert_own','person_symbols_storage_update_own','person_symbols_storage_delete_own'
  )) then raise exception 'Additional unreviewed Storage policy: stop before changing buckets'; end if;
end $$;
