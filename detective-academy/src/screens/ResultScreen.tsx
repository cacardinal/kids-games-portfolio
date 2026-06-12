import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useStore } from "../state/store";
import { generateCase } from "../game/generator";
import { BADGES, rankForXp, RANKS, CARD_STYLES } from "../game/progression";
import { SpeakButton } from "../components/SpeakButton";
import { BadgeGlyph } from "../components/BadgeGlyph";
import { sfx } from "../lib/sfx";

// ResultScreen: "How you closed it" recap (GDD §5.3), XP tally, rank-up (§4.10).
export function ResultScreen() {
  const result = useStore((s) => s.result);
  const save = useStore((s) => s.save);
  const openCase = useStore((s) => s.openCase);
  const closeCaseView = useStore((s) => s.closeCaseView);

  const [showClue, setShowClue] = useState<number | null>(null);

  const caseData = useMemo(
    () => (result ? generateCase(result.caseId) : null),
    [result],
  );

  // Rank-up sound once on mount, after the XP tally lands.
  useEffect(() => {
    if (result?.rankedUp) {
      const t = window.setTimeout(() => {
        sfx.success();
        window.setTimeout(() => sfx.collect(), 220);
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [result?.rankedUp]);

  if (!result || !caseData) return null;

  const rank = rankForXp(result.totalXpAfter);
  const recapText = `How you closed it. ${result.recap.lines.join(" ")}`;

  // earned-bonus summary line (only bonuses actually earned)
  const bonusBits: string[] = [];
  if (result.xp.firstTry) bonusBits.push("First-try accusation");
  if (result.xp.sharpEye) bonusBits.push("Closed hint-free");
  if (result.xp.methodical) bonusBits.push("Methodical");
  if (result.xp.firstTimeClear) bonusBits.push("First close");

  const nextCaseId = result.caseId + 1;
  const hasNext = nextCaseId <= 30;

  const newCardName = result.newCardId
    ? CARD_STYLES.find((c) => c.id === result.newCardId)?.name
    : undefined;

  return (
    <div className="shell result">
      <div className="result__head">
        <h1>How you closed it</h1>
        <SpeakButton text={recapText} />
      </div>

      <section className="result__recap paper grain">
        {result.recap.lines.map((line, i) => {
          const clueForLine = caseData.implicatingClueIds[i]
            ? caseData.clues.find((c) => c.id === caseData.implicatingClueIds[i])
            : undefined;
          return (
            <p key={i} className="result__line">
              <span className="result__line-txt">{line}</span>
              {clueForLine && (
                <button
                  type="button"
                  className="result__disclose meta"
                  onPointerUp={() => {
                    sfx.tap();
                    setShowClue(showClue === i ? null : i);
                  }}
                >
                  {showClue === i ? "hide clue" : "show clue"}
                </button>
              )}
              {showClue === i && clueForLine && (
                <span className="result__clue display">"{clueForLine.text}"</span>
              )}
            </p>
          );
        })}
      </section>

      {/* XP tally */}
      <section className="result__xp">
        <div className="xptally">
          <Row label={`Case ${result.caseId} closed`} value={`+${result.xp.base}`} />
          {result.xp.firstTimeClear > 0 && <Row label="First close" value={`+${result.xp.firstTimeClear}`} />}
          {result.xp.firstTry > 0 && <Row label="First-try accusation" value={`+${result.xp.firstTry}`} />}
          {result.xp.sharpEye > 0 && <Row label="Hint-free (Sharp Eye)" value={`+${result.xp.sharpEye}`} />}
          {result.xp.methodical > 0 && <Row label="Methodical" value={`+${result.xp.methodical}`} />}
          <div className="xptally__total display">
            <span>Total</span>
            <span>+{result.xp.total} XP</span>
          </div>
        </div>
        {bonusBits.length > 0 && (
          <p className="result__earned meta">{bonusBits.join(". ")}. +{result.xp.total} XP.</p>
        )}
      </section>

      {/* Rank-up */}
      {result.rankedUp && (
        <section className="rankup paper grain">
          <div className="rankup__bar">
            <div className="rankup__fill" />
          </div>
          <div className="rankup__title display">
            New rank: <span className="rankup__name">{rank.name}</span>
          </div>
          {newCardName && (
            <div className="rankup__card display">New ID card unlocked: {newCardName}</div>
          )}
        </section>
      )}

      {/* New badges (also toasted, shown here as a summary) */}
      {result.newBadges.length > 0 && (
        <section className="result__badges">
          <h3 className="display">Earned</h3>
          <div className="result__badgerow">
            {result.newBadges.map((b) => {
              const def =
                // small inline lookup
                BADGE_LOOKUP[b];
              return (
                <span key={b} className="result__badgechip">
                  <BadgeGlyph glyph={def.glyph} size={20} />
                  <span className="display">{def.name}</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      <footer className="result__foot">
        <span className="meta">
          {RANKS.findIndex((r) => r.id === rank.id) + 1} of {RANKS.length} ranks · {save?.xp ?? 0} XP total
        </span>
        <div className="result__foot-actions">
          <button
            type="button"
            className="btn"
            onPointerUp={() => {
              sfx.tap();
              closeCaseView();
            }}
          >
            Close the file
          </button>
          {hasNext && (
            <button
              type="button"
              className="btn btn--brass"
              onPointerUp={() => {
                sfx.tap();
                openCase(nextCaseId);
              }}
            >
              Open next case <ChevronRight size={18} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="xptally__row">
      <span>{label}</span>
      <span className="display">{value}</span>
    </div>
  );
}

const BADGE_LOOKUP = Object.fromEntries(BADGES.map((b) => [b.id, b]));
