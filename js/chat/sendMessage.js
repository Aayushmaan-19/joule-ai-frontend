import {
  input
}
from "../utils/dom.js";

import {
  addMessage
}
from "./renderMessage.js";

import {
  getAIReply
}
from "../api/aiService.js";

import {
  renderMarkdown
}
from "../utils/markdown.js";

import {
  sleep
}
from "../utils/helpers.js";

import {
  smoothScrollToBottom
}
from "./scrollManager.js";

import {
  addMessage as storeMessage
}
from "../config/actions.js";

export async function sendMessage() {

  const value =
    input.value.trim();

  if (!value) return;

  addMessage(
    value,
    "user"
  );

  // Store in state so history can be saved
  storeMessage({ role: "user", content: value });

  input.value = "";

  const botBubble =
    addMessage(
      "",
      "bot"
    );

  try {

    const data =
      await getAIReply(
        value
      );

    const words =
      data.reply.split(" ");

    let current = "";

    for (const word of words) {

      current += word + " ";

      botBubble.innerHTML =
        renderMarkdown(
          current.trim()
        );

      smoothScrollToBottom();

      await sleep(35);
    }

    const finalReply = current.trim();

    // Store the completed AI reply in state
    storeMessage({ role: "bot", content: finalReply });

    if (typeof data.remaining === "number" && data.remaining <= 3) {
      botBubble.innerHTML += `<div class="usage-hint">${data.remaining} message${data.remaining === 1 ? "" : "s"} left</div>`;
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
