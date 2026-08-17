# Production runtime smoke gate

Source tests and TypeScript cannot prove that the optimized application starts,
serves pages and applies runtime headers. After building, run:

```bash
npx next build --webpack
npm run smoke:production
```

The smoke runner starts `next start` on an ephemeral loopback port and verifies:

- public Home, About, Privacy, Login and native offline fallback pages;
- real HTTP 404 behavior;
- CSP, clickjacking, MIME-sniffing and framework-disclosure headers;
- rejection of non-JSON AI and telemetry bodies before business logic;
- fail-closed HTTP 410 behavior for all retired privileged future APIs;
- `Cache-Control: no-store` on error API responses.

It never connects to Supabase, OpenAI, email providers or stores, and it does not
create or delete user data. Authentication, physical-device permissions, real
push delivery and destructive account deletion still require separate controlled
end-to-end scenarios.
