import {
  loadingScreen,
  loadingCanvas,
  loadingLogo,
  loadingBarFill,
  loadingPercent
} from "../utils/dom.js";

/* =========================================================
   PALETTE
   Same family as the logo (bot.png): deep navy, blue, cyan,
   violet — no new colors introduced.
========================================================= */

const RIBBON_COLORS = [
  { r: 56, g: 189, b: 248 },   // cyan
  { r: 99, g: 102, b: 241 },   // indigo/blue
  { r: 167, g: 139, b: 250 },  // violet
  { r: 79, g: 70, b: 229 }     // deep indigo
];

/* =========================================================
   TIMING
========================================================= */

const DRIFT_DURATION_MS = 1500;    // ribbons wander freely
const CONVERGE_DURATION_MS = 1450; // ribbons pull toward center
const FLASH_DURATION_MS = 350;     // bright condensation moment
const DISSOLVE_DURATION_MS = 500;  // ribbons fade as logo solidifies

const TOTAL_DURATION_MS =
  DRIFT_DURATION_MS + CONVERGE_DURATION_MS + FLASH_DURATION_MS + DISSOLVE_DURATION_MS;

const LOGO_REVEAL_AT_MS = DRIFT_DURATION_MS + CONVERGE_DURATION_MS + FLASH_DURATION_MS * 0.4;
const DISMISS_AT_MS = TOTAL_DURATION_MS + 550;

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/* =========================================================
   RIBBON
   A long soft stroke made of sampled points, each with its own
   layered-sine wobble. Points gradually interpolate from a wide
   freely-drifting spread toward a tight knot at the landing
   point as convergence progresses.
========================================================= */

class Ribbon {
  constructor({ seed, color, baseRadius, segments, landX, landY, width, height }) {
    this.seed = seed;
    this.color = color;
    this.baseRadius = baseRadius;
    this.segments = segments;
    this.landX = landX;
    this.landY = landY;

    // Each ribbon starts centered on a random anchor point well
    // outside the eventual landing spot, so it has real room to
    // drift before convergence pulls it in.
    const angle = seed * 137.508 * (Math.PI / 180); // golden-angle spread
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

  /**
   * Returns an array of {x, y, w} points describing the ribbon's
   * current shape, given a time value in seconds and a 0..1
   * convergence factor.
   */
  getPoints(time, convergeT) {
    const points = [];
    const n = this.segments;

    const driftX =
      Math.sin(time * this.driftSpeedX + this.driftPhaseX) * this.driftAmpX;
    const driftY =
      Math.cos(time * this.driftSpeedY + this.driftPhaseY) * this.driftAmpY;

    // As convergence increases, the ribbon's free-drift contribution
    // shrinks and it collapses toward the landing point.
    const driftFalloff = 1 - convergeT;

    const centerX = this.anchorX + driftX * driftFalloff +
      (this.landX - this.anchorX) * convergeT;
    const centerY = this.anchorY + driftY * driftFalloff +
      (this.landY - this.anchorY) * convergeT;

    const length = this.baseRadius * (6 - convergeT * 4);
    const orientation =
      this.seed * 0.7 + Math.sin(time * 0.35 + this.wobblePhase) * 0.6;

    for (let i = 0; i < n; i++) {
      const tAlong = i / (n - 1) - 0.5; // -0.5 .. 0.5 along the ribbon

      const along = tAlong * length;

      // Perpendicular wobble — multiple sine layers at different
      // frequencies so the ribbon undulates organically rather than
      // as a single clean wave.
      const wobble =
        Math.sin(tAlong * 6 + time * 1.4 + this.wobblePhase) * this.baseRadius * 0.9 +
        Math.sin(tAlong * 13 + time * 2.1 + this.wobblePhase * 1.3) * this.baseRadius * 0.35;

      const wobbleFalloff = 1 - convergeT * 0.85;

      const px = Math.cos(orientation) * along - Math.sin(orientation) * wobble * wobbleFalloff;
      const py = Math.sin(orientation) * along + Math.cos(orientation) * wobble * wobbleFalloff;

      // Taper width toward the ends of the ribbon, and thicken
      // overall as it converges (light "gathering" visually).
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
   SPARK PARTICLE (condensation flash burst)
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
   MAIN CONTROLLER
========================================================= */

export default class AuroraLoader {
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

      const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.85)`);
      grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0.85)`);

      ctx.strokeStyle = grad;
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

  loop(now) {
    const elapsed = now - this.startTime;
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    const ctx = this.ctx;
    const time = elapsed / 1000;

    // Soft trailing fade instead of a hard clear, so ribbons leave
    // faint light trails as they move — reinforces the "aurora"
    // feel rather than a flat redraw each frame.
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(5, 5, 16, 0.32)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    if (elapsed < DRIFT_DURATION_MS + CONVERGE_DURATION_MS) {
      // ---- DRIFT + CONVERGE PHASES ----
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
        this.drawGlow(
          this.landX, this.landY,
          20 + glowT * 70,
          { r: 200, g: 220, b: 255 },
          glowT * 0.5
        );
      }

    } else if (elapsed < DRIFT_DURATION_MS + CONVERGE_DURATION_MS + FLASH_DURATION_MS) {
      // ---- FLASH / CONDENSATION PHASE ----
      if (!this.sparksSpawned) {
        this.spawnSparks();
        this.sparksSpawned = true;
      }

      const flashT =
        (elapsed - DRIFT_DURATION_MS - CONVERGE_DURATION_MS) / FLASH_DURATION_MS;

      const burstRadius = 30 + easeOutQuart(flashT) * 90;
      const burstAlpha = (1 - flashT) * 0.95;

      this.drawGlow(this.landX, this.landY, burstRadius, { r: 224, g: 236, b: 255 }, burstAlpha);
      this.drawGlow(this.landX, this.landY, burstRadius * 1.8, { r: 139, g: 160, b: 255 }, burstAlpha * 0.5);

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.update(dt);

        if (s.alpha <= 0) {
          this.sparks.splice(i, 1);
          continue;
        }

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
      // ---- DISSOLVE PHASE ----
      const dissolveT =
        (elapsed - DRIFT_DURATION_MS - CONVERGE_DURATION_MS - FLASH_DURATION_MS) /
        DISSOLVE_DURATION_MS;

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.update(dt);

        if (s.alpha <= 0) {
          this.sparks.splice(i, 1);
          continue;
        }

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
   PROGRESS BAR
========================================================= */

function easeProgress(t) {
  if (t < 0.85) {
    return (t / 0.85) * 92;
  }

  const tail = (t - 0.85) / 0.15;
  return 92 + tail * 8;
}

function runProgressBar() {
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / TOTAL_DURATION_MS, 1);

    const percent = Math.round(easeProgress(t));

    loadingBarFill.style.width = `${percent}%`;
    loadingPercent.textContent = `${percent}%`;

    if (t < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/* =========================================================
   PUBLIC INIT
========================================================= */

export function initLoadingScreen() {
  if (!loadingScreen || !loadingCanvas || !loadingLogo) return;

  const loader = new AuroraLoader(loadingCanvas, loadingLogo);

  loader.start();
  runProgressBar();

  setTimeout(() => {
    loadingScreen.classList.add("loading-done");
    loader.stop();
  }, DISMISS_AT_MS);
}
