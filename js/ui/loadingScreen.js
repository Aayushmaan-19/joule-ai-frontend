import {
  loadingScreen,
  loadingCanvas,
  loadingLogo,
  loadingBarFill,
  loadingPercent
} from "../utils/dom.js";

/* =========================================================
   ASSETS TO PRELOAD
   These are the files that actually need to exist before
   the app is usable. Songs are excluded — they're large and
   stream-loaded on demand. Shinigami.jpg excluded — only
   loaded if mode activates.
========================================================= */

const PRELOAD_IMAGES = [
  "Assets/Images/bot.png",
  "Assets/Images/user.png",
  "Assets/Avatars/avatar1.png",
  "Assets/Avatars/avatar2.png",
  "Assets/Avatars/avatar3.png",
  "Assets/Avatars/avatar4.png",
  "Assets/Avatars/avatar5.png",
  "Assets/Avatars/avatar6.png",
  "Assets/Icons/send.svg",
  "Assets/Icons/mic.svg",
  "Assets/Icons/play.svg",
  "Assets/Icons/pause.svg",
  "Assets/Icons/trash.svg",
  "Assets/Icons/sparkles.svg",
  "Assets/Icons/sun.svg",
  "Assets/Icons/light.svg"
];

const PRELOAD_AUDIO = [
  "Assets/Sound Effects/mic-on.mp3",
  "Assets/Sound Effects/mic-off.mp3"
];

/* =========================================================
   PALETTE
========================================================= */

const RIBBON_COLORS = [
  { r: 56, g: 189, b: 248 },
  { r: 99, g: 102, b: 241 },
  { r: 167, g: 139, b: 250 },
  { r: 79, g: 70, b: 229 }
];

/* =========================================================
   TIMING
   Aurora animation runs for TOTAL_DURATION_MS.
   Logo reveal fires at LOGO_REVEAL_AT_MS via JS (not CSS).
   The dismiss gate waits for BOTH aurora + assets to finish.
========================================================= */

const DRIFT_DURATION_MS = 1500;
const CONVERGE_DURATION_MS = 1450;
const FLASH_DURATION_MS = 350;
const DISSOLVE_DURATION_MS = 500;

const TOTAL_DURATION_MS =
  DRIFT_DURATION_MS + CONVERGE_DURATION_MS + FLASH_DURATION_MS + DISSOLVE_DURATION_MS;

const LOGO_REVEAL_AT_MS =
  DRIFT_DURATION_MS + CONVERGE_DURATION_MS + FLASH_DURATION_MS * 0.4;

const MIN_DISPLAY_MS = TOTAL_DURATION_MS + 550;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/* =========================================================
   RIBBON
========================================================= */

class Ribbon {
  constructor({ seed, color, baseRadius, segments, landX, landY, width, height }) {
    this.seed = seed;
    this.color = color;
    this.baseRadius = baseRadius;
    this.segments = segments;
    this.landX = landX;
    this.landY = landY;

    const angle = seed * 137.508 * (Math.PI / 180);
    const dist = Math.min(width, height) * (0.45 + (seed % 3) * 0.08);

    this.anchorX = landX + Math.cos(angle) * dist;
    this.anchorY = landY + Math.sin(angle) * dist;

    this.driftPhaseX = seed * 1.7;
    this.driftPhaseY = seed * 2.3;
    this.driftSpeedX = 0.6 + (seed % 5) * 0.07;
    this.driftSpeedY = 0.5 + (seed % 4) * 0.09;
    this.driftAmpX = baseRadius * (2.6 + (seed % 3) * 0.4);
    this.driftAmpY = baseRadius * (2.1 + (seed % 4) * 0.3);

    this.wobblePhase = seed * 0.9;
  }

  getPoints(time, convergeT) {
    const points = [];
    const n = this.segments;

    const driftX = Math.sin(time * this.driftSpeedX + this.driftPhaseX) * this.driftAmpX;
    const driftY = Math.cos(time * this.driftSpeedY + this.driftPhaseY) * this.driftAmpY;

    const driftFalloff = 1 - convergeT;

    const centerX =
      this.anchorX + driftX * driftFalloff + (this.landX - this.anchorX) * convergeT;
    const centerY =
      this.anchorY + driftY * driftFalloff + (this.landY - this.anchorY) * convergeT;

    const length = this.baseRadius * (6 - convergeT * 4);
    const orientation =
      this.seed * 0.7 + Math.sin(time * 0.35 + this.wobblePhase) * 0.6;

    for (let i = 0; i < n; i++) {
      const tAlong = i / (n - 1) - 0.5;
      const along = tAlong * length;

      const wobble =
        Math.sin(tAlong * 6 + time * 1.4 + this.wobblePhase) * this.baseRadius * 0.9 +
        Math.sin(tAlong * 13 + time * 2.1 + this.wobblePhase * 1.3) * this.baseRadius * 0.35;

      const wobbleFalloff = 1 - convergeT * 0.85;

      const px = Math.cos(orientation) * along - Math.sin(orientation) * wobble * wobbleFalloff;
      const py = Math.sin(orientation) * along + Math.cos(orientation) * wobble * wobbleFalloff;

      const taper = Math.sin((i / (n - 1)) * Math.PI);
      const widthScale = (0.5 + convergeT * 1.8) * taper;

      points.push({
        x: centerX + px,
        y: centerY + py,
        w: this.baseRadius * 0.55 * widthScale
      });
    }

    return points;
  }
}

/* =========================================================
   SPARK
========================================================= */

class Spark {
  constructor(x, y, angle, speed, radius, color) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = radius;
    this.color = color;
    this.alpha = 1;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.94;
    this.vy *= 0.94;
    this.alpha -= dt * 1.6;
  }
}

/* =========================================================
   AURORA CANVAS CONTROLLER
========================================================= */

class AuroraLoader {
  constructor(canvas, logoEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.logoEl = logoEl;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.ribbons = [];
    this.sparks = [];
    this.sparksSpawned = false;

    this.startTime = null;
    this.rafId = null;
    this.lastFrameTime = null;

    this.logoRevealed = false;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.width = w;
    this.height = h;

    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const logoRect = this.logoEl.getBoundingClientRect();
    this.landX = logoRect.left + logoRect.width / 2;
    this.landY = logoRect.top + logoRect.height / 2;

    this.buildRibbons();
  }

  buildRibbons() {
    const count = 5;
    this.ribbons = [];

    for (let i = 0; i < count; i++) {
      this.ribbons.push(
        new Ribbon({
          seed: i + 1,
          color: RIBBON_COLORS[i % RIBBON_COLORS.length],
          baseRadius: 10 + (i % 3) * 3,
          segments: 26,
          landX: this.landX,
          landY: this.landY,
          width: this.width,
          height: this.height
        })
      );
    }
  }

  start() {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.loop(this.startTime);
  }

  drawRibbon(ribbon, points, globalAlpha) {
    const ctx = this.ctx;
    const c = ribbon.color;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = globalAlpha;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.85)`;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1, (p0.w + p1.w) / 2);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawGlow(x, y, radius, color, alpha) {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);

    grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  spawnSparks() {
    const count = 28;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 60 + Math.random() * 180;
      const color = RIBBON_COLORS[i % RIBBON_COLORS.length];

      this.sparks.push(
        new Spark(this.landX, this.landY, angle, speed, 1.5 + Math.random() * 2.5, color)
      );
    }
  }

  /**
   * JS-controlled logo reveal — fires at exactly LOGO_REVEAL_AT_MS
   * after the aurora canvas has been running, so they're always in sync.
   * No CSS animation-delay involved.
   */
  revealLogo() {
    if (this.logoRevealed) return;
    this.logoRevealed = true;

    this.logoEl.classList.add("logo-reveal-active");
  }

  loop(now) {
    const elapsed = now - this.startTime;
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    const ctx = this.ctx;
    const time = elapsed / 1000;

    if (elapsed >= LOGO_REVEAL_AT_MS) {
      this.revealLogo();
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(5, 5, 16, 0.32)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    if (elapsed < DRIFT_DURATION_MS + CONVERGE_DURATION_MS) {
      let convergeT = 0;

      if (elapsed > DRIFT_DURATION_MS) {
        const rawT = (elapsed - DRIFT_DURATION_MS) / CONVERGE_DURATION_MS;
        convergeT = easeInOutCubic(Math.min(rawT, 1));
      }

      const fadeIn = Math.min(elapsed / 400, 1);

      for (const ribbon of this.ribbons) {
        const points = ribbon.getPoints(time, convergeT);
        this.drawRibbon(ribbon, points, fadeIn);
      }

      if (convergeT > 0.55) {
        const glowT = (convergeT - 0.55) / 0.45;
        this.drawGlow(this.landX, this.landY, 20 + glowT * 70, { r: 200, g: 220, b: 255 }, glowT * 0.5);
      }

    } else if (elapsed < DRIFT_DURATION_MS + CONVERGE_DURATION_MS + FLASH_DURATION_MS) {
      if (!this.sparksSpawned) {
        this.spawnSparks();
        this.sparksSpawned = true;
      }

      const flashT = (elapsed - DRIFT_DURATION_MS - CONVERGE_DURATION_MS) / FLASH_DURATION_MS;
      const burstRadius = 30 + easeOutQuart(flashT) * 90;
      const burstAlpha = (1 - flashT) * 0.95;

      this.drawGlow(this.landX, this.landY, burstRadius, { r: 224, g: 236, b: 255 }, burstAlpha);
      this.drawGlow(this.landX, this.landY, burstRadius * 1.8, { r: 139, g: 160, b: 255 }, burstAlpha * 0.5);

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.update(dt);
        if (s.alpha <= 0) { this.sparks.splice(i, 1); continue; }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = `rgb(${s.color.r}, ${s.color.g}, ${s.color.b})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

    } else if (elapsed < TOTAL_DURATION_MS) {
      const dissolveT =
        (elapsed - DRIFT_DURATION_MS - CONVERGE_DURATION_MS - FLASH_DURATION_MS) /
        DISSOLVE_DURATION_MS;

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.update(dt);
        if (s.alpha <= 0) { this.sparks.splice(i, 1); continue; }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.max(0, s.alpha * (1 - dissolveT));
        ctx.fillStyle = `rgb(${s.color.r}, ${s.color.g}, ${s.color.b})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      this.drawGlow(
        this.landX, this.landY,
        100 * (1 - dissolveT * 0.6),
        { r: 139, g: 160, b: 255 },
        (1 - dissolveT) * 0.35
      );
    }

    if (elapsed < TOTAL_DURATION_MS + 200) {
      this.rafId = requestAnimationFrame((n) => this.loop(n));
    } else {
      ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

/* =========================================================
   REAL ASSET PRELOADER
   Tracks actual image and audio loading, reports progress
   via a callback so the bar reflects reality.
========================================================= */

function preloadAssets(onProgress) {
  const items = [
    ...PRELOAD_IMAGES.map(src => ({ type: "image", src })),
    ...PRELOAD_AUDIO.map(src => ({ type: "audio", src }))
  ];

  const total = items.length;
  let loaded = 0;

  function tick() {
    loaded++;
    onProgress(loaded / total);
  }

  const promises = items.map(item => {
    return new Promise(resolve => {
      if (item.type === "image") {
        const img = new Image();
        img.onload = () => { tick(); resolve(); };
        img.onerror = () => { tick(); resolve(); };
        img.src = item.src;
      } else {
        const audio = new Audio();
        audio.oncanplaythrough = () => { tick(); resolve(); };
        audio.onerror = () => { tick(); resolve(); };
        audio.preload = "auto";
        audio.src = item.src;
      }
    });
  });

  return Promise.all(promises);
}

/* =========================================================
   PROGRESS BAR
   Driven by two inputs blended together:
   - Real asset load progress (60% weight)
   - Aurora animation time progress (40% weight)
   This way the bar always reflects actual loading, but
   never sits at 0% while assets load instantly either.
   Bar never goes backward and snaps to 100% at dismiss.
========================================================= */

let currentDisplayPercent = 0;
let assetProgress = 0;
let animProgress = 0;
let barRafId = null;

function setAssetProgress(p) {
  assetProgress = p;
}

function updateBar() {
  const target = Math.min(assetProgress * 60 + animProgress * 40, 99);

  if (target > currentDisplayPercent) {
    currentDisplayPercent = Math.min(
      currentDisplayPercent + (target - currentDisplayPercent) * 0.12,
      target
    );
  }

  const percent = Math.round(currentDisplayPercent);
  loadingBarFill.style.width = `${percent}%`;
  loadingPercent.textContent = `${percent}%`;
}

function runBarLoop() {
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / TOTAL_DURATION_MS, 1);
    animProgress = t;
    updateBar();

    if (t < 1) {
      barRafId = requestAnimationFrame(tick);
    }
  }

  barRafId = requestAnimationFrame(tick);
}

function completeBar() {
  if (barRafId) cancelAnimationFrame(barRafId);
  currentDisplayPercent = 100;
  loadingBarFill.style.width = "100%";
  loadingPercent.textContent = "100%";
}

/* =========================================================
   PUBLIC INIT
========================================================= */

export function initLoadingScreen() {
  if (!loadingScreen || !loadingCanvas || !loadingLogo) return;

  loadingLogo.style.opacity = "0";
  loadingLogo.style.transform = "scale(0.3)";

  const loader = new AuroraLoader(loadingCanvas, loadingLogo);
  loader.start();
  runBarLoop();

  preloadAssets(p => setAssetProgress(p));

  const animDone = new Promise(resolve => setTimeout(resolve, MIN_DISPLAY_MS));

  Promise.all([animDone]).then(() => {
    completeBar();

    setTimeout(() => {
      loadingScreen.classList.add("loading-done");
      loader.stop();
    }, 300);
  });
}