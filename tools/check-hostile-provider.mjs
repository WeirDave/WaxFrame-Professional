#!/usr/bin/env node
// Build: 20260921-001
// check-hostile-provider.mjs — pins the defences that stop a hostile or
// compromised provider (or model server) from reshaping WaxFrame's requests.
//
// Everything here PASSES today. That is the point. These are subtle,
// load-bearing guards with no obvious name on them, and each one is a single
// line that a refactor could delete without anything going red. This test
// exists so that deletion is loud.
//
// The three guards:
//
//   1. PROVIDER-ID COLLISION. addImportServerModels does
//      `API_CONFIGS[id] = {...}` — an unconditional overwrite — where `id`
//      derives from a model name the SERVER supplies. If a malicious server
//      could make that id collide with a configured provider, it would
//      repoint that provider's endpoint. makeCleanProviderId's taken()
//      check is what stops it: an id with a _key, or an aiList row, is
//      already claimed. Only bare unconfigured skeletons are claimable, and
//      those have nothing to steal.
//
//   2. BUDGET-KEY WHITELIST. callAPI learns a request-body parameter NAME
//      from the provider's own rejection text (parseParamRename) and
//      persists it. parseParamRename will return arbitrary names — the
//      second phrasing branch has no allowlist. budgetKeyFor is the guard:
//      it honours 'max_completion_tokens' and falls back to 'max_tokens'
//      for everything else, so a poisoned store cannot put an
//      attacker-chosen key into the JSON body.
//
//   3. BUDGET-NUMBER SANITY. parseBudgetRejection takes a token ceiling from
//      the same error text. resolveOutputBudget clamps a floor. There is no
//      upper clamp; that is reported rather than failed, because the
//      provider that named the number is the one that would reject it.
//
// Usage:  node tools/check-hostile-provider.mjs
// Exit 0 = every guard is still in place.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let bad = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`    ok  ${label}`);
  else {
    bad++; console.log(`    XX  ${label}`);
    if (detail !== undefined) console.log(`        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
};

// ══ Part 1 — request shaping. Pure Node; the catalog is require()-able. ══

console.log('check-hostile-provider\n');
console.log('  > Request-body shaping from provider error text');

const CATALOG_ROOT = require(path.join(ROOT, 'js', 'provider-catalog.js'));
const { WFProviderCatalog: C } = CATALOG_ROOT;

// Liveness: the parser must actually parse, or every assertion below is
// vacuous — a rename that returns null cannot poison anything.
const canonical = C.parseParamRename(
  "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.");
check('parseParamRename parses the real OpenAI phrasing (liveness)',
  !!(canonical && canonical.to === 'max_completion_tokens'), canonical);

// The hostile half: the second phrasing branch accepts ANY identifier.
const hostile = C.parseParamRename(
  "'max_tokens' is not supported with this model. Use 'messages' instead.");
check('a hostile rename really is parsed through (liveness — this is the input we defend against)',
  !!(hostile && hostile.to === 'messages'), hostile);

// Now prove the guard: no matter what the store was poisoned with, the body
// only ever carries a budget key from the allowlist, and nothing else is
// overwritten.
CATALOG_ROOT.WF_RESOLVE_OUTPUT_BUDGET = () => 4096; // make a budget exist so a key is emitted
const cfgs = C.buildApiConfigs();
const baseline = JSON.parse(cfgs.chatgpt.bodyFn('gpt-test', 'SYS---USR'));
check('baseline body carries model, messages and a budget key (liveness)',
  baseline.model === 'gpt-test' && Array.isArray(baseline.messages) &&
  ('max_tokens' in baseline || 'max_completion_tokens' in baseline), Object.keys(baseline));

const POISON = ['max_completion_tokens', 'model', 'messages', 'stream', 'n', '__proto__', 'constructor'];
for (const p of POISON) {
  CATALOG_ROOT.WF_BUDGET_KEY_FOR = () => p;
  const body = JSON.parse(cfgs.chatgpt.bodyFn('gpt-test', 'SYS---USR'));
  const keys = Object.keys(body);
  const budgetKeys = keys.filter(k => k === 'max_tokens' || k === 'max_completion_tokens');
  check(`poisoned with "${p}": body uses only an allowlisted budget key`,
    budgetKeys.length === 1 && keys.length === 3, keys);
  check(`poisoned with "${p}": model and messages survive intact`,
    body.model === 'gpt-test' && Array.isArray(body.messages) && body.messages.length === 2,
    { model: body.model, messages: Array.isArray(body.messages) ? body.messages.length : body.messages });
}
check('no prototype pollution from any poisoned key',
  ({}).max_tokens === undefined && ({}).polluted === undefined && Object.prototype.model === undefined);
delete CATALOG_ROOT.WF_BUDGET_KEY_FOR;

// Budget NUMBER: reported, not failed. See the header note.
const hugeCeiling = C.parseBudgetRejection(
  'max_tokens is too large: 1. This model supports at most 999999999999 tokens.');
console.log(`      (note) a provider-named ceiling of ${Number(hugeCeiling).toLocaleString()} is accepted ` +
            'as-is — resolveOutputBudget clamps a floor but no upper bound');

// ══ Part 2 — provider-id collision. Needs the live app. ══

function findChrome() {
  if (process.env.WF_CHROME && fs.existsSync(process.env.WF_CHROME)) return process.env.WF_CHROME;
  const c = [
    path.join(process.env['ProgramFiles'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['ProgramFiles'] || '', 'Microsoft/Edge/Application/msedge.exe'),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const p of c) { try { if (p && fs.existsSync(p)) return p; } catch {} }
  for (const cmd of ['google-chrome', 'chromium', 'chrome']) {
    try { return execFileSync('which', [cmd], { encoding: 'utf8' }).trim(); } catch {}
  }
  return null;
}

const BROWSER = findChrome();
if (!BROWSER) { console.error('\nNo Chrome or Chromium found. Set WF_CHROME to a browser binary.'); process.exit(2); }

// Assembled, not written as a literal — no credential-shaped string in source.
const SEEDED_KEY = ['sk', 'ant', 'IDCOLLISION' + 'A'.repeat(24)].join('-');
const HIVE_SEED = {
  activeAIIds: ['claude', 'chatgpt'],
  knownDefaultIds: ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity', 'mistral'],
  hiveMode: 'internet', builder: 'claude',
  keys: { claude: SEEDED_KEY },
  models: {}, customAIs: [], customAIConfigs: {}
};

const PORT = 8790 + (process.pid % 150);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const DEBUG_PORT = 9330 + (process.pid % 150);
const profile = path.join(os.tmpdir(), `wf-hostileprov-${process.pid}`);
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1600,1000',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;

// Every spelling a server could give a model to try to land on a claimed id.
function probeIds() {
  const names = {
    exact: 'claude', cased: 'Claude', spaced: '  claude  ',
    punctuated: 'c.l.a.u.d.e', dashed: 'claude-', underscored: '_claude_',
    activeUnkeyed: 'chatgpt'
  };
  const out = { resolved: {} };
  for (const k of Object.keys(names)) out.resolved[k] = makeCleanProviderId(names[k]);
  out.keyLoaded = !!(window.API_CONFIGS && API_CONFIGS.claude && API_CONFIGS.claude._key);
  out.fnExists = typeof makeCleanProviderId === 'function';
  out.realEndpoint = (window.API_CONFIGS && API_CONFIGS.claude && API_CONFIGS.claude.endpoint) || null;
  out.unconfiguredSkeleton = makeCleanProviderId('cohere');
  return JSON.stringify(out);
}

try {
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const pg = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pg) wsUrl = pg.webSocketDebuggerUrl;
    } catch {}
    if (!wsUrl) await sleep(250);
  }
  if (!wsUrl) throw new Error('no page target appeared');

  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws failed')); });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const cdp = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, (m) => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 60000 });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };

  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('waxframe_v2_hive', ${JSON.stringify(JSON.stringify(HIVE_SEED))}); } catch (e) {}`
  });
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await sleep(5000);

  console.log('\n  > A hostile model server tries to claim a configured provider id');
  const a = JSON.parse(await evaluate(`(${probeIds.toString()})()`));
  check('makeCleanProviderId exists (liveness)', a.fnExists === true, a);
  check('the seeded provider key really loaded (liveness)', a.keyLoaded === true, a);
  check('the real provider endpoint is present (liveness)', !!a.realEndpoint, a);
  for (const k of Object.keys(a.resolved)) {
    const claimed = k === 'activeUnkeyed' ? 'chatgpt' : 'claude';
    check(`a server model spelled "${k}" cannot claim id "${claimed}"`,
      a.resolved[k] !== claimed, `resolved to ${JSON.stringify(a.resolved[k])}`);
  }
  console.log(`      (note) an unconfigured skeleton is still claimable: "cohere" -> ` +
              `${JSON.stringify(a.unconfiguredSkeleton)} — by design, nothing to hijack`);

} catch (err) {
  bad++;
  console.log(`    XX  harness error: ${err.message}`);
} finally {
  try { ws && ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  await new Promise(r => server.close(r));
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log(bad
  ? `\nFAIL check-hostile-provider: ${bad} check(s) failed — a guard against provider-controlled input is gone.`
  : `\nPASS check-hostile-provider: every guard is still in place.`);
process.exit(bad ? 1 : 0);
