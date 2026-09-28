# Happy proactive boundary

`happy-proactive` is deliberately deterministic. Cron and the Edge Function
use only persisted facts and backend-owned rules to determine calendar
windows, ownership, task and gift state, completed greeting steps,
idempotency, and notification timing. The visible Idea and Notification copy
is selected from the static `uk`, `pl`, `en`, `de`, and `ru` templates in the
trusted RPCs, using the owner's existing `profiles.preferred_locale`.

This path must not call an AI provider, the Happy Agent API, or any chat or
generation endpoint. AI belongs only to explicitly generative work, such as
gift recommendations, personalized greetings, or an explanation of a
recommendation. AI must not decide whether an event is in range, whether a
gift or task exists, whether an owner is valid, or whether Cron should create
a proactive row.
