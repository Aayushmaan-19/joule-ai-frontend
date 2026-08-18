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
let sending = false;

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

  header.innerHTML = `
    <img class="thread-avatar" src="${escHtml(otherInfo.avatar || DEFAULT_AVATAR)}" alt="" />
    <span class="thread-name">${escHtml(otherInfo.displayName || "Joule User")}</span>
  `;

  messagesEl.innerHTML = "";
  pushPanel("threadPanel", otherInfo.displayName || "Message");

  const conversationId = conversationIdFor(otherUid);

  if (stopMessages) stopMessages();
  stopMessages = subscribeMessages(conversationId, renderMessages);

  setTimeout(() => input.focus(), 250);
}

export function closeThreadView() {
  if (stopMessages) stopMessages();
  stopMessages = null;
  otherUid = null;
  input.value = "";
}

function renderMessages(messages) {
  const myUid = auth.currentUser?.uid;
  const wasAtBottom =
    messagesEl.scrollHeight - messagesEl.scrollTop <= messagesEl.clientHeight + 40;

  if (messages.length === 0) {
    messagesEl.innerHTML = `<div class="people-empty">Say hello 👋</div>`;
    return;
  }

  messagesEl.innerHTML = messages
    .map(msg => {
      const mine = msg.senderUid === myUid;
      const time = new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      return `
        <div class="thread-msg ${mine ? "thread-msg-mine" : "thread-msg-theirs"}">
          <div class="thread-msg-bubble">${escHtml(msg.text)}</div>
          <div class="thread-msg-time">${time}</div>
        </div>
      `;
    })
    .join("");

  if (wasAtBottom) {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

async function handleSend() {
  const text = input.value.trim();
  if (!text || !otherUid || sending) return;

  sending = true;
  sendBtn.disabled = true;
  input.value = "";

  try {
    await sendMessage(otherUid, text);
  } catch (err) {
    window.alert(err.message || "Message failed to send.");
    input.value = text;
  } finally {
    sending = false;
    sendBtn.disabled = false;
  }
}
