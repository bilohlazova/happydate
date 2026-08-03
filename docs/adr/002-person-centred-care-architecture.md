# ADR 002: Adopt a person-centred care architecture

- Status: Accepted
- Date: 2026-08-03

## Context

HappyDate began with calendar, people, notes, and assistant capabilities that
evolved in parallel. The product direction now requires those capabilities to
work as one personal care system: remember confirmed information about
important people, notice relevant moments, explain what matters now, and help
the User complete a concrete action.

Without a broader architecture, Home, Calendar, People, Notes, Gifts, and Chat
could each classify data, decide urgency, format AI context, and mutate state
independently. That would create conflicting recommendations, untraceable AI
claims, duplicated lifecycle logic, and privacy risk.

ADR 001 established canonical Knowledge but did not decide how Knowledge,
time-sensitive care decisions, conversation, and mutations relate across the
whole product.

## Decision

Adopt a person-centred product architecture with four explicit capabilities:

1. Memory Brain determines what is reliably known from canonical Knowledge.
2. Care Brain determines what matters now and emits explainable Care Insights.
3. Conversation Brain communicates bounded Memory and Care context.
4. Action Layer applies authorized, typed, idempotent state transitions.

A Person is the primary aggregation point for relationship-related Events,
Knowledge, Memories, Gifts, links, Actions, and Timeline presentation. Records
that are legitimately personal or unassigned may keep a null Person
association.

```text
Persistence
    ↓
Canonical Domain
    ↓
Memory Brain
    ↓
Care Brain
    ↓
Conversation Context
    ↓
Conversation Brain
    ↓
Presentation
    ↓
Action Layer
    ↓
Application Services and Persistence
```

The cycle in the product experience does not permit reverse dependency in
code. Repositories remain below domain capabilities; presentation invokes
Actions but does not own their transitions.

## Detailed decisions

### Person-centred, not one-table-centred

Person profile and Person Timeline compose multiple domain projections. Events,
Knowledge, Gifts, Reminders, attachments, and conversations retain distinct
persistence and lifecycle rules.

### Deterministic care before generative conversation

Urgency, preparation stage, Reminder state, source selection, and suggested
Actions are determined by testable domain logic. A language model may phrase or
discuss those results but is not their authority.

### Confirmation-aware memory

Candidate information does not become known merely because AI detected it.
User confirmation and successful persistence are required before Happy claims
to remember it.

### Provenance-bearing decisions

Derived Knowledge, Care Insights, and personalized factual context retain
source IDs. Explanations are derived from provenance, not generated as
unsupported rationale.

### Typed actions

Recommendations and conversation proposals do not directly imply successful
mutation. Complete, snooze, confirm, save, select, purchase, and give are
explicit Action transitions with authorization and idempotency.

### Factual relationship context

HappyDate may present user-recorded interaction recency but does not score,
rank, diagnose, or shame relationships. Such context is opt-in and describes
only data actually recorded or explicitly integrated.

## Consequences

Positive:

- Home, Briefing, and Chat can agree on the same primary Care Insight.
- AI contexts become smaller, faster, safer, and more explainable.
- Person Profile and Timeline can grow without merging all persistence.
- Reminder and Gift lifecycle transitions become explicit and testable.
- Future subscriptions, partners, and fulfillment can build on stable domains.

Trade-offs:

- Existing modules require incremental migration and temporary adapters.
- Some current UI handlers and repositories overlap the new boundaries.
- New Care and Action contracts add up-front design work.
- Provenance and confirmation require more metadata than a generic chatbot.

## Rejected alternatives

### Event-centred calendar architecture

Rejected because it ends at notification delivery and cannot naturally compose
long-lived Person knowledge, Gift history, Memories, or relationship context.

### One general AI agent with direct database access

Rejected because it combines retrieval, classification, decisions,
conversation, and mutation into an untestable authority with excessive data
access.

### One universal activity table

Rejected because domains have different lifecycle, ownership, privacy, and
validation requirements. A Timeline projection provides unified presentation
without sacrificing domain integrity.

### Automatic memory of every conversation statement

Rejected because detection is uncertain, context changes, and User control is
required. Candidate-and-confirm remains the canonical flow.

### Relationship health score

Rejected because it would imply unsupported judgment and create pressure.
Factual, opt-in Relationship context is the approved alternative.

## Implementation guidance

The canonical target and migration map are maintained in
[`happydate-product-domain-architecture.md`](../happydate-product-domain-architecture.md).
Definitions are maintained in [`domain-glossary.md`](../domain-glossary.md).
Changes to ownership, dependency direction, AI authority, or privacy defaults
require another ADR.
