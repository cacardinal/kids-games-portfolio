const available = typeof window !== "undefined" && "speechSynthesis" in window;
export function speak(text: string) {
  if (!available) return;
  window.speechSynthesis.cancel(); // iOS stuck-queue guard
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    // sentence chunks: iOS long-utterance bug
    const u = new SpeechSynthesisUtterance(s);
    u.rate = 0.95; // no voice selection — getVoices() is unreliable on iOS
    window.speechSynthesis.speak(u);
  }
}
export function stopSpeaking() {
  if (available) window.speechSynthesis.cancel();
}
export function ttsAvailable() {
  return available;
}
