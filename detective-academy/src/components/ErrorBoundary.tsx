import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearSave } from "../lib/storage";

// Root ErrorBoundary (contract §6). Fallback offers "Reset this profile's save" —
// clears ONLY the active profile key, never others. Corrupt state never white-screens.
interface Props {
  children: ReactNode;
  activeProfileId: () => string | null;
  profileName: () => string;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for dev; never surfaced to the player.
    console.error("Detective Academy crashed:", error, info.componentStack);
  }

  handleReset = () => {
    const id = this.props.activeProfileId();
    if (id) clearSave(`kg.detective.v1.${id}`);
    // Hard reload to a clean state.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const name = this.props.profileName();
      return (
        <div className="desk">
          <div className="shell errorfallback">
            <div className="errorfallback__card paper grain">
              <h1>Something in this case file got jammed.</h1>
              <p className="prose">Your other cases are safe.</p>
              <button type="button" className="btn btn--brass" onPointerUp={this.handleReset}>
                Reset this profile's save
              </button>
              <p className="meta">Only {name}'s progress is cleared.</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
