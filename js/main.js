import { loadSettings } from "./config/persistence.js";
import "./config/debug.js";
/* =========================
   DOM
========================= */

import {
  input,
  sendBtn,
  clearBtn,
  musicBtn,
  micBtn
} from "./utils/dom.js";

/* =========================
   CHAT
========================= */

import { sendMessage } from "./chat/sendMessage.js";
import { sendImage } from "./chat/sendImage.js";
import { clearChat } from "./chat/clearChat.js";
import { render as renderSidebar } from "./ui/sidebar.js";
import { isImageGenerationEnabled } from "./config/selectors.js";

/* =========================
   VOICE
========================= */

import VoiceController from "./voice/index.js";

/* =========================
   THEME
========================= */

import { initializeTheme } from "./ui/themeManager.js";

/* =========================
   UI MODULES
========================= */

import { toggleMusic } from "./ui/musicPlayer.js";
import "./ui/modalManager.js";
import "./ui/profileManager.js";
import "./ui/toolsMenu.js";
import "./ui/mobileMoreMenu.js";
import "./ui/wakeButton.js";
import { initAnimationManager, recordActivity } from "./ui/animationManager.js";
import "./ui/legalModal.js";
import { initLoadingScreen } from "./ui/loadingScreen.js";

import { initializeAuthState } from "./auth/authState.js";

/* =========================
   VOICE INSTANCE
========================= */

const voiceController = new VoiceController({
  onSend: async (message) => {
    input.value = message;
    await sendMessage();
  }
});

/* =========================
   GLOBAL BRIDGE
========================= */

window.sendMessage = sendMessage;

/* =========================
   CHAT EVENTS
========================= */

function setupChatEvents() {
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await dispatchSend();
    }
  });

  sendBtn.addEventListener("click", dispatchSend);

  clearBtn.addEventListener("click", () => {
    clearChat();
    renderSidebar();
  });
}

/* =========================
   SEND DISPATCH
   Image Generation is a persistent mode toggled from the + menu —
   while it's on, Send/Enter route to image generation instead of chat.
========================= */

async function dispatchSend() {
  if (isImageGenerationEnabled()) {
    await sendImage();
  } else {
    await sendMessage();
  }
}

/* =========================
   VOICE EVENTS
========================= */

function setupVoiceEvents() {
  micBtn.addEventListener("click", () => {
    voiceController.toggle();
    // Record activity when user interacts via voice
    recordActivity();
  });
}

/* =========================
   MUSIC EVENTS
========================= */

function setupMusicEvents() {
  musicBtn.addEventListener("click", toggleMusic);
}

/* =========================
   SIDEBAR AUTO-RENAME LISTENER
   chatHistory.js dispatches this event after auto-naming completes
========================= */

function setupSidebarEvents() {
  window.addEventListener("joule:session-renamed", () => {
    renderSidebar();
  });
}

/* =========================
   APP INIT
========================= */

function initializeApp() {
  loadSettings();

  initializeTheme();

  initializeAuthState();

  setupChatEvents();

  setupVoiceEvents();

  setupMusicEvents();

  setupSidebarEvents();

  initAnimationManager();

  initLoadingScreen();

  setTimeout(() => {
    input.blur();
  }, 100);

  console.log("⚡ Joule AI Initialized");
}

/* =========================
   APP CLEANUP
========================= */

function cleanupApp() {
  if (voiceController) {
    voiceController.stop();
  }

  console.log("🛑 Joule AI Shutdown");
}

/* =========================
   STARTUP
========================= */

window.addEventListener("load", initializeApp);

window.addEventListener("beforeunload", cleanupApp);