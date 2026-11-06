/* =========================================================
   SHINIGAMI REALM — deliberately minimal.

   - playAwakening(onBlack, onReveal): ~2 seconds. The screen goes black,
     one crimson eye draws itself and opens, 死神 fades in under it, a single
     low heartbeat, then the new theme is revealed through an iris-open.
   - startRealm()/stopRealm(): while the mode is on, a soft red vignette and
     a handful of slow embers. Nothing else.
   - playFarewell(onBlack): a quiet fade out.

   animationManager.js owns the mode itself (body class, triggers); this file
   only owns what you see and hear, and removes all of it when the mode ends.
   prefers-reduced-motion skips the cinematic and the embers.
========================================================= */

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- the eye ---------- */

const EYE = `
  <svg class="sa-eye-svg" viewBox="0 0 400 200" aria-hidden="true">
    <defs>
      <clipPath id="saLid"><path d="M10 100 C 90 18, 310 18, 390 100 C 310 182, 90 182, 10 100 Z"/></clipPath>
      <radialGradient id="saIris" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ff3b2f"/><stop offset=".5" stop-color="#b80f18"/>
        <stop offset=".9" stop-color="#3d0309"/><stop offset="1" stop-color="#120001"/>
      </radialGradient>
    </defs>
    <g clip-path="url(#saLid)">
      <rect width="400" height="200" fill="#0b0304"/>
      <g transform="translate(200 100)">
        <circle r="64" fill="url(#saIris)"/>
        <ellipse class="sa-pupil" rx="9" ry="54" fill="#000"/>
        <circle cx="-22" cy="-24" r="6" fill="#fff" fill-opacity=".7"/>
      </g>
      <rect class="sa-lid sa-lid-t" y="0" width="400" height="100"/>
      <rect class="sa-lid sa-lid-b" y="100" width="400" height="100"/>
    </g>
    <path class="sa-eye-line" pathLength="1" d="M10 100 C 90 18, 310 18, 390 100 C 310 182, 90 182, 10 100 Z"/>
  </svg>`;

/* ---------- one soft heartbeat ---------- */

function playHeartbeat() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  const ac = new AC();
  ac.resume().catch(() => {});

  const at = ac.currentTime + 0.85;
  const out = ac.createGain();
  out.gain.value = 0.5;
  out.connect(ac.destination);

  // two quick low thumps — "lub-dub"
  [0, 0.26].forEach((offset, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    const t = at + offset;
    o.type = "sine";
    o.frequency.setValueAtTime(i ? 80 : 95, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(i ? 0.6 : 0.9, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.25);
  });

  setTimeout(() => ac.close().catch(() => {}), 2500);
}

/* ---------- awakening ---------- */

let cinematicOpen = false;

export function playAwakening(onBlack, onReveal) {
  if (cinematicOpen) return;

  if (reducedMotion()) {
    onBlack();
    onReveal();
    return;
  }

  cinematicOpen = true;

  const root = document.createElement("div");
  root.className = "sa";
  root.innerHTML = `
    <div class="sa-stage">
      <div class="sa-eye">${EYE}</div>
      <div class="sa-kanji" aria-hidden="true">死神</div>
    </div>`;
  document.body.appendChild(root);

  playHeartbeat();

  let done = false;
  const timers = [];

  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    root.classList.add("sa-gone");
    setTimeout(() => {
      root.remove();
      cinematicOpen = false;
    }, 400);
  };

  // theme swaps in while the screen is black; the embers only start at the reveal
  timers.push(setTimeout(onBlack, 320));
  timers.push(setTimeout(() => {
    root.classList.add("sa-reveal");
    onReveal();
  }, 1500));
  timers.push(setTimeout(finish, 2500));

  // tap to skip
  root.addEventListener("click", () => {
    if (!done) {
      if (!document.body.classList.contains("shinigami")) onBlack();
      if (!document.querySelector(".sr")) onReveal();
    }
    finish();
  });
}

export function playFarewell(onBlack) {
  if (reducedMotion()) {
    onBlack();
    return;
  }

  const root = document.createElement("div");
  root.className = "sa sa-farewell";
  document.body.appendChild(root);

  setTimeout(onBlack, 300);
  setTimeout(() => root.classList.add("sa-gone"), 450);
  setTimeout(() => root.remove(), 1000);
}

/* ---------- the realm: vignette + a few embers ---------- */

let realm = null;

export function startRealm() {
  if (realm) return;

  const wrap = document.createElement("div");
  wrap.className = "sr";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<div class="sr-vignette"></div><canvas class="sr-canvas"></canvas>`;
  document.body.prepend(wrap);
  requestAnimationFrame(() => wrap.classList.add("on"));

  if (reducedMotion()) {
    realm = { stop: () => wrap.remove() };
    return;
  }

  const canvas = wrap.querySelector(".sr-canvas");
  const g = canvas.getContext("2d");

  let w = 0;
  let h = 0;
  let embers = [];
  let raf = 0;
  let last = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const count = () => (w < 769 ? 8 : 16);

  const spawn = startAnywhere => {
    embers.push({
      x: Math.random() * w,
      y: startAnywhere ? Math.random() * h : h + 10,
      vx: (Math.random() - 0.5) * 10,
      vy: -(14 + Math.random() * 26),
      r: 0.8 + Math.random() * 1.6,
      phase: Math.random() * 6.28,
      life: 1,
      decay: 0.04 + Math.random() * 0.05
    });
  };
  for (let i = 0; i < count(); i++) spawn(true);

  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    g.clearRect(0, 0, w, h);
    embers = embers.filter(e => e.life > 0 && e.y > -10);

    for (const e of embers) {
      e.phase += dt * 1.6;
      e.x += (e.vx + Math.sin(e.phase) * 8) * dt;
      e.y += e.vy * dt;
      e.life -= e.decay * dt;

      const a = Math.max(0, e.life) * (0.5 + 0.5 * Math.sin(e.phase * 2.2));
      g.fillStyle = `rgba(255, 92, 60, ${a * 0.2})`;
      g.beginPath();
      g.arc(e.x, e.y, e.r * 3, 0, 6.2832);
      g.fill();
      g.fillStyle = `rgba(255, 140, 100, ${a})`;
      g.beginPath();
      g.arc(e.x, e.y, e.r, 0, 6.2832);
      g.fill();
    }

    if (embers.length < count() && Math.random() < 0.5) spawn(false);
  };

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);

  realm = {
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      wrap.classList.remove("on");
      setTimeout(() => wrap.remove(), 900);
    }
  };
}

export function stopRealm() {
  if (!realm) return;
  realm.stop();
  realm = null;
}
