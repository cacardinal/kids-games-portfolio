// Attribute + clue-category icons (GDD §7 early-reader path). CSS/SVG only, no images.
// These let an early reader sort suspects and clue TYPES without parsing prose.

import {
  Backpack,
  Bird,
  Cat,
  CircleSlash,
  Dog,
  Glasses,
  HelpCircle,
  MapPin,
  ScrollText,
  Watch,
} from "lucide-react";
import type { Accessory, AttributeDimension, Hair, Pet } from "../game/types";

const HAIR_HEX: Record<Hair, string> = {
  black: "#2a2a2e",
  brown: "#6b4a2f",
  red: "#b3502e",
  blond: "#d9b441",
};

// A small hair-tuft swatch in the actual hair color.
export function HairIcon({ hair, size = 20 }: { hair: Hair; size?: number }) {
  const fill = HAIR_HEX[hair];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`${hair} hair`}
      style={{ display: "block" }}
    >
      <path
        d="M5 16c-1-6 3-11 7-11s7 4 7 10c0 0-2-3-4-3 1 2 0 4 0 4s-2-3-4-3c0 2-1 3-1 3s-2-2-4-2c-1 0-2 2-2 2s0-2 1-2z"
        fill={fill}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function AccessoryIcon({ accessory, size = 20 }: { accessory: Accessory; size?: number }) {
  const common = { size, "aria-label": accessory } as const;
  switch (accessory) {
    case "glasses":
      return <Glasses {...common} />;
    case "watch":
      return <Watch {...common} />;
    case "backpack":
      return <Backpack {...common} />;
    case "scarf":
      // scarf: a simple SVG loop (no perfect lucide match)
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="scarf">
          <path
            d="M7 4h10v5a3 3 0 0 1-3 3h-1v8h-2v-8h-1a3 3 0 0 1-3-3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "cap":
      // cap: a simple brim + dome
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="cap">
          <path
            d="M4 14c0-5 4-8 8-8s8 3 8 7H4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M3 14h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}

export function PetIcon({ pet, size = 20 }: { pet: Pet; size?: number }) {
  switch (pet) {
    case "dog":
      return <Dog size={size} aria-label="dog" />;
    case "cat":
      return <Cat size={size} aria-label="cat" />;
    case "bird":
      return <Bird size={size} aria-label="bird" />;
    case "none":
      return <CircleSlash size={size} aria-label="no pet" />;
  }
}

export function AttributeIcon({
  dimension,
  value,
  size = 20,
}: {
  dimension: AttributeDimension;
  value: string;
  size?: number;
}) {
  if (dimension === "hair") return <HairIcon hair={value as Hair} size={size} />;
  if (dimension === "accessory") return <AccessoryIcon accessory={value as Accessory} size={size} />;
  return <PetIcon pet={value as Pet} size={size} />;
}

// Clue category icon (corner of each clue card). alibi = map-pin; flavor = faint
// question tag (teaches "maybe noise"); attribute = its dimension icon.
export function ClueCategoryIcon({
  kind,
  dimension,
  value,
  size = 18,
}: {
  kind: "alibi" | "attribute" | "flavor";
  dimension?: AttributeDimension;
  value?: string;
  size?: number;
}) {
  if (kind === "alibi") return <MapPin size={size} aria-label="alibi" />;
  if (kind === "flavor") return <HelpCircle size={size} aria-label="possible red herring" />;
  if (dimension && value !== undefined) {
    return <AttributeIcon dimension={dimension} value={value} size={size} />;
  }
  return <ScrollText size={size} aria-label="clue" />;
}
