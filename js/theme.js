// ============================================================
//  WaxFrame — shared theme + mute utility for helper pages
//  Build: 20260516-002
//  Provides setTheme() and toggleMute() to helper pages
//  (api-details, document-playbooks, prompt-editor, what-are-tokens,
//   waxframe-user-manual) which don't load app.js. Mirrors the in-app
//   versions of these functions so state (localStorage-backed) persists
//   across page navigations between the main app and helper pages.
//
//  v3.40.1 — mute machinery added so the mute toggle in
//  .page-header-controls of every helper page works. No audio fires
//  on helper pages, but setting the state here means the user's mute
//  preference persists back to the main app on next navigation.
// ============================================================

// ── THEME ──
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('waxframe_v2_theme', t);
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
}

// ── MUTE ──
// State lives in localStorage('waxframe_muted'). Mirrors app.js's
// definitions exactly so toggling here is indistinguishable from
// toggling in the main app.
let _isMuted = (localStorage.getItem('waxframe_muted') === 'true');

function toggleMute() {
  _isMuted = !_isMuted;
  localStorage.setItem('waxframe_muted', _isMuted);
  _updateMuteBtn();
}

function _updateMuteBtn() {
  document.querySelectorAll('.mute-btn').forEach(btn => {
    btn.textContent = _isMuted ? '🔇' : '🔊';
    btn.title       = _isMuted ? 'Unmute sounds' : 'Mute sounds';
    btn.classList.toggle('is-muted', _isMuted);
  });
}

// ── INIT ──
// Synchronous IIFE so setTheme reflects saved state by the time the body
// finishes parsing. setTheme is safe to call before DOMContentLoaded
// (querySelectorAll returns empty NodeList if .theme-opt doesn't exist
// yet — harmless). _updateMuteBtn is deferred to DOMContentLoaded since
// helper pages may not have a guaranteed early-DOM .mute-btn target.
(function() {
  const t = localStorage.getItem('waxframe_v2_theme') || 'auto';
  setTheme(t);
})();

document.addEventListener('DOMContentLoaded', () => {
  _updateMuteBtn();
});
