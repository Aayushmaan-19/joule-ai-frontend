import { speakText } from "../api/ttsService.js";
import { forceLightMode } from "./themeManager.js";

let currentMode = "normal";

export function activateShinigamiProtocol() {
  if (currentMode === "shinigami") return;
  currentMode = "shinigami";
  document.body.classList.add("shinigami");

  forceLightMode();

  showShinigamiToast("Shinigami Protocol — Activated 💀");
}

export function disableShinigami() {
  if (currentMode === "normal") return;
  currentMode = "normal";
  document.body.classList.remove("shinigami");
  showShinigamiToast("Returning to normal mode ✨");
}

export function isShinigamiActive() {
  return currentMode === "shinigami";
}

/* =========================================================
   TRIGGER 1: Click "Aayushmaan" 7 times rapidly
========================================================= */

const CLICK_TARGET = 7;
const CLICK_WINDOW = 2000;

let clickCount = 0;
let clickTimer = null;

function initSignatureClick() {
  const sig = document.querySelector(".signature");
  if (!sig) return;

  sig.style.cursor = "default";
  sig.style.userSelect = "none";

  sig.addEventListener("click", () => {
    clickCount++;

    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, CLICK_WINDOW);

    if (clickCount >= CLICK_TARGET) {
      clickCount = 0;
      clearTimeout(clickTimer);

      if (isShinigamiActive()) {
        disableShinigami();
      } else {
        activateShinigamiProtocol();
      }
    }
  });
}

/* =========================================================
   TRIGGER 2: Auto-activate at 12:00 AM and 3:00 AM
========================================================= */

function checkShinigamiHour() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const inWindow = (hour === 0) || (hour === 3 && minute === 0);
  const pastWindow = (hour === 3 && minute >= 1);

  if (inWindow) {
    activateShinigamiProtocol();
  } else if (pastWindow) {
    disableShinigami();
  }
}

function initTimeBasedShinigami() {
  checkShinigamiHour();
  setInterval(checkShinigamiHour, 60_000);
}

/* =========================================================
   SHINIGAMI TOAST
========================================================= */

function showShinigamiToast(message) {
  const existing = document.getElementById("shinigami-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "shinigami-toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 10px 20px;
    border-radius: 100px;
    font-size: 13px;
    font-family: sans-serif;
    letter-spacing: 0.02em;
    z-index: 9999;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

/* =========================================================
   STREAK TRACKER
   Shows a "N day streak" badge in the profile area
   Persisted in localStorage — no backend needed
========================================================= */

const STREAK_KEY = "joule_streak";

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function loadStreak() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStreak(data) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

export function recordActivity() {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const data = loadStreak();

  if (data.lastDate === today) return data.count || 1;

  if (data.lastDate === yesterday) {
    data.count = (data.count || 1) + 1;
  } else {
    data.count = 1;
  }

  data.lastDate = today;
  saveStreak(data);

  return data.count;
}

export function getStreak() {
  const data = loadStreak();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  if (data.lastDate !== today && data.lastDate !== yesterday) {
    return 0;
  }

  return data.count || 0;
}

export function renderStreakBadge() {
  const streak = getStreak();

  let badge = document.getElementById("joule-streak-badge");

  if (streak === 0) {
    if (badge) badge.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement("div");
    badge.id = "joule-streak-badge";
    badge.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: rgba(255,140,0,0.15);
      border: 1px solid rgba(255,140,0,0.4);
      color: #ff8c00;
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      font-family: sans-serif;
      letter-spacing: 0.03em;
      z-index: 100;
      backdrop-filter: blur(8px);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
    `;
    document.body.appendChild(badge);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        badge.style.opacity = "1";
      });
    });
  }

  const flame = streak >= 7 ? "🔥🔥" : "🔥";
  badge.textContent = `${flame} ${streak} day streak`;
}

/* =========================================================
   BOOT
========================================================= */

export function initAnimationManager() {
  initSignatureClick();
  initTimeBasedShinigami();

  recordActivity();
  renderStreakBadge();
}