import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "../state/store";
import { MISSION_BY_ID } from "../data/missions";
import { LANDMARK_BY_ID } from "../data/landmarks";
import { ROUTE_BY_ID } from "../data/routes";
import { COUNTRY_BY_ISO3, countryName } from "../data/countries";
import type { Mission as MissionT, Region } from "../data/types";
import { classifyHeat, isWarmHalf, HEAT_COPY, continentOf, needsContinentZoom } from "../game/geo";
import { compareWinner, formatMetric, comparativeWord } from "../game/compare";
import { WorldMap, type CountryVisualState, type ZoomTarget } from "../components/WorldMap";
import { StampSetPiece } from "../components/StampSetPiece";
import { ArcFlourish } from "../components/ArcFlourish";
import { SpeakButton } from "../components/SpeakButton";
import { LandmarkSilhouette } from "../components/Silhouettes";
import { CountryShape } from "../components/CountryShape";
import { LocateHint, hasLocateHint } from "../components/Hints";
import { Star } from "../components/Glyphs";
import { sfx } from "../lib/sfx";
import type { Continent } from "../data/types";

const REGION_CONTINENTS: Record<Region, Continent[]> = {
  americas: ["north-america", "south-america"],
  "europe-africa": ["europe", "africa"],
  "asia-oceania": ["asia", "oceania"],
};

export function Mission() {
  const id = useStore((s) => s.activeMissionId);
  const mission = id ? MISSION_BY_ID[id] : null;
  if (!mission) return null;
  // key forces fresh engine state per mission (StrictMode-safe; no leaked timers)
  return <MissionRunner key={mission.id} mission={mission} />;
}

function MissionRunner({ mission }: { mission: MissionT }) {
  const closeMission = useStore((s) => s.closeMission);
  const completeMission = useStore((s) => s.completeMission);
  const markFactRead = useStore((s) => s.markFactRead);
  const existing = useStore((s) => s.save.missions[mission.id]);

  const [stampOpen, setStampOpen] = useState(false);
  // 3D-upgrade: the travel-arc flourish plays between completion and the stamp.
  const [arcOpen, setArcOpen] = useState(false);
  const [earnedStar, setEarnedStar] = useState(false);
  // Fix 3: bumping this key remounts the mission component → a FULL state reset for
  // the wrong-pick redemption replay (revealed/subline/clean refs all reset fresh).
  const [attempt, setAttempt] = useState(0);

  const finish = (star: boolean) => {
    setEarnedStar(star);
    completeMission(mission.id, star, mission.fact, mission.region);
    setArcOpen(true);
  };

  const onArcDone = () => {
    setArcOpen(false);
    setStampOpen(true);
  };

  const onStampDone = () => {
    setStampOpen(false);
    closeMission();
  };

  // Fix 3: "Try again for the star" — restart the same mission immediately.
  // Offered only after a wrong compare pick (stamp shown with no star earned).
  const canReplayForStar =
    mission.type === "compare" && stampOpen && !earnedStar;
  const onReplay = () => {
    setStampOpen(false);
    setEarnedStar(false);
    setAttempt((a) => a + 1);
  };

  return (
    <div className="overlay">
      <div className="overlay__scrim" aria-hidden="true" />
      {mission.type === "compare" ? (
        <CompareMission key={attempt} mission={mission} alreadyDone={!!existing?.completed} onFinish={finish} onClose={closeMission} />
      ) : mission.type === "route" ? (
        <RouteMission mission={mission} onFinish={finish} onClose={closeMission} />
      ) : (
        <FindMission mission={mission} onFinish={finish} onClose={closeMission} />
      )}

      {arcOpen && <ArcFlourish region={mission.region} onDone={onArcDone} />}

      {stampOpen && (
        <StampSetPiece
          region={mission.region}
          type={mission.type}
          star={earnedStar}
          fact={mission.fact}
          onFactRead={() => markFactRead(mission.id)}
          onDone={onStampDone}
          onReplay={canReplayForStar ? onReplay : undefined}
        />
      )}
    </div>
  );
}

// ── Locate + Landmark (shared find loop) ─────────────────────────────────────
function FindMission({
  mission,
  onFinish,
  onClose,
}: {
  mission: Extract<MissionT, { type: "locate" | "landmark" }>;
  onFinish: (star: boolean) => void;
  onClose: () => void;
}) {
  const answerIso3 =
    mission.type === "locate" ? mission.answerIso3 : LANDMARK_BY_ID[mission.landmarkId].countryIso3;
  const landmark = mission.type === "landmark" ? LANDMARK_BY_ID[mission.landmarkId] : null;

  const [misses, setMisses] = useState(0);
  const [priorIso, setPriorIso] = useState<string | undefined>(undefined);
  const [feedback, setFeedback] = useState("");
  const [heatPct, setHeatPct] = useState(50);
  const [breath, setBreath] = useState<"warm" | "cold" | null>(null);
  const [breathKey, setBreathKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [flash, setFlash] = useState<{ iso: string; kind: "wrong" } | null>(null);
  const [zoomedIn, setZoomedIn] = useState(false);
  const cleared = useRef(true); // clean = first tap was correct → star

  // continent of the answer (for the miss-2 auto-zoom and small-target initial zoom)
  const answerContinent = continentOf(answerIso3);

  // If the answer country would render too small at the full region view (larger
  // dim <44px OR minor dim <24px — the latter catches thin slivers like Chile),
  // start at the answer's continent instead — narrows search space without revealing
  // the answer. The existing 2-miss hint zoom (zoomedIn) is preserved as-is.
  const startAtContinent =
    answerContinent && needsContinentZoom(answerIso3, REGION_CONTINENTS[mission.region])
      ? answerContinent
      : null;

  const zoom: ZoomTarget = useMemo(() => {
    if (zoomedIn && answerContinent) {
      // tighter: zoom to the answer's specific continent
      return { continents: [answerContinent], padding: 0.25 };
    }
    if (startAtContinent) {
      return { continents: [startAtContinent], padding: 0.16 };
    }
    return { continents: REGION_CONTINENTS[mission.region], padding: 0.16 };
  }, [zoomedIn, answerContinent, startAtContinent, mission.region]);

  const states = useMemo(() => {
    const out: Record<string, CountryVisualState> = {};
    if (flash) out[flash.iso] = { wrong: true };
    if (revealed) out[answerIso3] = { revealing: true };
    return out;
  }, [flash, revealed, answerIso3]);

  const pulseHeat = (warm: boolean) => {
    setHeatPct(warm ? 78 : 24);
    setBreath(warm ? "warm" : "cold");
    setBreathKey((k) => k + 1);
  };

  const handleTap = (iso3: string) => {
    if (revealed) return;
    if (iso3 === answerIso3) {
      sfx.success();
      const star = cleared.current; // zero wrong taps
      onFinish(star);
      return;
    }
    // wrong tap
    const nextMiss = misses + 1;
    cleared.current = false;
    setMisses(nextMiss);
    setFlash({ iso: iso3, kind: "wrong" });
    window.setTimeout(() => setFlash(null), 240);

    const heat = classifyHeat(iso3, answerIso3, priorIso);
    const warm = isWarmHalf(heat);

    if (nextMiss >= 3) {
      // Reveal (dignified). Stamp without star.
      setRevealed(true);
      setFeedback(`Here it is. ${countryName(answerIso3)}. ${revealFact(mission)}`);
      sfx.collect();
      // brief beat so the pulse is seen before the stamp fires
      window.setTimeout(() => onFinish(false), 1500);
      return;
    }

    if (nextMiss === 2) {
      // auto-zoom to the answer's continent; keep the non-verbal warmth cue
      // moving (the early reader plays on colour) but show the zoom copy as the line.
      setZoomedIn(true);
      pulseHeat(warm);
      setFeedback("Zooming in to help.");
      sfx.select();
    } else {
      setFeedback(HEAT_COPY[heat]);
      pulseHeat(warm);
      if (warm) sfx.tap();
      else sfx.fail();
    }
    setPriorIso(iso3);
  };

  const promptText =
    mission.type === "locate"
      ? mission.prompt
      : `${landmark!.name}. ${landmark!.blurb} Find the country where it stands.`;

  return (
    <div className="mission">
      <div className="mission__map">
        <WorldMap zoom={zoom} states={states} interactive={!revealed} onCountryTap={handleTap} />
        <div className="mapwrap__linen" aria-hidden="true" />
        {breath && (
          <span key={breathKey} className={`warmth-breath is-${breath}`} aria-hidden="true" />
        )}
      </div>

      <div className="mission__card-wrap">
        <div className="mcard">
          <div className="mcard__perf-top" aria-hidden="true" />
          <button className="icon-btn mcard__close" aria-label="Close mission" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
          <div className="mcard__inner mcard__inner--find">
            {/* Pinned head: prompt + warmth gauge never scroll out of view
                (Fix 2 — gauge stays visible at 1024×768 and 1280×800, all variants) */}
            <div className="mcard__pin">
              <div className="mcard__head">
                <div>
                  <div className="mcard__route-no">
                    {mission.type === "locate" ? "Locate" : "Landmark"} · {mission.id.toUpperCase()}
                  </div>
                  <div className="mcard__prompt">
                    {mission.type === "locate" ? mission.prompt : landmark!.name}
                  </div>
                </div>
                {mission.type === "locate" && hasLocateHint(mission.id) && (
                  <span className="mcard__hint-icon" aria-hidden="true">
                    <LocateHint missionId={mission.id} />
                  </span>
                )}
                <SpeakButton text={promptText} size="lg" label="Read the mission aloud" />
              </div>

              <div className="warmth" aria-hidden={misses === 0}>
                <span>Cold</span>
                <span className="warmth__track">
                  <span className="warmth__fill" style={{ ["--heat" as string]: `${heatPct}%` }} />
                </span>
                <span>Hot</span>
              </div>
              <div className={`mfeedback${revealed ? " mfeedback--reveal" : ""}`} aria-live="polite">
                {feedback}
              </div>
            </div>

            {/* Scrolling extras: picture hint + supporting copy give up space first */}
            <div className="mcard__scroll">
              {mission.type === "landmark" && (
                <div className="landmark-figure">
                  <LandmarkSilhouette id={landmark!.id} name={landmark!.name} />
                  <span className="mcard__sub">{landmark!.blurb}</span>
                </div>
              )}

              <div className="mcard__sub">
                {mission.type === "landmark"
                  ? "Find the country where it stands."
                  : "Tap a country on the map."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function revealFact(mission: Extract<MissionT, { type: "locate" | "landmark" }>): string {
  // A short one-fact line for the reveal copy (GDD §5).
  const iso =
    mission.type === "locate" ? mission.answerIso3 : LANDMARK_BY_ID[mission.landmarkId].countryIso3;
  return COUNTRY_BY_ISO3[iso]?.facts[0] ?? "";
}

// ── Route ────────────────────────────────────────────────────────────────────
function RouteMission({
  mission,
  onFinish,
  onClose,
}: {
  mission: Extract<MissionT, { type: "route" }>;
  onFinish: (star: boolean) => void;
  onClose: () => void;
}) {
  const route = ROUTE_BY_ID[mission.routeId];
  const [step, setStep] = useState(0); // next waypoint index
  const [feedback, setFeedback] = useState("");
  const [bounceIso, setBounceIso] = useState<string | null>(null);
  const clean = useRef(true);

  const doneIso = route.waypoints.slice(0, step);
  const nextIso = route.waypoints[step];

  // Zoom to fit the whole route's waypoints before accepting taps.
  const zoom: ZoomTarget = useMemo(
    () => ({ continents: null, isoFit: route.waypoints, padding: 0.22 }),
    [route.waypoints],
  );

  const states = useMemo(() => {
    const out: Record<string, CountryVisualState> = {};
    for (const iso of doneIso) out[iso] = { routeOn: true };
    if (bounceIso) out[bounceIso] = { bounce: true };
    return out;
  }, [doneIso, bounceIso]);

  const handleTap = (iso3: string) => {
    if (step >= route.waypoints.length) return;
    if (iso3 === nextIso) {
      sfx.line();
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep >= route.waypoints.length) {
        setFeedback(`Route traced. ${route.name} complete.`);
        // small beat for the final segment to draw, then stamp
        window.setTimeout(() => onFinish(clean.current), 700);
      } else {
        setFeedback(`${countryName(iso3)}. Next stop.`);
      }
    } else {
      // out-of-order: gentle bounce, forfeit star, hint
      clean.current = false;
      sfx.tap();
      setBounceIso(iso3);
      window.setTimeout(() => setBounceIso(null), 220);
      setFeedback(`The route goes through ${countryName(nextIso)} first.`);
    }
  };

  return (
    <div className="mission">
      <div className="mission__map">
        <WorldMap
          zoom={zoom}
          states={states}
          interactive={step < route.waypoints.length}
          onCountryTap={handleTap}
          routePins={doneIso.map((iso) => ({ iso3: iso }))}
          routePath={doneIso}
        />
        <div className="mapwrap__linen" aria-hidden="true" />
      </div>

      <div className="mission__card-wrap">
        <div className="mcard">
          <div className="mcard__perf-top" aria-hidden="true" />
          <button className="icon-btn mcard__close" aria-label="Close mission" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
          <div className="mcard__inner">
            <div className="mcard__head">
              <div>
                <div className="mcard__route-no">Route · {mission.id.toUpperCase()}</div>
                <div className="mcard__prompt">{route.name}</div>
              </div>
              <SpeakButton
                text={`Follow ${route.name}. ${route.blurb} Tap each country in order.`}
                size="lg"
                label="Read the route aloud"
              />
            </div>
            <div className="mcard__sub">Tap each country in order.</div>
            <ol className="waylist">
              {route.waypoints.map((iso, i) => (
                <li
                  key={iso}
                  className={`wayitem${i < step ? " is-done" : ""}${i === step ? " is-next" : ""}`}
                >
                  <span className="wayitem__no">{i + 1}</span>
                  <span>{countryName(iso)}</span>
                </li>
              ))}
            </ol>
            <div className="mfeedback" aria-live="polite">
              {feedback}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compare ──────────────────────────────────────────────────────────────────
function CompareMission({
  mission,
  alreadyDone,
  onFinish,
  onClose,
}: {
  mission: Extract<MissionT, { type: "compare" }>;
  alreadyDone: boolean;
  onFinish: (star: boolean) => void;
  onClose: () => void;
}) {
  const winner = compareWinner(mission.aIso3, mission.bIso3, mission.metric);
  const other = winner === mission.aIso3 ? mission.bIso3 : mission.aIso3;
  const [revealed, setRevealed] = useState(false);
  const [subline, setSubline] = useState("");
  const finished = useRef(false);

  const a = COUNTRY_BY_ISO3[mission.aIso3];
  const b = COUNTRY_BY_ISO3[mission.bIso3];

  const handlePick = (iso: string) => {
    if (revealed) return;
    setRevealed(true);
    const correct = iso === winner;
    if (correct) sfx.success();
    else sfx.fail();

    if (correct) {
      // Right pick: keep the current star + stamp flow.
      setSubline("You called it.");
    } else {
      // Wrong pick (Fix 3b): acknowledge plainly and TEACH the numbers, then let a
      // ~1.5s beat pass before the stamp lands. No star is earned (correct=false).
      setSubline(
        `${countryName(winner)} ${comparativeWord(mission.metric)}. ` +
          `${formatMetric(winner, mission.metric)} to ${formatMetric(other, mission.metric)}.`,
      );
    }

    if (!finished.current) {
      finished.current = true;
      // Wrong path gets a longer beat so the corrected numbers register before the
      // completion stamp; right path keeps the snappier original timing.
      window.setTimeout(() => onFinish(correct), correct ? 1100 : 1500);
    }
  };

  const renderCard = (iso: string) => {
    const c = COUNTRY_BY_ISO3[iso];
    const peer = iso === mission.aIso3 ? mission.bIso3 : mission.aIso3;
    const isWinner = revealed && iso === winner;
    const isLoser = revealed && iso !== winner;
    return (
      <button
        className={`ccard${revealed ? " is-flipped" : ""}${isWinner ? " is-winner" : ""}${
          isLoser ? " is-loser" : ""
        }`}
        onClick={() => handlePick(iso)}
        aria-label={c.name}
        disabled={revealed}
      >
        <CountryShape iso3={iso} peerIso3={peer} />
        <span className="ccard__name">{c.name}</span>
        <span className="ccard__value">{revealed ? formatMetric(iso, mission.metric) : ""}</span>
        {isWinner && (
          <span className="pass__star" aria-hidden="true">
            <Star size={18} />
          </span>
        )}
      </button>
    );
  };

  const aloud = `${mission.question} ${a.name}, or ${b.name}. Tap one.`;

  return (
    <div className="mission">
      <div className="mission__card-wrap" style={{ alignItems: "center", flex: 1 }}>
        <div className="mcard">
          <div className="mcard__perf-top" aria-hidden="true" />
          <button className="icon-btn mcard__close" aria-label="Close mission" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
          <div className="mcard__inner">
            <div className="mcard__head">
              <div>
                <div className="mcard__route-no">Compare · {mission.id.toUpperCase()}</div>
                <div className="mcard__prompt">{mission.question}</div>
              </div>
              <SpeakButton text={aloud} size="lg" label="Read the question aloud" />
            </div>
            <div className="mcard__sub">{revealed ? "" : "Tap one."}</div>
            <div className="compare">
              <div className="compare__cards">
                {renderCard(mission.aIso3)}
                {renderCard(mission.bIso3)}
              </div>
              <div className="compare__reveal" aria-live="polite">
                {revealed && (
                  <>
                    {/* GDD §5 reveal: "[Winner], [value]. [Other], [value]." */}
                    <div>
                      <b>{countryName(winner)}</b>, {formatMetric(winner, mission.metric)}.{" "}
                      {countryName(other)}, {formatMetric(other, mission.metric)}.
                    </div>
                    <div className="mcard__sub" style={{ marginTop: 4 }}>
                      {subline}
                    </div>
                  </>
                )}
              </div>
            </div>
            {alreadyDone && !revealed && (
              <div className="mcard__sub">Replaying — your first result is already saved.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
