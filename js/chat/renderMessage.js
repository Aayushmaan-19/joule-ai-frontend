import {
  USER_PIC,
  BOT_PIC
} from "../utils/constants.js";

import { chat }
from "../utils/dom.js";

import {
  smoothScrollToBottom
}
from "./scrollManager.js";

import { currentProfile } from "../config/selectors.js";

import { speakText } from "../api/ttsService.js";

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const SOUND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

function createBotActions(bubble) {
  const actions = document.createElement("div");
  actions.className = "bubble-actions";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "bubble-btn copy-btn";
  copyBtn.title = "Copy";
  copyBtn.innerHTML = COPY_ICON;

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(bubble.innerText);
    copyBtn.innerHTML = CHECK_ICON;
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.innerHTML = COPY_ICON;
      copyBtn.classList.remove("copied");
    }, 1500);
  });

  // Sound button
  const soundBtn = document.createElement("button");
  soundBtn.className = "bubble-btn sound-btn";
  soundBtn.title = "Speak";
  soundBtn.innerHTML = SOUND_ICON;

  soundBtn.addEventListener("click", () => {
    const text = bubble.innerText.trim();
    if (!text || soundBtn.classList.contains("speaking")) return;
    soundBtn.classList.add("speaking");
    speakText(text).then(audio => {
      audio.addEventListener("ended", () => soundBtn.classList.remove("speaking"));
    }).catch(() => soundBtn.classList.remove("speaking"));
  });

  actions.append(copyBtn, soundBtn);
  return actions;
}

export function addMessage(
  message,
  type
) {

  const div =
    document.createElement("div");

  div.className =
    "message " + type;

  const img =
    document.createElement("img");

  img.src =
    type === "user"
      ? (currentProfile()?.avatar || USER_PIC)
      : BOT_PIC;

  const bubble =
    document.createElement("div");

  bubble.className = "chat";
  bubble.innerHTML = message;

  if (type === "user") {

    div.append(
      bubble,
      img
    );

  } else {

    const wrapper = document.createElement("div");
    wrapper.className = "bot-bubble-wrapper";
    wrapper.append(createBotActions(bubble), bubble);

    div.append(
      img,
      wrapper
    );
  }

  chat.appendChild(div);

  smoothScrollToBottom();

  return bubble;
}
