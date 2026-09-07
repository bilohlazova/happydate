create table public.person_happy_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  user_message text not null check (char_length(btrim(user_message)) between 1 and 4000),
  happy_response text not null check (char_length(btrim(happy_response)) between 1 and 8000),
  behavior_version text not null check (char_length(btrim(behavior_version)) between 1 and 80),
  created_at timestamptz not null default now()
);

create index person_happy_conversations_person_created_idx
  on public.person_happy_conversations (user_id, person_id, created_at desc);

alter table public.person_happy_conversations enable row level security;
revoke all on table public.person_happy_conversations from anon, authenticated;
grant select, delete on table public.person_happy_conversations to authenticated;

create policy "person_happy_conversations_select_own"
on public.person_happy_conversations for select to authenticated
using ((select auth.uid()) = user_id);

create policy "person_happy_conversations_delete_own"
on public.person_happy_conversations for delete to authenticated
using ((select auth.uid()) = user_id);

comment on table public.person_happy_conversations is
  'Bounded person-scoped conversation history written only by the trusted server and readable by its owner.';
