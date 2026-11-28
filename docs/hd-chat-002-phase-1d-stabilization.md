# HD-CHAT-002 Phase 1D — stabilization & release candidate

Base: `cba7c46` (Phase 1C). Branch `feat/hd-chat-002-unified-happybot`. No push, no migration, no Auth/RLS/secrets/Cron change, no paid AI call.

## 1. Server prompt: exact read/write schema

Writes per AI turn (`src/app/api/ai-chat/route.ts`, after the reply):
| Store | Written when | Notes |
|---|---|---|
| `happy_chat_turns` (service role) | every verified authenticated turn; `person_id` = verified scope person, `scope` global/person/event/task | **target single source of new history** |
| `person_happy_conversations` (legacy) | only when a person is active | kept (see §3) |

Reads for the prompt (before this phase → after):
| Prompt block | Before | After |
|---|---|---|
| Live `conversation` (client window, verified) | as is | as is |
| PERSON MEMORY PROFILE → "RECENT HAPPY CONVERSATION HISTORY" | legacy last 6 rows, **not deduped** against the live window | `loadMergedPersonHistory`: `happy_chat_turns` (person) ∪ legacy, deduped by id and by normalized user+Happy wording, minus anything whose user message is in the live window, newest first, max 6 |
| EARLIER CONVERSATIONS (server memory) | summaries (+ recent turns only without an active person, deduped vs live window) | unchanged |

Problem (P1): with an active person the same exchange could enter the prompt twice (profile history + live window) and, across the two tables, twice more in the profile. Fixed by `selectPersonHistoryForPrompt` (pure, `conversationMemory.ts`). The gift-recommendation service uses the same merge. Legacy-only history (rows never mirrored to `happy_chat_turns`) is still read → historical compatibility; a failing read of either table degrades to the other; nothing is deleted.

## 2. Tests
`tests/happybot-prompt-history-dedupe.test.mjs` (5 tests): same exchange in both stores once; live-window message not repeated; legacy-only kept, capped 6, newest first; end-to-end one marker occurrence in the person profile prompt text; wiring + legacy write kept. Mutation check: removing the dedupe makes 3 of 5 fail.

## 3. Double-write decision
Personal turns are written to both tables because the profile "history" view, account data export (`accountDataExport.repository.ts`: `person_happy_conversations`), `people.loaders`, and the legacy prompt read all consumed the legacy table. After this phase the prompt and gift service read both stores, the profile view already merges both (Phase 1C). The account export still reads legacy only, so **legacy writing is NOT stopped**. Stop condition for a later phase: (a) export includes `happy_chat_turns`, (b) a backfill/RFC for old rows is approved, (c) one release with merged reads in production. No data is deleted.

## 4. RFC — gift / event / task continuity (no migration executed)
Facts: `happy_chat_turns.scope` allows global/person/event/task, but gift chats are stored `scope='global'` with `person_id`; event/task turns have no `event_id`/`task_id`, gift turns no gift/context id. Restoring them reliably is impossible without schema, and attributing old global rows to a gift would be a guess, so the client restores only global and person segments (Phase 1C) and never shows gift/event/task history.
Proposal (needs owner approval + separate migration PR): add nullable `context_type text`, `context_id uuid` (event/task/gift-session id) to `happy_chat_turns`, written by the server from the verified scope; index `(user_id, context_type, context_id, created_at desc)`; RLS unchanged (owner select). Old rows keep `context_*` null and stay global/person only. Risks: backfill ambiguity (do not backfill), budget mixing across people (scope filter must keep `person_id`), prompt size (cap per context), deletion cascade when an event/task is deleted (retention decision needed). Scenarios to test: reopen gift chat for person A after B; task with decisions; event deleted; legacy rows.

## 5. Wellbeing decisions (Phase 1B) and the explicit note
Recorded: free text from the home field = HappyBot message, not an automatic wellbeing check-in; mood buttons keep the consent logic; greeting and field work without wellbeing consent; nothing sensitive is saved silently. Finding (P2): the ability to consciously save a free-text note as a wellbeing check-in (`mood="custom"` insert, `WellbeingCheckIn.tsx`) is no longer reachable from the UI. Proposal: after a free-text message in a consented account show an explicit, non-default button "Зберегти як нотатку про самопочуття" (5 locales) that performs the existing `custom` insert with that text; no automatic duplication, hidden when consent is off. Not implemented here (new UI copy in 5 locales needs owner sign-off).

## 6. Regression, Node 24.22.3 (repo `engines` 24.x)
- Tests: 1630 total, **1623 PASS, 0 FAIL, 7 SKIPPED** (`--test-concurrency=1`, run in 5 chunks). The default parallel run showed 31–55 failures, all `EMFILE: too many open files` raised by esbuild inside the jsdom harness under load; every one of those 8 files passes in isolation and the chunked serial run has 0 EMFILE. No Node-version claim is made; the cause is concurrency/resource, evidenced by the error text.
- TypeScript `tsc --noEmit`: PASS. ESLint: 0 errors, 1 pre-existing warning (`tests/locale-preference.test.mjs:195`).
- `npm audit --omit=dev`: 0 vulnerabilities.
- `next build`: **FAIL in this sandbox — environmental**: `next/font` cannot fetch Geist from fonts.googleapis.com (no network). Not a code error; **not verified**, must be confirmed by the Vercel Preview build.
- Real-browser checks (1440/1024/375/320, overlay, Back, scroll, keyboard): **NOT performed**; only jsdom. Not claimed.

## 7. Open risks
Deferred real A/B privacy E2E (owner decision); production build unverified here; real-browser/mobile-keyboard unverified; legacy table still double-written; gift/event/task history not restored by design.
