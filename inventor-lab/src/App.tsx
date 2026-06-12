import { useEffect } from "react";
import { useStore } from "./state/store";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProfilePick } from "./screens/ProfilePick";
import { Missions } from "./screens/Missions";
import { BuildBench } from "./screens/BuildBench";
import { Pens } from "./screens/Pens";
import { Log } from "./screens/Log";

export function App() {
  const profile = useStore((s) => s.profile);
  const view = useStore((s) => s.view);
  const pen = useStore((s) => s.save.pen);
  const currentLevel = useStore((s) => s.currentLevel);

  // Keep the --pen CSS var in sync with the selected cosmetic.
  useEffect(() => {
    document.documentElement.style.setProperty("--pen", pen);
  }, [pen]);

  return (
    <ErrorBoundary>
      <div className="app">
        {!profile || view === "profile" ? (
          <ProfilePick />
        ) : view === "missions" ? (
          <Missions />
        ) : view === "build" ? (
          // Key by level so NEXT (level -> level) fully remounts the bench: per-level state resets via
          // mount-time initializers, no manual reset effect needed.
          <BuildBench key={currentLevel ?? "build"} />
        ) : view === "pens" ? (
          <Pens />
        ) : view === "log" ? (
          <Log />
        ) : (
          <Missions />
        )}
      </div>
    </ErrorBoundary>
  );
}
