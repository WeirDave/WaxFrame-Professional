// ============================================================
//  WaxFrame — pricing Worker
//  Build: 20260801-001
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
//  v3.63.413 — Two guardrails added after a real dry-run test caught a
//  gap: the original validation (complete + well-formed fields) let a
//  fully-formed but WRONG answer through untouched — Perplexity returned
//  a complete, validating price for Mistral that turned out to be a
//  different model tier than the one asked for, confirmed wrong against
//  Mistral's own pricing page. Neither guardrail below is foolproof, but
//  together they'd have caught that specific failure:
//    1. Source citation. The prompt now requires a `source` URL field;
//       the response is rejected unless that URL's hostname matches the
//       provider's own official domain (SOURCE_DOMAINS below). Doesn't
//       prove the number is right, but a same-provider-family tier mix-up
//       is far more likely to cite a different page than the one for the
//       exact model asked about.
//    2. Delta threshold. Even with a valid, correctly-sourced answer, if
//       inputPerM or outputPerM moves more than DELTA_THRESHOLD (40%)
//       from the current value, the change is held as `flagged` instead
//       of applied — old value stays live, the proposed new value is
//       recorded in the run log for a human to glance at. Real price
//       cuts that large do happen occasionally, but that's also exactly
//       the shape of a tier-mismatch error, so it's worth a human's eyes
//       either way rather than auto-publishing unattended.
//
//  Safety: any provider whose response fails to parse, fails validation
//  (non-numeric/negative price, malformed size string, wrong-domain
//  source), or trips the delta threshold keeps its PREVIOUS values
//  untouched — never overwritten with a guess. The prior full payload is
//  also kept under KV key `previous` as a one-step rollback. Every run
//  appends a compact entry to KV key `run-log` (last 10 kept) showing
//  which providers were updated/confirmed/flagged/retained-and-why —
//  rendered on the `/` status page so a human can glance at it before
//  trusting the number, e.g. before a demo.
//
//  Requires a `PERPLEXITY_API_KEY` Worker secret:
//    wrangler secret put PERPLEXITY_API_KEY
//  If unset, refreshPricing() is a silent no-op — manual KV updates keep
//  working exactly as before, the page never breaks either way.
//
//  v3.63.413 follow-up — email alerts. The run-log/status-page mechanism
//  above is pull (you have to remember to check it), which recreates the
//  exact problem this whole feature exists to fix. A `send_email` binding
//  (Cloudflare Email Routing — see wrangler.toml [[send_email]]) pushes an
//  email to David whenever a run has something worth a human look:
//    - the whole run throws (KV unreachable, catastrophic failure)
//    - any provider gets `flagged` this run (valid + sourced but the price
//      swung past DELTA_THRESHOLD)
//    - a provider that succeeded (updated/confirmed) on the PREVIOUS run
//      now can't be read at all — the "their page probably changed" signal
//    - a provider's price actually moved and was auto-applied (v3.63.422,
//      see below — previously silent whenever the swing landed under
//      DELTA_THRESHOLD, which is exactly how a wrong-but-plausible answer
//      gets through undetected)
//  Deliberately does NOT email on routine `retained` (a handful of
//  providers — Gemini free tier, Together, Grok — consistently come back
//  incomplete most runs; that's expected LLM behavior, not a fault) or on
//  `confirmed` (price genuinely unchanged — nothing to look at).
//  Emailing on every retained would just be noise David learns to ignore.
//
//  v3.63.422 — Two guardrails added after Claude's live price silently
//  drifted to the wrong number: a prior scheduled run got back $2/$10 for
//  claude-sonnet-4-6 (confirmed against Anthropic's own docs to actually be
//  claude-sonnet-5's INTRODUCTORY rate, a different model entirely) — a
//  ~33% swing on each field, under DELTA_THRESHOLD, so it auto-applied with
//  no flag and no email. Caught only by manual reconciliation weeks later.
//    1. Alert on every applied price change, not just flagged ones (see
//       above) — the delta threshold is a REVIEW gate for big swings, it
//       was never meant to also be the ALERT gate for small ones. Small
//       wrong answers need eyes just as much as big ones; they just don't
//       need to block auto-apply while waiting for those eyes.
//    2. Model-version confirmation. buildResearchPrompt() now requires a
//       `confirmedModel` field — the exact model name/version as it
//       literally appears on the source page — and explicitly warns about
//       introductory/promotional rates and sibling model-family tiers.
//       researchProvider() rejects (falls back to `retained`, same path as
//       a missing price) any response that doesn't include it. This won't
//       catch every tier mix-up, but it forces an affirmative claim instead
//       of a silent guess, which is what actually failed here — Perplexity
//       answered for "Claude Sonnet" generically instead of confirming the
//       specific 4.6 release the source page named.
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

// From-address just needs to be a valid-looking address on a domain
// Email Routing controls (waxframe.com) — it isn't a real receivable
// mailbox, nothing needs to route TO it.
const ALERT_FROM = 'pricing-worker@waxframe.com';
const ALERT_TO   = 'weirdave@aol.com';

// v3.63.413 — a response is only trusted if its cited source URL's
// hostname matches (or is a subdomain of) one of these per-provider
// official domains. Deliberately generous within a provider (docs/
// console/dashboard/app subdomains all count) but strict across
// providers — the whole point is catching "right provider, wrong page".
const SOURCE_DOMAINS = {
  'gemini-free':  ['google.dev', 'google.com'],
  'gemini-paid':  ['google.dev', 'google.com'],
  'grok':         ['x.ai'],
  'deepseek':     ['deepseek.com'],
  'together':     ['together.ai', 'together.xyz'],
  'mistral':      ['mistral.ai'],
  'chatgpt':      ['openai.com'],
  'cohere':       ['cohere.com'],
  'claude':       ['anthropic.com', 'claude.com'],
  'perplexity':   ['perplexity.ai']
};

// Relative price movement beyond this on EITHER inputPerM or outputPerM
// holds the change for manual review instead of auto-applying it.
const DELTA_THRESHOLD = 0.40;

function hostnameMatchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith('.' + domain);
}

function isTrustedSource(providerId, sourceUrl) {
  const allowed = SOURCE_DOMAINS[providerId];
  if (!allowed || !allowed.length) return true; // no allowlist configured — don't block
  if (typeof sourceUrl !== 'string' || !sourceUrl) return false;
  let hostname;
  try { hostname = new URL(sourceUrl).hostname.toLowerCase(); } catch (e) { return false; }
  return allowed.some(d => hostnameMatchesDomain(hostname, d));
}

function relativeDelta(oldVal, newVal) {
  if (!(oldVal > 0)) return newVal === oldVal ? 0 : Infinity; // old was 0 (free tier) — any nonzero new value is an infinite relative jump, correctly always flagged
  return Math.abs(newVal - oldVal) / oldVal;
}

function buildStatusHtml(log) {
  const rows = (log || []).map(entry => {
    const items = (entry.changes || []).map(c => {
      const label = c.status === 'updated' ? `<strong style="color:#0a7d2c">${c.id}: updated</strong> — ${c.reason || ''}`
        : c.status === 'confirmed' ? `${c.id}: confirmed unchanged`
        : c.status === 'flagged' ? `<strong style="color:#b3261e">${c.id}: flagged for review</strong> — ${c.reason || 'large price delta'}`
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
{"inputPerM": <number, USD per 1M input tokens, or null if you cannot verify it from an authoritative current source>, "outputPerM": <number, USD per 1M output tokens, or null>, "contextWindow": <string like "1M" or "256K", or null>, "maxOutput": <string like "8K", or null>, "source": <string, the exact URL of the official page you found this pricing on, or null>, "confirmedModel": <string, the exact model name/version EXACTLY as written on the source page next to the price you're reporting, or null if the page doesn't clearly label it>}

The "source" URL MUST be a page on the provider's own official domain — not a third-party aggregator, comparison site, or news article. Do not guess or estimate any field you cannot verify — return null for it instead.

IMPORTANT — this model family may have multiple pricing rows that look similar: different version numbers, an introductory/promotional rate that later reverts to a higher standard rate, or different size tiers (mini/nano/pro/flash/etc). Make sure the price you report is for EXACTLY "${provider.model}" and not a sibling row. If the page shows both an introductory and a standard rate for this exact model, report whichever is CURRENTLY active today. If you are not fully certain the price and "confirmedModel" you're returning both refer to exactly this model, return null for inputPerM and outputPerM rather than guessing.`;
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

  // v3.63.413 follow-up: inputPerM/outputPerM (the actual PRICE — the
  // entire point of this feature) are hard-required. contextWindow and
  // maxOutput are real-world unreliable — Perplexity frequently nails the
  // price and cites a solid source but comes back null on max-output-
  // tokens specifically, since it's a less consistently published number
  // than $/M pricing. Requiring all four as a block meant this feature
  // would near-never successfully update anything in practice (confirmed
  // against live test runs). So: price + trusted source gate the whole
  // response; contextWindow/maxOutput are independently optional and
  // fall back to the provider's existing value when unconfirmed, rather
  // than vetoing an otherwise-good price update.
  const { inputPerM, outputPerM, contextWindow, maxOutput, source, confirmedModel } = parsed;
  if (!isValidPrice(inputPerM) || !isValidPrice(outputPerM)) {
    return { ok: false, reason: 'invalid or missing price fields in response' };
  }
  if (!isTrustedSource(provider.id, source)) {
    return { ok: false, reason: `untrusted or missing source (got: ${source || 'none'})` };
  }
  // v3.63.422 — require an affirmative model-version claim rather than
  // trusting that a valid price + valid source means it's for the right
  // model. Doesn't string-match it (naming conventions vary too much
  // across providers to do that reliably); just refuses to auto-apply a
  // price the model wasn't willing to explicitly attribute to a specific
  // version, since a confident guess and an unconfirmed one look identical
  // in the JSON otherwise.
  if (typeof confirmedModel !== 'string' || !confirmedModel.trim()) {
    return { ok: false, reason: 'no confirmed model-version attribution in response' };
  }
  return {
    ok: true, inputPerM, outputPerM, source, confirmedModel: confirmedModel.trim(),
    contextWindow: isValidSizeString(contextWindow) ? String(contextWindow).trim() : null,
    maxOutput: isValidSizeString(maxOutput) ? String(maxOutput).trim() : null
  };
}

// Hand-rolled raw RFC5322 message — deliberately no mimetext/nodemailer
// dependency, matches this project's no-build-step, no-npm-deps stance
// everywhere else. A plain-text alert email doesn't need more than this.
function buildRawEmail(subject, bodyLines) {
  const body = bodyLines.join('\r\n');
  return [
    `From: WaxFrame Pricing Worker <${ALERT_FROM}>`,
    `To: ${ALERT_TO}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');
}

async function sendAlertEmail(env, subject, bodyLines) {
  if (!env.PRICING_ALERTS) return; // send_email binding not configured — don't block the run over it
  try {
    const { EmailMessage } = await import('cloudflare:email');
    const raw = buildRawEmail(subject, bodyLines);
    await env.PRICING_ALERTS.send(new EmailMessage(ALERT_FROM, ALERT_TO, raw));
  } catch (e) {
    // Email is a nice-to-have alert channel, not the source of truth (the
    // run-log/status page is) — a failure to send shouldn't be treated as
    // a refreshPricing() failure. Nothing else to do here; there's no
    // second alert channel to report an alert-channel failure to.
  }
}

// Same formula as the rest of the app already assumes for this field
// (verified against every existing seed-data row before this was written).
function computeEstPerRound(inputPerM, outputPerM, tokensPerRound) {
  const inTok  = (tokensPerRound && tokensPerRound.input)  || 5000;
  const outTok = (tokensPerRound && tokensPerRound.output) || 2000;
  const est = (inputPerM / 1e6) * inTok + (outputPerM / 1e6) * outTok;
  return Math.round(est * 1000) / 1000;
}

const LIVENESS_ALERT_KEY  = 'liveness-alert-sent';
const LIVENESS_STALE_DAYS = 9; // weekly cadence (7 days) + 2-day buffer before alerting

// v3.63.415 — The email-alert system above fires when a scheduled run
// finds something wrong. It CANNOT fire if the cron simply never triggers
// at all (disabled, misconfigured, account issue) — no run means nothing
// to alert on, so pricing could silently revert to fully-manual with zero
// symptom. This runs on a SEPARATE, more frequent cron (daily — see
// wrangler.toml) and checks the run-log's own timestamp for staleness,
// independent of whether refreshPricing() itself is even executing.
async function checkCronLiveness(env) {
  let log = [];
  const logRaw = await env.PRICING_DATA.get(RUN_LOG_KEY);
  if (logRaw) { try { log = JSON.parse(logRaw) || []; } catch (e) { log = []; } }
  if (!log.length) return; // no runs yet (fresh deploy) — nothing to judge staleness against

  const lastRunMs = new Date(log[0].ts).getTime();
  if (!isFinite(lastRunMs)) return;
  const daysSince = (Date.now() - lastRunMs) / 86400000;

  const alertSentAt = await env.PRICING_DATA.get(LIVENESS_ALERT_KEY);
  if (daysSince > LIVENESS_STALE_DAYS) {
    if (!alertSentAt) {
      // Fires once per staleness episode, not once per day it stays stale —
      // the flag below prevents repeat alerts until a fresh run clears it.
      await sendAlertEmail(env, 'WaxFrame pricing refresh — weekly cron has not run', [
        `The weekly pricing refresh hasn't run in ${daysSince.toFixed(1)} days (last run: ${log[0].ts}).`,
        '',
        'This is different from a run that fired and found a problem (that',
        'alerts separately) — this means the cron trigger itself may be',
        'disabled, misconfigured, or hitting an account-level issue. Check',
        'Workers & Pages > waxframe-pricing > Settings > Trigger events in',
        'the Cloudflare dashboard for the real "Next" scheduled time.',
        '',
        'This alert will not repeat until a fresh run happens and then goes',
        'stale again.'
      ]);
      await env.PRICING_DATA.put(LIVENESS_ALERT_KEY, new Date().toISOString());
    }
  } else if (alertSentAt) {
    await env.PRICING_DATA.delete(LIVENESS_ALERT_KEY);
  }
}

async function refreshPricing(env) {
  const apiKey = env.PERPLEXITY_API_KEY;
  if (!apiKey) return; // not configured yet — manual KV updates keep working unaffected

  try {
    const currentRaw = await env.PRICING_DATA.get('latest');
    if (!currentRaw) return; // KV not seeded yet, nothing to refresh against

    let current;
    try { current = JSON.parse(currentRaw); } catch (e) { return; }
    if (!current || !Array.isArray(current.providers)) return;

    // Prior run's per-provider status, read BEFORE this run's entry is
    // pushed, so "was this provider OK last time" reflects the run before
    // this one, not this one.
    let log = [];
    const logRaw = await env.PRICING_DATA.get(RUN_LOG_KEY);
    if (logRaw) { try { log = JSON.parse(logRaw) || []; } catch (e) { log = []; } }
    const prevStatusById = {};
    if (log[0] && Array.isArray(log[0].changes)) {
      log[0].changes.forEach(c => { prevStatusById[c.id] = c.status; });
    }
    const wasHealthy = status => status === 'updated' || status === 'confirmed';

    const results = await Promise.allSettled(current.providers.map(p => researchProvider(p, apiKey)));

    const nextProviders = [];
    const changes = [];
    const alertLines = [];
    current.providers.forEach((p, i) => {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value.ok) {
        const { inputPerM, outputPerM, contextWindow, maxOutput, source, confirmedModel } = r.value;
        const inDelta  = relativeDelta(p.inputPerM, inputPerM);
        const outDelta = relativeDelta(p.outputPerM, outputPerM);
        if (inDelta > DELTA_THRESHOLD || outDelta > DELTA_THRESHOLD) {
          // Valid, well-sourced answer — but the swing is big enough to hold
          // for a human look rather than auto-apply. Old values stay live.
          const reason = `proposed $${inputPerM}/$${outputPerM} per M (was $${p.inputPerM}/$${p.outputPerM}) — confirmed as "${confirmedModel}" — ${source || 'no source'}`;
          nextProviders.push(p);
          changes.push({ id: p.id, status: 'flagged', reason });
          alertLines.push(`FLAGGED  ${p.id} (${p.name}): ${reason}`);
          return;
        }
        const priceMoved = inputPerM !== p.inputPerM || outputPerM !== p.outputPerM;
        nextProviders.push({
          ...p,
          inputPerM, outputPerM,
          contextWindow: contextWindow || p.contextWindow, // Perplexity often can't confirm this even when price+source are solid — keep old rather than block the price update
          maxOutput: maxOutput || p.maxOutput,
          estPerRound: computeEstPerRound(inputPerM, outputPerM, current.tokensPerRound)
        });
        if (priceMoved) {
          // v3.63.422 — previously silent whenever the swing landed under
          // DELTA_THRESHOLD. That's exactly how the Claude introductory-
          // rate mix-up went unnoticed for weeks. Every applied price
          // change now gets a line in the email, not just the big ones.
          const reason = `$${inputPerM}/$${outputPerM} per M (was $${p.inputPerM}/$${p.outputPerM}) — confirmed as "${confirmedModel}" — ${source || 'no source'}`;
          changes.push({ id: p.id, status: 'updated', reason });
          alertLines.push(`UPDATED  ${p.id} (${p.name}): ${reason}`);
        } else {
          changes.push({ id: p.id, status: 'confirmed' });
        }
      } else {
        nextProviders.push(p);
        const reason = r.status === 'fulfilled' ? r.value.reason : String(r.reason && r.reason.message || r.reason);
        changes.push({ id: p.id, status: 'retained', reason });
        // Only alert-worthy if this provider was working last run and
        // isn't now — a provider that's ALWAYS incomplete (Gemini free
        // tier, Together, Grok in practice) is expected, not a regression.
        if (wasHealthy(prevStatusById[p.id])) {
          alertLines.push(`NEWLY FAILING  ${p.id} (${p.name}): was OK last run, now: ${reason}`);
        }
      }
    });

    await env.PRICING_DATA.put(PREVIOUS_KEY, currentRaw);

    const next = { ...current, lastUpdated: new Date().toISOString(), providers: nextProviders };
    await env.PRICING_DATA.put('latest', JSON.stringify(next));

    log.unshift({ ts: next.lastUpdated, changes });
    await env.PRICING_DATA.put(RUN_LOG_KEY, JSON.stringify(log.slice(0, MAX_LOG_ENTRIES)));

    if (alertLines.length) {
      await sendAlertEmail(env, `WaxFrame pricing refresh — ${alertLines.length} item(s) need a look`, [
        `Run at ${next.lastUpdated}:`,
        '',
        ...alertLines,
        '',
        `Full log: https://waxframe-pricing.weirdave.workers.dev/`
      ]);
    }
  } catch (e) {
    await sendAlertEmail(env, 'WaxFrame pricing refresh FAILED', [
      `The scheduled pricing refresh threw an unhandled error at ${new Date().toISOString()}:`,
      '',
      String(e && e.stack || e),
      '',
      'Live pricing data is unaffected (this run made no writes) — manual',
      'wrangler kv key put still works as a fallback. See tools/pricing-worker/README.md.'
    ]);
    throw e; // still surface in Cloudflare's own cron-event log
  }
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

  // Two cron patterns share this handler (see wrangler.toml [triggers]):
  // the weekly refresh, and a daily liveness check that verifies the
  // weekly one is actually still firing (see checkCronLiveness header
  // comment for why that needs a separate trigger). event.cron carries
  // which pattern matched. ctx.waitUntil keeps the invocation alive past
  // the trigger's own return so the async work can finish even though
  // nothing is "waiting" on the response the way a fetch handler's caller
  // would.
  async scheduled(event, env, ctx) {
    if (event.cron === '0 13 * * *') {
      ctx.waitUntil(checkCronLiveness(env));
    } else {
      ctx.waitUntil(refreshPricing(env));
    }
  }
};
