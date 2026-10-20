-- Block 44: narrow durable controls for deterministic proactive signals.
create table public.happy_proactivity_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'balanced',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint happy_proactivity_preferences_mode_check check (mode in ('minimal', 'balanced', 'active'))
);

create table public.happy_proactive_quiet (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiet_key text not null,
  disposition text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quiet_key),
  constraint happy_proactive_quiet_key_check check (char_length(btrim(quiet_key)) between 1 and 255),
  constraint happy_proactive_quiet_disposition_check check (disposition in ('later', 'dismissed'))
);

create index happy_proactive_quiet_key_idx on public.happy_proactive_quiet (quiet_key);

alter table public.happy_proactivity_preferences enable row level security;
alter table public.happy_proactive_quiet enable row level security;

create policy "happy_proactivity_preferences_select_own"
on public.happy_proactivity_preferences for select to authenticated
using ((select auth.uid()) = user_id);
create policy "happy_proactivity_preferences_insert_own"
on public.happy_proactivity_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "happy_proactivity_preferences_update_own"
on public.happy_proactivity_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.happy_proactivity_preferences from anon, authenticated, public;
grant select, insert, update on table public.happy_proactivity_preferences to authenticated;
grant select, insert, update on table public.happy_proactivity_preferences to service_role;
revoke all on table public.happy_proactive_quiet from anon, authenticated, public;
grant select, insert, update on table public.happy_proactive_quiet to service_role;
