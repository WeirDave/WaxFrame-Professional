// ============================================================
//  WaxFrame — pricing Worker
//  Build: 20260809-001
//  Author: WeirDave (R David Paine III) | License: AGPL-3.0
//  GitHub: github.com/WeirDave/WaxFrame-Professional
//
//  Serves ai-api-pricing.html's data layer from Cloudflare KV
//  so pricing can be refreshed without redeploying the site.
//  KV key:  `latest`
//  Value:   JSON matching the schema in data/pricing-seed.json
//           (schemaVersion 3 — each provider carries a `models[]`
//           array covering every model WaxFrame curates for that
//           provider in js/provider-catalog.js, not just the default)
//
//  Endpoint:
//    GET /api/pricing  -> { lastUpdated, providers: [...] }
//    GET /             -> status page (HTML) + recent scheduled-refresh log
//
//  Manual pricing update (still supported, still the source of truth for
//  prose fields — rate-limit notes, recommendation copy, billing URLs, and
//  for actually APPLYING a reviewed price proposal — see below):
//    wrangler kv key put --binding=PRICING_DATA latest --path=../data/pricing-seed.json --remote
//
//  v3.63.412 — Scheduled numeric-pricing refresh. A weekly cron trigger
//  (Sundays 12:00 UTC — see wrangler.toml [triggers]; Cloudflare's cron
//  day-of-week field counts differently than assumed on first pass, this
//  is the corrected label) calls refreshPricing(), which asks
//  Perplexity Sonar (web-grounded, so answers are anchored to a live
//  search rather than training-data recall) for CURRENT pricing. Scope is
//  deliberately narrow: only numeric pricing fields move automatically.
//  Prose fields (rateLimitNotes, recommendationNote, billingUrl, freeTier,
//  tier1Rpm/Tpm) stay human-curated — editorial judgment and exact-URL
//  correctness aren't things to hand to a scheduled LLM call.
//
//  v3.63.413 — Two guardrails: a `source` URL is required and must match
//  the provider's own official domain (SOURCE_DOMAINS below); Perplexity's
//  response must be well-formed (valid numeric prices).
//
//  v3.63.422 — `confirmedModel` required (the exact model name/version as
//  written on the source page) after a scheduled run once returned a
//  fully-formed, correctly-sourced, plausible price for claude-sonnet-4-6
//  that was actually claude-sonnet-5's introductory rate — a different
//  model, caught only by manual reconciliation weeks later. This doesn't
//  string-match confirmedModel against the requested model id (naming
//  conventions vary too much across providers to do that reliably); it
//  just refuses to auto-apply a price Sonar wasn't willing to explicitly
//  attribute to a specific version.
//
//  v3.63.437 — REVIEW-BEFORE-PUBLISH, and per-model instead of
//  per-provider-default. Two changes prompted by a closer look at the
//  confirmedModel guardrail above: it reduces the risk of a tier/version
//  mix-up, it doesn't eliminate it, since the returned confirmedModel is
//  never compared against the requested model id. The previous design
//  also auto-applied any price move under a 40%-delta threshold — which
//  is exactly the shape the claude-sonnet-4-6/sonnet-5 mix-up took (a
//  ~33% swing, under threshold, auto-applied with no review). So:
//    1. Every provider's CURATED MODEL LIST (not just its default) is now
//       tracked — pulled 1:1 from js/provider-catalog.js's `fallback`
//       arrays (see tools/check-pricing-coverage.mjs for the drift check
//       that keeps them in sync). A model with no known price still gets
//       a row, status `needs-verification` — it's never silently absent.
//    2. ANY changed or first-time price is now held for human review
//       instead of auto-applied, no matter how small the delta. The old
//       verified value (or `needs-verification` null) stays live in KV
//       untouched; the proposed number lives only in the structured
//       run-log entry (providerId, modelId, requestedModel, confirmedModel,
//       old/proposed inputPerM+outputPerM, sourceUrl, timestamp) and in
//       the alert email. Applying a reviewed proposal is still the
//       existing manual step: hand-edit data/pricing-seed.json and
//       `wrangler kv key put ... --remote`. No candidate/promotion KV
//       service was added — the run-log already carries everything a
//       human needs to review and apply by hand.
//    3. Research calls now run per-model, not per-provider-default —
//       35-40 model rows instead of ~10 provider rows. A small
//       concurrency cap (mapWithConcurrency, 4 at a time) replaces the
//       unbounded Promise.allSettled fan-out to stay polite to Perplexity.
//
//  Safety: any provider/model whose response fails to parse, fails
//  validation (non-numeric/negative price, malformed size string, wrong-
//  domain source, missing confirmedModel), keeps its PREVIOUS values
//  untouched — never overwritten with a guess. The prior full payload is
//  also kept under KV key `previous` as a one-step rollback. Every run
//  appends a compact entry to KV key `run-log` (last 10 kept) showing
//  which provider/model rows were confirmed/needs-review/retained-and-why
//  — rendered on the `/` status page so a human can glance at it before
//  trusting a number, e.g. before a demo, and before manually applying any
//  needs-review proposal.
//
//  Requires a `PERPLEXITY_API_KEY` Worker secret:
//    wrangler secret put PERPLEXITY_API_KEY
//  If unset, refreshPricing() is a silent no-op — manual KV updates keep
//  working exactly as before, the page never breaks either way.
//
//  Email alerts. The run-log/status-page mechanism above is pull (you have
//  to remember to check it). A `send_email` binding (Cloudflare Email
//  Routing — see wrangler.toml [[send_email]]) pushes an email to David
//  whenever a run has something worth a human look:
//    - the whole run throws (KV unreachable, catastrophic failure)
//    - any provider/model needs review this run (changed or first-time
//      price, valid + sourced + model-confirmed but held rather than
//      applied)
//    - a provider/model that succeeded (confirmed/needs-review) on the
//      PREVIOUS run now can't be read at all — the "their page probably
//      changed" signal
//  Deliberately does NOT email on routine `retained` for rows that
//  consistently come back incomplete (Gemini free tier's non-default
//  models, Together, Grok in practice — expected LLM behavior, not a
//  fault) or on `confirmed` (price genuinely unchanged — nothing to look
//  at). Emailing on every retained/confirmed would just be noise David
//  learns to ignore.
//
//  Build 20260809-001 — SOURCE CORROBORATION. Prompted by two real
//  needs-review proposals in one run that didn't hold up on manual check:
//  Sonar cited docs.cohere.com/docs/command-a as the source for a price,
//  but that page has no pricing on it at all; separately it reported a
//  price for "ministral-8b-latest" that actually belonged to its 3B
//  sibling. The confirmedModel guardrail (build history above) reduces
//  version mix-ups but was never designed to catch a source citation that
//  simply doesn't contain the number it's credited with.
//
//  Every `needs-review` proposal (changed or first-time price only — never
//  routine `confirmed`/`retained` rows, so this doesn't add cost to a
//  normal run) now gets its cited sourceUrl fetched server-side and
//  scanned for the proposed inputPerM/outputPerM numbers
//  (corroborateProposal / corroboratesSource below). Three outcomes:
//    - both numbers found on the page  -> stays `needs-review`, unchanged
//    - page fetched fine but the numbers AREN'T on it -> downgraded to
//      `unverified-source`, alert line reprefixed from "NEEDS REVIEW" to
//      "UNVERIFIED SOURCE" so the email makes the distinction obvious
//    - fetch fails or returns too little text to judge (common for
//      JS-rendered pricing pages that need a browser to hydrate — Cohere's
//      own marketing pricing page gave three different scraped readings
//      across three manual fetches in the incident that prompted this) ->
//      INCONCLUSIVE, left as ordinary `needs-review`. A site being hard to
//      scrape server-side is not evidence the price is wrong, and treating
//      it as such would flag most JS-heavy provider pages every single
//      week — pure noise. This check only ever adds confidence signal on
//      top of `needs-review`; it never manufactures false alarms out of a
//      fetch failure.
//  The live model value in KV is never touched either way — same as any
//  other needs-review row, this only changes what the human sees before
//  deciding whether to trust it.
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
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

// v3.63.437 — how many researchModel() calls run at once. 35-40 tracked
// models (up from ~10 provider-default rows) against a single external API
// warrants a cap instead of firing every request simultaneously.
const RESEARCH_CONCURRENCY = 4;

// From-address just needs to be a valid-looking address on a domain
// Email Routing controls (waxframe.com) — it isn't a real receivable
// mailbox, nothing needs to route TO it.
const ALERT_FROM = 'pricing-worker@waxframe.com';

function isSafeEmailAddress(value) {
  return typeof value === 'string' &&
    value.length <= 254 &&
    !/[\r\n]/.test(value) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function buildStatusHtml(log) {
  const rows = (log || []).map(entry => {
    const items = (entry.changes || []).map(c => {
      const label = `${escapeHtml(c.providerId)}/${escapeHtml(c.modelId)}`;
      const reason = escapeHtml(c.reason || '');
      const style = c.status === 'unverified-source' ? `<strong style="color:#b3261e">${label}: needs review — UNVERIFIED SOURCE</strong> — ${reason}`
        : c.status === 'needs-review' ? `<strong style="color:#b3261e">${label}: needs review</strong> — ${reason}`
        : c.status === 'confirmed' ? `${label}: confirmed unchanged`
        : `<span style="color:#a15c00">${label}: retained old value (${reason || 'unknown reason'})</span>`;
      return `<li>${style}</li>`;
    }).join('');
    return `<details><summary>${escapeHtml(entry.ts)}</summary><ul>${items}</ul></details>`;
  }).join('') || '<p>No scheduled refresh has run yet.</p>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>WaxFrame Pricing Worker</title><style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#222;background:#fafafa}code{background:#eee;padding:.1rem .3rem;border-radius:3px}a{color:#0366d6}details{margin-bottom:.5rem}summary{cursor:pointer;font-weight:600}</style></head><body><h1>WaxFrame Pricing Worker</h1><p>Live data endpoint: <code><a href="/api/pricing">/api/pricing</a></code></p><p>Source: <a href="https://github.com/WeirDave/WaxFrame-Professional/tree/main/tools/pricing-worker">github.com/WeirDave/WaxFrame-Professional</a></p><h2>Scheduled refresh log</h2>${rows}</body></html>`;
}

function buildResearchPrompt(provider, model) {
  const tierNote = provider.id === 'gemini-free'
    ? ' This is Google AI Studio’s FREE tier — confirm pricing is still $0 per token, or note if the free tier has been discontinued or changed.'
    : provider.id === 'gemini-paid'
    ? ' This is the PAID tier, not the free tier.'
    : '';
  return `For the AI API provider "${provider.name}", model "${model.id}": look up the CURRENT, officially published API pricing as of today from the provider's own pricing/billing documentation.${tierNote}

Return ONLY a compact JSON object, no markdown, no explanation, no extra text:
{"inputPerM": <number, USD per 1M input tokens, or null if you cannot verify it from an authoritative current source>, "outputPerM": <number, USD per 1M output tokens, or null>, "contextWindow": <string like "1M" or "256K", or null>, "maxOutput": <string like "8K", or null>, "source": <string, the exact URL of the official page you found this pricing on, or null>, "confirmedModel": <string, the exact model name/version EXACTLY as written on the source page next to the price you're reporting, or null if the page doesn't clearly label it>}

The "source" URL MUST be a page on the provider's own official domain — not a third-party aggregator, comparison site, or news article. Do not guess or estimate any field you cannot verify — return null for it instead.

IMPORTANT — this model family may have multiple pricing rows that look similar: different version numbers, an introductory/promotional rate that later reverts to a higher standard rate, or different size tiers (mini/nano/pro/flash/etc). Make sure the price you report is for EXACTLY "${model.id}" and not a sibling row. If the page shows both an introductory and a standard rate for this exact model, report whichever is CURRENTLY active today. If you are not fully certain the price and "confirmedModel" you're returning both refer to exactly this model, return null for inputPerM and outputPerM rather than guessing.`;
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

async function researchModel(provider, model, apiKey) {
  let resp;
  try {
    resp = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: buildResearchPrompt(provider, model) }]
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

  const { inputPerM, outputPerM, contextWindow, maxOutput, source, confirmedModel } = parsed;
  if (!isValidPrice(inputPerM) || !isValidPrice(outputPerM)) {
    return { ok: false, reason: 'invalid or missing price fields in response' };
  }
  if (!isTrustedSource(provider.id, source)) {
    return { ok: false, reason: `untrusted or missing source (got: ${source || 'none'})` };
  }
  if (typeof confirmedModel !== 'string' || !confirmedModel.trim()) {
    return { ok: false, reason: 'no confirmed model-version attribution in response' };
  }
  return {
    ok: true, inputPerM, outputPerM, source, confirmedModel: confirmedModel.trim(),
    contextWindow: isValidSizeString(contextWindow) ? String(contextWindow).trim() : null,
    maxOutput: isValidSizeString(maxOutput) ? String(maxOutput).trim() : null
  };
}

// ── Source corroboration (Build 20260809-001) ───────────────────────
// A `needs-review` proposal names a sourceUrl on the provider's own
// domain (isTrustedSource above already checked that), but nothing until
// now checked that the page at that URL actually contains the price it's
// credited with. corroboratesSource is the pure, testable half: given
// already-fetched page text and the two proposed numbers, does the text
// contain both? Returns true/false, or null if there isn't enough text to
// judge fairly (too short to be a real rendered page — see MIN_TEXT_LEN).
const MIN_CORROBORATION_TEXT_LEN = 200;

function priceTextVariants(n) {
  const raw = String(n);
  // Never round below the number's own precision — toFixed(0) on 0.6 gives
  // "1", a single generic digit that false-matches almost any page (this
  // is exactly what the first version of this function got wrong: it
  // matched "1" against "1M tokens" and corroborated a price that wasn't
  // actually on the page). Only widen toward MORE trailing-zero precision.
  const minDecimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  const variants = new Set([raw]);
  for (let decimals = minDecimals; decimals <= 4; decimals++) variants.add(n.toFixed(decimals));
  return Array.from(variants);
}

function corroboratesSource(pageText, inputPerM, outputPerM) {
  if (typeof pageText !== 'string' || pageText.length < MIN_CORROBORATION_TEXT_LEN) return null;
  const normalized = pageText.replace(/[$,]/g, '');
  const inputFound = priceTextVariants(inputPerM).some(v => normalized.includes(v));
  const outputFound = priceTextVariants(outputPerM).some(v => normalized.includes(v));
  return inputFound && outputFound;
}

// Crude HTML-to-text: strips script/style blocks and tags, collapses
// whitespace. Good enough to find a "$0.15" or "0.15" substring in a
// server-rendered page; a JS-hydrated page will just come back short and
// fall through the MIN_CORROBORATION_TEXT_LEN guard into "inconclusive"
// rather than a false "unverified" — see the build-header note on why
// that's the deliberate choice, not an oversight.
async function fetchSourcePageText(sourceUrl) {
  try {
    const resp = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaxFramePricingBot/1.0; +https://waxframe.com)' }
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    return null;
  }
}

// true = corroborated, false = fetched fine but numbers absent (real
// signal), null = inconclusive (fetch failed or too little text) — see
// corroboratesSource. Network-touching, so deliberately kept separate
// from the pure decideModelUpdate() path; only called for needs-review
// proposals in refreshPricing() below, never for confirmed/retained rows.
async function corroborateProposal(sourceUrl, inputPerM, outputPerM) {
  const text = await fetchSourcePageText(sourceUrl);
  return corroboratesSource(text, inputPerM, outputPerM);
}

// ── decideModelUpdate ────────────────────────────────────────────────
// Pure function: (provider, model, researchOutcome, wasHealthyLastRun,
// nowIso) -> { nextModel, change, alertLine }. No KV/network access, so
// tools/pricing-worker/test-refresh-logic.mjs can exercise every branch
// without touching Cloudflare or Perplexity. This is the v3.63.437
// review-gate: a changed or first-time price NEVER lands in nextModel —
// it only appears in `change` (the structured run-log/proposal record).
// Only a genuinely-unchanged confirmed price refreshes the live model
// (and only its verifiedAt/contextWindow/maxOutput, never its price).
function decideModelUpdate(provider, model, result, wasHealthyLastRun, nowIso) {
  const label = `${provider.id}/${model.id}`;

  if (!result.ok) {
    return {
      nextModel: model,
      change: { providerId: provider.id, modelId: model.id, requestedModel: model.id, status: 'retained', reason: result.reason, ts: nowIso },
      alertLine: wasHealthyLastRun ? `NEWLY FAILING  ${label} (${provider.name}): was OK last run, now: ${result.reason}` : null
    };
  }

  const { inputPerM, outputPerM, contextWindow, maxOutput, source, confirmedModel } = result;
  const hadPrice = isValidPrice(model.inputPerM) && isValidPrice(model.outputPerM);

  if (!hadPrice) {
    // First price ever found for this model. Model stays exactly as-is
    // (still needs-verification, still null) — the proposal is reviewed
    // and applied by hand, same as any other needs-review row.
    const reason = `first price found: $${inputPerM}/$${outputPerM} per M — confirmed as "${confirmedModel}" — ${source || 'no source'}`;
    return {
      nextModel: model,
      change: {
        providerId: provider.id, modelId: model.id, requestedModel: model.id, status: 'needs-review',
        confirmedModel, oldInputPerM: model.inputPerM, proposedInputPerM: inputPerM,
        oldOutputPerM: model.outputPerM, proposedOutputPerM: outputPerM,
        sourceUrl: source || null, ts: nowIso, reason
      },
      alertLine: `NEEDS REVIEW  ${label} (${provider.name}): ${reason}`
    };
  }

  const priceMoved = inputPerM !== model.inputPerM || outputPerM !== model.outputPerM;
  if (!priceMoved) {
    return {
      nextModel: {
        ...model,
        contextWindow: contextWindow || model.contextWindow, // Perplexity often can't confirm this even when price+source are solid — keep old rather than lose it
        maxOutput: maxOutput || model.maxOutput,
        verifiedAt: nowIso
      },
      change: { providerId: provider.id, modelId: model.id, requestedModel: model.id, status: 'confirmed', ts: nowIso },
      alertLine: null
    };
  }

  // Price moved from an already-verified value — held for review no matter
  // how large or small the delta. The old verified value stays live.
  const reason = `proposed $${inputPerM}/$${outputPerM} per M (was $${model.inputPerM}/$${model.outputPerM}) — confirmed as "${confirmedModel}" — ${source || 'no source'}`;
  return {
    nextModel: model,
    change: {
      providerId: provider.id, modelId: model.id, requestedModel: model.id, status: 'needs-review',
      confirmedModel, oldInputPerM: model.inputPerM, proposedInputPerM: inputPerM,
      oldOutputPerM: model.outputPerM, proposedOutputPerM: outputPerM,
      sourceUrl: source || null, ts: nowIso, reason
    },
    alertLine: `NEEDS REVIEW  ${label} (${provider.name}): ${reason}`
  };
}

// ── mapWithConcurrency ───────────────────────────────────────────────
// Same result shape as Promise.allSettled (array of {status, value} or
// {status, reason}) so callers don't care which one ran. Bounded worker
// pool instead of firing every task at once — see RESEARCH_CONCURRENCY.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i], i) };
      } catch (e) {
        results[i] = { status: 'rejected', reason: e };
      }
    }
  }
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

// Hand-rolled raw RFC5322 message — deliberately no mimetext/nodemailer
// dependency, matches this project's no-build-step, no-npm-deps stance
// everywhere else. A plain-text alert email doesn't need more than this.
function buildRawEmail(subject, bodyLines, alertTo) {
  const body = bodyLines.join('\r\n');
  return [
    `From: WaxFrame Pricing Worker <${ALERT_FROM}>`,
    `To: ${alertTo}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');
}

async function sendAlertEmail(env, subject, bodyLines) {
  const alertTo = env.PRICING_ALERT_TO;
  if (!env.PRICING_ALERTS || !isSafeEmailAddress(alertTo)) return; // private recipient secret or binding missing
  try {
    const { EmailMessage } = await import('cloudflare:email');
    const raw = buildRawEmail(subject, bodyLines, alertTo);
    await env.PRICING_ALERTS.send(new EmailMessage(ALERT_FROM, alertTo, raw));
  } catch (e) {
    // Email is a nice-to-have alert channel, not the source of truth (the
    // run-log/status page is) — a failure to send shouldn't be treated as
    // a refreshPricing() failure. Nothing else to do here; there's no
    // second alert channel to report an alert-channel failure to.
  }
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

    // Prior run's per-provider/model status, read BEFORE this run's entry
    // is pushed, so "was this row OK last time" reflects the run before
    // this one, not this one.
    let log = [];
    const logRaw = await env.PRICING_DATA.get(RUN_LOG_KEY);
    if (logRaw) { try { log = JSON.parse(logRaw) || []; } catch (e) { log = []; } }
    const prevStatusByKey = {};
    if (log[0] && Array.isArray(log[0].changes)) {
      log[0].changes.forEach(c => { prevStatusByKey[`${c.providerId}::${c.modelId}`] = c.status; });
    }
    const wasHealthy = status => status === 'confirmed' || status === 'needs-review';

    // Flatten to (provider, model) tasks. `unsupported` models (e.g.
    // Copilot's — API unavailable to personal M365 accounts) are never
    // researched; there's nothing to look up.
    const tasks = [];
    current.providers.forEach(p => {
      (p.models || []).forEach(m => {
        if (m.status === 'unsupported') return;
        tasks.push({ provider: p, model: m });
      });
    });

    const results = await mapWithConcurrency(tasks, RESEARCH_CONCURRENCY, t => researchModel(t.provider, t.model, apiKey));

    const nowIso = new Date().toISOString();
    const changes = [];
    const alertLines = [];
    const overridesByProvider = {}; // providerId -> { modelId -> nextModel }

    const decisions = tasks.map((t, i) => {
      const r = results[i];
      const outcome = r.status === 'fulfilled' ? r.value : { ok: false, reason: String((r.reason && r.reason.message) || r.reason) };
      const key = `${t.provider.id}::${t.model.id}`;
      return { task: t, decision: decideModelUpdate(t.provider, t.model, outcome, wasHealthy(prevStatusByKey[key]), nowIso) };
    });

    // Build 20260809-001 — corroborate every needs-review proposal's cited
    // source before it reaches David. Only needs-review rows do a fetch
    // (a handful per run, not all 35-40 tracked models), and a fetch that
    // fails or comes back too thin to judge leaves the row as ordinary
    // needs-review rather than manufacturing a false alarm — see
    // corroborateProposal/corroboratesSource above.
    await mapWithConcurrency(decisions, RESEARCH_CONCURRENCY, async d => {
      const c = d.decision.change;
      if (c.status !== 'needs-review' || !c.sourceUrl) return;
      const corroborated = await corroborateProposal(c.sourceUrl, c.proposedInputPerM, c.proposedOutputPerM);
      if (corroborated === false) {
        c.status = 'unverified-source';
        c.reason = `${c.reason} — WARNING: proposed price not found on the cited source page text, verify manually before applying`;
        if (d.decision.alertLine) d.decision.alertLine = d.decision.alertLine.replace('NEEDS REVIEW', 'UNVERIFIED SOURCE');
      }
    });

    decisions.forEach(d => {
      const { task: t, decision } = d;
      changes.push(decision.change);
      if (decision.alertLine) alertLines.push(decision.alertLine);
      if (!overridesByProvider[t.provider.id]) overridesByProvider[t.provider.id] = {};
      overridesByProvider[t.provider.id][t.model.id] = decision.nextModel;
    });

    const nextProviders = current.providers.map(p => {
      const overrides = overridesByProvider[p.id] || {};
      const nextModels = (p.models || []).map(m => overrides[m.id] || m);
      return { ...p, models: nextModels };
    });

    await env.PRICING_DATA.put(PREVIOUS_KEY, currentRaw);

    const next = { ...current, lastUpdated: nowIso, providers: nextProviders };
    await env.PRICING_DATA.put('latest', JSON.stringify(next));

    log.unshift({ ts: nowIso, changes });
    await env.PRICING_DATA.put(RUN_LOG_KEY, JSON.stringify(log.slice(0, MAX_LOG_ENTRIES)));

    if (alertLines.length) {
      await sendAlertEmail(env, `WaxFrame pricing refresh — ${alertLines.length} item(s) need a look`, [
        `Run at ${nowIso}:`,
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
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
          'X-Frame-Options': 'DENY',
          ...CORS
        }
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

// Named exports alongside the default Worker export — consumed only by
// tools/pricing-worker/test-refresh-logic.mjs (pure-function unit tests,
// no KV/network). Cloudflare's runtime ignores exports it doesn't call.
export { decideModelUpdate, mapWithConcurrency, isValidPrice, isValidSizeString, isTrustedSource, hostnameMatchesDomain, corroboratesSource, escapeHtml, buildStatusHtml, isSafeEmailAddress };
