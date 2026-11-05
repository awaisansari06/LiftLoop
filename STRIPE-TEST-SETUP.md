# Stripe test Checkout for LiftLoop

Razorpay checkout has been replaced with Stripe-hosted TEST Checkout. Live Stripe keys are rejected.

## Required local settings

Add these server-only values to .env.local (never use NEXT_PUBLIC_ for them):

    STRIPE_SECRET_KEY=sk_test_...
    SUPABASE_SECRET_KEY=sb_secret_...
    STRIPE_WEBHOOK_SECRET=whsec_...

1. Create/sign in to your Stripe account and open a Sandbox or test environment.
2. Copy its test secret API key into STRIPE_SECRET_KEY. A publishable key is not needed for this hosted redirect flow.
3. In Supabase project Settings / API Keys, copy the backend secret key into SUPABASE_SECRET_KEY. The legacy service-role key is also supported as SUPABASE_SERVICE_ROLE_KEY. This key stays on the Next.js server and is used only after Stripe verification to confirm bookings.
4. Restart npm run dev.
5. For reliable confirmation even if the customer closes their browser, install Stripe's official CLI, sign in and run:

       stripe listen --events checkout.session.completed --forward-to localhost:3000/api/payments/webhook

6. Put the displayed webhook signing secret in STRIPE_WEBHOOK_SECRET and restart the app.
7. Sign in as a rider, choose a future ride offered by a different account, and continue to test checkout. Test with 4242 4242 4242 4242, any future expiry and any three-digit CVC. Never use a real card in this test flow.
8. The return page verifies the session server-side. Retry confirmation if necessary; do not pay twice. The signed webhook also confirms the same session idempotently.

## Database

supabase/admin-analytics-stripe-setup.sql adds the bookings table, an admin-only analytics function and a service-role-only booking fulfillment function. Apply it once after the foundation migration. Keep a record of the SQL applied in the dashboard; do not rerun CREATE TABLE setup scripts.

Prices and seat availability are checked on the server and rechecked in a database transaction after payment. Seat decrement is atomic. If the fare changes, the ride expires or its seats sell out before payment completes, Stripe issues an automatic test refund. No seats are reserved while the customer is in Checkout.

This implements test checkout and confirmation, not production payments or driver payouts. Paid-booking cancellation/refund through the bookings screen is not implemented. Other unimplemented backend features remain separate. Dashboard zero counts for unavailable tables are labelled with a setup notice.

## Validation

Without credentials the checkout endpoint should reject requests rather than simulate success. Full Stripe payment/webhook tests require the configured test account and server credentials. Anonymous callers must not execute admin analytics, and ordinary authenticated users must not write paid bookings or invoke fulfillment.

## Current mode: local simulated checkout

Stripe signup is invite-only in India, so PAYMENT_MODE=simulated is configured in .env.local. Run npm run dev. No Stripe account, Stripe key, webhook secret, or Supabase secret key is required for this mode; the existing Supabase URL and publishable key authenticate each rider.

The checkout clearly says Simulated payment / No money charged. Success creates a booking marked payment_provider=simulated, with a fare calculated in Postgres and an atomic seat decrement. Declining or closing checkout creates no booking. Cancelling a simulated booking restores its seats once and marks its simulated payment refunded. It does not issue or pretend to issue a real refund.

The simulation API is disabled outside development. Before deploying any real-payment version, also disable the database simulation switch in private.payment_configuration. The private table is not writable by ordinary clients. All current Stripe code rejects live keys, so this project is still a development-only payment implementation.

The Stripe setup above remains optional for later use. Set PAYMENT_MODE=stripe and supply the server credentials only when you have a valid Stripe test account.
