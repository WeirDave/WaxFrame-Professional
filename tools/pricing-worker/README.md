# waxframe-pricing — Cloudflare Worker

Serves the pricing data behind [`ai-api-pricing.html`](../../ai-api-pricing.html). Reads from Cloudflare KV so pricing can be refreshed without a Worker redeploy or a site rebuild.

**Endpoint:** `https://waxframe-pricing.weirdave.workers.dev/api/pricing`

**Schema (v3, since v3.63.437):** see [`data/pricing-seed.json`](data/pricing-seed.json). Each provider carries a `defaultModel` pointer plus a `models[]` array — every model WaxFrame curates for that provider in [`js/provider-catalog.js`](../../js/provider-catalog.js)'s `fallback` lists, not just the one shown in the page's Defaults table. A model with no verified price yet still gets a row, `status: "needs-verification"` — it's tracked, not silently absent. `tools/check-pricing-coverage.mjs` (run as part of `tools/release-check.mjs`) fails the release gate if the seed and the catalog drift out of sync.

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

**Applying a scheduled-refresh proposal** (a `needs-review` row from the run log — see "Review-before-publish" below) is the same manual step: edit the specific model's `inputPerM`/`outputPerM`/`contextWindow`/`maxOutput`/`sourceUrl`/`verifiedAt`/`status` in `data/pricing-seed.json` to match the reviewed proposal, then push with the command above. There's no separate approval/promotion tooling — the run log already carries everything needed (requested model, confirmed model, old/proposed prices, source, timestamp) to make that edit by hand.

**Verify the push actually landed** — don't trust the local edit alone:

```sh
curl -s "https://waxframe-pricing.weirdave.workers.dev/api/pricing?cachebust=$(date +%s)" | grep lastUpdated
```

Confirm the returned `lastUpdated` matches what you just set. v3.63.251 (2026-06-10) edited this seed file correctly but the `wrangler kv key put --remote` step silently never ran — the live page kept serving 6-week-old pricing data with no visible failure (the fetch still succeeded, so the "stale fallback" banner never triggered) until v3.63.411 caught it. This one curl check would have caught that immediately.

---

## Page fallback behavior

`ai-api-pricing.html`'s renderer (`js/pricing-renderer.js`) ships an embedded copy of the pricing JSON as `FALLBACK_DATA`. If the Worker is unreachable, the fetch fails, the page falls back to the embedded data, and shows a small "live service unreachable" banner. The site never breaks — worst case it shows slightly stale data.

**v3.63.437 — `FALLBACK_DATA` is generated, not hand-pasted.** The old process (paste the new seed JSON into the renderer by hand on the next release) was a real drift risk — two copies of the same data, kept in sync only by a code comment asking maintainers to remember. Now:

1. Update `data/pricing-seed.json`
2. `node tools/generate-pricing-fallback.mjs` — regenerates `FALLBACK_DATA` in `js/pricing-renderer.js` from the seed. Structurally impossible to forget one half of the update; run it as part of any release that touches pricing.
3. `wrangler kv key put ... --remote` (this updates KV; live page picks up within 1 hr)

---

## CORS

Worker returns `Access-Control-Allow-Origin: *` so any origin can fetch the JSON. That's fine because the data is public — there's nothing to protect.

---

## Scheduled auto-refresh (v3.63.412+)

The Worker no longer relies purely on someone remembering to run `wrangler kv key put`. A weekly Cloudflare cron trigger calls a `scheduled()` handler in `src/index.js` that asks Perplexity Sonar (web-grounded, so it's anchored to a live search rather than the model's training-data recall) for each tracked model's current `inputPerM` and `outputPerM` — the actual price, which is the entire point of this feature — plus `contextWindow`/`maxOutput` on a best-effort basis.

**v3.63.437 — every curated model, not just each provider's default.** Pre-v3.63.437 this looped over one row per provider (~10 research calls/week). Now it loops over every model in every provider's `models[]` array (~38 calls/week) with a small concurrency cap (`RESEARCH_CONCURRENCY = 4` in `src/index.js`) instead of firing all of them at once.

**Scope is deliberately narrow.** Only pricing numbers auto-refresh, and even then only by *proposing* — see "Review-before-publish" below. Everything else — `rateLimitNotes`, `recommendationNote`, `billingUrl`, `freeTier`, `tier1Rpm`/`tier1Tpm`, the model id itself, and which models are tracked at all — stays hand-curated (the last one is enforced by `tools/check-pricing-coverage.mjs` against `js/provider-catalog.js`, not by the scheduled run). Update those the same way as before (`wrangler kv key put`), same as any other manual pricing pass.

**Schedule:** Sundays 12:00 UTC. Cloudflare's cron day-of-week field counts `1` as Sunday, not Monday — verify the actual schedule in the dashboard rather than trusting the cron string's apparent meaning if you ever change it (`Workers & Pages → waxframe-pricing → Settings → Trigger events` shows the real "Next" run and the plain-English schedule description).

### Validation (v3.63.413)

A real dry-run test caught a gap in the original design: requiring `inputPerM`/`outputPerM`/`contextWindow`/`maxOutput` all to be present and well-formed let a *fully-formed but wrong* answer through — Perplexity once returned a complete, validating price for Mistral that was actually a different model tier, confirmed wrong against Mistral's own pricing page. And in practice, requiring all four fields meant the feature almost never successfully updated anything, since Perplexity frequently can't confirm `maxOutput` specifically even when the price is solid. Current design:

- **Price fields are hard-required.** `inputPerM`/`outputPerM` must both be valid numbers or the whole response is rejected (old values kept).
- **`contextWindow`/`maxOutput` are independently optional.** If Perplexity can't confirm one, that field falls back to the model's existing value instead of blocking the price update.
- **Source citation required.** The prompt requires a `source` URL; rejected unless that URL's hostname matches the provider's own official domain (`SOURCE_DOMAINS` in `src/index.js`) — catches a wrong-page/wrong-tier answer even when the price value itself looks plausible.

None of this is a guarantee of correctness — it catches the *big, obvious* failure modes (bad source, malformed response), not a subtle misread that lands on a plausible, correctly-sourced, but still-wrong number. The run log and email alerts (below) are the backstop for that residual risk, not redundant belt-and-suspenders.

### Model-version confirmation (v3.63.421)

A scheduled run once returned a fully-formed, correctly-sourced, *plausible* price for `claude-sonnet-4-6` that was actually `claude-sonnet-5`'s introductory rate — a different model, ~33% off on each field, under the (then-existing) 40%-delta auto-apply threshold, so it auto-applied with no flag. The live page quoted the wrong Claude price for weeks before it was caught by manual reconciliation, not by any guardrail.

Fix: the prompt now requires a `confirmedModel` field — the exact model name/version as it literally appears next to the price on the source page — and explicitly warns about introductory/promotional rates and sibling model-family tiers (mini/nano/pro/flash/version-number siblings). `researchModel()` rejects any response missing that field, same rejection path as a missing price. This doesn't string-match `confirmedModel` against the requested model id — naming conventions vary too much across providers (`gpt-5.5` vs `gpt-4.1-mini` vs `mistral-large-latest`) to do that reliably — it just refuses to auto-apply a price Sonar wasn't willing to explicitly attribute to a specific version.

**This reduces the risk of a version mix-up; it doesn't eliminate it** — `confirmedModel` is still never compared against the requested model id, just required to be non-empty. That gap, plus the fact the old 40%-delta gate would auto-apply anything under the threshold (exactly the shape the Sonnet mix-up took), is what "Review-before-publish" below closes.

### Review-before-publish (v3.63.437)

**Every changed or first-time price is now held for human review — no auto-apply threshold at all, regardless of how small the delta is.** The old design auto-applied any price move under 40% and only *held* (flagged) larger swings; that's precisely the gap the Sonnet mix-up fell through. Current design:

- **Unchanged, already-verified price** → silently confirmed. Only `verifiedAt` (and `contextWindow`/`maxOutput` if newly confirmed) refresh in KV. Nothing to review.
- **Changed price, or a first-ever price for a `needs-verification` model** → held. The live model row in KV is **not touched** — old value (or `needs-verification`/null) stays exactly as it was. The proposal (requested model, `confirmedModel`, old/proposed `inputPerM`+`outputPerM`, source URL, timestamp) is recorded as a structured entry in the run log and surfaced in the alert email, with status `needs-review`.
- **Failed research call** (bad source, unparseable, missing `confirmedModel`, HTTP error) → `retained`, same as before — old value untouched, no email unless this row was healthy last run and just started failing (a regression signal).

Applying a `needs-review` proposal is a manual step — see "Applying a scheduled-refresh proposal" above. No candidate/promotion KV service was built for this; the run log already carries everything needed to review and apply a proposal by hand, and this data has never been high-enough-stakes (a public reference page, not a billing system) to justify more machinery than that.

The decision logic above lives in `decideModelUpdate()` in `src/index.js`, exported and covered by `tools/pricing-worker/test-refresh-logic.mjs` (pure-function tests, no KV/network — run as part of `tools/release-check.mjs`).

### Email alerts (v3.63.413, widened v3.63.421 and v3.63.437)

The run log is pull — you have to remember to check `https://waxframe-pricing.weirdave.workers.dev/`. An email alert (via Cloudflare Email Routing's `send_email` binding) pushes instead, but only when something's actually worth a look:
- the whole run threw (KV unreachable, catastrophic failure)
- any provider/model needs review this run (`needs-review` — changed or first-time price, held per "Review-before-publish" above)
- a provider/model that succeeded (`confirmed`/`needs-review`) last run can't be read at all this run — the "their page probably changed" signal

Deliberately still silent on routine `retained` rows that consistently come back incomplete (Gemini's non-default free-tier models, Together, Grok in practice — expected Perplexity behavior, not a fault) and on `confirmed` (price genuinely unchanged, nothing to look at). Emailing on either every week would just be noise you'd learn to ignore.

Requires `waxframe.com`'s Email Routing enabled with a verified destination address. Keep the recipient out of source control: run `wrangler secret put PRICING_ALERT_TO`, enter the verified address, then deploy. The unrestricted `send_email` binding can send only to destinations already verified in the Cloudflare account. If the binding or secret is missing/misconfigured, `sendAlertEmail()` no-ops silently rather than breaking the refresh — email is a nice-to-have alert channel, not the source of truth.

**Where to look if something seems off:**
- **`https://waxframe-pricing.weirdave.workers.dev/`** — the status page shows a "Scheduled refresh log" (last 10 runs). Each entry lists every provider/model row as `confirmed`, `needs-review`, or `retained` (couldn't verify, with a reason). Check this before trusting a number for anything time-sensitive, e.g. before a demo, and before applying any `needs-review` proposal.
- **Your inbox** — see Email alerts above.
- **KV key `previous`** — the full payload from immediately before the last write. One-step rollback if a refresh ever produces something wrong despite validation (`wrangler kv key get --binding=PRICING_DATA previous --remote > rollback.json`, review it, then `wrangler kv key put --binding=PRICING_DATA latest --path=rollback.json --remote`). In practice this should rarely be needed now, since a scheduled run can no longer change a live price on its own — but it's still there for the manual-apply step.
- **`env.PERPLEXITY_API_KEY`** — a Worker secret, not in KV or git. If it's ever unset (rotated out, expired), `refreshPricing()` silently no-ops — the page keeps working off whatever's already in KV, it just stops auto-refreshing. Check/rotate via `Workers & Pages → waxframe-pricing → Settings → Variables and secrets`, or `wrangler secret put PERPLEXITY_API_KEY`.

**Deploying changes to this Worker** (the scheduled handler, cron config, or anything in `src/`) needs a Cloudflare API token scoped to **both** `Workers Scripts:Edit` and `Workers KV Storage:Edit` — the manual-pricing-update token from earlier (KV-only) isn't enough for `wrangler deploy` or `wrangler secret put`. Create one at `https://dash.cloudflare.com/profile/api-tokens` → Custom Token, and delete any narrower token it supersedes rather than leaving unused credentials around.

**Testing the review-gate decision logic** no longer needs a standalone throwaway script — `decideModelUpdate()` is exported from `src/index.js` and exercised directly by `node tools/pricing-worker/test-refresh-logic.mjs` (no KV/network, pure functions). For the research/network side specifically (`researchModel()`, `buildResearchPrompt()`, the source/confirmedModel validation), the old approach still applies: replicate the call in a standalone script that reads `data/pricing-seed.json`, calls the real Perplexity API, and just prints results — don't write anywhere. This is how the validation redesign in v3.63.413 was verified before deploy, including catching a real stale-pricing false-positive on Mistral in the first version of this feature. To test the email path specifically without waiting for a real trigger-worthy run, temporarily add a throwaway `fetch()` route that calls `sendAlertEmail()` directly, hit it once, confirm delivery, then remove the route and redeploy — don't leave a manual-trigger endpoint live permanently, it'd let anyone spam the alert inbox.
