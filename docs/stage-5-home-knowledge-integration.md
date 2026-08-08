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
Home Loader (single orchestration boundary)
    ├── Home Repository (profile / people / events)
    ├── Knowledge Repository (one canonical read)
    ├── Knowledge Layer Home projection
    └── Brain (person knowledge + insights)
            ↓
       Home ViewModel / bounded Assistant context
            ↓
       unchanged React UI
```

`home.repository.ts` no longer queries `memories`. It owns the single canonical
Knowledge Repository read, while `loadHome.ts` owns all orchestration. Home and
Assistant therefore share one request result instead of fetching Knowledge
independently. Home presentation no longer imports or interprets stored types.

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

Journal, archived and AI-ineligible records are excluded from both the Home
projection and Assistant Home Context. Repository reads are scoped by the
authenticated user id.

## Unchanged behavior

No Home components, styles, translations, CTA, block order, event selection,
urgency rule, recommendation priority, empty-state copy or route changed.
Event and birthday normalization remains in the existing Home presentation
builder. Knowledge scoring, reminder planning and AI eligibility are not
reimplemented in Home.

## Remaining compatibility

- `HomeMemory` remains as a type alias for the stable Home projection so UI
  contracts do not churn.
- Historical persistence fields are interpreted only by the audited Knowledge
  compatibility mapper.
- People completed its canonical migration in Stage 6. Notes persistence
  completed its canonical delegation in Stage 8.
