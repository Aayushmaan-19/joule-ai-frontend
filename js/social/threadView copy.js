import { auth } from "../auth/firebase.js";
import { escHtml } from "../utils/helpers.js";
import { pushPanel } from "./peopleSection.js";
import { conversationIdFor } from "./conversationsService.js";
import { subscribeMessages } from "./messagesService.js";
import { sendMessage } from "./socialApi.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

const header = document.getElementById("threadHeader");
const messagesEl = document.getElementById("threadMessages");
const input = document.getElementById("threadInput");
const sendBtn = document.getElementById("threadSendBtn");

let stopMessages = null;
let otherUid = null;
let confirmed = [];
let pending = []; // { tempId, text, sentAt, failed }
let renderedIds = new Set();
let tempCounter = 0;

sendBtn.addEventListener("click", handleSend);
input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSend();
  }
});

/**
 * Opens (or re-opens) the thread with `otherUid`. `otherInfo` is only
 * used for the header while the live listener attaches — once
 * messages arrive, nothing here depends on it being accurate.
 */
export function openThread(uidToOpen, otherInfo = {}) {
  otherUid = uidToOpen;
  confirmed = [];
  pending = [];
  renderedIds = new Set();

  header.innerHTML = `
    <img class="thread-avatar" src="${escHtml(otherInfo.avatar || DEFAULT_AVATAR)}" alt="" />
    <span class="thread-name">${escHtml(otherInfo.displayName || "Joule User")}</span>
  `;

  messagesEl.innerHTML = "";
  pushPanel("threadPanel", otherInfo.displayName || "Message");

  const conversationId = conversationIdFor(otherUid);

  if (stopMessages) stopMessages();
  stopMessages = subscribeMessages(conversationId, handleConfirmedMessages);

  setTimeout(() => input.focus(), 250);
}

export function closeThreadView() {
  if (stopMessages) stopMessages();
  stopMessages = null;
  otherUid = null;
  confirmed = [];
  pending = [];
  input.value = "";
}

function handleConfirmedMessages(messages) {
  confirmed = messages;

  // Drop any pending entry that's now confirmed (FIFO match by text,
  // sent by me) so it doesn't render twice.
  for (const msg of messages) {
    if (msg.senderUid !== auth.currentUser?.uid) continue;

    const idx = pending.findIndex(p => !p.failed && p.text === msg.text);
    if (idx !== -1) pending.splice(idx, 1);
  }

  render();
}

function render() {
  const myUid = auth.currentUser?.uid;
  const wasAtBottom =
    messagesEl.scrollHeight - messagesEl.scrollTop <= messagesEl.clientHeight + 40;

  const combined = [
    ...confirmed.map(m => ({ ...m, key: m.id })),
    ...pending.map(p => ({ ...p, key: p.tempId, senderUid: myUid, isPending: true }))
  ];

  if (combined.length === 0) {
    messagesEl.innerHTML = `<div class="people-empty">Say hello 👋</div>`;
    renderedIds = new Set();
    return;
  }

  messagesEl.innerHTML = combined.map(msg => bubbleHtml(msg, myUid)).join("");
  renderedIds = new Set(combined.map(m => m.key));

  messagesEl.querySelectorAll(".thread-msg-retry").forEach(btn => {
    btn.addEventListener("click", () => retry(btn.dataset.tempId));
  });

  if (wasAtBottom) {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

function bubbleHtml(msg, myUid) {
  const mine = msg.senderUid === myUid;
  const isNew = !renderedIds.has(msg.key);
  const time = new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  let meta = time;
  if (msg.isPending && msg.failed) {
    meta = `<button class="thread-msg-retry" type="button" data-temp-id="${escHtml(msg.tempId)}">Failed — tap to retry</button>`;
  } else if (msg.isPending) {
    meta = "Sending…";
  }

  return `
    <div class="thread-msg ${mine ? "thread-msg-mine" : "thread-msg-theirs"} ${isNew ? "thread-msg-new" : ""}">
      <div class="thread-msg-bubble ${msg.isPending ? "thread-msg-pending" : ""} ${msg.failed ? "thread-msg-failed" : ""}">${escHtml(msg.text)}</div>
      <div class="thread-msg-time">${meta}</div>
    </div>
  `;
}

function handleSend() {
  const text = input.value.trim();
  if (!text || !otherUid) return;

  input.value = "";

  const tempId = `tmp-${++tempCounter}`;
  pending.push({ tempId, text, sentAt: Date.now(), failed: false });
  render();

  dispatchSend(tempId, otherUid, text);
}

async function dispatchSend(tempId, toUid, text) {
  try {
    await sendMessage(toUid, text);
    // Confirmation removes the pending entry via handleConfirmedMessages
    // once the live listener catches up — nothing else to do here.
  } catch (err) {
    const entry = pending.find(p => p.tempId === tempId);
    if (entry) {
      entry.failed = true;
      render();
    }
    console.error("Send failed:", err.message);
  }
}

function retry(tempId) {
  const entry = pending.find(p => p.tempId === tempId);
  if (!entry || !otherUid) return;

  entry.failed = false;
  render();
  dispatchSend(tempId, otherUid, entry.text);
}
