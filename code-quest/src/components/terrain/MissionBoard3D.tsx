// Mission board gate: 3D terrain when WebGL is available, the original flat
// Grid/Rover otherwise (headless tests, old devices, GPU faults, context loss).
// The game is fully playable on either path — same data, same interpreter.
import { Component, Suspense, lazy, useState, type ReactNode } from "react";
import type { Mission, TraceStep } from "../../game/interpreter";
import type { RoverPose } from "../Rover";
import type { CosmeticId } from "../../data/cosmetics";
import { Grid } from "../Grid";
import { webglAvailable } from "./webgl";

// three.js and the scene load only when the WebGL path actually renders.
const TerrainScene = lazy(() => import("./TerrainScene"));

export interface MissionBoard3DProps {
  mission: Mission;
  trace: TraceStep[];
  traceIndex: number;
  collectedKeys: Set<string>;
  activatedKeys: Set<string>;
  pose: RoverPose; // used by the flat fallback only; the 3D rover derives pose from the trace
  cosmetic: CosmeticId;
  running: boolean;
  goalShimmer: boolean;
}

/** Catches any render/runtime error inside the 3D scene and pins the flat fallback. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MissionBoard3D(props: MissionBoard3DProps) {
  const [webgl] = useState(() => webglAvailable());
  const [contextLost, setContextLost] = useState(false);

  const step =
    props.traceIndex >= 0 && props.traceIndex < props.trace.length
      ? props.trace[props.traceIndex]
      : null;

  const flat = (
    <Grid
      mission={props.mission}
      step={step}
      collectedKeys={props.collectedKeys}
      activatedKeys={props.activatedKeys}
      pose={props.pose}
      cosmetic={props.cosmetic}
      running={props.running}
      goalShimmer={props.goalShimmer}
    />
  );

  if (!webgl || contextLost) return flat;

  return (
    <SceneBoundary fallback={flat}>
      <Suspense fallback={flat}>
        <TerrainScene
          key={props.mission.id}
          mission={props.mission}
          trace={props.trace}
          traceIndex={props.traceIndex}
          collectedKeys={props.collectedKeys}
          activatedKeys={props.activatedKeys}
          cosmetic={props.cosmetic}
          running={props.running}
          goalShimmer={props.goalShimmer}
          onContextLost={() => setContextLost(true)}
        />
      </Suspense>
    </SceneBoundary>
  );
}
