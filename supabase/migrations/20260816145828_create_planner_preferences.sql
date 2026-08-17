create table if not exists public.planner_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  day_start time without time zone not null default time '09:00',
  day_end time without time zone not null default time '18:00',
  default_duration_minutes integer not null default 60,
  default_gap_minutes integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint planner_preferences_day_window_check check (day_start < day_end),
  constraint planner_preferences_duration_check check (default_duration_minutes between 5 and 1440),
  constraint planner_preferences_gap_check check (default_gap_minutes between 0 and 240)
);

comment on table public.planner_preferences is
  'Owner-private defaults used only to initialize an editable HappyDate day-plan draft.';

alter table public.planner_preferences enable row level security;

drop policy if exists "planner_preferences_select_own" on public.planner_preferences;
create policy "planner_preferences_select_own"
on public.planner_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "planner_preferences_insert_own" on public.planner_preferences;
create policy "planner_preferences_insert_own"
on public.planner_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "planner_preferences_update_own" on public.planner_preferences;
create policy "planner_preferences_update_own"
on public.planner_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.planner_preferences from anon;
grant select, insert, update on table public.planner_preferences to authenticated;
grant all on table public.planner_preferences to service_role;
