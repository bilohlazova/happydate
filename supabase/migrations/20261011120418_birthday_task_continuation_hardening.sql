-- Birthday Task continuation owns factual task/step progression. Browser
-- clients keep read access but cannot forge workflow transitions.
revoke update on table public.happy_tasks from authenticated;
revoke update on table public.happy_task_steps from authenticated;

grant select, update on table public.happy_tasks to service_role;
grant select, update on table public.happy_task_steps to service_role;

create function public.complete_birthday_gift_generation_v1(
  p_task_id uuid,
  p_generate_step_id uuid,
  p_choose_step_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.happy_tasks task
    where task.id = p_task_id
      and task.type = 'birthday_preparation'
      and task.status = 'active'
      and task.context_snapshot = '{"templateVersion":1}'::jsonb
  ) or not exists (
    select 1 from public.happy_task_steps step
    where step.id = p_generate_step_id and step.task_id = p_task_id
      and step.position = 3 and step.type = 'generate_gift_ideas' and step.status = 'active'
  ) or not exists (
    select 1 from public.happy_task_steps step
    where step.id = p_choose_step_id and step.task_id = p_task_id
      and step.position = 4 and step.type = 'choose_gift' and step.status = 'pending'
  ) then
    return false;
  end if;

  update public.happy_task_steps
  set status = 'completed', completed_at = now()
  where id = p_generate_step_id and task_id = p_task_id and status = 'active';
  update public.happy_task_steps
  set status = 'waiting_user'
  where id = p_choose_step_id and task_id = p_task_id and status = 'pending';
  update public.happy_tasks
  set status = 'waiting_user'
  where id = p_task_id and status = 'active';
  return true;
end;
$$;

revoke all on function public.complete_birthday_gift_generation_v1(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_birthday_gift_generation_v1(uuid, uuid, uuid) to service_role;
