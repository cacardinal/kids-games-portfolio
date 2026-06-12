// The waving crest banner — the kingdom's avatar. Waves continuously; perks on a
// surplus/growth turn, droops on a deficit turn (avatar charm via animation only).
import { COSMETICS, type CosmeticId } from "../game/content";

type Mood = "rest" | "perk" | "droop";

function Charge({ motif, color }: { motif: string; color: string }) {
  // Heraldic charges, simple 1-color glyphs centered on the field.
  switch (motif) {
    case "wheat":
      return (
        <g fill={color}>
          <rect x="58" y="30" width="4" height="34" rx="2" />
          <path d="M60 30c-5-3-10-1-12 4 5 2 10 0 12-4zM60 30c5-3 10-1 12 4-5 2-10 0-12-4zM60 40c-5-3-10-1-12 4 5 2 10 0 12-4zM60 40c5-3 10-1 12 4-5 2-10 0-12-4z" />
        </g>
      );
    case "hammer":
      return (
        <g stroke={color} strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M44 40l20 20" />
          <path d="M76 40L56 60" />
          <rect x="58" y="26" width="14" height="9" rx="2" fill={color} stroke="none" transform="rotate(45 65 30)" />
        </g>
      );
    case "book":
      return (
        <g fill={color}>
          <path d="M60 34c-7-3-15-3-22 0v28c7-3 15-3 22 0z" opacity="0.85" />
          <path d="M60 34c7-3 15-3 22 0v28c-7-3-15-3-22 0z" />
        </g>
      );
    case "crown":
      return (
        <g fill={color}>
          <path d="M40 58l-3-22 12 12 11-16 11 16 12-12-3 22z" />
          <rect x="38" y="58" width="44" height="7" rx="2" />
        </g>
      );
    case "houses":
      return (
        <g fill={color}>
          <path d="M60 30l-10 9h4v10h12V39h4z" />
          <path d="M40 46l-7 6h3v7h8v-7h3z" opacity="0.85" />
          <path d="M80 46l-7 6h3v7h8v-7h3z" opacity="0.85" />
        </g>
      );
    case "seal":
      return (
        <g>
          <circle cx="60" cy="48" r="15" fill={color} />
          <circle cx="60" cy="48" r="15" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
          <path d="M60 40l2.6 5.4 6 .8-4.3 4.2 1 6L60 57.6 54.7 60.6l1-6-4.3-4.2 6-.8z" fill="#f4e8d8" />
        </g>
      );
    case "bar":
    default:
      return (
        <g fill={color} opacity="0.5">
          <rect x="40" y="40" width="40" height="5" rx="2" />
          <rect x="46" y="52" width="28" height="5" rx="2" />
        </g>
      );
  }
}

export function CrestBanner({
  cosmeticId,
  mood = "rest",
  width = 120,
}: {
  cosmeticId: CosmeticId;
  mood?: Mood;
  width?: number;
}) {
  const c = COSMETICS[cosmeticId] ?? COSMETICS.plain;
  const moodClass = mood === "perk" ? "perk" : mood === "droop" ? "droop" : "";
  return (
    <div className="banner-wrap" style={{ width }}>
      <svg
        viewBox="0 0 120 150"
        className={`banner-svg ${moodClass} ${c.shimmer ? "banner-shimmer" : ""}`}
        role="img"
        aria-label={`${c.name} banner`}
      >
        {/* hanging bar */}
        <rect x="6" y="4" width="108" height="8" rx="3" fill="#5a4a28" />
        <circle cx="12" cy="8" r="4" fill="#3a2f18" />
        <circle cx="108" cy="8" r="4" fill="#3a2f18" />
        {/* field with a swallowtail bottom */}
        <path
          d="M14 12h92v104l-23-14-23 14-23-14-23 14z"
          fill={c.field}
          stroke={c.trim}
          strokeWidth="3"
        />
        {/* subtle inner shade for cloth depth */}
        <path d="M14 12h92v104l-23-14-23 14-23-14-23 14z" fill="url(#fold)" opacity="0.35" />
        {/* shimmer sweep for Sovereign's Gold */}
        {c.shimmer && (
          <rect className="field-shimmer" x="14" y="12" width="22" height="104" fill="#fff" opacity="0.2" />
        )}
        <Charge motif={c.motif} color={c.charge} />
        <defs>
          <linearGradient id="fold" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.25" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="1" stopColor="#000" stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
