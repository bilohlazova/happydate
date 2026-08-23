# Authenticated privileged RPC audit

Audit date: 2026-08-23.

## Scope

- `consume_my_in_app_deliveries(integer)`
- `register_my_push_device(text, text, text)`
- `disable_my_push_devices()`
- `save_my_onboarding_survey(text[], text[], text, text, jsonb)`

These functions intentionally use `SECURITY DEFINER` because they provide an
atomic, narrowly scoped operation across data that must not be directly
writable by the client. The Supabase Security Advisor warning is therefore
expected, but it remains a required manual-review item after every change.

## Verified production boundary

- Every function is owned by `postgres`, uses an empty `search_path`, and
  schema-qualifies relations.
- `PUBLIC` and `anon` have no `EXECUTE`; only `authenticated` may call them.
- Every function rejects a missing `auth.uid()` and derives row ownership from
  that value. No caller-supplied user identifier exists.
- Reminder claims and device disabling filter by the authenticated owner.
- Survey replacement, generated Events and the one-time reward use only the
  authenticated owner and remain one atomic transaction.
- All scalar and collection inputs are bounded. Migration
  `20260823125108_bound_privileged_rpc_payloads.sql` adds per-item and aggregate
  byte limits that were missing from survey preferences and special-date JSON.

## Accepted residual warning

The functions remain in `public` because the browser client invokes them via
PostgREST RPC. Moving them to a non-exposed schema would require replacing the
client RPC boundary with a trusted server or Edge Function. Until that
architecture is adopted, keep the explicit grants, identity checks, empty
search path, regression tests and recurring Advisor review.
