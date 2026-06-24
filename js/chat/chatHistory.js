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

/**
 * Returns all saved sessions for the current user,
 * sorted newest-first.
 */
export function getAllSessions() {
  return loadRaw().sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Saves the current in-progress conversation to localStorage.
 * Creates a new session or overwrites an existing one by ID.
 * Skips if there are no messages.
 */
export function saveCurrentSession() {
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

  // New session
  const session = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "New Chat",
    preview,
    messages: [...messages],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Keep MAX_SESSIONS limit, removing oldest first
  const trimmed = [session, ...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS);

  saveRaw(trimmed);
  setConversation(session.id);

  return session;
}

/**
 * Loads a saved session by ID.
 * Returns the session object, or null if not found.
 */
export function loadSession(id) {
  const sessions = loadRaw();
  return sessions.find(s => s.id === id) || null;
}

/**
 * Renames a session.
 */
export function renameSession(id, newName) {
  const sessions = loadRaw();
  const idx = sessions.findIndex(s => s.id === id);

  if (idx === -1) return false;

  sessions[idx].name = newName.trim() || "New Chat";
  saveRaw(sessions);

  return true;
}

/**
 * Deletes a session by ID.
 */
export function deleteSession(id) {
  const sessions = loadRaw().filter(s => s.id !== id);
  saveRaw(sessions);

  // If the deleted session was active, reset the active ID
  if (state.chat.currentConversationId === id) {
    setConversation(null);
  }
}

/**
 * Deletes ALL sessions for this user.
 */
export function deleteAllSessions() {
  const key = getUserKey();
  if (!key) return;
  localStorage.removeItem(key);
  setConversation(null);
}

/**
 * Starts a brand-new blank session (resets state ID).
 * Call this after the UI has already cleared the chat DOM.
 */
export function startNewSession() {
  setConversation(null);
  clearMessages();
}
