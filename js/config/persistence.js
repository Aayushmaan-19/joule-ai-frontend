import {
  setDarkMode
}
from "./actions.js";

export function loadSettings() {

  const savedTheme =
    localStorage.getItem(
      "theme"
    );

  setDarkMode(
    savedTheme === "dark"
  );
}

export function saveTheme(
  isDark
) {

  localStorage.setItem(
    "theme",
    isDark
      ? "dark"
      : "light"
  );
}