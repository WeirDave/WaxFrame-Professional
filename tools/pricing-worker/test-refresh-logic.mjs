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

import { decideModelUpdate, mapWithConcurrency, isTrustedSource, isValidSizeString } from './src/index.js';

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
  assertEqual(d.change.status, 'needs-review', 'change status is needs-review');
  assertEqual(d.change.oldInputPerM, 3.00, 'change record captures old price');
  assertEqual(d.change.proposedInputPerM, 2.00, 'change record captures proposed price');
  assertEqual(d.change.confirmedModel, 'Claude Sonnet 5', 'change record captures the model Sonar actually confirmed — lets a human catch a version mismatch against the requested "claude-sonnet-4-6"');
  assertEqual(d.change.sourceUrl, 'https://anthropic.com/pricing', 'change record captures source URL');
  assertEqual(d.change.ts, NOW, 'change record captures timestamp');
  assert(typeof d.alertLine === 'string' && d.alertLine.includes('NEEDS REVIEW'), 'a changed price always alerts, regardless of delta size');
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

console.log('');
if (failures === 0) {
  console.log('✅ All pricing Worker review-gate behavior tests passed.');
  process.exit(0);
}
console.log(`❌ ${failures} assertion(s) failed.`);
process.exit(1);
