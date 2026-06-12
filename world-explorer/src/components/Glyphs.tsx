// Small shared glyphs: mission-type icons for boarding-pass stubs, a compass
// rose used on the picker + passport, and a simple star.
import type { ReactElement } from "react";

export function CompassRose({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="compass" fill="currentColor" role="presentation">
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M50 8 L57 50 L50 92 L43 50 Z" />
      <path d="M8 50 L50 43 L92 50 L50 57 Z" opacity="0.7" />
      <circle cx="50" cy="50" r="4" />
    </svg>
  );
}

export function LocatePin(): ReactElement {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" role="presentation">
      <path d="M24 4 q12 0 12 14 q0 12 -12 26 q-12 -14 -12 -26 q0 -14 12 -14z" />
      <circle cx="24" cy="18" r="5" fill="#fff" />
    </svg>
  );
}

export function RouteGlyph(): ReactElement {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" role="presentation">
      <path d="M8 36 q10 -14 20 -8 t12 -16" strokeDasharray="2 5" strokeLinecap="round" />
      <circle cx="8" cy="36" r="3" fill="currentColor" stroke="none" />
      <circle cx="40" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CompareGlyph(): ReactElement {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" role="presentation">
      <path d="M24 8 v30 M12 38 h24" strokeLinecap="round" />
      <path d="M24 12 h-12 M24 12 h12" />
      <path d="M12 12 l-5 10 h10 z" fill="currentColor" stroke="none" />
      <path d="M36 12 l-5 10 h10 z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A simple country mini-shape stand-in for compare cards (abstract land form). */
export function LandFormIcon({ seed }: { seed: number }) {
  // Two deterministic blobby outlines so the two compare cards differ visually
  // without implying a real (potentially misleading) outline.
  const a = seed % 2 === 0;
  return (
    <svg viewBox="0 0 100 80" fill="currentColor" role="presentation" className="ccard__shape">
      {a ? (
        <path d="M12 40 q4 -22 26 -24 q18 -2 30 8 q16 8 18 26 q2 16 -16 20 q-22 6 -40 -4 q-18 -10 -18 -22z" />
      ) : (
        <path d="M18 28 q14 -16 34 -10 q22 6 30 22 q6 14 -8 24 q-18 12 -38 6 q-22 -8 -22 -24 q0 -10 4 -18z" />
      )}
    </svg>
  );
}

export function Star({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" role="presentation">
      <path d="M12 2 l2.9 6.3 l6.9 0.7 l-5.2 4.6 l1.5 6.8 l-6.1 -3.6 l-6.1 3.6 l1.5 -6.8 l-5.2 -4.6 l6.9 -0.7 z" />
    </svg>
  );
}
