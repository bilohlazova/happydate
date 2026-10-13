-- One recoverable, validated greeting is the final birthday preparation artifact.
create table public.happy_task_greetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null unique references public.happy_tasks(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create function public.validate_happy_task_greeting_references()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.happy_tasks t where t.id=new.task_id and t.user_id=new.user_id and t.type='birthday_preparation') then raise exception using errcode='23514',message='birthday greeting must belong to its owner birthday task'; end if;
 return new;
end; $$;
revoke all on function public.validate_happy_task_greeting_references() from public, anon, authenticated;
create trigger happy_task_greetings_validate_references before insert or update of user_id,task_id on public.happy_task_greetings for each row execute function public.validate_happy_task_greeting_references();
create trigger happy_task_greetings_set_updated_at before update on public.happy_task_greetings for each row execute function public.set_updated_at();
alter table public.happy_task_greetings enable row level security;
revoke all on table public.happy_task_greetings from public, anon, authenticated;
grant select,insert,update on table public.happy_task_greetings to service_role;
create policy "happy_task_greetings_select_own" on public.happy_task_greetings for select to authenticated using ((select auth.uid())=user_id);

create function public.complete_birthday_greeting_v1(p_user_id uuid,p_task_id uuid,p_step_id uuid,p_content text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.happy_tasks t where t.id=p_task_id and t.user_id=p_user_id and t.type='birthday_preparation' and t.status='active') then return false; end if;
 if not exists (select 1 from public.happy_task_steps s where s.id=p_step_id and s.task_id=p_task_id and s.position=6 and s.type='prepare_greeting' and s.status in ('active','pending')) then return false; end if;
 if not exists (select 1 from public.gifts g join public.happy_tasks t on t.id=p_task_id where g.user_id=p_user_id and g.person_id=t.person_id and g.lifecycle='selected') then return false; end if;
 if p_content is not null then insert into public.happy_task_greetings(user_id,task_id,content) values(p_user_id,p_task_id,p_content) on conflict(task_id) do nothing; end if;
 if not exists (select 1 from public.happy_task_greetings where task_id=p_task_id and user_id=p_user_id) then return false; end if;
 update public.happy_task_steps set status='completed',completed_at=coalesce(completed_at,now()) where id=p_step_id and status in ('active','pending');
 update public.happy_tasks set status='completed' where id=p_task_id and status='active';
 return true;
end; $$;
revoke all on function public.complete_birthday_greeting_v1(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.complete_birthday_greeting_v1(uuid,uuid,uuid,text) to service_role;
