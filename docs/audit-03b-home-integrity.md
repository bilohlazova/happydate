# AUDIT-03B — Home Dashboard data integrity

## CONFIRMED

- `getHomeRepositoryData()` returned `proactivityMode`, but `loadHome()` omitted it before building the Home ViewModel. This could make Happy signal selection fall back to `active`.
- People/events repository errors were represented as empty arrays while `HomeDashboard` still rendered the empty-state branch alongside the error state. That could look like data had been deleted.
- Home loading had cancellation, but no explicit owner/version guard and no state reset on auth ownership ending. This left stale in-memory state insufficiently scoped during auth transitions and overlapping reload/locale loads.
- Reminder delivery is report-only in this audit. The authenticated RPC claims queued in-app rows and changes them from `queued` to `sent`, returning only delivery metadata. Home consumes this after reminder initialization and shows only a generic localized count; Notification Inbox reads a separate notifications API. Therefore a delivery can be marked `sent` without user-visible reminder content being available.

## FIXED

- Preserved `proactivityMode` from repository data through `loadHome()`.
- Added an owner/request-version guard and auth-ownership reset to Home loading, covering user changes, sign-out, locale changes, and reloads.
- Render the Home empty state only when there are no loading errors; the existing error/retry state remains visible for partial failures.
- Added behavioral regression tests for all three proactivity modes, stale-load ownership, and partial-error empty-state suppression.

## TESTED

- Targeted Home integrity and ViewModel tests cover minimal, balanced, active, stale-owner races, and partial errors.
- Existing localization coverage remains in place for the five supported locales: `pl`, `uk`, `en`, `de`, `ru`.
- Full verification, webpack build, and production smoke results are recorded in the PR check run.

## DEFERRED

- No changes were made to the reminder RPC, reminder lifecycle, Supabase migrations/RLS, Notification Inbox, or delivery presentation. Designing an atomic “sent means displayed/acknowledged” contract requires a separate decision and audit.
- No Production, Vercel, Supabase settings, secrets, or AI provider configuration were changed.
