-- One trusted persistence boundary for deterministic Occasion proactive artifacts.
create or replace function public.try_create_happy_proactive_occasion_artifact(
  p_kind text,
  p_user_id uuid,
  p_person_id uuid,
  p_occasion_key text,
  p_occurrence_key text,
  p_milestone text,
  p_locale text,
  p_missing text[] default '{}'
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
  if p_kind not in ('idea','notification') or p_milestone not in ('planning','preparing','urgent','today')
     or p_occasion_key <> 'pl_boys_day' or p_occurrence_key <> 'occasion:' || p_occasion_key || ':' || split_part(p_occurrence_key, ':', 3)
     or not exists (select 1 from public.people person where person.id = p_person_id and person.user_id = p_user_id)
  then return false; end if;

  if p_kind = 'idea' then
    v_title := case v_locale when 'uk' then 'Наближається особлива дата' when 'pl' then 'Zbliża się ważna okazja' when 'de' then 'Ein besonderer Tag naht' when 'ru' then 'Приближается важная дата' else 'A special day is coming' end;
    v_message := case v_locale when 'uk' then 'Можна почати підготовку.' when 'pl' then 'Możesz zacząć przygotowania.' when 'de' then 'Du kannst mit den Vorbereitungen beginnen.' when 'ru' then 'Можно начать подготовку.' else 'You can start preparing.' end;
    insert into public.happy_ideas(user_id,person_id,type,title,message,proactive_key)
      values(p_user_id,p_person_id,'occasion_preparation',v_title,v_message,v_key)
      on conflict (user_id,proactive_key) do nothing;
  else
    v_title := case v_locale when 'uk' then 'Потрібна увага до особливої дати' when 'pl' then 'Ta okazja wymaga uwagi' when 'de' then 'Diese Gelegenheit braucht Aufmerksamkeit' when 'ru' then 'Этой дате нужно внимание' else 'This occasion needs attention' end;
    v_message := case v_locale when 'uk' then 'Happy може допомогти з останніми кроками.' when 'pl' then 'Happy może pomóc z ostatnimi krokami.' when 'de' then 'Happy kann bei den letzten Schritten helfen.' when 'ru' then 'Happy может помочь с последними шагами.' else 'Happy can help with the last steps.' end;
    insert into public.happy_notifications(user_id,person_id,type,title,message,priority,dedupe_key)
      values(p_user_id,p_person_id,'occasion_rescue',v_title,v_message,'important',v_key)
      on conflict (user_id,dedupe_key) do nothing;
  end if;
  return found;
end;
$function$;

revoke all on function public.try_create_happy_proactive_occasion_artifact(text,uuid,uuid,text,text,text,text,text[]) from public, anon, authenticated;
grant execute on function public.try_create_happy_proactive_occasion_artifact(text,uuid,uuid,text,text,text,text,text[]) to service_role;
