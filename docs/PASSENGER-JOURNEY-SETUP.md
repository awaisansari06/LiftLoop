# Passenger journey release

Installed in hosted project `bjgpbpkqqhxiqpebjumt` on 5 November 2026. The following
steps document the original installation procedure; do not rerun the one-time SQL
on that project. See `audit/JOURNEY-INSTALLATION.md` for verification and release status.

The new UI and database setup must ship together. The SQL changes the existing
ride transition endpoint so it cannot finish a ride with unresolved passengers.
Do not apply it ahead of the UI release while drivers are using the old controls.

1. Finish existing active journeys before the release window. Preserve a database backup.
2. Apply `supabase/passenger-journey-setup.sql` once in the matching Supabase SQL Editor,
   after the existing foundation, payments, feature repair and refund repair scripts.
   It adds passenger journeys, backfills confirmed bookings and leaves payment amounts unchanged.
3. Run `node scripts/setup-journey-push.mjs` locally. Set the generated VAPID pair,
   VAPID_SUBJECT (your HTTPS site or contact mailto URI), and JOURNEY_DISPATCH_SECRET
   as server/deployment environment variables. Only NEXT_PUBLIC_VAPID_PUBLIC_KEY is public.
   Keep the same VAPID pair for every instance and deployment; never commit private values.
4. Build/deploy this app version and restart local Next.js if testing locally.
5. Configure a server scheduler to POST `/api/push/dispatch` every minute with
   `Authorization: Bearer <JOURNEY_DISPATCH_SECRET>`. Actions dispatch immediately;
   this scheduler retries failures, including notifications queued by refund actions.
   The outbox uses a two-minute delivery lease and retries up to eight times.
   Arrival/nearby pushes are suppressed once the passenger boards, and push alerts
   expire after five minutes. Historical events remain in the in-app inbox.
6. Each passenger explicitly enables push alerts from the notification bell. On iPhone,
   install to the Home Screen first. HTTPS (or localhost) is required. Push delivery
   depends on browser permissions, connectivity and the OS; in-app alerts remain available.

## Journey behaviour

- After booking, passengers open Pickup details & tracking to set pickup, drop-off and
  a landmark. Points lock when the driver leaves. Drivers review the route and can
  change pickup and drop-off order before departure. All pickups precede all drop-offs.
- Leaving starts location sharing and sends individual departure alerts. Nearby alerts
  require a fresh driver position within 500 metres of the next pickup; arrival is
  explicitly confirmed by the driver. Boarding needs the passenger's four-digit PIN.
  Five wrong attempts lock PIN entry for five minutes. PINs are never exposed to drivers.
- No-show requires five minutes after arrival. It ends the pickup workflow and places
  the booking in Past trips, without claiming a refund or completed transport.
- Each drop-off completes only that passenger's booking. Finishing the overall ride
  requires every passenger to be dropped off, cancelled or marked as a missed pickup.
- Personal ETA includes preceding stops, two minutes per pickup, and the driver's
  remaining reported delay. It expires after 90 seconds without a route update.
  Driver location and ETA updates continue across app pages, while the app remains open.
  Browsers may suspend GPS when the app is backgrounded or the screen locks.
- Online cancellation closes at departure or when the driver leaves. Existing verified
  test-payment refund paths remain in use; Stripe cancellation needs support.
- Trip summaries provide timestamps where recorded, payment/refund status, a text receipt,
  ratings after drop-off and problem reporting. Legacy timestamps are never fabricated.

## Verification

`npm test` runs an embedded real Postgres engine through PGlite, loading this setup
after the existing SQL scripts. It exercises rider isolation, boarding PINs, ordered
stops, waiting rules and independent booking completion. Also run `npm run typecheck`
and `npm run build` before release. After applying the setup, run Supabase Security
Advisors and verify the driver/passenger flow with separate signed-in test accounts.

No production schema change or deployment is performed by running these tests.
