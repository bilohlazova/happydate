# Stage 7 — Universal Memory Capture

- Status: Complete (7.1–7.5)
- Date: 2026-08-06
- Behavior policy: authorization boundary first

## Stage 7.1 — Route ownership

The signed-token Happy Learning v2 path is the canonical Memory Capture API.
It owns detection, user confirmation, ownership revalidation, semantic duplicate
and conflict checks, and confirmed Knowledge persistence.

Consumers use `MEMORY_CAPTURE_ENDPOINTS.canonical`; route strings are no longer
duplicated across clients. During migration, the older Gift Workspace flow was
temporarily isolated and deprecated until Gift Intelligence received the same
signed detection authorization.

Detection never grants persistence authority by itself. Canonical confirmation
requires a short-lived HMAC token bound to the authenticated user, person,
candidate value, semantic tags, evidence and schema version. Ownership and
semantic state are reloaded immediately before the write.

## Stage 7.2 — Gift Intelligence migration

Gift Intelligence now converts its explicit discovery signals into canonical
Happy Learning candidates. Every candidate receives a short-lived signature
bound to the authenticated user, person, candidate fields, evidence and the
`gift_discovery` source. Existing semantic knowledge is checked before the
candidate reaches the UI, so already-known values are not proposed again.

Gift Workspace now parses the strict canonical response, renders
`HappyLearningCard`, and confirms through the signed-token endpoint. It no
longer calls the legacy Gift confirmation client. Confirmation revalidates the
session, token, ownership and semantic state before persistence, and records
the correct `gift_discovery` provenance.

No Supabase schema or production migration was required for this step.

## Stage 7.3 — Legacy runtime removal

The unversioned legacy detect and confirm routes, `memoryCaptureClient`, the
legacy persistence mapper, the old `MemoryCaptureCard`, and the obsolete chat
precheck/extractor have been removed. There is now only one public Memory
Capture API contract: the signed Happy Learning v2 flow.

The deterministic Gift candidate builder remains as a private Gift
Intelligence adapter. It cannot persist data and its output must pass through
canonical semantic authorization and token signing before reaching the UI.

Generated Next.js route types were regenerated after route removal. No
Supabase schema, RLS policy, Edge Function, or production data change was
needed.

## Stage 7.4 — Canonical route promotion

The signed API is now exposed at the stable unversioned routes
`/api/memory-capture/detect` and `/api/memory-capture/confirm`. The temporary
`-v2` route directories have been removed, while the internal schema version
and strict signed-token contract remain unchanged for validation and token
binding.

All clients continue to resolve paths through `MEMORY_CAPTURE_ENDPOINTS`, so
the promotion required no duplicated route literals or UI-specific fallback.
Generated Next.js route types were rebuilt after the move.

## Stage 7.5 — Localization, privacy and regression closure

Canonical Memory Capture copy has exact key parity across Polish, Ukrainian,
English, Russian and German. Obsolete copy for the deleted legacy card was
removed, while all nine Happy Learning capture types and the four specialized
semantic labels remain localized.

Regression coverage now verifies that confirmation sends only the signed,
allowlisted candidate fields. UI-only data such as `personName`, confidence,
decision diagnostics, authorization state and semantic status never enters the
confirmation body. Transport failures and unknown server responses fail closed
as `save_failed`; session lookup failures are also contained without leaving
the UI in an unresolved promise state.

Both Chat and Gift use the same canonical confirmation boundary. Detection has
no persistence dependency, dismissal never writes, conflict candidates cannot
be saved, ownership is checked again before persistence, and token tampering,
expiry, user mismatch and person mismatch are rejected.

## Final Stage 7 guarantees

1. Nothing is persisted without an explicit user confirmation.
2. Detection tokens are short-lived and bound to user, person, source, value,
   polarity, tags, evidence and schema version.
3. Knowledge ownership and semantic status are revalidated immediately before
   every write.
4. Chat and Gift Discovery preserve distinct provenance.
5. Already-known information is not duplicated and conflicts fail closed.
6. The runtime exposes one stable route pair and one persistence implementation.
7. No raw provider response, prompt, diagnostics or UI-only candidate metadata
   is persisted.
8. No Supabase schema, RLS, Edge Function or production-data migration was
   required for Stage 7.

Stage 7 is complete. Future work should add conflict-resolution UX as a new,
separately authorized product capability rather than weakening this boundary.
