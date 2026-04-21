# WaxFrame Professional — Changelog

---

## v3.17.2 Pro — Build `20260420-001`
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
