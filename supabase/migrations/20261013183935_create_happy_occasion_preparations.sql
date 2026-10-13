-- One factual preparation record per owner, canonical Occasion occurrence and Person.
-- This stores only durable inputs (workflow status and optional greeting artifact);
-- readiness remains derived in application code.
create table public.happy_occasion_preparations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion_key text not null check (occasion_key ~ '^[a-z][a-z0-9_]*$'),
  occurrence_key text not null check (occurrence_key ~ '^occasion:[a-z][a-z0-9_]*:[0-9]{4}$'),
  person_id uuid not null references public.people(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  greeting_content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, occurrence_key, person_id)
);

create index happy_occasion_preparations_owner_occurrence_idx
  on public.happy_occasion_preparations(user_id, occurrence_key);

create or replace function public.validate_happy_occasion_preparation_references()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if split_part(new.occurrence_key, ':', 2) <> new.occasion_key then
    raise exception using errcode = '23514', message = 'occasion preparation identity mismatch';
  end if;
  if not exists (
    select 1 from public.people p where p.id = new.person_id and p.user_id = new.user_id
  ) then
    raise exception using errcode = '23514', message = 'occasion preparation person ownership mismatch';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_happy_occasion_preparation_references() from public, anon, authenticated;

create trigger happy_occasion_preparations_validate_references
before insert or update of user_id, occasion_key, occurrence_key, person_id
on public.happy_occasion_preparations
for each row execute function public.validate_happy_occasion_preparation_references();

create trigger happy_occasion_preparations_set_updated_at
before update on public.happy_occasion_preparations
for each row execute function public.set_updated_at();

alter table public.happy_occasion_preparations enable row level security;
revoke all on table public.happy_occasion_preparations from public, anon, authenticated;
grant select on table public.happy_occasion_preparations to authenticated;
grant select, insert, update on table public.happy_occasion_preparations to service_role;

create policy "happy_occasion_preparations_select_own"
on public.happy_occasion_preparations for select to authenticated
using ((select auth.uid()) = user_id);
