# Deep Dive Viewer + Card Theming + Troubleshooting Toggle Removed

**Build:** `20260430-003`
**Released:** April 30, 2026

---

## Overview

Three things bundled in one surgical release:

1. **Removed the Troubleshooting toggle** — better error messages are strictly better, there's no scenario a user wants the old behavior, so it's just how WaxFrame handles errors now
2. **Built the Deep Dive Capture Viewer UI** — no more typing `WF_DEBUG.ringBuffer` into DevTools to see captured data
3. **Fixed Card theming for both light and dark modes** — hardcoded colors replaced with theme-aware variables

Plus two new dev triggers so the developer can preview the new surfaces in both themes without forcing real errors.

---

## Removed — Troubleshooting toggle

The `🩺 Troubleshooting` button is gone from the Dev Toolbar. The toggle framing was a mistake. There's no scenario where a user wants worse error messages, so the toggle never made sense — Cards always fire on classified errors now. No menu, no setting, no knob. Just how WaxFrame handles errors.

Code-level cleanup:

- `WF_DEBUG.troubleshootingOn` property removed
- `WF_DEBUG.setTroubleshooting()` method removed
- `waxframe_troubleshooting` localStorage key no longer used
- Guards inside `showCard` and `showRoundErrorModal` removed
- DOMContentLoaded button-state-sync handler simplified

---

## New — Deep Dive Capture Viewer

The Deep Dive ring buffer introduced in v3.28.0 captured per-round telemetry correctly but had no UI to view it. This release closes the gap.

### `📋 View Captures` button on Dev Toolbar

Click to open the Deep Dive Viewer modal.

### Eight-column capture table

| Time | AI | Provider | Model | Elapsed | Chars | Words | Finish |
|------|----|----------|-------|---------|-------|-------|--------|

Newest captures at top. Monospace formatting on model and finish-reason columns. Right-aligned numerics. Sticky table header so columns stay visible during scroll.

### Three modal actions

- **📋 Copy as JSON** — full ring buffer with version stamp, ready to paste into support tickets
- **🗑 Clear buffer** — wipes captured rounds
- **↻ Refresh** — re-renders if a new round just completed

### Smart status banner

- **OFF** — "Deep Dive is OFF — turn it on in the Dev Toolbar to start capturing rounds." (warn-tinted)
- **ON, empty** — "Deep Dive is ON — no rounds captured yet."
- **ON, has data** — "Deep Dive is ON — showing last N round(s) captured (max 10)." (teal-tinted, matching Deep Dive button accent)

---

## Fixed — Card theming for both themes

The Troubleshooting Card and Deep Dive Viewer CSS had hardcoded values that didn't respect the WaxFrame theme system:

- `rgba(0, 0, 0, 0.35)` for backgrounds → broke against the light theme
- `var(--text-muted, #999)` → the variable doesn't even exist, fell back to a literal grey that didn't match either theme
- `color: #000` on accent button hover → fine in dark, but unintentional black-on-orange in light mode
- Status banner alpha values too low for visibility on white surface

Fixed by:

- All hardcoded colors replaced with proper CSS variables (`--surface2`, `--border2`, `--text-dim`, `--accent-dim`)
- Hover button text uses `var(--surface)` for proper contrast in both themes
- Explicit `[data-theme="light"]` overrides where alpha-tinted banners need stronger saturation against white

Both surfaces now auto-swap correctly when the theme toggles.

---

## New — Dev preview triggers

Two new buttons on the Dev Toolbar so theme issues can be reviewed without forcing real errors:

### `▶ Test Card`

Cycles through every entry in `WF_ERROR_CATALOG` on each click. First click shows the CORS card, second shows MODEL_NEEDS_DIFFERENT_ENDPOINT, third shows RATE_LIMITED, etc. After 14 clicks wraps back to the first. Each test card has realistic context populated (provider, status, raw response) so the technical-details expand has visible content. Toast confirms which card was triggered.

### `▶ Test Viewer`

Seeds 6 fake captures into the ring buffer (one per default provider) and opens the Deep Dive Viewer immediately. Lets you eyeball the table layout, status banner, and theming without running real rounds. The seeded data is realistic but obviously fake (model names like `claude-opus-4-7` and `grok-4.20-reasoning`).

---

## Architecture

- Five new methods on `WF_DEBUG`: `openViewer`, `closeViewer`, `_renderViewer`, `copyViewer`, `clearViewer`
- Two new methods on `WF_DEBUG`: `testCard`, `testViewer` (with private `_testCardIdx` for cycling)
- New `deepDiveViewer` modal in `index.html`, adjacent to `troubleshootingCard`, sharing the `finish-modal` scaffolding pattern
- New CSS block for `.ddv-*` classes
- Two new dev triggers slotted alongside the existing animation triggers (Unlock Scene / Fly-in / Majority / Unanimous / Test Card / Test Viewer)

---

## Version stamps

All four canonical locations bumped from v3.28.1 to v3.28.2, build `20260430-002` to `20260430-003`. All six pages cache-busted to `3.28.2`.
