alter table public.people
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists external_contact_id text,
  add column if not exists contact_source text not null default 'manual',
  add column if not exists gender text not null default 'unspecified',
  add column if not exists relation_label text,
  add column if not exists relation_category text;

create index if not exists people_user_phone_idx
  on public.people (user_id, phone)
  where phone is not null;

create index if not exists people_user_email_idx
  on public.people (user_id, email)
  where email is not null;

create index if not exists people_user_external_contact_id_idx
  on public.people (user_id, external_contact_id)
  where external_contact_id is not null;

alter table public.people
  drop constraint if exists people_contact_source_check;

alter table public.people
  add constraint people_contact_source_check
  check (contact_source in ('manual', 'contacts', 'card', 'link'));

alter table public.people
  drop constraint if exists people_gender_check;

alter table public.people
  add constraint people_gender_check
  check (gender in ('female', 'male', 'other', 'unspecified'));

alter table public.people
  drop constraint if exists people_relation_category_check;

alter table public.people
  add constraint people_relation_category_check
  check (
    relation_category is null
    or relation_category in (
      'partner',
      'close_family',
      'children',
      'friends',
      'work',
      'acquaintances',
      'neighbors',
      'clients',
      'family',
      'other'
    )
  );
