# HTTP security headers

Implemented: 2026-08-16.

Deployment state: implemented and runtime-verified locally; the current Vercel
production response was inspected before this change and exposed only HSTS.
Production will receive the new headers only after the repository changes are
deployed, so a post-deployment `curl`/browser verification remains mandatory.

HappyDate applies the same header baseline to every Next.js page and API route,
which also protects the current Capacitor remote web shell.

## Enforced controls

- Content Security Policy defaults to same-origin content, blocks plugins,
  framing and foreign form submissions, and restricts browser connections to
  HappyDate plus Supabase HTTPS/Realtime endpoints.
- Images and media allow only same-origin, local `data:`/`blob:` content and
  Supabase Storage.
- Google Fonts is allowed only for styles and font files.
- Production upgrades insecure resource requests and never permits `eval`.
- `X-Frame-Options: DENY` provides legacy clickjacking defence alongside CSP
  `frame-ancestors 'none'`.
- MIME sniffing, permissive cross-domain policy files and unnecessary browser
  capabilities are disabled.
- Referrers disclose at most the origin cross-site.
- Next.js no longer emits `X-Powered-By`.

## Deliberate current compromise

Next.js emits inline bootstrap scripts and the existing UI contains inline
styles, so `script-src` and `style-src` currently require `'unsafe-inline'`.
This baseline still materially narrows origins and high-impact capabilities,
but it is not the final CSP target.

The next hardening phase should introduce request-scoped nonces or hashes,
confirm compatibility with dynamic rendering and Capacitor, then remove
`'unsafe-inline'` from `script-src`. Do not claim that nonce work is complete
until production pages run without CSP violations across authentication,
Home, Calendar, Notes, People, gifts and all five locales.

## Change rule

New external analytics, media, commerce, maps, AI-in-browser or partner domains
must not be added as broad `https:` allowances. Add the narrowest origin to the
relevant directive, document the data flow and rerun browser/runtime tests.

## Verification evidence

- Header regression tests pass.
- TypeScript reports no errors.
- The optimized webpack production build succeeds. A separate Turbopack run
  hit a local OS `EPERM` while its PostCSS worker attempted to bind a loopback
  port; this was an execution-environment failure, not a compilation error.
- A locally started production server returned the complete header set on both
  an HTML page and an API response and omitted `X-Powered-By`.
- Full application suite: 915/915 passing.
