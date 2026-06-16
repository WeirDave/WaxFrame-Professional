// ============================================================
//  WaxFrame — help-page.js
// Build: 20260615-001
//  Self-contained break-glass help screen behavior. Renders the
//  version line, environment capture, copy-to-clipboard buttons,
//  and Slack/email links. Deliberately does NOT depend on app.js
//  so the page keeps working even when app.js fails to load.
//  Extracted from the formerly-inline <script> block in
//  v3.63.352 so help.html can drop 'unsafe-inline'. The self-
//  contained constraint is preserved here — this file references
//  no functions defined in app.js or helper-handlers.js.
// ============================================================

  (function () {
    'use strict';

    var REPO = 'https://github.com/WeirDave/WaxFrame-Professional';
    var APP_VER  = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : 'unknown';
    // BUILD lives in app.js, which this break-glass page deliberately doesn't
    // load. Fall back to the build stamp baked into this page's own <meta>
    // (the release ceremony updates that on every HTML file, so it tracks).
    var APP_BLD  = (function () {
      if (typeof BUILD !== 'undefined') return BUILD;
      var m = document.querySelector('meta[name="waxframe-build"]');
      return (m && m.content) || 'unknown';
    })();

    // ── version line ──
    var verEl = document.getElementById('verline');
    if (verEl) verEl.textContent = 'WaxFrame ' + APP_VER + ' · build ' + APP_BLD;

    // ── security link ──
    var secLink = document.getElementById('securityLink');
    if (secLink) secLink.href = REPO + '/security/advisories/new';

    // ── environment capture ──
    var envText = 'gathering…';
    function buildEnvText(extra) {
      var nav = window.navigator || {};
      var lines = [
        'WaxFrame version : ' + APP_VER,
        'Build            : ' + APP_BLD,
        'Page URL         : ' + location.href,
        'Browser (UA)     : ' + (nav.userAgent || 'unknown'),
        'Platform         : ' + (nav.platform || (nav.userAgentData && nav.userAgentData.platform) || 'unknown'),
        'Language         : ' + (nav.language || 'unknown'),
        'Screen           : ' + (screen.width + '×' + screen.height) +
                                 '  ·  window ' + window.innerWidth + '×' + window.innerHeight +
                                 '  ·  DPR ' + (window.devicePixelRatio || 1),
        'Online           : ' + (nav.onLine ? 'yes' : 'no'),
        'localStorage     : ' + (extra.lsOk ? 'available' : 'BLOCKED'),
        'Storage persisted: ' + extra.persisted,
        'Last recorded err: ' + (extra.lastErr || 'none on record'),
        'Captured         : ' + new Date().toISOString()
      ];
      return lines.join('\n');
    }

    function lsAvailable() {
      try { var k = '__wf_probe__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; }
      catch (e) { return false; }
    }

    var envEl = document.getElementById('envBlock');

    (async function gatherEnv() {
      var persisted = 'unknown';
      try { if (navigator.storage && navigator.storage.persisted) persisted = (await navigator.storage.persisted()) ? 'yes' : 'no'; }
      catch (e) { persisted = 'unavailable'; }

      // lastFailure is persisted inside the IDB session, so we can surface it
      // even though the app's in-memory WF_DEBUG is gone on this separate page.
      var lastErr = '';
      try {
        if (typeof idbGet === 'function') {
          var s = await idbGet();
          if (s && s.lastFailure) {
            var lf = s.lastFailure;
            lastErr = (lf.code || lf.status || 'error') + (lf.message ? (' — ' + String(lf.message).slice(0, 160)) : '');
          }
        }
      } catch (e) { /* ignore — best effort */ }

      envText = buildEnvText({ lsOk: lsAvailable(), persisted: persisted, lastErr: lastErr });
      if (envEl) envEl.textContent = envText;
    })();

    // ── copy environment ──
    var copyBtn = document.getElementById('copyEnvBtn');
    var copyStatus = document.getElementById('copyStatus');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var done = function (ok) {
        if (!copyStatus) return;
        copyStatus.textContent = ok ? '✓ Copied to clipboard' : '⚠ Couldn\u2019t copy — select the text above and copy manually';
        copyStatus.className = 'status ' + (ok ? 'ok' : 'warn');
      };
      try {
        navigator.clipboard.writeText(envText).then(function () { done(true); }, function () { done(false); });
      } catch (e) { done(false); }
    });

    // ── open pre-filled GitHub issue using the bug_report.yml form ──
    // The form auto-applies labels (bug, auto-reported), enforces required
    // fields, and is pre-filled via field-id query params (?environment=…).
    // The legacy ?labels= param is intentionally NOT used — labels on the
    // form's own frontmatter avoid the 404 it caused for non-collaborators.
    var issueBtn = document.getElementById('openIssueBtn');
    if (issueBtn) issueBtn.addEventListener('click', function () {
      var title = '[Bug] ' + APP_VER + ' — ';
      var url = REPO + '/issues/new'
              + '?template=bug_report.yml'
              + '&title='       + encodeURIComponent(title)
              + '&environment=' + encodeURIComponent(envText);
      window.open(url, '_blank', 'noopener');
    });

    // ── provider model dump ──
    var MODEL_CACHE_PREFIX = 'waxframe_models_';
    // v3.63.82 — model-filtering / parsing / fallback logic now lives in the
    // shared js/provider-models.js module (loaded above), so the Help page and
    // the main app use ONE definition and can't drift. These bindings alias the
    // shared pieces under the names the dump code below already uses.
    var _WFPM = (window.WFProviderModels) || {};
    var STRUCTURAL_NON_CHAT_RE    = _WFPM.STRUCTURAL_NON_CHAT_RE;
    var CHATGPT_RESPONSES_ONLY_RE = _WFPM.CHATGPT_RESPONSES_ONLY_RE;
    var DATED_SNAPSHOT_RE         = _WFPM.DATED_SNAPSHOT_RE;
    var MODEL_FALLBACKS           = _WFPM.MODEL_FALLBACKS;
    var filterModelForProvider    = _WFPM.filterModelForProvider;
    var normalizePerplexityModels = _WFPM.normalizePerplexityModels;
    var parseModelsResponse       = _WFPM.parseModelsResponse;
    var baseProviderId            = _WFPM.baseProviderId;
    var dedup                     = _WFPM.dedup;
    var PERPLEXITY_SONAR_MODELS   = (MODEL_FALLBACKS && MODEL_FALLBACKS.perplexity) || ['sonar', 'sonar-pro', 'sonar-deep-research', 'sonar-reasoning-pro'];
    // v3.63.274 — Built-in providers come from the catalog (one source of
    // truth lives in js/provider-catalog.js). Pre-catalog, this table was
    // hand-maintained AND drifted vs api.js — adding a provider meant
    // editing five places; missing one silently broke this diagnostic dump.
    // Now: adding a CATALOG entry shows up here automatically.
    var BUILT_IN_MODEL_PROVIDERS = (function () {
      var out = {};
      var cat = (window.WFProviderCatalog && window.WFProviderCatalog.CATALOG) || [];
      cat.forEach(function (e) {
        out[e.id] = { label: e.label, endpoint: e.endpoint, format: e.format };
      });
      return out;
    })();
    var _lastCachedDump = null;
    var _lastLiveDump = null;
    var _lastAllDump = null;

    function safeJsonParse(str, fallback) {
      try { return JSON.parse(str); } catch (e) { return fallback; }
    }

    function readHiveRaw() {
      try {
        var key = (typeof LS_HIVE === 'string') ? LS_HIVE : 'waxframe_v2_hive';
        return safeJsonParse(localStorage.getItem(key) || '{}', {});
      } catch (e) { return {}; }
    }

    function getProviderEntries() {
      var hive = readHiveRaw();
      var entries = [];
      var seen = {};
      // v3.63.76 — provider list reflects the app's real architecture:
      //   • the DEFAULT 6 (BUILT_IN_MODEL_PROVIDERS) — cached by provider id
      //   • ADDITIONAL providers (hive.customAIConfigs) — DeepSeek, Together,
      //     Cohere, Ollama, etc., each with its own id (e.g. cohere_1779…) and
      //     its own key — cached by that id (mirrors app.js ~1048).
      // No more hardcoded 9-provider table colliding with the user's additionals,
      // so the duplicate "(no key saved)" rows are gone at the source.
      function keyFor(id) { return (hive.keys && hive.keys[id]) || ''; }
      function add(id, label, cfg) {
        if (!id || seen[id]) return;
        seen[id] = true;
        cfg = cfg || {};
        entries.push({
          id: id,
          aiId: id,
          label: label || cfg.label || id,
          endpoint: cfg.endpoint || '',
          modelsEndpoint: cfg._modelsEndpoint || cfg.modelsEndpoint || '',
          format: cfg.format || 'openai',
          key: keyFor(id)
        });
      }
      // 1) the default 6
      Object.keys(BUILT_IN_MODEL_PROVIDERS).forEach(function (id) {
        add(id, BUILT_IN_MODEL_PROVIDERS[id].label, BUILT_IN_MODEL_PROVIDERS[id]);
      });
      // 2) additionals (custom configs) — keyed by their own id
      var customs = hive.customAIConfigs || {};
      Object.keys(customs).forEach(function (id) {
        add(id, customs[id].label || id, customs[id]);
      });
      return entries.sort(function (a, b) { return a.label.localeCompare(b.label); });
    }

    function readModelCache(cacheId) {
      var out = { cacheKey: MODEL_CACHE_PREFIX + cacheId, ts: null, models: [], raw: null, error: '' };
      try {
        out.raw = localStorage.getItem(out.cacheKey);
        var parsed = safeJsonParse(out.raw || 'null', null);
        if (Array.isArray(parsed)) out.models = dedup(parsed);
        else if (parsed && Array.isArray(parsed.models)) {
          out.ts = parsed.ts || null;
          out.models = dedup(parsed.models);
        }
      } catch (e) { out.error = e && e.message ? e.message : String(e); }
      return out;
    }

    function readAllModelCaches() {
      var caches = {};
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (!key || key.indexOf(MODEL_CACHE_PREFIX) !== 0) continue;
          var id = key.slice(MODEL_CACHE_PREFIX.length);
          var cache = readModelCache(id);
          caches[id] = { ts: cache.ts, count: cache.models.length, models: cache.models };
        }
      } catch (e) {
        caches._error = e && e.message ? e.message : String(e);
      }
      return caches;
    }

    function formatList(models) {
      if (!models || !models.length) return '(none)';
      return models.map(function (id, i) { return String(i + 1).padStart(2, '0') + '. ' + id; }).join('\n');
    }

    function setDumpStatus(msg, cls) {
      var el = document.getElementById('modelDumpStatus');
      if (!el) return;
      el.textContent = msg;
      el.className = 'status ' + (cls || '');
    }

    function setDumpPanel(kind, dump) {
      var meta = document.getElementById(kind + 'DumpMeta');
      var list = document.getElementById(kind + 'DumpList');
      if (meta) {
        var parts = [dump.models.length + ' model' + (dump.models.length === 1 ? '' : 's')];
        if (dump.ts) parts.push(new Date(dump.ts).toLocaleString());
        if (dump.elapsedMs) parts.push(dump.elapsedMs + ' ms');
        if (dump.status) parts.push(dump.status);
        if (dump.modelsSource === 'documented-sonar-fallback') parts.push('documented Sonar fallback');
        else if (dump.modelsSource === 'live') parts.push('live provider list');
        meta.textContent = parts.join(' · ');
      }
      if (list) list.textContent = dump.error ? ('ERROR: ' + dump.error) : formatList(dump.models);
    }

    function copyDump(dump, statusLabel) {
      var text = JSON.stringify(dump || {}, null, 2);
      try {
        navigator.clipboard.writeText(text).then(function () {
          setDumpStatus('✓ Copied ' + statusLabel + ' model dump JSON', 'ok');
        }, function () {
          setDumpStatus('⚠ Could not copy ' + statusLabel + ' dump — select the list manually', 'warn');
        });
      } catch (e) {
        setDumpStatus('⚠ Could not copy ' + statusLabel + ' dump — select the list manually', 'warn');
      }
    }

    function compareDumps(cachedModels, liveModels) {
      var cached = {}, live = {}, onlyCached = [], onlyLive = [];
      (cachedModels || []).forEach(function (id) { cached[id] = true; });
      (liveModels || []).forEach(function (id) { live[id] = true; });
      Object.keys(cached).forEach(function (id) { if (!live[id]) onlyCached.push(id); });
      Object.keys(live).forEach(function (id) { if (!cached[id]) onlyLive.push(id); });
      return { onlyCached: onlyCached, onlyLive: onlyLive, same: !onlyCached.length && !onlyLive.length };
    }

    // v3.63.274 — Built-in providers route through the catalog's
    // diagnosticModelsUrl helper so the per-provider URL rules live in
    // ONE place. Custom AIs still honor their explicit modelsEndpoint
    // override; if a custom AI has no override (legacy entries) we
    // derive `${base}/v1/models` the same way the pre-catalog fallback
    // did, with the Together-AI serverless carve-out preserved.
    function deriveModelsEndpoint(entry) {
      if (entry.modelsEndpoint) return entry.modelsEndpoint;
      var cat = window.WFProviderCatalog;
      if (cat) {
        var catEntry = cat.getEntry(entry.id);
        if (catEntry) return cat.diagnosticModelsUrl(catEntry);
      }
      // Custom-AI fallback (legacy entries with no explicit modelsEndpoint).
      var base = entry.endpoint.replace(/\/$/, '').replace(/\/v1\/.*$/, '');
      var url = base + '/v1/models';
      if (/api\.together\.xyz/i.test(url)) url += '?serverless=true';
      return url;
    }

    // parseModelsResponse + normalizePerplexityModels + filterModelForProvider
    // + dedup + baseProviderId are provided by js/provider-models.js (aliased at
    // the top of this script). No local copies — single source of truth.

    async function fetchLiveModelsNoCache(entry) {
      if (!entry || !entry.endpoint) throw new Error('No endpoint saved for this provider.');
      var keyRequired = !entry.modelsEndpoint || entry.format === 'anthropic' || entry.format === 'google' || entry.id === 'claude' || entry.id === 'gemini';
      if (!entry.key && keyRequired) throw new Error('No API key saved for this provider in this browser.');
      var endpoint = deriveModelsEndpoint(entry);
      // v3.63.275 — header building routes through the catalog so the
      // per-format auth rule (Anthropic x-api-key+version / Google
      // x-goog-api-key / Bearer for OpenAI-shape) lives in ONE place. The
      // catalog accepts a synthetic entry-shaped object so custom-AI
      // entries (which aren't in CATALOG) still flow through it.
      var headers = (window.WFProviderCatalog
        ? window.WFProviderCatalog.diagnosticModelsHeaders(entry, entry.key)
        : (entry.format === 'anthropic'
            ? { 'x-api-key': entry.key, 'anthropic-version': '2023-06-01' }
            : entry.format === 'google'
              ? { 'x-goog-api-key': entry.key }
              : (entry.key ? { 'Authorization': 'Bearer ' + entry.key } : {})));
      var started = Date.now();
      var resp = await fetch(endpoint, { headers: headers });
      var elapsedMs = Date.now() - started;
      var data = null;
      try { data = await resp.json(); } catch (e) {}
      if (!resp.ok) {
        var msg = data && (data.error && (data.error.message || data.error)) || ('HTTP ' + resp.status);
        throw new Error(String(msg));
      }
      var parsed = parseModelsResponse(entry.id, entry.format, data);
      return {
        provider: entry.id,
        label: entry.label,
        fetchedAt: Date.now(),
        elapsedMs: elapsedMs,
        status: 'HTTP ' + resp.status,
        models: parsed.models,
        modelsSource: parsed.modelsSource,
        sourceDetail: parsed.sourceDetail,
        rawLiveModels: parsed.rawLiveModels
      };
    }

    function populateModelDumpProviders() {
      var select = document.getElementById('modelDumpProvider');
      if (!select) return;
      var entries = getProviderEntries();
      select.innerHTML = entries.map(function (entry) {
        var keyRequired = !entry.modelsEndpoint || entry.format === 'anthropic' || entry.format === 'google' || entry.id === 'claude' || entry.id === 'gemini';
        return '<option value="' + entry.id.replace(/"/g, '&quot;') + '">' +
               entry.label.replace(/&/g, '&amp;').replace(/</g, '&lt;') +
               (entry.key || !keyRequired ? '' : ' (no key saved)') +
               '</option>';
      }).join('');
      var hive = readHiveRaw();
      var preferred = (hive.builder && (hive.builder.provider || hive.builder.id)) || (hive.activeAIs && hive.activeAIs[0] && hive.activeAIs[0].provider);
      if (preferred) select.value = preferred;
      if (!entries.length) setDumpStatus('No providers found in local storage.', 'warn');
    }

    var modelDumpBtn = document.getElementById('modelDumpBtn');
    if (modelDumpBtn) modelDumpBtn.addEventListener('click', async function () {
      var select = document.getElementById('modelDumpProvider');
      var id = select && select.value;
      var entry = getProviderEntries().filter(function (e) { return e.id === id; })[0];
      if (!entry) { setDumpStatus('Pick a provider first.', 'warn'); return; }
      modelDumpBtn.disabled = true;
      setDumpStatus('Fetching live model list without touching the cache...', '');
      var diffEl = document.getElementById('modelDumpDiff');
      if (diffEl) { diffEl.className = 'dump-diff'; diffEl.textContent = ''; }
      try {
        var cache = readModelCache(entry.id);
        _lastCachedDump = {
          source: 'localStorage',
          provider: entry.id,
          label: entry.label,
          cacheKey: cache.cacheKey,
          ts: cache.ts,
          models: cache.models,
          error: cache.error
        };
        setDumpPanel('cached', _lastCachedDump);
        try {
          _lastLiveDump = await fetchLiveModelsNoCache(entry);
        } catch (e) {
          _lastLiveDump = {
            source: 'live',
            provider: entry.id,
            label: entry.label,
            fetchedAt: Date.now(),
            models: [],
            error: e && e.message ? e.message : String(e)
          };
        }
        setDumpPanel('live', _lastLiveDump);
        var cmp = compareDumps(_lastCachedDump.models, _lastLiveDump.models);
        if (_lastLiveDump.error) {
          setDumpStatus('⚠ Live fetch failed; cached list is still shown for inspection.', 'warn');
        } else if (_lastLiveDump.modelsSource === 'documented-sonar-fallback' && cmp.same) {
          setDumpStatus('⚠ Cached list matches the documented Sonar fallback. Raw Perplexity live list had ' + ((_lastLiveDump.rawLiveModels || []).length) + ' model(s).', 'warn');
        } else if (_lastLiveDump.modelsSource === 'documented-sonar-fallback') {
          setDumpStatus('⚠ Cached list differs from the documented Sonar fallback. Only in cache: ' + (cmp.onlyA.join(', ') || 'none') + '. Only in fallback: ' + (cmp.onlyB.join(', ') || 'none') + '. Raw Perplexity live list had ' + ((_lastLiveDump.rawLiveModels || []).length) + ' model(s).', 'warn');
        } else if (cmp.same) {
          setDumpStatus('✓ Cached and live model lists match.', 'ok');
        } else {
          setDumpStatus('⚠ Cached and live model lists differ.', 'warn');
          if (diffEl) {
            diffEl.className = 'dump-diff show';
            diffEl.textContent = 'Only cached: ' + cmp.onlyCached.length + ' · only live: ' + cmp.onlyLive.length;
          }
        }
      } finally {
        modelDumpBtn.disabled = false;
      }
    });

    var copyCachedDump = document.getElementById('copyCachedDump');
    if (copyCachedDump) copyCachedDump.addEventListener('click', function () { copyDump(_lastCachedDump, 'cached'); });
    var copyLiveDump = document.getElementById('copyLiveDump');
    if (copyLiveDump) copyLiveDump.addEventListener('click', function () { copyDump(_lastLiveDump, 'live'); });

    // v3.63.75 — Dump ALL providers: live-fetch every provider that has a saved
    // key (and any keyless provider with a public models endpoint) into one
    // combined JSON, copied to the clipboard. Same no-cache-write guarantee as
    // the single dump. Sequential to stay gentle on rate limits.
    var modelDumpAllBtn = document.getElementById('modelDumpAllBtn');
    if (modelDumpAllBtn) modelDumpAllBtn.addEventListener('click', async function () {
      var entries = getProviderEntries();
      // Eligible = has a key, OR has a public models endpoint that needs none.
      var eligible = entries.filter(function (e) {
        var keyRequired = !e.modelsEndpoint || e.format === 'anthropic' || e.format === 'google' || e.id === 'claude' || e.id === 'gemini';
        return e.key || !keyRequired;
      });
      if (!eligible.length) { setDumpStatus('No providers with a saved key (or keyless model endpoint) to dump.', 'warn'); return; }
      modelDumpAllBtn.disabled = true;
      var combined = {
        kind: 'waxframe-all-provider-models',
        generatedAt: new Date().toISOString(),
        appVersion: (typeof APP_VERSION === 'string' ? APP_VERSION : ''),
        providerCount: eligible.length,
        providers: {}
      };
      var okN = 0, failN = 0;
      for (var i = 0; i < eligible.length; i++) {
        var e = eligible[i];
        setDumpStatus('Dumping ALL — ' + (i + 1) + ' of ' + eligible.length + ': ' + e.label + '…', '');
        try {
          var live = await fetchLiveModelsNoCache(e);
          combined.providers[e.id] = {
            label: e.label, status: live.status, elapsedMs: live.elapsedMs,
            modelsSource: live.modelsSource,
            sourceDetail: live.sourceDetail,
            rawLiveModels: live.rawLiveModels,
            count: live.models.length, models: live.models
          };
          okN++;
        } catch (err) {
          combined.providers[e.id] = {
            label: e.label, error: (err && err.message) ? err.message : String(err),
            models: []
          };
          failN++;
        }
      }
      _lastAllDump = combined;
      var text = JSON.stringify(combined, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        setDumpStatus('✓ Dumped ALL — ' + okN + ' ok, ' + failN + ' failed · combined JSON copied to clipboard.', failN ? 'warn' : 'ok');
      } catch (e2) {
        // Clipboard blocked — surface the JSON in the live panel so it's selectable.
        setDumpPanel('live', { source: 'all-providers', models: [], note: 'clipboard blocked — JSON below' });
        var liveList = document.getElementById('liveDumpList');
        if (liveList) liveList.textContent = text;
        setDumpStatus('⚠ Dumped ALL — ' + okN + ' ok, ' + failN + ' failed · clipboard blocked, JSON shown in Live panel (select + copy).', 'warn');
      }
      modelDumpAllBtn.disabled = false;
    });

    populateModelDumpProviders();

    // ── Deep Dive enable button (v3.63.133) ──
    // Sets the same localStorage flag the in-app toggle uses. Cross-tab:
    // browsers share localStorage between tabs on the same origin, so when
    // the user clicks here and then refreshes / opens WaxFrame, wf-debug.js
    // reads '1' from localStorage on init and starts capturing immediately.
    // No round-trip needed and we don't need wf-debug.js loaded on this page.
    var enableDeepDiveBtn = document.getElementById('enableDeepDiveBtn');
    var deepDiveStatus = document.getElementById('deepDiveStatus');
    if (enableDeepDiveBtn) {
      // Reflect current state on load so a user who already turned it on
      // sees the right label and isn't asked to enable twice.
      var alreadyOn = localStorage.getItem('waxframe_deepdive') === '1';
      if (alreadyOn) {
        enableDeepDiveBtn.textContent = '✓ Deep Dive already enabled';
        enableDeepDiveBtn.disabled = true;
        if (deepDiveStatus) {
          deepDiveStatus.textContent = 'Capturing is on. Open or refresh WaxFrame, reproduce the issue, then come back for Step 3.';
          deepDiveStatus.className = 'status ok';
        }
      }
      enableDeepDiveBtn.addEventListener('click', function () {
        try {
          localStorage.setItem('waxframe_deepdive', '1');
          enableDeepDiveBtn.textContent = '✓ Deep Dive enabled';
          enableDeepDiveBtn.disabled = true;
          if (deepDiveStatus) {
            deepDiveStatus.textContent = '✓ Deep Dive enabled. Open or refresh WaxFrame in another tab, reproduce the issue, then come back here for Step 3. Turn it back off from Settings → Diagnostics when you’re done.';
            deepDiveStatus.className = 'status ok';
          }
        } catch (e) {
          if (deepDiveStatus) {
            deepDiveStatus.textContent = '⚠️ Could not write to localStorage (' + (e && e.message ? e.message : 'unknown error') + '). Try enabling it directly in WaxFrame instead: Settings → Diagnostics → Deep Dive capture.';
            deepDiveStatus.className = 'status err';
          }
        }
      });
    }

    // ── diagnostic bundle (reuses storage.js redaction; own assembly) ──
    var bundleBtn = document.getElementById('bundleBtn');
    var bundleStatus = document.getElementById('bundleStatus');

    function setBundleStatus(msg, cls) {
      if (!bundleStatus) return;
      bundleStatus.textContent = msg;
      bundleStatus.className = 'status ' + (cls || '');
    }

    // Feature-detect the storage layer. If storage.js didn't load, degrade.
    var storageReady = (typeof idbGet === 'function') &&
                       (typeof _redactHiveKeys === 'function') &&
                       (typeof _redactSessionContent === 'function') &&
                       (typeof LS_HIVE === 'string') && (typeof LS_PROJECT === 'string');

    if (!storageReady && bundleBtn) {
      bundleBtn.disabled = true;
      setBundleStatus('Bundle generator needs storage.js, which didn\u2019t load. Use the in-app Diagnostic button if you can reach the app, or copy the environment above into your issue.', 'warn');
    }

    function redactProjectContent(projectStr) {
      // Mirrors the in-app LS_PROJECT content redaction: mask document/reference
      // text, keep setup fields. (Credentials don't live in LS_PROJECT.)
      try {
        var p = JSON.parse(projectStr);
        var mark = function (str) {
          return (typeof str === 'string') ? ('[REDACTED — ' + str.length.toLocaleString() + ' chars]') : str;
        };
        if (typeof p.pastedDocument === 'string') p.pastedDocument = mark(p.pastedDocument);
        if (Array.isArray(p.referenceDocs)) {
          p.referenceDocs = p.referenceDocs.map(function (d) {
            var c = Object.assign({}, d);
            if (typeof c.text === 'string') c.text = mark(c.text);
            if (typeof c.content === 'string') c.content = mark(c.content);
            return c;
          });
        }
        return JSON.stringify(p);
      } catch (e) {
        return '[REDACTED — project blob unparseable]';
      }
    }

    if (bundleBtn && storageReady) bundleBtn.addEventListener('click', async function () {
      bundleBtn.disabled = true;
      setBundleStatus('Building…', '');
      try {
        var includeContent = !!document.getElementById('includeContent').checked;
        var redactContent = !includeContent;

        var hiveRaw = null, projectRaw = null, sessionIDB = null;
        try { hiveRaw = localStorage.getItem(LS_HIVE); } catch (e) {}
        try { projectRaw = localStorage.getItem(LS_PROJECT); } catch (e) {}
        try { sessionIDB = await idbGet(); } catch (e) {}

        if (!hiveRaw && !projectRaw && !sessionIDB) {
          setBundleStatus('Nothing to export — no WaxFrame data found in this browser.', 'warn');
          bundleBtn.disabled = false;
          return;
        }

        // Always strip credentials from the hive.
        var hiveOut = _redactHiveKeys(hiveRaw);
        // Content redaction (default ON for the public-issue path).
        var sessionOut = (redactContent && sessionIDB) ? _redactSessionContent(sessionIDB) : sessionIDB;
        var projectOut = (redactContent && projectRaw) ? redactProjectContent(projectRaw) : projectRaw;

        var bundle = {
          _waxframe_diagnostic: true,
          _waxframe_diagnostic_version: 1,
          _waxframe_diagnostic_source: 'techsupport-page',
          _waxframe_app_version: APP_VER,
          _waxframe_build: APP_BLD,
          _waxframe_diagnostic_ts: Date.now(),
          _waxframe_content_redacted: redactContent,
          LS_HIVE: hiveOut,
          LS_PROJECT: projectOut,
          IDB_SESSION: sessionOut,
          MODEL_CACHES: readAllModelCaches()
        };

        var projName = 'session';
        try { var pj = JSON.parse(projectRaw || '{}'); if (pj.projectName) projName = pj.projectName; } catch (e) {}
        var safeName = projName.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'session';
        var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
        var stamp = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
        var filename = safeName + '-' + stamp + '-Diagnostic-Safe.json';

        var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);

        setBundleStatus('✓ Downloaded ' + filename + ' — keys removed' + (redactContent ? ', content redacted' : '') + '. Now drag it into your GitHub issue.', 'ok');
      } catch (e) {
        setBundleStatus('⚠ Could not build the bundle: ' + (e && e.message ? e.message : e), 'err');
      } finally {
        bundleBtn.disabled = false;
      }
    });

    // ── Wipe local data ────────────────────────────────────────────────
    // Four buttons → four storage layers (localStorage, IndexedDB,
    // sessionStorage, all). Each button uses the same two-click confirm
    // pattern: first click arms (button label flips to a confirmation, 5s
    // timer starts); second click within 5 seconds actually wipes; if no
    // second click, the button reverts and reports cancellation. The
    // storage logic itself lives in storage.js (wipeLocalStorage /
    // wipeIndexedDB / wipeSessionStorage / wipeAllStorage) so Settings
    // can reuse the same functions.
    var wipeStatus = document.getElementById('wipeStatus');
    function setWipeStatus(msg, cls) {
      if (!wipeStatus) return;
      wipeStatus.textContent = msg;
      wipeStatus.classList.toggle('is-hidden', !msg);
      wipeStatus.style.color = cls === 'warn' ? '#c5832a' : cls === 'err' ? '#b94a3a' : cls === 'ok' ? '#3a7a4a' : '';
    }
    function wireWipeButton(btnId, origLabel, armedLabel, wipeFn, layerName) {
      var btn = document.getElementById(btnId);
      if (!btn) return;
      var armTimer = null;
      btn.addEventListener('click', async function () {
        // First click — arm confirmation
        if (btn.dataset.armed !== '1') {
          btn.dataset.armed = '1';
          btn.textContent = armedLabel;
          setWipeStatus('Confirmation required. Click "' + origLabel + '" again to wipe ' + layerName + ', or wait 5 seconds to cancel.', 'warn');
          armTimer = setTimeout(function () {
            btn.dataset.armed = '0';
            btn.textContent = origLabel;
            setWipeStatus('Cancelled — no data was removed.', '');
          }, 5000);
          return;
        }
        // Second click — execute
        clearTimeout(armTimer);
        btn.disabled = true;
        try {
          var result = await wipeFn();
          // wipeAllStorage returns a different shape than the single-layer ones
          if (result && typeof result.totalRemoved === 'number') {
            var bits = [];
            if (result.localStorage)   bits.push('localStorage: ' + (result.localStorage.removed || 0));
            if (result.indexedDB)      bits.push('IndexedDB: ' + (result.indexedDB.removed ? 'cleared' : 'failed'));
            if (result.sessionStorage) bits.push('sessionStorage: ' + (result.sessionStorage.removed || 0));
            setWipeStatus('✓ Wiped everything (' + bits.join(' · ') + '). Reloading in 2 seconds…', 'ok');
          } else if (result && result.error) {
            btn.disabled = false;
            btn.dataset.armed = '0';
            btn.textContent = origLabel;
            setWipeStatus('⚠ Wipe failed: ' + result.error, 'err');
            return;
          } else {
            setWipeStatus('✓ Cleared ' + layerName + ' (' + (result.removed || 0) + ' entr' + ((result.removed || 0) === 1 ? 'y' : 'ies') + '). Reloading in 2 seconds…', 'ok');
          }
          setTimeout(function () { window.location.href = 'index.html'; }, 2000);
        } catch (e) {
          btn.disabled = false;
          btn.dataset.armed = '0';
          btn.textContent = origLabel;
          setWipeStatus('⚠ Wipe failed: ' + (e && e.message ? e.message : e), 'err');
        }
      });
    }
    wireWipeButton('wipeLocalStorageBtn',   'Wipe localStorage (hive, keys, settings)',         '⚠ Click again within 5s to confirm localStorage wipe',   window.wipeLocalStorage,   'localStorage');
    wireWipeButton('wipeIndexedDBBtn',      'Wipe IndexedDB (session, rounds, document)',       '⚠ Click again within 5s to confirm IndexedDB wipe',      window.wipeIndexedDB,      'IndexedDB');
    wireWipeButton('wipeSessionStorageBtn', 'Wipe sessionStorage (per-tab, usually empty)',      '⚠ Click again within 5s to confirm sessionStorage wipe', window.wipeSessionStorage, 'sessionStorage');
    wireWipeButton('wipeAllStorageBtn',     'Wipe EVERYTHING (full reset)',                     '⚠ Click again within 5s to confirm FULL WIPE',           window.wipeAllStorage,     'all storage');

  })();
