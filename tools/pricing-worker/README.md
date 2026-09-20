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

**Applying a proposal means editing the seed AND pushing it — and the seed can be the wrong half.** On 2026-09-06 a proposal for `ministral-8b-latest` ($0.15/$0.15 → $0.10/$0.10, cited to `mistral.ai/news/ministraux/`) was applied to `data/pricing-seed.json` and never pushed to KV. That left the seed at $0.10 and KV at $0.15 for two weeks, with no symptom anywhere: the live page reads KV, so it kept serving the correct number, and the only visible trace was the 2026-09-20 run re-proposing the identical change and reporting "was $0.15/$0.15" against a seed that said $0.10.

Two things follow. `js/pricing-renderer.js`'s `FALLBACK_DATA` is generated from the **seed**, so during that window the page's offline fallback carried a price the live path did not — the drift was one Worker outage away from being visible. And when a run log's "was $X" disagrees with the seed, **the seed is not automatically the stale one** — here KV was right and the seed carried the bad proposal, so pushing the seed would have introduced the bug rather than fixed it. Reconcile against the provider's own pricing page before pushing either way:

```sh
curl -s "https://waxframe-pricing.weirdave.workers.dev/api/pricing" | python3 -m json.tool > live.json
# diff live.json against data/pricing-seed.json — any disagreement is a bug in one of them
```

**And the drift is wider than one price — it is the model roster.** A full reconcile on 2026-09-20 followed the consequence through. `wrangler kv key put --path=data/pricing-seed.json` writes the **whole seed**, so a push that never ran holds back everything in it, not just the row that prompted the look. Working backwards from the one known fact — KV still reported `$0.15/$0.15` for `ministral-8b-latest`, a value the seed abandoned on 2026-09-06 — no full-seed push can have landed since. Two commits in that window changed which models exist:

| commit | change to the roster |
|---|---|
| `v3.63.497` (09-14) | `deepseek-v4-flash` renamed to `deepseek-flash`, repriced to $0.15/$0.60 |
| `v3.63.500` (09-14) | `command-a-plus-05-2026` and `command-r7b-12-2024` added |

**The weekly scheduled run cannot repair any of that.** `refreshPricing()` maps over the `providers[].models[]` it finds in KV — it refreshes rows, and never adds, renames or removes one. So if no push landed, KV is still serving the old DeepSeek model id at the old price and is missing both new Cohere rows, and the weekly run has been dutifully researching a `deepseek-v4-flash` that no longer exists anywhere else in the codebase.

**A stale DeepSeek row misprices, it does not break.** Confirmed against DeepSeek's own Models & Pricing page on 2026-09-20: `deepseek-v4-flash` is a *legacy alias* that is still accepted, served by DeepSeek-V4.1-Flash and billed at the Flash price. So if KV is still serving the old id, calls keep working and are charged $0.15/$0.60 — the damage is confined to the page displaying the retired model's old, higher number. Worth knowing before treating the roster drift as urgent: it is a pricing-accuracy bug, not an outage.

**The two-second test, needing no tooling:** open the pricing page and look at DeepSeek's model id. `deepseek-flash` means the pushes landed and only `ministral` was odd; `deepseek-v4-flash` means they did not, and Cohere will show three models instead of five.

**Which way to push, once you know.** This is the part worth getting right, because the honest answer changed inside a single release. While the seed carried the bad `$0.10` Ministral value, pushing it would have put that live — so "don't push" was correct. With the seed corrected it inverts: the seed is now the better copy in every row, and a push is what repairs the roster. Reconcile first, push second, and confirm with the `lastUpdated` check below.

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

## Derived fields in the seed

`estPerRound` is computed from `inputPerM`/`outputPerM` and `tokensPerRound`, but it is **stored**, not computed at render time — so a price edit that forgets it leaves a stale number behind. It is not cosmetic: `js/pricing-renderer.js` sorts the table by it (`var sortColumn = 'estPerRound'`) and draws the "cheapest" recommendation from it.

The 2026-09-20 reconcile found exactly that. `v3.63.497` repriced `deepseek-flash` from $0.22/$0.60 to $0.15/$0.60 and moved `estPerRound` 0.002 → 0.001, when the new price works out to 0.002 — halving the displayed per-round cost of the one provider already tagged `cheapest`, and floating it to the top of the ranking it was being judged on.

`tools/check-pricing-coverage.mjs` now recomputes it for every priced row. The expected value is round-half-up to 3dp, floored at 0.001 so a paid model never displays as "$0.000/round"; that rule reproduces all 36 priced rows exactly, so it is checked for equality rather than with a tolerance — a tolerance loose enough to absorb the rounding would have been loose enough to absorb the defect.

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

### Model-attribution and source-kind guards (Build 20260920-001)

Two held proposals in the 2026-09-20 run were both wrong, in two different ways, and both ways were already written down above as known residual gaps. This closes each one.

**A confirmedModel is now compared against the model that was asked for.** The v3.63.421 note above says plainly that `confirmedModel` is "never compared against the requested model id, just required to be non-empty". That gap has now produced three bad proposals: `claude-sonnet-4-6` answered with `claude-sonnet-5`'s introductory rate, `ministral-8b-latest` answered with its 3B sibling's price, and the 2026-09-20 run proposing $2/$8 for `sonar-reasoning` off the row for **Sonar Reasoning Pro** — a model this seed already tracks separately at exactly $2/$8.

A full string match is what the earlier note correctly ruled out; `mistral-large-latest` and "Mistral Large 3" are the same model written two ways. `modelAttributionMismatch()` compares only the small set of tokens that distinguish *siblings*:

- **tier words** (`pro`, `mini`, `nano`, `lite`, `flash`, `turbo`, `plus`, `sonnet`/`opus`/`haiku`, …) — flagged when one side carries one the other does not. That asymmetry is the whole signature of a sibling-row mix-up.
- **parameter sizes** (8B vs 3B) — flagged only when both sides name one and they disagree.
- **version numbers** (4.6 vs 5) — flagged only when both sides name one and neither is a prefix of the other, so "Grok 4.20 Reasoning" still matches `grok-4.20-0309-reasoning` and a bare "Mistral Large" never fires.

A flagged row is **still held, still recorded in full, and still emailed** — nothing is dropped. The only thing that changes is what the reviewer is told: status `model-mismatch` instead of `needs-review`, and an alert line leading `MODEL MISMATCH` instead of `NEEDS REVIEW`. That distinction is the whole value; a mismatched proposal is otherwise indistinguishable from a real price move, which is how the Sonnet one got applied. These rows deliberately skip source corroboration — the proposed number *is* on the cited page, on the sibling's row, so a corroboration pass would come back green about the one thing already known to be wrong.

The token lists are checked in `test-refresh-logic.mjs` against every model id currently in the seed paired with the way a provider page plausibly writes it. **A guard that fires on the normal case is worse than no guard**, so adding a tier word means re-running that test, not just appending to the set.

**A source must now be the right *kind* of page, not just the right domain.** `isTrustedSource` only ever checked the hostname, so a provider's own announcement post passed — and an announcement post is a dated snapshot, not a current price list. `https://mistral.ai/news/ministraux/` is the Ministral launch announcement and still quotes the launch price; a run applied its $0.10 figure over the then-current $0.15 on 2026-09-06, and the 2026-09-20 run re-proposed the same change off the same page. Source corroboration could never catch this — the number genuinely *is* on the page.

`SOURCE_PATH_DENY` rejects a URL whose path contains a `news`, `blog`, `newsroom`, `press`, `announcements` or `changelog` segment. `buildResearchPrompt` already tells Sonar not to cite a news article; this is the same requirement enforced rather than requested. The list is deliberately short and specific — a `pricing`, `docs` or `console` path is the normal shape, and no source URL in the seed hits any of it. A rejected source is an ordinary `retained` row: the old value stays live and the run log says why.

**One consequence worth knowing:** if a provider ever publishes pricing *only* in a blog post, that model will retain its old value indefinitely and quietly. The run log shows it as retained every week, so it is visible rather than silent — but the fix then is to widen `SOURCE_DOMAINS`/`SOURCE_PATH_DENY` deliberately for that provider, not to assume the check is broken.

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
