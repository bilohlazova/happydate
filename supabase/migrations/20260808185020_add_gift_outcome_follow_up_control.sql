alter table public.gifts
  add column recipient_reaction_follow_up_snoozed_until timestamptz,
  add column recipient_reaction_follow_up_dismissed_at timestamptz,
  add constraint gifts_reaction_follow_up_state_check
    check (
      not (
        recipient_reaction_follow_up_snoozed_until is not null
        and recipient_reaction_follow_up_dismissed_at is not null
      )
      and (
        (
          recipient_reaction_follow_up_snoozed_until is null
          and recipient_reaction_follow_up_dismissed_at is null
        )
        or (lifecycle = 'given' and recipient_reaction is null)
      )
    );

create index gifts_pending_reaction_follow_up_idx
  on public.gifts (user_id, occurred_on desc, created_at desc)
  where lifecycle = 'given'
    and recipient_reaction is null
    and recipient_reaction_follow_up_dismissed_at is null;

comment on column public.gifts.recipient_reaction_follow_up_snoozed_until is
  'User-controlled next display time for a pending explicit Gift reaction question; never recipient feedback.';
comment on column public.gifts.recipient_reaction_follow_up_dismissed_at is
  'User-controlled permanent dismissal of a Gift reaction question; never recipient feedback.';

create or replace function public.confirm_explicit_gift_outcome()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.recipient_reaction is distinct from old.recipient_reaction
     or new.recipient_reaction_note is distinct from old.recipient_reaction_note then
    if new.recipient_reaction is null then
      new.recipient_reaction_note := null;
      new.recipient_reaction_confirmed_at := null;
      new.recipient_reaction_learning_enabled := true;
    elsif new.lifecycle <> 'given' then
      raise exception using
        errcode = '23514',
        message = 'Gift outcome can only be confirmed after the Gift is given';
    else
      new.recipient_reaction_note := nullif(btrim(new.recipient_reaction_note), '');
      new.recipient_reaction_confirmed_at := now();
    end if;
  elsif new.recipient_reaction_confirmed_at is distinct from old.recipient_reaction_confirmed_at then
    raise exception using
      errcode = '23514',
      message = 'Gift outcome confirmation time is managed by HappyDate';
  end if;

  if new.recipient_reaction_learning_enabled is distinct from old.recipient_reaction_learning_enabled
     and new.recipient_reaction is null then
    raise exception using
      errcode = '23514',
      message = 'Only a confirmed Gift outcome can be included in or excluded from learning';
  end if;

  if new.lifecycle <> 'given' or new.recipient_reaction is not null then
    new.recipient_reaction_follow_up_snoozed_until := null;
    new.recipient_reaction_follow_up_dismissed_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.confirm_explicit_gift_outcome()
  from public, anon, authenticated;

drop trigger gifts_confirm_explicit_outcome on public.gifts;
create trigger gifts_confirm_explicit_outcome
before update of lifecycle, recipient_reaction, recipient_reaction_note,
  recipient_reaction_confirmed_at, recipient_reaction_learning_enabled,
  recipient_reaction_follow_up_snoozed_until,
  recipient_reaction_follow_up_dismissed_at
on public.gifts
for each row execute function public.confirm_explicit_gift_outcome();
