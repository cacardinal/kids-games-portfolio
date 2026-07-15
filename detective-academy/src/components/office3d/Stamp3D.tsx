// The 3D CASE CLOSED stamp slam (story 3d-upgrade/05). A rubber stamp tool
// descends and slams onto the case file; camera kick + ink burst; then the
// existing flat DOM stamped state takes over (the imprint IS the DOM stamp).
// Rendered in a canvas overlaying the closed-folder; pixel-matched camera so
// the tool lands exactly on the DOM stamp's footprint. Decorative: aria-hidden,
// pointer-events none (taps fall through to the skippable scene).
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../../lib/rng";
import {
  cameraDistanceForPixelMatch,
  clamp,
  STAMP_TIMELINE,
} from "./scene-math";

const FOV = 40;
const INK_COUNT = 42;

interface Target {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Wooden handle + dark base; the red felt face is what meets the paper.
function StampTool({ target, elapsed }: { target: Target; elapsed: () => number }) {
  const group = useRef<THREE.Group>(null);
  const baseH = Math.max(24, target.height * 0.28);
  const handleH = target.height * 1.1;
  // rest pose: base block centered over the imprint
  const yRest = target.y - baseH / 2;

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const t = elapsed();
    const { impactAt } = STAMP_TIMELINE;

    if (t < impactAt) {
      // descend: eased fall from high above / toward the camera
      const p = clamp(t / impactAt, 0, 1);
      const ease = p * p * p; // accelerating drop — weight
      const lift = (1 - ease) * target.height * 5.5;
      const toward = (1 - ease) * 260; // starts closer to camera (bigger)
      g.position.set(target.x, yRest + lift, toward);
      g.rotation.z = (-7 * Math.PI) / 180 - (1 - ease) * 0.22;
      g.rotation.x = (1 - ease) * 0.35;
      g.visible = true;
    } else {
      // settle: tiny recoil bounce, then lift away as the DOM imprint shows
      const s = clamp((t - impactAt) / (STAMP_TIMELINE.restAt - impactAt), 0, 1);
      const recoil = Math.sin(Math.min(s * 4, 1) * Math.PI) * target.height * 0.12;
      const lift = s > 0.45 ? (s - 0.45) * target.height * 3.2 : 0;
      g.position.set(target.x, yRest + recoil + lift, 0);
      g.rotation.z = (-7 * Math.PI) / 180;
      g.rotation.x = 0;
      // camera kick right after impact, decaying fast
      const kick = Math.exp(-s * 9) * Math.sin(s * 60) * target.height * 0.06;
      camera.position.y = kick;
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* base block */}
      <mesh position={[0, baseH / 2, 0]}>
        <boxGeometry args={[target.width * 1.02, baseH, Math.max(30, target.height * 0.5)]} />
        <meshStandardMaterial color="#241a12" roughness={0.55} />
      </mesh>
      {/* red felt face below the base — what meets the paper */}
      <mesh position={[0, -3, 0]}>
        <boxGeometry args={[target.width * 0.98, 6, Math.max(26, target.height * 0.44)]} />
        <meshStandardMaterial color="#8c2c1e" roughness={0.8} />
      </mesh>
      {/* handle */}
      <mesh position={[0, baseH + handleH / 2, 0]}>
        <cylinderGeometry args={[target.height * 0.14, target.height * 0.2, handleH, 20]} />
        <meshStandardMaterial color="#7a5a36" roughness={0.5} />
      </mesh>
      <mesh position={[0, baseH + handleH + target.height * 0.1, 0]}>
        <sphereGeometry args={[target.height * 0.19, 20, 20]} />
        <meshStandardMaterial color="#8a683f" roughness={0.45} />
      </mesh>
    </group>
  );
}

// Ink droplets bursting outward from the stamp footprint on impact.
function InkBurst({ target, elapsed }: { target: Target; elapsed: () => number }) {
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const drops = useMemo(() => {
    const rand = mulberry32(662607);
    return Array.from({ length: INK_COUNT }, () => {
      const a = rand() * Math.PI * 2;
      const speed = 120 + rand() * 380;
      return {
        vx: Math.cos(a) * speed,
        vy: Math.abs(Math.sin(a)) * speed * 0.9 + 60,
        vz: (rand() - 0.5) * 80,
        x0: (rand() - 0.5) * target.width,
        y0: (rand() - 0.5) * target.height * 0.5,
      };
    });
  }, [target.width, target.height]);
  const positions = useMemo(() => new Float32Array(INK_COUNT * 3), []);

  useFrame(() => {
    const t = elapsed();
    const { impactAt, restAt } = STAMP_TIMELINE;
    const geo = points.current?.geometry;
    if (!geo || !mat.current) return;
    if (t < impactAt) {
      mat.current.opacity = 0;
      return;
    }
    const s = (t - impactAt) / 1000; // seconds since impact
    const life = clamp((t - impactAt) / (restAt - impactAt), 0, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < INK_COUNT; i++) {
      const d = drops[i];
      pos.setXYZ(
        i,
        target.x + d.x0 + d.vx * s,
        target.y + d.y0 + d.vy * s - 900 * s * s, // gravity
        d.vz * s,
      );
    }
    pos.needsUpdate = true;
    mat.current.opacity = 0.85 * (1 - life);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        color="#b3402e"
        size={7}
        sizeAttenuation={false}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}

export function Stamp3D({
  target,
  canvasHeight,
  startedAt,
}: {
  /** stamp footprint in world px (origin = canvas center, y up) */
  target: Target;
  canvasHeight: number;
  startedAt: number;
}) {
  const elapsed = () => performance.now() - startedAt;
  return (
    <div className="stamp3d" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        frameloop="always"
        gl={{ antialias: true, alpha: true }}
        camera={{
          fov: FOV,
          position: [0, 0, cameraDistanceForPixelMatch(FOV, canvasHeight)],
          near: 10,
          far: cameraDistanceForPixelMatch(FOV, canvasHeight) + 600,
        }}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute("aria-hidden", "true");
        }}
      >
        <ambientLight intensity={0.7} color="#fff3dd" />
        <directionalLight position={[0.3, 1, 0.8]} intensity={1.6} color="#ffd98f" />
        <StampTool target={target} elapsed={elapsed} />
        <InkBurst target={target} elapsed={elapsed} />
      </Canvas>
    </div>
  );
}
