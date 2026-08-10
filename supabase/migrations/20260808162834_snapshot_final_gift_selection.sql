alter table public.gifts
  add column final_source_link_id uuid,
  add column final_link_url text,
  add column final_link_title text,
  add column final_price_amount numeric(12, 2),
  add column final_currency text,
  add column final_decision_note text,
  add column selection_finalized_at timestamptz,
  add constraint gifts_final_link_url_check
    check (
      final_link_url is null
      or (char_length(final_link_url) <= 2048 and lower(final_link_url) ~ '^https://[^[:space:]]+$')
    ),
  add constraint gifts_final_price_check
    check (final_price_amount is null or final_price_amount >= 0),
  add constraint gifts_final_currency_check
    check (final_currency is null or final_currency ~ '^[A-Z]{3}$'),
  add constraint gifts_final_decision_note_check
    check (final_decision_note is null or char_length(final_decision_note) <= 500);

update public.gifts gift
set final_source_link_id = preferred.id,
    final_link_url = preferred.url,
    final_link_title = preferred.title,
    final_price_amount = preferred.price_amount,
    final_currency = preferred.currency,
    final_decision_note = preferred.decision_note,
    selection_finalized_at = coalesce(gift.updated_at, gift.created_at)
from (
  select distinct on (link.gift_id) link.*
  from public.gift_links link
  where link.gift_id is not null and link.is_preferred
  order by link.gift_id, link.updated_at desc
) preferred
where preferred.gift_id = gift.id
  and gift.lifecycle in ('purchased', 'given');

update public.gifts
set selection_finalized_at = coalesce(updated_at, created_at)
where lifecycle in ('purchased', 'given') and selection_finalized_at is null;

create function public.snapshot_final_gift_selection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  preferred record;
begin
  if old.selection_finalized_at is not null and row(
    new.final_source_link_id,
    new.final_link_url,
    new.final_link_title,
    new.final_price_amount,
    new.final_currency,
    new.final_decision_note,
    new.selection_finalized_at
  ) is distinct from row(
    old.final_source_link_id,
    old.final_link_url,
    old.final_link_title,
    old.final_price_amount,
    old.final_currency,
    old.final_decision_note,
    old.selection_finalized_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'Final Gift selection history is immutable';
  end if;

  if old.selection_finalized_at is null
     and new.lifecycle in ('purchased', 'given')
     and old.lifecycle not in ('purchased', 'given') then
    select link.id, link.url, link.title, link.price_amount, link.currency, link.decision_note
    into preferred
    from public.gift_links link
    where link.gift_id = old.id
      and link.user_id = old.user_id
      and link.is_preferred
    limit 1;

    new.final_source_link_id := preferred.id;
    new.final_link_url := preferred.url;
    new.final_link_title := preferred.title;
    new.final_price_amount := preferred.price_amount;
    new.final_currency := preferred.currency;
    new.final_decision_note := preferred.decision_note;
    new.selection_finalized_at := now();
  elsif old.selection_finalized_at is null and (
    new.final_source_link_id is not null
    or new.final_link_url is not null
    or new.final_link_title is not null
    or new.final_price_amount is not null
    or new.final_currency is not null
    or new.final_decision_note is not null
    or new.selection_finalized_at is not null
  ) then
    raise exception using
      errcode = '23514',
      message = 'Final Gift selection can only be created by a lifecycle transition';
  end if;

  return new;
end;
$$;

revoke all on function public.snapshot_final_gift_selection()
  from public, anon, authenticated;

create trigger gifts_snapshot_final_selection
before update of lifecycle, final_source_link_id, final_link_url, final_link_title,
  final_price_amount, final_currency, final_decision_note, selection_finalized_at
on public.gifts
for each row execute function public.snapshot_final_gift_selection();

comment on column public.gifts.selection_finalized_at is
  'Immutable purchase-time snapshot boundary for future recommendation history.';
