## WaxFrame v3.19.20 Pro — Build `20260422-008`

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
