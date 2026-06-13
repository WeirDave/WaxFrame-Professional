// ============================================================
//  WaxFrame — audio.js
// Build: 20260612-013
//  All audio play* functions for the main app. Pulled out of app.js
//  in v3.41.0 as part of the cross-cutting cleanup pass — these
//  functions form a cohesive subsystem (audio synthesis via Web Audio
//  API + one .wav playback for the WaxFrame fly-in scene) with no
//  external dependencies beyond window._isMuted from theme.js and
//  standard browser audio APIs.
//
//  Load order: AFTER theme.js (depends on window._isMuted), BEFORE
//  app.js (app.js calls these via round-end paths and scene
//  orchestrators).
//
//  All functions auto-attach to window via top-level `function`
//  declarations so HTML onclick handlers and other scripts can call
//  them as global identifiers.
//
//  Every direct-audio function MUST start with the mute guard:
//    if (window._isMuted) return;
//  Scene orchestrators (playUnlockScene, playUnanimousScene in
//  app.js) don't need this guard at the top — they delegate to the
//  gated per-effect helpers here.
// ============================================================

// ── ROUND COMPLETE SOUND ──
function playRoundCompleteSound() {
  if (window._isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Trill: square wave with LFO wobble like a hovering bee
    const trill = ctx.createOscillator();
    const tg    = ctx.createGain();
    trill.connect(tg);
    tg.connect(ctx.destination);
    trill.type = 'square';
    trill.frequency.setValueAtTime(200, now);
    const lfo = ctx.createOscillator();
    const lg  = ctx.createGain();
    lfo.frequency.value = 28;
    lg.gain.value = 40;
    lfo.connect(lg);
    lg.connect(trill.frequency);
    tg.gain.setValueAtTime(0, now);
    tg.gain.linearRampToValueAtTime(0.07, now + 0.04);
    tg.gain.setValueAtTime(0.07, now + 0.22);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    lfo.start(now);   lfo.stop(now + 0.35);
    trill.start(now); trill.stop(now + 0.35);

    // Ping: one crisp high sine at the end
    const ping = ctx.createOscillator();
    const pg   = ctx.createGain();
    ping.connect(pg);
    pg.connect(ctx.destination);
    ping.type = 'sine';
    ping.frequency.value = 1046;
    pg.gain.setValueAtTime(0, now + 0.30);
    pg.gain.linearRampToValueAtTime(0.15, now + 0.32);
    pg.gain.exponentialRampToValueAtTime(0.001, now + 0.80);
    ping.start(now + 0.30);
    ping.stop(now + 0.85);

    setTimeout(() => ctx.close(), 1200);
  } catch(e) { /* audio not supported — fail silently */ }
}

// ── SMOKER START SOUND — soft breath of smoke ──
// ── ALERT / WARNING SOUND — short two-chirp attention tone ──
// Used when a destructive-action confirmation modal opens (e.g. discard
// document confirmation in the Finish modal, v3.21.17). Two ascending sine
// chirps ~80ms each with a 30ms gap between — short enough not to be
// annoying, distinct enough to make the user actually look at the screen.
function playAlertSound() {
  if (window._isMuted) return;
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const now  = ctx.currentTime;
    const chirp = (startAt, freq) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type  = 'sine';
      o.frequency.setValueAtTime(freq, startAt);
      g.gain.setValueAtTime(0, startAt);
      g.gain.linearRampToValueAtTime(0.18, startAt + 0.012);
      g.gain.setValueAtTime(0.18, startAt + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + 0.085);
      o.connect(g); g.connect(ctx.destination);
      o.start(startAt); o.stop(startAt + 0.09);
    };
    chirp(now,         880);
    chirp(now + 0.11, 1320);
    setTimeout(() => ctx.close(), 400);
  } catch(e) { /* audio not supported — fail silently */ }
}

// v3.36.33 — Plays the existing two-chirp alert (playAlertSound) ONLY
// when the most-recent round produced one or more USER DECISIONs. Called
// from each round-end path right after renderConflicts() so the audible
// cue lines up with the visual surfacing of the decision cards. Mute is
// respected via playAlertSound itself. Uses the same sound as the
// "discard unexported project" confirm alert — no new audio assets
// needed; pattern reused across the app for "user action required" cues.
function playAlertIfUserDecisions() {
  const last = history.length ? history[history.length - 1] : null;
  if (last?.conflicts?.userDecisions?.length > 0) playAlertSound();
}

// v3.37.2 — Closes out P1.6 (auto-halted sound). Fires from _autoHalt()
// for every halt reason EXCEPT convergence — ascending major-triad
// arpeggio (C5 → E5 → G5), an "upper" cadence that reads as
// "your turn, look at the modal" rather than "you failed." Distinct
// from playAlertSound (ascending two-chirp 880→1320Hz = USER DECISION
// needs attention) — both ascend, but the alert sound is two fast
// chirps in the 880Hz+ range; halt sound is three slower tones starting
// at C5 (523Hz) and topping out at G5 (784Hz). Distinct from
// playRoundCompleteSound (bee trill + ping = round done, positive).
// No new .wav asset — pure Web Audio synthesis, same approach as the
// rest of the audio system. Respects mute per the standard audio rule.
function playAutoHaltSound() {
  if (window._isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    // Each tone: 120ms sustain, 15ms attack ramp, 25ms exp release.
    // Three sine tones climbing C5 → E5 → G5 — a major-triad arpeggio,
    // unambiguously upward and positive.
    const tone = (startAt, freq) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type  = 'sine';
      o.frequency.setValueAtTime(freq, startAt);
      g.gain.setValueAtTime(0, startAt);
      g.gain.linearRampToValueAtTime(0.16, startAt + 0.015);
      g.gain.setValueAtTime(0.16, startAt + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + 0.145);
      o.connect(g); g.connect(ctx.destination);
      o.start(startAt); o.stop(startAt + 0.15);
    };
    tone(now,         523);   // C5
    tone(now + 0.14,  659);   // E5
    tone(now + 0.28,  784);   // G5
    setTimeout(() => ctx.close(), 600);
  } catch (e) { /* audio not supported — fail silently */ }
}

function playSmokerSound() {
  if (window._isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime, dur = 1.6;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const n = ctx.createBufferSource(); n.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(400, now);
    f.frequency.exponentialRampToValueAtTime(200, now + dur);
    f.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.10, now + 0.2);
    g.gain.setValueAtTime(0.10, now + 1.0);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(now); n.stop(now + dur);
    setTimeout(() => ctx.close(), 2000);
  } catch(e) { /* audio not supported — fail silently */ }
}

// ── BUILDER START SOUND — pneumatic hiss + belt rolling ──
function playBuilderSound() {
  if (window._isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Pneumatic hiss
    const buf1 = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const d1 = buf1.getChannelData(0);
    for (let i = 0; i < d1.length; i++) d1[i] = (Math.random() * 2 - 1);
    const n1 = ctx.createBufferSource(); n1.buffer = buf1;
    const f1 = ctx.createBiquadFilter(); f1.type = 'highpass';
    f1.frequency.setValueAtTime(1500, now);
    f1.frequency.exponentialRampToValueAtTime(400, now + 0.3);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.22, now + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    n1.connect(f1); f1.connect(g1); g1.connect(ctx.destination);
    n1.start(now); n1.stop(now + 0.37);

    // Belt motor rolling
    [50, 100, 150].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      const vol = [0.10, 0.06, 0.03][i];
      g.gain.setValueAtTime(0, now + 0.3);
      g.gain.linearRampToValueAtTime(vol, now + 0.5);
      g.gain.setValueAtTime(vol, now + 1.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + 0.3); o.stop(now + 1.65);
    });

    setTimeout(() => ctx.close(), 2000);
  } catch(e) { /* audio not supported — fail silently */ }
}

// ── ROSIE THE ROBOT — ascending square-wave beeps ──
function playRosieSound() {
  if (window._isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 660, 880, 1100].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'square';
      const t = ctx.currentTime + i * 0.14;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.linearRampToValueAtTime(0, t + 0.12);
      o.start(t); o.stop(t + 0.15);
    });
    setTimeout(() => ctx.close(), 800);
  } catch(e) { /* audio not supported — fail silently */ }
}

// ── FLYING CAR ARRIVAL — plays Kai's WaxFrame hive-approved fly-in sound ──
// File lives at sounds/waxframe_hive_approved_flyin.wav. If the file is
// missing or audio is blocked, fails silently.
function playFlyingCarSound() {
  if (window._isMuted) return;
  try {
    const audio = new Audio('sounds/waxframe_hive_approved_flyin.wav');
    audio.volume = 0.85;
    audio.play().catch(() => {});
  } catch(e) { /* audio not supported — fail silently */ }
}
