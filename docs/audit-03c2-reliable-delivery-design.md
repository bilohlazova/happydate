# AUDIT-03C-2A — Reliable Reminder Delivery Contract

Status: design for review only  
Repository base: `main` at `f3098bc989078c28c31b590175b38ca0284206c0`  
Audit date: 2026-10-21

No runtime code, SQL, migration, cron, secret, Supabase, or Production setting was changed for this audit.

## 1. CURRENT STATE

### 1.1 Reminder lifecycle and queueing

The current lifecycle is split into two tables:

- `public.reminders` is the owner-scoped logical reminder. Its identity is unique on `(user_id, event_id, occurrence_date, action_kind)` and its state is `pending`, `snoozed`, `completed`, or `cancelled`.
- `public.reminder_deliveries` is a channel outbox. Its current unique key is `(reminder_id, channel, scheduled_for)`. It has `queued`, `processing`, `sent`, `failed`, and `skipped`, but no notification ID, content snapshot, or user-acknowledgement state.

`ensureHomeReminder()` creates or reuses a `congratulate` reminder only for an important featured event within the next 30 days. Birthday events first ensure a birthday occurrence. The upsert is owner-scoped and occurrence-idempotent.

`private.queue_due_reminder_deliveries()` runs from the `pg_cron` schedule installed by `20260803190836_activate_reminder_cron_and_in_app_delivery.sql`:

1. Selects due `pending`/`snoozed` reminders with `FOR UPDATE SKIP LOCKED`.
2. Evaluates the owner's IANA timezone and quiet-hours window.
3. Inserts enabled `in_app` and/or opted-in `push` rows using `ON CONFLICT DO NOTHING`.
4. Advances `next_remind_at` only when at least one delivery row was inserted, using the configured repeat interval.

This is concurrency-safe for queue selection and idempotent for the existing delivery key. It is not yet a durable content-delivery contract.

### 1.2 Current in-app path

`HomePageClient.tsx` performs this sequence only after `loadHome()` succeeds, the user is authenticated, and `nextViewModel.featuredEvent` exists:

1. `ensureHomeReminder(featuredEvent)`.
2. `consumeQueuedInAppDeliveries()`.
3. `public.consume_my_in_app_deliveries()` claims the user's queued in-app rows with `SKIP LOCKED`, updates them directly to `sent`, increments `attempt_count`, and returns `(delivery_id, reminder_id, scheduled_for)`.
4. Home stores only `deliveries.length` and renders a localized `reminder.deliveryReady` status banner.

Confirmed gap: the RPC marks the delivery `sent` before any `happy_notifications` row is created. The returned data contains no title, message, destination, or notification ID. The current client does not create an Inbox row from it. Therefore `sent` currently means “claimed by the authenticated Home request”, not “user-visible content persisted”. A crash or failed follow-up step cannot recover the in-app content because the row is no longer queued.

When Home has no `featuredEvent`, the effect returns before both `ensureHomeReminder()` and `consumeQueuedInAppDeliveries()`. Existing queued rows remain queued; no Inbox item or delivery-ready banner is produced by this path. This is a confirmed dependency on the Home view and is especially important for users whose reminder is due while the dashboard has no featured event.

### 1.3 Notification Inbox and `happy_notifications`

`happy_notifications` is a separate durable, owner-scoped Inbox table. It stores title/message, optional person/event/task references, `dedupe_key`, `read_at`, `opened_at`, `dismissed_at`, and creation time. `(user_id, dedupe_key)` is unique when a dedupe key is present. Reference validation prevents cross-owner person/event/task links, and RLS limits reads to the owner.

The Notification Inbox API reads and mutates only `happy_notifications`. It resolves destinations under the authenticated owner and preserves the existing `read_at`/`opened_at` contract. It does not join to or consume `reminder_deliveries`.

Current trusted writers include birthday/proactive and occasion functions. They use owner-scoped semantic dedupe keys and `ON CONFLICT DO NOTHING`. These are existing Inbox-producing flows, not the reminder-delivery outbox path. They must remain intact.

### 1.4 Push path

`dispatch-push-reminders` is a secret-key-only Edge Function. It:

- recovers stale `processing` push rows after 10 minutes;
- optimistically claims `queued`/retryable `failed` rows;
- loads the owner reminder, event copy, and enabled iOS/Android devices;
- sends through FCM HTTP v1 or APNs;
- records an opaque provider message ID on provider acceptance;
- retries failures at most three times with bounded backoff;
- disables a device only for explicit invalid-token responses;
- marks rows `skipped` when there is no active device.

Push provider acceptance is not proof of device display, read, or open. The repository contains the function and configuration, but this audit did not verify a deployed invocation schedule for the dispatcher; its schedule must be confirmed separately before calling push operationally active.

### 1.5 Preferences, quiet hours, and repeats

Reminder Settings persists owner-controlled timezone, quiet-hour start/end, repeat interval (`60`, `180`, `360`, `720`, or `1440` minutes), in-app enablement, push enablement, and knowledge-review preferences. The database requires at least one delivery channel. Quiet-hour evaluation occurs in the configured timezone; repeat advancement is based on `p_now + repeat_interval`, not on user acknowledgement.

Completion/cancellation updates the logical reminder, but the current schema does not define how already-queued delivery rows are atomically cancelled or linked to a user acknowledgement. This is a future contract requirement, not a change made here.

## 2. RISKS

### Confirmed

1. An in-app delivery can become `sent` without a corresponding durable user-visible `happy_notifications` row.
2. The in-app delivery path is coupled to Home having a `featuredEvent`; no featured event means no consumption and no in-app presentation.
3. `reminder_deliveries` has no content snapshot or foreign key to an Inbox notification, so a later retry cannot reconstruct the exact user-facing copy safely from the delivery row alone.
4. `sent` is overloaded: it is a claim/consumption result for in-app and a provider-acceptance result for push.
5. Existing dedupe keys are channel-specific in `reminder_deliveries`, while Inbox dedupe is independently defined in `happy_notifications`; there is no enforced cross-table mapping preventing a future double Inbox insert.

### Potential, requiring implementation validation

- A crash between an in-app claim and any future notification write can lose the current delivery.
- A retry implemented only at the client layer could create duplicate Inbox rows unless it upserts by one stable logical key.
- Completion/cancellation racing with queueing can leave a delivery for a reminder that has already become terminal unless the future claim transaction rechecks lifecycle state.
- A provider `2xx`/message ID cannot establish displayed/read/opened state and must not be used as such.

## 3. PROPOSED CONTRACT

### 3.1 Stable identity, attempts, and compatibility

Keep two identities separate:

- **Notification identity:** `reminder:v1:<reminder_id>`. `reminder.id` is already occurrence-scoped by `(user_id, event_id, occurrence_date, action_kind)`, so it is stable for one logical reminder occurrence. `scheduled_for` must not be part of the Inbox dedupe key.
- **Delivery-attempt identity:** `attempt:v1:<reminder_id>:<channel>:<scheduled_for_utc>`. The database-level equivalent remains `(reminder_id, channel, scheduled_for)` and identifies one scheduled attempt/channel, not a new user-facing message.

The owner is stored and checked separately from both keys. Keys are backend-generated, bounded, deterministic, and contain no user-controlled text. In-app and push attempts for the same reminder occurrence point to the same notification identity, while retaining independent channel status and retry metadata.

Every repeat interval creates a new delivery attempt for the same `reminder.id`; it does not create another `happy_notifications` row. A retry of an attempt upserts or reuses the one notification mapping. A genuinely new occurrence gets a new `reminder.id` and therefore a new notification identity.

Repeats do not reset `read_at` or `opened_at`. If the existing notification is unread, it remains unread; if the user has read or opened it, it remains acknowledged. A repeat may update internal `last_attempted_at`/delivery evidence, but must not manufacture an unread duplicate. A future product decision may add an explicit “remind me again” acknowledgement action, but that is not implicit in delivery retry.

Existing `happy_notifications` rows, including rows with legacy or null `dedupe_key`, remain readable and acknowledgeable. New reminder-backed rows use the stable notification key and the existing `(user_id, dedupe_key)` uniqueness boundary. Legacy rows are never re-keyed automatically.

### 3.2 Separate state machines

Do not use one `status` for all meanings.

**Delivery attempt state** (per owner, logical key, channel):

`queued → claimed → content_persisted → provider_accepted`  
with `failed`, `skipped`, and lease-timeout recovery as side paths.

- In-app reaches `content_persisted` only after the complete `happy_notifications` content and owner-scoped destination references are durably committed.
- Push may reach `provider_accepted` after the provider accepts the payload; it still has no display/read/open guarantee.
- `sent` may remain as a compatibility projection during rollout, but new code must not interpret it as displayed or acknowledged.

**User acknowledgement state** is separate:

`persisted → displayed → read → opened`

`displayed` is a client observation and must be idempotent. `read_at` and `opened_at` remain the existing Inbox fields and remain monotonic. Repeated browser opening, read, or open requests must return the same terminal acknowledgement without incrementing or decrementing counts twice.

### 3.3 Autonomous atomic in-app persistence

The in-app writer must be a trusted PostgreSQL function, invoked by a protected `pg_cron` job or an equivalent server-only scheduler. It must not depend on Home, Notification Inbox, an open browser, or a client token. The existing queue job may call this writer after queueing, or the writer may claim due reminder attempts directly; there must be one authoritative writer path.

For each bounded batch, one transaction must:

1. select due candidate reminders in deterministic order and lock the reminder row first with `FOR UPDATE SKIP LOCKED`;
2. lock the owner preference row consistently, then lock the matching in-app delivery attempt;
3. recheck owner identity, reminder state (`pending`/`snoozed` only), scheduled time, in-app preference, quiet-hours policy, and attempt lease/status;
4. derive the complete localized title, message, type, priority, and owner-scoped destination references from trusted data;
5. upsert `happy_notifications` by `(user_id, notification_key)` and obtain its ID;
6. record the notification mapping on the delivery attempt and set the in-app attempt to `content_persisted`;
7. commit the notification, mapping, and final attempt status together.

Only a successful commit means `in-app content persisted`. A returned row or log line before commit is not delivery evidence. The client may later observe the row and acknowledge it, but never creates the authoritative content.

Operational constraints:

- Use a bounded batch, for example 50–100 reminders per invocation, with a database limit and a short transaction per batch.
- Use a lease/claim timestamp and recovery timeout for attempts that die while processing.
- Emit counts for selected, persisted, dedupe-hit, skipped-terminal, failed, recovered, and oldest pending age; never log private message content or tokens.
- Retry transaction failures with bounded backoff. A retry that finds the notification mapping finalizes the attempt; it never inserts a second Inbox row.
- The writer must continue to work when no Home page is rendered and must be independently testable against a staging database.

### 3.4 Crash, timeout, and retry behavior

- A claim has a bounded lease and attempt metadata. An expired lease becomes retryable.
- If a retry finds the notification already present for the logical key, it finalizes the attempt instead of inserting a second row.
- If no notification exists, it repeats the same atomic upsert transaction.
- A transaction rollback leaves the attempt retryable; it must never leave a terminal delivery state without the content.
- Retries are idempotent and bounded by policy, but in-app persistence should not be abandoned merely because a browser was offline: persisted Inbox content is the durable handoff and remains available on reconnect.

### 3.5 Concurrency, lock order, and ownership

All reminder lifecycle writers must use the same lock order: **reminder row → owner preference row → delivery-attempt row**. Queueing, autonomous in-app persistence, completion, cancellation, and snooze must use owner predicates while acquiring these locks. A delivery candidate that cannot acquire the reminder lock is skipped and retried later; it must not be force-updated.

- `complete`, `cancel`, and `snooze` lock the reminder first and then update only the allowed current state.
- The in-app writer locks the reminder first, rechecks the state, then locks/claims the attempt. It cannot persist content for a terminal reminder.
- Cancellation or completion before the writer commits causes the writer to skip/cancel the attempt with no notification content.
- Cancellation after the notification transaction commits suppresses future attempts; it does not silently retract already-persisted Inbox content. Any dismissal/retraction is a separate product action.

Claims use leases and owner predicates. Unique constraints enforce one logical notification per owner. Every reference lookup and acknowledgement keeps the owner condition. RLS remains enabled for user-facing tables; service-role writers are restricted to trusted server functions and never expose service credentials to web, iOS, or Android.

### 3.6 Push and device fanout semantics

Push and in-app use the same notification identity but have independent attempts. The later `20260804154538_create_push_device_registration.sql` behavior remains the baseline: a push attempt is eligible only when push is enabled and an active device exists.

- For push-only preferences with no active device, do not claim success. The current queue path may leave no push row and keep the reminder due; the target contract must avoid a one-minute hot loop by recording an explicit `awaiting_device`/`skipped_no_active_device` outcome or otherwise applying a bounded next-attempt policy. It must not silently mark provider acceptance.
- One logical push delivery may fan out to multiple devices. Keep one aggregate delivery record for the channel plus per-device attempt results (or an equivalent durable child result set) so one successful device does not hide failures on other devices.
- APNs/FCM partial success records each device result, opaque provider ID where available, invalid-token classification, and retry eligibility. The aggregate is `provider_accepted` only when the chosen policy says the channel attempt has sufficient acceptance; it is never `displayed`.
- A provider acceptance must not set Inbox `read_at`, `opened_at`, or `displayed`. Push failure must not delete or invalidate already-persisted in-app content.

The dispatcher’s actual invocation schedule remains a separate operational prerequisite and must be verified before claiming push delivery is active.

### 3.7 Compatibility surface

The implementation must preserve:

- existing `happy_notifications` and Notification Inbox API routes;
- `read_at`, `opened_at`, destination resolution, and owner isolation;
- birthday preparation, proactive ideas, actions, and existing notification writers;
- quiet hours, timezone, repeat intervals, and occurrence identity;
- web, Android, and iOS clients.

The safest rollout is additive: first create the mapping/state boundary, then migrate the in-app consumer to persist content transactionally, then add acknowledgement telemetry only if product needs it. No existing Inbox row should be rewritten solely to adopt the new contract.

### 3.8 Durable content, deletion, and privacy

The current foreign keys for `happy_notifications.person_id`, `event_id`, and `task_id` use `ON DELETE CASCADE`. Therefore deleting a referenced person, event, or task currently deletes the Inbox row and its `read_at`/`opened_at` history. This audit does not change those foreign keys.

Recommended target policy, subject to a separate migration decision:

- Persist the user-facing title/message and logical notification key as a bounded content snapshot at creation time; do not reconstruct historical text from a mutable event/person/task row.
- Prefer preserving the snapshot after source deletion while nulling the optional destination reference, if product/privacy review accepts that retention. This would require an explicit future FK/policy migration and is not implemented here.
- Until that migration is approved, document the current cascade behavior and treat source deletion as deletion of the associated Inbox content. No retry may recreate it from a deleted source.
- Destination resolution must verify ownership and existence at open time. If the target is gone, use a safe owner-scoped fallback such as global Happy chat or a non-actionable Inbox detail; never expose a raw foreign ID or another owner’s resource.
- Store only the minimum reminder content needed for the Inbox contract. Do not copy private notes, device tokens, provider credentials, or unrelated person data into a notification snapshot.
- Existing proactive notifications retain their current semantic dedupe keys and writers. Reminder delivery must not create a second item for a proactive notification representing the same logical opportunity; any future bridge requires an explicit mapping/reconciliation rule.

## 4. MIGRATION PREREQUISITES — AUDIT-DB-01

Read-only checks were performed against:

- Production project `happydate-prod` (`yzcvdspiiiaidsdripxr`)
- Staging project `happydate-staging` (`xgelazzdgluuenqkymox`)

The live schema query confirmed that both environments contain the relevant tables and the current columns described above, including `reminder_deliveries.next_attempt_at`/`provider_message_id` and `happy_notifications.opened_at`. The live function definitions confirmed the current `SKIP LOCKED` claim and direct in-app `queued → sent` update in both environments.

The live schema also confirms the current `happy_notifications` reference behavior: `person_id`, `event_id`, and `task_id` are nullable foreign keys with `ON DELETE CASCADE`. This is a current deletion semantic, not a recommendation to change it in AUDIT-03C-2A.

The read-only migration ledger returned 92 applied rows for each environment. Production exposes the canonical migration names/versions in the returned ledger; the supplied AUDIT-DB-01 comparison reports 18 of 92 version numbers differing from GitHub. Staging clearly uses rewritten execution versions (for example `20261017072720`) while retaining original migration names, and the supplied comparison reports 92 of 92 number mismatches plus a name-set difference. These observations must be reconciled by an exact pairwise report, not by count or name-only matching.

Safe prerequisite plan, with no automatic execution:

1. Freeze schema-affecting deploys and take read-only snapshots of `supabase_migrations.schema_migrations`, relevant `pg_proc` definitions, table columns, constraints, indexes, grants, policies, cron jobs, and Edge Function versions.
2. Build a three-way ledger: GitHub filename/version/name, Production applied version/name, and Staging applied version/name. Classify exact matches, renamed copies, missing rows, duplicate semantic migrations, and unknown live rows.
3. Compare function/table definitions and data invariants before proposing any repair. A matching name is not proof of matching SQL.
4. Produce a reviewed mapping for staging and production separately. Do not use `migration repair`, `db push`, `db reset`, DDL, or a history rewrite as a first response.
5. After owner approval, rehearse the chosen reconciliation on a disposable database/branch, verify schema and application smoke tests, then schedule a separately approved production operation with backup and rollback criteria.
6. Only after history and schema are trusted should the delivery-contract migrations be designed. AUDIT-03C-2A must not create a second delivery system on an uncertain database history.

## 5. IMPLEMENTATION PHASES

Each phase should be a small, independently reviewed PR; none is part of this design-only change.

1. **AUDIT-DB-01 reconciliation** — establish authoritative migration/history parity and a schema snapshot.
2. **Contract primitives** — add the reminder-level notification key, attempt key/mapping, and lease fields with additive constraints and backfill-safe handling for pre-existing delivery rows.
3. **Autonomous trusted writer** — implement one server/RPC transaction that locks in the documented order, upserts complete Inbox content, records the mapping, and finalizes in-app persistence; preserve legacy rows and API behavior.
4. **In-app consumer cutover** — stop direct `queued → sent` acknowledgement for new rows; remove the Home dependency. Keep a guarded compatibility path for old rows.
5. **Lifecycle race handling** — recheck cancellation/completion/snooze under the common lock order, add lease recovery, and test repeat/occurrence behavior.
6. **Push fanout projection** — map existing push attempts to the same notification key, add per-device results or an approved equivalent, retain provider retry/invalid-token behavior, and explicitly separate provider acceptance from user acknowledgement.
7. **Deletion/content policy** — make an explicit decision about current cascade versus snapshot retention before changing any foreign key.
8. **Client acknowledgement** — optionally record displayed state; keep existing read/open routes and monotonic semantics.
9. **Observability and cleanup** — measure orphaned attempts, duplicate conflicts, retry age, device partial success, and acknowledgement latency before removing compatibility code.

## 6. TEST MATRIX

| Scenario | Expected result |
|---|---|
| Duplicate cron execution | One logical key; one delivery per enabled channel; no duplicate Inbox row. |
| Concurrent queue workers | `SKIP LOCKED`/lease ownership prevents double processing; loser retries or observes committed mapping. |
| Crash before Inbox persistence | Transaction rolls back or lease expires; attempt remains retryable; no false delivered state. |
| Crash after Inbox persistence | Retry finds the logical key and finalizes mapping; no duplicate content. |
| Repeat every 60 or 180 minutes | New attempt key, same reminder-level notification; no duplicate Inbox row; `read_at`/`opened_at` are not reset. |
| Offline user and reconnect | Server persists Inbox content independently of Home render; reconnect lists it through the existing API. |
| Repeated browser opening | Same row; `displayed`/`read_at`/`opened_at` are monotonic and idempotent. |
| Cross-account access | User A cannot claim, read, acknowledge, or resolve User B's delivery/content. |
| Push-only preference with no active device | No false acceptance; explicit bounded unavailable-device outcome; no hot-loop or silent loss. |
| Multiple devices with partial APNs/FCM success | One channel attempt, durable per-device outcomes, retry only failed eligible devices, no duplicate Inbox item. |
| Cancellation before writer commit | No notification content; attempt is cancelled/skipped and cannot become persisted. |
| Cancellation after notification persistence | Future attempts stop; existing persisted content follows the approved deletion/dismissal policy. |
| Legacy `sent` row without notification mapping | Quarantined/audited; no automatic replay or fabricated content. |
| Deletion of referenced event/person/task | Current cascade behavior is verified; future snapshot/null-destination policy is tested separately. |
| Feature-flag rollback | New writer can be disabled without routing to direct `sent`-without-content behavior; queued/leased rows remain recoverable. |
| Reminder cancellation/completion during claim | Final lifecycle state wins; no new content is persisted after the terminal transition. |
| Timezone, DST, and quiet hours | Due evaluation uses the owner's IANA timezone; boundaries and overnight windows are deterministic. |
| Repeat interval | Each scheduled occurrence has a distinct logical key; existing occurrence uniqueness is preserved. |
| Retry and deduplication | Same key is retried safely; successful retry never duplicates Inbox content. |
| Pre-existing delivery rows | Legacy queued/sent rows are classified and handled without silently losing or duplicating them. |
| Push provider acceptance | Provider ID is stored; state is not reported as displayed/read/opened. |
| Push provider failure | Transient failures retry; invalid tokens disable only that token; Inbox content remains available. |
| No featured event on Home | Reminder delivery does not depend on dashboard rendering; persisted Inbox content remains discoverable. |
| Birthday preparation, proactive idea, and action | Existing writers, destinations, dedupe keys, and user actions remain unchanged. |
| Web, Android, and iOS | Same server contract; platform-specific push behavior remains an independent projection. |

## 7. ROLLBACK STRATEGY

- Keep all new schema additive and feature-gated. Do not delete or rewrite existing `reminder_deliveries` or `happy_notifications` rows.
- If the new writer fails, disable only the new writer/feature flag and leave new queued or leased rows recoverable; do not fall back to the legacy mechanism that marks in-app rows `sent` without Inbox content.
- If a partial rollout created a mapping, retry by logical key and reuse the existing notification rather than inserting a compensating duplicate.
- If push projection fails, disable push dispatch independently; persisted in-app content remains the source of truth.
- Historical `sent` rows without a notification mapping are not automatically replayed. They require an explicit reconciliation decision and, if content cannot be proven, remain audit-only rather than being duplicated or guessed.
- Before each migration phase, record row counts, status counts, orphan counts, and representative owner-scoped samples. Roll back code by deployment flag/version, not by destructive SQL.
- Any schema rollback must be a separately reviewed additive compatibility migration after confirming no live rows depend on the field. Never use `db reset`, destructive DDL, or migration-history rewriting as an operational rollback.

## Review boundary

This document is the proposed contract and implementation plan. It is not approval to implement any phase. AUDIT-DB-01 reconciliation and explicit owner review are required before creating migrations or changing the in-app consumer.
