# Privacy-safe observability foundation

HappyDate now captures otherwise invisible web and native-shell client failures
through `/api/telemetry/error`. This is a transport and structured-log
foundation, not a promise that a production alerting vendor is already connected.

## Collected fields

- fixed schema version and event kind;
- controlled failure surface;
- normalized route pattern with query strings, numeric IDs, UUIDs and opaque IDs removed;
- SHA-256 diagnostic fingerprint calculated on the device;
- framework digest when it matches a short safe-token grammar;
- web/iOS/Android platform and timestamps.

The contract rejects unknown keys. It cannot accept error messages, stacks,
names, email addresses, user IDs, person IDs, note content, chat content or URL
query values. Raw stack information is used only on the device to calculate a
one-way fingerprint and is never transmitted.

## Abuse and failure boundaries

- request bodies are limited to 4 KiB before JSON parsing;
- malformed or expanded payloads are rejected;
- the existing hashed request-identity limiter throttles ingestion;
- production fails closed if its distributed limiter is unavailable;
- a browser session reports a fingerprint once and at most ten distinct errors;
- reporting failures never replace the original user experience.

Route and root error boundaries show a calm, recoverable HappyDate screen. The
route boundary is localized in all five current locales. Root-layout failure uses
English because the internationalization provider itself may be unavailable.

## Production connection still required

Vercel/runtime JSON logs must be connected to a retention-bounded monitoring
destination and alerts for error-rate regression. Before doing that, document:

1. processor and region;
2. retention and deletion policy;
3. team access controls;
4. sampling and alert thresholds;
5. release identifier propagation;
6. a synthetic alert test and incident runbook.

Do not enable automatic session replay, DOM capture, request-body capture or
console breadcrumbs for HappyDate's private notes, people and chat screens.

## Runtime logging policy

Application code uses the shared operational logger instead of passing raw
errors to `console`. Its diagnostic allowlist contains only error type, safe
machine code, category, numeric status and safe request ID. Error messages,
stacks, Supabase details, hints and arbitrary metadata are discarded. A source
audit test prevents new direct `console.error`, `console.warn`, `console.log` or
`console.info` calls outside the two structured transports.
