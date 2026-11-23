# HappyDate release readiness — 2026-11-03

> The 2026-11-03 report below is historical and superseded for current release
> disposition by this dated update. Its original findings are retained verbatim.

## Engineering audit update — 2026-11-08

**Disposition: NO-GO pending historical credential security review.** This is a
bounded release audit, not a claim that every screen, device, or provider has
been exhaustively verified. Baseline application: `0c05a4df8c01a0769ab587bccd8f96531ee02d14`
on Draft PR #21. Production remains `6f193f601f7e1640c20f6529f883bd933b088a16`
on READY deployment `dpl_3qiFK4y7AsqnPa3P9wkqLR7jTcgf` at the last inspection.

### Evidence and limits

| Area | Evidence | Scope / remaining limit |
| --- | --- | --- |
| Baseline CI | [41906824388](https://github.com/bilohlazova/happydate/actions/runs/41906824388), all five Quality Gate jobs PASS | Exact baseline only; a new commit needs its own gate |
| Local baseline | Node 24.21.0 locked install and `npm run verify`: lint/typecheck PASS; 1420 tests, 1408 PASS, 12 skipped; 15 synthetic Assistant scenarios validated | Database tests and live AI were not exercised by this local command |
| Security tests | `npm run test:security`: 55 PASS, zero skipped | Mix of behavioral unit and source-contract tests; not a penetration test |
| Audit candidate local checks | After SEC-02/CI-01: `npm run verify` PASS (1408 PASS, 12 DB skips), security 55/55 PASS, optimized build and local HTTP runtime smoke PASS on Node 24.21.0 | Build compile 8.8s, TypeScript 10.0s; initial sandbox font-DNS/loopback restrictions required rerun with normal local network permissions |
| Audit candidate DB behavior | Clean local Supabase migration replay; corrected `npm run test:integration` executed three times: 13/13 PASS each, zero skipped | Separate synthetic project `happydate_audit_20261108` on port 55432; no Production/Staging DB touched |
| Static dependency graph | TypeScript AST import/export scan: 522 modules, 892 local edges, zero strongly connected groups | Excludes dynamic imports, require calls, unresolved/external modules and runtime-only dependency behavior |
| Build asset baseline | 109 emitted JS files, 2,417,634 total raw bytes; largest chunk 242,805 bytes / 66,972 gzip | Sum of all emitted chunks is not per-route transfer size or a mobile performance score |
| Notes/Knowledge | [41891341365](https://github.com/bilohlazova/happydate/actions/runs/41891341365) on app `d98fc6ced9eb9e75f862c5aaac908de2b5fdbfaa`: one Chromium scenario PASS | Desktop, Android-like and 320px mobile interactions; not native iOS/Android or full Deep QA |
| Media lifecycle | [41869695428](https://github.com/bilohlazova/happydate/actions/runs/41869695428), app `1caee102e9542a28dc8d0a5813775b07af54a2e2` | Earlier application evidence, not a fresh full-candidate end-to-end run |
| Backup / restore | Local 2026-11-07 encrypted package and restore manifest: 74 tables, row counts/checksums, policies, constraints, five files / 9,682,474 bytes; restored file SHA-256 PASS | Public/auth/storage/private schemas, roles and extensions; local network-none Supabase 17.6; `--no-owner`; role passwords, JWT/provider settings, original ownership and live Auth flows not certified |
| Backup presence | Three encrypted components and manifests re-inventoried on the Mac; ciphertext hashes captured | Backup is outside Git; retain the original encryption password securely after DB-password rotation; no new destructive restore was run for this audit |
| Production schema | Core runtime column/type contract passed against Production in the preceding read-only verification | Not a claim that every optional future table exists |
| Historical alias | Vercel `protectionBypass: {}` after revocation on 2026-11-07; anonymous GET redirects 302 to `vercel.com` | URL override is closed, not proof of historical credential isolation |
| Production reachability | Anonymous main-domain GET 200 | Existing deployment only; no authenticated/destructive Production test |

### Confirmed findings and disposition

| ID / priority | Location and reproduction | Impact / action / change risk | Verification |
| --- | --- | --- | --- |
| SEC-01 / P1, open | Historical `codex/staging-block-b` deployment/environment; former alias override and retained server credentials | Historical Production credential equivalence/exposure cannot be excluded. Current empty Sensitive API responses are unreadable, not proof of different or absent keys. Require provider/deployment evidence or a separately approved bounded rotation. No rotation performed. | Alias revocation and anonymous denial confirmed; credential-history gate remains open |
| SEC-02 / P1, fixed in audit | `src/lib/supabase/environmentSafety.ts`: PR21 branch absent from strict release set; `assertEnvironmentSafety` returned `other-preview-unverified` for it | Could accept opaque keys or privileged providers on the release branch. Add only this branch to existing Staging-only policy; low change risk, Production policy unchanged | Expanded `tests/release-preview-isolation.test.mjs` fails before fix, passes after; rejects each provider canary without logging it |
| CI-01 / P2, fixed in audit | `scripts/test-integration.mjs`: CLI diverged from CI serial three-file DB boundary | Keep repair rehearsal and RLS tests serial against shared disposable DB. No migration/RLS change | Same `--test-concurrency=1` and files as Quality Gate; three local runs, each 13/13 PASS with explicit flags |
| ARCH-01 / P2, deferred | `PersonProfileContent.tsx` (1266 lines), `NotesPageContent.tsx` (1770), `ChatAssistantModal.tsx` (752); direct Supabase CRUD remains in Profile, Survey, Reviews, Wellbeing | UI/application boundaries are incomplete despite target architecture. Extract only behind characterized behavior in follow-up PRs; broad pre-release rewrite is high risk | Source inventory; no claim of cycle-free or fully migrated application |
| A11Y-01 / P2, deferred | AboutPersonSection portal declares modal semantics, but no dedicated focus trap/return or Escape handler | Touch overlap is fixed; complete keyboard modal behavior still needs a scoped accessibility change and browser test | Source review; WCAG 2.2 AA compliance not certified |
| DATA-01 / P2, deferred | `knowledgeRepository.ts` list reads have no explicit paging; loadPeoplePage also loads all knowledge | Large-workspace completeness depends on API row caps. Add paginated characterization fixtures before changing list semantics | Source review; >100-person scoped lookup has separate tests, not proof of >1000 Knowledge retrieval |
| DOC-01 / P2, fixed in audit | `docs/ci-quality-gate.md`, `docs/production-smoke.md`, README and historical release/security reports | Correct parallel job ordering, five-job gate, explicit local build flag, DB skips and implemented/verified/deployed distinction | Cross-checked against workflow, package scripts and live evidence |

Architecture review traced canonical Knowledge mapping, owner-scoped People
loaders, signed capture confirmation, Journal AI exclusion, bounded Assistant
context, and media persist-before-cleanup paths. Direct `memories` persistence
reads found by source search are confined to the canonical repository. Exact
`any`/TypeScript suppression patterns were not found in the scanned `src` files;
this is not proof that every assertion or DTO is safe. Source-contract tests do
not replace authenticated browser or RLS behavior tests.

Commit-ancestry checks confirmed that the inspected heads of PR #14, #16, #17,
#18 and #20 are already ancestors of baseline #21. They must not be cherry-picked
or independently squashed into the candidate again. All six PRs remained open
at inspection; safe future integration must preserve this existing ancestry.

Unverified for this audit: real signup/confirmation/recovery delivery (SMTP is
deferred), full authenticated Calendar/Gift/Home scenarios, physical devices,
push, provider quality/cost under live traffic, dynamic/runtime dependency-cycle
analysis, React rerender profiling and slow-network behavior. Do not label these
PASS. Build/chunk sizes are a baseline only, not Core Web Vitals or device results.

### Bounded credential response requiring separate approval

1. Inventory consumers for Supabase privileged keys, OpenAI and Redis, including
   Production, Development and historical branch overrides. Retain only metadata
   or in-memory equality results, never secret-bearing evidence artifacts.
2. Review available deployment snapshots and provider usage/audit metadata. A
   protected URL does not establish that old credentials were never shared.
3. If isolation cannot be established, propose replacement per provider: scoped
   non-Production credentials first, update approved consumers, validate health,
   then revoke old credentials. Supabase legacy JWT rotation needs an explicit
   Auth/session/anon dependency plan; creating a new key alone does not revoke it.
4. Do not change credentials, Development/Production env scopes, SMTP or
   Deployment Protection as part of this audit without separate approval.

Rollback candidate remains the previous READY Production deployment above.
No new Production migration is authorized by this audit. Code rollback is not
a database rollback; any future schema change needs backward-compatibility and
restore review. The encrypted archive is local recovery evidence, not automatic
PITR or an independently managed off-device backup.

### Follow-up engineering milestones

1. Close SEC-01 with evidence or an approved provider-by-provider credential plan.
2. Complete fact-dialog keyboard/focus behavior and large-Knowledge pagination.
3. Add authenticated staging coverage for Calendar/Gift/Home and account deletion;
   retain browser/device/provider distinctions and cleanup evidence.
4. Profile bundles, slow-network interaction and content-free production alerts;
   set budgets after measuring representative routes.
5. Migrate remaining direct UI persistence incrementally; keep the existing domain
   taxonomy and use one canonical action/ownership boundary per feature.

## Historical report — 2026-11-03

**NO-GO for unconditional release pending hosted verification.** Local commit `b040702` is extended by the media-lifecycle batch below; it is not deployed until the single requested push and final CI run.

| Check | Status | Confirmed evidence |
|---|---|---|
| Avatar browser upload/replacement | FAIL deployed / PASS local fix | `53dc719` opens the picker but `fetch(blob:)` is blocked by `connect-src`. Local fix uses Camera FileReader data URL on web, decodes bytes without fetch, retains native URI handling and unchanged CSP. Actual PNG upload, display and replacement passed on localhost with Staging backend. |
| Avatar deletion / replacement cleanup | PASS local / BLOCKED hosted | Replacement now persists the new reference before old-object cleanup, removes an upload orphan on profile-save failure, reports cleanup failures, and exposes an accessible Remove avatar action. Hosted Staging verification still required. |
| Private Memory browser upload/replacement | PASS | Real native file picker, save through app, loaded private signed image, edit/remove old attachment/add replacement/save all passed. Tested using synthetic PNGs only. |
| Private Memory physical deletion | PASS local / BLOCKED hosted | Update/delete now snapshot prior images, unlink first, remove only owner paths no longer referenced by any owned memory, and surface Storage failures. Hosted Staging verification still required. |
| Other-user / anonymous access | PASS | B cannot read/sign private A image, replace/delete either A media object, or read A Memory row. Owner download remains successful after rejected B deletion. Public avatar read is intentional. Separate Android account gets `Person not found` for A contact. |
| iPhone viewport smoke | PASS | DevTools iPhone 16, actual DOM `393×852`: login, onboarding→Home, People/create contact, Calendar/create event/day view, Memory signed image, Gifts, EN→UK/reload. Inspected layouts have document width equal to viewport. Browser viewport override alone did not work; native DevTools did. |
| Android viewport smoke | PASS | Pixel 9, actual DOM `412×924`: login, complete onboarding→Home; Home, People, Calendar, Memories, Gifts and UK→EN/reload. This is Chromium responsive/device emulation, not real iOS Safari or Android hardware testing. Temporary emulation restored to desktop. |
| Signup email | BLOCKED | Real signup on the owner-provided test Gmail address returned `429`, Auth log code `over_email_send_rate_limit` at 2026-11-02 19:46:20 UTC; no account created. Custom SMTP was off. No admin-created account or simulated letter is counted as email delivery. |
| Known old bypass | FAIL / REVOKE recommended | Alias still maps to `dpl_4QWueWP1mnN5VqQj4SkUpvLAS6bM`, one `alias-protection-override`; fresh unauthenticated IAB loads HappyDate landing without token. No current need for this historical access is established. Revocation not performed. |
| Historical Production credentials | BLOCKED owner decision | Metadata only, no decryption: current generic Preview no longer targets privileged keys; branch overrides remain for old staging-block-b; Supabase service-role/OpenAI also target Development. Old artifact contents/key equality and misuse remain unproven. Recommend precautionary replacement/revocation planning, not a claim of compromise. |
| Final baseline CI | PASS (unchanged) | [Exact `53dc719` run](https://github.com/bilohlazova/happydate/actions/runs/41511875936), including hosted iOS. It does not certify the new local avatar fix. No full rerun. |
| Synthetic cleanup | PASS | Owner-confirmed four PNGs and three synthetic accounts deleted through Dashboard Storage/Auth APIs; two zero-byte folder placeholders created by Dashboard were also removed. Read-only checks show zero test Auth/profile/people/event/Memory/survey rows and zero Storage objects. Real account untouched. |

## Minimal fix and validation

`src/hooks/useAvatarUpload.ts`: web uses `CameraResultType.DataUrl`/FileReader and converts base64 to Blob directly. Native keeps `Uri` and bridge fetch. Replacement persistence precedes old-object cleanup with orphan cleanup on failure; Profile exposes removal. `memoryRepository.ts` now performs owner/reference-aware physical cleanup and reports failures. No CSP/header/permission/RLS/provider change.

Targeted avatar and HTTP security-header tests: 8 pass; ESLint and TypeScript passed. Web regression failed before the fix, passes after; exact file bytes and native URI path are checked. No dependency change, npm audit, full build, native build or full gate was run in this continuation.

## Required decisions / remaining work

1. Review/publish the minimal avatar fix through the existing PR #20 and recheck the deployed upload; it remains local to avoid automatically triggering another full CI. Do not treat the green `53dc719` baseline as validation of this fix.
2. Define and implement physical media removal semantics: explicit avatar removal, cleanup of superseded public avatars, and deletion of removed private Memory objects. Retain ownership checks, report cleanup failures and avoid deleting shared/referenced legacy objects blindly. The current app demonstrably retains removed files.
3. Configure an isolated Staging SMTP provider/sender with appropriate test recipient delivery, then perform one real signup→received letter→confirmation→login. Do not add recipients as privileged organization members merely to bypass default SMTP restrictions. [Supabase SMTP limitations](https://supabase.com/docs/guides/auth/auth-smtp).
4. **REVOKE** the known historical alias override after owner authorization, then verify anonymous denial. Alias: `happydate-git-codex-s-bb8c52-bilohlazovamari-gmailcoms-projects.vercel.app`. Its stale app is publicly reachable and provenance of its privileged branch overrides is uncertified; current candidate has a separate authenticated Preview. No bypass value disclosed.
5. Approve a bounded precautionary rotation plan for potentially inherited Production `SUPABASE_SERVICE_ROLE_KEY`, Upstash Redis REST token, and OpenAI API key if historical sharing cannot be excluded. First inventory consumers/provider usage metadata, separate non-production credentials, update approved consumers, validate, then revoke old credentials. Legacy Supabase service-role JWTs require a separate dependency/session-aware deactivation plan; creating a new modern key alone does not revoke the legacy key. Public anon/publishable keys are not themselves secrets requiring emergency rotation. Redis URL alone is not the bearer secret. No key values were opened and no credentials changed.

No main/release merge, Production write/deployment/config change, Vercel credential/protection change, new live Staging migration, old deployment deletion or key rotation was performed.

## Exact applied payloads

| Operation | Remote version | Guarded query SHA256 |
|---|---|---|
| Survey reconciliation | `20261102190934` | `9d14ec9dd5108e0339df0118ad64e6df50770243c6eb97c3bd99cfd8e798ee70` |
| Media provisioning | `20261102191356` | `b8627d23fa134a98a8ec11d4d2631927b0d3c5ab51c25d76ade14a558150c44c` |

Source hashes, original names and approved commit `d263b92` are in the manifest. Guarded reconstruction remains available for independent review, explicitly labelled already applied; do not reapply it.
