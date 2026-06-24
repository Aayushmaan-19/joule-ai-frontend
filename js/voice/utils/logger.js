// js/voice/utils/logger.js

const PREFIX = "[VOICE]";

export const logger = {
  log(...args) {
    console.log(PREFIX, ...args);
  },

  warn(...args) {
    console.warn(PREFIX, ...args);
  },

  error(...args) {
    console.error(PREFIX, ...args);
  }
};

export default logger;