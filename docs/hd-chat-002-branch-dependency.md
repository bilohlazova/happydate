# HD-CHAT-002 — branch dependency and release gate

- Branch: `feat/hd-chat-002-unified-happybot`
- Temporary base: `dd24f2091638e1d658eb0ed55ba1ed40a4442696` (PR #31, HD-CHAT-001 privacy guards: owner reset, `useRestoreGuard`, `PrivateSnapshotBoundary`).
- PR #31 is unchanged, still Draft, not merged. This branch is not merged and not pushed.
- **Release gate:** HD-CHAT-002 must not reach production before the HD-CHAT-001 privacy gate is closed.
  The real A/B staging E2E (checklist v2) was deferred by the owner to the next full app test and remains an **open risk**.
- When PR #31 is merged, rebase this branch onto the updated `main` (`git rebase --onto main dd24f20`).
