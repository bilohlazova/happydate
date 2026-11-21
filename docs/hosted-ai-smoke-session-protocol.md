# Hosted AI smoke session protocol (not permission to provision)

Production NO-GO / SEC-01 OPEN. Real Upstash compatibility remains unverified.

The server optional test guard is required on Vercel Preview: missing session ID fails closed. Production/local deployments without this ID preserve existing daily-budget controls. Never provide smoke credentials to another build without this guard. Trusted environment only: `HAPPYDATE_AI_TEST_SESSION_ID=sec01-<unique lowercase run identifier>`, exact `VERCEL_GIT_COMMIT_SHA`, isolated Redis URL/token and `VERCEL_ENV=preview`. No client parameter, request header or model content selects a session.

Each test deployment/instance uses the same session ID and Redis DB. Redis key `sec01:session:<id>` is never initialized/reset by the application. Owner-only setup after separate authorization must create it once, NX with a TTL, using JSON:

```
{"version":1,"sha":"<exact candidate SHA>","deadline":0,"status":"active","calls":0,"units":0,"pending":false}
```

Replace deadline with an approved future epoch-ms deadline before resource expiry. Do not seed deadline0. Retain a protected run journal and never reseed/resume the same session after deletion or expiration. Limit one approved session for the whole smoke: changing the ID does not grant another eight calls.

The atomic reserve script checks version/SHA/deadline/status/TTL, increments calls and conservative cost units and records a server-generated pending nonce. Eight attempts and 250000 units are hard application ceilings at reviewed gpt-4.1-mini pricing. Reserve includes full serialized SDK payload+4096 input estimate; payload exceeding20480 estimate or output exceeding2000 is rejected. SDK automatic retries stay disabled. Explicit repairs cross the same gate, and are blocked while the first call awaits reconciliation.

On completed call, daily budget settles using valid SDK input/output usage. Session finish records measured input/output/actual units but retains conservative units and pending. Missing usage, provider error, cancellation or failed daily settlement marks the session blocked. Ambiguous Redis response/crash keeps pending; it must not be automatically unlocked. Daily counters may roll over at UTC midnight; this session key/count never does.

External reconciliation is an owner-only process, not an HTTP API. Before `SESSION_ACK_LUA`, independently verify provider project/key/window/count/usage/cost, completed request and successful daily settlement; preserve receipt. ACK takes exact SHA, pending nonce and cumulative attempt count and CASes measured state. It never refunds units or decrements calls; the eighth ACK closes the session permanently. Wrong/duplicate ACK, blocked/expired/missing session denies. If billing is pending or a provider/settlement outcome ambiguous, STOP instead of ACK. No ACK on timeout/error. An operator may terminally block a run after separate permission; never reset it to active to finish tests.

CI uses a real Redis service for Lua semantics with a synthetic REST-to-redis-cli bridge. REST errors/envelopes and central call+stream boundaries have separate unit contracts. Neither is real Upstash or paid-AI runtime evidence. Do not infer a provider billing guarantee from application limits.

No remote initializer, public ACK/reset endpoint, credentials or test users are shipped. Provisioning, secret configuration, synthetic mutations and paid calls each require the owner's separate authorized scope. Cleanup removes only run-owned keys after stopping test dispatch and preserving aggregate evidence; no FLUSHDB and no refund of real daily spend.
