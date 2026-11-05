# Vercel deployment review — 5 November 2026

Verdict: use a restricted test deployment after the release prerequisites below.
Do not launch this version as a finished public service or accept real payments.
No Vercel deployment was made. The passenger journey setup was installed in the
hosted database afterward, at the user's request; see the status below.

## Verified

- TypeScript check and 24 automated tests pass, including the embedded Postgres
  passenger isolation, PIN, lifecycle and payment checks.
- Production Next.js build passes, generating 36 pages. API handlers remain dynamic.
- All 22 production HTTP smoke checks pass for page/static responses, input
  validation, unauthenticated API rejection and disabled simulation. Results are
  saved in `audit/deployment-http-results.jsonl`.
- Configured server secret values were not found in the generated public assets.
- Compatible dependency fixes were applied to the lockfile with install scripts
  disabled. npm reported zero vulnerabilities afterward.
- The configured database is hosted at Supabase, not on this computer.
- All 15 existing core tables are reachable with the server key. Anonymous API
  checks reveal no user profiles and deny access to private core feature tables.
  Active ride listings are intentionally readable without login.
- All three cloud upload buckets exist and are private: `profile-photos`,
  `driver-documents`, `attachments`. Each limits uploads to 10 MB and
  JPEG/PNG/WebP/PDF. The app resolves stored references into signed URLs.
- Production demo login was disabled; `?demo=1` no longer enables mock accounts.
- `.env.local` is ignored by Git. Its secret values were not copied into this report.
- Read-only hosted checks are saved in `audit/deployment-backend-results.json`.

## Release blockers and configuration

1. **Resolved: hosted journey setup installed on 5 November 2026.** Applied
   `supabase/passenger-journey-setup.sql` to project `bjgpbpkqqhxiqpebjumt` with an
   active-trip guard and transaction locks. No rides were in progress. All three
   tables and journey RPCs are now available through the Data API. Both confirmed
   bookings were backfilled, and existing booking count/payment totals were
   preserved. RLS, function permissions and Realtime publication were verified.
   See `audit/JOURNEY-INSTALLATION.md`. Do not rerun this one-time setup.
   Deploy the matching current UI when deploying to Vercel; older controls cannot
   complete a ride with unresolved passengers.
2. **Local site origin is localhost.** Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS
   deployment origin in Vercel, without a trailing slash. Do not import the local
   value unchanged. The auth helper uses this value for Google sign-in; Stripe
   checkout also uses it for return URLs.
3. **Payment recovery webhook is unconfigured.** `RAZORPAY_WEBHOOK_SECRET` is absent
   locally. Add a Test Mode `payment.captured` webhook pointing to
   `https://YOUR-DOMAIN/api/payments/razorpay/webhook`, then set the matching secret
   in Vercel. `.env.example` now includes the missing variable. Verify capture,
   booking, refund, duplicate callback and closed-tab recovery using test accounts.
4. **Real payments are deliberately disabled in code.** Both Stripe and Razorpay
   require test keys. Simulated payments only work under `next dev`, not on Vercel.
   Uploading live keys will fail. Real payment support requires a separate reviewed
   implementation and provider configuration; do not remove the test guard alone.
5. **Notification retries need a scheduler.** Configure an external scheduler to
   POST `/api/push/dispatch` every minute with
   `Authorization: Bearer <JOURNEY_DISPATCH_SECRET>`. Keep the VAPID keypair stable.
   This endpoint currently supports POST only. Vercel Cron uses GET, so adding only
   a cron entry will not work. Vercel Hobby cron is limited to daily execution;
   use a scheduler supporting authenticated POST or implement a secured Vercel
   GET handler and use a plan supporting minute intervals.

## Remaining public-launch issues

- **Document approval is not enforced when creating a ride.** `CreateRide.tsx`
  upgrades a passenger to `both` and creates a ride; the database `ride_create`
  policy checks the role, not approved licence/vehicle verification. The terms say
  documents must be verified first. Add enforcement in the database before
  advertising a verified-driver service; a UI restriction alone is insufficient.
- **Public Nominatim is used for autocomplete.** Both location search components
  and `src/lib/maps.ts` send incremental searches to the public endpoint. That
  service explicitly prohibits client autocomplete. Switch these searches to an
  authorized geocoding/autocomplete provider before public launch. ORS is already
  integrated, but its quota must be sized and protected for the chosen use.
- **ORS proxy endpoints have no authentication or application rate limit.** Anyone
  can consume the shared provider quota through your public deployment. Add
  appropriate firewall/rate limits and monitor quota; do not rely on an in-memory
  counter across Vercel instances.
- **Safety/legal copy needs correction.** SOS currently records an admin inbox
  alert and explicitly reports that SMS/emergency dispatch is unavailable; Terms
  section 6 nevertheless says emergency contacts receive ride details. Confirm the
  privacy contact mailbox, retention/deletion process, operational support and
  public claims before launch. The older `SETUP-GOOGLE-AND-KEYS.md` describes mobile
  and unavailable services; it is not a deployment guide for this web app.
- Signed upload URLs expire after one hour. A long-open page may need to reload or
  refresh its file URLs. Test uploads and resubmission from separate accounts.
- Counterpart profile reads are restricted by the current profile RLS. Test whether
  rider/driver names and photos display for unrelated and booked accounts before
  promising those details; expose a deliberately limited profile interface if needed.

## What to configure in Vercel

Import this repository using the **Next.js** preset, repository root, `npm ci`
install command, `npm run build`, and automatic output directory. Use Node 24.x
to match this review. Keep `package-lock.json` committed. No static-export setting
or extra Vercel storage product is needed for the current app.

| Environment variable | Purpose / visibility |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing hosted project; public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public frontend key; legacy anon fallback supported |
| `NEXT_PUBLIC_SITE_URL` | Exact HTTPS site origin for that deployment environment |
| `NEXT_PUBLIC_MAPPLS_API_KEY` | Browser key; authorize the deployment domain with Mappls |
| `NEXT_PUBLIC_ADMIN_EMAILS` | UI hint only; actual admin approval must remain server controlled |
| `ORS_API_KEY` | Server secret for routing/geocoding |
| `SUPABASE_SECRET_KEY` | Server secret; never prefix with `NEXT_PUBLIC_` |
| `PAYMENT_MODE` | `razorpay` for the current test integration |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Matching Test Mode credentials, server only |
| `RAZORPAY_WEBHOOK_SECRET` | Matching Test Mode webhook secret, server only |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public half of persistent Web Push pair |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Private half; subject is your HTTPS site or contact mailto URI |
| `JOURNEY_DISPATCH_SECRET` | Server secret shared only with the scheduler |

Stripe variables are optional when using Razorpay. Never upload Supabase account
access tokens, database passwords, or the entire local environment file unnecessarily.
Vercel variables are independent from Supabase Edge Function secrets. Public
variables are embedded at build time: redeploy after changing them.

Set Supabase Auth **Site URL** to the canonical HTTPS site and add the exact
`https://YOUR-DOMAIN/auth/callback` to allowed redirect URLs. Google OAuth's
authorized redirect is the Supabase `/auth/v1/callback`, not the app callback.
Use a stable staging domain or a deliberately scoped preview allowlist when testing.
Keep preview tests isolated from real user data, especially when sharing service keys.

Commit all intended source, service worker, scripts and SQL additions before a Git
deployment. The workspace currently has many uncommitted and untracked release files;
Vercel connected to Git only receives committed files.

## Browser storage and migration

`localStorage` holds the Supabase login session, selected login role, cached routes,
recent searches, last location, dismissed announcements and intro preferences.
`sessionStorage` holds pending test-payment recovery references and UI dismissal
state. The Zustand stores hold temporary in-memory UI state. There is no application
upload or database persistence to the local server filesystem in `src`.

Browser storage is normal and works on Vercel. It is scoped to the origin: localhost
sessions/preferences will not follow users to the new domain. Users sign in again.
Rides, bookings, profiles and uploaded documents remain in the existing Supabase
project. Keep the buckets private; do not make them public to fix URL display issues.

## Final release verification

1. Back up and coordinate the journey SQL/UI release; verify the hosted schema and
   run Supabase Security Advisors after setup.
2. Set Vercel environment variables, auth redirects, map domain restrictions and
   webhook. Configure the scheduler after the endpoint is deployed.
3. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and
   `npm audit --omit=dev` on the exact committed release.
4. Run `node scripts/check-deployment.mjs` for read-only backend checks. A passing
   backend check does not certify OAuth, complete RLS or payment behavior.
5. Test two real signed-in accounts on HTTPS: upload/review documents, publish,
   search, test checkout, cancellation/refund, driver start, PIN boarding, independent
   drop-off, trip finish, chat, push and logout. Test denied GPS and denied push.
6. Verify an unrelated account cannot read private bookings, documents, live
   locations, notifications or change another user's data. Test an approved admin
   separately. No such full deployed multi-account browser test was completed here.

Local HTTP smoke script: start production on port 3100, then run
`node scripts/check-production-http.mjs`. Its 503 webhook expectation describes this
review's absent webhook secret; update that expectation when the secret is configured.
HTTP 200 for a protected page checks the HTML shell, not authenticated authorization.

References: [Supabase auth redirects](https://supabase.com/docs/guides/auth/redirect-urls),
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[Vercel cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs),
[Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).
