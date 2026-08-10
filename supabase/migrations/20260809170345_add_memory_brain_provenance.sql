-- Auditable, idempotent provenance for user-confirmed Memory Brain facts.
alter table public.memories
  add column if not exists source_record_id text,
  add column if not exists source_excerpt text,
  add column if not exists user_confirmed_at timestamptz,
  add column if not exists capture_schema_version text;

alter table public.memories
  add constraint memories_source_record_id_not_blank
    check (source_record_id is null or char_length(btrim(source_record_id)) > 0),
  add constraint memories_source_excerpt_length
    check (source_excerpt is null or char_length(source_excerpt) <= 500),
  add constraint memories_capture_schema_version_not_blank
    check (capture_schema_version is null or char_length(btrim(capture_schema_version)) > 0),
  add constraint memories_confirmed_capture_has_provenance
    check (user_confirmed_at is null or (source_record_id is not null and source_excerpt is not null and capture_schema_version is not null));

create unique index if not exists memories_unique_confirmed_source_record
  on public.memories (user_id, source, source_record_id)
  where source_record_id is not null;

create index if not exists memories_person_confirmed_at
  on public.memories (user_id, person_id, user_confirmed_at desc)
  where user_confirmed_at is not null and is_active;

comment on column public.memories.source_record_id is 'Stable identifier of the user-reviewed source proposal. Used for idempotent confirmation.';
comment on column public.memories.source_excerpt is 'Exact source excerpt shown to the user before confirmation.';
comment on column public.memories.user_confirmed_at is 'Time at which the user explicitly approved this structured knowledge item.';
comment on column public.memories.capture_schema_version is 'Version of the capture contract that produced the confirmed proposal.';
