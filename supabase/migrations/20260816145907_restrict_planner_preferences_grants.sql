revoke all on table public.planner_preferences from anon;
revoke all on table public.planner_preferences from authenticated;
grant select, insert, update on table public.planner_preferences to authenticated;
