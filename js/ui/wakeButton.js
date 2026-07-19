import { wakeBtn, wakeBtnEmoji, wakeBtnLabel } from "../utils/dom.js";
import { addMessage } from "../chat/renderMessage.js";
import { setBackendAwake } from "../config/actions.js";
import { isBackendAwake } from "../config/selectors.js";
import { WAKE_API_URL } from "../utils/constants.js";
import { getTokenOptional } from "../auth/getToken.js";

async function wakeBackend() {
  if (isBackendAwake() || wakeBtn.disabled) return;

  wakeBtn.disabled = true;
  wakeBtnEmoji.textContent = "⏳";
  wakeBtnLabel.textContent = "Waking...";

  // A real bot-style bubble, but never stored in chat history — this
  // is just infrastructure feedback, not a conversation turn.
  const statusBubble = addMessage("Waking Up…", "bot");
  statusBubble.classList.add("wake-status");

  try {
    const token = await getTokenOptional();

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Its own dedicated endpoint — proves auth, Firestore, and Groq
    // are all reachable without spending a real chat message or
    // sharing the chat-traffic rate limiter. See Backend/Routes/wake.js.
    const response = await fetch(WAKE_API_URL, {
      method: "POST",
      headers
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    setBackendAwake(true);

    statusBubble.textContent = "Woke Up ✅";
    wakeBtnEmoji.textContent = "✅";
    wakeBtnLabel.textContent = "Awake";

  } catch (err) {
    console.error("Wake ping failed:", err);

    statusBubble.textContent = "⚠️ Couldn't wake the server — tap to try again.";
    wakeBtn.disabled = false;
    wakeBtnEmoji.textContent = "🌙";
    wakeBtnLabel.textContent = "Wake Me Up";
  }
}

wakeBtn.addEventListener("click", wakeBackend);
