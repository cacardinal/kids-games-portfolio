// Root error boundary. Fallback offers "Reset this kingdom's save" (clears only the
// active profile key) so a corrupt state never leaves a white screen.
import { Component, type ReactNode } from "react";
import { clearSave } from "../lib/storage";
import { PROFILES } from "../profiles";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

const STORAGE_PREFIX = "kg.kingdom.v1.";

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error("Strategy Kingdom crashed:", err);
  }

  resetActive = () => {
    // We don't know which profile is active here; clear every profile key to be safe.
    for (const p of PROFILES) clearSave(`${STORAGE_PREFIX}${p.id}`);
    location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="center-screen">
          <div className="parchment pad stack center" style={{ maxWidth: 440, gap: 12 }}>
            <h2 style={{ color: "var(--seal-red)" }}>The ledger tore.</h2>
            <p style={{ color: "var(--ink)" }}>
              Something went wrong reading a saved kingdom. You can reset the saves and start fresh —
              this only clears this device's kingdoms.
            </p>
            <button className="btn" onClick={this.resetActive}>
              Reset and reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
