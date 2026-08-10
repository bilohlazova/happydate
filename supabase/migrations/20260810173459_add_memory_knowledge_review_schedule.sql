alter table public.memories
  add column knowledge_reviewed_at timestamptz,
  add column knowledge_review_snoozed_until timestamptz;

alter table public.memories
  add constraint memories_review_snooze_after_review check (
    knowledge_review_snoozed_until is null
    or knowledge_reviewed_at is null
    or knowledge_review_snoozed_until > knowledge_reviewed_at
  );

create index memories_due_knowledge_review_idx
  on public.memories (user_id, person_id, knowledge_review_snoozed_until, user_confirmed_at)
  where is_active and user_confirmed_at is not null;

comment on column public.memories.knowledge_reviewed_at is
  'Last time the owner explicitly confirmed that this Knowledge item remains accurate.';
comment on column public.memories.knowledge_review_snoozed_until is
  'Owner-selected boundary before which HappyDate must not ask to review this Knowledge item again.';
