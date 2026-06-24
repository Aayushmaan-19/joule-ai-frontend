import { chat } from "../utils/dom.js";

let isUserScrollingUp = false;

chat.addEventListener("scroll", () => {

  const isAtBottom =
    chat.scrollHeight -
      chat.scrollTop <=
    chat.clientHeight + 10;

  isUserScrollingUp =
    !isAtBottom;
});

export function smoothScrollToBottom() {

  if (isUserScrollingUp) return;

  requestAnimationFrame(() => {

    chat.scrollTo({
      top: chat.scrollHeight,
      behavior: "auto",
    });
  });
}