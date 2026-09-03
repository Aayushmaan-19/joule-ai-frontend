import { escHtml } from "../utils/helpers.js";
import { fetchDirectoryPage } from "./directoryService.js";
import { subscribeFollowing, subscribeOutgoingRequests } from "./followState.js";
import { sendFollowRequest, cancelFollowRequest, unfollow } from "./socialApi.js";
import { openProfileFor } from "./profileView.js";
import { getOptimistic, setOptimistic, clearAllOptimistic, onOptimisticChange } from "./optimisticFollow.js";

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
let stopOptimistic = null;

export function initDirectoryView() {
  if (!stopFollowing) {
    stopFollowing = subscribeFollowing(uids => {
      following = new Set(uids);
      clearAllOptimistic();
      renderButtonStates();
    });
  }
  if (!stopOutgoing) {
    stopOutgoing = subscribeOutgoingRequests(uids => {
      outgoing = new Set(uids);
      clearAllOptimistic();
      renderButtonStates();
    });
  }
  if (!stopOptimistic) {
    stopOptimistic = onOptimisticChange(renderButtonStates);
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
  if (stopOptimistic) stopOptimistic();
  stopFollowing = stopOutgoing = stopOptimistic = null;

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
    const newCount = page.users.length;

    users = users.concat(page.users);
    cursor = page.cursor;
    hasMore = page.hasMore;

    render(newCount);
  } catch (err) {
    console.error("Directory load failed:", err.message);
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load more";
  }
}

function render(newCount = users.length) {
  emptyEl.classList.toggle("hidden", users.length > 0);
  loadMoreBtn.classList.toggle("hidden", !hasMore);

  const staggerFrom = users.length - newCount;

  grid.innerHTML = users.map((u, i) => cardHtml(u, i >= staggerFrom ? i - staggerFrom : -1)).join("");

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

function stateFor(uid) {
  const optimistic = getOptimistic(uid);
  if (optimistic) return optimistic;
  return following.has(uid) ? "following" : outgoing.has(uid) ? "requested" : "none";
}

function applyButtonState(btn, uid) {
  const state = stateFor(uid);

  btn.classList.toggle("is-following", state === "following");
  btn.classList.toggle("is-pending", state === "requested");

  const icon = state === "following" ? "user-check" : "user-plus";
  const label = state === "following" ? "Following" : state === "requested" ? "Requested" : "Follow";

  btn.querySelector("img").src = `Assets/Icons/${icon}.svg`;
  btn.querySelector("span").textContent = label;
}

function cardHtml(user, staggerIndex = -1) {
  const state = stateFor(user.uid);
  const icon = state === "following" ? "user-check" : "user-plus";
  const label = state === "following" ? "Following" : state === "requested" ? "Requested" : "Follow";
  const delay = staggerIndex >= 0 ? ` style="animation-delay:${Math.min(staggerIndex * 40, 400)}ms"` : "";

  return `
    <div class="directory-card"${delay} data-uid="${escHtml(user.uid)}">
      <div class="directory-card-body">
        <img class="directory-card-avatar" src="${escHtml(user.avatar || DEFAULT_AVATAR)}" alt="" />
        <div class="directory-card-name">${escHtml(user.displayName || "Joule User")}</div>
        <div class="directory-card-count">${user.followerCount || 0} followers</div>
      </div>
      <button class="directory-follow-btn ${state === "following" ? "is-following" : ""} ${state === "requested" ? "is-pending" : ""}" type="button">
        <img src="Assets/Icons/${icon}.svg" class="icon" alt="" />
        <span>${label}</span>
      </button>
    </div>
  `;
}

async function handleFollowClick(uid) {
  const currentState = stateFor(uid);
  const nextState = currentState === "none" ? "requested" : "none";

  if (currentState === "following") {
    const confirmed = window.confirm("Unfollow this person?");
    if (!confirmed) return;
  }

  // Instant feedback — don't wait for the round trip.
  setOptimistic(uid, nextState);

  try {
    if (currentState === "following") {
      await unfollow(uid);
    } else if (currentState === "requested") {
      await cancelFollowRequest(uid);
    } else {
      await sendFollowRequest(uid);
    }
  } catch (err) {
    setOptimistic(uid, null); // revert to real state
    window.alert(err.message || "Something went wrong.");
  }
}
