#!/usr/bin/env node
// Build: 20260922-004
// check-export-redaction.mjs — do the files WaxFrame hands out actually
// carry what the redaction code says they carry?
//
// There is already a test for this, and it passes, and it is not enough.
// tools/test-debug-redaction.mjs feeds fixtures to WF_DEBUG.scrubFailureRecord
// and proves the scrubber works WHEN CALLED. It never assembles a bundle, so
// it cannot see a second, unscrubbed copy of the same data sitting elsewhere
// in the same file. That is exactly what shipped: bundleForScout() scrubs
// envelope.lastFailure and envelope.liveConsole, then embeds
// checkpoint.IDB_SESSION straight from idbGet() — which carries lastFailure,
// ringBuffer and consoleHTML verbatim.
//
// So this test does not ask whether the scrubber works. It builds the REAL
// artifact, byte for byte, and searches the whole file for a credential that
// should not be in it. A redaction control is only worth what the shipped
// file says it is worth.
//
// Fixed in v3.63.537 (WF_DEBUG.scrubSessionDebug, called from both export
// paths). This check is the proof, and it stays because the regression it
// catches — someone dropping one of those two calls — would pass every
// other test in the repo.
//
// Why it matters: js/storage.js calls these blobs "safe to share in a public
// bug report", and help.html owns that flow. lastFailure.raw is the
// provider's entire error body; consoleHTML is the console transcript as
// markup. Checkpoints are shared more casually still — they are the
// documented way to hand someone an exact-model recipe.
//
// Method notes, both learned the hard way in this repo:
//   • Liveness before safety. Every block first proves the canary actually
//     reached live state and IndexedDB. A search for a string that was never
//     seeded passes while testing nothing.
//   • The canaries are ASSEMBLED at runtime, never written as literals, so
//     no credential-shaped string exists in this file for a scanner — ours
//     or anyone else's — to trip over. They are invented and match nothing.
//
// Usage:  node tools/check-export-redaction.mjs
// Exit 0 = every export surface is clean. GREEN as of v3.63.537.
//
// Deliberately NOT a release-check stage: it needs Chrome, and the gate is
// pure Node standard library by design so it runs anywhere including CI.
// The structural half — that both export paths still CALL the scrubber —
// is pinned in tools/test-debug-redaction.mjs, which the gate does run.
// Between them: the gate catches the call being deleted, this catches the
// call being wrong.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

// Assembled, not written. Each has a distinct tag so a hit names the field it
// came from. The shapes match what scrubFailureRecord is built to catch.
const TAGS = {
  hiveKey:     'HIVEKEY',
  failMessage: 'FAILMSG',
  failRaw:     'FAILRAW',
  ringBuffer:  'RINGBUF',
  console:     'CONSOLE'
};
const keyish = (tag) => ['sk', 'ant', tag + 'A'.repeat(26)].join('-');
const CANARIES = Object.fromEntries(Object.entries(TAGS).map(([k, t]) => [k, keyish(t)]));

// The mirror image, and the reason this test is not just "grep for secrets".
// This one is credential-SHAPED text sitting in the user's own document. It
// must come through byte for byte: the debug channels get scrubbed, user
// content does not, because a checkpoint has to restore what was written.
// Passed in alongside the canaries but asserted PRESENT, never absent.
CANARIES.docBody = keyish('DOCBODY');
const MUST_BE_ABSENT = Object.keys(TAGS);

const HIVE_SEED = {
  activeAIIds: ['claude'],
  knownDefaultIds: ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity', 'mistral'],
  hiveMode: 'internet',
  builder: 'claude',
  keys: { claude: CANARIES.hiveKey },
  models: {}, customAIs: [], customAIConfigs: {}
};

let bad = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`    ok  ${label}`);
  else {
    bad++; console.log(`    XX  ${label}`);
    if (detail !== undefined) console.log(`        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
};

const BROWSER = findChrome();
if (!BROWSER) { console.error('No Chrome or Chromium found. Set WF_CHROME to a browser binary.'); process.exit(2); }

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
const profile = path.join(os.tmpdir(), `wf-exportredact-${process.pid}`);
console.log(`check-export-redaction — serving ${ROOT} on :${PORT}\n`);

const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1600,1000',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;

// ── In-page routines. Defined as real functions and shipped via toString()
// so they stay readable and lintable instead of becoming string soup.

// Seed the debug side-channels the way the app itself does, then flush to IDB.
// Every canary travels next to a KEEP marker in the same field. A scrubber
// that deletes its input passes every absence check ever written, so each
// artifact is also asked whether the diagnostic content it exists to carry
// is still there.
async function seedCanaries(C) {
  WF_DEBUG.captureFailure({
    code: 'HTTP_ERROR', provider: 'claude', status: 401,
    message: 'KEEPMSG Incorrect API key provided: ' + C.failMessage,
    raw: JSON.stringify({ error: { message: 'KEEPRAW rejected ' + C.failRaw, type: 'invalid_request_error' } })
  });
  WF_DEBUG.deepDiveOn = true;
  WF_DEBUG.captureRound({
    round: 1, prompt: 'KEEPPROMPT the working document', response: 'KEEPRESPONSE the critique',
    note: C.ringBuffer
  });
  try { consoleLog('KEEPCONSOLE auth failed for key ' + C.console, 'error'); } catch (e) {}
  // A document that CONTAINS a credential-shaped string on purpose. It must
  // survive byte for byte: a checkpoint has to restore what the user wrote,
  // and a redaction pass over user content would corrupt the restore.
  try { docText = 'KEEPDOC the working document, mentioning ' + C.docBody + ' in its body'; } catch (e) {}
  try { await saveSession({ force: true }); } catch (e) {}
  await new Promise(r => setTimeout(r, 600));
  const idb = await idbGet();
  return JSON.stringify({
    liveFailureHasCanary: JSON.stringify(WF_DEBUG.lastFailure || null).indexOf(C.failRaw) !== -1,
    idbFailureHasCanary:  !!(idb && JSON.stringify(idb.lastFailure || null).indexOf(C.failRaw) !== -1),
    idbRingHasCanary:     !!(idb && JSON.stringify(idb.ringBuffer || null).indexOf(C.ringBuffer) !== -1),
    idbConsoleHasCanary:  !!(idb && typeof idb.consoleHTML === 'string' && idb.consoleHTML.indexOf(C.console) !== -1)
  });
}

// Run the REAL bundleForScout with the blob intercepted, so we read the exact
// bytes that would have been written to disk.
async function captureScoutBundle(C) {
  let captured = null;
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  URL.createObjectURL = function (b) { captured = b; return 'blob:stub'; };
  URL.revokeObjectURL = function () {};
  try { await WF_DEBUG.bundleForScout(); }
  catch (e) { return JSON.stringify({ err: String((e && e.message) || e) }); }
  finally { URL.createObjectURL = origCreate; URL.revokeObjectURL = origRevoke; }
  if (!captured) return JSON.stringify({ err: 'bundleForScout produced no blob' });
  const text = await captured.text();
  const obj = JSON.parse(text);
  const idbs = (obj.checkpoint && obj.checkpoint.IDB_SESSION) || null;
  const where = (needle) => {
    const hits = [];
    if (JSON.stringify(obj.lastFailure || null).indexOf(needle) !== -1) hits.push('lastFailure');
    if (typeof obj.liveConsole === 'string' && obj.liveConsole.indexOf(needle) !== -1) hits.push('liveConsole');
    if (JSON.stringify(obj.ringBuffer || null).indexOf(needle) !== -1) hits.push('ringBuffer');
    if (idbs && JSON.stringify(idbs.lastFailure || null).indexOf(needle) !== -1) hits.push('checkpoint.IDB_SESSION.lastFailure');
    if (idbs && JSON.stringify(idbs.ringBuffer || null).indexOf(needle) !== -1) hits.push('checkpoint.IDB_SESSION.ringBuffer');
    if (idbs && typeof idbs.consoleHTML === 'string' && idbs.consoleHTML.indexOf(needle) !== -1) hits.push('checkpoint.IDB_SESSION.consoleHTML');
    if (JSON.stringify(obj.checkpoint && obj.checkpoint.LS_HIVE || '').indexOf(needle) !== -1) hits.push('checkpoint.LS_HIVE');
    return hits;
  };
  const KEEP = ['KEEPMSG', 'KEEPRAW', 'KEEPPROMPT', 'KEEPRESPONSE', 'KEEPCONSOLE'];
  return JSON.stringify({
    built: true, bytes: text.length,
    embeddedCheckpointPresent: !!idbs,
    anywhere: Object.fromEntries(Object.keys(C).map(k => [k, text.indexOf(C[k]) !== -1])),
    located:  Object.fromEntries(Object.keys(C).map(k => [k, where(C[k])])),
    kept:     KEEP.filter(m => text.indexOf(m) !== -1),
    keptAll:  KEEP.every(m => text.indexOf(m) !== -1)
  });
}

// Build a checkpoint with the SHIPPING defaults: session on, API keys off.
// That is the combination a user shares, and the one that must be clean.
async function captureCheckpoint(C) {
  const scope = {
    projectInfo: true, refMaterial: true, startingDoc: true, session: true,
    aiList: true, models: true, keys: false, builder: true, license: false
  };
  const env = await _buildCheckpointEnvelope(scope);
  if (!env) return JSON.stringify({ built: false, why: 'envelope was null' });
  const j = env.json;
  const KEEP = ['KEEPMSG', 'KEEPRAW', 'KEEPPROMPT', 'KEEPRESPONSE', 'KEEPCONSOLE'];
  return JSON.stringify({
    built: true, bytes: j.length, tags: env.tags,
    scopeKeysWasOff: JSON.parse(j)._waxframe_backup_scope.keys === false,
    anywhere: Object.fromEntries(Object.keys(C).map(k => [k, j.indexOf(C[k]) !== -1])),
    kept:    KEEP.filter(m => j.indexOf(m) !== -1),
    keptAll: KEEP.every(m => j.indexOf(m) !== -1)

  });
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
  const evaluate = async (expression, timeout = 60000) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };
  const callInPage = (fn, arg) => evaluate(`(${fn.toString()})(${JSON.stringify(arg)})`);

  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('waxframe_v2_hive', ${JSON.stringify(JSON.stringify(HIVE_SEED))}); } catch (e) {}`
  });
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  // Wait for the app's OWN async boot to finish rather than sleeping and
  // hoping. app.js's DOMContentLoaded handler awaits an IndexedDB read before
  // it settles on a screen, and every function it defines exists long before
  // that resolves — so "the function is there" is not "the app is ready".
  // __wfBootComplete is the last statement of that handler. A fixed sleep
  // here was a race waiting to be reported as a product bug; see the
  // flow-check entry in the backlog for what that cost.
  {
    const deadline = Date.now() + 30000;
    let booted = false;
    while (Date.now() < deadline) {
      try { if (await evaluate('window.__wfBootComplete === true')) { booted = true; break; } } catch (e) {}
      await sleep(150);
    }
    if (!booted) throw new Error('the app never signalled boot complete');
  }

  console.log('  > Seeding the debug side-channels (liveness)');
  const boot = await evaluate('JSON.stringify({ hasDebug: typeof WF_DEBUG, hasEnvelope: typeof _buildCheckpointEnvelope, hasIdb: typeof idbGet })');
  check('the app booted with its export machinery present', !/undefined/.test(boot), boot);
  const s = JSON.parse(await callInPage(seedCanaries, CANARIES));
  check('WF_DEBUG.lastFailure carries the canary', s.liveFailureHasCanary === true, s);
  check('the IDB session carries lastFailure', s.idbFailureHasCanary === true, s);
  check('the IDB session carries ringBuffer', s.idbRingHasCanary === true, s);
  check('the IDB session carries consoleHTML', s.idbConsoleHasCanary === true, s);

  console.log('\n  > The Scout bundle, exactly as it would be written to disk');
  const b = JSON.parse(await callInPage(captureScoutBundle, CANARIES));
  check('a bundle was actually produced (liveness)', b.built === true, b);
  if (b.built) {
    console.log(`      ${b.bytes} bytes; embedded checkpoint present: ${b.embeddedCheckpointPresent}`);
    for (const field of MUST_BE_ABSENT) {
      check(`no ${field} canary anywhere in the bundle`, b.anywhere[field] === false,
        b.anywhere[field] ? `found in: ${b.located[field].join(', ') || '(unlocated — raw text match)'}` : undefined);
    }
    check('the bundle still carries its diagnostic content', b.keptAll === true,
      `a scrubber that deletes everything passes every check above — kept ${JSON.stringify(b.kept)}`);
  }

  console.log('\n  > A checkpoint saved with the shipping defaults (session on, keys off)');
  const c = JSON.parse(await callInPage(captureCheckpoint, CANARIES));
  check('a checkpoint was actually built (liveness)', c.built === true, c);
  if (c.built) {
    check('the API-keys section really was off', c.scopeKeysWasOff === true, c);
    console.log(`      ${c.bytes} bytes; tags shown to the user: ${JSON.stringify(c.tags)}`);
    check('no API key in the file when the keys box is unticked', c.anywhere.hiveKey === false, c.anywhere);
    check('no failure-record message canary in the checkpoint', c.anywhere.failMessage === false, c.anywhere);
    check('no failure-record raw-body canary in the checkpoint', c.anywhere.failRaw === false, c.anywhere);
    check('no console-transcript canary in the checkpoint', c.anywhere.console === false, c.anywhere);
    check('the checkpoint still carries its session content', c.keptAll === true,
      `a scrubber that deletes everything passes every check above — kept ${JSON.stringify(c.kept)}`);
    check('credential-shaped text in the USER\'S DOCUMENT is left alone',
      c.anywhere.docBody === true,
      'docText was scrubbed — a checkpoint has to restore the document exactly as written, ' +
      'and redaction must not reach into user content');
  }

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
  ? `\nFAIL check-export-redaction: ${bad} check(s) failed — an export surface carries a credential it says it strips.`
  : `\nPASS check-export-redaction: every export surface came out clean.`);
process.exit(bad ? 1 : 0);
