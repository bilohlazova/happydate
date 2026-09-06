create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  species text not null check (char_length(btrim(species)) between 1 and 80),
  breed text check (breed is null or char_length(btrim(breed)) between 1 and 120),
  birth_date date,
  photo_url text,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.person_pets (
  person_id uuid not null references public.people(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (person_id, pet_id)
);

create index pets_user_id_idx on public.pets (user_id);
create index person_pets_user_id_idx on public.person_pets (user_id);
create index person_pets_pet_id_idx on public.person_pets (pet_id);

alter table public.pets enable row level security;
alter table public.person_pets enable row level security;

revoke all on table public.pets from anon, authenticated;
revoke all on table public.person_pets from anon, authenticated;
grant select, insert, update, delete on table public.pets to authenticated;
grant select, insert, delete on table public.person_pets to authenticated;

create policy "pets_select_own"
on public.pets for select to authenticated
using ((select auth.uid()) = user_id);

create policy "pets_insert_own"
on public.pets for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "pets_update_own"
on public.pets for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "pets_delete_own"
on public.pets for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "person_pets_select_own"
on public.person_pets for select to authenticated
using ((select auth.uid()) = user_id);

create policy "person_pets_insert_own"
on public.person_pets for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.people
    where people.id = person_id and people.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.pets
    where pets.id = pet_id and pets.user_id = (select auth.uid())
  )
);

create policy "person_pets_delete_own"
on public.person_pets for delete to authenticated
using ((select auth.uid()) = user_id);

create trigger pets_set_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

comment on table public.pets is 'User-owned pet profiles shared across people in the same household.';
comment on table public.person_pets is 'Many-to-many links between people and pets.';
