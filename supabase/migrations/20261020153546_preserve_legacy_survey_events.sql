-- Legacy survey event IDs do not prove that an event was created by the survey.
-- Keep that history intact and mark only newly-created survey events explicitly.
alter table public.events
  add column if not exists survey_origin text;

comment on column public.events.survey_origin is
  'Trusted provenance marker for events created by the onboarding survey. NULL means legacy or user-created.';

create or replace function public.save_my_onboarding_survey(
  p_likes text[],
  p_dislikes text[],
  p_dream text,
  p_notes text,
  p_special_dates jsonb default '[]'::jsonb
)
returns table(points_awarded integer, special_date_event_ids uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.user_survey%rowtype;
  v_event_ids uuid[] := '{}';
  v_item jsonb;
  v_event_id uuid;
  v_kind text;
  v_label text;
  v_date date;
  v_position integer := 0;
  v_existing_event_id uuid;
  v_awarded integer := 0;
  v_had_survey boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if coalesce(cardinality(p_likes), 0) > 50
     or coalesce(cardinality(p_dislikes), 0) > 50 then
    raise exception 'Too many survey preferences' using errcode = '22023';
  end if;
  if exists (
    select 1 from pg_catalog.unnest(coalesce(p_likes, '{}')) as preference(value)
    where value is null or pg_catalog.btrim(value) = '' or pg_catalog.char_length(value) > 280
  ) or exists (
    select 1 from pg_catalog.unnest(coalesce(p_dislikes, '{}')) as preference(value)
    where value is null or pg_catalog.btrim(value) = '' or pg_catalog.char_length(value) > 280
  ) then
    raise exception 'Invalid survey preference' using errcode = '22023';
  end if;
  if pg_catalog.char_length(coalesce(p_dream, '')) > 2000
     or pg_catalog.char_length(coalesce(p_notes, '')) > 5000 then
    raise exception 'Survey text is too long' using errcode = '22023';
  end if;

  select * into v_existing
  from public.user_survey
  where user_id = v_user_id
  for update;
  v_had_survey := found;

  -- NULL means “preserve legacy survey events”; the new UI does not edit them.
  -- A supplied array replaces only the survey's reference list. Existing event
  -- rows are retained because their provenance may be legacy or user-created.
  if p_special_dates is null then
    v_event_ids := coalesce(v_existing.special_date_event_ids, '{}');
  else
    if pg_catalog.jsonb_typeof(p_special_dates) <> 'array'
       or pg_catalog.jsonb_array_length(p_special_dates) > 50
       or pg_catalog.octet_length(p_special_dates::text) > 50000 then
      raise exception 'Invalid special dates' using errcode = '22023';
    end if;

    for v_item in select value from pg_catalog.jsonb_array_elements(p_special_dates)
    loop
      v_position := v_position + 1;
      v_kind := v_item ->> 'kind';
      v_label := pg_catalog.btrim(coalesce(v_item ->> 'label', ''));
      begin
        v_date := (v_item ->> 'date')::date;
      exception when others then
        raise exception 'Invalid special date' using errcode = '22023';
      end;
      if v_kind not in ('support', 'celebration')
         or v_label = '' or pg_catalog.char_length(v_label) > 280 then
        raise exception 'Invalid special date details' using errcode = '22023';
      end if;
      select event.id into v_existing_event_id
      from public.events as event
      where event.id = v_existing.special_date_event_ids[v_position]
        and event.user_id = v_user_id
        and event.survey_origin = 'onboarding_survey'
      for update;

      if v_existing_event_id is not null then
        update public.events
        set title = v_label,
            date = v_date,
            category = case v_kind when 'support' then 'personal_support' else 'celebration' end,
            is_important = true,
            recurrence_rule = 'yearly'
        where id = v_existing_event_id
          and user_id = v_user_id
          and survey_origin = 'onboarding_survey';
        v_event_id := v_existing_event_id;
      else
        insert into public.events (user_id, title, date, category, is_important, recurrence_rule, survey_origin)
        values (v_user_id, v_label, v_date,
          case v_kind when 'support' then 'personal_support' else 'celebration' end,
          true, 'yearly', 'onboarding_survey')
        returning id into v_event_id;
      end if;
      v_event_ids := pg_catalog.array_append(v_event_ids, v_event_id);
      v_existing_event_id := null;
    end loop;
  end if;

  if not v_had_survey or v_existing.reward_granted_at is null then
    insert into public.profiles (id, points)
    values (v_user_id, 100)
    on conflict (id) do update
      set points = coalesce(public.profiles.points, 0) + 100;
    v_awarded := 100;
  end if;

  insert into public.user_survey (
    user_id, likes, dislikes, dream, notes, is_completed, completed_at,
    reward_granted_at, special_date_event_ids, updated_at
  ) values (
    v_user_id, coalesce(p_likes, '{}'), coalesce(p_dislikes, '{}'),
    coalesce(p_dream, ''), coalesce(p_notes, ''), true,
    coalesce(v_existing.completed_at, statement_timestamp()),
    coalesce(v_existing.reward_granted_at, statement_timestamp()),
    v_event_ids, statement_timestamp()
  )
  on conflict (user_id) do update set
    likes = excluded.likes,
    dislikes = excluded.dislikes,
    dream = excluded.dream,
    notes = excluded.notes,
    is_completed = true,
    completed_at = coalesce(public.user_survey.completed_at, excluded.completed_at),
    reward_granted_at = coalesce(public.user_survey.reward_granted_at, excluded.reward_granted_at),
    special_date_event_ids = excluded.special_date_event_ids,
    updated_at = excluded.updated_at;

  return query select v_awarded, v_event_ids;
end;
$$;

revoke all on function public.save_my_onboarding_survey(text[], text[], text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_my_onboarding_survey(text[], text[], text, text, jsonb)
  to authenticated;
