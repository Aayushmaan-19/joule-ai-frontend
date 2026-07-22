import { input, sendBtn } from "../utils/dom.js";
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
import { auth } from "../auth/firebase.js";
import { openModal, openVerificationFlow } from "../ui/modalManager.js";

const DOWNLOAD_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>`;

// Reads the MIME type straight out of the data URL Pollinations
// actually returned, rather than assuming a fixed format — correct
// regardless of which image format is behind it.
function extensionForDataUrl(dataUrl) {
  const mimeType = dataUrl.slice(5, dataUrl.indexOf(";"));

  switch (mimeType) {
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    default: return "jpg";
  }
}

export async function sendImage() {
  const prompt = input.value.trim();

  if (!prompt || sendBtn.disabled) return;

  const user = auth.currentUser;

  if (!user) {
    openModal();
    return;
  }

  if (!user.emailVerified) {
    openVerificationFlow(user.email);
    return;
  }

  addMessage(prompt, "user");
  storeMessage({ role: "user", content: prompt });

  input.value = "";
  sendBtn.disabled = true;

  const botBubble = addMessage("🎨 Generating your image…", "bot");

  try {
    const data = await getGeneratedImage(prompt);

    const extension = extensionForDataUrl(data.image);
    const filename = `joule-image-${Date.now()}.${extension}`;

    const imageHtml = `<div class="generated-image-wrapper"><img class="generated-image" src="${data.image}" alt="${prompt.replace(/"/g, "&quot;")}" /><a class="image-download-btn" href="${data.image}" download="${filename}">${DOWNLOAD_ICON_SVG}Download</a></div>`;
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
    sendBtn.disabled = false;
  }
}
