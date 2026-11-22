# Applied Staging-only reconciliations

These two reviewed SQL operations were already applied to `xgelazzdgluuenqkymox`
through the Management API, using remote versions 20261102190934 and
20261102191356. The exact payloads match the approved query SHA256s in
`applied.json`. Their source bytes are unchanged from d263b92.

They are deliberately **outside `supabase/migrations/`**. Supabase CLI's standard
migration replay and the repository deployment/build jobs must not apply them
to Production or repeat them on Staging. The 5 MiB public-avatar provisioning is
Staging-specific; Production bucket metadata and policies remain unchanged.
The original canonical historical survey migration remains in its original
location/history because it is part of the core application schema.

`npm run check:migrations` enforces this separation during `npm run verify`,
including detection of accidentally renamed copies by source hash. Tests may
load these files inside isolated rollback transactions to exercise behavior.
Local rehearsal is explicit and never targets a remote database.

No remote migration repair/renumbering or production ledger write is needed for
this change. Historical repository/remote-ledger mapping drift is documented in
docs/audit-db01b-stored-sql-and-staging-rehearsal.md: an unreviewed raw `db push`
remains prohibited, not declared safe. The normal Vercel build runs no database
migration. Future database work needs an explicitly reviewed target-specific
plan rather than replaying historical gaps. Do not copy these files back into
the automatic migrations directory to make the ledgers look equal.
