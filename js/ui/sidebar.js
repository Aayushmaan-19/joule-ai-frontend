import { auth } from "../auth/firebase.js";
import { chat as chatEl } from "../utils/dom.js";
import {
  getAllSessions,
  saveCurrentSession,
  loadSession,
  renameSession,
  deleteSession,
  deleteAllSessions,
  startNewSession
} from "../chat/chatHistory.js";
import { addMessage } from "../chat/renderMessage.js";
import { addMessage as storeMessage, setConversation, clearMessages } from "../config/actions.js";
import { renderMarkdown } from "../utils/markdown.js";
import state from "../config/state.js";

let sidebarEl = null;
let isOpen = false;

/* =========================================================
   INIT
========================================================= */

export function initSidebar() {
  if (sidebarEl) return;

  buildDOM();
  render();

  window.addEventListener("beforeunload", () => {
    saveCurrentSession();
  });
}

export function destroySidebar() {
  if (!sidebarEl) return;

  sidebarEl.remove();
  sidebarEl = null;
  isOpen = false;

  document.getElementById("app")?.classList.remove("sidebar-visible");
}

/* =========================================================
   DOM BUILD
========================================================= */

function buildDOM() {
  sidebarEl = document.createElement("div");
  sidebarEl.id = "chatSidebar";
  sidebarEl.className = "chat-sidebar";
  sidebarEl.setAttribute("aria-label", "Chat history");

  sidebarEl.innerHTML = `
    <div class="sidebar-header">
      <span class="sidebar-title">Chats</span>

      <div class="sidebar-header-actions">
        <button class="sidebar-action-btn" id="sidebarNewBtn" title="New chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        <button class="sidebar-action-btn" id="sidebarCollapseBtn" title="Close sidebar">
          <span class="sidebar-close-icon"></span>
        </button>

        <button class="sidebar-action-btn sidebar-danger-btn" id="sidebarClearAllBtn" title="Delete all history">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="sidebar-list" id="sidebarList"></div>
  `;

  const appEl = document.getElementById("app");
  appEl.insertBefore(sidebarEl, appEl.firstChild);

  sidebarEl.querySelector("#sidebarNewBtn").addEventListener("click", handleNew);
  sidebarEl.querySelector("#sidebarCollapseBtn").addEventListener("click", close);
  sidebarEl.querySelector("#sidebarClearAllBtn").addEventListener("click", handleClearAll);

  appEl.addEventListener("click", e => {
    if (isOpen && e.target === appEl) close();
  });

}

/* =========================================================
   RENDER SESSION LIST
========================================================= */

export function render() {
  if (!sidebarEl) return;

  const listEl = sidebarEl.querySelector("#sidebarList");
  const sessions = getAllSessions();
  const activeId = state.chat.currentConversationId;

  if (sessions.length === 0) {
    listEl.innerHTML = `
      <div class="sidebar-empty">
        <p>No saved chats yet.</p>
        <p>Start a conversation and it'll<br>appear here automatically.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = "";

  for (const session of sessions) {
    const item = document.createElement("div");
    item.className = "sidebar-item" + (session.id === activeId ? " sidebar-item-active" : "");
    item.dataset.id = session.id;

    const date = formatDate(session.updatedAt);
    const preview = session.preview || "";

    item.innerHTML = `
      <div class="sidebar-item-content" data-id="${session.id}">
        <div class="sidebar-item-name-row">
          <span class="sidebar-item-name" title="${escHtml(session.name)}">${escHtml(session.name)}</span>
          <span class="sidebar-item-date">${date}</span>
        </div>
        <div class="sidebar-item-preview">${escHtml(preview)}</div>
      </div>

      <div class="sidebar-item-actions">
        <button class="sidebar-item-btn sidebar-rename-btn" data-id="${session.id}" title="Rename">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        <button class="sidebar-item-btn sidebar-delete-btn" data-id="${session.id}" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    `;

    item.querySelector(".sidebar-item-content").addEventListener("click", () => {
      handleLoad(session.id);
    });

    item.querySelector(".sidebar-rename-btn").addEventListener("click", e => {
      e.stopPropagation();
      handleRename(session.id, item);
    });

    item.querySelector(".sidebar-delete-btn").addEventListener("click", e => {
      e.stopPropagation();
      handleDelete(session.id);
    });

    listEl.appendChild(item);
  }
}

/* =========================================================
   ACTIONS
========================================================= */

function handleNew() {
  saveCurrentSession();
  chatEl.innerHTML = "";
  startNewSession();
  render();
}

function handleLoad(id) {
  saveCurrentSession();

  const session = loadSession(id);
  if (!session) return;

  chatEl.innerHTML = "";
  clearMessages();
  setConversation(id);

  for (const msg of session.messages) {
    const bubble = addMessage(
      msg.role === "bot" ? renderMarkdown(msg.content) : msg.content,
      msg.role
    );
    storeMessage(msg);
  }

  render();
}

function handleDelete(id) {
  deleteSession(id);
  render();
}

function handleClearAll() {
  const confirmed = window.confirm("Delete all chat history? This can't be undone.");
  if (!confirmed) return;

  deleteAllSessions();
  chatEl.innerHTML = "";
  startNewSession();
  render();
}

function handleRename(id, itemEl) {
  const nameSpan = itemEl.querySelector(".sidebar-item-name");
  const currentName = nameSpan.textContent;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "sidebar-rename-input";
  input.value = currentName;
  input.maxLength = 40;

  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  function commit() {
    const newName = input.value.trim() || "New Chat";
    renameSession(id, newName);
    render();
  }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = currentName; input.blur(); }
  });
}

/* =========================================================
   OPEN / CLOSE / TOGGLE
========================================================= */

export function open() {
  if (!sidebarEl) return;
  isOpen = true;
  document.getElementById("app")?.classList.add("sidebar-visible");
}

export function close() {
  if (!sidebarEl) return;
  isOpen = false;
  document.getElementById("app")?.classList.remove("sidebar-visible");
}

export function toggle() {
  isOpen ? close() : open();
}

export { toggle as toggleSidebar };

/* =========================================================
   HELPERS
========================================================= */

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "2-digit" : undefined
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}