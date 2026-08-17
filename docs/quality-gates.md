# HappyDate quality gates

The repository now has three repeatable checks:

- `npm run lint` — Next.js Core Web Vitals, React and TypeScript lint rules;
- `npm run typecheck` — strict TypeScript validation without emitting files;
- `npm run eval:assistant` — validates the versioned synthetic Conversation
  Brain evaluation set without network calls or model cost, including the
  mandatory relationship-care coverage contract;
- `npm run verify` — lint, typecheck and the complete automated test suite.
- `npm run smoke:production` — real HTTP checks against an already built
  optimized production server.

`next.config.ts` does not use `typescript.ignoreBuildErrors`. A production build
therefore fails when TypeScript is invalid instead of publishing a broken app.
The package explicitly declares ESM (`"type": "module"`), matching every local
JavaScript configuration, test and smoke script and preventing Node from
reparsing imported TypeScript modules heuristically.

## React 19 effects

React 19 compiler diagnostics run at their normal Next.js severity. Effects that
exist specifically to fetch route-owned data after mount or reconcile a
controlled editor carry a narrow, documented line/file exemption. Derived state,
ref access during render and unnecessary manual memoization are fixed in code.
New compiler diagnostics therefore fail lint instead of being globally reduced
to warnings.

## Before release

Run:

```bash
npm run verify
npm run build
npm run smoke:production
npm audit --audit-level=low
```

Native releases additionally require the Android and iOS build checks described
in the native release documentation.

The same sequence is enforced for pull requests and `main` by
`.github/workflows/quality.yml`; see `docs/ci-quality-gate.md` for the permission,
secret and branch-protection boundaries.
