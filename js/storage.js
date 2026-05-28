// ============================================================
//  WaxFrame — storage.js
//  Build: 20260527-023
//
//  COMPLETE storage layer. All WaxFrame state persistence lives
//  here as of v3.48.0:
//    • Primitives (v3.45.0): LS_* keys, IDB helpers, checkStorageQuota
//    • Session persistence (v3.46.0): saveSession, loadSession,
//      _saveSessionChain
//    • Settings persistence (v3.47.0): saveHive, saveProject,
//      loadSettings, snapshotReferenceDocs
//    • Backup + restore (v3.48.0): backupSession, importSession
//
//  Contents:
//    LS_HIVE, LS_PROJECT, LS_SESSION, LS_SETTINGS, LS_LICENSE
//                          — localStorage key constants. Top-level
//                            consts — accessible cross-script via
//                            global lexical environment lookup.
//
//    IDB_NAME, IDB_VERSION, IDB_STORE, IDB_KEY
//                          — IndexedDB schema constants.
//
//    idbOpen()             — open/create the WaxFrame IDB database.
//                            Returns a Promise<IDBDatabase>.
//    idbSet(value)         — atomically write the session payload
//                            under IDB_KEY. Returns Promise<void>.
//    idbGet()              — read the session payload. Returns
//                            Promise<object|null>.
//    idbClear()            — delete the session payload.
//    checkStorageQuota()   — proactive warning when storage is
//                            >=80% full. Surfaces an inline export
//                            button into the Live Console.
//
//  Load order: AFTER version.js (no hard runtime dependency), BEFORE
//  app.js (saveSession / loadSession / saveHive / saveProject /
//  loadSettings in app.js all call into these primitives).
//
//  External dependencies (live in app.js — storage.js calls them
//  at runtime):
//    consoleLog          — Live Console output (used by checkStorageQuota)
//    exportTranscript    — wired as onclick for the quota-warn button
//
//  Cross-script visibility:
//    All `const` declarations and `function` declarations at the
//    top of a classic script are visible to other scripts in the
//    same document via the global lexical environment / global
//    Object Environment Record. Bare-identifier references in
//    app.js (e.g. `localStorage.getItem(LS_HIVE)`) resolve here.
// ============================================================

// ── localStorage KEYS ──
window.LS_HIVE     = 'waxframe_v2_hive';      // AI list + API keys — persistent across projects
window.LS_PROJECT  = 'waxframe_v2_project';   // project name/version/goal/docTab — per project
window.LS_SESSION  = 'waxframe_v2_session';   // round state — per session
window.LS_SETTINGS = 'waxframe_v2_settings';  // legacy key — migrated on first load
window.LS_LICENSE  = 'waxframe_v2_license';   // license key — persistent

// ── INDEXEDDB SESSION STORAGE ──
// Session data (history, docText, consoleHTML) lives in IndexedDB — no size limits.
// localStorage keeps a lightweight 'session exists' flag for fast resume detection.
const IDB_NAME    = 'waxframe_v2_db';
const IDB_VERSION = 1;
const IDB_STORE   = 'session';
const IDB_KEY     = 'current';

let _idb = null; // holds the open IDBDatabase instance

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (_idb) { resolve(_idb); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = e => {
      _idb = e.target.result;
      // v3.56.20 — If another tab upgrades/deletes the DB, or the connection is
      // force-closed, drop the cached handle so the next idbOpen() reconnects
      // instead of throwing InvalidStateError on a dead connection. (Multi-tab /
      // multi-machine safety.) Save still has a localStorage fallback regardless.
      _idb.onversionchange = () => { try { _idb.close(); } catch(_) {} _idb = null; };
      _idb.onclose = () => { _idb = null; };
      resolve(_idb);
    };
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbSet(value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, IDB_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror    = e => reject(e.target.error);
  });
}

async function idbGet() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbClear() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror    = e => reject(e.target.error);
  });
}

async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const pct = Math.round((usage / quota) * 100);
    if (pct >= 80) {
      consoleLog(`⚠️ Storage is ${pct}% full (${Math.round(usage/1024/1024)}MB of ${Math.round(quota/1024/1024)}MB used). Consider exporting your session to avoid data loss.`, 'warn');
      // Inject an inline export button into the console
      const el = document.getElementById('liveConsole');
      if (el) {
        const existing = el.querySelector('.quota-warn-btn');
        if (!existing) {
          const btn = document.createElement('button');
          btn.className = 'btn quota-warn-btn';
          btn.textContent = '💾 Export Transcript Now';
          btn.onclick = exportTranscript;
          el.prepend(btn);
        }
      }
    }
  } catch(e) {
    // v3.29.2 — was silent. Best-effort; logging so a quiet failure here
    // (browser API quirk) is at least diagnosable.
    console.warn('[checkStorageQuota] failed:', e);
  }
}


/* =============================================================
   SESSION PERSISTENCE  (extracted from app.js v3.46.0)
   ============================================================= */
// ── (v3.21.9) Save serialization chain ──
// Every saveSession() awaits the previous one through this chain so two saves
// in flight can't race on the read-check-write guard inside.
let _saveSessionChain = Promise.resolve();

function saveSession(opts = {}) {
  // v3.61.0 — Autosave gate REMOVED. The per-round IndexedDB write IS the
  // reload-restore mechanism, and the user-facing pill never represented a
  // user-meaningful preference (turning it off broke restore silently). The
  // opts.force parameter is kept for call-site compatibility but no longer
  // gates anything — every saveSession() now writes.
  const consoleEl = document.getElementById('liveConsole');
  const consoleHTML = consoleEl ? consoleEl.innerHTML : '';
  const notesEl = document.getElementById('workNotes');
  const notes = notesEl ? notesEl.value : '';
  // v3.36.17 — Standing notes persist across rounds (one-shot still
  // auto-clears after Builder). Read alongside the one-shot buffer
  // and write to the same session payload. Pre-v3.36.17 sessions
  // have no standingNotes field; loadSession defaults to empty.
  const standingNotesEl = document.getElementById('workStandingNotes');
  const standingNotes = standingNotesEl ? standingNotesEl.value : '';
  // v3.32.18 — Persist the length-guard override flag alongside the rest
  // of the session payload. Set when the user picks "Continue anyway"
  // from the length-guard modal; persisted so it survives reloads
  // mid-project; cleared on clearProject() so a new project starts with
  // the guard active again.
  const lengthGuardOverride = !!window._lengthGuardOverride;
  // v3.32.24 — Persist the per-round satisfaction set so the green-
  // border + ★ state survives page reloads. The Set tracks which AIs
  // returned NO CHANGES NEEDED for the current round; without
  // persistence the Set rebuilds empty on reload and the rehydration
  // path in renderBeeStatusGrid has nothing to walk, so previously-
  // satisfied cards lose their star until the next round runs.
  // Serialized as an array (Sets aren't JSON-friendly) and restored
  // back into a Set on loadSession.
  const cleanThisRound = Array.from(window._cleanThisRound || []);
  // v3.32.26 — Persist the per-session AI toggle set. This is the
  // user's "which AIs are turned on for this round" selection,
  // distinct from `activeAIs` (which AIs are configured in the hive
  // at all — that's persisted via saveHive). Without persistence
  // the user's checkbox toggles on the work-screen hive cards reset
  // to all-on every page reload because initWorkScreen unconditionally
  // re-initialized the Set. Same array-then-Set serialization shape
  // as cleanThisRound.
  const sessionAIs = Array.from(window.sessionAIs || []);
  // v3.36.7 — Persist Deep Dive forensic capture alongside session payload.
  // ringBuffer holds the last RING_MAX (200) per-round captures when Deep
  // Dive is on; lastFailure holds the most recent troubleshooting context
  // (always-on, lightweight). Both flow into backup JSONs automatically
  // via IDB_SESSION serialization, so when David inspects a backup the
  // forensic record is already there — no separate export step needed.
  // ringBuffer is captured by reference but JSON-serialized at idbSet
  // time, so we don't snapshot here; if the buffer mutates between this
  // line and the actual write the latest contents win, which is what
  // we want.
  const ringBuffer  = Array.isArray(WF_DEBUG?.ringBuffer)  ? WF_DEBUG.ringBuffer  : [];
  const lastFailure = WF_DEBUG?.lastFailure || null;
  const session = { round, phase, history, docText, consoleHTML, notes, standingNotes, projClockSeconds: _projClockSeconds, lengthGuardOverride, cleanThisRound, sessionAIs, ringBuffer, lastFailure };

  // Chain through previous save so writes serialize and never overlap.
  _saveSessionChain = _saveSessionChain.then(async () => {
    // ── Primary: IndexedDB (no size limit) ──
    try {
      await idbSet(session);
      try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(e) {}
      checkStorageQuota();

      // Persistent-storage retry every 3 rounds if not yet granted.
      if (history.length > 0 && history.length % 3 === 0 &&
          !window._storagePersistent && navigator.storage?.persist) {
        try {
          window._storagePersistent = await navigator.storage.persist();
        } catch(e) { /* ignore */ }
      }
    } catch(e) {
      // IDB failed — fall back to localStorage.
      consoleLog(`❌ Session save failed (IndexedDB error: ${e.message}). Trying localStorage fallback…`, 'error', {
        status:  'IDB_ERROR',
        rawJson: e.stack || e.message || String(e)
      });
      try {
        localStorage.setItem(LS_SESSION, JSON.stringify(session));
        try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(ee) {}
      } catch(lsErr) {
        if (lsErr.name === 'QuotaExceededError') {
          consoleLog(`❌ Storage full — session could not be saved. Export your session now to avoid losing work.`, 'error', {
            status:  'QUOTA_EXCEEDED',
            rawJson: `Browser storage quota exceeded.\n\nAction: click "Export Transcript Now" below, then clear browser storage for this site, then reload.\n\nOriginal error: ${lsErr.message}`
          });
          const el = document.getElementById('liveConsole');
          if (el) {
            const existing = el.querySelector('.quota-warn-btn');
            if (!existing) {
              const btn = document.createElement('button');
              btn.className = 'btn quota-warn-btn';
              btn.textContent = '💾 Export Transcript Now';
              btn.onclick = exportTranscript;
              el.prepend(btn);
            }
          }
        } else {
          consoleLog(`❌ Session save failed: ${lsErr.message}`, 'error', {
            status:  'STORAGE_FAIL',
            rawJson: lsErr.stack || lsErr.message || String(lsErr)
          });
        }
      }
    }
  });

  saveProject(); // keep project fields in sync (synchronous, doesn't need to be in the chain)
}

/* =============================================================
   v3.53.1 — CONSOLE HTML SANITIZER
   ─────────────────────────────────────────────────────────────
   Codex security audit (2026-05-17) finding #4: storage.js
   restores raw consoleHTML via innerHTML at two sites in
   loadSession (main path + localStorage fallback). The live
   consoleLog() in app.js builds entries via createElement +
   textContent — safe — but session restore bypasses that path
   and injects whatever HTML was stored at backup time.

   Threat: a malicious backup file (or a backup tampered with
   in transit) could carry crafted HTML in its consoleHTML
   field — <script>, <img onerror>, on* handlers, javascript:
   URLs — that fires during innerHTML assignment on the next
   restore. Backup format v3.53.0 added a trust-warning modal
   before importSession runs, but that's social-engineering
   mitigation, not a code-level sandbox. This sanitizer is
   the code-level sandbox.

   Approach (v29 backlog Option A, David's preferred):
     1. Parse the stored HTML in a DETACHED document so any
        side-effecting tags (script, img with onerror, etc.)
        do not fire during parsing.
     2. Walk the resulting tree and rebuild in the live
        document via createElement + textContent matching a
        strict per-tag schema mirroring consoleLog's output.
     3. Anything outside the schema is dropped silently —
        unknown tags, javascript:/data: URLs, on* handlers
        except the strict openConsoleErrorDetail pattern.

   Backward-compatible: pre-v3.53.1 backups restore through
   the same sanitizer with no format change required.
   ============================================================= */

const _CONSOLE_ENTRY_CLASSES = new Set([
  'console-entry',
  'console-info',
  'console-warn',
  'console-error',
  'console-success'
]);

// Strict pattern matching the legitimate onclick consoleLog generates:
//   "openConsoleErrorDetail('cle_<ms-timestamp>_<base36-suffix>')"
// Any other onclick string is dropped, leaving the button inert.
const _CONSOLE_ARROW_ONCLICK_RE = /^openConsoleErrorDetail\('cle_\d+_[a-z0-9]+'\)$/;

function sanitizeConsoleHTML(rawHTML) {
  if (!rawHTML || typeof rawHTML !== 'string') return '';
  // Parse in a detached HTMLDocument. <script>/img-onerror/etc. do NOT
  // execute during DOMParser parsing of a detached document.
  let detached;
  try {
    detached = new DOMParser().parseFromString(
      `<!DOCTYPE html><body><div id="r">${rawHTML}</div>`,
      'text/html'
    );
  } catch(e) {
    console.warn('[sanitizeConsoleHTML] parse failed, dropping all console HTML:', e);
    return '';
  }
  const root = detached.getElementById('r');
  if (!root) return '';

  // Rebuild in the live document. createElement + textContent only —
  // never innerHTML on anything derived from the parsed tree.
  const out = document.createElement('div');
  for (const child of Array.from(root.children)) {
    const safe = _sanitizeConsoleEntry(child);
    if (safe) out.appendChild(safe);
  }
  return out.innerHTML;
}

// Top-level: only <div class="console-entry [console-{info|warn|error|success}]"> survives.
function _sanitizeConsoleEntry(node) {
  if (!node || node.tagName?.toLowerCase() !== 'div') return null;

  const rawCls = (node.getAttribute('class') || '').split(/\s+/);
  const safeCls = rawCls.filter(c => _CONSOLE_ENTRY_CLASSES.has(c));
  // Require the base "console-entry" class to anchor this as a legitimate entry.
  if (!safeCls.includes('console-entry')) return null;

  const out = document.createElement('div');
  out.className = safeCls.join(' ');
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      // Text directly inside the entry div — rare in legitimate output
      // (consoleLog wraps everything in spans) but harmless. Preserve.
      out.appendChild(document.createTextNode(child.textContent));
    } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
      const safe = _sanitizeConsoleChild(child);
      if (safe) out.appendChild(safe);
    }
    // All other node types (comments, CDATA, etc.) — dropped.
  }
  return out;
}

// Per-tag schema for children of a console-entry div.
function _sanitizeConsoleChild(node) {
  const tag = node.tagName?.toLowerCase();

  // <span class="console-time">timestamp</span> or <span>message</span>
  if (tag === 'span') {
    const out = document.createElement('span');
    if (node.getAttribute('class') === 'console-time') out.className = 'console-time';
    out.textContent = node.textContent; // textContent escapes any < > & in the source
    return out;
  }

  // <a class="console-link" href="https?://..." target="_blank" rel="noopener">label</a>
  if (tag === 'a') {
    const href = node.getAttribute('href') || '';
    // Only http(s):// — blocks javascript:, data:, vbscript:, file:, and
    // protocol-relative (//evil.com) URLs. The href is the only thing that
    // matters on restore since the legitimate onclick is a JS-side property
    // (not an attribute) and is not serialized to innerHTML output anyway.
    if (!/^https?:\/\//i.test(href)) return null;
    const out = document.createElement('a');
    if (node.getAttribute('class') === 'console-link') out.className = 'console-link';
    out.href = href;
    out.target = '_blank';
    out.rel = 'noopener';
    out.textContent = node.textContent;
    // Deliberately do NOT copy any attribute outside this whitelist —
    // including onclick. A malicious backup could carry onclick as an
    // attribute (consoleLog itself doesn't, but the attacker doesn't
    // know that). Stripping all unlisted attrs blocks that vector.
    return out;
  }

  // <button class="console-err-arrow" title="Show raw response"
  //         onclick="openConsoleErrorDetail('cle_xxx_yyy')">→</button>
  if (tag === 'button') {
    if (node.getAttribute('class') !== 'console-err-arrow') return null;
    const out = document.createElement('button');
    out.className = 'console-err-arrow';
    const title = node.getAttribute('title');
    if (title) out.title = String(title).slice(0, 100); // bound the length
    // Strict whitelist on onclick. Any other onclick string leaves the
    // button rendered but inert — which is the right failure mode for
    // a tampered backup (you can still SEE the entry, you just can't
    // expand it). Legitimate restored entries reconnect their data via
    // the cle_xxx_yyy id pattern, but window._consoleErrorData is rebuilt
    // from scratch each session — the data isn't persisted, so even
    // legitimate arrow buttons on restored entries hit a no-op handler.
    // That's a pre-existing limitation, not something this sanitizer
    // introduced.
    const onclick = node.getAttribute('onclick') || '';
    if (_CONSOLE_ARROW_ONCLICK_RE.test(onclick)) {
      out.setAttribute('onclick', onclick);
    }
    out.textContent = '→';
    return out;
  }

  // Any other tag — drop. Defense in depth: even if someone adds a new
  // legitimate tag to consoleLog later, restored sessions will silently
  // strip it until this sanitizer is updated. That's an explicit
  // closed-list trade-off favoring security over feature drift.
  return null;
}

// v3.56.20 — Shared session → live-state restore. Previously the primary (IDB)
// path and the localStorage-fallback path in loadSession each hand-applied the
// session fields, and the fallback copy had DRIFTED: it silently skipped notes +
// standingNotes. So an IDB read failure that fell back to localStorage would not
// repopulate those textareas, and the next saveSession() would then read them
// empty and overwrite the saved notes — quiet data loss. One helper called by
// both paths makes that drift impossible.
function _applySessionToState(s) {
  round   = s.round   || 1;
  phase   = s.phase   || 'draft';
  history = s.history || [];
  docText = s.docText || '';
  if (s.projClockSeconds) _projClockSeconds = s.projClockSeconds;
  // Length-guard override flag (default false for pre-v3.32.18 sessions).
  window._lengthGuardOverride = !!s.lengthGuardOverride;
  updateLengthGuardIndicator?.();
  // Per-round satisfaction set (array→Set; empty for pre-v3.32.24 sessions).
  window._cleanThisRound = new Set(Array.isArray(s.cleanThisRound) ? s.cleanThisRound : []);
  // Per-session AI toggle set — leave undefined for pre-v3.32.26 sessions so
  // initWorkScreen's reset path seeds it with all activeAIs (historical default).
  if (Array.isArray(s.sessionAIs)) window.sessionAIs = new Set(s.sessionAIs);
  // Deep Dive forensic capture (pre-v3.36.7 sessions lack these).
  if (Array.isArray(s.ringBuffer)) WF_DEBUG.ringBuffer = s.ringBuffer;
  if (s.lastFailure && typeof s.lastFailure === 'object') WF_DEBUG.lastFailure = s.lastFailure;
  if (docText && phase === 'draft' && round > 1) phase = 'refine';
  // One-shot notes.
  if (s.notes) {
    const notesEl = document.getElementById('workNotes');
    if (notesEl) { notesEl.value = s.notes; updateNotesBtnPriority?.(); }
  }
  // Standing notes (pre-v3.36.17 sessions lack this field).
  if (s.standingNotes) {
    const standingEl = document.getElementById('workStandingNotes');
    if (standingEl) standingEl.value = s.standingNotes;
  }
  // Console HTML — sanitized on restore (v3.53.1 closed the backup-borne XSS vector).
  if (s.consoleHTML) {
    const consoleEl = document.getElementById('liveConsole');
    if (consoleEl) consoleEl.innerHTML = sanitizeConsoleHTML(s.consoleHTML);
  }
}

async function loadSession() {
  // Eviction detection: if the session_exists flag is set in localStorage
  // but no actual data is recoverable, the browser silently evicted our
  // IndexedDB store between visits. Capture this so DOMContentLoaded can
  // surface a clear warning to the user instead of dumping them at the
  // welcome screen with no explanation.
  const _hadSessionFlag = localStorage.getItem('waxframe_v2_session_exists') === '1';
  try {
    // Primary: try IndexedDB first
    let s = await idbGet();

    // Fallback: try legacy localStorage key (handles sessions saved before IDB migration)
    if (!s) {
      const raw = localStorage.getItem(LS_SESSION);
      if (raw) {
        s = JSON.parse(raw);
        // Migrate to IndexedDB and clean up localStorage
        idbSet(s).then(() => {
          localStorage.removeItem(LS_SESSION);
          try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(e) {}
        }).catch(() => {});
      }
    }

    if (!s) {
      if (_hadSessionFlag) {
        window._sessionEvicted = true;
        localStorage.removeItem('waxframe_v2_session_exists');
      }
      return false;
    }

    _applySessionToState(s);
    return true;
  } catch(e) {
    // Last resort: try localStorage directly
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (!raw) return false;
      const s = JSON.parse(raw);
      // v3.56.20 — Same shared restore as the primary path. Previously this
      // fallback hand-applied a subset of fields and omitted notes +
      // standingNotes; now both paths go through _applySessionToState so they
      // can't diverge.
      _applySessionToState(s);
      return true;
    } catch(e2) { return false; }
  }
}


/* =============================================================
   REFERENCE DOCS SNAPSHOT  (extracted from app.js v3.47.0)
   Tiny helper used by saveSession for history capture.
   ============================================================= */
// Snapshot reference docs for history capture — returns a deep-enough copy
// so later edits to the live referenceDocs array don't mutate historical entries.
function snapshotReferenceDocs() {
  return referenceDocs.map(d => ({ ...d }));
}


/* =============================================================
   SETTINGS PERSISTENCE — split storage  (extracted v3.47.0)
   saveHive    — AI list + API keys, persistent across projects
   saveProject — project name/version/goal/docTab, per project
   loadSettings — boot-path read of both, with legacy migration
   ============================================================= */
// saveHive — AI list + keys — persistent forever
function saveHive() {
  const keys = {};
  const models = {};
  const customAIConfigs = {};
  const customAIIds = new Set(
    aiList.filter(a => !DEFAULT_AIS.find(d => d.id === a.id)).map(a => a.provider)
  );
  Object.keys(API_CONFIGS).forEach(id => {
    if (API_CONFIGS[id]._key) keys[id] = API_CONFIGS[id]._key;
    if (API_CONFIGS[id].model) models[id] = API_CONFIGS[id].model;
    if (customAIIds.has(id)) {
      const { _key, ...rest } = API_CONFIGS[id];
      customAIConfigs[id] = rest;
    }
  });
  const hive = {
    activeAIIds:     activeAIs.map(a => a.id),
    knownDefaultIds: DEFAULT_AIS.map(d => d.id),
    hiveMode:        _hiveMode,
    builder,
    keys,
    models,
    customAIs: aiList.filter(a => !DEFAULT_AIS.find(d => d.id === a.id)),
    customAIConfigs
  };
  try { localStorage.setItem(LS_HIVE, JSON.stringify(hive)); } catch(e) { console.warn('[saveHive] write failed:', e); }
  updateSetupRequirements();
}

// saveProject — project name/version/goal/docTab — cleared per project
function saveProject() {
  const proj = {
    projectName:    document.getElementById('projectName')?.value    || '',
    projectVersion: document.getElementById('projectVersion')?.value || '',
    goalDocType:    document.getElementById('goalDocType')?.value    || '',
    goalAudience:   document.getElementById('goalAudience')?.value   || '',
    goalOutcome:    document.getElementById('goalOutcome')?.value    || '',
    goalScope:      document.getElementById('goalScope')?.value      || '',
    goalTone:       document.getElementById('goalTone')?.value       || '',
    goalNotes:      document.getElementById('goalNotes')?.value      || '',
    exportMask:     document.getElementById('exportMask')?.value     || '',
    lengthMode:     getLengthMode(),
    lengthLimit:    document.getElementById('lengthLimit')?.value    || '',
    lengthMin:      document.getElementById('lengthMin')?.value      || '',
    lengthUnit:     document.getElementById('lengthUnit')?.value     || 'characters',
    docTab,
    pastedDocument: document.getElementById('pasteText')?.value || '',
    referenceDocs: snapshotReferenceDocs(),
  };
  try { localStorage.setItem(LS_PROJECT, JSON.stringify(proj)); } catch(e) { console.warn('[saveProject] write failed:', e); }
  updateLaunchRequirements();
  updateMaskPreview();
}

// v3.56.38 — Import-trust hardening. Custom AIs entered through "Add Custom
// AI" get safe, generated ids/urls, but a saved hive or imported backup can
// carry arbitrary `customAIs` objects whose id / provider / name / urls later
// land in element IDs, inline handlers, hrefs, titles, and visible text. This
// normalizes those fields at the single load chokepoint so nothing untrusted
// reaches the render path with structure intact. Free text (name) is left as
// a string and output-encoded at the render sinks; format-constrained fields
// (id, provider) are slugged; urls are dropped unless absolute http/https.
function _safeImportUrl(u) {
  try {
    const p = new URL(String(u ?? ''));
    return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : '';
  } catch { return ''; }
}
function _normalizeImportedAI(ai) {
  if (!ai || typeof ai !== 'object') return null;
  // id / provider → safe slug. Preserve legit ids like "mistral_1699..".
  const slug = v => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  ai.id        = slug(ai.id);
  ai.provider  = slug(ai.provider) || ai.id;
  if (!ai.id) return null;                 // unusable without an id
  ai.name      = String(ai.name ?? ai.id).slice(0, 200);
  ai.url       = _safeImportUrl(ai.url);
  ai.apiConsole = _safeImportUrl(ai.apiConsole);
  return ai;
}

function loadSettings() {
  try {
    // ── Try new split storage first ──
    const hiveRaw = localStorage.getItem(LS_HIVE);
    const projRaw = localStorage.getItem(LS_PROJECT);

    // ── Legacy migration: if old key exists, migrate and delete it ──
    const legacyRaw = localStorage.getItem(LS_SETTINGS);
    if (legacyRaw && !hiveRaw) {
      const s = JSON.parse(legacyRaw);
      // Migrate keys and AI list to LS_HIVE
      const keys = s.keys || {};
      const hive = {
        activeAIIds: s.activeAIIds,
        knownDefaultIds: s.knownDefaultIds || DEFAULT_AIS.map(d => d.id),
        builder: s.builder,
        keys,
        customAIs: (s.customAIs || []).filter(ai =>
          // Only keep custom AIs that aren't duplicates of defaults
          !DEFAULT_AIS.find(d => d.id === ai.id)
        )
      };
      localStorage.setItem(LS_HIVE, JSON.stringify(hive));
      localStorage.removeItem(LS_SETTINGS);
    }

    // ── Load hive (AI list + keys) ──
    const hiveData = localStorage.getItem(LS_HIVE);
    if (!hiveData) return false;
    const h = JSON.parse(hiveData);

    aiList = JSON.parse(JSON.stringify(DEFAULT_AIS));
    // v3.31.0 — hiddenDefaultIds removed. Migrate any existing hidden
    // defaults back into the visible aiList (one-time, silent). Legacy
    // hives with hiddenDefaultIds now load with the full default set.
    // No banner, no toast — by v3.31 the concept of "hidden defaults"
    // simply doesn't exist anymore; pre-v3.31 users just see all 6
    // defaults the next time they open the Worker Bees screen.
    // (No-op today since aiList is already the full DEFAULT_AIS clone;
    // kept for clarity / documentation of the migration intent.)
    if (h.customAIs) {
      h.customAIs.forEach(ai => {
        if (!_normalizeImportedAI(ai)) return;   // sanitize in place; drop if unusable
        if (!aiList.find(a => a.id === ai.id)) aiList.push(ai);
        if (!API_CONFIGS[ai.provider] && h.customAIConfigs?.[ai.provider]) {
          API_CONFIGS[ai.provider] = h.customAIConfigs[ai.provider];
        }
        // Functions don't survive JSON — rebuild them if missing
        const cfg = API_CONFIGS[ai.provider];
        if (cfg && typeof cfg.headersFn !== 'function') {
          cfg.headersFn = k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` });
          cfg.bodyFn    = (m, prompt) => JSON.stringify({ model: m, messages: [{ role: 'user', content: prompt }] });
          cfg.extractFn = d => d?.choices?.[0]?.message?.content || '';
        }
      });
    }

    // ── v3.56.24 — Default-set migration reconciliation ──
    // The default provider set can change between versions (v3.56.23 swapped
    // DeepSeek out for Mistral). That creates two saved-state hazards, both
    // healed here so existing sessions self-repair on load:
    //
    //  (1) PROMOTED custom → duplicate. A provider the user Quick-Added
    //      (stored as a custom with a timestamped id like "mistral_1699…",
    //      its own endpoint) is now also a built-in default → two cards.
    //      Fix: detect a custom whose endpoint matches a default provider's
    //      endpoint, drop the redundant custom, and migrate its saved key
    //      onto the now-default provider so nothing is lost.
    //
    //  (2) DEMOTED default → vanished. A provider that used to be a default
    //      (never stored in customAIs) is no longer in DEFAULT_AIS, so the
    //      rebuilt aiList omits it and its card disappears. Fix: if the saved
    //      hive still references it AND it's a known provider (API_CONFIGS
    //      has it), synthesize an aiList entry so it survives. Its key
    //      already re-applies via the keys-merge below.
    const _normEp = u => String(u || '').replace(/\/+$/, '').toLowerCase();
    const _defByEndpoint = {};
    DEFAULT_AIS.forEach(d => {
      const ep = _normEp(API_CONFIGS[d.provider] && API_CONFIGS[d.provider].endpoint);
      if (ep) _defByEndpoint[ep] = d.provider;
    });
    aiList = aiList.filter(a => {
      if (DEFAULT_AIS.find(d => d.id === a.id)) return true; // keep defaults
      const customEp = _normEp((API_CONFIGS[a.provider] && API_CONFIGS[a.provider].endpoint) || a.url);
      const dupOf = _defByEndpoint[customEp];
      if (dupOf && dupOf !== a.provider) {
        const ck = (API_CONFIGS[a.provider] && API_CONFIGS[a.provider]._key) || (h.keys && h.keys[a.id]);
        if (ck && API_CONFIGS[dupOf] && !API_CONFIGS[dupOf]._key) API_CONFIGS[dupOf]._key = ck;
        if (typeof consoleLog === 'function') consoleLog(`🔀 Merged saved "${a.name}" into built-in ${(API_CONFIGS[dupOf] && API_CONFIGS[dupOf].label) || dupOf} (now a default).`, 'info');
        // Remove the orphaned custom config so (a) nothing dangling persists
        // on the next save and (b) the demoted-default restore loop below
        // skips it (its !API_CONFIGS[id] guard now passes).
        if (a.provider !== dupOf) delete API_CONFIGS[a.provider];
        return false; // remove the duplicate custom
      }
      return true;
    });
    const _referenced = new Set([
      ...(h.activeAIIds || []),
      ...(h.knownDefaultIds || []),
      ...Object.keys(h.keys || {})
    ]);
    const _restoreChatUrls = { deepseek: 'https://chat.deepseek.com', cohere: 'https://coral.cohere.com', together: 'https://api.together.ai', copilot: 'https://copilot.microsoft.com' };
    _referenced.forEach(id => {
      if (aiList.find(a => a.id === id)) return;   // already present
      if (!API_CONFIGS[id]) return;                // not a known provider — skip
      let icon = 'images/icon-generic.png';
      if (typeof wfIconUpload !== 'undefined' && typeof wfIconUpload.matchCatalog === 'function') {
        icon = wfIconUpload.matchCatalog(id) || icon;
      }
      aiList.push({
        id,
        name: (API_CONFIGS[id].label) || (id.charAt(0).toUpperCase() + id.slice(1)),
        url: _restoreChatUrls[id] || '',
        icon,
        provider: id,
        apiConsole: (typeof window !== 'undefined' && window.API_CONSOLE_URLS && window.API_CONSOLE_URLS[id])
          || (typeof QUICK_ADD_PROVIDERS !== 'undefined' && QUICK_ADD_PROVIDERS[id] && QUICK_ADD_PROVIDERS[id].keyLink) || ''
      });
      if (typeof consoleLog === 'function') consoleLog(`♻️ Restored "${(API_CONFIGS[id].label) || id}" — no longer a default, kept from your saved hive.`, 'info');
    });

    if (h.keys) {
      Object.keys(h.keys).forEach(id => {
        if (API_CONFIGS[id]) API_CONFIGS[id]._key = h.keys[id];
      });
    }
    if (h.models) {
      Object.keys(h.models).forEach(id => {
        if (API_CONFIGS[id]) {
          API_CONFIGS[id].model = h.models[id];
          // Re-sync Gemini endpoint if model was customised
          if (id === 'gemini' && API_CONFIGS[id].endpointFn) {
            API_CONFIGS[id].endpoint = API_CONFIGS[id].endpointFn(h.models[id]);
          }
        }
      });
    }
    if (h.activeAIIds !== undefined) {
      activeAIs = h.activeAIIds.map(id => aiList.find(a => a.id === id)).filter(Boolean);
      DEFAULT_AIS.forEach(d => {
        if (!h.activeAIIds.includes(d.id)) {
          const wasKnown = h.knownDefaultIds && h.knownDefaultIds.includes(d.id);
          if (!wasKnown) activeAIs.push(aiList.find(a => a.id === d.id));
        }
      });
      activeAIs = activeAIs.filter(Boolean);
    } else {
      activeAIs = [...aiList];
    }
    builder = h.builder || null;

    // v3.31.0 — Hive mode load + first-run auto-detect.
    // If the hive was saved by v3.31+, h.hiveMode is set and we honor it.
    // Pre-v3.31 hives don't have it; auto-detect: any custom AI with
    // _modelsEndpoint → server, otherwise internet. Then writes back so
    // subsequent loads skip detection.
    if (h.hiveMode === 'internet' || h.hiveMode === 'server') {
      _hiveMode = h.hiveMode;
    } else {
      const hasServerImport = Object.values(API_CONFIGS).some(c => c && c._modelsEndpoint);
      _hiveMode = hasServerImport ? 'server' : 'internet';
      // Persist immediately so the next load doesn't re-detect.
      try { saveHive(); } catch(e) { /* deferred until later save */ }
    }

    // ── Load project (name/version/goal/docTab) ──
    if (projRaw) {
      const p = JSON.parse(projRaw);
      if (p.projectName)    { const el = document.getElementById('projectName');    if (el) el.value = p.projectName; }
      if (p.projectVersion) { const el = document.getElementById('projectVersion'); if (el) el.value = p.projectVersion; }
      // Load structured goal fields
      if (p.goalDocType)  { const el = document.getElementById('goalDocType');  if (el) el.value = p.goalDocType; }
      if (p.goalAudience) { const el = document.getElementById('goalAudience'); if (el) el.value = p.goalAudience; }
      if (p.goalOutcome)  { const el = document.getElementById('goalOutcome');  if (el) el.value = p.goalOutcome; }
      if (p.goalScope)    { const el = document.getElementById('goalScope');    if (el) el.value = p.goalScope; }
      if (p.goalTone)     { const el = document.getElementById('goalTone');     if (el) el.value = p.goalTone; }
      if (p.goalNotes)    { const el = document.getElementById('goalNotes');    if (el) el.value = p.goalNotes; }
      // Legacy migration: if old single projectGoal field exists, move to goalNotes
      if (p.projectGoal && !p.goalDocType && !p.goalAudience && !p.goalOutcome && !p.goalScope && !p.goalTone && !p.goalNotes) {
        const el = document.getElementById('goalNotes');
        if (el) el.value = p.projectGoal;
      }
      if (p.exportMask)     { const el = document.getElementById('exportMask');     if (el) { el.value = p.exportMask; updateMaskPreview(); } }
      if (p.lengthLimit)    { const el = document.getElementById('lengthLimit');    if (el) el.value = p.lengthLimit; }
      if (p.lengthMin)      { const el = document.getElementById('lengthMin');      if (el) el.value = p.lengthMin; }
      if (p.lengthUnit)     { const el = document.getElementById('lengthUnit');     if (el) el.value = p.lengthUnit; }
      // v3.33.0 migration: pre-v3.33.0 projects have no lengthMode field. If a
      // length limit is set without a mode, coerce to 'hardcap' (preserves prior
      // ceiling-only behavior). Empty limit → 'none'. New projects use the
      // explicit value.
      let _restoreMode = p.lengthMode;
      if (!_restoreMode || !['none','hardcap','target','range'].includes(_restoreMode)) {
        _restoreMode = (p.lengthLimit && parseInt(p.lengthLimit, 10) > 0) ? 'hardcap' : 'none';
      }
      setLengthMode(_restoreMode);
      if (p.lengthLimit || p.lengthMin || p.lengthUnit) updateLengthConstraintHint();
      if (p.docTab) docTab = p.docTab;
      // ── PASTED STARTING DOCUMENT restore (v3.21.14) ──
      // Mirror of reference material restore: paste textarea content was DOM-only
      // and lost on refresh until launch. Persisted to LS_PROJECT, restored here.
      if (typeof p.pastedDocument === 'string') {
        const pasteTa = document.getElementById('pasteText');
        if (pasteTa) {
          pasteTa.value = p.pastedDocument;
          if (typeof updateProjLineNums === 'function') updateProjLineNums('projPasteNums', pasteTa);
        }
      }
      // ── REFERENCE MATERIAL restore (v3.24.0 — multi-doc with v3-format migration) ──
      // v4 (v3.24.0+) stores p.referenceDocs as array of {id, name, text, source, filename}.
      // v3 (v3.21.0–v3.23.4) stored p.referenceMaterial string + p.referenceFilename string.
      // If we see the old shape we convert it to a single-element array so no data is lost.
      if (Array.isArray(p.referenceDocs)) {
        referenceDocs = p.referenceDocs
          .filter(d => d && typeof d === 'object')
          .map(d => ({
            id:       d.id       || generateRefDocId(),
            name:     d.name     || 'Reference',
            text:     d.text     || '',
            source:   d.source === 'upload' ? 'upload' : 'paste',
            filename: d.filename || null,
          }));
      } else if (typeof p.referenceMaterial === 'string' && p.referenceMaterial.trim()) {
        const isUpload = typeof p.referenceFilename === 'string' && p.referenceFilename.trim();
        referenceDocs = [{
          id:       generateRefDocId(),
          name:     isUpload ? p.referenceFilename : 'Reference 1',
          text:     p.referenceMaterial,
          source:   isUpload ? 'upload' : 'paste',
          filename: isUpload ? p.referenceFilename : null,
        }];
      } else {
        referenceDocs = [];
      }
      if (typeof renderReferenceCards === 'function') renderReferenceCards();
      if (typeof updateRefGrandTotals === 'function') updateRefGrandTotals();
      updateGoalCounter();
    }

    return true;
  } catch(e) { return false; }
}


/* =============================================================
   BACKUP + RESTORE  (extracted from app.js v3.48.0)
   Completes storage.js. All WaxFrame state persistence now in one file.

   backupSession — downloads a JSON snapshot of LS_HIVE + LS_PROJECT +
                   LS_SESSION + IDB_SESSION as a time-machine. Format v3.
                   Flushes in-memory state to IDB before reading so the
                   snapshot reflects the live UI state.
   importSession — restores a backup file. Replaces localStorage layers
                   and the IDB session; reloads to apply.
   ============================================================= */
async function backupSession() {
  // v3.53.0 — Pre-export sensitivity warning. Backups bundle API keys,
  // license key, document text, AI responses, and debug traces. The
  // wfConfirm modal makes that explicit so users don't treat the file
  // like a benign project export. Cancel exits without writing anything.
  // wfConfirm is defined in app.js — at call time (button click) that
  // script has loaded, so the runtime reference resolves cleanly even
  // though storage.js parses first.
  const proceed = await wfConfirm(
    'Sensitive backup',
    "Full backups let you restore this project exactly where you left off. They may include your document text, AI responses, API keys, license key, and debug traces. Store them somewhere private and only share them with people you trust.",
    { okText: 'Save to Backup', suppressKey: 'waxframe_suppress_sensitive_backup_confirm' }
  );
  if (!proceed) { closeNavMenu(); return; }

  // v3.35.2 — Flush in-memory state to IDB BEFORE reading the
  // snapshot. Without this, a backup taken while in-memory state
  // hadn't yet been auto-saved to IDB (e.g. immediately after
  // filling out the project setup screens, before any round has
  // run) captured IDB_SESSION: null. Combined with the importSession
  // bug fixed in this release — which silently skipped the IDB write
  // when IDB_SESSION was null — the result was that importing a
  // pre-Round-1 backup left the prior project's Round-N state in
  // IDB to bleed through after reload. A backup must be a true
  // time-machine: capture exactly the state at backup time, restore
  // exactly to that state on import.
  try { await saveSession({ force: true }); } catch(e) { console.warn('[backup] saveSession flush failed, proceeding with whatever is in IDB:', e); }

  const hive    = localStorage.getItem(LS_HIVE)    || null;
  const project = localStorage.getItem(LS_PROJECT) || null;
  const license = localStorage.getItem(LS_LICENSE) || null;
  // Legacy localStorage session — almost always null since the IDB migration
  // ran ages ago. Kept for forward compatibility with any unmigrated browser.
  const sessionLS = localStorage.getItem(LS_SESSION) || null;
  // Primary session source: IndexedDB. The session blob (round history, working
  // document, console HTML, notes, project clock seconds) lives in IDB.
  let sessionIDB = null;
  try { sessionIDB = await idbGet(); } catch(e) { /* ignore */ }

  if (!hive && !project && !license && !sessionLS && !sessionIDB) {
    toast('⚠️ Nothing to back up'); return;
  }

  const backup = {
    _waxframe_backup:         true,
    _waxframe_backup_version: 4, // v4 = referenceDocs array (v3.24.0+); v3 = LS mirror removed (v3.21.12+); v2 (v3.21.10/11) included LS_SESSION_MIRROR
    _waxframe_app_version:    typeof APP_VERSION === 'string' ? APP_VERSION : '',
    _waxframe_backup_ts:      Date.now(),
    LS_HIVE:           hive,
    LS_PROJECT:        project,
    LS_LICENSE:        license,
    LS_SESSION:        sessionLS,
    IDB_SESSION:       sessionIDB,    // ← the actual round data
  };
  const proj     = (() => { try { return JSON.parse(project || '{}'); } catch(e) { return {}; } })();
  // v3.36.13 — Filename pattern aligned with document export, transcript, and
  // deep-dive. Was: `{trunc40}-{trunc10}-WaxFrame-Backup-{stamp}` which
  // truncated mid-word on long project names (e.g. "Brightwater" became
  // "Brightwat") and used a different baseName shape than the other three
  // artifacts. Now: `{baseName}-r{N}-{stamp}-Backup` — no truncation, same
  // r-stamp pattern as transcript/deep-dive (so multiple backups from the
  // same project at different rounds don't collide), and the "WaxFrame-"
  // prefix is dropped since the `_waxframe_backup: true` field inside the
  // JSON plus the `-Backup.json` suffix is enough to self-identify.
  //
  // We read projectName/projectVersion from the in-memory parsed LS_PROJECT
  // (above) rather than calling buildExportName() because backupSession can
  // be triggered from any screen via the nav menu, and buildExportName()
  // depends on `workProjectName` / `workProjectVersion` DOM elements that
  // only exist on the work screen. Reading from LS_PROJECT is screen-
  // independent. The formatting regex mirrors buildExportName's exactly so
  // the baseName matches what document/transcript/deep-dive produce.
  const safeName = (proj.projectName || 'session').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  // v3.55.x — Version: ALL non-alphanumerics → dashes (so "v3.0" → "v3-0"),
  // matching the legacy filename format. (The prior regex kept dots, giving
  // "v3.0".)
  const safeVer  = (proj.projectVersion || '').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const baseName = safeVer ? `${safeName}-${safeVer}` : safeName;
  // Local-time timestamp: YYYYMMDD-HHmm (matches transcript/deep-dive/build-stamp format)
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  // v3.55.x — Reverted to the legacy format David's existing backups use:
  // `{name}-{version}-WaxFrame-Backup-{stamp}`. The v3.36.13 change (which
  // dropped the "WaxFrame-" prefix, added a -r{N} round number, and moved the
  // stamp before "-Backup") is undone — the timestamp already prevents
  // same-project collisions, and David wants the old shape back.
  const filename = `${baseName}-WaxFrame-Backup-${stamp}`;
  // Empty-file race fix history:
  // v3.21.19 — Append anchor to DOM, click, remove, defer URL.revokeObjectURL
  //            via setTimeout(..., 1000) to give Chrome's download dispatcher
  //            time to read the blob before the URL becomes invalid. Worked for
  //            the ~41 KB Marco Contractor backup that originally surfaced the
  //            race.
  // v3.21.21 — Bumped the timeout from 1 second to 30 seconds. The 1-second
  //            window was generous for tiny backups but not for real sessions:
  //            a 473 KB RFP-Response backup raced again under v3.21.19,
  //            producing the same 0-byte + filename(1) symptom. Larger blobs
  //            take longer for the dispatcher to read, and 1 second was simply
  //            too tight a margin for any realistic session size. 30 seconds
  //            is ~30× the worst observed case (a 21-round JD backup at
  //            642 KB) and gives the dispatcher 15× safety margin even for
  //            hypothetical 100 MB blobs at slow disk write speeds. Memory
  //            cost of the deferred revoke is negligible — at most a handful
  //            of un-revoked blob URLs in any realistic session.
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  closeNavMenu();
  // Confirm what was actually captured so the user knows whether session data
  // is in the file or only project setup.
  const sessionMsg = sessionIDB
    ? ` (${sessionIDB.history?.length || 0} rounds, ${(sessionIDB.docText?.length || 0).toLocaleString()} chars)`
    : ' (project setup only — no session data)';
  toast(`💾 Session backed up${sessionMsg}`);
}


/* =============================================================
   v3.54.0 — DIAGNOSTIC BUNDLE (export-only, support-safe)
   ─────────────────────────────────────────────────────────────
   A SECOND export mode alongside backupSession(), with a
   different purpose:

     • backupSession  → for the USER. Full-fidelity pause/resume
                        snapshot including API keys. Importable.
     • diagnosticSession → for SUPPORT (the developer). The user
                        hits a bug, exports this, and sends it in.
                        Export-only — it has no reason to round-
                        trip. API keys / license / bearer tokens
                        are ALWAYS stripped so a user never emails
                        their credentials. Document text and AI
                        responses are kept by default (support
                        needs them to debug) but a per-export
                        checkbox lets a privacy-conscious user
                        redact them too.

   Clears Codex security audit (2026-05-17) finding 6.1.C.

   The file carries `_waxframe_diagnostic: true` and deliberately
   does NOT carry `_waxframe_backup: true`, so importSession()
   rejects it with a friendly "this is a diagnostic bundle, not
   a backup" message rather than loading a keyless half-state.
   ============================================================= */

// Always-on redaction: strip every credential from the LS_HIVE blob.
// Returns a JSON string (or null). API keys live in hive.keys (a map of
// id → key string). Custom AIs may also carry endpoint auth in headers
// or token-shaped fields, so we walk those too. Defensive: anything
// that looks like a secret (key/token/secret/authorization/bearer/
// password) gets blanked regardless of nesting depth.
const _DIAG_SECRET_KEY_RE = /(api[-_]?key|^key$|_key|token|secret|authorization|bearer|password|passwd|pwd|credential)/i;

function _redactSecretsDeep(value) {
  if (Array.isArray(value)) return value.map(_redactSecretsDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (_DIAG_SECRET_KEY_RE.test(k) && (typeof v === 'string' || v == null)) {
        out[k] = v ? '[REDACTED]' : v;
      } else {
        out[k] = _redactSecretsDeep(v);
      }
    }
    return out;
  }
  return value;
}

function _redactHiveKeys(hiveStr) {
  if (!hiveStr) return hiveStr;
  let hive;
  try { hive = JSON.parse(hiveStr); } catch(e) { return null; }
  // Primary target: the keys map (id → apiKey string). Replace each
  // present key with a redaction marker so support can still see WHICH
  // providers had keys configured (a useful diagnostic) without the
  // values.
  if (hive.keys && typeof hive.keys === 'object') {
    for (const id of Object.keys(hive.keys)) {
      if (hive.keys[id]) hive.keys[id] = '[REDACTED]';
    }
  }
  // Secondary: walk customAIs / customAIConfigs for any nested secrets
  // (endpoint bearer tokens, etc.). customAIConfigs already strips _key
  // at save time, but headers/auth fields could still carry tokens.
  if (Array.isArray(hive.customAIs))      hive.customAIs      = _redactSecretsDeep(hive.customAIs);
  if (hive.customAIConfigs)               hive.customAIConfigs = _redactSecretsDeep(hive.customAIConfigs);
  return JSON.stringify(hive);
}

// Optional content redaction (only when the user checks the box).
// Strips document text, AI response bodies, reference material, and
// round directives — keeps round timing, outcomes, conflict COUNTS,
// builder ids, response AI ids + lengths, and error reasons. Support
// still sees the timeline and the shape of what happened, just not the
// content. Operates on a deep clone so the live session is untouched.
function _redactSessionContent(session) {
  if (!session || typeof session !== 'object') return session;
  const s = JSON.parse(JSON.stringify(session));
  const mark = (str) => typeof str === 'string'
    ? `[REDACTED — ${str.length.toLocaleString()} chars]`
    : str;

  if (typeof s.docText === 'string') s.docText = mark(s.docText);
  if (Array.isArray(s.referenceDocs)) {
    s.referenceDocs = s.referenceDocs.map(d => ({
      ...d,
      text:    typeof d.text === 'string' ? mark(d.text) : d.text,
      content: typeof d.content === 'string' ? mark(d.content) : d.content
    }));
  }
  if (typeof s.notes === 'string')         s.notes = mark(s.notes);
  if (typeof s.standingNotes === 'string') s.standingNotes = mark(s.standingNotes);

  if (Array.isArray(s.history)) {
    s.history = s.history.map(h => {
      const r = { ...h };
      if (typeof r.doc === 'string') r.doc = mark(r.doc);
      if (typeof r.notes === 'string') r.notes = mark(r.notes);
      if (typeof r.standingNotes === 'string') r.standingNotes = mark(r.standingNotes);
      // responses: keep the AI ids (which AIs answered) and lengths,
      // redact the body text.
      if (r.responses && typeof r.responses === 'object') {
        const red = {};
        for (const [aiId, txt] of Object.entries(r.responses)) {
          red[aiId] = mark(txt);
        }
        r.responses = red;
      }
      // conflicts / appliedChanges / resolvedDecisions can quote document
      // text — redact wholesale but keep the COUNT so support sees how
      // many there were.
      if (Array.isArray(r.conflicts))      r.conflicts      = `[REDACTED — ${r.conflicts.length} conflicts]`;
      else if (r.conflicts)                r.conflicts      = '[REDACTED]';
      if (Array.isArray(r.appliedChanges)) r.appliedChanges = `[REDACTED — ${r.appliedChanges.length} changes]`;
      if (Array.isArray(r.resolvedDecisions)) r.resolvedDecisions = `[REDACTED — ${r.resolvedDecisions.length} decisions]`;
      if (Array.isArray(r.referenceMaterialAtRound)) r.referenceMaterialAtRound = `[REDACTED — ${r.referenceMaterialAtRound.length} ref docs]`;
      return r;
    });
  }
  // consoleHTML is kept as-is — entries are short status lines, not
  // document content. (And it restores through sanitizeConsoleHTML on
  // the off chance it's ever loaded.)
  return s;
}

async function diagnosticSession() {
  // Modal carries a checkbox: "Also redact document text and AI
  // responses". DEFAULT UNCHECKED — support needs the content to debug,
  // and the user is intentionally sending the file in for that purpose.
  // wfConfirm with opts.checkbox returns { ok, checked } instead of a
  // bare boolean (backward-compatible — only the object shape when a
  // checkbox is requested).
  const res = await wfConfirm(
    'Diagnostic bundle',
    "This creates a support-safe file you can send when something goes wrong. Your API keys, license key, and any saved credentials are ALWAYS removed. Document text and AI responses are included by default so support can reproduce the issue — tick the box below to strip those too if your content is sensitive.\n\nThis file is for sharing with support. It cannot be imported to restore a session — use Backup Session for that.",
    { okText: 'Download diagnostic', checkbox: { label: 'Also redact document text and AI responses', checked: false } }
  );
  if (!res || !res.ok) { closeNavMenu(); return; }
  const redactContent = !!res.checked;

  try { await saveSession({ force: true }); } catch(e) { console.warn('[diagnostic] saveSession flush failed, proceeding with whatever is in IDB:', e); }

  const hiveRaw    = localStorage.getItem(LS_HIVE)    || null;
  const project    = localStorage.getItem(LS_PROJECT) || null;
  let sessionIDB = null;
  try { sessionIDB = await idbGet(); } catch(e) { /* ignore */ }

  if (!hiveRaw && !project && !sessionIDB) {
    toast('⚠️ Nothing to export'); return;
  }

  // Always strip credentials from the hive. Never include LS_SESSION
  // (legacy) or LS_LICENSE in a diagnostic bundle at all.
  const hiveRedacted = _redactHiveKeys(hiveRaw);
  let sessionOut = sessionIDB;
  if (redactContent && sessionIDB) sessionOut = _redactSessionContent(sessionIDB);

  const bundle = {
    _waxframe_diagnostic:      true,    // NOT _waxframe_backup — import rejects this
    _waxframe_diagnostic_version: 1,
    _waxframe_app_version:     typeof APP_VERSION === 'string' ? APP_VERSION : '',
    _waxframe_build:           (typeof BUILD === 'string' ? BUILD : ''),
    _waxframe_diagnostic_ts:   Date.now(),
    _waxframe_content_redacted: redactContent,
    LS_HIVE:    hiveRedacted,   // credentials stripped
    LS_PROJECT: project,        // project setup — workflow context, no secrets
    IDB_SESSION: sessionOut,    // session data (content kept or redacted per checkbox)
  };

  const proj     = (() => { try { return JSON.parse(project || '{}'); } catch(e) { return {}; } })();
  const safeName = (proj.projectName || 'session').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const safeVer  = (proj.projectVersion || '').replace(/[^a-z0-9._-]/gi, '');
  const baseName = safeVer ? `${safeName}-${safeVer}` : safeName;
  const totalRoundsForName = Math.max(0, (typeof round !== 'undefined' ? round : 1) - 1);
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  // Filename pattern mirrors backup but with the -Diagnostic-Safe suffix
  // so the two are never confused in a Downloads folder.
  const filename = `${baseName}-r${totalRoundsForName}-${stamp}-Diagnostic-Safe`;

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  closeNavMenu();
  toast(`🩹 Diagnostic bundle exported — keys removed${redactContent ? ', content redacted' : ''}`);
}

async function importSession() {
  // v3.53.0 — Pre-import trust warning. A backup file can overwrite local
  // project, hive setup, API keys, license key, and session state. Codex
  // security audit (2026-05-17) flagged this as a social-engineering
  // vector — a malicious backup imported by a trusting user replaces
  // their entire app state. wfConfirm makes the trust decision explicit
  // before any storage writes happen. The pre-existing
  // `_waxframe_backup: true` magic-flag check stays as a format guard
  // inside the file reader — this modal is the human gate that runs
  // before the file picker even opens.
  // v3.63.6 — suppressKey removed. Importing a backup is a destructive
  // trust boundary (replaces project, keys, session); per the project
  // rule, suppressKey belongs only on informational confirms, never on
  // a safety brake. This warning must fire every time.
  const proceed = await wfConfirm(
    'Restore from backup',
    "Only restore backups you created or trust. A backup can replace your local project, AI setup, API keys, and session state.",
    { okText: 'Choose file' }
  );
  if (!proceed) { closeNavMenu(); return; }

  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader   = new FileReader();
    reader.onload  = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        // v3.54.0 — friendly rejection for diagnostic bundles. These are
        // export-only support files; they carry _waxframe_diagnostic and
        // deliberately omit _waxframe_backup, with credentials stripped.
        // Catch them before the generic "not a valid backup" message so
        // the user understands WHY it won't import.
        if (data._waxframe_diagnostic && !data._waxframe_backup) {
          toast('⚠️ This is a Diagnostic Bundle (export-only, for sending to support). It can\'t restore a session — use a Backup file for that.', 9000);
          return;
        }
        if (!data._waxframe_backup) { toast('⚠️ Not a valid WaxFrame backup file'); return; }
        // ── Restore localStorage layers ──
        if (data.LS_HIVE)    localStorage.setItem(LS_HIVE,    data.LS_HIVE);
        if (data.LS_PROJECT) localStorage.setItem(LS_PROJECT, data.LS_PROJECT);
        if (data.LS_SESSION) localStorage.setItem(LS_SESSION, data.LS_SESSION);
        if (Object.prototype.hasOwnProperty.call(data, 'LS_LICENSE')) {
          if (data.LS_LICENSE) localStorage.setItem(LS_LICENSE, data.LS_LICENSE);
          else localStorage.removeItem(LS_LICENSE);
        }
        // Note: v2 backups include LS_SESSION_MIRROR but mirror was removed in
        // v3.21.12 / format v3 — IDB_SESSION is now the single source of truth.
        // ── (v3.35.2) IDB write is no longer optional ──
        // Prior versions skipped the IDB write when data.IDB_SESSION
        // was null/missing — leaving any prior session in IDB to
        // bleed through after location.reload(). A backup must be a
        // true time-machine, including the case where the captured
        // state was "from-scratch, no rounds run yet". When
        // IDB_SESSION is null/missing now, we explicitly wipe IDB
        // (and the session-exists flag) so the reload reads the
        // captured project setup against an empty session — which is
        // exactly what was captured.
        let restoredFromIDB = false;
        let wipedToScratch  = false;
        if (data.IDB_SESSION) {
          try {
            await idbSet(data.IDB_SESSION);
            try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(_) {}
            restoredFromIDB = true;
          } catch(idbErr) {
            console.error('[importSession] IDB restore failed:', idbErr);
            toast(`⚠️ Project restored but IDB session write failed: ${idbErr.message || idbErr}. See console.`, 14000);
          }
        } else {
          // No session in the backup → captured state was pre-Round-1
          // (or a v1-format pre-v3.21.10 backup). Treat as explicit
          // "reset to from-scratch" rather than as "skip the write".
          try {
            await idbClear();
            localStorage.removeItem('waxframe_v2_session_exists');
            wipedToScratch = true;
          } catch(clearErr) {
            console.error('[importSession] IDB clear failed:', clearErr);
            toast(`⚠️ Project restored but IDB clear failed: ${clearErr.message || clearErr}. Prior session may persist.`, 14000);
          }
        }
        // Diagnostic toast — be explicit about what was captured so users know
        // whether they're getting full state or just project setup.
        const v = data._waxframe_backup_version || 1;
        if (v < 2 && !data.IDB_SESSION) {
          toast('⚠️ Old backup format (pre-v3.21.10) — only project setup + API keys restored, session reset to fresh. Reloading…', 12000);
        } else if (restoredFromIDB) {
          const sh = data.IDB_SESSION?.history?.length || 0;
          const sd = data.IDB_SESSION?.docText?.length || 0;
          toast(`✅ Backup restored — ${sh} round${sh !== 1 ? 's' : ''}, ${sd.toLocaleString()} chars in document. Reloading…`, 6000);
        } else if (wipedToScratch) {
          toast('✅ Backup restored — captured pre-Round-1 state, session reset to fresh. Reloading…', 6000);
        } else {
          toast('✅ Project setup restored — reloading…', 6000);
        }
        setTimeout(() => location.reload(), 1500);
      } catch(e) {
        toast('⚠️ Could not read file — is it a WaxFrame backup?');
      }
    };
    reader.readAsText(file);
  };
  closeNavMenu();
  input.click();
}
