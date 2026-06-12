// The reign-end recap set-piece — a parchment scroll built entirely from state.log:
// the story, the score tally, and the rank seal slam. Skippable; reduced-motion safe.
import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { scoreReign, goalsMet, type KingdomState } from "../game/kingdom";
import { SCENARIOS, COSMETICS, BADGES } from "../game/content";
import { PROFILES } from "../state/store";
import { CrestBanner } from "../components/CrestBanner";
import { RankSeal } from "../components/RankSeal";
import { Button } from "../components/Button";
import { sfx } from "../lib/sfx";

// Assemble 5-7 story lines from the log + final state, per the GDD recap templates.
function storyLines(state: KingdomState): string[] {
  const lines: string[] = ["Your kingdom began with 6 people and one field."];

  // Count event turns the player engaged with (events were drawn AND resolved to
  // reach the next turn — every drawn event in the log was answered).
  const eventsAnswered = state.log.filter((r) => r.eventDrawn).length;
  const houses = state.plots.filter((p) => p === "house").length;
  const discoveries = state.researched.length;
  const surplusTurns = state.log.filter((r) => r.foodStatus === "surplus").length;

  if (houses >= 3) lines.push(`You raised ${houses} houses, making room for your people to grow.`);
  if (eventsAnswered > 0) lines.push("You answered the advisor's calls and chose your kingdom's path.");
  if (state.resources.gold >= 60) lines.push("You traded with the caravans and filled the treasury.");
  if (discoveries > 0) lines.push(`Your scholars made ${discoveries} discoveries.`);
  if (surplusTurns >= state.log.length && state.log.length > 0) {
    lines.push("Every season ended with food to spare. The larder was never bare.");
  }
  lines.push(`Your people reached ${state.population}, and your fields fed every one of them.`);
  lines.push(
    goalsMet(state)
      ? "The goals of the reign were met. The seal is yours."
      : "The reign has ended. The kingdom stands, and your work is recorded.",
  );

  return lines.slice(0, 7);
}

export function RecapScreen() {
  const reign = useStore((s) => s.reign)!;
  const save = useStore((s) => s.save);
  const profile = useStore((s) => s.profile);
  const lastScore = useStore((s) => s.lastScore);
  const lastUnlocks = useStore((s) => s.lastUnlocks);
  const setView = useStore((s) => s.setView);
  const startReign = useStore((s) => s.startReign);

  const score = lastScore ?? scoreReign(reign);
  const scenario = SCENARIOS[reign.scenarioId];
  const me = PROFILES.find((p) => p.id === profile);
  const name = me?.name ?? "the";
  const lines = storyLines(reign);

  // Staged reveal: 0 = title, then lines, then tally, then seal.
  const [stage, setStage] = useState(0);
  const timers = useRef<number[]>([]);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    sfx.stamp(); // title seal
    if (prefersReduced) {
      setStage(99);
      sfx.success();
      return;
    }
    const seq = [
      [300, 1], // start story
      [300 + lines.length * 700 + 200, 2], // tally
      [300 + lines.length * 700 + 200 + 6 * 300 + 300, 3], // seal slam
    ] as const;
    for (const [delay, st] of seq) {
      const t = window.setTimeout(() => {
        setStage(st);
        if (st === 3) sfx.stamp();
      }, delay);
      timers.current.push(t);
    }
    return () => {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function skip() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    setStage(99);
  }

  const showStory = stage >= 1;
  const showTally = stage >= 2;
  const showSeal = stage >= 3 || stage === 99;

  const higherReachable = score.rank !== "monarch";

  return (
    <div className="recap" onClick={skip}>
      <div className="recap-scroll parchment ruled ledger-margin" onClick={(e) => e.stopPropagation()}>
        <div className="stack center" style={{ gap: 6 }}>
          <CrestBanner cosmeticId={save.selectedCosmetic} width={92} />
          <h1>The Reign of {name}'s Kingdom</h1>
          <p className="meta" style={{ color: "var(--ink-soft)" }}>
            {scenario.label} · Reign complete — {reign.log.length} seasons
          </p>
        </div>

        {showStory && (
          <div className="recap-lines">
            {lines.map((l, i) => (
              <div
                className="recap-line"
                key={i}
                style={{ animationDelay: `${i * 0.35}s` }}
              >
                {l}
              </div>
            ))}
          </div>
        )}

        {showTally && (
          <div className="tally">
            <TallyRow i={0} label="People" value={score.population} />
            <TallyRow i={1} label="Gold ÷ 5" value={score.goldFifths} />
            <TallyRow i={2} label={`Discoveries × 3`} value={score.researchBonus} />
            <TallyRow i={3} label={`Seasons saved × 2`} value={score.turnsBonus} />
            {score.fullLarderBonus > 0 && (
              <TallyRow i={4} label="Full Larder" value={score.fullLarderBonus} />
            )}
            <div className="tally-row total" style={{ animationDelay: "1.6s" }}>
              <span>Reign Score</span>
              <span>{score.total}</span>
            </div>
          </div>
        )}

        {showSeal && (
          <div className="stack center">
            <div className="recap-seal">
              <RankSeal rank={score.rank} size={132} slam={stage === 3} />
            </div>
            {lastUnlocks && (lastUnlocks.newScenario || lastUnlocks.newCosmetic || lastUnlocks.newBadges.length > 0) && (
              <div className="stack center gap8">
                {lastUnlocks.newCosmetic && (
                  <div className="unlock-line">
                    New banner unlocked: {COSMETICS[lastUnlocks.newCosmetic].name}
                  </div>
                )}
                {lastUnlocks.newScenario && (
                  <div className="unlock-line">
                    New reign unlocked: {SCENARIOS[lastUnlocks.newScenario].label}
                  </div>
                )}
                {lastUnlocks.newBadges.map((b) => (
                  <div className="unlock-line" key={b}>
                    Badge earned: {BADGES[b].name}
                  </div>
                ))}
              </div>
            )}
            <div className="recap-actions">
              <Button variant="secondary" sound="tap" onClick={() => setView("throne")}>
                {/* COPY.recapThrone */}
                Throne Room
              </Button>
              {higherReachable && (
                <Button sound="select" onClick={() => startReign(reign.scenarioId)}>
                  Reign Again
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TallyRow({ i, label, value }: { i: number; label: string; value: number }) {
  useEffect(() => {
    const t = window.setTimeout(() => sfx.collect(), i * 300);
    return () => window.clearTimeout(t);
  }, [i]);
  return (
    <div className="tally-row" style={{ animationDelay: `${i * 0.3}s` }}>
      <span>{label}</span>
      <span>+{value}</span>
    </div>
  );
}
