-- Explicit user-selected country for the deterministic Occasion registry.
-- This is intentionally separate from locale, timezone, and proactivity mode.
create table public.happy_occasion_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country_code text,
  updated_at timestamptz not null default now(),
  constraint happy_occasion_preferences_country_code_check
    check (country_code is null or country_code in ('PL'))
);

create trigger happy_occasion_preferences_set_updated_at
before update on public.happy_occasion_preferences
for each row execute function public.set_updated_at();

alter table public.happy_occasion_preferences enable row level security;
revoke all on table public.happy_occasion_preferences from public, anon, authenticated;
revoke all on table public.happy_occasion_preferences from service_role;
grant select, insert, update on table public.happy_occasion_preferences to authenticated;
grant select on table public.happy_occasion_preferences to service_role;

create policy "happy_occasion_preferences_select_own"
on public.happy_occasion_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy "happy_occasion_preferences_insert_own"
on public.happy_occasion_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "happy_occasion_preferences_update_own"
on public.happy_occasion_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
