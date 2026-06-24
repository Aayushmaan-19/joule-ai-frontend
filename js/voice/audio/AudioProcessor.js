// js/voice/audio/AudioProcessor.js

import logger from "../utils/logger.js";
import { AUDIO_BUFFER_SIZE } from "../utils/constants.js";

export default class AudioProcessor {
  constructor(stream) {
    this.stream = stream;

    this.audioContext = null;
    this.source = null;
    this.processor = null;

    this.isRunning = false;

    this.chunkCallback = null;
  }

  async init() {
    if (!this.stream) {
      throw new Error("Audio stream required");
    }

    this.audioContext =
      new (window.AudioContext ||
        window.webkitAudioContext)();

    this.source =
      this.audioContext.createMediaStreamSource(
        this.stream
      );

    this.processor =
      this.audioContext.createScriptProcessor(
        AUDIO_BUFFER_SIZE,
        1,
        1
      );

    this.source.connect(this.processor);

    this.processor.connect(
      this.audioContext.destination
    );

    this.processor.onaudioprocess = event => {
      if (!this.isRunning) return;

      const inputData =
        event.inputBuffer.getChannelData(0);

      const volume =
        this.calculateVolume(inputData);

      if (this.chunkCallback) {
        this.chunkCallback({
          audioData: new Float32Array(inputData),
          volume
        });
      }
    };

    logger.log("AudioProcessor initialized");
  }

  start() {
    this.isRunning = true;

    logger.log("AudioProcessor started");
  }

  stop() {
    this.isRunning = false;

    logger.log("AudioProcessor stopped");
  }

  destroy() {
    this.stop();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    logger.log("AudioProcessor destroyed");
  }

  onChunk(callback) {
    this.chunkCallback = callback;
  }

  calculateVolume(buffer) {
    let sum = 0;

    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }

    return Math.sqrt(sum / buffer.length);
  }
}