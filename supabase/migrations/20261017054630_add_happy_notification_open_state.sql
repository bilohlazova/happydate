alter table public.happy_notifications
  add column opened_at timestamptz;

-- Browser clients remain read-only. The authenticated server boundary updates
-- only durable inbox state after verifying the owner.
grant select on table public.happy_notifications to service_role;
grant update (read_at, opened_at) on table public.happy_notifications to service_role;
