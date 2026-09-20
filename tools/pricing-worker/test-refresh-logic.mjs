#!/usr/bin/env node
// ============================================================
// tools/pricing-worker/test-refresh-logic.mjs
//
// Pure-function behavior tests for decideModelUpdate() (src/index.js) —
// the v3.63.437 review-gate that decides whether a Sonar-researched price
// silently confirms or gets held for human review. No KV, no network, no
// Cloudflare runtime: decideModelUpdate takes plain objects in and returns
// plain objects out, so this runs as a normal node script and is wired
// into tools/release-check.mjs (Check 12) the same way
// verify-prompts-equivalence.mjs is.
//
// This existed as a manual "replicate the logic in a standalone script"
// step in this file's own README before v3.63.437 — the decision logic
// is exported directly now instead of needing to be copy-pasted to test.
//
// Run: node tools/pricing-worker/test-refresh-logic.mjs
// Exit 0 if every assertion passes; exit 1 with FAIL lines otherwise.
// ============================================================

import { decideModelUpdate, mapWithConcurrency, isTrustedSource, isValidSizeString, corroboratesSource, buildStatusHtml, isSafeEmailAddress, isTransientError, modelAttributionMismatch, hasDeniedSourcePath } from './src/index.js';

let failures = 0;
function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.log(`  FAIL ${label}\n       expected: ${e}\n       actual:   ${a}`);
  } else {
    console.log(`  ok   ${label}`);
  }
}
function assert(cond, label) {
  if (!cond) { failures++; console.log(`  FAIL ${label}`); }
  else console.log(`  ok   ${label}`);
}

const PROVIDER = { id: 'mistral', name: 'Mistral' };
const NOW = '2026-08-02T00:00:00Z';

// ── decideModelUpdate: unchanged verified price ─────────────────────
console.log('decideModelUpdate — unchanged verified price stays live, silently');
{
  const model = { id: 'mistral-large-latest', inputPerM: 2.00, outputPerM: 6.00, contextWindow: '128K', maxOutput: '8K', status: 'verified', verifiedAt: '2026-07-01T00:00:00Z' };
  const result = { ok: true, inputPerM: 2.00, outputPerM: 6.00, contextWindow: '128K', maxOutput: '8K', source: 'https://mistral.ai/pricing', confirmedModel: 'mistral-large-latest' };
  const d = decideModelUpdate(PROVIDER, model, result, false, NOW);
  assertEqual(d.nextModel.inputPerM, 2.00, 'price unchanged in nextModel');
  assertEqual(d.nextModel.verifiedAt, NOW, 'verifiedAt refreshed');
  assertEqual(d.change.status, 'confirmed', 'change status is confirmed');
  assert(d.alertLine === null, 'no alert line for a routine confirm');
}

// ── decideModelUpdate: changed price is HELD, not applied ───────────
console.log('\ndecideModelUpdate — any changed price holds the old value for review');
{
  const model = { id: 'claude-sonnet-4-6', inputPerM: 3.00, outputPerM: 15.00, contextWindow: '1M', maxOutput: '8K', status: 'verified', verifiedAt: '2026-07-01T00:00:00Z' };
  // Small delta (~33%) — the exact shape of the real claude-sonnet-4-6/
  // sonnet-5 incident this policy exists to catch, which auto-applied
  // under the old 40%-delta-gate design.
  const result = { ok: true, inputPerM: 2.00, outputPerM: 10.00, contextWindow: '1M', maxOutput: '8K', source: 'https://anthropic.com/pricing', confirmedModel: 'Claude Sonnet 5' };
  const d = decideModelUpdate({ id: 'claude', name: 'Claude' }, model, result, false, NOW);
  assertEqual(d.nextModel.inputPerM, 3.00, 'OLD verified inputPerM stays live in nextModel');
  assertEqual(d.nextModel.outputPerM, 15.00, 'OLD verified outputPerM stays live in nextModel');
  // Build 20260920-001: this fixture IS a version mix-up, so the held
  // row now carries the more specific `model-mismatch` status rather
  // than a bare `needs-review`. What this section is about — the old
  // price stays live and the run still alerts — is unchanged; see the
  // modelAttributionMismatch section below for the guard itself.
  assertEqual(d.change.status, 'model-mismatch', 'change status is a held proposal, named as a version mismatch');
  assertEqual(d.change.oldInputPerM, 3.00, 'change record captures old price');
  assertEqual(d.change.proposedInputPerM, 2.00, 'change record captures proposed price');
  assertEqual(d.change.confirmedModel, 'Claude Sonnet 5', 'change record captures the model Sonar actually confirmed — the field the mismatch guard reads');
  assertEqual(d.change.sourceUrl, 'https://anthropic.com/pricing', 'change record captures source URL');
  assertEqual(d.change.ts, NOW, 'change record captures timestamp');
  assert(typeof d.alertLine === 'string' && /^(NEEDS REVIEW|MODEL MISMATCH)/.test(d.alertLine), 'a changed price always alerts, regardless of delta size');
}

// ── decideModelUpdate: large delta is ALSO just held (no special path) ──
console.log('\ndecideModelUpdate — a large delta gets the same hold treatment as a small one');
{
  const model = { id: 'gemini-3.5-flash', inputPerM: 0.075, outputPerM: 0.30, contextWindow: '1M', maxOutput: '8K', status: 'verified', verifiedAt: '2026-07-01T00:00:00Z' };
  const result = { ok: true, inputPerM: 0.50, outputPerM: 2.00, contextWindow: '1M', maxOutput: '8K', source: 'https://google.dev/pricing', confirmedModel: 'gemini-3.5-flash' };
  const d = decideModelUpdate({ id: 'gemini-paid', name: 'Gemini (Google) — paid' }, model, result, false, NOW);
  assertEqual(d.nextModel.inputPerM, 0.075, 'old price stays live even for a >500% swing');
  assertEqual(d.change.status, 'needs-review', 'large swing is needs-review, same status as a small one — no separate auto-apply path exists anymore');
}

// ── decideModelUpdate: first-ever price is held, not silently applied ──
console.log('\ndecideModelUpdate — first-time price for a needs-verification model is held for review');
{
  const model = { id: 'ministral-8b-latest', inputPerM: null, outputPerM: null, contextWindow: null, maxOutput: null, status: 'needs-verification', verifiedAt: null };
  const result = { ok: true, inputPerM: 0.10, outputPerM: 0.10, contextWindow: '128K', maxOutput: '8K', source: 'https://mistral.ai/pricing', confirmedModel: 'ministral-8b-latest' };
  const d = decideModelUpdate(PROVIDER, model, result, false, NOW);
  assertEqual(d.nextModel.inputPerM, null, 'model stays needs-verification (null price) — not silently flipped to verified');
  assertEqual(d.nextModel.status, 'needs-verification', 'status field itself is untouched by the scheduled run');
  assertEqual(d.change.status, 'needs-review', 'first-time price is a needs-review proposal');
  assertEqual(d.change.oldInputPerM, null, 'change record shows there was no old price');
  assertEqual(d.change.proposedInputPerM, 0.10, 'change record shows the proposed first price');
  assert(typeof d.alertLine === 'string' && d.alertLine.includes('NEEDS REVIEW'), 'first-time price always alerts');
}

// ── decideModelUpdate: failed research retains old value ────────────
console.log('\ndecideModelUpdate — a failed research call retains the old value untouched');
{
  const model = { id: 'sonar', inputPerM: null, outputPerM: null, status: 'needs-verification', verifiedAt: null };
  const result = { ok: false, reason: 'invalid or missing price fields in response' };
  const d = decideModelUpdate({ id: 'perplexity', name: 'Perplexity' }, model, result, false, NOW);
  assertEqual(d.nextModel, model, 'nextModel is the exact same object — no mutation on failure');
  assertEqual(d.change.status, 'retained', 'change status is retained');
  assert(d.alertLine === null, 'a routinely-incomplete model does not alert when it was not healthy last run either');
}

// ── decideModelUpdate: a regression from healthy DOES alert ─────────
console.log('\ndecideModelUpdate — a model that WAS healthy and now fails alerts as a regression');
{
  const model = { id: 'gpt-5.5', inputPerM: 5.00, outputPerM: 30.00, status: 'verified', verifiedAt: '2026-07-01T00:00:00Z' };
  const result = { ok: false, reason: 'HTTP 500' };
  const d = decideModelUpdate({ id: 'chatgpt', name: 'ChatGPT (OpenAI)' }, model, result, /* wasHealthyLastRun */ true, NOW);
  assertEqual(d.change.status, 'retained', 'change status is still retained (old value kept)');
  assert(typeof d.alertLine === 'string' && d.alertLine.includes('NEWLY FAILING'), 'a healthy-then-failing row alerts as a regression, not silently');
}

// ── mapWithConcurrency: preserves order and result shape ────────────
console.log('\nmapWithConcurrency — bounded concurrency preserves item order and Promise.allSettled-like shape');
{
  const items = [10, 20, 30, 40, 50];
  const results = await mapWithConcurrency(items, 2, async (n) => {
    await new Promise(r => setTimeout(r, n % 20)); // stagger completion order
    if (n === 30) throw new Error('boom');
    return n * 2;
  });
  assertEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'rejected', 'fulfilled', 'fulfilled'], 'result statuses align with input order despite staggered completion');
  assertEqual(results[0].value, 20, 'fulfilled result carries the right value');
  assert(results[2].reason instanceof Error && results[2].reason.message === 'boom', 'rejected result carries the thrown error');
}

// ── isTrustedSource / isValidSizeString sanity (unchanged helpers) ──
console.log('\nSanity checks on unchanged validation helpers');
{
  assert(isTrustedSource('mistral', 'https://docs.mistral.ai/pricing') === true, 'trusted subdomain of an allowlisted provider domain passes');
  assert(isTrustedSource('mistral', 'https://some-blog.example.com/mistral-pricing') === false, 'third-party domain is rejected even if the URL mentions the provider name');
  assert(isValidSizeString('256K') === true, '"256K" is a valid size string');
  assert(isValidSizeString('a lot') === false, 'free-text is not a valid size string');
}

// ── corroboratesSource (Build 20260809-001) ──────────────────────────
console.log('\ncorroboratesSource — checks a proposed price actually appears on the cited page text');
{
  const goodPage = 'Command R pricing: Input $0.15 / 1M tokens. Output $0.60 / 1M tokens. '.repeat(4);
  assert(corroboratesSource(goodPage, 0.15, 0.6) === true, 'both prices present on a real-length page -> corroborated');

  // This is the exact shape of the incident that prompted this feature:
  // Sonar cited docs.cohere.com/docs/command-a as its source, but that
  // page has no pricing on it at all.
  const wrongPage = 'Command A is our most performant model to date, excelling at tool use, agents, retrieval augmented generation (RAG), and multilingual use cases. '.repeat(4);
  assert(corroboratesSource(wrongPage, 2.5, 10) === false, 'page fetched fine but neither number appears -> false (real signal), not inconclusive');

  const partialPage = ('Input $0.15 / 1M tokens. No output pricing shown on this page. ').repeat(4);
  assert(corroboratesSource(partialPage, 0.15, 0.6) === false, 'only one of the two numbers present -> false, not a pass');

  assert(corroboratesSource('short stub, likely a JS shell', 0.15, 0.6) === null, 'page text too short to judge fairly -> null (inconclusive), never treated as a false alarm');
  assert(corroboratesSource(null, 0.15, 0.6) === null, 'failed fetch (null text) -> null (inconclusive)');

  const dollarFormatted = ('Command R+ costs $2.50 per million input tokens and $10.00 per million output tokens. ').repeat(4);
  assert(corroboratesSource(dollarFormatted, 2.5, 10) === true, '$-prefixed, comma-free decimal formatting still matches');
}

// ── isTransientError (Build 20260816-001) ──────────────────────────
console.log('\nisTransientError — classifies which failures deserve a retry');
{
  assert(isTransientError('HTTP 429') === true, '429 rate limit is transient');
  assert(isTransientError('HTTP 500') === true, '500 server error is transient');
  assert(isTransientError('HTTP 502') === true, '502 bad gateway is transient');
  assert(isTransientError('HTTP 503') === true, '503 unavailable is transient');
  assert(isTransientError('network error: fetch failed') === true, 'network error is transient');
  assert(isTransientError('HTTP 400') === false, '400 bad request is permanent');
  assert(isTransientError('HTTP 401') === false, '401 unauthorized is permanent');
  assert(isTransientError('unparseable response') === false, 'parse failure is permanent');
  assert(isTransientError('untrusted or missing source (got: none)') === false, 'bad source is permanent');
  assert(isTransientError('invalid or missing price fields in response') === false, 'bad price fields is permanent');
  assert(isTransientError('no confirmed model-version attribution in response') === false, 'missing model attribution is permanent');
}

// ── mapWithConcurrency with delay ─────────────────────────────────
console.log('\nmapWithConcurrency — delay parameter spaces out requests');
{
  const timestamps = [];
  await mapWithConcurrency([1, 2, 3], 1, async (n) => {
    timestamps.push(Date.now());
    return n;
  }, 100);
  if (timestamps.length === 3) {
    const gap1 = timestamps[1] - timestamps[0];
    const gap2 = timestamps[2] - timestamps[1];
    assert(gap1 >= 80, `first gap ${gap1}ms should be ≥80ms (100ms delay with jitter tolerance)`);
    assert(gap2 >= 80, `second gap ${gap2}ms should be ≥80ms`);
  }
}

// ── public status page output encoding ─────────────────────────────
console.log('\nbuildStatusHtml — escapes every value read from KV/run-log');
{
  const payload = [{
    ts: '<img src=x onerror=alert(1)>',
    changes: [{
      providerId: '<svg onload=alert(1)>',
      modelId: 'model</strong><script>alert(1)</script>',
      status: 'needs-review',
      reason: '<img src=x onerror=alert(1)>'
    }]
  }];
  const html = buildStatusHtml(payload);
  assert(!html.includes('<script>') && !html.includes('<img src=x') && !html.includes('<svg onload'), 'LLM/KV-controlled fields cannot inject active HTML');
  assert(html.includes('&lt;script&gt;') && html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'unsafe characters remain visible as encoded text');
  assert(isSafeEmailAddress('alerts@example.com') === true, 'valid private alert recipient accepted');
  assert(isSafeEmailAddress('alerts@example.com\r\nBcc: attacker@example.com') === false, 'email header injection rejected');
}

// ── modelAttributionMismatch (Build 20260920-001) ───────────────────
// Every case below is a real proposal shape, not an invented one. The
// three "must flag" rows are the three incidents this guard exists for;
// the "must not flag" rows are every model id currently in
// data/pricing-seed.json paired with the way a provider page plausibly
// writes it, because a guard that fires on the normal case is worse than
// no guard — it teaches the reader to skim past the warning.
console.log('\nmodelAttributionMismatch — sibling-row mix-ups are named, normal spellings are not');
{
  // 2026-09-20: $2/$8 proposed for sonar-reasoning off the "Sonar
  // Reasoning Pro" row — a model this seed already tracks separately at
  // exactly $2/$8.
  assert(/tier mismatch/.test(modelAttributionMismatch('sonar-reasoning', 'Sonar Reasoning Pro') || ''), 'sonar-reasoning answered with Sonar Reasoning Pro is flagged');
  // Build 20260809-001: a price for ministral-8b-latest that belonged to
  // its 3B sibling.
  assert(/parameter-size mismatch/.test(modelAttributionMismatch('ministral-8b-latest', 'Ministral 3B') || ''), 'ministral-8b answered with the 3B sibling is flagged');
  // v3.63.422: claude-sonnet-4-6 answered with claude-sonnet-5's
  // introductory rate — the incident that bought the confirmedModel
  // field in the first place, which this closes the other half of.
  assert(/version mismatch/.test(modelAttributionMismatch('claude-sonnet-4-6', 'Claude Sonnet 5') || ''), 'claude-sonnet-4-6 answered with Sonnet 5 is flagged');

  assert(modelAttributionMismatch('sonar', 'Sonar Pro') !== null, 'a tier word the requested model lacks is flagged');
  assert(modelAttributionMismatch('sonar-pro', 'Sonar') !== null, 'a tier word the source lacks is flagged');
  assert(modelAttributionMismatch('gpt-5.6-sol', 'GPT-5.6 Terra') !== null, 'same-version sibling variants are flagged');
  assert(modelAttributionMismatch('gemini-3.5-flash', 'Gemini 3.5 Flash-Lite') !== null, 'flash answered with flash-lite is flagged');

  const spelledDifferently = [
    ['sonar-reasoning', 'Sonar Reasoning'],
    ['sonar-reasoning-pro', 'Sonar Reasoning Pro'],
    ['sonar-deep-research', 'Sonar Deep Research'],
    ['ministral-8b-latest', 'Ministral 8B'],
    ['claude-sonnet-4-6', 'Claude Sonnet 4.6'],          // 4-6 and 4.6 are one version
    ['claude-haiku-4-5', 'Claude Haiku 4.5'],
    ['mistral-large-latest', 'Mistral Large 3'],         // a floating alias has no version to disagree with
    ['mistral-large-latest', 'Mistral Large'],
    ['gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite'],
    ['grok-4.20-0309-reasoning', 'Grok 4.20 Reasoning'], // a datestamp is not a version disagreement
    ['command-r-plus', 'Command R+'],                    // "+" and "plus" are one word
    ['command-a-plus-05-2026', 'Command A+'],
    ['command-r7b-12-2024', 'Command R7B'],
    ['deepseek-flash', 'DeepSeek-V4 Flash'],
    ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Llama 3.3 70B Instruct Turbo'],
    ['gpt-5.4-nano', 'GPT-5.4-nano']
  ];
  const wrongly = spelledDifferently.filter(([id, conf]) => modelAttributionMismatch(id, conf) !== null);
  assertEqual(wrongly, [], 'no currently-tracked model is flagged for an ordinary spelling difference');
}

// ── decideModelUpdate: a mismatched proposal is held AND labelled ────
console.log('\ndecideModelUpdate — a sibling-row price is held and named as a mismatch');
{
  const model = { id: 'sonar-reasoning', inputPerM: 1.00, outputPerM: 5.00, status: 'verified', verifiedAt: '2026-08-09T13:00:00Z' };
  const result = { ok: true, inputPerM: 2.00, outputPerM: 8.00, source: 'https://docs.perplexity.ai/getting-started/pricing', confirmedModel: 'Sonar Reasoning Pro' };
  const d = decideModelUpdate({ id: 'perplexity', name: 'Perplexity' }, model, result, true, NOW);
  assertEqual(d.change.status, 'model-mismatch', 'status downgraded from needs-review to model-mismatch');
  assertEqual(d.nextModel.inputPerM, 1.00, 'live price still untouched');
  assertEqual(d.nextModel.outputPerM, 5.00, 'live output price still untouched');
  assertEqual(d.change.proposedInputPerM, 2.00, 'the proposal is still recorded in full');
  assertEqual(d.change.confirmedModel, 'Sonar Reasoning Pro', 'the name the source gave is still recorded');
  assert(/^MODEL MISMATCH /.test(d.alertLine), 'alert line leads with MODEL MISMATCH, not NEEDS REVIEW');
  assert(/sibling/.test(d.change.reason), 'the reason tells the reviewer what to check');
}

// ── decideModelUpdate: a clean proposal is unaffected by the new guard ──
console.log('\ndecideModelUpdate — a proposal whose attribution agrees is still plain needs-review');
{
  const model = { id: 'sonar-reasoning', inputPerM: 1.00, outputPerM: 5.00, status: 'verified', verifiedAt: '2026-08-09T13:00:00Z' };
  const result = { ok: true, inputPerM: 1.50, outputPerM: 6.00, source: 'https://docs.perplexity.ai/getting-started/pricing', confirmedModel: 'Sonar Reasoning' };
  const d = decideModelUpdate({ id: 'perplexity', name: 'Perplexity' }, model, result, true, NOW);
  assertEqual(d.change.status, 'needs-review', 'status unchanged for an agreeing attribution');
  assert(/^NEEDS REVIEW /.test(d.alertLine), 'alert line still reads NEEDS REVIEW');
  assert(!/WARNING/.test(d.change.reason), 'no warning is added to a clean proposal');
}

// ── isTrustedSource: an announcement post is the wrong kind of page ──
// mistral.ai/news/ministraux/ is on Mistral's own domain and still
// quotes the Ministral launch price. A run applied it over the current
// price on 2026-09-06 and re-proposed the same change on 2026-09-20.
console.log('\nisTrustedSource — a provider announcement post is not a current price list');
{
  assertEqual(isTrustedSource('mistral', 'https://mistral.ai/news/ministraux/'), false, 'the launch announcement that caused this is rejected');
  assertEqual(isTrustedSource('mistral', 'https://mistral.ai/pricing/api/'), true, 'the real pricing page is still accepted');
  assertEqual(hasDeniedSourcePath('/blog/2026/new-prices'), true, 'a blog post is rejected');
  assertEqual(hasDeniedSourcePath('/changelog/'), true, 'a changelog is rejected');
  const seedPaths = [
    '/gemini-api/docs/pricing', '/api-keys', '/developers/pricing', '/quick_start/pricing/',
    '/models/llama-3-3-70b', '/pricing/api/', '/api/docs/pricing', '/v2/docs/command-r',
    '/docs/en/about-claude/pricing', '/getting-started/pricing', '/'
  ];
  assertEqual(seedPaths.filter(hasDeniedSourcePath), [], 'no source path currently in the seed is rejected');
}

console.log('');
if (failures === 0) {
  console.log('✅ All pricing Worker review-gate behavior tests passed.');
  process.exit(0);
}
console.log(`❌ ${failures} assertion(s) failed.`);
process.exit(1);
