// ============================================================
//  WaxFrame — pricing Worker
//  Build: 20260726-001
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
//    GET /             -> status page (HTML) + recent scheduled-refresh log
//
//  Manual pricing update (still supported, still the source of truth for
//  prose fields — rate-limit notes, recommendation copy, billing URLs):
//    wrangler kv key put --binding=PRICING_DATA latest --path=../data/pricing-seed.json --remote
//
//  v3.63.412 — Scheduled numeric-pricing refresh. A weekly cron trigger
//  (Sundays 12:00 UTC — see wrangler.toml [triggers]; Cloudflare's cron
//  day-of-week field counts differently than assumed on first pass, this
//  is the corrected label) calls refreshPricing(), which asks
//  Perplexity Sonar (web-grounded, so answers are anchored to a live
//  search rather than training-data recall) for each provider's CURRENT
//  inputPerM / outputPerM / contextWindow / maxOutput. estPerRound is
//  recomputed from those via plain math (same formula the rest of the
//  app already uses), never asked of the model. Scope is deliberately
//  narrow: only those four numeric fields move automatically. Prose
//  fields (rateLimitNotes, recommendationNote, billingUrl, freeTier,
//  tier1Rpm/Tpm) stay human-curated — editorial judgment and exact-URL
//  correctness aren't things to hand to a scheduled LLM call.
//
//  Safety: any provider whose response fails to parse, or whose fields
//  fail validation (non-numeric price, negative price, malformed size
//  string), keeps its PREVIOUS values untouched — never overwritten with
//  a guess. The prior full payload is also kept under KV key `previous`
//  as a one-step rollback. Every run appends a compact entry to KV key
//  `run-log` (last 10 kept) showing which providers updated/confirmed/
//  retained-old-value-and-why — rendered on the `/` status page so a
//  human can glance at it before trusting the number, e.g. before a demo.
//
//  Requires a `PERPLEXITY_API_KEY` Worker secret:
//    wrangler secret put PERPLEXITY_API_KEY
//  If unset, refreshPricing() is a silent no-op — manual KV updates keep
//  working exactly as before, the page never breaks either way.
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  // 5-min fresh + 10-min stale-while-revalidate. Pricing data updates a few
  // times a year, so we don't need aggressive caching — and a long cache
  // window means stale "Last updated" stamps in the visitor's browser for
  // the first hour after a KV refresh. 300s + SWR keeps it both cheap and
  // fresh-enough.
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
  ...CORS
};

const RUN_LOG_KEY   = 'run-log';
const PREVIOUS_KEY  = 'previous';
const MAX_LOG_ENTRIES = 10;
const PERPLEXITY_URL   = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro'; // matches the model WaxFrame's own grounded-asker uses (js/app.js _PERPLEXITY_GROUNDED_PROVIDERS) — sonar-pro's format-following is noticeably tighter for strict-JSON asks than base sonar.

function buildStatusHtml(log) {
  const rows = (log || []).map(entry => {
    const items = (entry.changes || []).map(c => {
      const label = c.status === 'updated' ? `<strong style="color:#0a7d2c">${c.id}: updated</strong>`
        : c.status === 'confirmed' ? `${c.id}: confirmed unchanged`
        : `<span style="color:#a15c00">${c.id}: retained old value (${c.reason || 'unknown reason'})</span>`;
      return `<li>${label}</li>`;
    }).join('');
    return `<details><summary>${entry.ts}</summary><ul>${items}</ul></details>`;
  }).join('') || '<p>No scheduled refresh has run yet.</p>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>WaxFrame Pricing Worker</title><style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#222;background:#fafafa}code{background:#eee;padding:.1rem .3rem;border-radius:3px}a{color:#0366d6}details{margin-bottom:.5rem}summary{cursor:pointer;font-weight:600}</style></head><body><h1>WaxFrame Pricing Worker</h1><p>Live data endpoint: <code><a href="/api/pricing">/api/pricing</a></code></p><p>Source: <a href="https://github.com/WeirDave/WaxFrame-Professional/tree/main/tools/pricing-worker">github.com/WeirDave/WaxFrame-Professional</a></p><h2>Scheduled refresh log</h2>${rows}</body></html>`;
}

function buildResearchPrompt(provider) {
  const tierNote = provider.id === 'gemini-free'
    ? ' This is Google AI Studio’s FREE tier — confirm pricing is still $0 per token, or note if the free tier has been discontinued or changed.'
    : provider.id === 'gemini-paid'
    ? ' This is the PAID tier, not the free tier.'
    : '';
  return `For the AI API provider "${provider.name}", model "${provider.model}": look up the CURRENT, officially published API pricing as of today from the provider's own pricing/billing documentation.${tierNote}

Return ONLY a compact JSON object, no markdown, no explanation, no extra text:
{"inputPerM": <number, USD per 1M input tokens, or null if you cannot verify it from an authoritative current source>, "outputPerM": <number, USD per 1M output tokens, or null>, "contextWindow": <string like "1M" or "256K", or null>, "maxOutput": <string like "8K", or null>}

Do not guess or estimate a field you cannot verify — return null for it instead.`;
}

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

function isValidPrice(n) {
  return typeof n === 'number' && isFinite(n) && n >= 0;
}

function isValidSizeString(s) {
  return typeof s === 'string' && /^~?\s*[0-9]*\.?[0-9]+\s*[KMGB]?$/i.test(s.trim());
}

async function researchProvider(provider, apiKey) {
  let resp;
  try {
    resp = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: buildResearchPrompt(provider) }]
      })
    });
  } catch (e) {
    return { ok: false, reason: `network error: ${e.message || e}` };
  }
  if (!resp.ok) return { ok: false, reason: `HTTP ${resp.status}` };

  let data;
  try { data = await resp.json(); } catch (e) { return { ok: false, reason: 'non-JSON response' }; }
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  const parsed = extractJson(text);
  if (!parsed) return { ok: false, reason: 'unparseable response' };

  const { inputPerM, outputPerM, contextWindow, maxOutput } = parsed;
  if (!isValidPrice(inputPerM) || !isValidPrice(outputPerM) || !isValidSizeString(contextWindow) || !isValidSizeString(maxOutput)) {
    return { ok: false, reason: 'invalid or incomplete fields in response' };
  }
  return { ok: true, inputPerM, outputPerM, contextWindow: String(contextWindow).trim(), maxOutput: String(maxOutput).trim() };
}

// Same formula as the rest of the app already assumes for this field
// (verified against every existing seed-data row before this was written).
function computeEstPerRound(inputPerM, outputPerM, tokensPerRound) {
  const inTok  = (tokensPerRound && tokensPerRound.input)  || 5000;
  const outTok = (tokensPerRound && tokensPerRound.output) || 2000;
  const est = (inputPerM / 1e6) * inTok + (outputPerM / 1e6) * outTok;
  return Math.round(est * 1000) / 1000;
}

async function refreshPricing(env) {
  const apiKey = env.PERPLEXITY_API_KEY;
  if (!apiKey) return; // not configured yet — manual KV updates keep working unaffected

  const currentRaw = await env.PRICING_DATA.get('latest');
  if (!currentRaw) return; // KV not seeded yet, nothing to refresh against

  let current;
  try { current = JSON.parse(currentRaw); } catch (e) { return; }
  if (!current || !Array.isArray(current.providers)) return;

  const results = await Promise.allSettled(current.providers.map(p => researchProvider(p, apiKey)));

  const nextProviders = [];
  const changes = [];
  current.providers.forEach((p, i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.ok) {
      const { inputPerM, outputPerM, contextWindow, maxOutput } = r.value;
      const priceMoved = inputPerM !== p.inputPerM || outputPerM !== p.outputPerM;
      nextProviders.push({
        ...p,
        inputPerM, outputPerM, contextWindow, maxOutput,
        estPerRound: computeEstPerRound(inputPerM, outputPerM, current.tokensPerRound)
      });
      changes.push({ id: p.id, status: priceMoved ? 'updated' : 'confirmed' });
    } else {
      nextProviders.push(p);
      const reason = r.status === 'fulfilled' ? r.value.reason : String(r.reason && r.reason.message || r.reason);
      changes.push({ id: p.id, status: 'retained', reason });
    }
  });

  await env.PRICING_DATA.put(PREVIOUS_KEY, currentRaw);

  const next = { ...current, lastUpdated: new Date().toISOString(), providers: nextProviders };
  await env.PRICING_DATA.put('latest', JSON.stringify(next));

  let log = [];
  const logRaw = await env.PRICING_DATA.get(RUN_LOG_KEY);
  if (logRaw) { try { log = JSON.parse(logRaw) || []; } catch (e) { log = []; } }
  log.unshift({ ts: next.lastUpdated, changes });
  await env.PRICING_DATA.put(RUN_LOG_KEY, JSON.stringify(log.slice(0, MAX_LOG_ENTRIES)));
}

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
      let log = [];
      const logRaw = await env.PRICING_DATA.get(RUN_LOG_KEY);
      if (logRaw) { try { log = JSON.parse(logRaw) || []; } catch (e) { log = []; } }
      return new Response(buildStatusHtml(log), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS }
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },

  // Weekly cron (see wrangler.toml [triggers]). ctx.waitUntil keeps the
  // invocation alive past the trigger's own return so the 9 provider
  // lookups + KV writes can finish even though nothing is "waiting" on
  // the response the way a fetch handler's caller would.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshPricing(env));
  }
};
