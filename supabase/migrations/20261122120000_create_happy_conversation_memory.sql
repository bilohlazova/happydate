-- Persistent conversation memory for Happy.
--
-- 1. happy_chat_turns            every chat exchange (global and scoped), so a new
--                                session never starts from a blank slate.
-- 2. happy_conversation_summaries rolling, model-written summaries of older turns.
-- 3. happy_shown_ideas           gift ideas already shown (page or chat), so Happy
--                                never presents the same idea twice by accident.
--
-- All rows are written only by the trusted server (service_role) and are
-- readable and deletable by their owner through RLS.

create table public.happy_chat_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  scope text not null check (scope in ('global', 'person', 'event', 'task')),
  user_message text not null check (char_length(btrim(user_message)) between 1 and 4000),
  happy_response text not null check (char_length(btrim(happy_response)) between 1 and 8000),
  behavior_version text not null check (char_length(btrim(behavior_version)) between 1 and 80),
  summarized_at timestamptz,
  created_at timestamptz not null default now()
);

create index happy_chat_turns_user_created_idx
  on public.happy_chat_turns (user_id, created_at desc);
create index happy_chat_turns_person_created_idx
  on public.happy_chat_turns (user_id, person_id, created_at desc)
  where person_id is not null;
create index happy_chat_turns_unsummarized_idx
  on public.happy_chat_turns (user_id, created_at)
  where summarized_at is null;

create table public.happy_conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  summary text not null check (char_length(btrim(summary)) between 1 and 4000),
  topics text[] not null default '{}' check (cardinality(topics) <= 12),
  turn_count integer not null check (turn_count between 1 and 200),
  covers_from timestamptz not null,
  covers_until timestamptz not null,
  behavior_version text not null check (char_length(btrim(behavior_version)) between 1 and 80),
  created_at timestamptz not null default now()
);

create index happy_conversation_summaries_user_created_idx
  on public.happy_conversation_summaries (user_id, created_at desc);
create index happy_conversation_summaries_person_created_idx
  on public.happy_conversation_summaries (user_id, person_id, created_at desc)
  where person_id is not null;

create table public.happy_shown_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  title_key text not null check (char_length(title_key) between 1 and 200),
  why text check (why is null or char_length(why) <= 1000),
  source text not null check (source in ('page', 'chat')),
  occasion text check (occasion is null or char_length(occasion) <= 80),
  estimated_price numeric(12, 2) check (estimated_price is null or estimated_price >= 0),
  currency text check (currency is null or char_length(currency) <= 12),
  offer_url text check (offer_url is null or (char_length(offer_url) <= 2000 and offer_url ~* '^https://')),
  created_at timestamptz not null default now(),
  unique (user_id, person_id, title_key)
);

create index happy_shown_ideas_person_created_idx
  on public.happy_shown_ideas (user_id, person_id, created_at desc);

alter table public.happy_chat_turns enable row level security;
alter table public.happy_conversation_summaries enable row level security;
alter table public.happy_shown_ideas enable row level security;

revoke all on table
  public.happy_chat_turns,
  public.happy_conversation_summaries,
  public.happy_shown_ideas
from anon, authenticated, service_role;

grant select, delete on table
  public.happy_chat_turns,
  public.happy_conversation_summaries,
  public.happy_shown_ideas
to authenticated;

-- Trusted server only: it appends turns/summaries/ideas and marks turns as summarized.
grant select, insert on table
  public.happy_conversation_summaries,
  public.happy_shown_ideas
to service_role;
grant select, insert, update (summarized_at) on table public.happy_chat_turns to service_role;

create policy "happy_chat_turns_select_own"
on public.happy_chat_turns for select to authenticated
using ((select auth.uid()) = user_id);
create policy "happy_chat_turns_delete_own"
on public.happy_chat_turns for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "happy_conversation_summaries_select_own"
on public.happy_conversation_summaries for select to authenticated
using ((select auth.uid()) = user_id);
create policy "happy_conversation_summaries_delete_own"
on public.happy_conversation_summaries for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "happy_shown_ideas_select_own"
on public.happy_shown_ideas for select to authenticated
using ((select auth.uid()) = user_id);
create policy "happy_shown_ideas_delete_own"
on public.happy_shown_ideas for delete to authenticated
using ((select auth.uid()) = user_id);

comment on table public.happy_chat_turns is
  'Every Happy chat exchange, written only by the trusted server and readable/deletable by its owner.';
comment on table public.happy_conversation_summaries is
  'Rolling summaries of older Happy conversation turns. Interpretation, never a source of confirmed facts.';
comment on table public.happy_shown_ideas is
  'Gift ideas already shown to the user so Happy does not repeat them unprompted.';
