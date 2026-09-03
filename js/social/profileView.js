import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../auth/firebase.js";
import { escHtml } from "../utils/helpers.js";
import { pushPanel } from "./peopleSection.js";
import {
  subscribeFollowing,
  subscribeFollowers,
  subscribeOutgoingRequests
} from "./followState.js";
import {
  sendFollowRequest,
  cancelFollowRequest,
  unfollow
} from "./socialApi.js";
import { getOptimistic, setOptimistic, clearAllOptimistic, onOptimisticChange } from "./optimisticFollow.js";
import { openThread } from "./threadView.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

const content = document.getElementById("profileViewContent");

let following = new Set();
let followers = new Set();
let outgoing = new Set();
let stopFollowing = null;
let stopFollowers = null;
let stopOutgoing = null;
let stopOptimistic = null;
let currentUid = null;

function ensureListeners() {
  if (stopFollowing) return;

  stopFollowing = subscribeFollowing(uids => {
    following = new Set(uids);
    clearAllOptimistic();
    if (currentUid) render(currentUid);
  });
  stopFollowers = subscribeFollowers(uids => {
    followers = new Set(uids);
    if (currentUid) render(currentUid);
  });
  stopOutgoing = subscribeOutgoingRequests(uids => {
    outgoing = new Set(uids);
    clearAllOptimistic();
    if (currentUid) render(currentUid);
  });
  stopOptimistic = onOptimisticChange(() => {
    if (currentUid) render(currentUid);
  });
}

/** Opens the profile panel for `uid`, fetching their public doc fresh each time (counts change often enough that cached directory data would go stale). */
export async function openProfileFor(uid, opts = {}) {
  ensureListeners();
  currentUid = uid;

  content.innerHTML = `<div class="people-loading">Loading profile…</div>`;
  pushPanel("profilePanel", opts.title || "Profile");

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    content.innerHTML = `<div class="people-empty">This user no longer exists.</div>`;
    return;
  }

  content.dataset.user = JSON.stringify({ uid, ...snap.data() });
  render(uid);
}

export function closeProfileView() {
  currentUid = null;
  if (stopFollowing) stopFollowing();
  if (stopFollowers) stopFollowers();
  if (stopOutgoing) stopOutgoing();
  if (stopOptimistic) stopOptimistic();
  stopFollowing = stopFollowers = stopOutgoing = stopOptimistic = null;
}

function stateFor(uid) {
  const optimistic = getOptimistic(uid);
  if (optimistic) return optimistic;
  return following.has(uid) ? "following" : outgoing.has(uid) ? "requested" : "none";
}

function render(uid) {
  const data = JSON.parse(content.dataset.user || "{}");
  if (data.uid !== uid) return;

  const state = stateFor(uid);
  const isFollower = followers.has(uid);
  const canMessage = state === "following" || isFollower;

  content.innerHTML = `
    <div class="profile-view-header">
      <img class="profile-view-avatar" src="${escHtml(data.avatar || DEFAULT_AVATAR)}" alt="" />
      <div class="profile-view-name">${escHtml(data.displayName || "Joule User")}</div>

      <div class="profile-view-counts">
        <div class="profile-view-count"><strong>${data.followerCount || 0}</strong><span>Followers</span></div>
        <div class="profile-view-count"><strong>${data.followingCount || 0}</strong><span>Following</span></div>
      </div>
    </div>

    <div class="profile-view-actions">
      <button class="profile-follow-btn ${state === "following" ? "is-following" : ""} ${state === "requested" ? "is-pending" : ""}" id="profileFollowBtn">
        <img src="Assets/Icons/${state === "following" ? "user-check" : "user-plus"}.svg" class="icon" alt="" />
        <span>${state === "following" ? "Following" : state === "requested" ? "Requested" : "Follow"}</span>
      </button>
      <button class="profile-message-btn" id="profileMessageBtn" ${canMessage ? "" : "disabled"}>
        Message
      </button>
    </div>

    ${canMessage ? "" : `<div class="profile-view-hint">You can message ${escHtml(data.displayName || "this person")} once your follow is accepted.</div>`}
  `;

  content.querySelector("#profileFollowBtn").addEventListener("click", () => handleFollowClick(uid, state));

  const messageBtn = content.querySelector("#profileMessageBtn");
  if (canMessage) {
    messageBtn.addEventListener("click", () => {
      openThread(uid, { displayName: data.displayName, avatar: data.avatar });
    });
  }
}

async function handleFollowClick(uid, currentState) {
  if (currentState === "following") {
    const confirmed = window.confirm("Unfollow this person?");
    if (!confirmed) return;
  }

  setOptimistic(uid, currentState === "none" ? "requested" : "none");

  try {
    if (currentState === "following") {
      await unfollow(uid);
    } else if (currentState === "requested") {
      await cancelFollowRequest(uid);
    } else {
      await sendFollowRequest(uid);
    }
  } catch (err) {
    setOptimistic(uid, null);
    window.alert(err.message || "Something went wrong.");
  }
}

/** Whether I'm allowed to message this uid right now — used by other views before opening a thread directly. */
export function canMessageUid(uid) {
  return following.has(uid) || followers.has(uid);
}

export function currentAuthUid() {
  return auth.currentUser?.uid || null;
}
