-- Durable, validated birthday options. These are task artifacts, never Gifts.
create table public.happy_task_gift_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.happy_tasks(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  description text check (description is null or char_length(btrim(description)) between 1 and 1500),
  reason_sources jsonb not null check (jsonb_typeof(reason_sources) = 'array'),
  status text not null default 'selectable' check (status in ('selectable', 'selected', 'revoked')),
  created_at timestamptz not null default now(),
  unique (task_id, slot)
);

create function public.validate_happy_task_gift_recommendation_references()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.happy_tasks t where t.id = new.task_id and t.user_id = new.user_id and t.type = 'birthday_preparation') then
    raise exception using errcode = '23514', message = 'birthday recommendation must belong to its owner birthday task';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_happy_task_gift_recommendation_references() from public, anon, authenticated;
create trigger happy_task_gift_recommendations_validate_references before insert or update of user_id, task_id on public.happy_task_gift_recommendations for each row execute function public.validate_happy_task_gift_recommendation_references();
create index happy_task_gift_recommendations_user_task_idx on public.happy_task_gift_recommendations (user_id, task_id, created_at);
alter table public.happy_task_gift_recommendations enable row level security;
revoke all on table public.happy_task_gift_recommendations from public, anon, authenticated;
grant select, insert, update on table public.happy_task_gift_recommendations to service_role;
create policy "happy_task_gift_recommendations_select_own" on public.happy_task_gift_recommendations for select to authenticated using ((select auth.uid()) = user_id);

alter table public.happy_task_decisions drop constraint happy_task_decisions_kind_check;
alter table public.happy_task_decisions add constraint happy_task_decisions_kind_check check (kind in ('avoid_gift_theme', 'selected_gift_recommendation'));
create unique index happy_task_decisions_one_active_selected_gift_idx on public.happy_task_decisions (task_id) where kind = 'selected_gift_recommendation' and status = 'active';

create or replace function public.validate_happy_task_decision_references()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_task_type text;
begin
  select task.type into v_task_type from public.happy_tasks task where task.id = new.task_id and task.user_id = new.user_id;
  if not found then raise exception using errcode = '23514', message = 'happy_task_decisions.task_id must belong to happy_task_decisions.user_id'; end if;
  if v_task_type <> 'birthday_preparation' then raise exception using errcode = '23514', message = 'happy_task_decisions currently support birthday_preparation only'; end if;
  if new.kind = 'selected_gift_recommendation' and not exists (select 1 from public.happy_task_gift_recommendations r where r.id::text = new.normalized_value and r.task_id = new.task_id and r.user_id = new.user_id) then
    raise exception using errcode = '23514', message = 'selected gift recommendation must belong to decision task';
  end if;
  return new;
end;
$$;

create function public.select_birthday_gift_recommendation_v1(p_user_id uuid, p_task_id uuid, p_recommendation_id uuid, p_action_id uuid, p_idempotency_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_rec public.happy_task_gift_recommendations%rowtype; v_choose uuid; v_save uuid; v_existing uuid;
begin
  select a.id into v_existing from public.happy_actions a where a.user_id=p_user_id and a.idempotency_key=p_idempotency_key limit 1;
  if v_existing is not null then return v_existing; end if;
  select r.* into v_rec from public.happy_task_gift_recommendations r join public.happy_tasks t on t.id=r.task_id where r.id=p_recommendation_id and r.task_id=p_task_id and r.user_id=p_user_id and r.status='selectable' and t.user_id=p_user_id and t.type='birthday_preparation' and t.status='waiting_user' for update;
  if not found then raise exception using errcode='P0002', message='selectable recommendation not found'; end if;
  select id into v_choose from public.happy_task_steps where task_id=p_task_id and position=4 and type='choose_gift' and status='waiting_user' for update;
  select id into v_save from public.happy_task_steps where task_id=p_task_id and position=5 and type='save_gift' and status='pending' for update;
  if v_choose is null or v_save is null then raise exception using errcode='23514', message='task is not at birthday choice boundary'; end if;
  if exists (select 1 from public.gifts g join public.happy_tasks t on t.id=p_task_id where g.user_id=p_user_id and g.person_id=t.person_id and (g.event_id=t.event_id or g.event_context_key=t.event_id::text) and g.lifecycle in ('selected','purchased','given')) then raise exception using errcode='23514', message='birthday already has prepared gift'; end if;
  if exists (select 1 from public.happy_actions a where a.user_id=p_user_id and a.task_id=p_task_id and a.step_id=v_save and a.type='save_gift' and a.status='pending') then raise exception using errcode='23514', message='birthday choice already awaits approval'; end if;
  insert into public.happy_task_decisions(user_id,task_id,kind,display_value,normalized_value,status) values(p_user_id,p_task_id,'selected_gift_recommendation',v_rec.title,p_recommendation_id::text,'active');
  update public.happy_task_gift_recommendations set status='selected' where id=p_recommendation_id;
  update public.happy_task_steps set status='completed', completed_at=now() where id=v_choose;
  update public.happy_task_steps set status='waiting_user', started_at=now() where id=v_save;
  insert into public.happy_actions(id,user_id,task_id,step_id,type,payload,status,idempotency_key) values(p_action_id,p_user_id,p_task_id,v_save,'save_gift',jsonb_build_object('personId',(select person_id from public.happy_tasks where id=p_task_id),'eventId',(select event_id from public.happy_tasks where id=p_task_id),'title',v_rec.title),'pending',p_idempotency_key);
  return p_action_id;
end;
$$;

create function public.reconcile_birthday_save_gift_action_v1(p_user_id uuid, p_action_id uuid, p_outcome text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_task uuid; v_step uuid; v_rec uuid;
begin
  select a.task_id,a.step_id into v_task,v_step from public.happy_actions a where a.id=p_action_id and a.user_id=p_user_id and a.type='save_gift' and a.status=p_outcome;
  if not found then return false; end if;
  if p_outcome='completed' then update public.happy_task_steps set status='completed',completed_at=coalesce(completed_at,now()) where id=v_step and status='waiting_user'; update public.happy_tasks set status='active',paused_at=null where id=v_task and status='waiting_user'; return true; end if;
  select id::uuid into v_rec from public.happy_task_decisions where task_id=v_task and kind='selected_gift_recommendation' and status='active' limit 1;
  update public.happy_task_decisions set status='revoked' where task_id=v_task and kind='selected_gift_recommendation' and status='active';
  if v_rec is not null then update public.happy_task_gift_recommendations set status='selectable' where id=v_rec; end if;
  update public.happy_task_steps set status='waiting_user',completed_at=null where task_id=v_task and position=4 and type='choose_gift';
  update public.happy_task_steps set status='pending',started_at=null where id=v_step and status='waiting_user';
  update public.happy_tasks set status='waiting_user' where id=v_task;
  return true;
end;
$$;
revoke all on function public.select_birthday_gift_recommendation_v1(uuid,uuid,uuid,uuid,text), public.reconcile_birthday_save_gift_action_v1(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.select_birthday_gift_recommendation_v1(uuid,uuid,uuid,uuid,text), public.reconcile_birthday_save_gift_action_v1(uuid,uuid,text) to service_role;
