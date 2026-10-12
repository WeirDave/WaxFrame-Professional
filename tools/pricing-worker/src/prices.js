// ============================================================
//  WaxFrame — pricing Worker: price parsers
//  Build: 20261011-008
//  Author: WeirDave (R David Paine III) | License: AGPL-3.0
//  GitHub: github.com/WeirDave/WaxFrame-Professional
//
//  Reads a model's price straight off the provider's own pricing page,
//  with code, instead of asking a language model to read the page.
//
//  Why this exists. Every bad price proposal in 2026-09/10 was Perplexity
//  Sonar misreading a page that was itself correct: DeepSeek's two-column
//  table read from the wrong column (twice), another Gemini model's price
//  attributed to gemini-3.5-flash, a price taken off the wrong row. A parser
//  addresses the row or column by the model's id, so it cannot do that:
//  either it finds the model and reads that model's cells, or it reports
//  the model is not on the page.
//
//  Rules every parser follows:
//   - Fail closed. A page that does not have the expected shape, or does
//     not list the model, returns { ok:false, reason } and the row keeps
//     its last verified price. A parser never guesses and never falls back
//     to a neighbouring row.
//   - Address by the model's id (or its page label derived from the id),
//     never by position alone.
//   - Return the plain standard-tier price per 1M tokens: input and output.
//     Context window and output limit are not read here; those stay
//     hand-checked (v3.63.565).
//   - A price that changes on a known date reports the price in force NOW
//     and says what it becomes (Gemini Flash: $0.75/$3.75 through
//     2026-12-31, then $1.50/$7.50).
//
//  Covered: DeepSeek, xAI, OpenAI, Anthropic, Google (free and paid rows).
//  NOT covered, still read by Sonar and still held for review: Perplexity
//  (its price table is drawn by JavaScript and is not in the page HTML),
//  Mistral, Cohere, Together.
//
//  Pure and injectable: pages are passed in (or fetched through an injected
//  fetch), so tools/pricing-worker/test-prices.mjs runs on saved pages.
// ============================================================

const UA = 'Mozilla/5.0 (compatible; WaxFramePricingBot/1.0; +https://waxframe.com)';
const MIN_PAGE_TEXT = 500; // shorter than this is an error/redirect shell, not a pricing page

// ── helpers ──────────────────────────────────────────────────────────

export function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script[^>]*>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function price(n) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

function notListed(modelId, pageName) {
  return { ok: false, reason: `${modelId} is not listed on ${pageName} — the page changed or the model was retired; keeping the last verified price` };
}

function shapeChanged(what) {
  return { ok: false, reason: `${what} was not in the expected shape — the page layout probably changed; keeping the last verified price` };
}

function good(inputPerM, outputPerM, extra) {
  const i = price(inputPerM), o = price(outputPerM);
  if (i === null || o === null) return shapeChanged('the price cells');
  return { ok: true, inputPerM: i, outputPerM: o, contextWindow: null, maxOutput: null, ...extra };
}

// ── DeepSeek ─────────────────────────────────────────────────────────
// One table, a column per model:
//   MODEL deepseek-flash (1) deepseek-v4-pro BASE URL ...
//   1M INPUT TOKENS (CACHE MISS) OFF-PEAK $0.15 $0.66 PEAK $0.3 $1.32
//   1M OUTPUT TOKENS OFF-PEAK $0.6 $1.98 PEAK $1.2 $3.96
// The column is chosen from the header by model id, then the same column
// index is read from each row. The off-peak rate is the one the seed has
// always carried; peak is twice it.
export function parseDeepSeek(html, modelId) {
  const t = htmlToText(html);
  if (t.length < MIN_PAGE_TEXT) return shapeChanged('the DeepSeek pricing page');
  const head = t.match(/\bMODEL\s+(.+?)\s+BASE URL/);
  if (!head) return shapeChanged('the DeepSeek model header');
  const cols = head[1].split(/\s+/).filter(x => /^[a-z0-9][a-z0-9.\-]*$/i.test(x));
  if (cols.length < 1) return shapeChanged('the DeepSeek model header');
  const col = cols.indexOf(modelId);
  if (col < 0) return notListed(modelId, 'DeepSeek\'s pricing page');

  const row = (label, from) => {
    const at = t.indexOf(label, from);
    if (at < 0) return null;
    // Take the WHOLE run of prices after OFF-PEAK and require exactly one per model column: a
    // row with more or fewer cells means the table changed shape, and reading the first N of
    // them would be reading the wrong cells.
    const m = t.slice(at, at + 400).match(/OFF-PEAK((?:\s*\$\s*[0-9]+(?:\.[0-9]+)?)+)/);
    const cells = m ? m[1].match(/[0-9]+(?:\.[0-9]+)?/g) : null;
    return cells && cells.length === cols.length ? { at, cells } : null;
  };
  const inRow = row('(CACHE MISS)', 0);
  if (!inRow) return shapeChanged('the DeepSeek input-price row');
  const outRow = row('OUTPUT TOKENS', inRow.at);
  if (!outRow) return shapeChanged('the DeepSeek output-price row');
  return good(inRow.cells[col], outRow.cells[col], { pageLabel: modelId, note: 'off-peak rate (peak is twice this)' });
}

// ── xAI ──────────────────────────────────────────────────────────────
// The models page embeds its whole public model list as JSON:
//   globalThis.__XAI_PUBLIC_MODELS__={"clusterConfigs":[{"languageModels":[
//     {"name":"grok-4.7","promptTextTokenPrice":"20000","completionTextTokenPrice":"60000", ...
// Prices are in 1/10,000 of a dollar per 1M tokens (20000 -> $2.00).
export function extractJsonAfter(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  let i = src.indexOf('{', at + marker.length);
  if (i < 0) return null;
  const start = i;
  let depth = 0, inStr = false, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(src.slice(start, i + 1)); } catch (e) { return null; } } }
  }
  return null;
}

export function parseXai(html, modelId) {
  const data = extractJsonAfter(String(html || ''), '__XAI_PUBLIC_MODELS__=');
  if (!data || !Array.isArray(data.clusterConfigs)) return shapeChanged('the xAI model data');
  const models = data.clusterConfigs.flatMap(c => (c && c.languageModels) || []);
  if (!models.length) return shapeChanged('the xAI model list');
  // The same model appears once per region cluster (us-east-1, us-west-2, us-central-1, ...), and
  // a regional cluster can charge more: grok-4.7 is 20000 in two clusters and 22000 (+10%) in a
  // third, while xAI's docs state $2.00. The standard rate is the lowest listed, and the note
  // says so when the clusters disagree.
  let hits = models.filter(m => m && m.name === modelId);
  if (!hits.length) hits = models.filter(m => m && Array.isArray(m.aliases) && m.aliases.includes(modelId));
  if (!hits.length) return notListed(modelId, 'xAI\'s models page');
  const priced = hits
    .map(m => ({ m, i: Number(m.promptTextTokenPrice) / 10000, o: Number(m.completionTextTokenPrice) / 10000 }))
    .filter(x => Number.isFinite(x.i) && Number.isFinite(x.o));
  if (!priced.length) return shapeChanged('the xAI price fields');
  priced.sort((a, b) => a.i - b.i || a.o - b.o);
  const best = priced[0];
  const differs = priced.some(x => x.i !== best.i || x.o !== best.o);
  const notes = [];
  if (differs) notes.push('standard rate; at least one regional cluster charges more');
  if (best.m.promptTextTokenPriceLongContext) notes.push('prices for prompts under the long-context threshold');
  return good(Math.round(best.i * 1e6) / 1e6, Math.round(best.o * 1e6) / 1e6, { pageLabel: best.m.name, note: notes.join('; ') || undefined });
}

// ── OpenAI ───────────────────────────────────────────────────────────
// Each section is a set of tabs (Standard, Batch, Flex, Fast, Ultrafast), so
// a model's id appears in several tables with different prices. The text of
// the page reads, for a tabbed section:
//   ... Standard Short context Long context Model Input Cached input Cache writes Output ... gpt-6.1-sol $2.00 $0.10 $2.50 $10.00 $4.00 ...
//   ... All models Batch Short context Long context Model ... gpt-6.1-sol $1.00 ...
// and for an untabbed section just "Prices per 1M tokens. Short context ...".
// Only tables NOT introduced by "All models <Batch|Flex|Fast|Ultrafast>" are
// standard-rate tables. Within one, a row is: id, input, cached input, cache
// writes, output (then the long-context four).
export function parseOpenAI(html, modelId) {
  const t = htmlToText(html);
  if (t.length < MIN_PAGE_TEXT) return shapeChanged('the OpenAI pricing page');
  const marker = 'Short context Long context Model';
  const starts = [];
  for (let i = t.indexOf(marker); i >= 0; i = t.indexOf(marker, i + 1)) starts.push(i);
  if (!starts.length) return shapeChanged('the OpenAI pricing tables');
  const re = new RegExp('(?:^|\\s)' + escapeRe(modelId) + '\\s+\\$\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s+\\$\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s+\\$\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s+\\$\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)');
  for (let k = 0; k < starts.length; k++) {
    const label = t.slice(Math.max(0, starts[k] - 45), starts[k]);
    if (/All models (?:Batch|Flex|Fast|Ultrafast)\s*$/.test(label)) continue; // not the standard rate
    const body = t.slice(starts[k], k + 1 < starts.length ? starts[k + 1] : starts[k] + 4000);
    const m = body.match(re);
    if (m) return good(m[1].replace(/,/g, ''), m[4].replace(/,/g, ''), { pageLabel: modelId, note: 'standard rate, short context' });
  }
  return notListed(modelId, 'OpenAI\'s pricing page');
}

// ── Anthropic ────────────────────────────────────────────────────────
// Rows are keyed by display name: "Claude Sonnet 5.5 <description> $2 / MTok
// $10 / MTok $2.50 / MTok $4 / MTok $0.10 / MTok". The id maps to the name
// by a fixed rule, with a boundary so "Claude Opus 5" never matches
// "Claude Opus 5.5". A model priced in tiers by prompt size (Haiku 5.5)
// lists the lower tier first; that is the one read, and the note says so.
export function claudeDisplayName(id) {
  const m = String(id).match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  return `Claude ${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] !== undefined ? '.' + m[3] : ''}`;
}

export function parseAnthropic(html, modelId) {
  const t = htmlToText(html);
  if (t.length < MIN_PAGE_TEXT) return shapeChanged('the Anthropic pricing page');
  const name = claudeDisplayName(modelId);
  if (!name) return notListed(modelId, 'Anthropic\'s pricing page');
  const re = new RegExp(escapeRe(name) + '(?![0-9])(?!\\.[0-9])', 'g');
  const nextRow = /Claude (?:Fable|Opus|Sonnet|Haiku|Mythos) [0-9]/;
  let sawName = false;
  for (let m; (m = re.exec(t)); ) {
    sawName = true;
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 900);
    const stop = after.search(nextRow);
    const seg = stop >= 0 ? after.slice(0, stop) : after;
    const cells = [...seg.matchAll(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*MTok/g)].map(x => x[1]);
    if (cells.length < 5) continue; // a mention in prose, not the table row
    const tiered = /for prompts (?:up to|over)/i.test(seg);
    return good(cells[0], cells[1], { pageLabel: name, note: tiered ? 'priced in tiers by prompt size; this is the lower tier (up to 100K tokens)' : undefined });
  }
  return sawName ? shapeChanged(`the price row for ${name}`) : notListed(modelId, 'Anthropic\'s pricing page');
}

// ── Google (Gemini) ──────────────────────────────────────────────────
// A section per model, headed by the id:
//   "Gemini 3.8 Flash gemini-3.8-flash Try it in Google AI Studio <desc> Standard
//    Free Tier Paid Tier, per 1M tokens in USD Input price Free of charge $0.75 through
//    December 31, 2026. $1.50 starting January 1, 2027. Output price (including thinking
//    tokens) Free of charge $3.75 through December 31, 2026. $7.50 starting January 1,
//    2027. Context caching price ... Batch Free Tier ..."
// The section for the id is found by "<id> Try it in Google AI Studio", and
// only the Standard panel (before the first "Batch") is read. Each price cell
// is "<free-tier cell> <paid-tier cell>". A dated cell ("$A through DATE. $B
// starting DATE.") is resolved against today's date.
const MONTHS = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };

function geminiCell(cell, now) {
  const dated = cell.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s+through\s+([A-Za-z]+)\s+([0-9]{1,2}),\s+([0-9]{4})\.?\s+\$\s*([0-9]+(?:\.[0-9]+)?)\s+starting\s+([A-Za-z]+)\s+([0-9]{1,2}),\s+([0-9]{4})/);
  if (dated) {
    const mon = MONTHS[dated[2].toLowerCase()];
    const until = Date.UTC(Number(dated[4]), mon, Number(dated[3]), 23, 59, 59);
    const from = new Date(Date.UTC(Number(dated[8]), MONTHS[dated[6].toLowerCase()], Number(dated[7])));
    if (mon === undefined || MONTHS[dated[6].toLowerCase()] === undefined) return null;
    const useFirst = now.getTime() <= until;
    return { value: useFirst ? dated[1] : dated[5], later: useFirst ? { value: dated[5], date: from.toISOString().slice(0, 10) } : null };
  }
  const first = cell.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
  return first ? { value: first[1], later: null } : null;
}

export function parseGemini(html, modelId, tier, now) {
  const t = htmlToText(html);
  if (t.length < MIN_PAGE_TEXT) return shapeChanged('the Gemini pricing page');
  // A section can be headed by more than one id ("gemini-3.1-pro-preview and
  // gemini-3.1-pro-preview-customtools Try it in ..."). The id must be a whole
  // token in that list: followed by a separator or the "Try it" text, never by
  // more of an id, so gemini-3.1-pro-preview cannot match its -customtools sibling.
  const idTok = '[a-z0-9][a-z0-9.\\-]*';
  const sep = '\\s*(?:,|and)\\s*';
  const head = new RegExp('(?:^|\\s)(?:' + idTok + sep + ')*' + escapeRe(modelId) + '(?:' + sep + idTok + ')*\\s+Try it in Google AI Studio', 'i').exec(t);
  if (!head) return notListed(modelId, 'Google\'s Gemini pricing page');
  let block = t.slice(head.index + head[0].length, head.index + head[0].length + 5000);
  const batch = block.search(/\bBatch Free Tier\b|\bBatch\b/);
  if (batch >= 0) block = block.slice(0, batch);
  const iIn = block.indexOf('Input price');
  const iOut = block.indexOf('Output price');
  if (iIn < 0 || iOut < iIn) return shapeChanged(`the ${modelId} price cells`);
  const iCache = block.indexOf('Context caching price', iOut);
  const inCell = block.slice(iIn + 'Input price'.length, iOut).trim();
  const outCell = block.slice(iOut + 'Output price'.length, iCache > iOut ? iCache : undefined).replace(/^\s*\(including thinking tokens\)/, '').trim();

  const split = cell => {
    const m = cell.match(/^(Free of charge|Not available)\s*(.*)$/);
    return m ? { free: m[1], paid: m[2] } : null;
  };
  const a = split(inCell), b = split(outCell);
  if (!a || !b) return shapeChanged(`the ${modelId} free/paid price cells`);

  if (tier === 'free') {
    if (a.free === 'Free of charge' && b.free === 'Free of charge') return good(0, 0, { pageLabel: modelId, note: 'free tier: free of charge' });
    return { ok: false, reason: `${modelId} is not offered free of charge on Google's page; keeping the last verified entry` };
  }
  const pi = geminiCell(a.paid, now), po = geminiCell(b.paid, now);
  if (!pi || !po) return shapeChanged(`the ${modelId} paid-tier prices`);
  const later = pi.later || po.later;
  const note = later ? `price changes on ${(pi.later || po.later).date} to $${pi.later ? pi.later.value : pi.value}/$${po.later ? po.later.value : po.value} per M` : undefined;
  return good(pi.value, po.value, { pageLabel: modelId, note });
}

// ── Registry & reading ───────────────────────────────────────────────
// Keyed by the seed's provider id. `name` appears in "not listed" reasons.
export const PRICE_SOURCES = {
  deepseek:      { url: 'https://api-docs.deepseek.com/quick_start/pricing', parse: (h, id) => parseDeepSeek(h, id) },
  grok:          { url: 'https://docs.x.ai/developers/models',               parse: (h, id) => parseXai(h, id) },
  chatgpt:       { url: 'https://developers.openai.com/api/docs/pricing',    parse: (h, id) => parseOpenAI(h, id) },
  claude:        { url: 'https://platform.claude.com/docs/en/about-claude/pricing', parse: (h, id) => parseAnthropic(h, id) },
  'gemini-paid': { url: 'https://ai.google.dev/gemini-api/docs/pricing',     parse: (h, id, now) => parseGemini(h, id, 'paid', now) },
  'gemini-free': { url: 'https://ai.google.dev/gemini-api/docs/pricing',     parse: (h, id, now) => parseGemini(h, id, 'free', now) }
};

async function loadPage(url, fetchImpl) {
  let last = 'request failed';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' } });
      if (resp.ok) return { ok: true, html: await resp.text() };
      last = `HTTP ${resp.status}`;
    } catch (e) {
      last = 'network error or timeout';
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
  }
  return { ok: false, reason: `could not read ${url} (${last}); keeping the last verified price` };
}

// Reads every parser-covered, non-`unsupported` row. Each page is fetched
// once however many rows use it. Returns Map<"providerId::modelId", outcome>
// where outcome is the parser's { ok, inputPerM, ... } or { ok:false, reason }.
// Rows of providers with no parser are simply absent from the map.
export async function readPrices({ providers, fetchImpl, now = new Date() }) {
  const out = new Map();
  const pages = new Map();
  for (const p of providers || []) {
    const src = PRICE_SOURCES[p.id];
    if (!src) continue;
    for (const m of p.models || []) {
      if (m.status === 'unsupported') continue;
      if (!pages.has(src.url)) pages.set(src.url, await loadPage(src.url, fetchImpl));
      const page = pages.get(src.url);
      let outcome;
      if (!page.ok) outcome = { ok: false, reason: page.reason };
      else {
        try { outcome = src.parse(page.html, m.id, now); }
        catch (e) { outcome = shapeChanged('the pricing page'); }
      }
      out.set(`${p.id}::${m.id}`, { ...outcome, source: src.url });
    }
  }
  return out;
}
