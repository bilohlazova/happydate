create extension if not exists pg_cron with schema pg_catalog;

do $block$
begin
  if not exists (
    select 1 from cron.job
    where jobname = 'happydate-prune-knowledge-review-interactions'
  ) then
    perform cron.schedule(
      'happydate-prune-knowledge-review-interactions',
      '17 3 * * *',
      $cron$
        delete from public.knowledge_review_interactions
        where created_at < statement_timestamp() - interval '365 days';
      $cron$
    );
  end if;
end;
$block$;

grant select (id, user_id, platform, locale, enabled, last_seen_at, created_at, updated_at)
  on table public.push_devices to authenticated;

create policy "push_devices_select_own_metadata"
on public.push_devices for select to authenticated
using ((select auth.uid()) = user_id);
