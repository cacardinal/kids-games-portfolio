// Read-aloud control for the early reader. Toggles between Read aloud / Stop.
// Speech is called ONLY from this tap handler (iOS gesture gating). Additive — the
// app is fully playable without it.
import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speak, stopSpeaking, ttsAvailable } from "../lib/tts";
import { sfx } from "../lib/sfx";
import { COPY } from "../game/content";

export function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  // Stop on unmount or when the text changes (navigation / new card).
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);
  useEffect(() => {
    setSpeaking(false);
    stopSpeaking();
  }, [text]);

  if (!ttsAvailable()) return null;

  const toggle = () => {
    sfx.tap();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text);
      setSpeaking(true);
      // Best-effort: clear the speaking flag when the queue drains.
      const check = window.setInterval(() => {
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          setSpeaking(false);
          window.clearInterval(check);
        }
      }, 400);
    }
  };

  return (
    <button
      className="icon-btn on-parchment"
      aria-label={speaking ? COPY.speakStop : COPY.speakAria}
      onClick={toggle}
    >
      {speaking ? <Square size={20} /> : <Volume2 size={20} />}
    </button>
  );
}
