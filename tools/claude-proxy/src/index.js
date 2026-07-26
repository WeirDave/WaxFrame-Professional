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
//  Bindings: NONE. No KV, no secrets, no env vars (confirmed via the
//  Cloudflare API's /workers/scripts/:name/settings endpoint at import
//  time — bindings: []). The Anthropic API key travels through per-request
//  from the browser's x-api-key header and is never stored server-side —
//  this Worker holds no credentials of its own to leak or rotate.
//
//  Deploying changes: `cd tools/claude-proxy && wrangler deploy`. Same
//  Cloudflare API token requirements as tools/pricing-worker/ (needs
//  Workers Scripts:Edit) — see tools/pricing-worker/README.md's
//  "Deploying changes to this Worker" section, same account, same token.
// ============================================================

export default {
  async fetch(request, env, ctx) {
    // CORS preflight — allow GET (for /v1/models) in addition to POST (for /v1/messages)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
        }
      });
    }

    // Path allowlist — only forward known Anthropic endpoints. Prevents the
    // worker from being used as an open proxy to other paths.
    const url = new URL(request.url);
    const path = url.pathname;
    const ALLOWED_PATHS = ['/v1/messages', '/v1/models'];
    // Backwards compat — old WaxFrame code calls the worker root for /v1/messages
    const targetPath = ALLOWED_PATHS.includes(path) ? path : '/v1/messages';

    // Method allowlist by path
    const isMessages = targetPath === '/v1/messages';
    const isModels   = targetPath === '/v1/models';
    if (isMessages && request.method !== 'POST') {
      return new Response('Method not allowed for /v1/messages', { status: 405 });
    }
    if (isModels && request.method !== 'GET') {
      return new Response('Method not allowed for /v1/models', { status: 405 });
    }

    // Build the upstream request
    const upstreamUrl = `https://api.anthropic.com${targetPath}`;
    const upstreamInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.headers.get('x-api-key'),
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
      },
    };
    // POST bodies forwarded; GETs (models list) carry no body
    if (request.method === 'POST') {
      upstreamInit.body = await request.text();
    }

    const anthropicResponse = await fetch(upstreamUrl, upstreamInit);
    const responseBody = await anthropicResponse.text();

    return new Response(responseBody, {
      status: anthropicResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
