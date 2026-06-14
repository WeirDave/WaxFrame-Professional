// ============================================================
//  WaxFrame — helper-handlers.js
// Build: 20260614-006
//  Event-delegation dispatcher for helper-page actions, the first
//  load-bearing step in the strict-CSP migration started in v3.63.347.
//
//  Pre-v3.63.347 every helper page wired button behavior with inline
//  on*= attributes — e.g. <button onclick="closeNavMenu()">. Those
//  attributes require `script-src 'unsafe-inline'`, which blocks the
//  whole site from tightening its CSP. This file replaces the inline
//  handlers with delegated listeners that look up named actions in a
//  single ACTIONS table.
//
//  Migration shape:
//   • In HTML:   <button data-action="nav-close">×</button>
//   • Optional:  data-target, data-theme, etc. carry per-action params
//   • In JS:     one document-level click/keydown listener walks up
//                from the event target finding the nearest [data-action]
//                element, looks up ACTIONS[name], and invokes it
//
//  Pages migrate one at a time. Once every page is migrated, the CSP
//  meta tag in each <head> drops 'unsafe-inline' from script-src,
//  and Check 8 in tools/release-check.mjs enforces zero inline on*=
//  handlers in any file already past the migration line.
// ============================================================

(function() {
  'use strict';

  // ── ACTIONS table ──────────────────────────────────────────
  //
  // Each entry is invoked as fn(element, event). Element is the
  // [data-action] node — typically the button/link — so the action
  // can read its data-* attributes (data-target, data-theme, etc.)
  // without scanning the DOM again.
  //
  // Functions like openNavMenu / closeNavMenu / setTheme / toggleMute
  // are defined in nav-helper.js / theme.js / audio.js and loaded
  // before this script on every helper page that uses them.
  const ACTIONS = {
    // ── Nav menu ──
    'nav-open': function() {
      if (typeof openNavMenu === 'function') openNavMenu();
    },
    'nav-close': function() {
      if (typeof closeNavMenu === 'function') closeNavMenu();
    },

    // ── Modals (open / close by id) ──
    //   data-target="modalId"
    //
    //   When triggered from an <a> we preventDefault so the link's href
    //   (often "#" or a fragment-only target) doesn't trigger navigation
    //   or hash scroll. Pre-v3.63.348 the inline handlers carried an
    //   explicit `;return false;` at the end for this; the dispatcher
    //   now does it once for every anchor-typed action.
    'modal-open': function(el, e) {
      if (el.tagName === 'A') e.preventDefault();
      var id = el.dataset.target;
      if (!id) return;
      var modal = document.getElementById(id);
      if (modal) modal.classList.add('active');
    },
    'modal-close': function(el, e) {
      if (el.tagName === 'A') e.preventDefault();
      var id = el.dataset.target;
      if (!id) return;
      var modal = document.getElementById(id);
      if (modal) modal.classList.remove('active');
    },
    // Backdrop click: only close when the click landed on the overlay
    // itself, not on a descendant. data-target is optional — defaults
    // to the element carrying the action.
    'modal-backdrop-close': function(el, e) {
      if (e.target !== el) return;
      var id = el.dataset.target || el.id;
      var modal = id ? document.getElementById(id) : el;
      if (modal) modal.classList.remove('active');
    },

    // ── About modal (nav button shortcut: close nav + open about) ──
    //   data-target="aboutModalHelper" on the button
    'about-open': function(el, e) {
      if (el.tagName === 'A') e.preventDefault();
      if (typeof closeNavMenu === 'function') closeNavMenu();
      var id = el.dataset.target || 'aboutModalHelper';
      var modal = document.getElementById(id);
      if (modal) modal.classList.add('active');
    },

    // ── Document download (helper-page Word export) ──
    //   Backed by downloadPageAsDocx() in js/docx-export.js, which
    //   reads the current page DOM and emits a .docx with images.
    'doc-download': function() {
      if (typeof downloadPageAsDocx === 'function') downloadPageAsDocx();
    },

    // ── Theme + audio ──
    //   data-theme="light|auto|dark" on the button
    'theme-set': function(el) {
      var theme = el.dataset.theme;
      if (theme && typeof setTheme === 'function') setTheme(theme);
    },
    'mute-toggle': function() {
      if (typeof toggleMute === 'function') toggleMute();
    },

    // ── License modal (defined in license-helper.js) ──
    'license-submit': function() {
      if (typeof submitLicenseKey === 'function') submitLicenseKey();
    },
    'license-modal-hide': function() {
      if (typeof hideLicenseModal === 'function') hideLicenseModal();
    },
    'license-manage-modal-hide': function() {
      if (typeof hideLicenseManageModal === 'function') hideLicenseManageModal();
    },
    'license-replace': function() {
      if (typeof replaceLicenseKey === 'function') replaceLicenseKey();
    },
    'license-remove-confirm': function() {
      if (typeof confirmRemoveLicense === 'function') confirmRemoveLicense();
    },
    // License backdrop-close variants that call the helper functions
    // (which carry side effects beyond classList.remove — see
    // license-helper.js).
    'license-modal-backdrop-close': function(el, e) {
      if (e.target !== el) return;
      if (typeof hideLicenseModal === 'function') hideLicenseModal();
    },
    'license-manage-modal-backdrop-close': function(el, e) {
      if (e.target !== el) return;
      if (typeof hideLicenseManageModal === 'function') hideLicenseManageModal();
    }
  };

  // ── KEY_ACTIONS table ──────────────────────────────────────
  //
  // For elements that need keydown behavior (e.g. Enter to submit a
  // license key). Each entry is invoked as fn(element, event), same
  // shape as ACTIONS above. The data-key-action attribute selects
  // which entry to fire; the listener only fires for the named keys.
  const KEY_ACTIONS = {
    'license-submit-on-enter': function(el, e) {
      if (e.key === 'Enter' && typeof submitLicenseKey === 'function') {
        submitLicenseKey();
      }
    }
  };

  // ── Click dispatcher ───────────────────────────────────────
  // Capture phase = false (default) so existing inline handlers on
  // un-migrated pages still run first if any get added by accident
  // during the migration window.
  document.addEventListener('click', function(e) {
    var node = e.target;
    while (node && node !== document) {
      if (node.dataset && node.dataset.action) {
        var fn = ACTIONS[node.dataset.action];
        if (fn) fn(node, e);
        return;
      }
      node = node.parentNode;
    }
  });

  // ── Keydown dispatcher ─────────────────────────────────────
  // Bound to the element itself rather than walking the tree, because
  // keydown is normally targeted at a single focused input. Helper
  // pages attach via data-key-action on the input.
  document.addEventListener('keydown', function(e) {
    var el = e.target;
    if (!el || !el.dataset || !el.dataset.keyAction) return;
    var fn = KEY_ACTIONS[el.dataset.keyAction];
    if (fn) fn(el, e);
  });
})();
