// js/voice/utils/EventEmitter.js

export default class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;

    this.events[event] =
      this.events[event].filter(fn => fn !== callback);
  }

  emit(event, data = null) {
    if (!this.events[event]) return;

    this.events[event].forEach(fn => fn(data));
  }
}