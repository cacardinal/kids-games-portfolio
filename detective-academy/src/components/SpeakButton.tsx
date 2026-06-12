import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { speak, stopSpeaking, ttsAvailable } from "../lib/tts";
import { sfx } from "../lib/sfx";

// Read-aloud control. Only fires from a tap (iOS gesture gating). A visible stop
// affordance appears while speaking. Stops on unmount (cleanup contract §8).
export function SpeakButton({
  text,
  onDark = false,
  label = "Read aloud",
}: {
  text: string;
  onDark?: boolean;
  label?: string;
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Poll speechSynthesis.speaking so the stop affordance clears when it finishes.
  useEffect(() => {
    if (!speaking) return;
    const iv = window.setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (!window.speechSynthesis.speaking) setSpeaking(false);
      }
    }, 300);
    return () => window.clearInterval(iv);
  }, [speaking]);

  if (!ttsAvailable()) return null;

  const fire = () => {
    sfx.tap();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(text);
    setSpeaking(true);
  };

  // This button often sits inside larger interactive rows (e.g. clue-pick rows);
  // speaking must never activate the parent, so both activation paths stop propagation.
  return (
    <button
      className={`speak${onDark ? " speak--onDark" : ""}`}
      onPointerUp={(e) => {
        e.stopPropagation();
        fire();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          fire();
        }
      }}
      aria-label={speaking ? "Stop" : label}
      aria-pressed={speaking}
      type="button"
    >
      {speaking ? <Square size={15} /> : <Volume2 size={15} />}
      <span className="speak__txt">{speaking ? "Stop" : ""}</span>
    </button>
  );
}
