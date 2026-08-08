alter table public.events
  add column if not exists recurrence_rule text not null default 'none';

alter table public.events
  drop constraint if exists events_recurrence_rule_check;

alter table public.events
  add constraint events_recurrence_rule_check
  check (recurrence_rule in ('none', 'weekly', 'monthly', 'yearly'));

comment on column public.events.recurrence_rule is
  'Date-only recurrence rule. The stored event date is the immutable series anchor.';

grant select, insert, update, delete on table public.events to authenticated;
