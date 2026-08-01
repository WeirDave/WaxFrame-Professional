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

The Worker no longer relies purely on someone remembering to run `wrangler kv key put`. A weekly Cloudflare cron trigger calls a `scheduled()` handler in `src/index.js` that asks Perplexity Sonar (web-grounded, so it's anchored to a live search rather than the model's training-data recall) for each provider's current `inputPerM` and `outputPerM` — the actual price, which is the entire point of this feature — plus `contextWindow`/`maxOutput` on a best-effort basis. `estPerRound` is recomputed from the price fields with plain math — never asked of the model.

**Scope is deliberately narrow.** Only pricing numbers auto-refresh. Everything else — `rateLimitNotes`, `recommendationNote`, `billingUrl`, `freeTier`, `tier1Rpm`/`tier1Tpm`, and the model id itself — stays hand-curated. Update those the same way as before (`wrangler kv key put`), same as any other manual pricing pass.

**Schedule:** Sundays 12:00 UTC. Cloudflare's cron day-of-week field counts `1` as Sunday, not Monday — verify the actual schedule in the dashboard rather than trusting the cron string's apparent meaning if you ever change it (`Workers & Pages → waxframe-pricing → Settings → Trigger events` shows the real "Next" run and the plain-English schedule description).

### Validation (v3.63.413)

A real dry-run test caught a gap in the original design: requiring `inputPerM`/`outputPerM`/`contextWindow`/`maxOutput` all to be present and well-formed let a *fully-formed but wrong* answer through — Perplexity once returned a complete, validating price for Mistral that was actually a different model tier, confirmed wrong against Mistral's own pricing page. And in practice, requiring all four fields meant the feature almost never successfully updated anything, since Perplexity frequently can't confirm `maxOutput` specifically even when the price is solid. Current design:

- **Price fields are hard-required.** `inputPerM`/`outputPerM` must both be valid numbers or the whole response is rejected (old values kept).
- **`contextWindow`/`maxOutput` are independently optional.** If Perplexity can't confirm one, that field falls back to the provider's existing value instead of blocking the price update.
- **Source citation required.** The prompt requires a `source` URL; rejected unless that URL's hostname matches the provider's own official domain (`SOURCE_DOMAINS` in `src/index.js`) — catches a wrong-page/wrong-tier answer even when the price value itself looks plausible.
- **Delta threshold (40%).** Even a valid, correctly-sourced price gets held as `flagged` (not applied) if it moved more than 40% from the current value — real price cuts that size do happen, but that's also exactly the shape of a tier-mismatch error, so it gets a human's eyes either way.

None of this is a guarantee of correctness — it catches the *big, obvious* failure modes (bad source, big swing), not a subtle misread that lands on a plausible, correctly-sourced, but still-wrong number. The run log and email alerts (below) are the backstop for that residual risk, not redundant belt-and-suspenders.

### Model-version confirmation (v3.63.421)

The 40%-delta and trusted-source guardrails above weren't enough: a scheduled run once returned a fully-formed, correctly-sourced, *plausible* price for `claude-sonnet-4-6` that was actually `claude-sonnet-5`'s introductory rate — a different model, ~33% off on each field, under the delta threshold, so it auto-applied with no flag. The live page quoted the wrong Claude price for weeks before it was caught by manual reconciliation, not by any guardrail.

Fix: the prompt now requires a `confirmedModel` field — the exact model name/version as it literally appears next to the price on the source page — and explicitly warns about introductory/promotional rates and sibling model-family tiers (mini/nano/pro/flash/version-number siblings). `researchProvider()` rejects any response missing that field, same rejection path as a missing price. This doesn't string-match `confirmedModel` against the provider's own model id — naming conventions vary too much across providers (`gpt-5.5` vs `gpt-4.1-mini` vs `mistral-large-latest`) to do that reliably — it just refuses to auto-apply a price the model wasn't willing to explicitly attribute to a specific version. A confident guess and an honestly-unconfirmed one look identical in the raw JSON otherwise; this forces the model to commit to one or the other.

### Email alerts (v3.63.413, widened v3.63.421)

The run log is pull — you have to remember to check `https://waxframe-pricing.weirdave.workers.dev/`. An email alert (via Cloudflare Email Routing's `send_email` binding, `[[send_email]]` in `wrangler.toml`, destination `weirdave@aol.com`) pushes instead, but only when something's actually worth a look:
- the whole run threw (KV unreachable, catastrophic failure)
- any provider got `flagged` this run
- **any provider's price actually moved and was auto-applied (`updated`) — added v3.63.421.** Previously silent whenever the swing landed under the 40% delta threshold, which is exactly how the Claude introductory-rate mix-up went unnoticed. The delta threshold is a gate on auto-*applying*, not a gate on whether it's worth a human glance — small wrong answers deserve eyes just as much as big ones, they just don't need to block on getting them.
- a provider that was working last run (`updated`/`confirmed`) can't be read at all this run — the "their page probably changed" signal

Deliberately still silent on routine `retained` (Gemini's free tier, Together, and Grok consistently come back incomplete most runs in practice — expected Perplexity behavior, not a fault) and on `confirmed` (price genuinely unchanged, nothing to look at). Emailing on either every week would just be noise you'd learn to ignore.

Requires `waxframe.com`'s Email Routing enabled with a verified destination address (done 2026-07-25 — `weirdave@aol.com` auto-verified since it's the Cloudflare account's own login email, no confirmation click needed). If the `send_email` binding is ever missing/misconfigured, `sendAlertEmail()` no-ops silently rather than breaking the actual pricing refresh — email is a nice-to-have alert channel, not the source of truth.

**Where to look if something seems off:**
- **`https://waxframe-pricing.weirdave.workers.dev/`** — the status page shows a "Scheduled refresh log" (last 10 runs). Each entry lists every provider as `updated`, `confirmed`, `flagged` (needs review), or `retained` (couldn't verify, with a reason). Check this before trusting a number for anything time-sensitive, e.g. before a demo.
- **Your inbox** — see Email alerts above.
- **KV key `previous`** — the full payload from immediately before the last write. One-step rollback if a refresh ever produces something wrong despite validation (`wrangler kv key get --binding=PRICING_DATA previous --remote > rollback.json`, review it, then `wrangler kv key put --binding=PRICING_DATA latest --path=rollback.json --remote`).
- **`env.PERPLEXITY_API_KEY`** — a Worker secret, not in KV or git. If it's ever unset (rotated out, expired), `refreshPricing()` silently no-ops — the page keeps working off whatever's already in KV, it just stops auto-refreshing. Check/rotate via `Workers & Pages → waxframe-pricing → Settings → Variables and secrets`, or `wrangler secret put PERPLEXITY_API_KEY`.

**Deploying changes to this Worker** (the scheduled handler, cron config, or anything in `src/`) needs a Cloudflare API token scoped to **both** `Workers Scripts:Edit` and `Workers KV Storage:Edit` — the manual-pricing-update token from earlier (KV-only) isn't enough for `wrangler deploy` or `wrangler secret put`. Create one at `https://dash.cloudflare.com/profile/api-tokens` → Custom Token, and delete any narrower token it supersedes rather than leaving unused credentials around.

**Manually testing the research logic** without waiting for the real cron or touching live data: replicate `buildResearchPrompt()` / `researchProvider()` / the validation functions in a standalone script that reads `data/pricing-seed.json`, calls the real Perplexity API, and just prints results — don't write anywhere. This is how the validation redesign in v3.63.413 was verified before deploy, including catching a real stale-pricing false-positive on Mistral in the first version of this feature. To test the email path specifically without waiting for a real trigger-worthy run, temporarily add a throwaway `fetch()` route that calls `sendAlertEmail()` directly, hit it once, confirm delivery, then remove the route and redeploy — don't leave a manual-trigger endpoint live permanently, it'd let anyone spam the alert inbox.
