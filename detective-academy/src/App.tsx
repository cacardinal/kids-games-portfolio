import { useEffect, useRef, useState } from "react";
import { PROFILES, useStore } from "./state/store";
import { ProfilePicker } from "./screens/ProfilePicker";
import { CaseBoard } from "./screens/CaseBoard";
import { CaseView } from "./screens/CaseView";
import { ResultScreen } from "./screens/ResultScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ToastHost } from "./components/ToastHost";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ensurePaperGrain } from "./lib/grain";

export function App() {
  const view = useStore((s) => s.view);
  const save = useStore((s) => s.save);
  const profileId = useStore((s) => s.profileId);
  const failPulse = useStore((s) => s.failPulse);

  // inject paper grain once
  useEffect(() => {
    ensurePaperGrain();
  }, []);

  // apply per-profile text size to <html>
  const textSize = save?.settings.textSize ?? "standard";
  useEffect(() => {
    document.documentElement.setAttribute("data-textsize", textSize);
  }, [textSize]);

  // lamp "dip" on failure (GDD §4.11) — transient class on the desk
  const [dip, setDip] = useState(false);
  const lastPulse = useRef(failPulse);
  useEffect(() => {
    if (failPulse !== lastPulse.current) {
      lastPulse.current = failPulse;
      setDip(true);
      const t = window.setTimeout(() => setDip(false), 220);
      return () => window.clearTimeout(t);
    }
  }, [failPulse]);

  return (
    <ErrorBoundary
      activeProfileId={() => profileId}
      profileName={() => PROFILES.find((p) => p.id === profileId)?.name ?? "this profile"}
    >
      <div className={`desk${dip ? " desk--dip" : ""}`}>
        {view === "profile" && <ProfilePicker />}
        {view === "board" && <CaseBoard />}
        {view === "case" && <CaseView />}
        {view === "result" && <ResultScreen />}
        {view === "settings" && <SettingsScreen />}
        <ToastHost />
      </div>
    </ErrorBoundary>
  );
}
