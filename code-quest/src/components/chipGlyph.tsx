import { ArrowUp, RotateCcw, RotateCw, Diamond, Repeat } from "lucide-react";
import type { Op } from "../game/interpreter";

// Icon-first chip identity (GDD §8 early-reader path). The glyph alone is sufficient to play sector 1.
export const OP_LABEL: Record<Op, string> = {
  MOVE: "MOVE",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  ACTION: "ACTION",
  REPEAT: "REPEAT",
};

export function OpGlyph({ op, size = 26 }: { op: Op; size?: number }) {
  switch (op) {
    case "MOVE":
      return <ArrowUp size={size} strokeWidth={2.5} />;
    case "LEFT":
      return <RotateCcw size={size} strokeWidth={2.5} />;
    case "RIGHT":
      return <RotateCw size={size} strokeWidth={2.5} />;
    case "ACTION":
      return <Diamond size={size} strokeWidth={2.5} />;
    case "REPEAT":
      return <Repeat size={size} strokeWidth={2.5} />;
  }
}
