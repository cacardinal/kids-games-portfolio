import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speak, stopSpeaking, speechAvailable } from "../lib/tts";
import { sfx } from "../lib/sfx";

// SpeakButton — reads a prose block aloud. ONLY fires from this tap handler
// (iOS gesture gating). Shows a stop affordance while speaking. Stops on unmount.
export function SpeakButton({
  text,
  size = "md",
  dark = false,
  onSpoken,
  label = "Read aloud",
}: {
  text: string;
  size?: "md" | "lg";
  dark?: boolean;
  onSpoken?: () => void;
  label?: string;
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // Cleanup: never leave speech running across navigation/unmount.
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (!speaking) return;
    // Poll for completion so the stop icon reverts on its own.
    const id = window.setInterval(() => {
      if (typeof window !== "undefined" && !window.speechSynthesis.speaking) {
        setSpeaking(false);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [speaking]);

  if (!speechAvailable()) return null;

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      sfx.tap();
      return;
    }
    sfx.tap();
    speak(text);
    setSpeaking(true);
    onSpoken?.();
  };

  const Icon = speaking ? Square : Volume2;
  return (
    <button
      type="button"
      className={`speak${size === "lg" ? " speak--lg" : ""}${dark ? " speak--dark" : ""}`}
      data-on={speaking}
      aria-label={speaking ? "Stop reading" : label}
      onClick={toggle}
    >
      <Icon size={size === "lg" ? 24 : 20} aria-hidden="true" />
    </button>
  );
}
