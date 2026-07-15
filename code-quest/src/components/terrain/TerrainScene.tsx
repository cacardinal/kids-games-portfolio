// The single <Canvas> host for the 3D mission board. Lazy-loaded by MissionBoard3D so
// three.js never loads on the fallback path (or in headless tests).
//
// Owns: camera rig (fixed isometric-ish framing, gentle dolly on win), lights,
// reduced-motion + page-visibility handling, and the aria-label contract. The DOM
// status/diagnostic lines under the board remain the accessible account of the run.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Vector3 } from "three";
import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";
import type { Mission, TraceStep } from "../../game/interpreter";
import type { CosmeticId } from "../../data/cosmetics";
import { parseGridForView } from "../../game/view";
import { deriveKeyframe, cameraPose } from "./terrainMath";
import { Terrain3D } from "./Terrain3D";
import { Rover3D } from "./Rover3D";

export interface TerrainSceneProps {
  mission: Mission;
  trace: TraceStep[];
  traceIndex: number;
  collectedKeys: Set<string>;
  activatedKeys: Set<string>;
  cosmetic: CosmeticId;
  running: boolean;
  goalShimmer: boolean;
  onContextLost: () => void;
}

function usePrefersReducedMotion(): boolean {
  const [prm, setPrm] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setPrm(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return prm;
}

/** Pause the render loop whenever the tab is hidden. */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/** Fixed framing camera; eases ~18% closer while the win beat plays. */
function CameraRig({
  position,
  fov,
  dolly,
  reducedMotion,
}: {
  position: [number, number, number];
  fov: number;
  dolly: boolean;
  reducedMotion: boolean;
}) {
  const ref = useRef<PerspectiveCameraImpl>(null);
  const base = useMemo(() => new Vector3(...position), [position]);
  const target = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const cam = ref.current;
    if (!cam) return;
    target.copy(base);
    if (dolly) target.multiplyScalar(0.82);
    if (reducedMotion) cam.position.copy(dolly ? base : target); // no dolly motion, hold the frame
    else cam.position.lerp(target, 0.035);
    cam.lookAt(0, 0, 0);
  });

  return <PerspectiveCamera ref={ref} makeDefault fov={fov} position={position} near={0.1} far={100} />;
}

export default function TerrainScene({
  mission,
  trace,
  traceIndex,
  collectedKeys,
  activatedKeys,
  cosmetic,
  running,
  goalShimmer,
  onContextLost,
}: TerrainSceneProps) {
  const parsed = useMemo(() => parseGridForView(mission.grid), [mission.grid]);
  const keyframe = useMemo(
    () => deriveKeyframe(parsed.start, mission.startHeading, trace, traceIndex),
    [parsed.start, mission.startHeading, trace, traceIndex],
  );
  const cam = useMemo(() => cameraPose(parsed.width, parsed.height), [parsed.width, parsed.height]);

  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();

  const won = keyframe.event === "win";
  const label = `3D terrain map for mission ${mission.title}. Rover activity is reported in the status line below.`;

  // Board pixel footprint mirrors the flat grid's sizing so the layout doesn't shift.
  const heightPx = Math.max(300, parsed.height * 72 + 150);

  return (
    <div
      className={`grid-viewport panel scanlines${running ? " running" : ""}`}
      role="img"
      aria-label={label}
      data-testid="terrain-3d"
    >
      <div style={{ width: "100%", height: heightPx }}>
        <Canvas
          frameloop={pageVisible ? "always" : "never"}
          dpr={[1, 2]}
          shadows
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute("aria-label", label);
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              onContextLost();
            });
          }}
        >
          <CameraRig position={cam.position} fov={cam.fov} dolly={won} reducedMotion={reducedMotion} />
          <ambientLight intensity={1.0} color="#d7e7f7" />
          <hemisphereLight args={["#587189", "#12202c", 0.9]} />
          <directionalLight
            position={[4, 9, 3]}
            intensity={2.1}
            color="#eef5ff"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-7}
            shadow-camera-right={7}
            shadow-camera-top={7}
            shadow-camera-bottom={-7}
          />
          <Terrain3D
            parsed={parsed}
            collectedKeys={collectedKeys}
            activatedKeys={activatedKeys}
            goalShimmer={goalShimmer}
            winFlare={won}
            reducedMotion={reducedMotion}
          />
          <Rover3D
            keyframe={keyframe}
            frameId={traceIndex}
            width={parsed.width}
            height={parsed.height}
            cosmetic={cosmetic}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>
    </div>
  );
}
