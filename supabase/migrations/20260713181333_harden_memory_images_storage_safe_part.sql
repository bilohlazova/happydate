-- Safe hardening of memory-images storage: MIME/size limits + removing overly-broad policies + adding missing owner-scoped DELETE.
-- Does NOT touch bucket.public and does NOT delete any objects.

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
where id = 'memory-images';

drop policy if exists "Public read" on storage.objects;
drop policy if exists "Auth upload" on storage.objects;
drop policy if exists "Auth delete" on storage.objects;

create policy "Users can delete their own images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
;
