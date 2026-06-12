// Maps a badge/toast glyph name (lucide) to its component. Explicit map (not dynamic
// import) so the bundler tree-shakes correctly and TS stays happy.

import {
  BadgeCheck,
  Eye,
  Fish,
  FolderOpen,
  Layers,
  ListChecks,
  Sparkles,
  Trophy,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const MAP: Record<string, ComponentType<LucideProps>> = {
  Eye,
  ListChecks,
  FolderOpen,
  Sparkles,
  Zap,
  Fish,
  Layers,
  Trophy,
  BadgeCheck,
};

export function BadgeGlyph({ glyph, size = 22 }: { glyph: string; size?: number }) {
  const Cmp = MAP[glyph] ?? BadgeCheck;
  return <Cmp size={size} aria-hidden />;
}
