// ============================================================
//  WaxFrame — wf-debug.js
//  Build: 20260525-002
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
//    WF_DEBUG.openViewer()       — open ring buffer modal
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
    if (typeof renderTroubleshootingCard === 'function') {
      renderTroubleshootingCard(entry, ctx);
    }
  },

  // ── Deep Dive Viewer (v3.28.2) ──
  // Opens a modal showing the ring buffer as a clean table.
  // No more typing WF_DEBUG.ringBuffer in DevTools.
  openViewer() {
    const modal = document.getElementById('deepDiveViewer');
    if (!modal) return;
    this._renderViewer();
    modal.classList.add('active');
  },
  closeViewer() {
    const modal = document.getElementById('deepDiveViewer');
    if (modal) modal.classList.remove('active');
  },
  _renderViewer() {
    const tbody  = document.getElementById('ddvTableBody');
    const status = document.getElementById('ddvStatus');
    const count  = document.getElementById('ddvCount');
    if (!tbody || !status) return;

    if (count) count.textContent = this.ringBuffer.length;

    if (!this.deepDiveOn) {
      status.textContent = 'Deep Dive is OFF — turn it on in the Dev Toolbar to start capturing rounds.';
      status.className = 'ddv-status ddv-status-off';
    } else if (this.ringBuffer.length === 0) {
      status.textContent = 'Deep Dive is ON — no rounds captured yet. Run a round and come back.';
      status.className = 'ddv-status ddv-status-empty';
    } else {
      status.textContent = `Deep Dive is ON — showing last ${this.ringBuffer.length} round(s) captured (max ${this.RING_MAX}).`;
      status.className = 'ddv-status ddv-status-on';
    }

    if (this.ringBuffer.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="ddv-empty">No captures yet.</td></tr>';
      return;
    }

    // Newest first
    const rows = [...this.ringBuffer].reverse().map(c => {
      const time = c.capturedAt ? new Date(c.capturedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '—';
      const esc = s => String(s ?? '—').replace(/[<>&]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]));
      return `<tr>
        <td>${esc(time)}</td>
        <td>${esc(c.aiName)}</td>
        <td>${esc(c.provider)}</td>
        <td class="ddv-mono">${esc(c.model)}</td>
        <td class="ddv-num">${c.elapsed != null ? esc(c.elapsed) + 's' : '—'}</td>
        <td class="ddv-num">${c.chars != null ? esc(c.chars.toLocaleString()) : '—'}</td>
        <td class="ddv-num">${c.words != null ? esc(c.words.toLocaleString()) : '—'}</td>
        <td class="ddv-mono">${esc(c.finishReason)}</td>
      </tr>`;
    }).join('');
    tbody.innerHTML = rows;
  },
  copyViewer() {
    if (this.ringBuffer.length === 0) {
      if (typeof toast === 'function') toast('Nothing to copy — buffer is empty');
      return;
    }
    const payload =
      'WaxFrame Deep Dive Capture\n' +
      '==========================\n' +
      `Version: ${typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown'} · Build ${typeof BUILD !== 'undefined' ? BUILD : 'unknown'}\n` +
      `Captured: ${this.ringBuffer.length} round(s)\n\n` +
      JSON.stringify(this.ringBuffer, null, 2);
    if (typeof copyToClipboard === 'function') {
      copyToClipboard(payload, 'Capture buffer');
    } else {
      navigator.clipboard?.writeText(payload).catch(() => {});
    }
  },
  // v3.36.9 — File download companion to copyViewer. With RING_MAX
  // bumped to 200 in v3.36.7, full-session captures can exceed sane
  // clipboard sizes; a download is the right tool for archival/share.
  // Output is pure parseable JSON wrapped in a metadata envelope (the
  // same shape backup files use), so external tooling can consume it
  // without stripping a header preamble. Filename follows the v3.36.8
  // transcript pattern: ${project}-${version}-r${N}-${stamp}-DeepDive.json
  // — round count + local-time stamp so multiple captures from the
  // same project don't collide on disk.
  saveViewer() {
    if (this.ringBuffer.length === 0) {
      if (typeof toast === 'function') toast('Nothing to save — buffer is empty');
      return;
    }
    const envelope = {
      _waxframe_deepdive:         true,
      _waxframe_app_version:      typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
      _waxframe_build:            typeof BUILD       !== 'undefined' ? BUILD       : 'unknown',
      _waxframe_captured_at:      new Date().toISOString(),
      _waxframe_capture_count:    this.ringBuffer.length,
      _waxframe_ring_max:         this.RING_MAX,
      ringBuffer:                 this.ringBuffer
    };
    // Reuse buildExportName() so the project-name/version prefix
    // matches what transcripts and documents use; fall back to
    // "WaxFrame" if no project context is set yet (e.g. capture
    // taken during pre-project bee testing).
    const baseName = (typeof buildExportName === 'function')
      ? (buildExportName() || 'WaxFrame')
      : 'WaxFrame';
    const totalRoundsForName = Math.max(0, (typeof round !== 'undefined' ? round : 1) - 1);
    const _td = new Date();
    const _pad = n => String(n).padStart(2, '0');
    const _stamp = `${_td.getFullYear()}${_pad(_td.getMonth()+1)}${_pad(_td.getDate())}-${_pad(_td.getHours())}${_pad(_td.getMinutes())}`;
    const filename = `${baseName}-r${totalRoundsForName}-${_stamp}-DeepDive.json`;

    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 30s deferred URL.revokeObjectURL — same pattern used by
    // backupSession (v3.21.21) and exportTranscript (v3.32.9) to
    // avoid the 0-byte race when the browser dispatcher hasn't
    // finished writing before the blob URL is revoked.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    if (typeof toast === 'function') toast('💾 Deep Dive capture saved');
  },
  clearViewer() {
    if (this.ringBuffer.length === 0) {
      if (typeof toast === 'function') toast('Buffer is already empty');
      return;
    }
    this.ringBuffer = [];
    this._renderViewer();
    if (typeof toast === 'function') toast('🔬 Capture buffer cleared');
  },

  // ── Dev test triggers (v3.28.2) ──
  // testCard cycles through every catalog entry on each click so all
  // 14 card designs can be eyeballed without forcing real errors.
  // testViewer seeds the ring buffer with realistic fake captures
  // and opens the viewer — purely for theme/layout review.
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
  testViewer() {
    const fake = [
      { aiName: 'Claude',     provider: 'claude',     model: 'claude-opus-4-7',         elapsed: 38.5, chars: 5821, words: 1024, status: 200, finishReason: 'end_turn' },
      { aiName: 'ChatGPT',    provider: 'chatgpt',    model: 'gpt-5.5',                 elapsed: 21.3, chars: 4612, words:  823, status: 200, finishReason: 'stop' },
      { aiName: 'Gemini',     provider: 'gemini',     model: 'gemini-3.1-pro',          elapsed: 37.3, chars: 4108, words:  717, status: 200, finishReason: 'STOP' },
      { aiName: 'Grok',       provider: 'grok',       model: 'grok-4.20-reasoning',     elapsed: 49.5, chars: 3094, words:  544, status: 200, finishReason: 'stop' },
      { aiName: 'DeepSeek',   provider: 'deepseek',   model: 'deepseek-v4',             elapsed:  0.8, chars: 4922, words:  848, status: 200, finishReason: 'stop' },
      { aiName: 'Perplexity', provider: 'perplexity', model: 'sonar-pro',               elapsed:  7.1, chars: 1873, words:  313, status: 200, finishReason: 'stop' }
    ];
    this.ringBuffer = fake.map(f => ({ ...f, capturedAt: new Date().toISOString() }));
    this.openViewer();
    if (typeof toast === 'function') toast(`🔬 Seeded ${fake.length} fake captures — preview only`);
  }
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
      { label: 'Pick a different model', kind: 'link', href: '#' },
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
      { label: 'Retry round', kind: 'retry' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' }
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
      { label: 'Retry round', kind: 'retry' },
      { label: 'Disable this AI for the session', kind: 'disable-ai' }
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
      { label: 'Retry round', kind: 'retry' }
    ]
  },
  {
    code: 'EMPTY_RESPONSE',
    matches: (err, ctx, msg) => msg === 'empty response' || msg.includes('empty response'),
    title: '{ai} — Provider returned an empty response',
    meaning: '{ai} returned success (200 OK) but the response body had no text content. This usually means a content filter blocked the output, or the model output was truncated. Try a different Builder, or shorten the document.',
    actions: [
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
    actions: [
      { label: 'OK',  kind: 'dismiss' }
    ]
  }
];

const WF_GENERIC_ENTRY = {
  code: 'UNKNOWN_ERROR',
  title: 'Something went wrong',
  meaning: 'WaxFrame ran into an error it does not have a specific explanation for. The technical details below may help diagnose. Copy them and share with support if needed.',
  actions: [
    { label: 'Retry round', kind: 'retry' }
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
  const fmtWarnings = (arr) => Array.isArray(arr) && arr.length
    ? arr.map(w => '• ' + w).join('\n')
    : '';
  const subst = (s) => String(s || '')
    .replace(/\{ai\}/g,       ctx.aiName   ?? 'AI')
    .replace(/\{elapsed\}/g,  ctx.elapsed  ?? '?')
    .replace(/\{avg\}/g,      ctx.avg      ?? '?')
    .replace(/\{filename\}/g, ctx.filename ?? 'this file')
    .replace(/\{warnings\}/g, fmtWarnings(ctx.warnings));

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
      // Linkify URLs so users can click straight to the fix
      const escaped = stripped
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // Linkify URLs so users can click straight to the fix. Trailing
      // sentence punctuation (period, comma, semicolon, etc.) is not
      // part of the URL — split it off so the visible link doesn't end
      // with a stray period when the URL appears at the end of a sentence.
      const linkified = escaped.replace(/(https?:\/\/[^\s<]+)/g, (m) => {
        const tailMatch = m.match(/[.,;!?)]+$/);
        const url       = tailMatch ? m.slice(0, -tailMatch[0].length) : m;
        const tail      = tailMatch ? tailMatch[0] : '';
        return `<a href="${url}" target="_blank" rel="noopener">${url}</a>${tail}`;
      });
      providerText.innerHTML = linkified;
      providerWrap.style.display = '';
    } else {
      providerWrap.style.display = 'none';
    }
  }

  // Actions
  if (actionsEl) {
    actionsEl.innerHTML = '';
    (entry.actions || []).forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'tc-action-btn';
      btn.textContent = a.label;
      if (a.kind === 'link' && a.href) {
        // v3.52.8 — noopener feature added (audit follow-up)
        btn.onclick = () => { window.open(a.href, '_blank', 'noopener,noreferrer'); };
      } else if (a.kind === 'console-link') {
        const url = ctx?.aiConsoleUrl || null;
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
      } else if (a.kind === 'open-modal' && a.handler && typeof window[a.handler] === 'function') {
        btn.onclick = () => { closeTroubleshootingCard(); window[a.handler](); };
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
        btn.onclick = () => {
          closeTroubleshootingCard();
          window._slowAlertsSilenced = true;
          if (typeof consoleLog === 'function') {
            consoleLog('🔕 Slow-AI alerts off for this session — re-enable via the footer "Slow alerts" pill or a new project', 'info');
          }
          if (typeof toast === 'function') {
            toast('🔕 Slow-AI alerts off for this session');
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
