import T, { FONT } from '../../lib/theme';

/** Inline SVG logo — Deep Navy + Gold */
export default function Logo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  const bg = light ? 'rgba(255,255,255,0.95)' : T.navy;
  const accent = T.navy;
  const gold = T.gold;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="LiftLoop">
      <rect x="1" y="1" width="46" height="46" rx="13" fill={light ? T.gold : T.navy}/>
      <path d="M28 12H21C14 12 11 17 11 24s3 12 10 12h7c7 0 10-5 10-12" stroke={light ? T.navy : T.gold} strokeWidth="4" strokeLinecap="round"/>
      <path d="M24 25L37 12M27 12h10v10" stroke={light ? T.navy : T.gold} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function LogoText({ light = false }: { light?: boolean }) {
  return (
    <span style={{
      fontFamily: FONT.heading,
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: light ? 'white' : T.navy,
      whiteSpace: 'nowrap'
    }}>
      Lift<span style={{ color: T.gold }}>Loop</span>
    </span>
  );
}
