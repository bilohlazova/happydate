# AUDIT-03C-1 — Notification Inbox reliability

## CONFIRMED

- `NotificationInbox` called the notification list, read, and open routes without forwarding the current Supabase access token, while those routes require a server-verified Bearer identity.
- Inbox state was not explicitly owner-scoped and stale list results could overwrite the currently displayed user's state.
- Non-success list responses fell through to the empty-state presentation, conflating an empty inbox with unauthorized, network, and service-unavailable states.
- The first page was fetched only; `hasMore` and later pages were not exposed to the user. Read/open updates used closure state, so repeated or parallel actions could produce an incorrect unread count.

## FIXED

- Every Inbox GET/POST obtains the current session access token and sends it only as a Bearer header. No service-role key is available to or logged by the browser.
- Added owner-scoped snapshots, request sequencing, response owner validation, and reset on auth ownership changes.
- Added distinct loading, empty, network error, unauthorized, and unavailable states with retry.
- Added pagination for all server-reported pages and idempotent local read-count transitions for repeated read/open operations.
- Pagination failures retain the failed page and append mode so Retry replays the same request without replacing or duplicating earlier items.
- Preserved owner-scoped destination resolution and server-side authorization.

## TESTED

- Behavioral tests cover bearer request contracts, 401/503 handling contracts, A→B transitions, stale responses, pagination, repeated read/open state transitions, and all five locales.
- Existing notification route, destination ownership, migration, and no-business-mutation tests remain unchanged and continue to run under `npm run verify`.
- `npm run verify`, webpack build, and `npm run smoke:production` results are recorded in the PR checks.

## DEFERRED — reminder delivery integration plan

The current `reminder_deliveries` contract claims authenticated queued in-app rows and changes `queued → sent` atomically in `consume_my_in_app_deliveries`; it returns delivery metadata, not proof of display. `happy_notifications` is a separate user-visible, deduplicated inbox with `read` and `opened` state.

The future integration should introduce an explicit delivery state machine: `queued → claimed → delivered → displayed → read → opened`, with `failed`/retry metadata separate from user state. A stable reminder occurrence/channel dedupe key should map one logical reminder to one inbox notification, with a unique owner-scoped constraint and an idempotent upsert. Claiming must be atomic and owner-bound; acknowledgement transitions must be conditional and repeat-safe. A delivery attempt should remain retryable until the channel confirms delivery, while display/read/open are client events and must never be inferred from `sent`.

The contract must support web, iOS, Android, and push as separate channel attempts tied to one logical notification, with channel-specific retry/backoff and no duplicate user-visible copies. The test plan should cover concurrent claims, owner isolation, crash-after-claim recovery, duplicate cron runs, dedupe across channels, offline/reconnect replay, push delivery failure, inbox display/read/open idempotency, and migration compatibility. This requires a separate decision before changing RPC, cron, SQL migrations, reminder lifecycle, or Supabase settings.
