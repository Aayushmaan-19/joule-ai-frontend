// js/voice/managers/VoiceStateManager.js

import logger from "../utils/logger.js";
import { VOICE_STATE } from "../utils/constants.js";

export default class VoiceStateManager {
  constructor() {
    this.state = VOICE_STATE.IDLE;
  }

  set(state) {
    logger.log(
      `[VoiceState] ${this.state} → ${state}`
    );

    this.state = state;
  }

  get() {
    return this.state;
  }

  is(state) {
    return this.state === state;
  }

  reset() {
    this.state = VOICE_STATE.IDLE;
  }
}