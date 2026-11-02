do $$
declare before_row record; n bigint; fingerprint text;
begin
  for before_row in select * from release_before_rows loop
    if before_row.relation_name = 'public.events' then
      select count(*), md5(coalesce(string_agg(md5((to_jsonb(r) || jsonb_build_object('survey_origin', to_jsonb(r)->'survey_origin'))::text), '' order by id), '')) into n, fingerprint from public.events r;
    else
      execute format('select count(*), md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by to_jsonb(r)::text), '''')) from %s r', before_row.relation_name) into n, fingerprint;
    end if;
    if before_row.row_count <> n or before_row.fingerprint is distinct from fingerprint then
      raise exception 'Release repair data-preservation check failed for %', before_row.relation_name;
    end if;
  end loop;
end $$;
