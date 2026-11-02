-- Run inside the same transaction as the approved repair. Output is aggregate
-- metadata only; row bodies/PII are never logged or written to repository files.
create temporary table release_before_rows (relation_name text primary key, row_count bigint, fingerprint text) on commit drop;
do $$
declare relation_name text; n bigint; fingerprint text;
begin
  foreach relation_name in array array['public.events','public.memories','public.gifts','public.happy_tasks','public.user_survey','public.profiles','storage.objects'] loop
    execute format('lock table %s in share mode', relation_name);
    if relation_name = 'public.events' then
      execute 'select count(*), md5(coalesce(string_agg(md5((to_jsonb(r) || jsonb_build_object(''survey_origin'', to_jsonb(r)->''survey_origin''))::text), '''' order by id), '''')) from public.events r' into n, fingerprint;
    else
      execute format('select count(*), md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by to_jsonb(r)::text), '''')) from %s r', relation_name) into n, fingerprint;
    end if;
    insert into release_before_rows values (relation_name,n,fingerprint);
  end loop;
end $$;
