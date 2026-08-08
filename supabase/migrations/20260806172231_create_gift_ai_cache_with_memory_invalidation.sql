create table public.ai_gift_cache (
  person_id uuid not null references public.people(id) on delete cascade,
  occasion text not null,
  ideas jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint ai_gift_cache_pkey primary key (person_id, occasion),
  constraint ai_gift_cache_occasion_not_empty check (char_length(btrim(occasion)) > 0),
  constraint ai_gift_cache_expiry_after_creation check (expires_at > created_at)
);

alter table public.ai_gift_cache enable row level security;

revoke all on table public.ai_gift_cache from anon, authenticated;
grant select, insert, update, delete on table public.ai_gift_cache to service_role;

create index ai_gift_cache_expires_at_idx
  on public.ai_gift_cache (expires_at);

comment on table public.ai_gift_cache is
  'Short-lived server-only cache of AI gift recommendations. Canonical knowledge remains in public.memories.';

create function private.invalidate_ai_gift_cache_for_memory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.person_id is not null then
      delete from public.ai_gift_cache where person_id = old.person_id;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.person_id is distinct from new.person_id
     and old.person_id is not null then
    delete from public.ai_gift_cache where person_id = old.person_id;
  end if;

  if new.person_id is not null then
    delete from public.ai_gift_cache where person_id = new.person_id;
  end if;

  return new;
end;
$$;

revoke all on function private.invalidate_ai_gift_cache_for_memory() from public;
grant execute on function private.invalidate_ai_gift_cache_for_memory() to service_role;

create trigger memories_invalidate_ai_gift_cache
after insert or update or delete on public.memories
for each row
execute function private.invalidate_ai_gift_cache_for_memory();
