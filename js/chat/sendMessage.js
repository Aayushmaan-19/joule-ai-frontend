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
import { isBackendAwake } from "../config/selectors.js";

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

  if (!isBackendAwake()) {
    const nudge = "😴 I'm still asleep — tap \"Wake Me Up\" below to get started!";
    addMessage(nudge, "bot");
    storeMessage({ role: "bot", content: nudge });
    return;
  }

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
    // headings, lists). The previous hard innerHTML swap here was the
    // actual source of the "pop" — it replaced the animating chunks
    // instantly with zero transition, often within milliseconds of
    // streaming starting on a fast reply. Wrapping the final render in
    // the same fade used for chunks keeps the settle-into-markdown
    // moment smooth instead of an abrupt cut.
    botBubble.classList.remove("streaming");

    const finalWrap = document.createElement("div");
    finalWrap.className = "final-reply";
    finalWrap.innerHTML = renderMarkdown(finalReply);
    botBubble.innerHTML = "";
    botBubble.appendChild(finalWrap);

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
