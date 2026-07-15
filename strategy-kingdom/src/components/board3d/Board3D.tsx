// The low-poly 3D kingdom board. ONE <Canvas>, fixed angled camera framing the
// whole board (readable > cinematic). Renders purely FROM the BoardModel —
// no game math lives here. Tile taps flow up through onTileTap; all menus,
// numbers, and ledgers stay real DOM in the parent.
//
// Season changes play as a skippable 800–1200ms set piece: the new palette
// sweeps across the tiles left to right while the lights re-blend. Reduced
// motion collapses it to a ≤200ms whole-board fade, drops the construction
// dust, and parks the ambient clouds.
import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import type { Season } from "../../game/content";
import {
  SEASON_PALETTES,
  blendPalettes,
  tilePosition,
  boardAriaLabel,
  TILE_PITCH,
  TILE_SIZE,
  BOARD_COLS,
  type BoardModel,
  type TileModel,
  type SeasonPalette,
} from "./boardModel";
import { clamp01, easeInOut } from "./color";
import { BuildingMesh, ScaffoldMesh } from "./buildings";

const TILE_HEIGHT = 0.22;
const SEASON_SWEEP_MS = 1000; // within the 800–1200ms set-piece window
const REDUCED_FADE_MS = 180; // ≤200ms under prefers-reduced-motion
const RISE_MS = 620;

export interface Board3DProps {
  model: BoardModel;
  /** Plot indices playing the construction rise this beat. */
  justBuilt: Set<number>;
  /** Plot indices to highlight (open sheet / same building type). */
  selected: Set<number>;
  disabled?: boolean;
  /** Hold the season set piece (e.g. while the ledger overlay plays) so the
   *  sweep runs in full view when the overlay lifts, not behind its scrim. */
  holdSeasonSweep?: boolean;
  reducedMotion: boolean;
  onTileTap: (index: number) => void;
}

interface Transition {
  from: Season;
  to: Season;
  /** 0..1 raw progress, advanced by the frame loop. */
  t: number;
}

export default function Board3D({
  model,
  justBuilt,
  selected,
  disabled,
  holdSeasonSweep,
  reducedMotion,
  onTileTap,
}: Board3DProps) {
  // ── Visibility pause: stop the frame loop entirely while the tab is hidden ──
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ── Season set piece ──
  // `displayed` is the season the board currently shows. While the ledger
  // overlay holds the sweep, it stays on the old season; when the hold lifts,
  // the mismatch starts a transition (render-phase state adjustment).
  const [transition, setTransition] = useState<Transition | null>(null);
  const [displayed, setDisplayed] = useState(model.season);
  const skipRef = useRef(false);
  if (!holdSeasonSweep && model.season !== displayed) {
    setTransition({ from: displayed, to: model.season, t: 0 });
    setDisplayed(model.season);
  }

  const target = SEASON_PALETTES[displayed];
  const globalBlend = transition ? easeInOut(transition.t) : 1;
  const palette = transition
    ? blendPalettes(SEASON_PALETTES[transition.from], SEASON_PALETTES[transition.to], globalBlend)
    : target;

  const rows = Math.ceil(model.tiles.length / BOARD_COLS);
  const boardW = BOARD_COLS * TILE_PITCH + 1.5;
  const boardD = rows * TILE_PITCH + 1.5;

  return (
    <div
      className="board board3d"
      role="img"
      aria-label={boardAriaLabel(model)}
      // A tap anywhere on the board completes an in-flight season set piece.
      onPointerDownCapture={() => {
        if (transition) skipRef.current = true;
      }}
    >
      <Canvas
        dpr={[1, 2]}
        frameloop={hidden ? "never" : "always"}
        camera={{ position: [0, 10.6, 10.2], fov: 36 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.6, 0.4)}
      >
        <color attach="background" args={[palette.backdrop]} />
        <fog attach="fog" args={[palette.backdrop, 20, 34]} />

        <ambientLight color={palette.ambientColor} intensity={palette.ambientIntensity} />
        <directionalLight
          position={palette.sunPosition}
          color={palette.sunColor}
          intensity={palette.sunIntensity}
        />
        <directionalLight position={[-6, 4, -6]} color={palette.ambientColor} intensity={0.3} />

        {transition && (
          <TransitionDriver
            key={`${transition.from}-${transition.to}`}
            reducedMotion={reducedMotion}
            skipRef={skipRef}
            onTick={(t) =>
              setTransition((cur) => (cur ? { ...cur, t } : cur))
            }
            onDone={() => {
              setTransition(null);
              skipRef.current = false;
            }}
          />
        )}

        {/* Terrain plate — a gently beveled floating island. */}
        <group position={[0, -TILE_HEIGHT, 0]}>
          <RoundedBox args={[boardW, 0.85, boardD]} radius={0.2} position={[0, -0.43, 0]}>
            <meshStandardMaterial color={palette.groundEmpty} flatShading />
          </RoundedBox>
          <RoundedBox args={[boardW - 1.1, 0.9, boardD - 1.1]} radius={0.28} position={[0, -1.1, 0]}>
            <meshStandardMaterial color="#4d3f28" flatShading />
          </RoundedBox>
          {/* Border greenery + rocks (re-palette with the seasons). */}
          <EdgeTree x={-boardW / 2 + 0.55} z={-boardD / 2 + 0.6} s={1.05} palette={palette} />
          <EdgeTree x={boardW / 2 - 0.5} z={-boardD / 2 + 0.9} s={0.8} palette={palette} />
          <EdgeTree x={boardW / 2 - 0.6} z={boardD / 2 - 0.55} s={1.1} palette={palette} />
          <EdgeTree x={-boardW / 2 + 0.5} z={boardD / 2 - 0.8} s={0.85} palette={palette} />
          <mesh position={[-boardW / 2 + 1.15, 0.12, boardD / 2 - 0.45]}>
            <dodecahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color="#8b939c" flatShading />
          </mesh>
          <mesh position={[boardW / 2 - 1.2, 0.1, -boardD / 2 + 0.5]}>
            <dodecahedronGeometry args={[0.17, 0]} />
            <meshStandardMaterial color="#9aa3ad" flatShading />
          </mesh>
        </group>

        {/* Tiles + buildings. */}
        {model.tiles.map((tile) => (
          <Tile3D
            key={tile.index}
            tile={tile}
            count={model.tiles.length}
            palette={palette}
            transition={transition}
            selected={selected.has(tile.index)}
            rising={justBuilt.has(tile.index)}
            disabled={disabled}
            reducedMotion={reducedMotion}
            onTap={onTileTap}
          />
        ))}

        {!reducedMotion && <Clouds />}
      </Canvas>
    </div>
  );
}

/** Advances the season transition inside the frame loop; skippable via skipRef. */
function TransitionDriver({
  reducedMotion,
  skipRef,
  onTick,
  onDone,
}: {
  reducedMotion: boolean;
  skipRef: React.MutableRefObject<boolean>;
  onTick: (t: number) => void;
  onDone: () => void;
}) {
  const elapsed = useRef(0);
  const done = useRef(false);
  const duration = (reducedMotion ? REDUCED_FADE_MS : SEASON_SWEEP_MS) / 1000;
  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = skipRef.current ? 1 : clamp01(elapsed.current / duration);
    if (t >= 1) {
      done.current = true;
      onDone();
    } else {
      onTick(t);
    }
  });
  return null;
}

function EdgeTree({ x, z, s, palette }: { x: number; z: number; s: number; palette: SeasonPalette }) {
  const snowyFoliage = palette.snow > 0 ? blendFoliage(palette) : palette.foliage;
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.6, 6]} />
        <meshStandardMaterial color="#5a4326" flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.5, 1.15, 6]} />
        <meshStandardMaterial color={snowyFoliage} flatShading />
      </mesh>
    </group>
  );
}

function blendFoliage(p: SeasonPalette): string {
  // Winter dusts the treetops without whiting them out.
  return p.snow >= 1 ? "#7d9584" : p.foliage;
}

/** One tile: plate, affordance/selection rings, scaffold or building, workers. */
function Tile3D({
  tile,
  count,
  palette,
  transition,
  selected,
  rising,
  disabled,
  reducedMotion,
  onTap,
}: {
  tile: TileModel;
  count: number;
  palette: SeasonPalette;
  transition: Transition | null;
  selected: boolean;
  rising: boolean;
  disabled?: boolean;
  reducedMotion: boolean;
  onTap: (index: number) => void;
}) {
  const { x, z } = tilePosition(tile.index, count);

  // The sweep: each column re-palettes a beat after the one to its left.
  let tilePalette = palette;
  if (transition && !reducedMotion) {
    const col01 = (tile.index % BOARD_COLS) / Math.max(1, BOARD_COLS - 1);
    const local = easeInOut(clamp01(transition.t * 1.45 - col01 * 0.45));
    tilePalette = blendPalettes(
      SEASON_PALETTES[transition.from],
      SEASON_PALETTES[transition.to],
      local,
    );
  }

  const ground = tile.kind === "empty" ? tilePalette.groundEmpty : tilePalette.ground;

  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, TILE_HEIGHT / 2 - TILE_HEIGHT, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onTap(tile.index);
        }}
      >
        <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
        <meshStandardMaterial color={ground} flatShading />
      </mesh>

      {/* Subtle glow ring: this tile is an open plot you can build on. */}
      {tile.kind === "empty" && !selected && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.82, 24]} />
          <meshBasicMaterial color="#d9b945" transparent opacity={0.22} />
        </mesh>
      )}

      {/* Clear highlight ring on the selected tile(s). */}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.86, 1.0, 28]} />
          <meshBasicMaterial color="#e7c96a" transparent opacity={0.95} />
        </mesh>
      )}

      {tile.kind === "queued" && tile.building && (
        <group>
          <ScaffoldMesh />
          {/* ghost of the coming building */}
          <group scale={[0.55, 0.55, 0.55]} position={[0, 0.05, 0]}>
            <BuildingMesh id={tile.building} palette={tilePalette} />
          </group>
        </group>
      )}

      {tile.kind === "built" && tile.building && (
        <RisingGroup active={rising} reducedMotion={reducedMotion}>
          <BuildingMesh id={tile.building} palette={tilePalette} />
        </RisingGroup>
      )}

      {tile.kind === "built" && tile.slots > 0 && (
        <WorkerPips workers={tile.workers} slots={tile.slots} />
      )}

      {rising && !reducedMotion && <Dust />}
    </group>
  );
}

/** Construction rise: the building climbs out of the ground with a settle. */
function RisingGroup({
  active,
  reducedMotion,
  children,
}: {
  active: boolean;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<Group>(null);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (active) start.current = null; // arm: first frame stamps the clock
  }, [active]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (!active || reducedMotion) {
      g.scale.set(1, 1, 1);
      g.position.y = 0;
      return;
    }
    if (start.current === null) start.current = clock.elapsedTime;
    const p = clamp01(((clock.elapsedTime - start.current) * 1000) / RISE_MS);
    // Rise from below with a soft overshoot-and-settle.
    const s = easeOutBack(p);
    g.position.y = -0.9 * (1 - p);
    g.scale.set(0.75 + 0.25 * s, Math.max(0.05, s), 0.75 + 0.25 * s);
  });
  return <group ref={group}>{children}</group>;
}

function easeOutBack(t: number): number {
  const c1 = 1.4;
  const x = clamp01(t);
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** Construction dust: a handful of motes kicked out from the footing. */
const DUST_DIRS = [0.3, 1.2, 2.2, 3.4, 4.4, 5.5].map((a) => [Math.cos(a), Math.sin(a)] as const);
function Dust() {
  const motes = useRef<(Mesh | null)[]>([]);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const p = clamp01((clock.elapsedTime - start.current) / 0.7);
    motes.current.forEach((m, i) => {
      if (!m) return;
      const [dx, dz] = DUST_DIRS[i];
      const r = 0.35 + 0.75 * p;
      m.position.set(dx * r, 0.08 + Math.sin(p * Math.PI) * (0.22 + i * 0.02), dz * r);
      const sc = 1 - p;
      m.scale.set(sc, sc, sc);
      (m.material as MeshBasicMaterial).opacity = 0.8 * (1 - p);
    });
  });
  return (
    <group>
      {DUST_DIRS.map((_, i) => (
        <mesh key={i} ref={(el) => (motes.current[i] = el)}>
          <sphereGeometry args={[0.09, 6, 5]} />
          <meshBasicMaterial color="#c9a86a" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** Worker pips along the tile's front edge — green = assigned, gray = open slot. */
function WorkerPips({ workers, slots }: { workers: number; slots: number }) {
  const pips = useMemo(() => Array.from({ length: slots }, (_, i) => i), [slots]);
  const perRow = 6;
  return (
    <group position={[0, 0.08, TILE_SIZE / 2 - 0.14]}>
      {pips.map((i) => {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(slots - row * perRow, perRow);
        const xo = (i % perRow) - (inRow - 1) / 2;
        return (
          <mesh key={i} position={[xo * 0.21, row * -0.02, row * -0.2]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial
              color={i < workers ? "#8ab87a" : "#565a50"}
              emissive={i < workers ? "#2f5230" : "#000000"}
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Slow ambient clouds — never distracting, hidden under reduced motion. */
const CLOUD_SEEDS = [
  { x: -5, z: -3.5, y: 4.6, s: 1.0, v: 0.10 },
  { x: 1, z: -1.0, y: 5.4, s: 0.7, v: 0.14 },
  { x: 4, z: 2.4, y: 4.9, s: 0.85, v: 0.08 },
];
function Clouds() {
  const groups = useRef<(Group | null)[]>([]);
  useFrame((_, delta) => {
    groups.current.forEach((g, i) => {
      if (!g) return;
      g.position.x += CLOUD_SEEDS[i].v * delta;
      if (g.position.x > 9) g.position.x = -9;
    });
  });
  return (
    <>
      {CLOUD_SEEDS.map((c, i) => (
        <group
          key={i}
          ref={(el) => (groups.current[i] = el)}
          position={[c.x, c.y, c.z]}
          scale={c.s}
        >
          {[
            [0, 0, 0, 0.55],
            [0.6, 0.08, 0.1, 0.4],
            [-0.55, 0.05, -0.08, 0.42],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} scale={[1.4, 0.55, 1]}>
              <sphereGeometry args={[r, 7, 6]} />
              <meshBasicMaterial color="#e9edf2" transparent opacity={0.32} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}
