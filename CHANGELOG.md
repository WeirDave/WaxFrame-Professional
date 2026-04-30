# WaxFrame Professional — Changelog

---

## v3.27.11 Pro — Build `20260429-031`
**Released:** April 29, 2026

**Builder card laptop shrink — round 2.** v3.27.10 reduced laptop card sizing but not enough — at 1422×811 with devtools open, cards were still consuming too much vertical space. Pulled the laptop sizing further down (~⅔ of v3.27.10 height).

### Change

Same media query as v3.27.10 (`max-width: 1421px, max-height: 900px`), more aggressive numbers:

| | v3.27.10 laptop | v3.27.11 laptop |
|---|---|---|
| Aspect ratio | 2.6 / 1 | 3.2 / 1 |
| Padding | 20px 14px 16px | 14px 12px 12px |
| Inner gap | 10px | 6px |
| Icon | 42px | 32px |
| Name font | 14px | 13px |

Desktop sizing (1422px+ wide AND 900px+ tall) is unchanged.

---

## v3.27.10 Pro — Build `20260429-030`
**Released:** April 29, 2026

**Builder card laptop-mode shrink.** Follow-up to v3.27.9. The 2:1 aspect-ratio worked great at full desktop widths (2510px tested) but at laptop widths (1422px) cards were still too tall — the 56px icons + 28px top padding + 2:1 height meant cards ate too much vertical space, especially with devtools open. The aspect-ratio fix made desktop look right but laptops were stuck with desktop sizing.

### Change

Added a media query at the project's existing laptop threshold (`max-width: 1421px`, `max-height: 900px`) that pulls Builder cards back to a flatter, more compact shape:

- Aspect ratio: `2/1` → `2.6/1` (flatter — less vertical space at constrained widths)
- Padding: `28px 16px 22px` → `20px 14px 16px`
- Inner gap: `14px` → `10px`
- Icon: `56px` → `42px`
- Name font: `15px` → `14px`

At desktop (1422px+ wide AND 900px+ tall) cards keep the v3.27.9 sizing. The breakpoint matches the existing `min-screen-overlay` threshold pattern (`max-width: 1421px, max-height: 810px`) so the responsive boundaries stay aligned across the codebase.

---

## v3.27.9 Pro — Build `20260429-029`
**Released:** April 29, 2026

**Builder card aspect-ratio fix.** Follow-up to v3.27.8. The 3+3 grid landed correctly but the cards stretched only horizontally as the viewport widened — height stayed pinned at the natural content height (~220px), so cards looked progressively letterboxed at desktop widths (each card ~580×220, ratio ~2.6). The shape didn't change with the space.

### Change

Added `aspect-ratio: 2 / 1` to `.builder-pick-grid-large .builder-pick-btn`. Cards now scale proportionally in both dimensions as the grid columns widen — at laptop widths (~470px) cards are ~235px tall, at full desktop (~540px) cards are ~270px tall. Content stays centered (icon + name) via the existing `justify-content: center` and `align-items: center`. Consistent landscape shape at every viewport instead of variable letterboxing.

The `.builder-pick-grid-large` scope keeps the small variant in the change-builder modal unaffected.

---

## v3.27.8 Pro — Build `20260429-028`
**Released:** April 29, 2026

**Project copy expansion + Builder screen polish.** Two coordinated visual fixes for setup screens 2 and 3. The Project section sub gets expanded with an importance lead so users understand to slow down. The Builder picker gets a 3+3 card layout instead of a thin single row, with bigger card sizing, and the existing Builder tip moves into a reusable gold/amber callout enclosure.

### Project page — copy expansion

The Project screen is the most important page in the entire setup. The brief assembled here is what every AI reads at the start of every round of refinement — vague inputs degrade every refinement that follows. Previous copy was a single short sentence that didn't communicate this importance. The bracketing setup screens (Bees, Builder) carry similar paragraph-length guidance — Project deserves at least as much weight.

Section sub now reads:

> **This is the most important page in the whole setup.** This section defines what your project is all about. Every AI sees this information on every round — it's their entire understanding of what you're trying to build. The more specific you are the better your project will be (garbage in, garbage out). A few extra minutes here pays off in every round that follows.
>
> *Fields marked * are required to continue.*

### Builder screen — 3+3 card layout

The Builder picker grid was using `repeat(auto-fill, minmax(175px, 1fr))` which produced a single thin row of cards floating above a large empty band of dark space. Replaced with explicit `repeat(3, 1fr)` so the default 6-AI hive lays out as 3+3 — two balanced rows where each card grows to fill its column at typical desktop widths. Cards feel substantial against the tall amber header band instead of being dwarfed by it. For non-multiple-of-3 hive counts the last row may be partial; that's an acceptable trade for the balanced visual the default 6-AI hive produces.

### Builder screen — bigger cards on the large variant

- Padding `20px 12px 14px` → `28px 16px 22px`
- Provider icon `36px` → `56px`
- Provider name font `13px` → `15px`
- Inner gap `10px` → `14px`

Sizing changes scoped to `.builder-pick-grid-large` only — the small variant used in the change-builder modal retains the previous compact sizing.

### Builder screen — tip in gold callout enclosure

The Builder tip ("Claude, ChatGPT, Gemini, and DeepSeek all handle large documents well…") was a bare italic paragraph using `.fs-col-tip` that read as visual filler. Now wrapped in `.gold-tip-card` — a new reusable amber callout block generalized from the `.dp-real-example` styling used in document-playbooks.html. Same amber background `rgba(245,166,35,0.05)`, 1px amber border `rgba(245,166,35,0.25)`. The tip now reads as official guidance instead of incidental commentary.

The class is reusable — any future guidance copy that should feel official can use `.gold-tip-card` rather than introducing a new variant. Orphan `.fs-col-tip` rule removed (this was its only consumer).

---

## v3.27.7 Pro — Build `20260429-027`
**Released:** April 29, 2026

**Your Project screen restructure.** The screen had grown a redundant secondary header (Project Goal), a duplicate clear button, a word/character counter that wasn't communicating anything actionable, and a bottom tip that referred to internal mechanics rather than user-facing behavior. Restructured into one cohesive screen with a single header bar and a continuous form below it.

### Changes

**1. Project Goal sub-section eliminated.** The "Project Goal" h3 + its description paragraph + the standalone Clear Project row that lived between Version and Document type were all deleted. Project Name, Version, Document type, Target audience, Desired outcome, Scope & constraints, Tone & voice, and Additional instructions now flow as one continuous form below the header.

**2. ⓘ info button moved into the section header next to "Your Project."** Same modal target (`goalInfoModal`), now anchored to the screen-level title rather than the deleted Project Goal sub-heading. Title text reads as the rule it's been all along: "Your Project ⓘ" — click for the brief explanation.

**3. Clear Project button moved into the section header bar.** Was sitting in a standalone row below Version. Now lives at the top-right of the dark header bar, using the previously empty space next to the bee mascot. Visually present without taking up form real estate.

**4. Section sub rewritten.** The header sub now describes the page's purpose and ends with the required-fields cue:

> This section defines what your project is all about. Every AI sees this information on every round. The more specific you are the better your project will be. (Garbage in Garbage out)
>
> *Fields marked * are required to continue.*

**5. Word/character counter bar deleted.** The bar at the bottom of the goal fields surfaced raw counts that didn't communicate anything actionable — only the 300-char trim threshold matters, and the goalRefinePreview panel below already states that fact directly. The bar is gone; the refine preview stays.

**6. ✕ Clear Goal button deleted.** Was redundant with Clear Project — the latter clears name, version, and all goal fields in one operation. The narrower button on the same screen invited the question "what's the difference" without delivering distinct value.

**7. Bottom tip deleted.** The "Document type leads every round and always survives the 300-character trim" tip described internal mechanics that the goalRefinePreview panel already explains in user-facing terms. Removed as redundant.

### Code reconciliation

CSS: removed `.proj-goal-section-hdr`, `.proj-goal-section-title`, `.proj-goal-section-sub`, `.proj-goal-section-hdr + .proj-clear-row`, `.proj-clear-mid-btn`, `.proj-clear-row`, `.proj-clear-row--bottom` (both definitions), `.proj-clear-btn`, `.goal-counter-bar`, `#goalCounter`, `.goal-stat`, `.goal-stat-label`, `.goal-stat-warn`, `.goal-stat-sep`, `.setup-card-tip`. Added `.hp-section-clear-btn` for the relocated Clear Project button (uses `margin-left: auto` and `align-self: flex-start` to right-anchor inside the existing `.hp-section-header` flex container, with no impact on other screens that don't render the button).

JS: removed `clearGoal()` function (zero remaining call sites). Removed dead block in `updateGoalCounter()` that wrote into `#goalCounter`. The function still updates the goalRefinePreview panel and is still wired into all six goal-field `oninput` handlers — the name kept since the function still tracks the 300-char counter threshold that drives the preview.

---

## v3.27.6 Pro — Build `20260429-025`
**Released:** April 29, 2026

**Your Project screen layout fix.** The Your Project setup screen was visually splitting in two: Project Name + Version sat above a horizontal divider line, with Project Goal and the rest of the goal fields below. Reads as two separate cards when it should be one cohesive section — Project Name/Version are metadata that belong directly under the Your Project header, with Project Goal as a sub-grouping inside the same card.

### Changes

**1. Removed `border-top: 1px solid var(--border)` on `.proj-goal-section-hdr`.** That was the divider line. With it gone, the meta row and the goal section flow as one card.

**2. Tightened spacing.** `.proj-meta-row` margin-bottom dropped from 24px to 8px; `.proj-goal-section-hdr` padding-top dropped from 20px to 16px. Combined with the removed divider, the visual gap between Version and the Project Goal sub-header is now natural rather than aggressive.

**3. Simplified the section sub text.** Was: *"Name your project, set a version, then describe what you're building. Fields marked * are required to continue."* Now: *"Fields marked * are required to continue."* The first sentence was procedural fluff that described the layout itself rather than orienting the user.

---

## v3.27.5 Pro — Build `20260429-024`
**Released:** April 29, 2026

**Recommend Models for All + no-auth local server support (Ollama / LM Studio / unauth'd Open WebUI).** Three related fixes that together let the model recommendation flow work without requiring delete-and-re-add, and across the full spectrum of model server auth setups.

### Changes

**1. New "Recommend Models for All" toolbar button on the Bees screen.** Loops `recheckModelForAI` sequentially across every eligible AI (those with a saved key OR a stored `_modelsEndpoint`). Sequential rather than parallel to avoid hammering rate limits on shared endpoints like Alfredo. Per-AI feedback is delegated to the existing per-row toasts and dropdown re-renders; the wrapper manages confirmation, button progress label (`Asking 3/8…`), and a final summary toast. 400ms gap between calls.

**2. `recheckModelForAI` no longer requires an API key when the AI was imported from a model server.** The early-bail guard was rejecting Ollama / LM Studio / unauth'd Open WebUI imports because their `_key` is empty. The new guard accepts `_modelsEndpoint` as a structural marker that the AI is server-imported and may legitimately run without auth. Defaults and customs added via Add Custom AI without a key still require a key. Downstream functions (`fetchModelsFromEndpoint`, `recommendModel`) already handled empty key correctly for OpenAI-format — the early guard was the only blocker.

**3. `headersFn` no longer sends literal `Authorization: Bearer undefined` when key is empty.** Three locations had the same anti-pattern: `addImportServerModels`, `addCustomAI`, and `testCustomAIConnection`. All three now conditionally include the Authorization header only when a key is present. Ollama, LM Studio, and unauth'd Open WebUI tolerate the bogus header today, but stricter implementations or future auth changes could reject it. Aligns with `fetchModelsFromEndpoint` and `recommendModel`, which already gated Authorization on key presence.

### Audit cleanup

Spotted during the per-release audit: `.ref-clear-all-btn` had two unnecessary `!important` declarations on `font-size` and `padding` that were preemptive overcaution. Specificity analysis: `.btn-sm` (line 286) and `.ref-clear-all-btn` (line 7881) both resolve to (0,1,0); since `.ref-clear-all-btn` appears later in the file, source order already gave it the win. Both `!important` flags removed.

### Use case

Renew an Anthropic key six months from now. New Claude models have shipped. Click **Recommend Models for All** on the Bees screen → every keyed AI re-evaluates against its current model list and re-tags the dropdown with ✨ (Best) / ⚡ (Fastest) / 💰 (Budget). No deletion, no re-import.

For Ollama users running without auth: import the server, click Recommend a Model on any row (or use Recommend Models for All) and it now works instead of toasting "no API key".

---

## v3.27.4 Pro — Build `20260429-023`
**Released:** April 29, 2026

**Import from Model Server: capture the Models Endpoint URL and cache the full server model list.** Follow-up to v3.27.3 surfaced from work-side use: imported AIs had a dropdown but it only contained the single model checked at import time, and clicking Recommend a Model on Alfredo (Open WebUI, `/api/...` paths) failed because the model-list URL was being derived from the chat URL with a `/v1/...` regex that doesn't match Open WebUI's URL scheme.

### Three surgical changes

**1. `addImportServerModels` now stores `_modelsEndpoint` on each `API_CONFIGS[id]`.** The Models Endpoint URL was already captured in the modal, validated by `fetchImportServerModels`, and saved to last-used defaults — but it was thrown away before reaching the AI's persistent config. Now it's persisted via `saveHive`'s `customAIConfigs` spread, alongside the chat `endpoint`.

**2. `addImportServerModels` now caches the FULL server model list** (from `_importServerModels`) into `waxframe_models_${id}` for every newly-added AI, instead of caching only `[modelId]`. Each row's dropdown now reflects every model the server offers, not just the one checked at import time. Falls back to `[modelId]` defensively if `_importServerModels` is somehow empty.

**3. `recheckModelForAI` and `fetchModelsFromEndpoint` honor the stored `_modelsEndpoint`.** `fetchModelsFromEndpoint` now accepts a 4th param `explicitModelsEndpoint`. When provided (and format is `openai`), it's used directly instead of the `${base}/v1/models` derivation. Anthropic/Google branches are unchanged — those endpoints are hardcoded and the param is ignored. Backward compatible: customs imported pre-v3.27.4 have `_modelsEndpoint = undefined` and fall through to the legacy derive path exactly as before.

### What you'll see

After importing N models from a server with M total models, each of the N rows shows a dropdown populated with all M models from that server. Clicking Recommend a Model on an Alfredo / Open WebUI import now hits the correct `/api/models` URL (whatever the user entered in the Models Endpoint field) instead of building `/api/chat/completions/v1/models` and 404-ing.

### Migration

AIs imported before v3.27.4 stay on the legacy single-model cache + derived models URL. To get the new full-list-dropdown + working Recommend on Alfredo, delete the existing imported AIs and re-import via Import from Model Server. The Models Endpoint field is already pre-filled from saved last-used defaults if you've imported successfully before.

---

## v3.27.3 Pro — Build `20260429-022`
**Released:** April 29, 2026

**Import from Model Server now gets the Recommend a Model treatment.** Per work-side testing on Alfredo (Open WebUI gateway proxying 38 models): the Import flow itself worked fine — modal fetched, models populated, 33 selected, 5 already-in-hive markers correct. What was missing was the categorized recommendation feature for those imported AIs once they landed in the hive.

### Two surgical changes inside `addImportServerModels`

**1. Store `format: 'openai'` on each `API_CONFIGS[id]`.** `recheckModelForAI`'s custom path reads `cfg.format` to decide which `/v1/models` endpoint scheme to use. Open WebUI / Alfredo / generic model servers are OpenAI-compatible by definition — that's the whole premise of the Import from Model Server flow — so we set this explicitly at add time.

**2. Persist a single-model `waxframe_models_${id}` cache** for each imported AI. Without this, the worker bee row's `buildModelSelector` returned `''` (no model list to render), which meant the dropdown didn't render AND the **Recommend a Model** button didn't render either — same gap that bit Custom AI in v3.27.1, just on the Import path. Now: dropdown renders immediately post-add with at least the imported model. When user clicks Recommend a Model, the existing custom path fetches the full live list from the server (Alfredo's all 38) and the AI returns the categorized 🎯 / ⚡ / 💰 picks.

### What you'll see

After importing N models from Alfredo, each row now shows:

```
Pick a model: [<imported model> ▾]  [Recommend a Model]
```

Click Recommend a Model →

```
Pick a model: [✨ [Base] Claude-4-7-Opus — Best Overall ▾]  [Recommend a Model]
✨ Top reasoning depth across long-context document review tasks.
```

Open the dropdown:

```
✨ [Base] Claude-4-7-Opus — Best Overall
[Base] Gemini-2-5-Pro
⚡ [Base] Gemini-2.5-Flash-Lite — Fastest
💰 [Base] GPT-4o-Mini — Budget
[Base] Claude-4-6-Opus
... (the other 33)
```

### Build sweep

All four canonical stamps bumped to `20260429-022` and `3.27.3`. All six pages bumped on cache-busts.

---

## v3.27.2 Pro — Build `20260429-021`
**Released:** April 29, 2026

**Critical regression fix from v3.27.1.** The custom-AI dropdown disappeared entirely after add. Plus the button-text consistency pass.

### Critical: Custom AI dropdown rendered empty after add

`getModelsForProvider(provider)` reads from `waxframe_models_${provider}` localStorage. For default 6, `fetchModelsForProvider` populates that cache. For custom AIs, NOTHING was writing to that cache at add time. v3.27.1 added a write inside `recheckModelForAI`'s custom path — but that only fires when the user clicks Recommend.

So the gap: between add and first Recommend click, `buildModelSelector` got an empty model list and returned `''` — the dropdown didn't render AT ALL, which also meant the Recommend button didn't render. Custom AI rows showed input + Test button, then nothing where the dropdown belonged.

Fix: `addCustomAI` now persists the modal's fetched model list (the one populated by Fetch Models) to `waxframe_models_${id}` on add. The dropdown renders immediately post-add with the same model list the user just selected from. Clicking Recommend then refreshes that list with a live fetch (existing v3.27.1 behavior, unchanged).

### Button text consistency

| Was | Now |
|---|---|
| `Have AI Recommend` (Worker Bee row) | `Recommend a Model` |
| `🤖 Recommend a model` (Add modal Basic button) | `Recommend a Model` |
| `🤖 Asking…` (loading state, both places) | `Asking…` |

The 🤖 emoji is gone from button labels. Toast messages keep their emoji flair (transient, not chrome).

### Build sweep

All four canonical stamps bumped to `20260429-021` and `3.27.2`. All six pages bumped on cache-busts.

---

## v3.27.1 Pro — Build `20260429-020`
**Released:** April 29, 2026

**Custom AIs now get the full recommend treatment.** Three things bundled into one release:

### 1. Custom AI / Server recommend support

The **Have AI Recommend** button is now rendered on Custom AI rows (Alfredo, self-hosted Open WebUI, anything else with a /v1/models endpoint). Click flow for custom AIs:

1. Re-fetches the live model list from the configured endpoint (same logic the Add modal uses)
2. Filters out non-chat structural variants (embeddings, audio, image-gen, etc.)
3. Calls the recommend pipeline against the full list with `cacheId: custom-${ai.id}`
4. Updates `API_CONFIGS[id].model` to the BEST pick if it changed
5. Re-renders the row with the new dropdown labels (Best Overall + Fastest + Budget tags + WHYs)

Three plumbing changes made this work:

- New helper `fetchModelsFromEndpoint(url, format, key)` extracted from the Add modal's `fetchCustomAIModels` so post-add recheck can reuse the same fetch path
- Custom AI's `format` (openai/anthropic/google) now stored on `API_CONFIGS[id]` at add time so recheck can find it later
- New helper `getCacheIdForAI(aiId)` resolves the right recommend-cache key — `default-${id}` for built-ins, `custom-${id}` for customs. `buildModelSelector` and `saveModelForAI` both use it now

The `!isCustom` gate that previously suppressed the button on Custom AI rows is gone. If the AI has a saved key, it gets the button.

### 2. Drop redundant 🎯 icon on Best Overall pick

The ✨ marker already conveys "this is the recommended pick" — adding 🎯 next to it on the Best Overall row was visual redundancy. Icon map now only carries ⚡ for Fastest and 💰 for Budget. Concatenations like `Fastest · Budget` still show both icons.

### 3. Rename `Best` → `Best Overall`

Cleaner phrasing in the dropdown and the AI's WHY note.

### Build sweep

All four canonical stamps bumped to `20260429-020` and `3.27.1`. All six pages bumped on cache-busts.

---

## v3.27.0 Pro — Build `20260429-019`
**Released:** April 29, 2026

**Three categories instead of four. Icons. Second-click bug fix. WHY wraps to its own line.**

### Categories simplified to BEST / FASTEST / BUDGET

v3.26.8 had four labeled picks (PICK / BUDGET / FAST / CAPABLE). User-driven critique: "Best Overall" and "Most Capable" carried the same meaning once the task was fixed. Both answer "best for the Reviewer task" — there was no useful distinction.

v3.27.0 collapses them:

| Category | Icon | What it answers |
|---|---|---|
| **Best** | 🎯 | Which of your models does the Reviewer task best? (default — gets ✨) |
| **Fastest** | ⚡ | …does it fastest while still producing real reviews? |
| **Budget** | 💰 | …does it cheapest while still producing real reviews? |

Three real tradeoff axes. Everything else collapsed into noise.

### Category icons

Each category prefixes its icon next to the model id in the dropdown so the categorized picks pop visually against the sea of un-tagged models. Concatenations join icons too — a model that's both Fastest and Budget shows as `⚡ 💰 deepseek-chat — Fastest · Budget`.

The ✨ marker continues to denote the active "Best" pick — orthogonal to category icons, not duplicative.

### "Quality floor" framing in the prompt

Both Fastest and Budget now carry the qualifier "that can still produce a useful review." This stops the AI from picking a tiny model that technically runs but produces garbage. It says "give us a real review, just optimize for speed/cost within that constraint."

Full new prompt in `prompt-editor.html` as `recommend_model`. If you've previously customized the prompt, your version still loads — but it's the OLD format that returns PICK/CAPABLE/FAST/BUDGET. Either delete your custom version (falls back to v3.27.0 default) or update it to match BEST/FASTEST/BUDGET.

### Second-click bug fix

`recheckModelForAI` now always re-renders the row after a successful recommend, even when the AI confirms the existing model is still the best pick. Previously the function returned early on `result.model === previousModel`, so the freshly-cached labels stayed in localStorage but didn't surface in the dropdown. Users reported "first click did nothing, second click worked" — the second click wasn't actually a second recommend, it was the first recommend's cache finally rendering after a manual model change forced a re-render.

### WHY note wraps to its own line

The `.model-select-note` styling now uses `flex-basis: 100%` to force the note onto a new line below the dropdown row regardless of WHY length. v3.26.8's `white-space: nowrap` caused short WHYs (Claude) to wrap correctly while long WHYs (ChatGPT) overflowed past the right edge instead. (This fix was originally tagged v3.26.9 but rolled into this release.)

### Build sweep

All four canonical stamps bumped to `20260429-019` and `3.27.0`. All six pages bumped on cache-busts.

---

## v3.26.8 Pro — Build `20260429-017`
**Released:** April 29, 2026

**The dropdown finally tells the truth.** Every static descriptor in `MODEL_LABELS` was a guess about what each model is best at — guesses that drift the moment a provider ships a new tier. v3.26.4 stripped "Recommended" tags, but kept everything else (`Fast`, `Budget`, `Balanced`, `Most Capable`). v3.26.8 strips them all and replaces them with live AI-generated tags.

### The new architecture

When you click **Have AI Recommend**, the AI returns FOUR categorized picks instead of one:

```
PICK: <best overall — gets ✨ + auto-active>
WHY: <one sentence>
BUDGET: <cheapest decent option for review tasks>
BUDGET_WHY: <one sentence>
FAST: <fastest decent option for review tasks>
FAST_WHY: <one sentence>
CAPABLE: <most capable for review tasks regardless of cost>
CAPABLE_WHY: <one sentence>
```

Those four (or fewer if duplicates) become the dropdown tags. Other models in the live list render as bare ids — David's principle: trust what the AI returned, don't guess about the rest.

A model can hold multiple tags. If today's most-capable also happens to be the best overall pick, the dropdown shows `✨ gpt-5.5-pro-2026-04-23 — Best Overall · Most Capable`. The cache stores the labels alongside the pick.

### What you see in the dropdown

```
Pick a model: [✨ gpt-5.5-pro-2026-04-23 — Best Overall · Most Capable    ▾]  [Have AI Recommend]
✨ Latest flagship; strongest writing/reasoning across long contexts.
```

Open the dropdown:

```
✨ gpt-5.5-pro-2026-04-23 — Best Overall · Most Capable
gpt-5.5-mini-2026-04-23 — Budget
gpt-5.4-fast — Fast
gpt-5.4
gpt-5.4-base
gpt-5.4-instruct
gpt-4o-2024-08-06
...
```

The 4 categorized models surface to the top of utility (Best Overall first, then power-users can scan for Budget/Fast/Capable). Switching to one of them updates the note line below to that model's WHY. Switching to an untagged model clears the note line.

### "Pick a model:" label

Added before the dropdown. Makes the relationship explicit — the button is named "Have AI Recommend" so users understand what it does without parsing emoji.

### Fixed dropdown width

All `.model-select` elements now render at exactly `520px`. With the old `min-width: 220px / max-width: 340px` rule, dropdowns sized to their content — so each row's dropdown was a different width and the button + note column never aligned across rows. Fixed-width fixes the rag and gives breathing room for ~70 character model ids with tag annotations.

### Custom WaxFrame confirm modal

Replaced the browser's native `confirm()` dialog (which is unstyleable and feels jarring against the WaxFrame palette) with a Promise-based `wfConfirm(title, message, opts)` that renders a properly styled modal:

- `Reset to Defaults` confirmation
- `Remove "Perplexity" from your hive?` confirmation
- `Hide "X" from the setup list?` confirmation
- `Hide all N default AIs?` confirmation
- `Remove the saved API key for X?` confirmation

Destructive actions (Remove, Delete) get a red-tinted OK button via `{ destructive: true }` option. Cancel keeps the WaxFrame modal language.

### Build sweep

All four canonical stamps bumped to `20260429-017` and `3.26.8`. All six pages bumped on cache-busts.

---

## v3.26.7 Pro — Build `20260429-016`
**Released:** April 29, 2026

**Critical UX bug — eyeball click was indirectly triggering save.** v3.26.6 removed the auto-fire of the recommend pipeline on save, but a deeper interaction bug remained: the input element had two save handlers — `onkeydown` (fires on Enter) AND `onchange` (fires when value has changed AND focus leaves). The `onchange` was dangerous because it created a delayed-fuse pattern.

### The bug

1. User pastes key into Perplexity input. Value changes, but `onchange` doesn't fire yet — focus is still in the input.
2. User clicks the eyeball button to verify the pasted key looks right.
3. Eyeball click moves focus out of the input → `onchange` fires NOW → `saveKeyForAI` runs.
4. From the user's POV, clicking the eyeball saved the key. The row re-renders with full button layout (`✕ Key`, `Test`, `↗`, `🗑`), and the model dropdown appears.
5. **Worse:** the `🗑 Delete` button now sits in the position the eyeball was a moment ago. A reflexive second click to toggle the eyeball off can hit Delete instead.

User feedback verbatim: *"Total UX failure."*

### Fix

Both render paths (initial render and per-row re-render) had:

```html
onkeydown="if(event.key==='Enter'){saveKeyForAI(...);}"
onchange="saveKeyForAI(...)"
```

The `onchange` handler is removed. Save now requires explicit Enter press.

### New flow

1. Paste key → no save, no row re-render
2. Click eyeball → key plaintext flips on, layout stays put
3. Click eyeball again → flips off
4. Hit Enter → key saves, toast confirms, row re-renders to with-key state — but only when the user has explicitly committed

This matches the universal expectation set by the placeholder: `Paste key — Enter to save…`. The placeholder has always told the truth; the code just didn't follow it.

### Build sweep

All four canonical stamps bumped to `20260429-016` and `3.26.7`. All six pages bumped on cache-busts.

---

## v3.26.6 Pro — Build `20260429-015`
**Released:** April 29, 2026

**Stop auto-firing recommend on key save.** UX testing exposed a real interaction problem: when you paste a key and hit Enter, three things kicked off simultaneously — focus blurred, "checking best model…" toast appeared, recommend pipeline ran async, then `renderAIRow` rebuilt the row HTML mid-interaction. Trying to click the eyeball to verify the pasted key was effectively a race against the row tearing itself down.

### What changed

`saveKeyForAI` no longer fires `recommendForDefault` after a key save. Just save the key, render the row once, show a clean `🔑 X key saved` toast. Done.

### What you can still do

- **🤖 Recommend button** on every default-AI row (sits next to the model dropdown) — manual trigger any time
- **Silent first-load migration** runs 1.5s after page load for any keyed default AI without a cached recommendation. Doesn't block any active interaction since it fires before users typically engage with the form.

### Why this is the right call

The principle: **automation that interrupts active user interaction creates more problems than it solves.** The eyeball verification flow (paste → eyeball → confirm → save) is fundamental UX. Anything that runs async during that flow and triggers DOM re-renders breaks it. Manual buttons preserve user agency and predictable timing.

The recommend pipeline architecture is unchanged — only its trigger point moved from "automatic on key save" to "manual on button click."

### Build sweep

All four canonical stamps bumped to `20260429-015` and `3.26.6`. All six pages bumped on cache-busts.

---

## v3.26.5 Pro — Build `20260429-014`
**Released:** April 29, 2026

**Critical fix — saving API keys silently failed after Remove + Reset to Defaults.** Long-standing bug surfaced cleanly during v3.26.x testing. Users who removed a default AI (e.g., Perplexity) and then re-added it via Reset to Defaults could paste a new key, hit Enter, and nothing would save. No toast, no error, just silence.

### Root cause

`removeAI` did `delete API_CONFIGS[id]` for ALL AIs — including default 6. For custom AIs that's correct (the entire config is user-defined). For defaults, the structural config (endpoint, headersFn, bodyFn, extractFn) is hardcoded at module load time. Deleting it destroyed something only a full page reload could restore.

When `resetBeesToDefaults` re-added Perplexity to `aiList`, the structural `API_CONFIGS.perplexity` entry remained missing. `saveKeyForAI` then silently no-op'd:

```js
const cfg = API_CONFIGS[ai.provider];  // undefined
if (cfg) cfg._key = val.trim();        // skipped silently — no toast, no error
saveSettings();
```

That `if (cfg)` guard was eating the failure. Three observed user-reported symptoms — "Enter doesn't save," "eyeball doesn't activate" (no key state to display), "5 with keys instead of 6 after reset" — all explained by this single defect.

### Four-part fix

**1. Snapshot DEFAULT_API_CONFIGS at module load time.** A new `const DEFAULT_API_CONFIGS` captures each default provider's structural config — endpoint, format-specific headers/body/extract functions, label, model. Used by the restoration paths below to recreate destroyed entries without page reload.

**2. `removeAI` keeps structural config for defaults.** For default AIs, only `_key` is cleared. Custom AIs continue to have the full config dropped (correct behavior — they're user-defined). Recommend cache for the provider is also cleared so a re-add starts fresh on the live recommend pipeline.

**3. `resetBeesToDefaults` and `restoreHiddenDefaults` restore structural configs from the snapshot.** Even if a user is somehow already in the broken state from a prior version, hitting Reset to Defaults now self-repairs `API_CONFIGS` from `DEFAULT_API_CONFIGS`.

**4. `saveKeyForAI` self-heals + surfaces failures loudly.** As defense-in-depth, if `cfg` is still undefined when a key save is attempted, `saveKeyForAI` first attempts to restore from the snapshot. If that also fails (truly orphaned config), it now throws a console.error AND shows a toast (`⚠️ X configuration is missing — try Reset to Defaults`) instead of silently doing nothing. No more silent failures.

### What you'll see after upgrade

- Remove Perplexity → Reset to Defaults → paste key → Enter → key saves, recommend fires, model migrates. Behavior matches removing Custom AIs.
- If you're already in the broken state from before v3.26.5, hit Reset to Defaults once. The structural configs auto-restore from the snapshot.
- Any future bug that leaves API_CONFIGS in a partial state will throw a visible error instead of silently failing.

### Cookie warning note

The `__cf_bm` "Partitioned" cookie warning some users see in DevTools is unrelated to WaxFrame code. It's set by Cloudflare on the Claude proxy (`waxframe-claude-proxy.weirdave.workers.dev`) for bot mitigation. Cloudflare will update the cookie's `Partitioned` attribute on their platform schedule. No user-facing functionality affected.

### Build sweep

All four canonical stamps bumped to `20260429-014` and `3.26.5`. All six pages bumped on cache-busts.

---

## v3.26.4 Pro — Build `20260429-013`
**Released:** April 29, 2026

**Stop guessing what's a chat model — let the AI decide.** v3.26.0–v3.26.3 layered increasingly specific regex patterns onto MODEL_FILTERS to filter "non-chat" models from each provider's `/v1/models` response. Real-world testing showed both bugs (Gemini Computer Use breaks recommend; manually-picked models used as askingModel) and a deeper architectural mistake: hardcoded naming heuristics go stale the same way `MODEL_LABELS` did, just slower.

### Architectural shift — structural-only filter

All five filtered providers now share a single regex that catches only models whose API contract fundamentally differs from chat-completion:

```
embed | moderation | whisper | tts | speech | transcribe | rerank | audio
| realtime | guard | dall-e | imagen | imagine | veo | lyria
| stable-diffusion | safety | computer-use | nano-banana
```

Removed: per-provider version prefix requirements (`^gpt-[45]`, `^claude-`, `^gemini-[23]`, `^grok-[0-9]`, `^deepseek-(chat|reasoner)`), legacy-name patterns (`babbage|davinci|curie|ada`), speculative variant exclusions (`live-|native-audio|exp-|vision-beta`), and other naming-pattern heuristics that drift with provider release cadence.

Custom AI's `NON_CHAT_RE` is now an alias of the same shared regex. One source of truth.

The AI receiving the recommend prompt has explicit guidance to skip coding-only, embedding, and specialized variants — and AIs make better calls from a full live list than from our pruned subset. "nano-banana" is Google's image-gen model; no naming pattern catches it, but the AI knows. Trust the AI.

### Stable askingModel from MODEL_FALLBACKS

The recommend pipeline previously used `cfg.model || models[0]` as the courier — the model that carries the recommendation question to the provider's API. If the user manually picked something incompatible with chat completions (Gemini's Computer Use models reject standard calls; Google returns 400), the courier itself failed.

v3.26.4 picks askingModel in this order:
1. First entry of `MODEL_FALLBACKS[provider]` that's actually in the live candidate list (curated as known-good chat models)
2. `cfg.model` if it's in the candidate list
3. First model in the list (last resort)

This means even if you manually pick a Gemini Computer Use model for testing, hitting Recheck still works — because we courier the question through `gemini-2.5-flash`, not your weird test pick.

### MODEL_LABELS — strip "Recommended" tags

Static labels like `gpt-4.1 — Recommended · Fast` and `claude-sonnet-4-6 — Recommended` were hardcoded for a world without the live recommend pipeline. Now they conflict with whatever the AI actually picked. Stripped:

| Was | Now |
|---|---|
| `Recommended · Fast` | `Fast` |
| `Recommended · Budget` | `Budget` |
| `Recommended` (alone) | `Balanced` |

Static labels are pure descriptors now. Live recommendation is the source of truth for "what's recommended."

### ✨ marker on the live-recommended model

`buildModelSelector` reads the cached recommendation (`waxframe_recommend_default-{provider}`, set by recommendForDefault on key save / migration / Recheck) and prefixes the matching dropdown option with `✨`:

```
gpt-4.1 — Fast
gpt-4.1-mini — Budget
✨ gpt-5.4-pro-2026-04-23 — Latest · Most Capable
gpt-5.4 — Latest · Most Capable
```

The marker moves dynamically. If Recheck switches the recommendation to a different model, the ✨ moves there on next render. The note line under the dropdown also changes — when current model matches the recommendation, the note shows the WHY from the recommend call (e.g., `✨ latest flagship with strong reasoning`) instead of the static descriptor.

### Build sweep

All four canonical stamps bumped to `20260429-013` and `3.26.4`. All six pages bumped on cache-busts.

---

## v3.26.3 Pro — Build `20260429-012`
**Released:** April 29, 2026

**Recheck UX cleanup + Gemini auth fix + better diagnostics.** v3.26.1/v3.26.2 left two real problems: the Recheck button looked identical to the Test button (different action, same visual treatment, easy to confuse), and Gemini recheck calls were silently failing because the recommend pipeline used query-string auth that didn't always match the production review flow's behavior.

### Recheck button moved + renamed

The button moved from the API key row down to the model selector row — where it actually belongs conceptually. Test validates the API key, the new button changes which model is selected. Putting them on the same row was visually confusing.

Renamed from **🤖 Recheck** to **🤖 Recommend** to match the Custom AI flow's language. Same word, same emoji, same intent. Tooltip updated to "Ask the provider's API which of its models is best for WaxFrame."

### Gemini auth — switched to x-goog-api-key header

The recommend pipeline was using `?key=KEY` query-string auth for Google. The production review flow uses `x-goog-api-key` header auth. These behave differently across API tiers and have different CORS implications. v3.26.3 switches the recommend call to use the header method, matching production exactly.

This is the most likely root cause of David's "Gemini Recheck does nothing" report. If a regression remains, the new diagnostics (below) will surface the actual HTTP status.

### Force-fresh BOTH caches on Recheck

Previously Recheck cleared only the recommendation cache (`waxframe_recommend_default-{provider}`) but left the models cache (`waxframe_models_{provider}`, 7-day TTL) alone. If the models cache was stale, the candidate list passed to the recommend call was stale too. v3.26.3 clears both so Recheck always sends fresh data.

### Differentiated outcome toasts

Recheck now distinguishes three outcomes instead of two:

| Outcome | Toast |
|---|---|
| Model changed | `✨ ChatGPT: switched to gpt-X — <why>` |
| Same model returned | `✓ ChatGPT: gpt-X — already the recommended pick. <why>` |
| Failed | `⚠️ ChatGPT: couldn't get a recommendation — model unchanged. Open DevTools console for the raw response.` |

Without the "already the recommended pick" path, users seeing no dropdown change would assume the call failed. Now success without change is its own clear state.

### Always-log diagnostics

Every Recheck completion now writes a structured `console.info('[recheck] <name>:', { previous, result, cleared })` line. Plus on HTTP failure: `console.warn('[recommend] HTTP <status> <statusText> from <url> — body: <first 500 chars>')`. DevTools tells the full story unambiguously.

### Build sweep

All four canonical stamps bumped to `20260429-012` and `3.26.3`. All six pages bumped on cache-busts.

---

## v3.26.2 Pro — Build `20260429-011`
**Released:** April 29, 2026

**Recommend pipeline now includes Perplexity.** v3.26.1 migration ran clean for ChatGPT, Claude, DeepSeek, Gemini, and Grok — but skipped Perplexity entirely because Perplexity's API doesn't expose a `/v1/models` endpoint. The recheck button also wasn't drawn for Perplexity rows.

### Root cause

Three places in v3.26.1 gated on `MODEL_FILTERS[provider] !== null` to decide whether to run the recommend pipeline. Perplexity has `MODEL_FILTERS.perplexity = null` because it lacks a dynamic models endpoint. Result: Perplexity was excluded from migration, recheck button rendering, and key-save recommend trigger.

### The fix

Perplexity has chat completions just fine — it just doesn't have a list-models endpoint. Since we already maintain a hardcoded `MODEL_FALLBACKS.perplexity` list (`sonar-pro`, `sonar-reasoning-pro`, `sonar-reasoning`, `sonar-deep-research`, `sonar`), we can feed that list as the candidate set and let Perplexity itself pick which one is best.

`recommendForDefault` now falls back to `MODEL_FALLBACKS[provider]` when `fetchModelsForProvider` returns null. Three gating sites — both `renderAIRow` paths, `migrateRecommendOnStartup`, and `saveKeyForAI` — relaxed from `MODEL_FILTERS !== null` to `(MODEL_FILTERS !== null || MODEL_FALLBACKS?.length > 0)`. Any provider with either a dynamic endpoint or a hardcoded fallback list now participates.

### What you'll see

After upgrading, Perplexity's row gets a 🤖 Recheck button next to Test like the other 5 defaults. The first-load migration won't re-fire (it's once-per-session and already ran), so to migrate Perplexity right away, click Recheck on its row. Future page loads will include Perplexity in the migration pass automatically.

### Build sweep

All four canonical stamps bumped to `20260429-011` and `3.26.2`. Comment-header build stamps in `app.js` and `style.css` synced. All six pages bumped on cache-busts.

---

## v3.26.1 Pro — Build `20260429-010`
**Released:** April 29, 2026

**v3.26.0 follow-up patch.** Three real bugs and one cold-start gap surfaced within minutes of v3.26.0 going live. All fixed.

### Bug — Custom AI Model row layout collapsed when aids were added

v3.26.0 packed Fetch Models, 🤖 Recommend, and Help me choose into the same flexbox as the model dropdown. With four flex children competing for horizontal space, the dropdown got squeezed to a few pixels — unreadable. v3.26.1 moves the two decision aids onto their own row below the model field via a new `.custom-ai-model-aids` container.

### Bug — Aids visible too early, out of order

Both aids previously appeared before the user clicked Fetch Models. With nothing fetched, the user had to guess the right order. v3.26.1 hides BOTH aids until after Fetch Models populates the dropdown. This makes the workflow strictly linear: paste URL → Fetch Models → optionally Recommend or Browse.

### Bug / UX — "Help me choose" didn't read as external

Renamed to **↗ Browse models on website** with the standard external-link arrow prefix. Tooltip clarifies "Open this provider's model catalog in a new browser tab." Now visually unambiguous.

### Gap — Existing users got nothing from v3.26.0

The recommend pipeline only fired from `saveKeyForAI`, which means it only ran when the user pasted a NEW key. Anyone who already had keys saved from a prior version saw zero behavior change. v3.26.1 closes this two ways:

**Per-row 🤖 Recheck button** — sits next to the Test button on every default AI row that has a saved key. Click → force-fresh recommend call (cache cleared) → toast shows the new pick. Manual control for power users who want to refresh on demand.

**Silent first-load migration** — runs once per session, 1.5 seconds after the app loads. For each default AI with a saved key but no cached recommendation, fires `recommendForDefault` in parallel. Updates models silently and surfaces a single combined toast at the end (`✨ Updated N models to current provider recommendations`). Runs only once per session via `window._waxframeMigrationRan` flag. After the migration, subsequent loads do nothing — the cached recommendations are good for 24 hours.

### Improved feedback on Custom AI Recommend button

User reported "I clicked Recommend and nothing happened." Root cause was a too-subtle loading state. Fixes:

- Button now reads `🤖 Asking…` while in flight (was just `🤖 Asking…` plain text)
- Dropdown now disables while in flight so the user sees something change
- Pre-call toast surfaces which model is being asked: `🤖 Asking gpt-4o for a recommendation…`
- Failure toast longer and more specific: `⚠️ No clean recommendation — provider may not have followed the format. Pick manually or check console for details.`
- Console logs the raw response on parse failure so users can debug provider-specific quirks

### Build sweep

All four canonical stamps bumped to `20260429-010` and `3.26.1`. Comment-header build stamps in `app.js` and `style.css` synced. All six pages bumped on cache-busts.

---

## v3.26.0 Pro — Build `20260429-009`
**Released:** April 29, 2026

**Recommend Model pipeline.** Architectural shift: every Add AI path — both the default 6 (ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity) and Custom AI — now asks the provider's own API which of its models to use. Hardcoded `MODEL_LABELS` / `MODEL_FALLBACKS` demoted to safety net. Solves the staleness and ghost-model problem permanently.

### Why this change

`MODEL_LABELS` and `MODEL_FALLBACKS` were the source of truth for "which model is the right default for provider X." That model goes stale every time a provider releases a new flagship, and ghosts like `gpt-5.4` accumulate when models get renamed or deprecated. The fix: stop pretending we know more about a provider's catalog than the provider does. Delegate the question to whichever AI you're adding.

### How it works

A new `recommendModel({ cacheId, endpoint, format, key, models, askingModel })` function constructs a structured prompt using `{MODEL_LIST}` substitution, fires it at the provider's API using `askingModel` (one of the fetched models, used to ask the question), parses a strict `PICK:` / `WHY:` reply, validates that PICK is in the fetched list (rejects hallucinations), and caches the result for 24 hours keyed by `cacheId`.

Two wrappers consume it:

**`recommendForDefault(provider)`** — fired from `saveKeyForAI` after the user pastes an API key for any of the default 6. Background-fetches `/v1/models`, runs the recommend call, swaps `API_CONFIGS[provider].model` to the recommendation if successful. Toast shows the WHY. Falls back silently to existing model if anything in the chain fails — air-gap-safe and graceful.

**`recommendCustomAIModel()`** — onclick handler for a new 🤖 Recommend button in the Custom AI flow. User hits Fetch Models, then Recommend. Autofills the dropdown with the pick and surfaces the WHY in a toast. Confirmation happens through the existing Test Connection / Add to Hive flow.

### Custom AI flow — basic / advanced labeling

The Recommend button (basic) sits next to the Help me choose link (advanced) below the model field. Both visible only when relevant:

- **🤖 Recommend** — visible after Fetch Models populates the dropdown (needs models to ask about). Green "basic" badge.
- **Help me choose** — visible when a Quick Add preset is active (needs a `chooseModelLink` URL). Purple "advanced" badge.

Two paths for two user types: people who want the AI to decide click Recommend, people who want to research themselves click the link.

### Prompt transparency

The recommendation prompt is exposed in `prompt-editor.html` as `recommend_model`. Power users can edit it freely — the `{MODEL_LIST}` placeholder is the only required token; everything else is open. Default prompt lives in `MODEL_RECOMMENDATION_PROMPT_DEFAULT` in `app.js` and is kept in sync with the prompt-editor `DEFAULTS.recommend_model` entry.

### Cache + cost

Cache TTL: 24 hours, keyed by `cacheId`:
- Default 6: `default-{provider}` (e.g., `default-chatgpt`)
- Custom AI: trailing-slash-stripped URL

Adding three slots of the same provider on the same day = one recommend call total. Recommend calls cost roughly $0.0001 each (one chat completion, ~200 tokens) — absorbed silently.

### Defense-in-depth

Every link in the chain has a graceful failure mode:
- `/v1/models` fetch fails → `MODEL_FALLBACKS[provider]` still has reasonable defaults
- Recommend call fails (network, 401, malformed response) → existing `cfg.model` preserved
- Recommend returns a hallucinated model not in the list → rejected with a `console.warn`, existing `cfg.model` preserved
- User can override the recommendation anytime via the existing model selector dropdown

`MODEL_LABELS` / `MODEL_FALLBACKS` aren't going away — they're the safety net. Demoted, not deleted.

### Build sweep

All four canonical stamps bumped to `20260429-009` and `3.26.0`. Comment-header build stamps in `app.js` and `style.css` synced. All six pages — `index.html` plus the five helper pages — bumped on `style.css?v=` and `version.js?v=` cache-busts. `index.html` also bumped on `app.js?v=`, `pdf.min.js?v=`, `mammoth.browser.min.js?v=`, `jszip.min.js?v=`, `xlsx.full.min.js?v=`.

No prompt envelope changes. No session schema changes. No working console changes.

---

## v3.25.7 Pro — Build `20260429-008`
**Released:** April 29, 2026

**Custom AI UX completion pass.** Two small features that finish stories started in the v3.25.5/v3.25.6 run. The "Help me choose" link infrastructure laid down in v3.25.6 finally surfaces in the UI, and the Quick Add preset dropdown now shows users which providers are already in their hive — closing the matching parallel to the fetched-models marker that shipped in v3.25.5.

### "Help me choose" link wired into Custom AI flow

The `chooseModelLink` field added to every `QUICK_ADD_PROVIDERS` entry in v3.25.6 was sitting unused. v3.25.7 ships it:

| Quick Add preset | Help me choose link |
|---|---|
| Mistral | `https://docs.mistral.ai/getting-started/models/models_overview/` |
| Together AI | `https://docs.together.ai/docs/serverless-models` |
| Cohere | `https://docs.cohere.com/docs/models` |
| Ollama | `https://ollama.com/library` |
| LM Studio | `https://lmstudio.ai/docs/basics/download-model` |

A new `<a id="customAIChooseModelLink">` element sits to the right of the Fetch Models button. New helper `updateChooseModelLink()` reads the URL field, runs it through `getActivePreset()`, and toggles the `.is-visible` class plus `href` based on the result.

The link is visible only when the URL matches a known Quick Add preset that declares a `chooseModelLink`. Manually editing the URL off-preset hides the link automatically — `getActivePreset()` is the single source of truth for "is the user currently in a known preset" and the link rides that signal. No extra state to track.

Hooked into three call sites: `applyQuickAdd()` (preset selection), the URL input's `oninput` handler (manual URL edit), and `showAddCustomAI()` (modal open with stale state).

Opens in a new tab with `rel="noopener noreferrer"` so the WaxFrame tab is never replaced.

### Quick Add preset dropdown — already-in-hive markers

Closes the second half of the #11 story. v3.25.5 added "✓ already in your hive" markers to the **fetched models dropdown** (matching by endpoint URL + model ID — exact duplicates disabled). v3.25.7 adds the same kind of marker to the **Quick Add preset dropdown** itself (matching by endpoint URL only — provider-level awareness, not model-level).

New helper `populateQuickAddOptions()` reads the current `aiList`, normalizes endpoint URLs (trailing-slash stripped), and decorates each Quick Add `<option>` element with a `✓ already in your hive` suffix when the preset's URL matches any AI already in the hive.

Original option labels are cached on `data-base-label` on first decorate so the suffix can be cleanly reapplied or removed without label drift on subsequent modal opens.

Critical UX choice: **options stay enabled, not disabled.** Adding multiple models from the same provider is a valid flow — for example, configuring both `mistral-large-latest` and `mistral-medium-latest` from the same Mistral endpoint as separate AI cards. The marker informs without blocking. This differs from the fetched-models dropdown where exact model+endpoint duplicates ARE blocked, since adding the literal same model twice has no purpose.

Hooked into `showAddCustomAI()` so the markers always reflect the current hive state when the modal opens. After a successful add, the modal closes; on next open, decoration runs fresh.

### Build sweep

All four canonical stamp locations bumped to `20260429-008` and `3.25.7`. Comment-header build stamps in `app.js` and `style.css` synced (had drifted to `20260427-013` over recent releases — fixed). All six pages — `index.html` plus the five helper pages — bumped on `style.css?v=` and `version.js?v=` cache-busts. `index.html` also bumped on `app.js?v=`, `pdf.min.js?v=`, `mammoth.browser.min.js?v=`, `jszip.min.js?v=`, `xlsx.full.min.js?v=`. Helper-page comment-header `Build:` stamps and `<meta name="waxframe-build">` content all swept.

No changes to prompt envelope, session schema, backup format, or working console. Surgical Custom AI flow only.

---

## v3.25.6 Pro — Build `20260429-007`
**Released:** April 29, 2026

**Custom AI flow gets smarter about model selection.** Three small fixes to the Add Custom AI dropdown that close the "I added Mistral and got `codestral-2508` selected by default" footgun. Plus an unrelated default-provider filter fix that was leaking transcribe-only models into the hive.

### Non-chat models filtered out of Custom AI dropdown

`fetchCustomAIModels` now filters fetched models through a new `NON_CHAT_RE` constant before rendering the dropdown. The pattern catches embeddings, moderation, speech-to-text, text-to-speech, audio, real-time, reranking, image generation, safety/guard, and content-filter models — none of which are valid as Hive reviewers (they error or produce non-chat output). Match is case-insensitive substring.

This kills `mistral-embed`, `mistral-embed-2312`, `codestral-embed`, `codestral-embed-2505`, anything with `whisper` / `tts` / `transcribe` / `dall-e` / `imagen` / `veo` / `lyria` / `stable-diffusion` in the model ID. Provider-agnostic — works the same for Mistral, Together, Cohere, Ollama, LM Studio, internal gateways, anything OpenAI-compatible.

If after filtering there are zero valid chat models, the fetch errors out cleanly with a clear message instead of presenting an empty dropdown.

### Smart default per Quick Add preset

`QUICK_ADD_PROVIDERS` now carries a `defaultModel` field on each preset that has a clear flagship:

| Preset | Default model |
|---|---|
| Mistral | `mistral-large-latest` |
| Together AI | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| Cohere | `command-r-plus` |
| Ollama (local) | none — depends on what user has installed |
| LM Studio (local) | none — same reason |

After Fetch Models completes, `fetchCustomAIModels` calls a new helper `getActivePreset(url)` that matches the user's current URL field against `QUICK_ADD_PROVIDERS` (trailing-slash normalized). If the URL matches a preset AND that preset declares a `defaultModel` AND the model is in the fetched list AND it isn't already in the user's hive, that model is auto-selected instead of the alphabetical first.

The match-by-URL approach means no state to track — if the user picks a preset and then manually edits the URL, `getActivePreset` returns null and the preset's default no longer applies. Self-consistent.

If the preset's declared default isn't in the fetched list (e.g., model was renamed or deprecated), the code falls back to the alphabetical first available model — same as before. No hard error, no breakage.

### Toast feedback expanded

The post-fetch toast now distinguishes more cases. Order is most-informative first:

| Scenario | Toast |
|---|---|
| All loaded fresh, no preset | `✅ N loaded` |
| Some already in hive | `✅ N loaded · M already in hive` |
| Some non-chat filtered | `✅ N loaded · K non-chat skipped` |
| Preset default applied | `✅ N loaded · default: <model-id>` |
| All combined | `✅ N loaded · M already in hive · K non-chat skipped · default: <model-id>` |
| All already in hive | `⚠️ All N models from this endpoint are already in your hive` (6s) |
| Zero chat models after filter | thrown error: `No chat-compatible models returned` |

### Bonus: `transcribe` added to default chatgpt MODEL_FILTERS

Caught during the recon for this release: `MODEL_FILTERS.chatgpt` was excluding `audio | realtime | image | tts | whisper | embed | ...` but **not** `transcribe`. That meant `gpt-4o-transcribe`, `gpt-4o-transcribe-diarize`, `gpt-4o-mini-transcribe`, `gpt-4o-mini-transcribe-2025-03-20`, `gpt-4o-mini-transcribe-2025-12-15` all leaked into the default-provider dropdown for OpenAI keys. They're speech-to-text models and would error out hard if a user picked one as a reviewer. Single-word fix added to the existing regex.

### What did not change

- The 6 default providers' model lists (`MODEL_FALLBACKS`) and curated tags/notes (`MODEL_LABELS`) — untouched. The staleness problem there is still open and will be addressed in items #10 + #13.
- `chooseModelLink` field added to each `QUICK_ADD_PROVIDERS` entry but **not yet wired into the UI**. Plumbing is in place for a "Help me choose" link below the model dropdown when a Quick Add preset is active — surface in a future release if it earns its place.
- `addCustomAI`, `testCustomAIConnection`, the modal layout, and the existing #11 already-in-hive markers — all unchanged.

### Build-stamp sweep

Full sweep across all required locations: 4 main-app stamps + 5 supplementary `index.html` cache-busts + 5 helper-page meta `waxframe-build` stamps + comment-header `Build:` stamps + `style.css?v=` + `version.js?v=` cache-busts. All consistent at `20260429-007` / `3.25.6`. Verified zero stragglers via grep across all 9 code files.

---

## v3.25.5 Pro — Build `20260429-006`
**Released:** April 29, 2026

**Welcome-screen ⓘ pattern + Custom AI flow keeps already-added models visible.** Two unrelated UX gaps closed in a single small release. Welcome screen finally gets the section-info ⓘ pattern that every Setup screen has shipped since v3.21.0, and the Add Custom AI fetched-models dropdown stops silently re-listing models that are already in the hive.

### Welcome-screen ⓘ pattern (item #12)

The welcome screen had zero info buttons before this release, while every Setup-screen section title (Worker Bees, Builder, Project Goal, Reference Material, Starting Document) has shipped them for nearly a year. Two new ⓘ buttons added on the welcome screen, both inline:

- **Pitch paragraph ⓘ** — placed at the end of the existing welcome pitch copy. Opens `#infoWelcomeHowModal` titled **How the Hive Works**, covering: Reviewers vs Builder roles, what a round actually does, typical convergence (5–20 rounds), the convergence-from-scratch principle, and the Notes vs Reference Material distinction. Closes with the locking-text-by-quoting tip.
- **Menu hint ⓘ** — placed at the end of the "New here? Open the Menu…" hint paragraph. Opens `#infoWelcomeMenuModal` titled **What's in the Menu**, covering every menu drawer item: User Manual, API Key Guide, Document Playbooks, What Are Tokens?, Prompt Editor, License & Account.

Both modals reuse the established `.finish-modal-overlay` + `.goal-info-modal` markup pattern shared with `infoBeesModal` and the rest of the family — zero new modal CSS, just markup. They live next to the worker-bees / builder info modals in the modals block so the family stays co-located.

Skipped: the theme-toggle row. Three labeled buttons (Light / Auto / Dark) are self-explanatory enough that adding a fourth ⓘ icon would clutter the row without buying clarity.

### Custom AI fetched-models marker (item #11)

`fetchCustomAIModels` previously rendered every fetched model as a plain `<option>` regardless of whether that exact model was already added to the hive at the same chat-completions endpoint. Re-fetching from a known endpoint (e.g. an internal gateway, an OpenAI-compatible provider) registered as "wait, where's the model I added yesterday?" — the same pattern problem that `renderImportServerChecklist` solved for the bulk import flow back in v3.21.x.

Now: already-in-hive models stay visible in the dropdown but render as `<option disabled>` prefixed with `✓` and suffixed with `— already in your hive`. Browsers default to selecting the first `<option>` regardless of disabled state, so the code now also auto-selects the first non-disabled model so the field always shows a usable value out of the gate.

Match comparison is endpoint URL plus model ID, with trailing-slash normalization on the URL — so `https://endpoint.example/v1/chat/completions` and `https://endpoint.example/v1/chat/completions/` register as the same endpoint.

### Toast feedback after Fetch Models

- All new models: `✅ N models loaded` (unchanged)
- Some already in hive: `✅ N new · M already in your hive`
- All already in hive: `⚠️ All N models from this endpoint are already in your hive` (6s duration)

### Why now

Welcome screen: the page promises "many minds, one refined result" with no immediate way to learn what that means without committing to clicking "Let's get started". Every other onboarding surface in the app has had this affordance for a year. Closes the gap.

Custom AI fetch: the single-model add flow was lagging the bulk-import flow on a UX pattern that's already proven. This release brings them into parity for the most common Alfredo / Open WebUI / Ollama re-import scenario.

### Styling

`.welcome-info-inline` is the one new CSS rule — scoped to welcome-screen ⓘ buttons. Sized 22×22 px (vs the default 36×36 px `.info-btn-img-lg`) and vertical-aligned `-5px` so it sits cleanly inline with the 15px pitch and menu-hint paragraphs without overpowering the body text.

### What did not change

- Default `.goal-info-btn` and `.info-btn-img-lg` rules used elsewhere — untouched.
- `renderImportServerChecklist` (the bulk import flow) — already had this behavior since v3.21.x; reused as the pattern reference, no code change.
- `addCustomAI`, `testCustomAIConnection`, the Add Custom AI modal layout/fields — untouched.
- `MODEL_LABELS` / `MODEL_FALLBACKS` and items #10, #13 — deliberately deferred to a separate release. Bundling architectural model-fetching work with cosmetic UI cleanups would have made both harder to review and roll back.

### Build-stamp sweep

Full sweep across all required locations: 4 main-app stamp locations (`meta waxframe-build`, `APP_VERSION`, `BUILD` const, `app.js?v=` cache-bust) plus all 5 helper-page meta `waxframe-build` stamps + comment-header `Build:` stamps + `style.css?v=` + `version.js?v=` cache-busts. All locations now consistent at `20260429-006` / `3.25.5`. Verified zero stragglers via straight grep across all 6 HTML files.

---

## v3.25.4 Pro — Build `20260429-005`
**Released:** April 29, 2026

**Reference card position numbers.** Adds a small position chip between the up/down arrows on each reference card showing its current position in the list (1, 2, 3…). The chip auto-updates whenever cards are reordered or removed, so the cause-and-effect is immediate — click the up arrow, the number next to it decreases. The position matters because first-listed reference material reads as most-authoritative to the hive in the prompt envelope; until now that ordering was implicit (geographic only) and required reading the user manual to understand. Now the UI teaches itself.

### What changed

- **`refCardMarkup(doc, index)`** now builds a `positionLabel` variable that renders as a `<span class="ref-card-position">` containing `${index + 1}`. It's only rendered when `total > 1` — single-doc lists have no meaningful ordering, matching the existing pattern where the up/down arrows are also hidden in that case.
- **Placement** — the position chip lives between the up and down arrows in the `.ref-card-actions` flex row (markup order: `${upBtn}${positionLabel}${downBtn}`). Tightly couples the visual to the action that changes it. Since `renderReferenceCards()` rebuilds the list on every reorder, the numbers re-render automatically with no extra wiring.
- **Tooltip on the chip** — `Position N of M — first-listed material reads as most authoritative to The Hive. Use the arrows to reorder.` Surfaces the authority-weighting concept without forcing it into the user manual.
- **Edge cases** — first card has no up arrow (`<empty>` `1` `↓`); last card has no down arrow (`↑` `N` `<empty>`). Single-card lists show no chip and no arrows. All consistent with the existing reorder-arrow rendering rules.

### Styling

`.ref-card-position` is small (22×22 px minimum, 6 px horizontal padding), accent-tinted background, accent-colored text, no border (so it doesn't compete visually with the actual buttons). `font-variant-numeric: tabular-nums` keeps multi-digit numbers (10, 11, 12…) from shifting button alignment as they roll over.

### Why now

David's original feedback: numbering exists "where you click up or down and you move them up or down it changes the number" — and the goal is foolproofness without expanding the user manual. Putting the number between the arrows is exactly that pattern: the action and its effect sit in the same visual neighborhood. No documentation needed.

### What did not change

- All other reference card behavior — naming, char/word/token counters, remove, drag-drop, paste vs upload distinction — untouched.
- Setup 5 (Starting Document) — untouched.
- File processing logic, sheet picker, drag-and-drop wiring — untouched.

### Build-stamp sweep

All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=`, `version.js?v=`, `app.js?v=`, and `lib/*.js?v=` cache-busts swept to `20260429-005` / `3.25.4`.

---

## v3.25.3 Pro — Build `20260429-004`
**Released:** April 29, 2026

**Reference Material — confirmation modal, Clear All, copy cleanup.** Replaces the native browser `confirm()` dialog that fired when removing reference docs (and clearing all of them) with a proper WaxFrame-styled modal. Adds a Clear All button to Setup 4 (it had only existed on the work-screen drawer before). Folds in the queued Setup 4 footer copy fix from memory + a parallel drawer-subtitle fix surfaced during this work.

### Native confirm() → WaxFrame-styled modal

The previous `confirm()` dialog showed an OS-styled popup with `weirdave.github.io` in the header and unstyled buttons — visually jarring against the rest of the app. Worse, the body copy ("This wipes the field but does not affect past rounds") was both stale single-doc language ("the field" — there hasn't been a singular field since v3.24.0 made Reference Material multi-doc) and contextually nonsensical pre-launch (mentioning "past rounds" on Setup 4 of a fresh project, before any rounds have been run, was confusing rather than helpful).

The new modal (`#refConfirmModal`) reuses the existing `.finish-modal-overlay` + `.round-error-modal` pattern shared with `discardConfirmModal`, so the visual treatment matches the rest of the app — same dashed-border styling, same Cancel/destructive-action button layout, same backdrop blur. Three new helpers handle the flow:

- `showRefConfirm({ title, body, okLabel, onConfirm })` — opens the modal with parameterized text and stores the pending action
- `closeRefConfirmModal()` — closes and clears the pending action
- `executeRefConfirm()` — runs the pending action and closes (called by the OK button)

### Context-aware confirmation copy

Both `removeReferenceDoc(id)` and `clearAllReferenceMaterial()` now check `history.length > 0` to decide which message to show:

- **Pre-launch (no rounds run yet):** simple, plain message — `Remove "Anduril_RFP.xlsx → Instructions"?` or `This removes all 7 reference documents. You can re-add them anytime.` The past-rounds caveat is omitted because there are no past rounds to caveat against — mentioning them only created confusion.
- **Post-launch (rounds exist):** full warning — `Remove "X"? Past rounds keep their original snapshot — this only affects the next round forward.` The caveat is included only when it's actually relevant to the user's situation.

The empty/near-empty doc shortcut (≤20 chars of content) still removes silently with no confirmation, which prevents nag-popups when the user is just clearing out a paste card they haven't typed in yet.

### Clear All button on Setup 4

`clearAllReferenceMaterial()` was already wired into the work-screen reference drawer (visible mid-session) but had no Setup 4 counterpart. Users on Setup 4 with multiple imported docs had to click the X on each card individually — friction at exactly the moment when bulk action is most useful (after an Excel ingest creates 5+ cards from a multi-sheet workbook). The new button lives at the right end of the counter row (`#refClearAllSetup`), small and subtle, hidden via `is-hidden` class when there are zero docs (so it doesn't clutter the empty state). Hover state shifts color to the warn-yellow accent. Visibility toggled inside `updateRefGrandTotals()` alongside the other count-driven UI updates.

### Copy fixes

- Setup 4 footer hint (`.ref-optional-hint`): `Skip this step if your project does not need source material to cite against.` → `Skip this step if your project has no source material for The Hive to reference.` Matches the v3.25.1 phrasing standard. Was queued in memory for the next code change.
- Work-screen drawer subtitle (`.notes-drawer-sub`): `Source material the hive cites against every round but never edits.` → `Source material The Hive will reference on every round but never edit.` Same phrasing-standard alignment. Surfaced during this audit.
- Confirmation copy: dropped `wipes the field` (stale single-doc language) entirely. Action verbs are now plain English (`remove`, `clear`).

### What did not change

- Setup 5 (Starting Document) — untouched.
- File processing logic, sheet picker, drag-and-drop wiring — untouched.
- All other native `confirm()` calls in the app (license removal, API key removal) — out of scope; same treatment can be applied later if desired.
- Empty-doc removal still silent (no confirmation) — preserved behavior.

### Build-stamp sweep

All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=`, `version.js?v=`, `app.js?v=`, and `lib/*.js?v=` cache-busts swept to `20260429-004` / `3.25.3`.

---

## v3.25.2 Pro — Build `20260429-003`
**Released:** April 29, 2026

**Setup 4 layout overhaul + copy cleanup.** Restructures the Reference Material screen so the action area lives ABOVE the cards list (consistent with how it worked pre-multi-doc) instead of below it where v3.24.0 had moved it. Replaces the awkward inline button row + invisible-until-hover dropzone with two compact dashed-border panels side-by-side, mirroring Setup 5's `.drop-zone` visual language but smaller. Drops several pieces of bad copy ("paste-text card") flagged as not-human-language.

### Layout — action panels above, cards below

The previous layout (counter row → cards → action row at bottom) caused the action controls to drift further down the page as cards were added. The new layout (counter row → action row → cards) keeps the action controls in a stable position; cards stack downward from below them. Matches the pre-multi-doc mental model and respects laptop viewport space.

### Action panels — two compact drop-zone-style targets

Replaces the old single-row layout (two buttons + small italic hint dropzone) with a 2-column grid of drop-zone-style panels:

- **Left panel — `📋 Paste Text`** — clicking adds a new editable reference and the user pastes content into the textarea that appears in the cards list below.
- **Right panel — `📚 Upload File`** — clicking opens the file picker. Drag-and-drop targets this panel directly. Subtext lists supported formats inline (Word, PDF, PowerPoint, Excel, .txt, .md).

Both panels have a **permanent dashed border** (2px dashed `--border2`, ~130px tall, ~50% width each on the standard layout) so the drop affordance is visible at all times, not just during drag-over. Hover and dragover both transition the border to `--accent` and the background to `--accent-dim`. Mirrors Setup 5's `.drop-zone` pattern exactly — same icon-above-text-above-subtext layout, same transitions, same color tokens — but compact and split into two columns.

### Copy cleanup

- **Empty state simplified** — `No reference material yet. Add a paste-text card or upload a file below.` → `No reference material yet.` Both the HTML initial state and the JS-rendered state in `renderReferenceCards()` updated.
- **Drawer button label** — `+ Add Paste-Text Reference` → `+ Paste Text Reference`
- **Drawer empty state** — `No reference material yet. Add a paste-text card below.` → `No reference material yet.`
- **Info modal** — `Add as many reference cards as you need — paste-text cards alongside uploaded-file cards.` → `Add as many references as you need — paste your own text or upload files.`
- **User manual Setup 4 section** — updated button labels to reflect new panel layout (`+ Add Paste-Text Reference` → `📋 Paste Text`, `📄 Upload File as Reference` → `📚 Upload File`); changed "Two buttons below the card list" to "Two action panels above the reference list".

### Why this changed

Two rounds of feedback converged here. First was the v3.25.1 drag-and-drop fix, which addressed a functional bug (handlers on the wrong element) but left the underlying layout problem in place — drop zone was still inside a row at the bottom of the page, and the affordance was still visually quiet. Second was a separate observation that "paste-text card" isn't language anyone would actually say out loud. The right fix was to step back from the inline-row pattern entirely and reuse Setup 5's drop-zone treatment, which already works and is already familiar to users from the Starting Document upload step. Consistency over innovation.

### What did not change

- Setup 5 (Starting Document) drag-and-drop and layout — untouched.
- File processing logic (`processRefFile`, `extractFromFile`, all extractors), accepted file types, sheet picker modal flow — untouched.
- Drawer (work-screen Reference panel) layout — untouched. The drawer is paste-only and its single-button layout is appropriate; only the button label was tweaked.
- All drag-and-drop event handlers (`handleRefDragEnter`, `handleRefDragOver`, `handleRefDragLeave`, `handleRefFileDrop`) — they target `#refDropRow` which is now the right action panel; no code change required.

### Build-stamp sweep

All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=`, `version.js?v=`, `app.js?v=`, and `lib/*.js?v=` cache-busts swept to `20260429-003` / `3.25.2`.

---

## v3.25.1 Pro — Build `20260429-002`
**Released:** April 29, 2026

**Setup 4 drag-and-drop fix.** The drag-and-drop file-upload affordance on Setup 4 (Reference Material) was effectively non-functional in v3.25.0 and earlier. The drop handlers (`ondragover`, `ondrop`) were attached to the inner `.ref-add-dropzone` div — a small italic-text hint between the two action buttons — rather than to the visible `.ref-add-row` container that users actually saw and aimed at. Dropping a file onto the buttons (the largest visible target in the row) triggered the browser's default file-handling behavior (opening the file in a new tab) because no handler called `preventDefault()` for that area. The dropzone hint also had a `border: 1px dashed transparent` style that made it invisible until mid-drag, removing any visual cue that drops were even possible.

This release moves the drag-and-drop handlers to the outer `.ref-add-row` div so the entire row is the drop target — the dashed border that already wraps the row now correctly signals what it has always implied. The state-management bug where moving the cursor across child buttons inside the row would flicker the `.drag-over` class on and off (because `dragleave` fires on every internal element boundary) is fixed via a counter pattern that increments on `dragenter` and decrements on `dragleave`, only removing the visual state when the counter reaches zero.

### What changed

- **`index.html`** — drag-and-drop handlers moved from the inner `#refDropZone` div onto the outer `.ref-add-row`, which gains `id="refDropRow"`. New `ondragenter` and `ondragleave` handlers added; `ondragover` retained but now only calls `preventDefault()` and sets `dropEffect = 'copy'` (it no longer manipulates classes — the enter/leave handlers do).
- **`app.js`** — new `handleRefDragEnter` and `handleRefDragLeave` functions added. `handleRefDragOver` simplified to just `preventDefault()` plus `dropEffect`. `handleRefFileDrop` resets the drag counter on completion. New module-level `_refDragCounter` integer tracks enter/leave events to handle the dragleave-on-child-element flicker correctly.
- **`style.css`** — `.ref-add-dropzone.drag-over` styling moved to `.ref-add-row.drag-over` so the entire row gets the visual feedback. The inner hint label gets `pointer-events: none` so it does not interfere with drag events on its parent. Inner-hint color/style still updates as a child selector (`.ref-add-row.drag-over .ref-add-dropzone`) for the existing "italic gray → bold accent" transition.

### What did not change

- Setup 5 (Starting Document) drag-and-drop was already wired correctly — handlers were on the visible `.drop-zone` element. Untouched.
- File processing logic (`processRefFile`), accepted file types, and the sheet picker modal flow all behave identically. This is a pure event-routing + visual-affordance fix.

### Build-stamp sweep

All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=`, `version.js?v=`, `app.js?v=`, and `lib/*.js?v=` cache-busts swept to `20260429-002` / `3.25.1`.

---

## v3.25.0 Pro — Build `20260429-001`
**Released:** April 29, 2026

**Unified file ingestion + Excel support + full-fidelity extraction.** The biggest restructuring of file handling since the original PDF support landed. Four self-hosted libraries replace the CDN dependencies that broke air-gap deployments. All four extractors (PDF, DOCX, PPTX, plus the new XLSX) rewritten to capture the maximum recoverable content from each format — not just raw text. The Starting Document handler and the Reference Material handler now share a single `extractFromFile` core, eliminating ~70% of the previous duplication. Vision provider list expanded from {ChatGPT, Gemini} to {ChatGPT, Claude, Gemini, Grok} for OCR routing.

### New: Excel workbook ingestion (.xlsx, .xlsm)

- **SheetJS Community Edition full build** (~950KB, Apache 2.0) self-hosted in `/lib/`. The full build (not the mini build) is required because the higher-fidelity bar needs access to merged-cell metadata, cell comments, defined names, and per-sheet hidden-state flags.
- **Sheet picker modal** appears for workbooks with 2+ visible sheets. Each row shows the sheet name, cell count, and an estimated token count so users can make informed selections before ingesting. Hidden sheets are surfaced via count and name list with no option to include — `Workbook.Sheets[].Hidden` flag is respected.
- **Mode-aware behavior** — Reference Material upload uses `multi` mode where each selected sheet becomes its own independent ref doc with its own card, name, and token chip (leverages the v3.24.0 multi-doc architecture). Starting Document upload uses `single` mode where selected sheets concatenate into one combined doc with `## Sheet:` H2 dividers.
- **Conversion fidelity** — formulas evaluated to displayed values via `raw: false` (preserves `$1,250.00`, `15%`, formatted dates), merged cells flattened by repeating the top-left value across the merge span, leading/trailing empty rows and columns trimmed aggressively, cell comments captured as a per-sheet footer section, and workbook-level defined names surfaced as a glossary header.
- **Provenance line** — every Excel-derived doc starts with an italic note describing what was preserved and what was skipped (formulas evaluated, merged cells flattened, hidden sheets skipped, cell formatting/colors not preserved). Visible to both the user (in the doc card) and the hive (in the prompt envelope) so AIs know they're looking at a flattened representation.
- **Wide-sheet warning** — sheets with >15 columns prepend a warning that markdown table comprehension by AIs may degrade past that width. No hard cap; respects the project's "no caps" stance while preventing silent quality issues.

### Self-hosted libraries — air-gap support

The four file-format libraries previously lazy-loaded from `cdnjs.cloudflare.com` are now self-hosted in `/lib/` and boot-loaded via `<script src>` tags in `index.html`. Total ~3.1MB added to first-load:
- `lib/pdf.min.js` + `lib/pdf.worker.min.js` (PDF.js 3.11.174, Apache 2.0)
- `lib/mammoth.browser.min.js` (Mammoth 1.6.0, BSD-2-Clause)
- `lib/jszip.min.js` (JSZip 3.10.1, MIT)
- `lib/xlsx.full.min.js` (SheetJS CE 0.20.3, Apache 2.0)

Defense-network and other air-gapped deployments now work end-to-end with no CDN reach-back. Boot-load (vs. lazy) means every subsequent file import is instant — no first-import latency. The PDF.js worker is configured to load from `lib/pdf.worker.min.js` once per session via `window.pdfjsLib.GlobalWorkerOptions.workerSrc`.

### PDF — full-fidelity extraction

Previously: position-aware text + scanned-PDF vision fallback. Now adds:
- **Document outline (TOC)** via `pdf.getOutline()` — heading hierarchy is no longer lost. Rendered as a `## Document Outline` section at the top of the extracted text with bullet indentation reflecting nesting depth.
- **Form field values** via `pdf.getFieldObjects()` — fillable PDFs (AcroForm) had their field values silently dropped before. Now appended as a `## Form Fields` section listing each named field and its current value.
- **Annotations** via `page.getAnnotations()` — sticky notes, highlights with comments, and other text annotations are inlined as `[Note on page N (subtype): contents]` markers at the page where they appear.
- **Table detection and conversion** — contiguous spans of 3+ lines with consistent column X-positions are detected as tables and emitted as markdown tables instead of being collapsed into space-separated text. Column tolerance ±6 units; minimum 2 columns to qualify.
- **Heuristic OCR pass for sparse pages** — pages with <200 chars of extracted text in an otherwise text-rich document are rendered to JPEG and OCR'd via the user's vision-capable AI. Catches the common "screenshot of a table embedded in an otherwise text PDF" case that previously dropped silently. Additive — original text is preserved, OCR'd content appended as `## OCR Pass (sparse pages: N, M)`. Skipped with a warning if no vision AI is available.

### DOCX — full-fidelity extraction

Switched from `mammoth.extractRawText` (which dropped all structure) to `mammoth.convertToMarkdown` which preserves headings, lists, tables, bold/italic. Then JSZip-based direct XML parsing adds:
- **Comments** from `word/comments.xml` — author + comment text per entry, appended as `## Comments`
- **Footnotes** from `word/footnotes.xml` — numbered, with built-in separator/continuation pseudo-footnotes filtered out, appended as `## Footnotes`
- **Endnotes** from `word/endnotes.xml` — same treatment as footnotes, appended as `## Endnotes`
- **Headers and footers** from `word/header*.xml` / `word/footer*.xml` — deduplicated (boilerplate appears once), appended as `## Headers & Footers`
- **Text boxes** from `<w:txbxContent>` in `word/document.xml` — Mammoth flagged but didn't extract these; now captured directly, appended as `## Text Boxes`
- **Track-change handling** — `<w:ins>` content is preserved (treats inserted text as accepted), `<w:del>` content is dropped (treats deletions as accepted). Matches typical reading intent for documents shared mid-review.

### PPTX — full-fidelity extraction

Replaced the fragile `<a:t[^>]*>([^<]*)</a:t>` regex with a proper `DOMParser` walk. Adds:
- **Speaker notes** from `ppt/notesSlides/notesSlide{N}.xml` — captured per slide and rendered as `**Speaker notes:** ...` directly under the slide section. Auto-generated slide-number placeholders are filtered out. For decks where the substantive content lives in notes (common in technical and sales decks), this is the difference between a useful import and a useless one.
- **Title vs. body separation** — placeholder type `title` and `ctrTitle` are detected and the title text becomes the slide section heading (`## Slide N: Title`) instead of getting lost in the body content stream.
- **Embedded tables** — `<a:tbl>` blocks are converted to markdown tables instead of being flattened to space-separated runs. Column count taken from the first row; pipe characters in cell content are escaped.
- **SmartArt diagrams** — text content from `ppt/diagrams/data*.xml` `<dgm:pt>` nodes is captured and appended as `## SmartArt Diagrams`.
- **Chart data labels** — chart titles, category labels, and series names from `ppt/charts/chart*.xml` are extracted and appended as `## Charts`.

### Vision provider expansion

The OCR routing previously hardcoded `['chatgpt', 'gemini']` even though Claude has supported vision since Claude 3 (early 2024) and Grok has supported it across the 2.x and 4.x lines. Now the `VISION_PROVIDERS` list is `['chatgpt', 'claude', 'gemini', 'grok']` and `runVisionTranscription` has per-provider request bodies for each:
- **ChatGPT** — GPT-4o via `/v1/chat/completions` with `image_url` content blocks.
- **Claude** — current Builder model (Sonnet/Opus 4 family) via the WaxFrame proxy with `image` source/base64 content blocks. Required for users whose only vision-capable key is Anthropic.
- **Gemini** — current Builder model (1.5+) via `:generateContent` with `inline_data` parts.
- **Grok** — current Builder model via OpenAI-compatible `/v1/chat/completions` with `image_url` content blocks (xAI mirrors the OpenAI shape).

A new `getVisionCapableAI()` helper centralizes the lookup logic; both initial PDF OCR and the work-screen Re-extract button use it. Users with a Claude or Grok key but no ChatGPT/Gemini key can now use vision OCR — previously they were stuck with garbled text and a misleading "add a ChatGPT or Gemini key" warning.

### Architectural consolidation

- **`extractFromFile(file, options)`** — single shared core that knows nothing about UI. Sniffs extension, dispatches to the appropriate extractor, returns `Array<{text, warnings, sourceType, suggestedName}>`. Single-result extractors (txt, md, pdf, docx, pptx) return one-element arrays for symmetry; XLSX may return N elements (one per selected sheet in `multi` mode).
- **`processFile`** (Starting Document) and **`processRefFile`** (Reference Material) collapsed to thin UI wrappers around `extractFromFile`. Each handles its own status pill, doc-array vs. docText assignment, and save logic — but the entire extension-routing / extractor-dispatch / warning-aggregation block is shared.
- **Backward compatibility** — return shape and warning semantics for all existing call sites are preserved. No history-format change. No backup-format change. No prompt-envelope change.

### File `.accept` extension

Both file inputs (`#fileInput` and `#refFileInput`) extend `accept` from `.docx,.pdf,.pptx,.txt,.md` to `.docx,.pdf,.pptx,.txt,.md,.xlsx,.xlsm`. Drop-zone copy unchanged.

### User manual

Setup 5 file-format paragraph rewritten to explicitly enumerate what each format extracts and what's deliberately skipped. Setup 4 Reference Material paragraph adds Excel mention. Sets correct expectations and serves as the canonical reference for the deficiencies disclosure.

### Build-stamp sweep

All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=` and `version.js?v=` cache-busts swept to `20260429-001` / `3.25.0`.

---

## v3.24.1 Pro — Build `20260428-008`
**Released:** April 28, 2026

**Setup 4 mascot — Reference Bee.** Setup 4 (Reference Material) was the only Setup screen without a mascot in its section header. This release adds the Reference Bee (`WaxFrame_Reference_Bee_v1.png`) to the H1 row, mirroring the Worker Bee on Setup 1, the Project Bee on Setup 2 and Setup 3, and the Project Bee on Setup 5. With v3.24.0's multi-document upgrade, Reference Material is now a first-class concept that earns its own mascot identity rather than living under the generic "no bee" `is-bare` header variant. No behavioral change; visual consistency across the Setup flow.

### Setup 4 H1 — Reference Bee added

- **Markup change** — the `.hp-section-header` on Setup 4 (Reference Material) loses the `is-bare` modifier and gains an `<img class="hp-section-bee">` referencing `WaxFrame_Reference_Bee_v1.png`. Same structural pattern as Setup 1, 2, 3, and 5.
- **No new CSS needed** — `.hp-section-bee` and `.hp-section-header` (without `is-bare`) styles already exist from prior Setup screens. The bee size, gap, and alignment match the other Setup screens automatically.
- **Asset prerequisite** — `images/WaxFrame_Reference_Bee_v1.png` must be present in the repo `images/` folder. Filename matches the Reference Bee asset Kai or the design pipeline produced.

### Build-stamp sweep

- All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=` and `version.js?v=` cache-busts swept to `20260428-008` / `3.24.1`.

---

## v3.24.0 Pro — Build `20260428-007`
**Released:** April 28, 2026

**Reference Material — multi-document support.** The v3.21.0–v3.23.4 single-doc model (one `refMaterial` string + one `refFilename` string) becomes a true multi-document system. Users can now add unlimited reference documents — RFP requirements alongside scoring rubrics, style guides alongside brand voice references, etc. Each doc is independently named, ordered, removable, and editable. The hive sees them in array order with labeled section headers in the prompt envelope so AIs can cite specific documents by name. Full v3-format backup migration on restore. No data loss for existing users.

### Storage shape

- **`referenceDocs` array** replaces the `refMaterial` + `refFilename` string pair. Each entry is `{id, name, text, source: 'upload'|'paste', filename}`. Source `'upload'` makes the textarea read-only with the original filename as the source-of-truth; source `'paste'` makes it editable; remove and re-upload to replace an uploaded doc.
- **Stable per-doc IDs** generated via `generateRefDocId()` — base36 timestamp + 5-char random suffix. Session-local uniqueness only, not globally unique by design (no cross-project collision concerns since each project loads its own array).
- **`generateRefDocId`, `buildReferenceMaterialBlock`, `snapshotReferenceDocs`, `getTotalReferenceText`, `hasReferenceMaterial`** — five new helpers replacing direct string manipulation throughout the codebase.

### Backup format v3 → v4

- **`p.referenceDocs`** array stored in project save format. Older `p.referenceMaterial` string + `p.referenceFilename` string fields removed from new saves.
- **v3 backup migration on restore** in `loadProject()`. If `p.referenceDocs` is an array, restored as-is (with field defaults filled in for any malformed entries). Otherwise if `p.referenceMaterial` is a non-empty string, converted to a single-element array preserving filename if present, defaulting to `'Reference 1'` if pasted-text. Otherwise empty array. Existing v3-format backups continue to restore correctly with no data loss.
- **Dead `refTab` state variable removed** — was a single-doc tab toggle (Upload File / Paste Text) that doesn't apply to the multi-doc UI. Removed from declaration, `saveProject` write, `loadProject` restore, and `clearProject` wipe.

### Setup 4 (Reference Material) UI

- **Stacked-cards layout** replaces the single Upload-File / Paste-Text tabbed panel. Each card has a header with source badge, inline-editable name field, ↑↓ reorder arrows (when multiple docs exist), and ✕ remove button. Body shows the editable textarea (paste-text source) or read-only filename status (upload source).
- **"+ Add Paste-Text Reference"** button creates a new empty paste-text card. Cards auto-save via `saveProject()` on every keystroke through `updateReferenceDocText()`.
- **"📄 Upload File as Reference"** button opens the same file picker that drag-and-drop uses. Uploaded files become read-only cards with the filename pinned to the source-of-truth field.
- **Counter row at the top** shows total chars / words / token estimate across all docs combined, plus a doc-count chip ("3 docs"). Soft-warning band appears when total tokens cross ~150,000 — a non-blocking heads-up that some AI models have smaller context windows.
- **Reorder rationale** — array order = prompt-envelope order. Earlier-positioned docs receive different attention weighting in the model's context, so users can move the most important reference to the top without re-uploading. Uses ↑↓ arrow buttons rather than drag-and-drop for simplicity and zero accessibility concerns on this desktop-only app.

### Work-screen drawer (mid-session edit)

- **Reference button on work toolbar** opens the same multi-card UI as Setup 4 but in drawer form. Users can add new paste-text reference docs mid-session; uploads are restricted to Setup 4 to keep the drawer footprint tight.
- **Auto-save on every keystroke** — no Save button needed. The drawer's old "💾 Save & Close" replaced with simple "✓ Close." Old per-textarea save flow retired since each card auto-saves to its own array entry.
- **"Copy All" and "Clear All"** preserve the existing convenience verbs but now act on the entire `referenceDocs` array. Clear All requires confirmation and only wipes the live array — past rounds' history snapshots are unaffected.

### Prompt envelope changes

- **`buildReferenceMaterialBlock(sep)`** generates the labeled multi-doc block. Single-doc setups behave like v3.21.0 (one block, no extra label). Multi-doc setups get a count-line preamble ("3 reference documents follow, each labeled with its name. Cite the specific document by name when relevant.") followed by per-doc sections with `## Reference: {name}` headers. Empty docs are filtered out automatically.
- **Both `buildPromptForAI` callsites migrated** to call `buildReferenceMaterialBlock` instead of inlining the old single-doc block. Identical envelope structure as v3.21.0 when a user has only one doc; meaningful new structure when they have many.

### History capture

- **`referenceMaterialAtRound: snapshotReferenceDocs()`** at all 7 history-write callsites. Was previously a string; now an array of doc snapshots so historical rounds can show "what reference material existed at that point in time" rather than just one concatenated dump.
- **`snapshotReferenceDocs()`** returns a shallow-deep copy (each doc spread into a new object) so subsequent edits to the live `referenceDocs` array don't mutate historical entries.

### Soft-warning threshold

- **150,000 token total threshold** triggers a non-blocking amber warning band on Setup 4 and the work-screen drawer when total reference material exceeds it. Respects the user's stated "no caps — pay for the tokens if you want to" stance while preventing the cryptic-failure modes that come from silently busting model context windows.
- **No hard limit** on document count, per-doc size, or total size. Users with massive budgets can pile in as much as they want.

### Removed legacy code

- All `refMaterial` and `refFilename` direct usages eliminated from the codebase (only the documentation comment in the multi-doc block header retains the names for migration-history context).
- `refTab` state variable + 4 references removed.
- Dead-code paths in `clearProject` referencing IDs that no longer exist in markup (`refPasteText`, `refFileClearRow`, `refTabHint`, `.doc-tab` / `.doc-tab-panel` queryAll) removed. Replaced with clean multi-doc reset.

### Build-stamp sweep

- All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=` and `version.js?v=` cache-busts swept to `20260428-007` / `3.24.0`.

---

## v3.23.4 Pro — Build `20260428-006`
**Released:** April 28, 2026

**Global text-selection contrast fix + Import from Model Server "already in hive" markers.** Two unrelated UX fixes shipped together because each was small and surgical. First, the browser's default cyan selection highlight in dark mode produced unreadable contrast against the muted gray text in the Notes panel and elsewhere — a global `::selection` rule using the brand accent color now guarantees readable selection in every theme. Second, the Import from Model Server flow used to silently filter out models already in the user's hive, leading to "wait, where's the model I added yesterday?" confusion when re-importing — those models now render as visually distinct, non-interactive rows with a green "Already in your hive" badge instead.

### Global text-selection styling

- **New global `::selection` rule** added to `style.css` near the BASE block. Uses `var(--accent)` as background with explicit text color (`#0a0c12` in dark mode, `#ffffff` in light mode) — same pattern the working-document textarea has had since earlier releases, just now applied page-wide.
- **Existing `.work-doc-ta::selection` rules left intact** — they have higher specificity and continue to take precedence on the working document, where the same visual outcome happens to be the result.
- **Trigger** — visible in the Notes panel sub-text and elsewhere where browser-default selection produced cyan-on-muted-gray text in dark mode. Fixed everywhere with one rule.

### Import from Model Server — keep already-in-hive models visible

- **`renderImportServerChecklist` refactored** to render ALL models from the fetched list, not just available ones. Previously the function filtered in-hive models out entirely, leaving users wondering whether the import had failed when their previously-imported models didn't appear.
- **In-hive rows render with a disabled checkbox** and a green "✓ Already in your hive" badge in place of the nickname input. Row gets `.import-server-item--in-hive` modifier class for the dimmed, non-interactive treatment (`opacity: 0.55`, no hover background, default cursor on label and checkbox).
- **`_importAvailableCount` and `_importInHiveCount` math preserved** exactly — the footer "Add N to Hive" button and the "X available · Y selected · Z already in hive" count line all show the right numbers without further changes.
- **`importServerSelectAll` and `importServerSelectNone`** scoped to `.import-server-check:not(:disabled)` — bulk-toggle no longer affects the disabled in-hive rows. Without this, calling Select All would have bumped the count incorrectly and could have produced ghost selections that the import-confirm path would then ignore (since only `:checked` enabled rows get imported). Cleaner to just exclude them from toggle entirely.
- **Confirm-import flow unchanged** — uses `.import-server-check:checked` to identify selections. Disabled checkboxes are not checked by default, so they never enter the import path. Behavioral parity with v3.23.3.

### CSS additions

- **`.import-server-item--in-hive`** — opacity dim, default cursor, no hover background.
- **`.import-server-in-hive-badge`** — green-themed pill (`var(--green)` border + text, `var(--green-dim)` background) with the same sizing and font-weight pattern as the existing orphan `.import-server-item-badge` styling.

### Build-stamp sweep

- All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=` and `version.js?v=` cache-busts swept to `20260428-006` / `3.23.4`.

---

## v3.23.3 Pro — Build `20260428-005`
**Released:** April 28, 2026

**Mute button color-state indicator.** The unmuted/muted state on the work-screen mute button was previously communicated via the speaker glyph alone (🔊 vs 🔇), with both states sharing similar transparent or amber-tinted button chrome. At button size the slash on the muted glyph was hard to read at a glance — the button required attention to determine state. This release replaces glyph-as-signal with color-as-signal, matching industry convention (Zoom, Teams, Discord all do this).

### Mute button — green default, red when muted

- **Default state (sounds on)** — button is now green-tinted: `background: var(--green-dim)`, `border-color: var(--green)`, `color: var(--green)`. Hover inverts to solid green with bg-color text.
- **Muted state (`.is-muted`)** — button is now red-tinted: `background: var(--red-dim)`, `border-color: var(--red)`, `color: var(--red)`. Hover inverts to solid red.
- **Hover overrides scoped to `.mute-btn:hover:not(.is-muted)`** so the inherited `.theme-opt:hover:not(.active)` amber treatment doesn't bleed into the mute button's hover state. Specificity matches the inherited rule (0,3,0); source order resolves to the mute-specific rule winning.
- **Speaker icons (🔊 / 🔇) preserved** as secondary visual reinforcement. Color carries the primary signal now; the glyph reinforces it for users who notice both.
- **Tokens used (`--green`, `--green-dim`, `--red`, `--red-dim`)** are theme-aware in both light and dark mode — light-mode `--green` got cleaned up in v3.23.0, so the contrast is good in both themes without further tuning.
- **Why the visual asymmetry vs. theme toggles is intentional** — the mute button is a binary state indicator, not a multi-state radio selector. Auto/Dark/Light theme toggles share visual weight because they're alternatives in a group; mute stands alone as a discrete on/off control. Distinct visual treatment reinforces the distinction in control type.

### Build-stamp sweep

- All four required stamp locations + all 6 helper-page comment-header builds + all 6 helper-page `style.css?v=` and `version.js?v=` cache-busts swept to `20260428-005` / `3.23.3`.

---

## v3.23.2 Pro — Build `20260428-004`
**Released:** April 28, 2026

**Setup-1 callout cleanup + Test All retest flows.** Two distinct improvements that share the same surface area. First, the three inline `.fs-col-tip` callouts on Setup 1 (Worker Bees) — Don't-have-keys, Hide-All-Defaults, and the v3.23.1 CORS tip — moved into `infoBeesModal` where they belong. Second, the Test All Keys flow gains "↻ Retest" affordances on every failed row (so when a user clicks "Open billing console →", tops off their account, and comes back, they can verify the fix without re-running every key) plus a "↻ Retest all failures" button in the modal footer for batch retry.

### Setup 1 (Worker Bees) callout cleanup

- **All three `.fs-col-tip` callouts removed from inline Setup 1 markup.** The Don't-have-keys content remained available via the toolbar's "API Key Guide" button and the existing `goal-info-tip` link inside `infoBeesModal`. The Hide-All-Defaults and CORS content needed homes inside the modal — see below.
- **New "Custom AIs &amp; model servers" row added to `infoBeesModal`** as a `.goal-info-row`. Replaces the inline Hide-All-Defaults tip with a more comprehensive explanation that covers Add Custom AI, Import from Model Server, Hide All Defaults, and the typical use case (Alfredo, Open WebUI, Ollama, internal gateways).
- **CORS row already present** in `infoBeesModal` from v3.23.1 — no change needed there beyond removing the now-redundant inline callout. The modal's CORS row is more comprehensive than the inline tip was, so users lose nothing.
- **Net result on Setup 1:** the section header sub-paragraph + the buttons row + the AI grid sit cleaner together with no callouts crowding the top. All explanatory content is one click away via the existing ⓘ button next to "Your Worker Bees" — same one-click pattern as the rest of the help system.

### Test All Keys — single-row retest

- **New "↻ Retest [AI name]" button** rendered in the Received detail pane on every completed failed row. Sits next to the "Open billing console →" link from v3.23.1 (when the AI is a default provider) or stands alone (when the AI is a custom endpoint with no `apiConsole` URL).
- **Use case:** user clicks "Open billing console →" on a failed row, tops off their account in the new tab, comes back, and clicks "↻ Retest" instead of re-running the entire Test All. Row's status icon flips back to pending (`…`), then to ✓ or ✗ when the new test completes. Detail pane re-renders with the fresh response.
- **Per-AI test logic extracted** from `testAllKeys()` into a new `runSingleKeyTest(ai)` function. The original loop body remained intact behaviorally — same fetch, same status-icon updates, same `_tkpData` mutations. The extraction makes the same logic reusable from retest flows.
- **Pass/fail tally now computed from `_tkpData`** via a new `updateTkpTally()` helper instead of running counters in `testAllKeys()`. This ensures the title text ("Done — N passed, N failed") stays accurate whether the user just ran Test All, retested a single row, or retested all failures at once.

### Test All Keys — retest all failures

- **New "↻ Retest all failures" button** added to the Test All modal footer alongside the Close button. Hidden via the v3.23.1 `.is-hidden` utility class until at least one failure is present in `_tkpData` — managed by `updateTkpTally()`. Users on a clean Test All run never see the button.
- **`retestAllFailures()` function** iterates `_tkpData`, picks every row where `done && !ok`, and sequentially calls `retestSingleKey()` for each. Disables the button during the run, re-enables it when complete.
- **`retestSingleKey(aiId)` function** does the per-row reset + retest + tally update, reused by both the inline button and the bulk retry. Single source of truth for retest behavior.
- **Sequential not parallel** — preserves the existing 300ms gap between requests that `testAllKeys` already used. Keeps provider rate limits happy on retry waves.

### CSS additions

- **`.tkp-retest-btn`** — neutral/secondary visual weight (surface2 background, plain border, default text color). Visually subordinate to the amber `.tkp-billing-link` so the billing link stays the primary call-to-action when both are present on a row's Received pane.
- **`.tkp-retest-all-btn`** — minor styling tweaks to the standard `.btn` for the footer button.

### Build-stamp sweep

- All four required stamp locations bumped: meta `waxframe-build` (`20260428-004`), `version.js` `APP_VERSION` (`v3.23.2 Pro`), `app.js` `BUILD` (`20260428-004`), and `app.js?v=` cache-bust (`3.23.2`).
- All 6 helper-page comment-header builds and `style.css?v=` / `version.js?v=` cache-busts swept to `3.23.2`.

---

## v3.23.1 Pro — Build `20260428-003`
**Released:** April 28, 2026

**CORS troubleshooting reference + per-error billing links on Test All Keys.** The Test All Keys flow already gives users the raw status and response body in a three-pane modal, but a new user staring at "HTTP 401" or a CORS rejection has no easy path from "I see the error" to "I'm fixing it." This release adds two new explanation surfaces: a CORS-aware tip in Setup 1 (Worker Bees), a full troubleshooting reference modal launched from a new ⓘ button on the Test All modal, and an inline "Open billing console →" link in the Received pane on every failed default-provider row. Also fixes one inline-CSS rule violation as part of the same touch.

### CORS info in Setup 1 (Worker Bees)

- **New `.fs-col-tip` callout** added to Setup 1 alongside the existing two — explains when CORS errors appear (custom endpoints, internal gateways like Alfredo) and points users to the new troubleshooting reference modal. Matches the existing Setup 1 callout pattern, no new visual primitive introduced for this screen.
- **CORS section added to `infoBeesModal`** as a new `.goal-info-row` — gives users who open the existing ⓘ button next to "Your Worker Bees" a full explanation of CORS, why the 6 default providers don't trigger it, and where to fix it (gateway side, not WaxFrame side).

### Test All Keys troubleshooting reference modal

- **New `infoTroubleshootingModal`** launched from a new ⓘ button placed next to the "Testing API keys…" title in the Test All modal header. Reuses the established `.goal-info-modal` pattern — no new modal styling introduced.
- **Sections covering all common failure modes**: red ✗, HTTP 401 (auth), HTTP 403 (permissions/billing), HTTP 429 (rate limit), CORS, network timeout, empty/malformed response. Each section explains what the error means and what the user should do about it.
- **Provider billing/console reference list at the bottom** of the modal, separated by a new `.modal-section-divider` rule. Lists all 6 default providers with their billing console URLs as `link-accent` anchor links: Anthropic, OpenAI, Google (Gemini), DeepSeek, xAI (Grok), Perplexity.
- **Custom AI disclaimer** included — billing references only apply to the 6 default providers; custom AIs added via "Add Custom AI" or "Import from Model Server" handle billing wherever the endpoint came from.

### Per-error billing links in Test All Received pane

- **`renderTkpDetail` updated** — when a row has completed AND failed AND the AI has a known `apiConsole` URL (i.e., it's a default provider), the Received pane now renders an "Open [Provider] billing console →" link at the top, above the Status and Response body sections.
- **Reuses existing `ai.apiConsole` field** — no new constant, no new mapping. The console URL is already populated for every default AI and used by other features in the app (the per-row `↗` button on Setup 1 cards, the existing `consoleErrorDetailModal` for general console errors). Adding it to the Test All rec object was a one-line change at `_tkpData[ai.id]` initialization.
- **Custom endpoints (Alfredo, Open WebUI, Ollama, etc.)** have `apiConsole` null — link is suppressed, so users with custom endpoints don't see misleading or broken links.
- **New `.tkp-billing-link` style** added to `style.css` — themed amber pill matching the rest of the app's accent treatment, with hover invert. Distinct enough from the surrounding `.tkp-detail-label` mono labels that users notice it without it being shouty.

### Inline-CSS rule violation fix on `cedBillingLink`

- **Removed** `style="display:none;"` inline attribute from the `cedBillingLink` anchor inside the existing `consoleErrorDetailModal` (the Debug Mode error-detail modal). Replaced with `class="link-accent is-hidden"`.
- **Updated `openConsoleErrorDetail()`** in `app.js` — `linkEl.style.display = ''` and `linkEl.style.display = 'none'` swapped for `linkEl.classList.remove('is-hidden')` and `linkEl.classList.add('is-hidden')` respectively.
- **New `.is-hidden` utility class** added to `style.css` near the BASE block — `display: none !important;`. Available for future toggleable-visibility cases that don't warrant a feature-specific class.
- The existing `consoleErrorDetailModal` feature itself (clickable arrow on console error/warning lines opening a detail modal with raw response + billing link) remains fully wired and behaviorally unchanged. Only the rule violation was fixed.

### Build-stamp sweep

- All four required stamp locations bumped: meta `waxframe-build` (`20260428-003`), `version.js` `APP_VERSION` (`v3.23.1 Pro`), `app.js` `BUILD` (`20260428-003`), and `app.js?v=` cache-bust query string (`3.23.1`).
- All 6 helper-page comment-header build stamps and `style.css?v=` / `version.js?v=` cache-busts swept to `3.23.1`.

---

## v3.23.0 Pro — Build `20260428-002`
**Released:** April 28, 2026

**Help-system unification + light-mode green fix.** The `api-details.html` page had drifted into running three different info-callout dialects (`.note-box`, `.note-box.green`, and `.kyh-tip`) — none of which matched the `.wf-tip` standard used everywhere else in the helper-page system. This release unifies them all to a single primitive, fixes a light-mode color contrast bug in the Know-Your-Hive strength/weakness pills, and shores up the `--green` token so callouts and pills both read cleanly on white surfaces. No new features; structural cleanup that pays back on every future helper-page edit.

### Help-callout unification on `api-details.html`

- **All 7 `.note-box` provider notes converted to `.wf-tip`** primitive markup. The two billing/save-money callouts (Gemini-is-free, DeepSeek-low-cost, Perplexity-$5/month) use the new `.wf-tip-good` green variant; the five "you need credit" notes use the standard amber `.wf-tip`. Each gets the `WaxFrame_TipButton_v1.png` icon at 24px and italic `--text-dim` body copy in line with the rest of the help system.
- **All 6 `.kyh-tip` per-card AI personality notes converted to `.wf-tip`.** Inside-the-card italic notes about each AI (ChatGPT/Claude/DeepSeek/Gemini/Grok/Perplexity working-style tips) now share the same callout styling as the rest of the help system instead of the previous gray-surface2 minimal treatment.
- **CSS cleanup.** Removed `.note-box`, `.note-box.green`, `.kyh-tip`, `.kyh-tip-icon`, `.kyh-tip-icon img`, and `.kyh-tip p` rule blocks — total of ~28 lines of CSS retired. Both classes were exclusive to `api-details.html`, so the removal is safe and uncovered by any other page.

### `.wf-tip-good` green variant

- **New variant** added immediately after the base `.wf-tip` rule block. Inherits all flex/icon/body sizing from `.wf-tip` and only overrides `background: var(--green-dim)` and `border-color: var(--green)`. Body text stays `--text-dim` for readability — no green-on-green washout. Used for "good news / save money" callouts where amber (the default) would dilute the at-a-glance pricing signal.

### Light-mode `--green` and `--green-dim` token fix

- **Light-mode `--green` shifted from `#059669` (emerald-600) to `#047857` (emerald-700).** The deeper hue gives borders and pill text more presence against white surfaces without crossing into shouty saturation. Dark mode `--green: #00b300` unchanged.
- **Light-mode `--green-dim` opacity bumped from 0.12 to 0.18.** At 12% over white the tint was effectively invisible — callouts had a border but the body fill was indistinguishable from the page surface. 18% gives the callout enough visual presence to read as a distinct band of color while still staying subtle. Dark mode `--green-dim` unchanged. Both light-mode declarations updated — the explicit `[data-theme="light"]` block and the `@media (prefers-color-scheme: light) [data-theme="auto"]` block.

### Theme-token cleanup on Know-Your-Hive pills

- **`.kyh-pill-good` tokenized.** Was hardcoding `#34d399` (Tailwind emerald-400, a mint that only reads in dark mode) for both the text color and the rgba-based background. In light mode, mint text on a near-white background was washed out and low-contrast — the visible bug in the screenshot review. Replaced with `var(--green)` and `var(--green-dim)` tokens so the pill now follows the theme system instead of bypassing it. Dark mode look preserved; light mode now actually readable.
- **`.kyh-pill-bad` tokenized.** Same pattern — was hardcoding `rgba(248,113,113,0.4)` for the border color (Tailwind red-400 at 40%) instead of using the existing `var(--red)` token already declared in both themes. Now matches `.kyh-pill-warn`'s clean three-token pattern (border-color, color, background all theme-driven).

### Build-stamp drift fix

- **`index.html` comment-header build was `20260428-005`** while the meta tag and `app.js` BUILD constant had moved on to `20260428-001` in the v3.22.8 release — silent drift that's surfaced before. All four required stamp locations (meta, version.js APP_VERSION, app.js BUILD, app.js cache-bust query) plus the comment-header build stamps in all 5 helper pages now sync to `20260428-002` and `v3.23.0`.
- **Helper-page `version.js?v=` cache-bust drift fix.** All 6 helper pages were loading `version.js?v=3.22.6` (stuck two releases behind) — meaning a cached `version.js` could persist across two releases on returning visitors. Now bumped to `version.js?v=3.23.0` everywhere alongside `style.css?v=3.23.0`.

---

## v3.22.8 Pro — Build `20260428-001`
**Released:** April 28, 2026

**Honeycomb Visual Language polish pass.** v3.22.7 shipped the structural migration to `.hp-section` and the layered glass-strip-plus-surface-body pattern. Real-world testing on the live site exposed a series of edge-case bugs and visual-cohesion gaps. This release closes all of them. No new features, no architecture changes — just the cleanup that makes v3.22.7 actually feel finished.

### Setup screens

- **Honeycomb background restored.** `.fs-body-single` was inheriting `var(--surface2)` (a flat dark fill) and covering up the body's honeycomb tile. Replaced with the same `linear-gradient + url('images/WaxFrame_Honeycomb_BG_Dark.png')` declaration that `.helper-body` uses, including matching theme variants for explicit-light and auto-light. Setup panels now float over the same honeycomb backdrop the work screen uses.
- **Panel width restored to 1390px.** The `.hp-section` primitive defaults to 1200px max-width for helper pages; setup screens needed the legacy 1390px to give the AI grid, Builder picker, and Project form their original breathing room. Scoped override via `.fs-body-single > .hp-section { max-width: 1390px; width: 100%; flex: 1; display: flex; flex-direction: column; min-height: 0 }`.
- **Vertical fill restored.** Legacy `.setup-single-card` had `flex: 1` and a flex-column chain that let drop zones, paste editors, and the scratch notebook fill the body height. The new primitive needed the same chain. Added `display: flex; flex-direction: column` to `.fs-body-single > .hp-section > .hp-section-body` plus `flex: 1; min-height: 0; overflow-y: auto` so the chain resolves end-to-end. Drop zones, paste editors, and the scratch notebook on Reference Material and Starting Document fill their panels exactly the way they did in v3.22.6.
- **Watermark hex restored.** The pulsing `Waxframe_logo_v19.png` watermark on `#panel-paste`, `#panel-upload`, `#panel-scratch`, `#panel-ref-paste`, and `#panel-ref-upload` is a `::after` pseudo-element with `position: absolute`. It needs an `position: relative` ancestor; broken flex chain meant it was anchoring to the wrong parent and rendering off-canvas. Fixing the flex chain (above) restored its correct anchor inside `.doc-tab-panel.active`, which has `position: relative` declared.
- **Project screen Clear Project button relocated.** Was inside the `<h1 class="hp-section-title">` where it was clipping against the glass strip with the bee variant on tight viewports. Moved to a right-aligned row between the Project Goal sub paragraph and the goal-fields grid. New `.proj-clear-mid-btn` style mirrors the visual treatment of the previous `.proj-clear-top-btn`.

### Helper pages

- **what-are-tokens.html restructured to a single column.** The `.two-col` layout was hanging content off the right edge once it was wrapped in an `.hp-section`. The two columns (Basics / Best Builder Choices) now stack vertically inside the section body with a `<hr class="wf-section-divider">` between them. Full-page-width gives the wide builder-comparison table room to breathe without horizontal overflow.
- **Light-mode hp-section title color.** Title and sub paragraph inside the glass strip were inheriting the helper-page `[data-theme="light"] .helper-body .page-main h1` rules (specificity 0,2,1) and rendering as dark text on the dark glass strip — invisible. Bumped the override selectors to `.hp-section .hp-section-header .hp-section-title` (specificity 0,3,0) plus `[data-theme="light"]` and `[data-theme="auto"] @prefers-color-scheme: light` variants at 0,4,0. Title and sub now stay white in all theme paths regardless of any helper-page color rules. No `!important` needed.

### Working Document panel — full visual cohesion with the other three work-screen panels

Working Document was the only work-screen panel that didn't visually match The Hive, Conflicts, and Live Console. v3.22.7 moved it part of the way; v3.22.8 finishes the job:

- **Header is now a floating glass strip** matching `.work-panel-header.honeycomb-header`. The previous `.work-panel-header` (no honeycomb-header) was the immediate light-mode bug — base `[data-theme="light"] .work-panel-header { background: #ffffff }` was painting the whole strip white in light mode. Adding `.honeycomb-header` to the markup pulled it onto the same compound-selector branch the other two glass-strip panels use.
- **53 lines of stale override CSS deleted.** A previous session had a Working-Document-specific light-mode override block (lines 2235–2287 of `style.css`) whose stated premise was "Working Document header lacks honeycomb-header class." That premise is no longer true after the markup change above, and the rules in that block were actively fighting the new floating glass strip. Removed in full. Net code reduction.
- **`.work-doc-panel` made transparent.** Was `background: rgba(0,0,0,0.6)` with backdrop-blur, border, border-radius, and box-shadow — its own opaque-ish dark card. The strip's margin gap was showing the panel's darker fill behind it instead of the body honeycomb, breaking visual parity with `.work-left-panel` (Hive/Conflicts container) and `.work-right-panel` (Console container) — both of which are transparent. Now matches.
- **Strip stretches edge-to-edge with the document body.** Default `.work-panel-header.honeycomb-header { margin: 6px 8px 4px }` was insetting the strip 8px on each side, leaving it visibly narrower than the document body editor below it. Scoped override `.work-doc-panel > .work-panel-header.honeycomb-header { margin-left: 0; margin-right: 0; margin-bottom: 8px }` zeroes out the side margins (top/bottom kept for floating gap) and bumps the bottom gap from 4px to 8px to match the visual breathing room on the other three panels.
- **Document body top corners rounded.** `.work-doc-editor` was `border-radius: 0 0 12px 12px` (bottom-only) when its top sat flush against the old attached header. With the new floating strip and the gap between, the flat top corners no longer made sense. Now `border-radius: 12px` (all four).
- **`.work-doc-panel` itself given `border-radius: 10px 10px 0 0`** so its `overflow: hidden` doesn't clip the strip's rounded top corners against a square panel edge.
- **Doc-stats row moved into the strip.** The chars/words/lines counter was a separate row between the strip and the document body, with its own `rgba(0,0,0,0.4)` (dark) / `#ffffff` (light) background. Now sits inside the glass strip as a second line below the title+buttons row. Strip restructured from row layout to column layout via `.work-panel-header.honeycomb-header:has(> .work-panel-header-row)` (scoped so Live Console's strip is unaffected). New `.work-panel-header-row` wrapper carries the row 1 layout (title left, buttons right). Doc-stats chip keeps its amber text + amber border (the original styling), but background switches to transparent so it rides the glass instead of carrying its own pill fill. Theme variants included.
- **8px breathing-room padding** between the buttons row and the stats line so they don't crowd each other.

### Light-mode clock visibility

Several clock states were either invisible or mis-colored in light mode because the colors were dimmed too aggressively for "accessibility on light backgrounds":

| State | Before (light) | After (light) |
|---|---|---|
| Round clock running digits | `#047857` (dim green) | `#00b300` (bright green, matches dark mode) |
| Round clock running label | `#047857` (dim green) | `#00b300` (bright green) |
| Project clock running digits | `#a06000` (dim amber, read as black) | `var(--accent)` (bright amber, matches dark mode) |
| Project clock paused digits | `#1a1d2a` (dark navy — lost specificity battle) | `var(--accent)` (bright amber, now wins specificity) |
| Idle control button border | `#d0d4e8` (near-invisible pale) | `#7880a0` (medium gray-blue, visible) |
| Idle control button symbol | `#7880a0` (pale) | `#384060` (deep navy, readable) |
| Start active button | `#047857` (dim green) | `#00b300` (matches running digits) |
| Pause active button | `#a06000` (dim amber) | `var(--accent)` (matches paused digits) |

All eight changes mirrored in the `[data-theme="auto"]` block under `prefers-color-scheme: light` so auto-theme on light systems gets the same treatment.

The paused-amber fix is worth calling out separately: `.dcw-digits-project.paused { color: var(--accent) }` and `[data-theme="light"] .dcw-digits { color: #1a1d2a }` were both at specificity (0,2,0). Source order put the dim-base rule after the paused rule, so it was winning in light mode and painting the pulsing digits dark navy instead of amber. Adding `[data-theme="light"] .dcw-digits-project.paused { color: var(--accent) }` puts the paused override after the dim-base rule and at the same specificity — so the paused state correctly wins by source order in light mode.

### Specificity and code health

No `!important` declarations were added anywhere in this release. The `!important` count in `style.css` stayed flat at 24 (all pre-existing). Every override in this release was solved by either adjusting selector specificity or by careful source-ordering of equal-specificity rules.

Net code change: approximately −55 lines across the cleanup (53 lines of stale override block removed, plus minor refactoring elsewhere). The Working Document panel now has fewer CSS rules dedicated to it than before this release shipped.

### Files touched

- `style.css` — `.hp-section` setup-screen flex chain + width fix, light-mode hp-section title color override (specificity bump), `.work-doc-panel` transparency, Working Document strip side-margin override + bottom-gap, `.work-doc-editor` border-radius, `.work-doc-panel` top border-radius, doc-stats-row in-strip restyle (transparent background, amber text/border preserved, 8px top padding), `.work-panel-header.honeycomb-header:has(> .work-panel-header-row)` flex-column switch, `.work-panel-header-row` wrapper styling, `.proj-clear-mid-btn` style, light-mode clock running/paused/control-button colors, deletion of stale Working Document light-mode override block (53 lines removed)
- `index.html` — Working Document header `.honeycomb-header` class added, doc-stats-row moved inside the strip with new `.work-panel-header-row` wrapper, Project screen Clear Project button moved from H1 title to mid-row
- `what-are-tokens.html` — `.two-col` removed; content stacks single-column inside the section body
- `app.js` — `BUILD` constant → `20260428-001`
- `version.js` — `APP_VERSION` → `'v3.22.8 Pro'`

All four primary version stamp locations and all five helper-page comment-header stamps updated in lockstep.

### Validation

- All HTML files: div balance verified (each file's `<div` count matches `</div>` count).
- `!important` count: 24 (unchanged from start of release).
- All hp-section pages render correctly in dark, light, and auto-light theme paths.
- Watermark hex confirmed visible on Reference Material and Starting Document setup screens after deployment.
- All four work-screen panel headers (Hive, Conflicts, Working Document, Live Console) confirmed visually equivalent in both themes.

---

## v3.22.7 Pro — Build `20260427-014`
**Released:** April 27, 2026

**Honeycomb Visual Language release.** Helper pages and setup screens now render in the same layered "glass strip + solid surface body" pattern as the work-screen panel headers (Working Document, Conflicts, Live Console). A new `.hp-section` CSS primitive replaces the per-page intro vocabularies (`.api-intro-strip`, `.kyh-intro`, `.wf-intro`, `.save-bar`) and the per-screen `.setup-single-card` container. After this release, every screen with a content panel — work, setup, helper — reads as part of the same visual system.

### Why this release exists

The work-screen panel pattern (`.work-panel-header.honeycomb-header`) was the cleanest layered look in the app — a translucent dark glass strip floating over the honeycomb background, with a solid `var(--surface)` body card directly attached underneath. That pattern was confined to one place. Setup screens had `.setup-single-card` (a flat surface card with the bee tucked inside the card body, no glass strip on top). Helper pages had a different per-page intro pattern each: `api-details.html` had `.api-intro-strip honeycomb-header` (a partial port of the work-screen pattern, only on that one page), `what-are-tokens.html` and the user manual used `.wf-intro` (bee + h1 + paragraph, no glass), the prompt editor used `.save-bar` (a custom strip with bee + actions), and document playbooks used yet another `.wf-intro` variant.

Five different intro vocabularies for the same job. This release unifies all of them onto one primitive and applies the work-screen layered look everywhere a content panel exists outside the work screen itself. The work screen is unchanged — the existing `.work-panel-header.honeycomb-header` rule remains the visual reference point.

### What changed

#### New `.hp-section` primitive

A new ~165-line CSS block was added to `style.css` immediately before the `.wf-card` primitive. The structure is intentionally simple:

```html
<div class="hp-section">
  <div class="hp-section-header">                       <!-- bee variant -->
    <img class="hp-section-bee" src="…">
    <div class="hp-section-title-block">
      <h1 class="hp-section-title">…</h1>
      <p class="hp-section-sub">…</p>
    </div>
  </div>
  <div class="hp-section-body">…content cards…</div>
</div>
```

The glass header values (`rgba(0,0,0,0.55)` background, `blur(6px)` backdrop, `1px rgba(255,255,255,0.1)` border, `box-shadow 0 2px 8px rgba(0,0,0,0.3)`, `border-radius 10px 10px 0 0`) are copied verbatim from `.work-panel-header.honeycomb-header` so the three contexts read identically. The body is a standard `var(--surface)` card with `border-top: none` and `border-radius 0 0 10px 10px`, attaching flush underneath the glass strip.

Three variants ship with the primitive:

- **Bee variant (default).** 16px-20px header padding, 180px bee on the left, title + sub paragraph stacked on the right. Used for first-of-page intros and setup screens 1–3.
- **`.is-bare` variant.** 10px-20px header padding, no bee, single-line title + optional sub. Used for setup screens 4–5 (Reference Material, Starting Document) and for subsequent sections inside helper pages where a stacked bee per section would be visually heavy.
- **Strip-only variant.** When `.hp-section-header` is the only child of `.hp-section`, the header gets full `border-radius: 10px` instead of top-only. Used for the page-level intros at the top of helper pages above `.doc-layout`.

Theme handling forces white header text in light + auto modes (the glass strip is dark in all themes regardless of base theme).

#### Setup screens — five panels

All five setup screens migrated from `.setup-single-card` to `.hp-section`:

| Screen | Bee | Header variant |
|---|---|---|
| 1 — Worker Bees | Worker Bee v2 | bee |
| 2 — Builder | Builder v3 | bee |
| 3 — Project | Project Bee v2 | bee (Clear Project button kept inline in title) |
| 4 — Reference Material | none | `.is-bare` |
| 5 — Starting Document | none | `.is-bare` |

The 5-screen setup flow (introduced in v3.21.0 with Reference Material) now reads as five layered panels instead of five flat surface cards. Per-screen tip paragraphs (`.fs-col-tip`) move from inside the intro card into the body of the new `.hp-section`, where they live alongside the existing controls/grids/forms.

#### Helper pages — six panels each on the long pages

Each helper page now uses `.hp-section` for its top-level content groupings:

- **api-details.html** — 3 sections: API Key Setup (API Bee glass header) / Know Your Hive (Worker Bee) / General Tips (`.is-bare`). The pre-existing `.api-intro-strip honeycomb-header` was removed in favour of the new primitive; `<hr class="wf-section-divider">` between sections is gone since the visible honeycomb gap between panels does that job now.
- **prompt-editor.html** — 1 section (Prompt Editor Bee v1 glass header). The custom `.save-bar` is gone; the Reset / Save action buttons + status toast moved into a new `.prompt-editor-actions` row at the top of the section body (right-aligned, ~10 lines of new CSS).
- **what-are-tokens.html** — 1 section wrapping the page (Token Bee v1 glass header). The redundant `.col-bee` inside the left column was removed since the bee now lives in the glass strip above. The two-column layout for Basics / Best Builder Choices stays inside the body.
- **document-playbooks.html** — 6 sections: top page-intro (Project Bee v2, strip-only above `.doc-layout`) + 5 sections inside `.doc-main` (Quick Start / Career & Hiring / Business & Sales / Content & Marketing / Personal & Everyday — all `.is-bare`). Each `.dp-category-hdr` is gone; the category title + sub now live in the glass header of that section's panel.
- **waxframe-user-manual.html** — 6 sections: top page-intro (Worker Bee v2, strip-only) + 5 sections inside `.doc-main` (Before You Start / Setup / Work Flow / Appendices / Reference — all `.is-bare`). The 11 `.wh-section` blocks (step1–step11) split into Setup (1–5) and Work Flow (6–11) at the natural setup-vs-work boundary; the sidebar nav still groups all 11 as "Step-by-Step Guide" and the per-step anchor links continue to work.

A small helper rule `.doc-main .hp-section { max-width: none; }` lets the in-sidebar sections fill the available main-column width instead of capping at 1200px (the sidebar already constrains horizontally).

#### Bee assignments

The release locks bee assignments per context. The mascot-mismatch rule (API Bee = auth/endpoint contexts, Worker Bee = bee/hive contexts) is preserved:

| Context | Bee |
|---|---|
| Setup 1 — Worker Bees | Worker Bee v2 |
| Setup 2 — Builder | Builder v3 |
| Setup 3 — Project | Project Bee v2 |
| Setup 4–5 — Reference / Document | none (`.is-bare`) |
| User Manual page intro | Worker Bee v2 |
| Document Playbooks page intro | Project Bee v2 |
| What Are Tokens? | Token Bee v1 |
| Prompt Editor | Prompt Editor Bee v1 |
| API Details Section 1 | API Bee v1 |
| API Details Section 2 (Know Your Hive) | Worker Bee v2 |

For helper pages with multiple sections, only the page-level intro section gets a bee. Subsequent sections within the same page use `.is-bare` to avoid stacking five bees down the page.

### Known follow-up — v3.22.8 cleanup target

This release is **additive**. The new `.hp-section` primitive ships, the HTML migrations land, but the CSS rules for the now-orphaned legacy classes are still in `style.css` and not removed. 23 classes are confirmed orphaned (`.setup-single-card` + `--centered`, `.setup-intro` + `-bee` + `-body`, `.api-intro-strip`, `.api-intro-bee-wrap`, `.api-intro-text`, `.api-intro-title`, `.api-intro-desc`, `.kyh-intro`, `.kyh-bee`, `.kyh-intro-text`, `.save-bar` + all `save-bar-*` sub-classes, `.wf-intro` + `-bee` + `-text`, `.dp-category-hdr`, `.dp-category-title`, `.dp-category-sub`, `.fs-col-header`, `.fs-col-title`, `.fs-col-sub`, `.proj-title-row`). All of them have zero remaining HTML usage and zero JS references — verified by grep across all `.html` and `app.js` files. Removing them is a 50-ish-line CSS sweep that v3.22.8 will handle in isolation so this release can stay scoped to "the migration."

`.fs-col-tip` is **not** orphaned — it survives in 3 places inside the new `.hp-section-body` of setup screens 1, 2, and 3 (the tip paragraphs that used to live in `.fs-col-header`). It stays.

### Files touched

- `style.css` — `.hp-section` primitive block (+165 lines), `.prompt-editor-actions` row (+10 lines), `.doc-main .hp-section` width override (+4 lines)
- `index.html` — 5 setup-screen migrations (`.setup-single-card` → `.hp-section`)
- `waxframe-user-manual.html` — 6 sections, page intro + 5 inside `.doc-main`
- `document-playbooks.html` — 6 sections, page intro + 5 inside `.doc-main`
- `what-are-tokens.html` — 1 section wrapping the page
- `api-details.html` — 3 sections, replaces `.api-intro-strip` precedent
- `prompt-editor.html` — 1 section, replaces `.save-bar`
- `app.js` — `BUILD` constant → `20260427-014`
- `version.js` — `APP_VERSION` → `'v3.22.7 Pro'`

All four version stamp locations were updated in lockstep. All six helper-page comment-header build stamps were synced.

### Validation

Each migrated file was checked for div balance with `grep -oE '<div\b' | wc -l` vs `grep -oE '</div>' | wc -l`:

| File | div open | div close | hp-section refs | Legacy class refs |
|---|---|---|---|---|
| index.html | 542 | 542 | 33 | 0 |
| api-details.html | 201 | 201 | 25 | 0 |
| prompt-editor.html | 99 | 99 | 9 | 0 |
| what-are-tokens.html | 64 | 64 | 9 | 0 |
| document-playbooks.html | 452 | 452 | 47 | 0 |
| waxframe-user-manual.html | 424 | 424 | 46 | 0 |

Working console is **unchanged** — the existing `.work-panel-header.honeycomb-header` rule was not touched. The new primitive lives alongside it as a generalisation, not a refactor.

---

## v3.22.6 Pro — Build `20260427-013`
**Released:** April 27, 2026

**Helper-page consolidation release.** Three things land in one focused release: license pill rolls out to every helper page footer with full parity to the work-screen behavior; the navigation menus on the work-screen and helper pages are tightened; and a brand-new helper-page design system unifies cards, tips, intros, headings, lists, and section dividers across all five helper pages so they finally read as the same product.

This is the biggest single helper-page release since the chrome unification work in v3.22.5. After this release, content presentation across user manual, API key guide, document playbooks, what are tokens, and prompt editor all draw from the same set of CSS primitives.

### Why this release exists

Helper pages had drifted into five different content vocabularies. Every page invented its own `.card` system (api-details had THREE coexisting card classes — `.info-card`, `.kyh-card`, `.ai-card`), every page invented its own `.tip` class (`.wh-tip` on user manual, `.dp-tip` on playbooks, `.kyh-tip` plus `.kyh-tips-*` on api-details), every page used different heading sizes for the same job, and `api-details.html` was carrying a 35-line inline `<style>` block — a direct violation of the project's NO inline CSS rule. Lists were unstyled or styled inconsistently. Three of the five pages had no `<h1>` at all.

Rather than fix each page individually, this release introduces a scoped helper-pages design system. All rules live under `.helper-body`, so they never touch the working console (locked) or setup screens (locked). Every helper page now uses the same primitives.

### What changed

#### License pill rollout — every helper page footer

The footer-right slot on every helper page now shows the same green Licensed pill (or Trial / Trial expired status) as the work-screen footer. Click behavior is full parity with the in-app pill:

- Click while licensed → opens Manage License modal (replace key, remove key, or close)
- Click while trialing or expired → opens License Entry modal with Gumroad verification
- Status updates immediately on save / replace / remove, on the page where the action happened AND on next-load of any other helper page (shared `LS_LICENSE` localStorage key)

Implemented via a new shared file `license-helper.js` (160 lines, mirrors the in-app license functions in `app.js` minus the trial-rounds increment counter — helper pages don't run rounds, so the trial counter is read-only). Both license modals (entry + manage) are now injected into the markup of every helper page.

The footer structure was restructured from v3.22.5's two-section layout (`Save as PDF` | `version + About` cluster) to a three-section layout matching the work-screen pattern:

```
[Save as PDF]              [v3.22.6 PRO]              [✓ Licensed] [ℹ️ About]
   left                       center                      right
```

The version pill in the center is plain dim text (no border, no padding, no border-radius) — it's a stamp, not a button.

#### Menu refinements — work screen and helper pages

The work-screen Tools section item `🔑 Enter License Key` is renamed to `🔑 License Key`. The shorter label is more accurate — clicking it goes to either the entry or manage modal depending on license state. "Enter" implied entry-only.

Helper-page hamburger menus now have FIVE sections instead of three, mirroring the structure of the in-app menu:

```
DOCUMENTATION (alphabetical)
  🔑 API Key Guide
  📋 Document Playbooks
  📖 User Manual
  🪙 What Are Tokens?

TOOLS
  🔑 License Key

CREATE SOMETHING
  🚀 Open WaxFrame

SUPPORT
  🛒 Buy WaxFrame Pro

ADVANCED
  ✏️ Prompt Editor
```

`✏️ Prompt Editor` moved out of Documentation and into Advanced, mirroring its placement in the in-app menu. New Tools section contains `🔑 License Key`, providing a menu entry point in addition to the footer pill.

#### NEW: Helper-pages design system in `style.css`

A new section at the end of `style.css` titled `HELPER-PAGES DESIGN SYSTEM (v3.22.6)`. All rules scoped under `.helper-body` so they apply only to the five helper pages — never the work screen, never setup screens. Built on the existing theme tokens (`var(--surface)`, `var(--accent)`, etc.) so dark/light/auto theming is automatic.

Primitives introduced:

- **Heading hierarchy** — `h1` (28px), `h2` (20px), `h3` (16px), `h4` (13px uppercase accent). Consistent margins. Font-family always `var(--font-display)` (DM Sans). All scoped under `.helper-body .page-main`.
- **Body text** — paragraph, strong, em, code, pre, with consistent line-height (1.7) and color (`var(--text-dim)`).
- **Lists** — `ul` and `ol` under `.helper-body .page-main` with consistent indent (24px), line-height (1.7), bullet style (disc / decimal), nested-list spacing.
- **`.wf-card`** — the one and only card primitive. Surface background, border, left-edge accent stripe. Color modifiers: `.is-accent`, `.is-green`, `.is-amber`, `.is-blue`, `.is-red`. Sub-elements `.wf-card-title` and `.wf-card-body`.
- **`.wf-tip`** — the one and only tip primitive. Flex row with icon + body. Accent-tinted background, accent border, italic body text.
- **`.wf-section-divider`** — horizontal rule between major sections.
- **`.wf-section-heading` + `.wf-section-heading-sub`** — large section heading + subtitle pair.
- **`.wf-pill`** — small inline pill label. Color modifiers same as `.wf-card`.
- **`.wf-intro`** — page-level hero block at the top of a page (logo + headline + intro paragraph). Replaces the per-page `.wh-intro` / `.dp-intro` / `.kyh-intro` variants.

Page-specific rich components kept distinct because they aren't generic content (different visual job from a generic card):

- **`.kyh-card`** — AI personality cards on api-details (icon + name + role badges + body sections + tip footer). Visually aligned with `.wf-card` (same border-radius, same border-left-accent pattern) but keeps its rich structure.
- **`.kyh-badge-builder` / `.kyh-badge-reviewer` / `.kyh-badge-free`** — colored pills shown on each AI personality card header.
- **`.kyh-pill-good` / `.kyh-pill-warn` / `.kyh-pill-bad`** — descriptors inside each KYH card body.
- **`.ai-card`** — AI signup cards (api-details section 1) with icon + name + steps and links.

#### Migrations applied

Every helper page now uses the design system primitives.

**`api-details.html`:**
- Inline `<style>` block (35 lines) DELETED. All rules now live in the design system or in supporting helper-body-scoped rules.
- `.info-card section-title-top` "What is an API key?" panel → `.wf-card.is-accent` with `<h2 class="wf-card-title">`
- `.info-card.green` "Your keys never leave your device" → `.wf-card.is-green` with `<h3 class="wf-card-title">`
- `.info-card.info-card-tips` "General Tips" → `.wf-card.is-accent` with `<h2 class="wf-card-title">` and clean `<p><strong>` paragraphs (no more `.kyh-tips-p`/`.kyh-tips-strong` classes)
- `.section-divider` → `.wf-section-divider`
- All `<div class="section-title">TEXT</div>` (column headers like "Free or low-cost AIs", "Pay-as-you-go AIs") converted to plain `<h2>TEXT</h2>` and styled by the design system.
- `<h2 class="api-intro-title">Get Your API Keys</h2>` promoted to `<h1>` (this IS the page title).
- Specificity fix: `.api-intro-strip.honeycomb-header .api-intro-title` rules re-scoped to `.helper-body .api-intro-strip.honeycomb-header .api-intro-title` so they win cascade-priority over the new design-system H1 rule.

**`what-are-tokens.html`:**
- New `<h1>What Are Tokens?</h1>` and intro paragraph added at top of `page-main` (page previously had no H1).
- `.card.accent` → `.wf-card.is-accent`
- `.card.amber` → `.wf-card.is-amber`
- `.card.green` → `.wf-card.is-green`
- bare `.card` → `.wf-card`
- All `<h3>` inside cards → `<h3 class="wf-card-title">`
- `.section-title` divs → plain `<h2>` elements (styled by design system)
- `.info-card.green.card-push-bottom.helper-note-card` "Learn more" block → `.wf-tip` structure with `WaxFrame_InfoButton_v1.png` icon

**`document-playbooks.html`:**
- All 12 `.dp-tip` blocks converted to `.wf-tip` structure (`<div class="wf-tip"><span class="wf-tip-icon"><img></span><div class="wf-tip-body">…</div></div>`)
- `.dp-intro` → `.wf-intro`, `.dp-bee` → `.wf-intro-bee`, `.dp-intro-text` → `.wf-intro-text`, `<h1 class="dp-intro-title">` → plain `<h1>`
- Other `dp-*` page-specific scaffolding (`.dp-playbook`, `.dp-field`, `.dp-category-*`, `.dp-back-top`, `.dp-real-example`) intentionally KEPT — they're page-specific structural components, not generic content primitives.

**`waxframe-user-manual.html`:**
- All 14 `.wh-tip` blocks converted to `.wf-tip` structure
- `.wh-intro` → `.wf-intro`, `.wh-bee` → `.wf-intro-bee`, `.wh-intro-text` → `.wf-intro-text`, `<h1 class="wh-intro-title">` → plain `<h1>`
- `<ul class="wh-list">` (2 occurrences) stripped to plain `<ul>` — design system handles list styling
- Page-specific components kept: `.wh-section`, `.wh-section-hdr`, `.wh-section-title`, `.wh-block`, `.wh-step`, `.wh-warn`, `.wh-tag`, `.wh-back-top`, `.wh-table` — these are user-manual-specific structural components, not generic primitives.

**`prompt-editor.html`:**
- Body NOT migrated — pure tool surface (`.save-bar` + `.prompts-grid` + `.prompt-block`). No narrative content with cards, tips, or intros to consolidate. The white-header concern raised during testing was confirmed to be light-theme rendering correctly (the `.page-header` rule has a `[data-theme="light"]` background of `#f0f2f8` which is correctly applied).
- License pill, About modal, and menu changes still applied.

#### Dead CSS removed

The orphaned old rules previously serving the migrated markup are deleted from `style.css`. This is the riskiest part of the release per the v3.21.26 lesson (orphan-by-grep ≠ safe-to-delete), so each rule was checked for any remaining HTML/JS references before deletion. Rules that LOOKED orphaned but were actually still in use (`.ai-card`, `.ai-table`, `.wh-section`, `.wh-block`, `.wh-step`, `.wh-warn`, `.wh-tag`, `.wh-back-top`, `.wh-table`, `.dp-playbook`, `.dp-field`, `.dp-category-*`, `.kyh-section-title`) were KEPT.

Rules genuinely orphaned and DELETED:

- `.section-title` (24px page-section header)
- `.section-divider` (horizontal rule)
- `.section-heading`, `.section-heading-sub` (lived in inline style, gone with that block)
- `.card`, `.card.accent`, `.card.amber`, `.card.green`, `.card h3`, `.card p`, `.card strong`
- `.info-card`, `.info-card.green`, `.info-card h2`, `.info-card h3`, `.info-card p`
- `.info-card-tips`, `.kyh-tips-title`, `.kyh-tips-p`, `.kyh-tips-strong`, `.kyh-tips-p-last`
- `.api-intro-title` and `.api-intro-desc` fallback rules (only used inside the honeycomb-header panel which has its own scoped rules)
- `.api-azure-intro` (single-paragraph margin tweak, now redundant)
- `.helper-note-card`, `.helper-note`, `.card-push-bottom`
- `.footer-note` (was on prompt-editor footer-left, now removed by the v3.22.5 footer restructure)
- `.wh-intro`, `.wh-bee`, `.wh-intro-text h2`, `.wh-intro-text .wh-intro-title`, `.wh-intro-text p`
- `.wh-tip`, `.wh-tip-icon`, `.wh-tip p`
- `.dp-intro`, `.dp-bee`, `.dp-intro-text h2`, `.dp-intro-text .dp-intro-title`, `.dp-intro-text p`
- `.dp-tip`, `.dp-tip-icon`, `.dp-tip-icon img`, `.dp-tip p`

Net `style.css` line change: +472 (8124 lines vs 7652 in v3.22.5). The design system added more than the orphans removed, expected for a structural addition. Brace count balanced 1675/1675.

### What didn't change

- Work screen, setup screens, welcome screen, in-app About modal contents — all unchanged.
- The structure or content of any helper page section — all unchanged. Only chrome and visual presentation were touched.
- All `app.js` JavaScript — only `BUILD` constant updated. No code changes.
- All in-app navigation — preserved exactly.
- `theme.js`, `docs-scrollspy.js`, `api-links.js`, `nav-helper.js` — unchanged.
- Setup screens still deliberately have no theme buttons and no hamburger menu — unchanged from prior releases.

### What changed (file-by-file)

| File | Changes |
|------|---------|
| `license-helper.js` | NEW — 160-line shared file with full license badge + modal flow for helper pages. |
| `style.css` | NEW design-system section appended (~470 lines). KYH supporting rules block appended (~80 lines). Specificity fix on `.api-intro-strip.honeycomb-header` rules. ~14 orphan rule blocks deleted. Net +472 lines. |
| `index.html` | Menu: `🔑 Enter License Key` → `🔑 License Key`. Version stamps. |
| `waxframe-user-manual.html` | 5-section menu. License modals + license-helper.js. Footer License pill. 14 `.wh-tip` blocks migrated to `.wf-tip`. `.wh-intro` → `.wf-intro`. `.wh-list` stripped. Build stamps. |
| `api-details.html` | 5-section menu. License modals + license-helper.js. Footer License pill. Inline `<style>` block deleted. Three `.info-card` blocks migrated to `.wf-card`. `.kyh-tips-*` block migrated to plain `.wf-card`. `.section-title` divs → `<h2>`. `.section-divider` → `.wf-section-divider`. `<h2>` page title promoted to `<h1>`. Build stamps. |
| `document-playbooks.html` | 5-section menu. License modals + license-helper.js. Footer License pill. 12 `.dp-tip` blocks migrated to `.wf-tip`. `.dp-intro` → `.wf-intro`. Build stamps. |
| `what-are-tokens.html` | 5-section menu. License modals + license-helper.js. Footer License pill. New `<h1>` + intro paragraph at top. All `.card` variants migrated to `.wf-card` with appropriate `.is-*` modifier. `.section-title` divs → `<h2>`. Card `<h3>` → `<h3 class="wf-card-title">`. `.info-card` "Learn more" block migrated to `.wf-tip`. Build stamps. |
| `prompt-editor.html` | 5-section menu. License modals + license-helper.js. Footer License pill. Body left untouched (pure tool surface, no narrative content to migrate). Build stamps. |
| `app.js`, `version.js` | Version stamps only. |

### Items shipped from the queue

- **Helper-page content consistency** — five different card systems collapsed to one. Five different tip systems collapsed to one. (resolved)
- **api-details inline `<style>` block** — rule violation closed. (resolved)
- **Helper-page H1 missing on three of five pages** — H1 added to api-details, what-are-tokens. Already present on user manual and document playbooks. Prompt editor's body has no narrative content so no H1 needed. (resolved)
- **License pill on helper pages** — promised in v3.22.5 work, now delivered. (resolved)
- **Menu refinements** — License Key label, Tools section on helper pages, Prompt Editor moved to Advanced. (resolved)

### Items still queued

- **#7** Model update detection + opt-in swap prompt
- **#8** `MODEL_LABELS` strategy decision
- **#10** Model catalog (Appendix B flow) — stop filtering already-added AIs
- **#12** Mute button muted-state icon — clearer glyph
- **#13** Reference Material — multi-document support
- **#14** Excel/.xlsx ingestion
- **#15** Shareable hive presets (client-side export/import)
- **#16** "CONFLICTS DETECTED BUT COULD NOT BE PARSED" diagnostics surfacing
- **#17** Holdout suggestion clickability — wrap-aware numbering or section-anchor primary
- **#18** Clock CSS audit
- **#19** Export-flag regression (`_finishExported`)

### Validation

- `style.css` brace balance: 1675 open / 1675 close ✓
- All HTML files div-balanced (538/538, 403/403, 194/194, 435/435, 60/60, 101/101) ✓
- Zero stale class references on any helper page (no orphaned `wh-tip`, `dp-tip`, `kyh-tips-*`, `info-card`, bare `.card`, `.section-title`, `.section-divider`, `.helper-note-card`, etc.) ✓
- All design-system primitives have CSS rules defined (`.wf-card`, `.wf-tip`, `.wf-intro`, `.wf-pill`, `.wf-section-divider`, `.kyh-card`, `.ai-card`) ✓
- All page-specific kept components have CSS rules (`.wh-section`, `.wh-block`, `.dp-playbook`, `.dp-field`, `.kyh-section-title`) ✓
- All 4 canonical version stamps verified at v3.22.6 / `20260427-013` ✓
- All 5 helper-page meta `waxframe-build` tags verified at `20260427-013` ✓
- All cache-busts verified at `?v=3.22.6` across `style.css`, `version.js`, `nav-helper.js`, `license-helper.js`, `docs-scrollspy.js`, `app.js` ✓
- License-helper.js loaded on all 5 helper pages after nav-helper.js ✓

### Upgrade

Pull and hard-refresh. **`license-helper.js` is a new file — make sure it's added to the repo, not just modified.**

### Test plan

1. Drop files into the repo (`license-helper.js` is new — confirm it's added). Hard-refresh in browser.
2. **License pill behavior on each helper page.** Open each helper page in a fresh tab. Confirm the green ✓ Licensed pill (or Trial — N rounds left) appears in footer-right next to ℹ️ About button. Click the pill:
   - Licensed → Manage License modal opens with masked key (last 8 chars visible). Test Replace Key (opens entry modal). Test Remove Key (confirm dialog → license cleared, badge updates, alert shown).
   - Not licensed → License Entry modal opens. Test invalid key shows error. Test valid key from Gumroad receipt verifies and updates badge to ✓ Licensed.
3. **Cross-page license sync.** License a key on one helper page, refresh another helper page tab — should show ✓ Licensed. Refresh main app — should show ✓ Licensed.
4. **Menu refinements:**
   - Main menu: confirm "🔑 License Key" replaces previous "🔑 Enter License Key" in the Tools section.
   - Helper-page menus: confirm 5 sections (Documentation alphabetical / Tools with License Key / Create Something with Open WaxFrame / Support with Buy Pro / Advanced with Prompt Editor). Click each item to confirm the route works.
5. **Footer layout on each helper page:** confirm `[Save as PDF] | [version pill] | [Licensed] [About]` three-section layout. Version pill is plain dim text (no border, no padding). License pill is green and clickable. About button works.
6. **Design system migration — visual smoke test:**
   - Open `what-are-tokens.html`. Confirm: H1 "What Are Tokens?" + intro paragraph at top. The cards in left/right columns have border-left in accent (left col first), amber, then accent again; right col cards have green, then plain (no left-edge color), plain, plain. Card titles (`.wf-card-title`) are 16px bold. Bottom-left "Learn more" block is now a `.wf-tip` (italic note in tinted box with InfoButton icon).
   - Open `api-details.html`. Confirm: H1 "Get Your API Keys" inside the honeycomb-header panel (white text, uppercase, letter-spaced — same as before). Two-column layout. The "What is an API key?" card has accent left-edge, "Your keys never leave your device" card has green left-edge. Section H2s "Free or low-cost AIs" / "Pay-as-you-go AIs" use design-system H2 (20px bold). KYH cards (Know Your Hive section) preserve their rich layout (icon + name + role badges + body sections + tip footer). General Tips card at bottom has accent left-edge with H2 title.
   - Open `document-playbooks.html`. Confirm: `.wf-intro` panel at top with bee + H1 "Put the hive to work on a real document" + intro paragraphs. The 12 tip blocks throughout the playbooks (Quick Start, Cover Letter, Resume, etc.) all render as `.wf-tip` (italic text with TipButton icon, accent-tinted background, accent border).
   - Open `waxframe-user-manual.html`. Confirm: `.wf-intro` panel at top with bee + H1 "WaxFrame User Manual". Sticky sidebar still works, scrollspy still highlights current section. The 14 tip blocks throughout render as `.wf-tip`. Lists in `.wh-block` still readable (page-specific `.wh-block ul/ol` rules still apply).
   - Open `prompt-editor.html`. Confirm: save-bar at top with bee, title, note, Save All / Reset All buttons. Three prompt groups (Reviewer / Builder / System Injections). License pill in footer. About modal works.
7. **Theme regression:** Switch each page through Light / Auto / Dark. All `.wf-card`, `.wf-tip`, `.wf-pill` etc. should adapt automatically via tokens.
8. **App regression check:** Open `index.html`. Work screen, setup screens, About modal, hamburger menu — all unchanged from v3.22.5 (except License Key label).

---

## v3.22.5 Pro — Build `20260427-012`
**Released:** April 27, 2026

**Helper-page chrome unification — complete.** The slim hamburger menu lands on every helper page in one release, the four remaining helper pages get the same unified header/footer/About modal treatment as the user manual, and several smaller items get folded in (sidebar clip fix, queue item #22 deprecation, vestigial sidebar labels removed, page-name H2→H1 promotions, multiple stale meta build-stamp drift fixes).

Reverses the earlier course of micro-splitting these changes across one release per helper page. The pattern is proven (v3.22.3/v3.22.4 on user manual), risk is well-understood, and shipping the rollout in one focused release moves the project forward rather than dribbling four near-identical follow-ups across the next hour.

### What changed

#### New shared file: `nav-helper.js`

New 24-line file providing `openNavMenu()` and `closeNavMenu()` for helper pages. Mirrors the in-app `app.js` versions exactly so the visual + behavior are identical. ESC key closes the menu. Loaded by all five helper pages with a `?v=3.22.5` cache-bust.

#### All five helper pages — unified header

Every helper page (`waxframe-user-manual.html`, `api-details.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html`) now uses the same header structure:

- **Left:** `nav-hamburger` button calling `openNavMenu()`
- **Center:** logo + `WaxFrame` name + tagline `Many minds, one refined result.` + version stamp (replaces the page-specific name that had been in the tag slot)
- **Right:** theme controls — icon-only `☀️ ⚙️ 🌙` (the four pages that hadn't already been simplified in v3.22.3 dropped their `Light` / `Auto` / `Dark` word labels)

Old `<div class="page-header-spacer">` faux-centering pattern replaced with the semantic `.page-header-left` slot used by the user manual since v3.22.3.

#### All five helper pages — slim hamburger menu

Each helper page now contains the same nav-panel markup. Visual treatment matches the in-app menu; item set is reduced for doc-page context:

```
HEADER
  WaxFrame brand block + version + ℹ️ About

DOCUMENTATION (alphabetical, target="_blank")
  🔑 API Key Guide
  📋 Document Playbooks
  ✏️ Prompt Editor
  📖 User Manual
  🪙 What Are Tokens?

CREATE SOMETHING
  🚀 Open WaxFrame   (target="_blank" → index.html)

SUPPORT
  🛒 Buy WaxFrame Pro
```

The work-screen menu sections (Navigation, Tools, Advanced) deliberately don't appear on helper pages — those items need an in-app session to be useful, useless on a static doc page.

#### All five helper pages — sticky unified footer

Footer pattern from v3.22.3/v3.22.4 is now applied site-wide. Sticky to viewport bottom. Save-as-PDF on the left, version pill (plain text) + ℹ️ About button centered. Replaces every helper page's previous footer (which had varied across pages — some had AGPL/GitHub branding links, some had a Close-tab button, some had an open-source one-liner). Branding links now live in the About modal where project metadata belongs; window.close was redundant (browser tab close already does the same job).

#### All five helper pages — About modal

Each helper page now includes its own `aboutModalHelper` modal with metadata-only content (Version, License, Source, Author, Testing credit, Stack info, build line). Same content shape as the in-app About modal so users get consistent metadata regardless of where they opened the modal from. Reachable from two places per the v3.22.3 pattern: footer About button and nav-panel header About button.

#### `api-details.html` — queue item #22 deprecation

The footer `Open All Billing Pages` and `Open All API Consoles` buttons collapsed into a single `Open default AI websites` button matching the Worker Bees screen. Resolves item #22 from the work-session queue.

#### `api-details.html` — meta `waxframe-build` tag added

Page had only the comment-block build stamp, no `<meta name="waxframe-build">` tag. Added the meta tag for site-wide consistency with `index.html`, `waxframe-user-manual.html`, and the others.

#### `document-playbooks.html` — Jump to a playbook label removed from sidebar

Same vestigial-label pattern as the user manual's `Contents` label that came out in v3.22.4. The sidebar IS the contents; labelling it is redundant. The first sidebar item (Quick Start) is now the topmost sidebar element with its existing styling providing the natural top boundary.

#### `document-playbooks.html` — body H2 → H1 promotion

`<h2>Put the hive to work on a real document</h2>` becomes `<h1 class="dp-intro-title">`. Same semantic correction as the user manual's H2 → H1 promotion in v3.22.3 — the page's primary heading should be H1 once the tagline is in header chrome. CSS selector updated to handle both `h2` (legacy fallback) and `.dp-intro-title`.

#### Three stale meta `waxframe-build` stamps fixed

`document-playbooks.html`, `what-are-tokens.html`, and `prompt-editor.html` were all reading `20260427-002` while the rest of the site had been bumped through several releases (and v3.22.3 had only fixed the user manual's drift). All three now corrected to `20260427-012` along with the rest of the site.

#### `style.css` — sidebar clip fix

`.doc-sidebar` `max-height` was `calc(100vh - 140px)` which only accounted for the sticky header. With the v3.22.4 sticky footer, the sidebar was running under the footer at long scroll positions. Updated to `calc(100vh - 140px - 64px)` so the sticky sidebar clips above the sticky footer.

### What didn't change

- Work screen, setup screens, welcome screen, About modal contents — all unchanged.
- Helper page content (sections, copy, code samples) — all unchanged. Only chrome and structural elements (sidebar labels, intro headings) modified.
- All `app.js` JavaScript — only `BUILD` constant updated. No code changes.
- All in-app navigation — preserved exactly.
- `theme.js`, `docs-scrollspy.js`, `api-links.js` — unchanged.
- Setup screens still deliberately have no theme buttons and no hamburger menu — unchanged from prior releases.

### What changed (file-by-file)

| File | Changes |
|------|---------|
| `nav-helper.js` | NEW — 24-line shared script with `openNavMenu`/`closeNavMenu` plus ESC-key handler. |
| `waxframe-user-manual.html` | Hamburger menu added (was empty placeholder slot). nav-helper.js loaded. Stale meta build stamp `010` → `012`. |
| `api-details.html` | Header rewritten with unified pattern + nav menu + hamburger. Footer rewritten with unified sticky pattern. About modal added. Bottom buttons consolidated to single `Open default AI websites` (item #22). New meta `waxframe-build` tag. nav-helper.js loaded. Light/Auto/Dark word labels dropped. |
| `document-playbooks.html` | Header rewritten + nav menu + hamburger. Footer rewritten with sticky pattern. About modal added. Sidebar `Jump to a playbook` label removed. Body H2 → H1. nav-helper.js loaded. Stale meta build `002` → `012`. Light/Auto/Dark word labels dropped. |
| `what-are-tokens.html` | Header rewritten + nav menu + hamburger. Footer rewritten with sticky pattern. About modal added. nav-helper.js loaded. Stale meta build `002` → `012`. Light/Auto/Dark word labels dropped. |
| `prompt-editor.html` | Header rewritten + nav menu + hamburger. Footer rewritten with sticky pattern (replacing the open-source one-liner footer-note). About modal added. nav-helper.js loaded. Stale meta build `002` → `012`. Light/Auto/Dark word labels dropped. The `.save-bar` and editor surface in the body left untouched — that's tool surface, not chrome. |
| `style.css` | `.doc-sidebar` `max-height` clip fix. `.dp-intro-text` selector extended to include `.dp-intro-title`. Build header. |
| `index.html` | Version stamps only. |
| `app.js` | `BUILD` constant only. |
| `version.js` | `APP_VERSION` → `v3.22.5 Pro`. |

### Items shipped from the queue

- **#22** api-details bottom buttons → `Open default AI websites` (resolved)
- **Sidebar clip fix** flagged during v3.22.4 testing (resolved)
- **Helper-page hamburger menu** promised in v3.22.3 release notes (resolved)
- **Helper-page chrome unification** promised in v3.22.3 release notes (resolved across all five pages)

### Items still queued

- **#7** Model update detection + opt-in swap prompt
- **#8** `MODEL_LABELS` strategy decision
- **#10** Model catalog (Appendix B flow) — stop filtering already-added AIs
- **#12** Mute button muted-state icon — clearer glyph
- **#13** Reference Material — multi-document support
- **#14** Excel/.xlsx ingestion
- **#15** Shareable hive presets (client-side export/import)
- **#16** "CONFLICTS DETECTED BUT COULD NOT BE PARSED" diagnostics surfacing
- **#17** Holdout suggestion clickability — wrap-aware numbering or section-anchor primary
- **#18** Clock CSS audit
- **#19** Export-flag regression (`_finishExported`)

### Validation

- `style.css` brace balance: 1634 open / 1634 close ✓
- All HTML files div-balanced (538/538, 391/391, 184/184, 423/423, 49/49, 89/89) ✓
- All 4 canonical version stamps verified at v3.22.5 / `20260427-012` ✓
- All 6 helper-page cache-busts verified at `?v=3.22.5` ✓
- All 6 helper-page meta `waxframe-build` tags verified at `20260427-012` ✓
- New `nav-helper.js` file present, 24 lines ✓
- All 5 helper pages reference `nav-helper.js?v=3.22.5` ✓

### Upgrade

Pull and hard-refresh.

### Test plan

1. Drop files into the repo (`nav-helper.js` is new — make sure it's added). Hard-refresh.
2. Open each helper page in a fresh tab: `waxframe-user-manual.html`, `api-details.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html`.
3. **Header check on every helper page:**
   - Hamburger button on the left
   - Brand block centered with logo, WaxFrame name, tagline `Many minds, one refined result.`, version stamp
   - Theme buttons icon-only on the right (☀️ ⚙️ 🌙)
4. **Hamburger menu:** click the hamburger on each helper page. Menu should slide in with brand-block header + About button + three sections (Documentation alphabetical / Create Something / Support). Click outside the panel or press ESC to close.
5. **Documentation links:** click each Documentation item from the menu. Each should open in a new tab. Confirm `Open WaxFrame` opens `index.html` in a new tab. Confirm `Buy WaxFrame Pro` opens Gumroad in a new tab.
6. **Sticky footer:** scroll each helper page. Footer should stay pinned at the bottom of the viewport at all scroll positions. Last lines of content should remain readable above the footer.
7. **About modal:** click `ℹ️ About` in the footer of each helper page. Modal opens with metadata only (Version, License, Source, Author, Testing, Stack). Close via "Got it →" or by clicking outside.
8. **api-details.html footer:** confirm the new `Open default AI websites` button replaces the previous `Open All Billing Pages` and `Open All API Consoles` buttons. Click it — should open all the default AI signup pages.
9. **document-playbooks.html sidebar:** confirm the topmost item is the `⭐ Quick Start` link — no `Jump to a playbook` label above it. Confirm the body H1 reads `Put the hive to work on a real document`.
10. **User manual sidebar (regression check):** scroll the user manual to a long section. The sticky sidebar should clip above the sticky footer (no overlap).
11. **Theme toggle (regression check):** light/auto/dark switching should work on every helper page, persists across reloads.
12. **App check:** open `index.html` — work screen, setup screens, hamburger menu, all unchanged from v3.22.4.

---

## v3.22.4 Pro — Build `20260427-011`
**Released:** April 27, 2026

**v3.22.3 chrome refinements on the user manual.** Four small fixes on the helper-page chrome shipped in v3.22.3, all driven by walking through the rendered page and hitting friction. No new structure — just polish on what just landed.

### What changed

- **`waxframe-user-manual.html` — `Close this tab` button removed from footer.** The browser already provides a tab close mechanism (the `×` on the tab itself), so a footer button doing the same thing was redundant chrome. Removed. The footer's left-side actions area now contains only `⬇ Save as PDF`.
- **`waxframe-user-manual.html` — `Contents` label removed from sidebar.** The sidebar IS the contents — labelling it `Contents` was vestigial. The first `.doc-sidebar-category` block (`Before You Start`) is now the topmost element in the sidebar, and its existing `border-top` + `padding-top` provide the natural top boundary. This recovers vertical space at the top of the sidebar.
- **`style.css` — Version pill no longer renders as a button.** The `.footer-version-pill` rule had `padding: 3px 9px`, `border: 1px solid var(--border2)`, and `border-radius: var(--radius-sm)` — visually that read as a clickable button. Stripped all three properties; version pill is now plain dim 10px text with letterspacing, matching its semantic role as a passive label.
- **`style.css` — Helper-page footer is now sticky to viewport bottom.** Added `position: sticky; bottom: 0; z-index: 50` to `.page-footer.page-footer-unified`, plus a new `.helper-body .page-main { padding-bottom: 64px }` rule to reserve clearance so the last lines of the document don't render hidden under the sticky footer. This matches the always-visible footer pattern on the work screen and setup screens — Save as PDF and About are now reachable at any scroll position without scrolling to the absolute bottom of the page.

### What didn't change

- All v3.22.3 unified header structure (logo, tagline in tagline slot, theme buttons icon-only on right) — preserved.
- All v3.22.3 footer items (Save PDF, version pill, About) — preserved positions, just refined visually.
- About modal contents — unchanged.
- Body H1 — unchanged.
- All other helper pages — content unchanged. Cache-busts updated.
- Work screen and setup screens — unchanged.

### Why these fixes weren't bundled into v3.22.3

The v3.22.3 release shipped a bigger chrome shell change (header restructure + footer restructure + About modal + body H1 + meta build stamp drift fix) and got pushed before walking through the rendered result. The four fixes in v3.22.4 are exactly the kind of polish that only surfaces after a real page is in front of you. Splitting the polish into v3.22.4 keeps the release diffs surgical — v3.22.3 lands the structural change, v3.22.4 lands the visual refinement, neither carries scope creep into the other.

### What changed (file-by-file)

| File | Changes |
|------|---------|
| `waxframe-user-manual.html` | Footer: `Close this tab` button removed. Sidebar: `Contents` label removed. Build header + cache-busts. |
| `style.css` | `.page-footer.page-footer-unified` gains `position: sticky; bottom: 0; z-index: 50`. New `.helper-body .page-main { padding-bottom: 64px }` rule for sticky-footer clearance. `.footer-version-pill` strips border + padding + border-radius (now plain text). Build header. |
| `index.html` | Version stamps only. |
| `app.js` | `BUILD` constant only. |
| `version.js` | `APP_VERSION` → `v3.22.4 Pro`. |
| `api-details.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html` | Build header + cache-busts only. Same chrome treatment as user manual coming in v3.22.5+. |

### Validation

- `style.css` brace balance: 1634 open / 1634 close ✓
- `waxframe-user-manual.html` div balance: 380 / 380 (one less than v3.22.3's 381 — the removed Contents div) ✓
- All 4 canonical version stamps verified at v3.22.4 / `20260427-011` ✓
- All 6 helper-page cache-busts verified at `?v=3.22.4` ✓

### Upgrade

Pull and hard-refresh.

### Test plan

1. Drop files into the repo, hard-refresh.
2. Open `waxframe-user-manual.html`.
3. **Sidebar:** confirm the topmost item is `Before You Start` — no `Contents` label above it.
4. **Footer center:** the version pill should look like plain dim text, not a button — no border, no rounded corners, no padding box. About button next to it stays a button (correctly, it IS a button).
5. **Footer left:** only `⬇ Save as PDF` button — no `Close this tab` next to it.
6. **Sticky footer:** scroll the user manual. The thin footer should stay pinned to the bottom of the viewport at all scroll positions, not just at the bottom of the document. The last lines of the document content should remain readable above the footer (not hidden under it).
7. **App check:** open `index.html` — work screen, setup screens, all unchanged from v3.22.3.

### What's next — v3.22.5

The slim helper-page hamburger menu lands across all five helper pages: Documentation list (alphabetical), `CREATE SOMETHING → Open WaxFrame` (target="_blank"), `SUPPORT → Buy WaxFrame Pro`. After that, the four remaining helper pages (`api-details.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html`) get the unified chrome treatment in v3.22.6 / v3.22.7 / v3.22.8 / v3.22.9 — one per release for surgical safety.

---

## v3.22.3 Pro — Build `20260427-010`
**Released:** April 27, 2026

**Helper-page chrome unification — round 1 of 5: `waxframe-user-manual.html`.** First helper page brought into the unified header/footer pattern. Hardest-first per project plan — the user manual is the longest helper file with the most complex internal structure (sticky sidebar, scroll-spy, print mode), so getting the chrome pattern right here proves it for the four shorter helper pages that follow.

This release lands the chrome shell only — header, footer, About modal. The hamburger menu that the unified header is designed to contain ships in v3.22.4 once the markup pattern, JS wiring, and CSS for a slim helper-page-specific menu are designed and tested. The header reserves space for the hamburger so v3.22.4 is a markup-only addition with no layout shift.

### What changed

- **`waxframe-user-manual.html` — header rewritten.** The old header layout (`page-header-spacer / page-header-brand / page-header-spacer / page-header-controls`) used spacer divs to fake a centered brand with controls on the right. The new layout uses semantic `page-header-left / page-header-brand / page-header-controls` matching the work-screen and setup-screen language. The brand-block `tag` slot now reads **`Many minds, one refined result.`** instead of `User Manual` — the WaxFrame tagline goes where the tagline belongs, and the page-specific name moves to the body H1 where it belongs as document content. The theme buttons in `.page-header-controls` simplified from `☀️ Light / ⚙️ Auto / 🌙 Dark` (icon + word) to icon-only `☀️ / ⚙️ / 🌙` matching the work-screen treatment shipped in v3.22.0. The hamburger placeholder slot on the left is reserved as a `.page-header-left` element so v3.22.4 can drop the hamburger button in without re-flowing the header.
- **`waxframe-user-manual.html` — footer rewritten.** The old footer mixed three categories of items in one row: AGPL/GitHub branding links, a Save-as-PDF action, and a Close-tab utility plus a version stamp. The new layout pulls the branding links (AGPL and GitHub) out of the footer entirely — they now live in the new helper About modal where project metadata belongs. The footer becomes thin (`8px 24px` padding matching the work-screen footer), with secondary actions (`Save as PDF`, `Close this tab`) on the left and a centered cluster of `version pill` + `ℹ️ About` button. The thin-and-centered shape matches the work-screen footer's visual language.
- **`waxframe-user-manual.html` — body H2 promoted to H1.** The `<h2>WaxFrame User Manual</h2>` inside the existing `wh-intro` block becomes `<h1 class="wh-intro-title">WaxFrame User Manual</h1>`. With the tagline now in header chrome, the page-name needs to be the document's primary heading. Semantic improvement only; the `.wh-intro-text` CSS rule was updated to target both `h2` (legacy fallback) and the new `.wh-intro-title` class so styling is preserved with no visual change.
- **`waxframe-user-manual.html` — About modal added.** New `aboutModalHelper` modal with the same content shape as the in-app `aboutModal`: Version (auto-stamped from `app-version-stamp`), License (AGPL-3.0 with link to gnu.org), Source (GitHub link), Author (R David Paine III with weirdave.com link), Testing (Candy), Stack (Vanilla HTML/CSS/JS), and the closing build line. Modal opens from the new footer About button. Same visual treatment as in-app modals — `.finish-modal-overlay` + `.finish-modal.goal-info-modal`.
- **`waxframe-user-manual.html` — stale build stamp fix.** The `<meta name="waxframe-build">` tag was reading `20260427-002` while the rest of the page had been bumped through several releases. This silent drift is now corrected to `20260427-010` and will be checked on every helper page touched in v3.22.4 onward.
- **`style.css`** — Three additions, one update. Added `.page-header-left` and `.page-header-brand-text` for the new helper-page header layout. Added `.page-footer.page-footer-unified`, `.page-footer-actions`, `.page-footer-center`, and `.footer-version-pill` for the new helper-page footer layout. Updated `.wh-intro-text h2` selector to `.wh-intro-text h2, .wh-intro-text .wh-intro-title` so the H2 → H1 promotion preserves styling without depending on the descendant tag.

### What didn't change

- All v3.22.0 work-screen chrome — preserved exactly.
- All v3.22.1 / v3.22.2 hamburger menu structure on the work screen — preserved exactly.
- `index.html` body markup — only version stamp updates.
- `app.js` — only `BUILD` constant. No code changes.
- All other helper pages (`api-details.html`, `document-playbooks.html`, `prompt-editor.html`, `what-are-tokens.html`) — content unchanged. Cache-busts updated to `?v=3.22.3` so returning visitors get the updated `style.css` immediately.
- User manual body content — unchanged. Sidebar, sections, scroll-spy, print mode, all working as before.

### Why the menu wasn't included in v3.22.3

The agreed helper-page menu is a slim variant of the work-screen menu — drops Navigation/Tools/Advanced sections (they need an in-app session to be useful), keeps Documentation alphabetical, adds a `CREATE SOMETHING` section with a single `Open WaxFrame` link in a new tab, and a `SUPPORT` section with `Buy WaxFrame Pro`. That structure needs:

1. New nav-panel markup tailored for helper pages
2. JS for `openNavMenu` / `closeNavMenu` (these live in `app.js` which helper pages don't load)
3. Either a shared `nav-helper.js` file or inline `<script>` blocks in each helper page
4. CSS for the helper-specific menu structure

That's enough scope to deserve its own release rather than getting bundled into the chrome shell. v3.22.4 lands the menu across all five helper pages at once so the markup, JS, and CSS get designed once and applied consistently.

### What changed (file-by-file)

| File | Changes |
|------|---------|
| `waxframe-user-manual.html` | Header rewritten with unified pattern. Footer rewritten thin + centered. Body H2 → H1. New `aboutModalHelper`. Stale `meta` build stamp fixed (`002` → `010`). |
| `style.css` | Two new layout rule blocks (`.page-header-left`, `.page-header-brand-text`) plus four for the unified footer (`.page-footer.page-footer-unified`, `.page-footer-actions`, `.page-footer-center`, `.footer-version-pill`). One selector update to keep wh-intro H1 styling. Build header. |
| `index.html` | Version stamps only. |
| `app.js` | `BUILD` constant only. |
| `version.js` | `APP_VERSION` → `v3.22.3 Pro`. |
| `api-details.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html` | Build header + cache-busts only. Chrome unification on these pages comes in v3.22.5 onward after the menu lands in v3.22.4. |

### Validation

- `style.css` brace balance: 1633 open / 1633 close ✓
- All HTML files div balance verified clean (538/538, 381/381, 164/164, 405/405, 29/29, 70/70) ✓
- All 4 canonical version stamps verified at v3.22.3 / `20260427-010` ✓
- All 6 helper-page cache-busts verified at `?v=3.22.3` ✓
- User manual `meta name="waxframe-build"` corrected from drifted `002` to current `010` ✓

### Upgrade

Pull and hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`). Cache-busts at `3.22.3` ensure returning visitors get the updated assets immediately. No session migration. Existing IndexedDB sessions, license keys, project state, and backups load unchanged.

### Test plan

1. Drop files into the repo, hard-refresh.
2. Open `waxframe-user-manual.html` in the browser.
3. **Header check (dark + light themes):**
   - Logo on left-of-center, `WaxFrame` name large, tagline `MANY MINDS, ONE REFINED RESULT.` in small caps below, version stamp below the tagline
   - Theme buttons on the right are icon-only (☀️ ⚙️ 🌙) — no longer have word labels
   - Left side has reserved space (currently empty) for the v3.22.4 hamburger
4. **Body check:** the H1 at the top should still read `WaxFrame User Manual` with identical styling to before. Sidebar, all sections, scroll-spy all work unchanged.
5. **Footer check:**
   - Left side: `Save as PDF` and `Close this tab` buttons (these used to be split with branding links — branding moved to About modal)
   - Center: small version pill (`v3.22.3 Pro`) + `ℹ️ About` button
   - No longer shows the orange `Save as PDF` accent — it's now a regular `.btn` matching `Close this tab`
   - Footer is thinner than before (8px vertical padding, was 14px)
6. **About modal:** click `ℹ️ About` in the footer. Modal opens with version, license (AGPL-3.0 with link), source (GitHub link), author (weirdave.com link), testing credit (Candy), stack info, build line. Click "Got it →" or click outside the modal to close.
7. **Cross-page check:** open `api-details.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html` — all should still look exactly like they did in v3.22.2. Only the user manual got the chrome treatment in this release.
8. **App check:** open `index.html` — work screen, setup screens, hamburger menu, all unchanged from v3.22.2.

### What's next — v3.22.4

Helper-page hamburger menu lands across all five helper pages at once: Documentation list (alphabetical), `CREATE SOMETHING → Open WaxFrame`, `SUPPORT → Buy WaxFrame Pro`. Slim variant of the work-screen menu. After v3.22.4 ships, the four remaining helper pages (`api-details.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html`) get the same chrome treatment in v3.22.5 / v3.22.6 / v3.22.7 / v3.22.8.

---

## v3.22.2 Pro — Build `20260427-009`
**Released:** April 27, 2026

**Hotfix for v3.22.1 menu sandwich bug.** The Advanced section in v3.22.1's restructured hamburger menu rendered with `Prompt Editor` visually sandwiched between two dev-related items: `Dev Tools` immediately above it and the conditional `Exit Dev Mode` `<div>` immediately below it. The Exit Dev Mode div is hidden via `display: none` for non-dev-mode users, so the visual issue only fully resolved when dev mode was inactive — but Prompt Editor still read as "between two dev things" because of source order. Item order in Advanced is now `Prompt Editor` → `Dev Tools` → conditional `Exit Dev Mode`, which puts the always-visible items first (Prompt Editor as the more commonly accessed of the two) and the dev-only conditional at the bottom where it belongs.

### What changed

- **`index.html`** — Lines 1614–1615 swapped: `✏️ Prompt Editor` is now line 1614, `🛠 Dev Tools` is line 1615. The conditional `<div class="nav-dev-section">` containing `🚪 Exit Dev Mode` stays as the last element. No new items, no removed items, no functional change — pure source-order correction.
- **All canonical stamps** updated to v3.22.2 / `20260427-009`. Site-wide cache-bust `?v=3.22.2` ensures returning visitors who loaded the broken v3.22.1 get the corrected order on hard-refresh.

### What didn't change

- All v3.22.0 work-screen chrome (theme/mute up, license/about down, version stamp removed) — preserved.
- All v3.22.1 menu sections (Navigation / Tools / Documentation / Advanced) and section names — preserved.
- Items removed in v3.22.1 (`API Key Setup`, `Open Source License`, `WaxFrame on GitHub`) — still removed.
- About button in nav-panel header — preserved.
- All footer chrome (license pill, About button) — preserved.
- All helper pages — content unchanged, cache-busts updated.

### Validation

- `style.css` brace balance: 1627 open / 1627 close ✓
- `index.html` div balance: 538 / 538 ✓
- All 4 canonical version stamps verified at v3.22.2 / `20260427-009` ✓
- All 6 helper-page cache-busts verified at `?v=3.22.2` ✓
- Advanced section order verified: Prompt Editor → Dev Tools → conditional Exit Dev Mode ✓

### Upgrade

Pull and hard-refresh. Cache-busts at `3.22.2` ensure returning visitors who loaded v3.22.1 get the corrected order immediately.

### Test plan

1. Drop files into the repo, hard-refresh.
2. Open the hamburger menu on the work screen.
3. **Advanced section:** confirm the order top-to-bottom is `✏️ Prompt Editor`, `🛠 Dev Tools`. If dev mode is active, `🚪 Exit Dev Mode` appears at the bottom.
4. Confirm Prompt Editor is no longer visually sandwiched between Dev Tools and any other dev-related element.

---

## v3.22.1 Pro — Build `20260427-008`
**Released:** April 27, 2026

**Hamburger menu restructure** — second release in the chrome cohesion sweep. The slide-in nav menu has been rewritten from the v3.21.28-era five-section layout (`Navigate` / `License` / `Reference` / `Session` / unlabeled-Dev) into a four-section layout (`Navigation` / `Tools` / `Documentation` / `Advanced`) with a new About button promoted to the menu's brand-block header. Three menu items removed entirely as redundant or relocated. No items lost — every action that existed before is still reachable, just in a more sensible group.

### What changed in the menu

**New header section.** The menu's brand-block (logo, WaxFrame name, tagline, version stamp) now also includes a compact `ℹ️ About` button directly under the version stamp. Clicking it closes the menu and opens the existing About modal — same modal that opens from the new footer About button shipped in v3.22.0. About is now reachable from two consistent places (footer, menu header) instead of being buried four-deep in the old `Reference` section.

**`Navigate` → `Navigation`.** Section name normalized to match the rest of the new noun-form labels. Items inside this section: Home, Setup 1–5, plus `Working Console` (renamed from `Work Screen` per the work-as-a-console framing). The Round History item moved out of Navigation and into Tools where it belongs alongside the other session-state actions.

**New `Tools` section.** Replaces the old separate `License` and `Session` sections, merged into one bucket since they're all session-state operations. Items in order: `🛒 Buy WaxFrame Pro`, `📖 Round History`, `💾 Backup Session`, `📂 Import Backup`, `🔑 Enter License Key`. The old `Session` items (Backup, Import) and the old `License` items (Enter Key, Buy) are now together in this single `Tools` section.

**`Reference` → `Documentation`.** Rebranded and trimmed. Items now alphabetical: `🔑 API Key Guide`, `📋 Document Playbooks`, `📖 User Manual`, `🪙 What Are Tokens?`. All open in new tabs (`target="_blank"`) which supports the multi-monitor walk-through workflow — open the user manual on one monitor, work in WaxFrame on another. Three items removed from this section: `⚙️ API Key Setup` (duplicate of the in-app Worker Bees screen), `📄 Open Source License` and `⭐ WaxFrame on GitHub` (both relocated into the About modal where they belong as project metadata, not navigation), and `ℹ️ About WaxFrame` (promoted to the menu header). One item moved out of Reference: `✏️ Prompt Editor` is moved to the new `Advanced` section since it's a power-user tool, not core documentation.

**New `Advanced` section.** Replaces the old unlabeled trailing section. Contains `🛠 Dev Tools`, `✏️ Prompt Editor`, and the existing `🚪 Exit Dev Mode` button (only visible when dev mode is active). This section labels what's actually advanced functionality so users know to skip it unless they have a reason not to. *(Note: this order created a visual sandwich bug — Prompt Editor between Dev Tools and the conditional Exit Dev Mode `<div>`. Fixed in v3.22.2.)*

### What was deleted vs. moved

- **`⚙️ API Key Setup`** — deleted as a redundant menu link. The `Setup 1 — Worker Bees` link in Navigation goes to the same screen with the same effect for normal users. The `openSettings()` function in `app.js` is preserved (sets `_settingsReturnToWork = true` and navigates to bees) but no longer has a menu entry point. If a future workflow wants the mid-session-return-to-keys behavior again, the function is ready to be wired up to a new entry point.
- **`📄 Open Source License`** — moved into the About modal alongside the GitHub link. The About modal has had the AGPL-3.0 reference since v3.21.x; the standalone menu link to the GNU AGPL-3.0 page is no longer a primary nav item.
- **`⭐ WaxFrame on GitHub`** — moved into the About modal alongside the license. Project source is project metadata, not menu navigation.
- **`ℹ️ About WaxFrame`** — promoted from a deep-in-Reference menu item to the new About button in the menu's brand-block header.

### What stayed exactly the same

- All nav-item handlers — `confirmGoHome()`, `goToScreen()`, `openRoundHistoryModal()`, `showLicenseModal()`, `backupSession()`, `importSession()`, `showDevModal()`, `exitDevMode()` — unchanged. Menu reorganization is pure HTML restructure, no JS behavior changed.
- All target page URLs unchanged. Documentation links still point at `api-details.html`, `waxframe-user-manual.html`, etc.
- About modal contents — unchanged in this release. The About button (footer in v3.22.0, menu header in v3.22.1) opens the same existing modal. Visual restyle of the modal still queued for the helper-page chrome work in v3.22.2+.
- Setup screens — untouched. v3.22.1 only modifies the work-screen nav panel.
- Helper pages — unchanged in content. Their cache-bust query strings updated to `?v=3.22.1` so returning visitors get the updated `style.css` immediately.

### What changed (file-by-file)

| File | Changes |
|------|---------|
| `index.html` | `nav-panel-header` brand-block gains an `ℹ️ About` button under the version stamp. `nav-body` rewritten — five old sections (`Navigate`, `License`, `Reference`, `Session`, unlabeled-Dev) collapsed to four new sections (`Navigation`, `Tools`, `Documentation`, `Advanced`). Three menu items deleted (redundant or relocated to About modal). Items reordered within sections to alphabetize Documentation. All 4 canonical version stamps. |
| `style.css` | One new rule block added for `.nav-panel-about-btn` — dashed-border button matching the visual language of the v3.22.0 `.footer-about-btn`, sized compact to fit inside the menu's brand block. Build header. |
| `app.js` | `BUILD` constant → `20260427-008`. The `openSettings()` function is preserved as orphan-by-grep (no menu entry point) but kept defined for future re-wiring. |
| `version.js` | `APP_VERSION` → `v3.22.1 Pro`. |
| `api-details.html`, `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html` | Build header + cache-busts only — no content changes. |

### Items shipped from the queue

The menu restructure was implicit in the v3.22.0 chrome plan. Now formally closed.

### Validation

- `style.css` brace balance: 1627 open / 1627 close ✓
- `index.html` div balance: 538 / 538 ✓
- Four `nav-section-label` blocks present, in order: Navigation / Tools / Documentation / Advanced ✓
- All 4 canonical version stamps verified at v3.22.1 / `20260427-008`
- All 6 helper-page cache-busts verified at `?v=3.22.1`
- `openSettings()` preserved in `app.js`; no stale references in `index.html` ✓

### Upgrade

Pull and hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`). Cache-busts at `3.22.1` ensure returning visitors get the updated assets immediately. No session migration. Existing IndexedDB sessions, license keys, project state, and backups load unchanged.

### Test plan

1. Drop files into the repo, hard-refresh.
2. Open the hamburger menu on the work screen.
3. **Header section:** confirm the brand block shows logo, WaxFrame title, tagline, version stamp (`v3.22.1 Pro`), and a new `ℹ️ About` button below the version. Click About — should close the menu and open the existing About modal.
4. **Navigation section:** Home, Setup 1–5, Working Console. Confirm `Working Console` is the new label (was `Work Screen`).
5. **Tools section:** Buy WaxFrame Pro, Round History, Backup Session, Import Backup, Enter License Key. Confirm Round History opens the existing round history modal.
6. **Documentation section:** API Key Guide, Document Playbooks, User Manual, What Are Tokens? — alphabetical order, all open in new tabs.
7. **Advanced section:** Dev Tools, Prompt Editor. Plus Exit Dev Mode if dev mode is active. Confirm Prompt Editor opens in a new tab.
8. Confirm the items removed in v3.22.1 are gone: there should be no `⚙️ API Key Setup`, no `📄 Open Source License`, no `⭐ WaxFrame on GitHub`, no `ℹ️ About WaxFrame` link inside the body of the menu (About is now in the header instead).
9. Walk every setup screen and confirm the menu shows the same structure on every screen — menu is shared markup, but worth verifying it renders identically.

### What's next — v3.22.2

Helper-page chrome unification begins. Hardest first: `waxframe-user-manual.html` gets the unified header + footer + same hamburger menu (this menu, now finalized) applied as the proven pattern. Subsequent releases apply the same pattern to playbooks, prompt-editor, api-details, what-are-tokens.

---

## v3.22.0 Pro — Build `20260427-007`
**Released:** April 27, 2026

**Work-screen chrome alignment** — first release in a planned cohesion sweep that will eventually unify chrome (header, footer, menu) across every helper page in the WaxFrame ecosystem. v3.22.0 itself only touches the work screen — moving the theme buttons and mute button up to the topbar so they're top-right on every page that has them, moving the license pill down to the footer so it sits next to a new About link, and removing a stale dark-text version stamp that had been rendering illegibly in the upper-right corner of the work topbar.

### What changed

- **`index.html`** — Work-screen topbar-right gains the four theme controls (Light, Auto, Dark, Mute) that used to live in the footer. Work-screen footer-right loses those four controls and gains the license badge (relocated from the topbar) plus a new `ℹ️ About` button that opens the existing About modal. The broken `.work-version-stamp` `<span>` in the topbar-right was deleted entirely — version is already shown in the slide-in nav menu header and in the About modal, so the upper-right placement was redundant on top of being illegible.
- **`style.css`** — Removed the now-orphaned `.work-version-stamp` rule (its sole consumer was the deleted `<span>`; no descendant selectors, no JS toggling, no `display: contents` role — safe to delete per the v3.21.26 lessons-learned checklist). Added one new rule block for `.footer-about-btn` styling — dashed border, transparent background, accent border on hover, sized to sit visually quieter than the action buttons in the same footer. The license-pill and theme/mute buttons reuse their existing classes so no new rules were needed for the relocation itself.
- **All canonical stamps** updated to v3.22.0 / `20260427-007`. Site-wide cache-bust `?v=3.22.0`.

### Why this layout shuffle matters

The work-screen topbar previously had **two** items rendering against a busy background — the license badge and a dark-text version stamp — neither of which fits the topbar's pattern of action buttons. The version stamp in particular was unreadable against the work-screen surface in dark mode and barely visible in light mode. Both items were noise that didn't serve the topbar's purpose.

Meanwhile, the work-screen footer was carrying **four** controls (mute and three theme buttons) that conceptually belong with chrome controls site-wide. Moving them to the topbar puts them in the same visual zone where chrome controls (theme toggle, mute) appear on the welcome screen and where they will appear on every helper page once the universal-chrome work continues in v3.22.1+.

After this release:
- **Work-screen topbar-right:** Notes, Reference, Finish, Mute, Light, Auto, Dark — all chrome controls grouped together.
- **Work-screen footer-right:** License badge (clickable, opens existing license-manage modal), About button (opens existing About modal) — both centered as documentation/status, not action.

The license badge stays clickable and behaves identically — only its position changed. The About modal contents are unchanged in this release; visual restyling of the modal will happen alongside the helper-page chrome work in later v3.22.x releases.

### What's next (v3.22.1 onward)

The remaining v3.22.x releases will apply the same chrome pattern to each helper page one at a time:

- **v3.22.1** — `waxframe-user-manual.html` (longest, most complex — hardest first)
- **v3.22.2** — `document-playbooks.html`
- **v3.22.3** — `prompt-editor.html`
- **v3.22.4** — `api-details.html` (already partially done with the v3.21.28 honeycomb-header intro)
- **v3.22.5** — `what-are-tokens.html`

Each helper page will get a setup-screen-style header (logo + WaxFrame tagline `Many minds, one refined result.` + version stamp + hamburger menu) with theme buttons added top-right, and a work-screen-style thin footer with License pill + About link centered. The hamburger menu structure will be unified across every page so navigation is identical no matter where the user is reading. After all helper pages are unified, a final v3.22.x release will revisit content-card primitives (the green/orange `info-card` / `note-box` consistency mess identified during the api-details review).

### Items still queued from the work-session triage

Deferred so the chrome work can ship cleanly without scope creep:

- **#7** Model update detection + opt-in swap prompt
- **#8** `MODEL_LABELS` strategy decision
- **#10** Model catalog (Appendix B flow) — stop filtering already-added AIs
- **#12** Mute button muted-state icon — clearer glyph
- **#13** Reference Material — multi-document support
- **#14** Excel/.xlsx ingestion
- **#15** Shareable hive presets (client-side export/import)
- **#16** "CONFLICTS DETECTED BUT COULD NOT BE PARSED" diagnostics surfacing
- **#17** Holdout suggestion clickability — wrap-aware numbering or section-anchor primary
- **#18** Clock CSS audit (number colors, header colors, paused amber/black across themes)
- **#19** Export-flag regression (`_finishExported` wiped between Finish-modal opens)
- **#22** api-details bottom buttons — deprecate `Open All Billing Pages` + `Open All API Consoles` to single button matching Worker Bees (folds into v3.22.4)
- **#23** Work-screen upper-right version stamp (closed in this release — stamp removed)

### Validation

- `style.css` brace balance: 1625 open / 1625 close ✓
- `index.html` div balance: 539 / 539 ✓
- `.work-version-stamp` orphan check: 0 references in index.html, style.css, or app.js ✓
- All 4 canonical version stamps verified at v3.22.0 / `20260427-007`
- All 6 helper-page cache-busts verified at `?v=3.22.0`

### Test plan

1. Drop files into `C:\Users\weird\Dropbox\Websites\WaxFrame-Professional`, hard-refresh (`Ctrl+Shift+R`).
2. Walk through to the work screen.
3. Confirm topbar-right (left to right): Notes, Reference, Finish, 🔊 mute button, ☀️ Light, ⚙️ Auto, 🌙 Dark.
4. Confirm footer-right shows the license pill (clickable, opens license-manage modal) and the new `ℹ️ About` button (opens existing About modal).
5. Confirm there is no version stamp in the upper-right of the topbar — it should be gone entirely. Version still appears in the slide-in nav menu header and in the About modal.
6. Click the theme buttons — Light / Auto / Dark switching should work identically to before, just from the new location.
7. Click the mute button — sound toggle should work identically to before.
8. Click the license pill in the footer — should open the license-manage modal (replace key, remove key) just like it did from the topbar.
9. Click the About button in the footer — should open the existing About modal with author/version/credits content.
10. Walk every setup screen — Worker Bees, Choose Builder, Your Project, Reference Material, Starting Document. They should look identical to v3.21.28. The chrome work in v3.22.0 only touched the work screen.
11. Confirm the slide-in nav menu (hamburger) opens normally on every screen and shows the existing menu structure unchanged. The menu restructure is planned for a later release; v3.22.0 only does chrome positioning.

### Upgrade

Pull and hard-refresh. Cache-busts at `3.22.0` ensure returning visitors get the updated assets immediately. No session migration. Existing IndexedDB sessions, license keys, project state, and backups load unchanged.

---

## v3.21.28 Pro — Build `20260427-006`
**Released:** April 27, 2026

Text and copy cleanup batch + first surface-card treatment for an api-details intro panel. Ten queued items from the work session knocked out together since none of them touched the layout subsystems that v3.21.26 broke and v3.21.27 reverted. All changes are surgical: text rewrites, one button rename, one panel restyle (additive CSS only), one redundant button removal, one CORS definition added on first mention, and a min-screen-overlay copy fix that was discovered during the v3.21.26 layout regression debug.

### What changed

- **`index.html`** — Worker Bees screen: button label `Open API Websites` → `Open default AI websites` for clarity in portable model-server deployments. New tip line under the keys-billing tip pointing portable / Open WebUI / Ollama users at the **Hide All Defaults** button. "Haven't exported anything yet" modal: redundant `Dismiss` button removed (the existing `← Go back and export` button calls the same `closeDiscardConfirm()` handler). Min-screen-overlay copy rewritten to match CSS reality — overlay triggers at viewport `≤1421 wide` or `≤810 tall`, so the message now correctly states **1422 × 811 px minimum** with a recommended **1600+ wide** for the multi-panel work screen, replacing the stale `1024px` figure that hadn't matched the CSS gate for some time.
- **`api-details.html`** — Five copy and structure changes. (1) Top intro strip wrapped in the work-screen `.honeycomb-header` panel pattern — same dark translucent surface, blur, border, rounded corners, white uppercase letterspaced title — so the page intro reads as a panel-header against the helper-page honeycomb background instead of floating prose. (2) "No key = Free mode" paragraph rephrased to point users at `weirdave.github.io/WaxFrame-Free/` by name, with the `WaxFrame Free` link styled `.link-accent`. (3) Perplexity recurring-subscription note now correctly warns that **auto-pay must be enabled during signup to lock in the $5/month rate**, otherwise the recurring rate jumps to $50/month — previously the note framed it as a price-availability concern rather than the auto-pay gating issue. (4) First green info-card (`Your keys never leave your device`) had a `.helper-note-card` icon row that none of the other green info-boxes had — icon row dropped, text becomes a clean second paragraph, all four green info-boxes now have consistent treatment. (5) Know Your Hive intro adds attribution: descriptions are based on real-world observations *and* on the hive itself, since each AI's profile was refined by passing it through the hive for self-description and peer review.
- **`waxframe-user-manual.html`** — CORS gets a first-mention parenthetical definition in the Network Error bullet of the test-result interpretation list. Previously the term appeared cold in the bullet at line 1075 and wasn't defined until the troubleshooting block at line 1174. New parenthetical: *"CORS — Cross-Origin Resource Sharing — is the browser security check that decides whether one origin is allowed to call another"* with a forward reference to the existing detailed block.
- **`style.css`** — One additive block for the api-intro-strip honeycomb-header treatment. Block declared isolated under `.api-intro-strip.honeycomb-header` rather than refactoring the existing `.work-panel-header.honeycomb-header` rule into a shared base — explicit duplication chosen over a shared-base refactor to eliminate any risk of regressing the work-screen panel header layout, per the v3.21.26 lesson on load-bearing rules. Theme-aware overrides for light and auto modes included so the white title and rgba(255,255,255,0.85) description text stay correct against the dark translucent panel in both themes.
- **`document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html`** — Build header → `20260427-006`; all `?v=` cache-bust query strings → `3.21.28` (style.css, version.js, and where applicable docs-scrollspy.js).
- **All canonical stamps** updated to v3.21.28 / `20260427-006`. Site-wide cache-bust `?v=3.21.28`.

### Items shipped from the queue

The following queue items from the work-session triage are now closed:

| # | Item | Status |
|---|------|--------|
| 1 | Rename `Open API Websites` button to `Open default AI websites` | Shipped |
| 2 | API-details title intro panel (work-screen header treatment) | Shipped |
| 3 | Rephrase no-key paragraph + WaxFrame Free link | Shipped |
| 4 | Perplexity auto-pay $5 vs $50 clarification | Shipped |
| 5 | Info-icon consistency on green info-boxes | Shipped (icon row removed from first card) |
| 6 | Know Your Hive — hive self-description attribution | Shipped |
| 9 | Worker Bees portable-deployment hide-defaults note | Shipped |
| 11 | Define CORS on first mention | Shipped |
| 20 | Remove redundant Dismiss button on "haven't exported" modal | Shipped |
| 21 | Min-screen-overlay copy mismatch (1024 vs 1421/810) | Shipped (copy fixed to match CSS reality) |

### Items still queued (deferred to later releases)

- **#7** Model update detection + opt-in swap prompt (feature)
- **#8** `MODEL_LABELS` strategy decision — curated drift, no per-role differentiation, irrelevant for closed/gated rosters
- **#10** Model catalog (Appendix B flow) — stop filtering already-added AIs; mark visually
- **#12** Mute button muted-state icon — clearer glyph
- **#13** Reference Material — multi-document support
- **#14** Excel/.xlsx ingestion
- **#15** Shareable hive presets (client-side export/import)
- **#16** "CONFLICTS DETECTED BUT COULD NOT BE PARSED" diagnostics surfacing
- **#17** Holdout suggestion clickability — wrap-aware numbering or section-anchor primary
- **#18** Clock CSS audit (number colors, header colors, paused amber/black)
- **#19** Export-flag regression (`_finishExported` wiped between Finish-modal opens)

### Validation

- `style.css` brace balance: 1624 open / 1624 close
- `index.html` div balance: 539 / 539
- `api-details.html` div balance: 164 / 164
- `waxframe-user-manual.html` div balance: 373 / 373
- All 4 canonical version stamps verified at v3.21.28 / `20260427-006`
- All 6 helper-page cache-busts verified at `?v=3.21.28`

### Upgrade

Pull and hard-refresh (Ctrl+Shift+R / Cmd+Shift+R). Cache-busts at `3.21.28` ensure returning visitors get the updated assets immediately. No session migration. Existing IndexedDB sessions, license keys, project state, and backups load unchanged.

### Test plan

1. Open api-details.html in dark and light themes — top intro strip should render as a dark translucent panel with white uppercase letterspaced title, matching the visual language of the work-screen panel headers (THE HIVE, WORKING DOCUMENT, CONFLICTS, LIVE CONSOLE).
2. Confirm the "Your keys never leave your device" green card no longer has the small info icon — it now reads as a clean two-paragraph card consistent with the other three green info-boxes.
3. Confirm the Perplexity green note-box shows the bolded "but you must enable auto-pay during signup to lock in that price" emphasis and the explicit $50/month fallback.
4. Worker Bees screen — confirm the **Open default AI websites** button label and the new portable-deployment tip line under the API Key Guide tip.
5. Trigger the "haven't exported anything yet" modal (Finish modal → New Project before exporting) — confirm only two buttons remain: `← Go back and export` and `🗑️ Discard and start fresh`. The bottom `← Dismiss` link should be gone.
6. Resize browser below `1422 × 811` — the min-screen overlay should appear with the corrected copy referencing 1422 × 811 minimum and 1600+ recommended.
7. User manual → search for **CORS** — first mention now includes the parenthetical definition; troubleshooting block at the end is unchanged.
8. Walk every setup screen — Worker Bees, Choose Builder, Your Project, Reference Material, Starting Document. All should render full-width as restored in v3.21.27 with no layout regression.
9. Walk the work screen — full three-panel layout, hex grid, all panel headers render correctly.

---

## v3.21.27 Pro — Build `20260427-005`
**Released:** April 27, 2026

**Emergency layout fix.** Reverts the 54 orphan CSS rule deletions from v3.21.26 that broke setup screen layouts. v3.21.26 was deployed and rendered with content collapsed to the left ~60% of the viewport on Worker Bees, Choose Builder, and Starting Document setup screens, with body honeycomb pattern showing through on the right where the layout container should have extended. At least one of the deleted rules was load-bearing despite the orphan scan reporting zero references in HTML or JS — a static grep can't see classes added by JS at runtime, classes referenced via descendant selectors that affect layout when the descendant exists, or rules whose visual effect is "no-op on big screen" but become harmful when removed. `display: contents` rules in particular fall into this trap: they look orphan because nothing styles them further, but they're doing critical layout work by collapsing the wrapper element out of the flex/grid hierarchy.

### What changed

- **`style.css`** — restored to the v3.21.24 baseline (7512 lines), then re-applied the two safe v3.21.26 changes: the `.nav-item-accent:hover` specificity refactor (drops 2 of 26 `!important` declarations, no layout impact) and the five new `.dp-*` modifier rules (only used on the playbooks page, no impact on setup or work screens). Comment-header version label dropped (`WaxFrame v2` → `WaxFrame`) and Build stamp updated to `20260427-005`. Final file: **7520 lines** (was 7284 in broken v3.21.26).
- **`document-playbooks.html`** — unchanged from v3.21.26. The 18 inline-style replacements still work because the new `.dp-*` modifier rules are still in style.css.
- **`api-details.html`** — unchanged from v3.21.26. The redundant inline `style="margin-top:32px;"` deletion still works because the existing `.info-card-tips` rule is back in style.css providing exactly that margin.
- **`waxframe-user-manual.html`, `document-playbooks.html`** — `docs-scrollspy.js?v=3.21.27` cache-bust preserved.
- **All 7 HTML files + `app.js` + `style.css`** — comment-header version label dropped (`WaxFrame v2` / `WaxFrame v3.3` → `WaxFrame`). Build stamp `20260427-005`.
- **All canonical stamps** updated to v3.21.27 / `20260427-005`. Site-wide cache-bust `?v=3.21.27`.

### What's preserved from v3.21.26

The four findings from v3.21.26 that did not involve CSS deletions remain in effect:

- **#3 nav-item-accent specificity refactor** — `.nav-item.nav-item-accent:hover` at (0,2,1) replaces `.nav-item-accent:hover` with `!important`. `!important` count: 26 → 24.
- **#4 Document playbooks inline-style cleanup** — 18 inline styles → 5 `.dp-*` modifier classes.
- **#4 api-details inline-style deletion** — redundant `margin-top:32px` removed.
- **#6 docs-scrollspy.js cache-bust** — `?v=3.21.27` on both helper pages that load it.
- **#7 Comment-header version label drop** — all 8 files now read *"WaxFrame — &lt;filename&gt;"* with no version label.

### What's reverted from v3.21.26

- **#9 — All 54 orphan CSS rule deletions are reverted.** The defunct welcome-card subsystem, project-screen field utilities, text utility set, goal-counter stragglers, setup-card / hex-icon / API-form stragglers, notes-panel descendant rules, DP playbook stragglers, and singletons (`.badge-api`, `.finish-modal-bee`, `.wh-tag-amber`) are all restored. They will stay until a future release runs the deletion sweep again with actual visual testing on each setup, work, and modal screen before deploying.

### Postmortem — why the orphan scan was insufficient

The v3.21.26 scrutiny was over-reliant on cross-file `grep` to determine whether a CSS class had any HTML or JS reference. That heuristic has three known gaps that would have been caught by visual smoke testing on each screen before deploy:

1. **`display: contents` rules look orphan because nothing else styles them, but they're doing critical layout work** by collapsing the wrapper element out of the flex/grid layout hierarchy. Removing the rule re-introduces the wrapper as a normal block element, breaking everything that depends on its children laying out as direct grid/flex items of the grandparent. The deleted `.hex-icon-wrap { display: contents; }` rule with its comment *"no-op on big screen — icon sits directly in body"* was the biggest red flag here — the comment was literally announcing that the rule's visible effect is invisible, which made the orphan signal misleading rather than confirming.
2. **Class names built via JS template-literal concatenation or string interpolation slip past static grep.** The scan checked for `\bclassname\b` but didn't catch `'class-' + variable` or `${state}` substitutions. Several of the deleted classes may have been state modifiers added by JS based on runtime conditions — `.btn-shake-wide.running`, `.round-timer-clock.running`, etc. were grouped under "descendants of orphan parents" but the parent-orphan determination itself relied on the same grep that misses dynamic class construction.
3. **Visual/structural smoke testing has no substitute for catching layout regressions.** Static analysis can prove some classes are unreferenced, but it can't prove a deletion is safe. The first half of *test plan after pulling* in the v3.21.26 release notes was *"walk every screen — Project setup → Worker Bees → Builder → Reference Material → Starting Document → Work → Finish modal. Watch for any styling regression from the 54 deletions"* — that was the right test plan, but it was suggested as a post-deploy check rather than a pre-deploy gate. For a CSS deletion sweep this large, the testing should have happened in a local preview before pushing to main.

Future CSS dead-code passes will run with a stricter pre-deploy gate: every screen visually inspected, every modal opened, every state class triggered, before any `git push`.

### Files changed (in this release vs broken v3.21.26)

| File | v3.21.26 → v3.21.27 |
|---|---|
| `style.css` | 7284 → 7520 lines (+236 — restored the deletions). `!important` 24 → 24 (refactor preserved). dp-* modifiers preserved. |
| `app.js` | `BUILD` → `20260427-005`. No code changes. |
| `index.html` | All 4 canonical stamps → v3.21.27 / `20260427-005`. |
| `version.js` | `APP_VERSION` → `v3.21.27 Pro`. |
| `document-playbooks.html`, `api-details.html`, `waxframe-user-manual.html`, `what-are-tokens.html`, `prompt-editor.html` | Cache-busts → `3.21.27`. Build → `20260427-005`. |

### Upgrade

Pull and hard-refresh (Ctrl+Shift+R / Cmd+Shift+R). Cache-busts at `3.21.27` ensure returning visitors get the fixed assets immediately.

No session migration. Existing IndexedDB sessions, license keys, project state, and backups load unchanged.

### Test plan

1. Walk every setup screen — Worker Bees, Choose Builder, Your Project, Reference Material, Starting Document. Each should render full-width with content extending to the viewport edge (modulo the `max-width: 1390px` on `.setup-single-card`). No body honeycomb pattern visible on the right side beyond the standard centered-card breathing room.
2. Hover the *AI Setup* nav item in light theme — accent background, black text, no `!important` needed (the refactor target).
3. Document Playbooks page — sub-notes, real-example boxes, and tight paragraphs should render identically to v3.21.26 (the dp-* modifier rules survive).
4. Work screen — full layout, hex grid renders correctly.
5. Dev mode toolbar, Reference Material file upload, Notes drawer, Finish modal — all should render normally.

---

## v3.21.26 Pro — Build `20260427-004`
**Released:** April 27, 2026

CSS hygiene + helper-page sweep. The five findings deferred from v3.21.25's scrutiny pass are wrapped in this release. 54 orphan CSS rule blocks removed (≈226 lines, ~7% of total selectors). Two unnecessary `!important` declarations dropped via specificity refactor. 19 inline `style="..."` attributes pulled into proper class rules. Drifted helper-page version labels normalized. Cache-bust query string added to a previously-uncached external script. style.css comment-header build stamp resynced (had silently lagged in v3.21.25).

### #3 — Specificity refactor on `.nav-item-accent:hover` drops 2 `!important` declarations

The hover state at `style.css:6762` was using `!important` to win against the `[data-theme="light"] .nav-item:hover` rule at specificity (0,2,1) — `.nav-item-accent:hover` alone is only (0,1,1) and loses on cascade. Refactored to `.nav-item.nav-item-accent:hover` at (0,2,1), which ties on specificity and wins on source order without needing `!important`. Identical visual result. `!important` count in `style.css`: 26 → 24.

### #4 — Inline CSS rule violations: 19 of 40 reconciled, 21 documented as carve-outs

**document-playbooks.html (18 → 0).** Eighteen typography-only inline styles consolidated into five new `.dp-*` modifier classes in style.css.

| Pattern | Occurrences | New class |
|---------|---:|-----------|
| `<span style="font-weight:400;font-size:10px;">` (sub-notes inside table cells) | 8 | `.dp-field-sub-note` |
| `<div class="dp-real-example-sub" style="margin-top:12px;margin-bottom:4px;">` | 6 | `.dp-real-example-sub--mid` |
| `<div class="dp-real-example-sub" style="margin-top:14px;margin-bottom:4px;">` | 1 | `.dp-real-example-sub--mid` (standardized 14→12px — visually imperceptible) |
| `<div class="dp-real-example-sub" style="margin-top:0;margin-bottom:6px;">` | 1 | `.dp-real-example-sub--continuation` |
| `<p style="margin:0 0 8px;">` | 1 | `.dp-tight-p` |
| `<ul style="margin:0;padding-left:20px;line-height:1.7;">` | 1 | `.dp-tight-list` |

**api-details.html (1 → 0).** The `<div class="info-card info-card-tips" style="margin-top:32px;">` had a redundant inline override — the existing `.info-card-tips` rule at `style.css:6339` already provides `margin-top: 32px;`. Inline attribute deleted; visual identical.

**index.html (21 → 21, documented as carve-outs).** Two categories of inline style remain and are now formally documented as project-pattern carve-outs rather than violations.

- **15× `style="display:none"` for initial-hidden state** (file inputs, status banners, modal-internal toggle elements, dev toolbar). These are JS-toggle elements — `app.js` reads and writes `element.style.display` directly to show and hide them, including reads of the form `el.style.display !== 'none'` at `app.js:3137` (`testCustomAIConnection`). Refactoring to a `.hidden` utility class would require auditing and rewriting every `style.display` read across the codebase to use `classList.contains('hidden')` or `getComputedStyle()` instead, since a class-hidden element reports `el.style.display === ''` rather than `'none'`. That refactor is non-surgical and was deemed out of scope for a hygiene patch. The 15 inline styles are kept and marked as the project's JS-toggle pattern. A `.hidden` utility may be added later for static-only hide cases that don't involve JS toggling, but YAGNI applies until such a case appears.

- **6× `style="--sx:Xpx;--fall:Ypx;"` on snowflake animation spans** (lines 690-695). These are per-element animation parameters — each snowflake gets its own random horizontal offset and fall distance. Encoding 6 unique values via 6 modifier classes would be more verbose than inline custom properties, and CSS `attr()` for this purpose is not yet broadly supported. Inline custom properties are the canonical idiom for per-instance CSS variables; kept as a documented exception.

### #6 — Cache-bust on `docs-scrollspy.js`

`waxframe-user-manual.html` (line 1305) and `document-playbooks.html` (line 1247) loaded `docs-scrollspy.js` as a bare `<script src="docs-scrollspy.js"></script>` — no `?v=` query string. Every other shared asset on those pages already carried the canonical cache-bust. Returning visitors would have seen stale scrollspy behavior on any future scrollspy update. Both tags now read `<script src="docs-scrollspy.js?v=3.21.26"></script>`.

The full cache-bust target list now consists of `style.css`, `version.js`, `app.js` (index.html only), and `docs-scrollspy.js` (manual + playbooks only). Worth promoting to the canonical version-stamp checklist as a 5th sweep target alongside the existing four (`waxframe-build` meta, `APP_VERSION`, `app.js BUILD`, `app.js?v=` cache-bust). Comment-header `Build:` stamps in helper pages and `style.css` are a 6th, parallel concern handled by the same release-time sweep.

### #7 — Helper-page header version label drift normalized

Five HTML files said *"WaxFrame v2 — &lt;filename&gt;"* in their comment headers, `api-details.html` said *"WaxFrame v3.3 — api-details.html"*, and `style.css` said *"WaxFrame v2 — style.css"*. None of these matched the actual product version (v3.21.26 at this release). The version label was a documentation-only stub that drifted silently because there was no canonical-stamp checklist entry for it. All seven files now read *"WaxFrame — &lt;filename&gt;"* with no version label — the `Build:` stamp on the line below is the canonical reference. Eliminates the drift surface entirely rather than synchronizing a value that would inevitably drift again.

### #9 — 54 orphan CSS rule blocks removed (~226 lines, ~7% of total selectors)

Cross-referenced every top-level class selector in `style.css` against `index.html`, `app.js`, and all five helper pages. Verified no dynamic class construction in `app.js` (template-literal class concatenation, `classList.add`, etc.) before deletion. Compound selectors with mixed orphan + non-orphan classes were inspected individually — all 6 cases turned out to be descendants of orphan parents (e.g., `.work-notes-panel .work-panel-header` — the descendant class is used elsewhere in the DOM but never under a `.work-notes-panel` ancestor, so the rule never fires).

**Removed clusters:**

- **Welcome-card subsystem (16 rules):** `.welcome-choices`, `.welcome-card-icon`, `.welcome-card-body`, `.welcome-card-title`, `.welcome-card-arrow`, `.welcome-info-btn` (+ `:hover`), `.welcome-info-label`, `.welcome-info-row`, `.welcome-info-icon`, `.welcome-info-body` (+ ` strong`), `.welcome-info-note`, `.welcome-footer`, `.welcome-hamburger`. Entire subsystem appears to be a defunct earlier welcome-screen design that was replaced and never reconciled.

- **Project-screen field utilities (9 rules):** `.proj-field-full`, `.proj-field-ver`, `.proj-clear-row--bottom` (×2 — appeared twice in the file), `.project-fields`, `.project-field-wrap .field-lg`, `.project-field-wrap:nth-child(2) .field-sm`, `.field-lg/sm/goal/doc` rule + `:focus` variant.

- **Text utility set (8 rules — never adopted):** `.text-green`, `.text-accent`, `.text-warn`, `.text-error`, `.text-send`, `.text-preview`, `.text-divider`. Defined but never referenced in any HTML or JS.

- **Goal counter / info icon stragglers (5 rules):** `.goal-counter-row`, `.goal-counter-text`, `.goal-info-modal-icon`, `.goal-info-modal-icon-wrap`, `.btn-bee-img`.

- **Setup-card / API-form / hex-icon stragglers (7 rules):** `.setup-card-bee` (×2), `.hex-icon-wrap` (+ stale comment), `.edit-hive-avatar-letter`, `.custom-ai-form-title`, `.import-server-item-badge`, `.api-azure-intro`.

- **Notes-panel descendant rules with no live parent (4 rules):** `.work-notes-panel .work-panel-header`, `.work-notes-panel .round-history`, `.btn-shake-wide.running`, `.round-timer-clock.running` — all four can never match because the parent class `.work-notes-panel` / state class `.btn-shake-wide` / `.round-timer-clock` never appears in the DOM.

- **DP playbook stragglers (5 rules):** `.dp-field-label--scratch`, `.dp-goal-fields`, `.dp-goal-row`, `.dp-goal-label`, `.dp-goal-val`.

- **Singletons (5 rules):** `.badge-api`, `.finish-modal-bee`, `.wh-tag-amber`.

`style.css` is now 7284 lines (was 7512, net -228 lines including the 5 new `.dp-*` modifier rules added under #4). Brace balance preserved: 1566 open / 1566 close in the new file (was 1616 / 1616 — exactly 50 rule blocks of net deletion accounting for the 54 deletions minus the 4 declaration-only rule additions).

### Files changed

- `app.js` — `BUILD` constant `20260427-003` → `20260427-004`. Comment-header `Build:` → `20260427-004`. No code changes.
- `index.html` — `waxframe-build` meta → `20260427-004`. `app.js?v=` / `style.css?v=` / `version.js?v=` all → `3.21.26`. Comment-header build → `20260427-004`. Comment-header version label dropped (`WaxFrame v2` → `WaxFrame`). No structural changes — 21 inline styles preserved as documented carve-outs.
- `version.js` — `APP_VERSION` → `v3.21.26 Pro`.
- `style.css` — 54 orphan rule blocks removed, 5 new `.dp-*` modifier rules added, 1 `.nav-item-accent:hover` block refactored to drop 2 `!important`s. Comment-header build resynced from `20260427-002` (had drifted silently in v3.21.25) → `20260427-004`. Comment-header version label dropped. Net -228 lines.
- `document-playbooks.html` — 18 inline `style="..."` attrs replaced with class modifiers. `style.css?v=` / `version.js?v=` / `docs-scrollspy.js?v=` all → `3.21.26`. Comment-header build → `20260427-004`. Version label dropped.
- `api-details.html` — 1 redundant inline `style="margin-top:32px;"` deleted (class already provides it). `style.css?v=` / `version.js?v=` → `3.21.26`. Comment-header build → `20260427-004`. Version label dropped (was the only file saying `v3.3`).
- `waxframe-user-manual.html` — `docs-scrollspy.js` cache-bust added. `style.css?v=` / `version.js?v=` → `3.21.26`. Comment-header build → `20260427-004`. Version label dropped.
- `what-are-tokens.html`, `prompt-editor.html` — `style.css?v=` / `version.js?v=` → `3.21.26`. Comment-header build → `20260427-004`. Version label dropped.

### Visual / functional impact

None expected for end users. All 54 deleted CSS rules were unreachable (no matching DOM). The `.nav-item-accent:hover` refactor produces visually identical output (same background and text color, just achieved via specificity rather than `!important`). The 18 playbook inline-style replacements use the same numeric values now declared in classes; one outlier 14px → 12px standardization is sub-pixel-perceptible. The api-details inline style was already redundant. Cache-busts ensure returning visitors get the new assets on next load.

### Code health metrics

- `style.css` lines: 7512 → 7284 (-228, -3.0%)
- `style.css` `!important` count: 26 → 24 (-2)
- Inline `style="..."` total across HTML files: 40 → 21 (15 documented JS-toggle carve-outs + 6 documented per-element-animation carve-outs)
- Brace balance in `style.css`: 1566 / 1566 (was 1616 / 1616 — preserved through deletion)
- Total CSS class selectors at top level: 769 → 715 (-54)
- All 4 canonical version stamps in sync. All 8 cache-bust / build-stamp targets in sync site-wide.

---

## v3.21.25 Pro — Build `20260427-003`
**Released:** April 27, 2026

Code hygiene patch. Four surgical cleanups identified during a scrutiny pass on v3.21.24. One latent crash on a setup-screen button is fixed by implementing the missing function it referenced. One genuinely dead function is removed. One mute-guard violation in the unlock cinematic is closed. Two unused local declarations are dropped. CSS dead-code reconciliation, the inline-style cleanup pass, and the helper-page comment-header drift fix are deferred to dedicated future passes — this release stays narrowly surgical.

### #1 — Implement missing `openAllConsoles()` for the Worker Bees setup screen

**The bug.** `index.html` line 99 had a button — *Open API Websites* on the Worker Bees setup screen — wired to `onclick="openAllConsoles()"`. The function did not exist anywhere in the codebase: not in `app.js`, not in `index.html`, not in any helper page. Clicking the button threw `ReferenceError: openAllConsoles is not defined` and aborted whatever flow the user was in. The button was placed there to help new users sign up for or check accounts at all six default AI providers in one click — exactly the scenario where a broken button is most damaging, since first-time users on the setup screen are precisely the audience who need this convenience.

**The fix.** Implemented `openAllConsoles()` as a new function in `app.js` next to its setup-screen siblings (`hideAllDefaultAIs`, `restoreHiddenDefaults`). The function iterates `DEFAULT_AIS` — all six default providers regardless of hidden status, since the user clicked the button to see them all — deduplicates the `apiConsole` URLs via a `Set`, and opens each in a new tab via `window.open(url, '_blank', 'noopener,noreferrer')`. The `noopener,noreferrer` window features prevent the opened pages from accessing the `window.opener` reference back to WaxFrame, which is the standard hardening for any cross-origin tab open. Result is reported via toast based on three outcomes: nothing to open (no URLs found — defensive guard), all blocked by browser popup policy, partial open with some blocked, or all opened cleanly. The first time a user clicks the button on a fresh browser profile, Chrome / Firefox / Safari will surface a one-time *"allow popups from this site?"* prompt; once allowed, all six tabs open cleanly on subsequent invocations.

**Why an implementation rather than a button removal.** Initial scrutiny landed on removing the button on the grounds that each AI row already exposes its own `↗` console link. That reasoning ignored the actual user journey: a brand-new user on the Worker Bees setup screen who has not yet signed up for any of the six default providers needs to make six accounts before they can paste API keys back into WaxFrame. Clicking six individual `↗` links in sequence is six clicks; clicking *Open API Websites* is one click and gets them six tabs to register accounts in. The button is genuinely useful, and removing it would have hidden the original v3.21.24-and-prior intent under a less-visible per-row link. Implemented rather than deleted.

### #2 — Remove dead `refreshModelsForAI` function

**The dead code.** `app.js` defined a 9-line `async function refreshModelsForAI(aiId)` at the old line 366 that was never called from anywhere — confirmed via full-repo grep across `app.js`, `index.html`, all five helper pages, and any template-string class assignment. It cleared the cached models for one provider, refetched, re-rendered the AI row, and toasted *↺ ${ai.name} models refreshed*.

**Origin.** Almost certainly tied to a per-row refresh button that was removed from `renderAIRow` at some earlier point without the function being reconciled — the exact straggler-removal pattern the project rules call out as something to avoid. The whole-list `fetchModelsForProvider` is still in active use via the import-server flow and the per-key test flow, so on-demand model refresh still works through those entry points; the per-row entry was the only orphaned piece.

**The fix.** Function deleted in full from `app.js`. No callers anywhere, so no downstream changes needed.

### #3 — Mute-guard the `playUnlockScene` audio prep block

**The violation.** The project audio-system rule is *"every direct-audio function (`play*Sound` that creates `AudioContext` or `new Audio()`) MUST start with `if (_isMuted) return;` as first statement"*, with an explicit carve-out for scene orchestrators (`playUnlockScene`, `playUnanimousScene`) on the basis that they delegate to gated per-effect helpers. `playUnlockScene` did delegate to gated helpers — `playMetalClang` is correctly guarded — but the orchestrator itself was creating the shared `AudioContext` and fetching / decoding the metal-clang MP3 at the top of the function with no mute check, then passing the already-prepared resources into `playMetalClang` later. When the user is muted, `playMetalClang` correctly returns at its own `_isMuted` guard before playing anything — but by that point an AudioContext had been created, an MP3 fetch had been kicked off, and the decoded buffer was sitting in memory unused.

**The fix.** Wrapped the entire audio-prep block (lines 1136–1143 in the v3.21.24 line numbering) in `if (!_isMuted) { ... }`. `sharedAudioCtx` and `clangBuffer` are now declared as `let ... = null` at the outer scope so they remain in scope for the later `setTimeout(() => playMetalClang(sharedAudioCtx, clangBuffer), 1600)` call. When muted, both arguments arrive at `playMetalClang` as `null` — the function returns at its own `if (_isMuted) return` guard at line 1486 before touching either argument, so passing `null`s is safe. Net effect when muted: no `AudioContext` instantiated, no MP3 fetch, no decode, no buffer held in memory. The visual half of the unlock cinematic plays exactly as before. Inline comment naming v3.21.25 added for `git blame` discoverability and to explain the carve-out reasoning.

### #4 — Drop two unused `const used` declarations in `runBuilderOnly`

**The dead code.** `app.js` lines 6228 and 6270 (in the v3.21.24 line numbering) both contained:

```
if (!isLicensed()) { const used = incrementTrialRound(); updateLicenseBadge(); }
```

`used` was declared and never read. The same pattern at the equivalent `runRound` site (line 6432) does use the local — there it is checked against `FREE_TRIAL_ROUNDS` to surface the *"that was your last free round"* toast on the final trial round. The two `runBuilderOnly` sites were copy-pasted from `runRound` without the trailing if-check, leaving the local declaration as a no-op.

**The fix.** Both lines collapsed to `if (!isLicensed()) { incrementTrialRound(); updateLicenseBadge(); }`, matching the cleaner sibling at line 6057 in the same function. The legitimate `const used = incrementTrialRound()` in `runRound` is unchanged. Behavior is identical at all three sites — the trial counter still increments on every successful round, the license badge still updates, and only the `runRound` site (where the local is actually consumed) still surfaces the last-round toast. Adding parallel last-round toasts to the two `runBuilderOnly` paths was considered and deferred — those are convergence and unanimous-convergence sites, where the user is in celebration mode rather than trial-pressure mode, and a *"last free round"* toast would clash with the convergence celebration. Worth revisiting only if user feedback indicates the toast is missed there.

### Files changed

- `app.js` — removed dead `async function refreshModelsForAI(aiId)` block (9 lines + surrounding whitespace) at the old line 366. Wrapped audio-prep block in `playUnlockScene` (old lines 1136–1143) in `if (!_isMuted) { ... }` with `let sharedAudioCtx`, `let clangBuffer` declarations hoisted outside the guard so they remain in scope for the downstream `playMetalClang` call. Added new `function openAllConsoles()` (24 lines including comment header) in the setup-screen helpers cluster next to `restoreHiddenDefaults`. Dropped unused `const used` from two sites in `runBuilderOnly` (unanimous and majority convergence). `BUILD` constant `20260427-002` → `20260427-003`. Comment-header build → `20260427-003`.
- `index.html` — `waxframe-build` meta `20260427-002` → `20260427-003`. `app.js?v=3.21.24` → `3.21.25`. `style.css?v=3.21.24` → `3.21.25`. `version.js?v=3.21.24` → `3.21.25`. Comment-header build → `20260427-003`. *(No structural HTML change — the *Open API Websites* button at line 99 was briefly removed during this release's surgical pass and immediately restored when the original design intent was clarified. Net diff on this file is stamps only.)*
- `version.js` — `APP_VERSION` `v3.21.24 Pro` → `v3.21.25 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — site-wide cache-bust sweep: `style.css?v=3.21.24` → `3.21.25`, `version.js?v=3.21.24` → `3.21.25`. Comment-header build → `20260427-003` in each.

### Findings deferred from the same scrutiny pass

The pass surfaced five additional findings that were judged out of scope for this surgical release because they require either a focused dedicated pass or a CSS architectural decision:

- **Unnecessary `!important` on `.nav-item-accent:hover`** (`style.css` line 6762–6764, current count 26 declarations). Resolvable via specificity refactor to `.nav-item.nav-item-accent:hover` at (0,2,1) — pair with the next `!important` cleanup pass.
- **Inline CSS rule violations** — 21 `style="..."` attributes in `index.html` (15 of them `display:none` initial-hidden state on file inputs, banners, modals, dev toolbar — needs a `.hidden` utility class, currently absent from `style.css`). 18 in `document-playbooks.html` (small typographic tweaks repeated 3-7× — pull into the `.dp-*` ruleset). 1 in `api-details.html` (`margin-top:32px` on an `.info-card-tips` block).
- **Missing cache-bust on `docs-scrollspy.js`** in `waxframe-user-manual.html` and `document-playbooks.html`. Add `?v=3.21.25` to both tags and consider promoting it to a 5th canonical stamp target alongside the existing four.
- **Helper-page header label drift** — `api-details.html` comment header still says *"WaxFrame v3.3"* while every other helper page says *"WaxFrame v2"*. Cosmetic only; resolve by either dropping the version from comment headers entirely (the `Build:` stamp underneath is enough) or syncing them.
- **57 unused CSS classes** (~7% of total selectors) — notable orphan clusters include the entire `.welcome-card` subsystem (14 selectors), the project-screen field utilities (9 selectors), and the `.text-*` utility set (13 selectors that were apparently never adopted). Worth a dedicated cleanup pass before the next minor version bump.

### Code health metrics

- Total lines: `app.js` ~8210, `style.css` 7512, `index.html` 1628, `version.js` 7.
- `app.js` function count: 278 (was 279 — `refreshModelsForAI` removed, `openAllConsoles` added; net change -0 functions because `refreshModelsForAI` was dead and `openAllConsoles` was missing — they cancel).
- `!important` count in `style.css`: unchanged at 26 (deferred to next pass).
- Empty `catch(e) {}` blocks: 25 (all around `localStorage.setItem` / `removeItem` calls where silent failure is the correct posture for private-mode / quota-exceeded scenarios — defensible pattern, not flagged for change).
- All three `setInterval` calls are paired with `clearInterval` cleanup. No timer leaks.
- All canonical four version stamps in sync. Helper-page cache-bust sweep clean across all five sibling files.

---

## v3.21.24 Pro — Build `20260427-002`
**Released:** April 27, 2026

Surgical bug fix. Finish-modal export-state tracking was scoped to the modal instead of the session, causing the discard guard to fire incorrectly when a user reopened the Finish modal after exporting their work.

### Finish-modal export-state guard — fix incorrect "haven't exported anything" warning on modal reopen

**The bug.** Finish modal opens → user clicks Export Document, Export Transcript, Backup Session in some combination → user closes the modal (via X, navigation, click-outside, or any other path) → user reopens the Finish modal → user clicks Start New Project → discard-confirm modal incorrectly fires *"You haven't exported anything!"* even though the export already happened minutes ago and the files are sitting in the user's Downloads folder.

**Origin.** `showFinishModal()` at line 4975 contained `window._finishExported = false;` — a per-modal-open reset of the export-tracking flag. The flag is *correctly* set to `true` by `exportDocument()` and `exportTranscript()` when those run. But every time `showFinishModal()` ran, the flag was wiped back to `false`, regardless of whether the user had exported in the same session. The visual button-state reset alongside (lines 4984–4991) had the same scoping problem.

**Reproducer (now closed):** Click Finish → click Export Document (button shows ✅ Exported, flag = true) → click Backup Session (no flag interaction) → close modal somehow → reopen Finish modal (`showFinishModal` resets flag to false, resets buttons to pristine) → click Start New Project → guard fires.

**Why the original v3.21.17 design was wrong.** The comment on the deleted block claimed the reset was needed because *"a prior session's '✅ Exported!' textContent and finish-modal-btn-done class persist across modal close/reopen, while the flag is freshly reset to false."* That comment correctly identified a symptom but landed on the wrong fix. The right architectural answer is that **the flag and the button visuals are session-scoped, not modal-scoped**. Both should reset when a new session genuinely begins (i.e., when `clearProject()` runs after the user clicks Start New Project), not when the modal opens. The Finish modal can be opened arbitrarily many times during a single session — every reopen wiped state that should have persisted.

**The fix.** Two surgical changes in `app.js`:

1. **Lines 4975–4991 in `showFinishModal()`.** Removed the `window._finishExported = false` line and the entire button-visual-reset block. Replaced with a five-line guard comment naming v3.21.24 for `git blame` discoverability and explaining why neither reset belongs in `showFinishModal`.
2. **`clearProject()` at line ~2037.** Added `window._finishExported = false;` to the existing session-cleanup block, alongside `round = 1; phase = 'draft'; history = []; docText = '';` and the other session-state resets that already happen there. The button visual reset was *already* present in `clearProject()` at line ~2058 — it has been there since v3.21.17 with a comment explaining why. So adding the flag reset alongside completes the symmetry: both the flag and the visuals now reset together, in the same function, at the moment a new session genuinely begins.

The guard at line 5008 (`if (!window._finishExported && hasContent)`) is unchanged. The two `window._finishExported = true;` sets in `exportDocument()` and `exportTranscript()` are unchanged. The on-export `waxframe:exported` event listener at line ~8128 that updates button visuals when an export completes is unchanged. Only the inappropriate per-modal-open reset is gone.

**Behavior post-fix.**

- *Open Finish modal first time in a session* → flag is `false` (clean session default). Visuals are pristine.
- *Click Export Document* → `exportDocument()` sets flag to `true`. The `waxframe:exported` listener updates the button to "✅ Exported!" with `finish-modal-btn-done` class.
- *Close modal, do other things, reopen Finish modal* → flag remains `true`. Button visuals remain "✅ Exported!" — a useful reminder to the user that they already exported and can safely click Start New Project.
- *Click Start New Project* → guard checks flag: `true`, so guard does NOT fire. `clearProject()` runs. Inside `clearProject()`, the flag resets to `false` and the button visuals reset to pristine — ready for the next session.
- *Builder failure during a round* → does not interact with this code path. Notes drawer fix from v3.21.22 still preserves typed notes on Builder error.

**Adjacent observation.** This is the second time in the v3.21.x line where state that should have been session-scoped was incorrectly modal-scoped or per-action-scoped. The first was the v3.21.22 Notes-prefill removal — `workNotes` was being prefilled with the project goal on every fresh session, and the same bug-spec wrote a guarded cleanup branch in `runRound` to clean up its own prefill. Both fixes follow the same architectural pattern: *transient UI state should not be reset by transient UI actions; it should be reset by the action that genuinely ends the state's lifetime*. For Notes, that lifetime ends when a Builder run completes. For the Finish-modal flag, that lifetime ends when `clearProject()` runs. Worth keeping in mind for future state-reset code: ask "what lifetime does this state belong to?" before deciding where to reset it.

### Files changed

- `app.js` — `showFinishModal()` lines 4975–4991: removed `window._finishExported = false` line and the button-visual-reset block; replaced with a guard comment naming v3.21.24. `clearProject()` line ~2037: added `window._finishExported = false;` to the existing session-cleanup block with an inline guard comment naming v3.21.24. Net change: 19 lines removed from `showFinishModal`, 9 lines (1 reset + 8 comment) added to `clearProject`. `BUILD` constant `20260427-001` → `20260427-002`. Comment-header build → `20260427-002`.
- `index.html` — `waxframe-build` meta `20260427-001` → `20260427-002`. `app.js?v=3.21.23` → `3.21.24`. `style.css?v=3.21.23` → `3.21.24`. `version.js?v=3.21.23` → `3.21.24`. Comment-header build → `20260427-002`.
- `style.css` — Comment-header build only. **No CSS changes.**
- `version.js` — `APP_VERSION` `v3.21.23 Pro` → `v3.21.24 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-bust + comment-header + meta sweep to `3.21.24` / `20260427-002`. **No content changes.**
- `CHANGELOG.md` — this entry.

### What to expect after deploy

Reach a session you want to wrap. Click Finish. Click Export Document — button shows "✅ Exported!". Click Export Transcript — button shows "✅ Exported!". Click anywhere else to close the modal. Reopen Finish. The export buttons remain "✅ Exported!" (no more spurious pristine reset). Click Start New Project. The guard does NOT fire because the flag is still `true` from your earlier exports. The session clears cleanly and you land on a fresh Project screen. If you reopen Finish modal *after* clearProject ran (i.e., the very first time in a new session), buttons are pristine again — exactly as expected.

If you genuinely have not exported in this session and you click Start New Project, the guard fires correctly and asks you to confirm — same as before. The fix only addresses the false-positive case.

---

## v3.21.23 Pro — Build `20260427-001`
**Released:** April 27, 2026

Documentation-only release. No code changes. Adds measured Convergence data and the first real-world example block for the Presentation Outline playbook, completing the playbook's empirical-data treatment alongside the JD, Résumé, Thank-You, Email & Outreach, and Blog Post entries shipped earlier in the v3.21.x line.

### Presentation Outline playbook — measured Convergence and v1-vs-v2 example block

The Presentation Outline playbook joins the suite of measured playbooks with a Convergence label and a real-world example block. Distinct from every other measured playbook in two ways:

1. **First playbook where the v1 run failed to converge and v2 succeeded.** The Wi-Fi 7 Readiness deck was tested twice on different builds. The v1.0 run (40 rounds, 33 minutes, on v3.21.21) used the same Reference Material as v2.0 but left Length Constraint blank and used softer scope language ("Presentation outline (for a slide deck I'll build after)" as Document type, "Executive-ready, direct" as tone). It never reached majority convergence — it ran 40 rounds of phrasing-level churn before the user manually clicked Finish. The v2.0 run (23 rounds, ~30 minutes active wall-clock, on v3.21.22) used `Length Constraint = 12 paragraphs`, tighter scope ("Maximum 12 slides"), and "Formal Final Draft Presentation" as tone. It reached majority convergence at Round 23 with the system stopping on its own (`🏁 Majority convergence — 3 of 5 AIs satisfied. Skipping Builder.`). Same Reference Material, same hive, same Builder — different settings produced fundamentally different outcomes.

2. **First measured playbook where the v2 output is meaningfully better than the v1 output, not just faster to produce.** Comparing the two final documents head-to-head: v2.0 leads with the audience-anchoring 70/25/5 device mix that v1.0 dropped, structures each section with a clean topic sentence ("An opportunistic pilot opportunity exists"), closes with a sharp recommendation phrasing ("Our recommendation: authorize the $95k Wi-Fi 7 pilot..."), and dropped the technical 802.11be deep-dive (320 MHz channels, channel puncturing, MLO, 4096-QAM details) that was wrong for the audience and goal. v1.0 still has that 6-line technical paragraph because the hive never reached convergence on whether to keep or prune it. The Length Constraint anchor in v2.0 forced the hive to make a pruning decision rather than ping-pong indefinitely.

**The operational lesson** is that slide-deck outlines (and other voice-driven, structurally-constrained documents) need a hard length anchor or the hive will polish the same word count of prose forever. The Convergence line on the playbook entry now states this directly: *"Length Constraint must be set — runs without one polish indefinitely (a v1.0 run with the same Reference Material but no length cap ran 40 rounds without converging)."* This is the first playbook in the suite with a "must" instruction baked into the Convergence line.

**Three coordinated edits on the Presentation Outline playbook:**

- **Convergence label** — `Rounds: 4–6 rounds — narrative flow and slide order take iteration` → `Convergence: ≈30 minutes · 23 rounds (measured, not estimated)` with the v1-vs-v2 contrast and the "Length Constraint must be set" directive inline. The 30-minute figure excludes a 49-minute idle gap mid-run (user stepped away between rounds 15 and 16); 79 minutes is the project clock total, ~30 minutes is the active iteration time.

- **Step 5 split rewritten** — both refining-a-draft and from-scratch paths now route reference content through Setup 4 — Reference Material rather than the Notes drawer (matching the Setup 4 / Setup 5 split shipped in v3.21.0 and the no-fetch documentation pattern from Email & Outreach). The from-scratch path explicitly mentions pasting "driving question, recommendation, supporting reasoning, hard constraints (dates, dollar figures), and any context the deck must establish" — the structural shape of the actual v2.0 RM payload.

- **Real-world example block** — verbatim Project-screen values from the v2.0 backup (Project name, Version, Document type "Power Point Presentation", Target audience naming the 1,200-person professional services firm, Desired outcome with the budget question, Scope and constraints with the 12-slide cap, Tone "Formal Final Draft Presentation", Additional instructions left blank, **Length Constraint 12 Paragraphs marked "required for this playbook"**, Starting Document = scratch). Reference Material payload included verbatim as a Courier `<pre>` block — the full 1,322-character payload covering driving question, recommendation, reasoning, context, and hard constraints. No Notes payload because the actual run did not use one. Sub-text on the example block contrasts v1.0 (no length, 40 rounds, no convergence) against v2.0 (12 paragraphs, 23 rounds, converged) so a reader running the playbook understands which lever to pull.

**v3.21.22 fix verification under stress.** The v2.0 Wi-Fi 7 run was conducted on v3.21.22 and confirms two prior fixes holding under a real-world 23-round, 79-minute session: (1) backup race fix v2 — the 480 KB backup produced no `(1)`-suffixed sibling, transcript header stamps `v3.21.22 Pro` / build `20260426-005` correctly, the new filename schema (`Deck-Outline-Wi-Fi-7-Readiness-v2-0-WaxFrame-Backup-20260426-1858.json`) is correct; (2) Notes prefill removal — the saved session blob shows zero rounds with notes typed, exactly as documented. Both v3.21.22 fixes are verified working in production.

### Playbook coverage status after this release

Six of eight playbooks now carry full Convergence labels with measured time-and-rounds plus real-world example blocks:

| Playbook | Convergence | Real-world example |
|---|---|---|
| Birthday Card | Rounds-only `2 rounds typical` | — |
| Cover Letter | Rounds-only `6–10 rounds typical` | — |
| Thank-You Letter | `≈1 minute · 3 rounds (measured)` | ✓ from-scratch (Marco Contractor) |
| Email & Outreach | `≈1 minute · 3 rounds (measured)` | ✓ from-scratch (Ferris at Lightkeeper) |
| Blog Post | `≈13 minutes · 16 rounds (measured)` | ✓ refining-a-draft (Trusting One-Shot AI) |
| Résumé | `≈11 minutes · 11 rounds (measured)` | ✓ refining-a-draft (Dana Reyes) |
| JD | `≈19 minutes · 21 rounds (measured)` | ✓ from-scratch (Altura Systems) |
| **Presentation Outline** | **`≈30 minutes · 23 rounds (measured)`** | **✓ from-scratch + Length Constraint required (Wi-Fi 7 Readiness v2.0)** |

Cover Letter and Birthday Card retain their rounds-only labels and will be promoted to the Convergence pattern opportunistically when measured runs are captured. The split (six measured playbooks vs. two rounds-only playbooks) is itself meaningful — it tells a reader at a glance which playbook entries have full empirical data behind them and which are still based on aspirational round estimates.

### Files changed

- `document-playbooks.html` — Presentation Outline playbook: Rounds line `4–6 rounds` → Convergence `≈30 minutes · 23 rounds (measured, not estimated)` with v1-vs-v2 contrast and Length Constraint directive; Step 5 split rewritten to route both paths through Setup 4 — Reference Material with no-fetch documentation; new Real-world example block (Deck Outline — Wi-Fi 7 Readiness v2.0, 23 rounds, ~30 min) with verbatim Project values, verbatim 1,322-character Reference Material payload, and Length Constraint marked as required. Div balance verified 381 / 381. Cache-bust + comment-header + meta sweep to `3.21.23` / `20260427-001`.
- `index.html` — `waxframe-build` meta `20260426-005` → `20260427-001`. `app.js?v=3.21.22` → `3.21.23`. `style.css?v=3.21.22` → `3.21.23`. `version.js?v=3.21.22` → `3.21.23`. Comment-header build → `20260427-001`.
- `app.js` — `BUILD` constant `20260426-005` → `20260427-001`. Comment-header build `20260426-005` → `20260427-001`. **No code changes.**
- `style.css` — Comment-header build only. **No CSS changes.**
- `version.js` — `APP_VERSION` `v3.21.22 Pro` → `v3.21.23 Pro`.
- `waxframe-user-manual.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-bust + comment-header + meta sweep to `3.21.23` / `20260427-001`. No content changes.
- `CHANGELOG.md` — this entry.

### What to expect after deploy

Open the Document Playbooks page (📋 button on the top bar, or `document-playbooks.html` directly), navigate to the Presentation Outline section. The Convergence label now reads `≈30 minutes · 23 rounds (measured, not estimated)` with the Length Constraint directive inline. A new Real-world example block sits between the scratch-note and the Step 5 section, with full Project-screen values and Reference Material payload from the actual Wi-Fi 7 Readiness v2.0 run. A reader running the playbook for the first time can copy these values verbatim, set Length Constraint to 12 Paragraphs, and reproduce the 23-round convergence pattern.

No behavioral change anywhere else in the application. The Notes drawer still opens empty. Backups still drop one file. The working-document counter still shows pages. All v3.21.21 and v3.21.22 fixes remain in effect.

---

## v3.21.22 Pro — Build `20260426-005`
**Released:** April 26, 2026

Two threads. The first is a five-day-old UX/architecture bug discovered during the Wi-Fi 7 slide-deck playbook test today: the Notes drawer was being silently prefilled with a copy of the assembled project goal at session start, then auto-wiped after Round 1 by a guarded cleanup branch that existed only to mop up the prefill. Both halves of that ugly pair are gone now, and a stale `if (round === 1)` guard that was leftover from the prefill era has also been removed so notes-wipe behavior is now symmetric across the two Builder-run paths. The second thread is the Blog Post playbook update with measured Convergence data — first refining-a-draft real-world example block in the playbook suite.

### Notes drawer prefill removed — and the asymmetric round-1 wipe guard alongside it

**The bug.** Lines 4727–4731 of `app.js` contained an unconditional prefill: on round 1 of any new session, the Notes drawer's textarea (`workNotes`) was populated with `Project goal: ${assembleProjectGoal()}`. The user did not see this happen unless they opened the drawer from the Work screen. The byline counter showed "1 note" at session start, but most users (including the developer running every test in this release line) interpreted that as *the system has notes for me* rather than *the system has put my project goal in there with a confusing label*.

**Origin.** Introduced in **v3.18.1 (April 21, 2026)** with no explicit changelog entry — confirmed by `git log -p --all -S 'Pre-fill notes with project goal'` showing the line first appearing in the v3.18.1 commit. Lived in the codebase across roughly 30 releases (v3.18.1 → v3.21.21) and was active during every project run during that window — Marco Contractor Thank-You, Ferris-at-Lightkeeper Outreach, Stratton County RFP, JD test, Résumé test, Blog Post, every measured-rounds entry currently in the playbook.

**Scope of impact — corrected.** A first-pass analysis suggested the bug inflated Builder context every round of every project for ~30 releases. That framing was wrong. A second wipe site at line 6406 contained the comment *"Clear notes after round 1 so the auto-filled goal doesn't carry forward"* — meaning whoever introduced the prefill at line 4727 also wrote a guarded cleanup branch in `runRound` to wipe it after the first round. The bug was therefore active for **exactly Round 1 of each session**, not every round. From Round 2 onward, the Notes textarea was empty (assuming the user had not typed anything else), and the Builder received only the documented `PROJECT CONTEXT` block — bit-for-bit identical to post-fix behavior.

This makes the bug a **UX-and-architectural-cleanliness bug** more than a meaningful-performance bug. Tracing through `buildPromptForAI()` at line 5772:

- **Reviewers** (5 of 6 AIs in the default hive — Claude, ChatGPT, Gemini, Grok, Perplexity) — see the documented `PROJECT GOAL` block. They do not see `USER NOTES` in any path. Reviewer behavior pre-fix and post-fix is bit-for-bit identical. Every "the hive caught X" anecdote from prior testing (corporate-filler sentence in the Ferris outreach, dropped `[Your Name]` placeholder in the Marco letter, factual hedges in the Blog Post) was a reviewer catch — pure signal, unaffected by this bug.
- **Builder, Round 1 only** (1 of 6 AIs, almost always DeepSeek in this release line) — saw the project goal twice: once truncated as `PROJECT CONTEXT` (300-char summary), once full as `USER NOTES FOR THIS ROUND:` (which contained the prefilled assembled goal). One-shot extra goal-anchoring at the start of each session.
- **Builder, Round 2 and beyond** — saw the project goal once, as `PROJECT CONTEXT`. The `USER NOTES` block was empty (unless the user had typed something) because line 6406 wiped the textarea after Round 1.

**Why it was wrong on principle even though impact was small.** Three reasons:

1. **It contradicted the documented architecture.** The user manual, every playbook, and the prompt-editor docs describe Notes as *Builder-only round-specific directives* — distinct from Project Goal which all reviewers and the Builder receive every round. Prefilling Notes with the project goal violated the documented separation of concerns.

2. **It surprised users at the worst moment.** When a user opens the Notes drawer on a new project, expecting an empty textarea (as documented), and finds a wall of project-goal text staring back labeled "Project goal:" — that is exactly the friction WaxFrame's playbook documentation is built to prevent. The drawer was inviting confusion at the start of every new project.

3. **The user-typed-notes path was corrupted on Round 1.** When a user opened the drawer on Round 1 to type a real note, the textarea already contained the prefilled goal block. Two paths emerged: select-all-delete-then-type (clean — Builder receives only the user's note) or skim-and-append (corrupted — Builder receives `Project goal: <full goal>\n\n<user's actual note>` as one big USER NOTES block, weighting the user's specific directive alongside the full reassembled goal). How often the second path happened across testing is unknowable retroactively, but it could happen on Round 1 of any session.

**The cleanup branch at line 6406 was the second tell.** The presence of `if (round === 1) { ... clear notes ... }` with the comment *"Clear notes after round 1 so the auto-filled goal doesn't carry forward"* is direct evidence that the prefill was a deliberate choice that someone immediately recognized would cause problems if it persisted. The fix at line 6406 only addressed the problem in `runRound`; the equivalent code in `runBuilderOnly` at line 6056 always wiped notes unconditionally after every Builder run. So the two Builder-run paths had asymmetric Notes behavior — `runBuilderOnly` wiped after every round, `runRound` only wiped after Round 1. With the prefill gone, the `round === 1` guard becomes a fossil that produces real asymmetric behavior: Notes typed for Round 5 of a session via `runRound` would carry forward to Round 6's textarea, while Notes typed for Round 5 via `runBuilderOnly` would not. Same user, same intent, different result depending on which footer button they clicked.

**The fix.** Two surgical changes in `app.js`:

1. **Lines 4727–4731 (the prefill).** Removed the `if (isNewSession && round === 1 && goal) { notesTa.value = 'Project goal: ' + goal }` block. Replaced with a twelve-line guard comment explaining what was removed, why, and the v3.21.22 release tag for future `git blame` lookups.
2. **Lines 6406–6410 (the asymmetric wipe guard).** Removed the `if (round === 1)` guard around the notes-wipe in `runRound`. The wipe now runs unconditionally after every successful Builder run, matching `runBuilderOnly` line 6056. Added an eleven-line comment block documenting the cleanup, naming the original buggy behavior, and naming v3.21.22 so future `git blame` finds this entry.

Both wipes are guarded by `if (!builderHadError)` at the function level, so a Builder failure preserves the user's typed notes for retry. That behavior was already correct and was not touched.

**Notes drawer contract — unified.** The four-step contract is now the same regardless of which footer button the user clicks:

1. On session start, drawer is empty.
2. User types a note (or doesn't).
3. On Smoke the Hive or Send to Builder click: capture notes into history (for transcript / revert), send notes to Builder in the prompt envelope, run the round.
4. On Builder success: wipe textarea, reset footer button styling, save session. On Builder failure: preserve notes textarea so retry doesn't lose typing.

This matches the contract the documentation has always described. The code now matches the docs.

**Impact on prior testing — what is and is not known.**

Factual:
- Reviewer behavior pre-fix and post-fix is identical. Every reviewer catch in prior testing remains valid signal.
- The Builder was burning extra context tokens on Round 1 of every session for ~30 releases. Whether that one-round extra goal-anchoring measurably degraded synthesis quality is unknown without controlled re-runs.
- The convergence numbers in the playbooks (`≈19 min · 21 rounds`, `≈11 min · 11 rounds`, `≈13 min · 16 rounds`, `≈1 min · 3 rounds × 2`) are real measurements from real runs collected under the prevailing build at the time of measurement. They remain "measured, not estimated" by the convention's standard.

Unknown:
- Whether post-fix runs converge faster, the same, or marginally differently. Plausible mechanisms exist for "very slightly faster" (one round of cleaner Builder context), "essentially the same" (modern LLMs handle redundant Round 1 context gracefully and Round 1 is the draft round where extra goal-anchoring may be roughly neutral anyway), and there's even an outside chance of "very slightly worse" if the truncated 300-char `PROJECT CONTEXT` was losing detail that the prefilled full-goal in the notes block was completing on Round 1. Without controlled A/B re-runs, all three are live possibilities. The expected magnitude of any of these effects is small, given the bug only acted on one round per session.

A re-run of the Marco Contractor Thank-You playbook on this build will provide one data point (3 rounds in 1 minute pre-fix → ? rounds in ? minutes post-fix). Not done in this release; will be captured opportunistically.

### Blog Post playbook — first measured refining-a-draft real-world example

The Blog Post playbook joins JD, Résumé, Thank-You, and Email & Outreach with a Convergence label and a real-world example block. Distinct from the others in two ways:

1. **First refining-a-draft example in the playbook suite.** Thank-You and Email & Outreach are from-scratch; JD is from-scratch with reference materials; Résumé is refining a short existing draft. The Blog Post example is the first to teach the *upload an existing draft* workflow with Reference Material providing thesis-and-CTA guidance to the hive. A new sub-text on the example block calls this distinction out so a reader running the playbook understands they're seeing a different shape than the Marco Contractor / Ferris from-scratch examples.

2. **Voice-driven content takes more rounds.** The measured run took 16 rounds and 13 minutes — three to five times what the previous playbook entry's `3–5 rounds for most posts` suggested. The new Convergence line acknowledges this directly: *"Voice-driven posts take more rounds than transactional documents because reviewers tune phrasing and rhythm sentence by sentence."* This sets correct expectations for users running blog playbooks for the first time and avoids the disappointment that the previous estimate would have produced.

**Step 5 split rewritten** to route both refining-a-draft and from-scratch paths through Setup 4 — Reference Material, with the no-fetch documentation line repeated (since blog posts often reference real sources, statistics, and current events that the hive cannot fetch). Matches the pattern established by Email & Outreach.

**Real-world example block** uses verbatim Project-screen values from the actual run (Document type `Blog Post`, Target audience naming senior engineers and technical leads, Desired outcome describing the multi-model thesis and click-through CTA, Scope and constraints listing the four required topics, Tone and voice as first-person/slightly-opinionated/conversational, Additional instructions banning specific buzzwords, Length Constraint left blank, Starting Document = Upload File) plus the verbatim Reference Material payload as a Courier `<pre>` block (thesis, concrete 900-word-proposal example with specific numbers, what-to-try-today, and the don't-name-WaxFrame CTA framing). No Notes payload in the example because the actual run used none.

**Bonus signal.** The Blog Post run was conducted on v3.21.21 — the build immediately after the backup race fix v2 and filename schema flip. The two backups produced during the test (`Blog-Why-I-Stopped-Trusting-One-Shot-AI-v1-0-WaxFrame-Backup-20260426-1211.json` at 1MB and `...-1227.json` post-rounds) confirm both v3.21.21 fixes holding under a real-world 16-round, 13-minute, ~5KB document session: filenames use the new project-name-first schema, no `(1)`-suffixed sibling appeared for either backup, transcript header stamps `v3.21.21 Pro` / build `20260426-004` correctly. v3.21.21's backup race fix v2 is verified working in production.

### Files changed

- `app.js` — Removed the round-1 Notes prefill block at lines 4727–4731. Replaced with a twelve-line guard comment documenting the fix and naming v3.21.22. Removed the `if (round === 1)` guard around the notes-wipe in `runRound` at lines 6406–6410. Replaced with an eleven-line guard comment documenting the cleanup. Both wipes (line 6057 in `runBuilderOnly` and line 6418 in `runRound`) now behave identically: capture notes into history, send to Builder, wipe textarea on success, preserve textarea on Builder failure. `BUILD` constant `20260426-004` → `20260426-005`. Comment-header build → `20260426-005`. No other code changes — this is a removal-and-symmetry fix.
- `index.html` — `waxframe-build` meta `20260426-004` → `20260426-005`. `app.js?v=3.21.21` → `3.21.22`. `style.css?v=3.21.21` → `3.21.22`. `version.js?v=3.21.21` → `3.21.22`. Comment-header build → `20260426-005`.
- `style.css` — Comment-header build only. No CSS changes.
- `version.js` — `APP_VERSION` `v3.21.21 Pro` → `v3.21.22 Pro`.
- `document-playbooks.html` — Blog Post playbook updates: Rounds line `3–5 rounds for most posts` → `Convergence: ≈13 minutes · 16 rounds (measured, not estimated)` with the voice-driven-content explanation; Step 5 split rewritten to route both refining-a-draft and from-scratch paths through Setup 4 — Reference Material with no-fetch documentation; new Real-world example block (Blog — Why I Stopped Trusting One-Shot AI v1.0, 16 rounds, 13 minutes) — first refining-a-draft example block in the playbook suite. Div balance verified 377 / 377. Cache-bust + comment-header + meta sweep to `3.21.22` / `20260426-005`.
- `waxframe-user-manual.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-bust + comment-header + meta sweep to `3.21.22` / `20260426-005`. No content changes.
- `CHANGELOG.md` — this entry.

### What to expect after deploy

Open the Notes drawer on any fresh project — it is empty, as the documentation has always claimed. Type a note. Click Smoke the Hive or Send to Builder. After the round completes successfully, the textarea is empty again, ready for the next round's directive. The behavior is now identical regardless of which footer button you clicked. If the Builder fails for any reason (network, API key, etc.), your typed notes remain in the textarea so retry doesn't lose typing. The Blog Post playbook now displays `Convergence: ≈13 minutes · 16 rounds (measured)` and includes a full real-world example block that a user can copy verbatim to reproduce the 16-round refine-a-draft convergence on their own draft.

---

## v3.21.21 Pro — Build `20260426-004`
**Released:** April 26, 2026

Six threads landing together. Real-world testing today (Marco Contractor, Ferris-at-Lightkeeper, Stratton County Schools RFP) drove every change. No speculative features.

### 🚨 Backup empty-file race fix v2 — bumped revoke timeout 1s → 30s

The v3.21.19 fix used `setTimeout(URL.revokeObjectURL, 1000)` to defer the URL revoke after `a.click()`. That window was generous for the 41 KB Marco Contractor backup that originally surfaced the race. It was not generous enough for real-world session sizes. A 473 KB RFP-Response backup (Stratton County Schools Wi-Fi) raced again under v3.21.19, producing the exact same 0-byte placeholder + `filename (1).json` symptom.

Larger blobs take longer for Chrome's download dispatcher to read. 1 second was simply too tight. Bumped the timeout to 30 seconds, which is roughly 30× the worst observed real-world case (a 642 KB JD backup) and provides comfortable safety margin even for hypothetical 100 MB blobs at slow disk write speeds. Memory cost of the deferred revoke is negligible — at most a handful of un-revoked blob URLs in any realistic session, and the page-unload garbage collector cleans them up at session end.

The original v3.21.19 anchor-pattern fix (append to DOM, click, remove, defer revoke) is preserved unchanged — that pattern was correct, only the timeout value needed tuning. Comment block at the call site rewritten to document both fix iterations and the reasoning behind 30 seconds.

A "preparing backup" modal was considered as a UX hedge during diagnosis but rejected after analysis: the click → Save As lag is sub-50ms even for very large backups (`JSON.stringify` on 1 MB is sub-10ms, `await idbGet()` is also fast), so the modal would have slowed the user for no real-world benefit. If session sizes ever push lag into perceptible territory (50 MB+ backups), reconsidering then.

### Backup filename schema reorganized — project name first, "WaxFrame-Backup" suffix

Old schema: `WaxFrame-Backup-{ProjectName}-{Version}-{YYYYMMDD-HHmm}.json`
New schema: `{ProjectName}-{Version}-WaxFrame-Backup-{YYYYMMDD-HHmm}.json`

Examples after upgrade:

```
Resume-Dana-Reyes-Wireless-v1-0-WaxFrame-Backup-20260425-1726.json
Thank-You-Marco-Contractor-v1-0-WaxFrame-Backup-20260426-1015.json
RFP-Response-Stratton-County-Schools-Wi-v1-0-WaxFrame-Backup-20260426-1140.json
```

Reasoning: when a user keeps backups, transcripts, exported documents, and any other project artifacts together in a single folder, alphabetical sort now groups everything by project rather than scattering backups under the `W` of "WaxFrame." A user with five WaxFrame projects sees their backup, transcript, and exported document for project X all sit adjacent in the file listing, regardless of which project they're looking for. Filename-derived metadata (project name, version, kind, timestamp) is preserved — only the order changed.

One template-literal swap in `backupSession()` at the `baseName` declaration. No other download paths are affected; `exportDocument()` and `exportTranscript()` already use a project-name-first convention.

### Working-document counter — pages added, order corrected

The counter under the working-document textarea on the Work screen showed `${visualCount} lines · ${words} words · ${chars} chars`. Two problems surfaced while running the RFP Response playbook:

1. **The counter could not display pages.** The Length Constraint on the Project screen offers a `Pages` unit (with the system internally converting via `WORDS_PER_PAGE = 500` at line 1924 of `app.js`). A user who picks `20 pages` on the Project screen had no way to track progress against that target from the working document — the counter showed lines, words, and characters, none of which mapped cleanly to the page target the prompt envelope was gating against.

2. **The order was mixed-granularity.** `lines · words · chars` is medium → small → smallest. The Reference Material counter (Setup 4 panel and the Work-screen drawer) uses `Chars · Words · Tokens` — smallest → small → larger, ascending granularity. The working-document counter was inconsistent with the rest of the app.

Fix lands in `updateLineNumbers()` at line 4848. Reordered to ascending granularity and appended pages calculated from the existing `WORDS_PER_PAGE` constant so the counter and the length gate cannot disagree. The `≈` prefix on pages matches the length-constraint hint convention (`≈{wordLimit} words`) — both communicate "this is a derived approximation, not a primary count." The `<0.1` floor keeps very short documents from displaying `0.0 pages`, which would read as "you have nothing" when in fact the user might have a single sentence.

The `WORDS_PER_PAGE = 500` constant is unchanged. It's the single-spaced convention (vs. 250-word manuscript convention) appropriate for working documents like RFPs, business proposals, and reports — which are the long-form use cases where page tracking matters most.

After upgrade, the working-document counter reads, for example, `1,034 chars · 187 words · 17 lines · ≈0.4 pages`.

### Convergence label rolled out to four playbooks — time-first metrics

The `Rounds` field in the playbook entries used a "rounds-only" framing that buried wall-clock time inside a paragraph of supporting detail. Time-to-converge is the more compelling number for most users — *"3 rounds in 1 minute"* lands harder than *"2–3 rounds typical."* For four playbooks where measured time data is now in hand, the field has been renamed `Convergence` and the value reformatted to lead with time:

| Playbook | Old | New |
|---|---|---|
| **JD — Network Engineer Altura Systems** | `20–22 rounds typical` | `≈19 minutes · 21 rounds (measured, not estimated)` |
| **Résumé — Dana Reyes Wireless** | `10–12 rounds typical (measured)` | `≈11 minutes · 11 rounds (measured, not estimated)` |
| **Thank-You Letter — Marco Contractor v1** | `2–4 rounds typical` | `≈1 minute · 3 rounds (measured, not estimated)` |
| **Email & Outreach — Ferris at Lightkeeper v1.0** | `2–3 rounds — short documents, focused goal` | `≈1 minute · 3 rounds (measured, not estimated)` |

Cover Letter and Birthday Card retain their `Rounds` labels for now — they have measured round counts but no measured wall-clock data. The split (Convergence-with-time vs. Rounds-only) is itself meaningful: it tells the reader at a glance which playbooks have full empirical data behind them.

The JD entry also picked up an off-by-one correction: the playbook prose previously claimed `Round 22 reached majority convergence` and the example block headline read `JD that took 22 rounds`. The actual transcript shows **Rounds completed: 21** with a 19-minute session duration. Round 21 was the convergence round (the system detected 3-of-4 satisfied at the end of round 21 and skipped what would have been round 22). All references corrected to 21. A footnote in the v3.21.14 CHANGELOG entry documents the correction.

### Two playbook real-world example blocks added — Thank-You and Email & Outreach

Following the JD/Résumé pattern from v3.21.14/v3.21.15, both Thank-You Letter and Email & Outreach playbooks now carry `.dp-real-example` blocks with verbatim Project-screen values and Reference Material payloads from real-world testing:

- **Thank-You — Marco Contractor v1** — 10 Project fields plus the verbatim Reference Material payload (Marco Delgado's contractor work, slab-story anchor, neighbor referral, drop-by offer). Notes payload deliberately omitted because the actual run did not use one — the example reflects what was actually run, not what was hypothesized.
- **Email & Outreach — Ferris at Lightkeeper v1.0** — 10 Project fields plus the verbatim Reference Material payload (Ferris Okafor's LinkedIn quote on unmanaged Wi-Fi, Altura Systems context, ask). The Reference Material payload includes a verbatim quote from a LinkedIn post the user pasted into Setup 4 — illustrating the correct workflow for "reference recent X" constraints when the hive cannot fetch from the web.

Both playbooks' Step 5 scratch paths were also rewritten to route reference content through Setup 4 — Reference Material rather than the Notes drawer, matching the Setup 4 / Setup 5 split that shipped in v3.21.0 and aligning with the Cover Letter and Résumé playbooks. The Email & Outreach Step 5 scratch text adds an explicit line: *"The hive cannot browse the web — anything you want it to reference must be pasted into Reference Material first."* This is the first place in the playbook suite where the no-fetch constraint is stated plainly. Closes a documentation gap the user identified during testing.

### Historical changelog footnote — v3.21.14 round count corrected

The v3.21.14 entry originally described the JD test as reaching majority convergence at *"Round 22"* in three places (prose description, example block headline reference, Files Changed entry). The transcript shows 21 completed rounds. All three references corrected and a dated footnote appended to the v3.21.14 entry explaining the off-by-one and how it was discovered. The Validation section in the v3.21.14 entry was always correct — the 21-rounds figure has been there since release. Only the marketing-prose sentences had the slip.

### Files changed

- `app.js` — `backupSession()` `setTimeout` revoke timeout `1000` → `30000`. `baseName` template-literal: `WaxFrame-Backup-{name}-{ver}` → `{name}-{ver}-WaxFrame-Backup`. Comment block above the download anchor rewritten to document both v3.21.19 and v3.21.21 fix iterations. `updateLineNumbers()` counter line reordered to `chars · words · lines · ≈pages` ascending granularity, appended pages calculation using existing `WORDS_PER_PAGE` constant with `<0.1` floor for short documents, inline comment block above the new line documenting the design choices. `BUILD` constant `20260426-003` → `20260426-004`. Comment-header build → `20260426-004`.
- `index.html` — `waxframe-build` meta `20260426-003` → `20260426-004`. `app.js?v=3.21.20` → `3.21.21`. `style.css?v=3.21.20` → `3.21.21`. `version.js?v=3.21.20` → `3.21.21`. Comment-header build → `20260426-004`.
- `style.css` — Comment-header build only. No CSS changes.
- `version.js` — `APP_VERSION` `v3.21.20 Pro` → `v3.21.21 Pro`.
- `document-playbooks.html` — Four playbook updates: JD (Convergence label, ≈19 min · 21 rounds, off-by-one corrections), Résumé (Convergence label, ≈11 min · 11 rounds), Thank-You (Convergence label, ≈1 min · 3 rounds, RM-first scratch path, real-world example block), Email & Outreach (Convergence label, ≈1 min · 3 rounds, RM-first scratch path with no-fetch documentation, real-world example block). Div balance verified 373 / 373. Cache-bust + comment-header + meta sweep to `3.21.21` / `20260426-004`.
- `waxframe-user-manual.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-bust + comment-header + meta sweep to `3.21.21` / `20260426-004`. No content changes.
- `CHANGELOG.md` — this entry plus a dated footnote on the v3.21.14 entry documenting the JD round-count off-by-one correction.

### What to expect after deploy

A backup click drops one file (no 0-byte sibling, no `(1)` suffix) regardless of session size up to ~100 MB. Existing backup files in your downloads folder retain their old `WaxFrame-Backup-*` filenames; new backups going forward use the project-name-first schema. The working-document counter shows live page progress for any document. Four playbooks display headline `≈X minutes · Y rounds` convergence metrics. The Thank-You and Email & Outreach playbooks now have full real-world example blocks matching the JD and Résumé pattern.

---

## v3.21.20 Pro — Build `20260426-003`
**Released:** April 26, 2026

### Version stamp now appears in exported documents and transcripts

Direct outgrowth of running v1.0 vs v2.0 A/B comparisons on the same project — without a version stamp on the artifact, you have to remember which build produced which file. Now the version is sitting right there in the byline the next time the file gets opened weeks or months from now.

### Document byline — version inline

`exportDocument()` byline before:

```
---
Produced by WaxFrame in 3 rounds and 1 minute.
weirdave.github.io/WaxFrame-Professional
```

After:

```
---
Produced by WaxFrame v3.21.20 Pro in 3 rounds and 1 minute.
weirdave.github.io/WaxFrame-Professional
```

Inserted inline rather than as a new line — keeps the footer compact since the user is supposed to strip the byline before sending the document anyway. The `Pro` suffix comes through naturally because it's part of `APP_VERSION` (which is `v3.21.20 Pro` for the Pro edition and would be `v3.21.20 Free` if Free ever adopted the same byline pattern).

`exportTranscript()`'s end-of-transcript byline gets the same change for consistency.

### Transcript header — `Version:` line added, stale `v2` label dropped

`exportTranscript()` header before:

```
═══════════════════════════════════════════════════════════
WAXFRAME v2 — SESSION TRANSCRIPT
Build: 20260426-002
Project: Thank-You — Marco Contractor
Rounds completed: 4
Session duration: 1 minute
Exported: 4/26/2026, 10:15:01 AM
═══════════════════════════════════════════════════════════
```

After:

```
═══════════════════════════════════════════════════════════
WAXFRAME — SESSION TRANSCRIPT
Version: v3.21.20 Pro
Build: 20260426-003
Project: Thank-You — Marco Contractor
Rounds completed: 4
Session duration: 1 minute
Exported: 4/26/2026, 10:15:01 AM
═══════════════════════════════════════════════════════════
```

Two coordinated changes. First, the `v2` literal in the title line was a stale architecture-era marker that predates the v3.x version line — it made the transcript look like it was from a much older app and conflicted with the actual app version visible elsewhere in the UI. Dropped. The header now reads `WAXFRAME — SESSION TRANSCRIPT`. Second, a new `Version:` line was inserted directly under the title, populated from `APP_VERSION`. The existing `Build:` line was kept because it's the precise stamp diagnostic builds reference — the `Version:` line is the human-readable companion. Together they give both the user-facing version (`v3.21.20 Pro`) and the underlying build stamp (`20260426-003`) for any forensic work.

The stale `v2` literal **only** existed in the user-facing transcript header. The `WaxFrame v2 —` comment headers at the top of `index.html`, `app.js`, and `style.css` reference a different `v2` — the v2 storage architecture generation (matching the `LS_HIVE` / `waxframe_v2_db` / `LS_PROJECT` constants in code). Internal naming, not user-visible. Those are correct as-is and were not touched.

### Why this matters when comparing run-to-run output

Real motivating case: this morning's Thank-You — Marco Contractor v1.0 produced a 9-round, 5-minute output on an earlier build, then v2.0 produced a 3-round, 1-minute output on v3.21.17. The convergence-rate difference between the two versions is direct evidence that the Builder anti-hallucination work and duplicate-option dedup are paying off — but you can only attribute the improvement if you can see *which build produced each file*. With the version stamp baked into both the document footer and the transcript header, A/B comparisons across any future build delta are self-documenting.

### Files changed

- `app.js` — `exportDocument()` byline interpolates `${APP_VERSION}` after `WaxFrame`. `exportTranscript()` header drops the stale `v2` literal and adds a `Version: ${APP_VERSION}` line directly under the title. `exportTranscript()`'s final-document byline matches `exportDocument()`'s pattern. `BUILD` constant `20260426-002` → `20260426-003`. Comment-header build → `20260426-003`.
- `index.html` — `waxframe-build` meta `20260426-002` → `20260426-003`. `app.js?v=3.21.19` → `3.21.20`. `style.css?v=3.21.19` → `3.21.20`. `version.js?v=3.21.19` → `3.21.20`. Comment-header build → `20260426-003`.
- `style.css` — Comment-header build only. No CSS changes.
- `version.js` — `APP_VERSION` `v3.21.19 Pro` → `v3.21.20 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html` — Cache-bust + comment-header + meta sweep to `3.21.20` / `20260426-003`. No content changes.
- `api-details.html` — Same cache-bust sweep. No `waxframe-build` meta on this file (by design).
- `CHANGELOG.md` — this entry.

### What to expect after deploy

Any document or transcript you export from v3.21.20 onward will carry the `v3.21.20 Pro` stamp in its footer (document) or header (transcript). Files exported on prior builds keep whatever footer/header they shipped with — there's no retroactive rewrite. If you go back and export a transcript from an in-flight session that was started on an older build, the new stamp reflects the build that did the export, not the build that ran the rounds — that's correct, since `BUILD` and `APP_VERSION` are set at runtime from the loaded scripts, not from saved session metadata.

---

## v3.21.19 Pro — Build `20260426-002`
**Released:** April 26, 2026

### 🚨 `Backup Session` was producing a 0-byte file plus a `(1)`-suffixed real file from a single click

A real-world test on the Thank-You — Marco Contractor v1.0 project (3 rounds, 1 minute, majority convergence at 4 of 6) surfaced a bug nobody had caught before: clicking 💾 Backup Session in the hamburger menu produced **two** files in the downloads folder for one click. The first file (`WaxFrame-Backup-{name}-{stamp}.json`) was 0 bytes — MD5 = `d41d8cd98f00b204e9800998ecf8427e`, the well-known empty-file hash. The second file (`WaxFrame-Backup-{name}-{stamp} (1).json` — Chrome's de-dup pattern when the same filename gets requested twice in the same minute) contained the actual 41 KB session payload.

Practical impact: a user who opens their downloads folder and grabs the file with the canonical name (no `(1)` suffix) walks away with an empty file. They only get the real backup if they happen to grab the suffixed copy. Worse, a user who relies on filename autocomplete (`WaxFrame-Backup-...` → tab) gets the empty one too. This is exactly the kind of silent data loss the v3.21.10/v3.21.11 work was meant to eliminate.

### Root cause — race between `URL.revokeObjectURL` and Chrome's download dispatcher

`backupSession()` was constructing the download anchor like this:

```js
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const a    = document.createElement('a');
a.href     = URL.createObjectURL(blob);
a.download = `${filename}.json`;
a.click();
URL.revokeObjectURL(a.href);   // ← fires synchronously, races the download
```

Two things conspired:

1. `backupSession()` is **async** because line 7914 awaits `idbGet()` to read the IndexedDB session. By the time `a.click()` runs, the synchronous user-gesture context from the hamburger-menu click has already broken — we're in a microtask continuation, not a sync handler.
2. `URL.revokeObjectURL(a.href)` runs immediately after `click()`. In Chrome, `click()` only **schedules** the download; the dispatcher reads the blob asynchronously. If the URL gets revoked before the dispatcher reads it, the dispatcher writes a 0-byte placeholder, then internally retries with a fresh handle and writes the real file — Chrome appends `(1)` because the original filename slot is taken.

The fix matches the pattern already proven correct in `exportTranscript()` (line 7891 onward, which has shipped since the IDB migration without anyone reporting empty-file issues): append the anchor to the DOM before clicking, remove it after, and defer the revoke with `setTimeout(..., 1000)` so the dispatcher has a full second to start reading the blob before its URL becomes invalid.

```js
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const url  = URL.createObjectURL(blob);
const a    = document.createElement('a');
a.href     = url;
a.download = `${filename}.json`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

Why a full second instead of a tighter timeout: the download dispatcher can take hundreds of milliseconds to start reading on busy systems (large downloads queue, slow disk, heavy tab load). A second is generous enough to cover any realistic case while still letting the URL be reclaimed before page unload. The blob itself is held by reference in the closure, so it isn't GC'd until the timer fires.

### `exportDocument()` carried a related (but not yet biting) version of the same pattern

While auditing the fix, the export-document path at line 7815–7835 was using a stripped-down version of the same anchor pattern:

```js
const blob = new Blob([out], { type: 'text/plain' });
const a    = document.createElement('a');
a.href     = URL.createObjectURL(blob);
a.download = `${filename}.txt`;
a.click();
// no revokeObjectURL at all — tiny memory leak until page unload
```

Two issues here. First, the missing `revokeObjectURL` is a small memory leak — the blob URL stays alive until the page unloads. Second, the anchor is never DOM-attached, which Chrome currently tolerates but Firefox sometimes refuses to honor on detached anchors. Functionally `exportDocument()` works today (it's a sync function with no await, so the user-gesture context is preserved through `click()`), but it's the same fragile pattern that bit `backupSession()` once async entered the picture. Fixed in this release to match the proven `exportTranscript()` pattern: append, click, remove, revoke. Since the function is sync with an unbroken gesture context, a synchronous revoke is safe — no `setTimeout` needed there.

Now all three download paths in `app.js` (`exportDocument`, `exportTranscript`, `backupSession`) use the same pattern. The async one defers the revoke; the two sync ones revoke synchronously. No more drift between download paths.

### Why this slipped past the v3.21.10/v3.21.11 work

The v3.21.10 release rewrote `backupSession()` to read IDB via `await idbGet()` — the change that introduced async into the download path. The validation at the time confirmed that **session data was being captured correctly into the JSON** (which it was — the `(1)` file in this report has correct, complete v3 backup data). Nobody noticed that an empty companion file was also dropping into the downloads folder, because the validation focused on backup *content* rather than file-system *side effects*. The user-visible symptom — "I clicked once, I have two files, one is empty" — only surfaces if you actually look at your downloads folder right after a backup, which most testing didn't do.

### Files changed

- `app.js` — `backupSession()` download block: append anchor to DOM before click, remove after, defer `URL.revokeObjectURL` via `setTimeout(..., 1000)`. Inline comment block added above the new pattern explaining the race. `exportDocument()` download block: append anchor to DOM, remove after, add the missing `URL.revokeObjectURL` (sync, since the function is sync). `BUILD` constant `20260426-001` → `20260426-002`. Comment-header build `20260426-001` → `20260426-002`.
- `index.html` — `waxframe-build` meta `20260426-001` → `20260426-002`. `app.js?v=3.21.18` → `3.21.19`. `style.css?v=3.21.18` → `3.21.19`. `version.js?v=3.21.18` → `3.21.19`. Comment-header build → `20260426-002`.
- `style.css` — Comment-header build `20260426-001` → `20260426-002`. No CSS changes.
- `version.js` — `APP_VERSION` `v3.21.18 Pro` → `v3.21.19 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html` — `style.css?v=` and `version.js?v=` cache-busts → `3.21.19`. `waxframe-build` meta → `20260426-002`. Comment-header build → `20260426-002`. No content changes.
- `api-details.html` — Same cache-bust sweep. Comment-header build → `20260426-002`. No `waxframe-build` meta on this file (by design). No content changes.
- `CHANGELOG.md` — this entry.

### What to expect after deploy

A fresh Backup Session click will now drop **one** file into your downloads folder, with the full session data, named `WaxFrame-Backup-{project}-{version}-{YYYYMMDD-HHmm}.json`. No 0-byte sibling. No `(1)` suffix unless you genuinely click Backup twice in the same minute (in which case the second one correctly gets `(1)` because the filename slot is already taken — that's expected behavior, not the bug).

Existing 0-byte backup files in your downloads folder are confirmed empty and can be safely deleted. The corresponding `(1)`-suffixed file is the real backup.

---

## v3.21.18 Pro — Build `20260426-001`
**Released:** April 26, 2026

Cache-bust + comment-header sweep across all eight files. No behavior change. No code change. Zero risk.

### What this fixes

The canonical four-stamp release checklist (`waxframe-build` meta in `index.html`, `APP_VERSION` in `version.js`, `BUILD` constant in `app.js`, `app.js?v=` cache-bust in `index.html`) had been kept in lockstep through every release in the v3.21.x line. Two adjacent stamps had not — `style.css?v=` and `version.js?v=` cache-busts were last bumped to `3.21.11` in v3.21.11 and have been stale through the six releases since (v3.21.14 → v3.21.17). Same browser-cache trap that prompted the v3.21.2 emergency fix: any user upgrading from v3.21.11 to v3.21.17 today is still being served the v3.21.11-era CSS and `version.js` because the URLs the browser sees haven't changed.

Comment-header build stamps inside the source files (the `Build: YYYYMMDD-NNN` line in the top comment of each file) had also drifted. These aren't part of the canonical four-stamp release checklist so they don't get touched by normal release workflow — they just sit there going stale until they get caught in a sweep. Eight files were stale: three core (`index.html`, `app.js`, `style.css` at `20260425-008`) and five helper pages (`waxframe-user-manual.html` at `20260424-013`, `document-playbooks.html` at `20260422-009`, `api-details.html` at `20260425-008`, `what-are-tokens.html` at `20260415-002`, `prompt-editor.html` at `20260414-002`). Same root cause as v3.21.6 noted: comment-header stamps are easy to forget because nothing references them at runtime, but they're misleading when reading source.

Helper-page `<meta name="waxframe-build">` tags were also stale on the four helpers that carry one (`waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `prompt-editor.html` — `api-details.html` has no meta of this kind). All four now reflect the current build.

### Files changed

- `index.html` — `waxframe-build` meta `20260425-017` → `20260426-001`. `app.js?v=3.21.17` → `3.21.18`. `style.css?v=3.21.11` → `3.21.18`. `version.js?v=3.21.11` → `3.21.18`. Comment-header build `20260425-008` → `20260426-001`.
- `app.js` — `BUILD` constant `20260425-017` → `20260426-001`. Comment-header build `20260425-008` → `20260426-001`. No code changes.
- `style.css` — Comment-header build `20260425-008` → `20260426-001`. No CSS changes. `!important` count unchanged.
- `version.js` — `APP_VERSION` `v3.21.17 Pro` → `v3.21.18 Pro`.
- `waxframe-user-manual.html` — `style.css?v=` and `version.js?v=` cache-busts → `3.21.18`. `waxframe-build` meta `20260424-013` → `20260426-001`. Comment-header build → `20260426-001`. No content changes.
- `document-playbooks.html` — Same sweep. Comment-header build `20260422-009` → `20260426-001`, meta tag updated. No content changes.
- `what-are-tokens.html` — Same sweep. Comment-header build `20260415-002` → `20260426-001`, meta tag updated. No content changes.
- `api-details.html` — Same cache-bust sweep. Comment-header build `20260425-008` → `20260426-001`. No meta tag exists on this file (by design). No content changes.
- `prompt-editor.html` — Same sweep. Comment-header build `20260414-002` → `20260426-001`, meta tag updated. No content changes.
- `CHANGELOG.md` — this entry.

### Audit

Post-sweep grep across `*.html`, `*.js`, `*.css`: zero references to any prior stale stamp (`3.21.11`, `3.21.17` for cache-busts; `20260425-008`, `20260425-017`, `20260424-013`, `20260422-009`, `20260415-002`, `20260414-002` for builds). Fourteen references each to `3.21.18` and `20260426-001`, matching expected propagation.

---

## v3.21.17 Pro — Build `20260425-017`
**Released:** April 25, 2026

Three coupled fixes around the Finish modal's discard guard. Repro: convergence at 4 of 6, click 🏁 Finish on the Work screen, click Export Document, click Export Full Transcript (transcript button visibly flips to `✅ Transcript exported!`), close the modal, hamburger menu → Backup Session, click 🏁 Finish on the Work screen a second time, click Start New Project → native browser dialog *"You haven't exported anything yet"* — directly contradicting the still-visible green checkmark on the transcript button right above it.

### State-sync bug — button visual and `_finishExported` flag drifted apart on modal reopen

`showFinishModal()` resets `window._finishExported = false` on every modal open so the discard guard correctly fires for fresh sessions. The export buttons (`finishBtnDoc`, `finishBtnTranscript`) flip their textContent to `✅ Exported!` / `✅ Transcript exported!` and add the `finish-modal-btn-done` class via the `waxframe:exported` event listener — which only fires while the modal is active, and is the only thing that mutates them. There was no equivalent reset on modal reopen. Result: when `showFinishModal()` ran a second time during the same project session, the flag flipped to `false` while the buttons retained their *Exported!* text and disabled state from the prior open. The guard had no way to know what the user had already done in the previous open of the modal — it correctly read the flag, which had reset, while the user looked at the (un-reset) button DOM and saw a contradiction.

Fix is in `showFinishModal()`: the `dataset.originalHtml` snapshot already captured for both export buttons at `DOMContentLoaded` is now restored on every modal open. Same `forEach` over `['finishBtnDoc', 'finishBtnTranscript']`. `btn.innerHTML = btn.dataset.originalHtml`, `btn.disabled = false`, `btn.classList.remove('finish-modal-btn-done')`. Flag and visual reset together; cannot drift. The flag is per-modal-session, not lifetime — exports from a prior modal open remain safely on disk; the freshly-opened modal correctly treats this session as not yet exported.

### Native `confirm()` replaced with WaxFrame-styled modal

The discard guard called `window.confirm()` directly, which produced a Chrome / Firefox / Safari-styled gray rectangle stamped over the honeycomb-themed Finish modal. Visually broke the entire register of the app and gave the user only a small triangle emoji to signal that something destructive was about to happen. Native `confirm()` also blocks the main thread, so any pre-dialog alert sound played via `AudioContext` would be cut off the instant the dialog opens.

New modal in `index.html`: `discardConfirmModal`. Same structural pattern as the existing `roundErrorModal` — `.finish-modal-overlay` + `.finish-modal.round-error-modal` shells, `.finish-modal-title.round-error-title` heading, `.round-error-body` paragraph, `.round-error-actions` row with two `.finish-modal-btn` buttons, `.finish-modal-cancel` dismiss link. Two action buttons: `← Go back and export` (safe, `.finish-modal-btn-export` green styling, calls `closeDiscardConfirm()`) and `🗑️ Discard and start fresh` (destructive, `.finish-modal-btn-new` amber styling matching the existing destructive treatment, calls `confirmDiscardAndNew()` which closes both modals and proceeds to `clearProject()` + `goToScreen('screen-project')`).

`finishAndNew()` was the only caller of the native `confirm()` and was refactored to call `openDiscardConfirm()` instead. Three new functions added near `finishAndNew`: `openDiscardConfirm`, `closeDiscardConfirm`, `confirmDiscardAndNew`. No CSS additions required — the existing `.finish-modal-overlay` and `.round-error-modal` rules cover the new modal cleanly.

### `playAlertSound()` — short two-chirp attention tone

New sound function next to `playSmokerSound()`. Two ascending sine chirps at 880 Hz then 1320 Hz, each ~80 ms, separated by a 30 ms gap. Short enough not to be annoying, distinct enough to make the user actually look at the screen. Wrapped in the standard `if (_isMuted) return;` guard so it respects the global mute toggle and the standard `try / catch` so it fails silently in environments without `AudioContext` support. Fires from `openDiscardConfirm()` immediately after the modal becomes active.

### Files changed

- `app.js` — `showFinishModal()` now resets export-button DOM alongside the `_finishExported` flag. `finishAndNew()` calls `openDiscardConfirm()` instead of native `confirm()`. New functions: `openDiscardConfirm`, `closeDiscardConfirm`, `confirmDiscardAndNew`, `playAlertSound`. `BUILD` bumped to `20260425-017`.
- `index.html` — New `discardConfirmModal` block inserted after `roundErrorModal`. `waxframe-build` meta bumped to `20260425-017`. `app.js?v=3.21.17` cache-bust.
- `version.js` — `APP_VERSION` `v3.21.17 Pro`.
- `CHANGELOG.md` — this entry.

---

## v3.21.16 Pro — Build `20260425-016`
**Released:** April 25, 2026

Builder hallucination fix. Verified against a real session (Thank-You — Marco Contractor, Round 5) where the Builder fabricated a USER DECISION wholesale: invented the conflict, used a stale `CURRENT` that wasn't in the returned document anymore, attributed both options to AIs who responded with "no changes needed" that round, and silently re-applied a previously-rejected suggestion to the document. The user could see all three failures simultaneously — the Current: link couldn't scroll-to-text because the text wasn't there, the option attributions were verifiably wrong against the live console transcript, and the document had quietly changed without any reviewer asking for that change.

This is not a UI bug. The data going into the conflict panel was poisoned at source by the Builder LLM. Two-layer fix: prompt hardening (preventive) and app-side validation (defensive). Both ship in the same release because LLMs will hallucinate regardless of prompt — the validator catches what the rules miss.

### Builder prompt — anti-hallucination rules

Appended a new **ANTI-HALLUCINATION RULES** block to `BUILDER_INSTRUCTIONS.refine`'s USER DECISION format section, after the existing rules and the em-dash rule. Four rules, each addressing one of the failure modes observed in the test session:

- **THIS-ROUND ONLY** — only emit a USER DECISION for a phrasing one or more reviewers proposed an alternative for in this round. No carrying conflicts forward. No re-surfacing previously-rejected suggestions. This addresses the "Builder dredged up Perplexity's Round 4 rejected proposal and re-attributed it to Grok in Round 5" failure.
- **ATTRIBUTION INTEGRITY** — each `OPTION_N`'s named AI must have proposed that option's exact text (or unambiguous near-paraphrase) in their response in this round. Do not attribute options to AIs whose response was "NO CHANGES NEEDED." This addresses the "Grok said no changes needed but the Builder claimed Grok suggested an option" failure.
- **CURRENT MUST BE LIVE** — `CURRENT` must be verbatim text that exists in the document the Builder is emitting in `%%DOCUMENT_START%%`. The Builder is told explicitly to perform a substring check before finalising the conflicts block. This addresses the "Current: link unfindable in document" failure that surfaced as a broken highlighter.
- **DO NOT BOTH APPLY AND FLAG** — if a reviewer's suggestion was applied to the document, do not also surface it as a USER DECISION. The user resolves USER DECISIONs by replacing `CURRENT` with their chosen option in the document — both ends of that operation must be live in the doc. This addresses the silent-application failure where the Builder applied a change AND surfaced it as a choice.

### App-side validation — `validateUserDecisions()`

New function in `app.js` next to `extractConflicts()`. Runs after `extractConflicts()` returns and before `window._lastConflicts` is set, only on the multi-reviewer Builder synthesis path (the Builder Only path has no reviewer responses to validate against, so it's skipped). Three checks per USER DECISION:

1. **CURRENT must be a live substring of the returned document.** Case-insensitive `String.includes()` check. If `CURRENT` isn't in the doc, the resolution mechanism (replace CURRENT with chosen option in the doc) cannot work — drop the entire decision and log a `'warn'`-level console message naming the suppressed CURRENT.
2. **Each option's named AIs must have actually said something resembling the option text in their response THIS round.** Attribution string is split on `,`, `/`, `&`, and " and " (case-insensitive). Each token is looked up in the round's reviewer set. AIs absent from the round, or whose `noChanges` flag is set, are stripped from the attribution. AIs present in the round get a substring check: their response (lowercased) must contain the option text (lowercased). Strip the attribution if not. Log every strip.
3. **After stripping, must have at least 2 verifiable options.** If fewer than 2 options retain at least one verified attribution, drop the whole decision. Log the suppression with the question text preview.

Reviews shape consumed: `[{ ai: { id, name }, response, success, noChanges }, ...]` — already constructed at line ~6113 of `app.js` as `successfulReviews`. Validator is wired in at the call site immediately after `extractConflicts()` and mutates `conflicts.userDecisions` in place before the result is stored in `window._lastConflicts`.

Every drop and strip surfaces in the live console as a yellow `'warn'` message, so when the validator catches a hallucination the user can see what was suppressed and why. This is intentional: silent correction would hide the underlying Builder reliability issue. Visible correction lets the user see whether their chosen Builder model is reliable.

### Files changed

- `app.js` — Appended ANTI-HALLUCINATION RULES block to `BUILDER_INSTRUCTIONS.refine` USER DECISION rules section. New `validateUserDecisions()` function inserted after `extractConflicts()` (~80 lines including header comment). Validator wired in at the multi-reviewer Builder synthesis call site (right after `extractConflicts()`, before `window._lastConflicts` assignment). `BUILD` bumped to `20260425-016`.
- `index.html` — `waxframe-build` meta bumped to `20260425-016`. `app.js?v=3.21.16` cache-bust.
- `version.js` — `APP_VERSION` `v3.21.16 Pro`.
- `CHANGELOG.md` — this entry.

### Notes for the user

The validator only protects rounds run on v3.21.16 and later. USER DECISIONs already saved in an in-flight session from a prior build will not be retroactively cleaned. To clear a hallucinated decision in a session that pre-dates this build: pick Custom and type the live document text, or use the bypass option to ignore the decision and let the next round proceed.

If you see frequent `'warn'` messages from the validator on a specific Builder model, that model is hallucinating during synthesis. Consider switching Builders via Change Builder on the Work screen.

---

## v3.21.15 Pro — Build `20260425-015`
**Released:** April 25, 2026

A small follow-up to v3.21.14: project clock now stops at convergence, plus the Résumé playbook gets its own real-world example block (matching the JD playbook) with a callout teaching mid-stream Notes injection.

### Project clock stops at convergence

The project clock kept ticking after the convergence flyby fired. The byline at export time would then include any minutes the user spent reading the convergence message, exporting, or just looking at the screen — making the reported "time to produce" inaccurate. The Dana Reyes résumé that converged in 11 rounds reported 11 minutes in the byline, but wall-clock from Round 1 start to majority convergence was 29 minutes (with a ~15-minute idle gap mid-run that the clock correctly didn't count). The remaining gap between actual convergence time and byline time was the post-convergence drift this fixes.

Added a `projectClockPause()` call at both convergence detection points in `app.js`: the unanimous path (line ~6152, all reviewers report no further changes) and the majority path (line ~6193, 4+ of 6 satisfied with holdouts). Both already called `stopRoundTimer()` at the same hook point — the project clock was the missing companion. Pause, not reset — so if the user keeps iterating after majority convergence (which is allowed), they can resume the clock manually via the play button.

### Résumé playbook — measured 11-round real-world example

The Résumé playbook said `3–5 rounds typical — more if starting from scratch` — same aspirational pattern as the JD playbook before it got measured in v3.21.14. After running the Dana Reyes Wireless résumé project end-to-end with reference materials (target job posting) and a Notes payload added on Round 2, the real number is **10–12 rounds**. Round 11 reached majority convergence (4 of 6 AIs satisfied) with 3 of those 4 simply confirming no further changes needed.

Updated the Rounds line: *"10–12 rounds typical (measured, not estimated) — even refining a strong existing draft with reference materials and notes, real convergence on a quality résumé takes 10+ rounds. Round 11 reached majority convergence (4 of 6 AIs satisfied) with 3 of those 4 simply confirming no further changes needed."*

Added a **Real-world example — Résumé that took 11 rounds** block matching the JD playbook structure, with concrete values for every Project screen field (project name, version, document type, target audience, desired outcome, scope and constraints, tone and voice, additional instructions, length constraint, starting document choice — Paste Text in this case) plus the verbatim starting document as a Courier New `<pre>` block and the Notes payload added after Round 2 as a separate `<pre>` block.

### Mid-stream Notes injection — taught explicitly in the Résumé playbook

Between the starting document `<pre>` and the notes payload `<pre>`, added a prominent **Mid-stream Notes injection — paste between Round 2 and Round 3, not at the start** callout. Where the JD playbook teaches **upfront notes injection** (everything loaded at Round 1), the Résumé playbook now teaches **mid-stream notes injection** as a deliberate technique: hold key facts back, let the hive read the existing draft on its own terms, then drop "I forgot to mention" details mid-project.

The callout explains the workflow (paste between Round 2 and Round 3, the next round runs as Builder Only and incorporates the new facts directly without another reviewer voting cycle), the design semantics (Notes are one-shot — applied to the next round only, then cleared automatically), and the use case (forgotten facts or new context introduced mid-project without restarting from scratch). Two distinct valid techniques are now taught across the playbooks instead of one.

### Files changed

- `index.html` — `waxframe-build` meta bumped to `20260425-015`. `app.js?v=3.21.15` cache-bust.
- `app.js` — `projectClockPause()` calls added at both convergence detection points (unanimous and majority). `BUILD` bumped to `20260425-015`.
- `version.js` — `APP_VERSION` `v3.21.15 Pro`.
- `document-playbooks.html` — Résumé playbook Rounds line updated to measured 10–12 with the Round 11 majority-convergence detail. New Real-world example block (Dana Reyes 11-round test) inserted after the existing Step 3 scratch-note. New Mid-stream Notes injection callout between the starting document `<pre>` and the notes payload `<pre>`. Div balance verified 365 / 365.

---

## v3.21.14 Pro — Build `20260425-013`
**Released:** April 25, 2026

### Tagline punctuation fixed everywhere

The tagline read `Many minds. One refined result.` in ten places across the product (welcome screen, five `.fs-logo-tag` instances on helper screens, work screen right-panel logo, nav panel, README, user manual print header). The mid-sentence period split it into two short fragments. Replaced the period with a comma and lowercased the second word so it now reads `Many minds, one refined result.` as one continuous sentence with a comma pause. Eight of the ten instances render uppercase via CSS `text-transform: uppercase`, so the source-case change is invisible to users for those — but the underlying grammar is now correct everywhere. The two visible instances (README markdown bold, user manual print header) read more naturally.

### Version stamp added under the tagline on the work screen

The right-panel logo block on the work screen showed only the WaxFrame wordmark and tagline, with no version indicator inside the document workspace itself. Users had to navigate to the About modal or check the top-right corner to see which version they were on. Added a new `.work-right-logo-version` element under the tagline that auto-populates from `APP_VERSION` via the existing `.app-version-stamp` class — it follows whatever `version.js` says, no manual maintenance required. The version line uses dimmer styling than the tagline (`rgba(255,255,255,0.55)` vs `rgba(255,255,255,0.8)`) so it doesn't compete visually. Scales down at the laptop breakpoints (1700px, 1500px) and hides together with the tagline at 1600px to keep the right panel uncluttered on smaller laptops.

### Job Description playbook updated with measured round count and real-world example

The `Rounds` line in the JD playbook said `3–4 rounds typical` — an aspirational estimate that did not reflect actual convergence behavior. After running a full JD project from scratch with reference materials in v3.21.11, the real number is `20–22 rounds typical`. Updated the playbook entry to reflect this with the framing that even from scratch with full reference materials, real convergence on a quality JD takes 20+ rounds, not 3–5. Round 21 of the test reached majority convergence (3 of 4 AIs satisfied) with the holdout offering minor wording suggestions. Marked `(measured, not estimated)` to match the credibility convention already used in the Birthday Card and Cover Letter playbook entries.

Added a new `Real-world example — JD that took 21 rounds` block after the Step 3 table, showing concrete values for every Project screen field (project name, version, document type, target audience, desired outcome, scope and constraints, tone and voice, additional instructions, length constraint, starting document choice) plus the full Notes payload as a Courier New `<pre>` block. A beginner can copy these values verbatim, run the playbook end-to-end, and reproduce the convergence result. Once they understand the rhythm, they swap in their own role and notes for later runs. New `.dp-real-example` CSS class added with amber accent (matches the WaxFrame honey theme, differentiates from the blue scratch-note block already in the playbook).

### Storage scaffolding cleanup — paranoid layers removed now that the real fix is in place and validated

The data-loss bug was actually fixed in v3.21.11 by removing Guard #1 from `saveSession` and stripping the default console entry on first real log. Several defensive layers were added during the bug hunt that turned out to be unnecessary scaffolding once the root cause was found. Persistence is now granted by Firefox after bookmarking, IDB writes commit cleanly every round, and a 642 KB backup taken after a 21-round JD test confirmed every round, the full console history, the document state, the project clock, and the resolved decisions all persist correctly. With the real fix validated end-to-end, the scaffolding can come out.

Removed in `app.js`:

- The Track B dev-mode trace block in `saveSession` that logged every save call with a stack trace behind the `waxframe_dev` flag — only useful while hunting the bug, now noise.
- The Guard #2 IDB-read-and-compare write-guard inside `_saveSessionChain` that read stored data on every save and refused to write if in-memory was empty but stored had data — was added to catch Guard #1 misfires; with Guard #1 gone, this never fires and is overhead on every save.
- The `LS_SESSION_MIRROR` write that copied the full session to localStorage after every successful IDB commit — was added as belt-and-suspenders redundancy against IDB eviction; with Firefox persistent storage now granted, IDB cannot be evicted without explicit user action, making the mirror redundant. Removing the mirror also reclaims the localStorage quota the duplicate session was eating.
- The `LS_SESSION_MIRROR` fallback read in `loadSession` that recovered from the mirror if IDB returned null.
- The `LS_SESSION_MIRROR` fallback read in the `startSession` pre-launch storage verify (still reads IDB, just no longer falls through to a mirror that no longer exists).
- The `LS_SESSION_MIRROR` field from the backup format. Backup format bumped to `v3` to mark the change. v2 backups (from v3.21.10 and v3.21.11) still import correctly — `LS_SESSION_MIRROR` field in old backups is ignored; the IDB session is the single source of truth.
- The `LS_SESSION_MIRROR` constant declaration.
- The legacy `aihive_v2_db` purge block in `DOMContentLoaded` that ran a one-time `indexedDB.deleteDatabase('aihive_v2_db')` to clean up orphan data from before the rename. Only the developer and one tester have downloaded the program, both already cleaned, so the purge has no remaining purpose.
- Verbose multi-paragraph comments throughout `saveSession` documenting the removed scaffolding.

Kept (these earned their place during the investigation and stay):

- `_saveSessionChain` write serialization — chains every saveSession through the previous one's promise so writes never overlap. Low cost, real race protection.
- Pre-launch storage verify in `startSession` — reads IDB before launching a new session and warns the user if stored data exists but didn't load into memory. Catches silent loadSession failures.
- Persist retry every 3 rounds inside `saveSession` — re-requests `navigator.storage.persist()` if not yet granted; cheap, idempotent, and helped Firefox grant persistence during the validation test.
- Backup format v3 with `IDB_SESSION` field — fixes the silent empty-backup bug from v3.21.10 where pre-IDB-migration backups had `LS_SESSION: null` and lost all round data.
- The actual bug fix from v3.21.11 — `consoleLog` strips the page-load default entry on first real log, and Guard #1 removed entirely.
- IDB-failure fallback to legacy `LS_SESSION` key — kept for defense in depth in the unlikely case IDB ever throws on write.

### New project flow no longer races against the previous session's IDB delete

The data-loss saga had a residual bug nobody hit until a real second-project test ran. After finishing one project (say the 21-round Altura JD) and clicking "Finish → Start New Project," the user moved through Setup screens 2–5 and clicked Launch on the new project. On launch, the pre-launch storage verify saw the OLD session still sitting in IDB and threw a confirm dialog: "A saved session exists in browser storage (21 rounds, 1,750 chars in document) but did NOT load into memory."

The dialog itself was correct behavior for a real load failure — but this wasn't a load failure. It was a race condition. `clearProject()` had been calling `idbClear().catch(() => {})` as fire-and-forget. The async IDB delete didn't complete before the user moved through the new project setup faster than the disk delete. By Launch time, IDB still held the old session.

Made `clearProject()` async and `await idbClear()` inside it. Updated the only caller (`finishAndNew`) to await `clearProject()`. Now by the time screen navigation moves to the new project, IDB is genuinely empty. The pre-launch verify becomes a true safety net for actual load failures rather than firing on legitimate new-project flows.

The bandaid path I started writing — a "smart project-name comparison" inside the verify itself that would silently clear if names differed — got reverted. Fixing the upstream race directly is correct; gating the verify with downstream comparison logic was scope creep.

### Tagline / version-stamp typography unified — Path A

The tagline and version stamp at five locations across the product (welcome screen, work-screen right panel, two helper-screen brand spots, nav panel) were sized inconsistently. The work-screen version stamp added in `-009` was 11px under a 13px tagline, but more importantly the *relationship* between tagline and version differed at every location: welcome screen had a 4-point gap (15/11), work right had a 2-point gap (13/11), helper screens had a 2-point gap (12/10), nav panel had a 0-point gap (10/10).

Adopted a consistent rule across all five pairs: **version is always tagline minus 2 points, with a floor of 9px.** Within each pair, color, font-weight, letter-spacing, and text-transform all match — they read as one typographic system, just sized down. The absolute size scales with the canvas (welcome screen wordmark is hero-sized so its tagline+version pair sits bigger; nav panel is compact so its pair sits smaller), which mirrors how brand systems treat logos at different scales (Coca-Cola's logo varies in size by surface, but the *relationship* of the logo to its surroundings stays consistent).

Three CSS rules touched:
- `.welcome-brand .app-version-stamp` — new override pinning welcome version to 13px (was inheriting 11px from the base rule), font-weight 600 to match welcome tagline
- `.nav-panel-version` — 10px → 9px (was matching tagline at 10/10, now follows minus-2 rule)
- `.work-right-logo-version` at the 1700px breakpoint — 10px → 9px (tagline at that breakpoint is 11px)

The work-screen base pair (13/11) and helper-screen pairs (12/10) already complied with the rule — no change needed there.

### Clear button added to both Paste Text fields

Reference Material → Paste Text and Starting Document → Paste Text had no way to empty the textarea other than manual select-all-and-delete. Added a small `✕ Clear text` button below each paste textarea, mirroring the existing `✕ Remove file` button on the Upload File tabs. Clears the textarea, resets line numbers, focuses the textarea for immediate re-paste, and triggers the same downstream updates as a normal user-initiated empty (saveProject for reference material, updateDocRequirements for starting document).

Two new functions in `app.js` (`clearPasteText` and `clearRefPasteText`) sized to mirror the existing `clearUploadedFile` pattern. Two new HTML rows in `index.html` reusing the existing `.file-clear-row` CSS class so the visual treatment matches the upload tab's clear button exactly. No new CSS needed.

### Pasted starting document now persists like uploaded files do

Behavioral asymmetry between Upload File and Paste Text in the Starting Document setup that had been there since the upload feature shipped: uploading a file triggered an immediate `saveSession()` after extraction, so the document text was on disk the moment the green status pill appeared. Pasting text into the textarea, by contrast, only persisted when the user clicked Launch — until then it was DOM-only and a refresh blew it away. No data loss for completed projects, but a one-off behavior gap that surprised users on first encounter.

Closed the gap. Added a `pastedDocument` field to `LS_PROJECT` (alongside the existing `referenceMaterial` field), with a debounced 250ms auto-save on every keystroke in the paste textarea. `loadSettings` restores the field to the textarea on page load, mirroring how reference material is restored. `clearPasteText` now also calls `saveProject()` so the cleared state persists. `handlePasteTextInput` is the new oninput handler — replaces the previous inline `updateProjLineNums + updateDocRequirements` calls with a function that does both plus the debounced save.

Result: refresh at any point during project setup is now safe across all three Starting Document modes — upload, paste, and scratch.

### Files changed

- `index.html` — 8 tagline edits, `.work-right-logo-version` div added under work-screen tagline, two new `.file-clear-row` blocks for paste-textarea clear buttons (Reference Material paste panel and Starting Document paste panel). `pasteText` textarea `oninput` updated to call new `handlePasteTextInput()`. `waxframe-build` meta `20260425-013`. `app.js?v=3.21.14` cache-bust.
- `style.css` — `.work-right-logo-version` rule plus matching breakpoint rules at 1700px (now 9px per Path A), 1500px (9px per Path A floor), 1600px (hide). `.dp-real-example` block of rules for the playbook example card. New `.welcome-brand .app-version-stamp` override for Path A welcome pair. `.nav-panel-version` font-size changed from 10px to 9px per Path A.
- `README.md` — tagline edit.
- `waxframe-user-manual.html` — tagline edit (print header sub).
- `app.js` — full storage cleanup (Track B trace, Guard #2, LS_SESSION_MIRROR, legacy aihive_v2_db purge, verbose comments). `clearProject` made async with awaited `idbClear()`. `finishAndNew` made async with awaited `clearProject()`. New functions `clearPasteText`, `clearRefPasteText`, and `handlePasteTextInput`. New `pastedDocument` field added to `saveProject` and restored in `loadSettings`. New `pasteTextSaveTimer` debounce global. `BUILD` `20260425-013`.
- `version.js` — `APP_VERSION` `v3.21.14 Pro`.
- `document-playbooks.html` — JD playbook Rounds line rewritten with measured 21-round data. New Real-world example block (Altura Systems JD test) inserted after the existing Step 3 scratch-note. Div balance verified 359 / 359.

### Validation prior to this release

A full JD project ran end-to-end on v3.21.11 (which has the same `saveSession` and `loadSession` logic as v3.21.14 once the dev trace, mirror, Guard #2, and legacy purge are stripped — the cleanup is removal-only, not behavioral change). 21 completed rounds, 88,308 character console log, 1,750 character document, 1,109 second project clock, resolved decisions persisted across 4 rounds, 642 KB backup containing complete IDB session. Every assertion in the bug-fix story checked out. v3.21.14 retains all the validated behavior and removes only the scaffolding.

### Footnote — Round count corrected, 26 Apr 2026

This entry originally described the test as reaching majority convergence at *"Round 22"* and the example block headline as *"JD that took 22 rounds."* The actual transcript shows **Rounds completed: 21** with a 19-minute session duration (project clock 1,109 seconds, consistent with the Validation section above which was always correct). Three references corrected here on 26 Apr 2026: the prose description, the example block headline reference, and the Files Changed entry. The off-by-one came from confusing the round number where the system *detected* convergence and would have started round 22 — with the round number that actually produced the converged document (round 21). Discovered while extracting time-to-converge data from the original transcript for the playbook prominence update that's coming in the next release.

---

## v3.21.11 Pro — Build `20260425-008`
**Released:** April 25, 2026

### 🚨 Root cause found: Guard #1 has been silently blocking every saveSession call after Round 1

The data-loss bug we've been chasing for the last several releases was not eviction, not a race, not a write-guard misfire, not the backup function bug. It was simpler and worse: **the existing Guard #1 in `saveSession()` has been blocking 100% of save attempts after Round 1 since the guard was first added.**

#### How the bug worked

The default page-load console state, set in `index.html`, is a single div:

```html
<div class="console-entry console-info">Console ready — Smoke the hive to begin.</div>
```

`consoleLog()` adds new entries via `el.prepend(entry)` — new entries go to the **top** of the console. The default "Console ready" entry stays at the **bottom**, untouched, forever. After every round, after every API request, after every event, the default entry is still sitting there as the last child of `#liveConsole`.

`saveSession()` had a guard intended to prevent saves before `loadSession()` had a chance to restore the real `consoleHTML`:

```js
const DEFAULT_CONSOLE_MSG = 'Console ready — Smoke the hive to begin.';
if (history.length > 0 && (!consoleHTML.trim() || consoleHTML.includes(DEFAULT_CONSOLE_MSG))) {
  return;
}
```

The intent: "if in-memory has rounds but the DOM console looks like it just loaded, skip — `loadSession` hasn't restored real consoleHTML yet."

The bug: `consoleHTML.includes(DEFAULT_CONSOLE_MSG)` returns `true` **forever**, because the default entry is never removed from the DOM. Once `history.length > 0` (after Round 1 completes), the guard fires on every subsequent save — **even saves that have completely legitimate data** with a fully populated console containing 50+ real entries.

Result: Round 1 completes → `history.push(round1)` → `saveSession()` fires → Guard #1 trips because default entry still in DOM → `return` → no IDB write. Round 2 completes → same thing. Round 3 completes → same thing. The IDB blob remained at its page-load default state of `{round:1, history:[], docText:""}` for the entire session, no matter how many rounds ran.

#### How the fix works

`consoleLog()` now removes the default page-load entry on its first real call:

```js
const defaultEntry = el.querySelector('.console-entry.console-info');
if (defaultEntry && defaultEntry.textContent.includes('Smoke the hive to begin')) {
  defaultEntry.remove();
}
```

Once any real activity has logged, the default entry is gone from the DOM. `consoleHTML.includes(DEFAULT_CONSOLE_MSG)` correctly returns `false` from then on. Guard #1 only trips when it should — between page load and the first real log entry.

This also matches the original UX intent: the "Console ready" message is a placeholder for empty state, not a permanent footer.

#### Why earlier hardening didn't help

- **v3.21.9 added the save serialization chain, write-guard #2, LS mirror, pre-launch verify, and persist retry.** None of those mechanisms ever ran, because `saveSession` returned at Guard #1 before reaching the chain. The protections were structurally correct but executed zero times in practice.
- **v3.21.10 fixed the backup/restore to capture and restore IDB session.** Correct fix for a real bug, but didn't address why IDB was empty in the first place.
- **The dev-mode trace from v3.21.9** would have shown `[saveSession] BLOCKED by guard #1 — in-memory has data but DOM console is default` on every save after Round 1, which would have pointed straight at this. We had the diagnostic instrument; we didn't run it before today.

#### What this means for your data

Once v3.21.11 is deployed, complete a round and check IDB. You should now see populated `history`, `docText`, `consoleHTML`, etc. in the `current` key of `waxframe_v2_db / session`. A backup at that point will contain real session data. A hard refresh after that point will resume your session.

Sessions started before v3.21.11 cannot be recovered — they were never persisted in the first place. Going forward, the IDB write actually happens, the LS mirror is populated as redundancy, and backups capture full state.

#### A note on Guard #1's design

The guard was added in good faith to protect against a real concern (page-load saveSession races), but the implementation had a wrong assumption: that the default entry is a transient state that goes away on its own. It doesn't — the implementation never removed it. The fix is to actually remove it when real activity begins, which makes the guard's check correct. The guard logic itself is unchanged.

### Files Changed

- `app.js` — Modified `consoleLog()` to remove the default page-load entry on first real call. Bumped `BUILD` to `20260425-008` and the comment-header build to match.
- `index.html` — Bumped `waxframe-build` meta to `20260425-008` and all cache-busts to `3.21.11`. Comment-header build bumped.
- `version.js` — Bumped `APP_VERSION` to `v3.21.11 Pro`.
- `style.css`, `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-busts and comment-header builds bumped to `3.21.11` / `20260425-008`. No content changes.
- `README.md` — Version + Build badges bumped.
- `CHANGELOG.md` — This entry.

---

## v3.21.10 Pro — Build `20260425-007`
**Released:** April 25, 2026

### 🚨 Backup and restore now actually capture session data

`backupSession()` and `importSession()` were both reading and writing to `localStorage[LS_SESSION]` only. The session data — round history, working document, console HTML, conflicts, notes, project clock seconds — has lived in **IndexedDB** since the IDB migration ran (a long-running migration block in `loadSession` removes `LS_SESSION` from localStorage immediately after copying it to IDB, so the localStorage key has been `null` for every browser that's run WaxFrame for more than its first session).

**Every backup file produced since the IDB migration has been silently empty of session data.** Looking at one example backup file: the JSON contained `LS_HIVE` (API keys), `LS_PROJECT` (project name, goal fields, reference material), and `LS_SESSION: null`. No round history. No working document. No console output. No conflicts. Importing such a file gave back only the project setup and API keys — never the round work — because `importSession()` had `if (data.LS_SESSION) localStorage.setItem(...)` which evaluated false on null and skipped the write entirely. Even if a backup *had* contained session data, restore would have written it to localStorage where the next `loadSession` migration would have re-shuffled it through IDB. That whole leg of the path was inert.

This was the silent disaster underneath the data-loss reports. After every wipe (which is a separate bug, still under investigation), users believed they could restore from their most recent backup, then watched the Round 1+ history fail to come back, and assumed the wipe destroyed both the live data *and* the backup. In fact the backup never had it in the first place.

#### What changed in `backupSession()`

Now `async` and reads the IDB session via `await idbGet()`, including the result in the backup JSON under a new `IDB_SESSION` field. Also captures the localStorage mirror (`LS_SESSION_MIRROR`, written by every successful save since v3.21.9) as a redundancy layer. Adds two metadata fields:
- `_waxframe_backup_version: 2` — distinguishes new backups from pre-v3.21.10 (legacy v1) backups
- `_waxframe_app_version` and `_waxframe_backup_ts` — records which build produced the backup and when

The success toast now states what was actually captured: rounds completed and characters in working document, e.g. `💾 Session backed up (3 rounds, 12,453 chars)`. If only project setup was captured (no IDB session at backup time), the toast says so explicitly: `(project setup only — no session data)`.

#### What changed in `importSession()`

Now writes IDB on restore via `await idbSet(data.IDB_SESSION)`, and also restores `LS_SESSION_MIRROR` if present. The success toast distinguishes three cases:
- **v2 backup with full session data** → `✅ Backup restored — N rounds, M chars in document. Reloading…`
- **v1 backup or v2 with no session data** → `⚠️ Old backup format — only project setup + API keys restored. Session data not in this file. Reloading…`
- **Project-only restore (no session in backup)** → `✅ Project setup restored (no session data in backup) — reloading…`

Reload delay extended from 800ms to 1500ms so the toast is actually readable before the page reloads.

#### Implications for existing backup files

**Every WaxFrame backup file with format version 1 (no `_waxframe_backup_version` field, or version field absent) contains zero session data.** Importing such a file restores only API keys and project setup. There is no recovery path for those backups — the data was never captured. Going forward, every new backup made from v3.21.10+ contains the IDB session, and restoring from those files will actually bring back round history.

If you have an old backup of an important session: the only data in it is the API keys, project name/version, six goal fields, document tab choice, reference material, and reference filename. Everything else (history, document, console, conflicts, notes, project clock) is not in the file and cannot be recovered from it.

### Files Changed

- `app.js` — `backupSession()` rewritten as `async` to read IDB via `idbGet()` and include the result in the backup JSON. Backup format bumped to version 2 with new `IDB_SESSION` and `LS_SESSION_MIRROR` fields plus `_waxframe_app_version` and `_waxframe_backup_ts` metadata. `importSession()` rewritten with an `async` reader.onload handler to write IDB via `idbSet()` and restore `LS_SESSION_MIRROR`. Success/warning toasts made explicit about what was captured/restored. Bumped `BUILD` to `20260425-007` and the comment-header build to match.
- `index.html` — Bumped `waxframe-build` meta to `20260425-007` and all cache-busts to `3.21.10`. Comment-header build bumped.
- `version.js` — Bumped `APP_VERSION` to `v3.21.10 Pro`.
- `style.css`, `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-busts and comment-header builds bumped to `3.21.10` / `20260425-007`. No content changes.
- `README.md` — Version + Build badges bumped.
- `CHANGELOG.md` — This entry.

---

## v3.21.9 Pro — Build `20260425-006`
**Released:** April 25, 2026

### Storage layer hardening — kill the empty-state save once and for all

This release addresses a recurring data-loss bug where the IndexedDB session would end up containing the literal default state (`{round:1, phase:"draft", history:[], docText:"", consoleHTML:DEFAULT, projClockSeconds:0}`) overwriting the user's actual session. Two prior incidents were observed during v3.21.5 and v3.21.7 testing. Forensic analysis of the IDB content showed the consoleHTML field contained the exact default HTML from `index.html` line 638 (`Console ready — Smoke the hive to begin.`), which is only present when the page has just loaded and nothing has touched the console DOM yet — meaning a `saveSession()` call fired with all-default in-memory state and committed empty defaults on top of stored data. The exact call site that produced the bad write could not be pinned down from code reading alone (twenty `saveSession()` call sites, all gated behind user actions in source, but at least one was firing during page load with default state). This release ships defense-in-depth so the bug cannot recur regardless of which call path is the actual trigger, plus an instrumentation pass to catch the remaining unknown root cause if it ever fires again.

**Track A — five structural hardenings, all behind the existing storage layer with no behavior change for normal use:**

A1. **Serialized save chain with read-check-write guard.** Every `saveSession()` now runs through a single `_saveSessionChain` Promise so two saves in flight cannot race. Inside the chain, the function reads current IDB state first and refuses to commit if the new state would clobber populated stored data with empty defaults — specifically, blocks any write where in-memory has `history.length === 0 && !docText.trim()` but stored has `history.length > 0 || docText.trim().length > 0`. The "make progress" invariant: a save can never *delete* persisted data unless explicitly invoked through `clearProject()`. Existing belt-and-suspenders guard #1 (in-memory has data but DOM console is default → don't save) is preserved as guard #1; the new write-guard becomes guard #2.

A2. **Pre-launch storage verify in `startSession()`.** Made the function `async` and added a check after the existing in-memory guard: if in-memory is empty but IDB or the localStorage mirror has populated session data, surface an explicit confirm dialog (`A saved session exists in browser storage but did NOT load into memory on this page load. Cancel to keep the saved session intact and reload to retry. OK to discard.`). User must explicitly choose discard before any state-mutating call runs. If discard is chosen, IDB and the mirror are explicitly cleared so the new launch doesn't leave a partial overwrite. This catches the specific failure mode where `loadSession()` failed silently (IDB read errored, async race lost to a sync user action, mid-load eviction) and the user clicks Continue thinking they're resuming.

A3. **localStorage session mirror as second-tier persistence.** Every successful IDB commit also writes a JSON mirror to `localStorage['waxframe_v2_session_mirror']` (skipped when the session is empty defaults so we don't pollute the mirror). `loadSession()` now consults the mirror as fallback #1 (before the legacy `LS_SESSION` key, now fallback #2) so if IDB is evicted but localStorage isn't, the recovery path is automatic. When mirror recovery succeeds, the recovered data is pushed back into IDB so subsequent loads use the primary path. Eviction policies for IDB and localStorage are independent in all major browsers — the mirror is meaningful redundancy, not the same storage with a different key. Mirror writes have a 4.5MB safety cap (under the 5MB localStorage limit) and silently no-op if exceeded.

A4. **Persistent storage retry on engagement.** `navigator.storage.persist()` is called once at DOMContentLoaded and the result stashed on `window._storagePersistent`. If it was denied (Firefox in particular often denies on first visit), every third successful round now re-requests it from inside `saveSession()` after the IDB commit. Browsers grant persistence based on engagement signals (round count is a proxy for active use), so retry is the recommended approach.

A5. **Legacy `aihive_v2_db` deletion.** The project rebranded from "AIHive" to "WaxFrame" months ago. The localStorage keys and IDB database name were renamed at the time, but the pre-rename `aihive_v2_db` was never explicitly deleted, so it lingered in browsers as orphan data alongside the active `waxframe_v2_db`. Added a one-time migration in DOMContentLoaded that calls `indexedDB.deleteDatabase('aihive_v2_db')` and stamps a `waxframe_v2_legacy_idb_purged` flag in localStorage so it only runs once.

**Track B — instrumentation to pin down the actual root cause:**

Added a dev-mode-only `console.trace()` at the top of `saveSession()` that logs every save with the current state (`round`, `phase`, `history.length`, `docText.length`, `consoleHTML.length`) and a full call stack. Gated behind `localStorage.getItem('waxframe_dev') === '1'` so it's invisible for normal users. If the bad save fires again with dev mode on, the stack trace points directly at the buggy call site. Also added explicit `console.warn` log lines on both guard #1 and guard #2 trip events, so when the new write-guard catches an empty-state save attempt, the call stack is preserved and the specific path can be diagnosed without needing to reproduce.

### Files Changed

- `app.js` — Added `LS_SESSION_MIRROR` constant, `_saveSessionChain` Promise, `_lastKnownGoodSession` cache. Rewrote `saveSession()` from sync-fire-and-forget to chain-serialized read-check-write with two guards, mirror write, and engagement retry. Added LS_SESSION_MIRROR fallback in `loadSession()` between IDB and the legacy LS_SESSION fallback. Made `startSession()` async and added the pre-launch storage verify after the existing in-memory guard. Added one-time `aihive_v2_db` deletion in DOMContentLoaded. Added dev-mode `console.trace` in `saveSession()` plus `console.warn` on both guard trips. Bumped `BUILD` to `20260425-006` and the comment-header build.
- `index.html` — Bumped `waxframe-build` meta to `20260425-006` and all cache-busts to `3.21.9`. Comment-header build bumped.
- `version.js` — Bumped `APP_VERSION` to `v3.21.9 Pro`.
- `style.css`, `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-busts and comment-header builds bumped to `3.21.9` / `20260425-006`. No content changes.
- `README.md` — Version + Build badges bumped.
- `CHANGELOG.md` — This entry.

### What to expect after deploy

Normal use looks identical — saves still feel synchronous, no UI changes, no new modals on a healthy session. The hardening only surfaces when something has gone wrong:

- If a buggy save tries to clobber populated stored data with empty defaults, guard #2 silently blocks it and logs a `[saveSession] BLOCKED by guard #2` warning to the console. Stored data stays intact.
- If the user lands on Setup Step 5 with empty in-memory state but populated stored data, clicking Continue surfaces the recovery dialog rather than blowing away the saved session.
- If IDB gets evicted but localStorage doesn't, the next page load auto-recovers from the mirror with a `[loadSession] IDB empty — recovered session from localStorage mirror` console line.
- The legacy `aihive_v2_db` disappears from DevTools Storage tab on first load.

### Known gaps still open

The dev-mode trace is a diagnostic tool, not a fix on its own. If the original bug fires again with dev mode active, the stack trace will identify the call site and the next release can target it directly. Until then, the structural hardening prevents the symptom regardless of cause.

---

## v3.21.8 Pro — Build `20260425-005`
**Released:** April 25, 2026

### Mute button now actually mutes everything

Two sound functions — `playSmokerSound()` and `playBuilderSound()` — were missing the `if (_isMuted) return;` guard at the top of their function bodies. The other eight direct-audio helpers (`playRoundCompleteSound`, `playRosieSound`, `playFlyingCarSound`, `playMetalClang`, `playAnvilSound`, `playCrackleSound`, plus the click sound) all had the guard. The two unguarded functions both directly create an `AudioContext` and schedule oscillators when called, so calling them with mute on still produced audible output.

The smoker sound is the soft "breath of smoke" that plays during fly-in animations, and the builder sound is the pneumatic-hiss-plus-belt-rolling that fires when the Builder kicks off a round. Both fire frequently enough during normal use that the mute leak was very audible — every time the user kicked off a Builder round with mute on, they got the full pneumatic-hiss sound.

The two scene-orchestrator functions `playUnlockScene()` and `playUnanimousScene()` do not need a top-level guard since they don't produce sound directly — they delegate to the per-effect helpers (`playMetalClang`, `playAnvilSound`, `playFlyingCarSound`, `playCrackleSound`) which are already gated. The visual scene plays normally with mute on; only the audio is suppressed.

A prior audit in v3.21.6 had claimed all audio paths were gated, which was wrong — the audit's heuristic missed direct-AudioContext creation in functions whose comments described them as helpers rather than scenes. Audit logic for v3.21.8 was rewritten to enumerate every `function play*` definition and verify each that directly instantiates `AudioContext` or `new Audio()` has an `_isMuted` guard within its first three lines. All eight direct-audio helpers now pass.

### Files Changed

- `app.js` — Added `if (_isMuted) return;` as the first statement of `playSmokerSound()` (line 575) and `playBuilderSound()` (line 599). Bumped `BUILD` to `20260425-005` and the comment-header build to match.
- `index.html` — Bumped `waxframe-build` meta to `20260425-005` and all cache-busts to `3.21.8`. Comment-header build bumped.
- `version.js` — Bumped `APP_VERSION` to `v3.21.8 Pro`.
- `style.css`, `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-busts and comment-header builds bumped to `3.21.8` / `20260425-005`. No content changes.
- `README.md` — Version + Build badges bumped.
- `CHANGELOG.md` — This entry.

---

## v3.21.7 Pro — Build `20260425-004`
**Released:** April 25, 2026

### Reference Material screen now restores its tab state on re-entry

Navigating back to **Setup Step 4 — Reference Material** mid-project left both the *Upload File* and *Paste Text* tabs unselected with no panel visible — even when the user had previously pasted or uploaded reference material and the size readout at the top showed the data was loaded (`CHARS: 991  WORDS: 159  TOKENS (EST.): 248`). The user had to click one of the tab buttons to reveal the content again. Confusing on a screen that's supposed to show the existing state.

Root cause was a missing case in `goToScreen()`. Every other setup screen has its own restoration block — `screen-bees` re-renders the AI grid, `screen-builder` re-renders the picker, `screen-project` updates requirements, `screen-document` calls `switchDocTab(docTab)` and restores the file-status pill. But there was no `if (id === 'screen-reference')` branch at all, so the screen was navigating into a stale DOM state. The active-tab state set at initial page load (during `loadProject()`) was either being lost between screen transitions or never applied if the user happened to hit Reference Material via Back navigation rather than the canonical setup flow.

Added a screen-reference restoration block that mirrors the screen-document pattern: if `refTab` was previously saved, call `switchRefTab(refTab, true)` to re-activate the matching tab and panel; if `refTab` is empty but `refMaterial` has content (fallback for state inconsistency), default to `'paste'` unless `refFilename` is set, in which case default to `'upload'`. Also re-syncs the file-status pill (`📚 {filename} — {N} chars loaded`) and the clear-row visibility when an uploaded file is being restored, so the upload-mode UI doesn't lose its file context just because the screen was re-entered.

### Project Goal modal — restructured to match the Setup 3 form layout

Clicking the project info pill on the Work screen opened a modal that was supposed to show the assembled project goal as a read-only review. The implementation shoved the entire flat assembled-text blob (`Document type: Job description\n\nTarget audience: Network engineers...\n\nDesired outcome:\n...`) into a single `<textarea readonly>`, which rendered visually as one undifferentiated wall of text with embedded label prefixes. Looked disjointed and made it hard to scan for any single field — exactly the opposite of what the structured six-field form on Setup 3 was designed to provide. If the user expected to see the same structure they'd entered, they instead got a flat-text dump of it.

The modal now renders the six goal fields as labeled rows using the same `.dp-field` / `.dp-field-label` / `.dp-field-value` pattern used in the document playbooks page — orange uppercase label on the left (120px min-width), value on the right with line-breaks preserved, divider rules between rows. Empty fields are skipped so the modal only shows what's actually populated. If no fields are filled in at all, the modal shows an explicit empty-state message pointing the user back to the Project screen rather than rendering an empty container.

A new `.goal-modal-fields` CSS rule wraps the rows in a scrollable surface-tinted container with `max-height: 55vh` so very long goals (multi-paragraph outcome and scope fields) don't blow out the modal height. The orphaned `.goal-modal-textarea` and `.goal-modal-textarea:focus` CSS rules from the prior implementation were removed since the textarea element no longer exists. `copyGoal()` was updated to source from `assembleProjectGoal()` directly instead of reading the textarea's value, so the Copy button still works.

### Edit Hive button — back to laptop-only

The **Edit Hive** button in the Work screen's Hive panel header was showing on desktop viewports as well as laptop viewports. It was only ever needed at laptop sizes (≤1600px) where AI cards collapse to dot icons and you can't easily toggle individual AIs from the truncated view. At desktop the full hex-grid AI cards are visible with their own toggle affordance, making this header button redundant noise on the chrome of the work screen.

Root cause was the CSS rule `.hive-edit-btn { display: inline-flex; }` declared at the desktop-default level with a comment that explicitly read `/* Edit Hive button — visible at all viewports */`. Flipped the default to `display: none` and added `.hive-edit-btn { display: inline-flex; }` inside the existing `@media (max-width: 1600px)` block alongside the `.hex-grid` / `.bee-dot-strip` swap, so it now opts in at the same breakpoint where the AI cards collapse to dots. Comment updated to reflect the laptop-only intent.

### Files Changed

- `app.js` — Added `screen-reference` case to `goToScreen()` (~22 lines) immediately after the existing `screen-document` block. Rewrote `showProjectGoalModal()` to render structured `.dp-field` rows from the six goal field values instead of stuffing a flat-text textarea. Updated `copyGoal()` to source from `assembleProjectGoal()` directly. Bumped `BUILD` to `20260425-004` and the comment-header build to match.
- `index.html` — Replaced `<textarea id="projectGoalModalEdit">` with `<div id="projectGoalModalFields" class="goal-modal-fields"></div>`. Bumped `waxframe-build` meta to `20260425-004` and all cache-busts to `3.21.7`. Comment-header build bumped.
- `style.css` — Added `.goal-modal-fields` / `.goal-modal-fields .dp-field` / `.goal-modal-fields .dp-field-value` / `.goal-modal-empty` rules. Removed orphan `.goal-modal-textarea` and `.goal-modal-textarea:focus` rules. Flipped `.hive-edit-btn` from desktop-default `display: inline-flex` to default `display: none`, with laptop-viewport opt-in inside the existing `@media (max-width: 1600px)` block. CSS braces balanced at 1603/1603. Comment-header build bumped.
- `version.js` — Bumped `APP_VERSION` to `v3.21.7 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-busts and comment-header builds bumped to `3.21.7` / `20260425-004`. No content changes.
- `README.md` — Version + Build badges bumped.
- `CHANGELOG.md` — This entry.

---

## v3.21.6 Pro — Build `20260425-003`
**Released:** April 25, 2026

### Self-hosted DM Sans, dropped Syne entirely

WaxFrame had been loading two fonts from Google's CDN since project inception — Syne (display weights 400/600/700/800) and DM Sans (body weights 300/400/500/600 plus italic). Two parallel requests fired on every page load: one `<link>` in `index.html` and one `@import` in `style.css` with slightly different parameters (the CSS variant requested optical-size variants the HTML variant did not). Beyond redundancy, the external dependency on `fonts.googleapis.com` was a real liability for restricted-network deployment — air-gapped environments, corporate proxies, and locked-down work networks can all silently block Google Fonts. When that happens the request fails, fonts silently fall back to system defaults, and the WaxFrame wordmark renders in Times New Roman or whatever the OS supplies. The hive metaphor and the entire visual identity collapse into something that looks like a half-broken government form.

Candy also wasn't a fan of Syne for the wordmark and titles. There was a partial change in v3.14.5 (April 18) where `.wh-section-title` in the user manual was switched from Syne to DM Sans 700 uppercase — but the rest of the app's `--font-display` callsites (16 places using weight 800, 12 using weight 700) stayed on Syne. This release finishes that work: Syne is dropped entirely and DM Sans handles every font role except monospace (which remains system-installed Courier New, per the project's strict typeface rules).

The 18 DM Sans woff2 files (every weight 100–900 plus italic for each) live in a new `fonts/` subdirectory at repo root. All 18 are declared via `@font-face` rules at the top of `style.css` even though the actual codebase only references weights 300, 400, 400-italic, 500, 600, 700, and 800 — browsers lazy-load each woff2 only when a matching font-weight/style is actually rendered, so declaring all weights costs nothing at page-load time and keeps the door open for any future weight without needing another release. Total bundle ~270 KB woff2, served from same-origin GitHub Pages instead of an external CDN, so there's no DNS lookup, no extra TLS handshake, and no third-party tracking on every page load.

The `--font-display` CSS token in `:root` was flipped from `'Syne'` to `'DM Sans'` — single line change. Every callsite using `var(--font-display)` cascades automatically with no find-and-replace required. One straggler was caught and fixed: `.unlock-title` (the WaxFrame Pro license unlock animation overlay) had a hardcoded `font-family: 'Syne'` instead of using the token; flipped to `var(--font-display)` so it joins the rest of the app's typography rather than falling back to system sans-serif.

Visually, the WaxFrame wordmark and hero titles look different — Syne 800 is geometric and quirky with thin verticals and distinctive `e` and `g` glyphs; DM Sans 800 is more neutral, even, and readable. The change is subjective. If after living with it for a while a different display face is preferred (Inter, Manrope, Space Grotesk are common nearby choices), it's a one-token revert plus a different woff2 download.

### Files Changed

- `style.css` — Replaced single-line Google Fonts `@import` with an 18-rule `@font-face` block referencing files in `fonts/` (paths relative to repo root, matching where `style.css` lives). Flipped `--font-display` token from `'Syne'` to `'DM Sans'`. Fixed orphaned `.unlock-title` hardcoded `'Syne'` reference to use `var(--font-display)`. CSS braces balanced at 1600/1600. `!important` count unchanged.
- `index.html` — Removed `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link href="https://fonts.googleapis.com/...">` from `<head>`. Bumped `waxframe-build` meta to `20260425-003` and all cache-busts to `3.21.6`.
- `app.js` — Bumped `BUILD` to `20260425-003`. No code changes.
- `version.js` — Bumped `APP_VERSION` to `v3.21.6 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-busts bumped to `3.21.6`. No content changes. None of these pages referenced Google Fonts directly; they inherit fonts via `style.css`.
- `README.md` — Version + Build badges bumped.
- `CHANGELOG.md` — This entry.
- `fonts/` (new directory at repo root) — 18 DM Sans woff2 files (`dm-sans-v17-latin-100.woff2` through `dm-sans-v17-latin-900italic.woff2`). Already in place from the manual download via google-webfonts-helper.
- `fonts/OFL.txt` (new file) — SIL Open Font License 1.1 boilerplate with the DM Sans Project Authors copyright line, required for OFL redistribution compliance when bundling the fonts.

### Documentation hygiene — stale build comment blocks synced

The HTML/CSS/JS comment headers at the top of every file (`Build: 2026MMDD-NNN`) had been silently out of sync for many releases — `index.html` still said `20260421-001`, `style.css` said `20260419-001`, `what-are-tokens.html` said `20260415-001`. These comment-block stamps aren't part of the canonical four-stamp release checklist (meta tag, `APP_VERSION`, `BUILD` constant, cache-busts), so they were never updated through normal release workflow. All 8 files (`index.html`, `app.js`, `style.css`, `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html`) now synced to `20260425-003`. No behavioral impact — purely cosmetic, but it was misleading when reading source.

---

## v3.21.5 Pro — Build `20260425-002`
**Released:** April 25, 2026

### Holdout convergence cards now show a "Current:" line preview

When majority convergence fires and the Builder is skipped, the Conflicts panel falls back to a separate render path that shows the holdout AI's raw suggestions (`🐝 DeepSeek · Suggestion 1 of 3` etc.). Compared to the structured Builder USER DECISION cards — which include a `Current: "the actual line from the doc"` row that is clickable to scroll the document to it — the holdout cards were missing that entire structural element. The card jumped straight from the AI badge to the suggestion text with no preview of the line being modified, leaving the user to manually scan the document to figure out what each suggestion was referencing.

The previous attempt at making the card text clickable used a regex (`/Change\s+["...]([^...]+)["...]\s+to/i`) that only matched the literal pattern `Change "X" to "Y"`. Empirical testing against 11 common reviewer phrasings showed it caught 2 — `Change "X" to "Y"` itself and `Line N: Change "X" to "Y"`. The 9 misses included `Add "X" after "Y"`, `Remove "X"`, `Replace "X" with "Y"`, `Reword "X" as "Y"`, `Insert "X" before "Y"`, `Tighten "X"`, arrow notation `"X" → "Y"`, and meta-suggestions with no quoted anchor. When the regex missed, the click silently fired a `⚠️ Could not locate that passage` toast — worse than no clickability, because the user had no way to know in advance which cards were clickable.

The replacement helper `findCurrentLineForSuggestion()` ignores the suggestion's verb entirely and walks the suggestion text looking for every quoted substring (straight quotes and curly quotes both). It filters those candidates down to the ones that already exist in the working document, sorts by length, and picks the longest. This correctly handles all 9 of the previously-missed phrasings: for `Add "based in Tampa" after "company"`, only `company` is in the doc (yet), so `company` is picked; for `Change "X" to "Y"`, only `X` is in the doc, so `X` is picked. It then walks the document text to find the `\n` boundaries on either side of the match and returns the full line containing the anchor (clipped to 200 characters around the anchor for very long lines).

The holdout card markup was rewritten to render a `<div class="decision-current decision-current-clickable">` element above the suggestion text whenever a current-line context is found, matching the visual treatment of Builder USER DECISION cards. Click to scroll fires through the existing `scrollToCurrentText()` function. When no quoted anchor is found in the suggestion (rare — typically only when the AI emits a meta-suggestion like "Strengthen the opening") the card omits the Current: row entirely rather than rendering a broken or misleading link. The dead `scrollToHoldoutLine()` function was removed.

### Copy buttons no longer fail silently and now show a visual confirmation

`copyToClipboard()` was calling `navigator.clipboard.writeText(txt).then(() => toast(...))` with no rejection handler. When the clipboard write rejected — most commonly because the document had lost focus between the click event and the asynchronous write resolving, but also possible from permission denial or async context loss — the entire promise rejected silently. No success toast, no error toast, no log, no visible indication that the click had registered at all. From the user's perspective, the button just didn't do anything.

Added a rejection handler that surfaces failures: `console.warn('[copy] writeText failed:', err)` for diagnostic logging, plus an explicit toast `⚠️ Couldn't copy {label} — click directly on the button and try again`. The user-facing message points at the focus-loss case since that's the most common cause and the most easily worked around.

Added `flashCopyButton()` for visual confirmation independent of the toast. On a successful copy the clicked button briefly turns green with `✓ Copied` text for 1.1 seconds, then restores its original content. The button is captured synchronously from the active click event (or passed explicitly) so the reference survives the asynchronous clipboard promise. The new CSS rule `.btn.btn-copied` provides the green-tinted state using the existing `--green` and `--green-dim` tokens to match the licensed-pill and round-success styling already in the app.

### Files Changed

- `app.js` — Removed orphaned `scrollToHoldoutLine()` function (+12 lines deleted). Added `findCurrentLineForSuggestion()` helper (~40 lines). Modified the holdout-card render block in `renderConflicts()` to call the helper, persist the resolved anchor in `window._holdoutAnchors[i]`, and render a clickable `decision-current` row above the suggestion text when context is found. Modified `copyToClipboard()` to add a rejection handler and accept an optional button reference for visual feedback. Added `flashCopyButton()` helper. Bumped `BUILD` to `20260425-002`.
- `style.css` — Added `.btn.btn-copied` rule with green border, background, and color using existing `--green` tokens. CSS braces balanced.
- `index.html` — Bumped `waxframe-build` meta to `20260425-002` and all cache-busts to `3.21.5`.
- `version.js` — Bumped `APP_VERSION` to `v3.21.5 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Cache-busts bumped to `3.21.5`. No content changes.
- `README.md` — Version + Build badges bumped.
- `CHANGELOG.md` — This entry.

---

## v3.21.4 Pro — Build `20260425-001`
**Released:** April 25, 2026

### Four small but meaningful UX fixes batched together

**License pill is clickable when licensed (subscription-ready).**
Previously the green `✓ Licensed` pill in the top bar was inert — once you entered a key, you had no way to view, replace, or remove it short of clearing localStorage. With WaxFrame moving toward an eventual subscription model, that's the wrong default. The pill now opens a Manage License modal showing the key in masked form (`••••••••-••••••••-••••••••-XXXXXXXX`, last 8 visible) with two actions: **Replace Key** opens the existing entry modal so a new key can be verified before the old one is replaced, and **Remove Key** (with a confirmation prompt) wipes the license while preserving `trialRoundsUsed` so removing a license can't be used to escape an expired trial.

**Nav panel widened so the tagline fits on one line.**
The slide-in nav panel was 280px on desktop, which forced the tagline `MANY MINDS. ONE REFINED RESULT.` to wrap to two lines under the WaxFrame wordmark. Bumped to 320px (matching what the panel was already doing on smaller laptop viewports), and removed the now-redundant `@media (max-width: 1400px) { width: 320px }` breakpoint since the new default already covers that range.

**Conflicts panel — removed the dead Clear button.**
The Clear button next to Copy on the Conflicts header was a copy-paste leftover from the Notes / Goal Clear buttons. Conflicts are *system output* — the Builder regenerates them every round — so a user-driven Clear was actively harmful (hid useful info until the next round) with no real state to clear. Button removed and the orphaned `clearConflicts()` function removed alongside it. Copy stays — that's legitimately useful.

**Snapshot backup filename now includes a date+time stamp.**
`Menu → 💾 Backup Session` was producing `WaxFrame-Backup-{name}-{version}.json` with no timestamp, so backing up the same project twice in one session would silently overwrite the prior file in your downloads folder. Filenames now append a local-time `YYYYMMDD-HHmm` stamp matching the build-stamp format used elsewhere — e.g. `WaxFrame-Backup-Chocolate-chip-cookies-v1-20260425-0917.json`. Multiple backups in the same session no longer collide.

### Empirical round-count data captured

`WaxFrame_DryRun_TestSheet.md` Results Log now records measured rounds where transcript data exists: Quick Start cookies (2 rounds, v3.0 seed), Thank-You Letter from scratch (2 rounds, build 20260421-002), and Thank-You Letter refining a rough draft (13 rounds, build 20260421-001). The 2-vs-13 split on the same playbook confirms the convergence principle in the wild — starting from scratch beats refining a misaligned draft. Beef Wellington's 21-round AI Hive v2 run is flagged as not representative of the current build.

### Files Changed

- `style.css` — Nav panel default width `280px` → `320px`; removed the now-redundant `@media (max-width: 1400px) { .nav-panel { width: 320px; } }` rule. `.license-badge.licensed` lost `cursor: default` (now inherits `cursor: pointer` from the base rule) and gained a visible hover state (`background: var(--green); color: #0a0c12;` plus a subtle green glow). Added new rules `.license-modal-key-display`, `.license-modal-actions`, `.license-modal-btn-secondary`, `.license-modal-btn-danger` for the Manage License modal. `!important` count unchanged at 41. CSS braces balanced.
- `index.html` — Removed dead `<button>✕ Clear</button>` from the Conflicts header (line 556). Added new `licenseManageModal` block right after the existing `licenseModal`, with a masked key display, Replace/Remove action buttons, and Close. Bumped `waxframe-build` meta to `20260425-001`, and `style.css?v=`, `version.js?v=`, `app.js?v=` cache-busts to `3.21.4`.
- `app.js` — Removed orphaned `clearConflicts()` function. Added `getLicenseKey()` and `clearLicense()` helpers in the LICENSE SYSTEM block. Added `showLicenseManageModal()`, `hideLicenseManageModal()`, `replaceLicenseKey()`, `confirmRemoveLicense()` for the Manage License flow. Modified `updateLicenseBadge()`: when licensed, `badge.onclick` is now wired to `showLicenseManageModal()` (was `null`), and the title changed from `"WaxFrame Pro — licensed"` to `"WaxFrame Pro — manage license"`. Modified `backupSession()` to append a local-time `YYYYMMDD-HHmm` timestamp to the filename. Bumped `BUILD` constant to `20260425-001`.
- `version.js` — Bumped `APP_VERSION` to `v3.21.4 Pro`.
- `waxframe-user-manual.html`, `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Bumped `version.js?v=` and `style.css?v=` cache-busts to `3.21.4`. No content changes.
- `README.md` — Bumped Version badge to `3.21.4` and Build badge to `20260425-001`.
- `WaxFrame_DryRun_TestSheet.md` — Filled in Actual round counts for rows 0 (Cookies), 5 (Thank-You Letter), and added a Notes caveat for row 11 (Recipe / Beef Wellington's old build).
- `CHANGELOG.md` — This entry.

---

## v3.21.3 Pro — Build `20260424-017`
**Released:** April 24, 2026

### Two visual bugs caught in v3.21.2 testing

**Watermark now centered in the dead space (Setup 4 AND Setup 5)**
The pulsing logo watermark on the Document and Reference Material setup screens was right-anchored 24px from the right edge of the dead space (`background-position: right 24px center`), which pinned it to the right side of the card instead of centering it horizontally within the empty area to the right of the constrained-width content column. The historical intent — and the way it used to render — was for the watermark to float in the middle of that dead space. The shared `::after` rule for `#panel-paste`, `#panel-upload`, `#panel-scratch`, `#panel-ref-paste`, and `#panel-ref-upload` now uses `background-position: center center`. Both Setup 4 and Setup 5 inherit the fix automatically since they share the rule. No need to change individual screens.

**Manual Step 4 — content was escaping the white card container**
In the v3.21.0 manual insertion, I placed the `.wh-tip` block and the `↑ Back to top` link as direct children of the `.wh-section` element. The white-card visual is created by `.wh-block { background: var(--surface) }`, not by the section wrapper — the section is transparent. So those two elements rendered directly on the honeycomb-tiled body background, and the supposed-last `.wh-block` lost its rounded bottom corners because something else was the actual `:last-child`. Both the tip and the back-top link now live inside the final `.wh-block` (Editing reference material mid-session), matching the pattern every other step uses.

### Files Changed

- `style.css` — Changed shared watermark `::after` rule from `background-position: right 24px center` to `background-position: center center`. `!important` count unchanged at 41. CSS braces balanced.
- `waxframe-user-manual.html` — Moved the closing `<div class="wh-tip">…</div>` and `<a href="#top" class="wh-back-top">↑ Back to top</a>` from outside the last `.wh-block` to inside it (the Editing reference material mid-session block) for Step 4 — Reference Material. Bumped `version.js?v=` and `style.css?v=` cache-busts to `3.21.3`.
- `index.html` — Bumped `waxframe-build` meta to `20260424-017`, `app.js?v=` cache-bust to `3.21.3`, `version.js?v=` cache-bust to `3.21.3`, `style.css?v=` cache-bust to `3.21.3`.
- `app.js` — Bumped `BUILD` constant to `20260424-017`. No code changes.
- `version.js` — Bumped `APP_VERSION` to `v3.21.3 Pro`.
- `document-playbooks.html`, `what-are-tokens.html`, `api-details.html`, `prompt-editor.html` — Bumped `version.js?v=` and `style.css?v=` cache-busts to `3.21.3`. No content changes.
- `README.md` — Bumped Version badge to `3.21.3` and Build badge to `20260424-017`.
- `CHANGELOG.md` — This entry.

---

## v3.21.2 Pro — Build `20260424-016`
**Released:** April 24, 2026

### Critical: stale style.css cache-bust

The root cause behind every styling complaint on Setup 4 in v3.21.1: `index.html` was serving `style.css?v=3.20.11` and the helper pages were serving `style.css?v=3.19.23`. Browsers cached those URLs aggressively. None of the v3.21.0 / v3.21.1 CSS additions — the counter row styling, drop zone scoping, the works — were actually being loaded by users on upgrade. Every helper page and `index.html` now serves `style.css?v=3.21.2`. This is a one-line-per-file fix that turns out to be the bigger of the two visible improvements in this release.

### Setup 4 layout now mirrors Setup 5 exactly

**Drop zone matched.** The scoped CSS rule that gives Setup 5's drop zone its constrained width (so it sits to the left of the watermark, not full-width across the card) was only targeted at `#panel-upload`. It now also targets `#panel-ref-upload`. Same flex sizing, same width formula, same monospace font. The Setup 4 drop zone now looks identical to Setup 5's.

**Paste editor matched.** Same fix for `#panel-paste .proj-ta-editor` — the rule now also covers `#panel-ref-paste .proj-ta-editor`. The paste textarea on Setup 4 is now the same constrained width as on Setup 5, with the line numbers gutter and watermark dead-space matching.

**Watermark extended to ref panels.** The pulsing logo watermark that appears in the dead space to the right of the working content area on Setup 5 (`#panel-paste::after`, `#panel-upload::after`, `#panel-scratch::after`) now also fires on `#panel-ref-paste::after` and `#panel-ref-upload::after`, including the laptop-tier (1422–1600px) size override.

### Default tab behavior intentionally different from Setup 5

Setup 5 — Starting Document is required, so it ships with Upload File active by default and the drop zone visible on page load. Setup 4 — Reference Material is optional, so on page load **neither tab is selected** and the panel area below the counter row is empty until the user explicitly picks a tab. The hint copy now reads "Pick **Upload File** or **Paste Text** to provide reference material — or skip this step entirely if your project does not need any." This is intentional asymmetry — a visible signal that Setup 4 is genuinely optional and a user can simply hit Continue without making a choice. `loadSettings` now only restores an active tab if the user previously picked one in a saved project; first-visit users see the neutral state.

### Copy clarity fixes

**"the artifact under construction" → "the document under construction".** The phrase appeared in three user-facing locations: the Setup 4 subtitle, the infoReferenceModal "Distinct from Starting Document" row, and the manual's Step 4 role-distinction table. All three now use plain language.

**Job descriptions clarified in example lists.** The phrase "job descriptions" was ambiguous in the Reference Material example list — for a recruiter writing a JD, the JD is the artifact being produced, not a reference. The example now reads "job descriptions (rules and responsibilities)" everywhere it appears in prose copy on Setup 4 — the subtitle, the info modal opening paragraph, and the manual's setup-flow table — to make explicit that this entry refers to the source JD a user is writing against (a cover letter, a résumé), not a JD the user is producing.

**Token cost copy made plainer.** Two phrases I had originally written that read as engineer-speak rather than plain English have been rewritten:

- "Trim reference material to what is load-bearing" → "Trim reference material to what is most important"
- "the hive cannot read what you do not paste — but it also pays for every character" → "the hive cannot read what you do not paste — but it also costs you money for every token"

These corrections land in three spots: the infoReferenceModal tip, the manual's Step 4 trim-aggressively bullet, and the What Are Tokens? Reference material card.

### Files Changed

- `index.html` — Removed the `active` class from the Setup 4 Upload File tab and panel so neither is selected on first load. Updated the Reference Material subtitle to clarify "job descriptions (rules and responsibilities)" and replaced "the artifact under construction" with "the document under construction". Updated the infoReferenceModal opening paragraph and "Distinct from Starting Document" row to match. Updated the tip line in the info modal: load-bearing → most important; pays for every character → costs you money for every token. Updated the tab hint to read "Pick Upload File or Paste Text to provide reference material — or skip this step entirely if your project does not need any." Bumped `waxframe-build` meta to `20260424-016`, `app.js?v=` cache-bust to `3.21.2`, `version.js?v=` cache-bust to `3.21.2`, and `style.css?v=` cache-bust from stale `3.20.11` to `3.21.2`.
- `app.js` — Bumped `BUILD` to `20260424-016`. Default `refTab` state var changed from `'upload'` to `''` (empty = no selection). `loadSettings` only calls `switchRefTab` when a persisted refTab value exists. `clearProject` resets refTab to empty and clears any active tab/panel state on the screen-reference DOM, also resets the hint copy to the neutral first-visit state.
- `style.css` — Added `#panel-ref-upload` and `#panel-ref-paste` to the existing panel-decoration rule (positioning + monospace font). Added `#panel-ref-upload::after` and `#panel-ref-paste::after` to the watermark `::after` rule so the pulsing logo watermark fires on Setup 4 too. Added `#panel-ref-upload .drop-zone` to the constrained-width drop-zone rule. Added `#panel-ref-paste .proj-ta-editor` to the constrained-width paste-editor rule. Added the same ref panels to the laptop-tier (1422–1600px) watermark size override at the bottom of the file. `!important` count unchanged at 41.
- `version.js` — Bumped `APP_VERSION` to `v3.21.2 Pro`.
- `waxframe-user-manual.html` — Replaced "the artifact under construction" with "the document under construction" in the Step 4 role-distinction table. Clarified "job descriptions (rules and responsibilities)" in the setup-flow table. Replaced load-bearing → most important in the trim-aggressively bullet. Bumped `version.js?v=` cache-bust to `3.21.2` and `style.css?v=` cache-bust from stale `3.19.23` to `3.21.2`.
- `what-are-tokens.html` — Replaced load-bearing → most important and the "do not pay for what you do not paste" wording with "costs you money for every token you send" in the Reference material card. Bumped `version.js?v=` cache-bust to `3.21.2` and `style.css?v=` cache-bust to `3.21.2`.
- `document-playbooks.html` — Bumped `version.js?v=` cache-bust to `3.21.2` and `style.css?v=` cache-bust to `3.21.2`. No content changes.
- `api-details.html` — Bumped `version.js?v=` cache-bust to `3.21.2` and `style.css?v=` cache-bust to `3.21.2`. No content changes.
- `prompt-editor.html` — Bumped `version.js?v=` cache-bust to `3.21.2` and `style.css?v=` cache-bust to `3.21.2`. No content changes.
- `README.md` — Bumped Version badge to `3.21.2` and Build badge to `20260424-016`.
- `CHANGELOG.md` — This entry.

---

## v3.21.1 Pro — Build `20260424-015`
**Released:** April 24, 2026

### Visual polish on Setup 4 — Reference Material

**Setup 4 layout matched to Setup 5**
The new Reference Material screen now mirrors the visual rhythm of the Starting Document screen exactly. The default tab is **Upload File** instead of Paste Text, matching Setup 5. The chars / words / tokens estimate counter has been moved up from below the tab panels to sit between the tab hint and the panels — the position where the Export Filename row sits on Setup 5. The counter row has been restyled to match the Export Filename row's appearance: dashed border, surface2 background, identical padding and margin. A leading `📚 Reference size` label parallels the `💾 Export filename` label on Setup 5.

**Continue button is permanently lit**
The Continue — Starting Document button on Setup 4 now carries the `btn-accent` class on render. Reference material is always optional, so the button is permanently in the lit "ready" state — there is no requirements gate to clear. This matches the visual prominence of the Launch button on Setup 5 once requirements are met.

**Drop-zone icon unified across both setup screens**
Both the Reference Material drop zone (Setup 4) and the Starting Document drop zone (Setup 5) now show the 📚 emoji instead of mixing 📚 and 📄. The 📚 emoji renders with stronger color saturation across browsers and gives both screens a more polished, consistent look.

### Audit fixes — files missed in the v3.21.0 release

**README.md badges bumped**
The Version and Build badges in the repo README were stale — Version showed `3.2` and Build showed `20260415-002`, both far behind. They now reflect `Version-3.21.1` and `Build-20260424-015`.

**WaxFrame Dry-Run Test Sheet renumbered**
The dry-run test sheet had 12 occurrences of "Setup 4" referring to the Starting Document — these all shift to "Setup 5" with the new Setup 4 / Setup 5 numbering introduced in v3.21.0. The top-level instruction in the test sheet preamble has been updated accordingly. Anyone running the dry-run scripts post-v3.21.0 would have hit the wrong screen otherwise.

### State defaults tightened

The in-memory `refTab` default is now `'upload'` to match the new default tab on Setup 4. The `clearProject` reset path matches. The `loadSettings` restore path uses the persisted value but falls back to `'upload'` when none is present.

### Files Changed

- `index.html` — Restructured `screen-reference` body so the counter row sits between the tab hint and the panels (mirrors `screen-document`'s export-mask-row position). Default active tab and panel switched from paste to upload. Counter row markup updated to match the export-mask-row pattern with a leading `📚 Reference size` label and inline `Chars / Words / Tokens (est.)` items. `btn-accent` added to `#refContinueBtn` so the Continue button is permanently lit. Starting Document drop zone icon swapped from 📄 to 📚 for visual consistency with the Reference Material drop zone. Bumped `waxframe-build` meta to `20260424-015`, `app.js?v=` cache-bust to `3.21.1`, and `version.js?v=` cache-bust to `3.21.1`.
- `app.js` — Bumped `BUILD` to `20260424-015`. Default `refTab` state var changed from `'paste'` to `'upload'`. `clearProject` reset target changed accordingly.
- `style.css` — Restyled `.ref-counter-row` to mirror `.export-mask-row` proportions (dashed border, surface2 background, 7px / 10px padding, 8px bottom margin). Added `.ref-counter-sublabel` and `.ref-counter-info` styles to support the new label structure. `!important` count unchanged at 41.
- `version.js` — Bumped `APP_VERSION` to `v3.21.1 Pro`.
- `README.md` — Bumped Version badge to `3.21.1` and Build badge to `20260424-015`.
- `WaxFrame_DryRun_TestSheet.md` — Bulk-shifted 12 occurrences of "Setup 4" referring to the Starting Document to "Setup 5". Updated the top-level preamble instruction to direct users to paste starting documents into Setup 5.
- `waxframe-user-manual.html` — Bumped `version.js?v=` cache-bust to `3.21.1`. No content changes.
- `document-playbooks.html` — Bumped `version.js?v=` cache-bust to `3.21.1`. No content changes.
- `what-are-tokens.html` — Bumped `version.js?v=` cache-bust to `3.21.1`. No content changes.
- `api-details.html` — Bumped `version.js?v=` cache-bust to `3.21.1`. No content changes.
- `prompt-editor.html` — Bumped `version.js?v=` cache-bust to `3.21.1`. No content changes.
- `CHANGELOG.md` — This entry.

---

## v3.21.0 Pro — Build `20260424-014`
**Released:** April 24, 2026

### New Feature

**Setup 4 — Reference Material**
A new setup screen has been inserted between Your Project and Starting Document. Reference Material is source documentation the hive consults every round but never edits — RFP requirements, job descriptions, style guides, scoring rubrics, prior decisions, vendor claims. It is sent to every reviewer and to the Builder on every round, prefixed with explicit "read-only — do not propose edits to this material" framing. It is distinct from Notes (round-to-round Builder directives that clear after each round) and from the Starting Document (the artifact under construction that the hive rewrites). Setup 4 ships with two tabs — Upload File and Paste Text — and a live characters / words / tokens estimate counter. The screen is always optional; the Continue button works with an empty field.

**Mid-session edits via the new 📚 Reference button**
The Work-screen toolbar now has a 📚 Reference button between Notes and Finish. It opens a drawer that mirrors the Notes drawer pattern (slides up from the bottom of the screen) but is wider (880 px) and taller (440 px textarea) to accommodate longer source material. The drawer includes the same characters / words / tokens counter and three actions: 📋 Copy, ✕ Clear (with confirmation), and 💾 Save & Close. Edits saved from the drawer apply to the next round. Past rounds are unaffected — see the next bullet.

**History snapshots reference material per round**
Every entry pushed to the round history (`history[]`) now stores a `referenceMaterialAtRound` field — a verbatim snapshot of the reference material text that was active when that round ran. This applies to all seven `history.push` sites: Original Document round 0, Builder Only success and failure paths, Unanimous convergence, Majority convergence, and the main full round success and failure paths. The implication is that you can edit reference material between rounds without rewriting history — each transcript entry stays internally consistent with the source material the hive actually saw at that moment.

### Architectural Rationale

The Setup 4 / Setup 5 / Notes / Starting Document split maps to four distinct roles in the prompt envelope, each with different lifecycle and edit semantics. Project Goal is the standing target, sent every round, never changing within a session. Reference Material is standing source material, sent every round, editable mid-session, but never edited by the hive. Starting Document is the artifact under construction, line-numbered and rewritten by the Builder each round. Notes are round-to-round Builder directives, sent on the next round only and cleared automatically after. Reference Material answers a question that was previously muddled — where does cite-against source material live? — because Notes was being used for both standing reference and round-to-round direction. The split makes each role explicit and gives users a clear place for each kind of input.

### Setup 4 / Setup 5 Renumber

The setup-screen sequence is now five screens. Worker Bees stays at Setup 1, Builder at Setup 2, Your Project at Setup 3. The new Reference Material screen takes Setup 4. Starting Document — formerly Setup 4 — becomes Setup 5. The setup-step badges in the top-right of every setup screen now read "Setup — Step N of 5" with N reflecting the new ordering. The nav menu drawer reflects the new order. Users navigating from prior versions will land on familiar content — only the numbering and the inserted optional screen between Project and Document have changed.

### Token Cost Reality

Reference material is sent to every reviewer every round. A 5,000-character RFP is roughly 1,250 tokens per request. A six-bee hive running four rounds spends about 30,000 tokens just transmitting the reference material — before any document content, project goal, or AI response is counted. Two consequences flow from this: trim aggressively (paste only what is load-bearing), and pick a cost-conscious Builder when reference material is large (DeepSeek and Gemini Flash are the cheapest per input token). The new What Are Tokens? section "Reference material and your token budget" walks through the math. The chars / words / tokens estimate counter on Setup 4 and on the Work-screen drawer uses the standard `chars / 4` rule of thumb for English text in OpenAI-family tokenizers — accurate to order of magnitude, not precise.

### Prompt Envelope Injection

Reference Material is injected into the prompt envelope in two sites: the canonical `buildPromptForAI` function (which produces the prompt for both reviewers and the Builder in normal rounds) and the Builder Only path (used when the user runs a Notes-only round without reviewers). In both, Reference Material lands after the Project Goal / Project Context block and before the Length Constraint block, with explicit framing that the hive must treat it as authoritative source of truth for facts, requirements, scoring criteria, or style rules and must not propose edits to it or include it in output. The `stripBuilderEnvelope` function has been extended to strip echoed Reference Material blocks from non-compliant Builder responses, matching the existing behavior for Project Goal and Project Context echoes.

### Documentation

**User Manual — new Step 4 page and full renumber cascade**
A complete new Step 4 — Reference Material section has been inserted between Step 3 and what was Step 4 (now Step 5 — Provide Your Starting Document). The new section covers what reference material is, when to use it, when to skip it, the four-field role distinction with a table comparing Project Goal, Reference Material, Starting Document, and Notes, the two-tab input model, the live counter, the token cost reality with practical numbers, and how to edit reference material mid-session via the 📚 Reference button. Every subsequent step has been renumbered: old Step 5 → Step 6, old Step 6 → Step 7, old Step 7 → Step 8, old Step 8 → Step 9, old Step 9 → Step 10, old Step 10 → Step 11. The sidebar TOC has been updated with the new entry and the circled-numeral glyphs extended to ⑪. The setup-flow intro and its accompanying table now describe five screens. All cross-references in the manual body have been shifted to match the new numbering.

**Index.html cross-references**
Every `waxframe-user-manual.html#stepN` link in `index.html` has been shifted to point at the new step number. Specifically: Work Screen references move from `#step6` to `#step7` (three occurrences), Review and Resolve from `#step8` to `#step9`, Run More Rounds from `#step9` to `#step10`, Export and Finish from `#step10` to `#step11`, and Provide Your Starting Document from `#step4` to `#step5`. The new Reference Material info modal correctly points to `#step4`. Cross-references for Steps 1, 2, and 3 are unchanged.

**Document Playbooks — Setup 4 / Setup 5 wayfinder updates and reference-material rewrites**
Every "Step 4 — Starting Document screen (the next screen after Your Project)" wayfinder header has been updated to "Step 5 — Starting Document screen (the next screen after Reference Material)" — twelve occurrences in total. The 22 inline mentions of "Setup 4 — Starting Document" have been bulk-shifted to "Setup 5 — Starting Document". Three playbooks that previously routed reference material through Notes have been rewritten: Cover Letter and Résumé now direct users to paste the job description on Setup 4 — Reference Material rather than the Notes drawer, and the RFP Response playbook now routes the RFP requirements text to Setup 4 — Reference Material in both the refining-a-draft and starting-from-scratch flows. Other playbooks where Notes guidance is genuinely round-to-round Builder direction (Business Proposal pain-point framing, Executive Summary trim directives, Blog Post style reminders) are unchanged.

**What Are Tokens? — new "Reference material and your token budget" card**
A new card has been added after "Tips for managing token costs" that walks through the practical math of reference-material token spend, explains why per-round costs scale with the size of the reference material multiplied by the number of reviewers and rounds, and reinforces two practical responses: trim aggressively, and switch the Builder to a cost-conscious model when reference material is large.

### Files Changed

- `index.html` — Inserted new `screen-reference` block between `screen-project` and `screen-document`. Added 📚 Reference button to the work-topbar between Notes and Finish. Inserted new nav menu entry for Setup 4 — Reference Material. Renumbered nav menu entry for Starting Document to Setup 5. Updated setup-step badges across all setup screens to "Setup — Step N of 5". Routed screen-document Back button to `screen-reference`. Updated screen-project Continue button label to "Continue — Reference Material →". Added new `referenceMaterialDrawer` element with counter row and Save / Clear / Copy actions. Added new `infoReferenceModal` and `infoTokenCostModal`. Shifted every `waxframe-user-manual.html#stepN` cross-reference to match the new step numbering. Bumped `waxframe-build` meta to `20260424-014`, `app.js?v=` cache-bust to `3.21.0`, and `version.js?v=` cache-bust to `3.21.0` (was stale at `3.19.23`).
- `app.js` — Added `refTab`, `refMaterial`, `refFilename` state vars. Bumped `BUILD` constant to `20260424-014`. Routed `continueFromProject` to `screen-reference`. Extended `saveProject`, `loadSettings`, and `clearProject` to handle reference material persistence. Inserted new REFERENCE MATERIAL MODULE before `startSession` containing `switchRefTab`, `handleRefDragOver`, `handleRefFileDrop`, `handleRefFileSelect`, `clearRefUploadedFile`, `processRefFile`, `handleRefPasteInput`, `estimateTokens`, `updateRefCounter`, `updateRefDrawerCounter`, `openReferenceMaterialDrawer`, `closeReferenceMaterialDrawer`, `saveReferenceMaterialFromDrawer`, `clearReferenceMaterialFromDrawer`, and `copyReferenceMaterial`. Injected REFERENCE MATERIAL block into the prompt envelope in both the canonical `buildPromptForAI` and the Builder Only path, after Project Goal / Project Context and before Length Constraint. Extended `stripBuilderEnvelope` regex strippers to handle echoed REFERENCE MATERIAL blocks. Added `referenceMaterialAtRound: refMaterial` snapshot to all seven `history.push` sites: Original Document round 0, Builder Only success and failure, Unanimous convergence, Majority convergence, full round success, and full round failure.
- `style.css` — Added v3.21.0 reference material section: `.ref-counter-row` and `.ref-counter-item` styling for the chars / words / tokens row, `.ref-counter-label` typography, `.ref-optional-hint` for the Setup 4 footer copy, `.notes-drawer.ref-drawer` width override (880 px), `.ref-drawer-counter-row` to match the notes-templates row pattern, and `.notes-drawer-ta.ref-drawer-ta` height override (440 px). `!important` count unchanged at 26.
- `version.js` — Bumped `APP_VERSION` to `v3.21.0 Pro`.
- `waxframe-user-manual.html` — Inserted new full Step 4 — Reference Material section between Step 3 and the renumbered Step 5. Renumbered every step from old Step 4 onward by one (old step4 → step5, …, old step10 → step11). Updated sidebar TOC with new Setup 4 — Reference Material entry, all subsequent entries shifted, glyph extended to ⑪. Updated setup-flow intro from "four setup screens" to "five setup screens" and inserted new Reference Material row in the setup-flow table. Shifted all body cross-references to match new numbering. Section icon glyphs extended to match. Bumped `version.js?v=` cache-bust to `3.21.0`.
- `document-playbooks.html` — Bulk-shifted 22 occurrences of "Setup 4 — Starting Document" to "Setup 5 — Starting Document". Updated 12 wayfinder headers from "Step 4 — Starting Document screen (the next screen after Your Project)" to "Step 5 — Starting Document screen (the next screen after Reference Material)". Rewrote Cover Letter, Résumé, and RFP Response playbooks to route reference-material content (job description, RFP requirements) through Setup 4 — Reference Material instead of the Notes drawer. Bumped `version.js?v=` cache-bust to `3.21.0`.
- `what-are-tokens.html` — Added new "Reference material and your token budget" card after "Tips for managing token costs". Bumped `version.js?v=` cache-bust to `3.21.0`.
- `api-details.html` — Bumped `version.js?v=` cache-bust to `3.21.0`. No content changes.
- `prompt-editor.html` — Bumped `version.js?v=` cache-bust to `3.21.0`. No content changes.
- `CHANGELOG.md` — This entry.

---

## v3.20.20 Pro — Build `20260424-013`
**Released:** April 24, 2026

### Documentation

**Step 9 — Explained the top-three reviewer cap and what it means for iteration on long documents**
Added a new block to Step 9 of the User Manual titled "Why a round can come up empty before the document is done." The block addresses a confusion that surfaced during testing: users were treating a round with no flagged conflicts as a signal that the document was finished, when in fact the underlying mechanic is that each reviewer is constrained to its top three most impactful suggestions per round, and on long or complex documents six reviewers picking three issues each only adds up to eighteen specific spots — which they do not always pick the same way. A round can therefore complete with zero conflicts not because the document is done, but because the reviewers happened to focus on different parts and none of their suggestions overlapped enough to disagree about. The new block makes this explicit, explains the rotating-focus pattern across rounds, and clarifies that the genuine "done" signal is a round where every reviewer responds with NO CHANGES NEEDED — not "no conflicts in the last round." Placed second in Step 9 immediately after "The rhythm of a session" so users encounter it before any of the Notes-related blocks.

### Why this matters

The top-three cap is one of the load-bearing design decisions in WaxFrame's review pass — without it, reviewers dump long lists of trivial nitpicks, the Builder gets overwhelmed, and conflicts pile up faster than the user can resolve them. The cap keeps each round focused, but the trade-off is that any single round only covers a finite number of spots in the document. For short documents this is invisible. For long documents (RFPs, multi-section reports, manuals) this is the difference between users running three rounds and giving up versus running eight rounds and reaching genuine convergence. Documenting the mechanic explicitly removes the guessing.

### Files Changed

- `waxframe-user-manual.html` — Added new "Why a round can come up empty before the document is done" block to Step 9. Bumped the manual's own `waxframe-build` meta to `20260424-013`.
- `app.js` — Bumped `BUILD` to `20260424-013`. No code changes.
- `version.js` — Bumped `APP_VERSION` to `v3.20.20 Pro`.
- `index.html` — Bumped `waxframe-build` meta to `20260424-013` and `app.js?v=` cache-bust to `3.20.20`.
- `CHANGELOG.md` — This entry.

---

## v3.20.19 Pro — Build `20260424-012`
**Released:** April 24, 2026

### Bug Fix

**Browser-eviction defense for session storage**
WaxFrame stores all session data — round history, document text, console log, notes, project clock — in IndexedDB. By default browsers treat this as "best-effort" storage that can be evicted at any time without warning, particularly under conditions like the user running "Clear browsing data" with cookies/site data checked, low disk space, long inactivity, or installed privacy extensions running their cleanup routines. This release adds two protections that were missing since the IndexedDB migration shipped.

**Layer 1 — Persistent storage request** — Added a call to `navigator.storage.persist()` early in `DOMContentLoaded`, before any session loading occurs. This requests that the browser promote our data from "best-effort" to "persistent" — a tier that will not be evicted unless the user explicitly clears site data. Chrome grants persistence automatically based on engagement signals: bookmarked, frequently visited, PWA-installed, push notifications granted. Other browsers vary. The call is idempotent (uses `navigator.storage.persisted()` to check before re-requesting) and harmless if the browser denies it — WaxFrame continues operating on best-effort storage as before. The result is exposed on `window._storagePersistent` for diagnostic inspection.

**Layer 2 — Eviction detection and user warning** — Added eviction detection to `loadSession`. The pattern: when the `waxframe_v2_session_exists` flag in localStorage is set to `'1'` but neither IndexedDB nor the LS_SESSION fallback returns recoverable data, the browser silently evicted our store between visits. Previously this dumped the user at the welcome screen with no explanation, indistinguishable from a fresh install. Now a `window._sessionEvicted` flag is set and the stale `session_exists` flag is cleared. After screen routing in `DOMContentLoaded`, if the eviction flag is set, an 18-second toast notification surfaces the loss with remediation guidance: "Browser cleared your saved WaxFrame session. This was the browser, not WaxFrame." If persistent storage is now granted, the message confirms recurrence is unlikely; if denied, it instructs the user to bookmark the site, visit regularly, and export transcripts after each session. A `console.warn` to the browser DevTools console captures the persistence status for technical follow-up.

### Why this matters

Best-effort browser storage has always been at risk of silent eviction. Without persistence and detection, session loss looked like normal "fresh install" behavior — invisible to the user, and to us. Multiple users have likely lost work to this without reporting it because there was nothing to report; the work just wasn't there anymore. Now the loss is surfaced loudly and the underlying cause is mitigated for any browser that supports persistent storage and grants the request.

### Testing Notes

To validate this release end to end:

1. Load WaxFrame in Chrome. Open DevTools → Console. Confirm `window._storagePersistent` is `true` (granted), `false` (denied), or `null` (browser doesn't support the API). On Chrome with the site bookmarked, expect `true`.
2. Run a round and let the session save. Open DevTools → Application → IndexedDB → `waxframe_v2_db`. Confirm a record exists in the `session` store under key `current`.
3. To simulate eviction: in DevTools → Application → IndexedDB, right-click `waxframe_v2_db` and choose Delete Database. Do **not** clear localStorage — leave the `waxframe_v2_session_exists` flag in place to mimic real eviction behavior.
4. Refresh the page. Expect the welcome screen to appear with an 18-second yellow toast warning that the browser cleared the session. The DevTools console should show a `[WaxFrame] Session eviction detected on load` warning with the persistence status logged.
5. Run a fresh round. Confirm the new session saves and persists across normal refreshes without triggering the eviction toast.

### Files Changed

- `app.js` — Added `navigator.storage.persist()` request in `DOMContentLoaded`. Added eviction detection in `loadSession` and surface toast in `DOMContentLoaded`. Bumped `BUILD` to `20260424-012`.
- `version.js` — Bumped `APP_VERSION` to `v3.20.19 Pro`.
- `index.html` — Bumped `waxframe-build` meta to `20260424-012` and `app.js?v=` cache-bust to `3.20.19`.
- `CHANGELOG.md` — This entry.

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
