alter table public.user_wellbeing_checkins
  add column source text not null default 'home'
    check (char_length(btrim(source)) between 1 and 32),
  add column schema_version smallint not null default 1
    check (schema_version between 1 and 32767);

alter table public.user_wellbeing_checkins
  drop constraint user_wellbeing_checkins_mood_check,
  add constraint user_wellbeing_checkins_mood_check
    check (mood in ('good', 'neutral', 'low', 'skip', 'custom'));

create index user_wellbeing_checkins_user_created_idx
  on public.user_wellbeing_checkins (user_id, created_at desc);

create table public.user_support_moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('recurring_low_wellbeing')),
  status text not null default 'eligible'
    check (status in ('eligible', 'shown', 'accepted', 'dismissed')),
  schema_version smallint not null default 1
    check (schema_version between 1 and 32767),
  shown_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'eligible' and shown_at is null) or status <> 'eligible')
);

create index user_support_moments_user_created_idx
  on public.user_support_moments (user_id, created_at desc);

create unique index user_support_moments_one_eligible_idx
  on public.user_support_moments (user_id, trigger_type)
  where status = 'eligible';

alter table public.user_support_moments enable row level security;
revoke all on table public.user_support_moments from anon;
grant select, insert, update on table public.user_support_moments to authenticated;

create policy "support_moments_select_own" on public.user_support_moments
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "support_moments_insert_own" on public.user_support_moments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "support_moments_update_own" on public.user_support_moments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.user_support_moments is
  'Private wellbeing support eligibility and delivery lifecycle, kept separate from gift flows.';
