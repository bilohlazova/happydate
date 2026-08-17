# Assistant behavior versioning

The user-facing behavior of Happy is identified by
`ASSISTANT_BEHAVIOR_MANIFEST` in
`src/lib/assistant/assistantBehaviorManifest.ts`. The manifest binds together:

- the system-prompt version and its canonical SHA-256 fingerprint;
- the bounded context-schema version;
- the model-configuration version;
- the exact model, temperature and output-token budget.

The behavior version is returned in the safe
`X-HappyDate-Assistant-Version` response header, attached to content-free
orchestration telemetry and printed by the synthetic evaluation runner. It is
not a user, conversation or request identifier.

## Required change procedure

When changing the prompt, context semantics, model, temperature or output
budget:

1. assign a new `behaviorVersion`;
2. bump the affected component version;
3. recompute the prompt fingerprint when prompt text changes;
4. set the evaluation dataset's `targetBehaviorVersion` to the new version;
5. review or add scenarios for the intended behavioral difference;
6. run `npm run verify` and the explicit live evaluation before release.

The regression suite recomputes the canonical prompt fingerprint and compares
it with the manifest. This deliberately prevents a prompt edit from inheriting
the evaluation evidence of an older behavior version.

The offline dataset also has a required-scenario contract. A release cannot
silently remove coverage for grounded memory, honest unknowns, person
disambiguation, gift lifecycle, prompt-injection resistance, verified positive
and negative gift outcomes, conflicted outcome handling, or conversation
continuity and grounded day planning. The active dataset contains 14 scenarios across all five product
languages; live runs evaluate the same fixtures without printing response text.
