// ============================================================
//  WaxFrame — min-screen-viewport.js
// Build: 20260614-029
//  Live viewport-size hint for the index.html minimum-screen
//  surface. If the user is below the 1366×768 minimum we show
//  exactly how many pixels short on each axis; if they're
//  above it we tell them to refresh to load WaxFrame.
//  Extracted from the formerly-inline <script> at the bottom
//  of index.html in v3.63.352 so the page can drop unsafe-
//  inline. Listens on resize + visualViewport.resize to cover
//  browser zoom and DPI changes that do not fire resize on
//  every engine.
// ============================================================

(function() {
  var nowEl = document.getElementById('minScreenViewportNow');
  var hintEl = document.getElementById('minScreenViewportHint');
  if (!nowEl || !hintEl) return;
  var MIN_W = 1366;
  var MIN_H = 768;
  function update() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    nowEl.textContent = w + ' × ' + h + ' px';
    var okW = w >= MIN_W;
    var okH = h >= MIN_H;
    if (okW && okH) {
      hintEl.textContent = '👍 You’re above the minimum — refresh to load WaxFrame.';
      hintEl.className = 'min-screen-viewport-hint is-ok';
    } else {
      var parts = [];
      if (!okW) parts.push((MIN_W - w) + ' px wider');
      if (!okH) parts.push((MIN_H - h) + ' px taller');
      hintEl.textContent = '✗ Needs ' + parts.join(' and ') + ' to fit the work screen.';
      hintEl.className = 'min-screen-viewport-hint is-short';
    }
  }
  update();
  window.addEventListener('resize', update, { passive: true });
  // Cover zoom and DPI changes that don't fire resize on every browser.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', update, { passive: true });
  }
})();
