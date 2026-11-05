# Landing (`/`) — override

Inherits MASTER. Deviations & composition only.

## Intent
The narrative marketing surface. Tells the JCBUST commute story through motion, top to bottom:
**stuck in traffic → there's a better way → how it works → the ride, the trust, the app → act.**

## Section composition (in order)
1. **Intro film gate** — logo → `VideoReveal` clip-path opens `public/launch.mp4`. Once-per-session
   (`sessionStorage`), Skip button (top-right, always focusable), reduced-motion → static poster + enter.
2. **TrafficHero (Skiper39)** — hero metaphor: everyone waiting in road traffic / the crowd. Re-skinned
   to MASTER (ivory canvas, navy ink, gold accent). Copy rewritten for JCBUST: headline + one-line
   value + primary CTA "Find a ride" (accent) + secondary "Offer a ride". Live map card may sit beside/below.
3. **ScrollReveal statement** — a short editorial line assembles on scroll (character transform),
   e.g. "Same route. Same time. Share the ride." Gold accent on the key word.
4. **HoverExpandGallery — "How carpooling works"** — 3–5 steps (request → match on your corridor →
   confirm price → ride together → arrive). Desktop horizontal expand, mobile vertical accordion.
5. **HoverExpandGallery — vehicle types** — car / bike / scooty (real iconography or imagery), seats & vibe.
6. **Trust & safety band** — verification, SOS, university-governed, live tracking. Not identical cards;
   an editorial split or bento. Numbers in mono.
7. **Live map / route showcase** — reuse existing map card, restyled to tokens.
8. **CTA + APK/app links + footer** — one primary act; legal links; JCBUST attribution.

## Deviations
- This is the **only** route wrapped in `<ReactLenis root>` for smooth-scroll-linked reveals.
- Hero may run edge-to-edge (full-bleed) past the container; inner content still respects gutters.
- Eyebrow labels introduce each section (§3 MASTER type).
- **Remove** the current repeated inline feature-card grid entirely.
