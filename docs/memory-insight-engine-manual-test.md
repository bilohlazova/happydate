# Memory Insight Engine — manual scenario

Use `2026-07-13` as the engine's `currentDate` and an Olek birthday event on
`2026-07-18` (`category: birthday`, linked with `personId: olek`). Each record
below is active and linked to Olek. No journal record should be passed through
any selector or displayed by the result.

1. Add `coffee: kawa speciality` and `hobby: fotografia`, with no gift.
   Expected: one high-priority `gift_suggestion_ready` insight, reason
   `upcoming_event_and_person_context`, up to the two saved values in the
   description, and action `/people/olek`.
2. Add `gift: Album fotograficzny`.
   Expected: one high-priority `gift_saved` insight replaces the context
   insight; source metadata contains only the newest gift record id.
3. Remove the gift and both context records.
   Expected: one high-priority `missing_person_context` insight, reason
   `upcoming_event_missing_context`, and action `/people/olek`.

The automated suite covers these transitions with pure in-memory inputs. A
database seed is intentionally unnecessary because the engine has no Supabase
dependency.
