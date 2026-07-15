import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { useStore } from "../state/store";
import { useRunPlayer } from "../state/useRunPlayer";
import { missionById } from "../data/missions";
import { MissionBoard3D } from "../components/terrain/MissionBoard3D";
import { ProgramRail } from "../components/ProgramRail";
import { Palette } from "../components/Palette";
import { Controls } from "../components/Controls";
import { SpeakButton } from "../components/SpeakButton";
import { WinOverlay } from "../components/WinOverlay";
import { PatchMint } from "../components/PatchMint";
import type { RoverPose } from "../components/Rover";
import { collisionCopy, COLLISION_ADVISORY, endCopy, STR } from "../data/copy";
import { sfx } from "../lib/sfx";
import { stopSpeaking } from "../lib/tts";

export function MissionScreen() {
  const activeMissionId = useStore((s) => s.activeMissionId);
  const program = useStore((s) => s.program);
  const selection = useStore((s) => s.selection);
  const runMode = useStore((s) => s.runMode);
  const trace = useStore((s) => s.trace);
  const traceIndex = useStore((s) => s.traceIndex);
  const lastRunResult = useStore((s) => s.lastRunResult);
  const save = useStore((s) => s.save);
  const win = useStore((s) => s.win);
  const winPending = useStore((s) => s.winPending);
  const programGen = useStore((s) => s.programGen);
  const stepHintVisible = useStore((s) => s.stepHintVisible);
  const backToMap = useStore((s) => s.backToMap);
  const markStepHintSeen = useStore((s) => s.markStepHintSeen);
  const commitWinBeat = useStore((s) => s.commitWinBeat);

  // Drive RUN playback (StrictMode-safe).
  useRunPlayer();

  // FIX 3a: win beat — hold ~600ms after the win step before mounting the overlay.
  // Respects prefers-reduced-motion: skip the delay entirely.
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!winPending) return;
    if (prefersReducedMotion) {
      commitWinBeat();
      return;
    }
    const t = setTimeout(commitWinBeat, 600);
    return () => clearTimeout(t);
  }, [winPending, prefersReducedMotion, commitWinBeat]);

  // FIX 3b: track the programGen at which the last run's diagnostics were minted.
  // When programGen advances beyond that snapshot, clear the stale diagnostic.
  const diagnosticGenRef = useRef<number>(-1);
  // FIX 3b: track whether we were already in "done" mode (to snapshot gen only on first entry).
  const runDoneRef = useRef<boolean>(false);

  const mission = activeMissionId != null ? missionById(activeMissionId) : undefined;

  // Stop any speech when leaving the mission.
  useEffect(() => {
    return () => stopSpeaking();
  }, [activeMissionId]);

  // Play collision/win sfx exactly when the visible step crosses that event.
  const lastPlayedRef = useRef<number>(-1);
  const currentStep = traceIndex >= 0 && traceIndex < trace.length ? trace[traceIndex] : null;
  useEffect(() => {
    if (!currentStep) {
      lastPlayedRef.current = -1;
      return;
    }
    if (lastPlayedRef.current === traceIndex) return;
    lastPlayedRef.current = traceIndex;
    if (currentStep.event === "collision") sfx.fail();
    if (currentStep.event === "win") sfx.success();
  }, [currentStep, traceIndex]);

  // Accumulate collected/activated keys up to the visible step.
  const { collectedKeys, activatedKeys } = useMemo(() => {
    const collected = new Set<string>();
    const activated = new Set<string>();
    if (traceIndex >= 0) {
      for (let i = 0; i <= traceIndex && i < trace.length; i++) {
        const s = trace[i];
        const k = `${s.rover.x},${s.rover.y}`;
        if (s.event === "collect") collected.add(k);
        if (s.event === "activate") activated.add(k);
      }
    }
    return { collectedKeys: collected, activatedKeys: activated };
  }, [trace, traceIndex]);

  if (!mission) return null;

  const running = runMode === "running";

  // FIX 3b: snapshot the programGen whenever runMode transitions to "done" for the first time.
  // When programGen later advances past that snapshot, suppress the stale diagnostic+highlight.
  if (runMode === "done" && !runDoneRef.current) {
    runDoneRef.current = true;
    diagnosticGenRef.current = programGen;
  }
  if (runMode !== "done") {
    runDoneRef.current = false;
  }
  const diagnosticStale = runMode === "done" && programGen > diagnosticGenRef.current;

  // FIX 3b: suppress the collision step (red chip highlight) when diagnostic is stale.
  const collisionStep =
    !diagnosticStale && currentStep?.event === "collision" ? currentStep : null;
  const goalShimmer =
    runMode === "done" && !!lastRunResult && !lastRunResult.won && lastRunResult.reachedGoalWithoutWin;

  // Rover pose.
  let pose: RoverPose = "idle";
  if (currentStep?.event === "win") pose = "win";
  else if (currentStep?.event === "collision") pose = "collision";
  else if (running || runMode === "stepping") pose = "moving";

  // Diagnostics line.
  let diagnostic: { tone: "alert" | "ok" | "muted"; main: string; sub?: string } | null = null;
  if (!diagnosticStale && collisionStep) {
    diagnostic = {
      tone: "alert",
      main: collisionCopy(collisionStep.tick, collisionStep.collisionDir!, collisionStep.collisionWall!),
      sub: COLLISION_ADVISORY(collisionStep.tick),
    };
  } else if (!diagnosticStale && runMode === "done" && lastRunResult && !lastRunResult.won) {
    diagnostic = { tone: "muted", main: endCopy(mission, lastRunResult) };
  } else if (currentStep?.noop) {
    diagnostic = { tone: "muted", main: STR.actionNoop };
  }

  // Status line text.
  let statusText = STR.idleStatus;
  let statusClass = "";
  if (running) {
    statusText = STR.runningStatus;
    statusClass = "running";
  } else if (collisionStep) {
    statusText = "COLLISION // SEQUENCE HALTED";
    statusClass = "alert";
  } else if (runMode === "done" && lastRunResult?.won) {
    statusText = "MISSION COMPLETE";
  } else if (runMode === "stepping") {
    statusText = `STEP // TICK ${currentStep?.tick ?? 0}`;
    statusClass = "running";
  }

  const mp = save.missions[mission.id];

  return (
    <div className="screen mission-screen">
      <header className="mission-header panel scanlines">
        <button className="icon-btn back-btn" aria-label="Back to sector map" onClick={() => { sfx.tap(); backToMap(); }}>
          <ChevronLeft size={20} />
        </button>
        <div className="mission-brief-block">
          <div className="brief-row">
            <span className="mission-tag">M{String(mission.id).padStart(2, "0")} // {mission.title.toUpperCase()}</span>
            <SpeakButton text={briefSpoken(mission.brief)} />
          </div>
          <p className="mission-brief">{mission.brief}</p>
        </div>
        <div className="mission-meta">
          <span className="meta-par">PAR {mission.par}</span>
          {mp?.completed && <span className="meta-cleared">CLEARED</span>}
        </div>
      </header>

      <div className="mission-body">
        <div className="zone-grid">
          <MissionBoard3D
            mission={mission}
            trace={trace}
            traceIndex={traceIndex}
            collectedKeys={collectedKeys}
            activatedKeys={activatedKeys}
            pose={pose}
            cosmetic={save.cosmeticSelected}
            running={running}
            goalShimmer={goalShimmer}
          />
          <div className={`statusline status-bar ${statusClass}`} role="status" aria-live="polite">
            <span className="dot" />
            <span>{statusText}</span>
          </div>
          {diagnostic && (
            <div className={`diagnostic diag-${diagnostic.tone}`} role="alert">
              <p className="diag-main">{diagnostic.main}</p>
              {diagnostic.sub && <p className="diag-sub">{diagnostic.sub}</p>}
            </div>
          )}
          {stepHintVisible && (
            <div className="step-hint" role="status">
              <span>{STR.stepHint}</span>
              <button className="btn-ghost btn hint-dismiss" onClick={() => markStepHintSeen(mission.id)}>GOT IT</button>
            </div>
          )}
        </div>

        <div className="zone-rail">
          <ProgramRail
            program={program}
            selection={selection}
            activeStep={running || runMode === "stepping" ? currentStep : null}
            collisionStep={collisionStep}
            running={running || runMode === "stepping"}
          />
          <Controls />
          <Palette mission={mission} disabled={running || runMode === "stepping"} />
        </div>
      </div>

      {/* FIX 3a: tapping during the beat skips it and mounts the overlay immediately */}
      {winPending && !win && (
        <div className="win-beat-tap" onClick={commitWinBeat} aria-hidden="true" />
      )}
      {win && <WinOverlay />}
      <PatchMint />
    </div>
  );
}

// Strip the "TRANSMISSION //" prefix for the spoken brief (the design intends the prose to stand alone).
function briefSpoken(brief: string): string {
  return brief.replace(/^TRANSMISSION\s*\/\/\s*/, "");
}
