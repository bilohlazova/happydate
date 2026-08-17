alter table public.events
  add column if not exists time_of_day time without time zone;

comment on column public.events.time_of_day is
  'Optional user-entered local wall-clock time. Interpret it in the owner timezone; null means no specific time.';
