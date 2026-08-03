alter table public.profiles
  add column preferred_locale text null;

alter table public.profiles
  add constraint profiles_preferred_locale_allowed
  check (
    preferred_locale is null
    or preferred_locale in ('pl', 'uk', 'en', 'ru', 'de')
  );;
