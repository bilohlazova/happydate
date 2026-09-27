-- Ordered durable execution steps inherit ownership from their parent task.
-- A step deliberately stores no user_id, so task ownership cannot diverge.

create table public.happy_task_steps (
  id uuid primary key default gen_random_uuid(),

  task_id uuid not null
    references public.happy_tasks(id)
    on delete cascade,

  position integer not null,

  type text not null,
  title text not null,

  status text not null default 'pending',

  requires_approval boolean not null default false,

  input jsonb,
  result jsonb,

  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint happy_task_steps_position_check
    check (position >= 1),
  constraint happy_task_steps_type_check
    check (char_length(btrim(type)) between 1 and 80),
  constraint happy_task_steps_title_check
    check (char_length(btrim(title)) between 1 and 300),
  constraint happy_task_steps_status_check
    check (status in ('pending', 'active', 'waiting_user', 'completed', 'skipped', 'failed', 'cancelled')),
  constraint happy_task_steps_task_position_key
    unique (task_id, position)
);

alter table public.happy_task_steps enable row level security;

-- Explicit API ACL: step deletion is server-side/administrative only.
revoke all on table public.happy_task_steps from public, anon, authenticated;
grant select, insert, update on table public.happy_task_steps to authenticated;

create policy "happy_task_steps_select_own"
on public.happy_task_steps for select to authenticated
using (
  exists (
    select 1
    from public.happy_tasks t
    where t.id = task_id
      and t.user_id = (select auth.uid())
  )
);

create policy "happy_task_steps_insert_own"
on public.happy_task_steps for insert to authenticated
with check (
  exists (
    select 1
    from public.happy_tasks t
    where t.id = task_id
      and t.user_id = (select auth.uid())
  )
);

create policy "happy_task_steps_update_own"
on public.happy_task_steps for update to authenticated
using (
  exists (
    select 1
    from public.happy_tasks t
    where t.id = task_id
      and t.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.happy_tasks t
    where t.id = task_id
      and t.user_id = (select auth.uid())
  )
);

comment on table public.happy_task_steps is
  'Ordered durable execution steps for Happy Agent tasks.';
