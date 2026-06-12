// Fix 4: flat-vector SVG suspect "bust" composed FROM the puzzle attributes.
//   - hair: rendered in the name's FIXED hair color (NAME_TRAITS), with simple style
//     variants (short / wavy / bun / curly) so a recurring character looks the same case
//     to case ("Mateo again.").
//   - accessory: drawn ON the bust (scarf / glasses / cap / watch / backpack strap).
//   - pet: a small companion chip beside the bust.
// Noir register: flat, 2–3 tones + the hair color, no cartoon eyes/cuteness. The face is
// a calm silhouette (no expression) — this is a case file mugshot, not a mascot.
//
// DOM-assertable: the root carries data-hair / data-accessory / data-pet.

import { NAME_TRAITS, type HairStyle } from "../data/content";
import { PetIcon } from "./icons";
import type { Accessory, Hair, Pet } from "../game/types";

// Hair color hexes (mirror icons.tsx HAIR_HEX; kept local so the portrait is
// self-contained). Slightly deepened vs the tiny tuft icon so the larger fill reads on
// the manila photo backdrop; blond is a warm gold (not yellow) for the noir register.
const HAIR_HEX: Record<Hair, string> = {
  black: "#26262b",
  brown: "#6b4a2f",
  red: "#a8472a",
  blond: "#c9a14a",
};

const JACKET = "#3a4049"; // muted noir jacket tone (shoulders)
const JACKET_DK = "#2c313a";
const FRAME_BG = "#cfc4ab"; // photo backdrop on the paper card
const OUTLINE = "rgba(20,22,26,0.55)";

// Draw the hair shape for a style + color over the head.
function HairShape({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case "short":
      // close crop hugging the crown
      return (
        <path
          d="M16 23c0-9 6-15 14-15s14 6 14 15c0-4-3-7-5-8 0 0-3 3-9 3s-9-3-9-3c-2 1-5 4-5 8z"
          fill={color}
          stroke={OUTLINE}
          strokeWidth="0.6"
        />
      );
    case "wavy":
      // loose waves falling to the sides of the face
      return (
        <path
          d="M14 30c-1-12 7-22 16-22s17 10 16 22c0-5-2-9-4-11-1 5-3 8-3 8s0-4-2-6c-1 6-4 9-7 9s-6-3-7-9c-2 2-2 6-2 6s-2-3-3-8c-2 2-4 6-4 11z"
          fill={color}
          stroke={OUTLINE}
          strokeWidth="0.6"
        />
      );
    case "bun":
      // crown + a top bun
      return (
        <>
          <circle cx="30" cy="6" r="5" fill={color} stroke={OUTLINE} strokeWidth="0.6" />
          <path
            d="M16 24c0-10 6-16 14-16s14 6 14 16c0-4-3-7-5-8 0 0-3 2-9 2s-9-2-9-2c-2 1-5 4-5 8z"
            fill={color}
            stroke={OUTLINE}
            strokeWidth="0.6"
          />
        </>
      );
    case "curly":
      // rounded curl cluster around the crown
      return (
        <path
          d="M15 26c-2-6 0-11 4-13-1-3 2-6 5-6 2-3 9-3 11 0 3 0 6 3 5 6 4 2 6 7 4 13-1-3-3-5-3-5-1 2-3 3-3 3 1-2 0-5 0-5-2 2-5 3-5 3s-3-1-5-3c0 0-1 3 0 5 0 0-2-1-3-3 0 0-2 2-3 5-1-2-2-3-3-3 1 2 0 4 0 4s-2-2-3-5c0 0 1 2 0 4-1-2-3-2-3-2z"
          fill={color}
          stroke={OUTLINE}
          strokeWidth="0.6"
        />
      );
  }
}

// Draw the accessory ON the bust.
function AccessoryOnBust({ accessory }: { accessory: Accessory }) {
  switch (accessory) {
    case "scarf":
      return (
        <g>
          <path d="M22 44c3 3 13 3 16 0l2 5c-6 4-14 4-20 0z" fill="#9a4332" stroke={OUTLINE} strokeWidth="0.6" />
          <path d="M37 47l5 1-2 9-4-2z" fill="#b3402e" stroke={OUTLINE} strokeWidth="0.6" />
        </g>
      );
    case "glasses":
      return (
        <g fill="none" stroke="#1f2228" strokeWidth="1.6">
          <circle cx="24" cy="28" r="4.4" />
          <circle cx="36" cy="28" r="4.4" />
          <path d="M28.4 28h3.2" />
          <path d="M19.6 27l-2.2-1M40.4 27l2.2-1" strokeWidth="1.3" />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M15 22c1-8 7-13 15-13s14 5 15 13c-5-3-10-4-15-4s-10 1-15 4z" fill="#33506b" stroke={OUTLINE} strokeWidth="0.6" />
          <path d="M14 22c-3 0-6 1-8 3 3 1 6 1 9 0z" fill="#28415a" stroke={OUTLINE} strokeWidth="0.6" />
        </g>
      );
    case "watch":
      return (
        <g>
          {/* a watch on the wrist, hinted at the lower shoulder line */}
          <rect x="40" y="52" width="7" height="5" rx="1.2" fill="#d9a441" stroke={OUTLINE} strokeWidth="0.6" />
          <rect x="41.5" y="50.5" width="4" height="2" fill={JACKET_DK} />
          <rect x="41.5" y="56.5" width="4" height="2" fill={JACKET_DK} />
        </g>
      );
    case "backpack":
      return (
        <g>
          {/* shoulder straps across the chest */}
          <path d="M24 40l-3 18" stroke="#7a5a3a" strokeWidth="3" strokeLinecap="round" />
          <path d="M36 40l3 18" stroke="#7a5a3a" strokeWidth="3" strokeLinecap="round" />
          <rect x="22.5" y="49" width="3.5" height="2.4" rx="0.6" fill="#d9a441" />
          <rect x="34" y="49" width="3.5" height="2.4" rx="0.6" fill="#d9a441" />
        </g>
      );
  }
}

export function SuspectPortrait({
  name,
  hair,
  accessory,
  pet,
  size = 88,
  cleared = false,
}: {
  name: string;
  hair: Hair;
  accessory: Accessory;
  pet: Pet;
  size?: number;
  cleared?: boolean;
}) {
  const traits = NAME_TRAITS[name];
  const skin = traits?.skin ?? "#c08a52";
  const hairStyle: HairStyle = traits?.hairStyle ?? "short";
  const hairColor = HAIR_HEX[hair];

  return (
    <span
      className={`portrait${cleared ? " portrait--cleared" : ""}`}
      data-hair={hair}
      data-accessory={accessory}
      data-pet={pet}
      data-hairstyle={hairStyle}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 60 68" width={size} height={size} role="img" aria-label={`${name} portrait`}>
        {/* photo backdrop */}
        <rect x="0" y="0" width="60" height="68" rx="4" fill={FRAME_BG} />
        {/* shoulders */}
        <path d="M8 68c0-12 9-20 22-20s22 8 22 20z" fill={JACKET} stroke={OUTLINE} strokeWidth="0.6" />
        <path d="M30 48c-7 0-13 3-17 8h34c-4-5-10-8-17-8z" fill={JACKET_DK} opacity="0.6" />
        {/* neck */}
        <rect x="26" y="40" width="8" height="10" rx="3" fill={skin} stroke={OUTLINE} strokeWidth="0.5" />
        {/* head */}
        <ellipse cx="30" cy="28" rx="12" ry="13.5" fill={skin} stroke={OUTLINE} strokeWidth="0.6" />
        {/* hair (behind cap if a cap is worn, but drawn first either way for layering) */}
        <HairShape style={hairStyle} color={hairColor} />
        {/* accessory on the bust */}
        <AccessoryOnBust accessory={accessory} />
      </svg>

      {/* pet companion chip beside the bust */}
      {pet !== "none" && (
        <span className="portrait__pet" title={pet}>
          <PetIcon pet={pet} size={Math.round(size * 0.26)} />
        </span>
      )}
    </span>
  );
}
