## v3.14.0 — Build 20260418-001

**Setup page 2 layout overhaul, identical text area widths, pulsing watermark, info modal polish.**

---

### ✨ Added

- **Pulsing watermark logo** — The WaxFrame logo now breathes in and out in the dead space to the right of the fixed-width content on the Starting Document panel (Upload File, Paste Text, and Start from Scratch tabs all share the same watermark). Fades between fully transparent and `opacity: 0.18` on a 6-second ease-in-out cycle. Desktop only — hidden at laptop where the textarea fills the column.
- **Export filename info button** — The `💾 Export filename` row now has a ⓘ button that opens a modal explaining the two supported tokens: `{name}` (project name, sanitised for filenames) and `{version}` (project version, defaults to `v1`). The modal and its content already existed but had no entry point in the UI.

---

### 🛠 Fixed

#### Text Areas

- **All three editors now share identical width** — The working document uses `font-family: 'Courier New'` so `80ch` resolves to Courier New character widths. `proj-ta-editor` had no font set, so `ch` resolved against DM Sans — making the goal and paste boxes significantly wider than the working doc. Added `font-family: 'Courier New', Courier, monospace; font-size: 13px` to the `.proj-ta-editor` base rule and to `goal-split-left` in the desktop media block. Paste panel width formula updated to `calc(44px + 80ch + 8px + 12px + 32px)` — identical to the working document panel.
- **Paste panel expands to fill right column height** — Added flex column chain through `proj-right-scroll → .doc-tab-panel.active → #panel-paste → .proj-ta-editor`. Fixed a specificity bug where `#panel-paste { display: flex }` (ID selector) overrode `.doc-tab-panel { display: none }` (class selector), causing the paste panel to always render alongside the active panel. Removed `display` from the `#panel-paste` ID rule entirely.
- **Upload File and Start from Scratch panels** — Drop zone and scratch notebook now match the paste textarea's exact `calc(44px + 80ch + 8px + 12px + 32px)` width using the same Courier New font for correct `ch` resolution. Both fill column height via `flex: 1`. Width constraints release to `100%` at laptop.

#### Setup Page 2 — Laptop

- **32px phantom middle gap eliminated** — `fs-divider { width: 0 }` zeroed the element but the CSS grid track remained `32px` in `grid-template-columns: 1fr 32px 1fr`. Added `grid-template-columns: 1fr 0px 1fr` to the laptop override to collapse the track entirely.
- **Uniform 8px column padding** — `proj-left-scroll { padding: 0 8px }` mirrors the right column's `proj-right-scroll` treatment. Fixed multiple cascade ordering bugs where base rules at line ~5440 silently overrode laptop overrides at line ~1808 for `proj-static-top`, `proj-goal-flex`, and `goal-split-left`.

#### Setup Page 2 — Desktop

- **Goal textarea width = working document** — `goal-split-left` flex-basis uses `calc(44px + 80ch + 8px + 12px + 32px)` with Courier New font. Refine rounds panel absorbs remaining column space.

#### Setup Page 1

- **Action button sizing fixed at both viewports** — Desktop capped at normal `.btn` size via `@media (min-width: 1601px)`. Laptop tightened to `11px / 3px 9px`. Fixed cascade bug where desktop rule appeared after laptop rule in file, causing desktop size to win everywhere. API Key Guide icon hidden at laptop via CSS only.

#### Work Screen

- **Builder card visual parity** — Removed amber `border-color`, `box-shadow`, `::before` strip colour, and `hex-status` colour from `.hex-cell.is-builder`. The `BUILDER` badge tag is now the only differentiator. Laptop dot-strip builder dot unchanged.

#### General

- **Desktop main content container corners** — Removed `border-radius: var(--radius-md)` from `.fs-col`. Setup page content cards are now square-cornered at desktop, matching laptop. Tip cards retain their own border-radius.
- **Info modals — labels clipping and modal too narrow** — Removed `width: 56px` from `.info-label` (was clipping labels like "Start from Scratch", "Builder Decision", "How Rounds Work"). Widened all `goal-info-modal` instances to `max-width: 900px`, `max-height: 92vh`, `padding: 28px 36px`. Fixed cascade bug where `.finish-modal { max-width: 600px }` at line 4490 overrode `.goal-info-modal { max-width: 900px }` at line 2681 — resolved by upgrading to compound selector `.finish-modal.goal-info-modal` (specificity [0,2,0] vs [0,1,0]).

---

**Full changelog:** [`CHANGELOG.md`](CHANGELOG.md)
