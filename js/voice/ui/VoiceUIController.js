// js/voice/ui/VoiceUIController.js

export default class VoiceUIController {
  constructor() {
    this.overlay = document.getElementById("voiceOverlay");
    this.status = document.getElementById("voiceStatus");
    this.transcript = document.getElementById("liveTranscript");

    this.wave = document.querySelector(".voice-wave");
    this.core = document.querySelector(".voice-core");
    this.glow = document.querySelector(".voice-glow");

    this.micBtn = document.getElementById("micBtn");
  }

  // ======================
  // Overlay
  // ======================

  show() {
    if (!this.overlay) return;

    this.overlay.classList.add("active");

    document.body.classList.add("voice-active");
  }

  hide() {
    if (!this.overlay) return;

    this.overlay.classList.remove("active");

    document.body.classList.remove("voice-active");
  }

  // ======================
  // Status
  // ======================

  setStatus(text) {
    if (!this.status) return;

    this.status.textContent = text;
  }

  setIdle() {
    this.setStatus("Ready");
  }

  setListening() {
    this.setStatus("Listening...");
  }

  setProcessing() {
    this.setStatus("Processing...");
  }

  setError(message = "Error") {
    this.setStatus(message);
  }

  // ======================
  // Transcript
  // ======================

  setTranscript(text) {
    if (!this.transcript) return;

    this.transcript.textContent = text || "";
  }

  appendTranscript(text) {
    if (!this.transcript) return;

    this.transcript.textContent += text;
  }

  clearTranscript() {
    if (!this.transcript) return;

    this.transcript.textContent = "";
  }

  // ======================
  // Wave Animation
  // ======================

  updateWave(level = 0) {
    const scale = 1 + Math.min(level * 4, 0.8);

    if (this.wave) {
      this.wave.style.transform = `scale(${scale})`;
    }

    if (this.glow) {
      this.glow.style.transform = `scale(${scale + 0.15})`;
    }
  }

  resetWave() {
    if (this.wave) {
      this.wave.style.transform = "scale(1)";
    }

    if (this.glow) {
      this.glow.style.transform = "scale(1)";
    }
  }

  // ======================
  // Mic Button
  // ======================

  activateMic() {
    if (!this.micBtn) return;

    this.micBtn.classList.add("active");
  }

  deactivateMic() {
    if (!this.micBtn) return;

    this.micBtn.classList.remove("active");
  }

  // ======================
  // Full States
  // ======================

  listening() {
    this.show();
    this.activateMic();
    this.setListening();
  }

  processing() {
    this.setProcessing();
  }

  idle() {
    this.setIdle();
    this.deactivateMic();
    this.resetWave();
  }

  error(message) {
    this.setError(message);
    this.deactivateMic();
  }
}
