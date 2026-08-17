# Dependency security audit

Audit date: 2026-08-16.

## Result

`npm audit --audit-level=low` reports **0 known vulnerabilities** across the
current lockfile.

Two upstream dependency chains required constrained overrides:

| Chain | Previous version | Secured version | Reason |
| --- | --- | --- | --- |
| Next/Tailwind → PostCSS → `nanoid` | 3.3.17 | 3.3.18 | Fixes GHSA-2v37-7h3g-55p8 (high) |
| Capacitor CLI → `xcode` → `uuid` | 7.0.3 | 11.1.1 | Fixes GHSA-w5hq-g745-h8pq (moderate) |

The `nanoid` override stays within major version 3. The old `xcode@3.0.1`
package calls only the public CommonJS `uuid.v4()` API; that exact call was
verified with `uuid@11.1.1`. Capacitor sync then completed for both platforms,
confirming the CLI path remains operational.

## Regression evidence

- `npm audit --audit-level=low`: zero findings.
- `npm ls`: both secured versions resolve once, as overrides.
- `npx cap sync`: succeeds and discovers App, Camera and Push Notifications on
  iOS and Android.
- TypeScript: no errors.
- Full application suite: 912/912 passing.
- Optimized Next.js production build: succeeds.

## Maintenance rule

The overrides are temporary compatibility controls, not forgotten pins. On each
Capacitor, Next.js or PostCSS upgrade:

1. run `npm audit` before and after the update;
2. inspect whether upstream now resolves a secure version itself;
3. remove an override once it is no longer necessary;
4. rerun Capacitor sync, both native builds and the full test suite;
5. never use `npm audit fix --force` without reviewing breaking-version and
   lockfile changes.
