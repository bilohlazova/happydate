-- A confirmed year of birth is durable person data. Ages remain derived from
-- the relevant birthday occurrence and are deliberately never stored.
alter table public.people
  add column birth_year integer;

-- Historical birthday values are full calendar dates. This is a lossless
-- one-time normalization of an already confirmed value, not an age inference.
update public.people
set birth_year = extract(year from birthday)::integer
where birthday is not null;

alter table public.people
  add constraint people_birth_year_plausible
  check (birth_year is null or birth_year between 1 and 9999);

comment on column public.people.birth_year is
  'Confirmed calendar year of birth. Current and turning ages are derived, never persisted.';
