// Workshop material register — machined wood, brushed metal, rubber. Lazily created singletons
// (shared across meshes) with small procedural canvas textures; nothing loads over the network.
import {
  MeshStandardMaterial,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  Color,
} from "three";

function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

// Subtle wood grain: warm base + darker streaks.
function woodTexture(base: string, streak: string): CanvasTexture {
  return makeCanvas(256, 256, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = streak;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 26; i++) {
      const y = (i / 26) * 256 + Math.sin(i * 3.7) * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 16) {
        ctx.lineTo(x, y + Math.sin(x * 0.05 + i * 1.3) * 2.2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = streak;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(40 + i * 50, 60 + (i % 3) * 70, 6, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Brushed metal: vertical hairlines over a cool gray.
function brushedTexture(): CanvasTexture {
  return makeCanvas(128, 128, (ctx) => {
    ctx.fillStyle = "#8d97a1";
    ctx.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x++) {
      ctx.globalAlpha = 0.05 + (Math.sin(x * 12.9898) * 0.5 + 0.5) * 0.09;
      ctx.fillStyle = x % 2 ? "#b7c0c8" : "#6e7880";
      ctx.fillRect(x, 0, 1, 128);
    }
  });
}

// Blueprint back panel: deep drafting blue + 40px grid (matches the 2D sheet aesthetic).
function blueprintTexture(): CanvasTexture {
  const tex = makeCanvas(512, 512, (ctx) => {
    const g = ctx.createRadialGradient(256, 100, 40, 256, 256, 420);
    g.addColorStop(0, "#103358");
    g.addColorStop(0.6, "#0c2647");
    g.addColorStop(1, "#0a1f3a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(160,200,255,0.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
  });
  tex.repeat.set(2.5, 1.5); // ~40px world grid across 1280×720
  return tex;
}

interface Registry {
  plankWood: MeshStandardMaterial;
  rampWood: MeshStandardMaterial;
  crateWood: MeshStandardMaterial;
  metal: MeshStandardMaterial;
  bouncerRubber: MeshStandardMaterial;
  heroRubber: MeshStandardMaterial;
  plainActor: MeshStandardMaterial;
  terrain: MeshStandardMaterial;
  bench: MeshStandardMaterial;
  blueprint: MeshStandardMaterial;
}

let reg: Registry | null = null;

export function materials(): Registry {
  if (reg) return reg;
  reg = {
    // machined wood — parts a kid would find on a real bench
    plankWood: new MeshStandardMaterial({ map: woodTexture("#a97e46", "#7c5a2e"), roughness: 0.82, metalness: 0.02 }),
    rampWood: new MeshStandardMaterial({ map: woodTexture("#96703e", "#6c4f28"), roughness: 0.85, metalness: 0.02 }),
    crateWood: new MeshStandardMaterial({ map: woodTexture("#b58a50", "#845f33"), roughness: 0.8, metalness: 0.02 }),
    // brushed metal — columns + bouncer chassis
    metal: new MeshStandardMaterial({ map: brushedTexture(), roughness: 0.38, metalness: 0.75 }),
    // rubber — bouncer pad + the hero ball
    bouncerRubber: new MeshStandardMaterial({ color: new Color("#2e3438"), roughness: 0.95, metalness: 0 }),
    heroRubber: new MeshStandardMaterial({ color: new Color("#d4552f"), roughness: 0.7, metalness: 0 }),
    plainActor: new MeshStandardMaterial({ color: new Color("#c9cfd6"), roughness: 0.6, metalness: 0.1 }),
    // painted shop fixtures
    terrain: new MeshStandardMaterial({ color: new Color("#546b85"), roughness: 0.75, metalness: 0.12 }),
    bench: new MeshStandardMaterial({ map: woodTexture("#7a5a35", "#573f24"), roughness: 0.9, metalness: 0.02 }),
    blueprint: (() => {
      // the drafting-blue panel is dark by design; emissiveMap keeps it reading like the 2D
      // sheet's backdrop under the warm shop light instead of collapsing to black
      const tex = blueprintTexture();
      return new MeshStandardMaterial({
        map: tex,
        emissive: new Color("#9db8d6"),
        emissiveMap: tex,
        emissiveIntensity: 0.85,
        roughness: 0.96,
        metalness: 0,
      });
    })(),
  };
  return reg;
}
