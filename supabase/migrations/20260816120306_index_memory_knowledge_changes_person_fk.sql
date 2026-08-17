-- The existing (user_id, person_id, changed_at) index serves owner-scoped
-- timeline reads, but cannot efficiently support the person_id foreign-key
-- check/cascade because person_id is not its leading column.
create index if not exists memory_knowledge_changes_person_id_idx
  on public.memory_knowledge_changes (person_id);
