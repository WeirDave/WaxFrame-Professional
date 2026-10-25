#!/usr/bin/env node
// ============================================================
// tools/pricing-worker/test-prices.mjs
//
// Behaviour tests for the price parsers (src/prices.js) and for how the
// weekly refresh uses them. No network and no KV: the pages are trimmed
// captures of the real provider pages taken 2026-10-11
// (tools/pricing-worker/fixtures/), and fetch and KV are injected.
//
// The fixtures are real markup on purpose. A parser tested only against
// text its author invented would pass and then fail on the first real
// page. The expected values below are the ones each provider's page
// states, which the seed was independently verified against.
//
// Several cases replay the actual bad proposals of 2026-09/10 and assert
// the parser does NOT make the same mistake:
//   DeepSeek   deepseek-flash read as $0.3/$3.96 (peak input + another
//              column's peak output), deepseek-v4-pro as $0.435/$0.87
//   Google     gemini-3.5-flash given gemini-3.1-flash-lite's $0.25/$1.50
//   OpenAI     the Batch and Ultrafast tables repeat every model at other
//              prices
//
// Run: node tools/pricing-worker/test-prices.mjs
// Exit 0 if every assertion passes; exit 1 with FAIL lines otherwise.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseDeepSeek, parseXai, parseOpenAI, parseAnthropic, parseGemini, parseTogether, parsePerplexity, claudeDisplayName, htmlToText, readPrices, PRICE_SOURCES } from './src/prices.js';
import { refreshPricing } from './src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const fx = name => readFileSync(join(HERE, 'fixtures', name), 'utf8');
const PAGES = {
  deepseek: fx('deepseek-pricing.txt'),
  xai: fx('xai-models.txt'),
  openai: fx('openai-pricing.txt'),
  openaiIslands: fx('openai-pricing-islands.txt'),
  together: fx('together-models.md'),
  pplxPro: fx('perplexity-sonar-pro.md'),
  pplxDeep: fx('perplexity-sonar-deep-research.md'),
  anthropic: fx('anthropic-pricing.txt'),
  gemini: fx('gemini-pricing.txt')
};
const NOW = new Date('2026-10-11T12:00:00Z');

let failures = 0;
function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { failures++; console.log(`  FAIL ${label}\n       expected: ${e}\n       actual:   ${a}`); }
  else console.log(`  ok   ${label}`);
}
function assert(cond, label) {
  if (!cond) { failures++; console.log(`  FAIL ${label}`); } else console.log(`  ok   ${label}`);
}
const px = o => o.ok ? [o.inputPerM, o.outputPerM] : 'NOT-OK: ' + o.reason;

// ── DeepSeek ─────────────────────────────────────────────────────────
console.log('DeepSeek — columns are chosen by the header, never by position');
assertEqual(px(parseDeepSeek(PAGES.deepseek, 'deepseek-flash')), [0.15, 0.6], 'deepseek-flash reads $0.15 / $0.60 (off-peak)');
assertEqual(px(parseDeepSeek(PAGES.deepseek, 'deepseek-v4-pro')), [0.66, 1.98], 'deepseek-v4-pro reads $0.66 / $1.98');
{
  const flash = parseDeepSeek(PAGES.deepseek, 'deepseek-flash');
  assert(!(flash.inputPerM === 0.3 && flash.outputPerM === 3.96), 'incident: flash is not the $0.3/$3.96 mix of peak input and Pro peak output');
  const pro = parseDeepSeek(PAGES.deepseek, 'deepseek-v4-pro');
  assert(!(pro.inputPerM === 0.435), 'incident: v4-pro is not its old $0.435 price');
}
assert(!parseDeepSeek(PAGES.deepseek, 'deepseek-v4-flash').ok, 'a retired alias (deepseek-v4-flash) is not a column, so it is not read');
{
  // swap the two header cells AND the two price cells: still correct by id
  let swapped = PAGES.deepseek
    .replace(/deepseek-flash(\s*(?:<[^>]*>\s*)*\(1\)(?:\s*<[^>]*>)*)([\s\S]*?)deepseek-v4-pro/, 'deepseek-v4-pro$1$2deepseek-flash');
  assert(swapped !== PAGES.deepseek, 'test setup: header columns swapped');
  const flash = parseDeepSeek(swapped, 'deepseek-flash');
  assert(flash.ok && flash.inputPerM !== undefined, 'a swapped header still resolves a column (position is never assumed)');
}
{
  const extraCell = htmlToText(PAGES.deepseek).replace('OFF-PEAK $0.6 $1.98', 'OFF-PEAK $0.6 $1.98 $9.99');
  const r = parseDeepSeek('<p>' + extraCell + '</p>', 'deepseek-flash');
  assert(!r.ok, 'a row with an extra price cell means the table changed; nothing is read');
}
assert(!parseDeepSeek('<p>' + 'x'.repeat(40) + '</p>', 'deepseek-flash').ok, 'a short shell page is an error, not a price');

// ── xAI ──────────────────────────────────────────────────────────────
console.log('\nxAI — embedded JSON, prices in 1/10,000 of a dollar');
assertEqual(px(parseXai(PAGES.xai, 'grok-4.7')), [2, 6], 'grok-4.7 reads $2 / $6');
assertEqual(px(parseXai(PAGES.xai, 'grok-4.5')), [2, 6], 'grok-4.5 reads $2 / $6');
assertEqual(px(parseXai(PAGES.xai, 'grok-4.3')), [1.25, 2.5], 'grok-4.3 reads $1.25 / $2.50');
assertEqual(px(parseXai(PAGES.xai, 'grok-4.20-0309-reasoning')), [1.25, 2.5], 'grok-4.20-0309-reasoning reads $1.25 / $2.50');
assertEqual(parseXai(PAGES.xai, 'grok-4.5-latest').pageLabel, 'grok-4.5', 'an alias resolves to the canonical model');
assert(!parseXai(PAGES.xai, 'grok-9').ok, 'an unknown model is not listed');
{
  // the regional $2.20 cluster listed FIRST must not win: order on the page is not meaning
  const marker = '__XAI_PUBLIC_MODELS__=';
  const at = PAGES.xai.indexOf(marker) + marker.length;
  const end = PAGES.xai.indexOf(';</script>', at);
  const data = JSON.parse(PAGES.xai.slice(at, end));
  data.clusterConfigs.reverse();
  const reordered = PAGES.xai.slice(0, at) + JSON.stringify(data) + PAGES.xai.slice(end);
  assert(JSON.stringify(data.clusterConfigs[0].languageModels.map(m => m.promptTextTokenPrice)) !== JSON.stringify(JSON.parse(PAGES.xai.slice(at, end)).clusterConfigs[0].languageModels.map(m => m.promptTextTokenPrice)), 'test setup: cluster order reversed');
  assertEqual(px(parseXai(reordered, 'grok-4.7')), [2, 6], 'grok-4.7 is still $2 / $6 with the $2.20 cluster listed first');
}
assert(!parseXai('<html>no data here, just a long enough page ' + 'x'.repeat(600) + '</html>', 'grok-4.7').ok, 'no embedded data is a shape change');
assert(!parseXai(PAGES.xai.split('"promptTextTokenPrice":"20000"').join('"promptTextTokenPrice":"oops"').split('"promptTextTokenPrice":"22000"').join('"promptTextTokenPrice":"oops"'), 'grok-4.7').ok, 'a non-numeric price is rejected rather than read as 0');
{
  const p = parseXai(PAGES.xai, 'grok-4.7');
  assert(!(p.inputPerM === 2.2 && p.outputPerM === 6.6), 'grok-4.7 is listed at $2.20 in the us-central-1 cluster; that regional price is not read');
  assert(/regional cluster charges more/.test(p.note || ''), 'and the note says the clusters disagree');
  assert(!/regional/.test(parseXai(PAGES.xai, 'grok-4.3').note || ''), 'a model whose clusters agree carries no such note');
}

// ── OpenAI ───────────────────────────────────────────────────────────
console.log('\nOpenAI — only the Standard table, never Batch / Flex / Fast / Ultrafast');
assertEqual(px(parseOpenAI(PAGES.openai, 'gpt-6.1-sol')), [2, 10], 'gpt-6.1-sol reads $2 / $10');
assertEqual(px(parseOpenAI(PAGES.openai, 'gpt-6-astra')), [10, 50], 'gpt-6-astra reads $10 / $50');
assertEqual(px(parseOpenAI(PAGES.openai, 'gpt-6-luna')), [0.1, 0.5], 'gpt-6-luna reads $0.10 / $0.50');
assertEqual(px(parseOpenAI(PAGES.openai, 'gpt-5.6-sol')), [4, 20], 'gpt-5.6-sol (an untabbed section) reads $4 / $20');
{
  const sol = parseOpenAI(PAGES.openai, 'gpt-6.1-sol');
  assert(sol.inputPerM !== 1 && sol.inputPerM !== 12, 'incident shape: not the Batch ($1) or Ultrafast ($12) price of the same model');
  const t = htmlToText(PAGES.openai);
  assert((t.match(/gpt-6\.1-sol \$/g) || []).length >= 4, 'test setup: the fixture really does repeat the model in several tables');
}
assertEqual(px(parseOpenAI(PAGES.openai, 'gpt-5.5')), [5, 30], 'gpt-5.5 is not drawn in the page text but is in the Standard table data, labelled "(<272K context length)": short-context rate');
assert(!parseOpenAI(PAGES.openai, 'gpt-6').ok, 'an id that is only a prefix of another (gpt-6 vs gpt-6-astra) is not matched');
assert(!parseOpenAI(PAGES.openai, 'gpt-6.1').ok, 'gpt-6.1 is not gpt-6.1-sol');
assert(!parseOpenAI('<p>' + 'x'.repeat(700) + '</p>', 'gpt-6.1-sol').ok, 'a page with no price tables is a shape change');
{
  // A model that is in a Batch/Ultrafast table but NOT in the Standard one must not be read from there:
  // that would report a half-price (or double-price) rate as the list price.
  const pad = ' Prices per 1M tokens. '.repeat(30);
  const page = '<p>Flagship models' + pad + 'Standard Batch Flex Fast Ultrafast Standard Short context Long context Model Input Cached input Cache writes Output Input Cached input Cache writes Output gpt-only-in-standard $2.00 $0.10 $2.50 $10.00 $4.00 $0.20 $5.00 $15.00 ' +
    'All models Batch Short context Long context Model Input Cached input Cache writes Output Input Cached input Cache writes Output gpt-only-in-batch $1.00 $0.05 $1.25 $5.00 $2.00 $0.10 $2.50 $7.50 ' +
    'All models Ultrafast Short context Long context Model Input Cached input Cache writes Output Input Cached input Cache writes Output gpt-only-in-ultrafast $12.00 $0.60 $15.00 $60.00 $24.00 $1.20 $30.00 $90.00</p>';
  assertEqual(px(parseOpenAI(page, 'gpt-only-in-standard')), [2, 10], 'synthetic page: the Standard row is read');
  assert(!parseOpenAI(page, 'gpt-only-in-batch').ok, 'synthetic page: a model that appears only in the Batch table is not listed');
  assert(!parseOpenAI(page, 'gpt-only-in-ultrafast').ok, 'synthetic page: a model that appears only in the Ultrafast table is not listed');
}

// ── OpenAI, page of 2026-10-25 ───────────────────────────────────────
// The "Short context Long context Model" header is gone from the page text and the columns are
// Input, Output, Cached input, 30m write, 12h write. The rows are read from the table data instead.
console.log('\nOpenAI (2026-10-25 layout) — rows read from the table data, not the page text');
{
  const page = PAGES.openaiIslands;
  assert(!/Short context Long context Model/.test(htmlToText(page)), 'test setup: the page text no longer carries the old table header');
  assertEqual(px(parseOpenAI(page, 'gpt-6.1-sol')), [2, 10], 'gpt-6.1-sol reads $2 / $10');
  assertEqual(px(parseOpenAI(page, 'gpt-6-astra')), [10, 50], 'gpt-6-astra reads $10 / $50');
  assertEqual(px(parseOpenAI(page, 'gpt-6-luna')), [0.1, 0.5], 'gpt-6-luna reads $0.10 / $0.50');
  assertEqual(px(parseOpenAI(page, 'gpt-5.6-sol')), [4, 20], 'gpt-5.6-sol reads $4 / $20');
  assertEqual(px(parseOpenAI(page, 'gpt-5.6-terra')), [2, 12], 'a row that is not drawn in the page text is still read (gpt-5.6-terra $2 / $12)');
  assertEqual(px(parseOpenAI(page, 'gpt-5.5')), [5, 30], 'a long-context label "gpt-5.5 (<272K context length)" is the short-context rate');
  assertEqual(px(parseOpenAI(page, 'gpt-5.4-mini')), [0.75, 4.5], 'an older row with no cache-write cell reads its last cell as output (gpt-5.4-mini)');
  assert(parseOpenAI(page, 'gpt-6.1-sol').inputPerM !== 1 && parseOpenAI(page, 'gpt-6.1-sol').inputPerM !== 4, 'not the Batch ($1) or Fast ($4) price of the same model');
  assert(!parseOpenAI(page, 'gpt-5.6-cyber').ok, 'a model only in the Cyber side table is not listed');
  assert(!parseOpenAI(page, 'gpt-6').ok && !parseOpenAI(page, 'gpt-9').ok, 'an id that is only a prefix of another, or a model the page does not list, is not matched');
}
{
  // A model that is only in a Batch / Fast island, or only in a side table, must not be read from there.
  const island = (props) => '<astro-island uid="x" component-export="TextTokenPricingTables" props="' + JSON.stringify(props).replace(/"/g, '&quot;') + '"></astro-island>';
  const A = v => [0, v], R = (id, ...cells) => [1, [A(id), ...cells.map(A)]];
  const pad = '<p>' + 'Prices per 1M tokens. '.repeat(40) + '</p>';
  const page = pad
    + island({ tier: A('standard'), rows: [1, [R('gpt-std', 2, 0.2, 2.5, 10)]] })
    + island({ tier: A('batch'), rows: [1, [R('gpt-batch-only', 1, 0.1, 1.25, 5)]] })
    + island({ tier: A('standard'), modelGroup: A('cyber'), rows: [1, [R('gpt-cyber-only', 12, 1, 15, 75)]] })
    + island({ tier: A('standard'), rows: [1, [R('gpt-moved', 5, 25, 0.5, 3)]] });
  assertEqual(px(parseOpenAI(page, 'gpt-std')), [2, 10], 'synthetic islands: the Standard row is read');
  assert(!parseOpenAI(page, 'gpt-batch-only').ok, 'synthetic islands: a model only in the Batch table is not listed');
  assert(!parseOpenAI(page, 'gpt-cyber-only').ok, 'synthetic islands: a model only in a model-group table is not listed');
  const moved = parseOpenAI(page, 'gpt-moved');
  assert(!moved.ok && /not in the expected shape/.test(moved.reason), 'synthetic islands: a last cell below the input price (output moved to second) is a shape change, not a read');
}

// ── Together AI ──────────────────────────────────────────────────────
console.log('\nTogether AI — rows keyed by the API model string, columns by header name');
assertEqual(px(parseTogether(PAGES.together, 'zai-org/GLM-5.3')), [1.4, 4.4], 'GLM-5.3 reads $1.40 / $4.40 (the cached-input column is skipped)');
assertEqual(px(parseTogether(PAGES.together, 'openai/gpt-oss-120b')), [0.15, 0.6], 'gpt-oss-120b reads $0.15 / $0.60 (a "-" cached-input cell)');
assertEqual(px(parseTogether(PAGES.together, 'Prism-ML/Ternary-Bonsai-27B')), [0, 0], 'a "Free" price reads as $0');
assertEqual(px(parseTogether(PAGES.together, 'zai-org/GLM-5.3-Flash')), [0.15, 0.5], 'GLM-5.3-Flash is not GLM-5.3');
{
  const retired = parseTogether(PAGES.together, 'meta-llama/Llama-3.3-70B-Instruct-Turbo');
  assert(!retired.ok && /is not listed on/.test(retired.reason), 'incident replay: Llama-3.3-70B-Instruct-Turbo (deprecated 2026-10-22) is reported not listed, not re-priced');
}
assert(!parseTogether(PAGES.together, 'zai-org/GLM-5').ok, 'an id that is only a prefix of another is not matched');
assert(!parseTogether('x'.repeat(700), 'zai-org/GLM-5.3').ok, 'a page with no price tables is a shape change');
assert(!parseTogether(PAGES.together.replace(/Input pricing/g, 'Cost in'), 'zai-org/GLM-5.3').ok, 'a table whose price columns were renamed is a shape change');

// ── Perplexity ───────────────────────────────────────────────────────
console.log('\nPerplexity — token rates from the model\'s own legacy page');
assertEqual(px(parsePerplexity(PAGES.pplxPro, 'sonar-pro')), [3, 15], 'sonar-pro reads $3 / $15 (not the per-1K-request prices)');
assertEqual(px(parsePerplexity(PAGES.pplxDeep, 'sonar-deep-research')), [2, 8], 'sonar-deep-research reads its base $2 / $8, not the citation or reasoning rates');
assert(!parsePerplexity('x'.repeat(700), 'sonar-pro').ok, 'a page without the token-rate blocks is a shape change');
assertEqual(PRICE_SOURCES.perplexity.url('sonar-pro'), 'https://docs.perplexity.ai/docs/legacy/sonar/models/sonar-pro.md', 'each model has its own page address');
assertEqual(PRICE_SOURCES.perplexity.url('../x'), null, 'an id that cannot be a page name has no address');

// ── Anthropic ────────────────────────────────────────────────────────
console.log('\nAnthropic — rows keyed by display name, with a boundary');
assertEqual(claudeDisplayName('claude-sonnet-5-5'), 'Claude Sonnet 5.5', 'id -> display name');
assertEqual(claudeDisplayName('claude-opus-5'), 'Claude Opus 5', 'a single-number version');
assertEqual(claudeDisplayName('claude-haiku-4-5-20251001'), null, 'a dated snapshot id is not mapped (and so is not guessed)');
assertEqual(px(parseAnthropic(PAGES.anthropic, 'claude-sonnet-5-5')), [2, 10], 'claude-sonnet-5-5 reads $2 / $10');
assertEqual(px(parseAnthropic(PAGES.anthropic, 'claude-opus-5-5')), [4, 20], 'claude-opus-5-5 reads $4 / $20');
assertEqual(px(parseAnthropic(PAGES.anthropic, 'claude-fable-5-1')), [10, 50], 'claude-fable-5-1 reads $10 / $50');
assertEqual(px(parseAnthropic(PAGES.anthropic, 'claude-opus-4-8')), [5, 25], 'claude-opus-4-8 (an "Additional models" row) reads $5 / $25');
assertEqual(px(parseAnthropic(PAGES.anthropic, 'claude-sonnet-4-6')), [3, 15], 'claude-sonnet-4-6 reads $3 / $15');
assertEqual(px(parseAnthropic(PAGES.anthropic, 'claude-opus-5')), [5, 25], 'claude-opus-5 is its own row ($5 / $25), not Opus 5.5 ($4 / $20)');
{
  const h = parseAnthropic(PAGES.anthropic, 'claude-haiku-5-5');
  assertEqual(px(h), [0.1, 0.5], 'claude-haiku-5-5 reads the lower tier $0.10 / $0.50');
  assert(/tiers by prompt size/.test(h.note || ''), 'and says it is tiered');
}
assert(!parseAnthropic(PAGES.anthropic, 'claude-sonnet-9-9').ok, 'an unknown model is not listed');

// ── Google ───────────────────────────────────────────────────────────
console.log('\nGoogle — section found by id; dated prices resolved against today');
{
  const p = parseGemini(PAGES.gemini, 'gemini-3.8-flash', 'paid', NOW);
  assertEqual(px(p), [0.75, 3.75], 'gemini-3.8-flash paid reads $0.75 / $3.75 in October 2026');
  assert(/2027-01-01/.test(p.note || '') && /\$1\.50\/\$7\.50/.test(p.note || ''), 'and says it becomes $1.5/$7.5 on 2027-01-01');
}
assertEqual(px(parseGemini(PAGES.gemini, 'gemini-3.8-flash', 'paid', new Date('2026-12-31T23:00:00Z'))), [0.75, 3.75], 'still the early price late on 2026-12-31 UTC');
assertEqual(px(parseGemini(PAGES.gemini, 'gemini-3.8-flash', 'paid', new Date('2027-01-01T00:00:00Z'))), [1.5, 7.5], 'the new price from 2027-01-01 UTC');
assert(!parseGemini(PAGES.gemini, 'gemini-3.8-flash', 'paid', new Date('2027-02-01T00:00:00Z')).note, 'after the change there is no further change to announce');
assertEqual(px(parseGemini(PAGES.gemini, 'gemini-3.6-flash', 'paid', NOW)), [0.75, 3.75], 'gemini-3.6-flash paid');
assertEqual(px(parseGemini(PAGES.gemini, 'gemini-3.1-flash-lite', 'paid', NOW)), [0.25, 1.5], 'gemini-3.1-flash-lite paid reads $0.25 / $1.50');
assertEqual(px(parseGemini(PAGES.gemini, 'gemini-3.1-pro-preview', 'paid', NOW)), [2, 12], 'gemini-3.1-pro-preview (heading lists two ids) reads $2 / $12, the <=200K rate');
assertEqual(px(parseGemini(PAGES.gemini, 'gemini-3.8-flash', 'free', NOW)), [0, 0], 'free tier: free of charge reads 0 / 0');
{
  const lost = parseGemini(PAGES.gemini, 'gemini-3.5-flash', 'paid', NOW);
  assert(!lost.ok, 'incident: gemini-3.5-flash is not on the page, so it is NOT given another model\'s price');
  assert(/not listed/.test(lost.reason), 'and the reason says it is not listed');
}
assert(!parseGemini(PAGES.gemini, 'gemini-3.1-pro', 'paid', NOW).ok, 'gemini-3.1-pro is not gemini-3.1-pro-preview');
assert(!parseGemini(PAGES.gemini, 'gemini-3.1-pro-preview', 'free', NOW).ok, 'a model with no free tier is not read as free');
assert(!parseGemini('<p>' + 'x'.repeat(700) + '</p>', 'gemini-3.8-flash', 'paid', NOW).ok, 'a page without the section is not listed');
{
  // If the Standard panel lost its Output price cell, the parser must not go on to read the Batch panel
  // (half the list price) as if it were Standard.
  const pad = ' filler text '.repeat(60);
  const broken = '<p>' + pad + ' gemini-x Try it in Google AI Studio A model. Standard Free Tier Paid Tier, per 1M tokens in USD Input price Free of charge $1.00 Context caching price Free of charge $0.10 ' +
    'Batch Free Tier Paid Tier, per 1M tokens in USD Input price Not available $0.50 Output price (including thinking tokens) Not available $2.00 Context caching price Not available $0.05</p>';
  const r = parseGemini(broken, 'gemini-x', 'paid', NOW);
  assert(!r.ok, 'synthetic page: a Standard panel with no Output price is a shape change, not a read of the Batch panel');
  const fine = broken.replace('Context caching price Free of charge $0.10 Batch', 'Output price (including thinking tokens) Free of charge $4.00 Context caching price Free of charge $0.10 Batch');
  assertEqual(px(parseGemini(fine, 'gemini-x', 'paid', NOW)), [1, 4], 'synthetic page: the same section with a Standard Output price reads Standard, not Batch');
}

// ── readPrices ───────────────────────────────────────────────────────
console.log('\nreadPrices — one fetch per page, unsupported rows skipped, failures explained');
const URL_TO_PAGE = {
  [PRICE_SOURCES.deepseek.url]: PAGES.deepseek,
  [PRICE_SOURCES.grok.url]: PAGES.xai,
  [PRICE_SOURCES.chatgpt.url]: PAGES.openai,
  [PRICE_SOURCES.claude.url]: PAGES.anthropic,
  [PRICE_SOURCES['gemini-paid'].url]: PAGES.gemini
};
function pagesFetch(overrides, calls) {
  return async url => {
    if (calls) calls.push(url);
    const o = overrides && overrides[url];
    if (o instanceof Error) throw o;
    if (o && o.status) return { ok: false, status: o.status, text: async () => '' };
    const body = o && o.body !== undefined ? o.body : URL_TO_PAGE[url];
    if (body === undefined) throw new Error('unexpected fetch ' + url);
    return { ok: true, status: 200, text: async () => body };
  };
}
const seedLike = [
  { id: 'gemini-free', models: [{ id: 'gemini-3.8-flash', status: 'verified' }, { id: 'gemini-3.1-pro-preview', status: 'unsupported' }] },
  { id: 'gemini-paid', models: [{ id: 'gemini-3.8-flash', status: 'verified' }] },
  { id: 'deepseek', models: [{ id: 'deepseek-flash', status: 'verified' }, { id: 'deepseek-v4-pro', status: 'verified' }] },
  { id: 'mistral', models: [{ id: 'mistral-large-latest', status: 'verified' }] },
  { id: 'copilot', models: [{ id: 'gpt-4o', status: 'unsupported' }] }
];
{
  const calls = [];
  const out = await readPrices({ providers: seedLike, fetchImpl: pagesFetch(null, calls), now: NOW });
  assertEqual(calls.length, 2, 'Gemini free+paid share one fetch; DeepSeek is the other (two fetches for five rows)');
  assert(out.has('gemini-free::gemini-3.8-flash') && out.has('gemini-paid::gemini-3.8-flash') && out.has('deepseek::deepseek-flash'), 'covered rows are read');
  assert(!out.has('gemini-free::gemini-3.1-pro-preview'), 'an unsupported row is skipped');
  assert(!out.has('mistral::mistral-large-latest') && !out.has('copilot::gpt-4o'), 'providers without a parser are absent, left to the old method');
  assertEqual(out.get('deepseek::deepseek-v4-pro').source, PRICE_SOURCES.deepseek.url, 'each outcome names its source page');
}
{
  // A provider with one page per model (Perplexity) fetches each model's own page; Together shares one.
  const proSrc = PRICE_SOURCES.perplexity.url('sonar-pro'), deepSrc = PRICE_SOURCES.perplexity.url('sonar-deep-research');
  const providers = [
    { id: 'perplexity', models: [{ id: 'sonar-pro', status: 'verified' }, { id: 'sonar-deep-research', status: 'verified' }, { id: 'bad id!', status: 'verified' }] },
    { id: 'together', models: [{ id: 'zai-org/GLM-5.3', status: 'verified' }, { id: 'zai-org/GLM-5.3-Flash', status: 'verified' }] }
  ];
  const calls = [];
  const out = await readPrices({ providers, fetchImpl: pagesFetch({ [proSrc]: { body: PAGES.pplxPro }, [deepSrc]: { body: PAGES.pplxDeep }, [PRICE_SOURCES.together.url]: { body: PAGES.together } }, calls), now: NOW });
  assertEqual(calls, [proSrc, deepSrc, PRICE_SOURCES.together.url], 'one fetch per Perplexity model page, one for both Together rows');
  assertEqual(px(out.get('perplexity::sonar-pro')), [3, 15], 'a Perplexity row is read from its own page');
  assertEqual(out.get('perplexity::sonar-deep-research').source, deepSrc, 'and names that page as its source');
  assertEqual(px(out.get('together::zai-org/GLM-5.3-Flash')), [0.15, 0.5], 'a Together row is read from the shared page');
  assert(!out.get('perplexity::bad id!').ok, 'an id that cannot be a page name is reported, not fetched');
}
{
  const out = await readPrices({ providers: seedLike, fetchImpl: pagesFetch({ [PRICE_SOURCES.deepseek.url]: { status: 500 } }), now: NOW });
  const o = out.get('deepseek::deepseek-flash');
  assert(!o.ok && /could not read/.test(o.reason) && /HTTP 500/.test(o.reason), 'an HTTP error is reported with its status');
  assert(out.get('gemini-paid::gemini-3.8-flash').ok, 'and does not affect rows on other pages');
}
{
  const out = await readPrices({ providers: seedLike, fetchImpl: pagesFetch({ [PRICE_SOURCES.deepseek.url]: new Error('boom') }), now: NOW });
  assert(!out.get('deepseek::deepseek-flash').ok, 'a thrown network error is reported, not raised');
}

// ── the weekly refresh, end to end ───────────────────────────────────
console.log('\nrefreshPricing — parser rows skip Sonar; changes are still held for review');
function fakeKV(initial) {
  const m = new Map(Object.entries(initial));
  return { get: async k => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async k => { m.delete(k); }, _m: m };
}
const row = (id, i, o, extra) => ({ id, inputPerM: i, outputPerM: o, contextWindow: '1M', maxOutput: '64K', estPerRound: 0.001, estNote: null, sourceUrl: 'x', verifiedAt: '2026-09-27T00:00:00Z', status: 'verified', ...extra });
const seed = stored => ({
  lastUpdated: '2026-10-04T00:00:00Z', schemaVersion: 3, tokensPerRound: { input: 5000, output: 2000 },
  providers: [
    { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek-flash', models: [row('deepseek-flash', stored.flash[0], stored.flash[1]), row('deepseek-v4-pro', 0.66, 1.98), ...(stored.ghost ? [row('deepseek-ghost', 1, 2)] : [])] },
    { id: 'gemini-paid', name: 'Gemini (Google) — paid', defaultModel: 'gemini-3.5-flash', models: [row('gemini-3.5-flash', 1.5, 9)] },
    { id: 'mistral', name: 'Mistral', defaultModel: 'mistral-large-latest', models: [row('mistral-large-latest', 2, 6)] }
  ]
});
async function runRefresh({ stored, key, pageOverrides }) {
  const kv = fakeKV({ latest: JSON.stringify(seed(stored)) });
  const perplexityCalls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.perplexity.ai')) {
      const body = JSON.parse(init.body);
      perplexityCalls.push(body.messages[0].content.match(/model "([^"]+)"/)?.[1] || '?');
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ inputPerM: 2, outputPerM: 6, contextWindow: null, maxOutput: null, source: 'https://mistral.ai/pricing', confirmedModel: 'mistral-large-latest' }) } }] }) };
    }
    return pagesFetch(pageOverrides)(u, init);
  };
  try { await refreshPricing({ PRICING_DATA: kv, PERPLEXITY_API_KEY: key }); }
  finally { globalThis.fetch = realFetch; }
  const log = JSON.parse(kv._m.get('run-log') || '[]');
  const latest = JSON.parse(kv._m.get('latest'));
  return { log, latest, perplexityCalls, changes: (log[0] && log[0].changes) || [] };
}
{
  const r = await runRefresh({ stored: { flash: [0.15, 0.6] }, key: undefined });
  const by = id => r.changes.find(c => c.modelId === id);
  assertEqual(by('deepseek-flash').status, 'confirmed', 'no Perplexity key: a parser row still refreshes (unchanged price -> confirmed)');
  assertEqual(by('deepseek-flash').via, 'page-parser', 'and records that it came from the page');
  assert(!by('mistral-large-latest'), 'no key: a Sonar-only row is left alone, as before');
  assertEqual(r.perplexityCalls.length, 0, 'no Perplexity calls');
  assert(r.latest.lastUpdated !== '2026-10-04T00:00:00Z', 'the refresh wrote its result');
}
{
  const r = await runRefresh({ stored: { flash: [0.22, 0.66] }, key: 'test-key-not-real' });
  const c = r.changes.find(x => x.modelId === 'deepseek-flash');
  assertEqual(c.status, 'needs-review', 'a changed price is still held for review');
  assertEqual([c.proposedInputPerM, c.proposedOutputPerM], [0.15, 0.6], 'with the page\'s price as the proposal');
  assertEqual(c.via, 'page-parser', 'attributed to the page parser');
  const stored = r.latest.providers.find(p => p.id === 'deepseek').models.find(m => m.id === 'deepseek-flash');
  assertEqual([stored.inputPerM, stored.outputPerM], [0.22, 0.66], 'and the live price is NOT changed by the run');
  assert(r.perplexityCalls.every(m => m === 'mistral-large-latest'), 'Sonar was asked only about the row with no parser');
  assert(!r.perplexityCalls.includes('deepseek-flash') && !r.perplexityCalls.includes('gemini-3.5-flash'), 'never about a parser-covered row');
  assertEqual(r.changes.find(x => x.modelId === 'mistral-large-latest').via, 'sonar', 'the Sonar row is marked as such');
}
{
  const r = await runRefresh({ stored: { flash: [0.15, 0.6] }, key: 'test-key-not-real' });
  const g = r.changes.find(x => x.modelId === 'gemini-3.5-flash');
  assertEqual(g.status, 'retained', 'incident replay: a Gemini model missing from the page is retained, not re-priced');
  assert(/not listed/.test(g.reason), 'with the reason "not listed"');
  assert(!r.perplexityCalls.includes('gemini-3.5-flash'), 'and Sonar is not asked to guess it');
  const kept = r.latest.providers.find(p => p.id === 'gemini-paid').models[0];
  assertEqual([kept.inputPerM, kept.outputPerM], [1.5, 9], 'its stored price is untouched');
}
{
  const r = await runRefresh({ stored: { flash: [0.15, 0.6], ghost: true }, key: undefined });
  const g = r.changes.find(x => x.modelId === 'deepseek-ghost');
  assertEqual(g.status, 'retained', 'a model the DeepSeek page does not list is retained');
}
{
  const r = await runRefresh({ stored: { flash: [0.15, 0.6] }, key: undefined, pageOverrides: { [PRICE_SOURCES.deepseek.url]: { status: 503 } } });
  const c = r.changes.find(x => x.modelId === 'deepseek-flash');
  assertEqual(c.status, 'retained', 'an unreadable page retains the row');
  assert(/could not read/.test(c.reason), 'and says the page could not be read');
}

console.log('');
if (failures) { console.log(`❌ ${failures} price parser test(s) failed.`); process.exit(1); }
console.log('✅ All price parser tests passed.');
