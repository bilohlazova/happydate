-- HappyDate core data hardening.
--
-- This migration intentionally does not create legacy/optional product tables.
-- It narrows Data API grants, makes ownership explicit, protects billing and
-- points authority, closes privileged RPC exposure, and aligns Storage and
-- Realtime with the application contracts verified on 2026-08-03.


-- ---------------------------------------------------------------------------
-- Privileged and operational functions
-- ---------------------------------------------------------------------------

alter function public.expire_trials() set search_path = pg_catalog;
revoke all on function public.expire_trials() from public, anon, authenticated;
grant execute on function public.expire_trials() to service_role;

-- This event-trigger function must never be exposed as a Data API RPC.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Data API grants: RLS and grants are separate security layers.
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.people from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.memories from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;

grant select, insert on table public.profiles to authenticated;
grant update (full_name, phone, preferences, avatar_url, preferred_locale)
  on table public.profiles to authenticated;
grant select, insert, update, delete on table public.people to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.memories to authenticated;
grant select on table public.subscriptions to authenticated;

alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.events enable row level security;
alter table public.memories enable row level security;
alter table public.subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles: one owner policy per operation. Points are intentionally excluded
-- from the authenticated UPDATE column grant above.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can insert their profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view their profile" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

drop policy if exists "Users can manage their own people" on public.people;

create policy "people_select_own"
on public.people for select to authenticated
using ((select auth.uid()) = user_id);

create policy "people_insert_own"
on public.people for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "people_update_own"
on public.people for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "people_delete_own"
on public.people for delete to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Events: a linked Person must belong to the same authenticated owner.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can delete own events" on public.events;
drop policy if exists "Users can insert own events" on public.events;
drop policy if exists "Users can update own events" on public.events;
drop policy if exists "Users can view own events" on public.events;

create policy "events_select_own"
on public.events for select to authenticated
using ((select auth.uid()) = user_id);

create policy "events_insert_own"
on public.events for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    person_id is null
    or exists (
      select 1 from public.people p
      where p.id = person_id and p.user_id = (select auth.uid())
    )
  )
);

create policy "events_update_own"
on public.events for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    person_id is null
    or exists (
      select 1 from public.people p
      where p.id = person_id and p.user_id = (select auth.uid())
    )
  )
);

create policy "events_delete_own"
on public.events for delete to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Memories: linked Person and Event ownership must match the row owner.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can delete their memories" on public.memories;
drop policy if exists "Users can insert their memories" on public.memories;
drop policy if exists "Users can update their memories" on public.memories;
drop policy if exists "Users can view their memories" on public.memories;

create policy "memories_select_own"
on public.memories for select to authenticated
using ((select auth.uid()) = user_id);

create policy "memories_insert_own"
on public.memories for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    person_id is null
    or exists (
      select 1 from public.people p
      where p.id = person_id and p.user_id = (select auth.uid())
    )
  )
  and (
    event_id is null
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = (select auth.uid())
    )
  )
);

create policy "memories_update_own"
on public.memories for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    person_id is null
    or exists (
      select 1 from public.people p
      where p.id = person_id and p.user_id = (select auth.uid())
    )
  )
  and (
    event_id is null
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = (select auth.uid())
    )
  )
);

create policy "memories_delete_own"
on public.memories for delete to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Subscriptions: clients may inspect their own status but cannot manufacture
-- or modify billing authority.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can insert their subscription" on public.subscriptions;
drop policy if exists "Users can update their subscription" on public.subscriptions;
drop policy if exists "Users can view their subscription" on public.subscriptions;

create policy "subscriptions_select_own"
on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Storage ownership. Object paths use the canonical user-id/file convention.
-- ---------------------------------------------------------------------------

drop policy if exists "avatars_select_own" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "avatars_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "avatars_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "avatars_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own images" on storage.objects;
drop policy if exists "Users can upload their own images" on storage.objects;
drop policy if exists "Users can view their own images" on storage.objects;

create policy "memory_images_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_images_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_images_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their own audio" on storage.objects;
drop policy if exists "Users can view their own audio" on storage.objects;

create policy "memory_audio_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'memory-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_audio_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'memory-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_audio_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'memory-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'memory-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "memory_audio_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'memory-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ---------------------------------------------------------------------------
-- Cover owner/FK access paths used by RLS and the application.
-- ---------------------------------------------------------------------------

create index if not exists events_person_id_idx
  on public.events (person_id) where person_id is not null;
create index if not exists memories_person_id_idx
  on public.memories (person_id) where person_id is not null;
create index if not exists memories_event_id_idx
  on public.memories (event_id) where event_id is not null;

-- Dashboard subscribes to Postgres Changes for public.events.
do $migration$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.events'::regclass
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end
$migration$;

;
