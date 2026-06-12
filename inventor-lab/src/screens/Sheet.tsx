// SVG sub-components for the drafting sheet: terrain, goal, placed parts (with the pen color),
// actors (with live data-x/data-y for QA), the ghost, the failure path trace, and the flag.
import type { TerrainBlock, Placement, GoalRect, Actor, PartKind } from "../game/types";
import { rampLocalPoints, partTransform, partSize } from "../game/render";

const ramp = rampLocalPoints();
const RAMP_PTS = ramp.map((p) => `${p.x},${p.y}`).join(" ");

export function TerrainShape({ t }: { t: TerrainBlock }) {
  const fill = t.kind === "pedestal" ? "rgba(76,201,240,0.10)" : "rgba(255,255,255,0.06)";
  return (
    <g transform={`translate(${t.x} ${t.y}) rotate(${t.angleDeg ?? 0})`}>
      <rect
        x={-t.w / 2}
        y={-t.h / 2}
        width={t.w}
        height={t.h}
        rx={3}
        fill={fill}
        stroke="rgba(232,241,255,0.45)"
        strokeWidth={1.5}
      />
      {/* hatch the top surface so it reads as a solid ledge */}
      <line x1={-t.w / 2} y1={-t.h / 2} x2={t.w / 2} y2={-t.h / 2} stroke="rgba(232,241,255,0.7)" strokeWidth={2} />
    </g>
  );
}

export function GoalZone({ goal, solved }: { goal: GoalRect; solved: boolean }) {
  const color = solved ? "var(--success)" : "var(--cyan)";
  return (
    <g className={solved ? "goal solved" : "goal"}>
      <rect
        x={goal.x}
        y={goal.y}
        width={goal.w}
        height={goal.h}
        rx={4}
        fill={solved ? "rgba(128,237,153,0.14)" : "rgba(76,201,240,0.06)"}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={solved ? "0" : "10 7"}
      />
      {/* target corner ticks */}
      {[
        [goal.x, goal.y, 1, 1],
        [goal.x + goal.w, goal.y, -1, 1],
        [goal.x, goal.y + goal.h, 1, -1],
        [goal.x + goal.w, goal.y + goal.h, -1, -1],
      ].map(([cx, cy, sx, sy], i) => (
        <path key={i} d={`M${cx},${(cy as number) + 16 * (sy as number)} L${cx},${cy} L${(cx as number) + 16 * (sx as number)},${cy}`} stroke={color} strokeWidth={2} fill="none" />
      ))}
      <text x={goal.x + 8} y={goal.y + 20} fontSize={13} fontFamily="var(--mono)" fill={color} letterSpacing="1.5">
        {solved ? "SEATED" : "GOAL"}
      </text>
    </g>
  );
}

// A placed part drawn in the current pen color. data-part for inspection.
export function PartShape({
  p,
  pen,
  selected,
  testid,
}: {
  p: Placement;
  pen: string;
  selected?: boolean;
  testid?: string;
}) {
  const sel = selected ? { filter: "drop-shadow(0 0 6px rgba(76,201,240,0.6))" } : undefined;
  return (
    <g transform={partTransform(p)} data-part={p.part} data-testid={testid} style={sel}>
      <PartBody part={p.part} pen={pen} />
      {selected && <SelectionHalo part={p.part} />}
    </g>
  );
}

function PartBody({ part, pen }: { part: PartKind; pen: string }) {
  const stroke = pen;
  const fillFaint = "rgba(255,255,255,0.05)";
  switch (part) {
    case "plank":
      return <rect x={-60} y={-8} width={120} height={16} rx={3} fill={fillFaint} stroke={stroke} strokeWidth={2.5} />;
    case "bouncer":
      return (
        <g>
          <rect x={-40} y={-8} width={80} height={16} rx={4} fill="rgba(76,201,240,0.10)" stroke={stroke} strokeWidth={2.5} />
          {/* spring chevrons */}
          {[-24, 0, 24].map((x) => (
            <path key={x} d={`M${x - 7},6 L${x},-5 L${x + 7},6`} stroke={stroke} strokeWidth={2} fill="none" />
          ))}
        </g>
      );
    case "ramp":
      return <polygon points={RAMP_PTS} fill={fillFaint} stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />;
    case "column":
      return (
        <g>
          <rect x={-12} y={-60} width={24} height={120} rx={3} fill={fillFaint} stroke={stroke} strokeWidth={2.5} />
          <line x1={-12} y1={-30} x2={12} y2={-30} stroke={stroke} strokeWidth={1} opacity={0.5} />
          <line x1={-12} y1={0} x2={12} y2={0} stroke={stroke} strokeWidth={1} opacity={0.5} />
          <line x1={-12} y1={30} x2={12} y2={30} stroke={stroke} strokeWidth={1} opacity={0.5} />
        </g>
      );
    case "crate":
      return (
        <g>
          <rect x={-20} y={-20} width={40} height={40} rx={3} fill="rgba(217,164,65,0.12)" stroke={stroke} strokeWidth={2.5} />
          <line x1={-20} y1={-20} x2={20} y2={20} stroke={stroke} strokeWidth={1} opacity={0.4} />
          <line x1={20} y1={-20} x2={-20} y2={20} stroke={stroke} strokeWidth={1} opacity={0.4} />
        </g>
      );
  }
}

function SelectionHalo({ part }: { part: PartKind }) {
  const { w, h } = partSize(part);
  return (
    <rect
      x={-w / 2 - 6}
      y={-h / 2 - 6}
      width={w + 12}
      height={h + 12}
      rx={5}
      fill="none"
      stroke="var(--cyan)"
      strokeWidth={1.5}
      strokeDasharray="6 5"
      className="sel-march"
    />
  );
}

// Actor (ball or crate). Hero gets data-testid="actor-hero" + live data-x/data-y.
export function ActorShape({
  actor,
  pos,
  angle,
  hero,
}: {
  actor: Actor;
  pos: { x: number; y: number };
  angle: number;
  hero: boolean;
}) {
  const testid = hero ? "actor-hero" : undefined;
  const stroke = hero ? "var(--cyan)" : "rgba(232,241,255,0.7)";
  const fill = hero ? "rgba(76,201,240,0.22)" : "rgba(232,241,255,0.10)";
  if (actor.kind === "ball") {
    return (
      <g data-testid={testid} data-x={pos.x.toFixed(1)} data-y={pos.y.toFixed(1)} transform={`translate(${pos.x} ${pos.y}) rotate(${(angle * 180) / Math.PI})`}>
        <circle r={18} fill={fill} stroke={stroke} strokeWidth={2.5} />
        <line x1={0} y1={0} x2={14} y2={0} stroke={stroke} strokeWidth={1.5} opacity={0.6} />
        {hero && <circle r={3.5} cx={0} cy={-9} fill="var(--cyan)" className="live-pip" />}
      </g>
    );
  }
  return (
    <g data-testid={testid} data-x={pos.x.toFixed(1)} data-y={pos.y.toFixed(1)} transform={`translate(${pos.x} ${pos.y}) rotate(${(angle * 180) / Math.PI})`}>
      <rect x={-20} y={-20} width={40} height={40} rx={3} fill={fill} stroke={stroke} strokeWidth={2.5} />
      <line x1={-20} y1={-7} x2={20} y2={-7} stroke={stroke} strokeWidth={1} opacity={0.5} />
      <line x1={-20} y1={7} x2={20} y2={7} stroke={stroke} strokeWidth={1} opacity={0.5} />
      {hero && <circle r={3.5} cx={0} cy={-26} fill="var(--cyan)" className="live-pip" />}
    </g>
  );
}

// Ghost preview that follows the pointer while a part is armed.
export function Ghost({ p, valid }: { p: Placement; valid: boolean }) {
  const color = valid ? "var(--cyan)" : "var(--warn)";
  const { w } = partSize(p.part);
  return (
    <g transform={partTransform(p)} opacity={0.72} style={{ pointerEvents: "none" }}>
      <GhostBody part={p.part} color={color} />
      {/* width dimension arrow under the ghost */}
      <g transform={`rotate(${-p.angleDeg})`}>
        <line x1={-w / 2} y1={28} x2={w / 2} y2={28} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
        <path d={`M${-w / 2},28 l6,-3 v6 z`} fill={color} />
        <path d={`M${w / 2},28 l-6,-3 v6 z`} fill={color} />
      </g>
    </g>
  );
}

function GhostBody({ part, color }: { part: PartKind; color: string }) {
  switch (part) {
    case "plank": return <rect x={-60} y={-8} width={120} height={16} rx={3} fill="none" stroke={color} strokeWidth={2} strokeDasharray="7 5" />;
    case "bouncer": return <rect x={-40} y={-8} width={80} height={16} rx={4} fill="none" stroke={color} strokeWidth={2} strokeDasharray="7 5" />;
    case "ramp": return <polygon points={RAMP_PTS} fill="none" stroke={color} strokeWidth={2} strokeDasharray="7 5" strokeLinejoin="round" />;
    case "column": return <rect x={-12} y={-60} width={24} height={120} rx={3} fill="none" stroke={color} strokeWidth={2} strokeDasharray="7 5" />;
    case "crate": return <rect x={-20} y={-20} width={40} height={40} rx={3} fill="none" stroke={color} strokeWidth={2} strokeDasharray="7 5" />;
  }
}

// Faint dotted path trace of the hero's last failed run ("failure is data").
export function PathTrace({ points, pen }: { points: { x: number; y: number }[]; pen: string }) {
  if (points.length < 2) return null;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return <path d={d} fill="none" stroke={pen} strokeWidth={1.5} strokeDasharray="2 6" opacity={0.32} style={{ pointerEvents: "none" }} />;
}

// Pennant flag raised at the goal on success.
export function Flag({ x, y, pen, raised }: { x: number; y: number; pen: string; raised: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className={raised ? "flag raised" : "flag"} style={{ pointerEvents: "none" }}>
      <line x1={0} y1={0} x2={0} y2={-64} stroke="rgba(232,241,255,0.8)" strokeWidth={3} className="flag-staff" />
      <polygon points="0,-64 44,-54 0,-40" fill={pen} className="flag-cloth" />
    </g>
  );
}
