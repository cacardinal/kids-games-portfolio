// Player profiles. The defaults below ship with the repo and use neutral display names.
// To use real first names at home WITHOUT committing them, copy profiles.local.example.ts
// to profiles.local.ts (gitignored) and export your own PROFILES from it — same shape.
// The `id` of each profile keys its localStorage save (kg.inventor.v1.<id>), so keeping
// the same ids across the default/override boundary preserves existing saves.

export interface ProfileDef {
  id: string;
  name: string;
  disc: string;
  /** When true, this profile defaults to Large text on a fresh save. */
  largeText?: boolean;
}

export const DEFAULTS: ProfileDef[] = [
  { id: "p1", name: "Player One", disc: "#4cc9f0" },
  { id: "p2", name: "Player Two", disc: "#ffd166" },
  { id: "guest", name: "Guest", disc: "#80ed99" },
];

// Optional local override (Vite glob; eager). If src/profiles.local.ts exists, its
// exported PROFILES (same ProfileDef[] shape) replaces the defaults. Absent -> defaults.
// This must build cleanly whether or not the file is present.
const local = import.meta.glob<{ PROFILES?: ProfileDef[] }>("./profiles.local.ts", {
  eager: true,
});
const overridden = Object.values(local)[0]?.PROFILES;

export const PROFILES: ProfileDef[] = overridden ?? DEFAULTS;
