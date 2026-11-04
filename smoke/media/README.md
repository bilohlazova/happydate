# Exact-SHA Staging media smoke

The workflow only runs on `codex/media-smoke-72b341b` pushes affecting this harness. It checks out the Draft PR #20 avatar fix at `1caee102e9542a28dc8d0a5813775b07af54a2e2`, builds it on Ubuntu, and uses real Chromium against localhost with HappyDate Staging. It does not repeat the full quality gate. It does not certify a deployed Preview or Vercel routing/protection.

Only the Staging service-role JWT is supplied from the branch-restricted GitHub Environment `happydate-media-staging`. The public key is the existing reviewed Staging browser key. The secret is scoped to fixture, test assertion and cleanup steps, excluded from the application server environment and never supplied to browser code. Two isolated browser contexts receive ordinary user sessions. No auth bypass endpoint is added.

Checks: both users upload/replace/remove avatars and verify rendered photos and old-object cleanup; upload Memory images, verify private rendering, edit/remove an image and delete the Memory with Storage cleanup; attempt cross-account Memory read/update/delete and private image download/sign/upload/delete through ordinary RLS clients.

The always cleanup step removes only the recorded synthetic UUID prefixes from avatar/image/audio buckets, deletes their Memories and auth users, and verifies absence. A cleanup error fails the job. Sudden runner loss or unavailable Staging can prevent cleanup; the operator should recover using run-specific Auth metadata, never broad deletion. No test state/passwords/tokens are uploaded as artifacts.
