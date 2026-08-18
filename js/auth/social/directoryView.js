import { escHtml } from "../utils/helpers.js";
import { fetchDirectoryPage } from "./directoryService.js";
import { subscribeFollowing, subscribeOutgoingRequests } from "./followState.js";
import { sendFollowRequest, cancelFollowRequest, unfollow } from "./socialApi.js";
import { openProfileFor } from "./profileView.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

const grid = document.getElementById("directoryGrid");
const emptyEl = document.getElementById("directoryEmpty");
const loadMoreBtn = document.getElementById("directoryLoadMore");

let users = [];
let cursor = null;
let hasMore = false;
let loaded = false;
let following = new Set();
let outgoing = new Set();
let stopFollowing = null;
let stopOutgoing = null;

export function initDirectoryView() {
  if (!stopFollowing) {
    stopFollowing = subscribeFollowing(uids => {
      following = new Set(uids);
      renderButtonStates();
    });
  }
  if (!stopOutgoing) {
    stopOutgoing = subscribeOutgoingRequests(uids => {
      outgoing = new Set(uids);
      renderButtonStates();
    });
  }

  loadMoreBtn.onclick = loadMore;

  if (!loaded) {
    loaded = true;
    loadMore();
  }
}

export function destroyDirectoryView() {
  if (stopFollowing) stopFollowing();
  if (stopOutgoing) stopOutgoing();
  stopFollowing = stopOutgoing = null;

  users = [];
  cursor = null;
  loaded = false;
  grid.innerHTML = "";
  emptyEl.classList.add("hidden");
  loadMoreBtn.classList.add("hidden");
}

async function loadMore() {
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = "Loading…";

  try {
    const page = await fetchDirectoryPage(cursor);
    users = users.concat(page.users);
    cursor = page.cursor;
    hasMore = page.hasMore;

    render();
  } catch (err) {
    console.error("Directory load failed:", err.message);
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load more";
  }
}

function render() {
  emptyEl.classList.toggle("hidden", users.length > 0);
  loadMoreBtn.classList.toggle("hidden", !hasMore);

  grid.innerHTML = users.map(cardHtml).join("");

  grid.querySelectorAll(".directory-card").forEach(card => {
    const uid = card.dataset.uid;

    card.querySelector(".directory-card-body").addEventListener("click", () => {
      const user = users.find(u => u.uid === uid);
      openProfileFor(uid, { title: user?.displayName || "Profile" });
    });

    card.querySelector(".directory-follow-btn").addEventListener("click", e => {
      e.stopPropagation();
      handleFollowClick(uid);
    });
  });
}

function renderButtonStates() {
  grid.querySelectorAll(".directory-card").forEach(card => {
    const uid = card.dataset.uid;
    const btn = card.querySelector(".directory-follow-btn");
    applyButtonState(btn, uid);
  });
}

function applyButtonState(btn, uid) {
  const isFollowing = following.has(uid);
  const isPending = outgoing.has(uid);

  btn.classList.toggle("is-following", isFollowing);
  btn.classList.toggle("is-pending", isPending);

  const icon = isFollowing ? "user-check" : "user-plus";
  const label = isFollowing ? "Following" : isPending ? "Requested" : "Follow";

  btn.querySelector("img").src = `Assets/Icons/${icon}.svg`;
  btn.querySelector("span").textContent = label;
}

function cardHtml(user) {
  const isFollowing = following.has(user.uid);
  const isPending = outgoing.has(user.uid);
  const icon = isFollowing ? "user-check" : "user-plus";
  const label = isFollowing ? "Following" : isPending ? "Requested" : "Follow";

  return `
    <div class="directory-card" data-uid="${escHtml(user.uid)}">
      <div class="directory-card-body">
        <img class="directory-card-avatar" src="${escHtml(user.avatar || DEFAULT_AVATAR)}" alt="" />
        <div class="directory-card-name">${escHtml(user.displayName || "Joule User")}</div>
        <div class="directory-card-count">${user.followerCount || 0} followers</div>
      </div>
      <button class="directory-follow-btn ${isFollowing ? "is-following" : ""} ${isPending ? "is-pending" : ""}" type="button">
        <img src="Assets/Icons/${icon}.svg" class="icon" alt="" />
        <span>${label}</span>
      </button>
    </div>
  `;
}

async function handleFollowClick(uid) {
  const card = grid.querySelector(`.directory-card[data-uid="${cssEscape(uid)}"]`);
  const btn = card?.querySelector(".directory-follow-btn");
  if (!btn) return;

  const isFollowing = following.has(uid);
  const isPending = outgoing.has(uid);

  btn.disabled = true;

  try {
    if (isFollowing) {
      const confirmed = window.confirm("Unfollow this person?");
      if (confirmed) await unfollow(uid);
    } else if (isPending) {
      await cancelFollowRequest(uid);
    } else {
      await sendFollowRequest(uid);
    }
  } catch (err) {
    window.alert(err.message || "Something went wrong.");
  } finally {
    btn.disabled = false;
  }
}

function cssEscape(str) {
  return String(str).replace(/["\\]/g, "\\$&");
}
