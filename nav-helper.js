// ============================================================
//  WaxFrame — nav-helper.js
//  Build: 20260427-012
//  Shared hamburger-menu open/close functions for helper pages
//  (api-details, document-playbooks, prompt-editor, what-are-tokens,
//   waxframe-user-manual). Mirrors the work-screen openNavMenu /
//   closeNavMenu in app.js so the visual + behavior is identical.
//  Helper pages use the slim helper-nav markup (Documentation /
//   Create Something / Support) — see each page's <div id="navPanel">.
// ============================================================

function openNavMenu() {
  document.getElementById('navPanel')?.classList.add('open');
  document.getElementById('navBackdrop')?.classList.add('open');
}

function closeNavMenu() {
  document.getElementById('navPanel')?.classList.remove('open');
  document.getElementById('navBackdrop')?.classList.remove('open');
}

// ESC key closes the menu — matches in-app behavior
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeNavMenu();
});
