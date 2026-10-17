-- Home must be able to hide the current semantic checkpoint using the same
-- durable quiet row.  Keep writes trusted-only; expose only owner-scoped reads.
grant select on table public.happy_proactive_quiet to authenticated;

create policy "happy_proactive_quiet_select_own"
on public.happy_proactive_quiet for select to authenticated
using ((select auth.uid()) = user_id);
