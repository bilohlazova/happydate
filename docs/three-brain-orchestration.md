# Three-brain orchestration

HappyDate now has one explicit contract for the direction of personalized
reasoning:

1. **Memory Brain** receives repository/domain input and returns a bounded
   projection of reliable memory plus source provenance.
2. **Care Brain** receives that projection, decides what matters now and returns
   semantic reason codes plus the sources used for the decision.
3. **Conversation Brain** receives only the bounded Memory and Care projections.
   It may prepare language and propose typed actions, but every proposed action
   requires confirmation and is not executed by the orchestrator.

`src/lib/orchestration/threeBrainOrchestrator.ts` is deliberately pure. It does
not import repositories, Supabase, routes or UI. Its trace contains counts,
reason codes and action types—not private user content—so later production
observability can measure orchestration quality safely.

Home is the first adopted consumer through
`src/lib/home/orchestrateHomeBrains.ts`. Repository access remains in the Home
loader, while the adapter performs the three bounded transformations and returns
the same established Home projections.

Assistant now also adopts the contract at its server boundary. Authenticated
requests rebuild People, Events and Memory context through a bearer-scoped
Supabase client and RLS, then replace every private fact supplied by the browser.
Guest requests retain only the validated message and conversation. Active-person
selection succeeds only when that identifier exists in the owner-verified People
projection. No service-role client is used for this context path.

The verified projection is loaded only after the distributed request and
concurrency limits grant access. A throttled request therefore cannot trigger
private Home/Knowledge reads. Failure to verify the bearer owner or rebuild the
context returns a content-free `503` and never falls back to browser facts.

Successful Assistant preparation emits one content-free operational event. The
event uses coarse source-count buckets and closed reason/action vocabularies;
names, identifiers, dates, titles, messages, notes and exact record counts are
not accepted. This makes orchestration health measurable without turning logs
into a second store of relationship data.
