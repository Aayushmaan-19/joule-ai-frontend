import { auth } from "../auth/firebase.js";
import { escHtml } from "../utils/helpers.js";
import { subscribeConversations } from "./conversationsService.js";
import { openThread, getOpenThreadUid } from "./threadView.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";
const TYPING_FRESH_MS = 4000; // matches how long the thread itself treats a typing ping as live

const TICK_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12l4 4 8-9M12 15l1 1 8-9"/></svg>';

const list = document.getElementById("conversationsList");
const emptyEl = document.getElementById("conversationsEmpty");
const noMatchEl = document.getElementById("conversationsNoMatch");
const searchInput = document.getElementById("conversationsSearch");
const railMsgDot = document.getElementById("peopleRailMsgDot");

let conversations = [];
let stop = null;
let seenIds = new Set();
let filter = "";
let typingTimer = null;

searchInput.addEventListener("input", () => {
  filter = searchInput.value.trim().toLowerCase();
  render();
});

export function initConversationsView() {
  if (stop) return;
  stop = subscribeConversations(rows => {
    conversations = rows;
    render();
  });
  window.addEventListener("joule:thread-changed", syncActiveRow);
}

export function destroyConversationsView() {
  if (stop) stop();
  stop = null;
  window.removeEventListener("joule:thread-changed", syncActiveRow);
  clearTimeout(typingTimer);
  conversations = [];
  seenIds = new Set();
  filter = "";
  searchInput.value = "";
  list.innerHTML = "";
  emptyEl.classList.add("hidden");
  noMatchEl.classList.add("hidden");
  railMsgDot?.classList.add("hidden");
}

function syncActiveRow() {
  const openUid = getOpenThreadUid();
  list.querySelectorAll(".conversation-row").forEach(row => {
    row.classList.toggle("is-active", !!openUid && row.dataset.uid === openUid);
  });
}

function isUnread(convo, myUid) {
  const last = convo.lastMessage;
  return !!last && !last.deleted && last.senderUid !== myUid && last.sentAt > convo.lastReadByMe;
}

function isTyping(convo) {
  return convo.otherTypingAt > 0 && Date.now() - convo.otherTypingAt < TYPING_FRESH_MS;
}

function render() {
  const myUid = auth.currentUser?.uid;
  const shown = filter
    ? conversations.filter(c => c.otherName.toLowerCase().includes(filter))
    : conversations;

  emptyEl.classList.toggle("hidden", conversations.length > 0);
  noMatchEl.classList.toggle("hidden", conversations.length === 0 || shown.length > 0);
  railMsgDot?.classList.toggle("hidden", !conversations.some(c => isUnread(c, myUid)));

  list.innerHTML = shown.map(c => rowHtml(c, !seenIds.has(c.id), myUid)).join("");
  seenIds = new Set(conversations.map(c => c.id));

  list.querySelectorAll(".conversation-row").forEach(row => {
    const convo = conversations.find(c => c.id === row.dataset.id);
    if (!convo) return;

    const open = () => openThread(convo.otherUid, { displayName: convo.otherName, avatar: convo.otherAvatar });
    row.addEventListener("click", open);
    row.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });

  syncActiveRow();

  // A typing ping expires on its own with no new snapshot to say so.
  clearTimeout(typingTimer);
  if (conversations.some(isTyping)) typingTimer = setTimeout(render, TYPING_FRESH_MS + 200);
}

function formatListTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const dayStart = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayStart(new Date()) - dayStart(d)) / 86400000);

  if (days <= 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function previewHtml(convo, myUid) {
  if (isTyping(convo)) return `<span class="conversation-preview-typing">typing…</span>`;

  const last = convo.lastMessage;
  if (!last) return "Say hello 👋";
  if (last.deleted) return "Message deleted";

  if (last.senderUid === myUid) {
    const read = convo.lastReadByOther >= last.sentAt;
    return `<span class="conversation-tick ${read ? "is-read" : ""}">${TICK_SVG}</span>You: ${escHtml(last.text)}`;
  }
  return escHtml(last.text);
}

function rowHtml(convo, isNew, myUid) {
  const unread = isUnread(convo, myUid);

  return `
    <div class="conversation-row ${isNew ? "conversation-row-new" : ""} ${unread ? "conversation-row-unread" : ""}" data-id="${escHtml(convo.id)}" data-uid="${escHtml(convo.otherUid)}" role="button" tabindex="0">
      <img class="conversation-avatar" src="${escHtml(convo.otherAvatar || DEFAULT_AVATAR)}" alt="" />
      <div class="conversation-body">
        <div class="conversation-name">${escHtml(convo.otherName)}</div>
        <div class="conversation-preview">${previewHtml(convo, myUid)}</div>
      </div>
      <div class="conversation-meta">
        <span class="conversation-time">${escHtml(formatListTime(convo.lastMessage?.sentAt || convo.updatedAt))}</span>
        ${unread ? `<span class="conversation-unread" role="img" aria-label="Unread"></span>` : ""}
      </div>
    </div>
  `;
}
