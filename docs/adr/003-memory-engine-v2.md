# ADR 003: Memory Engine V2 as product foundation

- Status: Accepted
- Date: 2026-09-06

## Context

Person profile, Notes, Gifts, Home, and Happy conversation each accumulated
relationship knowledge independently. A symbol, a note, and a gift idea could
look like separate screens instead of one story. Happy answers could overweight
the last message. Interpretations risked being stored as facts.

## Decision

Treat Memory Engine V2 as the foundation, not a feature. Every capability
deepens the relationship story of a Person. Happy does not replace memories; it
helps notice, save, and make sense of them. The user's word always outranks any
AI text.

```text
Repositories
    ↓
Knowledge Layer (evidence)
    ↓
Memory Engine V2 (person memory profile + epistemic types)
    ↓
Relationship Intelligence (observations only)
    ↓
Conversation / Gifts / Book / Film / Year review
```

### Person memory profile blocks

who this is for me, our story, chronology, memories, dates, gifts, pets,
symbol, user meaning, notes, Happy conversation history.

### Epistemic types

- fact — user-confirmed information
- memory — user-saved experience
- interpretation — Happy inspiration or a relationship observation

These types must not be mixed in storage, UI, or AI context.

### Symbol layers

1. visual symbol
2. optional Happy interpretation (inspiration, never diagnosis)
3. user-authored meaning (highest authority)

Happy interpretations always include room for disagreement
("if this resonates") and an inspiration-only disclaimer.

### Relationship Intelligence

May notice repeated themes across user memories and present them as
observations. It must not score, diagnose, or claim what the relationship is.

### Future AI features

Gifts, books, films, and year reviews may consume only
`selectAuthoritativeContextForAi` (or an equivalent Memory Engine selector).
They must not read raw last-message text as the source of who a person is.
