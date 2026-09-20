#!/usr/bin/env node

import worker, { isAllowedOrigin, corsHeaders, rateLimitKey } from './src/index.js';

let failures = 0;
function assert(condition, label) {
  if (condition) console.log(`  ok   ${label}`);
  else { failures++; console.log(`  FAIL ${label}`); }
}

console.log('Claude relay security controls');
assert(isAllowedOrigin('https://waxframe.com'), 'production origin allowed');
assert(isAllowedOrigin('https://weirdave.github.io'), 'GitHub Pages origin allowed');
assert(isAllowedOrigin('null'), 'portable file:// origin allowed');
assert(isAllowedOrigin('http://localhost:8080'), 'local development origin allowed');
assert(!isAllowedOrigin('https://attacker.example'), 'untrusted web origin rejected');
assert(!isAllowedOrigin('https://waxframe.com.attacker.example'), 'suffix-confusion origin rejected');

const request = new Request('https://relay.example/v1/messages', { headers: { Origin: 'https://waxframe.com' } });
const headers = corsHeaders(request);
assert(headers['Access-Control-Allow-Origin'] === 'https://waxframe.com', 'CORS echoes only the accepted origin');
assert(headers.Vary === 'Origin', 'CORS response varies by Origin');

const first = await rateLimitKey('secret-key-value');
const second = await rateLimitKey('secret-key-value');
assert(first === second && /^[a-f0-9]{32}$/.test(first), 'rate-limit identifier is deterministic and does not expose the API key');
assert(!first.includes('secret-key-value'), 'rate-limit identifier contains no plaintext key');

// ── SSE pass-through (v3.63.513) ──────────────────────────────────────
//
// The relay used to read the whole upstream response with .text() before
// replying. A streamed Claude round would therefore have reached the browser
// as one silent wait — the exact failure streaming exists to fix — and the
// relay would have held an entire Builder response in memory on the way.
//
// These drive the real fetch handler with a stubbed upstream, so the
// buffering behaviour is asserted rather than assumed. Every security guard
// runs before the upstream call and none of them read the response, so
// nothing above is weakened by passing the body through.

console.log('\nClaude relay SSE pass-through');

const realFetch = globalThis.fetch;
let upstreamController = null;

function stubUpstream({ status = 200, contentType = 'text/event-stream' } = {}) {
  // A Response with a null-body status may not be given a body at all, so
  // the stub has to respect that too — the same constraint the relay hits.
  const nullBody = [204, 205, 304].includes(status);
  globalThis.fetch = async () => new Response(
    nullBody ? null : new ReadableStream({ start(c) { upstreamController = c; } }),
    { status, headers: { 'Content-Type': contentType } }
  );
}

function relayRequest(body = '{"model":"claude","stream":true}') {
  return new Request('https://relay.example/v1/messages', {
    method: 'POST',
    headers: {
      Origin: 'https://waxframe.com',
      'Content-Type': 'application/json',
      'x-api-key': 'invented-test-key'
    },
    body
  });
}

try {
  stubUpstream();
  const resp = await worker.fetch(relayRequest(), {}, {});
  assert(resp.status === 200, 'a streamed upstream response returns 200');
  assert(resp.headers.get('Content-Type') === 'text/event-stream',
    'the upstream SSE content type is preserved');
  assert(resp.headers.get('Access-Control-Allow-Origin') === 'https://waxframe.com',
    'CORS headers are still applied to a streamed response');

  // The decisive check: the handler must have returned while the upstream
  // stream is still open. Read one frame before the upstream sends its
  // second — impossible if the body were buffered to completion first.
  const enc = new TextEncoder();
  const reader = resp.body.getReader();
  upstreamController.enqueue(enc.encode('event: content_block_delta\ndata: {"a":1}\n\n'));
  const firstRead = await reader.read();
  const firstText = new TextDecoder().decode(firstRead.value);
  assert(firstText.includes('"a":1'),
    'the first SSE frame is readable before the upstream response has finished');

  upstreamController.enqueue(enc.encode('event: message_stop\ndata: {"b":2}\n\n'));
  upstreamController.close();
  const secondRead = await reader.read();
  assert(new TextDecoder().decode(secondRead.value || new Uint8Array()).includes('"b":2'),
    'later frames continue to arrive');
  const endRead = await reader.read();
  assert(endRead.done, 'the relayed stream ends when the upstream stream ends');

  // A status that must not carry a body still must not carry one.
  stubUpstream({ status: 204, contentType: 'application/json' });
  const empty = await worker.fetch(relayRequest(), {}, {});
  assert(empty.status === 204 && empty.body === null,
    'a 204 upstream is relayed with no body rather than throwing');

  // Guards still reject before any upstream call is made.
  globalThis.fetch = async () => { throw new Error('upstream must not be called'); };
  const badOrigin = await worker.fetch(new Request('https://relay.example/v1/messages', {
    method: 'POST', headers: { Origin: 'https://attacker.example' }
  }), {}, {});
  assert(badOrigin.status === 403, 'an untrusted origin is still rejected before the upstream call');

  const noKey = await worker.fetch(new Request('https://relay.example/v1/messages', {
    method: 'POST',
    headers: { Origin: 'https://waxframe.com', 'Content-Type': 'application/json' },
    body: '{}'
  }), {}, {});
  assert(noKey.status === 401, 'a missing API key is still rejected before the upstream call');

  const badPath = await worker.fetch(new Request('https://relay.example/v1/complete', {
    method: 'POST', headers: { Origin: 'https://waxframe.com', 'x-api-key': 'k' }, body: '{}'
  }), {}, {});
  assert(badPath.status === 404, 'a path outside the allowlist is still rejected');
} finally {
  globalThis.fetch = realFetch;
}

if (failures) {
  console.log(`\n❌ ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\n✅ Claude relay security tests passed.');
