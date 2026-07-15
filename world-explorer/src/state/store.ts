import { create } from "zustand";
import { loadSave, persistSave, clearSave } from "../lib/storage";
import { setMuted } from "../lib/sfx";
import {
  freshSave,
  applyCompletion,
  recordFactRead,
  isCoverUnlocked,
  isRegionUnlocked,
  type SaveV1,
} from "../game/progress";
import type { Region } from "../data/types";
import { REGION_ORDER } from "../data/types";
import { PROFILES } from "../profiles";

// Three fixed profiles (shared contract §6). No CRUD. Ids are config-driven (profiles.ts)
// and key the localStorage saves, so the id type is an open string.
export type ProfileId = string;
export { PROFILES };

export type View =
  | "profiles"
  | "atlas"
  | "mission"
  | "passport"
  | "log"
  | "settings";

const STORAGE_KEY = (p: ProfileId) => `kg.world-explorer.v1.${p}`;

interface StoreState {
  profile: ProfileId | null;
  save: SaveV1;
  view: View;
  activeRegion: Region;
  activeMissionId: string | null;
  // Fix 4: the region that JUST crossed locked → unlocked on the last completion,
  // so the Atlas can play the unlock set-piece exactly once. Cleared when played.
  justUnlockedRegion: Region | null;

  selectProfile: (p: ProfileId) => void;
  exitProfile: () => void;
  setView: (v: View) => void;
  setActiveRegion: (r: Region) => void;
  openMission: (id: string) => void;
  closeMission: () => void;

  completeMission: (
    missionId: string,
    earnedStar: boolean,
    fact: string,
    region: Region,
  ) => void;
  markFactRead: (factId: string) => void;
  clearJustUnlocked: () => void;
  setCover: (coverId: string) => void;
  setMutedPref: (m: boolean) => void;
  setLargeText: (v: boolean) => void;
  resetProfile: () => void;
}

function commit(p: ProfileId, save: SaveV1): SaveV1 {
  persistSave(STORAGE_KEY(p), save);
  return save;
}

export const useStore = create<StoreState>((set, get) => ({
  profile: null,
  save: freshSave(),
  view: "profiles",
  activeRegion: "americas",
  activeMissionId: null,
  justUnlockedRegion: null,

  selectProfile: (p) => {
    const save = loadSave<SaveV1>(STORAGE_KEY(p), freshSave());
    setMuted(save.muted);
    set({
      profile: p,
      save,
      view: "atlas",
      activeRegion: "americas",
      activeMissionId: null,
      justUnlockedRegion: null,
    });
  },

  exitProfile: () => {
    set({
      profile: null,
      save: freshSave(),
      view: "profiles",
      activeMissionId: null,
      justUnlockedRegion: null,
    });
  },

  setView: (v) => set({ view: v }),
  setActiveRegion: (r) => set({ activeRegion: r }),
  openMission: (id) => set({ activeMissionId: id, view: "mission" }),
  closeMission: () => set({ activeMissionId: null, view: "atlas" }),

  completeMission: (missionId, earnedStar, fact, region) => {
    const { profile, save } = get();
    if (!profile) return;
    const next = applyCompletion(save, missionId, earnedStar, fact, region);
    // Fix 4: detect a region crossing locked → unlocked on THIS completion, so the
    // Atlas can fire the unlock set-piece. (Region 1 is always open and skipped.)
    let justUnlocked: Region | null = get().justUnlockedRegion;
    for (const r of REGION_ORDER) {
      if (REGION_ORDER.indexOf(r) === 0) continue;
      if (!isRegionUnlocked(save, r) && isRegionUnlocked(next, r)) {
        justUnlocked = r;
        break;
      }
    }
    set({ save: commit(profile, next), justUnlockedRegion: justUnlocked });
  },

  markFactRead: (factId) => {
    const { profile, save } = get();
    if (!profile) return;
    const next = recordFactRead(save, factId);
    if (next === save) return;
    set({ save: commit(profile, next) });
  },

  clearJustUnlocked: () => set({ justUnlockedRegion: null }),

  setCover: (coverId) => {
    const { profile, save } = get();
    if (!profile || !isCoverUnlocked(save, coverId)) return;
    const next = { ...save, cover: coverId };
    set({ save: commit(profile, next) });
  },

  setMutedPref: (m) => {
    const { profile, save } = get();
    if (!profile) return;
    setMuted(m);
    const next = { ...save, muted: m };
    set({ save: commit(profile, next) });
  },

  setLargeText: (v) => {
    const { profile, save } = get();
    if (!profile) return;
    const next = { ...save, largeText: v };
    set({ save: commit(profile, next) });
  },

  resetProfile: () => {
    const { profile } = get();
    if (!profile) return;
    clearSave(STORAGE_KEY(profile));
    const fresh = freshSave();
    setMuted(fresh.muted);
    set({ save: fresh });
  },
}));
