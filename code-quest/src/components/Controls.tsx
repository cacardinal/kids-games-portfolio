import { useEffect, useState } from "react";
import { Play, StepForward, Square } from "lucide-react";
import { useStore } from "../state/store";
import { sfx, rover } from "../lib/sfx";

// RUN (3 ticks/sec), STEP (one tick, the debugger), STOP (reset rover, keep program).
export function Controls() {
  const runMode = useStore((s) => s.runMode);
  const startRun = useStore((s) => s.startRun);
  const stepOnce = useStore((s) => s.stepOnce);
  const stop = useStore((s) => s.stop);
  const program = useStore((s) => s.program);

  const [runPressed, setRunPressed] = useState(false);
  const [stepFlash, setStepFlash] = useState(false);

  const running = runMode === "running";

  useEffect(() => {
    if (!runPressed) return;
    const t = setTimeout(() => setRunPressed(false), 160);
    return () => clearTimeout(t);
  }, [runPressed]);

  useEffect(() => {
    if (!stepFlash) return;
    const t = setTimeout(() => setStepFlash(false), 200);
    return () => clearTimeout(t);
  }, [stepFlash]);

  const onRun = () => {
    setRunPressed(true);
    rover.armed();
    startRun();
  };
  const onStep = () => {
    setStepFlash(true);
    stepOnce();
  };
  const onStop = () => {
    sfx.tapLow();
    stop();
  };

  const hasProgram = program.length > 0;

  return (
    <div className="controls">
      <button
        type="button"
        className={`btn btn-run${runPressed ? " pressed" : ""}`}
        onClick={onRun}
        disabled={running || !hasProgram}
      >
        <Play size={20} fill="currentColor" /> RUN
      </button>
      <button
        type="button"
        className={`btn btn-step${stepFlash ? " flash" : ""}`}
        onClick={onStep}
        disabled={running || !hasProgram}
      >
        <StepForward size={20} /> STEP
      </button>
      <button
        type="button"
        className="btn btn-stop"
        onClick={onStop}
        disabled={runMode === "idle"}
      >
        <Square size={18} fill="currentColor" /> STOP
      </button>
    </div>
  );
}
