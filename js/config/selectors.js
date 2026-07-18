import state from "./state.js";

export const isDarkMode =
  () => state.ui.darkMode;

export const isPlaying =
  () => state.music.isPlaying;

export const currentMode =
  () => state.ui.currentMode;

export const lastSong =
  () => state.music.lastSongIndex;

export const isListening =
  () => state.voice.isListening;

export const isImageGenerationEnabled =
  () => state.tools.imageGenerationEnabled;

export const isBackendAwake =
  () => state.backend.isAwake;

export const currentUser =
  () => state.auth.user;

export const currentProfile =
  () => state.auth.profile;

export const isPrivateMode =
  () => state.chat.isPrivate;