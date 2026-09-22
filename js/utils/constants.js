export const ICONS = {
  play: "Assets/Icons/play.svg",
  pause: "Assets/Icons/pause.svg",

  mic: "Assets/Icons/mic.svg",

  sparkles: "Assets/Icons/sparkles.svg",
  sun: "Assets/Icons/sun.svg",
};

export const USER_PIC =
  "Assets/Images/user.jpeg";

export const BOT_PIC =
  "Assets/Images/bot.jpeg";

export const SONGS = [
  "Assets/Songs/Sahiba.mp3",
  "Assets/Songs/Tu Hai Kaha.mp3",
  "Assets/Songs/Samjho Na.mp3",
  "Assets/Songs/Pal Pal.mp3",
  "Assets/Songs/Aarzu.mp3",
];

export const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  "https://joule-ai-backend.onrender.com"
).replace(/\/+$/, "");

export const API_URL = `${BACKEND_BASE_URL}/api/ai/chat`;

export const WAKE_API_URL = `${BACKEND_BASE_URL}/api/wake`;

export const AUTH_API_URL = `${BACKEND_BASE_URL}/api/auth`;

export const IMAGE_API_URL = `${BACKEND_BASE_URL}/api/image/generate`;

export const SOCIAL_API_URL = `${BACKEND_BASE_URL}/api/social`;

export const PROFILE_API_URL = `${BACKEND_BASE_URL}/api/profile`;

export const GALLERY_API_URL = `${BACKEND_BASE_URL}/api/image/gallery`;

export const SILENCE_THRESHOLD = 8;

export const SILENCE_DURATION = 3000;