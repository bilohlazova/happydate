alter table public.profiles
  add column gift_outcome_learning_enabled boolean not null default true;

revoke update on table public.profiles from authenticated;
grant update (
  full_name,
  phone,
  preferences,
  avatar_url,
  preferred_locale,
  gift_outcome_learning_enabled
) on table public.profiles to authenticated;

comment on column public.profiles.gift_outcome_learning_enabled is
  'User-controlled consent for using explicit gift outcomes in future recommendations.';

create function private.invalidate_ai_gift_cache_for_outcome_learning()
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
     or old.recipient_reaction_note is distinct from new.recipient_reaction_note then
    delete from public.ai_gift_cache where person_id = new.person_id;
  end if;
  return new;
end;
$$;

revoke all on function private.invalidate_ai_gift_cache_for_outcome_learning()
  from public, anon, authenticated;

create trigger profiles_invalidate_gift_outcome_learning_cache
after update of gift_outcome_learning_enabled on public.profiles
for each row execute function private.invalidate_ai_gift_cache_for_outcome_learning();

create trigger gifts_invalidate_outcome_learning_cache
after update of recipient_reaction, recipient_reaction_note on public.gifts
for each row execute function private.invalidate_ai_gift_cache_for_outcome_learning();
