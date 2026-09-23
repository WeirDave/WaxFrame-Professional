#!/usr/bin/env node
// Build: 20260922-006
// check-ocr-handoff.mjs — what happens AFTER a page is found to have no text.
//
// tools/check-pdf-shapes.mjs proves an image-only PDF extracts zero characters
// and is correctly flagged sparse. That is where it stops, because the next
// step calls a vision provider and the harness has no key. So the entire OCR
// path — the hand-off, the request shape, the response parse, the fallback
// between providers, what the user is told when every provider fails — has
// never been exercised by anything.
//
// This exercises it against a MOCK vision provider served from the same
// origin, the way tools/flow-check.mjs mocks a chat provider. No API key, no
// spend, no network, and deterministic: the mock decides what comes back, so
// the empty-response and total-failure branches can be driven on demand
// rather than waited for.
//
// WHAT THIS DOES AND DOES NOT COVER. It covers WaxFrame's plumbing, which is
// the part that can regress. It does NOT tell you whether a real provider
// transcribes a real scanned page usefully — that needs a real key against a
// real document, it costs money, and the answer is a property of the provider
// rather than of this code. That half stays a manual check; see the PDF item
// in the backlog for what to report.
//
// Usage:  node tools/check-ocr-handoff.mjs
// Exit 0 = the hand-off works and fails visibly.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

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

// ── An image-only PDF: pages that draw a picture and contain no text
// operators at all. Same shape check-pdf-shapes.mjs uses; duplicated rather
// than shared because every browser tool here is self-contained.
function buildPDF(objects) {
  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
function imageOnlyPDF(pageCount = 2) {
  const W = 8, H = 8;
  let px = '';
  for (let i = 0; i < W * H; i++) px += (i % 3 === 0 ? 'FF0000' : '2233AA');
  const s = (d, data) => `<< ${d} /Length ${Buffer.byteLength(data, 'latin1')} >>\nstream\n${data}\nendstream`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '',
    s(`/Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB ` +
      `/BitsPerComponent 8 /Filter /ASCIIHexDecode`, px + '>')];
  const nums = [];
  for (let p = 1; p <= pageCount; p++) {
    objs.push(s('', 'q 500 0 0 700 56 56 cm /Im1 Do Q'));
    const c = objs.length;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${c} 0 R ` +
              `/Resources << /XObject << /Im1 3 0 R >> >> >>`);
    nums.push(objs.length);
  }
  objs[1] = `<< /Type /Pages /Kids [${nums.map(n => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  return buildPDF(objs);
}
const SCAN_PDF = imageOnlyPDF(2);

// A document that is mostly readable text with ONE page that is just a
// picture — a multi-page form with a scanned signature page, say. This takes
// a different branch from a wholly image-only file: the sparse-page pass,
// which OCRs only the offending pages and appends the result. Two branches,
// two fixtures, or half the path stays untested.
function mixedPDF() {
  const W = 8, H = 8;
  let px = '';
  for (let i = 0; i < W * H; i++) px += (i % 3 === 0 ? 'FF0000' : '2233AA');
  const s2 = (d, data) => `<< ${d} /Length ${Buffer.byteLength(data, 'latin1')} >>
stream
${data}
endstream`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    s2(`/Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB ` +
       `/BitsPerComponent 8 /Filter /ASCIIHexDecode`, px + '>')];
  const nums = [];
  for (let p = 1; p <= 3; p++) {
    if (p === 3) {
      objs.push(s2('', 'q 500 0 0 700 56 56 cm /Im1 Do Q'));
      const c = objs.length;
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${c} 0 R ` +
                `/Resources << /XObject << /Im1 4 0 R >> >> >>`);
    } else {
      let ops = 'BT /F1 11 Tf 72 740 Td 14 TL';
      for (let ln = 0; ln < 45; ln++) {
        ops += ` (Page ${p} of the mixed document, line ${ln + 1}. Ordinary readable prose.) Tj T*`;
      }
      ops += ' ET';
      objs.push(s2('', ops));
      const c = objs.length;
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${c} 0 R ` +
                `/Resources << /Font << /F1 3 0 R >> >> >>`);
    }
    nums.push(objs.length);
  }
  objs[1] = `<< /Type /Pages /Kids [${nums.map(n => `${n} 0 R`).join(' ')}] /Count 3 >>`;
  return buildPDF(objs);
}
const MIXED_PDF = mixedPDF();

// ── A photograph of a page, as far as the app is concerned ────────────
// A real PNG, built by hand so the tool stays dependency-free. Deliberately
// large on the long edge so the downscale path is exercised: a phone photo
// is 4000+ px and the import caps it before spending tokens on pixels no
// model reads.
function buildPNG(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0;                                   // filter: none
    for (let x = 0; x < w; x++) {
      const ink = ((x >> 4) + (y >> 5)) % 7 === 0;   // coarse text-like marks
      raw[o++] = ink ? 0x20 : 0xf4;
      raw[o++] = ink ? 0x20 : 0xf4;
      raw[o++] = ink ? 0x20 : 0xf0;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(td) >>> 0, 0);
    return Buffer.concat([len, td, crcBuf]);
  };
  let table = null;
  function crc32(buf) {
    if (!table) {
      table = [];
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
    }
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
const PHOTO_PNG = buildPNG(3200, 2000);

// The text the mock "reads" off the page. Distinctive so its arrival in the
// extracted document is unambiguous.
const OCR_TEXT = 'TRANSCRIBED BY MOCK VISION: the quick brown fox jumps over the lazy dog.';

let bad = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`      ok  ${label}`);
  else {
    bad++; console.log(`      XX  ${label}`);
    if (detail !== undefined) console.log(`          ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
};

const BROWSER = findChrome();
if (!BROWSER) { console.error('No Chrome or Chromium found. Set WF_CHROME to a browser binary.'); process.exit(2); }

// ── Mock vision provider ──────────────────────────────────────────────
// mode is set per scenario from the driver:
//   'ok'      — first provider transcribes
//   'empty'   — first returns HTTP 200 with no text, second transcribes
//               (the silent-empty branch that once left no trace at all)
//   'allfail' — every provider errors
let mode = 'ok';
const calls = [];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.pdf': 'application/pdf' };
const PORT = 8790 + (process.pid % 150);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = decodeURIComponent(url.pathname);

  if (p === '/__scan.pdf') {
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    return res.end(SCAN_PDF);
  }
  if (p === '/__mixed.pdf') {
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    return res.end(MIXED_PDF);
  }
  if (p === '/__photo.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    return res.end(PHOTO_PNG);
  }
  if (p === '/__mock/calls') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(calls));
  }
  if (p === '/__mock/reset') { calls.length = 0; res.writeHead(200); return res.end('ok'); }

  // /__mock/vision/<providerId>
  const m = p.match(/^\/__mock\/vision\/(.+)$/);
  if (m) {
    let body = '';
    req.on('data', d => { body += d; });
    await new Promise(r => req.on('end', r));
    let parsed = {};
    try { parsed = JSON.parse(body); } catch {}
    const content = (parsed.messages && parsed.messages[0] && parsed.messages[0].content) || [];
    const parts = Array.isArray(content) ? content : [];
    calls.push({
      provider: m[1],
      images: parts.filter(x => x && x.type === 'image_url').length,
      // The prompt must actually reach the provider — a request carrying
      // images and no instruction would "work" and transcribe nothing.
      hasPrompt: parts.some(x => x && x.type === 'text' && /transcribe/i.test(x.text || '')),
      model: parsed.model || null,
      auth: req.headers.authorization ? 'present' : 'absent'
    });

    if (mode === 'allfail') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'mock vision is down' } }));
    }
    // 'empty' makes only the FIRST provider return nothing, so the fallback
    // has somewhere to fall to.
    const isFirst = calls.filter(c => c.provider === m[1]).length >= 1 && calls.length === 1;
    const text = (mode === 'empty' && isFirst) ? '' : OCR_TEXT;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: 'stop' }] }));
  }

  const rel = p.replace(/^\/+/, '') || 'index.html';
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const MOCK = `http://127.0.0.1:${PORT}`;
// Two vision-capable providers so the fallback has a second to reach for.
const HIVE_SEED = {
  activeAIIds: ['chatgpt', 'claude'],
  knownDefaultIds: ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity', 'mistral'],
  hiveMode: 'internet', builder: 'claude',
  keys: { chatgpt: 'sk-OCRCHECK', claude: 'sk-OCRCHECK' },
  models: { chatgpt: 'mock-vision', claude: 'mock-vision' },
  customAIs: [], customAIConfigs: {}
};

const DEBUG_PORT = 9420 + (process.pid % 120);
const profile = path.join(os.tmpdir(), `wf-ocr-${process.pid}`);
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1600,1000',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;

// Point both seeded providers at the mock, OpenAI format. Done at runtime
// rather than through the persisted schema for the reason flow-check gives:
// pinning a harness to a product schema makes it fail for unrelated reasons.
function aimAtMock(base) {
  ['chatgpt', 'claude'].forEach(p => {
    if (!API_CONFIGS[p]) return;
    API_CONFIGS[p].endpoint   = base + '/__mock/vision/' + p;
    API_CONFIGS[p].endpointFn = null;
    API_CONFIGS[p].format     = 'openai';
    API_CONFIGS[p]._key       = 'sk-OCRCHECK';
    API_CONFIGS[p].model      = 'mock-vision';
  });
  return JSON.stringify({
    visionCapable: (typeof getVisionCapableAIs === 'function') ? getVisionCapableAIs().map(a => a.provider) : null
  });
}

// Stubs the two surfaces an import can open, runs the REAL processFile,
// and reports which one was called.
function whichSurfaceOpens() {
  let verify = null, card = null;
  const oV = window.openVerifyModalForImport;
  const oC = WF_DEBUG.showCard;
  const oCon = window.wfConfirm;
  window.openVerifyModalForImport = (ctx) => { verify = { sourceType: ctx && ctx.sourceType }; };
  WF_DEBUG.showCard = (entry) => { card = { code: entry && entry.code }; };
  // See the note in isThereAWayBack: an unanswered replace-document confirm
  // hangs the run rather than failing it.
  window.wfConfirm = () => Promise.resolve(true);
  return (async () => {
    try {
      const r = await fetch('/__photo.png');
      const b = await r.blob();
      await processFile(new File([b], 'page-photo.png', { type: 'image/png' }));
    } catch (e) {
      return JSON.stringify({ err: String((e && e.message) || e) });
    } finally {
      window.openVerifyModalForImport = oV;
      WF_DEBUG.showCard = oC;
      window.wfConfirm = oCon;
    }
    return JSON.stringify({ verify, card });
  })();
}

// Imports a photo, then asks whether the extracted text is reachable again
// once the verify panel has been dismissed.
function isThereAWayBack() {
  const oV = window.openVerifyModalForImport;
  const oCon = window.wfConfirm;
  window.openVerifyModalForImport = () => {};   // swallow the auto-open
  // processFile asks for confirmation when a document is ALREADY loaded, and
  // an unanswered modal hangs the run forever rather than failing. Auto-accept
  // so this block does not depend on whether an earlier one left a document
  // behind.
  window.wfConfirm = () => Promise.resolve(true);
  return (async () => {
    let err = null;
    try {
      const r = await fetch('/__photo.png');
      const b = await r.blob();
      await processFile(new File([b], 'page-photo.png', { type: 'image/png' }));
    } catch (e) { err = String((e && e.message) || e); }
    finally { window.openVerifyModalForImport = oV; window.wfConfirm = oCon; }
    const btn = document.getElementById('fileReviewBtn');
    const ctx = window._lastImportVerify || null;
    return JSON.stringify({
      err,
      reviewBtnExists: !!btn,
      reviewBtnVisible: !!btn && !btn.classList.contains('is-hidden'),
      // The button is only useful if the context it reads is still there.
      verifyContextKept: !!ctx,
      contextIsRenderable: !!(ctx && ctx.isRenderable),
      contextSourceType: ctx && ctx.sourceType
    });
  })();
}

// Imports a photo and reports the status line the user is left with.
function readStatusLine() {
  const oV = window.openVerifyModalForImport;
  const oCon = window.wfConfirm;
  window.openVerifyModalForImport = () => {};
  window.wfConfirm = () => Promise.resolve(true);
  return (async () => {
    let err = null;
    try {
      const r = await fetch('/__photo.png');
      const b = await r.blob();
      await processFile(new File([b], 'page-photo.png', { type: 'image/png' }));
    } catch (e) { err = String((e && e.message) || e); }
    finally { window.openVerifyModalForImport = oV; window.wfConfirm = oCon; }
    const el = document.getElementById('fileStatus');
    const cls = el ? Array.from(el.classList) : [];
    return JSON.stringify({
      err,
      text: el ? String(el.textContent || '').slice(0, 200) : null,
      warnState: cls.includes('file-status--warn'),
      successState: cls.includes('file-status--success')
    });
  })();
}

// Opens the Verify panel for a photo and drives zoom, pan and reset.
function driveImageViewer() {
  const oCon = window.wfConfirm;
  window.wfConfirm = () => Promise.resolve(true);
  return (async () => {
    let err = null;
    try {
      const r = await fetch('/__photo.png');
      const b = await r.blob();
      await processFile(new File([b], 'page-photo.png', { type: 'image/png' }));
    } catch (e) { err = String((e && e.message) || e); }
    finally { window.wfConfirm = oCon; }

    const wrap = document.getElementById('verifyImgWrap');
    const img  = document.getElementById('verifyImg');
    const frame = document.getElementById('verifyPdfFrame');
    if (!wrap || !img) return JSON.stringify({ err, mounted: false });

    await new Promise(r => setTimeout(r, 300));
    const read = () => ({
      x: img.style.getPropertyValue('--vx'),
      y: img.style.getPropertyValue('--vy'),
      z: img.style.getPropertyValue('--vz')
    });
    const fitted = read();

    // Zoom in on the centre. Repeatedly, so the image ends up LARGER than
    // the pane — at fit it is smaller, and the clamp then legitimately
    // restricts a drag, which is the behaviour being relied on rather than
    // a bug. Panning only matters once the image overflows anyway.
    const rect = wrap.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      wrap.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100, clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2, bubbles: true, cancelable: true
      }));
    }
    const zoomed = read();
    const overflows = (img.naturalWidth  * parseFloat(zoomed.z)) > wrap.clientWidth &&
                      (img.naturalHeight * parseFloat(zoomed.z)) > wrap.clientHeight;

    // Drag to pan.
    wrap.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, clientY: 200, bubbles: true, pointerId: 1 }));
    wrap.dispatchEvent(new PointerEvent('pointermove', { clientX: 320, clientY: 260, bubbles: true, pointerId: 1 }));
    const panned = read();
    wrap.dispatchEvent(new PointerEvent('pointerup', { clientX: 320, clientY: 260, bubbles: true, pointerId: 1 }));

    // Now drag far past any sane limit and confirm the image is still there.
    wrap.dispatchEvent(new PointerEvent('pointerdown', { clientX: 400, clientY: 400, bubbles: true, pointerId: 2 }));
    wrap.dispatchEvent(new PointerEvent('pointermove', { clientX: -4000, clientY: -4000, bubbles: true, pointerId: 2 }));
    wrap.dispatchEvent(new PointerEvent('pointerup',   { clientX: -4000, clientY: -4000, bubbles: true, pointerId: 2 }));
    const hugeDrag = read();
    const hx = parseFloat(hugeDrag.x), hy = parseFloat(hugeDrag.y);
    const hw = img.naturalWidth * parseFloat(hugeDrag.z);
    const hh = img.naturalHeight * parseFloat(hugeDrag.z);
    // Still overlapping the pane on both axes?
    const clamped = (hx + hw) > 0 && hx < wrap.clientWidth &&
                    (hy + hh) > 0 && hy < wrap.clientHeight;

    // Double-click resets to fit.
    wrap.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const reset = read();

    return JSON.stringify({
      err, mounted: true,
      imgVisible: wrap.style.display !== 'none',
      frameHidden: !frame || frame.style.display === 'none',
      hasSrc: !!img.getAttribute('src'),
      fitted, zoomed, panned, reset, overflows, hugeDrag, clamped,
      zoomedIn: parseFloat(zoomed.z || '1') > parseFloat(fitted.z || '1'),
      pannedX: parseFloat(panned.x) - parseFloat(zoomed.x),
      pannedY: parseFloat(panned.y) - parseFloat(zoomed.y),
      resetMatchesFit: reset.z === fitted.z && reset.x === fitted.x && reset.y === fitted.y
    });
  })();
}

async function importScan(which) {
  const t0 = performance.now();
  const r = await fetch(which || '/__scan.pdf');
  const b = await r.blob();
  // Name and MIME follow the URL, not a hardcoded .pdf — an image handed to
  // the app under a .pdf name goes straight to the PDF parser and the image
  // branch is never reached. That is exactly what the first run of this did.
  const isPng = /.png$/i.test(which || '');
  const name = isPng ? 'page-photo.png' : 'scanned-document.pdf';
  const mime = isPng ? 'image/png' : 'application/pdf';
  const f = new File([b], name, { type: mime });
  let text = '', err = null, warn = [], stype = null;
  try {
    const docs = await extractFromFile(f);
    text = (docs || []).map(d => d.text || '').join('\n');
    warn = (docs && docs[0] && docs[0].warnings) || [];
    stype = docs && docs[0] && docs[0].sourceType;
  } catch (e) { err = String((e && e.message) || e); }
  return JSON.stringify({
    ms: Math.round(performance.now() - t0),
    chars: text.length,
    text: text.slice(0, 400),
    // Computed in-page rather than shipping the whole document back: the OCR
    // text is APPENDED, so a truncated head would never contain it and the
    // append assertion would quietly test nothing.
    hasOcrText:      /TRANSCRIBED BY MOCK VISION/.test(text),
    hasOriginalText: /Ordinary readable prose/.test(text),
    err, warn, stype
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
  let id = 0; const pend = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const cdp = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pend.set(i, (m) => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (x, t = 180000) => {
    const r = await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true, timeout: t });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };
  const callInPage = (fn, arg) => ev(`(${fn.toString()})(${JSON.stringify(arg)})`);

  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('waxframe_v2_hive', ${JSON.stringify(JSON.stringify(HIVE_SEED))}); } catch (e) {}`
  });
  await cdp('Page.navigate', { url: `${MOCK}/index.html` });
  let booted = false;
  for (let i = 0; i < 200; i++) {
    try { if (await ev('window.__wfBootComplete === true')) { booted = true; break; } } catch {}
    await sleep(150);
  }
  if (!booted) throw new Error('the app never signalled boot complete');

  console.log('check-ocr-handoff\n');
  console.log('  > Setup');
  const setup = JSON.parse(await callInPage(aimAtMock, MOCK));
  check('two vision-capable AIs are configured (liveness)',
    Array.isArray(setup.visionCapable) && setup.visionCapable.length === 2, setup);

  // ── 1. The hand-off fires and its text lands in the document ────────
  console.log('\n  > 1. A page with no text layer hands off to vision');
  mode = 'ok';
  await fetch(`${MOCK}/__mock/reset`);
  const r1 = JSON.parse(await callInPage(importScan));
  const c1 = await (await fetch(`${MOCK}/__mock/calls`)).json();
  console.log(`      ${r1.ms} ms, ${r1.chars} chars, sourceType=${r1.stype}, ${c1.length} vision call(s)`);
  check('the vision provider was actually called (liveness — the rest is vacuous without it)',
    c1.length >= 1, c1);
  check('the request carried the page image(s)', (c1[0] || {}).images >= 1, c1[0]);
  check('the request carried the transcription instruction', (c1[0] || {}).hasPrompt === true, c1[0]);
  check('the request carried the Authorization header', (c1[0] || {}).auth === 'present', c1[0]);
  check('the transcribed text reached the extracted document',
    (r1.text || '').includes('TRANSCRIBED BY MOCK VISION'), r1.text);
  check('the import did not error', r1.err === null, r1.err);
  check('the user is told vision produced the text, and to check it',
    (r1.warn || []).some(w => /(AI vision|OCR pass)/i.test(w) && /(accuracy|verify)/i.test(w)), r1.warn);
  check('the document is marked as vision-sourced so the Verify panel opens',
    r1.stype === 'pdf-vision', r1.stype);

  // ── 2. An empty 200 falls through to the next provider ──────────────
  console.log('\n  > 2. A provider returning an empty 200 falls through');
  mode = 'empty';
  await fetch(`${MOCK}/__mock/reset`);
  const r2 = JSON.parse(await callInPage(importScan));
  const c2 = await (await fetch(`${MOCK}/__mock/calls`)).json();
  console.log(`      ${c2.length} vision call(s): ${c2.map(c => c.provider).join(' -> ')}`);
  check('it tried a SECOND provider after the empty response (liveness)', c2.length >= 2, c2);
  check('the second provider\'s text still reached the document',
    (r2.text || '').includes('TRANSCRIBED BY MOCK VISION'), r2.text);

  // ── 2b. The OTHER branch: mostly text, one picture page ─────────────
  console.log('\n  > 2b. A mostly-text document with one image-only page');
  mode = 'ok';
  await fetch(`${MOCK}/__mock/reset`);
  const rMix = JSON.parse(await callInPage(importScan, '/__mixed.pdf'));
  const cMix = await (await fetch(`${MOCK}/__mock/calls`)).json();
  console.log(`      ${rMix.chars} chars, sourceType=${rMix.stype}, ${cMix.length} vision call(s)`);
  check('the readable pages still extracted normally (liveness)', rMix.chars > 2000, rMix.chars);
  check('only the sparse page was sent, not the whole document',
    cMix.length >= 1 && (cMix[0] || {}).images === 1, cMix);
  check('the OCR text was APPENDED to the real text, not substituted for it',
    rMix.hasOcrText === true && rMix.hasOriginalText === true,
    { hasOcrText: rMix.hasOcrText, hasOriginalText: rMix.hasOriginalText, chars: rMix.chars });
  check('the whole-document vision branch did NOT fire for a mostly-text file',
    rMix.stype !== 'pdf-vision', rMix.stype);
  check('the user is told which pages were OCR-ed',
    (rMix.warn || []).some(w => /OCR pass added content from sparse pages/i.test(w)), rMix.warn);

  // ── 2c. A photograph, which has no text layer to fall back on ───────
  console.log('\n  > 2c. A photo of a page imports and is read by vision');
  mode = 'ok';
  await fetch(`${MOCK}/__mock/reset`);
  const rImg = JSON.parse(await callInPage(importScan, '/__photo.png'));
  const cImg = await (await fetch(`${MOCK}/__mock/calls`)).json();
  console.log(`      ${rImg.chars} chars, sourceType=${rImg.stype}, ${cImg.length} vision call(s)`);
  check('an image file is accepted at all (this was "Unsupported file type" before v3.63.541)',
    rImg.err === null, rImg.err);
  check('it was sent to vision (liveness)', cImg.length === 1, cImg);
  check('the transcription became the document', rImg.hasOcrText === true, rImg);
  check('it is marked image-vision so the Verify panel opens beside the photo',
    rImg.stype === 'image-vision', rImg.stype);
  check('the user is told it came from an image and to check it',
    (rImg.warn || []).some(w => /image via AI vision/i.test(w) && /check it/i.test(w)), rImg.warn);
  check('an oversized photo is scaled before being sent, and the user is told',
    (rImg.warn || []).some(w => /scaled to \d+x\d+/i.test(w)), rImg.warn);

  // ── 2c-ii. WHICH surface does the user actually see? ────────────────
  // 2c proves extractFromFile returns the right data. It says nothing about
  // presentation, and that gap shipped: 'image-vision' did not match the
  // 'pdf-vision' routing test, so a photo that imported PERFECTLY was
  // announced as "Imported with warnings — some parts of the file could not
  // be fully parsed". Nothing had failed to parse. Testing a return value is
  // not testing what the person is told.
  console.log('\n  > 2c-ii. A successful photo import must not look like a failure');
  await fetch(`${MOCK}/__mock/reset`);
  const routed = JSON.parse(await ev(`(${whichSurfaceOpens.toString()})()`));
  check('the real import handler ran (liveness)', routed.err === undefined, routed.err);
  check('a photo opens the Verify panel, where it can be checked against the original',
    routed.verify !== null && routed.verify.sourceType === 'image-vision', routed);
  check('it does NOT raise the parse-failure card — nothing failed to parse',
    routed.card === null, routed.card);

  // ── 2c-iii. After dismissing, is there a way back? ──────────────────
  // The panel opening is not the whole story. It can be dismissed, and if
  // nothing reveals it again the only route back to the extracted text is
  // deleting the file and importing it a second time. That shipped: the
  // Review button was revealed for .pdf only, so a photo had no way back.
  console.log('\n  > 2c-iii. Dismissing the panel must not be a dead end');
  await fetch(`${MOCK}/__mock/reset`);
  const back = JSON.parse(await ev(`(${isThereAWayBack.toString()})()`));
  check('the import ran (liveness)', back.err === null, back.err);
  check('the Review button is VISIBLE after a photo import', back.reviewBtnVisible === true, back);
  check('the verify context survives, so the button has something to open',
    back.verifyContextKept === true && back.contextSourceType === 'image-vision', back);
  check('the photo is marked renderable, so it shows beside the text on reopen',
    back.contextIsRenderable === true, back);

  // ── 2c-iv. The status line must not call a success a warning ────────
  // The card was fixed in v3.63.542 and the Review button in v3.63.543, but
  // the STATUS LINE still rendered the warning triangle and the warning
  // colour for a vision read that worked perfectly. Three surfaces, one
  // question — "did this fail?" — answered separately each time.
  console.log('\n  > 2c-iv. A vision read that worked reads as success, not warning');
  await fetch(`${MOCK}/__mock/reset`);
  const line = JSON.parse(await ev(`(${readStatusLine.toString()})()`));
  check('the import ran and wrote a status line (liveness)',
    line.err === null && !!line.text, line);
  check('it does NOT carry the warning triangle', !/\u26A0/.test(line.text || ''), line.text);
  check('it is NOT styled as a warning', line.warnState === false, line);
  check('it IS styled as a success', line.successState === true, line);
  check('it still says the text came from vision and should be checked',
    /AI vision/i.test(line.text || '') && /check it/i.test(line.text || ''), line.text);

  // ── 2c-v. Zoom without pan is useless for comparing text ────────────
  // The Verify panel put images in the PDF iframe, and the browser's built-in
  // image view zooms on click with no way to pan — so magnifying a
  // photographed page stranded most of it off-screen, which defeats the one
  // job this panel has. Images now get a real viewer.
  console.log('\n  > 2c-v. The image viewer zooms AND pans');
  await fetch(`${MOCK}/__mock/reset`);
  const viewer = JSON.parse(await ev(`(${driveImageViewer.toString()})()`));
  check('the image viewer mounted for a photo (liveness)',
    viewer.mounted === true && viewer.imgVisible === true && viewer.hasSrc === true, viewer);
  check('the PDF iframe is NOT used for an image', viewer.frameHidden === true, viewer);
  check('it fits the image to the pane on open', !!viewer.fitted.z, viewer.fitted);
  check('scrolling zooms in', viewer.zoomedIn === true, { fitted: viewer.fitted, zoomed: viewer.zoomed });
  check('the image overflows the pane before panning is judged (liveness)',
    viewer.overflows === true,
    'not zoomed past the pane, so the clamp would mask the result');
  check('dragging pans — the whole point of the fix',
    viewer.pannedX === 120 && viewer.pannedY === 60,
    { dx: viewer.pannedX, dy: viewer.pannedY, expected: '120 / 60' });
  // v3.63.546 — and it cannot be dragged into the void.
  check('the image stays inside the pane however far it is dragged',
    viewer.clamped === true,
    { afterHugeDrag: viewer.hugeDrag, note: 'image left entirely outside the pane' });
  check('double-click resets back to fit', viewer.resetMatchesFit === true,
    { reset: viewer.reset, fitted: viewer.fitted });

  // ── 2d. The same photo with NO vision provider configured ───────────
  console.log('\n  > 2d. A photo with no vision AI set up');
  await fetch(`${MOCK}/__mock/reset`);
  const rNoKey = JSON.parse(await ev(`(async () => {
    const saved = {};
    ['chatgpt','claude'].forEach(p => { saved[p] = API_CONFIGS[p]._key; API_CONFIGS[p]._key = ''; });
    let out;
    try { out = await (${importScan.toString()})('/__photo.png'); }
    finally { ['chatgpt','claude'].forEach(p => { API_CONFIGS[p]._key = saved[p]; }); }
    return out;
  })()`));
  const cNoKey = await (await fetch(`${MOCK}/__mock/calls`)).json();
  check('it fails rather than returning an empty document', rNoKey.err !== null, rNoKey);
  check('the message says a vision AI is needed and how to proceed',
    /vision-capable AI/i.test(rNoKey.err || '') && /paste/i.test(rNoKey.err || ''), rNoKey.err);
  check('no provider was called with no key configured', cNoKey.length === 0, cNoKey);

  // ── 3. Every provider failing is visible, not silent ────────────────
  console.log('\n  > 3. Every provider failing');
  mode = 'allfail';
  await fetch(`${MOCK}/__mock/reset`);
  const r3 = JSON.parse(await callInPage(importScan));
  const c3 = await (await fetch(`${MOCK}/__mock/calls`)).json();
  console.log(`      ${c3.length} vision call(s), ${r3.chars} chars, warnings: ${JSON.stringify(r3.warn)}`);
  check('every configured provider was tried before giving up', c3.length >= 2, c3);
  check('the import still completes rather than throwing', r3.err === null, r3.err);
  check('no mock text leaked into the document on failure',
    !(r3.text || '').includes('TRANSCRIBED BY MOCK VISION'), r3.text);
  check('the user is warned rather than left with a silently empty document',
    (r3.warn || []).length > 0, r3.warn);

} catch (err) {
  bad++;
  console.log(`      XX  harness error: ${err.message}`);
} finally {
  try { ws && ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  await new Promise(r => server.close(r));
  await sleep(200);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log(bad
  ? `\nFAIL check-ocr-handoff: ${bad} check(s) failed.`
  : `\nPASS check-ocr-handoff: the OCR hand-off works and fails visibly.`);
process.exit(bad ? 1 : 0);
