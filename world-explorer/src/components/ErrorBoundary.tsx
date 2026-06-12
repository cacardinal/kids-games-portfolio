import { Component, type ReactNode } from "react";
import { clearSave } from "../lib/storage";

// Root error boundary (shared contract §6). Fallback offers a reset that clears
// ONLY the active profile key, never a white screen.
interface Props {
  activeKey: string | null;
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("World Explorer crashed:", error);
  }

  handleReset = () => {
    if (this.props.activeKey) clearSave(this.props.activeKey);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <div className="errbound">
            <h1>Something went sideways.</h1>
            <p className="meta">You can reset this profile's save to continue.</p>
            <button className="btn" onClick={this.handleReset}>
              Reset this profile's save
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
