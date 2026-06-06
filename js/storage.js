// ============================================================
//  WaxFrame — storage.js
// Build: 20260605-020
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

// ── STORAGE WIPE HELPERS ──
// v3.63.90 — Granular storage-wipe functions exposed via the Help page and
// Settings. Each function targets ONE storage layer and reports a count so
// callers can show "✓ Removed N entries" feedback. wipeAllStorage runs all
// three. All functions are no-throw: they return {removed, error?} instead
// of bubbling exceptions, so a partial failure (e.g. IDB locked by another
// tab) still surfaces useful info to the user.
//
// What each layer holds in WaxFrame:
//   localStorage   → hive (AI list + API keys + custom configs), project
//                    fields, license, Auto-mode settings, recommendation
//                    caches, model caches, UI prefs (expanded rows, etc.)
//   IndexedDB      → session/round data: history, working document text,
//                    console HTML, conflict ledger snapshots. Stored under
//                    waxframe_v2_db / session / current. Bigger than
//                    localStorage's 5MB cap — that's why rounds live here.
//   sessionStorage → currently unused by WaxFrame. Cleared defensively in
//                    case a future feature adds ephemeral state here.
async function wipeLocalStorage() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('waxframe_') === 0) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    return { removed: keys.length };
  } catch (e) {
    return { removed: 0, error: e && e.message ? e.message : String(e) };
  }
}

async function wipeSessionStorage() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.indexOf('waxframe_') === 0) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
    return { removed: keys.length };
  } catch (e) {
    return { removed: 0, error: e && e.message ? e.message : String(e) };
  }
}

async function wipeIndexedDB() {
  // Full deleteDatabase rather than per-key delete: callers asking for a
  // "wipe" want the database gone, not just the current key cleared. The
  // next idbOpen() will recreate the schema fresh.
  return new Promise(resolve => {
    try {
      // Close any open handle first so deleteDatabase isn't blocked.
      try { if (_idb) { _idb.close(); _idb = null; } } catch (_) {}
      const req = indexedDB.deleteDatabase(IDB_NAME);
      req.onsuccess = () => resolve({ removed: 1 });
      req.onerror   = e => resolve({ removed: 0, error: (e.target.error && e.target.error.message) || 'deleteDatabase error' });
      req.onblocked = () => resolve({ removed: 0, error: 'IndexedDB delete blocked — close other WaxFrame tabs and try again.' });
    } catch (e) {
      resolve({ removed: 0, error: e && e.message ? e.message : String(e) });
    }
  });
}

async function wipeAllStorage() {
  const [ls, ss, idb] = await Promise.all([wipeLocalStorage(), wipeSessionStorage(), wipeIndexedDB()]);
  return {
    localStorage: ls,
    sessionStorage: ss,
    indexedDB: idb,
    totalRemoved: (ls.removed || 0) + (ss.removed || 0) + (idb.removed || 0),
    anyError: !!(ls.error || ss.error || idb.error)
  };
}

// Expose globally so help.html (loaded as its own page with storage.js
// included as a <script src>) and Settings (in app.js) can both reach them.
window.wipeLocalStorage   = wipeLocalStorage;
window.wipeSessionStorage = wipeSessionStorage;
window.wipeIndexedDB      = wipeIndexedDB;
window.wipeAllStorage     = wipeAllStorage;

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
            id:       safeRefId(d.id),
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
   CHECKPOINT (SAVE + RESTORE)  (extracted from app.js v3.48.0;
                                 selective EXPORT added v3.63.130)
   Completes storage.js. All WaxFrame state persistence now in one file.

   backupSession           — entry point wired to the nav menu + first-run
                             nudge. Opens the Save Checkpoint modal
                             (#saveCheckpointModal in index.html) for the
                             user to pick scope; modal's Save button calls
                             confirmSaveCheckpoint which delegates to
                             _writeCheckpoint(scope).
   confirmSaveCheckpoint   — reads the modal's checkbox state, calls
                             _writeCheckpoint with a scope object.
   _writeCheckpoint(scope) — assembles a format-v5 envelope based on scope,
                             selectively fills LS_HIVE/LS_PROJECT/LS_LICENSE/
                             session fields, writes the file. Internal —
                             never call directly from UI.
   importSession           — restores a checkpoint file. v5 path uses
                             _waxframe_backup_scope to decide per-field
                             whether to apply ("preserve local" on omit);
                             v4 and prior use the legacy all-or-nothing
                             replace path. Reloads to apply.

   Format history:
     v5 (v3.63.130+) — selective EXPORT. New _waxframe_backup_scope envelope
                       field declares {project, session, hive, keys, builder,
                       license} as booleans. Unticked sections write null and
                       importSession preserves the receiver's local value.
                       The Save Checkpoint (Scrubbed) menu item +
                       backupSessionScrubbed/scrubBackup helpers +
                       _waxframe_backup_scrubbed import branch all retired
                       in this release — same outcome reached by unticking
                       Keys + License in the new modal. _redactSecretsDeep /
                       _redactHiveKeys / _redactSessionContent kept (still
                       used by help.html for the diagnostic-bundle flow).
     v4 (v3.24.0+)   — referenceDocs as an array (vs single doc earlier).
                       Legacy scrubbed checkpoints from v3.63.59-129 may
                       carry _waxframe_backup_scrubbed: true on a v4
                       envelope; with no users in the wild, the import
                       branch was dropped in v3.63.130. If such a file ever
                       surfaces it imports via the v4 default path, which
                       overwrites local LS_LICENSE with the file's null —
                       a license loss, but a single-keystroke recovery.
     v3 (v3.21.12+)  — LS_SESSION_MIRROR removed (IDB became source of truth).
     v2 (v3.21.10/11)— LS_SESSION_MIRROR present alongside LS_SESSION.
   ============================================================= */

// Entry point — wired to the nav menu's "💾 Save Checkpoint" button and to
// the first-run nudge's "Save a checkpoint" button (via firstRunDoBackup
// in app.js). Opens the selective-export modal in index.html. The modal's
// Save button calls confirmSaveCheckpoint(), which collects scope state
// and delegates to _writeCheckpoint(scope). No download happens here.
function backupSession() {
  const modal = document.getElementById('saveCheckpointModal');
  if (!modal) {
    // Defensive — the modal HTML should always be in index.html. If it's
    // somehow missing, save a full checkpoint directly so the nav button
    // isn't dead. Logged so anyone debugging this catches the missing markup.
    console.warn('[backupSession] saveCheckpointModal not in DOM; saving full checkpoint without modal');
    _writeCheckpoint({ project:true, session:true, hive:true, keys:true, builder:true, license:true });
    return;
  }
  // Reset checkbox state to defaults each open. Defaults reflect the
  // portable-project use case the new modal was built for: project +
  // session travel; hive/keys/builder stay local (different machines
  // have different hives); license stays attached for self-portability.
  // Untick License when sharing with a different user. To produce the
  // legacy "scrubbed checkpoint" shape, tick Hive + Builder but leave
  // Keys + License unticked — same outcome the retired Scrubbed flow
  // produced, now reachable through the same modal.
  document.getElementById('scopeProject').checked  = true;
  document.getElementById('scopeSession').checked  = true;
  document.getElementById('scopeHive').checked     = false;
  document.getElementById('scopeKeys').checked     = false;
  document.getElementById('scopeKeys').disabled    = true;
  document.getElementById('scopeBuilder').checked  = false;
  document.getElementById('scopeBuilder').disabled = true;
  document.getElementById('scopeLicense').checked  = true;
  modal.classList.add('active');
  closeNavMenu();
}

function closeSaveCheckpointModal() {
  document.getElementById('saveCheckpointModal')?.classList.remove('active');
}

// Hive parent gates Keys + Builder children. With Hive unticked, the file
// has no hive at all, so keys-or-builder-without-hive is a nonsense state.
// Auto-untick the children when the parent flips off, and re-enable them
// when the parent flips on. Wired to the Hive checkbox's onchange.
function updateCheckpointScopeChildren() {
  const hive    = document.getElementById('scopeHive');
  const keys    = document.getElementById('scopeKeys');
  const builder = document.getElementById('scopeBuilder');
  if (!hive || !keys || !builder) return;
  if (hive.checked) {
    keys.disabled    = false;
    builder.disabled = false;
  } else {
    keys.checked    = false;
    keys.disabled   = true;
    builder.checked = false;
    builder.disabled = true;
  }
}

async function confirmSaveCheckpoint() {
  const scope = {
    project: !!document.getElementById('scopeProject')?.checked,
    session: !!document.getElementById('scopeSession')?.checked,
    hive:    !!document.getElementById('scopeHive')?.checked,
    keys:    !!document.getElementById('scopeKeys')?.checked,
    builder: !!document.getElementById('scopeBuilder')?.checked,
    license: !!document.getElementById('scopeLicense')?.checked,
  };
  // Enforce the parent-gates-children invariant — even if a child somehow
  // ended up ticked while disabled, collapse it here so the envelope is
  // consistent with the UI semantics.
  if (!scope.hive) { scope.keys = false; scope.builder = false; }
  closeSaveCheckpointModal();
  await _writeCheckpoint(scope);
}

// Internal — the actual save logic. Reads live state, applies scope
// (omitted sections become null in the file; when Hive is ticked but Keys
// or Builder are unticked, the sub-field inside LS_HIVE is blanked while
// the rest of the hive composition is kept), writes a format-v5 envelope,
// streams it to a Blob download.
async function _writeCheckpoint(scope) {
  // v3.35.2 — Flush in-memory state to IDB before reading the snapshot.
  // Without this, a checkpoint taken while in-memory state hadn't yet been
  // auto-saved to IDB (e.g. right after setup, before any round has run)
  // would capture IDB_SESSION: null and the restore would not be a faithful
  // time-machine.
  try { await saveSession({ force: true }); } catch(e) { console.warn('[checkpoint] saveSession flush failed, proceeding with whatever is in IDB:', e); }

  const hiveRaw    = localStorage.getItem(LS_HIVE)    || null;
  const projectRaw = localStorage.getItem(LS_PROJECT) || null;
  const licenseRaw = localStorage.getItem(LS_LICENSE) || null;
  // Legacy localStorage session — almost always null since the IDB
  // migration ran ages ago. Kept for forward compatibility with any
  // unmigrated browser.
  const sessionLS  = localStorage.getItem(LS_SESSION) || null;
  // Primary session source: IndexedDB. The session blob (round history,
  // working document, console HTML, notes, project clock seconds) lives here.
  let sessionIDB   = null;
  try { sessionIDB = await idbGet(); } catch(e) { /* ignore */ }

  // Apply scope. Omitted sections become null in the output envelope; the
  // importer's v5 path treats null + scope=false as "preserve local".
  let outHive       = null;
  let outProject    = null;
  let outLicense    = null;
  let outSessionLS  = null;
  let outSessionIDB = null;

  if (scope.hive && hiveRaw) {
    // Strip sub-sections that the user opted out of, but keep the rest of
    // the hive shape. Parse-fail falls through to the raw string so a
    // malformed local hive still ships verbatim rather than getting
    // accidentally nulled.
    let parsed;
    try { parsed = JSON.parse(hiveRaw); } catch(e) { parsed = null; }
    if (parsed && typeof parsed === 'object') {
      if (!scope.keys)    parsed.keys    = {};
      if (!scope.builder) parsed.builder = '';
      outHive = JSON.stringify(parsed);
    } else {
      outHive = hiveRaw;
    }
  }
  if (scope.project && projectRaw) outProject = projectRaw;
  if (scope.license && licenseRaw) outLicense = licenseRaw;
  if (scope.session) {
    outSessionLS  = sessionLS;
    outSessionIDB = sessionIDB;
  }

  // Need at least ONE section to contain something. Otherwise the file
  // would be an empty envelope — bail with a hint about what to do.
  const captured = !!(outHive || outProject || outLicense || outSessionLS || outSessionIDB);
  if (!captured) {
    toast('⚠️ Nothing to checkpoint — tick at least one section that has data');
    return;
  }

  const checkpoint = {
    _waxframe_backup:         true,
    _waxframe_backup_version: 5,
    _waxframe_backup_scope:   { ...scope },
    _waxframe_app_version:    typeof APP_VERSION === 'string' ? APP_VERSION : '',
    _waxframe_backup_ts:      Date.now(),
    LS_HIVE:    outHive,
    LS_PROJECT: outProject,
    LS_LICENSE: outLicense,
    LS_SESSION: outSessionLS,
    IDB_SESSION: outSessionIDB,
  };

  // Filename: legacy `{name}-{version}-WaxFrame-Checkpoint-{stamp}.json`
  // shape. Self-describing via internals (the `_waxframe_backup_scope`
  // envelope field tells the importer what's inside), so the filename
  // stays simple regardless of scope. Project name + version read from
  // the parsed LS_PROJECT — backupSession can be triggered from any
  // screen, and buildExportName() depends on work-screen DOM elements.
  const proj     = (() => { try { return JSON.parse(projectRaw || '{}'); } catch(e) { return {}; } })();
  const safeName = (proj.projectName    || 'session').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const safeVer  = (proj.projectVersion || '').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const baseName = safeVer ? `${safeName}-${safeVer}` : safeName;
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const filename = `${baseName}-WaxFrame-Checkpoint-${stamp}`;

  // 30s deferred URL.revokeObjectURL — see history at the prior backupSession
  // implementation (v3.21.19 / v3.21.21). Larger checkpoints need more
  // dispatcher time; 30s is well past the worst observed case.
  const blob = new Blob([JSON.stringify(checkpoint, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);

  // Toast confirms what actually landed in the file, so the user knows the
  // scope was honored. Compact tag list from the chosen scope.
  const tags = [];
  if (scope.project) tags.push('project');
  if (scope.session) tags.push(sessionIDB ? `session (${sessionIDB.history?.length || 0} rounds)` : 'session (empty)');
  if (scope.hive)    tags.push(scope.keys && scope.builder ? 'hive+keys+builder' : (scope.keys ? 'hive+keys' : (scope.builder ? 'hive+builder' : 'hive only')));
  if (scope.license) tags.push('license');
  toast(`💾 Checkpoint saved — ${tags.join(', ')}`, 5000);
}


/* =============================================================
   DIAGNOSTIC REDACTION HELPERS (support-safe)
   ─────────────────────────────────────────────────────────────
   Pure helpers that strip credentials and (optionally) document
   content from the live storage blobs so a session snapshot is
   safe to share in a public bug report.

   History:
     • v3.54.0 — Introduced as the back-end for an in-app
       diagnosticSession() export function on the Advanced menu.
     • v3.63.13 — In-app function removed. The Support page
       (help.html) now owns the bundle-export
       flow end-to-end and reuses these helpers as the single
       source of truth for redaction — so a public bug report
       from the Support page and one filed via the diagnostic
       path can never disagree on what counts as a secret.

   Bundles produced this way carry `_waxframe_diagnostic: true`
   and deliberately do NOT carry `_waxframe_backup: true`, so
   importSession() rejects them with a friendly "this is a
   diagnostic bundle, not a backup" message rather than loading
   a keyless half-state.

   Clears Codex security audit (2026-05-17) finding 6.1.C.
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
  // v3.63.7 — content redaction now also scrubs the debug side-channels.
  // ringBuffer (Deep Dive per-round captures) and lastFailure (troubleshooting
  // context) can both contain prompt/response previews; consoleHTML can echo
  // snippets of document text in some log lines. _redactSessionContent only runs
  // when the user ticked "redact document text and AI responses", so honor that
  // fully rather than leaking content through these channels.
  if (Array.isArray(s.ringBuffer)) {
    s.ringBuffer = `[REDACTED — ${s.ringBuffer.length} ring-buffer entries]`;
  }
  if (s.lastFailure) {
    s.lastFailure = '[REDACTED]';
  }
  if (typeof s.consoleHTML === 'string') {
    s.consoleHTML = `[REDACTED — ${s.consoleHTML.length.toLocaleString()} chars]`;
  }
  return s;
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
    'Restore from Checkpoint',
    "Only restore checkpoints you created or trust. A checkpoint can replace your local project, AI setup, API keys, and session state.",
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
          toast('⚠️ This is a Diagnostic Bundle (export-only, for sending to support). It can\'t restore a session — use a Checkpoint file for that.', 9000);
          return;
        }
        if (!data._waxframe_backup) { toast('⚠️ Not a valid WaxFrame checkpoint file'); return; }

        // v3.63.130 — Format-version branch. v5 introduces selective EXPORT:
        // the file carries `_waxframe_backup_scope` declaring which sections
        // were intentionally included. Omitted sections (scope=false) write
        // null in the envelope and the importer PRESERVES the receiver's
        // local value rather than overwriting with null. v4 and earlier
        // use the legacy all-or-nothing path below (null = wipe local).
        const ver = data._waxframe_backup_version || 1;
        const scope = (ver >= 5 && data._waxframe_backup_scope && typeof data._waxframe_backup_scope === 'object')
          ? data._waxframe_backup_scope
          : null;

        // ── Restore localStorage layers ──
        if (scope) {
          // v5 selective path. Each section consults its scope flag; when
          // unticked, leave local state alone. When Hive is ticked but
          // Keys/Builder were unticked, the file's hive.keys is {} and
          // hive.builder is '' — merge the local values back in so the
          // user keeps their existing keys and Builder choice.
          if (scope.hive && data.LS_HIVE) {
            try {
              const importedHive = JSON.parse(data.LS_HIVE);
              if (!scope.keys || !scope.builder) {
                const existingRaw  = localStorage.getItem(LS_HIVE);
                const existingHive = existingRaw ? (() => { try { return JSON.parse(existingRaw); } catch(_) { return null; } })() : null;
                if (!scope.keys && existingHive && existingHive.keys && typeof existingHive.keys === 'object') {
                  importedHive.keys = existingHive.keys;
                }
                if (!scope.builder && existingHive && typeof existingHive.builder === 'string') {
                  importedHive.builder = existingHive.builder;
                }
              }
              localStorage.setItem(LS_HIVE, JSON.stringify(importedHive));
            } catch (mergeErr) {
              console.warn('[importSession] v5 hive merge failed; falling back to direct overwrite:', mergeErr);
              localStorage.setItem(LS_HIVE, data.LS_HIVE);
            }
          }
          // !scope.hive → leave local hive untouched (including keys + builder).
          if (scope.project && data.LS_PROJECT) localStorage.setItem(LS_PROJECT, data.LS_PROJECT);
          // !scope.project → leave local project untouched.
          if (scope.license) {
            if (data.LS_LICENSE) {
              localStorage.setItem(LS_LICENSE, data.LS_LICENSE);
            } else {
              // scope.license=true + null LS_LICENSE means "I ticked License
              // but had none set" — clear local to match.
              localStorage.removeItem(LS_LICENSE);
            }
          }
          // !scope.license → leave local license untouched (the file's null
          // is intentional omission, not "remove local license").
        } else {
          // v4 (and earlier) all-or-nothing path. Null fields = overwrite
          // local with empty. Legacy scrubbed checkpoints from v3.63.59-129
          // would have hit a special _waxframe_backup_scrubbed branch here;
          // that branch was retired in v3.63.130 with zero users in the
          // wild. If such a file ever surfaces it imports through this
          // default path — the local license gets wiped (recoverable by
          // re-entering the key) but everything else is fine.
          if (data.LS_HIVE) localStorage.setItem(LS_HIVE, data.LS_HIVE);
          if (data.LS_PROJECT) localStorage.setItem(LS_PROJECT, data.LS_PROJECT);
          if (data.LS_SESSION) localStorage.setItem(LS_SESSION, data.LS_SESSION);
          if (Object.prototype.hasOwnProperty.call(data, 'LS_LICENSE')) {
            if (data.LS_LICENSE) localStorage.setItem(LS_LICENSE, data.LS_LICENSE);
            else                 localStorage.removeItem(LS_LICENSE);
          }
        }
        // LS_SESSION is the legacy localStorage session blob (almost always
        // null since the IDB migration). v5 honors session scope; legacy
        // path wrote it unconditionally above.
        if (scope && scope.session && data.LS_SESSION) localStorage.setItem(LS_SESSION, data.LS_SESSION);

        // Note: v2 backups include LS_SESSION_MIRROR but mirror was removed in
        // v3.21.12 / format v3 — IDB_SESSION is now the single source of truth.
        // ── (v3.35.2) IDB write is no longer optional for v4 ──
        // Prior versions skipped the IDB write when data.IDB_SESSION was
        // null/missing — leaving any prior session in IDB to bleed through
        // after location.reload(). A v4 checkpoint must be a true time-
        // machine, including the case where the captured state was "from-
        // scratch, no rounds run yet". When IDB_SESSION is null/missing in
        // a v4 file now, we explicitly wipe IDB so the reload reads the
        // captured project setup against an empty session.
        // ── (v3.63.130) v5 path defers to scope.session ──
        // !scope.session → leave local IDB untouched (don't wipe, don't
        // restore). scope.session + null IDB → user checkpointed an empty
        // session intentionally; wipe local to match.
        let restoredFromIDB = false;
        let wipedToScratch  = false;
        if (scope && !scope.session) {
          // v5 with session unticked — preserve local IDB. No flag needed:
          // the v5 toast branch below consults scope.session directly.
        } else if (data.IDB_SESSION) {
          try {
            await idbSet(data.IDB_SESSION);
            try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(_) {}
            restoredFromIDB = true;
          } catch(idbErr) {
            console.error('[importSession] IDB restore failed:', idbErr);
            toast(`⚠️ Project restored but IDB session write failed: ${idbErr.message || idbErr}. See console.`, 14000);
          }
        } else {
          try {
            await idbClear();
            localStorage.removeItem('waxframe_v2_session_exists');
            wipedToScratch = true;
          } catch(clearErr) {
            console.error('[importSession] IDB clear failed:', clearErr);
            toast(`⚠️ Project restored but IDB clear failed: ${clearErr.message || clearErr}. Prior session may persist.`, 14000);
          }
        }

        // Diagnostic toast — be explicit about what was captured + restored.
        if (scope) {
          // v5 path — summarize what got restored vs preserved.
          const restoredTags = [];
          const preservedTags = [];
          if (scope.project) restoredTags.push('project'); else preservedTags.push('project');
          if (scope.session) {
            const sh = data.IDB_SESSION?.history?.length || 0;
            restoredTags.push(sh > 0 ? `session (${sh} rounds)` : 'session (empty)');
          } else {
            preservedTags.push('session');
          }
          if (scope.hive) {
            const hiveLabel = (scope.keys && scope.builder) ? 'hive+keys+builder'
              : (scope.keys ? 'hive+keys' : (scope.builder ? 'hive+builder' : 'hive only'));
            restoredTags.push(hiveLabel);
          } else {
            preservedTags.push('hive');
          }
          if (scope.license) restoredTags.push('license'); else preservedTags.push('license');
          const restoredPart  = restoredTags.length  ? `Restored: ${restoredTags.join(', ')}` : 'Nothing restored';
          const preservedPart = preservedTags.length ? ` · Kept local: ${preservedTags.join(', ')}` : '';
          toast(`✅ ${restoredPart}${preservedPart}. Reloading…`, 7000);
        } else if (ver < 2 && !data.IDB_SESSION) {
          toast('⚠️ Old checkpoint format (pre-v3.21.10) — only project setup + API keys restored, session reset to fresh. Reloading…', 12000);
        } else if (restoredFromIDB) {
          const sh = data.IDB_SESSION?.history?.length || 0;
          const sd = data.IDB_SESSION?.docText?.length || 0;
          toast(`✅ Checkpoint restored — ${sh} round${sh !== 1 ? 's' : ''}, ${sd.toLocaleString()} chars in document. Reloading…`, 6000);
        } else if (wipedToScratch) {
          toast('✅ Checkpoint restored — captured pre-Round-1 state, session reset to fresh. Reloading…', 6000);
        } else {
          toast('✅ Project setup restored — reloading…', 6000);
        }
        setTimeout(() => location.reload(), 1500);
      } catch(e) {
        toast('⚠️ Could not read file — is it a WaxFrame checkpoint?');
      }
    };
    reader.readAsText(file);
  };
  closeNavMenu();
  input.click();
}
