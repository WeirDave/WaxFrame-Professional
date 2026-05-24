// ============================================================
//  WaxFrame — app.js
//  Build: 20260524-001
//  Author: WeirDave (R David Paine III) | License: AGPL-3.0
//  GitHub: github.com/WeirDave/WaxFrame-Professional
//
//  Storage keys:
//    LS_HIVE    (waxframe_v2_hive)    — AI list + API keys, persistent
//    LS_PROJECT (waxframe_v2_project) — project name/version/goal, per project
//    LS_SESSION (waxframe_v2_session) — round state + document, per session
//
//  Screen flow:
//    screen-welcome → screen-bees → screen-builder → screen-project → screen-document → screen-work
// ============================================================

// ============================================================
// WF_DEBUG — Two-layer Troubleshooting + Deep Dive system (v3.28.0)
// ------------------------------------------------------------
// Layer 1 — Troubleshooting Mode (ON by default for end users):
//   When a known failure happens, surface a plain-English
//   Troubleshooting Card with title / what it means / what to do.
//
// Layer 2 — Deep Dive Mode (OFF by default, dev-toolbar toggle):
//   On every round capture full technical detail (prompt sent,
//   raw response, status, elapsed ms, parse diagnostics) into
//   a ring buffer of the last 10 rounds for forensic inspection.
//
// Both layers compose: when both are on, a Troubleshooting Card's
// "Show Technical Details" expand pulls from Deep Dive's richer
// capture. When only Troubleshooting is on, the expand still
// exists but pulls from lightweight per-failure context.
// ============================================================
// ── WF_DEBUG SUBSYSTEM (extracted) ──
// v3.43.0 — WF_DEBUG object + WF_ERROR_CATALOG + WF_GENERIC_ENTRY +
// renderTroubleshootingCard + closeTroubleshootingCard + toggleTcDetails +
// tcCopyDetails moved to js/wf-debug.js. Loaded after version.js (uses
// APP_VERSION / BUILD at runtime in captureFailure) and before app.js
// (app.js has 42 references to WF_DEBUG). All references resolve via
// global lexical environment lookup — no window.* prefix needed.


// ── PHASES ──
const PHASES = [
  { id: 'draft',  label: '1 · Draft',       icon: '✏️' },
  { id: 'refine', label: '2 · Refine Text',  icon: '🔁' },
];

// ── DEFAULT AI LIST ──
const DEFAULT_AIS = [
  { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chatgpt.com',           icon: 'images/icon-chatgpt.png',    provider: 'chatgpt',    apiConsole: 'https://platform.openai.com/api-keys' },
  { id: 'claude',     name: 'Claude',     url: 'https://claude.ai',             icon: 'images/icon-claude.png',     provider: 'claude',     apiConsole: 'https://console.anthropic.com/settings/keys' },
  { id: 'deepseek',   name: 'DeepSeek',   url: 'https://chat.deepseek.com',     icon: 'images/icon-deepseek.png',   provider: 'deepseek',   apiConsole: 'https://platform.deepseek.com/api_keys' },
  { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com',     icon: 'images/icon-gemini.png',     provider: 'gemini',     apiConsole: 'https://aistudio.google.com/apikey' },
  { id: 'grok',       name: 'Grok',       url: 'https://grok.com',              icon: 'images/icon-grok.png',       provider: 'grok',       apiConsole: 'https://console.x.ai' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai',     icon: 'images/icon-perplexity.png', provider: 'perplexity', apiConsole: 'https://console.perplexity.ai' },
];

// ── API CONFIGS + MODEL DISCOVERY (extracted) ──
// v3.44.0 — API_CONFIGS, MODEL_FALLBACKS, fetchModelsForProvider,
// fetchModelsForProviderLive, getModelsForProvider, and the
// detectDeprecatedModels watchdog moved to js/api.js. Loaded after
// version.js and before app.js. API_CONFIGS and MODEL_FALLBACKS are
// exposed as window.* properties; the 4 functions auto-attach to
// window via standard function declaration hoisting.
// callAPI itself (line ~11500) remains in app.js for now.


// v3.27.1: unified recommend-cache key resolver. Defaults use the provider
// name (which equals the id for the built-in 6); customs use the AI's
// generated id. Lets buildModelSelector and recheckModelForAI share one
// lookup convention regardless of AI type.
function getCacheIdForAI(aiId) {
  const isDefault = !!DEFAULT_AIS.find(d => d.id === aiId);
  return isDefault ? `default-${aiId}` : `custom-${aiId}`;
}

// v3.32.10 — helpers to fetch role-specific cached recommendations.
// Returns the cached payload (with `model`, `why`, `labels`, optional `none`)
// or null. Also handles legacy migration: if a pre-v3.32.10 single cache key
// exists and the new role-specific keys do not, the legacy is treated as the
// Reviewer cache (matches the historic implicit role) so users see something
// useful while waiting for fresh recommendations to populate.
function getReviewerRecommendation(aiId) {
  const baseId = getCacheIdForAI(aiId);
  const reviewerCache = getCachedRecommendation(`${baseId}-reviewer`);
  if (reviewerCache) return reviewerCache;
  // Legacy migration: pre-v3.32.10 cache stored a single recommendation
  // under the unsuffixed key. Treat it as the Reviewer pick until refreshed.
  const legacy = getCachedRecommendation(baseId);
  return legacy || null;
}
function getBuilderRecommendation(aiId) {
  return getCachedRecommendation(`${getCacheIdForAI(aiId)}-builder`);
}

function buildModelSelector(aiId, provider, currentModel, showRecheck = false) {
  const models = getModelsForProvider(provider);
  if (!models.length) return '';

  // v3.32.10 — read TWO cached recommendations: Reviewer (✨) and Builder (🔨).
  // The dropdown surfaces both so users see the right pick for each role
  // their AI might be slotted into. Reasoning models flagged for the
  // Reviewer role show a small "Reasoning — slower/pricier" badge in the
  // option text since the Reviewer prompt allows them when genuinely best.
  const reviewerCache = getReviewerRecommendation(aiId);
  const builderCache  = getBuilderRecommendation(aiId);
  const reviewerModel = reviewerCache?.model || null;
  const builderModel  = builderCache?.model  || null;
  const reviewerWhy   = reviewerCache?.why   || '';
  const builderWhy    = builderCache?.why    || '';

  const isReasoningLike = (m) => BUILDER_DISALLOWED_PATTERN.test(m);

  const options = models.map(m => {
    const markers = [];
    if (m === reviewerModel) markers.push('✨'); // Reviewer pick
    if (m === builderModel)  markers.push('🔨'); // Builder pick
    const markerPart = markers.length ? markers.join(' ') + ' ' : '';
    const reasoningBadge = (m === reviewerModel && isReasoningLike(m)) ? ' (reasoning)' : '';
    const baseDisplay = `${markerPart}${m}${reasoningBadge}`;
    const selected = m === currentModel ? 'selected' : '';
    return `<option value="${m}" ${selected}>${esc(baseDisplay)}</option>`;
  }).join('');

  // Note line: shows the WHY for BOTH role recommendations whenever they're
  // cached — independent of which model the user currently has selected.
  // Each role renders on its own line via .model-select-note-line { display: block; }.
  // Model id is included in parens so users can confirm cache integrity.
  // v3.32.11 — switched from inline ' · ' separator to per-line spans
  // because long WHY text from BOTH roles concatenated mid-sentence
  // produced awkward wrapping. Each role on its own line is cleaner.
  // v3.32.12 — dropped the currentModel === reviewerModel/builderModel
  // gate. The notes describe what was RECOMMENDED for each role; they
  // should be visible whether the user has selected the recommended
  // model or some other one. Previously, picking the Reviewer pick hid
  // the Builder reasoning (and vice versa), which obscured the Builder
  // recommendation entirely whenever the two roles diverged on lineup
  // (Gemini, Grok, Mistral all hit this on the v3.32.11 first run).
  const noteParts = [];
  if (reviewerModel && reviewerWhy) {
    noteParts.push(`<span class="model-select-note-line">✨ Reviewer (${esc(reviewerModel)}): ${esc(reviewerWhy)}</span>`);
  }
  if (builderModel && builderWhy) {
    noteParts.push(`<span class="model-select-note-line">🔨 Builder (${esc(builderModel)}): ${esc(builderWhy)}</span>`);
  }
  // NONE handling — if the AI flagged NONE for Builder (no model on its
  // lineup is suitable as a Builder), surface that so users know why no
  // 🔨 marker appears in the dropdown. Only show when no actual Builder
  // pick is cached.
  if (!builderModel && builderCache?.none && builderCache?.why) {
    noteParts.push(`<span class="model-select-note-line">🔨 Builder: ${esc(builderCache.why)}</span>`);
  }
  const noteHtml = noteParts.length ? `<span class="model-select-note">${noteParts.join('')}</span>` : '';

  // v3.32.10 — recheck button label updated to reflect dual-role behavior.
  const recheckBtn = showRecheck
    ? `<button class="ai-recheck-btn" id="recheckbtn-${aiId}" onclick="recheckModelForAI('${aiId}')" title="Ask the provider's own API to recommend its best Reviewer and Builder models for WaxFrame">Recommend Models</button>`
    : '';

  return `<div class="model-select-wrap">
    <span class="model-select-label">Pick a model:</span>
    <select class="model-select" id="modelsel-${aiId}"
      onchange="saveModelForAI('${aiId}', this.value)"
      onclick="event.stopPropagation();">
      ${options}
    </select>
    ${recheckBtn}
    ${noteHtml}
  </div>`;
}

function saveModelForAI(aiId, modelId) {
  const ai = aiList.find(a => a.id === aiId);
  if (!ai) return;
  const cfg = API_CONFIGS[ai.provider];
  if (!cfg) return;
  cfg.model = modelId;
  // Update Gemini endpoint if needed
  if (ai.provider === 'gemini' && cfg.endpointFn) {
    cfg.endpoint = cfg.endpointFn(modelId);
  }
  saveSettings();
  // v3.32.12 — note re-render removed. As of v3.32.12, the role-recommendation
  // notes are invariant to which model the user has selected — both ✨ Reviewer
  // and 🔨 Builder lines render whenever the caches exist, full stop. Changing
  // the dropdown selection therefore has no effect on the note content, so
  // there's no reason to query the DOM and rewrite it on every change. The
  // note is set once by buildModelSelector at row render time and only
  // refreshes when the entire row is re-rendered (e.g., after Recommend Models
  // populates new caches). Removed for cleanliness, no behavior loss.
  toast(`✓ ${ai.name} model set to ${modelId}`, 2000);
}

// v3.30.2 — Revert an AI's model selection back to whatever was captured as
// _originalModel at AI creation/import time. Triggered by the ↺ Reset button
// that buildModelSelector renders only when current ≠ original. Re-renders
// the bee grid so the reset button disappears once we're back at baseline.
// Intentionally a hard reset with no confirmation modal — the action is
// trivial to undo (pick a different model again) and the dialog noise would
// outweigh the safety benefit.
// resetModelToOriginal() removed in v3.31.0 — its UI button (the
// "↺ Reset to {original}" button on the model selector row) was deleted
// along with this function. In v3.31.0–v3.32.9 the Best/Fast/Budget
// buttons in the expanded panel covered the "snap back to a sensible
// model" use case. Those buttons are also removed in v3.32.10 — the
// new dropdown surfaces ✨ Reviewer and 🔨 Builder picks directly,
// so no separate quick-switch row is needed.
// _originalModel field is still captured at AI add time but is no
// longer surfaced in any UI; kept as forward-compatibility scaffold
// for any future audit-trail feature.

// v3.30.2 — One-shot migration that grandfathers in pre-v3.30.2 custom AIs
// by snapshotting their CURRENT model as the _originalModel baseline. Defaults
// already snapshot at module-eval time (see the loop right after API_CONFIGS).
// This catches custom AIs that were imported/added under an earlier version
// where _originalModel wasn't being captured at creation time.
//
// The honest UX caveat: if the user previously ran Recommend, "current" is the
// recommended model — not their actual original pick. The toast tells them to
// re-pick now to update the baseline. We keep a localStorage flag so the toast
// shows once per upgrade, not on every load.
function ensureOriginalModelBaseline() {
  let migrated = 0;
  aiList.forEach(ai => {
    const isCustom = !DEFAULT_AIS.find(d => d.id === ai.id);
    if (!isCustom) return;
    const cfg = API_CONFIGS[ai.provider];
    if (cfg && cfg.model && !cfg._originalModel) {
      cfg._originalModel = cfg.model;
      migrated++;
    }
  });
  if (!migrated) return;
  saveHive();
  if (!localStorage.getItem('waxframe_v330_baseline_migrated')) {
    try { localStorage.setItem('waxframe_v330_baseline_migrated', '1'); } catch(e) { /* quota — fine */ }
    setTimeout(() => {
      toast(
        `💡 v3.30.2: Captured reset-to-original baselines for ${migrated} custom AI${migrated !== 1 ? 's' : ''}. ` +
        `If you ran Recommend before this version, re-pick the model now to update the baseline.`,
        9000
      );
    }, 1500);
  }
}

// v3.32.10 — One-time migration: clear stale single-pick recommendation
// caches from pre-v3.32.10 installs. The old format stored
// {model, why, labels: {tag: 'Best Overall'|'Fastest'|'Budget', why}}
// under a single per-provider/per-AI key. v3.32.10 splits into
// role-suffixed -reviewer and -builder keys with a different label shape.
// The legacy keys won't render usefully with the new buildModelSelector
// (no role markers, missing why text), so we wipe them on first load to
// force a clean re-recommend on next button click. Silent — no toast.
// The migration flag prevents re-clearing on every page load.
function migrateRecommendationCachesV33210() {
  if (localStorage.getItem('waxframe_v33210_recommend_migrated')) return;
  let cleared = 0;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Match pre-v3.32.10 single-pick recommendation cache keys.
      // The new role-suffixed keys end in -reviewer or -builder, so we
      // explicitly skip those to avoid wiping fresh v3.32.10 data on a
      // user who somehow runs the migration twice.
      if (/^waxframe_recommend_(default|custom)-/.test(k)
          && !/-(reviewer|builder)$/.test(k)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => { try { localStorage.removeItem(k); cleared++; } catch(e) {} });
    localStorage.setItem('waxframe_v33210_recommend_migrated', '1');
  } catch(e) { /* quota / privacy mode — accept and move on */ }
  if (cleared > 0) {
    console.info(`[migrate-v3.32.10] Cleared ${cleared} stale recommendation cache key(s) from pre-v3.32.10 format.`);
  }
}


// (both removed in v3.31.0) and the recovery from the legacy removeAI
// function (removed in v3.30.4). The snapshot is still kept because the
// self-heal path remains relevant for users upgrading from pre-v3.26.5
// hives where structural configs may have been destroyed.
//
// We deep-clone so any future mutations to API_CONFIGS at runtime (model
// swaps, recommend updates, etc.) don't pollute the canonical defaults.
// Functions can't survive JSON serialization, so we copy the object shells
// and re-attach the function references afterward.
const DEFAULT_API_CONFIGS = (() => {
  const snapshot = {};
  DEFAULT_AIS.forEach(d => {
    const orig = API_CONFIGS[d.provider];
    if (!orig) return;
    snapshot[d.provider] = {
      ...orig,
      // function refs survive shallow-clone — these are stable closures
    };
  });
  return snapshot;
})();

let aiList           = JSON.parse(JSON.stringify(DEFAULT_AIS)); // full list, active = checked ones
let activeAIs        = [];   // AIs selected in setup
let builder          = null; // id of builder AI
// v3.31.0 — hive mode dictates which buttons appear in the Worker Bee
// toolbar and which AIs are visible. 'internet' = direct-API providers,
// 'server' = AIs imported from a model server (Alfredo, OpenWebUI,
// LM Studio, etc.). Auto-detected on first load (any custom AI with
// _modelsEndpoint → server, otherwise internet) then sticky until the
// user explicitly flips. Persisted on the hive object.
let _hiveMode = 'internet';
// hiddenDefaultIds removed in v3.31.0 — defaults are always visible now.
// Legacy hiddenDefaultIds in saved hives is migrated to empty on first
// v3.31 load (see loadSettings).
let round     = 1;
let phase     = 'draft';
let history   = [];
let docText   = '';
let docTab    = 'upload';
// ── REFERENCE MATERIAL state (v3.21.0) ──
// ── Reference Material — multi-document support (v3.24.0+) ──
// Each entry: { id, name, text, source: 'upload'|'paste', filename }
//   - source 'upload' → text is read-only in UI (stored as fetched), filename set
//   - source 'paste'  → text is user-editable in UI, filename = null
//   - name → user-visible label, used as section header in prompt envelope
// Replaces the v3.21.0–v3.23.4 single-doc model (`refMaterial` string +
// `refFilename` string). Backup format v4 stores this as an array;
// v3 backups auto-migrate on restore — see loadProject().
let referenceDocs = [];

// Generate a stable session-local doc ID — unique within the active
// referenceDocs array; not globally unique by design.
function generateRefDocId() {
  return 'ref_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// Build the labeled prompt-envelope block for all reference docs.
// Returns empty string if no docs are present, so callers can append unconditionally.
// Multi-doc setups get a count line + per-doc section headers so AIs can cite
// specific documents by name when relevant.
function buildReferenceMaterialBlock(sep) {
  if (!referenceDocs.length) return '';
  const docs = referenceDocs.filter(d => (d.text || '').trim());
  if (!docs.length) return '';
  const docCount = docs.length;
  let block = `REFERENCE MATERIAL — read-only source the user is citing against. Do NOT propose edits to this material. Do NOT rewrite it or include it in your output. Treat it as authoritative source of truth for facts, requirements, scoring criteria, or style rules.\n`;
  if (docCount > 1) {
    block += `(${docCount} reference documents follow, each labeled with its name. Cite the specific document by name when relevant.)\n`;
  }
  block += '\n';
  docs.forEach(doc => {
    const text = (doc.text || '').trim();
    block += `${sep}\n## Reference: ${doc.name}\n${sep}\n${text}\n${sep}\n\n`;
  });
  return block;
}

// ── snapshotReferenceDocs (extracted) ──
// v3.47.0 — Moved to js/storage.js alongside the saveSession that uses it.


let workDocSaveTimer = null;
let pasteTextSaveTimer = null;
let _lineNumDebounce = null;

// ── VERSION ──
// APP_VERSION lives in version.js — loaded before app.js on every page.
const BUILD       = '20260524-001';         // build stamp — update each session
// ── localStorage KEYS (extracted) ──
// v3.45.0 — LS_HIVE / LS_PROJECT / LS_SESSION / LS_SETTINGS /
// LS_LICENSE constants moved to js/storage.js. References in app.js
// resolve via global lexical environment.


// ── CONSOLE ERROR DETAIL STORE ──
// Keyed by entry ID — stores raw API response data for the error detail modal
window._consoleErrorData = {};


// ── STORAGE PRIMITIVES (extracted) ──
// v3.45.0 — IndexedDB session helpers (idbOpen, idbSet, idbGet,
// idbClear) and checkStorageQuota moved to js/storage.js. Loaded
// after version.js and before app.js. Function declarations
// auto-attach to window; bare identifier references in app.js
// resolve via global scope chain.



const GUMROAD_PRODUCT_ID = 'Iyg5j-ySEnBtA5CKcuVT9A==';
const FREE_TRIAL_ROUNDS  = 3;

// ── UTILS ──
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// v3.32.20 — Strip the "[Base] " prefix that's added at module-load to
// default AI names. Used for display in the work-screen hive cards
// where the prefix is visual noise — every base model has it, so it
// isn't differentiating information at the card level. Underlying
// `ai.name` stays unchanged so export, transcript, conflict
// attribution, and the Change Builder modal (where Base vs Custom is
// useful at-a-glance) all continue to see the prefixed form. Use the
// plain `ai.name` everywhere except work-screen cards.
function displayAiName(name) {
  return (name || '').replace(/^\[Base\]\s+/, '');
}
function toast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function setStatus(msg) {
  const el = document.getElementById('statusText');
  if (el) el.textContent = msg;
}
function setFileStatusState(el, state) {
  el.classList.remove('file-status--loading', 'file-status--success', 'file-status--warn', 'file-status--error');
  if (state) el.classList.add('file-status--' + state);
}

// ── MUTE STATE ──
// v3.41.0 — Moved to js/theme.js as the single source of truth. theme.js
// is now loaded BEFORE app.js in index.html, so window._isMuted is
// already initialized from localStorage by the time we reach any of the
// audio-gating guards below. toggleMute(), _updateMuteBtn(), and
// initMuteBtn() also live in theme.js — accessed as window globals from
// HTML onclick handlers.

// ── SLOW-RESPONDER ALERT STATE ──
// v3.38.0 — User-level preference (not per-project, unlike length guard).
// Stored globally in localStorage so the choice persists across projects
// and sessions. Default: ENABLED (preserves pre-v3.38.0 behavior).
//
// When OFF, slow-responder DETECTION still runs at the round-end checkpoint
// (~line 12687, the per-AI timing comparison) and the console warning still
// fires unconditionally — so the diagnostic info remains available in the
// console pane for anyone who wants it. Only the WF_DEBUG.showCard(...) call
// is gated. This matters operationally because the Auto-Mode chain gate
// (~line 3612) blocks chaining whenever a troubleshooting card is active.
// Suppressing the card lets Auto Mode continue chaining through slow AIs
// — the use case David surfaced after a weekend of slow DeepSeek runs
// interrupting hands-off long-form Auto Mode work.
let _slowResponderEnabled =
  (localStorage.getItem('waxframe_slow_responder_enabled') !== 'false');

function toggleSlowResponder() {
  _slowResponderEnabled = !_slowResponderEnabled;
  localStorage.setItem('waxframe_slow_responder_enabled', _slowResponderEnabled);
  updateSlowResponderIndicator();
  if (_slowResponderEnabled) {
    consoleLog('🐢 Slow-AI alerts re-armed (cards will surface when a reviewer is >2× round avg)', 'info');
    toast('🐢 Slow-AI alerts: on', 3000);
  } else {
    consoleLog('🐢 Slow-AI alerts disabled (detection still runs and logs to console; cards suppressed for hands-off Auto runs)', 'info');
    toast('🐢 Slow-AI alerts: off', 3000);
  }
}

// Mirrors updateLengthGuardIndicator() — flips the .is-off class plus label
// and title between "on" and "off" depending on _slowResponderEnabled.
// Defensive: short-circuits if the indicator element is not in DOM yet.
function updateSlowResponderIndicator() {
  const el = document.getElementById('slowResponderIndicator');
  if (!el) return;
  const labelEl = el.querySelector('.slow-responder-indicator-label');
  if (_slowResponderEnabled) {
    el.classList.remove('is-off');
    el.title = 'Slow-AI alerts are on — click to suppress for hands-off Auto runs';
    if (labelEl) labelEl.textContent = 'Slow alerts: on';
  } else {
    el.classList.add('is-off');
    el.title = 'Slow-AI alerts are off — click to re-arm';
    if (labelEl) labelEl.textContent = 'Slow alerts: off';
  }
}

// ── AUTOSAVE PILL (v3.55.3) ──
// Work-screen footer pill mirroring the Slow-AI alerts pill. User-level
// preference persisted globally via localStorage 'waxframe_autosave_enabled'.
// Autosave IS the per-round IndexedDB session write (how reload-restore
// works). When ON (default), saveSession() persists every round so the user
// can pick up where they left off. When OFF, the automatic write is skipped
// (privacy / "don't keep my work + keys in this browser") — but manual Backup
// and Diagnostic still force a save so they always capture current state.
// The gate itself lives in storage.js saveSession(); this just drives the
// flag + pill. Default = ON (key absent or anything but 'false').
let _autosaveEnabled =
  (localStorage.getItem('waxframe_autosave_enabled') !== 'false');

function toggleAutosave() {
  _autosaveEnabled = !_autosaveEnabled;
  localStorage.setItem('waxframe_autosave_enabled', _autosaveEnabled);
  updateAutosaveIndicator();
  if (_autosaveEnabled) {
    consoleLog('💾 Autosave on — your session saves to this browser every round, so you can pick up where you left off.', 'info');
    toast('💾 Autosave: on', 3000);
    // Flush current state immediately so turning it back on captures now.
    saveSession();
  } else {
    consoleLog('💾 Autosave off — automatic per-round saving is paused. Use Backup to keep a copy you can restore or move.', 'info');
    toast('💾 Autosave: off', 3000);
  }
}

// Mirrors updateSlowResponderIndicator() — flips .is-off class + label + title.
// Defensive: short-circuits if the indicator element is not in DOM yet.
function updateAutosaveIndicator() {
  const el = document.getElementById('autosaveIndicator');
  if (!el) return;
  const labelEl = el.querySelector('.autosave-indicator-label');
  if (_autosaveEnabled) {
    el.classList.remove('is-off');
    el.title = 'Autosave is on — your session is saved every round so you can resume. Click to turn off.';
    if (labelEl) labelEl.textContent = 'Autosave: on';
  } else {
    el.classList.add('is-off');
    el.title = 'Autosave is off — automatic saving is paused. Click to turn on.';
    if (labelEl) labelEl.textContent = 'Autosave: off';
  }
}

// ── SETTINGS SCREEN (v3.55.4) ──
// Full-page preferences screen, opened from the hamburger menu. Starts with
// the Auto Mode section. All values persist to localStorage (per-machine).
// These settings are STORED here now; the Auto-mode behavior that consumes
// them (backup-Builder promotion, configurable streak limit, slow threshold)
// is wired in the "Auto really means Auto" P1.3 work. Reading them early is
// harmless — nothing consumes them until that lands.
const AUTO_SETTINGS = {
  backupBuilder:      { key: 'waxframe_auto_backup_builder',        def: ''   },
  neverDisableBuilder:{ key: 'waxframe_auto_never_disable_builder', def: 'false' },
  streakLimit:        { key: 'waxframe_auto_failure_streak_limit',  def: '2'  },
  slowMult:           { key: 'waxframe_auto_slow_multiplier',       def: '3'  },
  slowRounds:         { key: 'waxframe_auto_slow_rounds',           def: '2'  },
  rerollAttempts:     { key: 'waxframe_auto_reroll_attempts',       def: '2'  },
};

// Public getters other code (the P1.3 wiring) will read. Defensive parsing so
// a corrupted localStorage value can't break a run.
function getAutoBackupBuilder()      { return localStorage.getItem(AUTO_SETTINGS.backupBuilder.key) || ''; }
function getAutoNeverDisableBuilder(){ return localStorage.getItem(AUTO_SETTINGS.neverDisableBuilder.key) === 'true'; }
function getAutoStreakLimit()        { const n = parseInt(localStorage.getItem(AUTO_SETTINGS.streakLimit.key), 10); return Number.isFinite(n) && n >= 1 ? n : 2; }
function getAutoSlowMultiplier()     { const n = parseFloat(localStorage.getItem(AUTO_SETTINGS.slowMult.key));  return Number.isFinite(n) && n >= 2 ? n : 3; }
function getAutoSlowRounds()         { const n = parseInt(localStorage.getItem(AUTO_SETTINGS.slowRounds.key), 10); return Number.isFinite(n) && n >= 1 ? n : 2; }
function getAutoRerollAttempts()     { const n = parseInt(localStorage.getItem(AUTO_SETTINGS.rerollAttempts.key), 10); return Number.isFinite(n) && n >= 1 ? n : 2; }

let _settingsReturnScreen = 'screen-welcome';

function openSettings() {
  const active = document.querySelector('.screen.active');
  _settingsReturnScreen = (active && active.id && active.id !== 'screen-settings') ? active.id : 'screen-welcome';
  goToScreen('screen-settings');
}

function closeSettings() {
  goToScreen(_settingsReturnScreen || 'screen-welcome');
}

// Populate the Backup Builder dropdown from the live hive and sync every
// control to its stored value. Called from goToScreen when entering the
// Settings screen, so it always reflects the current hive + saved prefs.
function renderSettings() {
  // Backup Builder dropdown — list every configured AI except the current
  // Builder (a backup that IS the builder is meaningless). Falls back to the
  // full list if no builder is set yet.
  const sel = document.getElementById('setAutoBackupBuilder');
  if (sel) {
    const saved = getAutoBackupBuilder();
    const eligible = (Array.isArray(activeAIs) ? activeAIs : []).filter(a => a.id !== builder);
    sel.innerHTML = '<option value="">None — pause and ask me</option>' +
      eligible.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
    // Restore the saved choice only if that AI is still in the hive; otherwise
    // fall back to None so we never point at a removed AI.
    sel.value = eligible.some(a => a.id === saved) ? saved : '';
    if (sel.value !== saved) localStorage.setItem(AUTO_SETTINGS.backupBuilder.key, sel.value);
  }
  const toggle = document.getElementById('setAutoNeverDisableBuilder');
  if (toggle) toggle.checked = getAutoNeverDisableBuilder();
  const streak = document.getElementById('setAutoStreakLimit');
  if (streak) streak.value = getAutoStreakLimit();
  const sMult = document.getElementById('setAutoSlowMult');
  if (sMult) sMult.value = getAutoSlowMultiplier();
  const sRounds = document.getElementById('setAutoSlowRounds');
  if (sRounds) sRounds.value = getAutoSlowRounds();
  const reroll = document.getElementById('setAutoRerollAttempts');
  if (reroll) reroll.value = getAutoRerollAttempts();
  // v3.56.12 — Vision/OCR provider picker. List all four vision providers,
  // flagging which are keyed; the saved pick is restored (falls back to
  // Automatic at runtime if it's later un-keyed).
  const vis = document.getElementById('setVisionProvider');
  if (vis) {
    const label = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', grok: 'Grok' };
    vis.innerHTML = '<option value="">Automatic — first available</option>' +
      VISION_PROVIDERS.map(p => {
        const keyed = !!API_CONFIGS[p]?._key;
        return `<option value="${esc(p)}">${esc(label[p] || p)}${keyed ? '' : ' (no key)'}</option>`;
      }).join('');
    vis.value = getVisionProviderPref();
  }
}

// Save handlers — each fires on the control's change event, persists to
// localStorage, and gives a light toast so the save is visible.
function saveAutoBackupBuilder(val) {
  localStorage.setItem(AUTO_SETTINGS.backupBuilder.key, val || '');
  const name = (activeAIs.find(a => a.id === val) || {}).name;
  toast(val ? `⚡ Backup Builder set to ${name}` : '⚡ Backup Builder: none (Auto will pause and ask)', 3000);
}
function saveAutoNeverDisableBuilder(checked) {
  localStorage.setItem(AUTO_SETTINGS.neverDisableBuilder.key, checked ? 'true' : 'false');
  toast(checked ? '⚡ Builder will never be auto-disabled' : '⚡ Builder can be auto-disabled if it fails', 3000);
}
function saveAutoStreakLimit(val) {
  let n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) n = 1;
  if (n > 10) n = 10;
  localStorage.setItem(AUTO_SETTINGS.streakLimit.key, String(n));
  const el = document.getElementById('setAutoStreakLimit'); if (el) el.value = n;
  toast(`⚡ Failure-streak limit: ${n}`, 2500);
}
function saveAutoSlowMult(val) {
  let n = parseFloat(val);
  if (!Number.isFinite(n) || n < 2) n = 2;
  if (n > 10) n = 10;
  localStorage.setItem(AUTO_SETTINGS.slowMult.key, String(n));
  const el = document.getElementById('setAutoSlowMult'); if (el) el.value = n;
  toast(`⚡ Slow threshold: ${n}× round average`, 2500);
}
function saveAutoSlowRounds(val) {
  let n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) n = 1;
  if (n > 5) n = 5;
  localStorage.setItem(AUTO_SETTINGS.slowRounds.key, String(n));
  const el = document.getElementById('setAutoSlowRounds'); if (el) el.value = n;
  toast(`⚡ Slow threshold: ${n} round${n === 1 ? '' : 's'} in a row`, 2500);
}
function saveAutoRerollAttempts(val) {
  let n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) n = 1;
  if (n > 5) n = 5;
  localStorage.setItem(AUTO_SETTINGS.rerollAttempts.key, String(n));
  const el = document.getElementById('setAutoRerollAttempts'); if (el) el.value = n;
  toast(`⚡ Length-guard reround attempts: ${n}`, 2500);
}

// Restore every Auto Mode setting to its built-in default, then re-sync the
// controls so the UI reflects the reset immediately.
async function resetAutoSettings() {
  const ok = await wfConfirm(
    'Reset Auto settings',
    'Reset all Auto Mode settings to their defaults? This restores Backup Builder (none), Never disable Builder (off), Failure-streak limit (2), Slow threshold (3× / 2 rounds), and Reround attempts (2).',
    { okText: 'Reset to defaults', cancelText: 'Cancel' }
  );
  if (!ok) return;
  Object.values(AUTO_SETTINGS).forEach(s => localStorage.setItem(s.key, s.def));
  renderSettings();
  toast('↺ Auto settings reset to defaults', 3000);
  consoleLog('↺ Auto Mode settings reset to defaults.', 'info');
}

// ── AUDIO ──
// v3.41.0 — All play* audio functions extracted to js/audio.js. Loaded
// after js/theme.js (depends on window._isMuted) and before app.js so
// the functions are globally available by the time anything here calls
// them. See audio.js for: playRoundCompleteSound, playAlertSound,
// playAlertIfUserDecisions, playAutoHaltSound, playSmokerSound,
// playBuilderSound, playRosieSound, playFlyingCarSound.


let _roundTimerInterval = null;
let _roundTimerStart    = null;
// v3.52.7 — _clockInterval removed (was declared "reserved for future
// use" but never wired to anything in 30+ releases).

function startRoundTimer(btn, baseLabel) {
  _roundTimerStart = Date.now();
  clearInterval(_roundTimerInterval);
  const clock   = document.getElementById('roundTimerDisplay');
  const labelEl = document.getElementById('roundTimerLabel');
  clock?.classList.add('running');
  labelEl?.classList.add('running');
  if (clock)   clock.textContent = '00:00';
  if (labelEl) labelEl.textContent = baseLabel.toUpperCase();
  const btnLabel = btn?.querySelector('.shake-wide-label');
  if (btnLabel) btnLabel.textContent = baseLabel;
  _roundTimerInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - _roundTimerStart) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (clock) clock.textContent = `${m}:${s}`;
  }, 1000);
}

function stopRoundTimer() {
  clearInterval(_roundTimerInterval);
  _roundTimerInterval = null;
  _roundTimerStart    = null;
  const clock   = document.getElementById('roundTimerDisplay');
  const labelEl = document.getElementById('roundTimerLabel');
  clock?.classList.remove('running');
  labelEl?.classList.remove('running');
  if (clock)   clock.textContent = '00:00';
  if (labelEl) labelEl.textContent = 'READY';
}


// ── Project Clock ──
let _projClockInterval = null;
let _projClockSeconds  = 0;
let _projClockRunning  = false;

function _projClockRender() {
  const el = document.getElementById('projectTimerDisplay');
  if (!el) return;
  const h = Math.floor(_projClockSeconds / 3600);
  const m = Math.floor((_projClockSeconds % 3600) / 60);
  const s = _projClockSeconds % 60;
  el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function _projClockUpdateButtons() {
  const startBtn = document.getElementById('projClockStartBtn');
  const pauseBtn = document.getElementById('projClockPauseBtn');
  if (startBtn) startBtn.classList.toggle('active', _projClockRunning);
  if (pauseBtn) pauseBtn.classList.toggle('active', !_projClockRunning && _projClockSeconds > 0);
  const display = document.getElementById('projectTimerDisplay');
  if (display) {
    display.classList.toggle('running', _projClockRunning);
    display.classList.toggle('paused', !_projClockRunning && _projClockSeconds > 0);
  }
}

function projectClockStart() {
  if (_projClockRunning) return;
  _projClockRunning = true;
  _projClockInterval = setInterval(() => {
    _projClockSeconds++;
    _projClockRender();
  }, 1000);
  _projClockUpdateButtons();
}

function projectClockPause() {
  if (!_projClockRunning) return;
  _projClockRunning = false;
  clearInterval(_projClockInterval);
  _projClockInterval = null;
  _projClockUpdateButtons();
}

function projectClockReset() {
  _projClockRunning = false;
  clearInterval(_projClockInterval);
  _projClockInterval = null;
  _projClockSeconds = 0;
  _projClockRender();
  _projClockUpdateButtons();
}

function consoleLog(msg, type = 'info', rawData = null, link = null) {
  const el = document.getElementById('liveConsole');
  if (!el) return;
  // ── (v3.21.11) Strip the page-load default entry on first real log ──
  // The default "Console ready — Smoke the hive to begin." entry from
  // index.html stays in the DOM forever otherwise, because consoleLog
  // prepends new entries instead of replacing. That stale default
  // contaminated consoleHTML.includes(DEFAULT_CONSOLE_MSG) checks in
  // saveSession, causing Guard #1 to block every save after Round 1 —
  // which silently broke IDB persistence for every session since the
  // guard was added. Removing the default entry on first real activity
  // also matches the UX intent (it's only useful before anything happens).
  const defaultEntry = el.querySelector('.console-entry.console-info');
  if (defaultEntry && defaultEntry.textContent.includes('Smoke the hive to begin')) {
    defaultEntry.remove();
  }
  const entry = document.createElement('div');
  entry.className = `console-entry console-${type}`;
  const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const timeSpan = document.createElement('span');
  timeSpan.className = 'console-time';
  timeSpan.textContent = time + ' ';
  const msgSpan = document.createElement('span');
  msgSpan.textContent = msg.replace(/<[^>]+>/g, '');
  entry.appendChild(timeSpan);
  entry.appendChild(msgSpan);
  // v3.35.4 — Optional clickable link appended to console entry. Used
  // for actionable provider errors (credit-low, auth-failed, etc.) so
  // the user can click straight through to the provider console mid-
  // round without waiting for the round to finish. Built via DOM API
  // (createElement + textContent + href) so the URL/label cannot
  // inject HTML. The link is a sibling of the msgSpan, not part of
  // its text, so consoleHTML serialization to IDB still includes it
  // verbatim and reload restores the clickable state.
  // v3.35.5 — Native <a target="_blank"> click was getting eaten in
  // the work-screen layout (root cause not pinned — likely a
  // delegated handler or transparent overlay). Switched to explicit
  // window.open() onclick handler matching the working pattern in
  // renderTroubleshootingCard's button bindings (app.js:~506). The
  // href stays set as a fallback for middle-click, copy-link, and
  // screen readers, but the primary click path is the onclick.
  if (link && link.url && link.label) {
    const sep = document.createTextNode(' · ');
    const linkEl = document.createElement('a');
    linkEl.className = 'console-link';
    linkEl.href = link.url;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener';
    linkEl.textContent = link.label;
    const url = link.url;
    linkEl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, '_blank', 'noopener,noreferrer');
    };
    entry.appendChild(sep);
    entry.appendChild(linkEl);
  }
  // Clickable arrow for error/warn entries that carry raw response data
  if (rawData && (type === 'error' || type === 'warn')) {
    const entryId = 'cle_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    window._consoleErrorData[entryId] = rawData;
    const arrowBtn = document.createElement('button');
    arrowBtn.className = 'console-err-arrow';
    arrowBtn.textContent = '→';
    arrowBtn.title = 'Show raw response';
    arrowBtn.setAttribute('onclick', `openConsoleErrorDetail('${entryId}')`);
    entry.appendChild(arrowBtn);
  }
  el.prepend(entry);
}


// ── COPY / CLEAR HELPERS ──
// Single entry point for Copy buttons. Empty-state toast or success toast.
function copyToClipboard(text, label = 'Text', btn = null) {
  const txt = (text ?? '').toString();
  if (!txt.trim()) { toast(`⚠️ No ${label.toLowerCase()} to copy`); return; }
  // Resolve button reference: explicit arg, or the click event's currentTarget
  const button = btn || (typeof event !== 'undefined' ? event.currentTarget : null);
  navigator.clipboard.writeText(txt).then(
    () => {
      toast(`📋 ${label} copied`);
      flashCopyButton(button);
    },
    err => {
      // Promise rejection path — previously silent. Common causes: document
      // not focused, permissions denied, async context loss. Surface it.
      console.warn('[copy] writeText failed:', err);
      toast(`⚠️ Couldn't copy ${label.toLowerCase()} — click directly on the button and try again`);
    }
  );
}

// Brief green-check flash on a copy button to confirm the action visually,
// independent of the toast. Pass null and it's a no-op.
function flashCopyButton(btn) {
  if (!btn || !btn.classList) return;
  const original = btn.innerHTML;
  btn.classList.add('btn-copied');
  btn.innerHTML = '✓ Copied';
  setTimeout(() => {
    btn.classList.remove('btn-copied');
    btn.innerHTML = original;
  }, 1100);
}

function copyConsole() {
  const el = document.getElementById('liveConsole');
  if (!el) return;
  const text = Array.from(el.querySelectorAll('.console-entry')).reverse().map(e => e.textContent).join('\n');
  copyToClipboard(text, 'Console');
}

function copyConflicts() {
  copyToClipboard(document.getElementById('conflictsPanel')?.innerText, 'Conflicts');
}

function copyNotes() {
  copyToClipboard(document.getElementById('workNotes')?.value, 'Notes');
}

function clearNotes() {
  const ta = document.getElementById('workNotes');
  if (ta) ta.value = '';
  saveSession();
  updateNotesBtnPriority();
}

// v3.36.17 — Standing notes helpers. Mirror copyNotes / clearNotes
// but target the standing textarea. Standing notes don't influence
// the priority button glow (they inject every round automatically;
// the glow signals one-shot pending injection only), so clearStandingNotes
// does not call updateNotesBtnPriority().
function copyStandingNotes() {
  copyToClipboard(document.getElementById('workStandingNotes')?.value, 'Standing notes');
}

function clearStandingNotes() {
  const ta = document.getElementById('workStandingNotes');
  if (ta) ta.value = '';
  saveSession();
}

function copyGoal() {
  // Source from the assembler directly — the modal no longer has a textarea
  // to read from, since v3.21.7 replaced it with structured field rows.
  copyToClipboard(assembleProjectGoal(), 'Goal');
}

// v3.27.7: clearGoal() removed. The "✕ Clear Goal" button was eliminated in
// the project-screen restructure as redundant with the new Clear Project
// button now positioned in the section header. No remaining call sites.

function openChangeBuilder(opts) {
  // v3.49.0 — Optional opts.reason replaces the default modal subtitle;
  // opts.excludeId filters that AI out of the picker grid. Used by the
  // builder-disable interception path so the AI being disabled can't be
  // re-picked as the new builder. Calls without opts (the existing
  // "Change Builder" button) behave as before.
  const reasonEl = document.getElementById('changeBuilderReason');
  if (reasonEl) {
    reasonEl.textContent = opts?.reason ||
      'The Builder rewrites the document each round. Choose an AI with a paid API key and enough token capacity.';
  }
  const excludeId = opts?.excludeId || null;
  const grid = document.getElementById('changeBuilderGrid');
  if (grid) {
    const candidates = excludeId
      ? activeAIs.filter(a => a.id !== excludeId)
      : activeAIs;
    grid.innerHTML = candidates.map(ai => {
      const isSelected = ai.id === builder;
      // v3.32.16 — was bare `<img src="${ai.icon}" onerror="this.style.display='none'">`,
      // which bypassed the brand-match catalog AND silently hid the icon
      // when the PNG failed to load. Now routes through resolveAiIcon so
      // the same three-tier chain applies: brand match → ai.icon → letter
      // avatar (with v3.32.15's first-alphanumeric pickup). 36px matches
      // the .builder-pick-icon CSS sizing in the small grid variant.
      // Also fixes a pre-existing HTML bug: the prior template emitted
      // two `class=` attributes on the same <div> (only the first was
      // parsed, silently dropping `.builder-pick-card-inner`). Merged.
      const iconEl = resolveAiIcon(ai, 'builder-pick-icon', 36);
      return `<div class="builder-pick-btn btn builder-pick-card-inner ${isSelected ? 'selected' : ''}"
        title="${esc(ai.name)}"
        onclick="setBuilderFromModal('${ai.id}')">
        ${iconEl}
        <span class="builder-pick-name">${ai.name}</span>
        ${isSelected ? '<span class="builder-pick-current"><img src="images/WaxFrame_Builder_v3.png" class="builder-pick-current-bee" alt="" onerror="this.style.display=\'none\'"> Current</span>' : ''}
      </div>`;
    }).join('');
  }
  const modal = document.getElementById('changeBuilderModal');
  if (modal) modal.classList.add('active');
}

function closeChangeBuilder() {
  const modal = document.getElementById('changeBuilderModal');
  if (modal) modal.classList.remove('active');
  // v3.49.0 — If user cancelled the builder-disable flow, drop the
  // pending disable so the original toggle-off is forgotten. The AI
  // remains enabled and as the current builder.
  if (_pendingBuilderDisable) {
    const name = activeAIs.find(a => a.id === _pendingBuilderDisable)?.name || 'AI';
    _pendingBuilderDisable = null;
    if (typeof toast === 'function') toast(`${name} is still your Builder — disable cancelled`);
  }
  // v3.51.0 — Resume deferred auto chain. Mirrors the resume hook in
  // closeTroubleshootingCard. If auto-mode deferred a round because
  // this modal was open (either because the user was picking a new
  // builder OR because they cancelled), retry now. The helper
  // re-checks every gate so this is safe to call unconditionally.
  if (window._autoChainDeferred && window._autoMode) {
    const def = window._autoChainDeferred;
    if (typeof consoleLog === 'function') {
      consoleLog(`🤖 Auto chain resuming after Change Builder modal closed (deferred: ${def.label || 'unknown'})`, 'info');
    }
    if (typeof _autoFireChainedRound === 'function') {
      _autoFireChainedRound((def.label || 'builder-pick-resume') + '-retry', def.kind || 'round');
    }
  }
}

function showRoundErrorModal(reason, details) {
  // ── v3.28.2: Cards are always the surface for known reasons.
  // Legacy modal only fires for an unrecognized reason as a safety net.
  const ctxKindMap = {
    bloat:      'builder_bloat',
    conflicts:  'builder_missing_conflicts',
    delimiters: 'builder_delimiters'
  };
  const kind = ctxKindMap[reason];
  if (kind) {
    const ctx = {
      kind,
      message: details || '',
      raw:     details || null
    };
    const entry = WF_DEBUG.classify(new Error(reason), ctx);
    WF_DEBUG.showCard(entry, ctx);
    return;
  }
  // Builder API failure: callAPI ALREADY fired a Card with the actual
  // classified error and root-cause technical details. The legacy
  // generic modal would just contradict it. Suppress.
  if (reason === 'api') {
    return;
  }
  // Truly unknown reason — fall through to legacy modal as a safety net.

  const modal   = document.getElementById('roundErrorModal');
  const msgEl   = document.getElementById('roundErrorMsg');
  const detEl   = document.getElementById('roundErrorDetails');
  if (!modal) return;

  const messages = {
    bloat:    `The Builder returned a document that exceeded the length limit. Your document has not been changed. The measurement and limit are shown below in the unit you set on the Project screen.

You can try running the round again — the result may differ — or switch to a different Builder, or adjust the Length Constraint on the Project screen and try again.`,
    conflicts:`The Builder's response was missing a required section and could not be processed. Your document has not been changed.

You can try running the round again or switch to a different Builder and try again.`,
    delimiters:`The Builder's response was not formatted correctly and could not be read. Your document has not been changed.

You can try running the round again or switch to a different Builder and try again.`,
    api:      `The Builder encountered an error while processing your request. Your document has not been changed.

Check that your API key is valid and that you have sufficient credits, then try again.`
  };

  if (msgEl) msgEl.textContent = messages[reason] || messages.api;

  if (detEl && details) {
    detEl.textContent = details;
    detEl.classList.add('visible');
  } else if (detEl) {
    detEl.textContent = '';
    detEl.classList.remove('visible');
  }

  modal.classList.add('active');
}

function closeRoundErrorModal() {
  const modal = document.getElementById('roundErrorModal');
  if (modal) modal.classList.remove('active');
}

function setBuilderFromModal(id) {
  // v3.49.0 — Capture pending disable BEFORE setBuilder runs, since
  // setBuilder might trigger renders that touch toggleSessionBee indirectly.
  const pendingDisableId = _pendingBuilderDisable;
  _pendingBuilderDisable = null;

  setBuilder(id);
  closeChangeBuilder();
  renderBeeStatusGrid();

  if (pendingDisableId && pendingDisableId !== id) {
    // Builder-disable flow: now that builder is reassigned, complete the
    // original toggle-off. id !== pendingDisableId is guaranteed by the
    // excludeId filter in openChangeBuilder but checked here defensively.
    const disabledName = activeAIs.find(a => a.id === pendingDisableId)?.name || 'AI';
    const newBuilderName = activeAIs.find(a => a.id === id)?.name || 'AI';
    // Call toggleSessionBee — since builder is now `id` not `pendingDisableId`,
    // the builder-intercept branch will NOT fire and the disable proceeds.
    toggleSessionBee(pendingDisableId, false);
    toast(`👑 Builder changed to ${newBuilderName} — ${disabledName} toggled off`);
  } else {
    toast(`👑 Builder changed to ${activeAIs.find(a => a.id === id)?.name}`);
  }
}

// ══════════════════════════════════════
// LICENSE SYSTEM
// ══════════════════════════════════════

function isLicensed() {
  // Dev bypass — type this in browser console: localStorage.setItem('waxframe_dev','1')
  if (localStorage.getItem('waxframe_dev') === '1') return true;
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE) || 'null');
    return data && data.valid === true && data.key;
  } catch(e) { return false; }
}

function getTrialRoundsUsed() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE) || 'null');
    return (data && data.trialRoundsUsed) ? data.trialRoundsUsed : 0;
  } catch(e) { return 0; }
}

function incrementTrialRound() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE) || '{}');
    data.trialRoundsUsed = (data.trialRoundsUsed || 0) + 1;
    localStorage.setItem(LS_LICENSE, JSON.stringify(data));
    return data.trialRoundsUsed;
  } catch(e) { return 1; }
}

function saveLicense(key) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_LICENSE) || '{}');
    existing.valid = true;
    existing.key   = key;
    localStorage.setItem(LS_LICENSE, JSON.stringify(existing));
  } catch(e) { console.warn('[saveLicense] write failed:', e); }
}

function getLicenseKey() {
  // Returns the stored license key string, or null if not licensed.
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE) || 'null');
    return (data && data.valid && data.key) ? data.key : null;
  } catch(e) { return null; }
}

function clearLicense() {
  // Wipes the license (valid + key) but preserves trialRoundsUsed
  // so removing a license cannot be used to escape an expired trial.
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE) || '{}');
    delete data.valid;
    delete data.key;
    localStorage.setItem(LS_LICENSE, JSON.stringify(data));
  } catch(e) { console.warn('[clearLicense] write failed:', e); }
}


// ── DEV TOOLS ──
const DEV_PW_HASH = 'c930f4bedafc8f8dc0fc0b00f85851668dd60cc56c39ae8e1b09f5b2ea1e1902';

async function hashString(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function showDevModal() {
  const modal = document.getElementById('devModal');
  const input = document.getElementById('devPwInput');
  if (modal) modal.classList.add('active');
  setTimeout(() => input?.focus(), 100);
}

function hideDevModal() {
  const modal = document.getElementById('devModal');
  const input = document.getElementById('devPwInput');
  if (modal) modal.classList.remove('active');
  if (input) input.value = '';
}

async function submitDevPassword() {
  const input = document.getElementById('devPwInput');
  const val = input?.value || '';
  const hash = await hashString(val);
  if (hash === DEV_PW_HASH) {
    localStorage.setItem('waxframe_dev', '1');
    hideDevModal();
    // Show toolbar immediately without page reload
    const tb = document.getElementById('devToolbar');
    if (tb) {
      tb.style.display = 'flex';
      const savedPos = JSON.parse(localStorage.getItem('waxframe_dev_toolbar_pos') || 'null');
      if (savedPos) { tb.style.top = savedPos.top + 'px'; tb.style.left = savedPos.left + 'px'; tb.style.right = 'auto'; }
    }
    // Wire drag — otherwise toolbar is undraggable until next page load
    attachDevToolbarDrag();
    const navDevSection = document.getElementById('navDevSection');
    if (navDevSection) navDevSection.classList.add('active');
    toast('🛠 Dev mode enabled');
  } else {
    hideDevModal();
  }
}

function exitDevMode() {
  localStorage.removeItem('waxframe_dev');
  localStorage.removeItem('waxframe_dev_toolbar_pos');
  const tb = document.getElementById('devToolbar');
  if (tb) tb.style.display = 'none';
  const navDevSection = document.getElementById('navDevSection');
  if (navDevSection) navDevSection.classList.remove('active');
  toast('Dev mode disabled');
}

// Wire the dev toolbar's label as a drag handle. Called from two places:
//  1) DOMContentLoaded when dev mode is already on at page load
//  2) submitDevPassword when dev mode is unlocked mid-session
// The data-drag-attached guard prevents double-binding if both paths run.
function attachDevToolbarDrag() {
  const tb = document.getElementById('devToolbar');
  if (!tb || tb.dataset.dragAttached === '1') return;
  const label = tb.querySelector('.dev-toolbar-label');
  if (!label) return;
  tb.dataset.dragAttached = '1';
  label.addEventListener('mousedown', function(e) {
    e.preventDefault();
    // Immediately convert right-anchored position to explicit left/top.
    // Chrome and Edge both fight the drag if right is still set when left is applied.
    const rect = tb.getBoundingClientRect();
    tb.style.right  = 'auto';
    tb.style.bottom = 'auto';
    tb.style.left   = rect.left + 'px';
    tb.style.top    = rect.top  + 'px';
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    function onMove(e) {
      const newLeft = Math.max(0, Math.min(window.innerWidth  - tb.offsetWidth,  e.clientX - offX));
      const newTop  = Math.max(0, Math.min(window.innerHeight - tb.offsetHeight, e.clientY - offY));
      tb.style.left = newLeft + 'px';
      tb.style.top  = newTop  + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      localStorage.setItem('waxframe_dev_toolbar_pos', JSON.stringify({
        top:  parseInt(tb.style.top),
        left: parseInt(tb.style.left)
      }));
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── SCENE (extracted) ──
// v3.42.0 — License Unlock Scene + internal helpers moved to js/scenes.js. Loaded
// after js/audio.js (depends on play* helpers) and before app.js
// so all scene functions are globally available by the time app.js
// code references them.

function showLicenseModal(reason) {
  const modal = document.getElementById('licenseModal');
  const msg   = document.getElementById('licenseModalMsg');
  if (msg) {
    msg.textContent = reason === 'trial_expired'
      ? `You've used your ${FREE_TRIAL_ROUNDS} free rounds. Enter your license key to keep going.`
      : 'Enter your license key to continue using WaxFrame Pro.';
  }
  if (modal) modal.classList.add('active');
  setTimeout(() => document.getElementById('licenseKeyInput')?.focus(), 100);
}

function hideLicenseModal() {
  const modal = document.getElementById('licenseModal');
  if (modal) modal.classList.remove('active');
}

async function submitLicenseKey() {
  const input = document.getElementById('licenseKeyInput');
  const errEl = document.getElementById('licenseKeyError');
  const btn   = document.getElementById('licenseSubmitBtn');
  const key   = input?.value.trim();

  if (!key) { if (errEl) errEl.textContent = 'Please enter your license key.'; return; }
  if (btn)   { btn.disabled = true; btn.textContent = 'Verifying…'; }
  if (errEl) errEl.textContent = '';

  try {
    const resp = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id:           GUMROAD_PRODUCT_ID,
        license_key:          key,
        increment_uses_count: 'false'
      })
    });
    const data = await resp.json();
    if (data.success && !data.purchase?.refunded && !data.purchase?.chargebacked) {
      saveLicense(key);
      hideLicenseModal();
      updateLicenseBadge();
      playUnlockScene();
    } else {
      if (errEl) errEl.textContent = data.message || 'Invalid key. Check your Gumroad receipt and try again.';
    }
  } catch(e) {
    if (errEl) errEl.textContent = 'Could not reach Gumroad. Check your connection and try again.';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Unlock Pro'; }
  }
}

function updateLicenseBadge() {
  // v3.55.5 — Keep the pinned Buy footer in sync with license state:
  // visible for non-licensed (trial) users, hidden once a valid license is
  // present. This runs on load and after every license change, and the nav
  // panel is closed until opened, so there's no flash.
  const buyFooter = document.getElementById('navBuyFooter');
  if (buyFooter) buyFooter.style.display = isLicensed() ? 'none' : '';

  const badge = document.getElementById('licenseBadge');
  if (!badge) return;
  if (isLicensed()) {
    badge.textContent = '✓ Licensed';
    badge.title       = 'WaxFrame Pro — manage license';
    badge.classList.add('licensed');
    badge.onclick     = () => showLicenseManageModal();
  } else {
    const used      = getTrialRoundsUsed();
    const remaining = Math.max(0, FREE_TRIAL_ROUNDS - used);
    badge.textContent = remaining > 0
      ? `Trial — ${remaining} round${remaining === 1 ? '' : 's'} left`
      : 'Trial expired';
    badge.title   = 'Click to enter license key';
    badge.classList.remove('licensed');
    badge.onclick = () => showLicenseModal('');
  }
}

// ── License Manage Modal — shown when licensed badge is clicked ──
function showLicenseManageModal() {
  const modal = document.getElementById('licenseManageModal');
  const keyEl = document.getElementById('licenseManageKey');
  if (keyEl) {
    const key = getLicenseKey();
    // Mask all but the last 8 characters: "••••••••-••••••••-••••••••-XXXXXXXX"
    if (key && key.length >= 8) {
      const masked = key.slice(0, -8).replace(/[A-Za-z0-9]/g, '•') + key.slice(-8);
      keyEl.textContent = masked;
    } else {
      keyEl.textContent = '••••••••-••••••••-••••••••-••••••••';
    }
  }
  if (modal) modal.classList.add('active');
}

function hideLicenseManageModal() {
  const modal = document.getElementById('licenseManageModal');
  if (modal) modal.classList.remove('active');
}

function replaceLicenseKey() {
  // Open the entry modal so a new key can be submitted; old key remains
  // valid until the new one verifies, so the user is never locked out mid-flow.
  hideLicenseManageModal();
  showLicenseModal('');
}

async function confirmRemoveLicense() {
  // v3.52.8 — native confirm() → wfConfirm() migration. Function made
  // async (only called from HTML onclick handlers across 6 surfaces;
  // browsers don't await onclick return values, so async is safe).
  const ok = await wfConfirm(
    'Remove license key?',
    'Remove your WaxFrame Pro license key from this browser?\n\nYou will revert to the free trial. If your trial is already used up, you will need to enter a license key to keep running rounds.',
    { okText: 'Remove Key', destructive: true }
  );
  if (!ok) return;
  clearLicense();
  hideLicenseManageModal();
  updateLicenseBadge();
  toast('License key removed');
}
function goToScreen(id) {
  // Auto-save document state when navigating away from work screen,
  // but only if docText hasn't already been cleared (e.g. after finishAndNew)
  const currentDoc = document.getElementById('workDocument');
  if (currentDoc && currentDoc.value.trim() && docText) {
    docText = currentDoc.value.trim();
    saveSession();
  }

  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = 'flex';
    requestAnimationFrame(() => target.classList.add('active'));
  }

  // Render screen-specific content immediately on navigation
  if (id === 'screen-bees') {
    if (activeAIs.length === 0 && !localStorage.getItem(LS_HIVE)) {
      activeAIs = [...aiList];
    }
    renderAISetupGrid();
    setTimeout(updateBeesRequirements, 0);
  }
  if (id === 'screen-builder') {
    renderBuilderPicker();
    setTimeout(updateBuilderRequirements, 0);
  }
  if (id === 'screen-project') {
    setTimeout(updateProjectRequirements, 0);
    updateGoalCounter();
  }
  if (id === 'screen-work') {
    // Navigating back to work screen mid-session — restore doc and UI state
    // isNewSession = false preserves the console and conflicts panel
    initWorkScreen();
  }
  if (id === 'screen-settings') {
    renderSettings();
  }
  if (id === 'screen-document') {
    switchDocTab(docTab);
    // Restore file status if we had an uploaded file
    if (docTab === 'upload' && docText) {
      const fname = localStorage.getItem('waxframe_v2_filename') || 'uploaded file';
      const status = document.getElementById('fileStatus');
      if (status) {
        status.style.display = 'block';
        status.textContent = `✅ ${docText.length.toLocaleString()} characters loaded from ${fname}`;
        setFileStatusState(status, 'success');
      }
      const clearRow = document.getElementById('fileClearRow');
      if (clearRow) clearRow.style.display = 'block';
    }
    setTimeout(updateDocRequirements, 0);
    // v3.52.0 — Render source size check when arriving on Setup 5.
    // Reset the dismiss flag — re-entry to the screen is a fresh look
    // (user navigated away and back, so they should see current state).
    // setTimeout-zero defers until after DOM activation completes so
    // the helper reads the just-activated screen's state correctly.
    _sourceSizeCheckDismissed = false;
    setTimeout(() => {
      if (typeof renderSourceSizeCheck === 'function') renderSourceSizeCheck();
    }, 0);
  }
  if (id === 'screen-reference') {
    // Re-render reference cards when the user navigates back to Setup 4.
    // The cards' DOM state is owned entirely by renderReferenceCards() —
    // referenceDocs is the source of truth, so a single render call is all
    // we need to fully re-establish the screen.
    if (typeof renderReferenceCards === 'function') renderReferenceCards();
    if (typeof updateRefGrandTotals === 'function') updateRefGrandTotals();
  }
}

function openNavMenu() {
  document.getElementById('navPanel')?.classList.add('open');
  document.getElementById('navBackdrop')?.classList.add('open');
}

function closeNavMenu() {
  document.getElementById('navPanel')?.classList.remove('open');
  document.getElementById('navBackdrop')?.classList.remove('open');
}

async function confirmGoHome() {
  // v3.52.8 — native confirm() → wfConfirm() migration. Function made
  // async (called only from index.html nav-menu onclick; browsers don't
  // await onclick return values, so async is safe).
  // Warn if there's an active session with rounds completed or a document loaded
  if (history.length > 0 || docText) {
    const ok = await wfConfirm(
      'Go back to Home?',
      'Go back to the Home screen? Your session and document are saved — you can return to it by clicking Pro and navigating back to the work screen.'
    );
    if (!ok) return;
  }
  goToScreen('screen-welcome');
}

// ── SETTINGS PERSISTENCE (extracted) ──
// v3.47.0 — saveHive moved to js/storage.js along with the
// SETTINGS PERSISTENCE section header. saveProject and loadSettings
// also moved (their original positions are marked separately below).


// saveProject — project name/version/goal/docTab — cleared per project

// ── Assembles the structured goal fields into a single prompt string ──
function assembleProjectGoal() {
  const docType  = (document.getElementById('goalDocType')?.value  || '').trim();
  const audience = (document.getElementById('goalAudience')?.value || '').trim();
  const outcome  = (document.getElementById('goalOutcome')?.value  || '').trim();
  const scope    = (document.getElementById('goalScope')?.value    || '').trim();
  const tone     = (document.getElementById('goalTone')?.value     || '').trim();
  const notes    = (document.getElementById('goalNotes')?.value    || '').trim();
  const parts = [];
  if (docType)  parts.push(`Document type: ${docType}`);
  if (audience) parts.push(`Target audience: ${audience}`);
  if (outcome)  parts.push(`Desired outcome:\n${outcome}`);
  if (scope)    parts.push(`Scope and constraints:\n${scope}`);
  if (tone)     parts.push(`Tone and voice: ${tone}`);
  if (notes)    parts.push(`Additional instructions:\n${notes}`);
  return parts.join('\n\n');
}

function updateBeesRequirements() {
  const keyedCount = aiList.filter(ai => API_CONFIGS[ai.provider]?._key).length;
  const reqKeys = document.getElementById('req-keys');
  if (reqKeys) {
    reqKeys.textContent = (keyedCount >= 2 ? '✓' : '✗') + ` At least 2 AIs set up (${keyedCount} so far)`;
    reqKeys.classList.toggle('met', keyedCount >= 2);
  }
  const btn = document.getElementById('beesContinueBtn');
  if (btn) btn.classList.toggle('btn-accent', keyedCount >= 2);
}

function updateBuilderRequirements() {
  const hasBuilder = !!builder;
  const builderName = builder ? (aiList.find(a => a.id === builder)?.name || builder) : '';
  const reqBuilder = document.getElementById('req-builder');
  if (reqBuilder) {
    reqBuilder.textContent = (hasBuilder ? '✓' : '✗') + (hasBuilder ? ` Builder: ${builderName}` : ' Builder selected');
    reqBuilder.classList.toggle('met', hasBuilder);
  }
  const btn = document.getElementById('builderContinueBtn');
  if (btn) btn.classList.toggle('btn-accent', hasBuilder);
}

// Legacy alias used by renderAISetupGrid / renderBuilderPicker callbacks
function updateSetupRequirements() {
  updateBeesRequirements();
  updateBuilderRequirements();
}

function updateProjectRequirements() {
  const name     = document.getElementById('projectName')?.value.trim()    || '';
  const version  = document.getElementById('projectVersion')?.value.trim() || '';
  const docType  = document.getElementById('goalDocType')?.value.trim()    || '';
  const audience = document.getElementById('goalAudience')?.value.trim()   || '';
  const outcome  = document.getElementById('goalOutcome')?.value.trim()    || '';
  const reqName     = document.getElementById('req-name');
  const reqVersion  = document.getElementById('req-version');
  const reqDoctype  = document.getElementById('req-doctype');
  const reqAudience = document.getElementById('req-audience');
  const reqOutcome  = document.getElementById('req-outcome');
  if (reqName)     { reqName.textContent     = (name     ? '✓' : '✗') + ' Project name';    reqName.classList.toggle('met', !!name); }
  if (reqVersion)  { reqVersion.textContent  = (version  ? '✓' : '✗') + ' Version';         reqVersion.classList.toggle('met', !!version); }
  if (reqDoctype)  { reqDoctype.textContent  = (docType  ? '✓' : '✗') + ' Document type';   reqDoctype.classList.toggle('met', !!docType); }
  if (reqAudience) { reqAudience.textContent = (audience ? '✓' : '✗') + ' Target audience'; reqAudience.classList.toggle('met', !!audience); }
  if (reqOutcome)  { reqOutcome.textContent  = (outcome  ? '✓' : '✗') + ' Desired outcome'; reqOutcome.classList.toggle('met', !!outcome); }
  const allMet = !!name && !!version && !!docType && !!audience && !!outcome;
  const btn = document.getElementById('projectContinueBtn');
  if (btn) btn.classList.toggle('btn-accent', allMet);
}

function updateDocRequirements() {
  const pasteVal = document.getElementById('pasteText')?.value.trim() || '';
  const hasDoc  = !!(docText) || docTab === 'scratch' || (docTab === 'paste' && pasteVal);
  const reqDoc = document.getElementById('req-doc');
  if (reqDoc) {
    reqDoc.textContent = (hasDoc ? '✓' : '✗') + ' Document — upload a file, paste text, or choose Start from Scratch';
    reqDoc.classList.toggle('met', hasDoc);
  }
  const btn = document.getElementById('launchBtn');
  if (!btn) return;
  const hasActiveSession = history.length > 0 || (docText && round > 1);
  if (hasActiveSession) {
    btn.classList.add('btn-accent');
    btn.querySelector('.launch-label').textContent = '↩ Return to Work Screen';
    btn.onclick = () => goToScreen('screen-work');
  } else {
    btn.classList.toggle('btn-accent', hasDoc);
    btn.querySelector('.launch-label').textContent = 'Launch WaxFrame →';
    btn.onclick = () => startSession();
  }
}

// Legacy alias — kept for any internal calls that haven't been updated
function updateLaunchRequirements() {
  updateProjectRequirements();
  updateDocRequirements();
}

// ── SETTINGS PERSISTENCE: saveProject (extracted) ──
// v3.47.0 — Moved to js/storage.js.


// saveSettings — writes both (convenience wrapper)
function saveSettings() { saveHive(); saveProject(); }

// ── Length constraint helpers ──
// v3.36.12 — WORDS_PER_PAGE bumped from 500 to 600. The original 500
// was the conservative double-spaced-manuscript standard; real-world
// single-spaced 12pt with 1" margins runs 500–600 words per page,
// and business documents (proposals, reports, RFP responses) land
// at the upper end of that range. The 500 conversion was tripping
// the length guard on outputs that were correct for the genre —
// e.g. a 1174-word "2-page business proposal" reading as 17% over
// when it was actually 2.3 pages of legitimate proposal content.
// 600 wpp aligns with industry-standard typewriter math (Word's
// default page count, Gemini and ChatGPT's stated conversion) and
// represents a single typed page at standard formatting.
const WORDS_PER_PAGE      = 600;
const WORDS_PER_PARAGRAPH = 125; // fallback estimate for hint display only — bloat gate direct-counts paragraphs
const CHARS_PER_WORD      = 5.5; // average chars per word for estimation

// v3.56.4 — TARGET-mode tolerance band (#9). Target is a single number where
// the TOOL supplies the tolerance: "300 words" colloquially means "about 300."
// The convergence/round length check now accepts within a band instead of
// demanding an exact hit (the old floor = limit rule over-nudged on trivial
// misses — e.g. 299 read as "under", 302 fired the interactive modal). The band
// is asymmetric by design: generous on the UNDER side (a couple sentences short
// of "about N" still reads as N — the teacher 2-page case), tighter on the OVER
// side (overshoot can drift toward a real cap). HARD CAP and RANGE are NOT
// affected — a hard cap is a real wall (over is over, end on a complete
// sentence under it) and a range is human-set (respect the chosen bounds).
// Hardcoded for now; a user setting is tracked in the backlog, not built here.
const TARGET_TOLERANCE_UNDER = 0.10; // accept down to 90% of the target
const TARGET_TOLERANCE_OVER  = 0.05; // accept up to 105% of the target

// v3.56.10 — Goal context sent to the hive in non-draft (refine) rounds is
// truncated so the per-round prompt stays focused on the DOCUMENT, not the brief.
// Previously a hardcoded 300-char mid-word substring chop in the prompt paths,
// while the Project-screen preview used the sentence-aware truncateGoalForRefine()
// — the two disagreed, so the preview lied about what the hive received. Now ONE
// constant + that sentence-aware function drive BOTH paths and the preview, so the
// preview always matches reality. Bumped 300 -> 800: 300 amputated most multi-field
// goals mid-brief on every refine round. Draft phase still sends the FULL goal.
// Tune here.
const REFINE_GOAL_MAX_CHARS = 800;

// v3.56.11 — Vision-OCR fallback model per provider, used by the PDF/image OCR
// path when the user hasn't configured a vision model (visionCfg.model). These
// WILL go stale as providers rename/retire models, so they live here in ONE
// place rather than scattered inline. Each provider's OCR call uses
// `visionCfg.model || VISION_DEFAULTS[provider]` so a user-set model always wins.
const VISION_DEFAULTS = {
  chatgpt: 'gpt-4o',
  claude:  'claude-sonnet-4-6',
  gemini:  'gemini-2.5-flash',
  grok:    'grok-4',
};

// v3.33.0 — Length mode overhaul (#8). Replaced the implicit
// LENGTH_FLOOR_RATIO = 0.5 from v3.32.28 with explicit user-opted
// modes: 'none' | 'hardcap' | 'target' | 'range'. Convergence-under
// and round-undersized intercepts only fire in 'target' and 'range'
// modes — 'hardcap' has ceiling-only semantics, 'none' has no gates.
//
// Storage:
//   • lengthMode  — 'none' | 'hardcap' | 'target' | 'range'
//   • lengthLimit — single value for hardcap/target; the MAX in range
//   • lengthMin   — only used by range mode (the MIN of the range)
//   • lengthUnit  — same as before (characters/words/paragraphs/pages)
//
// Migration: pre-v3.33.0 projects have no lengthMode field. On load,
// if lengthLimit is set and lengthMode is missing, coerce to 'hardcap'
// — preserves prior ceiling-only behavior. Empty lengthLimit → 'none'.

// v3.33.0 — Mode-aware floor label for length-guard prompt UI. Same logic
// regardless of which intercept is firing (round-end or convergence-time).
// v3.56.4 — Target mode now surfaces the user's TARGET (targetNum), not the
// internal soft-band floor (#9). The band is an acceptance threshold the tool
// supplies; the user only ever set the target, so that's the number to show.
// targetNum is ignored for range/hardcap. Callers that don't pass it fall back
// to floorNum (back-compat).
function lengthFloorLabel(floorNum, unitName, mode, targetNum) {
  if (mode === 'target')      return `${targetNum != null ? targetNum : floorNum} ${unitName} (target)`;
  if (mode === 'range')       return `${floorNum} ${unitName} (range minimum)`;
  return `${floorNum} ${unitName}`;
}

function getLengthMode() {
  // Read the active mode from the pills, with sensible fallback.
  const activePill = document.querySelector('.length-mode-pill.is-active');
  if (activePill) return activePill.dataset.lengthMode || 'none';
  // Pre-DOM fallback (e.g. saveProject called before pills render):
  // infer from current field state.
  const lim = parseInt(document.getElementById('lengthLimit')?.value || '0', 10);
  return (lim > 0) ? 'hardcap' : 'none';
}

// ── Length-unit measurement helpers ──
// Direct-count the output in the user's chosen unit. Pages can't be measured
// from raw text, so it falls back to word count (and the gate compares against
// the word estimate from WORDS_PER_PAGE).
function countInUnit(text, unit) {
  if (!text) return 0;
  if (unit === 'characters')  return text.length;
  // v3.39.2 — Paragraph counter now requires terminal sentence punctuation
  // (.!?) in the block. Prior split-on-blank-lines counted standalone
  // headers (INTRODUCTION, CONCLUSION) and section dividers as paragraphs,
  // inflating the count and breaking length-guard targets. A paragraph
  // without sentence-ending punctuation is structurally a heading or a
  // fragment, not a paragraph.
  if (unit === 'paragraphs')  return text.split(/\n\s*\n/).filter(p => {
    const t = p.trim();
    return t.length > 0 && /[.!?]/.test(t);
  }).length;
  // words and pages both reduce to whitespace-split word count
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function unitLabel(unit, count) {
  const plural = count === 1 ? '' : 's';
  if (unit === 'pages')      return `page${plural}`;
  if (unit === 'paragraphs') return `paragraph${plural}`;
  if (unit === 'words')      return `word${plural}`;
  return `character${plural}`;
}

function getLengthConstraint() {
  const mode  = getLengthMode();
  if (mode === 'none') return null;
  const limit = parseInt(document.getElementById('lengthLimit')?.value || '0', 10);
  const minV  = parseInt(document.getElementById('lengthMin')?.value   || '0', 10);
  const unit  = document.getElementById('lengthUnit')?.value || 'characters';
  if (mode === 'range') {
    if (!limit || limit <= 0 || !minV || minV <= 0) return null;
    if (minV >= limit) return null; // misconfigured — treat as no constraint
  } else {
    if (!limit || limit <= 0) return null;
  }
  // wordLimit: a word-count estimate of the upper number (limit) used by the
  // pages-mode gate (pages aren't directly countable) and for hint display
  // on fuzzy units. Direct-counted units (chars, words, paragraphs) only use
  // limit; wordLimit is informational.
  let wordLimit;
  if (unit === 'words')           wordLimit = limit;
  else if (unit === 'paragraphs') wordLimit = limit * WORDS_PER_PARAGRAPH;
  else if (unit === 'pages')      wordLimit = limit * WORDS_PER_PAGE;
  else                            wordLimit = Math.round(limit / CHARS_PER_WORD);
  // wordMin: same conversion for the lower number (range mode only).
  let wordMin;
  if (mode === 'range') {
    if (unit === 'words')           wordMin = minV;
    else if (unit === 'paragraphs') wordMin = minV * WORDS_PER_PARAGRAPH;
    else if (unit === 'pages')      wordMin = minV * WORDS_PER_PAGE;
    else                            wordMin = Math.round(minV / CHARS_PER_WORD);
  }
  return { mode, limit, min: (mode === 'range' ? minV : null), unit, wordLimit, wordMin: wordMin || null };
}

function updateLengthConstraintHint() {
  const hintEl = document.getElementById('lengthConstraintHint');
  if (!hintEl) return;
  const c = getLengthConstraint();
  if (!c) { hintEl.textContent = ''; return; }
  if (c.unit === 'words') {
    hintEl.textContent = '';
  } else if (c.mode === 'range' && c.wordMin) {
    hintEl.textContent = `≈ ${c.wordMin.toLocaleString()}–${c.wordLimit.toLocaleString()} words`;
  } else {
    hintEl.textContent = `≈ ${c.wordLimit.toLocaleString()} words`;
  }
}

// v3.32.28 / v3.33.0 — Convergence-path length check helper.
// Returns the doc's length status against the active constraint:
//   { status: 'ok' | 'over' | 'under', actual, limitNum, floorNum, unitName, limitName, mode }
// 'under' is only ever returned in target or range mode (no floor exists in
// hardcap or none). The convergence pre-check uses this to decide whether to
// surface the lengthGuardPrompt before pushing to history and playing the
// celebration scene.
function getLengthStatus(text) {
  const c = getLengthConstraint();
  if (!c) return null;
  const actual    = countInUnit(text || '', c.unit);
  const limitNum  = c.unit === 'pages' ? c.wordLimit : c.limit;
  const unitName  = c.unit === 'pages' ? 'words' : unitLabel(c.unit, actual);
  const limitName = c.unit === 'pages'
    ? `${c.limit} page${c.limit !== 1 ? 's' : ''} (≈${c.wordLimit} words)`
    : `${c.limit} ${unitLabel(c.unit, c.limit)}`;
  // Floor depends on mode:
  //   • hardcap / none — no floor (status never 'under')
  //   • target          — soft tolerance band (#9, v3.56.4): floor = limit·(1−UNDER),
  //                       ceiling = limit·(1+OVER). "About N", not exactly N.
  //   • range           — floor = min (human-set), ceiling = max (human-set)
  // Floor + ceiling depend on mode:
  //   • hardcap / none — no floor (status never 'under'); ceiling is the exact
  //                      limit (a real wall — over is over)
  //   • range          — floor = min, ceiling = limit (both human-set; respect them)
  //   • target         — TOOL-supplied tolerance band around the single number
  //                      (#9, v3.56.4). "About N", not exactly N: generous under,
  //                      tighter over. Stops the exact-match over-nudge on trivial
  //                      misses (e.g. 299 / 302 vs 300). The directive still aims
  //                      the correction at the real target (limitNum), not the band edge.
  let floorNum = 0;
  let ceilNum  = limitNum;
  if (c.mode === 'target') {
    floorNum = Math.round(limitNum * (1 - TARGET_TOLERANCE_UNDER));
    ceilNum  = Math.round(limitNum * (1 + TARGET_TOLERANCE_OVER));
  } else if (c.mode === 'range' && c.min) {
    floorNum = c.unit === 'pages' ? (c.wordMin || c.min) : c.min;
  }
  let status = 'ok';
  if (actual > ceilNum)                        status = 'over';
  else if (floorNum > 0 && actual < floorNum)  status = 'under';
  return { status, actual, limitNum, floorNum, ceilNum, unitName, limitName, mode: c.mode };
}

// v3.33.0 — Mode picker click handler. Updates active pill, toggles the min
// field visibility for range mode, syncs the description line under the
// pills, persists via saveProject, and refreshes the hint.
function setLengthMode(mode) {
  const validModes = ['none', 'hardcap', 'target', 'range'];
  if (!validModes.includes(mode)) mode = 'none';
  document.querySelectorAll('.length-mode-pill').forEach(p => {
    const isActive = p.dataset.lengthMode === mode;
    p.classList.toggle('is-active', isActive);
    p.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  // Show/hide range-specific UI (min field + separator)
  const minEl = document.getElementById('lengthMin');
  const sepEl = document.getElementById('lengthRangeSep');
  if (minEl) minEl.style.display = (mode === 'range') ? '' : 'none';
  if (sepEl) sepEl.style.display = (mode === 'range') ? '' : 'none';
  // Update placeholder on the main field for clarity
  const llEl = document.getElementById('lengthLimit');
  if (llEl) {
    if (mode === 'range')        llEl.placeholder = 'max';
    else if (mode === 'target')  llEl.placeholder = 'e.g. 300';
    else if (mode === 'hardcap') llEl.placeholder = 'e.g. 200';
    else                         llEl.placeholder = '';
    llEl.disabled = (mode === 'none');
  }
  if (minEl) minEl.disabled = (mode !== 'range');
  // Update mode description
  const descEl = document.getElementById('lengthModeDesc');
  if (descEl) {
    if (mode === 'none')         descEl.textContent = 'No length gating. Reviewers and Builder receive no length instruction.';
    else if (mode === 'hardcap') descEl.textContent = 'Stay at or below the limit. Shorter is fine. Round-end and convergence-time guards fire only when the document goes over.';
    else if (mode === 'target')  descEl.textContent = 'Aim to hit the target value. Both ceiling and floor guards are armed; round-end checks are trajectory-aware so you only get prompted on rounds that move away from the target.';
    else if (mode === 'range')   descEl.textContent = 'Stay between the minimum and maximum. Both guards armed against their respective bounds.';
  }
  saveProject();
  updateLengthConstraintHint();
  updateProjectRequirements?.();
}

// ════════════════════════════════════════════════════════════════════
// v3.32.17 — Mid-round project-discard guard
// ────────────────────────────────────────────────────────────────────
// Problem: clearProject() and the Finish-modal "Start a new project"
// flow could fire while a round was still in flight. The orphaned
// round would resume after clearProject finished and call
// history.push() + saveSession() against the now-empty new project,
// recreating phantom round-1 entries and corrupting IDB.
//
// Solution: two layers.
//
// 1) Entry-point confirm. Every user-initiated path that ends in
//    clearProject() first calls confirmInterruptIfRunning(). If a
//    round is in flight (runRoundBtn has the .running class), we
//    show a wfConfirm modal: "Round in progress — discard the round
//    and continue?" If the user cancels, the discard is aborted.
//
// 2) Generation-token abandonment check. clearProject increments
//    window._projectGen. runRound and runBuilderOnly capture the gen
//    at their start, then re-check it before each history.push /
//    saveSession write block. If the gen has changed mid-round, the
//    round is "abandoned" — _abandonInFlightRoundUI() resets the run
//    button + smoker overlay + builder overlay to a clean state, and
//    the round bails without writing.
//
// The two layers are complementary: layer 1 keeps the user in
// control and gives them a chance to abort, while layer 2 is the
// safety net that prevents corruption even if the user confirmed
// the discard.
// ════════════════════════════════════════════════════════════════════

// True if the run button is currently in its "running" state (set by
// runRound and runBuilderOnly while a round is in flight, cleared on
// completion or error). We rely on this DOM signal rather than a
// separate flag because the .running class is the existing source of
// truth for double-click prevention (line ~10462 / ~10261).
function isRoundInFlight() {
  const btn = document.getElementById('runRoundBtn');
  return !!(btn && btn.classList.contains('running'));
}

// Surfaces a wfConfirm asking the user whether to discard an in-flight
// round before proceeding with a destructive action. Returns true if
// no round is in flight OR the user confirms; false if the user cancels.
//
// Callers should treat a false return as "abort the destructive action"
// and bail without doing anything else. Modal copy is intentionally
// blunt about the in-flight round being discarded so users can't be
// surprised by half-applied results bleeding into the new project.
async function confirmInterruptIfRunning() {
  if (!isRoundInFlight()) return true;
  return await wfConfirm(
    '🐝 Round in progress',
    'A round is currently running. Continuing will discard the in-flight round — any responses received so far will not be saved. Continue anyway?',
    { okText: 'Discard round and continue', destructive: true }
  );
}

// Wrapper for the "🗑 Clear Project" button on the Project screen.
// Replaces the previous direct `onclick="clearProject()"` so the
// in-flight check fires before clearProject runs. The Finish-modal
// path (finishAndNew) checks separately at its top — see that
// function for the rationale on why the check lives there rather
// than only inside clearProject.
async function requestClearProject() {
  if (!await confirmInterruptIfRunning()) return;
  await clearProject();
}

// Resets the run button + overlays to a clean state when an in-flight
// round is being abandoned mid-await. Called from runRound /
// runBuilderOnly when their generation-token check detects that
// clearProject ran while they were paused at an async boundary.
//
// Mirrors the cleanup that happens at the end of a normal round —
// remove the .running class so the user isn't stuck looking at a
// "Smoking…" button after they discarded the project, hide the
// overlays, restore the button label and timer.
function _abandonInFlightRoundUI() {
  const btn = document.getElementById('runRoundBtn');
  if (btn) {
    btn.classList.remove('running');
    btn.disabled = false;
    const lbl = btn.querySelector('.shake-wide-label');
    if (lbl) lbl.textContent = 'Smoke the Hive';
  }
  if (typeof stopRoundTimer === 'function') stopRoundTimer();
  if (typeof hideSmokerOverlay === 'function') hideSmokerOverlay();
  if (typeof hideBuilderOverlay === 'function') hideBuilderOverlay();
  // v3.35.0 — Round abandonment also disengages Auto. The user discarded
  // the project or it failed in a way that requires intervention; chaining
  // another round automatically would either write phantom history into
  // a freshly-cleared session or paper over an actionable failure.
  if (window._autoMode) {
    window._autoMode = false;
    window._autoCeilingTarget = null;
    window._autoSatisfiedHist = [];
    window._autoFailureStreak = 0;
    if (typeof updateAutoToggleUI === 'function') updateAutoToggleUI();
  }
}

// ────────────────────────────────────────────────────────────────────
// AUTO MODE — v3.35.0
// ────────────────────────────────────────────────────────────────────
// Auto chains rounds without waiting for the user. Toggle pill lives
// in the work-screen topbar. Engages and disengages anytime, mid-run
// included. A round in flight when Auto flips OFF still completes —
// the chain check at end-of-round just sees the flag is off and stops.
//
// Guardrails (v1):
//   • Max-rounds ceiling     — default 30, set when Auto engages,
//                              extended +ceiling on Resume
//   • Satisfied-count stall  — 3 rounds with identical {satisfied/total}
//   • USER DECISION resolver — auto-pick option with strict majority
//                              of attributed AIs; halt on tie
//   • AI-failure streak      — 2+ rounds in a row with builder error
//   • Convergence            — unanimous halts (project done);
//                              majority halts (review holdouts)
//
// On any halt → modal with [Resume Auto] [Switch to Manual]
// [Stop here]. Resume bumps ceiling, clears the stall window and
// failure streak, and fires the next round.
// ────────────────────────────────────────────────────────────────────
const AUTO_MAX_ROUNDS_DEFAULT  = 30;
const AUTO_STALL_WINDOW        = 3;
const AUTO_FAILURE_STREAK_LIMIT = 2;
// v3.56.15 — Churn detector. Distinct from the satisfied-count stall above:
// stall watches the reviewer S/T tally; churn watches the DOCUMENT for one
// sentence slot getting reworded round after round with no net change (the
// 24-round conference-center grind that oscillated on a single radio-count
// sentence). CHURN_WINDOW = consecutive rewords of the same slot before we
// flag it. CHURN_SIM_MIN = Jaccard token overlap below which two sentences
// are considered different content (not a reword) — keeps real edits from
// tripping it. Surfaces as a synthetic USER DECISION in the Conflicts panel.
const CHURN_WINDOW  = 3;
const CHURN_SIM_MIN = 0.45;
// v3.35.2 — AUTO_LS_KEY removed. Auto-mode state is no longer persisted
// to localStorage; it's strictly per-project and resets to OFF on every
// page reload. Legacy 'waxframe_auto_mode' keys from pre-v3.35.2
// sessions become orphan localStorage entries — harmless, no read site
// remains. v3.35.3 retired cleanup.html so these keys persist
// indefinitely; they're 2 bytes each and cause no behavior.

window._autoMode          = false;   // toggle state
window._autoCeilingTarget = null;    // halt-at round number
window._autoSatisfiedHist = [];      // sliding window of "S/T" strings
window._autoFailureStreak = 0;       // consecutive builder failures
window._autoChainPending  = false;   // debounce — round just kicked off
window._churnPending      = false;   // v3.56.15 — a churn decision is awaiting the user; Auto holds the chain
window._churnDismissed    = {};      // v3.56.15 — fp → round-until, suppress re-nag after "apply without locking"
// P1.3 #9 (v3.56.1) — at-convergence length reroll state.
window._autoLengthRerollCount  = 0;     // builder-only rerolls fired this convergence cycle
window._autoLengthRerollActive = false; // true while a length-reroll cycle is in flight
window._autoLengthDirective    = '';    // synthetic one-build Builder trim/expand directive
// v3.56.9 — Manual "Trim/Expand with Builder" reroll flag (interactive analog
// of #9). Separate from the Auto flags so Auto behavior is unchanged. Reuses
// _autoLengthDirective as the directive carrier; the inject gate and post-build
// branch in runBuilderOnly honor this flag even when Auto is OFF.
window._manualLengthReroll     = false;

// P1.3 #9 (v3.56.1) — Build the synthetic one-build Builder directive telling
// the Builder to trim (over) or expand (under) the converged document back
// into the length constraint. Injected into runBuilderOnly's prompt via
// window._autoLengthDirective; never touches the user's Notes field.
function _autoBuildLengthDirective(cstat) {
  const sep = '─'.repeat(60);
  if (cstat.status === 'over') {
    const overBy = Math.max(0, cstat.actual - cstat.limitNum);
    return `LENGTH CORRECTION (this build only):\n${sep}\nThe reviewers have already converged on the content. The document is currently ${cstat.actual} ${cstat.unitName}, which is ${overBy} ${cstat.unitName} OVER the limit of ${cstat.limitName}. Trim the document so it fits within the limit. End on a COMPLETE SENTENCE at or under the limit — never end mid-sentence. If the natural ending would push past the limit, end at the last complete sentence that fits; finishing a sentence or two short of the limit is correct and expected. Preserve all key content, structure, and meaning — remove redundancy and tighten prose, cutting only the least essential material. Do not introduce new ideas or sections. Return the complete trimmed document.`;
  }
  // Under: aim the expansion at the REAL target in target mode (the band floor is
  // only an acceptance threshold; once we're correcting, reach for N, not 0.9·N).
  // In range mode the floor IS the user's min — reaching it is the goal.
  const underGoal  = (cstat.mode === 'target') ? cstat.limitNum : cstat.floorNum;
  const underLabel = (cstat.mode === 'target') ? 'target' : 'floor';
  const reachPhrase = (cstat.mode === 'target') ? 'approximately the target' : 'at least the floor';
  const underBy = Math.max(0, underGoal - cstat.actual);
  return `LENGTH CORRECTION (this build only):\n${sep}\nThe reviewers have already converged on the content. The document is currently ${cstat.actual} ${cstat.unitName}, which is ${underBy} ${cstat.unitName} UNDER the ${underLabel} of ${underGoal} ${cstat.unitName}. Expand the document so it reaches ${reachPhrase}. Add substantive, relevant content consistent with the document's purpose and existing material — do not pad with filler or repetition. Return the complete expanded document.`;
}

// P1.3 #9 (v3.56.1) — At-convergence length reroll (Auto only). Called from
// both convergence sites and from runBuilderOnly's post-build re-check when the
// hive has converged but the document is out of range. Fires one more
// builder-only round with a trim/expand directive, or — once
// getAutoRerollAttempts() is spent — halts. Always returns true (the Auto
// branch took over the flow); callers must return immediately afterward.
function _autoConvergenceLengthReroll(cstat) {
  // Stop the in-flight round's UI before we reroll or halt.
  const _runBtn = document.getElementById('runRoundBtn');
  _runBtn?.classList.remove('running');
  if (_runBtn) { const _l = _runBtn.querySelector('.shake-wide-label'); if (_l) _l.textContent = 'Smoke the Hive'; }
  if (typeof stopRoundTimer === 'function') stopRoundTimer();
  if (typeof hideSmokerOverlay === 'function') hideSmokerOverlay();
  if (typeof hideBuilderOverlay === 'function') hideBuilderOverlay();

  const _verb = cstat.status === 'over' ? 'trim' : 'expand';
  const _max  = getAutoRerollAttempts();
  if (window._autoLengthRerollCount < _max) {
    window._autoLengthRerollCount++;
    window._autoLengthRerollActive = true;
    window._autoLengthDirective    = _autoBuildLengthDirective(cstat);
    consoleLog(`📏 Auto: converged at ${cstat.actual} ${cstat.unitName} — ${cstat.status} the ${cstat.status === 'over' ? 'limit' : 'floor'}. Sending back to the Builder to ${_verb} (attempt ${window._autoLengthRerollCount}/${_max})`, 'warn');
    toast(`📏 Converged ${cstat.status === 'over' ? 'over' : 'under'} length — Builder ${_verb} ${window._autoLengthRerollCount}/${_max}`, 5000);
    setStatus(`📏 Length ${_verb} — sending the document back to the Builder…`);
    _autoFireChainedRound('length-reroll', 'length-reroll');
  } else {
    window._autoLengthRerollActive = false;
    window._autoLengthDirective    = '';
    _autoHalt('length-reroll-exhausted', `The Builder couldn't bring the document into range after ${_max} attempt${_max === 1 ? '' : 's'} (still ${cstat.status} the ${cstat.status === 'over' ? 'limit' : 'floor'}: ${cstat.actual} ${cstat.unitName}). Edit the document and re-run, or accept it as-is.`);
  }
  return true;
}

// v3.56.9 — Manual "Trim/Expand with Builder" (interactive analog of #9's Auto
// reroll). Fires ONE builder-only trim/expand using the same directive #9 uses,
// but driven by the user from the length-guard modal instead of Auto. After the
// build, runBuilderOnly's manual post-build branch calls _manualLengthAfterFix()
// to re-check length and re-surface the guard so the user can fix again or
// accept — a trim -> recheck -> trim/accept loop, fully under user control.
async function _manualLengthFix(cstat) {
  // Stop the in-flight (just-converged) round's UI before handing to the Builder.
  const _runBtn = document.getElementById('runRoundBtn');
  _runBtn?.classList.remove('running');
  if (_runBtn) { const _l = _runBtn.querySelector('.shake-wide-label'); if (_l) _l.textContent = 'Smoke the Hive'; }
  if (typeof stopRoundTimer === 'function') stopRoundTimer();
  if (typeof hideSmokerOverlay === 'function') hideSmokerOverlay();
  if (typeof hideBuilderOverlay === 'function') hideBuilderOverlay();

  const _verb = cstat.status === 'over' ? 'trim' : 'expand';
  window._autoLengthDirective = _autoBuildLengthDirective(cstat);
  window._manualLengthReroll  = true;
  consoleLog(`📏 Manual: sending the document back to the Builder to ${_verb} (${cstat.actual} ${cstat.unitName})…`, 'warn');
  setStatus(`📏 ${_verb === 'trim' ? 'Trimming' : 'Expanding'} — sending the document back to the Builder…`);
  await runBuilderOnly();
}

// v3.56.9 — Post-build re-check for the manual length fix. The trimmed/expanded
// document is already committed by the time this runs. Re-check length: if it's
// in range, we're done (console note). If it's still out, re-surface the guard
// so the user can fix again, accept, or disable the guard. Mirrors #9's bounded
// loop, but interactive and unbounded (the user decides when to stop).
async function _manualLengthAfterFix() {
  const cstat = getLengthStatus(docText);
  if (!cstat || cstat.status === 'ok') {
    consoleLog(`📏 Length fix landed in range${cstat ? ` (${cstat.actual} ${cstat.unitName})` : ''} — length satisfied`, 'info');
    if (typeof toast === 'function') toast('📏 Document is now within your length range', 4000);
    return;
  }
  const choice = await lengthGuardPrompt({
    kind: cstat.status === 'over' ? 'convergence_over' : 'convergence_under',
    actual: cstat.actual,
    prevActual: cstat.actual,
    limitNum: cstat.status === 'over'
      ? cstat.limitNum
      : (cstat.mode === 'target' ? cstat.limitNum : cstat.floorNum),
    unitName: cstat.unitName,
    limitName: cstat.status === 'over'
      ? cstat.limitName
      : lengthFloorLabel(cstat.floorNum, cstat.unitName, cstat.mode, cstat.limitNum),
    builderName: 'The Hive'
  });
  if (choice === 'builder_fix') {
    await _manualLengthFix(cstat);
  } else if (choice === 'continue_anyway') {
    window._lengthGuardOverride = true;
    if (typeof updateLengthGuardIndicator === 'function') updateLengthGuardIndicator();
    consoleLog('📏 Length guard disabled for this project — current document accepted', 'warn');
    if (typeof toast === 'function') toast('📏 Length guard disabled — document accepted', 4500);
  } else {
    // 'keep' or 'discard' — leave the corrected document as-is on the work
    // screen. Nothing further; the user drives the next action.
    consoleLog(`📏 Length fix: kept the document at ${cstat.actual} ${cstat.unitName} (still ${cstat.status} the ${cstat.status === 'over' ? 'limit' : 'floor'}; guard remains armed)`, 'info');
  }
}

// v3.35.2 — saveAutoModePreference() and restoreAutoModePreference()
// removed. Auto-mode is per-project state, not a user preference.
// Page reload starts every session with Auto OFF; engaging Auto on a
// fresh project sets ceiling lazily from the current round value.
// The legacy 'waxframe_auto_mode' localStorage key has no read site
// after this release.

// User clicked the toggle pill in the topbar.
function toggleAutoMode() {
  const next = !window._autoMode;
  window._autoMode = next;

  if (next) {
    // Engaging — set ceiling, reset counters
    const r = (typeof round === 'number') ? round : 1;
    window._autoCeilingTarget = r + AUTO_MAX_ROUNDS_DEFAULT;
    window._autoSatisfiedHist = [];
    window._autoFailureStreak = 0;
    window._autoLengthRerollCount  = 0;
    window._autoLengthRerollActive = false;
    window._autoLengthDirective    = '';
    if (typeof consoleLog === 'function') {
      const left = Math.max(0, window._autoCeilingTarget - r);
      consoleLog(`🚀 Auto mode ON — ceiling round ${window._autoCeilingTarget}, current round ${r} (${left} left)`, 'info');
    }
    if (typeof toast === 'function') toast('🚀 Auto mode ON');

    // If a round is currently running, the chain check at completion
    // will see the flag and fire the next round automatically. If no
    // round is running and we're on the work screen, fire one now.
    const smokeBtn = document.getElementById('runRoundBtn');
    const onWorkScreen = document.getElementById('screen-work')?.classList.contains('active');
    const roundInFlight = smokeBtn?.classList.contains('running');
    if (onWorkScreen && !roundInFlight) {
      // Defer one tick so the toggle UI updates first, then fire.
      // v3.35.1 — Routed through _autoFireChainedRound for the
      // troubleshooting-card gate.
      _autoFireChainedRound('toggle-on');
    }
  } else {
    // Disengaging — leave any in-flight round to finish, just don't chain
    if (typeof consoleLog === 'function') consoleLog('🚀 Auto mode OFF — switched to Manual', 'info');
    if (typeof toast === 'function') toast('🚀 Auto mode OFF — Manual');
    window._autoCeilingTarget = null;
    window._autoSatisfiedHist = [];
    window._autoFailureStreak = 0;
    window._autoLengthRerollCount  = 0;
    window._autoLengthRerollActive = false;
    window._autoLengthDirective    = '';
    // v3.35.1 — Clear any deferred chain so it can't resurrect later.
    window._autoChainDeferred = null;
  }

  // v3.35.2 — saveAutoModePreference() call removed; Auto is no longer
  // persisted across reloads.
  updateAutoToggleUI();
}

// Refresh the toggle pill's visible state. Called after any mode change
// or at end of round.
// v3.36.14 — Static "Auto" label both states (.is-auto class brightens
// when ON). Round-count counter dropped from pill — toggleAutoMode
// logs ceiling/rounds-left to LIVE CONSOLE on engage instead.
function updateAutoToggleUI() {
  const btn = document.getElementById('autoModeToggle');
  if (!btn) return;
  const labelEl = btn.querySelector('.auto-mode-label');
  if (window._autoMode) {
    btn.classList.add('is-auto');
    if (labelEl) labelEl.textContent = 'Auto';
    btn.title = 'Auto mode — chains rounds until a guardrail trips. Click to switch to Manual.';
  } else {
    btn.classList.remove('is-auto');
    // v3.36.16 — Two-state label: "Manual" (default amber) flips to
    // "Auto" (green) when toggled on, mirroring the License badge's
    // two-text-state pattern. Reverses the v3.36.14 static-Auto-both-
    // states change once we got real-world feedback that the static
    // label hid the mode.
    if (labelEl) labelEl.textContent = 'Manual';
    btn.title = 'Manual mode — click to enable Auto and chain rounds automatically.';
  }
}

// ── USER DECISION majority resolver ───────────────────────────────
// For each decision in conflicts.userDecisions, tally how many AIs
// support each option. Strict majority of attributed AIs wins. Tie
// (or no clear winner) → return null so caller can halt.
//
// Returns a _decisionChoices-shaped object: { [decisionIdx]: { type, idx } }
// suitable for assignment to window._decisionChoices before calling
// applyDecisions(). Or null if any decision is unresolvable.
function _autoResolveUserDecisions(userDecisions) {
  if (!Array.isArray(userDecisions) || userDecisions.length === 0) return null;
  const choices = {};
  for (let i = 0; i < userDecisions.length; i++) {
    const d = userDecisions[i];
    if (!d || !Array.isArray(d.options) || d.options.length < 2) return null;
    // Count attributed AIs per option
    const counts = d.options.map(o => {
      if (!o.ais) return 0;
      const names = o.ais.split(',').map(n => n.trim()).filter(Boolean);
      return names.length;
    });
    let bestIdx = -1;
    let bestCount = 0;
    let tied = false;
    for (let j = 0; j < counts.length; j++) {
      if (counts[j] > bestCount) {
        bestCount = counts[j];
        bestIdx = j;
        tied = false;
      } else if (counts[j] === bestCount && bestCount > 0) {
        tied = true;
      }
    }
    if (bestIdx === -1 || bestCount === 0 || tied) return null; // halt
    choices[i] = { type: 'option', idx: bestIdx };
  }
  return choices;
}

// ── The chain decision ────────────────────────────────────────────
// Called at every natural round-end point with a context object:
//   { outcome, satisfied, total, builderError, errorReason, conflicts }
// Decides: chain another round, halt with modal, or do nothing
// (Auto is off / wrong screen / etc.).
function _autoMaybeChainNextRound(ctx) {
  if (!window._autoMode) return;
  // Wrong screen — halt silently. User navigated away mid-flight; if they
  // want to resume they'll come back and Auto's still toggled on.
  const onWorkScreen = document.getElementById('screen-work')?.classList.contains('active');
  if (!onWorkScreen) return;

  ctx = ctx || {};

  // 1) Convergence — done. v3.36.15 swaps the _autoHalt() modal for a
  //    silent Auto-OFF flip on unanimous and majority. The convergence
  //    indicators on the reviewer cards plus the toast already
  //    communicate the win — the modal was redundant and added an
  //    extra click before the user could review. Remaining halt cases
  //    (ceiling, stall, failure-streak, decision-tie) still surface
  //    the modal because each requires a deliberate next move.
  if (ctx.outcome === 'unanimous' || ctx.outcome === 'majority') {
    window._autoMode             = false;
    window._autoCeilingTarget    = null;
    window._autoSatisfiedHist    = [];
    window._autoFailureStreak    = 0;
    window._autoChainDeferred    = null;
    updateAutoToggleUI();
    consoleLog(
      `🤖 Auto Mode OFF — ${ctx.outcome === 'unanimous' ? 'unanimous convergence' : 'majority convergence'}`,
      'info'
    );
    return;
  }

  // 2) Builder errors — track failure streak, halt at limit
  if (ctx.outcome === 'failed' || ctx.builderError) {
    window._autoFailureStreak = (window._autoFailureStreak || 0) + 1;
    if (window._autoFailureStreak >= AUTO_FAILURE_STREAK_LIMIT) {
      const reasonLabel = ctx.errorReason
        ? `Builder failed ${window._autoFailureStreak} rounds in a row (last reason: ${ctx.errorReason}).`
        : `Builder failed ${window._autoFailureStreak} rounds in a row.`;
      _autoHalt('failure-streak', reasonLabel);
      return;
    }
    // Single failure — don't chain further this turn; user can hit Smoke
    // manually or wait. We don't auto-retry on single failure to avoid
    // burning credits on a transient API issue. Update UI and exit.
    updateAutoToggleUI();
    return;
  }

  // From here: round succeeded. Reset the failure streak.
  window._autoFailureStreak = 0;

  // 3) Ceiling check — at-or-past the cap
  if (typeof round === 'number' && window._autoCeilingTarget !== null && round >= window._autoCeilingTarget) {
    _autoHalt('ceiling', `Reached the round ceiling (${window._autoCeilingTarget - 1} rounds completed since Auto engaged).`);
    return;
  }

  // 4) Satisfied-count stall — track only when reviewers ran (skip
  //    builder-only rounds where ctx.outcome === 'builder-only'; those
  //    have no reviewer signal to evaluate).
  if (ctx.outcome === 'success' && typeof ctx.satisfied === 'number' && typeof ctx.total === 'number' && ctx.total > 0) {
    const key = `${ctx.satisfied}/${ctx.total}`;
    window._autoSatisfiedHist.push(key);
    if (window._autoSatisfiedHist.length > AUTO_STALL_WINDOW) {
      window._autoSatisfiedHist.shift();
    }
    if (window._autoSatisfiedHist.length >= AUTO_STALL_WINDOW) {
      const allSame = window._autoSatisfiedHist.every(k => k === key);
      if (allSame) {
        _autoHalt('stall', `Satisfied count stuck at ${key} for ${AUTO_STALL_WINDOW} rounds — convergence has stalled.`);
        return;
      }
    }
  }

  // 5) USER DECISIONs in this round's conflicts → try majority auto-pick
  const ud = ctx.conflicts?.userDecisions;
  if (Array.isArray(ud) && ud.length > 0) {
    const resolved = _autoResolveUserDecisions(ud);
    if (!resolved) {
      _autoHalt('decision-tie', `A USER DECISION block has no clear majority. Pick options manually, then Resume Auto.`);
      return;
    }
    // Apply the auto-picks via the existing applyDecisions() path,
    // which sends to runBuilderOnly and chains naturally on completion.
    if (typeof consoleLog === 'function') {
      consoleLog(`🤖 Auto-resolving ${ud.length} USER DECISION block${ud.length !== 1 ? 's' : ''} by attribution majority`, 'info');
    }
    window._decisionChoices = resolved;
    // Fire deferred so the round-complete UI/state finishes settling first.
    // v3.35.1 — Routed through _autoFireChainedRound with kind 'apply-decisions'.
    _autoFireChainedRound('user-decision-majority', 'apply-decisions');
    updateAutoToggleUI();
    return;
  }

  // 6) Clean round, no halt conditions → fire next round
  updateAutoToggleUI();
  _autoFireChainedRound('chain-success');
}

// v3.35.1 — Centralized chain-fire gate.
// Called from every chain-fire site in Auto Mode: post-success chain,
// toggle-on while idle, post-Resume chain, and post-USER-DECISION
// auto-resolve. All sites need the same protections:
//   • Auto still toggled ON (user may have flipped off in the gap)
//   • On the work screen (user may have navigated away)
//   • No round currently in flight (defensive — shouldn't happen)
//   • No troubleshootingCard active (per-AI errors / slow-responder)
//
// If the troubleshooting card is up, set the deferred flag so
// closeTroubleshootingCard() re-fires the chain when dismissed.
// 'kind' is either 'round' (default — fires runRound) or 'apply-decisions'
// (fires applyDecisions which sends to Builder and chains naturally).
function _autoFireChainedRound(label, kind) {
  kind = kind || 'round';
  setTimeout(() => {
    if (!window._autoMode) return;
    if (!document.getElementById('screen-work')?.classList.contains('active')) return;
    if (document.getElementById('runRoundBtn')?.classList.contains('running')) return;
    // v3.35.1 — Gate on troubleshooting card. Per-AI errors (5xx, slow
    // responder) pop a card on top of the work screen. Without this gate
    // Auto fires the next round in the background while the card is still
    // up, stacking modals from successive rounds. Defer here; the close
    // handler will retry when the user dismisses the card.
    if (document.getElementById('troubleshootingCard')?.classList.contains('active')) {
      window._autoChainDeferred = { kind, label, at: Date.now() };
      if (typeof consoleLog === 'function') {
        consoleLog(`🤖 Auto chain deferred (${label}) — troubleshooting card is open`, 'info');
      }
      return;
    }
    // v3.56.15 — Churn gate. When the churn detector has surfaced a synthetic
    // decision in the Conflicts panel, hold the chain. Unlike the cards above
    // we do NOT set _autoChainDeferred: resume comes from applyDecisions() →
    // runBuilderOnly() (which re-enters the chain on its own), so a deferred
    // re-fire here would double-fire the round.
    if (window._churnPending) {
      if (typeof consoleLog === 'function') {
        consoleLog(`🤖 Auto paused (${label}) — churn decision pending in the Conflicts panel`, 'info');
      }
      return;
    }
    // v3.51.0 — Builder-disable modal gate. Mirrors the troubleshooting-card
    // gate above. v3.49.0 introduced the builder-disable interception (when
    // user tries to toggle off the current builder, the Change Builder modal
    // opens for them to pick a new builder first). But auto-mode kept
    // chaining rounds underneath, so the round would fire with the old
    // builder still set while the user was mid-modal. Defer here; the
    // closeChangeBuilder resume hook fires when the modal closes.
    if (_pendingBuilderDisable) {
      window._autoChainDeferred = { kind, label, at: Date.now() };
      if (typeof consoleLog === 'function') {
        consoleLog(`🤖 Auto chain deferred (${label}) — waiting for new Builder pick`, 'info');
      }
      return;
    }
    window._autoChainDeferred = null;
    if (kind === 'apply-decisions') {
      if (typeof applyDecisions === 'function') applyDecisions();
    } else if (kind === 'length-reroll') {
      // P1.3 #9 (v3.56.1) — at-convergence length correction: builder-only.
      if (typeof runBuilderOnly === 'function') runBuilderOnly();
    } else {
      if (typeof runRound === 'function') runRound();
    }
  }, 120);
}

// ── Halt modal ────────────────────────────────────────────────────
// Three actions: Resume / Switch to Manual / Stop here.
// Resume extends ceiling by AUTO_MAX_ROUNDS_DEFAULT and clears the
// stall window + failure streak before chaining.
function _autoHalt(reasonCode, reasonText) {
  if (typeof consoleLog === 'function') consoleLog(`🤖 Auto paused — ${reasonCode}: ${reasonText}`, 'warn');
  // Stash the reason so handlers know whether Resume makes sense.
  window._autoLastHalt = { code: reasonCode, text: reasonText, at: Date.now() };
  const modal = document.getElementById('autoHaltModal');
  const reasonEl = document.getElementById('autoHaltReason');
  const resumeBtn = document.getElementById('autoHaltResumeBtn');
  if (reasonEl) reasonEl.textContent = reasonText || 'Auto stopped.';
  // Resume is meaningless after unanimous convergence (project is done)
  // — disable the button. The user is meant to Finish, not push more rounds.
  if (resumeBtn) {
    if (reasonCode === 'converged') {
      resumeBtn.disabled = true;
      resumeBtn.title = 'The document already reached unanimous convergence — there is nothing left to chain.';
    } else {
      resumeBtn.disabled = false;
      resumeBtn.title = '';
    }
  }
  if (modal) modal.classList.add('active');
  updateAutoToggleUI();
  // v3.37.2 — Distinct "Auto halted" cadence. Skip on converged because
  // the unanimous-convergence path already played its fanfare; stacking
  // the halt-sound on top would muddy that moment. Halt reasons that
  // need their own audible cue: ceiling, stall, failure-streak,
  // decision-tie (and future length-at-convergence per P1.3 #9).
  if (reasonCode !== 'converged' && typeof playAutoHaltSound === 'function') {
    try { playAutoHaltSound(); } catch (e) {}
  }
}

function autoHaltResume() {
  const modal = document.getElementById('autoHaltModal');
  if (modal) modal.classList.remove('active');
  if (!window._autoMode) {
    // User toggled off while modal was open — respect that.
    return;
  }
  // Reset stall + failure tracking, extend ceiling.
  window._autoSatisfiedHist = [];
  window._autoFailureStreak = 0;
  // P1.3 #9 (v3.56.3) — Resume grants a fresh length-reroll budget.
  window._autoLengthRerollCount  = 0;
  window._autoLengthRerollActive = false;
  window._autoLengthDirective    = '';
  const r = (typeof round === 'number') ? round : 1;
  window._autoCeilingTarget = r + AUTO_MAX_ROUNDS_DEFAULT;
  if (typeof consoleLog === 'function') {
    consoleLog(`🤖 Auto resumed — ceiling extended to round ${window._autoCeilingTarget}`, 'info');
  }
  if (typeof toast === 'function') toast('🤖 Auto resumed');
  updateAutoToggleUI();
  // Fire the next round via the centralized helper.
  // v3.35.1 — Routed through _autoFireChainedRound for the
  // troubleshooting-card gate consistency with other chain sites.
  _autoFireChainedRound('resume');
}

function autoHaltSwitchManual() {
  const modal = document.getElementById('autoHaltModal');
  if (modal) modal.classList.remove('active');
  // Flip the toggle off via the same path that handles persistence + UI.
  if (window._autoMode) {
    window._autoMode = true; // ensure toggleAutoMode flips to false cleanly
    toggleAutoMode();
  } else {
    updateAutoToggleUI();
  }
}

function autoHaltStop() {
  const modal = document.getElementById('autoHaltModal');
  if (modal) modal.classList.remove('active');
  // Leave Auto toggled on, but don't chain. User can Resume manually
  // by flipping the toggle off and back on, or by clicking Smoke.
  // Reset stall + failure so a manual chain doesn't immediately re-trip.
  window._autoSatisfiedHist = [];
  window._autoFailureStreak = 0;
  updateAutoToggleUI();
  if (typeof toast === 'function') toast('⏹ Auto stopped — toggle off or click Smoke to continue');
}

// clearProject — wipe project data only, keep hive intact
async function clearProject() {
  // v3.32.17 — Bump the project-generation token so any in-flight round
  // that was mid-await when the user discarded the project will detect
  // the mismatch at its next write checkpoint and bail before writing
  // phantom history into the new (now-empty) session. Without this
  // token, an orphaned round's history.push + saveSession would land
  // AFTER clearProject finished wiping IDB, recreating bogus state in
  // the new project. See _abandonInFlightRoundUI() and the gen-checks
  // in runRound / runBuilderOnly.
  window._projectGen = (window._projectGen || 0) + 1;
  // v3.32.18 — Reset the length-guard override flag. The flag is per-
  // project-session: if the user disabled the guard for one project,
  // a fresh project should start with the guard active again. The IDB
  // wipe below also clears the persisted flag, but resetting the
  // window global explicitly ensures the next round (in a new project)
  // sees the right value before saveSession has had a chance to run.
  window._lengthGuardOverride = false;
  // v3.32.28 — #6c indicator follows the override flag's state.
  updateLengthGuardIndicator?.();
  // v3.36.15 — Round-counter state machine reset. New project starts
  // with no completed-label history; updateRoundBadge() in 'idle' with
  // a null label falls through to the next-up "Round N — Phase" form.
  window._roundUiState = 'idle';
  window._lastCompletedRoundLabel = null;
  docText = ''; // clear in-memory doc first so loadSettings can't resurrect file status
  localStorage.removeItem(LS_PROJECT);
  localStorage.removeItem(LS_SESSION);
  localStorage.removeItem('waxframe_v2_session_exists');
  localStorage.removeItem('waxframe_v2_filename');
  // Wait for IDB delete to commit — fire-and-forget caused new-project flows
  // to race against the old session deletion, leaving stale data in IDB when
  // startSession ran its pre-launch verify.
  try { await idbClear(); } catch(e) { /* non-critical */ }
  document.getElementById('projectName').value    = '';
  document.getElementById('projectVersion').value = '';
  // Clear all structured goal fields
  ['goalDocType','goalAudience','goalOutcome','goalScope','goalTone','goalNotes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  // v3.32.1 — Hide the template hint banner; the project being cleared
  // means any previously-applied template's guidance is no longer relevant.
  const _tplBanner = document.getElementById('templateHintBanner');
  if (_tplBanner) _tplBanner.style.display = 'none';
  const llEl = document.getElementById('lengthLimit'); if (llEl) llEl.value = '';
  const lmEl = document.getElementById('lengthMin');   if (lmEl) lmEl.value = '';
  const luEl = document.getElementById('lengthUnit');  if (luEl) luEl.value = 'characters';
  setLengthMode('none');
  updateGoalCounter();
  updateLengthConstraintHint();
  updateMaskPreview();
  // Clear live work screen fields so the goToScreen auto-save can't resurrect them
  const workDoc = document.getElementById('workDocument');
  if (workDoc) workDoc.value = '';
  const workNotes = document.getElementById('workNotes');
  if (workNotes) workNotes.value = '';
  // v3.36.17 — Standing notes are project-scoped (apply every round
  // for the current project's lifetime). clearProject is the
  // explicit "starting fresh" gesture, so wipe both buffers.
  const workStandingNotes = document.getElementById('workStandingNotes');
  if (workStandingNotes) workStandingNotes.value = '';
  updateNotesBtnPriority();
  const pasteText = document.getElementById('pasteText');
  if (pasteText) pasteText.value = '';
  updateProjLineNums('projPasteNums', pasteText);
  const fileStatus = document.getElementById('fileStatus');
  if (fileStatus) { fileStatus.style.display = 'none'; fileStatus.textContent = ''; }
  docTab = 'upload';
  switchDocTab('upload');
  // ── REFERENCE MATERIAL wipe (v3.24.0 — multi-doc) ──
  referenceDocs = [];
  const refStatus = document.getElementById('refFileStatus');
  if (refStatus) { refStatus.style.display = 'none'; refStatus.textContent = ''; }
  const refFileInput = document.getElementById('refFileInput');
  if (refFileInput) refFileInput.value = '';
  if (typeof renderReferenceCards === 'function') renderReferenceCards();
  if (typeof updateRefGrandTotals === 'function') updateRefGrandTotals();
  round = 1; phase = 'draft'; history = []; docText = '';
  window._resolvedDecisions = [];
  // Reset Finish-modal export state — this used to live in showFinishModal()
  // but resetting it on every modal open caused a guard-fires-incorrectly bug
  // (v3.21.23 and earlier): export → close modal → reopen → guard says
  // "haven't exported anything" because the flag was wiped on reopen. The flag
  // is session-scoped, not modal-scoped. Button visuals are reset further down
  // in this function alongside the other Finish-modal cleanup. v3.21.24 fix.
  window._finishExported = false;
  localStorage.removeItem('waxframe_resolved_decisions');
  window._conflictLedger = [];
  localStorage.removeItem('waxframe_conflict_ledger');
  window._aiWarnings = {};
  // v3.32.14 — Reset session-scoped slow-responder tracker. Without this,
  // an AI that triggered the SLOW_RESPONDER troubleshooting card once
  // would never re-warn for the rest of the tab's lifetime, even across
  // unrelated sessions. Mirrors the _aiWarnings reset on the line above.
  window._slowResponderShownFor = new Set();
  // v3.56.13 — Reset the rest of the project-scoped conflict / decision /
  // holdout / validation state too. These survived clearProject before, so on
  // a new project they could carry over (same bug class as the v3.35.6
  // sessionAIs leak). Most self-heal via the round flow, but _lastConflictFP
  // gates the v3.56.5 decision-reset — a stale fingerprint matching a new
  // project's first conflict would skip the reset and leak old picks. Holdout
  // anchors/suggestions and validation failures were only ever lazily
  // initialized or overwritten, never cleared. Wipe them all for a clean slate.
  window._decisionChoices        = {};
  window._conflictCurrentTexts   = {};
  window._lastConflicts          = null;
  window._lastConflictFP         = null;
  window._holdoutChoices         = {};
  window._holdoutAnchors         = {};
  window._flatHoldoutSuggestions = null;
  window._lastAppliedChanges     = null;
  window._lastValidationFailures = null;
  window._slowAlertsSilenced     = false; // v3.56.14 — clear the per-session "don't alert me" opt-out on a new project
  localStorage.removeItem('waxframe_ai_warnings');
  window._lastPDFPages = null;
  localStorage.removeItem('waxframe_v2_source_type');
  localStorage.removeItem('waxframe_v2_has_pdf_pages');

  // Reset the live console and conflicts panels. clearProject is the one
  // user-initiated destructive action that should zero out the session log —
  // normal navigation and re-launching a session does not touch these panels.
  const liveConsoleEl = document.getElementById('liveConsole');
  if (liveConsoleEl) liveConsoleEl.innerHTML = '<div class="console-entry console-info">Console ready — Smoke the hive to begin.</div>';
  const conflictsEl = document.getElementById('conflictsPanel');
  if (conflictsEl) conflictsEl.innerHTML = '<div class="conflicts-empty-card">No rounds yet. Run a round (the <strong>Smoke the Hive</strong> button below) to see what the Builder couldn\'t resolve. This panel always shows conflicts from the most recent round only — not project-wide completion.</div>';

  // Reset Finish modal export buttons to their pristine innerHTML captured on
  // DOMContentLoaded. Without this, a prior session's "✅ Exported!" / done
  // state carries over to the next session's Finish modal.
  ['finishBtnDoc', 'finishBtnTranscript'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn || !btn.dataset.originalHtml) return;
    btn.innerHTML = btn.dataset.originalHtml;
    btn.disabled = false;
    btn.classList.remove('finish-modal-btn-done');
  });

  // v3.35.2 — Auto-mode state wipe. Auto is strictly per-project; a
  // freshly-launched project must start with Auto OFF regardless of
  // the prior project's state. Without this wipe, Finish → "Start a
  // New Project" left _autoMode true, _autoCeilingTarget pointing at
  // the prior project's halt round, and the toggle pill rendering
  // "Auto: ON · N left" with stale state on the new project's work
  // screen. Same root cause covers the explicit Clear-Project button
  // path and the discard-confirm path — all three route through here.
  window._autoMode          = false;
  window._autoCeilingTarget = null;
  window._autoSatisfiedHist = [];
  window._autoFailureStreak = 0;
  window._autoChainDeferred = null;
  window._autoChainPending  = false;
  window._autoLengthRerollCount  = 0;
  window._autoLengthRerollActive = false;
  window._autoLengthDirective    = '';
  window._manualLengthReroll     = false;
  // v3.56.15 — Churn detector state is project-scoped. _churnPending gates the
  // Auto chain; _churnDismissed suppresses re-nag after "apply without locking".
  // Both must reset so a new project starts clean.
  window._churnPending   = false;
  window._churnDismissed = {};

  // v3.35.2 — Per-bee satisfaction + DOM state wipe. Without this, a
  // satisfied reviewer (e.g. Gemini's ★ + NO CHANGES NEEDED pill)
  // from the prior project bled into the freshly-launched project's
  // work screen because _cleanThisRound was preserved across the
  // reset and the renderer rehydration walk re-applied is-clean to
  // cards on the next renderBeeStatusGrid call. The setBeeStatus
  // walk over activeAIs zeros each card's classlist back to idle so
  // there's no stale visual state to rehydrate from.
  if (window._cleanThisRound) window._cleanThisRound.clear();
  window._roundTimings = {};
  if (Array.isArray(activeAIs)) {
    activeAIs.forEach(ai => setBeeStatus(ai.id, 'idle', ''));
  }

  // v3.35.6 — Reset session-disabled AI tracker. window.sessionAIs is
  // a Set of AI IDs that are currently active for THIS session; AIs
  // toggled off mid-round via toggleSessionBee (e.g. slow responder,
  // rate-limited, billing failure) are removed from this Set, which
  // is what causes them to be skipped in future rounds. The Set is
  // persisted to IDB on each round and restored on session load — and
  // clearProject correctly wipes IDB above. But the in-memory Set was
  // NOT being reset here, so when the user clicked Finish → Start a
  // New Project, the stale Set carried forward and the new project's
  // work screen + Worker Bees grid showed previously-disabled AIs as
  // still disabled. Resetting to a fresh Set containing every
  // activeAI ID restores the user's full configured hive selection
  // for the new project — which is the correct semantics: session
  // disables are session-scoped, not project-scoped.
  if (Array.isArray(activeAIs)) {
    window.sessionAIs = new Set(activeAIs.map(a => a.id));
  } else {
    window.sessionAIs = new Set();
  }

  // v3.35.2 — Refresh the Auto toggle pill so it visibly returns to
  // Manual mode the moment clearProject finishes, before the user
  // navigates back to the work screen.
  if (typeof updateAutoToggleUI === 'function') updateAutoToggleUI();

  projectClockReset();
  toast('🗑 Project cleared — AI keys and settings kept');
}

// ════════════════════════════════════════════════════════════════════
// v3.32.0 — Document Templates
// ────────────────────────────────────────────────────────────────────
// Templates are pre-filled Project field payloads sourced from
// document-playbooks.html and frozen into js/templates.js. They solve
// the blank-page problem on the Project screen — a user picks a
// template matching their document type, the Goal fields populate
// with proven starting content, and the user reviews/edits before
// continuing.
//
// All template content was developed and validated in the playbook
// page; templates.js mirrors that content. To add a template, paste
// a new object into WAXFRAME_TEMPLATES — no other code changes needed.
//
// Behavior on apply:
//   1. If ALL six Project Goal fields are empty → silent populate.
//   2. If ANY are non-empty → wfConfirm overwrite warning, then
//      populate on confirm.
//   3. Reference Material is NEVER touched — it has its own setup
//      flow and is conceptually separate from the Project goal.
// ════════════════════════════════════════════════════════════════════

// v3.37.0 — Dual-path templates. Every template declares which paths it
// supports ('scratch' and/or 'refine'). The modal shows a two-step flow:
// pick a path first, then pick a template. The path determines which
// pathContent block applyTemplate() reads from. _selectedTemplatePath
// is the module-level state for the picker; reset on every open.
let _selectedTemplatePath = null;  // 'scratch' | 'refine' | null

// Open the gallery modal and render its content. Path picker resets
// on every open — fresh state, no carryover between opens.
function showTemplateGallery() {
  const modal = document.getElementById('templateGalleryModal');
  if (!modal) return;
  _selectedTemplatePath = null;
  renderTemplateGalleryBody();
  modal.classList.add('active');
}

// v3.37.0 — Path selector handler. Called when the user clicks one of
// the two big path cards. Sets module state and re-renders the gallery
// in template-grid mode.
function selectTemplatePath(path) {
  if (path !== 'scratch' && path !== 'refine') return;
  _selectedTemplatePath = path;
  renderTemplateGalleryBody();
}

// v3.37.0 — "Change path" link handler. Resets state and re-renders
// back to the path-picker view. Available at the top of the template
// grid so the user can change their mind without closing the modal.
function resetTemplatePath() {
  _selectedTemplatePath = null;
  renderTemplateGalleryBody();
}

// Render the gallery into the modal body. Two states:
//   1. _selectedTemplatePath === null → show path picker (two big cards:
//      Starting from scratch / Refining an existing draft)
//   2. _selectedTemplatePath set → show category-grouped template grid,
//      filtered to templates supporting the selected path. Quick Start
//      shows only in scratch mode (paths: ['scratch']); the platform
//      review templates (Trim to TripAdvisor / Google Maps, Rewrite as
//      Yelp) show only in refine mode (paths: ['refine']).
//
// v3.38.1 — Path-aware newuser callouts. The modal header previously
// carried a static "New to WaxFrame? Start with ⭐ Quick Start below"
// paragraph; that copy is wrong on the path-picker state (no templates
// rendered yet) and on the refine path (Quick Start filtered out). The
// newuser callout now renders inside the body with one of three copies
// chosen by state.
function renderTemplateGalleryBody() {
  const body = document.getElementById('templateGalleryBody');
  if (!body) return;
  if (typeof WAXFRAME_TEMPLATES === 'undefined' || !Array.isArray(WAXFRAME_TEMPLATES)) {
    body.innerHTML = '<p class="template-gallery-empty">⚠️ Template data not loaded. Reload the page and try again.</p>';
    return;
  }

  // ── State 1: Path picker ──────────────────────────────────────────
  if (_selectedTemplatePath === null) {
    body.innerHTML = `
      <div class="template-path-selector">
        <h3 class="template-path-selector-title">Are you starting from scratch, or refining an existing draft?</h3>
        <p class="template-path-selector-sub">Each template is a ready-made Project Goal — document type, audience, outcome, scope, and tone — that gives the hive a real brief to work from instead of an empty form. <strong>Applying one resets the project clean</strong> — goal fields, name, version, reference material, starting document, and any session history are all cleared first. Pick your starting condition below.</p>
        <p class="template-gallery-intro template-gallery-intro--newuser"><strong>New to WaxFrame?</strong> Start with <strong>Starting from scratch</strong> and then click on <strong>⭐ Quick Start</strong> — a low-stakes chocolate-chip-cookie demo that converges in a few rounds and shows you the whole hive end-to-end before you bring your own document.</p>
        <div class="template-path-grid">
          <button class="template-path-card" onclick="selectTemplatePath('scratch')" type="button">
            <span class="template-path-card-icon">📝</span>
            <div class="template-path-card-text">
              <div class="template-path-card-name">Starting from scratch</div>
              <div class="template-path-card-desc">I have an idea but no draft yet. The hive will write one for me from the Project Goal + a Reference Material scaffold this template fills in.</div>
            </div>
          </button>
          <button class="template-path-card" onclick="selectTemplatePath('refine')" type="button">
            <span class="template-path-card-icon">✂️</span>
            <div class="template-path-card-text">
              <div class="template-path-card-name">Refining an existing draft</div>
              <div class="template-path-card-desc">I already have a draft. The hive will polish, tighten, and restructure what I paste into Starting Document — without rewriting wholesale.</div>
            </div>
          </button>
        </div>
      </div>`;
    return;
  }

  // ── State 2: Template grid filtered to selected path ──────────────
  const path = _selectedTemplatePath;
  const pathLabel = (path === 'scratch') ? 'Starting from scratch' : 'Refining an existing draft';
  const pathIcon  = (path === 'scratch') ? '📝' : '✂️';

  // Filter templates to those supporting the selected path.
  const visibleTemplates = WAXFRAME_TEMPLATES.filter(t =>
    Array.isArray(t.paths) && t.paths.includes(path)
  );

  // Bucket by category, preserving original order. Same category list
  // as before — Quick Start always first, Reviews & Recs last.
  const order = ['Quick Start', 'Career & Hiring', 'Business & Sales', 'Content & Marketing', 'Personal & Everyday', 'Reviews & Recommendations'];
  const buckets = {};
  visibleTemplates.forEach(t => {
    const k = t.category || 'Other';
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(t);
  });

  const pathIndicator = `
    <div class="template-path-indicator">
      <span class="template-path-indicator-label">${pathIcon} ${esc(pathLabel)}</span>
      <button class="template-path-indicator-change" onclick="resetTemplatePath()" type="button">Change</button>
    </div>`;

  // v3.38.1 — Per-path newuser callout. Scratch path points at the
  // Quick Start card rendered below; refine path reframes for users
  // who already have a draft and points back to the path picker for
  // the onboarding demo.
  const newuserCallout = (path === 'scratch')
    ? `<p class="template-gallery-intro template-gallery-intro--newuser"><strong>New to WaxFrame?</strong> Start with <strong>⭐ Quick Start</strong> below — it's a low-stakes chocolate-chip-cookie example that converges in a few rounds and teaches you the whole flow before you bring your own document.</p>`
    : `<p class="template-gallery-intro template-gallery-intro--newuser"><strong>Refining a draft?</strong> Pick the template that matches what you've already written — the hive will polish, tighten, and restructure without rewriting wholesale. Want a guided tour first? Click <strong>Change</strong> above and run the <strong>⭐ Quick Start</strong> demo from the Starting from scratch side.</p>`;

  const sections = order.filter(c => buckets[c] && buckets[c].length).map(cat => `
    <div class="template-gallery-section">
      <h3 class="template-gallery-section-title">${esc(cat)}</h3>
      <div class="template-gallery-grid">
        ${buckets[cat].map(t => {
          // v3.32.4 — Quick Start gets visually distinct treatment so
          // first-time users can't miss it. The .is-recommended class
          // adds an amber border + glow; the badge label is rendered as
          // a separate badge element. Hard-coded to id === 'quick-start'
          // — this is the WaxFrame onboarding template by design, not
          // a generic "first card in any category" affordance.
          const isRecommended = (t.id === 'quick-start');
          const cardCls = isRecommended ? 'template-card is-recommended' : 'template-card';
          const badge   = isRecommended
            ? '<span class="template-card-badge">⭐ Start Here</span>'
            : '';
          // v3.38.2 — Per-path card description. Both-path templates can
          // override the top-level description per path inside
          // pathContent[path].description; the top-level description is
          // used as the fallback for templates that don't need per-path
          // wording (e.g. cover-letter already reads "Create or refine…").
          const desc = (t.pathContent && t.pathContent[path] && t.pathContent[path].description) || t.description || '';
          return `
          <button class="${cardCls}" onclick="applyTemplate('${esc(t.id)}', '${path}')" title="Apply the ${esc(t.name)} template (${esc(pathLabel)})">
            <span class="template-card-icon">${esc(t.icon || '📄')}</span>
            <div class="template-card-text">
              <div class="template-card-name">${esc(t.name)}${badge}</div>
              <div class="template-card-desc">${esc(desc)}</div>
            </div>
          </button>`;
        }).join('')}
      </div>
    </div>`).join('');

  body.innerHTML = pathIndicator + newuserCallout + (sections || '<p class="template-gallery-empty">No templates found for this path.</p>');
}

// Apply a template by id and path. v3.37.0 dual-path:
//   - templateId : the template's id (e.g. 'resume')
//   - path       : 'scratch' or 'refine'; determines which pathContent
//                  block populates the Project fields and Reference
//                  Material. Falls back to tpl.paths[0] with a console
//                  warning if the path is missing or unsupported.
// Behavior:
//   - v3.39.11 — Universal pre-apply confirm removed. The overwrite
//     warning lives in the gallery's path-picker sub paragraph
//     (rendered once per gallery open). Templates may opt into a
//     per-template educational modal via tpl.confirmModal — Quick Start
//     does this to teach naming/versioning. Cancel aborts the apply.
//   - Project Goal fields, length fields, and hint banner all read
//     from pc = tpl.pathContent[path].
//   - Project name/version pre-fill from top-level tpl.projectName and
//     tpl.projectVersion (v3.39.10) — only writes when present.
//   - Reference Material: prior template-sourced cards are swept on
//     every apply (idempotent — switching templates cleans up after
//     the previous one). If pc.refMaterial has content, a new card is
//     pushed with source: 'template' and templateOriginId for the
//     sweep next time.
async function applyTemplate(templateId, path) {
  if (typeof WAXFRAME_TEMPLATES === 'undefined') return;
  const tpl = WAXFRAME_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) {
    toast('⚠️ Template not found');
    return;
  }

  // v3.37.0 — Resolve path with fallback. If the caller didn't pass a
  // path (or passed one the template doesn't support), default to the
  // first supported path and log a warning. Callers from the gallery
  // always pass a valid path; the fallback exists for any legacy or
  // programmatic entry point we might add later.
  if (!path || !Array.isArray(tpl.paths) || !tpl.paths.includes(path)) {
    const fallback = (Array.isArray(tpl.paths) && tpl.paths[0]) || null;
    if (!fallback) {
      console.warn(`applyTemplate: template "${templateId}" has no paths defined`);
      toast('⚠️ Template path content missing');
      return;
    }
    console.warn(`applyTemplate: no/invalid path "${path}" for template "${templateId}", defaulting to "${fallback}"`);
    path = fallback;
  }
  const pc = (tpl.pathContent && tpl.pathContent[path]) || null;
  if (!pc) {
    console.warn(`applyTemplate: pathContent["${path}"] missing for template "${templateId}"`);
    toast('⚠️ Template path content missing');
    return;
  }

  // v3.32.1 build 012 — close the gallery modal BEFORE the overwrite
  // confirmation can fire. Two reasons: (1) modal-on-modal stacking is
  // confusing — the user sees the gallery dim and a confirm pop on top
  // and isn't sure which modal owns which button; (2) if the user
  // cancels the overwrite, returning to the dimmed gallery is also
  // disorienting. Cleaner flow: card click closes the gallery, then
  // the confirm fires. Cancel = back to the Project screen; Apply
  // proceeds. To pick a different template the user clicks Use Template
  // again — one extra click is worth the clarity.
  const galleryModal = document.getElementById('templateGalleryModal');
  if (galleryModal) galleryModal.classList.remove('active');

  // v3.39.11 — Pre-apply universal confirm removed. The overwrite warning
  // now lives in the gallery's path-picker sub paragraph (rendered once
  // per gallery open, before the user picks a path or a template). That
  // copy makes the consequence clear up front instead of gating every
  // click with a confirm modal. Per-template educational modals are
  // still supported via tpl.confirmModal — Quick Start uses it to teach
  // naming/versioning conventions as a first-impression teaching moment.
  // Other templates leave confirmModal undefined and apply silently.
  // Cancel aborts the apply entirely.
  if (tpl.confirmModal && typeof tpl.confirmModal === 'object') {
    const cm = tpl.confirmModal;
    const ok = await wfConfirm(
      cm.title   || 'Apply Template',
      cm.message || '',
      { okText: cm.okText || `Apply ${tpl.name}` }
    );
    if (!ok) return;
  }

  // v3.39.12 — Full project reset before applying the template. Reuses
  // the existing clearProject() routine — same wipe the 🗑 Clear Project
  // button does — so the template starts from a known-clean slate every
  // time. Wipes: project name + version, all six Goal fields, length
  // constraint, reference material, starting document (upload + paste),
  // work-screen doc + notes + standing notes, IndexedDB session, and
  // bumps the in-flight round generation token so any pending round
  // bails cleanly. The gallery's path-picker sub paragraph warns the
  // user about this scope before they pick a card, so no per-click
  // confirm is needed here. After the wipe, the field-population
  // blocks below repopulate from the template definition.
  await clearProject();

  // Map per-path Goal fields → DOM ids. Each entry: [domId, pathContentKey].
  const map = [
    ['goalDocType',  'goalDocType'],
    ['goalAudience', 'goalAudience'],
    ['goalOutcome',  'goalOutcome'],
    ['goalScope',    'goalScope'],
    ['goalTone',     'goalTone'],
    ['goalNotes',    'goalNotes'],
  ];
  map.forEach(([domId, key]) => {
    const el = document.getElementById(domId);
    if (!el) return;
    el.value = pc[key] || '';
  });

  // v3.33.1 — Length Constraint pre-fill from template. v3.37.0 — now
  // reads from pc (per-path content). Templates that specify lengthMode
  // get all four length fields written and the mode applied. Templates
  // without lengthMode leave the user's existing length config untouched
  // (matches pre-v3.33.1 behavior).
  if (pc.lengthMode && ['none','hardcap','target','range'].includes(pc.lengthMode)) {
    const llEl = document.getElementById('lengthLimit');
    const lmEl = document.getElementById('lengthMin');
    const luEl = document.getElementById('lengthUnit');
    if (llEl) llEl.value = pc.lengthLimit || '';
    if (lmEl) lmEl.value = pc.lengthMin   || '';
    if (luEl && pc.lengthUnit) luEl.value = pc.lengthUnit;
    if (typeof setLengthMode === 'function') setLengthMode(pc.lengthMode);
  }

  // v3.39.10 — Project Name/Version pre-fill from template. Top-level
  // identity fields (path-agnostic, alongside id/name/icon). Templates
  // that specify projectName and/or projectVersion get those fields
  // written; templates without them leave the user's existing values
  // untouched (matches pre-v3.39.10 behavior). Quick Start is the only
  // template using this today — it serves as a teaching example of
  // WaxFrame's naming/versioning convention so first-time users see
  // "Recipe - Chocolate Chip Cookies" / "v1.0" modeled in their first
  // session.
  if (tpl.projectName) {
    const pnEl = document.getElementById('projectName');
    if (pnEl) pnEl.value = tpl.projectName;
  }
  if (tpl.projectVersion) {
    const pvEl = document.getElementById('projectVersion');
    if (pvEl) pvEl.value = tpl.projectVersion;
  }

  // v3.37.0 — Reference Material injection. Every applyTemplate call
  // sweeps prior template-sourced cards (source: 'template') so the
  // RM panel stays clean and idempotent: switching templates or paths
  // cleans up after the previous one. If this template+path has
  // refMaterial content, a new card is pushed.
  if (typeof referenceDocs !== 'undefined' && Array.isArray(referenceDocs)) {
    const before = referenceDocs.length;
    referenceDocs = referenceDocs.filter(d => d.source !== 'template');
    const swept = before - referenceDocs.length;

    if (pc.refMaterial && pc.refMaterial.trim().length > 0 && typeof generateRefDocId === 'function') {
      const pathSlug = (path === 'scratch') ? 'scratch' : 'refine';
      referenceDocs.push({
        id: generateRefDocId(),
        name: `${tpl.name} — scaffold (${pathSlug})`,
        text: pc.refMaterial,
        source: 'template',
        templateOriginId: tpl.id,
        filename: null
      });
    }

    if (typeof renderReferenceCards === 'function')   renderReferenceCards();
    if (typeof updateRefGrandTotals === 'function')   updateRefGrandTotals();
    if (swept > 0 || pc.refMaterial) {
      // v3.52.8 — was raw console.log; standardized to consoleLog wrapper
      // for consistency with surrounding logging surfaces.
      consoleLog(`applyTemplate: RM sweep removed ${swept} template card(s); ${pc.refMaterial ? 'added 1 new card' : 'no new card injected (refMaterial empty)'}`);
    }
  }

  // Fire the same downstream updates the user's input would trigger.
  if (typeof saveProject === 'function')              saveProject();
  if (typeof updateGoalCounter === 'function')        updateGoalCounter();
  if (typeof updateProjectRequirements === 'function') updateProjectRequirements();
  // (Gallery modal already closed at the top of this function before the
  // overwrite confirm could fire.)

  // v3.32.1 — Render the hint banner above Project Name when the template
  // has placeholders that need filling in. Templates without hints
  // (Quick Start, Executive Summary) silently skip the banner — nothing
  // to fix on those, no banner needed.
  // v3.32.3 — hint is now an array of {field, text} entries, one per
  // affected form field. Banner renders a bulleted list so the user
  // knows exactly which form field to scroll to and what to fix there.
  // v3.37.0 — hint reads from pc.hint (per-path). Title also gets a
  // path suffix so the user can see at a glance which path was applied.
  const hint = Array.isArray(pc.hint) ? pc.hint : [];
  const banner = document.getElementById('templateHintBanner');
  if (banner) {
    if (hint.length > 0) {
      const titleEl = document.getElementById('templateHintBannerTitle');
      const textEl  = document.getElementById('templateHintBannerText');
      const pathSuffix = (path === 'scratch') ? 'starting from scratch' : 'refining an existing draft';
      if (titleEl) titleEl.textContent = `${tpl.icon || '📋'} ${tpl.name} template applied (${pathSuffix}) — placeholders to fill in`;
      if (textEl) {
        // Render each entry as a list item: "Field: text". esc() escapes
        // any user-facing HTML in field/text strings even though template
        // content is hand-written and trusted — defense-in-depth in case
        // a future template contains unintended HTML special chars.
        const items = hint.map(h =>
          `<li class="template-hint-item"><span class="template-hint-field">${esc(h.field || '')}:</span> ${esc(h.text || '')}</li>`
        ).join('');
        textEl.innerHTML = `<ul class="template-hint-list">${items}</ul>`;
      }
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  }

  const pathToastLabel = (path === 'scratch') ? 'from scratch' : 'refining';
  const toastTail = (hint.length > 0) ? ' — see the amber banner above for placeholders to fill in' : '';
  toast(`✓ ${tpl.icon || '📋'} ${tpl.name} (${pathToastLabel}) template applied${toastTail}`, hint.length > 0 ? 5500 : 4000);

  // v3.52.0 — Run source size check after template applies. If the
  // user already had a Starting Document loaded, the new template's
  // length range may produce a recommendation card immediately. Reset
  // the dismiss flag — a new template is a fresh comparison and the
  // user should see the recommendation even if they dismissed a prior
  // one against a different template.
  _sourceSizeCheckDismissed = false;
  if (typeof renderSourceSizeCheck === 'function') renderSourceSizeCheck();
}

// v3.32.1 — Dismiss handler for the template hint banner. Hides the
// banner without clearing its content; if applyTemplate runs again the
// banner re-populates and re-shows. No localStorage state — banner
// re-appears the next time a template is applied even if previously
// dismissed (different application = different reminder).
function dismissTemplateHintBanner() {
  const banner = document.getElementById('templateHintBanner');
  if (banner) banner.style.display = 'none';
}


// ── SETTINGS PERSISTENCE: loadSettings (extracted) ──
// v3.47.0 — Moved to js/storage.js. Joins saveHive, saveProject,
// saveSession, loadSession in the consolidated storage layer.


// ── SESSION PERSISTENCE (extracted) ──
// v3.46.0 — _saveSessionChain + saveSession + loadSession moved
// to js/storage.js. saveSession's 33 call sites and loadSession's 4
// call sites continue to work via function-declaration hoisting to
// window. Storage primitives (idbGet/idbSet/checkStorageQuota) were
// already in storage.js since v3.45.0.



// ── SCREEN 2: API SETUP ──
// v3.31.0 — Worker Bees screen is now an inventory screen only:
// "what AIs do I have available, and is each one set up?"
// Mode toggle at top splits Internet vs Server. Mode-specific toolbar.
// All rows collapsed by default; click to expand. Greyed name = no key.
// Custom rows have a delete-checkbox (bulk-remove path); defaults have
// no action button on the summary line (defaults can't be removed,
// only their key cleared inside the expanded panel).
function renderAISetupGrid() {
  const grid = document.getElementById('aiSetupGrid');
  if (!grid) return;

  // Render the mode toggle and mode-aware toolbar into their containers.
  // These are top-of-screen siblings of #aiSetupGrid — kept in sync with
  // the AI list render so a mode flip rebuilds everything.
  renderHiveModeToggle();
  renderWorkerBeeToolbar();

  // v3.30.4 — Persistent checkbox bulk-select toolbar. Always rendered
  // when any custom AI exists (regardless of mode). v3.31 keeps this on
  // the inventory screen as the only path to bulk-remove customs;
  // active-group selection moves to a dedicated screen in v3.32.
  const bulkSelectHTML = buildBulkSelectToolbarHTML();

  // Mode filter — Internet shows defaults + direct-API customs;
  // Server shows server-imported customs only. Direct-API customs
  // (no _modelsEndpoint) and defaults are hidden in Server mode;
  // server-imported customs are hidden in Internet mode.
  const visible = aiList.filter(ai => {
    const isDefault = !!DEFAULT_AIS.find(d => d.id === ai.id);
    const cfg = API_CONFIGS[ai.provider];
    const isServerImport = !!cfg?._modelsEndpoint;
    if (_hiveMode === 'server') {
      return isServerImport;
    }
    return isDefault || !isServerImport;
  });

  grid.innerHTML = bulkSelectHTML + visible.map(ai => buildAISetupRowHTML(ai)).join('');
  renderBuilderPicker();
  renderHiveCountChip();
}

// v3.31.0 — Single-row template. Two visual states:
//   collapsed (default): icon + name + (custom-only) checkbox
//   expanded:           the above + key field, model selector, etc.
// Greyed-name class fires when the AI has no saved key.
function buildAISetupRowHTML(ai) {
  const isActive  = !!activeAIs.find(a => a.id === ai.id);
  const isCustom  = !DEFAULT_AIS.find(d => d.id === ai.id);
  const cfg       = API_CONFIGS[ai.provider];
  const key       = cfg?._key || '';
  const hasKey    = !!key;
  const isExpanded = _expandedAIIds.has(ai.id);

  // Action area on summary line:
  //   custom AI → bulk-remove checkbox
  //   default AI → empty (defaults can't be removed; their key is cleared
  //   inside the expanded panel)
  let actionHTML;
  if (isCustom) {
    const checked = _selectedCustomIds.has(ai.id) ? 'checked' : '';
    actionHTML = `<input type="checkbox" class="ai-select-check" id="aichk-${ai.id}" ${checked} onchange="toggleCustomSelection('${ai.id}', this.checked); event.stopPropagation();" onclick="event.stopPropagation();" title="Select ${esc(ai.name)} for bulk removal">`;
  } else {
    actionHTML = '';
  }

  // Expanded panel content — only built when expanded to avoid wasted DOM
  // for large hives where most rows stay collapsed. Show-recheck logic:
  // recommend infrastructure exists in both modes but the per-row
  // "Recommend a Model" button is suppressed in Server mode (closed-network
  // AIs guess based on naming heuristics rather than live web research,
  // which is misleading).
  let expandedHTML = '';
  if (isExpanded) {
    const showRecheck   = hasKey && _hiveMode !== 'server';
    const modelSelector = hasKey ? buildModelSelector(ai.id, ai.provider, cfg?.model || '', showRecheck) : '';
    const consoleUrl    = ai.apiConsole || '';
    // v3.35.4 — Bug C fix. Per-card link now ALWAYS renders when a
    // console URL is known, regardless of key state. Pre-v3.31.0
    // behavior is back: the link is the surgical per-AI access path
    // for billing issues, key rotation, and account management. The
    // mass-action "Open Default Websites" toolbar button stays as the
    // onboarding accelerator. v3.31.0 wrongly gated this on !hasKey,
    // which hid the link the moment a key got saved — exactly when
    // the user would most need it for credit/billing problems.
    // Server-imported AIs typically have no console URL → still
    // suppressed (nothing meaningful to link to).
    const getKeyLink = consoleUrl
      ? `<div class="ai-getkey-link-wrap"><span class="ai-getkey-prompt">${hasKey ? 'Manage account?' : "Don't have a key?"}</span> <a class="ai-getkey-link" href="${consoleUrl}" target="_blank" rel="noopener">${hasKey ? `Open ${esc(ai.name)} account ↗` : `Get one from ${esc(ai.name)} ↗`}</a></div>`
      : '';
    // v3.32.10 — Best/Fast/Budget category buttons removed. Their function
    // (snap to a recommendation pick) is now redundant with the dropdown's
    // dual ✨ Reviewer / 🔨 Builder markers — users see both picks
    // directly in the dropdown and select via the same control they'd use
    // for any manual choice.
    expandedHTML = `
      <div class="ai-setup-expanded">
        ${getKeyLink}
        <div class="ai-setup-key-wrap">
          <div class="ai-setup-key-status ${hasKey ? 'has-key' : ''}"
            title="${hasKey ? 'API key saved ✅' : 'No API key — paste one below to enable this AI'}">
            ${hasKey ? '🔑' : '⬜'}
          </div>
          <input type="password" class="ai-setup-key" id="key-${ai.id}"
            placeholder="Paste key — Enter to save…"
            value="${esc(key)}"
            ${!isActive ? 'disabled' : ''}
            onkeydown="if(event.key==='Enter'){saveKeyForAI('${ai.id}',this.value,this);}"
            onclick="event.stopPropagation();">
          <button class="ai-eye-btn" onclick="toggleKeyVis('${ai.id}'); event.stopPropagation();" title="Show/hide key">👁️</button>
          ${hasKey ? `<button class="ai-clear-key-btn" onclick="clearKeyForAI('${ai.id}'); event.stopPropagation();" title="Remove saved API key">✕ Key</button>` : ''}
          ${hasKey ? `<button class="ai-test-btn" id="testbtn-${ai.id}" onclick="testApiKey('${ai.id}'); event.stopPropagation();" title="Test this API key">Test</button>` : ''}
        </div>
        ${modelSelector}
      </div>`;
  }

  return `
    <div class="ai-setup-row ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${hasKey ? 'has-key' : 'no-key'}" id="airow-${ai.id}">
      <div class="ai-setup-row-summary" onclick="toggleAISetupRow('${ai.id}')" role="button" tabindex="0" aria-expanded="${isExpanded}">
        <span class="ai-setup-chevron">${isExpanded ? '▼' : '▶'}</span>
        ${resolveAiIcon(ai, 'ai-setup-icon', 24)}
        <span class="ai-setup-name" title="${ai.name}">${ai.name}</span>
        ${(window._deprecatedModelFlags && window._deprecatedModelFlags.has(ai.id))
          ? `<span class="ai-setup-deprecation-flag" title="The saved model for ${esc(ai.name)} is no longer available from the provider. Click Recommend Models below to pick a current model.">⚠</span>`
          : ''}
        <span class="ai-setup-summary-spacer"></span>
        ${actionHTML}
      </div>
      ${expandedHTML}
    </div>`;
}

// Per-session expand/collapse state — set of AI ids that are expanded.
// Per-session only: clears on page reload by design (David's call —
// power users don't need persisted expand state across reloads).
const _expandedAIIds = new Set();

function toggleAISetupRow(aiId) {
  if (_expandedAIIds.has(aiId)) _expandedAIIds.delete(aiId);
  else _expandedAIIds.add(aiId);
  renderAISetupGrid();
}

function expandAllAISetupRows() {
  aiList.forEach(ai => _expandedAIIds.add(ai.id));
  renderAISetupGrid();
}

function collapseAllAISetupRows() {
  if (!_expandedAIIds.size) return;
  _expandedAIIds.clear();
  renderAISetupGrid();
}

// ── Mode toggle UI ──
function renderHiveModeToggle() {
  const wrap = document.getElementById('hiveModeToggleWrap');
  if (!wrap) return;
  const isInternet = _hiveMode === 'internet';
  wrap.innerHTML = `
    <div class="hive-mode-toggle" role="radiogroup" aria-label="Hive mode">
      <button class="hive-mode-btn ${isInternet ? 'is-active' : ''}"
              onclick="setHiveMode('internet')"
              role="radio"
              aria-checked="${isInternet}"
              title="Use direct-API providers (Anthropic, OpenAI, Google, etc.) — pay per use">
        🌎 Internet Based AI (Default)
      </button>
      <button class="hive-mode-btn ${!isInternet ? 'is-active' : ''}"
              onclick="setHiveMode('server')"
              role="radio"
              aria-checked="${!isInternet}"
              title="Use AIs from a model server (Alfredo, OpenWebUI, LM Studio, etc.) — for air-gapped or self-hosted setups">
        🖥 Server Based AI
      </button>
    </div>`;
}

async function setHiveMode(newMode) {
  if (newMode !== 'internet' && newMode !== 'server') return;
  if (newMode === _hiveMode) return;
  // Confirmation modal — flipping mode hides the other side's AIs from
  // the inventory view. They stay in aiList and stay keyed; the user
  // just won't see them until they flip back.
  const isToServer = (newMode === 'server');
  const msg = isToServer
    ? "Switch to Server mode? Your default AIs (Claude, GPT, Gemini, etc.) and any direct-API customs will be hidden from view but their saved API keys are kept. Switch back anytime."
    : "Switch to Internet mode? Your imported server AIs will be hidden from view but not deleted. Switch back anytime.";
  const ok = await wfConfirm(
    isToServer ? 'Switch to Server mode' : 'Switch to Internet mode',
    msg,
    { okText: isToServer ? '🖥 Switch to Server' : '🌎 Switch to Internet' }
  );
  if (!ok) return;
  _hiveMode = newMode;
  _expandedAIIds.clear();        // collapse everything on mode flip — fresh start
  _selectedCustomIds.clear();    // clear bulk-remove selection too
  saveHive();
  renderAISetupGrid();
}

// ── Mode-aware toolbar ──
// Internet mode (5 buttons): API Key Guide, Add Custom AI, Test All Keys,
//   Recommend Models for All, Open default AI websites
// Server mode (3 buttons): Import from Model Server, Add Custom AI,
//   Test All Keys
// Both modes append the global Expand all / Collapse all controls so a
// power user with a 40-bee hive can mass-toggle row state.
function renderWorkerBeeToolbar() {
  const row = document.getElementById('beeControlsRow');
  if (!row) return;
  const isInternet = (_hiveMode === 'internet');
  let buttons = '';
  if (isInternet) {
    buttons = `
      <a class="btn btn-lg" href="api-details.html" target="_blank"><img src="images/WaxFrame_TipButton_v1.png" alt="" class="tip-icon-img"> API Key Guide</a>
      <button class="btn btn-lg" onclick="showAddCustomAI()">Add Custom AI</button>
      <button class="btn btn-lg" id="testAllKeysBtn" onclick="testAllKeys()">Test All Keys</button>
      <button class="btn btn-lg" id="recommendAllBtn" onclick="recommendModelsForAll()" title="Ask every keyed AI to recommend its best model — runs sequentially">Recommend Models for All</button>
      <button class="btn btn-lg" onclick="openAllConsoles()">Open default AI websites</button>`;
  } else {
    buttons = `
      <button class="btn btn-lg" onclick="showImportServerModal()">Import from Model Server</button>
      <button class="btn btn-lg" onclick="showAddCustomAI()">Add Custom AI</button>
      <button class="btn btn-lg" id="testAllKeysBtn" onclick="testAllKeys()">Test All Keys</button>`;
  }
  // Expand/collapse-all controls — small, sit at the right
  const expandControls = `
    <span class="bee-controls-spacer"></span>
    <button class="btn btn-sm bee-controls-expand-btn" onclick="expandAllAISetupRows()" title="Expand every AI row">⊞ Expand all</button>
    <button class="btn btn-sm bee-controls-expand-btn" onclick="collapseAllAISetupRows()" title="Collapse every AI row">⊟ Collapse all</button>`;
  row.innerHTML = buttons + expandControls;
}
// v3.32.10 — buildBestFastBudgetButtonsHTML and applyCategoryRecommendation
// removed. The Best/Fast/Budget category model was retired in v3.32.10:
// Recommend-a-Model now produces ONE Reviewer pick + ONE Builder pick per
// AI, both surfaced directly in the model dropdown via ✨ and 🔨 markers.
// The expanded panel no longer needs a separate quick-switch button row.



// Hive count chip: shows total AIs in hive + count with saved keys. Purely
// informational. Earlier iterations included an even-count "tie risk" warning,
// but WaxFrame's convergence logic is a threshold check (Math.floor(n/2)+1
// must agree on "no changes") rather than an either-or vote between competing
// proposals — so tie scenarios don't arise. Warning removed as misleading.
function renderHiveCountChip() {
  const chip = document.getElementById('hiveCountChip');
  if (!chip) return;
  const total = aiList.length;
  const withKeys = aiList.filter(ai => {
    const cfg = API_CONFIGS[ai.provider];
    return !!cfg?._key;
  }).length;

  chip.innerHTML = `
    <span class="hive-count-chip-main"><strong>${total}</strong> ${total === 1 ? 'AI' : 'AIs'} in hive <span class="hive-count-sep">·</span> <strong>${withKeys}</strong> with ${withKeys === 1 ? 'key' : 'keys'}</span>
  `;
}

// toggleAllBees() removed — checkboxes replaced by per-session AI selection on work screen
// resetBeesToDefaults() removed in v3.31.0 — defaults are always present in
// the inventory now (no Hide button to undo, no hidden-default state to
// restore). Custom AIs are removed via the bulk-select toolbar. Per-AI
// keys are cleared via the ✕ Key button inside the expanded panel. The
// destructive "wipe everything back to a clean 6-default state" path is
// no longer needed; the same outcome is reachable by selecting all
// customs in the bulk-remove toolbar and clicking Remove.


function saveKeyForAI(id, val, inputEl) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  // v3.26.5: self-heal if API_CONFIGS[provider] is missing for a default AI.
  // This shouldn't happen on hives created post-v3.26.5, but defense-in-depth
  // for any user already in a broken state from a prior version (the legacy
  // removeAI function, deleted in v3.30.4, would destroy structural configs).
  if (!API_CONFIGS[ai.provider] && DEFAULT_API_CONFIGS[ai.provider]) {
    console.warn(`[saveKeyForAI] healing missing API_CONFIGS for ${ai.provider}`);
    API_CONFIGS[ai.provider] = { ...DEFAULT_API_CONFIGS[ai.provider] };
  }
  const cfg = API_CONFIGS[ai.provider];
  if (!cfg) {
    // Truly orphaned — neither runtime config nor default snapshot. Surface
    // loudly instead of silently failing like prior versions did.
    console.error(`[saveKeyForAI] no config for provider "${ai.provider}" — cannot save key`);
    toast(`⚠️ ${ai.name} configuration is missing — try Reset to Defaults`, 5000);
    return;
  }
  cfg._key = val.trim();
  saveSettings();
  // Move focus away so user knows it saved
  if (inputEl) inputEl.blur();
  // v3.26.6: NO LONGER auto-fires recommend pipeline on key save. Auto-fire
  // race-condition'd with the user's natural verification flow (paste → click
  // eyeball to verify → hit Test → optionally hit Recommend). The renderAIRow
  // re-render that followed the recommend would destroy the eyeball mid-click
  // and re-mount the row in a different state. Recommend is now manual-only
  // via the per-row 🤖 button on the model dropdown row. Startup migration
  // (migrateRecommendOnStartup, runs once 1.5s after load) still keeps users
  // current without active interference.
  renderAIRow(id);
  toast(val.trim() ? `🔑 ${ai.name} key saved` : `🗑 ${ai.name} key cleared`, 2000);
}

// v3.31.0 — Partial re-render after a key save / clear. The original
// implementation patched .ai-setup-key-wrap in place to avoid losing
// focus on the key input, but in v3.31 the row may be either collapsed
// or expanded, the row's CSS classes encode no-key state, and the row
// summary needs its name color refreshed when key state flips. Cleanest
// path: re-render the whole row via buildAISetupRowHTML, which respects
// _expandedAIIds (so an open row stays open). The user is mid-flow on
// this row — ensure it's expanded so they can see the result.
function renderAIRow(id) {
  const ai = aiList.find(a => a.id === id);
  const rowEl = document.getElementById('airow-' + id);
  if (!ai || !rowEl) return;
  // Make sure the row stays open after the re-render — the user just
  // interacted with its key field; collapsing it would be jarring.
  _expandedAIIds.add(id);
  rowEl.outerHTML = buildAISetupRowHTML(ai);
}


function renderBuilderPicker() {
  const grid = document.getElementById('builderPickGrid');
  if (!grid) return;
  if (activeAIs.length === 0) return;
  if (!builder || !activeAIs.find(a => a.id === builder)) {
    builder = activeAIs[0].id;
  }
  // v3.32.16 — was bare `<img src="${ai.icon}" onerror="this.style.display='none'">`,
  // which bypassed the brand-match catalog AND silently hid the icon when
  // the PNG failed to load. Now routes through resolveAiIcon so the same
  // three-tier chain applies: brand match → ai.icon → letter avatar (with
  // v3.32.15's first-alphanumeric pickup). 56px matches the .builder-pick-icon
  // sizing inside .builder-pick-grid-large (Setup 2 variant).
  grid.innerHTML = activeAIs.map(ai => {
    const iconEl = resolveAiIcon(ai, 'builder-pick-icon', 56);
    return `
    <button class="builder-pick-btn ${builder === ai.id ? 'selected' : ''}"
      title="${esc(ai.name)}"
      onclick="setBuilder('${ai.id}'); return false;">
      ${iconEl}
      <span class="builder-pick-name">${ai.name}</span>
      ${builder === ai.id ? '<img src="images/WaxFrame_Builder_v3.png" class="builder-selected-badge" onerror="this.style.display=\'none\'">' : ''}
    </button>
  `;
  }).join('');
}

function setBuilder(id) {
  builder = id;
  // v3.32.26 — Persist the change. saveHive() already includes the
  // `builder` field in its localStorage payload (line 2725); the bug
  // was that this setter never called it. setBuilderFromModal() also
  // routes through here, so the Change Builder modal flow now
  // persists too. loadHive() at boot restores `builder = h.builder`,
  // so the round trip is complete.
  saveHive();
  renderBuilderPicker();
  const ai = aiList.find(a => a.id === id);
  toast(`🔨 ${ai?.name} is now the Builder`);
}

async function testApiKey(id) {
  const ai = aiList.find(a => a.id === id);
  const cfg = API_CONFIGS[ai?.provider];
  if (!cfg || !cfg._key) { toast('⚠️ Save a key first'); return; }

  const btn      = document.getElementById('testbtn-' + id);
  const modal    = document.getElementById('testKeyModal');
  const titleEl  = document.getElementById('testKeyModalTitle');
  const subEl    = document.getElementById('testKeyModalSub');
  const epEl     = document.getElementById('testKeyRawEndpoint');
  const sentEl   = document.getElementById('testKeyRawSent');
  const statEl   = document.getElementById('testKeyRawStatus');
  const rcvEl    = document.getElementById('testKeyRawReceived');
  const rowNameEl   = document.getElementById('testKeySingleName');
  const rowStatusEl = document.getElementById('testKeySingleStatus');

  if (titleEl)     titleEl.textContent     = `Testing — ${ai.name}`;
  if (subEl)       subEl.textContent       = 'Sending a minimal test request…';
  if (epEl)        epEl.textContent        = cfg.endpoint;
  if (sentEl)      sentEl.textContent      = '…';
  if (statEl)      statEl.textContent      = '…';
  if (rcvEl)       rcvEl.textContent       = '…';
  if (rowNameEl)   rowNameEl.textContent   = ai.name;
  if (rowStatusEl) { rowStatusEl.textContent = '…'; rowStatusEl.className = 'tkp-status tkp-pending'; }
  if (modal)    modal.classList.add('active');
  if (btn) { btn.textContent = '…'; btn.disabled = true; }

  const sentBody = cfg.bodyFn(cfg.model, 'Reply with exactly one word: CONNECTED');
  if (sentEl) {
    try { sentEl.textContent = JSON.stringify(JSON.parse(sentBody), null, 2); }
    catch { sentEl.textContent = sentBody; }
  }

  const t0 = Date.now();
  try {
    const response = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: cfg.headersFn(cfg._key),
      body: sentBody
    });
    const ms = Date.now() - t0;
    let rawText = '';
    try { rawText = await response.text(); } catch { rawText = '(could not read body)'; }
    let pretty = rawText;
    try { pretty = JSON.stringify(JSON.parse(rawText), null, 2); } catch { /* leave as-is */ }
    if (statEl) statEl.textContent = `HTTP ${response.status} — ${ms}ms`;
    if (rcvEl)  rcvEl.textContent  = pretty;
    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try { const j = JSON.parse(rawText); errMsg = j?.error?.message || errMsg; } catch { /* ignore */ }
      const hint = { 401:'Bad or missing API key.', 403:'Access denied — check key permissions.', 404:'Wrong endpoint URL.', 405:'Method not allowed — endpoint may not support chat completions.', 429:'Rate limited — wait and retry.', 500:'Server error on the provider side.', 503:'Service unavailable — provider may be down.' }[response.status] || '';
      if (subEl) subEl.textContent = `❌ ${errMsg}${hint ? ' — ' + hint : ''}`;
      if (statEl) statEl.textContent = `HTTP ${response.status} — ${ms}ms  ❌`;
      if (rowStatusEl) { rowStatusEl.textContent = '✕'; rowStatusEl.className = 'tkp-status tkp-fail'; rowStatusEl.title = errMsg; }
      if (btn) { btn.textContent = '❌'; btn.disabled = false; }
      setTimeout(() => { if (btn) btn.textContent = 'Test'; }, 5000);
      return;
    }
    let extracted = '';
    try { extracted = cfg.extractFn(JSON.parse(rawText)); } catch { extracted = '(parse error)'; }
    if (subEl)  subEl.textContent  = `✅ Connected — "${extracted.trim().substring(0, 60)}"`;
    if (statEl) statEl.textContent = `HTTP ${response.status} — ${ms}ms  ✅`;
    if (rowStatusEl) { rowStatusEl.textContent = '✓'; rowStatusEl.className = 'tkp-status tkp-pass'; rowStatusEl.title = extracted.trim().substring(0, 60); }
    if (btn) { btn.textContent = '✅'; btn.disabled = false; }
    setTimeout(() => { if (btn) btn.textContent = 'Test'; }, 5000);
  } catch(e) {
    const ms = Date.now() - t0;
    if (subEl)  subEl.textContent  = `❌ ${e.message}`;
    if (statEl) statEl.textContent = `Network Error — ${ms}ms  ❌`;
    if (rcvEl)  rcvEl.textContent  = e.message;
    if (rowStatusEl) { rowStatusEl.textContent = '✕'; rowStatusEl.className = 'tkp-status tkp-fail'; rowStatusEl.title = e.message; }
    if (btn) { btn.textContent = '❌'; btn.disabled = false; }
    setTimeout(() => { if (btn) btn.textContent = 'Test'; }, 5000);
  }
}

function closeTestKeyModal() {
  const modal = document.getElementById('testKeyModal');
  if (modal) modal.classList.remove('active');
}

async function testAllKeys() {
  const keyed = aiList.filter(ai => API_CONFIGS[ai.provider]?._key);
  if (!keyed.length) { toast('⚠️ No API keys saved yet'); return; }

  const modal  = document.getElementById('testKeysModal');
  const title  = document.getElementById('tkpTitle');
  const rowsEl = document.getElementById('tkpRows');
  const sentPane = document.getElementById('tkpSentPane');
  const rcvPane  = document.getElementById('tkpRcvPane');
  const closeBtn = document.getElementById('tkpDismiss');
  if (!modal) return;

  // Fresh state per run
  window._tkpData = {};
  window._tkpSelected = null;
  rowsEl.innerHTML = '';
  if (sentPane) sentPane.innerHTML = '<div class="tkp-empty">Click a row to see the request.</div>';
  if (rcvPane)  rcvPane.innerHTML  = '<div class="tkp-empty">Click a row to see the response.</div>';
  if (title) title.textContent = `Testing ${keyed.length} key${keyed.length !== 1 ? 's' : ''}…`;
  if (closeBtn) { closeBtn.disabled = true; closeBtn.textContent = 'Testing…'; }
  modal.classList.add('active');

  keyed.forEach(ai => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'tkp-row';
    row.id = `tkprow-${ai.id}`;
    row.onclick = () => selectTkpRow(ai.id);
    row.innerHTML = `
      <span class="tkp-ai-name">${ai.name}</span>
      <span class="tkp-status tkp-pending" id="tkpstatusicon-${ai.id}">…</span>`;
    rowsEl.appendChild(row);
    window._tkpData[ai.id] = {
      name: ai.name, endpoint: '', sentBody: '', status: '', rcvBody: '',
      done: false, ok: false,
      consoleUrl: ai.apiConsole || null,
    };
  });

  for (const ai of keyed) {
    await runSingleKeyTest(ai);
    await new Promise(r => setTimeout(r, 300));
  }

  updateTkpTally();
  if (closeBtn) { closeBtn.disabled = false; closeBtn.textContent = '← Close'; }
}

// v3.27.5 — batch recommend.
// Runs recheckModelForAI sequentially across every AI eligible for a
// recommendation: those with a saved key (defaults + auth'd customs) plus
// those imported from a model server with no key but a _modelsEndpoint
// (Ollama / LM Studio / unauth'd Open WebUI). Sequential rather than
// parallel to avoid hammering rate limits on shared endpoints like Alfredo.
// Per-AI feedback is delegated to recheckModelForAI's existing toasts and
// row re-renders; this wrapper only manages confirmation, progress label
// on the toolbar button, and a final summary toast.
async function recommendModelsForAll() {
  const eligible = aiList.filter(ai => {
    const cfg = API_CONFIGS[ai.provider];
    return !!cfg?._key || !!cfg?._modelsEndpoint;
  });
  if (!eligible.length) {
    toast('⚠️ No AIs eligible for model recommendation — add a key or import from a model server first');
    return;
  }

  if (!await wfConfirm(
    'Recommend Models for All',
    `Ask each of your ${eligible.length} eligible AI${eligible.length !== 1 ? 's' : ''} to recommend its best Reviewer and Builder models? Runs in parallel — typically 5–15s total.`
  )) return;

  const btn = document.getElementById('recommendAllBtn');
  const origLabel = btn ? btn.textContent : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = `Asking ${eligible.length} AI${eligible.length !== 1 ? 's' : ''} in parallel…`;
  }

  // v3.32.10 — parallel execution. Previously sequential with 400ms inter-AI
  // delay (30-60s typical for 6 AIs). Now fires Promise.all across all
  // eligible AIs; each AI internally fires its Reviewer+Builder calls in
  // parallel too. Total wall time bounded by slowest single response —
  // typically 5-15s for 6 default AIs, even with 12 underlying API calls.
  let succeeded = 0;
  let failed = 0;
  const results = await Promise.allSettled(eligible.map(ai => recheckModelForAI(ai.id)));
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled') {
      succeeded++;
    } else {
      failed++;
      console.warn(`[recommend-all] ${eligible[idx].name} threw:`, r.reason);
    }
  });

  if (btn) { btn.disabled = false; btn.textContent = origLabel; }
  if (failed > 0) {
    toast(`✓ Recommend complete: ${succeeded} succeeded, ${failed} failed (see console)`, 5000);
  } else {
    toast(`✓ Recommend Models for All complete (${succeeded} processed)`, 5000);
  }
}

// Per-AI test logic — runs one key against its provider, updates the row icon
// and the _tkpData record. Used by both the initial Test All run and the
// retest flows (single row + retest-all-failures). Does NOT compute tally —
// callers run updateTkpTally() once after their batch completes.
async function runSingleKeyTest(ai) {
  const statusEl = document.getElementById(`tkpstatusicon-${ai.id}`);
  const cfg      = API_CONFIGS[ai.provider];
  const rec      = window._tkpData?.[ai.id];
  if (!rec) return;

  if (!cfg || !cfg._key) {
    if (statusEl) { statusEl.textContent = 'No key'; statusEl.className = 'tkp-status tkp-fail'; }
    rec.done = true; rec.ok = false; rec.status = 'No key saved';
    if (window._tkpSelected === ai.id) renderTkpDetail(ai.id);
    return;
  }

  const sentBody = cfg.bodyFn(cfg.model, 'Reply with exactly one word: CONNECTED');
  rec.endpoint = cfg.endpoint;
  try { rec.sentBody = JSON.stringify(JSON.parse(sentBody), null, 2); }
  catch { rec.sentBody = sentBody; }

  if (window._tkpSelected === ai.id) renderTkpDetail(ai.id);

  const t0 = Date.now();
  try {
    const response = await fetch(cfg.endpoint, { method: 'POST', headers: cfg.headersFn(cfg._key), body: sentBody });
    const ms = Date.now() - t0;
    let rawText = '';
    try { rawText = await response.text(); } catch { rawText = '(could not read body)'; }
    let pretty = rawText;
    try { pretty = JSON.stringify(JSON.parse(rawText), null, 2); } catch { /* leave as-is */ }
    rec.status  = `HTTP ${response.status} — ${ms}ms`;
    rec.rcvBody = pretty;
    rec.done    = true;
    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try { const j = JSON.parse(rawText); errMsg = j?.error?.message || errMsg; } catch { /* ignore */ }
      // v3.29.0 — classify so the tooltip/detail message matches the rest
      // of the app's error language. Old code just dumped the raw API
      // message without context; classify adds a human-readable title.
      const entry = WF_DEBUG.classify(new Error(errMsg), {
        status: response.status,
        message: errMsg
      });
      const tooltip = `${entry.title} — ${errMsg}`;
      if (statusEl) { statusEl.textContent = `✕`; statusEl.className = 'tkp-status tkp-fail'; statusEl.title = tooltip; }
      rec.status = `${entry.title} (HTTP ${response.status}) — ${ms}ms`;
      rec.ok = false;
    } else {
      let extracted = '';
      try { extracted = cfg.extractFn(JSON.parse(rawText)); } catch { extracted = '(parse error)'; }
      if (statusEl) { statusEl.textContent = `✓`; statusEl.className = 'tkp-status tkp-pass'; statusEl.title = extracted.trim().substring(0, 60); }
      rec.ok = true;
    }
  } catch(e) {
    const ms = Date.now() - t0;
    // v3.29.0 — client-side fail (CORS, network, etc.) routed through
    // classifier for a precise diagnosis instead of just "Network Error".
    const entry = WF_DEBUG.classify(e, {});
    if (statusEl) { statusEl.textContent = `✕`; statusEl.className = 'tkp-status tkp-fail'; statusEl.title = `${entry.title} — ${e.message}`; }
    rec.status  = `${entry.title} — ${ms}ms`;
    rec.rcvBody = e.message;
    rec.done    = true;
    rec.ok      = false;
  }

  if (window._tkpSelected === ai.id) renderTkpDetail(ai.id);
}

// Re-run a single AI's test from the Received pane "↻ Retest" button.
// Used after a user fixes their billing/key and wants to verify without
// re-running the full Test All. Updates row + detail pane + tally + retest-all
// button visibility in lockstep.
async function retestSingleKey(aiId) {
  const ai = aiList.find(a => a.id === aiId);
  if (!ai) return;
  const rec = window._tkpData?.[aiId];
  if (!rec) return;

  // Reset row visually + clear prior result so renderTkpDetail shows pending state
  const statusEl = document.getElementById(`tkpstatusicon-${aiId}`);
  if (statusEl) { statusEl.textContent = '…'; statusEl.className = 'tkp-status tkp-pending'; statusEl.title = ''; }
  rec.done = false; rec.ok = false; rec.status = ''; rec.rcvBody = '';
  if (window._tkpSelected === aiId) renderTkpDetail(aiId);

  await runSingleKeyTest(ai);
  if (window._tkpSelected === aiId) renderTkpDetail(aiId);
  updateTkpTally();
}

// Re-run every currently-failed row sequentially. Triggered by the
// "↻ Retest all failures" footer button which is only visible when failures
// are present (managed by updateTkpTally).
async function retestAllFailures() {
  const failureIds = Object.keys(window._tkpData || {})
    .filter(id => {
      const r = window._tkpData[id];
      return r && r.done && !r.ok;
    });
  if (!failureIds.length) return;

  const btn = document.getElementById('tkpRetryAllBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Retesting…'; }

  for (const id of failureIds) {
    await retestSingleKey(id);
    await new Promise(r => setTimeout(r, 300));
  }

  if (btn) { btn.disabled = false; btn.textContent = '↻ Retest all failures'; }
  updateTkpTally();
}

// Compute pass/fail tally from _tkpData and sync the title text + retest-all
// button visibility. Called after Test All completes, after every retest.
function updateTkpTally() {
  const recs = Object.values(window._tkpData || {});
  const passed = recs.filter(r => r.done && r.ok).length;
  const failed = recs.filter(r => r.done && !r.ok).length;
  const titleEl = document.getElementById('tkpTitle');
  if (titleEl) titleEl.textContent = `Done — ${passed} passed, ${failed} failed`;
  const btn = document.getElementById('tkpRetryAllBtn');
  if (btn) btn.classList.toggle('is-hidden', failed === 0);
}

// Click a row → select it and render its data into the Sent + Received panes.
// Works whether the test has completed for that row or is still pending.
function selectTkpRow(id) {
  window._tkpSelected = id;
  document.querySelectorAll('.tkp-row').forEach(r => r.classList.remove('is-selected'));
  const row = document.getElementById(`tkprow-${id}`);
  if (row) row.classList.add('is-selected');
  renderTkpDetail(id);
}

function renderTkpDetail(id) {
  const rec = window._tkpData && window._tkpData[id];
  const sentPane = document.getElementById('tkpSentPane');
  const rcvPane  = document.getElementById('tkpRcvPane');
  if (!rec || !sentPane || !rcvPane) return;

  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // SENT pane — endpoint + request body
  if (rec.sentBody) {
    sentPane.innerHTML = `
      <div class="tkp-detail-label">Endpoint</div>
      <pre class="tkp-detail-pre">${esc(rec.endpoint)}</pre>
      <div class="tkp-detail-label">Request body</div>
      <pre class="tkp-detail-pre tkp-detail-pre--grow">${esc(rec.sentBody)}</pre>`;
  } else {
    sentPane.innerHTML = '<div class="tkp-empty">Waiting for this test to start…</div>';
  }

  // RECEIVED pane — status + response body
  if (rec.done) {
    const billingLinkHtml = (!rec.ok && rec.consoleUrl)
      ? `<a class="tkp-billing-link" href="${esc(rec.consoleUrl)}" target="_blank">Open ${esc(rec.name)} billing console →</a>`
      : '';
    const retestBtnHtml = (!rec.ok)
      ? `<button class="tkp-retest-btn" type="button" onclick="retestSingleKey('${esc(id)}')">↻ Retest ${esc(rec.name)}</button>`
      : '';
    rcvPane.innerHTML = `
      ${billingLinkHtml}${retestBtnHtml}
      <div class="tkp-detail-label">Status</div>
      <pre class="tkp-detail-pre">${esc(rec.status || '—')}</pre>
      <div class="tkp-detail-label">Response body</div>
      <pre class="tkp-detail-pre tkp-detail-pre--grow">${esc(rec.rcvBody || '(empty)')}</pre>`;
  } else if (rec.sentBody) {
    rcvPane.innerHTML = '<div class="tkp-empty">Request sent — awaiting response…</div>';
  } else {
    rcvPane.innerHTML = '<div class="tkp-empty">Waiting for this test to start…</div>';
  }
}

function dismissTestPanel() {
  const modal = document.getElementById('testKeysModal');
  if (modal) modal.classList.remove('active');
}

function openConsoleErrorDetail(id) {
  const data = window._consoleErrorData && window._consoleErrorData[id];
  if (!data) return;
  const modal    = document.getElementById('consoleErrorDetailModal');
  const titleEl  = document.getElementById('cedTitle');
  const statusEl = document.getElementById('cedStatus');
  const rawEl    = document.getElementById('cedRaw');
  const linkEl   = document.getElementById('cedBillingLink');
  if (!modal) return;
  if (titleEl)  titleEl.textContent  = data.aiName ? `${data.aiName} — Error Detail` : 'Error Detail';
  if (statusEl) statusEl.textContent = data.status || '—';
  if (rawEl)    rawEl.textContent    = data.rawJson || '(no response body)';
  if (linkEl) {
    if (data.consoleUrl) {
      linkEl.href        = data.consoleUrl;
      linkEl.textContent = `Open ${data.aiName || 'provider'} billing console →`;
      linkEl.classList.remove('is-hidden');
    } else {
      linkEl.classList.add('is-hidden');
    }
  }
  modal.classList.add('active');
}

function applyNotesTemplate(template) {
  const ta = document.getElementById('workNotes');
  if (!ta) return;
  const current = ta.value.trim();
  const newText = current ? current + '\n\n' + template : template;
  ta.value = newText;
  ta.focus();
  // Select the first [PLACEHOLDER] in the inserted text so user can type right away
  const pStart = newText.lastIndexOf('[');
  const pEnd   = newText.lastIndexOf(']');
  if (pStart !== -1 && pEnd !== -1 && pEnd > pStart) {
    ta.setSelectionRange(pStart, pEnd + 1);
  } else {
    ta.setSelectionRange(newText.length, newText.length);
  }
  saveSession();
  updateNotesBtnPriority();
}

// removeAI() removed in v3.30.4 — its sole UI caller (the per-row trash
// button on custom AIs) was deleted when persistent-checkbox bulk-remove
// shipped. bulkRemoveSelectedAIs() inherits the per-AI cleanup pattern
// (filter aiList/activeAIs, reset builder, drop API_CONFIGS, purge the
// three localStorage keys: recommend_default-${provider},
// recommend_custom-${id}, models_${id}). Defaults can no longer be
// removed at all as of v3.31.0; per-AI keys are cleared via the ✕ Key
// button inside the expanded panel.

// hideDefaultAI / hideAllDefaultAIs / restoreHiddenDefaults removed in
// v3.31.0 — defaults are always present in the inventory now (David's
// design call: "we don't need to hide anything just leave them they can
// stay collapsed and grayed out"). The hiddenDefaultIds state is gone
// from saveHive output and silently ignored on legacy load. If a user
// upgrading from pre-v3.31 had hidden some defaults, their next load
// shows the full default set again — by design, no migration prompt.

// Open the API key / sign-up console for every default AI in new tabs.
// (v3.21.25) Opens consoles for all six DEFAULT_AIS regardless of hidden status —
// the user explicitly asked to see them all, including any they previously hid.
// Browsers may surface a one-time "allow popups from this site" prompt on first
// click; once allowed, subsequent invocations open all six tabs cleanly.
function openAllConsoles() {
  const seen   = new Set();
  let opened   = 0;
  let blocked  = 0;
  for (const d of DEFAULT_AIS) {
    const url = d.apiConsole;
    if (!url || url === '#' || seen.has(url)) continue;
    seen.add(url);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) opened++;
    else   blocked++;
  }
  if (opened === 0 && blocked === 0) {
    toast('⚠️ No API console URLs available');
  } else if (blocked > 0 && opened === 0) {
    toast('⚠️ Popups blocked — allow popups for this site and try again', 4500);
  } else if (blocked > 0) {
    toast(`↗ Opened ${opened} of ${opened + blocked} — allow popups to open the rest`, 4500);
  } else {
    toast(`↗ Opened ${opened} API website${opened !== 1 ? 's' : ''} in new tabs`, 3000);
  }
}

async function clearKeyForAI(id) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  if (!await wfConfirm('Remove API Key', `Remove the saved API key for ${ai.name}?`, { okText: 'Remove', destructive: true })) return;
  const cfg = API_CONFIGS[ai.provider];
  if (cfg) delete cfg._key;
  saveSettings();
  renderAISetupGrid();
  toast(`🗑 ${ai.name} API key removed`);
}

function toggleKeyVis(id) {
  const input = document.getElementById('key-' + id);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleCustomAIKeyVis() {
  const input = document.getElementById('customAIKey');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function autoFillAIName(url) {
  const nameInput = document.getElementById('customAIName');
  if (!nameInput) return;
  // Only auto-fill if user hasn't manually typed a name
  if (nameInput.dataset.userTyped === 'true') return;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    // Take the main domain part (first segment), capitalize properly
    const raw = parts[0];
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    nameInput.value = name;
    nameInput.placeholder = 'e.g. DeepSeek';
  } catch(e) {
    nameInput.value = '';
    nameInput.placeholder = 'e.g. DeepSeek';
  }
  // v3.29.11 — refresh icon preview after name auto-fill: if user types
  // a URL like https://api.cohere.ai/... the auto-name "Cohere" matches
  // the catalog and the icon preview lights up instantly.
  if (typeof refreshCustomAIIconPreview === 'function') refreshCustomAIIconPreview();
}

function showAddCustomAI() {
  const modal = document.getElementById('addCustomAIModal');
  const isOpen = modal.classList.contains('active');
  if (isOpen) {
    modal.classList.remove('active');
    return;
  }
  // Clear form fresh when opening
  const urlInput   = document.getElementById('customAIUrl');
  const nameInput  = document.getElementById('customAIName');
  const keyInput   = document.getElementById('customAIKey');
  const fmtSelect  = document.getElementById('customAIFormat');
  const modelInput = document.getElementById('customAIModel');
  const quickAdd   = document.getElementById('customAIQuickAdd');
  const keyLink    = document.getElementById('customAIKeyLink');
  const helpLink   = document.getElementById('customAIProviderHelpLink');
  if (urlInput)   urlInput.value  = '';
  if (nameInput)  { nameInput.value = ''; nameInput.placeholder = 'e.g. Work AI'; nameInput.dataset.userTyped = 'false'; }
  if (keyInput)   keyInput.value  = '';
  if (fmtSelect)  fmtSelect.value = 'openai';
  if (modelInput) modelInput.value = '';
  if (quickAdd)   quickAdd.value  = '';
  if (keyLink)    keyLink.style.display = 'none';
  if (helpLink)   helpLink.style.display = 'none';
  // v3.56.6 — clear the API Console / Docs URL fields and their userTyped flags
  const consoleInput = document.getElementById('customAIConsoleUrl');
  if (consoleInput) { consoleInput.value = ''; delete consoleInput.dataset.userTyped; }
  const docsInput = document.getElementById('customAIDocsUrl');
  if (docsInput)    { docsInput.value = '';    delete docsInput.dataset.userTyped; }
  resetModelField();
  populateQuickAddOptions();
  updateChooseModelLink();
  // v3.29.11 — wire the icon uploader and clear any previous icon. attach()
  // is idempotent — re-binding event handlers each open is fine and avoids
  // a separate "is initialized?" flag.
  wfIconUpload.attach({
    fileInputId:   'customAIIconFileInput',
    previewId:     'customAIIconPreview',
    previewWrapId: 'customAIIconWrap',
    clearBtnId:    'customAIIconClearBtn',
    uploadBtnId:   'customAIIconUploadBtn',
    // v3.29.11 — when user clears their upload, fall back to catalog
    // preview based on whatever provider the form currently describes.
    onClearFallback: () => _customAIIconCtx()
  });
  wfIconUpload.clear({
    previewId:     'customAIIconPreview',
    previewWrapId: 'customAIIconWrap',
    uploadBtnId:   'customAIIconUploadBtn'
  });
  // Initial catalog preview — modal opens empty, but if (for example)
  // a Quick Add preset was pre-selected this would show it. Currently
  // applyQuickAdd handles that via its own previewCatalogMatch call.
  refreshCustomAIIconPreview();
  modal.classList.add('active');
  document.getElementById('customAIQuickAdd')?.focus();
}

// v3.29.11 — Helpers for the live catalog-icon preview. Centralized here
// so every form-change handler (applyQuickAdd, autoFillAIName, fetchCustomAIModels)
// uses the same ctx-building logic. The preview reads name + model from
// the live form state and asks wfIconUpload to resolve a matching catalog
// icon (or generic fallback).
function _customAIIconCtx() {
  return {
    name:  document.getElementById('customAIName')?.value || '',
    model: (() => {
      const sel = document.getElementById('customAIModelSelect');
      if (sel && sel.style.display !== 'none' && sel.value) return sel.value;
      return document.getElementById('customAIModel')?.value || '';
    })()
  };
}
function refreshCustomAIIconPreview() {
  wfIconUpload.previewCatalogMatch({
    previewId:     'customAIIconPreview',
    previewWrapId: 'customAIIconWrap',
    uploadBtnId:   'customAIIconUploadBtn'
  }, _customAIIconCtx());
}

// v3.32.16 — Browse Icons button on the Custom AI modal. Opens the
// reusable openIconPicker (Bundled tab shows Providers + Tools & Servers
// + Mascots; Upload tab is the same upload-and-resize flow as the
// dedicated Upload button). On select, the chosen icon path (or upload
// data URL) is fed into the Custom AI preview via wfIconUpload.set().
// Covers the case David flagged: user adds a Custom AI whose model name
// doesn't match any of the nine auto-detected brands AND they don't
// have an upload of their own — Browse Icons gives them a one-click
// path to any bundled icon (e.g. Mascot, Tools & Servers section)
// without forcing them to source an image from elsewhere.
function openCustomAIIconPicker() {
  const opts = {
    fileInputId:   'customAIIconFileInput',
    previewId:     'customAIIconPreview',
    previewWrapId: 'customAIIconWrap',
    clearBtnId:    'customAIIconClearBtn',
    uploadBtnId:   'customAIIconUploadBtn'
  };
  // Read whatever the preview currently shows so the picker can
  // highlight the matching tile (catalog match, prior pick, or upload).
  const currentIcon = wfIconUpload.readAny({
    previewId:     'customAIIconPreview',
    previewWrapId: 'customAIIconWrap'
  });
  openIconPicker({
    currentIcon: currentIcon || null,
    onSelect: (src) => {
      if (src) wfIconUpload.set(opts, src);
    }
  });
}

// v3.29.8 — info modal handlers. Opens a help screen explaining each
// field on the Add a Custom Worker Bee form. Most users adding their
// own custom AI don't know what URL or API Format to use unless they
// pick from Quick Add, and even then "what does API Format mean" is
// not obvious. The info modal answers those questions inline.
function showCustomAIInfoModal() {
  const modal = document.getElementById('customAIInfoModal');
  if (modal) modal.classList.add('active');
}
function hideCustomAIInfoModal() {
  const modal = document.getElementById('customAIInfoModal');
  if (modal) modal.classList.remove('active');
}

// ── Custom AI Quick Add provider presets ──
const QUICK_ADD_PROVIDERS = {
  mistral: {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    format: 'openai',
    keyLink: 'https://console.mistral.ai/api-keys',
    keyLinkLabel: 'Get your Mistral API key →',
    defaultModel: 'mistral-large-latest',
    chooseModelLink: 'https://docs.mistral.ai/getting-started/models/models_overview/'
  },
  together: {
    name: 'Together AI',
    url: 'https://api.together.xyz/v1/chat/completions',
    format: 'openai',
    keyLink: 'https://api.together.ai/settings/api-keys',
    keyLinkLabel: 'Get your Together AI key →',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    chooseModelLink: 'https://docs.together.ai/docs/serverless-models'
  },
  cohere: {
    name: 'Cohere',
    url: 'https://api.cohere.ai/compatibility/v1/chat/completions',
    format: 'openai',
    keyLink: 'https://dashboard.cohere.com/api-keys',
    keyLinkLabel: 'Get your Cohere API key →',
    defaultModel: 'command-r-plus',
    chooseModelLink: 'https://docs.cohere.com/docs/models'
  },
  ollama: {
    name: 'Ollama',
    url: 'http://localhost:11434/v1/chat/completions',
    format: 'openai',
    keyLink: null,
    keyLinkLabel: null,
    defaultModel: null,
    chooseModelLink: 'https://ollama.com/library'
  },
  lmstudio: {
    name: 'LM Studio',
    url: 'http://localhost:1234/v1/chat/completions',
    format: 'openai',
    keyLink: null,
    keyLinkLabel: null,
    defaultModel: null,
    chooseModelLink: 'https://lmstudio.ai/docs/basics/download-model'
  }
};

// Match the user's current URL against a Quick Add preset (trailing-slash
// normalized). Used by fetchCustomAIModels to decide which preset's
// defaultModel to apply. Returns null if the URL has been manually edited
// off-preset.
function getActivePreset(currentUrl) {
  const norm = u => (u || '').replace(/\/+$/, '').trim();
  const target = norm(currentUrl);
  if (!target) return null;
  const key = Object.keys(QUICK_ADD_PROVIDERS).find(k =>
    norm(QUICK_ADD_PROVIDERS[k].url) === target
  );
  return key ? QUICK_ADD_PROVIDERS[key] : null;
}

// ── v3.25.7: Custom AI decision aids — see updateModelAids() ───────────────
// (v3.25.7 originally defined updateChooseModelLink here; v3.26.1 unified the
// recommend + browse-models visibility into updateModelAids and converted this
// into a thin shim. See line ~3460 for the unified implementation.)

// ── v3.25.7: Quick Add preset already-in-hive markers ──────────────────────
// Decorates the Quick Add preset dropdown options with "✓ already in your
// hive" suffixes so the user can see at a glance which providers are already
// configured. Match by endpoint URL, trailing-slash normalized.
//
// Options stay ENABLED — adding multiple models from the same provider
// (e.g. two Mistral models) is a valid flow. This differs from the
// fetched-models dropdown (v3.25.6) where exact model+endpoint duplicates
// are disabled, since adding the literal same model twice IS a duplicate.
function populateQuickAddOptions() {
  const sel = document.getElementById('customAIQuickAdd');
  if (!sel) return;
  const norm = u => (u || '').replace(/\/+$/, '').trim();
  const inHiveUrls = new Set(
    aiList
      .map(ai => norm(API_CONFIGS[ai.provider]?.endpoint))
      .filter(Boolean)
  );
  Array.from(sel.options).forEach(opt => {
    const key = opt.value;
    if (!key) return; // skip placeholder
    const preset = QUICK_ADD_PROVIDERS[key];
    if (!preset) return;
    if (!opt.dataset.baseLabel) opt.dataset.baseLabel = opt.textContent;
    const baseLabel = opt.dataset.baseLabel;
    const presetUrl = norm(preset.url);
    opt.textContent = (presetUrl && inHiveUrls.has(presetUrl))
      ? `${baseLabel}  ✓ already in your hive`
      : baseLabel;
  });
}

// Models that should never appear as Hive reviewers regardless of provider.
// (NON_CHAT_RE is defined alongside MODEL_FILTERS at the top of this file —
// see STRUCTURAL_NON_CHAT_RE. Custom AI uses the same filter as default 6.)

// ── v3.26.0: Model recommendation pipeline ────────────────────────────────
// The Recommend pipeline asks a provider's own API which of its available
// models is the best fit for WaxFrame Reviewer duty. Replaces the prior
// hardcoded MODEL_LABELS-as-source-of-truth design with a delegate-to-provider
// architecture. MODEL_LABELS / MODEL_FALLBACKS demoted to safety net for
// when the live recommend call fails (network, key missing, malformed reply).
//
// Cache: 24hr keyed by stable cacheId (provider name for default 6, raw URL
// for Custom AI). User can manually swap model anytime via existing dropdown.
const RECOMMEND_CACHE_TTL = 24 * 60 * 60 * 1000;

// v3.32.10 — Replaces the single MODEL_RECOMMENDATION_PROMPT_DEFAULT
// (three-pick BEST/FASTEST/BUDGET) with two role-specific single-pick
// prompts. See release notes for v3.32.10 for the full evidence trail
// behind this change. Short version: empirical test data showed the old
// FASTEST/BUDGET categories were producing unreliable picks (AIs can't
// know their own current pricing or speed), and the assumed parser-break
// from reasoning models doesn't actually happen in the Reviewer role.
// The Builder role is structurally different — it owns the document
// envelope — so it gets the stricter prompt.

const MODEL_RECOMMENDATION_PROMPT_REVIEWER =
`You are helping select one of YOUR available models for use as a Reviewer in WaxFrame, a multi-AI document refinement tool. Reviewers read documents and return numbered edit suggestions across multiple rounds. Reviewer output is consumed by another AI (the Builder), not directly parsed into a final envelope, so verbose preambles are tolerated but cost-inefficient.

Available models on this endpoint:
{MODEL_LIST}

Pick exactly ONE model: the best model for high-quality document review.

Selection rules:
- The model MUST be an exact model id from the list above.
- Must be a chat/text model suitable for document review, editing feedback, summarization, and instruction following.
- Do NOT recommend embedding, rerank, moderation, image, audio, speech, transcription, or code-only models.
- Standard non-reasoning chat models are PREFERRED when quality is comparable, because reasoning/thinking models are typically 5-10x slower and more expensive due to billable analysis output.
- Reasoning, thinking, or chain-of-thought models are ALLOWED only if they are clearly stronger for document review than the available standard chat models.
- If multiple models are roughly equivalent, prefer the most recently released.

Respond in EXACTLY this format with NO preamble, NO markdown, NO extra lines:

RECOMMENDED: <one exact model id from the list above>
RECOMMENDED_WHY: <one sentence, max 120 chars>`;

const MODEL_RECOMMENDATION_PROMPT_BUILDER =
`You are helping select one of YOUR available models for use as the Builder in WaxFrame, a multi-AI document refinement tool. The Builder reads reviewer suggestions and rewrites the document, emitting a strict envelope that is parsed by code:

  %%DOCUMENT_START%%
  ...rewritten document...
  %%DOCUMENT_END%%
  %%CONFLICTS_START%%
  ...numbered conflict cards...
  %%CONFLICTS_END%%

Any visible thinking, chain-of-thought, reasoning trace, research step, preamble, or extra text before/around the envelope risks breaking the parser.

Available models on this endpoint:
{MODEL_LIST}

Pick exactly ONE model: the best standard chat-completion model for Builder use.

Selection rules:
- The model MUST be an exact model id from the list above.
- Must be a standard chat-completion model that follows strict output formatting reliably.
- Do NOT recommend any model whose id, description, or known behavior suggests reasoning, thinking, deep-research, research, chain-of-thought, planner, agentic, reflective, or deliberative output.
- Do NOT recommend embedding, rerank, moderation, image, audio, speech, transcription, or code-only models.
- If the most capable model is a reasoning/thinking/research model, skip it and choose the best standard chat model instead.
- If no safe standard chat-completion model exists, respond with NONE.
- If multiple safe models are roughly equivalent, prefer the most recently released.

Respond in EXACTLY this format with NO preamble, NO markdown, NO extra lines:

RECOMMENDED: <one exact model id from the list above, or NONE>
RECOMMENDED_WHY: <one sentence, max 120 chars>`;

// v3.32.10 — Code-side substring filters as defense-in-depth.
// The prompts above instruct the AI; these filters enforce in code so the
// AI never sees disqualified models in {MODEL_LIST} in the first place.
// neverAllowedPattern applies to BOTH roles (these models can't do
// document review at all). builderDisallowedPattern applies ONLY to the
// Builder role (reasoning models work fine as reviewers per empirical data,
// but pose envelope risk as builders).
const NEVER_ALLOWED_PATTERN =
  /(embedding|embed|rerank|moderation|image|vision-only|audio|speech|transcrib|code-only|coder)/i;
const BUILDER_DISALLOWED_PATTERN =
  /(reasoning|thinking|deep[-_ ]?research|research|chain[-_ ]?of[-_ ]?thought|\bcot\b|\bo1\b|\bo3\b|\bo4\b|\br1\b|planner|agentic|reflect|deliberative)/i;

function filterModelsForRole(models, role) {
  if (!Array.isArray(models)) return [];
  return models.filter(m => {
    if (NEVER_ALLOWED_PATTERN.test(m)) return false;
    if (role === 'builder' && BUILDER_DISALLOWED_PATTERN.test(m)) return false;
    return true;
  });
}

// Backwards-compat alias retained as the canonical lookup name expected
// by getRecommendationPrompt(). Defaults to the Reviewer prompt because
// historically that's been the implicit role of unspecified recommendations.
const MODEL_RECOMMENDATION_PROMPT_DEFAULT = MODEL_RECOMMENDATION_PROMPT_REVIEWER;

function getRecommendationPrompt(role) {
  // v3.32.10 — role-aware prompt selection. Role is 'reviewer' or 'builder'.
  // Custom prompts saved via Prompt Editor still override defaults.
  // For backwards compatibility, omitted role falls through to Reviewer.
  const r = role === 'builder' ? 'builder' : 'reviewer';
  const defaultPrompt = r === 'builder'
    ? MODEL_RECOMMENDATION_PROMPT_BUILDER
    : MODEL_RECOMMENDATION_PROMPT_REVIEWER;
  try {
    const saved = JSON.parse(localStorage.getItem('waxframe_v2_prompts') || '{}');
    const customKey = r === 'builder' ? 'recommend_model_builder' : 'recommend_model_reviewer';
    // Honor a custom prompt if saved under the role-specific key, OR the
    // legacy key 'recommend_model' for migration grace (user customisations
    // from before v3.32.10 still apply, defaulting to Reviewer interpretation).
    return saved[customKey] || saved.recommend_model || defaultPrompt;
  } catch(e) {
    return defaultPrompt;
  }
}

function getCachedRecommendation(cacheId) {
  if (!cacheId) return null;
  const key = `waxframe_recommend_${cacheId}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && (Date.now() - cached.ts) < RECOMMEND_CACHE_TTL) return cached;
  } catch(e) {}
  return null;
}

// ── v3.26.8: WAXFRAME CONFIRM MODAL ──
// Promise-based replacement for native `confirm()`. Browser dialogs are jarring
// against WaxFrame's design language and can't be styled. Usage:
//   if (await wfConfirm('Title', 'Body text')) { ... }
// or with options:
//   if (await wfConfirm('Title', 'Body', { okText: 'Remove', destructive: true })) ...
let _wfConfirmResolve = null;
let _wfConfirmCheckboxMode = false;  // v3.54.0 — when true, resolve {ok, checked}

function wfConfirm(title, message, opts = {}) {
  return new Promise(resolve => {
    _wfConfirmResolve = resolve;
    const modal   = document.getElementById('wfConfirmModal');
    const titleEl = document.getElementById('wfConfirmTitle');
    const msgEl   = document.getElementById('wfConfirmMsg');
    const okBtn   = document.getElementById('wfConfirmOkBtn');
    const cancelBtn = document.getElementById('wfConfirmCancelBtn');
    // v3.54.0 — optional checkbox row. When opts.checkbox = {label, checked}
    // is passed, show the row and switch this call into "checkbox mode" —
    // wfConfirmOk/Cancel then resolve an object { ok, checked } instead of
    // a bare boolean. Existing callers that don't pass opts.checkbox keep
    // the boolean contract unchanged (backward-compatible).
    const checkRow  = document.getElementById('wfConfirmCheckRow');
    const checkBox  = document.getElementById('wfConfirmCheck');
    const checkLbl  = document.getElementById('wfConfirmCheckLabel');
    _wfConfirmCheckboxMode = !!opts.checkbox;
    if (checkRow && checkBox) {
      if (opts.checkbox) {
        if (checkLbl) checkLbl.textContent = opts.checkbox.label || '';
        checkBox.checked = !!opts.checkbox.checked;
        checkRow.style.display = '';
      } else {
        checkRow.style.display = 'none';
        checkBox.checked = false;
      }
    }
    if (!modal) {
      const ok = window.confirm(message || title);
      resolve(opts.checkbox ? { ok, checked: false } : ok);
      return;
    }
    if (titleEl) titleEl.textContent = title || 'Confirm';
    if (msgEl)   msgEl.textContent   = message || '';
    if (okBtn) {
      okBtn.textContent = opts.okText || 'OK';
      okBtn.classList.toggle('wf-confirm-danger', !!opts.destructive);
    }
    if (cancelBtn) cancelBtn.textContent = opts.cancelText || 'Cancel';
    modal.classList.add('active');
  });
}

function wfConfirmOk() {
  const modal = document.getElementById('wfConfirmModal');
  if (modal) modal.classList.remove('active');
  if (_wfConfirmResolve) {
    if (_wfConfirmCheckboxMode) {
      const checkBox = document.getElementById('wfConfirmCheck');
      _wfConfirmResolve({ ok: true, checked: !!(checkBox && checkBox.checked) });
    } else {
      _wfConfirmResolve(true);
    }
    _wfConfirmResolve = null;
  }
  _wfConfirmCheckboxMode = false;
}

function wfConfirmCancel() {
  const modal = document.getElementById('wfConfirmModal');
  if (modal) modal.classList.remove('active');
  if (_wfConfirmResolve) {
    _wfConfirmResolve(_wfConfirmCheckboxMode ? { ok: false, checked: false } : false);
    _wfConfirmResolve = null;
  }
  _wfConfirmCheckboxMode = false;
}

// ════════════════════════════════════════════════════════════════════
// v3.32.18 — Length Guard Modal · v3.32.28 — multi-kind support
// ────────────────────────────────────────────────────────────────────
// Shown when the document fails a length-related gate AND the project's
// length-guard override is not yet set. Three actions in every kind:
//
//   • Discard         — reject the action that triggered the prompt.
//                       For round-bloat this means the bloat failed-round
//                       path (existing behavior). For convergence kinds,
//                       it means block the celebration and let the user
//                       edit the document.
//   • Keep            — accept this round / convergence event one-time,
//                       guard stays armed for future events.
//   • Continue Anyway — accept AND set window._lengthGuardOverride =
//                       true, persisted in IDB session. Future events
//                       skip the gate entirely until clearProject().
//
// v3.32.28 adds a `kind` parameter that adapts copy and which trajectory
// rows render. Recognized kinds:
//
//   'over'                 — round bloat (existing v3.32.18 behavior, default)
//   'under'                — round undersized (#6d, symmetric to 'over')
//   'convergence_over'     — #6b, hive converged but doc is over target
//   'convergence_under'    — #6b, hive converged but doc is under floor
//
// For the convergence kinds, the prior-document and trajectory rows are
// hidden because there is no Builder round to compare against — we are
// gating the celebration on the current document's standalone length.
//
// Caller awaits the returned Promise. Resolves to one of:
//   'discard' | 'keep' | 'continue_anyway'
//
// Round-level gates (over/under) only fire when (a) a length constraint
// is set AND (b) the round failed even after trajectory awareness was
// considered. Unconstrained 1.5× / 0.5× sanity-check fails take the
// existing BUILDER_BLOAT failed-round path — there is no target to
// "Continue Anyway" against in the unconstrained case.
// ════════════════════════════════════════════════════════════════════

let _lengthGuardResolve = null;

function lengthGuardPrompt({ kind = 'over', actual, prevActual, limitNum, unitName, limitName, builderName }) {
  return new Promise(resolve => {
    _lengthGuardResolve = resolve;
    // v3.36.14 — Forensic log when length-guard dialog opens. Captures
    // kind (over / under / convergence_over / convergence_under),
    // actual size, target, builder identity. Pairs with the per-choice
    // log in _lengthGuardChoose to give a complete audit trail of every
    // length-guard interaction (previously only the "continue anyway"
    // branch logged — discard / keep choices were silent).
    if (typeof consoleLog === 'function') {
      consoleLog(`📏 Length guard halt — kind: ${kind}, actual: ${actual} ${unitName || ''}, ${limitName || 'limit'}: ${limitNum}${builderName ? ` (builder: ${builderName})` : ''}`, 'warn');
    }
    const modal       = document.getElementById('lengthGuardModal');
    const titleEl     = document.getElementById('lengthGuardTitle');
    const summaryEl   = document.getElementById('lengthGuardSummary');
    const priorEl     = document.getElementById('lengthGuardPrior');
    const actualEl    = document.getElementById('lengthGuardActual');
    const limitEl     = document.getElementById('lengthGuardLimit');
    const deltaEl     = document.getElementById('lengthGuardDelta');
    const deltaRow    = deltaEl ? deltaEl.closest('.length-guard-row') : null;
    const distanceEl  = document.getElementById('lengthGuardDistance');
    const priorRow    = priorEl ? priorEl.closest('.length-guard-row') : null;
    const helpEl      = document.getElementById('lengthGuardHelp');
    const discardBtn  = document.getElementById('lengthGuardDiscardBtn');
    const keepBtn     = document.getElementById('lengthGuardKeepBtn');
    const continueBtn = document.getElementById('lengthGuardContinueBtn');
    const builderFixBtn = document.getElementById('lengthGuardBuilderFixBtn');
    if (!modal) {
      // Modal not in DOM (shouldn't happen, but defensive). Default to
      // the existing failed-round behavior so corruption can't sneak in.
      resolve('discard');
      return;
    }
    const isConvergence = kind === 'convergence_over' || kind === 'convergence_under';
    const isUnder       = kind === 'under' || kind === 'convergence_under';
    const fmt           = n => (typeof n === 'number') ? n.toLocaleString() : String(n);

    // ── Title ──
    if (titleEl) {
      if (kind === 'convergence_over')       titleEl.textContent = '📏 Hive converged — document over length target';
      else if (kind === 'convergence_under') titleEl.textContent = '📏 Hive converged — document under length floor';
      else if (kind === 'under')             titleEl.textContent = '📏 Round below length floor';
      else                                   titleEl.textContent = '📏 Round exceeds length limit';
    }

    // ── Summary line ──
    if (summaryEl) {
      if (kind === 'convergence_over') {
        summaryEl.textContent = `All AIs agree the document is done, but it exceeds your length target. Choose how to handle this convergence.`;
      } else if (kind === 'convergence_under') {
        summaryEl.textContent = `All AIs agree the document is done, but it is under your length floor. Choose how to handle this convergence.`;
      } else if (kind === 'under') {
        summaryEl.textContent = `${builderName || 'Builder'} produced a document well below your length target. Choose how to handle this round.`;
      } else {
        summaryEl.textContent = `${builderName || 'Builder'} produced a document that exceeds your length target. Choose how to handle this round.`;
      }
    }

    // ── Prior + Trajectory rows: hide for convergence kinds (no round-to-round comparison applies) ──
    if (priorRow) priorRow.classList.toggle('is-hidden', isConvergence);
    if (deltaRow) deltaRow.classList.toggle('is-hidden', isConvergence);

    // ── Values ──
    if (priorEl)  priorEl.textContent  = `${fmt(prevActual || 0)} ${unitName}`;
    if (actualEl) actualEl.textContent = `${fmt(actual)} ${unitName}`;
    if (limitEl)  limitEl.textContent  = limitName || `${fmt(limitNum)} ${unitName}`;
    if (deltaRow) deltaRow.classList.remove('is-improving', 'is-worsening', 'is-stalled');
    if (deltaEl && !isConvergence) {
      const delta = actual - prevActual;
      // For 'under', shrinking is worsening and growing is improving — flip the sign semantics.
      const movingTowardTarget = isUnder ? (delta > 0) : (delta < 0);
      const movingAwayFromTarget = isUnder ? (delta < 0) : (delta > 0);
      if (movingTowardTarget) {
        deltaEl.textContent = `${isUnder ? '↑' : '↓'} ${fmt(Math.abs(delta))} ${unitName}`;
        if (deltaRow) deltaRow.classList.add('is-improving');
      } else if (movingAwayFromTarget) {
        deltaEl.textContent = `${isUnder ? '↓' : '↑'} ${fmt(Math.abs(delta))} ${unitName}`;
        if (deltaRow) deltaRow.classList.add('is-worsening');
      } else {
        deltaEl.textContent = 'unchanged';
        if (deltaRow) deltaRow.classList.add('is-stalled');
      }
    }

    // ── Distance row ──
    if (distanceEl) {
      if (isUnder) {
        const underBy = limitNum - actual;
        distanceEl.textContent = underBy > 0
          ? `${fmt(underBy)} ${unitName} under floor`
          : `within target`;
      } else {
        const overBy = actual - limitNum;
        distanceEl.textContent = overBy > 0
          ? `${fmt(overBy)} ${unitName} over`
          : `within target`;
      }
    }

    // ── Button labels: for convergence kinds, "Discard" reads as "block convergence" ──
    if (discardBtn) discardBtn.textContent = isConvergence ? 'Block convergence' : 'Discard round';
    if (keepBtn)    keepBtn.textContent    = isConvergence ? 'Accept this convergence' : 'Keep this round';
    if (continueBtn) continueBtn.textContent = 'Continue anyway · disable guard';
    // v3.56.9 — "Trim/Expand with Builder" shows for convergence kinds only
    // (the interactive analog of #9's at-convergence reroll). Hidden for the
    // mid-round over/under prompts, which already have Discard (= re-run).
    if (builderFixBtn) {
      builderFixBtn.classList.toggle('is-hidden', !isConvergence);
      builderFixBtn.textContent = isUnder ? 'Expand with Builder' : 'Trim with Builder';
    }

    // ── Help paragraph copy ──
    if (helpEl) {
      if (isConvergence) {
        helpEl.innerHTML = '<strong>Trim/Expand with Builder</strong> sends the document back to the Builder to bring it into your length range, then re-checks (recommended). <strong>Block convergence</strong> rejects the celebration so you can edit and re-run. <strong>Accept</strong> proceeds anyway with the guard still armed. <strong>Continue anyway</strong> proceeds and disables the length guard for the rest of this project.';
      } else if (isUnder) {
        helpEl.innerHTML = '<strong>Discard</strong> rejects the round (default). <strong>Keep</strong> accepts this round\'s output as the new document, but the guard stays active for future rounds. <strong>Continue anyway</strong> accepts and disables the length guard for the rest of this project — useful when the floor doesn\'t match what the document actually needs to be.';
      } else {
        helpEl.innerHTML = '<strong>Discard</strong> rejects the round (default). <strong>Keep</strong> accepts this round\'s output as the new document, but the guard stays active for future rounds. <strong>Continue anyway</strong> accepts and disables the length guard for the rest of this project — useful when the guard\'s target doesn\'t match what the document actually needs to be.';
      }
    }

    modal.classList.add('active');
  });
}

function _lengthGuardChoose(value) {
  const modal = document.getElementById('lengthGuardModal');
  if (modal) modal.classList.remove('active');
  // v3.36.14 — Forensic log for the user's choice. Was previously only
  // logged downstream when 'continue_anyway' flipped the override flag;
  // 'discard' and 'keep' were silent. Now every choice lands in the
  // console so transcript exports have a complete record.
  if (typeof consoleLog === 'function') {
    const _label = value === 'discard'         ? 'Discard round'
                 : value === 'keep'            ? 'Keep round (guard stays armed)'
                 : value === 'continue_anyway' ? 'Continue anyway (disable guard for project)'
                 : value === 'builder_fix'     ? 'Trim/Expand with Builder'
                 : value;
    consoleLog(`📏 Length guard choice: ${_label}`, 'info');
  }
  if (_lengthGuardResolve) {
    _lengthGuardResolve(value);
    _lengthGuardResolve = null;
  }
}

// v3.36.15 — Footer length-guard pill is now ALWAYS visible and
// behaves as a two-state toggle. updateLengthGuardIndicator() flips
// the .is-off class plus the label and title text between
// "armed" and "off" depending on window._lengthGuardOverride.
// Called from:
//   • initWorkScreen()           — work screen paint / reload
//   • loadSession() (both paths) — after override flag restore
//   • clearProject()             — explicit reset to false
//   • lengthGuardPrompt callers  — when 'continue_anyway' flips override
//   • toggleLengthGuard helpers  — after every user-driven flip
// Defensive: short-circuits if the indicator element is not yet in DOM
// (e.g. called before the work screen has rendered).
function updateLengthGuardIndicator() {
  const el = document.getElementById('lengthGuardIndicator');
  if (!el) return;
  const labelEl = el.querySelector('.length-guard-indicator-label');
  if (window._lengthGuardOverride) {
    el.classList.add('is-off');
    el.title = 'Length guard is off — click to re-arm';
    if (labelEl) labelEl.textContent = 'Length guard: off';
  } else {
    el.classList.remove('is-off');
    el.title = 'Length guard is armed — click to disable';
    if (labelEl) labelEl.textContent = 'Length guard: armed';
  }
}

// v3.36.15 — Toggle dispatcher wired to the footer pill onclick.
// Routes to _disableLengthGuard (armed → off) or _rearmLengthGuard
// (off → armed). Both paths confirm via wfConfirm() before flipping
// state, then save the session last so the persisted console snapshot
// includes the transition entry (see v3.32.29 #7 fix).
async function toggleLengthGuard() {
  if (window._lengthGuardOverride) {
    await _rearmLengthGuard();
  } else {
    await _disableLengthGuard();
  }
}

// v3.36.15 — Disable path. Confirms, flips override true, logs, toasts,
// saves last.
async function _disableLengthGuard() {
  if (window._lengthGuardOverride) return; // already off — defensive
  const ok = await wfConfirm(
    '📏 Disable length guard?',
    'The length guard will stop blocking rounds and convergence events that exceed your length target. The Hive will continue producing rounds even when the document is over the ceiling or under the floor. You can re-arm it any time from the same pill.',
    { okText: 'Disable guard', cancelText: 'Cancel' }
  );
  if (!ok) return;
  window._lengthGuardOverride = true;
  updateLengthGuardIndicator();
  consoleLog(`📏 Length guard disabled for this project`, 'info');
  toast('📏 Length guard disabled', 3000);
  saveSession();
}

// v3.36.15 — Re-arm path. Confirms, flips override false, logs, toasts,
// saves last. (Replaces the v3.32.28-era body of rearmLengthGuard().)
async function _rearmLengthGuard() {
  if (!window._lengthGuardOverride) return; // already armed — defensive
  const ok = await wfConfirm(
    '📏 Re-arm length guard?',
    'The length guard will resume blocking rounds and convergence events that violate your length target. You can disable it again from the next length-guard prompt if you change your mind.',
    { okText: 'Re-arm guard', cancelText: 'Cancel' }
  );
  if (!ok) return;
  window._lengthGuardOverride = false;
  updateLengthGuardIndicator();
  consoleLog(`📏 Length guard re-armed for this project`, 'info');
  toast('📏 Length guard re-armed', 3000);
  // v3.32.29 — #7 fix. saveSession() last so the persisted console
  // snapshot includes the "re-armed" line.
  saveSession();
}

// v3.36.15 — Backwards-compat alias. Older call sites and any inline
// onclick that may have been cached will route through the toggle
// dispatcher, which preserves the original "click to re-arm" behavior
// when override is true.
async function rearmLengthGuard() {
  return toggleLengthGuard();
}

function setCachedRecommendation(cacheId, model, why, labels, none) {
  if (!cacheId) return;
  // v3.32.10 — cache supports a NONE state (model=null) for the case where
  // the AI explicitly declines to recommend (Builder role: only reasoning
  // variants exist on this endpoint). We persist the `why` so the dropdown
  // can show a meaningful fallback note.
  if (!model && !none) return;
  const key = `waxframe_recommend_${cacheId}`;
  try {
    const payload = none
      ? { ts: Date.now(), model: null, why: why || '', labels: {}, none: true }
      : { ts: Date.now(), model, why, labels: labels || {} };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch(e) { console.warn(`[recommend-cache:${cacheId}] write failed:`, e); }
}

// Core recommendation call. Returns { model, why, labels, cached, none } or null on failure.
// v3.32.10 — accepts a role parameter ('reviewer' | 'builder'). Models list is
// filtered before being sent to the AI based on role. Parser handles single-pick
// RECOMMENDED + RECOMMENDED_WHY format with optional NONE fallback.
async function recommendModel({ cacheId, endpoint, format, key, models, askingModel, role }) {
  if (!cacheId || !models?.length || !askingModel) return null;
  const _role = role === 'builder' ? 'builder' : 'reviewer';

  const cached = getCachedRecommendation(cacheId);
  // v3.32.10 — cached payload now optionally carries `none: true` when the
  // AI explicitly flagged "no safe Builder pick available". We surface that
  // back to callers so the dropdown can render a fallback note instead of
  // silently dropping back to MODEL_FALLBACKS.
  if (cached?.none) {
    return { model: null, why: cached.why || '', labels: {}, cached: true, none: true };
  }
  const cachedHasLabels = cached?.labels && Object.keys(cached.labels).length > 0;
  if (cached && models.includes(cached.model) && cachedHasLabels) {
    return { model: cached.model, why: cached.why, labels: cached.labels, cached: true };
  }

  // v3.32.10 — code-side filter happens BEFORE the AI sees the model list.
  // For Reviewer role: drop only structurally-incompatible models
  // (embeddings, audio-only, code-only, etc). For Builder role: also drop
  // reasoning/thinking variants since they pose envelope risk.
  const filteredModels = filterModelsForRole(models, _role);
  if (!filteredModels.length) {
    // Edge case: every model on the endpoint failed the filter. Cache as NONE
    // so the dropdown can render a helpful fallback note instead of looping.
    const reason = _role === 'builder'
      ? 'No safe Builder pick — all models are reasoning/specialised variants.'
      : 'No usable Reviewer pick — all models are specialised variants.';
    setCachedRecommendation(cacheId, null, reason, {}, true);
    return { model: null, why: reason, labels: {}, cached: false, none: true };
  }
  const droppedCount = models.length - filteredModels.length;
  if (droppedCount > 0) {
    console.info(`[recommend:${cacheId}] code-side filter dropped ${droppedCount} model(s) for role=${_role}.`);
  }

  const promptTemplate = getRecommendationPrompt(_role);
  const prompt = promptTemplate.replace('{MODEL_LIST}', filteredModels.map(m => `- ${m}`).join('\n'));

  let url, headers, body;

  try {
    if (format === 'anthropic') {
      url = endpoint;
      headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
      body = JSON.stringify({ model: askingModel, max_tokens: 300, messages: [{ role: 'user', content: prompt }] });
    } else if (format === 'google') {
      // v3.26.3: use header-based auth (x-goog-api-key) instead of query-string
      // ?key= — matches the production review flow's auth method, more robust
      // against tier behavior differences and CORS quirks.
      url = `https://generativelanguage.googleapis.com/v1beta/models/${askingModel}:generateContent`;
      headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
      body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    } else {
      url = endpoint;
      headers = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;
      body = JSON.stringify({ model: askingModel, messages: [{ role: 'user', content: prompt }] });
    }

    const resp = await fetch(url, { method: 'POST', headers, body });
    if (!resp.ok) {
      // v3.26.3: log status + body so user can diagnose 4xx/5xx without guessing
      let errBody = '';
      try { errBody = await resp.text(); } catch(e) {}
      console.warn(`[recommend] HTTP ${resp.status} ${resp.statusText} from ${url.split('?')[0]} — body:`, errBody.slice(0, 500));
      return null;
    }
    const data = await resp.json();

    let text = '';
    if (format === 'anthropic')   text = data?.content?.[0]?.text || '';
    else if (format === 'google') text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    else                          text = data?.choices?.[0]?.message?.content || '';

    if (!text) {
      console.warn('[recommend] empty response from provider:', data);
      return null;
    }

    // v3.32.10 — single-pick parser. Handles NONE fallback for Builder role
    // when no safe model exists on this endpoint. Reviewer role does not
    // emit NONE in normal usage (we filter only structurally-incompatible
    // models there), but the parser tolerates it for symmetry.
    const recMatch = text.match(/^RECOMMENDED:\s*([^\n\r]+)/im);
    const whyMatch = text.match(/^RECOMMENDED_WHY:\s*([^\n\r]+)/im);

    if (!recMatch) {
      console.warn('[recommend] no RECOMMENDED line in provider response. Raw text:', text);
      return null;
    }

    const cleanId = s => s.trim().replace(/^[`'"*]|[`'"*]$/g, '');
    const rawModel = cleanId(recMatch[1]);
    const why = whyMatch ? cleanId(whyMatch[1]) : '';

    // NONE fallback path — AI explicitly declined to recommend.
    if (/^NONE$/i.test(rawModel)) {
      console.info(`[recommend:${cacheId}] AI returned NONE for role=${_role}: ${why}`);
      setCachedRecommendation(cacheId, null, why, {}, true);
      return { model: null, why, labels: {}, cached: false, none: true };
    }

    // v3.32.10 — defense-in-depth: even though we filtered the list before
    // sending, double-check the AI's pick against the role's disallowed
    // patterns. Catches hallucinated picks that weren't in the filtered list.
    if (NEVER_ALLOWED_PATTERN.test(rawModel)) {
      console.warn(`[recommend:${cacheId}] AI returned structurally-incompatible model "${rawModel}" — rejecting.`);
      return null;
    }
    if (_role === 'builder' && BUILDER_DISALLOWED_PATTERN.test(rawModel)) {
      console.warn(`[recommend:${cacheId}] AI returned reasoning/specialised model "${rawModel}" for Builder — rejecting.`);
      return null;
    }

    if (!filteredModels.includes(rawModel)) {
      console.warn('[recommend] RECOMMENDED model not in fetched/filtered list. Picked:', rawModel, 'Filtered list:', filteredModels);
      return null;
    }

    // Build single-entry labels map for dropdown rendering.
    // Tag is role-derived ('Reviewer' or 'Builder') so the dropdown can
    // distinguish the two recommendations when both apply to one model.
    const tag = _role === 'builder' ? 'Builder' : 'Reviewer';
    const labels = { [rawModel]: { tag, why } };

    setCachedRecommendation(cacheId, rawModel, why, labels);
    return { model: rawModel, why, labels, cached: false };
  } catch(e) {
    console.warn('[recommend] failed:', e);
    return null;
  }
}

// Default-AI wrapper. Called from saveKeyForAI after a key is saved for one
// of the built-in 6. Fetches the provider's model list (or falls back to
// MODEL_FALLBACKS for providers without a /v1/models endpoint like Perplexity),
// asks the provider itself which of those is best, and updates
// API_CONFIGS[provider].model. Returns null silently on any failure — caller
// should leave existing model in place.
async function recommendForDefault(provider) {
  // v3.26.2: try live fetch first, then fall back to MODEL_FALLBACKS for
  // providers that don't expose /v1/models. Perplexity is the canonical
  // case — it has chat completions but no models endpoint, so we still
  // ask it to pick from our hardcoded sonar-* list.
  let models = await fetchModelsForProvider(provider);
  if (!models?.length) {
    models = MODEL_FALLBACKS[provider] || [];
  }
  if (!models.length) return null;
  const cfg = API_CONFIGS[provider];
  if (!cfg?._key) return null;

  // v3.26.4: pick a STABLE askingModel rather than just trusting cfg.model.
  const fallbackList = MODEL_FALLBACKS[provider] || [];
  const stableFallback = fallbackList.find(m => models.includes(m));
  const askingModel = stableFallback
    || (cfg.model && models.includes(cfg.model) ? cfg.model : null)
    || models[0];

  let format = 'openai';
  if (provider === 'claude') format = 'anthropic';
  else if (provider === 'gemini') format = 'google';

  // v3.32.10 — fire BOTH role recommendations in parallel. Reviewer pick uses
  // the soft-preference prompt (allows reasoning models if genuinely best);
  // Builder pick uses the hard-guardrail prompt (rejects reasoning variants
  // due to envelope risk). Two API calls run concurrently so the dropdown
  // can render both ✨ Reviewer and 🔨 Builder markers.
  const baseArgs = { endpoint: cfg.endpoint, format, key: cfg._key, models, askingModel };
  const [reviewerResult, builderResult] = await Promise.all([
    recommendModel({ ...baseArgs, cacheId: `default-${provider}-reviewer`, role: 'reviewer' }),
    recommendModel({ ...baseArgs, cacheId: `default-${provider}-builder`,  role: 'builder'  })
  ]);

  // Return Reviewer-shape for backwards compat with callers that assume a
  // single result. Builder result is cached separately and rendered by the
  // dropdown via getCachedRecommendation('default-${provider}-builder').
  return reviewerResult;
}

// v3.26.1 — manual recheck button handler for default-AI rows. Sits next to
// the model dropdown (moved from the key row in v3.26.3 to disambiguate from
// the Test button). Fires the recommend pipeline force-fresh — both the
// recommendation cache AND the models cache are cleared so the user gets
// truly current data, not stale 7-day-cached lists.
//
// This is the migration path for users whose keys were saved before v3.26.0
// shipped — saveKeyForAI never fired for them, so they're still on the
// hardcoded MODEL_LABELS picks.
async function recheckModelForAI(id) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  const cfg = API_CONFIGS[ai.provider];
  // v3.27.5: customs imported via the Model Server flow store _modelsEndpoint
  // and may legitimately have no API key (Ollama / LM Studio / Open WebUI
  // running without auth). The downstream calls (fetchModelsFromEndpoint
  // and recommendModel) already handle empty key correctly for OpenAI-format,
  // so the only blocker was this early guard. Defaults and customs without
  // _modelsEndpoint still require a key.
  const hasModelsEndpoint = !!cfg?._modelsEndpoint;
  if (!cfg?._key && !hasModelsEndpoint) { toast(`⚠️ ${ai.name} has no API key`); return; }

  const isDefault = !!DEFAULT_AIS.find(d => d.id === id);

  // v3.32.10: clear caches before fetching. Now clears BOTH role caches per
  // provider/AI since v3.32.10 stores Reviewer and Builder picks separately.
  // The legacy single-cache key is also cleared for users migrating up from
  // v3.32.9 or earlier.
  try {
    if (isDefault) {
      localStorage.removeItem(`waxframe_recommend_default-${ai.provider}`); // legacy
      localStorage.removeItem(`waxframe_recommend_default-${ai.provider}-reviewer`);
      localStorage.removeItem(`waxframe_recommend_default-${ai.provider}-builder`);
      localStorage.removeItem(`waxframe_models_${ai.provider}`);
    } else {
      localStorage.removeItem(`waxframe_recommend_custom-${id}`); // legacy
      localStorage.removeItem(`waxframe_recommend_custom-${id}-reviewer`);
      localStorage.removeItem(`waxframe_recommend_custom-${id}-builder`);
      localStorage.removeItem(`waxframe_models_${id}`);
    }
  } catch(e) {}

  const btn = document.getElementById(`recheckbtn-${id}`);
  const origLabel = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Asking…'; }

  toast(`🤖 ${ai.name}: asking for best model…`, 3000);
  const previousModel = cfg.model;

  let result = null;
  try {
    if (isDefault) {
      result = await recommendForDefault(ai.provider);
    } else {
      // v3.27.1: custom AI path. Fetch live model list from the endpoint
      // using the same logic as the Add modal's Fetch Models button. Then
      // call recommendModel directly with custom-{id} cacheId.
      // v3.27.4: prefer cfg._modelsEndpoint (set by Import Server flow) so
      // Open WebUI / Alfredo / non-`/v1/` servers fetch the correct URL
      // instead of the broken derive path.
      const format = cfg.format || 'openai';
      const models = await fetchModelsFromEndpoint(cfg.endpoint, format, cfg._key, cfg._modelsEndpoint);
      if (!models?.length) throw new Error('No chat-compatible models returned');
      // Cache the model list so buildModelSelector renders the full dropdown
      try {
        localStorage.setItem(`waxframe_models_${id}`, JSON.stringify({ ts: Date.now(), models }));
      } catch(e) { console.warn(`[models-cache:${id}] write failed:`, e); }
      // Stable askingModel: prefer cfg.model if it's in the live list,
      // otherwise first in list. No MODEL_FALLBACKS for customs since we
      // don't curate stable models for arbitrary endpoints.
      const askingModel = (cfg.model && models.includes(cfg.model)) ? cfg.model : models[0];
      // v3.32.10 — fire both role-specific recommendations in parallel for
      // custom AIs too. Custom cache keys: custom-{id}-reviewer and
      // custom-{id}-builder. Reviewer result is returned for backwards
      // compat with caller's expectation of a single result.
      const baseArgs = { endpoint: cfg.endpoint, format, key: cfg._key, models, askingModel };
      const [reviewerResult, builderResult] = await Promise.all([
        recommendModel({ ...baseArgs, cacheId: `custom-${id}-reviewer`, role: 'reviewer' }),
        recommendModel({ ...baseArgs, cacheId: `custom-${id}-builder`,  role: 'builder'  })
      ]);
      result = reviewerResult;
    }
  } catch(e) {
    console.warn('[recheck] custom AI fetch failed:', e);
    if (btn) { btn.disabled = false; btn.innerHTML = origLabel; }
    toast(`⚠️ ${ai.name}: ${e.message || 'recommend failed'}`, 6000);
    return;
  }

  if (btn) { btn.disabled = false; btn.innerHTML = origLabel; }

  console.info(`[recheck] ${ai.name}:`, {
    previous: previousModel,
    result,
    isDefault
  });

  if (!result?.model) {
    toast(`⚠️ ${ai.name}: couldn't get a recommendation — model unchanged. Open DevTools console for the raw response.`, 6000);
    return;
  }

  // v3.27.0: always re-render the row after a successful recommend so the
  // dropdown picks up the freshly-cached labels, even when the AI confirms
  // the existing model is still the best pick.
  if (result.model === previousModel) {
    renderAIRow(id);
    toast(`✓ ${ai.name}: ${result.model} — already the recommended pick${result.why ? '. ' + result.why : ''}`, 6000);
    return;
  }

  cfg.model = result.model;
  saveSettings();
  renderAIRow(id);
  toast(`✨ ${ai.name}: switched to ${result.model}${result.why ? ' — ' + result.why : ''}`, 6000);
}

// v3.26.1 — first-load migration. Runs ONCE per session after the hive is
// loaded. Iterates default AIs that have a saved key but no cached
// recommendation, and silently fires recommendForDefault for each in
// parallel. Updates the model and re-renders the row when each completes.
//
// This makes existing users (who had keys saved before v3.26.0 shipped) get
// migrated to live-recommend models the next time they open the app —
// without having to manually click 🤖 on every row.
//
// Silent on failure. No toast spam. Console logs only.
async function migrateRecommendOnStartup() {
  if (window._waxframeMigrationRan) return;
  window._waxframeMigrationRan = true;

  const candidates = aiList.filter(ai => {
    if (!DEFAULT_AIS.find(d => d.id === ai.id)) return false; // defaults only
    const cfg = API_CONFIGS[ai.provider];
    if (!cfg?._key) return false; // needs a key
    // v3.26.2: accept providers without a /v1/models endpoint as long as we
    // have a hardcoded MODEL_FALLBACKS list to feed the recommend call.
    // Perplexity is the canonical case — chat completions work, but no
    // models endpoint exists, so we use the sonar-* fallback list.
    const hasDynamicEndpoint = MODEL_FILTERS[ai.provider] !== null;
    const hasFallbackList = MODEL_FALLBACKS[ai.provider]?.length > 0;
    if (!hasDynamicEndpoint && !hasFallbackList) return false;
    // Skip if we already have a cached recommendation
    const cached = getCachedRecommendation(`default-${ai.provider}`);
    return !cached;
  });

  if (!candidates.length) return;

  console.info(`[recommend-migrate] checking ${candidates.length} default AIs for live recommendations…`);

  let changed = 0;
  await Promise.all(candidates.map(async (ai) => {
    try {
      const result = await recommendForDefault(ai.provider);
      const cfg = API_CONFIGS[ai.provider];
      if (result?.model && cfg && result.model !== cfg.model) {
        cfg.model = result.model;
        changed++;
        renderAIRow(ai.id);
        console.info(`[recommend-migrate] ${ai.name}: ${result.model} — ${result.why}`);
      }
    } catch(e) {
      console.warn(`[recommend-migrate] ${ai.name} failed:`, e);
    }
  }));

  if (changed > 0) {
    saveSettings();
    toast(`✨ Updated ${changed} model${changed === 1 ? '' : 's'} to current provider recommendations`, 5000);
  } else {
    console.info('[recommend-migrate] no model changes');
  }
}

// Internal helper called automatically after a successful Fetch Models.
// Uses the currently fetched models in the dropdown to ask the provider
// which model is the Best/Fastest/Budget pick for document refinement,
// then annotates the dropdown options accordingly. Replaces the prior
// button-driven `recommendCustomAIModel()` — re-poll lives on the main
// screen, not in the Add a Custom Worker Bee modal.
async function _autoRecommendCustomAI() {
  const urlInput  = document.getElementById('customAIUrl');
  const fmtSelect = document.getElementById('customAIFormat');
  const keyInput  = document.getElementById('customAIKey');
  const selectEl  = document.getElementById('customAIModelSelect');

  if (!urlInput || !selectEl) return;

  const url = urlInput.value.trim();
  const format = fmtSelect.value;
  const key = keyInput.value.trim();

  if (!url || selectEl.style.display === 'none' || !selectEl.options.length) {
    return;
  }

  // Only consider models that aren't disabled (already-in-hive ones are skipped)
  const models = Array.from(selectEl.options)
    .filter(o => !o.disabled && o.value)
    .map(o => o.value);

  if (!models.length) return;

  const askingModel = selectEl.value && !selectEl.options[selectEl.selectedIndex]?.disabled
    ? selectEl.value
    : models[0];

  // Visible loading state — disable dropdown so user can't pick mid-flight
  selectEl.disabled = true;

  toast(`🤖 Asking provider for recommendation…`, 3000);

  const result = await recommendModel({
    cacheId: url.replace(/\/+$/, ''),
    endpoint: url,
    format,
    key,
    models,
    askingModel
  });

  selectEl.disabled = false;

  if (result?.model) {
    selectEl.value = result.model;
    if (result.labels) annotateCustomAIDropdown(result.labels, result.model);
    const cachedTag = result.cached ? ' (cached)' : '';
    toast(`✨ ${result.model}${cachedTag}${result.why ? ' — ' + result.why : ''}`, 7000);
  } else {
    // Quiet failure — dropdown is still populated, user can pick manually.
    toast('⚠️ Provider didn\'t return a clean recommendation — pick a model manually', 5000);
  }
}

// v3.29.5 — Re-render customAIModelSelect <option> labels with tag info
// returned from a successful recommendModel() call. Mirrors the formatting
// in buildModelSelector() so the custom-AI flow shows the same ✨ Best /
// ⚡ Fastest / 💰 Budget annotations as the built-in flow. Disabled
// already-in-hive options are left untouched.
function annotateCustomAIDropdown(labels, recommendedModel) {
  const selectEl = document.getElementById('customAIModelSelect');
  if (!selectEl || !labels) return;
  const iconForTag = (tagStr) => {
    if (!tagStr) return '';
    const map = { 'Fastest': '⚡', 'Budget': '💰' };
    return tagStr.split(' · ').map(t => map[t] || '').filter(Boolean).join(' ');
  };
  Array.from(selectEl.options).forEach(opt => {
    if (opt.disabled) return; // already-in-hive entries — leave their "✓ … already in hive" suffix alone
    const m = opt.value;
    const lbl = labels[m];
    if (!lbl) {
      opt.textContent = m; // bare id for un-tagged models
      return;
    }
    const icons = iconForTag(lbl.tag);
    const iconPart = icons ? `${icons} ` : '';
    const baseDisplay = `${iconPart}${m} — ${lbl.tag}`;
    opt.textContent = m === recommendedModel ? `✨ ${baseDisplay}` : baseDisplay;
  });
}

// ── v3.25.7 / v3.26.1: Custom AI decision aids (Recommend + Browse models) ──
// Both aids only make sense AFTER Fetch Models has populated the dropdown:
// - 🤖 Recommend has nothing to ask about until there's a model list
// - ↗ Browse models is contextual — visible only for known Quick Add presets
//   that declare a chooseModelLink
// The aids row container is toggled when EITHER aid is showable, individual
// aids are toggled by their own logic. v3.26.1 moved the aids out of the
// model input wrap onto their own row to fix a flex-squashing bug.
// v3.29.9 — Recommend a Model button removed; this function now only
// manages the Browse-models-on-website link visibility.
function updateModelAids() {
  const aidsRow  = document.getElementById('customAIModelAids');
  const link     = document.getElementById('customAIChooseModelLink');
  const selectEl = document.getElementById('customAIModelSelect');
  if (!aidsRow || !link || !selectEl) return;

  const hasFetched = selectEl.style.display !== 'none' && selectEl.options.length > 0;

  // Browse models: shown when fetched AND we have a chooseModelLink
  const url = document.getElementById('customAIUrl')?.value || '';
  const preset = getActivePreset(url);
  const target = preset?.chooseModelLink;
  if (hasFetched && target) {
    link.href = target;
    link.classList.add('is-visible');
  } else {
    link.classList.remove('is-visible');
    link.removeAttribute('href');
  }

  // The aids row is visible if the link is visible
  if (link.classList.contains('is-visible')) {
    aidsRow.classList.add('is-visible');
  } else {
    aidsRow.classList.remove('is-visible');
  }
}

// Back-compat shims: older code paths still call these names; redirect to
// the unified updater so everything stays in sync.
function updateChooseModelLink() { updateModelAids(); }
function updateRecommendBtn()    { updateModelAids(); }

function applyQuickAdd(value) {
  resetModelField();

  const keyLink = document.getElementById('customAIKeyLink');
  const helpLink = document.getElementById('customAIProviderHelpLink');
  const urlInput  = document.getElementById('customAIUrl');
  const fmtSelect = document.getElementById('customAIFormat');
  const nameInput = document.getElementById('customAIName');

  if (!value) {
    if (keyLink)  keyLink.style.display = 'none';
    if (helpLink) helpLink.style.display = 'none';
    const consoleInput = document.getElementById('customAIConsoleUrl');
    if (consoleInput && !consoleInput.dataset.userTyped) consoleInput.value = '';
    const docsInput = document.getElementById('customAIDocsUrl');
    if (docsInput && !docsInput.dataset.userTyped) docsInput.value = '';
    updateChooseModelLink();
    return;
  }

  const preset = QUICK_ADD_PROVIDERS[value];
  if (!preset) { updateChooseModelLink(); return; }

  // v3.56.6 — pre-fill API Console URL + Docs URL from the preset (the
  // troubleshooting card reads ai.apiConsole / ai.apiDocs). Don't clobber a
  // value the user typed themselves.
  const consoleInput = document.getElementById('customAIConsoleUrl');
  if (consoleInput && !consoleInput.dataset.userTyped) consoleInput.value = preset.keyLink || '';
  const docsInput = document.getElementById('customAIDocsUrl');
  if (docsInput && !docsInput.dataset.userTyped) docsInput.value = preset.chooseModelLink || '';

  if (urlInput)  { urlInput.value = preset.url; }
  if (fmtSelect) fmtSelect.value = preset.format;
  if (nameInput) { nameInput.value = preset.name; nameInput.dataset.userTyped = 'true'; }

  if (keyLink) {
    if (preset.keyLink) {
      keyLink.href = preset.keyLink;
      keyLink.textContent = preset.keyLinkLabel;
      keyLink.style.display = '';
    } else {
      keyLink.style.display = 'none';
    }
  }

  // v3.29.8 — provider docs help link. Shows the chooseModelLink (model
  // catalog / docs) for the selected preset. Hides if the preset doesn't
  // have one (none currently lack it, but defensive in case future
  // presets are added without docs).
  if (helpLink) {
    if (preset.chooseModelLink) {
      helpLink.href = preset.chooseModelLink;
      helpLink.textContent = `📖 ${preset.name} docs →`;
      helpLink.style.display = '';
    } else {
      helpLink.style.display = 'none';
    }
  }

  updateChooseModelLink();
  // v3.29.11 — refresh the live icon preview now that name/model may have
  // changed via the preset. Picking "Mistral" from Quick Add → Mistral
  // icon shows in the preview box immediately.
  refreshCustomAIIconPreview();
}

function resetModelField() {
  const textInput   = document.getElementById('customAIModel');
  const selectEl    = document.getElementById('customAIModelSelect');
  const fetchBtn    = document.getElementById('customAIFetchModelsBtn');
  if (textInput)  { textInput.value = ''; textInput.style.display = ''; }
  if (selectEl)   { selectEl.style.display = 'none'; selectEl.innerHTML = ''; }
  if (fetchBtn)   { fetchBtn.textContent = 'Fetch Models'; fetchBtn.disabled = false; }
  updateRecommendBtn();
}

// v3.27.1: extracted from fetchCustomAIModels so the Custom-AI recheck flow
// can reuse the same model-fetching logic without going through the Add modal
// form fields. Returns a string array of chat-compatible model ids, or throws
// on any failure (caller handles UI feedback).
async function fetchModelsFromEndpoint(url, format, key, explicitModelsEndpoint = null) {
  let modelsEndpoint, headers;
  if (format === 'anthropic') {
    modelsEndpoint = 'https://api.anthropic.com/v1/models';
    headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  } else if (format === 'google') {
    // v3.53.0 — API key moved from query string to header. Generate calls
    // already used 'x-goog-api-key' (see api.js headersFn); model-list path
    // was the outlier. Query-string secrets leak into browser history,
    // server logs, and screenshots — header doesn't.
    modelsEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100`;
    headers = { 'x-goog-api-key': key };
  } else {
    // v3.27.4: prefer the explicit modelsEndpoint stored on the AI config
    // (set by Import Server flow). Falls back to deriving `${base}/v1/models`
    // for legacy custom AIs that only stored a chat URL. The derive path
    // breaks for Open WebUI / Alfredo (`/api/...` paths) — explicit URL fixes.
    if (explicitModelsEndpoint) {
      modelsEndpoint = explicitModelsEndpoint;
    } else {
      const base = url.replace(/\/$/, '').replace(/\/v1\/.*$/, '');
      modelsEndpoint = `${base}/v1/models`;
    }
    headers = key ? { 'Authorization': `Bearer ${key}` } : {};
  }
  const resp = await fetch(modelsEndpoint, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  let models = [];
  if (format === 'anthropic') {
    models = (data?.data || []).map(m => m.id);
  } else if (format === 'google') {
    models = (data?.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
  } else {
    models = (data?.data || []).map(m => m.id).sort();
  }
  // Same structural-only filter the default 6 use
  models = models.filter(m => !STRUCTURAL_NON_CHAT_RE.test(m));
  // v3.32.11 — dedup. Mistral's /v1/models endpoint returns duplicate ids
  // (mistral-large-2512, mistral-large-latest, voxtral-mini-2507, etc. all
  // appear twice). Set preserves insertion order so first occurrence wins.
  models = [...new Set(models)];
  return models;
}

async function fetchCustomAIModels() {
  const url    = document.getElementById('customAIUrl').value.trim();
  const format = document.getElementById('customAIFormat').value;
  const key    = document.getElementById('customAIKey').value.trim();
  const fetchBtn  = document.getElementById('customAIFetchModelsBtn');
  const textInput = document.getElementById('customAIModel');
  const selectEl  = document.getElementById('customAIModelSelect');

  if (!url || !url.startsWith('http')) { toast('⚠️ Enter a URL first'); return; }

  fetchBtn.textContent = '…';
  fetchBtn.disabled = true;

  try {
    let modelsEndpoint, headers;
    if (format === 'anthropic') {
      modelsEndpoint = 'https://api.anthropic.com/v1/models';
      headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
    } else if (format === 'google') {
      // v3.53.0 — API key moved from query string to header (see comment
      // in fetchModelsFromEndpoint above).
      modelsEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100`;
      headers = { 'x-goog-api-key': key };
    } else {
      const base = url.replace(/\/$/, '').replace(/\/v1\/.*$/, '');
      modelsEndpoint = `${base}/v1/models`;
      headers = key ? { 'Authorization': `Bearer ${key}` } : {};
    }

    const resp = await fetch(modelsEndpoint, { headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    let models = [];
    if (format === 'anthropic') {
      models = (data?.data || []).map(m => m.id);
    } else if (format === 'google') {
      models = (data?.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
    } else {
      models = (data?.data || []).map(m => m.id).sort();
    }

    if (!models.length) throw new Error('No models returned');

    // ── v3.25.6: filter non-chat models ────────────────────────────────────
    // Strip embeddings, moderation, speech, audio, real-time, image-gen,
    // reranking models — none are valid Hive reviewers. Track count for
    // the toast so users know we did something on their behalf.
    const rawCount = models.length;
    models = models.filter(m => !NON_CHAT_RE.test(m));
    // v3.32.11 — dedup. Mistral and some self-hosted servers return duplicate
    // ids; Set preserves insertion order so first occurrence wins.
    models = [...new Set(models)];
    const filteredOutCount = rawCount - models.length;
    if (!models.length) throw new Error('No chat-compatible models returned (all results were embeddings/audio/image)');

    // ── #11: already-in-hive markers ───────────────────────────────────────
    // Don't filter already-added models out of the dropdown — that creates the
    // "wait, where's the model I added yesterday?" confusion. Instead show
    // them disabled with a clear "✓ already in your hive" suffix so the user
    // can SEE what's already there and pick something genuinely new.
    // Match by chat-completions endpoint URL (trailing-slash normalized).
    const norm = u => (u || '').replace(/\/+$/, '');
    const targetUrl = norm(url);
    const existingForThisUrl = new Set(
      aiList
        .filter(ai => norm(API_CONFIGS[ai.provider]?.endpoint) === targetUrl)
        .map(ai => API_CONFIGS[ai.provider]?.model)
        .filter(Boolean)
    );
    const inHiveCount = models.filter(m => existingForThisUrl.has(m)).length;
    const availCount  = models.length - inHiveCount;

    // Switch to dropdown — already-in-hive entries stay visible but disabled
    selectEl.innerHTML = models.map(m => {
      if (existingForThisUrl.has(m)) {
        return `<option value="${esc(m)}" disabled>✓ ${esc(m)} — already in your hive</option>`;
      }
      return `<option value="${esc(m)}">${esc(m)}</option>`;
    }).join('');

    // ── v3.25.6: smart default selection ───────────────────────────────────
    // 1. If the user came in via a Quick Add preset AND that preset declares
    //    a defaultModel that exists in the available list, select THAT
    //    instead of letting alphabetical order pick. Prevents the "I added
    //    Mistral and got codestral-2508 by default" footgun.
    // 2. Otherwise fall back to first available model.
    const preset = getActivePreset(url);
    const presetDefault = preset?.defaultModel;
    const presetMatch = (presetDefault && !existingForThisUrl.has(presetDefault) && models.includes(presetDefault))
      ? presetDefault
      : null;
    const firstAvailable = models.find(m => !existingForThisUrl.has(m));
    const initialPick = presetMatch || firstAvailable;
    if (initialPick) selectEl.value = initialPick;

    textInput.style.display = 'none';
    selectEl.style.display = '';
    fetchBtn.textContent = '↺ Refresh';
    fetchBtn.disabled = false;
    updateRecommendBtn();

    // Compose the toast — most informative first
    if (availCount === 0) {
      toast(`⚠️ All ${models.length} models from this endpoint are already in your hive`, 6000);
    } else {
      const parts = [`✅ ${availCount} loaded`];
      if (inHiveCount > 0)      parts.push(`${inHiveCount} already in hive`);
      if (filteredOutCount > 0) parts.push(`${filteredOutCount} non-chat skipped`);
      if (presetMatch)          parts.push(`default: ${presetMatch}`);
      toast(parts.join(' · '), filteredOutCount > 0 || presetMatch ? 5000 : 3000);
    }

    // v3.29.8 — auto-recommend after a successful fetch. Fetch already
    // proved the URL works and the API key is valid (we got a model list
    // back), so the only thing left is to ask the provider which model
    // is the best/fastest/cheapest pick for document refinement. Skip if
    // there are no available (non-already-in-hive) models since there's
    // nothing to recommend, and skip on Anthropic/Google because their
    // flows don't go through the OpenAI-compatible recommend path. The
    // recommend call is fire-and-forget; if it fails we just leave the
    // dropdown un-annotated and the user can still pick manually or hit
    // the Recommend a Model button to retry.
    if (availCount > 0 && format === 'openai') {
      // Don't await — let the toast above show first, then quietly run
      // the recommend in the background. _autoRecommendCustomAI handles
      // its own loading state and posts a toast on result.
      _autoRecommendCustomAI();
    }

  } catch(e) {
    fetchBtn.textContent = 'Fetch Models';
    fetchBtn.disabled = false;
    // v3.29.8 — humanize the error toast. Previously we just showed the
    // raw `e.message` which surfaced "HTTP 401" or "NetworkError when
    // attempting to fetch" — useless to a non-developer. Route through
    // the classifier the import-server-modal uses, with the appropriate
    // ctx so MODELS_ENDPOINT_AUTH / PATH_NOT_FOUND / SERVER_ERROR /
    // NO_MODELS catalog entries can match. The classifier returns a
    // catalog entry with `meaning` written for humans.
    const httpMatch = String(e.message || '').match(/HTTP (\d+)/);
    const ctx = httpMatch
      ? { kind: 'models_endpoint', status: parseInt(httpMatch[1], 10) }
      : (e.message === 'No models returned' || e.message?.startsWith('No chat-compatible'))
        ? { kind: 'models_endpoint', status: 'no_models' }
        : { kind: 'models_endpoint' };
    const entry = WF_DEBUG.classify(e, ctx);
    toast(`⚠️ ${entry.title} — ${entry.meaning}`, 8000);
  }
}


function addCustomAI() {
  const url    = document.getElementById('customAIUrl').value.trim();
  const format = document.getElementById('customAIFormat').value;
  const key    = document.getElementById('customAIKey').value.trim();
  const modelSelect = document.getElementById('customAIModelSelect');
  const model  = (modelSelect && modelSelect.style.display !== 'none' ? modelSelect.value : document.getElementById('customAIModel').value.trim()) || 'default';
  let   name   = document.getElementById('customAIName').value.trim();

  if (!url || !url.startsWith('http')) { toast('⚠️ Enter a valid URL starting with http'); return; }

  // Auto-detect name from URL if not provided
  if (!name) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
      name = hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch(e) { name = 'Custom AI'; }
  }

  const id     = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  const origin = (() => { try { return new URL(url).origin; } catch(e) { return url; } })();
  // v3.29.13 — read whatever icon the preview is currently showing. This
  // is the source of truth: if preview shows the user's upload (data URL),
  // we persist that; if it shows a catalog match (e.g. images/icon-mistral.png),
  // we persist that path; if neither, we fall through to the favicon proxy
  // (which resolveAiIcon will downgrade to the colored letter avatar).
  // Earlier code only handled the user-upload case via read(), which is why
  // catalog-matched previews showed Mistral in the modal but persisted as
  // the favicon-proxy URL after Add to Hive.
  const previewIcon = wfIconUpload.readAny({
    previewId:     'customAIIconPreview',
    previewWrapId: 'customAIIconWrap'
  });
  // v3.30.2 — fallback dropped from external favicon URL to local generic
  // icon. Air-gapped deployments now never reach for an external CDN even
  // when a user adds a custom AI without picking an icon.
  const icon   = previewIcon || GENERIC_ICON_PATH;
  const ai     = { id, name, url, icon, provider: id };

  // v3.56.6 — API Console URL (billing/usage) + Docs URL. Manual field wins;
  // otherwise fall back to a matched Quick Add preset (keyLink = console,
  // chooseModelLink = docs). apiConsole powers the troubleshooting card's
  // "Open provider console" button; apiDocs powers "Open provider docs".
  const _preset      = (typeof getActivePreset === 'function') ? getActivePreset(url) : null;
  const _consoleVal  = (document.getElementById('customAIConsoleUrl')?.value || '').trim();
  const _docsVal     = (document.getElementById('customAIDocsUrl')?.value || '').trim();
  const _apiConsole  = _consoleVal || _preset?.keyLink || '';
  const _apiDocs     = _docsVal    || _preset?.chooseModelLink || '';
  if (_apiConsole) ai.apiConsole = _apiConsole;
  if (_apiDocs)    ai.apiDocs    = _apiDocs;

  // Build API config based on selected format
  const baseConfigs = {
    openai: {
      // v3.27.5: omit Authorization when key is empty (see addImportServerModels for full rationale)
      headersFn: k => {
        const h = { 'Content-Type': 'application/json' };
        if (k) h['Authorization'] = `Bearer ${k}`;
        return h;
      },
      bodyFn: (m, prompt) => JSON.stringify({ model: m, messages: [{ role: 'user', content: prompt }] }),
      extractFn: d => d?.choices?.[0]?.message?.content || ''
    },
    anthropic: {
      headersFn: k => ({ 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
      bodyFn: (m, prompt) => JSON.stringify({ model: m, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
      extractFn: d => d?.content?.[0]?.text || ''
    },
    google: {
      headersFn: k => ({ 'Content-Type': 'application/json', 'x-goog-api-key': k }),
      bodyFn: (m, prompt) => JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      extractFn: d => d?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }
  };

  const formatLabels = { openai: 'OpenAI compatible', anthropic: 'Anthropic', google: 'Google' };
  const base = baseConfigs[format] || baseConfigs.openai;

  API_CONFIGS[id] = {
    label: name,
    model,
    // v3.30.2 — capture the originally-picked model. The Reset button
    // that consumed this field was removed in v3.31.0 (Best/Fast/Budget
    // buttons replaced it); _originalModel is still captured at add
    // time as forward-compatibility scaffold for any future audit-trail
    // feature, but no current UI surfaces it.
    _originalModel: model,
    endpoint: url.replace(/\/$/, ''),
    note: `Format: ${formatLabels[format] || 'OpenAI compatible'} · Model: ${model}`,
    // v3.27.1: store format so recheckModelForAI can rebuild the recommend
    // call without going through the Add modal form fields.
    format,
    ...base
  };
  if (key) API_CONFIGS[id]._key = key;

  // v3.27.2: persist the model list from the modal's dropdown (populated by
  // fetchCustomAIModels) into the same localStorage cache the worker bee row
  // uses (`waxframe_models_${id}`). Without this, the post-add row had NO
  // model dropdown AND NO Recommend button — buildModelSelector returned ''
  // because getModelsForProvider had nothing to return for the new id.
  try {
    const modelOptions = modelSelect && modelSelect.style.display !== 'none'
      ? Array.from(modelSelect.options).filter(o => o.value && !o.disabled).map(o => o.value)
      : [model]; // fallback: at least cache the single model the user typed
    if (modelOptions.length) {
      localStorage.setItem(`waxframe_models_${id}`, JSON.stringify({ ts: Date.now(), models: modelOptions }));
    }
  } catch(e) { console.warn('[addCustomAI] failed to cache model list:', e); }

  aiList.push(ai);
  activeAIs.push(ai);

  // Close modal and clear form
  document.getElementById('addCustomAIModal').classList.remove('active');
  document.getElementById('customAIName').value   = '';
  document.getElementById('customAIUrl').value    = '';
  document.getElementById('customAIKey').value    = '';
  document.getElementById('customAIFormat').value = 'openai';
  document.getElementById('customAIModel').value  = '';
  document.getElementById('customAIQuickAdd').value = '';
  const kl = document.getElementById('customAIKeyLink');
  if (kl) kl.style.display = 'none';
  resetModelField();

  renderAISetupGrid();
  saveHive();
  toast(`🐝 ${name} added to the hive`);
}

// ── IMPORT FROM MODEL SERVER ──

const IMPORT_SERVER_PRESETS = {
  openwebui: {
    name:           'Open WebUI',
    chatEndpoint:   url => url.replace(/\/$/, '') + '/api/chat/completions',
    modelsEndpoint: url => url.replace(/\/$/, '') + '/api/models'
  },
  ollama: {
    name:           'Ollama',
    chatEndpoint:   url => url.replace(/\/$/, '') + '/v1/chat/completions',
    modelsEndpoint: url => url.replace(/\/$/, '') + '/api/tags'
  },
  lmstudio: {
    name:           'LM Studio',
    chatEndpoint:   url => url.replace(/\/$/, '') + '/v1/chat/completions',
    modelsEndpoint: url => url.replace(/\/$/, '') + '/v1/models'
  }
};

let _importServerModels   = [];
let _importServerPreset   = null;

// v3.30.2 — Per-row icon overrides for the Import Server checklist. Indexed
// by row number (matches `isc-${i}` checkbox ids). Populated in
// renderImportServerChecklist() via _CATALOG smart-match against each model
// id; user can override per row via openIconPickerForImportRow(). Cleared on
// modal close. Read by addImportServerModels() so each new bee carries its
// own assigned icon, not a single group-wide one.
let _importRowIcons = [];

// Generic fallback icon path. Kept in sync with the GENERIC_ICON inside
// wfIconUpload — used by the Import Server icon column for rows where no
// catalog match exists yet.
const GENERIC_ICON_PATH = 'images/icon-generic.png';

// Timestamp ticker state — hoisted up here so closeImportServerModal() can safely
// call stopImportTimestampTicker() which reassigns _importFetchedAt = null.
// `let` declarations are block-scoped and not hoisted, so these MUST appear before
// any function that reads or writes them.
let _importFetchedAt = null;
let _importTimestampInterval = null;
let _importAvailableCount = 0;
let _importInHiveCount = 0;

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5)    return 'just now';
  if (s < 60)   return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function startImportTimestampTicker() {
  stopImportTimestampTicker();
  _importTimestampInterval = setInterval(() => {
    const el = document.getElementById('importChecklistTimestamp');
    if (el && _importFetchedAt) el.textContent = `Fetched ${formatRelativeTime(_importFetchedAt)}`;
  }, 5000);
}

function stopImportTimestampTicker() {
  if (_importTimestampInterval) {
    clearInterval(_importTimestampInterval);
    _importTimestampInterval = null;
  }
}

const IMPORT_SERVER_LS_KEY = 'waxframe_import_server_defaults';
const IS_LOCAL_RUNTIME = (typeof location !== 'undefined' && location.protocol === 'file:');

function saveImportServerDefaults(chatUrl, modelsUrl, apiKey, icon) {
  try {
    // v3.29.11 — `icon` is an optional 256×256 PNG data URL from the
    // shared uploader. Stored alongside the URLs so re-opens of the
    // import-server modal restore the icon, and the "Forget saved
    // server" path also wipes it.
    const payload = JSON.stringify({ chatUrl, modelsUrl, apiKey, icon: icon || null });
    localStorage.setItem(IMPORT_SERVER_LS_KEY, payload);
    // Immediate read-back verification — catches silent quota / permission issues
    // that don't throw but still fail to persist the value.
    const verify = localStorage.getItem(IMPORT_SERVER_LS_KEY);
    if (verify !== payload) {
      console.error('[import-server] localStorage write did not persist', { expected: payload, got: verify });
      toast('⚠️ Could not save server for next time (localStorage issue)');
    }
  } catch(e) {
    console.error('[import-server] Failed to save defaults to localStorage:', e);
    toast('⚠️ Could not save server for next time: ' + (e.name || 'unknown error'));
  }
}

function loadImportServerDefaults() {
  try {
    const raw = localStorage.getItem(IMPORT_SERVER_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) {
    console.error('[import-server] Failed to load defaults from localStorage:', e);
    return null;
  }
}

function clearImportServerDefaults() {
  try { localStorage.removeItem(IMPORT_SERVER_LS_KEY); }
  catch(e) { console.error('[import-server] Failed to clear defaults:', e); }
}

function forgetImportServerDefaults() {
  clearImportServerDefaults();
  const chatEl   = document.getElementById('importServerChatUrl');
  const modelsEl = document.getElementById('importServerUrl');
  const keyEl    = document.getElementById('importServerKey');
  if (chatEl)   chatEl.value   = '';
  if (modelsEl) modelsEl.value = '';
  if (keyEl)    keyEl.value    = '';
  const innerModal = getImportServerInnerModal();
  if (innerModal) innerModal.classList.remove('has-saved-key');
  setImportServerState('prefetch');
  toast('🗑️ Forgot saved server');
}

// v3.32.15 — Server-icon preset picker. Each preset button in the Import
// Server modal carries its icon path in data-icon. On click, we feed that
// path through wfIconUpload.set() so the existing preview-box machinery
// updates exactly as if the user had uploaded that icon. The preview path
// is what addImportServerModels() reads at submit time via readAny(), so
// no other plumbing needs to change. Visual selection state on the preset
// row mirrors the choice for clarity (kept in sync with manual uploads via
// onChange in the existing wfIconUpload.attach call).
function selectImportServerIconPreset(btn) {
  if (!btn) return;
  const iconPath = btn.dataset.icon;
  if (!iconPath) return;
  const opts = {
    fileInputId:   'importServerIconFileInput',
    previewId:     'importServerIconPreview',
    previewWrapId: 'importServerIconWrap',
    clearBtnId:    'importServerIconClearBtn',
    uploadBtnId:   'importServerIconUploadBtn'
  };
  wfIconUpload.set(opts, iconPath);
  highlightImportServerIconPreset(iconPath);
}

// Visually mark which preset (if any) matches the current preview src.
// Called both from selectImportServerIconPreset() and after manual
// uploads/clears so the preset row stays consistent with the preview.
function highlightImportServerIconPreset(iconPath) {
  const presets = document.querySelectorAll('#importServerIconPresets .import-server-icon-preset');
  presets.forEach(p => {
    if (iconPath && p.dataset.icon === iconPath) {
      p.classList.add('is-selected');
    } else {
      p.classList.remove('is-selected');
    }
  });
}

// The outer overlay has id="importServerModal" while the inner modal has class
// ".import-server-modal" — state classes and has-saved-key live on the INNER modal
// so the existing CSS selectors (e.g. .import-server-modal.import-server-state-ready)
// match correctly. Always go through this helper; never use getElementById for that.
function getImportServerInnerModal() {
  return document.querySelector('#importServerModal .import-server-modal');
}

function setImportServerState(state) {
  // state: 'prefetch' | 'loading' | 'ready' | 'error'
  // 'loading' is transient — used between modal open and auto-fetch completion
  // to suppress all middle/right-column content so nothing flashes.
  const modal = getImportServerInnerModal();
  if (!modal) return;
  modal.classList.remove('import-server-state-prefetch', 'import-server-state-loading', 'import-server-state-ready', 'import-server-state-error');
  // Any state change resets the laptop-only "show raw instead of checklist" modifier
  modal.classList.remove('import-server-raw-visible');
  modal.classList.add(`import-server-state-${state}`);
  const toggleBtn = document.getElementById('importServerRawToggle');
  if (toggleBtn) toggleBtn.textContent = '📋 View raw response';
}

// Laptop-tier only: in ready state the raw response hides behind a toggle so the
// checklist can use cols 2+3. This flips which pane is visible in the right region.
function toggleImportServerRawPane() {
  const modal = getImportServerInnerModal();
  if (!modal) return;
  modal.classList.toggle('import-server-raw-visible');
  const visible = modal.classList.contains('import-server-raw-visible');
  const toggleBtn = document.getElementById('importServerRawToggle');
  if (toggleBtn) toggleBtn.textContent = visible ? '← Back to models' : '📋 View raw response';
}

function populateImportServerQuickAdd() {
  const sel = document.getElementById('importServerQuickAdd');
  if (!sel) return;
  const opts = [
    { value: '',          label: '— Select a known server or fill in manually —' },
    { value: 'openwebui', label: 'Open WebUI — /api/chat/completions & /api/models' }
  ];
  // Local-only presets are hidden on hosted (https) runtime due to mixed-content blocking
  if (IS_LOCAL_RUNTIME) {
    opts.push({ value: 'ollama',   label: 'Ollama (local) — http://localhost:11434' });
    opts.push({ value: 'lmstudio', label: 'LM Studio (local) — http://localhost:1234' });
  }
  sel.innerHTML = opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
}

function updateImportServerRuntimeNote() {
  const el = document.getElementById('importServerRuntimeNote');
  if (!el) return;
  if (IS_LOCAL_RUNTIME) {
    el.textContent = `Runtime: local file (file://) — Open WebUI, Ollama, and LM Studio are all usable.`;
  } else {
    el.textContent = `Runtime: hosted (https://) — only https endpoints can be reached. Local presets (Ollama, LM Studio) are hidden because browsers block http://localhost from a secure page.`;
  }
  el.classList.add('visible');
}

function onImportServerKeyInput() {
  // Any typing in the key field clears the "saved key" indicator — the user is overriding
  const innerModal = getImportServerInnerModal();
  if (innerModal) innerModal.classList.remove('has-saved-key');
  resetImportServer();
}

function showImportServerModal() {
  const overlay = document.getElementById('importServerModal');

  // Populate Quick Add options (filtered by runtime) and runtime note
  populateImportServerQuickAdd();
  updateImportServerRuntimeNote();

  // Initialize state to prefetch BEFORE revealing the modal, so no stray panes
  // (raw response, placeholder, etc.) flash during the brief gap between overlay
  // activation and the fetch completing.
  resetImportServer(true);

  // Populate fields from last-used server if saved
  const saved    = loadImportServerDefaults();
  const chatEl   = document.getElementById('importServerChatUrl');
  const modelsEl = document.getElementById('importServerUrl');
  const keyEl    = document.getElementById('importServerKey');
  if (saved) {
    if (chatEl)   chatEl.value   = saved.chatUrl   || '';
    if (modelsEl) modelsEl.value = saved.modelsUrl || '';
    if (keyEl)    keyEl.value    = saved.apiKey    || '';
    if (saved.apiKey) {
      const innerModal = getImportServerInnerModal();
      if (innerModal) innerModal.classList.add('has-saved-key');
    }
  }

  // v3.29.11 — wire icon uploader. If the saved server config had an icon,
  // restore it; otherwise start empty. The uploader's onChange callback
  // doesn't need to fire here — we read() it on submit to grab the
  // current data URL.
  // v3.32.15 — onChange now keeps the preset row's selection state in sync
  // with whatever the preview currently shows (preset click, manual upload,
  // or clear all funnel through here).
  wfIconUpload.attach({
    fileInputId:   'importServerIconFileInput',
    previewId:     'importServerIconPreview',
    previewWrapId: 'importServerIconWrap',
    clearBtnId:    'importServerIconClearBtn',
    uploadBtnId:   'importServerIconUploadBtn',
    onChange:      (dataURL) => highlightImportServerIconPreset(dataURL)
  });
  if (saved?.icon) {
    wfIconUpload.set({
      previewId:     'importServerIconPreview',
      previewWrapId: 'importServerIconWrap',
      uploadBtnId:   'importServerIconUploadBtn'
    }, saved.icon);
    highlightImportServerIconPreset(saved.icon);
  } else {
    wfIconUpload.clear({
      previewId:     'importServerIconPreview',
      previewWrapId: 'importServerIconWrap',
      uploadBtnId:   'importServerIconUploadBtn'
    });
    highlightImportServerIconPreset(null);
  }

  // Reveal modal only after state is settled
  if (overlay) overlay.classList.add('active');

  // Auto-fetch if we have a complete saved config; otherwise focus Chat URL
  if (saved && saved.chatUrl && saved.modelsUrl) {
    // Switch to loading state so no stray panes flash during the fetch gap.
    // fetchImportServerModels() will transition to 'ready' on success or
    // 'error' on failure via setImportServerState() calls.
    setImportServerState('loading');
    fetchImportServerModels();
  } else {
    chatEl?.focus();
  }
}

function closeImportServerModal() {
  const overlay = document.getElementById('importServerModal');
  if (overlay) overlay.classList.remove('active');
  const innerModal = getImportServerInnerModal();
  if (innerModal) innerModal.classList.remove('has-saved-key');
  resetImportServer(true);
  document.getElementById('importServerQuickAdd').value = '';
  stopImportTimestampTicker();
  _importFetchedAt = null;
}

function resetImportServer(full = false) {
  const status   = document.getElementById('importServerFetchStatus');
  const fetchBtn = document.getElementById('importServerFetchBtn');
  const addBtn   = document.getElementById('importServerAddBtn');
  if (status)   { status.textContent = ''; status.className = 'custom-ai-test-status'; }
  if (fetchBtn) {
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch Models';
    fetchBtn.classList.add('btn-accent');
  }
  if (addBtn)   { addBtn.disabled = true; addBtn.textContent = 'Add 0 to Hive'; }
  _importServerModels = [];
  _importRowIcons = []; // v3.30.2 — clear per-row overrides on close
  setImportServerState('prefetch');
}

function autoDeriveModelsUrl() {
  const chatUrl   = document.getElementById('importServerChatUrl')?.value.trim();
  const modelsEl  = document.getElementById('importServerUrl');
  if (!chatUrl || !modelsEl || modelsEl.dataset.userEdited === 'true') return;
  // Derive models URL from chat URL by replacing the path suffix
  try {
    const u    = new URL(chatUrl);
    const base = u.origin;
    if (chatUrl.includes('/api/chat/completions')) modelsEl.value = base + '/api/models';
    else if (chatUrl.includes('/v1/chat/completions')) modelsEl.value = base + '/v1/models';
  } catch(e) {}
}

function toggleImportServerKeyVis() {
  const input = document.getElementById('importServerKey');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function applyImportServerQuickAdd(value) {
  resetImportServer(true);
  _importServerPreset = IMPORT_SERVER_PRESETS[value] || null;
  const chatEl   = document.getElementById('importServerChatUrl');
  const modelsEl = document.getElementById('importServerUrl');
  if (!chatEl || !modelsEl) return;
  if (value === 'openwebui') {
    chatEl.value   = '';
    chatEl.placeholder = 'https://your-server.com/api/chat/completions';
    modelsEl.value = '';
    modelsEl.placeholder = 'https://your-server.com/api/models';
  } else if (value === 'ollama') {
    chatEl.value   = 'http://localhost:11434/v1/chat/completions';
    modelsEl.value = 'http://localhost:11434/api/tags';
  } else if (value === 'lmstudio') {
    chatEl.value   = 'http://localhost:1234/v1/chat/completions';
    modelsEl.value = 'http://localhost:1234/v1/models';
  }
  if (modelsEl) modelsEl.dataset.userEdited = 'false';
}

async function fetchImportServerModels() {
  const modelsUrl = document.getElementById('importServerUrl').value.trim();
  const chatUrl   = document.getElementById('importServerChatUrl').value.trim();
  const key       = document.getElementById('importServerKey').value.trim();
  const status    = document.getElementById('importServerFetchStatus');
  const fetchBtn  = document.getElementById('importServerFetchBtn');

  if (!modelsUrl || !modelsUrl.startsWith('http')) {
    showImportServerError('Enter a Models Endpoint URL',
      'The Models Endpoint field is empty or does not start with http:// or https://.',
      ['Use Quick Add to pre-fill a known pattern, then adjust the server portion to match yours.',
       'The Models Endpoint is the URL that returns the list of available models (for Open WebUI that is /api/models).']
    );
    return;
  }
  // Mixed-content pre-flight: browser will block http:// from an https:// page
  if (!IS_LOCAL_RUNTIME && modelsUrl.startsWith('http://')) {
    showImportServerError('Mixed-content blocked by the browser',
      `WaxFrame is served over https, so requests to ${modelsUrl} will be blocked by the browser before they leave your machine.`,
      ['Use an https:// endpoint served by your server.',
       'Or open WaxFrame locally from the file:// URL (download the build and open index.html) if you need to reach http://localhost.']
    );
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.textContent = '…';
  if (status) { status.textContent = 'Fetching models…'; status.className = 'custom-ai-test-status testing'; }

  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const writeRaw = (endpoint, statusText, receivedObj) => {
    const rawEndpoint = document.getElementById('importServerRawEndpoint');
    const rawStatus   = document.getElementById('importServerRawStatus');
    const rawReceived = document.getElementById('importServerRawReceived');
    if (rawEndpoint) rawEndpoint.textContent = endpoint;
    if (rawStatus)   rawStatus.textContent   = statusText;
    if (rawReceived) rawReceived.textContent = (receivedObj !== null && typeof receivedObj === 'object')
      ? JSON.stringify(receivedObj, null, 2) : String(receivedObj);
  };

  try {
    const resp = await fetch(modelsUrl, { headers });
    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      if (status) { status.textContent = `❌ HTTP ${resp.status}`; status.className = 'custom-ai-test-status fail'; }
      fetchBtn.disabled = false; fetchBtn.textContent = 'Try Again';
      // v3.29.1 — route through unified classifier (Audit Finding 1, site 3).
      // ctx.kind = 'models_endpoint' gates the import-server-specific catalog
      // entries so they don't fire from other contexts (round flow, custom AI
      // test, test all keys). entry.meaning becomes the body; we still append
      // a final hint referring to the raw panel for power users.
      const entry = WF_DEBUG.classify(new Error(`HTTP ${resp.status}`), {
        kind:   'models_endpoint',
        status: resp.status
      });
      const hints = [entry.meaning, 'See the raw response panel for full details.'];
      showImportServerError(`HTTP ${resp.status} — ${resp.statusText || 'request failed'}`,
        `The server responded, but not with the model list WaxFrame expected.`, hints);
      writeRaw(modelsUrl, `${resp.status} ${resp.statusText}`, data);
      return;
    }

    // Parse model list — OpenAI {data:[]}, Open WebUI {data:[]}, Ollama {models:[]}, or bare []
    let models = [];
    if (Array.isArray(data)) {
      models = data.map(m => ({ id: m.id || m.name || m, name: m.name || m.id || m })).filter(m => m.id);
    } else if (data && Array.isArray(data.data)) {
      models = data.data.map(m => ({ id: m.id || m.name || m, name: m.name || m.id || m })).filter(m => m.id);
    } else if (data && Array.isArray(data.models)) {
      models = data.models.map(m => ({ id: m.id || m.name || m, name: m.name || m.id || m })).filter(m => m.id);
    }

    if (!models.length) {
      if (status) { status.textContent = '❌ No models in response'; status.className = 'custom-ai-test-status fail'; }
      fetchBtn.disabled = false; fetchBtn.textContent = 'Try Again';
      // v3.29.1 — also routed through classifier with a synthetic 'no_models'
      // status sentinel so MODELS_ENDPOINT_NO_MODELS matches. Keeps the body
      // consistent with the other import-server error paths.
      const entry = WF_DEBUG.classify(new Error('no_models'), {
        kind:   'models_endpoint',
        status: 'no_models'
      });
      showImportServerError(entry.title,
        'The request succeeded, but the response did not contain a recognizable list of models.',
        [entry.meaning,
         'Open the raw response panel in the modal to inspect the server reply.']);
      writeRaw(modelsUrl, `${resp.status} ${resp.statusText}`, data);
      return;
    }

    _importServerModels = models;
    writeRaw(modelsUrl, `${resp.status} ${resp.statusText}`, data);
    renderImportServerChecklist();
    if (status) { status.textContent = `✓ ${models.length} model${models.length !== 1 ? 's' : ''} found`; status.className = 'custom-ai-test-status pass'; }
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Refresh';
    fetchBtn.classList.remove('btn-accent');
    setImportServerState('ready');

    // Save the validated server config immediately on successful fetch.
    // These three fields returned HTTP 200 with a valid model list — they've
    // proven themselves and are worth remembering whether or not the user
    // ultimately adds any models from this server. (Add to Hive also saves,
    // as a belt-and-suspenders redundancy.)
    saveImportServerDefaults(chatUrl, modelsUrl, key,
      wfIconUpload.read({ previewId: 'importServerIconPreview' }));
    // Mark the inner modal so the 🔑 saved flags light up on the three fields
    const innerModalForSave = getImportServerInnerModal();
    if (innerModalForSave) innerModalForSave.classList.add('has-saved-key');

  } catch(e) {
    if (status) { status.textContent = `❌ Network / CORS error`; status.className = 'custom-ai-test-status fail'; }
    fetchBtn.disabled = false; fetchBtn.textContent = 'Try Again';
    // v3.29.1 — let the classifier name the failure (CORS_BLOCKED vs
    // NETWORK_ERROR vs UNKNOWN) — but preserve the import-server-specific
    // hints about file:// origins, VPN, internal DNS that the generic
    // catalog entries don't know about.
    const entry = WF_DEBUG.classify(e, { kind: 'models_endpoint' });
    showImportServerError(entry.title || 'Could not reach the server',
      entry.meaning || 'The browser could not complete the request. This usually means CORS, an unreachable host, or DNS failure.',
      ['If running WaxFrame from a local file:// URL, your server must allow file:// origins or be served from a local web server.',
       'Verify the server hostname is reachable from this machine (VPN, internal DNS, etc.).',
       `Underlying error: ${esc(e.message || String(e))}`]
    );
  }
}

function showImportServerError(title, desc, hints) {
  const t = document.getElementById('importServerErrorTitle');
  const d = document.getElementById('importServerErrorDesc');
  const h = document.getElementById('importServerErrorHints');
  if (t) t.textContent = title;
  if (d) d.textContent = desc;
  if (h) {
    if (Array.isArray(hints) && hints.length) {
      h.innerHTML = '<ul>' + hints.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
    } else {
      h.innerHTML = '';
    }
  }
  setImportServerState('error');
}

function updateChecklistCount() {
  const checked = document.querySelectorAll('.import-server-check:checked').length;
  const btn = document.getElementById('importServerAddBtn');
  if (btn) {
    // When 0 are checked, button acts as a shortcut to close the modal with no changes —
    // same behavior as Cancel. This keeps the button always interactive and avoids the
    // disabled-but-accented "press me" confusion from earlier versions.
    btn.textContent = checked === 0 ? 'Add 0 to Hive' : `Add ${checked} to Hive`;
    btn.disabled = false;
  }
  const countEl = document.getElementById('importChecklistCount');
  if (countEl) {
    const avail = _importAvailableCount || 0;
    const inHive = _importInHiveCount || 0;
    const parts = [`${avail} available · ${checked} selected`];
    if (inHive > 0) parts.push(`${inHive} already in hive`);
    countEl.textContent = parts.join(' · ');
  }
}

// Nickname is pre-filled with the model ID in italic "default" styling. The
// moment the user edits it, we strip the is-default class so it renders in the
// normal non-italic style — signaling "this is now your custom text".
function onImportNicknameInput(input) {
  if (!input) return;
  input.classList.remove('is-default');
}

function renderImportServerChecklist() {
  const items = document.getElementById('importServerChecklistItems');
  if (!items) return;

  // Build a set of model IDs already in the hive from this same Chat Endpoint
  const chatUrl = document.getElementById('importServerChatUrl').value.trim();
  const existingForThisServer = new Set(
    aiList
      .filter(ai => {
        const cfg = API_CONFIGS[ai.provider];
        return cfg && cfg.endpoint === chatUrl;
      })
      .map(ai => API_CONFIGS[ai.provider]?.model)
      .filter(Boolean)
  );

  // Render ALL models — already-in-hive entries stay visible but get a disabled
  // checkbox and an "Already in your hive" badge instead of the nickname input.
  // This avoids the "wait, where's the model I added yesterday?" confusion when
  // users re-import from the same endpoint. Available counter still reflects
  // only the selectable rows so the footer "Add N to Hive" math stays correct.
  const allModels = _importServerModels;
  const inHiveCount = allModels.filter(m => {
    const id = typeof m === 'object' ? m.id : m;
    return existingForThisServer.has(id);
  }).length;
  _importAvailableCount = allModels.length - inHiveCount;
  _importInHiveCount    = inHiveCount;

  // v3.30.2 — Smart-match each row to a catalog icon based on the model id +
  // name. Rows already in the hive get their existing AI's icon so the column
  // visually matches the bee list. Rows with no match get the generic icon.
  // User overrides via openIconPickerForImportRow() write back to this array
  // and re-render only that row's <img> rather than the whole list.
  _importRowIcons = allModels.map((model, idx) => {
    const modelId   = typeof model === 'object' ? model.id   : model;
    const modelName = typeof model === 'object' ? model.name : model;
    if (existingForThisServer.has(modelId)) {
      // Mirror the icon from the AI that's already in the hive
      const existing = aiList.find(a => API_CONFIGS[a.provider]?.model === modelId);
      if (existing?.icon) return existing.icon;
    }
    const matched = wfIconUpload.matchCatalog(`${modelName} ${modelId}`);
    return matched || GENERIC_ICON_PATH;
  });

  items.innerHTML = allModels.map((model, i) => {
    const modelId   = typeof model === 'object' ? model.id   : model;
    const modelName = typeof model === 'object' ? model.name : model;
    const inHive    = existingForThisServer.has(modelId);

    if (inHive) {
      return `
    <div class="import-server-item import-server-item--in-hive">
      <input type="checkbox" class="import-server-check" id="isc-${i}" value="${esc(modelId)}" disabled>
      <label for="isc-${i}" class="import-server-item-label">${esc(modelName)}</label>
      <span class="import-server-in-hive-badge">✓ Already in your hive</span>
    </div>`;
    }

    return `
    <div class="import-server-item" id="isi-${i}">
      <input type="checkbox" class="import-server-check" id="isc-${i}" value="${esc(modelId)}" onchange="updateChecklistCount()">
      <label for="isc-${i}" class="import-server-item-label">${esc(modelName)}</label>
      <button type="button" class="import-server-icon-btn" id="isicon-${i}" onclick="openIconPickerForImportRow(${i})" title="Choose icon for ${esc(modelName)}">
        <img src="${_importRowIcons[i] || GENERIC_ICON_PATH}" alt="" class="import-server-icon-thumb" onerror="this.style.opacity='0.3'">
      </button>
      <div class="import-server-nickname-wrap">
        <label class="import-server-nickname-label" for="isn-${i}">Nickname:</label>
        <input type="text" class="import-server-name-input is-default" id="isn-${i}" value="${esc(modelName)}" data-default-value="${esc(modelName)}" oninput="onImportNicknameInput(this)">
      </div>
    </div>`;
  }).join('');

  // Timestamp in header, live-updating
  _importFetchedAt = Date.now();
  const tsEl = document.getElementById('importChecklistTimestamp');
  if (tsEl) {
    tsEl.textContent = 'Fetched just now';
    tsEl.title = `Fetched at ${new Date(_importFetchedAt).toLocaleTimeString()}`;
  }
  startImportTimestampTicker();

  updateChecklistCount();
}

function importServerSelectAll() {
  document.querySelectorAll('.import-server-check:not(:disabled)').forEach(cb => cb.checked = true);
  updateChecklistCount();
}

function importServerSelectNone() {
  document.querySelectorAll('.import-server-check:not(:disabled)').forEach(cb => cb.checked = false);
  updateChecklistCount();
}

function addImportServerModels() {
  const chatUrl   = document.getElementById('importServerChatUrl').value.trim();
  const modelsUrl = document.getElementById('importServerUrl').value.trim();
  const key       = document.getElementById('importServerKey').value.trim();

  if (!chatUrl) { toast('⚠️ Enter a Chat Endpoint URL'); return; }

  const checked = document.querySelectorAll('.import-server-check:checked');
  // Zero-selected = user's escape hatch, behaves like Cancel (no hive changes)
  if (!checked.length) { closeImportServerModal(); return; }

  const ts     = Date.now();
  const origin = (() => { try { return new URL(chatUrl).origin; } catch(e) { return chatUrl; } })();
  // v3.29.13 — read whatever icon the preview is currently showing (user
  // upload data URL OR catalog match path), persist that. See addCustomAI
  // for the full rationale on why readAny replaces the prior read().
  // v3.30.2 — this is now a GROUP FALLBACK only. Per-row icons (assigned
  // by smart-match in renderImportServerChecklist or user-overridden via
  // openIconPickerForImportRow) take precedence. groupFallbackIcon kicks in
  // only if a row has no per-row entry, which shouldn't happen post-v3.30
  // but is defensive against any future render path that bypasses the
  // _importRowIcons populate step.
  const previewIcon = wfIconUpload.readAny({
    previewId:     'importServerIconPreview',
    previewWrapId: 'importServerIconWrap'
  });
  const groupFallbackIcon = previewIcon || GENERIC_ICON_PATH;

  // v3.27.4: build the full server model-id list ONCE, outside the loop.
  // _importServerModels was populated by fetchImportServerModels and is the
  // authoritative full list for this server. Each newly-added AI gets the
  // ENTIRE list cached so its dropdown shows every model the server offers,
  // not just the one selected at import time. Falls back to a single-model
  // array if for some reason _importServerModels is empty.
  const fullServerModelIds = (Array.isArray(_importServerModels) && _importServerModels.length)
    ? _importServerModels.map(m => m.id).filter(Boolean)
    : null;

  let added = 0;
  checked.forEach((cb, idx) => {
    const i         = cb.id.replace('isc-', '');
    const modelId   = cb.value;
    const nameInput = document.getElementById(`isn-${i}`);
    const name      = (nameInput?.value.trim()) || modelId;

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + ts + '_' + idx;

    // v3.30.2 — per-row icon takes precedence over the group fallback
    const rowIcon = _importRowIcons[parseInt(i, 10)] || groupFallbackIcon;
    const ai = { id, name, url: chatUrl, icon: rowIcon, provider: id };

    API_CONFIGS[id] = {
      label:     name,
      model:     modelId,
      // v3.30.2 — capture the original model id at import time. The
      // Reset button that consumed this field was removed in v3.31.0
      // (Best/Fast/Budget buttons replaced it); _originalModel is kept
      // as forward-compatibility scaffold but no current UI surfaces it.
      _originalModel: modelId,
      endpoint:  chatUrl,
      // v3.27.4: store the Models Endpoint URL so recheckModelForAI can
      // fetch the live model list later without trying to derive it from
      // the chat URL (the derive path breaks for `/api/...` servers like
      // Open WebUI and Alfredo). Persisted via saveHive's customAIConfigs.
      _modelsEndpoint: modelsUrl,
      note:      `Model: ${modelId}`,
      // v3.27.3: format is needed by recheckModelForAI's custom-AI path
      // (Recommend a Model button) — Open WebUI / Alfredo / generic model
      // servers are OpenAI-compatible by definition since this flow assumes
      // an OpenAI-compatible chat completions endpoint.
      format:    'openai',
      headersFn: k => {
        // v3.27.5: omit Authorization entirely when no key is set rather than
        // sending the literal string "Bearer undefined". Ollama, LM Studio,
        // and unauth'd Open WebUI tolerate the bogus header today, but stricter
        // implementations (or future auth changes on these servers) could
        // reject it. Aligns with fetchModelsFromEndpoint and recommendModel,
        // which already gate Authorization on key presence.
        const h = { 'Content-Type': 'application/json' };
        if (k) h['Authorization'] = `Bearer ${k}`;
        return h;
      },
      bodyFn:    (m, prompt) => JSON.stringify({ model: m, messages: [{ role: 'user', content: prompt }] }),
      extractFn: d => d?.choices?.[0]?.message?.content || ''
    };
    if (key) API_CONFIGS[id]._key = key;

    // v3.27.4: cache the FULL server model list for each newly-added AI so
    // every row's dropdown immediately reflects everything the server offers
    // — not just the single model that was checked at import time. This is
    // also what buildModelSelector reads from. Falls back to [modelId] if
    // _importServerModels was unexpectedly empty (defensive).
    try {
      const cacheModels = fullServerModelIds && fullServerModelIds.length
        ? fullServerModelIds
        : [modelId];
      localStorage.setItem(`waxframe_models_${id}`, JSON.stringify({ ts: Date.now(), models: cacheModels }));
    } catch(e) { console.warn('[addImportServerModels] failed to cache model list:', e); }

    aiList.push(ai);
    activeAIs.push(ai);
    added++;
  });

  // Save last-used server for next open
  saveImportServerDefaults(chatUrl, modelsUrl, key,
    wfIconUpload.read({ previewId: 'importServerIconPreview' }));

  closeImportServerModal();
  renderAISetupGrid();
  saveHive();
  toast(`🐝 ${added} model${added !== 1 ? 's' : ''} added to the hive`);
}

function continueFromBees() {
  const keyed = aiList.filter(ai => API_CONFIGS[ai.provider]?._key);
  if (keyed.length < 2) {
    toast('⚠️ You need API keys for at least 2 AIs to continue');
    return;
  }
  activeAIs = keyed;
  saveHive();
  goToScreen('screen-builder');
}

function continueFromBuilder() {
  if (!builder) { toast('⚠️ Choose a Builder AI before continuing'); return; }
  saveHive();
  goToScreen('screen-project');
}

function continueFromProject() {
  const name    = document.getElementById('projectName')?.value.trim();
  const version = document.getElementById('projectVersion')?.value.trim();
  const goal    = assembleProjectGoal();
  if (!name)        { toast('⚠️ Enter a project name'); return; }
  if (!version)     { toast('⚠️ Enter a version number'); return; }
  if (!goal)        { toast('⚠️ Fill in at least one goal field'); return; }
  saveProject();
  goToScreen('screen-reference');
}

// ── SCREEN 3: PROJECT SETUP ──
function switchDocTab(tab) {
  docTab = tab;
  document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.doc-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-'   + tab)?.classList.add('active');
  document.getElementById('panel-' + tab)?.classList.add('active');
  // Init line numbers when switching to paste tab
  if (tab === 'paste') {
    const ta = document.getElementById('pasteText');
    if (ta) updateProjLineNums('projPasteNums', ta);
  }
  saveProject();
  updateLaunchRequirements();
  saveSettings();
  // v3.52.0 — Re-check source size on tab change. Different tabs read
  // from different sources (paste textarea vs docText vs nothing for
  // scratch), so the same source check can produce different cards
  // depending on which tab is active.
  if (typeof renderSourceSizeCheck === 'function') renderSourceSizeCheck();
}

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.add('drag-over');
}

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function clearUploadedFile() {
  docText = '';
  saveSession();
  try { localStorage.removeItem('waxframe_v2_filename'); } catch(e) { console.warn('[v2-filename:clear] remove failed:', e); }
  const status = document.getElementById('fileStatus');
  if (status) { status.style.display = 'none'; status.textContent = ''; }
  const clearRow = document.getElementById('fileClearRow');
  if (clearRow) clearRow.style.display = 'none';
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.value = '';
  updateLaunchRequirements();
}

// Clear the Starting Document Paste Text textarea
function clearPasteText() {
  const ta = document.getElementById('pasteText');
  if (!ta) return;
  ta.value = '';
  updateProjLineNums('projPasteNums', ta);
  updateDocRequirements();
  saveProject();
  ta.focus();
}

// Auto-save handler for the Starting Document Paste Text textarea.
// Persists pasted text to LS_PROJECT (debounced 250ms) so refreshing before
// launch no longer loses the paste — mirrors how uploaded files persist
// immediately on processFile and how reference material persists on every
// keystroke via updateReferenceDocText → saveProject.
function handlePasteTextInput() {
  const ta = document.getElementById('pasteText');
  if (!ta) return;
  updateProjLineNums('projPasteNums', ta);
  updateDocRequirements();
  clearTimeout(pasteTextSaveTimer);
  pasteTextSaveTimer = setTimeout(() => saveProject(), 250);
  // v3.52.0 — Re-check source size whenever paste content changes.
  // Cheap operation (word/char counts on a single string), runs after
  // the existing save debounce work so it never blocks input handling.
  if (typeof renderSourceSizeCheck === 'function') renderSourceSizeCheck();
}

// ============================================================
//  v3.52.0 — Source Size Check
//  v3.52.5 — Simplified to oversized-only. The trim templates
//  (Trim to Google Maps / TripAdvisor / Yelp) exist for one job:
//  shrink an oversized source down to fit a platform. Source Size
//  Check is the safety net for that job — if the source exceeds the
//  template's max, recommend pasting it into Reference Material so
//  reviewers can see what got cut every round and verify factual
//  fidelity. Anything else is silent. Future scratch templates with
//  platform minimums encode those in lengthLimit/lengthMin directly
//  rather than relying on this helper.
//
//    • source > max  → oversized recommend (paste into Ref Material)
//    • otherwise     → silent
//
//  Pure logic lives in analyzeSourceSize(); DOM/state plumbing lives in
//  renderSourceSizeCheck(). Hooks fire from: paste handler, file upload,
//  applyTemplate completion, switchDocTab, and goToScreen for the doc
//  screen. The card is template-agnostic — it reads length-mode UI state
//  directly, so any future template using range mode gets the helper
//  for free without per-template coupling.
//
//  _sourceSizeCheckDismissed: session-level flag preserved across the
//  many keystroke-driven re-renders. Once the user clicks ✕ the card
//  stays hidden until the page reloads, the template changes, the
//  source is cleared, or the screen is left and re-entered — events
//  that signal the dismiss is no longer relevant to the new state.
// ============================================================
let _sourceSizeCheckDismissed = false;

function analyzeSourceSize(text, lengthMode, lengthMin, lengthLimit, lengthUnit) {
  // No range = no target = no card. (hardcap and target modes have a
  // single value, not a range; the comparison logic below assumes both
  // floor and ceiling exist.)
  if (lengthMode !== 'range') return { status: 'silent' };
  const min = parseInt(lengthMin, 10);
  const max = parseInt(lengthLimit, 10);
  if (!min || !max || min >= max) return { status: 'silent' };

  const trimmed = (text || '').trim();
  if (!trimmed) return { status: 'silent' };

  // Choose the measurement unit to match the template's target unit.
  // Words/characters cover the review-template cases; pages and
  // paragraphs fall through to silent (no clean source-size comparison
  // for those units — pages depend on font, paragraphs depend on
  // breaks the user controls).
  let sourceCount;
  let sourceUnit;
  if (lengthUnit === 'words') {
    sourceCount = trimmed.split(/\s+/).filter(Boolean).length;
    sourceUnit  = 'words';
  } else if (lengthUnit === 'characters') {
    sourceCount = trimmed.length;
    sourceUnit  = 'characters';
  } else {
    return { status: 'silent' };
  }

  const result = { sourceCount, sourceUnit, targetMin: min, targetMax: max, targetUnit: lengthUnit };

  if (sourceCount > max) {
    // v3.52.5 — Source Size Check is now oversized-only. The undersized
    // branch (source < min * 0.7 → "would need invention") was removed.
    // For the trim templates that use this helper, no one pastes a too-
    // small source: the templates exist to refine oversized reviews down,
    // and a user with a too-small source isn't using the tool for its
    // purpose. Future scratch templates with platform minimums handle
    // those constraints in lengthLimit/lengthMin directly, not here.
    result.status  = 'oversized';
    // v3.52.6 — Message reworded to drop the editorial "that's a
    // significant cut" judgment, which read accurately at 5x overages
    // (Google Maps + Manly = 4.5x over) but felt overstated at small
    // ones (Yelp + Manly = 1.27x over). New copy describes the overage
    // factually and the recommendation cleanly, accurate across the
    // whole range of possible overages.
    result.message = `Your source is ${sourceCount} ${sourceUnit}, over the ${min}–${max} ${sourceUnit} target. Recommend also pasting the source into Reference Material so reviewers can see what got cut every round and verify factual fidelity.`;
  } else {
    result.status = 'silent';
  }
  return result;
}

function renderSourceSizeCheck() {
  const card = document.getElementById('sourceSizeCheck');
  if (!card) return;

  // Honor the session dismiss. _sourceSizeCheckDismissed gets reset
  // by events that change the underlying state meaningfully:
  // applyTemplate (new template → new target), processFile (new
  // source → new comparison), screen-document activation (re-entry
  // counts as a fresh look).
  if (_sourceSizeCheckDismissed) {
    card.style.display = 'none';
    return;
  }

  // Only render on Setup 5. Other screens get no-op (defensive — the
  // hooks shouldn't fire elsewhere, but if they do this guard keeps
  // the card from flashing on unrelated screens).
  const onDocScreen = document.getElementById('screen-document')?.classList.contains('active');
  if (!onDocScreen) {
    card.style.display = 'none';
    return;
  }

  // Pick the active source. Upload tab → docText (the extracted file
  // content, populated by processFile). Paste tab → the textarea value.
  // Scratch tab → no source to check, hide card.
  let sourceText = '';
  if (docTab === 'paste') {
    sourceText = document.getElementById('pasteText')?.value || '';
  } else if (docTab === 'upload') {
    sourceText = (typeof docText === 'string') ? docText : '';
  } else {
    // scratch — no source to size-check
    card.style.display = 'none';
    return;
  }

  // Read length-mode UI state. v3.52.0 had a bug here — it read
  // document.getElementById('lengthMode')?.value but no such element
  // exists. Mode lives in the .length-mode-pill.is-active dataset,
  // accessed via getLengthMode(). The other three fields (lengthMin,
  // lengthLimit, lengthUnit) are real inputs and were correct.
  // v3.52.2 fix.
  const lengthMode  = (typeof getLengthMode === 'function') ? getLengthMode() : 'none';
  const lengthMin   = document.getElementById('lengthMin')?.value    || '';
  const lengthLimit = document.getElementById('lengthLimit')?.value  || '';
  const lengthUnit  = document.getElementById('lengthUnit')?.value   || '';

  const r = analyzeSourceSize(sourceText, lengthMode, lengthMin, lengthLimit, lengthUnit);

  if (r.status === 'silent') {
    card.style.display = 'none';
    card.innerHTML = '';
    return;
  }

  // v3.52.5 — Oversized is now the only non-silent status. Previously
  // this function branched on `r.status === 'undersized'` to swap icon,
  // label, statusClass, and suppress the action button. With undersize
  // removed from analyzeSourceSize, all that branching is dead code.
  const icon  = '📏';
  const label = 'Source much larger than target';
  const statusClass = 'ssc-recommend';

  // One-click copy-to-Reference-Material button. The whole point of
  // surfacing this card is to recommend the user move their oversized
  // source into Reference Material so reviewers can verify cuts every
  // round against the original.
  const actionHTML = `<button class="btn btn-sm btn-accent" onclick="copySourceToReferenceMaterial()" title="Add the Starting Document content as a Reference Material card so reviewers see it every round">📚 Copy to Reference Material</button>`;

  card.className = 'source-size-check ' + statusClass;
  card.style.display = '';
  card.innerHTML = `
    <div class="ssc-icon">${icon}</div>
    <div class="ssc-body">
      <div class="ssc-label">${label}</div>
      <div class="ssc-message">${r.message}</div>
      <div class="ssc-counts">
        Source: <strong>${r.sourceCount} ${r.sourceUnit}</strong>
        · Target: <strong>${r.targetMin}–${r.targetMax} ${r.targetUnit}</strong>
      </div>
      <div class="ssc-actions">${actionHTML}</div>
    </div>
    <button class="ssc-dismiss" onclick="dismissSourceSizeCheck()" title="Dismiss this check for the rest of this session">✕</button>
  `;
}

function dismissSourceSizeCheck() {
  _sourceSizeCheckDismissed = true;
  const card = document.getElementById('sourceSizeCheck');
  if (card) card.style.display = 'none';
}

function copySourceToReferenceMaterial() {
  // Pull the active source from whichever tab is active.
  let sourceText = '';
  if (docTab === 'paste') {
    sourceText = document.getElementById('pasteText')?.value || '';
  } else if (docTab === 'upload') {
    sourceText = (typeof docText === 'string') ? docText : '';
  }
  sourceText = sourceText.trim();
  if (!sourceText) {
    if (typeof toast === 'function') toast('No source content to copy');
    return;
  }

  // Add as a Reference Material card with source='user-source-copy' so
  // it doesn't get swept by future applyTemplate calls (which only
  // sweep source='template' cards).
  if (typeof referenceDocs !== 'undefined' && Array.isArray(referenceDocs) &&
      typeof generateRefDocId === 'function') {
    referenceDocs.push({
      id:     generateRefDocId(),
      name:   'Source review (copied from Starting Document)',
      text:   sourceText,
      source: 'user-source-copy'
    });
    if (typeof saveProject === 'function') saveProject();
    if (typeof renderReferenceDocs === 'function') renderReferenceDocs();
    if (typeof toast === 'function') toast('📚 Source copied to Reference Material');
    // Hide the card — user took the recommended action, no need to
    // keep nagging. Will reappear if source size shifts to a new
    // mismatch.
    const card = document.getElementById('sourceSizeCheck');
    if (card) card.style.display = 'none';
  } else {
    if (typeof toast === 'function') toast('⚠️ Reference Material system not ready');
  }
}

// Clear the Reference Material Paste Text textarea
// (removed in v3.24.0 — single-doc helper retired with multi-doc rewrite;
//  per-card clear lives in the card actions row)

// ============================================================
//  v3.25.0 — UNIFIED FILE INGESTION
//  Single shared core (extractFromFile) used by both the
//  Starting Document handler and the Reference Material handler.
//  All four extractors rewritten for full-fidelity content
//  capture instead of "best-effort raw text".
//  Libraries are boot-loaded via index.html — no lazy fetches.
// ============================================================

// Provider keys whose underlying models support vision input.
// Each provider has its own request shape — see runVisionTranscription.
const VISION_PROVIDERS = ['chatgpt', 'claude', 'gemini', 'grok'];

// v3.56.12 — Which AI handles vision/OCR (re-extract + sparse-page pass on
// scanned/garbled PDFs). '' = Automatic: the first keyed vision provider, in
// VISION_PROVIDERS order — the long-standing default. A user pick is honored
// only if that provider is vision-capable AND keyed; otherwise we fall back to
// Automatic so OCR never silently fails because the chosen provider has no key.
// Per-machine preference (Settings → Vision / OCR).
const VISION_PROVIDER_KEY = 'waxframe_vision_provider';
function getVisionProviderPref() {
  const v = localStorage.getItem(VISION_PROVIDER_KEY) || '';
  return VISION_PROVIDERS.includes(v) ? v : '';
}
function saveVisionProvider(val) {
  const v = VISION_PROVIDERS.includes(val) ? val : '';
  localStorage.setItem(VISION_PROVIDER_KEY, v);
  const name = v ? (API_CONFIGS[v]?.label || v) : 'Automatic';
  const keyed = v ? !!API_CONFIGS[v]?._key : true;
  toast(keyed ? `🔍 OCR provider: ${name}` : `🔍 OCR provider: ${name} — no key yet, will use Automatic until you add one`, 3500);
}

// Find the first vision-capable AI from the user's keyed providers.
// Returns { cfg, key, provider } or null. Used by both initial PDF OCR
// and the work-screen re-extract button.
function getVisionCapableAI() {
  // v3.56.12 — honor an explicit user pick first, but only if it's actually
  // keyed; otherwise fall through to the Automatic first-available scan so OCR
  // never fails just because the preferred provider has no key.
  const pref = getVisionProviderPref();
  if (pref) {
    const pcfg = API_CONFIGS[pref];
    if (pcfg?._key) return { cfg: { ...pcfg, provider: pref }, key: pcfg._key, provider: pref };
  }
  for (const provider of VISION_PROVIDERS) {
    const cfg = API_CONFIGS[provider];
    if (cfg?._key) return { cfg: { ...cfg, provider }, key: cfg._key, provider };
  }
  return null;
}

// ── Starting Document handler ──
// Thin UI wrapper around extractFromFile. XLSX uses 'single' mode
// (radio-button picker if multi-sheet) since there is only one
// starting document.
async function processFile(file) {
  // Guard: if a session is already running, warn before overwriting the live document
  // Skip on Setup 5 — user is still in setup, not an active session
  const onSetupScreen = document.getElementById('screen-document')?.classList.contains('active');
  if (!onSetupScreen && (history.length > 0 || docText)) {
    // v3.52.8 — native confirm() → wfConfirm()
    const proceed = await wfConfirm(
      '⚠️ Replace working document?',
      `You have an active session with a working document.\n\nLoading a new file will replace your current document. This cannot be undone.\n\nIf you want to refine this file instead, consider clearing your working document first and pasting the text in, then continuing from there.\n\nProceed and replace the document?`,
      { okText: 'Replace document', destructive: true }
    );
    if (!proceed) return;
  }
  const status = document.getElementById('fileStatus');
  status.style.display = 'block';
  status.textContent = `⏳ Reading ${file.name}…`;
  setFileStatusState(status, 'loading');

  try {
    const docs = await extractFromFile(file, { xlsxMode: 'single' });
    if (!docs || !docs.length) throw new Error('No content extracted from file');
    const doc = docs[0]; // starting doc takes the first/only result

    docText = (doc.text || '').trim();
    saveSession();
    try {
      localStorage.setItem('waxframe_v2_filename', file.name);
      localStorage.setItem('waxframe_v2_source_type', doc.sourceType || file.name.split('.').pop().toLowerCase());
    } catch(e) { console.warn('[v2-filename:save] write failed:', e); }

    // Show status — green if clean, amber if warnings
    const warnings = doc.warnings || [];
    if (warnings.length > 0) {
      status.textContent = `⚠️ ${docText.length.toLocaleString()} chars from ${file.name} — ${warnings[0]}`;
      setFileStatusState(status, 'warn');
      if (warnings.length > 1) {
        warnings.slice(1).forEach(w => {
          const line = document.createElement('div');
          line.className = 'file-status-line';
          line.textContent = '↳ ' + w;
          status.appendChild(line);
        });
      }
      // v3.29.2 — also fire a Troubleshooting Card so the user can't miss
      // it. Inline status auto-hides; Card stays until dismissed.
      const entry = WF_ERROR_CATALOG.find(e => e.code === 'IMPORT_WARNINGS');
      if (entry && typeof WF_DEBUG !== 'undefined' && WF_DEBUG.showCard) {
        WF_DEBUG.showCard(entry, { filename: file.name, warnings });
      }
    } else {
      // v3.52.6 — Banner unit matches the active template's lengthUnit.
      // Word-mode templates (Yelp, TripAdvisor) want the headline number
      // to be word count, since that's the constraint they'll be measured
      // against. Falls back to characters when no template is loaded yet
      // or when the template uses character mode (Google Maps).
      const tplUnit = document.getElementById('lengthUnit')?.value || '';
      let countDisplay;
      if (tplUnit === 'words') {
        const wc = (docText || '').trim().split(/\s+/).filter(Boolean).length;
        countDisplay = `${wc.toLocaleString()} words`;
      } else {
        countDisplay = `${docText.length.toLocaleString()} characters`;
      }
      status.textContent = `✅ ${countDisplay} extracted from ${file.name}`;
      setFileStatusState(status, 'success');
    }

    const clearRow = document.getElementById('fileClearRow');
    if (clearRow) clearRow.style.display = 'block';
    updateLaunchRequirements();
    // v3.52.0 — Run source size check after the file is loaded. docText
    // is now populated with the extracted content so the helper can
    // compare against the active template's length range. Reset the
    // dismiss flag — a new source file is a fresh comparison.
    _sourceSizeCheckDismissed = false;
    if (typeof renderSourceSizeCheck === 'function') renderSourceSizeCheck();
  } catch(e) {
    console.error('Starting doc extraction failed:', e);
    status.textContent = `❌ Could not read file: ${e.message}`;
    setFileStatusState(status, 'error');
  }
}

// ── Reference Material file handler ──
// Thin UI wrapper around extractFromFile. XLSX uses 'multi' mode
// (checkbox picker, one ref doc per selected sheet) so each sheet
// gets its own independent card with its own token chip.
async function processRefFile(file) {
  // Mid-session-overwrite warning preserved from single-doc behavior.
  // With multi-doc, adding a doc never overwrites — but the warning still
  // educates users about which round will see the new doc.
  const onSetupScreen = document.getElementById('screen-reference')?.classList.contains('active');
  if (!onSetupScreen && history.length > 0) {
    // v3.52.8 — native confirm() → wfConfirm()
    const proceed = await wfConfirm(
      'Add reference doc mid-session?',
      `Adding a new reference document mid-session takes effect on the NEXT round. Past rounds keep their original snapshot.\n\nProceed?`
    );
    if (!proceed) return;
  }

  const status = document.getElementById('refFileStatus');
  if (status) {
    status.style.display = 'block';
    status.textContent = `⏳ Reading ${file.name}…`;
    setFileStatusState(status, 'loading');
  }

  try {
    const docs = await extractFromFile(file, { xlsxMode: 'multi' });
    if (!docs || !docs.length) throw new Error('No content extracted from file');

    let totalChars = 0;
    const allWarnings = [];
    for (const docResult of docs) {
      const text = (docResult.text || '').trim();
      if (!text) continue;
      totalChars += text.length;
      const newDoc = {
        id: generateRefDocId(),
        name: docResult.suggestedName || file.name,
        text,
        source: 'upload',
        filename: file.name,
      };
      referenceDocs.push(newDoc);
      if (docResult.warnings && docResult.warnings.length) {
        allWarnings.push(...docResult.warnings);
      }
    }

    renderReferenceCards();
    updateRefGrandTotals();
    saveProject();

    if (status) {
      const docCount = docs.length;
      const docNoun = docCount === 1 ? 'doc' : 'docs';
      const msg = allWarnings.length
        ? `⚠️ Added ${docCount} ${docNoun} from "${file.name}" (${totalChars.toLocaleString()} chars) — ${allWarnings[0]}`
        : `📚 Added ${docCount} ${docNoun} from "${file.name}" (${totalChars.toLocaleString()} chars) as reference material`;
      status.textContent = msg;
      setFileStatusState(status, allWarnings.length ? 'warn' : 'ok');
      setTimeout(() => { if (status) { status.style.display = 'none'; status.textContent = ''; } }, 6000);
    }
    // v3.29.2 — also fire a Troubleshooting Card so warnings can't be
    // missed during reference-material import.
    if (allWarnings.length > 0) {
      const entry = WF_ERROR_CATALOG.find(e => e.code === 'IMPORT_WARNINGS');
      if (entry && typeof WF_DEBUG !== 'undefined' && WF_DEBUG.showCard) {
        WF_DEBUG.showCard(entry, { filename: file.name, warnings: allWarnings });
      }
    }
  } catch (e) {
    console.error('Ref file extraction failed:', e);
    if (status) {
      status.textContent = `❌ Could not read ${file.name}: ${e.message}`;
      setFileStatusState(status, 'error');
    }
  }
}

// ── SHARED INGESTION CORE ──
// Returns Promise<Array<{ text, warnings, sourceType, suggestedName }>>.
// Single-result extractors (txt/md/pdf/docx/pptx) return one-element arrays.
// XLSX may return multiple elements (one per selected sheet in multi mode).
// options.xlsxMode: 'single' (starting doc — radio picker, returns 1)
//                   'multi'  (reference — checkbox picker, returns N)
async function extractFromFile(file, options = {}) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt' || ext === 'md') {
    const text = await file.text();
    return [{ text, warnings: [], sourceType: ext, suggestedName: file.name }];
  }
  if (ext === 'pdf') {
    const r = await extractPDF(file);
    return [{ ...r, suggestedName: file.name }];
  }
  if (ext === 'docx') {
    const r = await extractDOCX(file);
    return [{ ...r, suggestedName: file.name }];
  }
  if (ext === 'pptx') {
    const r = await extractPPTX(file);
    return [{ ...r, suggestedName: file.name }];
  }
  if (ext === 'xlsx' || ext === 'xlsm') {
    return await extractXLSX(file, options);
  }
  throw new Error(`Unsupported file type: .${ext}. Accepted: .txt, .md, .pdf, .docx, .pptx, .xlsx, .xlsm`);
}

// ============================================================
//  PDF EXTRACTION (v3.25.0 — full-fidelity)
//  Beyond text: outline (TOC), form fields, annotations, and
//  heuristic image-OCR pass for low-density pages.
// ============================================================
async function extractPDF(file) {
  const result = { text: '', warnings: [], sourceType: 'pdf' };

  if (!window.pdfjsLib) {
    throw new Error('PDF.js not loaded — refresh the page and try again');
  }
  // Self-hosted worker — set once per session.
  if (!window._pdfjsWorkerSet) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    window._pdfjsWorkerSet = true;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // ── Outline (TOC) capture ──
  let outlineText = '';
  try {
    const outline = await pdf.getOutline();
    if (outline && outline.length) {
      const lines = [];
      const walk = (items, depth) => {
        for (const it of items) {
          lines.push('  '.repeat(depth) + '• ' + (it.title || ''));
          if (it.items && it.items.length) walk(it.items, depth + 1);
        }
      };
      walk(outline, 0);
      if (lines.length) outlineText = `## Document Outline\n${lines.join('\n')}\n\n`;
    }
  } catch(e) {
    console.warn("[pdf-import:outline] failed (could be missing or malformed):", e);
    result.warnings.push("Document outline could not be parsed");
  }

  // ── Per-page text + table + annotation extraction ──
  let bodyText = '';
  const pageOcrCandidates = [];
  let totalChars = 0;
  let totalAnnotations = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const rawContent = await page.getTextContent();

    const items = [];
    for (const item of rawContent.items) {
      if (!item.str || !item.str.trim()) continue;
      items.push({
        str: item.str,
        x: item.transform ? item.transform[4] : 0,
        y: item.transform ? item.transform[5] : 0,
        w: item.width || 0
      });
    }

    // Group items into lines by Y value.
    const lines = [];
    for (const item of items) {
      const line = lines.find(l => Math.abs(l.y - item.y) <= 3);
      if (line) line.items.push(item);
      else lines.push({ y: item.y, items: [item] });
    }
    lines.sort((a, b) => b.y - a.y);
    for (const line of lines) line.items.sort((a, b) => a.x - b.x);

    // Table detection — find groups of 3+ consecutive lines with similar
    // column X-positions. If found, render those lines as a markdown table.
    const tableSpans = detectTableSpans(lines);

    // Reconstruct text — emit table-shape blocks where detected, prose elsewhere.
    let pageText = '';
    let li = 0;
    while (li < lines.length) {
      const inTable = tableSpans.find(s => li >= s.start && li <= s.end);
      if (inTable) {
        pageText += '\n' + linesToMarkdownTable(lines.slice(inTable.start, inTable.end + 1)) + '\n';
        li = inTable.end + 1;
        continue;
      }
      if (li > 0) {
        const yGap = lines[li - 1].y - lines[li].y;
        pageText += yGap > 18 ? '\n\n' : '\n';
      }
      let lineText = '';
      let lastItemX = null;
      let lastItemW = 0;
      for (const item of lines[li].items) {
        if (lastItemX !== null) {
          const gap = item.x - (lastItemX + lastItemW);
          if (gap > 3) lineText += ' ';
        }
        lineText += item.str;
        lastItemX = item.x;
        lastItemW = item.w;
      }
      pageText += lineText;
      li++;
    }
    bodyText += pageText + '\n';
    totalChars += pageText.length;

    // ── Annotation capture (comments, highlights with notes) ──
    try {
      const annots = await page.getAnnotations();
      for (const a of annots) {
        if (a.contents && a.contents.trim()) {
          bodyText += `\n[Note on page ${i}${a.subtype ? ' (' + a.subtype + ')' : ''}: ${a.contents.trim()}]\n`;
          totalAnnotations++;
        }
      }
    } catch(e) {
      console.warn("[pdf-import:annotations] failed (could be missing or malformed):", e);
      result.warnings.push(`Annotations on page ${i} could not be parsed`);
    }

    // Track low-density pages — candidate for OCR pass after main extraction.
    if (pageText.trim().length < 200) pageOcrCandidates.push(i);
  }
  bodyText = bodyText.trim();

  // ── Form field capture (AcroForm) ──
  let formText = '';
  try {
    const fields = await pdf.getFieldObjects();
    if (fields) {
      const filled = [];
      for (const fieldName of Object.keys(fields)) {
        const arr = fields[fieldName];
        for (const f of arr) {
          if (f.value !== undefined && f.value !== null && f.value !== '') {
            filled.push(`- **${fieldName}**: ${String(f.value)}`);
          }
        }
      }
      if (filled.length) formText = `\n\n## Form Fields\n${filled.join('\n')}\n`;
    }
  } catch(e) {
    console.warn("[pdf-import:form-fields] failed (could be missing or malformed):", e);
    result.warnings.push("Form fields could not be parsed");
  }

  let assembledText = outlineText + bodyText + formText;

  // ── OCR detection ──
  const avgCharsPerPage = totalChars / Math.max(1, pdf.numPages);
  const tokens = bodyText.split(/\s+/).filter(Boolean);
  const avgWordLen = tokens.length > 20 ? tokens.reduce((s, t) => s + t.length, 0) / tokens.length : 99;
  const isScanned = avgCharsPerPage < 80;
  const isGarbled = avgWordLen < 2.5;

  if (!isScanned && !isGarbled) {
    // Clean text extraction. Run heuristic OCR pass on low-density pages
    // to catch embedded screenshot-tables and image-only sections that
    // would otherwise be lost silently. This is additive — original text
    // is preserved and OCR appends per-page below.
    result.text = assembledText;
    if (totalAnnotations > 0) result.warnings.push(`${totalAnnotations} annotation${totalAnnotations === 1 ? '' : 's'} extracted from PDF comments/highlights`);

    if (pageOcrCandidates.length > 0) {
      const visionAI = getVisionCapableAI();
      if (visionAI) {
        const status = document.getElementById('fileStatus') || document.getElementById('refFileStatus');
        if (status) {
          status.textContent = `⏳ ${pageOcrCandidates.length} sparse page${pageOcrCandidates.length === 1 ? '' : 's'} detected — running OCR pass for embedded images via ${visionAI.cfg.label}…`;
          setFileStatusState(status, 'loading');
        }
        try {
          // Render only the candidate pages.
          const sparseImages = [];
          for (const pageNum of pageOcrCandidates) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            sparseImages.push({ pageNum, b64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] });
          }
          const ocrText = await runVisionTranscription(sparseImages.map(s => s.b64), visionAI.cfg, visionAI.key);
          if (ocrText && ocrText.trim()) {
            result.text += `\n\n## OCR Pass (sparse pages: ${pageOcrCandidates.join(', ')})\n${ocrText.trim()}\n`;
            result.warnings.push(`OCR pass added content from sparse pages ${pageOcrCandidates.join(', ')} via ${visionAI.cfg.label} — verify accuracy`);
          }
        } catch(ocrErr) {
          result.warnings.push(`OCR pass failed (${ocrErr.message}) — sparse pages may have unrecovered image content`);
        }
      } else {
        result.warnings.push(`${pageOcrCandidates.length} sparse page${pageOcrCandidates.length === 1 ? '' : 's'} detected — add a ChatGPT, Claude, Gemini, or Grok key to OCR embedded images`);
      }
    }

    await storePDFPageImages(pdf);
    return result;
  }

  // ── Full-document vision transcription (scanned/garbled) ──
  const reason = isScanned ? 'scanned/image-based PDF detected' : 'character-spacing artifacts detected';
  const status = document.getElementById('fileStatus') || document.getElementById('refFileStatus');
  if (status) {
    status.textContent = `⏳ ${reason.charAt(0).toUpperCase() + reason.slice(1)} — sending to AI for vision transcription. This may take 15–30 seconds…`;
    setFileStatusState(status, 'loading');
  }

  const pageImages = await renderPDFToImages(pdf);
  window._lastPDFPages = pageImages;
  try { localStorage.setItem('waxframe_v2_has_pdf_pages', '1'); } catch(e) { console.warn('[v2-has-pdf-pages] write failed:', e); }

  const visionAI = getVisionCapableAI();
  if (!visionAI) {
    result.text = assembledText;
    result.warnings.push('Text may be garbled — no vision-capable AI key available (ChatGPT, Claude, Gemini, or Grok). Use the Re-extract button on the work screen after adding one, or paste the text manually.');
    return result;
  }

  const transcribed = await runVisionTranscription(pageImages, visionAI.cfg, visionAI.key);
  result.text = (outlineText + transcribed + formText).trim();
  result.sourceType = 'pdf-vision';
  result.warnings.push(`Extracted via AI vision (${visionAI.cfg.label}) — check for accuracy before running rounds`);
  return result;
}

// Detect contiguous line spans that look like a table (3+ lines sharing
// 2+ column X-positions within tolerance). Returns array of {start,end}
// span indices into the lines array.
function detectTableSpans(lines) {
  const spans = [];
  const TOL = 6;
  const MIN_ROWS = 3;
  const MIN_COLS = 2;

  let i = 0;
  while (i < lines.length) {
    const seedXs = lines[i].items.map(it => it.x).sort((a, b) => a - b);
    if (seedXs.length < MIN_COLS) { i++; continue; }
    let j = i + 1;
    while (j < lines.length) {
      const cur = lines[j].items.map(it => it.x).sort((a, b) => a - b);
      if (cur.length < MIN_COLS) break;
      // Count how many seedXs have a match in cur within TOL.
      let matches = 0;
      for (const sx of seedXs) {
        if (cur.some(cx => Math.abs(cx - sx) <= TOL)) matches++;
      }
      if (matches < MIN_COLS) break;
      j++;
    }
    if (j - i >= MIN_ROWS) {
      spans.push({ start: i, end: j - 1 });
      i = j;
    } else {
      i++;
    }
  }
  return spans;
}

// Convert a span of aligned-column lines into a markdown table.
// First row is treated as the header.
function linesToMarkdownTable(lines) {
  if (!lines.length) return '';
  // Build the canonical column X-positions from the first line.
  const colXs = lines[0].items.map(it => it.x).sort((a, b) => a - b);
  const TOL = 6;

  const rows = lines.map(line => {
    const cells = colXs.map(() => '');
    for (const item of line.items) {
      let bestCol = 0;
      let bestDist = Infinity;
      for (let c = 0; c < colXs.length; c++) {
        const d = Math.abs(item.x - colXs[c]);
        if (d < bestDist) { bestDist = d; bestCol = c; }
      }
      if (bestDist <= TOL * 3) {
        cells[bestCol] = (cells[bestCol] ? cells[bestCol] + ' ' : '') + item.str;
      }
    }
    return cells.map(c => c.trim() || ' ');
  });

  const header = rows[0];
  const body = rows.slice(1);
  const sep = header.map(() => '---');
  const out = [
    '| ' + header.join(' | ') + ' |',
    '| ' + sep.join(' | ') + ' |',
    ...body.map(r => '| ' + r.join(' | ') + ' |')
  ];
  return out.join('\n');
}

// Render PDF pages to base64 JPEG images
async function renderPDFToImages(pdf) {
  const images = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
  }
  return images;
}

// Store PDF pages in memory for re-extract on work screen
async function storePDFPageImages(pdf) {
  try {
    window._lastPDFPages = await renderPDFToImages(pdf);
    localStorage.setItem('waxframe_v2_has_pdf_pages', '1');
  } catch(e) {
    window._lastPDFPages = null;
  }
}

// ============================================================
//  DOCX EXTRACTION (v3.25.0 — full-fidelity)
//  Beyond raw text: structure preserved (headings, lists,
//  tables, bold/italic) plus comments, footnotes, headers/
//  footers, track-changes, and text boxes.
// ============================================================
async function extractDOCX(file) {
  const result = { text: '', warnings: [], sourceType: 'docx' };
  if (!window.mammoth) throw new Error('Mammoth not loaded — refresh the page and try again');
  if (!window.JSZip)   throw new Error('JSZip not loaded — refresh the page and try again');

  const arrayBuffer = await file.arrayBuffer();

  // ── Mammoth: structured markdown via convertToMarkdown ──
  // This preserves headings, lists, tables, bold/italic — not just raw text.
  let mainBody = '';
  let mammothMessages = [];
  try {
    const mr = await window.mammoth.convertToMarkdown({ arrayBuffer });
    mainBody = mr.value || '';
    mammothMessages = mr.messages || [];
  } catch(e) {
    // Fall back to raw text if markdown conversion fails.
    const mr = await window.mammoth.extractRawText({ arrayBuffer });
    mainBody = mr.value || '';
    mammothMessages = mr.messages || [];
    result.warnings.push('Structured-markdown conversion failed — falling back to raw text (formatting lost)');
  }

  const skippedCount = mammothMessages.filter(m => m.type === 'warning').length;
  if (skippedCount > 0) {
    result.warnings.push(`${skippedCount} element${skippedCount > 1 ? 's' : ''} couldn't be extracted (text boxes, embedded objects, or SmartArt) — see appended sections below if recoverable`);
  }

  // ── JSZip parse for content mammoth doesn't expose directly ──
  const zip = await window.JSZip.loadAsync(arrayBuffer);
  const parser = new DOMParser();

  const readXML = async (path) => {
    if (!zip.files[path]) return null;
    const xml = await zip.files[path].async('text');
    return parser.parseFromString(xml, 'text/xml');
  };

  // Helper — get all text in a w:p paragraph (respecting w:ins, dropping w:del).
  const paraText = (pNode) => {
    const out = [];
    const walk = (node, inDel) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType !== 1) continue;
        const ln = child.localName;
        if (ln === 'del') { /* dropped — change-acceptance behavior */ continue; }
        if (ln === 'ins') { walk(child, inDel); continue; }
        if (ln === 't' && !inDel) { out.push(child.textContent || ''); continue; }
        walk(child, inDel);
      }
    };
    walk(pNode, false);
    return out.join('');
  };

  const collectParagraphs = (doc) => {
    if (!doc) return [];
    const ps = doc.getElementsByTagNameNS('*', 'p');
    const lines = [];
    for (const p of Array.from(ps)) {
      const t = paraText(p).trim();
      if (t) lines.push(t);
    }
    return lines;
  };

  // ── Comments ──
  let commentsText = '';
  try {
    const cdoc = await readXML('word/comments.xml');
    if (cdoc) {
      const comments = cdoc.getElementsByTagNameNS('*', 'comment');
      const lines = [];
      for (const c of Array.from(comments)) {
        const author = c.getAttribute('w:author') || c.getAttributeNS('*', 'author') || 'Unknown';
        const text = collectParagraphs({ getElementsByTagNameNS: c.getElementsByTagNameNS.bind(c) }).join(' ').trim();
        if (text) lines.push(`- **${author}**: ${text}`);
      }
      if (lines.length) commentsText = `\n\n## Comments\n${lines.join('\n')}\n`;
    }
  } catch(e) {
    console.warn("[docx-import:comments] failed (could be missing or malformed):", e);
    result.warnings.push("Document comments could not be parsed");
  }

  // ── Footnotes ──
  let footnotesText = '';
  try {
    const fdoc = await readXML('word/footnotes.xml');
    if (fdoc) {
      const fns = fdoc.getElementsByTagNameNS('*', 'footnote');
      const lines = [];
      let n = 0;
      for (const f of Array.from(fns)) {
        const ftype = f.getAttribute('w:type') || f.getAttributeNS('*', 'type');
        // Skip Word's built-in separator/continuation pseudo-footnotes.
        if (ftype === 'separator' || ftype === 'continuationSeparator') continue;
        n++;
        const text = collectParagraphs({ getElementsByTagNameNS: f.getElementsByTagNameNS.bind(f) }).join(' ').trim();
        if (text) lines.push(`${n}. ${text}`);
      }
      if (lines.length) footnotesText = `\n\n## Footnotes\n${lines.join('\n')}\n`;
    }
  } catch(e) {
    console.warn("[docx-import:footnotes] failed (could be missing or malformed):", e);
    result.warnings.push("Footnotes could not be parsed");
  }

  // ── Endnotes ──
  let endnotesText = '';
  try {
    const edoc = await readXML('word/endnotes.xml');
    if (edoc) {
      const ens = edoc.getElementsByTagNameNS('*', 'endnote');
      const lines = [];
      let n = 0;
      for (const e of Array.from(ens)) {
        const etype = e.getAttribute('w:type') || e.getAttributeNS('*', 'type');
        if (etype === 'separator' || etype === 'continuationSeparator') continue;
        n++;
        const text = collectParagraphs({ getElementsByTagNameNS: e.getElementsByTagNameNS.bind(e) }).join(' ').trim();
        if (text) lines.push(`${n}. ${text}`);
      }
      if (lines.length) endnotesText = `\n\n## Endnotes\n${lines.join('\n')}\n`;
    }
  } catch(e) {
    console.warn("[docx-import:endnotes] failed (could be missing or malformed):", e);
    result.warnings.push("Endnotes could not be parsed");
  }

  // ── Headers / Footers ──
  // Aggregate unique header/footer text — boilerplate appears once not per-page.
  const seenHF = new Set();
  const hfLines = [];
  for (const path of Object.keys(zip.files)) {
    if (!/^word\/(header|footer)\d*\.xml$/.test(path)) continue;
    try {
      const hfDoc = await readXML(path);
      const lines = collectParagraphs(hfDoc);
      const joined = lines.join(' ').trim();
      if (joined && !seenHF.has(joined)) {
        seenHF.add(joined);
        hfLines.push(`- ${joined}`);
      }
    } catch(e) { console.warn("[docx-import:skip-item] parser threw:", e); }
  }
  let hfText = '';
  if (hfLines.length) hfText = `\n\n## Headers & Footers\n${hfLines.join('\n')}\n`;

  // ── Text boxes (w:txbxContent) ──
  // Mammoth flags but doesn't extract these. Pull them from document.xml directly.
  let txbxText = '';
  try {
    const ddoc = await readXML('word/document.xml');
    if (ddoc) {
      const txBoxes = ddoc.getElementsByTagNameNS('*', 'txbxContent');
      const lines = [];
      for (const tb of Array.from(txBoxes)) {
        const t = collectParagraphs({ getElementsByTagNameNS: tb.getElementsByTagNameNS.bind(tb) }).join(' ').trim();
        if (t) lines.push(`- ${t}`);
      }
      if (lines.length) txbxText = `\n\n## Text Boxes\n${lines.join('\n')}\n`;
    }
  } catch(e) {
    console.warn("[docx-import:text-boxes] failed (could be missing or malformed):", e);
    result.warnings.push("Text boxes could not be parsed");
  }

  // ── Completeness check ──
  const fileSizeKB = file.size / 1024;
  const charsPerKB = (mainBody + commentsText + footnotesText + endnotesText + hfText + txbxText).length / fileSizeKB;
  if (fileSizeKB > 20 && charsPerKB < 10) {
    result.warnings.push('Output seems short for the file size — the document may contain mostly images, complex SmartArt, or embedded objects that couldn\'t be extracted');
  }

  result.text = (mainBody + commentsText + footnotesText + endnotesText + hfText + txbxText).trim();
  return result;
}

// ============================================================
//  PPTX EXTRACTION (v3.25.0 — full-fidelity)
//  Replaces fragile <a:t> regex with proper DOMParser walk.
//  Adds: speaker notes, slide title separation, embedded
//  tables → markdown, SmartArt diagrams, and chart labels.
// ============================================================
async function extractPPTX(file) {
  const result = { text: '', warnings: [], sourceType: 'pptx' };
  if (!window.JSZip) throw new Error('JSZip not loaded — refresh the page and try again');

  const arrayBuffer = await file.arrayBuffer();
  const zip = await window.JSZip.loadAsync(arrayBuffer);
  const parser = new DOMParser();

  // Sorted slide list.
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide[0-9]+\.xml$/.test(name))
    .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));

  // Helper — read XML and parse.
  const readXML = async (path) => {
    if (!zip.files[path]) return null;
    const xml = await zip.files[path].async('text');
    return parser.parseFromString(xml, 'text/xml');
  };

  // Helper — collect text from <a:t> nodes inside a node, in document order.
  const collectText = (node) => {
    const ts = node.getElementsByTagNameNS('*', 't');
    const out = [];
    for (const t of Array.from(ts)) {
      const txt = (t.textContent || '').trim();
      if (txt) out.push(txt);
    }
    return out.join(' ').trim();
  };

  // Helper — paragraph-by-paragraph text (a:p) preserving line breaks.
  const collectParas = (node) => {
    const ps = node.getElementsByTagNameNS('*', 'p');
    return Array.from(ps).map(p => collectText(p)).filter(Boolean);
  };

  // Helper — convert an <a:tbl> to a markdown table.
  const tblToMarkdown = (tblNode) => {
    const rows = tblNode.getElementsByTagNameNS('*', 'tr');
    if (!rows.length) return '';
    const matrix = [];
    for (const tr of Array.from(rows)) {
      const cells = tr.getElementsByTagNameNS('*', 'tc');
      const cellTexts = Array.from(cells).map(tc => collectText(tc).replace(/\|/g, '\\|'));
      matrix.push(cellTexts);
    }
    if (!matrix.length) return '';
    const cols = matrix[0].length;
    const sep = Array(cols).fill('---');
    const lines = [
      '| ' + matrix[0].map(c => c || ' ').join(' | ') + ' |',
      '| ' + sep.join(' | ') + ' |',
      ...matrix.slice(1).map(row => '| ' + row.map(c => c || ' ').join(' | ') + ' |')
    ];
    return lines.join('\n');
  };

  let allText = '';
  const warningSlides = [];
  let totalNotes = 0;
  let totalTables = 0;
  let totalSmartArt = 0;
  let totalCharts = 0;

  for (const slideFile of slideFiles) {
    const slideNum = parseInt(slideFile.match(/slide(\d+)/)[1]);
    const slideDoc = await readXML(slideFile);
    if (!slideDoc) continue;

    // ── Title detection ──
    // Look for shapes with placeholder type "title" or "ctrTitle".
    let title = '';
    const sps = slideDoc.getElementsByTagNameNS('*', 'sp');
    let titleSp = null;
    let bodySps = [];
    for (const sp of Array.from(sps)) {
      const phs = sp.getElementsByTagNameNS('*', 'ph');
      let isTitle = false;
      for (const ph of Array.from(phs)) {
        const ptype = ph.getAttribute('type');
        if (ptype === 'title' || ptype === 'ctrTitle') { isTitle = true; break; }
      }
      if (isTitle && !titleSp) titleSp = sp;
      else bodySps.push(sp);
    }
    if (titleSp) title = collectText(titleSp);

    // ── Body content (non-title shapes) ──
    const bodyParas = [];
    for (const sp of bodySps) {
      const paras = collectParas(sp);
      bodyParas.push(...paras);
    }

    // ── Embedded tables ──
    const tables = slideDoc.getElementsByTagNameNS('*', 'tbl');
    const tableMd = [];
    for (const tbl of Array.from(tables)) {
      const md = tblToMarkdown(tbl);
      if (md) { tableMd.push(md); totalTables++; }
    }

    // ── Slide section assembly ──
    const heading = title ? `## Slide ${slideNum}: ${title}` : `## Slide ${slideNum}`;
    let slideOut = heading + '\n';
    if (bodyParas.length) slideOut += bodyParas.map(p => `- ${p}`).join('\n') + '\n';
    if (tableMd.length) slideOut += '\n' + tableMd.join('\n\n') + '\n';

    if (!title && !bodyParas.length && !tableMd.length) {
      warningSlides.push(slideNum);
      continue;
    }

    // ── Speaker notes ──
    // notesSlide files reference their slide via _rels — but the simpler
    // 1:1 mapping (notesSlideN.xml ↔ slideN.xml) works for typical decks.
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    if (zip.files[notesPath]) {
      const notesDoc = await readXML(notesPath);
      if (notesDoc) {
        // Strip the auto-generated slide-number placeholder text that always
        // appears at the bottom of the notes slide.
        const notesText = collectParas(notesDoc).filter(p => !/^\d+$/.test(p)).join(' ').trim();
        if (notesText) {
          slideOut += `\n**Speaker notes:** ${notesText}\n`;
          totalNotes++;
        }
      }
    }

    allText += slideOut + '\n';
  }

  // ── SmartArt (diagrams) ──
  const diagramPaths = Object.keys(zip.files).filter(p => /^ppt\/diagrams\/data\d+\.xml$/.test(p));
  if (diagramPaths.length) {
    const lines = [];
    for (const dp of diagramPaths) {
      const ddoc = await readXML(dp);
      if (!ddoc) continue;
      // pt elements contain the actual node text.
      const pts = ddoc.getElementsByTagNameNS('*', 'pt');
      for (const pt of Array.from(pts)) {
        const t = collectText(pt);
        if (t) lines.push(`- ${t}`);
      }
      totalSmartArt++;
    }
    if (lines.length) allText += `\n## SmartArt Diagrams\n${lines.join('\n')}\n`;
  }

  // ── Chart data ──
  const chartPaths = Object.keys(zip.files).filter(p => /^ppt\/charts\/chart\d+\.xml$/.test(p));
  if (chartPaths.length) {
    const lines = [];
    for (const cp of chartPaths) {
      const cdoc = await readXML(cp);
      if (!cdoc) continue;
      const titles = cdoc.getElementsByTagNameNS('*', 'title');
      for (const tt of Array.from(titles)) {
        const t = collectText(tt);
        if (t) lines.push(`- Chart title: ${t}`);
      }
      const cats = cdoc.getElementsByTagNameNS('*', 'cat');
      for (const cn of Array.from(cats)) {
        const t = collectText(cn);
        if (t) lines.push(`- Categories: ${t}`);
      }
      const sers = cdoc.getElementsByTagNameNS('*', 'ser');
      for (const sn of Array.from(sers)) {
        const tx = sn.getElementsByTagNameNS('*', 'tx');
        if (tx.length) {
          const t = collectText(tx[0]);
          if (t) lines.push(`- Series: ${t}`);
        }
      }
      totalCharts++;
    }
    if (lines.length) allText += `\n## Charts\n${lines.join('\n')}\n`;
  }

  if (!allText.trim()) {
    throw new Error('No text found in this PowerPoint — the presentation may be entirely image-based. Try Paste Text instead.');
  }

  if (warningSlides.length > 0) {
    result.warnings.push(`Slide${warningSlides.length > 1 ? 's' : ''} ${warningSlides.join(', ')} had no extractable text — may be image-only. Check those slides and paste any missing content into the working document manually.`);
  }
  if (totalNotes > 0) result.warnings.push(`Speaker notes captured from ${totalNotes} slide${totalNotes === 1 ? '' : 's'}`);
  if (totalTables > 0) result.warnings.push(`${totalTables} embedded table${totalTables === 1 ? '' : 's'} converted to markdown`);

  result.text = allText.trim();
  return result;
}

// ============================================================
//  XLSX EXTRACTION (v3.25.0 — new)
//  All visible sheets converted to markdown tables. Multi-sheet
//  workbooks present a sheet picker (radio in single mode for
//  Starting Doc, checkboxes in multi mode for Reference Material).
//  Formulas evaluated to displayed values. Merged cells flattened.
//  Hidden sheets surfaced via warning. Cell comments and defined
//  names captured in footer/header sections.
// ============================================================
async function extractXLSX(file, options = {}) {
  if (!window.XLSX) throw new Error('SheetJS not loaded — refresh the page and try again');

  const arrayBuffer = await file.arrayBuffer();
  const wb = window.XLSX.read(arrayBuffer, {
    type: 'array',
    cellFormula: false,    // formulas evaluated to displayed values
    cellHTML: false,
    cellNF: false,
    sheetStubs: true,
    cellDates: true,
  });

  const visibleSheets = [];
  const hiddenSheets = [];
  for (const name of wb.SheetNames) {
    // Workbook-level Sheets entry has Hidden: 0/1/2 (visible/hidden/very-hidden).
    const wbSheet = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets.find(s => s.name === name) : null;
    const hiddenFlag = wbSheet ? wbSheet.Hidden : 0;
    if (hiddenFlag && hiddenFlag !== 0) hiddenSheets.push(name);
    else visibleSheets.push(name);
  }

  if (!visibleSheets.length) {
    throw new Error('Workbook has no visible sheets — all sheets are hidden');
  }

  const baseFileName = file.name;
  const mode = options.xlsxMode || 'multi'; // 'single' = starting doc, 'multi' = ref material

  // Defined names (workbook-level) — surface as a glossary header.
  let definedNamesText = '';
  if (wb.Workbook && wb.Workbook.Names && wb.Workbook.Names.length) {
    const lines = wb.Workbook.Names
      .filter(n => n.Name && n.Ref)
      .map(n => `- **${n.Name}** → ${n.Ref}${n.Comment ? ' — ' + n.Comment : ''}`);
    if (lines.length) definedNamesText = `## Defined Names\n${lines.join('\n')}\n\n`;
  }

  // Single sheet — auto-pick, no modal.
  if (visibleSheets.length === 1) {
    const sheetName = visibleSheets[0];
    const sheetMd = sheetToMarkdown(wb, sheetName);
    const provenance = `> *Converted from Excel — formulas evaluated, merged cells flattened, hidden sheets ${hiddenSheets.length ? `(${hiddenSheets.length}) skipped` : 'none'}, cell formatting/colors not preserved*`;
    const text = `${provenance}\n\n${definedNamesText}## Sheet: ${sheetName}\n\n${sheetMd}`;

    const warnings = [];
    if (hiddenSheets.length) warnings.push(`${hiddenSheets.length} hidden sheet${hiddenSheets.length === 1 ? '' : 's'} skipped: ${hiddenSheets.join(', ')}`);
    return [{
      text,
      warnings,
      sourceType: 'xlsx',
      suggestedName: `${baseFileName} → ${sheetName}`
    }];
  }

  // Multiple visible sheets — show picker.
  const picked = await showSheetPickerModal(wb, visibleSheets, hiddenSheets, mode, baseFileName);
  if (!picked || !picked.length) {
    throw new Error('Sheet selection cancelled');
  }

  const provenance = `> *Converted from Excel — formulas evaluated, merged cells flattened, hidden sheets ${hiddenSheets.length ? `(${hiddenSheets.length}) skipped` : 'none'}, cell formatting/colors not preserved*`;

  if (mode === 'single') {
    // Concatenate selected sheets into a single doc for the Starting Doc.
    const sections = picked.map(name => `## Sheet: ${name}\n\n${sheetToMarkdown(wb, name)}`);
    const text = `${provenance}\n\n${definedNamesText}${sections.join('\n\n')}`;
    const warnings = [];
    if (hiddenSheets.length) warnings.push(`${hiddenSheets.length} hidden sheet${hiddenSheets.length === 1 ? '' : 's'} skipped: ${hiddenSheets.join(', ')}`);
    if (picked.length < visibleSheets.length) warnings.push(`${visibleSheets.length - picked.length} of ${visibleSheets.length} visible sheets skipped per your selection`);
    return [{
      text,
      warnings,
      sourceType: 'xlsx',
      suggestedName: picked.length === 1 ? `${baseFileName} → ${picked[0]}` : `${baseFileName} (${picked.length} sheets)`
    }];
  }

  // multi mode — one ref doc per selected sheet.
  return picked.map(name => {
    const sheetMd = sheetToMarkdown(wb, name);
    const text = `${provenance}\n\n${definedNamesText}## Sheet: ${name}\n\n${sheetMd}`;
    const warnings = [];
    if (hiddenSheets.length) warnings.push(`${hiddenSheets.length} hidden sheet${hiddenSheets.length === 1 ? '' : 's'} skipped from workbook: ${hiddenSheets.join(', ')}`);
    return {
      text,
      warnings,
      sourceType: 'xlsx',
      suggestedName: `${baseFileName} → ${name}`
    };
  });
}

// Convert a single XLSX sheet into a markdown table.
// Handles merged cells (value repetition), trims empty rows/cols,
// captures cell comments as a footer section, and surfaces a column-
// width warning for very wide sheets.
function sheetToMarkdown(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet || !sheet['!ref']) return '_(empty sheet)_';

  // Use sheet_to_json with header:1 to get a row-of-arrays structure,
  // then format ourselves so we can apply merge handling and trimming.
  const rows = window.XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,         // formatted strings (e.g., "$1,250.00", "15%")
    defval: '',
    blankrows: false,
  });

  if (!rows.length) return '_(empty sheet)_';

  // Apply merged-cell flattening — repeat top-left value across span.
  const merges = sheet['!merges'] || [];
  for (const m of merges) {
    const tl = rows[m.s.r] && rows[m.s.r][m.s.c];
    if (tl === undefined || tl === '') continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        if (!rows[r]) rows[r] = [];
        rows[r][c] = tl;
      }
    }
  }

  // Determine the actual column count used (max row length across all rows).
  let maxCols = 0;
  for (const row of rows) {
    if (row && row.length > maxCols) maxCols = row.length;
  }

  // Pad ragged rows to maxCols.
  for (let r = 0; r < rows.length; r++) {
    if (!rows[r]) rows[r] = [];
    while (rows[r].length < maxCols) rows[r].push('');
  }

  // Trim leading/trailing empty columns.
  const colHasContent = new Array(maxCols).fill(false);
  for (const row of rows) {
    for (let c = 0; c < maxCols; c++) {
      if (row[c] !== '' && row[c] !== null && row[c] !== undefined) colHasContent[c] = true;
    }
  }
  let firstCol = colHasContent.indexOf(true);
  let lastCol = colHasContent.lastIndexOf(true);
  if (firstCol === -1) return '_(empty sheet)_';

  const trimmedRows = rows
    .map(row => row.slice(firstCol, lastCol + 1))
    .filter(row => row.some(v => v !== '' && v !== null && v !== undefined));

  if (!trimmedRows.length) return '_(empty sheet)_';

  // Escape pipes in cell content and stringify.
  const cellStr = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (s instanceof Date || (typeof v === 'object' && v.toISOString)) s = v.toISOString();
    return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
  };

  const cols = trimmedRows[0].length;
  const header = trimmedRows[0].map(cellStr).map(c => c || ' ');
  const sep = Array(cols).fill('---');
  const body = trimmedRows.slice(1).map(row => row.map(cellStr).map(c => c || ' '));

  const lines = [
    '| ' + header.join(' | ') + ' |',
    '| ' + sep.join(' | ') + ' |',
    ...body.map(r => '| ' + r.join(' | ') + ' |')
  ];

  // Cell comments → footer.
  const commentLines = [];
  for (const addr of Object.keys(sheet)) {
    if (addr[0] === '!') continue;
    const cell = sheet[addr];
    if (cell && cell.c && cell.c.length) {
      const text = cell.c.map(c => (c.t || '').trim()).filter(Boolean).join(' ');
      if (text) commentLines.push(`- **${addr}**: ${text}`);
    }
  }

  let out = lines.join('\n');
  if (commentLines.length) {
    out += `\n\n**Cell notes:**\n${commentLines.join('\n')}`;
  }
  if (cols > 15) {
    out = `> *Wide sheet (${cols} columns) — markdown table comprehension by AIs may degrade past ~15 columns*\n\n` + out;
  }
  return out;
}

// ── Sheet picker modal ──
// Returns Promise<Array<string>> — names of selected sheets, or empty array
// on cancel. Mode 'single' uses radio buttons (forces one selection, but
// the user can still pick multiple via the checkbox toggle for combined import).
// Mode 'multi' uses checkboxes (one ref doc per selected sheet).
function showSheetPickerModal(wb, visibleSheets, hiddenSheets, mode, fileName) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('sheetPickerModal');
    if (!overlay) { resolve([]); return; }

    const isSingle = mode === 'single';
    const inputType = isSingle ? 'checkbox' : 'checkbox'; // both modes: checkboxes; single concatenates

    const titleEl = overlay.querySelector('.sheet-picker-title');
    const subtitleEl = overlay.querySelector('.sheet-picker-subtitle');
    const listEl = overlay.querySelector('.sheet-picker-list');
    const hiddenEl = overlay.querySelector('.sheet-picker-hidden');
    const confirmBtn = overlay.querySelector('.sheet-picker-confirm');
    const cancelBtn = overlay.querySelector('.sheet-picker-cancel');

    titleEl.textContent = `📊 Select sheets from ${fileName}`;
    subtitleEl.textContent = isSingle
      ? 'Selected sheets will be combined into a single Starting Document, separated by sheet headings.'
      : 'Each selected sheet becomes its own Reference Material document with independent token tracking and reordering.';

    // Estimate token count per sheet for the picker display.
    const rows = listEl;
    rows.innerHTML = '';
    visibleSheets.forEach((name, idx) => {
      const sheet = wb.Sheets[name];
      const ref = sheet && sheet['!ref'] ? window.XLSX.utils.decode_range(sheet['!ref']) : null;
      const cellCount = ref ? (ref.e.r - ref.s.r + 1) * (ref.e.c - ref.s.c + 1) : 0;
      // Quick token estimate — convert sheet to simple text and chars/4.
      let approxTokens = 0;
      try {
        const sample = window.XLSX.utils.sheet_to_csv(sheet, { FS: ' ', RS: ' ' });
        approxTokens = Math.round(sample.length / 4);
      } catch(e) {}
      const row = document.createElement('label');
      row.className = 'sheet-picker-row';
      row.innerHTML = `
        <input type="${inputType}" class="sheet-picker-checkbox" value="${idx}" checked>
        <span class="sheet-picker-name">${escapeHtml(name)}</span>
        <span class="sheet-picker-meta">${cellCount.toLocaleString()} cells · ~${approxTokens.toLocaleString()} tokens</span>
      `;
      rows.appendChild(row);
    });

    if (hiddenSheets.length) {
      hiddenEl.textContent = `${hiddenSheets.length} hidden sheet${hiddenSheets.length === 1 ? '' : 's'} skipped: ${hiddenSheets.join(', ')}`;
      hiddenEl.style.display = 'block';
    } else {
      hiddenEl.style.display = 'none';
    }

    const cleanup = () => {
      overlay.classList.remove('active');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      overlay.onclick = null;
    };

    confirmBtn.onclick = () => {
      const checked = Array.from(listEl.querySelectorAll('.sheet-picker-checkbox:checked'));
      const selected = checked.map(cb => visibleSheets[parseInt(cb.value, 10)]);
      cleanup();
      resolve(selected);
    };
    cancelBtn.onclick = () => { cleanup(); resolve([]); };
    overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve([]); } };

    overlay.classList.add('active');
  });
}

// Lightweight HTML escape for the sheet picker labels.
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================================
//  VISION TRANSCRIPTION (v3.25.0 — multi-provider)
//  Supports the four built-in vision providers: ChatGPT (GPT-4o),
//  Claude (Sonnet/Opus 4 family), Gemini (1.5+), and Grok (vision).
// ============================================================
async function runVisionTranscription(pageImages, visionCfg, visionKey) {
  const prompt = 'Transcribe all text from these document pages exactly as it appears. Preserve paragraph breaks and section structure. Return only the plain text — no commentary, no formatting symbols.';

  // ── ChatGPT (OpenAI) ──
  if (visionCfg.provider === 'chatgpt') {
    const body = JSON.stringify({
      model: visionCfg.model || VISION_DEFAULTS.chatgpt,
      messages: [{ role: 'user', content: [
        ...pageImages.map(b64 => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' } })),
        { type: 'text', text: prompt }
      ]}],
      max_tokens: 4096
    });
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visionKey}` },
      body
    });
    const data = await resp.json();
    const transcribed = data?.choices?.[0]?.message?.content || '';
    if (!transcribed.trim()) throw new Error('ChatGPT vision returned no text');
    return transcribed;
  }

  // ── Claude (Anthropic) — via WaxFrame proxy ──
  if (visionCfg.provider === 'claude') {
    const claudeModel = visionCfg.model || VISION_DEFAULTS.claude;
    const body = JSON.stringify({
      model: claudeModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: [
        ...pageImages.map(b64 => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } })),
        { type: 'text', text: prompt }
      ]}]
    });
    const resp = await fetch(visionCfg.endpoint || 'https://waxframe-claude-proxy.weirdave.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': visionKey, 'anthropic-version': '2023-06-01' },
      body
    });
    const data = await resp.json();
    const transcribed = data?.content?.[0]?.text || '';
    if (!transcribed.trim()) throw new Error('Claude vision returned no text');
    return transcribed;
  }

  // ── Gemini (Google) ──
  if (visionCfg.provider === 'gemini') {
    const geminiModel = visionCfg.model || VISION_DEFAULTS.gemini;
    const body = JSON.stringify({
      contents: [{ parts: [
        ...pageImages.map(b64 => ({ inline_data: { mime_type: 'image/jpeg', data: b64 } })),
        { text: prompt }
      ]}]
    });
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': visionKey }, body }
    );
    const data = await resp.json();
    const transcribed = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!transcribed.trim()) throw new Error('Gemini vision returned no text');
    return transcribed;
  }

  // ── Grok (xAI) — OpenAI-compatible ──
  if (visionCfg.provider === 'grok') {
    const grokModel = visionCfg.model || VISION_DEFAULTS.grok;
    const body = JSON.stringify({
      model: grokModel,
      messages: [{ role: 'user', content: [
        ...pageImages.map(b64 => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' } })),
        { type: 'text', text: prompt }
      ]}],
      max_tokens: 4096
    });
    const resp = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visionKey}` },
      body
    });
    const data = await resp.json();
    const transcribed = data?.choices?.[0]?.message?.content || '';
    if (!transcribed.trim()) throw new Error('Grok vision returned no text');
    return transcribed;
  }

  throw new Error(`Provider ${visionCfg.provider} does not have a vision integration`);
}

// v3.52.7 — loadScript helper removed. Was retained "for future on-demand
// needs" but all libraries are boot-loaded via index.html, no current
// caller existed, and the function had been parked since v3.36.x. Audited
// across /js and /*.html — zero references outside this comment.

function showReExtractBanner() {
  const sourceType = localStorage.getItem('waxframe_v2_source_type') || '';
  const hasPDFPages = localStorage.getItem('waxframe_v2_has_pdf_pages') === '1';
  const banner = document.getElementById('reExtractBanner');
  if (!banner) return;
  // Only show for PDF imports, only before any rounds have run
  if ((sourceType === 'pdf' || sourceType === 'pdf-vision') && round === 1 && history.length === 0) {
    banner.style.display = 'flex';
    const btn = document.getElementById('reExtractBtn');
    if (btn) {
      btn.disabled = !hasPDFPages && !window._lastPDFPages;
      btn.title = (!hasPDFPages && !window._lastPDFPages)
        ? 'PDF pages not available — please re-upload the file from the Project screen'
        : 'Re-extract this PDF using AI vision';
    }
  } else {
    banner.style.display = 'none';
  }
}

async function reExtractWithVision() {
  const btn = document.getElementById('reExtractBtn');
  const banner = document.getElementById('reExtractBanner');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Extracting — this may take 15–30 seconds…'; }

  const visionAI = getVisionCapableAI();
  if (!visionAI) {
    toast('⚠️ No vision AI available — add a ChatGPT, Claude, Gemini, or Grok API key first');
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Re-extract with AI Vision'; }
    return;
  }

  try {
    const pageImages = window._lastPDFPages;
    if (!pageImages || pageImages.length === 0) {
      toast('⚠️ PDF pages not available — please re-upload from the Project screen');
      if (btn) { btn.disabled = false; btn.textContent = '🔍 Re-extract with AI Vision'; }
      return;
    }

    consoleLog(`🔍 Re-extracting PDF via ${visionAI.cfg.label} vision…`, 'info');
    const transcribed = await runVisionTranscription(pageImages, visionAI.cfg, visionAI.key);

    docText = transcribed;
    const docTa = document.getElementById('workDocument');
    if (docTa) { docTa.value = transcribed; updateLineNumbers(); }
    saveSession();
    localStorage.setItem('waxframe_v2_source_type', 'pdf-vision');

    consoleLog(`✅ Re-extraction complete — ${transcribed.length.toLocaleString()} characters via ${visionAI.cfg.label}`, 'success');
    toast(`✅ Document re-extracted successfully via ${visionAI.cfg.label}`);
    if (banner) banner.style.display = 'none';
  } catch(e) {
    consoleLog(`❌ Re-extraction failed: ${e.message}`, 'error', {
      status:  'EXTRACT_FAIL',
      rawJson: e.stack || e.message || String(e)
    });
    toast(`❌ Re-extraction failed: ${e.message}`);
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Re-extract with AI Vision'; }
  }
}


// ============================================================
//  v3.21.0 — REFERENCE MATERIAL MODULE
//  Source material the hive cites against every round but never edits.
//  Distinct from Notes (round-to-round Builder directives) and from
//  the Starting Document (the artifact under construction).
// ============================================================

// ── Reference Material multi-document helpers (v3.24.0) ──
// Source of truth is the `referenceDocs` array (declared near top of file).
// All UI actions mutate that array, then trigger a re-render of the cards
// container(s) and a recompute of the grand-total counter row.

// Soft-warning threshold — total reference material exceeding this many
// estimated tokens triggers a non-blocking UI hint that some AIs may
// truncate or reject. Most provider context windows in 2026 are 100k–1M
// tokens; 150k is a conservative midpoint that flags genuinely heavy use
// without nagging routine sessions.
const REF_TOKEN_SOFT_WARN = 150000;

// Render the card list into both surfaces if present (Setup 4 + work drawer).
// Called after any structural change (add / remove / move). Text and name
// edits do NOT call this — they mutate state in place via per-input handlers
// to preserve focus and avoid re-render churn while typing.
function renderReferenceCards() {
  ['refCardsSetup', 'refCardsDrawer'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!referenceDocs.length) {
      container.innerHTML = `<div class="ref-cards-empty">No reference material yet.</div>`;
      return;
    }
    container.innerHTML = referenceDocs.map((doc, idx) => refCardMarkup(doc, idx)).join('');
  });
  // v3.29.1 — populate line-number gutters for every paste-mode card.
  // Re-runs on every renderReferenceCards call (initial mount, add, remove,
  // reorder) since the DOM was just rebuilt and the gutters are empty.
  referenceDocs.forEach(doc => {
    if (doc.source === 'paste') updateRefLineNumbers(doc.id);
  });
}

// File-type → inline SVG icon for reference cards. Each upload type gets a
// solid-color document-with-folded-corner tab with a bold white extension
// label across the bottom AND type-appropriate decorative content (text
// lines for prose docs, a slide layout for PPT, a grid for XLS, a hash +
// bullet pattern for MD). All inline SVG — no external assets, air-gap
// safe, scales crisp at any size, no font-rendering inconsistencies across
// OSes that emoji-based icons would have. Pasted text gets a purple
// clipboard alternate matching the .wf-icon-paste used on action cards.
function getRefSourceIcon(doc) {
  const wrap = (inner) =>
    `<svg viewBox="0 0 32 36" width="22" height="25" class="ref-card-source-icon" aria-hidden="true">${inner}</svg>`;
  const docBody = (color) =>
    `<path d="M4 2 H20 L28 10 V32 Q28 34 26 34 H6 Q4 34 4 32 Z" fill="${color}"/>` +
    `<path d="M20 2 V10 H28 Z" fill="rgba(255,255,255,0.35)"/>` +
    `<path d="M20 2 L28 10" stroke="rgba(0,0,0,0.15)" stroke-width="0.6" fill="none"/>`;
  const label = (text, y) =>
    `<text x="16" y="${y || 30}" text-anchor="middle" font-size="8" font-weight="800" fill="#ffffff" font-family="Arial,sans-serif" letter-spacing="0.3">${text}</text>`;
  const textLines = (lengths) =>
    lengths.map((len, i) =>
      `<line x1="7" y1="${14 + i * 3.5}" x2="${7 + len}" y2="${14 + i * 3.5}" stroke="rgba(255,255,255,0.6)" stroke-width="1.4"/>`
    ).join('');

  if (doc.source !== 'upload') {
    // Pasted text — purple clipboard glyph matching .wf-icon-paste in index.html
    return wrap(
      '<rect x="6" y="4" width="20" height="28" rx="3" fill="#5E35B1"/>' +
      '<rect x="11" y="2" width="10" height="5" rx="1" fill="#3E2A78"/>' +
      '<line x1="9" y1="14" x2="23" y2="14" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>' +
      '<line x1="9" y1="18" x2="23" y2="18" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>' +
      '<line x1="9" y1="22" x2="23" y2="22" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>' +
      '<line x1="9" y1="26" x2="18" y2="26" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>'
    );
  }
  const name = (doc.filename || doc.name || '').toLowerCase();
  if (name.endsWith('.pdf')) {
    return wrap(docBody('#E53935') + textLines([11, 15, 13]) + label('PDF'));
  }
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return wrap(docBody('#1976D2') + textLines([15, 15, 11]) + label('DOC'));
  }
  if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
    // Slide rectangle on top + 2 caption lines below
    return wrap(
      docBody('#F57C00') +
      '<rect x="7" y="13" width="15" height="5" rx="0.5" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>' +
      '<line x1="7" y1="20.5" x2="22" y2="20.5" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>' +
      '<line x1="7" y1="23" x2="18" y2="23" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>' +
      label('PPT', 32)
    );
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm') || name.endsWith('.xls')) {
    // 3×2 grid suggesting spreadsheet cells
    return wrap(
      docBody('#2E7D32') +
      '<line x1="7" y1="13" x2="22" y2="13" stroke="rgba(255,255,255,0.7)" stroke-width="1.1"/>' +
      '<line x1="7" y1="17" x2="22" y2="17" stroke="rgba(255,255,255,0.7)" stroke-width="1.1"/>' +
      '<line x1="7" y1="21" x2="22" y2="21" stroke="rgba(255,255,255,0.7)" stroke-width="1.1"/>' +
      '<line x1="11.5" y1="11" x2="11.5" y2="22" stroke="rgba(255,255,255,0.7)" stroke-width="1.1"/>' +
      '<line x1="17" y1="11" x2="17" y2="22" stroke="rgba(255,255,255,0.7)" stroke-width="1.1"/>' +
      label('XLS')
    );
  }
  if (name.endsWith('.md')) {
    // Markdown hash glyph + lines
    return wrap(
      docBody('#00897B') +
      '<text x="7" y="17" font-size="6" font-weight="800" fill="rgba(255,255,255,0.7)" font-family="Arial,sans-serif">#</text>' +
      '<line x1="11" y1="14.5" x2="22" y2="14.5" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>' +
      '<line x1="7" y1="20" x2="22" y2="20" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>' +
      '<line x1="7" y1="23" x2="18" y2="23" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>' +
      label('MD', 31.5)
    );
  }
  if (name.endsWith('.txt')) {
    return wrap(docBody('#546E7A') + textLines([15, 15, 13]) + label('TXT'));
  }
  return wrap(docBody('#9aa3b8')); // unknown extension — plain document silhouette
}

// Tooltip label paired with the icon — surfaced via the source-badge title attr.
function getRefSourceLabel(doc) {
  if (doc.source !== 'upload') return 'Pasted text';
  const name = (doc.filename || doc.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF document';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'Word document';
  if (name.endsWith('.pptx') || name.endsWith('.ppt')) return 'PowerPoint document';
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm') || name.endsWith('.xls')) return 'Excel spreadsheet';
  if (name.endsWith('.md')) return 'Markdown file';
  if (name.endsWith('.txt')) return 'Plain text file';
  return 'Uploaded file';
}

// Build a single card's markup. Source-mode determines whether the body shows
// a textarea (paste) or a read-only file-status row (upload). The name input
// is always editable. Up/Down arrows hide on first/last to avoid no-op clicks.
function refCardMarkup(doc, index) {
  const total = referenceDocs.length;
  const isFirst = index === 0;
  const isLast  = index === total - 1;
  const stats = computeRefStats(doc.text);
  const sourceIcon  = getRefSourceIcon(doc);
  const sourceLabel = getRefSourceLabel(doc);
  const idAttr = esc(doc.id);

  const upBtn   = total > 1 && !isFirst ? `<button class="btn btn-sm ref-card-arrow" title="Move up" onclick="moveReferenceDocUp('${idAttr}')">▲</button>` : '';
  const downBtn = total > 1 && !isLast  ? `<button class="btn btn-sm ref-card-arrow" title="Move down" onclick="moveReferenceDocDown('${idAttr}')">▼</button>` : '';
  // Position badge sits between the up/down arrows so the number changes
  // visibly right where the user clicks — no manual needed to explain that
  // first-listed material reads as most authoritative to the hive.
  const positionLabel = total > 1
    ? `<span class="ref-card-position" title="Position ${index + 1} of ${total} — first-listed material reads as most authoritative to The Hive. Use the arrows to reorder.">${index + 1}</span>`
    : '';

  const body = doc.source === 'upload'
    ? `<div class="ref-card-upload-status">${sourceIcon} <strong>${esc(doc.filename || doc.name)}</strong> — ${stats.chars.toLocaleString()} chars · text is read-only · remove and re-upload to replace</div>`
    : `<div class="ref-card-paste-wrap">
         <div class="ref-card-line-numbers" id="refLineNums-${idAttr}"></div>
         <textarea class="ref-card-ta" id="refTa-${idAttr}" placeholder="Paste reference material here…" oninput="updateReferenceDocText('${idAttr}', this.value)">${esc(doc.text)}</textarea>
       </div>`;

  return `
<div class="ref-card" data-ref-id="${idAttr}">
  <div class="ref-card-hdr">
    <span class="ref-card-position" title="Position ${index + 1} of ${total} — first-listed material reads as most authoritative to the hive. Use the arrows to reorder.">${index + 1}</span>
    <span class="ref-card-source-badge" title="${sourceLabel}">${sourceIcon}</span>
    <input type="text" class="ref-card-name" value="${esc(doc.name)}"
           oninput="renameReferenceDoc('${idAttr}', this.value)"
           aria-label="Reference document name"
           placeholder="Reference name…">
    <div class="ref-card-actions">
      ${upBtn}${positionLabel}${downBtn}
      <button class="btn btn-sm ref-card-remove" title="Remove" onclick="removeReferenceDoc('${idAttr}')">✕</button>
    </div>
  </div>
  <div class="ref-card-body">
    ${body}
    <div class="ref-card-counters" id="refCardCounters-${idAttr}">
      <span class="ref-counter-item"><span class="ref-counter-sublabel">Chars:</span> <span class="ref-card-count-chars">${stats.chars.toLocaleString()}</span></span>
      <span class="ref-counter-item"><span class="ref-counter-sublabel">Words:</span> <span class="ref-card-count-words">${stats.words.toLocaleString()}</span></span>
      <span class="ref-counter-item"><span class="ref-counter-sublabel">Lines:</span> <span class="ref-card-count-lines">${stats.lines.toLocaleString()}</span></span>
      <span class="ref-counter-item"><span class="ref-counter-sublabel">Paragraphs:</span> <span class="ref-card-count-paragraphs">${stats.paragraphs.toLocaleString()}</span></span>
      <span class="ref-counter-item"><span class="ref-counter-sublabel">Tokens (est.):</span> <span class="ref-card-count-tokens">${stats.tokens.toLocaleString()}</span></span>
    </div>
  </div>
</div>`;
}

// Per-doc stats helper — chars, words, lines, paragraphs, estimated tokens.
// Used by card render and by the grand-total computation. Token estimate
// uses chars/4 rule of thumb (same as estimateTokens elsewhere) which is a
// rough but consistent English-text approximation.
// v3.29.1 — added lines (logical, split on \n) and paragraphs (blocks
// separated by one or more blank lines). These are per-card metrics; they
// don't sum meaningfully across multiple docs so they stay off the grand
// totals header — that's how the per-card counters earn their keep.
function computeRefStats(text) {
  const t = text || '';
  const chars = t.length;
  const words = t.trim() ? t.trim().split(/\s+/).filter(Boolean).length : 0;
  const tokens = Math.round(chars / 4);
  const lines = t === '' ? 0 : t.split('\n').length;
  const paragraphs = t.trim()
    ? t.trim().split(/\n\s*\n/).filter(p => {
        // v3.39.2 — Match countInUnit: paragraph requires terminal
        // sentence punctuation (.!?). Headers and section dividers no
        // longer inflate the count.
        const trimmed = p.trim();
        return trimmed.length > 0 && /[.!?]/.test(trimmed);
      }).length
    : 0;
  return { chars, words, tokens, lines, paragraphs };
}

// Add a new empty paste-mode reference document and focus its textarea so
// the user can start typing immediately. Auto-named with the next available
// "Reference N" slot — N is one past the highest existing default index.
function addReferenceDoc() {
  const usedNumbers = referenceDocs
    .map(d => /^Reference (\d+)$/.exec(d.name))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10));
  const nextN = (usedNumbers.length ? Math.max(...usedNumbers) : 0) + 1;
  referenceDocs.push({
    id: generateRefDocId(),
    name: `Reference ${nextN}`,
    text: '',
    source: 'paste',
    filename: null,
  });
  renderReferenceCards();
  updateRefGrandTotals();
  saveProject();
  // Focus the new card's textarea so the user can start typing
  setTimeout(() => {
    const newCard = document.querySelector(`[data-ref-id="${referenceDocs[referenceDocs.length - 1].id}"] .ref-card-ta`);
    if (newCard) newCard.focus();
  }, 50);
}

// Remove a reference doc by id. Confirmation prompt only fires if the doc
// has non-trivial content (>20 chars) — empty/short cards remove silently
// to avoid annoying the user mid-cleanup.
// ── Reference Material confirmation modal helpers (v3.25.3) ──
// Replaces the previous use of native confirm() for per-doc remove and
// clear-all. WaxFrame-styled modal matches the rest of the app and copy
// adapts to context (pre-launch vs post-launch). Module-level pending-action
// holder is set when the modal opens, executed on confirm, cleared on cancel.
let _refConfirmAction = null;

function showRefConfirm({ title, body, okLabel, onConfirm }) {
  const overlay = document.getElementById('refConfirmModal');
  if (!overlay) {
    // Fallback if markup is missing for any reason — preserve safe behavior
    // by skipping the action rather than triggering an unconfirmed destructive op.
    console.warn('refConfirmModal markup missing — aborting confirm');
    return;
  }
  const titleEl = document.getElementById('refConfirmTitle');
  const bodyEl  = document.getElementById('refConfirmBody');
  const okBtn   = document.getElementById('refConfirmOkBtn');
  if (titleEl) titleEl.textContent = title || 'Are you sure?';
  if (bodyEl)  bodyEl.textContent  = body  || '';
  if (okBtn)   okBtn.textContent   = okLabel || 'Confirm';
  _refConfirmAction = onConfirm;
  overlay.classList.add('active');
}

function closeRefConfirmModal() {
  const overlay = document.getElementById('refConfirmModal');
  if (overlay) overlay.classList.remove('active');
  _refConfirmAction = null;
}

function executeRefConfirm() {
  const fn = _refConfirmAction;
  closeRefConfirmModal();
  if (typeof fn === 'function') fn();
}

function removeReferenceDoc(id) {
  const doc = referenceDocs.find(d => d.id === id);
  if (!doc) return;
  const performRemove = () => {
    referenceDocs = referenceDocs.filter(d => d.id !== id);
    renderReferenceCards();
    updateRefGrandTotals();
    saveProject();
  };
  // Empty / near-empty cards remove silently — no confirmation noise for trivial undo.
  if ((doc.text || '').trim().length <= 20) {
    performRemove();
    return;
  }
  // Has substantive content — confirm. Body adapts to whether rounds have run yet:
  // pre-launch the past-rounds caveat is meaningless (and the message confused users
  // pre-v3.25.3); post-launch it's the actually-relevant detail.
  const hasRunRounds = (typeof history !== 'undefined' && history && history.length > 0);
  showRefConfirm({
    title: 'Remove this reference?',
    body: hasRunRounds
      ? `Remove "${doc.name}"? Past rounds keep their original snapshot — this only affects the next round forward.`
      : `Remove "${doc.name}"?`,
    okLabel: '🗑️ Remove',
    onConfirm: performRemove
  });
}

// Reorder by swapping with neighbor. Direction changes prompt-envelope
// section order, which AIs use to weight authority — first-listed material
// reads as most-canonical. No-ops at array edges.
function moveReferenceDocUp(id) {
  const idx = referenceDocs.findIndex(d => d.id === id);
  if (idx <= 0) return;
  [referenceDocs[idx - 1], referenceDocs[idx]] = [referenceDocs[idx], referenceDocs[idx - 1]];
  renderReferenceCards();
  saveProject();
}
function moveReferenceDocDown(id) {
  const idx = referenceDocs.findIndex(d => d.id === id);
  if (idx < 0 || idx >= referenceDocs.length - 1) return;
  [referenceDocs[idx], referenceDocs[idx + 1]] = [referenceDocs[idx + 1], referenceDocs[idx]];
  renderReferenceCards();
  saveProject();
}

// Live name update — does NOT re-render. Empty input is silently ignored
// (we don't replace name with empty string; user can keep editing).
function renameReferenceDoc(id, newName) {
  const doc = referenceDocs.find(d => d.id === id);
  if (!doc) return;
  const trimmed = (newName || '').trim();
  if (trimmed) doc.name = trimmed;
  saveProject();
}

// Live text update — does NOT re-render the card. Updates only this card's
// counter and the grand totals, so focus and cursor position survive.
function updateReferenceDocText(id, value) {
  const doc = referenceDocs.find(d => d.id === id);
  if (!doc) return;
  doc.text = value;
  // Update this card's counters in place
  const stats = computeRefStats(value);
  const c = document.getElementById('refCardCounters-' + id);
  if (c) {
    const charsEl  = c.querySelector('.ref-card-count-chars');
    const wordsEl  = c.querySelector('.ref-card-count-words');
    const linesEl  = c.querySelector('.ref-card-count-lines');
    const parasEl  = c.querySelector('.ref-card-count-paragraphs');
    const tokensEl = c.querySelector('.ref-card-count-tokens');
    if (charsEl)  charsEl.textContent  = stats.chars.toLocaleString();
    if (wordsEl)  wordsEl.textContent  = stats.words.toLocaleString();
    if (linesEl)  linesEl.textContent  = stats.lines.toLocaleString();
    if (parasEl)  parasEl.textContent  = stats.paragraphs.toLocaleString();
    if (tokensEl) tokensEl.textContent = stats.tokens.toLocaleString();
  }
  // v3.29.1 — refresh the line-number gutter for paste-mode cards
  updateRefLineNumbers(id);
  updateRefGrandTotals();
  // Save project (debounced through localStorage)
  saveProject();
}

// v3.29.1 — populate the line-number gutter for one paste-mode reference
// card. Uses logical lines (split on \n), not visual wrapped lines —
// reference material is typically structured (lists, paragraphs) where
// logical line count matches what the user expects to see. Long lines
// that wrap visually still get one line-number sitting at the top of the
// wrapped block, which matches every code editor's word-wrap behavior.
function updateRefLineNumbers(id) {
  const ta = document.getElementById('refTa-' + id);
  const ln = document.getElementById('refLineNums-' + id);
  if (!ta || !ln) return;
  const text = ta.value || '';
  const count = text === '' ? 1 : text.split('\n').length;
  let html = '';
  for (let i = 1; i <= count; i++) html += `<div>${i}</div>`;
  ln.innerHTML = html;
}

// Update the grand-total counter row(s) and the soft-warning banner.
// Renders the totals into both Setup 4 and the work drawer if both surfaces
// have the relevant DOM nodes.
function updateRefGrandTotals() {
  let totalChars = 0, totalWords = 0, totalTokens = 0;
  referenceDocs.forEach(doc => {
    const s = computeRefStats(doc.text);
    totalChars  += s.chars;
    totalWords  += s.words;
    totalTokens += s.tokens;
  });
  ['refCountChars',       'refDrawerCountChars'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = totalChars.toLocaleString(); });
  ['refCountWords',       'refDrawerCountWords'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = totalWords.toLocaleString(); });
  ['refCountTokens',      'refDrawerCountTokens'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = totalTokens.toLocaleString(); });
  ['refDocCount',         'refDrawerDocCount'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = referenceDocs.length === 1 ? '1 doc' : `${referenceDocs.length} docs`;
  });
  ['refSoftWarning',      'refDrawerSoftWarning'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-hidden', totalTokens < REF_TOKEN_SOFT_WARN);
  });
  // Clear All button on Setup 4 — only visible when there's something to clear.
  // Drawer's Clear All button always visible since drawer only opens mid-session.
  const setupClearBtn = document.getElementById('refClearAllSetup');
  if (setupClearBtn) setupClearBtn.classList.toggle('is-hidden', referenceDocs.length === 0);
}

// File drop / select handlers — both routed through processRefFile which
// PUSHES a new upload-source doc into the array instead of replacing
// the singleton (the v3.21.0–v3.23.4 behavior).
// Drag/drop counter — tracks enter/leave events across child buttons inside
// the drop row so the .drag-over visual state doesn't flicker when the cursor
// crosses internal element boundaries (a common gotcha with HTML5 drag events).
let _refDragCounter = 0;

function handleRefDragEnter(e) {
  e.preventDefault();
  _refDragCounter++;
  document.getElementById('refDropRow')?.classList.add('drag-over');
}
function handleRefDragOver(e) {
  // preventDefault is required on dragover for the drop event to fire.
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}
function handleRefDragLeave(e) {
  e.preventDefault();
  _refDragCounter--;
  if (_refDragCounter <= 0) {
    _refDragCounter = 0;
    document.getElementById('refDropRow')?.classList.remove('drag-over');
  }
}
function handleRefFileDrop(e) {
  e.preventDefault();
  _refDragCounter = 0;
  document.getElementById('refDropRow')?.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processRefFile(file);
}
function handleRefFileSelect(e) {
  const file = e.target.files[0];
  if (file) processRefFile(file);
  if (e.target) e.target.value = '';
}


// chars/4 is the standard rule of thumb for English text in OpenAI-family tokenizers.
// Real tokenizers vary by model; this is an estimate, not a contract.
function estimateTokens(text) {
  if (!text) return 0;
  return Math.round(text.length / 4);
}

// ── Work-screen drawer handlers ──
function openReferenceMaterialDrawer() {
  const drawer = document.getElementById('referenceMaterialDrawer');
  if (!drawer) return;
  renderReferenceCards();
  updateRefGrandTotals();
  drawer.classList.add('active');
}
function closeReferenceMaterialDrawer() {
  const drawer = document.getElementById('referenceMaterialDrawer');
  if (drawer) drawer.classList.remove('active');
}
// v3.36.18 — Toggle wrapper for the 📚 Reference button. Open if
// closed, close if already open. The two single-purpose helpers
// above stay as-is so other callsites (footer routing, modal close
// buttons) can be explicit about intent.
function toggleReferenceMaterialDrawer() {
  const drawer = document.getElementById('referenceMaterialDrawer');
  if (!drawer) return;
  if (drawer.classList.contains('active')) {
    closeReferenceMaterialDrawer();
  } else {
    openReferenceMaterialDrawer();
  }
}

// "Clear all" — wipes every reference doc. Confirmation modal guards the
// whole-list nuke. Past rounds' snapshots are unaffected (history captures
// referenceMaterialAtRound at round-fire time, not at clear time) — the
// modal body only mentions this caveat post-launch when it's actually relevant.
function clearAllReferenceMaterial() {
  if (!referenceDocs.length) { toast('Nothing to clear'); return; }
  const count = referenceDocs.length;
  const docNoun = count === 1 ? 'reference' : 'references';
  const hasRunRounds = (typeof history !== 'undefined' && history && history.length > 0);
  showRefConfirm({
    title: count === 1 ? 'Clear this reference?' : `Clear all ${count} ${docNoun}?`,
    body: hasRunRounds
      ? `This removes ${count === 1 ? 'the reference' : `all ${count} reference documents`}. Past rounds keep their original snapshot — only the next round forward is affected.`
      : `This removes ${count === 1 ? 'the reference' : `all ${count} reference documents`}. You can re-add them anytime.`,
    okLabel: count === 1 ? '🗑️ Remove' : `🗑️ Clear all ${count}`,
    onConfirm: () => {
      referenceDocs = [];
      renderReferenceCards();
      updateRefGrandTotals();
      saveProject();
      consoleLog(`📚 Reference material cleared — applies to next round`, 'info');
      toast('📚 Reference material cleared');
    }
  });
}

// Copy ALL reference material (concatenated with section headers) to clipboard.
// Uses the same prompt-envelope assembly so what's copied is exactly what
// AIs receive — useful for debugging or sharing the full context.
function copyReferenceMaterial() {
  if (!referenceDocs.length) { toast('Nothing to copy'); return; }
  const sep = '────────────────────────────────────────';
  const text = buildReferenceMaterialBlock(sep) || referenceDocs.map(d => d.text).join('\n\n');
  navigator.clipboard.writeText(text).then(
    () => toast('📋 Reference material copied'),
    () => toast('❌ Copy failed')
  );
}


async function startSession() {
  const name = document.getElementById('projectName').value.trim();
  const goal = assembleProjectGoal();

  if (!name) { toast('⚠️ Enter a project name'); return; }
  if (!goal) { toast('⚠️ Fill in at least one goal field'); return; }

  // Guard #1: if an active session exists in memory, warn before overwriting it
  if (history.length > 0 || (docText && round > 1)) {
    // v3.52.8 — native confirm() → wfConfirm()
    const ok = await wfConfirm(
      'Launch over active session?',
      `You have an active session (${round - 1} round${round - 1 !== 1 ? 's' : ''} completed). Launching again will clear your current document and round history. Continue?`,
      { okText: 'Launch new session', destructive: true }
    );
    if (!ok) return;
  }

  // ── Pre-launch storage verify ──
  // The in-memory check above only catches sessions that successfully loaded
  // into memory. If loadSession() failed silently — IDB read errored, async
  // race lost to user click, mid-load eviction — in-memory is empty but IDB
  // may still hold the user's real session. Read it before launching so we
  // don't blow away recoverable data.
  //
  // Smart comparison: if the stored session's project name differs from the
  // current project name, the user is intentionally starting a new project
  // and we silently clear the old session. Only when names match (legitimate
  // "session didn't load into memory" scenario) do we warn before discarding.
  if (history.length === 0 && !docText) {
    let storedSession = null;
    try { storedSession = await idbGet(); } catch(e) { /* ignore */ }
    const storedHasData = storedSession && (
      (Array.isArray(storedSession.history) && storedSession.history.length > 0) ||
      (typeof storedSession.docText === 'string' && storedSession.docText.trim().length > 0)
    );
    if (storedHasData) {
      const currentProjectName = document.getElementById('projectName')?.value.trim() || '';
      const currentProjectVersion = document.getElementById('projectVersion')?.value.trim() || '';
      // Pull stored project name from the most recent history entry (rounds carry projectName)
      const storedProjectName = storedSession.history?.[storedSession.history.length - 1]?.projectName || '';
      const storedProjectVersion = storedSession.history?.[storedSession.history.length - 1]?.projectVersion || '';
      const namesDiffer = currentProjectName && storedProjectName &&
        (currentProjectName !== storedProjectName || currentProjectVersion !== storedProjectVersion);

      if (namesDiffer) {
        // Different project — user is starting fresh. Clear stored session silently.
        try { await idbClear(); } catch(e) { /* ignore */ }
        try { localStorage.removeItem(LS_SESSION); } catch(e) {}
      } else {
        // Same project name (or stored name unavailable) — likely a real load failure.
        const sh = storedSession.history?.length || 0;
        const sd = storedSession.docText?.length || 0;
        // v3.52.8 — native confirm() → wfConfirm()
        const proceed = await wfConfirm(
          '⚠️ Saved session did not load',
          `A saved session exists in browser storage (${sh} round${sh !== 1 ? 's' : ''}, ${sd.toLocaleString()} chars in document) but did NOT load into memory on this page load. ` +
          `This usually means a load race or a transient IDB read failure.\n\n` +
          `Click Cancel to keep the saved session intact and reload the page to retry the load.\n` +
          `Click "Discard and start fresh" to discard the saved session and start fresh.`,
          { okText: 'Discard and start fresh', destructive: true }
        );
        if (!proceed) return;
        try { await idbClear(); } catch(e) { /* ignore */ }
        try { localStorage.removeItem(LS_SESSION); } catch(e) {}
      }
    }
  }

  if (docTab === 'paste') {
    docText = document.getElementById('pasteText').value.trim();
  } else if (docTab === 'scratch') {
    docText = '';
  }

  if (docTab !== 'scratch' && !docText) {
    toast('⚠️ Please upload a file or paste your document text');
    return;
  }

  // Auto-select phase: if a document was provided, start in Refine — no need to Draft
  phase = docText ? 'refine' : 'draft';

  saveSettings();
  goToScreen('screen-work');
  initWorkScreen(true);
  showReExtractBanner();
  // Save original document as Round 0 — done AFTER initWorkScreen so notes are populated
  if (docText && history.length === 0) {
    history.push({
      round:          0,
      phase:          phase,
      projectName:    document.getElementById('projectName')?.value.trim()    || '',
      projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
      doc:            docText,
      notes:          document.getElementById('workNotes')?.value.trim()         || '',
      standingNotes:  document.getElementById('workStandingNotes')?.value.trim() || '',
      conflicts:      null,
      responses:      {},
      timestamp:      new Date().toLocaleTimeString(),
      timestampISO:   new Date().toISOString(),
      outcome:        'setup',
      builderId:      builder,
      resolvedDecisions: JSON.parse(JSON.stringify(window._resolvedDecisions || [])),
      label:          'Original Document',
      referenceMaterialAtRound: snapshotReferenceDocs()
    });
    renderRoundHistory();
    saveSession();
  }
}

// ── SCREEN 4: WORK ──
function initWorkScreen(isNewSession = false) {
  const name    = document.getElementById('projectName')?.value.trim()    || 'Project';
  const version = document.getElementById('projectVersion')?.value.trim() || '';
  const goal    = assembleProjectGoal();

  // Note: console/conflicts/notes are NOT wiped here, even on a brand new
  // session. The only legitimate path for wiping those panels is clearProject(),
  // which is an explicit user-initiated destructive action. No normal navigation
  // or re-launch should clear the session log.

  const el = document.getElementById('workProjectName');
  const ve = document.getElementById('workProjectVersion');
  const me = document.getElementById('workStartMode');

  if (el) el.textContent = name;
  if (ve) { ve.textContent = version; ve.style.display = version ? 'inline' : 'none'; }
  if (me) {
    const modeLabels = { upload: '📄 Uploaded file', paste: '📋 Pasted text', scratch: '✍️ From scratch' };
    me.textContent = modeLabels[docTab] || '';
  }

  // For scratch: show project context as a starting reference — not a document yet
  const docTa = document.getElementById('workDocument');
  if (docTa) {
    if (docTab === 'scratch' && !docText) {
      docTa.value = '';
      docTa.placeholder = `Starting from scratch — click "Smoke the Hive" to generate your first draft.\n\nProject: ${name}${version ? ' ' + version : ''}\nGoal: ${goal}`;
    } else {
      docTa.value = docText;
    }
    updateLineNumbers();
    // Also defer to catch after layout paint
    requestAnimationFrame(() => updateLineNumbers());
  }

  const ps = document.getElementById('phaseSelect');
  if (ps) ps.value = phase;

  // Notes drawer is intentionally NOT prefilled. Notes are Builder-only,
  // round-specific directives — distinct from Project Goal (which all reviewers
  // and the Builder receive every round). A prior version of this function
  // prefilled `workNotes` with `Project goal: ${goal}` on round 1 of a new
  // session, which (1) duplicated the goal into the Builder-only channel,
  // (2) inflated the Builder's context vs. the reviewers' (breaking the hive's
  // symmetric-input model), and (3) silently surprised users who opened the
  // drawer expecting it to be empty as documented in every playbook. Removed
  // in v3.21.22.

  // Reset per-session bee selection to all active AIs.
  // v3.32.26 — Was unconditional, which wiped the Set every time the
  // work screen rendered including on page reload. Now gated: a true
  // new session (clearProject path → initWorkScreen(true)) resets to
  // all-on as before; a page reload (initWorkScreen() with default
  // false, after loadSession populated window.sessionAIs from the IDB
  // payload) preserves the restored Set. The `!window.sessionAIs`
  // guard handles two edge cases: (a) brand-new install with no IDB
  // session yet, and (b) pre-v3.32.26 sessions saved before sessionAIs
  // joined the payload — both fall through to the "all activeAIs"
  // historical default.
  if (isNewSession || !window.sessionAIs) {
    window.sessionAIs = new Set(activeAIs.map(a => a.id));
  }

  renderWorkPhaseBar();
  renderBeeStatusGrid();
  renderRoundHistory();
  renderConflicts();
  updateRoundBadge();
  updateLicenseBadge();
  // v3.32.28 — #6c. Run after the work topbar is in DOM. Catches reload
  // path (loadSession set the flag, but the indicator element wasn't
  // mounted yet so the helper short-circuited) and any navigation back
  // to the work screen mid-project.
  updateLengthGuardIndicator();
  // v3.38.0 — Same defensive-init pattern for the slow-AI alerts pill.
  // _slowResponderEnabled is module-level and hydrated from localStorage
  // at script-load time, but the indicator DOM only exists once the work
  // topbar mounts. Call here to sync class + label + title on the live
  // element. (No project-persistence path needed — preference is global.)
  updateSlowResponderIndicator();
  // v3.55.3 — Same defensive-init pattern for the autosave pill.
  updateAutosaveIndicator();
  setStatus('Standing by — Smoke the Hive to begin');

  // Keep line numbers filled on resize
  if (window._lineNumObserver) window._lineNumObserver.disconnect();
  if (docTa && window.ResizeObserver) {
    window._lineNumObserver = new ResizeObserver(() => updateLineNumbers());
    window._lineNumObserver.observe(docTa);
  }
  updateLineNumbers();
}

function truncateGoalForRefine(goal) {
  // v3.56.10 — bounds derived from REFINE_GOAL_MAX_CHARS (was hardcoded 300/200/450).
  const CAP   = REFINE_GOAL_MAX_CHARS;
  const FLOOR = Math.round(CAP * 2 / 3);   // a boundary must sit past this to keep useful context
  const FWD   = CAP + 150;                 // forward-look window for the next sentence end
  if (!goal || goal.length <= CAP) return goal;
  // Look backward from CAP for a sentence boundary (must be past FLOOR to avoid tiny context)
  const slice = goal.slice(0, CAP);
  const lastBoundary = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'));
  if (lastBoundary > FLOOR) return goal.slice(0, lastBoundary + 1).trim();
  // No good boundary behind CAP — look forward up to FWD for the next sentence end
  const forward = goal.slice(CAP, FWD);
  const fwdDot  = forward.indexOf('.');
  const fwdBang = forward.indexOf('!');
  const fwdQ    = forward.indexOf('?');
  const fwdBoundary = Math.min(
    fwdDot  >= 0 ? fwdDot  : Infinity,
    fwdBang >= 0 ? fwdBang : Infinity,
    fwdQ    >= 0 ? fwdQ    : Infinity
  );
  if (fwdBoundary < Infinity) return goal.slice(0, CAP + fwdBoundary + 1).trim();
  // Fall back to last whole word before CAP
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > FLOOR ? goal.slice(0, lastSpace) : slice).trim();
}

function updateGoalCounter() {
  const goal  = assembleProjectGoal();
  const len   = goal.length;
  const truncated = len > REFINE_GOAL_MAX_CHARS;

  // v3.27.7: removed dead block that wrote words/chars stats into #goalCounter.
  // The element + its surrounding goal-counter-bar were eliminated in the
  // project-screen restructure. Function retained because it still updates
  // the goalRefinePreview panel below — words/chars info is no longer
  // surfaced as its own widget; the refine preview communicates the only
  // counter fact that mattered (whether the goal exceeds the 300-char trim).

  // Update refine preview panel
  const previewWrap  = document.getElementById('goalRefinePreview');
  const previewText  = document.getElementById('goalRefinePreviewText');
  const previewCount = document.getElementById('goalRefinePreviewCount');
  const previewSub   = document.getElementById('goalRefinePreviewSub');
  const previewEmpty = document.getElementById('goalRefinePreviewEmpty');

  if (truncated) {
    const refined = truncateGoalForRefine(goal);
    if (previewText)  { previewText.textContent = refined; previewText.style.display = 'block'; }
    if (previewCount) previewCount.textContent = `${refined.length} chars`;
    if (previewSub)   previewSub.textContent = `This is exactly what the hive receives as PROJECT CONTEXT in refine rounds (${refined.length} chars, trimmed to the nearest sentence). The draft round always gets the full goal.`;
    if (previewEmpty) previewEmpty.style.display = 'none';
    if (previewWrap)  previewWrap.classList.add('has-content');
  } else {
    if (previewText)  { previewText.textContent = ''; previewText.style.display = 'none'; }
    if (previewCount) previewCount.textContent = '';
    if (previewSub)   previewSub.textContent = '';
    if (previewEmpty) previewEmpty.style.display = 'block';
    if (previewWrap)  previewWrap.classList.remove('has-content');
  }
}

function updateProjLineNums(numsId, ta) {
  const ln = document.getElementById(numsId);
  if (!ln || !ta) return;
  // Grow textarea to content height — the outer .proj-ta-editor scrolls.
  // Sticky gutter stays pinned automatically; no JS scroll sync needed.
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
  const LINE_HEIGHT = 21;
  const visualCount = Math.max(1, Math.round(ta.scrollHeight / LINE_HEIGHT));
  ln.innerHTML = Array.from({length: visualCount}, (_, i) => `<div>${i + 1}</div>`).join('');
}

function updateLineNumbers() {
  const ta = document.getElementById('workDocument');
  const ln = document.getElementById('lineNumbers');
  if (!ta || !ln) return;

  // Keep textarea height in sync with content (enables .work-doc-inner scrollbar)
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';

  const text = (ta.value || '');
  const logicalLines = text.split('\n');

  // Use scrollHeight / line-height to count actual rendered visual lines
  // (Gemini method — measures what the browser painted, not character estimates)
  const LINE_HEIGHT = 21; // matches CSS line-height on .work-doc-ta
  const visualCount = Math.max(1, Math.round(ta.scrollHeight / LINE_HEIGHT));

  let html = '';
  for (let i = 1; i <= visualCount; i++) {
    html += `<div>${i}</div>`;
  }
  ln.innerHTML = html;

  const stats = document.getElementById('docStats');
  if (stats && text.trim()) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    // Pages reuses WORDS_PER_PAGE (600 since v3.36.12, declared near the
    // length-constraint logic) so this display stays in lockstep with
    // whatever the length-gate converts pages→words to. Floor at <0.1 so
    // very short docs don't show an unhelpful "0.0 pages". The ≈ prefix
    // matches the length-hint convention for fuzzy unit conversions.
    const pages    = words / WORDS_PER_PAGE;
    const pagesStr = pages < 0.1 ? '<0.1' : pages.toFixed(1);
    stats.textContent = `${chars.toLocaleString()} chars · ${words.toLocaleString()} words · ${visualCount} lines · ≈${pagesStr} pages`;
  } else if (stats) {
    stats.textContent = '';
  }
}


function handleWorkDocumentInput() {
  const ta = document.getElementById('workDocument');
  if (!ta) return;
  docText = ta.value;
  // Auto-grow textarea so .work-doc-inner overflows and shows its scrollbar
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
  clearTimeout(_lineNumDebounce);
  _lineNumDebounce = setTimeout(updateLineNumbers, 50);
  clearTimeout(workDocSaveTimer);
  workDocSaveTimer = setTimeout(() => saveSession(), 250);
}

function renderWorkPhaseBar() {
  // Phase bar removed — phase is now shown in the round badge
  updateRoundBadge();
}

function showProjectGoalModal() {
  const modal = document.getElementById('projectGoalModal');
  if (!modal) return;
  const name    = document.getElementById('projectName')?.value.trim()    || '';
  const version = document.getElementById('projectVersion')?.value.trim() || '';
  const metaEl   = document.getElementById('projectGoalModalMeta');
  const nameEl   = document.getElementById('projectGoalModalName');
  const fieldsEl = document.getElementById('projectGoalModalFields');
  if (nameEl) nameEl.textContent = [name, version].filter(Boolean).join(' · ');
  // v3.56.7 — meta char-count removed. It only ever supported the old
  // 300-char goal-truncation concept (the "Refine limit" preview), which no
  // longer reflects how the goal is sent. The modal is now a project SUMMARY:
  // goal fields + length target + reference material.
  if (metaEl) metaEl.textContent = '';
  if (fieldsEl) {
    // Goal fields — mirror the six structured Setup 3 fields (filled only).
    const docType  = (document.getElementById('goalDocType')?.value  || '').trim();
    const audience = (document.getElementById('goalAudience')?.value || '').trim();
    const outcome  = (document.getElementById('goalOutcome')?.value  || '').trim();
    const scope    = (document.getElementById('goalScope')?.value    || '').trim();
    const tone     = (document.getElementById('goalTone')?.value     || '').trim();
    const notes    = (document.getElementById('goalNotes')?.value    || '').trim();
    const goalRows = [
      ['Document type',     docType],
      ['Target audience',   audience],
      ['Desired outcome',   outcome],
      ['Scope & constraints', scope],
      ['Tone & voice',      tone],
      ['Additional instructions', notes],
    ].filter(([, v]) => v);

    // v3.56.7 — Length target, in plain language, from the active constraint.
    const _len = (typeof getLengthConstraint === 'function') ? getLengthConstraint() : null;
    let lengthText;
    if (!_len) {
      lengthText = 'No length limit';
    } else {
      const u = (typeof unitLabel === 'function') ? unitLabel(_len.unit, _len.limit) : _len.unit;
      if (_len.mode === 'hardcap')     lengthText = `Hard cap — ${_len.limit} ${u} max`;
      else if (_len.mode === 'target') lengthText = `Target — about ${_len.limit} ${u}`;
      else if (_len.mode === 'range')  lengthText = `Range — ${_len.min}–${_len.limit} ${u}`;
      else                             lengthText = 'No length limit';
    }

    // v3.56.7 — Reference material the hive consults (Setup 4).
    const _refDocs = (typeof referenceDocs !== 'undefined' ? referenceDocs : [])
      .filter(d => (d.text || '').trim());
    const refText = _refDocs.length
      ? `${_refDocs.length} source${_refDocs.length === 1 ? '' : 's'}: ${_refDocs.map(d => d.name).join(', ')}`
      : 'None';

    // Length + Reference always show (they're project attributes, not optional
    // goal fields) so the summary is honest even when one is unset.
    const rows = [
      ...goalRows,
      ['Length', lengthText],
      ['Reference material', refText],
    ];

    const esc = s => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    fieldsEl.innerHTML = rows.map(([label, value], i) => `
      <div class="dp-field">
        <div class="dp-field-label">${esc(label)}</div>
        <div class="dp-field-value">${esc(value).replace(/\n/g, '<br>')}</div>
      </div>${i < rows.length - 1 ? '<div class="dp-field-divider"></div>' : ''}
    `).join('');
  }
  modal.classList.add('active');
}

function editGoalFromModal() {
  document.getElementById('projectGoalModal')?.classList.remove('active');
  goToScreen('screen-project');
}

// v3.52.7 — saveProjectGoalFromModal stub removed. Was kept "to avoid any
// stale HTML onclick references throwing errors." Audit confirmed zero
// HTML onclick references across all helper pages and index.html, so the
// defensive stub serves no purpose.

function showFinishModal() {
  const modal = document.getElementById('finishModal');
  if (modal) modal.classList.add('active');
  projectClockPause();
  // Export-state tracking and button visuals are NOT reset here. Both belong
  // to the session, not to the modal. Resetting them on every modal open caused
  // a real bug (v3.21.23 and earlier): user exports document → closes modal →
  // reopens Finish modal → guard fires "you haven't exported anything!" because
  // the flag was wiped by showFinishModal even though the export still happened.
  // The flag and visuals now reset only in clearProject() when a new session
  // genuinely begins. v3.21.24 fix.

  const hasDoc     = !!(document.getElementById('workDocument')?.value?.trim());
  const hasHistory = history.length > 0;

  const btnDoc      = document.getElementById('finishBtnDoc');
  const btnTranscript = document.getElementById('finishBtnTranscript');

  if (btnDoc)       btnDoc.classList.toggle('finish-modal-btn-disabled', !hasDoc);
  if (btnTranscript) btnTranscript.classList.toggle('finish-modal-btn-disabled', !hasHistory);

  // v3.35.1 — Re-enable an "exported" button when MORE rounds have run
  // since the last export. The waxframe:exported listener stamps the
  // button's dataset.exportedHistoryLen at export time. If history.length
  // has grown since then, there's new content to export — restore the
  // button from its dataset.originalHtml (captured on session boot) and
  // clear the disabled / done classes so the user can click again.
  // Without this fix the button stayed disabled for the rest of the
  // session even after dozens of additional rounds, making it impossible
  // to capture an updated transcript without reloading the page.
  [btnDoc, btnTranscript].forEach(btn => {
    if (!btn) return;
    const stampStr = btn.dataset.exportedHistoryLen;
    if (stampStr === undefined || stampStr === '') return;
    const stamp = parseInt(stampStr, 10);
    if (isNaN(stamp)) return;
    if (history.length > stamp) {
      // New content since last export — re-enable.
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
      btn.disabled = false;
      btn.classList.remove('finish-modal-btn-done');
      delete btn.dataset.exportedHistoryLen;
    }
  });
}

function hideFinishModal() {
  const modal = document.getElementById('finishModal');
  if (modal) modal.classList.remove('active');
}

async function finishAndNew() {
  // v3.32.17 — In-flight check FIRST, before any other logic. If a
  // round is running, prompt the user to discard it; cancel aborts the
  // entire flow and the Finish modal stays open. This prevents the
  // round from continuing to write into a session that's about to be
  // cleared. The unexported-content check below remains the second
  // gate. Worst case both fire (round in flight AND unexported work) —
  // user sees two modals back-to-back, but each is asking a distinct
  // question and the order is correct (in-flight first, since that's
  // the more time-sensitive concern).
  if (!await confirmInterruptIfRunning()) return;

  const liveDoc = document.getElementById('workDocument')?.value?.trim() || '';
  const hasContent = liveDoc.length > 0 || history.length > 0;
  if (!window._finishExported && hasContent) {
    // Replaced native confirm() with a styled modal in v3.21.17. The native
    // dialog (a) was visually jarring against the WaxFrame aesthetic, and
    // (b) blocks the main thread, preventing any pre-dialog alert sound from
    // playing reliably. The custom modal opens via openDiscardConfirm() which
    // also fires playAlertSound() so the user actually notices.
    openDiscardConfirm();
    return;
  }
  hideFinishModal();
  await clearProject();
  goToScreen('screen-project');
}

function openDiscardConfirm() {
  const modal = document.getElementById('discardConfirmModal');
  if (modal) modal.classList.add('active');
  playAlertSound();
}

function closeDiscardConfirm() {
  const modal = document.getElementById('discardConfirmModal');
  if (modal) modal.classList.remove('active');
}

async function confirmDiscardAndNew() {
  closeDiscardConfirm();
  hideFinishModal();
  await clearProject();
  goToScreen('screen-project');
}
// ── SCENE (extracted) ──
// v3.42.0 — Hive Finish Animation moved to js/scenes.js. Loaded
// after js/audio.js (depends on play* helpers) and before app.js
// so all scene functions are globally available by the time app.js
// code references them.

// ── SCENE (extracted) ──
// v3.42.0 — Unanimous Convergence Scene + Hive Finish + their helpers moved to js/scenes.js. Loaded
// after js/audio.js (depends on play* helpers) and before app.js
// so all scene functions are globally available by the time app.js
// code references them.


function setPhase(id) {
  phase = id;
  const ps = document.getElementById('phaseSelect');
  if (ps) ps.value = id;
  updateRoundBadge();
}

// v3.36.15 — Round-counter display state machine. The earlier behavior
// was to bump round++ at history.push completion and then call
// updateRoundBadge — which left the badge reading "Round 6 — Refine"
// the instant Round 5 finished, before the user could even glance at
// the result of the round they just completed.
//
// New model:
//   • window._roundUiState — 'idle' | 'running'
//   • window._lastCompletedRoundLabel — pre-formatted string with a
//     state suffix (Converged / Majority / Builder Only / Failed /
//     Complete). Set just before round++ at every round-end site.
//
// updateRoundBadge() now branches on state:
//   • 'running'                          → live "Round N — Phase"
//   • 'idle' & _lastCompletedRoundLabel  → use the stored label
//   • 'idle' & no label  (fresh project) → "Round N — Phase" (next-up)
//
// runRound + runBuilderOnly entry both flip state='running' and
// updateRoundBadge() before any work; round-end sites call
// _setLastCompletedLabel() BEFORE round++, then flip state='idle' and
// updateRoundBadge() after. clearProject() resets both.
window._roundUiState = window._roundUiState || 'idle';
window._lastCompletedRoundLabel = window._lastCompletedRoundLabel || null;

const _ROUND_OUTCOME_SUFFIX = {
  unanimous_convergence: ' ✓ Converged',
  majority_convergence:  ' ✓ Majority',
  builder_only_complete: ' ✓ Builder Only',
  builder_only_failed:   ' ⚠ Failed',
  round_failed:          ' ⚠ Failed',
  continuing:            ' ✓ Complete'
};

function _setLastCompletedLabel(roundNum, phaseAtRound, outcome) {
  const phaseLabel = phaseAtRound === 'draft' ? 'Draft' : 'Refine';
  const suffix = _ROUND_OUTCOME_SUFFIX[outcome] || ' ✓ Complete';
  window._lastCompletedRoundLabel = `Round ${roundNum} — ${phaseLabel}${suffix}`;
}

function updateRoundBadge() {
  const el = document.getElementById('workRoundBadge');
  if (!el) return;
  const phaseLabel = phase === 'draft' ? 'Draft' : 'Refine';
  if (window._roundUiState === 'running') {
    el.textContent = `Round ${round} — ${phaseLabel}`;
  } else if (window._lastCompletedRoundLabel) {
    el.textContent = window._lastCompletedRoundLabel;
  } else {
    el.textContent = `Round ${round} — ${phaseLabel}`;
  }
  // v3.35.0 — refresh Auto-toggle counter ("N left") whenever the round
  // ticks. updateRoundBadge already runs at every round boundary, so
  // this is the cheapest hook for the persistent counter display.
  if (typeof updateAutoToggleUI === 'function') updateAutoToggleUI();
}

function renderBeeStatusGrid() {
  const grid = document.getElementById('beeStatusGrid');
  if (!grid) return;
  if (!window.sessionAIs) window.sessionAIs = new Set(activeAIs.map(a => a.id));
  grid.innerHTML = activeAIs.map(ai => {
    const isB  = ai.id === builder;
    const isOn = isB || window.sessionAIs.has(ai.id);
    const iconEl = resolveAiIcon(ai, 'hex-icon');
    // v3.32.20 — Two-row card layout (#8). Row 1 carries identity:
    // checkbox slot (BUILDER text pill on the Builder card, since the
    // builder is always-on and can't be toggled — same slot, different
    // affordance), provider icon, AI name. Row 2 carries status: live
    // status text. Satisfaction star sits OUTSIDE both rows at card-
    // level (see v3.32.23 below).
    //
    // v3.32.21 changes:
    //   • BUILDER role indicator on row 1 reverted to the prior text
    //     pill (.hex-builder-tag) instead of the v3.32.20 Builder Bee
    //     PNG. The bee asset at 13–14px in the checkbox-slot footprint
    //     was visually unreadable — the silhouette became mush at that
    //     size. Text "BUILDER" reads at any size and matches the slot
    //     dimensions naturally. The bee asset is preserved in
    //     /images/WaxFrame_Builder_v3.png for places with room (Setup 2
    //     picker, Change Builder modal title).
    //
    // v3.32.23 changes:
    //   • Satisfaction star promoted from inline-on-row-2 to card-level
    //     sibling of .hex-cell-body. Now sits at the right edge of the
    //     card, vertically centered across both rows, sized large
    //     enough to span the combined row heights as a visual anchor.
    //     The .hex-cell-body's flex:1 + min-width:0 (already in place)
    //     shrinks the body to leave room for the star; the existing
    //     ellipsis rules on .hex-name and .hex-status truncate names
    //     and status text correctly when the body shrinks. v3.32.21
    //     placed the star inline on row 2 with margin-left:auto, which
    //     undersized it (constrained to single-row height) and put it
    //     in the same horizontal flow as status text instead of as a
    //     dedicated card-level affordance.
    //
    // Underlying ai.name keeps its "[Base] " prefix; the card display
    // strips it via displayAiName() because every base model's prefix
    // adds visual noise without differentiating information.
    return `
    <div class="hex-cell ${isB ? 'is-builder' : isOn ? 'is-active' : 'is-inactive'}" id="bcard-${ai.id}">
      <div class="hex-cell-body">
        <div class="hex-row hex-row-identity">
          ${isB
            ? `<span class="hex-builder-tag">BUILDER</span>`
            : `<input type="checkbox" class="hex-toggle" id="btog-${ai.id}"
                ${isOn ? 'checked' : ''}
                onchange="toggleSessionBee('${ai.id}', this.checked)">`
          }
          ${iconEl}
          <span class="hex-name" title="${esc(ai.name)}">${esc(displayAiName(ai.name))}</span>
        </div>
        <div class="hex-row hex-row-status">
          <span class="hex-status" id="blive-${ai.id}">Idle</span>
        </div>
      </div>
      <span class="hex-clean-star" aria-label="No changes needed">★</span>
    </div>`;
  }).join('');
  // v3.32.14 — Rehydrate satisfaction state after innerHTML rebuild.
  // Without this, any caller (setBuilderFromModal, continueFromBuilder,
  // initWorkScreen) silently strips is-clean from cards that the data
  // layer (_cleanThisRound) still says are satisfied. Walks the Set and
  // re-applies the rendered state via setBeeStatus, which on a non-
  // 'sending'/'error' input promotes to 'done-clean' through the
  // universal re-derive path.
  if (window._cleanThisRound) {
    window._cleanThisRound.forEach(aiId => {
      // Pass 'done' rather than 'done-clean' to avoid re-adding the same
      // id to the Set; the universal re-derive will promote it.
      setBeeStatus(aiId, 'done', 'No changes needed ✓');
    });
  }
  renderBeeDotStrip();
}

// v3.29.11 — Shared icon-upload module.
//
// Handles the user-supplied custom AI icon flow for both the Add a Custom
// Worker Bee modal AND the Import from Model Server modal. Goals:
//   1. Don't make the user think about file size or dimensions. Whatever
//      they upload, we resize to 256×256 PNG via <canvas> and store as a
//      base64 data URL. A user-uploaded 5MB monstrosity becomes a ~30 KB
//      icon transparently.
//   2. Stay in localStorage. 256×256 PNG ≈ 30–60 KB; 100+ icons fit
//      comfortably in localStorage's 5 MB origin budget.
//   3. Render with zero changes to resolveAiIcon. Data URLs already pass
//      its `!ai.icon.includes('google.com/s2/favicons')` guard, so the
//      existing custom-icon code path renders them directly.
//
// Public API:
//   wfIconUpload.attach(opts)
//     opts.fileInputId   — id of the <input type="file">
//     opts.previewId     — id of the <img> preview element
//     opts.previewWrapId — id of the wrapper that toggles 'has-icon' class
//     opts.clearBtnId    — id of the × clear button
//     opts.uploadBtnId   — id of the visible "Upload Icon" button (we
//                          forward clicks to the hidden file input;
//                          label is always "Upload Icon" since v3.32.16)
//     opts.onChange(dataURL | null) — fires when user picks or clears
//   wfIconUpload.read(opts) — returns the current data URL or null
//   wfIconUpload.set(opts, dataURL) — pre-populate (for Edit flows)
//   wfIconUpload.clear(opts) — reset to empty state
const wfIconUpload = (() => {
  const TARGET_SIZE = 256;             // output dimension (square)
  const HARD_INPUT_CAP = 8 * 1024 * 1024; // refuse files > 8 MB even pre-resize
  const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  function _setPreview(opts, src, kind) {
    // v3.29.11 — `kind` is 'user' (real upload, data URL), 'catalog'
    // (auto-suggested from provider name match), 'generic' (the universal
    // placeholder), or null (empty). The wrap gets:
    //   - `has-icon` class for ANY non-null kind (controls preview-box
    //     border, hides the empty-state text, switches Upload→Replace)
    //   - `has-user-icon` class ONLY for kind='user' (controls × clear
    //     button visibility, since users can only clear their own upload)
    const previewEl = document.getElementById(opts.previewId);
    const wrapEl    = document.getElementById(opts.previewWrapId);
    const uploadBtn = document.getElementById(opts.uploadBtnId);
    if (previewEl) {
      if (src) {
        previewEl.src = src;
        previewEl.style.display = '';
      } else {
        previewEl.removeAttribute('src');
        previewEl.style.display = 'none';
      }
    }
    if (wrapEl) {
      wrapEl.classList.toggle('has-icon', !!src);
      wrapEl.classList.toggle('has-user-icon', kind === 'user');
    }
    if (uploadBtn) {
      // v3.32.16 — always "Upload Icon" regardless of state. The previous
      // toggle to "🔄 Replace Icon" when a user-uploaded icon was already
      // present was dev-speak: the button does the same thing in both
      // states (opens the file picker), so the label flip added no user
      // value. It also produced an immediately-wrong label after preset
      // clicks in the Import Server modal, since selecting a preset goes
      // through wfIconUpload.set() which marks kind='user'.
      uploadBtn.textContent = '📷 Upload Icon';
    }
  }

  // Resize whatever the user gave us to 256×256 PNG via canvas, return data URL
  function _resizeToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not decode image'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;
          const ctx = canvas.getContext('2d');
          // Draw centered with letterbox so non-square sources don't get stretched.
          // Most provider logos are square, but better safe.
          const ratio = Math.min(TARGET_SIZE / img.width, TARGET_SIZE / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          const x = (TARGET_SIZE - w) / 2;
          const y = (TARGET_SIZE - h) / 2;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, x, y, w, h);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function attach(opts) {
    const fileInput = document.getElementById(opts.fileInputId);
    const uploadBtn = document.getElementById(opts.uploadBtnId);
    const clearBtn  = document.getElementById(opts.clearBtnId);
    const previewEl = document.getElementById(opts.previewId);
    if (!fileInput || !uploadBtn) return;

    // Visible button forwards click to the hidden file input
    uploadBtn.onclick = (e) => { e.preventDefault(); fileInput.click(); };

    // v3.29.11 — if the preview img fails to load (e.g. icon-generic.png
    // hasn't been added to images/ yet), gracefully clear back to empty
    // state. Without this, a broken generic-fallback would render as a
    // tiny broken-image icon inside the preview box.
    if (previewEl && !previewEl._wfErrorBound) {
      previewEl.onerror = () => { _setPreview(opts, null, null); };
      previewEl._wfErrorBound = true;
    }

    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        toast(`⚠️ Unsupported image format (${file.type || 'unknown'}). Use PNG, JPEG, WebP, or GIF.`, 6000);
        fileInput.value = '';
        return;
      }
      if (file.size > HARD_INPUT_CAP) {
        toast(`⚠️ Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Keep it under 8 MB before upload.`, 7000);
        fileInput.value = '';
        return;
      }
      try {
        const dataURL = await _resizeToDataURL(file);
        _setPreview(opts, dataURL, 'user');
        if (typeof opts.onChange === 'function') opts.onChange(dataURL);
      } catch (err) {
        console.warn('[wfIconUpload] resize failed:', err);
        toast(`⚠️ Could not process this image: ${err.message}`, 6000);
      }
      fileInput.value = ''; // allow re-picking the same file
    };

    if (clearBtn) {
      clearBtn.onclick = (e) => {
        e.preventDefault();
        // v3.29.11 — clearing a user upload doesn't necessarily mean
        // empty preview: if the form has a catalog match for the
        // provider, fall back to that. opts.onClearFallback is a
        // caller-supplied function returning ctx for the catalog
        // re-resolve, or null if catalog logic shouldn't apply.
        _setPreview(opts, null, null);
        if (typeof opts.onChange === 'function') opts.onChange(null);
        if (typeof opts.onClearFallback === 'function') {
          const ctx = opts.onClearFallback();
          if (ctx) previewCatalogMatch(opts, ctx);
        }
      };
    }
  }

  function read(opts) {
    const previewEl = document.getElementById(opts.previewId);
    return previewEl?.src && previewEl.src.startsWith('data:image/') ? previewEl.src : null;
  }

  // v3.29.13 — return whatever icon is currently being shown in the preview
  // box, regardless of kind (user upload data URL, catalog match path, or
  // generic fallback). Used by add-to-hive flows so the icon that gets
  // persisted is the one the user just SAW in the preview — fixes the bug
  // where users would see "Mistral icon" in preview, hit Add, and end up
  // with the favicon proxy URL stored on the AI because read() only
  // returned data URLs. Returns null if the preview is showing nothing.
  function readAny(opts) {
    const previewEl = document.getElementById(opts.previewId);
    const wrapEl    = document.getElementById(opts.previewWrapId);
    if (!previewEl || !wrapEl) return null;
    if (!wrapEl.classList.contains('has-icon')) return null;
    return previewEl.src || null;
  }

  function set(opts, dataURL) {
    _setPreview(opts, dataURL || null, dataURL ? 'user' : null);
  }

  function clear(opts) {
    _setPreview(opts, null, null);
  }

  // v3.29.11 — Catalog of provider-name → icon path mappings. KEPT IN
  // SYNC with the catalog inside resolveAiIcon() at the bottom of this
  // file. If you add a new provider there, mirror it here so the live
  // preview matches what will actually render after Add to Hive.
  // (We deliberately duplicate rather than import to avoid the wfIconUpload
  // IIFE racing the resolveAiIcon definition during module init.)
  // v3.32.15 — Removed server-runtime entries (Alfredo, LM Studio,
  // Open WebUI, Together) from auto-detect. Those are runtimes that host
  // OTHER models; auto-detecting them off a model name is a category error
  // because the model name almost never contains the runtime name. They
  // remain available as one-click presets in the Import Server modal and
  // as choices in the Bundled tab of the manage-AI icon picker. Llama
  // stays here because it IS a real model brand (Meta's series), even
  // though the name overlaps with llama.cpp runtimes.
  const _CATALOG = [
    { keys: ['claude', 'anthropic'],            src: 'images/icon-claude.png' },
    { keys: ['chatgpt', 'openai', 'gpt'],       src: 'images/icon-chatgpt.png' },
    { keys: ['gemini', 'google'],               src: 'images/icon-gemini.png' },
    { keys: ['grok', 'x.ai', 'xai'],            src: 'images/icon-grok.png' },
    { keys: ['deepseek'],                       src: 'images/icon-deepseek.png' },
    { keys: ['perplexity'],                     src: 'images/icon-perplexity.png' },
    { keys: ['mistral', 'mixtral', 'codestral', 'ministral'], src: 'images/icon-mistral.png' },
    { keys: ['llama', 'meta'],                  src: 'images/icon-llama.png' },
    { keys: ['cohere', 'command'],              src: 'images/icon-cohere.png' },
  ];
  const GENERIC_ICON = 'images/icon-generic.png';

  // Show the icon that WILL be used after Add to Hive given the current
  // form state. Called from form-change handlers (Quick Add pick, name
  // input, etc.) and on modal open. Behavior:
  //   1. If user already has a real upload (kind='user'), do not override.
  //   2. Otherwise, run the matcher against ctx.name + ctx.model strings
  //      from the form. If a catalog entry matches, show that local PNG
  //      with kind='catalog' (dashed-border styling, no × clear button).
  //   3. If no catalog match either, show the generic placeholder if it
  //      loads — falls through to nothing (empty preview-box) if the
  //      generic icon file doesn't exist yet.
  function previewCatalogMatch(opts, ctx) {
    const wrapEl = document.getElementById(opts.previewWrapId);
    if (!wrapEl) return;
    if (wrapEl.classList.contains('has-user-icon')) return; // user upload wins

    const name  = (ctx?.name  || '').toLowerCase();
    const model = (ctx?.model || '').toLowerCase();
    const combined = name + ' ' + model;
    if (!combined.trim()) {
      // Nothing to match against — clear any prior catalog match
      _setPreview(opts, null, null);
      return;
    }

    for (const entry of _CATALOG) {
      if (entry.keys.some(k => combined.includes(k))) {
        _setPreview(opts, entry.src, 'catalog');
        return;
      }
    }
    // No catalog match — try the generic placeholder. The <img> onerror
    // handler attached at attach() time falls back to empty if the file
    // doesn't exist. Until icon-generic.png is shipped, this gracefully
    // degrades to the empty preview state (which still shows "No icon
    // yet" placeholder text).
    _setPreview(opts, GENERIC_ICON, 'generic');
  }

  // v3.30.2 — Public catalog matcher exposed for the Import Server checklist
  // (per-row icon column) and any other caller that needs a "best icon for
  // this string" lookup without the full preview-DOM machinery. Returns the
  // catalog icon path or null. Same matching rules as previewCatalogMatch.
  function matchCatalog(text) {
    if (!text) return null;
    const t = String(text).toLowerCase();
    for (const entry of _CATALOG) {
      if (entry.keys.some(k => t.includes(k))) return entry.src;
    }
    return null;
  }

  return { attach, read, readAny, set, clear, previewCatalogMatch, matchCatalog };
})();

// ════════════════════════════════════════════════════════════════════
// v3.30.2 — Reusable Icon Picker
// ────────────────────────────────────────────────────────────────────
// Opens iconPickerModal (defined in index.html) with two tabs:
//   • Bundled icons — provider icons (ChatGPT/Claude/Gemini/etc.) plus
//     WaxFrame mascot icons (Worker Bee, API Bee, etc.). Click to select.
//   • Upload custom — file input → resize to 256×256 → base64 inline. The
//     base64 string is what gets persisted on the bee, keeping air-gapped
//     deployments self-contained (no external icon URLs).
//
// Reusable from anywhere via openIconPicker({ currentIcon, onSelect }).
// onSelect receives the chosen icon path or data URL. Cancellation just
// closes the modal — no callback fired.
// ════════════════════════════════════════════════════════════════════

// Catalog of bundled icons shown in the picker's "Bundled" tab. Three
// sections so the grid is browsable instead of a flat alphabetical wall:
// Providers (chat AIs), Tools (model-server runtimes), Mascots (WaxFrame
// art). Order within sections is alphabetical except Generic which leads
// each row as the explicit "no specific provider" choice.
const ICON_PICKER_BUNDLED = [
  { section: 'Providers', items: [
    { id: 'generic',    name: 'Generic',     src: 'images/icon-generic.png' },
    { id: 'chatgpt',    name: 'ChatGPT',     src: 'images/icon-chatgpt.png' },
    { id: 'claude',     name: 'Claude',      src: 'images/icon-claude.png' },
    { id: 'cohere',     name: 'Cohere',      src: 'images/icon-cohere.png' },
    { id: 'deepseek',   name: 'DeepSeek',    src: 'images/icon-deepseek.png' },
    { id: 'gemini',     name: 'Gemini',      src: 'images/icon-gemini.png' },
    { id: 'grok',       name: 'Grok',        src: 'images/icon-grok.png' },
    { id: 'llama',      name: 'Llama',       src: 'images/icon-llama.png' },
    { id: 'mistral',    name: 'Mistral',     src: 'images/icon-mistral.png' },
    { id: 'perplexity', name: 'Perplexity',  src: 'images/icon-perplexity.png' },
  ]},
  { section: 'Tools & Servers', items: [
    { id: 'alfredo',   name: 'Alfredo',     src: 'images/icon-alfredo.png' },
    { id: 'lmstudio',  name: 'LM Studio',   src: 'images/icon-lmstudio.png' },
    { id: 'openwebui', name: 'Open WebUI',  src: 'images/icon-openwebui.png' },
    { id: 'together',  name: 'Together AI', src: 'images/icon-together.png' },
  ]},
  { section: 'WaxFrame Mascots', items: [
    { id: 'worker-bee',   name: 'Worker Bee',   src: 'images/WaxFrame_Worker_Bee_v2.png' },
    { id: 'api-bee',      name: 'API Bee',      src: 'images/WaxFrame_API_Bee_v1.png' },
    { id: 'project-bee',  name: 'Project Bee',  src: 'images/WaxFrame_Project_Bee_v2.png' },
    { id: 'reference-bee',name: 'Reference Bee',src: 'images/WaxFrame_Reference_Bee_v1.png' },
    { id: 'history-bee',  name: 'History Bee',  src: 'images/WaxFrame_History_Bee_v1.png' },
    { id: 'approved-bee', name: 'Approved Bee', src: 'images/WaxFrame_Approved_Bee_v1.png' },
    { id: 'builder',      name: 'Builder',      src: 'images/WaxFrame_Builder_v3.png' },
    { id: 'smoker',       name: 'Smoker',       src: 'images/WaxFrame_Smoker_v2.png' },
    { id: 'waxmaker',     name: 'Waxmaker',     src: 'images/WaxFrame_Waxmaker_v1.png' },
  ]},
];

// Caller's onSelect callback, stashed while the modal is open. Cleared on
// close so a stale callback can never fire against a later picker session.
let _iconPickerOnSelect = null;

function openIconPicker(opts = {}) {
  const modal = document.getElementById('iconPickerModal');
  if (!modal) { console.warn('[openIconPicker] iconPickerModal not in DOM'); return; }
  _iconPickerOnSelect = typeof opts.onSelect === 'function' ? opts.onSelect : null;

  // Render bundled grid every open — cheap, guarantees fresh "selected"
  // state if the caller passed a different currentIcon.
  const grid = document.getElementById('iconPickerBundledGrid');
  if (grid) {
    grid.innerHTML = ICON_PICKER_BUNDLED.map(section => `
      <div class="icon-picker-section-header">${esc(section.section)}</div>
      <div class="icon-picker-section-grid">
        ${section.items.map(it => `
          <button type="button" class="icon-picker-tile${opts.currentIcon === it.src ? ' is-selected' : ''}"
                  onclick="_iconPickerSelect('${esc(it.src)}')"
                  title="${esc(it.name)}">
            <img src="${it.src}" alt="${esc(it.name)}" class="icon-picker-tile-img"
                 onerror="this.style.opacity='0.2'">
            <span class="icon-picker-tile-name">${esc(it.name)}</span>
          </button>
        `).join('')}
      </div>
    `).join('');
  }

  // Reset upload tab to clean state
  const upWrap = document.getElementById('iconPickerUploadWrap');
  if (upWrap) upWrap.classList.remove('has-user-icon');
  const upPreview = document.getElementById('iconPickerUploadPreview');
  if (upPreview) { upPreview.src = ''; upPreview.style.display = 'none'; }
  const upFile = document.getElementById('iconPickerUploadFile');
  if (upFile) upFile.value = '';
  const upConfirm = document.getElementById('iconPickerUploadConfirm');
  if (upConfirm) upConfirm.disabled = true;

  // Default tab: Bundled
  _iconPickerSwitchTab('bundled');

  modal.classList.add('active');
}

function closeIconPicker() {
  const modal = document.getElementById('iconPickerModal');
  if (modal) modal.classList.remove('active');
  _iconPickerOnSelect = null;
}

function _iconPickerSwitchTab(which) {
  ['bundled', 'upload'].forEach(t => {
    const tab  = document.getElementById(`iconPickerTab-${t}`);
    const pane = document.getElementById(`iconPickerPane-${t}`);
    if (tab)  tab.classList.toggle('is-active',  t === which);
    if (pane) pane.classList.toggle('is-active', t === which);
  });
}

function _iconPickerSelect(src) {
  if (_iconPickerOnSelect) {
    try { _iconPickerOnSelect(src); } catch(e) { console.warn('[iconPicker] onSelect threw:', e); }
  }
  closeIconPicker();
}

// Upload tab — file input → resize to 256×256 max → base64 → preview.
// Confirm button fires onSelect with the data URL. Mirrors wfIconUpload's
// resize logic so behavior is consistent with the Add Custom AI flow.
function _iconPickerHandleUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('⚠️ Please pick an image file (PNG, JPG, SVG, WEBP)');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 256;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      let dataURL;
      try {
        dataURL = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
      } catch(err) {
        console.warn('[iconPicker] canvas export failed, using raw read:', err);
        dataURL = e.target.result;
      }
      const preview = document.getElementById('iconPickerUploadPreview');
      if (preview) { preview.src = dataURL; preview.style.display = 'block'; }
      const wrap = document.getElementById('iconPickerUploadWrap');
      if (wrap) wrap.classList.add('has-user-icon');
      const confirmBtn = document.getElementById('iconPickerUploadConfirm');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.dataset.dataUrl = dataURL;
      }
    };
    img.onerror = () => toast('⚠️ Could not read that image');
    img.src = e.target.result;
  };
  reader.onerror = () => toast('⚠️ File read failed');
  reader.readAsDataURL(file);
}

function _iconPickerConfirmUpload() {
  const btn = document.getElementById('iconPickerUploadConfirm');
  const dataURL = btn?.dataset?.dataUrl;
  if (!dataURL) { toast('⚠️ Pick an image first'); return; }
  _iconPickerSelect(dataURL);
}

// Picker invocation for a specific Import Server checklist row. Updates
// _importRowIcons[i] and re-renders only that row's <img> rather than the
// whole list — keeps focus/scroll position intact during rapid icon edits.
function openIconPickerForImportRow(rowIdx) {
  const current = _importRowIcons[rowIdx] || GENERIC_ICON_PATH;
  openIconPicker({
    currentIcon: current,
    onSelect: (src) => {
      _importRowIcons[rowIdx] = src;
      const imgEl = document.querySelector(`#isicon-${rowIdx} img`);
      if (imgEl) { imgEl.src = src; imgEl.style.opacity = '1'; }
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// v3.30.4 — Persistent checkbox bulk-remove for custom AIs
// ────────────────────────────────────────────────────────────────────
// Custom AI rows show a checkbox at rest (where the trash button used
// to be). The toolbar above the AI list shows live counters and a
// destructive "Remove N" button that's disabled when nothing is ticked.
// No mode to enter, no mode to cancel — selection state IS the UI.
//
// This also positions the checkbox state for future Phase-2 work:
// once selection is first-class, "Save current selection as a Profile"
// becomes a small additive feature (Work Laptop / Home Desktop /
// Document-X / etc.) that reuses the same _selectedCustomIds set.
//
// Defaults still get a Hide button. "Remove" and "Hide" remain
// distinct operations and defaults are intentionally non-selectable
// for bulk removal.
// ════════════════════════════════════════════════════════════════════
const _selectedCustomIds = new Set();

function toggleCustomSelection(id, checked) {
  if (checked) _selectedCustomIds.add(id);
  else _selectedCustomIds.delete(id);
  // Lightweight refresh — only the toolbar counter/button-state changes.
  // Avoiding a full renderAISetupGrid keeps the row's checkbox from
  // losing focus mid-click and prevents any input field below from
  // flickering as the user ticks through several rows.
  refreshBulkSelectToolbar();
}

function selectAllCustoms() {
  aiList.forEach(ai => {
    const isCustom = !DEFAULT_AIS.find(d => d.id === ai.id);
    if (isCustom) _selectedCustomIds.add(ai.id);
  });
  // Full re-render here — every custom row's checkbox state needs to flip.
  renderAISetupGrid();
}

function selectNoneCustoms() {
  if (!_selectedCustomIds.size) return;
  _selectedCustomIds.clear();
  renderAISetupGrid();
}

// Re-render only the bulk-select toolbar in place. Used by per-row
// checkbox toggles so the user can rapidly tick through several AIs
// without the whole grid re-rendering on each click.
function refreshBulkSelectToolbar() {
  const host = document.getElementById('bulkSelectToolbar');
  if (!host) return;
  host.outerHTML = buildBulkSelectToolbarHTML();
}

async function bulkRemoveSelectedAIs() {
  // Snapshot to a plain array so subsequent mutations don't surprise the loop
  const ids = Array.from(_selectedCustomIds);
  // Defensive filter — UI only adds custom ids to the set, but defense in
  // depth in case an outer caller ever poked at _selectedCustomIds directly.
  const customs = ids.filter(id => !DEFAULT_AIS.find(d => d.id === id) && aiList.find(a => a.id === id));
  if (!customs.length) {
    toast('Nothing selected — tick at least one custom AI');
    return;
  }
  const ok = await wfConfirm(
    'Remove selected AIs',
    `Remove ${customs.length} custom AI${customs.length !== 1 ? 's' : ''}? This deletes their bees, API configs, and cached recommendations. Default AIs in your hive are not affected.`,
    { okText: `Remove ${customs.length}`, destructive: true }
  );
  if (!ok) return;

  customs.forEach(id => {
    aiList    = aiList.filter(a => a.id !== id);
    activeAIs = activeAIs.filter(a => a.id !== id);
    if (builder === id) builder = null;
    // Custom AIs: full delete. Drops the AI from both lists, releases the
    // builder slot if it was held, removes the API config, and purges the
    // three per-AI localStorage keys (recommend cache, models cache).
    if (API_CONFIGS[id]) delete API_CONFIGS[id];
    // v3.32.10 — clear legacy single-pick keys AND new role-specific keys.
    try { localStorage.removeItem(`waxframe_recommend_default-${id}`); } catch(e) { /* ignore */ }
    try { localStorage.removeItem(`waxframe_recommend_default-${id}-reviewer`); } catch(e) { /* ignore */ }
    try { localStorage.removeItem(`waxframe_recommend_default-${id}-builder`);  } catch(e) { /* ignore */ }
    try { localStorage.removeItem(`waxframe_recommend_custom-${id}`);  } catch(e) { /* ignore */ }
    try { localStorage.removeItem(`waxframe_recommend_custom-${id}-reviewer`);  } catch(e) { /* ignore */ }
    try { localStorage.removeItem(`waxframe_recommend_custom-${id}-builder`);   } catch(e) { /* ignore */ }
    try { localStorage.removeItem(`waxframe_models_${id}`);             } catch(e) { /* ignore */ }
  });

  _selectedCustomIds.clear();
  saveHive();
  renderAISetupGrid();
  toast(`🗑 Removed ${customs.length} AI${customs.length !== 1 ? 's' : ''}`);
}

function buildBulkSelectToolbarHTML() {
  // Hide entire toolbar when there are no custom AIs to act on — keeps the
  // default-AI-only setup screen uncluttered.
  const customCount = aiList.filter(a => !DEFAULT_AIS.find(d => d.id === a.id)).length;
  if (!customCount) return '<div id="bulkSelectToolbar" class="bulk-select-toolbar bulk-select-toolbar--empty"></div>';

  // Reconcile selected set against current customs — purges any stale ids
  // that may have lingered from an earlier state (e.g. an AI was removed
  // by another path while still ticked).
  const customIds = new Set(
    aiList.filter(a => !DEFAULT_AIS.find(d => d.id === a.id)).map(a => a.id)
  );
  Array.from(_selectedCustomIds).forEach(id => {
    if (!customIds.has(id)) _selectedCustomIds.delete(id);
  });

  const selCount = _selectedCustomIds.size;
  const allSelected = (selCount === customCount);
  return `
  <div id="bulkSelectToolbar" class="bulk-select-toolbar">
    <span class="bulk-select-status">
      <strong>${selCount}</strong> of <strong>${customCount}</strong> custom AI${customCount !== 1 ? 's' : ''} selected
    </span>
    <div class="bulk-select-actions">
      <button class="btn btn-xs" ${allSelected ? 'disabled' : ''} onclick="selectAllCustoms()" title="Select every custom AI">All</button>
      <button class="btn btn-xs" ${selCount === 0 ? 'disabled' : ''} onclick="selectNoneCustoms()" title="Clear selection">None</button>
      <button class="btn btn-danger bulk-select-remove-btn" ${selCount === 0 ? 'disabled' : ''} onclick="bulkRemoveSelectedAIs()" title="${selCount === 0 ? 'Tick at least one custom AI to enable' : `Remove ${selCount} selected`}">
        🗑 Remove ${selCount}
      </button>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════
// v3.30.3 — Imported Groups Panel REMOVED
// ────────────────────────────────────────────────────────────────────
// The Imported Groups panel (added v3.30.1) duplicated information
// already visible in the AI list below and didn't scale beyond a
// handful of imports. Multi-select toolbar (above) covers every former
// use case: "All" selects every custom; checkboxes pick any subset;
// removal cleans the same per-AI localStorage keys. removeImportedGroup
// and buildImportedGroupsPanelHTML deleted with this release.
// ════════════════════════════════════════════════════════════════════

// Resolve the best icon for an AI — local image if name matches a known provider,
// colored initial avatar as fallback when the real icon would be a broken globe.
function resolveAiIcon(ai, cssClass, size) {
  // v3.53.2 — XSS hardening. Codex security audit (2026-05-17) finding
  // #5 flagged this function and makeAiAvatarHTML below as the two
  // remaining sites in app.js where user-controlled data (ai.name,
  // ai.icon, ai.id, cssClass) was interpolated raw into HTML strings,
  // including inside inline onerror= JS string literals. A custom or
  // imported AI config with ai.name = `'"><img src=x onerror=alert(1)>`
  // would inject executable code on every render.
  //
  // Hardening done here:
  //   1. Numeric coercion on size (was raw template interpolation).
  //   2. escapeHtml() on ai.name and cssClass for every attribute they
  //      land in (alt, class, data-*) — handles & < > " '.
  //   3. URL scheme validation on ai.icon — only http(s)://, data:image/,
  //      or relative images/ paths pass; javascript:, vbscript:, file:,
  //      and other schemes drop through to the letter-avatar fallback.
  //   4. The inline onerror handler no longer interpolates ANY user
  //      data into the JS string literal — it calls
  //      resolveAiIconFallback(this) with the original name/class/size
  //      carried via escaped data-* attributes. The previous shape
  //      ("onerror='...makeAiAvatar(\"${ai.name}\",...)'") was the
  //      actual XSS sink; user data inside JS-inside-HTML is a
  //      double-context that simple HTML escaping doesn't fully cover.
  const sz = Number(size) || 20;
  const safeName  = escapeHtml(ai.name || '');
  const safeClass = escapeHtml(cssClass || '');
  const name = (ai.name || '').toLowerCase();
  const model = (ai.id || '').toLowerCase();
  const combined = name + ' ' + model;

  // v3.29.10 — switched all icons from the Google favicon proxy to local
  // PNGs in images/. The favicon proxy returned tiny blurry images that
  // looked like fuzzy white blobs on the dark theme (Mistral was the
  // worst offender — looked like a moon).
  // v3.29.11 — added LM Studio, Open WebUI, and Together AI matchers.
  // v3.32.15 — Removed server-runtime entries (Alfredo, LM Studio,
  // Open WebUI, Together) from auto-detect. Those are runtimes that host
  // other models, not model brands. Auto-detecting them off a model name
  // is a category error — the model name almost never contains the
  // runtime name. They're still available as one-click presets in the
  // Import Server modal and as choices in the bundled icon picker. KEEP
  // IN SYNC with wfIconUpload._CATALOG above.
  const known = [
    { keys: ['claude', 'anthropic'],            src: 'images/icon-claude.png' },
    { keys: ['chatgpt', 'openai', 'gpt'],       src: 'images/icon-chatgpt.png' },
    { keys: ['gemini', 'google'],               src: 'images/icon-gemini.png' },
    { keys: ['grok', 'x.ai', 'xai'],            src: 'images/icon-grok.png' },
    { keys: ['deepseek'],                       src: 'images/icon-deepseek.png' },
    { keys: ['perplexity'],                     src: 'images/icon-perplexity.png' },
    { keys: ['mistral', 'mixtral', 'codestral', 'ministral'], src: 'images/icon-mistral.png' },
    { keys: ['llama', 'meta'],                  src: 'images/icon-llama.png' },
    { keys: ['cohere', 'command'],              src: 'images/icon-cohere.png' },
  ];

  // Shared builder for the safe <img> tag. `src` is the only call-site
  // input — internal callers pass hardcoded entry.src; the user-icon
  // branch passes ai.icon AFTER scheme validation. Both go through
  // escapeHtml as defense in depth.
  const buildIconImg = (src) =>
    `<img src="${escapeHtml(src)}" class="${safeClass}" width="${sz}" height="${sz}" alt="${safeName}"` +
    ` data-ai-name="${safeName}" data-ai-class="${safeClass}" data-ai-size="${sz}"` +
    ` onerror="resolveAiIconFallback(this)">`;

  for (const entry of known) {
    if (entry.keys.some(k => combined.includes(k))) {
      return buildIconImg(entry.src);
    }
  }

  // No known match — check if the AI already has a non-globe icon URL we should try.
  // v3.53.2 — validate the URL scheme before accepting. Three accepted shapes:
  //   • http://… or https://…  (external icon hosts)
  //   • data:image/…            (inline data URLs from wfIconUpload)
  //   • images/…                (local hardcoded paths — internal only)
  // Anything else (javascript:, vbscript:, file:, ftp:, protocol-relative
  // //evil.com, etc.) drops through to the letter-avatar fallback.
  if (ai.icon && !ai.icon.includes('google.com/s2/favicons') &&
      /^(https?:\/\/|data:image\/|images\/)/.test(ai.icon)) {
    return buildIconImg(ai.icon);
  }

  // Fallback: colored initial avatar
  return makeAiAvatarHTML(ai.name, sz, cssClass);
}

// v3.53.2 — onerror landing function for resolveAiIcon's <img> tag.
// The previous shape inlined ai.name/cssClass/size into the onerror
// JS string literal, which was the XSS sink. Now the onerror is the
// fixed string "resolveAiIconFallback(this)" — zero interpolation —
// and this function reads the original values from the img's
// data-* attributes (which are HTML-escaped at write time). Browsers
// decode HTML entities on attribute read, so dataset.aiName returns
// the original raw string, which is then passed to makeAiAvatar's
// DOM-API construction path. The XSS-sink data path is broken at
// every step.
function resolveAiIconFallback(img) {
  if (!img || !img.dataset) return;
  const name = img.dataset.aiName || '';
  const size = Number(img.dataset.aiSize) || 20;
  const cssClass = img.dataset.aiClass || '';
  img.replaceWith(makeAiAvatar(name, size, cssClass));
}

function makeAiAvatar(name, size, cssClass) {
  // v3.53.2 — numeric coercion on size; otherwise unchanged.
  // This function already used DOM-API construction (createElement +
  // textContent + style.cssText), so it was the safest of the icon
  // helpers — but a malicious size value could still poison the
  // generated cssText. Number() coercion makes that impossible.
  const sz = Number(size) || 20;
  const el = document.createElement('span');
  el.className = (cssClass || 'hex-icon-avatar') + ' hex-icon-avatar';
  el.style.cssText = `width:${sz}px;height:${sz}px;background:${avatarColor(name)};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz*0.55)}px;font-weight:800;color:#fff;text-transform:uppercase;flex-shrink:0;`;
  el.textContent = firstAlnumChar(name);
  return el;
}

function makeAiAvatarHTML(name, size, cssClass) {
  // v3.53.2 — same hardening rationale as resolveAiIcon above.
  // cssClass was interpolated raw into class="" and indirectly via
  // the inline style — escape it. Size and font-size coerced to
  // Number. Color comes from a hardcoded 10-entry palette (avatarColor)
  // and letter is constrained by firstAlnumChar's regex to one
  // alphanumeric char or "?", so those two are inherently safe.
  const sz = Number(size) || 20;
  const fs = Math.round(sz * 0.55);
  const color = avatarColor(name);
  const letter = firstAlnumChar(name);
  const safeClass = escapeHtml(cssClass || 'hex-icon-avatar');
  return `<span class="${safeClass} hex-icon-avatar" style="width:${sz}px;height:${sz}px;background:${color};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:800;color:#fff;text-transform:uppercase;flex-shrink:0;">${letter}</span>`;
}

// v3.32.15 — Avatar letter pickup. Skips non-alphanumeric leading characters
// so names like "[Base] Claude-3-7-Sonnet" produce "B" instead of "[". Falls
// back to "?" if there's no alphanumeric character at all.
function firstAlnumChar(name) {
  const match = (name || '').match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : '?';
}

function avatarColor(name) {
  // Deterministic color from name string
  const palette = ['#e05c3a','#3a7de0','#9b5de5','#00b4d8','#f77f00','#06d6a0','#e63946','#457b9d','#8338ec','#fb8500'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}

// ── v3.32.29 — Bee-dot tooltip (laptop viewport ≤1600px) ──
// Custom 3-line tooltip that appears on hover/focus over a .bee-dot:
//   • AI name (bold)
//   • Role: Builder | Reviewer
//   • Current state (mirrors the big-card .hex-status text — pulled from
//     blive-${id} which is the same element setBeeStatus writes to)
// The tooltip element is a singleton appended to <body> on first show.
// State line updates live: setBeeStatus calls refreshBeeTooltip(id) at
// the end of each call when window._wfHoveredBeeId === id, so a hover
// that started during 'Reviewing…' will tick over to 'No changes needed
// ✓' (or whatever) the moment the state changes — no need to mouseleave/
// re-enter. Native browser `title` attribute was removed to avoid the
// double-tooltip artifact on slow hover.
function ensureBeeTooltipEl() {
  let tt = document.getElementById('beeDotTooltip');
  if (tt) return tt;
  tt = document.createElement('div');
  tt.id = 'beeDotTooltip';
  tt.className = 'bee-dot-tooltip';
  tt.setAttribute('role', 'tooltip');
  tt.innerHTML =
    '<div class="bdt-name"></div>' +
    '<div class="bdt-role"></div>' +
    '<div class="bdt-state"></div>';
  document.body.appendChild(tt);
  return tt;
}

function getBeeStateText(aiId) {
  // Pull the live status text from the (hidden-at-laptop) hex-card's
  // status element — single source of truth for what the AI is doing
  // right now. Cards are hidden via `.hex-grid { display: none }` at
  // ≤1600px but the elements still exist in DOM, so getElementById
  // works fine.
  const live = document.getElementById('blive-' + aiId);
  if (live && live.textContent && live.textContent.trim()) return live.textContent.trim();
  return 'Idle';
}

function showBeeTooltip(aiId, dotEl) {
  if (!aiId || !dotEl) return;
  const ai = activeAIs.find(a => a.id === aiId);
  if (!ai) return;
  const tt = ensureBeeTooltipEl();
  tt.querySelector('.bdt-name').textContent  = ai.name;
  tt.querySelector('.bdt-role').textContent  = aiId === builder ? 'Builder' : 'Reviewer';
  tt.querySelector('.bdt-state').textContent = getBeeStateText(aiId);
  // Position above the dot, centered. Show first so we can read offsetWidth.
  tt.classList.add('is-visible');
  const r  = dotEl.getBoundingClientRect();
  const tw = tt.offsetWidth;
  const th = tt.offsetHeight;
  let left = r.left + r.width / 2 - tw / 2;
  let top  = r.top - th - 8;
  // Clamp to viewport so the tooltip never falls off the left/right edge.
  const pad = 8;
  if (left < pad) left = pad;
  if (left + tw > window.innerWidth - pad) left = window.innerWidth - tw - pad;
  // If above-the-dot would clip the top, flip below the dot.
  if (top < pad) {
    top = r.bottom + 8;
    tt.classList.add('is-below');
  } else {
    tt.classList.remove('is-below');
  }
  tt.style.left = left + 'px';
  tt.style.top  = top  + 'px';
  window._wfHoveredBeeId = aiId;
}

function hideBeeTooltip() {
  const tt = document.getElementById('beeDotTooltip');
  if (tt) tt.classList.remove('is-visible');
  window._wfHoveredBeeId = null;
}

function refreshBeeTooltip(aiId) {
  const tt = document.getElementById('beeDotTooltip');
  if (!tt || !tt.classList.contains('is-visible')) return;
  if (window._wfHoveredBeeId !== aiId) return;
  const ai = activeAIs.find(a => a.id === aiId);
  if (!ai) return;
  tt.querySelector('.bdt-name').textContent  = ai.name;
  tt.querySelector('.bdt-role').textContent  = aiId === builder ? 'Builder' : 'Reviewer';
  tt.querySelector('.bdt-state').textContent = getBeeStateText(aiId);
}

function renderBeeDotStrip() {
  const strip = document.getElementById('beeDotStrip');
  if (!strip) return;
  if (!window.sessionAIs) window.sessionAIs = new Set(activeAIs.map(a => a.id));
  strip.innerHTML = activeAIs.map(ai => {
    const isB  = ai.id === builder;
    const isOn = isB || window.sessionAIs.has(ai.id);
    const stateClass = isB ? 'is-builder' : isOn ? 'is-active' : 'is-inactive';
    const iconEl = resolveAiIcon(ai, 'bee-dot-img', 18);
    // v3.32.29 — Custom hover tooltip replaces native `title` attribute.
    // Three lines: AI name, role (Builder/Reviewer), live state. The state
    // line updates as the round progresses (see refreshBeeTooltip call in
    // setBeeStatus). Native title removed to prevent the double-tooltip
    // (browser-default + custom) artifact on slow hover.
    return `<div class="bee-dot ${stateClass}" id="bdot-${ai.id}" data-ai-id="${ai.id}"
      onmouseenter="showBeeTooltip('${ai.id}', this)"
      onmouseleave="hideBeeTooltip()"
      onfocus="showBeeTooltip('${ai.id}', this)"
      onblur="hideBeeTooltip()"
      tabindex="0"><span class="bee-dot-star" aria-hidden="true">★</span>${iconEl}</div>`;
  }).join('');
  // v3.32.14 — Rehydrate satisfaction state after innerHTML rebuild. The
  // dot strip can be rebuilt independently (toggleSessionBee onchange
  // handler at the hex-cell calls renderBeeDotStrip directly) so it
  // needs the same defense as renderBeeStatusGrid.
  if (window._cleanThisRound) {
    window._cleanThisRound.forEach(aiId => {
      setBeeStatus(aiId, 'done', 'No changes needed ✓');
    });
  }
}

function openEditHive() {
  const list = document.getElementById('editHiveList');
  if (!list) return;
  if (!window.sessionAIs) window.sessionAIs = new Set(activeAIs.map(a => a.id));
  list.innerHTML = activeAIs.map(ai => {
    const isB  = ai.id === builder;
    const isOn = isB || window.sessionAIs.has(ai.id);
    const iconEl = resolveAiIcon(ai, 'edit-hive-avatar', 24);
    return `
    <div class="edit-hive-row${isB ? ' is-builder-row' : ''}">
      ${iconEl}
      <span class="edit-hive-name">${ai.name}</span>
      ${isB
        ? `<span class="edit-hive-tag">BUILDER</span>`
        : `<input type="checkbox" class="edit-hive-toggle" ${isOn ? 'checked' : ''}
             onchange="toggleSessionBee('${ai.id}', this.checked); renderBeeDotStrip();">`
      }
    </div>`;
  }).join('');
  document.getElementById('editHiveModal').classList.add('active');
}

function closeEditHive() {
  document.getElementById('editHiveModal').classList.remove('active');
}

// v3.49.0 — Pending builder-disable state. Set when the user tries to
// disable the current builder AI. Holds the id of the AI awaiting
// disable completion. Cleared when:
//   • setBuilderFromModal runs (picks a new builder → completes disable)
//   • closeChangeBuilder runs without a builder change (user cancelled)
let _pendingBuilderDisable = null;

function toggleSessionBee(id, on) {
  if (!window.sessionAIs) window.sessionAIs = new Set(activeAIs.map(a => a.id));
  // v3.49.0 — Builder-disable interception. Prevent the bug where
  // toggling off the current builder greys the card but leaves the
  // builder reference pointing at the now-disabled AI, which then
  // continues building on subsequent rounds with no UI affordance to
  // re-enable (builder cards render without checkboxes). Route through
  // the Change Builder modal: user must pick a new builder before the
  // disable completes. Cancelling the modal leaves the AI enabled.
  // Returns false when the toggle is deferred to the modal, true when
  // it completed immediately. Callers (e.g. the slow-responder card
  // handler) can use this to gate post-action toasts.
  if (!on && id === builder) {
    _pendingBuilderDisable = id;
    const name = activeAIs.find(a => a.id === id)?.name || 'This AI';
    openChangeBuilder({
      reason: `${name} is your Builder. Pick a new Builder to continue disabling it. Cancel to keep ${name} as Builder.`,
      excludeId: id
    });
    return false;  // deferred — disable completes inside setBuilderFromModal
  }
  if (on) {
    window.sessionAIs.add(id);
  } else {
    window.sessionAIs.delete(id);
  }
  const card = document.getElementById('bcard-' + id);
  if (card) {
    card.classList.toggle('is-active', on);
    card.classList.toggle('is-inactive', !on);
  }
  // v3.32.26 — Persist the toggle. Without this, sessionAIs only saved
  // when something else triggered saveSession (next round, doc change,
  // notes edit, etc.); a quick toggle followed by a refresh would lose
  // the change. Cheap call — saveSession is async and serialized
  // through _saveSessionChain so back-to-back toggles can't race.
  saveSession();
  return true;
}

// v3.32.14 — Durable per-round satisfaction tracking, hardened.
// Builds on the v3.32.10 chokepoint with two changes that close the
// remaining holes the original couldn't reach:
//
// 1) Universal re-derive (was: only `state === 'done'`). Any non-'sending'
//    and non-'error' state now consults `_cleanThisRound` and re-applies
//    `is-clean` if the AI was satisfied this round. Was previously
//    possible for an 'idle' wipe (convergence path) or a stray 'done'
//    summary mismatch to drop the star while the data still said
//    satisfied. The Set is the source of truth; the DOM is rebuilt from
//    it on every setBeeStatus call.
// 2) Renderer rehydration (see renderBeeStatusGrid / renderBeeDotStrip
//    below). When either innerHTML rebuild fires mid-session — Edit Hive
//    toggle, Change Builder modal, settings return — they walk
//    _cleanThisRound and re-apply `is-clean`+`is-done` to each card and
//    dot. Without this, a rebuild silently desynced the DOM from the
//    truth.
//
// Reset rules unchanged: cleared at runRound start (full Set wipe),
// per-AI 'sending' state clears that one entry. 'error' and 'done-clean'
// inputs do NOT touch the Set beyond their original contracts.
//
// Dead branches removed: 'thinking' and 'streaming' had handler code but
// zero callers (greps clean across all of app.js). Trimmed to keep the
// state machine honest. 'idle' is now an explicit branch instead of an
// else-fallthrough so the state name appears in the function body.
if (!window._cleanThisRound) window._cleanThisRound = new Set();

function setBeeStatus(id, state, summary) {
  const card = document.getElementById('bcard-' + id);
  const dot  = document.getElementById('bdot-' + id);
  const live = document.getElementById('blive-' + id);
  if (!card && !dot) return;

  // v3.35.3 — Removed the gated [wfSat] diagnostic added in v3.32.29
  // for the persistent satisfaction-indicator inconsistency bug. The
  // instrumentation never produced a captured trace, the satisfaction-
  // indicator bug is now parked, and the dead instrumentation was a
  // ~120-line block of overhead with no consumer. The architectural
  // pieces it was probing (the _cleanThisRound Set chokepoint at line
  // 11168 below, the universal re-derive at line ~11178, and the
  // renderer rehydration in renderBeeStatusGrid) all stay in place
  // unchanged — only the logger was removed.

  // ── Track satisfaction signal at the chokepoint ──
  // 'done-clean' input registers this AI as satisfied for the round.
  // Per-round wipe is handled explicitly by runRound() at smoke-phase
  // start (`_cleanThisRound.clear()` in the round-reset block) — the
  // state machine itself no longer touches the Set on transition,
  // because the prior delete-on-sending side-effect (removed in
  // v3.32.26) caused a visible star flicker on the Builder card every
  // round: a satisfied reviewer that was also the Builder would
  // transition to 'sending' for the build phase, lose its star, then
  // get it re-promoted by runRound's builderWasClean path on build-
  // success — visible "★ → gone → ★" cycle every round. The explicit
  // round-start clear fully covers the smoke-phase reset semantic
  // without needing the side-effect, so removing it is safe.
  if (state === 'done-clean') window._cleanThisRound.add(id);

  // ── Universal re-derive ──
  // For ANY state that isn't 'sending' or 'error', if this AI is
  // currently in _cleanThisRound, render it as 'done-clean'. Catches:
  //   • 'done' calls from the Builder phase or any late path
  //   • 'idle' wipes (none in v3.32.14 codepaths but defensive)
  //   • Any future state that arrives while satisfaction is live
  let effectiveState = state;
  let effectiveSummary = summary;
  if (state !== 'sending' && state !== 'error' && window._cleanThisRound.has(id)) {
    effectiveState = 'done-clean';
    if (!summary || summary === 'Done ✓' || summary === 'Document updated ✓' || summary === '') {
      effectiveSummary = 'No changes needed ✓';
    }
  }

  const allStates = ['is-working', 'is-sending', 'is-responding', 'is-done', 'is-error', 'is-clean'];
  if (card) card.classList.remove(...allStates);
  if (dot)  dot.classList.remove(...allStates);

  const add = cls => { if (card) card.classList.add(cls); if (dot) dot.classList.add(cls); };

  if (effectiveState === 'sending') {
    add('is-sending');
    // v3.32.27 — Preserve the is-clean visual class during 'sending'
    // transitions when this AI was satisfied this round. v3.32.26
    // fixed the data-side flicker (kept the AI in _cleanThisRound
    // through the build phase by removing the delete-on-sending
    // side-effect), but the VISUAL flicker remained because:
    //   1. line 10275 wipes ALL state classes including is-clean
    //   2. the universal re-derive at line 10267 explicitly skips
    //      'sending' state, so is-clean isn't re-applied via the
    //      done-clean promotion path
    //   3. this branch only added is-sending
    // Result: satisfied builder transitioning to 'Building…' lost
    // its green border + star until the build completed and the
    // builderWasClean re-promotion fired. Now is-clean coexists
    // with is-sending while the build runs:
    //   • Border: green (is-clean wins via CSS source order)
    //   • Pulsing animation: yes (is-sending)
    //   • Star: visible (.hex-cell.is-clean .hex-clean-star rule)
    //   • Status text: "BUILDING…" in blue (is-sending text color)
    // The "this AI was satisfied" anchor persists through the build
    // while the activity is also clearly indicated.
    if (window._cleanThisRound.has(id)) add('is-clean');
    // v3.32.21 — Was hardcoded to "Sending…" regardless of summary
    // arg. Both call sites pass meaningful summaries: 'Building…' for
    // the Builder during the build phase and 'Reviewing…' for
    // reviewers during the smoke phase. The hardcoded override
    // silently lost the distinction — Builder cards said "SENDING…"
    // during build instead of "BUILDING…", reviewer cards said
    // "SENDING…" during reviews instead of "REVIEWING…". Now the
    // passed summary is honored; "Sending…" is only the fallback
    // when no summary was provided.
    if (live) live.textContent = effectiveSummary || 'Sending…';
  } else if (effectiveState === 'done') {
    add('is-done');
    if (live) live.textContent = 'Done ✓';
  } else if (effectiveState === 'done-clean') {
    add('is-done'); add('is-clean');
    if (live) live.textContent = effectiveSummary || 'No changes needed';
  } else if (effectiveState === 'error') {
    add('is-error');
    if (live) live.textContent = 'Failed';
  } else {
    // 'idle' / pre-round / unknown — clean slate, no class added
    if (live) live.textContent = 'Idle';
  }

  // v3.35.3 — Live update of the bee-dot tooltip if the user is currently
  // hovering this AI's dot. Without this, hovering a dot during a round
  // would show stale state text (the state at hover-start, frozen until
  // mouseleave/re-enter). Cheap call: only fires the DOM read+write when
  // the hovered ID matches.
  if (window._wfHoveredBeeId === id) {
    refreshBeeTooltip(id);
  }
}

// ── PROMPTS ──
const DEFAULT_PHASE_INSTRUCTIONS = {

  draft_scratch: `You are part of a multi-AI collaboration called WaxFrame. Do not adopt any additional role, persona, or framing beyond what is stated here.

Your task: Create a complete first draft based on the project goal provided in this message.

RULES:
- Use plain text only. Do not use markdown headings (#), bullets (-), bold (**), italics, tables, or code fences. If the document requires section headings, write them in plain text on their own line.
- Do not use ellipses (...) or placeholders — write every word of the document from start to finish.
- Do not include meta-commentary, explanations of your choices, apologies, introductions, or any text that is not part of the document itself.
- Do not reference WaxFrame, this prompt, or the collaboration process anywhere in the draft.
- Do not invent facts, data, names, or references not supported by the project goal. Use clearly labeled placeholders (e.g., [INSERT DATE]) when specific information is missing.
- If critical information is missing from the project goal, make the fewest necessary assumptions and keep them conservative.
- Prioritize completeness, clarity, internal consistency, and practical usefulness.`,

  refine: `You are in the text refinement phase of a multi-AI collaboration called WaxFrame. Do not adopt any additional role, persona, or framing beyond what is stated here.

Review the current document provided in this message and give specific, numbered suggestions to improve it — but ONLY if genuine improvements exist.

Begin your response immediately with suggestion number 1. Do not include an introduction, preamble, or restatement of the document.

RULES:
- Do NOT rewrite the document. Do not quote or restate large portions of it.
- Number every suggestion starting from 1.
- Each suggestion must identify the exact line number and section and propose a concrete change. Example: "Line 42: Change 'notify supervisor' to 'alert team lead'."
- Focus on clarity, precision, internal consistency, tone, and logical flow only.
- Do not suggest formatting, structural layout, or markup changes.
- Do not introduce new content that changes the intended meaning of the document.
- Keep each suggestion to one sentence maximum — no explanations, no justifications.
- Give your TOP 3 most impactful suggestions only. If you have more, choose the three that matter most.
- ⚠️ Do NOT suggest changes for the sake of suggesting changes. Punctuation preferences, synonym swaps, stylistic alternatives, and trivial rephrasing are NOT valid suggestions. A suggestion is only valid if it meaningfully improves the document's effectiveness for its stated purpose.
- ⚠️ If the document is already clear, well-written, and serving its stated purpose — respond with only: NO CHANGES NEEDED. This is the correct and expected response when no genuine improvement exists. Do not search for something to suggest just to avoid this response.

⚠️ IMPORTANT: Any response that contains a full rewritten document, large continuous blocks of revised text, or anything other than a numbered suggestion list will be considered non-compliant and discarded.`,

  review: `You are the Builder in this WaxFrame collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

The team has been refining this document and the user is ready for a clean review copy.

Your task: Produce the complete, clean current version of the document as it stands now.

RULES:
- Return the full document — every section, complete. Do not use ellipses or placeholders.
- Use plain text only. Do not use markdown headings, bullets, bold, italics, or tables. Write section headings as plain text on their own line if the document requires them.
- Do not add meta-commentary, explanations, or any text that is not part of the document itself.
- Do not introduce new content, requirements, or changes not already present in the document.
- Do not place any content outside the required wrapper blocks.
- Structure your response EXACTLY like this — nothing before %%DOCUMENT_START%%, nothing after %%DOCUMENT_END%%:

%%DOCUMENT_START%%
...the complete document here...
%%DOCUMENT_END%%`,

};

// Builder instructions — used when responses are present (Builder compiles the updated doc)
const BUILDER_INSTRUCTIONS = {
  refine: `You are the Builder in this WaxFrame collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

All reviewer suggestions are included above. Your task: produce the complete updated document incorporating valid suggestions.

A valid suggestion is one that improves clarity, accuracy, consistency, logic, or readability without changing the document's intended meaning or scope.

MAJORITY RULES — CONFLICT DECISION LOGIC:
The user is the source of voice, audience awareness, and intent. When reviewers disagree on stylistic, tonal, or wording choices, the user picks. Your role is to apply unanimous improvements silently and surface real disagreements to the user — not to choose between competing voices on their behalf.

Before deciding whether to apply or flag a suggestion, count how many reviewers independently engaged with the same phrasing or section:
- A strict majority of reviewers (more than half) proposed the same change (or substantially the same change) → apply it automatically. Do not flag this as a conflict.
- Two or more reviewers proposed substantially different alternatives for the same phrasing → flag as a USER DECISION conflict so the user can resolve it. This is the default behavior for ordinary stylistic, tonal, or wording disagreement at any hive size.
- Only 1 reviewer suggests something with no opposing alternative → apply it if valid, skip it if not. Do not flag solo suggestions as conflicts.
- BUILDER DECISION is reserved for cases where a reviewer suggestion conflicts with the project goal, the reference material, or a constraint the user explicitly stated — situations where you must override one side to maintain document integrity. Do NOT use BUILDER DECISION for ordinary stylistic or wording disagreement; that belongs in USER DECISION.

RULES:
- Return the FULL document — every section, complete. Do not use ellipses or placeholders.
- Maintain the document at approximately the same length as the input. Incorporate suggestions by REPLACING or IMPROVING existing content, not by appending to it. The document must not grow longer each round.
- Use plain text only. Do not use markdown headings, bullets, bold, italics, or tables. Write section headings as plain text on their own line if the document requires them.
- Do not add meta-commentary or any text inside the document that is not document content.
- Do not introduce new content, claims, or requirements that no reviewer suggested.
- Preserve the existing section order and structure unless a reviewer suggestion specifically requires a change.
- Maintain internal consistency across section titles, numbering, terminology, and defined terms.
- If reviewer suggestions are incomplete or partially invalid, produce the best complete document possible.
- Do not place any content outside the required wrapper blocks. Nothing before %%DOCUMENT_START%%, nothing after %%APPLIED_END%%.

CONFLICTS BLOCK — DECISION TREE:
Follow these steps in order for every disagreement you found between reviewers. Do not skip steps. Do not collapse them. Each disagreement reaches exactly ONE outcome — apply, USER DECISION, or BUILDER DECISION — and that outcome is final for that disagreement.

STEP 1 — COUNT reviewers per proposed alternative for the disagreement.
STEP 2 — IF a strict majority (more than half of reviewers) proposed the SAME alternative → APPLY it to your %%DOCUMENT_START%% block. STOP. Do not emit a USER DECISION for this disagreement. Move to the next disagreement.
STEP 3 — IF the disagreement is between a reviewer suggestion and a project goal / reference material / explicit user constraint → emit a BUILDER DECISION (see format below). STOP. Move to the next disagreement.
STEP 4 — OTHERWISE the disagreement is a stylistic / tonal / wording split → emit a USER DECISION (see format below). CURRENT must be the verbatim text as it sits in your %%DOCUMENT_START%% block — that is, the OLD text you have NOT modified. Do not modify the document for this disagreement; the user resolves it after the round. STOP. Move to the next disagreement.

ABSOLUTE RULE: If you reached Step 2 (apply) for a disagreement, you must NOT also emit a USER DECISION for that same disagreement. If you reached Step 4 (USER DECISION), you must NOT also modify that text in the document. One path per disagreement, exclusive. Violating this rule corrupts the user's resolution flow because CURRENT will no longer exist in the document for the user to replace.

BUILDER DECISION format (single line inside the conflicts block):
[BUILDER DECISION] "quoted text" — explanation naming AIs.

USER DECISION format (multi-line block inside the conflicts block):
[USER DECISION]
QUESTION: A plain-English question describing what the user needs to decide — one sentence.
CURRENT: "the exact current text in the document as it stands"
OPTION_1: "exact proposed text" — AI names who suggested this
OPTION_2: "exact proposed text" — AI names who suggested this
OPTION_3: "exact proposed text" — AI names who suggested this (add more OPTION_N lines as needed — one per genuinely distinct suggestion, no upper limit)
END_DECISION

Rules for USER DECISION format:
- CURRENT must be the verbatim text currently in the document
- Each OPTION must be the complete replacement text, not a description of a change
- List only the AIs who specifically suggested that option by name
- Include one OPTION_N per genuinely distinct suggestion — minimum 2 UNIQUE options, no maximum
- Each OPTION_N text must be UNIQUE within the block — if two or more reviewers proposed the same replacement text (verbatim, or differing only in whitespace, capitalisation, or trailing punctuation), MERGE them into a single OPTION_N and list all their AI names together, comma-separated. Identical options are not a choice.
- Do not include the unchanged original text as an OPTION_N entry. Every OPTION_N must be a genuine reviewer-suggested alternative attributed to one or more reviewers by name. If a strict majority of reviewers proposed the same change, apply it to the document and do not generate a USER DECISION block — that is a strict majority, not a 3v3 split. Manufacturing a fake "original text" or "unchanged" option to surface a unanimous vote as a choice is a violation of the MAJORITY RULES above.
- Do not add commentary outside the structured block
- Do not combine options that are meaningfully different
- CRITICAL: The quoted option text must never contain an em dash (—). The only em dash on an OPTION line is the single separator between the quoted text and the AI names at the end. If you need a pause or range in the option text, use a comma or hyphen instead.

ANTI-HALLUCINATION RULES — every USER DECISION must satisfy ALL of these or it must not be emitted:
- THIS-ROUND ONLY: Only emit a USER DECISION for a phrasing that one or more reviewers in THIS round explicitly proposed an alternative for. Do not carry forward conflicts from prior rounds. Do not re-surface previously-rejected suggestions. If no reviewer in this round suggested a change to the phrasing, there is no decision to make.
- ATTRIBUTION INTEGRITY: Each OPTION_N's named AI must have proposed that option's exact text (or an unambiguous near-paraphrase) in their response in THIS round. Do not attribute options to AIs whose response was "NO CHANGES NEEDED" or who said nothing about that part of the document. Fabricated attributions are a critical failure.
- CURRENT MUST BE LIVE: CURRENT must be verbatim text that exists in the document you are emitting in your %%DOCUMENT_START%% block. Before you finalise the conflicts block, perform a substring check: locate CURRENT in your output document. If you cannot find it there, either (a) you have already applied one of the options to the document — in which case do not emit the USER DECISION, or (b) CURRENT is wrong — in which case fix it to match what is actually in your document.
- DO NOT BOTH APPLY AND FLAG: If you applied a reviewer's suggestion to the document, do not also surface that same change as a USER DECISION. The user resolves USER DECISIONs by replacing CURRENT with their chosen option in the document. If CURRENT is no longer in the document, the resolution mechanism cannot work.

MANDATORY SELF-CHECK before you write %%CONFLICTS_END%%:
For each USER DECISION you have written, perform this check in your head:
1. Take the CURRENT text of that USER DECISION.
2. Search for it as a verbatim substring inside your %%DOCUMENT_START%% block.
3. IF FOUND → the USER DECISION is valid; keep it.
4. IF NOT FOUND → you have violated the apply-and-flag rule. Two ways to fix: (a) delete this USER DECISION entirely (because you already applied one of its options), or (b) revert that line in the document back to the original CURRENT text so the user can resolve the disagreement themselves. Pick ONE and do it before writing %%CONFLICTS_END%%.

If there are no conflicts at all this round, the entire content between %%CONFLICTS_START%% and %%CONFLICTS_END%% must be exactly: NO CONFLICTS

APPLIED CHANGES BLOCK — list every silent change you applied to the document this round (solo reviewer suggestions you accepted, unanimous-majority changes, and any other reviewer-sourced edits that did NOT become a USER DECISION or BUILDER DECISION). This gives the user visibility into what's being applied silently round after round so they can lock down lines that keep getting nitpicked.

APPLIED entry format (one block per silent change, inside the applied block):
[APPLIED]
LINE_REF: A short locator like "Line 7" or "Introduction paragraph 2" — whatever helps the user find it in the doc
ORIGINAL: "exact previous text"
NEW: "exact new text as it appears in your %%DOCUMENT_START%% block"
FROM: AI name(s) whose suggestion you adopted (comma-separated if multiple)
END_APPLIED

Rules for APPLIED CHANGES:
- ONLY list changes where the NEW text differs from ORIGINAL — do not list unchanged lines
- ONLY list changes sourced from a reviewer suggestion this round — do not list edits you made on your own initiative
- FROM names must match reviewers who actually proposed the change in THIS round — same attribution rule as USER DECISION
- NEW must be verbatim text from your %%DOCUMENT_START%% output — same live-text rule as USER DECISION's CURRENT
- Do not list a change here AND surface it as a USER DECISION — pick one
- If you applied zero silent changes this round, the entire content between %%APPLIED_START%% and %%APPLIED_END%% must be exactly: NO APPLIED CHANGES

REQUIRED OUTPUT STRUCTURE — your response must contain ALL THREE blocks in this order, every round, no exceptions. The wrapper markers (%%DOCUMENT_START%%, %%DOCUMENT_END%%, %%CONFLICTS_START%%, %%CONFLICTS_END%%, %%APPLIED_START%%, %%APPLIED_END%%) must appear LITERALLY in your output — they are not template placeholders, they are required delimiters the application parses. Do not omit them even on rounds with no conflicts and no applied changes:

%%DOCUMENT_START%%
...the complete updated document here...
%%DOCUMENT_END%%

%%CONFLICTS_START%%
...USER DECISION blocks, BUILDER DECISION lines, or the literal string "NO CONFLICTS"...
%%CONFLICTS_END%%

%%APPLIED_START%%
...APPLIED blocks, or the literal string "NO APPLIED CHANGES"...
%%APPLIED_END%%`,

  draft: `You are the Builder in this WaxFrame collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

All reviewer drafts are included above. Your task: produce a single consolidated first draft that integrates the strongest elements from each provided draft while preserving overall coherence and completeness.

RULES:
- Return the FULL document — every section, complete. Do not use ellipses or placeholders.
- Use plain text only. Do not use markdown headings, bullets, bold, italics, or tables. Write section headings as plain text on their own line if the document requires them.
- Prioritize accuracy, completeness, clarity, internal consistency, and practical usefulness over stylistic flourish.
- Do not introduce new ideas, content, or requirements not present in any of the provided drafts.
- Do not merge conflicting text mechanically — choose the stronger approach and note the conflict below.
- Normalize terminology across drafts for consistency.
- Ensure the consolidated draft has a single, consistent voice. Eliminate redundant content introduced by merging.
- If a requirement from the project goal is missing from all drafts, flag it in the conflicts section as a MISSING REQUIREMENT.
- Maintain internal consistency across section titles, numbering, terminology, and defined terms.
- Do not place any content outside the required wrapper blocks. Nothing before %%DOCUMENT_START%%, nothing after %%CONFLICTS_END%%.
- Structure your response EXACTLY like this:

%%DOCUMENT_START%%
...the complete first draft here...
%%DOCUMENT_END%%

%%CONFLICTS_START%%
List any conflicting or incompatible approaches between drafts. For each conflict note: what each draft proposed, which you chose, and why in one to two sentences. Flag any MISSING REQUIREMENTS here.
If there are no conflicts write exactly: NO CONFLICTS
%%CONFLICTS_END%%`,

  review: `You are the Builder in this WaxFrame collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

The user has reviewed the document and their edits are incorporated above. Your task: produce the complete updated document.

RULES:
- Return the FULL document — every section, complete. Do not use ellipses or placeholders.
- Use plain text only. Do not use markdown headings, bullets, bold, italics, or tables. Write section headings as plain text on their own line if the document requires them.
- The user's edits and stated intent have absolute priority. User edits override reviewer suggestions wherever they conflict.
- Only apply reviewer suggestions that do not contradict or undo a user edit.
- Do not override the user's wording choices for style preference alone — only adjust if required for grammar, consistency, or logical coherence.
- Do not introduce new content beyond what the user's edits and reviewer suggestions provide.
- Preserve the document structure unless the user's edits changed it.
- Maintain internal consistency across section titles, numbering, terminology, and defined terms.
- Do not place any content outside the required wrapper blocks. Nothing before %%DOCUMENT_START%%, nothing after %%CONFLICTS_END%%.
- Structure your response EXACTLY like this:

%%DOCUMENT_START%%
...the complete updated document here...
%%DOCUMENT_END%%

%%CONFLICTS_START%%
List any cases where reviewer suggestions were discarded due to user edits. For each note: what the reviewer suggested, what the user chose, in one to two sentences.
If there are no conflicts write exactly: NO CONFLICTS
%%CONFLICTS_END%%`,

};


// ── PROMPT LOADER — checks localStorage overrides first ──
const LS_PROMPTS = 'waxframe_v2_prompts';
function getPrompt(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_PROMPTS) || '{}');
    return saved[key] !== undefined ? saved[key] : fallback;
  } catch(e) { return fallback; }
}

function buildPromptForAI(ai, reviewerResponses) {
  const doc      = document.getElementById('workDocument')?.value.trim() || '';
  const goal     = assembleProjectGoal();
  const name     = document.getElementById('projectName')?.value.trim()  || '';
  // v3.36.17 — Notes drawer split: read BOTH the standing buffer
  // (project-wide rules, persists across rounds) and the one-shot
  // buffer (this-round directive, auto-clears after Builder uses it).
  // Both are Builder-only — never sent to reviewers. Either or both
  // may be empty; the prompt envelope omits the corresponding header
  // when empty so we don't pad the prompt with no-op sections.
  const standingNotes = document.getElementById('workStandingNotes')?.value.trim() || '';
  const notes         = document.getElementById('workNotes')?.value.trim()         || '';
  const sep      = '─'.repeat(60);
  const eq       = '═'.repeat(60);
  const isScratch     = !doc;
  const isBuilder     = ai.id === builder;
  const isReview      = phase === 'review';
  const hasResponses  = reviewerResponses && reviewerResponses.length > 0;
  const builderAI     = activeAIs.find(a => a.id === builder);

  // Add line numbers to document so AIs can reference them precisely
  const numberedDoc = doc ? doc.split('\n').map((line, i) => `${String(i + 1).padStart(4, ' ')}  ${line}`).join('\n') : '';

  let prompt = `${eq}\n  WAXFRAME — ${name.toUpperCase()}\n  Round ${round} · Phase: ${PHASES.find(p => p.id === phase)?.label || phase}\n${eq}\n\n`;

  if (goal && phase === 'draft') prompt += `PROJECT GOAL:\n${sep}\n${goal}\n\n`;
  if (goal && phase !== 'draft') prompt += `PROJECT CONTEXT: ${truncateGoalForRefine(goal)}\n\n`;

  // ── REFERENCE MATERIAL injection (v3.21.0) ──
  // Standing source material the hive cites against every round but never edits.
  // Sent to all reviewers and the Builder. Distinct from Notes (round-to-round Builder directives)
  // and from CURRENT DOCUMENT (the artifact under construction).
  const refBlock = buildReferenceMaterialBlock(sep);
  if (refBlock) {
    prompt += refBlock;
  }

  // Inject length constraint if set
  // v3.33.0 — Mode-aware language. Hard cap = ceiling only, Target = exact,
  // Range = bounded. Per-mode strings match the user-facing description so
  // the Builder gets the same instruction the user expects.
  const _lc = getLengthConstraint();
  if (_lc) {
    let unitWord;
    if (_lc.unit === 'pages')        unitWord = `page${_lc.limit !== 1 ? 's' : ''} (approximately ${_lc.wordLimit} words; pages depend on font and layout, so treat this as a word-count target)`;
    else if (_lc.unit === 'paragraphs') unitWord = `paragraph${_lc.limit !== 1 ? 's' : ''}, separated by blank lines`;
    else if (_lc.unit === 'words')   unitWord = 'words';
    else                             unitWord = 'characters, including spaces';

    if (_lc.mode === 'hardcap') {
      prompt += `LENGTH CONSTRAINT (hard cap): The final document must contain no more than ${_lc.limit} ${unitWord}. Stay at or below this limit. Shorter is fine.\n\n`;
    } else if (_lc.mode === 'target') {
      prompt += `LENGTH CONSTRAINT (target): Hit ${_lc.limit} ${unitWord} exactly. Do not deliver less, do not deliver more.\n\n`;
    } else if (_lc.mode === 'range') {
      prompt += `LENGTH CONSTRAINT (range): The final document must contain between ${_lc.min} and ${_lc.limit} ${unitWord}. Aim for the middle of that range.\n\n`;
    }
  }

  if (isBuilder && hasResponses) {
    prompt += doc ? `CURRENT DOCUMENT (line numbers for reference):\n${sep}\n${numberedDoc}\n\n` : '';

    // Inject previously resolved decisions so the Builder doesn't re-raise them
    if (window._resolvedDecisions && window._resolvedDecisions.length > 0) {
      prompt += `${getPrompt('resolved_builder', 'PREVIOUSLY RESOLVED DECISIONS — FINAL AND LOCKED:\nThe user has made final decisions on the following. Do NOT re-raise these as conflicts under any circumstances, even if reviewers suggest changes to them. The chosen text is final.')}\n${sep}\n`;
      window._resolvedDecisions.forEach((rd, i) => {
        prompt += `${i + 1}. Original: "${rd.original}" → User chose: "${rd.chosen}" — THIS IS FINAL. Do not flag or change.\n`;
      });
      prompt += `\n`;
    }

    if (standingNotes) prompt += `STANDING NOTES (apply every round, every Builder):\n${sep}\n${standingNotes}\n\n`;
    if (notes)         prompt += `THIS-ROUND NOTES (apply only this round, then discard):\n${sep}\n${notes}\n\n`;

    reviewerResponses.forEach(r => {
      prompt += `${sep}\nFROM ${r.name.toUpperCase()}:\n${sep}\n${r.response}\n\n`;
    });
    prompt += `${sep}\n⚠️ BUILDER: produce the complete updated document\n${sep}\n\n`;
    const builderKey = phase === 'draft' ? 'builder_draft' : 'builder_refine';
    prompt += getPrompt(builderKey, BUILDER_INSTRUCTIONS[phase] || BUILDER_INSTRUCTIONS.refine);
  } else if (isScratch) {
    prompt += `${sep}\nSEND TO ALL AIs\n${sep}\n\n`;
    prompt += getPrompt('draft_scratch', DEFAULT_PHASE_INSTRUCTIONS.draft_scratch);
  } else {
    prompt += doc ? `CURRENT DOCUMENT (line numbers for reference):\n${sep}\n${numberedDoc}\n\n` : '';

    // Inject previously resolved decisions so reviewers don't re-raise them
    if (window._resolvedDecisions && window._resolvedDecisions.length > 0) {
      prompt += `${getPrompt('resolved_reviewers', 'PREVIOUSLY RESOLVED DECISIONS — FINAL AND LOCKED:\nThe user has made final decisions on the following. Do NOT suggest any changes to the chosen text or to the same concept, even using different wording. These are closed.')}\n${sep}\n`;
      window._resolvedDecisions.forEach((rd, i) => {
        prompt += `${i + 1}. Original: "${rd.original}" → User chose: "${rd.chosen}" — do NOT suggest changing "${rd.chosen}" or any equivalent phrasing.\n`;
      });
      prompt += `\n`;
    }

    // Inject targeted per-AI warnings for repeat offenders
    const aiWarnings = window._aiWarnings?.[ai.id];
    if (aiWarnings && aiWarnings.length > 0) {
      prompt += `${getPrompt('ai_warning', 'SPECIFIC WARNINGS FOR YOU — REPEATED VIOLATIONS:\nYou have repeatedly raised the following after the user already resolved them. This is your final notice — do NOT raise these again under any circumstances:')}\n${sep}\n`;
      aiWarnings.forEach((w, i) => {
        prompt += `${i + 1}. "${w.original}" — the user has chosen "${w.chosen}" and this is final. Stop suggesting alternatives to this.\n`;
      });
      prompt += `\n`;
    }

    prompt += `${sep}\nSEND TO ALL AIs\n${sep}\n\n`;
    prompt += getPrompt('refine', DEFAULT_PHASE_INSTRUCTIONS.refine);
  }

  return prompt;
}

// ── FOOTER BUTTON ROUTING ──
// If notes drawer is open, both buttons send to Builder only and close the drawer
function footerSendToBuilder() {
  closeNotesModal();
  runBuilderOnly();
}

function footerSmokeOrBuilder() {
  const notesOpen = document.getElementById('notesModal')?.classList.contains('active');
  if (notesOpen) {
    const notes = document.getElementById('workNotes')?.value.trim();
    if (notes) {
      closeNotesModal();
      runBuilderOnly();
      return;
    }
  }
  runRound();
}

// ── SEND TO BUILDER ONLY ──
async function runBuilderOnly() {
  const btn = document.getElementById('builderOnlyBtn');
  const smokeBtn = document.getElementById('runRoundBtn');

  if (smokeBtn?.classList.contains('running')) return;
  if (btn?.disabled) return;

  // v3.56.15 — A round is firing; clear any pending churn hold and re-arm the
  // detector (it self-disables while _churnPending is true).
  window._churnPending = false;

  const notes = document.getElementById('workNotes')?.value.trim() || '';
  // P1.3 #9 (v3.56.2) — an at-convergence length reroll drives the Builder via
  // a synthetic directive (window._autoLengthDirective), NOT the Notes field,
  // so an empty Notes box is expected here and must not bail. A manual
  // Builder-Only with no note still requires one.
  // v3.56.9 — also fires for the manual "Trim/Expand with Builder" path
  // (window._manualLengthReroll), which carries the same directive but with
  // Auto OFF. Either active flag + a directive present counts as a length reroll.
  const _lengthReroll = !!(((window._autoMode && window._autoLengthRerollActive) || window._manualLengthReroll) && window._autoLengthDirective);
  if (!notes && !_lengthReroll) {
    toast('⚠️ Add a note first — tell the Builder what to change');
    return;
  }
  // v3.36.17 — Standing notes capture for runBuilderOnly. Same
  // freeze-at-build-fire pattern as runRound (no race here since
  // runBuilderOnly is single-call, but we keep symmetry for the
  // history record + console emission).
  const standingNotes = document.getElementById('workStandingNotes')?.value.trim() || '';

  docText = document.getElementById('workDocument')?.value.trim() || '';
  if (!docText) {
    toast('⚠️ No document to send to Builder');
    return;
  }

  const builderAI = activeAIs.find(ai => ai.id === builder);
  if (!builderAI) { toast('⚠️ No Builder selected'); return; }

  const cfg = API_CONFIGS[builderAI.provider];
  if (!cfg?._key) { toast(`⚠️ No API key for ${builderAI.name}`); return; }

  // ── LICENSE CHECK ──
  if (!isLicensed()) {
    const used = getTrialRoundsUsed();
    if (used >= FREE_TRIAL_ROUNDS) { showLicenseModal('trial_expired'); return; }
  }

  btn.disabled = true;
  smokeBtn?.classList.add('running');
  if (smokeBtn) smokeBtn.querySelector('.shake-wide-label').textContent = 'Building…';
  showBuilderOverlay();
  startRoundTimer(smokeBtn, 'Building…');
  projectClockStart(); // v3.36.32 — parity with runRound() at L12387. Without
                       // this, a Builder-Only round runs while the project
                       // clock is paused (manual pause or post-convergence
                       // auto-pause), dropping its API call time from the
                       // session total. The transcript "Session duration"
                       // and backup projClockSeconds then under-report by
                       // the Builder-Only round's duration. Triggered the
                       // engaged-time discrepancy seen in the Publix recipe
                       // run (T4 2026-05-10). Same call as runRound makes
                       // every round type tick the clock consistently.
  setStatus(`🔨 Sending directly to ${builderAI.name}…`);
  consoleLog(`═══ Round ${round} · Builder Only · Phase: ${PHASES.find(p=>p.id===phase)?.label||phase} ═══`, 'divider');
  if (standingNotes) consoleLog(`📌 Standing notes: ${standingNotes}`, 'info');
  if (notes) consoleLog(`🎯 This-round notes: ${notes}`, 'info');
  if (_lengthReroll) consoleLog(`📏 ${window._manualLengthReroll ? 'Manual' : 'Auto'} length-correction directive active for this build${window._manualLengthReroll ? '' : ` (attempt ${window._autoLengthRerollCount}/${getAutoRerollAttempts()})`}`, 'info');
  setBeeStatus(builderAI.id, 'sending', 'Building…');
  // v3.36.15 — Round-counter state machine entry. Live "Round N" stays
  // up while the round is in flight; the next round-end site flips
  // back to 'idle' with a completion-suffixed label.
  window._roundUiState = 'running';
  updateRoundBadge();

  // v3.32.17 — Capture the project generation token for the abandonment
  // check below. If the user fires clearProject() while this round is
  // mid-await, _projectGen will be incremented and our captured value
  // will fall behind — every write checkpoint compares the two and
  // bails cleanly if they don't match.
  const _runGen = window._projectGen || 0;

  // Build prompt — no reviewer responses, just the doc + notes → Builder instructions
  const builderPrompt = buildPromptForAI(builderAI, []);
  // Swap in builder instructions directly (no reviewer suggestions to compile)
  // We reuse buildPromptForAI with an empty array which gives reviewer prompt —
  // instead build the builder prompt manually with empty reviews so notes drive it
  const sep = '─'.repeat(60);
  const eq  = '═'.repeat(60);
  const goal  = assembleProjectGoal();
  const name  = document.getElementById('projectName')?.value.trim() || '';
  const numberedDoc = docText.split('\n').map((line, i) => `${String(i+1).padStart(4,' ')}  ${line}`).join('\n');
  let prompt = `${eq}\n  WAXFRAME — ${name.toUpperCase()}\n  Round ${round} · Builder Only · Phase: ${PHASES.find(p=>p.id===phase)?.label||phase}\n${eq}\n\n`;
  if (goal) prompt += `PROJECT CONTEXT: ${truncateGoalForRefine(goal)}\n\n`;
  // ── REFERENCE MATERIAL injection (v3.21.0) — Builder Only path ──
  const refBlock = buildReferenceMaterialBlock(sep);
  if (refBlock) {
    prompt += refBlock;
  }
  if (notes) prompt += `USER INSTRUCTIONS FOR THIS BUILD:\n${sep}\n${notes}\n\n`;
  // P1.3 #9 (v3.56.1) — inject the synthetic trim/expand directive for an
  // at-convergence length reroll. Separate from the user's Notes; never
  // written to the workNotes field, cleared once the reroll cycle resolves.
  if (_lengthReroll) {
    prompt += `${window._autoLengthDirective}\n\n`;
  }
  prompt += `CURRENT DOCUMENT (line numbers for reference):\n${sep}\n${numberedDoc}\n\n`;
  prompt += `${sep}\n⚠️ BUILDER: produce the complete updated document\n${sep}\n\n`;
  const builderKey = phase === 'draft' ? 'builder_draft' : 'builder_refine';
  prompt += getPrompt(builderKey, BUILDER_INSTRUCTIONS[phase] || BUILDER_INSTRUCTIONS.refine);

  let builderHadError = false;
  let _failedRoundReason = '';
  let _failedRoundDetails = '';
  try {
    // v3.36.14 — Pass `notes` (already frozen at top of runBuilderOnly
    // at L11769) as 3rd arg so the deep-dive captureRound entry holds
    // the authoritative Builder-call notes record.
    const builderResponse = await callAPI(builderAI, prompt, notes, 'builder');
    const newDoc    = stripBuilderEnvelope(extractDocument(builderResponse));
    const conflicts = extractConflicts(builderResponse);
    window._lastConflicts = conflicts || null;
    // v3.39.0 — Applied-changes parse for Builder-only path too. Apply
    // Decisions → runBuilderOnly may still silently apply user-injected
    // edits or carry-forward changes — those need surfacing.
    window._lastAppliedChanges = extractAppliedChanges(builderResponse);
    const hasConflictBlock = builderResponse.includes('%%CONFLICTS_START%%');

    if (!hasConflictBlock) {
      builderHadError = true;
      _failedRoundReason = 'conflicts';
      _failedRoundDetails = `Builder: ${builderAI.name} · Chars sent: ${prompt.length.toLocaleString()} · Time: ${new Date().toLocaleTimeString()}`;
      setBeeStatus(builderAI.id, 'error', 'Missing conflicts block');
      setStatus(`⚠️ Builder did not return a %%CONFLICTS_START%% block — round rejected`);
      consoleLog(`⚠️ Builder output missing %%CONFLICTS_START%% block — round rejected (hard stop).`, 'error');
    } else if (conflicts) {
      consoleLog(`⚡ Conflicts detected — see Conflicts panel`, 'warn');
    } else {
      consoleLog(`✓ Conflicts block found — Builder reported NO CONFLICTS`, 'info');
    }

    if (!builderHadError && newDoc) {
      const prevWords = docText ? docText.split(/\s+/).filter(Boolean).length : 0;
      const newWords  = newDoc.split(/\s+/).filter(Boolean).length;
      const _lcGate   = getLengthConstraint();
      let bloatFail, undersizedFail = false, actual, prevActual, limitNum, floorNum, unitName, limitName, bloatPct, gateConstrained;
      if (_lcGate) {
        // User specified a length constraint — honor it in its native unit.
        // Pages uses the word estimate (not directly measurable from raw text).
        gateConstrained = true;
        actual     = countInUnit(newDoc,  _lcGate.unit);
        prevActual = countInUnit(docText, _lcGate.unit);
        limitNum   = _lcGate.unit === 'pages' ? _lcGate.wordLimit : _lcGate.limit;
        // v3.33.0 — Floor is mode-driven. Hardcap has no floor (undersized
        // branch never fires). Range floor = min.
        // v3.56.4 — Target floor/ceiling now use the TARGET tolerance band
        // (#9), mirroring getLengthStatus so mid-round and at-convergence agree
        // on "in range." Was floor = limit (exact), which nagged interactive
        // runs on trivial misses (299 / 302 vs 300). ceilNum stays === limitNum
        // for hardcap/range, so their comparisons are byte-for-byte unchanged.
        let ceilNum = limitNum;
        if (_lcGate.mode === 'target') {
          floorNum = Math.round(limitNum * (1 - TARGET_TOLERANCE_UNDER));
          ceilNum  = Math.round(limitNum * (1 + TARGET_TOLERANCE_OVER));
        } else if (_lcGate.mode === 'range' && _lcGate.min) {
          floorNum = _lcGate.unit === 'pages' ? (_lcGate.wordMin || _lcGate.min) : _lcGate.min;
        } else {
          floorNum = 0; // hardcap — no floor
        }
        unitName   = _lcGate.unit === 'pages' ? 'words' : unitLabel(_lcGate.unit, actual);
        limitName  = _lcGate.unit === 'pages'
          ? `${_lcGate.limit} page${_lcGate.limit !== 1 ? 's' : ''} (≈${_lcGate.wordLimit} words)`
          : `${_lcGate.limit} ${unitLabel(_lcGate.unit, _lcGate.limit)}`;
        // v3.32.18 — Trajectory awareness. If the prior document was
        // already over the limit (e.g. user pasted a 2400-word starting
        // doc with limit 800), accept any round that moved it DOWN
        // toward the limit, even if still over. Without this, every
        // round in the convergence-down sequence is rejected because
        // it still exceeds the absolute ceiling — the user gets stuck
        // in a discard loop with no way to make progress.
        if (prevActual > ceilNum) {
          bloatFail = (actual >= prevActual);
        } else {
          // Prior was within target — strict ceiling applies.
          bloatFail = (actual > ceilNum);
        }
        // v3.36.15 — Trajectory-bypass transparency. When the guard is
        // armed (no override) and the trajectory rule accepted a round
        // that would have failed on absolute basis, emit an INFO log
        // so it's not silent. Brightwater BP Round 3 (v3.36.14 May 9
        // test) hit exactly this case — 1497 words against a 1200
        // ceiling, prior 1500 → 1497 = down, accepted with no console
        // breadcrumb. David asked why armed guard didn't trip.
        if (prevActual > ceilNum && !bloatFail && actual > ceilNum) {
          consoleLog(
            `📏 Length guard armed but bypassed — output trending toward target (${prevActual}→${actual} ${unitName}, target ${limitNum})`,
            'info'
          );
        }
        // v3.32.28 / v3.33.0 — Symmetric undersized branch. Only fires when
        // a floor exists (target or range mode). Mirror of the bloat
        // trajectory rule: if prior was already under the floor, accept any
        // growth even if still below; if prior was at-or-above floor but the
        // round dropped below, that's a real undersized regression — fail.
        // Mutually exclusive with bloatFail by construction.
        if (floorNum > 0 && !bloatFail && actual < floorNum) {
          if (prevActual < floorNum) {
            undersizedFail = (actual <= prevActual);
          } else {
            undersizedFail = true;
          }
        }
        bloatPct = Math.round((actual / limitNum) * 100);
      } else {
        // No constraint — fall back to 1.5× prior-word sanity check.
        // Trajectory awareness doesn't apply (no target to move toward),
        // so this branch is unchanged from pre-v3.32.18.
        gateConstrained = false;
        actual    = newWords;
        prevActual = prevWords;
        unitName  = 'words';
        bloatFail = prevWords > 0 && newWords > prevWords * 1.5;
        // v3.32.28 — 0.5× prior-word shrinkage sanity (#6d). Catches
        // a Builder that loses half the document. Mirror of the 1.5×
        // bloat sanity check.
        undersizedFail = !bloatFail && prevWords > 0 && newWords < prevWords * 0.5;
        if (bloatFail) {
          limitName = prevWords > 0 ? `${Math.round(prevWords * 1.5)} words (1.5× prior)` : '';
          limitNum  = prevWords > 0 ? Math.round(prevWords * 1.5) : 0;
        } else if (undersizedFail) {
          limitName = `${Math.round(prevWords * 0.5)} words (0.5× prior)`;
          limitNum  = Math.round(prevWords * 0.5);
        } else {
          limitName = '';
          limitNum  = 0;
        }
        bloatPct  = prevWords > 0 ? Math.round((newWords / prevWords) * 100) : 100;
      }

      // v3.32.18 — Length-guard override: if the user previously chose
      // "Continue anyway" earlier in this project session, the override
      // flag (persisted in IDB session) skips the gate entirely. Cleared
      // by clearProject() so a fresh project starts with the guard armed.
      // v3.32.28 — Same flag governs both directions (over/under).
      if ((bloatFail || undersizedFail) && window._lengthGuardOverride) {
        consoleLog(`📏 Length guard skipped — override active for this project`, 'info');
        bloatFail = false;
        undersizedFail = false;
      }

      // v3.32.18 — Per-round modal interrupt. When trajectory-aware
      // bloat/undersized triggers AND the user has a length constraint
      // set (gateConstrained), prompt with three options instead of
      // silently saving as failed. Unconstrained sanity-check fails
      // take the existing failed-round path — there's no target to
      // "Continue Anyway" against in the unconstrained case.
      let _userKept = false;
      if ((bloatFail || undersizedFail) && gateConstrained) {
        // v3.33.0 / v3.56.4 — Floor label depends on mode. Target surfaces the
        // user's TARGET (not the internal soft-band floor); range surfaces the
        // user-supplied min. Shared helper so this matches the convergence sites.
        const floorLabel = lengthFloorLabel(floorNum, unitName, _lcGate.mode, limitNum);
        // P1.3 #8 (v3.56.0) — mid-round length over/under during an Auto run:
        // auto-keep without the modal so the chain isn't interrupted. The
        // round's output is accepted and the run continues. Interactive mode
        // still shows the prompt. The at-convergence guard (#9) is a separate
        // path (the convergence_over/_under sites); this only covers the
        // per-round bloat/undersized gate.
        let choice;
        if (window._autoMode) {
          choice = 'keep';
          consoleLog(`🤖 Auto kept the round despite ${bloatFail ? 'length overrun' : 'undersized output'} (${actual} ${unitName}) — no modal in Auto Mode`, 'warn');
          toast(`🤖 Auto kept the round (length ${bloatFail ? 'over target' : 'under floor'})`, 3000);
        } else {
          choice = await lengthGuardPrompt({
            kind: bloatFail ? 'over' : 'under',
            actual, prevActual,
            limitNum: bloatFail ? limitNum : (_lcGate.mode === 'target' ? limitNum : floorNum),
            unitName,
            limitName: bloatFail ? limitName : floorLabel,
            builderName: builderAI.name
          });
        }
        if (choice === 'keep') {
          _userKept = true;
          const wasUnder = undersizedFail;
          bloatFail = false;
          undersizedFail = false;
          consoleLog(`📏 User kept the round despite ${wasUnder ? 'undersized output' : 'length overrun'} (${actual} ${unitName} vs ${wasUnder ? floorNum + ' ' + unitName + ' floor' : limitName})`, 'warn');
        } else if (choice === 'continue_anyway') {
          _userKept = true;
          bloatFail = false;
          undersizedFail = false;
          window._lengthGuardOverride = true;
          updateLengthGuardIndicator();
          consoleLog(`📏 Length guard disabled for this project — future rounds will not check length`, 'warn');
          toast('📏 Length guard disabled for this project', 4500);
        }
        // 'discard' falls through with the fail flag still true — existing path
      }

      if (bloatFail || undersizedFail) {
        builderHadError = true;
        _failedRoundReason = bloatFail ? 'bloat' : 'undersized';
        const _failLimit = bloatFail ? limitName : `${floorNum} ${unitName} floor`;
        _failedRoundDetails = `Builder: ${builderAI.name} · Output: ${actual} ${unitName}${_failLimit ? ` · ${bloatFail ? 'limit' : 'floor'}: ${_failLimit}` : ''} (${bloatPct}%) · Chars sent: ${prompt.length.toLocaleString()} · Time: ${new Date().toLocaleTimeString()}`;
        setBeeStatus(builderAI.id, 'error', bloatFail ? `Length limit exceeded (${bloatPct}%)` : `Output below length floor (${bloatPct}%)`);
        setStatus(bloatFail ? `⚠️ Builder output exceeds length limit — round rejected` : `⚠️ Builder output below length floor — round rejected`);
        consoleLog(`⚠️ Length gate triggered — ${actual} ${unitName}${_failLimit ? ` vs ${bloatFail ? 'limit' : 'floor'} ${_failLimit}` : ''} (${bloatPct}%). Round not saved.`, 'warn');
      } else {
        const docTa = document.getElementById('workDocument');
        if (docTa) { docTa.value = newDoc; updateLineNumbers(); }
        docText = newDoc;
        setBeeStatus(builderAI.id, 'done', 'Document updated ✓');
        setStatus(`✅ Round ${round} complete — Builder applied your instructions`);
        const _overrideNote = _userKept ? ' · length-guard override' : '';
        consoleLog(`✅ Round ${round} complete — Builder only (${newWords} words${prevWords > 0 ? `, ${Math.round((newWords / prevWords) * 100)}% of prior` : ''})${_overrideNote}`, 'success');
        playRosieSound();
      }
    } else if (!builderHadError) {
      builderHadError = true;
      _failedRoundReason = 'delimiters';
      _failedRoundDetails = `Builder: ${builderAI.name} · Chars sent: ${prompt.length.toLocaleString()} · Time: ${new Date().toLocaleTimeString()}`;
      setBeeStatus(builderAI.id, 'error', 'Invalid builder output format');
      setStatus(`⚠️ Builder output missing required delimiters — document unchanged`);
      consoleLog(`⚠️ Builder response missing %%DOCUMENT_START%%/%%DOCUMENT_END%% — document unchanged`, 'warn');
    }
  } catch(e) {
    builderHadError = true;
    _failedRoundReason = 'api';
    _failedRoundDetails = `Builder: ${builderAI.name} · Error: ${e.message} · Time: ${new Date().toLocaleTimeString()}`;
    setBeeStatus(builderAI.id, 'error', e.message);
    setStatus(`⚠️ Builder failed: ${e.message}`);
    consoleLog(`❌ Builder (${builderAI.name}) failed: ${e.message}`, 'error');
  }

  if (!builderHadError) {
    // v3.32.17 — Abandonment check: bail BEFORE writing if the user
    // discarded the project mid-await. Without this, history.push +
    // saveSession would write a phantom entry into the new project's
    // session right after clearProject finished wiping IDB.
    if (_runGen !== (window._projectGen || 0)) {
      _abandonInFlightRoundUI();
      return;
    }
    history.push({
      round, phase,
      projectName:    document.getElementById('projectName')?.value.trim()    || '',
      projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
      doc:            docText,
      notes:          notes,
      standingNotes:  standingNotes,
      conflicts:      window._lastConflicts || null,
      appliedChanges: Array.isArray(window._lastAppliedChanges) ? window._lastAppliedChanges : [],
      responses:      {},
      timestamp:      new Date().toLocaleTimeString(),
      timestampISO:   new Date().toISOString(),
      outcome:        'builder_only_complete',
      builderId:      builder,
      resolvedDecisions: JSON.parse(JSON.stringify(window._resolvedDecisions || [])),
      label:          'Builder Only',
      referenceMaterialAtRound: snapshotReferenceDocs()
    });
    window._lastConflicts = null;
    window._lastAppliedChanges = null;
    // v3.36.15 — Round-counter state: stamp the completion label
    // BEFORE round++ so the suffix reflects the round that just
    // finished, not the next-up round.
    _setLastCompletedLabel(round, phase, 'builder_only_complete');
    round++;
    window._roundUiState = 'idle';
    updateRoundBadge();
    renderRoundHistory();
    renderWorkPhaseBar();
    renderConflicts();
    playAlertIfUserDecisions(); // v3.36.33 — audible cue if USER DECISIONs are now pending
    // Clear notes — they've been applied, don't carry into next round
    const notesEl = document.getElementById('workNotes');
    if (notesEl) { notesEl.value = ''; }
    updateNotesBtnPriority();
    saveSession();
    if (!isLicensed()) { incrementTrialRound(); updateLicenseBadge(); }
    toast(`✅ Round ${round - 1} complete — Builder applied your instructions`);
    // P1.3 #9 (v3.56.3) — ARCHITECTURE FIX: one Builder length nudge, then hand
    // the corrected draft back to the HIVE — never grind the Builder solo. The
    // earlier solo re-check loop let one AI rewrite/pad the document with no
    // reviewer ever vetting it (the 47→373→265→344 oscillation). Now the single
    // nudge is applied, the directive is consumed, and a full round runs so the
    // reviewers vet the new content and converge. The convergence length-check
    // re-arms #9 if it's still out of range — bounded by getAutoRerollAttempts()
    // then halt — but each "attempt" is now a nudge-then-hive cycle, not a solo
    // Builder pass. NOTE: the reroll count is NOT reset here; it must persist
    // across the hive round to stay bounded (cleared on in-range convergence).
    if (window._autoMode && window._autoLengthRerollActive) {
      window._autoLengthRerollActive = false;
      window._autoLengthDirective    = '';   // consumed — this build only
      const _szRH = getLengthStatus(docText);
      consoleLog(`📏 Length nudge applied (${_szRH ? `${_szRH.actual} ${_szRH.unitName}` : '?'}) — re-entering the hive to vet the change`, 'info');
      setStatus(`📏 Length nudge applied — running the hive on the new draft…`);
      _autoFireChainedRound('length-rehive', 'round');
    } else if (window._manualLengthReroll) {
      // v3.56.9 — Manual "Trim/Expand with Builder": the corrected document is
      // already committed above. Consume the flag, then re-check length and
      // re-surface the guard if still out of range (trim -> recheck loop).
      window._manualLengthReroll  = false;
      window._autoLengthDirective = '';   // consumed — this build only
      await _manualLengthAfterFix();
    } else {
      // v3.35.0 — Auto Mode: builder-only success. No reviewers ran this
      // round, so satisfied/total are zero and the stall window does not
      // advance for this entry. Pass outcome 'builder-only' so the chain
      // logic skips stall tracking but still ticks ceiling + chains.
      _autoMaybeChainNextRound({ outcome: 'builder-only' });
    }
  } else {
    // v3.32.17 — Abandonment check (failed-round path). Same rationale
    // as the success path above — don't write phantom failed-round
    // history into a freshly-cleared project.
    if (_runGen !== (window._projectGen || 0)) {
      _abandonInFlightRoundUI();
      return;
    }
    // v3.36.4 — Surface the failure in the live console BEFORE the
    // history write and modal. Symmetric with the runRound failure path
    // — Builder Only failures (e.g. rate limit hitting the synthesis
    // step after applyDecisions) need the same diagnostic visibility.
    const _failDetailsPreviewBO = _failedRoundDetails
      ? (_failedRoundDetails.length > 200 ? _failedRoundDetails.slice(0, 200) + '…' : _failedRoundDetails)
      : '';
    consoleLog(`❌ Round ${round} (Builder Only) failed — ${_failedRoundReason || 'unknown'}${_failDetailsPreviewBO ? ': ' + _failDetailsPreviewBO : ''}`, 'error');
    // Save failed round to history for accurate records and export transcript
    history.push({
      round, phase,
      projectName:    document.getElementById('projectName')?.value.trim()    || '',
      projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
      doc:            null,
      notes:          notes,
      standingNotes:  standingNotes,
      conflicts:      null,
      responses:      {},
      timestamp:      new Date().toLocaleTimeString(),
      timestampISO:   new Date().toISOString(),
      outcome:        'builder_only_failed',
      builderId:      builder,
      resolvedDecisions: JSON.parse(JSON.stringify(window._resolvedDecisions || [])),
      label:          'Builder Only',
      failed:         true,
      failReason:     _failedRoundReason || 'unknown',
      failDetails:    _failedRoundDetails || '',
      referenceMaterialAtRound: snapshotReferenceDocs()
    });
    renderRoundHistory();
    saveSession();
    // v3.36.15 — Round-counter state: failed Builder-Only does not
    // bump round; we still flip back to 'idle' and stamp the failed
    // label so the badge reads "Round N — Phase ⚠ Failed" instead of
    // hanging on "Round N — Phase" (live state).
    _setLastCompletedLabel(round, phase, 'builder_only_failed');
    window._roundUiState = 'idle';
    updateRoundBadge();
    showRoundErrorModal(_failedRoundReason || 'api', _failedRoundDetails || '');
    // v3.35.0 — Auto Mode: builder-only failure. Counts toward the
    // failure-streak guardrail like a regular failed round.
    _autoMaybeChainNextRound({ outcome: 'failed', builderError: true, errorReason: _failedRoundReason || 'unknown' });
  }

  btn.disabled = false;
  smokeBtn?.classList.remove('running');
  stopRoundTimer();
  hideBuilderOverlay();
  if (smokeBtn) smokeBtn.querySelector('.shake-wide-label').textContent = 'Smoke the Hive';
}

// ── RUN ROUND ──
async function runRound() {
  const btn = document.getElementById('runRoundBtn');

  if (btn?.classList.contains('running')) return;

  // v3.56.15 — A round is firing; clear any pending churn hold and re-arm the
  // detector (it self-disables while _churnPending is true).
  window._churnPending = false;

  // P1.3 #9 (v3.56.3) — the reroll count is intentionally NOT reset here. A full
  // round is now part of the length-correction cycle (one Builder nudge, then
  // re-enter the hive), so the count must survive across rounds to stay bounded
  // by getAutoRerollAttempts(). It clears on in-range convergence, Auto toggle,
  // clearProject, and Auto-halt Resume instead.

  // v3.49.0 — Defensive builder guard. If `builder` points at an AI
  // that's no longer active (disabled via session toggle, removed from
  // hive, or any other stale-state cause), auto-reassign to the first
  // active AI and warn. Pairs with the toggleSessionBee builder-intercept
  // added in this release: that intercept prevents most paths into this
  // broken state, but session restore, hive editing, and any future
  // regression could still drop us here — this is the safety net.
  // Also recovers users who reach v3.49.0 with the pre-fix bug already
  // persisted in their session (builder='X' while X is not in sessionAIs).
  if (!window.sessionAIs) window.sessionAIs = new Set(activeAIs.map(a => a.id));
  if (builder && !window.sessionAIs.has(builder)) {
    const stale = activeAIs.find(a => a.id === builder)?.name || builder;
    const fallback = activeAIs.find(a => window.sessionAIs.has(a.id));
    if (fallback) {
      setBuilder(fallback.id);
      renderBeeStatusGrid();
      saveSession();
      toast(`⚠ Builder reassigned: ${stale} was disabled — now ${fallback.name}`);
      consoleLog(`Builder auto-reassigned: ${stale} → ${fallback.name} (stale builder reference detected)`, 'warn');
    }
  }

  // v3.40.0 — Deprecation watchdog fires fire-and-forget on round start.
  // No await: the round proceeds in parallel. If a deprecated model is
  // detected after the round has already failed because of it, the toast
  // arrives slightly late but still gives the user the context to fix it.
  // The visibilitychange trigger catches most "returned to tab" cases
  // before this point; round-start exists as a last-mile safety net.
  detectDeprecatedModels('round-start');

  // ── LICENSE CHECK ──
  if (!isLicensed()) {
    const used = getTrialRoundsUsed();
    if (used >= FREE_TRIAL_ROUNDS) {
      showLicenseModal('trial_expired');
      return;
    }
  }

  // Save current doc state
  docText = document.getElementById('workDocument')?.value.trim() || '';

  // v3.36.14 — Builder-call notes capture. Stays '' until/unless the
  // Builder phase fires, at which point we re-assign with the frozen
  // drawer value. Unanimous-convergence and all-reviewers-failed paths
  // leave it as '' which is the truthful record (Builder never read
  // the drawer those rounds). All 4 runRound history.push sites pull
  // from this const instead of the lazy getElementById that races with
  // drawer mutations.
  // v3.36.17 — Parallel capture for standing notes (the persistent
  // project-wide rules, distinct from the one-shot this-round buffer).
  // Same freeze-at-Builder-fire pattern; lands in history records as
  // standingNotes alongside the one-shot notes field.
  let _notesAtBuilderCall = '';
  let _standingAtBuilderCall = '';

  // Check all active AIs have API keys
  const missingKeys = activeAIs.filter(ai => {
    const cfg = API_CONFIGS[ai.provider];
    return !cfg || !cfg._key;
  });
  if (missingKeys.length > 0) {
    toast(`⚠️ Missing API keys: ${missingKeys.map(a => a.name).join(', ')}`);
    return;
  }

  // Set running state
  btn?.classList.add('running');
  if (btn) btn.querySelector('.shake-wide-label').textContent = 'Smoking…';
  showSmokerOverlay("Smokin' the Hive…");
  startRoundTimer(btn, 'Smoking…');
  projectClockStart(); // start/resume project clock on every round
  setStatus(`⚡ Round ${round} in progress — WaxFrame is thinking…`);
  consoleLog(`═══ Round ${round} · Phase: ${PHASES.find(p=>p.id===phase)?.label||phase} ═══`, 'divider');
  // v3.36.15 — Round-counter state machine entry. Same pattern as
  // runBuilderOnly above. Live "Round N — Phase" stays through the
  // run; round-end sites flip back to 'idle' with a labeled suffix.
  window._roundUiState = 'running';
  updateRoundBadge();

  // v3.32.17 — Capture the project generation token for the abandonment
  // checks at every history.push / saveSession write block below. If
  // the user discards the project mid-round (clearProject → bumps
  // _projectGen), each write site sees the mismatch and bails before
  // corrupting the new project's session.
  const _runGen = window._projectGen || 0;

  // ── Round reset ──
  // v3.32.14 — Order matters: clear _cleanThisRound FIRST so the visual
  // wipe below isn't undone by the universal re-derive in setBeeStatus.
  // Without this ordering, every card that was satisfied in the prior
  // round would keep its star through the new round's pre-flight reset.
  if (window._cleanThisRound) window._cleanThisRound.clear();
  // 'idle' is the canonical pre-round state. Was 'waiting' historically;
  // both fell through the same else branch in setBeeStatus and behaved
  // identically. Consolidated to 'idle' alongside the dead-branch trim.
  activeAIs.forEach(ai => setBeeStatus(ai.id, 'idle', ''));

  const builderAI = activeAIs.find(ai => ai.id === builder);
  let builderHadError = false;
  let _failedRoundReason = '';
  let _failedRoundDetails = '';
  // v3.35.0 — Auto Mode capture. The bottom of runRound nulls
  // window._lastConflicts before the post-round chain check runs, so
  // we snapshot conflicts here for the USER DECISION majority resolver.
  // (noChangesCount and successfulReviews are function-scope locals
  // declared further down — readable directly at the chain hook.)
  let _autoCapturedConflicts = null;
  // ALL AIs including Builder review the document simultaneously
  const allReviewers = activeAIs.filter(ai =>
    ai.id === builder || (window.sessionAIs && window.sessionAIs.has(ai.id))
  ); // Builder always runs; others only if toggled on
  const reviewerResponses = [];

  consoleLog(`🐝 ${allReviewers.length} AIs reviewing simultaneously (including Builder)`, 'info');
  setStatus(`⚡ Round ${round} — all ${allReviewers.length} AIs reviewing…`);
  // _cleanThisRound was cleared above in the round-reset block (v3.32.14).
  // Per-AI entries also clear individually on each 'sending' state below
  // as defense-in-depth.
  allReviewers.forEach(ai => setBeeStatus(ai.id, 'sending', 'Reviewing…'));

  // Phase 1: Everyone reviews — Builder gets reviewer prompt too
  const t_reviewStart = Date.now();
  window._roundTimings = {};
  const reviewerPromises = allReviewers.map(async ai => {
    const prompt = buildPromptForAI(ai, []); // everyone gets reviewer prompt
    const cfg = API_CONFIGS[ai.provider];
    const keyHint = cfg?._key?.length > 8 ? cfg._key.slice(0,4) + '••••' + cfg._key.slice(-4) : '••••';
    consoleLog(`📤 ${ai.name} — sending request (${prompt.length.toLocaleString()} chars · key: ${keyHint})`, 'send');
    try {
      // v3.36.14 — Reviewer calls pass '' as 3rd arg. buildPromptForAI
      // gates USER NOTES injection to the Builder branch only (L11706),
      // so reviewers never see notes — the deep-dive entry honestly
      // records that with an empty notesContext.
      const response = await callAPI(ai, prompt, '', 'worker');
      window._roundTimings[ai.id] = (Date.now() - t_reviewStart) / 1000;
      const noChanges = /^no changes needed/i.test(response.trim());
      const summary = noChanges ? 'No changes needed ✓' : extractSummary(response);
      setBeeStatus(ai.id, noChanges ? 'done-clean' : 'done', summary);
      if (noChanges) {
        consoleLog(`✓ ${ai.name} — no changes needed`, 'success');
      } else {
        const preview = response.trim().substring(0, 160).replace(/\n/g, ' ');
        consoleLog(`📋 ${ai.name}: ${preview}…`, 'preview');
      }
      reviewerResponses.push({ id: ai.id, name: ai.name, response, noChanges });
      return { ai, response, success: true, noChanges };
    } catch(e) {
      window._roundTimings[ai.id] = (Date.now() - t_reviewStart) / 1000;
      if (e.message.startsWith('RATE_LIMITED:')) {
        setBeeStatus(ai.id, 'error', `⏳ Rate limited`);
        toast(`⏳ ${ai.name} hit a usage limit — skipped`, 4000);
      } else if (e.message.startsWith('CORS_BLOCKED:')) {
        setBeeStatus(ai.id, 'error', 'CORS blocked');
      } else {
        setBeeStatus(ai.id, 'error', e.message);
      }
      return { ai, response: '', success: false, noChanges: false };
    }
  });

  await Promise.all(reviewerPromises);

  // ── SLOW RESPONDER CHECK ──
  const _timings = window._roundTimings || {};
  const _timingVals = Object.values(_timings).filter(t => t > 0);
  if (_timingVals.length > 1) {
    const _avg = _timingVals.reduce((a, b) => a + b, 0) / _timingVals.length;
    // v3.29.0 — track which slow AIs have already gotten a Card this
    // session, so we only nag once per AI per session. Console line
    // still fires every round (current behavior preserved).
    const _slowSet = window._slowResponderShownFor ||
      (window._slowResponderShownFor = new Set());
    allReviewers.forEach(ai => {
      const _t = _timings[ai.id];
      if (_t !== undefined && _t > _avg * 2 && _t > _avg + 15) {
        // v3.56.14 — The reminder cadence is the user's call, not ours. If the
        // user opted out via the card's "Don't alert me this session" button,
        // suppress BOTH the card and the console line for the rest of the tab
        // session. Otherwise the console logs every slow round (the user can
        // stop it any time from the card).
        if (window._slowAlertsSilenced) return;
        consoleLog(`⚠️ ${ai.name} — responded in ${_t.toFixed(0)}s (round avg: ${_avg.toFixed(0)}s) — consider toggling off`, 'warn');
        // v3.38.0 — Gate card surfacing on the user's Slow-AI alerts
        // preference. Detection + console log run unconditionally above
        // so diagnostic info is always available. Only the user-facing
        // card (which blocks Auto-Mode chaining via the troubleshooting-
        // card gate at ~3612) is suppressed when the toggle is off.
        if (!_slowResponderEnabled) return;
        if (!_slowSet.has(ai.id)) {
          _slowSet.add(ai.id);
          const entry = WF_ERROR_CATALOG.find(e => e.code === 'SLOW_RESPONDER');
          if (entry) {
            WF_DEBUG.showCard(entry, {
              aiName:   ai.name,
              aiId:     ai.id,
              provider: ai.provider,
              elapsed:  _t.toFixed(0),
              avg:      _avg.toFixed(0),
              raw:      JSON.stringify({
                ai: ai.name, elapsed_s: +_t.toFixed(1), round_avg_s: +_avg.toFixed(1),
                threshold: 'elapsed > 2x avg AND elapsed > avg+15s',
                round_responses: _timingVals.length
              }, null, 2)
            });
          }
        }
      }
    });
  }
  window._roundTimings = {};

  const successfulReviews = reviewerResponses.filter(r => r.response);
  const noChangesCount = reviewerResponses.filter(r => r.noChanges).length;
  const majorityThreshold = Math.floor(successfulReviews.length / 2) + 1;
  const hasMajorityConvergence = noChangesCount >= majorityThreshold;
  const holdouts = successfulReviews.filter(r => !r.noChanges);

  // Phase 2: Builder compiles ALL reviews (including its own) into updated document
  const failedCount = allReviewers.length - successfulReviews.length;
  if (failedCount > 0) consoleLog(`⚠️ ${failedCount} AI${failedCount!==1?'s':''} failed — continuing with ${successfulReviews.length} response${successfulReviews.length!==1?'s':''}`, 'warn');
  if (noChangesCount > 0 && noChangesCount === successfulReviews.length) {
    consoleLog(`🏁 All AIs agree — no further changes needed.`, 'success');
    toast(`🏁 All ${noChangesCount} AIs agree the document is done!`, 5000);

    // v3.32.17 — Abandonment check (unanimous-convergence path).
    if (_runGen !== (window._projectGen || 0)) {
      _abandonInFlightRoundUI();
      return;
    }

    // v3.32.28 — #6b convergence-path length check. If the user has a
    // length constraint set and the document is out of range (over
    // ceiling or under floor), surface the length-guard prompt before
    // the celebration. The override flag, when set, skips the check
    // entirely (same semantics as the per-round bloat gate). 'discard'
    // blocks the celebration so the user can edit and re-run; 'keep'
    // proceeds with the guard still armed; 'continue_anyway' proceeds
    // and disables the guard for the rest of the project. No 'discard'
    // path here pushes to history — the round happened (API calls
    // were made and visible in the live console), but project-state
    // round count and phase are not advanced. The user edits the doc
    // and runs again; the new round produces a new convergence event.
    if (!window._lengthGuardOverride) {
      const cstat = getLengthStatus(docText);
      if (cstat && cstat.status !== 'ok') {
        // P1.3 #9 (v3.56.1) — Auto: don't prompt. Send the converged document
        // back to the Builder to trim/expand (builder-only), up to
        // getAutoRerollAttempts() times, then auto-halt. Interactive mode keeps
        // the modal below untouched.
        if (window._autoMode) { _autoConvergenceLengthReroll(cstat); return; }
        const choice = await lengthGuardPrompt({
          kind: cstat.status === 'over' ? 'convergence_over' : 'convergence_under',
          actual: cstat.actual,
          prevActual: cstat.actual,
          limitNum: cstat.status === 'over'
            ? cstat.limitNum
            : (cstat.mode === 'target' ? cstat.limitNum : cstat.floorNum),
          unitName: cstat.unitName,
          limitName: cstat.status === 'over'
            ? cstat.limitName
            : lengthFloorLabel(cstat.floorNum, cstat.unitName, cstat.mode, cstat.limitNum),
          builderName: 'The Hive'
        });
        if (choice === 'builder_fix') {
          // v3.56.9 — Manual "Trim/Expand with Builder": send the converged
          // document back to the Builder to bring it into range. _manualLengthFix
          // fires the builder-only round; its post-build re-check re-surfaces the
          // guard if still out. Skip the celebration — the fix flow takes over.
          await _manualLengthFix(cstat);
          return;
        }
        if (choice === 'discard') {
          consoleLog(`📏 Convergence blocked — document is ${cstat.status} the length ${cstat.status === 'over' ? 'target' : 'floor'} (${cstat.actual} ${cstat.unitName} vs ${cstat.status === 'over' ? cstat.limitName : cstat.floorNum + ' ' + cstat.unitName + ' floor'}). Edit the document and re-run.`, 'warn');
          toast(`📏 Convergence blocked — adjust document length and re-run`, 5000);
          const runBtnB = document.getElementById('runRoundBtn');
          runBtnB?.classList.remove('running');
          if (runBtnB) runBtnB.querySelector('.shake-wide-label').textContent = 'Smoke the Hive';
          stopRoundTimer();
          hideSmokerOverlay();
          setStatus(`📏 Convergence blocked — document is ${cstat.status === 'over' ? 'over' : 'under'} length ${cstat.status === 'over' ? 'target' : 'floor'}`);
          return;
        } else if (choice === 'continue_anyway') {
          window._lengthGuardOverride = true;
          updateLengthGuardIndicator();
          consoleLog(`📏 Length guard disabled for this project — convergence accepted`, 'warn');
          toast('📏 Length guard disabled — convergence accepted', 4500);
        }
        // 'keep' falls through to the celebration with the guard still armed
      }
    }

    // P1.3 #9 (v3.56.3) — reached the celebration = converged in range (or the
    // guard was overridden). Clear length-reroll state so the next out-of-range
    // convergence starts a fresh, fully-budgeted cycle.
    window._autoLengthRerollCount  = 0;
    window._autoLengthRerollActive = false;
    window._autoLengthDirective    = '';

    history.push({
      round, phase,
      projectName:    document.getElementById('projectName')?.value.trim()    || '',
      projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
      doc:            docText,
      notes:          _notesAtBuilderCall,
      standingNotes:  _standingAtBuilderCall,
      conflicts:      { converged: true, holdouts: [] },
      appliedChanges: [],
      responses:      Object.fromEntries(reviewerResponses.map(r => [r.id, r.response])),
      timestamp:      new Date().toLocaleTimeString(),
      timestampISO:   new Date().toISOString(),
      outcome:        'unanimous_convergence',
      builderId:      builder,
      resolvedDecisions: JSON.parse(JSON.stringify(window._resolvedDecisions || [])),
      referenceMaterialAtRound: snapshotReferenceDocs()
    });
    window._lastConflicts = null;
    window._lastAppliedChanges = null;
    // v3.36.15 — Round-counter state: stamp converged label BEFORE
    // round++ so the badge reads "Round N — Phase ✓ Converged".
    _setLastCompletedLabel(round, phase, 'unanimous_convergence');
    round++;
    window._roundUiState = 'idle';
    if (phase === 'draft') { phase = 'refine'; consoleLog(`📍 Phase advanced to Refine Text`, 'info'); }
    updateRoundBadge();
    renderRoundHistory();
    renderWorkPhaseBar();
    renderConflicts();
    saveSession();
    if (!isLicensed()) { incrementTrialRound(); updateLicenseBadge(); }
    // v3.32.14 — Removed: activeAIs.forEach(a => setBeeStatus(a.id, 'idle', ''))
    // The unanimous wipe stripped is-clean from every card right before the
    // scene played, so when the user closed the scene every reviewer card
    // showed "Idle" instead of "No changes needed ✓ ★". Convergence is the
    // exact moment the satisfaction visual matters most — leave the per-AI
    // state intact. _cleanThisRound is the source of truth and stays
    // populated until the next round's 'sending' wave clears it.
    setStatus(`🏁 Unanimous — all AIs agree the document is ready`);
    const runBtnU = document.getElementById('runRoundBtn');
    runBtnU?.classList.remove('running');
    if (runBtnU) runBtnU.querySelector('.shake-wide-label').textContent = 'Smoke the Hive';
    stopRoundTimer();
    projectClockPause(); // pause project clock at convergence — user can resume manually if they keep iterating
    hideSmokerOverlay();
    // 🎉 Unanimous — full scene: black → fog + whirr → image + fanfare + fireworks.
    // Escape or click skips. User decides when to finish via the Finish button.
    playUnanimousScene();
    // v3.35.0 — Auto Mode halt: project complete, Resume disabled.
    // v3.35.1 — Defer halt modal until after the unanimous scene plays
    // out (~3.5s). Without the delay, the halt modal popped on top of
    // the still-active scene; click events landed on the scene's
    // overlay element instead of the work-screen buttons underneath,
    // making the Finish modal export buttons appear unclickable until
    // a full reload. Reproduced by David in the v3.35.0 test session.
    setTimeout(() => {
      _autoMaybeChainNextRound({ outcome: 'unanimous', satisfied: noChangesCount, total: successfulReviews.length });
    }, 3500);
    // v3.38.9 — Auto-open Finish modal after the unanimous scene fully plays
    // out (~12.9s timeline; user can skip via Esc or click, in which case
    // they'll wait briefly for this timer to fire). Same rationale as the
    // majority path — Candy's coleslaw walkthrough showed users get stranded
    // on the work screen after convergence dismisses. The Finish modal's
    // ← Back to Hive button is the path for advanced users who want to
    // review holdouts or run more rounds.
    setTimeout(() => {
      showFinishModal();
    }, 13500);
    return;
  } else if (noChangesCount > 0) {
    consoleLog(`✓ ${noChangesCount} of ${successfulReviews.length} AIs had no further changes`, 'info');
  }

  // ── MAJORITY CONVERGENCE: skip Builder, show holdouts for user review ──
  if (hasMajorityConvergence && holdouts.length > 0) {
    consoleLog(`🏁 Majority convergence — ${noChangesCount} of ${successfulReviews.length} AIs satisfied. Skipping Builder.`, 'success');
    toast(`🏁 ${noChangesCount} of ${successfulReviews.length} AIs are done — review the holdout suggestions below`, 5000);

    // v3.32.17 — Abandonment check (majority-convergence path).
    if (_runGen !== (window._projectGen || 0)) {
      _abandonInFlightRoundUI();
      return;
    }

    // v3.32.28 — #6b convergence-path length check (majority path).
    // Same semantics as the unanimous path above. See that block for
    // the full rationale.
    if (!window._lengthGuardOverride) {
      const cstat = getLengthStatus(docText);
      if (cstat && cstat.status !== 'ok') {
        // P1.3 #9 (v3.56.1) — Auto: send back to the Builder to trim/expand
        // (builder-only) instead of prompting. See unanimous path above.
        if (window._autoMode) { _autoConvergenceLengthReroll(cstat); return; }
        const choice = await lengthGuardPrompt({
          kind: cstat.status === 'over' ? 'convergence_over' : 'convergence_under',
          actual: cstat.actual,
          prevActual: cstat.actual,
          limitNum: cstat.status === 'over'
            ? cstat.limitNum
            : (cstat.mode === 'target' ? cstat.limitNum : cstat.floorNum),
          unitName: cstat.unitName,
          limitName: cstat.status === 'over'
            ? cstat.limitName
            : lengthFloorLabel(cstat.floorNum, cstat.unitName, cstat.mode, cstat.limitNum),
          builderName: 'The Hive'
        });
        if (choice === 'builder_fix') {
          // v3.56.9 — Manual "Trim/Expand with Builder": send the converged
          // document back to the Builder to bring it into range. _manualLengthFix
          // fires the builder-only round; its post-build re-check re-surfaces the
          // guard if still out. Skip the celebration — the fix flow takes over.
          await _manualLengthFix(cstat);
          return;
        }
        if (choice === 'discard') {
          consoleLog(`📏 Convergence blocked — document is ${cstat.status} the length ${cstat.status === 'over' ? 'target' : 'floor'} (${cstat.actual} ${cstat.unitName} vs ${cstat.status === 'over' ? cstat.limitName : cstat.floorNum + ' ' + cstat.unitName + ' floor'}). Edit the document and re-run.`, 'warn');
          toast(`📏 Convergence blocked — adjust document length and re-run`, 5000);
          const runBtnBM = document.getElementById('runRoundBtn');
          runBtnBM?.classList.remove('running');
          if (runBtnBM) runBtnBM.querySelector('.shake-wide-label').textContent = 'Smoke the Hive';
          stopRoundTimer();
          hideSmokerOverlay();
          setStatus(`📏 Convergence blocked — document is ${cstat.status === 'over' ? 'over' : 'under'} length ${cstat.status === 'over' ? 'target' : 'floor'}`);
          return;
        } else if (choice === 'continue_anyway') {
          window._lengthGuardOverride = true;
          updateLengthGuardIndicator();
          consoleLog(`📏 Length guard disabled for this project — convergence accepted`, 'warn');
          toast('📏 Length guard disabled — convergence accepted', 4500);
        }
      }
    }

    // P1.3 #9 (v3.56.3) — reached the celebration = converged in range (or the
    // guard was overridden). Clear length-reroll state so the next out-of-range
    // convergence starts a fresh, fully-budgeted cycle.
    window._autoLengthRerollCount  = 0;
    window._autoLengthRerollActive = false;
    window._autoLengthDirective    = '';

    history.push({
      round, phase,
      projectName:    document.getElementById('projectName')?.value.trim()    || '',
      projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
      doc:            docText,
      notes:          _notesAtBuilderCall,
      standingNotes:  _standingAtBuilderCall,
      conflicts:      { converged: true, holdouts: holdouts.map(r => ({ name: r.name, response: r.response })), satisfied: noChangesCount, totalAIs: successfulReviews.length },
      appliedChanges: [],
      responses:      Object.fromEntries(reviewerResponses.map(r => [r.id, r.response])),
      timestamp:      new Date().toLocaleTimeString(),
      timestampISO:   new Date().toISOString(),
      outcome:        'majority_convergence',
      builderId:      builder,
      resolvedDecisions: JSON.parse(JSON.stringify(window._resolvedDecisions || [])),
      referenceMaterialAtRound: snapshotReferenceDocs()
    });
    window._lastConflicts = null;
    window._lastAppliedChanges = null;
    // v3.36.15 — Round-counter state: stamp majority label BEFORE
    // round++ so the badge reads "Round N — Phase ✓ Majority".
    _setLastCompletedLabel(round, phase, 'majority_convergence');
    round++;
    window._roundUiState = 'idle';
    if (phase === 'draft') { phase = 'refine'; consoleLog(`📍 Phase advanced to Refine Text`, 'info'); }
    updateRoundBadge();
    renderRoundHistory();
    renderWorkPhaseBar();
    renderConflicts();
    saveSession();
    if (!isLicensed()) { incrementTrialRound(); updateLicenseBadge(); }
    // v3.32.14 — Removed: activeAIs.forEach(a => setBeeStatus(a.id, 'idle', ''))
    // Same fix as the unanimous path — preserve each AI's done-clean / done
    // / error state through the convergence scene so the user can see who
    // was satisfied vs. holdout when the scene closes. Holdouts are also
    // the most useful signal at this moment for deciding whether to apply
    // their suggestions or finish.
    setStatus(`🏁 Hive converged — review holdout suggestions or finish the project`);
    const runBtn = document.getElementById('runRoundBtn');
    runBtn?.classList.remove('running');
    if (runBtn) runBtn.querySelector('.shake-wide-label').textContent = 'Smoke the Hive';
    stopRoundTimer();
    projectClockPause(); // pause project clock at convergence — user can resume manually if they keep iterating
    hideSmokerOverlay();
    // 🎉 Hive Approved — majority convergence earns the fanfare
    playFlyingCarSound();
    // v3.38.9 — Bumped celebration duration from 3000→6000ms and chained the
    // Finish modal open after it. Candy's coleslaw walkthrough (2026-05-11):
    // the 3-second auto-dismiss wasn't long enough for her to read "X of Y
    // agree", and after the celebration dismissed she was stranded on the
    // work screen unsure whether to click Send to Builder or Smoke the Hive.
    // The Finish modal gives clear next-step options (Export, Start New,
    // Back to Hive). Back to Hive is the path for users who want to review
    // holdouts or run another round — keeps the advanced workflow available
    // without stranding the typical user.
    showHiveFinish({ duration: 6000, smokeBursts: 10, satisfied: noChangesCount, total: successfulReviews.length });
    // v3.35.1 / v3.38.9 — Defer Auto-Mode chain + Finish modal until after
    // showHiveFinish's scene completes cleanly. Without the delay, popping a
    // modal on top of the active scene caused click events to land on the
    // scene's overlay element instead of the work-screen buttons underneath,
    // making the Finish modal export buttons appear unclickable until a full
    // reload (reproduced by David in the v3.35.0 test session).
    setTimeout(() => {
      _autoMaybeChainNextRound({ outcome: 'majority', satisfied: noChangesCount, total: successfulReviews.length });
      showFinishModal();
    }, 6500);
    return;
  }

  if (builderAI && successfulReviews.length > 0) {
    consoleLog(`🔨 ${builderAI.name} (Builder) — compiling document from ${successfulReviews.length} review${successfulReviews.length!==1?'s':''} (including its own)…`, 'info');
    setBeeStatus(builderAI.id, 'sending', 'Building…');
    setStatus(`🔨 ${builderAI.name} is building the updated document…`);
    // Update label to BUILDING… without resetting the clock
    const _rtLabel = document.getElementById('roundTimerLabel');
    if (_rtLabel) _rtLabel.textContent = 'BUILDING…';
    hideSmokerOverlay();
    showBuilderOverlay();

    // v3.36.14 — Freeze the drawer's notes at the moment the Builder
    // phase fires (NOT at history.push time). This catches mid-review
    // typing — the Brightwater Round 10 case where the user typed
    // "trim to 2 pages" while reviewers were running and the Builder
    // pulled the drawer fresh. The frozen value flows into:
    //   • the Builder's callAPI deep-dive entry (3rd arg below)
    //   • all 4 history.push records below (replaces the previous lazy
    //     getElementById pulls that could race with drawer mutations)
    //   • a LIVE CONSOLE log when non-empty so the audit trail shows
    //     the Builder ingested user-injected text.
    _notesAtBuilderCall    = document.getElementById('workNotes')?.value.trim()         || '';
    _standingAtBuilderCall = document.getElementById('workStandingNotes')?.value.trim() || '';
    if (_standingAtBuilderCall) {
      const _sp = _standingAtBuilderCall.length > 200
        ? _standingAtBuilderCall.slice(0, 200) + '…'
        : _standingAtBuilderCall;
      consoleLog(`📌 Standing notes (used by Builder this round): ${_sp}`, 'info');
    }
    if (_notesAtBuilderCall) {
      const _np = _notesAtBuilderCall.length > 200
        ? _notesAtBuilderCall.slice(0, 200) + '…'
        : _notesAtBuilderCall;
      consoleLog(`🎯 This-round notes (used by Builder this round): ${_np}`, 'info');
    }
    const builderPrompt = buildPromptForAI(builderAI, successfulReviews);
    const bCfg = API_CONFIGS[builderAI.provider];
    const bKeyHint = bCfg?._key?.length > 8 ? bCfg._key.slice(0,4) + '••••' + bCfg._key.slice(-4) : '••••';
    consoleLog(`📤 ${builderAI.name} (Builder) — sending request (${builderPrompt.length.toLocaleString()} chars · key: ${bKeyHint})`, 'send');
    try {
      const builderResponse = await callAPI(builderAI, builderPrompt, _notesAtBuilderCall, 'builder');
      const newDoc    = stripBuilderEnvelope(extractDocument(builderResponse));
      const conflicts = extractConflicts(builderResponse);
      // Defensive pass: validate USER DECISIONs against returned doc + this
      // round's reviewer responses. Drops hallucinated decisions, strips
      // fabricated AI attributions. See validateUserDecisions header for the
      // session that motivated this.
      if (conflicts && Array.isArray(conflicts.userDecisions) && conflicts.userDecisions.length > 0) {
        conflicts.userDecisions = validateUserDecisions(conflicts.userDecisions, newDoc || '', successfulReviews);
        // v3.39.4 — Carry validator failure reasons into the conflicts object
        // so the conflicts panel can render a diagnostic banner ("Builder
        // broke the apply-and-flag rule → swap to Opus") instead of the
        // generic "could not be parsed, try again" copy.
        conflicts.validationFailures = Array.isArray(window._lastValidationFailures)
          ? window._lastValidationFailures.slice()
          : [];
      }
      // v3.39.0 — Parse APPLIED CHANGES envelope. Builder lists every silent
      // change it made this round; user gets visibility plus per-line lock
      // affordance via renderConflicts UI.
      const appliedChanges = extractAppliedChanges(builderResponse);
      window._lastAppliedChanges = appliedChanges;
      window._lastConflicts = conflicts || null;
      // v3.35.0 — Auto Mode capture. Conflicts get nulled later in this
      // function before the chain-check fires; snapshot now so the
      // USER DECISION majority resolver has something to work with.
      _autoCapturedConflicts = conflicts || null;
      const cleanResponse = builderResponse.replace(/`\[/g, '[').replace(/\]`/g, ']');
      const hasConflictBlock = cleanResponse.includes('%%CONFLICTS_START%%');

      // ── GATE 1: Missing conflicts block = hard failure ──
      if (!hasConflictBlock) {
        builderHadError = true;
        _failedRoundReason = 'conflicts';
        _failedRoundDetails = `Builder: ${builderAI.name} · Chars sent: ${builderPrompt.length.toLocaleString()} · Time: ${new Date().toLocaleTimeString()}`;
        setBeeStatus(builderAI.id, 'error', 'Missing conflicts block');
        setStatus(`⚠️ Builder did not return a %%CONFLICTS_START%% block — round rejected`);
        consoleLog(`⚠️ Builder output missing %%CONFLICTS_START%% block — round rejected (hard stop).`, 'error');
      } else if (conflicts) {
        consoleLog(`⚡ Conflicts detected — see Conflicts panel`, 'warn');
      } else {
        consoleLog(`✓ Conflicts block found — Builder reported NO CONFLICTS`, 'info');
      }

      if (!builderHadError && newDoc) {
        // ── GATE 2: Length gate — measure in user's chosen unit, fall back to 1.5× prior words ──
        const prevWords = docText ? docText.split(/\s+/).filter(Boolean).length : 0;
        const newWords  = newDoc.split(/\s+/).filter(Boolean).length;
        const _lcGate   = getLengthConstraint();
        let bloatFail, undersizedFail = false, actual, prevActual, limitNum, floorNum, unitName, limitName, bloatPct, gateConstrained;
        if (_lcGate) {
          gateConstrained = true;
          actual     = countInUnit(newDoc,  _lcGate.unit);
          prevActual = countInUnit(docText, _lcGate.unit);
          limitNum   = _lcGate.unit === 'pages' ? _lcGate.wordLimit : _lcGate.limit;
          // v3.33.0 — Mode-driven floor (matches the runRound site above).
          // v3.56.4 — Target band (#9), mirror of the runRound site.
          let ceilNum = limitNum;
          if (_lcGate.mode === 'target') {
            floorNum = Math.round(limitNum * (1 - TARGET_TOLERANCE_UNDER));
            ceilNum  = Math.round(limitNum * (1 + TARGET_TOLERANCE_OVER));
          } else if (_lcGate.mode === 'range' && _lcGate.min) {
            floorNum = _lcGate.unit === 'pages' ? (_lcGate.wordMin || _lcGate.min) : _lcGate.min;
          } else {
            floorNum = 0; // hardcap — no floor
          }
          unitName   = _lcGate.unit === 'pages' ? 'words' : unitLabel(_lcGate.unit, actual);
          limitName  = _lcGate.unit === 'pages'
            ? `${_lcGate.limit} page${_lcGate.limit !== 1 ? 's' : ''} (≈${_lcGate.wordLimit} words)`
            : `${_lcGate.limit} ${unitLabel(_lcGate.unit, _lcGate.limit)}`;
          // v3.32.18 — Trajectory awareness. If the prior document was
          // already over the limit, accept any round that moved size
          // DOWN toward the target. Without this, every round in the
          // convergence-down sequence gets rejected because each is
          // still over the absolute ceiling — user gets stuck. See the
          // mirrored block in runBuilderOnly for the same comment.
          if (prevActual > ceilNum) {
            bloatFail = (actual >= prevActual);
          } else {
            bloatFail = (actual > ceilNum);
          }
          // v3.36.15 — Trajectory-bypass transparency (mirror of the
          // runBuilderOnly branch above). Emits an INFO line whenever
          // the armed guard let a round pass on trajectory grounds
          // even though it was still over the absolute ceiling.
          if (prevActual > ceilNum && !bloatFail && actual > ceilNum) {
            consoleLog(
              `📏 Length guard armed but bypassed — output trending toward target (${prevActual}→${actual} ${unitName}, target ${limitNum})`,
              'info'
            );
          }
          // v3.32.28 / v3.33.0 — Symmetric undersized branch. Only fires when
          // a floor exists (target or range mode). See runRound for full comment.
          if (floorNum > 0 && !bloatFail && actual < floorNum) {
            if (prevActual < floorNum) {
              undersizedFail = (actual <= prevActual);
            } else {
              undersizedFail = true;
            }
          }
          bloatPct = Math.round((actual / limitNum) * 100);
        } else {
          // No constraint — fall back to 1.5× prior-word sanity check.
          // Trajectory awareness doesn't apply (no target to move toward).
          gateConstrained = false;
          actual     = newWords;
          prevActual = prevWords;
          unitName   = 'words';
          bloatFail  = prevWords > 0 && newWords > prevWords * 1.5;
          // v3.32.28 — 0.5× shrinkage sanity (#6d). Mirror of 1.5× bloat.
          undersizedFail = !bloatFail && prevWords > 0 && newWords < prevWords * 0.5;
          if (bloatFail) {
            limitName = prevWords > 0 ? `${Math.round(prevWords * 1.5)} words (1.5× prior)` : '';
            limitNum  = prevWords > 0 ? Math.round(prevWords * 1.5) : 0;
          } else if (undersizedFail) {
            limitName = `${Math.round(prevWords * 0.5)} words (0.5× prior)`;
            limitNum  = Math.round(prevWords * 0.5);
          } else {
            limitName = '';
            limitNum  = 0;
          }
          bloatPct   = prevWords > 0 ? Math.round((newWords / prevWords) * 100) : 100;
        }

        // v3.32.18 — Length-guard override: if the user previously chose
        // "Continue anyway" earlier in this project session, skip the
        // gate entirely. Cleared by clearProject().
        // v3.32.28 — Same flag governs both directions (over/under).
        if ((bloatFail || undersizedFail) && window._lengthGuardOverride) {
          consoleLog(`📏 Length guard skipped — override active for this project`, 'info');
          bloatFail = false;
          undersizedFail = false;
        }

        // v3.32.18 — Per-round modal. Only fires for constrained-bloat /
        // constrained-undersized cases (user set a length target).
        // Unconstrained sanity-check fails take the existing failed-
        // round path.
        let _userKept = false;
        if ((bloatFail || undersizedFail) && gateConstrained) {
          // P1.3 #8 (v3.56.0) — mid-round length over/under during an Auto
          // run: auto-keep without the modal (see site A for full rationale).
          let choice;
          if (window._autoMode) {
            choice = 'keep';
            consoleLog(`🤖 Auto kept the round despite ${bloatFail ? 'length overrun' : 'undersized output'} (${actual} ${unitName}) — no modal in Auto Mode`, 'warn');
            toast(`🤖 Auto kept the round (length ${bloatFail ? 'over target' : 'under floor'})`, 3000);
          } else {
            choice = await lengthGuardPrompt({
              kind: bloatFail ? 'over' : 'under',
              actual, prevActual,
              limitNum: bloatFail ? limitNum : (_lcGate.mode === 'target' ? limitNum : floorNum),
              unitName,
              limitName: bloatFail ? limitName : lengthFloorLabel(floorNum, unitName, _lcGate.mode, limitNum),
              builderName: builderAI.name
            });
          }
          if (choice === 'keep') {
            _userKept = true;
            const wasUnder = undersizedFail;
            bloatFail = false;
            undersizedFail = false;
            consoleLog(`📏 User kept the round despite ${wasUnder ? 'undersized output' : 'length overrun'} (${actual} ${unitName} vs ${wasUnder ? floorNum + ' ' + unitName + ' floor' : limitName})`, 'warn');
          } else if (choice === 'continue_anyway') {
            _userKept = true;
            bloatFail = false;
            undersizedFail = false;
            window._lengthGuardOverride = true;
            updateLengthGuardIndicator();
            consoleLog(`📏 Length guard disabled for this project — future rounds will not check length`, 'warn');
            toast('📏 Length guard disabled for this project', 4500);
          }
        }

        if (bloatFail || undersizedFail) {
          builderHadError = true;
          _failedRoundReason = bloatFail ? 'bloat' : 'undersized';
          const _failLimit = bloatFail ? limitName : `${floorNum} ${unitName} floor`;
          _failedRoundDetails = `Builder: ${builderAI.name} · Output: ${actual} ${unitName}${_failLimit ? ` · ${bloatFail ? 'limit' : 'floor'}: ${_failLimit}` : ''} (${bloatPct}%) · Chars sent: ${builderPrompt.length.toLocaleString()} · Time: ${new Date().toLocaleTimeString()}`;
          setBeeStatus(builderAI.id, 'error', bloatFail ? `Length limit exceeded (${bloatPct}%)` : `Output below length floor (${bloatPct}%)`);
          setStatus(bloatFail ? `⚠️ Builder output exceeds length limit — round rejected` : `⚠️ Builder output below length floor — round rejected`);
          consoleLog(`⚠️ Length gate triggered — ${actual} ${unitName}${_failLimit ? ` vs ${bloatFail ? 'limit' : 'floor'} ${_failLimit}` : ''} (${bloatPct}%). Round not saved.`, 'warn');
        } else {
          const docTa = document.getElementById('workDocument');
          if (docTa) { docTa.value = newDoc; updateLineNumbers(); }
          docText = newDoc;
          // v3.29.3 — if the Builder was also a no-changes reviewer this
          // round, restore the gold-star (is-clean) state on its bee card.
          // Without this, the Builder pass overwrites the reviewer's
          // done-clean status with regular 'done' and the star vanishes.
          const builderWasClean = reviewerResponses.some(r => r.id === builderAI.id && r.noChanges);
          setBeeStatus(
            builderAI.id,
            builderWasClean ? 'done-clean' : 'done',
            builderWasClean ? 'No changes proposed · Built doc ✓' : 'Document updated ✓'
          );
          setStatus(`✅ Round ${round} complete — document updated`);
          const _overrideNote = _userKept ? ' · length-guard override' : '';
          consoleLog(`✅ Round ${round} complete — document updated (${newWords} words${prevWords > 0 ? `, ${Math.round((newWords / prevWords) * 100)}% of prior` : ''})${_overrideNote}`, 'success');
          const hasUserConflicts = window._lastConflicts?.userDecisions?.length > 0;
          if (hasUserConflicts) { playRoundCompleteSound(); } else { playRosieSound(); }
        }
      } else if (!builderHadError) {
        // Extraction failed — keep existing working document unchanged
        builderHadError = true;
        _failedRoundReason = 'delimiters';
        _failedRoundDetails = `Builder: ${builderAI.name} · Chars sent: ${builderPrompt.length.toLocaleString()} · Time: ${new Date().toLocaleTimeString()}`;
        setBeeStatus(builderAI.id, 'error', 'Invalid builder output format');
        setStatus(`⚠️ Builder output missing required document delimiters — document unchanged`);
        consoleLog(`⚠️ Builder response missing valid %%DOCUMENT_START%%/%%DOCUMENT_END%% block — document unchanged`, 'warn');
      }
    } catch(e) {
      builderHadError = true;
      _failedRoundReason = 'api';
      _failedRoundDetails = `Builder: ${builderAI.name} · Error: ${e.message} · Time: ${new Date().toLocaleTimeString()}`;
      window._lastConflicts = null;
      setBeeStatus(builderAI.id, 'error', e.message);
      setStatus(`⚠️ Builder failed: ${e.message}`);
      consoleLog(`❌ Builder (${builderAI.name}) failed: ${e.message}`, 'error');
    }
  }

  if (!builderHadError) {
  // v3.32.17 — Abandonment check (normal continue path).
  if (_runGen !== (window._projectGen || 0)) {
    _abandonInFlightRoundUI();
    return;
  }
  // Save to history — full document + all responses + conflicts + notes
  history.push({
    round, phase,
    projectName:    document.getElementById('projectName')?.value.trim()    || '',
    projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
    doc:            docText,
    notes:          _notesAtBuilderCall,
    standingNotes:  _standingAtBuilderCall,
    conflicts:      window._lastConflicts || null,
    appliedChanges: Array.isArray(window._lastAppliedChanges) ? window._lastAppliedChanges : [],
    responses:      Object.fromEntries(reviewerResponses.map(r => [r.id, r.response])),
    timestamp:      new Date().toLocaleTimeString(),
    timestampISO:   new Date().toISOString(),
    outcome:        'continuing',
    builderId:      builder,
      resolvedDecisions: JSON.parse(JSON.stringify(window._resolvedDecisions || [])),
      referenceMaterialAtRound: snapshotReferenceDocs()
  });
  window._lastConflicts = null;
  window._lastAppliedChanges = null;

  // Clear notes after every successful Builder run. Notes are documented as
  // round-specific directives — once the Builder has applied them, they should
  // not carry forward to the next round. This matches the wipe in runBuilderOnly
  // at line 6056, so notes behavior is identical regardless of which footer
  // button (Smoke the Hive vs Send to Builder) the user clicked. The previous
  // `if (round === 1)` guard was a fossil from the v3.18.1 → v3.21.21 era when
  // workNotes was auto-prefilled on round 1 with the project goal — the guard
  // existed only to clean up that auto-prefill. With the prefill removed in
  // v3.21.22, the guard becomes asymmetric: it only wipes after Round 1 in
  // runRound but wipes after every round in runBuilderOnly. Removed the guard
  // so both paths behave the same.
  const notesTa = document.getElementById('workNotes');
  if (notesTa) notesTa.value = '';
  updateNotesBtnPriority();

  // v3.36.15 — Round-counter state: stamp continuing label BEFORE
  // round++ so the badge reads "Round N — Phase ✓ Complete".
  _setLastCompletedLabel(round, phase, 'continuing');
  round++;
  window._roundUiState = 'idle';

  // Auto-advance from Draft to Refine after first round completes
  if (phase === 'draft') {
    phase = 'refine';
    consoleLog(`📍 Phase advanced to Refine Text`, 'info');
  }

  updateRoundBadge();
  renderRoundHistory();
  renderWorkPhaseBar();
  renderConflicts();
  playAlertIfUserDecisions(); // v3.36.33 — audible cue if USER DECISIONs are now pending
  saveSession();

  // ── TRIAL COUNTER ──
  if (!isLicensed()) {
    const used = incrementTrialRound();
    updateLicenseBadge();
    if (used >= FREE_TRIAL_ROUNDS) {
      toast(`⏳ That was your last free round — enter a license key to continue`, 5000);
    }
  }

  } // end if (!builderHadError)

  // Reset button
  if (btn) {
    btn.classList.remove('running');
    stopRoundTimer();
    hideSmokerOverlay();
    hideBuilderOverlay();
    btn.querySelector('.shake-wide-label').textContent = 'Smoke the Hive';
  }
  if (builderHadError) {
    // v3.32.17 — Abandonment check (failed-round path in runRound).
    if (_runGen !== (window._projectGen || 0)) {
      _abandonInFlightRoundUI();
      return;
    }
    // v3.36.4 — Surface the failure in the live console BEFORE the
    // history write and modal. Prior code went straight from internal
    // state mutations to showRoundErrorModal with no console line, so a
    // round that failed silently (Builder API error, bloat-rejected,
    // delimiters missing, etc.) showed the round counter advancing in
    // the UI but no diagnostic event in the live console — making
    // post-hoc forensics from console transcripts impossible.
    const _failDetailsPreview = _failedRoundDetails
      ? (_failedRoundDetails.length > 200 ? _failedRoundDetails.slice(0, 200) + '…' : _failedRoundDetails)
      : '';
    consoleLog(`❌ Round ${round} failed — ${_failedRoundReason || 'unknown'}${_failDetailsPreview ? ': ' + _failDetailsPreview : ''}`, 'error');
    // Save failed round to history for accurate records and export transcript
    history.push({
      round, phase,
      projectName:    document.getElementById('projectName')?.value.trim()    || '',
      projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
      doc:            null,
      notes:          _notesAtBuilderCall,
      standingNotes:  _standingAtBuilderCall,
      conflicts:      null,
      appliedChanges: [],
      responses:      Object.fromEntries((reviewerResponses || []).map(r => [r.id, r.response])),
      timestamp:      new Date().toLocaleTimeString(),
      timestampISO:   new Date().toISOString(),
      outcome:        'round_failed',
      builderId:      builder,
      resolvedDecisions: JSON.parse(JSON.stringify(window._resolvedDecisions || [])),
      failed:         true,
      failReason:     _failedRoundReason || 'unknown',
      failDetails:    _failedRoundDetails || '',
      referenceMaterialAtRound: snapshotReferenceDocs()
    });
    renderRoundHistory();
    saveSession();
    // v3.36.15 — Round-counter state: failed runRound does not bump
    // round; we still flip back to 'idle' and stamp the failed label
    // so the badge reads "Round N — Phase ⚠ Failed".
    _setLastCompletedLabel(round, phase, 'round_failed');
    window._roundUiState = 'idle';
    updateRoundBadge();
    showRoundErrorModal(_failedRoundReason || 'api', _failedRoundDetails || '');
    // v3.35.0 — Auto Mode: builder errored. Tracks the failure-streak
    // counter; chains halt at AUTO_FAILURE_STREAK_LIMIT consecutive.
    _autoMaybeChainNextRound({ outcome: 'failed', builderError: true, errorReason: _failedRoundReason || 'unknown' });
  } else {
    toast(`✅ Round ${round - 1} complete!`);
    // v3.56.15 — Churn check runs first. If the hive has been rewording one
    // sentence with no net change, _detectChurn surfaces a synthetic decision
    // in the Conflicts panel and returns true. We then HOLD the Auto chain
    // (Auto stays toggled ON, just idle) — the user resolves the card and
    // applyDecisions() → runBuilderOnly() re-enters the chain, so it resumes
    // automatically. Short-circuiting here also keeps the synthetic decision
    // out of _autoMaybeChainNextRound's USER-DECISION majority resolver, which
    // only understands AI-attributed options, not per-round churn variants.
    const _churned = _detectChurn();
    if (_churned) {
      if (window._autoMode) {
        updateAutoToggleUI();
        consoleLog(`🤖 Auto paused — resolve the churn decision in the Conflicts panel and it will resume`, 'info');
      }
    } else {
      // v3.35.0 — Auto Mode: clean round, evaluate guardrails and chain.
      _autoMaybeChainNextRound({
        outcome:    'success',
        satisfied:  (typeof noChangesCount === 'number' ? noChangesCount : 0),
        total:      (typeof successfulReviews !== 'undefined' && successfulReviews ? successfulReviews.length : 0),
        conflicts:  _autoCapturedConflicts
      });
    }
  }
}

// ── API CALL ──
// v3.36.14 — Added 3rd param notesContext: when this AI's prompt was
// constructed with USER NOTES embedded (Builder phase only — reviewers
// never see notes, gated in buildPromptForAI), the caller passes the
// notes string here so it gets frozen into the deep-dive captureRound
// entry alongside promptPreview and token usage. Reviewer call sites
// pass '' since they had no notes context. This is the authoritative
// per-API-call notes record for forensic replay.
async function callAPI(ai, prompt, notesContext = '', role = 'unknown') {
  const cfg = API_CONFIGS[ai.provider];
  if (!cfg || !cfg._key) throw new Error('No API key');

  const keyHint = cfg._key.length > 8 ? cfg._key.slice(0,4) + '••••' + cfg._key.slice(-4) : '••••';
  const t0 = Date.now();
  const isCustomEndpoint = !!cfg._isCustom || !!cfg._modelsEndpoint;

  let response;
  try {
    const endpoint = cfg.endpointFn ? cfg.endpointFn(cfg.model) : cfg.endpoint;
    response = await fetch(endpoint, {
      method: 'POST',
      headers: cfg.headersFn(cfg._key),
      body: cfg.bodyFn(cfg.model, prompt)
    });
  } catch(fetchErr) {
    const isCors = fetchErr.message.toLowerCase().includes('network') ||
                   fetchErr.message.toLowerCase().includes('fetch') ||
                   fetchErr.message.toLowerCase().includes('cors');
    const ctx = {
      aiName:        ai.name,
      provider:      ai.provider,
      aiConsoleUrl:  ai.apiConsole || null,
      aiDocsUrl:     ai.apiDocs || null,
      isCustomEndpoint,
      message:       fetchErr.message,
      raw:           null
    };
    if (isCors) {
      consoleLog(`❌ ${ai.name} — CORS blocked. Browser cannot call this API directly. A proxy is required.`, 'error');
      const entry = WF_DEBUG.classify(new Error('CORS_BLOCKED'), ctx);
      WF_DEBUG.showCard(entry, ctx);
      throw new Error('CORS_BLOCKED: Browser cannot reach ' + ai.name + ' API directly. Proxy required.');
    }
    consoleLog(`❌ ${ai.name} — Network error: ${fetchErr.message}`, 'error');
    const entry = WF_DEBUG.classify(fetchErr, ctx);
    WF_DEBUG.showCard(entry, ctx);
    throw fetchErr;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${response.status}`;
    const rawData = {
      aiName:     ai.name,
      status:     `HTTP ${response.status} ${response.statusText}`,
      rawJson:    JSON.stringify(err, null, 2),
      consoleUrl: ai.apiConsole || null
    };
    const ctx = {
      aiName:       ai.name,
      provider:     ai.provider,
      aiConsoleUrl: ai.apiConsole || null,
      aiDocsUrl:    ai.apiDocs || null,
      isCustomEndpoint,
      status:       response.status,
      message:      msg,
      raw:          rawData.rawJson
    };
    if (response.status === 429 || msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('too many')) {
      consoleLog(`⏳ ${ai.name} — Rate limited / quota exceeded: ${msg}`, 'warn', rawData);
      const entry = WF_DEBUG.classify(new Error('RATE_LIMITED:' + msg), ctx);
      WF_DEBUG.showCard(entry, ctx);
      throw new Error('RATE_LIMITED:' + msg);
    }
    consoleLog(`❌ ${ai.name} — HTTP ${response.status}: ${msg}`, 'error', rawData,
      // v3.35.4 — Bug A. When the AI has a known apiConsole URL,
      // append a clickable link to the console error line. The
      // troubleshooting card pops on top with full context (via
      // showCard below), but the console link is the audit-trail
      // copy: it stays visible after the card is dismissed and
      // survives reload via consoleHTML serialization to IDB.
      ai.apiConsole ? { url: ai.apiConsole, label: `Open ${ai.name} ↗` } : null
    );
    const entry = WF_DEBUG.classify(new Error(msg), ctx);
    WF_DEBUG.showCard(entry, ctx);
    throw new Error(msg);
  }

  const data = await response.json();
  // v3.39.13 — Measure elapsed AFTER the response body is fully consumed.
  // `await fetch()` resolves when HEADERS arrive, not when the body finishes
  // streaming. Most providers don't flush headers until the body is mostly
  // ready, so headers-time ≈ total time for them. DeepSeek's server flushes
  // headers immediately, so measuring before response.json() captured only
  // the time-to-first-byte (~0.8s flat regardless of generation length).
  // Moving the measurement here makes elapsed reflect actual end-to-end
  // response time across every provider.
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const text = cfg.extractFn(data);
  if (!text) {
    const ctx = {
      aiName:       ai.name,
      provider:     ai.provider,
      aiConsoleUrl: ai.apiConsole || null,
      aiDocsUrl:    ai.apiDocs || null,
      isCustomEndpoint,
      status:       response.status,
      message:      'Empty response',
      raw:          JSON.stringify(data, null, 2)
    };
    const entry = WF_DEBUG.classify(new Error('Empty response'), ctx);
    WF_DEBUG.showCard(entry, ctx);
    throw new Error('Empty response');
  }
  const words = text.trim().split(/\s+/).length;
  consoleLog(`✅ ${ai.name} — responded in ${elapsed}s (~${words} words)`, 'success');

  // Deep Dive capture (only writes when Deep Dive is on)
  // v3.36.7 — Tier 1 forensic capture upgrade. Beyond the basic
  // shape/timing fields we also snapshot the prompt and response
  // previews (truncated), exact char counts, and token usage from
  // the provider's response. This is the difference between "we
  // know something failed" and "we know exactly what was sent and
  // what came back" when David inspects a backup. Token usage
  // shape varies by provider:
  //   OpenAI:    data.usage.{prompt_tokens, completion_tokens, total_tokens}
  //   Anthropic: data.usage.{input_tokens, output_tokens}            (no total)
  //   Gemini:    data.usageMetadata.{promptTokenCount, candidatesTokenCount, totalTokenCount}   (v3.36.10)
  // We coalesce all three with || fallbacks. v3.39.13 — when neither
  // provider supplies a total (Anthropic case), compute total = in + out
  // ourselves so the totalTokens column is never empty when in/out are
  // populated. Surfaced from the Butter Chicken DeepDive run where
  // Claude's totalTokens was 0 across all 6 captures while in/out
  // captured correctly.
  const _pt = data?.usage?.prompt_tokens     || data?.usage?.input_tokens  || data?.usageMetadata?.promptTokenCount     || null;
  const _ct = data?.usage?.completion_tokens || data?.usage?.output_tokens || data?.usageMetadata?.candidatesTokenCount || null;
  const _tt = data?.usage?.total_tokens      || data?.usageMetadata?.totalTokenCount || ((_pt && _ct) ? _pt + _ct : null);
  WF_DEBUG.captureRound({
    // v3.52.4 — Round + role attribution for the ring buffer. Without
    // these, the DeepDive JSON is a flat list with no way to tell which
    // round each capture belongs to or whether it was a worker review or
    // Builder synthesis. `round` reads the module-level global (L317);
    // parallel worker calls all read the same value (correct — same round).
    // `role` is passed by each callAPI caller: 'worker' from runRound's
    // reviewer phase, 'builder' from runRound's builder phase and from
    // runBuilderOnly. Defaults to 'unknown' if a caller omits it.
    round,
    role,
    aiName:    ai.name,
    provider:  ai.provider,
    model:     cfg.model,
    elapsed:   parseFloat(elapsed),
    chars:     text.length,
    words,
    status:    response.status,
    finishReason: data?.choices?.[0]?.finish_reason || data?.stop_reason || null,
    promptPreview:    typeof prompt === 'string' ? prompt.slice(0, 500) : '',
    promptChars:      typeof prompt === 'string' ? prompt.length : 0,
    promptTokens:     _pt,
    completionTokens: _ct,
    totalTokens:      _tt,
    responsePreview:  text.slice(0, 1000),
    // v3.36.14 — Authoritative per-API-call notes record. Frozen at
    // prompt-construction time by the caller (runRound / runBuilderOnly).
    // Builder API calls carry the actual notes the Builder saw; reviewer
    // API calls carry '' (truthful — buildPromptForAI gates notes to
    // Builder-only prompts).
    notes:            typeof notesContext === 'string' ? notesContext : ''
  });

  return text;
}

// ── HELPERS ──
function extractConflicts(text) {
  const clean = text.replace(/`\[/g, '[').replace(/\]`/g, ']');
  const start = clean.lastIndexOf('%%CONFLICTS_START%%');
  const end   = clean.lastIndexOf('%%CONFLICTS_END%%');
  if (start === -1 || end === -1 || end <= start) return null;
  const raw = clean.slice(start + '%%CONFLICTS_START%%'.length, end).trim();
  if (!raw || raw.toUpperCase() === 'NO CONFLICTS') return null;

  // Parse structured USER DECISION blocks and freeform BUILDER DECISION lines
  const result = { userDecisions: [], builderDecisions: [], raw };

  // Extract USER DECISION blocks — normalise line endings first
  const normalised = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const udRegex = /\[USER DECISION\]([\s\S]*?)END_DECISION/gi;
  let match;
  while ((match = udRegex.exec(normalised)) !== null) {
    const block = match[1].trim();
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const decision = { question: '', current: '', options: [] };
    for (const line of lines) {
      if (/^QUESTION:/i.test(line)) {
        decision.question = line.replace(/^QUESTION:/i, '').trim();
      } else if (/^CURRENT:/i.test(line)) {
        decision.current = line.replace(/^CURRENT:/i, '').trim().replace(/^"|"$/g, '');
      } else if (/^OPTION_\d+:/i.test(line)) {
        const optText = line.replace(/^OPTION_\d+:/i, '').trim();
        const dashIdx = optText.lastIndexOf(' — ');
        const dashIdx2 = optText.lastIndexOf(' - ');
        const splitAt = dashIdx !== -1 ? dashIdx : dashIdx2;
        if (splitAt !== -1) {
          decision.options.push({
            text: optText.slice(0, splitAt).trim().replace(/^"|"$/g, ''),
            ais:  optText.slice(splitAt + 3).trim()
          });
        } else {
          decision.options.push({ text: optText.replace(/^"|"$/g, ''), ais: '' });
        }
      }
    }
    // Filter out junk options the Builder sometimes fabricates
    decision.options = decision.options.filter(o =>
      o.text &&
      o.text.length > 0 &&
      !/original.{0,20}locked/i.test(o.text) &&
      !/included for completeness/i.test(o.text) &&
      !/placeholder/i.test(o.text)
    );
    // Suppress unanimous-vote decisions where the Builder applied a change
    // (current matches one option) but used a fake baseline label like
    // "original text" as another option to manufacture a 2-way choice. Per
    // the Builder's own MAJORITY RULES, a unanimous vote should be applied
    // silently, not surfaced as a USER DECISION. Defensive parsing because
    // Builder LLMs occasionally violate that rule.
    // v3.38.14 — MUST run BEFORE the auto-promote block below. Auto-promote
    // synthesises an "Original"-attributed option from CURRENT, which would
    // trip this check every time it fires and undo the v3.36.5 fix. By
    // running this check first, we only catch Builder-emitted fake baselines
    // (the real intent), not the parser's own legitimate Original synthesis.
    const baselineLabelRegex = /^\s*(original(\s+text)?|unchanged|baseline|no[\s-]?change|current|n\/?a|none)\s*$/i;
    const currentText = (decision.current || '').trim();
    const hasFakeBaseline = decision.options.some(o => baselineLabelRegex.test(o.ais || ''));
    const currentMatchesAnOption = currentText.length > 0 &&
      decision.options.some(o => o.text.trim() === currentText);
    if (hasFakeBaseline && currentMatchesAnOption) {
      consoleLog(`⚠️ Suppressed no-op USER DECISION — unanimous vote, current already matches applied option`, 'warn');
      continue;
    }
    // v3.36.5 — Auto-promote CURRENT to an implicit "Original"-attributed
    // option when the Builder emitted exactly 1 OPTION_N and CURRENT is
    // present and doesn't match the option text. This captures legitimate
    // 2-way choices the Builder formats as "here's the current text vs
    // here's reviewer X's proposed change" rather than the canonical
    // 2-OPTION_N format. Pre-v3.36.5 these were dropped at the floor
    // check below, surfacing the ugly "could not be parsed" fallback
    // and forcing the user to re-run the round. Defense-in-depth: the
    // validator's CHECK 1 still verifies CURRENT is in the live doc, so
    // this loosening doesn't allow Builder to fabricate a fake baseline.
    const _currentForPromote = (decision.current || '').trim();
    if (decision.options.length === 1 && _currentForPromote.length > 0) {
      const _onlyOptionText = (decision.options[0].text || '').trim();
      if (_onlyOptionText !== _currentForPromote) {
        decision.options.unshift({ text: _currentForPromote, ais: 'Original' });
      }
    }
    if (decision.options.length < 2) continue;
    // Suppress no-op decisions — Builder sometimes folds duplicate reviewer
    // proposals into multiple OPTION_N entries with identical text. Exact
    // match only so genuine micro-differences (punctuation, a trailing word)
    // are preserved as real choices.
    const uniqueTexts = new Set(decision.options.map(o => o.text));
    if (uniqueTexts.size < 2) {
      const sample = decision.options[0]?.text || '(empty)';
      consoleLog(`⚠️ Suppressed no-op USER DECISION — all options identical: "${sample}"`, 'warn');
      continue;
    }
    result.userDecisions.push(decision);
  }

  // Extract BUILDER DECISION lines (freeform, not structured)
  const bdRegex = /\[BUILDER DECISION\][^\[]+/g;
  while ((match = bdRegex.exec(raw)) !== null) {
    result.builderDecisions.push(match[0].replace('[BUILDER DECISION]', '').trim());
  }

  return result;
}

// v3.39.0 — Parse the %%APPLIED_START%%...%%APPLIED_END%% envelope. Each
// [APPLIED] block lists a silent change Builder made this round — a solo
// reviewer suggestion accepted, a unanimous-majority change, or any other
// reviewer-sourced edit that did NOT become a USER DECISION or BUILDER
// DECISION. Surfaces what's being applied silently so the user can lock
// down lines that keep getting nitpicked round after round.
//
// Returns array of { lineRef, original, new, from } objects. Empty array
// if no envelope, no entries, or explicit "NO APPLIED CHANGES" content.
function extractAppliedChanges(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/`\[/g, '[').replace(/\]`/g, ']');
  const start = clean.lastIndexOf('%%APPLIED_START%%');
  const end   = clean.lastIndexOf('%%APPLIED_END%%');
  if (start === -1 || end === -1 || end <= start) return [];
  const raw = clean.slice(start + '%%APPLIED_START%%'.length, end).trim();
  if (!raw || /^NO APPLIED CHANGES$/i.test(raw)) return [];

  const normalised = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blockRegex = /\[APPLIED\]([\s\S]*?)END_APPLIED/gi;
  const out = [];
  let match;
  while ((match = blockRegex.exec(normalised)) !== null) {
    const block = match[1].trim();
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const entry = { lineRef: '', original: '', new: '', from: '' };
    for (const line of lines) {
      if (/^LINE_REF:/i.test(line)) {
        entry.lineRef = line.replace(/^LINE_REF:/i, '').trim();
      } else if (/^ORIGINAL:/i.test(line)) {
        entry.original = line.replace(/^ORIGINAL:/i, '').trim().replace(/^"|"$/g, '');
      } else if (/^NEW:/i.test(line)) {
        entry.new = line.replace(/^NEW:/i, '').trim().replace(/^"|"$/g, '');
      } else if (/^FROM:/i.test(line)) {
        entry.from = line.replace(/^FROM:/i, '').trim();
      }
    }
    // Validity: require all four fields and that NEW differs from ORIGINAL
    if (!entry.lineRef || !entry.original || !entry.new || !entry.from) continue;
    if (entry.original.trim() === entry.new.trim()) continue;
    out.push(entry);
  }
  return out;
}

// Defensive validation against Builder hallucination — verified against a real
// session (v3.21.15) where the Builder fabricated a USER DECISION wholesale:
// invented the conflict, used a stale CURRENT that wasn't in the doc anymore,
// attributed options to AIs who said "no changes needed" that round, and
// silently re-applied a previously-rejected suggestion to the document.
//
// Three checks, run in order:
//  1. CURRENT must be a live substring of the document the Builder is returning.
//     If not, the resolution mechanism (replace CURRENT with chosen option in
//     the doc) cannot work — drop the decision.
//  2. Each option's named AIs must have actually said something resembling the
//     option text in their response THIS round. AIs who said "no changes
//     needed" cannot be the source of an option. Strip unverified attributions;
//     drop options that lose all attributions.
//  3. After stripping, fewer than 2 verifiable options means it isn't a real
//     choice — drop the whole decision.
//
// Logs every drop/strip to the console as 'warn' so the suppression is visible.
// v3.36.2 — Reviews shape fix. Real call site at runRound passes the
// reviewerResponses array, whose objects have shape:
//   { id, name, response, noChanges }
// Prior code read r.ai.name (which assumed the Promise-return shape
// { ai: { id, name }, response, success, noChanges } from the per-AI
// reviewerPromises). Mismatch silently failed the populate loop and left
// responseByName empty, killing 100% of USER DECISIONs at the
// round-membership check below. Fix accepts both shapes for safety.
function validateUserDecisions(userDecisions, returnedDoc, reviews) {
  if (!Array.isArray(userDecisions) || userDecisions.length === 0) return userDecisions || [];
  const docLower = (returnedDoc || '').toLowerCase();

  // Build name → response map (lowercased keys for lookup, original-case names retained for re-display)
  // v3.38.14 — Dual-key build to handle prefix variation. Builders attribute
  // by model name ("Claude-4-6-Opus"); display names from imported-server
  // flows ship with bracketed prefixes ("[Base] Claude-4-6-Opus", "[Server X]
  // Claude-Sonnet-4-6", etc.). A single full-name lookup misses, the
  // attribution gets treated as fabricated, the option is stripped, and 100%
  // of USER DECISIONs die at CHECK 3 with prefixed AIs. Fix: also key the
  // map by a normalized form (bracketed prefix stripped) so either Builder
  // phrasing matches. Token-side lookup below tries both forms.
  const _normalizeAIName = (s) => (s || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim().toLowerCase();
  const responseByName = new Map(); // lower-name → { lowerResponse, displayName, noChanges }
  for (const r of reviews || []) {
    // v3.36.2 — Tolerate both call shapes. Real shape from runRound is
    // r.name; the old comment claimed r.ai.name (the Promise-return
    // shape) which the validator never actually received.
    const displayName = r?.name || r?.ai?.name || '';
    if (!displayName) continue;
    const entry = {
      lowerResponse: (r.response || '').toLowerCase(),
      displayName,
      noChanges: !!r.noChanges
    };
    const fullKey = displayName.toLowerCase();
    const normKey = _normalizeAIName(displayName);
    responseByName.set(fullKey, entry);
    if (normKey && normKey !== fullKey) responseByName.set(normKey, entry);
  }

  const cleaned = [];
  // v3.39.4 — Track WHY decisions get dropped so the conflicts panel can
  // surface a diagnostic banner instead of the generic "could not be parsed"
  // message. apply-and-flag violations get a specific call-out + a model
  // swap recommendation.
  const failures = [];
  for (const d of userDecisions) {
    // ── CHECK 1: CURRENT must exist in returned doc ──
    const currentText = (d.current || '').trim();
    if (currentText && docLower.length > 0 && !docLower.includes(currentText.toLowerCase())) {
      const preview = currentText.length > 60 ? currentText.slice(0, 60) + '…' : currentText;
      consoleLog(`⚠️ Suppressed USER DECISION — CURRENT "${preview}" not in returned document (Builder hallucination)`, 'warn');
      failures.push({ reason: 'apply_and_flag', currentPreview: preview });
      continue;
    }

    // ── CHECK 2: validate each option's AI attributions ──
    const validatedOptions = [];
    for (const opt of (d.options || [])) {
      const optTextLower = (opt.text || '').toLowerCase();
      // Split attribution string on commas, slashes, ampersands, " and "
      const attrTokens = (opt.ais || '')
        .split(/,|\/| and | & /i)
        .map(s => s.trim())
        .filter(Boolean);
      const verified = [];
      const stripped = [];
      // v3.36.1 — Substring check removed entirely. Reviewer responses
      // naturally quote fragments ("Line N: change 'X' to 'Y'") not full
      // sentences, so substring matching against Builder-synthesised
      // complete-replacement options produced overwhelming false negatives
      // — verified empirically on the v3.36.0 Shrimp Scampi test where
      // Mistral-as-Builder emitted 2 legitimate USER DECISIONs and the
      // OR-fallback (option-text OR CURRENT-text) suppressed both.
      // Hallucination defences remain intact at: parser-level
      // CURRENT-must-be-live (extractConflicts), prompt-level
      // ANTI-HALLUCINATION RULES, validator-level round-membership +
      // noChanges shortcuts (below), and ≥2-verifiable-options floor
      // (after this loop). The cost of removing substring is that an
      // attribution to an in-round non-silent AI who didn't actually
      // engage the relevant section may survive — cosmetic, not
      // catastrophic, and the user judges options on text merits.
      for (const token of attrTokens) {
        // v3.36.5 — Recognize baseline-label tokens as verified attributions.
        // The parser auto-promotes CURRENT to an "Original"-attributed
        // option when the Builder emits exactly 1 OPTION_N and a non-
        // matching CURRENT (capturing legitimate "keep current vs adopt
        // proposed change" 2-way choices). This bypass lets that
        // auto-promoted option survive CHECK 2. Defense-in-depth: CHECK 1
        // (CURRENT-must-be-live) above already verified the CURRENT text
        // is a substring of the live document, so a Builder-fabricated
        // "Original" attribution cannot smuggle in fake baseline text.
        if (/^(original(\s+text)?|baseline|current|unchanged|no[-\s]?change)$/i.test(token)) {
          verified.push('Original');
          continue;
        }
        // v3.38.14 — Try full-lowercase first, then normalized (bracketed-
        // prefix stripped). Builder may attribute as model name or as full
        // display name; map carries both keys so either resolves.
        const entry = responseByName.get(token.toLowerCase()) || responseByName.get(_normalizeAIName(token));
        if (!entry) {
          // AI not in this round's reviewer set at all — fabricated
          stripped.push(token);
          continue;
        }
        if (entry.noChanges) {
          // AI said "no changes needed" — cannot be the source of an option
          stripped.push(entry.displayName);
          continue;
        }
        verified.push(entry.displayName);
      }
      if (stripped.length > 0) {
        const optPreview = (opt.text || '').slice(0, 50) + ((opt.text || '').length > 50 ? '…' : '');
        consoleLog(`⚠️ Stripped fake attribution from option "${optPreview}" — ${stripped.join(', ')} did not propose this in this round`, 'warn');
      }
      if (verified.length > 0) {
        validatedOptions.push({ text: opt.text, ais: verified.join(', ') });
      } else {
        const optPreview = (opt.text || '').slice(0, 50) + ((opt.text || '').length > 50 ? '…' : '');
        consoleLog(`⚠️ Dropped option "${optPreview}" — no verifiable attribution`, 'warn');
      }
    }

    // ── CHECK 3: must have ≥2 verifiable options after stripping ──
    if (validatedOptions.length < 2) {
      const qPreview = (d.question || '').slice(0, 70) + ((d.question || '').length > 70 ? '…' : '');
      consoleLog(`⚠️ Suppressed USER DECISION — fewer than 2 verifiable options after attribution check ("${qPreview}")`, 'warn');
      failures.push({ reason: 'attribution_strip', questionPreview: qPreview });
      continue;
    }

    cleaned.push({ ...d, options: validatedOptions });
  }

  // v3.39.4 — Expose dropped-decision reasons to the conflicts panel so
  // it can render a diagnostic banner (apply-and-flag → swap-to-Opus
  // recommendation) instead of the generic "could not be parsed" copy.
  window._lastValidationFailures = failures;
  return cleaned;
}

function extractDocument(text) {
  const clean = text.replace(/`\[/g, '[').replace(/\]`/g, ']');
  // indexOf for START, lastIndexOf for END — handles rare cases where AIs repeat the delimiter
  const start = clean.indexOf('%%DOCUMENT_START%%');
  const end   = clean.lastIndexOf('%%DOCUMENT_END%%');
  if (start === -1 || end === -1 || end <= start) return null;
  return clean.slice(start + '%%DOCUMENT_START%%'.length, end).trim();
}

// Strip any prompt envelope that non-compliant AIs echo back into their document output.
// Some models (Grok, certain corporate proxies) return the WAXFRAME header, PROJECT CONTEXT,
// and CURRENT DOCUMENT scaffolding as part of their response body. This removes it before
// the document is written to the textarea.
function stripBuilderEnvelope(text) {
  if (!text) return text;
  let result = text;
  // Remove leading ══...══ / WAXFRAME — ... / Round ... header block
  result = result.replace(/^[═\s]*WAXFRAME\s*—[^\n]*\n[^\n]*\n[═\s]*\n?/i, '');
  // Remove PROJECT CONTEXT: ... block (up to next blank line or section)
  result = result.replace(/^PROJECT CONTEXT:[^\n]*\n?(\n)?/im, '');
  // Remove PROJECT GOAL: ... block
  result = result.replace(/^PROJECT GOAL:[^\n]*(\n[\s\S]*?)?(?=\n\n|\nCURRENT DOCUMENT|\nLENGTH|\nUSER NOTES|\nREFERENCE MATERIAL|$)/im, '');
  // Remove REFERENCE MATERIAL block (v3.21.0) — strip if echoed by non-compliant AIs
  result = result.replace(/^REFERENCE MATERIAL[^\n]*\n[─\s]*\n?[\s\S]*?\n[─\s]*\n?/im, '');
  // Remove CURRENT DOCUMENT (line numbers for reference): header and separator line
  result = result.replace(/^CURRENT DOCUMENT \(line numbers for reference\):\s*\n[─\s]*\n?/im, '');
  // Remove line-numbered lines: "   1  text" — only if they appear as a leading block
  // Detect: lines starting with optional spaces, 1-4 digits, 2 spaces, then content
  const lineNumPattern = /^(\s{0,4}\d{1,4}\s{2,}.*\n?)+/m;
  const firstChunk = result.slice(0, 800);
  if (lineNumPattern.test(firstChunk)) {
    result = result.replace(/^(\s{0,4}\d{1,4}\s{2,}[^\n]*\n?)+/, '');
  }
  return result.trim();
}

// Track user's choices for current conflict set
window._decisionChoices = {};
// Track resolved USER DECISION conflicts to prevent Builder re-raising them
// Restored from localStorage so refreshes don't wipe resolved decisions
try {
  window._resolvedDecisions = JSON.parse(localStorage.getItem('waxframe_resolved_decisions') || '[]');
} catch(e) {
  window._resolvedDecisions = [];
}

// Conflict ledger — tracks how many times each conflict has appeared
// Used to detect repeat offenders (e.g. Grok re-raising settled points)
try {
  window._conflictLedger = JSON.parse(localStorage.getItem('waxframe_conflict_ledger') || '[]');
} catch(e) {
  window._conflictLedger = [];
}

// Per-AI warnings — targeted instructions injected into specific AI prompts
// when they keep re-raising resolved conflicts
try {
  window._aiWarnings = JSON.parse(localStorage.getItem('waxframe_ai_warnings') || '{}');
} catch(e) {
  window._aiWarnings = {};
}

// ── CONFLICT LEDGER ──
// Generates a stable fingerprint from a conflict's key text
// so we can detect the same conflict reappearing across rounds
function fingerprintConflict(d) {
  // Build fingerprint from the question text + current value.
  // Normalise aggressively so minor rewordings of the same underlying conflict
  // (e.g. "2.5 hours" vs "two and a half hours") still produce the same hash.
  // Option texts are intentionally excluded — they vary too much round-to-round.
  const normalize = s => (s || '').toLowerCase()
    .replace(/\b(two and a half|2\.5|2½)\b/g, '2.5')
    .replace(/\b(one and a half|1\.5|1½)\b/g, '1.5')
    .replace(/\bapproximately\b/g, '')
    .replace(/\babout\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Primary anchor: normalised question + normalised current value
  // Secondary: first 6 words of the question as a topic stub
  const questionStub = normalize(d.question || '').split(' ').slice(0, 6).join(' ');
  const currentNorm  = normalize(d.current || '');
  const raw = questionStub + '|' + currentNorm;

  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function updateConflictLedger(userDecisions) {
  if (!userDecisions || userDecisions.length === 0) return;
  const ledger = window._conflictLedger;
  userDecisions.forEach(d => {
    const fp = fingerprintConflict(d);
    const existing = ledger.find(e => e.fingerprint === fp);
    if (existing) {
      existing.count++;
      existing.lastRound = round;
      existing.text = d.question || d.current || '';
    } else {
      ledger.push({
        fingerprint: fp,
        text: d.question || d.current || '',
        count: 1,
        firstRound: round,
        lastRound: round,
        suppressed: false
      });
    }
  });
  try { localStorage.setItem('waxframe_conflict_ledger', JSON.stringify(ledger)); } catch(e) { console.warn('[conflict-ledger] write failed:', e); }
}

function getLedgerEntry(d) {
  return window._conflictLedger.find(e => e.fingerprint === fingerprintConflict(d));
}

// Extract the "before" text from a reviewer suggestion like:
// "Line 9: Change 'either one (or both) of us' to 'one or both of us'."
// so we can scroll to it in the document.
// Given a holdout suggestion ("Add 'X' after 'Y'", "Change 'A' to 'B'", etc.)
// and the working document, find the most distinctive quoted anchor that
// already exists in the doc, and return both the anchor and the line
// containing it. Used to render a "Current:" preview on holdout cards so
// they match the structure of Builder USER DECISION cards.
//
// Strategy:
//   1. Pull every quoted substring out of the suggestion (straight + curly).
//   2. Filter to those that actually appear in the working document.
//   3. Pick the longest match - for "Add 'based in Tampa' after 'company'",
//      this correctly picks "company" since "based in Tampa" is not in the
//      doc yet. For "Change 'X' to 'Y'", X exists in doc, Y does not.
//   4. Find the line containing the anchor; clip very long lines around it.
function findCurrentLineForSuggestion(suggestionText, docText) {
  if (!suggestionText || !docText) return null;
  const quoteRx = /["\u201c\u2018']([^"\u201d\u2019']{2,}?)["\u201d\u2019']/g;
  const candidates = [];
  let m;
  while ((m = quoteRx.exec(suggestionText)) !== null) {
    candidates.push(m[1]);
  }
  const existing = candidates.filter(c => docText.includes(c));
  if (existing.length === 0) return null;
  existing.sort((a, b) => b.length - a.length);
  const anchor = existing[0];
  const idx = docText.indexOf(anchor);
  if (idx === -1) return null;
  const lineStart = docText.lastIndexOf('\n', idx - 1) + 1;
  let lineEnd = docText.indexOf('\n', idx);
  if (lineEnd === -1) lineEnd = docText.length;
  const line = docText.slice(lineStart, lineEnd).trim();
  const MAX_PREVIEW = 200;
  let preview = line;
  if (preview.length > MAX_PREVIEW) {
    const anchorInLine = line.indexOf(anchor);
    const half = Math.floor((MAX_PREVIEW - anchor.length) / 2);
    const previewStart = Math.max(0, anchorInLine - half);
    const previewEnd = Math.min(line.length, previewStart + MAX_PREVIEW);
    preview = (previewStart > 0 ? '…' : '') + line.slice(previewStart, previewEnd) + (previewEnd < line.length ? '…' : '');
  }
  return { anchor: anchor, preview: preview };
}

function scrollToCurrentText(currentText) {
  const ta = document.getElementById('workDocument');
  if (!ta || !currentText) return;
  const text = ta.value;
  const idx  = text.indexOf(currentText);
  if (idx === -1) {
    toast('⚠️ Text not found in document — it may have changed');
    return;
  }
  const editor = ta.closest('.work-doc-editor');
  if (!editor) {
    // No outer scroll container — select only; any page scroll is native.
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(idx, idx + currentText.length);
    return;
  }

  // Measure the match's real pixel offset using a hidden mirror <div> that
  // inherits the textarea's font, width, padding, and wrap properties. The
  // prior implementation counted '\n' characters only, which on a wrapped
  // prose document (.work-doc-ta uses white-space: pre-wrap, ~80ch wide)
  // could misplace the scroll target by thousands of pixels. A paragraph
  // with zero newlines but 500 characters wraps to ~7 visual rows — the
  // old math treated that as one row.
  let mirror = document.getElementById('_workDocScrollMirror');
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.id = '_workDocScrollMirror';
    mirror.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mirror);
  }
  const cs = getComputedStyle(ta);
  mirror.style.cssText =
    'position:absolute;visibility:hidden;top:-99999px;left:-99999px;pointer-events:none;' +
    'width:' + cs.width + ';' +
    'padding:' + cs.padding + ';' +
    'border:' + cs.border + ';' +
    'box-sizing:' + cs.boxSizing + ';' +
    'font-family:' + cs.fontFamily + ';' +
    'font-size:' + cs.fontSize + ';' +
    'font-weight:' + cs.fontWeight + ';' +
    'line-height:' + cs.lineHeight + ';' +
    'letter-spacing:' + cs.letterSpacing + ';' +
    'white-space:' + cs.whiteSpace + ';' +
    'word-break:' + cs.wordBreak + ';' +
    'overflow-wrap:' + cs.overflowWrap + ';' +
    'tab-size:' + cs.tabSize + ';';

  // Place a zero-width marker at the match position; its offsetTop is the
  // exact pixel y of the match accounting for all wrap.
  mirror.textContent = '';
  mirror.appendChild(document.createTextNode(text.substring(0, idx)));
  const marker = document.createElement('span');
  marker.textContent = '\u200B';
  mirror.appendChild(marker);
  const offsetY = marker.offsetTop;

  // Convert textarea-local y to editor-scroll y, then target ~1/3 down the
  // viewport so the match isn't jammed against the top edge (matches prior
  // UX intent).
  const taRect        = ta.getBoundingClientRect();
  const editorRect    = editor.getBoundingClientRect();
  const taTopInEditor = (taRect.top - editorRect.top) + editor.scrollTop;
  const targetScroll  = taTopInEditor + offsetY - editor.clientHeight / 3;
  editor.scrollTop = Math.max(0, targetScroll);

  // preventScroll: true stops Chrome from re-scrolling an ancestor on focus
  // and undoing the manual scroll we just applied.
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(idx, idx + currentText.length);
  toast('📍 Scrolled to text in document', 2000);
}

// Strip stale line number references from Builder-generated conflict questions.
// The Builder writes "Line 26: ..." referencing the input doc, but after rewriting
// the document those line numbers may no longer match. Removed at display time only.
function stripLineRefs(text) {
  if (!text) return text;
  return text
    .replace(/^Lines?\s+\d+[\-–]\d+\s*[:\-–—]\s*/i, '')
    .replace(/^Lines?\s+\d+\s*[:\-–—]\s*/i, '')
    .replace(/\bLines?\s+\d+[\-–]\d+\s*[:\-–—]\s*/gi, '')
    .replace(/\bLines?\s+\d+\s*[:\-–—]\s*/gi, '')
    .trim();
}

// v3.39.0 — Build the "Builder Applied This Round" section. Pulls the
// appliedChanges array from the latest history entry, counts repeat
// touches across recent rounds (for the "×N rounds" badge), and renders
// each as a card with a "Lock this line" button. Wired through
// lockAppliedChange() which mirrors the existing USER DECISION lock-in
// path (push to _resolvedDecisions + per-AI warnings).
function buildAppliedChangesHTML(latest) {
  if (!latest || !Array.isArray(latest.appliedChanges) || latest.appliedChanges.length === 0) return '';
  const items = latest.appliedChanges;
  const latestRound = latest.round || (history.length || 0);

  // v3.39.6 — Repeat-touch counter expanded from a 5-round trailing window
  // to the full project history. On a long-running session a line can sit
  // idle for several rounds and then get touched again; the 5-round window
  // missed those. Counting across history gives a "touched N of M rounds"
  // signal that scales with project length.
  const repeatCount = (lineRef) => {
    if (!lineRef) return 0;
    const key = lineRef.trim().toLowerCase();
    let n = 0;
    for (const h of history) {
      if (!Array.isArray(h.appliedChanges)) continue;
      if (h.appliedChanges.some(a => (a.lineRef || '').trim().toLowerCase() === key)) n++;
    }
    return n;
  };

  // Lock All / Unlock All — every applied change has a locked boolean.
  // If ANY is unlocked → button reads "Lock All". If ALL are locked →
  // button reads "Unlock All". No confirm dialog by design — David's
  // call: locking is fully reversible per-line, worst case the user
  // unlocks the ones they didn't want after reading the doc.
  const allLocked = items.every(c => !!c.locked);
  const bulkBtn = allLocked
    ? `<button class="applied-bulk-btn applied-bulk-btn-locked" onclick="unlockAllAppliedChanges(${latestRound})">🔓 Unlock All</button>`
    : `<button class="applied-bulk-btn" onclick="lockAllAppliedChanges(${latestRound})">🔒 Lock All</button>`;

  let html = `<div class="conflicts-section-header applied-changes-header">
    <span class="applied-changes-header-text">✓ Builder Applied ${items.length} Change${items.length !== 1 ? 's' : ''} — Confirm or Keep Revising</span>
    ${bulkBtn}
  </div>
  <div class="applied-changes-blurb">
    The Builder already made these decisions for you — accepting individual reviewer suggestions where there was only one. Read each one. If the Builder made the right call, <strong>Lock</strong> it — that tells the hive "yep, you got it right, stop revising." Leave it unlocked and the hive will keep proposing changes to that line in future rounds.
  </div>`;

  items.forEach((c, i) => {
    const rep = repeatCount(c.lineRef);
    // v3.39.6 — "Touched 2 of 8 rounds" reads better than "↻ touched 2
    // rounds". Threshold for showing the badge is still 2+ (one touch
    // isn't a pattern). Strong-warning threshold for 3+ unchanged.
    const repeatBadge = rep >= 3
      ? `<span class="applied-repeat-badge applied-repeat-strong">⚠ ${rep} of ${history.length} rounds</span>`
      : (rep >= 2 ? `<span class="applied-repeat-badge">↻ ${rep} of ${history.length} rounds</span>` : '');
    const lockedTag = c.locked ? `<span class="applied-locked-tag">🔒 Locked</span>` : '';
    const lockBtn = c.locked
      ? `<button class="applied-lock-btn applied-lock-btn-locked" onclick="lockAppliedChange(${latestRound}, ${i})">🔓 Unlock</button>`
      : `<button class="applied-lock-btn" onclick="lockAppliedChange(${latestRound}, ${i})">🔒 Lock this line</button>`;

    // v3.39.6 — Card layout redesigned to read as a proper card and not
    // a wall of text. Left-edge accent bar anchors each card visually.
    // Header row: line-ref styled as a pill tag (not bold inline text),
    // badges to the right. Attribution on its own dim italic line.
    // Diff-style ± rows replace inline "was:"/"now:" labels — old text
    // gets a red-tint minus row, new text gets a green-tint plus row,
    // each with its own visual treatment instead of running into a
    // single paragraph block.
    html += `<div class="applied-card${c.locked ? ' applied-card-locked' : ''}">
      <div class="applied-card-header">
        <span class="applied-line-ref">${esc(c.lineRef || '(unspecified line)')}</span>
        ${repeatBadge}
        ${lockedTag}
      </div>
      <div class="applied-from-line">suggested by <em>${esc(c.from || 'unknown reviewer')}</em></div>
      <div class="applied-diff">
        <div class="applied-diff-row applied-diff-old">
          <span class="applied-diff-marker">−</span>
          <span class="applied-diff-text">${esc(c.original || '')}</span>
        </div>
        <div class="applied-diff-row applied-diff-new">
          <span class="applied-diff-marker">+</span>
          <span class="applied-diff-text">${esc(c.new || '')}</span>
        </div>
      </div>
      <div class="applied-actions">
        ${lockBtn}
      </div>
    </div>`;
  });

  return html;
}

// v3.39.6 — Bulk lock/unlock. No confirm dialog by design (locking is
// fully reversible per-line, worst case user unlocks the ones they
// didn't want after reading the doc). Iterates items, calls the
// existing lockAppliedChange toggle on each unlocked one to lock,
// or each locked one to unlock. Single render at the end (the
// inner toggles also render but the final state is correct).
function lockAllAppliedChanges(roundNum) {
  const h = history.find(e => e.round === roundNum && Array.isArray(e.appliedChanges));
  if (!h) return;
  h.appliedChanges.forEach((c, i) => {
    if (!c.locked) lockAppliedChange(roundNum, i);
  });
  toast(`🔒 Locked all ${h.appliedChanges.length} changes — hive will leave these lines alone next round`);
}

function unlockAllAppliedChanges(roundNum) {
  const h = history.find(e => e.round === roundNum && Array.isArray(e.appliedChanges));
  if (!h) return;
  h.appliedChanges.forEach((c, i) => {
    if (c.locked) lockAppliedChange(roundNum, i);
  });
  toast(`🔓 Unlocked all — reviewers can revise these lines again`);
}

// v3.39.7 — Lock my selection. The button has existed in the USER
// DECISION UI since the conflicts panel was first built but the
// handler was never wired (drafted-without-implementation gap, same
// flavor the per-line Lock had before v3.39.0). Behavior mirrors
// applyDecisions's lock block but for a single decision and without
// the Builder call — useful when the user wants to lock a decision
// across rounds without forcing a Builder send right now.
//
// The historical button label "Lock my selection in Notes" was
// misleading. Standing Notes is soft guidance text injected into
// prompts; window._resolvedDecisions is the canonical hard lock,
// injected as "PREVIOUSLY RESOLVED DECISIONS — FINAL AND LOCKED" to
// both Builder and reviewers. This handler writes to the lock
// channel, not to Notes. Button relabeled to "Lock my selection"
// at the call site to match what it actually does.
//
// Choice-type resolution mirrors applyDecisions exactly:
//   option → d.options[choice.idx].text
//   custom → choice.text (user's typed override)
//   bypass → d.current (lock current text as-is, treat skip as keep)
// v3.39.7 — Lock my selection. Was a dead handler (button wired to a
// function that didn't exist).
// v3.39.8 — Toggle. Click locks; click again unlocks. Symmetric with
// the per-line Applied Changes lock pattern from v3.39.0+ — every
// "lock" in WaxFrame is reversible so accidental clicks aren't fatal.
function lockConflictDecision(decisionIdx) {
  const latest = history.length > 0 ? history[history.length - 1] : null;
  if (!latest?.conflicts?.userDecisions) {
    toast('⚠️ No active conflict to lock');
    return;
  }
  const decisions = latest.conflicts.userDecisions;
  const d = decisions[decisionIdx];
  if (!d || !d.current) return;
  const dCurrent = d.current.trim();

  // ── DETECT LOCKED STATE ──
  // Match by ORIGINAL only (not original+chosen). If user changed
  // selection mid-locked, unlock still finds and removes the stale
  // lock cleanly. One lock per decision, identified by original.
  window._resolvedDecisions = window._resolvedDecisions || [];
  const isLocked = window._resolvedDecisions.some(rd =>
    (rd.original || '').trim() === dCurrent
  );

  // ── UNLOCK BRANCH ──
  if (isLocked) {
    window._resolvedDecisions = window._resolvedDecisions.filter(rd =>
      (rd.original || '').trim() !== dCurrent
    );
    try { localStorage.setItem('waxframe_resolved_decisions', JSON.stringify(window._resolvedDecisions)); } catch(e) { console.warn('[resolved] write failed:', e); }

    window._aiWarnings = window._aiWarnings || {};
    Object.keys(window._aiWarnings).forEach(aiId => {
      window._aiWarnings[aiId] = window._aiWarnings[aiId].filter(w =>
        (w.original || '').trim() !== dCurrent
      );
      if (window._aiWarnings[aiId].length === 0) delete window._aiWarnings[aiId];
    });
    try { localStorage.setItem('waxframe_ai_warnings', JSON.stringify(window._aiWarnings)); } catch(e) { console.warn('[ai-warnings] write failed:', e); }

    if (typeof fingerprintConflict === 'function' && Array.isArray(window._conflictLedger)) {
      const fp = fingerprintConflict(d);
      const entry = window._conflictLedger.find(e => e.fingerprint === fp);
      if (entry && entry.suppressed) {
        entry.suppressed = false;
        try { localStorage.setItem('waxframe_conflict_ledger', JSON.stringify(window._conflictLedger)); } catch(e) { console.warn('[conflict-ledger:unsuppress] write failed:', e); }
      }
    }

    saveSession();
    renderConflicts();
    consoleLog(`🔓 Unlocked decision — "${dCurrent.slice(0, 50)}${dCurrent.length > 50 ? '…' : ''}"`, 'info');
    toast(`🔓 Unlocked — reviewers can suggest changes to this again`);
    return;
  }

  // ── LOCK BRANCH ──
  const choice = window._decisionChoices ? window._decisionChoices[decisionIdx] : null;
  if (!choice) {
    toast('⚠️ Pick an option first, then lock it');
    return;
  }

  let chosenText = '';
  if (choice.type === 'option') {
    chosenText = (d.options && d.options[choice.idx] && d.options[choice.idx].text) || '';
  } else if (choice.type === 'custom') {
    chosenText = choice.text || '';
  } else if (choice.type === 'bypass') {
    chosenText = d.current || '';
  }

  if (!chosenText) {
    toast('⚠️ Selected option has no text to lock');
    return;
  }

  window._resolvedDecisions.push({ original: d.current, chosen: chosenText });
  try { localStorage.setItem('waxframe_resolved_decisions', JSON.stringify(window._resolvedDecisions)); } catch(e) { console.warn('[resolved] write failed:', e); }

  if (typeof fingerprintConflict === 'function' && Array.isArray(window._conflictLedger)) {
    const fp = fingerprintConflict(d);
    const entry = window._conflictLedger.find(e => e.fingerprint === fp);
    if (entry) {
      entry.suppressed = true;
      try { localStorage.setItem('waxframe_conflict_ledger', JSON.stringify(window._conflictLedger)); } catch(e) { console.warn('[conflict-ledger:suppress] write failed:', e); }

      if (entry.count >= 3) {
        const losingOptions = (d.options || []).filter(opt => opt.text !== chosenText && opt.ais);
        window._aiWarnings = window._aiWarnings || {};
        losingOptions.forEach(opt => {
          const aiNames = opt.ais.split(',').map(n => n.trim().toLowerCase());
          (aiList || []).forEach(ai => {
            if (aiNames.includes((ai.name || '').toLowerCase())) {
              if (!window._aiWarnings[ai.id]) window._aiWarnings[ai.id] = [];
              const alreadyWarned = window._aiWarnings[ai.id].some(w => w.original === d.current);
              if (!alreadyWarned) {
                window._aiWarnings[ai.id].push({ original: d.current, chosen: chosenText });
                consoleLog(`⚠️ Targeted warning issued to ${ai.name} — repeatedly raised "${d.current}" after it was resolved`, 'warn');
              }
            }
          });
        });
        try { localStorage.setItem('waxframe_ai_warnings', JSON.stringify(window._aiWarnings)); } catch(e) { console.warn('[ai-warnings] write failed:', e); }
      }
    }
  }

  saveSession();
  renderConflicts();
  consoleLog(`🔒 Locked decision — "${dCurrent.slice(0, 50)}${dCurrent.length > 50 ? '…' : ''}" → "${chosenText.slice(0, 50)}${chosenText.length > 50 ? '…' : ''}"`, 'info');
  toast(`🔒 Locked — Builder and reviewers will leave this alone`);
}

// ── CHURN DETECTOR (v3.56.15) ──
// After each successful round, look back across the last CHURN_WINDOW
// document transitions. If exactly ONE sentence slot keeps getting reworded
// every round — semantically equivalent, just rephrased — while the rest of
// the document holds stable, the hive is spinning its wheels (the 24-round
// conference-center grind). We surface it as a synthetic USER DECISION so the
// user can lock a version and kill the loop. Reuses the entire decision-card
// path: options, custom, doc-scroll, lock, apply.
function _churnSentences(doc) {
  return (doc || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}
function _churnNorm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function _churnSim(a, b) {
  // Jaccard token overlap of two sentences (0 = disjoint, 1 = identical words).
  const A = new Set(_churnNorm(a).split(' ').filter(Boolean));
  const B = new Set(_churnNorm(b).split(' ').filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0; A.forEach(t => { if (B.has(t)) inter++; });
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}
function _churnFingerprint(s) {
  return _churnNorm(s).split(' ').slice(0, 8).join(' ');
}
function _detectChurn() {
  try {
    if (window._churnPending) return false; // a churn card is already up
    const entries = history.filter(h => h && typeof h.doc === 'string' && h.doc.trim());
    if (entries.length < CHURN_WINDOW + 1) return false;
    const win = entries.slice(-(CHURN_WINDOW + 1)); // oldest → newest

    // Walk each consecutive transition. A churn transition is: exactly one
    // sentence removed and one added, where the two are similar-but-not-equal
    // (a reword), and the rest of the document is stable.
    const variants = [];
    for (let i = 1; i < win.length; i++) {
      const prev = _churnSentences(win[i - 1].doc);
      const cur  = _churnSentences(win[i].doc);
      if (Math.abs(prev.length - cur.length) > 1) return false; // doc not net-flat
      const prevSet = new Set(prev);
      const curSet  = new Set(cur);
      const added   = cur.filter(s => !prevSet.has(s));
      const removed = prev.filter(s => !curSet.has(s));
      if (added.length !== 1 || removed.length !== 1) return false; // not a single localized reword
      const sim = _churnSim(added[0], removed[0]);
      if (sim < CHURN_SIM_MIN || sim >= 0.999) return false; // unrelated change, or identical (no real edit)
      variants.push({ text: added[0], round: win[i].round });
    }

    // The mutating slot must be the SAME slot across all transitions —
    // each variant similar to the one before it.
    for (let i = 1; i < variants.length; i++) {
      if (_churnSim(variants[i - 1].text, variants[i].text) < CHURN_SIM_MIN) return false;
    }

    const current = variants[variants.length - 1].text; // = the live doc's version
    const fp = _churnFingerprint(current);

    // Suppressed by a recent "apply without locking"?
    if (window._churnDismissed && window._churnDismissed[fp] && round <= window._churnDismissed[fp]) return false;

    // Already locked? Then the hive can't be reworking it — nothing to do.
    const lockedAlready = (window._resolvedDecisions || []).some(rd =>
      _churnSim(rd.original, current) > 0.9 || _churnSim(rd.chosen, current) > 0.9);
    if (lockedAlready) return false;

    // Build the synthetic decision. Options = each round's attempt, labelled
    // by round; the current (live) version is the last option.
    const options = variants.map(v => ({
      text: v.text,
      ais:  v.round != null ? `Round ${v.round}` : 'Earlier round'
    }));

    const latest = history[history.length - 1];
    if (!latest) return false;
    if (!latest.conflicts) latest.conflicts = { userDecisions: [], builderDecisions: [], raw: '' };
    if (!Array.isArray(latest.conflicts.userDecisions)) latest.conflicts.userDecisions = [];
    if (latest.conflicts.userDecisions.some(d => d._churn)) return false; // already injected

    latest.conflicts.userDecisions.push({
      question: `The hive keeps rewording this sentence without changing its meaning — ${CHURN_WINDOW} rounds running. Pick a version to lock in, or write your own.`,
      current,
      options,
      _churn: true,
      _churnRounds: CHURN_WINDOW
    });
    window._lastConflicts = latest.conflicts;
    window._churnPending  = true;

    consoleLog(
      `⟳ Churn detected — "${current.slice(0, 60)}${current.length > 60 ? '…' : ''}" reworded ${CHURN_WINDOW} rounds running with no net change. Lock a version in the Conflicts panel to stop the loop.`,
      'warn'
    );
    renderConflicts();
    if (typeof playAlertSound === 'function') playAlertSound();
    const panel = document.getElementById('conflictsPanel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    saveSession();
    return true;
  } catch (e) {
    console.warn('[churn] detection error:', e);
    return false;
  }
}

function renderConflicts() {
  const el = document.getElementById('conflictsPanel');
  if (!el) return;

  const latest = history.length > 0 ? history[history.length - 1] : null;
  if (!latest) {
    el.innerHTML = '<div class="conflicts-empty-card">No rounds yet. Run a round (the <strong>Smoke the Hive</strong> button below) to see what the Builder couldn\'t resolve. This panel always shows conflicts from the most recent round only — not project-wide completion.</div>';
    return;
  }

  const conflicts = latest.conflicts;

  if (!conflicts) {
    // v3.38.7 — empty-state messages rewritten with per-round framing and
    // context-aware guidance. The prior message "No conflicts from the last
    // round. The Builder resolved everything." was reading as completion (Candy
    // coleslaw discovery, 2026-05-11), particularly after Round 1 of a
    // scratch project where the Builder always produces a clean draft with
    // nothing to conflict against. Two branches: Builder-Only rounds (no
    // reviewers ran) get a structural explanation; full-hive rounds with no
    // surfaced conflicts get a "this is per-round, run another round to
    // converge" framing.
    // v3.39.1 — Both branches now pivot on whether the Builder Applied
    // section has content. The prior copy read as a contradiction when
    // followed by a populated "Builder Applied N Changes" section ("no
    // conflicts" + "7 changes" landed as broken logic on a plain read).
    // Fix: when appliedChanges.length > 0, reframe the top message to
    // distinguish reviewer DISAGREEMENT (the conflicts panel's actual
    // domain) from silent CHANGES (which the new section already shows).
    // v3.39.8 — Empty-state copy and styling overhaul. Three fixes from
    // David's feedback: (1) wrap the explanation in a proper card with
    // left-edge accent so it visually matches the Applied Changes and
    // conflict cards instead of reading as floating prose; (2) strip the
    // random bolding pattern — only Smoke the Hive and Finish stay
    // emphasised (those are the actual UI buttons the user is being
    // directed to); (3) drop the dangling "✓ Converged" reference since
    // that label only appears as a tiny status suffix on the round
    // badge on unanimous_convergence outcomes, not as a UI element the
    // user can scan for from this state.
    const roundNum = latest.round || history.length;
    const isBuilderOnly = latest.outcome === 'builder_only_complete';
    const appliedCount = Array.isArray(latest.appliedChanges) ? latest.appliedChanges.length : 0;
    const hasApplied = appliedCount > 0;
    let msg;
    if (isBuilderOnly) {
      if (hasApplied) {
        msg = `Round ${roundNum} was a Builder-Only round. No reviewers ran — the Builder applied your directives plus ${appliedCount} carry-forward change${appliedCount !== 1 ? 's' : ''}, listed below.<br><br>To gather reviewer feedback on the updated draft, click <strong>Smoke the Hive</strong> below.`;
      } else {
        msg = `Round ${roundNum} was a Builder-Only round — no reviewers ran, so there's nothing to conflict against. The Builder applied your directives directly to the document.<br><br>To gather reviewer feedback on the current draft, click <strong>Smoke the Hive</strong> — that's a full multi-AI round, and this panel will populate with anything the reviewers disagreed on.`;
      }
    } else {
      if (hasApplied) {
        msg = `No reviewer disagreements in Round ${roundNum}. The Builder applied ${appliedCount} silent change${appliedCount !== 1 ? 's' : ''} from individual reviewer suggestions, listed below.<br><br>This panel shows the most recent round only — not project-wide completion. The hive converges when a majority of reviewers stop proposing changes. To run another round, click <strong>Smoke the Hive</strong>. To finalize the current draft, click <strong>Finish</strong> in the top toolbar.`;
      } else {
        msg = `No conflicts in Round ${roundNum}. Reviewers and the Builder agreed on the changes this round.<br><br>This panel shows the most recent round only — not project-wide completion. The hive converges when a majority of reviewers stop proposing changes. To keep refining, click <strong>Smoke the Hive</strong> for another full round. If the current draft is good as-is, click <strong>Finish</strong> in the top toolbar to export.`;
      }
    }
    el.innerHTML = buildAppliedChangesHTML(latest) + `<div class="conflicts-empty-card">${msg}</div>`;
    return;
  }

  // ── CONVERGENCE PATH: majority agreed, show holdouts for optional review ──
  if (conflicts.converged && conflicts.holdouts) {
    window._holdoutChoices = window._holdoutChoices || {};

    // Split each AI's response into individual numbered suggestions
    const flatSuggestions = [];
    conflicts.holdouts.forEach(h => {
      const parts = h.response.split(/\n(?=\d+\.\s)/);
      if (parts.length > 1) {
        parts.forEach(part => {
          const trimmed = part.trim()
            .replace(/\bno changes needed\.?\s*$/i, '')  // strip trailing NO CHANGES NEEDED
            .trim();
          if (trimmed) flatSuggestions.push({ name: h.name, text: trimmed });
        });
      } else {
        const trimmed = h.response.trim()
          .replace(/\bno changes needed\.?\s*$/i, '')
          .trim();
        if (trimmed) flatSuggestions.push({ name: h.name, text: trimmed });
      }
    });

    window._flatHoldoutSuggestions = flatSuggestions;

    const total      = flatSuggestions.length;
    const aiCount    = conflicts.holdouts.length;
    const satisfied  = conflicts.satisfied  ?? null;
    const totalAIs   = conflicts.totalAIs   ?? null;

    const satisfiedLabel = (satisfied !== null && totalAIs !== null)
      ? `${satisfied} of ${totalAIs} AIs satisfied with the document`
      : 'Majority satisfied';

    const holdoutLabel = total > 0
      ? `${aiCount} holdout AI${aiCount !== 1 ? 's' : ''} left ${total} suggestion${total !== 1 ? 's' : ''} to review:`
      : 'document is ready.';

    let html = `<div class="conflicts-section-header convergence-header">
      🏁 Hive Converged — ${satisfiedLabel} — ${holdoutLabel}
    </div>`;

    if (total > 0) {
      // Cache the working document once for line-context lookups across all suggestions
      const docText = document.getElementById('workDocument')?.value || '';
      window._holdoutAnchors = window._holdoutAnchors || {};
      flatSuggestions.forEach((s, i) => {
        const ctx = findCurrentLineForSuggestion(s.text, docText);
        if (ctx) window._holdoutAnchors[i] = ctx.anchor;
        html += `<div class="decision-card convergence-card" id="hcard-${i}">
          <div class="decision-card-header">
            <span class="convergence-ai-badge">🐝 ${esc(s.name)}</span>
            <span class="decision-badge convergence-count-badge">Suggestion ${i + 1} of ${total}</span>
          </div>
          ${ctx ? `<div class="decision-current decision-current-clickable" title="Click to scroll document to this text" onclick="scrollToCurrentText(window._holdoutAnchors[${i}])"><span class="decision-label">Current:</span> "${esc(ctx.preview)}"</div>` : ''}
          <div class="convergence-suggestion">${esc(stripLineRefs(s.text))}</div>
          <div class="decision-options">
            <button class="decision-opt-btn" id="hopt-${i}-apply"
              onclick="selectHoldout(${i}, 'apply', ${total})">
              <span class="decision-opt-num decision-opt-num-apply">✓</span>
              <span class="decision-opt-text">Apply this suggestion</span>
            </button>
            <button class="decision-opt-btn decline-btn" id="hopt-${i}-decline"
              onclick="selectHoldout(${i}, 'decline', ${total})">
              <span class="decision-opt-num decision-opt-num-decline">✕</span>
              <span class="decision-opt-text">Decline — skip this one</span>
            </button>
            <button class="decision-opt-btn decision-opt-custom custom-btn" id="hopt-${i}-custom"
              onclick="selectHoldout(${i}, 'custom', ${total})">
              <span class="decision-opt-num decision-opt-num-custom">✎</span>
              <span class="decision-opt-text decision-opt-text-dim">Custom — type your own</span>
            </button>
          </div>
          <div class="decision-custom-wrap" id="hcustom-${i}" style="display:none">
            <textarea class="decision-custom-ta" id="hcustom-ta-${i}"
              placeholder="Type your custom text here..."
              oninput="updateHoldoutCustom(${i}, ${total})"></textarea>
          </div>
        </div>`;
      });

      html += `<button class="btn-apply-decisions" id="applyHoldoutsBtn"
        onclick="applyHoldouts()" disabled>
        ✅ Apply Selections &amp; Continue
      </button>`;
    }

    html += `<div class="convergence-footer">
      The hive is satisfied. Review each suggestion above — apply, decline, or customise individually. Or hit <strong>Finish</strong> to finalise the document as-is.
    </div>`;
    html += buildAppliedChangesHTML(latest);
    el.innerHTML = html;
    return;
  }

  // v3.56.5 — Only reset picks when the conflict SET genuinely changes (new
  // round / different decisions). This previously wiped _decisionChoices on
  // EVERY render — so locking one decision (which re-renders the panel) erased
  // your picks on the others AND dropped the locked decision out of the
  // apply-count, permanently disabling "Apply My Decisions". Guard the wipe with
  // a fingerprint of the current userDecisions.
  const _udFP = JSON.stringify((conflicts.userDecisions || [])
    .map(d => `${d.current || ''}|${d.question || ''}`));
  if (window._lastConflictFP !== _udFP) {
    window._decisionChoices = {};
    window._lastConflictFP  = _udFP;
  }
  window._decisionChoices    = window._decisionChoices || {};
  window._conflictCurrentTexts = {};

  // v3.56.5 — Re-hydrate locked decisions into _decisionChoices so a lock stays
  // counted (Apply lights up) and highlighted across re-renders. The lock lives
  // in _resolvedDecisions ({original, chosen}); map chosen → option index, else
  // treat as a custom override.
  (conflicts.userDecisions || []).forEach((d, di) => {
    if (window._decisionChoices[di] != null) return; // a pick this render wins
    const cur  = (d.current || '').trim();
    const lock = (window._resolvedDecisions || []).find(rd => (rd.original || '').trim() === cur);
    if (!lock) return;
    const oi = (d.options || []).findIndex(o => (o.text || '') === lock.chosen);
    window._decisionChoices[di] = (oi >= 0)
      ? { type: 'option', idx: oi }
      : { type: 'custom', text: lock.chosen || (d.current || '') };
  });

  let html = '';

  // Check for repeat offenders to show summary warning
  const repeats = (conflicts.userDecisions || [])
    .map(d => getLedgerEntry(d))
    .filter(e => e && e.count >= 3);
  if (repeats.length > 0) {
    html += `<div class="conflicts-section-header conflict-repeat-warning">
      🔁 ${repeats.length} conflict${repeats.length > 1 ? 's have' : ' has'} appeared 3+ times — resolve ${repeats.length > 1 ? 'them' : 'it'} to stop the loop
    </div>`;
  }

  // USER DECISION cards
  if (conflicts.userDecisions && conflicts.userDecisions.length > 0) {
    // v3.56.15 — Churn cards are synthetic USER DECISIONs the churn detector
    // injects when the hive keeps rewording one sentence. They get a distinct
    // banner + badge so the user understands why the card appeared (vs a
    // Builder-raised conflict), and the apply row defaults to Apply & Lock.
    const _hasChurn = conflicts.userDecisions.some(d => d._churn);
    if (_hasChurn) {
      html += `<div class="conflicts-section-header churn-warning">
        ⟳ Churn detected — the hive reworded the same text several rounds running with no real change. Lock a version to stop the loop.
      </div>`;
    }
    html += `<div class="conflicts-section-header user-decisions-header">
      ⚡ Your Input Needed — the Builder couldn't resolve these
    </div>`;
    conflicts.userDecisions.forEach((d, di) => {
      const total = conflicts.userDecisions.length;
      const isChurn = !!d._churn;
      const ledgerEntry = getLedgerEntry(d);
      const repeatCount = ledgerEntry ? ledgerEntry.count : 1;
      const isRepeat = repeatCount >= 2;
      const isHot = repeatCount >= 3;
      // v3.39.8 — Detect locked state for visual feedback. Matched by
      // original only (one lock per decision). If locked, card gets a
      // green tint and the lock button reads Unlock.
      const dCurrentTrim = (d.current || '').trim();
      const isLocked = dCurrentTrim && (window._resolvedDecisions || []).some(rd =>
        (rd.original || '').trim() === dCurrentTrim
      );
      // v3.56.15 — Churn cards show their own ⟳ badge instead of the repeat-
      // offender badge (a churn card is, by definition, freshly surfaced).
      const repeatBadge = (!isChurn && isRepeat)
        ? `<span class="conflict-repeat-badge ${isHot ? 'conflict-repeat-hot' : ''}">
            🔁 Seen ${repeatCount}x
           </span>`
        : '';
      const churnBadge = isChurn
        ? `<span class="conflict-repeat-badge conflict-repeat-hot">⟳ Reworded ${d._churnRounds || CHURN_WINDOW}×</span>`
        : '';
      const lockedBadge = isLocked
        ? `<span class="decision-locked-badge">🔒 LOCKED</span>`
        : '';
      const lockBtnLabel = isLocked ? '🔓 Unlock' : '🔒 Lock my selection';
      const lockBtnClass = isLocked ? 'decision-lock-btn decision-lock-btn-locked' : 'decision-lock-btn';
      const lockBtnTitle = isLocked
        ? 'Remove the lock so reviewers can suggest changes to this again'
        : 'Lock the selected option as a final decision — Builder and reviewers will not raise this conflict again or change the chosen text';
      const badgeLabel = isChurn ? `⟳ CHURN — pick a version` : `⚡ USER DECISION ${di + 1} of ${total}`;
      const cardClass = `decision-card${isChurn ? ' decision-card-churn' : ''}${isHot && !isChurn ? ' decision-card-hot' : ''}${isLocked ? ' decision-card-locked' : ''}`;
      // v3.56.15 — Pre-select the current (live) version of a churn sentence so
      // "Apply & Lock" is armed on first render: the common action is "lock
      // what's there now and move on." The user can still pick another round
      // or write a custom version. The current version is the option whose
      // text matches d.current (the detector puts it last).
      if (isChurn && window._decisionChoices[di] == null) {
        let _curIdx = (d.options || []).findIndex(o => (o.text || '').trim() === dCurrentTrim);
        if (_curIdx < 0 && d.options && d.options.length) _curIdx = d.options.length - 1;
        if (_curIdx >= 0) window._decisionChoices[di] = { type: 'option', idx: _curIdx };
      }
      const _preIdx = (isChurn && window._decisionChoices[di] && window._decisionChoices[di].type === 'option')
        ? window._decisionChoices[di].idx : -1;
      html += `<div class="${cardClass}${_preIdx >= 0 ? ' resolved' : ''}" id="dcard-${di}"
        data-option-texts="${esc(JSON.stringify(d.options.map(o => o.text || '')))}">
        <div class="decision-card-header">
          <span class="decision-badge">${badgeLabel}</span>
          ${churnBadge}
          ${repeatBadge}
          ${lockedBadge}
        </div>
        <div class="decision-question">${esc(stripLineRefs(d.question))}</div>
        ${d.current ? (() => { window._conflictCurrentTexts[di] = d.current; return `<div class="decision-current decision-current-clickable" title="Click to scroll document to this text" onclick="scrollToCurrentText(window._conflictCurrentTexts[${di}])"><span class="decision-label">Current:</span> "${esc(d.current)}"</div>`; })() : ''}
        <div class="decision-options">
          ${d.options.map((opt, oi) => `
            <button class="decision-opt-btn${oi === _preIdx ? ' selected' : ''}" id="dopt-${di}-${oi}"
              onclick="selectDecision(${di}, ${oi}, ${total})">
              <span class="decision-opt-num">${oi + 1}</span>
              <span class="decision-opt-text">"${esc(opt.text)}"</span>
              ${opt.ais ? `<span class="decision-opt-ais">${esc(opt.ais)}</span>` : ''}
            </button>`).join('')}
          <button class="decision-opt-btn decision-opt-custom" id="dopt-${di}-custom"
            onclick="selectCustomDecision(${di}, ${total})">
            <span class="decision-opt-num decision-opt-num-custom">✎</span>
            <span class="decision-opt-text decision-opt-text-dim">Custom — type your own</span>
          </button>
          ${isChurn ? '' : `<button class="decision-opt-btn decision-opt-bypass" id="dopt-${di}-bypass"
            onclick="selectBypassDecision(${di}, ${total})">
            <span class="decision-opt-num decision-opt-num-bypass">✏️</span>
            <span class="decision-opt-text decision-opt-text-dim">I edited the document directly — skip this conflict</span>
          </button>`}
        </div>
        <div class="decision-lock-row">
          <button class="${lockBtnClass}" onclick="lockConflictDecision(${di})" title="${lockBtnTitle}">
            ${lockBtnLabel}
          </button>
        </div>
        <div class="decision-custom-wrap" id="dcustom-${di}" style="display:none">
          <textarea class="decision-custom-ta" id="dcustom-ta-${di}"
            placeholder="Type your custom text here..."
            oninput="updateCustomDecision(${di}, ${total})">${esc(d.current || '')}</textarea>
        </div>
      </div>`;
    });

    // v3.56.15 — Apply row. With a churn card present the primary button reads
    // "🔒 Apply & Lock" (apply already pushes to _resolvedDecisions, so locking
    // is the default) and a de-emphasized "Apply without locking" escape hatch
    // appears for the rare case the user wants the hive to keep working it.
    if (_hasChurn) {
      const _preArmed = Object.keys(window._decisionChoices).length === conflicts.userDecisions.length;
      html += `<button class="btn-apply-decisions" id="applyDecisionsBtn" onclick="applyDecisions()" ${_preArmed ? '' : 'disabled'}>
        🔒 Apply &amp; Lock
      </button>
      <button class="btn-apply-nolock" id="applyNoLockBtn" onclick="applyDecisions({ noLock: true })" ${_preArmed ? '' : 'disabled'} title="Apply the chosen text but leave it unlocked — the hive may rework it again">
        Apply without locking
      </button>`;
    } else {
      html += `<button class="btn-apply-decisions" id="applyDecisionsBtn" onclick="applyDecisions()" disabled>
        ✅ Apply My Decisions to Document
      </button>`;
    }
  }

  // BUILDER DECISION entries (informational only)
  if (conflicts.builderDecisions && conflicts.builderDecisions.length > 0) {
    html += `<div class="builder-decisions-section">
      <div class="builder-decisions-title">🔨 Builder Decisions (applied automatically)</div>
      ${conflicts.builderDecisions.map(d =>
        `<div class="builder-decision-item">${esc(d)}</div>`
      ).join('')}
    </div>`;
  }

  // Fallback: raw text
  if (!html && conflicts.raw) {
    const hasUnparsedUD = /\[USER DECISION\]/i.test(conflicts.raw);
    const rawHtml = esc(conflicts.raw)
      .replace(/\[USER DECISION\]/g,    '<span class="raw-conflict-ud">[USER DECISION]</span>')
      .replace(/\[BUILDER DECISION\]/g, '<span class="raw-conflict-bd">[BUILDER DECISION]</span>');
    if (hasUnparsedUD) {
      // v3.39.4 — Diagnostic-aware banner. The validator records WHY each
      // decision was dropped; the most common cause for prefixed-AI work
      // sessions has been GPT-4o and Sonnet-3.7-as-Builder violating the
      // apply-and-flag rule. Instead of the generic "could not be parsed,
      // try again" (which doesn't tell the user what's wrong or how to
      // fix it), branch on the failure type and surface a real diagnosis.
      const failures = Array.isArray(conflicts.validationFailures) ? conflicts.validationFailures : [];
      const applyAndFlagCount = failures.filter(f => f.reason === 'apply_and_flag').length;
      const attributionStripCount = failures.filter(f => f.reason === 'attribution_strip').length;
      const builderName = (() => {
        if (!latest.builderId) return 'your Builder';
        const ai = (aiList || []).find(a => a.id === latest.builderId);
        return ai ? ai.name : 'your Builder';
      })();
      let bannerMsg;
      if (applyAndFlagCount > 0 && attributionStripCount === 0) {
        bannerMsg = `⚠️ <strong>${applyAndFlagCount} decision${applyAndFlagCount !== 1 ? 's' : ''} dropped — ${esc(builderName)} broke the apply-and-flag rule.</strong> The Builder silently applied changes to lines it also flagged as choices for you. The decisions are unusable because the original text is no longer in the document for you to replace. <strong>Try switching Builder to Claude-4-6-Opus and re-running the round</strong> — Opus follows this rule reliably. Raw output shown below for reference.`;
      } else if (attributionStripCount > 0 && applyAndFlagCount === 0) {
        bannerMsg = `⚠️ <strong>${attributionStripCount} decision${attributionStripCount !== 1 ? 's' : ''} dropped — ${esc(builderName)} attributed options to reviewers who didn't actually propose them.</strong> The Builder fabricated reviewer attributions on the conflict block. <strong>Try switching Builder to Claude-4-6-Opus and re-running the round</strong> — Opus attributes accurately. Raw output shown below for reference.`;
      } else if (applyAndFlagCount > 0 && attributionStripCount > 0) {
        bannerMsg = `⚠️ <strong>${applyAndFlagCount + attributionStripCount} decisions dropped — ${esc(builderName)} broke multiple Builder rules</strong> (apply-and-flag, fabricated attributions). The decisions are unusable. <strong>Try switching Builder to Claude-4-6-Opus and re-running the round</strong> — Opus follows the rules reliably. Raw output shown below for reference.`;
      } else {
        // No structured failures recorded — fall back to original copy
        bannerMsg = `⚠️ Conflicts detected but could not be parsed — shown below for reference. Try running the round again.`;
      }
      html = `<div class="conflicts-section-header conflict-repeat-warning">
          ${bannerMsg}
        </div>
        <div class="conflicts-body">${rawHtml}</div>`;
    } else {
      html = `<div class="conflicts-section-header builder-resolved-header">
          ✅ All conflicts were resolved by the Builder and applied to your document — no action needed.
        </div>
        <div class="conflicts-body">${rawHtml}</div>`;
    }
  }

  el.innerHTML = buildAppliedChangesHTML(latest) + html;
  hydrateDecisionSelections();
}

// v3.56.5 — After renderConflicts redraws the panel, re-apply the visual state
// of every resolved decision: highlight the chosen option, open the custom box
// if it was a custom answer, mark the card resolved, and re-light the Apply
// button. innerHTML rebuilds the DOM fresh each render, so without this the
// selected highlight is lost (the card went green but the picked option looked
// blank — the locked-but-unhighlighted bug) and the Apply gate never recomputes.
function hydrateDecisionSelections() {
  const latest    = history.length > 0 ? history[history.length - 1] : null;
  const decisions = latest?.conflicts?.userDecisions || [];
  const total     = decisions.length;
  if (!total) return;
  Object.keys(window._decisionChoices || {}).forEach(di => {
    const choice = window._decisionChoices[di];
    const card   = document.getElementById(`dcard-${di}`);
    if (!card || !choice) return;
    card.querySelectorAll('.decision-opt-btn').forEach(b => b.classList.remove('selected'));
    if (choice.type === 'option') {
      document.getElementById(`dopt-${di}-${choice.idx}`)?.classList.add('selected');
    } else if (choice.type === 'custom') {
      document.getElementById(`dopt-${di}-custom`)?.classList.add('selected');
      const wrap = document.getElementById(`dcustom-${di}`);
      const ta   = document.getElementById(`dcustom-ta-${di}`);
      if (wrap) wrap.style.display = 'block';
      if (ta && choice.text) { ta.value = choice.text; ta.dataset.userEdited = '1'; }
    } else if (choice.type === 'bypass') {
      document.getElementById(`dopt-${di}-bypass`)?.classList.add('selected');
    }
    card.classList.add('resolved');
  });
  checkAllDecisionsMade(total);
}

function selectDecision(decisionIdx, optionIdx, total) {
  window._decisionChoices[decisionIdx] = { type: 'option', idx: optionIdx };

  const card = document.getElementById(`dcard-${decisionIdx}`);
  if (card) {
    card.querySelectorAll('.decision-opt-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById(`dopt-${decisionIdx}-${optionIdx}`)?.classList.add('selected');
    // Hide custom input if visible
    const customWrap = document.getElementById(`dcustom-${decisionIdx}`);
    if (customWrap) customWrap.style.display = 'none';
    card.classList.add('resolved');
    // Store selected option text so Custom can pre-fill with it for easy editing
    const optText = card.querySelector(`#dopt-${decisionIdx}-${optionIdx} .decision-opt-text`);
    card.dataset.lastSelectedText = optText?.textContent?.replace(/^"|"$/g, '').trim() || '';
    // Clear userEdited flag so switching options always re-pre-fills the textarea
    const ta = document.getElementById(`dcustom-ta-${decisionIdx}`);
    if (ta) delete ta.dataset.userEdited;
  }

  // Auto-scroll to next unresolved card
  const nextCard = document.querySelector('.decision-card:not(.resolved)');
  if (nextCard) nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  checkAllDecisionsMade(total);
}

function selectCustomDecision(decisionIdx, total) {
  const card = document.getElementById(`dcard-${decisionIdx}`);
  if (card) {
    card.querySelectorAll('.decision-opt-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById(`dopt-${decisionIdx}-custom`)?.classList.add('selected');
    const customWrap = document.getElementById(`dcustom-${decisionIdx}`);
    if (customWrap) { customWrap.style.display = 'block'; }
    const ta = document.getElementById(`dcustom-ta-${decisionIdx}`);
    if (ta) {
      // Pre-fill with last selected option text, or first option text, never blank
      const lastSelected = card?.dataset.lastSelectedText;
      let prefill = lastSelected;
      if (!prefill) {
        try {
          const opts = JSON.parse(card?.dataset.optionTexts || '[]');
          prefill = opts[0] || '';
        } catch(e) {}
      }
      if (prefill && !ta.dataset.userEdited) {
        ta.value = prefill;
        ta.dataset.userEdited = '1';
      }
      ta.focus();
      // Move cursor to end
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }
  // Mark as custom but wait for text input before counting as complete
  const currentText = document.getElementById(`dcustom-ta-${decisionIdx}`)?.value.trim() || '';
  if (currentText) {
    window._decisionChoices[decisionIdx] = { type: 'custom', text: currentText };
    card?.classList.add('resolved');
  } else {
    delete window._decisionChoices[decisionIdx];
    card?.classList.remove('resolved');
  }
  checkAllDecisionsMade(total);
}

function selectBypassDecision(decisionIdx, total) {
  const card = document.getElementById(`dcard-${decisionIdx}`);
  const latest = history[history.length - 1];
  const decisions = latest?.conflicts?.userDecisions || [];
  const d = decisions[decisionIdx];
  if (card) {
    card.querySelectorAll('.decision-opt-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById(`dopt-${decisionIdx}-bypass`)?.classList.add('selected');
    const customWrap = document.getElementById(`dcustom-${decisionIdx}`);
    if (customWrap) customWrap.style.display = 'none';
    card.classList.add('resolved', 'bypassed');
  }
  // Store as bypass — applyDecisions will skip prompt injection but still lock it
  window._decisionChoices[decisionIdx] = { type: 'bypass', text: d?.current || '' };
  checkAllDecisionsMade(total);
}

function updateCustomDecision(decisionIdx, total) {
  const ta = document.getElementById(`dcustom-ta-${decisionIdx}`);
  const text = ta?.value.trim() || '';
  const card = document.getElementById(`dcard-${decisionIdx}`);
  if (text) {
    window._decisionChoices[decisionIdx] = { type: 'custom', text };
    card?.classList.add('resolved');
  } else {
    delete window._decisionChoices[decisionIdx];
    card?.classList.remove('resolved');
  }
  checkAllDecisionsMade(total);
}

function checkAllDecisionsMade(total) {
  const allMade = Object.keys(window._decisionChoices).length === total;
  const applyBtn = document.getElementById('applyDecisionsBtn');
  if (applyBtn) applyBtn.disabled = !allMade;
  // v3.56.15 — keep the churn "Apply without locking" escape hatch in sync.
  const nlBtn = document.getElementById('applyNoLockBtn');
  if (nlBtn) nlBtn.disabled = !allMade;
}

function applyDecisions(opts) {
  const _noLock = !!(opts && opts.noLock);
  const latest = history.length > 0 ? history[history.length - 1] : null;
  if (!latest?.conflicts?.userDecisions) return;

  // v3.56.15 — A churn decision is being resolved. Clear the pending flag so
  // the Auto chain (held by the _churnPending gate) can resume once the
  // Builder round this kicks off completes. If the user chose "apply without
  // locking", remember the sentence fingerprint for CHURN_WINDOW more rounds
  // so the detector doesn't immediately re-flag the same slot.
  if (window._churnPending) {
    window._churnPending = false;
    if (_noLock) {
      try {
        const churnD = latest.conflicts.userDecisions.find(d => d._churn);
        if (churnD && churnD.current) {
          window._churnDismissed = window._churnDismissed || {};
          window._churnDismissed[_churnFingerprint(churnD.current)] = round + CHURN_WINDOW;
        }
      } catch (e) { /* non-critical */ }
    }
  }

  const applyBtn = document.getElementById('applyDecisionsBtn');
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.textContent = '⏳ Sending to Builder…';
  }
  const nlBtn = document.getElementById('applyNoLockBtn');
  if (nlBtn) nlBtn.disabled = true;

  const decisions = latest.conflicts.userDecisions;
  const lines = [];

  Object.keys(window._decisionChoices).forEach(di => {
    const d = decisions[parseInt(di)];
    const choice = window._decisionChoices[di];
    if (!d || !choice) return;

    let chosenText = '';
    if (choice.type === 'option') {
      chosenText = d.options[choice.idx]?.text || '';
    } else if (choice.type === 'custom') {
      chosenText = choice.text;
    }
    // bypass type: skip prompt injection, but still lock in resolved decisions below

    if (d.current && chosenText) {
      lines.push(`Replace "${d.current}" with "${chosenText}"`);
    }
  });

  // If ALL decisions are bypassed, skip Builder call but still lock them
  const allBypassed = Object.keys(window._decisionChoices).length > 0 &&
    Object.values(window._decisionChoices).every(c => c.type === 'bypass');

  if (lines.length === 0 && !allBypassed) {
    if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = '✅ Apply My Decisions to Document'; }
    return;
  }

  // Update ledger NOW — user has committed their choices, this is the right time to count
  updateConflictLedger(decisions);

  // Record resolved decisions so the Builder won't re-raise them
  Object.keys(window._decisionChoices).forEach(di => {
    const d = decisions[parseInt(di)];
    const choice = window._decisionChoices[di];
    if (!d || !choice) return;
    let chosenText = '';
    if (choice.type === 'option') {
      chosenText = d.options[choice.idx]?.text || '';
    } else if (choice.type === 'custom') {
      chosenText = choice.text;
    } else if (choice.type === 'bypass') {
      chosenText = d.current || ''; // lock current text as-is
    }
    if (d.current && chosenText) {
      // v3.56.5 — Don't double-push a decision already locked via
      // lockConflictDecision (now re-hydrated into _decisionChoices).
      // v3.56.15 — "Apply without locking" on a churn card skips the push so
      // the sentence stays editable by the hive.
      const _alreadyResolved = window._resolvedDecisions.some(rd =>
        (rd.original || '').trim() === d.current.trim());
      if (!_alreadyResolved && !(_noLock && d._churn)) {
        window._resolvedDecisions.push({ original: d.current, chosen: chosenText });
        localStorage.setItem('waxframe_resolved_decisions', JSON.stringify(window._resolvedDecisions));
      }
      // Mark as suppressed in conflict ledger
      const fp = fingerprintConflict(d);
      const entry = window._conflictLedger.find(e => e.fingerprint === fp);
      if (entry) {
        entry.suppressed = true;
        try { localStorage.setItem('waxframe_conflict_ledger', JSON.stringify(window._conflictLedger)); } catch(e) { console.warn('[conflict-ledger:suppress] write failed:', e); }

        // If this conflict has been a repeat offender (3+), issue targeted per-AI warnings
        // to the AIs who kept suggesting the losing option
        if (entry.count >= 3) {
          // Find which AIs suggested options OTHER than the chosen one
          const losingOptions = d.options.filter(opt => opt.text !== chosenText && opt.ais);
          losingOptions.forEach(opt => {
            // opt.ais is a string like "Grok, DeepSeek"
            const aiNames = opt.ais.split(',').map(n => n.trim().toLowerCase());
            aiList.forEach(ai => {
              if (aiNames.includes(ai.name.toLowerCase())) {
                if (!window._aiWarnings[ai.id]) window._aiWarnings[ai.id] = [];
                // Only add if not already warned about this exact conflict
                const alreadyWarned = window._aiWarnings[ai.id].some(w => w.original === d.current);
                if (!alreadyWarned) {
                  window._aiWarnings[ai.id].push({ original: d.current, chosen: chosenText });
                  consoleLog(`⚠️ Targeted warning issued to ${ai.name} — repeatedly raised "${d.current}" after it was resolved`, 'warn');
                }
              }
            });
          });
          try { localStorage.setItem('waxframe_ai_warnings', JSON.stringify(window._aiWarnings)); } catch(e) { console.warn('[ai-warnings] write failed:', e); }
        }
      }
    }
  });

  const notesTa = document.getElementById('workNotes');
  if (notesTa) {
    notesTa.value = 'Apply these user decisions:\n' + lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
    saveSession();
  }

  toast('📋 Decisions queued — sending to Builder…');
  if (allBypassed) {
    if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = '✅ Apply My Decisions to Document'; }
    toast('✏️ All conflicts bypassed — document edits applied directly. Starting next round…');
    round++;
    updateRoundBadge();
    renderWorkPhaseBar();
    saveSession();
    playRosieSound();
    return;
  }
  runBuilderOnly();
}

// v3.39.0 — Lock a silently-applied change so reviewers stop suggesting
// further changes to that text and Builder treats it as final. Same
// downstream machinery as USER DECISION lock-in: pushes to
// window._resolvedDecisions (injected into every future Builder + reviewer
// prompt as "FINAL AND LOCKED") and adds a per-AI warning to every
// reviewer attributed as the source so they get a targeted "stop
// raising this" notice in their next prompt. No round fires; lock takes
// effect from the next Run Round.
// v3.39.2 — Toggles. If the change is already locked, this function
// REVERSES the lock: removes the text from _resolvedDecisions, removes
// the matching per-AI warnings, flips change.locked back to false.
// Closes the "oh I clicked it by accident" UX gap.
function lockAppliedChange(roundNum, idx) {
  const h = history.find(e => e.round === roundNum && Array.isArray(e.appliedChanges));
  if (!h) {
    consoleLog(`⚠️ lockAppliedChange: history entry for round ${roundNum} not found`, 'warn');
    return;
  }
  const change = h.appliedChanges[idx];
  if (!change) {
    consoleLog(`⚠️ lockAppliedChange: applied change ${idx} not found in round ${roundNum}`, 'warn');
    return;
  }
  const lockedText = (change.new || '').trim();
  if (!lockedText) {
    consoleLog(`⚠️ lockAppliedChange: empty NEW text — refusing to ${change.locked ? 'unlock' : 'lock'}`, 'warn');
    return;
  }
  const norm = (s) => (s || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim().toLowerCase();

  // ── UNLOCK BRANCH ──
  if (change.locked) {
    // Remove from resolved decisions (match by chosen text)
    window._resolvedDecisions = (window._resolvedDecisions || []).filter(rd =>
      (rd.chosen || '').trim() !== lockedText
    );
    try { localStorage.setItem('waxframe_resolved_decisions', JSON.stringify(window._resolvedDecisions)); } catch(e) { console.warn('[resolved] write failed:', e); }

    // Remove per-AI warnings (match by chosen text on each source AI)
    const sourceNames = (change.from || '').split(/,|\/| and | & /i).map(s => s.trim()).filter(Boolean);
    window._aiWarnings = window._aiWarnings || {};
    sourceNames.forEach(srcName => {
      const srcNorm = norm(srcName);
      const ai = (aiList || []).find(a => norm(a.name) === srcNorm || (a.name || '').toLowerCase() === srcName.toLowerCase());
      if (!ai || !window._aiWarnings[ai.id]) return;
      window._aiWarnings[ai.id] = window._aiWarnings[ai.id].filter(w =>
        (w.chosen || '').trim() !== lockedText
      );
      if (window._aiWarnings[ai.id].length === 0) delete window._aiWarnings[ai.id];
    });
    try { localStorage.setItem('waxframe_ai_warnings', JSON.stringify(window._aiWarnings)); } catch(e) { console.warn('[ai-warnings] write failed:', e); }

    change.locked = false;
    saveSession();
    renderConflicts();
    consoleLog(`🔓 Unlocked applied change — reviewers may revise this line again`, 'info');
    toast(`🔓 Unlocked — reviewers can revise this line again`);
    return;
  }

  // ── LOCK BRANCH ──
  // Push to resolved decisions — Builder + reviewer prompts both inject this
  window._resolvedDecisions = window._resolvedDecisions || [];
  const alreadyResolved = window._resolvedDecisions.some(rd =>
    (rd.chosen || '').trim() === lockedText
  );
  if (!alreadyResolved) {
    window._resolvedDecisions.push({ original: lockedText, chosen: lockedText });
    localStorage.setItem('waxframe_resolved_decisions', JSON.stringify(window._resolvedDecisions));
  }
  // Per-AI warnings for the source reviewer(s)
  const sourceNames = (change.from || '').split(/,|\/| and | & /i).map(s => s.trim()).filter(Boolean);
  window._aiWarnings = window._aiWarnings || {};
  sourceNames.forEach(srcName => {
    const srcNorm = norm(srcName);
    const ai = (aiList || []).find(a => norm(a.name) === srcNorm || (a.name || '').toLowerCase() === srcName.toLowerCase());
    if (!ai) return;
    if (!window._aiWarnings[ai.id]) window._aiWarnings[ai.id] = [];
    const dup = window._aiWarnings[ai.id].some(w => (w.chosen || '').trim() === lockedText);
    if (!dup) {
      window._aiWarnings[ai.id].push({ original: lockedText, chosen: lockedText });
      consoleLog(`🔒 Locked applied change — ${ai.name} will be told to stop revising this`, 'info');
    }
  });
  try { localStorage.setItem('waxframe_ai_warnings', JSON.stringify(window._aiWarnings)); } catch(e) { console.warn('[ai-warnings] write failed:', e); }
  change.locked = true;
  saveSession();
  renderConflicts();
  toast(`🔒 Locked — Builder and reviewers will leave this line alone`);
}


function selectHoldout(idx, choice, total) {
  window._holdoutChoices = window._holdoutChoices || {};
  window._holdoutChoices[idx] = { type: choice, text: '' };

  const card = document.getElementById(`hcard-${idx}`);
  if (card) {
    card.querySelectorAll('.decision-opt-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById(`hopt-${idx}-${choice}`)?.classList.add('selected');
    const customWrap = document.getElementById(`hcustom-${idx}`);
    if (customWrap) customWrap.style.display = choice === 'custom' ? 'block' : 'none';
    if (choice === 'decline') {
      card.classList.add('resolved', 'declined');
      card.classList.remove('custom-selected');
    } else if (choice === 'custom') {
      card.classList.add('custom-selected');
      card.classList.remove('resolved', 'declined');
    } else {
      card.classList.add('resolved');
      card.classList.remove('declined', 'custom-selected');
    }
  }

  // Auto-scroll to next unresolved
  const next = document.querySelector('.convergence-card:not(.resolved)');
  if (next) next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // If all holdouts are now resolved and everything is declined → auto-finish
  const allResolved = Object.keys(window._holdoutChoices).length === total;
  const allDeclined = allResolved && Object.values(window._holdoutChoices).every(c => c.type === 'decline');
  if (allDeclined) {
    setTimeout(() => showFinishModal(), 400);
    return;
  }

  checkAllHoldoutsDone(total);
}

function updateHoldoutCustom(idx, total) {
  const ta = document.getElementById(`hcustom-ta-${idx}`);
  const text = ta?.value.trim() || '';
  window._holdoutChoices = window._holdoutChoices || {};
  const card = document.getElementById(`hcard-${idx}`);
  if (text) {
    window._holdoutChoices[idx] = { type: 'custom', text };
    card?.classList.add('resolved');
  } else {
    if (window._holdoutChoices[idx]?.type === 'custom') delete window._holdoutChoices[idx];
    card?.classList.remove('resolved');
  }
  checkAllHoldoutsDone(total);
}

function checkAllHoldoutsDone(total) {
  const allDone = Object.keys(window._holdoutChoices || {}).length === total;
  const btn = document.getElementById('applyHoldoutsBtn');
  if (btn) btn.disabled = !allDone;
}

function applyHoldouts() {
  const suggestions = window._flatHoldoutSuggestions || [];
  const choices = window._holdoutChoices || {};
  const lines = [];

  Object.keys(choices).forEach(i => {
    const s = suggestions[parseInt(i)];
    const c = choices[i];
    if (!s || !c) return;
    if (c.type === 'decline') return; // skip declined
    const text = c.type === 'custom' ? c.text : s.text;
    if (text) lines.push(`From ${s.name}: ${text}`);
  });

  if (lines.length === 0) {
    // All declined — open finish modal
    window._holdoutChoices = {};
    showFinishModal();
    return;
  }

  const notesTa = document.getElementById('workNotes');
  if (notesTa) {
    notesTa.value = 'Apply these holdout suggestions:\n' + lines.map((l, i) => `${i+1}. ${l}`).join('\n');
    saveSession();
  }
  window._holdoutChoices = {};
  toast('📋 Sending to Builder…');
  runBuilderOnly();
}

function extractSummary(text) {
  // Get first meaningful line as summary
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  return first.length > 160 ? first.substring(0, 160) + '…' : first;
}

// ── ROUND HISTORY ──
function renderRoundHistory() {
  const el = document.getElementById('roundHistory');
  if (!el) return;
  if (history.length === 0) {
    el.innerHTML = '<div class="round-history-empty">No completed rounds yet. Each round is saved here automatically.</div>';
    return;
  }
  el.innerHTML = history.slice().reverse().map((h, ri) => {
    const idx = history.length - 1 - ri;
    const phaseLabel = PHASES.find(p => p.id === h.phase)?.label || h.phase || '';
    const wordCount = h.doc ? h.doc.trim().split(/\s+/).length : 0;
    const responseCount = Object.values(h.responses || {}).filter(Boolean).length;

    if (h.failed) {
      const failLabels = { bloat: 'Output too long', conflicts: 'Missing conflicts block', delimiters: 'Malformed output', api: 'API error', unknown: 'Unknown error' };
      const failLabel = failLabels[h.failReason] || 'Rejected';
      return `
      <div class="round-hist-item round-hist-item--failed">
        <div class="round-hist-hdr">
          <div class="round-hist-hdr-left">
            <span class="round-hist-badge round-hist-badge--failed">⚠️ Round ${h.round} — Failed</span>
            <span class="round-hist-meta">${h.label || phaseLabel} · ${h.timestamp}</span>
            <span class="round-hist-stats round-hist-stats--failed">${failLabel} · Document unchanged · API tokens consumed</span>
          </div>
        </div>
      </div>`;
    }

    return `
    <div class="round-hist-item">
      <div class="round-hist-hdr">
        <div class="round-hist-hdr-left">
          <span class="round-hist-badge">${h.round === 0 ? 'Original' : 'Round ' + h.round}</span>
          <span class="round-hist-meta">${h.label || phaseLabel} · ${h.timestamp}</span>
          <span class="round-hist-stats">${wordCount} words · ${responseCount} response${responseCount!==1?'s':''}</span>
        </div>
        <div class="round-hist-hdr-right">
          <button class="round-hist-view-btn" onclick="viewRoundDoc(${idx})">View Doc</button>
          <button class="round-hist-restore-btn" onclick="restoreRound(${idx})" title="Restore this version of the document">↩ Restore</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function showSmokerOverlay(label = "Smokin' the Hive…") {
  const overlay = document.getElementById('smokerOverlay');
  const labelEl = document.getElementById('smokerOverlayLabel');
  const particles = document.getElementById('smokeParticles');
  if (!overlay) return;

  if (labelEl) labelEl.textContent = label;

  // Generate smoke puffs — all originate from nozzle point, spread as they rise
  if (particles) {
    particles.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const puff = document.createElement('div');
      puff.className = 'smoke-puff';
      const size = 40 + Math.random() * 60;
      const offsetX = (Math.random() - 0.5) * 40; // spread direction
      puff.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: 50%;
        bottom: 0;
        margin-left: -${size/2}px;
        --ox: ${offsetX}px;
        --dur: ${1.8 + Math.random() * 2}s;
        --delay: ${Math.random() * 2.5}s;
      `;
      particles.appendChild(puff);
    }
  }

  overlay.classList.add('active');
  playSmokerSound();
}

function hideSmokerOverlay() {
  const overlay = document.getElementById('smokerOverlay');
  if (overlay) overlay.classList.remove('active');
}

function showBuilderOverlay() {
  const overlay = document.getElementById('builderOverlay');
  if (!overlay) return;

  // AI brand colors for blocks
  const brandColors = {
    chatgpt:    { border: 'rgba(16,163,127,0.6)',  bg: 'rgba(16,163,127,0.15)',  glow: 'rgba(16,163,127,0.3)'  },
    claude:     { border: 'rgba(210,140,80,0.6)',   bg: 'rgba(210,140,80,0.15)',   glow: 'rgba(210,140,80,0.3)'   },
    deepseek:   { border: 'rgba(77,138,255,0.6)',   bg: 'rgba(77,138,255,0.15)',   glow: 'rgba(77,138,255,0.3)'   },
    gemini:     { border: 'rgba(138,100,255,0.6)',  bg: 'rgba(138,100,255,0.15)',  glow: 'rgba(138,100,255,0.3)'  },
    grok:       { border: 'rgba(220,220,220,0.5)',  bg: 'rgba(220,220,220,0.10)',  glow: 'rgba(220,220,220,0.2)'  },
    perplexity: { border: 'rgba(32,210,210,0.6)',   bg: 'rgba(32,210,210,0.15)',   glow: 'rgba(32,210,210,0.3)'   },
  };

  const track = document.getElementById('builderBeltTrack');
  if (track) {
    track.innerHTML = '';
    const reviewers = activeAIs.filter(a => a.id !== builder);
    const ais = reviewers.length > 0 ? reviewers : [
      { id: 'chatgpt', name: 'ChatGPT', icon: 'images/icon-chatgpt.png' },
      { id: 'claude',  name: 'Claude',  icon: 'images/icon-claude.png'  },
      { id: 'gemini',  name: 'Gemini',  icon: 'images/icon-gemini.png'  },
      { id: 'deepseek',name: 'DeepSeek',icon: 'images/icon-deepseek.png'},
    ];
    const count = ais.length;
    // Cap visible blocks at 5 so they don't crowd at any viewport size.
    // Cycle through all AIs so everyone gets represented over time.
    const visible = ais.slice(0, 5);
    const dur = Math.max(10, visible.length * 3);
    visible.forEach((ai, i) => {
      const colors = brandColors[ai.id] || brandColors.deepseek;
      const block = document.createElement('div');
      block.className = 'builder-block';
      block.style.setProperty('--belt-dur', `${dur}s`);
      block.style.setProperty('--belt-delay', `${-(dur / visible.length) * i}s`);
      block.style.borderColor = colors.border;
      block.style.background = `linear-gradient(180deg, ${colors.bg}, rgba(0,0,0,0.2))`;
      block.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 14px rgba(0,0,0,0.4), 0 0 14px ${colors.glow}`;
      block.innerHTML = `
        ${resolveAiIcon(ai, 'builder-block-icon', 22)}
        <span class="builder-block-name">${ai.name}</span>
      `;
      track.appendChild(block);
    });
  }

  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('active');
  playBuilderSound();
}

function hideBuilderOverlay() {
  const overlay = document.getElementById('builderOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
}

function updateNotesBtnPriority() {
  const notes = document.getElementById('workNotes');
  const smokeBtn = document.getElementById('runRoundBtn');
  const builderBtn = document.getElementById('builderOnlyBtn');
  if (!notes || !smokeBtn || !builderBtn) return;
  const hasNotes = notes.value.trim().length > 0;
  if (hasNotes) {
    // Notes present — Send to Builder is the suggested action
    smokeBtn.classList.remove('footer-btn-smoke');
    smokeBtn.classList.add('footer-btn');
    builderBtn.classList.remove('footer-btn');
    builderBtn.classList.add('footer-btn-smoke');
  } else {
    // No notes — Smoke the Hive is the suggested action
    smokeBtn.classList.remove('footer-btn');
    smokeBtn.classList.add('footer-btn-smoke');
    builderBtn.classList.remove('footer-btn-smoke');
    builderBtn.classList.add('footer-btn');
  }
}

function openNotesModal() {
  // v3.36.17 — Auto-Mode safety: opening the Notes drawer while a
  // round is in flight AND Auto Mode is on is a strong signal of
  // manual intervention. We flip Auto OFF immediately so the
  // currently-running round completes naturally and then halts at
  // round-end (per _autoMaybeChainNextRound's _autoMode short-circuit).
  // The user can re-toggle Auto from the topbar pill once they're done
  // typing if they want to keep chaining. Kills the mid-stream typing
  // race that v3.36.14's freeze-at-Builder-fire only band-aided.
  const smokeBtn = document.getElementById('runRoundBtn');
  const isRoundRunning = smokeBtn?.classList.contains('running');
  if (window._autoMode && isRoundRunning) {
    window._autoMode             = false;
    window._autoCeilingTarget    = null;
    window._autoSatisfiedHist    = [];
    window._autoFailureStreak    = 0;
    window._autoChainDeferred    = null;
    if (typeof updateAutoToggleUI === 'function') updateAutoToggleUI();
    consoleLog(`🛑 Auto Mode paused — Notes drawer opened mid-round. Round will complete, then chain stops. Re-toggle Auto to resume.`, 'info');
    toast('🛑 Auto paused — opening Notes implies manual intervention', 4000);
  }
  const modal = document.getElementById('notesModal');
  if (modal) modal.classList.add('active');
  setTimeout(() => document.getElementById('workNotes')?.focus(), 100);
  // v3.35.4 — Bug B fix. Opening the Notes drawer is the user's
  // signal of intent to use Send to Builder this round. Force the
  // priority swap immediately so the bottom-bar buttons reflect that
  // intent the moment the drawer comes up — Send to Builder becomes
  // the highlighted/amber action, Smoke the Hive drops to outline-
  // only. Previously the swap only fired on closeNotesModal(), which
  // meant the buttons stayed in the wrong state for the entire time
  // the user was looking at the open drawer.
  const smokeBtn2  = document.getElementById('runRoundBtn');
  const builderBtn = document.getElementById('builderOnlyBtn');
  if (smokeBtn2 && builderBtn) {
    smokeBtn2.classList.remove('footer-btn-smoke');
    smokeBtn2.classList.add('footer-btn');
    builderBtn.classList.remove('footer-btn');
    builderBtn.classList.add('footer-btn-smoke');
  }
}

function closeNotesModal() {
  const modal = document.getElementById('notesModal');
  if (modal) modal.classList.remove('active');
  updateNotesBtnPriority();
}

// v3.36.18 — Toggle wrapper for the 📝 Notes button. Open if closed,
// close if already open. Delegates to the existing single-purpose
// helpers so the v3.36.17 Auto-pause guard inside openNotesModal()
// still fires when the user opens the drawer mid-running-round —
// only the OPEN path triggers it; the CLOSE path is a no-op for
// Auto Mode (Auto stays in whatever state the user left it).
function toggleNotesModal() {
  const modal = document.getElementById('notesModal');
  if (!modal) return;
  if (modal.classList.contains('active')) {
    closeNotesModal();
  } else {
    openNotesModal();
  }
}

function openRoundHistoryModal() {
  renderRoundHistory();
  const modal = document.getElementById('roundHistoryModal');
  if (modal) modal.classList.add('active');
}

function closeRoundHistoryModal() {
  const modal = document.getElementById('roundHistoryModal');
  if (modal) modal.classList.remove('active');
}

function viewRoundDoc(idx) {
  const h = history[idx];
  if (!h || !h.doc) { toast('No document saved for this round'); return; }
  const existing = document.getElementById('histDocModal');
  if (existing) existing.remove();

  // Build reviewer response tabs
  const responses = h.responses || {};
  const aiNames = Object.keys(responses);
  const hasResponses = aiNames.length > 0;

  // Look up friendly name for each AI id — fall back to capitalised id if not found
  const getFriendlyName = id => {
    const ai = activeAIs.find(a => a.id === id) || aiList.find(a => a.id === id);
    return ai ? ai.name : id.charAt(0).toUpperCase() + id.slice(1);
  };

  const tabButtons = hasResponses ? aiNames.map((id) =>
    `<button class="work-phase-pill hist-resp-tab" onclick="switchHistTab('${id}',this)">${esc(getFriendlyName(id))}</button>`
  ).join('') : '';

  const tabPanels = hasResponses ? aiNames.map((id) =>
    `<div class="hist-resp-panel" id="histresp-${id}">
      <textarea class="hist-doc-modal-ta" readonly>${esc(responses[id] || '(no response)')}</textarea>
    </div>`
  ).join('') : '';

  const modal = document.createElement('div');
  modal.id = 'histDocModal';
  modal.className = 'hist-doc-modal';
  modal.innerHTML = `
    <div class="hist-doc-modal-inner">
      <div class="hist-doc-modal-hdr">
        <span>Round ${h.round === 0 ? 'Original' : h.round} — ${PHASES.find(p=>p.id===h.phase)?.label||h.phase} · ${h.timestamp}</span>
        <div class="view-round-tab-row">
          <button class="btn btn-ghost btn-sm" onclick="copyActiveHistTab()">📋 Copy</button>
          <button class="btn btn-ghost btn-sm" onclick="restoreRound(${idx})">↩ Restore</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('histDocModal').remove()">✕ Close</button>
        </div>
      </div>
      <div class="view-round-tab-bar">
        <button class="work-phase-pill hist-resp-tab active" onclick="switchHistTab('__doc__',this)">📄 Document</button>
        <button class="work-phase-pill hist-resp-tab" onclick="switchHistTab('__notes__',this)">📝 Notes</button>
        ${tabButtons}
      </div>
      <div class="hist-resp-panel active" id="histresp-__doc__">
        <textarea id="histDocText" class="hist-doc-modal-ta" readonly>${esc(h.doc)}</textarea>
      </div>
      <div class="hist-resp-panel" id="histresp-__notes__"><textarea class="hist-doc-modal-ta" readonly>${esc(h.notes || '(no notes saved for this round)')}</textarea></div>
      ${tabPanels}
    </div>
  `;
  document.body.appendChild(modal);
}

function switchHistTab(id, btn) {
  const modal = document.getElementById('histDocModal');
  if (!modal) return;
  modal.querySelectorAll('.hist-resp-panel').forEach(p => p.classList.remove('active'));
  modal.querySelectorAll('.hist-resp-tab').forEach(b => b.classList.remove('active'));
  const panel = modal.querySelector(`#histresp-${id}`);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
}

function copyActiveHistTab() {
  const modal = document.getElementById('histDocModal');
  if (!modal) return;
  const active = modal.querySelector('.hist-resp-panel.active textarea');
  copyToClipboard(active?.value, 'Response');
}


function restoreRound(idx) {
  const h = history[idx];
  if (!h) return;

  // Truncate history to this point — rounds after idx are discarded.
  // Prevents duplicate round numbers if the user runs a new round after restoring.
  history = history.slice(0, idx + 1);

  round = h.round;
  phase = h.phase || 'draft';
  docText = h.doc || '';

  // Restore resolved decisions to the state they were in at this round.
  // Decisions made in discarded rounds must not carry forward.
  window._resolvedDecisions = Array.isArray(h.resolvedDecisions) ? JSON.parse(JSON.stringify(h.resolvedDecisions)) : [];
  localStorage.setItem('waxframe_resolved_decisions', JSON.stringify(window._resolvedDecisions));
  const docTa = document.getElementById('workDocument');
  if (docTa) { docTa.value = docText; updateLineNumbers(); }
  const notesEl = document.getElementById('workNotes');
  if (notesEl) notesEl.value = h.notes || '';
  const ps = document.getElementById('phaseSelect');
  if (ps) ps.value = phase;
  updateRoundBadge();
  renderRoundHistory();
  renderWorkPhaseBar();
  renderConflicts();
  saveSession();
  // Close any open history modals
  closeRoundHistoryModal();
  const viewModal = document.getElementById('histDocModal');
  if (viewModal) viewModal.remove();
  toast(`↩ Restored to Round ${h.round} — ${history.length - 1} later round${history.length - 1 !== 1 ? 's' : ''} discarded`);
}

// ── EXPORT ──
function updateMaskPreview() {
  const preview = document.getElementById('exportMaskPreview');
  if (!preview) return;
  const name    = document.getElementById('projectName')?.value.trim()    || 'ProjectName';
  const ver     = document.getElementById('projectVersion')?.value.trim() || 'v1';
  const mask    = document.getElementById('exportMask')?.value.trim()     || '';
  const safeName = name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const safeVer  = ver.replace(/[^a-z0-9._-]/gi, '');
  let result;
  if (mask) {
    result = mask
      .replace(/\{name\}/gi, safeName)
      .replace(/\{version\}/gi, safeVer || 'v1');
  } else {
    result = safeVer ? `${safeName}_${safeVer}` : safeName;
  }
  preview.textContent = result ? `→ ${result}.txt` : '';
}

function buildExportName() {
  const name    = document.getElementById('workProjectName')?.textContent?.trim() || 'document';
  const ver     = document.getElementById('workProjectVersion')?.textContent?.trim() || '';
  const mask    = (document.getElementById('exportMask')?.value?.trim()) ||
                  ((() => { try { return JSON.parse(localStorage.getItem(LS_PROJECT) || '{}').exportMask || ''; } catch(e) { return ''; } })());
  const safeName = name.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const safeVer  = ver.replace(/[^a-z0-9._-]/gi, '');
  if (mask) {
    return mask
      .replace(/\{name\}/gi, safeName)
      .replace(/\{version\}/gi, safeVer || 'v1')
      .replace(/[^a-z0-9._\-{}]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return safeVer ? `${safeName}-${safeVer}` : safeName;
}

function exportDocument() {
  const docRaw = document.getElementById('workDocument')?.value?.trim();
  if (!docRaw) { toast('⚠️ Nothing to export yet'); return; }

  // v3.50.0 — Strip any pre-existing WaxFrame footer before appending the
  // new one. Scenario: user takes an exported document (with footer) and
  // pastes it as the Starting Document for a new project (common with
  // the platform review templates — Trim to TripAdvisor / Google Maps,
  // Rewrite as Yelp — which are designed to operate on a previously-
  // finished review). Without this strip, exporting the refined document
  // would produce two stacked footers — the original from the prior
  // export and the new one for this run.
  //
  // v3.52.1 — Dynamic verb: "Crafted" for scratch-path sessions (hive
  // built the doc from a goal alone), "Refined" for upload/paste paths
  // (hive improved an existing draft). docTab is the most reliable
  // signal — saved on every tab switch, persists across reloads. The
  // strip regex below accepts all three verbs (legacy "Produced" plus
  // new "Crafted"/"Refined") so old exported docs still get their
  // footer stripped cleanly on re-export.
  //
  // Footer format is stable: an optional "---" separator (variants accepted
  // for safety) followed by "(Produced|Crafted|Refined) by WaxFrame ..."
  // and the URL line. The regex tolerates leading whitespace, optional
  // separator forms (---, ━━, em-dashes), and version-string variations.
  const FOOTER_RE = /\n*(?:[-–—━]{2,}\s*\n)?(?:Produced|Crafted|Refined) by WaxFrame v?[\d.]+(?: Pro)? in \d+ rounds? and (?:\d+ minutes?|less than a minute)\.\s*\nweirdave\.github\.io\/WaxFrame-Professional\s*$/i;
  const doc = docRaw.replace(FOOTER_RE, '').trimEnd();

  const totalRounds = round - 1;
  const totalMins   = Math.round(_projClockSeconds / 60);
  const timeStr     = totalMins < 1 ? 'less than a minute' : `${totalMins} minute${totalMins !== 1 ? 's' : ''}`;
  const verb        = (docTab === 'scratch') ? 'Crafted' : 'Refined';
  const byline      = `\n\n---\n${verb} by WaxFrame ${APP_VERSION} in ${totalRounds} round${totalRounds !== 1 ? 's' : ''} and ${timeStr}.\nweirdave.github.io/WaxFrame-Professional`;

  const out      = doc + byline;
  const filename = buildExportName();
  const blob     = new Blob([out], { type: 'text/plain' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // v3.32.9 — Defer URL.revokeObjectURL by 30 seconds to avoid the same race
  // condition fixed in backupSession() under v3.21.19/v3.21.21. Synchronous
  // revoke after a.click() can yank the blob URL before the browser dispatcher
  // has finished writing the file, producing a 0-byte file followed by a retry
  // with " (1)" appended to the filename. 30 seconds is the same margin used
  // by backupSession; document blobs are typically small but the math is
  // identical and the memory cost of an unrevoked blob URL for 30s is trivial.
  setTimeout(() => URL.revokeObjectURL(url), 30000);

  toast('💾 Document exported');
  window._finishExported = true;
  document.dispatchEvent(new CustomEvent('waxframe:exported', { detail: { kind: 'document' } }));
}

function exportTranscript() {
  const name    = document.getElementById('projectName')?.value.trim()    || 'AI-Hive';
  const version = document.getElementById('projectVersion')?.value.trim() || '';
  const doc     = document.getElementById('workDocument')?.value.trim()   || '';
  const filename = buildExportName();
  const eq  = '═'.repeat(60);
  const sep = '─'.repeat(60);

  if (history.length === 0 && !doc) { toast('⚠️ Nothing to export'); return; }

  const totalRounds = round - 1;
  const totalMins   = Math.round(_projClockSeconds / 60);
  const timeStr     = totalMins < 1 ? 'less than a minute' : `${totalMins} minute${totalMins !== 1 ? 's' : ''}`;

  // ── HEADER ──
  let out = `${eq}\nWAXFRAME — SESSION TRANSCRIPT\nVersion: ${APP_VERSION}\nBuild: ${BUILD}\nProject: ${name}${version ? ` (${version})` : ''}\nRounds completed: ${totalRounds}\nSession duration: ${timeStr}\nExported: ${new Date().toLocaleString()}\n${eq}\n\n`;

  // ── PROJECT SETUP — read live values from Project screen fields ──
  const projDocType  = document.getElementById('goalDocType')?.value.trim()  || '(blank)';
  const projAudience = document.getElementById('goalAudience')?.value.trim() || '(blank)';
  const projOutcome  = document.getElementById('goalOutcome')?.value.trim()  || '(blank)';
  const projScope    = document.getElementById('goalScope')?.value.trim()    || '(blank)';
  const projTone     = document.getElementById('goalTone')?.value.trim()     || '(blank)';
  const projNotes    = document.getElementById('goalNotes')?.value.trim()    || '(blank)';
  const lengthLimit  = document.getElementById('lengthLimit')?.value.trim()     || '';
  const lengthUnit   = document.getElementById('lengthUnit')?.value             || 'words';
  const lengthStr    = lengthLimit ? `${lengthLimit} ${lengthUnit}` : '(no limit)';
  out += `PROJECT SETUP\n${sep}\n`;
  out += `Document type:    ${projDocType}\n`;
  out += `Target audience:  ${projAudience}\n`;
  out += `Desired outcome:  ${projOutcome}\n`;
  out += `Scope:            ${projScope}\n`;
  out += `Tone & voice:     ${projTone}\n`;
  out += `Notes:            ${projNotes}\n`;
  out += `Length limit:     ${lengthStr}\n\n`;

  // ── HIVE COMPOSITION ──
  // v3.36.21 — Reviewer list reads from window.sessionAIs (the per-
  // session toggle Set) instead of activeAIs (the full configured
  // hive). Without this, the transcript header said e.g. "Reviewers
  // (6 of 7 total): ..." when the user only had 3 of the 7 toggled
  // on for the session. The actual round behavior was correct
  // (sessionAIs governs runRound's reviewer fan-out); only the
  // export header was lying.
  // Defensive fallback: if sessionAIs is not yet a Set (pre-init or
  // some edge case), fall back to the full activeAIs list so the
  // header is at least populated rather than empty.
  out += `HIVE COMPOSITION\n${sep}\n`;
  const builderAI = (typeof builder !== 'undefined' && builder)
    ? (activeAIs.find(a => a.id === builder) || { id: builder, name: builder, model: '?' })
    : null;
  if (builderAI) {
    // v3.52.7 — Simplified from `builderAI.model || MODEL_LABELS[builderAI.id] || ''`.
    // The MODEL_LABELS fallback was broken-shaped: MODEL_LABELS is keyed
    // by model id (e.g. 'gemini-2.5-flash'), but `builderAI.id` is the
    // AI id (e.g. 'gemini'), so the lookup always returned undefined.
    // Removed the dead branch; matches the reviewer block below (L13547)
    // which has always used the bare `a.model || ''` pattern.
    const builderModel = builderAI.model || '';
    out += `Builder: ${builderAI.name}${builderModel ? ` (model: ${builderModel})` : ''}\n`;
  } else {
    out += `Builder: (not set)\n`;
  }
  const _sessionSet = (window.sessionAIs instanceof Set)
    ? window.sessionAIs
    : new Set((activeAIs || []).map(a => a.id));
  const _activeForSession = (activeAIs || []).filter(a => _sessionSet.has(a.id));
  const reviewers = _activeForSession.filter(a => a.id !== builder);
  out += `Reviewers (${reviewers.length} of ${_activeForSession.length} total):\n`;
  reviewers.forEach(a => {
    const m = a.model || '';
    out += `  • ${a.name}${m ? ` (model: ${m})` : ''}\n`;
  });
  out += `\n`;

  // ── REFERENCE MATERIAL — only if any docs are loaded ──
  const refSnap = (typeof snapshotReferenceDocs === 'function') ? snapshotReferenceDocs() : [];
  if (Array.isArray(refSnap) && refSnap.length > 0) {
    out += `REFERENCE MATERIAL\n${sep}\n`;
    const totalChars = refSnap.reduce((sum, r) => sum + (r.text?.length || 0), 0);
    out += `${refSnap.length} reference document${refSnap.length !== 1 ? 's' : ''} totaling ${totalChars.toLocaleString()} characters\n\n`;
    refSnap.forEach((r, i) => {
      out += `[${i + 1}] ${r.name || `Reference ${i + 1}`} (${(r.text?.length || 0).toLocaleString()} chars)\n`;
      if (r.text) {
        out += `${sep}\n${r.text}\n${sep}\n\n`;
      }
    });
  }

  // ── ROUND-BY-ROUND PLAYBACK ──
  const failLabels = { bloat: 'Output too long — Builder expanded document beyond allowed limit', conflicts: 'Missing conflicts block — Builder response rejected', delimiters: 'Malformed output — Builder response could not be parsed', api: 'API error', unknown: 'Unknown error' };
  const outcomeLabels = {
    setup:                   '📋 Initial document captured — round 0',
    continuing:              '↻ Round complete — hive will continue next round',
    unanimous_convergence:   '🏁 Unanimous convergence — all AIs satisfied',
    majority_convergence:    '🏁 Majority convergence — engine triggered, holdouts present',
    builder_only_complete:   '⚙️ Builder-only round complete',
    builder_only_failed:     '⚠️ Builder-only round failed',
    round_failed:            '⚠️ Round failed — document not updated'
  };

  if (history.length === 0) {
    out += `(No rounds recorded — document exported as-is)\n\n`;
  } else {
    history.forEach(h => {
      const phaseLabel = PHASES.find(p => p.id === h.phase)?.label || h.phase || '';
      if (h.failed) {
        const roundLabel = `Round ${h.round} — FAILED / NOT SAVED`;
        out += `${eq}\n${roundLabel} — ${h.timestamp}\n`;
        if (h.outcome && outcomeLabels[h.outcome]) out += `OUTCOME: ${outcomeLabels[h.outcome]}\n`;
        out += `${eq}\n\n`;
        out += `RESULT: Round rejected — document was not updated\n`;
        out += `REASON: ${failLabels[h.failReason] || h.failReason}\n`;
        if (h.failDetails) out += `DETAILS: ${h.failDetails}\n`;
        out += `NOTE: API tokens were consumed for this attempt\n\n`;
        Object.keys(h.responses || {}).forEach(id => {
          if (h.responses[id]) {
            const ai = activeAIs.find(a => a.id === id);
            out += `${(ai ? ai.name : id).toUpperCase()} (Reviewer):\n${sep}\n${h.responses[id]}\n\n`;
          }
        });
        return;
      }
      const roundLabel = h.round === 0 ? 'Original Document' : (h.label || `Round ${h.round} · ${phaseLabel}`);
      out += `${eq}\n${roundLabel} — ${h.timestamp}\n`;
      if (h.outcome && outcomeLabels[h.outcome] && h.round !== 0) out += `OUTCOME: ${outcomeLabels[h.outcome]}\n`;
      // Per-round Builder identity (in case Builder was changed mid-session)
      if (h.builderId && h.round !== 0) {
        const rb = activeAIs.find(a => a.id === h.builderId);
        if (rb) out += `BUILDER: ${rb.name}\n`;
      }
      out += `${eq}\n\n`;
      if (h.doc) out += `DOCUMENT:\n${sep}\n${h.doc}\n\n`;
      // v3.36.14 — Per-round notes emission. h.notes is the frozen
      // drawer value at Builder-call time (runRound) or top-of-function
      // time (runBuilderOnly). Always present in records since v3.36.14;
      // older history entries without it just emit nothing. Round 0
      // (initial document) has no notes by definition.
      if (h.notes && h.round !== 0) {
        out += `BUILDER NOTES (used by Builder this round):\n${sep}\n${h.notes}\n\n`;
      }
      Object.keys(h.responses || {}).forEach(id => {
        if (h.responses[id]) {
          const ai = activeAIs.find(a => a.id === id);
          out += `${(ai ? ai.name : id).toUpperCase()}:\n${sep}\n${h.responses[id]}\n\n`;
        }
      });
    });
  }

  // ── FINAL DOCUMENT + FOOTER ──
  if (doc) {
    out += `${eq}\nFINAL DOCUMENT\n${eq}\n\n${doc}\n\n`;
    // Determine final outcome from the last non-empty history entry's outcome field.
    let finalOutcome = '';
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].outcome && history[i].outcome !== 'setup') {
        finalOutcome = outcomeLabels[history[i].outcome] || history[i].outcome;
        break;
      }
    }
    // v3.52.1 — Dynamic verb matches exportDocument's logic. Scratch
    // = "Crafted", upload/paste = "Refined". Same rationale as the
    // document-export site.
    const transcriptVerb = (docTab === 'scratch') ? 'Crafted' : 'Refined';
    out += `${sep}\n${transcriptVerb} by WaxFrame ${APP_VERSION} in ${totalRounds} round${totalRounds !== 1 ? 's' : ''} and ${timeStr}.\n`;
    if (finalOutcome) out += `Final outcome: ${finalOutcome}\n`;
    out += `weirdave.github.io/WaxFrame-Professional\n`;
  }

  const blob = new Blob([out], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  // v3.36.8 — Append rounds-completed + local-time stamp to transcript
  // filename so multiple transcripts from the same project don't collide
  // and David can tell at a glance which round each snapshot captured.
  // Mirrors the YYYYMMDD-HHmm local-time format used by backupSession
  // (line ~14470). Documents (exportDocument) are intentionally NOT
  // stamped — the document is the final deliverable and overwrite-by-
  // default is correct there. Transcripts are progress records: you
  // may want round-5 and round-10 snapshots side-by-side.
  const totalRoundsForName = Math.max(0, round - 1);
  const _td = new Date();
  const _pad = n => String(n).padStart(2, '0');
  const _stamp = `${_td.getFullYear()}${_pad(_td.getMonth()+1)}${_pad(_td.getDate())}-${_pad(_td.getHours())}${_pad(_td.getMinutes())}`;
  a.href = url; a.download = `${filename}-r${totalRoundsForName}-${_stamp}-Transcript.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // v3.32.9 — Defer URL.revokeObjectURL by 30 seconds to match the backup
  // export fix from v3.21.19/v3.21.21. Transcripts hit this race the hardest
  // — full multi-round transcripts with verbose reviewer responses (Perplexity
  // can emit 3000+ word responses per round) easily exceed the threshold that
  // surfaced the original backup race. Symptom is a 0-byte file followed by
  // a retry with " (1)" appended to the filename. Synchronous revoke after
  // a.click() yanks the blob URL before the browser dispatcher has finished
  // writing the file. 30 seconds is the same margin used elsewhere; memory
  // cost of an unrevoked blob URL for 30s is trivial compared to the size of
  // the transcript itself.
  setTimeout(() => URL.revokeObjectURL(url), 30000);

  toast('💾 Full transcript exported');
  window._finishExported = true;
  document.dispatchEvent(new CustomEvent('waxframe:exported', { detail: { kind: 'transcript' } }));
}

// ── BACKUP + RESTORE (extracted) ──
// v3.48.0 — backupSession + importSession moved to js/storage.js.
// Completes the storage.js migration — all WaxFrame state persistence
// now lives in one file. HTML onclick handlers in index.html (Backup
// Session + Import Backup nav menu items) continue to work via
// function-declaration hoisting to window.


function copyDocument() {
  copyToClipboard(document.getElementById('workDocument')?.value, 'Document');
}

async function clearDocument() {
  // v3.52.8 — native confirm() → wfConfirm() migration. Function made
  // async (called only from index.html "✕ Clear" button onclick; browsers
  // don't await onclick return values, so async is safe).
  const ok = await wfConfirm(
    'Clear working document?',
    'Clear the working document?',
    { okText: 'Clear', destructive: true }
  );
  if (!ok) return;
  const docTa = document.getElementById('workDocument');
  if (docTa) { docTa.value = ''; updateLineNumbers(); }
  docText = '';
  saveSession();
}

// ── THEME ──
// v3.41.0 — Moved to js/theme.js as single source of truth. setTheme and
// initTheme live there; theme.js auto-inits at module-eval time so the
// theme attribute is set before the body parses. No initTheme() call
// needed here.

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  // v3.41.0 — initTheme() removed. theme.js auto-inits on load.
  loadSettings(); // always load hive (AI keys) silently
  // v3.30.2 — grandfather in any pre-v3.30 custom AIs that don't have
  // _originalModel captured. Must run AFTER loadSettings so the loaded
  // hive is in memory. Defaults snapshot at module-eval time, so this
  // call only catches user-added customs.
  ensureOriginalModelBaseline();
  // v3.32.10 — one-time clear of pre-v3.32.10 single-pick recommendation
  // caches. New role-suffixed format is incompatible with old cache shape,
  // so we wipe legacy keys to force a clean re-recommend. Silent — no toast.
  migrateRecommendationCachesV33210();
  // v3.41.0 — initMuteBtn() removed. theme.js auto-fires _updateMuteBtn
  // on DOMContentLoaded; since theme.js loads before app.js, theme.js's
  // listener fires first when DOMContentLoaded triggers.

  // v3.35.2 — restoreAutoModePreference() call removed. Auto-mode no
  // longer persists across reloads; the toggle pill always boots in
  // the OFF state. updateAutoToggleUI in the post-loadSession refresh
  // path keeps the counter accurate when Auto is engaged mid-session.

  // v3.26.1 — silently migrate any default AI with a saved key but no
  // cached recommendation to a live-recommend model. Runs once per session.
  // Deferred to setTimeout so the initial UI paint isn't blocked while we
  // hit external APIs in parallel.
  setTimeout(() => { migrateRecommendOnStartup(); }, 1500);

  // v3.40.0 — Deprecation watchdog. Run on app load (3s deferred so the
  // initial paint and migrateRecommendOnStartup both have breathing room),
  // and again every time the tab becomes visible. See detectDeprecatedModels
  // for the cost-assumption note about why this is unthrottled.
  setTimeout(() => { detectDeprecatedModels('load'); }, 3000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      detectDeprecatedModels('visible');
    }
  });

  // Stamp version and build number into UI — APP_VERSION comes from version.js
  document.querySelectorAll('.app-version-stamp').forEach(el => el.textContent = APP_VERSION);
  document.title = 'WaxFrame ' + APP_VERSION;
  const buildEl = document.getElementById('aboutBuild');
  if (buildEl) buildEl.textContent = BUILD;
  updateSetupRequirements();

  // Initial reference cards render — paints the empty state on Setup 4
  // and the work drawer immediately. loadProject() may overwrite this with
  // restored docs a moment later; that's fine, the render is idempotent.
  if (typeof renderReferenceCards === 'function') renderReferenceCards();
  if (typeof updateRefGrandTotals === 'function') updateRefGrandTotals();

  // Request persistent storage from the browser. Without this, IndexedDB
  // session data (round history, document, console) is "best-effort" and
  // the browser may evict it under storage pressure, after long inactivity,
  // or when the user runs "Clear browsing data". Chrome grants persistence
  // automatically based on engagement signals (bookmarked, frequently
  // visited, PWA-installed); other browsers vary. The call is idempotent
  // and harmless if denied — we still operate normally on best-effort
  // storage. The result is stashed on window for diagnostics.
  if (navigator.storage?.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      window._storagePersistent = isPersisted ? true : await navigator.storage.persist();
    } catch(e) {
      window._storagePersistent = null;
    }
  }

  // Capture pristine innerHTML of Finish modal export buttons so clearProject()
  // can restore them to this state after a session boundary. Without this, a
  // previous session's "✅ Exported!" / done styling carries over to the next
  // session because exportDocument and exportTranscript dispatch a
  // waxframe:exported event that overwrites button innerHTML when the Finish
  // modal is active.
  ['finishBtnDoc', 'finishBtnTranscript'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn && !btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
  });

  // Finish modal owns its own reaction to exports. The exporters dispatch
  // waxframe:exported and this listener decides whether to mark the matching
  // Finish modal button done — only if the modal is currently active. Work-
  // screen and quota-warn buttons fire the same exporters but the modal is
  // closed at that point, so this is a no-op for them.
  document.addEventListener('waxframe:exported', (e) => {
    const modal = document.getElementById('finishModal');
    if (!modal || !modal.classList.contains('active')) return;
    const kind = e.detail?.kind;
    if (kind === 'document') {
      const btn = document.getElementById('finishBtnDoc');
      if (btn) {
        btn.textContent = '✅ Exported!';
        btn.disabled = true;
        btn.classList.add('finish-modal-btn-done');
        // v3.35.1 — Stamp the history length at export time. showFinishModal
        // re-enables the button if more rounds have run since this snapshot,
        // because the document content has grown and there's something new
        // to export. Without this stamp the button stayed disabled for the
        // rest of the session even after dozens of additional rounds.
        btn.dataset.exportedHistoryLen = String(history.length);
      }
    } else if (kind === 'transcript') {
      const btn = document.getElementById('finishBtnTranscript');
      if (btn) {
        btn.textContent = '✅ Transcript exported!';
        btn.disabled = true;
        btn.classList.add('finish-modal-btn-done');
        // v3.35.1 — Same as document path; transcript also grows with
        // every additional round so we let the user re-export when new
        // content exists.
        btn.dataset.exportedHistoryLen = String(history.length);
      }
    }
  });

  // Show dev toolbar and admin nav items if dev mode is active
  if (localStorage.getItem('waxframe_dev') === '1') {
    const navDevSection = document.getElementById('navDevSection');
    if (navDevSection) navDevSection.classList.add('active');
    const tb = document.getElementById('devToolbar');
    if (tb) {
      tb.style.display = 'flex';
      // Restore saved position
      const savedPos = JSON.parse(localStorage.getItem('waxframe_dev_toolbar_pos') || 'null');
      if (savedPos) {
        tb.style.top  = savedPos.top  + 'px';
        tb.style.left = savedPos.left + 'px';
        tb.style.right = 'auto';
      }
      attachDevToolbarDrag();
    }
  }

  const hasSession = await loadSession();

  // Only resume project if there's actually a project name saved
  let projectName = '';
  try {
    const proj = JSON.parse(localStorage.getItem(LS_PROJECT) || '{}');
    projectName = proj.projectName || '';
  } catch(e) {}

  if (hasSession && (docText || history.length > 0)) {
    // Active session — resume work screen
    goToScreen('screen-work');
    initWorkScreen();
    // Console HTML is already restored by loadSession — no second IDB read needed
    _projClockRender();
    projectClockStart();
  } else if (projectName) {
    // Named project in progress — resume at document screen
    goToScreen('screen-document');
  } else {
    // Fresh start — always show welcome screen
    goToScreen('screen-welcome');
  }

  // Render API setup if starting on bees screen
  if (document.getElementById('screen-bees')?.classList.contains('active')) {
    if (activeAIs.length === 0) activeAIs = [...aiList];
    renderAISetupGrid();
  }

  // If loadSession detected eviction (session_exists flag was set but no
  // data was recoverable), the browser silently wiped the user's IndexedDB
  // store between visits. Surface this loudly so the user knows their work
  // wasn't lost by WaxFrame, and so it doesn't happen silently again.
  // Persist status (from earlier in this handler) determines remediation:
  // if persistence is now granted, the loss should not recur; if denied,
  // the user needs to take action (bookmark, visit more often, export).
  if (window._sessionEvicted) {
    const persistOK = window._storagePersistent === true;
    const remediation = persistOK
      ? 'Persistent storage is now granted — this should not happen again on this browser.'
      : 'The browser has not granted persistent storage. Bookmark this site, visit it regularly, and export transcripts after each session to be safe.';
    toast(`⚠️ Browser cleared your saved WaxFrame session. This was the browser, not WaxFrame. ${remediation}`, 18000);
    console.warn('[WaxFrame] Session eviction detected on load. Previous IndexedDB store was wiped by the browser between visits. Persistent storage status:', window._storagePersistent);
  }
});
