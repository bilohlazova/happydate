-- Persistent, occurrence-scoped Reminder lifecycle.
-- Delivery attempts and device tokens intentionally remain separate concerns.

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  occurrence_date date not null,
  action_kind text not null default 'congratulate',
  state text not null default 'pending',
  next_remind_at timestamptz,
  snoozed_until timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_action_kind_check
    check (action_kind in ('congratulate', 'prepare', 'follow_up')),
  constraint reminders_state_check
    check (state in ('pending', 'snoozed', 'completed', 'cancelled')),
  constraint reminders_state_timestamps_check
    check (
      (state = 'pending' and snoozed_until is null and completed_at is null and cancelled_at is null)
      or (
        state = 'snoozed'
        and snoozed_until is not null
        and next_remind_at = snoozed_until
        and completed_at is null
        and cancelled_at is null
      )
      or (
        state = 'completed'
        and next_remind_at is null
        and snoozed_until is null
        and completed_at is not null
        and cancelled_at is null
      )
      or (
        state = 'cancelled'
        and next_remind_at is null
        and snoozed_until is null
        and completed_at is null
        and cancelled_at is not null
      )
    ),
  constraint reminders_occurrence_action_unique
    unique (user_id, event_id, occurrence_date, action_kind)
);

create index reminders_event_id_idx on public.reminders (event_id);
create index reminders_user_active_due_idx
  on public.reminders (user_id, next_remind_at)
  where state in ('pending', 'snoozed');

create trigger reminders_set_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;

revoke all on table public.reminders from public, anon, authenticated;
grant select on table public.reminders to authenticated;
grant insert (
  user_id,
  event_id,
  occurrence_date,
  action_kind,
  state,
  next_remind_at,
  snoozed_until,
  completed_at,
  cancelled_at
) on table public.reminders to authenticated;
grant update (
  state,
  next_remind_at,
  snoozed_until,
  completed_at,
  cancelled_at
) on table public.reminders to authenticated;

create policy "reminders_select_own"
on public.reminders for select to authenticated
using ((select auth.uid()) = user_id);

create policy "reminders_insert_own_event"
on public.reminders for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.events event
    where event.id = event_id
      and event.user_id = (select auth.uid())
  )
);

create policy "reminders_update_own_event"
on public.reminders for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.events event
    where event.id = event_id
      and event.user_id = (select auth.uid())
  )
);
