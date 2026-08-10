alter table public.gift_links
  add column is_preferred boolean not null default false,
  add column decision_note text,
  add constraint gift_links_preferred_requires_gift_check
    check (not is_preferred or gift_id is not null),
  add constraint gift_links_decision_note_check
    check (
      decision_note is null
      or (is_preferred and char_length(btrim(decision_note)) between 1 and 500)
    );

create unique index gift_links_one_preferred_per_gift_uidx
  on public.gift_links (gift_id)
  where gift_id is not null and is_preferred;

create function public.ensure_single_preferred_gift_link()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.gift_id is null or not new.is_preferred then
    new.is_preferred := false;
    new.decision_note := null;
    return new;
  end if;

  update public.gift_links
  set is_preferred = false,
      decision_note = null
  where gift_id = new.gift_id
    and user_id = new.user_id
    and id <> new.id
    and is_preferred;

  return new;
end;
$$;

revoke all on function public.ensure_single_preferred_gift_link()
  from public, anon, authenticated;

create trigger gift_links_keep_one_preferred
before insert or update of gift_id, is_preferred, decision_note
on public.gift_links
for each row execute function public.ensure_single_preferred_gift_link();

comment on column public.gift_links.is_preferred is
  'At most one user-selected shortlist option per canonical Gift.';
comment on column public.gift_links.decision_note is
  'Optional user-authored reason attached only to the preferred option.';
