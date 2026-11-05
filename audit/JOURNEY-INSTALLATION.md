# Passenger journey installation — 5 November 2026

Applied to hosted Supabase project `bjgpbpkqqhxiqpebjumt` through its signed-in
SQL Editor, as explicitly requested. Vercel was not deployed.

## Preconditions and transaction

- Zero rides were in progress immediately before setup. The transaction also
  locked rides/bookings and checked again before modifying the schema.
- The refund prerequisite and private schema were present.
- The two overwritten function definitions and two replaced policy definitions
  were saved in `journey-before-setup.json`. This is a targeted schema recovery
  snapshot, not a full database backup.
- Applied the existing setup file with a five-second lock timeout, a sixty-second
  statement timeout and the active-trip guard. Exact SQL: `journey-applied-setup.sql`.
- An initial attempt had a syntax error in the added guard and was rejected before
  schema changes. The corrected transaction completed successfully.

## Verified on the hosted database

- Created `public.passenger_journeys`, `public.push_subscriptions` and
  `public.journey_push_outbox`, all with RLS enabled.
- Created private boarding PIN storage and journey functions, and replaced the
  legacy transition implementation with the journey state machine.
- Backfilled both confirmed bookings, creating two journey records and two PINs.
  No confirmed booking is missing a journey.
- Original three bookings and paid-booking total of INR 190.00 remained unchanged.
- All four public journey/cancellation function wrappers are security invokers.
- Signed-in roles can call journey snapshot/action; anonymous execution is denied.
- Outbox claiming is service-role only. Browser roles cannot select boarding PINs,
  push subscriptions or outbox rows directly.
- Passenger journeys are published to Supabase Realtime.
- The read-only cloud API check now passes for every table. Journey RPCs are exposed
  to the server role. Fixed the check script to select `booking_id` for journeys,
  whose primary key is not named `id`.
- Embedded Postgres journey regression test passed before installation.

Evidence: `journey-live-verification.txt`, `journey-installed.png`, and the refreshed
`deployment-backend-results.json`.

## Advisor review

The Security advisor lists `RLS Enabled No Policy` for private boarding PINs and the
two server-only push tables. This is intentional: browser grants are revoked and
access is through privileged internal functions/server code. Adding permissive
browser policies would weaken the design. The separate `Leaked Password Protection
Disabled` Auth warning remains; no Auth settings were changed in this task.
See `journey-security-advisors.txt` and `journey-security-advisors.png`.

## UI release

The matching UI and `/api/journey` handler are present in the workspace and passed
the earlier production build. This database now enforces passenger journey controls,
including for legacy callers. Include the current journey source, API routes,
service worker and dependencies in the committed Vercel release. The current local
development server reads the hosted database without needing another SQL setup.

Do not rerun the one-time setup on this project. No production UI deployment or
full signed-in driver/passenger browser journey was performed in this installation.
Webhook configuration, HTTPS origin/redirect configuration and scheduler setup
remain separate release requirements.
