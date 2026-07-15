// Globe3D — the Atlas centerpiece. Feature-detects WebGL and guards the canvas
// with a local error boundary; either failure path renders the `fallback`
// (the original flat WorldMap) so the game stays fully playable without 3D.
// Frames pause when the tab is hidden or the Atlas is behind a mission overlay,
// and drop to demand-only under prefers-reduced-motion.
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { GlobeScene, type GlobeFocus } from "./globe/GlobeScene";
import type { CountryPick } from "./globe/pick";

export type { GlobeFocus };

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Local boundary: a crashed canvas downgrades to the flat map instead of
// bubbling to the app-level boundary (which offers a save reset — overkill).
class GlobeErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Globe3D failed; using the flat map:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const GLOBE_ARIA_LABEL =
  "World globe. Drag to spin. Tap a country to explore it. You can also use the country picker.";

export function Globe3D({
  visited,
  selectedIso3,
  focus,
  active,
  reduced,
  onExplore,
  fallback,
}: {
  visited: Set<string>;
  selectedIso3: string | null;
  focus: GlobeFocus | null;
  /** false while another screen/overlay covers the Atlas — rendering pauses. */
  active: boolean;
  reduced: boolean;
  onExplore: (iso3: string, name: string) => void;
  fallback: ReactNode;
}) {
  const hasWebgl = useMemo(() => webglAvailable(), []);
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!hasWebgl) return <>{fallback}</>;

  const frameloop = hidden || !active ? "never" : reduced ? "demand" : "always";

  const onPick = (pick: CountryPick | null) => {
    if (pick) onExplore(pick.iso3, pick.name);
    else onExplore("", ""); // ocean tap clears the explore label
  };

  return (
    <GlobeErrorBoundary fallback={fallback}>
      <div className="globewrap" role="img" aria-label={GLOBE_ARIA_LABEL}>
        <Canvas
          camera={{ position: [0, 0, 3.2], fov: 42 }}
          dpr={[1, 2]}
          frameloop={frameloop}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute("aria-label", GLOBE_ARIA_LABEL);
            gl.domElement.setAttribute("role", "img");
          }}
        >
          <GlobeScene
            visited={visited}
            selectedIso3={selectedIso3}
            focus={focus}
            reduced={reduced}
            onPick={onPick}
          />
        </Canvas>
      </div>
    </GlobeErrorBoundary>
  );
}
