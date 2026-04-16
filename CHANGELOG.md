# WaxFrame Changelog

All notable changes to WaxFrame Professional are documented here.

---

## v3.3 — April 15, 2026

### Added
- Quick Add dropdown in the Add Custom AI form with presets for Mistral, Together AI, Cohere, Ollama, and LM Studio. Selecting a provider auto-fills the URL and API format and shows a direct link to that provider's API key console.
- Model field in the Add Custom AI form. The model name is now explicitly specified and sent in every API request body. Previously hardcoded to the string "default" which caused model not found errors on all real endpoints.
- Fetch Models button that queries the provider's /v1/models endpoint and populates a dropdown with real model names. Falls back to manual text input if the fetch fails or the endpoint does not support model listing.
- Test Connection button that fires a real API call before allowing an AI to be added. The Add to Hive button only appears after a passing test.
- Raw request and response panel displayed after every test pass or fail. Shows the exact endpoint, the JSON body sent, the HTTP status code with response time in milliseconds, and the complete raw JSON response from the server.
- Plain-English error hints for common HTTP failure codes: 401/403 (bad key), 404 (wrong endpoint), 405 (method not allowed), 429 (rate limited), and network errors (CORS or unreachable).
- Hide All Defaults button on the setup screen that hides all six default AIs in a single confirmation step. Intended for internal/work deployments where only custom AIs with internal endpoints are needed. Reset to Defaults restores them.
- Perplexity tip about the $5/month recurring API subscription added to api-details.html.
- CHANGELOG.md added to the repository.
- WaxFrame-Getting-Started.pdf added to the repo root — a short novice-friendly guide covering download, unzip, opening index.html, first API key, and running a first round. Designed to be the first thing someone reads after extracting the ZIP.
- WaxFrame-README.pdf added to the repo root — a PDF version of the product overview README for users who want a downloadable copy.
- Three new sections added to waxframe-user-manual.html: "What's in the Folder" (file-by-file explainer for novices, what index.html is, browser explainer, settings storage), "Adding a Custom AI" (full walkthrough of Quick Add, Fetch Models, Test Connection, raw panel, error codes), and "API Costs and Billing" (direct billing model, monthly rate check, popup blocker workaround, Perplexity auto-billing warning, current default model versions).
- wh-table CSS class added to style.css for the file reference table in the user manual.

### Changed
- Merged know-your-hive.html into api-details.html. Both the API key setup guide and the AI personality profiles now live in one document under one button. know-your-hive.html removed from the repo and all references removed throughout the codebase.
- Setup screen button bar reordered: API Key Guide first with lightbulb icon, then Add Custom AI, Hide All Defaults, Open API Websites, Reset to Defaults, Test All Keys — alphabetical after the first.
- Removed all emojis from setup screen buttons.
- Removed Know Your Hive button from button bar and nav menu.
- Updated Learn about tokens link text to Learn about tokens and how to save money.
- Add Custom AI form now scrolls into view and focuses the Quick Add dropdown when opened.
- Changing any field after a passing test resets the flow so stale results cannot be used to add an AI.
- Welcome screen Before You Start info card removed. Replaced with a single hint line directing new users to the Menu for the User Manual and API setup guide. Keeps the welcome screen clean and unintimidating for first-time users.
- Welcome screen hamburger button replaced with a labeled Menu pill showing the hamburger icon and the word Menu. Hover highlights the border, lines, and label in amber with no background fill.
- Welcome screen version badge updated from v3.1 to v3.3.
- Build meta tag updated to 20260415-003.
- Duplicate unlabeled API Key Guide entry removed from the nav menu.
- Both references to tokens-explainer.html in index.html updated to what-are-tokens.html.
- Helper pages comment in style.css updated to reflect the what-are-tokens.html rename.
- Orphaned welcome-info CSS classes removed from style.css (welcome-info-btn, welcome-info-label, welcome-info-row, welcome-info-icon, welcome-info-body, welcome-info-note).

### Fixed
- cfg.extractFn trim is not a function error when testing connection to Mistral and other providers whose response structure differs from standard OpenAI format.
- Model name hardcoded to default in custom AI API calls causing failures on all real endpoints.
- Quick Add name field auto-detection overwriting the preset display name with a URL-parsed hostname.

### Changed
- Merged know-your-hive.html into api-details.html. Both the API key setup guide and the AI personality profiles now live in one document under one button. know-your-hive.html removed from the repo and all references removed throughout the codebase.
- Setup screen button bar reordered: API Key Guide first with lightbulb icon, then Add Custom AI, Hide All Defaults, Open API Websites, Reset to Defaults, Test All Keys — alphabetical after the first.
- Removed all emojis from setup screen buttons.
- Removed Know Your Hive button from button bar and nav menu.
- Updated Learn about tokens link text to Learn about tokens and how to save money.
- Add Custom AI form now scrolls into view and focuses the Quick Add dropdown when opened.
- Changing any field after a passing test resets the flow so stale results cannot be used to add an AI.

### Fixed
- cfg.extractFn trim is not a function error when testing connection to Mistral and other providers whose response structure differs from standard OpenAI format.
- Model name hardcoded to default in custom AI API calls causing failures on all real endpoints.
- Quick Add name field auto-detection overwriting the preset display name with a URL-parsed hostname.

---

## v3.2 — April 15, 2026

### Changed
- Renamed `tokens-explainer.html` to `what-are-tokens.html`. If you are running WaxFrame locally, delete the old file after updating.
- Fixed Gemini billing URL in `api-links.js` — was pointing to `aistudio.google.com/plan_information` (broken); corrected to `aistudio.google.com/apikey` where billing setup actually lives.
- Fixed Grok billing URL in `api-links.js` — was pointing to `console.x.ai/billing` (returns 403 when not authenticated); corrected to `console.x.ai`.

### Added
- Popup-blocked warning banner on `api-details.html`. When clicking Open All Billing Pages or Open All API Consoles, WaxFrame now detects how many tabs the browser actually opened and shows a dismissible notice if any were blocked, with instructions to allow popups.
- Perplexity billing warning on `api-details.html` and `know-your-hive.html`. New users are warned to enable auto-billing and set a low monthly limit at signup — if credits expire without auto-billing active, Perplexity raises the required minimum top-up to $50.
- Billing rate links added to the AI table on `what-are-tokens.html` — each provider now has a Check Rates link opening their billing page directly.
- Rates-change notice added to `what-are-tokens.html` advising users to check billing rates at least monthly as they are subject to change.

---

## v3.1 — April 13, 2026

### Added
- Fuzzy matching for resolved decisions — DeepSeek and Perplexity were re-raising the same conflicts with slightly different wording each round, bypassing duplicate detection. Resolved decisions are now matched by similarity, not exact string.
- Internal-only AI deployment support — default AIs can now be fully hidden or removed for work environments that use only custom AIs with internal endpoints.
- Beginner instructional document covering step-by-step setup from scratch, including the internal/custom-AI-only deployment use case.
- README screenshots added.

### Fixed
- Favicon visibility — previous dark hexagon favicon was nearly invisible on dark browser tabs. Replaced with a higher-contrast icon.

---

## v3.0 — April 14, 2026

### Changed
- Rebranded from AI Hive to WaxFrame. All localStorage keys migrated from `aihive_*` to `waxframe_*`. All filenames, UI labels, and documentation updated.
- Removed Copilot from the default AI list. Default hive is now ChatGPT, Claude, DeepSeek, Gemini, Grok, and Perplexity.

### Fixed
- Removed 2 orphaned JS functions (`toggleAISetup`, `toggleHistItem`) with no remaining callers.
- Removed approximately 354 lines of dead CSS left over from pre-rebrand naming.
- Converted remaining inline styles to class-based approaches using a `setFileStatusState()` helper and modifier classes.

---

## v2.x and earlier

See git history for changes prior to the WaxFrame rebrand.
