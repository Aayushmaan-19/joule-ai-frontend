import { TTS_URL, NORMAL_VOICE_ID, SHINIGAMI_VOICE_ID } from "../utils/constants.js";

export async function speakText(text) {
  const isShinigami = document.body.classList.contains("shinigami");

  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voiceId: isShinigami ? SHINIGAMI_VOICE_ID : NORMAL_VOICE_ID
    })
  });

  if (!response.ok) throw new Error("TTS failed");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  audio.play();

  return audio;
}
