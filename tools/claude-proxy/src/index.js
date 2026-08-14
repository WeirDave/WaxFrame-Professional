// ============================================================
//  WaxFrame — Claude CORS-proxy Worker
//  Imported into version control 2026-07-25 (v3.63.416) — this Worker has
//  been live and deployed since well before that date; this file is a
//  faithful import of its actual deployed source (pulled via the
//  Cloudflare API's GET /workers/scripts/:name endpoint), not a rewrite.
//  Prior to this, its source existed only in Cloudflare's dashboard, with
//  zero version history, zero diff trail, and zero linkage to the
//  WaxFrame releases that depend on its behavior — found as a real gap
//  during a process-verification audit (see docs/WaxFrame_Backlog_Master
//  and CHANGELOG.md v3.63.414/v3.63.415 for the audit that found it).
//
//  What this is: the browser can't call api.anthropic.com directly
//  (Anthropic doesn't send CORS headers permitting arbitrary origins), so
//  every Claude API call WaxFrame makes routes through this Worker
//  instead. It's a thin, stateless CORS-adding proxy — nothing more.
//
//  Endpoint: https://waxframe-claude-proxy.weirdave.workers.dev
//  Referenced from: js/app.js (vision/OCR fallback endpoint default),
//  js/provider-catalog.js (Claude catalog entry's endpoint + the
//  'anthropic-via-proxy' model-list discovery method), CLAUDE.md §3.
//
//  Bindings: one Cloudflare Rate Limiting binding. No KV, secrets, or env
//  vars. The Anthropic API key travels through per-request from the browser's
//  x-api-key header and is never stored server-side; only a truncated SHA-256
//  digest is used as the ephemeral rate-limit key.
//
//  Deploying changes: `cd tools/claude-proxy && wrangler deploy`. Same
//  Cloudflare API token requirements as tools/pricing-worker/ (needs
//  Workers Scripts:Edit) — see tools/pricing-worker/README.md's
//  "Deploying changes to this Worker" section, same account, same token.
// ============================================================

const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15 * 60 * 1000;
const ALLOWED_ORIGINS = new Set([
  'https://waxframe.com',
  'https://www.waxframe.com',
  'https://weirdave.github.io'
]);

function isAllowedOrigin(origin) {
  if (!origin || origin === 'null') return true; // non-browser clients and portable file:// installs
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  };
}

function respond(request, body, status, extraHeaders = {}) {
  return new Response(body, { status, headers: { ...corsHeaders(request), ...extraHeaders } });
}

async function rateLimitKey(apiKey) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(digest).slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin)) {
      return respond(request, 'Origin not allowed', 403, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    // CORS preflight — allow GET (for /v1/models) in addition to POST (for /v1/messages)
    if (request.method === 'OPTIONS') {
      return respond(request, null, 204);
    }

    // Path allowlist — only forward known Anthropic endpoints. Prevents the
    // worker from being used as an open proxy to other paths.
    const url = new URL(request.url);
    const path = url.pathname;
    const ALLOWED_PATHS = ['/v1/messages', '/v1/models'];
    // Backwards compatibility: old WaxFrame code calls the Worker root for messages.
    // Every other unknown path is rejected instead of silently becoming an API call.
    const targetPath = path === '/' ? '/v1/messages' : path;
    if (!ALLOWED_PATHS.includes(targetPath)) {
      return respond(request, 'Not found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    // Method allowlist by path
    const isMessages = targetPath === '/v1/messages';
    const isModels   = targetPath === '/v1/models';
    if (isMessages && request.method !== 'POST') {
      return respond(request, 'Method not allowed for /v1/messages', 405, { 'Allow': 'POST, OPTIONS', 'Content-Type': 'text/plain; charset=utf-8' });
    }
    if (isModels && request.method !== 'GET') {
      return respond(request, 'Method not allowed for /v1/models', 405, { 'Allow': 'GET, OPTIONS', 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || /[\r\n]/.test(apiKey) || apiKey.length > 512) {
      return respond(request, JSON.stringify({ error: { type: 'authentication_error', message: 'A valid x-api-key header is required' } }), 401, { 'Content-Type': 'application/json; charset=utf-8' });
    }

    if (env.REQUEST_RATE_LIMITER) {
      const { success } = await env.REQUEST_RATE_LIMITER.limit({ key: await rateLimitKey(apiKey) });
      if (!success) {
        return respond(request, JSON.stringify({ error: { type: 'rate_limit_error', message: 'Relay rate limit exceeded' } }), 429, { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '60' });
      }
    }

    // Build the upstream request
    const upstreamUrl = `https://api.anthropic.com${targetPath}`;
    const upstreamInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
      },
    };
    // POST bodies forwarded; GETs (models list) carry no body
    if (request.method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';
      if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
        return respond(request, JSON.stringify({ error: { type: 'invalid_request_error', message: 'Content-Type must be application/json' } }), 415, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      const declaredLength = Number(request.headers.get('Content-Length') || 0);
      if (declaredLength > MAX_REQUEST_BYTES) {
        return respond(request, JSON.stringify({ error: { type: 'invalid_request_error', message: 'Request body exceeds the 8 MiB relay limit' } }), 413, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      const body = await request.arrayBuffer();
      if (body.byteLength > MAX_REQUEST_BYTES) {
        return respond(request, JSON.stringify({ error: { type: 'invalid_request_error', message: 'Request body exceeds the 8 MiB relay limit' } }), 413, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      upstreamInit.body = body;
    }

    let anthropicResponse;
    try {
      anthropicResponse = await fetch(upstreamUrl, { ...upstreamInit, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    } catch (error) {
      const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      return respond(request, JSON.stringify({ error: { type: 'api_error', message: timedOut ? 'Anthropic request timed out' : 'Anthropic request failed' } }), timedOut ? 504 : 502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    const responseBody = await anthropicResponse.text();

    return respond(request, responseBody, anthropicResponse.status, {
      'Content-Type': anthropicResponse.headers.get('Content-Type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
  }
};

export { isAllowedOrigin, corsHeaders, rateLimitKey };
