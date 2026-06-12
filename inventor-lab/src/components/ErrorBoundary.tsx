import { Component, type ReactNode } from "react";
import { useStore, APP_KEY } from "../state/store";

interface Props { children: ReactNode }
interface State { error: Error | null }

// Root error boundary. Fallback offers to reset ONLY the active profile's save, then reload.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <Fallback />;
    }
    return this.props.children;
  }
}

function Fallback() {
  const profile = useStore.getState().profile;
  return (
    <div
      className="col"
      style={{ minHeight: "100%", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}
    >
      <div className="panel col gap-16" style={{ maxWidth: 440, padding: 28 }}>
        <div className="label">SYSTEM FAULT</div>
        <h2 style={{ margin: 0, fontFamily: "var(--mono)" }}>The bench hit a snag</h2>
        <p style={{ margin: 0, color: "var(--chalk-dim)" }}>
          Something went wrong on this screen. Your other work is safe. You can reset this profile's
          bench to recover.
        </p>
        <div className="row gap-12">
          <button
            className="btn btn-primary"
            onClick={() => {
              if (profile) {
                try { localStorage.removeItem(APP_KEY(profile)); } catch { /* ignore */ }
              }
              location.reload();
            }}
          >
            Reset this profile's save
          </button>
          <button className="btn btn-ghost" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
