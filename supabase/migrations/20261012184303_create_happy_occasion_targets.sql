-- Trusted selection for an occasion occurrence.  The row records the one
-- explicit person selected for a concrete occurrence; it is not a general
-- person-level preference and does not create any workflow state.
create table public.happy_occasion_targets (
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion_key text not null,
  occurrence_key text not null,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, occurrence_key),
  constraint happy_occasion_targets_occasion_key_check
    check (occasion_key ~ '^[a-z][a-z0-9_]*$'),
  constraint happy_occasion_targets_occurrence_key_check
    check (occurrence_key ~ '^occasion:[a-z][a-z0-9_]*:[0-9]{4}$'),
  constraint happy_occasion_targets_occurrence_occasion_check
    check (split_part(occurrence_key, ':', 2) = occasion_key)
);

create unique index happy_occasion_targets_user_occasion_occurrence_idx
  on public.happy_occasion_targets (user_id, occasion_key, occurrence_key);

create index happy_occasion_targets_person_idx
  on public.happy_occasion_targets (user_id, person_id);

create function public.validate_happy_occasion_target_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.people p
    where p.id = new.person_id
      and p.user_id = new.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'happy_occasion_targets.person_id must belong to happy_occasion_targets.user_id';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_happy_occasion_target_references()
  from public, anon, authenticated;

create trigger happy_occasion_targets_validate_references
before insert or update of user_id, person_id on public.happy_occasion_targets
for each row execute function public.validate_happy_occasion_target_references();

create trigger happy_occasion_targets_set_updated_at
before update on public.happy_occasion_targets
for each row execute function public.set_updated_at();

alter table public.happy_occasion_targets enable row level security;

-- Browser clients may observe their own selection, but only the trusted
-- server boundary can create or change it after revalidating the candidate.
revoke all on table public.happy_occasion_targets from public, anon, authenticated;
revoke all on table public.happy_occasion_targets from service_role;
grant select on table public.happy_occasion_targets to authenticated;
grant select, insert, update on table public.happy_occasion_targets to service_role;

create policy "happy_occasion_targets_select_own"
on public.happy_occasion_targets for select to authenticated
using ((select auth.uid()) = user_id);
