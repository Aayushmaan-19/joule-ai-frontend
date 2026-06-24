import state from "./state.js";

export const isDarkMode =
  () => state.ui.darkMode;

export const currentMode =
  () => state.ui.currentMode;

export const isUserScrollingUp =
  () => state.ui.isUserScrollingUp;

export const isPlaying =
  () => state.music.isPlaying;

export const lastSong =
  () => state.music.lastSongIndex;

export const isListening =
  () => state.voice.isListening;

export const currentUser =
  () => state.auth.user;

export const authToken =
  () => state.auth.token;

export const messages =
  () => state.chat.messages;

export const conversationId =
  () => state.chat.currentConversationId;