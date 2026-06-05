# Worker Bees + Builder Screen — Functional Audit

**Audit date:** 2026-06-04
**Scope:** v3.63.145
**Purpose:** Complete inventory of existing functionality on the Worker Bees and Builder setup screens, captured BEFORE the Hive Profiles rework lands. Every element listed here MUST be preserved (or explicitly retired with a documented rationale) in the v3 rework prototype.
**Source files audited:**
- `index.html` lines 152–278 (screen markup)
- `js/app.js` (render functions, handlers, state)
- `js/api.js` (config + model-list infrastructure)
- `style.css` (state classes referenced from these screens)

---

## 1. Worker Bees Screen (`#screen-bees`, Step 1 of 5)

### 1.1 Screen-level controls

Rendered from `renderAISetupGrid()` (app.js:4446) and its helpers `renderHiveModeToggle()` (app.js:4745) + `renderWorkerBeeToolbar()` (app.js:4801).

| Element | DOM target | Visible when | Renderer |
|---|---|---|---|
| Hive mode toggle (Internet ⇄ Server) | `#hiveModeToggleWrap` | always | `renderHiveModeToggle` |
| Mode-aware toolbar (4–5 buttons) | `#beeControlsRow` | always | `renderWorkerBeeToolbar` |
| Hive count chip (X AIs · Y keyed) | `#hiveCountChip` | always | `renderHiveCountChip` |
| AI rows grid | `#aiSetupGrid` | always | `renderAISetupGrid` |
| Continue button (validates → screen-builder) | `#beesContinueBtn` | always | `continueFromBees` |
| Launch requirement chip ("✗ At least 2 AIs set up" → "✓") | `#req-keys` | always | `updateLaunchRequirements` |
| Info modal trigger (ⓘ in section title) | `infoBeesModal` opener | always | inline onclick |

#### 1.1.1 Hive mode toggle

Two radio-style buttons:
- 🌎 **Internet Based AI (Default)** — shows the default 6 + direct-API customs
- 🖥 **Server Based AI** — shows server-imported customs only (Ollama, LM Studio, Open WebUI, Alfredo)

Flipping mode triggers a `wfConfirm` dialog ("Your default AIs will be hidden but not deleted") with `suppressKey: waxframe_suppress_hive_mode_switch_confirm`. On confirm, clears `_expandedAIIds`, clears `_selectedCustomIds`, persists via `saveHive()`, re-renders.

#### 1.1.2 Mode-aware toolbar

**Internet mode (5 buttons):**
1. **API Key Guide** — opens `api-details.html` in new tab
2. **Add Custom AI** — opens `addCustomAIModal` (app.js:5700, `showAddCustomAI`)
3. **Test All Keys** — `testAllKeys()` (app.js:5222), fires each keyed AI's auth probe sequentially
4. **Recommend Models for All** — `recommendModelsForAll()` (app.js:5281), iterates `recheckModelForAI` per keyed AI sequentially with per-row countdown
5. **Get API keys** — `toggleHiveConsoles()` (app.js:5605), opens the slide-up consoles drawer with per-provider key-creation links

**Server mode (3 buttons):**
1. **Import from Model Server** — `showImportServerModal()` (app.js:8213), opens `importServerModal`
2. **Add Custom AI** — same as above
3. **Test All Keys** — same as above

**Both modes also get expand/collapse-all controls** at the right:
- ⊞ Expand all — `expandAllAISetupRows()` (app.js:4662)
- ⊟ Collapse all — `collapseAllAISetupRows`

#### 1.1.3 Bulk select toolbar

Appears via `buildBulkSelectToolbarHTML()` when any custom AI exists. Persistent checkbox bulk-select with "Remove selected" action → `bulkRemoveSelectedAIs()` (app.js:13098). This is the only path to bulk-remove customs.

#### 1.1.4 List grouping

In Internet mode (v3.56.43), the list segments into:
- **"Default providers"** group (alphabetized within)
- **"Custom AIs ⟨N⟩"** group (alphabetized within)

Group labels only render when both groups are non-empty. Server mode is one flat alphabetical list.

`_aiListAlpha()` is the sort helper used everywhere.

### 1.2 Per-row controls (`buildAISetupRowHTML`, app.js:4516)

#### 1.2.1 Collapsed (default) state

- AI icon + name
- Greyed-name class (`is-name-greyed`) when no saved key
- For customs only: bulk-select checkbox (`<input type="checkbox" class="ai-select-check">`)
- Row click toggles expanded state via `_expandedAIIds` Set

#### 1.2.2 Expanded state

Built only when `_expandedAIIds.has(ai.id)` — saves DOM cost on 40-bee hives.

- **API key input** — paste/clear field, validates on save
- **Model selector** — `buildModelSelector()` (app.js:102) custom combobox with ✨ Reviewer + 🔨 Builder badges. Only rendered when `hasKey === true`.
- **Recommend Models button** — fires `recheckModelForAI(id)`. Suppressed in Server mode (closed-network AIs guess from naming, misleading).
- **Manage-account banner** — "Open {Provider} account ↗" link. Renders whenever the AI has an `apiConsole` URL, regardless of key state (v3.35.4 bug fix — pre-v3.31.0 behavior restored).
- **Inline error message** — surfaced when `_invalidKeys.has(ai.id)` after validate-on-save returns non-2xx. Sits in the manage-account banner row (the user's natural next action is to open the console).
- **Inline success message** — symmetric green message when `_validKeys.has(ai.id)`.
- **Delete button** (customs only) — removes the AI entirely (different from key clear).
- **Clear key button** (defaults only) — clears the saved key but keeps the AI in the list.

#### 1.2.3 Row state classes

A row can be in one of these states (mostly handled via the bee-card pattern from the work screen):
- `is-active` — keyed, model picked
- `is-name-greyed` — no key
- (no class) — keyed but no model selected
- Deprecation warning chip — if `window._deprecatedModelFlags` flags the saved model as missing from the live `/v1/models` response

### 1.3 Modals triggered from this screen

| Modal ID | Trigger | Purpose | Renderer |
|---|---|---|---|
| `infoBeesModal` | ⓘ button in section title | Onboarding: what Worker Bees are, how the hive works, cost orientation | static HTML, index.html:2356 |
| `addCustomAIModal` | "Add Custom AI" toolbar button | 4-field form (Name, URL, Key, Icon) to add a custom-endpoint AI | `showAddCustomAI` (app.js:5700) |
| `importServerModal` | "Import from Model Server" (Server mode only) | Quick-pick UI for known model servers (Ollama, LM Studio, Open WebUI, Alfredo) | `showImportServerModal` (app.js:8213) |
| Consoles drawer (slide-up) | "Get API keys" button | One-click links to every provider's key-creation page | `openConsolesDrawer` (api-links.js) |
| `wfConfirm` (generic) | Hive mode toggle, bulk remove, etc. | Confirmation dialogs with optional suppressKey | `wfConfirm` (app.js) |

### 1.4 Background jobs interacting with this screen

- **Deprecation watchdog** (`detectDeprecatedModels`, api.js:~625) — Fires on app load, tab-visible, and round-start. Compares each AI's saved model against the live `/v1/models` response. Flagged models render with a ⚠️ chip in their dropdown.
- **Validate-on-save** (`validateAllSavedKeys`, called from `renderAISetupGrid` on every screen entry) — Fire-and-forget auth probes. Results land asynchronously and re-render the affected row via `renderAIRow(id)`.
- **Slow-responder tracking** (`_slowStreak` per ai.id) — Tracks rounds where a Worker Bee was unusually slow. After N consecutive slow rounds, surfaces a troubleshooting card.
- **Self-healing quarantine** (`isModelIncapable`, `quarantineModel`) — When a model rejects WaxFrame's instruction format (`MODEL_REJECTS_INSTRUCTIONS` or `MODEL_NEEDS_DIFFERENT_ENDPOINT` error codes), it's added to a quarantine list and excluded from future model lists + recommendations.

### 1.5 Continue gate

`continueFromBees()` — proceeds to `screen-builder` only if `activeAIs.length >= 2`. Otherwise updates the launch-requirement chip with the unmet condition.

---

## 2. Builder Screen (`#screen-builder`, Step 2 of 5)

### 2.1 Screen-level controls

Rendered from `renderBuilderPicker()` (app.js:5050) and `renderBuilderScreenModel()` (app.js:5090).

| Element | DOM target | Visible when | Renderer |
|---|---|---|---|
| Builder console primary (selected Builder spotlight + model selector) | `#builderScreenModelWrap` | Once a Builder is selected | `renderBuilderScreenModel` |
| Available Builders roster (chips grid) | `#builderPickGrid` | `activeAIs.length > 0` | `renderBuilderPicker` |
| Continue button | `#builderContinueBtn` | always | `continueFromBuilder` |
| Launch requirement chip ("✗ Builder selected" → "✓") | `#req-builder` | always | `updateLaunchRequirements` |
| Info modal trigger (ⓘ in section title) | `infoBuilderModal` opener | always | inline onclick |
| Gold tip card | inline | always | static markup |

#### 2.1.1 Builder roster chips

One chip per AI in `activeAIs`. Each chip:
- AI icon (resolved via `resolveAiIcon`)
- AI name
- 🔨 checkmark badge if currently selected
- Click → `setBuilder(ai.id)` which updates `builder`, persists, re-renders both the chips AND the primary panel

The grid uses adaptive sizing classes based on `activeAIs.length`: `builder-count-small` (≤3), `medium` (≤6), `normal` (≤9), `dozen` (≤12), `many` (>12). This is purely a CSS sizing hint.

#### 2.1.2 Selected Builder primary panel

The "spotlight" treatment for the chosen Builder:
- Big AI icon (52px via `resolveAiIcon`)
- "🔨 Your Builder" role label
- AI name
- Model selector — **same `buildModelSelector()` combobox used on Worker Bees + Change Builder modal**. Defaults to the cached 🔨 Builder pick from `getBuilderRecommendation(ai.id)`. On change, persists via `wfModelSelectPick → saveModelForAI`.
- Empty-state when no model list is cached: "Run Recommend Models on the Worker Bees screen first, or this Builder will use its provider default."

#### 2.1.3 Builder selection auto-default

If no Builder is selected when `renderBuilderPicker` runs, it picks `_aiListAlpha(activeAIs)[0].id` — the first AI alphabetically. Same fallback fires if the previously-selected Builder is no longer in `activeAIs` (was removed on Worker Bees).

### 2.2 Modals triggered from this screen

| Modal ID | Trigger | Purpose |
|---|---|---|
| `infoBuilderModal` | ⓘ button in section title | Onboarding: what the Builder does, why it uses more tokens than reviewers, paid-tier recommendation |

### 2.3 Continue gate

`continueFromBuilder()` — proceeds to `screen-project` only if `builder` is set to a member of `activeAIs`.

---

## 3. Consolidation Analysis — Can the Builder screen merge into Worker Bees?

David's question from 2026-06-04: *"We can eliminate the builder page if we end up accomplishing everything here it kind of lends itself towards that now."*

### 3.1 What the Builder screen contributes that Worker Bees doesn't currently

| Concept | Currently on Worker Bees? | Currently on Builder? |
|---|---|---|
| Per-AI model selector | YES (in expanded row) | YES (in spotlight) |
| 🔨 Builder pick badge in dropdown | YES (via `buildModelSelector`) | YES (same selector) |
| ✨ Reviewer pick badge in dropdown | YES | YES |
| Adaptive AI sizing | NO | YES (count-based CSS classes) |
| Single-select chip grid (only one chosen) | NO | YES |
| Gold tip card with Builder-specific guidance | NO | YES |
| Paid-tier warning prose | NO | YES (in info modal + tip card) |
| Empty-state guidance ("run Recommend Models first") | NO | YES |

### 3.2 What's *uniquely* hard about the Builder screen

- **Single-select semantics** — exactly one AI is the Builder. The chip grid enforces this visually; a dropdown wouldn't.
- **Spotlight treatment** — the chosen Builder gets a large visual emphasis ("Your Builder") that mirrors the importance of the role.
- **Targeted education** — the prose on this screen ("must have a paid API subscription with enough capacity") is positioned right where the user makes the choice. Moving it elsewhere risks losing it.

### 3.3 Consolidation options

**Option A: Eliminate Builder screen entirely. Builder selection moves to Worker Bees.**

Pros:
- One fewer screen in the setup flow (5 → 4)
- All AI configuration lives in one place — matches the "one front face" goal
- The new Hive Profile dropdown could include Builder as one of the per-row state — every row gets a "🔨 Make this the Builder" toggle

Cons:
- Loses the spotlight treatment
- Builder-specific education has to be folded into Worker Bees info modal (already crowded)
- Single-select enforcement has to happen visually within the Worker Bees row pattern — e.g. a `🔨 Builder` toggle in each expanded row, with only one allowed at a time

**Option B: Keep Builder screen, but minimize it. Move Builder model picking to Worker Bees; this screen just shows "you picked X" as a confirmation step.**

Pros:
- Preserves the education + spotlight
- Reduces the cognitive load of the Builder screen — less to look at
- Users can change Builder from here OR Worker Bees

Cons:
- The "confirmation step" is dangerously close to busywork — users will start blind-clicking through
- Two places to change Builder is one too many — leads to confused state when they don't sync

**Option C: Keep Builder screen as-is.** No change.

Pros:
- No risk of regression
- The current design has been validated through real use

Cons:
- The Hive Profile dropdown on Worker Bees + Builder on a separate screen forces users to context-switch when the choices are related
- Doesn't reduce the setup-flow length

### 3.4 Recommendation

**Option A — eliminate the Builder screen — if the Worker Bees v3 rework can accommodate three changes:**

1. **Per-row 🔨 Builder toggle** in the expanded view, with exactly-one-at-a-time enforcement. Clicking 🔨 on row N un-checks row M's 🔨.
2. **Builder-specific education** folded into the Worker Bees ⓘ info modal as a tabbed or scrollable section, OR surfaced inline on the first row toggled to Builder.
3. **Builder spotlight treatment preserved** — when an AI is the Builder, its row's collapsed state shows a small 🔨 chip next to the name, and its expanded state shows the Builder-only gold-tip prose.

If the v3 design can't preserve those three, fall back to Option B (minimize Builder screen) or Option C (keep as-is).

The audit hasn't surfaced any deal-breaker. **My read: Option A is feasible and the right move, gated on the v3 rework absorbing those three pieces cleanly.**

---

## 4. Requirements Carry-Forward List (the MUST-PRESERVE list for v3)

Everything below MUST exist in the v3 Worker Bees rework, or have an explicit retire-with-rationale decision.

### 4.1 Per-row functionality
- [ ] AI icon + name display (resolving via `resolveAiIcon`)
- [ ] Greyed-name state when no key
- [ ] Collapsed by default, click to expand
- [ ] API key input field (paste, clear, validate-on-save)
- [ ] Manage-account banner with "Open {Provider} account ↗" link when `apiConsole` URL is known
- [ ] Inline error message when key validation fails
- [ ] Inline success message when key validation succeeds
- [ ] Model selector combobox (`buildModelSelector`) with multi-badge support
- [ ] Recommend Models per-row button (suppressed in Server mode)
- [ ] Recommend Models countdown UX (matches `wfBtnElapsed` pattern)
- [ ] Delete button for custom AIs
- [ ] Clear-key button for default AIs
- [ ] Bulk-select checkbox for custom AIs
- [ ] Deprecation warning chip on rows whose saved model is missing from live `/v1/models`
- [ ] Builder-incapable (Jamba etc.) ⚠️ Reviewer-only badge in model dropdown

### 4.2 Screen-level functionality
- [ ] Hive mode toggle (Internet ⇄ Server) with confirmation dialog
- [ ] Mode-aware toolbar (different buttons per mode)
- [ ] API Key Guide link (Internet mode)
- [ ] Add Custom AI modal trigger (both modes)
- [ ] Import from Model Server modal trigger (Server mode)
- [ ] Test All Keys button (both modes)
- [ ] Recommend Models for All button (Internet mode)
- [ ] Get API keys consoles drawer trigger (Internet mode)
- [ ] Expand all / Collapse all controls
- [ ] Bulk-select toolbar when any custom AI exists
- [ ] Bulk-remove selected customs action
- [ ] Hive count chip (X AIs · Y keyed)
- [ ] Continue button with launch-requirement gate (≥2 AIs)
- [ ] ⓘ info modal trigger for the screen

### 4.3 Grouping / sorting
- [ ] **Default providers** group (alphabetized within) — Internet mode
- [ ] **Custom AIs ⟨N⟩** group (alphabetized within) — Internet mode
- [ ] **Server providers** group (alphabetized) — Server mode (currently flat, may want a header here too)
- [ ] Group labels render only when relevant (don't show "Default providers" if there are no customs)

### 4.4 Background jobs
- [ ] Auto-validate keys on screen entry (`validateAllSavedKeys`)
- [ ] Deprecation watchdog (`detectDeprecatedModels`)
- [ ] Slow-responder tracking (continues to function during work-screen rounds)
- [ ] Self-healing quarantine (continues to function)

### 4.5 NEW for v3 (additions on top of existing functionality)
- [ ] 4 tier cards per row (💰 Cheap, ⚖️ Balanced, 🧠 Thinker, ⚡ Fast) with one-click swap to active model
- [ ] 2 role cards per row (✨ Reviewer, 🔨 Builder) — same one-click swap pattern; Builder card uses the Builder Bee mascot as its icon (task #33)
- [ ] **Auto-classify on key save AND on screen load with empty cache** (task #35) — no click-to-classify empty state. Inline indicator during background classification.
- [ ] Verifier badge per tier card (✓ verified / ↻ revised / ? unknown) for the Step 2 Perplexity verification pass
- [ ] "Why each pick" expander with classifier reasoning per pick (all 6, not just the 4 tiers — bug we caught in the prototype)
- [ ] Hive Profile dropdown at the top (Custom / Cheap / Balanced / Heavy thinkers / Speed-first)
- [ ] Profile tag on each row when active profile matches the row's current model (or "🖐 Manual override" tag when it doesn't)
- [ ] Recommend All AIs global button (parallel runner with countdown)
- [ ] Sidecar with icon legend + Jump-to-AI nav + related-page links
- [ ] **Builder consolidation** (task #28's Option A — confirmed): per-row 🔨 Builder toggle with exactly-one-at-a-time enforcement; Builder-specific education in 3 surfaces (inline gold-tip on 🔨-active row + Worker Bees ⓘ modal section + standalone page linked from menu) — task #34
- [ ] **Builder Bee chip on the collapsed row** when that row IS the active Builder (task #33) — instant visual identification of which AI is currently Builder
- [ ] **Server provider group label** ("Server providers" or similar) in Server mode (task #36) — matches Internet mode's group labeling
- [ ] **Documentation sweep** for the Builder consolidation (task #32) — User Manual, API Key Guide, help.html, document-playbooks, README, 3 landing pages, infoMenuModal, infoHowItWorksModal, Welcome screen pitch. Setup step counts change from "of 5" to "of 4."

### 4.6 Constraints
- [ ] No phone-narrow layout (drop sub-1366px breakpoints, page minimum is 1366px wide)
- [ ] Light-mode contrast pass on all emoji icons
- [ ] Provider logos from `images/icon-*.png` (not emoji) in row headers
- [ ] WaxFrame two-card chassis (big card wraps the row list, each row is a little card)
- [ ] Sidebar uses the existing `.doc-layout` / `.doc-sidebar` chassis (matches User Manual + Document Playbooks + Templates Catalog)
- [ ] Sticky toolbar respected when jump-to-AI scrolls — offset by toolbar height
- [ ] Logo centering + tabular-nums on setup-step badge (already shipped v3.63.145)
- [ ] All existing modals (`infoBeesModal`, `addCustomAIModal`, `importServerModal`, `infoBuilderModal` if Option A folds it in) continue to work

---

## 5. Resolved Questions (David's answers 2026-06-04)

| Question | David's answer |
|---|---|
| Confirm Option A for Builder consolidation? | **Yes — proceed.** Eliminate the Builder screen, fold Builder selection into Worker Bees. CRITICAL caveat: must update ALL documentation referencing the 5-step flow (User Manual, API Key Guide, help.html, document-playbooks, README, the 3 landing pages, infoMenuModal, infoHowItWorksModal, Welcome screen pitch). Setup step counts change from "of 5" to "of 4." Captured as task #32. |
| Server provider group label? | **Yes — add one.** Match the "Default providers" / "Custom AIs" labeling pattern from Internet mode. Captured as task #36. |
| Where Builder education lives? | **All three surfaces.** Tiered information architecture — quick (inline gold-tip on the 🔨-active row) + medium (info modal section) + deep (standalone page linked from the nav menu AND from the other two via "Learn more"). Captured as task #34. |
| Empty-state classify — auto or click? | **Always auto.** Even David (building the app) wouldn't know which models map to which tier without the classifier output. Triggers: key save, screen load with empty cache, manual Recommend Models. Cost is ~$0.01 per cycle, negligible. Captured as task #35. |

## 5b. CRITICAL CONSTRAINT (David flagged 2026-06-04)

**Worker Bee + Builder Bee mascot graphics MUST stay prominent.** They're a major brand asset — David's colleagues' first reaction to the site was *"did you get these graphics together too?"* Eliminating the Builder screen removes the Builder Bee's prime real estate (currently the section header on the Builder screen), so we need replacement placement.

**Proposed mascot integration in the v3 rework:**

- **Worker Bee** (`images/WaxFrame_Worker_Bee_v2.png`) — stays in the main section header where it lives today
- **Builder Bee** (`images/WaxFrame_Builder_v3.png`) — becomes the icon for the 🔨 Builder role-card in the new 6-card grid. Prominent display on every expanded row, every Worker Bee in the hive.
- **When a row IS the active Builder** — collapsed row shows a small Builder Bee chip next to the AI name, so users instantly see which AI in their hive is currently the Builder
- **Welcome screen + info modals** — continue to feature both mascots as today

Captured as task #33. **Non-negotiable.**

---

## 6. Audit conclusions

The v3 Worker Bees rework is feasible and the carry-forward list above is the complete requirements set. The Builder screen can plausibly be eliminated (Option A) if the v3 design absorbs three specific pieces (per-row 🔨 toggle, education placement, spotlight treatment for the chosen Builder).

No structural blockers found. The biggest risk is **scope creep** — the carry-forward list has 40+ items spanning per-row, screen-level, grouping, background jobs, and new additions. The right discipline for v3:

- Build to this list, item by item
- Don't add anything not on the list without flagging
- Don't drop anything from the list without explicit retire-with-rationale

**Next action:** v3 prototype build, using this doc as the requirements checklist. Or — given the size of the rework — split into sub-prototypes (per-row v3, then toolbar v3, then modals v3) and integrate.
