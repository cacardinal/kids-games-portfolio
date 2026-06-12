// EXAMPLE local profile override. Copy this file to `profiles.local.ts` (which is
// gitignored) to use real first names at home without committing them to the repo.
//
// The exported PROFILES replaces the tracked DEFAULTS from profiles.ts. Use the SAME
// shape (ProfileDef[]). Each `id` keys that profile's localStorage save
// (kg.detective.v1.<id>), so pick stable ids and keep them to preserve existing saves.
// Set `largeText: true` on any profile that should default to Large text on a fresh save.

import type { ProfileDef } from "./profiles";

export const PROFILES: ProfileDef[] = [
  { id: "p1", name: "Alice", initial: "A", color: "#5a8a9a", largeText: true },
  { id: "p2", name: "Bob", initial: "B", color: "#a05a8a" },
  { id: "guest", name: "Guest", initial: "G", color: "#8a7a5a" },
];
