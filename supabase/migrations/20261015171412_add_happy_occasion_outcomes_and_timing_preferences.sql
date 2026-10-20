-- Explicit, occurrence-scoped feedback. This is operational information, not
-- Person Knowledge and deliberately contains no free text or behavioural inference.
create table public.happy_occasion_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_key text not null,
  person_id uuid not null references public.people(id) on delete cascade,
  outcome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint happy_occasion_outcomes_occurrence_key_check
    check (occurrence_key ~ '^occasion:[a-z][a-z0-9_]*:[0-9]{4}$'),
  constraint happy_occasion_outcomes_outcome_check
    check (outcome in ('went_well', 'needed_more_time', 'did_not_happen')),
  constraint happy_occasion_outcomes_one_per_occurrence_person
    unique (user_id, occurrence_key, person_id)
);

create index happy_occasion_outcomes_owner_occurrence_idx
  on public.happy_occasion_outcomes (user_id, occurrence_key);

create function public.validate_happy_occasion_outcome_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from public.people person
    where person.id = new.person_id and person.user_id = new.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'happy_occasion_outcomes.person_id must belong to happy_occasion_outcomes.user_id';
  end if;
  return new;
end;
$function$;

revoke all on function public.validate_happy_occasion_outcome_references() from public, anon, authenticated;

create trigger happy_occasion_outcomes_validate_references
before insert or update of user_id, person_id on public.happy_occasion_outcomes
for each row execute function public.validate_happy_occasion_outcome_references();

create trigger happy_occasion_outcomes_set_updated_at
before update on public.happy_occasion_outcomes
for each row execute function public.set_updated_at();

alter table public.happy_occasion_outcomes enable row level security;
revoke all on table public.happy_occasion_outcomes from public, anon, authenticated;
revoke all on table public.happy_occasion_outcomes from service_role;
grant select on table public.happy_occasion_outcomes to authenticated;
grant select, insert, update on table public.happy_occasion_outcomes to service_role;

create policy "happy_occasion_outcomes_select_own"
on public.happy_occasion_outcomes for select to authenticated
using ((select auth.uid()) = user_id);

-- A future planning preference is separate from a single occurrence outcome.
create table public.happy_occasion_timing_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion_key text not null,
  lead_time_days integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, occasion_key),
  constraint happy_occasion_timing_preferences_occasion_key_check
    check (occasion_key in ('pl_boys_day')),
  constraint happy_occasion_timing_preferences_lead_time_days_check
    check (lead_time_days in (7, 14, 21, 30))
);

create trigger happy_occasion_timing_preferences_set_updated_at
before update on public.happy_occasion_timing_preferences
for each row execute function public.set_updated_at();

alter table public.happy_occasion_timing_preferences enable row level security;
revoke all on table public.happy_occasion_timing_preferences from public, anon, authenticated;
revoke all on table public.happy_occasion_timing_preferences from service_role;
grant select on table public.happy_occasion_timing_preferences to authenticated;
grant select, insert, update on table public.happy_occasion_timing_preferences to service_role;

create policy "happy_occasion_timing_preferences_select_own"
on public.happy_occasion_timing_preferences for select to authenticated
using ((select auth.uid()) = user_id);

-- Extend the single existing proactive writer with the D+1 post-event Idea.
-- This deliberately adds no job, queue, or alternate write path.
create or replace function public.try_create_happy_proactive_occasion_artifact(
  p_kind text, p_user_id uuid, p_person_id uuid, p_occasion_key text,
  p_occurrence_key text, p_milestone text, p_locale text, p_missing text[] default '{}'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_locale text := case when p_locale in ('uk','pl','en','de','ru') then p_locale else 'en' end;
  v_key text := 'occasion:' || p_occasion_key || ':' || split_part(p_occurrence_key, ':', 3) || ':' || p_person_id::text || ':' || p_milestone;
  v_title text;
  v_message text;
begin
  if p_kind not in ('idea','notification') or p_milestone not in ('planning','preparing','urgent','today','post_event')
     or p_occasion_key <> 'pl_boys_day' or p_occurrence_key <> 'occasion:' || p_occasion_key || ':' || split_part(p_occurrence_key, ':', 3)
     or not exists (select 1 from public.people person where person.id = p_person_id and person.user_id = p_user_id)
     or (p_milestone = 'post_event' and p_kind <> 'idea')
  then return false; end if;

  if p_kind = 'idea' and p_milestone = 'post_event' then
    v_title := case v_locale when 'uk' then 'Як усе пройшло?' when 'pl' then 'Jak poszło?' when 'de' then 'Wie ist es gelaufen?' when 'ru' then 'Как всё прошло?' else 'How did it go?' end;
    v_message := case v_locale when 'uk' then 'Розкажіть Happy про результат.' when 'pl' then 'Powiedz Happy, jak poszło.' when 'de' then 'Erzähl Happy, wie es gelaufen ist.' when 'ru' then 'Расскажите Happy, как всё прошло.' else 'Tell Happy how it went.' end;
    insert into public.happy_ideas(user_id,person_id,type,title,message,proactive_key)
      values(p_user_id,p_person_id,'occasion_post_event',v_title,v_message,v_key)
      on conflict (user_id,proactive_key) do nothing;
  elsif p_kind = 'idea' then
    v_title := case v_locale when 'uk' then 'Наближається особлива дата' when 'pl' then 'Zbliża się ważna okazja' when 'de' then 'Ein besonderer Tag naht' when 'ru' then 'Приближается важная дата' else 'A special day is coming' end;
    v_message := case v_locale when 'uk' then 'Можна почати підготовку.' when 'pl' then 'Możesz zacząć przygotowania.' when 'de' then 'Du kannst mit den Vorbereitungen beginnen.' when 'ru' then 'Можно начать подготовку.' else 'You can start preparing.' end;
    insert into public.happy_ideas(user_id,person_id,type,title,message,proactive_key)
      values(p_user_id,p_person_id,'occasion_preparation',v_title,v_message,v_key)
      on conflict (user_id,proactive_key) do nothing;
  else
    v_title := case v_locale when 'uk' then 'Потрібна увага до особливої дати' when 'pl' then 'Ta okazja wymaga uwagi' when 'de' then 'Diese Gelegenheit braucht Aufmerksamkeit' when 'ru' then 'Этой дате нужно внимание' else 'This occasion needs attention' end;
    v_message := case v_locale when 'uk' then 'Happy може допомогти з останніми кроками.' when 'pl' then 'Happy może pomóc z ostatnimi krokami.' when 'de' then 'Happy kann bei den letzten Schritten helfen.' when 'ru' then 'Happy может помочь с последними шагami.' else 'Happy can help with the last steps.' end;
    insert into public.happy_notifications(user_id,person_id,type,title,message,priority,dedupe_key)
      values(p_user_id,p_person_id,'occasion_rescue',v_title,v_message,'important',v_key)
      on conflict (user_id,dedupe_key) do nothing;
  end if;
  return found;
end;
$function$;

revoke all on function public.try_create_happy_proactive_occasion_artifact(text,uuid,uuid,text,text,text,text,text[]) from public, anon, authenticated;
grant execute on function public.try_create_happy_proactive_occasion_artifact(text,uuid,uuid,text,text,text,text,text[]) to service_role;
