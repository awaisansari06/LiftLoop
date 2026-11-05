# LiftLoop local setup

Run in PowerShell from A:\CODEX\RideSaathi:

    npm ci --ignore-scripts
    npm run dev

Open http://localhost:3000. Stop with Ctrl+C. Use npm run build to check the production build.

Your private settings file is .env.local; .env.example lists the supported values. Restart the dev server after editing it. Never put service-role keys, OAuth client secrets or payment secrets in NEXT_PUBLIC_ variables; those are public browser values.

## Accounts and keys

- Supabase: create YOUR project at https://supabase.com/dashboard. Copy its project URL and anon/publishable key into NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. This powers authentication, database, storage and realtime.
- Google login: create a Web OAuth client in https://console.cloud.google.com, configure its callback to https://YOUR_PROJECT.supabase.co/auth/v1/callback, and enter its client ID and secret in Supabase's Google provider settings. Allow http://localhost:3000/auth/callback in Supabase redirects and set the site URL to http://localhost:3000.
- Mappls: obtain a browser map key from https://apis.mappls.com for NEXT_PUBLIC_MAPPLS_API_KEY. The included mappls-proxy function also needs server secrets MAPPLS_CLIENT_ID, MAPPLS_CLIENT_SECRET and MAPPLS_REST_KEY.
- OpenRouteService: ORS_API_KEY enables the routing integration; https://openrouteservice.org.
- Razorpay: NEXT_PUBLIC_RAZORPAY_KEY_ID is the public checkout key. Start with test credentials at https://dashboard.razorpay.com. Payment verification needs a trusted backend before real payments can be used.
- Phone login and SOS require a messaging provider and server functions; credentials alone will not enable the missing implementations.

## Backend gaps in this checkout

No SQL schema/migrations were included. The app expects users, rides, bookings, notifications and additional admin/support tables, security policies, database functions and storage buckets (profile-photos, driver-documents, attachments). These must be recovered from an authorized source or implemented before real accounts/data work.

Only mappls-proxy is included under supabase/functions. The UI also references mappls-route, send-otp, send-sos and AI verification functions that are absent. Full functionality requires implementing and deploying them. The existing docs/SETUP-GOOGLE-AND-KEYS.md refers to the original hosted project and a mobile app absent from this checkout; do not use that project's identifiers or assume those instructions complete this web backend.

Landing/demo screens can be explored without credentials; real authentication, booking, uploads and live data require the backend. NEXT_PUBLIC_ADMIN_EMAILS is a UI setting, not a substitute for server-side permissions.

## Project identity

The visible app has been renamed LiftLoop and personal social/contact links have been removed. App download buttons, APK links and installation QR codes have been removed. The inherited local Git history and remote settings have been removed at your request. No root license was found in the checkout; confirm reuse rights with the copyright holder before redistribution. Renaming does not transfer authorship or copyright.

## Next.js structure

Routes live in src/app (page.tsx per URL). Shared layout and metadata are in src/app/layout.tsx. Existing React screens live in src/screens and reusable UI in src/components. src/lib/navigation.tsx adapts existing navigation calls to Next Link and next/navigation; React Router is removed. Maps and animations load client-side to preserve browser APIs.

Commands: npm run dev (development), npm run typecheck, npm run build, npm start (serve a built release). Use http://localhost:3000 for Supabase redirects.

## Applied database foundation — 5 November 2026

The foundation migration in supabase/migrations/202611050001_foundation.sql has been applied to the LiftLoop Supabase project. The public.users and public.rides tables exist with row-level security enabled. The application's anonymous ride-search query, including its users relationship, was tested against the hosted project and returned HTTP 200 with an empty result.

Do not run this initial migration again against this project: it uses CREATE TABLE and has already been applied. Additional tables, storage, bookings/payment verification and backend functions remain separate implementation work. User profiles are private in this foundation; public driver-profile display is not implemented yet.

## Current backend status — admin analytics and simulated checkout

The admin analytics and bookings setup in supabase/admin-analytics-stripe-setup.sql and the simulation setup in supabase/simulated-checkout-setup.sql have been applied to the hosted project. Do not re-run these CREATE setup scripts.

The admin_analytics RPC requires an approved database admin and is unavailable to anonymous callers. It returns actual account, ride and test-booking metrics; missing features are listed explicitly. Other admin feature tables have not been created by this update.

PAYMENT_MODE=simulated is enabled locally. Run npm run dev to test checkout with no provider account or new secret keys. Each booking is labelled simulated and can be cancelled with its seats restored once. Stripe test Checkout remains optional for later; see STRIPE-TEST-SETUP.md. Simulation routes are disabled in production, and the private database simulation switch must also be disabled before any real-payment deployment.

Verification completed: production build, local payment unit tests, anonymous route/RPC rejection, approved-admin analytics, rollback-only database checks of duplicate confirmation, seat capacity, cancellation ownership, seat restoration and simulation-disable behavior. Advisor UI review was attempted but the dashboard connection timed out; it was not completed. A complete payment-provider checkout was not run because Stripe signup is blocked and credentials were not supplied.


## Current payment mode: Razorpay test

Checkout is now set to Razorpay test mode. See [RAZORPAY-TEST-SETUP.md](RAZORPAY-TEST-SETUP.md). Database setup and regression checks passed; the replacement Razorpay Test Mode credentials were verified successfully with HTTP 200. No live payments are enabled.
