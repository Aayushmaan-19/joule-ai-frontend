import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../auth/firebase.js";
import {
  listUsers,
  getUser,
  acceptRequest,
  declineRequest,
  impersonate,
  organizeDatabase,
  getAudit
} from "./adminApi.js";

/**
 * Admin console — only reachable for accounts the backend recognises as
 * admins (ADMIN_EMAILS). The button is hidden for everyone else, and every
 * endpoint behind it re-checks on the server, so hiding is cosmetic only.
 */

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const when = iso => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");

const panel = document.createElement("div");
panel.id = "adminPanel";
panel.className = "ad hidden";
panel.setAttribute("role", "dialog");
panel.setAttribute("aria-modal", "true");
panel.setAttribute("aria-label", "Admin console");
panel.innerHTML = `
  <div class="ad-backdrop"></div>
  <div class="ad-card">
    <header class="ad-head">
      <div class="ad-title">Admin console</div>
      <div class="ad-status" role="status"></div>
      <button type="button" class="ad-btn" data-act="audit">Audit log</button>
      <button type="button" class="ad-btn" data-act="organize">Organize database</button>
      <button type="button" class="ad-x" data-act="close" aria-label="Close">×</button>
    </header>
    <div class="ad-body">
      <aside class="ad-users">
        <input class="ad-search" type="search" placeholder="Search name, email, id…" autocomplete="off" autocapitalize="off" spellcheck="false" />
        <div class="ad-list"></div>
      </aside>
      <section class="ad-detail">
        <div class="ad-empty">Select a user to see their account.</div>
      </section>
    </div>
  </div>
`;

const el = {
  status: panel.querySelector(".ad-status"),
  search: panel.querySelector(".ad-search"),
  list: panel.querySelector(".ad-list"),
  detail: panel.querySelector(".ad-detail"),
  card: panel.querySelector(".ad-card")
};

let selectedUid = null;
let searchTimer = 0;

function say(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("err", isError);
}

/* ---------- user list ---------- */

function avatar(user) {
  return `<span class="ad-av">${esc((user.name || "?").replace(/^@/, "").charAt(0).toUpperCase())}</span>`;
}

async function loadUsers() {
  el.list.innerHTML = `<div class="ad-note">Loading…</div>`;

  try {
    const { users } = await listUsers(el.search.value);

    el.list.innerHTML = users.length
      ? users
          .map(
            u => `
        <button type="button" class="ad-user${u.uid === selectedUid ? " on" : ""}" data-uid="${esc(u.uid)}">
          ${avatar(u)}
          <span class="ad-user-meta">
            <strong>${esc(u.name)}</strong>
            <small>${esc(u.email || u.readableId || u.uid)}</small>
          </span>
          ${u.plan !== "free" ? `<span class="ad-chip">${esc(u.plan)}</span>` : ""}
        </button>`
          )
          .join("")
      : `<div class="ad-note">No users match.</div>`;
  } catch (err) {
    el.list.innerHTML = `<div class="ad-note err">${esc(err.message)}</div>`;
  }
}

/* ---------- one user ---------- */

const people = list =>
  list.length
    ? `<div class="ad-chips">${list.map(p => `<span class="ad-chip">${esc(p.name)}</span>`).join("")}</div>`
    : `<div class="ad-none">None</div>`;

function copyable(label, value) {
  return value
    ? `<button type="button" class="ad-copy" data-copy="${esc(value)}" title="Click to copy"><span>${esc(label)}</span><code>${esc(value)}</code></button>`
    : "";
}

async function showUser(uid) {
  selectedUid = uid;
  el.card.classList.add("has-detail");
  el.list.querySelectorAll(".ad-user").forEach(b => b.classList.toggle("on", b.dataset.uid === uid));
  el.detail.innerHTML = `<div class="ad-empty">Loading…</div>`;

  try {
    const d = await getUser(uid);
    const u = d.user;

    el.detail.innerHTML = `
      <button type="button" class="ad-back" data-act="back">← Users</button>

      <div class="ad-who">
        ${avatar(u)}
        <div>
          <h3>${esc(u.name)}</h3>
          <div class="ad-sub">${esc(u.email || "no email")}</div>
        </div>
        <div class="ad-badges">
          <span class="ad-chip">${esc(u.plan)}</span>
          <span class="ad-chip ${u.emailVerified ? "ok" : "warn"}">${u.emailVerified ? "verified" : "unverified"}</span>
        </div>
      </div>

      <div class="ad-ids">${copyable("readable id", u.readableId)}${copyable("uid", u.uid)}</div>

      <dl class="ad-facts">
        <div><dt>Joined</dt><dd>${esc(when(u.createdAt))}</dd></div>
        <div><dt>Last sign-in</dt><dd>${esc(when(u.lastLoginAt))}</dd></div>
        <div><dt>Followers</dt><dd>${u.followerCount}</dd></div>
        <div><dt>Following</dt><dd>${u.followingCount}</dd></div>
      </dl>

      <button type="button" class="ad-primary" data-act="open-as" data-uid="${esc(u.uid)}" data-name="${esc(u.name)}">
        Open as ${esc(u.name)}
      </button>

      <h4>Follow requests waiting for ${esc(u.name)}</h4>
      ${
        d.incomingRequests.length
          ? d.incomingRequests
              .map(
                r => `
        <div class="ad-row">
          ${avatar(r)}
          <span class="ad-user-meta"><strong>${esc(r.name)}</strong><small>${esc(when(r.requestedAt))}</small></span>
          <button type="button" class="ad-btn ok" data-act="accept" data-uid="${esc(u.uid)}" data-req="${esc(r.uid)}">Accept</button>
          <button type="button" class="ad-btn" data-act="decline" data-uid="${esc(u.uid)}" data-req="${esc(r.uid)}">Decline</button>
        </div>`
              )
              .join("")
          : `<div class="ad-none">No pending requests</div>`
      }

      <h4>Requests ${esc(u.name)} sent</h4>
      ${people(d.outgoingRequests)}

      <h4>Followers</h4>${people(d.followers)}
      <h4>Following</h4>${people(d.following)}

      <h4>Conversations</h4>
      ${
        d.conversations.length
          ? d.conversations
              .map(
                c => `
        <div class="ad-row">
          ${avatar(c.with)}
          <span class="ad-user-meta"><strong>${esc(c.with.name)}</strong><small>${esc(c.lastMessagePreview || "—")}</small></span>
          <small class="ad-time">${esc(when(c.lastMessageAt))}</small>
        </div>`
              )
              .join("")
          : `<div class="ad-none">No conversations</div>`
      }
    `;
  } catch (err) {
    el.detail.innerHTML = `<div class="ad-empty err">${esc(err.message)}</div>`;
  }
}

async function showAudit() {
  selectedUid = null;
  el.card.classList.add("has-detail");
  el.list.querySelectorAll(".ad-user").forEach(b => b.classList.remove("on"));
  el.detail.innerHTML = `<div class="ad-empty">Loading…</div>`;

  try {
    const { entries } = await getAudit();

    el.detail.innerHTML = `
      <button type="button" class="ad-back" data-act="back">← Users</button>
      <h3>Audit log</h3>
      <div class="ad-sub">Everything an admin did that opened or changed an account.</div>
      ${
        entries.length
          ? entries
              .map(
                e => `
        <div class="ad-row">
          <span class="ad-user-meta">
            <strong>${esc(e.action)}${e.targetLabel ? ` · ${esc(e.targetLabel)}` : ""}</strong>
            <small>${esc(e.adminEmail || "")}</small>
          </span>
          <small class="ad-time">${esc(when(e.at))}</small>
        </div>`
              )
              .join("")
          : `<div class="ad-none">Nothing yet</div>`
      }`;
  } catch (err) {
    el.detail.innerHTML = `<div class="ad-empty err">${esc(err.message)}</div>`;
  }
}

/* ---------- actions ---------- */

async function runAction(button) {
  const { act, uid, req, name } = button.dataset;

  if (act === "close") return close();

  if (act === "back") {
    el.card.classList.remove("has-detail");
    return;
  }

  if (act === "audit") return showAudit();

  if (act === "organize") {
    if (!confirm("Add readable ids and labels to every user, follow, request and conversation? Nothing is renamed or deleted.")) return;
    say("Organizing…");
    try {
      const { stats } = await organizeDatabase();
      say(`Done — ${stats.users} users, ${stats.follows} follows, ${stats.followRequests} requests, ${stats.conversations} conversations`);
      loadUsers();
    } catch (err) {
      say(err.message, true);
    }
    return;
  }

  if (act === "accept" || act === "decline") {
    button.disabled = true;
    try {
      await (act === "accept" ? acceptRequest : declineRequest)(uid, req);
      say(act === "accept" ? "Request accepted" : "Request declined");
      await showUser(uid);
      loadUsers();
    } catch (err) {
      say(err.message, true);
      button.disabled = false;
    }
    return;
  }

  if (act === "open-as") {
    if (!confirm(`Open ${name}'s account? You'll be signed in as them until you choose "Back to my account". This is recorded in the audit log.`)) return;
    button.disabled = true;
    say("Opening account…");
    try {
      const { customToken } = await impersonate(uid);
      await signInWithCustomToken(auth, customToken);
      close();
    } catch (err) {
      say(err.message, true);
      button.disabled = false;
    }
  }
}

panel.addEventListener("click", e => {
  if (e.target.closest(".ad-backdrop")) return close();

  const copy = e.target.closest("[data-copy]");
  if (copy) {
    navigator.clipboard?.writeText(copy.dataset.copy);
    say("Copied");
    return;
  }

  const user = e.target.closest(".ad-user");
  if (user) return showUser(user.dataset.uid);

  const action = e.target.closest("[data-act]");
  if (action) runAction(action);
});

el.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadUsers, 250);
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !panel.classList.contains("hidden")) close();
});

/* ---------- open / close ---------- */

function open() {
  say("");
  panel.classList.remove("hidden");
  requestAnimationFrame(() => panel.classList.add("in"));
  loadUsers();
}

function close() {
  panel.classList.remove("in");
  setTimeout(() => panel.classList.add("hidden"), 200);
}

document.body.appendChild(panel);

document.getElementById("profileAdminRow")?.addEventListener("click", () => {
  document.getElementById("closeProfile")?.click();
  open();
});

// A different person signing in / out must never inherit an open console.
window.addEventListener("joule:session", () => {
  panel.classList.add("hidden");
  panel.classList.remove("in");
  selectedUid = null;
});
