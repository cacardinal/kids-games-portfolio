// The Throne Room — scenario select (with ranks + lock state), the waving banner
// with selectable cosmetics, the badge shelf, mute, profile switch, and resume.
import { Volume2, VolumeX, ChevronLeft } from "lucide-react";
import {
  useStore,
  PROFILES,
  scenarioUnlocked,
  type ProfileId,
  type CompletedReignRecord,
} from "../state/store";
import {
  SCENARIOS,
  SCENARIO_ORDER,
  COSMETICS,
  COSMETIC_ORDER,
  BADGES,
  BADGE_ORDER,
  RANK_NAMES,
  COPY,
  type ScenarioId,
} from "../game/content";
import { displaySeason } from "../game/display";
import { CrestBanner } from "../components/CrestBanner";
import { RankSeal } from "../components/RankSeal";
import { Button } from "../components/Button";
import { sfx } from "../lib/sfx";

export function ThroneRoom() {
  const save = useStore((s) => s.save);
  const profile = useStore((s) => s.profile) as ProfileId;
  const reign = useStore((s) => s.reign);
  const startReign = useStore((s) => s.startReign);
  const resumeReign = useStore((s) => s.resumeReign);
  const viewCompletedRecap = useStore((s) => s.viewCompletedRecap);
  const exitProfile = useStore((s) => s.exitProfile);
  const toggleMute = useStore((s) => s.toggleMute);
  const selectCosmetic = useStore((s) => s.selectCosmetic);
  const resetProfile = useStore((s) => s.resetProfile);

  const me = PROFILES.find((p) => p.id === profile)!;

  return (
    <div className="throne">
      <div className="throne-head">
        <div className="row gap12">
          <Button variant="ghost" sound="tap" onClick={exitProfile} ariaLabel="Switch player">
            <ChevronLeft size={18} /> Players
          </Button>
          <span className="monogram" style={{ background: me.color, width: 44, height: 44, fontSize: 20 }}>
            {me.name[0]}
          </span>
          <h1 style={{ color: "var(--brass)" }}>{COPY.throneTitle}</h1>
        </div>
        <button
          className="icon-btn"
          onClick={toggleMute}
          aria-label={save.muted ? COPY.muteOff : COPY.muteOn}
        >
          {save.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <div className="row gap16 wrap" style={{ alignItems: "flex-start" }}>
        <div className="stack center" style={{ gap: 6 }}>
          <CrestBanner cosmeticId={save.selectedCosmetic} width={120} />
          <span className="meta">{COSMETICS[save.selectedCosmetic].name}</span>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            Rule {me.name}'s kingdom across three reigns. Grow your people, fill the treasury, make
            discoveries — and earn your seal.
          </p>
          {/* A finished reign lives in `reign` while its recap is viewable — it is
              never resumable, so it never renders as in-progress here. */}
          {reign && !reign.finished && (
            <div className="slate pad mt8 row gap12 wrap" style={{ alignItems: "center" }}>
              <div className="stack" style={{ flex: 1 }}>
                <strong className="display" style={{ fontSize: 18 }}>
                  {SCENARIOS[reign.scenarioId].label} in progress
                </strong>
                <span className="meta">
                  Season {displaySeason(reign)} · {reign.population} people
                </span>
              </div>
              <Button big onClick={resumeReign} sound="select">
                Resume
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="section-label">Reigns</div>
      <div className="scenario-cards">
        {SCENARIO_ORDER.map((id) => (
          <ScenarioCard
            key={id}
            id={id}
            unlocked={scenarioUnlocked(save, id)}
            bestRank={save.bestRank[id]}
            bestScore={save.bestScore[id]}
            onStart={() => startReign(id)}
            onViewRecap={() => viewCompletedRecap(id)}
            inProgress={reign?.scenarioId === id && !reign.finished}
            completed={save.completedReigns?.[id]}
          />
        ))}
      </div>

      <div className="section-label">Banners</div>
      <div className="cosmetic-row">
        {COSMETIC_ORDER.map((cid) => {
          const c = COSMETICS[cid];
          const owned = save.cosmetics.includes(cid);
          const selected = save.selectedCosmetic === cid;
          return (
            <button
              key={cid}
              className={`cos-chip ${selected ? "selected" : ""} ${owned ? "" : "locked"}`}
              disabled={!owned}
              onClick={() => {
                if (!owned) return;
                sfx.tap();
                selectCosmetic(cid);
              }}
              aria-label={owned ? `Use ${c.name} banner` : `${c.name} — locked. ${c.unlock}`}
            >
              <span className="cos-swatch" style={{ background: c.field, borderColor: c.trim }} />
              {c.name}
              {!owned && <span className="meta"> · locked</span>}
            </button>
          );
        })}
      </div>

      <div className="section-label">Badges</div>
      <div className="shelf">
        {BADGE_ORDER.map((bid) => {
          const b = BADGES[bid];
          const earned = save.badges.includes(bid);
          return (
            <div key={bid} className={`badge-medallion ${earned ? "" : "locked"}`}>
              <span className="seal" style={{ width: 34, height: 34, fontSize: 9 }} aria-hidden>
                ★
              </span>
              <span className="stack">
                <span className="bm-name">{b.name}</span>
                <span className="bm-desc">{b.desc}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt24">
        <Button
          variant="ghost"
          sound="tap"
          onClick={() => {
            if (confirm("Reset this kingdom? All reigns, banners, and badges for this player are cleared.")) {
              resetProfile();
            }
          }}
        >
          {COPY.saveReset}
        </Button>
      </div>
    </div>
  );
}

function ScenarioCard({
  id,
  unlocked,
  bestRank,
  bestScore,
  inProgress,
  completed,
  onStart,
  onViewRecap,
}: {
  id: ScenarioId;
  unlocked: boolean;
  bestRank?: keyof typeof RANK_NAMES;
  bestScore?: number;
  inProgress: boolean;
  completed?: CompletedReignRecord;
  onStart: () => void;
  onViewRecap: () => void;
}) {
  const sc = SCENARIOS[id];

  if (completed) {
    return (
      <div className={`scenario-card parchment`}>
        <div className="row gap8" style={{ alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div className="sc-title display">{sc.label}</div>
            <div className="sc-goal" style={{ color: "var(--brass)" }}>
              Reign complete — {completed.seasons} seasons
            </div>
            <div className="sc-rank">
              {RANK_NAMES[completed.rank]}
              {bestScore !== undefined ? ` · ${bestScore} pts` : ""}
            </div>
          </div>
          <RankSeal rank={completed.rank} size={52} />
        </div>
        <div className="mt8 row gap8 wrap">
          <Button variant="secondary" sound="tap" onClick={onViewRecap}>
            View recap
          </Button>
          <Button
            sound="select"
            onClick={() => {
              if (
                confirm(
                  `Start a new reign of ${sc.label}? Your finished reign will be replaced, but your best score and rank are kept.`,
                )
              ) {
                onStart();
              }
            }}
          >
            Play again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`scenario-card parchment ${unlocked ? "" : "locked"}`}>
      <div className="sc-title display">{sc.label}</div>
      <div className="sc-goal">{sc.hint}</div>
      <div className="meta" style={{ color: "var(--ink-soft)" }}>
        {sc.turnLimit} seasons
      </div>
      {bestRank ? (
        <div className="sc-rank">
          Best: {RANK_NAMES[bestRank]} · {bestScore} pts
        </div>
      ) : (
        <div className="meta" style={{ color: "var(--ink-soft)" }}>
          No reign yet
        </div>
      )}
      <div className="mt8">
        {unlocked ? (
          <Button onClick={onStart} sound="select" disabled={inProgress}>
            {inProgress ? "In progress" : bestRank ? "Reign again" : "Begin reign"}
          </Button>
        ) : (
          <span className="meta" style={{ color: "var(--seal-red)" }}>
            {COPY.throneLocked}
          </span>
        )}
      </div>
    </div>
  );
}
