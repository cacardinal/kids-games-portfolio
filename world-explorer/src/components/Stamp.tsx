// Region-styled passport stamp (GDD §4.3). Circular double-ring frame, region
// name arced along the top, a compass-point flourish along the bottom (no real
// dates), a region-keyed center motif, and an optional 12px gold overprint for
// route / compare / landmark missions.
import type { Region, MissionType } from "../data/types";
import { REGION_STAMP_ARC } from "../data/types";

const REGION_INK: Record<Region, string> = {
  americas: "#b5642f",
  "europe-africa": "#2f7d72",
  "asia-oceania": "#3b4e8f",
};

// Center motif per region (single-color line/fill, drawn around 0,0 in a 60-unit box).
function RegionMotif({ region }: { region: Region }) {
  if (region === "americas") {
    // stepped Maya pyramid + sun
    return (
      <g>
        <circle cx="50" cy="34" r="5" fill="none" strokeWidth="2" />
        <path d="M34 64 h32 l-5 -7 h-22 z" />
        <path d="M40 57 h20 l-4 -7 h-12 z" />
        <path d="M45 50 h10 l-3 -6 h-4 z" />
      </g>
    );
  }
  if (region === "europe-africa") {
    // compass rose over acacia + obelisk pair
    return (
      <g>
        <path d="M50 30 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" />
        <rect x="36" y="52" width="3" height="12" />
        <rect x="61" y="52" width="3" height="12" />
        <path d="M50 50 q-7 2 -10 8 M50 50 q7 2 10 8 M50 48 v16" fill="none" strokeWidth="2" />
      </g>
    );
  }
  // asia-oceania: wave crest + peak behind
  return (
    <g>
      <path d="M38 42 l8 -10 l8 10 z" opacity="0.85" />
      <path d="M30 60 q6 -10 14 -6 q4 2 4 6 q4 -8 12 -6 q6 2 6 8" fill="none" strokeWidth="3" />
      <path d="M58 56 q3 -2 6 0" fill="none" strokeWidth="2.5" />
    </g>
  );
}

// Sub-stamp overprint glyphs (12px, gold), per mission type.
function Overprint({ type }: { type: MissionType }) {
  const GOLD = "#d4a843";
  if (type === "route") {
    return (
      <g transform="translate(50 76)" fill="none" stroke={GOLD} strokeWidth="2.4" strokeDasharray="2 3" strokeLinecap="round">
        <path d="M-9 0 h18" />
      </g>
    );
  }
  if (type === "compare") {
    return (
      <g transform="translate(50 74)" stroke={GOLD} strokeWidth="1.8" fill="none">
        <path d="M0 -4 v8 M-7 0 h14 M-7 0 l-2 4 h4 z M7 0 l-2 4 h4 z" fill={GOLD} />
      </g>
    );
  }
  if (type === "landmark") {
    return (
      <g transform="translate(50 74)" fill={GOLD}>
        <path d="M-6 4 l6 -10 l6 10 z" />
      </g>
    );
  }
  // locate: no overprint
  return null;
}

export function RegionStamp({
  region,
  type,
  size = 84,
}: {
  region: Region;
  type: MissionType;
  size?: number;
}) {
  const ink = REGION_INK[region];
  const arc = REGION_STAMP_ARC[region];
  const arcId = `arc-${region}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${arc} passport stamp`}
      style={{ color: ink }}
    >
      <defs>
        <path id={arcId} d="M20 50 A30 30 0 0 1 80 50" fill="none" />
        <path id={`${arcId}-b`} d="M22 54 A28 28 0 0 0 78 54" fill="none" />
      </defs>
      <g fill={ink} stroke={ink}>
        {/* scalloped outer edge — perforated rubber-stamp feel */}
        <circle cx="50" cy="50" r="46" fill="none" strokeWidth="1" strokeDasharray="1.5 2.5" opacity="0.7" />
        {/* double ring */}
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="2" />
        <circle cx="50" cy="50" r="38" fill="none" strokeWidth="1" />
        {/* arced region name (top, inside ring) */}
        <text fontFamily="Fraunces, serif" fontWeight="600" fontSize="8.5" letterSpacing="0.5" fill={ink} stroke="none">
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
            {arc}
          </textPath>
        </text>
        {/* compass-point flourish (bottom, no real date) */}
        <text fontFamily="Fraunces, serif" fontWeight="500" fontSize="6.5" letterSpacing="2" fill={ink} stroke="none" opacity="0.9">
          <textPath href={`#${arcId}-b`} startOffset="50%" textAnchor="middle">
            · N · E · S · W ·
          </textPath>
        </text>
        <RegionMotif region={region} />
      </g>
      <Overprint type={type} />
    </svg>
  );
}
