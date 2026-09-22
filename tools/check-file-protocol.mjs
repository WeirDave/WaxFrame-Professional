#!/usr/bin/env node
// Build: 20260922-002
// check-file-protocol.mjs — verify the portable install still works.
//
// WaxFrame ships two ways: served over http(s), and as a folder someone
// unzips and opens by double-clicking index.html. The second one runs on
// file://, where browsers refuse ESM imports across origins, so the pdf.js
// loader branches at runtime: ESM build on http(s), classic build on file://.
//
// That branch is invisible to every other check in this repo. The release gate
// is pure Node and never opens a browser. tools/flow-check.mjs drives a real
// browser but over http, which is the half that was never in doubt. Asserting
// the file:// branch from an http page proves nothing, because the behaviour
// being relied on — the module loader refusing a cross-origin file:// import —
// only exists on file://.
//
// So this opens the actual index.html from disk in real headless Chrome and
// checks what the page ended up with.
//
// It generates its own PDF. There is no fixture to commit, which matters:
// a PDF taken from anywhere real is exactly the class of file that must never
// enter this repository, and a generated one also makes the expected text
// something the script can assert against rather than eyeball.
//
// Usage:  node tools/check-file-protocol.mjs
// Exit 0 = both the loader branch and a real extraction are correct.
//
// Not wired into release-check.mjs, which is pure Node stdlib by design and
// would start requiring a browser. Run it when touching the pdf.js loader,
// the vendored pdf.js builds, or anything about how the portable copy boots.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: the latter keeps percent-encoding, so a
// path containing spaces comes back with %20 in it and every file operation
// fails on a directory that does not exist.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Chrome discovery (same order as flow-check.mjs) ───────────────────
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

// ── A small, genuinely valid PDF ──────────────────────────────────────
// Two pages and an outline, so extraction is exercised on more than "the
// library loaded": numPages, getPage, getTextContent and getOutline all have
// something to find.
const MARKER = 'WaxFrame portable PDF check';
function buildPdf() {
  const page1 = `BT /F1 16 Tf 72 720 Td (${MARKER}) Tj ET\nBT /F1 11 Tf 72 690 Td (Page one body text.) Tj ET`;
  const page2 = `BT /F1 11 Tf 72 720 Td (Page two body text.) Tj ET`;
  const stream = (s) => `<< /Length ${Buffer.byteLength(s, 'latin1')} >>\nstream\n${s}\nendstream`;
  const o = [];
  o[0] = `<< /Type /Catalog /Pages 2 0 R /Outlines 8 0 R /PageMode /UseOutlines >>`;
  o[1] = `<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>`;
  o[2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>`;
  o[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>`;
  o[4] = stream(page1);
  o[5] = stream(page2);
  o[6] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  o[7] = `<< /Type /Outlines /First 9 0 R /Last 10 0 R /Count 2 >>`;
  o[8] = `<< /Title (Section one) /Parent 8 0 R /Next 10 0 R /Dest [3 0 R /Fit] >>`;
  o[9] = `<< /Title (Section two) /Parent 8 0 R /Prev 9 0 R /Dest [4 0 R /Fit] >>`;
  let out = '%PDF-1.4\n';
  const offs = [];
  o.forEach((body, i) => { offs[i] = Buffer.byteLength(out, 'latin1'); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${o.length + 1}\n0000000000 65535 f \n`;
  for (const off of offs) out += String(off).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${o.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

// ── Results ───────────────────────────────────────────────────────────
let bad = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`    ✓ ${label}`);
  else { bad++; console.log(`    ✗ ${label}`); if (detail !== undefined) console.log(`        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); }
};

const BROWSER = findChrome();
if (!BROWSER) { console.error('No Chrome or Chromium found. Set WF_CHROME to a browser binary.'); process.exit(2); }

// The PDF is written beside index.html so the page can fetch it as a sibling,
// which is how a portable user's own files sit. Removed in the finally block.
const pdfName = `.wf-file-protocol-check-${process.pid}.pdf`;
const pdfPath = path.join(ROOT, pdfName);
fs.writeFileSync(pdfPath, buildPdf());

const fileUrl = (p) => 'file:///' + path.resolve(p).replace(/\\/g, '/');
const INDEX = fileUrl(path.join(ROOT, 'index.html'));
const PORT = 9227 + (process.pid % 200);
const profile = path.join(os.tmpdir(), `wf-fileproto-${process.pid}`);

console.log(`check-file-protocol — ${path.basename(BROWSER)}  port ${PORT}`);
console.log(`  page: ${INDEX}\n`);

const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  // Lets the page fetch its sibling PDF, the way a portable user's own file
  // would be read. It does NOT relax the module loader, so the ESM-refusal
  // this whole branch exists for is still genuinely in play.
  '--allow-file-access-from-files',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, INDEX
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;

try {
  // Attach to a PAGE target. The browser target accepts a connection and then
  // silently ignores Runtime.evaluate, which looks like a hang.
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const pg = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pg) wsUrl = pg.webSocketDebuggerUrl;
    } catch {}
    if (!wsUrl) await sleep(250);
  }
  if (!wsUrl) throw new Error('no page target appeared — Chrome may have failed to start');

  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket failed')); });

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
  await sleep(3500);   // the loader injects its script and the build parses

  console.log('  ▶ Loader branch');
  const state = JSON.parse(await evaluate(`JSON.stringify({
    protocol: location.protocol,
    version: window.pdfjsLib && window.pdfjsLib.version,
    hasLib: !!window.pdfjsLib,
    loadErr: window._pdfjsLoadError ? String(window._pdfjsLoadError.message) : null,
    scripts: [...document.querySelectorAll('script[src*="pdf"]')].map(s => s.getAttribute('src'))
  })`));

  check('the page really is on file://', state.protocol === 'file:', state.protocol);
  check('pdf.js is available to the app', state.hasLib === true, state);
  check('the classic build was chosen, not the ESM one',
    !!state.version && state.version.startsWith('3.'), state.version);
  check('the bootstrap injected the classic script',
    (state.scripts || []).some(s => /pdf\.min\.js(\?|$)/.test(s)), state.scripts);
  check('no loader error was surfaced to the user', !state.loadErr, state.loadErr);

  console.log('\n  ▶ Real extraction through the fallback');
  const res = JSON.parse(await evaluate(`(async () => {
    try {
      const ab = await (await fetch(${JSON.stringify(fileUrl(pdfPath))})).arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: ab, isEvalSupported: false }).promise;
      const p1 = await pdf.getPage(1);
      const tc = await p1.getTextContent();
      const ol = (await pdf.getOutline()) || [];
      return JSON.stringify({ ok: true, pages: pdf.numPages, outline: ol.length,
        text: tc.items.map(i => i.str).join('').trim() });
    } catch (err) { return JSON.stringify({ ok: false, error: String(err && err.message || err) }); }
  })()`));

  check('a PDF parsed on file:// without a worker error', res.ok === true, res.error || res);
  check('both pages were seen', res.pages === 2, res.pages);
  check('the outline was read', res.outline === 2, res.outline);
  check('the expected text came back', !!res.text && res.text.includes(MARKER), res.text);

} catch (err) {
  bad++;
  console.log(`    ✗ harness error: ${err.message}`);
} finally {
  try { ws && ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  await sleep(400);
  try { fs.rmSync(pdfPath, { force: true }); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log(bad
  ? `\n❌ check-file-protocol: ${bad} check(s) failed.`
  : `\n✅ check-file-protocol: the portable file:// path works.`);
process.exit(bad ? 1 : 0);
