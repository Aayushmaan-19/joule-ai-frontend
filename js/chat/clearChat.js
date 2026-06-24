import { chat } from "../utils/dom.js";
import { clearMessages } from "../config/actions.js";
import { saveCurrentSession, startNewSession } from "./chatHistory.js";

export function clearChat(saveFirst = true) {
  if (saveFirst) {
    saveCurrentSession();
  }

  chat.innerHTML = "";

  startNewSession();
}
