# Local security fork, not an upstream fixed release

Source: https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz, dist/cjs.js (bundles is-mergeable-object).
Original file SHA-256: 2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d.
MIT copyright/license retained in LICENSE. No additional runtime dependencies or install scripts.

Patch: reject __proto__, constructor and prototype keys in both target and source loops; define own properties without invoking setters; reject throwing target Proxy membership checks. Preserve upstream merge/all/array cloning semantics for ordinary data.
The zero-context hardening.patch applies with: patch --fuzz=0 /path/to/upstream-dist-cjs.js < hardening.patch.
Review it against the original immutable npm tarball; package-lock records the original provider dependencies and the explicit local override.

Advisory: https://github.com/advisories/GHSA-gcqx-w48m-w2h4
Recommended remediation / PoCs: https://github.com/TehShrike/deepmerge/issues/273
As of 2026-10-28, upstream latest is 4.3.1 and no fixed registry release is available.
This locally maintained fork removes the vulnerable implementation rather than suppressing the advisory or pretending an upstream version is fixed. npm audit does not assess local source: the PoC tests, full country/locale differential calendar snapshot, and review of this patch remain required.

Remove the override only after independently verifying an upstream fixed release and rerunning calendar/security tests. Do not regenerate the pre-patch fixture from the patched implementation.
