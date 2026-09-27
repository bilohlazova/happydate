-- Make Data API exposure explicit. This keeps clean environments independent
-- from Supabase's legacy default privileges while preserving RLS as the row
-- authorization layer. No application table is available to anon.

-- Future objects must also opt in explicitly. These defaults apply to objects
-- subsequently created by the postgres migration role in public.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
-- PUBLIC EXECUTE is a built-in global default for new functions. A per-schema
-- default cannot subtract a global default, so this revoke must be global for
-- functions subsequently created by postgres.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated, service_role;

revoke all on table
  public.profiles,
  public.people,
  public.events,
  public.memories,
  public.subscriptions,
  public.reminders,
  public.reminder_preferences,
  public.reminder_deliveries,
  public.push_devices,
  public.gifts,
  public.gift_links,
  public.memory_knowledge_changes,
  public.knowledge_review_interactions,
  public.user_survey,
  public.planner_preferences,
  public.user_wellbeing_checkins,
  public.user_support_moments,
  public.pets,
  public.person_pets,
  public.person_symbols,
  public.person_happy_conversations,
  public.ai_gift_cache
from anon, authenticated, service_role;

grant select, insert on table public.profiles to authenticated;
grant update (
  full_name,
  phone,
  preferences,
  avatar_url,
  preferred_locale,
  gift_outcome_learning_enabled,
  wellbeing_personalization_enabled
) on table public.profiles to authenticated;

grant select, insert, update, delete on table
  public.people,
  public.events,
  public.memories,
  public.gifts,
  public.gift_links,
  public.pets,
  public.person_symbols
to authenticated;

grant select on table
  public.subscriptions,
  public.reminder_deliveries,
  public.memory_knowledge_changes,
  public.user_survey
to authenticated;

grant select, insert, update on table
  public.reminder_preferences,
  public.planner_preferences
to authenticated;

grant select, insert on table
  public.user_wellbeing_checkins,
  public.user_support_moments
to authenticated;

grant select, insert, delete on table public.person_pets to authenticated;

grant select on table public.person_happy_conversations to authenticated;

grant select on table public.knowledge_review_interactions to authenticated;
grant insert (user_id, channel, action)
  on table public.knowledge_review_interactions to authenticated;

grant select (
  id,
  user_id,
  platform,
  locale,
  enabled,
  last_seen_at,
  created_at,
  updated_at
) on table public.push_devices to authenticated;

grant select on table public.reminders to authenticated;
grant insert (
  user_id,
  event_id,
  occurrence_date,
  action_kind,
  state,
  next_remind_at,
  snoozed_until,
  completed_at,
  cancelled_at
) on table public.reminders to authenticated;
grant update (
  state,
  next_remind_at,
  snoozed_until,
  completed_at,
  cancelled_at
) on table public.reminders to authenticated;

-- Server-side Data API calls use only these operations.
grant select on table
  public.profiles,
  public.people,
  public.gifts,
  public.gift_links,
  public.pets,
  public.person_pets,
  public.person_symbols
to service_role;
grant select, insert on table
  public.memories,
  public.person_happy_conversations
to service_role;
grant select, insert, update on table public.ai_gift_cache to service_role;

-- Trigger functions are not client RPCs. PostgreSQL grants EXECUTE to PUBLIC
-- by default, so remove that implicit API surface explicitly.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.confirm_explicit_gift_outcome() from public, anon, authenticated;
revoke all on function public.ensure_single_preferred_gift_link() from public, anon, authenticated;
revoke all on function public.snapshot_final_gift_selection() from public, anon, authenticated;
revoke all on function public.expire_trials() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Authenticated RPC surface used by the application.
revoke all on function public.consume_my_in_app_deliveries(integer) from public, anon, authenticated;
revoke all on function public.register_my_push_device(text, text, text) from public, anon, authenticated;
revoke all on function public.disable_my_push_devices() from public, anon, authenticated;
revoke all on function public.resolve_memory_knowledge_conflict(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.save_my_onboarding_survey(text[], text[], text, text, jsonb) from public, anon, authenticated;

grant execute on function public.consume_my_in_app_deliveries(integer) to authenticated;
grant execute on function public.register_my_push_device(text, text, text) to authenticated;
grant execute on function public.disable_my_push_devices() to authenticated;
grant execute on function public.resolve_memory_knowledge_conflict(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.save_my_onboarding_survey(text[], text[], text, text, jsonb) to authenticated;
grant execute on function public.expire_trials() to service_role;
