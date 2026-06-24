// js/voice/services/TranscriptionService.js

import logger from "../utils/logger.js";

export default class TranscriptionService {
  constructor() {
    this.recognition = null;

    this.finalTranscript = "";

    this.liveCallback = null;
    this.finalCallback = null;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error("Speech Recognition not supported");
    }

    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;

    this.recognition.interimResults = true;

    this.recognition.lang = "en-US";

    this.recognition.onresult = (event) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      console.log("TRANSCRIPT:", this.finalTranscript + interim);

      if (this.liveCallback) {
        this.liveCallback(this.finalTranscript + interim);
      }
    };

    this.recognition.onerror = (error) => {
      logger.error(error);
    };

    this.recognition.onend = () => {
      logger.log("Recognition ended");

      if (this.finalCallback) {
        this.finalCallback(this.finalTranscript.trim());
      }
    };
  }

  start() {
    this.finalTranscript = "";

    this.recognition.start();

    logger.log("Transcription started");
  }

  stop() {
    this.recognition.stop();

    logger.log("Transcription stopping...");
  }
  onLive(callback) {
    this.liveCallback = callback;
  }

  onFinal(callback) {
    this.finalCallback = callback;
  }

  getTranscript() {
    return this.finalTranscript.trim();
  }
}
