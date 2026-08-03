
drop index if exists public.people_relation_key_idx;
create index if not exists people_relation_key_idx
  on public.people (relation_key)
  where relation_key is not null;
;
