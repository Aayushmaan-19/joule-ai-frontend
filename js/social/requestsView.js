import { escHtml } from "../utils/helpers.js";
import { subscribeIncomingRequests } from "./followState.js";
import { acceptFollowRequest, declineFollowRequest } from "./socialApi.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

const list = document.getElementById("requestsList");
const emptyEl = document.getElementById("requestsEmpty");

let stop = null;

export function initRequestsView() {
  if (stop) return;
  stop = subscribeIncomingRequests(render);
}

export function destroyRequestsView() {
  if (stop) stop();
  stop = null;
  list.innerHTML = "";
  emptyEl.classList.add("hidden");
}

function render(requests) {
  emptyEl.classList.toggle("hidden", requests.length > 0);

  list.innerHTML = requests.map(rowHtml).join("");

  list.querySelectorAll(".request-row").forEach(row => {
    const uid = row.dataset.uid;

    row.querySelector(".request-accept-btn").addEventListener("click", () => handleAccept(uid, row));
    row.querySelector(".request-decline-btn").addEventListener("click", () => handleDecline(uid, row));
  });
}

function rowHtml(req) {
  return `
    <div class="request-row" data-uid="${escHtml(req.requester)}">
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
  setRowBusy(row, true);
  try {
    await acceptFollowRequest(uid);
  } catch (err) {
    window.alert(err.message || "Couldn't accept this request.");
    setRowBusy(row, false);
  }
}

async function handleDecline(uid, row) {
  setRowBusy(row, true);
  try {
    await declineFollowRequest(uid);
  } catch (err) {
    window.alert(err.message || "Couldn't decline this request.");
    setRowBusy(row, false);
  }
}

function setRowBusy(row, busy) {
  row.querySelectorAll("button").forEach(btn => (btn.disabled = busy));
}
