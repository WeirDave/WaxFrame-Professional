// ============================================================
//  WaxFrame — wf-debug.js
// Build: 20260614-041
//
//  Two-layer Troubleshooting + Deep Dive system (v3.28.0+).
//  Pulled out of app.js in v3.43.0 as part of the cross-cutting
//  cleanup pass.
//
//  Layer 1 — Troubleshooting Cards (always on):
//    When a known failure happens, surface a plain-English
//    Troubleshooting Card with title / what it means / what to do.
//    Driven by WF_ERROR_CATALOG (a list of matchers + entries) and
//    rendered by renderTroubleshootingCard().
//
//  Layer 2 — Deep Dive Mode (off by default, dev-toolbar toggle):
//    On every round, capture full technical detail (prompt sent,
//    raw response, status, elapsed ms, parse diagnostics) into a
//    ring buffer of the last 200 rounds for forensic inspection.
//
//  Both layers compose: when both on, a Troubleshooting Card's
//  "Show Technical Details" expand pulls from Deep Dive's richer
//  capture. When only Troubleshooting is on, the expand still
//  exists but pulls from lightweight per-failure context.
//
//  Public surface (referenced 42 times from app.js):
//    WF_DEBUG.deepDiveOn         — boolean state
//    WF_DEBUG.ringBuffer         — array of round captures
//    WF_DEBUG.lastFailure        — latest lightweight failure ctx
//    WF_DEBUG.setDeepDive(on)    — toggle Deep Dive
//    WF_DEBUG.log(msg, type)     — console.log + optional Live Console
//    WF_DEBUG.captureRound(e)    — push round to ring buffer
//    WF_DEBUG.captureFailure(c)  — store lightweight failure ctx
//    WF_DEBUG.classify(err, ctx) — return matching catalog entry
//    WF_DEBUG.showCard(entry, c) — render Troubleshooting Card
//    WF_ERROR_CATALOG            — array of error entries
//    WF_GENERIC_ENTRY            — fallback when no catalog match
//    renderTroubleshootingCard()
//    closeTroubleshootingCard()
//    toggleTcDetails()
//    tcCopyDetails()
//
//  Load order: AFTER version.js (uses APP_VERSION / BUILD at
//  runtime in captureFailure), BEFORE app.js (app.js has 42
//  references to WF_DEBUG, plus HTML onclick handlers reference
//  the render/copy/toggle functions).
//
//  External dependencies (live in app.js — wf-debug calls them
//  at runtime after both scripts have loaded):
//    consoleLog          — Live Console output
//    toast               — toast helper
//    copyToClipboard     — clipboard helper
//    _autoFireChainedRound, window._autoMode, window._autoChainDeferred
//                        — Auto-mode chain-resume hook in
//                          closeTroubleshootingCard
//
//  const WF_DEBUG, const WF_ERROR_CATALOG, const WF_GENERIC_ENTRY
//  are top-level const declarations. In classic scripts they create
//  bindings in the global lexical environment — accessible from
//  app.js as bare identifiers (NOT as window.WF_DEBUG). function
//  declarations auto-attach to window via standard hoisting.
// ============================================================

window.WF_DEBUG = {
  // ── State ──
  // v3.28.2: Troubleshooting Cards are always-on now. The "toggle" was a
  // mistake — better error messages are strictly better than worse ones,
  // there's no scenario a user wants the old terse-red-line behavior.
  // Deep Dive remains a real toggle since capture has a memory cost and
  // is genuinely a power-user feature.
  deepDiveOn:        localStorage.getItem('waxframe_deepdive') === '1',
  ringBuffer:        [],   // last N round captures when Deep Dive is on
  // v3.36.7 — Bumped from 10 to 200 so a multi-AI 10–20 round session fits
  // entirely in one buffer. At ~4 reviewers + 1 builder per round and 200
  // entries cap, the buffer holds ~40 rounds before rotation, well above
  // any realistic single-session ceiling. Forensic capture is the priority;
  // memory cost is bounded by the per-entry preview caps (500/1000 chars).
  RING_MAX:          200,
  lastFailure:       null, // lightweight context from most recent failure

  // ── Toggles ──
  setDeepDive(on) {
    this.deepDiveOn = !!on;
    localStorage.setItem('waxframe_deepdive', on ? '1' : '0');
    const btn = document.getElementById('wfDeepDiveToggle');
    if (btn) btn.classList.toggle('active', !!on);
    // v3.63.133 — Sync the Settings → Diagnostics checkbox too, so the dev
    // toolbar 🔬 button and the Settings toggle reflect the same state no
    // matter which surface the user flipped it from.
    const settingsToggle = document.getElementById('setDeepDive');
    if (settingsToggle) settingsToggle.checked = !!on;
    if (!on) this.ringBuffer = []; // clear capture when turning off
    if (typeof toast === 'function') toast(on ? '🔬 Deep Dive ON — capturing every round' : '🔬 Deep Dive OFF');
  },

  // ── Logging ──
  // Use for backstage detail that would be noise to normal users.
  // Always writes to console. Writes to Live Console only when Deep Dive is on.
  log(msg, type = 'info') {
    try { console[type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log']('[WF_DEBUG] ' + msg); } catch(e) {}
    if (this.deepDiveOn && typeof consoleLog === 'function') {
      consoleLog('🔬 ' + msg, type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'info');
    }
  },

  // ── Capture (Deep Dive only) ──
  captureRound(entry) {
    if (!this.deepDiveOn) return;
    const stamped = { ...entry, capturedAt: new Date().toISOString() };
    this.ringBuffer.push(stamped);
    if (this.ringBuffer.length > this.RING_MAX) this.ringBuffer.shift();
  },

  // ── Capture (Troubleshooting always-on lightweight) ──
  captureFailure(ctx) {
    this.lastFailure = {
      ...ctx,
      ts:        new Date().toISOString(),
      version:   (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown'),
      build:     (typeof BUILD !== 'undefined' ? BUILD : 'unknown'),
      deepDive:  this.deepDiveOn
    };
  },

  // ── Classify any error into a catalog entry ──
  // Single source of truth replacing the prior duplication across
  // callAPI / Test All Keys / Custom AI test / Import Server.
  classify(err, ctx = {}) {
    const msg = (err && err.message ? err.message : String(err || '')).toLowerCase();
    const status = ctx.status || (msg.match(/http (\d{3})/) || [])[1] || null;
    const isCustom = !!ctx.isCustomEndpoint;

    for (const entry of WF_ERROR_CATALOG) {
      try {
        if (entry.matches(err, ctx, msg, status, isCustom)) return entry;
      } catch(e) { /* matcher threw — skip */ }
    }
    return WF_GENERIC_ENTRY;
  },

  // ── Show a Troubleshooting Card ──
  // v3.28.2: always shows (no more troubleshootingOn gate). Better error
  // messages are strictly better than worse ones; there is no scenario a
  // user wants the old terse-red-line behavior, so no toggle is needed.
  showCard(entry, ctx = {}) {
    this.captureFailure({ code: entry.code, ...ctx });
    // v3.63.31 — Self-healing quarantine. If this failure means the model can
    // never run a WaxFrame round (rejects our instruction shape, or needs an
    // endpoint we don't speak), record the failing model id so it is excluded
    // from every future list + recommendation (api.js quarantineModel). The
    // provider usually names the model in the error ("models/<id>"); fall back
    // to the AI's configured model.
    if (entry && (entry.code === 'MODEL_REJECTS_INSTRUCTIONS' || entry.code === 'MODEL_NEEDS_DIFFERENT_ENDPOINT' || entry.code === 'MODEL_DEPRECATED')) {
      let bad = null;
      // v3.63.254 — Match Perplexity-style "'sonar-reasoning' model has been
      // deprecated" (single-quoted model id) in addition to the
      // Gemini-style "models/<id>" path. Either yields a quarantinable id.
      const mm = (ctx.message || '').match(/models\/([^\s"')]+)/i);
      if (mm) bad = mm[1];
      if (!bad) {
        const qm = (ctx.message || '').match(/['"]([^'"]+)['"]\s+(?:model\s+)?has been (?:deprecated|retired|sunset|decommissioned)/i);
        if (qm) bad = qm[1];
      }
      if (!bad && ctx.model) bad = ctx.model;
      if (!bad && typeof API_CONFIGS !== 'undefined' && ctx.provider && API_CONFIGS[ctx.provider]) bad = API_CONFIGS[ctx.provider].model;
      if (bad && typeof quarantineModel === 'function') quarantineModel(bad, entry.code);
      // v3.63.324 — Auto-pick a fresh model after quarantine. Pre-v3.63.324
      // the quarantine flagged the bad model id but cfg.model stayed
      // pointed at it (or at a sibling — e.g. Perplexity's whole
      // sonar-reasoning-* family deprecated overnight while cfg.model =
      // "sonar-reasoning-pro"). Clicking "Re-send {ai}'s prompt only"
      // then re-fired the same dead model and failed identically.
      // David's Chrome cookie round 2 caught this end-to-end. Now we
      // kick off recheckModelForAI in the background; by the time the
      // user reads the card and clicks Re-send (~few seconds), cfg.model
      // is on a working pick. recheckModelForAI's own toast announces
      // the swap so the user sees the model change. Fire-and-forget:
      // a recheck failure surfaces its own toast and leaves cfg.model
      // unchanged (next Re-send will fail with the same error, which is
      // honest — the provider truly has no working model for us).
      if (ctx.aiId && typeof window.recheckModelForAI === 'function') {
        window.recheckModelForAI(ctx.aiId, { keepExpanded: false, skipTiers: true })
          .catch(e => console.warn('[auto-rec after quarantine] failed:', e));
      }
    }
    // v3.63.252 — Bee-fatal card → block the auto-chain-resume hook in
    // closeTroubleshootingCard so dismissing the card alone can't trigger
    // a fresh round. Stays gated on _BEE_FATAL_CODES because for non-fatal
    // failures (transient network, etc.) we DO want the auto-chain hook
    // available if the user explicitly chooses to dismiss and continue.
    if (entry && WF_DEBUG._BEE_FATAL_CODES.has(entry.code)) {
      window._beeFatalCardActive = true;
    }
    // v3.63.311 — Halt the Builder for EVERY reviewer-phase failure, not
    // just bee-fatal ones. David: "we should be interrupting anytime we
    // get an interruption mid round or feedback directly back from a
    // reviewer and we should halt the ability for the builder to go so
    // that we can fix what the reviewer problem is and then try to rerun
    // that reviewer round again not full round but just for that specific
    // AI of course." Pre-v3.63.311 only MODEL_DEPRECATED, AUTH_FAILED,
    // MODEL_REJECTS_INSTRUCTIONS, MODEL_NEEDS_DIFFERENT_ENDPOINT, and
    // CONTENT_FILTERED halted; NETWORK_ERROR, EMPTY_RESPONSE,
    // RATE_LIMITED, CORS_BLOCKED, CREDIT_LOW, PROVIDER_DOWN let the
    // Builder run against a degraded reviewer set — exactly the Together
    // AI round 20 scenario that lost the round's reviewer chair.
    //
    // Warning codes (SLOW_RESPONDER, IMPORT_WARNINGS, MODELS_ENDPOINT_*,
    // LICENSE_*) DO NOT halt — those fire outside the round path or
    // describe a non-blocking condition. The _HALT_EXEMPT_CODES set
    // explicitly enumerates them so adding new failure codes downstream
    // automatically inherits the halt-before-Builder behavior.
    const _isHaltExempt = entry && WF_DEBUG._HALT_EXEMPT_CODES.has(entry.code);
    if (entry && !_isHaltExempt) {
      window._beeFatalInRound = true;   // legacy flag name; semantically now "halt this round"
      if (window._partialRound && ctx.aiId) {
        if (!Array.isArray(window._partialRound.failedAIIds)) {
          window._partialRound.failedAIIds = [];
        }
        if (!window._partialRound.failedAIIds.includes(ctx.aiId)) {
          window._partialRound.failedAIIds.push(ctx.aiId);
        }
      }
      if (window._autoMode) {
        window._autoMode = false;
        window._autoChainDeferred = null;
        window._autoCeilingTarget = null;
        window._autoSatisfiedHist = [];
        window._autoFailureStreak = 0;
        if (typeof updateAutoToggleUI === 'function') updateAutoToggleUI();
        if (typeof consoleLog === 'function') {
          consoleLog(`🤖 Auto Mode cancelled — ${ctx.aiName || 'a bee'} failed mid-round; halt before Builder so you can decide`, 'warn');
        }
        if (typeof toast === 'function') {
          toast(`🤖 Auto Mode off — fix ${ctx.aiName || 'the bee'} and pick a recovery option`, 5000);
        }
      }
    }
    if (typeof renderTroubleshootingCard === 'function') {
      renderTroubleshootingCard(entry, ctx);
    }
  },

  // v3.63.311 — Codes that should NOT trigger the halt-before-Builder
  // behavior. Warnings (slow responder, import warnings) describe a
  // non-blocking condition; license/models-endpoint errors fire outside
  // the round path (Worker Bees screen, hive import flow). Everything
  // else gets the halt by default so the user can fix the failure
  // surgically before the Builder spends money on a degraded reviewer
  // set. See showCard above for the gate.
  _HALT_EXEMPT_CODES: new Set([
    'SLOW_RESPONDER',
    'IMPORT_WARNINGS',
    'MODELS_ENDPOINT_AUTH',
    'MODELS_ENDPOINT_PATH_NOT_FOUND',
    'MODELS_ENDPOINT_SERVER_ERROR',
    'MODELS_ENDPOINT_NO_MODELS',
    'LICENSE_VERIFY_FAILED',
    'LICENSE_INVALID',
    'NO_MODELS'
  ]),

  // v3.63.252 — Codes where the failure is rooted at one specific bee
  // (its model, its key, its content filter) and the round can only succeed
  // by either fixing that bee or finishing without it. Used for model
  // quarantine + _beeFatalCardActive (auto-chain-resume hook in
  // closeTroubleshootingCard). The halt-before-Builder behavior moved off
  // this set in v3.63.311 — see _HALT_EXEMPT_CODES above.
  _BEE_FATAL_CODES: new Set([
    'MODEL_NEEDS_DIFFERENT_ENDPOINT',
    'MODEL_REJECTS_INSTRUCTIONS',
    'MODEL_DEPRECATED',
    'AUTH_FAILED',
    'CREDIT_LOW'
  ]),

  // ════════════════════════════════════════════════════════════
  // v3.63.139 — "Bundle for Scout" replaces the Deep Dive Viewer.
  // ────────────────────────────────────────────────────────────
  // Prior versions exposed a 6-action viewer modal (View Captures:
  // seed sample / copy / save DeepDive / save Checkpoint / clear /
  // refresh + a separate Tiers viewer modal with another 4 actions).
  // David's actual workflow was always: capture → save DeepDive →
  // clear buffer → send the files to Scout for analysis. The viewing
  // surface was friction nobody used.
  //
  // bundleForScout collapses that whole flow into one click that
  // downloads ONE JSON file containing everything Scout needs:
  //   • Deep Dive ring buffer (per-round captures)
  //   • Tier classifications (per-provider cache from the Hive
  //     Profiles classifier)
  //   • Project checkpoint (LS_PROJECT, LS_HIVE, LS_SESSION, the same
  //     state backupSession produces — included inline rather than
  //     pulled from a separate download)
  //   • Version + build metadata
  // Filename: {project}-r{rounds}-{stamp}-ScoutBundle.json
  //
  // clearBundle wipes the ring buffer (per-round captures from the
  // prior project) so the next run starts clean. Tier classifications
  // are deliberately preserved — they're per-provider, not per-
  // project, and a wipe between projects would force a fresh
  // classifier call every run.
  // ════════════════════════════════════════════════════════════
  async bundleForScout() {
    const _ad = new Date();
    const _pad = n => String(n).padStart(2, '0');
    const _stamp = `${_ad.getFullYear()}${_pad(_ad.getMonth()+1)}${_pad(_ad.getDate())}-${_pad(_ad.getHours())}${_pad(_ad.getMinutes())}`;
    const baseName = (typeof buildExportName === 'function')
      ? (buildExportName() || 'WaxFrame')
      : 'WaxFrame';
    const totalRoundsForName = Math.max(0, (typeof round !== 'undefined' ? round : 1) - 1);

    // v3.63.140 — Walk every keyed provider (defaults + customs) for tier
    // cache, not just DEFAULT_AIS. v3.63.139 missed custom AIs entirely
    // because the runner only iterated defaults; this read needs to mirror
    // that fix so a Bundle for Scout captures every classification that
    // exists.
    let tierCache = {};
    try {
      const seen = new Set();
      const collect = (provider) => {
        if (!provider || seen.has(provider)) return;
        seen.add(provider);
        const raw = localStorage.getItem(`waxframe_tiers_${provider}`);
        if (raw) {
          try { tierCache[provider] = JSON.parse(raw); } catch (e) { /* skip malformed */ }
        }
      };
      if (typeof aiList !== 'undefined' && Array.isArray(aiList)) {
        for (const a of aiList) collect(a.provider);
      }
      if (typeof DEFAULT_AIS !== 'undefined' && Array.isArray(DEFAULT_AIS)) {
        for (const a of DEFAULT_AIS) collect(a.provider);
      }
    } catch (e) { /* defensive — tier cache is optional */ }

    // v3.63.140 — Capture the last classification error map so Scout has
    // diagnostic info on providers that failed silently (Mistral and
    // Perplexity in the v3.63.139 test run).
    let tierErrors = null;
    try {
      if (typeof window !== 'undefined' && window._lastTierClassificationErrors) {
        tierErrors = window._lastTierClassificationErrors;
      }
    } catch (e) { /* defensive */ }

    // v3.63.140 — Sanitize the checkpoint snapshot. The prior version
    // dumped LS_HIVE verbatim, which includes the user's plaintext API
    // keys. Strip them before serialization and leave a marker so the
    // analyst can see the keys existed but were redacted.
    const _redactKeysIn = (raw) => {
      if (!raw) return raw;
      try {
        const obj = JSON.parse(raw);
        if (obj && obj.keys && typeof obj.keys === 'object') {
          const n = Object.keys(obj.keys).length;
          obj.keys = `[REDACTED — ${n} key${n === 1 ? '' : 's'} stripped from bundle export]`;
        }
        if (obj && obj.customAIConfigs && typeof obj.customAIConfigs === 'object') {
          for (const id of Object.keys(obj.customAIConfigs)) {
            const cfg = obj.customAIConfigs[id];
            if (cfg && typeof cfg === 'object' && '_key' in cfg) cfg._key = '[REDACTED]';
          }
        }
        return JSON.stringify(obj);
      } catch (e) {
        return '[parse failed — block omitted for safety]';
      }
    };
    // v3.63.286 — LS_SESSION was a stale read of `waxframe_v2_session_mirror`,
    // a key retired in v3.21.12. Every Scout bundle since then shipped an empty
    // session block while the real state sat in IndexedDB. Pull it from IDB
    // (the SoT per storage.js) and rename the field so the schema reflects
    // where it actually comes from.
    let checkpoint = null;
    let idbSession = null;
    try {
      if (typeof idbGet === 'function') idbSession = await idbGet();
    } catch (e) { /* defensive — IDB read failure leaves IDB_SESSION null */ }
    try {
      checkpoint = {
        LS_PROJECT:  localStorage.getItem('waxframe_v2_project'),
        LS_HIVE:     _redactKeysIn(localStorage.getItem('waxframe_v2_hive')),
        IDB_SESSION: idbSession
      };
    } catch (e) { /* defensive */ }

    const envelope = {
      _waxframe_scout_bundle:  true,
      _waxframe_app_version:   typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
      _waxframe_build:         typeof BUILD       !== 'undefined' ? BUILD       : 'unknown',
      _waxframe_captured_at:   new Date().toISOString(),
      _waxframe_ring_max:      this.RING_MAX,
      _waxframe_ring_count:    this.ringBuffer.length,
      _waxframe_tier_count:    Object.keys(tierCache).length,
      _waxframe_keys_redacted: true,
      ringBuffer:              this.ringBuffer,
      tierClassifications:     tierCache,
      tierClassificationErrors: tierErrors,
      checkpoint:              checkpoint
    };

    const filename = `${baseName}-r${totalRoundsForName}-${_stamp}-ScoutBundle.json`;
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    const parts = [];
    if (this.ringBuffer.length) parts.push(`${this.ringBuffer.length} round capture${this.ringBuffer.length === 1 ? '' : 's'}`);
    if (Object.keys(tierCache).length) parts.push(`${Object.keys(tierCache).length} tier classification${Object.keys(tierCache).length === 1 ? '' : 's'}`);
    if (checkpoint && checkpoint.LS_PROJECT) parts.push('project checkpoint');
    const summary = parts.length ? parts.join(' + ') : 'metadata only';
    if (typeof toast === 'function') toast(`📦 Bundle saved — ${summary}`, 5000);
  },
  clearBundle() {
    if (this.ringBuffer.length === 0) {
      if (typeof toast === 'function') toast('Ring buffer is already empty');
      return;
    }
    const n = this.ringBuffer.length;
    this.ringBuffer = [];
    if (typeof toast === 'function') toast(`🗑 Cleared ${n} round capture${n === 1 ? '' : 's'} — tier classifications preserved`, 4000);
  },

  // ── Dev test triggers (v3.28.2) ──
  // testCard cycles through every catalog entry on each click so all
  // 14 card designs can be eyeballed without forcing real errors.
  _testCardIdx: 0,
  testCard() {
    const entry = WF_ERROR_CATALOG[this._testCardIdx % WF_ERROR_CATALOG.length];
    this._testCardIdx++;
    const ctx = {
      aiName:       'ChatGPT',
      provider:     'chatgpt',
      aiConsoleUrl: 'https://platform.openai.com/api-keys',
      isCustomEndpoint: false,
      status:       entry.code === 'AUTH_FAILED' ? 401 :
                    entry.code === 'RATE_LIMITED' ? 429 :
                    entry.code === 'ENDPOINT_NOT_FOUND' ? 404 :
                    entry.code === 'METHOD_NOT_ALLOWED' ? 405 :
                    entry.code === 'PROVIDER_DOWN' ? 503 :
                    entry.code === 'MODEL_NEEDS_DIFFERENT_ENDPOINT' ? 404 : null,
      message:      `Sample ${entry.code} message for preview`,
      raw:          JSON.stringify({ error: { code: entry.code, message: 'Sample preview payload — not a real error' } }, null, 2)
    };
    this.showCard(entry, ctx);
    if (typeof toast === 'function') toast(`Card ${this._testCardIdx} of ${WF_ERROR_CATALOG.length}: ${entry.code}`);
  },

  // v3.63.332 — Removed: testResendFlow (test trigger from v3.63.252 — the
  // dev-toolbar button it was wired to retired in v3.63.330, so the function
  // had no live caller) and classifyTiers (manual one-shot classifier wrapper
  // from v3.63.139 — every recheck now classifies natively, so the manual
  // button was duplicative noise; the dev-toolbar button retired here, the
  // wrapper deleted with it). Convention: every method on WF_DEBUG must be
  // reachable from at least one currently-rendered surface. If you retire
  // the surface, retire the method in the same commit.
};

// ── ERROR CATALOG ──
// Each entry: { code, matches(err, ctx, msgLower, status, isCustom), title, meaning, actions }
// actions are: { label, kind: 'link'|'retry'|'open-modal'|'copy', href?, handler? }
// Order matters — first match wins. Place specific matchers above generic ones.
window.WF_ERROR_CATALOG = [
  {
    code: 'CORS_BLOCKED',
    matches: (err, ctx, msg, status, isCustom) =>
      msg.includes('cors_blocked') ||
      (isCustom && (msg.includes('failed to fetch') || msg.includes('network')) && !status),
    title: '{ai} — Browser blocked the response (CORS)',
    meaning: 'Your custom endpoint did not whitelist this WaxFrame origin. The request reached the server, but the browser refused to read the response as a security measure. Most common with self-hosted endpoints (Open WebUI, Ollama, internal gateways).',
    actions: [
      { label: 'Read CORS troubleshooting', kind: 'link', href: 'api-details.html' },
      // v3.63.310 — Three-option recovery pattern from the bee-fatal cards
      // mirrored onto every non-fatal card too (David: "for basically all
      // these other errors we get we should also give an option to run the
      // round with that same AI again or change the model of that AI and
      // rerun the round … the other choice should be disable the AI for
      // the session"). resend-ai = surgical retry, fix-bee = model swap +
      // surgical retry, disable-ai = take this bee off the hive for the
      // session. Retry round stays as the last "just redo everything"
      // escape hatch.
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    // v3.63.254 — Provider explicitly says the saved model has been
    // deprecated / retired / sunset / decommissioned. The bee will keep
    // failing on every retry until the user picks a live model, so this is
    // bee-fatal — Auto cancels (via _BEE_FATAL_CODES in showCard), the
    // failing model id gets quarantined (via the showCard hook), and the
    // user gets the inline model picker + Resend-only action to recover
    // surgically. Surfaced by David's Perplexity sonar-reasoning run on
    // 2026-06-10 where the legacy classifier dropped this case into the
    // generic "Something went wrong" card with no resend path.
    //
    // Match BEFORE MODEL_NEEDS_DIFFERENT_ENDPOINT and ENDPOINT_NOT_FOUND
    // since some providers return 4xx with the deprecation body — the
    // status-only matchers below would otherwise mislabel.
    code: 'MODEL_DEPRECATED',
    matches: (err, ctx, msg) =>
      (msg.includes('deprecated') && (msg.includes('no longer') || msg.includes('model'))) ||
      msg.includes('has been retired') ||
      msg.includes('has been sunset') ||
      msg.includes('decommissioned') ||
      (msg.includes('no longer available') && msg.includes('model')) ||
      (msg.includes('no longer supported') && msg.includes('model')),
    title: '{ai} — Saved model has been deprecated by the provider',
    meaning: 'The provider says this model is no longer available — it has been deprecated, retired, sunset, or decommissioned. The bee will keep failing on this model on every round until you pick a live one. WaxFrame has automatically removed it from your future recommendations so it will not be suggested again. Pick a replacement from the dropdown (✨ marks the recommended Reviewer model), then click "Re-send {ai}\'s prompt only" to finalize this round without re-billing every other bee.',
    actions: [
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Open provider docs', kind: 'docs-link' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    // v3.28.1 — Must match BEFORE ENDPOINT_NOT_FOUND. OpenAI returns 404 with
    // body "This is not a chat model and thus not supported in the
    // v1/chat/completions endpoint" when a Responses-only model (e.g.
    // gpt-5.5-pro) gets sent to /v1/chat/completions. The status-only 404
    // matcher would otherwise misclassify this as "wrong URL".
    code: 'MODEL_NEEDS_DIFFERENT_ENDPOINT',
    matches: (err, ctx, msg) =>
      msg.includes('not a chat model') ||
      msg.includes('not supported in the v1/chat/completions') ||
      msg.includes('use v1/completions') ||
      msg.includes('use v1/responses'),
    title: '{ai} — This model needs a different endpoint',
    meaning: 'The provider rejected this model on the chat-completions endpoint because it requires a different API (e.g. OpenAI\'s pro and reasoning models like gpt-5.5-pro use /v1/responses, not /v1/chat/completions). Pick a different model — the ones WaxFrame can call directly are listed in the dropdown.',
    actions: [
      // v3.60.2 — was { kind: 'link', href: '#' } — a dead placeholder. Now
      // uses fix-bee which the renderer swaps for an inline model dropdown
      // when ctx.aiId/provider are available.
      { label: 'Pick a different model', kind: 'fix-bee' },
      // v3.63.252 — Single-AI retry. When a partial round is available, this
      // re-sends only THIS bee's prompt (instead of re-billing every other
      // bee via "Retry round"). Auto-hides when there's no partial round to
      // splice into. See retrySingleAIInPartialRound in app.js.
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    // v3.63.31 — A model that exists in the provider catalog but rejects
    // WaxFrame's developer/system-instruction shape (e.g. Gemini's
    // antigravity-preview-05-2026 -> "Developer instruction is not enabled
    // for models/..."). The round can never succeed on it, so same fix as
    // MODEL_NEEDS_DIFFERENT_ENDPOINT (pick a different model). showCard also
    // quarantines the failing model so it stops being listed/recommended.
    code: 'MODEL_REJECTS_INSTRUCTIONS',
    matches: (err, ctx, msg) =>
      msg.includes('developer instruction') ||
      msg.includes('instruction is not enabled') ||
      msg.includes('instructions are not enabled') ||
      msg.includes('does not support system instruction') ||
      msg.includes('system instruction is not'),
    title: '{ai} — This model won\'t accept WaxFrame\'s instructions',
    meaning: 'The provider rejected this model because it does not accept the developer/system instructions every WaxFrame prompt relies on (some preview and special-purpose models disable them). A round can never succeed on this model. Pick a different one from the dropdown — WaxFrame has automatically removed this model from your lists and recommendations so it will not be suggested again.',
    actions: [
      { label: 'Pick a different model', kind: 'fix-bee' },
      // v3.63.252 — see comment on MODEL_NEEDS_DIFFERENT_ENDPOINT above.
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'RATE_LIMITED',
    matches: (err, ctx, msg, status) =>
      status === '429' || ctx.status === 429 ||
      msg.includes('rate_limited') || msg.includes('rate limit') ||
      msg.includes('too many') || msg.includes('quota'),
    title: '{ai} — Rate limited by the provider',
    meaning: '{ai} says you are sending too many requests, or you have hit a usage quota. WaxFrame skipped {ai} for the round and continued with the others. The next round usually works after 30–60 seconds. Click Open provider console to check your usage dashboard or upgrade your plan; click Disable this AI for the session if the limit looks exhausted and you would rather keep going without {ai}. The console-link button auto-hides for custom AIs that did not have an API console URL configured at Add Custom AI time.',
    actions: [
      { label: 'Open provider console', kind: 'console-link' },
      { label: 'Open provider docs', kind: 'docs-link' },
      // v3.63.310 — Three-option recovery pattern (see CORS_BLOCKED header).
      // A smaller / cheaper model on the same provider sometimes lands a
      // separate rate-limit bucket, so fix-bee is genuinely useful even
      // though provider == provider.
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    // v3.35.4 — Bug A fix. Provider returned an HTTP 400/402 with a
    // body indicating the account is out of credits / billing has
    // failed / balance is too low. Anthropic's specific error string
    // is "Your credit balance is too low to access the Anthropic
    // API. Please go to Plans & Billing to upgrade or purchase
    // credits." Other providers use similar phrasing — match the
    // common substrings rather than exact text. Placed BEFORE
    // AUTH_FAILED so a 400 with "credit"-flavored body doesn't
    // misclassify as 401 auth (Anthropic returns 400 for billing
    // failures, not 401 — a quirk we have to handle here). The
    // console-link action uses ctx.aiConsoleUrl which routes to the
    // provider's API console (most providers' billing pages live one
    // click away from the API console).
    code: 'CREDIT_LOW',
    matches: (err, ctx, msg, status) => {
      const s = parseInt(status, 10);
      const matchesStatus = s === 400 || s === 402 || ctx.status === 400 || ctx.status === 402;
      const matchesBody =
        msg.includes('credit balance is too low') ||
        msg.includes('insufficient credit') ||
        msg.includes('insufficient balance') ||
        msg.includes('insufficient_quota') ||
        msg.includes('out of credits') ||
        msg.includes('plans & billing') ||
        msg.includes('billing failed') ||
        msg.includes('payment required') ||
        msg.includes('upgrade or purchase credits');
      return matchesStatus && matchesBody;
    },
    title: '{ai} — Account is out of credits',
    meaning: '{ai} rejected the request because your account balance with this provider is too low or billing has failed. WaxFrame skipped {ai} for the round and continued with the others. Click the button below to open the {ai} provider console — most providers put their billing/credit-add page one click away from the API console.',
    actions: [
      { label: 'Open provider console', kind: 'console-link' },
      { label: 'Open provider docs', kind: 'docs-link' },
      // v3.63.310 — Three-option recovery pattern. A cheaper model on the
      // same provider may have less per-token cost and fit under whatever
      // tiny remaining balance is on the account.
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'AUTH_FAILED',
    matches: (err, ctx, msg, status) =>
      status === '401' || status === '403' || ctx.status === 401 || ctx.status === 403 ||
      msg.includes('unauthorized') || msg.includes('forbidden') ||
      msg.includes('invalid api key') || msg.includes('incorrect api key'),
    title: '{ai} — API key was rejected',
    meaning: '{ai} rejected the API key. Common causes: the key was deleted or rotated in the {ai} provider console, billing failed and the account is suspended, or the key was copied with extra whitespace. Re-test the key on Worker Bees → Test All Keys.',
    actions: [
      { label: 'Open provider console', kind: 'console-link' },
      { label: 'Open provider docs', kind: 'docs-link' },
      // v3.63.252 — Auth fix is bee-specific (rotate one key, not the whole
      // hive). Resend lets the user fix the key and re-fire just this bee's
      // prompt without re-billing every other bee via Retry round.
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'ENDPOINT_NOT_FOUND',
    matches: (err, ctx, msg, status) =>
      status === '404' || ctx.status === 404 ||
      msg.includes('endpoint not found'),
    title: '{ai} — Endpoint URL not found (404)',
    meaning: 'The server responded with 404 — the path you entered does not exist on this server. For chat: typically ends in /v1/chat/completions or /api/chat/completions. For models: typically /v1/models, /api/models, or /api/tags (Ollama).',
    actions: [
      { label: 'Read API endpoint guide', kind: 'link', href: 'api-details.html' }
    ]
  },
  {
    code: 'METHOD_NOT_ALLOWED',
    matches: (err, ctx, msg, status) =>
      status === '405' || ctx.status === 405,
    title: '{ai} — Method not allowed (405)',
    meaning: 'The server understands the URL but does not accept POST requests on it. Usually means the URL is wrong — you may have entered a docs page, a homepage, or a GET-only endpoint instead of the chat completions URL.',
    actions: [
      { label: 'Read API endpoint guide', kind: 'link', href: 'api-details.html' }
    ]
  },
  {
    code: 'PROVIDER_DOWN',
    matches: (err, ctx, msg, status) => {
      const s = parseInt(status, 10);
      return (s >= 500 && s < 600) || (ctx.status >= 500 && ctx.status < 600) ||
             msg.includes('service unavailable') || msg.includes('bad gateway');
    },
    title: '{ai} — Provider server error',
    meaning: '{ai} returned a 5xx error — this is on their side, not yours. Their API is having issues. WaxFrame skipped {ai} for the round. Check the provider status page if it persists.',
    actions: [
      // v3.63.310 — Three-option recovery pattern. A different model on
      // the same provider may route through a separate backend pool that's
      // still healthy while the failing one recovers.
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    // v3.63.63 — Match BEFORE the generic EMPTY_RESPONSE so users with a real
    // content-filter block get a specific, actionable diagnosis instead of
    // the generic "filter blocked OR truncated" text. Triggers when the empty
    // response is accompanied by a blockReason field in the raw provider
    // payload (Gemini's promptFeedback.blockReason; same shape works for any
    // future provider that surfaces blockReason verbatim).
    code: 'CONTENT_FILTERED',
    matches: (err, ctx, msg) => {
      if (!(msg === 'empty response' || (msg || '').includes('empty response'))) return false;
      try {
        const raw = ctx && ctx.raw;
        return typeof raw === 'string' && raw.includes('blockReason');
      } catch { return false; }
    },
    title: '{ai} — Content filter blocked this prompt ({blockReason})',
    meaning: "{ai}'s safety filter blocked the request (the provider returned 200 OK with no text and a blockReason of {blockReason}). This is often a false positive on words like 'crush', 'kill', 'broken', or 'fail' that appear innocuously in product reviews, technical writing, or troubleshooting docs — Gemini in particular is aggressive here. The simplest fix is to switch Builder to another provider (Claude, ChatGPT, Grok, Mistral); the rest of the hive can still include {ai} as a reviewer if you want. Alternatively, rephrase the reference material to use less filter-prone language.",
    actions: [
      { label: 'Change Builder', kind: 'open-modal', handler: 'openChangeBuilder' },
      // v3.63.310 — Three-option recovery pattern. Different models on
      // the same provider have different filter aggression (Gemini Pro
      // vs Flash, for example), so fix-bee is a real escape hatch here.
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' },
      { label: 'Retry round',    kind: 'retry' }
    ]
  },
  {
    code: 'EMPTY_RESPONSE',
    matches: (err, ctx, msg) => msg === 'empty response' || msg.includes('empty response'),
    title: '{ai} — Provider returned an empty response',
    meaning: '{ai} returned success (200 OK) but the response body had no text content. This usually means a content filter blocked the output, or the model output was truncated. Try a different Builder, or shorten the document.',
    actions: [
      // v3.63.310 — Three-option recovery pattern. David's surgical-retry
      // request originated from a Together AI empty-response round: "we
      // should provide an option where we try to run that particular round
      // again for that particular AI … or change the model … or disable
      // the AI for the session."
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'NETWORK_ERROR',
    matches: (err, ctx, msg, status, isCustom) =>
      !status && (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('networkerror')),
    title: '{ai} — Network error',
    meaning: 'WaxFrame could not reach the API. Common causes: no internet, DNS issue, VPN interfering, or the API hostname is unreachable from this network. If you are on an air-gapped or restricted network, you will need a model server (Alfredo, Ollama, Open WebUI) instead of the public providers.',
    actions: [
      // v3.63.310 — Three-option recovery pattern. Network hiccups are
      // the canonical surgical-retry case: one bee's request didn't
      // complete, every other bee returned text cleanly. Re-firing just
      // the one keeps the round at single-bee cost.
      { label: 'Pick a different model', kind: 'fix-bee' },
      { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'NO_MODELS',
    matches: (err, ctx, msg) => msg.includes('no models returned') || msg.includes('no chat-compatible models'),
    title: 'Server returned no usable models',
    meaning: 'The Models Endpoint responded but reported zero models — or only specialty models (embeddings, audio, image generation) that cannot do chat. For Ollama: pull a chat model first (ollama pull llama3.2). For Open WebUI: enable at least one chat model in admin settings.',
    actions: []
  },
  {
    code: 'BUILDER_NO_CONFLICTS_BLOCK',
    matches: (err, ctx) => ctx.kind === 'builder_missing_conflicts',
    title: 'Builder did not return the required formatting',
    meaning: 'The Builder produced output but did not include the %%CONFLICTS_START%% block WaxFrame needs to read the result. Some AIs ignore strict formatting instructions. Try retrying the round (often works the second time), or switch to a different Builder via Change Builder.',
    actions: [
      { label: 'Change Builder', kind: 'open-modal', handler: 'openChangeBuilder' },
      // v3.63.382 — Builder-only retry against cached reviews. Saves the
      // reviewer round-trip when only Builder synthesis was bad.
      { label: 'Retry Builder only', kind: 'retry-builder-cached' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    // v3.63.132 — Distinct from BUILDER_NO_CONFLICTS_BLOCK. Fired when the
    // last Builder API call returned finishReason='length' / 'MAX_TOKENS'
    // AND the response is missing the formatting block. Diagnosis is
    // structural (output cap, not instruction-following), so the suggested
    // fix points at model capacity rather than retrying with the same
    // model. Some families (Jamba 1.5/1.6/1.7 with hard 4096-token output
    // cap) cannot be used as Builder regardless of setting — those are
    // also filtered from Builder recommendations and badged
    // ⚠️ Reviewer-only in the Change Builder model dropdown.
    code: 'BUILDER_TRUNCATED',
    matches: (err, ctx) => ctx.kind === 'builder_truncated',
    title: 'Builder output was cut off mid-response (token cap)',
    meaning: 'The Builder hit its API\'s max-output-tokens cap before finishing the %%CONFLICTS_START%% formatting block WaxFrame needs. This is a model capacity limit, not bad instruction-following — retrying with the same model will get truncated again. Switch to a Builder with a higher output cap (Claude / GPT / Gemini Pro all support 8K+; DeepSeek and Mistral Large work too). Some families have a hard cap that can\'t be raised — notably AI21\'s Jamba (capped at 4096 across 1.5 / 1.6 / 1.7), which is structurally incompatible with the Builder role no matter how you configure it. Jamba still works fine as a Reviewer.',
    actions: [
      { label: 'Change Builder', kind: 'open-modal', handler: 'openChangeBuilder' },
      // v3.63.382 — Builder-only retry against cached reviews. Only useful
      // after a Builder swap (same model would just truncate again), but
      // letting the user retry just the Builder costs no reviewer tokens.
      { label: 'Retry Builder only', kind: 'retry-builder-cached' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'BUILDER_BLOAT',
    matches: (err, ctx) => ctx.kind === 'builder_bloat',
    title: 'Builder output exceeded the length limit',
    meaning: 'The Builder produced a document longer than the length cap you set on the Project screen. Your document was not changed and the round was not saved. You can retry (the next attempt may comply), switch to a different Builder, or raise the length cap on the Project screen.',
    actions: [
      { label: 'Change Builder', kind: 'open-modal', handler: 'openChangeBuilder' },
      // v3.63.382 — Builder-only retry against cached reviews. The Builder's
      // output is non-deterministic at typical temperatures, so a fresh
      // attempt against the same input may comply — and it costs no
      // reviewer tokens.
      { label: 'Retry Builder only', kind: 'retry-builder-cached' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'BUILDER_DELIMITERS',
    matches: (err, ctx) => ctx.kind === 'builder_delimiters',
    title: 'Builder formatting was malformed',
    meaning: 'The Builder included the formatting block markers but they did not parse cleanly. The AI may have escaped or modified the markers. Retry the round or switch to a different Builder.',
    actions: [
      { label: 'Change Builder', kind: 'open-modal', handler: 'openChangeBuilder' },
      // v3.63.382 — Builder-only retry against cached reviews. Delimiter
      // mis-formatting is usually a one-off model glitch; a fresh Builder
      // call against the same reviews often parses cleanly. No reviewer
      // tokens are spent.
      { label: 'Retry Builder only', kind: 'retry-builder-cached' },
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'LICENSE_VERIFY_FAILED',
    matches: (err, ctx) => ctx.kind === 'license_verify_failed',
    title: 'Could not verify license',
    meaning: 'WaxFrame could not reach Gumroad to verify your license key. If you are on a restricted network, you need to be online once to activate. Already-activated keys continue to work offline.',
    actions: []
  },
  {
    code: 'LICENSE_INVALID',
    matches: (err, ctx) => ctx.kind === 'license_invalid',
    title: 'License key not valid',
    meaning: 'Gumroad reported this key is not valid. Common causes: typo, key was for a different product, or the key was disabled. Copy the key directly from your Gumroad receipt to avoid hidden whitespace.',
    actions: []
  },
  // v3.29.0 — manually fired by the post-round timing analyzer when an AI
  // takes >2x the round average AND >avg+15s. Never auto-classified from an
  // error (matches() returns false). Title/meaning support {ai}/{elapsed}/{avg}
  // placeholders templated from ctx.
  {
    code: 'SLOW_RESPONDER',
    matches: () => false,
    title:   'Slow responder: {ai}',
    meaning: '{ai} took {elapsed}s on this round vs the round average of {avg}s. Toggle it off to speed up rounds without losing accuracy — your other AIs already cover the work.',
    actions: [
      { label: 'Toggle off this AI', kind: 'disable-ai' },
      { label: 'Keep it on',         kind: 'dismiss' },
      { label: "Don't alert me this session", kind: 'silence-slow' }
    ]
  },
  // v3.29.1 — Import Server (model list) entries. All gate on
  // ctx.kind === 'models_endpoint' so they never fire from the round flow,
  // Custom AI test, or Test All Keys. Used by fetchImportServerModels to
  // unify HTTP classification (Audit Finding 1, site 3 of 3).
  {
    code: 'MODELS_ENDPOINT_AUTH',
    matches: (err, ctx) => ctx.kind === 'models_endpoint' && (ctx.status === 401 || ctx.status === 403),
    title:   'Models endpoint authentication failed',
    meaning: 'The server rejected the request to list models as unauthenticated or forbidden. Check the API Key field is correct and confirm with your IT team that your key has access to the models endpoint on this server.',
    actions: []
  },
  {
    code: 'MODELS_ENDPOINT_PATH_NOT_FOUND',
    matches: (err, ctx) => ctx.kind === 'models_endpoint' && ctx.status === 404,
    title:   'Models endpoint path not found',
    meaning: 'The Models Endpoint URL returned 404 — the path is probably wrong for this server type. Open WebUI uses /api/models, Ollama uses /api/tags, LM Studio uses /v1/models. Confirm the URL matches your server.',
    actions: []
  },
  {
    code: 'MODELS_ENDPOINT_SERVER_ERROR',
    matches: (err, ctx) => ctx.kind === 'models_endpoint' && ctx.status >= 500 && ctx.status < 600,
    title:   'Server error from models endpoint',
    meaning: 'The server returned a 5xx error. The platform itself is having trouble — try again in a moment, or check server status with whoever runs the server.',
    actions: []
  },
  {
    code: 'MODELS_ENDPOINT_NO_MODELS',
    matches: (err, ctx) => ctx.kind === 'models_endpoint' && ctx.status === 'no_models',
    title:   'No models in response',
    meaning: 'The request succeeded but the response did not contain a recognizable list of models. Make sure the URL points to the models-list endpoint (e.g. /api/models for Open WebUI), not the chat endpoint.',
    actions: []
  },
  // v3.29.2 — manually fired by file import handlers when one or more
  // parse-time warnings were collected during PDF/DOCX/PPTX/XLSX
  // extraction. Never auto-classified. Title supports {filename}, meaning
  // supports {warnings} placeholder which gets rendered as a bulleted list.
  {
    code: 'IMPORT_WARNINGS',
    matches: () => false,
    title:   'Imported with warnings: {filename}',
    meaning: 'The main document text imported normally, but some parts of the file could not be fully parsed:\n\n{warnings}\n\nIf any of those parts contained content you need, re-uploading or saving the file in a different format may help.',
    // v3.59.0 — redundant 'OK' (it only dismissed, same as the built-in
    // Dismiss footer) replaced with a real action: open the side-by-side
    // verify/edit panel so the user can check the import against the original
    // and fix any transcription errors. The built-in Dismiss remains as close.
    actions: [
      { label: '🔍 Verify / edit text', kind: 'open-modal', handler: 'openVerifyPanelFromImport' }
    ]
  }
];

const WF_GENERIC_ENTRY = {
  code: 'UNKNOWN_ERROR',
  title: 'Something went wrong',
  meaning: 'WaxFrame ran into an error it does not have a specific explanation for. The technical details below may help diagnose. Use "Report on GitHub" to send them — it opens a pre-filled issue.',
  actions: [
    // v3.63.254 — Resend slot for unmatched bee errors. Auto-hides via the
    // resend-ai renderer guard when window._partialRound or ctx.aiId is
    // missing, so it stays invisible on non-bee errors and shows up as a
    // real out when a bee-attributable error slips through the matcher
    // grid (e.g. a future provider's not-yet-cataloged deprecation phrase).
    { label: 'Re-send {ai}\'s prompt only', kind: 'resend-ai' },
    { label: 'Retry round', kind: 'retry' },
    { label: '🛠 Fix Worker Bee', kind: 'fix-bee' },
    { label: '🌐 Open provider site', kind: 'console-link' },
    { label: '🐙 Report on GitHub', kind: 'github-issue' }
  ]
};

// ── Render a Troubleshooting Card ──
// Uses the troubleshootingCard modal in index.html.
function renderTroubleshootingCard(entry, ctx) {
  const modal = document.getElementById('troubleshootingCard');
  if (!modal) return;
  const titleEl  = document.getElementById('tcTitle');
  const meaningEl= document.getElementById('tcMeaning');
  const actionsEl= document.getElementById('tcActions');
  const detailsEl= document.getElementById('tcDetails');

  // v3.29.0 — placeholder substitution for ctx-derived fields like {ai},
  // {elapsed}, {avg}. Catalog entries opt in by including the placeholders
  // in their title/meaning strings; entries without placeholders pass through
  // unchanged (replace is a no-op when no match).
  // v3.29.2 — added {filename} and {warnings} for the IMPORT_WARNINGS card.
  // {warnings} expects ctx.warnings as an array of strings; renders as a
  // bulleted list so multi-line meaning content stays readable.
  // v3.63.63 — added {blockReason} for the CONTENT_FILTERED card. Parses
  // Gemini-style promptFeedback.blockReason out of ctx.raw (JSON string)
  // best-effort; falls back to the literal string "unknown" if not found.
  const fmtWarnings = (arr) => Array.isArray(arr) && arr.length
    ? arr.map(w => '• ' + w).join('\n')
    : '';
  const parseBlockReason = (raw) => {
    if (typeof raw !== 'string' || !raw) return 'unknown';
    // Cheap regex first — avoids JSON.parse cost when the field isn't present.
    const m = raw.match(/"blockReason"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
    // Fallback: parse + walk (handles nested structures other providers may use).
    try {
      const j = JSON.parse(raw);
      if (j && j.promptFeedback && typeof j.promptFeedback.blockReason === 'string') {
        return j.promptFeedback.blockReason;
      }
    } catch { /* not JSON — fine */ }
    return 'unknown';
  };
  const subst = (s) => String(s || '')
    .replace(/\{ai\}/g,          ctx.aiName   ?? 'AI')
    .replace(/\{elapsed\}/g,     ctx.elapsed  ?? '?')
    .replace(/\{avg\}/g,         ctx.avg      ?? '?')
    .replace(/\{filename\}/g,    ctx.filename ?? 'this file')
    .replace(/\{warnings\}/g,    fmtWarnings(ctx.warnings))
    .replace(/\{blockReason\}/g, parseBlockReason(ctx.raw));

  if (titleEl)   titleEl.textContent   = subst(entry.title) || 'Something went wrong';
  if (meaningEl) meaningEl.textContent = subst(entry.meaning) || '';

  // v3.51.0 — Surface the actual provider error message inline.
  // Was buried in the "Show technical details" expand, which meant users had
  // to discover the real diagnosis (e.g. Gemini's "monthly spending cap
  // exceeded, go to ai.studio/spend to manage your project spend cap") only
  // by clicking expand. Now rendered between meaning and actions, with the
  // RATE_LIMITED:/AUTH_FAILED:/etc. prefix stripped so only the readable
  // provider text appears. URLs are auto-linkified so users can click
  // straight through. Hidden when ctx.message is empty.
  const providerWrap = document.getElementById('tcProviderMessage');
  const providerText = document.getElementById('tcProviderMessageText');
  if (providerWrap && providerText) {
    const raw = (ctx.message || '').trim();
    // Strip leading classification prefix like "RATE_LIMITED:" or "AUTH_FAILED:"
    const stripped = raw.replace(/^[A-Z_]+:\s*/, '').trim();
    if (stripped) {
      // v3.63.276 — Full HTML-attribute-safe escape (was `& < >` only). The
      // URL regex below permits `"` inside its match (the [^\s<] character
      // class doesn't exclude quotes), and an attacker-controlled provider
      // error like `see https://x.com" onerror="fetch(...)` would otherwise
      // break out of the href attribute. Escaping `"` and `'` at the source
      // closes that path even if the link-builder regex misbehaves.
      const escaped = stripped
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      // Linkify URLs so users can click straight to the fix. Trailing
      // sentence punctuation (period, comma, semicolon, etc.) is not
      // part of the URL — split it off so the visible link doesn't end
      // with a stray period when the URL appears at the end of a sentence.
      // After escape, the URL text never contains `"` or `<`, so the regex
      // matches a quote-safe substring and the href interpolation is safe.
      const linkified = escaped.replace(/(https?:\/\/[^\s<"]+)/g, (m) => {
        const tailMatch = m.match(/[.,;!?)]+$/);
        const url       = tailMatch ? m.slice(0, -tailMatch[0].length) : m;
        const tail      = tailMatch ? tailMatch[0] : '';
        return `<a href="${url}" target="_blank" rel="noopener">${url}</a>${tail}`;
      });
      providerText.innerHTML = linkified;
      providerWrap.classList.remove('is-hidden');
    } else {
      providerWrap.classList.add('is-hidden');
    }
  }

  // Actions
  if (actionsEl) {
    actionsEl.innerHTML = '';

    // v3.60.2 — Inline model picker for model-related errors. When the card
    // has a fix-bee action AND we have enough ctx to build a dropdown
    // (aiId + provider + the buildModelSelector helper + a populated
    // API_CONFIGS entry), render the dropdown INSTEAD of the navigate-to-
    // setup "Fix Worker Bee" button. Picking a model saves immediately via
    // saveModelForAI (which toasts confirmation); the user then clicks Retry
    // round from this same card to re-run with the new model. No screen
    // navigation, no second round needed to discover the fix worked. The
    // legacy fix-bee button is suppressed when the dropdown is shown — the
    // dropdown is the surgical replacement. Falls back gracefully to the
    // button when ctx is missing (e.g. cards fired without per-AI context).
    const hasFixBee = (entry.actions || []).some(a => a.kind === 'fix-bee');
    const canShowModelPicker =
      hasFixBee &&
      ctx?.aiId && ctx?.provider &&
      typeof buildModelSelector === 'function' &&
      typeof API_CONFIGS !== 'undefined' &&
      API_CONFIGS[ctx.provider];

    if (canShowModelPicker) {
      // v3.60.4 — Render the picker as a self-contained block we can rebuild
      // in place after a Recommend-Models pass. The Recommend button below
      // is OUR button, not buildModelSelector's built-in one, because the
      // built-in updates by document.getElementById('modelsel-${aiId}') and
      // there's a guaranteed ID collision with the bee card's dropdown on
      // the (hidden) setup screen — getElementById returns the FIRST match,
      // i.e. the offscreen bee dropdown, so the built-in button would
      // silently update the wrong element. Our button calls recheckModelForAI
      // (which updates the recommendation CACHE — the source of truth) and
      // then re-renders this card's picker from cache, sidestepping the DOM
      // collision entirely.
      const renderPicker = () => {
        // Read currentModel FRESH on each render so post-recheck re-renders
        // pick up any saved-model change (and so the dropdown's selected
        // option always reflects the live API_CONFIGS state).
        const currentModel = (API_CONFIGS[ctx.provider] && API_CONFIGS[ctx.provider].model) || '';
        const html = buildModelSelector(ctx.aiId, ctx.provider, currentModel, false);
        if (!html) return;

        // Replace any prior render in place (so a recheck re-render swaps
        // cleanly without duplicating the block).
        const prior = actionsEl.querySelector('.tc-model-picker');
        if (prior) prior.remove();

        const wrap = document.createElement('div');
        wrap.className = 'tc-model-picker';

        const label = document.createElement('div');
        label.className = 'tc-model-picker-label';
        label.textContent = 'Pick a different model for ' + (ctx.aiName || 'this AI') + ':';

        // Tip line — explains what the user is looking at and what the
        // Recommend button below will do. Visible whether or not
        // recommendations already exist; the message adapts.
        const tip = document.createElement('div');
        tip.className = 'tc-model-picker-tip';
        const reviewerCached = (typeof getReviewerRecommendation === 'function')
          ? getReviewerRecommendation(ctx.aiId) : null;
        const builderCached  = (typeof getBuilderRecommendation === 'function')
          ? getBuilderRecommendation(ctx.aiId)  : null;
        const hasAnyRec = !!(reviewerCached?.model || builderCached?.model);
        if (!hasAnyRec) {
          tip.textContent = 'No recommendations cached yet — click Recommend Models below to have ' + (ctx.aiName || 'this AI') + ' mark its best ✨ Reviewer and 🔨 Builder picks in the dropdown.';
        } else {
          tip.textContent = 'Dropdown shows ✨ for the recommended Reviewer model and 🔨 for the recommended Builder model. Re-run Recommend Models if the lineup has changed.';
        }

        const dd = document.createElement('div');
        dd.className = 'tc-model-picker-select';
        dd.innerHTML = html;

        const recBtn = document.createElement('button');
        recBtn.type = 'button';
        recBtn.className = 'tc-model-picker-recommend';
        recBtn.textContent = 'Recommend Models';
        recBtn.onclick = async () => {
          recBtn.disabled = true;
          // v3.63.30 — climbing-seconds counter ("Recommending… 8s"), mirroring
          // the Worker Bees per-AI Recommend Models button. wfBtnElapsed is a
          // global from app.js (loaded after this file, but resolved here at
          // click time). Guarded so a missing helper degrades to the old static
          // label rather than throwing. Stopped in finally before renderPicker
          // rebuilds this button.
          let _stopTick;
          if (typeof wfBtnElapsed === 'function') {
            _stopTick = wfBtnElapsed(recBtn, () => 'Recommending…');
          } else {
            recBtn.textContent = 'Recommending…';
            _stopTick = () => {};
          }
          try {
            if (typeof recheckModelForAI === 'function') {
              await recheckModelForAI(ctx.aiId);
            }
          } catch (e) {
            // Swallow — re-render below will surface whatever state we end
            // up in (markers present or absent), and recheckModelForAI does
            // its own user-facing toasts/console logging on failure.
          } finally {
            _stopTick();
          }
          renderPicker();
        };

        wrap.appendChild(label);
        wrap.appendChild(tip);
        wrap.appendChild(dd);
        wrap.appendChild(recBtn);
        actionsEl.insertBefore(wrap, actionsEl.firstChild);
      };
      renderPicker();
    }

    (entry.actions || []).forEach(a => {
      // v3.60.2 — fix-bee button is suppressed when the inline dropdown
      // above already covers the same need. Keeps a single, surgical
      // affordance on the card instead of two ways to do the same thing.
      if (a.kind === 'fix-bee' && canShowModelPicker) return;
      // v3.63.252 — resend-ai only renders when we have a partial round to
      // splice into AND a specific aiId in context. No partial round → the
      // round either never started or already cleanly finished, so a
      // "re-send this bee only" action has nothing to operate on.
      if (a.kind === 'resend-ai' && (!window._partialRound || !ctx?.aiId)) return;
      const btn = document.createElement('button');
      btn.className = 'tc-action-btn';
      // v3.63.252 — action labels honor the same {ai} substitution as title/
      // meaning. Backwards-compatible: actions without placeholders pass through.
      btn.textContent = subst(a.label);
      if (a.kind === 'link' && a.href) {
        // v3.52.8 — noopener feature added (audit follow-up)
        btn.onclick = () => { window.open(a.href, '_blank', 'noopener,noreferrer'); };
      } else if (a.kind === 'console-link') {
        // v3.63.96 — URL split. For RATE_LIMITED cards, prefer the provider's
        // usage/limits page over its API-key page — the user landing here
        // needs to check quotas or upgrade their plan, not rotate a key. Falls
        // back to ctx.aiConsoleUrl when no usage URL is registered for the
        // provider (custom AIs without a known provider mapping, etc.).
        let url = ctx?.aiConsoleUrl || null;
        if (entry?.code === 'RATE_LIMITED' && ctx?.provider && window.API_USAGE_URLS) {
          const usageUrl = window.API_USAGE_URLS[ctx.provider];
          if (usageUrl) url = usageUrl;
        }
        if (!url) { btn.style.display = 'none'; }
        else      { btn.onclick = () => window.open(url, '_blank', 'noopener,noreferrer'); }
      } else if (a.kind === 'docs-link') {
        // v3.56.6 — provider documentation link; reads ctx.aiDocsUrl
        // (ai.apiDocs). Auto-hides when the AI has no docs URL on file,
        // same graceful behavior as the console-link button.
        const url = ctx?.aiDocsUrl || null;
        if (!url) { btn.style.display = 'none'; }
        else      { btn.onclick = () => window.open(url, '_blank', 'noopener,noreferrer'); }
      } else if (a.kind === 'retry') {
        // v3.50.0 — Was calling startRound() which doesn't exist (only
        // startRoundTimer exists, which is a UI helper, not a round
        // trigger). The typeof guard silently dropped the click — user
        // clicked Retry Round and nothing happened. Actual round entry
        // is runRound() in app.js.
        btn.onclick = () => { closeTroubleshootingCard(); if (typeof runRound === 'function') runRound(); };
      } else if (a.kind === 'resend-ai') {
        // v3.63.252 — Single-AI surgical retry. Closes the card and hands off
        // to retrySingleAIInPartialRound, which re-fires THIS bee's prompt
        // only, splices the response into the cached reviewer set, and
        // re-enters the Builder phase via runRound's resumedFromPartial path.
        // Saves N-1 reviewer calls (and possibly the prior Builder call) vs
        // the legacy "Retry round" button that re-fires every bee.
        btn.onclick = () => {
          closeTroubleshootingCard();
          if (typeof window.retrySingleAIInPartialRound === 'function') {
            window.retrySingleAIInPartialRound(ctx.aiId);
          } else if (typeof toast === 'function') {
            toast('⚠️ Re-send unavailable — single-AI retry helper not loaded');
          }
        };
      } else if (a.kind === 'retry-builder-cached') {
        // v3.63.382 — Builder-only retry against the round's cached reviewer
        // responses. Wired to the new "Retry Builder only" button on every
        // Builder-failure card (BUILDER_DELIMITERS, BUILDER_NO_CONFLICTS_BLOCK,
        // BUILDER_BLOAT, BUILDER_TRUNCATED). Saves the reviewer round-trip
        // cost when the round only failed because Builder synthesis was bad.
        btn.onclick = () => {
          closeTroubleshootingCard();
          if (typeof window.retryBuilderAgainstCachedReviews === 'function') {
            window.retryBuilderAgainstCachedReviews();
          } else if (typeof toast === 'function') {
            toast('⚠️ Builder retry unavailable — helper not loaded');
          }
        };
      } else if (a.kind === 'open-modal' && a.handler && typeof window[a.handler] === 'function') {
        btn.onclick = () => { closeTroubleshootingCard(); window[a.handler](); };
      } else if (a.kind === 'github-issue') {
        // v3.59.5 — real support path: open a prefilled GitHub issue with the
        // card's technical details, so "share with support" actually goes
        // somewhere. One click takes the user to a New Issue form.
        btn.onclick = () => {
          const dt = document.getElementById('tcDetails');
          const detail = dt ? String(dt.textContent || '').slice(0, 1500) : '';
          const ver = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '';
          const title = encodeURIComponent(`[Bug] ${entry.code || 'error'}`);
          const body  = encodeURIComponent(
            `**What I was doing when this happened:**\n(describe briefly)\n\n` +
            `**Technical details:**\n\`\`\`\n${detail}\n\`\`\`\n\n— Reported from WaxFrame ${ver}`
          );
          window.open(
            `https://github.com/WeirDave/WaxFrame-Professional/issues/new?title=${title}&body=${body}`,
            '_blank', 'noopener,noreferrer'
          );
        };
      } else if (a.kind === 'fix-bee') {
        // v3.59.6 — jump to the Worker Bees setup screen so the user can
        // re-pick the model for the bee that failed (e.g. a provider retired
        // the saved model from its serverless tier). If ctx carries the
        // failing aiId, scroll its model selector into view and flash it;
        // otherwise just land on the screen (the failed bee shows "FAILED").
        btn.onclick = () => {
          closeTroubleshootingCard();
          if (typeof goToScreen === 'function') goToScreen('screen-bees');
          const aid = ctx?.aiId;
          if (aid) {
            setTimeout(() => {
              const sel = document.getElementById('modelsel-' + aid);
              if (sel) {
                sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                sel.classList.add('model-select-flash');
                setTimeout(() => sel.classList.remove('model-select-flash'), 2200);
                try { sel.focus(); } catch (e) {}
              }
            }, 250);
          }
        };
      } else if (a.kind === 'disable-ai') {
        // v3.29.0 — toggle off the offending AI for the session via the same
        // mechanism the user has on the bee cards. Requires ctx.aiId.
        // v3.49.0 — toggleSessionBee now returns a boolean: true when the
        // disable completed immediately, false when deferred to the
        // Change Builder modal (because the target AI is the builder).
        // Only fire the success toast when the disable actually completed —
        // the modal flow handles its own toasting in the deferred case.
        btn.onclick = () => {
          closeTroubleshootingCard();
          if (ctx.aiId && typeof toggleSessionBee === 'function') {
            const completed = toggleSessionBee(ctx.aiId, false);
            if (completed && typeof toast === 'function') {
              toast(`✓ ${ctx.aiName || 'AI'} toggled off for this session`);
            }
          }
        };
      } else if (a.kind === 'silence-slow') {
        // v3.56.14 — User opts out of slow-AI alerts for the rest of this
        // tab session. Suppresses both the card and the console line (see the
        // _slowAlertsSilenced gate in the round-end emit). Session-scoped: it
        // resets on a new project or page reload. The footer "Slow alerts"
        // pill remains the persistent (cross-session) control.
        // v3.63.61 — Per-AI suppression. The previous global boolean wiped
        // out all slow-AI alerts when the user clicked "don't alert me this
        // session" on ONE card — too blunt. Now _slowAlertsSilenced is a
        // Set<aiId>; clicking the button only silences alerts for THIS AI
        // for the rest of the session. Other slow AIs still alert normally.
        btn.onclick = () => {
          closeTroubleshootingCard();
          // Initialize as Set if it's still the legacy boolean shape.
          if (!(window._slowAlertsSilenced instanceof Set)) {
            window._slowAlertsSilenced = new Set();
          }
          if (ctx.aiId) window._slowAlertsSilenced.add(ctx.aiId);
          const aiLabel = ctx.aiName || 'this AI';
          if (typeof consoleLog === 'function') {
            consoleLog(`🔕 Slow-AI alerts for ${aiLabel} silenced for this session — other slow AIs will still alert. Use the footer "Slow alerts" pill to disable globally, or start a new project to reset.`, 'info');
          }
          if (typeof toast === 'function') {
            toast(`🔕 ${aiLabel} slow-alerts off for this session`);
          }
        };
      } else if (a.kind === 'dismiss') {
        btn.onclick = closeTroubleshootingCard;
      } else {
        btn.onclick = closeTroubleshootingCard;
      }
      actionsEl.appendChild(btn);
    });
  }

  // Technical details (collapsed by default)
  if (detailsEl) {
    const details = {
      code:        entry.code,
      ai:          ctx.aiName || null,
      provider:    ctx.provider || null,
      status:      ctx.status || null,
      message:     ctx.message || null,
      raw:         ctx.raw || null,
      version:     (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown'),
      build:       (typeof BUILD !== 'undefined' ? BUILD : 'unknown'),
      ts:          new Date().toISOString(),
      deepDiveOn:  WF_DEBUG.deepDiveOn,
      ringBufferLen: WF_DEBUG.ringBuffer.length
    };
    detailsEl.textContent = JSON.stringify(details, null, 2);
  }

  // Reset expand state
  const wrap = document.getElementById('tcDetailsWrap');
  if (wrap) wrap.classList.remove('expanded');

  modal.classList.add('active');
}

function closeTroubleshootingCard() {
  const modal = document.getElementById('troubleshootingCard');
  if (modal) modal.classList.remove('active');
  // v3.63.252 — Clear the bee-fatal marker the card set on open. The
  // _autoMode flip + _autoChainDeferred wipe in WF_DEBUG.showCard already
  // ensures the resume hook below short-circuits, but the flag is
  // informational for any other listeners that want to know whether the
  // current card requires a bee-specific fix.
  window._beeFatalCardActive = false;
  // v3.35.1 — If Auto deferred a chain because this card was up,
  // resume it now that the user has dismissed the card. The helper
  // re-checks every gate (Auto on, work screen, no in-flight round)
  // so this is safe to call unconditionally — it's a no-op when no
  // chain was deferred. Without this hook, deferred chains stayed
  // deferred forever and Auto silently lost momentum mid-session.
  if (window._autoChainDeferred && window._autoMode) {
    const def = window._autoChainDeferred;
    if (typeof consoleLog === 'function') {
      consoleLog(`🤖 Auto chain resuming after card dismiss (deferred: ${def.label || 'unknown'})`, 'info');
    }
    if (typeof _autoFireChainedRound === 'function') {
      _autoFireChainedRound((def.label || 'card-resume') + '-retry', def.kind || 'round');
    }
  }
}

function toggleTcDetails() {
  const wrap = document.getElementById('tcDetailsWrap');
  if (wrap) wrap.classList.toggle('expanded');
}

function tcCopyDetails() {
  const detailsEl = document.getElementById('tcDetails');
  const titleEl   = document.getElementById('tcTitle');
  const meaningEl = document.getElementById('tcMeaning');
  if (!detailsEl) return;
  const payload =
    'WaxFrame Troubleshooting Report\n' +
    '================================\n' +
    'Title:   ' + (titleEl?.textContent || '') + '\n' +
    'Meaning: ' + (meaningEl?.textContent || '') + '\n\n' +
    'Technical details:\n' + detailsEl.textContent;
  if (typeof copyToClipboard === 'function') {
    copyToClipboard(payload, 'Troubleshooting report');
  } else {
    navigator.clipboard?.writeText(payload).catch(() => {});
  }
}

// Apply persisted Deep Dive toggle to dev-toolbar button once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const d = document.getElementById('wfDeepDiveToggle');
  if (d) d.classList.toggle('active', WF_DEBUG.deepDiveOn);
});
