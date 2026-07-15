// Zustand store — the React bridge over the pure reducer. NO game math here beyond
// thin wrappers; the reducer owns all arithmetic. Autosaves per profile on every
// meaningful change via the shared storage guards (StrictMode-safe: pure setState).
import { create } from "zustand";
import {
  initialState,
  reduce,
  scoreReign,
  goalsMet,
  type KingdomState,
  type Action,
  type ScoreBreakdown,
} from "../game/kingdom";
import {
  SCENARIOS,
  SCENARIO_ORDER,
  COSMETICS,
  type ScenarioId,
  type CosmeticId,
  type BadgeId,
  type ResearchId,
  ALL_RESEARCH_COUNT,
} from "../game/content";
import { loadSave, persistSave, clearSave } from "../lib/storage";
import { setMuted } from "../lib/sfx";
import { PROFILES } from "../profiles";

/** Saved record of a completed reign (for Throne Room display and recap replay). */
export interface CompletedReignRecord {
  rank: ScoreBreakdown["rank"];
  /** Number of seasons the reign lasted (= log.length). */
  seasons: number;
  /** The finished KingdomState — enough to re-render the recap at any time. */
  state: KingdomState;
}

// Ids are config-driven (profiles.ts) and key the localStorage saves, so the id type is
// an open string.
export type ProfileId = string;
export { PROFILES };

export type View = "profile" | "throne" | "reign" | "recap";

export interface ReignResult {
  scenarioId: ScenarioId;
  score: number;
  rank: ScoreBreakdown["rank"];
}

/** Everything that persists for a profile (campaign progression + active reign). */
export interface ProfileSave {
  version: 1;
  muted: boolean;
  /** Best score per scenario (for Throne Room display). */
  bestScore: Partial<Record<ScenarioId, number>>;
  bestRank: Partial<Record<ScenarioId, ScoreBreakdown["rank"]>>;
  /** Highest scenario index unlocked (0 = tutorial only). */
  unlockedIndex: number;
  /** Earned badges. */
  badges: BadgeId[];
  /** Unlocked cosmetics. */
  cosmetics: CosmeticId[];
  /** Selected banner cosmetic. */
  selectedCosmetic: CosmeticId;
  /** All research nodes ever completed, across the whole campaign (Master Scholar). */
  campaignResearch: ResearchId[];
  /** A reign in progress (mid-reign resume). null if none. */
  activeReign: KingdomState | null;
  /** Completed reign records, keyed by scenarioId. Set when the recap is shown. */
  completedReigns: Partial<Record<ScenarioId, CompletedReignRecord>>;
}

function freshSave(): ProfileSave {
  return {
    version: 1,
    muted: false,
    bestScore: {},
    bestRank: {},
    unlockedIndex: 0,
    badges: [],
    cosmetics: ["plain"],
    selectedCosmetic: "plain",
    campaignResearch: [],
    activeReign: null,
    completedReigns: {},
  };
}

const STORAGE_PREFIX = "kg.kingdom.v1.";
function keyFor(profile: ProfileId) {
  return `${STORAGE_PREFIX}${profile}`;
}

// ── What just happened, for the recap unlock line (computed at reign end). ──────
export interface UnlockSummary {
  newScenario: ScenarioId | null;
  newCosmetic: CosmeticId | null;
  newBadges: BadgeId[];
}

interface StoreState {
  profile: ProfileId | null;
  view: View;
  save: ProfileSave;
  /** Active reign state (mirror of save.activeReign while playing). */
  reign: KingdomState | null;
  /** Score breakdown shown on the recap screen. */
  lastScore: ScoreBreakdown | null;
  /** Unlocks earned this reign (for the recap line). */
  lastUnlocks: UnlockSummary | null;

  // actions
  pickProfile: (p: ProfileId) => void;
  exitProfile: () => void;
  setView: (v: View) => void;
  toggleMute: () => void;
  startReign: (s: ScenarioId) => void;
  resumeReign: () => void;
  dispatch: (a: Action) => void;
  endReignToRecap: () => void;
  /** Navigate to the recap for an already-completed reign (from the Throne Room). */
  viewCompletedRecap: (s: ScenarioId) => void;
  selectCosmetic: (c: CosmeticId) => void;
  resetProfile: () => void;
  /** Re-read the active profile's save from localStorage without navigating —
   * used to pick up a cloud sync pull that lands while the game is open. */
  hydrateFromStorage: () => void;
}

function loadProfile(p: ProfileId): ProfileSave {
  return loadSave<ProfileSave>(keyFor(p), freshSave());
}

/** Exposes the storage key for a profile so callers (e.g. App's sync listener)
 * can match a `kg-sync:updated` event's key without duplicating the prefix. */
export function profileStorageKey(p: ProfileId): string {
  return keyFor(p);
}

export const useStore = create<StoreState>((set, get) => ({
  profile: null,
  view: "profile",
  save: freshSave(),
  reign: null,
  lastScore: null,
  lastUnlocks: null,

  pickProfile: (p) => {
    let save = loadProfile(p);
    setMuted(save.muted);

    // ── Legacy-save migration ─────────────────────────────────────────────────
    // A save written before the completed-reign fix may have activeReign with
    // finished=true (the recap was shown but the save still holds the reign).
    // Detect by: activeReign is non-null AND finished is true.
    // Migrate: move it into completedReigns and clear activeReign.
    if (save.activeReign && save.activeReign.finished) {
      const legacyReign = save.activeReign;
      const legacyScore = scoreReign(legacyReign);
      const scenarioId = legacyReign.scenarioId;
      const completedReigns = { ...(save.completedReigns ?? {}) };
      if (!completedReigns[scenarioId]) {
        completedReigns[scenarioId] = {
          rank: legacyScore.rank,
          seasons: legacyReign.log.length,
          state: legacyReign,
        };
      }
      save = { ...save, activeReign: null, completedReigns };
      persistSave(keyFor(p), save);
    }

    set({
      profile: p,
      save,
      reign: save.activeReign,
      view: "throne",
      lastScore: null,
      lastUnlocks: null,
    });
  },

  exitProfile: () => {
    set({ profile: null, view: "profile", reign: null, lastScore: null, lastUnlocks: null });
  },

  setView: (v) => set({ view: v }),

  toggleMute: () => {
    const { profile, save } = get();
    const next = { ...save, muted: !save.muted };
    setMuted(next.muted);
    set({ save: next });
    if (profile) persistSave(keyFor(profile), next);
  },

  startReign: (scenarioId) => {
    const { profile, save } = get();
    const reign = initialState(scenarioId);
    // Clear any completed record for this scenario: the new reign replaces it.
    // Best score/rank are kept — only the replayable state is removed.
    const completedReigns = { ...(save.completedReigns ?? {}) };
    delete completedReigns[scenarioId];
    const next = { ...save, activeReign: reign, completedReigns };
    set({ save: next, reign, view: "reign", lastScore: null, lastUnlocks: null });
    if (profile) persistSave(keyFor(profile), next);
  },

  resumeReign: () => {
    const { reign } = get();
    // A finished reign must never be re-entered: the recap was already shown,
    // the save has been promoted to completedReigns, and activeReign is null.
    // Guard defensively against any stale reign reference.
    if (reign && !reign.finished) set({ view: "reign" });
  },

  // Apply a reducer action, autosave, and surface reign-end when it finishes.
  dispatch: (action) => {
    const { profile, save, reign } = get();
    if (!reign) return;
    const nextReign = reduce(reign, action);
    if (nextReign === reign) return; // no-op action, skip the write
    const nextSave = { ...save, activeReign: nextReign };
    set({ save: nextSave, reign: nextReign });
    if (profile) persistSave(keyFor(profile), nextSave);
    // NOTE: the UI drives the END TURN animation, then calls endReignToRecap()
    // when nextReign.finished — we do not auto-navigate here so the ledger plays.
  },

  // Called by the Reign screen after the final resolution animation when finished.
  endReignToRecap: () => {
    const { profile, save, reign } = get();
    if (!reign || !reign.finished) return;
    const score = scoreReign(reign);
    const scenarioId = reign.scenarioId;
    const met = goalsMet(reign);

    // ── Campaign progression ──
    const bestScore = { ...save.bestScore };
    const bestRank = { ...save.bestRank };
    const prevBest = bestScore[scenarioId] ?? -1;
    if (score.total > prevBest) {
      bestScore[scenarioId] = score.total;
      bestRank[scenarioId] = score.rank;
    }

    // Next scenario unlocks on completion (goal met or not — reaching the end counts).
    const idx = SCENARIO_ORDER.indexOf(scenarioId);
    let unlockedIndex = save.unlockedIndex;
    let newScenario: ScenarioId | null = null;
    if (idx === unlockedIndex && idx + 1 < SCENARIO_ORDER.length) {
      unlockedIndex = idx + 1;
      newScenario = SCENARIO_ORDER[unlockedIndex];
    }

    // Campaign research accumulation (for Master Scholar — all 10 across campaign).
    const campaignResearch = Array.from(new Set([...save.campaignResearch, ...reign.researched]));

    // ── Badges ──
    const badges = new Set<BadgeId>(save.badges);
    const newBadges: BadgeId[] = [];
    const award = (b: BadgeId) => {
      if (!badges.has(b)) {
        badges.add(b);
        newBadges.push(b);
      }
    };
    if (reign.allTurnsSurplus) award("fullLarder");
    if (scenarioId === "tutorial" && met) award("firstLight");
    if (campaignResearch.length >= ALL_RESEARCH_COUNT) award("masterScholar");
    if (reign.plots.filter((p) => p === "house").length >= 5) award("founder");
    if (reign.resources.gold >= 100) award("treasurer");
    if (score.rank === "monarch") award("crowned");

    // ── Cosmetics ──
    const cosmetics = new Set<CosmeticId>(save.cosmetics);
    let newCosmetic: CosmeticId | null = null;
    const unlockCosmetic = (c: CosmeticId) => {
      if (!cosmetics.has(c)) {
        cosmetics.add(c);
        if (!newCosmetic) newCosmetic = c; // surface the first new one in the recap line
      }
    };
    // Director amendment: starter banner on Tutorial completion.
    if (scenarioId === "tutorial" && met) unlockCosmetic("tutorialStarter");
    if (scenarioId === "growth" && met) unlockCosmetic("harvest");
    if (reign.researched.includes("masonry")) unlockCosmetic("mason");
    if (badges.has("masterScholar")) unlockCosmetic("scholar");
    if (score.rank === "monarch") unlockCosmetic("sovereign");
    if (badges.has("founder")) unlockCosmetic("founders");

    // Persist the completed reign so the Throne Room can show COMPLETE state
    // and the player can view the recap again without re-playing.
    const completedReigns: Partial<Record<ScenarioId, CompletedReignRecord>> = {
      ...(save.completedReigns ?? {}),
      [scenarioId]: {
        rank: score.rank,
        seasons: reign.log.length,
        state: reign,
      },
    };

    const nextSave: ProfileSave = {
      ...save,
      bestScore,
      bestRank,
      unlockedIndex,
      badges: [...badges],
      cosmetics: [...cosmetics],
      campaignResearch,
      activeReign: null, // reign consumed
      completedReigns,
    };

    set({
      save: nextSave,
      reign,
      view: "recap",
      lastScore: score,
      lastUnlocks: { newScenario, newCosmetic, newBadges },
    });
    if (profile) persistSave(keyFor(profile), nextSave);
  },

  viewCompletedRecap: (scenarioId) => {
    const { save } = get();
    const record = (save.completedReigns ?? {})[scenarioId];
    if (!record) return;
    const score = scoreReign(record.state);
    set({
      reign: record.state,
      view: "recap",
      lastScore: score,
      // No new unlocks to surface when replaying a completed reign's recap.
      lastUnlocks: { newScenario: null, newCosmetic: null, newBadges: [] },
    });
  },

  selectCosmetic: (c) => {
    const { profile, save } = get();
    if (!save.cosmetics.includes(c)) return;
    const next = { ...save, selectedCosmetic: c };
    set({ save: next });
    if (profile) persistSave(keyFor(profile), next);
  },

  resetProfile: () => {
    const { profile } = get();
    if (!profile) return;
    clearSave(keyFor(profile));
    const fresh = freshSave();
    setMuted(fresh.muted);
    set({ save: fresh, reign: null, view: "throne", lastScore: null, lastUnlocks: null });
  },

  hydrateFromStorage: () => {
    const { profile } = get();
    if (!profile) return;
    const save = loadProfile(profile);
    setMuted(save.muted);
    set({ save, reign: save.activeReign });
  },
}));

// ── Selectors / derived helpers for screens ───────────────────────────────────
export function scenarioUnlocked(save: ProfileSave, scenarioId: ScenarioId): boolean {
  return SCENARIO_ORDER.indexOf(scenarioId) <= save.unlockedIndex;
}
export function selectedCosmeticDef(save: ProfileSave) {
  return COSMETICS[save.selectedCosmetic] ?? COSMETICS.plain;
}
export { SCENARIOS };
