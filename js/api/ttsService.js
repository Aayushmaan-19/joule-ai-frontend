const NORMAL_PITCH = 1;
const NORMAL_RATE = 1;

const SHINIGAMI_PITCH = 0.75;
const SHINIGAMI_RATE = 0.92;

/**
 * Speaks text using the browser's own Web Speech API — no backend
 * call, no API key, no character quota to run out of. Trade-off:
 * this can't reproduce the old ElevenLabs cloned voice, since the
 * only voices available are whatever's installed on the visitor's
 * own device. Pitch/rate is the one differentiator that's reliable
 * across every browser and OS, so that's what carries the
 * normal/Shinigami distinction now, instead of a different voice ID.
 *
 * Returns the SpeechSynthesisUtterance itself so the caller can
 * listen for "end" (and "error") the same way it used to listen for
 * an <audio> element's "ended".
 */
export async function speakText(text) {
  if (!("speechSynthesis" in window)) {
    throw new Error("Speech synthesis isn't supported in this browser");
  }

  const isShinigami = document.body.classList.contains("shinigami");

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = isShinigami ? SHINIGAMI_PITCH : NORMAL_PITCH;
  utterance.rate = isShinigami ? SHINIGAMI_RATE : NORMAL_RATE;

  speechSynthesis.speak(utterance);

  return utterance;
}
