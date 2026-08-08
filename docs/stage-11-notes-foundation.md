# Stage 11 — Notes foundation

- Status: Complete (11.1–11.4)
- Date: 2026-08-06
- Product goal: fast, person- and Event-aware capture that remains trustworthy

## Stage 11.1 — Canonical Person and Event associations

The existing Notes experience already supported create, edit, delete, text and
Person search, typed records, photos and owner-scoped Knowledge persistence.
The first Notes slice closes the most important domain gap: `memories.event_id`
was present in production and in Knowledge, but absent from the Notes projection
and UI.

The editor can now associate notes, memories and gift ideas with one canonical
Event. Selecting an Event also fills its associated Person when the user has not
already selected one. Journal entries remain private and deliberately clear
both Person and Event associations.

Event association is persisted through the canonical Knowledge Repository,
displayed on each card and included in search together with title, body, gift
value, Person name and tags. Notes loads Events through the canonical Event
Repository and contains no direct `memories` query.

Update and delete mutations now add an explicit authenticated `user_id` filter
in addition to existing RLS. Production inspection confirmed owner-aware
INSERT/UPDATE policies validate both `person_id` and `event_id`; both foreign
keys use `ON DELETE SET NULL`.

Deletion now requires confirmation and removes owner-scoped stored images after
the Knowledge row is deleted, preventing new orphaned image objects.

No Supabase migration was needed for 11.1.

## Stage 11.2 — Private voice notes

The Notes editor now records audio through the device microphone, shows an
animated waveform while recording, stops automatically after five minutes and
allows playback or removal before saving. A voice recording can be the sole
content of a regular Note.

Audio is validated client-side, stored under an owner-prefixed canonical path
in the private `memory-audio` bucket and persisted through `memories.audio_url`.
Only short-lived signed URLs cross into playback. Replacing, removing or
deleting a voice Note also removes the previous owned Storage object after the
Knowledge mutation succeeds.

Existing `transcript_text` values are projected, displayed beneath the player
and included in Notes search. Automated transcription is intentionally not
claimed in this slice; the persistence and presentation boundary is ready for
a later consent-aware transcription worker.

Migration `20260806191632_harden_memory_audio_bucket.sql` makes bucket creation
reproducible and enforces a private 25 MiB limit with an explicit audio MIME
allowlist. Existing owner-scoped SELECT/INSERT/UPDATE/DELETE policies remain in
place. Android now declares `RECORD_AUDIO`; iOS provides a microphone usage
description.

## Stage 11.3 — Fast private photo capture

The Notes editor now presents camera and gallery as two explicit actions. On
iOS and Android, camera capture uses the current Capacitor 8 `takePhoto` API,
the rear camera, orientation correction and a bounded 2048×2048 target. The
capture is never saved to the device gallery. In the browser, a dedicated
`capture="environment"` input provides the appropriate system fallback.

Captured photos are converted to regular `File` values and pass through the
same MIME and 10 MiB validation, preview, removal, private `memory-images`
upload and failure cleanup as gallery images. The editor never writes to
Storage directly and never creates a public URL. Cancellation is silent;
permission, unreadable-photo and invalid-file failures are localized and do
not close or erase the draft.

iOS camera and photo-library disclosures now cover both profile and private
Note media. No Android storage permission is introduced because
`saveToGallery` remains false. No Supabase migration is needed: the existing
private bucket and owner-prefixed Storage policies already cover this path.

## Stage 11.4 — Resilience, accessibility and mobile regression

Notes now tracks browser connectivity without pretending to provide offline
writes. Existing loaded records remain readable while offline; save and delete
are blocked with localized, actionable feedback. A failed save leaves the
entire editor draft—including pending photos and voice recording—intact for a
retry. Initial read failures have a dedicated retry state, while failed deletes
leave the record visible rather than implying success.

Loading, connection and mutation feedback uses live regions. The editor is a
labelled, busy-aware modal with initial focus, a contained Tab cycle, Escape
handling and focus restoration. The type chooser and image viewer expose modal
semantics; the image viewer supports Escape and arrow-key navigation. Existing
44 px primary touch targets are protected by regression tests, and motion is
disabled when the operating system requests reduced motion.

The step adds localized states in all five supported languages and focused
regression coverage for connectivity behavior, draft preservation, dialogs,
keyboard interaction and mobile targets. No schema or Supabase policy change
is required.
