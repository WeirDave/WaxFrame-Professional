// ============================================================
//  WaxFrame — api-details-page.js
// Build: 20260616-001
//  api-details.html page-specific init. Stamps the API_CONFIGS
//  model names into the on-page guide so model references
//  cannot drift from the live app. Extracted from the formerly-
//  inline <script> block in v3.63.352 so the page can drop
//  'unsafe-inline'. (Version-stamp init moved into
//  helper-handlers.js in the same release, so we only carry
//  the data-seed-model logic here.)
// ============================================================

(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySeedModels);
  } else {
    applySeedModels();
  }

  function applySeedModels() {
    try {
      if (!window.API_CONFIGS) return;
      document.querySelectorAll('[data-seed-model]').forEach(function(el) {
        var key = el.getAttribute('data-seed-model');
        var cfg = window.API_CONFIGS[key];
        if (cfg && cfg.model) el.textContent = cfg.model;
      });
    } catch (e) { /* keep hardcoded fallback */ }
  }
})();
