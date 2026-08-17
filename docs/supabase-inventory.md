# HappyDate Supabase Inventory

- Status: Read-only inventory complete; confirmed client contract corrections implemented
- Remote metadata observed: 2026-08-03
- Scope: public PostgREST schema, Auth settings, Storage bucket configuration,
  repository migrations, and every Supabase access path in `src/`
- Data mutation performed: none
- User table rows or Storage objects read: none

## 1. Purpose

This document is the authoritative inventory for the persistence work that
precedes canonical migrations and RLS hardening. It separates facts confirmed
from remote metadata from contracts inferred from application code. It must not
be treated as a complete database dump: indexes, policies, triggers, defaults,
grants, publications, and non-exposed schemas require PostgreSQL admin metadata
or a Supabase schema export before Step 3 can safely change production.

## 2. Evidence levels

| Mark | Evidence | What it proves |
|---|---|---|
| R | Remote service-role PostgREST OpenAPI | Exposed table/function names, columns, types, OpenAPI-required fields, described PK/FK links |
| S | Remote Storage/Auth management endpoints | Bucket configuration and public Auth settings |
| M | SQL committed in `supabase/migrations` | Intended additive changes present in Git; not proof of production migration history |
| C | Current application source | Fields and relations the running code expects |
| U | Unavailable in current read-only access | Must be verified with admin catalog/export before migration |

OpenAPI `required` is reported below exactly as remote metadata exposes it. It
is a useful nullability signal but does not expose every default or constraint.

## 3. Executive summary

| Area | Confirmed remote | Expected by code | Gap |
|---|---:|---:|---:|
| Public tables | 5 | 16 | 11 code-referenced tables are absent or not exposed |
| Public RPC functions | 2 | 0 | 2 undocumented operational functions |
| Storage buckets | 3 | 3 named by active code plus 1 active route expectation | `heaven-videos` is expected but absent; `memory-audio` exists but is unused |
| SQL migrations | 2 partial People alters | Full product schema | Base schema, RLS, Storage, functions, and most changes are not reproducible |
| Realtime subscriptions | `events` expected by code | 1 channel | Publication/configuration not verified |

The five remotely exposed tables are:

- `profiles`
- `people`
- `events`
- `memories`
- `subscriptions`

The application additionally references:

- `points_balance`
- `user_survey`
- `user_special_dates`
- `reviews`
- `good_deeds`
- `heaven_messages`
- `animations`
- `partner_holds`
- `gift_requests`
- `ai_gift_cache`
- `notes`

These eleven additional names plus the five confirmed tables total sixteen.
`heaven-videos` is a separate Storage-backed service boundary, not another
public table. Earlier static counts that treated this bucket as a table were
corrected by remote metadata.

## 4. Confirmed public tables

### 4.1 `profiles` [R]

| Column | Type | OpenAPI required | Code use |
|---|---|---:|---|
| `id` | uuid | yes | Auth user identity, lookup and upsert key |
| `full_name` | text | no | Profile and Home greeting |
| `phone` | text | no | No active domain consumer found |
| `preferences` | text | no | No active canonical consumer found |
| `avatar_url` | text | no | Profile/avatar storage path |
| `points` | integer | no | Exists remotely but Profile does not read it |
| `created_at` | timestamptz | no | Not read from profile; Auth creation time is used |
| `preferred_locale` | text | no | Locale preference repository |

Remote metadata describes only `id` as the primary key. It does not describe an
FK to `auth.users`; this must be verified through PostgreSQL catalog metadata.

Contract drift:

- Profile reads `points_balance.balance`, although `profiles.points` is the
  remotely confirmed points field.
- `preferences` is not the canonical person Knowledge model and must not become
  a new generic AI context without a product decision.

### 4.2 `people` [R, M, C]

| Column | Type | OpenAPI required | Main use |
|---|---|---:|---|
| `id` | uuid | yes | Person primary key |
| `user_id` | uuid | yes | Workspace owner |
| `name` | text | yes | Person name |
| `birthday` | date | no | Birthday projection |
| `relationship` | text | no | Legacy relationship label |
| `notes` | text | no | Legacy person note |
| `created_at` | timestamptz | no | Ordering/metadata |
| `avatar_url` | text | no | Person avatar |
| `avatar_type` | text | yes | `initials`, photo/AI/emoji presentation source |
| `favorite` | boolean | yes | Person favorite flag |
| `archived` | boolean | yes | Person archive flag |
| `color_token` | text | no | Presentation token |
| `contact_source` | text | yes | Manual/import/card/link/etc. source |
| `sort_order` | integer | yes | User ordering |
| `phone` | text | no | Selected contact data |
| `email` | text | no | Selected contact data |
| `external_contact_id` | text | no | Import deduplication |
| `relation_label` | text | no | User-visible relation label |
| `relation_category` | text | no | Filter category |
| `gender` | text | yes | Confirmed/unspecified gender context |
| `relation_key` | text | no | Canonical relation key |

Remote metadata describes `id` as the primary key. No `user_id` FK is exposed.

Committed migrations add only contact/relation fields, partial indexes, and
checks. They do not create the base table or reproduce avatar, favorite,
archive, color, and ordering changes.

Confirmed drift and risks:

- `memoryRepository.getNotesMemoryPeople()` selects `id, name, relation`, but
  remote `people` has no `relation` column. The intended fields appear to be
  `relationship` or `relation_label`.
- `CreatePersonInput` accepts `qr` and `invite`, while the committed
  `people_contact_source_check` permits only `manual`, `contacts`, `card`, and
  `link`. Applying that migration as written could reject current input.
- Remote descriptions mention `qr` and `invite`, but actual check constraints
  are unknown.
- Create code relies on database defaults for required `avatar_type`,
  `favorite`, `archived`, and `sort_order`; defaults are not in Git.
- The relation-key index in Git is global on `relation_key`, while most reads
  are owner-scoped. Index suitability requires query-plan review in Step 3.

### 4.3 `events` [R, C]

| Column | Type | OpenAPI required | Main use |
|---|---|---:|---|
| `id` | uuid | yes | Event primary key |
| `user_id` | uuid | no | Owner filtering in every current list |
| `title` | text | yes | Display title |
| `date` | date | yes | Date-only event date |
| `notes` | text | no | Event detail/context |
| `created_at` | timestamptz | no | Persistence metadata |
| `category` | text | no | Calendar/category rules |
| `is_important` | boolean | no | Brain eligibility |
| `recurrence_rule` | text | no | Date-only Event series rule: none, weekly, monthly, yearly |
| `person_id` | uuid | no | FK to `people.id` |
| `person_name` | text | no | Denormalized compatibility field |

Remote metadata describes `person_id → people.id` and `id` as primary key.

Confirmed drift and risks:

- `user_id` is not OpenAPI-required despite all current application reads being
  owner-scoped. Actual constraint/default must be checked.
- Dashboard CRUD uses only `id,user_id,title,date,notes,category` and does not
  write or read `person_id`, `is_important`, or `person_name`.
- Home repository also omits `person_id` and `is_important`; regular Events are
  therefore detached from Person context in Home.
- Event types are duplicated across repository, Brain, Home, Calendar, and UI.
- Dashboard depends on Realtime publication for `public.events`; publication
  status is unknown.
- No committed base-table or Event migration exists.

### 4.4 `memories` [R, C]

| Column | Type | OpenAPI required | Main use |
|---|---|---:|---|
| `id` | uuid | yes | Memory/Knowledge source key |
| `user_id` | uuid | yes | Owner |
| `person_id` | uuid | no | FK to `people.id` |
| `event_id` | uuid | no | FK to `events.id` |
| `content_text` | text | no | Long-form capture |
| `audio_url` | text | no | Owner-scoped private voice-note object path used by Notes |
| `transcript_text` | text | no | Optional transcript displayed and searched by Notes |
| `images` | text[] | no | Stored image paths/legacy URLs |
| `ai_summary` | text | no | Legacy AI metadata |
| `ai_tags` | text[] | no | Compatibility and controlled semantic tags |
| `ai_emotional_score` | numeric | no | Legacy metadata; no canonical authority |
| `created_at` | timestamptz | no | Ordering/evidence time |
| `updated_at` | timestamptz | no | Update time |
| `type` | text | yes | Open legacy type |
| `title` | text | no | Optional title |
| `value_text` | text | no | Short structured value |
| `occurred_on` | date | no | Domain occurrence date |
| `importance` | smallint | yes | Compatibility importance |
| `source` | text | yes | Capture source |
| `is_active` | boolean | yes | Active/archive compatibility state |

Remote metadata describes `person_id → people.id`, `event_id → events.id`, and
`id` as primary key. No `user_id` FK is exposed.

The remote shape matches `MEMORY_ROW_COLUMNS`, which is strong evidence that
the Knowledge compatibility repository targets the active schema correctly.
However, no migration in Git creates or evolves this table.

Risks:

- Canonical Knowledge state/classification cannot be represented losslessly in
  this legacy schema.
- Client writes and service-role writes coexist; RLS and explicit owner checks
  are critical but unverified.
- Notes hard-delete does not yet connect Storage attachment cleanup.
- Audio and transcript columns already exist, while the current UI does not own
  a complete voice-note lifecycle.

### 4.5 `subscriptions` [R, C]

| Column | Type | OpenAPI required | Main use |
|---|---|---:|---|
| `id` | uuid | yes | Subscription key |
| `user_id` | uuid | yes | FK to `profiles.id` |
| `status` | text | yes | Profile active-state check |
| `plan` | text | yes | Plan identifier |
| `source` | text | no | Billing source |
| `trial_end` | timestamptz | no | Trial lifecycle |
| `current_period_end` | timestamptz | no | Billing period lifecycle |
| `created_at` | timestamptz | no | Persistence metadata |

Remote metadata describes `user_id → profiles.id` and `id` as primary key.
Current UI only checks whether one active row exists. Billing authority,
uniqueness, checks, and server verification are not represented in Git.

## 5. Code-referenced tables absent or not exposed remotely

Absence from service-role OpenAPI means the table is not exposed in the
current public schema. It may be deleted, never created in this project, or
intentionally placed outside exposed schemas. Do not blindly recreate these
tables: each requires a retain/migrate/retire decision.

### 5.1 Core/product-adjacent candidates

| Table | Expected columns from code [C] | Current behavior/risk | Decision needed |
|---|---|---|---|
| `points_balance` | `user_id`, `balance` | Profile silently displays 0; `profiles.points` already exists | Retire reference or define one canonical points domain |
| `user_survey` | Private onboarding answers plus completion/reward metadata | Restored in production with owner SELECT only and an authenticated atomic save RPC | Complete foundation; future Memory ingestion must remain explicit and user-controlled |
| `user_special_dates` | Retired | Survey dates now create canonical yearly Events and retain only their managed Event IDs | Complete |
| `gift_requests` | `user_id`, `event_id`, `event_title`, `event_date`, `for_whom`, `gender`, `age`, `interests`, `occasion`, `budget_pln`, `anonymity`, `split_payment`, `delivery`, `notes`, `status`, `created_at` | Legacy concierge submission returns a persistence error | Keep only if concierge service remains in product scope |
| `ai_gift_cache` | Created in Stage 8.4 with `person_id`, `occasion`, `ideas`, `created_at`, `expires_at` | Seven-day server-only cache; invalidated when canonical Knowledge changes | Complete |
| `notes` | Confirmed absent in Stage 8.1 | Gift fallback retired; canonical `memories` owns Notes data | Complete |

### 5.2 Separate service/legacy candidates

| Table | Expected columns from code [C] | Runtime consequence | Decision needed |
|---|---|---|---|
| `reviews` | `id`, `created_at`, `name`, `email`, `message`, `source`, `published` | Public reviews cannot list or submit | Restore as isolated moderated service or remove route |
| `good_deeds` | `user_id`, `kind`, `city`, `visit_date`, `visit_time`, `message`, `consent`, `status`, `contact_email` | API insert fails | Separate service decision plus abuse/privacy design |
| `heaven_messages` | `user_id`, `type`, `recipient_email`, `recipient_name`, `delivery_date`, `message`, `file_url`, `status` | API insert fails; upload bucket is also absent | Separate service decision; do not mix with core care schema |
| `animations` | `id`, `replicate_prediction_id`, `status`, `result_video_url`, `error` | No active application consumer; former unsigned webhook now returns 410 without parsing | Retire at the database boundary or restore only with signed webhook and ownership model |
| `partner_holds` | `id`, `partner_id`, `amount`, `status`, `release_date`, `note` | No active application consumer; former auto-release route now returns 410 without reading secrets | Defer until partner/financial domain is intentionally designed |

These service tables belong outside the core person-care migration unless the
product explicitly retains their routes. Creating empty tables would make
errors less visible without making the services secure or complete.

## 6. Remote RPC functions [R]

| Function | Exposed method | Active code use | Status |
|---|---|---|---|
| `expire_trials` | POST `/rpc/expire_trials` | none | Definition, owner, schedule, and security unknown |
| `rls_auto_enable` | POST `/rpc/rls_auto_enable` | none | Operational purpose suggested by name but not verified |

Remote OpenAPI exposes no argument properties or return schema. The functions
were not invoked. Their definitions, grants, security-definer status, and
scheduled use require admin catalog inspection.

## 7. Storage inventory [S, C]

| Bucket | Remote | Public | Size limit | MIME restriction | Code status |
|---|---:|---:|---:|---|---|
| `avatars` | yes | yes | none reported | none reported | Active upload/remove/public URL |
| `memory-images` | yes | no | 10 MiB | JPEG, PNG, WebP, HEIC, HEIF | Active signed URL/upload/remove helpers |
| `memory-audio` | yes | no | 25 MiB | WebM, MP4/M4A, MP3, OGG, WAV | Active signed URL/upload/playback/remove lifecycle |
| `heaven-videos` | no | expected public URL | unknown | unknown | Active API expects it; upload fails before table insert when file exists |

Storage policies were verified through the linked database catalog. Memory
image and audio policies enforce the authenticated user id as the first object
path segment for SELECT, INSERT, UPDATE and DELETE.

Risks:

- Public `avatars` has no reported size or MIME restriction.
- `memory-audio` and `memory-images` are private, owner-scoped and have bounded
  MIME/size policies.
- The `heaven-messages` route uses service role and constructs a public URL for
  a bucket that does not exist remotely.

## 8. Auth inventory [S, C]

Remote public settings report:

- signup enabled;
- email provider enabled;
- email auto-confirm disabled;
- phone auto-confirm disabled;
- no other enabled external providers reported.

Current application flows include signup, password login, email confirmation,
password reset, update-password, and auth callback.

Configuration state at inventory time and its Step 3 resolution:

- Public-key selection was inconsistent across client constructors. Step 3
  centralized it in `src/lib/supabase/publicConfig.ts`: publishable key first,
  legacy anon key only as a compatibility fallback.
- Read-only anonymous OpenAPI requests using both locally configured public key
  variables returned 401. This does not prove authenticated SDK flows fail,
  because the metadata endpoint may have different access rules, but public-key
  configuration must be verified in a real auth smoke test.
- `.env.example` now documents all Supabase variables used by the app.
- `middleware.disabled.ts` means protected routes rely on client/page guards and
  RLS rather than active Next middleware.

## 9. Realtime inventory [C, U]

Dashboard subscribes to all `INSERT`, `UPDATE`, and `DELETE` changes on
`public.events` filtered by `user_id`. No other Realtime table subscription was
found.

Unknown:

- whether `events` is in the `supabase_realtime` publication;
- whether RLS is applied correctly to subscription delivery;
- whether replica identity supports expected delete payloads;
- whether reconnect and duplicate-delivery behavior is acceptable.

## 10. Access-path inventory

### Browser/client data access

Direct Supabase access exists in:

- Dashboard Event/People loading, CRUD, and Realtime;
- Profile loading and writes;
- Auth pages;
- Survey;
- Reviews;
- People Add;
- Care Add Memory;
- avatar components/hooks;
- Chat session-token acquisition;
- client repositories for People, Events, Profile, Memory, and Knowledge.

Browser writes depend on RLS for final ownership protection. Several repository
updates/deletes filter only by record ID and therefore require correct RLS even
when a preceding UI flow has authenticated the User.

### Service-role data access

Service role is used by:

- Knowledge server writes and owner-scoped reads;
- Gift Intelligence person lookup/cache;
- `heaven-messages`;
- Replicate webhook;
- partner-hold auto-release.

Service role bypasses RLS. Every such path must perform explicit ownership or
trusted-callback verification. Current Gift and Knowledge server paths include
explicit user/person scope. The separate service routes remain security debt.

### Publishable/anon server verification

Assistant identity, Gift API security, and Happy Learning build isolated
clients to validate supplied access tokens. Their publishable/anon fallback
logic is more current than `SupabaseProvider` and `good-deed`.

## 11. RLS, constraints, indexes, triggers, and grants [U]

The following could not be proven by PostgREST/Storage metadata:

- RLS enabled state per table;
- policy names and expressions;
- grants to anon/authenticated/service roles;
- `auth.users` foreign keys;
- delete/update cascade behavior;
- column defaults;
- check constraints outside the two local migration files;
- unique constraints;
- all indexes;
- triggers such as `updated_at` maintenance;
- Realtime publication membership;
- function definitions and `security definer` settings;
- Storage object policies;
- scheduled jobs/cron configuration.

These are mandatory inputs for Step 3. Authoritative evidence should be a
`supabase db dump`/schema export or read-only PostgreSQL catalog access. The
service-role REST key cannot safely substitute for database-admin metadata.

## 12. Gap and risk matrix

| Priority | Gap | Evidence | Impact |
|---|---|---|---|
| P0 | Full schema/RLS not in Git | Only two partial migrations | Backend cannot be reproduced or audited |
| P0 | RLS and grants unverified | Admin metadata unavailable | Client writes may be over- or under-permitted |
| P0 | Service-role routes lack complete trusted-boundary design | Active API code | RLS bypass combined with unauthenticated/unverified input |
| Resolved in Step 3 | Public-key configuration was inconsistent | Canonical resolver and contract tests | One deterministic selection rule now protects every inspected surface |
| P1 | Eleven referenced tables absent/not exposed | Remote vs code inventory | Runtime failures or silent fallback behavior |
| P1 | Notes selects missing `people.relation` | Remote column inventory | Person filters/editor context may load empty |
| P1 | Home/Dashboard ignore canonical Event person fields | Remote vs selected columns | Person-centred context is lost |
| P1 | `profiles.points` and `points_balance` conflict | Remote vs Profile code | Duplicate/failed points source |
| P1 | `heaven-videos` absent | Storage metadata | Upload route cannot work |
| P1 | Base table/default migrations absent | Git history | New environments cannot reproduce current writes |
| P2 | `memory-audio` exists without application ownership | Storage metadata | Unused infrastructure and undefined retention |
| P2 | Undocumented RPC functions | Remote OpenAPI | Unknown operational/security behavior |
| P2 | Realtime publication unknown | Code only | Calendar realtime reliability unproven |

## 13. Retain, migrate, or retire decision queue

Step 3 must not create every missing table. First record an explicit decision:

| Persistence target | Recommended direction |
|---|---|
| `profiles` | Retain and migrate canonically |
| `people` | Retain; reconcile defaults/checks and person-first constraints |
| `events` | Retain; require owner, use Person FK, canonicalize recurrence later |
| `memories` | Retain as migration source; add canonical fields only through approved Knowledge plan |
| `subscriptions` | Retain but defer billing expansion; document existing trial function |
| `points_balance` | Retire reference unless a real ledger domain is required; do not duplicate `profiles.points` casually |
| `user_survey` | Restored as private onboarding source; any future Knowledge promotion requires explicit confirmation |
| `user_special_dates` | Retired; canonical Events own these dates |
| `notes` | Retired in Stage 8.1; `memories`/Knowledge is canonical |
| `ai_gift_cache` | Restored in Stage 8.4 as a bounded server-only cache, not Knowledge |
| `gift_requests` | Product decision: retain isolated concierge or retire from core |
| `reviews` | Isolated public-content decision with moderation/RLS |
| `good_deeds` | Isolated service decision with consent, abuse protection, and retention |
| `heaven_messages` | Isolated service decision; do not create until security/storage lifecycle exists |
| `animations` | Retire or rebuild with verified webhook |
| `partner_holds` | Defer until a financial/partner domain is intentionally designed |

## 14. Required inputs and sequence for Step 3

### 14.1 Obtain authoritative admin schema evidence

Capture without user rows:

- public/auth-related schema DDL;
- policies and grants;
- functions and triggers;
- indexes and constraints;
- publications;
- Storage bucket/object policies;
- migration history table.

Secrets and user data must not be committed.

### 14.2 Classify missing surfaces

For each absent table/route choose:

- retain and migrate;
- migrate into a canonical existing domain;
- isolate as a separate optional service;
- retire code and UI.

### 14.3 Build a baseline safely

The baseline must reflect remote production without destructively recreating
objects. New migrations then add constraints/policies in small, reversible,
data-compatible stages.

### 14.4 Prioritize immediate contract corrections

Before broad feature work:

1. ~~unify publishable-key selection~~ — completed in Step 3;
2. ~~fix the missing `people.relation` projection~~ — completed in Step 3;
3. ~~decide `profiles.points` versus `points_balance`~~ — `profiles.points`
   selected and implemented in Step 3;
4. make absent optional services fail closed and visibly;
5. verify RLS for core tables and private Storage;
6. document and test Event Realtime publication;
7. document every service-role path.

### 14.5 Verification gates

- schema applies to an empty staging project;
- schema diff against the intended remote state is reviewed;
- ownership/RLS tests cover select/insert/update/delete;
- service-role APIs have explicit authorization tests;
- Storage policy tests cover owner and foreign paths;
- existing 630-test suite remains green;
- lint, typecheck, and production build pass.

## 15. Inventory limitations

This inventory is intentionally honest about missing evidence. It proves the
public schema and bucket shapes exposed through current read-only APIs and the
contracts present in source code. It does not claim RLS safety or full schema
reproducibility until Step 3 obtains database-admin metadata and verifies every
required object.

## 16. Step 3 implementation record

Implemented locally on 2026-08-03 without remote schema or data mutation:

- all inspected browser and token-verification clients now resolve public
  Supabase configuration through `src/lib/supabase/publicConfig.ts`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is canonical and the legacy anon key
  is an explicit compatibility fallback;
- Notes now selects `people.relationship` and `people.relation_label`, then
  maps them into its legacy `relation` DTO instead of querying a missing field;
- Profile now reads the remotely confirmed `profiles.points` and no longer
  queries the absent `points_balance` table;
- `.env.example` documents public and server-only Supabase variables;
- contract tests protect all four corrections.

Not implemented because current access cannot prove safety:

- baseline or corrective SQL migrations;
- RLS, grant, function, trigger, publication, or Storage policy changes;
- creation of any code-referenced missing table.

Those changes require a schema-only Supabase dump or read-only PostgreSQL
catalog access. A service-role REST key does not expose enough metadata to
reconstruct production safely.

## 17. Administrative catalog audit and pending hardening

Supabase MCP administrative access became available on 2026-08-03. A read-only
catalog audit confirmed:

- all five core public tables have RLS enabled;
- existing policies use broad `public` targets and per-row `auth.uid()` calls;
- Profiles has duplicate SELECT, INSERT, and UPDATE policies;
- authenticated clients can currently INSERT and UPDATE Subscriptions;
- authenticated Profile UPDATE privileges include the `points` column;
- `anon` and `authenticated` have legacy all-table grants including TRUNCATE,
  REFERENCES, and TRIGGER on every core table;
- `public.rls_auto_enable()` is SECURITY DEFINER and executable by `anon` and
  `authenticated`;
- `public.expire_trials()` has a mutable search path and is publicly executable;
- `events` is not present in the `supabase_realtime` publication;
- owner-scoped avatar Storage policies are absent;
- private Memory image/audio policies exist only partially;
- foreign-key covering indexes are absent for `events.person_id`,
  `memories.person_id`, and `memories.event_id`;
- remote migration history contains 17 entries while Git originally contained
  only two partial migration files.

The forward-only migration
`supabase/migrations/20260803181635_harden_core_rls_storage_and_realtime.sql`
was created to correct the proven security and contract gaps. It completed a
full transactional dry-run against production followed by `ROLLBACK`; no
remote change was persisted during that validation.

After explicit owner approval, the migration was applied to `happydate-prod`
on 2026-08-03 and recorded remotely as version `20260803181635`. Post-deploy
catalog verification confirmed:

- `anon` has no core table grants;
- authenticated clients have owner-scoped CRUD only for People, Events, and
  Memories, owner Profile read/insert plus column-limited update, and
  read-only Subscription access;
- authenticated users cannot update `profiles.points`;
- Subscription INSERT/UPDATE is unavailable to authenticated clients;
- the two operational functions are unavailable to `anon` and
  `authenticated`, and `expire_trials()` has a fixed `pg_catalog` search path;
- owner-scoped policies exist for Avatars, Memory Images, and Memory Audio;
- Events is present in `supabase_realtime`;
- all three missing foreign-key indexes exist.

The post-deploy Security Advisor reports only the project-level Auth setting
for leaked-password protection as disabled. This cannot be changed by the SQL
migration and remains a Dashboard configuration recommendation.

## 18. CLI linkage and migration-history reconciliation

Completed on 2026-08-03:

- initialized the repository with the official Supabase CLI configuration;
- authenticated a named local CLI profile and linked it to `happydate-prod`
  (`yzcvdspiiiaidsdripxr`);
- fetched all migration bodies from the authoritative remote migration history;
- removed the two obsolete `20260712_*` aggregate files that duplicated and,
  for `contact_source`, contradicted the timestamped production migrations;
- verified with `supabase migration list --linked` that all 18 local versions
  match all 18 remote versions exactly;
- did not run `migration repair` and did not modify the production migration
  history table.

An additional `db pull` schema-drift check reached shadow-database creation but
could not provision the local shadow database because Docker/`pg_dump` is not
installed on this Mac. This does not affect the completed migration-history
reconciliation. It remains a local tooling prerequisite for generating and
testing a full clean-room schema baseline.

Leaked-password protection was also tested through the Auth Dashboard. Supabase
rejected the setting because `HappyDate` is currently on the Free plan; the
feature is available on Pro plans and above. The unsaved toggle was reverted,
and no billing or plan change was made.

## 19. Step 4 reminder lifecycle foundation

Migration `20260803184825_create_reminder_lifecycle.sql` was applied to
`happydate-prod` on 2026-08-03. It introduces an occurrence-scoped Reminder
record with explicit `pending`, `snoozed`, `completed`, and `cancelled` states.
Completion belongs to one Event occurrence and therefore does not suppress the
same recurring birthday in a future year.

The table has:

- a unique `(user_id, event_id, occurrence_date, action_kind)` identity;
- state/timestamp consistency constraints;
- indexed owner/due-time and Event foreign-key access paths;
- owner-only SELECT, INSERT, and UPDATE policies;
- an additional same-owner Event check on INSERT and UPDATE;
- no `anon` access and no authenticated DELETE grant.

Reminder delivery attempts, device tokens, quiet-hour preferences, and push
providers are intentionally not stored in this table. They remain later,
separate operational domains so a notification delivery can never be confused
with a User-confirmed care action.

## 20. Home reminder action integration

Migration `20260803185603_canonical_birthday_event_occurrence.sql` adds a
canonical Event occurrence identity across owner, Person, date, and category.
Production contained no conflicting duplicates before the index was applied.

Home now:

- converts a synthetic `people.birthday` occurrence into an idempotent owned
  Event before creating its Reminder;
- creates or reloads one Reminder for the featured important occurrence;
- persists complete, three-hour snooze, and undo actions through the Reminder
  repository under RLS;
- shows completion and snooze state on the featured card;
- opens Happy Chat with a localized, person-named gift-selection prompt;
- keeps initialization/action failures local to the Reminder controls instead
  of failing the rest of Home.

This stage does not send push notifications. It establishes the User-visible
action loop that notification delivery will consume later.

## 21. Reminder preferences and delivery outbox

Migration `20260803190256_reminder_preferences_and_delivery_outbox.sql` adds:

- owner-controlled IANA timezone, quiet-hour window, and bounded repeat cadence;
- an idempotent Reminder Delivery outbox separate from Reminder completion;
- authenticated read-only visibility of a User's own delivery evidence;
- a `private.queue_due_reminder_deliveries` scheduler function available only
  to `service_role`;
- quiet-hour evaluation in the User's timezone, row locking with `SKIP LOCKED`,
  and atomic advancement of the next reminder time.

The `/settings/reminders` screen persists these preferences with five-locale
copy. Push remains disabled by default. Migration
`20260803190836_activate_reminder_cron_and_in_app_delivery.sql` subsequently
enabled `pg_cron`, scheduled the queue function every minute, and added the
authenticated in-app delivery-consumption boundary. It does not transmit push.

## 22. Push device registration foundation

Migration `20260804154538_create_push_device_registration.sql` was applied to
`happydate-prod` on 2026-08-04. It adds a private-by-default device-token store,
authenticated registration/disable boundaries, and extends the existing Cron
scheduler so push deliveries enter the outbox only when the User opted in and
has an enabled native device.

The mobile shell now includes Capacitor Push Notifications for iOS and Android.
Permission is requested only after an explicit toggle in Reminder Settings;
web users are not prompted. iOS forwards APNs registration callbacks through
Capacitor and has the Push Notifications entitlement. Android creates a
high-importance `happydate-reminders` channel.

This stage intentionally does not transmit queued push deliveries. APNs/FCM
provider credentials are not stored in the repository and must be configured
before a service-only delivery worker can be deployed. Push remains opt-in and
disabled by default until native registration succeeds.

## 23. Server-side push dispatcher

Migration `20260804161414_add_push_dispatch_claims.sql` adds retry scheduling
and opaque provider acknowledgement storage to the push delivery outbox. The
`dispatch-push-reminders` Edge Function is restricted to Supabase secret-key
callers and delivers Android tokens through FCM HTTP v1 and native iOS tokens
through APNs token authentication.

The dispatcher claims each delivery with an optimistic status transition,
recovers abandoned processing rows, retries transient failures at most three
times, and disables device tokens only when APNs or FCM explicitly identifies
them as invalid. Provider credentials and full device tokens are never logged.
The function remains safe but operationally dormant until the Apple and
Firebase secrets are configured and a protected schedule invokes it.

## 24. Optional event location foundation

Migration `20260816152306_add_optional_event_location.sql` was applied to
`happydate-prod` on 2026-08-16. It adds a nullable, human-readable `location`
field to owned Calendar events with a database-enforced 1–300 character bound.
Existing Event RLS continues to provide row ownership; no new grants, policy,
function, index, or public surface was introduced.

Calendar create/edit, Realtime mapping, recurrence projection and ICS
import/export preserve the value. Home loads it through the existing
owner-filtered repository, and Assistant receives only the server-reloaded,
bounded location rather than trusting private event context from the client.
This is deliberately a place label, not background location tracking or device
geolocation. Travel-time calculation remains a later, explicit-consent feature.

## 25. User-confirmed pre-event travel buffer

Migration `20260816153214_add_optional_event_travel_buffer.sql` was applied to
`happydate-prod` on 2026-08-16. It adds a nullable integer
`travel_buffer_minutes` to owned Calendar events and enforces an explicit
5–240 minute bound in Postgres. Existing Event RLS remains unchanged; the
migration adds no grant, policy, function, index, provider integration or
public access surface.

Calendar create/edit, Realtime mapping and ICS import/export preserve the
confirmed value. The day planner reserves it immediately before the event,
includes it in conflict checks and reports travel separately from focus time.
Home voice briefings and Assistant context may mention only the value reloaded
through owner-filtered server data. HappyDate does not infer a route, inspect
device location or track movement; automatic travel estimates remain deferred
until origin, destination, transport, provider and consent are designed.
