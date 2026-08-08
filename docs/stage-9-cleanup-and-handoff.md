# Stage 9 — Cleanup and architecture handoff

- Status: Complete
- Date: 2026-08-06
- Policy: remove only proven-dead compatibility; preserve active UI contracts

## Outcome

The nine-stage Knowledge migration is closed. `KnowledgeItem` is the canonical
domain contract and `knowledgeRepository.ts` is the only runtime owner of the
`public.memories` table. Brain, Assistant, Gift, Home, People and Memory Capture
consume canonical Knowledge or bounded purpose-specific projections.

Stage 9 reconciled the architecture documents with the implemented state and
added regression guards for the final boundaries. It did not modify Supabase
schema or production data.

## Final runtime boundaries

| Concern | Owner | Rule |
|---|---|---|
| `public.memories` persistence | Knowledge Repository | No other runtime module may query it directly |
| Historical memory interpretation | Compatibility Mapper | Consumers do not classify stored `type` values |
| Notes UI and images | Memory Repository adapter | Delegates persistence to Knowledge Repository |
| Person persistence | Person Repository | Legacy Happy projection may map, never query separately |
| Gift context | Gift Intelligence Repository | Owned person plus canonical Knowledge only |
| Gift recommendation cache | `ai_gift_cache` | Server-only, seven-day expiry, invalidated by Knowledge changes |
| Memory Capture | Stable detect/confirm routes | Signed confirmation required before persistence |

## Removed compatibility

- direct consumer reads of `memories`;
- raw Repository readers and legacy Brain DTO projection;
- Gift `notes` fallback;
- legacy and temporary Memory Capture routes and clients;
- `mapMemory` compatibility entry point;
- manual `createMemory` alias;
- unused `HappyBrain.recentNotes` placeholder.

## Intentionally retained compatibility

- `MemoryRow` at the persistence mapper boundary because historical open types
  still exist in production data;
- Notes DTOs and `memoryRepository` UI/Storage helpers used by the current Notes
  screen;
- `PersonSummary` projection used by current Happy cards;
- `HomeMemory` alias used by the stable Home presentation contract;
- internal Happy Learning `v2` schema naming, which versions signed payloads and
  is not a duplicate public route.

These are documented adapters, not approved locations for new persistence or
legacy classification logic.

## Verification gate

Stage 9 requires:

1. TypeScript validation;
2. the complete automated test suite;
3. architecture guards for direct `memories` access and retired entry points;
4. a successful webpack production build;
5. no unreviewed Supabase migration drift.

## Product work after the migration

The next roadmap should be feature-led rather than another Knowledge rewrite:
calendar and event creation UX, richer Notes capture, personalized daily audio,
care-question timing, gift history and saved links, and mobile release quality.
Compatibility adapters should be removed only when their active UI consumers
are intentionally migrated and parity tests exist.
