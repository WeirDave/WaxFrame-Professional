# Audit-driven patch: broken Settings nav, stale JSON-LD version, per-template anchor migration

Build: `20260603-002`
Released: `2026-06-03`

Pre-pricing-page audit of the entire site surfaced five real issues. This release ships those fixes — no new features, no app-side code changes.

---

## Broken Settings nav link on all 8 helper pages

Every helper page's hamburger nav menu had a `⚙ Settings` link pointing at `index.html#settings`, but that anchor doesn't exist in `index.html`. The actual Settings anchor lives at `waxframe-user-manual.html#settings` (the Settings section inside the User Manual). All 8 helper pages now point at the correct destination:

- `api-details.html`
- `document-playbooks.html`
- `privacy.html`
- `prompt-editor.html`
- `templates.html`
- `terms.html`
- `waxframe-user-manual.html`
- `what-are-tokens.html`

## Stale JSON-LD `softwareVersion` on `index.html`

The `SoftwareApplication` structured-data block declared `"softwareVersion": "3.63.107"` after v3.63.108 shipped. The v3.63.108 cache-bust + meta-build sweep caught `?v=3.63.107` and `20260602-010` references but missed this one inside the JSON-LD. Now reads `"3.63.109"`.

## Per-template anchor migration on `templates.html` ItemList JSON-LD

v3.63.108 added per-template anchors `id="tpl-${t.id}"` to every template card, but the existing runtime-generated `ItemList` JSON-LD (rendered by `js/templates.js`) was still emitting category-section URLs: `templates.html#${catSlug(cat)}`. Migrated to `templates.html#tpl-${t.id}` so Google's "Document templates" rich-snippet entries deep-link to each specific template card instead of stopping at the category header. This is the rich-snippet win the v3.63.108 release notes called out.

## Stale code comments

Two non-load-bearing comments cleaned up:

- `index.html:2615` — mobile-overlay comment said "See release-notes-v3.63.104 for the funnel reasoning." That file doesn't ship in the repo (only `release-notes-v3.63.108.md` does). Updated to reference `CHANGELOG.md`.
- `style.css:8166` — Helper Pages section header listed `tokens-explainer, api-details, prompt-editor`. `tokens-explainer.html` was renamed to `what-are-tokens.html` in an earlier release; the comment didn't follow. Now correct.

## Audit dimensions verified clean

- All 39 image references resolve.
- All 18 DM Sans font files referenced in `style.css` exist.
- All 19 JavaScript/lib files referenced in HTML exist.
- All `sitemap.xml` URLs correspond to real HTML files.
- `<meta>` coverage complete and consistent across all 10 release HTMLs (title, description, canonical, OG quartet, Twitter card, `waxframe-build`).
- All 3 static JSON-LD blocks (`SoftwareApplication`, `FAQPage`, `HowTo @graph`) parse as valid JSON. FAQPage `Question.name` strings match visible `<h3>` text exactly. HowTo step text closely mirrors visible `<ol class="steps">` content.
- No hardcoded hex outside CSS custom properties (theme tokens).
- No inline CSS violations outside audited exceptions (`display:none` on file inputs/modals/dev toolbar + snowflake `--sx`/`--fall` seed vars).

## Files Changed

| File | Changes |
|------|---------|
| `index.html` | JSON-LD `softwareVersion` 3.63.107 → 3.63.109; mobile-overlay comment refresh |
| `api-details.html`, `document-playbooks.html`, `privacy.html`, `prompt-editor.html`, `terms.html`, `waxframe-user-manual.html`, `what-are-tokens.html` | `⚙ Settings` nav link target repointed |
| `templates.html` | `⚙ Settings` nav link target repointed; ItemList JSON-LD URL pattern migrated to per-template anchors |
| `style.css` | Helper Pages section comment refresh; build header |
| `js/version.js` | `APP_VERSION` → `v3.63.109 Pro`; build header |
| `js/app.js` | `BUILD` constant; build header |
| All 13 other JS file headers | Build stamp sweep |
| All 10 release HTMLs | `meta waxframe-build` stamp + `?v=` cache-bust sweep |
| `package.json` | 3.63.108 → 3.63.109 |
| `CHANGELOG.md` | Prepended v3.63.109 entry |
| `docs/WaxFrame_Backlog_Master_v178.txt` | Backlog bump; v3.63.109 state captured |
