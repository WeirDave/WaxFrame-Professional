# WaxFrame Changelog

All notable changes to WaxFrame Professional are documented here.

---

## v3.12.0 — April 16, 2026

### Changed
- Hive section on work screen is now responsive. At viewport widths above 1600px the existing horizontal two-zone bee cards display unchanged. At 1600px and below (laptop/1470px) the card grid is replaced by a compact dot strip — one small circle per AI, border and glow colour reflects live state (amber = Builder, blue = sending, purple = responding, green = done, red = error). An "Edit Hive" button appears in the Hive header at laptop size, opening a simple modal to toggle AIs on and off without leaving the work screen. "Edit Hive" button is hidden at wide viewports where the toggle checkboxes are visible directly on the cards.
- All overlay animations (smoker bee, builder station, hive finish) now scale to approximately 50% at 1600px and below so they fit the laptop viewport without being comically oversized. Builder belt block exit keyframe start/end positions scaled to match.
- Smart icon resolver added. When rendering bee cards, dot strip, or Edit Hive modal, AI icons are matched by name/model keyword against known providers (Claude, ChatGPT/GPT, Gemini, Grok, DeepSeek, Perplexity, Mistral, LLaMA/Meta, Cohere) and the correct local or favicon image is used. AIs that do not match any known provider and would otherwise show a generic globe icon now display a colored initial avatar — a small colored square with the first letter of the AI name, color deterministically derived from the name string.
- `setBeeStatus` now syncs state classes to both the card grid and the dot strip simultaneously.

### Fixed
- Goal textarea now scrolls correctly — `overflow: hidden` changed to `overflow-y: auto`.
- Refine rounds preview panel was collapsed to content height via `align-self: flex-start`, clipping text. Panel is now a flex column that fills available height with `overflow-y: auto` on the text body.

---

## v3.11.9 — April 16, 2026

### Fixed
- Custom AIs imported via Import from Model Server were throwing `cfg.headersFn is not a function` on every round after a page reload. JavaScript functions cannot survive JSON serialization — when the hive is saved to localStorage and restored, `headersFn`, `bodyFn`, and `extractFn` come back as `undefined`. Added a rebuild step in `loadSettings` that detects missing functions and restores the standard OpenAI-compatible implementations, which all Alfredo/OpenWebUI models use.

---

## v3.11.8 — April 16, 2026

### Fixed
- Goal textarea now scrolls correctly within its container — the notebook container scrolls, the textarea grows to content height inside it, and the line number gutter syncs its position via a scroll listener.
- Hive bee cards on the work screen were truncating model names and hiding status text entirely at laptop viewport. Fixed hex-name from flex-shrink:0 to flex:1 so it uses available space. At laptop breakpoint (≤1600px) hex-grid switches to single column so each card has the full panel width, making names and statuses readable. Small 4px gaps restored between doc panel and side panels to fix visual asymmetry.

---

## v3.11.7 — April 16, 2026

### Fixed
- Goal textarea was undersized relative to the "Refine rounds will receive" panel — the panel had a fixed wide width making it larger than the goal box itself. Changed to flex: 3 / flex: 1 ratio so the goal textarea always gets three times the horizontal space of the refine panel at all viewport sizes.

---

## v3.11.6 — April 16, 2026

### Changed
- Setup Page 2 at laptop viewport (≤1480px): length constraint description text hidden to compact the box, "Refine rounds will receive" preview panel hidden so the goal textarea gets the full width, goal area more usable. Footer launch requirement items truncated and font reduced so they stay on one line.

---

## v3.11.5 — April 16, 2026

### Fixed
- Setup Page 2 left column still not scrolling — root cause was `proj-left-main` missing `flex: 1; min-height: 0`, so it was growing to fit its content instead of being height-constrained by its parent. Fixed. Also hid the bee image on the project page at laptop viewport (≤1480px) to recover the vertical space it was consuming, and tightened column padding.

---

## v3.11.4 — April 16, 2026

### Fixed
- Setup Page 2 left column ("Your Project") was not scrollable at laptop viewport sizes — goal field and project fields were unreachable. Left column now scrolls at ≤1480px with tighter padding to recover vertical space.
- "To launch you need" footer compressed to single line at laptop size — items no longer wrap to three lines.

### Changed
- Import from Model Server checklist overlay now shows a live selected count. The "Add to Hive" button updates dynamically (e.g. "Add 5 to Hive") and is disabled with a message until at least 2 models are selected, matching the minimum required to run rounds.
- Setup Page 1 action buttons (API Key Guide, Add Custom AI, Import from Model Server, etc.) are smaller at laptop viewport sizes.

---

## v3.11.3 — April 16, 2026

### Fixed
- Import from Model Server checklist was buried below a massive raw response panel with no usable scroll — on any viewport the received JSON could be 16,000+ lines tall, pushing the checklist so far down the elevator bar would skip past it entirely. The raw panel received section is now height-capped. The checklist has been moved out of the import modal entirely into its own full-screen overlay that opens after a successful fetch. Fetch the models, see the raw debug info in the modal, then click "Select & Add to Hive →" to open the full-screen checklist overlay where you can check/uncheck models with plenty of room.

---

## v3.11.2 — April 16, 2026

### Fixed
- Import from Model Server checklist was showing the raw model ID duplicated twice on every row (e.g. `anthropic.claude-3-7-sonnet-20250219-v1:0 anthropic.claude-3-7-sonnet-20250219-v1:0`). The Alfredo/OpenWebUI response format includes a separate `name` field (e.g. `[Base] Claude-3-7-Sonnet`) alongside the `id`. The parser now extracts both — `id` is stored as the model identifier sent to the API, `name` is used as the display label and pre-fills the editable name input. The checklist now shows friendly names on the left and the raw ID as the checkbox value.

---

## v3.11.1 — April 16, 2026

### Fixed
- Syntax error in the AI setup row template literal caused by double-escaped backslashes (`\\'`) introduced during the v3.11 row restructure. Prevented `app.js` from parsing entirely — no buttons, menus, or interactions worked on load. Corrected to single-level escapes and verified clean.

---

## v3.11 — April 16, 2026

### Fixed
- `testAllKeys` was throwing `ReferenceError: testAllKeys is not defined` — the function was never implemented despite the button existing. Now fully built: loops all AIs with saved keys sequentially, shows a live result panel with per-AI pass/fail status, and displays a summary when done.
- Import from Model Server checklist was not visibly scrollable after fetching large model lists (e.g. 37 models from Alfredo). Added `max-height: 340px` with `overflow-y: auto` to the checklist items container so models scroll within the box rather than pushing content off screen.
- Import from Model Server modal was clipping at the top on laptop viewports. Modal now uses `overflow: hidden` with flex column layout. Overlay `:has(.import-server-modal)` zeroes the padding so the modal is properly full-bleed.

### Changed
- AI setup row (Setup Page 1) restructured to a two-line layout. Icon and full model name now span the top row with no width cap — previously truncated at 110px, making long enterprise model IDs like `bedrock/us-gov.anthropic.claude-sonnet-4-5-20250929-v1:0` completely unreadable. Key field, eye, clear, and test buttons sit on the second row. Action and link buttons moved to the top row.
- Setup Page 2 bee images compress to 160×160px at laptop breakpoints (≤1480px) and footer padding reduces to recover vertical space for the form fields.
- Mute button added to the navigation menu. Toggles all WaxFrame sounds (round complete, Rosie beeps, clang). State persists in localStorage across sessions. Button label reflects current state.

---

## v3.10 — April 16, 2026

### Fixed
- Honeycomb background was invisible on the work screen because style.css referenced stale filenames (AI_Hive_Honeycomb_BG_Dark.png / AI_Hive_Honeycomb_BG_Light.png). Updated all three references to the correct filenames (WaxFrame_Honeycomb_BG_Dark.png / WaxFrame_Honeycomb_BG_Light.png).
- Builder AI output is now sanitized before being written to the working document textarea. Non-compliant models (Grok, certain corporate proxy endpoints) were echoing the WAXFRAME prompt envelope — header, PROJECT CONTEXT block, CURRENT DOCUMENT label, and line-numbered scaffolding — back into the document body. New stripBuilderEnvelope() function strips these patterns after extractDocument() in both Builder code paths.

### Changed
- NO CHANGES NEEDED reviewer threshold tightened. Previously the refine reviewer prompt invited AIs to return NO CHANGES NEEDED whenever the document "reads clearly and accurately," causing gpt-4o and similar models to converge prematurely. Replaced with a stricter requirement: reviewers must justify why every individual line cannot be improved before returning this response.
- Dual clock redesign: the two separate ROUND and PROJECT clock widgets have been replaced with a single unified dual-face clock widget (dual-clock-widget). Both faces share one bezel — ROUND on the left with green running state, PROJECT on the right with amber running state and play/pause controls. More compact, cleaner at all viewport sizes.
- Responsive layout overhaul: work-main grid now uses minmax() column definitions so side panels compress gracefully as viewport shrinks. Doc panel remains fixed at 80ch at all sizes. Breakpoints at 1700px, 1500px, and 1480px progressively compress the right panel logo and clock digits. Supports full range from 1470px laptop to 5120px ultrawide.

---

## v3.9 — April 16, 2026

### Added
- Close button (✕) added to the Import from Model Server modal.
- Upgrade warning added to the "Your settings are saved in your browser" section of the user manual explaining that settings are tied to the folder path and will not carry over if WaxFrame is opened from a new folder location.

### Changed
- Import from Model Server modal now has two separate URL fields — Chat Endpoint (used during rounds) and Models Endpoint (used to fetch the model list). Typing a chat endpoint auto-derives the models endpoint when possible. Quick Add presets fill both fields with their correct full paths.
- Quick Add preset dropdown options now show what URLs they will fill in so users know exactly what will be set before selecting.
- Import from Model Server presets updated to fill complete endpoint paths in both fields.

### Fixed
- Bulk-added AI IDs were colliding when many models were added at once because Date.now() returned the same value inside a fast forEach loop. Fixed by capturing the timestamp once before the loop and using the array index to guarantee uniqueness.
- Chat endpoint for bulk-added AIs was being built incorrectly — the URL entered in the form is now used directly as the endpoint with no path manipulation.
- Raw panel in Import from Model Server modal now persists after input field changes, only clearing on open and close.

---



### Fixed
- Import from Model Server modal — model name labels no longer get cut off. Items now wrap so long model IDs display in full. Label uses flex: 1 1 260px with word-break: break-all instead of a fixed min-width.
- Raw panel added to Import from Model Server modal matching the Add Custom AI pattern. Shows endpoint called, HTTP status, and full JSON response on both success and failure.
- URL field placeholder updated to make clear the base URL should be entered with no path suffix.

---

## v3.7 — April 15, 2026

### Added
- Import from Model Server feature. New button on the setup screen opens a modal where users enter a server URL and key, click Fetch Models, and get a checklist of every model available on that server. Each checked model is added as its own individual AI row in the hive with its own name field. Quick Add presets for Open WebUI, Ollama, and LM Studio auto-fill the URL. Handles both OpenAI-style /v1/models and Open WebUI /api/models response formats.

### Fixed
- Custom AI config not surviving page reload. saveHive was only persisting keys and model names for custom AIs, dropping the full config on page reload. Now serializes the complete config for each custom AI excluding the key so everything is correctly restored after a refresh.

---

## v3.6 — April 15, 2026

### Fixed
- Custom AI endpoint double-append fixed. When a user enters a URL that already ends in /v1/chat/completions, the app was appending /v1/chat/completions again, causing 404 errors. Auto-append removed entirely — the URL field is now used exactly as entered.
- All Quick Add presets (Mistral, Together AI, Cohere, Ollama, LM Studio) updated to include their full correct endpoint paths so they work out of the box without any behind-the-scenes URL manipulation.
- Cohere preset URL corrected from api.cohere.com to api.cohere.ai/compatibility/v1/chat/completions.

---

## v3.5 — April 15, 2026

### Added
- Eyeball toggle button added to the API Key field in the Add Custom AI modal. Reuses the existing ai-eye-btn style and pattern. Added toggleCustomAIKeyVis() to app.js and custom-ai-key-wrap CSS to style.css.

### Changed
- AI_Hive_-_Prompts_Reference_Document_v2.txt renamed to WaxFrame_Prompts_Reference_v3.txt. All "AI Hive" references replaced with "WaxFrame". Copilot removed from the provider list. Majority Rules description in Prompt 5 rewritten to use strict majority of however many AIs are active — no hardcoded numbers. Version and build stamp updated to v3.0 / 20260415-001.
- docs/ subdirectory created. WaxFrame_Playbook_Round_Count_Tests.txt, WaxFrame_Prompts_Reference_v3.txt, WaxFrame-Getting-Started_v2.docx, and WaxFrame-README_v2.docx moved from repo root into docs/.
- File table in waxframe-user-manual.html updated to list docs/, screenshots/, and sounds/ folders. WaxFrameREADME_v2.pdf added as a listed file alongside the Getting Started PDF.

### Fixed
- Launch WaxFrame and Continue to Project Setup buttons no longer stretch to fill the footer grid column. Fixed by targeting .btn-cta in .fs-footer instead of .btn-accent, and adding width: fit-content. Inactive button state (before requirements are met) now renders as a solid-outlined button matching the active button's size and position.

---

## v3.4 — April 15, 2026

### Added
- Add Custom AI form converted from inline panel to modal overlay, matching the existing modal pattern throughout the app.
- Raw response panel in the Add Custom AI modal now stays open between test attempts so users can compare results without it collapsing.
- Raw response panel max height increased to prevent long responses from being truncated.
- API Costs and Billing section added to the user manual covering direct billing model, how to check rates, popup blocker workaround, and Perplexity auto-billing warning.
- Free Trial and Licensing section added to the user manual explaining the 3 free rounds, how to purchase, and how to enter a license key.
- Two new troubleshooting blocks added to the user manual: "You can't start a round" (two-key minimum and Builder requirement) and "A provider link or signup page has moved" (directs users to the in-app API Key Guide for current links).
- Bookmark tip in the user manual expanded to include Windows Send To Desktop and macOS/Linux instructions, matching the Getting Started guide.
- Menu label added to the welcome screen hamburger button — now displays as a pill showing the icon and the word Menu.
- WaxFrame-Getting-Started.pdf rebuilt and source docx added to repo.
- WaxFrame-README.pdf rebuilt and source docx added to repo.

### Changed
- Welcome screen cleaned up — Before You Start info card removed, replaced with a single hint line directing new users to the Menu.
- Nav menu duplicates and stale links removed. Duplicate unlabeled API Key Guide entry removed.
- Version badge updated to v3.4. Build stamp updated to 20260415-004.

### Fixed
- Missing .welcome-hamburger CSS rule added to style.css — hamburger button was present in HTML but had no positioning rule so it was invisible.
- Back-to-top link visibility fixed in light mode on helper pages.
- Spelling errors corrected throughout.
- Duplicate Changed and Fixed sections in the v3.3 CHANGELOG entry removed.

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
- Free Trial and Licensing section added to waxframe-user-manual.html explaining the 3 free rounds, how to purchase a license key, and how to enter it.
- License section added to the nav menu with Enter License Key (opens license modal) and Buy WaxFrame Pro (links to Gumroad). Displayed as its own labeled section above Reference.
- nav-item-accent CSS class added for the Buy WaxFrame Pro nav item — amber text, solid amber background on hover.
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
