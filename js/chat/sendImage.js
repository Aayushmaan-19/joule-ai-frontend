import { input, imageBtn } from "../utils/dom.js";
import { addMessage } from "./renderMessage.js";
import { getGeneratedImage } from "../api/imageService.js";
import { smoothScrollToBottom } from "./scrollManager.js";
import { addMessage as storeMessage } from "../config/actions.js";
import {
  saveCurrentSession,
  autoNameSession
} from "./chatHistory.js";
import { render as renderSidebar } from "../ui/sidebar.js";
import state from "../config/state.js";

export async function sendImage() {
  const prompt = input.value.trim();

  if (!prompt || imageBtn.disabled) return;

  addMessage(prompt, "user");
  storeMessage({ role: "user", content: prompt });

  input.value = "";
  imageBtn.disabled = true;

  const botBubble = addMessage("🎨 Generating your image…", "bot");

  try {
    const data = await getGeneratedImage(prompt);

    const imageHtml = `<img class="generated-image" src="${data.image}" alt="${prompt.replace(/"/g, "&quot;")}" />`;
    botBubble.innerHTML = imageHtml;
    smoothScrollToBottom();

    storeMessage({ role: "bot", content: imageHtml });

    const session = saveCurrentSession();
    renderSidebar();

    const sessionId = session?.id || state.chat.currentConversationId;
    const isFirstExchange = state.chat.messages.length === 2;

    if (isFirstExchange && sessionId) {
      autoNameSession(sessionId, prompt).then(() => {
        renderSidebar();
      });
    }

    if (typeof data.remaining === "number") {
      const hint = document.createElement("div");
      hint.className = "usage-hint";
      hint.textContent = `${data.remaining} image${data.remaining === 1 ? "" : "s"} left today`;
      botBubble.appendChild(hint);
    }

  } catch (err) {
    console.error("Image generation failed:", err);

    let displayMessage = `⚠️ ${err.message || "Something went wrong. Please try again."}`;

    if (err.message === "Failed to fetch") {
      displayMessage = "⚠️ Can't reach the server. Is the backend running?";
    }

    botBubble.innerHTML = displayMessage;
  } finally {
    imageBtn.disabled = false;
  }
}
