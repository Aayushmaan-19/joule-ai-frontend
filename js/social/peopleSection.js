import { wakeBackend } from "../api/wakeService.js";
import { subscribeIncomingRequests } from "./followState.js";
import { initDirectoryView, destroyDirectoryView } from "./directoryView.js";
import { initRequestsView, destroyRequestsView } from "./requestsView.js";
import { initConversationsView, destroyConversationsView } from "./conversationsView.js";
import { openProfileFor, closeProfileView } from "./profileView.js";
import { closeThreadView } from "./threadView.js";
import { navigate } from "../ui/router.js";

const peopleOpenBtn = document.getElementById("peopleOpenBtn");
const peopleSection = document.getElementById("peopleSection");
const peopleCloseBtn = document.getElementById("peopleCloseBtn");
const peopleBackBtn = document.getElementById("peopleBackBtn");
const peopleTitle = document.getElementById("peopleTitle");
const peopleTabs = document.getElementById("peopleTabs");
const peopleNavBadge = document.getElementById("peopleNavBadge");
const requestsBadge = document.getElementById("requestsBadge");
const mobileTabPeopleBadge = document.getElementById("mobileTabPeopleBadge");
const peopleRailBadge = document.getElementById("peopleRailBadge");

// The header names the section: chats live under "Messages", requests and
// discovery both live under "People". Thread / profile views swap in a
// person's name on mobile.
const TAB_TITLES = { messages: "Messages", requests: "People", directory: "People" };

// Which rail button is lit for each tab.
const RAIL_FOR_TAB = { messages: "messages", requests: "directory", directory: "directory" };

// Desktop shows a list, a thread and a profile side by side, so a panel only
// replaces the panel in its own slot there. Mobile shows one panel at a time.
const SLOT = {
  directoryPanel: "list",
  requestsPanel: "list",
  messagesPanel: "list",
  threadPanel: "thread",
  profilePanel: "profile"
};

const desktopQuery = window.matchMedia("(min-width: 769px)");

let activeTab = "messages";
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

  // Desktop rail: Joule leaves, Messages / People switch tab, the last button
  // leaves for the profile panel (same hand-off the mobile tab bar does).
  document.getElementById("peopleRailHome").addEventListener("click", close);
  peopleSection.querySelectorAll("[data-rail-tab]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.railTab));
  });
  document.getElementById("peopleRailProfile").addEventListener("click", () => {
    close();
    document.getElementById("profileBtn")?.click();
  });

  // Empty-state buttons ("Find people") name the tab they go to.
  peopleSection.addEventListener("click", e => {
    const go = e.target.closest("[data-goto-tab]");
    if (go) switchTab(go.dataset.gotoTab);
  });

  // Crossing the desktop/mobile breakpoint changes how many panels may be
  // visible at once, so land back on the tab's list instead of a half state.
  desktopQuery.addEventListener("change", () => {
    if (peopleSection.classList.contains("hidden")) return;
    stack = [];
    showTab(activeTab);
    navigate(`/social/${activeTab}`);
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
  for (const el of [peopleNavBadge, requestsBadge, mobileTabPeopleBadge, peopleRailBadge]) {
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

export function open() {
  document.getElementById("app").classList.add("people-open");
  peopleSection.classList.remove("hidden");

  syncViewport();

  // Almost always a no-op by now — the loading screen's own wake
  // ping has usually already landed by the time someone taps here.
  // This is just the safety net for the rare case that ping failed.
  wakeBackend();

  initDirectoryView();
  initRequestsView();
  initConversationsView();

  showTab(activeTab);
  navigate(`/social/${activeTab}`);
}

export function close() {
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

  navigate("/chat");
}

export function switchTab(tab) {
  activeTab = tab;
  stack = [];
  showTab(tab);
  navigate(`/social/${tab}`);
}

function showTab(tab) {
  peopleTabs.classList.remove("hidden");
  peopleBackBtn.classList.add("hidden");
  peopleTitle.textContent = TAB_TITLES[tab] || "People";

  peopleTabs.querySelectorAll(".people-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  peopleSection.querySelectorAll("[data-rail-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.railTab === RAIL_FOR_TAB[tab]);
  });

  // Showing a tab always means no thread or profile is open next to it.
  closeProfileView();
  closeThreadView();
  hidePanel("threadPanel");
  hidePanel("profilePanel");

  showPanel(`${tab}Panel`);
}

function hidePanel(panelId) {
  document.getElementById(panelId)?.classList.remove("active");
}

function showPanel(panelId) {
  const slot = SLOT[panelId];

  document.querySelectorAll(".people-panel").forEach(p => {
    if (desktopQuery.matches && SLOT[p.id] !== slot) return;
    p.classList.remove("active");
  });
  document.getElementById(panelId)?.classList.add("active");
}

/** Shows a panel next to what's already open without touching the back stack
 *  or the URL — the profile that sits beside an open thread on desktop. */
export function showPanelBeside(panelId) {
  showPanel(panelId);
}

/** Called by a view module when the user drills into a profile or a thread.
 *  `uid` is stored alongside the panel so back() can rebuild the right
 *  /social/profile/:uid or /social/messages/:uid URL when unwinding to it. */
export function pushPanel(panelId, title, uid) {
  stack.push({ panelId, title, uid });

  if (!desktopQuery.matches) {
    peopleTabs.classList.add("hidden");
    peopleBackBtn.classList.remove("hidden");
    peopleTitle.textContent = title;
    showPanel(panelId);
    return;
  }

  // Desktop keeps the tabs and list in place. A profile opened from the list
  // replaces any open thread; a thread brings its person's profile along.
  if (panelId === "profilePanel") {
    closeThreadView();
    hidePanel("threadPanel");
  }

  showPanel(panelId);
  if (panelId === "threadPanel") openProfileFor(uid, { embedded: true });
}

function back() {
  const leaving = stack.pop();
  if (leaving?.panelId === "profilePanel") closeProfileView();
  if (leaving?.panelId === "threadPanel") closeThreadView();

  if (stack.length === 0) {
    showTab(activeTab);
    navigate(`/social/${activeTab}`);
    return;
  }

  const top = stack[stack.length - 1];
  peopleTitle.textContent = top.title;
  showPanel(top.panelId);

  if (top.panelId === "profilePanel") navigate(`/social/profile/${top.uid}`);
  if (top.panelId === "threadPanel") navigate(`/social/messages/${top.uid}`);
}
