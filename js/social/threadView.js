import { auth } from "../auth/firebase.js";
import { escHtml } from "../utils/helpers.js";
import { pushPanel } from "./peopleSection.js";
import { conversationIdFor, subscribeConversations } from "./conversationsService.js";
import { subscribeMessages, subscribeConversationMeta } from "./messagesService.js";
import {
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  forwardMessage,
  markConversationRead,
  pingTyping
} from "./socialApi.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const TYPING_STALE_MS = 4000;
const TYPING_PING_INTERVAL_MS = 3000;

const header = document.getElementById("threadHeader");
const messagesEl = document.getElementById("threadMessages");
const input = document.getElementById("threadInput");
const sendBtn = document.getElementById("threadSendBtn");
const replyBar = document.getElementById("threadReplyBar");
const replyBarText = document.getElementById("threadReplyBarText");
const replyBarCancel = document.getElementById("threadReplyBarCancel");

let stopMessages = null;
let stopMeta = null;
let otherUid = null;
let conversationId = null;
let confirmed = [];
let pending = []; // { tempId, text, sentAt, failed }
let renderedIds = new Set();
let tempCounter = 0;
let meta = { lastRead: {}, typing: {} };
let replyingTo = null; // { messageId, text }
let editingMessageId = null;
let activeMessageKey = null; // long-pressed / tapped message showing its action row on mobile
let lastTypingPingAt = 0;
let typingWatchdog = null;

sendBtn.addEventListener("click", handleSend);
input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSend();
  }
  if (e.key === "Escape" && editingMessageId) {
    cancelEdit();
  }
});
input.addEventListener("input", () => {
  if (!conversationId) return;
  const now = Date.now();
  if (now - lastTypingPingAt > TYPING_PING_INTERVAL_MS) {
    lastTypingPingAt = now;
    pingTyping(conversationId).catch(() => {});
  }
});
replyBarCancel.addEventListener("click", cancelReply);

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
  meta = { lastRead: {}, typing: {} };
  replyingTo = null;
  editingMessageId = null;
  activeMessageKey = null;
  updateReplyBar();

  header.innerHTML = `
    <img class="thread-avatar" src="${escHtml(otherInfo.avatar || DEFAULT_AVATAR)}" alt="" />
    <span class="thread-name">${escHtml(otherInfo.displayName || "Joule User")}</span>
  `;

  messagesEl.innerHTML = "";
  pushPanel("threadPanel", otherInfo.displayName || "Message");

  conversationId = conversationIdFor(otherUid);

  if (stopMessages) stopMessages();
  if (stopMeta) stopMeta();

  stopMessages = subscribeMessages(conversationId, handleConfirmedMessages);
  stopMeta = subscribeConversationMeta(conversationId, handleMeta);

  if (typingWatchdog) clearInterval(typingWatchdog);
  typingWatchdog = setInterval(render, 1500); // re-render to expire a stale typing indicator even with no new snapshot

  markConversationRead(conversationId).catch(() => {});
  setTimeout(() => input.focus(), 250);
}

export function closeThreadView() {
  if (stopMessages) stopMessages();
  if (stopMeta) stopMeta();
  if (typingWatchdog) clearInterval(typingWatchdog);
  stopMessages = null;
  stopMeta = null;
  typingWatchdog = null;
  otherUid = null;
  conversationId = null;
  confirmed = [];
  pending = [];
  replyingTo = null;
  editingMessageId = null;
  input.value = "";
  updateReplyBar();
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

  // A new incoming message while the thread is open counts as read immediately.
  if (conversationId) markConversationRead(conversationId).catch(() => {});
}

function handleMeta(nextMeta) {
  meta = nextMeta;
  render();
}

function isOtherTyping() {
  const ts = otherUid && meta.typing[otherUid];
  return !!ts && Date.now() - ts < TYPING_STALE_MS;
}

function render() {
  const myUid = auth.currentUser?.uid;
  const wasAtBottom =
    messagesEl.scrollHeight - messagesEl.scrollTop <= messagesEl.clientHeight + 40;

  const combined = [
    ...confirmed.map(m => ({ ...m, key: m.id })),
    ...pending.map(p => ({ ...p, key: p.tempId, senderUid: myUid, isPending: true }))
  ];

  if (combined.length === 0 && !isOtherTyping()) {
    messagesEl.innerHTML = `<div class="people-empty">Say hello 👋</div>`;
    renderedIds = new Set();
    return;
  }

  const lastMineRead = lastReadMineMessageKey(combined, myUid);

  messagesEl.innerHTML =
    combined.map(msg => bubbleHtml(msg, myUid, msg.key === lastMineRead)).join("") +
    (isOtherTyping() ? typingBubbleHtml() : "");

  renderedIds = new Set(combined.map(m => m.key));
  wireBubbleEvents();

  if (wasAtBottom) {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

/** The most recent message I sent that the other participant has already read — that's the one bubble that gets the "read" tick instead of just "sent". */
function lastReadMineMessageKey(combined, myUid) {
  const theirReadAt = otherUid && meta.lastRead[otherUid];
  if (!theirReadAt) return null;

  let lastKey = null;
  for (const msg of combined) {
    if (msg.senderUid === myUid && !msg.isPending && msg.sentAt <= theirReadAt) {
      lastKey = msg.key;
    }
  }
  return lastKey;
}

function bubbleHtml(msg, myUid, isRead) {
  const mine = msg.senderUid === myUid;
  const isNew = !renderedIds.has(msg.key);
  const time = new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  let metaLine = time;
  if (msg.isPending && msg.failed) {
    metaLine = `<button class="thread-msg-retry" type="button" data-temp-id="${escHtml(msg.tempId)}">Failed — tap to retry</button>`;
  } else if (msg.isPending) {
    metaLine = "Sending…";
  } else if (mine) {
    metaLine = `${time}${msg.editedAt ? `<span class="thread-msg-edited-tag">edited</span>` : ""}<span class="thread-read-tick ${isRead ? "is-read" : ""}"><img src="Assets/Icons/check.svg" alt="" /></span>`;
  } else if (msg.editedAt) {
    metaLine = `${time}<span class="thread-msg-edited-tag">edited</span>`;
  }

  if (msg.deleted) {
    return `
      <div class="thread-msg ${mine ? "thread-msg-mine" : "thread-msg-theirs"}" data-key="${escHtml(msg.key)}">
        <div class="thread-msg-bubble thread-msg-deleted">This message was deleted</div>
        <div class="thread-msg-time">${time}</div>
      </div>
    `;
  }

  const canModify = mine && !msg.isPending;
  const reactions = renderReactions(msg, myUid);
  const replyPreview = msg.replyTo
    ? `<span class="thread-msg-reply-preview">${escHtml(msg.replyTo.text || "Message")}</span>`
    : "";
  const forwardedTag = msg.forwardedFrom
    ? `<div class="thread-msg-forwarded-tag">Forwarded from ${escHtml(msg.forwardedFrom)}</div>`
    : "";

  return `
    <div class="thread-msg ${mine ? "thread-msg-mine" : "thread-msg-theirs"} ${isNew ? "thread-msg-new" : ""} ${msg.key === activeMessageKey ? "thread-msg-active" : ""}" data-key="${escHtml(msg.key)}" data-message-id="${escHtml(msg.id || "")}">
      ${forwardedTag}
      <div class="thread-msg-row">
        <div class="thread-msg-bubble ${msg.isPending ? "thread-msg-pending" : ""} ${msg.failed ? "thread-msg-failed" : ""}">
          ${replyPreview}${escHtml(msg.text)}
        </div>
        ${!msg.isPending ? actionBarHtml(canModify) : ""}
      </div>
      ${reactions}
      <div class="thread-msg-time">${metaLine}</div>
    </div>
  `;
}

function actionBarHtml(canModify) {
  return `
    <div class="thread-msg-actions">
      <button class="thread-msg-action-btn thread-msg-react-btn" type="button" aria-label="React" title="React">${svgSmile()}</button>
      <button class="thread-msg-action-btn thread-msg-reply-btn" type="button" aria-label="Reply" title="Reply">${svgReply()}</button>
      <button class="thread-msg-action-btn thread-msg-forward-btn" type="button" aria-label="Forward" title="Forward">${svgForward()}</button>
      ${canModify ? `<button class="thread-msg-action-btn thread-msg-edit-btn" type="button" aria-label="Edit" title="Edit">${svgEdit()}</button>` : ""}
      ${canModify ? `<button class="thread-msg-action-btn thread-msg-delete-btn" type="button" aria-label="Delete" title="Delete"><img src="Assets/Icons/trash.svg" class="icon" alt="" style="width:14px;height:14px;" /></button>` : ""}
    </div>
  `;
}

function renderReactions(msg, myUid) {
  const entries = Object.entries(msg.reactions || {});
  if (entries.length === 0) return "";

  const counts = {};
  for (const [, emoji] of entries) counts[emoji] = (counts[emoji] || 0) + 1;
  const mine = msg.reactions?.[myUid];

  return `
    <div class="thread-msg-reactions">
      ${Object.entries(counts)
        .map(
          ([emoji, count]) => `
        <button class="thread-reaction-pill ${emoji === mine ? "mine-reaction" : ""}" type="button" data-emoji="${escHtml(emoji)}">
          <span>${emoji}</span>${count > 1 ? `<span class="count">${count}</span>` : ""}
        </button>
      `
        )
        .join("")}
    </div>
  `;
}

function typingBubbleHtml() {
  return `<div class="thread-typing-bubble"><span></span><span></span><span></span></div>`;
}

function svgSmile() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
}
function svgReply() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`;
}
function svgForward() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>`;
}
function svgEdit() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}

/* ---------- Event wiring ---------- */

function wireBubbleEvents() {
  messagesEl.querySelectorAll(".thread-msg-retry").forEach(btn => {
    btn.addEventListener("click", () => retry(btn.dataset.tempId));
  });

  messagesEl.querySelectorAll(".thread-msg").forEach(el => {
    const key = el.dataset.key;
    const messageId = el.dataset.messageId;

    // Tap-to-reveal actions on touch devices (hover does this on desktop).
    el.addEventListener("click", e => {
      if (e.target.closest(".thread-msg-actions") || e.target.closest(".thread-reaction-pill")) return;
      activeMessageKey = activeMessageKey === key ? null : key;
      render();
    });

    wireSwipeToReply(el, messageId);

    const bubble = el.querySelector(".thread-msg-bubble");
    if (bubble && messageId) {
      el.querySelector(".thread-msg-react-btn")?.addEventListener("click", ev => {
        ev.stopPropagation();
        openReactionPicker(ev.currentTarget, messageId);
      });
      el.querySelector(".thread-msg-reply-btn")?.addEventListener("click", ev => {
        ev.stopPropagation();
        startReply(messageId, bubble.textContent.trim());
      });
      el.querySelector(".thread-msg-forward-btn")?.addEventListener("click", ev => {
        ev.stopPropagation();
        openForwardPicker(messageId);
      });
      el.querySelector(".thread-msg-edit-btn")?.addEventListener("click", ev => {
        ev.stopPropagation();
        startEdit(messageId, bubble.textContent.trim());
      });
      el.querySelector(".thread-msg-delete-btn")?.addEventListener("click", ev => {
        ev.stopPropagation();
        handleDelete(messageId);
      });
    }

    el.querySelectorAll(".thread-reaction-pill").forEach(pill => {
      pill.addEventListener("click", ev => {
        ev.stopPropagation();
        if (!messageId) return;
        reactToMessage(conversationId, messageId, pill.dataset.emoji).catch(err =>
          console.error("React failed:", err.message)
        );
      });
    });
  });
}

/** Horizontal touch swipe past a small threshold triggers reply, with the bubble following the finger for feedback — the same one-way gesture WhatsApp uses, kept simple (no library) since it's just a threshold check on touch deltas. */
function wireSwipeToReply(el, messageId) {
  if (!messageId) return;

  const bubble = el.querySelector(".thread-msg-row");
  if (!bubble) return;

  let startX = 0;
  let dx = 0;
  let tracking = false;

  bubble.addEventListener(
    "touchstart",
    e => {
      startX = e.touches[0].clientX;
      dx = 0;
      tracking = true;
    },
    { passive: true }
  );

  bubble.addEventListener(
    "touchmove",
    e => {
      if (!tracking) return;
      dx = e.touches[0].clientX - startX;
      const clamped = Math.max(-70, Math.min(70, dx));
      bubble.style.transform = `translateX(${clamped}px)`;
    },
    { passive: true }
  );

  bubble.addEventListener("touchend", () => {
    tracking = false;
    bubble.style.transform = "";
    if (Math.abs(dx) > 55) {
      const text = bubble.querySelector(".thread-msg-bubble")?.textContent.trim() || "";
      startReply(messageId, text);
    }
  });
}

/* ---------- Reply ---------- */

function startReply(messageId, text) {
  editingMessageId = null;
  replyingTo = { messageId, text };
  updateReplyBar();
  input.focus();
}

function cancelReply() {
  replyingTo = null;
  updateReplyBar();
}

function updateReplyBar() {
  if (editingMessageId) {
    replyBarText.textContent = "Editing message";
    replyBar.classList.remove("hidden");
  } else if (replyingTo) {
    replyBarText.textContent = `Replying to: ${replyingTo.text}`;
    replyBar.classList.remove("hidden");
  } else {
    replyBar.classList.add("hidden");
  }
}

/* ---------- Edit ---------- */

function startEdit(messageId, currentText) {
  replyingTo = null;
  editingMessageId = messageId;
  input.value = currentText;
  updateReplyBar();
  input.focus();
}

function cancelEdit() {
  editingMessageId = null;
  input.value = "";
  updateReplyBar();
}

/* ---------- Delete ---------- */

async function handleDelete(messageId) {
  if (!conversationId || !window.confirm("Delete this message?")) return;

  try {
    await deleteMessage(conversationId, messageId);
  } catch (err) {
    console.error("Delete failed:", err.message);
  }
}

/* ---------- Reactions ---------- */

function openReactionPicker(anchorBtn, messageId) {
  document.querySelector(".thread-reaction-picker")?.remove();

  const picker = document.createElement("div");
  picker.className = "thread-reaction-picker";
  picker.innerHTML = QUICK_REACTIONS.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join("");

  document.body.appendChild(picker);
  const rect = anchorBtn.getBoundingClientRect();
  picker.style.top = `${rect.top - 44}px`;
  picker.style.left = `${Math.max(8, rect.left - 90)}px`;

  picker.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      reactToMessage(conversationId, messageId, btn.dataset.emoji).catch(err =>
        console.error("React failed:", err.message)
      );
      picker.remove();
    });
  });

  setTimeout(() => {
    document.addEventListener("click", function closePicker(e) {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener("click", closePicker);
      }
    });
  }, 0);
}

/* ---------- Forward ---------- */

function openForwardPicker(messageId) {
  const overlay = document.createElement("div");
  overlay.className = "forward-picker-overlay";
  overlay.innerHTML = `
    <div class="forward-picker-sheet">
      <div class="forward-picker-title">Forward to…</div>
      <div class="forward-picker-list">Loading…</div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });

  const list = overlay.querySelector(".forward-picker-list");
  const stop = subscribeConversations(conversations => {
    const targets = conversations.filter(c => c.otherUid !== otherUid);

    list.innerHTML =
      targets.length === 0
        ? `<div class="people-empty">No one else to forward to yet</div>`
        : targets
            .map(
              c => `
        <div class="forward-picker-row" data-uid="${escHtml(c.otherUid)}">
          <img src="${escHtml(c.otherAvatar || DEFAULT_AVATAR)}" alt="" />
          <span>${escHtml(c.otherName || "Joule User")}</span>
        </div>
      `
            )
            .join("");

    list.querySelectorAll(".forward-picker-row").forEach(row => {
      row.addEventListener("click", async () => {
        try {
          await forwardMessage(conversationId, messageId, row.dataset.uid);
          overlay.remove();
        } catch (err) {
          console.error("Forward failed:", err.message);
        }
      });
    });
  });

  // One list snapshot is enough for a picker that's open a few seconds — stop listening once it closes.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(overlay)) {
      stop();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });
}

/* ---------- Send ---------- */

function handleSend() {
  const text = input.value.trim();
  if (!text || !otherUid) return;

  if (editingMessageId) {
    const messageId = editingMessageId;
    input.value = "";
    cancelEdit();
    editMessage(conversationId, messageId, text).catch(err => console.error("Edit failed:", err.message));
    return;
  }

  input.value = "";
  const replyTo = replyingTo ? { ...replyingTo } : null;
  cancelReply();

  const tempId = `tmp-${++tempCounter}`;
  pending.push({ tempId, text, sentAt: Date.now(), failed: false });
  render();

  dispatchSend(tempId, otherUid, text, replyTo);
}

async function dispatchSend(tempId, toUid, text, replyTo) {
  try {
    await sendMessage(toUid, text, replyTo);
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
  dispatchSend(tempId, otherUid, entry.text, null);
}
