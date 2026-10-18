import { auth } from "../auth/firebase.js";
import {
  isDarkMode,
  isPlaying,
  isPrivateMode,
  currentProfile
} from "../config/selectors.js";

/**
 * Desktop sidebar shell: brand row, People/Gallery rows, and the profile
 * card with its menu and usage meter.
 *
 * Nothing here owns behaviour. Every row clicks a button that already
 * exists (themeBtn, musicBtn, clearBtn, logoutBtn, profileBtn, the
 * sidebar's own private/clear-all buttons, peopleOpenBtn, galleryToolBtn),
 * the same pattern profileManager.js and mobileNav.js use. The markup is
 * only displayed on desktop (see redesign.css).
 */

const $ = id => document.getElementById(id);

const ICONS = {
  newChat:
    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  people:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.7 3.5 2.6 3.5 6"/>',
  gallery:
    '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>',
  chevron: '<path d="m7 15 5-5 5 5"/>'
};

const icon = path =>
  `<svg class="sb2-ic" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

let usageEls = null;
let lastUsage = null;
let footEl = null;

/* Usage comes from the X-Remaining / X-Limit headers on chat replies,
   so the meter appears after the first reply of a session. */
window.addEventListener("joule:usage", e => {
  lastUsage = e.detail;
  renderUsage();
});

function renderUsage() {
  if (!usageEls || !lastUsage) return;
  const { remaining, limit } = lastUsage;
  usageEls.wrap.hidden = false;
  usageEls.text.textContent = `${remaining} left today`;
  usageEls.fill.style.width = `${Math.max(0, Math.min(100, (remaining / limit) * 100))}%`;
}

function displayName() {
  const user = auth.currentUser;
  return (
    currentProfile()?.username ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "You"
  );
}

export function initSidebarShell(sidebarEl) {
  sidebarEl.classList.add("sb2");

  /* ---------- brand row ---------- */
  const brand = document.createElement("div");
  brand.className = "sb2-brand";
  brand.innerHTML = `
    <img class="sb2-mark" src="Assets/logo/icon-512.png" alt="" />
    <span class="sb2-name">Joule</span>
    <button type="button" class="sb2-iconbtn" id="sb2NewChat" aria-label="New chat" title="New chat">${icon(ICONS.newChat)}</button>
  `;
  sidebarEl.prepend(brand);
  brand.querySelector("#sb2NewChat").addEventListener("click", () => {
    sidebarEl.querySelector("#sidebarNewBtn").click();
  });

  /* ---------- People / Gallery rows + Recents label ---------- */
  const nav = document.createElement("div");
  nav.className = "sb2-nav";
  nav.innerHTML = `
    <button type="button" class="sb2-row" id="sb2People">${icon(ICONS.people)}<span>People</span><span class="sb2-badge hidden" id="sb2PeopleBadge"></span></button>
    <button type="button" class="sb2-row" id="sb2Gallery">${icon(ICONS.gallery)}<span>Gallery</span></button>
    <div class="sb2-label">Recents</div>
  `;
  sidebarEl.querySelector(".sidebar-search-row").after(nav);

  nav.querySelector("#sb2People").addEventListener("click", () => $("peopleOpenBtn").click());
  nav.querySelector("#sb2Gallery").addEventListener("click", () => $("galleryToolBtn").click());

  // Mirror the existing unread badge instead of recomputing it.
  const srcBadge = $("peopleNavBadge");
  const badge = nav.querySelector("#sb2PeopleBadge");
  const syncBadge = () => {
    badge.textContent = srcBadge.textContent;
    badge.classList.toggle("hidden", srcBadge.classList.contains("hidden"));
  };
  new MutationObserver(syncBadge).observe(srcBadge, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true
  });
  syncBadge();

  /* ---------- profile card, menu, usage ---------- */
  const foot = document.createElement("div");
  foot.className = "sb2-foot";
  foot.innerHTML = `
    <div class="sb2-menu" id="sb2Menu" role="menu" hidden>
      <button type="button" class="sb2-mrow" role="menuitem" data-act="profile"><span>Profile &amp; settings</span></button>
      <button type="button" class="sb2-mrow" role="menuitem" data-act="theme"><span>Theme</span><span class="sb2-val" id="sb2ThemeVal"></span></button>
      <button type="button" class="sb2-mrow" role="menuitemcheckbox" data-act="music"><span>Music</span><i class="sb2-switch" id="sb2MusicSw"></i></button>
      <button type="button" class="sb2-mrow" role="menuitemcheckbox" data-act="private"><span>Private chat</span><i class="sb2-switch" id="sb2PrivateSw"></i></button>
      <button type="button" class="sb2-mrow" role="menuitem" data-act="clear"><span>Clear this chat</span></button>
      <button type="button" class="sb2-mrow" role="menuitem" data-act="wipe"><span>Delete all history</span></button>
      <button type="button" class="sb2-mrow" role="menuitem" data-act="logout"><span>Log out</span></button>
    </div>
    <div class="sb2-card">
      <button type="button" class="sb2-who" id="sb2Who" aria-haspopup="menu" aria-expanded="false">
        <img class="sb2-avatar" id="sb2Avatar" alt="" />
        <span class="sb2-id"><strong id="sb2Name"></strong><small>Verified</small></span>
        ${icon(ICONS.chevron)}
      </button>
      <div class="sb2-usage" id="sb2Usage" hidden>
        <div class="sb2-usage-row"><span>Daily usage</span><span id="sb2UsageText"></span></div>
        <div class="sb2-bar"><i id="sb2UsageFill"></i></div>
      </div>
    </div>
    <div class="sb2-sign">Owner : Aayushmaan</div>
  `;
  sidebarEl.appendChild(foot);
  footEl = foot;

  usageEls = {
    wrap: foot.querySelector("#sb2Usage"),
    text: foot.querySelector("#sb2UsageText"),
    fill: foot.querySelector("#sb2UsageFill")
  };
  renderUsage();

  const menu = foot.querySelector("#sb2Menu");
  const who = foot.querySelector("#sb2Who");
  const avatar = foot.querySelector("#sb2Avatar");
  const nameEl = foot.querySelector("#sb2Name");

  const syncIdentity = () => {
    avatar.src = $("profileAvatar").src;
    nameEl.textContent = displayName();
  };
  new MutationObserver(syncIdentity).observe($("profileAvatar"), {
    attributes: true,
    attributeFilter: ["src"]
  });
  syncIdentity();

  const syncMenuState = () => {
    foot.querySelector("#sb2ThemeVal").textContent = isDarkMode() ? "Dark" : "Light";
    const music = foot.querySelector("#sb2MusicSw");
    music.classList.toggle("on", isPlaying());
    music.parentElement.setAttribute("aria-checked", String(isPlaying()));
    const priv = foot.querySelector("#sb2PrivateSw");
    priv.classList.toggle("on", isPrivateMode());
    priv.parentElement.setAttribute("aria-checked", String(isPrivateMode()));
  };

  const setMenu = open => {
    menu.hidden = !open;
    who.setAttribute("aria-expanded", String(open));
    if (open) {
      syncIdentity();
      syncMenuState();
    }
  };

  who.addEventListener("click", () => setMenu(menu.hidden));

  menu.addEventListener("click", e => {
    const row = e.target.closest(".sb2-mrow");
    if (!row) return;

    const act = row.dataset.act;
    // Toggle rows stay open so the switch visibly flips; navigation rows close.
    const keepOpen = act === "theme" || act === "music" || act === "private";

    switch (act) {
      case "profile": $("profileBtn").click(); break;
      case "theme": $("themeBtn").click(); break;
      case "music": $("musicBtn").click(); break;
      case "private": sidebarEl.querySelector("#sidebarPrivateBtn").click(); break;
      case "clear": $("clearBtn").click(); break;
      case "wipe": sidebarEl.querySelector("#sidebarClearAllBtn").click(); break;
      case "logout": $("logoutBtn").click(); break;
    }

    if (keepOpen) syncMenuState();
    else setMenu(false);
  });
}

/* One document-level listener for the whole app, not one per sidebar build. */
document.addEventListener("click", e => {
  if (!footEl || !footEl.isConnected) return;
  const menu = footEl.querySelector("#sb2Menu");
  if (!menu.hidden && !footEl.contains(e.target)) {
    menu.hidden = true;
    footEl.querySelector("#sb2Who").setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || !footEl || !footEl.isConnected) return;
  const menu = footEl.querySelector("#sb2Menu");
  if (!menu.hidden) {
    menu.hidden = true;
    footEl.querySelector("#sb2Who").setAttribute("aria-expanded", "false");
    footEl.querySelector("#sb2Who").focus();
  }
});
