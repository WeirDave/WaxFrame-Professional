#!/usr/bin/env node
// Build: 20260922-003
// check-import-bounds.mjs — is there a ceiling anywhere on an imported file?
//
// Two questions, both answered against the real app rather than by reading it.
//
//   1. COST. A .docx and an .xlsx are ZIP containers, and deflate is happy to
//      turn a few hundred KB into a few hundred MB. HARD_INPUT_CAP (8 MB) is
//      the ICON upload path only; extractFromFile has no cap of any kind. This
//      builds a bomb with the project's own vendored JSZip, feeds it to the
//      real import routine, and measures what it costs.
//
//   2. CONSEQUENCE, which is the half that bites without any attacker at all.
//      saveProject() wraps its localStorage write in a try/catch that only
//      console.warn()s. Go over quota and the write throws, the catch eats it,
//      and localStorage.setItem never lands — so the ENTIRE project blob is
//      lost, not just the oversized document. Project name, version, goal
//      fields and the starting document all silently stop persisting, with no
//      toast and nothing on screen to suggest anything went wrong. The user
//      finds out on reload.
//
// The bomb is GENERATED, never committed. A public repo has no business
// carrying a decompression bomb, and this repo has already had one history
// rewrite over committed archives.
//
// Method note: liveness before safety. The cost block asserts the file really
// was parsed before it judges the number, and the quota block asserts the
// write really was attempted. A bound that is never exercised passes.
//
// Usage:  node tools/check-import-bounds.mjs
// Exit 0 = imports are bounded and failures are visible.
//
// NOT a release-check stage today: it currently FAILS against the shipped
// code, by design. Wire it in once a bound and a visible failure exist.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The ceiling the test enforces. The exact number is a product call — what
// matters here is that SOME bound exists and is enforced before the text
// reaches referenceDocs. 25M characters is already far past anything a model
// context can take; adjust with the real limit once it is chosen.
const MAX_REASONABLE_CHARS = 25_000_000;
// Decompressed size of the generated bomb body.
const BOMB_MB = 200;

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

let bad = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`    ok  ${label}`);
  else {
    bad++; console.log(`    XX  ${label}`);
    if (detail !== undefined) console.log(`        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
};

// ── Build the bomb with the vendored JSZip, so the artifact is exactly the
// shape mammoth would be handed in the browser.
function buildDocx({ bodyMB = 0, bodyChars = 0, mediaMB = 0 }) {
  const JSZip = require(path.join(ROOT, 'lib', 'jszip.min.js'));
  const MB = 1024 * 1024;
  const para = '<w:p><w:r><w:t>' + 'A'.repeat(4000) + '</w:t></w:r></w:p>';
  const chunk = para.repeat(1000);
  let body = '';
  if (bodyMB) {
    const rounds = Math.ceil(Math.ceil((bodyMB * MB) / para.length) / 1000);
    for (let i = 0; i < rounds; i++) body += chunk;
  } else {
    body = '<w:p><w:r><w:t>' + 'Legitimate document text. '.repeat(Math.max(1, Math.ceil(bodyChars / 25))) + '</w:t></w:r></w:p>';
  }
  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + body + '</w:body></w:document>';
  const zip = new JSZip();
  zip.file('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>');
  zip.folder('_rels').file('.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>');
  zip.folder('word').file('document.xml', documentXml);
  // Embedded media is legitimately large and is never parsed as text, so the
  // bound must skip it. A .docx with 40 MB of images and a small body has to
  // import, or the cap rejects real documents in order to stop a fake one.
  if (mediaMB) {
    const img = Buffer.alloc(mediaMB * MB);
    for (let i = 0; i < img.length; i += 997) img[i] = i & 0xff;  // defeat deflate
    zip.folder('word').folder('media').file('image1.png', img);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
    .then(buf => ({ buf, decompressed: documentXml.length }));
}

const BROWSER = findChrome();
if (!BROWSER) { console.error('No Chrome or Chromium found. Set WF_CHROME to a browser binary.'); process.exit(2); }

console.log('check-import-bounds — generating fixtures…');
const { buf: BOMB, decompressed } = await buildDocx({ bodyMB: BOMB_MB });
const ratio = Math.round(decompressed / BOMB.length);
console.log(`  bomb:   ${(BOMB.length / 1024).toFixed(1)} KB on disk -> ${(decompressed / 1048576).toFixed(1)} MB decompressed (${ratio}:1)`);
const { buf: NORMAL } = await buildDocx({ bodyChars: 20000 });
console.log(`  normal: ${(NORMAL.length / 1024).toFixed(1)} KB, ~20,000 chars of body text`);
const { buf: MEDIA } = await buildDocx({ bodyChars: 5000, mediaMB: 40 });
console.log(`  media:  ${(MEDIA.length / 1048576).toFixed(1)} MB, 40 MB of embedded image, small body\n`);

const PORT = 8790 + (process.pid % 150);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const FIXTURES = { '__bomb.docx': BOMB, '__normal.docx': NORMAL, '__media.docx': MEDIA };
  if (FIXTURES[rel]) {
    res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return res.end(FIXTURES[rel]);
  }
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const DEBUG_PORT = 9330 + (process.pid % 150);
const profile = path.join(os.tmpdir(), `wf-importbounds-${process.pid}`);
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1600,1000',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;

// ── In-page routines.

// Feed a fixture to the real import routine and measure what it cost.
async function importFixture(which) {
  const t0 = performance.now();
  const h0 = performance.memory.usedJSHeapSize;
  const r = await fetch('/' + which);
  const b = await r.blob();
  const f = new File([b], 'quarterly-report.docx',
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  let chars = 0, err = null;
  try {
    const docs = await extractFromFile(f, { xlsxMode: 'multi' });
    chars = (docs || []).reduce((a, d) => a + ((d.text || '').length), 0);
  } catch (e) { err = String((e && e.message) || e).slice(0, 200); }
  const h1 = performance.memory.usedJSHeapSize;
  return JSON.stringify({
    ms: Math.round(performance.now() - t0),
    heapBeforeMB: Math.round(h0 / 1048576),
    heapAfterMB: Math.round(h1 / 1048576),
    extractedChars: chars,
    refused: err !== null,
    err
  });
}

// Push an oversized reference doc through the real save path and watch what
// the user is told.
async function overflowTheProjectSave(bytes) {
  const toasts = [];
  const warns = [];
  const origToast = window.toast;
  const origWarn = console.warn;
  window.toast = function (m) { toasts.push(String(m).slice(0, 120)); try { return origToast.apply(this, arguments); } catch (e) {} };
  console.warn = function () { warns.push([...arguments].map(String).join(' ').slice(0, 160)); origWarn.apply(console, arguments); };
  // Something small and identifiable that MUST survive alongside the big doc.
  const nameEl = document.getElementById('projectName');
  if (nameEl) nameEl.value = 'Canary Project';
  referenceDocs.push({
    id: 'bounds-1', name: 'quarterly-report.docx', text: 'X'.repeat(bytes),
    source: 'upload', filename: 'quarterly-report.docx'
  });
  let threw = null;
  try { saveProject(); } catch (e) { threw = String((e && e.name) || e); }
  await new Promise(r => setTimeout(r, 400));
  let stored = null;
  try { stored = localStorage.getItem('waxframe_v2_project'); } catch (e) {}
  const parsed = (() => { try { return JSON.parse(stored || 'null'); } catch (e) { return null; } })();
  window.toast = origToast;
  console.warn = origWarn;
  return JSON.stringify({
    writeWasAttempted: warns.some(w => /saveProject/.test(w)) || stored !== null,
    quotaWasHit: warns.some(w => /Quota/i.test(w)),
    saveThrewToCaller: threw,
    projectBlobSurvived: stored !== null,
    projectNameSurvived: !!(parsed && parsed.projectName === 'Canary Project'),
    userWasTold: toasts.length > 0,
    toasts, warns
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
  const evaluate = async (expression, timeout = 240000) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };
  const callInPage = (fn, arg) => evaluate(`(${fn.toString()})(${JSON.stringify(arg)})`);

  await cdp('Runtime.enable');
  await cdp('Page.enable');
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

  const boot = await evaluate('JSON.stringify({ extract: typeof extractFromFile, save: typeof saveProject, refs: typeof referenceDocs })');
  check('the app booted with its import machinery present (liveness)', !/undefined/.test(boot), boot);

  console.log('\n  > 1. What does the bomb cost?');
  const r = JSON.parse(await callInPage(importFixture, '__bomb.docx'));
  const grewMB = r.heapAfterMB - r.heapBeforeMB;
  check('the file really was processed (liveness)', r.extractedChars > 0 || r.refused === true, r);
  console.log(`      ${r.ms} ms; heap ${r.heapBeforeMB} -> ${r.heapAfterMB} MB (+${grewMB} MB); ` +
              `${r.extractedChars.toLocaleString()} chars extracted`);
  check(`import is bounded (refused, or under ${MAX_REASONABLE_CHARS.toLocaleString()} chars)`,
    r.refused === true || r.extractedChars <= MAX_REASONABLE_CHARS,
    `accepted ${r.extractedChars.toLocaleString()} chars (${(r.extractedChars / 1048576).toFixed(1)} MB) ` +
    `from a ${(BOMB.length / 1024).toFixed(1)} KB file — no cap at any layer`);

  console.log('\n  > 1b. Do legitimate documents still import?');
  // A bound that rejects everything passes every check above. These two
  // fixtures are what the cap must NOT reject: an ordinary document, and one
  // carrying 40 MB of embedded image with a small body — media is never parsed
  // as text, so capping it would reject real files in order to stop a fake one.
  const okNormal = JSON.parse(await callInPage(importFixture, '__normal.docx'));
  check('an ordinary .docx still imports', okNormal.refused === false && okNormal.extractedChars > 1000,
    okNormal.err || `${okNormal.extractedChars} chars extracted`);
  const okMedia = JSON.parse(await callInPage(importFixture, '__media.docx'));
  check('a .docx with 40 MB of embedded media still imports',
    okMedia.refused === false && okMedia.extractedChars > 100,
    okMedia.err || `${okMedia.extractedChars} chars extracted`);

  console.log('\n  > 2. What happens when the save overflows the quota?');
  const q = JSON.parse(await callInPage(overflowTheProjectSave, 12 * 1024 * 1024));
  check('the save really was attempted (liveness)', q.writeWasAttempted === true, q);
  check('the quota was really exceeded (liveness)', q.quotaWasHit === true, q);
  check('the user is told the save failed', q.userWasTold === true,
    'saveProject swallowed QuotaExceededError with only a console.warn — no toast, nothing on screen');
  check('the rest of the project still persisted', q.projectNameSurvived === true,
    q.projectBlobSurvived
      ? 'the blob exists but lost the project name'
      : 'localStorage.setItem never landed — the ENTIRE project blob is gone, not just the oversized doc');

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
  ? `\nFAIL check-import-bounds: ${bad} check(s) failed — an import is unbounded or fails invisibly.`
  : `\nPASS check-import-bounds: imports are bounded and failures are visible.`);
process.exit(bad ? 1 : 0);
