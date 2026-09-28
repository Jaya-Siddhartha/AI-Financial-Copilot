// Reads text aloud with the browser's built-in voice (no network). Helps people who find small
// text hard to read. Does nothing where speech synthesis is unavailable.

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const speak = (text) => {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    // "₹" is often read as nothing; say "rupees" instead.
    String(text).replace(/₹\s?([\d,]+(\.\d+)?)/g, '$1 rupees')
  );
  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  return true;
};

export const stopSpeaking = () => canSpeak() && window.speechSynthesis.cancel();
