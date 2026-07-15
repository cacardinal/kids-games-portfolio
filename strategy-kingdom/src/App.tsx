// Top-level view router (no React Router — a view enum lives in the store).
import { useStore } from "./state/store";
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
  return (
    <ErrorBoundary>
      <div className="app">
        <Router />
      </div>
    </ErrorBoundary>
  );
}
