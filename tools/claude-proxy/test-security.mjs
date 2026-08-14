#!/usr/bin/env node

import { isAllowedOrigin, corsHeaders, rateLimitKey } from './src/index.js';

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

if (failures) {
  console.log(`\n❌ ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\n✅ Claude relay security tests passed.');
