-- Active Gift identity is normalized at the database boundary so concurrent
-- inserts from multiple clients cannot create equivalent ideas.

alter table public.gifts
  add column normalized_title text
  generated always as (
    lower(regexp_replace(btrim(title), '[[:space:]]+', ' ', 'g'))
  ) stored;

do $$
begin
  if exists (
    select 1
    from public.gifts
    where lifecycle <> 'given'
    group by user_id, person_id, event_id, normalized_title
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Existing equivalent active gifts must be reviewed before enabling idempotent persistence';
  end if;
end
$$;

create unique index gifts_active_identity_uidx
  on public.gifts (user_id, person_id, event_id, normalized_title)
  nulls not distinct
  where lifecycle <> 'given';

comment on column public.gifts.normalized_title is
  'Database-generated title identity used only to prevent equivalent active gifts.';
