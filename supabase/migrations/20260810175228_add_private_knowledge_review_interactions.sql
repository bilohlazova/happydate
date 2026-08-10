create table public.knowledge_review_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  action text not null,
  occurred_on date not null default ((statement_timestamp() at time zone 'UTC')::date),
  created_at timestamptz not null default statement_timestamp(),
  constraint knowledge_review_interactions_channel_check
    check (channel in ('home', 'voice', 'profile')),
  constraint knowledge_review_interactions_action_check
    check (action in ('shown', 'confirmed', 'snoozed', 'archived')),
  constraint knowledge_review_interactions_daily_unique
    unique (user_id, occurred_on, channel, action)
);

create index knowledge_review_interactions_daily_aggregate_idx
  on public.knowledge_review_interactions (occurred_on, channel, action);

alter table public.knowledge_review_interactions enable row level security;
revoke all on table public.knowledge_review_interactions from public, anon, authenticated;
grant select on table public.knowledge_review_interactions to authenticated;
grant insert (user_id, channel, action) on table public.knowledge_review_interactions to authenticated;

create policy "knowledge_review_interactions_select_own"
on public.knowledge_review_interactions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "knowledge_review_interactions_insert_own_today"
on public.knowledge_review_interactions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and occurred_on = ((statement_timestamp() at time zone 'UTC')::date)
);

comment on table public.knowledge_review_interactions is
  'Content-free, first-party daily interaction signals for Knowledge review cadence evaluation.';
comment on column public.knowledge_review_interactions.channel is
  'Surface where the review appeared; never stores Person, Knowledge, note, or spoken content.';
