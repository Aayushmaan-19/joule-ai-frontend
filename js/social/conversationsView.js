import { auth } from "../auth/firebase.js";
import { escHtml } from "../utils/helpers.js";
import { subscribeConversations } from "./conversationsService.js";
import { openThread } from "./threadView.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

const list = document.getElementById("conversationsList");
const emptyEl = document.getElementById("conversationsEmpty");

let conversations = [];
let stop = null;

export function initConversationsView() {
  if (stop) return;
  stop = subscribeConversations(rows => {
    conversations = rows;
    render();
  });
}

export function destroyConversationsView() {
  if (stop) stop();
  stop = null;
  conversations = [];
  list.innerHTML = "";
  emptyEl.classList.add("hidden");
}

function render() {
  emptyEl.classList.toggle("hidden", conversations.length > 0);

  list.innerHTML = conversations.map(rowHtml).join("");

  list.querySelectorAll(".conversation-row").forEach(row => {
    const convo = conversations.find(c => c.id === row.dataset.id);
    if (!convo) return;

    row.addEventListener("click", () => {
      openThread(convo.otherUid, { displayName: convo.otherName, avatar: convo.otherAvatar });
    });
  });
}

function rowHtml(convo) {
  const myUid = auth.currentUser?.uid;
  const preview = convo.lastMessage
    ? (convo.lastMessage.senderUid === myUid ? "You: " : "") + convo.lastMessage.text
    : "Say hello 👋";

  return `
    <div class="conversation-row" data-id="${escHtml(convo.id)}">
      <img class="conversation-avatar" src="${escHtml(convo.otherAvatar || DEFAULT_AVATAR)}" alt="" />
      <div class="conversation-body">
        <div class="conversation-name">${escHtml(convo.otherName)}</div>
        <div class="conversation-preview">${escHtml(preview)}</div>
      </div>
    </div>
  `;
}
