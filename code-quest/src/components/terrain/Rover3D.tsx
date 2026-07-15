// The 3D rover — chunky low-poly survey rover built from primitives (body, wheels,
// sensor mast). Charm lives in motion: idle bob + mast scan, wheel spin while driving,
// nose dip on stop, shake + dust on collision, mast twirl on win.
//
// Timing truth: the interpreter + useRunPlayer own the step cadence. This component
// only eases TOWARD the keyframe the trace dictates; animation can never alter state.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { CosmeticId } from "../../data/cosmetics";
import { COSMETICS } from "../../data/cosmetics";
import {
  tileToWorld,
  collisionOffset,
  nearestYaw,
  easeInOut,
  MOVE_MS,
  TURN_MS,
  type RoverKeyframe,
} from "./terrainMath";

const ROVER_Y = 0.06; // wheel bottoms kiss the tile tops

interface Rover3DProps {
  keyframe: RoverKeyframe;
  frameId: number; // changes whenever the visible trace step changes (traceIndex)
  width: number;
  height: number;
  cosmetic: CosmeticId;
  reducedMotion: boolean;
}

interface DustBurst {
  key: number;
  x: number;
  z: number;
  dir: [number, number];
}

export function Rover3D({ keyframe, frameId, width, height, cosmetic, reducedMotion }: Rover3DProps) {
  const rootRef = useRef<Group>(null); // world position (+ collision shake)
  const yawRef = useRef<Group>(null); // heading
  const bodyRef = useRef<Group>(null); // bob / nose-dip / hop
  const mastRef = useRef<Group>(null); // scan / win twirl
  const wheelRefs = useRef<Group[]>([]);
  const matsRef = useRef<MeshStandardMaterial[]>([]);

  const skin = COSMETICS[cosmetic];

  // Animation bookkeeping (refs — never re-renders, never touches the store).
  const anim = useRef({
    inited: false,
    lastFrame: Number.NaN,
    t0: 0,
    fromX: 0,
    fromZ: 0,
    fromYaw: 0,
    dur: MOVE_MS / 1000,
    fadeT0: -1,
  });

  // Collision -> one dust burst per collision step (skipped under reduced motion).
  // Pure render-time derivation; the puff animates and hides itself.
  const dust = useMemo<DustBurst | null>(() => {
    if (keyframe.event !== "collision" || reducedMotion) return null;
    const [wx, wz] = tileToWorld(keyframe.toX, keyframe.toY, width, height);
    const dir = collisionOffset(keyframe.collisionDir ?? "N");
    return { key: frameId, x: wx + dir[0] * 0.42, z: wz + dir[1] * 0.42, dir };
  }, [keyframe, frameId, reducedMotion, width, height]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    const yawG = yawRef.current;
    const body = bodyRef.current;
    const mast = mastRef.current;
    if (!root || !yawG || !body || !mast) return;

    const t = clock.elapsedTime;
    const a = anim.current;
    const [tx, tz] = tileToWorld(keyframe.toX, keyframe.toY, width, height);
    const targetYaw = keyframe.toYaw;

    if (!a.inited) {
      a.inited = true;
      a.lastFrame = frameId;
      root.position.set(tx, ROVER_Y, tz);
      yawG.rotation.y = targetYaw;
    }

    // New step event: capture the CURRENT rendered pose as the animation start.
    if (a.lastFrame !== frameId) {
      a.lastFrame = frameId;
      a.t0 = t;
      a.fromX = root.position.x;
      a.fromZ = root.position.z;
      a.fromYaw = nearestYaw(targetYaw, yawG.rotation.y); // re-unwrap near the new target
      a.dur = (keyframe.motion === "move" ? MOVE_MS : TURN_MS) / 1000;
      if (reducedMotion) a.fadeT0 = t;
    }

    const u = a.dur > 0 ? (t - a.t0) / a.dur : 1;
    const p = easeInOut(u);

    if (reducedMotion) {
      // Teleport + short fade-in (<=150ms). No bob, no scan, no shake, no dust.
      root.position.set(tx, ROVER_Y, tz);
      yawG.rotation.y = targetYaw;
      body.position.y = 0;
      body.rotation.x = 0;
      mast.rotation.y = 0;
      const f = a.fadeT0 >= 0 ? Math.min((t - a.fadeT0) / 0.15, 1) : 1;
      for (const m of matsRef.current) m.opacity = 0.35 + 0.65 * f;
      return;
    }
    for (const m of matsRef.current) m.opacity = 1;

    // --- Position + heading easing toward the interpreter's keyframe ---
    root.position.x = a.fromX + (tx - a.fromX) * p;
    root.position.z = a.fromZ + (tz - a.fromZ) * p;
    root.position.y = ROVER_Y;
    yawG.rotation.y = a.fromYaw + (targetYaw - a.fromYaw) * p;

    const moving = keyframe.motion === "move" && u < 1;
    const turning = keyframe.motion === "turn" && u < 1;
    const idle = keyframe.motion === "none" && !keyframe.event;

    // --- Wheels: spin while driving, counter-rotate hint while turning ---
    if (moving) {
      for (const w of wheelRefs.current) w.rotation.x -= delta * 9;
    } else if (turning) {
      wheelRefs.current.forEach((w, i) => {
        w.rotation.x += delta * 4 * (i % 2 === 0 ? 1 : -1);
      });
    }

    // --- Body: idle bob / nose dip on stop / collision shake / win hop ---
    let bodyY = 0;
    let pitch = 0;

    if (keyframe.motion === "move" && u >= 1 && u < 1.45) {
      // Nose dip just after arriving (suspension settle).
      const q = (u - 1) / 0.45;
      pitch = -0.14 * Math.sin(Math.min(q, 1) * Math.PI);
    }

    if (keyframe.event === "collision") {
      const cu = Math.min((t - a.t0) / 0.45, 1);
      const dir = collisionOffset(keyframe.collisionDir ?? "N");
      const lunge = 0.16 * Math.sin(Math.min(cu * 2, 1) * Math.PI) * (1 - cu * 0.5);
      const rattle = (1 - cu) * 0.028 * Math.sin(t * 55);
      root.position.x = tx + dir[0] * lunge + dir[1] * rattle;
      root.position.z = tz + dir[1] * lunge + dir[0] * rattle;
      pitch = 0.2 * Math.sin(Math.min(cu * 2, 1) * Math.PI); // rear kicks up on impact
    }

    if (keyframe.event === "win") {
      const wu = t - a.t0;
      if (wu > a.dur) {
        const q = wu - a.dur;
        bodyY = 0.12 * Math.max(0, Math.sin(Math.min(q / 0.5, 1) * Math.PI)); // one happy hop
        mast.rotation.y = easeInOut(Math.min(q / 0.9, 1)) * Math.PI * 4; // mast twirl
      }
    } else if (idle) {
      bodyY = Math.sin(t * 2.1) * 0.018; // idle hover-suspension bob
      mast.rotation.y = Math.sin(t * 1.3) * 0.7; // camera head scans the horizon
    } else if (u >= 1) {
      mast.rotation.y += (0 - mast.rotation.y) * 0.1; // settle mast forward while executing
    }

    body.position.y = bodyY;
    body.rotation.x = pitch;
  });

  // Collect body materials once for the reduced-motion fade.
  const regMat = (m: MeshStandardMaterial | null) => {
    if (m && !matsRef.current.includes(m)) matsRef.current.push(m);
  };
  const regWheel = (g: Group | null, i: number) => {
    if (g) wheelRefs.current[i] = g;
  };

  return (
    <>
      <group ref={rootRef}>
        <group ref={yawRef}>
          <group ref={bodyRef}>
            {/* hull */}
            <mesh position={[0, 0.24, 0]} castShadow>
              <boxGeometry args={[0.5, 0.18, 0.64]} />
              <meshStandardMaterial ref={regMat} color={skin.body} roughness={0.7} transparent />
            </mesh>
            {/* cabin hump (rear) */}
            <mesh position={[0, 0.36, 0.12]} castShadow>
              <boxGeometry args={[0.36, 0.12, 0.3]} />
              <meshStandardMaterial ref={regMat} color={skin.body} roughness={0.7} transparent />
            </mesh>
            {/* accent nose plate (front = -Z) */}
            <mesh position={[0, 0.27, -0.29]}>
              <boxGeometry args={[0.3, 0.08, 0.08]} />
              <meshStandardMaterial
                ref={regMat}
                color={skin.accent}
                emissive={skin.accent}
                emissiveIntensity={0.5}
                transparent
              />
            </mesh>
            {/* accent side rails */}
            <mesh position={[0, 0.335, -0.06]}>
              <boxGeometry args={[0.54, 0.03, 0.2]} />
              <meshStandardMaterial ref={regMat} color={skin.accent} roughness={0.5} transparent />
            </mesh>
            {/* wheels: [x, z] corners; spin group rotates about the axle (local X) */}
            {[
              [-0.29, -0.2],
              [0.29, -0.2],
              [-0.29, 0.2],
              [0.29, 0.2],
            ].map(([wx, wz], i) => (
              <group key={i} ref={(g) => regWheel(g, i)} position={[wx, 0.12, wz]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.12, 0.12, 0.09, 10]} />
                  <meshStandardMaterial ref={regMat} color="#171f29" roughness={1} transparent />
                </mesh>
                {/* hub cap so the spin reads */}
                <mesh position={[wx > 0 ? 0.05 : -0.05, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <boxGeometry args={[0.012, 0.16, 0.05]} />
                  <meshStandardMaterial ref={regMat} color={skin.accent} transparent />
                </mesh>
              </group>
            ))}
            {/* sensor mast (front) with a little camera head */}
            <mesh position={[0.12, 0.47, -0.18]}>
              <cylinderGeometry args={[0.02, 0.025, 0.26, 8]} />
              <meshStandardMaterial ref={regMat} color="#2a3644" roughness={0.8} transparent />
            </mesh>
            <group ref={mastRef} position={[0.12, 0.62, -0.18]}>
              <mesh castShadow>
                <boxGeometry args={[0.16, 0.09, 0.1]} />
                <meshStandardMaterial ref={regMat} color={skin.body} roughness={0.6} transparent />
              </mesh>
              {/* lens looks forward (-Z) */}
              <mesh position={[0, 0, -0.055]}>
                <cylinderGeometry args={[0.028, 0.028, 0.02, 10]} />
                <meshStandardMaterial
                  ref={regMat}
                  color={skin.accent}
                  emissive={skin.accent}
                  emissiveIntensity={0.9}
                  transparent
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      {dust && <DustPuff key={dust.key} x={dust.x} z={dust.z} dir={dust.dir} />}
    </>
  );
}

const DUST_N = 7;
const DUST_LIFE = 0.75; // seconds

/** One-shot collision dust: a handful of motes kicked back off the wall, rising and fading. */
function DustPuff({ x, z, dir }: { x: number; z: number; dir: [number, number] }) {
  const ref = useRef<Group>(null);
  const t0 = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (t0.current == null) t0.current = clock.elapsedTime;
    const u = (clock.elapsedTime - t0.current) / DUST_LIFE;
    if (u >= 1) {
      g.visible = false;
      return;
    }
    g.children.forEach((c, i) => {
      const spread = ((i / (DUST_N - 1)) - 0.5) * 1.5; // fan across the wall face
      const back = 0.12 + u * 0.5; // kicked away from the wall
      c.position.set(
        -dir[0] * back + dir[1] * spread * u * 0.6,
        0.06 + u * (0.3 + (i % 3) * 0.14),
        -dir[1] * back + dir[0] * spread * u * 0.6,
      );
      const s = 1 - u * 0.55;
      c.scale.setScalar(s);
      const mat = (c as Mesh).material as MeshStandardMaterial;
      mat.opacity = 0.5 * (1 - u);
    });
  });

  return (
    <group ref={ref} position={[x, 0, z]}>
      {Array.from({ length: DUST_N }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.045 + (i % 3) * 0.015, 6, 5]} />
          <meshStandardMaterial color="#8a93a0" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
