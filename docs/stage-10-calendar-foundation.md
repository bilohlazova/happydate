# Stage 10 — Calendar foundation

- Status: Complete (10.1–10.6)
- Date: 2026-08-06
- Product goal: one reliable, person-aware mobile calendar

## Stage 10.1 — Canonical Event persistence

The existing mobile calendar already supports colored dates, day selection,
quick event creation, editing, deletion, search, and ICS import/export. The main
risk was architectural: the large Dashboard component owned direct Event CRUD,
while a separate Events Repository and a second calendar component also
existed.

All calendar Event list/create/update/delete/import operations now go through
the canonical Events Repository. Update and delete add explicit `user_id`
filters in addition to existing RLS. Repository mutations return normalized
persisted rows instead of asking the UI to infer database state.

The Calendar immediately merges confirmed create, update and import responses,
and removes confirmed deletes locally. Realtime remains an optional second
device synchronization channel rather than a requirement for correct same-device
behavior. This matters because the production inventory found that `events` is
not currently in the `supabase_realtime` publication.

No Supabase schema, RLS policy or production data changed in 10.1.

## Preserved behavior

- tapping a date opens its day sheet;
- “Add” pre-fills the selected date;
- birthday, work and personal events retain distinct colors;
- automatic birthday rows remain read-only;
- edit/delete confirmations, search, ICS import/export and localized copy are
  unchanged.

## Next Calendar slices

## Stage 10.2 — One mobile Calendar UI

The unused `react-big-calendar` implementation, its client wrapper, toolbar,
global stylesheet and package dependencies were removed after a repository-wide
call-site audit. Dashboard's custom mobile Calendar is now the only Calendar UI
implementation and imports its event record from the canonical Event domain.

This removes a second category-color system, a second date-navigation model and
a misleading localization test that exercised code no user could reach.

## Next Calendar slices

## Stage 10.3 — Person-associated Events

Create and edit sheets now allow the user to select one of their HappyDate
people or leave the Event unassigned. The Event Repository persists both the
canonical `person_id` and the existing denormalized `person_name` compatibility
label, returns them in normalized records, and preserves them through optional
Realtime updates.

Production schema inspection confirmed the existing `events.person_id` foreign
key and owner-aware INSERT/UPDATE RLS checks: a linked person must belong to the
authenticated user. No schema migration was required. The Calendar now loads
all people for the selector while still generating birthday occurrences only
for people with a birthday.

## Next Calendar slices

## Stage 10.4 — Important Event reminder lifecycle

The Event form now exposes one understandable switch: an important Event is
handled by Happy until the action is completed. Saving the switch persists
`events.is_important` and reconciles one `prepare` reminder for that Event.

Reminder activation is idempotent and can explicitly reopen a reminder after
the user turns importance back on. Every edit first cancels active reminders for
the Event, preventing an old occurrence from surviving a date change, then
creates the current occurrence when enabled. Turning importance off cancels
pending/snoozed reminders; deleting the Event relies on the existing cascading
foreign key.

Events more than thirty days away begin preparation thirty calendar days before
the date. Events inside that window begin immediately. Past or malformed dates
never create a reminder. Delivery timing, quiet hours, cadence and “repeat until
completed” remain owned by the existing Reminder subsystem.

No Supabase schema migration was required: `events.is_important`, Reminder
identity, RLS and delivery lifecycle already exist.

## Next Calendar slices

## Stage 10.5 — Recurring Event series

Events now support one canonical date-only recurrence rule: none, weekly,
monthly or yearly. The database stores a single series anchor; the Calendar
expands only the occurrences required by its visible range. This avoids copying
rows for every week or year and keeps editing and deletion scoped to the whole
series.

Month-end recurrence remains anchored to the original day (31 January becomes
28 February and then 31 March), and yearly 29 February recurrence uses the last
valid day in non-leap years. Important recurring Events reconcile their
Reminder against the next current occurrence rather than the historical anchor.

Birthdays remain Person-owned automatic occurrences and never inherit Event
recurrence. When a persisted birthday occurrence already exists for the same
Person and date, its automatic presentation counterpart is suppressed. This
removes the duplicate birthday rows previously visible in Calendar while still
showing birthdays in every year the user navigates to.

Migration `20260806183837_add_event_recurrence.sql` adds the constrained,
non-null `events.recurrence_rule` column and explicit authenticated Data API
grants. Existing owner RLS remains unchanged.

## Next Calendar slice

## Stage 10.6 — Accessibility, gestures and date-only hardening

The Calendar grid now exposes grid, row, column-header and grid-cell semantics.
Every day has a localized full-date and event-count label, today uses
`aria-current=date`, selection uses `aria-selected`, and the day sheet is a
labelled modal with an explicit close action. Event title, date and note inputs
have programmatic labels.

Arrow keys move by one day or one week and can cross month/year boundaries
while preserving focus. Horizontal touch gestures change months only after a
directional threshold, leaving vertical page scrolling available.

All date-only parsing, formatting and day arithmetic now use one local-noon
boundary instead of scattered midnight or UTC conversions. Regression tests
cover DST dates and timezones from UTC-10 through UTC+14.

Stage 10 is now complete. The next product stage should build Notes on the same
canonical, person-aware and accessible foundations.
