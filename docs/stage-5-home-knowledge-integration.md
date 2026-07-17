# Stage 5 — Home Knowledge Integration

- Status: Complete
- Date: 2026-07-17
- Behavior policy: data-source and projection migration

## Previous architecture

```text
HomePageClient / Assistant Home Context
    ↓
home.repository
    ├── profiles
    ├── people
    ├── events
    └── direct Supabase memories query
            ↓
       HomeMemory legacy DTO
            ↓
       buildHomeViewModel
            └── local legacy type classification
```

Home maintained its own memory projection and taxonomy in parallel with
Knowledge and Brain.

## Current architecture

```text
HomePageClient / Assistant Home Context
    ↓
home.repository
    ├── profiles / people / events
    └── Knowledge Repository
            ↓
       KnowledgeItem[]
            ↓
       Knowledge Layer Home projection
            ↓
       Home presentation model
            ↓
       unchanged React UI
```

`home.repository.ts` no longer queries `memories`. Home presentation no longer
imports or interprets stored types.

## Canonical projection

`projectKnowledgeForHome()` owns the compatibility mapping to the stable Home
domain categories:

- gift;
- preference;
- memory/experience;
- note.

It preserves the previous value precedence, person/event association and source
ordering. Facts, wishes and unsupported legacy person-info records remain absent
because current Home did not render them. Adding those is a product change, not
part of source migration.

Journal and archived records are excluded. AI-ineligible records are also
excluded from Assistant Home Context; non-AI Home presentation does not use AI
eligibility as a display score.

## Unchanged behavior

No Home components, styles, translations, CTA, block order, event selection,
urgency rule, recommendation priority, empty-state copy or route changed.
Event and birthday normalization remains in the existing Home presentation
builder. Knowledge scoring, reminder planning and AI eligibility are not
reimplemented in Home.

## Remaining compatibility

- `HomeMemory` remains as a type alias for the stable Home projection so UI
  contracts do not churn.
- The projection uses audited compatibility accessors until legacy fields are
  retired in Stage 8/9.
- People and Notes continue to use their legacy paths until their own stages.

