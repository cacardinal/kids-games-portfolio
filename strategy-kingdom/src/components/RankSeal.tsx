// Wax rank seal. Used small in the Throne Room and large (slam) in the recap.
import { RANK_NAMES } from "../game/content";
import type { ScoreBreakdown } from "../game/kingdom";

export function RankSeal({
  rank,
  size = 72,
  slam = false,
}: {
  rank: ScoreBreakdown["rank"];
  size?: number;
  slam?: boolean;
}) {
  return (
    <div
      className={`seal ${slam ? "slam" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.18 }}
      role="img"
      aria-label={`Rank: ${RANK_NAMES[rank]}`}
    >
      <span style={{ lineHeight: 1.05, padding: "0 6px" }}>{RANK_NAMES[rank]}</span>
    </div>
  );
}
