
alter table public.people
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists external_contact_id text,
  add column if not exists contact_source text not null default 'manual';

create index if not exists people_user_phone_idx
  on public.people (user_id, phone)
  where phone is not null;

create index if not exists people_user_email_idx
  on public.people (user_id, email)
  where email is not null;

create index if not exists people_user_external_contact_id_idx
  on public.people (user_id, external_contact_id)
  where external_contact_id is not null;
;
