-- The trusted executor updates only its owned, persisted action state after
-- a canonical target mutation. Browser roles remain SELECT-only.
grant select, update on table public.happy_actions to service_role;
grant select, insert on table public.gifts to service_role;
