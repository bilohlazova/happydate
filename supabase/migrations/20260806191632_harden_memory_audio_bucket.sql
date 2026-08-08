insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-audio',
  'memory-audio',
  false,
  26214400,
  array[
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/x-m4a'
    ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
