# tools/

Everything in this folder is development tooling. **None of it ships.** The
release ZIP is built from the repository root by
`.github/workflows/release-assets.yml`, and nothing here is referenced by any
page WaxFrame serves.

This file exists because the folder grew to twenty-one scripts and several of
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
| `test-debug-redaction.mjs` | The redaction helpers behave, and both export paths still call them; catalog placeholders always substitute |
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
| `check-export-redaction.mjs` | Touching anything that lands in a Scout bundle or a checkpoint | Chrome |
| `check-import-bounds.mjs` | Touching document import or anything that writes `LS_PROJECT` | Chrome |
| `check-hostile-provider.mjs` | Touching the model-server import, `makeCleanProviderId`, or the budget/param learning path | Chrome |
| `check-pdf-shapes.mjs` | Touching PDF extraction, the OCR hand-off, or either vendored pdf.js build | Chrome |
| `audit-dead-code.mjs` | Every few releases, and after removing anything | — |
| `audit-html-sinks.mjs` | Alongside `check-html-injection.mjs`, to get the list of sites to read | — |
| `capture.mjs` | Producing screenshots | Chrome |

> **All of these are green as of v3.63.540.** Three were written red on
> purpose, as the acceptance tests for the bugs the 2026-09-21 security review
> found, and each went green with its fix: `check-export-redaction.mjs` in
> v3.63.537, `check-import-bounds.mjs` in v3.63.539.
>
> None of them is a gate stage, and that is deliberate rather than pending —
> every one needs Chrome, and `release-check.mjs` is pure Node by design so it
> runs anywhere including CI. Where a structural half can be pinned without a
> browser it has been: `test-debug-redaction.mjs` asserts both export paths
> still call the scrubber, and the gate runs that.
>
> Writing the test red first is worth keeping as a habit. A check authored
> after the fix has never been observed failing, so nothing proves it would.

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

**`check-export-redaction.mjs`** — seeds credential-shaped canaries into the
failure record, the ring buffer and the console, then builds a **real** Scout
bundle and a **real** checkpoint and searches the finished bytes for them.

This exists because `test-debug-redaction.mjs` passes and is not enough. That
test proves `scrubFailureRecord` works *when called*; it never assembles a
bundle, so it cannot see a second unscrubbed copy of the same data elsewhere in
the same file. Which is what shipped: `bundleForScout()` scrubs
`envelope.lastFailure` and `envelope.liveConsole`, then embeds
`checkpoint.IDB_SESSION` straight from `idbGet()` — carrying `lastFailure`,
`ringBuffer` and `consoleHTML` verbatim. A redaction control is worth exactly
what the shipped file says it is worth, so this reads the shipped file.

**`check-import-bounds.mjs`** — generates a decompression bomb with the
project's own vendored JSZip (never committed — a public repo has no business
carrying one), feeds it to the real `extractFromFile`, and measures the cost.
Then it overflows `saveProject()` and asks what the user was told.

The second half is the one that bites without any attacker: `saveProject`
wraps its write in a try/catch that only `console.warn`s, so going over quota
silently drops the **entire** project blob — name, version, goal fields,
starting document — with nothing on screen.

**`check-pdf-shapes.mjs`** — generates the PDF shapes that actually break PDF
engines — no text layer, encrypted, 600 pages, truncated, broken xref — and
runs every one against **both** vendored builds: pdf.js 6.3.289 on `http://`
and 3.11.174 on `file://`. A PDF is a text format, so the generator is inline
and needs no library, which matters in a repo that vendors its dependencies.

Testing only the hosted build tests the half that was never in doubt. The
portable build is three years older and permanently pinned, so it is the one
likelier to choke. As of the first run both behave identically on all eight
shapes, which is the useful result.

It found two things on that first run, both since fixed: a 2,000,000-character
import cap that refused a legitimate 600-page document, and a
password-protected PDF surfacing pdf.js's own `No password given` rather than
saying what was wrong. The large fixture asserts its own density for that
reason — under 2.4 M characters it would stop testing the cap at all.

**`check-hostile-provider.mjs`** — pins three guards that all currently hold
and that a refactor could delete without anything going red: the
`makeCleanProviderId` `taken()` check that stops a model server claiming a
configured provider's id (and therefore repointing its endpoint), the
`budgetKeyFor` allowlist that stops a provider's error text putting an
arbitrary key into the request body, and the absence of prototype pollution
from either. It asserts the hostile input really is parsed through before
asserting the guard held — otherwise it would pass on a parser that returns
`null` for everything.

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
