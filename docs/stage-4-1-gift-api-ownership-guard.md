# Stage 4.1 — Gift API Ownership Guard

- Status: Complete
- Date: 2026-07-17
- Security boundary: authenticated user → owned person capability

## Threat

The Gift endpoint previously accepted an arbitrary `personId` and used a
service-role client immediately. Because service role bypasses RLS, a caller
could potentially request recommendations derived from another user's person
context or retrieve a cache entry before ownership was checked.

## Guard flow

```text
Authorization: Bearer access_token
    ↓ anon Supabase auth.getUser(access_token)
authenticated user id
    ↓ service-role ownership lookup
people.id = personId AND people.user_id = authenticated user id
    ↓
OwnedGiftPerson capability
    ├── cache read/write
    ├── Knowledge read: user_id + person_id
    └── legacy Notes fallback: user_id + person_id
```

No `userId` from body, query parameters, or other client payload is accepted.

## Responses

- Missing or invalid authentication: `401` with `unauthorized`.
- Missing or foreign person: `404` with `person_not_found`.

Returning the same 404 for missing and foreign records avoids exposing whether
a foreign person ID exists.

## Service-role policy

Authentication uses the publishable/anon Supabase key. Service role is first
used for the ownership query only after an authenticated user ID is available.
Every subsequent service-role operation requires the returned
`OwnedGiftPerson` object rather than accepting loose `userId`/`personId`
parameters.

Cache still uses `personId + occasion`, but it is accessed only after ownership
verification. Since person IDs are globally unique, the verified capability is
the ownership component of the cache boundary.

## Protected operations

- Cache lookup cannot precede authentication or ownership.
- Knowledge reads include both `user_id` and `person_id`.
- Legacy Notes reads include both `user_id` and `person_id`.
- Cache writes require `OwnedGiftPerson`.
- Invalid person IDs do not trigger Knowledge, Notes, cache, or OpenAI work.

## Unchanged behavior

Prompt, model, temperature, recommendation count, JSON schema, successful
response schema, OpenAI integration, and Gift Knowledge classification remain
unchanged. The intentional API change is rejection of unauthenticated and
unauthorized access.

