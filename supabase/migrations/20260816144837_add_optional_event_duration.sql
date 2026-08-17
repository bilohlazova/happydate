alter table public.events
  add column if not exists duration_minutes integer;

alter table public.events
  drop constraint if exists events_duration_minutes_check;

alter table public.events
  add constraint events_duration_minutes_check
  check (duration_minutes is null or duration_minutes between 5 and 1440);

comment on column public.events.duration_minutes is
  'Optional user-confirmed event duration in whole minutes (5 through 1440).';
