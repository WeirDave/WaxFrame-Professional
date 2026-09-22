#!/usr/bin/env node
// Build: 20260922-005
// check-pdf-shapes.mjs — the PDF shapes that break PDF engines, against BOTH
// engines WaxFrame ships.
//
// v3.63.528 moved the hosted engine to pdf.js 6.3.289 and verified it against
// one generated two-page document. That is the happy path and nothing else.
// The shapes that actually break engines are the ones a simple generator does
// not produce: no text layer at all, encryption, hundreds of pages, a
// truncated download, a broken cross-reference table.
//
// So this generates them. A PDF is a text format and these shapes are
// structural, so the generator below is a few dozen lines and needs no
// library — which matters, because this project vendors its dependencies and
// is not going to add one for a test.
//
// BOTH ENGINES, which is the half most likely to be skipped. The hosted page
// runs pdf.js 6.3.289 (ESM). The portable file:// copy is PERMANENTLY pinned
// at 3.11.174, because pdfjs-dist has shipped ESM only since 4.x and browsers
// refuse ESM imports across file:// origins. Those are three years apart and
// the older one is the likelier to choke, so testing only the hosted path
// tests the half that was never in doubt.
//
// What it found on its first run, both now fixed:
//   • MAX_EXTRACTED_CHARS at 2,000,000 refused a LEGITIMATE 600-page
//     document (~2.5 M characters). A multi-hundred-page import is a stated
//     requirement, not an edge case.
//   • A password-protected PDF surfaced pdf.js's own internal string, "No
//     password given", which names neither the file nor the reason.
//
// NOT a release-check stage: it needs Chrome, and the gate is pure Node by
// design. It is also slow — a 600-page parse is ~11 seconds per engine.
//
// Usage:  node tools/check-pdf-shapes.mjs
// Exit 0 = every shape behaved.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
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

// ══ PDF generator ═════════════════════════════════════════════════════

function buildPDF(objects, trailerExtra = '') {
  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${trailerExtra}>>\n`;
  out += `startxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
const stream = (dict, data) =>
  `<< ${dict} /Length ${Buffer.byteLength(data, 'latin1')} >>\nstream\n${data}\nendstream`;

// Dense on purpose. A page carrying one short line is legitimately "sparse"
// to the OCR heuristic, which would make a real document and a scanned one
// indistinguishable in the results — the first draft of this corpus had that
// bug and reported a false alarm about the warning firing on clean files.
function textPDF(pageCount) {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const pageNums = [];
  for (let p = 1; p <= pageCount; p++) {
    let ops = 'BT /F1 11 Tf 72 740 Td 14 TL';
    for (let ln = 0; ln < 45; ln++) {
      ops += ` (Page ${p} of the synthetic document, line ${ln + 1}. Filler prose to give the page a realistic text density.) Tj T*`;
    }
    ops += ' ET';
    objs.push(stream('', ops));
    const c = objs.length;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${c} 0 R ` +
              `/Resources << /Font << /F1 3 0 R >> >> >>`);
    pageNums.push(objs.length);
  }
  objs[1] = `<< /Type /Pages /Kids [${pageNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  return buildPDF(objs);
}

// Pages that draw an image and contain NO text operators — what a flatbed
// scanner produces, and the input the OCR fallback exists for.
function imageOnlyPDF(pageCount = 2) {
  const W = 8, H = 8;
  let px = '';
  for (let i = 0; i < W * H; i++) px += (i % 3 === 0 ? 'FF0000' : '2233AA');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '',
    stream(`/Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB ` +
           `/BitsPerComponent 8 /Filter /ASCIIHexDecode`, px + '>')];
  const pageNums = [];
  for (let p = 1; p <= pageCount; p++) {
    objs.push(stream('', 'q 500 0 0 700 56 56 cm /Im1 Do Q'));
    const c = objs.length;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${c} 0 R ` +
              `/Resources << /XObject << /Im1 3 0 R >> >> >>`);
    pageNums.push(objs.length);
  }
  objs[1] = `<< /Type /Pages /Kids [${pageNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  return buildPDF(objs);
}

function emptyPagesPDF(pageCount = 3) {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const pageNums = [];
  for (let p = 1; p <= pageCount; p++) {
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>');
    pageNums.push(objs.length);
  }
  objs[1] = `<< /Type /Pages /Kids [${pageNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  return buildPDF(objs);
}

// RC4 40-bit standard security handler, implemented rather than pulled in:
// Node's OpenSSL dropped RC4 from the default provider, and this is short.
function rc4(key, data) {
  const S = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + S[i] + key[i % key.length]) & 0xff; [S[i], S[j]] = [S[j], S[i]]; }
  const out = Buffer.alloc(data.length);
  let i = 0; j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 0xff; j = (j + S[i]) & 0xff; [S[i], S[j]] = [S[j], S[i]];
    out[k] = data[k] ^ S[(S[i] + S[j]) & 0xff];
  }
  return out;
}
const md5 = (b) => crypto.createHash('md5').update(b).digest();
const PAD = Buffer.from([
  0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,
  0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);
const padPw = (pw) => Buffer.concat([Buffer.from(pw, 'latin1'), PAD]).slice(0, 32);

// userPw '' opens with no prompt; a non-empty one must be refused.
function encryptedPDF(userPw = '') {
  const P = -1;
  const idBuf = Buffer.from('0123456789abcdef', 'latin1');
  const O = rc4(md5(padPw('owner')).slice(0, 5), padPw(userPw));
  const pBuf = Buffer.alloc(4); pBuf.writeInt32LE(P, 0);
  const key = md5(Buffer.concat([padPw(userPw), O, pBuf, idBuf])).slice(0, 5);
  const U = rc4(key, PAD);
  const objKey = (num, gen) => md5(Buffer.concat([key,
    Buffer.from([num & 0xff, (num >> 8) & 0xff, (num >> 16) & 0xff, gen & 0xff, (gen >> 8) & 0xff])
  ])).slice(0, Math.min(key.length + 5, 16));
  const body = 'BT /F1 12 Tf 72 720 Td (Encrypted synthetic document.) Tj ET';
  const encBody = rc4(objKey(4, 0), Buffer.from(body, 'latin1')).toString('latin1');
  const hex = (b) => '<' + Buffer.from(b).toString('hex') + '>';
  return buildPDF([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [5 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    stream('', encBody),
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R ' +
      '/Resources << /Font << /F1 3 0 R >> >> >>',
    `<< /Filter /Standard /V 1 /R 2 /O ${hex(O)} /U ${hex(U)} /P ${P} >>`
  ], `/Encrypt 6 0 R /ID [${hex(idBuf)} ${hex(idBuf)}] `);
}

// ── PDF 1.5+ cross-reference STREAM, and object streams ────────────────
// Everything above emits a classic `xref` table plus `trailer`. Most PDFs
// produced this century do neither: they put the cross-reference data in a
// /Type /XRef stream and pack most objects into /Type /ObjStm streams. That
// is a different parse path in pdf.js, so a corpus of classic-xref files
// leaves it entirely untested.

// entries: [type, field2, field3] per object number, index 0 = free head.
function xrefStreamBytes(entries, w = [1, 4, 2]) {
  const buf = Buffer.alloc(entries.length * (w[0] + w[1] + w[2]));
  let o = 0;
  for (const [t, f2, f3] of entries) {
    buf.writeUIntBE(t, o, w[0]); o += w[0];
    buf.writeUIntBE(f2, o, w[1]); o += w[1];
    buf.writeUIntBE(f3, o, w[2]); o += w[2];
  }
  return buf;
}

// pageCount pages of dense text. useObjStm packs the catalog, pages node,
// font and every page dict into one compressed object stream, which is what
// a modern producer actually does.
function modernPDF(pageCount = 3, useObjStm = true) {
  const NL = '\n';
  const contentFor = (p) => {
    let ops = 'BT /F1 11 Tf 72 740 Td 14 TL';
    for (let ln = 0; ln < 45; ln++) {
      ops += ` (Page ${p} of the modern-structure document, line ${ln + 1}. Filler prose for density.) Tj T*`;
    }
    return ops + ' ET';
  };

  // Object numbering:
  //   1 catalog, 2 pages, 3 font, 4..(3+n) page dicts,
  //   then content streams, then ObjStm, then XRef stream.
  const pageDictNums = [];
  const contentNums = [];
  for (let i = 0; i < pageCount; i++) pageDictNums.push(4 + i);
  for (let i = 0; i < pageCount; i++) contentNums.push(4 + pageCount + i);
  const objStmNum = 4 + pageCount * 2;
  const xrefNum = objStmNum + 1;

  const catalog = '<< /Type /Catalog /Pages 2 0 R >>';
  const pagesNode = `<< /Type /Pages /Kids [${pageDictNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  const font = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  const pageDicts = pageDictNums.map((n, i) =>
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNums[i]} 0 R ` +
    `/Resources << /Font << /F1 3 0 R >> >> >>`);

  let out = '%PDF-1.5' + NL + '%\xE2\xE3\xCF\xD3' + NL;
  const offsets = {};
  const push = (num, body) => {
    offsets[num] = Buffer.byteLength(out, 'latin1');
    out += `${num} 0 obj${NL}${body}${NL}endobj${NL}`;
  };

  // Content streams always stand alone — a stream cannot live in an ObjStm.
  contentNums.forEach((n, i) => {
    const data = contentFor(i + 1);
    push(n, `<< /Length ${Buffer.byteLength(data, 'latin1')} >>${NL}stream${NL}${data}${NL}endstream`);
  });

  const inObjStm = {};   // objnum -> index within the stream
  if (useObjStm) {
    const packed = [[1, catalog], [2, pagesNode], [3, font],
                    ...pageDictNums.map((n, i) => [n, pageDicts[i]])];
    let body = '';
    const pairs = [];
    packed.forEach(([num, src], idx) => {
      pairs.push(`${num} ${Buffer.byteLength(body, 'latin1')}`);
      inObjStm[num] = idx;
      body += src + ' ';
    });
    const header = pairs.join(' ') + ' ';
    const full = Buffer.from(header + body, 'latin1');
    const comp = zlib.deflateSync(full);
    offsets[objStmNum] = Buffer.byteLength(out, 'latin1');
    out += `${objStmNum} 0 obj${NL}<< /Type /ObjStm /N ${packed.length} /First ${header.length} ` +
           `/Filter /FlateDecode /Length ${comp.length} >>${NL}stream${NL}`;
    out += comp.toString('latin1');
    out += `${NL}endstream${NL}endobj${NL}`;
  } else {
    push(1, catalog); push(2, pagesNode); push(3, font);
    pageDictNums.forEach((n, i) => push(n, pageDicts[i]));
  }

  // The xref stream itself.
  const maxNum = xrefNum;
  const entries = [[0, 0, 65535]];
  for (let n = 1; n <= maxNum; n++) {
    if (useObjStm && inObjStm[n] !== undefined) entries.push([2, objStmNum, inObjStm[n]]);
    else if (offsets[n] !== undefined) entries.push([1, offsets[n], 0]);
    else entries.push([0, 0, 0]);
  }
  const xrefPos = Buffer.byteLength(out, 'latin1');
  entries[xrefNum] = [1, xrefPos, 0];
  const raw = xrefStreamBytes(entries);
  const comp = zlib.deflateSync(raw);
  out += `${xrefNum} 0 obj${NL}<< /Type /XRef /Size ${maxNum + 1} /W [1 4 2] /Root 1 0 R ` +
         `/Filter /FlateDecode /Length ${comp.length} >>${NL}stream${NL}`;
  out += comp.toString('latin1');
  out += `${NL}endstream${NL}endobj${NL}`;
  out += `startxref${NL}${xrefPos}${NL}%%EOF${NL}`;
  return Buffer.from(out, 'latin1');
}

const LARGE_PAGES = 600;
const FIXTURES = {
  'control':     { buf: textPDF(3),        label: '3 dense pages of text' },
  'large':       { buf: textPDF(LARGE_PAGES), label: `${LARGE_PAGES} dense pages` },
  'imageonly':   { buf: imageOnlyPDF(2),   label: 'image-only, no text layer' },
  'emptypages':  { buf: emptyPagesPDF(3),  label: 'pages with no content stream' },
  'truncated':   { buf: textPDF(4).slice(0, Math.floor(textPDF(4).length * 0.55)), label: 'truncated mid-file' },
  'corruptxref': { buf: Buffer.from(textPDF(3).toString('latin1').replace(/startxref\n\d+/, 'startxref\n999999'), 'latin1'),
                   label: 'broken cross-reference offset' },
  'encopen':     { buf: encryptedPDF(''),        label: 'encrypted, empty user password' },
  'encpw':       { buf: encryptedPDF('secret123'), label: 'encrypted, password required' },
  // PDF 1.5+ structure. Everything above emits a classic `xref` table plus
  // `trailer`; almost nothing produced this century does. Real producers put
  // the cross-reference data in a /Type /XRef stream and pack most objects
  // into /Type /ObjStm streams, which is a different parse path in pdf.js and
  // was completely untested by a corpus of classic-xref files.
  'xrefstream':  { buf: modernPDF(4, false), label: 'PDF 1.5 xref STREAM, objects standalone' },
  'objstm':      { buf: modernPDF(4, true),  label: 'PDF 1.5 xref stream + OBJECT streams' },
};

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

console.log('check-pdf-shapes — generating fixtures');
for (const [k, v] of Object.entries(FIXTURES)) {
  console.log(`  ${k.padEnd(12)} ${(v.buf.length / 1024).toFixed(1).padStart(8)} KB   ${v.label}`);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// The in-page routine, shipped via toString().
async function importOne(name) {
  const t0 = performance.now();
  const r = await fetch(name + '.pdf');
  const b = await r.blob();
  const f = new File([b], name + '.pdf', { type: 'application/pdf' });
  let chars = 0, err = null, warn = [];
  try {
    const docs = await extractFromFile(f);
    chars = (docs || []).reduce((a, d) => a + ((d.text || '').length), 0);
    warn = (docs && docs[0] && docs[0].warnings) || [];
  } catch (e) { err = String((e && e.message) || e); }
  return JSON.stringify({ ms: Math.round(performance.now() - t0), chars, err, sparse: warn.length > 0 });
}

// Shared assertions, run identically against both engines.
function assertShapes(res, engine) {
  const g = (k) => res[k] || {};
  check(`[${engine}] control: a plain document extracts (liveness — nothing below counts without this)`,
    g('control').err === null && g('control').chars > 10000, g('control'));
  // 600 dense pages must land well clear of 2,000,000 — the cap this release
  // raised. A fixture that sits under the old figure would pass whether or not
  // anyone put it back.
  check(`[${engine}] the large fixture is dense enough to test the cap at all (liveness)`,
    g('large').chars > 2400000, `${g('large').chars} chars — below the old 2,000,000 cap, so this proves nothing`);
  check(`[${engine}] control: a dense page is NOT flagged sparse`,
    g('control').sparse === false, g('control'));
  check(`[${engine}] ${LARGE_PAGES} pages import rather than hitting the character cap`,
    g('large').err === null && g('large').chars > 2000000, g('large'));
  check(`[${engine}] image-only PDF yields no text and does not error`,
    g('imageonly').err === null && g('imageonly').chars === 0, g('imageonly'));
  check(`[${engine}] image-only PDF IS flagged sparse (the OCR hand-off)`,
    g('imageonly').sparse === true, g('imageonly'));
  check(`[${engine}] pages with no content stream do not crash the import`,
    g('emptypages').err === null, g('emptypages'));
  check(`[${engine}] a truncated file fails with WaxFrame's wording, not the library's`,
    /truncated or corrupt/i.test(g('truncated').err || ''), g('truncated'));
  check(`[${engine}] a broken xref still recovers the text`,
    g('corruptxref').err === null && g('corruptxref').chars > 10000, g('corruptxref'));
  check(`[${engine}] an encrypted PDF with no password set still reads`,
    g('encopen').err === null && g('encopen').chars > 0, g('encopen'));
  check(`[${engine}] a password-protected PDF says so, and does not leak "No password given"`,
    /password-protected/i.test(g('encpw').err || '') && !/no password given/i.test(g('encpw').err || ''),
    g('encpw'));
  check(`[${engine}] a PDF 1.5 cross-reference STREAM parses`,
    g('xrefstream').err === null && g('xrefstream').chars > 10000, g('xrefstream'));
  check(`[${engine}] objects packed into an OBJECT STREAM parse`,
    g('objstm').err === null && g('objstm').chars > 10000, g('objstm'));
  // The two are the same document packed two ways, so the text must match
  // exactly. Asserting only that each "parses" would pass on a build that
  // silently dropped the objects inside the compressed stream.
  check(`[${engine}] both packings yield identical text`,
    g('xrefstream').chars === g('objstm').chars && g('xrefstream').chars > 0,
    { xrefstream: g('xrefstream').chars, objstm: g('objstm').chars });
}

// ══ Driver ════════════════════════════════════════════════════════════

async function drive({ engine, startUrl, serve, extraArgs = [] }) {
  const DEBUG_PORT = 9380 + (process.pid % 120) + (engine === 'file://' ? 1 : 0);
  const profile = path.join(os.tmpdir(), `wf-pdfshapes-${engine === 'file://' ? 'f' : 'h'}-${process.pid}`);
  const chrome = spawn(BROWSER, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--window-size=1600,1000', ...extraArgs,
    `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'
  ], { stdio: 'ignore' });
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
    let id = 0; const pend = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const cdp = (method, params = {}) => new Promise((res, rej) => {
      const i = ++id;
      pend.set(i, (m) => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result));
      ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async (x, t = 240000) => {
      const r = await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true, timeout: t });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
      return r.result.value;
    };
    await cdp('Runtime.enable'); await cdp('Page.enable');
    await cdp('Page.navigate', { url: startUrl });
    let booted = false;
    for (let i = 0; i < 260; i++) {
      try { if (await ev('window.__wfBootComplete === true')) { booted = true; break; } } catch {}
      await sleep(150);
    }
    if (!booted) throw new Error('the app never signalled boot complete');

    const version = await ev('(window.pdfjsLib && window.pdfjsLib.version) || null');
    const proto   = await ev('location.protocol');
    console.log(`\n  > ${engine} — pdf.js ${version}  (page protocol: ${proto})`);
    check(`[${engine}] the page really is on ${engine}`, proto === (engine === 'file://' ? 'file:' : 'http:'), proto);
    check(`[${engine}] pdf.js reported a version (liveness)`, !!version, version);

    const res = {};
    for (const name of Object.keys(FIXTURES)) {
      res[name] = JSON.parse(await ev(`(${importOne.toString()})(${JSON.stringify(name)})`));
    }
    for (const [k, v] of Object.entries(res)) {
      console.log(`      ${k.padEnd(12)} ${String(v.ms).padStart(6)} ms  ${String(v.chars).padStart(9)} chars` +
                  `${v.sparse ? '  [sparse]' : ''}${v.err ? '  ERR: ' + v.err.slice(0, 64) : ''}`);
    }
    assertShapes(res, engine);
    return version;
  } finally {
    try { ws && ws.close(); } catch {}
    try { chrome.kill(); } catch {}
    await sleep(200);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

// ── http:// — the hosted engine ───────────────────────────────────────
const PORT = 8790 + (process.pid % 150);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const m = rel.match(/^(.+)\.pdf$/);
  if (m && FIXTURES[m[1]]) { res.writeHead(200, { 'Content-Type': 'application/pdf' }); return res.end(FIXTURES[m[1]].buf); }
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

// ── file:// — the portable engine. Fixtures are written BESIDE index.html
// so the page can fetch them as siblings, then removed. Same approach as
// check-file-protocol.mjs; the finally block below is what keeps the repo
// clean if this dies mid-run.
const written = [];
function writeFixturesToRoot() {
  for (const [name, v] of Object.entries(FIXTURES)) {
    const p = path.join(ROOT, `${name}.pdf`);
    if (fs.existsSync(p)) throw new Error(`refusing to overwrite an existing ${name}.pdf in the repo root`);
    fs.writeFileSync(p, v.buf);
    written.push(p);
  }
}
function removeFixturesFromRoot() {
  for (const p of written.splice(0)) { try { fs.rmSync(p, { force: true }); } catch {} }
}

let httpVersion = null, fileVersion = null;
try {
  httpVersion = await drive({ engine: 'http://', startUrl: `http://127.0.0.1:${PORT}/index.html` });

  writeFixturesToRoot();
  const fileUrl = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
  fileVersion = await drive({
    engine: 'file://', startUrl: fileUrl,
    extraArgs: ['--allow-file-access-from-files']
  });

  console.log('\n  > Both engines');
  check('the two paths really run DIFFERENT pdf.js builds (else this tested one engine twice)',
    !!httpVersion && !!fileVersion && httpVersion !== fileVersion,
    `http=${httpVersion} file=${fileVersion}`);
} catch (err) {
  bad++;
  console.log(`      XX  harness error: ${err.message}`);
} finally {
  removeFixturesFromRoot();
  await new Promise(r => server.close(r));
  await sleep(200);
}

console.log(bad
  ? `\nFAIL check-pdf-shapes: ${bad} check(s) failed.`
  : `\nPASS check-pdf-shapes: every shape behaved on both engines.`);
process.exit(bad ? 1 : 0);
