# LiftLoop UI/UX Redesign Implementation Plan

> **⚠️ SUPERSEDED (2026-09-27).** This plan is superseded by `docs/prd/WEBSITE_PRD.md`,
> `docs/prompts/WEBSITE_BUILD_PROMPT.md`, and the design system in `design-system/MASTER.md`.
> Where this document conflicts with those, they win. Retained for history only.
> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the LiftLoop UI redesign, map route tracking, date filter fixes, and live SOS location.
**Architecture:** Use Stitch MCP to generate high-fidelity UI components based on the new spec, implement ORS polylines in MapplsMapView, and update backend APIs for strict filtering.
**Tech Stack:** React, Framer Motion, Stitch MCP, Tailwind CSS / Vanilla CSS, OpenRouteService.
---

### Task 1: Initialize New Design System in Stitch
**Files:**
- Create: `.stitch/DESIGN.md`

- [ ] **Step 1: Write the failing test** (N/A for design system generation)
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation:** Use `upload_design_md` and `create_design_system_from_design_md` with Stitch MCP using the aesthetic guidelines from `2026-05-18-liftloop-ui-redesign-design.md` (deep purples, neons, glassmorphism).
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

### Task 2: Redesign Landing Page via Stitch
**Files:**
- Modify: `src/pages/Landing.tsx`
- Modify: `src/components/common/Hero.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation:** Use `generate_screen_from_text` (Stitch MCP) with the new Design System to generate a "Premium, animated LiftLoop landing page with deep purple and neon accents, floating glass UI cards, and scroll reveals." Replace `Landing.tsx` and `Hero.tsx` with the generated code.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

### Task 3: Redesign Dashboards via Stitch
**Files:**
- Modify: `src/pages/StudentDashboard.tsx`
- Modify: `src/pages/DriverDashboard.tsx`
- Modify: `src/pages/UnifiedDashboard.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation:** Use `generate_screen_from_text` (Stitch MCP) to generate a "Premium dark-mode dashboard with overlapping glass widgets, vibrant accent colors, and responsive map layouts." Integrate this into the React code.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

### Task 4: Implement Map Polylines (Live Routing)
**Files:**
- Modify: `src/components/maps/MapplsMapView.tsx`
- Modify: `src/components/maps/MapView.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation:** Add OpenRouteService API calls to fetch routing data between `origin` and `destination`, and draw GeoJSON polylines on the map instance.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

### Task 5: Enhance SOS Live Location
**Files:**
- Modify: `src/components/common/SOSModal.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation:** Use `navigator.geolocation.getCurrentPosition` before calling the Twilio backend to inject the exact `lat` and `lng`.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

### Task 6: Modernize Date/Time Pickers
**Files:**
- Modify: `src/pages/FindRide.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation:** Replace native `<input type="date">` with a custom Framer Motion interactive calendar component or nicely styled interface that aligns with the new design system.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
