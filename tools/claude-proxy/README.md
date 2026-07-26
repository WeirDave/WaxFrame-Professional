# waxframe-claude-proxy — Cloudflare Worker

CORS-adding proxy in front of `api.anthropic.com`. The browser can't call Anthropic's API directly (Anthropic doesn't send CORS headers permitting arbitrary origins), so every Claude API call WaxFrame makes — from any user's browser, using their own API key — routes through this Worker instead.

**Endpoint:** `https://waxframe-claude-proxy.weirdave.workers.dev`

**Referenced from:** `js/app.js` (vision/OCR fallback endpoint default), `js/provider-catalog.js` (Claude catalog entry's `endpoint` field + the `anthropic-via-proxy` model-list discovery method), `CLAUDE.md` §3.

---

## Import history

This Worker has been live since well before 2026-07-25. Its source lived only in the Cloudflare dashboard until that date — zero version control, zero diff history, zero linkage between a given WaxFrame release and what proxy behavior it actually depended on. Found as a real gap during a process-verification audit (see `CHANGELOG.md` v3.63.414/v3.63.415, and `docs/WaxFrame_Backlog_Master_*.txt` for the audit that surfaced it).

`src/index.js` was pulled directly from the live deployment via the Cloudflare API (`GET /accounts/:id/workers/scripts/waxframe-claude-proxy`) and committed verbatim — not rewritten, not "cleaned up." Whatever behavior was actually live at import time is what's in git now. Bindings and subdomain config (both confirmed empty/default via the API's `/settings` and `/subdomain` endpoints) are documented in `wrangler.toml`'s comments rather than guessed at.

---

## What it does

- **`POST /v1/messages`** — forwards to Anthropic's Messages API. Body passed through as-is; `x-api-key` and `anthropic-version` headers forwarded from the incoming request (default `anthropic-version: 2023-06-01` if the caller doesn't send one).
- **`GET /v1/models`** — forwards to Anthropic's model-list endpoint. Used by `provider-catalog.js`'s `anthropic-via-proxy` discovery method.
- **Path allowlist.** Any other path falls back to `/v1/messages` (backwards compat for old WaxFrame code that called the Worker root) rather than proxying arbitrary paths — this Worker can't be used as an open proxy to anything except those two Anthropic endpoints.
- **Method allowlist per path** — `/v1/messages` only accepts POST, `/v1/models` only accepts GET.
- **CORS preflight (`OPTIONS`)** handled with `Access-Control-Allow-Origin: *` — fine, since this only ever forwards to Anthropic's own API using the caller's own key; there's no shared secret or session state to leak across origins.

## What it does NOT do

No auth of its own, no rate limiting, no logging/analytics beyond Cloudflare's default observability, no request/response transformation beyond header pass-through. It is deliberately a thin pipe, not a gateway with its own logic — every WaxFrame-specific behavior (prompt construction, response parsing, error classification) lives client-side in `js/provider-catalog.js`/`js/app.js`/`js/wf-debug.js`, not here.

---

## Bindings

**None.** No KV namespace, no secrets, no environment variables. The Anthropic API key travels through per-request from the browser's `x-api-key` header and is never stored server-side — this Worker holds no credentials of its own to leak, rotate, or manage.

---

## Deploying changes

Same Cloudflare API token requirements as [`tools/pricing-worker/`](../pricing-worker/README.md) — a token scoped to `Workers Scripts:Edit` (KV storage permission isn't needed here since there's no KV binding). See that README's "Deploying changes to this Worker" section for the token-creation walkthrough; it's the same Cloudflare account.

```sh
cd tools/claude-proxy
wrangler deploy
```

No secrets to set, no KV to seed — `wrangler deploy` is the entire deploy process.

---

## CORS

`Access-Control-Allow-Origin: *` — intentional and safe here for the same reason as the pricing Worker: every response is either Anthropic's own public model-list data or a response scoped to the caller's own API key that only the caller (whoever supplied that key) can meaningfully use. There's nothing shared or sensitive this Worker itself holds.
