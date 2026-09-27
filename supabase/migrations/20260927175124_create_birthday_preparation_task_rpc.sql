create unique index happy_tasks_active_birthday_preparation_unique
on public.happy_tasks (user_id, type, person_id, event_id)
where type = 'birthday_preparation' and status in ('active', 'waiting_user', 'paused');

create function public.create_birthday_preparation_task_v1(p_user_id uuid, p_person_id uuid, p_event_id uuid)
returns table(task_id uuid, reused boolean, task_status text, context_snapshot jsonb, durable_steps jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_task_id uuid; v_name text;
begin
  select p.name into v_name from public.people p where p.id=p_person_id and p.user_id=p_user_id;
  if not found then raise exception using errcode='P0002', message='happy task person not found'; end if;
  if not exists (select 1 from public.events e where e.id=p_event_id and e.user_id=p_user_id) then raise exception using errcode='P0002', message='happy task event not found'; end if;
  if not exists (select 1 from public.events e where e.id=p_event_id and e.user_id=p_user_id and e.person_id=p_person_id and e.category='birthday') then raise exception using errcode='23514', message='birthday task target invalid'; end if;
  select t.id into v_task_id from public.happy_tasks t where t.user_id=p_user_id and t.type='birthday_preparation' and t.person_id=p_person_id and t.event_id=p_event_id and t.status in ('active','waiting_user','paused');
  if found then
    return query
    select t.id, true, t.status, t.context_snapshot,
      (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'position', s.position, 'type', s.type, 'status', s.status, 'requiresApproval', s.requires_approval) order by s.position), '[]'::jsonb) from public.happy_task_steps s where s.task_id = t.id)
    from public.happy_tasks t where t.id = v_task_id;
    return;
  end if;
  begin
    insert into public.happy_tasks(user_id,person_id,event_id,type,title,status,source,context_snapshot)
    values(p_user_id,p_person_id,p_event_id,'birthday_preparation','Birthday preparation: ' || v_name,'active','task_engine','{"templateVersion":1}'::jsonb) returning id into v_task_id;
  exception when unique_violation then
    select t.id into v_task_id from public.happy_tasks t where t.user_id=p_user_id and t.type='birthday_preparation' and t.person_id=p_person_id and t.event_id=p_event_id and t.status in ('active','waiting_user','paused');
    if not found then raise; end if;
    return query
    select t.id, true, t.status, t.context_snapshot,
      (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'position', s.position, 'type', s.type, 'status', s.status, 'requiresApproval', s.requires_approval) order by s.position), '[]'::jsonb) from public.happy_task_steps s where s.task_id = t.id)
    from public.happy_tasks t where t.id = v_task_id;
    return;
  end;
  insert into public.happy_task_steps(task_id,position,type,title,requires_approval) values
  (v_task_id,1,'analyze_context','Review person context',false),(v_task_id,2,'analyze_gifts','Review previous gifts',false),(v_task_id,3,'generate_gift_ideas','Generate gift ideas',false),(v_task_id,4,'choose_gift','Choose a gift',false),(v_task_id,5,'save_gift','Save selected gift',true),(v_task_id,6,'prepare_greeting','Prepare greeting',false);
  return query
  select t.id, false, t.status, t.context_snapshot,
    (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'position', s.position, 'type', s.type, 'status', s.status, 'requiresApproval', s.requires_approval) order by s.position), '[]'::jsonb) from public.happy_task_steps s where s.task_id = t.id)
  from public.happy_tasks t where t.id = v_task_id;
end $$;
revoke all on function public.create_birthday_preparation_task_v1(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_birthday_preparation_task_v1(uuid,uuid,uuid) to service_role;
