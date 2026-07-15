// Low-poly 3D mission terrain. Pure presentation: built from the SAME mission grid
// data as the flat Grid (parseGridForView); reads run progress via props. No game logic.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import type { ParsedView, ViewTile } from "../../game/view";
import { tileToWorld, tileJitter } from "./terrainMath";

// Palette — matched to the app's CSS custom properties (terminal greens/cyans on deep slate).
const GROUND_COLORS = ["#243447", "#2b3e53", "#31465f"];
const WALL_COLOR = "#33424f";
const WALL_CAP_COLOR = "#41515f";
const GREEN = "#39d98a";
const CYAN = "#22d3ee";
const START_RING = "#2f4152";

const TILE_W = 0.94; // slight gutter between tiles keeps them countable
const BASE_H = 0.16;

interface Terrain3DProps {
  parsed: ParsedView;
  collectedKeys: Set<string>;
  activatedKeys: Set<string>;
  goalShimmer: boolean;
  winFlare: boolean;
  reducedMotion: boolean;
}

export function Terrain3D({
  parsed,
  collectedKeys,
  activatedKeys,
  goalShimmer,
  winFlare,
  reducedMotion,
}: Terrain3DProps) {
  const { width, height, tiles } = parsed;

  const placed = useMemo(
    () =>
      tiles.map((t) => {
        const [wx, wz] = tileToWorld(t.x, t.y, width, height);
        return { tile: t, wx, wz, jitter: tileJitter(t.x, t.y) };
      }),
    [tiles, width, height],
  );

  return (
    <group>
      {placed.map(({ tile, wx, wz, jitter }) => (
        <TerrainTile
          key={`${tile.x},${tile.y}`}
          tile={tile}
          wx={wx}
          wz={wz}
          jitter={jitter}
          collected={collectedKeys.has(`${tile.x},${tile.y}`)}
          activated={activatedKeys.has(`${tile.x},${tile.y}`)}
          goalShimmer={goalShimmer}
          winFlare={winFlare}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

interface TileProps {
  tile: ViewTile;
  wx: number;
  wz: number;
  jitter: number;
  collected: boolean;
  activated: boolean;
  goalShimmer: boolean;
  winFlare: boolean;
  reducedMotion: boolean;
}

function TerrainTile(props: TileProps) {
  const { tile, wx, wz, jitter } = props;
  if (tile.type === "wall") return <WallBlock wx={wx} wz={wz} jitter={jitter} />;

  // Every walkable tile gets a low ground slab with slight height variation.
  const h = BASE_H + jitter * 0.05;
  const topY = h - BASE_H; // top surface sits just above y=0, varying per tile
  const color = GROUND_COLORS[Math.floor(jitter * GROUND_COLORS.length) % GROUND_COLORS.length];
  return (
    <group position={[wx, 0, wz]}>
      <mesh position={[0, topY - h / 2, 0]} receiveShadow>
        <boxGeometry args={[TILE_W, h, TILE_W]} />
        <meshStandardMaterial color={tile.type === "goal" ? "#0b1a14" : color} roughness={0.95} />
      </mesh>
      {tile.type === "start" && (
        <mesh position={[0, topY + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.32, 24]} />
          <meshBasicMaterial color={START_RING} side={DoubleSide} />
        </mesh>
      )}
      {tile.type === "goal" && (
        <GoalBeacon
          topY={topY}
          shimmer={props.goalShimmer}
          flare={props.winFlare}
          reducedMotion={props.reducedMotion}
        />
      )}
      {tile.type === "crystal" && !props.collected && (
        <CrystalNode topY={topY} reducedMotion={props.reducedMotion} />
      )}
      {tile.type === "beacon" && <BeaconNode topY={topY} activated={props.activated} />}
    </group>
  );
}

function WallBlock({ wx, wz, jitter }: { wx: number; wz: number; jitter: number }) {
  const h = 0.5 + jitter * 0.18;
  return (
    <group position={[wx, 0, wz]}>
      <mesh position={[0, h / 2 - BASE_H, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.98, h, 0.98]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={1} />
      </mesh>
      {/* offset cap slab for a chunky rock-formation read */}
      <mesh
        position={[(jitter - 0.5) * 0.16, h - BASE_H + 0.07, (0.5 - jitter) * 0.16]}
        rotation={[0, jitter * 0.9, 0]}
        castShadow
      >
        <boxGeometry args={[0.62, 0.14, 0.62]} />
        <meshStandardMaterial color={WALL_CAP_COLOR} roughness={1} />
      </mesh>
    </group>
  );
}

/** Goal pad: emissive ring + a soft vertical light column. Flares on win. */
function GoalBeacon({
  topY,
  shimmer,
  flare,
  reducedMotion,
}: {
  topY: number;
  shimmer: boolean;
  flare: boolean;
  reducedMotion: boolean;
}) {
  const columnRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const col = columnRef.current;
    const ring = ringRef.current;
    if (!col || !ring) return;
    const t = clock.elapsedTime;
    const colMat = col.material as MeshBasicMaterial;
    const ringMat = ring.material as MeshStandardMaterial;
    if (flare) {
      // Win flare: brighten and widen the column (eased toward target each frame).
      colMat.opacity += (0.5 - colMat.opacity) * 0.08;
      col.scale.x += (1.7 - col.scale.x) * 0.06;
      col.scale.z += (1.7 - col.scale.z) * 0.06;
      ringMat.emissiveIntensity = 1.6;
      return;
    }
    col.scale.x += (1 - col.scale.x) * 0.1;
    col.scale.z += (1 - col.scale.z) * 0.1;
    if (reducedMotion) {
      colMat.opacity = 0.18;
      ringMat.emissiveIntensity = 0.7;
      return;
    }
    const pulse = shimmer ? 0.5 + 0.5 * Math.sin(t * 7) : 0.5 + 0.5 * Math.sin(t * 1.8);
    colMat.opacity = 0.12 + pulse * (shimmer ? 0.3 : 0.12);
    ringMat.emissiveIntensity = 0.5 + pulse * (shimmer ? 1.4 : 0.6);
  });

  return (
    <group position={[0, topY, 0]}>
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.3, 28]} />
        <meshStandardMaterial
          color={GREEN}
          emissive={GREEN}
          emissiveIntensity={0.8}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={columnRef} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 1.5, 12, 1, true]} />
        <meshBasicMaterial color={GREEN} transparent opacity={0.16} depthWrite={false} side={DoubleSide} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color={GREEN} intensity={flare ? 2.2 : 0.7} distance={2.6} />
    </group>
  );
}

/** Collectible crystal: floating octahedron, slow spin (static under reduced motion). */
function CrystalNode({ topY, reducedMotion }: { topY: number; reducedMotion: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || reducedMotion) return;
    const t = clock.elapsedTime;
    m.rotation.y = t * 0.9;
    m.position.y = topY + 0.34 + Math.sin(t * 1.7) * 0.04;
  });
  return (
    <group>
      <mesh ref={ref} position={[0, topY + 0.34, 0]} castShadow>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={0.55}
          roughness={0.3}
        />
      </mesh>
      <pointLight position={[0, topY + 0.4, 0]} color={CYAN} intensity={0.4} distance={1.6} />
    </group>
  );
}

/** Relay beacon: squat pylon whose head lights up once activated. */
function BeaconNode({ topY, activated }: { topY: number; activated: boolean }) {
  return (
    <group position={[0, topY, 0]}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.19, 0.28, 8]} />
        <meshStandardMaterial color="#1a2836" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial
          color={activated ? CYAN : "#173743"}
          emissive={CYAN}
          emissiveIntensity={activated ? 1.4 : 0.08}
        />
      </mesh>
      {activated && (
        <>
          <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.24, 20]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.5} side={DoubleSide} />
          </mesh>
          <pointLight position={[0, 0.4, 0]} color={CYAN} intensity={0.9} distance={2} />
        </>
      )}
    </group>
  );
}
