import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../state/store";
import { getLevel } from "../data/levels";
import { sfx } from "../lib/sfx";
import { stopSpeaking } from "../lib/tts";
import { SpeakButton } from "../components/SpeakButton";
import { MuteToggle } from "../components/MuteToggle";
import { Star } from "../components/Stars";
import { checkPlacement, remainingBudget, canAfford, evaluateStars } from "../game/placement";
import { PART_COST } from "../game/types";
import type { Placement, PartKind, Actor } from "../game/types";
import { SimRuntime, type RunOutcome, type DustBurst } from "../game/runtime";
import type { SimHandle } from "../game/sim";
import {
  TerrainShape, GoalZone, PartShape, PartHitArea, ActorShape, Ghost, PathTrace, Flag,
} from "./Sheet";
import { isWebGLAvailable } from "../components/bench3d/webgl";
import { Bench3D } from "../components/bench3d/Bench3D";
import { failureLine, successFooter, rejectLabel } from "../data/copy";
import { newlyEarnedBadges, badgeToast } from "../data/cosmetics";

// FIX 1 — a tap that never moves past this many world-units is a SELECT; past it, a DRAG.
const DRAG_SLOP = 6;
// FIX 6/7 — short-lived visual cues live in component state, removed after these durations (ms).
const REJECT_CUE_MS = 900;
const DUST_MS = 520;

// FIX 1 — drag bookkeeping for a placed part being repositioned via Pointer Events.
interface DragState {
  index: number;          // which placement
  origin: Placement;      // where it started (to snap back on invalid drop)
  pointerId: number;      // captured pointer
  startX: number;         // pointer-down world coords (for slop test)
  startY: number;
  ghost: { x: number; y: number }; // live snapped position following the pointer
  moved: boolean;         // has it passed the slop threshold yet?
}

// FIX 6 — a transient "rejected here" cue at the attempted location.
interface RejectCue { id: number; x: number; y: number; label: string }
// FIX 7 — a transient chalk-dust burst.
interface DustParticle { id: number; x: number; y: number; intensity: number }

const TRAY_ORDER: PartKind[] = ["plank", "ramp", "bouncer", "crate", "column"];
const PART_LABEL: Record<PartKind, string> = { plank: "Plank", ramp: "Ramp", bouncer: "Bouncer", crate: "Crate", column: "Column" };

type Phase = "edit" | "running" | "failed" | "success";

interface LiveActor { pos: { x: number; y: number }; angle: number }

export function BuildBench() {
  const levelId = useStore((s) => s.currentLevel)!;
  const level = getLevel(levelId)!;
  const pen = useStore((s) => s.save.pen);
  const go = useStore((s) => s.go);
  const openLevel = useStore((s) => s.openLevel);
  const getRecord = useStore((s) => s.getRecord);
  const bumpTest = useStore((s) => s.bumpTest);
  const bumpRev = useStore((s) => s.bumpRev);
  const recordSolve = useStore((s) => s.recordSolve);
  const saveBuild = useStore((s) => s.saveBuild);

  const rec = getRecord(levelId);

  // Initial placements: empty, unless the ?solve=1 dev flag asks for the known solution. Evaluated at
  // mount; the component is keyed by level (App.tsx) so this re-runs on every level change.
  const [placements, setPlacements] = useState<Placement[]>(() => {
    const solve = new URLSearchParams(window.location.search).get("solve") === "1";
    return solve ? getLevel(levelId)!.knownSolution.map((p) => ({ ...p })) : [];
  });
  const [armed, setArmed] = useState<PartKind | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("edit");
  const [testCount, setTestCount] = useState(rec.tests);
  const [revealStars, setRevealStars] = useState(0); // 0..3 staged reveal
  const [diagnostic, setDiagnostic] = useState<string>("");
  const [footer, setFooter] = useState<string>("");
  const [trace, setTrace] = useState<{ x: number; y: number }[]>([]);
  const [showTrace, setShowTrace] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [badgeToastText, setBadgeToastText] = useState<string>(""); // FIX 6 — commendation toast

  // FIX 1 — drag-to-move a placed part.
  const [drag, setDrag] = useState<DragState | null>(null);
  // FIX 6/7 — transient visual cues.
  const [rejectCues, setRejectCues] = useState<RejectCue[]>([]);
  const [dust, setDust] = useState<DustParticle[]>([]);
  const cueId = useRef(0);

  // Live actor positions during a run (keyed by actor index).
  const [live, setLive] = useState<Record<number, LiveActor>>({});

  const svgRef = useRef<SVGSVGElement>(null);
  const runtimeRef = useRef<SimRuntime | null>(null);
  const solvedStepRef = useRef<number | null>(null);
  const revBumpedFor = useRef<number | null>(null);
  // FIX 2 — the exact placement list captured at TEST time, so RESET restores it precisely.
  const preTestPlacements = useRef<Placement[] | null>(null);
  // Latest placements for synchronous reads inside pointer handlers (avoids stale closures during drag).
  const placementsRef = useRef<Placement[]>([]);
  useEffect(() => { placementsRef.current = placements; }, [placements]);

  // Bump REV once per editing session. The bench is keyed by level (App.tsx) so it remounts per open;
  // the ref guard keeps React StrictMode's dev double-mount from incrementing REV twice.
  useEffect(() => {
    if (revBumpedFor.current !== levelId) {
      revBumpedFor.current = levelId;
      bumpRev(levelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  // Full teardown of any running sim on unmount/navigation (StrictMode-safe).
  useEffect(() => {
    return () => {
      runtimeRef.current?.stop();
      runtimeRef.current = null;
      stopSpeaking();
    };
  }, []);

  const remaining = remainingBudget(level, placements);

  // ---- pointer -> world coordinate mapping (inverse of the viewBox transform) ----
  // `snap` rounds to the 10px grid (placement/drop); raw coords are used for the drag slop test.
  const toWorldRaw = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * 1280, y: ((clientY - r.top) / r.height) * 720 };
  }, []);
  const toWorld = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const p = toWorldRaw(clientX, clientY);
    return { x: Math.round(p.x / 10) * 10, y: Math.round(p.y / 10) * 10 }; // 10px snap
  }, [toWorldRaw]);

  // FIX 6 — flash a transient "rejected here" cue + soft fail sound at the attempted location.
  function flashReject(x: number, y: number, reason: string) {
    const id = ++cueId.current;
    setRejectCues((prev) => [...prev, { id, x, y, label: rejectLabel(reason) }]);
    window.setTimeout(() => setRejectCues((prev) => prev.filter((c) => c.id !== id)), REJECT_CUE_MS);
    sfx.fail();
  }

  // FIX 7 — spawn a chalk-dust burst (auto-removed). Reduced-motion is handled by the CSS animation.
  function spawnDust(b: DustBurst) {
    const id = ++cueId.current;
    setDust((prev) => [...prev.slice(-14), { id, x: b.x, y: b.y, intensity: b.intensity }]);
    window.setTimeout(() => setDust((prev) => prev.filter((d) => d.id !== id)), DUST_MS);
  }

  const ghostPlacement: Placement | null = useMemo(() => {
    if (!armed || !ghost) return null;
    return { part: armed, x: ghost.x, y: ghost.y, angleDeg: 0 };
  }, [armed, ghost]);

  const ghostValid = useMemo(() => {
    if (!ghostPlacement) return false;
    return checkPlacement(level, ghostPlacement, placements).ok;
  }, [ghostPlacement, level, placements]);

  // ---- editor interactions ----
  function armPart(part: PartKind) {
    if (phase !== "edit") return;
    if (!canAfford(level, placements, part)) {
      // FIX 6 — over-budget arming is never silent.
      sfx.fail();
      setToast("Over budget for that part.");
      window.setTimeout(() => setToast(""), 1200);
      return;
    }
    sfx.select();
    setArmed(part);
    setSelected(null);
  }

  function onSheetPointerMove(e: React.PointerEvent) {
    if (!armed) return;
    setGhost(toWorld(e.clientX, e.clientY));
  }

  function onSheetPointerDown(e: React.PointerEvent) {
    if (phase !== "edit") return;
    if (armed) {
      const pos = toWorld(e.clientX, e.clientY);
      const cand: Placement = { part: armed, x: pos.x, y: pos.y, angleDeg: 0 };
      const check = checkPlacement(level, cand, placements);
      if (!check.ok) {
        // FIX 6 — rejected placement: cue at the attempted spot + soft fail sound (never silent). The
        // palette DISARMS so a stray follow-up tap can't drop the part somewhere random (critic's bug).
        flashReject(pos.x, pos.y, check.reason ?? "");
        setArmed(null);
        setGhost(null);
        return;
      }
      sfx.tap();
      setPlacements((prev) => [...prev, cand]);
      setArmed(null);
      setGhost(null);
      setShowTrace(false);
    } else {
      // tapping empty space deselects
      setSelected(null);
    }
  }

  // FIX 1 — pointer-down on a placed part: capture the pointer and ARM a potential drag. Whether this
  // becomes a select (tap) or a move (drag) is decided by the slop threshold in onPartPointerMove.
  function onPartPointerDown(i: number, e: React.PointerEvent) {
    if (phase !== "edit" || armed) return;
    e.stopPropagation();
    const raw = toWorldRaw(e.clientX, e.clientY);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({
      index: i,
      origin: { ...placementsRef.current[i] },
      pointerId: e.pointerId,
      startX: raw.x,
      startY: raw.y,
      ghost: { x: placementsRef.current[i].x, y: placementsRef.current[i].y },
      moved: false,
    });
  }

  function onPartPointerMove(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const raw = toWorldRaw(e.clientX, e.clientY);
    const movedNow = drag.moved || Math.hypot(raw.x - drag.startX, raw.y - drag.startY) > DRAG_SLOP;
    if (!movedNow) return; // still within slop — treat as a (potential) tap, don't move anything
    // Follow the pointer, preserving the grab offset, snapped to the 10px grid (live ghost).
    const snapped = toWorld(e.clientX, e.clientY);
    setDrag({ ...drag, moved: true, ghost: snapped });
  }

  // FIX 1 — pointer-up: tap (never moved) = select only (NO mutation -> no micro-shift); drag = validate
  // the drop. Valid drop commits the new position; invalid drop returns the part to its origin + warn flash.
  function onPartPointerUp(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) {
      // pure tap → select only. Crucially we do NOT rewrite the placement, so it cannot shift.
      sfx.tap();
      setSelected(d.index);
      return;
    }
    // a real move: validate the dropped position against everything EXCEPT the part being moved.
    const others = placementsRef.current.filter((_, j) => j !== d.index);
    const cand: Placement = { ...d.origin, x: d.ghost.x, y: d.ghost.y };
    const check = checkPlacement(level, cand, others);
    if (!check.ok) {
      // invalid drop → snap back to origin + warn flash at the attempted spot.
      flashReject(d.ghost.x, d.ghost.y, check.reason ?? "");
      setPlacements((prev) => prev.map((p, j) => (j === d.index ? { ...d.origin } : p)));
      setSelected(d.index);
      return;
    }
    sfx.tap();
    setPlacements((prev) => prev.map((p, j) => (j === d.index ? cand : p)));
    setSelected(d.index);
    setShowTrace(false);
  }

  function rotateSelected(delta: number) {
    if (selected === null) return;
    sfx.tap();
    setPlacements((prev) => prev.map((p, i) => (i === selected ? { ...p, angleDeg: p.angleDeg + delta } : p)));
  }

  function deleteSelected() {
    if (selected === null) return;
    sfx.tap();
    setPlacements((prev) => prev.filter((_, i) => i !== selected));
    setSelected(null);
  }

  // ---- TEST / RESET ----
  function runTest() {
    if (phase === "running") return;
    setArmed(null);
    setGhost(null);
    setSelected(null);
    setShowTrace(false);
    setDust([]);
    setRejectCues([]);
    setPhase("running");
    sfx.select();
    const n = testCount + 1;
    setTestCount(n);
    bumpTest(levelId);

    // FIX 2 — snapshot the EXACT placement list under test so RESET restores it precisely. Frozen copies
    // so later edits can never mutate the snapshot.
    preTestPlacements.current = placements.map((p) => ({ ...p }));

    runtimeRef.current?.stop();
    const rt = new SimRuntime(level, placements, {
      onFrame: (sim: SimHandle) => {
        const next: Record<number, LiveActor> = {};
        for (const b of sim.bodies) {
          const idx = (b as unknown as { actorIndex?: number }).actorIndex;
          if (idx !== undefined) next[idx] = { pos: { x: b.position.x, y: b.position.y }, angle: b.angle };
        }
        setLive(next);
      },
      onImpact: (kind) => {
        if (kind === "bouncer") sfx.boing();
        else sfx.knock();
      },
      onDust: (burst) => spawnDust(burst), // FIX 7
      onEnd: (outcome: RunOutcome, t) => {
        setTrace(t);
        if (outcome.kind === "success") {
          solvedStepRef.current = outcome.step;
          onSuccess(n);
        } else {
          onFail(outcome, n);
        }
      },
    });
    runtimeRef.current = rt;
    rt.start();
  }

  // FIX 4 — tap anywhere on the running sheet to skip straight to the outcome (runs remaining steps
  // synchronously). Clean wins resolve fast already, so this only matters for slow creeps.
  function skipRun() {
    if (phase !== "running") return;
    runtimeRef.current?.skip();
  }

  function onSuccess(testN: number) {
    setPhase("success");
    sfx.success();
    const stars = evaluateStars(level, placements, true);
    // Capture the save BEFORE recording the solve so we can detect newly-earned badges (FIX 6).
    const before = useStore.getState().save;
    recordSolve(levelId, stars.count, placements.length, placements.reduce((s, p) => s + PART_COST[p.part], 0));
    setFooter(successFooter(testN));
    // stamp sound shortly after, then staged star reveal
    window.setTimeout(() => sfx.stamp(), 140);
    [1, 2, 3].forEach((k) => {
      window.setTimeout(() => {
        setRevealStars(k);
        sfx.collect();
      }, 520 + (k - 1) * 160);
    });
    // FIX 6 — commendation toast at the moment a badge is earned (bumpTest already ran this test, so the
    // Test Pilot threshold is reflected). Surface the first newly-earned badge after the stars settle.
    const earned = newlyEarnedBadges(before, useStore.getState().save);
    if (earned.length > 0) {
      window.setTimeout(() => {
        setBadgeToastText(badgeToast(earned[0]));
        sfx.collect();
        window.setTimeout(() => setBadgeToastText(""), 2600);
      }, 1100);
    }
  }

  function onFail(outcome: RunOutcome, testN: number) {
    setPhase("failed");
    sfx.fail();
    const reason = outcome.kind === "fail" ? outcome.reason : "timeout";
    const mode: "oob" | "short" | "settled" =
      reason === "out-of-bounds" ? "oob" : reason === "settled" ? "settled" : "short";
    setDiagnostic(failureLine(level.series, mode, testN));
    setShowTrace(true);
  }

  function reset() {
    runtimeRef.current?.stop();
    runtimeRef.current = null;
    // FIX 2 — restore the EXACT pre-test placement list if a test was run; otherwise clear the sheet.
    // (Either way the placement list becomes a known-good state, so no stray/duplicate parts can linger.)
    if (preTestPlacements.current) {
      setPlacements(preTestPlacements.current.map((p) => ({ ...p })));
      setToast("Build restored.");
    } else {
      setPlacements([]);
      setToast("Sheet cleared.");
    }
    setArmed(null);
    setGhost(null);
    setSelected(null);
    setDrag(null);
    setDust([]);
    setRejectCues([]);
    setPhase("edit");
    setLive({});
    setRevealStars(0);
    setShowTrace(false);
    window.setTimeout(() => setToast(""), 1500);
    sfx.tap();
  }

  function retest() {
    setPhase("edit");
    setLive({});
    runTest();
  }

  function editAfterFail() {
    runtimeRef.current?.stop();
    runtimeRef.current = null;
    setPhase("edit");
    setLive({});
  }

  // FIX 6 — NEXT advances to the next mission (was: back to the bench). Final level falls back to the bench.
  function goNext() {
    runtimeRef.current?.stop();
    runtimeRef.current = null;
    sfx.tap();
    const next = getLevel(levelId + 1);
    if (next) openLevel(next.id);
    else go("missions");
  }

  // Saved-build / stars after success
  const solvedStars = phase === "success" ? evaluateStars(level, placements, true) : null;

  const editing = phase === "edit";
  const running = phase === "running";

  // Render actors: during a run use live positions, else spawn positions.
  function actorPos(a: Actor, idx: number): { pos: { x: number; y: number }; angle: number } {
    if (running || phase === "failed" || phase === "success") {
      const l = live[idx];
      if (l) return l;
    }
    return { pos: { x: a.x, y: a.y }, angle: 0 };
  }

  const goalSolved = phase === "success";

  // 3D bench view (matter-js stays the only physics truth — this is a synced view). When WebGL
  // is unavailable the original flat SVG rendering below is used unchanged.
  const use3d = useMemo(() => isWebGLAvailable(), []);

  // Placements as DISPLAYED: the part being dragged renders at its live ghost position. Shared
  // by the 3D meshes and the SVG layer so both follow the drag identically.
  const displayPlacements: Placement[] = placements.map((p, i) =>
    drag?.index === i && drag.moved ? { ...p, x: drag.ghost.x, y: drag.ghost.y } : p,
  );

  return (
    <div className="col" style={{ minHeight: "100%", maxWidth: 1240, margin: "0 auto", width: "100%", padding: "14px 18px 28px" }}>
      {/* Top bar */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div className="row gap-12">
          <button className="btn no-select" aria-label="Back to bench" onClick={() => { sfx.tap(); go("missions"); }}>
            <ArrowLeft size={18} style={{ marginRight: 8, verticalAlign: "-3px" }} />Bench
          </button>
          <TitleBlock id={level.id} rev={rec.rev} test={testCount} />
        </div>
        <div className="row gap-12">
          <BudgetMeter remaining={remaining} budget={level.budget} />
          <MuteToggle />
        </div>
      </div>

      <div className="row" style={{ gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Parts tray */}
        <aside className="panel col no-select" style={{ width: 168, padding: 12, gap: 8 }}>
          <div className="label">Parts</div>
          {TRAY_ORDER.filter((part) => level.allowedParts.includes(part)).map((part) => {
            const afford = canAfford(level, placements, part);
            return (
              <button
                key={part}
                className={`tray-card no-select${afford ? "" : " unaffordable"}`}
                aria-label={`${PART_LABEL[part]}, cost ${PART_COST[part]}${afford ? "" : ", over budget"}`}
                disabled={!editing}
                aria-pressed={armed === part}
                onClick={() => armPart(part)}
                style={{
                  border: armed === part ? "2px solid var(--cyan)" : "1px solid rgba(255,255,255,0.14)",
                  background: armed === part ? "rgba(76,201,240,0.12)" : "var(--panel-2)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: editing && afford ? "pointer" : "not-allowed",
                  opacity: afford ? 1 : 0.4,
                  textAlign: "left",
                  color: "var(--chalk)",
                  transition: "transform 120ms ease",
                }}
              >
                <div className="mono" style={{ fontSize: 15, fontWeight: 500 }}>{PART_LABEL[part]}</div>
                <div className="label" style={{ letterSpacing: "0.1em" }}>· {PART_COST[part]}</div>
              </button>
            );
          })}
          {!editing && <div className="label" style={{ marginTop: 4, color: "var(--chalk-dim)" }}>Testing locked</div>}
        </aside>

        {/* The drawing sheet */}
        <div className="grow" style={{ minWidth: 320, position: "relative" }}>
          <div className={`sheet-wrap${running ? " engaged" : ""}`} style={{ position: "relative" }}>
            {/* 3D workshop view — sits UNDER the SVG, which becomes a transparent input/overlay layer */}
            {use3d && (
              <Bench3D
                level={level}
                placements={displayPlacements}
                live={live}
                solved={goalSolved}
                dust={dust}
              />
            )}
            <svg
              ref={svgRef}
              viewBox="0 0 1280 720"
              className="sheet no-select"
              style={{ width: "100%", height: "auto", display: "block", touchAction: "none", borderRadius: 10, cursor: running ? "pointer" : undefined, position: "relative", zIndex: 1, background: use3d ? "transparent" : undefined }}
              onPointerMove={(e) => { onSheetPointerMove(e); onPartPointerMove(e); }}
              onPointerDown={(e) => { if (running) { skipRun(); return; } onSheetPointerDown(e); }}
              onPointerUp={onPartPointerUp}
              onPointerLeave={() => { if (!drag) setGhost(null); }}
            >
              {/* sheet border + corner registration marks */}
              <rect x={4} y={4} width={1272} height={712} rx={8} fill="none" stroke="rgba(232,241,255,0.18)" strokeWidth={1.5} />
              <DimensionArrow level={level} />

              {/* terrain is drawn by the 3D bench in 3D mode; the flat shapes remain the fallback */}
              {!use3d && level.terrain.map((t, i) => <TerrainShape key={`t${i}`} t={t} />)}
              <GoalZone goal={level.goal} solved={goalSolved} />

              {/* failure path trace (faint, one edit cycle) */}
              {showTrace && <PathTrace points={trace} pen={pen} />}

              {/* placed parts — draggable (FIX 1). The part being dragged renders at its live ghost.
                  In 3D mode the visible mesh is drawn by the bench underneath; the SVG keeps an
                  INVISIBLE hit area (plus the selection halo) at the same 2D world coords, so
                  drag/select/snap behave exactly as before. */}
              {displayPlacements.map((shown, i) => {
                const isDragging = drag?.index === i && drag.moved;
                return (
                  <g
                    key={`p${i}`}
                    onPointerDown={(e) => onPartPointerDown(i, e)}
                    onPointerMove={onPartPointerMove}
                    onPointerUp={onPartPointerUp}
                    style={{ cursor: editing && !armed ? (isDragging ? "grabbing" : "grab") : "default", opacity: isDragging ? 0.85 : 1 }}
                  >
                    {use3d
                      ? <PartHitArea p={shown} selected={selected === i || isDragging} />
                      : <PartShape p={shown} pen={pen} selected={selected === i || isDragging} />}
                  </g>
                );
              })}

              {/* actors (3D mode renders them as meshes synced to the matter bodies) */}
              {!use3d && level.actors.map((a, i) => {
                const { pos, angle } = actorPos(a, i);
                return <ActorShape key={`a${i}`} actor={a} pos={pos} angle={angle} hero={a.hero} />;
              })}

              {/* ghost (arming a new part) */}
              {ghostPlacement && <Ghost p={ghostPlacement} valid={ghostValid} />}

              {/* FIX 7 — impact chalk-dust bursts (3D mode renders these as dust/sparks in-scene) */}
              {!use3d && dust.map((d) => <DustBurstShape key={d.id} x={d.x} y={d.y} intensity={d.intensity} />)}

              {/* FIX 6 — transient "rejected here" cues at the attempted location */}
              {rejectCues.map((c) => <RejectCueShape key={c.id} x={c.x} y={c.y} label={c.label} />)}

              {/* flag on success */}
              {phase === "success" && (
                <Flag x={level.goal.x + level.goal.w / 2} y={level.goal.y + level.goal.h} pen={pen} raised />
              )}

              {/* floating chips for the selected part (hidden while actively dragging) */}
              {selected !== null && editing && !(drag?.moved) && (
                <ChipCluster
                  p={placements[selected]}
                  onRotL={() => rotateSelected(-15)}
                  onRotR={() => rotateSelected(15)}
                  onDelete={deleteSelected}
                />
              )}
            </svg>

            {/* APPROVED stamp overlay */}
            {phase === "success" && <ApprovedStamp id={level.id} rev={rec.rev} />}

            {/* TEST counter stamp + tap-to-skip hint (FIX 4) */}
            {running && <div className="test-stamp mono">TEST #{testCount} · RUNNING</div>}
            {running && <div className="skip-hint mono no-select" onPointerDown={(e) => { e.stopPropagation(); skipRun(); }}>TAP TO SKIP</div>}

            {/* FIX 6 — commendation toast at the moment of earning */}
            {badgeToastText && <div className="badge-toast mono no-select">{badgeToastText}</div>}
          </div>

          {/* Controls row under the sheet */}
          <div className="row" style={{ gap: 12, marginTop: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
            <div className="row gap-12">
              {editing && (
                <>
                  <button className="btn btn-primary no-select" style={{ minWidth: 120 }} onClick={runTest} aria-label="Test the build">
                    TEST
                  </button>
                  <button className="btn no-select" onClick={reset} aria-label="Reset the build">RESET</button>
                </>
              )}
              {phase === "failed" && (
                <>
                  <button className="btn btn-primary no-select" onClick={retest} aria-label="Run the test again">RETEST</button>
                  <button className="btn no-select" onClick={editAfterFail} aria-label="Edit the build">EDIT</button>
                </>
              )}
              {phase === "success" && (
                <>
                  <button className="btn btn-primary no-select" onClick={goNext} aria-label="Next mission">NEXT</button>
                  <button className="btn no-select" onClick={() => { saveBuild(levelId, placements); setToast("Build saved to My Inventions."); window.setTimeout(() => setToast(""), 1500); sfx.tap(); }} aria-label="Save this build">SAVE BUILD</button>
                  <button className="btn no-select" onClick={editAfterFail} aria-label="Rebuild">REBUILD</button>
                </>
              )}
            </div>
            {toast && <div className="toast mono">{toast}</div>}
          </div>
        </div>

        {/* Briefing / status column */}
        <aside className="panel col" style={{ width: 268, padding: 16, gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="label">Brief · Mission {String(level.id).padStart(2, "0")}</span>
            <SpeakButton text={level.briefing} />
          </div>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>{level.briefing}</p>

          <div className="hr" style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />

          {phase === "failed" && (
            <div className="col gap-8">
              <span className="label" style={{ color: "var(--warn)" }}>TEST #{testCount} · LOGGED</span>
              <p style={{ margin: 0, fontSize: 15, color: "var(--chalk)" }}>{diagnostic}</p>
              <span className="label" style={{ color: "var(--chalk-dim)" }}>The dotted line is where it went.</span>
            </div>
          )}

          {phase === "success" && solvedStars && (
            <div className="col gap-8">
              <span className="label" style={{ color: "var(--success)" }}>Approved</span>
              <StarRow stars={solvedStars} level={level} reveal={revealStars} placements={placements} />
              <p style={{ margin: 0, fontSize: 15, color: "var(--chalk-dim)" }}>{footer}</p>
            </div>
          )}

          {editing && (
            <div className="col gap-8">
              <span className="label">Targets</span>
              <div className="mono" style={{ fontSize: 14, color: "var(--chalk-dim)" }}>≤ {level.par.parts} parts</div>
              <div className="mono" style={{ fontSize: 14, color: "var(--chalk-dim)" }}>≤ {level.par.cost} cost</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---------- small in-file UI atoms ----------

function TitleBlock({ id, rev, test }: { id: number; rev: number; test: number }) {
  return (
    <span className="title-block">
      <span className="tb-row">
        <span className="tb-cell"><span className="tb-k">Mission</span><div className="tb-v">{String(id).padStart(2, "0")}</div></span>
        <span className="tb-cell"><span className="tb-k">Rev</span><div className="tb-v">{rev}</div></span>
        <span className="tb-cell"><span className="tb-k">Scale</span><div className="tb-v">1:1</div></span>
        <span className="tb-cell"><span className="tb-k">Test</span><div className="tb-v">#{test}</div></span>
      </span>
    </span>
  );
}

function BudgetMeter({ remaining, budget }: { remaining: number; budget: number }) {
  const pct = Math.max(0, Math.min(1, remaining / budget));
  const low = remaining <= budget * 0.2;
  return (
    <div className="col" style={{ minWidth: 180, gap: 4 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="label">Budget</span>
        <span className="mono" style={{ fontSize: 15, color: low ? "var(--warn)" : "var(--chalk)" }}>{remaining} / {budget}</span>
      </div>
      <div style={{ height: 8, borderRadius: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: low ? "var(--warn)" : "var(--cyan)", transition: "width 180ms ease" }} />
      </div>
    </div>
  );
}

function DimensionArrow({ level }: { level: { goal: { x: number; y: number; w: number; h: number }; actors: Actor[] } }) {
  // A subtle dimension arrow spanning from the hero spawn toward the goal (early-reader affordance).
  const hero = level.actors.find((a) => a.hero);
  if (!hero) return null;
  const y = Math.min(hero.y, level.goal.y) - 30;
  const x1 = hero.x;
  const x2 = level.goal.x + level.goal.w / 2;
  const yy = Math.max(40, y);
  return (
    <g opacity={0.28} style={{ pointerEvents: "none" }}>
      <line x1={x1} y1={yy} x2={x2} y2={yy} stroke="var(--cyan)" strokeWidth={1} strokeDasharray="2 4" />
      <path d={`M${x1},${yy} l8,-4 v8 z`} fill="var(--cyan)" />
      <path d={`M${x2},${yy} l-8,-4 v8 z`} fill="var(--cyan)" />
    </g>
  );
}

function ChipCluster({ p, onRotL, onRotR, onDelete }: { p: Placement; onRotL: () => void; onRotR: () => void; onDelete: () => void }) {
  // SVG-space floating chips above the selected part.
  const cy = p.y - 70;
  const chips: { dx: number; label: string; aria: string; on: () => void; icon: "L" | "R" | "X" }[] = [
    { dx: -56, label: "−15°", aria: "Rotate left 15 degrees", on: onRotL, icon: "L" },
    { dx: 0, label: "+15°", aria: "Rotate right 15 degrees", on: onRotR, icon: "R" },
    { dx: 56, label: "del", aria: "Delete part", on: onDelete, icon: "X" },
  ];
  return (
    <g>
      {chips.map((c) => (
        <g key={c.icon} transform={`translate(${p.x + c.dx} ${cy})`} style={{ cursor: "pointer" }}
           onPointerDown={(e) => { e.stopPropagation(); c.on(); }}>
          <title>{c.aria}</title>
          <circle r={22} fill="var(--panel-2)" stroke={c.icon === "X" ? "var(--warn)" : "var(--cyan)"} strokeWidth={1.5} />
          <text textAnchor="middle" dy={5} fontFamily="var(--mono)" fontSize={13} fill={c.icon === "X" ? "var(--warn)" : "var(--cyan)"}>{c.label}</text>
        </g>
      ))}
    </g>
  );
}

// FIX 7 — a brief chalk-dust burst at a contact point: a few small chalk specks that fade + drift.
// CSS-animated (see styles.css .dust*); reduced-motion shrinks it to a single static fade.
function DustBurstShape({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const n = 5;
  const r = 5 + intensity * 7;
  return (
    <g className="dust" transform={`translate(${x} ${y})`} style={{ pointerEvents: "none" }} aria-hidden>
      {Array.from({ length: n }).map((_, i) => {
        const ang = (i / n) * Math.PI * 2 + (i % 2 ? 0.4 : 0);
        const dx = Math.cos(ang) * r;
        const dy = Math.sin(ang) * r - 4;
        return <circle key={i} className="dust-speck" cx={dx} cy={dy} r={1.6 + (i % 2) * 0.8} fill="rgba(232,241,255,0.8)" />;
      })}
    </g>
  );
}

// FIX 6 — a transient "rejected here" marker at the attempted location: an amber dashed box + a short
// calm label. Fades out (see styles.css .reject-cue).
function RejectCueShape({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className="reject-cue" transform={`translate(${x} ${y})`} style={{ pointerEvents: "none" }} aria-hidden>
      <rect x={-26} y={-22} width={52} height={44} rx={6} fill="none" stroke="var(--warn)" strokeWidth={2} strokeDasharray="5 4" />
      <line x1={-12} y1={-8} x2={12} y2={8} stroke="var(--warn)" strokeWidth={2} />
      <line x1={12} y1={-8} x2={-12} y2={8} stroke="var(--warn)" strokeWidth={2} />
      <text textAnchor="middle" y={38} fontFamily="var(--mono)" fontSize={13} fill="var(--warn)" letterSpacing="0.5">{label}</text>
    </g>
  );
}

function ApprovedStamp({ id, rev }: { id: number; rev: number }) {
  return (
    <div className="approved-stamp" aria-hidden>
      <div className="approved-inner mono">
        <div className="approved-word">APPROVED</div>
        <div className="approved-sub">MISSION {String(id).padStart(2, "0")} · REV {rev}</div>
      </div>
    </div>
  );
}

function StarRow({ stars, level, reveal, placements }: { stars: ReturnType<typeof evaluateStars>; level: { par: { parts: number; cost: number } }; reveal: number; placements: Placement[] }) {
  const cost = placements.reduce((s, p) => s + PART_COST[p.part], 0);
  const items = [
    { earned: stars.solved, caption: "SOLVED" },
    { earned: stars.underParParts, caption: stars.underParParts ? `≤ ${level.par.parts} PARTS` : `used ${placements.length} parts` },
    { earned: stars.underParCost, caption: stars.underParCost ? `≤ ${level.par.cost} COST` : `cost ${cost}` },
  ];
  return (
    <div className="col gap-8">
      {items.map((it, i) => (
        <div key={i} className="row gap-8" style={{ opacity: reveal > i ? 1 : 0.25, transition: "opacity 200ms ease" }}>
          <Star filled={reveal > i && it.earned} size={18} />
          <span className="mono" style={{ fontSize: 13, color: it.earned ? "var(--success)" : "var(--chalk-dim)" }}>{it.caption}</span>
        </div>
      ))}
    </div>
  );
}
