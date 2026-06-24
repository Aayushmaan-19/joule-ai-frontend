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
import { clearChat } from "./chat/clearChat.js";
import { render as renderSidebar } from "./ui/sidebar.js";

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
import "./ui/animationManager.js";
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
      await sendMessage();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  clearBtn.addEventListener("click", () => {
    clearChat();
    renderSidebar();
  });
}

/* =========================
   VOICE EVENTS
========================= */

function setupVoiceEvents() {
  micBtn.addEventListener("click", () => {
    voiceController.toggle();
  });
}

/* =========================
   MUSIC EVENTS
========================= */

function setupMusicEvents() {
  musicBtn.addEventListener("click", toggleMusic);
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

window.addEventListener(
  "beforeunload",
  cleanupApp
);