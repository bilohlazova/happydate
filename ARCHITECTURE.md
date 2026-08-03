# HappyDate Architecture

This file is the entry point to the HappyDate architecture documentation.

## Product doctrine

> HappyDate thinks in people, explains what matters now, and helps the user
> complete a caring action.

HappyDate is a person-centred care assistant, not a calendar with an AI chat
attached. A person is the primary aggregation point for relevant events,
knowledge, memories, gifts, links, actions, and conversations. Personal events,
tasks, and private journals may remain unassigned when no person relationship
exists.

## Canonical documents

- [Product and domain architecture](docs/happydate-product-domain-architecture.md)
  defines system layers, ownership, dependency rules, current module mapping,
  and the staged migration path.
- [Domain glossary](docs/domain-glossary.md) defines the terms used in product,
  persistence, domain, AI, and presentation code.
- [Knowledge System architecture](docs/knowledge-system-architecture.md) defines
  the canonical Knowledge subdomain and its migration status.
- [Supabase inventory](docs/supabase-inventory.md) records the evidence-backed
  remote schema, code expectations, Storage/Auth configuration, unknowns, and
  the migration decision queue.
- [ADR 001](docs/adr/001-knowledge-layer.md) records the introduction of the
  canonical Knowledge Layer.
- [ADR 002](docs/adr/002-person-centred-care-architecture.md) records the
  person-centred Memory Brain, Care Brain, Conversation Brain, and Action Layer
  architecture.

## Non-negotiable rules

1. UI renders presentation models and dispatches typed actions; it does not
   classify persistence rows or make care decisions.
2. Repositories own persistence access and ownership boundaries; they do not
   produce recommendations, prompts, or presentation copy.
3. Memory Brain uses confirmed, provenance-bearing Knowledge and never invents
   a fact.
4. Care Brain produces deterministic, explainable insights with source IDs.
5. Conversation Brain receives bounded context from Memory and Care; it does
   not query or reinterpret raw storage records.
6. Action Layer owns state transitions such as complete, snooze, save, select,
   purchase, give, and confirm.
7. Journal content is private and AI-ineligible by default.
8. Candidate knowledge becomes remembered knowledge only after explicit user
   confirmation.
9. A presentation timeline may combine multiple domains, but persistence does
   not collapse those domains into one universal table.
10. New features extend canonical contracts; they do not add new legacy
    interpretation paths.
