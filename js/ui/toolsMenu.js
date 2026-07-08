import { toolsBtn, toolsMenu, imageGenToggle } from "../utils/dom.js";
import { setImageGenerationEnabled } from "../config/actions.js";
import { isImageGenerationEnabled } from "../config/selectors.js";

function isMenuOpen() {
  return !toolsMenu.classList.contains("hidden");
}

function openMenu() {
  toolsMenu.classList.remove("hidden");
  toolsBtn.classList.add("open");
  toolsBtn.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  toolsMenu.classList.add("hidden");
  toolsBtn.classList.remove("open");
  toolsBtn.setAttribute("aria-expanded", "false");
}

function syncToggleUI() {
  const enabled = isImageGenerationEnabled();

  imageGenToggle.classList.toggle("active", enabled);
  imageGenToggle.setAttribute("aria-checked", String(enabled));
  toolsBtn.classList.toggle("has-active-tool", enabled);
}

toolsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  isMenuOpen() ? closeMenu() : openMenu();
});

imageGenToggle.addEventListener("click", () => {
  setImageGenerationEnabled(!isImageGenerationEnabled());
  syncToggleUI();
});

document.addEventListener("click", (e) => {
  if (isMenuOpen() && !toolsMenu.contains(e.target) && e.target !== toolsBtn) {
    closeMenu();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isMenuOpen()) {
    closeMenu();
  }
});

syncToggleUI();
