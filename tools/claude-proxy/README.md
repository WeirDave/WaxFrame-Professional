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

- **`POST /v1/messages`** — forwards JSON bodies up to 8 MiB to Anthropic's Messages API. `x-api-key` and `anthropic-version` headers are forwarded from the incoming request (default `anthropic-version: 2023-06-01` if the caller doesn't send one).
- **`GET /v1/models`** — forwards to Anthropic's model-list endpoint. Used by `provider-catalog.js`'s `anthropic-via-proxy` discovery method.
- **Path allowlist.** `/` remains a backwards-compatible alias for `/v1/messages`; every other unknown path returns 404.
- **Method allowlist per path** — `/v1/messages` only accepts POST, `/v1/models` only accepts GET.
- **CORS preflight (`OPTIONS`)** allows the production site, GitHub Pages, portable `file://` installs, and loopback development origins. Other browser origins receive 403.
- **Abuse controls.** Requests require a syntactically safe API-key header, are capped at 8 MiB, time out after 15 minutes, and are limited to 120 requests/minute per hashed API key per Cloudflare location.

## What it does NOT do

No account system, shared credential, request logging, analytics, or prompt transformation. It remains a narrow relay; WaxFrame-specific prompt construction, response parsing, and error classification live client-side.

---

## Bindings

One `REQUEST_RATE_LIMITER` binding. There is no KV namespace, Worker secret, or environment variable. The Anthropic API key travels through per-request and is never stored; a truncated SHA-256 digest is used only as the rate-limit identifier.

---

## Deploying changes

Same Cloudflare API token requirements as [`tools/pricing-worker/`](../pricing-worker/README.md) — a token scoped to `Workers Scripts:Edit` (KV storage permission isn't needed here since there's no KV binding). See that README's "Deploying changes to this Worker" section for the token-creation walkthrough; it's the same Cloudflare account.

```sh
cd tools/claude-proxy
wrangler deploy
```

No secrets or KV data to seed — `wrangler deploy` provisions the declared rate-limit binding.

---

## CORS

The Worker echoes `Access-Control-Allow-Origin` only for `https://waxframe.com`, `https://www.waxframe.com`, `https://weirdave.github.io`, portable opaque (`null`) origins, and loopback HTTP development origins. Add a new production origin to `ALLOWED_ORIGINS` before serving WaxFrame from it.
