# Reliability checks

Run `npm test` and `npm run typecheck` for the automated checks. The suite covers
role access, checkout verification, passenger isolation, pickup PINs, stop order,
individual completion, missed pickups, cancellation eligibility, GPS freshness,
map loader recovery, realtime subscription ownership and async request races.

The journey database test runs the project SQL in a disposable PGlite database.
It does not query or alter the hosted Supabase project.

The realtime tests use the installed SDK to reproduce channel collisions and
verify independent subscriptions. An AST check scans every source channel call
so new subscriptions must use `realtimeTopic` too. Hook tests control deferred
responses to check trip changes, overlapping polls and duplicate actions.

## Production browser smoke test

1. Build with `npm run build`.
2. Start the production server: `npm run start -- --port 3107`.
3. In another terminal, run `node tests/browser-smoke.mjs`.

The browser test uses local driver and rider fixtures, intercepts database and
journey requests, blocks external services, and uses a temporary browser profile.
It checks dashboard rendering, starting pickup with background tracking, reopening
the journey, chat, bookings, rider dashboard, profile, ride creation, the rider's
pickup PIN and readiness confirmation. It fails on uncaught browser errors.
Route provider failures are simulated to ensure the trip controls remain usable.

Use `SMOKE_ORIGIN` to select another local server and `SMOKE_CHROME` to select a
Chrome executable. Otherwise it uses installed Chrome/Edge on Windows or the
Puppeteer-managed browser. It reads the public Supabase URL from `.env.local` to
match requests from the compiled app. Rebuild after changing public environment
variables.

## Validation on November 5, 2026

- 38 automated tests passed; TypeScript passed.
- The production Webpack build passed and the browser smoke test passed.
- Turbopack failed while starting its CSS worker on this Windows machine,
  including outside the sandbox. The default `npm run build` now explicitly uses
  Next.js's supported Webpack compiler. To diagnose Turbopack separately, use
  `node node_modules/next/dist/bin/next build --turbopack`.

The simulated browser test does not validate Google sign-in, hosted database
configuration, real GPS, locked-screen behavior, push delivery, or payment provider
availability. Those require a separate deployment check with authorized test
accounts and physical devices. These changes have not been deployed.
