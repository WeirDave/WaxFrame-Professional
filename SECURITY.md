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

WaxFrame is a **local-first, static, browser-only** application:

- There is no backend and no database. Your documents, API keys, and license key live in your own browser's storage and are never transmitted to any WaxFrame server (there isn't one).
- Because secrets live in browser storage, the most serious class of vulnerability is **anything that can execute script in the page** (XSS) — that could read stored keys. Reports of injection vectors (crafted backups, reference material, custom-AI configs, imported data of any kind) are especially valued.
- Full session backups intentionally contain your content and credentials. This is by design and is clearly warned at export time. Only restore backups you created or trust — the restore warning is intentionally non-dismissable.

## Dependency tracking

WaxFrame self-hosts its front-end libraries as minified files in `lib/` (for air-gapped / offline use). To keep them watched for advisories:

- **PDF.js (`pdfjs-dist`), Mammoth (`mammoth`), and JSZip (`jszip`)** are declared in `package.json` purely so **Dependabot** can alert on known CVEs. That manifest is not a build system — WaxFrame has no build step.
- **SheetJS (`xlsx`)** is *not* tracked via Dependabot. SheetJS no longer publishes to the npm registry (npm is permanently stuck at the old `0.18.5`), so npm-based scanners report stale and misleading results. WaxFrame ships SheetJS from the authoritative SheetJS CDN and its version is tracked manually against <https://cdn.sheetjs.com/>. The shipped version is kept ahead of known advisories.

## Known mitigations in place

- **PDF parsing** runs with `isEvalSupported: false`, closing the CVE-2024-4367 eval code path. (A full PDF.js upgrade to a patched release is tracked separately.)
- **Imported data** (custom AIs, reference material, backups) passes through import-time validation before it reaches any render path.
