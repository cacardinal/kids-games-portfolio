// Hand-drawn SVG building glyphs — flat, parchment-era, 2-3 colors, no library
// dependency for the board art (lucide is used only for UI chrome like Volume2).
import type { BuildingId } from "../game/content";

interface IconProps {
  className?: string;
  title?: string;
}

export function FarmIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title ?? "Farm"}>
      {/* furrowed field + a wheat sheaf */}
      <rect x="4" y="30" width="40" height="12" rx="2" fill="#6e5a34" />
      <path d="M6 34h36M6 38h36" stroke="#4a3d20" strokeWidth="1.4" />
      <path d="M24 8v18" stroke="#8ab87a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 12c-3-2-6-1-7 2 3 1 6 0 7-2zM24 12c3-2 6-1 7 2-3 1-6 0-7-2zM24 18c-3-2-6-1-7 2 3 1 6 0 7-2zM24 18c3-2 6-1 7 2-3 1-6 0-7-2z"
        fill="#9bc77f" />
    </svg>
  );
}

export function LumberIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title ?? "Lumber Camp"}>
      <circle cx="24" cy="22" r="13" fill="#3f6b3a" />
      <path d="M24 18l-5 7h10z" fill="#2f5230" />
      <rect x="22" y="30" width="4" height="11" rx="1" fill="#7a5a32" />
      {/* axe */}
      <path d="M30 14l8-5 2 3-8 5z" fill="#9aa3ad" />
      <rect x="33" y="13" width="2.6" height="14" rx="1" transform="rotate(28 34 20)" fill="#a9805b" />
    </svg>
  );
}

export function QuarryIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title ?? "Quarry"}>
      <path d="M8 40l8-18h16l8 18z" fill="#7d858f" />
      <path d="M16 22l4 18M32 22l-4 18M22 22l0 18" stroke="#5c636b" strokeWidth="1.4" />
      <rect x="18" y="32" width="6" height="5" fill="#9aa3ad" />
      <rect x="26" y="28" width="5" height="5" fill="#aab2bb" />
    </svg>
  );
}

export function MarketIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title ?? "Market"}>
      <rect x="8" y="22" width="32" height="16" rx="2" fill="#7a5a32" />
      {/* striped awning */}
      <path d="M6 22l4-8h28l4 8z" fill="#c9a86a" />
      <path d="M14 14l-2 8M22 14l-1 8M30 14l1 8M38 14l2 8" stroke="#8a3a2e" strokeWidth="3" />
      <circle cx="30" cy="30" r="3.4" fill="#d9b945" />
    </svg>
  );
}

export function LibraryIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title ?? "Library"}>
      <path d="M24 12c-4-2-9-2-13 0v22c4-2 9-2 13 0z" fill="#6a6048" />
      <path d="M24 12c4-2 9-2 13 0v22c-4-2-9-2-13 0z" fill="#7d7256" />
      <path d="M24 12v22" stroke="#4a4233" strokeWidth="1.4" />
      <path d="M9 16h10M9 20h10M29 16h10M29 20h10" stroke="#e9dfc8" strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}

export function HouseIcon({ className, title }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title ?? "House"}>
      <path d="M24 8L8 22h6v16h20V22h6z" fill="#a9805b" />
      <path d="M24 8L8 22h32z" fill="#8a3a2e" />
      <rect x="21" y="28" width="6" height="10" fill="#5a4326" />
      <rect x="16" y="25" width="4" height="4" fill="#e9dfc8" />
      <rect x="28" y="25" width="4" height="4" fill="#e9dfc8" />
    </svg>
  );
}

export const BUILDING_ICON: Record<BuildingId, (p: IconProps) => React.JSX.Element> = {
  farm: FarmIcon,
  lumberCamp: LumberIcon,
  quarry: QuarryIcon,
  market: MarketIcon,
  library: LibraryIcon,
  house: HouseIcon,
};

export function BuildingGlyph({ id, className }: { id: BuildingId; className?: string }) {
  const C = BUILDING_ICON[id];
  return <C className={className} />;
}
