/**
 * On-screen keyboard handling — one mechanism for the whole app.
 *
 * Why this exists: on iOS Safari (always) and Chrome for Android (by
 * default since v108) the keyboard does NOT resize the page. It slides
 * over it, and only window.visualViewport shrinks. The chat composer is
 * pinned to the bottom of the page, so it ended up hidden behind the
 * keyboard — you couldn't see what you were typing.
 *
 * This measures how much of the page the keyboard covers and publishes it
 * as CSS variables; keyboard.css shrinks the layout to the visible part.
 * When no keyboard is open every variable is 0 / unused, so nothing
 * changes anywhere else.
 */
const root = document.documentElement;
const vv = window.visualViewport;

const NON_TEXT_INPUTS = new Set([
  "checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"
]);

// Smaller than this is browser chrome (URL bar) moving, not a keyboard.
const MIN_KEYBOARD_PX = 80;

function opensKeyboard(el) {
  if (!el) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  return el.tagName === "INPUT" && !NON_TEXT_INPUTS.has(el.type);
}

let wasOpen = false;
let frame = 0;

function measure() {
  frame = 0;

  // Pinch-zoom also shrinks the visual viewport; that is not a keyboard.
  const zoomed = vv.scale > 1.01;

  let inset = 0;
  if (opensKeyboard(document.activeElement) && !zoomed) {
    inset = Math.round(window.innerHeight - vv.height - vv.offsetTop);
  }
  if (inset < MIN_KEYBOARD_PX) inset = 0;

  root.style.setProperty("--kb-inset", `${inset}px`);
  root.style.setProperty("--kb-main-h", `${Math.round(vv.height + vv.offsetTop)}px`);
  root.style.setProperty("--vv-height", `${Math.round(vv.height)}px`);
  root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);

  const open = inset > 0;
  root.classList.toggle("kb-open", open);

  // Just opened over the chat: show the newest message above the composer.
  if (open && !wasOpen && document.activeElement?.id === "input") {
    const chat = document.getElementById("chat");
    requestAnimationFrame(() => {
      if (chat) chat.scrollTop = chat.scrollHeight;
    });
  }
  wasOpen = open;
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

if (vv) {
  vv.addEventListener("resize", schedule);
  vv.addEventListener("scroll", schedule);
  document.addEventListener("focusin", schedule);
  // After blur the next focused element may be another input; wait a tick.
  document.addEventListener("focusout", () => setTimeout(schedule, 60));
  schedule();
}
