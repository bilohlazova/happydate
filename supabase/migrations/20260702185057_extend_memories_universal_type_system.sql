-- Memory Engine foundation: evolve existing `memories` table into a
-- universal, typed memory store instead of creating a new `person_memories`
-- table. New memory types can be introduced by the application layer
-- without any further schema migration, since `type` is plain text.

alter table public.memories
  add column if not exists type text not null default 'memory',
  add column if not exists title text,
  add column if not exists value_text text,
  add column if not exists occurred_on date,
  add column if not exists importance smallint not null default 0,
  add column if not exists source text not null default 'manual',
  add column if not exists is_active boolean not null default true;

-- Guard rails that don't restrict future type vocabulary
alter table public.memories
  add constraint memories_type_not_empty check (char_length(type) > 0),
  add constraint memories_source_not_empty check (char_length(source) > 0),
  add constraint memories_importance_range check (importance between 0 and 5);

-- Fast lookups for the Brain engine: "all gifts for person X",
-- "all active preferences for person X", timeline queries, etc.
create index if not exists idx_memories_user_person_type
  on public.memories (user_id, person_id, type);

create index if not exists idx_memories_user_type_active
  on public.memories (user_id, type)
  where is_active;

create index if not exists idx_memories_occurred_on
  on public.memories (occurred_on)
  where occurred_on is not null;

-- Generic updated_at trigger (reusable across future tables too)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_memories_set_updated_at on public.memories;
create trigger trg_memories_set_updated_at
  before update on public.memories
  for each row
  execute function public.set_updated_at();

comment on column public.memories.type is
  'Free-form memory type: gift, preference, memory, note, hobby, restaurant, movie, flower, perfume, vacation, allergy, etc. New types require no schema change.';
comment on column public.memories.value_text is
  'Short structured value for the fact (e.g. "peonies", "peanut allergy"). Long-form narrative stays in content_text.';
comment on column public.memories.source is
  'Where this memory came from: manual, ai, chat, import.';
;
