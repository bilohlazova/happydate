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

## Cron authorization

The cron caller authenticates with a dedicated random secret, not with a
Supabase API key. The function reads `HAPPY_PROACTIVE_CRON_SECRET` (an Edge
Function secret) and compares it with `Authorization: Bearer <secret>` in
constant time (`cron-auth.ts`) before the method, the body or the database are
touched. A missing or short secret fails closed with `503`; a wrong or missing
header returns `401`. Database access uses the platform-managed admin client,
which never leaves the Edge runtime.

`private.invoke_happy_proactive()` reads two Vault secrets:

- `happy_proactive_function_url`: `https://<20-letter-project-ref>.supabase.co/functions/v1/happy-proactive`
- `happy_proactive_cron_authorization`: the same random secret (at least 32
  characters of `A-Za-z0-9+/=_-`); values that look like Supabase API keys
  (`sb_…`, `eyJ…`) are rejected by the invoker.

Use a different secret for each environment. Never commit either value.

## Scan limits (HD-PR-007)

PostgREST receives `.in()` filters in the request URL. The scan therefore:

- reads upcoming birthdays in keyset-ordered pages of `PROACTIVE_MAX_CANDIDATES` (100) events, ordered by `(date, id)`, and processes every page of the 30-day window;
- sends every `.in()` list (event ids, user ids, task ids, idea keys, quiet keys) in chunks of at most 6 000 encoded characters and 100 items (`batching.ts`);
- treats a response of exactly 1 000 rows (the API's silent row cap) as an error instead of a result;
- stops after `PROACTIVE_MAX_PAGES_PER_RUN` pages (10 000 events) or `PROACTIVE_RUN_TIME_BUDGET_MS` (100 s) and reports `scan.truncated: true` in the response and in the completion log. A truncated run is a monitoring signal: the remaining events are picked up only if earlier ones are already done, because the scan restarts from the first page on the next run;
- reports a failed read as `500 {"error":"proactive_read_failed"}` and a failed write as `500 {"error":"proactive_write_failed"}`; pages completed before the failure stay written (writes are idempotent), and the failure log carries only counts and a generic error code.

Authorization (`cron-auth.ts` and the block before the first database access in `index.ts`) is unchanged by this fix and is pinned by a hash in `tests/happy-proactive-scan.test.mjs`.
