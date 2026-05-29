# P0 fix — Worker Bees paste-key input no longer locks out non-active default AIs

A long-standing chicken-and-egg trap on the Worker Bees setup screen prevented users from entering API keys into default AI cards that were not in the current `activeAIs` set. The paste-key input rendered with the HTML `disabled` attribute, producing a not-allowed cursor and silently rejecting clicks and keystrokes. There was no in-app recovery — only a DevTools "Clear site data" wipe could reset the state, and even that did not consistently free the four non-default providers (Gemini, Grok, Mistral, Perplexity) on browsers that had previously visited the site.

---

## Trigger chain

1. User enters a key in one or more default AI cards (e.g., ChatGPT and Claude) and clicks **Continue — Choose Builder**.
2. `continueFromBees()` in `app.js` filters `activeAIs = keyed`, stripping the non-keyed defaults out of the active set, and `saveHive()` persists the filtered `activeAIIds` to `LS_HIVE`.
3. User clicks **Back** to return to Worker Bees.
4. The screen-bees seed at `app.js:1864` checks `activeAIs.length === 0` — false (length is now 2), so the all-six re-seed is skipped.
5. `buildAISetupRowHTML()` renders the non-keyed default cards with `isActive=false`, which set the `disabled` attribute on the paste-key input and triggered the `.ai-setup-key:disabled` CSS rule (opacity 0.35, `cursor: not-allowed`).

---

## Root cause — dead code from the pre-v3.31.0 single-list era

Before v3.31.0, Internet AIs and Server AIs lived in a single combined hive list. Switching the hive into Server mode required hiding the Internet defaults via `isActive=false`. The v3.31.0 release split them into the two-tab structure (Internet Based AI / Server Based AI) that ships today, removing the need for any in-list hiding. The `disabled` attribute and matching CSS rule were never cleaned up, leaving an orphan gate that fired only as collateral damage of `continueFromBees()` whenever a user back-navigated to Worker Bees with fewer than six keys configured.

---

## Fix — three surgical edits

- **`js/app.js`** line 3853 — removed `${!isActive ? 'disabled' : ''}` from the paste-key input.
- **`js/app.js`** line 3794 — removed the now-dead `const isActive = !!activeAIs.find(...)` declaration. The remaining three `isActive` references in `app.js` are all in an unrelated length-mode pill UI and are not affected.
- **`style.css`** lines 857–860 — replaced the `.ai-setup-key:disabled` rule with an explanatory comment so anyone spelunking the history sees why the rule is gone and does not re-introduce the gate.

---

## Verification

- Incognito (clean `LS_HIVE`) was always working because the screen-bees seed at `app.js:1864` fired and seeded all six defaults. Bug only reproduced on browsers with persisted `LS_HIVE`.
- Verified across Chrome (main profile) and Edge — both reproduced the symptom before the fix, both clear after.
- No other code path depends on `isActive` for default AI rendering; the function signature of `buildAISetupRowHTML()` is unchanged.

---

## Files Changed

- `js/app.js` (–2 lines around 3794 and 3853)
- `style.css` (–4 lines, +8 lines comment at 857–860)
- `js/version.js` (APP_VERSION bump)
- All HTML files — build stamp + cache-bust bump
- All JS files with build headers — build stamp bump
- `style.css` — build stamp bump
- `CHANGELOG.md` (v3.63.17 entry)
- `docs/WaxFrame_Backlog_Master_v75.txt`
