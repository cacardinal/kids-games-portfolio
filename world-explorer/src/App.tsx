import { useEffect } from "react";
import "./styles.css";
import { useStore } from "./state/store";
import { ProfilePicker } from "./screens/ProfilePicker";
import { Atlas } from "./screens/Atlas";
import { Mission } from "./screens/Mission";
import { Passport } from "./screens/Passport";
import { Log } from "./screens/Log";
import { Settings } from "./screens/Settings";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installReducedMotionFlag } from "./lib/motion";
import { stopSpeaking } from "./lib/tts";

export default function App() {
  const profile = useStore((s) => s.profile);
  const view = useStore((s) => s.view);
  const largeText = useStore((s) => s.save.largeText);

  // OS reduced-motion → :root[data-reduced] (set-pieces collapse in CSS).
  useEffect(() => installReducedMotionFlag(), []);

  // Large-text accessibility flag (Settings) → :root[data-large].
  useEffect(() => {
    document.documentElement.setAttribute("data-large", String(largeText));
  }, [largeText]);

  // Stop any read-aloud when the view changes (navigation cleanup, iOS).
  useEffect(() => {
    return () => stopSpeaking();
  }, [view]);

  const activeKey = profile ? `kg.world-explorer.v1.${profile}` : null;

  return (
    <ErrorBoundary activeKey={activeKey}>
      <div className="app-shell">
        {profile === null && <ProfilePicker />}
        {profile !== null && (
          <>
            {view === "atlas" && <Atlas />}
            {view === "mission" && (
              <>
                <Atlas />
                <Mission />
              </>
            )}
            {view === "passport" && <Passport />}
            {view === "log" && <Log />}
            {view === "settings" && <Settings />}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
