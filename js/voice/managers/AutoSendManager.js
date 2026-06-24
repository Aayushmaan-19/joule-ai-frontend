// js/voice/managers/AutoSendManager.js

import logger from "../utils/logger.js";

export default class AutoSendManager {
  constructor(sendCallback) {
    this.sendCallback = sendCallback;
  }

  send(text) {
    if (!text || !text.trim()) {
      logger.log("[AutoSend] Empty transcript");
      return;
    }

    logger.log(
      "[AutoSend] Sending:",
      text
    );

    this.sendCallback(text);
  }
}