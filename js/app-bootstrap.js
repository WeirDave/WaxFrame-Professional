// ============================================================
//  WaxFrame — app-bootstrap.js
// Build: 20260614-028
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

  // ── Per-AI-row hive card shims (Phase 8, v3.63.364) ──────────
  //
  // Three composite handlers in the per-AI-row hive card body don't
  // fit the dispatcher's single-fn conventions and need shims.

  // 6-card hive-pick keyboard activation. Original inline:
  //   onkeydown="if(event.key==='Enter'||event.key===' '){...}"
  // Fires swapAIModelFromHiveCard on Enter or Space, preventDefault to
  // suppress the space-scroll and Enter-default click semantics, and
  // stopPropagation so the row-summary keydown listener (once it lands)
  // doesn't also toggle.
  //
  // Wired as: data-key-action="key-call-multi" data-fn="__wfHiveCardSwapKey"
  //           data-args="this,event" data-ai-id="${id}" data-pick-model="${model}"
  window.__wfHiveCardSwapKey = function(el, e) {
    if (!el || !el.dataset || !e) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (typeof swapAIModelFromHiveCard === 'function') {
      swapAIModelFromHiveCard(el.dataset.aiId, el.dataset.pickModel);
    }
    e.stopPropagation();
  };

  // API-key input "Enter saves" plus the 3rd-arg this. Original inline:
  //   onkeydown="if(event.key==='Enter'){saveKeyForAI('${id}',this.value,this);}"
  // Three args (id, value, this) — call-multi can't reach el itself
  // alongside el.value, so a tiny shim is cleaner than another
  // dispatcher token.
  //
  // Wired as: data-key-action="key-call-multi" data-fn="__wfSaveKeyOnEnter"
  //           data-args="this,event" data-ai-id="${ai.id}"
  window.__wfSaveKeyOnEnter = function(el, e) {
    if (!el || !el.dataset || !e) return;
    if (e.key !== 'Enter') return;
    if (typeof saveKeyForAI === 'function') saveKeyForAI(el.dataset.aiId, el.value, el);
  };

  // Builder pick — chain setBuilder + renderAISetupGrid. Original inline:
  //   onclick="event.stopPropagation(); event.preventDefault(); setBuilder('${id}'); renderAISetupGrid(); return false;"
  //
  // Wired as: data-action="call" data-fn="__wfSetBuilderAndRender"
  //           data-arg-this="1" data-ai-id="${ai.id}" data-stop="1"
  window.__wfSetBuilderAndRender = function(el) {
    if (!el || !el.dataset) return;
    if (typeof setBuilder === 'function') setBuilder(el.dataset.aiId);
    if (typeof renderAISetupGrid === 'function') renderAISetupGrid();
  };

  // ── Holdout / conflict decision UI shims (Phase 8, v3.63.365) ──
  //
  // Three composite handlers in the holdout / conflict decision panel
  // need shims:

  // Scroll to a holdout anchor. Original inline:
  //   onclick="scrollToCurrentText(window._holdoutAnchors[${i}])"
  // The arg is a runtime lookup into a window-scoped map keyed by
  // suggestion index. data-arg can carry the index but the map lookup
  // happens here.
  //
  // Wired as: data-action="call" data-fn="__wfScrollToHoldoutAnchor"
  //           data-arg-this="1" data-idx="${i}"
  window.__wfScrollToHoldoutAnchor = function(el) {
    if (!el || !el.dataset) return;
    var idx = el.dataset.idx;
    var map = window._holdoutAnchors;
    var anchor = map && idx != null ? map[idx] : null;
    if (anchor && typeof scrollToCurrentText === 'function') scrollToCurrentText(anchor);
  };

  // Scroll to a conflict-card current-text. Original inline:
  //   onclick="scrollToCurrentText(window._conflictCurrentTexts[${di}])"
  // Same shape as the holdout-anchor case but a different map.
  //
  // Wired as: data-action="call" data-fn="__wfScrollToConflictCurrent"
  //           data-arg-this="1" data-idx="${di}"
  window.__wfScrollToConflictCurrent = function(el) {
    if (!el || !el.dataset) return;
    var idx = el.dataset.idx;
    var map = window._conflictCurrentTexts;
    var text = map && idx != null ? map[idx] : null;
    if (text && typeof scrollToCurrentText === 'function') scrollToCurrentText(text);
  };

  // Apply decisions WITHOUT locking. Original inline:
  //   onclick="applyDecisions({ noLock: true })"
  // call-multi can't carry an object-literal argument so we shim.
  //
  // Wired as: data-action="call" data-fn="__wfApplyDecisionsNoLock"
  window.__wfApplyDecisionsNoLock = function() {
    if (typeof applyDecisions === 'function') applyDecisions({ noLock: true });
  };
})();
