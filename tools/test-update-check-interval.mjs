#!/usr/bin/env node
// Build: 20261026-001
// test-update-check-interval.mjs — how long the portable install's update
// notifier trusts its last answer before it asks GitHub again.
//
// js/update-check.js caches the Releases API result in localStorage. A constant
// that nothing exercises can be changed to any value and every other check stays
// green, so this loads the REAL file into a sandbox with a stand-in localStorage
// and fetch, seeds the cache at a chosen age, and counts whether fetch was
// reached.
//
// Usage:  node tools/test-update-check-interval.mjs
// Exit 0 = every case behaved as the cache rules require.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'js/update-check.js'), 'utf8');
const CACHE_KEY = 'waxframe_update_check';
const MIN = 60 * 1000;

let bad = 0;
const fail = (msg, detail) => {
  bad++;
  console.log(`    ✗ ${msg}`);
  if (detail !== undefined) console.log(`        ${detail}`);
};
const ok = (msg) => console.log(`    ✓ ${msg}`);

/** Run update-check.js once and report whether it called fetch. */
async function run({ protocol = 'file:', cache = null }) {
  const store = new Map();
  if (cache) store.set(CACHE_KEY, JSON.stringify(cache));
  let fetches = 0;
  const sandbox = {
    APP_VERSION: 'v9.9.9 Pro',
    location: { protocol },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
    },
    // The stand-in fails, so a call that does happen ends in the error cache
    // instead of reaching for DOM that does not exist here.
    fetch: () => { fetches++; return Promise.reject(new Error('stand-in network')); },
    document: {
      readyState: 'complete',
      currentScript: null,
      addEventListener() {},
      getElementById: () => null,
      querySelector: () => null,
      createElement: () => ({}),
      head: { appendChild() {} },
    },
    console,
    Promise, JSON, Date, parseInt, String, Number, Array, Math,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'js/update-check.js' });
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  return { fetches, stored: store.get(CACHE_KEY) };
}

// A good answer for the version that is running, so a cache hit renders nothing.
const good = (ageMin) => ({
  checkedAt: Date.now() - ageMin * MIN,
  latestTag: 'v9.9.9', latestVersion: '9.9.9', htmlUrl: '', releases: [],
  truncated: false, error: false, kind: null,
});
const failed = (ageMin, extra = {}) => ({
  checkedAt: Date.now() - ageMin * MIN, error: true, kind: 'network', ...extra,
});

const CASES = [
  { name: 'no cache at all asks GitHub',                 args: { cache: null },                 fetches: 1 },
  { name: 'an answer 50 minutes old is reused',          args: { cache: good(50) },             fetches: 0 },
  { name: 'an answer 70 minutes old is replaced',        args: { cache: good(70) },             fetches: 1 },
  { name: 'an answer 5 hours old is replaced',           args: { cache: good(300) },            fetches: 1 },
  { name: 'a failure 10 minutes old is not retried yet', args: { cache: failed(10) },           fetches: 0 },
  { name: 'a failure 40 minutes old is retried',         args: { cache: failed(40) },           fetches: 1 },
  { name: 'a rate limit holds until its reset time',
    args: { cache: failed(20, { kind: 'ratelimit', resetAt: Date.now() + 30 * MIN }) },         fetches: 0 },
  { name: 'a hosted page never checks',                  args: { protocol: 'https:', cache: null }, fetches: 0 },
];

console.log('test-update-check-interval — when the notifier asks GitHub again\n');

for (const c of CASES) {
  let got;
  try {
    got = await run(c.args);
  } catch (e) {
    fail(`${c.name}: the script threw`, e.message);
    continue;
  }
  if (got.fetches === c.fetches) ok(c.name);
  else fail(c.name, `fetch was called ${got.fetches} time(s), expected ${c.fetches}`);
}

// Liveness: the stand-in fetch must be reachable at all, or "0 calls" proves
// nothing. The first case asks for a call and would fail above if it were not.
if (CASES.filter((c) => c.fetches === 1).length < 3) {
  fail('too few cases expect a call to GitHub', 'the zero-call cases are only meaningful beside the one-call ones');
}

console.log(bad
  ? `\n❌ test-update-check-interval: ${bad} problem(s).`
  : '\n✅ test-update-check-interval: the cache rules hold.');
process.exit(bad ? 1 : 0);
