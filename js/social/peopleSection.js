import { WAKE_API_URL } from "../utils/constants.js";
import { getTokenOptional } from "../auth/getToken.js";
import { setBackendAwake } from "../config/actions.js";
import { isBackendAwake } from "../config/selectors.js";
import { subscribeIncomingRequests } from "./followState.js";
import { initDirectoryView, destroyDirectoryView } from "./directoryView.js";
import { initRequestsView, destroyRequestsView } from "./requestsView.js";
import { initConversationsView, destroyConversationsView } from "./conversationsView.js";
import { closeProfileView } from "./profileView.js";
import { closeThreadView } from "./threadView.js";

const peopleOpenBtn = document.getElementById("peopleOpenBtn");
const peopleSection = document.getElementById("peopleSection");
const peopleCloseBtn = document.getElementById("peopleCloseBtn");
const peopleBackBtn = document.getElementById("peopleBackBtn");
const peopleTitle = document.getElementById("peopleTitle");
const peopleTabs = document.getElementById("peopleTabs");
const peopleNavBadge = document.getElementById("peopleNavBadge");
const requestsBadge = document.getElementById("requestsBadge");
const mobileTabPeopleBadge = document.getElementById("mobileTabPeopleBadge");

const TAB_TITLES = {
  directory: "Discover",
  requests: "Requests",
  messages: "Messages"
};

let activeTab = "directory";
let stopBadgeListener = null;
let initialized = false;

// Panels pushed on top of the active tab (a profile, an open thread).
// A plain array is enough depth for this app's actual navigation —
// tab → profile → thread is as deep as it ever goes — without needing
// a router.
let stack = [];

export function initPeopleSection() {
  peopleOpenBtn.classList.remove("hidden");

  if (initialized) return;
  initialized = true;

  peopleOpenBtn.addEventListener("click", open);
  peopleCloseBtn.addEventListener("click", close);
  peopleBackBtn.addEventListener("click", back);

  peopleTabs.querySelectorAll(".people-tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  stopBadgeListener = subscribeIncomingRequests(requests => updateBadge(requests.length));
}

export function destroyPeopleSection() {
  peopleOpenBtn.classList.add("hidden");
  close();

  if (!initialized) return;
  initialized = false;

  if (stopBadgeListener) stopBadgeListener();
  stopBadgeListener = null;

  updateBadge(0);
}

function updateBadge(count) {
  for (const el of [peopleNavBadge, requestsBadge, mobileTabPeopleBadge]) {
    if (!el) continue;
    el.textContent = count > 9 ? "9+" : String(count);
    el.classList.toggle("hidden", count === 0);
  }
}

function syncViewport() {
  if (!window.visualViewport) return;
  const vv = window.visualViewport;

  peopleSection.style.height = `${vv.height}px`;
  peopleSection.style.top = `${vv.offsetTop}px`;
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    if (!peopleSection.classList.contains("hidden")) syncViewport();
  });
  window.visualViewport.addEventListener("scroll", () => {
    if (!peopleSection.classList.contains("hidden")) syncViewport();
  });
}

function open() {
  document.getElementById("app").classList.add("people-open");
  peopleSection.classList.remove("hidden");

  syncViewport();
  prewarmBackend();

  initDirectoryView();
  initRequestsView();
  initConversationsView();

  showTab(activeTab);
}

/** Silent — no bubble, no button state. Just gets the dyno warm before the user's first Follow/Send tap. */
async function prewarmBackend() {
  if (isBackendAwake()) return;

  try {
    const token = await getTokenOptional();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(WAKE_API_URL, { method: "POST", headers });
    if (response.ok) setBackendAwake(true);
  } catch {
    // Silent by design — the real request will just take a while
    // if this didn't land, same as it would have anyway.
  }
}

function close() {
  document.getElementById("app").classList.remove("people-open");
  peopleSection.classList.add("hidden");
  peopleSection.style.height = "";
  peopleSection.style.top = "";

  stack = [];
  closeProfileView();
  closeThreadView();
  destroyDirectoryView();
  destroyRequestsView();
  destroyConversationsView();
}

function switchTab(tab) {
  activeTab = tab;
  stack = [];
  showTab(tab);
}

function showTab(tab) {
  peopleTabs.classList.remove("hidden");
  peopleBackBtn.classList.add("hidden");
  peopleTitle.textContent = TAB_TITLES[tab];

  peopleTabs.querySelectorAll(".people-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  showPanel(`${tab}Panel`);
}

function showPanel(panelId) {
  document.querySelectorAll(".people-panel").forEach(p => p.classList.remove("active"));
  document.getElementById(panelId)?.classList.add("active");
}

/** Called by a view module when the user drills into a profile or a thread. */
export function pushPanel(panelId, title) {
  stack.push({ panelId, title });
  peopleTabs.classList.add("hidden");
  peopleBackBtn.classList.remove("hidden");
  peopleTitle.textContent = title;
  showPanel(panelId);
}

function back() {
  const leaving = stack.pop();
  if (leaving?.panelId === "profilePanel") closeProfileView();
  if (leaving?.panelId === "threadPanel") closeThreadView();

  if (stack.length === 0) {
    showTab(activeTab);
    return;
  }

  const top = stack[stack.length - 1];
  peopleTitle.textContent = top.title;
  showPanel(top.panelId);
}
