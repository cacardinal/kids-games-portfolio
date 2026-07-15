// Central zustand store. Persistence is hand-rolled on the contract's storage guards
// (storage.ts), re-targeted per profile. Autosave on every meaningful change.

import { create } from "zustand";
import { clearSave, loadSave, persistSave } from "../lib/storage";
import { setMuted } from "../lib/sfx";
import { generateCase, TOTAL_CASES } from "../game/generator";
import {
  allInnocentsCleared,
  buildRecap,
  validateAccusation,
  validateClear,
  type AccuseResult,
  type ClearResult,
  type RecapData,
} from "../game/case-actions";
import {
  BADGES,
  CARD_STYLES,
  cardStyleForRank,
  computeXp,
  quickStudyThresholdMs,
  rankForXp,
  unlockedCardStyles,
  type BadgeId,
  type CardStyleId,
  type RankId,
  type XpBreakdown,
} from "../game/progression";
import type { Case } from "../game/types";
import {
  freshSave,
  type CaseSession,
  type ProfileId,
  type ProfileSave,
  type TextSize,
} from "./types";
import { PROFILES } from "../profiles";

export { PROFILES };

// Director amendment: a profile flagged largeText defaults to Large text; others Standard.
// The flag is config-driven (profiles.ts / profiles.local.ts), not tied to any name/id.
function defaultTextSize(id: ProfileId): TextSize {
  return PROFILES.find((p) => p.id === id)?.largeText ? "large" : "standard";
}

function storageKey(id: ProfileId): string {
  return `kg.detective.v1.${id}`;
}

function loadProfile(id: ProfileId): ProfileSave {
  const fb = freshSave(defaultTextSize(id));
  const save = loadSave(storageKey(id), fb);
  // normalize: ensure nested objects exist (storage merge is shallow)
  return {
    ...fb,
    ...save,
    settings: { ...fb.settings, ...(save.settings ?? {}) },
    cases: save.cases ?? {},
    badges: save.badges ?? [],
    unlockedCards: save.unlockedCards ?? ["standard"],
    // Fix 5: undefined (legacy saves) normalizes to "no case in progress".
    activeSession: save.activeSession ?? null,
  };
}

export type View =
  | "profile"
  | "board"
  | "case"
  | "result"
  | "settings";

// Result payload shown on the ResultScreen after a correct accusation.
export interface ResultPayload {
  caseId: number;
  xp: XpBreakdown;
  recap: RecapData;
  newBadges: BadgeId[];
  rankedUp: boolean;
  newRankId: RankId | null;
  newCardId: CardStyleId | null;
  totalXpAfter: number;
}

// Toast queue item (badge or rank-up).
export interface Toast {
  id: string;
  kind: "badge" | "rank";
  title: string;
  sub: string;
  glyph: string;
}

interface StoreState {
  // profile
  profileId: ProfileId | null;
  save: ProfileSave | null;

  // navigation
  view: View;
  caseTab: "briefing" | "evidence" | "suspects";

  // active case
  activeCase: Case | null;
  session: CaseSession | null;

  // result + toasts
  result: ResultPayload | null;
  toasts: Toast[];
  pendingToasts: Toast[]; // queued during the set-piece, flushed on the result screen

  // transient UI signal: increment to trigger a lamp "dip" on failure
  failPulse: number;

  // actions
  selectProfile: (id: ProfileId) => void;
  clearProfile: () => void; // back to picker
  setView: (v: View) => void;
  setCaseTab: (t: "briefing" | "evidence" | "suspects") => void;

  openCase: (caseId: number) => void;
  closeCaseView: () => void; // return to board
  finishCaseClosed: () => void; // set-piece done -> show result + flush toasts

  clearSuspect: (suspectId: string, clueId: string) => ClearResult;
  requestHint: () => void;
  submitAccusation: (suspectId: string, clueIds: string[]) => AccuseResult;

  dismissToast: (id: string) => void;
  clearResult: () => void;

  // settings
  setMutedSetting: (m: boolean) => void;
  setTextSize: (t: TextSize) => void;
  setActiveCard: (c: CardStyleId) => void;
  resetActiveProfile: () => void;
}

function persist(id: ProfileId, save: ProfileSave) {
  persistSave(storageKey(id), save);
}

// Fix 5: fold the working session into the save and persist it. Called on every
// session-mutating action (autosave). Returns the new save so the caller can also set it
// in state, keeping store.save and storage in lockstep. A null session means "no case in
// progress" (board/result), which clears the persisted activeSession.
function withSession(
  id: ProfileId | null,
  save: ProfileSave | null,
  session: CaseSession | null,
): ProfileSave | null {
  if (!id || !save) return save;
  const next: ProfileSave = { ...save, activeSession: session };
  persist(id, next);
  return next;
}

let toastSeq = 0;
const newToastId = () => `t${toastSeq++}`;

export const useStore = create<StoreState>((set, get) => ({
  profileId: null,
  save: null,
  view: "profile",
  caseTab: "briefing",
  activeCase: null,
  session: null,
  result: null,
  toasts: [],
  pendingToasts: [],
  failPulse: 0,

  selectProfile: (id) => {
    const save = loadProfile(id);
    setMuted(save.settings.muted);
    // Fix 5: if a case was in progress, restore it EXACTLY and land back in the case
    // view. The case itself is regenerated deterministically from its seed; the working
    // state (clears, cited clues, hint step/usage) comes from the persisted session.
    const persisted = save.activeSession;
    if (persisted) {
      const c = generateCase(persisted.caseId);
      set({
        profileId: id,
        save,
        activeCase: c,
        session: persisted,
        view: "case",
        caseTab: "briefing",
        result: null,
        toasts: [],
      });
      return;
    }
    set({
      profileId: id,
      save,
      activeCase: null,
      session: null,
      view: "board",
      result: null,
      toasts: [],
    });
  },

  clearProfile: () =>
    set({
      profileId: null,
      save: null,
      view: "profile",
      activeCase: null,
      session: null,
      result: null,
    }),

  setView: (v) => set({ view: v }),
  setCaseTab: (t) => set({ caseTab: t }),

  openCase: (caseId) => {
    const c = generateCase(caseId);
    const session: CaseSession = {
      caseId,
      clearedIds: [],
      clearedVia: {},
      hintsUsed: 0,
      hintStep: 0,
      wrongAccusation: false,
      citedFlavorInClearOrAccuse: false,
      startedAt: Date.now(),
    };
    // Fix 5: persist the fresh session immediately so even an instant reload restores it.
    const { profileId, save } = get();
    const nextSave = withSession(profileId, save, session) ?? save;
    set({ activeCase: c, session, view: "case", caseTab: "briefing", result: null, save: nextSave });
  },

  closeCaseView: () => {
    // Fix 5: leaving the case view ends the in-progress session (board/result are not
    // "mid-case"). Clear the persisted activeSession so reload returns to the board.
    const { profileId, save } = get();
    const nextSave = withSession(profileId, save, null) ?? save;
    set({ activeCase: null, session: null, view: "board", result: null, save: nextSave });
  },

  finishCaseClosed: () =>
    set((s) => ({
      view: "result",
      toasts: s.pendingToasts,
      pendingToasts: [],
    })),

  clearSuspect: (suspectId, clueId) => {
    const { activeCase, session } = get();
    if (!activeCase || !session) return { ok: false, reason: "No active case." };
    const res = validateClear(activeCase, suspectId, clueId);
    if (!res.ok) {
      // record flavor citation in a (failed) clear for Red-Herring Hunter tracking
      const clue = activeCase.clues.find((cl) => cl.id === clueId);
      const citedFlavor = clue?.kind === "flavor";
      set((s) => {
        if (!s.session) return { failPulse: s.failPulse + 1 };
        const next: CaseSession = {
          ...s.session,
          citedFlavorInClearOrAccuse:
            s.session.citedFlavorInClearOrAccuse || !!citedFlavor,
        };
        const nextSave = withSession(s.profileId, s.save, next) ?? s.save;
        return { failPulse: s.failPulse + 1, session: next, save: nextSave };
      });
      return res;
    }
    // success — record clear
    if (session.clearedIds.includes(suspectId)) return { ok: true };
    set((s) => {
      if (!s.session) return {};
      const next: CaseSession = {
        ...s.session,
        clearedIds: [...s.session.clearedIds, suspectId],
        clearedVia: { ...s.session.clearedVia, [suspectId]: clueId },
        // A state change resets the per-deduction escalation (GDD §2.4): the hint
        // button re-enables and the next press starts again at tier 1 for the new
        // deduction. hintsUsed (Sharp Eye) is untouched — it never resets.
        hintStep: 0,
        hintFocusClueId: undefined,
        hintText: undefined,
      };
      // Fix 5: autosave the clear (cleared suspect + cited clue) into the profile save.
      const nextSave = withSession(s.profileId, s.save, next) ?? s.save;
      return { session: next, save: nextSave };
    });
    return { ok: true };
  },

  requestHint: () => {
    const { activeCase, session } = get();
    if (!activeCase || !session) return;
    if (session.hintStep >= 3) return; // current deduction fully spelled out
    // Escalation for the CURRENT deduction (1->2->3). hintsUsed is the lifetime count
    // for Sharp Eye (lost on the FIRST press of any tier), and only ever increments.
    const nextStep = Math.min(session.hintStep + 1, 3);
    // resolve hint from current state (lazy import to avoid cycle)
    import("../game/hints").then(({ resolveHint, hintTextForCount }) => {
      const hint = resolveHint(activeCase, get().session?.clearedIds ?? []);
      if (!hint) return;
      const text = hintTextForCount(hint, nextStep);
      set((s) => {
        if (!s.session) return {};
        const next: CaseSession = {
          ...s.session,
          hintsUsed: s.session.hintsUsed + 1,
          hintStep: nextStep,
          hintFocusClueId: hint.focusClueId,
          hintText: text,
        };
        // Fix 5: persist hint usage/step + the focused clue so a reload restores the
        // hint panel AND the Sharp Eye count (hintsUsed) exactly.
        const nextSave = withSession(s.profileId, s.save, next) ?? s.save;
        return { session: next, save: nextSave };
      });
    });
  },

  submitAccusation: (suspectId, clueIds) => {
    const { activeCase, session, save, profileId } = get();
    if (!activeCase || !session || !save || !profileId) {
      return { ok: false, reason: "No active case." };
    }
    const res = validateAccusation(activeCase, suspectId, clueIds, session.clearedIds);
    if (!res.ok) {
      const citedFlavor = clueIds.some(
        (id) => activeCase.clues.find((cl) => cl.id === id)?.kind === "flavor",
      );
      set((s) => {
        if (!s.session) return { failPulse: s.failPulse + 1 };
        const next: CaseSession = {
          ...s.session,
          wrongAccusation: true,
          citedFlavorInClearOrAccuse:
            s.session.citedFlavorInClearOrAccuse || citedFlavor,
        };
        // Fix 5: persist the lost first-try flag so a reload can't restore it.
        const nextSave = withSession(s.profileId, s.save, next) ?? s.save;
        return { failPulse: s.failPulse + 1, session: next, save: nextSave };
      });
      return res;
    }

    // CORRECT — compute outcome, XP, badges, rank, cosmetics; commit to save.
    const citedFlavorInAccuse = clueIds.some(
      (id) => activeCase.clues.find((cl) => cl.id === id)?.kind === "flavor",
    );
    const outcome = computeOutcomeAndCommit(
      set,
      profileId,
      save,
      activeCase,
      session,
      citedFlavorInAccuse,
    );
    return { ok: true, ...outcome };
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearResult: () => set({ result: null }),

  setMutedSetting: (m) => {
    setMuted(m);
    set((s) => {
      if (!s.save || !s.profileId) return {};
      const save = { ...s.save, settings: { ...s.save.settings, muted: m } };
      persist(s.profileId, save);
      return { save };
    });
  },

  setTextSize: (t) =>
    set((s) => {
      if (!s.save || !s.profileId) return {};
      const save = { ...s.save, settings: { ...s.save.settings, textSize: t } };
      persist(s.profileId, save);
      return { save };
    }),

  setActiveCard: (c) =>
    set((s) => {
      if (!s.save || !s.profileId) return {};
      if (!s.save.unlockedCards.includes(c)) return {};
      const save = { ...s.save, activeCard: c };
      persist(s.profileId, save);
      return { save };
    }),

  resetActiveProfile: () =>
    set((s) => {
      if (!s.profileId) return {};
      clearSave(storageKey(s.profileId));
      const fresh = freshSave(defaultTextSize(s.profileId));
      setMuted(fresh.settings.muted);
      return {
        save: fresh,
        view: "board",
        activeCase: null,
        session: null,
        result: null,
        toasts: [],
      };
    }),
}));

// ---- helpers (module-scope, not store methods) ----

interface OutcomeReturn {
  xpBreakdown: XpBreakdown;
  recap: RecapData;
  newBadges: BadgeId[];
  rankedUp: boolean;
}

function computeOutcomeAndCommit(
  set: (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void,
  profileId: ProfileId,
  save: ProfileSave,
  activeCase: Case,
  session: CaseSession,
  citedFlavorInAccuse: boolean,
): OutcomeReturn {
  const tier = activeCase.tier;
  const prevRecord = save.cases[activeCase.id];
  const firstTimeClear = !prevRecord?.closed;
  const firstTry = !session.wrongAccusation;
  const hintFree = session.hintsUsed === 0;
  const methodical = allInnocentsCleared(activeCase, session.clearedIds);

  const xp = computeXp({ tier, firstTry, hintFree, methodical, firstTimeClear });

  const xpBefore = save.xp;
  const totalXpAfter = xpBefore + xp.total;

  // rank check
  const rankBefore = rankForXp(xpBefore);
  const rankAfter = rankForXp(totalXpAfter);
  const rankedUp = rankAfter.id !== rankBefore.id;

  // cosmetics: unlock everything for the new rank (cumulative)
  const unlockedNow = unlockedCardStyles(rankAfter.id).map((c) => c.id);
  const newlyUnlocked = unlockedNow.filter((c) => !save.unlockedCards.includes(c));
  const newCard = rankedUp ? (cardStyleForRank(rankAfter.id)?.id ?? null) : null;

  // badges
  const earned = new Set<BadgeId>(save.badges);
  const newBadges: BadgeId[] = [];
  const award = (id: BadgeId) => {
    if (!earned.has(id)) {
      earned.add(id);
      newBadges.push(id);
    }
  };

  // build the post-close cases map first (so completionist check sees this close)
  const newRecord = {
    closed: true,
    bestXp: Math.max(prevRecord?.bestXp ?? 0, xp.total),
    hintFree: (prevRecord?.hintFree ?? false) || hintFree,
    firstTry: (prevRecord?.firstTry ?? false) || firstTry,
  };
  const casesAfter = { ...save.cases, [activeCase.id]: newRecord };

  if (hintFree) award("sharp_eye");
  if (methodical) award("methodical");
  if (activeCase.id === 1) award("first_case");
  if (firstTry) award("clean_hands");
  const elapsed = Date.now() - session.startedAt;
  if (elapsed < quickStudyThresholdMs(tier)) award("quick_study");
  if (
    tier === 3 &&
    !session.citedFlavorInClearOrAccuse &&
    !citedFlavorInAccuse
  ) {
    award("red_herring_hunter");
  }
  // three tiers: closed at least one of each tier (using casesAfter)
  const tiersClosed = new Set<number>();
  for (let id = 1; id <= TOTAL_CASES; id++) {
    if (casesAfter[id]?.closed) {
      tiersClosed.add(id <= 10 ? 1 : id <= 20 ? 2 : 3);
    }
  }
  if (tiersClosed.has(1) && tiersClosed.has(2) && tiersClosed.has(3)) award("three_tiers");
  // completionist
  const allClosed = Array.from({ length: TOTAL_CASES }, (_, i) => i + 1).every(
    (id) => casesAfter[id]?.closed,
  );
  if (allClosed) award("case_files_complete");

  const recap = buildRecap(activeCase, session.clearedIds);

  const newSave: ProfileSave = {
    ...save,
    xp: totalXpAfter,
    cases: casesAfter,
    badges: Array.from(earned),
    unlockedCards: Array.from(new Set([...save.unlockedCards, ...newlyUnlocked])),
    // auto-equip the freshly minted card on rank-up (player can switch later)
    activeCard: newCard ?? save.activeCard,
    // Fix 5: the case is closed — clear the in-progress session so a reload lands on the
    // board (or wherever the player navigates), not back into the just-solved case.
    activeSession: null,
  };
  persist(profileId, newSave);

  // queue toasts: badges first, then rank-up
  const toasts: Toast[] = [];
  for (const b of newBadges) {
    const def = BADGES.find((x) => x.id === b)!;
    toasts.push({ id: newToastId(), kind: "badge", title: def.name, sub: def.description, glyph: def.glyph });
  }
  if (rankedUp) {
    toasts.push({
      id: newToastId(),
      kind: "rank",
      title: rankAfter.name,
      sub: newCard ? `New ID card: ${CARD_STYLES.find((c) => c.id === newCard)?.name}` : "Rank advanced",
      glyph: "BadgeCheck",
    });
  }

  const payload: ResultPayload = {
    caseId: activeCase.id,
    xp,
    recap,
    newBadges,
    rankedUp,
    newRankId: rankedUp ? rankAfter.id : null,
    newCardId: newCard,
    totalXpAfter,
  };

  // NOTE: view stays "case" here. The CASE CLOSED set-piece (CaseView) plays first,
  // then CaseView calls setView("result"). Toasts are deferred until the result screen
  // mounts so they don't pop during the set-piece.
  set({ save: newSave, result: payload, pendingToasts: toasts });

  return {
    xpBreakdown: xp,
    recap,
    newBadges,
    rankedUp,
  };
}

// ---- selectors / derived ----

export function caseIsUnlocked(save: ProfileSave | null, caseId: number): boolean {
  if (caseId === 1) return true;
  if (!save) return false;
  return !!save.cases[caseId - 1]?.closed;
}

export function caseIsClosed(save: ProfileSave | null, caseId: number): boolean {
  return !!save?.cases[caseId]?.closed;
}
