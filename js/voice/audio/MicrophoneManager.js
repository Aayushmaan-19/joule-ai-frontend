// js/voice/audio/MicrophoneManager.js

import logger from "../utils/logger.js";

export default class MicrophoneManager {
  constructor() {
    this.stream = null;
  }

  async start() {
    try {
      this.stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      logger.log("Microphone started");

      return this.stream;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  stop() {
    if (!this.stream) return;

    this.stream.getTracks().forEach(track => {
      track.stop();
    });

    this.stream = null;

    logger.log("Microphone stopped");
  }

  getStream() {
    return this.stream;
  }

  isActive() {
    return !!this.stream;
  }
}