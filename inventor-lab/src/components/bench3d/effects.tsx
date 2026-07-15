// Impact juice: a short dust puff + (above a force threshold) hot sparks at the contact point.
// Purely decorative — never rendered when prefers-reduced-motion. Burst lifetime is owned by
// BuildBench (same DUST_MS window as the 2D view); each component animates analytically from
// its mount time, so there is no per-frame allocation.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, Color, type Group } from "three";
import { worldToScene, MID_Z } from "./physicsToScene";

const LIFE_S = 0.5; // matches BuildBench's DUST_MS removal window
const SPARK_THRESHOLD = 0.55; // burst intensity above which metal sparks join the dust

interface Mote {
  dx: number;
  dy: number;
  dz: number;
  speed: number;
  size: number;
}

function makeMotes(count: number, spread: number, up: number): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.sin(i * 7.3) * 0.5;
    motes.push({
      dx: Math.cos(a) * spread,
      dy: Math.abs(Math.sin(a)) * up + 0.35,
      dz: Math.sin(i * 3.1) * 0.5,
      speed: 60 + ((i * 37) % 50),
      size: 2.2 + ((i * 13) % 10) / 4,
    });
  }
  return motes;
}

export function ImpactBurst({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const s = worldToScene(x, y);
  const dustGroup = useRef<Group>(null);
  const sparkGroup = useRef<Group>(null);
  const born = useRef<number | null>(null);

  const dust = useMemo(() => makeMotes(5 + Math.round(intensity * 4), 0.9, 0.7), [intensity]);
  const sparks = useMemo(
    () => (intensity > SPARK_THRESHOLD ? makeMotes(6, 1.4, 1.6).map((m) => ({ ...m, speed: m.speed * 2.6, size: 1.2 })) : []),
    [intensity],
  );

  const dustMat = useMemo(
    () => new MeshStandardMaterial({ color: new Color("#d9cdb8"), transparent: true, opacity: 0.85, roughness: 1 }),
    [],
  );
  const sparkMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color("#ffca7a"),
        emissive: new Color("#ffb457"),
        emissiveIntensity: 2.4,
        transparent: true,
        opacity: 1,
      }),
    [],
  );

  // per-burst materials — dispose on unmount so removed bursts don't leak GPU objects
  useEffect(() => {
    return () => {
      dustMat.dispose();
      sparkMat.dispose();
    };
  }, [dustMat, sparkMat]);

  useFrame(({ clock }) => {
    if (born.current === null) born.current = clock.elapsedTime;
    const t = Math.min((clock.elapsedTime - born.current) / LIFE_S, 1);
    const ease = 1 - (1 - t) * (1 - t);
    dustMat.opacity = 0.85 * (1 - t);
    sparkMat.opacity = 1 - t;
    dustGroup.current?.children.forEach((c, i) => {
      const m = dust[i];
      if (!m) return;
      c.position.set(m.dx * m.speed * ease * 0.6, m.dy * m.speed * ease * 0.6 - 30 * t * t, m.dz * 20 * ease);
      const grow = 1 + t * 1.6;
      c.scale.setScalar(grow);
    });
    sparkGroup.current?.children.forEach((c, i) => {
      const m = sparks[i];
      if (!m) return;
      // sparks fly fast and get pulled down (scene y-up)
      c.position.set(m.dx * m.speed * t, m.dy * m.speed * t - 220 * t * t, m.dz * 30 * t);
    });
  });

  return (
    <group position={[s.x, s.y, MID_Z]}>
      <group ref={dustGroup}>
        {dust.map((m, i) => (
          <mesh key={i} material={dustMat}>
            <sphereGeometry args={[m.size, 8, 6]} />
          </mesh>
        ))}
      </group>
      <group ref={sparkGroup}>
        {sparks.map((_, i) => (
          <mesh key={i} material={sparkMat}>
            <boxGeometry args={[3.4, 1.1, 1.1]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
