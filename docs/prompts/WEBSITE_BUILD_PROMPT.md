# LiftLoop — Website Build Prompt (paste-ready)

> Paste this whole file into a Claude session opened on the **LiftLoop** repo (web / Claude Code). It is self-contained: it names every skill to run, the order to build in, and the exact source of the 6 components to port. Full requirements live in [`docs/prd/WEBSITE_PRD.md`](../prd/WEBSITE_PRD.md) — read it first.

---

## Role & mission

You are a senior frontend engineer rebuilding the **LiftLoop** website UI. LiftLoop is a carpooling platform for **students and staff**. The current UI is inline-style, card-and-text heavy, and visually inconsistent ("AI slop"). Replace it with **one coherent, motion-rich, editorial design system**, weave in the 6 provided components everywhere, and implement **true route/direction carpool matching**. Do **not** break the Supabase backend, `src/lib/api.ts` contracts, or any of the 20 routes.

**Stack (confirmed):** Vite + React 19 + TS SPA, Tailwind v4 (`@theme` in `src/index.css`, no `tailwind.config`), framer-motion 12.38, react-router v7, zustand, react-hook-form + zod, recharts, Leaflet + Mappls, Razorpay, Supabase. Read the PRD's §2 audit before touching anything.

---

## Execution order (do these in sequence, committing after each phase)

### Phase 0 — Design system (must be first)
Run the `ui-ux-pro-max` skill and persist a master system:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "university campus carpooling ride-share community trust-first mobility" \
  --design-system --persist -p "LiftLoop"
```
Then read `design-system/MASTER.md`. Every subsequent visual decision derives from it. Also run supplemental domain searches as needed (`--domain color`, `--domain typography`, `--domain ux "animation accessibility loading"`).

### Phase 1 — Foundations
1. Add deps: `npm i lenis dialkit media-chrome swiper clsx tailwind-merge`.
2. Create `src/lib/utils.ts`:
   ```ts
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";
   export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
   ```
3. In `src/index.css` `@theme`, define the semantic tokens the components need — `--color-background`, `--color-foreground`, `--color-primary`, `--color-muted`, `--color-muted2`, `--color-muted3` — mapped to `MASTER.md` (light + dark). Keep existing brand scale working during migration.
4. Wrap the app (or at least the landing route) in `<ReactLenis root>`; ensure a single instance; disable its smoothing under `prefers-reduced-motion`.

### Phase 2 — Port the 6 components
Create `src/components/ui/` and port each component (sources in the Appendix). Re-skin demo colors/copy to `MASTER.md`. Wire per the PRD §4 table:
- **SmoothInput** — ship a **production variant with fixed spring params and NO `useDialKit`** (the DialKit panel is dev-only). Make it the default input across the site.
- **HoverExpandGallery** — combine Skiper52 (desktop, horizontal) + Skiper53 (mobile, vertical) behind one responsive component; feed real data.
- **ScrollReveal** (Skiper31 patterns) — reusable scroll-linked heading/section reveal; reduced-motion safe.
- **VideoReveal** (Skiper67) — the clip-path "open video from source" pattern; used for the logo→intro film.
- **TrafficHero** (Skiper39) — install from `https://skiper-ui.com/registry/skiper39.json`, then re-skin; hero metaphor for commute/traffic.

### Phase 3 — Rebuild pages (priority order)
`Landing` → `RolePortal`/`Login` → `StudentDashboard`/`DriverDashboard`/`UnifiedDashboard` → ride flow (`RideSearch` → `BookRide` → `LiveTracking` → `Chat` → `CreateRide`) → `AdminPanel` → `Profile`/`Verification`/legal. Replace inline-style card+text blocks with token-driven components. Keep all data hooks (`useStore`, `useRealtime`, `api.ts`) intact.

### Phase 4 — Intro film
Run **`/brag`** (tone polished/app-store, 15–25s) to generate the intro; put the output at `public/launch.mp4` + `public/launch-poster.jpg`. Play it via the Phase-2 `VideoReveal` clip-path transition from the logo; keep once-per-session gate + Skip + reduced-motion poster fallback.

### Phase 5 — Features (see PRD §6)
- **Corridor/direction matching** in `RideSearch.tsx`: point-to-polyline distance for pickup & drop against `rides.route_polyline`, plus a direction/order check (drop after pickup along the route). Reuse the polyline decoder + `getDistance` in `src/lib/maps.ts`. Keep date filtering + `cleanupPastRides`.
- **Hardcoded sole admin** `pranjalmishra2409@gmail.com`: client constant replacing `VITE_ADMIN_EMAILS` reliance in `src/lib/auth.ts`, **and** Supabase RLS/edge enforcement (server-side is the real gate).
- **Capped pricing band** (distance-derived min/max, enforced UI + server) + **bargaining** (counter-offer flow, persisted & audited).
- **Fix Razorpay env bug**: standardize on `VITE_RAZORPAY_KEY_ID`, declare in `vite-env.d.ts`, read consistently.
- **Live VC support**: WebRTC with **Supabase Realtime signaling** (offer/answer/ICE over a channel); text-chat fallback.

---

## Guardrails
- Don't rename/remove routes or change `api.ts` function signatures without updating all call sites.
- Client admin checks are UX only — the authoritative gate is Supabase RLS.
- SVG icons only (lucide/Phosphor already present); no emoji as icons; no raw hex in components (use tokens).
- Every Skiper animation must respect `prefers-reduced-motion`. SmoothInput hides the native caret — keep the animated caret + a visible focus outline for accessibility.
- Mark `.stitch/DESIGN.md` and `docs/superpowers/2026-05-18-*` as superseded (header note); don't silently contradict them.

## Definition of done
Matches [`WEBSITE_PRD.md` §10 Acceptance Criteria](../prd/WEBSITE_PRD.md#10-acceptance-criteria). Run `npm run build` clean; smoke-test all 20 routes; verify AA contrast (light+dark), reduced-motion, and no CLS regressions.

---

## Appendix — Provided component sources

Port these verbatim into `src/components/ui/`, then re-skin. They assume `@/lib/utils` (`cn`) exists (Phase 1) and the deps installed (Phase 1). **SmoothInput's `useDialKit` block is dev-only — replace with fixed params for production.**

> The six sources are: **SmoothInput / Input (Skiper106)**, **HoverExpand_001 (Skiper52)**, **HoverExpand_002 (Skiper53)**, **ScrollAnimation_002 / Skiper31**, **VideoPlayer + clip-path popover (Skiper67)**, and **Skiper39** (install from `https://skiper-ui.com/registry/skiper39.json`). The full copy-paste source for the first five was supplied in the originating request; paste each into its own file under `src/components/ui/` (e.g. `smooth-input.tsx`, `hover-expand.tsx`, `scroll-reveal.tsx`, `video-reveal.tsx`) and adapt. Skiper39 is fetched from its registry URL rather than pasted.

Attribution: components are from Skiper UI (free tier requires attribution) — keep the license/attribution comments present in the source files.
