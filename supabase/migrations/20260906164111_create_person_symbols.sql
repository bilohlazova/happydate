create table public.person_symbols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null check (kind in ('preset', 'happy', 'drawing', 'upload')),
  name text check (name is null or char_length(btrim(name)) between 1 and 120),
  preset_key text,
  image_path text,
  description text check (description is null or char_length(description) <= 800),
  prompt text check (prompt is null or char_length(prompt) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id),
  check (
    (kind in ('preset', 'happy') and preset_key is not null and image_path is null)
    or (kind in ('drawing', 'upload') and image_path is not null)
  )
);

create index person_symbols_user_id_idx on public.person_symbols (user_id);
alter table public.person_symbols enable row level security;
revoke all on table public.person_symbols from anon, authenticated;
grant select, insert, update, delete on table public.person_symbols to authenticated;

create policy "person_symbols_select_own" on public.person_symbols for select to authenticated
using ((select auth.uid()) = user_id);
create policy "person_symbols_insert_own" on public.person_symbols for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.people where people.id = person_id and people.user_id = (select auth.uid())
));
create policy "person_symbols_update_own" on public.person_symbols for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "person_symbols_delete_own" on public.person_symbols for delete to authenticated
using ((select auth.uid()) = user_id);

create trigger person_symbols_set_updated_at before update on public.person_symbols
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('person-symbols', 'person-symbols', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "person_symbols_storage_select_own" on storage.objects for select to authenticated
using (bucket_id = 'person-symbols' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "person_symbols_storage_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'person-symbols' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "person_symbols_storage_update_own" on storage.objects for update to authenticated
using (bucket_id = 'person-symbols' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'person-symbols' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "person_symbols_storage_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'person-symbols' and (storage.foldername(name))[1] = (select auth.uid())::text);

comment on table public.person_symbols is 'One user-owned visual relationship symbol per person.';
