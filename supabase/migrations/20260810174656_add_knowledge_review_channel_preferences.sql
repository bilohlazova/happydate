alter table public.reminder_preferences
  add column knowledge_review_home_enabled boolean not null default true,
  add column knowledge_review_voice_enabled boolean not null default true;

comment on column public.reminder_preferences.knowledge_review_home_enabled is
  'Whether proactive confirmed-Knowledge review may appear as a Home recommendation.';
comment on column public.reminder_preferences.knowledge_review_voice_enabled is
  'Whether proactive confirmed-Knowledge review may be spoken in a detailed daily briefing.';
