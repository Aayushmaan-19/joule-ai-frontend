import { input } from "../utils/dom.js";
import { addMessage } from "./renderMessage.js";
import { getAIReply } from "../api/aiService.js";
import { renderMarkdown } from "../utils/markdown.js";
import { sleep } from "../utils/helpers.js";
import { smoothScrollToBottom } from "./scrollManager.js";
import { addMessage as storeMessage } from "../config/actions.js";
import {
  saveCurrentSession,
  autoNameSession
} from "./chatHistory.js";
import { render as renderSidebar } from "../ui/sidebar.js";
import state from "../config/state.js";

export async function sendMessage() {
  const value = input.value.trim();

  if (!value) return;

  addMessage(value, "user");
  storeMessage({ role: "user", content: value });

  input.value = "";

  const botBubble = addMessage("", "bot");

  try {
    const data = await getAIReply(value);

    const words = data.reply.split(" ");
    let current = "";

    for (const word of words) {
      current += word + " ";
      botBubble.innerHTML = renderMarkdown(current.trim());
      smoothScrollToBottom();
      await sleep(35);
    }

    const finalReply = current.trim();

    storeMessage({ role: "bot", content: finalReply });

    const session = saveCurrentSession();
    renderSidebar();

    const sessionId = session?.id || state.chat.currentConversationId;
    const isFirstExchange = state.chat.messages.length === 2;

    if (isFirstExchange && sessionId) {
      autoNameSession(sessionId, value).then(() => {
        renderSidebar();
      });
    }

    if (typeof data.remaining === "number" && data.remaining <= 3) {
      const hint = document.createElement("div");
      hint.className = "usage-hint";
      hint.textContent = `${data.remaining} message${data.remaining === 1 ? "" : "s"} left today`;
      botBubble.appendChild(hint);
    }

  } catch (err) {
    console.error("Chat request failed:", err);

    let displayMessage = `⚠️ ${err.message || "Something went wrong. Please try again."}`;

    if (err.message === "Failed to fetch") {
      displayMessage = "⚠️ Can't reach the server. Is the backend running?";
    }

    botBubble.innerHTML = displayMessage;
  }
}