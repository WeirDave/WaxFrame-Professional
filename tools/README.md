# tools/

Everything in this folder is development tooling. **None of it ships.** The
release ZIP is built from the repository root by
`.github/workflows/release-assets.yml`, and nothing here is referenced by any
page WaxFrame serves.

This file exists because the folder grew to seventeen scripts and several of
them were documented nowhere. That is the same failure as an audit nobody can
re-run in one command: a check that people cannot find does not get run, and a
check that does not get run is not a check. If you add a script here, add a row
below in the same commit.

---

## The one command before every release

```
node tools/release-check.mjs
```

Nineteen stages. Must exit 0 before a version-bump commit. It is pure Node
standard library by design — no dependencies, no browser — so it runs anywhere,
including CI, without installing anything.

**Never pipe it when its result is meant to gate something.** `node
tools/release-check.mjs | tail -2` reports `tail`'s exit code, not the gate's,
and a red gate looks green. This has caused a bad release before.

The gate runs these itself; you do not invoke them separately unless you are
debugging one:

| Script | What it protects |
| --- | --- |
| `verify-prompts-equivalence.mjs` | The shipped prompts still match their reference text |
| `check-pricing-coverage.mjs` | Every provider in the catalog has pricing data |
| `pricing-worker/test-refresh-logic.mjs` | The weekly pricing refresh cannot corrupt KV |
| `test-provider-extractors.mjs` | 210+ fixtures pinning every provider response shape |
| `test-debug-redaction.mjs` | Secrets never reach a Scout bundle; catalog placeholders always substitute |
| `test-server-ai-eligibility.mjs` | Which model-server entries may join a hive |
| `claude-proxy/test-security.mjs` | The Claude relay's origin, path, method and key guards |
| `check-confidentiality.mjs` | No real workplace data in tracked files |

---

## Run these by hand

They are deliberately **not** gate stages. Each needs either a browser or a
person to read the result, and `release-check.mjs` stays dependency-free.

| Script | Run it when | Needs |
| --- | --- | --- |
| `flow-check.mjs` | Touching setup-screen navigation, the round loop, Change Builder, or checkpoints | Chrome |
| `check-html-injection.mjs` | Touching anything that renders user, AI, or imported text | Chrome |
| `check-file-protocol.mjs` | Touching the pdf.js loader or the vendored pdf.js builds | Chrome |
| `audit-dead-code.mjs` | Every few releases, and after removing anything | — |
| `audit-html-sinks.mjs` | Alongside `check-html-injection.mjs`, to get the list of sites to read | — |
| `capture.mjs` | Producing screenshots | Chrome |

### What each one actually answers

**`flow-check.mjs`** — 23 assertions over five flows, driven through real Chrome
against a same-origin mock provider, so full multi-round hive runs cost nothing.
It has caught regressions that unit tests structurally cannot: a Builder pill
that stopped following state, and setup screens that stopped advancing after a
refactor.

**`check-html-injection.mjs`** — seeds hostile markup into AI names, the project
name, reference titles and a restored session's console output, then asks the
DOM whether any of it became an element. Static analysis was tried twice for
this and gave confident false alarms both times, because a hand-rolled scanner
cannot reliably find where a template literal ends. Asking the browser has no
such problem.

It asserts **liveness before safety**: it fails if the hostile value never
loaded or never reached the page. Its first version passed while proving
nothing. Any check added here should do the same.

**`check-file-protocol.mjs`** — opens `index.html` from disk on a real `file://`
page and confirms the portable copy picks the classic pdf.js build and can read
a PDF it generates itself. Nothing else can see that branch: the gate never
opens a browser, and `flow-check.mjs` drives one over http, which is the half
that was never in doubt.

**`audit-dead-code.mjs`** — orphan functions, export-only functions, dynamic
execution, dangling DOM lookups, write-only storage keys. Its dangling-DOM pass
is the one that earns its keep: reference counting cannot see a function that is
called on every render and writes to an element deleted two hundred releases
ago. That pass found seven dead things in v3.63.524, five of which had live
callers.

**`audit-html-sinks.mjs`** — inventory of every place HTML is written and which
interpolated values are not escaped. **It over-reports on purpose.** Its job is
to hand a person a short list to read, not to give a verdict;
`check-html-injection.mjs` is what gives the verdict.

---

## Release plumbing

| Script | Notes |
| --- | --- |
| `indexnow-ping.mjs` | Run after publishing a release. Notifies Bing, Yandex and partner indexes. Needs the key file at the site root. |
| `generate-pricing-fallback.mjs` | Regenerates the hardcoded pricing fallback from the seed. Run after editing the seed, then push KV and confirm the row count. |

---

## Subfolders

- **`claude-proxy/`** — source of the Cloudflare Worker that adds CORS in front
  of the Anthropic API. It holds no secrets and no bindings beyond a rate
  limiter; keys travel per-request from the browser and are never stored. See
  its README before changing anything about origins or headers.
- **`pricing-worker/`** — the Worker behind the pricing page, its cron logic and
  its tests.

---

## Conventions

Every script here carries a `// Build: YYYYMMDD-NNN` header that the release
sweep updates, and gate stage 2 fails the build if one goes stale. A script
without that header is skipped rather than failed, so adding one is opt-in.

Never write a literal `?v=X.Y.Z` into a comment or prose in this folder. Gate
stage 2 scans for cache-bust stamps and has no comment awareness, so it will
fail the build on an example.
