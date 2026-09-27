create table public.happy_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.happy_tasks(id) on delete cascade,
  step_id uuid references public.happy_task_steps(id) on delete cascade,
  type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  idempotency_key text,
  approved_at timestamptz,
  rejected_at timestamptz,
  executed_at timestamptz,
  result jsonb,
  created_at timestamptz not null default now(),
  constraint happy_actions_step_requires_task_check check (step_id is null or task_id is not null),
  constraint happy_actions_type_check check (char_length(btrim(type)) between 1 and 80),
  constraint happy_actions_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint happy_actions_status_check check (status in ('pending','approved','rejected','executing','completed','failed','cancelled')),
  constraint happy_actions_response_timestamps_check check (not (approved_at is not null and rejected_at is not null)),
  constraint happy_actions_idempotency_key_check check (idempotency_key is null or char_length(btrim(idempotency_key)) between 1 and 255),
  constraint happy_actions_user_idempotency_key_key unique (user_id, idempotency_key)
);

create function public.validate_happy_action_references()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.task_id is not null and not exists (select 1 from public.happy_tasks t where t.id = new.task_id and t.user_id = new.user_id) then
    raise exception using errcode = '23514', message = 'happy_actions.task_id must belong to happy_actions.user_id';
  end if;
  if new.step_id is not null and not exists (
    select 1 from public.happy_task_steps s join public.happy_tasks t on t.id = s.task_id
    where s.id = new.step_id and s.task_id = new.task_id and t.user_id = new.user_id
  ) then
    raise exception using errcode = '23514', message = 'happy_actions.step_id must belong to happy_actions.task_id and user_id';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_happy_action_references() from public, anon, authenticated;
create trigger happy_actions_validate_references before insert or update of user_id, task_id, step_id on public.happy_actions for each row execute function public.validate_happy_action_references();

create index happy_actions_user_status_created_at_idx on public.happy_actions (user_id, status, created_at desc);
create index happy_actions_user_task_created_at_idx on public.happy_actions (user_id, task_id, created_at desc) where task_id is not null;
create index happy_actions_user_step_created_at_idx on public.happy_actions (user_id, step_id, created_at desc) where step_id is not null;
alter table public.happy_actions enable row level security;
revoke all on table public.happy_actions from public, anon, authenticated;
grant select on table public.happy_actions to authenticated;
create policy "happy_actions_select_own" on public.happy_actions for select to authenticated using ((select auth.uid()) = user_id);
comment on table public.happy_actions is 'Durable approval and execution records for trusted Happy Agent writes.';
