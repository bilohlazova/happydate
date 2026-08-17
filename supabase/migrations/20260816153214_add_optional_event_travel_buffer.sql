alter table public.events
  add column if not exists travel_buffer_minutes integer;

alter table public.events
  drop constraint if exists events_travel_buffer_minutes_check;

alter table public.events
  add constraint events_travel_buffer_minutes_check
  check (travel_buffer_minutes is null or travel_buffer_minutes between 5 and 240);

comment on column public.events.travel_buffer_minutes is
  'Optional user-confirmed minutes reserved immediately before an event for travel or preparation. Null means no confirmed buffer.';
