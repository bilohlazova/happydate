-- Durable, task-scoped constraints. These are deliberately separate from
-- happy_actions (approval/execution) and from permanent Person Knowledge.
create table public.happy_task_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.happy_tasks(id) on delete cascade,
  kind text not null,
  display_value text not null,
  normalized_value text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint happy_task_decisions_kind_check
    check (kind in ('avoid_gift_theme')),
  constraint happy_task_decisions_display_value_check
    check (char_length(btrim(display_value)) between 1 and 160),
  constraint happy_task_decisions_normalized_value_check
    check (char_length(btrim(normalized_value)) between 1 and 160),
  constraint happy_task_decisions_status_check
    check (status in ('active', 'revoked')),
  constraint happy_task_decisions_user_task_kind_value_key
    unique (user_id, task_id, kind, normalized_value)
);

-- This remains an integrity boundary for trusted writers (which bypass RLS),
-- and also prevents a duplicated ownership graph from drifting away from task.
create function public.validate_happy_task_decision_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task_type text;
begin
  select task.type
    into v_task_type
  from public.happy_tasks task
  where task.id = new.task_id
    and task.user_id = new.user_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'happy_task_decisions.task_id must belong to happy_task_decisions.user_id';
  end if;

  if v_task_type <> 'birthday_preparation' then
    raise exception using
      errcode = '23514',
      message = 'happy_task_decisions currently support birthday_preparation only';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_happy_task_decision_references()
  from public, anon, authenticated;

create trigger happy_task_decisions_validate_references
before insert or update of user_id, task_id, kind on public.happy_task_decisions
for each row execute function public.validate_happy_task_decision_references();

create trigger happy_task_decisions_set_updated_at
before update on public.happy_task_decisions
for each row execute function public.set_updated_at();

create index happy_task_decisions_user_task_active_idx
  on public.happy_task_decisions (user_id, task_id, created_at asc)
  where status = 'active';

alter table public.happy_task_decisions enable row level security;

-- Decisions are written through the narrow trusted server boundary. Browser
-- users can observe only their own rows, never manufacture task state directly.
revoke all on table public.happy_task_decisions from public, anon, authenticated;
grant select on table public.happy_task_decisions to authenticated;
grant select, insert, update on table public.happy_task_decisions to service_role;

create policy "happy_task_decisions_select_own"
on public.happy_task_decisions for select to authenticated
using ((select auth.uid()) = user_id);

comment on table public.happy_task_decisions is
  'Durable user decisions scoped to one Happy task; never permanent Person Knowledge or approval actions.';
