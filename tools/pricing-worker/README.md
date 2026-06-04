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
