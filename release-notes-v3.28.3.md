# Console Error Inspection Coverage + Dev Toolbar Cleanup

**Build:** `20260430-004`
**Released:** April 30, 2026

---

## Overview

Two surgical improvements:

1. **Console error inspection now fires for storage and extraction failures**, not just HTTP API errors — three new call sites pass `rawData` through `consoleLog` so the click-arrow appears
2. **Removed the redundant `▶ Test Viewer` dev toolbar button** that overlapped with `📋 View Captures`; the seed-data action now lives inside the viewer modal

Bigger hardening work — HTTP classification unification across four call sites, broader silent-catch audit — parked for v3.29.0 when it can get focused review.

---

## Console error inspection — expanded coverage

The clickable `→` arrow on console error lines (already built) was previously only attached to HTTP API errors. Other error categories logged their messages but offered no way to inspect the underlying error context without opening DevTools.

This release wires `rawData` through three more error paths:

### `IndexedDB session save failed`
When IDB throws on a session write, the arrow now surfaces the full IDB error stack. Previously you saw only `e.message` in the console line — useful, but the stack trace was lost.

### `localStorage QuotaExceededError`
When the localStorage fallback hits its quota, the arrow now shows a contextual recovery message — export transcript, clear browser storage, reload — alongside the original error message. Previously you saw only the warning line and an Export button.

### `localStorage save failed (other)`
For non-quota localStorage failures, the arrow surfaces the `lsErr.stack` so the actual cause is visible without DevTools.

### `PDF re-extraction failed`
When the AI Vision re-extraction path errors out, the arrow shows the full error stack from the extraction pipeline. Previously you saw only the toast and the truncated console line.

### Coverage delta

- Before: 2 of 17 error/warn console call sites had inspection arrows (HTTP error + rate-limit warn)
- After: 5 of 17 — covers the user-visible error categories outside the round flow itself

Click any `❌` line with an arrow to inspect inline.

---

## Removed — redundant Test Viewer button

The `▶ Test Viewer` button on the Dev Toolbar opened the exact same modal as `📋 View Captures`, just with 6 fake captures pre-seeded. They looked like two buttons doing the same thing.

### What changed

- `▶ Test Viewer` button removed from the Dev Toolbar
- `🌱 Seed sample` button added **inside** the Deep Dive Viewer modal, alongside Copy/Clear/Refresh

Single entry point now: `📋 View Captures` opens the modal; theme-testing with sample data is one click away from inside.

`WF_DEBUG.testViewer()` method retained — bound to the in-modal button instead of a dev toolbar button.

---

## Architecture

- `app.js` — three new `consoleLog(msg, 'error', { status, rawJson })` payloads added at the IDB save fail / quota exceeded / lsErr fallback / re-extraction failure sites
- `index.html` — Test Viewer button removed from `.dev-toolbar`; Seed Sample button added to `.ddv-actions` row
- No CSS changes
- No data, storage, or behavior changes outside the button consolidation
- All four canonical version stamps bumped from v3.28.2 to v3.28.3, build `20260430-003` to `20260430-004`. All six pages cache-busted to `3.28.3`

---

## Parked for v3.29.0

These items came up during planning but need focused review and are too risky to do unsupervised:

- Unify HTTP error classification across the four duplicated sites (`callAPI`, Custom AI test, Import from Model Server, Test All Keys) into a single `WF_DEBUG.classify()` path
- Broader silent-catch audit — instrument the worst offenders among the 64 silent `catch(e) {}` blocks in `app.js`
- Error Detail Modal layer enhancements
