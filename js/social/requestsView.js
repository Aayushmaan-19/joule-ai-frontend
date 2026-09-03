import { escHtml } from "../utils/helpers.js";
import { subscribeIncomingRequests } from "./followState.js";
import { acceptFollowRequest, declineFollowRequest } from "./socialApi.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

const list = document.getElementById("requestsList");
const emptyEl = document.getElementById("requestsEmpty");

let stop = null;
let dismissed = new Set(); // uids optimistically removed, pending server confirmation
let lastKnownRequests = [];
let seenUids = new Set();

export function initRequestsView() {
  if (stop) return;
  stop = subscribeIncomingRequests(requests => {
    lastKnownRequests = requests;

    // Real data has arrived — anything still "dismissed" that's gone
    // from the list is confirmed; drop it from the dismissed set so
    // it doesn't leak if the same person re-requests later.
    const live = new Set(requests.map(r => r.requester));
    dismissed = new Set([...dismissed].filter(uid => live.has(uid)));
    render(requests);
  });
}

export function destroyRequestsView() {
  if (stop) stop();
  stop = null;
  dismissed = new Set();
  lastKnownRequests = [];
  seenUids = new Set();
  list.innerHTML = "";
  emptyEl.classList.add("hidden");
}

function render(requests) {
  const visible = requests.filter(r => !dismissed.has(r.requester));

  emptyEl.classList.toggle("hidden", visible.length > 0);

  list.innerHTML = visible.map(r => rowHtml(r, !seenUids.has(r.requester))).join("");
  seenUids = new Set(visible.map(r => r.requester));

  list.querySelectorAll(".request-row").forEach(row => {
    const uid = row.dataset.uid;

    row.querySelector(".request-accept-btn").addEventListener("click", () => handleAccept(uid, row));
    row.querySelector(".request-decline-btn").addEventListener("click", () => handleDecline(uid, row));
  });
}

function rowHtml(req, isNew) {
  return `
    <div class="request-row ${isNew ? "request-row-new" : ""}" data-uid="${escHtml(req.requester)}">
      <img class="request-avatar" src="${escHtml(req.requesterAvatar || DEFAULT_AVATAR)}" alt="" />
      <div class="request-name">${escHtml(req.requesterName || "Joule User")}</div>
      <div class="request-actions">
        <button class="request-accept-btn" type="button" aria-label="Accept">
          <img src="Assets/Icons/check.svg" class="icon" alt="" />
        </button>
        <button class="request-decline-btn" type="button" aria-label="Decline">
          <img src="Assets/Icons/x.svg" class="icon" alt="" />
        </button>
      </div>
    </div>
  `;
}

async function handleAccept(uid, row) {
  dismissOptimistically(uid, row);
  try {
    await acceptFollowRequest(uid);
  } catch (err) {
    restore(uid);
    window.alert(err.message || "Couldn't accept this request.");
  }
}

async function handleDecline(uid, row) {
  dismissOptimistically(uid, row);
  try {
    await declineFollowRequest(uid);
  } catch (err) {
    restore(uid);
    window.alert(err.message || "Couldn't decline this request.");
  }
}

function dismissOptimistically(uid, row) {
  dismissed.add(uid);
  row.classList.add("request-row-leaving");
  setTimeout(() => {
    if (dismissed.has(uid)) row.remove();
    emptyEl.classList.toggle("hidden", list.children.length > 0);
  }, 220);
}

function restore(uid) {
  dismissed.delete(uid);
  render(lastKnownRequests);
}
