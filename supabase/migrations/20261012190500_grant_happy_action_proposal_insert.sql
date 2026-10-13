-- Memory proposals are trusted server-created pending actions. Browser roles
-- remain read-only; the existing owner-validation trigger still guards links.
grant insert on table public.happy_actions to service_role;
