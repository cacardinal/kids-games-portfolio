// EXAMPLE local profile override. Copy this file to `profiles.local.ts` (which is
// gitignored) to use real first names at home without committing them to the repo.
//
// The exported PROFILES replaces the tracked DEFAULTS from profiles.ts. Use the SAME
// shape (ProfileDef[]). Each `id` keys that profile's localStorage save
// (kg.world-explorer.v1.<id>), so pick stable ids and keep them to preserve existing
// saves. Set `largeText: true` on any profile that should default to Large text.

import type { ProfileDef } from "./profiles";

export const PROFILES: ProfileDef[] = [
  { id: "p1", name: "Alice", initial: "A", tint: "#b5642f", largeText: true },
  { id: "p2", name: "Bob", initial: "B", tint: "#2f7d72" },
  { id: "guest", name: "Guest", initial: "G", tint: "#3b4e8f" },
];
