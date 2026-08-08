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
    └── bounded ai_gift_cache (7 days)
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

Stage 8.1 verified against the linked production project that `public.notes`
does not exist. The unused Repository fallback was removed; Gift Intelligence
now reads person knowledge only from the canonical `memories` projection. No
backfill or destructive database operation was necessary.

## Remaining risks

- Authentication and ownership are enforced by the completed Stage 4.1 guard;
  see `stage-4-1-gift-api-ownership-guard.md`.
- Cache keys remain `personId + occasion`, but Stage 8.4 now expires entries
  after seven days and invalidates every person's cached recommendations when
  their canonical Knowledge changes.
- Structured facts remain flattened to the old prompt format for parity.
