import { auth } from "../auth/firebase.js";
import { openAuth, openLogin, profileBtn } from "../utils/dom.js";
import { open as openSidebar, close as closeSidebar } from "./sidebar.js";
import { fetchProfile } from "../auth/profileService.js";

const tabBar = document.getElementById("mobileTabBar");
const tabs = tabBar ? tabBar.querySelectorAll(".mobile-tab") : [];
const peopleOpenBtn = document.getElementById("peopleOpenBtn");
const peopleCloseBtn = document.getElementById("peopleCloseBtn");

const lockOverlay = document.getElementById("mobileLockOverlay");
const lockTitle = document.getElementById("mobileLockTitle");
const lockMessage = document.getElementById("mobileLockMessage");
const lockCta = document.getElementById("mobileLockCta");
const lockSecondary = document.getElementById("mobileLockSecondary");

// Checked in this order; the first one that fails is what gets shown.
const REQUIREMENTS = {
  chat: [], // always open — guests can already talk to Joule
  chats: ["verified"],
  people: ["verified", "hasUsername"],
  profile: ["authenticated"]
};

const LOCK_COPY = {
  authenticated: {
    title: "Sign up to continue",
    message: "Create an account to save chats, customize your profile, and connect with people."
  },
  verified: {
    title: "Verify your email",
    message: "Check your inbox for a verification link — this unlocks messaging and your chat history."
  },
  hasUsername: {
    title: "Set a username",
    message: "People and messaging need a username first — head to Profile to set one."
  }
};

let activeTab = "chat";
let hasUsername = false;

/** Cheap, best-effort cache — People's gate is a soft UX nicety; the
 * real enforcement is the backend's own username check on every
 * social route, which this can't bypass even if this cache is stale. */
async function refreshUsernameStatus() {
  const user = auth.currentUser;

  if (!user) {
    hasUsername = false;
    return;
  }

  try {
    const profile = await fetchProfile(user.uid);
    hasUsername = !!profile?.username;
  } catch {
    hasUsername = false;
  }
}

if (tabBar) {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  lockCta.addEventListener("click", async () => {
    const need = firstUnmetRequirement(activeTab);

    if (need === "verified" && auth.currentUser) {
      await auth.currentUser.reload();
      switchTab(activeTab);
      return;
    }
    if (need === "hasUsername") {
      switchTab("profile");
      return;
    }
    openAuth?.click();
  });
  lockSecondary.addEventListener("click", () => {
    openLogin?.click();
  });

  // Re-check the active tab whenever sign-in state changes — e.g. a
  // locked tab should unlock itself the moment verification lands,
  // without the person having to tap away and back.
  auth.onAuthStateChanged(async () => {
    await refreshUsernameStatus();
    switchTab(activeTab, true);
  });

  // sidebar.js dispatches this after starting a new chat, opening a
  // saved one, or toggling private/ghost mode — none of which know or
  // care that a tab bar exists. Routing back to "chat" here is what
  // actually shows the result instead of leaving the person parked on
  // the full-screen Chats tab. switchTab("chat") is already a safe
  // no-op if they weren't on Chats to begin with.
  window.addEventListener("joule:chat-opened", () => switchTab("chat"));
}

function firstUnmetRequirement(tab) {
  return (REQUIREMENTS[tab] || []).find(need => !meetsOne(need));
}

function meetsOne(need) {
  if (need === "hasUsername") return hasUsername;
  return document.body.classList.contains(need);
}

async function switchTab(tab, silent = false) {
  const wasActive = activeTab;
  activeTab = tab;

  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tab));

  // Leaving a panel-backed tab closes its panel so state doesn't leak
  // across tabs (e.g. People section wouldn't silently stay open
  // behind the Chat tab).
  if (wasActive !== tab || !silent) {
    if (wasActive === "chats") closeSidebar();
    if (wasActive === "people") peopleCloseBtn?.click();
    // Leaving Profile is the most likely moment a username was just
    // set — refresh before People's gate is evaluated below.
    if (wasActive === "profile") await refreshUsernameStatus();
  }

  const need = firstUnmetRequirement(tab);

  if (need) {
    showLock(need);
    return;
  }

  hideLock();

  if (tab === "chats") openSidebar();
  if (tab === "people") peopleOpenBtn?.click();
  if (tab === "profile") profileBtn?.click();
  // "chat" needs nothing — it's just whatever's already underneath.
}

function showLock(need) {
  const copy = LOCK_COPY[need] || LOCK_COPY.authenticated;

  lockTitle.textContent = copy.title;
  lockMessage.textContent = copy.message;
  lockSecondary.classList.toggle("hidden", need !== "authenticated");
  lockCta.textContent =
    need === "verified" ? "I've verified — refresh" : need === "hasUsername" ? "Set a username" : "Create account";

  lockOverlay.classList.remove("hidden");
  requestAnimationFrame(() => lockOverlay.classList.add("in"));
}

function hideLock() {
  lockOverlay.classList.remove("in");
  setTimeout(() => lockOverlay.classList.add("hidden"), 200);
}
