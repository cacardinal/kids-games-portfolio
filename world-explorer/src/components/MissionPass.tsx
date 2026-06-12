import type { Mission } from "../data/types";
import { LANDMARK_BY_ID } from "../data/landmarks";
import { LocatePin, RouteGlyph, CompareGlyph, Star } from "./Glyphs";
import { LandmarkSilhouette } from "./Silhouettes";
import { sfx } from "../lib/sfx";

const STUB_TINT: Record<Mission["region"], string> = {
  americas: "var(--stamp-americas)",
  "europe-africa": "var(--stamp-europe-africa)",
  "asia-oceania": "var(--stamp-asia-oceania)",
};

const TYPE_LABEL: Record<Mission["type"], string> = {
  locate: "Locate",
  landmark: "Landmark",
  route: "Route",
  compare: "Compare",
};

function StubIcon({ mission }: { mission: Mission }) {
  // Icon-led so the GOAL is legible without reading (GDD §7.2).
  if (mission.type === "landmark") {
    const lm = LANDMARK_BY_ID[mission.landmarkId];
    return <LandmarkSilhouette id={lm.id} name={lm.name} />;
  }
  if (mission.type === "route") return <RouteGlyph />;
  if (mission.type === "compare") return <CompareGlyph />;
  return <LocatePin />;
}

function passTitle(mission: Mission): string {
  switch (mission.type) {
    case "locate":
      return mission.prompt;
    case "landmark":
      return LANDMARK_BY_ID[mission.landmarkId].name;
    case "route":
      return `Trace a route`;
    case "compare":
      return mission.question;
  }
}

export function MissionPass({
  mission,
  completed,
  star,
  onOpen,
}: {
  mission: Mission;
  completed: boolean;
  star: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      className={`pass is-selectable${completed ? " is-complete" : ""}`}
      onClick={() => {
        sfx.select();
        onOpen();
      }}
      aria-label={`${TYPE_LABEL[mission.type]} mission: ${passTitle(mission)}${
        completed ? ", stamped" : ""
      }${star ? ", first-try star" : ""}`}
    >
      <span className="pass__stub" style={{ ["--stub-tint" as string]: STUB_TINT[mission.region] }}>
        <StubIcon mission={mission} />
      </span>
      <span className="pass__perf" aria-hidden="true" />
      <span className="pass__body">
        <span className="pass__type">{TYPE_LABEL[mission.type]}</span>
        <span className="pass__title">{passTitle(mission)}</span>
        <span className="pass__foot">{completed ? "Stamped" : "Tap to begin"}</span>
      </span>
      <span className="pass__status">
        {completed ? (
          star ? (
            <span className="pass__star" title="First-try star">
              <Star size={20} />
            </span>
          ) : (
            <span className="pass__stamped" style={{ color: STUB_TINT[mission.region] }}>
              ✓
            </span>
          )
        ) : null}
      </span>
    </button>
  );
}
