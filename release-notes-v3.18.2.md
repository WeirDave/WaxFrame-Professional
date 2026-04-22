## WaxFrame Professional — v3.18.2

**Build:** `20260421-003`

---

## 🆕 New Features

**Start New Project — export safety check**
Clicking Start New Project now checks whether anything has been exported in the current session. If the working document has content and nothing has been saved, a confirm dialog stops you with explicit instructions: Cancel goes back so you can export, OK discards everything. The check resets each time the Finish modal opens.

---

## 🐛 Bug Fixes

**Finish modal — button colors restored and clarified**
All three export buttons (Export Document, Export Full Transcript, Save Session Snapshot) are now identical amber — the WaxFrame standard action color. Stale blue and green overrides removed. Start New Project is green — it's a positive next step, not a destructive action. Disabled export buttons are now muted grey instead of red so unavailable and dangerous states no longer look identical. Warning sub-label added to Start New Project.

**Working document text selection — amber highlight**
Text selected by click-to-scroll (and manual selection) now highlights in WaxFrame amber with near-black text instead of browser-default blue. Consistent in light and dark mode.

**Round History moved to Menu**
History button removed from the work screen top bar — top bar is now Notes and Finish only. Round History is in the Menu under Work Screen. User manual updated throughout.

**Nav panel — wider on smaller screens**
Navigation panel width is now responsive: 280px on full desktop, stepping up to 320 / 360 / 420px as the viewport shrinks toward the 1024px minimum.

**Backup Session filename**
Was always saving as `WaxFrame-Backup-session.json` due to a wrong property name. Now correctly uses the project name and version: e.g. `WaxFrame-Backup-Thank-you-Letter-to-Tim-v1.json`.

**Blank work screen after mid-session navigation**
Navigating to the Project screen mid-session and back left the working document empty. Missing `screen-work` handler added to `goToScreen`.

**Accidental session wipe via Launch button**
Launch button on the Starting Document screen now changes to Return to Work Screen when an active session exists. `startSession` also requires confirmation before overwriting a live session.

**Holdout convergence cards — click-to-scroll, line numbers, NO CHANGES NEEDED artifact**
Click-to-scroll fixed (broken data attribute replaced with index lookup). Stale Line N: references stripped from displayed text. Trailing NO CHANGES NEEDED text stripped during parsing.

**Goal modal — auto-sizing**
Project goal modal textarea now sizes itself to content on open, capped at 55% viewport height. Modal widened to 900px.

---

## 📁 Files Changed

`index.html` · `app.js` · `style.css` · `version.js` · `waxframe-user-manual.html` · `document-playbooks.html` · `CHANGELOG.md`
