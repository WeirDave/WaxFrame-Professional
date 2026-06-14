// ============================================================
//  WaxFrame — shared provider/model logic
// Build: 20260614-008
// ============================================================
// provider-models.js — regex + parse primitives shared between api.js and
// help.html. v3.63.82 introduced this file as the single source of truth;
// v3.63.274 introduced the provider catalog and overrode MODEL_FALLBACKS /
// MODEL_FILTERS at catalog init; v3.63.295 finishes the move — the curated
// fallback lists and per-provider keep-predicates now live exclusively in
// js/provider-catalog.js. This file owns only the primitives the catalog
// can't author (regexes and OpenAI/Anthropic/Google response parsing).
// ════════════════════════════════════════════════════════════════════════
// What lives here now:
//   • STRUCTURAL_NON_CHAT_RE  — regex that blocks image/video/audio/TTS/
//                               embedding/OCR/legacy-Completions models
//   • CHATGPT_RESPONSES_ONLY_RE / DATED_SNAPSHOT_RE — ChatGPT-specific
//                               keep-predicate extras (consumed by the
//                               catalog's filterExtras for the chatgpt entry)
//   • filterModelForProvider — generic keep-test; reads the catalog-
//                              populated MODEL_FILTERS map at call time so
//                              custom-AI ids that don't appear in the
//                              catalog fall back to the structural filter
//   • normalizePerplexityModels — Perplexity-specific provenance helper
//   • parseModelsResponse     — turn a raw /v1/models response into a
//                               filtered id list (+ provenance for Perplexity)
//   • baseProviderId          — map an additional provider's generated id
//                               (cohere_<ts>, together_ai_<ts>) to its base
//   • dedup                   — tiny order-preserving uniqueness helper
//
// What the CATALOG now owns (was here pre-v3.63.295):
//   • MODEL_FALLBACKS  — curated per-provider fallback model lists
//   • MODEL_FILTERS    — per-provider keep predicate composition
//   Both still appear on `window.WFProviderModels` for backward compat,
//   but they're written by js/provider-catalog.js's init code. Helpers in
//   THIS file look them up via root.WFProviderModels.* at call time so the
//   catalog's late-binding override is authoritative.
//
// LOADING: plain browser global script (no modules) — assigns onto window
// so it works identically whether loaded by index.html (before api.js) or
// help.html. Air-gap safe: no imports, no CDNs.
//
// LOAD ORDER: provider-models.js → provider-catalog.js → api.js → app.js
// The catalog MUST load between this file and api.js because the catalog
// populates WFProviderModels.MODEL_FILTERS and MODEL_FALLBACKS, and api.js
// reads those at module-eval.
// ════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  // Structural filter — blocks models whose API contract fundamentally differs
  // from chat-completion. See the full history in the changelog; the v3.63.81
  // additions cover Together AI's image/video/audio families and Mistral's
  // pixtral/voxtral/ocr.
  //
  // v3.63.83 — verified hard-filter additions (official-docs-confirmed wrong
  // endpoint/modality, NOT preferences):
  //   • babbage|davinci|turbo-instruct — OpenAI legacy Completions endpoint
  //     (babbage-002, davinci-002, gpt-3.5-turbo-instruct). Reject /v1/chat/
  //     completions with "not a chat model". Anchored on turbo-instruct so the
  //     real gpt-3.5-turbo / -0125 / -16k chat variants survive.
  //   • flash-live | -live-preview — Gemini Live API (bidirectional streaming),
  //     not the generateContent path WaxFrame uses.
  //   • ^aqa$ — Gemini Attributed-QA specialized retrieval model (exact-match
  //     only; the token is too short for a loose match).
  // Specialized-but-chat-capable models (search-preview, robotics-er, deep-
  // research, vibe-cli, codestral/devstral/Coder, tiny-*) are deliberately NOT
  // hard-filtered — they run on the chat endpoint and belong to a future soft-
  // rank/warn pass, not this structural filter.
  var STRUCTURAL_NON_CHAT_RE = /embed|moderation|whisper|tts|speech|transcribe|rerank|audio|realtime|guard|dall-e|imagen|imagine|veo|lyria|stable-diffusion|safety|computer-use|nano-banana|antigravity|flux|seedream|seedance|happyhorse|pixverse|vidu|wan2|sonic|kokoro|sora|hailuo|video-0|kling|qwen-image|hidream|juggernaut|ideogram|dreamshaper|voxtral|orpheus|parakeet|pixtral|ocr|-image\b|\bimage-|flash-image|-i2v|-t2v|-r2v|e5-|babbage|davinci|turbo-instruct|flash-live|-live-preview|^aqa$/i;

  // ChatGPT extras: -pro / -codex are Responses-API-only; dated snapshots clutter.
  var CHATGPT_RESPONSES_ONLY_RE = /-pro(\b|-)|-codex(\b|-)/i;
  var DATED_SNAPSHOT_RE = /-\d{4}-\d{2}-\d{2}$/;

  // Late-binding accessors — the catalog populates WFProviderModels.MODEL_
  // FILTERS and .MODEL_FALLBACKS during its init (after this file evaluates).
  // Helpers below call these at request time, so they always see the
  // catalog-authored maps, never a stale snapshot.
  function _filters()   { return (root.WFProviderModels && root.WFProviderModels.MODEL_FILTERS)   || {}; }
  function _fallbacks() { return (root.WFProviderModels && root.WFProviderModels.MODEL_FALLBACKS) || {}; }

  // Generic keep test usable for ANY provider id (including custom-AI ids
  // whose id isn't a base key). Applies the provider's specific filter when
  // known, else the shared structural filter.
  function filterModelForProvider(provider, id) {
    if (!id) return false;
    var f = _filters()[provider];
    if (f) return f(id);
    return !STRUCTURAL_NON_CHAT_RE.test(id);
  }

  function dedup(arr) {
    var out = [], seen = {};
    (arr || []).forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  // Map an additional provider's generated id (cohere_<ts>, together_ai_<ts>)
  // to its base provider so the right fallback / filter applies.
  function baseProviderId(id) {
    if (!id) return id;
    var fb = _fallbacks();
    if (fb[id]) return id;
    var m = String(id).match(/^([a-z]+?)(?:_ai)?_\d+$/i);
    if (m && fb[m[1]]) return m[1];
    if (/^together/i.test(id)) return 'together';
    if (/^cohere/i.test(id)) return 'cohere';
    if (/^deepseek/i.test(id)) return 'deepseek';
    return id;
  }

  // Normalize Perplexity model ids: strip the perplexity/ namespace, keep only
  // sonar, then expand a base-only result to the documented Sonar family.
  // Returns a provenance object: { models, modelsSource, sourceDetail?, rawLiveModels }.
  function normalizePerplexityModels(models) {
    var list = dedup((models || [])
      .map(function (id) { return String(id || '').replace(/^perplexity\//i, ''); })
      .filter(function (id) { return filterModelForProvider('perplexity', id); }));
    if (list.length === 1 && list[0] === 'sonar') {
      var documented = (_fallbacks().perplexity || []).slice();
      return {
        models: documented,
        modelsSource: 'documented-sonar-fallback',
        sourceDetail: 'Raw Perplexity /v1/models returned only base Sonar; expanded using Perplexity Sonar API documented model enum.',
        rawLiveModels: dedup(models || [])
      };
    }
    return { models: list, modelsSource: 'live', rawLiveModels: dedup(models || []) };
  }

  // Parse a raw /v1/models (or Anthropic / Google) response into a filtered id
  // list. Returns { models, modelsSource, sourceDetail?, rawLiveModels }.
  function parseModelsResponse(provider, format, data) {
    var models = [];
    var rawLiveModels = [];
    if (format === 'anthropic' || provider === 'claude') {
      models = (data && data.data ? data.data : [])
        .slice()
        .sort(function (a, b) { return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0); })
        .map(function (m) { return m.id; });
      rawLiveModels = models.slice();
    } else if (format === 'google' || provider === 'gemini') {
      models = (data && data.models ? data.models : [])
        .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1; })
        .map(function (m) { return String(m.name || '').replace('models/', ''); })
        .sort().reverse();
      rawLiveModels = (data && data.models ? data.models : []).map(function (m) { return String(m.name || '').replace('models/', ''); });
    } else {
      // OpenAI-compatible: { data: [ { id, created } ] }.
      var arr = Array.isArray(data) ? data : ((data && data.data) || []);
      if (!arr.length && data && Array.isArray(data.models)) arr = data.models;
      if (provider !== 'perplexity') {
        arr = arr.slice().sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
      }
      models = arr.map(function (m) {
        var id = m.id || m.name || m.model;
        return provider === 'perplexity' ? String(id || '').replace(/^perplexity\//i, '') : id;
      });
      rawLiveModels = arr.map(function (m) { return m.id || m.name || m.model; });
      if (provider === 'perplexity') return normalizePerplexityModels(rawLiveModels);
    }
    return {
      models: dedup(models).filter(function (id) { return filterModelForProvider(provider, id); }),
      modelsSource: 'live',
      rawLiveModels: dedup(rawLiveModels.length ? rawLiveModels : models)
    };
  }

  // WFProviderModels exposes the regex/parse primitives plus EMPTY maps for
  // MODEL_FILTERS and MODEL_FALLBACKS. js/provider-catalog.js overwrites
  // those two maps during its init — see the bottom of provider-catalog.js
  // for where that assignment happens. The empty initial values are
  // defensive: if the catalog ever fails to load (broken deploy), the
  // helpers above degrade gracefully (filterModelForProvider falls back to
  // the structural filter; baseProviderId can't map customs to their base
  // but won't crash).
  root.WFProviderModels = {
    MODEL_FALLBACKS: {},
    MODEL_FILTERS: {},
    STRUCTURAL_NON_CHAT_RE: STRUCTURAL_NON_CHAT_RE,
    CHATGPT_RESPONSES_ONLY_RE: CHATGPT_RESPONSES_ONLY_RE,
    DATED_SNAPSHOT_RE: DATED_SNAPSHOT_RE,
    filterModelForProvider: filterModelForProvider,
    normalizePerplexityModels: normalizePerplexityModels,
    parseModelsResponse: parseModelsResponse,
    baseProviderId: baseProviderId,
    dedup: dedup
  };
})(typeof window !== 'undefined' ? window : this);
