-- One canonical occurrence per owned Person, date, and Event category.
-- PostgreSQL keeps rows with nullable source fields distinct, so unrelated
-- legacy events remain outside this identity while PostgREST can infer the
-- index for ON CONFLICT.

create unique index events_user_person_date_category_uidx
  on public.events (user_id, person_id, date, category);
