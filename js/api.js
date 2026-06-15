// ============================================================
//  WaxFrame — api.js
// Build: 20260614-033
//
//  API provider configurations + model discovery helpers.
//  Pulled out of app.js in v3.44.0 as part of the cross-cutting
//  cleanup pass. This is a partial api.js — it holds the
//  static configs + read-only fetch helpers. callAPI itself
//  (the hot path) remains in app.js for now; future split.
//
//  v3.63.274 — Provider catalog refactor.
//    The 240-line API_CONFIGS literal and the two near-duplicate
//    fetchModelsForProvider/Live if/else chains are gone. Every
//    provider is now declared as a single data record in
//    js/provider-catalog.js, and this file is a thin caching /
//    retry / error-capture wrapper over the catalog's dispatcher.
//
//    Adding a provider is now: drop one entry into CATALOG. No more
//    patching this file, no more patching help.html, no more patching
//    the duplicate fetchers, no more drift between the two if-chains.
//
//  Contents:
//    window.API_CONFIGS         — provider config map (claude, chatgpt,
//                                 copilot, gemini, grok, perplexity,
//                                 mistral, deepseek, together, cohere).
//                                 Built from WFProviderCatalog.CATALOG.
//                                 Each entry: endpoint, default model,
//                                 headersFn, bodyFn, extractFn, format.
//                                 Referenced 80+ times across app.js.
//    window.MODEL_FALLBACKS     — per-provider fallback model lists used
//                                 only when /v1/models is unreachable.
//                                 Derived from the catalog.
//    getModelsForProvider(p)    — read fallback / cached models for a
//                                 provider, dedup, drop quarantined.
//    fetchModelsForProvider(p)  — live-fetch /v1/models with 7-day cache.
//                                 Wraps WFProviderCatalog.fetchModelsList.
//    fetchModelsForProviderLive(p) — same as above but bypasses the cache.
//                                 Used by the deprecation watchdog.
//    detectDeprecatedModels(t)  — v3.40.0 deprecation watchdog. Compares
//                                 each AI's saved model against live
//                                 /v1/models; flags missing ones on
//                                 window._deprecatedModelFlags. Three
//                                 triggers: app load, tab-visible,
//                                 round-start.
//    quarantineModel / isModelIncapable — v3.63.31 self-healing filter
//                                 for models that survive structural
//                                 checks but reject every WaxFrame round.
//
//  Cross-script exposure pattern:
//    API_CONFIGS and MODEL_FALLBACKS are explicit window properties
//    (window.X = {...}) because app.js has 80+ references to them. Bare
//    identifier lookups in app.js resolve via global Object Environment
//    Record — same pattern as window._isMuted and window.WF_DEBUG.
//
//  Load order: AFTER version.js, provider-models.js, AND provider-
//  catalog.js (this file calls WFProviderCatalog.buildApiConfigs() at
//  module-eval time). BEFORE app.js (app.js has 70+ refs to API_CONFIGS
//  / MODEL_FALLBACKS / fetchModels* / detectDeprecatedModels).
//
//  External dependencies (live in app.js — api.js calls them at
//  runtime after both scripts have loaded):
//    WF_DEBUG.captureFailure(...) — already on window via wf-debug.js
//    consoleLog                   — Live Console output
//    activeAIs, window._deprecatedModelFlags — state
// ============================================================

// ══════════════════════════════════════
// API CONFIGS — built from the provider catalog.
// Each entry shape: { label, model, endpoint, note, format, headersFn,
//                     bodyFn, extractFn, endpointFn? }.
// To add or modify a provider, edit js/provider-catalog.js — NOT this file.
// ══════════════════════════════════════
window.API_CONFIGS = window.WFProviderCatalog.buildApiConfigs();

// v3.52.7 — MODEL_LABELS dictionary removed. Was keyed by model id with
// curated tag/note descriptors ("Fast", "Balanced", "Most Capable" etc.),
// originally a source-of-truth for the model selector. v3.26.4 demoted it
// to a "safety net" alongside MODEL_FALLBACKS, but in practice nothing
// consumed it after the delegate-to-provider architecture shipped — the
// one runtime reference (in exportTranscript at app.js L13535) was
// broken-shaped (looked up by AI id against a model-id-keyed dictionary,
// always returned undefined). MODEL_FALLBACKS below remains as the active
// safety net for provider model lists when /v1/models fetch fails.

// Static fallback model lists per provider — used when dynamic fetch fails
// or is offline. v3.63.82 — provider/model regex+parse logic moved to the
// shared js/provider-models.js module. v3.63.274 — MODEL_FALLBACKS and
// MODEL_FILTERS are now derived from the provider catalog (which
// overwrites WFProviderModels.{MODEL_FILTERS,MODEL_FALLBACKS} at catalog
// init). These bindings re-expose the shared pieces under the names the
// rest of api.js / app.js already use.
var WFPM = (typeof window !== 'undefined' && window.WFProviderModels) || {};
window.MODEL_FALLBACKS          = WFPM.MODEL_FALLBACKS;
const MODEL_FALLBACKS           = window.MODEL_FALLBACKS;
const STRUCTURAL_NON_CHAT_RE    = WFPM.STRUCTURAL_NON_CHAT_RE;
const CHATGPT_RESPONSES_ONLY_RE = WFPM.CHATGPT_RESPONSES_ONLY_RE;
const DATED_SNAPSHOT_RE         = WFPM.DATED_SNAPSHOT_RE;
const MODEL_FILTERS             = WFPM.MODEL_FILTERS;
const normalizePerplexityModels = WFPM.normalizePerplexityModels;
// Custom AI Add flow uses the same structural filter (was duplicated as NON_CHAT_RE).
const NON_CHAT_RE               = STRUCTURAL_NON_CHAT_RE;

// v3.63.31 — Runtime model quarantine (self-healing incapable-model filter).
//
// Some models appear in a provider's /v1/models list but can never actually
// run a WaxFrame round: they reject the developer/system-instruction shape
// every prompt relies on (e.g. antigravity-preview-05-2026 -> "Developer
// instruction is not enabled"), or they need an endpoint we don't speak yet
// (Responses API). No naming pattern reliably catches these ahead of time and
// the recommending AI can pick them anyway, so instead of an omniscient
// blocklist we LEARN them from the provider's own error: when a round fails
// with that signature (see WF_DEBUG.showCard), the failing model id is recorded
// here and excluded from every future model list + recommendation. The provider
// error is the ground truth.
//
// Stored as { id: { ts, reason } } under one localStorage key; membership is
// what matters (ts/reason kept for future TTL/inspection).
const INCAPABLE_MODELS_KEY = 'waxframe_incapable_models';
let _incapableModels = null; // lazy-loaded Set of model ids

function _loadIncapableModels() {
  if (_incapableModels) return _incapableModels;
  _incapableModels = new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(INCAPABLE_MODELS_KEY) || '{}');
    Object.keys(raw || {}).forEach(id => _incapableModels.add(id));
  } catch (e) { /* corrupt -> start empty */ }
  return _incapableModels;
}

function isModelIncapable(id) {
  if (!id) return false;
  return _loadIncapableModels().has(id);
}

function quarantineModel(id, reason) {
  if (!id) return;
  const set = _loadIncapableModels();
  if (set.has(id)) return; // already known — idempotent, no re-log
  set.add(id);
  try {
    const raw = JSON.parse(localStorage.getItem(INCAPABLE_MODELS_KEY) || '{}');
    raw[id] = { ts: Date.now(), reason: reason || 'incapable' };
    localStorage.setItem(INCAPABLE_MODELS_KEY, JSON.stringify(raw));
  } catch (e) { /* storage blocked — Set still holds it for this session */ }
  if (typeof consoleLog === 'function') {
    consoleLog(`⛔ Model "${id}" quarantined (${reason || 'incapable'}) — it failed a round and will be kept out of model lists and recommendations.`, 'warn');
  } else {
    console.warn(`[quarantine] ${id} (${reason || 'incapable'})`);
  }
}

// Cache key prefix and TTL (7 days)
const MODELS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// ── Internal: shared wrapper around WFProviderCatalog.fetchModelsList ─
//
// Both fetchModelsForProvider (cached) and fetchModelsForProviderLive
// (cache-bypassing) ride this. It owns the retry-once policy, the error
// capture into WF_DEBUG, the per-provider _lastTierClassificationErrors
// breadcrumb, and the cache write on success. The PROVIDER-SPECIFIC
// transport (openai-models / anthropic-via-proxy / gemini-list / perplexity-
// self) is the catalog's job — when adding a provider, drop one catalog
// entry and BOTH fetch paths Just Work.
async function _fetchModelsViaCatalog(provider, opts, callerName) {
  opts = opts || {};
  if (!MODEL_FILTERS[provider]) return null; // no built-in discovery for this provider
  const cfg = window.API_CONFIGS[provider];
  if (!cfg || !cfg._key) return null;
  const entry = window.WFProviderCatalog && window.WFProviderCatalog.getEntry(provider);
  if (!entry) return null;

  const cacheKey = `waxframe_models_${provider}`;

  try {
    const models = await window.WFProviderCatalog.fetchModelsList(entry, cfg._key);
    if (models && models.length > 0) {
      // v3.32.11 — dedup defensively at write time. The catalog already
      // dedups; this is a belt-and-braces guard against future regressions.
      const deduped = Array.from(new Set(models));
      // v3.63.302 — Stamped via wfWriteVersioned at schema_version=1 so the
      // payload joins the schema-versioning convention (see storage.js). No
      // behavior change today — just a hook for future shape evolutions.
      window.wfWriteVersioned(cacheKey, { ts: Date.now(), models: deduped }, 1);
      return deduped;
    }
  } catch (e) {
    // v3.63.145 — Retry once on transient transport failures. Browsers
    // report TCP resets / TLS aborts / dropped packets as "Failed to fetch"
    // / "NetworkError" / "CORS request did not succeed (null)" — all
    // indistinguishable from genuine CORS rejections at the JS layer. A
    // null-status response (no HTTP reply at all) is the fingerprint of a
    // transient transport failure, and one retry with a short delay clears
    // the vast majority of these without papering over real endpoint /
    // CORS / auth problems (which fail BOTH attempts consistently).
    // Confirmed by David's Mistral diagnostic on 2026-06-04: same browser,
    // same key, same code path — Classify Tiers run failed (CORS-shaped
    // error), manual retry 12 min later succeeded with 68 models returned.
    // The endpoint was reliable; the original failure was a one-off blip.
    if (!opts._isRetry) {
      console.info(`[${callerName}:${provider}] transient failure; retrying once in 750ms:`, e?.message || e);
      await new Promise(r => setTimeout(r, 750));
      return _fetchModelsViaCatalog(provider, { _isRetry: true, _cacheBypass: opts._cacheBypass }, callerName);
    }
    // v3.29.2 — was silent; now logs so the user-visible "stale fallback
    // models" symptom is diagnosable. Network errors, auth failures, and
    // malformed JSON all land here and previously vanished.
    console.warn(`[${callerName}:${provider}] failed after retry:`, e);
    if (typeof WF_DEBUG !== 'undefined' && WF_DEBUG.captureFailure) {
      WF_DEBUG.captureFailure({
        code: 'MODELS_FETCH_FAILED',
        provider,
        message: e?.message || String(e)
      });
    }
    // v3.63.145 — Surface the second-attempt failure into the tier
    // classifier error log so a Bundle for Scout shows when fallback was
    // used. Was silent before — bundles only had the bare modelSource:
    // 'model-fallbacks' line with no "live fetch was attempted and failed"
    // diagnostic trail.
    if (typeof window !== 'undefined') {
      window._lastTierClassificationErrors = window._lastTierClassificationErrors || {};
      window._lastTierClassificationErrors[provider] = {
        stage: 'live-fetch-failed-after-retry',
        detail: e?.message || String(e),
        ts: Date.now()
      };
    }
  }
  return null;
}

async function fetchModelsForProvider(provider, opts) {
  opts = opts || {};
  // v3.63.145 — opts._isRetry suppresses the auto-retry-once path in the
  // shared wrapper. See _fetchModelsViaCatalog for the full rationale.
  if (!MODEL_FILTERS[provider]) return null; // no endpoint for this provider

  // Read cache first — that's the only difference vs fetchModelsForProviderLive.
  // v3.63.302 — wfReadVersioned defaults legacy payloads to schema_version=1
  // (every cache blob in the wild before v3.63.302 is implicitly v1). Same
  // shape returned today; the helper just gives future shape changes a hook.
  const cacheKey = `waxframe_models_${provider}`;
  const cached = window.wfReadVersioned(cacheKey, 1);
  if (cached && (Date.now() - cached.ts) < MODELS_CACHE_TTL) return cached.models;

  return _fetchModelsViaCatalog(provider, opts, 'fetchModelsForProvider');
}

function getModelsForProvider(provider) {
  const cacheKey = `waxframe_models_${provider}`;
  // v3.32.11 — defensive dedup at read time. Some provider /v1/models
  // endpoints (notably Mistral) return duplicate entries — same model id
  // listed multiple times. Without dedup, buildModelSelector renders the
  // same model multiple times in the dropdown AND assigns the ✨/🔨 markers
  // to every match, so the same recommendation appears stamped on multiple
  // rows. Dedup is provider-agnostic and idempotent — safe to run on every
  // read regardless of cache state.
  // v3.63.302 — wfReadVersioned handles missing schema_version (defaults to
  // v1) so legacy cache blobs continue to read unchanged.
  let models = [];
  const cached = window.wfReadVersioned(cacheKey, 1);
  if (cached?.models?.length > 0) models = cached.models;
  if (!models.length) models = MODEL_FALLBACKS[provider] || [];
  // Set preserves insertion order, so the first occurrence of each id wins.
  // v3.63.31 — drop quarantined (incapable) models so neither the dropdown
  // nor the recommend candidate list can ever surface one again.
  return [...new Set(models)].filter(id => !isModelIncapable(id));
}

// v3.40.0 — Live model-list fetch that bypasses the read cache.
//
// Identical to fetchModelsForProvider in network behavior, but ignores the
// localStorage cache on read. Still WRITES to the cache on success, so the
// dropdown and recommend pipeline get the fresher list as a side benefit
// every time the watchdog runs. Use this whenever freshness matters more
// than dropdown render speed (the deprecation watchdog) or when explicitly
// refreshing on user demand.
//
// v3.63.274 — the provider-specific transport logic that used to live here
// is in the catalog. This function is now a one-line cache-bypass wrapper
// around _fetchModelsViaCatalog.
async function fetchModelsForProviderLive(provider, opts) {
  opts = opts || {};
  if (!MODEL_FILTERS[provider]) return null;
  return _fetchModelsViaCatalog(provider, opts, 'fetchModelsForProviderLive');
}

// v3.40.0 — Deprecation watchdog.
//
// Runs on every reasonable trigger (app load, tab-visible, round-start) with
// NO throttle. Always live-fetches /v1/models for every keyed AI, bypassing
// the dropdown cache. Compares each AI's saved model against the live list.
// Saved model missing from live list → flag it.
//
// ⚠ COST ASSUMPTION:
// This design assumes /v1/models is and remains FREE across providers.
// As of v3.40.0 release date (May 2026): OpenAI, Anthropic, Google (Gemini),
// xAI (Grok), DeepSeek, and Perplexity all serve /v1/models without token
// charges and without rate-limit concerns at single-user volume.
//
// If ANY provider starts charging for /v1/models, or imposes a rate limit
// that single-user activity could approach, this design becomes wrong and
// needs a throttle reintroduced. Likely shape of the fix: per-provider
// throttle (since one provider charging doesn't justify slowing checks on
// the others), tracked in localStorage with a configurable cooldown.
//
// Why we accepted unthrottled cost: zero token cost + no rate-limit risk +
// async background work = no user-visible cost. Throttling adds complexity
// for no current benefit and creates a stale-data window we explicitly
// want to eliminate (the whole point of this feature).
//
// trigger: 'load' | 'visible' | 'round-start' — controls toast behavior.
//   'load'        → always toast (clean or flagged)
//   'visible'     → silent unless flagged (no "all good" noise on tab return)
//   'round-start' → silent unless flagged (no "all good" mid-flow)
//
// Stores flagged AI ids on window._deprecatedModelFlags for the AI-card
// renderer to read. Side effects: refreshes the dropdown model cache for
// every keyed AI as a free byproduct of every run.
async function detectDeprecatedModels(trigger = 'load') {
  // Build the candidate list — all active AIs with a key on a fetchable
  // provider. Custom AIs without a key but with _modelsEndpoint are
  // excluded for now (their model lists come from a different code path).
  // activeAIs is declared as a top-level `let` in app.js. That creates a
  // global lexical binding, not a window property, so `window.activeAIs`
  // is usually undefined. Resolve the lexical binding at call time so the
  // watchdog checks the live hive after app.js has loaded.
  const activeList = (typeof activeAIs !== 'undefined' && Array.isArray(activeAIs))
    ? activeAIs
    : (Array.isArray(window.activeAIs) ? window.activeAIs : []);
  const candidates = activeList.filter(ai => {
    const cfg = API_CONFIGS[ai.provider];
    return cfg && cfg._key && MODEL_FILTERS[ai.provider];
  });

  if (candidates.length === 0) {
    // Nothing to check — no keyed AIs configured yet. Still toast on load
    // so the user knows the watchdog exists and ran.
    if (trigger === 'load') {
      toast('✓ Worker Bees ready — no models to check yet');
    }
    return { checked: 0, flagged: [] };
  }

  // Fire all checks in parallel — providers don't share endpoints so the
  // network round-trips overlap fully.
  const results = await Promise.all(candidates.map(async ai => {
    const cfg = API_CONFIGS[ai.provider];
    const savedModel = cfg.model;
    const liveList = await fetchModelsForProviderLive(ai.provider);

    // Fetch failure → DO NOT flag. Provider hiccups, rate-limit blips, and
    // CORS misfires should not produce false-positive deprecation warnings.
    if (!liveList || liveList.length === 0) {
      return { ai, savedModel, status: 'fetch_failed' };
    }

    if (liveList.includes(savedModel)) {
      return { ai, savedModel, status: 'ok' };
    }

    return { ai, savedModel, status: 'deprecated', liveList };
  }));

  const flagged = results.filter(r => r.status === 'deprecated');
  const flaggedIds = flagged.map(r => r.ai.id);

  // Stash flagged ids globally for the AI-card renderer to read.
  // Always reassign (don't merge) so a model that came back into
  // availability un-flags itself on the next watchdog run.
  window._deprecatedModelFlags = new Set(flaggedIds);

  // Re-render the AI cards if the Setup screen is currently showing
  // Worker Bees — otherwise the ⚠ marker won't appear until the user
  // navigates back. renderAISetupGrid is no-op when the grid container
  // isn't in the DOM, so call unconditionally.
  try {
    if (typeof renderAISetupGrid === 'function') {
      renderAISetupGrid();
    }
  } catch (e) { /* render is best-effort */ }

  // Toast behavior per trigger.
  if (flagged.length > 0) {
    const names = flagged.map(r => r.ai.name).join(', ');
    toast(`⚠ Worker Bees — ${flagged.length} AI(s) have deprecated models (${names}). Open Setup → Worker Bees to fix.`);
  } else if (trigger === 'load') {
    toast(`✓ Worker Bees ready — model lists refreshed (${candidates.length} checked)`);
  }
  // 'visible' and 'round-start' triggers stay silent when nothing is flagged.

  return { checked: candidates.length, flagged };
}
