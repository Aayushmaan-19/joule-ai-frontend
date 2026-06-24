import MicrophoneManager from "./audio/MicrophoneManager.js";
import AudioProcessor from "./audio/AudioProcessor.js";
import SilenceDetector from "./audio/SilenceDetector.js";

import VoiceStateManager from "./managers/VoiceStateManager.js";
import AutoSendManager from "./managers/AutoSendManager.js";

import TranscriptionService from "./services/TranscriptionService.js";

import VoiceUIController from "./ui/VoiceUIController.js";

import logger from "./utils/logger.js";

export default class VoiceController {
  constructor(options = {}) {
    this.hasSpoken = false;

    this.onTranscript = options.onTranscript || options.onSend || (() => {});

    this.mic = new MicrophoneManager();

    this.audioProcessor = null;

    this.silenceDetector = new SilenceDetector();

    this.state = new VoiceStateManager();

    this.ui = new VoiceUIController();

    this.transcription = new TranscriptionService();

    this.autoSend = new AutoSendManager((text) => {
      this.onTranscript(text);
    });

    this.finalTranscript = "";

    this.isFinishing = false;

    this.setupEvents();
  }

  setupEvents() {
    // Live transcript

    this.transcription.onLive((text) => {
      this.finalTranscript = text;

      this.ui.setTranscript(text);
    });

    this.transcription.onFinal((text) => {
      if (!text || text.trim().length < 3) {
        if (!this.hasSpoken) {
          this.ui.setError("Couldn't hear anything");

          setTimeout(() => {
            this.ui.hide();

            this.stop();
          }, 1200);

          return;
        }

        this.stop();
        return;
      }

      this.autoSend.send(text);

      this.stop();
    });

    // Silence detection

    this.silenceDetector.onSpeechStart(() => {
      this.hasSpoken = true;

      logger.log("Speech detected");
    });

    this.silenceDetector.onSilence(() => {
      logger.log("Auto stop triggered");

      this.finish();
    });
  }

  async start() {
    try {
      this.hasSpoken = false;

      this.finalTranscript = "";

      this.isFinishing = false;

      logger.log("Voice started");

      this.state.set("listening");

      this.ui.show();
      this.ui.setListening();
      this.ui.clearTranscript();
      this.ui.activateMic();

      const stream = await this.mic.start();

      this.audioProcessor = new AudioProcessor(stream);

      await this.audioProcessor.init();

      this.audioProcessor.onChunk(({ volume }) => {
        this.ui.updateWave(volume);

        this.silenceDetector.analyze(volume);
      });

      this.audioProcessor.start();

      this.transcription.start();
    } catch (error) {
      logger.error(error);

      this.state.set("error");

      this.ui.setError("Microphone Error");
    }
  }

  async finish() {
    if (this.isFinishing) return;

    this.isFinishing = true;

    try {
      this.state.set("processing");

      this.ui.setProcessing();

      this.transcription.stop();
    } catch (error) {
      logger.error(error);

      this.stop();
    }
  }

  stop() {
    this.isFinishing = false;

    logger.log("Voice stopped");

    if (this.audioProcessor) {
      this.audioProcessor.destroy();
      this.audioProcessor = null;
    }

    this.mic.stop();

    this.silenceDetector.reset();

    this.state.set("idle");

    this.ui.resetWave();
    this.ui.clearTranscript();
    this.ui.setIdle();
    this.ui.deactivateMic();

    setTimeout(() => {
      this.ui.hide();
    }, 300);
  }

  async toggle() {
    if (this.state.get() === "listening") {
      this.finish();
      return;
    }

    await this.start();
  }
}
