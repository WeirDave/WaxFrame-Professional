# Security Policy

## Reporting a vulnerability

If you find a security vulnerability in WaxFrame, **please report it privately** — do not open a public issue, since a public issue tips off potential attackers before a fix is out.

Use GitHub's **private vulnerability reporting**: go to the
[Security tab](https://github.com/WeirDave/WaxFrame-Professional/security)
and click **Report a vulnerability**. This opens a private channel visible only to the maintainer.

Please include:

- What the vulnerability is and where it lives (file / feature / version).
- Steps to reproduce, or a minimal proof of concept.
- The build stamp shown in the app footer / About modal (e.g. `20260527-023`).

You'll get an acknowledgment as soon as it's seen. Confirmed issues are patched on a priority basis and credited in the release notes unless you ask otherwise.

## Supported versions

WaxFrame ships continuously; only the **latest released version** is supported for security fixes. The current version is shown in `js/version.js` (`APP_VERSION`) and on GitHub Releases. If you're running an older build, update before reporting.

## Scope and design notes

WaxFrame is a **local-first, static browser application** with one disclosed relay:

- There is no WaxFrame account, document database, or telemetry backend. Your documents, API keys, and license key live in your browser storage. When you run an AI request, its content and credential go to the selected provider; Claude requests pass through the WaxFrame-operated Cloudflare relay because Anthropic does not permit the required direct browser CORS flow. The relay sees the request in transit but does not log or persist it.
- Because secrets live in browser storage, the most serious class of vulnerability is **anything that can execute script in the page** (XSS) — that could read stored keys. Reports of injection vectors (crafted backups, reference material, custom-AI configs, imported data of any kind) are especially valued.
- Full session backups intentionally contain your content and credentials. This is by design and is clearly warned at export time. Only restore backups you created or trust — the restore warning is intentionally non-dismissable.

## Known, accepted, and mitigated

One vendored dependency is pinned below a published fix and cannot be upgraded. It is disclosed here so nobody spends time rediscovering it.

**PDF.js 3.11.174, used only by the portable `file://` copy** - below the fix for GHSA-wgrm-67xf-hhpq (CVE-2024-4367). It cannot be upgraded: `pdfjs-dist` has published an ES-module build only since 4.x, and browsers refuse module imports across `file://` origins, so no later release can load from a local folder at all. Moving off it would require adding a build step, which this project deliberately does not have.

The mitigation is `isEvalSupported: false`, passed wherever a PDF is opened. The release check asserts it at every such call site and fails the build if one is missing, so it cannot be dropped silently during an unrelated edit.

The copy served over the web is unaffected - it runs a current PDF.js and is past every published advisory, including GHSA-hq66-cqwq-w95j, which covers several releases in the same major version.

If you can demonstrate script execution through the portable PDF path despite that mitigation, that is a genuine finding and very much worth reporting.

## Dependency tracking

WaxFrame self-hosts its front-end libraries as minified files in `lib/` (for air-gapped / offline use). To keep them watched for advisories:

- [`docs/vendored-dependencies.json`](docs/vendored-dependencies.json) records every executable bundle, its identified upstream version, license, and SHA-256 hash. The release check fails on an unlisted or changed bundle.
- `lib/docx.min.js` carries no version string of its own, so its version was established by matching: every docx release in the plausible window had its published browser bundle hashed against ours. It is **9.7.1**, and it is now declared for Dependabot like the others. The file is not byte-identical to the published artifact - the UMD wrapper was replaced locally with a plain IIFE - so its recorded hash will never match upstream. That is expected, and is recorded next to the version so it does not read as tampering. When upgrading, take the published bundle from the new release and re-apply the same wrapper change.

- **PDF.js (`pdfjs-dist`), Mammoth (`mammoth`), JSZip (`jszip`) and docx (`docx`)** are declared in `package.json` purely so **Dependabot** can alert on known CVEs. That manifest is not a build system — WaxFrame has no build step.
- **SheetJS (`xlsx`)** is *not* tracked via Dependabot. SheetJS no longer publishes to the npm registry (npm is permanently stuck at the old `0.18.5`), so npm-based scanners report stale and misleading results. WaxFrame ships SheetJS from the authoritative SheetJS CDN and its version is tracked manually against <https://cdn.sheetjs.com/>. The shipped version is kept ahead of known advisories.

## Known mitigations in place

- **PDF parsing** runs with `isEvalSupported: false` as defense-in-depth on the eval code path that CVE-2024-4367 targeted. Hosted users (`http(s)://`) load pdf.js **4.10.38** (CVE fixed at library level); portable users (`file://`) load the classic-script pdf.js **3.11.174** build and rely on the runtime `isEvalSupported: false` mitigation. The runtime split is dispatched at page load by [`js/pdf-loader-bootstrap.js`](js/pdf-loader-bootstrap.js).
- **Imported data** (custom AIs, reference material, backups) passes through import-time validation before it reaches any render path.
