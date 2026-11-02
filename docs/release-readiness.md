# HappyDate release readiness — 2026-11-02

**Disposition: NO-GO for Production release.** Code remediation for issue #19 is implemented, but Staging is missing release behavior/storage, exact-head hosted CI/Preview validation is pending, and historical Preview credential exposure is unresolved. This is a bounded audit, not an ASVS certification.

## Revision and scope

- Repository: bilohlazova/happydate. [Release PR #18](https://github.com/bilohlazova/happydate/pull/18) remains open/draft, base `main`, head `fix/assistant-owned-person-over-100` at `da8c12a71cd35ca5290f1f92f4d084eccbda4280`, rechecked before editing.
- New branch: `codex/release-readiness-audit`, based on that exact head. Remediation commit: `7e3ff5aa28bf00df5b487be692d2fb3d59dcdc8f`. Later changes add a repeatable local Auth audit and this report; the Draft PR identifies its exact final head.
- Original checkout was clean on `codex/preview-isolation-audit` / `c3ab21445be6d3cbe34a7221a18590f2a87a6ab7` (historical source only; not audit base).
- No merge, main update, Production deployment, live database write, live migration, credential rotation, Vercel variable/protection modification or provider request was performed. Live Supabase queries selected catalog metadata only. All test mutations used localhost and synthetic accounts; SQL cases roll back and HTTP cases delete only their own created accounts.
- Next's installed environment-variable and instrumentation guides were read before the guard change. Existing guard wiring in `next.config.ts` and `src/instrumentation.ts` covers config/build and server startup.

## Findings and evidence

| Область | Ризик | Знайдено | Виправлено | Доказ / тест |
|---|---|---|---|---|
| Authentication | P2 residual | Bearer verification and local session lifecycle work; browser token storage is localStorage; duplicate Auth providers need follow-up race review | Repeatable two-account localhost signup/confirmation/login/refresh/logout/relogin + onboarding audit added | `npm run test:auth:local`; confirmation is simulated by local admin when required, not an email-delivery test |
| Supabase / RLS | P1 external release blocker | Staging ledger lacks `preserve_legacy_survey_events`; survey RPC definition differs. Staging lacks `avatars` and `memory-images` buckets | No live mutation allowed; correction/rehearsal remains required. Extended rollback tests cover profiles/gifts/tasks/actions/private Storage | 8 local SQL/schema tests pass; live metadata evidence below |
| API / Web | P2 residual | No new confirmed P0/P1 in reviewed routes. CSP still allows inline scripts; XSS prevention relies on React escaping and controlled content | Existing bounded JSON, bearer ownership, retired legacy APIs and private response headers retained | Full suite, production HTTP smoke, `bounded-json`, memory-capture, account and HTTP header tests. No `dangerouslySetInnerHTML`/eval found in src scan |
| AI | P1 external validation gap | Correct owner context and >100 scope verified; real Preview AI is intentionally unavailable when integrations are disabled | #19 strict release/audit policy disables privileged integration credentials; no weakening to make AI smoke pass | Verified-context/scoped-person, budget, action approval, prompt/context and local RLS tests; 15 synthetic eval scenarios valid, live provider eval not run |
| Архітектура | P2 | Home's bounded projection differs from exact scoped-person lookup; some server loaders still use owner-filtered admin clients; duplicate Auth providers | Keep working canonical repositories; avoid broad refactoring | Existing People/Events/Gifts/Knowledge/Tasks tests plus scoped 101st-person test; backlog below |
| Android / iOS | P1 hosted gate pending | Original iOS job cancelled before acquiring any runner; no compiler result | Local Android debug and unsigned iOS Simulator builds pass; native CI runs parallel with web | Commands/results below; local Xcode result does not replace required GitHub status |
| Deployment | P0 fixed / P1 external risk | Any non-PR14 Preview could previously use Production endpoint; release Preview could inherit privileged providers. Older deployments retain historical snapshots | Universal Production-host rejection before branch exemption; strict verified Staging/key + disabled-provider policy for release/audit branches | New regressions failed 2/2 on base and pass after fix; existing Production/local tests retained. New hosted deployment still required |

## Threat model and review boundaries

Assets: account sessions, contacts, relationships/events, private memories/media, gifts/tasks, AI conversations, privileged provider keys and AI budget. Actors: anonymous caller, authenticated account A attacking account B, malicious client/context/model output, misconfigured Preview, compromised external link or dependency. Trust boundaries: browser → API/bearer verification → owner-scoped repository/RLS, model output → pending proposal → explicit approval, hosting config → project/provider endpoints, public bundle → server-only credentials.

OWASP Top 10 / relevant ASVS control areas reviewed:

- Broken access control/authentication: Auth `getUser(token)`, bearer-bound RLS client, person/event/task scope resolution, account deletion recent-sign-in check, user-scoped server actions, SQL grants/policies/RPC and storage path ownership. Browser cookies carry locale, not API authority; mutation endpoints use explicit bearer authorization, reducing ambient-cookie CSRF exposure. A full ASVS session/security review remains broader than this audit.
- Injection/XSS/SSRF/redirects: React content handling, no raw HTML/eval scan findings, bounded schemas/streamed bodies, Supabase parameterized filters, fixed provider endpoints, user-saved gift URLs, safe links and fixed auth destinations. Source review is not a dynamic penetration test of every upload/parser.
- Misconfiguration/crypto/secrets: build + startup guard; checks both selected and shadowed public credentials; redacted errors; environment target metadata; private buckets. Secret-pattern recognition cannot recognize every opaque secret. No decrypted Vercel credentials retrieved or logged.
- Dependencies/integrity: locked install and low-threshold npm audit, vendored deepmerge PoC coverage, AI tool schema and explicit approval boundaries. Local `node_modules` initially belonged to another branch; four deepmerge failures disappeared after locked installation, with no dependency-source change.
- Logging/abuse: safe logger and telemetry paths, streaming byte caps, production Redis limiter/concurrency and worst-case daily AI budget reservation. No live provider calls/costs. Rate identity trusts hosting proxy headers; direct-origin/self-host deployments need their own trusted-proxy boundary.

Canonical owners remain People repositories, Events/calendar persistence, Gifts lifecycle, Memories/Knowledge repository, Happy Tasks/Actions and server-verified AI context. Home is a bounded display projection, not an ownership source. No speculative architecture rewrite.

## Live read-only configuration findings

Connected Supabase projects are distinct and ACTIVE_HEALTHY: Production `yzcvdspiiiaidsdripxr`, Staging `xgelazzdgluuenqkymox`. Vercel project `prj_OGq9ziCkTB4TkhU3faKqLgAkgwPv`, team `team_iVAGho4AJPmXIdhotMQrmda0`.

Vercel env inventory with `decrypt=false` confirms generic Preview public URL/publishable-key variables are separate from Production targets. Generic Preview no longer receives service-role/OpenAI/Redis entries. Release/audit branches have no branch override. Metadata comments name Staging; they are not independent verification of encrypted values. A successful fresh strict-guard build will validate the effective endpoint/key. Production Supabase/service-role/OpenAI variables still target Development; never pull/use those for this audit. Server credentials have Vercel `readable-secret` warnings. `codex/staging-block-b` retains separate provider overrides of unverified provenance: grandfathered as `other-preview-unverified`; Production public endpoint is still always rejected. Its provider isolation requires separate follow-up.

Production policy/local opt-in are unchanged. Strict branches are `fix/onboarding-survey-safe-ui` (existing), `fix/assistant-owned-person-over-100`, and `codex/release-readiness-audit`. Other named Previews retain their prior integration behavior except the universal Production Supabase ban; they are explicitly not certified isolated. Adding/renaming a release/audit branch requires reviewing this allowlist.

Vercel Authentication remains enabled (`all_except_custom_domains`). Original exact-base Preview `dpl_8Zj3ouH4BT2qdx7fK6v9RVrJveaH` was READY. That artifact predates this patch. Older retained artifacts may have inherited Production credentials; env edits cannot remove credentials from existing deployments. No bypass/protection/alias changes or old deployment deletions are authorized here.

Supabase ledger and function catalogs were read again, building on `audit-db01b-stored-sql-and-staging-rehearsal.md` rather than rerunning its full historical SQL reconstruction. Three privileged RPC definitions match between environments:

| RPC | Both environments definition MD5 |
|---|---|
| consume_my_in_app_deliveries | 7c7f5cbbd5a66f19de67e61d6c55b450 |
| disable_my_push_devices | 0e6d44a7e9ec915745fc20d26a0788d6 |
| register_my_push_device | 12a87541b8d2ea866dcfd34bbd3fbe95 |

`save_my_onboarding_survey`: Production `dfaff7c3494447cf64a5cef4c06b68c5`, Staging `a6896078c41547ddfa8c3c550b2896fb`. All four are authenticated-callable SECURITY DEFINER, deny anon EXECUTE and have empty search_path. These fingerprints are parity checks, not proof of identical historical effects. Staging's ledger omits the repo event-preservation migration; do not treat it as release-equivalent or replay every migration blindly.

Production private memory-images: 10 MiB with image MIME allowlist; private audio: 25 MiB with audio allowlist; private person-symbols: 5 MiB with image allowlist. Staging only has audio/person-symbols. Production avatars are public with no size/MIME restriction in bucket metadata (P2 hardening follow-up, not evidence of private-memory exposure).

Advisors: leaked-password protection disabled and pg_net in public in both; four authenticated SECURITY DEFINER warnings reviewed as intentional restricted RPCs; `ai_gift_cache` has RLS/no policies (deny-by-default, not an exposure). Staging-only mutable search_path warning is `rls_auto_enable`, SECURITY INVOKER, no anon/authenticated execute. No automatic grants/revokes or remote fixes made.

## Testing tiers and execution evidence

Use Node 24 (`.nvmrc`); workstation default Node 22 was not used for verification.

**FAST**: `npm run test:fast -- tests/release-preview-isolation.test.mjs` (requires named tests; no accidental all-suite fallback), `npx eslint <changed files>`, `npm run typecheck` when contracts/types change.

**SECURITY / INTEGRATION**: `npm run test:security` (55 pass); `RUN_LOCAL_SUPABASE_RLS_TESTS=1 RUN_LOCAL_SUPABASE_SCHEMA_TESTS=1 npm run test:integration` (8 pass, no skips), reusing local `supabase_db_toto`. The integration command fails if either opt-in is absent. CI's schema test now honors `LOCAL_SUPABASE_DB_CONTAINER`, including `supabase_db_happydate`.

**FULL RELEASE GATE**, one local pass after the security batch:

| Check | Actual result |
|---|---|
| `npm ci --ignore-scripts` | Locked dependencies installed, 0 vulnerabilities; no package/lockfile dependency change |
| `npm run verify` | Full lint and typecheck pass. Full test pass attempt: 1396 total, 1387 pass, 8 explicitly DB-gated skips, 1 stale CI-order assertion failed after intentional parallelization. Assertion updated; only `tests/ci-quality-gate.test.mjs` rerun, 4/4 pass. DB-gated cases separately executed, 8/8 pass. No unchanged full-suite rerun |
| `npm run eval:assistant` | 15 synthetic scenarios valid; live evaluation skipped intentionally |
| Changed-file ESLint | Pass, including new guard/tests/tier scripts; local-auth script checked separately |
| `npm audit --audit-level=low` | 0 vulnerabilities |
| `HAPPYDATE_LOCAL_EXECUTION=1 npm run build -- --webpack` | Pass with synthetic public Supabase config and server integrations empty. Initial sandbox Google Fonts DNS failure corrected by permitted network retry |
| `HAPPYDATE_LOCAL_EXECUTION=1 npm run smoke:production` | Pass: pages, security headers, bounded JSON and retired APIs; synthetic backend, no real user/provider traffic |
| Local Auth HTTP audit | Two temporary account signups; simulated confirmation if needed; profile/onboarding, login/refresh/logout/relogin, owner CRUD and foreign read/insert/update/delete rejection; cleanup passed. Run `npm run test:auth:local` with `LOCAL_SUPABASE_WORKDIR` pointing to the existing localhost stack config |
| Android | `npx cap sync android`; `JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew assembleDebug --no-daemon` from android: BUILD SUCCESSFUL, 187 tasks |
| iOS | `npx cap sync ios`; `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/happydate-release-ios CODE_SIGNING_ALLOWED=NO build`: BUILD SUCCEEDED, Xcode 26.4.1 / 17E202 |
| Fresh hosted CI/Preview | Pending; original release-run results are not evidence for this patch |

Local build/test logs: `/tmp/happydate-release-verify.log`, `happydate-release-build.log`, `happydate-release-ios.log`, `happydate-release-android.log`. Ephemeral logs may not survive workstation cleanup. Commands and qualified outcomes above are the durable record.

Critical journeys: Auth/onboarding and contact CRUD exercised via localhost HTTP plus actual PostgreSQL; Events/birthdays/calendar, gifts/memories, AI scoped context and language behavior exercised by repository behavioral/contract suites; public pages/native offline/headers through production HTTP. Mobile shell compilation passed. These do not prove rendered authenticated browser journeys, device camera/push/deep-link behavior, real email delivery or a full >100-contact authenticated Next AI HTTP round trip. Preview AI intentionally fails closed without dedicated reviewed staging providers; enabling real AI requires separately isolated integration provisioning.

## CI and iOS queue diagnosis

[Original run 41492970969](https://github.com/bilohlazova/happydate/actions/runs/41492970969), attempt 2: web/database/Android/dependency pass; iOS job `125451347838` cancelled, whole run failure. Job window 17:58:13–18:13:14 UTC; labels `[macos-15]`, runner_id=0, runner_name empty, steps empty. Thus no Xcode step ran. Cause of cancellation/queue is not exposed by job metadata; do not call it a compile failure or claim billing exhaustion.

Connector lacks billing/runner/admin-settings access. Browser fallback to repository Actions settings returned logged-out 404. Billing/quotas, repository Actions settings and account-wide macOS concurrency therefore remain unverified owner checks. Linux success proves Actions can run in the repository, not macOS allocation availability. No unsupported API/auth bypass attempted.

The [official runner image inventory](https://github.com/actions/runner-images) lists supported macOS labels; macos-15 remains supported. macos-15-intel changes architecture; macos-26 changes OS/toolchain; neither guarantees spare capacity. macos-14 is deprecated on the audit date. Leave macos-15 until runner/capacity evidence justifies changing it. The exact local Xcode command above is a practical independent compile check, not permission to skip required iOS status.

CI retains all five check names, bounded timeouts/read permissions, strict errors and full RLS replay/security checks. Next build cache is keyed by OS/lockfile/commit with lockfile restore prefix; npm caching already exists. Native jobs no longer wait for the independent web job. Every native shell still builds on every release gate; no path filters fabricate successful skipped checks. `npm ci` on separate hosted runners is intentional: sharing installed node_modules across Linux/macOS risks platform-dependent binaries. Full mobile builds are avoided during FAST development by running local targeted commands and pushing one logical batch.

## Backlog and release conditions

1. **P1 / required:** reconcile Staging survey RPC/migration under a separately approved live change, provision missing Staging buckets with matching privacy/MIME/size policies, then execute isolated Staging onboarding/media tests. Existing repo migration is the fix source; do not rewrite migration history or duplicate it blindly.
2. **P1 / required:** fresh exact-head CI including hosted iOS and full DB replay; fresh strict-policy Preview, browser session/locale/mobile-screen checks and runtime isolation. Keep main required checks untouched.
3. **P1 / required risk decision:** inventory old deployments/bypass links and historical credential exposure; isolate/remove old unsafe artifacts and decide rotation with owner approval. Vercel Authentication alone does not prove absence of bypass access.
4. **P2:** remove Production service credentials from Development through separately reviewed configuration work; make readable server secrets Sensitive. Prove grandfathered staging-block-b provider provenance before using it.
5. **P2:** consolidate duplicate Auth state providers and test logout/getSession races; favor bearer RLS dependencies over unnecessary admin loaders. Existing server admin loaders are user/person-filtered; no cross-account leak demonstrated.
6. **P2:** nonce/hash CSP to reduce inline-script exposure; constrain avatar MIME/size; enable leaked-password protection where plan permits; review pg_net schema and monitoring/quotas without blindly moving extensions.
7. **P2:** device push/camera/deep-link/offline and real mail-flow smoke; complete rendered authenticated browser journeys. No claims of universal ASVS/OWASP compliance.

No Production GO is issued while these release conditions remain open. Draft review/iteration can proceed on the test branch; merging or Production operations require separate permission.

## Hosted evidence addendum (after initial report commit)

[Draft PR #20](https://github.com/bilohlazova/happydate/pull/20) targets the release branch. Its initial head was `58135c945f098b8b5a5e4b110dece499912b088c`; remediation commit remains `7e3ff5aa28bf00df5b487be692d2fb3d59dcdc8f`.

[Fresh CI run 41500595842](https://github.com/bilohlazova/happydate/actions/runs/41500595842): web (including full lint/typecheck/tests/eval/build/smoke), dependency and Android passed. iOS acquired a runner and reached compilation, unlike the original cancelled run. DB replay and all seven RLS tests passed, but the newly enabled schema test exposed a second hardcoded container name in its object-catalog query. Both queries now share `databaseContainer`; the corrected targeted local schema test passes. A new hosted run is necessary specifically because this required test failed; prior successes are not being repeated as local development checks. Latest hosted status and final exact head are recorded on the Draft PR to avoid triggering more builds for report-only status edits.

Fresh Preview `dpl_Ay9MjiUDBct1QeooZbunvoR4gjht` is READY on `58135c9`, using the strict audit-branch guard. Native Vercel connector HTTP fetch returned 200 for `/`, `/auth/login` and `/about`; private `/api/happy/notifications` returned 401 without bearer identity. Home response has CSP, DENY/nosniff/referrer/permissions policies, HSTS and no-store. Rendered home HTML contained no recognized privileged token patterns (this is not a whole-bundle scan). The connector used its temporary deployment-scoped access mechanism; project protection settings and old deployments were not modified. This establishes application HTTP startup on the strict guard; authenticated browser/device/provider journeys remain outside this smoke.
