import { auth } from "../auth/firebase.js";
import state from "../config/state.js";
import { setConversation, clearMessages } from "../config/actions.js";

const STORAGE_KEY_PREFIX = "joule_chats_";
const MAX_SESSIONS = 50;

function getUserKey() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

function loadRaw() {
  const key = getUserKey();
  if (!key) return [];

  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveRaw(sessions) {
  const key = getUserKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(sessions));
}

export function getAllSessions() {
  return loadRaw().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveCurrentSession() {
  // Single guard point: private chats are never written to storage,
  // no matter which of the app's several call sites triggered this
  // (send, image gen, new chat, load, logout, beforeunload, clear).
  if (state.chat.isPrivate) return null;

  const messages = state.chat.messages;

  if (!messages || messages.length === 0) return null;

  const sessions = loadRaw();
  const existingId = state.chat.currentConversationId;

  const firstUserMsg = messages.find(m => m.role === "user");
  const preview = firstUserMsg
    ? firstUserMsg.content.slice(0, 80)
    : "New Chat";

  if (existingId) {
    const idx = sessions.findIndex(s => s.id === existingId);

    if (idx !== -1) {
      sessions[idx] = {
        ...sessions[idx],
        messages: [...messages],
        preview,
        updatedAt: Date.now()
      };

      saveRaw(sessions);
      return sessions[idx];
    }
  }

  const session = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "New Chat",
    preview,
    messages: [...messages],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const trimmed = [session, ...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS);

  saveRaw(trimmed);
  setConversation(session.id);

  return session;
}

export async function autoNameSession(sessionId, firstUserMessage) {
  if (!sessionId) return;

  const sessions = loadRaw();
  const idx = sessions.findIndex(s => s.id === sessionId);

  if (idx === -1) return;

  if (sessions[idx].name !== "New Chat") return;

  try {
    const response = await fetch("https://joule-ai-backend.onrender.com/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Give this conversation a title in 4 words or less. No quotes, no punctuation, no explanation. Just the title. The conversation started with: "${firstUserMessage.slice(0, 120)}"`,
        history: []
      })
    });

    if (!response.ok) return;

    const data = await response.json();
    const rawName = data.reply?.trim();

    if (!rawName) return;

    const cleanName = rawName
      .replace(/[*_`#"']/g, "")
      .replace(/[.!?]$/, "")
      .trim()
      .slice(0, 40);

    if (cleanName.length < 2) return;

    sessions[idx].name = cleanName;
    saveRaw(sessions);

    window.dispatchEvent(new CustomEvent("joule:session-renamed"));

  } catch {
  }
}

export function loadSession(id) {
  const sessions = loadRaw();
  return sessions.find(s => s.id === id) || null;
}

export function renameSession(id, newName) {
  const sessions = loadRaw();
  const idx = sessions.findIndex(s => s.id === id);

  if (idx === -1) return false;

  sessions[idx].name = newName.trim() || "New Chat";
  saveRaw(sessions);

  return true;
}

export function deleteSession(id) {
  const sessions = loadRaw().filter(s => s.id !== id);
  saveRaw(sessions);

  if (state.chat.currentConversationId === id) {
    setConversation(null);
  }
}

export function deleteAllSessions() {
  const key = getUserKey();
  if (!key) return;
  localStorage.removeItem(key);
  setConversation(null);
}

export function startNewSession() {
  setConversation(null);
  clearMessages();
}