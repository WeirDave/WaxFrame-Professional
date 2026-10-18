#!/usr/bin/env node
// ============================================================
// tools/pricing-worker/test-roster.mjs
//
// Behaviour tests for the model roster check (src/roster.js). No network,
// no KV: fetch and state are injected, so every branch runs offline. Wired
// into tools/release-check.mjs next to test-refresh-logic.mjs.
//
// What is and is not proven. The response shapes below follow each
// provider's documented model-list format. They are NOT captured from live
// calls (no provider keys are available to the author), so the first real
// run with a key is the proof for that provider — the Worker's manual
// POST /api/roster exists for exactly that, and an unreadable response is
// reported as ROSTER ERROR rather than read as an empty roster.
//
// Run: node tools/pricing-worker/test-roster.mjs
// Exit 0 if every assertion passes; exit 1 with FAIL lines otherwise.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeId, isChatLike, parseModelList, idPresent, trackedIdsFor, diffRoster, fetchRoster, runRoster, newestFirst, ROSTER_SOURCES } from './src/roster.js';
import { buildStatusHtml } from './src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(HERE, 'data/pricing-seed.json'), 'utf8'));

let failures = 0;
function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { failures++; console.log(`  FAIL ${label}\n       expected: ${e}\n       actual:   ${a}`); }
  else console.log(`  ok   ${label}`);
}
function assert(cond, label) {
  if (!cond) { failures++; console.log(`  FAIL ${label}`); } else console.log(`  ok   ${label}`);
}

const src = id => ROSTER_SOURCES.find(s => s.id === id);
const NOW = '2026-10-11T12:00:00Z';
const KEY = 'FAKE-roster-test-credential-not-real-0001';

// A fake fetch that serves one JSON body (or status) per URL prefix.
function fakeFetch(routes) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, headers: init && init.headers });
    const hit = Object.keys(routes).find(p => String(url).startsWith(p));
    if (!hit) throw new Error('no route for ' + url);
    const r = routes[hit];
    if (r instanceof Error) throw r;
    if (typeof r === 'function') return r(url);
    return { ok: r.status ? r.status < 400 : true, status: r.status || 200, json: async () => { if (r.notJson) throw new Error('bad json'); return r.body; } };
  };
  f.calls = calls;
  return f;
}

// ── id handling ──────────────────────────────────────────────────────
console.log('normalizeId — dated snapshots fold to their base, aliases are left alone');
assertEqual(normalizeId('gpt-5.5-2026-08-07'), 'gpt-5.5', 'ISO date suffix');
assertEqual(normalizeId('claude-opus-4-8-20261001'), 'claude-opus-4-8', 'compact date suffix');
assertEqual(normalizeId('gemini-2.5-flash-preview-09-2025'), 'gemini-2.5-flash-preview', 'month-year suffix');
assertEqual(normalizeId('mistral-small-2506'), 'mistral-small', 'four-digit suffix');
assertEqual(normalizeId('mistral-large-latest'), 'mistral-large-latest', '-latest alias is kept: it is itself a tracked id');
assertEqual(normalizeId('models/gemini-3.8-flash'), 'gemini-3.8-flash', 'Gemini models/ prefix removed');
assertEqual(normalizeId('grok-4.20-0309-reasoning'), 'grok-4.20-0309-reasoning', 'a date in the middle is not a suffix');

console.log('\nisChatLike — non-chat families are ignored');
['text-embedding-3-large', 'gpt-realtime', 'whisper-1', 'gemini-3.8-flash-tts', 'imagen-4', 'dall-e-3', 'omni-moderation-latest', 'gemini-3.1-flash-live-preview', 'veo-3'].forEach(id => assert(!isChatLike(id), `${id} is not chat-like`));
['gpt-5.5', 'claude-opus-4-8', 'gemini-3.8-flash', 'grok-4.7', 'mistral-large-latest', 'deepseek-flash', 'command-a-03-2025'].forEach(id => assert(isChatLike(id), `${id} is chat-like`));

// ── parsers ──────────────────────────────────────────────────────────
console.log('\nparseModelList — each provider shape, and a wrong shape is null not empty');
assertEqual(parseModelList('openai', { data: [{ id: 'gpt-5.5' }, { id: 'o9' }] }), ['gpt-5.5', 'o9'], 'openai-style {data:[{id}]}');
assertEqual(parseModelList('anthropic', { data: [{ id: 'claude-opus-4-8', type: 'model' }], has_more: false }), ['claude-opus-4-8'], 'anthropic {data:[{id}]}');
assertEqual(parseModelList('gemini', { models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding-9', supportedGenerationMethods: ['embedContent'] }] }), ['gemini-3.8-flash'], 'gemini keeps generateContent models, strips models/');
assertEqual(parseModelList('cohere', { models: [{ name: 'command-a-03-2025', endpoints: ['chat', 'generate'] }, { name: 'embed-v9', endpoints: ['embed'] }] }), ['command-a-03-2025'], 'cohere keeps chat-capable models');
assertEqual(parseModelList('together', [{ id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', type: 'chat' }, { id: 'black-forest-labs/FLUX', type: 'image' }]), ['meta-llama/Llama-3.3-70B-Instruct-Turbo'], 'together bare array, chat only');
['openai', 'anthropic', 'gemini', 'cohere', 'together'].forEach(k => assertEqual(parseModelList(k, { error: 'nope' }), null, `${k}: an error body is null, not an empty list`));
assertEqual(parseModelList('openai', null), null, 'null body');

// ── presence & tracked ids ───────────────────────────────────────────
console.log('\nidPresent / trackedIdsFor');
assert(idPresent('claude-opus-4-8', new Set(['claude-opus-4-8'])), 'direct hit');
assert(idPresent('gpt-5.5', new Set([normalizeId('gpt-5.5-2026-08-07')])), 'a list carrying only a dated snapshot still satisfies the tracked alias');
assert(!idPresent('sonar-reasoning', new Set(['sonar', 'sonar-pro'])), 'absent id is absent');
const geminiTracked = trackedIdsFor(src('gemini'), seed);
assert(geminiTracked.includes('gemini-3.8-flash') && geminiTracked.includes('gemini-3.1-pro-preview'), 'gemini free+paid rows share one list');
assertEqual(geminiTracked.length, new Set(geminiTracked).size, 'no duplicates across the two Gemini seed providers');
assert(!trackedIdsFor({ seedProviders: ['copilot'] }, seed).length, 'unsupported (copilot) models are never expected in a list');

// ── diff ─────────────────────────────────────────────────────────────
console.log('\ndiffRoster');
{
  const d = diffRoster({ tracked: ['a-1', 'b-2'], current: ['a-1', 'c-3', 'x-tts'], previous: null });
  assertEqual(d.missing, ['b-2'], 'baseline: tracked-but-absent is missing');
  assertEqual(d.baselineUntracked, ['c-3'], 'baseline: untracked chat-like models are sampled, tts is not');
  assertEqual(d.added, [], 'baseline reports nothing as "new"');
  const d2 = diffRoster({ tracked: ['a-1'], current: ['a-1', 'c-3', 'd-4'], previous: ['a-1', 'c-3'] });
  assertEqual(d2.added, ['d-4'], 'later run: only ids absent last time are new');
  assertEqual(d2.baselineUntracked, null, 'later run has no baseline');
  const d3 = diffRoster({ tracked: ['a-1'], current: ['a-1', 'd-4'], previous: ['a-1'], addedAlerts: false });
  assertEqual(d3.added, [], 'addedAlerts:false suppresses NEW');
}

// ── newest first / full untracked list ───────────────────────────────
console.log('\nnewestFirst and the stored untracked list');
{
  assertEqual(newestFirst(['gpt-4', 'gpt-5.6-sol', 'gpt-4o', 'gpt-5.5', 'gpt-3.5-turbo']), ['gpt-5.6-sol', 'gpt-5.5', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'], 'numeric-aware, newest-looking first (not plain alphabetical)');
  assertEqual(newestFirst(['claude-sonnet-4-5', 'claude-sonnet-5-5', 'claude-opus-5']), ['claude-sonnet-5-5', 'claude-sonnet-4-5', 'claude-opus-5'], 'claude ids order by version within a family');
  assertEqual(newestFirst(['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.10-flash']), ['gemini-3.10-flash', 'gemini-3.8-flash', 'gemini-2.5-flash'], '3.10 sorts after 3.8, not before it');

  // 30 old models then one newer one: the newer one must be named in the capped baseline sample.
  const old = Array.from({ length: 30 }, (_, i) => 'gpt-3.5-v' + String(i).padStart(2, '0'));
  const list = [...old, 'gpt-9-new'];
  const f2 = fakeFetch({ 'https://api.openai.com': { body: { data: list.map(id => ({ id })) } } });
  const r = await runRoster({ env: { ROSTER_KEY_CHATGPT: KEY }, seed: { providers: [{ id: 'chatgpt', models: [] }] }, previousState: {}, fetchImpl: f2, nowIso: NOW });
  assert(r.alertLines[0].includes('gpt-9-new'), 'the newest model is inside the 12 named in the baseline line, not hidden behind "+N more"');
  assert(r.alertLines[0].includes('full list is on the status page'), 'the baseline line points at the status page');
  assertEqual(r.state.chatgpt.untracked.length, 31, 'the FULL untracked list is stored, not the capped sample');
  assertEqual(r.state.chatgpt.untracked[0], 'gpt-9-new', 'stored list is newest first');
  assertEqual(r.state.chatgpt.untrackedCount, 31, 'count stored');

  // the list is recomputed every run, so it stays current after the baseline.
  const r2 = await runRoster({ env: { ROSTER_KEY_CHATGPT: KEY }, seed: { providers: [{ id: 'chatgpt', models: [] }] }, previousState: r.state, fetchImpl: f2, nowIso: NOW });
  assertEqual(r2.alertLines, [], 'second run is silent');
  assertEqual(r2.state.chatgpt.untracked.length, 31, 'untracked list is still present on a later run');

  // Together: no names in the email, nothing stored.
  const t = fakeFetch({ 'https://api.together.xyz': { body: Array.from({ length: 50 }, (_, i) => ({ id: 'vendor/model-' + i, type: 'chat' })) } });
  const tr = await runRoster({ env: { ROSTER_KEY_TOGETHER: KEY }, seed: { providers: [{ id: 'together', models: [] }] }, previousState: {}, fetchImpl: t, nowIso: NOW });
  assert(!tr.alertLines[0].includes('vendor/model-'), 'Together: the baseline names no third-party models');
  assert(/50 others are not tracked/.test(tr.alertLines[0]), 'Together: the baseline still gives the count');
  assertEqual(tr.state.together.untracked, [], 'Together: no list is stored');
}

// ── network ──────────────────────────────────────────────────────────
console.log('\nfetchRoster — failures become a short message that never carries the key');
{
  const s = src('chatgpt');
  const ok = await fetchRoster(s, KEY, fakeFetch({ 'https://api.openai.com': { body: { data: [{ id: 'gpt-5.5-2026-08-07' }, { id: 'gpt-5.5' }] } } }));
  assertEqual(ok, { ok: true, ids: ['gpt-5.5'] }, 'ok: ids normalized, deduped, sorted');
  const f401 = await fetchRoster(s, KEY, fakeFetch({ 'https://api.openai.com': { status: 401, body: { error: `bad key ${KEY}` } } }));
  assertEqual(f401, { ok: false, error: 'model list request failed (HTTP 401)' }, 'HTTP error reports the status only');
  const net = await fetchRoster(s, KEY, fakeFetch({ 'https://api.openai.com': new Error(`connect failed for ${KEY}`) }));
  assert(!net.ok && !JSON.stringify(net).includes(KEY), 'a thrown error does not leak the key');
  const notJson = await fetchRoster(s, KEY, fakeFetch({ 'https://api.openai.com': { notJson: true } }));
  assertEqual(notJson.error, 'model list response was not JSON', 'non-JSON body');
  const wrong = await fetchRoster(s, KEY, fakeFetch({ 'https://api.openai.com': { body: { hello: 1 } } }));
  assertEqual(wrong.error, 'model list response was not in the documented shape', 'wrong shape');
  const empty = await fetchRoster(s, KEY, fakeFetch({ 'https://api.openai.com': { body: { data: [] } } }));
  assertEqual(empty.error, 'model list came back empty', 'an empty list is an error, not "everything is missing"');
  // header handling
  const f = fakeFetch({ 'https://api.openai.com': { body: { data: [{ id: 'gpt-5.5' }] } } });
  await fetchRoster(s, KEY, f);
  assertEqual(f.calls[0].headers, { Authorization: `Bearer ${KEY}` }, 'key goes in a header');
  assert(!f.calls[0].url.includes(KEY), 'key is never in the URL');
  const g = fakeFetch({ 'https://generativelanguage.googleapis.com': { body: { models: [{ name: 'models/gemini-3.8-flash' }] } } });
  await fetchRoster(src('gemini'), KEY, g);
  assert(!g.calls[0].url.includes(KEY) && g.calls[0].headers['x-goog-api-key'] === KEY, 'gemini key is a header, not a query parameter');
  // pagination
  let page = 0;
  const paged = await fetchRoster(src('gemini'), KEY, fakeFetch({ 'https://generativelanguage.googleapis.com': () => {
    page++;
    return { ok: true, status: 200, json: async () => page === 1
      ? { models: [{ name: 'models/gemini-3.8-flash' }], nextPageToken: 'T2' }
      : { models: [{ name: 'models/gemini-3.6-flash' }] } };
  } }));
  assertEqual(paged.ids, ['gemini-3.6-flash', 'gemini-3.8-flash'], 'follows nextPageToken');
}

// ── the run ──────────────────────────────────────────────────────────
console.log('\nrunRoster — keys, baseline, drift, errors');
{
  // Skipped without a key: silent.
  const none = await runRoster({ env: {}, seed, previousState: {}, fetchImpl: fakeFetch({}), nowIso: NOW });
  assertEqual(none.alertLines, [], 'no keys configured: no alerts, no fetches');
  assert(Object.values(none.state).every(v => v.skipped), 'every source recorded as skipped');

  // Baseline, using the real seed: Gemini lists the new model and the retired one is still listed.
  const env = { ROSTER_KEY_GEMINI: KEY };
  const geminiList = ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-3.9-flash', 'text-embedding-9'];
  const mk = ids => fakeFetch({ 'https://generativelanguage.googleapis.com': { body: { models: ids.map(n => ({ name: 'models/' + n, supportedGenerationMethods: n.startsWith('text-emb') ? ['embedContent'] : ['generateContent'] })) } } });
  const r1 = await runRoster({ env, seed, previousState: {}, fetchImpl: mk(geminiList), nowIso: NOW });
  assertEqual(r1.alertLines.length, 1, 'baseline: exactly one line');
  assert(/^ROSTER BASELINE gemini /.test(r1.alertLines[0]) && r1.alertLines[0].includes('gemini-3.9-flash') && r1.alertLines[0].includes('gemini-3.5-flash'), 'baseline names the untracked models, including a still-listed retired one');
  assert(!r1.alertLines[0].includes('text-embedding'), 'baseline does not name embeddings');
  assertEqual(r1.state.gemini.missing, [], 'all tracked Gemini models found');

  // Next week: a new model appears; nothing else changes.
  const r2 = await runRoster({ env, seed, previousState: r1.state, fetchImpl: mk([...geminiList, 'gemini-4.0-flash']), nowIso: NOW });
  assertEqual(r2.alertLines.length, 1, 'new model: exactly one line');
  assert(/^ROSTER NEW +gemini\/gemini-4\.0-flash /.test(r2.alertLines[0]), 'names the new model');
  // And it is not repeated the week after.
  const r3 = await runRoster({ env, seed, previousState: r2.state, fetchImpl: mk([...geminiList, 'gemini-4.0-flash']), nowIso: NOW });
  assertEqual(r3.alertLines, [], 'a new model is reported once');

  // A tracked model disappears: reported every run until fixed.
  const without = geminiList.filter(n => n !== 'gemini-3.1-flash-lite');
  const r4 = await runRoster({ env, seed, previousState: r1.state, fetchImpl: mk(without), nowIso: NOW });
  assert(r4.alertLines.some(l => /^ROSTER MISSING gemini\/gemini-3\.1-flash-lite /.test(l)), 'a vanished tracked model is MISSING');
  const r5 = await runRoster({ env, seed, previousState: r4.state, fetchImpl: mk(without), nowIso: NOW });
  assert(r5.alertLines.some(l => l.startsWith('ROSTER MISSING')), 'MISSING repeats while the seed is still wrong');

  // Errors: reported when they start, not weekly; the baseline survives; recovery does not flood.
  const bad = fakeFetch({ 'https://generativelanguage.googleapis.com': { status: 403, body: {} } });
  const e1 = await runRoster({ env, seed, previousState: r1.state, fetchImpl: bad, nowIso: NOW });
  assertEqual(e1.alertLines.length, 1, 'new error: one line');
  assert(/^ROSTER ERROR +gemini /.test(e1.alertLines[0]) && !e1.alertLines[0].includes(KEY), 'error line names the provider, not the key');
  assertEqual(e1.state.gemini.ids, r1.state.gemini.ids, 'a failed run keeps the previous ids as the baseline');
  const e2 = await runRoster({ env, seed, previousState: e1.state, fetchImpl: bad, nowIso: NOW });
  assertEqual(e2.alertLines, [], 'the same error next week is not repeated');
  const rec = await runRoster({ env, seed, previousState: e2.state, fetchImpl: mk(geminiList), nowIso: NOW });
  assertEqual(rec.alertLines, [], 'recovery with an unchanged roster is silent');

  // First-ever run failing (typo in the secret) is worth one line.
  const e0 = await runRoster({ env, seed, previousState: {}, fetchImpl: bad, nowIso: NOW });
  assertEqual(e0.alertLines.length, 1, 'a key that fails on the very first run is reported');

  // Together: no NEW lines, but MISSING still works.
  const tEnv = { ROSTER_KEY_TOGETHER: KEY };
  const t = ids => fakeFetch({ 'https://api.together.xyz': { body: ids.map(id => ({ id, type: 'chat' })) } });
  const tBase = await runRoster({ env: tEnv, seed, previousState: {}, fetchImpl: t(['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'x/old']), nowIso: NOW });
  const tNew = await runRoster({ env: tEnv, seed, previousState: tBase.state, fetchImpl: t(['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'x/old', 'x/brand-new']), nowIso: NOW });
  assertEqual(tNew.alertLines, [], 'Together: a new third-party model is not an alert');
  const tGone = await runRoster({ env: tEnv, seed, previousState: tBase.state, fetchImpl: t(['x/old']), nowIso: NOW });
  assert(tGone.alertLines.some(l => l.startsWith('ROSTER MISSING together/')), 'Together: a vanished tracked model still is');
}

// ── incident replays ─────────────────────────────────────────────────
console.log('\nIncident replays — the three drifts that were found by hand');
{
  // 1. xAI grok-4.7 shipped while the seed defaulted to grok-4.5.
  const oldSeed = JSON.parse(JSON.stringify(seed));
  const grok = oldSeed.providers.find(p => p.id === 'grok');
  grok.models = grok.models.filter(m => m.id !== 'grok-4.7');
  const xList = fakeFetch({ 'https://api.x.ai': { body: { data: ['grok-4.7', 'grok-4.5', 'grok-4.3', 'grok-4.20-0309-reasoning'].map(id => ({ id })) } } });
  const base = await runRoster({ env: { ROSTER_KEY_GROK: KEY }, seed: oldSeed, previousState: {}, fetchImpl: xList, nowIso: NOW });
  assert(base.alertLines[0].includes('grok-4.7'), 'grok-4.7 is surfaced the first time the check sees the list');
  const pre = { grok: { ok: true, ids: ['grok-4.3', 'grok-4.5', 'grok-4.20-0309-reasoning'] } };
  const weekOf = await runRoster({ env: { ROSTER_KEY_GROK: KEY }, seed: oldSeed, previousState: pre, fetchImpl: xList, nowIso: NOW });
  assert(/^ROSTER NEW +grok\/grok-4\.7 /.test(weekOf.alertLines[0]), 'grok-4.7 appearing is a ROSTER NEW line the week it ships');

  // 2. Google's pricing page dropped gemini-3.5-flash. The model list may still carry it
  //    (it is routed to 3.6), so it is NOT reported MISSING — the successor is what shows up.
  const oldG = JSON.parse(JSON.stringify(seed));
  oldG.providers.filter(p => p.id.startsWith('gemini-')).forEach(p => { p.models = p.models.filter(m => !['gemini-3.8-flash', 'gemini-3.6-flash'].includes(m.id)); p.models.unshift({ id: 'gemini-3.5-flash', status: 'verified' }); });
  const gList = fakeFetch({ 'https://generativelanguage.googleapis.com': { body: { models: ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'].map(n => ({ name: 'models/' + n })) } } });
  const g = await runRoster({ env: { ROSTER_KEY_GEMINI: KEY }, seed: oldG, previousState: { gemini: { ok: true, ids: ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3.5-flash'] } }, fetchImpl: gList, nowIso: NOW });
  assert(g.alertLines.filter(l => l.startsWith('ROSTER NEW')).length === 2 && !g.alertLines.some(l => l.startsWith('ROSTER MISSING')), 'gemini: 3.8 and 3.6 flagged NEW; the still-listed 3.5 is not MISSING (documented limit)');

  // 3. Perplexity's sonar-reasoning: a list that omits a tracked id is MISSING. (Perplexity itself
  //    has no list endpoint here, so this is shown with a provider that does.)
  const mSeed = JSON.parse(JSON.stringify(seed));
  mSeed.providers.find(p => p.id === 'mistral').models.push({ id: 'retired-model-latest', status: 'verified' });
  const mList = fakeFetch({ 'https://api.mistral.ai': { body: { data: ['mistral-large-latest', 'mistral-small-latest', 'ministral-8b-latest'].map(id => ({ id })) } } });
  const m = await runRoster({ env: { ROSTER_KEY_MISTRAL: KEY }, seed: mSeed, previousState: { mistral: { ok: true, ids: ['ministral-8b-latest', 'mistral-large-latest', 'mistral-small-latest', 'retired-model-latest'] } }, fetchImpl: mList, nowIso: NOW });
  assert(m.alertLines.some(l => /^ROSTER MISSING mistral\/retired-model-latest /.test(l)), 'a tracked model the provider no longer lists is MISSING');
}

// ── status page ──────────────────────────────────────────────────────
console.log('\nbuildStatusHtml — roster section');
{
  const none = buildStatusHtml([]);
  assert(none.includes('Model roster check') && none.includes('No roster check has run yet.'), 'renders with no roster state (existing callers unchanged)');
  assert(none.includes('not checked (no key configured)'), 'every source shows as not checked');
  const html = buildStatusHtml([], { gemini: { ok: true, ts: NOW, count: 40, missing: ['<img src=x onerror=1>'], added: ['gemini-4.0-flash'] }, claude: { ok: false, error: 'model list request failed (HTTP 401)', ts: NOW } });
  assert(html.includes('40 models listed') && html.includes('gemini-4.0-flash'), 'shows counts and new models');
  assert(!html.includes('<img src=x'), 'model ids are HTML-escaped');
  assert(html.includes('model list unavailable') && html.includes('HTTP 401'), 'shows a failing provider');
  assert(!html.includes(KEY) && !html.includes('FAKE-roster'), 'no key material on the page');
  const withList = buildStatusHtml([], { chatgpt: { ok: true, ts: NOW, count: 86, missing: [], added: [], untracked: ['gpt-9-new', '<script>x</script>'], untrackedCount: 2 } });
  assert(withList.includes('2 chat-style models not tracked') && withList.includes('gpt-9-new'), 'status page lists the untracked models');
  assert(!withList.includes('<script>x</script>') && withList.includes('&lt;script&gt;'), 'untracked model ids are HTML-escaped');
}

console.log('');
if (failures) { console.log(`❌ ${failures} roster test(s) failed.`); process.exit(1); }
console.log('✅ All model roster check tests passed.');
