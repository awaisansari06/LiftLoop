# LiftLoop — Master Design System

> **Single source of truth.** Every restyled page and component derives from this file.
> Retires and supersedes the three legacy palettes (navy+gold inline `theme.ts`, blue+beige,
> purple+neon). Page-specific deviations live in `design-system/pages/<page>.md` and override
> only what they name.
>
> Generated for the LiftLoop web UI rebuild (Vite + React 19 + Tailwind v4). The
> `ui-ux-pro-max` search database was not present in this checkout, so this master was authored
> directly against the skill's priority ruleset (Accessibility → Touch → Performance → Style →
> Layout → Type/Color → Motion → Forms → Nav → Charts) and the product brief.

---

## 1. Product & Design Principles

**LiftLoop** is a carpooling network for students and staff. It is a **closed, trust-first campus mobility community** — not a
public ride-hailing clone. The design must feel **safe, premium, editorial, and in motion** — the
opposite of the current inline-style "card + text" sprawl.

Five principles, in priority order:

1. **Trust is the product.** Verification, identity, safety (SOS), and university governance are
   surfaced with calm confidence — never buried, never alarming. Deep navy = institutional trust.
2. **Editorial, not templated.** Big type, generous whitespace, a strong grid, intentional
   asymmetry. One idea per view. No stacked identical cards.
3. **Motion carries meaning.** Every animation expresses cause→effect (a caret follows text, a
   gallery panel expands under the pointer, headings assemble on scroll, a video opens from the
   logo). Never decorative-only. Always `prefers-reduced-motion`-safe.
4. **One system, everywhere.** Semantic tokens only — no raw hex in components. The six Skiper
   components are the backbone of inputs, galleries, reveals, and video, reused site-wide.
5. **Mobile-first & accessible.** WCAG AA in light and dark, ≥44px touch targets, keyboard-first,
   no horizontal scroll, no CLS.

**Aesthetic keywords:** editorial · warm-minimal · trust-first · motion-led · premium mobility.

---

## 2. Color System

Semantic tokens are the contract. The provided Skiper components reference shadcn-style names
(`bg-background`, `text-foreground`, `bg-primary`, `bg-muted`, `bg-muted2`, `outline-muted3`).
Those six MUST exist. Everything else is defined for our own components.

### 2.1 Core semantic tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-background` | `#F7F5F1` warm ivory | `#0F1A33` deep navy | Page canvas |
| `--color-foreground` | `#17223B` navy ink | `#EEE9DF` warm off-white | Primary text |
| `--color-primary` | `#1B2B4B` navy | `#D8A878` warm gold | Primary action / brand ink |
| `--color-primary-foreground` | `#FFFFFF` | `#0F1A33` | Text/icon on primary |
| `--color-muted` | `#ECE7DE` | `#17233F` | Section fill / raised surface |
| `--color-muted2` | `#E7E0D4` | `#1E2C4A` | **Input fill** (SmoothInput) |
| `--color-muted3` | `#C8956C` gold | `#C8956C` gold | **Focus ring / emphasis outline** |
| `--color-muted-foreground` | `#5A5F52` | `#B7B2A6` | Secondary / helper text |

> `muted3` is deliberately the gold accent, not a faint neutral: the Skiper inputs render their
> **focus outline** as `outline-muted3`, and a visible 2px focus ring is an accessibility
> requirement (`focus-states`). A pale neutral would fail it.

### 2.2 Brand & accent

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-navy` | `#1B2B4B` | `#1B2B4B` | Brand ink, headers, dark sections |
| `--color-navy-light` | `#2C4A7C` | `#3B5998` | Navy gradient stop, hovers |
| `--color-accent` | `#C8956C` warm gold | `#D8A878` | Highlights, secondary CTA, active |
| `--color-accent-strong` | `#A67A50` | `#C8956C` | Accent hover / pressed |
| `--color-accent-soft` | `#F5E6D3` | `#2A2A1F` | Accent tint background |

### 2.3 Surfaces & lines

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-card` | `#FFFFFF` | `#152240` | Card / panel surface |
| `--color-card-foreground` | `#17223B` | `#EEE9DF` | Text on card |
| `--color-popover` | `#FFFFFF` | `#17233F` | Menus, dialogs, command palette |
| `--color-border` | `#E3DCCF` | `#26355A` | Hairline borders, dividers |
| `--color-input` | `#E7E0D4` | `#1E2C4A` | Input fill (== muted2) |
| `--color-ring` | `#C8956C` | `#D8A878` | Focus ring (== accent) |

### 2.4 Functional / status (must pair with icon or text, never color alone)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-success` | `#3E8E5F` | `#6BC08C` | Verified, accepted, arrived |
| `--color-warning` | `#C77D2E` | `#E4A55A` | Pending, awaiting action |
| `--color-danger` | `#C6463F` | `#E8756E` | SOS, decline, destructive |
| `--color-info` | `#3D6AA6` | `#7BA3DE` | Neutral info, links |
| `*-soft` variants | 8–12% tint of each | raised tint | Status chip backgrounds |

### 2.5 Contrast (verified targets, AA)

- `foreground` on `background`: light `#17223B`/`#F7F5F1` ≈ 13.5:1 · dark `#EEE9DF`/`#0F1A33` ≈ 14:1.
- `muted-foreground` on `background`: light ≈ 5.1:1 (passes AA body) · keep ≥4.5:1.
- `primary-foreground` on `primary`: light white/navy ≈ 12:1 · dark navy/gold ≈ 8:1.
- Body text is never below 4.5:1; large display (≥24px/700) never below 3:1.
- Verify both modes independently; never assume light values hold in dark.

---

## 3. Typography

A distinctive editorial pairing that breaks from the generic Poppins look while staying friendly
and trustworthy. All three are Google Fonts (loaded with `display=swap`).

| Role | Family | Weights | Notes |
|---|---|---|---|
| **Display** (`--font-display`) | **Bricolage Grotesque** | 600 · 700 · 800 | Hero + section headings, scroll reveals. Tight tracking (`-0.02em`). |
| **Sans / UI / body** (`--font-sans`) | **Plus Jakarta Sans** | 400 · 500 · 600 · 700 | All body copy, labels, buttons, inputs. Humanist, legible. |
| **Mono / tabular** (`--font-mono`) | **JetBrains Mono** | 500 · 600 | Prices, seats, ETA, timers, ride codes, OTP — `font-variant-numeric: tabular-nums`. |

**Type scale** (px): `12 · 14 · 16 · 18 · 20 · 24 · 32 · 40 · 56 · 72 · 96`.
- Body base **16px** min on mobile (avoids iOS auto-zoom); line-height **1.6** body, **1.15–1.25** display.
- Display uses fluid `clamp()`: e.g. hero `clamp(2.75rem, 7vw, 6rem)`.
- Line length 60–75ch desktop, 35–60ch mobile.
- Weight hierarchy: display 700–800, headings 600–700, body 400, labels/eyebrows 500–600.
- Micro-labels ("eyebrows"): 12px, 600, `letter-spacing: 0.18em`, uppercase, `muted-foreground`.
- Never below 12px for any body text.

---

## 4. Layout, Spacing & Radius

- **8pt rhythm.** Spacing scale (px): `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.
- **Section vertical rhythm tiers:** 16 / 24 / 32 / 48 / 80 (marketing sections use 80–128).
- **Container:** `max-w-6xl` (1152px) default content, `max-w-7xl` (1280px) for galleries/hero.
  Side gutter 16px mobile → 24px tablet → 32px+ desktop. **No horizontal page scroll.**
- **Breakpoints:** 375 (sm phone) · 640 (`sm`) · 768 (`md`) · 1024 (`lg`) · 1280 (`xl`) · 1440.
  Hover-expand galleries are horizontal at `md+`, vertical below `md`.
- **Radius** (`--radius-*`): sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · full 9999.
  Inputs `2xl` (matches Skiper106), cards `2xl`, gallery panels `3xl`, pills `full`.
- **Touch targets ≥44px**; ≥8px gap between adjacent targets; mobile inputs ≥44px tall.
- **z-index scale:** base 0 · sticky 10 · header 40 · dropdown 60 · overlay/scrim 90 ·
  modal 100 · intro-film 110 · toast 120 · SOS 130 (SOS always reachable, always on top).

---

## 5. Elevation & Effects

Navy-tinted shadow scale (warm, low-spread, never harsh black):

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 3px rgba(27,43,75,0.06)` |
| `--shadow-md` | `0 4px 12px rgba(27,43,75,0.08)` |
| `--shadow-lg` | `0 12px 32px rgba(27,43,75,0.12)` |
| `--shadow-xl` | `0 24px 56px rgba(27,43,75,0.18)` |

- One consistent elevation scale for cards / sheets / modals — no random shadow values.
- Hairline borders (`--color-border`) do most of the separation work; shadow only on lift/hover/overlay.
- Glass (blur) is used **only** to signal a dismissible background (modal/sheet scrim), never as decoration.
- Modal scrim: 45–55% of `background` (navy in dark, ink in light) + `backdrop-blur`.
- Dark mode: separation comes from lighter tonal surfaces (`muted`/`card`) + visible borders, not shadow.

---

## 6. Motion System

**Tokens:** micro-interaction **150–250ms**, state change **200–300ms**, complex/scene **≤400ms**;
enter `ease-out` (`cubic-bezier(0.22,1,0.36,1)`), exit `ease-in` (~65% of enter duration), springs
for physical motion (caret, gallery, video pop). Animate **transform/opacity only**. Stagger lists
30–50ms/item. One–two animated elements per view.

**The six components' motion roles** (the backbone — used site-wide, not one-off):

| Component | Motion role | Where |
|---|---|---|
| **SmoothInput** | Spring-tracked animated caret; native caret hidden → keep visible focus ring | Every text field site-wide |
| **HoverExpandGallery** | Panel expands under pointer (desktop, horizontal) / press-accordion (mobile, vertical) | Vehicle types, "how it works", route showcase |
| **ScrollReveal** | Scroll-linked character/word/image transforms assemble toward center | Landing + marketing section headings |
| **VideoReveal** | Clip-path zoom "opens" a video from its trigger (the logo) | Logo → intro film; any showreel |
| **TrafficHero** (Skiper39) | Traffic/crowd metaphor — "everyone stuck waiting" → LiftLoop is the way out | Landing hero |
| **(Lenis)** | Single smooth-scroll instance underpinning ScrollReveal | Root / landing |

**Reduced motion (mandatory):** under `prefers-reduced-motion: reduce` — disable Lenis smoothing,
collapse ScrollReveal transforms to a static final state, freeze the caret spring (snap), show the
intro **poster** instead of autoplaying film, and cut hover-expand to instant/opacity. Data must be
readable immediately; nothing depends on motion.

---

## 7. Component Conventions

**Buttons** — one primary CTA per view; secondary is subordinate.
- Primary: `bg-primary text-primary-foreground`, radius `full` or `xl`, ≥44px tall, press scale 0.97,
  hover lift + `shadow-md`. Loading = spinner + disabled (never a dead-looking clickable).
- Secondary: `bg-transparent border border-border text-foreground`, gold underline on hover.
- Accent CTA: `bg-accent text-navy` for delight moments (e.g. "Find a ride").
- Destructive: `--color-danger`, visually separated from primary; confirm before acting.

**Inputs** — always **SmoothInput** (production variant). Filled `muted2`, radius `2xl`, visible
gold focus ring, floating/visible label (never placeholder-only), helper text below, error below
field with `role="alert"`, validate on blur. Semantic `type` for correct mobile keyboard.

**Cards / panels** — `bg-card`, `1px border-border`, radius `2xl`, `shadow-sm`→`shadow-md` on hover.
Replace the repeated inline `padding/borderRadius/rgba` feature-card pattern with **one** `<Panel>`
primitive. No two identical stacked cards where an editorial layout (bento, split, gallery) fits.

**Badges / chips** — status = `*-soft` bg + `*` text + an icon (color-not-alone). Pill radius.

**Eyebrow label** — the recurring uppercase micro-heading above section titles.

**Data (prices/seats/ETA)** — `--font-mono`, tabular figures, so numbers don't shift layout.

---

## 8. Iconography

- **SVG only** — `lucide-react` (present) as the single family; Phosphor (`react-icons`) allowed only
  where already used, matched in weight. **No emoji as icons, anywhere.**
- Sizes as tokens: `icon-sm 16` · `icon-md 20` · `icon-lg 24`. One stroke width (1.75px) per layer.
- Icon-only buttons require `aria-label`; icons paired with text align to baseline.
- Brand logo: use the existing inline SVG `Logo` (navy + gold) at correct proportions; don't recolor ad hoc.

---

## 9. Anti-Patterns — the "de-slop" list (do NOT do)

- ❌ Inline `style={{}}` objects with raw hex / rgba pulled from `theme.ts`. → Use tokens + classes.
- ❌ Endless stacks of identical rounded feature cards with an emoji + heading + paragraph.
- ❌ Emoji used as icons or bullets.
- ❌ Raw hex in components; per-page color/spacing improvisation.
- ❌ Placeholder-as-label; errors only summarized at the top; instant (0ms) state changes.
- ❌ Animating width/height/top/left; decorative motion; motion with no reduced-motion fallback.
- ❌ Removing focus rings; icon-only controls without labels; gray-on-gray text.
- ❌ Three competing brand directions. One MASTER.

---

## 10. Accessibility & Delivery Checklist

- [ ] AA contrast verified in **light and dark** (§2.5).
- [ ] Visible focus ring on every interactive element (SmoothInput caret hidden → ring + animated caret remain).
- [ ] All touch targets ≥44px, ≥8px apart; mobile input height ≥44px.
- [ ] Keyboard nav in visual order; icon buttons have `aria-label`; headings sequential h1→h6.
- [ ] `prefers-reduced-motion` honored by every Skiper animation (§6).
- [ ] Images have alt text; `width/height` or `aspect-ratio` set (no CLS); below-fold + media lazy-loaded.
- [ ] Color never the sole signal (status pairs icon/text).
- [ ] No horizontal scroll at 375px; layout holds in landscape.
- [ ] `npm run build` clean; all 20 routes resolve.
