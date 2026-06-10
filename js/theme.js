// ============================================================
//  WaxFrame — shared theme + mute utility
// Build: 20260608-026
//  Single source of truth for theme + mute behavior. Loaded by:
//    • index.html (main app) — BEFORE app.js
//    • All 5 helper pages (api-details, document-playbooks,
//      prompt-editor, what-are-tokens, waxframe-user-manual)
//
//  v3.41.0 — Promoted to canonical source. Pre-v3.41 these
//  functions were duplicated in app.js; that duplication was
//  removed and app.js now reads window._isMuted from this file.
//  _isMuted is exposed on window explicitly (not let-declared)
//  so app.js's audio-gating guards can see the same variable
//  across script boundaries.
// ============================================================

// ── THEME ──
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('waxframe_v2_theme', t);
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
}

// ── MUTE STATE ──
// Exposed on window so other scripts loaded after theme.js can read it.
// State persists in localStorage('waxframe_muted') so it survives reloads
// AND propagates between the main app and helper pages.
window._isMuted = (localStorage.getItem('waxframe_muted') === 'true');

function toggleMute() {
  window._isMuted = !window._isMuted;
  localStorage.setItem('waxframe_muted', window._isMuted);
  _updateMuteBtn();
}

function _updateMuteBtn() {
  // Update every mute button on the page. On the main app the work-topbar
  // has one and each of the 5 setup screens has one. On helper pages
  // there's one in .page-header-controls. All share the .mute-btn class.
  document.querySelectorAll('.mute-btn').forEach(btn => {
    btn.textContent = window._isMuted ? '🔇' : '🔊';
    btn.title       = window._isMuted ? 'Unmute sounds' : 'Mute sounds';
    btn.classList.toggle('is-muted', window._isMuted);
  });
}

function initMuteBtn() {
  _updateMuteBtn();
}

function initTheme() {
  const saved = localStorage.getItem('waxframe_v2_theme') || 'auto';
  setTheme(saved);
}

// ── AUTO-INIT ──
// Synchronous IIFE so theme reflects saved state by the time the body
// finishes parsing. setTheme is safe to call before DOMContentLoaded
// (querySelectorAll on a missing element returns empty NodeList).
// _updateMuteBtn deferred to DOMContentLoaded since the mute buttons
// don't exist until the body parses.
(function() {
  const t = localStorage.getItem('waxframe_v2_theme') || 'auto';
  setTheme(t);
})();

document.addEventListener('DOMContentLoaded', () => {
  _updateMuteBtn();
});
