# AUDIT-03A — Global shell, navigation and accessibility

## Confirmed

- The header desktop navigation starts at `md` (`768px`), while the mobile-menu button was hidden by custom CSS at `640px` and the mobile menu used `sm:hidden`. This left the `640–767px` interval without usable primary navigation.
- The account menu exposed `aria-expanded` but did not close on Escape or move focus into the menu and back to its trigger.
- `AuthProvider` ignored `getUser()` rejection and allowed an older profile request to update state after the active user changed.
- The root layout provides one global `<main>`, while many route/page components also render `<main>`. The complete source-level inventory is recorded below; a route-by-route structural refactor is deferred because it spans the application shell and many pages.

## Fixed

- Mobile menu button and panel now remain available below `768px`; the custom CSS hide rule is aligned to `768px`.
- Account dropdown now uses ordinary links/buttons with `aria-haspopup`, `aria-controls`, and `aria-expanded`; Escape closes and restores focus, while outside pointerdown closes without stealing focus from the next interactive target.
- Initial auth errors now settle loading safely. Profile requests are invalidated on user changes and stale responses are ignored.
- Initial `getUser()` results are version-guarded so a newer `onAuthStateChange` session cannot be overwritten by an older promise result.

## Main landmark inventory (source-level)

The global wrapper is `src/app/layout.tsx`. The following route/page sources additionally render `<main>` and therefore require the deferred structural decision:

- `/about` — `src/app/about/page.tsx`
- `/auth/callback` — `src/app/auth/callback/page.tsx`
- `/auth/login` — `src/app/auth/login/LoginPageContent.tsx`
- `/auth/register` — `src/app/auth/register/RegisterPageContent.tsx`
- `/auth/reset` — `src/app/auth/reset/page.tsx`
- `/auth/update-password` — `src/app/auth/update-password/page.tsx`
- `/care` — `src/app/care/page.tsx`
- `/care/add-memory` — `src/app/care/add-memory/page.tsx`
- `/gift/start` — `src/app/gift/start/StartPageContent.tsx`
- `/notes` — `src/app/notes/NotesPageContent.tsx`
- `/onboarding-preview` — `src/app/onboarding-preview/page.tsx`
- `/people/add` — `src/app/people/add/page.tsx`
- `/reviews` — `src/app/reviews/ReviewsClient.tsx`
- `/services/asystent-ai` — `src/app/services/asystent-ai/page.tsx`
- `/services/podaruj-dobro` — `src/app/services/podaruj-dobro/page.tsx`
- `/services/wiadomosc-grupowa` — `src/app/services/wiadomosc-grupowa/page.tsx`
- `/services/wiadomosc-z-nieba` — `src/app/services/wiadomosc-z-nieba/page.tsx`
- `/services/wysluchaj-mnie` — `src/app/services/wysluchaj-mnie/page.tsx`
- `/services/zrzutka` — `src/app/services/zrzutka/page.tsx`
- `/survey` — `src/app/survey/page.tsx`
- `/profile` — `src/app/(app)/profile/page.tsx`
- `/settings` — `src/app/(app)/settings/page.tsx`
- `/settings/[section]` — `src/app/(app)/settings/[section]/page.tsx`

Additional rendered component sources (`LegalDocument`, `PeoplePageContent`, `PersonProfileContent`, `EventPreparationContent`, `PremiumServices`, `SettingsPageShell`, and `ErrorFallback`) also contain `<main>` and must be mapped to their call sites before changing the landmark boundary. No mass refactor is included in this PR.

## Mobile legal navigation

`Privacy`, `Terms`, and `Contact` remain defined in `FOOTER_LINKS` and are available on desktop. Because the footer is intentionally hidden below `md`, this PR does not add a second mobile legal menu or alter the public header. Recommended follow-up: add a compact legal-link group to an already-approved mobile surface (for example the existing mobile menu or a dedicated settings/about surface) and verify both guest and authenticated routes.

## Deferred

- Route-by-route landmark normalization after selecting whether the root shell or each route owns `<main>`.
- Approved mobile presentation for legal links.
- Browser/assistive-technology validation against a running deployment; no production settings or secrets were changed.
