alter table public.gifts
  add column recipient_reaction text,
  add column recipient_reaction_note text,
  add column recipient_reaction_confirmed_at timestamptz,
  add constraint gifts_recipient_reaction_check
    check (recipient_reaction is null or recipient_reaction in ('liked', 'not_liked', 'unsure')),
  add constraint gifts_recipient_reaction_note_check
    check (
      recipient_reaction_note is null
      or (recipient_reaction is not null and char_length(btrim(recipient_reaction_note)) between 1 and 500)
    ),
  add constraint gifts_recipient_reaction_confirmation_check
    check (
      (recipient_reaction is null and recipient_reaction_confirmed_at is null)
      or (recipient_reaction is not null and recipient_reaction_confirmed_at is not null and lifecycle = 'given')
    );

create function public.confirm_explicit_gift_outcome()
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

  return new;
end;
$$;

revoke all on function public.confirm_explicit_gift_outcome()
  from public, anon, authenticated;

create trigger gifts_confirm_explicit_outcome
before update of lifecycle, recipient_reaction, recipient_reaction_note,
  recipient_reaction_confirmed_at
on public.gifts
for each row execute function public.confirm_explicit_gift_outcome();

comment on column public.gifts.recipient_reaction is
  'Explicit user-confirmed recipient response; never inferred by AI.';
