#!/usr/bin/env node
// ============================================================
// tools/pricing-worker/check-price-parsers-live.mjs
//
// Reads every parser-covered row off the provider's LIVE pricing page (real
// network) and compares it with data/pricing-seed.json. Writes nothing.
//
// NOT part of the release gate: it needs the network and the providers'
// pages, so it can fail for reasons that are not a bug here. Run it by
// hand when:
//   - a parser (src/prices.js) changes,
//   - a pricing email says a model was "not listed" or "could not be read",
//   - before trusting a price proposal from a parser row.
// tools/pricing-worker/test-prices.mjs is the offline gate; this is how you
// find out the pages still look the way those saved captures do.
//
// This fetches from YOUR machine. The Worker fetches from Cloudflare, which
// a provider may treat differently. For that, POST /api/prices on the Worker
// (same bearer token as /api/refresh) runs the same read from there.
//
// Run: node tools/pricing-worker/check-price-parsers-live.mjs
// Exit 0 if every covered row was read; exit 1 if any row could not be.
// A row that is read but differs from the seed is reported, not an error:
// that is exactly what a price proposal is.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readPrices } from './src/prices.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(HERE, 'data/pricing-seed.json'), 'utf8'));

const out = await readPrices({ providers: seed.providers, fetchImpl: fetch, now: new Date() });
let same = 0, differ = 0, unread = 0, notListed = 0;
for (const p of seed.providers) {
  for (const m of p.models || []) {
    const o = out.get(`${p.id}::${m.id}`);
    if (!o) continue;
    const label = `${p.id}/${m.id}`;
    if (!o.ok) {
      if (/is not listed on/.test(o.reason)) { notListed++; console.log(`GONE   ${label}: no longer on the page`); }
      else { unread++; console.log(`UNREAD ${label}: ${o.reason}`); }
      continue;
    }
    const page = `$${o.inputPerM}/$${o.outputPerM}`;
    const stored = `$${m.inputPerM}/$${m.outputPerM}`;
    if (o.inputPerM === m.inputPerM && o.outputPerM === m.outputPerM) { same++; console.log(`same   ${label}: ${page}${o.note ? '  [' + o.note + ']' : ''}`); }
    else { differ++; console.log(`DIFFER ${label}: page ${page}, seed ${stored}${o.note ? '  [' + o.note + ']' : ''}`); }
  }
}
console.log(`\n${same} same · ${differ} differ · ${notListed} no longer listed · ${unread} unreadable`);
if (notListed) console.log('"No longer listed" is information, not an error: the model is gone from that page (compare with the roster check to see whether the API still serves it).');
if (unread) console.log('Unreadable rows mean a page that changed shape or could not be fetched: the parser needs attention.');
process.exit(unread ? 1 : 0);
