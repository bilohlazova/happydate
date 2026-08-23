# Assistant evaluations

HappyDate keeps a versioned, entirely synthetic Conversation Brain evaluation
set in `evals/assistant-conversation.json`. It covers all five product locales
and the highest-risk behavioral contracts:

- known facts are used before asking;
- absent information remains unknown;
- ambiguous people are never guessed;
- a saved idea is not described as purchased or given;
- instructions embedded in user data are ignored;
- responses contain no more than one focused question.

The dataset declares `targetBehaviorVersion`. Validation fails if it no longer
matches the active immutable manifest. The manifest versions the system prompt,
context schema and model configuration, and pins a SHA-256 fingerprint of the
actual canonical prompt so prompt edits cannot silently reuse old evaluation
evidence.

The complete bump and release procedure is documented in
`docs/assistant-behavior-versioning.md`.

`npm run eval:assistant` validates the dataset locally and in CI without making
network calls or incurring model cost. `npm run eval:assistant:live` is an
explicit, paid opt-in that requires `OPENAI_API_KEY`, sends only synthetic
fixtures, evaluates the current configured model and reports scenario IDs plus
failure codes. It never prints generated response content.

The deterministic evaluator is a regression signal, not a proof that every
future response is safe. Live results should be reviewed when the model, system
prompt, context projection, limits or gift-learning policy changes. A failing
scenario must block that AI change until the prompt, context or criterion is
deliberately reconciled.

## Scheduled live baseline

`.github/workflows/assistant-live-evaluation.yml` validates the versioned
dataset and, when the dedicated GitHub Actions secret
`HAPPYDATE_ASSISTANT_EVAL_OPENAI_API_KEY` exists, runs the paid synthetic live
evaluation every Monday at 05:17 UTC. It can also be started manually.

The workflow has read-only repository permissions, a 15-minute timeout and no
Supabase or production-user credentials. Its 30-day artifact contains only the
behavior/model header, scenario IDs, PASS/FAIL state and failure codes. Model
response text is never printed or uploaded. Until the dedicated secret is
configured, the offline contract still runs and the workflow explicitly
records that the paid live baseline was skipped.
