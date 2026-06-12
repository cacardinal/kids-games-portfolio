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
