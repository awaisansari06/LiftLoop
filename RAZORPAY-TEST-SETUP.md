# Razorpay test checkout

LiftLoop now uses `PAYMENT_MODE=razorpay`. Optional Stripe remains available by explicitly changing mode. Simulation is disabled in the database as well; reverting to simulation requires deliberately re-enabling its private configuration flag.

1. Open the Razorpay dashboard and switch to **Test Mode**.
2. Open **Account & Settings → Website and app settings → API keys**. Generate a test key pair or regenerate it if you no longer have its matching secret.
3. Save the matching pair in `.env.local`:

   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   PAYMENT_MODE=razorpay

4. Keep `SUPABASE_SECRET_KEY` configured as a server-only value. None of these secrets should use a `NEXT_PUBLIC_` prefix.
5. In Razorpay payment capture settings, enable **automatic capture** for test payments. Authorized payments alone do not confirm bookings.
6. Restart the app using `npm run dev`. Sign in as a rider, open another driver's future ride with an available seat, and choose **Continue to test checkout**.
7. Use Razorpay's test payment methods and confirm that the booking appears in **My bookings**. No real money is charged with test credentials.

The database setup in `supabase/razorpay-test-setup.sql` is already applied to the connected LiftLoop project. The rollback checks in `supabase/tests/razorpay-checkout.sql` passed: browser write protection, wrong fare rejection, duplicate confirmation protection, and seat capacity.

On November 5, the replacement Test Mode credentials were verified successfully: Razorpay returned HTTP 200 to a read-only Orders API request. Secret values were not displayed. A full checkout payment still needs to be tested.

If confirmation fails after payment, the browser saves its signed payment response for retry. Press the checkout button again in the same browser tab to retry confirmation without another payment. Keep the tab open until confirmed. Automatic webhook recovery and refunds/cancellation of Razorpay bookings are not implemented in this local testing integration; do not use it for live payments. Live key IDs are explicitly rejected.

Official integration guide: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
