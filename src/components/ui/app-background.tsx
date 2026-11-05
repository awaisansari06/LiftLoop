"use client";

/**
 * AppBackground — the single, app-wide animated backdrop, mounted ONCE at the App
 * root (outside every route + outside Lenis) so the cursor-reactive Wave Grid
 * lives behind the WHOLE UI. Uses the three.js WaveGridBackground (the "vengeance"
 * 3D cube wave). A very light veil keeps text readable; dense pages add their own
 * frost via PageShell. (The grid only became visible once `body` was made
 * transparent — an opaque body background was painting over this negative-z layer.)
 */

import { WaveGridBackground } from "@/components/ui/wave-grid-background";

export function AppBackground() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 h-screen w-screen"
        style={{ background: "#EFE7D7" }}
      >
        <WaveGridBackground
          className="h-full w-full"
          colorBase="#E7DECB"
          colorHigh="#C8956C"
          sceneBg="#E7DECB"
          waveAmplitude={0.2}
          waveSpeed={2.5}
          waveFrequency={0.7}
          waveWidth={4.0}
          waveMaxHeight={0.25}
        />
      </div>
      {/* very light veil — the grid is meant to be visible; dense pages add their
          own frost via PageShell for text readability */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen bg-white/30"
      />
    </>
  );
}

export default AppBackground;
