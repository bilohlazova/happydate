-- Provision missing media buckets. No object rows or user references are touched.
-- Avatars are intentionally public for existing getPublicUrl consumers. Memories
-- remain private and use authenticated download or short-lived signed URLs.
do $$
begin
  if exists (select 1 from storage.buckets where id = 'avatars' and not public) then
    raise exception 'Unreviewed private avatar bucket: refuse to make existing data public';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('memory-images', 'memory-images', false, 10485760,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The reviewed policies already exist on Staging. Recreate only these eight
-- names for repeatability; never grant anon writes or change other buckets.

drop policy if exists "avatars_select_own" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "memory_images_select_own" on storage.objects;
drop policy if exists "memory_images_insert_own" on storage.objects;
drop policy if exists "memory_images_update_own" on storage.objects;
drop policy if exists "memory_images_delete_own" on storage.objects;

create policy "avatars_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "avatars_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "avatars_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "avatars_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);


create policy "memory_images_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_images_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_images_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
