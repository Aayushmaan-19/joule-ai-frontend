import { auth } from "../auth/firebase.js";
import { openAuth, openLogin, profileBtn } from "../utils/dom.js";
import { open as openSidebar, close as closeSidebar } from "./sidebar.js";

const tabBar = document.getElementById("mobileTabBar");
const tabs = tabBar ? tabBar.querySelectorAll(".mobile-tab") : [];
const peopleOpenBtn = document.getElementById("peopleOpenBtn");
const peopleCloseBtn = document.getElementById("peopleCloseBtn");

const lockOverlay = document.getElementById("mobileLockOverlay");
const lockTitle = document.getElementById("mobileLockTitle");
const lockMessage = document.getElementById("mobileLockMessage");
const lockCta = document.getElementById("mobileLockCta");
const lockSecondary = document.getElementById("mobileLockSecondary");

const REQUIREMENTS = {
  chat: null, // always open — guests can already talk to Joule
  chats: "verified",
  people: "verified",
  profile: "authenticated"
};

const LOCK_COPY = {
  authenticated: {
    title: "Sign up to continue",
    message: "Create an account to save chats, customize your profile, and connect with people."
  },
  verified: {
    title: "Verify your email",
    message: "Check your inbox for a verification link — this unlocks messaging and your chat history."
  }
};

let activeTab = "chat";

if (tabBar) {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  lockCta.addEventListener("click", async () => {
    if (REQUIREMENTS[activeTab] === "verified" && auth.currentUser) {
      await auth.currentUser.reload();
      switchTab(activeTab);
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
  auth.onAuthStateChanged(() => switchTab(activeTab, true));
}

function meetsRequirement(tab) {
  const need = REQUIREMENTS[tab];
  if (!need) return true;
  return document.body.classList.contains(need);
}

function switchTab(tab, silent = false) {
  const wasActive = activeTab;
  activeTab = tab;

  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tab));

  // Leaving a panel-backed tab closes its panel so state doesn't leak
  // across tabs (e.g. People section wouldn't silently stay open
  // behind the Chat tab).
  if (wasActive !== tab || !silent) {
    if (wasActive === "chats") closeSidebar();
    if (wasActive === "people") peopleCloseBtn?.click();
  }

  if (!meetsRequirement(tab)) {
    showLock(tab);
    return;
  }

  hideLock();

  if (tab === "chats") openSidebar();
  if (tab === "people") peopleOpenBtn?.click();
  if (tab === "profile") profileBtn?.click();
  // "chat" needs nothing — it's just whatever's already underneath.
}

function showLock(tab) {
  const need = REQUIREMENTS[tab];
  const copy = LOCK_COPY[need] || LOCK_COPY.authenticated;

  lockTitle.textContent = copy.title;
  lockMessage.textContent = copy.message;
  lockSecondary.classList.toggle("hidden", need === "verified");
  lockCta.textContent = need === "verified" ? "I've verified — refresh" : "Create account";

  lockOverlay.classList.remove("hidden");
  requestAnimationFrame(() => lockOverlay.classList.add("in"));
}

function hideLock() {
  lockOverlay.classList.remove("in");
  setTimeout(() => lockOverlay.classList.add("hidden"), 200);
}
