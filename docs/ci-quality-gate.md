# Continuous quality gate

`.github/workflows/quality.yml` runs on every pull request, every push to `main`
and manual dispatch. It executes the same evidence chain used locally:

1. locked `npm ci` installation;
2. dependency audit at low severity and above;
3. ESLint, strict TypeScript and all automated tests;
4. optimized webpack production build;
5. HTTP smoke against `next start`.

Only after the web gate succeeds, two independent native jobs run:

- Android synchronizes Capacitor with Java 21 and compiles the debug APK;
- macOS synchronizes Capacitor and compiles an unsigned generic iOS Simulator
  app from the Xcode project.

The job has read-only repository permissions, a 20-minute timeout and cancels an
older run for the same branch. It receives no production secret. Build-only
Supabase values are explicit non-routable placeholders, while OpenAI, service
role, email and cron credentials are deliberately absent. The tested application
must therefore compile without hidden production access.

Node 22 is declared in `.nvmrc` and `package.json`. Developers should run the same
major version locally to avoid lockfile and runtime differences.

The native jobs prove source/plugin integration only. They intentionally contain
no Firebase production file, Apple certificate, provisioning profile, App Store
key or signing password. They do not prove push delivery, physical-device
permissions, release signing or store acceptance.

Repository branch protection still needs to be configured in GitHub after the
workflow has run once: require `Verify, build and runtime smoke`, `Android debug
shell` and `iOS Simulator shell` before merging, require the branch to be up to
date, and prevent administrators from bypassing the rule except during a
documented incident.
