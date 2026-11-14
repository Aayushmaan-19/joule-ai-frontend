/* =========================================================
   ROUTER
   Keeps the URL in sync with whichever panel is open, using the
   History API — /chat, /auth, /history, /profile, and /social with
   its own sub-paths (/social/directory, /social/requests,
   /social/messages, /social/messages/:uid, /social/profile/:uid).

   This module never duplicates panel logic. The real open/close
   functions (sidebar, auth modal, profile panel, social section)
   already exist elsewhere; each of them also calls navigate() here
   after doing its own work, purely to keep the address bar honest.
   navigate() itself only ever touches history — it's applyRoute()
   below (driven by popstate and the very first load) that actually
   calls those functions, so a real click and a typed/shared URL
   both end up going through the exact same code, just from
   opposite directions, with no risk of one re-triggering the other.
========================================================= */

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../auth/firebase.js";
import { open as openHistoryPanel, close as closeHistoryPanel } from "./sidebar.js";
import { openModal, closeAuthModal } from "./modalManager.js";
import { openProfile, closeProfilePanel } from "./profileManager.js";
import {
  open as openSocial,
  close as closeSocial,
  switchTab as switchSocialTab
} from "../social/peopleSection.js";
import { openProfileFor, closeProfileView } from "../social/profileView.js";
import { openThread, closeThreadView } from "../social/threadView.js";

const SOCIAL_TABS = ["directory", "requests", "messages"];

// True only while applyRoute() below is driving the UI from a path
// (popstate, or the very first load) — navigate() no-ops while this
// is set, since the URL is already exactly what's being applied.
let applyingRoute = false;

function normalize(path) {
  const [root, a, b] = path.split("/").filter(Boolean);

  if (!["chat", "auth", "history", "social", "profile"].includes(root)) {
    return "/chat";
  }

  if (root === "social") {
    if (a === "profile" && b) return `/social/profile/${b}`;
    if (a === "messages" && b) return `/social/messages/${b}`;
    if (SOCIAL_TABS.includes(a) && !b) return `/social/${a}`;
    return "/social/directory";
  }

  return `/${root}`;
}

// Mirrors mobileNav.js's REQUIREMENTS table for the two signals that
// are available synchronously (document.body's own classes). That
// table's username check is an async Firestore read and is already
// enforced server-side regardless, so it's left out here rather than
// making every route change wait on it.
function meetsGate(root) {
  if (root === "profile") return document.body.classList.contains("authenticated");
  if (root === "history" || root === "social") return document.body.classList.contains("verified");
  return true;
}

function applyRoute(path) {
  const parts = path.split("/").filter(Boolean);
  const root = parts[0];

  if (!meetsGate(root)) {
    if (location.pathname !== "/chat") history.replaceState(null, "", "/chat");
    applyRoute("/chat");
    return;
  }

  if (root !== "history") closeHistoryPanel();
  if (root !== "auth") closeAuthModal();
  if (root !== "profile") closeProfilePanel();
  if (root !== "social") closeSocial();

  if (root === "history") { openHistoryPanel(); return; }
  if (root === "auth") { openModal(); return; }
  if (root === "profile") { openProfile(); return; }

  if (root === "social") {
    closeThreadView();
    closeProfileView();
    openSocial();

    const [, kind, uid] = parts;
    if (kind === "profile" && uid) { openProfileFor(uid); return; }
    if (kind === "messages" && uid) { switchSocialTab("messages"); openThread(uid); return; }
    switchSocialTab(kind);
  }

  // root === "chat": nothing further to open.
}

/** Called by the real open/close functions after they've already done
 *  their own work, purely to keep the URL matching what's on screen. */
export function navigate(path) {
  if (applyingRoute) return;

  const target = normalize(path);
  if (location.pathname === target) return;

  history.pushState(null, "", target);
}

export function initRouter() {
  window.addEventListener("popstate", () => {
    applyingRoute = true;
    try {
      applyRoute(normalize(location.pathname));
    } finally {
      applyingRoute = false;
    }
  });

  // Waits for the first real auth-state resolution before applying the
  // page's starting URL, so the gate check above isn't reading the
  // authenticated/verified body classes before authState.js has had a
  // chance to set them. Best-effort: on a cold load this can still race
  // authState.js's own async work (avatar sync, etc.) that runs after
  // those classes are set — the same soft-gate tradeoff the mobile lock
  // overlay already accepts for this.
  const unsubscribe = onAuthStateChanged(auth, () => {
    unsubscribe();

    const initialPath = normalize(location.pathname);
    if (initialPath !== location.pathname) {
      history.replaceState(null, "", initialPath);
    }

    applyingRoute = true;
    try {
      applyRoute(initialPath);
    } finally {
      applyingRoute = false;
    }
  });
}
