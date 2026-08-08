# Stage 8 — Migration hardening and compatibility mode

- Status: Complete (8.1–8.5)
- Date: 2026-08-06
- Policy: additive and evidence-driven; no destructive data operation

## Stage 8.1 — Production inventory and boundary hardening

The linked production project was inspected with read-only aggregate and
catalog queries. No personal memory values were selected.

### Production facts

- `public.memories` exists with the canonical compatibility columns used by the
  Knowledge mapper.
- It contains 6 rows for 1 owner: 3 `memory`, 1 `interest`, 1 `note`, and 1
  `restaurant` record.
- One record is intentionally unassigned to a person; no row is inactive and no
  row lacks both `value_text` and `content_text`.
- RLS is enabled. Authenticated SELECT and DELETE are owner-scoped. INSERT and
  UPDATE additionally validate ownership of linked people and events; UPDATE
  has both `USING` and `WITH CHECK`.
- `public.notes` does not exist. The dead Gift fallback query was removed and no
  backfill was required.

### Repository boundary

All runtime `memories` table calls now live only in
`knowledgeRepository.ts`. `memoryRepository.ts` remains a
Notes/manual-capture compatibility adapter with no direct table access.

Happy Learning no longer reads `memories` directly. It passes its authenticated
RLS client to the canonical Knowledge Repository with explicit user and person
filters. Gift Intelligence has no `notes` fallback and reads only canonical
Knowledge.

### Migration-history reconciliation

Production already contained the `next_attempt_at` and `provider_message_id`
columns, their exact comments, and `reminder_deliveries_push_dispatch_idx` under
migration version `20260804161414`. The identical local SQL had version
`20260804160920`. Only the local filename was aligned to the verified production
history; no SQL was re-run and no database state changed.

### Environment limitation

Local Supabase services cannot start because Docker/Podman is not installed.
Remote migration listing and read-only catalog queries were used instead. The
full application TypeScript, test and production-build cycle remains required
for every Stage 8 substep.

## Stage 8.2 — Notes and manual capture canonical writes

Notes list/create/update/delete and `/care/add-memory` creation now delegate to
the canonical Knowledge Repository. `memoryRepository.ts` remains temporarily
as a UI compatibility adapter, but it contains no `memories` query or mutation.

The adapter preserves Notes behavior and fields:

- newest-first list including inactive records;
- `note`, `memory`, `gift`, `journal`, and manual care types;
- title, content, value, person and occurrence date;
- owner-scoped image paths, including the previous `null` versus list shape;
- `manual` provenance;
- permanent deletion for the existing Notes delete action.

The canonical Repository now owns hard deletion alongside create, update and
archive. All operations continue through the authenticated Supabase client and
the existing owner/link RLS policies. No schema or production data migration
was needed.

## Stage 8.3 — Raw reader and DTO retirement

The unused `getMemoriesForPerson`, `getActiveMemories`, and `getBrainMemories`
facades were removed after repository-wide call-site verification. Their
`LegacyMemoryKnowledgeDto` and `mapLegacyMemoryToCompatibilityDto` projection
were also removed; Brain and Happy consumers already use `KnowledgeItem`.

Raw `MemoryRow[]` readers are now private implementation details of
`knowledgeRepository.ts`. Notes receives a bounded `NotesMemoryRow[]` through
`listNotesKnowledgeProjection`, while Gift and Happy Learning receive canonical
`KnowledgeItem[]`. The remaining `MemoryRow` type is the database persistence
row required by the compatibility mapper, not an application consumer model.

No database query, schema or production data changed in this substep.

## Stage 8.4 — Bounded Gift AI cache and Knowledge invalidation

Production inspection found that `public.ai_gift_cache` did not exist, while
the server Repository treated reads and writes as optional best-effort cache
operations. The cache contract is now explicit: server-only access, a
`person_id + occasion` key, seven-day expiry, and cascading cleanup with the
person.

An `AFTER INSERT OR UPDATE OR DELETE` trigger on canonical `memories` removes
cached Gift recommendations for the affected person. Reassigning Knowledge
invalidates both the old and new person. The narrow trigger function lives in
the private schema, has an empty `search_path`, and is not executable by public
roles; elevated execution is needed only because authenticated Knowledge writes
must be able to invalidate a server-only table.

## Stage 8.5 — Compatibility retirement and final audit

The repository-wide call-site audit retired three proven-dead compatibility
surfaces:

- the deprecated `brain/mappers/mapMemory.ts` re-export;
- the manual-capture `createMemory` alias, with `/care/add-memory` now writing
  through `createKnowledge` directly;
- the permanently empty and unread `HappyBrain.recentNotes` field.

The Notes compatibility adapter remains intentionally. It is an active UI and
Storage boundary for Notes-specific projections, filters, signed image URLs,
uploads, and owner-scoped object deletion. Its persistence methods delegate to
the canonical Knowledge Repository and it does not access `memories` directly.
The legacy-compatible `MemoryRow` mapper also remains necessary at the database
boundary while historical open `type` values still exist.

The linked Supabase database passed `db lint` with no schema errors. Database
Advisors reported no errors. Its remaining findings were reviewed:

- `ai_gift_cache` and `push_devices` have RLS with no policies intentionally;
  both are server/RPC-only tables with client table grants revoked.
- Three authenticated `SECURITY DEFINER` RPC warnings are intentional capability
  endpoints for consuming in-app deliveries and registering/disabling the
  current user's push devices. Each uses an empty `search_path`, explicit grants,
  `auth.uid()` scoping, and bounded inputs.
- Unused-index notices are expected before meaningful production traffic and
  are not evidence that the indexes should be removed.
- Leaked-password protection remains a Supabase Auth dashboard setting to
  enable before public launch; it is not a schema migration.

Stage 8 closes with synchronized local/remote migration history, TypeScript,
the complete test suite, database lint, Advisors review, and production build.

## Remaining work after Stage 8

1. Enable leaked-password protection in Supabase Auth before public launch.
2. Re-evaluate unused indexes only after representative production traffic.
3. Continue with Stage 9 cleanup and documentation finalization.
