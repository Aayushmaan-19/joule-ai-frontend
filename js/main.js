import { loadSettings } from "./config/persistence.js";
import "./config/debug.js";
/* =========================
   DOM
========================= */

import {
  input,
  sendBtn,
  clearBtn,
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

import { initMusicPlayer } from "./ui/musicPlayer.js";
import "./ui/keyboardInset.js";
import "./ui/modalManager.js";
import "./ui/profileManager.js";
import "./ui/toolsMenu.js";
import "./ui/gallery.js";
import "./ui/mobileNav.js";
import "./ui/idleHero.js";
import { initAnimationManager } from "./ui/animationManager.js";
import { initRouter } from "./ui/router.js";
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
  });
}

/* =========================
   MUSIC EVENTS
========================= */

function setupMusicEvents() {
  initMusicPlayer();
}

/* =========================
   ADMIN TOOLS
   Loaded only for the sessions that need them: an admin's own session,
   or an "open as user" session (which needs its way back). Everyone else
   never downloads, builds or renders any of it. The backend re-checks
   every admin endpoint, so this is about not shipping the tooling to
   people who can never use it — not about security.
========================= */

function setupAdminTools() {
  window.addEventListener("joule:session", ({ detail }) => {
    if (detail?.isAdmin) {
      import("./admin/adminPanel.js").then(m => m.sync(detail));
    }
    if (detail?.impersonatedBy) {
      import("./admin/impersonation.js").then(m => m.sync(detail));
    }
  });
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

  setupAdminTools();

  initializeAuthState();

  initRouter();

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
   DOMContentLoaded, not window "load" — this is a type="module"
   script, so it already only runs once the DOM is parsed. Waiting
   for the full "load" event on top of that meant the loading screen
   (and the backend wake ping it now kicks off) sat idle until every
   image on the page — avatars, the hero logo, the loading logo
   itself — had finished fetching, instead of starting immediately.
========================= */

document.addEventListener("DOMContentLoaded", initializeApp);

window.addEventListener("beforeunload", cleanupApp);