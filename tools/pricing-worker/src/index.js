// ============================================================
//  WaxFrame — pricing Worker
//  Build: 20260603-005
//  Author: WeirDave (R David Paine III) | License: AGPL-3.0
//  GitHub: github.com/WeirDave/WaxFrame-Professional
//
//  Serves ai-api-pricing.html's data layer from Cloudflare KV
//  so pricing can be refreshed without redeploying the site.
//  KV key:  `latest`
//  Value:   JSON matching the schema in data/pricing-seed.json
//
//  Endpoint:
//    GET /api/pricing  -> { lastUpdated, providers: [...] }
//    GET /             -> small status page (HTML)
//
//  Update pricing:
//    wrangler kv key put --binding=PRICING_DATA latest --path=../data/pricing-seed.json
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
  ...CORS
};

const STATUS_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>WaxFrame Pricing Worker</title><style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#222;background:#fafafa}code{background:#eee;padding:.1rem .3rem;border-radius:3px}a{color:#0366d6}</style></head><body><h1>WaxFrame Pricing Worker</h1><p>Live data endpoint: <code><a href="/api/pricing">/api/pricing</a></code></p><p>Source: <a href="https://github.com/WeirDave/WaxFrame-Professional/tree/main/tools/pricing-worker">github.com/WeirDave/WaxFrame-Professional</a></p></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/api/pricing' && request.method === 'GET') {
      const data = await env.PRICING_DATA.get('latest');
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Pricing data not initialized in KV. Seed with: wrangler kv key put --binding=PRICING_DATA latest --path=../data/pricing-seed.json' }),
          { status: 503, headers: JSON_HEADERS }
        );
      }
      return new Response(data, { status: 200, headers: JSON_HEADERS });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(STATUS_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS }
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  }
};
