#!/usr/bin/env node
// Build: 20261026-001
// test-retired-model-migration.mjs — a saved model the provider has withdrawn
// is replaced on load, everywhere it can be saved.
//
// saveHive() writes cfg.model for every API_CONFIGS entry, so a hive saved before
// a provider changed its default carries the old id and loadSettings() applies it
// over the new catalog default. Together removed meta-llama/Llama-3.3-70B-Instruct-
// Turbo on 2026-10-22; a request to it answers HTTP 400. This loads the REAL
// RETIRED_MODEL_REPLACEMENTS / migrateRetiredModels from js/storage.js into a
// sandbox and checks each place the old id can live.
//
// Usage:  node tools/test-retired-model-migration.mjs
// Exit 0 = every saved copy of a withdrawn model was replaced and nothing else moved.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/storage.js'), 'utf8');
const start = SRC.indexOf('const RETIRED_MODEL_REPLACEMENTS');
const end = SRC.indexOf('function loadSettings()');
if (start < 0 || end < start) { console.log('✗ could not find the migration block in js/storage.js'); process.exit(1); }
const BLOCK = SRC.slice(start, end);

const OLD = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
const NEW = 'meta-models/Muse-Glimmer-30B';
const TOGETHER = 'https://api.together.xyz/v1/chat/completions';

let bad = 0;
const fail = (msg, detail) => { bad++; console.log(`    ✗ ${msg}`); if (detail !== undefined) console.log(`        ${detail}`); };
const ok = (msg) => console.log(`    ✓ ${msg}`);
const check = (cond, msg, detail) => (cond ? ok(msg) : fail(msg, detail));

function run({ configs, ais, store = {} }) {
  const data = new Map(Object.entries(store));
  const sandbox = {
    API_CONFIGS: configs,
    aiList: ais,
    URL,
    localStorage: {
      get length() { return data.size; },
      key: (i) => [...data.keys()][i] ?? null,
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => { data.set(k, String(v)); },
      removeItem: (k) => { data.delete(k); },
    },
    Object, Array, String,
  };
  vm.createContext(sandbox);
  vm.runInContext(BLOCK + '\nthis.result = migrateRetiredModels();', sandbox);
  return { swaps: sandbox.result, configs, ais, data };
}

console.log('test-retired-model-migration — a withdrawn saved model is replaced\n');

console.log('  the built-in Together row');
{
  const r = run({
    configs: { together: { endpoint: TOGETHER, model: OLD, label: 'Together AI' } },
    ais: [{ id: 'together', name: 'Together AI', provider: 'together' }],
  });
  check(r.configs.together.model === NEW, 'cfg.model becomes the replacement', r.configs.together.model);
  check(r.swaps.length === 1 && r.swaps[0].name === 'Together AI', 'one visible swap is reported, under the row name', JSON.stringify(r.swaps));
}

console.log('  a provider config with no row (never keyed)');
{
  const r = run({ configs: { together: { endpoint: TOGETHER, model: OLD } }, ais: [] });
  check(r.configs.together.model === NEW, 'cfg.model is still corrected, so keying it later does not resurrect the old id');
  check(r.swaps.length === 0, 'and nothing is announced for a row the user does not have', JSON.stringify(r.swaps));
}

console.log('  a custom AI added with Together\'s endpoint, and a variant carrying its own model');
{
  const r = run({
    configs: {
      together: { endpoint: TOGETHER, model: NEW },
      'my-together': { endpoint: TOGETHER, model: OLD, label: 'My Together' },
    },
    ais: [
      { id: 'together', name: 'Together AI', provider: 'together' },
      { id: 'my-together', name: 'My Together', provider: 'my-together' },
      { id: 'tg-var', name: 'Together variant', provider: 'together', parentId: 'together', model: OLD },
    ],
  });
  check(r.configs['my-together'].model === NEW, 'the custom AI config is replaced');
  check(r.ais[2].model === NEW, 'the variant\'s own model is replaced');
  check(r.swaps.length === 2, 'each is reported once', JSON.stringify(r.swaps));
}

console.log('  things that must not move');
{
  const r = run({
    configs: {
      together: { endpoint: TOGETHER, model: 'openai/gpt-oss-120b' },
      other: { endpoint: 'https://api.example.com/v1/chat/completions', model: OLD },
      broken: { endpoint: 'not a url', model: OLD },
    },
    ais: [{ id: 'other', name: 'Other', provider: 'other' }, { id: 'together', name: 'Together AI', provider: 'together' }],
  });
  check(r.configs.together.model === 'openai/gpt-oss-120b', 'a Together model the user chose is left alone');
  check(r.configs.other.model === OLD, 'the same id on another provider\'s endpoint is left alone');
  check(r.configs.broken.model === OLD && r.swaps.length === 0, 'a config with an unparseable endpoint is skipped, not thrown on');
}

console.log('  cached lists and recommendations');
{
  const r = run({
    configs: { together: { endpoint: TOGETHER, model: OLD } },
    ais: [{ id: 'together', name: 'Together AI', provider: 'together' }],
    store: {
      waxframe_models_together: JSON.stringify({ models: [OLD, 'a/b'] }),
      'waxframe_recommend_default-together-reviewer': JSON.stringify({ model: OLD }),
      waxframe_tiers_together: JSON.stringify({ tiers: { cheap: OLD } }),
      waxframe_models_perplexity: JSON.stringify({ models: ['sonar'] }),
      waxframe_v2_hive: JSON.stringify({ note: OLD }),
    },
  });
  check(!r.data.has('waxframe_models_together'), 'a cached model list naming it is dropped');
  check(!r.data.has('waxframe_recommend_default-together-reviewer'), 'a cached recommendation naming it is dropped');
  check(!r.data.has('waxframe_tiers_together'), 'a cached tier pick naming it is dropped');
  check(r.data.has('waxframe_models_perplexity'), 'an unrelated cache is kept');
  check(r.data.has('waxframe_v2_hive'), 'the hive itself is never touched by the cache sweep');
}

console.log(bad ? `\n❌ test-retired-model-migration: ${bad} problem(s).` : '\n✅ test-retired-model-migration: withdrawn models are replaced everywhere they can be saved.');
process.exit(bad ? 1 : 0);
