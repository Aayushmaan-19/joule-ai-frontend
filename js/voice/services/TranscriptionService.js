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

    this.supported = Boolean(SpeechRecognition);

    if (!this.supported) {
      // No Web Speech API in this browser (e.g. desktop Firefox). Leave
      // this.recognition as null and stop here instead of throwing —
      // VoiceController is built once at module load in main.js, so a
      // throw here used to take the whole app down before chat, auth
      // or anything else could initialize. start()/stop() below check
      // `supported`/`recognition` instead.
      return;
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
    if (!this.supported) {
      throw new Error("Voice input isn't supported in this browser");
    }

    this.finalTranscript = "";

    this.recognition.start();

    logger.log("Transcription started");
  }

  stop() {
    if (!this.recognition) return;

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
