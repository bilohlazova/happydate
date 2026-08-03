
alter table public.people
  drop constraint if exists people_contact_source_check;

alter table public.people
  add constraint people_contact_source_check
  check (contact_source in ('manual', 'contacts', 'qr', 'link', 'invite', 'card'));
;
