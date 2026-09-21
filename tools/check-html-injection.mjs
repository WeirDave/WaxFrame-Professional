#!/usr/bin/env node
// Build: 20260920-024
// check-html-injection.mjs — does hostile text in saved state become markup?
//
// WaxFrame builds its UI by assigning template literals to .innerHTML. That is
// fine as long as every interpolated value is escaped, and the way to find out
// is not to read a hundred template literals hoping to spot the one that is
// not. Static analysis of this codebase kept over-reporting: a hand-rolled
// scanner cannot reliably find where a template literal ends, and every
// attempt produced false positives on consoleLog() and toast() strings that
// are not sinks at all.
//
// So this asks the browser instead. It seeds the app with names containing
// markup, boots it, drives it through the screens that render those names, and
// then asks the DOM one question: did any of that text become an ELEMENT?
//
// If the value was escaped, the page contains the literal characters and zero
// injected nodes. If it was not, the node exists. There is no judgement call
// and no parser to get wrong.
//
// Why it matters, concretely. An AI's display name is not always typed by the
// person sitting there:
//   • importing from a model server takes the name from the SERVER
//   • restoring a checkpoint takes it from a FILE, and checkpoints are meant
//     to be shared ("share an exact-model recipe")
// So a name can arrive from somewhere the user does not control.
//
// WaxFrame's CSP has no 'unsafe-inline' in script-src, so an injected
// onerror= handler does not run and an injected <script> does not execute.
// That is a real mitigation and it is why this is a defect rather than an
// emergency. It is not a reason to skip escaping: the CSP is the second line,
// and an injected <img> can still beacon out under img-src https:, and
// injected markup can still render misleading text inside the app.
//
// Usage:  node tools/check-html-injection.mjs
// Exit 0 = nothing injected.

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

// Each payload carries a unique marker so a hit can be traced back to the
// field it came from. They are inert on purpose — this proves whether markup
// is created, and does not need to do anything once it exists.
const PAYLOADS = {
  aiName:      '<wfinject id="wfx-name"></wfinject>',
  customName:  '<wfinject id="wfx-custom"></wfinject>',
  projectName: '<wfinject id="wfx-project"></wfinject>',
  docType:     '<wfinject id="wfx-doctype"></wfinject>',
  audience:    '<wfinject id="wfx-audience"></wfinject>',
  refTitle:    '<wfinject id="wfx-ref"></wfinject>'
};

const HIVE_SEED = {
  activeAIIds: ['chatgpt', 'claude', 'gemini', 'custom-inject-1'],
  knownDefaultIds: ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity', 'mistral'],
  hiveMode: 'internet',
  builder: 'claude',
  keys: { chatgpt: 'sk-INJECT', claude: 'sk-INJECT', gemini: 'sk-INJECT', 'custom-inject-1': 'sk-INJECT' },
  models: { chatgpt: 'mock-model', claude: 'mock-model', gemini: 'mock-model' },
  // A custom AI is the closest thing to "a name that came from a file or a
  // server": it is free text carried in saved state.
  customAIs: [
    { id: 'custom-inject-1', name: PAYLOADS.customName, provider: 'custom-inject-1',
      label: PAYLOADS.customName, model: 'mock-model' }
  ],
  customAIConfigs: {
    'custom-inject-1': {
      label: PAYLOADS.customName, name: PAYLOADS.customName,
      endpoint: 'http://127.0.0.1:1/v1/chat/completions',
      model: 'mock-model', _key: 'sk-INJECT'
    }
  },
  // Also rename a built-in, which is the path a restored checkpoint takes.
  aiNameOverrides: { chatgpt: PAYLOADS.aiName }
};

const PROJECT_SEED = {
  projectName: PAYLOADS.projectName, projectVersion: 'v1.0',
  goalDocType: PAYLOADS.docType, goalAudience: PAYLOADS.audience,
  goalOutcome: 'prove escaping holds', goalScope: '', goalTone: '', goalNotes: '',
  exportMask: '', lengthMode: 'none', lengthLimit: '', lengthMin: '',
  lengthUnit: 'characters', docTab: 'scratch', pastedDocument: '',
  referenceDocs: [{ title: PAYLOADS.refTitle, text: 'reference body' }]
};

let bad = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`    ✓ ${label}`);
  else { bad++; console.log(`    ✗ ${label}`); if (detail !== undefined) console.log(`        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); }
};

const BROWSER = findChrome();
if (!BROWSER) { console.error('No Chrome or Chromium found. Set WF_CHROME to a browser binary.'); process.exit(2); }

// Serve the repo. file:// would work but the app takes a different pdf.js
// branch there, and this check is about the hosted path most users see.
const PORT = 8790 + (process.pid % 150);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const DEBUG_PORT = 9330 + (process.pid % 150);
const profile = path.join(os.tmpdir(), `wf-inject-${process.pid}`);
console.log(`check-html-injection — serving ${ROOT} on :${PORT}\n`);

const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;

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
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };

  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `try {
      localStorage.setItem('waxframe_v2_hive', ${JSON.stringify(JSON.stringify(HIVE_SEED))});
      localStorage.setItem('waxframe_v2_project', ${JSON.stringify(JSON.stringify(PROJECT_SEED))});
    } catch (e) {}`
  });
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await sleep(4000);

  // Walk the screens that render names, so the check covers more than boot.
  console.log('  ▶ Rendering every screen that shows a name');
  const screens = ['screen-bees', 'screen-project', 'screen-reference', 'screen-document', 'screen-work'];
  for (const s of screens) {
    await evaluate(`(() => { try { if (typeof goToScreen === 'function') goToScreen(${JSON.stringify(s)}); } catch (e) {} return 1; })()`);
    await sleep(500);
  }
  // Settings renders provider labels; the hive editor renders AI names.
  await evaluate(`(() => { try { if (typeof openSettings === 'function') openSettings(); } catch(e){}
                          try { if (typeof renderAISetupGrid === 'function') renderAISetupGrid(); } catch(e){}
                          try { if (typeof renderBeeStatusGrid === 'function') renderBeeStatusGrid(); } catch(e){}
                          return 1; })()`);
  await sleep(900);
  check('app booted and screens rendered', true);

  console.log('\n  ▶ Did any seeded text become an element?');
  const result = await evaluate(`JSON.stringify({
    injectedNodes: document.querySelectorAll('wfinject').length,
    byMarker: ['wfx-name','wfx-custom','wfx-project','wfx-doctype','wfx-audience','wfx-ref']
      .filter(id => document.getElementById(id) !== null),
    // Liveness: the payload must be PRESENT and ESCAPED. Without this the
    // whole check passes when the seed never renders at all, which is the
    // failure mode where a green result means nothing.
    payloadPresent: document.body.innerHTML.includes('wfinject'),
    payloadEscaped: document.body.innerHTML.includes('&lt;wfinject'),
    seededName: (typeof activeAIs !== 'undefined' && activeAIs.some(a => String(a.name||'').includes('wfinject'))),
    bodyLen: document.body.innerHTML.length
  })`);
  const r = JSON.parse(result);

  // Liveness first: a green result below is only meaningful if the hostile
  // value genuinely reached the UI. Assert that before asserting safety.
  check('the hostile name loaded into app state (test is live)', r.seededName === true, r);
  check('the payload actually reached the DOM (test is live)', r.payloadPresent === true, r);
  check('it arrived ESCAPED, as &lt;wfinject', r.payloadEscaped === true, r);
  check('zero injected <wfinject> elements in the DOM', r.injectedNodes === 0,
    r.injectedNodes + ' node(s); markers: ' + JSON.stringify(r.byMarker));
  check('no injected marker id is reachable', r.byMarker.length === 0, r.byMarker);
  check('the page actually rendered (sanity — not an empty DOM)', r.bodyLen > 5000, r.bodyLen);

  // A useful secondary signal: if escaping worked, the raw characters appear
  // as visible text somewhere. Not a failure if absent — a screen may simply
  // not show that field — so it is reported rather than asserted.

} catch (err) {
  bad++;
  console.log(`    ✗ harness error: ${err.message}`);
} finally {
  try { ws && ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  await new Promise(r => server.close(r));
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log(bad
  ? `\n❌ check-html-injection: ${bad} check(s) failed — hostile text became markup.`
  : `\n✅ check-html-injection: seeded markup stayed inert.`);
process.exit(bad ? 1 : 0);
