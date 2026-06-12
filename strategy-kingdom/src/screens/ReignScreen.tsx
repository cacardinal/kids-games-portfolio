// The Reign screen — the playable board. Orchestrates the resource bar, plot grid,
// Counsel panel (tutorial tips / discoveries / events), the crest banner mood, the
// END TURN button, and the signature ledger resolution overlay.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useStore } from "../state/store";
import type { TurnReport } from "../game/kingdom";
import { SCENARIOS, COPY, type BuildingId, type ResearchId } from "../game/content";
import { turnIndicator, displaySeason } from "../game/display";
import { ResourceBar, type ResourceKey } from "../components/ResourceBar";
import { PlotGrid } from "../components/PlotGrid";
import { CrestBanner } from "../components/CrestBanner";
import { CounselTip, EventCardView, ResearchPanel, ResolutionNote } from "../components/CounselPanel";
import { LedgerOverlay } from "../components/LedgerOverlay";
import { Button } from "../components/Button";
import { SpeakButton } from "../components/SpeakButton";
import { stopSpeaking } from "../lib/tts";

type BannerMood = "rest" | "perk" | "droop";

export function ReignScreen() {
  const reign = useStore((s) => s.reign)!;
  const save = useStore((s) => s.save);
  const dispatch = useStore((s) => s.dispatch);
  const endReignToRecap = useStore((s) => s.endReignToRecap);
  const setView = useStore((s) => s.setView);

  const scenario = SCENARIOS[reign.scenarioId];
  const isTutorial = reign.scenarioId === "tutorial";

  // ── Ephemeral UI state ──
  const [ledgerReport, setLedgerReport] = useState<TurnReport | null>(null);
  const [bannerMood, setBannerMood] = useState<BannerMood>("rest");
  const [justBuilt, setJustBuilt] = useState<Set<number>>(new Set());
  const [rolling, setRolling] = useState<Set<ResourceKey>>(new Set());
  const [eventDealIn, setEventDealIn] = useState(false);
  // Tutorial tips: which turn's tip has been dismissed.
  const [dismissedTip, setDismissedTip] = useState<number>(0);

  // Stop any speech when leaving the screen.
  useEffect(() => () => stopSpeaking(), []);

  // When a fresh event becomes pending (after a resolution), play the deal-in once.
  const prevHadChoice = useRef(false);
  useEffect(() => {
    const has = !!reign.pendingChoice;
    if (has && !prevHadChoice.current && !ledgerReport) {
      setEventDealIn(true);
      const t = window.setTimeout(() => setEventDealIn(false), 260);
      prevHadChoice.current = has;
      return () => window.clearTimeout(t);
    }
    prevHadChoice.current = has;
  }, [reign.pendingChoice, ledgerReport]);

  const blocked = !!reign.pendingChoice;

  function handleEndTurn() {
    if (blocked || ledgerReport) return;
    const before = reign;
    dispatch({ type: "endTurn" });
    // Read the just-produced report from the store's new state.
    const after = useStore.getState().reign;
    if (!after || after === before) return;
    const report = after.log[after.log.length - 1];
    setLedgerReport(report);
    // Banner reacts to the resolved turn.
    setBannerMood(report.foodStatus === "surplus" ? "perk" : report.foodStatus === "deficit" ? "droop" : "rest");
  }

  // The +1-person pip has landed on the People chip — give the count a soft bounce.
  function onGrowthLanded() {
    setRolling(new Set<ResourceKey>(["population"]));
    window.setTimeout(() => setRolling(new Set<ResourceKey>()), 420);
  }

  function onLedgerDone() {
    // Pop completed buildings onto their plots NOW, as the overlay lifts, so the
    // dust/settle beat plays in full view (not behind the ledger scrim).
    if (ledgerReport && ledgerReport.completedBuilds.length) {
      setJustBuilt(new Set(ledgerReport.completedBuilds.map((b) => b.plot)));
      window.setTimeout(() => setJustBuilt(new Set()), 800);
    }
    setLedgerReport(null);
    // Settle the banner back to rest.
    window.setTimeout(() => setBannerMood("rest"), 600);
    // If the reign finished AND there is no pending event to resolve, go to recap.
    const cur = useStore.getState().reign;
    if (cur?.finished && !cur.pendingChoice) {
      endReignToRecap();
    }
  }

  // Acting is locked while the ledger plays.
  const acting = !!ledgerReport;

  const tip = isTutorial && scenario.counsel ? scenario.counsel[reign.turn - 1] : null;
  const showTip = tip && dismissedTip !== reign.turn && !reign.pendingChoice && !acting;

  const goalChips = buildGoalChips(reign);

  return (
    <div className="reign">
      <header className="reign-header stack gap12">
        <div className="top-row">
          <div className="row gap12">
            <Button
              variant="ghost"
              sound="tap"
              onClick={() => {
                stopSpeaking();
                setView("throne");
              }}
              ariaLabel="Back to Throne Room (your reign is saved)"
            >
              <ChevronLeft size={18} /> Throne Room
            </Button>
            <div className="stack" style={{ gap: 0 }}>
              <span className="turn-indicator">{turnIndicator(displaySeason(reign))}</span>
              <span className="meta">
                {scenario.label} ·{" "}
                {reign.finished
                  ? `Reign complete — ${reign.log.length} seasons`
                  : `season ${displaySeason(reign)} of ${scenario.turnLimit}`}
              </span>
            </div>
          </div>
          <div className="goal-chips">{goalChips}</div>
        </div>
        <ResourceBar state={reign} rolling={rolling} />
      </header>

      {/* Board + banner column */}
      <div className="stack gap12" style={{ minWidth: 0 }}>
        <div className="row gap16" style={{ alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PlotGrid
              state={reign}
              justBuilt={justBuilt}
              disabled={acting}
              onBuild={(plot, b: BuildingId) => dispatch({ type: "build", plot, building: b })}
              onAssign={(b) => dispatch({ type: "assignWorker", building: b })}
              onUnassign={(b) => dispatch({ type: "unassignWorker", building: b })}
            />
          </div>
          <div className="stack center" style={{ gap: 4, alignSelf: "flex-start" }}>
            <CrestBanner cosmeticId={save.selectedCosmetic} mood={bannerMood} width={104} />
          </div>
        </div>

        <div className="row gap12 wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Button
            big
            disabled={blocked || acting || reign.finished}
            onClick={handleEndTurn}
            sound="tap"
            ariaLabel={blocked ? COPY.endturnBlocked : COPY.endturnLabel}
          >
            {COPY.endturnLabel}
          </Button>
          {blocked && <span className="muted">{COPY.endturnBlocked}</span>}
        </div>
      </div>

      {/* Counsel column */}
      <aside className="counsel">
        {showTip && <CounselTip text={tip!} onDismiss={() => setDismissedTip(reign.turn)} />}

        {reign.pendingChoice && !acting && (
          <EventCardView
            state={reign}
            dealIn={eventDealIn}
            onChoose={(opt) => {
              dispatch({ type: "chooseEvent", option: opt });
              // If this was the final-turn event of an already-finished reign,
              // resolving it is the last beat — go to the recap.
              const cur = useStore.getState().reign;
              if (cur?.finished && !cur.pendingChoice) {
                endReignToRecap();
              }
            }}
          />
        )}

        {/* The resolution line: when a cap or floor modified the chosen numbers,
            the ledger says so plainly. Cleared by the next season's resolution. */}
        {!reign.pendingChoice && reign.lastResolution && !acting && (
          <ResolutionNote resolution={reign.lastResolution} />
        )}

        {/* Tutorial keeps the early-reader path clean: goal card only, no tech tree.
            Growth/Prosperity surface the Discoveries panel. */}
        {isTutorial ? (
          <GoalCard reign={reign} />
        ) : (
          <ResearchPanel
            state={reign}
            onSelect={(node: ResearchId) => dispatch({ type: "research", node })}
          />
        )}
      </aside>

      {ledgerReport && (
        <LedgerOverlay report={ledgerReport} onDone={onLedgerDone} onGrowthLanded={onGrowthLanded} />
      )}
    </div>
  );
}

function GoalCard({ reign }: { reign: ReturnType<typeof useStore.getState>["reign"] }) {
  if (!reign) return null;
  const sc = SCENARIOS[reign.scenarioId];
  const text = sc.hint;
  return (
    <div className="counsel-card slate">
      <div className="counsel-head">
        <span className="counsel-title" style={{ color: "var(--brass)" }}>
          This Reign
        </span>
        <SpeakButton text={text} />
      </div>
      <p className="counsel-text" style={{ color: "var(--text)" }}>
        {text}
      </p>
    </div>
  );
}

function buildGoalChips(reign: ReturnType<typeof useStore.getState>["reign"]) {
  if (!reign) return null;
  const g = SCENARIOS[reign.scenarioId].goals;
  const chips: { label: string; met: boolean }[] = [];
  if (g.population !== undefined)
    chips.push({ label: `People ${reign.population}/${g.population}`, met: reign.population >= g.population });
  if (g.gold !== undefined)
    chips.push({ label: `Gold ${reign.resources.gold}/${g.gold}`, met: reign.resources.gold >= g.gold });
  if (g.research !== undefined)
    chips.push({
      label: `Discoveries ${reign.researched.length}/${g.research}`,
      met: reign.researched.length >= g.research,
    });
  return chips.map((c, i) => (
    <span key={i} className={`goal-chip ${c.met ? "met" : ""}`}>
      {c.met ? "✓ " : ""}
      {c.label}
    </span>
  ));
}
