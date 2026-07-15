// Zustand store — profiles, per-profile progress, cosmetics, settings. Persisted with the
// shared save guards (corrupt JSON -> fresh save, never a white screen).
import { create } from "zustand";
import { loadSave, persistSave } from "../lib/storage";
import { setMuted } from "../lib/sfx";
import type { Placement } from "../game/types";
import { PROFILES } from "../profiles";

// Ids are config-driven (profiles.ts) and key the localStorage saves, so the id type is
// an open string.
export type ProfileId = string;
export { PROFILES };

export const APP_KEY = (id: ProfileId) => `kg.inventor.v1.${id}`;

// Per-level record persisted per profile.
export interface LevelRecord {
  solved: boolean;
  stars: number;        // 0..3 (best)
  bestParts: number;    // best (lowest) part count on a solve, 0 = none
  bestCost: number;     // best (lowest) cost on a solve, 0 = none
  tests: number;        // lifetime tests run on this level
  rev: number;          // lifetime REV number (increments per solve/edit session)
  build: Placement[] | null; // saved "My Invention" build
}

export interface ProfileSave {
  version: 1;
  levels: Record<number, LevelRecord>;
  totalTests: number;     // lifetime tests across all levels
  pen: string;            // selected pen hex
  muted: boolean;
}

function freshSave(): ProfileSave {
  return { version: 1, levels: {}, totalTests: 0, pen: "#e8f1ff", muted: false };
}

function freshRecord(): LevelRecord {
  return { solved: false, stars: 0, bestParts: 0, bestCost: 0, tests: 0, rev: 1, build: null };
}

interface AppState {
  profile: ProfileId | null;
  save: ProfileSave;
  // navigation (no router — view enum)
  view: "profile" | "missions" | "build" | "pens" | "log";
  currentLevel: number | null;

  setProfile: (id: ProfileId) => void;
  clearProfile: () => void; // back to "who's playing"
  resetActiveSave: () => void;
  hydrateActive: () => void; // re-read the active profile's save (after a live cloud pull)

  go: (view: AppState["view"]) => void;
  openLevel: (id: number) => void;

  getRecord: (id: number) => LevelRecord;
  bumpTest: (id: number) => void;       // a TEST was run (counts toward Test Pilot)
  bumpRev: (id: number) => void;        // a build edit session happened
  recordSolve: (id: number, stars: number, parts: number, cost: number) => void;
  saveBuild: (id: number, build: Placement[]) => void;

  setPen: (hex: string) => void;
  setMutedPref: (m: boolean) => void;

  totalStars: () => number;
}

function persist(profile: ProfileId | null, save: ProfileSave) {
  if (profile) persistSave(APP_KEY(profile), save);
}

export const useStore = create<AppState>((set, get) => ({
  profile: null,
  save: freshSave(),
  view: "profile",
  currentLevel: null,

  setProfile: (id) => {
    const save = loadSave<ProfileSave>(APP_KEY(id), freshSave());
    setMuted(save.muted);
    set({ profile: id, save, view: "missions" });
  },
  clearProfile: () => set({ profile: null, view: "profile", currentLevel: null }),

  hydrateActive: () => {
    const { profile } = get();
    if (!profile) return; // on the picker there's no active save to refresh
    const save = loadSave<ProfileSave>(APP_KEY(profile), freshSave());
    setMuted(save.muted);
    set({ save });
  },

  resetActiveSave: () => {
    const { profile } = get();
    const save = freshSave();
    persist(profile, save);
    setMuted(false);
    set({ save, view: "missions", currentLevel: null });
  },

  go: (view) => set({ view }),
  openLevel: (id) => set({ currentLevel: id, view: "build" }),

  getRecord: (id) => get().save.levels[id] ?? freshRecord(),

  bumpTest: (id) => {
    const { save, profile } = get();
    const rec = { ...(save.levels[id] ?? freshRecord()) };
    rec.tests += 1;
    const next = { ...save, totalTests: save.totalTests + 1, levels: { ...save.levels, [id]: rec } };
    persist(profile, next);
    set({ save: next });
  },

  bumpRev: (id) => {
    const { save, profile } = get();
    const rec = { ...(save.levels[id] ?? freshRecord()) };
    rec.rev += 1;
    const next = { ...save, levels: { ...save.levels, [id]: rec } };
    persist(profile, next);
    set({ save: next });
  },

  recordSolve: (id, stars, parts, cost) => {
    const { save, profile } = get();
    const prev = save.levels[id] ?? freshRecord();
    const rec: LevelRecord = {
      ...prev,
      solved: true,
      stars: Math.max(prev.stars, stars),
      bestParts: prev.bestParts === 0 ? parts : Math.min(prev.bestParts, parts),
      bestCost: prev.bestCost === 0 ? cost : Math.min(prev.bestCost, cost),
    };
    const next = { ...save, levels: { ...save.levels, [id]: rec } };
    persist(profile, next);
    set({ save: next });
  },

  saveBuild: (id, build) => {
    const { save, profile } = get();
    const rec = { ...(save.levels[id] ?? freshRecord()), build };
    const next = { ...save, levels: { ...save.levels, [id]: rec } };
    persist(profile, next);
    set({ save: next });
  },

  setPen: (hex) => {
    const { save, profile } = get();
    const next = { ...save, pen: hex };
    persist(profile, next);
    set({ save: next });
  },

  setMutedPref: (m) => {
    const { save, profile } = get();
    setMuted(m);
    const next = { ...save, muted: m };
    persist(profile, next);
    set({ save: next });
  },

  totalStars: () => Object.values(get().save.levels).reduce((sum, r) => sum + (r?.stars ?? 0), 0),
}));
