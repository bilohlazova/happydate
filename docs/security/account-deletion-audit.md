# Account deletion security audit

Audit date: 2026-08-16  
Production project: `happydate-prod` (`yzcvdspiiiaidsdripxr`)

## Verified data boundary

The production catalog was inspected without selecting personal row contents.
Every public table directly tied to `auth.users` uses `ON DELETE CASCADE`:

- profiles, people, events and memories;
- gifts and saved gift links;
- reminders, preferences and delivery history;
- push devices;
- Knowledge change/review history.

`subscriptions.user_id` cascades through `profiles.id`. The server-only
`ai_gift_cache` cascades through its linked Person. No additional public table
containing a user/owner column was found outside this chain.

## Storage boundary

The production project has exactly three user-content buckets:

- `avatars`;
- `memory-images`;
- `memory-audio`.

All existing Storage policies scope object ownership to the first folder equal
to `auth.uid()`. Account deletion therefore enumerates only the authenticated
user's prefix in each bucket, recursively removes every object in bounded
batches, and only then deletes the Auth user so database cascades execute.

## Destructive-action safeguards

- The API accepts only JSON POST requests with a bearer access token.
- Supabase Auth resolves the user from that token on the server.
- The user must type the exact account email and acknowledge permanence.
- The sign-in must be no older than thirty minutes; otherwise the user is sent
  through a fresh login before deletion can be attempted again.
- The service-role key is server-only and is never returned or logged.
- Responses are `no-store` and expose only bounded error codes.
- Storage traversal and object counts are bounded to fail safely.

## Remaining release proof

Before public release, create a disposable test user, upload one object into
each bucket, create representative rows in every product area, delete the
account through the UI, and verify with aggregate/catalog queries that no Auth,
public-table or Storage record remains. Never perform this test on a real user.
