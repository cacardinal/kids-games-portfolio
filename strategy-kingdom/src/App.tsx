// Top-level view router (no React Router — a view enum lives in the store).
import { useEffect } from "react";
import { useStore, profileStorageKey } from "./state/store";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProfilePicker } from "./screens/ProfilePicker";
import { ThroneRoom } from "./screens/ThroneRoom";
import { ReignScreen } from "./screens/ReignScreen";
import { RecapScreen } from "./screens/RecapScreen";

function Router() {
  const view = useStore((s) => s.view);
  const profile = useStore((s) => s.profile);
  const reign = useStore((s) => s.reign);

  if (!profile || view === "profile") return <ProfilePicker />;
  if (view === "reign" && reign) return <ReignScreen />;
  if (view === "recap") return <RecapScreen />;
  return <ThroneRoom />;
}

export default function App() {
  const profile = useStore((s) => s.profile);
  const hydrateFromStorage = useStore((s) => s.hydrateFromStorage);

  // Live cloud-sync pull while the game is open: re-hydrate the active profile's
  // save in place (no navigation) when a `kg-sync:updated` event names its key.
  useEffect(() => {
    if (!profile) return;
    const key = profileStorageKey(profile);
    const onUpdate = (e: Event) => {
      if ((e as CustomEvent<{ key?: string }>).detail?.key === key) hydrateFromStorage();
    };
    window.addEventListener("kg-sync:updated", onUpdate);
    return () => window.removeEventListener("kg-sync:updated", onUpdate);
  }, [profile, hydrateFromStorage]);

  return (
    <ErrorBoundary>
      <div className="app">
        <Router />
      </div>
    </ErrorBoundary>
  );
}
