// ============================================================
//  WaxFrame — storage.js
//  Build: 20260516-009
//
//  Storage primitives + session persistence. Pulled from app.js
//  in v3.45.0 (primitives) and v3.46.0 (session save/load).
//  Remaining migrations queued: saveHive + saveProject +
//  loadSettings (~360 lines), backupSession + restore helpers
//  (~200 lines). All currently still in app.js.
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
    req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
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

function saveSession() {
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

    round   = s.round   || 1;
    phase   = s.phase   || 'draft';
    history = s.history || [];
    docText = s.docText || '';
    if (s.projClockSeconds) _projClockSeconds = s.projClockSeconds;
    // v3.32.18 — Restore length-guard override flag. Default false for
    // pre-v3.32.18 sessions where the field doesn't exist.
    window._lengthGuardOverride = !!s.lengthGuardOverride;
    // v3.32.28 — #6c indicator state follows the restored flag. The
    // indicator element may not yet be in DOM at first call (e.g.
    // during pre-launch verify); the helper short-circuits cleanly
    // and initWorkScreen re-runs it once the work screen mounts.
    updateLengthGuardIndicator?.();
    // v3.32.24 — Restore per-round satisfaction set. Defaults to empty
    // for pre-v3.32.24 sessions where the field doesn't exist. The
    // Set is reconstructed from the serialized array; the rehydration
    // path in renderBeeStatusGrid (added v3.32.14) then walks it to
    // re-apply is-clean state on each card after the DOM is built.
    window._cleanThisRound = new Set(Array.isArray(s.cleanThisRound) ? s.cleanThisRound : []);
    // v3.32.26 — Restore per-session AI toggle set. Pre-v3.32.26
    // sessions don't have this field; in that case leave window.sessionAIs
    // undefined so initWorkScreen's reset path takes over and seeds it
    // with all activeAIs (which is the historical default behavior).
    if (Array.isArray(s.sessionAIs)) {
      window.sessionAIs = new Set(s.sessionAIs);
    }
    // v3.36.7 — Restore Deep Dive forensic capture. Pre-v3.36.7 sessions
    // don't have these fields; defaults preserve the post-fresh-load
    // state (empty buffer, no lastFailure). When Deep Dive is currently
    // off we still restore the buffer so a backup taken with Deep Dive
    // on retains its captures across reloads — toggling Deep Dive off
    // mid-session will still wipe the buffer (setDeepDive(off) clears
    // it), but reload alone preserves it.
    if (Array.isArray(s.ringBuffer)) {
      WF_DEBUG.ringBuffer = s.ringBuffer;
    }
    if (s.lastFailure && typeof s.lastFailure === 'object') {
      WF_DEBUG.lastFailure = s.lastFailure;
    }
    if (docText && phase === 'draft' && round > 1) phase = 'refine';
    if (s.notes) {
      const notesEl = document.getElementById('workNotes');
      if (notesEl) { notesEl.value = s.notes; updateNotesBtnPriority(); }
    }
    // v3.36.17 — Standing notes restore. Pre-v3.36.17 sessions don't
    // have this field; we leave the standing textarea empty (the
    // user's existing one-shot buffer migrates as-is into the new
    // one-shot field, which is the same DOM id #workNotes).
    if (s.standingNotes) {
      const standingEl = document.getElementById('workStandingNotes');
      if (standingEl) standingEl.value = s.standingNotes;
    }
    // Restore console HTML synchronously — inline with the rest of state
    // restore so there is no async gap between load and render during which
    // the DOM's default console HTML could be captured by an errant saveSession.
    if (s.consoleHTML) {
      const consoleEl = document.getElementById('liveConsole');
      if (consoleEl) consoleEl.innerHTML = s.consoleHTML;
    }
    return true;
  } catch(e) {
    // Last resort: try localStorage directly
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (!raw) return false;
      const s = JSON.parse(raw);
      round   = s.round   || 1;
      phase   = s.phase   || 'draft';
      history = s.history || [];
      docText = s.docText || '';
      if (s.projClockSeconds) _projClockSeconds = s.projClockSeconds;
      // v3.32.18 — fallback path also restores the override flag.
      window._lengthGuardOverride = !!s.lengthGuardOverride;
      // v3.32.28 — #6c indicator state follows restored flag (fallback path).
      updateLengthGuardIndicator?.();
      // v3.32.24 — fallback path also restores the satisfaction set.
      window._cleanThisRound = new Set(Array.isArray(s.cleanThisRound) ? s.cleanThisRound : []);
      // v3.32.26 — fallback path also restores the session toggle set.
      if (Array.isArray(s.sessionAIs)) {
        window.sessionAIs = new Set(s.sessionAIs);
      }
      // v3.36.7 — fallback path also restores Deep Dive forensic capture.
      if (Array.isArray(s.ringBuffer)) {
        WF_DEBUG.ringBuffer = s.ringBuffer;
      }
      if (s.lastFailure && typeof s.lastFailure === 'object') {
        WF_DEBUG.lastFailure = s.lastFailure;
      }
      if (docText && phase === 'draft' && round > 1) phase = 'refine';
      // Restore console HTML in the fallback path too (see main path)
      if (s.consoleHTML) {
        const consoleEl = document.getElementById('liveConsole');
        if (consoleEl) consoleEl.innerHTML = s.consoleHTML;
      }
      return true;
    } catch(e2) { return false; }
  }
}
