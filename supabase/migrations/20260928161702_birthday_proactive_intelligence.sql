-- V2 keeps every birthday opportunity independently idempotent. Existing
-- generic V1 ideas remain historical rows, but new writes use explicit rule
-- keys and revalidate the durable state inside the database transaction.

revoke execute on function public.try_create_happy_proactive_birthday_idea(uuid, uuid, uuid, date)
  from service_role;
revoke execute on function public.try_create_happy_proactive_birthday_notification(uuid, uuid, uuid, date)
  from service_role;

create function public.try_create_happy_proactive_birthday_idea(
  p_rule text,
  p_user_id uuid,
  p_person_id uuid,
  p_event_id uuid,
  p_occurrence_date date,
  p_locale text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_locale text := case when p_locale in ('uk', 'pl', 'en', 'de', 'ru') then p_locale else 'en' end;
  v_title text;
  v_message text;
begin
  if p_rule not in ('start_gift_planning', 'gift_help', 'prepare_greeting') or not exists (
    select 1
    from public.events event
    join public.people person on person.id = event.person_id
    where event.id = p_event_id
      and event.user_id = p_user_id
      and event.person_id = p_person_id
      and event.date = p_occurrence_date
      and event.category = 'birthday'
      and event.date between (statement_timestamp() at time zone 'UTC')::date
        and ((statement_timestamp() at time zone 'UTC')::date + 30)
      and person.user_id = p_user_id
  ) then
    return false;
  end if;

  if p_rule in ('start_gift_planning', 'gift_help') and exists (
    select 1 from public.gifts gift
    where gift.user_id = p_user_id
      and gift.person_id = p_person_id
      and gift.event_id = p_event_id
      and gift.lifecycle in ('selected', 'purchased')
  ) then
    return false;
  end if;

  if p_rule = 'start_gift_planning' and p_occurrence_date not between
    ((statement_timestamp() at time zone 'UTC')::date + 15)
    and ((statement_timestamp() at time zone 'UTC')::date + 30) then
    return false;
  end if;

  if p_rule = 'gift_help' then
    if p_occurrence_date not between (statement_timestamp() at time zone 'UTC')::date
      and ((statement_timestamp() at time zone 'UTC')::date + 14) then
      return false;
    end if;
    if exists (
      select 1 from public.happy_tasks task
      where task.user_id = p_user_id
        and task.person_id = p_person_id
        and task.event_id = p_event_id
        and task.type = 'birthday_preparation'
        and task.status in ('active', 'waiting_user', 'paused')
    ) then
      return false;
    end if;
  end if;

  if p_rule = 'prepare_greeting' then
    if p_occurrence_date <> ((statement_timestamp() at time zone 'UTC')::date + 1) then
      return false;
    end if;
    if not exists (
      select 1 from public.gifts gift
      where gift.user_id = p_user_id
        and gift.person_id = p_person_id
        and gift.event_id = p_event_id
        and gift.lifecycle in ('selected', 'purchased')
    ) or exists (
      select 1
      from public.happy_task_steps step
      join public.happy_tasks task on task.id = step.task_id
      where task.user_id = p_user_id
        and task.person_id = p_person_id
        and task.event_id = p_event_id
        and task.type = 'birthday_preparation'
        and step.type = 'prepare_greeting'
        and step.status = 'completed'
    ) then
      return false;
    end if;
  end if;

  if p_rule = 'start_gift_planning' then
    v_title := case v_locale
      when 'uk' then 'Час подумати про подарунок'
      when 'pl' then 'Warto pomyśleć o prezencie'
      when 'de' then 'Zeit, über ein Geschenk nachzudenken'
      when 'ru' then 'Пора подумать о подарке'
      else 'Time to think about a gift'
    end;
    v_message := case v_locale
      when 'uk' then 'Незабаром день народження — можна почати планувати подарунок.'
      when 'pl' then 'Urodziny są coraz bliżej — można zacząć planować prezent.'
      when 'de' then 'Der Geburtstag rückt näher — du kannst mit der Geschenkplanung beginnen.'
      when 'ru' then 'День рождения приближается — можно начать планировать подарок.'
      else 'The birthday is coming up — you can start planning a gift.'
    end;
  elsif p_rule = 'gift_help' then
    v_title := case v_locale
      when 'uk' then 'Потрібна допомога з подарунком?'
      when 'pl' then 'Potrzebujesz pomocy z prezentem?'
      when 'de' then 'Brauchst du Hilfe beim Geschenk?'
      when 'ru' then 'Нужна помощь с подарком?'
      else 'Need help with the gift?'
    end;
    v_message := case v_locale
      when 'uk' then 'День народження вже близько — Happy може допомогти підготувати подарунок.'
      when 'pl' then 'Urodziny są już blisko — Happy może pomóc przygotować prezent.'
      when 'de' then 'Der Geburtstag ist bald — Happy kann bei der Geschenkvorbereitung helfen.'
      when 'ru' then 'День рождения уже близко — Happy может помочь подготовить подарок.'
      else 'The birthday is getting closer — Happy can help prepare a gift.'
    end;
  else
    v_title := case v_locale
      when 'uk' then 'Підготуйте привітання'
      when 'pl' then 'Przygotuj życzenia'
      when 'de' then 'Bereite einen Gruß vor'
      when 'ru' then 'Подготовьте поздравление'
      else 'Prepare a greeting'
    end;
    v_message := case v_locale
      when 'uk' then 'Подарунок готовий, а день народження вже завтра — можна підготувати привітання.'
      when 'pl' then 'Prezent jest gotowy, a urodziny już jutro — możesz przygotować życzenia.'
      when 'de' then 'Das Geschenk ist bereit und der Geburtstag ist morgen — du kannst einen Gruß vorbereiten.'
      when 'ru' then 'Подарок готов, а день рождения уже завтра — можно подготовить поздравление.'
      else 'The gift is ready and the birthday is tomorrow — you can prepare a greeting.'
    end;
  end if;

  insert into public.happy_ideas (
    user_id, person_id, event_id, type, title, message, proactive_key
  ) values (
    p_user_id, p_person_id, p_event_id, p_rule, v_title, v_message,
    'birthday:' || p_rule || ':' || p_event_id::text || ':' || p_occurrence_date::text
  ) on conflict (user_id, proactive_key) do nothing;

  return found;
end;
$function$;

create function public.try_create_happy_proactive_birthday_gift_missing_notification(
  p_user_id uuid,
  p_person_id uuid,
  p_event_id uuid,
  p_occurrence_date date,
  p_locale text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_locale text := case when p_locale in ('uk', 'pl', 'en', 'de', 'ru') then p_locale else 'en' end;
  v_title text;
  v_message text;
begin
  if not exists (
    select 1
    from public.events event
    join public.people person on person.id = event.person_id
    where event.id = p_event_id
      and event.user_id = p_user_id
      and event.person_id = p_person_id
      and event.date = p_occurrence_date
      and event.category = 'birthday'
      and event.date between (statement_timestamp() at time zone 'UTC')::date
        and ((statement_timestamp() at time zone 'UTC')::date + 5)
      and person.user_id = p_user_id
  ) or exists (
    select 1 from public.gifts gift
    where gift.user_id = p_user_id
      and gift.person_id = p_person_id
      and gift.event_id = p_event_id
      and gift.lifecycle in ('selected', 'purchased')
  ) then
    return false;
  end if;

  v_title := case v_locale
    when 'uk' then 'Подарунок ще не готовий'
    when 'pl' then 'Prezent nie jest jeszcze gotowy'
    when 'de' then 'Das Geschenk ist noch nicht bereit'
    when 'ru' then 'Подарок ещё не готов'
    else 'The gift is not ready yet'
  end;
  v_message := case v_locale
    when 'uk' then 'До дня народження залишилося небагато часу. Можна повернутися до підготовки подарунка.'
    when 'pl' then 'Do urodzin zostało niewiele czasu. Możesz wrócić do przygotowania prezentu.'
    when 'de' then 'Bis zum Geburtstag bleibt wenig Zeit. Du kannst zur Geschenkvorbereitung zurückkehren.'
    when 'ru' then 'До дня рождения осталось мало времени. Можно вернуться к подготовке подарка.'
    else 'There is little time left before the birthday. You can return to preparing the gift.'
  end;

  insert into public.happy_notifications (
    user_id, person_id, event_id, type, title, message, priority, dedupe_key
  ) values (
    p_user_id, p_person_id, p_event_id, 'gift_missing', v_title, v_message, 'normal',
    'birthday:gift_missing:' || p_user_id::text || ':' || p_event_id::text || ':' || p_occurrence_date::text
  ) on conflict (user_id, dedupe_key) do nothing;

  return found;
end;
$function$;

revoke all on function public.try_create_happy_proactive_birthday_idea(text, uuid, uuid, uuid, date, text)
  from public, anon, authenticated;
revoke all on function public.try_create_happy_proactive_birthday_gift_missing_notification(uuid, uuid, uuid, date, text)
  from public, anon, authenticated;
grant execute on function public.try_create_happy_proactive_birthday_idea(text, uuid, uuid, uuid, date, text)
  to service_role;
grant execute on function public.try_create_happy_proactive_birthday_gift_missing_notification(uuid, uuid, uuid, date, text)
  to service_role;
