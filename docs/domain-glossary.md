# HappyDate Domain Glossary

- Status: Canonical
- Applies to: product language, domain contracts, APIs, persistence, tests, and
  presentation
- Last updated: 2026-08-03

This glossary prevents one term from acquiring different meanings in Home,
People, Calendar, Notes, Brain, Assistant, and Gift Intelligence. Code may use
purpose-specific DTOs and projections, but those shapes must preserve these
meanings.

## Core product terms

### User

The authenticated owner of a private HappyDate workspace. A User controls what
is captured, what is AI-eligible, which notifications are delivered, and which
data is deleted or exported.

### Person

Someone the User deliberately adds to their important circle. A Person is the
primary aggregation point for relationship-related data. A phone contact is
only an import source and does not become a Person until the User selects and
confirms it.

A Person is not a public social profile and is not assumed to be another
HappyDate User.

### Relationship

The User-provided description of how a Person relates to the User. It may have
a canonical key and a user-visible custom label. It is descriptive context,
not a score or a psychological assessment.

### Event

Something scheduled or commemorated on a date, optionally at a time and
optionally linked to a Person. Birthdays, anniversaries, meetings, and personal
events are Events. An Event is not itself a Reminder or proof that an action
was completed.

### Event occurrence

One dated instance of an Event, especially a recurring Event. Completion for a
birthday in one year applies to that occurrence, not to every future birthday.

### Reminder

A persistent instruction to bring an Event or Care Action to the User's
attention. A Reminder has a lifecycle and delivery policy. It is distinct from
the push notification used to deliver it.

### Reminder delivery

One attempt to deliver a Reminder through a channel such as push or local
notification. Delivery is operational evidence; it does not mean the User
completed the intended action.

### Care Insight

An explainable conclusion from Care Brain about what matters now, why it
matters, and which next actions are useful. It contains priority, validity,
reason, and source provenance. It is not presentation copy.

### Care Action

A concrete action the User can take, such as congratulate, call, snooze,
prepare a gift, save a link, or confirm a memory. It has an explicit state
transition and may be suggested by a Care Insight.

### Daily Care Context

A bounded, purpose-specific model of what the User needs to know now. It is
built from current Events, Reminders, Care Insights, and relevant
person-centred context. Home and the daily Briefing consume this model.

### Briefing

A structured, localizable presentation of Daily Care Context. Text and audio
are two presentations of the same Briefing model. A Briefing must not invent
facts or expose private journal content.

## Memory and knowledge terms

### Capture

Original user input such as typed text, a voice recording, a photo, an imported
value, or a chat message. Capture is evidence; it is not automatically
canonical Knowledge.

### Note

A practical free-form record the User wants to keep. A Note may be linked to a
Person or Event. It does not automatically become a preference or fact.

### Memory

A user-preserved meaningful experience or moment, optionally including text,
date, photo, audio, place, Person, and Event. A Memory differs from a practical
Note and may be AI-eligible only with the appropriate user control.

### Journal

A private free-form record for the User. Journal content is unassigned to a
Person and AI-ineligible by default. Consumers must not silently reinterpret a
Journal entry as person Knowledge.

### Knowledge item

One canonical, persistence-independent item that HappyDate may use for product
reasoning. It carries kind, category, polarity, state, AI eligibility,
evidence, provenance, and confirmation information.

### Known knowledge

Confirmed or otherwise explicitly saved Knowledge that is active and eligible
for the current purpose. Happy may truthfully say it remembers this data.

### Candidate knowledge

Potentially useful information detected from current input but not yet
confirmed. Happy may offer to save it but must not claim it is remembered.

### Unknown information

Information absent from confirmed Knowledge and explicit current input.
Unknown does not mean false, disliked, missing in reality, or safe to infer.

### Evidence

The original source supporting a Knowledge item, including source kind, source
ID, original text where permitted, and capture time. Evidence is retained so
the system can explain and correct conclusions.

### Provenance

The trace from a derived fact, insight, recommendation, or timeline item back
to contributing domain source IDs. Provenance must not be replaced by an AI
explanation invented after the fact.

### AI eligibility

An explicit domain property controlling whether an item may cross into an AI
context for a given purpose. Storage does not imply AI eligibility.

### Semantic Memory

A deterministic read projection derived from canonical Knowledge. It
normalizes matching, merges provenance, exposes conflicts, and supports
purpose-specific selection. It is not a second persistence source.

### Memory Brain

The architectural capability responsible for selecting and projecting what is
reliably known. It contains Knowledge Layer, Semantic Memory, compatibility
mapping during migration, and confirmation-aware capture. It never creates a
fact merely because a language model proposed one.

## Care and conversation terms

### Care Brain

The deterministic capability that evaluates current time, Events, Reminders,
Person context, preparation state, and confirmed Knowledge to produce Care
Insights. It decides what matters, not how the final copy should sound.

### Conversation context

A bounded package prepared for one conversation purpose. It may include an
active Person, active Event, relevant confirmed Knowledge, Care Insights,
Gift context, and recent conversation turns. It excludes unrelated people,
private journals, and raw persistence records.

### Conversation Brain

The capability that turns bounded context into a calm, useful conversation. It
uses known context before asking, asks at most one useful follow-up at a time,
and does not independently query persistence or invent new facts.

### Action Layer

The application boundary responsible for validated, authorized, idempotent
state transitions initiated by UI, notifications, or Conversation Brain.
Examples include complete, snooze, confirm, save, select, purchase, and give.

### Primary insight

The highest-value Care Insight selected for immediate presentation on Home. At
most one primary insight should dominate the screen at a time.

### Relationship context

Factual, opt-in context such as the last interaction explicitly recorded in
HappyDate, the next Event, or the last confirmed Gift. It is not a relationship
quality score.

### Care intensity

User-controlled policy governing notification cadence, briefing detail, and
proactive follow-up. Planned modes are calm, balanced, and caring.

## Gift terms

### Gift idea

A possible gift. It is not evidence of selection, purchase, delivery, or
giving.

### Gift lifecycle

The explicit state of a Gift record. The current canonical states are `idea`,
`selected`, `purchased`, and `given`; future expansion must preserve the
distinction between suggestion and confirmed history.

### Gift history

Only Gifts confirmed as given, with their available date and provenance. A
legacy record typed `gift` is an idea, not Gift history.

### Saved gift link

A User-saved external HTTPS reference associated with a Person and optionally
an Event or Gift idea. Its title, merchant, image, and price are untrusted and
may become stale. A saved link is not a verified partner offer.

### Gift conversation session

A resumable, purpose-specific state for selecting a gift. It contains active
Person and Event context, confirmed answers, suggestions, decisions, and saved
links, but is not canonical Knowledge by itself.

### Gift feedback

User-confirmed feedback about one given Gift. One positive result does not
automatically become a broad preference without a separate confirmation.

## Presentation terms

### Person profile

The person-centred UI composition of overview, Events, Knowledge, Notes,
Memories, Gifts, links, and Timeline. It is a presentation composition, not a
single database row.

### Person Timeline

A read-only chronological projection across multiple domain sources. Timeline
unifies presentation, not persistence. It excludes technical logs, private
Journal content, and insignificant background operations.

### Presentation model

A localized, UI-ready shape derived from domain outputs. Presentation models
may contain copy and formatting but must not decide new domain semantics.

## Infrastructure terms

### Repository

A data-access boundary that reads and writes a specific persistence source,
enforces explicit projections, and reports errors. It does not classify,
recommend, score, translate, or format prompts.

### Compatibility mapper

An anti-corruption boundary that conservatively converts legacy persistence
records into canonical domain contracts while retaining original evidence. It
is migration infrastructure, not a permanent feature extension point.

### Application service

An orchestration boundary that authenticates or receives an authenticated
scope, invokes repositories and domain logic, applies an authorized Action,
and returns a stable result. It does not embed presentation-specific behavior.

### Projection

A deterministic, purpose-specific read model derived from canonical domain
data. Multiple projections may exist without creating multiple sources of
truth.

## Terms intentionally avoided

### "AI knows everything"

Use "Happy remembers what the User confirmed and allowed". Storage, inference,
and permission are distinct.

### "Relationship health score"

Use factual Relationship context. HappyDate must not rank or diagnose personal
relationships.

### "Contact"

Use Contact only for a phone-address-book source. Use Person after the User
selects someone into HappyDate.

### "Gift completed"

Use the exact lifecycle state. `selected`, `purchased`, and `given` are not
interchangeable.
