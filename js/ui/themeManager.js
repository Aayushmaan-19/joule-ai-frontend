import {
  themeBtn,
  themeIcon
}
from "../utils/dom.js";

import {
  ICONS
}
from "../utils/constants.js";

import {
  setDarkMode
}
from "../config/actions.js";

import {
  isDarkMode
}
from "../config/selectors.js";

import {
  saveTheme
}
from "../config/persistence.js";

import {
  isShinigamiActive,
  disableShinigami
}
from "./animationManager.js";

function updateThemeUI() {

  document.body.classList.toggle(
    "dark",
    isDarkMode()
  );

  themeIcon.src =
    isDarkMode()
      ? ICONS.sun
      : ICONS.sparkles;
}

export function toggleTheme() {

  if (isShinigamiActive()) {
    disableShinigami();
  }

  setDarkMode(
    !isDarkMode()
  );

  updateThemeUI();

  saveTheme(
    isDarkMode()
  );

  themeBtn.classList.add(
    "spin"
  );

  setTimeout(() => {

    themeBtn.classList.remove(
      "spin"
    );

  }, 500);
}

export function initializeTheme() {

  updateThemeUI();
}

export function forceLightMode() {

  if (!isDarkMode()) return;

  setDarkMode(false);

  updateThemeUI();

  saveTheme(false);
}

themeBtn.addEventListener(
  "click",
  toggleTheme
);