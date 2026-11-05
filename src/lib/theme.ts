/**
 * LiftLoop V4 Design System — "Campus Prestige"
 * Deep Navy + Warm Gold — a sophisticated, university-grade palette.
 * Single source of truth for all design tokens.
 */

export const T = {
  // ── Primary Navy ──
  navy: '#1B2B4B',
  navyLight: '#2C4A7C',
  navyMid: '#3B5998',
  navy50: '#EEF2F7',

  // ── Warm Gold Accent ──
  gold: '#C8956C',
  goldLight: '#F5E6D3',
  goldDark: '#A67A50',
  gold50: '#FDF6EF',

  // ── Functional Accents ──
  blue: '#4A6FA5',       // links, info
  blueLight: '#E1ECF7',
  green: '#5B9A6F',      // success, verified
  greenLight: '#E3F2E8',
  red: '#D35D5D',        // danger, SOS
  redLight: '#FAE5E5',
  orange: '#D4973B',     // warnings, pending
  orangeLight: '#FDF0DC',

  // ── Neutrals ──
  dark: '#2B2D42',
  gray: '#6C6E7E',
  grayLight: '#9CA0AD',
  gray100: '#F4F4F6',
  gray200: '#E4E5E9',
  gray300: '#D1D3D9',
  white: '#FFFFFF',
  bg: '#F8F6F1',         // warm ivory background

  // ── Semantic aliases ──
  text: '#2B2D42',
  textSec: '#6C6E7E',
  muted: '#9CA0AD',
  surface: '#FFFFFF',
  border: '#E4E5E9',
  inputBg: '#F4F4F6',

  // ── Gradients ──
  heroGrad: 'linear-gradient(135deg, #1B2B4B 0%, #2C4A7C 60%, #3B5998 100%)',
  goldGrad: 'linear-gradient(135deg, #C8956C 0%, #D4A76A 100%)',
  warmGrad: 'linear-gradient(135deg, #F8F6F1 0%, #F5E6D3 100%)',
  cardHoverGrad: 'linear-gradient(135deg, #FDF6EF 0%, #F5E6D3 100%)',
  btnGrad: 'linear-gradient(135deg, #1B2B4B 0%, #2C4A7C 100%)',
  btnGoldGrad: 'linear-gradient(135deg, #C8956C 0%, #A67A50 100%)',

  // ── Shadows ──
  shadow1: '0 1px 3px rgba(27,43,75,0.06)',
  shadow2: '0 4px 12px rgba(27,43,75,0.08)',
  shadow3: '0 12px 32px rgba(27,43,75,0.12)',
  shadow4: '0 24px 56px rgba(27,43,75,0.18)',

  // ── Radius ──
  rSm: '8px',
  rMd: '12px',
  rLg: '16px',
  rXl: '24px',
  rFull: '9999px',

  // ── Functional tints ──
  blue50: '#EEF2F7',

  // ── LEGACY COMPAT (blue → navy mapping) ──
  blueDark: '#1B2B4B',
  blueDeep: '#1B2B4B',
  beige: '#F5E6D3',
  beigeLight: '#FDF6EF',
  beigeDark: '#C8956C',
  beige50: '#FDF6EF',
} as const;

/**
 * Font families — LiftLoop editorial system (see design-system/MASTER.md §3).
 * Display: Bricolage Grotesque · Body/UI: Plus Jakarta Sans · Data: JetBrains Mono.
 * (Legacy inline-styled pages inherit the new typography through these tokens.)
 */
export const FONT = {
  heading: "'Bricolage Grotesque', 'Poppins', sans-serif",
  body: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export default T;
