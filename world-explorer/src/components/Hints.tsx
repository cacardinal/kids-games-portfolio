/* eslint-disable react-refresh/only-export-components */
// Signature picture-hints for the 6 LOCATE missions (Director amendment:
// picture-hint SVGs ship on all 6 locate missions and ONLY those).
// Each is a small stylized single-color icon tied to that prompt's clue, so a
// pre-reader (early reader) can play on the picture alone. Keyed by mission id.
import type { ReactElement } from "react";

const hint = (label: string, children: ReactElement) => (
  <svg viewBox="0 0 48 48" role="img" aria-label={label} fill="currentColor">
    {children}
  </svg>
);

const HINTS: Record<string, () => ReactElement> = {
  // am-1 "Find where chocolate began" → cacao pod
  "am-1": () =>
    hint("cacao pod", (
      <g>
        <path d="M24 6 q12 6 12 20 q0 14 -12 16 q-12 -2 -12 -16 q0 -14 12 -20z" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M24 8 v32 M18 12 q-2 14 0 26 M30 12 q2 14 0 26" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.7" />
        <path d="M24 6 q2 -3 5 -3" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </g>
    )),
  // am-2 "Largest country in South America" → rainforest canopy (Amazon clue)
  "am-2": () =>
    hint("rainforest leaves", (
      <g>
        <path d="M24 8 q10 8 0 30 q-10 -22 0 -30z" />
        <path d="M14 18 q8 6 2 24 q-9 -14 -2 -24z" opacity="0.7" />
        <path d="M34 18 q-8 6 -2 24 q9 -14 2 -24z" opacity="0.7" />
        <rect x="22" y="36" width="4" height="6" />
      </g>
    )),
  // ef-1 "Where coffee was first discovered" → coffee bean
  "ef-1": () =>
    hint("coffee bean", (
      <g>
        <ellipse cx="24" cy="24" rx="13" ry="17" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <path d="M19 11 q10 13 0 26" fill="none" stroke="currentColor" strokeWidth="2.4" />
      </g>
    )),
  // ef-2 "Country with the most people in Africa" → cluster of people
  "ef-2": () =>
    hint("group of people", (
      <g>
        <circle cx="16" cy="16" r="5" />
        <path d="M8 38 q0 -12 8 -12 t8 12z" />
        <circle cx="32" cy="16" r="5" />
        <path d="M24 38 q0 -12 8 -12 t8 12z" />
        <circle cx="24" cy="13" r="6" />
        <path d="M14 40 q0 -14 10 -14 t10 14z" />
      </g>
    )),
  // ao-1 "Largest country in the world" → expansive globe
  "ao-1": () =>
    hint("globe", (
      <g>
        <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <path d="M7 24 h34 M24 7 v34 M12 14 q12 8 24 0 M12 34 q12 -8 24 0" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
      </g>
    )),
  // ao-2 "Where kangaroos live in the wild" → kangaroo
  "ao-2": () =>
    hint("kangaroo", (
      <g>
        <path d="M30 8 q4 0 4 5 q0 3 -3 4 l1 6 q5 4 5 12 l4 6 h-6 l-4 -5 q-4 3 -10 2 l3 7 h-6 l-3 -8 q-5 -5 -3 -13 q1 -6 7 -8 q3 -6 8 -7 z" />
      </g>
    )),
};

export function hasLocateHint(missionId: string): boolean {
  return missionId in HINTS;
}

export function LocateHint({ missionId }: { missionId: string }) {
  const H = HINTS[missionId];
  if (!H) return null;
  return H();
}
