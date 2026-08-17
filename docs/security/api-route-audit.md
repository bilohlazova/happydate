# Server API security audit

Audit date: 2026-08-16.

## Active private routes

| Surface | Identity/ownership boundary | Body cap | Abuse/provider boundary |
| --- | --- | --- | --- |
| Assistant chat | Supabase bearer identity when present; server-owned gift outcomes only for authenticated resolved Person | 64 KiB | Distributed Upstash limit in production, guest/auth tiers, concurrency lease, 30 s timeout, safe errors |
| Gift recommendations | Required Supabase bearer token plus server-side Person ownership | 32 KiB | Authenticated rate limit, concurrency lease, 30 s total provider deadline, one bounded repair, safe errors |
| Happy Learning detect | Required bearer identity plus server-owned Person | 8 KiB | Authenticated rate check, narrow schema, no persistence before confirmation |
| Happy Learning confirm | Signed short-lived candidate, matching bearer user and owned Person | 16 KiB | Rate check, semantic conflict/duplicate checks, canonical persistence only |
| Account deletion | Required bearer identity, recent sign-in and exact email confirmation | 4 KiB | No-store responses, bounded confirmation, private Storage cleanup before auth deletion |

All listed routes use the shared streaming `readBoundedJson` reader. It rejects
unsupported media types, invalid JSON, declared oversize and chunked/streamed
bodies that cross the byte cap. This protects before schema validation and
prevents an attacker from hiding an oversized payload behind a missing or false
`Content-Length` header.

## Closed future/legacy routes

The following endpoints return `410 service_not_available`, do not parse the
request and contain no database, storage, email, financial or service-role
implementation:

- good deeds;
- messages from heaven;
- gift notification/commerce handoff;
- Replicate animation webhook;
- partner hold auto-release.

The Replicate webhook previously accepted unsigned payloads while holding a
Supabase service-role client. The partner release endpoint previously accepted a
cron secret in the query string and mutated a deferred financial table. Keeping
either implementation reachable would contradict the explicit “coming soon”
product boundary, so both were retired rather than cosmetically patched.

## Operational release gate

Production AI routes intentionally fail closed if the OpenAI or Upstash
configuration is missing. Before beta, provision Upstash, verify quotas and
alerts, and test `429`, concurrency, timeout and provider-outage behavior in the
deployed environment. Logs may contain only bounded technical diagnostics—never
notes, people context, prompts, provider output, bearer tokens or raw internal
error messages.
