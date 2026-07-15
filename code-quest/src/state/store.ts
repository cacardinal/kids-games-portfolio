import { create } from "zustand";
import type { Chip, RunResult, SimpleOp, TraceStep } from "../game/interpreter";
import { run, chipCount, canAppendChip, canAppendToLoop, REPEAT_MAX_TIMES, REPEAT_MIN_TIMES } from "../game/interpreter";
import { evaluateAwards } from "../game/achievements";
import { loadSave, persistSave } from "../lib/storage";
import { setMuted } from "../lib/sfx";
import {
  freshSave,
  SAVE_KEY,
  getMission,
  emptyMissionProgress,
} from "./save";
import type { ProfileId, ProfileSave } from "./save";
import type { BadgeId } from "../data/badges";
import type { CosmeticId } from "../data/cosmetics";
import { missionById } from "../data/missions";

export type View = "profile" | "map" | "mission" | "profileScreen";

// --- chip id minting for user-built programs (distinct from recorded-solution ids) ---
let chipSeq = 0;
function newChip(op: SimpleOp): Chip {
  return { id: `c${chipSeq++}`, op };
}
function newRepeat(): Chip {
  return { id: `c${chipSeq++}`, op: "REPEAT", times: 2, body: [] };
}

// A selection is either a top-level chip index, or a chip inside a REPEAT body.
export interface Selection {
  index: number; // top-level chip index
  bodyIndex: number | null; // index within that chip's REPEAT body, or null for the top-level chip
}

export type RunMode = "idle" | "running" | "stepping" | "done";

// loopLatch: the top-level index of the REPEAT chip currently being targeted for body appends.
// Set when the user selects a REPEAT chip or one of its body chips; cleared on explicit release.
export type LoopLatch = { repeatIndex: number } | null;

interface PatchMint {
  sector: 1 | 2 | 3;
}

interface WinResult {
  missionId: number;
  chips: number;
  efficient: boolean;
  newBadges: BadgeId[];
  newCosmetics: CosmeticId[];
  patch: PatchMint | null;
}

interface StoreState {
  // identity / nav
  profile: ProfileId | null;
  view: View;
  save: ProfileSave;
  activeMissionId: number | null;

  // program editor
  program: Chip[];
  selection: Selection | null;
  loopLatch: LoopLatch; // FIX 1: persists the targeted REPEAT while building a loop body
  // FIX 3b: generation counter — increments on every program edit, used to clear stale diagnostics
  programGen: number;
  // FIX 3a: win is pending (beat delay before overlay mounts)
  winPending: WinResult | null;

  // run / playback
  runMode: RunMode;
  trace: TraceStep[];
  traceIndex: number; // index of the last-executed step shown (-1 = at start, before any tick)
  lastRunResult: RunResult | null;
  collidedThisRun: boolean;

  // ephemeral UI signals
  toast: string | null;
  win: WinResult | null;
  patchMinting: PatchMint | null;
  stepHintVisible: boolean;

  // --- actions ---
  pickProfile: (p: ProfileId) => void;
  goView: (v: View) => void;
  openMission: (id: number) => void;
  backToMap: () => void;

  appendOp: (op: SimpleOp) => void;
  appendRepeat: () => void;
  select: (sel: Selection | null) => void;
  releaseLoopLatch: () => void; // FIX 1: explicit latch release (×/done affordance, empty-rail tap)
  deleteSelected: () => void;
  moveSelected: (dir: -1 | 1) => void;
  setRepeatTimes: (index: number, times: 2 | 3 | 4 | 5) => void;
  addIntoLoop: (op: SimpleOp) => void;

  // run controls
  startRun: () => void;
  stepOnce: () => void;
  stop: () => void;
  setRunMode: (m: RunMode) => void;
  advanceTo: (i: number) => void; // playback driver sets the visible tick
  finishRun: () => void; // called when playback reaches the end (commits win/end)

  // misc
  toggleMute: () => void;
  setToast: (t: string | null) => void;
  dismissWin: () => void;
  commitWinBeat: () => void; // FIX 3a: called after beat delay to mount the overlay
  dismissPatch: () => void;
  selectCosmetic: (c: CosmeticId) => void;
  markStepHintSeen: (missionId: number) => void;
  resetProfile: () => void;
  hydrateActiveProfile: () => void;
}

function persist(profile: ProfileId | null, save: ProfileSave) {
  if (profile) persistSave(SAVE_KEY(profile), save);
}

// Helper: produce a new program with an op appended at top level.
function withAppended(program: Chip[], chip: Chip): Chip[] {
  return [...program, chip];
}

export const useStore = create<StoreState>((set, get) => ({
  profile: null,
  view: "profile",
  save: freshSave(),
  activeMissionId: null,

  program: [],
  selection: null,
  loopLatch: null,
  programGen: 0,
  winPending: null,

  runMode: "idle",
  trace: [],
  traceIndex: -1,
  lastRunResult: null,
  collidedThisRun: false,

  toast: null,
  win: null,
  patchMinting: null,
  stepHintVisible: false,

  pickProfile: (p) => {
    const save = loadSave<ProfileSave>(SAVE_KEY(p), freshSave());
    setMuted(save.muted);
    set({ profile: p, save, view: "map", activeMissionId: null });
  },

  goView: (v) => set({ view: v }),

  openMission: (id) => {
    set({
      activeMissionId: id,
      view: "mission",
      program: [],
      selection: null,
      loopLatch: null,
      programGen: 0,
      winPending: null,
      runMode: "idle",
      trace: [],
      traceIndex: -1,
      lastRunResult: null,
      collidedThisRun: false,
      win: null,
      toast: null,
      stepHintVisible: false,
    });
  },

  backToMap: () => set({ view: "map", activeMissionId: null }),

  appendOp: (op) => {
    // FIX 1: route into the latched loop if one is active.
    const { program, loopLatch, programGen } = get();
    if (loopLatch !== null) {
      const chip = program[loopLatch.repeatIndex];
      if (chip && chip.op === "REPEAT") {
        if (!canAppendToLoop(chip, program)) {
          const msg =
            chip.body.length >= 6
              ? "This loop is full (6 chips max). Tap Done to go back to top-level."
              : "Program full. 20 chips is the limit — delete one to add another.";
          set({ toast: msg });
          return;
        }
        const newBodyChip = newChip(op);
        const next = program.map((c, i) => {
          if (i === loopLatch.repeatIndex && c.op === "REPEAT") {
            return { ...c, body: [...c.body, newBodyChip] };
          }
          return c;
        });
        set({
          program: next,
          programGen: programGen + 1,
          selection: { index: loopLatch.repeatIndex, bodyIndex: (chip.body.length) },
          // loopLatch persists — consecutive taps keep filling the loop
        });
        return;
      }
      // Latched REPEAT no longer exists; fall through to top-level.
    }
    if (!canAppendChip(program)) {
      set({ toast: "Program full. 20 chips is the limit — delete one to add another." });
      return;
    }
    set({ program: withAppended(program, newChip(op)), programGen: programGen + 1, selection: null });
  },

  appendRepeat: () => {
    const { program, programGen } = get();
    if (!canAppendChip(program)) {
      set({ toast: "Program full. 20 chips is the limit — delete one to add another." });
      return;
    }
    const chip = newRepeat();
    const next = withAppended(program, chip);
    const newIndex = next.length - 1;
    // FIX 1: auto-latch onto the newly added REPEAT so subsequent palette taps fill it.
    set({
      program: next,
      programGen: programGen + 1,
      selection: { index: newIndex, bodyIndex: null },
      loopLatch: { repeatIndex: newIndex },
    });
  },

  select: (sel) => {
    // FIX 1: Update the latch whenever selection changes.
    // Selecting a REPEAT chip or a body chip inside it arms the latch.
    // Selecting null (empty-rail tap) or a non-REPEAT top-level chip releases it.
    const { program } = get();
    let loopLatch: LoopLatch = null;
    if (sel !== null) {
      const chip = program[sel.index];
      if (chip && chip.op === "REPEAT") {
        // Either the REPEAT header or one of its body chips
        loopLatch = { repeatIndex: sel.index };
      }
    }
    set({ selection: sel, loopLatch });
  },

  releaseLoopLatch: () => {
    // Explicit release: clear latch AND selection (empty-rail tap, Done button).
    set({ loopLatch: null, selection: null });
  },

  deleteSelected: () => {
    const { program, selection, programGen } = get();
    if (!selection) return;
    const next = program.map((c) => ({ ...c }));
    if (selection.bodyIndex === null) {
      next.splice(selection.index, 1);
      // If the latched REPEAT was deleted, release the latch.
      set({ program: next, programGen: programGen + 1, selection: null, loopLatch: null });
    } else {
      const chip = next[selection.index];
      if (chip.op === "REPEAT") {
        chip.body = chip.body.filter((_, i) => i !== selection.bodyIndex);
      }
      // Stay latched onto the same REPEAT after deleting a body chip.
      set({
        program: next,
        programGen: programGen + 1,
        selection: null,
        loopLatch: { repeatIndex: selection.index },
      });
    }
  },

  moveSelected: (dir) => {
    const { program, selection, programGen } = get();
    if (!selection) return;
    const next = program.map((c) => (c.op === "REPEAT" ? { ...c, body: [...c.body] } : { ...c }));
    if (selection.bodyIndex === null) {
      const j = selection.index + dir;
      if (j < 0 || j >= next.length) return;
      [next[selection.index], next[j]] = [next[j], next[selection.index]];
      // Latch follows the REPEAT if it was the one being moved.
      const movedChip = next[j];
      const newLatch = movedChip && movedChip.op === "REPEAT" ? { repeatIndex: j } : null;
      set({ program: next, programGen: programGen + 1, selection: { index: j, bodyIndex: null }, loopLatch: newLatch });
    } else {
      const chip = next[selection.index];
      if (chip.op !== "REPEAT") return;
      const j = selection.bodyIndex + dir;
      if (j < 0 || j >= chip.body.length) return;
      [chip.body[selection.bodyIndex], chip.body[j]] = [chip.body[j], chip.body[selection.bodyIndex]];
      set({ program: next, programGen: programGen + 1, selection: { index: selection.index, bodyIndex: j } });
    }
  },

  setRepeatTimes: (index, times) => {
    const t = Math.max(REPEAT_MIN_TIMES, Math.min(REPEAT_MAX_TIMES, times)) as 2 | 3 | 4 | 5;
    const { program, programGen } = get();
    const next = program.map((c, i) => {
      if (i === index && c.op === "REPEAT") return { ...c, times: t };
      return c;
    });
    set({ program: next, programGen: programGen + 1 });
  },

  addIntoLoop: (op) => {
    const { program, selection, programGen } = get();
    if (!selection) return;
    const chip = program[selection.index];
    if (!chip || chip.op !== "REPEAT") return;
    if (!canAppendToLoop(chip, program)) {
      const msg =
        chip.body.length >= 6
          ? "This loop is full. A loop holds up to six chips."
          : "Program full. 20 chips is the limit — delete one to add another.";
      set({ toast: msg });
      return;
    }
    const next = program.map((c, i) => {
      if (i === selection.index && c.op === "REPEAT") {
        return { ...c, body: [...c.body, newChip(op)] };
      }
      return c;
    });
    set({
      program: next,
      programGen: programGen + 1,
      selection: { index: selection.index, bodyIndex: (chip.body.length) },
      // latch stays armed
      loopLatch: { repeatIndex: selection.index },
    });
  },

  startRun: () => {
    const { program, activeMissionId } = get();
    const mission = activeMissionId != null ? missionById(activeMissionId) : undefined;
    if (!mission) return;
    if (program.length === 0) {
      set({ toast: "No chips loaded. Add a command, then run." });
      return;
    }
    const result = run(mission, program);
    set({
      runMode: "running",
      trace: result.trace,
      traceIndex: -1,
      lastRunResult: result,
      collidedThisRun: false,
      toast: null,
      win: null,
      winPending: null,
    });
  },

  stepOnce: () => {
    const { program, activeMissionId, trace, traceIndex, runMode, win } = get();
    const mission = activeMissionId != null ? missionById(activeMissionId) : undefined;
    if (!mission) return;
    if (program.length === 0) {
      set({ toast: "No chips loaded. Add a command, then run." });
      return;
    }
    // FIX 2: when done after a COLLISION or program-end (win===null), STEP re-arms from scratch.
    // CRITICAL invariant: a WON run (win!==null) stays locked — STEP cannot wipe the win state.
    if (runMode === "done") {
      if (win !== null) {
        // Won mission is frozen — STEP is a no-op here (user must navigate away).
        return;
      }
      // Collision/end: reset rover+trace and start fresh stepping at tick 1.
      const result = run(mission, program);
      set({
        trace: result.trace,
        lastRunResult: result,
        collidedThisRun: false,
        win: null,
        winPending: null,
        toast: null,
        runMode: "stepping",
        traceIndex: -1,
      });
      get().advanceTo(0);
      return;
    }
    // Compute the trace fresh only when starting from idle (or no trace yet).
    let t = trace;
    let idx = traceIndex;
    if (runMode === "idle" || t.length === 0) {
      const result = run(mission, program);
      t = result.trace;
      idx = -1;
      set({ trace: t, lastRunResult: result, collidedThisRun: false, win: null, winPending: null, toast: null });
    }
    const nextIdx = idx + 1;
    if (nextIdx >= t.length) {
      // Already at the end — commit via advanceTo on the terminal index.
      set({ runMode: "stepping" });
      get().advanceTo(t.length - 1);
      return;
    }
    set({ runMode: "stepping" });
    get().advanceTo(nextIdx);
  },

  stop: () => {
    set({
      runMode: "idle",
      trace: [],
      traceIndex: -1,
      lastRunResult: null,
      collidedThisRun: false,
      toast: null,
      winPending: null,
    });
  },

  setRunMode: (m) => set({ runMode: m }),

  advanceTo: (i) => {
    const { trace } = get();
    if (i < 0 || i >= trace.length) return;
    const step = trace[i];
    let collided = get().collidedThisRun;
    if (step.event === "collision") collided = true;
    set({ traceIndex: i, collidedThisRun: collided });
    // If this is the terminal step of the trace, commit results.
    if (i === trace.length - 1) {
      get().finishRun();
    }
  },

  finishRun: () => {
    const { lastRunResult, program, activeMissionId, save, profile, collidedThisRun } = get();
    if (!lastRunResult || activeMissionId == null) {
      set({ runMode: "done" });
      return;
    }
    const mission = missionById(activeMissionId);
    if (!mission) {
      set({ runMode: "done" });
      return;
    }

    // Build the next save immutably.
    const prev = getMission(save, mission.id);
    const chips = chipCount(program);
    const collidedEver = prev.collided || collidedThisRun;

    if (!lastRunResult.won) {
      // Record collision flag (for Debugger) even on a non-win run.
      const nextMissions = {
        ...save.missions,
        [mission.id]: { ...emptyMissionProgress(), ...prev, collided: collidedEver },
      };
      const nextSave: ProfileSave = { ...save, missions: nextMissions };
      persist(profile, nextSave);
      // Surface the STEP hint after the FIRST collision on this mission (event-timed).
      const showHint =
        collidedThisRun && !save.stepHintSeen.includes(mission.id);
      set({
        save: nextSave,
        runMode: "done",
        stepHintVisible: showHint,
      });
      return;
    }

    // WIN — update mission progress.
    const efficient = chips <= mission.par;
    const bestChips = prev.bestChips == null ? chips : Math.min(prev.bestChips, chips);
    const nextProgress = {
      completed: true,
      efficient: prev.efficient || efficient,
      collided: collidedEver,
      bestChips,
    };
    const wasNewlyComplete = !prev.completed;
    const nextMissions = { ...save.missions, [mission.id]: nextProgress };
    let nextSave: ProfileSave = { ...save, missions: nextMissions };

    // Evaluate awards against the post-win save.
    const { newBadges, newCosmetics } = evaluateAwards(nextSave, mission.id, program);
    if (newBadges.length) nextSave = { ...nextSave, badges: [...nextSave.badges, ...newBadges] };
    if (newCosmetics.length)
      nextSave = { ...nextSave, cosmeticUnlocked: [...nextSave.cosmeticUnlocked, ...newCosmetics] };

    // Did this win newly clear a sector (patch mint set-piece)?
    let patch: PatchMint | null = null;
    if (wasNewlyComplete) {
      const sec = mission.sector;
      const ids = [sec * 4 - 3, sec * 4 - 2, sec * 4 - 1, sec * 4];
      const clearedNow = ids.every((id) => (nextSave.missions[id]?.completed ?? false));
      // Only mint if it just became cleared (i.e., this mission's completion was the last one).
      const wasClearedBefore = ids.every((id) => (save.missions[id]?.completed ?? false));
      if (clearedNow && !wasClearedBefore) patch = { sector: sec };
    }

    persist(profile, nextSave);
    // FIX 3a: stage the win in winPending; the UI's beat timer will call commitWinBeat() after ~600ms.
    set({
      save: nextSave,
      runMode: "done",
      winPending: {
        missionId: mission.id,
        chips,
        efficient,
        newBadges,
        newCosmetics,
        patch,
      },
    });
  },

  commitWinBeat: () => {
    // FIX 3a: promote winPending -> win (mounts the overlay). Only called after the beat delay.
    const { winPending } = get();
    if (winPending) {
      set({ win: winPending, winPending: null });
    }
  },

  toggleMute: () => {
    const { save, profile } = get();
    const muted = !save.muted;
    setMuted(muted);
    const nextSave = { ...save, muted };
    persist(profile, nextSave);
    set({ save: nextSave });
  },

  setToast: (t) => set({ toast: t }),

  dismissWin: () => set({ win: null }),

  dismissPatch: () => set({ patchMinting: null }),

  selectCosmetic: (c) => {
    const { save, profile } = get();
    if (!save.cosmeticUnlocked.includes(c)) return;
    const nextSave = { ...save, cosmeticSelected: c };
    persist(profile, nextSave);
    set({ save: nextSave });
  },

  markStepHintSeen: (missionId) => {
    const { save, profile } = get();
    if (save.stepHintSeen.includes(missionId)) {
      set({ stepHintVisible: false });
      return;
    }
    const nextSave = { ...save, stepHintSeen: [...save.stepHintSeen, missionId] };
    persist(profile, nextSave);
    set({ save: nextSave, stepHintVisible: false });
  },

  resetProfile: () => {
    const { profile } = get();
    if (!profile) return;
    const fresh = freshSave();
    persistSave(SAVE_KEY(profile), fresh);
    setMuted(false);
    set({
      save: fresh,
      view: "map",
      activeMissionId: null,
      program: [],
      selection: null,
      loopLatch: null,
      programGen: 0,
      winPending: null,
      runMode: "idle",
      trace: [],
      traceIndex: -1,
      win: null,
      toast: null,
      patchMinting: null,
    });
  },

  hydrateActiveProfile: () => {
    const { profile, save } = get();
    if (!profile) return;
    set({ save: loadSave<ProfileSave>(SAVE_KEY(profile), save) });
  },
}));

// Selector helper used by the win modal to kick the patch set-piece after the win modal.
export function triggerPatchMint(patch: PatchMint) {
  useStore.setState({ patchMinting: patch });
}
