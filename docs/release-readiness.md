# HappyDate release readiness — 2026-11-03

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
