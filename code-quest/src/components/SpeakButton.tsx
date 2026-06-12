import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speak, stopSpeaking, ttsAvailable } from "../lib/tts";

/**
 * Reads a prose block aloud (shared contract §5). Additive only — never auto-narrates.
 * Shows a visible stop affordance while speaking. iOS-safe (sentence-chunked in tts.ts).
 */
export function SpeakButton({ text, label = "Read aloud" }: { text: string; label?: string }) {
  const [speaking, setSpeaking] = useState(false);

  // Stop speech if this control unmounts mid-utterance.
  useEffect(() => {
    return () => {
      if (speaking) stopSpeaking();
    };
  }, [speaking]);

  // Poll speechSynthesis so the stop affordance disappears when speech finishes naturally.
  useEffect(() => {
    if (!speaking) return;
    const iv = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window && !window.speechSynthesis.speaking) {
        setSpeaking(false);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [speaking]);

  if (!ttsAvailable()) return null;

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text);
      setSpeaking(true);
    }
  };

  return (
    <button
      type="button"
      className={`icon-btn speak-btn${speaking ? " active" : ""}`}
      aria-label={speaking ? "Stop reading" : label}
      onClick={toggle}
    >
      {speaking ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
    </button>
  );
}
