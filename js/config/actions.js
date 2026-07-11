import state from "./state.js";

export function setDarkMode(value) {

  state.ui.darkMode = value;
}

export function setMode(value) {

  state.ui.currentMode = value;
}

export function setScrolling(value) {

  state.ui.isUserScrollingUp = value;
}

export function setMusicPlaying(value) {

  state.music.isPlaying = value;
}

export function setLastSong(index) {

  state.music.lastSongIndex = index;
}

export function setListening(value) {

  state.voice.isListening = value;
}

export function setImageGenerationEnabled(value) {

  state.tools.imageGenerationEnabled = value;
}

export function setBackendAwake(value) {

  state.backend.isAwake = value;
}

export function setUser(user) {

  state.auth.user = user;
}

export function setProfile(profile) {

  state.auth.profile = profile;
}

export function setToken(token) {

  state.auth.token = token;
}

export function setConversation(id) {

  state.chat.currentConversationId = id;
}

export function addMessage(message) {

  state.chat.messages.push(message);
}

export function clearMessages() {

  state.chat.messages = [];
}