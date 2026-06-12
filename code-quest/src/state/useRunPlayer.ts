import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { rover as roverSfx } from "../lib/sfx";
import type { TraceStep } from "../game/interpreter";

const TICK_MS = 333; // 3 ticks/sec (GDD §2.2)

// Beep per op type for a single executed step (GDD §5.1). Mute is handled inside the sfx module.
function beepForStep(step: TraceStep) {
  if (step.event === "collision") {
    return; // collision plays sfx.fail() in the component layer
  }
  if (step.event === "win") {
    roverSfx.win();
    return;
  }
  switch (step.command) {
    case "MOVE":
      roverSfx.move();
      break;
    case "LEFT":
    case "RIGHT":
      roverSfx.turn();
      break;
    case "ACTION":
      if (step.noop) roverSfx.scan();
      else roverSfx.action();
      break;
  }
}

/**
 * Drives RUN playback: advances the visible tick every 333ms while runMode === "running".
 * StrictMode-safe: the interval is owned by a ref, cleared fully on teardown, and we read
 * fresh store state inside the tick (no stale closures). Double-mount in dev cannot
 * double-advance because each mount creates+clears its own single interval, and the tick
 * itself is idempotent against the store's traceIndex.
 */
export function useRunPlayer() {
  const runMode = useStore((s) => s.runMode);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard so the two StrictMode mounts don't both schedule live intervals against the same run.
  const armedRef = useRef(false);

  useEffect(() => {
    if (runMode !== "running") {
      // not playing — ensure no interval lingers
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      armedRef.current = false;
      return;
    }

    // Already armed for this run (e.g. StrictMode second mount) — do nothing extra.
    if (armedRef.current) return;
    armedRef.current = true;

    const tick = () => {
      const st = useStore.getState();
      if (st.runMode !== "running") return;
      const nextIdx = st.traceIndex + 1;
      if (nextIdx >= st.trace.length) {
        // reached the end; advanceTo on the last index already committed results.
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      const step = st.trace[nextIdx];
      beepForStep(step);
      st.advanceTo(nextIdx);
      // If that was the terminal step, finishRun() set runMode to "done"; stop the clock.
      if (nextIdx === st.trace.length - 1) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // First tick fires immediately so RUN feels responsive (<100ms), then on cadence.
    tick();
    intervalRef.current = setInterval(tick, TICK_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      armedRef.current = false;
    };
  }, [runMode]);
}
