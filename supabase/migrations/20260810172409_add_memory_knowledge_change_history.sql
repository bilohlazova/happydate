create table public.memory_knowledge_changes (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  previous_value text not null,
  new_value text not null,
  changed_at timestamptz not null default statement_timestamp(),
  change_source text not null default 'person_profile',
  constraint memory_knowledge_changes_previous_not_blank check (char_length(btrim(previous_value)) between 1 and 500),
  constraint memory_knowledge_changes_new_not_blank check (char_length(btrim(new_value)) between 1 and 500),
  constraint memory_knowledge_changes_value_changed check (previous_value is distinct from new_value),
  constraint memory_knowledge_changes_source_not_blank check (char_length(btrim(change_source)) > 0)
);

alter table public.memory_knowledge_changes enable row level security;

revoke all on table public.memory_knowledge_changes from public, anon, authenticated;
grant select on table public.memory_knowledge_changes to authenticated;
grant select, insert, update, delete on table public.memory_knowledge_changes to service_role;

create policy "memory_knowledge_changes_select_own"
on public.memory_knowledge_changes for select to authenticated
using ((select auth.uid()) = user_id);

create index memory_knowledge_changes_owner_person_changed_idx
  on public.memory_knowledge_changes (user_id, person_id, changed_at desc);

create index memory_knowledge_changes_memory_changed_idx
  on public.memory_knowledge_changes (memory_id, changed_at desc);

comment on table public.memory_knowledge_changes is
  'Immutable audit history of user corrections to explicitly confirmed Memory Brain knowledge.';

create function private.capture_confirmed_memory_value_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.source_record_id is not null
     and old.user_confirmed_at is not null
     and old.person_id is not null
     and old.value_text is distinct from new.value_text
     and old.value_text is not null
     and new.value_text is not null then
    insert into public.memory_knowledge_changes (
      memory_id,
      user_id,
      person_id,
      previous_value,
      new_value,
      change_source
    ) values (
      old.id,
      old.user_id,
      old.person_id,
      old.value_text,
      new.value_text,
      'person_profile'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.capture_confirmed_memory_value_change()
  from public, anon, authenticated;
grant execute on function private.capture_confirmed_memory_value_change()
  to service_role;

create trigger memories_capture_confirmed_value_change
after update of value_text on public.memories
for each row execute function private.capture_confirmed_memory_value_change();
