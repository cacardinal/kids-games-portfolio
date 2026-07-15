// The lamplit 3D office backdrop (story 3d-upgrade/05). One fixed <Canvas> behind
// the DOM UI, shared across CaseBoard / CaseView / Result; content reframes per
// screen. Purely decorative: aria-hidden, pointer-events none, values kept dark so
// DOM text stays >=4.5:1 over it (a CSS scrim + vignette layer guarantees it).
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../../lib/rng";
import {
  type BackdropView,
  damp,
  framingForView,
  moteConeRadiusAt,
  normalizePointer,
  parallaxTarget,
  seedMotes,
} from "./scene-math";

// Lamp cone geometry anchors (world units; camera looks down -z from ~6).
const LAMP = { topY: 2.6, deskY: -2.1, topR: 0.25, bottomR: 2.4, x: -1.1 };
const MOTE_COUNT = 110;

/* ---------------- scene pieces ---------------- */

function Room() {
  return (
    <group>
      {/* back wall */}
      <mesh position={[0, 0.5, -4]}>
        <planeGeometry args={[34, 20]} />
        <meshStandardMaterial color="#181b21" roughness={0.95} />
      </mesh>
      {/* floor hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, -1]}>
        <planeGeometry args={[34, 10]} />
        <meshStandardMaterial color="#101216" roughness={1} />
      </mesh>
      {/* desk edge along the bottom of frame */}
      <mesh position={[0, -2.45, 0.6]}>
        <boxGeometry args={[16, 0.7, 3.2]} />
        <meshStandardMaterial color="#2c2115" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* desk top face catches the lamp pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.09, 0.6]}>
        <planeGeometry args={[16, 3.2]} />
        <meshStandardMaterial color="#3a2c1b" roughness={0.6} />
      </mesh>
      {/* a case file resting on the desk, just in the lamp pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[LAMP.x + 0.4, -2.06, 0.7]}>
        <planeGeometry args={[1.9, 1.3]} />
        <meshStandardMaterial color="#5c4d33" roughness={0.85} />
      </mesh>
    </group>
  );
}

// Venetian-blind light slats raking the back wall (warm window light).
function BlindSlats() {
  const slats = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        y: 2.9 - i * 0.42,
        w: 8.5 - i * 0.18,
      })),
    [],
  );
  return (
    <group position={[3.4, 0, -3.95]} rotation={[0, 0, -0.14]}>
      {slats.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]}>
          <planeGeometry args={[s.w, 0.09]} />
          <meshBasicMaterial
            color="#d9c48a"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// The lamp: glow bulb, translucent light cone, and the actual spotlight.
// Intensity eases toward the per-screen target (Result brightens on a solve)
// entirely via refs — no React re-render per frame.
function Lamp({ target, motion }: { target: number; motion: boolean }) {
  const spot = useRef<THREE.SpotLight>(null);
  const coneMat = useRef<THREE.MeshBasicMaterial>(null);
  const current = useRef(target);
  const { invalidate } = useThree();
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const coneH = LAMP.topY - LAMP.deskY;

  const apply = (intensity: number, breathe = 1) => {
    if (spot.current) spot.current.intensity = 26 * intensity * breathe;
    if (coneMat.current) coneMat.current.opacity = 0.04 * intensity;
  };

  useEffect(() => {
    if (motion) return;
    current.current = target;
    apply(target);
    invalidate();
  }, [motion, target, invalidate]);

  useFrame((state, dt) => {
    if (!motion) return;
    current.current = damp(current.current, target, 3, dt);
    // barely-perceptible lamp breathing (matches the DOM lampFlicker)
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.9) * 0.04;
    apply(current.current, breathe);
  });

  return (
    <group position={[LAMP.x, 0, 0.2]}>
      {/* shade */}
      <mesh position={[0, LAMP.topY + 0.16, 0]}>
        <coneGeometry args={[0.55, 0.5, 24, 1, true]} />
        <meshStandardMaterial color="#1f5a4d" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* bulb glow */}
      <mesh position={[0, LAMP.topY, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#ffe9b8" />
      </mesh>
      {/* visible light cone */}
      <mesh position={[0, (LAMP.topY + LAMP.deskY) / 2, 0]}>
        <coneGeometry args={[LAMP.bottomR, coneH, 32, 1, true]} />
        <meshBasicMaterial
          ref={coneMat}
          color="#ffdf9e"
          transparent
          opacity={0.04 * target}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <primitive object={spotTarget} position={[0, LAMP.deskY, 0.4]} />
      <spotLight
        ref={spot}
        position={[0, LAMP.topY, 0]}
        angle={0.72}
        penumbra={0.6}
        distance={9}
        decay={1.6}
        color="#ffd98f"
        target={spotTarget}
      />
    </group>
  );
}

// Dust motes drifting inside the lamp cone. Skipped entirely under reduced motion.
function DustMotes() {
  const points = useRef<THREE.Points>(null);
  const motes = useMemo(() => seedMotes(MOTE_COUNT, {
    topY: LAMP.topY,
    bottomY: LAMP.deskY,
    topR: LAMP.topR,
    bottomR: LAMP.bottomR,
  }, mulberry32(1947)), []);
  const positions = useMemo(() => {
    const arr = new Float32Array(MOTE_COUNT * 3);
    motes.forEach((m, i) => {
      arr[i * 3] = m.x;
      arr[i * 3 + 1] = m.y;
      arr[i * 3 + 2] = m.z;
    });
    return arr;
  }, [motes]);

  useFrame((state, dt) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = motes[i];
      let y = pos.getY(i) + m.speed * dt * 2.2; // slow rise
      if (y > LAMP.topY) y = LAMP.deskY + 0.05; // wrap to the desk
      const sway = Math.sin(t * 0.35 + m.phase) * 0.12;
      const maxR = moteConeRadiusAt(y, LAMP.topY, LAMP.deskY, LAMP.topR, LAMP.bottomR);
      const r = Math.hypot(m.x, m.z);
      const s = r > 0 ? Math.min(1, maxR / (r + 0.001)) : 1;
      pos.setXYZ(i, m.x * s + sway * 0.3, y, m.z * s);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} position={[LAMP.x, 0, 0.2]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffe9c0"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Camera rig: eases toward the per-screen framing and applies gentle pointer parallax.
function Rig({ view, motion }: { view: BackdropView; motion: boolean }) {
  const { camera, invalidate } = useThree();
  const pointer = useRef({ rotX: 0, rotY: 0 });

  useEffect(() => {
    if (!motion) return;
    const onMove = (e: PointerEvent) => {
      const { nx, ny } = normalizePointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      pointer.current = parallaxTarget(nx, ny);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [motion]);

  // Reduced motion: jump straight to the framing (single demand-rendered frame).
  useEffect(() => {
    if (motion) return;
    const f = framingForView(view);
    camera.position.set(f.cameraX, f.cameraY, f.cameraZ);
    camera.rotation.set(0, 0, 0);
    camera.lookAt(0, -0.4, 0);
    invalidate();
  }, [motion, view, camera, invalidate]);

  useFrame((_, dt) => {
    if (!motion) return;
    const f = framingForView(view);
    camera.position.x = damp(camera.position.x, f.cameraX, 2.5, dt);
    camera.position.y = damp(camera.position.y, f.cameraY, 2.5, dt);
    camera.position.z = damp(camera.position.z, f.cameraZ, 2.5, dt);
    camera.lookAt(0, -0.4, 0);
    camera.rotation.x += -pointer.current.rotX * 0.6;
    camera.rotation.y += -pointer.current.rotY;
  });
  return null;
}

/* ---------------- the backdrop ---------------- */

export function OfficeBackdrop({
  view,
  reducedMotion,
}: {
  view: BackdropView;
  reducedMotion: boolean;
}) {
  // Pause rendering entirely when the tab is hidden.
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const motion = !reducedMotion;
  const frameloop: "always" | "demand" | "never" = hidden
    ? "never"
    : motion
      ? "always"
      : "demand";

  return (
    <div className="backdrop3d" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        frameloop={frameloop}
        camera={{ fov: 42, position: [0, 0.5, 7.2], near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor("#101216");
          gl.domElement.setAttribute("aria-hidden", "true");
        }}
      >
        <ambientLight intensity={0.55} color="#8a93a6" />
        <Room />
        <BlindSlats />
        <Lamp target={framingForView(view).lamp} motion={motion} />
        {motion && <DustMotes />}
        <Rig view={view} motion={motion} />
      </Canvas>
      {/* film grain + vignette + darkening scrim — guarantees text contrast */}
      <div className="backdrop3d__fx grain" />
    </div>
  );
}
