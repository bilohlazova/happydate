-- The trusted proactive Edge pipeline resolves each user's local calendar day
-- from reminder_preferences. The earlier Data API normalization intentionally
-- removed implicit service_role privileges, so opt this existing read path in
-- explicitly without granting any mutation capability.
grant select on table public.reminder_preferences to service_role;
