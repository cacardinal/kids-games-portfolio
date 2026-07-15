// Mesh factories for the 3D bench: placed parts, terrain, actors, and the goal volume.
// Geometry comes from physicsToScene's pure specs so the meshes mirror the matter-js
// footprints exactly; materials come from the workshop register.
import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  SphereGeometry,
  ExtrudeGeometry,
  Shape,
  BufferGeometry,
  MeshStandardMaterial,
  Color,
  type Group,
  type Mesh,
} from "three";
import type { Placement, TerrainBlock, Actor, GoalRect, PartKind } from "../../game/types";
import {
  partGeometrySpec,
  terrainGeometrySpec,
  placementToTransform,
  terrainToTransform,
  bodyToTransform,
  goalBoxSpec,
  PART_DEPTH,
  TERRAIN_DEPTH,
  MID_Z,
  type GeometrySpec,
  type Transform,
} from "./physicsToScene";
import { materials } from "./materials";

// ---- shared geometry cache (parts repeat across placements) -------------------
const geomCache = new Map<string, BufferGeometry>();

function specGeometry(key: string, spec: GeometrySpec): BufferGeometry {
  const hit = geomCache.get(key);
  if (hit) return hit;
  let g: BufferGeometry;
  if (spec.type === "box") {
    g = new BoxGeometry(spec.w, spec.h, spec.depth);
  } else if (spec.type === "sphere") {
    g = new SphereGeometry(spec.r, 28, 20);
  } else {
    const shape = new Shape();
    shape.moveTo(spec.points[0].x, spec.points[0].y);
    for (let i = 1; i < spec.points.length; i++) shape.lineTo(spec.points[i].x, spec.points[i].y);
    shape.closePath();
    g = new ExtrudeGeometry(shape, { depth: spec.depth, bevelEnabled: false });
    g.translate(0, 0, -spec.depth); // extrude backward: front face on the physics plane z=0
  }
  geomCache.set(key, g);
  return g;
}

function groupProps(t: Transform) {
  return { position: t.position, rotation: t.rotation } as const;
}

// ---- placed parts --------------------------------------------------------------
export function PartMesh({ p }: { p: Placement }) {
  const t = placementToTransform(p);
  const m = materials();
  const spec = partGeometrySpec(p.part);

  if (p.part === "bouncer") {
    // brushed-metal chassis + rubber pad on top (footprint stays the sim's 80×16)
    const chassis = specGeometry("bouncer-chassis", { type: "box", w: 80, h: 10, depth: PART_DEPTH });
    const pad = specGeometry("bouncer-pad", { type: "box", w: 80, h: 6, depth: PART_DEPTH });
    return (
      <group {...groupProps(t)}>
        <mesh geometry={chassis} material={m.metal} position={[0, -3, -PART_DEPTH / 2]} castShadow receiveShadow />
        <mesh geometry={pad} material={m.bouncerRubber} position={[0, 5, -PART_DEPTH / 2]} castShadow receiveShadow />
      </group>
    );
  }

  const geom = specGeometry(`part-${p.part}`, spec);
  const mat: Record<PartKind, MeshStandardMaterial> = {
    plank: m.plankWood,
    ramp: m.rampWood,
    crate: m.crateWood,
    column: m.metal,
    bouncer: m.metal, // unreachable (handled above)
  };
  // wedges already sit flush at z=0; boxes need centering into the lane
  const z = spec.type === "wedge" ? 0 : spec.type === "box" && p.part === "crate" ? MID_Z : -PART_DEPTH / 2;
  return (
    <group {...groupProps(t)}>
      <mesh geometry={geom} material={mat[p.part]} position={[0, 0, z]} castShadow receiveShadow />
    </group>
  );
}

// ---- terrain --------------------------------------------------------------------
export function TerrainMesh({ t }: { t: TerrainBlock }) {
  const tr = terrainToTransform(t);
  const geom = specGeometry(`terrain-${t.w}x${t.h}`, terrainGeometrySpec(t));
  return (
    <group {...groupProps(tr)}>
      <mesh geometry={geom} material={materials().terrain} position={[0, 0, -TERRAIN_DEPTH / 2]} castShadow receiveShadow />
    </group>
  );
}

// ---- actors (synced to the matter bodies each frame via the registry) ------------
export interface LiveBodyState { x: number; y: number; angle: number }

export function ActorMesh({
  actor,
  onGroupRef,
}: {
  actor: Actor;
  onGroupRef: (g: Group | null) => void;
}) {
  const m = materials();
  const spawn = bodyToTransform({ x: actor.x, y: actor.y, angle: 0 });
  const isBall = actor.kind === "ball";
  const geom = isBall
    ? specGeometry("actor-ball", { type: "sphere", r: 18 })
    : specGeometry("actor-crate", { type: "box", w: 40, h: 40, depth: 40 });
  const mat = actor.hero ? (isBall ? m.heroRubber : m.crateWood) : isBall ? m.plainActor : m.crateWood;
  const markerGeom = specGeometry("actor-marker", { type: "sphere", r: 4 });
  const pipGeom = specGeometry("actor-pip", { type: "sphere", r: 3.5 });
  const pipMat = useMemo(
    () => new MeshStandardMaterial({ color: new Color("#4cc9f0"), emissive: new Color("#4cc9f0"), emissiveIntensity: 1.4 }),
    [],
  );

  // Group position/rotation are OWNED by the physicsToScene sync registry during a run; the
  // spawn transform is only the initial pose.
  return (
    <group ref={onGroupRef} position={spawn.position} rotation={spawn.rotation}>
      <mesh geometry={geom} material={mat} position={[0, 0, MID_Z]} castShadow receiveShadow />
      {isBall && (
        // rotation marker on the sphere face (the 3D twin of the SVG radius line)
        <mesh geometry={markerGeom} material={m.plainActor} position={[10, 0, MID_Z + 15]} />
      )}
      {actor.hero && <mesh geometry={pipGeom} material={pipMat} position={[0, isBall ? 10 : 14, MID_Z + (isBall ? 14 : 22)]} />}
    </group>
  );
}

// ---- goal volume -----------------------------------------------------------------
export function GoalVolume({
  goal,
  solved,
  reducedMotion,
}: {
  goal: GoalRect;
  solved: boolean;
  reducedMotion: boolean;
}) {
  const { center, size } = goalBoxSpec(goal);
  const meshRef = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        transparent: true,
        opacity: 0.16,
        roughness: 0.4,
        metalness: 0,
        color: new Color("#4cc9f0"),
        emissive: new Color("#4cc9f0"),
        emissiveIntensity: 0.35,
        depthWrite: false,
      }),
    [],
  );

  useLayoutEffect(() => {
    mat.color.set(solved ? "#80ed99" : "#4cc9f0");
    mat.emissive.set(solved ? "#80ed99" : "#4cc9f0");
    mat.emissiveIntensity = solved ? 0.9 : 0.35;
    mat.opacity = solved ? 0.3 : 0.16;
  }, [solved, mat]);

  // success glow pulse — decorative, so reduced-motion holds it steady
  useFrame(({ clock }) => {
    if (!solved || reducedMotion) return;
    mat.emissiveIntensity = 0.9 + Math.sin(clock.elapsedTime * 3.2) * 0.35;
  });

  return (
    <group>
      <mesh ref={meshRef} position={center} material={mat}>
        <boxGeometry args={size} />
      </mesh>
      {solved && <pointLight position={[center[0], center[1], 60]} color="#80ed99" intensity={2.2} distance={420} decay={1.6} />}
    </group>
  );
}
