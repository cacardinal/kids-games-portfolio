import { useEffect } from "react";
import { useStore, APP_KEY } from "./state/store";
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

  // When the external sync module rewrites the ACTIVE profile's key mid-session, re-read its save
  // via the store's existing load path. No-op when kgSync is absent (event never fires).
  useEffect(() => {
    const onSync = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      const s = useStore.getState();
      if (s.profile && key === APP_KEY(s.profile)) s.hydrateActive();
    };
    window.addEventListener("kg-sync:updated", onSync);
    return () => window.removeEventListener("kg-sync:updated", onSync);
  }, []);

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
