# LiftLoop — full manual setup handbook

Everything in the code is wired. This doc covers the six external services you need to open in a browser and click through, in the order you should do them. Nothing here requires touching source code; every value lands in either **Supabase project secrets** or the mobile app's **`.env`** file.

You'll finish faster if you have these tabs open:

1. Google Cloud Console — <https://console.cloud.google.com>
2. Supabase dashboard for your project — <https://supabase.com/dashboard/project/hcmasdaadvlrbpxexucs>
3. Razorpay dashboard — <https://dashboard.razorpay.com>
4. DigiLocker Partner Portal — <https://partners.digitallocker.gov.in>
5. Google AI Studio — <https://aistudio.google.com/app/apikey>

Time budget: **35–45 minutes** if this is your first time. All accounts are free.

---

## Checklist (do in order)

- [ ] 1. Google Cloud OAuth clients (Web + Android + iOS)
- [ ] 2. Supabase — enable Google provider
- [ ] 3. Google AI Studio — get a Gemini API key
- [ ] 4. Supabase secrets — GEMINI_API_KEY, RAZORPAY_KEY_SECRET
- [ ] 5. Razorpay dashboard — copy Key Secret
- [ ] 6. DigiLocker Partner Portal — request client credentials
- [ ] 7. Mobile `.env` — paste the two client-side keys
- [ ] 8. Rebuild the app

Each section below has the exact clicks.

---

## 1. Google OAuth clients

You need **three** OAuth client IDs, all inside **one** Google Cloud project.

### 1.1 Create the project

1. Open <https://console.cloud.google.com>.
2. Top bar → project dropdown → **New project** → name it `LiftLoop` → **Create**.
3. When it finishes creating, click **Select project**.

### 1.2 OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen**.
2. User type: **External** → **Create**.
3. Fill:
   - **App name**: `LiftLoop`
   - **User support email**: your email
   - **Developer contact info**: your email
4. **Save and continue** through the "Scopes" screen (add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` if not already there) → **Save and continue**.
5. Under **Test users**, click **+ Add users** and add your own Gmail. **Save and continue** → **Back to dashboard**.

Your app stays in "testing" mode which is fine — only test users can sign in until you submit for verification (not needed for building).

### 1.3 Get your Android debug SHA-1

Google needs your keystore SHA-1 fingerprint to accept sign-ins from your app.

```bash
cd liftloop/app/mobile/android
./gradlew signingReport
```

Scroll to the `Variant: debug` block. Copy the `SHA1:` value — it looks like `AB:CD:EF:...` (40 hex chars separated by colons). Keep this tab open.

### 1.4 Create the Web OAuth client

1. **APIs & Services** → **Credentials** → **+ Create credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Name: `LiftLoop Web`.
4. **Authorized redirect URIs** → **+ Add URI**, paste exactly:

   ```
   https://hcmasdaadvlrbpxexucs.supabase.co/auth/v1/callback
   ```

5. **Create**. A dialog appears — **copy the Client ID and Client secret**. Keep them for step 2.

### 1.5 Create the Android OAuth client

1. **+ Create credentials** → **OAuth client ID**.
2. Application type: **Android**.
3. Package name: `com.liftloop.app`.
4. SHA-1: paste the value from 1.3.
5. **Create**. There's nothing more to copy — matching happens by package + SHA-1.

When you later ship a release build, repeat 1.5 with the **release** keystore's SHA-1 as a second Android OAuth client.

### 1.6 Create the iOS OAuth client (only if you'll build for iPhone)

1. **+ Create credentials** → **OAuth client ID**.
2. Application type: **iOS**.
3. Bundle ID: `com.liftloop.app`.
4. **Create**. Copy the **iOS URL scheme** it shows.
5. In Xcode → open `ios/LiftLoop.xcworkspace` → Info tab → URL Types → **+** → paste the URL scheme.

---

## 2. Enable Google in Supabase

1. Open <https://supabase.com/dashboard/project/hcmasdaadvlrbpxexucs/auth/providers>.
2. Find **Google** in the list → toggle **Enabled**.
3. Paste the **Client ID** and **Client secret** from step 1.4.
4. **Save**.

---

## 3. Get a Gemini API key (for AI verification)

1. Open <https://aistudio.google.com/app/apikey>.
2. If prompted, accept the terms.
3. Click **Create API key**. Pick the `LiftLoop` project you made in step 1.1 (or "Create API key in new project" if it doesn't show up — either is fine).
4. Copy the key (it starts with `AIzaSy...`).

---

## 4. Razorpay — get your Test Key Secret

1. Open <https://dashboard.razorpay.com/app/website-app-settings/api-keys>.
2. If you don't have any test keys yet, click **Generate Test Key**. Otherwise pick the row with Key ID `rzp_test_SpwZE80lZyD43f` (already in your `.env`).
3. Copy the **Test Key Secret** (revealed once — save it somewhere).

---

## 5. DigiLocker Partner Portal

DigiLocker is a Government of India service; getting credentials takes a business form and a couple of days for approval. Skip this section if you want to ship without DigiLocker — the app degrades gracefully (the DigiLocker button shows a "not configured" alert; camera verification still works).

If you want it:

1. Open <https://partners.digitallocker.gov.in>. Sign up as a partner (use the same email that owns the DigiLocker integration).
2. Under **My Apps** → **Register New App**:
   - App name: `LiftLoop`
   - Domain: your domain, or `hcmasdaadvlrbpxexucs.supabase.co` for now
   - **Callback URL**: exactly this line —
     ```
     https://hcmasdaadvlrbpxexucs.supabase.co/functions/v1/digilocker-callback
     ```
   - Requested scopes: **basic** and **issued documents (read)**.
3. Submit. When they approve you (email), the app page shows a **Client ID** and **Client secret**. Copy both.

---

## 6. Set Supabase secrets

Everything above that lives *on the server* goes into Supabase project secrets so the edge functions can read them.

Open <https://supabase.com/dashboard/project/hcmasdaadvlrbpxexucs/settings/functions> → scroll to **Secrets** → **Add new secret** for each of these:

| Key | Where it came from |
| --- | --- |
| `GEMINI_API_KEY` | step 3 |
| `RAZORPAY_KEY_ID` | `rzp_test_SpwZE80lZyD43f` (already in your `.env`) |
| `RAZORPAY_KEY_SECRET` | step 4 |
| `DIGILOCKER_CLIENT_ID` | step 5 (skip if not doing DigiLocker) |
| `DIGILOCKER_CLIENT_SECRET` | step 5 |
| `DIGILOCKER_REDIRECT_URI` | `https://hcmasdaadvlrbpxexucs.supabase.co/functions/v1/digilocker-callback` |

`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` / `SUPABASE_ANON_KEY` are auto-provided — you don't set them.

Alternatively via the CLI:

```bash
supabase secrets set \
  GEMINI_API_KEY=AIzaSy... \
  RAZORPAY_KEY_ID=rzp_test_SpwZE80lZyD43f \
  RAZORPAY_KEY_SECRET=... \
  DIGILOCKER_CLIENT_ID=... \
  DIGILOCKER_CLIENT_SECRET=... \
  DIGILOCKER_REDIRECT_URI=https://hcmasdaadvlrbpxexucs.supabase.co/functions/v1/digilocker-callback \
  --project-ref hcmasdaadvlrbpxexucs
```

---

## 7. Mobile `.env`

Two client-side values live in `liftloop/app/mobile/.env` — the Web Google client ID and (already present) your Supabase URL/anon key.

```bash
# Existing (leave as-is)
SUPABASE_URL=https://hcmasdaadvlrbpxexucs.supabase.co
SUPABASE_ANON_KEY=...
MAPPLS_API_KEY=...
ORS_API_KEY=...
RAZORPAY_KEY_ID=rzp_test_SpwZE80lZyD43f
ADMIN_EMAILS=...

# NEW — paste the Web Client ID from step 1.4
GOOGLE_WEB_CLIENT_ID=1234-abcd.apps.googleusercontent.com
```

The mobile SDK really does use the **Web** client ID — the Android one you created in step 1.5 is auto-matched by package name + SHA-1 and doesn't get pasted anywhere.

---

## 8. Rebuild and test

```bash
cd liftloop/app/mobile
npm install
npm run android
```

You should now see, in order:

1. **Onboarding** (3 slides). Skip →
2. **Login** with **Continue with Google** and email OTP fallback.
3. If new: **Role picker** (Rider / Driver / Both).
4. **Home**: greeting, "Where to?" pill, saved-places chip strip with an **Add** chip, **horizontal 6-vehicle carousel** (Scooty → SUV) with live fares.
5. **Explore tab**: auto-rotating hero promo carousel, "Popular on campus" 2x2 route grid, safety row, refer strip.
6. **Book flow**: 6-vehicle list with fastest / AC pills, seat pips, seat stepper, UPI/Cash toggle, fare breakdown.
7. **Live tracking**: moving vehicle marker that interpolates GPS updates and rotates toward direction of travel, movement trail, auto-follow crosshair, red **SOS** in top-right.
8. **Alarm** (full-screen red): hold-3s disc, siren haptic pattern, Call 112 / emergency contact / WhatsApp share.
9. **Verification portal** (Profile → Identity verification): fast lane for DigiLocker (identity verification), or AI-assisted camera flow with real-time Gemini extraction.
10. **Driver dashboard**: online toggle, today's earnings, live realtime request queue with Accept/Decline.

---

## Troubleshooting

**"GOOGLE_WEB_CLIENT_ID is empty" warning in logs**
Your mobile `.env` doesn't have the value from step 1.4, or you rebuilt without stopping Metro. Kill the Metro server (`Ctrl+C`) and rerun `npm run android`.

**Google sign-in error: `DEVELOPER_ERROR`**
The SHA-1 in your Android OAuth client (1.5) doesn't match the keystore that's actually signing your build. Re-run `./gradlew signingReport`, copy the fresh SHA-1, update the Android client in Google Cloud Console.

**AI verification returns 500 "GEMINI_API_KEY missing on server"**
You skipped step 6 for `GEMINI_API_KEY`. Set it in Supabase secrets and redeploy (secrets don't need a redeploy — they take effect on the next request).

**DigiLocker button shows "not configured"**
Skip section 5 or complete it. The rest of the app works without DigiLocker.

**Razorpay checkout errors immediately**
You skipped step 6 for `RAZORPAY_KEY_SECRET`. The Cash path in Book still works; only the "Pay ₹X" button needs the secret.

**Where do I find my SHA-1 for release builds?**
Same command, but pass your release keystore:
```bash
keytool -list -v -keystore /path/to/release.keystore -alias release-alias
```

---

## Server-side things I already did for you

- Deployed 3 edge functions on your Supabase: `create-razorpay-order`, `verify-document`, `digilocker-init`, `digilocker-callback`. Verify at <https://supabase.com/dashboard/project/hcmasdaadvlrbpxexucs/functions>.
- Wired the `mappls-proxy` for places autocomplete.
- The `send-sos` function is pre-existing and already has Twilio credentials baked in — SMS-based alarm works from day one.
- Database schema is untouched — the app targets your existing tables (`users`, `rides`, `bookings`, `live_locations`, `sos_alerts`, `driver_verification`, `saved_routes`, `notifications`).

---

## What the app looks like when it all works

- Home shows a compact horizontal carousel of six vehicle icons (scooty, bike, auto, mini, sedan, SUV) each with live fare and ETA, drawn as multi-tone axonometric SVG (not stock line icons).
- Ride search shows the same six in a vertical list with "Fastest" / "AC" pills and seat pips proportional to capacity.
- Explore has an auto-rotating hero carousel (promo → identity verify → group SUV), a 2x2 grid of "Popular on campus" routes, a safety trio (Alarm / Trusted contacts / Share ride), and a refer strip.
- Live tracking's vehicle marker glides between GPS pings on the UI thread and rotates in the travel direction — no teleport.
- Verification portal uses your phone camera to capture the doc, sends the image to Gemini 2.0 Flash, and shows extracted name/number/expiry with a confidence dial and authenticity flags in ~15 seconds.
- DigiLocker fast lane launches the government consent page in an in-app tab; on return, the app auto-marks verified members as `admin_approved=true`.
- SOS is a full-screen safety screen with a hold-3s disc; when armed it SMSes the emergency backup + user's contact via Twilio, buzzes a siren pattern, and offers Call 112 / WhatsApp share.
