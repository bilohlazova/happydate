-- Persistent, user-owned task state for the Happy Agent. The task record is
-- intentionally independent from chat history and does not expose delete to
-- authenticated clients; terminal state is represented by status instead.

create table public.happy_tasks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  person_id uuid
    references public.people(id)
    on delete cascade,

  event_id uuid
    references public.events(id)
    on delete cascade,

  type text not null,
  title text not null,

  status text not null default 'active',

  source text,

  context_snapshot jsonb not null default '{}'::jsonb,
  result jsonb,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  paused_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint happy_tasks_type_check
    check (char_length(btrim(type)) between 1 and 80),
  constraint happy_tasks_title_check
    check (char_length(btrim(title)) between 1 and 300),
  constraint happy_tasks_status_check
    check (status in ('active', 'waiting_user', 'paused', 'completed', 'cancelled', 'failed')),
  constraint happy_tasks_context_snapshot_object_check
    check (jsonb_typeof(context_snapshot) = 'object')
);

create index happy_tasks_user_status_idx
  on public.happy_tasks (user_id, status);

create index happy_tasks_user_person_idx
  on public.happy_tasks (user_id, person_id);

create index happy_tasks_user_event_idx
  on public.happy_tasks (user_id, event_id);

create trigger happy_tasks_set_updated_at
before update on public.happy_tasks
for each row execute function public.set_updated_at();

alter table public.happy_tasks enable row level security;

-- Explicit API ACL: anon has no access and authenticated clients do not get
-- DELETE, TRUNCATE, REFERENCES, or TRIGGER privileges.
revoke all on table public.happy_tasks from public, anon, authenticated;
grant select, insert, update on table public.happy_tasks to authenticated;

create policy "happy_tasks_select_own"
on public.happy_tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy "happy_tasks_insert_own"
on public.happy_tasks for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    person_id is null
    or exists (
      select 1
      from public.people p
      where p.id = person_id
        and p.user_id = (select auth.uid())
    )
  )
  and (
    event_id is null
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.user_id = (select auth.uid())
    )
  )
);

create policy "happy_tasks_update_own"
on public.happy_tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    person_id is null
    or exists (
      select 1
      from public.people p
      where p.id = person_id
        and p.user_id = (select auth.uid())
    )
  )
  and (
    event_id is null
    or exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.user_id = (select auth.uid())
    )
  )
);

comment on table public.happy_tasks is
  'Persistent user-owned Happy Agent tasks. AI may propose tasks; backend and RLS authorize state changes.';
