# ADR 001: Introduce a canonical Knowledge Layer

- Status: Accepted
- Date: 2026-07-17

## Context

HappyDate historically stores notes, memories, preferences, journal entries,
and gift ideas in the `memories` data model. Different modules interpret the
same legacy fields and open-ended `type` values differently. Extending those
interpretations independently in Brain, Assistant, Home, People, and Gift AI
would create duplicated business rules and inconsistent user outcomes.

The product needs to treat Memory as a capture and evidence source while making
person-centred Knowledge the canonical domain language used by product
features.

## Decision

Introduce a persistence-independent Knowledge Layer between Repository and all
product consumers.

```text
Supabase
    ↓
Repository
    ↓
Compatibility Mapper
    ↓
Knowledge Layer
    ↓
Brain · Assistant · Gift AI · Home · People
```

Repository remains a thin data-access boundary. It must not depend on Brain,
Assistant, Home, People, or their presentation models. Interpretation,
classification, privacy eligibility, and canonical projections belong to the
Knowledge Layer.

Consumers use `KnowledgeItem` and purpose-specific Knowledge projections rather
than interpreting `MemoryRow` directly.

## Why `MemoryRow` is not the domain model

`MemoryRow` mirrors current persistence and must tolerate historical data. Its
`type` is an open string, while `title`, `content_text`, and `value_text` have
overlapping legacy meanings. It also contains storage and AI fields that should
not automatically cross product boundaries.

Binding consumers directly to this shape would expose database details, spread
legacy mapping rules, and make future schema evolution a breaking change.

## Compatibility rules

- Existing rows are not modified or deleted by the Foundation.
- The original normalized legacy type and source evidence remain traceable.
- Unknown legacy types map safely to `note`; no semantics are invented.
- Legacy preferences do not receive inferred positive or negative polarity.
- Legacy `gift` means a gift idea, not proof of purchase or gift history.
- `memory` and `story` map to `experience`.
- `dream` maps to `wish`.
- Inactive records remain representable but are not AI-eligible.
- Journals are not AI-eligible by default.
- Mapping is deterministic and does not mutate source records.

## Why a Compatibility Mapper is required

The mapper is an anti-corruption boundary between historical persistence and
the new domain. It lets current data participate in Knowledge System 1.0
without an immediate database migration, destructive rewrite, or synchronized
refactor of every consumer. It also provides one location for audited legacy
mapping rules instead of duplicating them across features.

## Consequences

Positive consequences:

- Existing data and behavior can remain stable during staged adoption.
- Consumers can converge on one domain model.
- Future persistence changes do not have to leak into product logic.
- Privacy and compatibility rules become explicit and testable.

Trade-offs:

- A temporary translation layer must be maintained.
- Some legacy records remain intentionally ambiguous.
- Repository and consumers must be migrated incrementally before the Knowledge
  Layer becomes the sole production path.

## Out of scope for this decision

- Database migrations or backfills.
- UI and capture-flow changes.
- Automatic classification and conflict resolution.
- Brain, Assistant, Home, People, or Gift AI migration.
- Removal of legacy fields or helpers.

