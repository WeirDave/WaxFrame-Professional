#!/usr/bin/env node
// ============================================================
//  WaxFrame — tools/flow-check.mjs
// Build: 20260923-004
// ============================================================
// End-to-end flow harness. Asserts DOM and app state instead of capturing
// screenshots, and drives a full hive against a same-origin mock provider so a
// complete multi-round run costs nothing and needs no API key.
//
// WHY THIS EXISTS. Every bug found on 2026-09-20 — a budget retry that had
// never once worked, a ceiling recorded against the wrong model, an auth card
// with no way out of it, a rejected request parameter, a diagnostic bundle that
// could not diagnose — was found by running the real application. None were
// visible to unit tests, because none of them are unit-sized. This closes that
// gap for the flows that are cheap to drive.
//
// ARCHITECTURE, borrowed wholesale from tools/capture.mjs, which already
// solved the hard parts:
//   1. A tiny static server for the repo (file:// blocks ES modules).
//   2. Chrome headless with --remote-debugging-port, driven over CDP.
//   3. State seeded through localStorage before the app boots, so the app
//      reads it during its own init exactly as if a user had configured it.
//   4. Wait for the page to PROVE it reached a state before asserting. Never
//      fire-and-pray on a timer.
//
// WHAT IT ADDS. The static server also answers /__mock/*, a provider endpoint
// speaking the OpenAI shape. CSP connect-src already permits 'self', so the app
// can call it with no CSP change and no exception carved for testing.
//
// Run: node tools/flow-check.mjs [--keep-open]
// Exit 0 when every flow passes, 1 otherwise.
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { disposeChrome, disposeChromeSync, listenOnFreePort } from './lib/chrome-profile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let SERVER_PORT = 8732;   // reassigned by listenOnFreePort
const DEBUG_PORT  = 9223;
const KEEP_OPEN   = process.argv.includes('--keep-open');

// ── Chrome discovery ──────────────────────────────────────────────────
// capture.mjs is handed a browser path by its PowerShell wrapper. This runs
// standalone and in CI, so it finds one itself. 64-bit Chrome first: Edge
// ships as an x86 stub on many systems that fails to start headless.
function findChrome() {
  if (process.env.WF_CHROME && fs.existsSync(process.env.WF_CHROME)) return process.env.WF_CHROME;
  const candidates = [
    path.join(process.env['ProgramFiles'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['ProgramFiles'] || '', 'Microsoft/Edge/Application/msedge.exe'),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const c of candidates) { try { if (c && fs.existsSync(c)) return c; } catch {} }
  for (const cmd of ['google-chrome', 'chromium', 'chrome']) {
    try { return execFileSync('which', [cmd], { encoding: 'utf8' }).trim(); } catch {}
  }
  return null;
}

// ── Results ───────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function check(label, condition, detail) {
  if (condition) { pass++; console.log(`    ✓ ${label}`); }
  else {
    fail++; failures.push(label);
    console.log(`    ✗ ${label}`);
    if (detail !== undefined) console.log(`        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
}
function section(t) { console.log(`\n▶ ${t}`); }

// ── Mock provider + static server ─────────────────────────────────────
// The mock answers in the OpenAI shape and streams SSE, because that is what
// the app now asks for. A non-streaming branch is kept so the fallback path
// can be exercised deliberately rather than by accident.
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.jpg': 'image/jpeg'
};

const mockCalls = [];

// A Builder reply has to satisfy the real parser: the three wrapper blocks,
// in order, with the literal markers. Anything less and the app is entitled to
// reject it, which would make a green test meaningless.
function builderBody(round) {
  return `%%DOCUMENT_START%%
Mock document, round ${round}.

This body exists so the length and word counters have something real to measure.
It is deliberately plain prose with no markdown, matching what the prompts ask for.
%%DOCUMENT_END%%

%%CONFLICTS_START%%
NO CONFLICTS
%%CONFLICTS_END%%

%%APPLIED_START%%
NO APPLIED CHANGES
%%APPLIED_END%%`;
}
const reviewerBody = (n) => `1. Line 1: mock reviewer ${n} suggests nothing of consequence.`;

function sseFor(text) {
  const frames = [];
  const chunkSize = 120;
  for (let i = 0; i < text.length; i += chunkSize) {
    frames.push('data: ' + JSON.stringify({
      choices: [{ delta: { content: text.slice(i, i + chunkSize) } }]
    }) + '\n\n');
  }
  frames.push('data: ' + JSON.stringify({
    choices: [{ delta: {}, finish_reason: 'stop' }],
    usage: { prompt_tokens: 100, completion_tokens: Math.ceil(text.length / 4), total_tokens: 100 + Math.ceil(text.length / 4) }
  }) + '\n\n');
  frames.push('data: [DONE]\n\n');
  return frames;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = decodeURIComponent(url.pathname);

  if (p === '/__mock/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ data: [{ id: 'mock-model', object: 'model', context_length: 32768 }] }));
  }
  if (p === '/__mock/calls') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockCalls));
  }
  if (p === '/__mock/reset') { mockCalls.length = 0; res.writeHead(200); return res.end('ok'); }

  if (p === '/__mock/chat') {
    let body = '';
    req.on('data', d => { body += d; });
    await new Promise(r => req.on('end', r));
    let parsed = {};
    try { parsed = JSON.parse(body); } catch {}
    const sys = (parsed.messages || []).find(m => m.role === 'system')?.content || '';
    const usr = (parsed.messages || []).find(m => m.role === 'user')?.content || '';
    // The Builder prompt carries the BUILDER marker; reviewers do not.
    const isBuilder = /BUILDER/.test(sys) || /BUILD STEP/.test(usr);
    mockCalls.push({
      isBuilder,
      model: parsed.model || null,
      stream: !!parsed.stream,
      budgetKey: parsed.max_tokens !== undefined ? 'max_tokens'
               : parsed.max_completion_tokens !== undefined ? 'max_completion_tokens' : null,
      budget: parsed.max_tokens ?? parsed.max_completion_tokens ?? null,
      promptChars: (sys + usr).length,
      // v3.63.554 - the shape of the body names the code path that built
      // it. A CI run failed the three assertions below with two requests
      // that carried neither `stream` nor a budget key, and nothing in the
      // output said which call they were or what they did carry. One
      // unreproducible failure is a puzzle; one that prints its own
      // evidence is a bug report.
      bodyKeys: Object.keys(parsed).sort(),
      // v3.63.554 - a ROUND request is one the catalog's body builder made:
      // it carries a system message, because that is where the WaxFrame
      // envelope goes. The app also makes small auxiliary calls - tier
      // classification is the one seen here - which are built by their own
      // code with a single user message. Those are not what the streaming
      // and budget assertions below are about, and a CI run failed all
      // three because two of them happened to land inside the window this
      // harness reads. Timing decided whether the check passed.
      isRound: !!sys
    });
    const text = isBuilder ? builderBody(mockCalls.filter(c => c.isBuilder).length) : reviewerBody(mockCalls.length);

    if (parsed.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
      for (const f of sseFor(text)) { res.write(f); await new Promise(r => setTimeout(r, 4)); }
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: Math.ceil(text.length / 4), total_tokens: 200 }
    }));
  }

  // Static
  const fp = path.resolve(path.join(ROOT, p === '/' ? '/index.html' : p));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(d);
  });
});

SERVER_PORT = await listenOnFreePort(server, SERVER_PORT);

const BROWSER = findChrome();
if (!BROWSER) {
  console.error('No Chrome or Chromium found. Set WF_CHROME to a browser binary.');
  server.close();
  process.exit(1);
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-flow-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--no-sandbox', '--window-size=1600,1000', '--force-device-scale-factor=1',
  `--user-data-dir=${profileDir}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'
], { stdio: 'ignore' });

let cleaned = false;

// --keep-open deliberately leaves the browser running, so its profile has to
// stay too — removing the profile out from under a live Chrome is what the old
// unconditional rmSync did. Say where it is instead of leaving it silently.
function keepOpenNotice() {
  console.log(`  (--keep-open: browser still running, profile kept at ${profileDir})`);
}

// The signal path. No turn of the event loop is left here, so the wait for
// Chrome to exit is a bounded blocking poll.
function cleanup(code) {
  if (cleaned) return; cleaned = true;
  try { server.close(); } catch {}
  if (KEEP_OPEN) keepOpenNotice();
  else disposeChromeSync(chrome, profileDir, 'flow-check');
  if (typeof code === 'number') process.exit(code);
}

// The normal path, which can afford to wait for the browser process properly.
async function cleanupAsync(code) {
  if (cleaned) return; cleaned = true;
  try { server.close(); } catch {}
  if (KEEP_OPEN) keepOpenNotice();
  else await disposeChrome(chrome, profileDir, 'flow-check');
  if (typeof code === 'number') process.exit(code);
}
process.on('SIGINT', () => cleanup(130));
process.on('SIGTERM', () => cleanup(143));
process.on('uncaughtException', (e) => { console.error('FATAL', e); cleanup(1); });

// ── CDP ───────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Must be a PAGE target, not the browser-level endpoint — the browser target
// does not implement Page.* or Runtime.*, and attaching to it fails with a
// bare "'Page.enable' wasn't found" that gives no hint why.
async function wsUrl() {
  for (let i = 0; i < 300; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      const tabs = await r.json();
      const tab = tabs.find(t => t.type === 'page');
      if (tab && tab.webSocketDebuggerUrl) return tab.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome never exposed a page target on the CDP endpoint');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let cdpId = 0;
const pendingCalls = new Map();
ws.onmessage = (ev) => {
  let m; try { m = JSON.parse(ev.data); } catch { return; }
  if (m.id != null && pendingCalls.has(m.id)) {
    const { res, rej } = pendingCalls.get(m.id);
    pendingCalls.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
function cdp(method, params = {}) {
  const id = ++cdpId;
  return new Promise((res, rej) => {
    pendingCalls.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pendingCalls.has(id)) { pendingCalls.delete(id); rej(new Error('CDP timeout: ' + method)); } }, 60000);
  });
}
await cdp('Page.enable');
await cdp('Runtime.enable');

// Evaluate an expression and hand back its value. Errors surface as thrown
// exceptions rather than silent undefined, because a test that silently reads
// undefined is a test that passes for the wrong reason.
async function evaluate(expression) {
  const r = await cdp('Runtime.evaluate', {
    // v3.63.554 - `await` added, and it is not cosmetic. This wrapper was a
    // plain function, so for an ASYNC expression it returned
    // JSON.stringify(Promise) - the string "{}" - the instant the promise was
    // created. awaitPromise could not help: what the wrapper returned was
    // already a string, so there was nothing left to await.
    //
    // Two consequences, both silent. evalAsync could never return a value, and
    // every caller had been written around that without anyone noticing. And
    // `await evalAsync('await runRound(); return true;')` did not wait for the
    // round - it returned while the round was still running, and only the
    // until() poll after it kept the harness roughly in step. That poll watches
    // the round COUNTER, which advances before the last request has landed, so
    // the next round could begin with requests from the previous one still in
    // flight. That is the likeliest explanation for a CI run recording ten
    // requests where this machine records eight, two of them carrying neither
    // a stream flag nor a budget.
    //
    // await on a non-promise is a no-op, so the synchronous callers are
    // unaffected.
    expression: `(async function(){ try { return JSON.stringify(await (${expression})); } catch (e) { return JSON.stringify({ __error: String(e && e.message || e) }); } })()`,
    awaitPromise: true, returnByValue: true
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'evaluate threw');
  const raw = r.result?.value;
  if (raw === undefined) return undefined;
  const v = JSON.parse(raw);
  if (v && v.__error) throw new Error('page error: ' + v.__error);
  return v;
}
const evalAsync = (body) => evaluate(`(async () => { ${body} })()`);

// Poll until an expression reports ready, so nothing races.
async function until(label, expression, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try { last = await evaluate(expression); if (last === true) return true; } catch (e) { last = String(e.message); }
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${label} (last: ${JSON.stringify(last)})`);
}

// ── Seeds ─────────────────────────────────────────────────────────────
const MOCK_BASE = `http://127.0.0.1:${SERVER_PORT}`;
const HIVE_SEED = {
  activeAIIds: ['chatgpt', 'claude', 'gemini'],
  knownDefaultIds: ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity', 'mistral'],
  hiveMode: 'internet', builder: 'claude',
  keys: { chatgpt: 'sk-FLOWCHECK', claude: 'sk-FLOWCHECK', gemini: 'sk-FLOWCHECK' },
  models: { chatgpt: 'mock-model', claude: 'mock-model', gemini: 'mock-model' },
  customAIs: [], customAIConfigs: {}
};
const PROJECT_SEED = {
  projectName: 'Flow Check', projectVersion: 'v1.0',
  goalDocType: 'Recipe', goalAudience: 'the harness', goalOutcome: 'prove the flow works',
  goalScope: '', goalTone: '', goalNotes: '',
  exportMask: '', lengthMode: 'none', lengthLimit: '', lengthMin: '',
  lengthUnit: 'characters', docTab: 'scratch', pastedDocument: '', referenceDocs: []
};

async function bootWithSeed() {
  await cdp('Runtime.evaluate', { expression: 'try{localStorage.clear()}catch(e){}' }).catch(() => {});
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `try {
      localStorage.setItem('waxframe_v2_hive', ${JSON.stringify(JSON.stringify(HIVE_SEED))});
      localStorage.setItem('waxframe_v2_project', ${JSON.stringify(JSON.stringify(PROJECT_SEED))});
      localStorage.setItem('waxframe_streaming', 'true');
    } catch (e) {}`
  });
  await cdp('Page.navigate', { url: `${MOCK_BASE}/index.html` });
  // Wait for the app's OWN boot to finish, not merely for its functions to
  // exist. app.js's DOMContentLoaded handler is async: it awaits loadSession()
  // (an IndexedDB read) and only then decides which screen to land on. Every
  // function it defines, goToScreen included, exists as soon as app.js parses
  // — far earlier. The previous gate checked exactly that, so on a slow IDB
  // read this harness navigated first and the app's own goToScreen() landed
  // afterwards and moved the screen back. Flow 1 then timed out waiting for a
  // screen it had already asked for, about one run in four.
  //
  // window.__wfBootComplete is set as the last statement of that handler, so
  // it is the only signal that means "the app has stopped moving on its own".
  await until('app boot complete', `window.__wfBootComplete === true`);
  // Point the three seeded AIs at the mock. Done at runtime rather than through
  // the persisted custom-AI schema on purpose: the schema is a product surface
  // that may legitimately change, and pinning a test to it would make this
  // harness fail for reasons that have nothing to do with the flows it checks.
  await evaluate(`(function(){
    ['chatgpt','claude','gemini'].forEach(function(p){
      if (!API_CONFIGS[p]) return;
      API_CONFIGS[p].endpoint = '${MOCK_BASE}/__mock/chat';
      API_CONFIGS[p].endpointFn = null;
      API_CONFIGS[p].format = 'openai';
      API_CONFIGS[p]._key = 'sk-FLOWCHECK';
      API_CONFIGS[p].bodyFn = window.WFProviderCatalog.buildApiConfigs().chatgpt.bodyFn;
      API_CONFIGS[p].extractFn = window.WFProviderCatalog.extractOpenAIText;
      API_CONFIGS[p].headersFn = function(){ return { 'Content-Type': 'application/json' }; };
    });
    return true;
  })()`);
}

// ══════════════════════════════════════════════════════════════════════
try {
  console.log(`flow-check — Chrome: ${path.basename(BROWSER)}  server: ${MOCK_BASE}`);

  // ── Flow 1: back-navigation through the setup screens ───────────────
  // The backlog entry names this as where state-leak bugs hide: partial
  // setup, then Back, then forward again.
  section('Flow 1 — Back-button paths through the setup screens');
  await bootWithSeed();

  const SCREENS = ['screen-bees', 'screen-project', 'screen-reference', 'screen-document'];
  for (const id of SCREENS) {
    await evaluate(`(goToScreen(${JSON.stringify(id)}), true)`);
    await until(`${id} visible`, `document.querySelector('.screen.active') && document.querySelector('.screen.active').id === ${JSON.stringify(id)}`);
    check(`${id} reachable`, true);
  }
  // Walk backwards and confirm the project fields survive every hop — the
  // specific failure this is guarding: a Back that quietly resets state.
  const nameBefore = await evaluate(`document.getElementById('projectName') ? document.getElementById('projectName').value : null`);
  for (const id of [...SCREENS].reverse()) {
    await evaluate(`(goToScreen(${JSON.stringify(id)}), true)`);
    await until(`${id} visible on the way back`, `document.querySelector('.screen.active').id === ${JSON.stringify(id)}`);
  }
  const nameAfter = await evaluate(`document.getElementById('projectName') ? document.getElementById('projectName').value : null`);
  check('project name survives a full backward walk', nameBefore === nameAfter, { nameBefore, nameAfter });
  const hiveAfter = await evaluate(`({ active: activeAIs.length, builder: builder })`);
  check('hive membership survives the walk', hiveAfter.active === 3, hiveAfter);
  check('builder selection survives the walk', hiveAfter.builder === 'claude', hiveAfter);

  // ── Flow 2: a full two-round hive against the mock ──────────────────
  section('Flow 2 — Two full rounds against the mock provider, zero spend');
  await fetch(`${MOCK_BASE}/__mock/reset`);
  await evaluate(`(function(){ docText=''; history.length=0; round=1; phase='draft'; window._partialRound=null; return true; })()`);
  await evaluate(`(goToScreen('screen-work'), initWorkScreen(true), true)`);

  await evalAsync(`await runRound(); return true;`);
  await until('round 1 finished', `(typeof round !== 'undefined' && round >= 2)`, 60000);
  const afterR1 = await evaluate(`({ round, historyLen: history.length, docLen: (docText||'').length, phase })`);
  check('round 1 advanced the round counter', afterR1.round === 2, afterR1);
  check('round 1 produced a document', afterR1.docLen > 0, afterR1);
  check('round 1 advanced the phase to refine', afterR1.phase === 'refine', afterR1);

  await evalAsync(`await runRound(); return true;`);
  await until('round 2 finished', `(typeof round !== 'undefined' && round >= 3)`, 60000);
  const afterR2 = await evaluate(`({ round, historyLen: history.length, docLen: (docText||'').length })`);
  check('round 2 advanced the round counter', afterR2.round === 3, afterR2);
  check('history grew across both rounds', afterR2.historyLen >= 2, afterR2);

  const calls = await (await fetch(`${MOCK_BASE}/__mock/calls`)).json();
  const builders = calls.filter(c => c.isBuilder);
  check('the mock was actually called', calls.length > 0, { calls: calls.length });
  check('a Builder call was made in each round', builders.length >= 2, { builders: builders.length });
  // Print the full record when any of the three below fails. Each one's own
  // detail is a list of values with no way back to the request it came from,
  // which is exactly what made a CI failure cost a round trip to understand.
  const roundCalls = calls.filter(c => c.isRound);
  const _requestsOk = roundCalls.every(c => c.stream === true)
                   && roundCalls.every(c => c.budget != null)
                   && roundCalls.every(c => c.budgetKey === 'max_tokens');
  if (!_requestsOk) {
    console.log('    \u2500 every recorded request, in order:');
    calls.forEach((c, i) => console.log('      ' + String(i + 1).padStart(2) + '. '
      + (c.isBuilder ? 'builder ' : 'reviewer')
      + '  stream=' + c.stream
      + '  budget=' + c.budget + ' (' + c.budgetKey + ')'
      + '  promptChars=' + c.promptChars
      + '  keys=' + JSON.stringify(c.bodyKeys)));
  }
  // Liveness: scoping to round requests is only safe while there ARE round
  // requests. A discriminator that stopped matching would empty this list and
  // make all three assertions below pass on nothing.
  check('the round requests are still recognisable as round requests',
    roundCalls.length >= 8, { round: roundCalls.length, total: calls.length });
  check('every round request streamed', roundCalls.every(c => c.stream === true), roundCalls.map(c => c.stream));
  check('every round request stated an output budget', roundCalls.every(c => c.budget != null), roundCalls.map(c => c.budget));
  check('the budget rode the max_tokens key for this shape',
    roundCalls.every(c => c.budgetKey === 'max_tokens'), roundCalls.map(c => c.budgetKey));
  // v3.63.554 - the AUXILIARY calls state one too. The tier-classification
  // call stated 400 tokens on the Anthropic shape and nothing at all on the
  // OpenAI shape: the same call, the same expected answer, two behaviours
  // depending on which provider was picked. An unstated budget hands the
  // gateway in front of us the right to cut the answer short, and a
  // classification that comes back truncated reads as a provider answering
  // badly rather than one that was cut off. Asserted only when such a call
  // happened, because whether one does is a timing question - which is the
  // whole reason the assertions above are scoped.
  // Driven rather than waited for. Whether one of these fires during a round
  // is a timing question - which is exactly what made the CI failure look
  // random - so it is called directly instead.
  const auxBefore = calls.length;
  await evalAsync(`
    try { await classifyTiersForProvider('chatgpt', {}); } catch (e) {}
    return true;
  `);
  const afterAux = await (await fetch(`${MOCK_BASE}/__mock/calls`)).json();
  const auxCalls = afterAux.slice(auxBefore).filter(c => !c.isRound);
  check('the auxiliary classification call was actually made (test is live)',
    auxCalls.length > 0, { made: afterAux.length - auxBefore });
  check('an auxiliary request states a budget too',
    auxCalls.every(c => c.budget != null), auxCalls.map(c => c.budget));

  // ── Flow 3: the Change Builder pill refreshes ───────────────────────
  // Regression guard for v3.63.405. The bug: setBuilder() refreshed the
  // Setup-2 picker but never the work-screen bee grid, so the BUILDER pill
  // stayed on the old card until something ELSE forced a redraw — the next
  // round completing, or leaving and re-entering the work screen.
  //
  // The test therefore calls setBuilder() and nothing else. Forcing a redraw
  // here would make it pass whether or not the fix is present, which is
  // exactly the trap the original bug hid behind.
  section('Flow 3 — Change Builder moves the BUILDER pill with no other redraw');
  const whichCardHasPill = `(function(){
    var tag = document.querySelector('.hex-builder-tag');
    if (!tag) return null;
    var card = tag.closest('[data-ai-id]') || tag.closest('.hex-cell') || tag.parentElement;
    return card ? (card.getAttribute('data-ai-id') || card.id || card.className) : 'no-card';
  })()`;
  await evaluate(`(function(){ builder='claude'; if (typeof renderBeeStatusGrid==='function') renderBeeStatusGrid(); return true; })()`);
  await sleep(200);
  const pillBefore = await evaluate(whichCardHasPill);
  check('a BUILDER pill exists on the work-screen bee grid', pillBefore !== null, { pillBefore });

  if (pillBefore !== null) {
    // The ONLY call. If setBuilder does not refresh the grid itself, the pill
    // stays where it was and this fails — which is the v3.63.405 bug.
    await evaluate(`(setBuilder('gemini'), true)`);
    await sleep(300);
    const pillAfter = await evaluate(whichCardHasPill);
    check('setBuilder alone moves the pill to the new card',
      pillAfter !== pillBefore, { pillBefore, pillAfter });
    check('state and UI agree on the Builder after the change',
      await evaluate(`builder`) === 'gemini');
  }

  // ── Flow 4: checkpoint save then return ────────────────────────────
  section('Flow 4 — Checkpoint save, then return to the work screen');
  await evaluate(`(goToScreen('screen-checkpoint'), true)`);
  await until('checkpoint screen visible', `document.querySelector('.screen.active').id === 'screen-checkpoint'`);
  check('checkpoint screen reachable mid-session', true);
  const beforeReturn = await evaluate(`({ round, historyLen: history.length, docLen: (docText||'').length })`);
  await evaluate(`(goToScreen('screen-work'), true)`);
  await until('back on the work screen', `document.querySelector('.screen.active').id === 'screen-work'`);
  const afterReturn = await evaluate(`({ round, historyLen: history.length, docLen: (docText||'').length })`);
  check('the session survives a checkpoint round trip',
    JSON.stringify(beforeReturn) === JSON.stringify(afterReturn), { beforeReturn, afterReturn });

  // ── Flow 5: nothing threw along the way ────────────────────────────
  section('Flow 5 — No uncaught page errors during any of the above');
  const pageErrors = await evaluate(`(window.__wfFlowErrors || []).length`);
  check('zero uncaught page errors', !pageErrors, { pageErrors });

  // ── Flow 6: a request that dies mid-build leaves no state behind ────
  // v3.63.554 — callAPI sets two GLOBALS around the one synchronous call to
  // cfg.bodyFn: WF_STREAM_THIS_REQUEST, which tells every body builder to add
  // `stream: true`, and WF_OUTPUT_BUDGET_OVERRIDE on a budget retry. Both were
  // restored on the line after bodyFn returned — inside the try. A bodyFn that
  // throws skipped both, and the flag stayed set for the whole session: every
  // later request in that tab would ask for a stream it was not going to read.
  //
  // Driven rather than reasoned about. One AI's bodyFn is replaced with one
  // that throws, callAPI is called and allowed to fail, and the flag is read
  // back. Then the real bodyFn is restored and a real round is run, so the
  // check also proves the app still works afterwards rather than only that a
  // variable is false.
  section('Flow 6 — A request that dies while building its body leaves no flag set');
  const leak = await evalAsync(`
    const cfg = API_CONFIGS['chatgpt'];
    const realBody = cfg.bodyFn;
    const ai = (typeof activeAIs !== 'undefined' ? activeAIs : []).find(a => a.provider === 'chatgpt')
            || { id: 'chatgpt', provider: 'chatgpt', name: 'ChatGPT' };
    window.WF_STREAM_THIS_REQUEST = false;
    cfg.bodyFn = function () { throw new Error('flow-check: body builder failed on purpose'); };
    let threw = false;
    try { await callAPI(ai, 'leak probe', '', 'reviewer', {}); }
    catch (e) { threw = true; }
    const flagAfter = window.WF_STREAM_THIS_REQUEST;
    const overrideAfter = window.WF_OUTPUT_BUDGET_OVERRIDE;
    cfg.bodyFn = realBody;
    return JSON.stringify({ threw: threw, flagAfter: flagAfter === true,
                            overrideAfter: overrideAfter === undefined ? 'undefined' : overrideAfter });
  `).then(s => JSON.parse(s));
  check('the failing request did fail (test is live)', leak.threw === true, leak);
  check('the streaming flag is not left set behind it', leak.flagAfter === false, leak);

  const afterLeak = await evalAsync(`
    await runRound();
    return true;
  `).then(() => fetch(`${MOCK_BASE}/__mock/calls`).then(r => r.json()));
  const since = afterLeak.slice(calls.length);
  check('a real round still runs after that failure', since.length > 0,
        { newCalls: since.length });
  const sinceRound = since.filter(c => c.isRound);
  check('and that round is a real one (test is live)', sinceRound.length >= 4,
        { round: sinceRound.length, total: since.length });
  check('and every one of its round requests still states a budget',
        sinceRound.every(c => c.budget != null), sinceRound.map(c => c.budget));
  check('and every one still asks to stream',
        sinceRound.every(c => c.stream === true), sinceRound.map(c => c.stream));

} catch (e) {
  fail++;
  failures.push('harness: ' + e.message);
  console.log(`\n✗ harness error: ${e.message}`);
}

console.log('');
if (fail === 0) {
  console.log(`✅ flow-check: all ${pass} assertions passed.`);
  await cleanupAsync(0);
} else {
  console.log(`❌ flow-check: ${fail} of ${pass + fail} assertions failed:`);
  failures.forEach(f => console.log(`  • ${f}`));
  await cleanupAsync(1);
}
