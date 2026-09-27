-- System-generated Happy proposals. Client users can only read their own
-- ideas; trusted backend flows will own every lifecycle transition.

create table public.happy_ideas (
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
  message text not null,

  reason jsonb,
  evidence jsonb,

  status text not null default 'new',

  expires_at timestamptz,

  created_at timestamptz not null default now(),
  responded_at timestamptz,

  constraint happy_ideas_type_check
    check (char_length(btrim(type)) between 1 and 80),
  constraint happy_ideas_title_check
    check (char_length(btrim(title)) between 1 and 300),
  constraint happy_ideas_message_check
    check (char_length(btrim(message)) between 1 and 4000),
  constraint happy_ideas_status_check
    check (status in ('new', 'shown', 'accepted', 'dismissed', 'expired')),
  constraint happy_ideas_reason_object_check
    check (reason is null or jsonb_typeof(reason) = 'object'),
  constraint happy_ideas_evidence_array_check
    check (evidence is null or jsonb_typeof(evidence) = 'array')
);

-- RLS does not apply to service_role. Validate owner/reference alignment in a
-- row trigger so every authorized writer, including privileged backend code,
-- receives the same integrity guarantee.
create function public.validate_happy_idea_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.person_id is not null and not exists (
    select 1
    from public.people p
    where p.id = new.person_id
      and p.user_id = new.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'happy_ideas.person_id must belong to happy_ideas.user_id';
  end if;

  if new.event_id is not null and not exists (
    select 1
    from public.events e
    where e.id = new.event_id
      and e.user_id = new.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'happy_ideas.event_id must belong to happy_ideas.user_id';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_happy_idea_references()
  from public, anon, authenticated;

create trigger happy_ideas_validate_references
before insert or update of user_id, person_id, event_id on public.happy_ideas
for each row execute function public.validate_happy_idea_references();

create index happy_ideas_user_status_created_at_idx
  on public.happy_ideas (user_id, status, created_at desc);

create index happy_ideas_user_person_status_idx
  on public.happy_ideas (user_id, person_id, status)
  where person_id is not null;

create index happy_ideas_user_event_status_idx
  on public.happy_ideas (user_id, event_id, status)
  where event_id is not null;

alter table public.happy_ideas enable row level security;

-- Ideas are system-generated. Authenticated clients can observe only their
-- own rows and cannot manufacture or transition ideas directly.
revoke all on table public.happy_ideas from public, anon, authenticated;
grant select on table public.happy_ideas to authenticated;

create policy "happy_ideas_select_own"
on public.happy_ideas for select to authenticated
using ((select auth.uid()) = user_id);

comment on table public.happy_ideas is
  'System-generated Happy proposals awaiting a trusted backend lifecycle decision.';
