# Stage 2.5 — Memory Dependency Audit

> Historical baseline. The tables below describe the pre-migration state.
> Resolutions are recorded in the later stage sections and the final Stage 9
> report; entries must not be interpreted as current runtime dependencies.

- Status: Complete; Stage 3 consumers migrated
- Date: 2026-07-17
- Scope: Read-only dependency inventory; no runtime changes

## Summary

The canonical Knowledge Repository and Knowledge Layer exist, but no production
consumer has migrated to them yet. Current behavior remains intentionally on
legacy contracts. The main migration spine is:

```text
getBrainMemories
    ↓
BrainMemory
    ↓
Brain engines / PersonKnowledge
    ↓
Assistant Context / reminders / Happy cards
```

One direct `memories` read exists outside Memory/Knowledge Repository in Home.
Gift AI uses a separate legacy `notes` table, which is a second knowledge source
and must be reconciled during Gift Intelligence.

## Production dependency inventory

| Module | Reads or writes | Current status | Target owner |
|---|---|---|---|
| `knowledgeRepository.ts` | Supabase `memories`; canonical CRUD and context | Canonical | Complete |
| `memoryRepository.ts` active/person reads | Delegates `listKnowledgeRows*` | Compatibility | Stage 8 cleanup |
| `memoryRepository.ts` Notes projection | Direct `memories` projection | Compatibility | Stage 7 Capture |
| `memoryRepository.ts` legacy writes | Direct create/update/delete | Compatibility | Stage 7/8 |
| `memoryRepository.ts` storage helpers | `memory-images` bucket | Compatibility infrastructure | Stage 7 |
| `brain/loadBrain.ts` | `getBrainMemories()` | Legacy | Stage 3 |
| `brain/mappers/mapMemory.ts` | `MemoryRow → BrainMemory` | Legacy adapter | Stage 3 |
| `brain/buildInsights.ts` | `BrainMemory[]` | Legacy | Stage 3 |
| `memoryEngine.ts` | Raw legacy types and fields | Legacy | Stage 3 |
| `preferenceEngine.ts` | Raw legacy preference types | Legacy | Stage 3 |
| `memoryInsightEngine.ts` | Raw types, active state, dates, values | Legacy | Stage 3 |
| `personKnowledgeEngine.ts` | Builds a second knowledge model from `BrainMemory` | Legacy duplication | Stage 3 |
| `reminderPlanningEngine.ts` | `BrainMemory` and legacy PersonKnowledge | Legacy | Stage 3 |
| `buildTopReminderPresentation.ts` | Passes `BrainMemory` into planning | Legacy boundary | Stage 3 |
| `assistant/memoryContext.ts` | Groups and formats `BrainMemory` | Legacy duplication | Stage 3 |
| `useAssistantHomeContext.ts` | `getBrainMemories()` plus Home data | Legacy | Stage 3 |
| `happy/brain/loadBrain.ts` | `getActiveMemories()`, sorts and maps locally | Legacy duplicate loader | Stage 3 |
| `happy/brain/cards.ts` / `cardBuilders.ts` | Brain memory recommendations/cards | Legacy | Stage 3, presentation retained |
| `home/home.repository.ts` | Reads through Knowledge Repository | Canonical | Complete |
| `home/buildHomeViewModel.ts` | Stable Home projection only | Canonical presentation | Complete |
| `people/page.tsx` | `getActiveMemories()` and raw `MemoryRow[]` | Compatibility | Stage 6 |
| `people/[id]/page.tsx` | `getMemoriesForPerson()`, `mapMemory`, Brain knowledge | Legacy | Stage 6 |
| `PeoplePageContent.tsx` | Searches and derives tags from `MemoryRow` | Legacy UI logic | Stage 6 |
| `people/personHighlights.ts` | Classifies `MemoryRow` into highlights | Legacy duplication | Stage 6 |
| `people/highlights.ts` | Alternative raw-type highlight mapping | Legacy duplication | Stage 6/8 |
| `advisors/personAdvisor.ts` | Reads raw types and memory counts | Legacy | Stage 6 |
| `MemoryList` / `MemoryTimelineItem` | Renders `MemoryRow` directly | Legacy presentation | Stage 6/7 |
| `NotesPageContent.tsx` | Notes CRUD and `NotesMemoryRow` | Compatibility UI | Stage 7 |
| Notes cards/editor/types | Notes-specific projection and taxonomy | Compatibility UI | Stage 7 |
| `care/add-memory/page.tsx` | Legacy `createMemory()` | Legacy capture | Stage 7 |
| `api/ai/gift-suggestions` | Gift Knowledge Context via server repository | Canonical; Notes fallback retired in Stage 8.1 | Complete |
| `storage/memoryImages.ts` | Attachment path validation and upload support | Reusable infrastructure | Stage 7 |

## Canonical APIs with no production consumer yet

The following APIs are implemented and tested but currently used only by the
new architecture/tests:

- `listKnowledge()`
- `getKnowledgeForPerson()`
- `getKnowledgeContext()`
- `createKnowledge()`
- `updateKnowledge()`
- `archiveKnowledge()`

This is intentional. Stage 3 is the first consumer migration.

## Direct database access

### Approved canonical access

- `src/lib/repositories/knowledgeRepository.ts` accesses `memories` for
  canonical reads and writes.

### Documented compatibility access

- `src/lib/repositories/memoryRepository.ts` retains Notes projections and
  legacy writes to preserve UI behavior.

### Bypass requiring migration

- `src/lib/repositories/home/home.repository.ts` directly reads `memories`.

### Parallel knowledge source

- `src/app/api/ai/gift-suggestions/route.ts` reads the separate `notes` table.
  Gift AI therefore does not currently use Memory or Knowledge as its source of
  truth.

No other production `.from("memories")` call was found.

## Duplicate interpretation points

The following modules independently interpret legacy types or values:

1. Compatibility Mapper — canonical and retained.
2. `mapMemory` — legacy structural mapping.
3. `personKnowledgeEngine` — raw type taxonomy and aggregation.
4. `memoryInsightEngine` — a smaller, different taxonomy.
5. `preferenceEngine` — another preference subset.
6. `memoryEngine` — legacy memory/note/story rules.
7. Home `classifyMemories` — Home-specific classification.
8. People highlight helpers — two separate implementations.
9. `personAdvisor` — advisor-specific raw type checks.
10. Assistant `memoryContext` — its own value selection, sorting, and limits.
11. `happy/brain/loadBrain` — local active filtering, sorting, and mapping.

Only the Compatibility Mapper and Knowledge Layer should remain authoritative
after all migration stages.

## Naming collision

`src/lib/happy/memory/` contains a separate `HappyMemory` visit/mode stub. It is
not person knowledge and does not access the `memories` table. Its name can be
confused with Knowledge Memory, but renaming it is cleanup work and not part of
Stage 3.

## Stage 3 migration boundary

Stage 3 — Knowledge Consumers covers:

- `brain/loadBrain.ts`;
- `BrainMemory` input boundaries;
- `mapMemory` compatibility usage;
- Memory, Preference, Memory Insight, Person Knowledge and Reminder engines;
- `happy/brain/loadBrain.ts`;
- Assistant `memoryContext` and `useAssistantHomeContext`;
- associated tests and compatibility fixtures.

It does not cover:

- Gift AI endpoint and cache;
- Home repository/view-model classification;
- People UI/profile/highlights/advisor;
- Notes and legacy capture;
- database migrations or removal of compatibility methods.

## Deletion guard

Nothing identified by this audit is safe to delete before its owning migration
stage passes tests and production build. In particular, do not remove
`BrainMemory`, `mapMemory`, `getBrainMemories`, Notes projections, or raw People
helpers during Stage 3 unless all remaining callers have been proven absent.

## Stage 8.3 resolution

The deletion guard has now been satisfied for the Repository compatibility
surface. `getMemoriesForPerson`, `getActiveMemories`, `getBrainMemories`,
`LegacyMemoryKnowledgeDto`, and its mapper were removed after repository-wide
call-site checks. Notes uses a bounded canonical projection; Brain, Assistant,
Happy, Gift, Home and People consume `KnowledgeItem`-based models.

`MemoryRow` remains only as the private persistence-row contract used by the
Knowledge Repository and the legacy-to-canonical mapper. It is no longer a
consumer-facing Repository result.
