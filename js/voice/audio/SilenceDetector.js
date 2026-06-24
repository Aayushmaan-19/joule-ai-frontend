// js/voice/audio/SilenceDetector.js

import logger from "../utils/logger.js";
import {
  SILENCE_THRESHOLD,
  SILENCE_DURATION
} from "../utils/constants.js";

export default class SilenceDetector {
  constructor() {
    this.isSpeaking = false;

    this.silenceTimer = null;

    this.lastSpeechTime = 0;

    this.onSpeechStartCallback = null;
    this.onSilenceCallback = null;
  }

  analyze(volume) {
    const speaking =
      volume > SILENCE_THRESHOLD;

    if (speaking) {
      this._handleSpeech();
    } else {
      this._handleSilence();
    }
  }

  _handleSpeech() {
    this.lastSpeechTime = Date.now();

    if (!this.isSpeaking) {
      this.isSpeaking = true;

      logger.log("Speech started");

      if (this.onSpeechStartCallback) {
        this.onSpeechStartCallback();
      }
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  _handleSilence() {
    if (!this.isSpeaking) return;

    if (this.silenceTimer) return;

    this.silenceTimer = setTimeout(() => {
      const elapsed =
        Date.now() - this.lastSpeechTime;

      if (elapsed >= SILENCE_DURATION) {
        this._triggerSilence();
      } else {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    }, SILENCE_DURATION);
  }

  _triggerSilence() {
    this.isSpeaking = false;

    this.silenceTimer = null;

    logger.log("Silence detected");

    if (this.onSilenceCallback) {
      this.onSilenceCallback();
    }
  }

  onSpeechStart(callback) {
    this.onSpeechStartCallback = callback;
  }

  onSilence(callback) {
    this.onSilenceCallback = callback;
  }

  reset() {
    this.isSpeaking = false;

    this.lastSpeechTime = 0;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}