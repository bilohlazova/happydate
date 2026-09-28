-- A task may be event-related without being globally event-required. When an
-- event has a person context, however, the task must use that exact owned
-- person. This is enforced for trusted writers as well as RLS callers.
create function public.validate_happy_task_event_person_consistency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_person_id uuid;
begin
  if new.person_id is not null and not exists (
    select 1
    from public.people person
    where person.id = new.person_id
      and person.user_id = new.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'happy_tasks.person_id must belong to happy_tasks.user_id';
  end if;

  if new.event_id is not null then
    select event.person_id
      into v_event_person_id
    from public.events event
    where event.id = new.event_id
      and event.user_id = new.user_id;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'happy_tasks.event_id must belong to happy_tasks.user_id';
    end if;

    if v_event_person_id is not null
      and new.person_id is distinct from v_event_person_id then
      raise exception using
        errcode = '23514',
        message = 'happy_tasks.person_id must match happy_tasks.event_id person context';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_happy_task_event_person_consistency()
  from public, anon, authenticated;

create trigger happy_tasks_validate_event_person_consistency
before insert or update of user_id, person_id, event_id on public.happy_tasks
for each row execute function public.validate_happy_task_event_person_consistency();
