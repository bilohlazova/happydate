# HappyDate 2.0

HappyDate is a personal AI care assistant for people who matter to you. It
helps you keep people, events, memories, and confirmed knowledge together,
then turn that context into a calm next caring action.

Live web version: <https://happydate.vercel.app>

## Product status

Implemented foundations include:

- Supabase authentication, owner-scoped data, and the people workspace;
- events and recurring dates, notes, private memories, and the daily Home view;
- Happy Chat with bounded, confirmed context;
- gift discovery, saved gift links, recommendations, and explicit actions;
- onboarding, personal profile, five-language UI (UK, PL, EN, DE, RU), and the
  points/reward system;
- responsive web experience and Capacitor Android/iOS shells with native
  camera, audio, deep-link, and push foundations.

Partially implemented capabilities include live gift/product availability,
physical-device push delivery, background voice, and production operations.
These areas have foundations in the repository but are not presented as
complete services.

Planned or deliberately deferred capabilities include subscriptions and store
billing, marketplace checkout and fulfilment, social discovery, full contact
synchronization, and car-grade/background voice. The dated
[`docs/happydate-implementation-status.md`](docs/happydate-implementation-status.md)
audit from 2026-08-16 is historical context, not the current product status;
the scope above is the repository's current documented boundary.

## Architecture

The application uses a person-centred domain model. Repositories own
persistence and ownership boundaries; the Memory Brain uses confirmed
knowledge; the Care Brain produces explainable insights; the Conversation Brain
receives bounded context; and the Action Layer owns explicit state changes.
The architectural rules and module map are documented in
[`ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/`](docs/).

## Technology

- Next.js 16 App Router, React 19, TypeScript, and next-intl;
- Supabase Auth, Postgres, Row Level Security, Storage, and Realtime;
- Capacitor 8.5.3 for the Android and iOS shells;
- Vercel for the web deployment;
- GitHub Actions for linting, type checks, tests, builds, runtime smoke checks,
  and native debug/simulator verification.

## Local development

Requirements: Node.js 24 and npm. Install dependencies and start the web app:

```sh
npm ci
npm run dev
```

Copy `.env.example` to a local environment file and provide the required local
Supabase and server-only values. The local Supabase configuration includes an
intentionally empty `supabase/seed.sql`; it contains no production or personal
data.

Run the quality checks with:

```sh
npm run lint
npm run typecheck
npm test
npm run build -- --webpack
```

The full repository gate is `npm run verify`; an already-built production
server can be checked with `npm run smoke:production`.

## Mobile role

The web application is the primary product surface. Android and iOS currently
provide native shells around the production web experience plus native
capabilities such as camera, private audio capture, authentication deep links,
and push-notification foundations. Store release, signing, physical-device
delivery, and background capabilities remain additional verification work.

## Project links

- Repository: <https://github.com/bilohlazova/happydate>
- Architecture entry point: [`ARCHITECTURE.md`](ARCHITECTURE.md)
