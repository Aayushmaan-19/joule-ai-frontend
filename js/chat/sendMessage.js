import { input } from "../utils/dom.js";
import { addMessage } from "./renderMessage.js";
import { getAIReply } from "../api/aiService.js";
import { renderMarkdown } from "../utils/markdown.js";
import { smoothScrollToBottom } from "./scrollManager.js";
import { addMessage as storeMessage } from "../config/actions.js";
import {
  saveCurrentSession,
  autoNameSession
} from "./chatHistory.js";
import { render as renderSidebar } from "../ui/sidebar.js";
import state from "../config/state.js";

const THINKING_HTML = `
  <div class="typing">
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
`;

export async function sendMessage() {
  const value = input.value.trim();

  if (!value) return;

  addMessage(value, "user");
  storeMessage({ role: "user", content: value });

  input.value = "";

  const botBubble = addMessage(THINKING_HTML, "bot");
  let isFirstChunk = true;

  try {
    const data = await getAIReply(value, (delta) => {
      if (isFirstChunk) {
        botBubble.innerHTML = "";
        botBubble.classList.add("streaming");
        isFirstChunk = false;
      }

      const span = document.createElement("span");
      span.className = "stream-chunk";
      span.textContent = delta;
      botBubble.appendChild(span);

      smoothScrollToBottom();
    });

    const finalReply = data.reply.trim();

    // Raw streamed text has no markdown formatting applied (bold,
    // headings, lists) — one clean pass now that the full reply is
    // stable replaces it with properly rendered HTML.
    botBubble.classList.remove("streaming");
    botBubble.innerHTML = renderMarkdown(finalReply);

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
