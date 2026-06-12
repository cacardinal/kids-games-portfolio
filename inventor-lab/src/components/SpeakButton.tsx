import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speak, stopSpeaking, ttsAvailable } from "../lib/tts";
import { sfx } from "../lib/sfx";

// Read-aloud button (additive only). While speaking, shows a stop affordance. iOS gesture-gated:
// only ever called from a tap handler. Cancels speech on unmount.
export function SpeakButton({ text, large = false }: { text: string; large?: boolean }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  // Poll the speech queue so the stop affordance disappears when narration ends.
  useEffect(() => {
    if (!speaking) return;
    const t = setInterval(() => {
      if (typeof window !== "undefined" && !window.speechSynthesis?.speaking) {
        setSpeaking(false);
      }
    }, 250);
    return () => clearInterval(t);
  }, [speaking]);

  if (!ttsAvailable()) return null;

  const size = large ? 52 : 44;

  if (speaking) {
    return (
      <button
        className="btn btn-ghost no-select"
        aria-label="Stop"
        style={{ minHeight: size, minWidth: size, padding: 0, width: size, height: size }}
        onClick={() => {
          sfx.tap();
          stopSpeaking();
          setSpeaking(false);
        }}
      >
        <Square size={large ? 24 : 20} fill="currentColor" />
      </button>
    );
  }

  return (
    <button
      className="btn no-select"
      aria-label="Read aloud"
      style={{
        minHeight: size,
        minWidth: size,
        padding: 0,
        width: size,
        height: size,
        borderColor: "rgba(76,201,240,0.5)",
        color: "#d8f4ff",
      }}
      onClick={() => {
        sfx.tap();
        speak(text);
        setSpeaking(true);
      }}
    >
      <Volume2 size={large ? 24 : 20} />
    </button>
  );
}
