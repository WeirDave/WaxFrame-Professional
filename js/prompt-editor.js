// ============================================================
//  WaxFrame — prompt-editor.js
// Build: 20260616-007
//  Page-specific behavior for prompt-editor.html. Extracted from
//  the formerly-inline <script> block at the bottom of that page
//  in v3.63.350 so the page can drop 'unsafe-inline' from CSP.
//
//  Two responsibilities:
//   1. The prompt-editor functions themselves: load saved prompts
//      from localStorage, save them, reset individual prompts or
//      all of them, show a status toast.
//   2. Delegated click/input dispatchers that map data-action /
//      data-input-action attributes on the page to the functions
//      above (replaces the v3.63.349 inline onclick / oninput
//      attributes on the buttons and textareas).
//
//  The DEFAULTS table reads canonical prompt text from
//  js/prompts.js (the WF_PROMPTS object). app.js and this file
//  now share a single source of truth — no manual sync needed.
//  Pre-v3.63.399 a hand-mirrored DEFAULTS table lived here and
//  had silently drifted from runtime for refine, builder_refine,
//  and recommend_model (see the v3.63.396 release notes for the
//  full drift table that motivated this refactor).
// ============================================================

(function() {
  'use strict';

  const LS_PROMPTS = 'waxframe_v2_prompts';

  // ── Default prompts ──
  // v3.63.399 — Reads from WF_PROMPTS (js/prompts.js). The pre-v3.63.399
  // hand-mirrored copy lived here and silently drifted from runtime; see
  // the v3.63.396 release notes for the drift table. The recommend_model
  // key maps to WF_PROMPTS.recommend_model_reviewer (the historical
  // canonical default for this single editor field — the Builder variant
  // is canonical-only and not user-editable today).
  const DEFAULTS = {
    draft_scratch:      WF_PROMPTS.draft_scratch,
    refine:             WF_PROMPTS.refine,
    builder_draft:      WF_PROMPTS.builder_draft,
    builder_refine:     WF_PROMPTS.builder_refine,
    resolved_builder:   WF_PROMPTS.resolved_builder,
    resolved_reviewers: WF_PROMPTS.resolved_reviewers,
    ai_warning:         WF_PROMPTS.ai_warning,
    recommend_model:    WF_PROMPTS.recommend_model_reviewer
  };

  // ── Behavior functions ──
  function readSavedPrompts() {
    // Guarded read: a corrupted waxframe_v2_prompts blob (partial write,
    // quota error, manual edit) would otherwise crash the page on boot.
    try {
      return JSON.parse(localStorage.getItem(LS_PROMPTS) || '{}');
    } catch (e) {
      return {};
    }
  }

  function loadPrompts() {
    const saved = readSavedPrompts();
    Object.keys(DEFAULTS).forEach(key => {
      const ta = document.getElementById('ta-' + key);
      if (ta) {
        ta.value = saved[key] !== undefined ? saved[key] : DEFAULTS[key];
        if (saved[key] !== undefined && saved[key] !== DEFAULTS[key]) {
          markModified(key);
        }
      }
    });
  }

  function markModified(key) {
    const ta = document.getElementById('ta-' + key);
    const badge = document.getElementById('badge-' + key);
    if (!ta || !badge) return;
    const isModified = ta.value !== DEFAULTS[key];
    ta.classList.toggle('modified', isModified);
    badge.classList.toggle('show', isModified);
  }

  function saveAll() {
    const prompts = {};
    Object.keys(DEFAULTS).forEach(key => {
      const ta = document.getElementById('ta-' + key);
      if (ta) prompts[key] = ta.value;
    });
    localStorage.setItem(LS_PROMPTS, JSON.stringify(prompts));
    showToast('✓ All prompts saved', 'saved');
  }

  function resetAll() {
    if (!confirm('Reset ALL prompts to defaults? Your custom prompts will be lost.')) return;
    localStorage.removeItem(LS_PROMPTS);
    Object.keys(DEFAULTS).forEach(key => {
      const ta = document.getElementById('ta-' + key);
      if (ta) {
        ta.value = DEFAULTS[key];
        ta.classList.remove('modified');
        document.getElementById('badge-' + key)?.classList.remove('show');
      }
    });
    showToast('↺ All prompts reset to defaults', 'reset');
  }

  function resetOne(key) {
    const ta = document.getElementById('ta-' + key);
    if (!ta) return;
    if (!confirm('Reset this prompt to default?')) return;
    ta.value = DEFAULTS[key];
    ta.classList.remove('modified');
    document.getElementById('badge-' + key)?.classList.remove('show');
    const saved = readSavedPrompts();
    delete saved[key];
    localStorage.setItem(LS_PROMPTS, JSON.stringify(saved));
    showToast('↺ Prompt reset to default', 'reset');
  }

  function showToast(msg, type) {
    const t = document.getElementById('statusToast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'status-toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ── Delegated dispatchers ──
  //
  // Page-specific actions live behind data-action / data-input-action
  // attributes. The shared helper-handlers.js dispatcher won't fire
  // for these because its ACTIONS table is keyed by the same attribute
  // — but its lookup only invokes registered names, so any unknown
  // name (like our prompt-* set below) is a no-op for it. We layer
  // a second listener here that ONLY recognizes the prompt-* names.
  const ACTIONS = {
    'prompt-reset-all': function() { resetAll(); },
    'prompt-save-all':  function() { saveAll();  },
    'prompt-reset':     function(el) {
      const key = el.dataset.promptKey;
      if (key) resetOne(key);
    }
  };

  const INPUT_ACTIONS = {
    'prompt-modified': function(el) {
      const key = el.dataset.promptKey;
      if (key) markModified(key);
    }
  };

  document.addEventListener('click', function(e) {
    let node = e.target;
    while (node && node !== document) {
      if (node.dataset && node.dataset.action) {
        const fn = ACTIONS[node.dataset.action];
        if (fn) fn(node, e);
        return;
      }
      node = node.parentNode;
    }
  });

  document.addEventListener('input', function(e) {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.inputAction) return;
    const fn = INPUT_ACTIONS[el.dataset.inputAction];
    if (fn) fn(el, e);
  });

  // ── Init on DOM ready ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPrompts);
  } else {
    loadPrompts();
  }
})();
