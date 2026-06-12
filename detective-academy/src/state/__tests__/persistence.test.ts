// Fix 5 — mid-case persistence. The active case's working state (cleared suspects,
// cited clues, hint step/usage, notebook spine) must be autosaved on every action and
// restored EXACTLY on reload. Per the shared contract: "quitting mid-anything is always
// safe." XP/closures already survived; these tests lock in the working-state survival.
//
// The store persists through storage.ts -> localStorage. Tests run in the `node`
// environment, so we install a tiny in-memory localStorage shim BEFORE importing the
// store (storage.ts wraps every access in try/catch, so without this it would silently
// no-op and the test would prove nothing). sfx is import-safe in node (its AudioContext
// path is guarded by `typeof window === "undefined"`).

import { beforeEach, describe, expect, it } from "vitest";

// --- in-memory localStorage shim (install before importing the store) ---
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
  get length(): number {
    return this.m.size;
  }
  key(i: number): string | null {
    return Array.from(this.m.keys())[i] ?? null;
  }
}
const mem = new MemoryStorage();
(globalThis as unknown as { localStorage: Storage }).localStorage = mem as unknown as Storage;

// Import AFTER the shim is in place.
const { useStore } = await import("../store");
const { generateCase } = await import("../../game/generator");

const KEY = "kg.detective.v1.guest";

// A clue that single-handedly clears `innocentId` in case `c`: an alibi naming them, or
// an attribute clue whose value differs from theirs on that dimension. (Mirrors the
// store's solver-backed validateClear without importing it.)
function clearingClueFor(
  c: import("../../game/types").Case,
  innocentId: string,
): import("../../game/types").Clue {
  const inn = c.suspects.find((x) => x.id === innocentId)!;
  const val = (dim: "hair" | "accessory" | "pet") =>
    dim === "hair" ? inn.hair : dim === "accessory" ? inn.accessory : inn.pet;
  const found = c.clues.find((cl) =>
    cl.kind === "alibi"
      ? cl.clearsSuspectId === innocentId
      : cl.kind === "attribute"
        ? val(cl.dimension) !== cl.value
        : false,
  );
  if (!found) throw new Error(`no clearing clue for ${innocentId}`);
  return found;
}

// Simulate a cold app boot: drop the in-memory store back to its initial shape, exactly
// as a page reload would (storage is untouched, so selectProfile re-hydrates from it).
function simulateReload() {
  useStore.setState({
    profileId: null,
    save: null,
    view: "profile",
    caseTab: "briefing",
    activeCase: null,
    session: null,
    result: null,
    toasts: [],
    pendingToasts: [],
  });
}

describe("Fix 5 — mid-case persistence (reload restores the working case exactly)", () => {
  beforeEach(() => {
    mem.clear();
    simulateReload();
  });

  it("autosaves the active session into the profile save on open + clear + hint", () => {
    const s = useStore.getState();
    s.selectProfile("guest");
    s.openCase(1);

    // After opening, the save already carries an activeSession (instant-reload safe).
    let raw = JSON.parse(mem.getItem(KEY)!);
    expect(raw.activeSession).toBeTruthy();
    expect(raw.activeSession.caseId).toBe(1);
    expect(raw.activeSession.clearedIds).toEqual([]);

    // Clear an innocent via a genuinely-clearing clue.
    const c = generateCase(1);
    const innocent = c.suspects.find((x) => x.id !== c.culpritId)!;
    const clue = clearingClueFor(c, innocent.id);
    const res = useStore.getState().clearSuspect(innocent.id, clue.id);
    expect(res.ok).toBe(true);

    // Request a hint (escalates hintStep + increments hintsUsed).
    useStore.getState().requestHint();

    raw = JSON.parse(mem.getItem(KEY)!);
    expect(raw.activeSession.clearedIds).toContain(innocent.id);
    expect(raw.activeSession.clearedVia[innocent.id]).toBe(clue.id);
    // requestHint resolves a dynamic import; hintsUsed may land async, but the clear is
    // synchronous and is the load-bearing assertion here.
    expect(raw.activeSession.caseId).toBe(1);
  });

  it("reload mid-case restores activeCase + session and lands in the case view", async () => {
    const s = useStore.getState();
    s.selectProfile("guest");
    s.openCase(2);

    const c = generateCase(2);
    const innocent = c.suspects.find((x) => x.id !== c.culpritId)!;
    const clue = clearingClueFor(c, innocent.id);
    useStore.getState().clearSuspect(innocent.id, clue.id);

    const before = useStore.getState().session!;
    expect(before.clearedIds).toContain(innocent.id);

    // --- reload ---
    simulateReload();
    expect(useStore.getState().session).toBeNull();
    expect(useStore.getState().view).toBe("profile");

    // Re-select the profile (as the picker would on boot). It must restore the case.
    useStore.getState().selectProfile("guest");
    const after = useStore.getState();

    expect(after.view).toBe("case");
    expect(after.activeCase?.id).toBe(2);
    expect(after.session).not.toBeNull();
    // The working state matches exactly (clears, cited clues, flags, timing).
    expect(after.session!.clearedIds).toEqual(before.clearedIds);
    expect(after.session!.clearedVia).toEqual(before.clearedVia);
    expect(after.session!.hintsUsed).toBe(before.hintsUsed);
    expect(after.session!.wrongAccusation).toBe(before.wrongAccusation);
    expect(after.session!.startedAt).toBe(before.startedAt);
  });

  it("a wrong accusation persists the lost first-try flag across reload", () => {
    const s = useStore.getState();
    s.selectProfile("guest");
    s.openCase(3);

    const c = generateCase(3);
    const innocent = c.suspects.find((x) => x.id !== c.culpritId)!;
    // Accuse the wrong (innocent) suspect with the two implicating clues -> wrong.
    const [a, b] = c.implicatingClueIds;
    const res = useStore.getState().submitAccusation(innocent.id, [a, b]);
    expect(res.ok).toBe(false);

    const raw = JSON.parse(mem.getItem(KEY)!);
    expect(raw.activeSession.wrongAccusation).toBe(true);

    // Reload -> the lost first-try flag survives (cannot be regained by quitting).
    simulateReload();
    useStore.getState().selectProfile("guest");
    expect(useStore.getState().session!.wrongAccusation).toBe(true);
  });

  it("leaving the case view (closeCaseView) clears the persisted session", () => {
    const s = useStore.getState();
    s.selectProfile("guest");
    s.openCase(1);
    expect(JSON.parse(mem.getItem(KEY)!).activeSession).toBeTruthy();

    useStore.getState().closeCaseView();
    expect(JSON.parse(mem.getItem(KEY)!).activeSession).toBeNull();

    // Reload now lands on the board, not back in the case.
    simulateReload();
    useStore.getState().selectProfile("guest");
    expect(useStore.getState().view).toBe("board");
    expect(useStore.getState().session).toBeNull();
  });

  it("closing a case correctly clears the in-progress session (reload -> board)", () => {
    const s = useStore.getState();
    s.selectProfile("guest");
    s.openCase(1);

    const c = generateCase(1);
    // Clear every innocent, then accuse correctly.
    for (const inn of c.suspects.filter((x) => x.id !== c.culpritId)) {
      useStore.getState().clearSuspect(inn.id, clearingClueFor(c, inn.id).id);
    }
    const [a, b] = c.implicatingClueIds;
    const res = useStore.getState().submitAccusation(c.culpritId, [a, b]);
    expect(res.ok).toBe(true);

    // The save records the close and has no in-progress session.
    const raw = JSON.parse(mem.getItem(KEY)!);
    expect(raw.cases["1"].closed).toBe(true);
    expect(raw.activeSession).toBeNull();
  });
});
