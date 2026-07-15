import { useEffect } from "react";
import { useStore } from "./state/store";
import { ProfilePicker } from "./screens/ProfilePicker";
import { MissionMap } from "./screens/MissionMap";
import { MissionScreen } from "./screens/MissionScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toast } from "./components/Toast";

export default function App() {
  const view = useStore((s) => s.view);
  const profile = useStore((s) => s.profile);

  // Persist a lightweight marker of the active profile so the ErrorBoundary can scope a reset.
  useEffect(() => {
    try {
      if (profile) localStorage.setItem("kg.codequest.active", profile);
    } catch {
      /* ignore */
    }
  }, [profile]);

  // Re-hydrate the active profile's save when a cloud sync rewrites its storage key.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key;
      const p = useStore.getState().profile;
      if (p && key === `kg.codequest.v1.${p}`) useStore.getState().hydrateActiveProfile();
    };
    window.addEventListener("kg-sync:updated", onUpdate);
    return () => window.removeEventListener("kg-sync:updated", onUpdate);
  }, []);

  return (
    <ErrorBoundary>
      <div className="app-shell">
        {view === "profile" && <ProfilePicker />}
        {view === "map" && <MissionMap />}
        {view === "mission" && <MissionScreen />}
        {view === "profileScreen" && <ProfileScreen />}
        <Toast />
      </div>
    </ErrorBoundary>
  );
}
