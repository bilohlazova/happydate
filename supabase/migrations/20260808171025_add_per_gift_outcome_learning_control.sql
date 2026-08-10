alter table public.gifts
  add column recipient_reaction_learning_enabled boolean not null default true,
  add constraint gifts_reaction_learning_requires_outcome_check
    check (recipient_reaction is not null or recipient_reaction_learning_enabled);

comment on column public.gifts.recipient_reaction_learning_enabled is
  'User-controlled inclusion of this explicit outcome in future recommendation and conversation learning.';

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

  return new;
end;
$$;

revoke all on function public.confirm_explicit_gift_outcome()
  from public, anon, authenticated;

create or replace function private.invalidate_ai_gift_cache_for_outcome_learning()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'profiles' then
    if old.gift_outcome_learning_enabled is distinct from new.gift_outcome_learning_enabled then
      delete from public.ai_gift_cache cache
      using public.people person
      where cache.person_id = person.id
        and person.user_id = new.id;
    end if;
    return new;
  end if;

  if old.recipient_reaction is distinct from new.recipient_reaction
     or old.recipient_reaction_note is distinct from new.recipient_reaction_note
     or old.recipient_reaction_learning_enabled is distinct from new.recipient_reaction_learning_enabled then
    delete from public.ai_gift_cache where person_id = new.person_id;
  end if;
  return new;
end;
$$;

revoke all on function private.invalidate_ai_gift_cache_for_outcome_learning()
  from public, anon, authenticated;

drop trigger gifts_confirm_explicit_outcome on public.gifts;
create trigger gifts_confirm_explicit_outcome
before update of lifecycle, recipient_reaction, recipient_reaction_note,
  recipient_reaction_confirmed_at, recipient_reaction_learning_enabled
on public.gifts
for each row execute function public.confirm_explicit_gift_outcome();

drop trigger gifts_invalidate_outcome_learning_cache on public.gifts;
create trigger gifts_invalidate_outcome_learning_cache
after update of recipient_reaction, recipient_reaction_note,
  recipient_reaction_learning_enabled on public.gifts
for each row execute function private.invalidate_ai_gift_cache_for_outcome_learning();
