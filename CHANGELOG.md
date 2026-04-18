# WaxFrame Changelog

All notable changes to WaxFrame Professional are documented here.

---

## v3.13.3 — April 17, 2026

### Fixed
- **All three text areas now identical width — ch unit font mismatch** — The working document panel has `font-family: 'Courier New'` on it so `80ch` resolves to Courier New character widths. `proj-ta-editor` had no font set, so `ch` resolved against DM Sans making both the goal and paste boxes wider than the working doc. Added `font-family: 'Courier New', Courier, monospace; font-size: 13px` to the base `.proj-ta-editor` rule and to `.goal-split-left` in the desktop `@media (min-width: 1601px)` block. Updated `#panel-paste .proj-ta-editor` width formula to `calc(44px + 80ch + 8px + 12px + 32px)` — identical to the working document panel formula.

---

## v3.13.3 — April 17, 2026

### Fixed
- **Laptop setup page 2: 32px phantom middle gap and uneven column padding** — `.fs-divider { width: 0 }` zeroed the element but the grid track was still declared as `32px` in `fs-body`'s `grid-template-columns: 1fr 32px 1fr`, so each content column was only getting `(available − 32px) / 2` width and a 32px dead zone sat between them. Fixed by adding `grid-template-columns: 1fr 0px 1fr` to the `fs-body` laptop override, collapsing the divider track entirely. Also added symmetric `8px` horizontal padding to `proj-static-top` (`10px 8px 6px`) and `proj-goal-flex` (`0 8px`) at ≤1600px so the left column content has the same breathing room as the right column's `proj-right-scroll` padding.

---

- **Laptop: setup page 1 button heights reduced** — Tightened padding to `3px 9px` (was `5px 10px`) at ≤1600px. Font size unchanged at 11px.
- **Laptop: right column 1px horizontal scroll eliminated** — Changed `fs-col { padding: 4px }` to `padding: 4px 0` (vertical breathing room kept, horizontal padding removed so columns get full track width). Added `overflow-x: hidden` on `#panel-paste .proj-ta-editor` at ≤1600px to prevent any 1px inner content overflow from generating a scrollbar. Restored `proj-right-scroll` to `display: block; overflow-y: auto` and `#panel-paste` to `display: block` at laptop to preserve scroll behaviour.
- **Desktop: project goal textarea width = working document** — Changed `.goal-split-left` flex-basis from `calc(44px + 80ch + 20px)` to `calc(44px + 80ch + 8px + 12px + 32px)` — matching the working document panel formula exactly. The refine rounds panel now absorbs the additional space to the right.
- **Desktop: paste panel expands to fill right column height** — Changed `#panel-paste .proj-ta-editor` from `flex: none; height: 420px` to `flex: 1; height: auto; min-height: 0`. Added flex column chain on `proj-right-scroll` (display: flex, overflow: hidden), `.proj-right-scroll > .doc-tab-panel.active` (flex: 1), and `#panel-paste` (flex: 1) so the paste editor fills the available column height to match the project goal panel. All reversed at ≤1600px.

---



---



### Fixed
- **Light mode white artifact** — Removed `border-radius` from `.fs-col-main`. The outer `.fs-col` already clips children at the same radius via `overflow: hidden`, so both elements having `border-radius: 14px` created a double-rounding effect where a thin white slice of `fs-col-main`'s background was visible against the slightly different `surface2` background in light mode. Dark mode was unaffected because the contrast between `surface` and `surface2` is negligible in dark.
- **Goal textarea side scrolling** — On large monitors the `goal-split-left` panel is narrowed by the refine panel (160–240px) plus gaps and padding, making 80ch + gutter wider than the available space. Added `.goal-split-left .proj-ta-inner` and `.goal-split-left .proj-ta` overrides so the goal textarea fills available width instead of forcing a fixed 80ch that causes horizontal overflow. Paste textarea retains exact 80ch (right column has the full column width available).

### Added
- **Version stamp below tagline on all screens** — `APP_VERSION` now appears directly below "Many minds. One refined result." in the center header brand on both setup screens. Removed from the right-side step badge (which was the only previous location on setup screens) to avoid redundancy.
- **Version stamp in header on all helper pages** — `api-details.html`, `what-are-tokens.html`, `waxframe-user-manual.html`, `document-playbooks.html`, and `prompt-editor.html` now show the version stamp below the page title in the header brand block. Previously only appeared in the page footer.
- New CSS rules: `.fs-header-brand .app-version-stamp` and `.page-header-brand .app-version-stamp` for consistent, small muted version display in all header contexts.

---



### Fixed
- **80ch width on goal and paste textareas** — `proj-ta-inner` and `proj-ta` now mirror `work-doc-inner` and `work-doc-ta` exactly, using `width: calc(80ch + 8px + 12px)` with `flex: 0 0 auto` on the inner wrapper. Previously `width: 100%` with `box-sizing: border-box` was causing the padding to eat into the character count, making both editors wrap short of 80ch.
- **Paste text panel scrolling the whole column** — `proj-ta-editor` inside `#panel-paste` is now given a fixed `height: 420px` with `flex: none`, so the editor scrolls its own content instead of letting the parent column scroll. The right column scroll still handles all other content above the editor.
- **Refine truncation looking both ways** — `truncateGoalForRefine` now looks backward from 300 chars for a sentence boundary, and if none is found above 200 chars, looks forward up to 450 chars for the next sentence end. Falls back to last whole word before 300 if neither direction finds a boundary. Previously it hard-cut at exactly 300 chars when no backward boundary was found.

---



### Fixed
- Goal textarea and paste textarea now correctly use the `proj-ta-*` scroll architecture (outer scrolling container, growing inner row with notebook paper, sticky gutter). Previously the HTML still referenced the old `proj-notebook-goal` / `proj-notebook-nums` / `proj-goal-ta` / `proj-notebook-ta` classes which had been partially deleted from CSS, causing both editors to break. HTML restructured to match the correct `proj-ta-editor > proj-ta-scroll > proj-ta-nums + proj-ta-inner > proj-ta` pattern.
- Orphaned CSS classes `proj-notebook-goal`, `proj-notebook-nums`, `proj-goal-ta`, and `proj-notebook-ta` removed from `style.css`. `proj-notebook` retained for the scratch panel only.
- `updateProjLineNums` simplified — no longer attempts to wire scroll events to `.proj-notebook-goal` (which no longer exists). Sticky gutter handles visibility automatically.

### Added
- Laptop refine preview popover: at ≤1600px the `goal-split-right` sidebar panel hides and an amber **▸ Refine Preview** button appears in the Project Goal header row. Clicking it toggles a popover showing the same sentence-trimmed preview content. Button and popover auto-hide when the goal drops back under 300 chars. `toggleRefinePopover()` added to `app.js`. `updateGoalCounter()` updated to sync both the sidebar panel (large screen) and the popover content (laptop).

---

## v3.12.9 — April 17, 2026

### Changed
- `version.js` added as the single source of truth for `APP_VERSION`. All pages now load this file — `index.html` loads it before `app.js`, and each helper page loads it at the bottom and runs a one-liner stamp loop. To update the version number across the entire app, change one line in `version.js` and commit. Nothing else needs to touch the version string.
- Version stamp now appears on all four screens in `index.html` (Welcome, Setup Step 1, Setup Step 2, Work topbar) and in the footer of all five helper pages (`api-details.html`, `what-are-tokens.html`, `waxframe-user-manual.html`, `document-playbooks.html`, `prompt-editor.html`).
- `APP_VERSION` removed from `app.js` — it is now sourced from `version.js`.
- `style.css`: `.welcome-version` renamed to `.app-version-stamp`. Added `.page-footer-right`, `.page-footer-left`, `.helper-version-stamp`, and `.work-version-stamp` CSS classes. Helper page footers restructured to support the right-aligned version stamp layout.

---

## v3.12.7 — April 17, 2026

### Changed
- `APP_VERSION` constant added to `app.js` as the single source of truth for the human-readable version string. On load, it is written into the welcome screen version badge and the browser tab title. The hardcoded version text has been removed from `index.html` — the span is now populated by JavaScript only. To update the version, change `APP_VERSION` in `app.js`; it propagates everywhere automatically.

---

## v3.12.2 — April 17, 2026

### Fixed
- Goal textarea scrolling finally resolved. Root cause was the textarea having both `proj-notebook-ta` and `proj-goal-ta` classes — `proj-notebook-ta` (which comes later in the CSS) was overriding `proj-goal-ta` with `overflow: hidden`, `height: auto`, and `width: 80ch`, silently winning every time. Removed `proj-notebook-ta` from the goal textarea in HTML. The goal textarea now uses only `proj-goal-ta` for all its sizing.
- Builder belt blocks were crowding together with large hives (8+ AIs). Belt now caps at 5 visible blocks regardless of hive size, and the duration floor increased from 7s to 10s with 3s per block (up from 2.4s). Blocks stay visually separated at all viewport sizes.

### Changed
- Builder dot (laptop dot strip) now fills solid gold when that AI is the Builder, making it clearly identifiable in both dark and light mode. Previously only the border ring was amber which was invisible against the honeycomb background in light mode.
- Dot strip container now has a solid semi-transparent dark background so the dots and their state rings are readable regardless of the honeycomb behind them. Adjusts in light mode.

---

## v3.12.1 — April 16, 2026

### Fixed
- Goal textarea now correctly scrolls. Root cause was the flex chain — `goal-split-left` was missing `min-height: 0`, preventing the notebook container from being height-constrained. Also removed `height: auto` from the textarea (replaced with `align-self: stretch`) and removed the fixed `min-height: 140px` from `proj-notebook-goal` so the container defers to the flex parent for sizing.
- Refine rounds preview panel now scrolls. Same broken flex chain — `goal-split-left` missing `min-height: 0` was the blocker. The panel CSS was already correct; the chain above it wasn't passing the height constraint down.
- Nav menu now scrolls on short screens. Nav panel outer shell gets `overflow: hidden`; all items wrapped in a `nav-body` inner div with `flex: 1; overflow-y: auto` so the list scrolls while the header stays fixed.
- Change Builder modal now scrolls when AI list is too tall for the viewport. Added `max-height: 85vh; overflow-y: auto` to `.change-builder-modal`. Changed `finish-modal-overlay.active` to `align-items: flex-start` so tall modals pin to the top of the overlay rather than being clipped by centering.

### Changed
- Mute button moved from the nav menu to the work screen footer, sitting to the left of the theme toggle buttons. Same pill shape as the theme buttons. Shows 🔊 when sounds are on, 🔇 when muted, with amber highlight when muted. Mute state still persists in localStorage across sessions.

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
