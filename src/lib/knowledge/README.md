# Knowledge Layer

## Purpose

The Knowledge Layer provides one canonical, persistence-independent model of
what Happy knows about people. Legacy memories remain the stored source data;
the compatibility mapper interprets them without changing or deleting them.

```text
Supabase
    ↓
Knowledge Repository
    ↓
Compatibility Mapper
    ↓
Knowledge Layer
    ├── Brain + Assistant Context
    ├── Gift Intelligence
    ├── Home
    ├── People
    └── Memory Capture
```

## Structure

- `domain.ts` — canonical Knowledge System contracts.
- `compatibilityMapper.ts` — conservative legacy Memory-to-Knowledge mapping.
- `knowledgeLayer.ts` — deterministic, read-only knowledge projections.
- `index.ts` — public exports for future consumers.
- `knowledgeRepository.ts` in `src/lib/repositories/` — canonical persistence
  boundary and staged write/read API.

## Boundaries

- Repository reads and writes persistence data; it does not contain product
  interpretation and must not depend on Brain, Assistant, Home, or People.
- Knowledge Layer interprets persistence records and exposes canonical domain
  data to consumers.
- Consumers must not recreate legacy type mapping rules.
- Unknown legacy types and original evidence remain traceable.
- Journals are not AI-eligible by default.
- Product consumers must not read the `memories` table from Supabase directly.
- Brain and Assistant consume Knowledge projections; Assistant does not create
  its own interpretation of legacy memory types.

See [`docs/knowledge-system-architecture.md`](../../../docs/knowledge-system-architecture.md)
for the complete dependency diagram, migration state, and target boundaries.

## Current status

- ✅ Foundation
- ✅ Repository
- ✅ Dependency Audit
- ✅ Knowledge Consumers: Brain + Assistant Context
- ✅ Gift Intelligence
- ✅ Gift API Ownership Guard
- ✅ Home
- ⬜ People
- ⬜ Memory Capture
- ⬜ Migration and cleanup

Repository is canonical and independent. Current product consumers still use
legacy compatibility paths until their dedicated migration stages are
completed.
