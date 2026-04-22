# WaxFrame Professional — Changelog

---

## v3.19.13 Pro — Build `20260422-001`
**Released:** April 22, 2026

### Bug Fix

**Click-to-scroll — wrap-aware pixel measurement for long documents**
Clicking a conflict card's `Current:` text or a holdout suggestion card was setting the correct text selection inside the working document but often failing to scroll the viewport to it, so the highlighted match ended up well off-screen. On short test documents this was unnoticeable; on long prose documents it made the feature functionally unusable — the user could see a toast saying "Scrolled to text in document" but had to manually scroll to find where.

Root cause was that `scrollToCurrentText()` computed its scroll target by counting `\n` characters only — `before.split('\n').length - 1` × `lineHeight` — which treats one logical line as one visual row. The `.work-doc-ta` textarea is `white-space: pre-wrap` at ~80ch wide, so a single prose paragraph with zero newlines but 500 characters wraps to roughly seven visual rows. The old math undercounted that by a factor of five to ten. On documents with dozens of wrapped paragraphs before the target, the computed `scrollTop` was off by thousands of pixels, landing the viewport nowhere near the highlight.

A second contributing issue: `ta.focus()` was called without `{ preventScroll: true }`, allowing the browser to auto-scroll a scrollable ancestor to bring the focused textarea into view — which on the work screen could re-scroll `.work-doc-editor` and undo the manual scroll we had just applied.

The fix replaces the logical-line math with a hidden mirror `<div>` that inherits the textarea's font, width, padding, and wrap-control properties (`white-space`, `word-break`, `overflow-wrap`, `tab-size`). The text up to the match is inserted as a text node, followed by a zero-width `<span>` marker. The marker's `offsetTop` is the exact pixel y-coordinate of the match in the textarea's layout, accounting for every wrapped row regardless of paragraph length or document size. That value is translated into the editor-scroll coordinate system via `getBoundingClientRect()` and applied to `.work-doc-editor.scrollTop`, targeting ~1/3 down the viewport to match the prior UX intent. `ta.focus()` now passes `{ preventScroll: true }` so the browser doesn't fight the manual scroll.

The mirror div is created once on first use and reused thereafter, lives permanently off-screen at `top: -99999px` with `visibility: hidden` and `pointer-events: none`, and is attached to `<body>` — completely outside the document panel's layout tree. It cannot influence the panel's sizing, cascade, stacking context, or scroll behavior. Zero CSS changes. Zero HTML structure changes. Zero changes to any other app.js function. The three-layer scroll architecture (outer `.work-doc-editor` scroll container → growing `.work-doc-scroll` content row with paper background → sticky `.work-line-numbers` gutter) is untouched; the fix only computes a better value for the single `editor.scrollTop = N` write the function already performed. `scrollToHoldoutLine()` is unchanged because it delegates to `scrollToCurrentText()`, so both click paths (conflict cards and holdout suggestions) benefit from the fix.

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.12 Pro — Build `20260421-022`
**Released:** April 21, 2026

### New Features

**Document Playbooks — restructured with Quick Start, sticky sidebar nav, and category sections**
The Document Playbooks page grew past a dozen entries with no internal structure, just a chip-row TOC at the top and a linear scroll through whatever order playbooks were added. Rebuilt the page architecture around three ideas:

**Quick Start at the top.** A new featured playbook — **Quick Start — Chocolate Chip Cookies** — sits above the main catalog with distinct amber-border styling to mark it as the onboarding entry point. Pre-filled fields plus a Notes-drawer seed document so new users can get through an end-to-end hive run on familiar territory without domain pressure. Rounds estimate set at `2–4` (expect quick convergence since the subject matter is universal and well-scoped). Includes a "What to Watch For" section that orients the reader to the mechanics they should be paying attention to — how reviewers propose numbered changes, how the Builder decides what to accept, how conflicts surface, how the doc evolves. Ends with a tip about saving a session snapshot as a reference before moving to a real project.

**Sticky left sidebar navigation.** Replaced the old inline chip-row TOC with a `240px` fixed-width sticky column that rides the scroll down the page. Sidebar contains: a featured Quick Start entry with its own amber card treatment, then four category sections (Career & Hiring, Business & Sales, Content & Marketing, Personal & Everyday) with alphabetical playbook links under each. Sidebar stays at `top: 116px` to clear the page header's sticky position, and caps its own height with an internal scroll if the category list ever grows too tall to fit.

**Category section headers in the main flow.** Each of the four categories now has a styled section header at the top of its playbook group — gradient amber-tint left-border accent, title in display font, one-sentence category description explaining why these documents benefit from a hive. Headers carry their own anchor IDs (`#cat-career`, `#cat-business`, `#cat-content`, `#cat-personal`) for direct linking.

**Existing 11 playbooks reordered into categories, alphabetical within:**

- **Career & Hiring:** Cover Letter, Job Description, Résumé, Thank-You Letter
- **Business & Sales:** Business Proposal, Email / Outreach, Executive Summary, RFP Response
- **Content & Marketing:** Blog Post / Article, Presentation Outline
- **Personal & Everyday:** Recipe

Playbook content unchanged — only the order in which they appear on the page and the anchor links in the sidebar changed. Deep links to individual playbooks (`#resume`, `#cover-letter`, etc.) all still work; only the old `.dp-toc`, `.dp-toc-title`, `.dp-toc-grid`, and `.dp-toc-link` CSS classes were removed since the old inline TOC was replaced entirely. The 19 additional playbooks scoped during planning (Interview Follow-Up, Business Case, Statement of Work, RFP Writing, Case Study, Press Release, Website Copy, Short-Form Content, Meeting Summary, Project Brief, Status Update, Technical Report, SOP, Policy, LinkedIn Profile, Personal Letter, Complaint Letter, Review, Event Plan) will land in follow-up releases once their round counts have been verified against real runs via the Dry Run Test Sheet.

**Page stamp bumped** from build `20260421-001` to `20260421-022` matching the release build.

### Bug Fix

**Working document text selection — correct contrast in light mode**
When clicking a conflict card's `Current:` label to jump to the matching text in the working document, the jumped-to text gets highlighted using the browser's native text-selection styling. The existing `::selection` rule forced dark text (`#0a0c12`) on the amber accent background, which reads fine on the dark-mode accent (`#f5a623` → dark text on gold) but wrong on light mode's accent (`#c97c06` → dark text on dark-orange, nearly invisible). Added light-theme and `prefers-color-scheme: light` overrides that keep the accent background but flip the text colour to `#ffffff` so the highlight stays readable in both themes — mirrors the "dark text on light bg / light text on dark bg" pattern the rest of the app uses.

**Project clock start/pause buttons — proper traffic-light semantics across both themes**
The Start/Pause controls on the project clock widget both shared a single `.dcw-ctrl-btn.active` rule that used green for *both* active states, and there was no light-mode override for the active state at all. Two problems to fix: (1) semantics — green should indicate "running/play," amber should indicate "paused" (matches the clock digits' own running-green vs paused-amber colour story); (2) light-mode had no active-state feedback, so pressing Pause in light mode did nothing visually. Added semantic modifier classes `.dcw-ctrl-btn--start` and `.dcw-ctrl-btn--pause` to both button elements, split the active-state CSS so Start-active uses green and Pause-active uses amber, and added light-theme + `prefers-color-scheme: light` overrides for both — using the theme-appropriate colour values (dark-mode green `#00b300` / light-mode green `#047857`, dark-mode amber `var(--accent)` / light-mode amber `#a06000`) so the buttons match the clock digit colours in each theme.

**CSS cleanup — removed `!important` from clock controls using proper selector specificity instead**
First pass of a broader effort to remove lazy `!important` declarations from the stylesheet. The initial pause/start active-state rules used `!important` to beat the generic `.dcw-ctrl-btn:hover` rule when the cursor was over an already-active button. Replaced with a cleaner selector — `.dcw-ctrl-btn:not(.active):hover` — so `:hover` and `:active` never compete on the same element, eliminating the need for `!important` entirely. Removed 12 `!important` declarations total (~15% of the stylesheet's current total). Remaining `!important` count on the file is now 68, down from 80. Future releases will continue this cleanup in audited batches — legitimate uses (print stylesheet overrides, `prefers-reduced-motion` accessibility rules) will stay, lazy specificity hacks will be converted to proper selector structure.

### Files Changed
`document-playbooks.html` · `style.css` · `index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.11 Pro — Build `20260421-021`
**Released:** April 21, 2026

### Bug Fixes & Polish

**Perplexity URLs — updated to the correct console endpoint across all references**
The previous `https://www.perplexity.ai/settings/api` URL redirects to a user-specific group settings page, not the billing page, making the "Open All Consoles" and "Open All Billing" buttons land on the wrong screen. Swapped to `https://console.perplexity.ai` at all five reference sites — Perplexity's docs confirm this user-agnostic URL auto-redirects logged-in users to their group's portal, where both Billing and API Keys are accessible from the left sidebar. Updated in `app.js` (the `apiConsole` property of the Perplexity entry in `aiList`), `api-links.js` (both `openAllConsoles()` and `openAllBilling()`), `api-details.html` (the sign-in link and the credit-balance note), and `waxframe-user-manual.html` (the troubleshooting paragraph and the provider table row).

**Helper page header and footer — light-theme fix**
On `what-are-tokens.html` (and by extension any page using the shared `.helper-body` layout with `.page-header` / `.page-footer` strips), switching the theme to light left the header and footer stuck in dark colours while the body flipped correctly to the yellow honeycomb background. The existing `background: var(--surface2)` rule should have cascaded automatically through the `[data-theme="light"]` variable override at the top of `style.css`, but something in the cascade was pinning the dark value. Added defensive explicit light-mode rules for both selectors — `[data-theme="light"] .page-header`, `[data-theme="light"] .page-footer`, and their matching `@media (prefers-color-scheme: light)` / `[data-theme="auto"]` variants — with a hardcoded `#f0f2f8` background and a subtle `box-shadow` to preserve the visual boundary between header/body/footer in light mode. Belt-and-suspenders — the cascade fix is redundant if the variable ever works correctly again, but guarantees the flip regardless.

**Project Goal info modal — rewritten to actually explain the six fields**
The previous "About Your Project Goal" modal content was misaligned with what the user is actually asking when they open it. It led with implementation trivia — how the assembled goal is trimmed to 300 characters when a document exists, how `Project Context` is derived at sentence boundaries, how the Refine Preview panel works — mentioning the 300-character trim three separate times across the modal body. A user opening this modal is trying to figure out **how to fill out the six fields well**, not how the trimming algorithm works under the hood.

Rewrote the modal around what actually matters: (1) this section is the most important part of the entire setup because the assembled goal is the *only* context the AIs have about what you want; (2) each of the six fields controls a specific dimension of the output (format, audience, outcome, scope, tone, hard rules); (3) vague fields produce vague documents. Added one pill row per field — `Document type`, `Target audience`, `Desired outcome`, `Scope & constraints`, `Tone & voice`, `Additional instructions` — each with a concrete one-to-two-sentence explanation pulled from the corresponding manual Step 3 content. Replaced the tip about trim survival with a more useful reminder that the goal works identically whether uploading a file, pasting text, or starting from scratch — because the AIs have no other source of context about what the user wants.

Also normalized the modal's icon markup from the inconsistent `.goal-info-modal-icon-wrap` / `.goal-info-modal-icon` pair to the shorter `.goal-info-icon` + `.helper-info-img` pattern used by the other eight info modals. No CSS cleanup required because the old classes are still referenced elsewhere — just brought this one modal into line with the rest.

**Deep link from every info modal to its user manual section**
Added a new `.goal-info-manual-link` row at the bottom of the body of every info modal. Quick summary stays in the modal; full deep-dive lives in the manual; users who want more detail are one click away. Styled to match body copy font size (`15px`), centered, bold anchor so it reads as a proper footer link rather than inline prose. Mapping:

- `goalInfoModal` → `#step3` Define Your Project
- `infoBeesModal` → `#step1` Set Up Your Worker Bees
- `infoBuilderModal` → `#step2` Choose Your Builder
- `infoUploadModal` → `#step4` Provide Your Starting Document
- `infoHiveModal` → `#step6` The Work Screen
- `infoDocModal` → `#step6` The Work Screen
- `infoConsoleModal` → `#step6` The Work Screen
- `infoConflictsModal` → `#step8` Review Results and Resolve Conflicts
- `infoExportMaskModal` → `#step10` Export and Finish

Also fixed `infoExportMaskModal` to use the `WaxFrame_TipButton_v1.png` tip image instead of the bare `💡` emoji, matching the visual treatment of the other eight modal tips.

**User manual — strengthened the Save Session Snapshot paragraph**
The existing Step 10 description for `📷 Save Session Snapshot` covered the "pause and resume" use case but missed the feature's real selling point: it is also insurance against browser data loss. WaxFrame stores everything in `localStorage`, which is wiped any time the user clears cookies and site data — whether they do it manually, a privacy extension does it, or a managed work machine policy does it automatically on schedule. Added a sentence making this explicit and positioning the .json file as the restore path, so users understand why saving a snapshot periodically is smart practice rather than just a "pause" feature.

### Files Changed
`app.js` · `api-links.js` · `api-details.html` · `waxframe-user-manual.html` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.19.10 Pro — Build `20260421-020`
**Released:** April 21, 2026

### Polish

**Single-key Test modal — now a true three-column layout matching Test All Keys**
v3.19.9 matched the two-pane single-test modal's height to Test All Keys but kept the column count mismatched (2 vs 3). Consistency matters more than column optimization — a single-AI row is still cleaner than an empty space. Rewrote single-test as a real three-column layout: Rows column (showing just the one AI being tested, pre-selected with the amber accent), Sent pane, Received pane. Modal width bumped from `1100px` to `1400px` matching the multi-test modal exactly.

`testApiKey()` now populates the new row's name and status indicator so the left column reflects test progress in real time: `⋯` pending, `✓` pass, `✕` fail — identical icon set to Test All Keys. Row status tooltip shows either the extracted response snippet (on pass) or the error message (on fail).

Dropped the now-unused `.tkp-two-col` CSS rule. The two test modals now share the exact same layout primitive.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.19.9 Pro — Build `20260421-019`
**Released:** April 21, 2026

### Bug Fixes

**Single-key Test modal — height matched to Test All Keys**
The v3.19.8 single-test modal was sized `height: 60vh / min-height: 360px` while Test All Keys uses `65vh / 400px`. Rationale was the single-test has fewer columns, but response body length is identical regardless of column count — so the shorter height just meant Alfredo / Perplexity responses forced unnecessary scrolling in the Received pane. Bumped `.tkp-two-col` to `65vh / 400px` matching `.tkp-three-col`.

### Files Changed
`style.css` · `index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.8 Pro — Build `20260421-018`
**Released:** April 21, 2026

### Polish

**Single-key Test modal — side-by-side Sent/Received panes for consistency with Test All Keys**
The single-AI Test button (the per-row `Test` button beside each saved key) still used the legacy stacked four-row layout: Endpoint / Sent / Status / Received rendered top-to-bottom as rows inside `.custom-ai-raw-panel`. Now that Test All Keys is a three-column layout (v3.19.7), the mismatch read as inconsistent. Rebuilt the single-test modal to use the same two-pane visual language:

- **Sent pane (left)** — Endpoint label + value, Request body label + pretty-printed JSON.
- **Received pane (right)** — Status label + value, Response body label + pretty-printed JSON.

Modal widened from `max-width: 640px` to `max-width: 1100px` with `width: 95vw`, sized `height: 60vh` with a `360px` minimum. Added a new `.tkp-two-col` grid layout in `style.css` (mirrors `.tkp-three-col` but without the rows column). Reused the existing `.tkp-col`, `.tkp-col-hdr`, `.tkp-col-body`, `.tkp-detail-label`, `.tkp-detail-pre`, and `.tkp-detail-pre--grow` classes so both test modals share the same Pro-level typography and scroll behavior.

**No JS changes** — the four element IDs (`testKeyRawEndpoint`, `testKeyRawSent`, `testKeyRawStatus`, `testKeyRawReceived`) are preserved in the new markup, so the existing `testApiKey()` function writes to them unchanged.

**Cleanup.** Dropped the stale `.test-key-raw-received { max-height: 200px; ... }` rule (no longer needed now that the new pane provides its own scroll container). Left `.custom-ai-raw-panel` and its children alone — still used by the Custom AI modal, Import Server modal, and Console Error Detail modal.

### Files Changed
`index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.19.7 Pro — Build `20260421-017`
**Released:** April 21, 2026

### New Features

**Test All Keys modal — three-column layout for scale**
The previous inline-expandable design collapsed at any hive size beyond a handful of AIs. Each row's Details button expanded a four-section detail block below that row, pushing the rest of the list down and forcing constant scrolling when reviewing a 27+ AI hive (e.g. David's Alfredo gateway). Rebuilt the modal as a three-column layout:

- **Left column (280px fixed)** — scrollable list of all keyed AIs, one line per row showing name and a compact ✓ / ✕ / ⋯ status icon. Entire row is clickable (no more per-row Details button). Selected row gets an amber left-border accent and subtle background tint.
- **Middle column (flex)** — Sent pane. Shows the request endpoint and pretty-printed JSON body for the currently selected row.
- **Right column (flex)** — Received pane. Shows the HTTP status + elapsed time and pretty-printed JSON response body.

Each column scrolls independently, so the 27-AI list never shoves the response JSON offscreen.

Modal widened from `max-width: 660px` to `max-width: 1400px` with `width: 95vw`, sized to `height: 65vh` with a `400px` minimum. Initial state shows placeholder copy in the middle/right panes ("Click a row to see the request/response"); clicking any row during or after testing populates both panes from a shared `window._tkpData` store keyed by AI id.

**Live updates during testing.** If the row currently selected is the one being tested right now, the Sent pane updates the moment the request is prepared and the Received pane updates the moment the response arrives — no need to re-click after the test finishes to see fresh data.

Replaced the old `toggleTkpDetail()` function with two new functions: `selectTkpRow(id)` handles row selection and highlight, `renderTkpDetail(id)` builds the middle + right pane content from `_tkpData`. All rendered text is HTML-escaped to handle JSON responses that might contain angle brackets.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.19.6 Pro — Build `20260421-016`
**Released:** April 21, 2026

### Polish

**Unanimous Scene — full 1 second gap between anvil and first firework burst**
The previous 300ms gap between the anvil drop and the first firework burst was too tight — anvil and burst felt like a single event rather than a launch-followed-by-explosion sequence. Shifted fireworks from T+7.1s to T+7.8s so there's now a full 1 second between the anvil's mortar-thump at T+6.8s and the first burst at T+7.8s. Cascaded downstream: crackle sounds for bursts 2 and 3 moved to T+8.5s and T+9.2s; scene close moved from T+11s to T+12s to preserve ~1 second of clean image hold after the last burst's sparks fade. Total scene length now 12.9s (up from 11.9s).

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.5 Pro — Build `20260421-015`
**Released:** April 21, 2026

### Polish

**Unanimous Scene — fog earlier, anvil right after image, three multicolor bursts restored, fanfare dropped**
Four tuning changes based on testing the v3.19.4 scene end-to-end:

**Fog starts 1 second earlier.** Moved `sweepStart` from `2050ms` to `1050ms`. Fog now begins spawning when the bee has only crossed ~10% of the screen instead of 50%, so by the time the bee exits at T+3.3s the fog is fully built up around its flight path rather than still catching up behind it. Reads more like the bee is leaving thick atmospheric wake as it passes.

**Anvil moved to right after image drops.** Was firing at T+7.5s (1s hold after reveal). Now fires at T+6.8s — 300ms after the image reveal starts — so the anvil's launch-thump lands immediately instead of sitting in a long silent hold. Image reveal animation is 900ms so anvil hits while the image is still zooming in, reinforcing the "this is the moment" feel.

**Three multicolor bursts restored.** Reverted from the v3.19.4 palette-split (main rainbow + 3 gold sparkle crackles at 55% size) back to the v3.19.3 full-rainbow 3-burst schedule — center (60 particles), upper-left (40 particles), lower-right (40 particles), all at full size using all 8 rainbow hues. The small gold sparkles weren't visible enough to read as fireworks; the full-size multicolor bursts land with the right visual weight.

**Fanfare removed.** Dropped the `playUnanimousFanfare()` call from the timeline — the C5–E5–G5–C6 brass arpeggio was competing with the anvil and crackle sounds and read as "too much." Anvil now stands as the sole bang sound. Fanfare function kept defined in `app.js` (dead code, no call sites) in case we want to revive it later.

**Crackle sounds retimed to bursts 2 and 3.** `playCrackleSound()` still fires twice — at T+7.8s (synced with burst 2) and T+8.5s (synced with burst 3). Burst 1 is sonically covered by the anvil's bang so no separate crackle needed. Creates a natural "BANG... crackle... crackle" cadence.

**Total scene length 11.9s** (down from 13.4s). Escape or click still dismisses anywhere.

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.4 Pro — Build `20260421-014`
**Released:** April 21, 2026

### Polish

**Unanimous Scene — real-firework cadence: thump → BOOM → crackle crackle crackle**
The prior reveal had image + anvil + fanfare + burst all fire within a ~500ms window, which still buried the image under too much simultaneous input. Rebuilt around how actual fireworks work — mortar launch thump, shell rises, main shell break with big burst, 1–2 second pause, then the silver-star crackle as the charges burn off.

New cadence:

- **T+6.5s** — image reveals (900ms zoom). **Silent.** User reads the image first.
- **T+7.5s** — 1 second hold → `playAnvilSound()` fires (mortar launch thump).
- **T+8.5s** — 1 second hold → **BOOM**: main rainbow burst (70 particles, full size, centered) + fanfare.
- **T+10.0s** — crackle 1: small gold sparkle burst (18 particles, 55% size/speed/life) at screen-upper-left + `playCrackleSound()` (10 rapid high-pitched noise pops over ~300ms).
- **T+10.3s** — crackle 2: sparkle burst screen-right + crackle sound.
- **T+10.6s** — crackle 3: sparkle burst upper-center + crackle sound.
- **T+10.6s → T+12.5s** — ~1.9s clean image hold, sparkles fading through.
- **T+12.5s → T+13.4s** — scene fades out.

**New `playCrackleSound()` function** added to `app.js` — generates 10 short bandpass-filtered noise pops at randomized 3.2–7 kHz frequencies over ~300ms. Each pop is ~40–90ms with an exponential decay envelope. Respects `_isMuted` like every other scene sound. Reads as sparkler-star crackle, not thunder.

**Fireworks function extended** to accept per-burst `palette` (`'rainbow'` for the main boom, `'sparkle'` for crackles — a tighter gold-to-white hue range) and `sizeMult` (scales particle size, speed, and lifetime together so sparkle crackles are visually distinct from the main burst). Default schedule inside `spawnUnanimousFireworks()` is now one main burst at 0ms followed by three sparkle crackles at 1500/1800/2100ms — all feeding into the same shared particle system and RAF loop.

Total scene length: 13.4s (up from 11.9s). Escape or click still dismisses anywhere.

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.3 Pro — Build `20260421-013`
**Released:** April 21, 2026

### Polish

**Unanimous Scene — three-burst firework sequence, anvil launch thump, and image hold**
The reveal used to fire a single 90-particle burst simultaneously with the fanfare, which buried the image under too much visual noise all at once — users couldn't register what the image actually said. Rebuilt the reveal into a proper firework cadence:

- **T+6.5s** — image reveals + **anvil drop** (deep sine-wave boom with noise-burst impact and filtered-noise reverb tail, reusing the existing `playAnvilSound()`). This reads as the mortar-launch thump that precedes a real firework.
- **T+7.0s** — first burst fires center-screen (60 particles) + fanfare starts (the explosion).
- **T+7.7s** — second burst offset left (40 particles).
- **T+8.4s** — third burst offset right (40 particles).
- **T+8.4 → 11s** — ~2.6 seconds of image-hold time for the user to actually read and register the reveal. Sparks fade through this window but don't dominate it.

`spawnUnanimousFireworks()` rewritten to accept an optional `bursts` array `[{ at, x, y, count }, ...]` and run a single shared RAF loop that particles from each burst feed into. Default schedule is the three bursts above; canvas context is still pre-scaled for DPR so all coords are CSS pixels. Loop terminates when all particles die AND no pending bursts remain.

**Mute compliance audit.** Verified `playFlyingCarSound()`, `playUnanimousFanfare()`, and `playAnvilSound()` all have `if (_isMuted) return;` as their first statement — the mute toggle silences the entire scene soundscape cleanly.

Total scene length extended from 11s to 11.9s (scene close moved from T+11s through a 900ms fade).

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.2 Pro — Build `20260421-012`
**Released:** April 21, 2026

### Bug Fixes

**Unanimous Scene — bee flight herky-jerky, fog disconnected from bee, smoker sound removed**
Three related fixes to the opening beats of the unanimous scene.

**Smooth bee flight.** Prior keyframes had five position stages (`0% → 25% → 50% → 75% → 100%`) with alternating rotation values (-3°, +2°, -2°, +2°, -3°) and a ±28px vertical bob, combined with `cubic-bezier(.42,0,.58,1)` easing. The mid-flight rotation flips plus the ease-in-out created a jerky "bouncing" motion that read more like a drunk bee than a rocket. Simplified to three position stages, held rotation constant at `-2deg` (slight forward pitch), reduced vertical bob to a single -10px apex at midpoint, and switched to `linear` timing so the bee maintains constant velocity — now reads as smooth rocket-assisted flight.

**Jet-exhaust fog.** Fog previously spawned as 28 puffs all at once across the full screen at T+3.3s, completely disconnected from the bee. Now fog puffs spawn *progressively* from `0%` to `100%` horizontal position over 2500ms starting at T+2.05s — the moment the bee crosses the screen midpoint — so the fog reads as atmospheric disturbance created by the bee's passage, filling the screen left-to-right as the bee's wake settles. Each puff carries ±4% x-jitter so the line isn't too perfect, and y-range tightened to `45–105%` to keep fog mid-to-lower screen. Puff size/duration/opacity ranges tuned for a slightly more dense atmospheric feel.

**Smoker sound dropped.** The soft hiss at fog start didn't fit the "bee's exhaust creates fog" concept — hiss reads as smoker-bellows, not jet contrail. `playSmokerSound()` call removed entirely; fog phase now relies on Kai's whirr carrying through from the bee flight.

**Timeline tightened.** Because fog now starts earlier (overlapping bee flight), the whole scene compressed from 14.3s to 11s: backdrop fade (0.8s) → bee flight + whirr (2.5s) → progressive fog sweep (2.5s, starting at bee midpoint) → fog hold (1.5s) → fog clear (0.5s) → image + fanfare + fireworks (4.5s) → fade out (1s).

### Files Changed
`app.js` · `style.css` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.1 Pro — Build `20260421-011`
**Released:** April 21, 2026

### New Features

**Unanimous Scene — worker bee fly-across before the fog**
Inserted a new opening beat between the black backdrop fade and the fog rise. At T+0.8s the worker bee (`images/WaxFrame_Worker_Bee_v2.png`) enters from `-30vw`, flies left-to-right across the full viewport with a natural weaving bob (±28px vertical sine across four keyframe stages, slight rotation per stage) and a honey-trail drop-shadow, exiting at `130vw`. Kai's whirr sound now plays in sync with the flight instead of during the fog. Flight takes 2500ms using `cubic-bezier(.42,0,.58,1)` easing. Bee sized with `min(280px, 20vw)` so it scales down on smaller viewports. Full timeline is now 14s: backdrop (0.8s) → bee + whirr (2.5s) → fog + smoker hiss (5s) → fog clear (0.5s) → image + fanfare + fireworks (4.5s) → fade out (1s).

Fog phase kept intact, just pushed back by the bee flight duration. Added `playSmokerSound()` call at fog start so the fog phase has its own soft hiss layer. Image reveal, fanfare, and fireworks unchanged.

Added the bee image element inside `#unanimousScene` and a new CSS keyframe `unanimousBeeFlyAcross`. `playUnanimousScene()` orchestration updated with the new timing. `closeUnanimousScene()` now also resets the bee state so subsequent plays restart the animation cleanly (uses a forced reflow via `void bee.offsetWidth` between class toggles).

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md` · `images/WaxFrame_Worker_Bee_v2.png` *(new asset, drop into `images/`)*

---

## v3.19.0 Pro — Build `20260421-010`
**Released:** April 21, 2026

### Bug Fixes

**Unanimous Scene canvas — blurry sparks on Retina / high-DPI**
Initial build used `canvas.width = window.innerWidth` and `canvas.height = window.innerHeight` with no device-pixel-ratio accounting, so on DPR 2 screens (iMac M4, 4K monitors) the browser upscaled a 1:1 bitmap and the fireworks sparks rendered soft. Made the canvas DPR-aware: backing bitmap sized at `Math.floor(sw * dpr) × Math.floor(sh * dpr)`, CSS box held at `sw × sh` via inline style, and context pre-scaled with `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` so all drawing calls can continue to use CSS pixels. Fireworks function updated to read `canvas.style.width` / `canvas.style.height` for center-coordinates and clear regions.

### Files Changed
`app.js` · `index.html` · `CHANGELOG.md`

---

## v3.19.0 Pro — Build `20260421-009`
**Released:** April 21, 2026

### New Features

**Unanimous Convergence Scene — initial build**
Created a dedicated full-screen scene for the moment every AI in the hive agrees the document is done. Previously unanimous and majority shared the small fly-in overlay with a count subline; this gives the full-agreement state its own stage. Initial timeline: black backdrop fades in over 800ms, 28 large fog puffs rise across the full screen with Kai's fly-in whirr sound for 5.2s, fog clears over 500ms, then `WaxFrame_Hive_Converged_Unanimously_03.png` reveals centered with a 900ms spring-eased zoom while a synthesized fanfare plays (C5–E5–G5–C6 major arpeggio with square+triangle oscillators for brass-ish tone, capped by a C7 sparkle ping) and a multicolor fireworks burst erupts from center (90 particles, 8-hue palette — gold, orange, red, magenta, purple, blue, cyan, green — canvas-rendered with gravity and air drag). Image holds ~4.5s then scene fades out. **Escape key or click dismisses early** at any point — all scheduled timers cancel, keydown listener removes itself, fog and image reset.

Image sized with `min(78vh, 78vw, 820px)` so it fits any supported viewport from 1024×768 up through 4K desktops. Fog puffs positioned in percentage units for natural scaling.

Majority convergence unchanged; still uses the smaller fly-in overlay with the `N of M AIs agree` subline. The new scene is reserved for the full-agreement moment.

`playUnanimousScene()`, `closeUnanimousScene()`, `playUnanimousFanfare()`, and `spawnUnanimousFireworks()` added to `app.js` between `hiveRand` and the dev-toolbar helpers. HTML overlay (`#unanimousScene` with backdrop, fog, image, sparks canvas) added to `index.html` after the existing unlock scene. CSS block added to `style.css` between the hive-finish reduced-motion rule and the dev toolbar section — includes `prefers-reduced-motion` support that skips all animation and reveals the image immediately. Dev toolbar `▶ Unanimous` button rewired to fire the new scene so it can be previewed without running a real round.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md` · `images/WaxFrame_Hive_Converged_Unanimously_03.png` *(new asset, drop into `images/`)*

---

## v3.18.7 Pro — Build `20260421-008`
**Released:** April 21, 2026

### Polish

**Hive convergence count — flipped to amber for cohesion**
Count subline changed from white (`rgba(255,255,255,0.95)`) to `var(--accent)` (`#f5a623` dark / `#c97c06` light) so both lines share the site brand color. Given the two lines now share identical typography (font-size, weight, letter-spacing), keeping them in different colors was visually inconsistent — the count reads as a continuation of **HIVE APPROVED**, not as a separate data chip. Text-shadow also matched to the headline's amber glow for full cohesion.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.18.6 Pro — Build `20260421-007`
**Released:** April 21, 2026

### Bug Fixes

**Hive convergence count — subline too small**
The `4 OF 6 AIS AGREE` subline was rendering at `clamp(0.85rem, 1.5vw, 1.15rem)` with weight 600 and `0.12em` letter-spacing — visually tiny next to the **HIVE APPROVED** headline. Matched the count's typography to the headline: same `clamp(1.4rem, 3vw, 2.2rem)` font-size, weight 800, and `0.2em` letter-spacing. Kept color white for visual distinction from the amber headline. Moved count from `bottom: 17%` to `bottom: 12%` to give breathing room between the two now-equally-sized lines.

**Stale `style.css` cache-bust**
`index.html` was still referencing `style.css?v=3.18.2` even though the file had changed in 3.18.3, 3.18.4, and 3.18.5. Bumped to `3.18.6` to force cache refresh for anyone who had the page open.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.18.5 Pro — Build `20260421-006`
**Released:** April 21, 2026

### New Features

**Hive convergence — unified finish with count subline and custom fly-in sound**
The convergence moment now shows the satisfied-AI count as a subline beneath **HIVE APPROVED** — either `Unanimous · 6 of 6` when every AI agrees, or `4 of 6 AIs agree` for majority convergence. Count fades in 250ms after the main tagline. Wired through `showHiveFinish()` via new `satisfied` and `total` options, populated from both `runRound()` convergence branches using `noChangesCount` and `successfulReviews.length`.

Majority and unanimous now share the same finish sequence — 3-second overlay, 10 smoke puffs, custom fly-in sound — and no longer auto-pop the finish modal on unanimous. The user decides when to finish via the Finish button, which is safer when outstanding conflicts may still need review.

`playFlyingCarSound()` swapped from the synthesized doppler-swoop oscillator to Kai's custom `sounds/waxframe_hive_approved_flyin.wav` at 0.85 volume. Respects the mute toggle and fails silently if the file is missing or audio is blocked.

Smoke origin shifted left by 100px so the plume trails behind the bee (which enters from the left) rather than puffing straight up through the tagline. Implemented via `calc(50% - 100px + Npx)` on the per-puff `left` jitter.

### Bug Fixes

**Finish modal — button text unreadable in light mode**
Export Document, Export Full Transcript, Save Session Snapshot, and Start New Project all used `color: var(--accent)` or `color: var(--green)` by default, which made the text the same color as the border in light mode. Changed the default text color to `var(--text)` (readable in both themes) and added a hover rule that flips the color back to accent/green — matching the `.finish-modal-cancel` pattern already used by Back to Hive and Exit to Home. Disabled state unaffected (uses `!important` on its own color).

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.18.4 Pro — Build `20260421-005`
**Released:** April 21, 2026

### New Features

**Dev toolbar — convergence sequence test buttons**
Added three buttons to the dev toolbar for previewing the hive-finish convergence sequence without running a real round. `▶ Fly-in` plays the bee overlay silently (4s, 10 puffs) for animation-only preview. `▶ Majority` mirrors the majority-convergence trigger used in `runRound()` when some AIs still have suggestions — calls `playFlyingCarSound()` plus `showHiveFinish({ duration: 4000, smokeBursts: 10 })`. `▶ Unanimous` mirrors the full-agreement trigger — calls `playFlyingCarSound()` plus `showHiveFinish({ duration: 5000, smokeBursts: 14 })` and opens the finish modal at T+1800ms. Three helpers (`devTestFlyInOnly`, `devTestMajorityConverge`, `devTestUnanimous`) added to `app.js` directly after `hiveRand`. No production flows touched; dev mode only.

### Bug Fixes

**Dev toolbar — drag broken after mid-session unlock**
The drag-by-label listener was only wired inside the `DOMContentLoaded` handler, which runs when the page loads with dev mode already active. Unlocking dev mode via the password modal showed the toolbar but never attached the drag listener, leaving the toolbar pinned until the next page refresh. Extracted the drag logic into `attachDevToolbarDrag()` and called it from both paths (`DOMContentLoaded` and `submitDevPassword`). Double-binding is prevented by a `data-drag-attached` flag on the toolbar element.

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
