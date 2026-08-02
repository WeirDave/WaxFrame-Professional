#!/usr/bin/env node
// ============================================================
// tools/generate-pricing-fallback.mjs
//
// Regenerates js/pricing-renderer.js's embedded FALLBACK_DATA literal from
// tools/pricing-worker/data/pricing-seed.json — the single canonical
// source. Run this any release that touches pricing data, right after
// editing the seed (and before `wrangler kv key put`).
//
// v3.63.437 — added to close a real drift risk: FALLBACK_DATA and the
// seed used to be two hand-maintained copies of the same data, with only
// a code comment asking maintainers to keep them in lockstep. Generating
// one from the other makes that structurally impossible to forget instead
// of a discipline problem.
//
// How it works: pricing-renderer.js's FALLBACK_DATA declaration is
// bracketed by two marker comments —
//   var FALLBACK_DATA = /*__FALLBACK_DATA__*/{...}/*__END_FALLBACK_DATA__*/;
// — this script replaces everything between the markers with a compact
// JSON.stringify of the current seed, leaving the rest of the file (and
// the markers themselves) untouched.
//
// Run: node tools/generate-pricing-fallback.mjs
// Exit 0 on success. Exits 1 if the markers aren't found (the renderer
// file's shape changed and this script needs updating too).
// ============================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = join(ROOT, 'tools/pricing-worker/data/pricing-seed.json');
const RENDERER_PATH = join(ROOT, 'js/pricing-renderer.js');

const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
const renderer = readFileSync(RENDERER_PATH, 'utf8');

const START = '/*__FALLBACK_DATA__*/';
const END = '/*__END_FALLBACK_DATA__*/';
const startIdx = renderer.indexOf(START);
const endIdx = renderer.indexOf(END);

if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  console.error(`❌ Could not find FALLBACK_DATA markers (${START} ... ${END}) in js/pricing-renderer.js — the file's shape changed; update this script's marker strings to match.`);
  process.exit(1);
}

const before = renderer.slice(0, startIdx + START.length);
const after = renderer.slice(endIdx);
const next = before + JSON.stringify(seed) + after;

if (next === renderer) {
  console.log('✓ js/pricing-renderer.js FALLBACK_DATA already matches tools/pricing-worker/data/pricing-seed.json — no change.');
} else {
  writeFileSync(RENDERER_PATH, next);
  console.log(`✓ js/pricing-renderer.js FALLBACK_DATA regenerated from pricing-seed.json (lastUpdated: ${seed.lastUpdated}, ${seed.providers.length} providers).`);
}
