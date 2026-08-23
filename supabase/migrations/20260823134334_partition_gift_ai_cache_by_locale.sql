alter table public.ai_gift_cache
  add column locale text;

update public.ai_gift_cache
set locale = 'pl'
where locale is null;

alter table public.ai_gift_cache
  alter column locale set not null,
  alter column locale set default 'pl',
  add constraint ai_gift_cache_locale_supported
    check (locale in ('pl', 'uk', 'en', 'ru', 'de'));

alter table public.ai_gift_cache
  drop constraint ai_gift_cache_pkey;

alter table public.ai_gift_cache
  add constraint ai_gift_cache_pkey primary key (person_id, occasion, locale);

comment on column public.ai_gift_cache.locale is
  'Application locale used for every user-visible field in the cached AI response.';
