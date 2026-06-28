let currentMode = "normal";

export function activateShinigamiProtocol() {
  if (currentMode === "shinigami") return;
  currentMode = "shinigami";
  document.body.classList.add("shinigami");
}

export function disableShinigami() {
  if (currentMode === "normal") return;
  currentMode = "normal";
  document.body.classList.remove("shinigami");
}

export function isShinigamiActive() {
  return currentMode === "shinigami";
}

/* =========================================================
   TRIGGER 1: Click "Aayushmaan" 7 times rapidly
========================================================= */

const CLICK_TARGET   = 7;
const CLICK_WINDOW   = 2000; // ms — all 7 clicks must land within 2s

let clickCount  = 0;
let clickTimer  = null;

function initSignatureClick() {
  const sig = document.querySelector(".signature");
  if (!sig) return;

  sig.style.cursor = "default";
  sig.style.userSelect = "none";

  sig.addEventListener("click", () => {
    clickCount++;

    // Reset the window timer on every click
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
   Auto-deactivate at 3:01 AM (end of window)
========================================================= */

function checkShinigamiHour() {
  const now    = new Date();
  const hour   = now.getHours();
  const minute = now.getMinutes();

  const inWindow =
    (hour === 0) ||                          // 12:00 AM – 12:59 AM
    (hour === 3 && minute === 0);            // exactly 3:00 AM

  const pastWindow =
    (hour === 3 && minute >= 1);            // 3:01 AM — kill it

  if (inWindow) {
    activateShinigamiProtocol();
  } else if (pastWindow) {
    disableShinigami();
  }
}

function initTimeBasedShinigami() {
  // Check immediately on load
  checkShinigamiHour();

  // Then check every minute
  setInterval(checkShinigamiHour, 60_000);
}

/* =========================================================
   BOOT
========================================================= */

export function initAnimationManager() {
  initSignatureClick();
  initTimeBasedShinigami();
}