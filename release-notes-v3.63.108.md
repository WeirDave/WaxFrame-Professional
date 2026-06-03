# Schema.org structured data + helper-page body-copy linking continuation

Build: `20260603-001`
Released: `2026-06-03`

Batched helper-page SEO release. Adds structured data to the two highest-traffic reference pages and continues the body-copy internal-linking sweep started in v3.63.104. No app-side code changes — `index.html` setup flow, Worker Bees, Builder, work screen, session storage, callAPI, audio, all untouched.

---

## FAQPage JSON-LD on What Are Tokens?

`what-are-tokens.html` is already structured as plain-language Q&A on six topics. Four of the existing `<h3>` headings were rephrased into explicit question form so that each `FAQPage` entry mirrors a visible heading + answer pair exactly (Google penalizes JSON-LD that doesn't match on-page content):

| Before | After |
|--------|-------|
| `A practical example` | `How many tokens does a typical WaxFrame round use?` |
| `Gemini's free tier vs. paid tier — read this if you've added a credit card` | `Does Gemini stay free after I enable billing on AI Studio?` |
| `Tips for managing token costs` | `How do I keep AI token costs under control?` |
| `Reference material and your token budget` | `How does Reference Material affect my token budget?` |

The existing `What is a token?` and `Why does token usage matter for your Builder?` (lightly retitled from `Why does this matter for your Builder?` for consistency) were already Q-shaped. Six total `Question` / `acceptedAnswer` pairs ship in a single `<script type="application/ld+json">` block in `<head>`.

## HowTo JSON-LD on the API Key Guide

`api-details.html` carries setup instructions for nine providers (ChatGPT, Claude, Gemini, Grok, Mistral, Perplexity, Cohere, DeepSeek, Together AI). Each provider section now has its own `HowTo` entry in a single `@graph` JSON-LD script in `<head>`. Each `HowToStep` mirrors the visible `<ol class="steps">` content of its provider section. First step in each `HowTo` carries the provider's console `url` so the structured data points back at the authoritative source.

## Body-copy internal linking continuation

The v3.63.104 sweep added template-catalog cross-links from `waxframe-user-manual.html` and `document-playbooks.html`. This release closes the remaining gaps that page context allows:

- `what-are-tokens.html` → `api-details.html` — the "Bottom line: use a paid API key for your Builder" tip in the practical-example card now points at the API Key Guide.
- `api-details.html` → `what-are-tokens.html` — the "Your Builder is the most important choice" general-tips paragraph now points at What Are Tokens? for the cost detail.
- `document-playbooks.html` → specific template anchors on `templates.html` — five high-SEO-value playbooks (`cover-letter`, `resume`, `business-proposal`, `rfp`, `product-review`) gain inline "Apply it directly in WaxFrame from the X template ↗" links in their description blocks.

## Per-template anchors on the Template Catalog

`renderTemplateCard` in `templates.html` now stamps `id="tpl-${t.id}"` on every `<article class="tpl-card">`, so deep-links like `templates.html#tpl-cover-letter` resolve directly to the matching template card. Enables the five playbook → template links above and makes the existing `ItemList` JSON-LD's per-template URLs land on a real anchor instead of falling back to the category section.

## Verification

- `node --check` clean across all 15 JS files.
- JSON-LD blocks validated as well-formed JSON.
- FAQPage `Question.name` strings match the visible H3 text on `what-are-tokens.html` exactly.
- HowTo `HowToStep.text` closely mirrors visible `<ol class="steps">` content on `api-details.html`.

## Files Changed

| File | Changes |
|------|---------|
| `what-are-tokens.html` | FAQPage JSON-LD added (6 entries); 5 H3 rephrases to Q-shape; 1 body-prose link to `api-details.html` |
| `api-details.html` | HowTo `@graph` JSON-LD added (9 provider entries); 1 body-prose link to `what-are-tokens.html` |
| `document-playbooks.html` | 5 inline template-anchor links inside `.dp-playbook-desc` blocks (cover-letter, resume, business-proposal, rfp, product-review) |
| `templates.html` | `renderTemplateCard` adds `id="tpl-${t.id}"` to every `<article class="tpl-card">` |
| `js/version.js` | `APP_VERSION` → `v3.63.108 Pro`; build header |
| `js/app.js` | `BUILD` constant; build header |
| All 13 other JS file headers | Build stamp sweep |
| `style.css` | Build header |
| All 10 HTML files | `meta name="waxframe-build"` stamp + `?v=` cache-bust sweep |
| `CHANGELOG.md` | Prepended v3.63.108 entry |
| `docs/WaxFrame_Backlog_Master_v177.txt` | Backlog bump; dropped stale "Mobile bridge landing page" and ".footer-version-pill duplicate" entries; captured remaining-17 playbook link sweep |
