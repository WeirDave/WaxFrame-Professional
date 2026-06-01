// ============================================================
//  WaxFrame — shared provider/model logic
// Build: 20260531-036
// ============================================================
// provider-models.js — shared "brain" for provider model logic (v3.63.82)
// ════════════════════════════════════════════════════════════════════════
// Single source of truth for the boring, must-never-drift provider/model
// utilities that BOTH the main app (js/api.js) and the standalone Help page
// (help.html) depend on:
//
//   • MODEL_FALLBACKS         — curated per-provider lists used when a live
//                               /v1/models fetch yields nothing usable
//   • STRUCTURAL_NON_CHAT_RE  — blocks image/video/audio/TTS/embedding/OCR
//                               models that can't run a chat-completion round
//   • CHATGPT_RESPONSES_ONLY_RE / DATED_SNAPSHOT_RE — ChatGPT-specific extras
//   • MODEL_FILTERS           — per-provider keep predicate (structural + extras)
//   • normalizePerplexityModels — strip perplexity/ prefix, filter, then expand
//                               base Sonar to the documented family
//   • parseModelsResponse     — turn a raw /v1/models response into a filtered
//                               id list (+ provenance for Perplexity)
//   • baseProviderId          — map an additional id (cohere_<ts>) to its base
//
// WHY THIS EXISTS: these were previously hand-copied into help.html and kept in
// sync by comment discipline, which drifts. Now there is one definition. The
// Help page keeps its own UI, dump panels, copy buttons, and no-cache
// diagnostic behavior — only this shared logic is centralized.
//
// LOADING: plain browser global script (no modules) — assigns onto window so it
// works identically whether loaded by index.html (before api.js) or help.html.
// Air-gap safe: no imports, no CDNs.
// ════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  var MODEL_FALLBACKS = {
    chatgpt:    ['gpt-4.1', 'gpt-4.1-mini', 'gpt-5.4', 'gpt-5.4-mini'],
    claude:     ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
    gemini:     ['gemini-2.5-flash', 'gemini-2.5-pro'],
    grok:       ['grok-4-fast-non-reasoning', 'grok-4-fast-reasoning', 'grok-4', 'grok-4.20-0309-non-reasoning', 'grok-4.20-0309-reasoning', 'grok-3', 'grok-3-mini'],
    deepseek:   ['deepseek-chat'],
    mistral:    ['mistral-large-latest', 'mistral-small-latest', 'ministral-8b-latest'],
    together:   ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    cohere:     ['command-r-plus', 'command-r', 'command-a-03-2025'],
    perplexity: ['sonar', 'sonar-pro', 'sonar-deep-research', 'sonar-reasoning-pro']
  };

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

  // Per-provider keep predicate. Everyone shares the structural filter; ChatGPT
  // and Perplexity add extras. Providers not listed fall through to a plain
  // structural check via filterModelForProvider below.
  var MODEL_FILTERS = {
    chatgpt:    function (id) { return !STRUCTURAL_NON_CHAT_RE.test(id) && !CHATGPT_RESPONSES_ONLY_RE.test(id) && !DATED_SNAPSHOT_RE.test(id); },
    claude:     function (id) { return !STRUCTURAL_NON_CHAT_RE.test(id); },
    gemini:     function (id) { return !STRUCTURAL_NON_CHAT_RE.test(id); },
    grok:       function (id) { return !STRUCTURAL_NON_CHAT_RE.test(id); },
    deepseek:   function (id) { return !STRUCTURAL_NON_CHAT_RE.test(id); },
    // Perplexity's /v1/models is a gateway reselling frontier models + embeds;
    // its unique value is the Sonar line, so whitelist ^sonar only.
    perplexity: function (id) { return !STRUCTURAL_NON_CHAT_RE.test(id) && /^sonar/i.test(id); }
  };

  // Generic keep test usable for ANY provider id (including additionals whose
  // id isn't a base key). Applies the provider's specific filter when known,
  // else the shared structural filter.
  function filterModelForProvider(provider, id) {
    if (!id) return false;
    var f = MODEL_FILTERS[provider];
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
    if (MODEL_FALLBACKS[id]) return id;
    var m = String(id).match(/^([a-z]+?)(?:_ai)?_\d+$/i);
    if (m && MODEL_FALLBACKS[m[1]]) return m[1];
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
      return {
        models: MODEL_FALLBACKS.perplexity.slice(),
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

  root.WFProviderModels = {
    MODEL_FALLBACKS: MODEL_FALLBACKS,
    STRUCTURAL_NON_CHAT_RE: STRUCTURAL_NON_CHAT_RE,
    CHATGPT_RESPONSES_ONLY_RE: CHATGPT_RESPONSES_ONLY_RE,
    DATED_SNAPSHOT_RE: DATED_SNAPSHOT_RE,
    MODEL_FILTERS: MODEL_FILTERS,
    filterModelForProvider: filterModelForProvider,
    normalizePerplexityModels: normalizePerplexityModels,
    parseModelsResponse: parseModelsResponse,
    baseProviderId: baseProviderId,
    dedup: dedup
  };
})(typeof window !== 'undefined' ? window : this);
