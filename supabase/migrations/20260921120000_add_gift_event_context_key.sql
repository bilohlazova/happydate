-- Synthetic recurring events (for example a person's generated birthday)
-- do not have a public.events UUID. Persist their occurrence identity on the
-- existing canonical gift row instead of creating a parallel gift store.

alter table public.gifts
  add column event_context_key text;

alter table public.gifts
  add constraint gifts_event_context_key_check
  check (
    event_context_key is null
    or (
      event_id is null
      and char_length(btrim(event_context_key)) between 1 and 180
    )
  );

-- The current product model has one main prepared gift per event context.
-- Stop safely if legacy rows already violate that rule. A human must decide
-- which row remains prepared; this migration never deletes or rewrites gifts.
do $$
begin
  if exists (
    select 1
    from public.gifts
    where lifecycle in ('selected', 'purchased')
      and event_id is not null
    group by user_id, person_id, event_id
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Multiple prepared gifts exist for at least one UUID event context; resolve them manually before applying this migration';
  end if;

  if exists (
    select 1
    from public.gifts
    where lifecycle in ('selected', 'purchased')
      and event_context_key is not null
    group by user_id, person_id, event_context_key
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Multiple prepared gifts exist for at least one synthetic event context; resolve them manually before applying this migration';
  end if;
end
$$;

drop index public.gifts_active_identity_uidx;

create unique index gifts_active_identity_uidx
  on public.gifts (
    user_id,
    person_id,
    (coalesce(event_id::text, event_context_key, '')),
    normalized_title
  )
  where lifecycle <> 'given';

create index gifts_event_context_key_idx
  on public.gifts (user_id, event_context_key)
  where event_context_key is not null;

create unique index gifts_one_prepared_uuid_event_uidx
  on public.gifts (user_id, person_id, event_id)
  where event_id is not null
    and lifecycle in ('selected', 'purchased');

create unique index gifts_one_prepared_synthetic_event_uidx
  on public.gifts (user_id, person_id, event_context_key)
  where event_context_key is not null
    and lifecycle in ('selected', 'purchased');

comment on column public.gifts.event_context_key is
  'Stable occurrence key for generated events that have no public.events UUID, such as birthday-personId:YYYY-MM-DD.';
