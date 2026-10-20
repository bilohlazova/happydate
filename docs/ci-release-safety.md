# CI/CD and release safety

This document records the release checks for HappyDate AUDIT-02. It does not
change GitHub, Vercel, Supabase, or Production settings.

## GitHub Actions

`.github/workflows/quality.yml` runs on pull requests, pushes to `main`, and
manual dispatch. It has `contents: read`, receives placeholder Supabase values
only, and runs the web gate before the Android and iOS compile jobs. The three
job check names are:

- `Verify, build and runtime smoke`
- `Android debug shell`
- `iOS Simulator shell`

The jobs use maintained major-version action tags (`actions/checkout@v4`,
`actions/setup-node@v4`, `actions/setup-java@v4`, and
`actions/upload-artifact@v4`). Pinning those actions to reviewed commit SHAs is
an optional repository-hardening task; no SHA is guessed in this audit.

The weekly Assistant workflow is also read-only. Synthetic validation is
always free and is reported separately from the optional paid OpenAI run. The
paid run is enabled only by the existing
`HAPPYDATE_ASSISTANT_EVAL_OPENAI_API_KEY` secret; no new secret is introduced.

## Production AI configuration preflight

Run this only in a protected Vercel Runtime or equivalent release environment:

```sh
npm run preflight:production
```

The command checks the existing application contract for:

- `OPENAI_API_KEY`;
- `UPSTASH_REDIS_REST_URL`;
- `UPSTASH_REDIS_REST_TOKEN`;
- `OPENAI_DAILY_BUDGET_USD` within the existing `$0.10`–`$1000` bounds.

It prints only category names and never prints secret values. It does not call
OpenAI, Redis, Supabase, or a public endpoint. A PASS confirms configuration
presence and the budget shape, not provider connectivity, credit availability,
runtime routing, or a successful authorized AI request.

Do not run this as a normal `pull_request` job with Production secrets. If a
future release process needs runtime connectivity verification, use a separately
protected, approval-gated environment with a disposable synthetic fixture and
content-free logs.

## Main Ruleset instructions

The owner should create a ruleset targeting the `main` branch with:

1. Require a pull request before merging.
2. Require these status checks:
   - `Verify, build and runtime smoke`
   - `Android debug shell`
   - `iOS Simulator shell`
   - `Vercel – happydate`
3. Require the branch to be up to date before merging.
4. Block force pushes and deletion of `main`.
5. Do not require mandatory external approval for this single-owner project.
6. Do not include `Vercel – toto` or `Supabase Preview`.

The audit observed an empty repository ruleset list. The branch-protection API
was not readable by the connected GitHub integration, so the owner must confirm
the final effective rules in the GitHub repository settings UI.

## Legacy Vercel `toto` check

The old check should be disconnected from the HappyDate GitHub repository only
after the owner confirms that no other repository/project uses that Vercel
integration. The safe manual sequence is:

1. In Vercel, inspect the `toto` project Git integration and record any linked
   repositories, domains, deployments, and environment-variable ownership.
2. In the GitHub repository settings, inspect installed Vercel app/webhook
   connections and identify the installation or integration producing the
   `Vercel – toto` status.
3. Remove only the HappyDate repository connection from the old integration, or
   disable its GitHub deployment checks for this repository.
4. Leave the Vercel `toto` project, deployments, domains, and environment
   variables untouched until every dependency is confirmed.
5. Verify a new pull request reports `Vercel – happydate` and no longer reports
   `Vercel – toto`.

No Vercel project or repository setting was changed by AUDIT-02.
