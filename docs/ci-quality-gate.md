# Continuous quality gate

`.github/workflows/quality.yml` runs on every pull request, every push to `main`
and manual dispatch. It executes the same evidence chain used locally:

1. locked `npm ci` installation;
2. dependency audit at low severity and above;
3. ESLint, strict TypeScript and all automated tests;
4. optimized webpack production build;
5. HTTP smoke against `next start`.

Five independent jobs run in parallel (native jobs do not depend on the web job):

- Android synchronizes Capacitor with Java 21 and compiles the debug APK;
- macOS synchronizes Capacitor and compiles an unsigned generic iOS Simulator
  app from the Xcode project.

The other jobs are the dependency audit, web verification/build/runtime smoke,
and database security. Database security runs on pull requests only; pushes to
`main` and manual dispatch do not execute it. Its disposable Supabase database
replays migrations and runs the three shared-database test files serially with
`--test-concurrency=1`, three times. `npm run test:integration` uses the same
three-file serial boundary once and requires both explicit local database flags.
An ordinary `npm test` without these flags skips the database cases; it is not
database or RLS verification.

The workflow has read-only repository permissions and cancels an older run for
the same ref. Job timeouts vary: audit 10, web/Android 20, database 25, iOS 30
minutes. It receives no production secret. Build-only
Supabase values are explicit non-routable placeholders, while OpenAI, service
role, email and cron credentials are deliberately absent. The tested application
must therefore compile without hidden production access.

Node 24 is declared in `.nvmrc` and `package.json`. Developers should run the same
major version locally to avoid lockfile and runtime differences.

The native jobs prove source/plugin integration only. They intentionally contain
no Firebase production file, Apple certificate, provisioning profile, App Store
key or signing password. They do not prove push delivery, physical-device
permissions, release signing or store acceptance.

Repository branch protection still needs to be configured in GitHub after the
workflow has run once. The exact repository checks observed from the workflow
are `Audit dependency vulnerabilities`, `Database security / RLS isolation`,
`Verify, build and runtime smoke`, `Android debug shell`, and `iOS Simulator
shell`; the Vercel integration check to retain is `Vercel – happydate`. Actual
branch-protection enforcement must be inspected separately; these are suggested
required checks, not a claim that protection is configured. Do not
require the legacy `Vercel – toto` or `Supabase Preview` checks. Require a pull
request, require the branch to be up to date, prevent force pushes and deletion
of `main`, and do not require an external approval for this single-owner
repository.

The GitHub Actions quality workflow does not validate real Production AI
configuration. Run `npm run preflight:production` only in a protected release
environment where the runtime injects `OPENAI_API_KEY`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and
`OPENAI_DAILY_BUDGET_USD`. The preflight reports only configuration category
names, never secret values, and does not call OpenAI or Redis. It checks
presence plus the existing daily-budget bounds; provider connectivity and
authorized runtime behavior remain a separate release check.
