#!/usr/bin/env node
// Build: 20261115-001
// test-round-estimate.mjs — the pre-flight round estimate and the Auto spend limit.
//
// Loads the REAL js/session-spend.js and slices the REAL estimate / limit code
// and the Auto chain decision out of js/app.js, into a sandbox with stand-in
// browser objects. Nothing here is a copy of the logic under test.
//
// What it proves:
//   • the estimate prices tokens at the snapshot's list price, and a model that
//     is not in the snapshot is reported as unpriced rather than as $0;
//   • computeRoundEstimate() covers the hive the round would really use (the
//     Builder always, other AIs only while switched on) and returns null
//     instead of throwing when anything is wrong;
//   • the Auto spend limit is off by default, trips on spend already past the
//     limit and on a next round that would pass it, is re-armed by Resume, and
//     is checked BEFORE a round is chained;
//   • the saved limit is clamped and garbage means "no limit".
//
// Usage:  node tools/test-round-estimate.mjs
// Exit 0 = every case behaved as required.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEND_SRC = fs.readFileSync(path.join(ROOT, 'js/session-spend.js'), 'utf8');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

let bad = 0;
const fail = (msg, detail) => { bad++; console.log(`    ✗ ${msg}`); if (detail !== undefined) console.log(`        ${detail}`); };
const ok = (msg) => console.log(`    ✓ ${msg}`);
const check = (cond, msg, detail) => (cond ? ok(msg) : fail(msg, detail));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

function slice(src, from, to) {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a + 1);
  if (a < 0 || b < 0) { console.log(`✗ could not find "${from}" … "${to}" in js/app.js`); process.exit(1); }
  return src.slice(a, b);
}

const SETTINGS_BLOCK = slice(APP_SRC, 'const AUTO_SETTINGS = {', '// Public getters other code');
const GETTER = APP_SRC.split('\n').find(l => l.startsWith('function getAutoSpendLimit()'));
const SAVER = slice(APP_SRC, 'function saveAutoSpendLimit(val)', '// Restore every Auto Mode setting');
const ESTIMATE_BLOCK = slice(APP_SRC, '// ── Round cost estimate and Auto spend limit', '// ── The chain decision');
const CHAIN_FN = slice(APP_SRC, 'function _autoMaybeChainNextRound(ctx)', '// v3.35.1 — Centralized chain-fire gate.');
if (!GETTER) { console.log('✗ getAutoSpendLimit not found in js/app.js'); process.exit(1); }

const SNAPSHOT = {
  lastUpdated: '2026-11-14T00:00:00Z',
  providers: [
    { id: 'claude', models: [{ id: 'claude-sonnet-5-5', status: 'verified', inputPerM: 2, outputPerM: 10 }] },
    { id: 'gemini-paid', models: [{ id: 'gemini-3.8-flash', status: 'verified', inputPerM: 0.75, outputPerM: 3.75 }] },
  ],
};

/** A fresh sandbox with the real spend meter and the real app.js slices loaded. */
function makeSandbox({ hive, builderId, sessionIds = null, docText = '', promptFn = null } = {}) {
  const store = new Map();
  const els = {
    workDocument: { value: docText },
    setAutoSpendLimit: { value: '' },
    'screen-work': { classList: { contains: () => true } },
  };
  const log = [];
  const sb = {
    console, Math, Number, String, Array, Object, Set, Map, JSON, parseFloat, parseInt, isFinite,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
    document: {
      readyState: 'complete',
      getElementById: (id) => els[id] || null,
      addEventListener: () => {},
    },
    toast: (m) => log.push(['toast', m]),
    consoleLog: (m, kind) => log.push([kind || 'log', m]),
    activeAIs: hive || [],
    builder: builderId || null,
    API_CONFIGS: { claude: { model: 'claude-sonnet-5-5' }, gemini: { model: 'gemini-3.8-flash' }, custom: { model: 'local-model' } },
    getModelForAI: (ai) => ai.model || null,
    buildPromptForAI: promptFn || ((ai, responses) => 'p'.repeat(2000 + (docText || '').length + (responses || []).reduce((n, r) => n + r.response.length, 0))),
    round: 3,
    AUTO_STALL_WINDOW: 3,
    getAutoStreakLimit: () => 2,
    getAutoBackupBuilder: () => '',
    updateAutoToggleUI: () => {},
    _autoResolveUserDecisions: () => null,
  };
  sb.window = sb;
  sb.window.sessionAIs = sessionIds ? new Set(sessionIds) : undefined;
  sb.window.WFPricing = { snapshot: SNAPSHOT };
  sb._els = els; sb._store = store; sb._log = log;
  vm.createContext(sb);
  vm.runInContext(SPEND_SRC, sb);
  vm.runInContext(`${SETTINGS_BLOCK}\n${GETTER}\n${SAVER}\n${ESTIMATE_BLOCK}`, sb);
  return sb;
}

const AI = (id, provider, model) => ({ id, name: id.toUpperCase(), provider, model });
const usage = (inTok, outTok) => ({ usage: { prompt_tokens: inTok, completion_tokens: outTok } });

console.log('test-round-estimate — pre-flight estimate and the Auto spend limit\n');

console.log('  WFSpend.estimate');
{
  const sb = makeSandbox();
  const S = sb.WFSpend;
  const claude = AI('claude', 'claude');
  const e = S.estimate([
    { ai: claude, model: 'claude-sonnet-5-5', role: 'Reviewer', inTok: 1_000_000, outTok: 100_000 },
    { ai: AI('local', 'custom'), model: 'local-model', role: 'Reviewer', inTok: 50_000, outTok: 500 },
  ]);
  check(near(e.total, 3.0), 'priced row: 1M in x $2 + 100K out x $10 = $3.00', e.total);
  check(e.unpriced === 1 && e.rows[1].usd === null, 'a model not in the snapshot is unpriced (null), not $0', JSON.stringify(e.rows[1]));
  check(near(e.total, e.rows[0].usd), 'an unpriced row adds nothing to the total');
  const g = S.estimate([{ ai: AI('gem', 'gemini'), model: 'gemini-3.8-flash', role: 'Reviewer', inTok: 1_000_000, outTok: 1_000_000 }]);
  check(near(g.total, 4.5), 'gemini rows are priced from the gemini-paid snapshot entry', g.total);
  check(S.estimate(null).rows.length === 0 && S.estimate([null, {}]).rows.length === 0, 'junk input yields an empty estimate instead of throwing');
  check(S.tokensFromChars(4001) === 1001 && S.tokensFromChars(0) === 0 && S.tokensFromChars(-5) === 0, 'tokensFromChars is ceil(chars / 4) and never negative');
}

console.log('  WFSpend.latestRoundCost');
{
  const sb = makeSandbox();
  const S = sb.WFSpend;
  const ai = AI('claude', 'claude');
  check(S.latestRoundCost() === 0, 'nothing recorded -> 0');
  S.record(ai, 'claude-sonnet-5-5', usage(1_000_000, 0), 5);   // $2.00 on round 5
  S.record(ai, 'claude-sonnet-5-5', usage(500_000, 0), 3);     // $1.00 on round 3
  check(near(S.latestRoundCost(), 2.0), 'the highest round number wins, not the last one recorded', S.latestRoundCost());
}

console.log('  computeRoundEstimate');
{
  const hive = [AI('claude', 'claude', 'claude-sonnet-5-5'), AI('gem', 'gemini', 'gemini-3.8-flash'), AI('local', 'custom', 'local-model')];
  const sb = makeSandbox({ hive, builderId: 'claude', docText: 'd'.repeat(4000) });
  const e = vm.runInContext('computeRoundEstimate()', sb);
  check(e && e.rows.length === 4, 'one reviewer row per AI plus one Builder row', e && e.rows.length);
  check(e.rows[0].role === 'Reviewer + Builder' && e.rows[3].role === 'Builder', 'the Builder is labelled on both of its calls', e.rows.map(r => r.role).join(', '));
  check(e.unpriced === 1 && e.rows[2].usd === null, 'only the custom AI\'s call is unpriced; the others are priced', `${e.unpriced} unpriced`);
  const builderRow = e.rows[3];
  const docTok = 1000;
  check(Math.abs(builderRow.outTok - (Math.ceil(docTok * 1.15) + 300)) <= 1, 'Builder output is about the document plus the conflicts and applied blocks', builderRow.outTok);
  check(builderRow.inTok > e.rows[0].inTok, 'the Builder call carries the reviewers\' answers, so its prompt is larger', `${builderRow.inTok} vs ${e.rows[0].inTok}`);
}
{
  const hive = [AI('claude', 'claude', 'claude-sonnet-5-5'), AI('gem', 'gemini', 'gemini-3.8-flash')];
  const sb = makeSandbox({ hive, builderId: 'claude', sessionIds: ['gem'], docText: 'doc' });
  // sessionAIs holds only gem: the Builder must still be counted (runRound always runs it).
  const e = vm.runInContext('computeRoundEstimate()', sb);
  check(e.rows.length === 3, 'Builder + the one AI switched on: 2 reviewer rows + Builder row', e.rows.length);
  const sb2 = makeSandbox({ hive, builderId: 'claude', sessionIds: [], docText: 'doc' });
  const e2 = vm.runInContext('computeRoundEstimate()', sb2);
  check(e2.rows.length === 2 && e2.rows.every(r => r.name === 'CLAUDE'), 'every other AI switched off: only the Builder is priced', e2.rows.length);
  const empty = makeSandbox({ docText: '' });
  check(vm.runInContext('computeRoundEstimate()', empty) === null, 'no hive / no Builder -> null, not an error');
  const boom = makeSandbox({ hive, builderId: 'claude', promptFn: () => { throw new Error('prompt builder broke'); } });
  check(vm.runInContext('computeRoundEstimate()', boom) === null, 'a failure while building a prompt -> null, never an exception');
  const noDoc = makeSandbox({ hive, builderId: 'claude', docText: '' });
  const nd = vm.runInContext('computeRoundEstimate()', noDoc);
  check(nd.rows[0].outTok === 1200, 'with no document every reviewer is assumed to write a draft', nd.rows[0].outTok);
}

console.log('  saved limit');
{
  const sb = makeSandbox();
  const get = () => vm.runInContext('getAutoSpendLimit()', sb);
  check(get() === 0, 'default is 0 (no limit)');
  vm.runInContext('saveAutoSpendLimit("2.5")', sb);   check(get() === 2.5, '"2.5" saves as $2.50', get());
  vm.runInContext('saveAutoSpendLimit("3.14159")', sb); check(get() === 3.14, 'rounded to cents', get());
  vm.runInContext('saveAutoSpendLimit("")', sb);      check(get() === 0, 'blank means no limit', get());
  vm.runInContext('saveAutoSpendLimit("-4")', sb);    check(get() === 0, 'a negative number means no limit', get());
  vm.runInContext('saveAutoSpendLimit("abc")', sb);   check(get() === 0, 'text means no limit', get());
  vm.runInContext('saveAutoSpendLimit("99999")', sb); check(get() === 10000, 'clamped to $10,000', get());
  sb._store.set('waxframe_auto_spend_limit', 'garbage');
  check(get() === 0, 'a corrupted stored value reads as no limit');
  check(vm.runInContext('AUTO_SETTINGS.spendLimit.def', sb) === '0', 'Reset to defaults restores "no limit" (the AUTO_SETTINGS default)');
}

console.log('  Auto spend limit');
{
  const claude = AI('claude', 'claude', 'claude-sonnet-5-5');
  const sb = makeSandbox({ hive: [claude], builderId: 'claude', docText: 'doc' });
  const reason = () => vm.runInContext('_autoSpendHaltReason()', sb);
  const spend = (usd, roundNo) => sb.WFSpend.record(claude, 'claude-sonnet-5-5', usage(usd / 2 * 1e6, 0), roundNo);
  vm.runInContext('_autoSpendRearm()', sb);

  spend(5, 1);
  check(reason() === null, 'limit off (0): never halts, however much has been spent');
}
{
  const claude = AI('claude', 'claude', 'claude-sonnet-5-5');
  const sb = makeSandbox({ hive: [claude], builderId: 'claude', docText: 'doc' });
  const reason = () => vm.runInContext('_autoSpendHaltReason()', sb);
  const spend = (usd, roundNo) => sb.WFSpend.record(claude, 'claude-sonnet-5-5', usage(usd / 2 * 1e6, 0), roundNo);
  spend(0.5, 1);                                        // before Auto was turned on
  vm.runInContext('_autoSpendRearm()', sb);             // Auto turned on: baseline = $5
  vm.runInContext('saveAutoSpendLimit("1")', sb);
  check(reason() === null, '$0.50 spent before Auto was turned on does not count toward the run', reason());

  spend(0.40, 2);
  check(reason() === null, '$0.40 spent, next round about $0.40: $0.80 is under $1.00, Auto continues', reason());

  spend(0.40, 3);
  const r1 = reason();
  check(r1 && /next round is estimated/.test(r1), '$0.80 spent and another ~$0.40 would pass $1.00: halts before the round', r1);

  spend(0.40, 4);
  const r2 = reason();
  check(r2 && /reaches your/.test(r2), '$1.20 spent: halts as the limit is already reached', r2);

  vm.runInContext('_autoSpendRearm()', sb);             // Resume
  check(reason() === null, 'Resume re-arms the baseline: a fresh allowance, and the next round may run', reason());
  check(/\$1\.00 spend limit/.test(r2) &&/Resume gives Auto a fresh/.test(r2), 'the halt text names the limit and says what Resume does', r2);

  sb.WFSpend.reset();
  check(reason() === null, 'the meter being reset (new project) does not produce a negative spend or a halt', reason());
}

console.log('  _autoMaybeChainNextRound');
{
  const claude = AI('claude', 'claude', 'claude-sonnet-5-5');
  const build = () => {
    const sb = makeSandbox({ hive: [claude], builderId: 'claude', docText: 'doc' });
    const calls = [];
    sb._autoHalt = (code, text) => calls.push(['halt', code, text]);
    sb._autoFireChainedRound = (label, kind) => calls.push(['fire', label, kind]);
    vm.runInContext(CHAIN_FN, sb);
    sb.window._autoMode = true;
    sb.window._autoCeilingTarget = null;
    sb.window._autoSatisfiedHist = [];
    sb.window._autoFailureStreak = 0;
    sb._calls = calls;
    return sb;
  };

  const a = build();
  vm.runInContext('_autoSpendRearm()', a);
  vm.runInContext('_autoMaybeChainNextRound({ outcome: "success", satisfied: 1, total: 4 })', a);
  check(a._calls.length === 1 && a._calls[0][0] === 'fire', 'no limit set: the next round is chained as before', JSON.stringify(a._calls));

  const b = build();
  vm.runInContext('_autoSpendRearm(); saveAutoSpendLimit("1")', b);
  b.WFSpend.record(claude, 'claude-sonnet-5-5', usage(1_000_000, 0), 2);   // $2.00 this run
  vm.runInContext('_autoMaybeChainNextRound({ outcome: "success", satisfied: 1, total: 4 })', b);
  check(b._calls.length === 1 && b._calls[0][0] === 'halt' && b._calls[0][1] === 'spend', 'limit passed: halts with reason code "spend" and chains nothing', JSON.stringify(b._calls));

  const c = build();
  vm.runInContext('_autoSpendRearm(); saveAutoSpendLimit("1")', c);
  c.WFSpend.record(claude, 'claude-sonnet-5-5', usage(1_000_000, 0), 2);
  vm.runInContext('_autoMaybeChainNextRound({ outcome: "unanimous", satisfied: 4, total: 4 })', c);
  check(c._calls.length === 0, 'convergence is still reported as convergence: Auto turns off, no spend halt on top', JSON.stringify(c._calls));
}

console.log(bad === 0 ? '\nAll cases passed.' : `\n${bad} case(s) failed.`);
process.exit(bad === 0 ? 0 : 1);
