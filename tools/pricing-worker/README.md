# waxframe-pricing — Cloudflare Worker

Serves the pricing data behind [`ai-api-pricing.html`](../../ai-api-pricing.html). Reads from Cloudflare KV so pricing can be refreshed without a Worker redeploy or a site rebuild.

**Endpoint:** `https://waxframe-pricing.weirdave.workers.dev/api/pricing`

**Schema:** see [`data/pricing-seed.json`](data/pricing-seed.json).

---

## One-time setup

```sh
cd tools/pricing-worker

# 1. Install wrangler if needed
npm install -g wrangler
wrangler login

# 2. Create the KV namespace
wrangler kv namespace create PRICING_DATA
# Copy the returned id and paste it into wrangler.toml replacing REPLACE_ME_WITH_KV_NAMESPACE_ID

# 3. Seed the KV with current pricing
wrangler kv key put --binding=PRICING_DATA latest --path=data/pricing-seed.json --remote

# 4. Deploy the Worker
wrangler deploy
```

After deploy: `curl https://waxframe-pricing.weirdave.workers.dev/api/pricing` should return the seed JSON.

---

## Updating pricing later

Just edit `data/pricing-seed.json` (or hand-author a new JSON if you prefer), then:

```sh
cd tools/pricing-worker
wrangler kv key put --binding=PRICING_DATA latest --path=data/pricing-seed.json --remote
```

No Worker redeploy needed. The page picks up the new data on its next fetch (Cloudflare cache TTL is 1 hour).

Bump the `lastUpdated` field in the JSON so the page displays the new timestamp.

**Verify the push actually landed** — don't trust the local edit alone:

```sh
curl -s "https://waxframe-pricing.weirdave.workers.dev/api/pricing?cachebust=$(date +%s)" | grep lastUpdated
```

Confirm the returned `lastUpdated` matches what you just set. v3.63.251 (2026-06-10) edited this seed file correctly but the `wrangler kv key put --remote` step silently never ran — the live page kept serving 6-week-old pricing data with no visible failure (the fetch still succeeded, so the "stale fallback" banner never triggered) until v3.63.411 caught it. This one curl check would have caught that immediately.

---

## Page fallback behavior

`ai-api-pricing.html` ships an embedded copy of the pricing JSON. If the Worker is unreachable, the fetch fails, the page falls back to the embedded data, and shows a small "live service unreachable" banner. The site never breaks — worst case it shows slightly stale data.

When updating production pricing:
1. Update `data/pricing-seed.json`
2. `wrangler kv key put ... --remote` (this updates KV; live page picks up within 1 hr)
3. In the next WaxFrame release, also paste the new JSON into `ai-api-pricing.html` as the embedded fallback so first-load and unreachable-Worker cases show the latest.

---

## CORS

Worker returns `Access-Control-Allow-Origin: *` so any origin can fetch the JSON. That's fine because the data is public — there's nothing to protect.

---

## Scheduled auto-refresh (v3.63.412+)

The Worker no longer relies purely on someone remembering to run `wrangler kv key put`. A weekly Cloudflare cron trigger calls a `scheduled()` handler in `src/index.js` that asks Perplexity Sonar (web-grounded, so it's anchored to a live search rather than the model's training-data recall) for each provider's current `inputPerM`, `outputPerM`, `contextWindow`, and `maxOutput`. `estPerRound` is recomputed from those with plain math — never asked of the model.

**Scope is deliberately narrow.** Only those four numeric fields auto-refresh. Everything else — `rateLimitNotes`, `recommendationNote`, `billingUrl`, `freeTier`, `tier1Rpm`/`tier1Tpm`, and the model id itself — stays hand-curated. Update those the same way as before (`wrangler kv key put`), same as any other manual pricing pass.

**Schedule:** Sundays 12:00 UTC. Cloudflare's cron day-of-week field counts `1` as Sunday, not Monday — verify the actual schedule in the dashboard rather than trusting the cron string's apparent meaning if you ever change it (`Workers & Pages → waxframe-pricing → Settings → Trigger events` shows the real "Next" run and the plain-English schedule description).

**Where to look if something seems off:**
- **`https://waxframe-pricing.weirdave.workers.dev/`** — the status page now shows a "Scheduled refresh log" (last 10 runs). Each entry lists every provider as `updated` (price actually changed), `confirmed` (checked, unchanged), or `retained` (couldn't verify — old value kept, with a reason). Check this before trusting a number for anything time-sensitive, e.g. before a demo.
- **KV key `previous`** — the full payload from immediately before the last write. One-step rollback if a refresh ever produces something wrong despite the validation (`wrangler kv key get --binding=PRICING_DATA previous --remote > rollback.json`, review it, then `wrangler kv key put --binding=PRICING_DATA latest --path=rollback.json --remote`).
- **`env.PERPLEXITY_API_KEY`** — a Worker secret, not in KV or git. If it's ever unset (rotated out, expired), `refreshPricing()` silently no-ops — the page keeps working off whatever's already in KV, it just stops auto-refreshing. Check/rotate via `Workers & Pages → waxframe-pricing → Settings → Variables and secrets`, or `wrangler secret put PERPLEXITY_API_KEY`.

**Safety guardrails, since this writes to a public page unattended:** any provider whose Perplexity response fails to parse, or whose fields don't validate (non-numeric/negative price, malformed context/output size string), keeps its old values — never gets overwritten with a guess or a partial answer. Validation is all-or-nothing per provider (if any one field is bad, the whole provider entry is skipped that run) rather than mixing verified and unverified fields together.

**Deploying changes to this Worker** (the scheduled handler, cron config, or anything in `src/`) needs a Cloudflare API token scoped to **both** `Workers Scripts:Edit` and `Workers KV Storage:Edit` — the manual-pricing-update token from earlier (KV-only) isn't enough for `wrangler deploy` or `wrangler secret put`. Create one at `https://dash.cloudflare.com/profile/api-tokens` → Custom Token, and delete any narrower token it supersedes rather than leaving unused credentials around.

**Manually testing the research logic** without waiting for the real cron or touching live data: replicate `buildResearchPrompt()` / `researchProvider()` / the validation functions in a standalone script that reads `data/pricing-seed.json`, calls the real Perplexity API, and just prints results — don't write anywhere. This is how the pipeline was verified before the first real deploy (v3.63.412's CHANGELOG entry has the actual results from that test run, including one real stale-pricing catch on Mistral).
