// ============================================================
//  WaxFrame — pricing Worker: model roster check
//  Build: 20261012-005
//  Author: WeirDave (R David Paine III) | License: AGPL-3.0
//  GitHub: github.com/WeirDave/WaxFrame-Professional
//
//  Asks each provider which models exist RIGHT NOW, using the provider's
//  own model-list endpoint and an API key held as a Worker secret, and
//  compares the answer with the models the seed tracks.
//
//  Why this exists. The weekly pricing refresh (src/index.js) only ever
//  refreshes rows it already has: it never adds, renames or removes one.
//  So a provider retiring a model, or shipping a new flagship, was found
//  by hand or not at all. 2026-09/10 found three that way — Perplexity's
//  sonar-reasoning (retired 2025-12-15, failing quietly for months),
//  xAI's grok-4.7 (new flagship, the default was a generation behind) and
//  Google's gemini-3.8-flash (3.5 Flash dropped from the pricing page).
//  A model-list endpoint answers "does this id exist" directly, with no
//  language model reading a web page in the middle.
//
//  What it reports, by email and on the status page:
//    ROSTER MISSING  a tracked model is not in the provider's list.
//                    Repeats every run until the seed is fixed, because
//                    it is always actionable.
//    ROSTER NEW      a chat-style model appeared since the last run and
//                    is not tracked. Reported once.
//    ROSTER BASELINE the first successful run for a provider: how many
//                    models it lists and a sample of the untracked ones.
//    ROSTER ERROR    the list request failed or came back unreadable.
//                    Reported when it starts, not every week.
//
//  What it does NOT do: change the seed, KV pricing data, or the app's
//  catalog. It only reports; a person decides. And it cannot see a model
//  that is retired but still listed or routed to a successor (Google
//  keeps answering for gemini-3.5-flash) — that case shows up as ROSTER
//  NEW for the successor, not as MISSING for the old id.
//
//  Providers without a key are skipped silently. Perplexity has no model
//  list endpoint WaxFrame can rely on (see js/provider-catalog.js,
//  'perplexity-self'), so it is not covered here.
//
//  Pure and injectable on purpose: fetch and state are passed in, so
//  tools/pricing-worker/test-roster.mjs runs every branch with no network.
// ============================================================

const FETCH_TIMEOUT_MS = 15000;
const MAX_SAMPLE_IDS = 12; // untracked ids named per provider in a BASELINE line

// One entry per model-list endpoint. `seedProviders` are the ids in
// data/pricing-seed.json whose tracked models this list is checked
// against (Gemini's free and paid rows share one list). `keyEnv` is the
// Worker secret holding the key: `wrangler secret put <keyEnv>`.
// `addedAlerts: false` keeps NEW lines off providers whose lists are
// dominated by third-party open models (Together), where "a new model
// appeared" is weekly noise — they still get MISSING and ERROR.
export const ROSTER_SOURCES = [
  { id: 'claude',   label: 'Anthropic (Claude)', seedProviders: ['claude'],                     keyEnv: 'ROSTER_KEY_CLAUDE',   kind: 'anthropic',
    url: 'https://api.anthropic.com/v1/models?limit=1000', headers: key => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }) },
  { id: 'chatgpt',  label: 'OpenAI (ChatGPT)',   seedProviders: ['chatgpt'],                    keyEnv: 'ROSTER_KEY_CHATGPT',  kind: 'openai',
    url: 'https://api.openai.com/v1/models', headers: key => ({ Authorization: `Bearer ${key}` }) },
  { id: 'gemini',   label: 'Google (Gemini)',    seedProviders: ['gemini-free', 'gemini-paid'], keyEnv: 'ROSTER_KEY_GEMINI',   kind: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', headers: key => ({ 'x-goog-api-key': key }), paged: true },
  { id: 'grok',     label: 'xAI (Grok)',         seedProviders: ['grok'],                       keyEnv: 'ROSTER_KEY_GROK',     kind: 'openai',
    url: 'https://api.x.ai/v1/models', headers: key => ({ Authorization: `Bearer ${key}` }) },
  { id: 'mistral',  label: 'Mistral',            seedProviders: ['mistral'],                    keyEnv: 'ROSTER_KEY_MISTRAL',  kind: 'openai',
    url: 'https://api.mistral.ai/v1/models', headers: key => ({ Authorization: `Bearer ${key}` }) },
  { id: 'deepseek', label: 'DeepSeek',           seedProviders: ['deepseek'],                   keyEnv: 'ROSTER_KEY_DEEPSEEK', kind: 'openai',
    url: 'https://api.deepseek.com/v1/models', headers: key => ({ Authorization: `Bearer ${key}` }) },
  { id: 'cohere',   label: 'Cohere',             seedProviders: ['cohere'],                     keyEnv: 'ROSTER_KEY_COHERE',   kind: 'cohere',
    url: 'https://api.cohere.com/v1/models?page_size=1000', headers: key => ({ Authorization: `Bearer ${key}` }) },
  { id: 'together', label: 'Together AI',        seedProviders: ['together'],                   keyEnv: 'ROSTER_KEY_TOGETHER', kind: 'together',
    url: 'https://api.together.xyz/v1/models', headers: key => ({ Authorization: `Bearer ${key}` }), addedAlerts: false }
];

// ── Id handling ──────────────────────────────────────────────────────

// Providers list dated snapshots next to (or instead of) the alias a
// person types: gpt-5.5-2026-08-07, claude-opus-4-8-20261001, ...-09-2025.
// Fold a snapshot to its base id so a new snapshot of a tracked model is
// not a "new model", and a list that only carries snapshots still
// satisfies a tracked alias. Aliases ending -latest are left alone:
// mistral-large-latest is itself a tracked id.
const DATED_SUFFIX_RE = /-(?:20\d{2}-\d{2}-\d{2}|20\d{6}|\d{2}-20\d{2}|\d{4})$/;
export function normalizeId(id) {
  return String(id || '').trim().replace(/^models\//, '').replace(DATED_SUFFIX_RE, '');
}

// Models that exist in a list but cannot run a WaxFrame round (speech,
// embeddings, image/video generation, moderation, realtime). Conservative
// by design: a miss only costs one extra NEW line, an over-broad pattern
// could hide a real new chat model.
const NON_CHAT_RE = /(embed|tts|whisper|transcrib|speech|audio|realtime|imagen|image|veo|video|sora|dall-?e|moderation|rerank|guard|live|babbage|davinci|aqa|robotics|diffusion|flux|lyria|music|classif|safety|ocr|translate)/i;
export function isChatLike(id) {
  return !!id && !NON_CHAT_RE.test(id);
}

// ── Response parsers: one per provider shape → array of raw ids ──────
// Return null when the body is not the shape that provider documents, so
// the caller can report an unreadable response instead of an empty roster
// (an empty list read as "everything is missing" would be a false alarm).
export function parseModelList(kind, json) {
  if (kind === 'openai' || kind === 'anthropic') {
    const rows = json && Array.isArray(json.data) ? json.data : null;
    return rows ? rows.map(m => m && m.id).filter(Boolean) : null;
  }
  if (kind === 'gemini') {
    const rows = json && Array.isArray(json.models) ? json.models : null;
    if (!rows) return null;
    return rows
      .filter(m => !Array.isArray(m.supportedGenerationMethods) || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => String(m.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  }
  if (kind === 'cohere') {
    const rows = json && Array.isArray(json.models) ? json.models : null;
    if (!rows) return null;
    return rows
      .filter(m => !Array.isArray(m.endpoints) || m.endpoints.includes('chat'))
      .map(m => m && m.name).filter(Boolean);
  }
  if (kind === 'together') {
    // Together returns a bare array; other gateways wrap it in {data}.
    const rows = Array.isArray(json) ? json : (json && Array.isArray(json.data) ? json.data : null);
    if (!rows) return null;
    return rows.filter(m => !m.type || m.type === 'chat' || m.type === 'language').map(m => m && m.id).filter(Boolean);
  }
  return null;
}

// A tracked id is present if the list carries it directly, or carries a
// dated snapshot of it (normalizeId folds those to the same base).
export function idPresent(trackedId, normalizedSet) {
  return normalizedSet.has(trackedId) || normalizedSet.has(normalizeId(trackedId));
}

export function trackedIdsFor(source, seed) {
  const ids = new Set();
  (seed && seed.providers || []).forEach(p => {
    if (!source.seedProviders.includes(p.id)) return;
    (p.models || []).forEach(m => { if (m.status !== 'unsupported') ids.add(m.id); });
  });
  return Array.from(ids);
}

// ── Comparison ───────────────────────────────────────────────────────
// Newest-looking first: a numeric-aware descending sort puts gpt-5.6 before
// gpt-4, claude-sonnet-5-5 before claude-sonnet-4-5 and gemini-3.8 before
// gemini-2.5. The first BASELINE run named the first 12 in plain alphabetical
// order, which hid exactly the models worth seeing behind "+30 more".
export function newestFirst(ids) {
  return ids.slice().sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
}

// `current` and `previous` are arrays of normalized ids; previous is null
// the first time (the baseline run).
export function diffRoster({ tracked, current, previous, addedAlerts = true }) {
  const currentSet = new Set(current);
  const trackedNorm = new Set(tracked.map(normalizeId).concat(tracked));
  const missing = tracked.filter(id => !idPresent(id, currentSet));
  const untracked = newestFirst(current.filter(id => !trackedNorm.has(id) && isChatLike(id)));
  if (!previous) return { missing, added: [], untracked, baselineUntracked: untracked };
  const previousSet = new Set(previous);
  const added = addedAlerts ? untracked.filter(id => !previousSet.has(id)) : [];
  return { missing, added, untracked, baselineUntracked: null };
}

// ── Network ──────────────────────────────────────────────────────────
// Never puts the key, a header or a response body into an error string:
// the message ends up in an email and on a public status page.
export async function fetchRoster(source, key, fetchImpl) {
  const all = [];
  let url = source.url;
  for (let page = 0; page < 5; page++) {
    let resp;
    try {
      resp = await fetchImpl(url, { headers: source.headers(key), signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined });
    } catch (e) {
      return { ok: false, error: 'model list request did not complete (network or timeout)' };
    }
    if (!resp.ok) return { ok: false, error: `model list request failed (HTTP ${resp.status})` };
    let json;
    try { json = await resp.json(); } catch (e) { return { ok: false, error: 'model list response was not JSON' }; }
    const ids = parseModelList(source.kind, json);
    if (!ids) return { ok: false, error: 'model list response was not in the documented shape' };
    all.push(...ids);
    if (source.paged && json.nextPageToken) {
      const next = new URL(source.url);
      next.searchParams.set('pageToken', json.nextPageToken);
      url = next.toString();
      continue;
    }
    break;
  }
  if (!all.length) return { ok: false, error: 'model list came back empty' };
  return { ok: true, ids: Array.from(new Set(all.map(normalizeId))).sort() };
}

// ── The run ──────────────────────────────────────────────────────────
// previousState: { [sourceId]: { ok, ids, error, ... } } from KV, or {}.
// Returns the next state and the alert lines. Writes nothing.
export async function runRoster({ env, seed, previousState, fetchImpl, nowIso, sources = ROSTER_SOURCES }) {
  const state = {};
  const alertLines = [];

  for (const source of sources) {
    const prev = (previousState && previousState[source.id]) || null;
    const key = env && env[source.keyEnv];
    if (!key) {
      state[source.id] = { skipped: true, ts: nowIso, ids: prev && prev.ids || null };
      continue;
    }

    const res = await fetchRoster(source, key, fetchImpl);
    if (!res.ok) {
      state[source.id] = { ok: false, error: res.error, ts: nowIso, ids: prev && prev.ids || null };
      const alreadyReported = prev && prev.ok === false && prev.error === res.error;
      if (!alreadyReported) alertLines.push(`ROSTER ERROR   ${source.id} (${source.label}): ${res.error}`);
      continue;
    }

    const tracked = trackedIdsFor(source, seed);
    const previous = prev && Array.isArray(prev.ids) ? prev.ids : null;
    const quiet = source.addedAlerts === false;
    const { missing, added, untracked, baselineUntracked } = diffRoster({ tracked, current: res.ids, previous, addedAlerts: !quiet });

    // The full untracked list is kept (and shown on the status page) so it can
    // be read in one place instead of being truncated into an email. Not kept
    // for a source whose list is mostly third-party models (Together): naming
    // 180 of them helps nobody.
    state[source.id] = { ok: true, ts: nowIso, ids: res.ids, count: res.ids.length, missing, added, untracked: quiet ? [] : untracked, untrackedCount: untracked.length };

    missing.forEach(id => alertLines.push(`ROSTER MISSING ${source.id}/${id} (${source.label}): tracked, but not in the provider's current model list — retired or renamed; confirm in the provider's docs, then fix the catalog and seed together`));
    added.forEach(id => alertLines.push(`ROSTER NEW     ${source.id}/${id} (${source.label}): appeared in the provider's model list since the last check and is not tracked`));
    if (baselineUntracked && quiet) {
      alertLines.push(`ROSTER BASELINE ${source.id} (${source.label}): first check recorded ${res.ids.length} models, ${tracked.length - missing.length} of ${tracked.length} tracked ones found; ${baselineUntracked.length} others are not tracked and are not listed (this provider's list is mostly third-party models)`);
    } else if (baselineUntracked) {
      const shown = baselineUntracked.slice(0, MAX_SAMPLE_IDS).join(', ');
      const more = baselineUntracked.length > MAX_SAMPLE_IDS ? ` (+${baselineUntracked.length - MAX_SAMPLE_IDS} more)` : '';
      alertLines.push(`ROSTER BASELINE ${source.id} (${source.label}): first check recorded ${res.ids.length} models, ${tracked.length - missing.length} of ${tracked.length} tracked ones found; ${baselineUntracked.length} chat-style models are not tracked${baselineUntracked.length ? ', newest first: ' + shown + more + '; the full list is on the status page' : ''}`);
    }
  }

  return { state, alertLines };
}
