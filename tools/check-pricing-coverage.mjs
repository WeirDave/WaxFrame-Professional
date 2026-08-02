#!/usr/bin/env node
// ============================================================
// WaxFrame — check-pricing-coverage.mjs
//
// Verifies tools/pricing-worker/data/pricing-seed.json tracks every model
// WaxFrame actually curates for each provider — the fallback lists inline
// in js/provider-catalog.js's CATALOG entries. Added in v3.63.437 alongside
// the seed's models[] schema so a future provider-catalog edit (new
// fallback model added, old one dropped) can't silently drift out of sync
// with what the pricing page tracks — the exact failure mode a purely
// manual process would eventually hit.
//
// Regex-based extraction from provider-catalog.js, not an import: that
// file is a browser-global IIFE (`(function(root){...})(window)`) with no
// module exports, and this project has no build step to shim `window` for
// it. Same "trading completeness for speed + zero deps" tradeoff
// release-check.mjs already makes for its own checks.
//
// Provider identity doesn't map 1:1 between the two files:
//   - provider-catalog's single 'gemini' entry corresponds to TWO seed
//     rows (gemini-free / gemini-paid) — same models, different billing
//     tier. Both must carry the full fallback list.
//   - 'copilot' has an empty fallback[] in the catalog (no working
//     discovery) but still has a default `model` ('gpt-4o') that should
//     exist in the seed, marked unsupported rather than absent.
// CATALOG_TO_SEED is the explicit map for these — deliberately hardcoded
// rather than a generalized alias system: there are 10 catalog entries,
// this doesn't need to scale further to stay correct.
//
// Exit 0 on success, 1 on any failure — same convention as release-check.mjs,
// which shells out to this script as one of its own checks.
// ============================================================

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => errors.push(msg);

const CATALOG_TO_SEED = {
  claude:     ['claude'],
  chatgpt:    ['chatgpt'],
  copilot:    ['copilot'],
  gemini:     ['gemini-free', 'gemini-paid'],
  grok:       ['grok'],
  perplexity: ['perplexity'],
  mistral:    ['mistral'],
  deepseek:   ['deepseek'],
  together:   ['together'],
  cohere:     ['cohere']
};

// ── Parse js/provider-catalog.js's CATALOG entries ──────────────────
// Each entry is `{ id: '...', ... model: '...', ... fallback: [...] }` in
// source order. Pulling id/model/fallback with targeted regexes per
// entry block rather than one global regex keeps each match anchored to
// its own entry instead of accidentally spanning into the next one.

const catalogSrc = readFileSync(join(ROOT, 'js/provider-catalog.js'), 'utf8');

// Isolate the CATALOG array literal's body first, then slice it into
// per-entry chunks between consecutive `id: '...'` occurrences — robust
// against comment blocks sitting between an entry's opening `{` and its
// `id:` line (e.g. the together/cohere entries), which broke an earlier
// brace-lookahead version of this regex into silently merging entries.
const catalogArrayM = catalogSrc.match(/var\s+CATALOG\s*=\s*\[([\s\S]*)\n\s*\];/);
const catalogEntries = [];
if (!catalogArrayM) {
  fail(`js/provider-catalog.js: could not locate the CATALOG array literal — extraction regex needs updating after a source change`);
} else {
  const catalogBody = catalogArrayM[1];
  const idMatches = [...catalogBody.matchAll(/id:\s*'([\w-]+)'/g)];
  idMatches.forEach((m, i) => {
    const start = m.index;
    const end = i + 1 < idMatches.length ? idMatches[i + 1].index : catalogBody.length;
    const block = catalogBody.slice(start, end);
    const modelM = block.match(/\bmodel:\s*'([^']+)'/);
    const fallbackM = block.match(/fallback:\s*\[([^\]]*)\]/);
    const fallback = fallbackM
      ? [...fallbackM[1].matchAll(/'([^']+)'/g)].map(fm => fm[1])
      : [];
    catalogEntries.push({ id: m[1], model: modelM ? modelM[1] : null, fallback });
  });
}

if (catalogEntries.length !== 10) {
  fail(`js/provider-catalog.js: parsed ${catalogEntries.length} CATALOG entries, expected 10 — extraction regex likely broke against a source change (a new provider was added, or comment placement shifted), review before trusting this check. If a provider was intentionally added/removed, update this expected count.`);
} else {
  ok(`js/provider-catalog.js: parsed ${catalogEntries.length} CATALOG entries`);
}

// ── Parse the seed ────────────────────────────────────────────────

const seedPath = join(ROOT, 'tools/pricing-worker/data/pricing-seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const seedById = {};
for (const p of seed.providers) seedById[p.id] = p;
ok(`pricing-seed.json: ${seed.providers.length} provider rows, schemaVersion ${seed.schemaVersion}`);

// ── Check 1: every catalog-curated model id exists in its mapped seed row(s) ──

for (const entry of catalogEntries) {
  const seedIds = CATALOG_TO_SEED[entry.id];
  if (!seedIds) {
    fail(`js/provider-catalog.js CATALOG entry '${entry.id}' has no CATALOG_TO_SEED mapping in tools/check-pricing-coverage.mjs — add one (a new provider was added to the app catalog but not wired into the pricing coverage check)`);
    continue;
  }
  // Copilot-style entries: empty fallback but a real default model still
  // needs a seed row (marked unsupported, not absent).
  const expectedIds = entry.fallback.length ? entry.fallback : (entry.model ? [entry.model] : []);
  for (const seedId of seedIds) {
    const provider = seedById[seedId];
    if (!provider) {
      fail(`pricing-seed.json is missing provider row '${seedId}' (mapped from catalog entry '${entry.id}')`);
      continue;
    }
    const seedModelIds = new Set((provider.models || []).map(m => m.id));
    for (const expected of expectedIds) {
      if (!seedModelIds.has(expected)) {
        fail(`pricing-seed.json provider '${seedId}' is missing model '${expected}' (curated in js/provider-catalog.js '${entry.id}'.fallback) — every WaxFrame-tracked model must have a row, even if status is needs-verification`);
      }
    }
  }
}

// ── Check 2: every seed model id still traces back to a curated catalog id ──
// Catches the opposite drift — a model removed from provider-catalog.js's
// fallback list but left behind in the seed. Not an error on its own (the
// model may be intentionally deprecated), but worth a visible warning
// rather than silent staleness.

for (const [catalogId, seedIds] of Object.entries(CATALOG_TO_SEED)) {
  const entry = catalogEntries.find(e => e.id === catalogId);
  if (!entry) continue;
  const expectedIds = new Set(entry.fallback.length ? entry.fallback : (entry.model ? [entry.model] : []));
  for (const seedId of seedIds) {
    const provider = seedById[seedId];
    if (!provider) continue;
    for (const m of provider.models || []) {
      if (!expectedIds.has(m.id) && m.status !== 'deprecated') {
        fail(`pricing-seed.json provider '${seedId}' tracks model '${m.id}' which is no longer in js/provider-catalog.js '${catalogId}'.fallback — mark it status "deprecated" if intentional, or remove the row`);
      }
    }
  }
}

// ── Check 3: internal seed consistency ──────────────────────────────

for (const p of seed.providers) {
  const seen = new Set();
  for (const m of p.models || []) {
    if (seen.has(m.id)) {
      fail(`pricing-seed.json provider '${p.id}' has duplicate model id '${m.id}'`);
    }
    seen.add(m.id);

    const hasPrice = typeof m.inputPerM === 'number' && typeof m.outputPerM === 'number';
    if (m.status === 'verified' && !hasPrice) {
      fail(`pricing-seed.json provider '${p.id}' model '${m.id}' is status "verified" but has null pricing`);
    }
    if (m.status === 'needs-verification' && hasPrice) {
      fail(`pricing-seed.json provider '${p.id}' model '${m.id}' is status "needs-verification" but already has pricing — should be "verified"`);
    }
  }
  if (p.defaultModel && !seen.has(p.defaultModel)) {
    fail(`pricing-seed.json provider '${p.id}' has defaultModel '${p.defaultModel}' with no matching entry in its own models[]`);
  }
}
ok('internal seed consistency (duplicate ids, status/price agreement, defaultModel presence)');

// ── Report ───────────────────────────────────────────────────────────

console.log('');
if (errors.length === 0) {
  console.log('✅ Pricing coverage check passed — every curated model is tracked.');
  process.exit(0);
}
console.log(`❌ ${errors.length} pricing coverage problem${errors.length === 1 ? '' : 's'} found:`);
for (const e of errors) console.log(`  • ${e}`);
process.exit(1);
