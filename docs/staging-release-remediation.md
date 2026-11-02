# HappyDate remaining release blockers — 2026-11-02

Scope: continuation of Draft PR #20 at `842735c08cd2c454affc5c8873c730e1c409e404`. Only Staging RPC/media reconciliation, hosted iOS evidence and historical Preview inventory. **NO-GO remains until the approved live Staging operations and remaining validation/risk decisions complete.**

No live Staging/Production writes, deployments, alias/protection changes, key rotation, merge, CI rerun or workflow dispatch were performed. Local DDL/testing uses the existing isolated localhost `supabase_db_toto`; synthetic SQL cases roll back and API cases clean up their own users/files.

## 1. Exact Staging correction prepared

Read-only comparison of `pg_get_functiondef` and metadata confirms:

| Source | Definition MD5 | Behavior |
|---|---|---|
| Live Staging `xgelazzdgluuenqkymox` | a6896078c41547ddfa8c3c550b2896fb | A non-NULL dates array first DELETEs referenced owned Events. Existing links can be nulled/cascaded. `events.survey_origin` is absent |
| Live Production `yzcvdspiiiaidsdripxr` | dfaff7c3494447cf64a5cef4c06b68c5 | Retains legacy/user Events; updates only explicitly marked survey Events, keeping IDs |
| Repository canonical `20261020153546` / local canonical function | 7eaa3305ec50272890cd4b73ac16f897 | Same executable function body as Production after removing line comments and token whitespace (quoted strings retained) |

The three MD5s fingerprint full PostgreSQL definition text; comment differences explain canonical/Production inequality. They are drift checks, not cryptographic attestation. No live user rows were read to compare bodies.

**Forward-only migration 1:** `supabase/migrations/20261102183848_reconcile_survey_event_preservation.sql` is intentionally the exact canonical `20261020153546` source with two explanatory header lines. A regression checks byte equality of the canonical portion. This is an additive reconciliation for already-divergent Staging, not an edit of historical files. It adds the nullable provenance column, replaces the RPC and reapplies explicit authenticated-only grants. It contains no backfill and executes no user-row DML during deployment.

**Forward-only migration 2:** `supabase/migrations/20261102183850_provision_release_media_buckets.sql` provisions/upserts metadata and recreates only the eight reviewed avatar/image ownership policies. It never deletes objects or edits their references. Existing private avatar buckets cause a hard stop instead of exposure.

| Bucket | Privacy | Max bytes | Allowed MIME | Access |
|---|---|---|---|---|
| avatars | Public, matching existing `useAvatar.ts`/getPublicUrl and Production behavior | 5,242,880 (5 MiB) | image/jpeg, image/png, image/webp, image/heic, image/heif | Public serving intentional; authenticated object management restricted to `<auth.uid()>/...` |
| memory-images | Private | 10,485,760 (10 MiB) | same five image MIME types | Authenticated owner access, or time-limited owner-created signed URL; no anonymous/public serving |

SVG/HTML/other MIME types are not allowed. Content-type allowlisting is not malware scanning. The avatar 5 MiB/MIME restrictions are deliberately stricter than current Production's unrestricted metadata; they are part of the Staging proposal, not a Production change. Existing Production/media objects are untouched. The global Storage upload limit must be at least 10 MiB (verify in Staging Dashboard before approval).

Both live environments currently have the same 16 Storage object policies; Staging has neither target bucket. SELECT/INSERT/UPDATE/DELETE for the two target buckets use first-path-segment ownership and `TO authenticated`; UPDATE has both USING and WITH CHECK. No anon write grants are added. Other eight policies/buckets remain unchanged.

### Exact approval and application procedure

Review these sources plus generated payloads before authorizing. `node scripts/prepare-staging-release.mjs` only prepares JSON files; it has no network/apply capability.

| Operation, in order | Source SHA256 | Prepared query SHA256 |
|---|---|---|
| 20261102183848_reconcile_survey_event_preservation | 2029d4966e7915d2b1832a9563dee57a41d039dd8e06b4bd67880132bc071a1e | 9d14ec9dd5108e0339df0118ad64e6df50770243c6eb97c3bd99cfd8e798ee70 |
| 20261102183850_provision_release_media_buckets | 5e9c04193aaaf45e2789749b03880f9cccc910c462576db3b9a9ced642ba44bd | b8627d23fa134a98a8ec11d4d2631927b0d3c5ab51c25d76ade14a558150c44c |

Prepared files: `/tmp/happydate-staging-release/<operation>.json`; each contains exactly `project_id: xgelazzdgluuenqkymox`, `name: <operation>`, `query: <preflight + preservation snapshot + source + preservation assertion>`. Recreate them with the generator if temporary files expire; compare hashes. These contain SQL only, no credentials/user rows.

After **separate explicit owner permission**:

1. Reconfirm the connected project is **happydate-staging / xgelazzdgluuenqkymox**, global Storage cap, target bucket metadata and function fingerprint. Never use the Production project ID. Review the approved commit/source hashes. Keep a maintenance window with synthetic/browser writers paused; do not disable auth/RLS/CI or scheduled Production jobs.
2. Call Supabase **apply_migration** with the first JSON payload; it must run as one transaction. It accepts only the reviewed old Staging or canonical function fingerprint, SECURITY DEFINER with empty search_path, no anon EXECUTE, authenticated EXECUTE, Storage RLS enabled and no additional unreviewed Storage policy names.
3. Read back function hash (expected canonical `7eaa3305ec50272890cd4b73ac16f897`), column and grants. Stop on any mismatch. Then apply the second JSON payload transactionally and inspect bucket metadata and all eight policy expressions/roles. The second call is independently repeatable after the first succeeds.
4. The wrappers lock the seven affected row-bearing tables in SHARE mode, capture counts and deterministic per-row aggregate fingerprints, then abort if any rows change. Events normalization permits only adding a NULL `survey_origin` column; existing values are still compared. Lock timeout 5 s / statement timeout 60 s bound contention. Only aggregate status is emitted; no PII in logs/artifacts.
5. Record the two newly assigned remote migration versions/names and source hashes. Management API timestamps can differ from repository versions; the name includes the repository version for reconciliation. **Append new migration records through apply_migration; never rewrite/repair the old ledger. Do not run db push or migration up --linked**, which could replay unrelated missing historical migrations or Staging-only backfill.
6. Use separately approved isolated Staging test accounts/objects for the five browser cases below, then record outcomes. Do not use Production data or providers.

Failure/recovery: any SQL/preservation failure aborts that operation's transaction; retain the prior state. If operation 2 fails, operation 1's non-destructive corrected RPC can remain while Storage is corrected and retried. After a successful repair, do not downgrade to the destructive old RPC. The package does not undo historical event deletion or reconstruct data already lost; any such restoration needs a separate evidence/backup plan. Metadata backout after real uploads requires a new proposal and must not delete bucket contents. New strict policies fail closed rather than relaxing access for a green test.

## 2. Local proof, only targeted checks

- `RUN_LOCAL_SUPABASE_RLS_TESTS=1 node --test tests/staging-release-repair.test.mjs`: **5 pass, 0 skips**. The before case loads the read-only old Staging function fixture and removes `survey_origin` inside a transaction to mirror live Staging. It reproduces legacy Event deletion. The repaired case applies the candidate twice and uses the actual approval snapshot/assert SQL; existing legacy/foreign Events and Memory/Gift/Task links survive. NULL, empty, nonempty and shortened lists are covered; marked Event IDs remain stable; no repeat reward; grants remain restricted.
- Storage metadata/policy DDL repeats twice with a pre-existing sentinel object; object rows and unrelated buckets are unchanged. Drift, unsafe grants, unknown policies and attempted exposure of a private avatar bucket are negative tests.
- `ALLOW_LOCAL_RELEASE_REPAIR=1 node scripts/rehearse-staging-release.mjs`: local-only DDL applied twice, transactionally; counts/fingerprints of all existing Events, Memories, Gifts, Tasks, survey, profiles and Storage objects unchanged. This tests repeat application to the already-corrected state as well as the before/after transactional case.
- `LOCAL_SUPABASE_WORKDIR=/tmp/happydate-local-status npm run test:auth:local`: two temporary users; signup/local confirmation, profile/onboarding, login/refresh/logout/relogin, owner CRUD and foreign CRUD rejection **passed**, cleanup passed.
- `LOCAL_SUPABASE_WORKDIR=/tmp/happydate-local-status node scripts/audit-local-storage.mjs`: real localhost Storage HTTP owner upload/download/upsert/delete; foreign insert/upsert/list/delete rejection; private B/anon download and B signing rejection; owner signed URL works; public avatar URL works; private public URL fails; SVG and >5/10 MiB uploads rejected. **Passed**, all attempted object paths and temporary users cleaned through Storage/Auth APIs, no direct SQL object deletion.
- Four relevant existing onboarding/ownership/RLS scenarios selected with `--test-name-pattern='onboarding survey RPC|ownership and cross-reference|profiles, gifts'`: **4 pass**. Existing CI quality contracts: **4 pass**. Changed JavaScript ESLint and `git diff --check`: pass.
- Future DB job includes `tests/staging-release-repair.test.mjs` so new tests will execute with the real local-DB flag in the next approved release gate. No required check renamed, disabled, skipped or fabricated.

No full test suite, mobile build, npm audit, web build or full CI was rerun: their code/dependencies have not changed here. No TypeScript/app component changed. The Supabase changelog and current Storage docs were checked; no new Auth/RLS/Storage API model was introduced.

## 3. Hosted iOS blocker closed without rerun

[Run 41501098486](https://github.com/bilohlazova/happydate/actions/runs/41501098486) is **completed/success** on exact `842735c08cd2c454affc5c8873c730e1c409e404`, including hosted iOS job **125468491614** on **macos-15**, runner **GitHub Actions 1000000402**. Run created 18:29:42 UTC; iOS started 18:34:46; completed 18:36:11. Roughly 5m04 between run creation and iOS start, then 1m25 execution. All other required jobs also succeeded.

Evidence supports a transient runner-allocation delay; GitHub's internal capacity/quota cause is **not proven**. The workflow's concurrency group is `quality-${github.workflow}-${github.ref}` with cancel-in-progress. It cancels older runs of the same PR ref, not jobs within one run; four Linux jobs ran while iOS waited. There is no native `needs:web-quality` dependency. This was not a workflow-level concurrency wait, unsupported runner label or Xcode failure. Do not change the runner randomly or substitute local status.

Repo is public and [standard hosted runner usage is free for public repositories](https://docs.github.com/en/actions/concepts/billing-and-usage); account-specific [macOS concurrency/runner limits](https://docs.github.com/en/actions/reference/limits) still apply. Billing balances, account-wide jobs and admin Actions settings are not exposed by the connector: the focused `/actions/permissions` request was rejected as an unsupported endpoint; the earlier browser fallback was logged out. No quota exhaustion was established.

No owner action is needed to close this successful iOS check. If queues recur, the owner should check account-wide running macOS jobs, Actions billing/spending/limits and repository Settings → Actions/runner policies; correlate job timestamps with GitHub Status. If these are normal, send GitHub Support the run/job IDs, label and allocation window. Do not rerun the entire workflow, buy capacity or change runner architecture without that evidence. A final check for the future approved code head will still be required.

## 4. Old Preview inventory and safe cleanup proposal

Full sanitized inventory: `docs/release-evidence/preview-inventory-2026-11-02.json`. Two deployment-list pages returned **115 retained deployments: 95 Preview, 20 Production**. Every deployment's alias endpoint was checked; project alias list has **22 aliases** (19 Preview, 3 Production). Deleted artifacts and historical environment-value snapshots are not available.

**81 READY Previews predate generic environment correction at 2026-11-02T17:56:32.146Z.** They are candidates for exposure review, not proof that all contain Production keys: PR14 and staging-block-b had branch overrides at different times. Older generic branches could inherit Production Supabase/service-role and Redis; old public-key exposure has not been ruled out. No private user rows or decrypted environment values were requested. Returned alias metadata was reduced to hostname/count/scope/timestamps before reporting; no key, JWT or bypass-token value was printed or saved to repository artifacts.

Current env metadata again confirms generic Preview gets only separate public URL/publishable-key entries, not privileged providers; Production service-role/OpenAI still also target Development. Branch-specific provider overrides remain for PR14 (historically disabled) and staging-block-b (provenance not certified). Current metadata cannot rewrite or prove old artifact snapshots.

Protection remains Vercel Authentication `all_except_custom_domains`, trusted-IP feature off. One nonempty alias bypass record exists:

- Alias `happydate-git-codex-s-bb8c52-bilohlazovamari-gmailcoms-projects.vercel.app`, deployment `dpl_4QWueWP1mnN5VqQj4SkUpvLAS6bM`, branch `codex/staging-block-b`, deployment created 2026-10-20T16:04:53.109Z / SHA `2f6d38fca1e4f1280e756734756fe0e2d0eba1d7`.
- Returned scope `alias-protection-override`, createdAt `1792230921831`; no expiry is returned. Treat access status/expiry as requiring owner review, not proof of a perpetual or currently active token. Values/identifiers of bypass secrets are omitted.
- Other 21 aliases have no nonempty bypass record in returned metadata. This does **not** inventory project-wide automation bypass secrets or deployment-scoped sharing links; normalized read tools do not expose them. No new share link or HTTP protection bypass was created in this continuation.
- IP/system bypass read returned **402: feature unavailable on this team's plan**; this is not proof of zero rules and is unrelated to GitHub Actions billing. Installed Vercel CLI 46.0.2 lacks the mapped `api` command (help resolves to deploy), so no unsafe fallback command was executed. Owner Dashboard review is required; no paid upgrade proposed.

### Proposed operations — each requires separate approval

1. Review Vercel Project → Deployment Protection → Access/Shareable Links and automation bypass/exception lists, **without copying secret values**. Revoke the identified legacy alias override if no longer needed. Revocation can affect all recipients and future deployments behind that branch alias; confirm ownership first. [Official sharing/revocation guidance](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links).
2. Classify the 81 legacy READY Previews from the manifest. Retain current verified release/audit Previews and all Production deployments/3 Production aliases. Confirm owners of still-used PR14/staging-block-b environments; replace with reviewed isolated equivalents before removing active Preview aliases. Do not bulk-delete everything by age or touch Production rollback candidates.
3. Approve a specific list of Preview deployment IDs, alias detachments and sharing revocations. Save only non-secret metadata/forensic hashes required for review; do not export credential-bearing bundles/logs. Revoke bypass access before deleting unsafe targets; preserve evidence necessary to decide rotation. The unaliased `dpl_C14SHDHaCM1iBZXCnV9fR1AS4oQK` and older generic release artifacts deserve early review despite having no alias: generated deployment URLs remain addresses.
4. Treat cleanup and key revocation separately. Old artifacts do not lose embedded credentials when env targets change. Check provider usage and access metadata (not raw credential values), browser-bundle exposure evidence, and which systems still depend on each credential. Actual compromise is unconfirmed; precautionary rotation can still be approved for inherited Production privileged keys.
5. For Supabase modern secret keys, create/update narrowly scoped replacement credentials in approved environments and verify consumers before separately revoking old keys. If the old credential is a legacy JWT `service_role`, adding a new secret key does **not** revoke it: plan legacy deactivation and anon/mobile/cron/Edge dependency migration explicitly. Do not blindly rotate the JWT signing secret; it couples legacy anon/service_role, user sessions and some signed URLs. [Supabase migration guidance](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys), [signing-key consequences](https://supabase.com/docs/guides/auth/signing-keys).
6. OpenAI and Redis use their own provider replacement/revocation procedures. Inventory Vercel/Edge/cron/CI dependencies first, separate Staging resources, then update consumers and revoke old credentials only with approved scope and recovery checks. No credential copied to chat, Git, screenshots or logs. No Production operation is included in the Staging permission request.

## 5. Minimal isolated-Staging browser gate (after permission)

Use two dedicated synthetic accounts in separate browser sessions and only the approved Staging backend. Browsers must verify the effective project/host and no Production provider inheritance before mutations.

1. **Signup → confirmation → onboarding → Home**, with synthetic legacy Events linked to a Memory/Gift/Task. Save preferences, reload and edit again; verify Event IDs/content and linked entities remain, reward occurs once. Exercise NULL preservation in the UI; legacy array replacement behavior already has automated SQL proof.
2. **Login → refresh → logout → second account** in separate contexts. Confirm the first account's profile/contacts/events/memories/gifts are not visible, including navigation after logout/back/reload.
3. **Avatar upload/display/replacement** at 360 px and desktop: JPEG/PNG success, public profile media behavior explicit, invalid MIME/oversize API rejection. Verify the old avatar is retained on failed upload before treating UI media editing as validated (the existing uploader deletes old data before upload; this is an inherited P2 UI risk, unchanged here).
4. **Memory image upload → save → signed display → reload → delete**; B/anonymous access to the private object denied, no raw public memory URL. Confirm linked Event still exists after survey update.
5. **Locale switch + main pages/mobile navigation**, and one AI scope/action-confirmation scenario using a controlled stub or explicitly isolated Staging providers. If providers remain disabled, confirm the expected fail-closed unavailable response; this alone does not validate live AI behavior. Do not enable Production credentials to make the scenario pass.

These complement, rather than repeat, the automated localhost HTTP/RLS checks. Real email delivery, rendered cross-account UI state, device/native behavior and live staging-provider behavior cannot be inferred from SQL/API tests.

## 6. Publishing and permission boundary

Changes are prepared on the existing PR20 working branch. **No push:** its `pull_request:synchronize` trigger would run the entire quality gate and Vercel build, contrary to the current request to defer the full gate until fixes and Staging approval. No `[skip ci]`, workflow disabling or required-check change was used. PR20 metadata can be updated without triggering a gate; the local commit is the concrete reviewable candidate for that same PR, not another duplicate PR.

Permission is needed for (A) the two specified guarded Staging apply_migration calls plus isolated synthetic Staging validation/cleanup; (B) separately listed Vercel alias/bypass/deployment removals after owner review; (C) each provider/key rotation and any Production configuration change, separately scoped. After A and the risk decisions, authorize publication and one final full release gate on the resulting head. Hosted green status at `842735c` is retained as baseline evidence, not a claim that unpushed migrations passed hosted CI.
