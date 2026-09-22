// ============================================================
//  WaxFrame — tools/test-debug-redaction.mjs
// Build: 20260922-005
// ============================================================
// Fixture-based regression test for WF_DEBUG.scrubFailureRecord, the
// redaction pass applied to the failure record before it is written into a
// Scout bundle (js/wf-debug.js, added v3.63.493).
//
// Why this exists: the failure record carries a provider's raw error message
// and raw response body. Neither is EXPECTED to contain a credential — and
// "not expected to" is exactly the assumption that puts secrets in exports.
// scrubFailureRecord was deliberately hoisted out of a closure into a method
// so a test could reach it; until now no test did, so the one redaction path
// on the export surface was covered by manual browser checks only.
//
// js/wf-debug.js is a classic script that assigns window.WF_DEBUG and touches
// localStorage/document at load, so it is not require()-able. It is loaded
// here in a vm sandbox with the browser globals stubbed — the whole real
// file, not a copied-out snippet, so a load-time break fails this test too.
//
// Every credential-shaped fixture below is assembled from parts at runtime so
// this file's SOURCE contains no string matching the confidentiality gate's
// secret patterns. All values are invented.
//
// Run: node tools/test-debug-redaction.mjs
// ============================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Load the real js/wf-debug.js under stubbed browser globals ──────────

const source = fs.readFileSync(path.join(ROOT, 'js', 'wf-debug.js'), 'utf8');

const lsStore = {};
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  localStorage: {
    getItem: (k) => (k in lsStore ? lsStore[k] : null),
    setItem: (k, v) => { lsStore[k] = String(v); },
    removeItem: (k) => { delete lsStore[k]; }
  },
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; }
  },
  navigator: {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInContext(source, vm.createContext(sandbox), { filename: 'js/wf-debug.js' });

const WF_DEBUG = sandbox.window.WF_DEBUG;
assert.equal(typeof WF_DEBUG, 'object', 'wf-debug.js did not publish window.WF_DEBUG');
assert.equal(typeof WF_DEBUG.scrubFailureRecord, 'function',
  'WF_DEBUG.scrubFailureRecord is missing — the Scout-bundle redaction path is gone');

const scrub = (rec) => WF_DEBUG.scrubFailureRecord(rec);

// ── Invented credential-shaped fixtures ────────────────────────────────

const OPENAI_KEY = 'sk-' + 'T'.repeat(40);
const GOOGLE_KEY = 'AIza' + 'Q'.repeat(35);
const JWT = ['eyJ' + 'h'.repeat(24), 'eyJ' + 's'.repeat(40), 'z'.repeat(43)].join('.');
const BASIC = Buffer.from('invented-user:invented-pass').toString('base64') + 'PaddingToLength';

let pass = 0;
let fail = 0;

function check(label, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    fail++;
    console.log(`  ✗ ${label}`);
    console.log(`      ${e.message.split('\n')[0]}`);
  }
}

console.log('▶ WF_DEBUG.scrubFailureRecord — credential redaction');

check('Open WebUI JWT bearer token in a message', () => {
  const out = scrub({ message: `401 Unauthorized: Bearer ${JWT} was rejected` });
  assert.ok(!out.message.includes(JWT), 'JWT survived redaction');
  assert.ok(out.message.includes('Bearer [REDACTED]'), `unexpected: ${out.message}`);
});

check('JWT bearer token inside a raw response body', () => {
  const out = scrub({ raw: `{"detail":"invalid token","sent":"Bearer ${JWT}"}` });
  assert.ok(!out.raw.includes(JWT), 'JWT survived redaction in raw');
});

check('sk-* key echoed in an error message', () => {
  const out = scrub({ message: `Incorrect API key provided: ${OPENAI_KEY}` });
  assert.ok(!out.message.includes(OPENAI_KEY), 'sk-* key survived redaction');
  assert.ok(out.message.includes('sk-[REDACTED]'), `unexpected: ${out.message}`);
});

check('AIza* key in a query string', () => {
  const out = scrub({ url: `https://example.invalid/v1beta/models?key=${GOOGLE_KEY}` });
  assert.ok(!out.url.includes(GOOGLE_KEY), 'AIza* key survived redaction in a query string');
});

check('AIza* key bare in prose', () => {
  const out = scrub({ message: `API key not valid: ${GOOGLE_KEY}` });
  assert.ok(!out.message.includes(GOOGLE_KEY), 'bare AIza* key survived redaction');
  assert.ok(out.message.includes('AIza[REDACTED]'), `unexpected: ${out.message}`);
});

check('access_token in a query string', () => {
  const secret = 'a'.repeat(32);
  const out = scrub({ url: `https://example.invalid/chat?access_token=${secret}&stream=true` });
  assert.ok(!out.url.includes(secret), 'access_token survived redaction');
  assert.ok(out.url.includes('&stream=true'), 'redaction ate the rest of the query string');
});

check('HTTP Basic credentials', () => {
  const out = scrub({ message: `Proxy rejected Basic ${BASIC}` });
  assert.ok(!out.message.includes(BASIC), 'Basic credentials survived redaction');
  assert.ok(out.message.includes('Basic [REDACTED]'), `unexpected: ${out.message}`);
});

check('x-api-key header echoed in a JSON body', () => {
  const secret = 'header-secret-value-1234567890';
  const out = scrub({ raw: `{"headers":{"x-api-key":"${secret}"},"status":401}` });
  assert.ok(!out.raw.includes(secret), 'x-api-key header value survived redaction');
  assert.ok(out.raw.includes('"x-api-key":"[REDACTED]"'), `unexpected: ${out.raw}`);
});

check('authorization header echoed in a JSON body', () => {
  const secret = 'another-invented-header-value-01';
  const out = scrub({ raw: `{"authorization":"${secret}"}` });
  assert.ok(!out.raw.includes(secret), 'authorization header value survived redaction');
});

console.log('▶ WF_DEBUG.scrubFailureRecord — benign content is left alone');

check('ordinary prose survives untouched', () => {
  const message = 'HTTP 503 from the model server after 62s — no response body returned.';
  assert.equal(scrub({ message }).message, message);
});

check('a model id that merely starts with sk is not redacted', () => {
  const message = 'Model skyfall-7b is not available on this endpoint.';
  assert.equal(scrub({ message }).message, message);
});

check('a short bearer-like word is not redacted', () => {
  const message = 'Bearer token missing';
  assert.equal(scrub({ message }).message, message);
});

check('non-string fields pass through by value', () => {
  const out = scrub({ status: 429, deepDive: false, ts: null, counts: { rounds: 3 } });
  assert.equal(out.status, 429);
  assert.equal(out.deepDive, false);
  assert.equal(out.ts, null);
  assert.deepEqual(out.counts, { rounds: 3 });
});

check('non-object input yields null rather than throwing', () => {
  assert.equal(scrub(null), null);
  assert.equal(scrub(undefined), null);
  assert.equal(scrub('a string'), null);
  assert.equal(scrub(42), null);
});

check('the original record is not mutated', () => {
  const rec = { message: `key ${OPENAI_KEY}` };
  scrub(rec);
  assert.ok(rec.message.includes(OPENAI_KEY), 'scrubFailureRecord mutated its input');
});

console.log('▶ WF_DEBUG.scrubFailureRecord — raw-body truncation');

check('an oversized raw body is truncated with a count', () => {
  const raw = 'x'.repeat(10000);
  const out = scrub({ raw });
  assert.ok(out.raw.length < 4300, `raw not truncated: ${out.raw.length} chars`);
  assert.ok(out.raw.startsWith('x'.repeat(4000)), 'truncation did not keep the head of the body');
  assert.match(out.raw, /truncated 6,000 chars for bundle export/);
});

check('a raw body under the cap is left whole', () => {
  const raw = 'y'.repeat(3999);
  assert.equal(scrub({ raw }).raw, raw);
});

check('truncation is measured after redaction, not before', () => {
  // A 4,000-char body ending in a key must still have the key removed; the
  // truncation branch must not short-circuit the cleaning pass.
  const raw = 'z'.repeat(3600) + ' ' + OPENAI_KEY;
  const out = scrub({ raw });
  assert.ok(!out.raw.includes(OPENAI_KEY), 'a key near the truncation boundary survived');
});

check('only the raw field is length-capped', () => {
  const long = 'm'.repeat(10000);
  assert.equal(scrub({ message: long }).message.length, 10000);
});

console.log('▶ The Troubleshooting card\'s technical details are an EXPORT surface');

// v3.63.519 — two buttons on that card publish this block: "Report on GitHub"
// prefills an issue on a PUBLIC repository with up to 1,500 characters of it,
// and "Copy report" puts it on the clipboard. It was built straight from the
// provider's error message and response body with no redaction, while the
// Scout bundle — the less dangerous of the two — had been scrubbed since
// v3.63.493. Providers echo credentials in error text routinely.
check('the details shape scrubs credentials out of message and raw', () => {
  const details = {
    code: 'AUTH_FAILED', ai: 'ChatGPT', provider: 'chatgpt', status: 401,
    message: `Incorrect API key provided: ${OPENAI_KEY}.`,
    raw: JSON.stringify({ error: { message: `key ${OPENAI_KEY}` }, headers: { authorization: `Bearer ${JWT}` } }),
    version: 'v0.0.0', build: '00000000-000', ts: new Date().toISOString(),
    deepDiveOn: true, ringBufferLen: 12
  };
  const out = scrub(details);
  const text = JSON.stringify(out);
  assert.ok(!text.includes(OPENAI_KEY), 'the API key reached the published details');
  assert.ok(!text.includes(JWT), 'a bearer token reached the published details');
  // The block still has to be USEFUL as a bug report afterwards.
  assert.equal(out.status, 401, 'status must survive redaction');
  assert.equal(out.ringBufferLen, 12, 'non-string fields must survive redaction');
  assert.equal(out.deepDiveOn, true);
  assert.equal(out.code, 'AUTH_FAILED');
  assert.equal(out.provider, 'chatgpt');
});

check('the card builds those details THROUGH scrubFailureRecord', () => {
  // Source-level guard. The DOM path cannot be driven from here, and this is
  // the specific regression worth catching: someone editing the details
  // object and dropping the scrub call would silently re-open a one-click
  // path from a provider error to a public issue.
  const idx = source.indexOf('tcDetails');
  assert.notEqual(idx, -1, 'tcDetails is gone — re-point this guard');
  const region = source.slice(source.indexOf('Technical details'), source.indexOf('Reset expand state'));
  assert.ok(/scrubFailureRecord\s*\(/.test(region),
    'the card details block no longer passes through scrubFailureRecord');
});

// ── v3.63.537 — the session debug channels ──────────────────────────────
//
// The saved session carries lastFailure, ringBuffer and consoleHTML, all
// written by capture paths that do not scrub. Two export surfaces ship the
// blob whole, and both used to ship it raw while carefully scrubbing their
// OTHER copy of the same data in the same file.
//
// These are behavioural where they can be and source-level where they
// cannot: the checkpoint envelope lives in storage.js, which needs the DOM
// and IndexedDB and will not run in this sandbox. The end-to-end proof is
// tools/check-export-redaction.mjs, which builds both real artifacts in a
// browser — it is not a gate stage because the gate is deliberately
// browser-free. What is pinned here is that the CALLS still exist, which is
// the regression that would otherwise pass every test in this file.

console.log('▶ WF_DEBUG.scrubSessionDebug — the session debug channels');

check('scrubText is exported as its own method', () => {
  assert.equal(typeof WF_DEBUG.scrubText, 'function',
    'scrubText is gone — every other export surface shares that one definition');
  assert.ok(!WF_DEBUG.scrubText(`key ${OPENAI_KEY}`).includes(OPENAI_KEY));
  assert.equal(WF_DEBUG.scrubText(42), 42, 'non-strings must pass through');
});

check('all three debug channels are cleaned', () => {
  const out = WF_DEBUG.scrubSessionDebug({
    docText: `the document, which mentions ${OPENAI_KEY} on purpose`,
    lastFailure: { message: `rejected ${OPENAI_KEY}`, raw: `{"sent":"Bearer ${JWT}"}`, status: 401 },
    ringBuffer: [{ round: 1, prompt: `prompt with ${GOOGLE_KEY}`, nested: { deep: `Bearer ${JWT}` } }],
    consoleHTML: `<div>auth failed for ${OPENAI_KEY}</div>`
  });
  const failure = JSON.stringify(out.lastFailure);
  assert.ok(!failure.includes(OPENAI_KEY), 'lastFailure.message survived');
  assert.ok(!failure.includes(JWT), 'lastFailure.raw survived');
  assert.ok(!JSON.stringify(out.ringBuffer).includes(GOOGLE_KEY), 'ringBuffer prompt survived');
  assert.ok(!JSON.stringify(out.ringBuffer).includes(JWT), 'ringBuffer nested value survived');
  assert.ok(!out.consoleHTML.includes(OPENAI_KEY), 'consoleHTML survived');
});

check('user content is NOT scrubbed — a checkpoint must restore it byte for byte', () => {
  const docText = `the document, which mentions ${OPENAI_KEY} on purpose`;
  const out = WF_DEBUG.scrubSessionDebug({ docText, history: [{ doc: docText }] });
  assert.equal(out.docText, docText, 'docText was altered — restore would be corrupted');
  assert.equal(out.history[0].doc, docText, 'history document text was altered');
});

check('cleaning FILTERS rather than deletes', () => {
  const out = WF_DEBUG.scrubSessionDebug({
    lastFailure: { message: `rejected ${OPENAI_KEY}`, status: 401, code: 'AUTH_FAILED' },
    ringBuffer: [{ round: 7, prompt: 'the critique', tokens: 1200 }],
    consoleHTML: '<div class="console-entry">round 1 complete</div>'
  });
  assert.equal(out.lastFailure.status, 401, 'non-string fields must survive');
  assert.equal(out.lastFailure.code, 'AUTH_FAILED');
  assert.equal(out.ringBuffer[0].round, 7, 'ring-buffer numbers must survive');
  assert.equal(out.ringBuffer[0].prompt, 'the critique', 'benign prompt text must survive');
  assert.ok(out.consoleHTML.includes('round 1 complete'), 'benign console text must survive');
});

check('odd shapes pass through rather than throwing', () => {
  assert.equal(WF_DEBUG.scrubSessionDebug(null), null);
  assert.equal(WF_DEBUG.scrubSessionDebug(undefined), undefined);
  assert.equal(WF_DEBUG.scrubSessionDebug('a string'), 'a string');
  const noChannels = WF_DEBUG.scrubSessionDebug({ round: 3 });
  assert.equal(noChannels.round, 3);
});

check('the Scout bundle routes BOTH session copies through the scrub', () => {
  const region = source.slice(source.indexOf('const envelope = {'), source.indexOf('const filename'));
  assert.ok(/ringBuffer:\s*this\.scrubRingBuffer\(/.test(region),
    'envelope.ringBuffer is no longer scrubbed — captureRound stores raw prompts and responses');
  const cp = source.slice(source.indexOf('checkpoint = {'), source.indexOf('const envelope = {'));
  assert.ok(/IDB_SESSION:\s*this\.scrubSessionDebug\(/.test(cp),
    'checkpoint.IDB_SESSION is raw again — this is the copy that defeated every other scrub in the file');
});

check('the checkpoint envelope routes BOTH session copies through the scrub', () => {
  const storage = fs.readFileSync(path.join(ROOT, 'js', 'storage.js'), 'utf8');
  assert.ok(/function\s+_scrubSessionBlob\s*\(/.test(storage),
    '_scrubSessionBlob is gone from storage.js');
  assert.ok(/outSessionIDB\s*=\s*_scrubSessionBlob\(/.test(storage),
    'the checkpoint IDB session is exported unscrubbed again');
  assert.ok(/outSessionLS\s*=\s*_scrubSessionJSON\(/.test(storage),
    'the checkpoint LS session is exported unscrubbed again');
  // Fails CLOSED: if the scrubber is missing the channels must be emptied,
  // never passed through.
  const fn = storage.slice(storage.indexOf('function _scrubSessionBlob'), storage.indexOf('function _scrubSessionJSON'));
  assert.ok(/lastFailure:\s*null/.test(fn) && /ringBuffer:\s*\[\]/.test(fn),
    '_scrubSessionBlob no longer fails closed when WF_DEBUG is unavailable');
});

console.log('▶ The vision transcription prompt');

// Source-level, because the prompt is a string inside a function that needs
// a browser to reach. v3.63.544 fixed a real defect there: "transcribe
// exactly as it appears" was obeyed literally, so a photographed book page
// came back with print-layout hyphenation intact — uni-verse, in-teract —
// and that broken text became the Working Document for a whole hive run.
check('the prompt tells the model to rejoin words split across line breaks', () => {
  const app = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  const i = app.indexOf('Transcribe all text from these document pages');
  assert.notEqual(i, -1, 'the vision prompt is gone — re-point this guard');
  const region = app.slice(i, i + 900);
  assert.match(region, /rejoin it into/i, 'the rejoin instruction is missing');
  assert.match(region, /do NOT reproduce the page line wrapping/i, 'the line-wrap instruction is missing');
  assert.match(region, /keep hyphens that belong to the word/i, 'nothing protects genuine compound hyphens');
  assert.ok(!/exactly as it appears/i.test(region),
    '"exactly as it appears" is back, which is what caused the hyphenation defect');
});

console.log('▶ WF_DEBUG.classify — a rejected API key must reach the AUTH_FAILED card');

// v3.63.517 — a rotated Gemini key produced a generic "Something went wrong"
// card with no route to fixing it. Google returns HTTP 400, not 401/403, and
// says "API key not valid" — matching neither of the two phrasings the
// matcher had. The card that classification picks is what decides whether the
// user is offered a way out, so each provider's real wording is pinned here.
const classifyCode = (message, status) =>
  WF_DEBUG.classify(new Error(message), { status, message }).code;

check('Gemini: "API key not valid" on HTTP 400', () => {
  assert.equal(classifyCode('API key not valid. Please pass a valid API key.', 400), 'AUTH_FAILED');
});
check('Gemini: API_KEY_INVALID reason string', () => {
  assert.equal(classifyCode('{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}', 400), 'AUTH_FAILED');
});
check('OpenAI: "Incorrect API key provided"', () => {
  assert.equal(classifyCode('Incorrect API key provided: sk-xxx', 401), 'AUTH_FAILED');
});
check('OpenAI: "Invalid Authentication"', () => {
  assert.equal(classifyCode('Invalid Authentication', 401), 'AUTH_FAILED');
});
check('Anthropic: "invalid x-api-key"', () => {
  assert.equal(classifyCode('invalid x-api-key', 401), 'AUTH_FAILED');
});
check('Anthropic: authentication_error type', () => {
  assert.equal(classifyCode('{"type":"error","error":{"type":"authentication_error"}}', 401), 'AUTH_FAILED');
});
check('a bare 403 still classifies as auth', () => {
  assert.equal(classifyCode('Forbidden', 403), 'AUTH_FAILED');
});
check('an expired key classifies as auth', () => {
  assert.equal(classifyCode('API key expired. Please renew the API key.', 400), 'AUTH_FAILED');
});

check('the AUTH_FAILED card offers an inline key field', () => {
  const entry = WF_DEBUG.classify(new Error('API key not valid. Please pass a valid API key.'), { status: 400 });
  const kinds = (entry.actions || []).map(a => a.kind);
  assert.ok(kinds.includes('fix-key'), `AUTH_FAILED actions were ${JSON.stringify(kinds)}`);
  assert.ok(kinds.includes('resend-ai'), 'the re-send action is what makes the key fix useful');
});

// Must NOT be swallowed by the auth matcher.
check('a rate limit is not an auth failure', () => {
  assert.notEqual(classifyCode('Rate limit reached for requests', 429), 'AUTH_FAILED');
});
check('a quota/billing message is not an auth failure', () => {
  assert.notEqual(classifyCode('You exceeded your current quota, please check your plan and billing details', 429), 'AUTH_FAILED');
});
check('an ordinary server error is not an auth failure', () => {
  assert.notEqual(classifyCode('Internal server error', 500), 'AUTH_FAILED');
});

// ── Catalog placeholders ───────────────────────────────────────────────
// v3.63.529. Catalog entries are written with {ai}, {elapsed}, {filename} and
// friends, and until this release the only code that filled them in lived
// inside renderTroubleshootingCard(). The Import from Model Server screen
// showed catalog text without going through that renderer, so a user was shown
// the literal string "{ai} rejected the API key". These checks exist so the
// substitution stays shared and stays total: a placeholder that survives is a
// placeholder a user reads.
check('WF_DEBUG.substitute is exported', () => {
  assert.equal(typeof WF_DEBUG.substitute, 'function');
});
check('{ai} is replaced when a name is supplied', () => {
  assert.equal(WF_DEBUG.substitute('{ai} rejected the key', { aiName: 'Claude' }),
               'Claude rejected the key');
});
check('{ai} falls back to prose when no AI is in scope', () => {
  const out = WF_DEBUG.substitute('{ai} rejected the key', {});
  assert.ok(!out.includes('{ai}'), 'placeholder survived: ' + out);
  assert.ok(/^[A-Z]/.test(out), 'fallback should read as a sentence: ' + out);
});
check('every placeholder the catalog uses is substituted, with an empty ctx', () => {
  // Walk the real catalog rather than a hand-listed set, so a placeholder
  // added to an entry later is covered the day it is added.
  const cat = sandbox.window.WF_ERROR_CATALOG;
  const texts = [];
  const collect = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') texts.push(v);
      else if (v && typeof v === 'object') collect(v);
    }
  };
  collect(cat);
  assert.ok(texts.length > 0, 'no catalog text found to check');
  const leaked = [];
  for (const t of texts) {
    const out = WF_DEBUG.substitute(t, {});
    const m = out.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g);
    if (m) leaked.push(m.join(',') + '  in: ' + out.slice(0, 60));
  }
  assert.deepEqual(leaked, [], 'placeholders survived substitution: ' + leaked.join(' | '));
});

console.log('');
if (fail === 0) {
  console.log(`Debug redaction tests passed (${pass} checks).`);
  process.exit(0);
}
console.log(`${fail} debug redaction check${fail === 1 ? '' : 's'} failed.`);
process.exit(1);
