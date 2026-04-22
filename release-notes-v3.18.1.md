## WaxFrame Professional — v3.18.1

**Build:** `20260421-002`

---

## 🐛 Bug Fixes

**Reviewer prompt — convergence failure**
The reviewer prompt told every AI that NO CHANGES NEEDED *"should be rare"* — directly contradicting the rule two lines above it that said don't suggest for the sake of suggesting. The result was 11-round sessions on 64-word documents arguing about comma placement. Replaced with the opposite: NO CHANGES NEEDED is the correct and expected response when the document is genuinely done. Punctuation preferences, synonym swaps, and stylistic alternatives are now explicitly named as invalid suggestion types.

**Blank work screen after mid-session navigation**
Navigating to the Project screen to edit the goal and then back to the Work screen left the document textarea empty. `goToScreen` had initialization handlers for every screen except `screen-work`. Missing handler added — repopulates the document, round badge, phase bar, and conflicts without touching the console.

**Session wipe on accidental Launch**
Navigating the setup screens mid-session and clicking Launch WaxFrame on the Starting Document screen silently cleared all history and reset the document. Two protections added: the Launch button now changes to **↩ Return to Work Screen** when an active session exists, and `startSession` requires explicit confirmation before overwriting any session that has completed rounds.

**Mute button — three sound functions ignoring mute state**
`playFlyingCarSound`, `playAnvilSound`, and `playMetalClang` were all missing mute guards and played regardless of the mute toggle. All three fixed.

**Send to Builder staying amber after round completes**
After a Builder Only round cleared the Notes textarea, the button priority was never updated. Send to Builder stayed highlighted even with empty Notes. Fixed.

**Dark mode footer buttons — invisible text**
Smoke the Hive / Send to Builder button text was hardcoded near-black (`#0a0c12`), invisible on a dark background when the inactive button role was assigned. Text color is now contextual by button state.

**Save Session Snapshot — button did nothing**
`exportSnapshot` was absent — lost in a prior large block replacement. Implemented fresh. Filename includes project name and version. Button updates to done state after saving. Disabled buttons now actually block clicks.

**Holdout suggestion cards — click-to-scroll broken, line numbers showing, NO CHANGES NEEDED artifact**
Three issues on the convergence holdout cards: (1) click-to-scroll was broken because the data attribute approach truncated at inner quotes — replaced with index-based lookup. (2) Stale "Line 9:" references were visible — now stripped using the existing `stripLineRefs` function. (3) Trailing "NO CHANGES NEEDED" text was being appended to the last suggestion card during parsing — now stripped.

**Conflict cards — Lock in Notes integration**
Added a **🔒 Lock my selection in Notes** button to every USER DECISION conflict card. Clicking it grabs your selected option text, pre-fills the lock template in the Notes drawer, and opens the drawer. Replaces the previous copy-paste workflow.

**Goal modal — too small, no copy button**
Project goal modal textarea was fixed at 280px and cut off content. Now auto-sizes to fit the full goal, capped at 55% viewport height. Modal widened. Copy button confirmed present and working.

---

## 📁 Files Changed

`index.html` · `app.js` · `style.css` · `version.js` · `waxframe-user-manual.html` · `document-playbooks.html` · `CHANGELOG.md`
