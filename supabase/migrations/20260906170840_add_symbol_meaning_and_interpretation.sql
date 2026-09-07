alter table public.person_symbols
  add column user_meaning text,
  add column happy_interpretation text,
  add column interpretation_disclaimer_version text;

alter table public.person_symbols
  add constraint person_symbols_user_meaning_length
    check (user_meaning is null or char_length(user_meaning) <= 2000),
  add constraint person_symbols_happy_interpretation_length
    check (happy_interpretation is null or char_length(happy_interpretation) <= 1200),
  add constraint person_symbols_disclaimer_version_length
    check (interpretation_disclaimer_version is null or char_length(interpretation_disclaimer_version) <= 80);

update public.person_symbols
set happy_interpretation = description,
    interpretation_disclaimer_version = case when description is not null then 'gentle-inspiration-v1' else null end
where description is not null;

comment on column public.person_symbols.user_meaning is
  'The user-authored meaning of the symbol. This is the highest-authority semantic layer.';
comment on column public.person_symbols.happy_interpretation is
  'Optional gentle creative inspiration from Happy; never a fact or diagnosis.';
