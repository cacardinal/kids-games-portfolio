// Persistent + session state shapes for the store.

import type { BadgeId, CardStyleId } from "../game/progression";

// Profile ids are config-driven (see ../profiles) and key the localStorage saves, so the
// id type is an open string rather than a fixed union.
export type ProfileId = string;
export type TextSize = "standard" | "large" | "largest";

// Re-export the profile shape from the config module so existing importers of ProfileMeta
// keep working. ProfileDef adds an optional largeText flag used for the default text size.
export type { ProfileDef as ProfileMeta } from "../profiles";

// What we record about a closed case (per profile).
export interface CaseRecord {
  closed: boolean;
  bestXp: number; // best single-close XP achieved
  hintFree: boolean; // ever closed hint-free
  firstTry: boolean; // ever closed first-try
}

// The persisted save for one profile (storage key kg.detective.v1.<id>).
export interface ProfileSave {
  version: 1;
  xp: number; // cumulative lifetime XP
  cases: Record<number, CaseRecord>; // by caseId
  badges: BadgeId[]; // earned (unique)
  unlockedCards: CardStyleId[]; // unlocked styles (cumulative; derived but cached)
  activeCard: CardStyleId; // chosen style shown on profile
  settings: {
    muted: boolean;
    textSize: TextSize;
  };
  // Fix 5: the case currently being worked, persisted so reload mid-case restores
  // exactly (cleared suspects, cited clues, hint step/usage, notebook spine). Null when
  // no case is open (board/profile/result). Cleared on close + on leaving the case view.
  // Per the shared contract: "quitting mid-anything is always safe."
  activeSession: CaseSession | null;
}

export const SAVE_VERSION = 1 as const;

export function freshSave(textSize: TextSize): ProfileSave {
  return {
    version: SAVE_VERSION,
    xp: 0,
    cases: {},
    badges: [],
    unlockedCards: ["standard"],
    activeCard: "standard",
    settings: { muted: false, textSize },
    activeSession: null,
  };
}

// Working state for the case currently being worked. Fix 5: this is now PERSISTED in
// ProfileSave.activeSession (autosaved on every action) so a reload mid-case restores it
// exactly. It is fully JSON-serializable (no functions/closures). The notebook is
// rebuilt from clearedIds + clearedVia, so persisting those restores the notebook too.
export interface CaseSession {
  caseId: number;
  clearedIds: string[]; // suspects cleared (with cited clue)
  clearedVia: Record<string, string>; // suspectId -> clueId used to clear
  hintsUsed: number; // lifetime hint presses this case (drives Sharp Eye: === 0)
  hintStep: number; // escalation level (0..3) for the CURRENT deduction; resets on state change
  wrongAccusation: boolean; // any wrong accusation this case
  citedFlavorInClearOrAccuse: boolean; // for Red-Herring Hunter (tier 3)
  startedAt: number; // ms epoch (for Quick Study)
  // hint UI state
  hintFocusClueId?: string;
  hintText?: string;
}
