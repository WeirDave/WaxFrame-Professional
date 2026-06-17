// ============================================================
//  WaxFrame — helper-handlers.js
// Build: 20260616-004
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

    // ── API-key console list (api-details.html only) ──
    //   Backed by toggleGuideConsoles() in js/api-links.js. The button
    //   appears only on api-details.html; the action is in this shared
    //   table because the typeof-guard means it's a no-op on any page
    //   that doesn't load api-links.js.
    'consoles-toggle': function() {
      if (typeof toggleGuideConsoles === 'function') toggleGuideConsoles();
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
    },

    // ── Generic dispatch (v3.63.351, for index.html mass migration) ──
    //
    // The work-screen had ~390 `<button onclick="funcName()">` wired
    // to functions in app.js. Naming each as its own ACTIONS entry
    // would balloon this file with hundreds of one-line shims; the
    // generic actions below read the function name (and any single
    // argument) from data attributes on the element instead:
    //
    //   data-action="call"        + data-fn="funcName"
    //   data-action="call"        + data-fn="funcName" + data-arg="X"
    //   data-action="call"        + data-fn="funcName" + data-arg-this="1"  (passes the element)
    //   data-action="call"        + data-fn="funcName" + data-arg-event="1" (passes the event)
    //   data-action="call-chain"  + data-fn="f1,f2,f3" (calls each, no args)
    //   data-action="backdrop-call" + data-fn="closeFooModal" (only fires when target === el)
    //   data-action="set-data"    + data-key="userTyped" + data-value="true"
    //   data-action="noop"        (consumes the click — parent data-actions do not fire)
    //
    // The function name is resolved via a dotted-path walk over window
    // (so "WF_DEBUG.bundleForScout" works). This is NOT eval — we never
    // parse a string as code; we only look up a name in a known scope
    // and invoke it. Safe under strict CSP.
    'call': callAction,
    'call-chain': function(el) {
      // Each chained function is invoked with the dispatched element
      // as its first argument. Functions that don't need it (the vast
      // majority) ignore the extra arg. Functions that DO need it
      // (the __wf* bootstrap shims in app-bootstrap.js, which read
      // el.dataset / el.value to replicate the original inline
      // expression) get exactly what they need.
      var names = (el.dataset.fn || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      for (var i = 0; i < names.length; i++) {
        var fn = resolveDotted(names[i]);
        if (typeof fn === 'function') fn(el);
      }
    },
    'backdrop-call': function(el, e) {
      if (e.target !== el) return;
      var fn = resolveDotted(el.dataset.fn);
      if (typeof fn === 'function') fn();
    },
    'set-data': function(el) {
      var key = el.dataset.key, value = el.dataset.value;
      if (key) el.dataset[key] = value === undefined ? '' : value;
    },
    // 'noop' replaces inline `onclick="event.stopPropagation()"`. It
    // halts both the delegated walk-up (our dispatcher returns at the
    // first data-action match) AND the native bubble — important when
    // a non-delegated listener is attached higher in the tree, which
    // is what the original stopPropagation() was guarding against.
    'noop': function(_, e) { if (e) e.stopPropagation(); },

    // ── index.html-specific composites (v3.63.351) ─────────────
    // Multi-statement onclick patterns that share a stable shape.
    // Naming them keeps the migration script's regex tractable and
    // avoids one-off generic encodings like `call-chain` plus an
    // out-of-band arg.
    //
    //   close nav AND switch screens (data-arg = screen id)
    'nav-goto-screen': function(el) {
      if (typeof closeNavMenu === 'function') closeNavMenu();
      if (typeof goToScreen === 'function') goToScreen(el.dataset.arg);
    },
    //   close the finish-round modal AND return to the welcome screen
    'finish-exit-home': function() {
      if (typeof hideFinishModal === 'function') hideFinishModal();
      if (typeof goToScreen === 'function') goToScreen('screen-welcome');
    },
    //   close the finish-round modal AND open Save-Template
    'finish-save-template': function() {
      if (typeof hideFinishModal === 'function') hideFinishModal();
      if (typeof openSaveTemplateModal === 'function') openSaveTemplateModal();
    },
    //   Programmatically click a hidden <input type="file"> (the file-
    //   picker pattern used by drop zones).
    'click-element': function(el) {
      var t = document.getElementById(el.dataset.target);
      if (t) t.click();
    },
    //   Hide an element by id using the shared display utility.
    'hide-element': function(el) {
      var t = document.getElementById(el.dataset.target);
      if (t) t.classList.add('is-hidden');
    },
    //   Detach an element by id from the DOM. Used by ephemeral modals
    //   (e.g. the round-history view-doc modal in app.js) that are
    //   rebuilt fresh on each open — leaving the old node attached would
    //   leak. data-target is the element id; "self" detaches the
    //   element carrying the data-action.
    'remove-element': function(el) {
      var id = el.dataset.target;
      var t = id === 'self' ? el : (id ? document.getElementById(id) : null);
      if (t) t.remove();
    },

    // v3.63.363 — multi-arg generic call and section-scroll. See the
    // function definitions below the ACTIONS table for the arg-spec
    // grammar.
    'call-multi': function(el, e) { callMultiAction(el, e); },
    'scroll-to':  function(el, e) { scrollToAction(el, e); }
  };

  // Shared helper for the generic `call` action. Used by both the click
  // ACTIONS table and the input/change INPUT_ACTIONS / CHANGE_ACTIONS
  // tables below. The arg modes (most specific first):
  //   data-arg-value="1"   → fn(el.value)    -- text/select input value
  //   data-arg-checked="1" → fn(el.checked)  -- checkbox/radio state
  //   data-arg-this="1"    → fn(el)          -- the element itself
  //   data-arg-event="1"   → fn(event)       -- the event object
  //   data-arg="X"         → fn("X")         -- literal string from attr
  //   (none)               → fn()            -- no args
  function callAction(el, e) {
    var fn = resolveDotted(el.dataset.fn);
    if (typeof fn !== 'function') return;
    // v3.63.364 — opt-in preventDefault. Set data-prevent="1" on an
    // <a> or <button type="submit"> to suppress the native default
    // (hash navigation, form submit) that would otherwise fire after
    // the dispatched fn returns. Cheaper than auto-preventDefault on
    // <a> because it doesn't surprise an <a> whose href IS load-bearing.
    if (e && el.dataset.prevent === '1') e.preventDefault();
    if (el.dataset.argValue === '1')         fn(el.value);
    else if (el.dataset.argChecked === '1')  fn(el.checked);
    else if (el.dataset.argThis === '1')     fn(el);
    else if (el.dataset.argEvent === '1')    fn(e);
    else if ('arg' in el.dataset)            fn(el.dataset.arg);
    else                                     fn();
    // v3.63.363 — opt-in stopPropagation. Set data-stop="1" on the
    // element to preserve the explicit `event.stopPropagation()` that
    // some pre-migration inline handlers carried. Needed when a global
    // document-level listener (e.g. wfModelSelectCloseAll) would
    // otherwise pick the click up after the action ran.
    if (e && el.dataset.stop === '1') e.stopPropagation();
  }

  // ── Multi-arg generic call (v3.63.363, Phase 8) ─────────────
  //
  // For inline handlers that passed 2+ args, e.g.
  //   onclick="applyTemplate('${id}', '${path}')"
  //   onchange="toggleSessionBee('${id}', this.checked)"
  //   onclick="selectHoldout(${i}, 'apply', ${total})"
  //
  // Wired as:
  //   data-action="call-multi"  data-fn="fnName"  data-args="<spec>"
  //
  // The spec is a comma-separated list of arg sources, evaluated in
  // order. Each token resolves to one positional argument:
  //   value            → el.value                  (input/select)
  //   checked          → el.checked                (checkbox/radio)
  //   this             → el                        (element itself)
  //   event            → the event object
  //   data:<key>       → el.dataset[<key>] (string)
  //   data-num:<key>   → Number(el.dataset[<key>]) (numeric arg)
  //   lit:<s>          → the literal string after "lit:"
  //   lit-num:<n>      → Number(<n>) (numeric literal)
  //
  // Whitespace around tokens is ignored. Comma is the only separator;
  // arg values that contain a comma must use a data-* attribute.
  //
  // Example — applyTemplate('cookies', 'scratch'):
  //   <button data-action="call-multi" data-fn="applyTemplate"
  //           data-args="data:tpl,data:path"
  //           data-tpl="cookies" data-path="scratch">…</button>
  //
  // Example — selectHoldout(3, 'apply', 7):
  //   <button data-action="call-multi" data-fn="selectHoldout"
  //           data-args="data-num:i,lit:apply,data-num:total"
  //           data-i="3" data-total="7">…</button>
  function callMultiAction(el, e) {
    callMultiActionPrefixed(el, e, '');
  }
  // Prefix lets one element host multiple call-multi handlers without
  // colliding on data-fn / data-args. When prefix is '', the action
  // reads el.dataset.fn / el.dataset.args; when prefix is 'Key' it
  // reads el.dataset.fnKey / el.dataset.argsKey (falling back to the
  // unprefixed pair if the prefixed override is missing). Future
  // prefixes can be added the same way (e.g. 'Change', 'Input') if a
  // single element ever needs distinct change + input call-multi
  // handlers.
  function callMultiActionPrefixed(el, e, prefix) {
    var fnKey   = prefix ? 'fn'   + prefix : 'fn';
    var argsKey = prefix ? 'args' + prefix : 'args';
    var fn = resolveDotted(el.dataset[fnKey] || el.dataset.fn);
    if (typeof fn !== 'function') return;
    if (e && el.dataset.prevent === '1') e.preventDefault();
    var spec = (el.dataset[argsKey] || el.dataset.args || '').split(',');
    var args = new Array(spec.length);
    for (var i = 0; i < spec.length; i++) {
      var t = spec[i].trim();
      if (t === '')                       args[i] = undefined;
      else if (t === 'value')             args[i] = el.value;
      else if (t === 'checked')           args[i] = el.checked;
      else if (t === 'this')              args[i] = el;
      else if (t === 'event')             args[i] = e;
      else if (t.indexOf('data-num:') === 0) args[i] = Number(el.dataset[t.slice(9)]);
      else if (t.indexOf('data:') === 0)     args[i] = el.dataset[t.slice(5)];
      else if (t.indexOf('lit-num:') === 0)  args[i] = Number(t.slice(8));
      else if (t.indexOf('lit:') === 0)      args[i] = t.slice(4);
      else                                args[i] = undefined;
    }
    fn.apply(null, args);
    if (e && el.dataset.stop === '1') e.stopPropagation();
  }

  // ── Scroll-to-section (v3.63.363) ───────────────────────────
  //
  // Replaces inline onclick="document.getElementById('id').scrollIntoView({...})".
  // data-target carries the destination id; smooth-scroll is hard-coded
  // because every existing call site used the same options.
  //
  // For <a> elements we preventDefault so the href doesn't trigger
  // a hash change (the original onclick ended with `return false;`).
  function scrollToAction(el, e) {
    if (el.tagName === 'A') e.preventDefault();
    var id = el.dataset.target;
    if (!id) return;
    var t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Walk a dotted name ("WF_DEBUG.bundleForScout") through `window`
  // and return the resolved value, or undefined if any link is missing.
  function resolveDotted(name) {
    if (!name) return undefined;
    var parts = name.split('.');
    var cur = window;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

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
    },
    // Generic Enter-key trigger. data-fn names the function to call,
    // optionally with data-arg / data-arg-this / data-arg-event.
    // data-prevent-default="1" calls e.preventDefault() (used by the
    // Custom-AI fetch-models input).
    'enter-call': function(el, e) {
      if (e.key !== 'Enter') return;
      if (el.dataset.preventDefault === '1') e.preventDefault();
      callAction(el, e);
    },
    // Two-key dispatch for the inline wfPrompt input (Enter to OK,
    // Escape to cancel). data-fn-enter / data-fn-escape name the
    // window-scoped functions to call.
    'enter-escape-call': function(el, e) {
      var name = e.key === 'Enter' ? el.dataset.fnEnter
               : e.key === 'Escape' ? el.dataset.fnEscape
               : null;
      if (!name) return;
      var fn = resolveDotted(name);
      if (typeof fn === 'function') fn();
    },
    // v3.63.364 — multi-arg key-call. Forwards every keydown event to
    // data-fn via callMultiAction (same arg-spec grammar as the click /
    // input / change call-multi action). The target function is
    // responsible for its own key filtering. Used by wfModelSelectKey
    // (arrow + Enter + Escape navigation inside the custom model
    // dropdown) and the __wfHiveCardSwapKey shim (Enter / Space to
    // commit a 6-card hive pick).
    //
    // When the same element ALSO carries a click data-action, the click
    // and keydown handlers need distinct fn/args. data-fn-key and
    // data-args-key override the generic data-fn / data-args for
    // keydown only; clicks still read the unprefixed pair.
    'key-call-multi': function(el, e) { callMultiActionPrefixed(el, e, 'Key'); }
  };

  // ── INPUT_ACTIONS and CHANGE_ACTIONS tables ────────────────
  //
  // For oninput / onchange handlers. data-input-action / data-change-action
  // pick which entry fires. Generic `call` / `call-chain` / `set-data`
  // mirror the click side and share data-fn / data-arg conventions.
  const INPUT_ACTIONS = {
    'call':       callAction,
    'call-chain': ACTIONS['call-chain'],
    'call-multi': callMultiAction,
    'set-data':   ACTIONS['set-data']
  };
  const CHANGE_ACTIONS = {
    'call':       callAction,
    'call-chain': ACTIONS['call-chain'],
    'call-multi': callMultiAction,
    'set-data':   ACTIONS['set-data']
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

  // ── Input / Change dispatchers ─────────────────────────────
  // Single listener each — input and change events fire on a focused
  // form control, no tree walk needed.
  document.addEventListener('input', function(e) {
    var el = e.target;
    if (!el || !el.dataset || !el.dataset.inputAction) return;
    var fn = INPUT_ACTIONS[el.dataset.inputAction];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', function(e) {
    var el = e.target;
    if (!el || !el.dataset || !el.dataset.changeAction) return;
    var fn = CHANGE_ACTIONS[el.dataset.changeAction];
    if (fn) fn(el, e);
  });

  // ── Image load-error fallback ──────────────────────────────
  // Replaces inline onerror="this.style.display='none'" on icon
  // imagery. The `error` event does not bubble, so this listener
  // must run in the capture phase. data-hide-on-error opts in.
  // data-dim-on-error is the lighter variant (drops to 30% opacity)
  // used on the Import-Server provider thumbnails in index.html.
  //
  // v3.63.366 — data-error-fn opt-in. Names a window-scoped function
  // to call with the element as its sole arg. Used by the AI-icon
  // fallback in app.js (resolveAiIconFallback) where a missing icon
  // needs to be replaced with a generated avatar, not just hidden.
  document.addEventListener('error', function(e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG' || !t.dataset) return;
    if ('hideOnError' in t.dataset) t.style.display = 'none';
    else if ('dimOnError' in t.dataset) t.style.opacity = '0.3';
    else if (t.dataset.errorFn) {
      var fn = resolveDotted(t.dataset.errorFn);
      if (typeof fn === 'function') fn(t);
    }
  }, true);

  // ── Version-stamp init (v3.63.352) ─────────────────────────
  // Every page sprays the current app version into one or more
  // <span class="app-version-stamp"> placeholders. Pre-v3.63.352
  // a one-line inline <script> at the bottom of every HTML page
  // did this; the inline tag required 'unsafe-inline' on script-
  // src, blocking the strict-CSP cutover. Moving the snippet
  // here means every page that loads helper-handlers.js gets the
  // stamp for free.
  function stampVersion() {
    if (typeof APP_VERSION === 'undefined') return;
    var els = document.querySelectorAll('.app-version-stamp');
    for (var i = 0; i < els.length; i++) els[i].textContent = APP_VERSION;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', stampVersion);
  } else {
    stampVersion();
  }
})();
