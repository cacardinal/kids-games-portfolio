// Rover paint jobs + decal sets (GDD §7.2). Pure CSS-variable skins, no images, no new geometry.

export type CosmeticId = "standard" | "surveyor" | "relay" | "loop-runner" | "phosphor";

export interface Cosmetic {
  id: CosmeticId;
  name: string;
  body: string;
  accent: string;
  glow: string;
  decal?: string;
  decalGlyph?: string;
  unlockLabel: string;
}

export const COSMETICS: Record<CosmeticId, Cosmetic> = {
  standard: {
    id: "standard",
    name: "Standard Issue",
    body: "#9aa6b2",
    accent: "#39d98a",
    glow: "rgba(57,217,138,0.55)",
    unlockLabel: "Default issue",
  },
  surveyor: {
    id: "surveyor",
    name: "Surveyor Cyan",
    body: "#0d1117",
    accent: "#22d3ee",
    glow: "rgba(34,211,238,0.6)",
    decal: "#22d3ee",
    decalGlyph: "S-1",
    unlockLabel: "Clear the Movement sector",
  },
  relay: {
    // Director-approved warm accent (#f0a35e) — cosmetic skin only.
    id: "relay",
    name: "Relay Orange",
    body: "#1a140d",
    accent: "#f0a35e",
    glow: "rgba(57,217,138,0.5)",
    unlockLabel: "Clear the Operations sector",
  },
  "loop-runner": {
    id: "loop-runner",
    name: "Loop Runner",
    body: "#0f2a26",
    accent: "#39d98a",
    glow: "rgba(34,211,238,0.55)",
    decal: "#22d3ee",
    decalGlyph: "↻",
    unlockLabel: "Clear the Loops sector",
  },
  phosphor: {
    id: "phosphor",
    name: "Phosphor Veteran",
    body: "#0a1410",
    accent: "#39d98a",
    glow: "rgba(57,217,138,0.85)",
    decal: "#39d98a",
    decalGlyph: "PAR",
    unlockLabel: "Earn the Efficient Operator badge",
  },
};

export const COSMETIC_ORDER: CosmeticId[] = ["standard", "surveyor", "relay", "loop-runner", "phosphor"];
