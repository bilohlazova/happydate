# Native authentication deep links

Verified: 2026-08-16.

HappyDate supports authenticated return paths in the current Capacitor shells
through the application-owned custom scheme `com.happydate.app`.

## Implemented flow

1. Registration and password-reset screens detect the Capacitor native runtime.
2. Web sessions request the HTTPS callbacks on `happydate.vercel.app`; native
   sessions request the equivalent `com.happydate.app://auth/...` callback.
3. iOS and Android both register the same custom scheme.
4. The official Capacitor App plugin receives cold-launch and already-running
   `appUrlOpen` events.
5. `NativeDeepLinkBridge` maps only the HappyDate scheme or production origin to
   an allowlisted internal route and performs an in-shell navigation while
   preserving Supabase query/hash credentials.
6. Post-auth `next` and `redirectTo` values pass the same internal-route
   validation, preventing scheme-relative or external redirects.

## Production Supabase configuration

The production project `happydate-prod` has exactly these Auth redirect URLs:

- `https://happydate.vercel.app/auth/callback`
- `https://happydate.vercel.app/auth/update-password`
- `com.happydate.app://auth/callback`
- `com.happydate.app://auth/update-password`

The Site URL remains `https://happydate.vercel.app`. New auth routes must not use
wildcard redirects unless a separate security review proves they are necessary.
The production Confirm sign up and Reset password templates were inspected and
both use `{{ .ConfirmationURL }}`, so Supabase can preserve the requested
allowlisted web/native destination.

## Verification evidence

- Capacitor sync discovers `@capacitor/app` on iOS and Android.
- Production Next.js build succeeds.
- Android debug build succeeds with the App plugin and deep-link intent filter.
- Unsigned iOS Simulator build succeeds with the App plugin and URL type.
- Automated tests cover trusted/untrusted origins, unknown paths, open-redirect
  attempts, scheme consistency and native callback generation.

## Remaining device gate

Custom-scheme registration and compilation are verified, but email applications
and OS launch behavior still need physical-device tests for:

- app closed, backgrounded and foregrounded;
- confirmation and password recovery links;
- expired, already-used and malformed links;
- session persistence after return;
- behavior when HappyDate is not installed.

Universal Links/App Links remain the preferred final UX because HTTPS links have
a website fallback and domain ownership verification. They must be introduced
after a permanent production domain and Android release-signing certificate are
fixed; the Vercel preview domain and debug certificate are not suitable inputs.

Supabase currently uses its built-in email sender. The Dashboard explicitly
marks that service as rate-limited and unsuitable for production, so custom SMTP
and deliverability testing remain a release gate even though callback routing is
now configured correctly.
