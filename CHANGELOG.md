# WaxFrame Professional — Changelog

---

## v3.20.18 Pro — Build `20260424-011`
**Released:** April 24, 2026

### Bug Fix

**Fake-baseline USER DECISION cards no longer surface unanimous votes as user choices**
A bug surfaced during testing where the Builder occasionally violated its own MAJORITY RULES instruction by surfacing a unanimous reviewer vote as a USER DECISION conflict. The pattern: all six bees would propose the same change, the Builder would correctly apply that change to the document, but it would also generate a USER DECISION block with the applied change as OPTION_1 (attributed to all six reviewers) and the unchanged original text as OPTION_2 (labeled "original text" rather than attributed to any reviewer). The user would then be presented with a "decision" between the already-applied text and the abandoned baseline — a non-choice. This release adds two layers of defense.

**Parser-side suppression in `extractConflicts`** — Added a second no-op check after the existing identical-text suppression. The new check fires when two conditions both hold: at least one option's `ais` field matches a baseline-label pattern (`original`, `original text`, `unchanged`, `baseline`, `no change`, `current`, `n/a`, `none`), AND the document's current text matches at least one option verbatim. Together those mean the Builder applied a unanimous change but tried to manufacture a 2-way choice with a fake baseline option. The decision is suppressed before reaching the UI and a console warning is logged: `⚠️ Suppressed no-op USER DECISION — unanimous vote, current already matches applied option`. This is the primary fix and works regardless of Builder LLM compliance.

**Builder prompt tightening in `BUILDER_INSTRUCTIONS.refine`** — Added a new rule under "Rules for USER DECISION format" explicitly prohibiting the Builder from including unchanged original text as an OPTION_N entry. The rule also reiterates that strict majorities should be applied silently, not surfaced as decisions, and explicitly names the "fake original text option" anti-pattern as a violation of the MAJORITY RULES block above. This reduces the frequency at which the parser-side suppression has to fire.

### Why two layers

LLM compliance with multi-clause instructions is not deterministic. Any time a Builder rule depends on the model correctly interpreting and applying a conditional, there will be drift — especially over long instruction blocks and across providers. The parser-side defense catches violations regardless of which Builder model is in use, which custom Alfredo model the user has configured, or what other prompt drift may be occurring. The prompt-side rule is belt-and-suspenders that reduces how often the parser has to step in.

### Testing Notes

This release affects the conflict-extraction path in `extractConflicts` and the refine-phase Builder instructions. Visual and functional regression risk concentrated in:
- USER DECISION cards on rounds where reviewers genuinely disagreed (3v3 splits, true conflicts) — these should still surface normally
- USER DECISION cards on rounds where multiple reviewers proposed substantially different alternatives — these should still surface normally
- Any round where the Builder incorrectly generated a fake-baseline option — these should now be silently suppressed with a console warning

The new suppression is conservative: it requires both a baseline-label pattern in an option's reviewer attribution AND the current document text to match an option verbatim. Genuine 3v3 splits with real reviewer attribution on both sides will pass through untouched.

### Files Changed

- `app.js` — Added unanimous-vote no-op suppression block in `extractConflicts` (insert after existing identical-text check). Added new rule to `BUILDER_INSTRUCTIONS.refine` USER DECISION format section. Bumped `BUILD` to `20260424-011`.
- `version.js` — Bumped `APP_VERSION` to `v3.20.18 Pro`.
- `index.html` — Bumped `waxframe-build` meta to `20260424-011` and `app.js?v=` cache-bust to `3.20.18`.
- `CHANGELOG.md` — This entry.

---

## v3.20.17 Pro — Build `20260424-010`
**Released:** April 24, 2026

### Documentation Fix — Document Playbooks

**Cover Letter playbook round estimate updated from `2–4 rounds typical` to `6–10 rounds typical` (measured, not estimated)**
A walkthrough run on a real cover letter (Senior Wireless Network Engineer, Helios Biosciences, Dana Reyes) measured majority convergence at Round 10 — four of six AIs reporting no further changes. The prior estimate of 2–4 rounds was significantly understated for this document type. Unlike shorter transactional documents (cookies recipe: 2 rounds measured, thank-you note: 2–4 rounds), cover letters require iterative tuning of hook specificity and role-connection tightness, which takes more rounds than edit-heavy but structurally simple documents. Updated the playbook's Rounds field to reflect the measured behavior, with a short explanation of *why* cover letters converge more slowly so users calibrate their expectations before starting rather than wondering if something is broken at round 5.

### Latent Bug Fix

**`version.js` cache busts across the remaining four helper pages**
v3.20.16 fixed the stale `version.js?v=3.19.23` cache bust on `waxframe-user-manual.html`, but the same stale cache bust existed on every other page that loads `version.js`: `document-playbooks.html`, `api-details.html`, `what-are-tokens.html`, and `prompt-editor.html`. All four had been stuck at `3.19.23` for many releases. Bumped all five (including the manual, which follows the established per-release bump rule) to `3.20.17` in one pass, completing the fix. Going forward, every release should bump the `version.js?v=` cache bust on all five helper pages alongside the four standard version locations.

### Files Changed
`document-playbooks.html` · `waxframe-user-manual.html` · `api-details.html` · `what-are-tokens.html` · `prompt-editor.html` · `app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.20.16 Pro — Build `20260424-009`
**Released:** April 24, 2026

### Documentation Fixes — User Manual

**The "concept in plain English" closing sentence rewritten**
Previously two short, abrupt sentences: *"Each round the document improves. You stop when it is good enough."* Reworded per Candy's suggestion to a single flowing sentence: *"Each round the document improves — you stop when you're satisfied with the result."* Same meaning, smoother voice.

**Step 1 — stale "even count / tie risk" warning paragraph rewritten**
The Step 1 section described a `⚠️ even count — tie risk` warning chip and a `✓ odd count` indicator on the hive count chip — neither of which appears in the current app. The warning was intentionally removed from the codebase in an earlier release because WaxFrame's convergence logic is a threshold check (a majority of the hive must agree on "no more changes"), not an either-or vote between competing proposals — so tie scenarios genuinely don't arise. The manual paragraph never caught up to that change. Rewrote it to describe the chip as it actually behaves now (purely informational, total + key-saved counts, no warnings), and explained briefly *why* tie risk doesn't apply. Surfaced by Candy during walkthrough — she had 6 AIs and was looking for a warning that no longer exists.

**Step 2 — Builder selection icon description corrected**
The manual stated the selected Builder card on Setup 2 is *"highlighted and marked with a crown icon (👑)."* The actual UI shows a Builder badge (`WaxFrame_Builder_v3.png`) — a small crowned-bee image in the top-right corner of the selected card. The 👑 character emoji crown only appears in the Change Builder modal accessible from the Work screen, where the selected entry gets a *"👑 Current"* label. Rewrote the paragraph to describe the Builder badge accurately and to clarify when the emoji crown does appear, so users know what to look for in both contexts. Surfaced by Candy ("Manual says the selected builder has a crown icon, but on mine it's a bee").

**Step 2 — "US providers" framing replaced with "other providers"**
The DeepSeek cost-comparison sentence read: *"DeepSeek in particular offers excellent output at a significantly lower cost than the US providers..."* Reworded to *"...than the other providers..."* Per Candy's note — the US-vs-not framing was unnecessary and read awkwardly given that two of the six default providers (Grok and DeepSeek) don't fit the comparison cleanly anyway.

### Latent Bug Fix

**Stale `version.js` cache bust on the user manual**
The user manual's `<script src="version.js?v=3.19.23">` tag had been stuck at `3.19.23` for many releases — every release bumps the `app.js?v=` cache bust on `index.html` but the `version.js?v=` cache bust on the manual page was being missed. Updated to `3.20.16`. Going forward, the version.js cache bust on `waxframe-user-manual.html` should be bumped on every release alongside the standard four version locations (meta build, APP_VERSION, BUILD, app.js cache bust).

### Audit — Back-to-Top Navigation

Candy flagged a concern that the appendix sections were missing back-to-top links. Audited every `<div class="wh-section">` block in the manual against its corresponding `<a href="#top" class="wh-back-top">` link. Result: all 18 sections (3 intro, 10 steps, 3 appendices, 2 reference) have a back-to-top link inside the last `wh-block` of the section, anchoring to the `#top` ID on the `page-main` container. **Nothing missing.** Possible misread on Candy's part — recommend confirming with her in case she meant per-subsection back-to-tops within a single appendix (each appendix has 3-4 wh-blocks and only one back-to-top at the section's bottom; that pattern is consistent with every other section but could feel sparse on the longer appendices).

### Known Open

**Setup Flow "squishy and distorted bullets"** — Candy reported that the bullets in the "Setup flow" section look squishy and distorted. That section uses a `<table class="wh-table">`, not bullets, so the comment can't be acted on without a screenshot showing the visual issue. Held pending screenshot.

**Cover letter format vs paragraph length gate** — Surfaced earlier in the session: a cover letter's standard structure (greeting + body + sign-off) measures as 5 blank-line-separated blocks, but users intuitively count 3 body paragraphs. A 3-paragraph limit on a cover letter is therefore unsatisfiable — every Builder produces 4-5 blocks and the gate correctly rejects each round in a loop. Three solution paths offered (docs-only, pre-flight warning, prompt-side escape hatch) — pending direction.

**Empty-console bug after work → upload → return navigation** — Candy's original walkthrough bug from the v3.20.15 cycle. Her flow used "Return to Work Screen" (active session detected) which routes through `goToScreen('screen-work')` → `initWorkScreen()` without `isNewSession`, so neither the v3.20.15 fixes nor anything before them explains the empty console. Suspect lives in the file-upload flow. Investigation continues.

### Files Changed
`waxframe-user-manual.html` · `app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.20.15 Pro — Build `20260424-008`
**Released:** April 24, 2026

### Bug Fixes

**Live console could be wiped by normal user actions — violated "the console is an audit log, not a scratchpad" design intent**
Two separate paths were wiping `#liveConsole` outside of an explicit destructive action:

1. **A `✕ Clear` button sat next to the `📋 Copy` button in the console header**, wired to a `clearConsole()` function that replaced the console's innerHTML with "Console cleared." There is no legitimate use case for clearing the console mid-session — the console is the session's audit log of what happened in every round — and the existence of the button invited accidental wipes. Removed the button from `index.html` and deleted the `clearConsole()` function from `app.js`. The Copy button stays.

2. **`initWorkScreen(true)` at the top of the work-screen initializer unconditionally wiped `#liveConsole`, `#conflictsPanel`, and `#workNotes` whenever `startSession()` ran.** This fires on every "Launch WaxFrame →" click, which means a user who started from scratch, clicked Smoke the Hive, had a round fail (no history recorded), navigated back, and re-launched would silently lose every console entry they had. Removed the wipe block from `initWorkScreen()` entirely. The responsibility for zeroing the live-console and conflicts panels now lives solely in `clearProject()` — the one user-initiated, explicitly-labeled destructive action. `#workNotes` was already being wiped in `clearProject()` at line 1844, so that behavior is unchanged.

This enforces the design principle that no routine navigation, re-launch, or input change should ever wipe the session log. The only way to clear the console is to explicitly end the project via `Finish Project & Start Over`.

### Known Still-Open

**Candy reported an empty console after navigating `work screen → Starting Document → upload file → Return to Work Screen`, where the launch button had correctly changed to `↩ Return to Work Screen` (i.e., an active session was detected).** That flow routes through `goToScreen('screen-work')` which calls `initWorkScreen()` without the `isNewSession` flag, so neither of the fixes in this release directly addresses her scenario. A different path in the file-upload flow is suspected but not yet pinned. Investigation continues in a subsequent release.

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.20.14 Pro — Build `20260424-007`
**Released:** April 24, 2026

### Bug Fixes

**Round Not Saved modal body text was stale after the v3.20.13 length-gate refactor**
The modal shown on a length-gate rejection had inherited pre-refactor bloat-gate copy, which framed every failure as an anti-bloat heuristic ("the Builder added to the document instead of refining it"). That wording was accurate for the fallback 1.5×-prior-words case but misleading when the user had set an explicit Paragraphs or Characters limit and the Builder simply overshot the cap — exactly the case surfaced by the first Cover Letter playbook test run where DeepSeek returned 5 paragraphs against a 3-paragraph limit. Rewrote the lead paragraph to frame the rejection as "exceeded the length limit" and point the user at retrying, switching Builders, or adjusting the Length Constraint on the Project screen. The measurement and limit were already being displayed correctly in the details block beneath the message — only the lead paragraph needed updating.

**Pulsing logo watermark overflowed the content column on Starting Document screen**
The `::after` pseudo-element that renders the pulsing WaxFrame logo in the dead space right of the content column on `#panel-upload`, `#panel-paste`, and `#panel-scratch` was sized at a fixed `300px` with `background-position: center`. At narrower panel widths the 300px image — whose visible hex frame is wide and whose honey drip extends from the top-right corner downward — could bleed visually into the content column because center-positioning put the hex close to the dead-space's left edge and the hex's hollow interior let drop-zone content show through its middle, reading as overlap even when the bounding boxes did not actually intersect.

Three surgical changes in the pseudo-element rule:
- `background-size: 300px` → `background-size: min(240px, 85%)`. Reduces maximum size by 20% and uses CSS `min()` so the image scales down (never overflows) at narrow dead-space widths.
- `background-position: center` → `background-position: right 24px center`. Right-anchors the watermark with a 24px buffer from the right edge. If overflow ever does occur, it clips at the right margin rather than bleeding into the content column.
- Added explicit `z-index: 0` to the pseudo-element so its stacking context is deterministic regardless of sibling positioning.

No animation changes — the `watermarkPulse` keyframes and 16-second cycle are untouched.

### Changes

**Tone & voice goal-field hint rewritten — floor → better framing matches the other goal fields**
The hint under the Tone & voice field previously told users to "Pick two or three words," which set a low ceiling on how much guidance they offered the AIs and produced inconsistent tone across rounds. This was the one goal field hint out of six that didn't use the floor-then-better cadence the other five already use (*be specific — "cover letter" not "document"* for Document type, *"IT Director and VP of Facilities" gives very different results than "general public"* for Target audience, etc). Rewrote the hint to match: a few adjectives (*professional, confident*) works as a floor, and a richer directive (*Direct and confident, not stiff — like a peer they'd want to work with*) locks in consistency across rounds. The matching row in the user manual's Step 3 "What each field does" table updated to the same framing.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `waxframe-user-manual.html` · `CHANGELOG.md`

---

## v3.20.13 Pro — Build `20260424-006`
**Released:** April 24, 2026

### Changes

**Length Constraint — new Paragraphs unit added, direct-unit measurement across the board**
The Length Constraint field on the Project screen now supports four units — `Characters`, `Words`, `Paragraphs`, `Pages` — in that order. Paragraphs is new. The field also drops its `(optional)` label since the three required goal fields (Document type, Target audience, Desired outcome) are already marked with asterisks and everything else is optional by elimination.

More importantly, the bloat gate that enforces the length limit has been refactored from a single "normalise everything to word count" path into a direct-unit measurement. When the user sets a limit in `Characters`, the gate now counts characters in the Builder output and compares to the exact limit. Same for `Words` (whitespace-split token count) and `Paragraphs` (blank-line-separated blocks, whitespace-only blocks dropped). `Pages` remains word-estimated via `WORDS_PER_PAGE = 500` because pages aren't directly countable from raw text — font, margins, and line spacing all affect rendered page count, and WaxFrame doesn't have a layout engine.

This eliminates a subtle accuracy bug in the previous implementation: for Characters mode, the old gate converted the user's character limit into a word-equivalent (`limit / 5.5`) and compared word counts, which could pass documents over the character limit if they had short words, or reject documents under the character limit if they had long words. Now the measurement is exact.

The AI prompt sent each round uses direct-unit wording too: *"The final document must contain no more than N words"*, *"...no more than N characters, including spaces"*, *"...no more than N paragraphs, separated by blank lines"*. Pages alone keeps the hedge: *"Target N pages (approximately M words). Pages depend on font and layout..."* — because that's the truth for that unit.

When the gate triggers, the error message now reports in the user's chosen unit — *"Length gate triggered — 247 words vs limit 200 words"* — rather than forcing every failure into a word-count shape. The console log, the bee status, and the failed-round details all carry the same unit-correct wording.

### New Feature

**Length Constraint info modal + user manual transparency section**
A new ⓘ button next to the `Length Constraint` heading on the Project screen opens an info modal explaining exactly how each unit is measured, including the fuzzy edges (Microsoft Word word-count divergence on hyphenated terms, UTF-16 counting for emoji in Characters mode, blank-line detection in Paragraphs, the 500-word-per-page approximation in Pages). The modal reuses the existing `finish-modal-overlay` / `goal-info-modal` structure — no new CSS.

The user manual (`waxframe-user-manual.html`) Step 3 gets a matching expansion: the existing `Length Constraint` block updated for accuracy (units reordered, `(optional)` dropped), and a new sibling block `How Length Constraint is measured` containing the full transparency table (Unit × How it is counted × Notes). Manual and modal tell the same story — the modal for in-context "what does this field do" moments, the manual for users who want to understand the behavior end to end before relying on it.

### Code Cleanup

**Orphan `.length-constraint-optional` CSS rule removed**
The CSS rule styling the `(optional)` span (font-size, font-weight, color, margin-left) had no remaining consumers after the span was removed from `index.html`. Deleted from `style.css` to keep the stylesheet free of dead weight.

### Known Deferred

**Pulsing logo watermark overflow into drop zone on Starting Document screen** — the `::after` pseudo-element on `#panel-upload` / `#panel-paste` / `#panel-scratch` can visually bleed into the content column at certain viewport widths because the 920×920 background image's visible drip extends into the horizontal region intended for content. Deferred to a dedicated next release so a CSS layout fix doesn't bisect-conflict with this release's length-constraint behavioral refactor. Candidate fixes under evaluation: anchor `background-position: right center`, reduce `background-size`, or add a `padding-right` buffer.

**Paragraph gate counts blocks, not semantic paragraphs** — the paragraph gate detects blank-line separation (`\n\s*\n`). A Builder that returns one run-on block with only single newlines between logical paragraphs will count as 1 paragraph and pass. The AI prompt explicitly instructs "separated by blank lines" to force proper formatting, so this is a low-probability failure mode in practice, but it's worth knowing about.

### Files Changed
`index.html` · `app.js` · `style.css` · `version.js` · `waxframe-user-manual.html` · `CHANGELOG.md`

---

## v3.20.12 Pro — Build `20260424-005`
**Released:** April 24, 2026

### Bug Fixes

**Edit Hive button no longer hidden on large viewports**
The `Edit Hive` button next to `Change Builder` in the Hive panel header was invisible at any viewport wider than `1600px` due to a legacy responsive rule that applied `display: none` globally and flipped it back to `inline-flex` only inside the `@media (max-width: 1600px)` block. The original design intent was that on large screens, users would toggle AIs via checkboxes on the hex cards directly, and the dedicated button was only needed when cards collapsed to the dot strip at laptop width. In practice, the button is a more discoverable central control for the same action and should be available regardless of viewport.

The underlying button markup in `index.html`, the `openEditHive()` / `closeEditHive()` handlers in `app.js`, and the `editHiveModal` markup and styling were all intact — only the CSS visibility gate had removed the button from the UI on large displays.

### Code Cleanup

**Removed three dead JavaScript functions identified during full-codebase audit**
A cross-reference audit of every top-level function definition in `app.js` against all caller sites (HTML `onclick` handlers, JS call graph, string-constructed references) surfaced three functions with zero live callers anywhere in the codebase:

- `goToFree()` — a three-line helper that opened the Free edition URL in a new tab. Leftover from a previous navigation entry that no longer exists.
- `playUnanimousFanfare()` — a ~45-line WebAudio implementation of an ascending C-E-G-C major arpeggio with a sparkle ping cap, originally used for unanimous-convergence celebrations. Superseded by Kai's custom `waxframe_hive_approved_flyin.wav` audio asset used by the current convergence flyer.
- `validateAndContinue()` — a one-line alias delegating to `continueFromBees()`, explicitly labeled in its own comment as "Legacy alias — kept for any nav-menu calls." No such nav-menu calls exist; the only live caller of the underlying flow uses `continueFromBees()` directly.

Total reduction: 52 lines from `app.js`. No runtime behavior changes; the audio fanfare produced by `playUnanimousFanfare()` hasn't been heard in production since the convergence flyer was rebuilt around the `.wav` asset.

### Known Backlog

The same audit identified a larger CSS cleanup opportunity — roughly 85 validated orphan CSS classes clustered around old welcome-screen cards, bee UI leftovers, an unused text-utility suite, and miscellaneous one-offs — plus 29 inline `style=` attributes across `index.html` and `document-playbooks.html` that violate the house "no inline CSS" rule. Deferred to a dedicated cleanup release where each orphan can be verified against dynamic class construction patterns and the inline styles can be consolidated into proper utility classes without mixing concerns with a bug fix.

### Files Changed
`style.css` · `app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.20.11 Pro — Build `20260424-004`
**Released:** April 24, 2026

### Changes

**Nav panel header now includes tagline and version stamp**
The slide-in navigation menu (triggered by the hamburger/menu button on every screen) previously showed only the WaxFrame logo and wordmark in its header, with the close button to the right. Every other surface of the product — hero screen, helper pages, About modal — pairs the wordmark with the tagline ("Many minds. One refined result.") and the current version stamp. The nav panel was the lone exception, which made it inconsistent and also meant users had to navigate to the About WaxFrame modal to check which version they were on.

Added a `.nav-panel-brand-text` flex column inside the existing `.nav-panel-brand` container. It holds three stacked elements: the wordmark (existing), a new `.nav-panel-tagline` span in muted uppercase matching the hero treatment, and a new `.app-version-stamp.nav-panel-version` span that gets auto-populated by the existing `version.js` propagation logic at line 7201 of `app.js`. No JavaScript changes required — the auto-populate routine already targets every `.app-version-stamp` in the DOM.

Styling matches the hero brand block: tagline at 10px `var(--muted)` uppercase with 0.06em letter-spacing, version stamp at 10px `var(--text-dim)` uppercase (same readability treatment the hero header got in v3.20.6). The logo retains `flex-shrink: 0` and the text column gets `min-width: 0` to prevent overflow issues if the nav panel is narrow on a small viewport.

### Files Changed
`index.html` · `style.css` · `version.js` · `app.js` · `CHANGELOG.md`

---

## v3.20.10 Pro — Build `20260424-003`
**Released:** April 24, 2026

### Code Cleanup

**CSS `!important` cleanup pass 2 — 19 flags eliminated from state-override rules**
Completed the second round of `!important` elimination across six selector clusters that had been relying on `!important` to force state-specific visual overrides. Total count dropped from 45 flags to 26, with all 26 remaining in legitimate contexts (print stylesheet, `prefers-reduced-motion` overrides, mobile overlay hiding, `::selection` pseudo-element). Each fix leaves the rendered UI visually identical while removing the cascade debt.

**Convergence card state rules** — Four flags removed from `.convergence-card`, `.convergence-card.declined`, and `.convergence-card.custom-selected`. Root cause: HTML renders `.convergence-card` on the same element as `.decision-card`, so the base `.decision-card` rule with `border: 1px solid var(--amber)` was competing at equal specificity (0,1,0). Fix: upgraded selectors to compound `.decision-card.convergence-card` which bumps to specificity (0,2,0) and beats the base rule naturally. Same technique applied to `.declined` and `.custom-selected` state variants.

**Decision option button selected states** — Six flags removed from `.decision-opt-btn.selected.decline-btn` and `.decision-opt-btn.selected.custom-btn` plus their nested `.decision-opt-num` child rules. Root cause: the child `.decision-opt-num` state rules at these locations were duplicating what the variant-specific rules at lines 6176-6179 (`.decision-opt-btn.selected .decision-opt-num-decline` etc.) were already doing correctly. Since the child rules were redundant, they were deleted entirely rather than reworked; the parent `.decline-btn` and `.custom-btn` rules retained their border/background values with `!important` stripped since they naturally win via source order against the generic `.decision-opt-btn.selected` rule above.

**Decision option custom and bypass variants** — Four flags removed from `.decision-opt-custom.selected` and `.decision-opt-bypass.selected`. Root cause: these rules were fighting the generic `.decision-opt-btn.selected` rule at equal specificity (0,2,0). Fix: these variant-specific rules already come after the generic one in source order, so at equal specificity the cascade naturally selects them. `!important` was cargo-culted and never needed.

**Bypassed decision card** — Three flags removed from `.decision-card.bypassed` and its `.decision-badge` child. Root cause: 2-class selector naturally beats single-class `.decision-card` base at specificity (0,2,0) vs (0,1,0). The sibling `.decision-card.resolved` rule had never used `!important` and worked correctly, confirming this one didn't need it either.

**History response tab active state** — Four flags removed from `.hist-resp-tab.active` (background, border-color, color, font-weight). Root cause: fighting the `.work-phase-pill` base rule that coexists on the same element at equal specificity. The active rule comes much later in the stylesheet, so source order already wins without `!important`.

**Finish modal button disabled states** — Three flags removed from `.finish-modal-btn-disabled` and its `:hover` pseudo-class. Root cause: competing with `.finish-modal-btn-export` and `.finish-modal-btn-new` at equal specificity. Disabled rules come later in source order, so cascade naturally selects them.

### Why this matters

Every `!important` flag is a cascade escape valve — a developer saying "I couldn't make CSS behave normally so I'm going to force this rule to win." The cost is that any future rule needing to override the forced value also has to use `!important`, which cascades into a "specificity arms race" where every state gets progressively more flags. Cleaning these up restores normal cascade behavior so future state rules don't need escalation. The 26 remaining flags genuinely require the escape valve (print overrides, motion preferences, mobile takeover, browser-default selection colors) — those are the legitimate cases the feature was designed for.

### Testing Notes

This release touches visual state rules on convergence cards, decision cards, decision option buttons, history response tabs, and finish modal disabled/done states. Visual regression risk concentrated in:
- Convergence cards on resolved rounds (all reviewers agreed)
- Decision cards on rounds with reviewer disagreements (hot conflicts, bypass actions, custom text)
- Decision option buttons in all four variants (apply/decline/custom/bypass) when selected vs unselected
- History response tabs when switching between document and notes views
- Finish modal export/new buttons when disabled

If any of those states renders differently than expected after update, the specificity fix isn't winning where intended — easy to chase down, just file the regression.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.9 Pro — Build `20260424-002`
**Released:** April 24, 2026

### Bug Fixes

**Three modals had redundant top-right close buttons**
Following the convention applied to the Import from Model Server modal in v3.20.7, removed the top-right `✕ Close` button from three additional modals that had footer `← Close` buttons performing identical actions: the Test All Keys results modal, the Console Error Detail modal, and the single-key Test Key modal. Each modal now has a single discoverable escape hatch in the footer, consistent with the conventional modal dialog pattern used elsewhere in the product.

For the Test All Keys modal specifically, the `tkpDismiss` id was moved from the deleted top-right button to the footer button so the existing dynamic-label logic (button reads "Testing…" while tests run, then switches to "← Close" when done) continues to work. The disabled-state signal is now displayed on the footer button where it's more naturally in the user's line of sight at the end of the test run. Button label updated from `✕ Close` to `← Close` to match the footer button convention.

All three modals retain their overlay click-outside-to-close behavior, so dismissing via any part of the surrounding dim region still works as expected.

### Code Cleanup

**Removed orphan `.import-server-close-btn` CSS rules**
The `.import-server-close-btn` class was originally defined for the Import modal's top-right button, then reused for Test All Keys, Console Error Detail, and single-key Test modals as those features were added. With v3.20.7 and v3.20.9 removing all four instances, the class had no remaining consumers. Deleted the `.import-server-close-btn` and `.import-server-close-btn:hover` rules from `style.css` to keep the stylesheet free of dead weight.

### Not Fixed / Note

The `Content-Security-Policy: frame-ancestors` console error referencing `menu.html` that was noted during earlier debugging sessions is not generated by WaxFrame — no WaxFrame file references `menu.html`. The error originates from a browser extension loading content into a frame on the page. No code change applicable on our side.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.8 Pro — Build `20260424-001`
**Released:** April 24, 2026

### Bug Fixes

**Import from Model Server — valid server config lost unless user added at least one new model**
The `saveImportServerDefaults()` call lived only inside `addImportServerModels()`, which fires when the user clicks Add N to Hive. In practice, a user who opens the modal, successfully fetches a model list, and then closes the modal without adding anything (because all models are already in the hive, or because they were just verifying the server was reachable) would lose the validated server configuration entirely. On the next modal open, the three fields would be blank — with no indication that the previous fetch had actually succeeded. This was the root cause of the symptom reported where URL fields appeared empty despite the user having used Import successfully in an earlier session.

Fixed by moving the save call up into `fetchImportServerModels()` at the point of a successful 200 response with a valid model list. The `has-saved-key` class on the inner modal is also applied at that moment so the three 🔑 saved flags light up immediately, giving visual confirmation that the config was stored. The existing save call in `addImportServerModels()` is retained as belt-and-suspenders redundancy — if Fetch somehow failed to save but Add succeeds, the data still lands in localStorage.

Rationale: the moment three fields return HTTP 200 with a valid model list, they've proven themselves valid and are worth remembering regardless of whether the user ultimately adds any models from this session. The "save on commit" heuristic from earlier versions was too strict for this flow — Import is as much a diagnostic tool as a commit tool.

**Import from Model Server — silent localStorage failures now surface to console and toast**
Previous save/load/clear wrappers had `try { ... } catch(e) {}` with empty catch blocks, which swallowed every possible storage error (quota exceeded, permission denied, JSON parse failure, etc.). If localStorage ever failed to persist a value, the user would have no visible indication — the next modal open would just show blank fields with no explanation.

Replaced with explicit error handling: save now logs the exception to `console.error` with the tag `[import-server]` and surfaces a toast to the user explaining that their server config couldn't be remembered. Save also now performs an immediate read-back verification — if `localStorage.setItem` appears to succeed but the value doesn't round-trip through `getItem`, we flag it. Load and clear get the same treatment. This converts "silent mystery failures" into "diagnosable incidents" for any future storage weirdness.

### Changes

**Hive count chip — even-count tie-risk warning removed**
Earlier iterations added an amber ⚠️ "even count — tie risk" warning to the hive count chip on the Worker Bees setup screen, suggesting that an even number of voting AIs could produce tie votes on convergence rounds. After reviewing the actual convergence logic in `app.js`, this warning was determined to be misleading — WaxFrame's convergence is a one-sided threshold check (`Math.floor(noChangesCount) >= Math.floor(n/2) + 1`) rather than an either-or vote between competing options, so tie scenarios are mathematically impossible in the current model. The Builder synthesizes ALL reviewer suggestions into the next iteration regardless of count; there's no "winning proposal" that could tie.

Removed the warning and corresponding odd-count confirmation badge from `renderHiveCountChip()`, the associated `.hive-count-warn` and `.hive-count-ok` CSS rules, and the "Even count tie risk" explainer row from `infoBeesModal`. The chip now shows a clean informational line — `N AIs in hive · M with keys` — and nothing else. User's testing history empirically confirmed no ties had ever occurred; the warning was solving a problem that didn't exist.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.7 Pro — Build `20260423-013`
**Released:** April 24, 2026

### Bug Fixes

**Desktop layout — checklist appeared below a large empty region instead of filling cols 2+3**
In v3.20.6 the desktop tier rules set `grid-column: 2 / 4` on `.import-server-col-checklist` in ready state, with the intent of letting the checklist span cols 2 and 3. However `.import-server-col-middle` was still in the DOM and occupying col 2 by default. CSS Grid's auto-placement algorithm could not place the checklist into cols 2-3 because col 2 was taken, so it was pushed down to row 2 of the grid — which produced the visually jarring effect of an empty middle region on top and the checklist dropped below it.

Fix applied: desktop tier now explicitly hides `.import-server-col-middle` with `display: none` in ready-default state, matching the laptop tier's swap-based approach. The checklist now has a clear col-2-through-col-3 span to fill. This is a cleaner design overall — the right region is either the checklist OR the raw response OR the error pane, never two panes side-by-side, which keeps the user's mental model consistent across viewport sizes.

**Desktop raw response toggle produced a three-column split instead of replacing the checklist**
Previous desktop rule left the checklist in col 3 when raw was toggled on, producing a three-column layout (inputs | raw | checklist). The user's expectation — and the stated design intent — was that raw response should REPLACE the checklist, not sit beside it. Same semantic as toggling between two views, consistent with laptop behavior.

Fix: when `.import-server-raw-visible` is active on desktop, `.import-server-col-middle` now spans `grid-column: 2 / 4` and `.import-server-col-checklist` is set to `display: none`. Clicking View response details swaps the right region fully from checklist to raw; clicking Back to models swaps it back. One pane, never two.

**Redundant X close button in modal header removed**
The header contained a small ✕ button in the top-right corner that duplicated the Cancel button in the footer. With the v3.20.6 change that makes Add 0 to Hive also close the modal when zero models are selected, there were three different ways to exit: ✕, Cancel, and Add 0 to Hive. Removed the ✕ since Cancel is the discoverable and conventional escape hatch for modal dialogs, and its location in the footer keeps it consistent with the primary action (Add N to Hive) sitting next to it.

The overlay click-outside-to-close behavior (`onclick="if(event.target===this)closeImportServerModal()"`) is retained so users can click the dark area outside the modal to dismiss it.

### Changes

**Hive count chip — removed bee emoji and restored hover cursor on warning badges**
The chip text previously read `🐝 9 AIs in hive · 8 with keys`. The 🐝 emoji was removed per user preference — the surrounding context (Worker Bees page, hive terminology) already makes the subject clear without iconography.

The `.hive-count-warn` and `.hive-count-ok` badges had `cursor: help` removed in v3.20.6 as part of the "don't look like a button" cleanup. That made the tooltip effectively undiscoverable since nothing suggested the text was interactive. Restored `cursor: help` on both badges so hovering now shows the question-mark cursor, which is a standard UI hint that additional information is available via tooltip. The badges still have no border, no background, and no padding — so they remain visually passive, just with discoverable hover behavior.

**Tie-risk explainer added to the Worker Bees info modal**
The hover tooltip on the even-count warning is useful but not obvious — users have to intuitively hover on the right element to see it. Added a new Info row to the `infoBeesModal` (the ⓘ button at the top of the Worker Bees screen) titled "Even count tie risk" that explains the summary line above the AI grid, the warning text, why even counts cause problems on convergence rounds, and how to resolve it (add or remove one AI with a key to reach an odd count). The inline warning + hover tooltip + info modal entry together form a three-tier disclosure: instant scan (warning color), on-demand detail (hover), and full explanation (info modal) for users who want to understand the mechanics.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.6 Pro — Build `20260423-012`
**Released:** April 23, 2026

### Bug Fixes

**Raw response panel was visible in every state due to CSS cascade conflict**
The `.import-server-raw-panel` rule at line 2671 of `style.css` contained `display: flex` as part of its layout block. The base visibility rule at line 2591 set `display: none` on the same class. Because both rules have identical selector specificity (single class), CSS cascade resolution favors the later rule — which meant `display: flex` always won, overriding the hide rule and making the raw response panel render permanently with its empty ENDPOINT/STATUS/RECEIVED header cells visible before any fetch had occurred. This was the root cause of the "ghost panel" visible in pre-fetch state on both laptop and desktop viewports.

Fixed by removing `display: flex` from the base `.import-server-raw-panel` rule and moving the display value into the state-scoped show rule. The rule `.import-server-modal.import-server-state-ready.import-server-raw-visible .import-server-raw-panel` now sets `display: flex` directly; pre-fetch, loading, and ready-without-toggle states correctly inherit `display: none` from the base rule. The same fix was applied to the two error-state rules (laptop tier and desktop tier) that previously used `display: block` which would have clobbered the flex layout — now `display: flex` on both so error state gets the same flex-column raw panel layout the toggled-on case uses.

This was the exact kind of bug I warned about in earlier notes — later rules with equal specificity silently winning cascade battles. Caught this one by actually reading the cascade output instead of trusting the state class rules to do the work alone.

**Hive count chip looked like a clickable button**
The chip had `padding: 8px 14px`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, and a tinted background — collectively producing a pill-shaped container indistinguishable from the toolbar buttons above it. The even-count warning and odd-count confirmation badges inside were additionally styled with their own borders, tinted backgrounds, and `cursor: help`, which made them look like independent clickable sub-buttons. Hovering triggered a tooltip (via the `title` attribute) which further reinforced the "interactive element" assumption.

Stripped all button-like styling from `.hive-count-chip`: no padding other than 6px vertical for breathing room, no border, no background, no border radius. It now reads as a plain status line. The `.hive-count-warn` and `.hive-count-ok` badges inside lost their borders, tinted backgrounds, and `cursor: help` — now just colored text (warning in amber, ok in faint) to signal the meaning without suggesting interactivity. The tooltip was dropped entirely since the text itself explains the situation clearly enough.

**Add N to Hive button acted disabled-but-lit when N was 0**
When zero models were checked, the button was set to `disabled` but retained its accent-yellow styling. The yellow accent signals "primary action, press me next" — which conflicted with the disabled state that prevented clicks. Users in the testing round tried to click it multiple times expecting something to happen, since the visual weight of an accented button overrides the greyness of a disabled state in peripheral vision.

Changed the behavior to make the button an always-active escape hatch: when 0 models are selected, clicking it closes the modal with no changes to the hive (identical to Cancel). `updateChecklistCount` no longer sets `btn.disabled = true` for zero-count, and `addImportServerModels` now returns early via `closeImportServerModal()` when the check list is empty rather than displaying the previous "⚠️ No models selected" toast. The button label still reads "Add 0 to Hive" for honesty — the user sees exactly what will happen — but the button is now pressable and does something sensible.

**Version stamp at top of page was barely readable in dark mode**
`.fs-header-brand .app-version-stamp` and `.page-header-brand .app-version-stamp` rules used `color: var(--muted)` combined with `opacity: 0.7`, which compounded to render the version text nearly invisible against the dark modal background. Users reported having to squint to read which version was running — not ideal during a multi-version patch-release cycle where version identification is important.

Changed both rules to `color: var(--text-dim)` (the same shade used for body copy in secondary contexts) and removed the `opacity: 0.7` attenuation entirely. The tagline ("Many minds. One refined result.") already uses `var(--muted)` without opacity, so the version stamp is now slightly MORE prominent than the tagline — which is correct for a diagnostic element that should be scannable without effort.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.5 Pro — Build `20260423-011`
**Released:** April 23, 2026

### Changes

**Saved flag now appears on all three restored fields**
The 🔑 saved indicator was previously shown only next to the API Key label, implying that only the key was restored from localStorage when in fact all three fields (Chat Endpoint, Models Endpoint, API Key) get populated together on modal open. The inconsistency made it unclear whether the URLs were also remembered. Added identical saved spans to the Chat Endpoint and Models Endpoint labels, controlled by the same `.has-saved-key` class on the inner modal so they appear and disappear as a unit. The old `id="importServerKeySaved"` was removed from the API key span since all three now share the same class-based toggle and individual IDs are not needed.

**Desktop raw response now toggle-only**
On desktop (≥1601px), v3.20.0 through v3.20.4 kept the raw response panel permanently visible in column 2 whenever the fetch succeeded. This was a hangover from the original three-column design that assumed all three panes should always be populated on desktop. In practice the raw JSON is a diagnostic almost nobody needs after a successful fetch — the checklist is what the user came for. The permanent raw pane was consuming 33% of the horizontal real estate for content that rarely mattered, squeezing the model ID labels for no good reason.

Desktop tier now matches laptop: the default ready state shows the checklist spanning cols 2+3, and raw response only appears (in col 2, with checklist collapsing back to col 3) when the user clicks the View response details button. The button behavior, label, and state are identical across both viewport tiers.

**Error state auto-shows raw response on both tiers**
When a fetch fails, the user immediately needs two things: a friendly explanation of what went wrong (title, description, suggested fixes) and the raw server response for forensic evidence. Previously the raw response was hidden in error state, forcing the user to click the toggle to inspect the actual server reply. That's an unnecessary extra click during a moment of frustration.

Both laptop and desktop tier media queries now include a rule that auto-displays the raw response panel in error state, rendered stacked below the error pane within the merged cols 2+3 region with a 14px top margin for visual separation. The user gets the explanation on top and the proof immediately below in a single glance.

**Fetch Models button accent state is now state-dependent**
Previously the Fetch Models button kept its `btn-accent` class across all states, which is incorrect after a successful fetch — at that point the primary call-to-action becomes Add N to Hive in the footer, not Refresh on the side. Keeping Fetch accented post-fetch created two competing "press me next" signals.

`resetImportServer()` applies `btn-accent` (pre-fetch state = Fetch is the primary action). On successful fetch, `fetchImportServerModels()` removes `btn-accent` and relabels the button to Refresh — now a standard secondary action matching View response details and Forget saved server in visual weight. Pressing Forget saved server returns to pre-fetch state, which re-applies the accent via `resetImportServer()`.

**Secondary buttons now horizontally arranged and uniformly styled**
View response details and Forget saved server were previously stacked vertically as two separate full-width dashed-border elements below the Fetch row, which read as a staircase of loose actions rather than a paired set. They were also visually inconsistent with every other `.btn.btn-sm` in the product (solid subtle border, no dashed outline).

Added a new `.import-server-actions-row` container that lays both buttons out horizontally with an 8px gap. Removed the position-override CSS (`align-self`, `margin-top`, `padding`, explicit font-size) from both button rules so they inherit directly from `.btn.btn-sm` — same treatment as every other secondary button in the app. The two buttons now read as a deliberate paired row of secondary utilities rather than a visual afterthought.

**Raw response button relabeled to "View response details"**
The previous "View raw response" label used developer-speak that obscured what the button actually revealed. The content beneath is the endpoint URL, HTTP status code, and full server JSON — which is a set of response details rather than a pure "raw" data dump. Renamed to "View response details" to describe what the user actually sees when they click.

**Nickname field pre-filled with model ID in italic, reverts to normal on edit**
v3.20.4 shipped an empty nickname input with placeholder text. The problem, as pointed out during testing: if a model ID is long (for example `[Unofficial] Claude-4-5-Sonnet-Extended-Thinking`) and the user only wants to strip a prefix (`[Unofficial] `) or adjust a tiny portion, typing the entire name from scratch is a non-starter and the feature gets abandoned. Empty-by-default made the optional customization feature effectively unused.

Reverting to pre-fill behavior: the nickname input is populated with the model ID on render, but rendered in italic with `var(--text-faint)` color and a new `.is-default` class. This signals that the content is suggested/default rather than user-typed, visually echoing the treatment of placeholder text. A new `onImportNicknameInput()` handler fires on first keystroke and strips the `.is-default` class, switching the text to normal-weight `var(--text)` — indicating the content is now the user's own.

A small uppercase `NICKNAME:` header was added to the left of each input via a new `.import-server-nickname-label` element to make the field's purpose explicit. Italics alone signal *"this is editable"* but not *"this is a nickname field"* — the header closes that ambiguity. Layout became `checkbox | model ID | NICKNAME: input`, with the model ID label at 50% and the nickname wrap at 45%.

The add-to-hive fallback logic remains: empty nickname at submit time falls back to the model ID (same as every previous version). Since the field now defaults to the model ID anyway, this fallback only triggers if the user explicitly deletes the contents.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.4 Pro — Build `20260423-010`
**Released:** April 23, 2026

### Bug Fixes

**Import from Model Server — brief flash of stray content during auto-fetch open**
When opening the modal with saved defaults in localStorage, there was a 1–2 second gap between overlay activation and the auto-fetch completing. During that gap the modal was in the `prefetch` state, which briefly rendered the help pane (and in some cases the raw response skeleton) before the state flipped to `ready` and the checklist appeared. The effect was a visible flicker that made the UI feel unstable.

Fixed by adding a new transient `loading` state to the state machine. `showImportServerModal()` now reorders operations so the overlay reveals only after field population and state initialization are complete, and when an auto-fetch is about to fire it calls `setImportServerState('loading')` before invoking `fetchImportServerModels()`. CSS for the loading state sets `visibility: hidden` on both `.import-server-col-middle` and `.import-server-col-checklist`, which keeps their grid cells reserved (preventing layout shifts) while suppressing all content. The subsequent transition to `ready` or `error` inside `fetchImportServerModels()` reveals the correct pane in a single repaint rather than two.

Using `visibility: hidden` instead of `display: none` is deliberate here: the loading state needs to reserve the grid columns so the modal does not briefly collapse to a single-column layout when `display: none` removes the columns from the grid entirely, which would cause a second flash.

### Changes

**Model checklist — single-row items with empty nickname field and fallback behavior**
Each model row was previously a two-line layout: a grayscale label with the model ID on top, and a white text input pre-filled with the same model ID directly below it. The duplication looked like a rendering bug rather than an intentional customization field — the user had no visual signal that the bottom control was editable since both elements showed identical text, and the double-stacked layout consumed twice the vertical real estate needed for each model.

`renderImportServerChecklist()` now renders each model as a single horizontal row: `checkbox | model ID label (60%) | nickname input (40%)`. The nickname input is empty by default and carries a placeholder `Nickname (optional)` in italic faint text, which signals clearly that the field exists, is optional, and accepts custom text. The model ID label uses `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` so long enterprise IDs truncate cleanly rather than wrapping.

The add-to-hive fallback logic at line 3500 of `app.js` was already `(nameInput?.value.trim()) || modelId`, so an empty nickname field continues to result in the model ID becoming the display name. No logic change was needed to accompany the UI change.

Net effect: twice as many models visible per scroll screen on laptop viewports, cleaner visual hierarchy, and an unambiguous signal that the nickname is optional user input rather than duplicate display.

**Forget saved server — promoted from underline link to proper button**
The Forget saved server control was previously styled as a plain underlined link with no background or border, tucked below the Fetch Models button. This was inconsistent with the new View raw response button (added in v3.20.2) sitting directly above it, which uses the product's standard `btn btn-sm` styling. The inconsistency made the Forget link read as either an afterthought or a low-priority secondary action, which undersold the fact that it is the direct counterpart to the 🔑 saved indicator in the API Key label above.

`.import-server-forget-btn` is now declared as a `btn btn-sm` element in the markup, inheriting the same visual language as every other action button in the column: subtle border, rounded corners, 12px font, hover state, consistent padding. The label gains a 🗑 emoji prefix to make the destructive nature of the action scannable. The CSS rule retains its state-triggered display behavior (`.import-server-modal.has-saved-key .import-server-forget-btn { display: inline-flex }`) so the button only appears when there actually is a saved config to forget.

**Modal header bee resized to 120px in the Import modal**
The shared `.custom-ai-modal-bee` class sets all API-adjacent modal bees to 48px. In the Import from Model Server modal, which is a full-width full-height modal with significant column 1 real estate (particularly on desktop viewports 2560px+), the 48px bee looked undersized against the volume of surrounding space and the weight of the title text. Added a scoped rule `.import-server-modal .custom-ai-modal-bee { width: 120px; height: 120px; }` that boosts the bee only inside the Import modal, leaving the Add Custom AI, Test All Keys, and Test Key modals at the original 48px since those are compact modals where 48px remains proportionally correct.

The bee at 120px fills roughly the same visual weight as the title+subtitle block next to it, which balances the header and gives column 1 a distinctive character even when the user has not yet clicked anything.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.3 Pro — Build `20260423-009`
**Released:** April 23, 2026

### Bug Fixes

**Import from Model Server — help and raw response panels could render simultaneously**
In v3.20.2 the middle-column state rules had `.import-server-modal.import-server-state-ready .import-server-raw-panel { display: block }`. That rule fired whenever the modal was in the ready state regardless of whether the user had asked to see the raw response, so a returning user whose saved config auto-fetched on open would immediately see the raw response panel rendering underneath the help pane on desktop (where both middle-column panes lived in the same column) and as overlapping content on laptop. The help pane also did not have any state-scoped hide rule, so on laptop the media query that merged cols 2+3 into the middle column let the help pane remain visible in ready state when it should have been gone.

The core rule that was missing: **cols 2+3 show exactly one pane at a time, per state**. Prefetch shows help. Ready by default shows the checklist (middle column empty). Ready + raw toggled on shows the raw response and hides the checklist. Error shows the error pane.

Fixed by tightening the display selectors: `.import-server-raw-panel` only displays when both `.import-server-state-ready` AND `.import-server-raw-visible` are present on the inner modal, and the laptop-tier media query was updated so ready state on laptop empties the middle column (instead of keeping help visible). The raw toggle button that previously only appeared on laptop now appears on both tiers, since the raw pane is hidden by default regardless of viewport width.

### Changes

**Import from Model Server — in-hive models filtered OUT of the checklist entirely**
The checklist previously showed every model returned by the server, dimming the ones already in the hive and marking them with an In hive badge. This was well-intentioned — "here is the full catalog, with your existing picks visible for context" — but it violated the screen's actual purpose, which is "what can I add to my hive that is not already there?". The dimmed rows could not be used for any action, took up vertical space, and forced the user to scan past duplicates to find the new model they came to add.

`renderImportServerChecklist()` now filters the model list against existing-in-hive entries for this same Chat Endpoint and only renders the available ones. The header changed from `37 models — 29 selected` to `29 available · 0 selected · 8 already in hive`, so the user still gets the complete context (why is the list smaller than expected?) without having to look at rows they cannot interact with. When a user deletes an AI on the Worker Bees setup page and reopens this modal, the model reappears in the list naturally since the filter is computed at render time. The `.import-server-item-badge` CSS rule is retained for potential future use but is no longer emitted during rendering.

**Import from Model Server — live Fetched-N-ago timestamp in the checklist header**
On every successful fetch, `renderImportServerChecklist()` captures `Date.now()` into `_importFetchedAt` and displays a relative-time stamp next to the available/selected counter. A `setInterval` refreshes the text every 5 seconds (`just now` → `5s ago` → `1m ago` → `2h ago`). The span carries a tooltip with the exact local time for users who want it. The interval clears on modal close to avoid leaking timers.

Since every modal open with saved defaults auto-fetches, the timestamp answers the implicit "is this list current?" question without the user having to click Refresh. If the user later clicks Refresh manually, the timestamp resets. If a fetch fails, the timestamp is not updated — so the previously-successful timestamp persists through the error state, signaling "last successful fetch was X ago, but it is broken now."

**Worker Bees setup screen — hive count chip with even-count tie warning**
Added a new `.hive-count-chip` element directly above the AI grid on the Worker Bees setup screen. It shows the total number of AIs in the hive plus the number that have saved API keys — the second number being what actually matters for running rounds at runtime. When the key-saved count is even and at least 2, the chip shows a `⚠️ even count — tie risk` warning since an even number of voting AIs can produce tie votes on convergence rounds. When the key-saved count is odd and at least 3, a subtle `✓ odd count` indicator appears instead. The chip has no content and visually collapses via `.hive-count-chip:empty { display: none }` if the render ever produces nothing.

Wired into `renderAISetupGrid()` via a new `renderHiveCountChip()` function that runs at the end of every grid render, so the chip updates automatically whenever an AI is added, removed, keyed, or unkeyed. No additional hooks required.

### User Manual
Appendix B rewritten step-by-step to reflect: the `📋 View raw response` button with collapsed-by-default behavior, the filtered-out in-hive models with the header math, the live Fetched-N-ago timestamp, and the auto-fetch-is-always-live guarantee. The CORS/mixed-content tip was retained.

Step 1 intro expanded with a new paragraph explaining the hive count chip above the AI grid, including what the even-count tie-risk warning means and when the subtle odd-count confirmation appears.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `waxframe-user-manual.html` · `CHANGELOG.md`

---

## v3.20.2 Pro — Build `20260423-008`
**Released:** April 23, 2026

### Bug Fixes

**Import from Model Server — raw response panel was capped at 160px on laptop viewports**
The `RECEIVED` pre element inside the raw response panel was hard-capped by two stale rules leftover from before the v3.20.0 three-column refactor: `.custom-ai-raw-pre { max-height: 120px }` and `.import-server-raw-received { max-height: 160px }`. Those caps made sense when the raw panel was a small diagnostic box stacked under a single-column form, but in the new layout the middle column has plenty of vertical space — the 160px cap was arbitrarily shrinking the JSON output to a strip that could not show more than a few lines of a 37-model response on a 811px-tall laptop viewport.

Fixed by adding scoped overrides inside `.import-server-raw-panel`: the pre element now has `max-height: none`, and the received row becomes a `flex: 1 1 0; min-height: 0; overflow-y: auto` so it grows to fill whatever vertical space the column offers while keeping its own scrollbar when the JSON is larger than the panel. The endpoint and status rows stay compact (`flex-shrink: 0`) so the received JSON gets all the slack.

### Changes

**Import from Model Server — laptop-tier layout adapts to state (1422–1600px)**
At the product's minimum viewport width, 1422px split three even columns leaves each column narrower than a long enterprise model ID like `anthropic.claude-3-7-sonnet-20250219-v1:0`. After a successful fetch the raw response and the model checklist both compete for column real estate, and the checklist — which is the thing the user actually needs to act on — ends up cramped while the raw response (a diagnostic rarely needed on success) takes an equal share. Symmetrically, on error the error pane was held to column 2 only while column 3 showed a now-pointless `Models will appear here` placeholder, wasting the very space the user needs to read the error details.

A new laptop-tier media query (`max-width: 1600px`, matching the existing convention for the 1422–1600px viewport band) collapses columns 2+3 into a single right region whose content swaps based on modal state:

- **Pre-fetch state:** the `What you'll need` help pane spans cols 2+3. The `Models will appear here` placeholder is hidden since it tells the user nothing they do not already know at that moment.
- **Ready state (success, default):** the model checklist spans cols 2+3, giving long model IDs and the In hive badges room to breathe. The raw response hides behind a new `📋 View raw response` button that appears in column 1 below Fetch Models.
- **Ready state + raw toggled on:** clicking the toggle swaps the right region — raw response spans cols 2+3, checklist hides, button relabels to `← Back to models`. Clicking again returns to the checklist.
- **Error state:** the error pane (title, description, tailored hints) spans cols 2+3. The checklist placeholder is hidden since no fetch succeeded.

On desktop viewports (`min-width: 1601px`), the three-column layout is untouched — there is enough horizontal space for all three panes to coexist, the toggle button stays hidden, and the behavior matches v3.20.0/v3.20.1.

**Grid columns rebalanced to even thirds.** The previous `minmax(360px, 3fr) minmax(420px, 4fr) minmax(360px, 3fr)` gave the middle column 33% more space than the inputs or checklist columns. The intent at design time was to favor the raw JSON panel, but in practice this left the checklist column narrower than needed for long model IDs. Rebalanced to `1fr 1fr 1fr` — each column gets an equal third of available space at 1422px, and at desktop sizes the extra space distributes evenly. This also feeds cleanly into the laptop-tier collapse: when cols 2+3 merge, they become a 2:1 ratio against col 1 which gives the right region a natural 2/3 of viewport width for the content that matters most.

**Small state-hygiene improvement in `setImportServerState()`.** Every state transition now clears the `import-server-raw-visible` modifier class and resets the raw-toggle button label. Without this, a user who toggled raw response visible in ready state would have the toggle class linger into error or prefetch states and cause unpredictable rendering on the next transition. The class is laptop-only in terms of visual effect, but the cleanup is unconditional so state machine behavior stays identical across viewport tiers.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `CHANGELOG.md`

---

## v3.20.1 Pro — Build `20260423-007`
**Released:** April 23, 2026

### Bug Fixes

**Import from Model Server — state transitions were targeting the wrong DOM element**
In v3.20.0 the three-column state machine (`prefetch` → `ready` → `error`) silently failed to transition the UI. A successful fetch would update the status text, rename the Fetch button to Refresh, populate the checklist internally (the footer's live `Add N to Hive` count proved the checkboxes were rendered correctly), but the middle column kept showing the `What you'll need` help pane and the right column kept showing the `Models will appear here` placeholder. The 🔑 saved indicator and Forget saved server link never appeared either, even when a saved config was loaded from localStorage.

Root cause was an ID-vs-class collision in the modal markup. The outer overlay element carries `id="importServerModal"`, while the inner modal div carries the classes `.import-server-modal`, `.import-server-state-prefetch`, and (when appropriate) `.has-saved-key`. The state-toggled CSS selectors — for example `.import-server-modal.import-server-state-ready .import-server-raw-panel { display: block; }` — require both classes to be present on the same element. `setImportServerState()` and every `has-saved-key` toggle were using `document.getElementById('importServerModal')`, which returns the overlay, so the state class landed on the overlay (which does not have `.import-server-modal`) and the selectors never matched. The initial state class baked into the HTML on the inner modal was never replaced, so the UI stayed frozen in `prefetch` mode no matter what happened.

Fixed by introducing a small helper `getImportServerInnerModal()` that returns the inner modal via `document.querySelector('#importServerModal .import-server-modal')`. Every site that was toggling state or `has-saved-key` now routes through that helper: `setImportServerState`, `showImportServerModal` (adding `has-saved-key` from saved defaults), `closeImportServerModal` (removing `has-saved-key`), `forgetImportServerDefaults` (removing `has-saved-key`), and `onImportServerKeyInput` (removing `has-saved-key` when the user types a new key). The overlay's own `active` class toggle still uses `getElementById` because that class legitimately belongs on the overlay.

The existing CSS selectors were not changed — they were correct. Only the JS targeting was wrong.

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.20.0 Pro — Build `20260423-006`
**Released:** April 23, 2026

### Changes

**Import from Model Server — full UX refresh to a single-screen three-column layout**
The Import from Model Server modal previously used a cramped single-column form plus a second full-screen overlay for the model checklist. That layout created a modal-over-modal pattern, left first-time users guessing at what each field should contain, forced every subsequent visit to re-type the server URLs and API key, and treated the "pick which models to add" step as a separate ceremony requiring a dedicated handoff button. For a user adding a newly-available model to an already-populated hive — the single most common case for anyone running Alfredo, Open WebUI, Ollama, or LM Studio — the flow was five clicks and a manual URL copy when it should have been one.

The modal now does every job in a single screen built as a three-column grid designed against the product's 1422px minimum viewport.

**Column 1 — Inputs (stable across all states).** Chat Endpoint and Models Endpoint are stacked vertically instead of sitting side-by-side, giving each URL field the full column width it needs for the long enterprise paths users actually paste. The API Key field gains a 🔑 saved indicator that appears inline with the label whenever the current key value came from saved defaults — matching the convention the rest of the WaxFrame UI uses for saved per-bee API keys. A discreet Forget saved server link appears below Fetch Models only when saved defaults exist, letting the user clear the localStorage entry without digging through browser settings.

**Column 2 — Context (state-dependent).** In the pre-fetch state the middle column shows a What you'll need help pane written in the same voice as the User Manual: each field is explained with a short description, a code-styled example of the typical endpoint suffix, and a tip block with real-world guidance for home and work users. A small runtime note sits at the bottom of the help pane showing whether WaxFrame is currently running from a local file:// URL or a hosted https:// URL, so the user understands at a glance why local presets are or are not available. In the post-fetch ready state, the middle column switches to the existing raw-response panel (endpoint, status, full JSON) so power users can inspect exactly what the server returned. In the error state, it becomes a friendly error panel with a plain-English title, a description of what happened, and a bulleted list of likely causes and fixes tailored to the specific failure mode (401/403, 404, 5xx, mixed-content blocking, CORS, network unreachable).

**Column 3 — Checklist (inline, always visible).** The separate full-screen overlay is gone. Before a fetch, column 3 shows a placeholder tile explaining that models will appear there once the user clicks Fetch Models. After a successful fetch, the checklist populates in place with the full model list, compact All/None toggles in the header, and a single footer button labeled Add N to Hive that updates live as checkboxes toggle. No more handoff button, no more modal-over-modal.

**Duplicate detection — the pro-level move.** When the checklist renders, `renderImportServerChecklist()` now builds a set of model IDs already in the hive that were imported from the same Chat Endpoint URL, marks those rows with a subtle In hive badge, leaves them unchecked by default, and dims their row slightly so the user's eye goes to the new models. Checking a dimmed row and clicking Add still creates a fresh bee with a unique generated ID — the detection is purely a UX hint, not a hard block — but for the common case of "I just want that one new model" the default state is now correct without the user having to click Select None and then find the one new model in a list of 37.

**Runtime-aware Quick Add presets.** The Quick Add dropdown is now populated at runtime. When WaxFrame is loaded over `file://`, all three presets (Open WebUI, Ollama, LM Studio) appear. When loaded over `https://`, the two local presets are hidden because browsers block mixed-content requests to `http://localhost` from a secure page. This prevents a class of error that previously manifested as a mysterious network failure after the user picked a preset that could never have worked.

**Pre-flight mixed-content check.** Before firing a fetch, the client now checks whether WaxFrame is running on https and the Models Endpoint is http. If so, it skips the network call entirely and routes straight to the error pane with a clear explanation that the browser will block the request before it leaves the machine, plus two concrete workarounds (use https, or download WaxFrame and run it from file://). This fails fast and explains itself instead of producing an opaque CORS-style error hours into a debugging session.

**Header bee swap — cascaded across all API-related modals.** The Import from Model Server modal header now uses `WaxFrame_API_Bee_v1.png` instead of `WaxFrame_Worker_Bee_v2.png`. The Worker Bee belongs to Setup 1; the API Bee is the correct mascot for anything authentication- or endpoint-related, and using it here reinforces the visual grammar the rest of the product uses. For consistency across the suite of modals that deal with API configuration and credentials, the same swap was applied to the Add Custom AI modal, the Test All Keys modal, and the Test Key modal. All four API-adjacent modals now share the API Bee; the Worker Bee remains on screens and buttons that represent the bees themselves (Welcome, Setup 1, unanimous convergence).

**Technical cleanup performed as part of this release.** The `import-checklist-overlay` markup was removed from `index.html` in full. The `.import-checklist-overlay`, `.import-checklist-panel`, `.import-checklist-hdr`, `.import-checklist-hdr-left`, `.import-checklist-title`, `.import-checklist-hdr-right`, `.import-checklist-close-btn`, `.import-checklist-body`, `.import-checklist-items`, and `.import-checklist-footer` rule blocks were removed from `style.css`. The `openImportChecklist` and `closeImportChecklist` functions were removed from `app.js`, along with every call site that used to reference them. The `importServerSelectBtn` button and its associated show/hide toggles were removed. Three inline `style="display:none;"` attributes were removed from the modal markup and replaced with state-class-driven CSS — bringing this modal into compliance with the project's no-inline-CSS rule.

**Accompanying updates.** User Manual Appendix B was rewritten step-by-step to reflect the single-screen flow, the In hive badge, the 🔑 saved indicator, the Forget saved server link, and the error-panel behavior. The CORS tip was expanded into a mixed-content tip. The old step referencing Select & Add to Hive → and a separate checklist panel was removed.

### Files Changed
`app.js` · `index.html` · `style.css` · `version.js` · `waxframe-user-manual.html` · `CHANGELOG.md`

---

## v3.19.27 Pro — Build `20260423-004`
**Released:** April 23, 2026

### Changes

**Import from Model Server — remembers last-used server and auto-fetches on open**
The Import from Model Server form required re-typing the Chat Endpoint, Models Endpoint, and API Key on every open. For users running a local or enterprise AI platform (Alfredo, Open WebUI, Ollama, LM Studio) — where the server is almost always the same one every time — this turned "add a newly available model" into a copy-paste hunt for URLs and tokens that should already be known.

Two coordinated changes in `app.js` fix this end-to-end:

1. **Persistence.** A new localStorage key `waxframe_import_server_defaults` now stores the last successful Chat Endpoint, Models Endpoint, and API Key as a single JSON blob. The write happens inside `addImportServerModels()` only after models have actually been added — fetching alone does not save a config, so half-broken or cancelled attempts never contaminate the defaults. Two small helpers were added (`saveImportServerDefaults`, `loadImportServerDefaults`) right next to the existing `_importServerModels` / `_importServerPreset` state, with try/catch wrappers for private-mode and quota edge cases.

2. **Auto-populate + auto-fetch.** `showImportServerModal()` now reads the saved defaults on open and writes them into the three form fields before doing anything else. If both URLs are present in the saved config, the form immediately calls `fetchImportServerModels()` without requiring a button click — the user sees the current model list as soon as the modal opens. If nothing is saved (first-time use), behavior is unchanged: focus lands on the Chat URL field.

Supporting cleanup in `closeImportServerModal()`: removed the three explicit field wipes for Chat URL, Models URL, and API Key. They were redundant now that `showImportServerModal()` repopulates authoritatively from localStorage on every open. The Quick Add dropdown is still reset on close (it is an action trigger, not a stored value). The private `resetImportServer(true)` call still clears transient UI state (fetch status, add/select buttons, raw response panel) as before.

Quick Add presets still override saved defaults when explicitly picked — selecting Ollama or LM Studio from the dropdown overwrites the URL fields with that preset's localhost paths. This is the intentional escape hatch for switching servers.

User Manual Appendix B updated with a tip block explaining the remembered-server / auto-fetch behavior and how to switch to a different server via Quick Add.

### Files Changed
`app.js` · `index.html` · `version.js` · `waxframe-user-manual.html` · `CHANGELOG.md`

---

## v3.19.26 Pro — Build `20260423-003`
**Released:** April 23, 2026

### Changes

**Import from Model Server — dropped the hard 2-model minimum on the checklist**
The Import from Model Server checklist enforced a minimum of two models per import, disabling the Add to Hive button and showing `Select at least 2 (N selected)` until two checkboxes were ticked. That constraint was written assuming users would build their entire hive in one import pass, but the common real-world case is adding a single new model to an already-populated hive — identical to how the Add Custom AI form works. The restriction created a dead-end where the only way to add one model via the server browser was to also re-add a second model you already had.

The "a round needs two or more bees to run" rule is a separate run-time constraint enforced elsewhere on the Worker Bees setup screen and on the Smoke the Hive button; there was no reason for the import flow to second-guess that.

Two surgical edits in `app.js`:

1. **`updateChecklistCount()`** — button text now reads `Add N to Hive` whenever one or more models are checked, and `Select at least 1 (0 selected)` only when nothing is checked. The button is disabled only when `checked === 0`.

2. **`addImportServerModels()`** — removed the `checked.length < 2` guard and its `Select at least 2 models to collaborate` toast. The existing `!checked.length` guard continues to block empty submissions.

No changes to the checklist UI, the Fetch Models flow, or the User Manual Appendix B — Step 4 of Appendix B was already neutral (`Check the models you want to add`).

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.25 Pro — Build `20260423-002`
**Released:** April 23, 2026

### Bug Fixes

**Live Console wiped on page refresh — restore was racing against saveSession**
After a page refresh the Live Console appeared empty (reset to the default page-load message `Console ready — Smoke the hive to begin.`), while every other piece of session state — round count, phase, document text, round history, notes, project clock — restored correctly. A round run after the refresh would then populate the console with only that single round's entries, and the next `saveSession` would persist that partial state into IndexedDB, permanently losing the earlier rounds' console history.

Root cause was a structural problem in the init flow. `loadSession()` read the full session blob from IDB via `await idbGet()` and restored every field **except** `consoleHTML`. A second, redundant `idbGet()` call lived inside the `DOMContentLoaded` handler as a separate `.then()` chain whose sole job was to patch `consoleHTML` back into the DOM asynchronously. Between the synchronous `loadSession()` returning and that second async restore completing, any code path that triggered `saveSession` would capture the DOM's default `<div class="console-entry console-info">Console ready — Smoke the hive to begin.</div>` and write it over the good stored HTML. On Firefox with `file://` URLs the handoff between the two separate IDB reads is not guaranteed tight, which made this race condition surface reliably.

Fixed with two coordinated changes:

1. **Console restore moved inside `loadSession()`** — right next to the notes restore, using the `s` object already in hand from the single `await idbGet()`. The DOM is already ready when `loadSession()` runs (it's called from the `DOMContentLoaded` handler), so a synchronous `consoleEl.innerHTML = s.consoleHTML` is safe and correct. The fallback `catch` branch that loads from `localStorage` got the same restore line. The redundant second IDB read in `DOMContentLoaded` was removed, eliminating the race window entirely.

2. **Belt-and-suspenders guard in `saveSession()`** — an early-return check at the top of the function. If `history.length > 0` but the DOM console is empty or still showing the default page-load message, `saveSession` now returns without writing. This protects against any future code path that might call `saveSession` during an initialization window where the console DOM hasn't yet been populated — preventing a default-HTML overwrite of good stored data. The next legitimate save (after any real state change) captures everything correctly.

**Work-document oninput ReferenceError — `_lineNumDebounce` was never declared**
This fix was shipped in v3.19.24 but is repeated here because v3.19.24 was a local-only build on the work laptop — not committed to GitHub — so this entry covers the canonical first commit of the fix. Every keystroke in the Work Screen document textarea was throwing `Uncaught ReferenceError: _lineNumDebounce is not defined` from `handleWorkDocumentInput` at `app.js:3978`. Firefox DevTools captured this firing 247 times in a single session. The error aborted the handler before `clearTimeout(workDocSaveTimer)` and the debounced `saveSession()` call could run, meaning 250 ms debounced saves never fired after a keystroke and `updateLineNumbers` never refreshed the gutter. The textarea's auto-grow line (`ta.style.height = ta.scrollHeight + 'px'`) executed before the throw, so users saw no visible failure — the textarea grew as expected, but session persistence and line-number updates silently stopped. Root cause was a missing `let` declaration for `_lineNumDebounce`. Fixed by adding `let _lineNumDebounce = null;` immediately beneath the existing `let workDocSaveTimer = null;` declaration.

### Files Changed
`app.js` · `index.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.23 Pro — Build `20260422-011`
**Released:** April 22, 2026

### Helper-page anchor cascade trap fixed, reading column widened, Step 10 count corrected

Three threads in one release.

The first is the underline-on-sidebar bug chased in v3.19.21 and v3.19.22 without it ever actually landing. The real winner in the cascade was a generic rule thirty-six lines above the sidebar block — defensive `text-decoration: none` on `.doc-sidebar-link` pseudo-states couldn't beat it on specificity. Fix is architectural: remove the blanket underline on `.helper-body a:hover` and make underline opt-in via the existing `.link-accent` class. Credit to Kai for spotting what I missed twice.

The second is a layout fix. `.helper-body .page-main` had a `max-width: 900px` set back when laptop screens were the edge case. Since WaxFrame now enforces a 1024px minimum viewport via overlay, the design target is desktop and the 900px ceiling was leaving 250+ pixels of unused honeycomb background on either side of the content on laptops, and much more on full desktop monitors. Bumped to 1200px — the main reading column grows from 564px to 864px, tables in the User Manual appendix finally get room to breathe, and at desktop widths the column centers cleanly the way a normal docs site does.

The third is a small doc fix in Step 10 of the User Manual. The section described the Finish modal as having "four buttons and two secondary options" and the subheading read "The four export and finish options" — but the modal has only three primary buttons (Export Document, Export Full Transcript, Start New Project). The two occurrences of "four" corrected to "three". Purely cosmetic but it was counting wrong.

```
.helper-body a:hover { color: var(--accent-hover); text-decoration: underline; }
```

All five docs/helper pages use `<body class="helper-body">`, so every anchor on those pages — including sidebar links — is eligible for that hover rule. Specificity: `.helper-body a:hover` is `(0,1,1)` — class + element. `.doc-sidebar-link:hover` is `(0,1,0)` — class only. The generic rule wins by one point regardless of cascade order, which is why none of the earlier defensive blocks actually landed. Credit to Kai for spotting the cascade trap I missed twice.

### The fix — opt-in underline via `.link-accent`

Two rules replaced with three. The blanket underline on `:hover` is removed from `.helper-body a`. In its place, an opt-in rule scoped to anchors carrying the `.link-accent` class — which already exists at line 4813 of `style.css` and is already used 40+ times across every helper page for inline content links, billing links, appendix references, and CTA links.

`style.css` lines 4903–4904 before:

```
.helper-body a { color: var(--accent); text-decoration: none; transition: all 0.12s; }
.helper-body a:hover { color: var(--accent-hover); text-decoration: underline; }
```

After:

```
.helper-body a { color: var(--accent); text-decoration: none; transition: all 0.12s; }
.helper-body a:hover { color: var(--accent-hover); }
.helper-body a.link-accent:hover { text-decoration: underline; }
```

### Why the third rule is mandatory, not defensive

The opt-in rule is `(0,2,1)` specificity — `.helper-body` + `.link-accent` + `a`. Without it, `.helper-body a:hover` at `(0,1,1)` would beat the existing `.link-accent:hover` at `(0,1,0)` and strip the underline from every content link site-wide, not just the sidebar. That would be a visible regression on the forty-plus inline references across the User Manual, API Key Guide, What Are Tokens, Document Playbooks, and Prompt Editor. The third rule restores the underline exactly where it's wanted and nowhere it isn't.

### Sidebar behavior after this release

`.doc-sidebar-link:hover` — no longer has a generic `text-decoration: underline` inherited from `.helper-body a:hover`. The v3.19.21 defensive `text-decoration: none` block on `.doc-sidebar-link` pseudo-states becomes redundant at this point but is retained; removing it is cosmetic and not worth the diff. Noted for a future sweep.

### Architectural outcome

Helper pages now treat anchor styling as opt-in rather than opt-out. Plain `<a>` on a helper page: accent color, no underline, hover changes color only. Anchor tagged `.link-accent`: same plus underline on hover. This is the pattern every new inline content link should already be using and every existing one already is.

### Files Changed
`style.css` · `index.html` · `waxframe-user-manual.html` · `document-playbooks.html` · `prompt-editor.html` · `api-details.html` · `what-are-tokens.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.22 Pro — Build `20260422-010`
**Released:** April 22, 2026

### Sidebar links get proper button treatment, site-wide cache-bust sweep for `style.css` + `version.js`

Two coupled threads. The sidebar links on the docs pages still looked like plain nav text even after v3.19.21's underline-kill — because they never had the `.btn`-style shell that every other interactive element in WaxFrame uses (dashed transparent border at rest, dashed accent border on hover, accent-dim background fill). A cascade-level fix, not a pseudo-state one. Credit to Kai for the diagnosis.

The second thread is why shipping v3.19.21 didn't feel like it landed: the five docs/helper HTML pages loaded `style.css` with no cache-bust query string, and `index.html` was running a stale `?v=3.19.12` — nine releases behind. Browsers were happily serving old CSS. This release establishes a consistent cache-bust on both `style.css` and `version.js` across every HTML page.

### `.doc-sidebar-link` — button-shell treatment

Five changes to the base class:

- Default color `var(--text)` → `var(--text-dim)` so the link reads as secondary nav at rest
- Added `border: 1px dashed transparent` — reserves the border box so nothing shifts on hover
- Hover and `.is-active` now share a single rule setting `border-color: var(--accent)`, `color: var(--accent)`, `background: var(--accent-dim)` — the dashed accent outline is what was missing
- `.is-active` keeps its `font-weight: 600` in a separate follow-up rule so active reads louder than merely hovered (preserved from v3.19.21)
- Underline-defense block (`:hover, :focus, :visited, :active { text-decoration: none; }`) from v3.19.21 is retained unchanged

`.doc-sidebar-quickstart` is not touched — it already carries a solid accent border and accent-dim background by default and fills solid accent on hover. It reads as a proper CTA button already; the button-shell treatment is only needed on the plain list items.

### Cache-bust policy — `style.css` + `version.js` on every HTML page

Before this release, the cache-bust story was inconsistent:

| File | Before | After |
|---|---|---|
| `index.html` → `style.css` | `?v=3.19.12` (9 versions stale) | `?v=3.19.22` |
| `index.html` → `app.js` | `?v=3.19.21` | `?v=3.19.22` |
| `index.html` → `version.js` | no `?v=` | `?v=3.19.22` |
| `waxframe-user-manual.html` → `style.css` | no `?v=` | `?v=3.19.22` |
| `waxframe-user-manual.html` → `version.js` | no `?v=` | `?v=3.19.22` |
| `document-playbooks.html` → `style.css` | no `?v=` | `?v=3.19.22` |
| `document-playbooks.html` → `version.js` | no `?v=` | `?v=3.19.22` |
| `prompt-editor.html` → `style.css` | no `?v=` | `?v=3.19.22` |
| `prompt-editor.html` → `version.js` | no `?v=` | `?v=3.19.22` |
| `api-details.html` → `style.css` | no `?v=` | `?v=3.19.22` |
| `api-details.html` → `version.js` | no `?v=` | `?v=3.19.22` |
| `what-are-tokens.html` → `style.css` | no `?v=` | `?v=3.19.22` |
| `what-are-tokens.html` → `version.js` | no `?v=` | `?v=3.19.22` |

Going forward every CSS/JS cache-bust string gets bumped with the version, same as `app.js?v=` on `index.html` already does. `theme.js`, `api-links.js`, and `docs-scrollspy.js` are not busted in this release — they're stable across versions and low-churn; adding them is a future cleanup candidate if they start changing per-release.

### Operational note — backfilled v3.19.20 CHANGELOG entry

v3.19.20 was tagged on GitHub with a complete Release body but the corresponding `CHANGELOG.md` entry never landed in the commit. Entry backfilled in this release (see below between v3.19.21 and v3.19.19). No code change — pure doc reconciliation.

### Files Changed
`style.css` · `index.html` · `waxframe-user-manual.html` · `document-playbooks.html` · `prompt-editor.html` · `api-details.html` · `what-are-tokens.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.21 Pro — Build `20260422-009`
**Released:** April 22, 2026

### User manual gets the playbooks sidebar, shared classes renamed `.dp-*` → `.doc-*`, scroll-spy active-section highlighting added to both docs pages

Three coupled threads. The user manual was still running the old pill-row table-of-contents (`.wh-toc`) at the top of the page while `document-playbooks.html` had already adopted a sticky left sidebar. The visual inconsistency between the two primary docs pages was unnecessary — they serve the same navigational purpose and should share the same pattern. This release brings the manual into line, renames the shared layout/sidebar classes from the misleading `.dp-*` prefix (which stood for "document playbooks" but is now used on both pages) to `.doc-*`, and finally ships the scroll-spy active-section highlight that was scoped previously and never built.

### Class rename: `.dp-*` layout/sidebar → `.doc-*`

Eleven class names renamed across `style.css`, `document-playbooks.html`, and `waxframe-user-manual.html`: `dp-layout`, `dp-sidebar`, `dp-sidebar-inner`, `dp-sidebar-title`, `dp-sidebar-category`, `dp-sidebar-link`, `dp-sidebar-quickstart`, `dp-sidebar-quickstart-star`, `dp-sidebar-quickstart-label`, `dp-sidebar-quickstart-sub`, `dp-main`. Playbook-specific content classes (`dp-playbook`, `dp-category-hdr`, `dp-table`, `dp-field`, etc.) stay `.dp-*` — those are content classes for the playbook cards themselves and not shared with the manual.

### Manual sidebar: five groups, sticky 240px column

The manual's old `.wh-toc` pill-row block at the top of the page is removed. In its place, a sticky 240px left column that mirrors the playbooks pattern. Five groups: **Before You Start**, **Step-by-Step Guide**, **Appendices**, **Reference**, **External Guides**. All 18 existing section anchors preserved. Section content is 100% unchanged — this is a pure layout shift. The three external-guide links (API Key Guide, Document Playbooks, What Are Tokens) sit at the bottom of the sidebar and open in new tabs as before.

Stale `.wh-toc` CSS removed: the main rules block, the two light-theme overrides, and the print-media overrides. Nothing references those classes anywhere in the codebase now.

### Scroll-spy: active section highlighted in the sidebar

New file `docs-scrollspy.js`, loaded by both `waxframe-user-manual.html` and `document-playbooks.html` after `theme.js` and `version.js`. An `IntersectionObserver` watches every section the sidebar links to (anchor links with `href^="#"` only — external guides are ignored). When a section enters the upper 40% of the viewport, its sidebar link gets `.is-active`. When multiple short sections stack on screen simultaneously, the one nearest the top wins.

Active state applies the `.is-active` class to the matching sidebar link — same amber background and accent color as the hover state, plus `font-weight: 600` so an active section reads louder than a hovered one. External sidebar links carry no hash and are silently ignored. If a page has no `.doc-sidebar` the script no-ops immediately — safe to load on any page.

### Sidebar link underline bulletproofing

Pre-existing minor issue: some combination of browser pseudo-state defaults (suspected `:focus` or `:visited`) was rendering an underline on sidebar links despite `text-decoration: none` being set on the base rule. Defensive fix: `:hover`, `:focus`, `:visited`, `:active` all now explicitly declare `text-decoration: none` on both `.doc-sidebar-link` and `.doc-sidebar-quickstart`. Browser defaults can't bleed through any state.

### Files Changed
`style.css` · `document-playbooks.html` · `waxframe-user-manual.html` · `docs-scrollspy.js` *(new)* · `index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.20 Pro — Build `20260422-008`
**Released:** April 22, 2026

### `!important` cleanup pass 1 — 22 band-aids removed from `style.css`

`style.css` carried 68 `!important` declarations. An audit categorized them into three buckets: genuinely legitimate (`@media print`, `@media (prefers-reduced-motion)`, the 1024px minimum-viewport overlay — ~25 occurrences that stay), state overrides where removal would require uglier compound selector chains (~18 that stay for now), and pure band-aids where `!important` was masking a specificity or cascade-ordering issue that could be fixed cleanly (~25 candidates).

This release clears the band-aid bucket. Twenty-two `!important` flags retired across four targets. Count drops from **68 to 46**.

---

### Target 1 — `.doc-tab` block (9 removed)

Every line of `.doc-tab`, `.doc-tab:hover`, and `.doc-tab.active` carried `!important`. None was doing any work. The tab buttons carry classes `btn btn-sm btn-ghost doc-tab` in markup, and the `.doc-tab` rules sit at line 757 in the stylesheet — after `.btn` (line 181), `.btn-ghost` (line 199), and `.btn-ghost:hover` (line 205). Same or higher specificity, later cascade position, same base styles as the accent variant. The `!important` was cargo-culted in. Straight removal.

---

### Target 2 — `.dp-table-field` specificity fix (2 removed)

`.dp-table-field` had `padding-right: 20px !important` to beat `.dp-table td` (which sets `padding-right: 0` via shorthand). Specificity of `.dp-table-field` (0,1,0) is less than `.dp-table td` (0,1,1) — hence the `!important`. Selector upgraded to `.dp-table .dp-table-field` (0,2,0) which beats `.dp-table td` on specificity alone.

Side effect fix: `.dp-table-field--lc` (which overrides color for Length Constraint rows) was a (0,1,0) selector. With the base bumped to (0,2,0), the modifier would no longer override. Modifier also bumped to `.dp-table .dp-table-field--lc` (0,2,0) + later cascade position, preserving its override.

Sibling rule `.dp-scratch-note .dp-table-field { padding-right: 16px !important }` was already (0,2,0) specificity — beating `.dp-scratch-note td` (0,1,1) without help. `!important` was redundant. Removed.

---

### Target 3 — `.honeycomb-header` block relocated and selectors upgraded (8 removed)

This was the only target with real structural change. The block lived at line 1241–1255 with `!important` on margin, background, border, border-radius, padding, and three `.work-section-title` text-color rules spanning dark/light/auto themes.

Two problems compounded:

First, `.honeycomb-header` (0,1,0) competed with `.work-panel-header` (0,1,0) — same specificity, and `.work-panel-header` was declared *later* at line 1593, so it won cascade order on every shared property (padding, background, border-radius).

Second, `[data-theme="light"] .honeycomb-header .work-section-title` (0,3,0) competed with `[data-theme="light"] .work-panel-header .work-section-title` (0,3,0) — same specificity, and the `.work-panel-header` theme rule was declared later at line 1603, so it won cascade order on text color in the light and auto themes.

Fix was two-part: selectors upgraded from `.honeycomb-header` to `.work-panel-header.honeycomb-header` (compound, 0,2,0) to beat `.work-panel-header` on specificity alone, and the entire block was moved to *after* the `.work-panel-header` theme rules (now sits at line 1593–1607 in the stylesheet) so cascade order also works in our favor for the theme overrides. Both protections in place; all eight `!important` declarations removed.

The `.honeycomb-header` class is used only once in the codebase (Live Console panel header, `index.html` line 533), always paired with `.work-panel-header`, so the compound selector change is safe.

---

### Target 4 — `.finish-modal-cancel-accent` (2 removed)

`.finish-modal-cancel-accent` (0,1,0) at line 5727 was overriding `.finish-modal-cancel` (0,1,0) at line 4589. Same specificity, later cascade position — wins naturally. The only edge case is hovering an accent button: `.finish-modal-cancel:hover` (0,2,0) at line 4601 would win over `.finish-modal-cancel-accent` without `!important` — but the hover rule sets `border-color: var(--accent)` and `color: var(--accent)`, the same values the accent variant applies. No visible difference. Removed.

---

### What's left — still 46 `!important` declarations

- **~25 legitimate:** `@media print` overrides, `prefers-reduced-motion` accessibility, the mobile-overlay `display:none` force-hide
- **~18 state overrides** on `.convergence-card`, `.decision-opt-btn.selected.*`, `.decision-card.bypassed`, `.hist-resp-tab.active` — removable in principle but would require 3–4-class compound selector chains that trade one form of debt for another. Parked pending a cleaner pattern.
- **A few scattered variant/disabled state overrides** — candidates for a future cleanup pass if the pattern warrants it.

---

### Files Changed

`style.css` · `index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.19 Pro — Build `20260422-007`
**Released:** April 22, 2026

### Notes info modal added, stale template button retired, Document Playbooks header overlay fix

Three threads in one release. A Notes info modal so the template buttons explain themselves, removal of a template button that competed with a more specific flow on the Conflicts card, and a visual fix on `document-playbooks.html` where category headers were rendering bare on the honeycomb background instead of sitting on the same dark translucent overlay as everything else on the page.

### Notes info modal

Every work-screen panel — The Hive, Conflicts, Working Document, Live Console — has an ⓘ button next to its title that opens a modal explaining what lives in that panel and how to use it. The Notes drawer was the one panel missing that button. Added, following the same `.goal-info-btn` + `.finish-modal.goal-info-modal` pattern as the other four. The modal documents each template button with when-to-use guidance, the freeform notes row, the action buttons (Copy, Clear), a tip on why exact text beats line numbers for locking, and a link to the user manual's Step 9 for depth.

### Retired template: ✅ Applied my decision

The `✅ Applied my decision` template button on the Notes drawer (pre-filled text: *"I have applied my conflict decision. Do not re-raise or undo this change."*) predates the **🔒 Lock my selection in Notes** button that now lives on every USER DECISION conflict card. The conflict card handles this case better — it auto-applies the decision and pre-fills a Lock a line template with the exact selected text. The standalone template button was a fossil routing users to a flow that had been superseded. Button removed from `index.html`; corresponding row removed from the Notes examples table in the user manual (`waxframe-user-manual.html` Step 9, *After applying a conflict*).

The four remaining templates — **🔒 Lock a line**, **🔒 Lock a section**, **↩ Reverted document**, **🚫 No new sections** — each cover a distinct workflow the conflict card does not handle.

### Document Playbooks category header fix

`.dp-category-hdr` was styled with a 6%-opacity amber gradient as its background, which at viewing time meant the honeycomb pattern showed through almost fully and the category title ("Career & Hiring", "Business & Sales", etc.) appeared to float unreadable-ish directly on the tiled background. Every other card on the page — playbook headers, tip callouts, the intro block — sits on the site-standard `rgba(0,0,0,0.55)` + `backdrop-filter: blur(6px)` overlay. Category headers now match. Text colors flipped from `var(--text)` / `var(--text-dim)` to `#ffffff` / `rgba(255,255,255,0.7)` to sit on the darker panel. No light-theme override needed — the overlay is theme-independent, same as `.dp-playbook-header`.

### Document Playbooks Quick Start tip rewrite

The Quick Start "cookies playbook" tip was incoherent as written: it implied the cookies session was useful as a "reference session" to "compare against" your real document, and routed the transition through `Menu → Backup Session`. None of that is how the app actually works — WaxFrame's localStorage is path-bound, so you can't run cookies and a real project in parallel, and a session backup JSON is archival not comparative. Rewritten to honestly describe what the Quick Start is (a training run to see the full flow end-to-end) and route the user through the actual transition path: **🏁 Finish** on the work screen → **Start New Project**.

### Files Changed
`index.html` · `style.css` · `document-playbooks.html` · `waxframe-user-manual.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.18 Pro — Build `20260422-006`
**Released:** April 22, 2026

### No-op USER DECISION bug — duplicate reviewer proposals now merge into one option, hard 6-option cap removed

The Chocolate Chip Cookies v2.0 dry run surfaced a deterministic bug in how the Builder emits `[USER DECISION]` blocks. When two or more reviewers independently proposed the same replacement text for a contested line, the Builder was folding those duplicates into separate `OPTION_1`, `OPTION_2`, `OPTION_3` entries rather than merging them into one option with all proposing AI names listed together. The user saw a "choice" where every option read the same text — clicking any of them produced the same outcome. Six occurrences across five Builder-only rounds out of twenty-one total (R3, R8, R10 twice, R12, R14). Roughly a quarter of Builder rounds had at least one.

The damage ran deeper than cosmetic. WaxFrame's entire conflict-resolution model leans on the user reading the number of AI names attributed to each option as a convergence signal — "four names on OPTION_1, one name on OPTION_2" means pick OPTION_1. When identical proposals spread across multiple options, that signal inverts: a line with genuine 4-way reviewer convergence rendered as three options + one option, looking like less convergence than existed.

A second, separate bug fell out of audit: the prompt hard-capped option count at 6. Fine on a six-AI hive. Not fine at 37-AI scale via Alfredo or any other gateway — the Builder was being forced to silently drop real reviewer input to fit.

### Layer 1 — Builder prompt: merge rule added, count cap removed

Three edits to the USER DECISION rules block inside the Builder's review-round prompt.

**Merge rule (new bullet)**

Inserted immediately after the "List only the AIs" rule:

`Each OPTION_N text must be UNIQUE within the block — if two or more reviewers proposed the same replacement text (verbatim, or differing only in whitespace, capitalisation, or trailing punctuation), MERGE them into a single OPTION_N and list all their AI names together, comma-separated. Identical options are not a choice.`

This addresses the upstream source of the six observed occurrences directly. The existing `Do not combine options that are meaningfully different` rule (which survives unchanged) handles the opposite direction; the new rule fills the previously-unstated complement.

**Count cap removed**

The rule previously read `Include as many options as there are genuinely distinct suggestions — minimum 2, maximum 6`. The cap was arbitrary — the parser regex (`/^OPTION_\d+:/i`) matches any digit count, and the renderer iterates `d.options.map(...)` with no hardcoded loop limit. The 6-cap was pure prompt-side text with no downstream enforcement, and at high-AI-count deployments (37+ models through Alfredo) it was silently discarding legitimate distinct proposals. Now reads `Include one OPTION_N per genuinely distinct suggestion — minimum 2 UNIQUE options, no maximum`. The example scaffold in the template block had a parallel `(add more options if needed, up to 6)` hint on the `OPTION_3` line; that too now reads `(add more OPTION_N lines as needed — one per genuinely distinct suggestion, no upper limit)`.

### Layer 2 — Parser safety net in `extractConflicts()`

Prompt rules are soft. Builders interpret them with varying rigor — prior dry-run data showed Grok and Perplexity reliably followed structured rules while ChatGPT, Claude, Gemini, and DeepSeek drifted more often. The Builder prompt fix is the real fix, but it's not an enforceable one. The parser side now catches what slips through.

After the existing junk-option filter, `extractConflicts()` now Set-dedupes the collected `OPTION_N` texts using strict exact equality. If fewer than two unique texts survive, the whole decision block is dropped instead of pushed to `result.userDecisions`, and a warn-level line appears in the live console: `⚠️ Suppressed no-op USER DECISION — all options identical: "<sample>"`. Strict equality preserves every genuine micro-difference — `"cup"` and `"cup,"` remain separate options, as do `"10 minutes"` and `"10 minutes."` — so no legitimate decision is lost. The console log is diagnostic: if a particular Builder starts firing it frequently, that's signal the Builder is ignoring the merge rule and we know where to look.

With Layer 1 in place, Layer 2 should rarely fire. Both exist so the feature degrades gracefully across Builder models of varying rule-adherence.

### Files Changed
`index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.17 Pro — Build `20260422-005`
**Released:** April 22, 2026

### Copy + Clear button DRY audit — one clipboard helper, all inline onclick chains promoted to named functions

Six **Copy** buttons across the app each had their own hand-rolled copy handler. Four lived as named functions (`copyConsole`, `copyConflicts`, `copyNotes`, `copyDocument`) and one more (`copyActiveHistTab`) in the history modal, but each one re-implemented the same four-step pattern: read text from the DOM, maybe empty-check it, call `navigator.clipboard.writeText`, fire a toast. The empty-check was present in two of them (`copyDocument`, `copyNotes`) and missing from the other three, so pressing **Copy** on an empty Conflicts panel silently copied nothing while pressing it on an empty Document gave you a warning. The sixth Copy — the **📋 Copy** on the Project Goal modal footer — wasn't even a function, just a 115-character inline `onclick` chain. Five variants of the same mechanical action plus one inline, with inconsistent user feedback depending on which button you hit.

Two more **Clear** buttons lived as inline `onclick` chains: the **✕ Clear Goal** button under the goal form (wiping six fields plus three follow-up calls, all in the attribute) and the **✕ Clear** button in the Notes drawer (three calls inline). Every other panel on the work screen — Conflicts, Console, Document — had a proper `clearX()` function; Goal and Notes were the outliers.

This release collapses the copy surface to a single `copyToClipboard(text, label)` helper and promotes the three remaining inline handlers to named functions so every panel's Copy and Clear pair now looks the same.

### Refactor

**New helper: `copyToClipboard(text, label)`**

One function handles the shared steps: coerce the input, empty-check it, write it, toast the result. Every caller now reads as a one-liner except `copyConsole`, which keeps its custom text extraction (reversed `.console-entry` walk + newline join) and hands the resulting string to the helper. `copyConflicts`, `copyNotes`, `copyDocument`, `copyActiveHistTab`, and the new `copyGoal` are all of the form `copyToClipboard(source?.value, 'Label')`.

**Three inline `onclick` chains promoted to named functions**

`clearGoal()` wipes the six goal input fields and calls `saveProject()`, `updateGoalCounter()`, `updateProjectRequirements()` — previously a 215-character attribute. `clearNotes()` wipes `workNotes` and calls `saveSession()`, `updateNotesBtnPriority()` — previously inline. `copyGoal()` reads the goal modal edit field through the new helper — previously an inline `navigator.clipboard.writeText(...).then(()=>window.toast(...))`. The three button elements in `index.html` now read `onclick="clearGoal()"`, `onclick="clearNotes()"`, `onclick="copyGoal()"`.

### User-Visible Side Effects

**Consistent empty-check on every Copy button**

All six Copy buttons now toast `⚠️ No {label} to copy` when the source is empty, where previously three of them silently copied an empty string. Conflicts, Console, and Goal-copy gain this feedback; Document and Notes keep theirs; the history-tab Copy gains it too.

**Unified toast wording**

`copyNotes` used to toast `Nothing to copy` on empty — now `⚠️ No notes to copy`, matching the other five. `copyActiveHistTab` used to toast `📋 Copied` on success — now `📋 Response copied`, with the noun that every other Copy toast includes.

### Files Changed
`index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.16 Pro — Build `20260422-004`
**Released:** April 22, 2026

### Export consolidation — one bylined document exporter, event-decoupled done-state, hyphenated filenames

Three functions were handling export: `exportDocument()` on the work screen, `finishAndExport()` on the Finish modal, and `exportSession()` everywhere transcripts were exported. `exportDocument` wrote the doc with no byline. `finishAndExport` wrote the same doc with a byline and then directly poked `finishBtnDoc` into a done state. `exportSession` wrote the transcript and had a `finishModal.classList.contains('active')` branch baked into its tail to decide whether to poke `finishBtnTranscript`. Two functions for the same document export with different output, and both exporters reaching into Finish modal button state directly — neither of those was going to age well.

This release collapses the document side to a single `exportDocument()` that always writes the byline, renames `exportSession()` → `exportTranscript()` to match what it actually produces, and decouples the Finish modal done-state via a `waxframe:exported` custom event. The exporters now dispatch on success and know nothing about Finish modal buttons. A single listener attached at `DOMContentLoaded` checks whether the modal is active and updates the matching button only when it is — work-screen and quota-warn exports are no-ops for that listener because the modal is closed when they fire.

### Bug Fix

**Work-screen Export now writes the byline**

The work-screen **💾 Export** button was calling the old no-byline `exportDocument()`. If you exported the document from the work screen instead of walking through the Finish modal, you got a bare text file with no provenance footer. This was the bug that surfaced the consolidation — two nearly identical document exporters with divergent output. Now every document export — work-screen or Finish modal — writes the same byline block (`Produced by WaxFrame in N rounds and N minutes. weirdave.github.io/WaxFrame-Professional`) because there's only one function that does it.

### Refactor

**Function rename: `exportSession()` → `exportTranscript()`**

The function produces a transcript. Calling it `exportSession()` was a holdover from when "session" meant the whole run including document state. With `backupSession()` now owning the session-preservation workflow (separate JSON format, Menu entry point, resume-later semantics), keeping `exportSession` as the name for the transcript exporter was a collision waiting to confuse someone. The UI labels referencing this function updated to match: the two quota-warn buttons injected into the live console when localStorage fills up now read **💾 Export Transcript Now** instead of **💾 Export Session Now**. Same DRY cascade that drove the rename — downstream labels should match the function they call.

**Custom-event done-state**

The Finish modal done-state (disabled button, `✅ Exported!` text, `.finish-modal-btn-done` class) used to live inside the exporters themselves. Now the exporters dispatch `waxframe:exported` with a `detail.kind` of `document` or `transcript` and a listener inside the existing `DOMContentLoaded` block — right next to the pristine-innerHTML capture added in v3.19.15 — handles the done-state transition. The listener is gated on `finishModal.classList.contains('active')`, so it only fires when the modal is currently open. Work-screen Export, work-screen Export Transcript, and the two quota-warn injected buttons all fire the same exporters and all correctly get nothing from the listener because the modal is not open when they fire. The state-leak fix from v3.19.15 keeps working because `clearProject()` still restores from `dataset.originalHtml`.

### Filename Format

**Hyphenated filenames, version dots preserved**

`buildExportName()` previously produced files like `My_Project_v1.2.3.txt` and `My_Project_v1.2.3_Transcript.txt` — underscores between every token. Now it produces `My-Project-v1.2.3.txt` and `My-Project-v1.2.3-Transcript.txt`. Spaces and non-alphanumeric characters in the project name become hyphens, the separator between project name and version becomes a hyphen, the `_Transcript` suffix becomes `-Transcript`, and the version string still accepts dots and hyphens verbatim so semver-style versions survive intact. The regex in the mask-substitution path was updated the same way so custom export masks collapse to hyphens too. Users with past exports will see the filename style change starting from this release — non-destructive, just visibly different.

### Deleted

**`finishAndExport()`** — folded into `exportDocument()`. The Finish modal's Export Document button now calls `exportDocument()` directly. The `finish-modal-btn-disabled` guard that used to live at the top of `finishAndExport()` is no longer needed — when the button has that class, the browser-level `disabled` attribute already blocks the click, and the empty-doc toast already exists as the first line of the unified function.

### Files Changed
`index.html` · `app.js` · `version.js` · `CHANGELOG.md`

---

## v3.19.15 Pro — Build `20260422-003`
**Released:** April 22, 2026

### Finish modal cleanup — snapshot button removed, export-button state leak fixed

The Finish modal shipped with a **📷 Save Session Snapshot** button that called a function called `exportSnapshot()` — which was a near-duplicate of the Menu's **💾 Backup Session** → `backupSession()`. Same output (`_waxframe_backup` JSON), same use case (pause and resume across sessions), two different entry points, two slightly different filename conventions, and one of them had a stale `.name` vs `.projectName` bug that produced generic `WaxFrame-Snapshot-session.json` filenames instead of the project-named files the Menu version produces correctly. This release deletes the duplicate entirely.

The Finish modal's job is **finalizing and delivering** — Export Document, Export Full Transcript, Start New Project. Save-session-for-later is a different workflow (pause, resume, laptop battery dying, end of day, machine switch) and belongs in the Menu where it already lives. Collapsing to one entry point per action removes a real bug class: the duplicate function had drift in filename handling that nobody was going to notice until someone tried to compare two backup files from the same project.

**Files touched by this deletion:** `index.html` removes the `finishBtnSnapshot` button block; `app.js` removes the `exportSnapshot()` function and the two corresponding references inside `showFinishModal()` (the lookup and the disabled-class toggle, plus the now-dead `hasAnything` variable); `waxframe-user-manual.html` removes the *📷 Save Session Snapshot* row from the Step 10 Finish modal table, rewrites the Start-New-Project warning to reference **Menu → 💾 Backup Session** for session preservation, and updates the Step 6 Finish-button descriptor that briefly mentioned snapshots. No CSS changes — the `.finish-modal-btn-snapshot` class had no standalone rules (it was only used as a tag on the shared `.finish-modal-btn-export` styling).

### Bug Fix

**Finish modal export-button state leak across sessions**

Clicking **💾 Export Document** in the Finish modal correctly set the button to a "✅ Exported!" done state — disabled and visually distinct — so the user knew the export had happened. But that done state persisted across sessions. After clicking **Start New Project** and running an entirely new session, the user would open the Finish modal and see **✅ Exported!** already applied to their Export Document button, even though they had never exported this new session's content. Same pattern affected the deleted snapshot button.

Root cause was that `finishAndExport()` overwrote the button's `innerHTML` and set `disabled = true`, but nothing else in the codebase ever reset those properties. `showFinishModal()` only toggled the `.finish-modal-btn-disabled` class based on whether there was content to export; it never restored the per-session done state. `clearProject()` wiped all session data but left the Finish modal button state untouched.

The fix captures each button's pristine `innerHTML` into a `dataset.originalHtml` attribute on page load (inside the existing `DOMContentLoaded` handler, one capture per button, one line per button), then restores from that snapshot inside `clearProject()` alongside the other session-teardown work. This gives correct scoping — within the same session, closing and reopening the Finish modal preserves the user's "already exported" state so they don't get confused. Across sessions, `clearProject()` fires (it's called by `finishAndNew()` and by session-wipe paths), the button innerHTML is restored from the captured pristine state, `disabled` is cleared, and `.finish-modal-btn-done` class is removed. User sees a fresh Finish modal with fresh export buttons for the new session.

### Consistency

**Finish modal transcript button — now also shows a done state**

`exportSession()` (the full-transcript export function) is called from two places: the work-screen **📋 Export Transcript** button and the Finish modal's **📋 Export Full Transcript** button. Previously it updated neither button's done state because it couldn't know which caller fired it. Now it checks whether the Finish modal is currently active — if so, it updates `finishBtnTranscript` to the done state, matching the behaviour of `finishAndExport()` for the document button. The work-screen transcript button is unaffected because the modal is not active when it fires. The state-leak fix above applies to the transcript button too, so its new done state resets correctly across sessions via the same mechanism.

### Files Changed
`index.html` · `app.js` · `waxframe-user-manual.html` · `version.js` · `CHANGELOG.md`

---

## v3.19.14 Pro — Build `20260422-002`
**Released:** April 22, 2026

### Quick Start playbook rewrite — human-voice seed, empirically calibrated round count

The Quick Start playbook (the onboarding entry point pinned above the main playbook catalog on the Document Playbooks page) shipped with goal-field values that read like a product brief for an AI rather than something a human would actually type when sitting down to describe what they want. Phrases like *"with nothing assumed"*, *"successfully on the first try"*, *"precise quantities"*, and *"someone who has never baked cookies before"* are each a direct instruction to reviewers to interrogate every implicit assumption — which manufactures pedagogical churn on a topic (chocolate chip cookies) that should converge fast.

Three real runs of the same scenario, same reviewers, same Builder, only the goal-field phrasing changing, produced the following measured data:

| Run | Seed style | Rounds | Final words | Time |
|---|---|---|---|---|
| v1.0 | Short human-voice | 13 | 256 | 16 min |
| v2.0 | Original AI-drafted playbook seed | **22** | 1,013 | 36 min |
| v3.0 | Human-voice seed (now shipped as Quick Start) | **2** | 434 | ~1 min |

Goal-field phrasing turned out to be the dominant driver of convergence speed. Builder identity and reviewer set were held constant across v2.0 and v3.0; only the seed changed, and rounds dropped from 22 to 2. The previous Quick Start seed was not producing a bad recipe — it was producing an *over-specified* recipe that invited 22 rounds of synonym swaps over phrases like `a small bowl` vs `a small separate bowl` vs `a small bowl (for cracking eggs)`.

The Quick Start seed is now rewritten to match how a human actually describes what they want. The desired-outcome field is a single line — *"Create a recipe that is simple and easy but makes great cookies"*. Scope and tone are left blank (both are optional; a good target-audience line carries the framing the hive needs). Additional-instructions is one short constraint — *"No extra ingredients like nuts"* — rather than a multi-clause guardrail block. The prior "paste these guiding notes before Round 1" instruction has also been removed: the playbook no longer tells users to seed the hive with extra parameters beyond the six goal fields, because a first-time user would not know to do that unprompted, and the goal fields are sufficient.

The rounds estimate is also corrected. The playbook previously stated `2–4 rounds typical`, which was an aspirational guess that did not survive first contact with the playbook's own seed (which actually took 22 rounds). The new estimate is `2 rounds typical — draft in round 1, majority convergence in round 2`, which is the measured result on the new seed. Users will not arrive at round 5 wondering if WaxFrame is broken.

The closing tip at the bottom of the Quick Start block has been updated to point users to **Menu → 💾 Backup Session** for saving a reference copy, rather than the Finish-modal snapshot button. The Menu path is the canonical location for session backup in WaxFrame; the Finish-modal snapshot button is a duplicate entry point that will be removed in a future release.

### Dry Run Test Sheet updated with v3.0 seed and empirical results

The Quick Start block at the top of `WaxFrame_DryRun_TestSheet.md` is rewritten to match the new playbook seed. A new **Empirical Run Data — Quick Start calibration** section has been appended at the end of the file, capturing the three-run dataset (v1.0 / v2.0 / v3.0), reviewer-behavior observations from the v2.0 run (which reviewers drove stylistic churn versus which produced substantive suggestions), and Builder-choice considerations. This section is the empirical baseline for future playbook calibration work — when other playbooks are dry-run tested, their actual measured round counts can replace the current estimates in `document-playbooks.html` using the same pattern.

Two columns proposed for future test-sheet entries — **Builder** and **Active reviewers** — because the v2.0-to-v3.0 data isolated seed phrasing as the dominant variable only because Builder was held constant. Future runs that vary Builder will need that column to stay interpretable.

### Files Changed
`document-playbooks.html` · `WaxFrame_DryRun_TestSheet.md` · `index.html` · `version.js` · `app.js` · `CHANGELOG.md`

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
