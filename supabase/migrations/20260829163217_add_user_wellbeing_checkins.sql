alter table public.profiles
  add column wellbeing_personalization_enabled boolean not null default false;

create table public.user_wellbeing_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('good', 'low', 'skip', 'custom')),
  note text null check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.user_wellbeing_checkins enable row level security;
revoke all on table public.user_wellbeing_checkins from anon;
grant select, insert, delete on table public.user_wellbeing_checkins to authenticated;

create policy "wellbeing_checkins_select_own" on public.user_wellbeing_checkins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "wellbeing_checkins_insert_own" on public.user_wellbeing_checkins
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wellbeing_checkins_delete_own" on public.user_wellbeing_checkins
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update on table public.profiles from authenticated;
grant update (full_name, phone, preferences, avatar_url, preferred_locale, gift_outcome_learning_enabled, wellbeing_personalization_enabled) on table public.profiles to authenticated;

comment on table public.user_wellbeing_checkins is
  'Private opt-in self check-ins. Never used for gift recommendations for other people.';
