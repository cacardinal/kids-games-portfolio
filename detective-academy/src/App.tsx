import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PROFILES, storageKey, useStore } from "./state/store";
import { ProfilePicker } from "./screens/ProfilePicker";
import { CaseBoard } from "./screens/CaseBoard";
import { CaseView } from "./screens/CaseView";
import { ResultScreen } from "./screens/ResultScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ToastHost } from "./components/ToastHost";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ensurePaperGrain } from "./lib/grain";
import { detectWebGL } from "./components/office3d/webgl";

// Code-split: three.js only downloads when WebGL is actually available.
const OfficeBackdrop = lazy(() =>
  import("./components/office3d/OfficeBackdrop").then((m) => ({ default: m.OfficeBackdrop })),
);

export function App() {
  const view = useStore((s) => s.view);
  const save = useStore((s) => s.save);
  const profileId = useStore((s) => s.profileId);
  const failPulse = useStore((s) => s.failPulse);

  // inject paper grain once
  useEffect(() => {
    ensurePaperGrain();
  }, []);

  // Story email-sync/03 — live re-hydration. When the external sync engine rewrites THIS
  // profile's save while the game is open, reload it through the store's own load path.
  // window.kgSync is absent in local dev, so this event simply never fires.
  const hydrateActiveProfile = useStore((s) => s.hydrateActiveProfile);
  useEffect(() => {
    function onSyncUpdate(e: Event) {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      const id = useStore.getState().profileId;
      if (id && key === storageKey(id)) hydrateActiveProfile();
    }
    window.addEventListener("kg-sync:updated", onSyncUpdate);
    return () => window.removeEventListener("kg-sync:updated", onSyncUpdate);
  }, [hydrateActiveProfile]);

  // apply per-profile text size to <html>
  const textSize = save?.settings.textSize ?? "standard";
  useEffect(() => {
    document.documentElement.setAttribute("data-textsize", textSize);
  }, [textSize]);

  // 3D office backdrop (story 3d-upgrade/05): behind the DOM UI on the three
  // play screens; feature-detected — without WebGL the flat .desk look stands.
  const webglOk = useMemo(() => detectWebGL(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const backdropView =
    view === "board" || view === "case" || view === "result" ? view : null;
  const show3d = webglOk && backdropView !== null;

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
      <div className={`desk${dip ? " desk--dip" : ""}${show3d ? " desk--3d" : ""}`}>
        {show3d && backdropView && (
          <Suspense fallback={null}>
            <OfficeBackdrop view={backdropView} reducedMotion={reducedMotion} />
          </Suspense>
        )}
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
