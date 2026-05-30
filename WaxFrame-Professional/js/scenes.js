// ============================================================
//  WaxFrame — scenes.js
//  Build: 20260529-024
//
//  Celebration scene orchestrators — three multi-step UI sequences
//  that combine DOM animation + timing + canvas rendering + audio
//  playback. Pulled out of app.js in v3.42.0 as part of the
//  cross-cutting cleanup pass.
//
//  Three scenes inside:
//    1. License Unlock Scene  — plays when a user enters a valid
//       license key. Bee fly-in + canvas fireworks + anvil drop +
//       metal clang. Synthesized via Web Audio API.
//    2. Hive Finish Animation — bee fly-in overlay when the
//       document is exported. Smoke puffs + count subline.
//    3. Unanimous Convergence Scene — 12-second sequence when all
//       AIs unanimously satisfy. Black backdrop → fog → image
//       reveal → fanfare → multicolor fireworks. Esc/click skip.
//
//  Plus three dev-test helpers used by the Dev Toolbar:
//    devTestUnanimous, devTestFlyInOnly, devTestMajorityConverge
//
//  Load order: AFTER audio.js (scenes call audio.js's play*
//  functions for the standard sound effects), BEFORE app.js
//  (app.js calls these from round-end paths, finish modal, and
//  license-verification flow). Scene functions auto-attach to
//  window via top-level `function` declarations.
//
//  Internal scene state (module-level vars):
//    hiveFinishTimer       — Hive Finish overlay auto-hide timer
//    _unanimousTimers      — array of timeout handles for the
//                            12-second Unanimous sequence; allows
//                            Esc/click to cancel all in flight
//    _unanimousKeyHandler  — keydown listener for Esc-to-skip
//
//  External dependencies (these live in app.js — scenes call them
//  at runtime, after both scripts have loaded):
//    toast()              — toast helper
//    isLicensed()         — license state check
//    getTrialRoundsUsed() — license helper
//    saveLicense()        — license persistence
//    submitLicenseKey()   — license submission flow
//    showLicenseManageModal() — manage modal opener
//    playFlyingCarSound() — audio.js helper (already extracted)
//    playRoundCompleteSound(), playSmokerSound() — audio.js
// ============================================================


/* =============================================================
   1. LICENSE UNLOCK SCENE  (was app.js lines 2275-2714)
   ============================================================= */
// ── LICENSE UNLOCK SCENE ──
function playUnlockScene() {
  const scene  = document.getElementById('unlockScene');
  const logo   = document.getElementById('unlockLogo');
  const canvas = document.getElementById('unlockCanvas');
  const bee    = document.getElementById('unlockBee');
  const title  = document.getElementById('unlockTitle');
  const sub    = document.getElementById('unlockSub');
  if (!scene || !canvas || !logo) return;

  // ── Shared AudioContext — created and resumed immediately while still in the user gesture stack.
  // Pre-fetching and decoding the MP3 now means the clang fires synchronously at T+1.6s
  // with no async fetch delay, which was causing the sound to misfire on first play.
  // (v3.21.25) Skip the entire audio prep when muted — playMetalClang() guards its own
  // playback path internally, but creating the AudioContext + fetching/decoding the MP3
  // is wasted work otherwise. Both args go through to playMetalClang as null; that
  // function returns at its own window._isMuted guard before touching either argument.
  let sharedAudioCtx = null;
  let clangBuffer    = null;
  if (!window._isMuted) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sharedAudioCtx.resume();
    fetch('sounds/232450__timbre__purely-synthesised-metal-clang-with-long-reverb.mp3')
      .then(r => r.arrayBuffer())
      .then(buf => sharedAudioCtx.decodeAudioData(buf))
      .then(decoded => { clangBuffer = decoded; })
      .catch(() => {});
  }

  // ── Reset — everything hidden, logo pre-scaled for stamp ──
  logo.src = 'images/Waxframe_logo_v19.png';
  logo.style.transition = 'none';
  logo.style.opacity = '0';
  logo.style.transform = 'scale(1.15)';
  [title, sub].forEach(el => { if (el) { el.style.opacity = '0'; el.style.transform = 'translateY(12px)'; } });
  if (bee) { bee.style.opacity = '0'; bee.style.right = '-400px'; bee.style.animation = ''; }

  // Canvas — full screen fixed overlay for drips and smoke
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  canvas.width  = sw;
  canvas.height = sh;
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width  = sw + 'px';
  canvas.style.height = sh + 'px';
  canvas.style.zIndex = '999999';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, sw, sh);

  // ── Particle state ──
  const drips    = [];
  const splats   = [];
  const smokes   = [];
  const bigPuffs = [];  // large smoker puffs that fill the screen
  let dripping   = false;
  let smokeMode  = 'off';
  let whiteFill  = 0;   // 0–1, drives the white flash overlay
  let rafId      = null;

  // Nozzle — calculated from bee's actual screen position when dripping starts
  let nozzleX = sw * 0.6;
  let nozzleY = sh * 0.35;

  // ── T+0 — scene visible but transparent, fade to black over 1.5s ──
  scene.style.transition = 'none';
  scene.style.opacity = '0';
  scene.classList.add('active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scene.style.transition = 'opacity 1.5s ease-in';
      scene.style.opacity = '1';
    });
  });

  // ── T+1.6s — metal clang, logo stamps in ──
  setTimeout(() => {
    scene.style.transition = 'none'; // lock in black before stamp
    playMetalClang(sharedAudioCtx, clangBuffer);
  }, 1600);

  // ── T+1.65s — logo stamps in + recoil + sparks ──
  setTimeout(() => {
    logo.style.transition = 'opacity 0.18s ease-out, transform 0.18s cubic-bezier(0.2,0.8,0.3,1.2)';
    logo.style.opacity = '1';
    logo.style.transform = 'scale(1.0)';
    // Recoil — nudge up 10px then settle back
    setTimeout(() => {
      logo.style.transition = 'transform 0.08s ease-out';
      logo.style.transform = 'scale(1.0) translateY(-10px)';
      setTimeout(() => {
        logo.style.transition = 'transform 0.25s cubic-bezier(0.3,1.4,0.5,1)';
        logo.style.transform = 'scale(1.0) translateY(0px)';
      }, 80);
    }, 160);
    // Spark burst
    spawnSparks(scene);
  }, 1650);

  // ── T+5.05s — bee flies in ──
  setTimeout(() => {
    if (!bee) return;
    bee.style.transition = 'right 0.7s cubic-bezier(0.2,0.8,0.4,1), opacity 0.3s ease';
    bee.style.opacity = '1';
    bee.style.right = 'calc(50% - 485px)';
  }, 5050);

  // ── T+5.75s — start dripping ──
  setTimeout(() => {
    // Calculate nozzle from bee's actual screen position (gun tip is ~30% from left, 55% from top of bee image)
    if (bee) {
      const beeRect = bee.getBoundingClientRect();
      nozzleX = beeRect.left + beeRect.width * 0.3 - 100;
      nozzleY = beeRect.top  + beeRect.height * 0.55 + 80;
    }
    dripping = true;
    startCanvas();
  }, 5750);

  // ── T+7.75s — smoker puffs begin blowing across screen ──
  setTimeout(() => { smokeMode = 'puff'; }, 7750);

  // ── T+9.4s — white flash whiteout (puffs fill enough, now go fully white) ──
  setTimeout(() => {
    smokeMode = 'white';
  }, 9400);

  // ── T+9.8s — swap logo + anvil clang at peak white ──
  setTimeout(() => {
    dripping  = false;
    logo.src  = 'images/Waxframe_Logo_Licensed_v1.png';
    playAnvilSound(sharedAudioCtx);
  }, 9800);

  // ── T+10.1s — bee exits during white ──
  setTimeout(() => {
    if (!bee) return;
    bee.style.transition = 'right 0.5s cubic-bezier(0.6,0,0.8,0.4), opacity 0.35s ease';
    bee.style.right = '-400px';
    bee.style.opacity = '0';
  }, 10100);

  // ── T+10.6s — white clears, smoke puffs fade out ──
  setTimeout(() => { smokeMode = 'clear'; }, 10600);

  // ── T+12.2s — text fades in ──
  setTimeout(() => {
    if (title) { title.style.transition = 'opacity 0.5s ease, transform 0.5s ease'; title.style.opacity = '1'; title.style.transform = 'translateY(0)'; }
    if (sub)   { sub.style.transition   = 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s'; sub.style.opacity = '1'; sub.style.transform = 'translateY(0)'; }
  }, 12200);

  // ── T+16.05s — fade out scene ──
  setTimeout(() => {
    scene.style.transition = 'opacity 0.6s ease';
    scene.style.opacity = '0';
    if (rafId) cancelAnimationFrame(rafId);
    setTimeout(() => {
      scene.classList.remove('active');
      scene.style.opacity = '';
      scene.style.transition = '';
      logo.style.opacity = '';
      logo.style.transform = '';
      logo.style.transition = '';
      ctx.clearRect(0, 0, sw, sh);
    }, 650);
  }, 16050);

  // ── Canvas animation loop ──
  function startCanvas() {
    let lastDrip = 0;
    function loop(ts) {
      ctx.clearRect(0, 0, sw, sh);

      // Spawn new drip
      if (dripping && ts - lastDrip > 120) {
        lastDrip = ts;
        drips.push({
          x: nozzleX + (Math.random() - 0.5) * 8,
          y: nozzleY,
          vy: 1.5 + Math.random() * 2,
          r: 4 + Math.random() * 3,
          alpha: 1
        });
      }

      // Update + draw drips
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        d.y += d.vy;
        d.vy += 0.18; // gravity
        // Stretch into teardrop
        ctx.save();
        ctx.globalAlpha = d.alpha;
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 1.5);
        grad.addColorStop(0, '#ffcc44');
        grad.addColorStop(0.6, '#c87000');
        grad.addColorStop(1, 'rgba(180,80,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r * 0.7, d.r * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Splat on logo surface
        if (d.y > nozzleY + 80) {
          splats.push({ x: d.x + (Math.random()-0.5)*10, y: d.y, r: d.r * 1.6 + Math.random()*4, alpha: 0.9 });
          // Spawn smoke puff at splat
          for (let s = 0; s < 3; s++) {
            smokes.push({
              x: d.x + (Math.random()-0.5)*16,
              y: d.y,
              vx: (Math.random()-0.5)*0.6,
              vy: -(0.4 + Math.random()*0.8),
              r: 8 + Math.random()*12,
              alpha: 0.5 + Math.random()*0.3,
              life: 1
            });
          }
          drips.splice(i, 1);
        }
      }

      // Draw splats
      splats.forEach(s => {
        ctx.save();
        ctx.globalAlpha = s.alpha * 0.85;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, '#ffaa00');
        g.addColorStop(0.5, '#c06000');
        g.addColorStop(1, 'rgba(120,40,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Update + draw smoke puffs
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.x  += s.vx;
        s.y  += s.vy;
        s.r  += 0.4;
        s.life -= 0.008;
        s.alpha = s.life * 0.55;
        if (s.life <= 0) { smokes.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = s.alpha;
        const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        sg.addColorStop(0, 'rgba(160,140,120,0.9)');
        sg.addColorStop(1, 'rgba(80,70,60,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Smoker puff system ──
      // In 'puff' mode: spawn large slow-drifting puffs from nozzle origin that billow
      // across the screen like a real smoker gun being swept side to side.
      if (smokeMode === 'puff') {
        // Spawn a fresh puff every ~3 frames — fast enough to build a thick cloud
        if (Math.random() < 0.35) {
          const side = Math.random() < 0.5 ? -1 : 1;
          // Puffs bloom from logo center — looks like the logo itself is smoldering
          const angle = Math.random() * Math.PI * 2;
          const burst = Math.random() * 60;
          bigPuffs.push({
            x:     sw * 0.5 + Math.cos(angle) * burst,
            y:     sh * 0.5 + Math.sin(angle) * burst,
            vx:    Math.cos(angle) * (0.4 + Math.random() * 0.8),
            vy:    Math.sin(angle) * (0.4 + Math.random() * 0.8) - 0.5,
            r:     25 + Math.random() * 55,
            alpha: 0.55 + Math.random() * 0.3,
            life:  1,
            decay: 0.003 + Math.random() * 0.003
          });
        }
      }

      // Draw and age big puffs — present in puff AND clear modes
      for (let i = bigPuffs.length - 1; i >= 0; i--) {
        const p = bigPuffs[i];
        p.x    += p.vx;
        p.y    += p.vy;
        p.r    += 1.8;           // expand as they rise
        p.life -= (smokeMode === 'clear') ? p.decay * 4 : p.decay;
        p.alpha = p.life * 0.65;
        if (p.life <= 0) { bigPuffs.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        pg.addColorStop(0,   'rgba(210,205,195,0.95)');
        pg.addColorStop(0.4, 'rgba(170,160,145,0.8)');
        pg.addColorStop(1,   'rgba(90,85,75,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // White flash overlay — fades in during 'white', fades out during 'clear'
      if (smokeMode === 'white') {
        whiteFill = Math.min(1, whiteFill + 0.045);
        ctx.save();
        ctx.globalAlpha = whiteFill;
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.fillRect(0, 0, sw, sh);
        ctx.restore();
      } else if (smokeMode === 'clear') {
        whiteFill = Math.max(0, whiteFill - 0.025);
        if (whiteFill > 0) {
          ctx.save();
          ctx.globalAlpha = whiteFill;
          ctx.fillStyle = 'rgb(255,255,255)';
          ctx.fillRect(0, 0, sw, sh);
          ctx.restore();
        }
        if (whiteFill <= 0 && bigPuffs.length === 0) smokeMode = 'off';
      }

      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }
}

function spawnSparks(container) {
  const count = 40;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 400;
    const size  = 2 + Math.random() * 4;
    const dur   = 400 + Math.random() * 600;
    const dx    = Math.cos(angle) * speed;
    const dy    = Math.sin(angle) * speed;
    const hue   = 30 + Math.random() * 30; // gold to orange
    spark.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: hsl(${hue}, 100%, 65%);
      pointer-events: none;
      z-index: 999999;
      transform: translate(-50%, -50%);
      transition: left ${dur}ms cubic-bezier(0.2,1,0.4,1),
                  top ${dur}ms cubic-bezier(0.2,1,0.4,1),
                  opacity ${dur}ms ease-in;
    `;
    container.appendChild(spark);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        spark.style.left = (cx + dx) + 'px';
        spark.style.top  = (cy + dy + (Math.random() * 100)) + 'px';
        spark.style.opacity = '0';
      });
    });
    setTimeout(() => spark.remove(), dur + 50);
  }
}

function playMetalClang(audioCtx, clangBuffer) {
  if (window._isMuted) return;
  try {
    if (clangBuffer && audioCtx) {
      // Buffer already decoded — plays with zero async delay
      const src  = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      src.buffer = clangBuffer;
      gain.gain.setValueAtTime(0.85, audioCtx.currentTime);
      src.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(audioCtx.currentTime);
    } else {
      // Fallback: buffer not ready yet (e.g. very fast click), use Audio()
      if (window._isMuted) return;
      const audio = new Audio('sounds/232450__timbre__purely-synthesised-metal-clang-with-long-reverb.mp3');
      audio.volume = 0.85;
      audio.play().catch(() => {});
    }
  } catch(e) {}
}

function playAnvilSound(audioCtx) {
  if (window._isMuted) return;
  try {
    const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

    // Deep anvil thud — low sine boom
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.connect(boomGain); boomGain.connect(ctx.destination);
    boom.type = 'sine';
    boom.frequency.setValueAtTime(55, ctx.currentTime);
    boom.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.6);
    boomGain.gain.setValueAtTime(0.7, ctx.currentTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    boom.start(ctx.currentTime); boom.stop(ctx.currentTime + 0.85);

    // Impact transient — short noise burst
    const bufSize = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const bd  = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) bd[i] = (Math.random()*2-1) * (1 - i/bufSize);
    const crack = ctx.createBufferSource();
    const crackGain = ctx.createGain();
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass'; crackFilter.frequency.value = 800; crackFilter.Q.value = 0.8;
    crack.buffer = buf;
    crack.connect(crackFilter); crackFilter.connect(crackGain); crackGain.connect(ctx.destination);
    crackGain.gain.setValueAtTime(0.5, ctx.currentTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    crack.start(ctx.currentTime); crack.stop(ctx.currentTime + 0.15);

    // Reverb tail — filtered noise decay
    const revSize = Math.floor(ctx.sampleRate * 1.2);
    const revBuf  = ctx.createBuffer(1, revSize, ctx.sampleRate);
    const rd      = revBuf.getChannelData(0);
    for (let i = 0; i < revSize; i++) rd[i] = (Math.random()*2-1) * Math.pow(1 - i/revSize, 2);
    const rev = ctx.createBufferSource();
    const revGain   = ctx.createGain();
    const revFilter = ctx.createBiquadFilter();
    revFilter.type = 'lowpass'; revFilter.frequency.value = 600;
    rev.buffer = revBuf;
    rev.connect(revFilter); revFilter.connect(revGain); revGain.connect(ctx.destination);
    revGain.gain.setValueAtTime(0.18, ctx.currentTime + 0.05);
    revGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    rev.start(ctx.currentTime + 0.05); rev.stop(ctx.currentTime + 1.5);

  } catch(e) {}
}


/* =============================================================
   2. HIVE FINISH ANIMATION  (was app.js lines 10391-10448)
   ============================================================= */

/* =========================================
   WAXFRAME FINISH ANIMATION — Bee Fly-In
   ========================================= */

let hiveFinishTimer = null;

function showHiveFinish(options = {}) {
  const { duration = 4000, smokeBursts = 10, satisfied = null, total = null } = options;
  const overlay = document.getElementById('hiveFinishOverlay');
  const smokeWrap = document.getElementById('hiveFinishSmoke');
  const subEl = document.getElementById('hiveFinishCount');
  if (!overlay) return;
  clearTimeout(hiveFinishTimer);

  // Set the count subline — "4 of 6 AIs agree" for majority, "Unanimous · 6 of 6" for full
  if (subEl) {
    if (satisfied !== null && total !== null) {
      subEl.textContent = (satisfied === total)
        ? `Unanimous · ${satisfied} of ${total}`
        : `${satisfied} of ${total} AIs agree`;
      subEl.style.display = 'block';
    } else {
      subEl.textContent = '';
      subEl.style.display = 'none';
    }
  }

  if (smokeWrap) {
    smokeWrap.innerHTML = '';
    for (let i = 0; i < smokeBursts; i++) {
      const puff = document.createElement('span');
      puff.className = 'hive-smoke-particle';
      puff.style.setProperty('--size', `${hiveRand(30, 80)}px`);
      puff.style.setProperty('--x', `${hiveRand(-150, 150)}px`);
      puff.style.setProperty('--y', `${hiveRand(-150, -300)}px`);
      puff.style.setProperty('--dur', `${hiveRand(1500, 2800)}ms`);
      puff.style.setProperty('--opacity', (Math.random() * 0.3 + 0.15).toFixed(2));
      puff.style.left = `calc(50% - 100px + ${hiveRand(-8, 8)}%)`;
      puff.style.animationDelay = `${hiveRand(0, 600)}ms`;
      smokeWrap.appendChild(puff);
    }
  }
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('is-active');
  hiveFinishTimer = setTimeout(() => hideHiveFinish(), duration);
}

function hideHiveFinish() {
  const overlay = document.getElementById('hiveFinishOverlay');
  if (!overlay) return;
  overlay.classList.remove('is-active');
  overlay.setAttribute('aria-hidden', 'true');
}

function hiveRand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* =============================================================
   3. UNANIMOUS CONVERGENCE SCENE  (was app.js lines 10449-10753)
   ============================================================= */

/* =========================================
   UNANIMOUS CONVERGENCE SCENE
   Timeline:
     T+0.0s   scene shown, black backdrop starts fading in (800ms)
     T+0.8s   worker bee flies left → right across screen (2500ms, linear)
              + Kai's whirr plays in sync with the flight
     T+1.05s  fog puffs spawn progressively left → right over 2500ms
              (bee's jet-exhaust wake — starts early so fog is built up
              around the bee as it passes)
     T+3.55s  full fog density reached
     T+6.0s   fog clears (500ms)
     T+6.5s   image reveals (900ms zoom) — silent, let the user see it
     T+6.8s   right after image drops: anvil drop (mortar-launch thump)
     T+7.8s   1s after anvil: fireworks — 3 multicolor bursts (center → left → right at 0/700/1400ms)
     T+8.5s   crackle sound matched to burst 2
     T+9.2s   crackle sound matched to burst 3
     T+9.2s → T+12s   ~1s of clean image hold (sparks fade through)
     T+12s    scene fades out (900ms)
     T+12.9s  scene fully closed
   Escape or click dismisses early via closeUnanimousScene().
   ========================================= */

let _unanimousTimers = [];
let _unanimousKeyHandler = null;

function playUnanimousScene() {
  const scene     = document.getElementById('unanimousScene');
  const bee       = document.getElementById('unanimousBee');
  const fog       = document.getElementById('unanimousFog');
  const image     = document.getElementById('unanimousImage');
  const canvas    = document.getElementById('unanimousSparksCanvas');
  if (!scene || !fog || !image || !canvas || !bee) return;

  // Cancel any previous run
  closeUnanimousScene(true);

  // Reset state
  fog.innerHTML = '';
  fog.classList.remove('is-rising', 'is-clearing');
  image.classList.remove('is-revealed');
  image.style.opacity = '0';
  bee.classList.remove('is-flying');
  bee.style.opacity = '0';
  // Force reflow so re-adding is-flying restarts the animation on subsequent plays
  void bee.offsetWidth;
  scene.classList.remove('is-closing');
  scene.setAttribute('aria-hidden', 'false');
  scene.classList.add('is-active');

  // Size canvas — DPR-aware so sparks render crisply on Retina / high-DPI screens.
  // We size the backing bitmap at sw*dpr x sh*dpr and the CSS box at sw x sh,
  // then scale the context so drawing calls still use CSS pixels.
  const sw = window.innerWidth, sh = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.floor(sw * dpr);
  canvas.height = Math.floor(sh * dpr);
  canvas.style.width  = sw + 'px';
  canvas.style.height = sh + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, sw, sh);

  // Escape/click to skip
  _unanimousKeyHandler = (e) => { if (e.key === 'Escape') closeUnanimousScene(); };
  document.addEventListener('keydown', _unanimousKeyHandler);
  scene.addEventListener('click', () => closeUnanimousScene(), { once: true });

  // T+0.8s — worker bee flies left → right + Kai's whirr
  _unanimousTimers.push(setTimeout(() => {
    bee.classList.add('is-flying');
    playFlyingCarSound(); // Kai's whirr
  }, 800));

  // T+2.05s — bee is halfway; begin progressive left→right fog sweep.
  // Each puff spawns at a position progressing 0%→100% across the screen
  // over the next 2500ms, simulating a jet-exhaust wake.
  const totalPuffs = 28;
  const sweepStart = 1050;
  const sweepDuration = 2500;
  fog.classList.add('is-rising'); // opacity container transitions to full
  for (let i = 0; i < totalPuffs; i++) {
    const t = i / (totalPuffs - 1);            // 0..1
    const spawnDelay = sweepStart + t * sweepDuration;
    const xPercent = t * 100;                  // left → right
    _unanimousTimers.push(setTimeout(() => {
      const puff = document.createElement('span');
      puff.className = 'unanimous-fog-puff';
      const size = hiveRand(240, 480);
      puff.style.setProperty('--size', `${size}px`);
      puff.style.setProperty('--dx',   `${hiveRand(-140, 140)}px`);
      puff.style.setProperty('--dy',   `${hiveRand(-220, -60)}px`);
      puff.style.setProperty('--dur',  `${hiveRand(3200, 4600)}ms`);
      puff.style.setProperty('--delay', `0ms`);
      puff.style.setProperty('--opacity', (0.6 + Math.random() * 0.3).toFixed(2));
      // x tracks the sweep; slight jitter so puffs aren't on a perfect line.
      // y covers mid-to-lower screen so fog rises through the viewport.
      puff.style.left = `${xPercent + hiveRand(-4, 4)}%`;
      puff.style.top  = `${45 + Math.random() * 60}%`;
      puff.style.marginLeft = `${-size / 2}px`;
      puff.style.marginTop  = `${-size / 2}px`;
      fog.appendChild(puff);
    }, spawnDelay));
  }

  // T+6.0s — clear fog
  _unanimousTimers.push(setTimeout(() => {
    fog.classList.remove('is-rising');
    fog.classList.add('is-clearing');
  }, 6000));

  // T+6.5s — image reveals (900ms zoom). No sound yet — let the user see it.
  _unanimousTimers.push(setTimeout(() => {
    image.style.opacity = '';
    image.classList.add('is-revealed');
  }, 6500));

  // T+6.8s — right after image drops: anvil (mortar-launch thump).
  _unanimousTimers.push(setTimeout(() => {
    if (typeof playAnvilSound === 'function') playAnvilSound();
  }, 6800));

  // T+7.8s — 1 second after anvil: fireworks fire. spawnUnanimousFireworks runs
  // its default 3-burst multicolor schedule (center → left → right at 0/700/1400ms).
  _unanimousTimers.push(setTimeout(() => {
    spawnUnanimousFireworks(canvas);
  }, 7800));

  // Crackle sounds matched to the second and third bursts (the first burst
  // is sonically covered by the anvil bang that preceded it).
  _unanimousTimers.push(setTimeout(() => playCrackleSound(), 8500));  // burst 2 (7800 + 700)
  _unanimousTimers.push(setTimeout(() => playCrackleSound(), 9200));  // burst 3 (7800 + 1400)

  // T+12s — ~1s of clean image hold after last burst's sparks fade, then close.
  _unanimousTimers.push(setTimeout(() => closeUnanimousScene(), 12000));
}

function closeUnanimousScene(silent = false) {
  const scene = document.getElementById('unanimousScene');
  _unanimousTimers.forEach(t => clearTimeout(t));
  _unanimousTimers = [];
  if (_unanimousKeyHandler) {
    document.removeEventListener('keydown', _unanimousKeyHandler);
    _unanimousKeyHandler = null;
  }
  if (!scene) return;
  if (silent) {
    scene.classList.remove('is-active', 'is-closing');
    scene.setAttribute('aria-hidden', 'true');
    return;
  }
  scene.classList.add('is-closing');
  setTimeout(() => {
    scene.classList.remove('is-active', 'is-closing');
    scene.setAttribute('aria-hidden', 'true');
    const fog = document.getElementById('unanimousFog');
    if (fog) { fog.innerHTML = ''; fog.classList.remove('is-rising', 'is-clearing'); }
    const image = document.getElementById('unanimousImage');
    if (image) { image.classList.remove('is-revealed'); image.style.opacity = '0'; }
    const bee = document.getElementById('unanimousBee');
    if (bee) { bee.classList.remove('is-flying'); bee.style.opacity = '0'; }
  }, 900);
}

// ── CRACKLE — short burst of high-pitched filtered noise pops ──
// Simulates the sparkler-star crackle that follows a firework's main burst.
// Each call produces ~10 rapid pops over ~300ms, bandpass-filtered so they
// read as the bright snappy crackle of burning sparkle stars rather than thunder.
function playCrackleSound() {
  if (window._isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const popCount = 10;
    for (let i = 0; i < popCount; i++) {
      const t = now + (i * 0.025) + (Math.random() * 0.02);
      const popDur = 0.04 + Math.random() * 0.05;

      // Short decaying noise burst
      const bufSize = Math.floor(ctx.sampleRate * popDur);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const bd = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) bd[j] = (Math.random() * 2 - 1) * (1 - j / bufSize);

      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3200 + Math.random() * 3800; // high-pitched snap
      filter.Q.value = 2.5;

      src.buffer = buf;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);

      const peak = 0.10 + Math.random() * 0.08;
      gain.gain.setValueAtTime(peak, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + popDur);

      src.start(t); src.stop(t + popDur);
    }
    setTimeout(() => ctx.close(), 800);
  } catch(e) { /* audio not supported — fail silently */ }
}

// ── MULTICOLOR FIREWORKS — three multicolored bursts, canvas-rendered for performance ──
// Canvas is already sized and DPR-scaled by playUnanimousScene(). All coords
// here are CSS pixels; the transform applied to the context handles the DPR
// multiply automatically. Runs three sequential bursts (center → left → right)
// over 1.4s, all with the full rainbow palette at full size — visual variety
// without fading the individual bursts into invisible gold sparkles.
function spawnUnanimousFireworks(canvas) {
  const ctx  = canvas.getContext('2d');
  const cssW = parseFloat(canvas.style.width)  || canvas.width;
  const cssH = parseFloat(canvas.style.height) || canvas.height;
  const hues = [40, 20, 350, 320, 280, 220, 190, 140]; // gold, orange, red, magenta, purple, blue, cyan, green

  const schedule = [
    { at: 0,    x: cssW * 0.50, y: cssH * 0.50, count: 60 },  // center: main burst
    { at: 700,  x: cssW * 0.32, y: cssH * 0.44, count: 40 },  // upper-left
    { at: 1400, x: cssW * 0.68, y: cssH * 0.56, count: 40 },  // lower-right
  ];

  const particles = [];
  const startTime = performance.now();
  const lastBurstAt = schedule.reduce((m, b) => Math.max(m, b.at), 0);

  schedule.forEach(burst => {
    setTimeout(() => {
      for (let i = 0; i < burst.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 180 + Math.random() * 520;
        particles.push({
          x: burst.x, y: burst.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 900 + Math.random() * 900,
          size: 2 + Math.random() * 3.5,
          hue: hues[Math.floor(Math.random() * hues.length)],
        });
      }
    }, burst.at);
  });

  let last = performance.now();
  let rafId = null;
  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.globalCompositeOperation = 'lighter';
    let alive = 0;
    particles.forEach(p => {
      p.life += dt * 1000;
      if (p.life >= p.maxLife) return;
      alive++;
      p.vy += 380 * dt;   // gravity
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - lifeRatio);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - lifeRatio * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 65%, ${alpha * 0.9})`;
      ctx.shadowBlur  = 12;
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    const elapsed = now - startTime;
    const hasPendingBursts = elapsed < lastBurstAt + 50;
    if (alive > 0 || hasPendingBursts) {
      rafId = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, cssW, cssH);
    }
  }
  rafId = requestAnimationFrame(loop);
}

// ── DEV TOOLBAR — convergence sequence test helpers ──
// Mirror the exact parameters used in production so the dev buttons are
// a faithful preview. Used from the Dev Toolbar only; not wired into any
// user-facing flow.
function devTestFlyInOnly() {
  // Bee fly-in overlay with no audio — for previewing the animation in silence.
  toast('🐝 Dev: fly-in only (no sound)');
  showHiveFinish({ duration: 3000, smokeBursts: 10, satisfied: 4, total: 6 });
}

function devTestMajorityConverge() {
  // Majority convergence: 4 of 6 agree, 2 still have suggestions.
  toast('🏁 Dev: majority convergence (4 of 6)');
  playFlyingCarSound();
  showHiveFinish({ duration: 3000, smokeBursts: 10, satisfied: 4, total: 6 });
}

function devTestUnanimous() {
  // Unanimous: full scene — black → fog → image + fanfare + multicolor fireworks.
  toast('🏁 Dev: unanimous scene (Esc or click to skip)');
  playUnanimousScene();
}
