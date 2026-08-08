# Stage 6 — Canonical People boundary

- Status: Complete
- Date: 2026-08-06
- Behavior policy: ownership and compatibility consolidation

## Result

People list and Person Profile already consume the canonical People loaders,
Knowledge repository, and bounded view models. This closing stage removes the
remaining parallel persistence path used by the legacy Happy Brain.

`personRepository.ts` is now the only People persistence owner for the People
domain. It uses one explicit canonical column contract instead of `select(*)`.
The old `repositories/people` surface remains temporarily as a compatibility
projection because legacy Happy cards still consume `PersonSummary`, but it no
longer queries `public.people` and cannot drift from the canonical row model.

## Preserved behavior

- alphabetical ordering;
- empty unauthenticated state;
- birthday values exposed as local calendar dates to legacy Happy cards;
- relationship label fallback;
- unchanged People list and Person Profile UI;
- RLS plus explicit user scoping on list and owned profile reads.

## Deliberately retained boundary

The `PersonSummary` projection remains because current Happy cards actively
consume its date-oriented presentation contract. It is not a persistence owner:
all People reads delegate to `personRepository`. Removing this projection is a
future Happy-card product migration, not unfinished People data-layer work.
Domain-specific server projections in Gift Intelligence remain owned by that
server boundary and do not redefine the interactive People data layer.
