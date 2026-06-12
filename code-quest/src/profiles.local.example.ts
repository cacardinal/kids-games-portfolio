// EXAMPLE local profile override. Copy this file to `profiles.local.ts` (which is
// gitignored) to use real first names at home without committing them to the repo.
//
// The exported PROFILES replaces the tracked DEFAULTS from profiles.ts. Use the SAME
// shape (ProfileDef[]). Each `id` keys that profile's localStorage save
// (kg.codequest.v1.<id>), so pick stable ids and keep them to preserve existing saves.
// Set `largeText: true` on any profile that should default to Large text.

import type { ProfileDef } from "./profiles";

export const PROFILES: ProfileDef[] = [
  { id: "p1", name: "Alice", color: "#39d98a", largeText: true },
  { id: "p2", name: "Bob", color: "#22d3ee" },
  { id: "guest", name: "Guest", color: "#8a97a6" },
];
