import { moreBtn, controls } from "../utils/dom.js";

function isMenuOpen() {
  return controls.classList.contains("menu-open");
}

function openMenu() {
  controls.classList.add("menu-open");
  moreBtn.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  controls.classList.remove("menu-open");
  moreBtn.setAttribute("aria-expanded", "false");
}

moreBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  isMenuOpen() ? closeMenu() : openMenu();
});

// Any action inside the popover (Music / Clear Chat / Theme) closes it,
// in addition to whatever handler that button already runs elsewhere.
controls.addEventListener("click", (e) => {
  if (e.target.closest(".icon-btn")) closeMenu();
});

document.addEventListener("click", (e) => {
  if (isMenuOpen() && !controls.contains(e.target) && e.target !== moreBtn) {
    closeMenu();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isMenuOpen()) {
    closeMenu();
  }
});
