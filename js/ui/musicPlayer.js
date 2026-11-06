import { ICONS } from "../utils/constants.js";
import { audio, musicBtn, musicIcon } from "../utils/dom.js";
import { setMusicPlaying, setLastSong } from "../config/actions.js";
import { isPlaying } from "../config/selectors.js";

/* =========================================================
   MUSIC PLAYER
   Pick any song, scrub to any point, skip ±10s, set the volume,
   shuffle / repeat, with an audio-reactive visualizer.

   The Music button (and the "Music" rows in the sidebar / profile)
   opens the player. While a song is loaded and the player is
   closed, a small mini-player pill keeps the basic controls close.

   Volume goes through a Web Audio GainNode, not audio.volume:
   iOS Safari ignores audio.volume (it is read-only there), so a
   plain volume slider would do nothing on iPhones.
========================================================= */

// Artist names come from each file's own tags (Sahiba had none).
// durations are only for first paint — the real value replaces them
// as soon as the file's metadata loads.
const TRACKS = [
  { file: "Assets/Songs/Sahiba.mp3", title: "Sahiba", artist: "", hue: 330, duration: 190 },
  { file: "Assets/Songs/Tu Hai Kaha.mp3", title: "Tu Hai Kahan", artist: "Usama Ali, AUR", hue: 205, duration: 263 },
  { file: "Assets/Songs/Samjho Na.mp3", title: "Samjho Na", artist: "Aditya Rikhari", hue: 28, duration: 172 },
  { file: "Assets/Songs/Pal Pal.mp3", title: "Pal Pal", artist: "AFUSIC", hue: 268, duration: 148 },
  { file: "Assets/Songs/Aarzu.mp3", title: "Aarzu", artist: "Asim Azhar, Madhurxo", hue: 168, duration: 192 }
];

const STORAGE_KEY = "joule_music";
const SKIP_SECONDS = 10;
const SEEK_STEPS = 1000;

/* ---------- persisted preferences ---------- */

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      volume: typeof saved.volume === "number" ? saved.volume : 0.8,
      shuffle: saved.shuffle === true,
      repeat: ["off", "all", "one"].includes(saved.repeat) ? saved.repeat : "all"
    };
  } catch {
    return { volume: 0.8, shuffle: false, repeat: "all" };
  }
}

const prefs = loadPrefs();

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // private mode / storage full — preferences just won't persist
  }
}

/* ---------- state ---------- */

let index = 0;
let started = false; // a song has been started at least once
let muted = false;
let seeking = false;
let panelOpen = false;
const history = []; // indices played before the current one, for Previous

/* ---------- Web Audio graph (built on first play, inside a user gesture) ---------- */

let ctx = null;
let gain = null;
let analyser = null;
let freq = null;

function ensureGraph() {
  if (ctx) return;

  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();

  const source = ctx.createMediaElementSource(audio);
  gain = ctx.createGain();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  freq = new Uint8Array(analyser.frequencyBinCount);

  source.connect(gain);
  gain.connect(analyser);
  analyser.connect(ctx.destination);

  applyVolume();
}

function effectiveVolume() {
  return muted ? 0 : prefs.volume * prefs.volume; // squared: finer control at low volume
}

function applyVolume() {
  if (gain) gain.gain.value = effectiveVolume();
}

/* ---------- icons ---------- */

const svg = inner =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const I = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.4" height="15" rx="1.4"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2.2v14H6zM20 5.9v12.2a.8.8 0 0 1-1.25.66L9.9 12.66a.8.8 0 0 1 0-1.32l8.85-6.1A.8.8 0 0 1 20 5.9z"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.8 5H18v14h-2.2zM4 5.9v12.2a.8.8 0 0 0 1.25.66l8.85-6.1a.8.8 0 0 0 0-1.32L5.25 5.24A.8.8 0 0 0 4 5.9z"/></svg>`,
  back: svg(`<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4.6H8"/><text x="12" y="15.6" text-anchor="middle" font-size="7.6" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text>`),
  fwd: svg(`<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 4v4.6H16"/><text x="12" y="15.6" text-anchor="middle" font-size="7.6" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text>`),
  shuffle: svg(`<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>`),
  repeat: svg(`<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>`),
  repeatOne: svg(`<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11.2 10.2 12.6 9.4v5.4" stroke-width="1.7"/>`),
  volHigh: svg(`<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/>`),
  volLow: svg(`<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>`),
  volMute: svg(`<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>`),
  close: svg(`<path d="M6 6l12 12M18 6 6 18"/>`)
};

/* ---------- panel + mini-player markup ---------- */

const $ = (root, sel) => root.querySelector(sel);

const panel = document.createElement("div");
panel.id = "musicPanel";
panel.className = "mp hidden";
panel.setAttribute("role", "dialog");
panel.setAttribute("aria-modal", "true");
panel.setAttribute("aria-label", "Music player");
panel.innerHTML = `
  <div class="mp-backdrop"></div>
  <div class="mp-card">
    <div class="mp-glow" aria-hidden="true"><i></i><i></i><i></i></div>
    <button type="button" class="mp-close" aria-label="Close player">${I.close}</button>

    <div class="mp-main">
      <div class="mp-stage">
        <canvas class="mp-viz" aria-hidden="true"></canvas>
        <div class="mp-disc" aria-hidden="true">
          <div class="mp-disc-label"><span class="mp-disc-initial"></span></div>
        </div>
      </div>

      <div class="mp-info">
        <div class="mp-eyebrow">Joule Radio</div>
        <h2 class="mp-title"></h2>
        <p class="mp-artist"></p>

        <div class="mp-seek">
          <span class="mp-time mp-time-cur">0:00</span>
          <input type="range" class="mp-range mp-seek-range" min="0" max="${SEEK_STEPS}" step="1" value="0" aria-label="Seek" />
          <span class="mp-time mp-time-dur">0:00</span>
        </div>

        <div class="mp-transport">
          <button type="button" class="mp-btn mp-toggle" data-act="shuffle" aria-label="Shuffle" aria-pressed="false">${I.shuffle}</button>
          <button type="button" class="mp-btn" data-act="prev" aria-label="Previous song">${I.prev}</button>
          <button type="button" class="mp-btn mp-skip" data-act="back" aria-label="Back 10 seconds">${I.back}</button>
          <button type="button" class="mp-btn mp-play" data-act="play" aria-label="Play">${I.play}</button>
          <button type="button" class="mp-btn mp-skip" data-act="fwd" aria-label="Forward 10 seconds">${I.fwd}</button>
          <button type="button" class="mp-btn" data-act="next" aria-label="Next song">${I.next}</button>
          <button type="button" class="mp-btn mp-toggle" data-act="repeat" aria-label="Repeat" aria-pressed="false">${I.repeat}</button>
        </div>

        <div class="mp-volume">
          <button type="button" class="mp-btn mp-mute" data-act="mute" aria-label="Mute">${I.volHigh}</button>
          <input type="range" class="mp-range mp-vol-range" min="0" max="100" step="1" aria-label="Volume" />
          <span class="mp-vol-pct"></span>
        </div>
      </div>
    </div>

    <div class="mp-list">
      <div class="mp-list-head">Songs</div>
      <ol class="mp-tracks"></ol>
    </div>
  </div>
`;

const mini = document.createElement("div");
mini.id = "musicMini";
mini.className = "mp-mini hidden";
mini.innerHTML = `
  <button type="button" class="mp-mini-open" aria-label="Open music player">
    <span class="mp-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="mp-mini-text"><strong></strong><small></small></span>
  </button>
  <button type="button" class="mp-mini-play" aria-label="Play">${I.play}</button>
`;

const el = {
  title: $(panel, ".mp-title"),
  artist: $(panel, ".mp-artist"),
  initial: $(panel, ".mp-disc-initial"),
  seek: $(panel, ".mp-seek-range"),
  cur: $(panel, ".mp-time-cur"),
  dur: $(panel, ".mp-time-dur"),
  play: $(panel, ".mp-play"),
  vol: $(panel, ".mp-vol-range"),
  volPct: $(panel, ".mp-vol-pct"),
  mute: $(panel, ".mp-mute"),
  shuffle: $(panel, '[data-act="shuffle"]'),
  repeat: $(panel, '[data-act="repeat"]'),
  tracks: $(panel, ".mp-tracks"),
  viz: $(panel, ".mp-viz"),
  miniTitle: $(mini, ".mp-mini-text strong"),
  miniArtist: $(mini, ".mp-mini-text small"),
  miniPlay: $(mini, ".mp-mini-play")
};

/* ---------- formatting ---------- */

function fmt(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function artistLine(track) {
  return track.artist || "Joule playlist";
}

/* ---------- rendering ---------- */

function renderTracks() {
  el.tracks.innerHTML = TRACKS.map(
    (t, i) => `
    <li>
      <button type="button" class="mp-track" data-index="${i}" style="--t-h:${t.hue}">
        <span class="mp-track-num">
          <span class="mp-track-n">${i + 1}</span>
          <span class="mp-eq mp-eq-sm" aria-hidden="true"><i></i><i></i><i></i></span>
        </span>
        <span class="mp-track-meta">
          <strong>${t.title}</strong>
          <small>${artistLine(t)}</small>
        </span>
        <span class="mp-track-dur" data-dur="${i}">${fmt(t.duration)}</span>
      </button>
    </li>`
  ).join("");
}

function renderTrackInfo() {
  const t = TRACKS[index];

  panel.style.setProperty("--mp-h", String(t.hue));
  mini.style.setProperty("--mp-h", String(t.hue));

  el.title.textContent = t.title;
  el.artist.textContent = artistLine(t);
  el.initial.textContent = t.title.charAt(0);
  el.miniTitle.textContent = t.title;
  el.miniArtist.textContent = artistLine(t);
  el.dur.textContent = fmt(audio.duration || t.duration);

  // restart the title swap animation
  const info = $(panel, ".mp-info");
  info.classList.remove("mp-swap");
  void info.offsetWidth;
  info.classList.add("mp-swap");

  el.tracks.querySelectorAll(".mp-track").forEach(btn => {
    btn.classList.toggle("is-current", Number(btn.dataset.index) === index);
  });

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: artistLine(t),
      album: "Joule AI",
      artwork: [{ src: "Assets/logo/icon-512.png", sizes: "512x512", type: "image/png" }]
    });
  }
}

function renderPlayState() {
  const playing = isPlaying();

  panel.classList.toggle("is-playing", playing);
  mini.classList.toggle("is-playing", playing);
  musicBtn.classList.toggle("is-playing", playing);
  el.tracks.classList.toggle("is-playing", playing);

  el.play.innerHTML = playing ? I.pause : I.play;
  el.play.setAttribute("aria-label", playing ? "Pause" : "Play");
  el.miniPlay.innerHTML = playing ? I.pause : I.play;
  el.miniPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
  musicIcon.src = playing ? ICONS.pause : ICONS.play;

  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }

  window.dispatchEvent(new CustomEvent("joule:music", { detail: { playing, title: TRACKS[index].title } }));
}

function renderModes() {
  el.shuffle.classList.toggle("on", prefs.shuffle);
  el.shuffle.setAttribute("aria-pressed", String(prefs.shuffle));

  el.repeat.classList.toggle("on", prefs.repeat !== "off");
  el.repeat.setAttribute("aria-pressed", String(prefs.repeat !== "off"));
  el.repeat.innerHTML = prefs.repeat === "one" ? I.repeatOne : I.repeat;
  el.repeat.setAttribute(
    "aria-label",
    prefs.repeat === "one" ? "Repeat one song" : prefs.repeat === "all" ? "Repeat all songs" : "Repeat off"
  );
}

function renderVolume() {
  const pct = muted ? 0 : Math.round(prefs.volume * 100);

  el.vol.value = String(pct);
  el.vol.style.setProperty("--p", `${pct}%`);
  el.volPct.textContent = `${pct}%`;
  el.mute.innerHTML = pct === 0 ? I.volMute : pct < 50 ? I.volLow : I.volHigh;
  el.mute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
}

function renderProgress() {
  const duration = audio.duration;
  const current = audio.currentTime || 0;
  const ratio = Number.isFinite(duration) && duration > 0 ? current / duration : 0;

  if (!seeking) {
    el.seek.value = String(Math.round(ratio * SEEK_STEPS));
    el.seek.style.setProperty("--p", `${ratio * 100}%`);
    el.cur.textContent = fmt(current);
  }

  if (Number.isFinite(duration) && audio.buffered.length) {
    const end = audio.buffered.end(audio.buffered.length - 1);
    el.seek.style.setProperty("--b", `${Math.min(100, (end / duration) * 100)}%`);
  }

  if ("mediaSession" in navigator && Number.isFinite(duration) && duration > 0) {
    try {
      navigator.mediaSession.setPositionState({ duration, position: Math.min(current, duration), playbackRate: 1 });
    } catch {
      // some browsers reject a position that races a track change
    }
  }
}

/* ---------- transport ---------- */

function loadTrack(i, { autoplay }) {
  index = i;
  setLastSong(index);

  audio.src = TRACKS[index].file;
  audio.currentTime = 0;

  renderTrackInfo();
  el.seek.value = "0";
  el.seek.style.setProperty("--p", "0%");
  el.seek.style.setProperty("--b", "0%");
  el.cur.textContent = "0:00";

  if (autoplay) play();
}

async function play() {
  if (!audio.src) {
    loadTrack(index, { autoplay: false });
  }

  ensureGraph();

  try {
    // Both calls start inside the tap that triggered this: iOS only lets
    // audio start from the user's gesture, so nothing may be awaited first.
    await Promise.all([ctx.resume(), audio.play()]);
  } catch (err) {
    // Skipping tracks quickly interrupts the previous play() — not a failure.
    if (err.name === "AbortError") return;

    console.error("[music] play failed:", err);
    setMusicPlaying(false);
    renderPlayState();
    return;
  }

  started = true;
  mini.classList.toggle("hidden", panelOpen);
}

function pause() {
  audio.pause();
}

function togglePlay() {
  if (audio.paused) play();
  else pause();
}

function pickNext() {
  if (prefs.shuffle && TRACKS.length > 1) {
    let n;
    do {
      n = Math.floor(Math.random() * TRACKS.length);
    } while (n === index);
    return n;
  }
  return (index + 1) % TRACKS.length;
}

function next() {
  history.push(index);
  if (history.length > 20) history.shift();
  loadTrack(pickNext(), { autoplay: true });
}

function previous() {
  // Past the first seconds, "previous" restarts the song — the usual convention.
  if (audio.currentTime > 3 || history.length === 0) {
    audio.currentTime = 0;
    renderProgress();
    return;
  }
  loadTrack(history.pop(), { autoplay: true });
}

function skip(seconds) {
  const duration = audio.duration;
  if (!Number.isFinite(duration)) return;
  audio.currentTime = Math.max(0, Math.min(duration - 0.25, audio.currentTime + seconds));
  renderProgress();
}

function setVolume(pct) {
  prefs.volume = Math.max(0, Math.min(1, pct / 100));
  muted = prefs.volume === 0;
  applyVolume();
  renderVolume();
  savePrefs();
}

function toggleMute() {
  if (prefs.volume === 0) {
    prefs.volume = 0.5;
    muted = false;
  } else {
    muted = !muted;
  }
  applyVolume();
  renderVolume();
  savePrefs();
}

function cycleRepeat() {
  prefs.repeat = prefs.repeat === "off" ? "all" : prefs.repeat === "all" ? "one" : "off";
  renderModes();
  savePrefs();
}

function toggleShuffle() {
  prefs.shuffle = !prefs.shuffle;
  renderModes();
  savePrefs();
}

/* ---------- audio element events ---------- */

audio.addEventListener("play", () => {
  setMusicPlaying(true);
  renderPlayState();
  startViz();
});

audio.addEventListener("pause", () => {
  setMusicPlaying(false);
  renderPlayState();
});

audio.addEventListener("timeupdate", renderProgress);
audio.addEventListener("progress", renderProgress);

audio.addEventListener("loadedmetadata", () => {
  el.dur.textContent = fmt(audio.duration);
  const cell = el.tracks.querySelector(`[data-dur="${index}"]`);
  if (cell) cell.textContent = fmt(audio.duration);
  renderProgress();
});

audio.addEventListener("waiting", () => panel.classList.add("is-loading"));
audio.addEventListener("playing", () => panel.classList.remove("is-loading"));
audio.addEventListener("canplay", () => panel.classList.remove("is-loading"));

audio.addEventListener("error", () => {
  panel.classList.remove("is-loading");
  console.error("[music] couldn't load:", TRACKS[index].file);
  el.artist.textContent = "Couldn't load this song";
});

audio.addEventListener("ended", () => {
  if (prefs.repeat === "one") {
    audio.currentTime = 0;
    play();
    return;
  }

  const lastOfList = !prefs.shuffle && index === TRACKS.length - 1;

  if (lastOfList && prefs.repeat === "off") {
    audio.currentTime = 0;
    renderProgress();
    return;
  }

  next();
});

/* ---------- panel open / close ---------- */

function openPanel() {
  panelOpen = true;
  panel.classList.remove("hidden");
  requestAnimationFrame(() => panel.classList.add("in"));
  mini.classList.add("hidden");
  sizeCanvas();
  startViz();
  el.play.focus({ preventScroll: true });
}

function closePanel() {
  panelOpen = false;
  panel.classList.remove("in");
  mini.classList.toggle("hidden", !started);
  setTimeout(() => {
    if (!panelOpen) panel.classList.add("hidden");
  }, 280);
}

function togglePanel() {
  if (panelOpen) closePanel();
  else openPanel();
}

/* ---------- visualizer ---------- */

const g = el.viz.getContext("2d");
let vizRunning = false;
let vizSize = 0;

function sizeCanvas() {
  const stage = el.viz.parentElement;
  const css = stage.clientWidth;
  if (!css) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  vizSize = css;
  el.viz.width = Math.round(css * dpr);
  el.viz.height = Math.round(css * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", () => {
  if (panelOpen) sizeCanvas();
});

const BARS = 72;

function drawViz() {
  vizRunning = false;
  if (!panelOpen) return;

  const size = vizSize;
  const c = size / 2;
  const hue = TRACKS[index].hue;
  const inner = size * 0.335;
  const maxLen = size * 0.15;

  g.clearRect(0, 0, size, size);
  g.lineCap = "round";
  g.lineWidth = Math.max(2, size * 0.0125);

  let bass = 0;

  if (analyser && isPlaying()) {
    analyser.getByteFrequencyData(freq);

    for (let i = 0; i < 6; i++) bass += freq[i];
    bass = bass / 6 / 255;

    for (let i = 0; i < BARS; i++) {
      // fold the spectrum so the ring is symmetric left/right
      const half = i < BARS / 2 ? i : BARS - 1 - i;
      const bin = 2 + Math.floor((half / (BARS / 2)) * 56);
      const v = Math.pow(freq[bin] / 255, 1.35);
      const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
      const len = 3 + v * maxLen;

      g.strokeStyle = `hsla(${hue + (i / BARS) * 40}, 95%, ${58 + v * 22}%, ${0.55 + v * 0.45})`;
      g.beginPath();
      g.moveTo(c + Math.cos(angle) * inner, c + Math.sin(angle) * inner);
      g.lineTo(c + Math.cos(angle) * (inner + len), c + Math.sin(angle) * (inner + len));
      g.stroke();
    }
  } else {
    // paused: a calm, static ring
    for (let i = 0; i < BARS; i++) {
      const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
      g.strokeStyle = `hsla(${hue + (i / BARS) * 40}, 80%, 62%, 0.28)`;
      g.beginPath();
      g.moveTo(c + Math.cos(angle) * inner, c + Math.sin(angle) * inner);
      g.lineTo(c + Math.cos(angle) * (inner + 3), c + Math.sin(angle) * (inner + 3));
      g.stroke();
    }
  }

  panel.style.setProperty("--bass", bass.toFixed(3));

  if (isPlaying()) startViz();
}

function startViz() {
  if (vizRunning || !panelOpen) return;
  vizRunning = true;
  requestAnimationFrame(drawViz);
}

/* the browser pauses rAF in background tabs; resume cleanly on return */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) startViz();
});

/* ---------- input handling ---------- */

panel.addEventListener("click", e => {
  if (e.target.closest(".mp-backdrop") || e.target.closest(".mp-close")) {
    closePanel();
    return;
  }

  const trackBtn = e.target.closest(".mp-track");
  if (trackBtn) {
    const i = Number(trackBtn.dataset.index);
    if (i === index && audio.src) {
      togglePlay();
    } else {
      history.push(index);
      loadTrack(i, { autoplay: true });
    }
    return;
  }

  const btn = e.target.closest("[data-act]");
  if (!btn) return;

  switch (btn.dataset.act) {
    case "play": togglePlay(); break;
    case "next": next(); break;
    case "prev": previous(); break;
    case "back": skip(-SKIP_SECONDS); break;
    case "fwd": skip(SKIP_SECONDS); break;
    case "shuffle": toggleShuffle(); break;
    case "repeat": cycleRepeat(); break;
    case "mute": toggleMute(); break;
  }
});

el.seek.addEventListener("pointerdown", () => {
  seeking = true;
});

el.seek.addEventListener("input", () => {
  const ratio = Number(el.seek.value) / SEEK_STEPS;
  el.seek.style.setProperty("--p", `${ratio * 100}%`);
  const duration = Number.isFinite(audio.duration) ? audio.duration : TRACKS[index].duration;
  el.cur.textContent = fmt(ratio * duration);
});

el.seek.addEventListener("change", () => {
  const duration = audio.duration;
  if (Number.isFinite(duration)) {
    audio.currentTime = (Number(el.seek.value) / SEEK_STEPS) * duration;
  }
  seeking = false;
  renderProgress();
});

// keyboard users change the range without a pointer
el.seek.addEventListener("keydown", () => {
  seeking = false;
});

el.vol.addEventListener("input", () => setVolume(Number(el.vol.value)));

mini.addEventListener("click", e => {
  if (e.target.closest(".mp-mini-play")) togglePlay();
  else if (e.target.closest(".mp-mini-open")) openPanel();
});

document.addEventListener("keydown", e => {
  if (!panelOpen) return;

  if (e.key === "Escape") {
    closePanel();
    return;
  }

  // let focused buttons / sliders handle their own keys
  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "BUTTON") return;

  switch (e.key) {
    case " ": e.preventDefault(); togglePlay(); break;
    case "ArrowLeft": skip(-SKIP_SECONDS); break;
    case "ArrowRight": skip(SKIP_SECONDS); break;
    case "ArrowUp": e.preventDefault(); setVolume(Math.min(100, prefs.volume * 100 + 5)); break;
    case "ArrowDown": e.preventDefault(); setVolume(Math.max(0, prefs.volume * 100 - 5)); break;
    case "m": case "M": toggleMute(); break;
    case "n": case "N": next(); break;
    case "p": case "P": previous(); break;
  }
});

/* ---------- lock-screen / hardware media keys ---------- */

if ("mediaSession" in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", play);
  ms.setActionHandler("pause", pause);
  ms.setActionHandler("previoustrack", previous);
  ms.setActionHandler("nexttrack", next);
  ms.setActionHandler("seekbackward", () => skip(-SKIP_SECONDS));
  ms.setActionHandler("seekforward", () => skip(SKIP_SECONDS));
  ms.setActionHandler("seekto", d => {
    if (Number.isFinite(d.seekTime)) audio.currentTime = d.seekTime;
  });
}

/* ---------- boot ---------- */

export function initMusicPlayer() {
  document.body.append(panel, mini);

  renderTracks();
  renderTrackInfo();
  renderModes();
  renderVolume();
  renderPlayState();

  musicBtn.addEventListener("click", togglePanel);
}
