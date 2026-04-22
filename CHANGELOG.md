# WaxFrame Professional — Changelog

---

## v3.18.4 Pro — Build `20260421-005`
**Released:** April 21, 2026

### New Features

**Dev toolbar — convergence sequence test buttons**
Added three buttons to the dev toolbar for previewing the hive-finish convergence sequence without running a real round. `▶ Fly-in` plays the bee overlay silently (4s, 10 puffs) for animation-only preview. `▶ Majority` mirrors the majority-convergence trigger used in `runRound()` when some AIs still have suggestions — calls `playFlyingCarSound()` plus `showHiveFinish({ duration: 4000, smokeBursts: 10 })`. `▶ Unanimous` mirrors the full-agreement trigger — calls `playFlyingCarSound()` plus `showHiveFinish({ duration: 5000, smokeBursts: 14 })` and opens the finish modal at T+1800ms. Three helpers (`devTestFlyInOnly`, `devTestMajorityConverge`, `devTestUnanimous`) added to `app.js` directly after `hiveRand`. No production flows touched; dev mode only.

### Files Changed
`index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.18.3 Pro — Build `20260421-004`
**Released:** April 21, 2026

### Copy

**Setup 3 and Goal Info modal — Document type tips rewritten**
Both tips describing how the Document type field behaves were worded awkwardly — one referred to the "assembled brief" and the other to an instruction being "included when a document exists," terminology that did not match the surrounding modal copy. Rewrote both to use the established vocabulary (*assembled goal*, *300-character trim*) and to describe the behavior in concrete user terms rather than internal terms. Audited every other tip across `index.html`, `document-playbooks.html`, `api-details.html`, `waxframe-user-manual.html`, `what-are-tokens.html`, and `README.md` — all read cleanly and were left alone.

### Maintenance

**Build stamp reconciliation**
`app.js` header comment was stale at `20260421-001` while `index.html` meta and CHANGELOG were already at `20260421-003`. Bumped all four stamp locations to `20260421-004`: `index.html` meta `waxframe-build`, `index.html` `app.js?v=` cache-bust, `app.js` header comment, and `app.js` `BUILD` constant.

### Files Changed
`index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.18.2 Pro — Build `20260421-003`
**Released:** April 21, 2026

### New Features

**Finish modal — Start New Project export safety check**
Clicking Start New Project now checks whether any export has occurred in the current finish modal session. If content exists in the working document and nothing has been exported, a confirm dialog blocks the action. Dialog wording explicitly labels Cancel as the safe path (go back and export) and OK as the destructive path (discard everything). Export flag is set by all three export functions and resets each time the modal opens.

### Bug Fixes

**Finish modal — button color system restored**
Export Document, Export Full Transcript, and Save Session Snapshot restored to identical amber dashed styling — stale blue `!important` on transcript and green `!important` on snapshot removed. Start New Project restored to green — positive action, keep using the product. Disabled export buttons changed from red to muted grey so unavailable and destructive states no longer share the same color. Bee icon removed from Start New Project, warning sub-label added.

**Work screen text selection — amber highlight**
Working document textarea text selection color changed from browser default blue to WaxFrame amber with near-black text via `::selection` CSS. Consistent across light and dark mode.

**Round History moved to Menu**
History button removed from the work screen top bar. Now accessible via Menu → Round History. Top bar is Notes and Finish only. User manual updated throughout.

**Nav panel responsive width**
Navigation panel now widens progressively on smaller screens — 280px at full desktop, 320px at 1400px, 360px at 1200px, and up to 420px (or 90vw) at 1100px and below.

**Backup Session filename fixed**
Was always saving as `WaxFrame-Backup-session.json` because the code read `.name` from the project object but the field is stored as `.projectName`. Now correctly names the file after the project name and version.

**Holdout suggestion card scroll — index-based lookup**
Click-to-scroll on holdout convergence cards was broken because the data attribute approach truncated at inner quotes. Replaced with index-based lookup from `window._flatHoldoutSuggestions`. Unicode curly quotes added to scroll regex.

**Holdout cards — NO CHANGES NEEDED artifact and stale line numbers**
Trailing NO CHANGES NEEDED text stripped during parsing. Stale Line N: references stripped from displayed suggestion text via existing `stripLineRefs`.

**Goal modal auto-sizing**
Project goal modal textarea now auto-sizes to content when opened, capped at 55% viewport height. Modal widened to 900px.

**Session navigation — blank work screen fix**
`goToScreen` was missing a `screen-work` handler. Navigating away mid-session and back left the textarea empty. Fixed.

**Session protection — accidental Launch guard**
Launch button on screen-document changes to Return to Work Screen when an active session exists. `startSession` also requires confirmation before overwriting an active session.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `waxframe-user-manual.html` · `document-playbooks.html` · `CHANGELOG.md`

---


**Released:** April 21, 2026

### Bug Fixes

**Mute button — three sound functions ignoring mute state**
`playFlyingCarSound`, `playAnvilSound`, and `playMetalClang` were all missing `_isMuted` guards and played regardless of mute state. Fixed by adding `if (_isMuted) return` at the top of all three functions.

**Send to Builder staying amber after round completes**
After a Builder Only round cleared the Notes textarea, `updateNotesBtnPriority` was never called. Send to Builder stayed highlighted amber even though Notes were empty. Fixed by calling `updateNotesBtnPriority` immediately after clearing the textarea in `runBuilderOnly`.

**Dark mode footer buttons — invisible text**
`.shake-wide-label` had `color: #0a0c12` hardcoded. When the button role swaps (Notes present, Send to Builder becomes primary), the Smoke the Hive button sits on a transparent/dark background and the near-black text becomes invisible. Fixed by making the color contextual — `var(--text)` on `.footer-btn`, `#0a0c12` on `.footer-btn-smoke`.

**Reviewer prompt — forced-suggestion bias causing convergence failure**
The reviewer prompt contained: *"Only return NO CHANGES NEEDED if you have reviewed every line and can justify why each individual line cannot be improved... This response should be rare."* This directly contradicted the "don't suggest for the sake of suggesting" rule two lines above it and forced every AI to find something to criticize every round regardless of document quality — resulting in 11-round sessions on 64-word letters. Replaced with the opposite framing: NO CHANGES NEEDED is the correct and expected response when the document is genuinely done. Also explicitly named punctuation preferences, synonym swaps, and stylistic alternatives as invalid suggestion types.

**exportSnapshot missing — Save Session Snapshot button did nothing**
`exportSnapshot` was absent — lost in a prior large block replacement. Implemented fresh using the same `_waxframe_backup` format as `backupSession` so `importSession` can restore it. Filename includes project name and version. Button updates to done state after saving. Added disabled guards to `finishAndExport` and `exportSnapshot` so red-disabled buttons actually block clicks.

**Blank work screen after mid-session navigation**
`goToScreen` had initialization handlers for every screen except `screen-work`. Navigating to the Project screen to edit the goal and then back to the Work screen left the document textarea empty because `initWorkScreen` was never called on return. Added the missing handler — calls `initWorkScreen()` without `isNewSession` flag so the document, round badge, phase bar, conflicts, and hive status are restored without clearing the console.

**Session wipe on accidental Launch during active session**
Navigating the setup screens mid-session and clicking Launch WaxFrame on screen-document would silently call `startSession()`, which clears all history and resets the document. Two protections added: (1) `updateDocRequirements` now detects an active session and changes the Launch button to "↩ Return to Work Screen," re-routing it to `goToScreen('screen-work')`. (2) `startSession` now checks for an active session and requires explicit confirmation before proceeding.

**Holdout conflict cards — click-to-scroll not working, "NO CHANGES NEEDED" artifact**
Click-to-scroll was broken because the `data-suggestion` attribute stored text using `esc()` which does not escape double quotes, truncating the attribute value at the first inner quote. Replaced with index-based lookup from `window._flatHoldoutSuggestions`. Added Unicode curly quote support to the scroll regex. Trailing "NO CHANGES NEEDED" text was being appended to the last suggestion card during parsing — now stripped during the split pass.

**Holdout suggestion cards — stale line numbers displayed**
Holdout suggestion cards were showing raw reviewer text including "Line 9:" references that no longer matched the document after rewriting. Applied the existing `stripLineRefs` function to the displayed text while preserving raw text in memory for the scroll regex.

**Lock in Notes — conflict integration**
Added a **🔒 Lock my selection in Notes** button to every USER DECISION conflict card. Clicking it grabs the selected option text, pre-fills the Lock a line Notes template with the exact text, and opens the Notes drawer. Selecting an option and locking it in one click replaces the previous copy-paste workflow.

**Goal modal — too small, no copy button**
Project goal modal textarea was fixed at `min-height: 280px` and cut off content. Replaced with JavaScript auto-sizing that measures scroll height and caps at 55% viewport height. Modal widened from 820px to 900px. Copy button confirmed present and working.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `waxframe-user-manual.html` · `document-playbooks.html` · `CHANGELOG.md`

---


**Released:** April 21, 2026

### New Features

**Setup 3 — Persistent goal field helper text**
All six Project Goal fields now show a permanent helper line beneath them — always visible, not just placeholder text that disappears when you type. Each hint explains what the field controls, why it matters, and what a good answer looks like. Written for first-time users who have never used a multi-AI workflow. New class `.goal-field-hint` added to `style.css`.

**Notes drawer — Smart template buttons**
A row of five quick-fill template buttons now appears in the Notes drawer between the header and the textarea. Templates: 🔒 Lock a line, 🔒 Lock a section, ✅ Applied my decision, ↩ Reverted document, 🚫 No new sections. Clicking a template pre-fills the textarea with a ready-made instruction; any `[PLACEHOLDER]` in the template is automatically selected so the user can type their replacement immediately. New `applyNotesTemplate()` function in `app.js`. New `.notes-templates` and `.notes-template-btn` classes in `style.css`.

**Console — Slow responder warning**
After each reviewer phase, WaxFrame now checks each AI's response time against the round average. If an AI responds in more than twice the average and more than 15 seconds above it, a warning is logged to the Live Console: `⚠️ [AI name] — responded in Xs (round avg: Ys) — consider toggling off`. Threshold prevents false positives when all AIs are slow or when only two AIs are active. Timing is captured per-AI inside `runRound()`.

**Console — Error detail modal**
Error and rate-limit warning lines in the Live Console now show a clickable `→` arrow button. Clicking it opens a modal showing the full raw API response for that call and a direct link to that provider's billing/API console page. Particularly useful for diagnosing Alfredo gateway failures where the console is the only diagnostic surface. Raw response data is stored in `window._consoleErrorData` keyed by entry ID. New `openConsoleErrorDetail()` function and `consoleErrorDetailModal` HTML element added. New `.console-err-arrow`, `.console-error-detail-modal`, `.ced-raw-panel`, and `.ced-raw-pre` classes added to `style.css`. `consoleLog()` updated to accept an optional third `rawData` parameter. `callAPI()` updated to capture and pass raw HTTP error response body to `consoleLog()`.

**testAllKeys — Rebuilt as proper centered modal**
The Test All Keys interface was a fixed-position corner panel (`position: fixed; bottom: 80px; right: 24px`) that felt like an afterthought. Rebuilt as a full centered modal overlay using the same `custom-ai-modal-overlay` / `custom-ai-modal` pattern as all other modals in the app. Details drawer per AI, centered and full-width, properly scrollable at `max-height: 55vh`. Old `.test-keys-panel` corner panel CSS removed and replaced with `.test-keys-modal` CSS. `testAllKeys()` and `dismissTestPanel()` updated in `app.js`. HTML updated from `testKeysPanel` div to `testKeysModal` overlay.

### Documentation

**User manual — Project Goal section rewritten**
Removed five stale blocks: "Writing your goal when you already have a document", "Writing your goal when starting from scratch", "The goal counter and the 300-character threshold", "The Refine Preview panel", "What gets included in the 300-character trimmed brief", and "The ⓘ button — About Your Project Goal". Replaced with two new blocks: a unified goal-writing guide with good/bad examples covering both document-exists and from-scratch scenarios, and a full field-by-field table covering what each field controls and what makes a good entry.

**User manual — Conflicts section expanded**
Step 8 now covers the practical problem of a Builder ignoring conflict resolutions — a three-step escalation process: (1) reinforce in Notes using the Lock a line template with exact quoted text, (2) add to Additional instructions in the Project Goal for permanent enforcement, (3) remove the offending AI from the session. Added a new block for when conflicts do not appear but the document is still not improving. Updated the "When Things Go Wrong" troubleshooting entry for re-raised conflicts to match.

**User manual — Notes section expanded**
Step 9 Notes guidance rewritten and substantially expanded. Added a full examples table covering the eight most common Notes scenarios. Added a dedicated "Locking a line" block covering the exact-text quoting technique, how to use the Lock a line template button, and the escalation path to Additional instructions when Notes alone is not enough.

**Document Playbooks — Résumé additional instructions**
Added a new Additional Instructions field to the Résumé playbook pre-filled with: "Do not remove or change specific metrics, percentages, or dates — these are factual and verified by the document owner." Prevents AIs from paraphrasing or removing hard facts (employment dates, percentages, titles) that the document owner has verified.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `waxframe-user-manual.html` · `document-playbooks.html` · `CHANGELOG.md`

---


**Released:** April 20, 2026

### New Features

**Document Playbooks — From Scratch goal templates**
Every playbook previously only provided a "Refine a draft" Project Goal template, leaving users with no starting point when they had no existing document. Added a second goal block to all 11 playbooks labeled **From Scratch** in green (`dp-field-label--scratch`), giving users a fully populated template to copy when building a document from the ground up. Updated Paste In guidance on all 11 entries to address both modes. CSS additions cover dark, light, and auto themes.

### Bug Fixes

**Mute button — three sound functions not respecting mute state**
The mute toggle was correctly setting the `_isMuted` flag but three sound functions ignored it entirely. `playFlyingCarSound()` and `playAnvilSound()` had no `_isMuted` guard at all. `playMetalClang()` had the guard only in its fallback `Audio()` branch — the primary pre-decoded buffer path always played regardless of mute state. Fixed by adding `if (_isMuted) return` at the top of all three functions.

**Conflict panel — option text collapsing to single characters**
The AI attribution span (`.decision-opt-ais`) inside each conflict option button competed for horizontal space with the option text span when model names were long (e.g. `Claude-4-5-Sonnet-Extended-Thinking and Gemini-2-5-Pro-Extended-Thinking`). This starved the text span to near-zero width, causing it to wrap to 2 characters per line. Fixed by adding `flex-wrap: wrap` to `.decision-opt-btn` and `flex-basis: 100%`, `min-width: 0`, and `overflow-wrap: anywhere` to `.decision-opt-ais`, forcing the attribution to its own row below the option text.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `document-playbooks.html` · `CHANGELOG.md`

---

## v3.17.1 Pro — Build `20260419-011`
**Released:** April 19, 2026

### Bug Fixes

**Notes panel — Send to Builder / Smoke the Hive button flip**
When the Notes textarea has content, Send to Builder is now highlighted as the primary action and Smoke the Hive goes to secondary. Clears back to default when Notes is empty. Wired into `oninput`, Clear button, `closeNotesModal()`, programmatic clear on project reset, and session restore so the state is always correct.

**PDF extraction — rewritten to sort items by position**
Previous extraction iterated through the PDF content stream in order, which is not guaranteed to be top-to-bottom. Items are now collected per page, grouped into lines by Y position (±3 unit tolerance), sorted top-to-bottom and left-to-right within each line, then reconstructed with proper newlines and paragraph breaks. Fixes résumés and structured documents extracting as a wall of jammed text.

**Upload file warning — suppressed on Setup 4 screen**
`processFile()` was triggering the "active session" overwrite warning even when the user was on Setup 4 before launching. Warning now only fires when `screen-document` is not the active screen (i.e. during a live work session).

**Start New Project — navigates to Setup 3 (Your Project)**
`finishAndNew()` was sending the user to Setup 1 Worker Bees after clearing a project. Since API keys persist, it now drops straight to Setup 3 Your Project.

**Document Playbooks — Additional Instructions label spacing**
`dp-goal-label` min-width increased from 160px to 200px so the longest label (ADDITIONAL INSTRUCTIONS) no longer runs into the value text.

**About modal — Testing credit added**
Candy added as Tester in the About modal.

### Files Changed
`index.html` · `app.js` · `style.css`

---

## v3.17.0 Pro — Build `20260419-010`
**Released:** April 19, 2026

### 4-Screen Setup Flow
Replaced the previous 2-screen setup (split-panel Setup + split-panel Project) with four dedicated full-width screens. Each screen has one job, its own header with hamburger menu and ← Back button, and a step badge.

| Screen | Purpose |
|--------|---------|
| **Setup 1 — Worker Bees** | Save API keys for your AI reviewers |
| **Setup 2 — Builder** | Choose which AI rewrites the document each round |
| **Setup 3 — Your Project** | Name your project and define your goal |
| **Setup 4 — Starting Document** | Upload a file, paste text, or start from scratch |

### Structured Project Goal Fields
Replaced the single `projectGoal` textarea with six structured fields assembled into a prompt brief via `assembleProjectGoal()`. Fields: Document type *, Target audience *, Desired outcome *, Scope & constraints, Tone & voice, Additional instructions. Required fields marked with asterisks. Legacy `projectGoal` data migrates to Additional instructions on first load.

### Universal Card Layout
All four setup screens share a consistent centered card layout — `max-width: 1390px` — with gray space on the sides at larger viewports. Cards fill the available body height at all supported viewport sizes.

### Starting Document — Panel Improvements
Upload, Paste, and Scratch panels fill the card height on both laptop and desktop. Pulsing WaxFrame logo watermark restored and re-anchored to the active panel. Watermark animates on a 16s breathing cycle: 1s dark → 6s ease in → 2s full hold → 6s ease out → 1s dark. Logo renders at `300px` on desktop and `150px` on laptop.

### Navigation & Layout
- Hamburger menu and ← Back button on every setup screen header
- Nav panel Navigate section updated to 4 items (one per setup screen)
- `fs-header` and `fs-footer` backgrounds changed to `var(--surface)` with 2px border for visibility in light mode
- Minimum screen overlay fires at `≤ 1421px` width or `≤ 810px` height

### Project Goal Modal
Now read-only on the Work screen. Save & Close replaced with ✏️ Edit Goal which navigates directly to Setup 3.

### CSS Variable System
Font size scale added to `:root` — `--fs-xs` through `--fs-mono`.

### Bug Fixes
- Removed orphaned two-column project markup that caused 13 duplicate DOM IDs
- Fixed stale `max-width: 680px` rule on `fs-body-single` from old multi-selector
- Fixed watermark `::after` positioning — now anchors to active panel via `position: relative`
- Removed incorrect laptop overrides that expanded 80ch panels to full width

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md`

---
