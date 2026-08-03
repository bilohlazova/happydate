
alter table public.people
  add column if not exists relation_key text;
alter table public.people
  drop constraint if exists people_relation_key_check;
alter table public.people
  add constraint people_relation_key_check
  check (
    relation_key is null
    or relation_key in (
      'spouse','partner','parent','child','sibling','close_friend',
      'friend','family','work','acquaintance','neighbor','client','other'
    )
  );
create index if not exists people_relation_key_idx
  on public.people (relation_key);
;
