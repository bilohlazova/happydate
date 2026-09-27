create table public.happy_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid references public.people(id) on delete cascade, event_id uuid references public.events(id) on delete cascade, task_id uuid references public.happy_tasks(id) on delete cascade,
 type text not null, title text not null, message text, priority text not null default 'normal', dedupe_key text,
 read_at timestamptz, dismissed_at timestamptz, created_at timestamptz not null default now(),
 constraint happy_notifications_type_check check(char_length(btrim(type)) between 1 and 80),
 constraint happy_notifications_title_check check(char_length(btrim(title)) between 1 and 300),
 constraint happy_notifications_message_check check(message is null or char_length(btrim(message)) between 1 and 4000),
 constraint happy_notifications_priority_check check(priority in ('silent','normal','important')),
 constraint happy_notifications_dedupe_key_check check(dedupe_key is null or char_length(btrim(dedupe_key)) between 1 and 255),
 constraint happy_notifications_user_dedupe_key_key unique(user_id,dedupe_key)
);
create function public.validate_happy_notification_references() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.person_id is not null and not exists(select 1 from public.people p where p.id=new.person_id and p.user_id=new.user_id) then raise exception using errcode='23514',message='notification person owner mismatch'; end if;
 if new.event_id is not null and not exists(select 1 from public.events e where e.id=new.event_id and e.user_id=new.user_id) then raise exception using errcode='23514',message='notification event owner mismatch'; end if;
 if new.task_id is not null and not exists(select 1 from public.happy_tasks t where t.id=new.task_id and t.user_id=new.user_id) then raise exception using errcode='23514',message='notification task owner mismatch'; end if; return new; end; $$;
revoke all on function public.validate_happy_notification_references() from public,anon,authenticated;
create trigger happy_notifications_validate_references before insert or update of user_id,person_id,event_id,task_id on public.happy_notifications for each row execute function public.validate_happy_notification_references();
create index happy_notifications_user_active_created_at_idx on public.happy_notifications(user_id,created_at desc) where dismissed_at is null;
create index happy_notifications_user_unread_created_at_idx on public.happy_notifications(user_id,created_at desc) where read_at is null and dismissed_at is null;
create index happy_notifications_user_task_created_at_idx on public.happy_notifications(user_id,task_id,created_at desc) where task_id is not null;
alter table public.happy_notifications enable row level security;
revoke all on table public.happy_notifications from public,anon,authenticated;
grant select on table public.happy_notifications to authenticated;
create policy "happy_notifications_select_own" on public.happy_notifications for select to authenticated using((select auth.uid())=user_id);
comment on table public.happy_notifications is 'Durable in-app Happy signals created by trusted backend flows.';
