# HappyDate calendar dependency security — GHSA-gcqx-w48m-w2h4

Base: PR14 ed032bebe783a871b7872c5b064a6a34b7b20084. Work is isolated in codex/pr14-calendar-dependency-security. No push, merge, deployment, Vercel changes, SQL or hosted Supabase access.

## Reproduction and current upstream state (2026-10-28)

The original npm audit --audit-level=low exits 1 with three low-severity findings: deepmerge and its two dependent packages. npm explain deepmerge establishes date-holidays@3.35.0 -> date-holidays-parser@3.4.7 -> deepmerge@4.3.1.
Registry lookup: deepmerge latest is 4.3.1, date-holidays-parser latest is 3.4.7. date-holidays latest 3.38.0 still depends on parser ^3.4.7, which depends on deepmerge ^4.3.1. Thus a provider upgrade alone does not fix the advisory.

Primary sources:
- https://github.com/advisories/GHSA-gcqx-w48m-w2h4 — affected 4.2.0 through 4.3.1; no patched registry release listed.
- https://github.com/TehShrike/deepmerge/issues/273 — null-prototype, placeholder and malicious-target PoCs and recommended hardening.
- https://github.com/commenthol/date-holidays — supported provider API/country/locale capabilities.

Reproduced the original PoC locally: merge({session:null}, JSON-parsed nested __proto__ data) yields session.isAdmin=true as an inherited property while Object.prototype remains unchanged. Merely checking global prototype pollution is insufficient.

## Reachability

Application imports date-holidays only in src/app/api/calendar/observances/route.ts (and tests). The public GET route accepts URL query strings, never merges request JSON, never accepts provider options/custom holiday objects, and does not call setHoliday with user data. Country selects bundled provider data; year is an integer in 1970..2100; locale selects one of uk/pl/de/en/ru.
The parser's src/Data.js getRules merges {}, bundled data.names[_name] and bundled rule objects. src/Holidays.js _dateByRule merges calculated date metadata and bundled rule metadata via utils.merge -> deepmerge.all. No request object/body becomes a merge operand.
Conclusion: the published prototype-poisoning payload is NOT demonstrated reachable through the current route. This is a bounded code/data-flow conclusion, not a claim the dependency is safe for arbitrary callers or future custom holiday data.

A separate inherited-property bug was confirmed: rawLocale in COUNTRY_BY_LOCALE accepts constructor/__proto__, causing invalid locale processing. All request-selection dictionary checks now use Object.hasOwn; these values safely fall back to English/GB. This hardening does not replace the dependency fix.

## Chosen remediation

Keep holiday provider/data at exact 3.35.0 and replace the actual deepmerge implementation with a reviewed local fork, @happydate/safe-deepmerge@4.3.1-happydate.1. Root dependency deepmerge=file:vendor/safe-deepmerge plus overrides.deepmerge=$deepmerge ensures parser and root resolve to the same implementation after a fresh npm ci.
The first experimental nested file override resolved relative to the parser and produced a broken symlink; it was rejected. Regenerating the lockfile from the original and using the explicit root dependency produced a valid clean installation. No broken resolution is accepted as a security fix.

The fork is upstream 4.3.1's bundled dist/cjs.js with a minimal documented patch:
- reject __proto__, constructor and prototype in target and source loops before reading/writing them;
- use Object.defineProperty for own destination properties instead of invoking assignment setters;
- treat throwing Proxy membership checks as unsafe, preserving normal null/primitive clone targets;
- omit an unused catch binding (no behavior change).

MIT license retained, upstream module SHA-256 recorded, exact zero-context diff supplied in vendor/safe-deepmerge/hardening.patch (apply with patch --fuzz=0 /path/to/upstream-dist-cjs.js < hardening.patch). The local fork has no runtime dependencies or install scripts. It is NOT an upstream fixed release. npm audit does not inspect local source: the result is justified by actual code replacement, PoC regressions, provenance review and differential tests, not by package renaming alone. No ignore list, advisory suppression, audit threshold change, force fix, or automatic security exception was added.

## Validation

- Fresh ordinary npm ci succeeds; npm ls shows a deduplicated local fork; npm explain node_modules/deepmerge confirms the parser consumes it.
- npm audit --audit-level=low: exit 0, zero vulnerabilities.
- PoC tests cover null-prototype targets; null/undefined/primitive placeholders; malicious source AND target keys; nested arrays; forbidden getters; throwing Proxy membership checks; standard .all translation merges, array options, symbols and nonmutation.
- Before replacing the dependency, captured provider output hashes for ALL 206 supported countries x ALL 5 supported locales in 2026 (1030 combinations). Every HTTP handler result matches that pre-patch fixture; translated country catalogs/cache headers/unique dates remain intact. Fixture provenance includes original dependency versions, year, countries and locales. It was not generated from the patched code.
- Default locale/country behavior, normalized language tags, invalid years, hostile query values and year boundaries 1970/2100 for the five default countries are covered. This is not an exhaustive calendar accuracy certification for all years.
- Full Node 24.21.0 verify passed: ESLint with zero warnings, TypeScript, 1386 tests (1380 pass / 6 skipped / 0 fail), and the 15-scenario synthetic assistant eval (live run skipped). Optimized webpack build passed. The 1030-combination matrix and PoC tests also passed in TZ=UTC to match CI. Applying the zero-context patch with --fuzz=0 to the preserved upstream source reproduces the shipped fork byte-for-byte.
- Local compiled Next calendar API smoke: five locales/default countries match the baseline, locale=constructor falls back safely, invalid year returns 400. Only unauthenticated localhost requests and synthetic PR14 environment were used; no database or provider credentials/calls.
- Six database/schema tests remain opt-in/skipped locally. Their code/migrations and all Preview guards were untouched.

## Alternatives and residual risk

A fixed upstream release can eventually replace the fork after independent verification. Updating date-holidays alone currently does not fix the leaf. npm's suggested force downgrade to date-holidays@1.8.4 was rejected: compatibility and historical security were not established. Switching to a different holiday provider would require a separate country/locale/observance migration and is not a compatible minimal fix.

HappyDate now owns a small vendored security fork and must review updates; registry SCA cannot certify its source. Future provider changes must rerun the malicious-input and full country/locale matrix tests. No broad third-party replacement dependency was added. Global Preview/Production credential inheritance and remote deployment-runtime certification remain separate existing audit concerns.

Disposition: GO for a separately authorized next push only after the final recorded checks pass. No push is included in this task.
