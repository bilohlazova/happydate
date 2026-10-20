-- Keep registration names canonical and separate from the legacy display field.
-- Existing full_name values are intentionally not split: order and compound names
-- are ambiguous, so only newly captured/explicitly edited first_name is trusted.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

comment on column public.profiles.first_name is
  'Owner-provided given name used for friendly Happy greetings.';
comment on column public.profiles.last_name is
  'Owner-provided family name; never used for friendly Happy greetings.';

grant update (full_name, first_name, last_name, phone, preferences, avatar_url, preferred_locale, gift_outcome_learning_enabled, wellbeing_personalization_enabled)
  on table public.profiles to authenticated;
