# LiftLoop UI/UX Redesign & Core Features Spec

> **⚠️ SUPERSEDED (2026-09-27).** This spec is superseded by `docs/prd/WEBSITE_PRD.md`,
> `docs/prompts/WEBSITE_BUILD_PROMPT.md`, and the design system in `design-system/MASTER.md`.
> Where this document conflicts with those, they win. Retained for history only.

## 1. Overview
The goal of this redesign is to completely transform the LiftLoop web app from a static, basic UI into a highly premium, lively, and fully responsive platform. The update introduces vibrant themes, glassmorphism, fluid animations, and solidifies core missing functionalities like live map routing and emergency location broadcasting.

## 2. Core Functional Requirements
1. **Live Route Design & Tracking:**
   - Instead of just displaying static markers, the map (via Mappls/OpenRouteService) must render dynamic polylines between the origin and destination.
   - Show real-time distance and estimated time of arrival (ETA) matrix for selected routes.
2. **Date/Time Picker Modernization:**
   - Completely replace the default HTML `<input type="date">` across all scheduling and search panels.
   - Implement custom, touch-friendly calendar popovers (e.g., via `react-datepicker` styled from scratch, or custom Framer Motion cards).
3. **Past Ride Auto-Deletion / Filtering:**
   - `getRides` API calls must aggressively filter out dates that have passed.
   - Prevent the display of "ghost rides" from previous days.
4. **SOS Live Location Fix:**
   - Intercept the browser's Geolocation API when the SOS is triggered.
   - Append `lat` and `lng` directly into the Twilio Edge Function payload so the emergency contact receives a clickable Google Maps/Mappls URL.

## 3. UI/UX Design Direction
### Landing Page
- **Color Palette:** Shift away from standard white and blue. Embrace deep purples (`#2D1B69`), neon accents (`#FF3366`, `#00F0FF`), and warm dark-mode backgrounds.
- **Animations:** Implement scroll-linked Framer Motion reveals, floating UI cards (glassmorphism), and background glowing orbs.
- **Liveliness:** The page should feel alive with hover micro-interactions, spring animations on buttons, and dynamic hero graphics.

### Dashboards (Rider, Driver, Admin)
- **Structure:** Move from simple boxed grid layouts to overlapping dashboard widgets with varying opacities and backdrop blurs.
- **Colors:** Each role will have a subtle primary accent (e.g., Rider = Coral/Orange, Driver = Emerald/Teal, Admin = Violet/Indigo), set against a unified dark/premium-light hybrid background.
- **Responsiveness:** All panels, tracking maps, and buttons must adapt flawlessly to mobile views. Cursor movements on desktop should trigger subtle tilt/lighting effects.

## 4. Execution Phases (Step-by-Step)
**Phase 1: Backend & Core Tracking Fixes**
- Fix the `getRides` filter for expired dates.
- Implement the Geolocation logic inside `SOSModal` to parse and send accurate `lat/lng`.
- Hook up `MapplsMapView` / `MapView` to render actual direction polylines between locations.

**Phase 2: Global UI Theming & Component Library**
- Update global CSS / `index.css` with the new color tokens, glowing variables, and glassmorphism utilities.
- Rebuild the fundamental inputs (Date picker, search bars, buttons).

**Phase 3: Landing Page Overhaul**
- Rewrite `Landing.tsx` and `Hero` components with the new lively aesthetic.

**Phase 4: Dashboard Transformation**
- Redesign `StudentDashboard`, `DriverDashboard`, and `UnifiedDashboard` integrating the new glass UI cards, custom charts/stats, and responsive map layouts.

---
*Awaiting User Approval to generate the task plan (`planning` skill) for Phase 1.*
