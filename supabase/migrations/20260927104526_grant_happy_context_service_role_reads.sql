-- Remove any bootstrap/default capability first. Trusted server code needs
-- no mutation privilege for Happy tables other than Idea response updates.
revoke all privileges on table
  public.happy_tasks,
  public.happy_task_steps,
  public.happy_ideas,
  public.happy_actions,
  public.happy_notifications
from service_role;

-- Trusted server code uses service_role for ownership-scoped context reads.
-- Keep browser roles unchanged; this is an explicit backend-only ACL.
grant select on table public.people, public.events, public.memories, public.gifts,
  public.happy_tasks, public.happy_ideas, public.happy_actions
to service_role;

-- The existing server-only Happy Idea response boundary conditionally updates
-- owned rows after authenticating the caller. This preserves the intended
-- server flow without granting any browser write privileges.
grant update on table public.happy_ideas to service_role;
