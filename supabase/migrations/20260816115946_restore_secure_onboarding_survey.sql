-- Restore the onboarding survey as private, owner-scoped data and make survey
-- completion, its one-time reward, and special-date Event replacement atomic.

create table if not exists public.user_survey (
  user_id uuid primary key references auth.users(id) on delete cascade,
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  dream text not null default '',
  notes text not null default '',
  is_completed boolean not null default false,
  completed_at timestamptz,
  reward_granted_at timestamptz,
  special_date_event_ids uuid[] not null default '{}',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint user_survey_likes_limit check (cardinality(likes) <= 50),
  constraint user_survey_dislikes_limit check (cardinality(dislikes) <= 50),
  constraint user_survey_dream_limit check (char_length(dream) <= 2000),
  constraint user_survey_notes_limit check (char_length(notes) <= 5000),
  constraint user_survey_special_dates_limit check (cardinality(special_date_event_ids) <= 50)
);

comment on table public.user_survey is
  'Private, user-authored onboarding preferences. HappyDate must not infer facts beyond these answers.';

alter table public.user_survey enable row level security;
revoke all on table public.user_survey from public, anon, authenticated;
grant select on table public.user_survey to authenticated;

drop policy if exists user_survey_select_own on public.user_survey;
create policy user_survey_select_own
on public.user_survey for select to authenticated
using ((select auth.uid()) = user_id);

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
  v_awarded integer := 0;
  v_had_survey boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Serialize the first completion per account so parallel requests cannot
  -- receive the one-time reward twice before the survey row exists.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );
  if coalesce(cardinality(p_likes), 0) > 50 or coalesce(cardinality(p_dislikes), 0) > 50 then
    raise exception 'Too many survey preferences' using errcode = '22023';
  end if;
  if char_length(coalesce(p_dream, '')) > 2000 or char_length(coalesce(p_notes, '')) > 5000 then
    raise exception 'Survey text is too long' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_special_dates, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_special_dates, '[]'::jsonb)) > 50 then
    raise exception 'Invalid special dates' using errcode = '22023';
  end if;

  select * into v_existing
  from public.user_survey
  where user_id = v_user_id
  for update;
  v_had_survey := found;

  if v_had_survey and cardinality(v_existing.special_date_event_ids) > 0 then
    delete from public.events
    where user_id = v_user_id and id = any(v_existing.special_date_event_ids);
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_special_dates, '[]'::jsonb))
  loop
    v_kind := v_item ->> 'kind';
    v_label := btrim(coalesce(v_item ->> 'label', ''));
    begin
      v_date := (v_item ->> 'date')::date;
    exception when others then
      raise exception 'Invalid special date' using errcode = '22023';
    end;
    if v_kind not in ('support', 'celebration') or v_label = '' or char_length(v_label) > 280 then
      raise exception 'Invalid special date details' using errcode = '22023';
    end if;

    insert into public.events (user_id, title, date, category, is_important, recurrence_rule)
    values (
      v_user_id,
      v_label,
      v_date,
      case v_kind when 'support' then 'personal_support' else 'celebration' end,
      true,
      'yearly'
    )
    returning id into v_event_id;
    v_event_ids := array_append(v_event_ids, v_event_id);
  end loop;

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
