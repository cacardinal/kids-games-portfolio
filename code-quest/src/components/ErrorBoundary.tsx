import { Component, type ReactNode } from "react";
import { SAVE_KEY, PROFILES } from "../state/save";
import type { ProfileId } from "../state/save";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Root error boundary (shared contract §6). Fallback offers "Reset this operator's progress",
 * which clears ONLY the active profile key, then reloads. Never a white-screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private activeProfile(): ProfileId | null {
    // Read the last-active profile from a lightweight marker (set by App on profile pick).
    try {
      const p = localStorage.getItem("kg.codequest.active");
      if (p && PROFILES.some((x) => x.id === p)) return p as ProfileId;
    } catch {
      /* ignore */
    }
    return null;
  }

  private reset = () => {
    const p = this.activeProfile();
    try {
      if (p) localStorage.removeItem(SAVE_KEY(p));
    } catch {
      /* ignore */
    }
    location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const p = this.activeProfile();
    const name = PROFILES.find((x) => x.id === p)?.name ?? "this operator";
    return (
      <div className="screen error-screen">
        <div className="panel error-card scanlines">
          <div className="statusline alert"><span className="dot" /><span>SYSTEM FAULT</span></div>
          <h1>Telemetry interrupted</h1>
          <p>Something went wrong at the terminal. Your progress is safe on disk.</p>
          <div className="error-actions">
            <button className="btn btn-run" onClick={() => location.reload()}>RELOAD TERMINAL</button>
            <button className="btn btn-stop" onClick={this.reset}>Reset this operator's progress</button>
          </div>
          <p className="error-note">Resetting clears only {name}'s saved progress.</p>
        </div>
      </div>
    );
  }
}
