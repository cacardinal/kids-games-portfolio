// Low-poly building meshes — one visually distinct silhouette per building type,
// built purely from three.js primitives (no models, no textures, no network).
// Each mesh receives the blended season palette; roofs take a snow dusting in
// winter via the palette's snow factor. Groups are positioned with their base
// at y=0 (the tile top); the parent handles placement/rise animation.
import type { BuildingId } from "../../game/content";
import type { SeasonPalette } from "./boardModel";
import { mixHex } from "./color";

const SNOW = "#e8eef5";
const WOOD = "#7a5a32";
const WOOD_DARK = "#5a4326";
const STONE = "#8b939c";
const STONE_LIGHT = "#9aa3ad";
const PLASTER = "#e9dfc8";
const CLAY_RED = "#8a3a2e";
const AWNING_TAN = "#c9a86a";
const GOLD = "#d9b945";
const SOIL = "#6e5a34";

interface BuildingProps {
  palette: SeasonPalette;
}

/** Roof/snow blend: winter dusts exposed tops toward white. */
function snowy(base: string, p: SeasonPalette, amount = 0.75): string {
  return mixHex(base, SNOW, p.snow * amount);
}

function Farm({ palette }: BuildingProps) {
  const crop = mixHex(palette.foliage, "#c9d46a", 0.35);
  return (
    <group>
      {/* tilled soil plate */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.72, 0.12, 1.72]} />
        <meshStandardMaterial color={snowy(SOIL, palette, 0.35)} flatShading />
      </mesh>
      {/* three crop rows */}
      {[-0.52, 0, 0.52].map((z) => (
        <mesh key={z} position={[0, 0.19, z]}>
          <boxGeometry args={[1.5, 0.16, 0.3]} />
          <meshStandardMaterial color={snowy(crop, palette, 0.55)} flatShading />
        </mesh>
      ))}
      {/* little tool shed in the corner */}
      <mesh position={[0.62, 0.32, -0.6]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={WOOD} flatShading />
      </mesh>
      <mesh position={[0.62, 0.6, -0.6]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.34, 0.28, 4]} />
        <meshStandardMaterial color={snowy(CLAY_RED, palette)} flatShading />
      </mesh>
    </group>
  );
}

function Tree({ x, z, s, palette }: { x: number; z: number; s: number; palette: SeasonPalette }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.5, 6]} />
        <meshStandardMaterial color={WOOD_DARK} flatShading />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.42, 0.95, 6]} />
        <meshStandardMaterial color={snowy(palette.foliage, palette, 0.6)} flatShading />
      </mesh>
    </group>
  );
}

function LumberCamp({ palette }: BuildingProps) {
  return (
    <group>
      <Tree x={-0.55} z={-0.35} s={1} palette={palette} />
      <Tree x={-0.15} z={-0.62} s={0.75} palette={palette} />
      {/* log pile */}
      {[
        [0.3, 0.14, 0.35],
        [0.62, 0.14, 0.35],
        [0.46, 0.38, 0.35],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.9, 7]} />
          <meshStandardMaterial color={WOOD} flatShading />
        </mesh>
      ))}
      {/* stump */}
      <mesh position={[-0.55, 0.09, 0.55]}>
        <cylinderGeometry args={[0.16, 0.19, 0.18, 7]} />
        <meshStandardMaterial color={mixHex(WOOD, PLASTER, 0.25)} flatShading />
      </mesh>
    </group>
  );
}

function Quarry({ palette }: BuildingProps) {
  return (
    <group>
      {/* stepped stone terraces */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.7, 0.16, 1.7]} />
        <meshStandardMaterial color={snowy("#6f7780", palette, 0.4)} flatShading />
      </mesh>
      <mesh position={[-0.1, 0.3, -0.05]}>
        <boxGeometry args={[1.15, 0.3, 1.15]} />
        <meshStandardMaterial color={snowy("#7d858f", palette, 0.4)} flatShading />
      </mesh>
      <mesh position={[-0.18, 0.58, -0.12]}>
        <boxGeometry args={[0.62, 0.36, 0.62]} />
        <meshStandardMaterial color={snowy(STONE, palette, 0.5)} flatShading />
      </mesh>
      {/* cut blocks waiting for the cart */}
      <mesh position={[0.55, 0.28, 0.5]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color={STONE_LIGHT} flatShading />
      </mesh>
      <mesh position={[0.28, 0.24, 0.62]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.24, 0.24, 0.24]} />
        <meshStandardMaterial color={mixHex(STONE_LIGHT, "#ffffff", 0.15)} flatShading />
      </mesh>
    </group>
  );
}

function Market({ palette }: BuildingProps) {
  return (
    <group>
      {/* counter */}
      <mesh position={[0, 0.26, 0.1]}>
        <boxGeometry args={[1.35, 0.52, 0.85]} />
        <meshStandardMaterial color={WOOD} flatShading />
      </mesh>
      {/* corner posts */}
      {[
        [-0.72, -0.42],
        [0.72, -0.42],
        [-0.72, 0.5],
        [0.72, 0.5],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.55, z]}>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 6]} />
          <meshStandardMaterial color={WOOD_DARK} flatShading />
        </mesh>
      ))}
      {/* two-tone awning */}
      <mesh position={[0, 1.16, -0.24]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.7, 0.06, 0.62]} />
        <meshStandardMaterial color={snowy(CLAY_RED, palette)} flatShading />
      </mesh>
      <mesh position={[0, 1.16, 0.32]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[1.7, 0.06, 0.62]} />
        <meshStandardMaterial color={snowy(AWNING_TAN, palette)} flatShading />
      </mesh>
      {/* the coin on the counter */}
      <mesh position={[0.3, 0.58, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.05, 10]} />
        <meshStandardMaterial color={GOLD} flatShading />
      </mesh>
    </group>
  );
}

function Library({ palette }: BuildingProps) {
  return (
    <group>
      {/* plinth + hall */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.55, 0.16, 1.25]} />
        <meshStandardMaterial color={STONE_LIGHT} flatShading />
      </mesh>
      <mesh position={[0, 0.56, -0.08]}>
        <boxGeometry args={[1.2, 0.8, 0.85]} />
        <meshStandardMaterial color={"#7d7256"} flatShading />
      </mesh>
      {/* front columns */}
      {[-0.48, -0.16, 0.16, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.56, 0.45]}>
          <cylinderGeometry args={[0.065, 0.065, 0.8, 6]} />
          <meshStandardMaterial color={PLASTER} flatShading />
        </mesh>
      ))}
      {/* pediment roof */}
      <mesh position={[0, 1.14, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.3, 1, 0.95]}>
        <coneGeometry args={[0.78, 0.5, 4]} />
        <meshStandardMaterial color={snowy("#6a6048", palette)} flatShading />
      </mesh>
    </group>
  );
}

function House({ palette }: BuildingProps) {
  return (
    <group>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[1.0, 0.72, 1.0]} />
        <meshStandardMaterial color={"#a9805b"} flatShading />
      </mesh>
      {/* pyramid roof */}
      <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.88, 0.62, 4]} />
        <meshStandardMaterial color={snowy(CLAY_RED, palette)} flatShading />
      </mesh>
      {/* chimney */}
      <mesh position={[0.32, 1.18, -0.22]}>
        <boxGeometry args={[0.16, 0.42, 0.16]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      {/* door + windows */}
      <mesh position={[0, 0.26, 0.51]}>
        <boxGeometry args={[0.26, 0.5, 0.04]} />
        <meshStandardMaterial color={WOOD_DARK} flatShading />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.48, 0.51]}>
          <boxGeometry args={[0.18, 0.18, 0.03]} />
          <meshStandardMaterial color={PLASTER} flatShading />
        </mesh>
      ))}
    </group>
  );
}

const BUILDING_MESH: Record<BuildingId, (p: BuildingProps) => React.JSX.Element> = {
  farm: Farm,
  lumberCamp: LumberCamp,
  quarry: Quarry,
  market: Market,
  library: Library,
  house: House,
};

export function BuildingMesh({ id, palette }: { id: BuildingId; palette: SeasonPalette }) {
  const C = BUILDING_MESH[id];
  return <C palette={palette} />;
}

/** Scaffold frame for a queued build — corner posts + top rails in raw timber. */
export function ScaffoldMesh() {
  const posts: [number, number][] = [
    [-0.6, -0.6],
    [0.6, -0.6],
    [-0.6, 0.6],
    [0.6, 0.6],
  ];
  return (
    <group>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.4, z]}>
          <boxGeometry args={[0.09, 0.8, 0.09]} />
          <meshStandardMaterial color={AWNING_TAN} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.78, -0.6]}>
        <boxGeometry args={[1.28, 0.07, 0.07]} />
        <meshStandardMaterial color={AWNING_TAN} flatShading />
      </mesh>
      <mesh position={[0, 0.78, 0.6]}>
        <boxGeometry args={[1.28, 0.07, 0.07]} />
        <meshStandardMaterial color={AWNING_TAN} flatShading />
      </mesh>
      <mesh position={[-0.6, 0.78, 0]}>
        <boxGeometry args={[0.07, 0.07, 1.28]} />
        <meshStandardMaterial color={AWNING_TAN} flatShading />
      </mesh>
      <mesh position={[0.6, 0.78, 0]}>
        <boxGeometry args={[0.07, 0.07, 1.28]} />
        <meshStandardMaterial color={AWNING_TAN} flatShading />
      </mesh>
    </group>
  );
}
