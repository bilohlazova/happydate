# Stage 4 — Gift Intelligence

- Status: Complete
- Date: 2026-07-17
- Behavior policy: data-source migration only

## Previous production chain

```text
Gift API route
    ├── service-role Supabase → people
    ├── service-role Supabase → notes
    ├── service-role Supabase → ai_gift_cache
    └── prompt → OpenAI
```

The route owned persistence, context assembly, cache, and provider orchestration.
The separate `notes` table was the sole gift context.

## Current production chain

```text
Gift API route
    ↓
Gift Intelligence Repository
    ├── people
    ├── canonical memories projection
    ├── ai_gift_cache
    └── legacy notes fallback
    ↓
Compatibility Mapper → KnowledgeItem[]
    ↓
Gift Knowledge Context Builder
    ↓
unchanged prompt → unchanged OpenAI call
```

The route no longer imports Supabase or reads persistence directly.

## Canonical Gift context

The builder accepts only `KnowledgeItem[]` and supports likes, dislikes,
preferences, hobbies, wishes, sizes, important facts, gift ideas, confirmed gift
history, relevant experiences, generic notes, and event association. Relation
remains a basic Person repository DTO.

Journal, archived, AI-ineligible, empty, and other-person records are excluded.
Legacy `gift` maps only to `giftIdeas`; only explicit canonical `gift/history`
can enter `giftHistory`.

## Prompt and API parity

Structured facts are formatted into the existing bullet-list `Notes` section.
The endpoint, cache contract, five recommendations, JSON schema, model
`gpt-4.1-mini`, temperature `0.8`, prompt instructions, fallback strings, and
OpenAI integration remain unchanged.

## Status of the `notes` table

No schema migration, ownership documentation, or production inventory for this
table exists in the repository. It cannot safely be classified as duplicated or
removable, so it remains a temporary Repository-owned fallback:

1. Read canonical active Knowledge for the person.
2. If canonical Knowledge exists, do not read legacy `notes`.
3. Otherwise read legacy notes in the previous newest-first order.
4. Format them exactly like the previous prompt context.

No destructive migration was performed. Stage 8 must inventory and backfill
unique records before considering fallback removal.

## Remaining risks

- Authentication and ownership are enforced by the completed Stage 4.1 guard;
  see `stage-4-1-gift-api-ownership-guard.md`.
- Cache keys remain `personId + occasion`; Knowledge changes do not invalidate
  existing cached recommendations.
- Legacy fallback has limited provenance.
- Structured facts remain flattened to the old prompt format for parity.
