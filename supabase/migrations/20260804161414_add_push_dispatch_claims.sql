alter table public.reminder_deliveries
  add column next_attempt_at timestamptz,
  add column provider_message_id text;

create index reminder_deliveries_push_dispatch_idx
  on public.reminder_deliveries (coalesce(next_attempt_at, created_at), created_at)
  where channel = 'push' and status in ('queued', 'failed');

comment on column public.reminder_deliveries.next_attempt_at is
  'Earliest time a failed push delivery may be retried.';
comment on column public.reminder_deliveries.provider_message_id is
  'Opaque APNs or FCM acknowledgement identifier; never a device token.';
