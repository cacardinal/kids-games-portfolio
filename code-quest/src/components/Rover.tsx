import type { Heading } from "../game/interpreter";
import type { CosmeticId } from "../data/cosmetics";
import { COSMETICS } from "../data/cosmetics";

export type RoverPose = "idle" | "moving" | "collision" | "win";

interface RoverProps {
  heading: Heading;
  pose: RoverPose;
  cosmetic: CosmeticId;
  size: number;
}

const HEADING_DEG: Record<Heading, number> = { N: 0, E: 90, S: 180, W: 270 };

/**
 * The rover — a clean vector survey drone with a thruster glow. This is the app's
 * signature charm: idle hover bob, collision slump + dust, victory spin (driven by
 * the `pose` prop and CSS in Grid.css). Paint jobs are pure CSS variables.
 */
export function Rover({ heading, pose, cosmetic, size }: RoverProps) {
  const skin = COSMETICS[cosmetic];
  const style = {
    "--rover-body": skin.body,
    "--rover-accent": skin.accent,
    "--rover-glow": skin.glow,
    "--rover-decal": skin.decal ?? skin.accent,
    width: size,
    height: size,
  } as React.CSSProperties;

  return (
    <div className={`rover-charm pose-${pose}`} style={style} aria-hidden="true">
      {/* thruster glow bloom (under the body) */}
      <div className="rover-thruster" />
      <svg
        className="rover-svg"
        viewBox="0 0 100 100"
        style={{ transform: `rotate(${HEADING_DEG[heading]}deg)` }}
      >
        <defs>
          <radialGradient id={`rg-${cosmetic}`} cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="var(--rover-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--rover-body)" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* thruster exhaust triangle (points "back", i.e. south in body frame) */}
        <polygon className="rover-exhaust" points="42,78 58,78 50,96" fill="var(--rover-glow)" />

        {/* hull: a rounded survey drone, nose pointing up (N) */}
        <path
          d="M50 8
             C62 8 72 18 74 34
             L78 64
             C79 74 70 82 50 82
             C30 82 21 74 22 64
             L26 34
             C28 18 38 8 50 8 Z"
          fill={`url(#rg-${cosmetic})`}
          stroke="var(--rover-accent)"
          strokeWidth="2.5"
        />

        {/* sensor eye / cockpit */}
        <circle cx="50" cy="36" r="11" fill="var(--bg)" stroke="var(--rover-accent)" strokeWidth="2.5" />
        <circle cx="50" cy="36" r="4.5" fill="var(--rover-accent)" className="rover-eye" />

        {/* heading chevron (nose marker) */}
        <polygon points="50,12 44,22 56,22" fill="var(--rover-accent)" />

        {/* side fins */}
        <path d="M22 50 L12 58 L24 62 Z" fill="var(--rover-body)" stroke="var(--rover-accent)" strokeWidth="1.5" />
        <path d="M78 50 L88 58 L76 62 Z" fill="var(--rover-body)" stroke="var(--rover-accent)" strokeWidth="1.5" />

        {/* decal (optional, per cosmetic) */}
        {skin.decalGlyph && (
          <text
            x="50"
            y="64"
            textAnchor="middle"
            fontSize="13"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fill="var(--rover-decal)"
            opacity="0.9"
          >
            {skin.decalGlyph}
          </text>
        )}
      </svg>
    </div>
  );
}
