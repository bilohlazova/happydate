alter table public.events
  add column if not exists location text;

alter table public.events
  drop constraint if exists events_location_length_check;

alter table public.events
  add constraint events_location_length_check
  check (location is null or char_length(location) between 1 and 300);

comment on column public.events.location is
  'Optional user-entered human-readable event location. Null means no location is known; maximum 300 characters.';
