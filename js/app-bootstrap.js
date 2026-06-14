// ============================================================
//  WaxFrame — app-bootstrap.js
// Build: 20260614-021
//  Glue shims for index.html's strict-CSP migration (v3.63.351).
//
//  Three inline handlers on the work screen had shapes the generic
//  call() dispatcher in helper-handlers.js couldn't represent
//  faithfully (toggling a private boolean against itself; chaining
//  a `this.dataset.X` assignment with a function call; passing
//  `this.value` mid-chain). The migration script in
//  tools/migrate-inline-handlers.mjs substituted each with a named
//  function call (__wfDeepDiveToggle / __wfMarkUserTyped /
//  __wfAutoFillAndChoose); this file defines those names.
//
//  Each function is intentionally tiny. When the strict-CSP cutover
//  ships, this file can either stay as-is or fold into app.js — the
//  shape doesn't matter for security, only that nothing inline runs.
// ============================================================

(function() {
  'use strict';

  // Wired as: data-action="call" data-fn="__wfDeepDiveToggle"
  // Replaces: onclick="WF_DEBUG.setDeepDive(!WF_DEBUG.deepDiveOn)"
  window.__wfDeepDiveToggle = function() {
    if (window.WF_DEBUG && typeof WF_DEBUG.setDeepDive === 'function') {
      WF_DEBUG.setDeepDive(!WF_DEBUG.deepDiveOn);
    }
  };

  // Wired as: data-input-action="call-chain"
  //           data-fn="__wfMarkUserTyped,refreshCustomAIIconPreview"
  // Replaces: oninput="this.dataset.userTyped='true'; refreshCustomAIIconPreview && refreshCustomAIIconPreview();"
  //
  // call-chain hands each function the input element so this shim
  // can set the data-user-typed flag on it; refreshCustomAIIconPreview
  // ignores the extra arg.
  window.__wfMarkUserTyped = function(el) {
    if (el && el.dataset) el.dataset.userTyped = 'true';
  };

  // Wired as: data-input-action="call" data-fn="__wfAutoFillAndChoose"
  // Replaces: oninput="autoFillAIName(this.value); updateChooseModelLink();"
  //
  // The migration script substituted a SINGLE function name (not a
  // chain) so this shim performs both inner calls itself: pull
  // this.value into autoFillAIName, then fire updateChooseModelLink.
  window.__wfAutoFillAndChoose = function(el) {
    if (typeof autoFillAIName === 'function') autoFillAIName(el && el.value);
    if (typeof updateChooseModelLink === 'function') updateChooseModelLink();
  };

  // ── Reference-card oninput shims (Phase 8, v3.63.361) ──
  //
  // The dispatcher carries one arg per call (data-arg / data-arg-this /
  // data-arg-value). The two ref-card oninput handlers pass TWO args
  // — the doc id AND the new value — so a shim reads the id off
  // data-ref-id and the value off el.value, then forwards to the
  // existing public function (whose signature is shared with other
  // programmatic call sites and can't change).
  //
  // Wired as: data-input-action="call" data-fn="__wfRenameRefDoc"
  //           data-arg-this="1" data-ref-id="${idAttr}"
  window.__wfRenameRefDoc = function(el) {
    if (!el || !el.dataset) return;
    if (typeof renameReferenceDoc === 'function') {
      renameReferenceDoc(el.dataset.refId, el.value);
    }
  };

  // Wired as: data-input-action="call" data-fn="__wfUpdateRefDocText"
  //           data-arg-this="1" data-ref-id="${idAttr}"
  window.__wfUpdateRefDocText = function(el) {
    if (!el || !el.dataset) return;
    if (typeof updateReferenceDocText === 'function') {
      updateReferenceDocText(el.dataset.refId, el.value);
    }
  };

  // ── Edit-Hive modal checkbox (Phase 8, v3.63.363) ─────────────
  //
  // The Edit-Hive modal's per-AI toggle ran two functions inline:
  //   onchange="toggleSessionBee('${ai.id}', this.checked); renderBeeDotStrip();"
  // First call has 2 args, second is no-arg and needs to fire AFTER —
  // doesn't fit call-chain (1-arg-per-fn) or a single call-multi. A
  // shim is cleaner than another dispatcher extension for one composite.
  //
  // Wired as: data-change-action="call" data-fn="__wfEditHiveToggle"
  //           data-arg-this="1" data-ai-id="${ai.id}"
  window.__wfEditHiveToggle = function(el) {
    if (!el || !el.dataset) return;
    if (typeof toggleSessionBee === 'function') toggleSessionBee(el.dataset.aiId, el.checked);
    if (typeof renderBeeDotStrip === 'function') renderBeeDotStrip();
  };
})();
