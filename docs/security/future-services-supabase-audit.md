# Future services: Supabase surface audit

Audited production project `happydate-prod` on 2026-08-16 after retiring the
Good Deed, Message from Heaven and gift-concierge submission paths.

## Verified production state

- `public.heaven_messages` does not exist.
- `public.good_deeds` does not exist.
- `public.gift_requests` does not exist.
- Storage bucket `heaven-videos` / `heaven_videos` does not exist.
- No `storage.objects` policy contains a Heaven bucket reference.
- The corresponding application APIs fail closed with HTTP 410 and do not
  parse or persist request data.

No destructive database operation or cleanup migration was needed. This is
safer than creating placeholder tables for services that are not launched.

## Re-entry gate

These surfaces must not be introduced until the relevant service has an
approved data-flow specification. At minimum, that review must define:

1. authenticated ownership and RLS for every row;
2. private storage with user-scoped object paths and explicit retention;
3. upload type and size limits, moderation and deletion;
4. consent, legal basis and export/deletion behavior;
5. payment-provider boundaries where money is involved;
6. abuse controls, auditability and an incident response owner.

## Separate advisor findings

The production Security Advisor also reported items outside this audit's
future-service scope: authenticated `SECURITY DEFINER` push/reminder RPCs,
an RLS-enabled server cache with no client policy, and disabled leaked-password
protection. They require a separate behavior-preserving review; they were not
changed as part of this audit.
