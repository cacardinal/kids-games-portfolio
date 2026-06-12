import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Gavel, Lightbulb } from "lucide-react";
import { useStore } from "../state/store";
import { mulberry32 } from "../lib/rng";
import { SpeakButton } from "../components/SpeakButton";
import { ClueCard } from "../components/ClueCard";
import { SuspectCard } from "../components/SuspectCard";
import { Notebook } from "../components/Notebook";
import { AccuseModal } from "../components/AccuseModal";
import { CaseClosedStamp } from "../components/CaseClosedStamp";
import { stopSpeaking } from "../lib/tts";
import { sfx } from "../lib/sfx";

// Per-card resting jitter (±0.5°), frozen per card per case via a seeded stream so
// cards don't re-jitter on every render (GDD §4.11).
function useJitter(caseId: number, count: number): number[] {
  return useMemo(() => {
    const rng = mulberry32(caseId * 7919 + 13);
    return Array.from({ length: count }, () => (rng() - 0.5) * 1.0); // ±0.5°
  }, [caseId, count]);
}

export function CaseView() {
  const activeCase = useStore((s) => s.activeCase);
  const session = useStore((s) => s.session);
  const caseTab = useStore((s) => s.caseTab);
  const setCaseTab = useStore((s) => s.setCaseTab);
  const clearSuspect = useStore((s) => s.clearSuspect);
  const requestHint = useStore((s) => s.requestHint);
  const submitAccusation = useStore((s) => s.submitAccusation);
  const closeCaseView = useStore((s) => s.closeCaseView);
  const finishCaseClosed = useStore((s) => s.finishCaseClosed);

  const [accuseOpen, setAccuseOpen] = useState(false);
  // The CASE CLOSED set-piece plays before the result screen.
  const [closing, setClosing] = useState<{ culpritName: string } | null>(null);

  // stop any speech when leaving this screen (cleanup contract §8)
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const clueJitter = useJitter(activeCase?.id ?? 0, activeCase?.clues.length ?? 0);
  const suspectJitter = useJitter((activeCase?.id ?? 0) + 1, activeCase?.suspects.length ?? 0);

  // Track which clue card was first-opened (for paper sfx; harmless if unused).
  const openedClues = useRef<Set<string>>(new Set());

  if (!activeCase || !session) return null;

  const onFirstOpen = (clueId: string) => {
    openedClues.current.add(clueId);
  };

  const handleSubmitAccusation = (suspectId: string, clueIds: string[]) => {
    const res = submitAccusation(suspectId, clueIds);
    if (res.ok) {
      // close the modal and play the set-piece; the store already set view='result',
      // but we intercept by showing the stamp overlay first.
      const culprit = activeCase.suspects.find((s) => s.id === activeCase.culpritId);
      setAccuseOpen(false);
      setClosing({ culpritName: culprit?.name ?? "They" });
    }
    return res;
  };

  // After the set-piece, transition to the result screen and flush queued toasts.
  const finishSetPiece = () => {
    setClosing(null);
    finishCaseClosed();
  };

  const tabs: { id: "briefing" | "evidence" | "suspects"; label: string }[] = [
    { id: "briefing", label: "Briefing" },
    { id: "evidence", label: "Evidence" },
    { id: "suspects", label: "Suspects" },
  ];

  const clearedCount = session.clearedIds.length;
  const innocentCount = activeCase.suspects.length - 1;

  return (
    <div className="shell caseview">
      <header className="caseview__head">
        <button
          type="button"
          className="btn btn--ghost caseview__back"
          onPointerUp={() => {
            sfx.tap();
            closeCaseView();
          }}
        >
          <ChevronLeft size={18} /> Case board
        </button>
        <div className="caseview__title-wrap">
          <span className="caseview__casenum meta">Case {activeCase.id} · Tier {activeCase.tier}</span>
          <h1 className="caseview__title">{activeCase.title}</h1>
        </div>
      </header>

      <div className="tabrow caseview__tabs" role="tablist" aria-label="Case sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={caseTab === t.id}
            className="tab"
            onPointerUp={() => {
              sfx.tap();
              setCaseTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="caseview__panel">
        {caseTab === "briefing" && (
          <section className="briefing paper grain">
            <div className="briefing__head">
              <span className="briefing__stamp display">CONFIDENTIAL</span>
              <SpeakButton text={activeCase.intro} />
            </div>
            <p className="briefing__text prose">{activeCase.intro}</p>
            <p className="briefing__cta meta">
              Read the evidence, clear who couldn't have done it, then accuse with two clues.
            </p>
          </section>
        )}

        {caseTab === "evidence" && (
          <section className="evidence">
            <div className="cluegrid">
              {activeCase.clues.map((clue, i) => (
                <ClueCard
                  key={clue.id}
                  clue={clue}
                  rotation={clueJitter[i] ?? 0}
                  highlighted={session.hintFocusClueId === clue.id}
                  onFirstOpen={onFirstOpen}
                />
              ))}
            </div>
          </section>
        )}

        {caseTab === "suspects" && (
          <section className="suspects">
            {clearedCount === 0 && (
              <p className="suspects__lead meta">
                Read the evidence first. Then decide who couldn't have done it.
              </p>
            )}
            <div className="suspectgrid">
              {activeCase.suspects.map((s, i) => (
                <SuspectCard
                  key={s.id}
                  caseData={activeCase}
                  suspect={s}
                  rotation={suspectJitter[i] ?? 0}
                  cleared={session.clearedIds.includes(s.id)}
                  citedClueId={session.clearedVia[s.id]}
                  highlightClueId={session.hintFocusClueId}
                  onClear={clearSuspect}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Hint panel text */}
      {session.hintText && (
        <div className="hintpanel paper grain" role="status">
          <span className="hintpanel__icon">
            <Lightbulb size={18} />
          </span>
          <p className="hintpanel__text">{session.hintText}</p>
          <SpeakButton text={session.hintText} />
        </div>
      )}

      {/* Footer: cleared counter + hint + accuse */}
      <footer className="caseview__foot">
        <span className="caseview__cleared display">
          {clearedCount} of {innocentCount} cleared
        </span>
        <div className="caseview__foot-actions">
          <button
            type="button"
            className="btn"
            onPointerUp={() => {
              sfx.tap();
              requestHint();
            }}
            disabled={session.hintStep >= 3}
          >
            <Lightbulb size={18} />
            {session.hintStep >= 3 ? "Inference shown" : "Hint"}
          </button>
          <button
            type="button"
            className="btn btn--brass btn--accuse"
            onPointerUp={() => {
              sfx.tap();
              setAccuseOpen(true);
            }}
          >
            <Gavel size={18} /> Accuse
          </button>
        </div>
      </footer>

      <Notebook
        caseData={activeCase}
        clearedIds={session.clearedIds}
        clearedVia={session.clearedVia}
      />

      {accuseOpen && (
        <AccuseModal
          caseData={activeCase}
          onClose={() => setAccuseOpen(false)}
          onSubmit={handleSubmitAccusation}
        />
      )}

      {closing && (
        <CaseClosedStamp culpritName={closing.culpritName} onContinue={finishSetPiece} />
      )}
    </div>
  );
}
