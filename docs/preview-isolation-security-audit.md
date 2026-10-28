# HappyDate security audit — 2026-10-28
Scope: PR14 head 7f00f6d603d2ac5d32caa8dce9bb5e9a2d6171b2. No push, merge, SQL, migrations, data changes or deployment.
## Verified Vercel inventory before changes
19 variables; hiddenProductionEnvCount=0. Dates UTC. Branch-specific Preview overrides generic Preview. Application prefers PUBLISHABLE_KEY over ANON_KEY. No shared configurationId returned; team-level settings not independently inventoried.
| Name | Type | Targets | Branch | Created UTC | Updated UTC |
| --- | --- | --- | --- | --- | --- |
| OPENAI_API_KEY | sensitive | preview | fix/onboarding-survey-safe-ui | 2026-10-28T17:29:12.733Z | 2026-10-28T17:29:12.733Z |
| SUPABASE_SERVICE_ROLE_KEY | sensitive | preview | fix/onboarding-survey-safe-ui | 2026-10-28T17:25:25.676Z | 2026-10-28T17:27:39.769Z |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | encrypted | preview | fix/onboarding-survey-safe-ui | 2026-10-28T17:10:51.934Z | 2026-10-28T17:22:38.717Z |
| NEXT_PUBLIC_SUPABASE_URL | encrypted | preview | fix/onboarding-survey-safe-ui | 2026-10-28T17:08:28.105Z | 2026-10-28T17:08:28.105Z |
| OPENAI_DAILY_BUDGET_USD | sensitive | production | all | 2026-10-20T16:54:36.585Z | 2026-10-20T16:54:36.585Z |
| UPSTASH_REDIS_REST_TOKEN | sensitive | preview | codex/staging-block-b | 2026-10-17T08:31:29.679Z | 2026-10-17T08:31:29.679Z |
| UPSTASH_REDIS_REST_URL | sensitive | preview | codex/staging-block-b | 2026-10-17T08:31:11.364Z | 2026-10-17T08:31:11.364Z |
| OPENAI_API_KEY | sensitive | preview | codex/staging-block-b | 2026-10-17T08:30:38.066Z | 2026-10-17T08:30:38.066Z |
| SUPABASE_SERVICE_ROLE_KEY | sensitive | preview | codex/staging-block-b | 2026-10-17T08:30:27.250Z | 2026-10-17T08:30:27.250Z |
| NEXT_PUBLIC_APP_URL | encrypted | preview | codex/staging-block-b | 2026-10-17T08:29:52.019Z | 2026-10-17T08:29:52.019Z |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | encrypted | preview | codex/staging-block-b | 2026-10-17T08:29:39.540Z | 2026-10-17T08:29:39.540Z |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | encrypted | preview | codex/staging-block-b | 2026-10-17T08:29:29.837Z | 2026-10-17T08:29:29.837Z |
| NEXT_PUBLIC_SUPABASE_URL | encrypted | preview | codex/staging-block-b | 2026-10-17T08:29:22.368Z | 2026-10-17T08:29:22.368Z |
| UPSTASH_REDIS_REST_TOKEN | sensitive | preview, production | all | 2026-07-17T12:24:24.701Z | 2026-07-17T12:24:24.701Z |
| UPSTASH_REDIS_REST_URL | sensitive | preview, production | all | 2026-07-17T12:23:58.380Z | 2026-07-17T12:23:58.380Z |
| NEXT_PUBLIC_SUPABASE_URL | encrypted | production, preview, development | all | 2026-02-23T15:44:47.642Z | 2026-02-28T12:02:21.474Z |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | encrypted | production, preview, development | all | 2026-02-23T15:44:47.642Z | 2026-02-28T12:26:58.259Z |
| SUPABASE_SERVICE_ROLE_KEY | encrypted | production, preview, development | all | 2026-02-23T15:44:47.642Z | 2026-07-17T12:02:07.515Z |
| OPENAI_API_KEY | encrypted | production, development | all | 2026-02-23T15:44:47.642Z | 2026-10-28T17:29:51.194Z |
## Findings
- CRITICAL: generic Preview shares Production Supabase URL, anon and service-role variable. Public URL and anon role/ref verified: yzcvdspiiiaidsdripxr / anon. Global service-role value deliberately not retrieved; shared targets prove the same stored variable is supplied to both environments. Vercel flags readable-secret.
- HIGH: generic Preview shares Production Redis URL/token. PR14 had no Redis overrides. Generic OpenAI currently targets Production/Development only, so generic Preview does not inherit it. OpenAI flagged readable-secret.
- PR14 public URL and anon JWT match xgelazzdgluuenqkymox / anon. No global publishable key shadows it. staging-block-b URL/anon match Staging; its opaque publishable key cannot be bound to a project offline.
- No privileged key found in inspected current public Supabase variables. NEXT_PUBLIC_APP_URL exists only on staging-block-b. No explicit secret logging found in inspected API log paths; historic logs and remote bundles not exhaustively scanned.
## Actual remediation
ONLY fix/onboarding-survey-safe-ui, target preview: replaced Sensitive OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY with empty disabled values; added empty Sensitive UPSTASH_REDIS_REST_URL/TOKEN overrides. Vercel accepted writes; reread confirmed scope/type/metadata. Sensitive values cannot be read back. Empty values are intentional: optional clients use truthiness; direct constructors may fail safely instead of reaching authenticated providers.
Global variables, main, other Preview branches, databases and external provider accounts untouched.
## Deployment history and rotation
One retained PR14 deployment: dpl_2vKTDAwHLqDwRSmDvcYoAtat26YD, READY, matching SHA, created before ALL PR14 overrides. Treat it as potentially connected to Production; do not run authenticated survey there. Environment edits do not change existing deployments. Vercel protection all_except_custom_domains is enabled; it is not an environment boundary.
No retained PR14 deployment was returned in the interval between creation and correction of the mistaken public key. Deleted/manual deployments, historic build env snapshots and artifacts are not ruled out. Exposure of Staging service_role in a deployed bundle is unconfirmed. If such deployment/artifact is found, rotation is required through separate approval (including legacy JWT/anon/session dependencies). Precautionary rotation is recommended given the known public-variable incident. No rotation performed.
## Code review and fix
Reviewed publicConfig, supabaseClient, survey, all API env references/admin constructors, chatEnvironment, rateLimiter/aiBudget, preflight, OpenAI providers, Next config, workflows and local Edge/push code. NODE_ENV=production also applies to Preview. Existing productionReady/preflight check presence/budget, not provenance. Redis has no environment key namespace. Multiple repositories construct privileged clients directly from env.
Added central guard before build in next.config and before requests in instrumentation.register. Preview requires exact approved HTTPS Staging origin and matching anon JWT, and empty privileged integration credentials. Opaque Preview publishable keys fail closed until independent verification is supported. Public resolver validates BOTH candidate keys, including shadowed ones. Claims inspection is not signature verification; Supabase remains responsible for authentication/RLS. Production integration behavior retained.
Replicate webhook returns 410. No active Resend/Replicate use found in inspected API code. safeDeepLink retains Production origin fallback; configure branch-specific app origin before auth/email/deep-link testing. Build guard prevents public privileged credentials from being compiled in future builds containing this fix.
## Live Supabase and external limits
Read-only metadata: Production dispatch-push-reminders ACTIVE v49, verify_jwt=false. Local source uses withSupabase auth:secret; false alone does not imply unauthenticated access. Deployed source parity/provider secrets not verified. Staging has no Edge Functions.
Advisors both projects: pg_net in public; leaked-password protection disabled; four authenticated-callable SECURITY DEFINER RPCs (consume_my_in_app_deliveries, disable_my_push_devices, register_my_push_device, save_my_onboarding_survey); ai_gift_cache RLS enabled/no policy (INFO, not evidence of exposed rows). Staging also mutable search_path on rls_auto_enable. Review ownership/grants/bodies separately; do not blindly revoke legitimate RPCs. No database changes authorized.
Supabase live cron/vault/webhooks/auth redirect configuration and Firebase/APNS/OpenAI/Upstash account settings were not exhaustively accessible/audited. Local APNS defaults to production unless explicitly sandbox; Vercel overrides do not isolate independently hosted tasks. GitHub scheduled live eval has its own repository OpenAI secret; provenance unreadable. No workflow triggered.
## Separate approval plan for global risks
1. Inventory active Preview branches/deployments and owners; map features to required providers.
2. Provision dedicated nonproduction provider resources or disable integrations per branch, preserving Production behavior.
3. After branch replacements are verified, remove Preview/Development targets from Production Supabase variables and Preview from Production Redis. Convert readable server secrets to Sensitive through approved changes.
4. Roll out guard gradually: staging-block-b currently has opaque publishable key/nonempty integrations and would fail closed. Rebuild corrected Preview branches with fresh artifacts. Separately approve old deployment removal/protection and credential rotations.
5. Audit live Supabase cron/vault/webhooks/auth redirect targets and provider account restrictions before separately approving configuration/database changes.
## Verification and release gate
1359 tests: 1355 pass, 4 skip. TypeScript, targeted ESLint, git diff --check and optimized webpack build pass with synthetic public configuration. Initial sandbox build could not resolve Google Fonts; approved network retry passed. No deployment performed. Tests cover Production/mismatched URLs, privileged public JWT/secret keys, shadowed keys, inherited credentials, opaque keys, empty disabled overrides and value-free errors. No authenticated survey or live provider tests. Final Vercel reread: 21 entries; all variables outside PR14 retain original updatedAt, targets and branch scopes.
A fresh PR14 Preview can be built from corrected branch settings, but existing deployments remain unsafe. Strong fail-closed code exists only in the local audit branch until explicitly integrated into PR14; no push performed. Confirm fresh deployment's resolved public Staging project and disabled integrations before authenticated testing. Build outcome is recorded in final response.

