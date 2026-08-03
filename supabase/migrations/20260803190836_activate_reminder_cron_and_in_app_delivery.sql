create extension if not exists pg_cron with schema pg_catalog;

create function public.consume_my_in_app_deliveries(p_limit integer default 20)
returns table (
  delivery_id uuid,
  reminder_id uuid,
  scheduled_for timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_limit < 1 or p_limit > 50 then
    raise exception 'p_limit must be between 1 and 50' using errcode = '22023';
  end if;

  return query
  with claimed as (
    select delivery.id
    from public.reminder_deliveries delivery
    where delivery.user_id = current_user_id
      and delivery.channel = 'in_app'
      and delivery.status = 'queued'
    order by delivery.scheduled_for, delivery.id
    for update skip locked
    limit p_limit
  )
  update public.reminder_deliveries delivery
  set status = 'sent',
      attempt_count = delivery.attempt_count + 1,
      sent_at = statement_timestamp(),
      failed_at = null,
      error_code = null
  from claimed
  where delivery.id = claimed.id
  returning delivery.id, delivery.reminder_id, delivery.scheduled_for;
end;
$function$;

revoke all on function public.consume_my_in_app_deliveries(integer)
  from public, anon, authenticated;
grant execute on function public.consume_my_in_app_deliveries(integer)
  to authenticated;

do $block$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'happydate-queue-reminder-deliveries'
  ) then
    perform cron.schedule(
      'happydate-queue-reminder-deliveries',
      '* * * * *',
      $cron$select private.queue_due_reminder_deliveries(statement_timestamp(), 100);$cron$
    );
  end if;
end;
$block$;
