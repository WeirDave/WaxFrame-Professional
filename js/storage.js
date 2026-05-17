// ============================================================
//  WaxFrame — storage.js
//  Build: 20260516-008
//
//  Storage primitives. The foundation layer for all WaxFrame
//  state persistence. Pulled out of app.js in v3.45.0 as the
//  first storage extraction; higher-level save/load functions
//  (saveHive, saveProject, loadSettings, saveSession,
//  loadSession, backup/restore) remain in app.js for now and
//  will migrate here in future releases.
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
