# WaxFrame Pro v3.21.13

**Build:** `20260425-012` · **Released:** April 25, 2026

A polish-and-cleanup release after v3.21.11's data-loss fix was validated end-to-end. Storage scaffolding from the bug hunt comes out, typography gets unified across the product, and a few real UX gaps fill in.

---

## Storage validated, scaffolding removed

The data-loss bug fixed in v3.21.11 was validated end-to-end: a 21-round JD test produced a 642 KB backup with the full IDB session, 88,308 character console log, 1,750 character document, 1,109 second project clock, and 4 rounds of resolved decisions all persisting correctly. Firefox granted persistent storage. With the real fix proven, the paranoid scaffolding from the bug hunt comes out.

**Removed:**

- Dev-mode trace block in `saveSession` (Track B from v3.21.9)
- Guard #2 IDB-read-and-compare write-guard
- `LS_SESSION_MIRROR` write after every IDB commit, plus its fallback reads in `loadSession` and `startSession`
- `LS_SESSION_MIRROR` field from backup format (bumped to v3 — v2 backups still import correctly, the mirror field is just ignored)
- `LS_SESSION_MIRROR` restore in `importSession` and the constant declaration
- Legacy `aihive_v2_db` purge block (only the developer and one tester ever had this)
- Verbose multi-paragraph comments throughout `saveSession`

**Kept** (these earned their place):

- `_saveSessionChain` write serialization
- Pre-launch storage verify in `startSession`
- Persist retry every 3 rounds
- Backup format v3 with `IDB_SESSION` field
- The actual v3.21.11 fix: `consoleLog` strips the page-load default entry on first real log

`app.js` shrank by ~5.9 KB.

---

## New project flow no longer races against IDB

Hit on a real second-project test: after finishing one project and clicking "Start New Project," the user moved through Setup screens 2–5 and clicked Launch. The pre-launch storage verify saw the OLD session still sitting in IDB and threw a confusing dialog: *"A saved session exists in browser storage (21 rounds, 1,750 chars in document) but did NOT load into memory."*

The dialog was correct behavior for a real load failure — but this wasn't a load failure. `clearProject()` had been calling `idbClear().catch(() => {})` as fire-and-forget. The async IDB delete didn't complete before the user moved through new-project setup. By Launch time, IDB still held the old session.

**Fix:** `clearProject()` is now `async` and `await`s `idbClear()`. `finishAndNew` awaits `clearProject()`. By the time screen navigation reaches the new project, IDB is genuinely empty. The pre-launch verify becomes a true safety net for actual load failures rather than firing on legitimate new-project flows.

---

## Tagline punctuation fixed everywhere

The tagline read `Many minds. One refined result.` in ten places (welcome screen, five `.fs-logo-tag` instances on helper screens, work screen right panel, nav panel, README, user manual print header). The mid-sentence period split it into two short fragments. Replaced the period with a comma and lowercased the second word: **`Many minds, one refined result.`** — one continuous sentence with a comma pause.

Eight of the ten instances render uppercase via CSS `text-transform: uppercase`, so the source-case change is invisible there but the underlying grammar is correct everywhere. The two visible instances (README markdown bold, user manual print header) read more naturally.

---

## Version stamp under work-screen tagline

The right-panel logo block on the work screen showed only the wordmark and tagline — no version indicator inside the document workspace. Added a `.work-right-logo-version` element that auto-populates from `APP_VERSION` via the existing `.app-version-stamp` class, so it follows whatever `version.js` says with no manual maintenance.

---

## Typography unified — Path A

The tagline and version stamp at five locations across the product were sized inconsistently. Welcome screen had a 4-point gap between tagline and version (15/11), work right panel had a 2-point gap (13/11), helper screens had 12/10, nav panel had 0-point gap (10/10).

Adopted a single rule across all five pairs: **version is always tagline minus 2 points, with a floor of 9px.** Within each pair, color, font-weight, letter-spacing, and text-transform all match — the pair reads as one typographic system, just sized down. Absolute size scales with the canvas (welcome screen wordmark is hero-sized so its tagline+version pair sits bigger; nav panel is compact so its pair sits smaller). The relationship stays consistent everywhere; the absolute sizes scale to fit the surface.

---

## Paste Text — Clear buttons added

Reference Material → Paste Text and Starting Document → Paste Text had no way to empty the textarea other than manual select-all-and-delete. Added a small **`✕ Clear text`** button below each paste textarea, mirroring the existing `✕ Remove file` button on the Upload File tabs. Clears the textarea, resets line numbers, focuses the textarea for immediate re-paste, and triggers the same downstream updates as a normal user-initiated empty.

---

## Pasted starting document persists like uploaded files do

A behavioral asymmetry between Upload File and Paste Text in the Starting Document setup, there since the upload feature shipped: uploading a file triggered an immediate `saveSession()` after extraction, so the document text was on disk the moment the green status pill appeared. Pasting text into the textarea, by contrast, only persisted when the user clicked Launch — until then it was DOM-only and a refresh blew it away. No data loss for completed projects, but a one-off behavior gap that surprised users on first encounter.

Closed the gap. Added a `pastedDocument` field to `LS_PROJECT` (alongside the existing `referenceMaterial` field), with a debounced 250ms auto-save on every keystroke in the paste textarea. `loadSettings` restores the field to the textarea on page load, mirroring how reference material is restored. `clearPasteText` now also calls `saveProject()` so the cleared state persists.

**Result: refresh at any point during project setup is now safe across all three Starting Document modes — upload, paste, and scratch.**

---

## Job Description playbook — measured round count + real-world example

The JD playbook said `3–4 rounds typical` — an aspirational estimate that did not reflect actual convergence behavior. After running a full JD project from scratch with reference materials in v3.21.11, the real number is **20–22 rounds**.

Updated the Rounds line: *"Even from scratch with full reference materials, real convergence on a quality JD takes 20+ rounds, not 3–5. Round 22 reached majority convergence (3 of 4 AIs satisfied) with the holdout offering minor wording suggestions (measured, not estimated)."*

Added a new **Real-world example — JD that took 22 rounds** block after the Step 3 table, with concrete values for every Project screen field (project name, version, document type, target audience, desired outcome, scope and constraints, tone and voice, additional instructions, length constraint, starting document choice) plus the full Notes payload as a Courier New `<pre>` block. A beginner can copy these values verbatim, run the playbook end-to-end, and reproduce the convergence result.

---

## Files changed

- `index.html` — tagline edits (8), `.work-right-logo-version` div, `.file-clear-row` blocks for both paste-text Clear buttons, build meta `20260425-011`, cache-bust `3.21.13`
- `style.css` — `.work-right-logo-version` rules with breakpoints, `.dp-real-example` playbook card, `.welcome-brand .app-version-stamp` Path A override, `.nav-panel-version` updated to 9px
- `app.js` — storage scaffolding cleanup, `clearProject` and `finishAndNew` made `async`, `clearPasteText` and `clearRefPasteText` functions added, `BUILD` `20260425-011`
- `version.js` — `APP_VERSION` `v3.21.13 Pro`
- `document-playbooks.html` — JD playbook Rounds line + Real-world example block
- `README.md` — tagline edit
- `waxframe-user-manual.html` — tagline edit (print header)

---

## Validation

End-to-end JD project on v3.21.11 (same `saveSession` and `loadSession` logic as v3.21.13 once the dev trace, mirror, Guard #2, and legacy purge are stripped — the cleanup is removal-only, not behavioral change):

| Metric | Result |
|---|---|
| Completed rounds | 21 |
| Console log | 88,308 chars |
| Working document | 1,750 chars |
| Project clock | 1,109 sec (18:29) |
| Resolved decisions persisted | 4 rounds |
| Backup file | 642 KB |

Every assertion in the bug-fix story checked out. v3.21.13 retains all the validated behavior and removes only the scaffolding.
