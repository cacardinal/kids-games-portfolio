// The 3D workshop bench — ONE <Canvas> rendering the matter-js world as extruded meshes.
// matter-js stays the only physics truth; this is a synced VIEW. The camera is a fixed off-axis
// perspective rig (physicsToScene.computeCameraRig) whose frustum projects the physics plane
// EXACTLY onto the viewport, so the transparent SVG input overlay above it lines up 1:1 and
// drag/place/snap keep working in the existing 2D world coordinates.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, type DirectionalLight, type Group, type Object3D } from "three";
import type { Level, Placement } from "../../game/types";
import {
  computeCameraRig,
  createSyncRegistry,
  MID_Z,
  BACK_Z,
  WORLD_W,
  WORLD_H,
  type BodyState,
} from "./physicsToScene";
import { materials } from "./materials";
import { PartMesh, TerrainMesh, ActorMesh, GoalVolume } from "./meshes";
import { ImpactBurst } from "./effects";

export interface DustEvent {
  id: number;
  x: number;
  y: number;
  intensity: number;
}

export interface Bench3DProps {
  level: Level;
  placements: Placement[]; // display placements (drag ghost already substituted)
  live: Record<number, { pos: { x: number; y: number }; angle: number }>;
  solved: boolean;
  dust: DustEvent[];
}

// prefers-reduced-motion — decorative effects (dust/sparks/glow pulse) are dropped entirely.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

// Pause the render loop while the tab is hidden (the matter sim's rAF pauses on its own).
function useVisibilityFrameloop(): "always" | "never" {
  const [loop, setLoop] = useState<"always" | "never">(
    () => (typeof document !== "undefined" && document.hidden ? "never" : "always"),
  );
  useEffect(() => {
    const on = () => setLoop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return loop;
}

// Applies the fixed off-axis frustum. The camera is `manual`, so R3F's resize handling never
// recomputes the projection (the container's aspect is locked to 1280:720 by the SVG overlay).
function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    const rig = computeCameraRig();
    camera.position.set(rig.position[0], rig.position[1], rig.position[2]);
    camera.rotation.set(0, 0, 0); // face straight down -z; the OFFSET provides the oblique view
    camera.near = rig.near;
    camera.far = rig.far;
    camera.projectionMatrix.makePerspective(
      rig.frustum.left,
      rig.frustum.right,
      rig.frustum.top,
      rig.frustum.bottom,
      rig.near,
      rig.far,
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }, [camera]);
  return null;
}

// Warm shop key light + soft fill. Small shadow map (1024) for iPad.
function ShopLights() {
  const lightRef = useRef<DirectionalLight>(null);
  const targetRef = useRef<Group>(null);
  useLayoutEffect(() => {
    const light = lightRef.current;
    if (light && targetRef.current) {
      light.target = targetRef.current as unknown as Object3D;
      light.target.updateMatrixWorld();
      // R3F pierced shadow-camera props don't trigger a projection rebuild — without this the
      // shadow camera keeps its tiny default box and smears bogus shadows across the bench.
      light.shadow.camera.updateProjectionMatrix();
    }
  }, []);
  return (
    <>
      <ambientLight color="#ffe9cf" intensity={0.62} />
      <hemisphereLight color="#dfe8ff" groundColor="#3a2c1c" intensity={0.45} />
      <directionalLight
        ref={lightRef}
        color="#ffd9a6"
        intensity={1.9}
        position={[280, 1050, 760]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-900}
        shadow-camera-right={900}
        shadow-camera-top={650}
        shadow-camera-bottom={-650}
        shadow-camera-near={120}
        shadow-camera-far={2600}
        shadow-bias={-0.0004}
      />
      <group ref={targetRef} position={[WORLD_W / 2, WORLD_H / 2, 0]} />
    </>
  );
}

// Bench environment: blueprint back panel + machined-wood bench top receding in depth.
function BenchSurface() {
  const m = materials();
  return (
    <>
      <mesh position={[WORLD_W / 2, WORLD_H / 2, BACK_Z]} receiveShadow>
        <planeGeometry args={[2400, 1500]} />
        <primitive object={m.blueprint} attach="material" />
      </mesh>
      <mesh position={[WORLD_W / 2, -13, BACK_Z + 220]} receiveShadow castShadow>
        <boxGeometry args={[2400, 26, 440]} />
        <primitive object={m.bench} attach="material" />
      </mesh>
    </>
  );
}

// Actor meshes + the physicsToScene sync registry: every rendered frame's body states
// (position + angle from the matter sim) are copied onto the registered mesh groups.
function Actors({ level, live }: { level: Level; live: Bench3DProps["live"] }) {
  const registry = useMemo(() => createSyncRegistry(MID_Z), []);

  useEffect(() => {
    const states: Record<number, BodyState> = {};
    level.actors.forEach((a, i) => {
      const l = live[i];
      states[i] = l ? { x: l.pos.x, y: l.pos.y, angle: l.angle } : { x: a.x, y: a.y, angle: 0 };
    });
    registry.sync(states);
  }, [live, level, registry]);

  return (
    <>
      {level.actors.map((a, i) => (
        <ActorMesh
          key={`a${i}`}
          actor={a}
          onGroupRef={(g) => {
            if (g) registry.register(i, g);
            else registry.unregister(i);
          }}
        />
      ))}
    </>
  );
}

export function Bench3D({ level, placements, live, solved, dust }: Bench3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const frameloop = useVisibilityFrameloop();

  return (
    <Canvas
      aria-label={`Workshop bench, 3D view of mission ${level.id}`}
      role="img"
      dpr={[1, 2]}
      shadows
      frameloop={frameloop}
      camera={{ manual: true }}
      gl={{ antialias: true }}
      style={{ position: "absolute", inset: 0, borderRadius: 10, pointerEvents: "none" }}
    >
      <color attach="background" args={["#0a1f3a"]} />
      <fog attach="fog" args={["#0a1f3a", 2200, 3600]} />
      <CameraRig />
      <ShopLights />
      <BenchSurface />

      {level.terrain.map((t, i) => (
        <TerrainMesh key={`t${i}`} t={t} />
      ))}
      <GoalVolume goal={level.goal} solved={solved} reducedMotion={reducedMotion} />
      {placements.map((p, i) => (
        <PartMesh key={`p${i}-${p.part}`} p={p} />
      ))}
      <Actors level={level} live={live} />

      {/* decorative impact dust/sparks — gone under reduced motion */}
      {!reducedMotion && dust.map((d) => <ImpactBurst key={d.id} x={d.x} y={d.y} intensity={d.intensity} />)}
    </Canvas>
  );
}
