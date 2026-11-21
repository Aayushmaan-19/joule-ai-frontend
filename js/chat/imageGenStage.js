/**
 * The "generating image" stage shown in a chat bubble while an image is made.
 *
 * What it shows: a live noise field that starts as huge coarse blocks and
 * keeps sharpening, the way a diffusion model resolves an image — painted
 * with the current theme's own colours — under orbiting sparks, a sweeping
 * scan line and a spinning light border. When the real image arrives it
 * blooms open from the centre with a flash ring and a burst of sparks.
 *
 * There is no real progress signal (the backend answers with one finished
 * image), so nothing here pretends to be a percentage: the phrases and the
 * sharpening are decoration, the elapsed-seconds counter is real.
 *
 * Markup, sizing and styling live in css/imagegen.css. The stage never ends
 * up in saved chat history: the caller swaps it for the normal image markup.
 */

const PHRASES = [
  "Mixing colors",
  "Finding the light",
  "Sketching shapes",
  "Adding detail",
  "Polishing pixels",
  "Almost there"
];

const PHRASE_MS = 2600;
const SLOW_HINT_AFTER_S = 25;
const FRAME_MS = 1000 / 30;
const SHARPEN_SECONDS = 10; // coarse -> fine; holds at the finest step after that
const FIELD_PX = 192; // canvas backing size
const REVEAL_MS = 1500; // how long the reveal plays before the caller swaps markup
const BURST_COUNT = 18;

// A 1024x1024 transparent image. It makes the <img> reserve exactly the space
// the finished image will take (same CSS, same breakpoints), so nothing
// jumps when the real picture replaces it.
const PLACEHOLDER_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'/>";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* =========================
   PALETTE
   Built from the active theme's tokens, so Light / Dark / Shinigami each
   get their own look without any per-theme code.
========================= */

function parseColor(value) {
  const probe = document.createElement("canvas").getContext("2d");
  probe.fillStyle = "#000";
  probe.fillStyle = value;
  const normalised = probe.fillStyle; // "#rrggbb" or "rgba(r, g, b, a)"

  if (normalised.startsWith("#")) {
    const n = parseInt(normalised.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  return normalised.match(/[\d.]+/g).slice(0, 3).map(Number);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function buildPalette() {
  const style = getComputedStyle(document.body);
  const accent = parseColor(style.getPropertyValue("--ac").trim() || "#f2b47e");
  const violet = parseColor(style.getPropertyValue("--vi").trim() || "#7c6bd0");

  // Dark -> mid -> accent -> highlight. The mid stop is darkened a little so
  // themes whose accent and violet are the same colour (Shinigami) keep depth.
  const stops = [
    mix(violet, [0, 0, 0], 0.74),
    mix(violet, [0, 0, 0], 0.2),
    accent,
    mix(accent, [255, 255, 255], 0.72)
  ];

  const lut = new Uint8ClampedArray(256 * 3);

  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const k = Math.min(Math.floor(t), stops.length - 2);
    const f = t - k;
    const smooth = f * f * (3 - 2 * f);
    const c = mix(stops[k], stops[k + 1], smooth);
    lut[i * 3] = c[0];
    lut[i * 3 + 1] = c[1];
    lut[i * 3 + 2] = c[2];
  }

  return lut;
}

/* =========================
   MARKUP
========================= */

const SPARK_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5c.7 5.6 3 8.6 9.5 10.5-6.5 1.9-8.8 4.9-9.5 10.5-.7-5.6-3-8.6-9.5-10.5C9 10.1 11.3 7.1 12 1.5z"/></svg>`;

function buildMarkup() {
  const outerDots = [0, 1, 2, 3, 4, 5].map(i => `<i style="--i:${i}"></i>`).join("");
  const innerDots = [0, 1, 2].map(i => `<i style="--i:${i}"></i>`).join("");

  return `
    <div class="igs-frame">
      <canvas class="igs-canvas" width="${FIELD_PX}" height="${FIELD_PX}"></canvas>
      <div class="igs-layer igs-glow"></div>
      <div class="igs-layer igs-scan"></div>
      <div class="igs-layer igs-orbit">${outerDots}</div>
      <div class="igs-layer igs-orbit igs-orbit-in">${innerDots}</div>
      <div class="igs-layer igs-core">${SPARK_SVG}</div>
      <img class="generated-image igs-img" src="${PLACEHOLDER_SRC}" alt="" />
      <div class="igs-flash"></div>
      <div class="igs-ring"></div>
      <div class="igs-burst"></div>
      <div class="igs-layer igs-border"></div>
    </div>
    <p class="igs-status">
      <span class="igs-phrase"></span><span class="igs-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
      <span class="igs-time"></span>
    </p>
    <p class="igs-prompt"></p>
  `;
}

/* =========================
   THE FIELD
   Layered sine waves, domain-warped so the colour flows instead of
   scrolling, drawn at a low resolution that keeps getting finer.
========================= */

function createField(canvas) {
  const ctx = canvas.getContext("2d");
  const small = document.createElement("canvas");
  const smallCtx = small.getContext("2d");
  const palette = buildPalette();

  let res = 0;
  let image = null;

  function setResolution(next) {
    if (next === res) return;
    res = next;
    small.width = small.height = res;
    image = smallCtx.createImageData(res, res);
  }

  function paint(seconds, resolution) {
    setResolution(resolution);

    const t = seconds * 0.55;
    const data = image.data;
    let p = 0;

    for (let j = 0; j < res; j++) {
      const y = (j + 0.5) / res;

      for (let i = 0; i < res; i++) {
        const x = (i + 0.5) / res;

        const u = x * 3 + Math.sin(y * 4 + t * 1.3) * 0.6;
        const v = y * 3 + Math.cos(x * 4 - t * 1.1) * 0.6;

        let n =
          Math.sin(u * 1.7 + t) +
          Math.sin(v * 1.9 - t * 0.8) +
          Math.sin((u + v) * 1.2 + t * 0.5) +
          Math.sin(Math.hypot(u - 1.5, v - 1.5) * 2.2 - t * 1.4);

        n = n / 8 + 0.5;
        n = n * 0.82 + (0.5 - Math.hypot(x - 0.5, y - 0.5)) * 0.4;

        const k = Math.max(0, Math.min(255, (n * 255) | 0)) * 3;
        data[p++] = palette[k];
        data[p++] = palette[k + 1];
        data[p++] = palette[k + 2];
        data[p++] = 255;
      }
    }

    smallCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = res > 40; // blocky while coarse, silky once fine
    ctx.drawImage(small, 0, 0, FIELD_PX, FIELD_PX);
  }

  return { paint };
}

/* =========================
   PUBLIC API
========================= */

/**
 * Replaces the contents of `bubble` with the stage and starts animating.
 * Returns { reveal(src), stop() }.
 */
export function mountImageStage(bubble, prompt) {
  const root = document.createElement("div");
  root.className = "generated-image-wrapper igs";
  root.setAttribute("role", "status");
  root.setAttribute("aria-label", "Generating your image");
  root.innerHTML = buildMarkup();
  root.querySelector(".igs-prompt").textContent = `“${prompt}”`;

  bubble.replaceChildren(root);

  const frame = root.querySelector(".igs-frame");
  const img = root.querySelector(".igs-img");
  const phraseEl = root.querySelector(".igs-phrase");
  const timeEl = root.querySelector(".igs-time");
  const burstEl = root.querySelector(".igs-burst");
  const field = createField(root.querySelector(".igs-canvas"));

  const startedAt = performance.now();
  let finishedAt = 0;
  let rafId = 0;
  let lastFrame = 0;
  let phraseIndex = 0;
  let stopped = false;
  let phraseTimer = 0;
  let clockTimer = 0;

  /* ---------- status text ---------- */

  function showPhrase(text) {
    phraseEl.textContent = text;
    phraseEl.classList.remove("in");
    void phraseEl.offsetWidth; // restart the fade-in
    phraseEl.classList.add("in");
  }

  function nextPhrase() {
    showPhrase(PHRASES[Math.min(phraseIndex, PHRASES.length - 1)]);
    phraseIndex++;
  }

  function tickClock() {
    const seconds = Math.floor((performance.now() - startedAt) / 1000);
    timeEl.textContent = seconds >= SLOW_HINT_AFTER_S
      ? `${seconds}s · busy right now, still working`
      : `${seconds}s`;
  }

  nextPhrase();
  tickClock();
  phraseTimer = setInterval(nextPhrase, PHRASE_MS);
  clockTimer = setInterval(tickClock, 1000);

  /* ---------- the field ---------- */

  // Seconds of "sharpening" so far. After the image arrives this races
  // ahead so the field snaps to its finest step while the reveal opens.
  function sharpenClock(now) {
    const elapsed = (now - startedAt) / 1000;
    if (!finishedAt) return elapsed;
    return elapsed + ((now - finishedAt) / 1000) * 30;
  }

  function resolutionFor(clock) {
    const p = Math.min(clock / SHARPEN_SECONDS, 1);
    return Math.round(5 * Math.pow(72 / 5, p));
  }

  function loop(now) {
    if (stopped) return;
    rafId = requestAnimationFrame(loop);

    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    field.paint((now - startedAt) / 1000, resolutionFor(sharpenClock(now)));
  }

  if (reducedMotion()) {
    field.paint(2, 48);
  } else {
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- finishing ---------- */

  function stop() {
    stopped = true;
    cancelAnimationFrame(rafId);
    clearInterval(phraseTimer);
    clearInterval(clockTimer);
  }

  function spawnBurst() {
    const size = frame.clientWidth || 300;
    const colours = ["var(--ac)", "var(--vi)", "#fff"];

    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.35;
      const distance = size * (0.34 + Math.random() * 0.2);
      const dot = document.createElement("b");

      dot.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      dot.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      dot.style.setProperty("--c", colours[i % colours.length]);
      dot.style.animationDelay = `${0.25 + Math.random() * 0.12}s`;
      burstEl.append(dot);
    }
  }

  /**
   * Plays the reveal for the finished image (a data URL or any loadable
   * src) and resolves once it has finished — the caller then swaps in the
   * normal, permanent markup.
   */
  async function reveal(src) {
    // The placeholder becomes the real image now, so it takes the true
    // aspect ratio and is decoded before it's shown.
    img.src = src;
    try {
      await img.decode();
    } catch {
      // Still shows fine once it loads; the reveal just can't pre-decode it.
    }

    finishedAt = performance.now();
    clearInterval(phraseTimer);
    showPhrase("Done");
    root.querySelector(".igs-dots").remove();
    root.classList.add("is-done");

    if (!reducedMotion()) spawnBurst();

    await sleep(reducedMotion() ? 350 : REVEAL_MS);
    stop();
  }

  return { reveal, stop };
}
