<!-- ⚠️ SUPERSEDED (2026-09-27): This "LiftLoop V3" design token file (blue #3B82F6 palette) is
     retired. The single source of truth is design-system/MASTER.md, per docs/prd/WEBSITE_PRD.md.
     Where this file conflicts with MASTER.md, MASTER.md wins. Retained for history only. -->
---
name: LiftLoop V3
colors:
  primary: '#3B82F6'
  on-primary: '#FFFFFF'
  primary-container: '#2563EB'
  on-primary-container: '#DBEAFE'
  inverse-primary: '#1D4ED8'
  secondary: '#D4A574'
  on-secondary: '#1F2937'
  secondary-container: '#F5E6D3'
  on-secondary-container: '#92400E'
  tertiary: '#10B981'
  on-tertiary: '#FFFFFF'
  tertiary-container: '#D1FAE5'
  on-tertiary-container: '#065F46'
  error: '#EF4444'
  on-error: '#FFFFFF'
  error-container: '#FEE2E2'
  on-error-container: '#991B1B'
  surface: '#FFFFFF'
  surface-dim: '#F9FAFB'
  surface-bright: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F9FAFB'
  surface-container: '#F3F4F6'
  surface-container-high: '#E5E7EB'
  surface-container-highest: '#D1D5DB'
  on-surface: '#1F2937'
  on-surface-variant: '#6B7280'
  inverse-surface: '#1F2937'
  inverse-on-surface: '#F9FAFB'
  outline: '#9CA3AF'
  outline-variant: '#E5E7EB'
  surface-tint: '#3B82F6'
  background: '#FEFCF9'
  on-background: '#1F2937'
  surface-variant: '#F3F4F6'
  primary-fixed: '#DBEAFE'
  primary-fixed-dim: '#93C5FD'
  on-primary-fixed: '#1E3A5F'
  on-primary-fixed-variant: '#2563EB'
  secondary-fixed: '#F5E6D3'
  secondary-fixed-dim: '#D4A574'
  on-secondary-fixed: '#78350F'
  on-secondary-fixed-variant: '#92400E'
  tertiary-fixed: '#D1FAE5'
  tertiary-fixed-dim: '#6EE7B7'
  on-tertiary-fixed: '#064E3B'
  on-tertiary-fixed-variant: '#059669'
typography:
  headline-xl:
    fontFamily: Poppins
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 62px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Poppins
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Poppins
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-sm:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  headline-xl-mobile:
    fontFamily: Poppins
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style — "The Campus Concierge"

LiftLoop V3 is a university-exclusive carpooling platform designed to feel like a **premium, trustworthy mobility service** — not a generic ride-hailing clone. The visual language is **"Warm Professionalism"**: clean enough for a fintech dashboard, friendly enough for a campus community.

### Creative North Star
Think **Uber's precision** meets **Airbnb's warmth** meets **Stripe's clarity**. Every pixel must feel intentional. The interface should make students say, "This feels like a real startup product."

### Emotional Response
- **Trust**: Clear hierarchy, consistent spacing, professional typography
- **Warmth**: Soft beige tones, generous whitespace, rounded corners
- **Energy**: Vibrant blue CTAs, smooth micro-animations, gradient accents
- **Safety**: Prominent SOS affordances, verified badges, real-time tracking indicators

---

## Colors — The Warm-Professional Palette

The palette is built on a **Blue + Beige** foundation — institutional authority softened by approachable warmth.

### Primary Colors
- **Primary Blue (#3B82F6)**: The action color. Used for CTAs, links, active states, focus rings, and map route lines. This is the "do something" color.
- **Primary Beige (#F5E6D3)**: The warmth layer. Used for secondary buttons, card backgrounds, soft highlights, and the overall "campus feel." It prevents the UI from feeling sterile.

### Accent Colors
- **Success Green (#10B981)**: Verified badges, pickup markers, confirmed bookings, earnings indicators. Green = positive outcome.
- **Danger Red (#EF4444)**: SOS button (always prominent), alerts, error states, drop markers, cancellation actions. Red = attention required.
- **Warning Orange (#F59E0B)**: Pending verification, notification counts, in-progress states. Orange = something needs your attention soon.

### Neutral System
- **Dark (#1F2937)**: All headings, navigation text, high-emphasis content. Never use pure black.
- **Gray (#6B7280)**: Body text, secondary labels, metadata, timestamps.
- **Light Gray (#F3F4F6)**: Input backgrounds, dividers, table stripes, subtle borders.
- **White (#FFFFFF)**: Cards, modals, page backgrounds, clean surfaces.

### Gradient Usage
- **Hero Gradient**: `linear-gradient(135deg, #3B82F6 0%, #10B981 100%)` — Only for hero sections and high-impact CTAs.
- **Card Hover**: `linear-gradient(135deg, #F5E6D3 0%, #FEF3C7 100%)` — Subtle warmth on interactive cards.
- **Button Hover**: `linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)` — Deepened blue for pressed/hover states.

### The Background Canvas
The page background is **#FEFCF9** (warm off-white), not pure white. This creates a subtle parchment-like warmth that distinguishes LiftLoop from generic SaaS products. Cards sit on pure **#FFFFFF** to create natural elevation without heavy shadows.

---

## Typography — The Dual-Voice System

### Poppins (Headlines & CTAs)
Geometric, modern, confident. Used for all headings (H1–H4), button labels, and navigation items. Poppins communicates "this is a product you can trust."

### Inter (Body & Data)
Optimized for screens, incredibly legible at small sizes. Used for all body text, form labels, table data, timestamps, and metadata. Inter is the "utility" font.

### Hierarchy Rules
- H1 (56px/800) is reserved for the landing hero only
- H2 (40px/700) for major section headings
- H3 (28px/600) for card titles, modal headers
- H4 (20px/600) for subsection labels, sidebar headers
- Never skip heading levels
- Body text uses 16px baseline with 24px line-height for optimal readability

---

## Layout & Spacing

### The 8px Grid
All spacing is built on a strict 8px base unit. Components snap to multiples of 8: 8, 16, 24, 32, 48, 64.

### Card Padding
- Small cards (stat cards, badges): 16px internal padding
- Medium cards (ride cards, profile cards): 24px internal padding
- Large cards (dashboard panels, modals): 32px internal padding

### Section Spacing
- Between sections: 64px (desktop), 48px (mobile)
- Between cards in a grid: 16px–24px gap
- Between form fields: 16px vertical gap

---

## Elevation & Depth

### Shadow System
Depth is achieved through **soft, diffused shadows** — never harsh drop shadows.
- **Level 0**: No shadow (inline elements, text)
- **Level 1**: `0 1px 3px rgba(0,0,0,0.08)` — Subtle lift (buttons at rest)
- **Level 2**: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` — Cards
- **Level 3**: `0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` — Hover states, dropdowns
- **Level 4**: `0 20px 50px -12px rgba(0,0,0,0.25)` — Modals, overlays

### Hover Lift Effect
Cards lift on hover: translate Y -4px + shadow increases from Level 2 → Level 3. Duration: 200ms ease-out.

---

## Components

### Buttons
- **Primary**: `#3B82F6` fill, white text, 16px rounded, `hover: scale(1.02) + deeper blue gradient`. This is the main CTA.
- **Secondary**: `#F5E6D3` fill, `#1F2937` text, 16px rounded. Used for "Offer Ride," secondary actions.
- **Danger**: `#EF4444` fill, white text. Reserved exclusively for SOS and destructive actions.
- **Ghost**: Transparent bg, `#3B82F6` text, 1px border `#E5E7EB`. For tertiary actions.
- **All buttons**: `font-family: Poppins`, `font-weight: 600`, active state `scale(0.98)`.

### Cards
- **Base**: White bg, 16px border-radius, Level 2 shadow, 1px border `#F3F4F6`.
- **Hover**: Lift -4px, shadow → Level 3, optional warm gradient overlay.
- **Ride Card**: Driver avatar (48px circle) left, route info center, price right. Status badge top-right corner.
- **Stats Card**: Icon (colored bg circle) top-left, large number (Poppins 700), label below (Inter 400 gray).

### Inputs
- **Default**: `#F3F4F6` bg, `#E5E7EB` border, 8px radius, 16px padding.
- **Focus**: Border → `#3B82F6` (2px), subtle blue shadow `0 0 0 3px rgba(59,130,246,0.1)`.
- **Error**: Border → `#EF4444`, error message in red below.
- **With Icon**: 40px left padding, icon at 12px from left edge.

### Navigation
- **Header**: White bg at 80% opacity, `backdrop-filter: blur(12px)`, sticky top, 64px height.
- **Logo**: Left-aligned, "LiftLoop" in Poppins 700.
- **Active Link**: Blue text + blue bottom border (3px).
- **Profile Avatar**: 36px circle, right-aligned, dropdown on click.

### Badges
- **Verified**: Green bg (10% opacity), green text, green dot.
- **Pending**: Orange bg (10% opacity), orange text.
- **Rejected**: Red bg (10% opacity), red text.
- **All**: Pill shape (full radius), 12px font, 500 weight, 6px 12px padding.

---

## Animation Guidelines (Framer Motion)

### Page Transitions
```
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
transition={{ duration: 0.3, ease: 'easeOut' }}
```

### Card Stagger
```
parent: staggerChildren: 0.05
child: { opacity: 0, y: 10 } → { opacity: 1, y: 0 }
```

### Hover Effects
```
whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.12)' }}
whileTap={{ scale: 0.98 }}
transition={{ duration: 0.2 }}
```

### Loading States
- Skeleton shimmer: 1.5s infinite linear gradient animation
- Spinner: 0.8s infinite rotation, brand blue color
- Progress bar: smooth width transition, 0.3s ease

---

## Responsive Breakpoints

- **Mobile** (< 640px): Single column, bottom navigation, full-width cards, 20px margins
- **Tablet** (640–1024px): Two columns, collapsible sidebar, 32px margins
- **Desktop** (> 1024px): Three-four columns, full sidebar, 64px margins

### Mobile-First Rules
- Touch targets: minimum 44×44px
- Font sizes reduce by 2px on mobile
- Cards go full-width and stack vertically
- Maps take top 50%, details take bottom 50%
- Modals become full-screen sheets

---

## Do's and Don'ts

### Do
- **Do** use generous whitespace — if it feels sparse, it's probably right
- **Do** use the beige accent to add warmth to otherwise cold layouts
- **Do** ensure every interactive element has a visible focus state
- **Do** use real content in designs: "Campus Gate → Central Station" not "Location A → Location B"
- **Do** make the SOS button always visible and instantly accessible

### Don't
- **Don't** use pure black (#000000) for text — always use Dark (#1F2937)
- **Don't** use more than 2 gradients on a single screen
- **Don't** use shadows heavier than Level 3 except for modals
- **Don't** make cards smaller than 280px wide on desktop
- **Don't** hide critical safety features behind menus or scrolling
