// ============================================================
//  WaxFrame — storage.js
// Build: 20260615-005
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
      // v3.63.277 — Migration scaffold. e.oldVersion is the user's existing
      // schema (0 for a brand-new install); e.newVersion is IDB_VERSION above.
      // Every case ladders into the next, so when IDB_VERSION bumps to 2 the
      // existing user's old-version-1 db falls through case 1 → case 2 and
      // gets every intermediate migration. Today every case after the bootstrap
      // is a no-op — they exist so the next schema change is a one-line
      // addition, not a "should we add migration plumbing?" discussion.
      switch (e.oldVersion) {
        case 0:
          // Bootstrap: create the session store.
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
          // fallthrough to future bumps
        // case 1:
        //   // Reserved for IDB_VERSION = 2.
        //   break;
        default:
          break;
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

// ── CROSS-TAB COORDINATION ──
// v3.63.277 — Without this, two tabs open on the same session were a
// last-write-wins corruption hazard: Tab A finishes Round 5, writes IDB
// state; Tab B was still on Round 3, writes its IDB state ~later → Tab A's
// two completed rounds get clobbered. BroadcastChannel lets the tabs talk
// to each other directly (browser-native, no polling). On every successful
// IDB write we broadcast {tabId, round, ts}. When another tab's broadcast
// arrives with a HIGHER round than ours, we pin a sticky banner telling the
// user to reload — clobbering would otherwise happen on this tab's next save.
const _wfTabId = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'tab-' + Math.floor(Date.now() + Math.random() * 1e9).toString(36);
let _wfBroadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    _wfBroadcastChannel = new BroadcastChannel('waxframe-session');
    _wfBroadcastChannel.onmessage = (e) => {
      const m = e && e.data;
      if (!m || m.tabId === _wfTabId || m.type !== 'session-write') return;
      const myRound = (typeof window.round === 'number') ? window.round : 0;
      if (typeof m.round === 'number' && m.round > myRound) {
        // Another tab is ahead. Pin the banner so this tab doesn't clobber.
        _showCrossTabConflictBanner(m.round, myRound);
      }
    };
  }
} catch (e) {
  // BroadcastChannel can throw in private-mode browsers or strict iframe
  // contexts — fall back to single-tab semantics silently.
  _wfBroadcastChannel = null;
}

function _broadcastSessionWrite(roundValue) {
  if (!_wfBroadcastChannel) return;
  try {
    _wfBroadcastChannel.postMessage({
      type: 'session-write',
      tabId: _wfTabId,
      round: roundValue,
      ts:    Date.now()
    });
  } catch (e) { /* defensive — channel may have closed */ }
}

// ══════════════════════════════════════════════════════════════════════
// v3.63.302 — PER-KEY SCHEMA VERSIONING CONVENTION
// ══════════════════════════════════════════════════════════════════════
// Closes the last open item on backlog #6 (localStorage migration audit).
// The v3.63.294 static AST pass + v3.63.300 runtime verification settled
// "what shape lives at each key today." This convention answers the next
// question: "what shape am I LOOKING AT right now?"
//
// THE RULE
//   • Object-shape payloads in localStorage may carry a top-level
//     `schema_version: <integer>` field.
//   • Readers default to version 1 when the field is absent. Every payload
//     written before v3.63.302 is implicitly v1 — no localStorage in the
//     wild needs to be touched.
//   • Writers stamp the version on every save via wfWriteVersioned().
//   • Future shape changes bump currentVersion and supply a migrator
//     callback `{ 2: v1=>v2, 3: v2=>v3, … }` to wfReadVersioned().
//   • Newer-than-known payloads (downgrade case) are returned UNCHANGED
//     with a console warn — never stomped. A user who upgraded WaxFrame
//     on machine A and downgraded on machine B keeps their data.
//
// WHY OPT-IN, NOT BULK-RETROFIT
//   42 unique localStorage keys today. Stamping all of them at once
//   would touch dozens of read/write sites and risk breaking something
//   that doesn't need fixing. Instead: helpers live here, the convention
//   is documented, and EACH key adopts the helpers as its shape evolves
//   or as someone touches its read/write path for another reason. The
//   v3.63.302 release adopts the convention on two representative keys
//   (waxframe_models_${providerId} and waxframe_recommend_${cacheId}) so
//   future maintainers have working examples next to the helper.
//
// NON-OBJECT PAYLOADS (string toggles like 'true'/'false', single ids,
// theme names) are exempt — the convention is for object shapes only.
// Adding a version wrapper to a 1-character toggle is overkill.
//
// INTERACTION WITH THE CHECKPOINT-FILE FORMAT (v6 envelope)
// The checkpoint-file format already has its own `version` field at the
// outer envelope level — that's a different problem (export/import file
// shape) and is unaffected by this convention. The two coexist cleanly:
// per-key schema_version inside the payload, file-envelope version
// outside it.

// wfReadVersioned(key, currentVersion, migrators?) — read a versioned
// payload from localStorage, applying any needed migrators in order to
// upgrade it to currentVersion. Returns null when the key is absent or
// the JSON is invalid. Returns the payload object on success.
//
//   key:            localStorage key (string)
//   currentVersion: the integer schema the caller wants to operate on
//   migrators:      optional { [version]: (payload) => payload } map.
//                   Keys are the version BEING UPGRADED TO; e.g. the
//                   v1→v2 transform sits at migrators[2].
function wfReadVersioned(key, currentVersion, migrators) {
  if (!key) return null;
  let raw;
  try { raw = localStorage.getItem(key); } catch (e) { return null; }
  if (raw == null) return null;
  let payload;
  try { payload = JSON.parse(raw); } catch (e) { return null; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    // Non-object payload — convention doesn't apply; return as-is so
    // callers that opt in can still use the helper safely on edge data.
    return payload;
  }
  // v1 default — pre-convention payloads have no schema_version field.
  let v = (typeof payload.schema_version === 'number' && payload.schema_version > 0)
    ? payload.schema_version
    : 1;
  if (v > currentVersion) {
    console.warn(`[wfReadVersioned] ${key} has schema_version=${v} but reader expects v${currentVersion} — returning unchanged (newer data preserved).`);
    return payload;
  }
  while (v < currentVersion) {
    const migrator = migrators && migrators[v + 1];
    if (typeof migrator !== 'function') {
      console.warn(`[wfReadVersioned] ${key} v${v}→v${v + 1} migrator missing — returning at v${v}.`);
      return payload;
    }
    try {
      payload = migrator(payload);
    } catch (e) {
      console.warn(`[wfReadVersioned] ${key} migrator v${v}→v${v + 1} threw:`, e);
      return payload;
    }
    v++;
  }
  return payload;
}

// wfWriteVersioned(key, payload, currentVersion) — serialize and store an
// object payload with schema_version stamped at the top level. Quota /
// privacy-mode write failures return false; success returns true.
// Non-object payloads are rejected (the convention is for object shapes
// — caller can fall back to plain localStorage.setItem for primitives).
function wfWriteVersioned(key, payload, currentVersion) {
  if (!key || !payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const v = (typeof currentVersion === 'number' && currentVersion > 0) ? currentVersion : 1;
  // Copy + stamp so the caller's payload isn't mutated (their working copy
  // shouldn't acquire a schema_version field as a side effect of saving).
  const versioned = Object.assign({}, payload, { schema_version: v });
  try {
    localStorage.setItem(key, JSON.stringify(versioned));
    return true;
  } catch (e) {
    console.warn(`[wfWriteVersioned] ${key} write failed:`, e);
    return false;
  }
}

// Expose globally for cross-script use (api.js + app.js + future readers).
// Same pattern as the other storage primitives at the top of this file.
if (typeof window !== 'undefined') {
  window.wfReadVersioned  = wfReadVersioned;
  window.wfWriteVersioned = wfWriteVersioned;
}

function _showCrossTabConflictBanner(otherRound, myRound) {
  let banner = document.getElementById('wfCrossTabBanner');
  if (banner) { banner.style.display = ''; return; }
  banner = document.createElement('div');
  banner.id = 'wfCrossTabBanner';
  banner.className = 'cross-tab-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML =
    '<strong>⚠ Another tab is editing this session.</strong>' +
    ` <span>This tab is at round ${myRound}; the other tab is at round ${otherRound}. Reload here to load their state, or your next save will overwrite theirs.</span>` +
    ' <button type="button" class="btn cross-tab-reload">↻ Reload this tab</button>' +
    ' <button type="button" class="btn cross-tab-dismiss" aria-label="Dismiss">✕</button>';
  document.body.insertBefore(banner, document.body.firstChild);
  banner.querySelector('.cross-tab-reload').onclick  = () => location.reload();
  banner.querySelector('.cross-tab-dismiss').onclick = () => banner.remove();
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
      // v3.63.280 — Defensive typeof guard: storage.js loads BEFORE app.js
      // (see load-order comment at the top of this file). If app.js fails
      // to parse (CDN hiccup, bad release, dev typo), every save error in
      // here calls an undefined consoleLog and the surrounding catch
      // swallows it. The guard lets the toast / banner fallbacks still
      // surface even when the live-console pane never mounted.
      if (typeof consoleLog === 'function') consoleLog(`⚠️ Storage is ${pct}% full (${Math.round(usage/1024/1024)}MB of ${Math.round(quota/1024/1024)}MB used). Consider exporting your session to avoid data loss.`, 'warn');
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
  // v3.63.276 — Return the chain so external callers can await it. The
  // pre-v3.63.276 function returned undefined, which meant `await saveSession()`
  // resolved instantly while the actual write was still in flight; callers
  // that needed to read the persisted state immediately afterwards (e.g.
  // _writeCheckpoint's `await saveSession(); await idbGet()` pattern) read
  // the previous snapshot.
  _saveSessionChain = _saveSessionChain.then(async () => {
    // ── Primary: IndexedDB (no size limit) ──
    try {
      await idbSet(session);
      try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(e) {}
      checkStorageQuota();
      // v3.63.276 — Clear the persistence-broken banner on a successful write,
      // in case it had been raised by a prior fallback failure.
      _clearPersistenceBrokenBanner();
      // v3.63.277 — Tell every other tab on this origin that we just advanced
      // the session's round. They'll pin a banner if they're behind. Single-
      // tab use is unaffected (no other listeners means the broadcast is a
      // no-op from the user's perspective).
      _broadcastSessionWrite(session.round);

      // Persistent-storage retry every 3 rounds if not yet granted.
      if (history.length > 0 && history.length % 3 === 0 &&
          !window._storagePersistent && navigator.storage?.persist) {
        try {
          window._storagePersistent = await navigator.storage.persist();
        } catch(e) { /* ignore */ }
      }
    } catch(e) {
      // IDB failed — fall back to localStorage.
      // v3.63.280 — typeof guard (see checkStorageQuota for rationale).
      if (typeof consoleLog === 'function') consoleLog(`❌ Session save failed (IndexedDB error: ${e.message}). Trying localStorage fallback…`, 'error', {
        status:  'IDB_ERROR',
        rawJson: e.stack || e.message || String(e)
      });
      try {
        localStorage.setItem(LS_SESSION, JSON.stringify(session));
        try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(ee) {}
      } catch(lsErr) {
        if (lsErr.name === 'QuotaExceededError') {
          // v3.63.276 — Pin a persistent banner and HALT rounds until the
          // user exports. Pre-v3.63.276 only logged to the live console,
          // which meant the user could keep clicking Smoke the Hive and
          // see a green "round complete" UI while nothing was being saved.
          // The flag at window._persistenceBroken is checked by runRound
          // and runBuilderOnly before they spend any new API budget.
          window._persistenceBroken = true;
          if (typeof consoleLog === 'function') consoleLog(`❌ Storage full — session could not be saved. Rounds halted until you export and clear browser storage.`, 'error', {
            status:  'QUOTA_EXCEEDED',
            rawJson: `Browser storage quota exceeded.\n\nAction: click "Export Transcript Now" below, then clear browser storage for this site, then reload.\n\nOriginal error: ${lsErr.message}`
          });
          _showPersistenceBrokenBanner();
        } else {
          if (typeof consoleLog === 'function') consoleLog(`❌ Session save failed: ${lsErr.message}`, 'error', {
            status:  'STORAGE_FAIL',
            rawJson: lsErr.stack || lsErr.message || String(lsErr)
          });
        }
      }
    }
  });

  saveProject(); // keep project fields in sync (synchronous, doesn't need to be in the chain)
  // v3.63.276 — Expose the chain so awaitable callers (e.g. _writeCheckpoint)
  // see the actual write complete, not return immediately on undefined.
  return _saveSessionChain;
}

// v3.63.276 — Persistence-broken sticky banner. Raised when the LS-fallback
// after IDB quota failure ALSO fails (5MB cap hit). Stays visible until either
// a successful save clears it or the user reloads after exporting + clearing
// browser storage. Without this, the UI lied: rounds kept appearing to save
// while nothing was actually being persisted, and the loss became visible
// only on reload.
function _showPersistenceBrokenBanner() {
  let banner = document.getElementById('wfPersistenceBrokenBanner');
  if (banner) { banner.style.display = ''; return; }
  banner = document.createElement('div');
  banner.id = 'wfPersistenceBrokenBanner';
  banner.className = 'persistence-broken-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML =
    '<strong>⚠ Storage full — your work is no longer being saved.</strong>' +
    ' <span>Rounds are halted to prevent silent loss. Export your transcript, then clear browser storage for this site, then reload.</span>' +
    ' <button type="button" class="btn persistence-broken-export">💾 Export Transcript Now</button>';
  document.body.insertBefore(banner, document.body.firstChild);
  const btn = banner.querySelector('.persistence-broken-export');
  if (btn && typeof exportTranscript === 'function') btn.onclick = exportTranscript;
}

function _clearPersistenceBrokenBanner() {
  if (!window._persistenceBroken) return;
  window._persistenceBroken = false;
  const banner = document.getElementById('wfPersistenceBrokenBanner');
  if (banner) banner.remove();
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
  // v3.63.307 — Variants of default AIs ride sibling rows in the hive
  // grid sharing one parent key (see addAIVariant() in app.js). Persist
  // parentId + model on the way through normalize so reload survives.
  // parentId gets the same id-slug treatment; bad/missing → drop the
  // variant marker so the row degrades to a plain custom (won't render
  // nested under any parent, but doesn't blow up).
  if (ai.parentId != null) {
    const slugged = slug(ai.parentId);
    if (slugged) ai.parentId = slugged;
    else delete ai.parentId;
  }
  if (ai.model != null) ai.model = String(ai.model).slice(0, 200);
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
    // v3.63.276 — Narrow the JSON.parse try/catch and stash the bad blob
    // before re-throwing. Pre-v3.63.276 the broad function-level catch
    // swallowed the parse error AFTER `aiList = DEFAULT_AIS` had already
    // been assigned, so loadSettings returned false with aiList silently
    // wiped to defaults — and the next saveHive() (any setup-grid render)
    // overwrote the recoverable blob with the defaults. Permanent silent
    // hive loss from one corrupt byte. Now: any parse failure stashes the
    // raw bytes to LS_HIVE_RECOVERY, raises a toast, and bails BEFORE
    // aiList is touched.
    let h;
    try {
      h = JSON.parse(hiveData);
    } catch (parseErr) {
      try { localStorage.setItem('waxframe_v2_hive_recovery', hiveData); } catch (e) {}
      if (typeof consoleLog === 'function') {
        consoleLog(`❌ Hive blob failed to parse — original stashed to localStorage["waxframe_v2_hive_recovery"]. Do NOT click Save Settings before inspecting.`, 'error', {
          status:  'HIVE_PARSE_FAILED',
          rawJson: parseErr.stack || parseErr.message || String(parseErr)
        });
      }
      if (typeof toast === 'function') {
        toast('⚠️ Saved AI list could not be loaded. Original stashed under waxframe_v2_hive_recovery. Do NOT click Save Settings until you check it.', 18000);
      }
      console.error('[loadSettings] LS_HIVE parse failed; stashed original to LS_HIVE_RECOVERY:', parseErr);
      return false;
    }

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

    // v3.63.307 — Orphan-variant sweep. If a saved variant's parentId no
    // longer resolves to an aiList entry (parent removed, demoted, or the
    // hive blob got into a weird state), drop the variant. Without this,
    // the row would render with a placeholder parent name AND still try
    // to ride a provider key the user can't see — confusing.
    const _knownIds = new Set(aiList.map(a => a.id));
    aiList = aiList.filter(a => {
      if (!a.parentId) return true;
      if (_knownIds.has(a.parentId)) return true;
      if (typeof consoleLog === 'function') {
        consoleLog(`🧹 Dropped orphan variant "${a.name}" — parent "${a.parentId}" not in current hive.`, 'info');
      }
      return false;
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
                             nudge. Navigates to the Checkpoints screen
                             (#screen-checkpoint in index.html) in Save mode.
                             Screen's Save button calls confirmSaveCheckpoint
                             which delegates to _writeCheckpoint(scope).
   importSession           — entry point wired to the nav menu. Navigates
                             to the Checkpoints screen in Restore mode
                             (intro state with trust warning + Choose File
                             button). The screen's Choose File button calls
                             chooseCheckpointFile() which opens the file
                             picker, parses + validates, hands off to
                             _populateRestoreCheckpointDiff(data).
   switchCheckpointMode    — toggles between Save and Restore panels.
   chooseCheckpointFile    — opens the system file picker for Restore mode.
   confirmSaveCheckpoint   — reads the Save panel's checkbox state, calls
                             _writeCheckpoint with a 9-key scope object.
   confirmRestoreCheckpoint— reads the Restore panel's checkbox state,
                             calls _applyCheckpoint with a 9-key scope.
   _writeCheckpoint(scope) — assembles a format-v6 envelope based on scope,
                             SPLICES LS_HIVE/LS_PROJECT into the file with
                             only the ticked sub-sections, writes the file.
                             Internal — never call directly from UI.
   _applyCheckpoint        — granular merge: ticked sub-sections overwrite
                             local fields; everything else stays
                             byte-for-byte. Reloads to apply.

   Format history:
     v6 (v3.63.227+) — 9-key granular scope. _waxframe_backup_scope is now
                       {projectInfo, refMaterial, startingDoc, session,
                        aiList, models, keys, builder, license}. The
                       LS_PROJECT and LS_HIVE blobs are SPLICED at save
                       time — they contain only the field subsets the user
                       ticked, not the full blob with sub-sections zeroed.
                       Importer detects v6 by version field and applies the
                       9-key scope directly. v5 files still importable —
                       the importer maps v5's 6-key scope onto the 9-key
                       availability mask by inspecting which sub-fields are
                       actually present in the file's LS_PROJECT / LS_HIVE.
     v5 (v3.63.130+) — selective EXPORT (6-key scope: project, session,
                       hive, keys, builder, license). Unticked sub-sections
                       inside hive zeroed sub-fields; v5 importer's
                       "preserve local on null" semantics maintained.
                       The Save Checkpoint (Scrubbed) menu item +
                       backupSessionScrubbed/scrubBackup helpers +
                       _waxframe_backup_scrubbed import branch all retired
                       in this release. _redactSecretsDeep / _redactHiveKeys /
                       _redactSessionContent kept (still used by help.html
                       for the diagnostic-bundle flow).
     v4 (v3.24.0+)   — referenceDocs as an array (vs single doc earlier).
                       Legacy scrubbed checkpoints from v3.63.59-129 may
                       carry _waxframe_backup_scrubbed: true on a v4
                       envelope; with no users in the wild, the import
                       branch was dropped in v3.63.130. If such a file ever
                       surfaces it imports via the v4 default path, but null
                       license fields now preserve the local license rather
                       than clearing it.
     v3 (v3.21.12+)  — LS_SESSION_MIRROR removed (IDB became source of truth).
     v2 (v3.21.10/11)— LS_SESSION_MIRROR present alongside LS_SESSION.
   ============================================================= */

// v3.63.227 — Save Checkpoint scope keys (used by both the Save and Restore
// modals). Each key corresponds to a single checkbox row, and each row maps
// to a specific subset of JSON fields inside the checkpoint envelope. The
// modals stay in sync with this list — order, labels, and JSON-field
// descriptions all derive from these definitions.
//
// Field mapping (the file format v6 envelope splices these into LS_PROJECT
// and LS_HIVE blobs based on which keys are true at save time):
//
//   projectInfo    → LS_PROJECT.{projectName, projectVersion, goalDocType,
//                                goalAudience, goalOutcome, goalScope,
//                                goalTone, goalNotes, exportMask, lengthMode,
//                                lengthLimit, lengthMin, lengthUnit, docTab}
//   refMaterial    → LS_PROJECT.referenceDocs
//   startingDoc    → LS_PROJECT.pastedDocument
//   session        → IDB_SESSION (history, docText, consoleHTML, notes,
//                                 standingNotes, ringBuffer, lastFailure)
//                  + LS_SESSION (legacy, almost always null)
//   aiList         → LS_HIVE.{activeAIIds, knownDefaultIds, hiveMode,
//                             customAIs, customAIConfigs}
//   models         → LS_HIVE.models (per-AI model picks)
//   keys           → LS_HIVE.keys (per-AI API keys)
//   builder        → LS_HIVE.builder (which AI is Builder)
//   license        → LS_LICENSE
const _CHECKPOINT_SCOPE_KEYS = [
  'projectInfo', 'refMaterial', 'startingDoc',
  'session',
  'aiList', 'models', 'keys', 'builder',
  'license'
];

// Project sub-field groups for splice/merge. Keep this in sync with
// saveProject() in this file — when new project fields are added, decide
// which sub-section they belong to and update both places.
const _PROJECT_INFO_FIELDS = [
  'projectName', 'projectVersion',
  'goalDocType', 'goalAudience', 'goalOutcome', 'goalScope', 'goalTone', 'goalNotes',
  'exportMask',
  'lengthMode', 'lengthLimit', 'lengthMin', 'lengthUnit',
  'docTab'
];
// Hive AI-list sub-field group. The hive blob's keys/models/builder are
// handled separately as their own scope sections.
const _HIVE_LIST_FIELDS = [
  'activeAIIds', 'knownDefaultIds', 'hiveMode', 'customAIs', 'customAIConfigs'
];

// v3.63.227 — Checkpoint return-screen tracker. Set by backupSession() /
// importSession() to remember which screen the user was on when they
// entered the Checkpoint screen, so the ← Back button returns there.
// Mirrors _settingsReturnScreen for the Settings screen.
let _checkpointReturnScreen = 'screen-work';

// Entry point for SAVE mode — wired to the nav menu's "💾 Checkpoint - Save"
// button and to the first-run nudge's "Save a checkpoint" button (via
// firstRunDoBackup in app.js). Navigates to the Checkpoints screen, sets
// Save mode, refreshes Current-state summaries.
function backupSession() {
  const active = document.querySelector('.screen.active');
  if (active && active.id && active.id !== 'screen-checkpoint') {
    _checkpointReturnScreen = active.id;
  }
  if (typeof goToScreen === 'function') goToScreen('screen-checkpoint');
  switchCheckpointMode('save');
  closeNavMenu();
}

// Entry point for RESTORE mode — wired to the nav menu's "📂 Checkpoint -
// Restore" button. Navigates to the screen and switches to Restore mode in
// its initial "intro" state (trust warning + Choose File button visible).
function importSession() {
  const active = document.querySelector('.screen.active');
  if (active && active.id && active.id !== 'screen-checkpoint') {
    _checkpointReturnScreen = active.id;
  }
  if (typeof goToScreen === 'function') goToScreen('screen-checkpoint');
  switchCheckpointMode('restore');
  closeNavMenu();
}

// v3.63.227 — Toggle the screen between Save mode and Restore mode. Updates
// the mode pills' active class, shows/hides the two panels, and refreshes
// any panel-specific state. Restore mode always reverts to its "intro"
// state on switch (so the user re-confirms the trust warning before
// re-picking a file).
function switchCheckpointMode(mode) {
  const savePill    = document.getElementById('chkModeSavePill');
  const restorePill = document.getElementById('chkModeRestorePill');
  const savePanel   = document.getElementById('chkSavePanel');
  const restorePanel= document.getElementById('chkRestorePanel');
  const restoreIntro= document.getElementById('chkRestoreIntro');
  const restoreDiff = document.getElementById('chkRestoreDiff');
  if (!savePanel || !restorePanel) return;

  if (mode === 'restore') {
    if (savePill)    savePill.classList.remove('active');
    if (restorePill) restorePill.classList.add('active');
    savePanel.style.display    = 'none';
    restorePanel.classList.remove('is-hidden');
    if (restoreIntro) restoreIntro.style.display = '';
    if (restoreDiff)  restoreDiff.classList.add('is-hidden');
    // Clear any prior stash so a Save → Restore toggle never leaks parsed
    // data from a previous session. Also clear any stale error banner
    // from a previous bad-file pick.
    window._pendingRestoreData = null;
    window._pendingRestoreHas  = null;
    _clearRestoreError();
  } else {
    if (savePill)    savePill.classList.add('active');
    if (restorePill) restorePill.classList.remove('active');
    savePanel.style.display    = '';
    restorePanel.classList.add('is-hidden');
    // v3.63.261 — Save mode now defaults to ALL sections ticked. The
    // user-can-just-click-through default produces a *complete* checkpoint
    // (everything in one file) rather than the prior "safe partial" that
    // omitted hive/models/keys/builder. Rationale: if the user doesn't
    // read the descriptions, the worst outcome should be "I have a
    // larger-than-necessary backup" — not "I made a backup but forgot
    // half the things I needed to restore." The API-keys row's
    // description already warns "Sensitive — leave off when sharing the
    // file with anyone else" — users who care will see it and untick;
    // users who don't read are usually saving for themselves and benefit
    // from getting the keys in the file.
    // v3.63.278 — keys + license default OFF. Pre-v3.63.278 every row
    // pre-ticked, including the API-keys row. A user who clicked Save
    // without reading the row's "Sensitive — leave off when sharing"
    // warning shipped their API keys inside the JSON file, with no
    // recoverable safety once the file was attached to an email / posted
    // in chat / shared with a colleague. Two clicks now ("API keys" then
    // "License key") is the explicit opt-in path for personal backups;
    // the "Select All" pill at the top of the panel restores the prior
    // one-click "full restore" behavior for users who want it.
    _setSaveCheckpointDefaults({
      projectInfo:true, refMaterial:true, startingDoc:true,
      session:true,
      aiList:true, models:true, keys:false, builder:true,
      license:false
    });
    _refreshSaveCheckpointCurrentSummaries();
  }
}

function _setSaveCheckpointDefaults(defaults) {
  for (const key of _CHECKPOINT_SCOPE_KEYS) {
    const el = document.getElementById('saveScope' + key[0].toUpperCase() + key.slice(1));
    if (el) el.checked = !!defaults[key];
  }
}

// Reads the live state and populates each Save panel row's "Current" cell
// with the same summary helpers used by the Restore panel — a preview of
// what's about to land in the file.
async function _refreshSaveCheckpointCurrentSummaries() {
  const projectRaw = localStorage.getItem(LS_PROJECT);
  const liveProject = (() => { try { return projectRaw ? JSON.parse(projectRaw) : null; } catch(_) { return null; } })();
  const hiveRaw    = localStorage.getItem(LS_HIVE);
  const liveHive   = (() => { try { return hiveRaw ? JSON.parse(hiveRaw) : null; } catch(_) { return null; } })();
  const licenseRaw = localStorage.getItem(LS_LICENSE);
  let liveSessionIDB = null;
  try { liveSessionIDB = await idbGet(); } catch(_) { liveSessionIDB = null; }

  const summaries = {
    projectInfo: _restoreSummarizeProjectInfo(liveProject),
    refMaterial: _restoreSummarizeRefMaterial(liveProject),
    startingDoc: _restoreSummarizeStartingDoc(liveProject),
    session:     _restoreSummarizeSession(liveSessionIDB),
    aiList:      _restoreSummarizeAIList(liveHive),
    models:      _restoreSummarizeModels(liveHive),
    keys:        _restoreSummarizeKeys(liveHive),
    builder:     _restoreSummarizeBuilder(liveHive),
    license:     _restoreSummarizeLicense(licenseRaw),
  };
  for (const key of _CHECKPOINT_SCOPE_KEYS) {
    const cap = key[0].toUpperCase() + key.slice(1);
    const el = document.getElementById('saveCurrent' + cap);
    // v3.63.261 — Sensitive rows (license) return an HTML string
    // with a masked value + reveal button. The helper detects HTML and
    // sets innerHTML; plain summaries still use textContent. See
    // _checkpointSecretHTML / _setCheckpointPreviewValue.
    _setCheckpointPreviewValue(el, summaries[key]);
  }
  // v3.63.263 — Stash the live state so the expand-on-click detail
  // panels (Phase B) can read fresh data on first expand without
  // re-awaiting IDB or re-parsing localStorage. Reset on every refresh
  // so the cache never lags behind the panel's rendered summary.
  window._checkpointDataCache = window._checkpointDataCache || {};
  window._checkpointDataCache.live = {
    project:    liveProject,
    hive:       liveHive,
    sessionIdb: liveSessionIDB,
    licenseRaw: licenseRaw,
  };
  // Re-init the expand UI in case markup was just (re-)mounted.
  _initCheckpointExpandUI();
}

// v3.63.229 — Bulk select-all / select-none for the active panel. Skips
// disabled checkboxes (sections the file doesn't carry, in Restore mode).
// Wired to the toolbar at the top of each panel.
function checkpointSelectAll(mode) {
  const prefix = mode === 'save' ? 'saveScope' : 'restoreScope';
  for (const key of _CHECKPOINT_SCOPE_KEYS) {
    const cap = key[0].toUpperCase() + key.slice(1);
    const el = document.getElementById(prefix + cap);
    if (el && !el.disabled) el.checked = true;
  }
}
function checkpointSelectNone(mode) {
  const prefix = mode === 'save' ? 'saveScope' : 'restoreScope';
  for (const key of _CHECKPOINT_SCOPE_KEYS) {
    const cap = key[0].toUpperCase() + key.slice(1);
    const el = document.getElementById(prefix + cap);
    if (el && !el.disabled) el.checked = false;
  }
}

// v3.63.227 — Back button handler. Returns to whichever screen the user
// was on when they entered Checkpoints.
function exitCheckpointScreen() {
  if (typeof goToScreen === 'function') {
    goToScreen(_checkpointReturnScreen || 'screen-work');
  }
}

// v3.63.231 — Show/hide the inline error banner in the Restore intro
// panel. The banner sits between the trust warning and the Choose File
// button so the user sees it where they're actually looking; the prior
// toast at page bottom was getting lost below the fold behind the long
// Checkpoints screen content.
function _showRestoreError(title, body) {
  const wrap = document.getElementById('chkRestoreError');
  const t    = document.getElementById('chkRestoreErrorTitle');
  const b    = document.getElementById('chkRestoreErrorBody');
  if (t) t.textContent = title;
  if (b) b.textContent = body;
  if (wrap) wrap.classList.add('active');
}
function _clearRestoreError() {
  document.getElementById('chkRestoreError')?.classList.remove('active');
}

// v3.63.227 — File picker for Restore mode. Opens the system file picker;
// on selection, parses the JSON, validates the envelope magic flag, then
// hands off to _populateRestoreCheckpointDiff() which fills the 9 rows of
// the diff view and swaps the Restore panel from intro state to diff state.
// v3.63.231 — Failures now surface as an inline error banner in the intro
// panel. Each new pick clears the prior error first.
async function chooseCheckpointFile() {
  _clearRestoreError();
  // v3.63.326 — Smart picker. When the browser supports the File System
  // Access API AND the user has configured a backup sync folder
  // (Settings → Backup Sync → Pick folder), use showOpenFilePicker with
  // startIn:<folder> so the OS dialog opens pre-navigated to that
  // folder. Closes backlog #3 part (d) without adding a separate "Load
  // from folder" button — the existing Choose Checkpoint File button
  // just gets smarter defaults for users who've set up auto-backup.
  // Firefox/Safari + browsers/sessions without a folder set fall
  // through to the legacy <input type="file"> path unchanged.
  if (_fsaSupported() && typeof window.showOpenFilePicker === 'function') {
    let storedDir = null;
    try { storedDir = await _fsaGetStoredHandle(); } catch (e) { /* fall through */ }
    if (storedDir) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          startIn: storedDir,
          types: [{ description: 'WaxFrame Checkpoint', accept: { 'application/json': ['.json'] } }],
          excludeAcceptAllOption: false,
          multiple: false,
        });
        if (!fileHandle) return;
        const file = await fileHandle.getFile();
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          if (data._waxframe_diagnostic && !data._waxframe_backup) {
            _showRestoreError(
              "That's a Diagnostic Bundle, not a checkpoint",
              "Diagnostic Bundles are export-only — they strip your keys for sending to support. They can't restore a session. Pick a Checkpoint file instead (the one with \"Checkpoint\" in the filename)."
            );
            return;
          }
          if (!data._waxframe_backup) {
            _showRestoreError(
              'Not a WaxFrame checkpoint',
              "That JSON file doesn't look like a WaxFrame checkpoint. Checkpoints have \"Checkpoint\" in the filename and are produced by the \"Checkpoint - Save\" option in this app. Please double-check the file you are trying to restore."
            );
            return;
          }
          await _populateRestoreCheckpointDiff(data);
        } catch (parseErr) {
          _showRestoreError(
            'Could not read that file',
            "The file isn't valid JSON. Make sure you picked the .json file produced by Checkpoint - Save (not a renamed or truncated copy), then try again."
          );
        }
        return;
      } catch (e) {
        // AbortError = user canceled the picker — silent return.
        // Anything else falls through to the legacy <input type="file">
        // path so the user still has a way in even if the FSA path
        // throws something unexpected.
        if (e && e.name === 'AbortError') return;
        console.warn('[checkpoint] FSA open picker failed, falling back to input[type=file]:', e);
      }
    }
  }
  // Legacy fallback path: Firefox/Safari, or FSA-capable browsers
  // without a configured backup folder. Unchanged from v3.63.227.
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
        // Diagnostic bundles are export-only (carry _waxframe_diagnostic but
        // not _waxframe_backup) — friendly callout so the user knows why
        // their support-bundle file can't restore.
        if (data._waxframe_diagnostic && !data._waxframe_backup) {
          _showRestoreError(
            'That\'s a Diagnostic Bundle, not a checkpoint',
            'Diagnostic Bundles are export-only — they strip your keys for sending to support. They can\'t restore a session. Pick a Checkpoint file instead (the one with "Checkpoint" in the filename).'
          );
          return;
        }
        if (!data._waxframe_backup) {
          _showRestoreError(
            'Not a WaxFrame checkpoint',
            'That JSON file doesn\'t look like a WaxFrame checkpoint. Checkpoints have "Checkpoint" in the filename and are produced by the "Checkpoint - Save" option in this app. Please double check the file you are trying to restore.'
          );
          return;
        }
        await _populateRestoreCheckpointDiff(data);
      } catch(e) {
        _showRestoreError(
          'Could not read that file',
          'The file isn\'t valid JSON. Make sure you picked the .json file produced by Checkpoint - Save (not a renamed or truncated copy), then try again.'
        );
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

async function confirmSaveCheckpoint() {
  const scope = {};
  for (const key of _CHECKPOINT_SCOPE_KEYS) {
    const el = document.getElementById('saveScope' + key[0].toUpperCase() + key.slice(1));
    scope[key] = !!el?.checked;
  }
  // v3.63.318 / 319 — Smart-route based on browser support. Chrome / Edge /
  // Opera get the FSA folder picker; Firefox / Safari fall through to the
  // legacy download (Firefox surfaces its own Save-As dialog by default,
  // Safari drops to Downloads).
  //
  // v3.63.319 — User-activation timing fix. v3.63.318 called
  // _buildCheckpointEnvelope FIRST, then _fsaWriteEnvelopeToFolder
  // (which calls _fsaEnsureSyncDir → requestPermission / show
  // DirectoryPicker). Problem: _buildCheckpointEnvelope awaits a
  // saveSession flush + IDB read, which consumes Edge's transient user
  // activation. By the time _fsaEnsureSyncDir runs, user-gesture is
  // gone; requestPermission and showDirectoryPicker both require
  // gesture and silently reject. Result: David's button "does
  // absolutely nothing." Fix: acquire the directory handle FIRST while
  // the click's gesture is still fresh, THEN build the envelope (which
  // doesn't need a gesture), THEN write.
  if (_fsaSupported()) {
    const dir = await _fsaEnsureSyncDir(false);
    if (!dir) return;   // user canceled picker or permission denied — toast handled inside
    const env = await _buildCheckpointEnvelope(scope);
    if (!env) {
      toast('⚠️ Nothing to checkpoint — tick at least one section that has data');
      return;
    }
    try {
      const fileHandle = await dir.getFileHandle(env.filename, { create: true });
      const writable   = await fileHandle.createWritable();
      await writable.write(env.json);
      await writable.close();
      toast(`📁 Checkpoint saved — ${env.filename}`, 5500);
    } catch(e) {
      console.warn('[checkpoint] FSA write failed:', e);
      toast(`⚠️ Save to folder failed — ${e.message || e}`, 6000);
    }
    return;
  }
  await _writeCheckpoint(scope);
}

// v3.63.316 — Envelope builder extracted from _writeCheckpoint so the
// FSA "Save to folder" path (also v3.63.316) shares one source of truth
// for the scope splice + filename + blob. Returns { filename, json, blob,
// tagsToast, scope } or null if no sections had data — callers handle the
// destination (download anchor vs FileSystemFileHandle).
async function _buildCheckpointEnvelope(scope) {
  // v3.35.2 — Flush in-memory state to IDB before reading the snapshot.
  // Without this, a checkpoint taken while in-memory state hadn't yet been
  // auto-saved to IDB (e.g. right after setup, before any round has run)
  // would capture IDB_SESSION: null and the restore would not be a faithful
  // time-machine.
  try { await saveSession({ force: true }); } catch(e) { console.warn('[checkpoint] saveSession flush failed, proceeding with whatever is in IDB:', e); }

  const hiveRaw    = localStorage.getItem(LS_HIVE)    || null;
  const projectRaw = localStorage.getItem(LS_PROJECT) || null;
  const licenseRaw = localStorage.getItem(LS_LICENSE) || null;
  const sessionLS  = localStorage.getItem(LS_SESSION) || null;
  let sessionIDB   = null;
  try { sessionIDB = await idbGet(); } catch(e) { /* ignore */ }

  let outHive       = null;
  let outProject    = null;
  let outLicense    = null;
  let outSessionLS  = null;
  let outSessionIDB = null;

  if (scope.projectInfo || scope.refMaterial || scope.startingDoc) {
    let parsedProj;
    try { parsedProj = projectRaw ? JSON.parse(projectRaw) : null; } catch(_) { parsedProj = null; }
    if (parsedProj && typeof parsedProj === 'object') {
      const out = {};
      if (scope.projectInfo) {
        for (const k of _PROJECT_INFO_FIELDS) {
          if (parsedProj[k] !== undefined) out[k] = parsedProj[k];
        }
      }
      if (scope.refMaterial && parsedProj.referenceDocs !== undefined) {
        out.referenceDocs = parsedProj.referenceDocs;
      }
      if (scope.startingDoc && parsedProj.pastedDocument !== undefined) {
        out.pastedDocument = parsedProj.pastedDocument;
      }
      if (Object.keys(out).length) outProject = JSON.stringify(out);
    }
  }

  if (scope.aiList || scope.models || scope.keys || scope.builder) {
    let parsedHive;
    try { parsedHive = hiveRaw ? JSON.parse(hiveRaw) : null; } catch(_) { parsedHive = null; }
    if (parsedHive && typeof parsedHive === 'object') {
      const out = {};
      if (scope.aiList) {
        for (const k of _HIVE_LIST_FIELDS) {
          if (parsedHive[k] !== undefined) out[k] = parsedHive[k];
        }
      }
      if (scope.models  && parsedHive.models  !== undefined) out.models  = parsedHive.models;
      if (scope.keys    && parsedHive.keys    !== undefined) out.keys    = parsedHive.keys;
      if (scope.builder && parsedHive.builder !== undefined) out.builder = parsedHive.builder;
      if (Object.keys(out).length) outHive = JSON.stringify(out);
    }
  }

  if (scope.license && licenseRaw) outLicense = licenseRaw;
  let outRoundState = null;
  if (scope.session) {
    outSessionLS  = sessionLS;
    outSessionIDB = sessionIDB;
    const rs = {
      resolvedDecisions: localStorage.getItem('waxframe_resolved_decisions') || null,
      conflictLedger:    localStorage.getItem('waxframe_conflict_ledger')    || null,
      aiWarnings:        localStorage.getItem('waxframe_ai_warnings')        || null,
    };
    if (rs.resolvedDecisions || rs.conflictLedger || rs.aiWarnings) outRoundState = rs;
  }

  const captured = !!(outHive || outProject || outLicense || outSessionLS || outSessionIDB || outRoundState);
  if (!captured) return null;

  const checkpoint = {
    _waxframe_backup:         true,
    _waxframe_backup_version: 7,
    _waxframe_backup_scope:   { ...scope },
    _waxframe_app_version:    typeof APP_VERSION === 'string' ? APP_VERSION : '',
    _waxframe_backup_ts:      Date.now(),
    LS_HIVE:    outHive,
    LS_PROJECT: outProject,
    LS_LICENSE: outLicense,
    LS_SESSION: outSessionLS,
    IDB_SESSION: outSessionIDB,
    LS_ROUND_STATE: outRoundState,
  };

  const proj     = (() => { try { return JSON.parse(projectRaw || '{}'); } catch(e) { return {}; } })();
  const safeName = (proj.projectName    || 'session').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const safeVer  = (proj.projectVersion || '').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const baseName = safeVer ? `${safeName}-${safeVer}` : safeName;
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const filename = `${baseName}-WaxFrame-Checkpoint-${stamp}.json`;

  const json = JSON.stringify(checkpoint, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const tags = [];
  if (scope.projectInfo) tags.push('project info');
  if (scope.refMaterial) tags.push('ref material');
  if (scope.startingDoc) tags.push('starting doc');
  if (scope.session)     tags.push(sessionIDB ? `session (${sessionIDB.history?.length || 0} rounds)` : 'session (empty)');
  if (scope.aiList)      tags.push('AI list');
  if (scope.models)      tags.push('model picks');
  if (scope.keys)        tags.push('API keys');
  if (scope.builder)     tags.push('builder');
  if (scope.license)     tags.push('license');

  return { filename, json, blob, tags };
}

// Internal — the actual save logic. Reads live state, applies the 9-key
// granular scope (omitted sub-sections are spliced out of LS_PROJECT /
// LS_HIVE before write — the file carries only the fields the user
// ticked), writes a format-v6 envelope, streams it to a Blob download.
// v3.63.316 — Envelope-building extracted to _buildCheckpointEnvelope so
// _writeCheckpoint and _writeCheckpointToFolder share one source of truth.
async function _writeCheckpoint(scope) {
  const env = await _buildCheckpointEnvelope(scope);
  if (!env) {
    toast('⚠️ Nothing to checkpoint — tick at least one section that has data');
    return;
  }
  // 30s deferred URL.revokeObjectURL — see history at the prior backupSession
  // implementation (v3.21.19 / v3.21.21). Larger checkpoints need more
  // dispatcher time; 30s is well past the worst observed case.
  const url = URL.createObjectURL(env.blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = env.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast(`💾 Checkpoint saved — ${env.tags.join(', ')}`, 5000);
}

// ── FILE SYSTEM ACCESS API SUPPORT (v3.63.316) ──
// Backlog FEATURE #3 spike Phase 1. Detects whether the browser supports
// the File System Access API (Chrome/Edge/Opera; not Firefox or Safari),
// persists a chosen sync-folder handle in IDB so the picker doesn't
// re-prompt every save, and writes the checkpoint envelope into that
// folder via FileSystemFileHandle.createWritable(). Load-from-folder
// (and auto-save every N seconds) deferred to Phase 2 — Phase 1 is just
// proving the round-trip feels good enough to be worth the rest.
//
// Default folder hint: startIn:'documents' — opens the OS picker pre-
// navigated to ~/Documents (Mac) or C:\Users\<name>\Documents (Windows),
// matching backlog/David's request. The OS dialog always confirms the
// user's choice — we can suggest a start location, not silently pick.
// User typically creates or picks a "WaxFrame" subfolder there.
const _FSA_SYNC_DIR_KEY = 'waxframe_fsa_sync_dir';
function _fsaSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}
// Read/write the sync-folder handle from the same IDB store as the
// session blob (different key, no schema clash). FileSystemDirectoryHandle
// is structured-cloneable per the WHATWG spec, so it stores natively.
async function _fsaGetStoredHandle() {
  if (!_fsaSupported()) return null;
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(_FSA_SYNC_DIR_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    });
  } catch(e) { console.warn('[fsa] getStoredHandle failed:', e); return null; }
}
async function _fsaPutStoredHandle(handle) {
  if (!_fsaSupported()) return;
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).put(handle, _FSA_SYNC_DIR_KEY);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch(e) { console.warn('[fsa] putStoredHandle failed:', e); }
}
// Return a usable directory handle with readwrite permission. Prompts
// the picker when no handle is stored OR when the stored handle has
// gone stale (folder moved/deleted) OR when re-permission is denied.
// `forceRePick:true` skips the stored-handle path entirely — used when
// the user explicitly wants to change folders.
async function _fsaEnsureSyncDir(forceRePick = false) {
  if (!_fsaSupported()) {
    if (typeof toast === 'function') toast('⚠️ Save-to-folder needs Chrome, Edge, or Opera (not supported in this browser).', 5000);
    return null;
  }
  let handle = forceRePick ? null : await _fsaGetStoredHandle();
  if (handle) {
    try {
      const opts = { mode: 'readwrite' };
      let perm = await handle.queryPermission(opts);
      if (perm !== 'granted') perm = await handle.requestPermission(opts);
      if (perm !== 'granted') {
        if (typeof toast === 'function') toast(`⚠️ Sync folder permission ${perm || 'denied'} — picking a new folder.`, 4500);
        handle = null;
      }
    } catch(e) {
      // Stored handle is no longer usable (folder moved, deleted, or
      // permission rejected the request — Edge sometimes returns 'denied'
      // when transient user activation has been consumed). v3.63.323
      // surfaces this to the user via toast so silent failure stops
      // being silent. Drop it and re-prompt.
      console.warn('[fsa] stored handle unusable, re-prompting picker:', e);
      if (typeof toast === 'function') toast(`⚠️ Saved folder unreachable (${e?.name || 'error'}) — picking a new folder.`, 4500);
      handle = null;
    }
  }
  if (!handle) {
    try {
      handle = await window.showDirectoryPicker({
        id: 'waxframe-sync',     // Chrome remembers the last folder per id
        mode: 'readwrite',
        startIn: 'documents',
      });
      await _fsaPutStoredHandle(handle);
    } catch(e) {
      // AbortError = user canceled the picker dialog cleanly. Anything
      // else is a real failure; v3.63.323 surfaces it via toast (was
      // console.warn only, which David couldn't see in Edge while
      // debugging the silent-button-click problem).
      if (e && e.name === 'AbortError') return null;
      console.warn('[fsa] picker failed:', e);
      if (typeof toast === 'function') toast(`⚠️ Folder picker failed — ${e?.message || e?.name || 'unknown error'}`, 6000);
      return null;
    }
  }
  return handle;
}
// Write the v3.63.316 checkpoint envelope to the synced folder. Same
// filename pattern as the download path (timestamped, never overwrites
// a prior save). Returns the relative filename on success or null on
// failure.
async function _fsaWriteEnvelopeToFolder(env) {
  const dir = await _fsaEnsureSyncDir(false);
  if (!dir) return null;
  try {
    const fileHandle = await dir.getFileHandle(env.filename, { create: true });
    const writable   = await fileHandle.createWritable();
    await writable.write(env.json);
    await writable.close();
    return env.filename;
  } catch(e) {
    console.warn('[fsa] write failed:', e);
    if (typeof toast === 'function') toast(`⚠️ Save to folder failed — ${e.message || e}`, 6000);
    return null;
  }
}
// ── AUTO-BACKUP (v3.63.320) ──────────────────────────────────────────
// Backlog FEATURE #3 Phase 2. Settings-driven loop that drops a fresh
// checkpoint into the user's FSA sync folder after every Nth round.
// Manual Save Checkpoint stays as the one-off escape hatch — auto-backup
// is the background safety net.
//
// David's design call (v3.63.319 follow-up): "It should be a setting in
// the settings to where Edge users and Chrome users pick your folder for
// auto saving and then you pick it and then it lives in the setup menu
// and then every time or then it just fires automatically for making
// backups. You can manually go in and do a save checkpoint at any
// point." Frequency as presets (every / every other / every 3rd round),
// not a seconds-based timer. Section selection mirrors the manual
// Checkpoint screen so users don't relearn it.
const _AUTO_BACKUP_FREQ_KEY  = 'waxframe_auto_backup_freq';
const _AUTO_BACKUP_SCOPE_KEY = 'waxframe_auto_backup_scope';
// Default scope mirrors the manual Checkpoint screen's safe defaults
// (v3.63.278): keys + license OFF, everything else ON. Self-portable
// backup without leaking the API key file to wherever the user puts
// their backup folder.
const _AUTO_BACKUP_SCOPE_DEFAULTS = {
  projectInfo: true,
  refMaterial: true,
  startingDoc: true,
  session:     true,
  aiList:      true,
  models:      true,
  keys:        false,
  builder:     true,
  license:     false,
};
function getAutoBackupFreq() {
  try {
    const raw = localStorage.getItem(_AUTO_BACKUP_FREQ_KEY);
    const n = parseInt(raw, 10);
    return isFinite(n) && n >= 0 && n <= 3 ? n : 0;
  } catch (e) { return 0; }
}
function setAutoBackupFreq(value) {
  const n = parseInt(value, 10);
  if (!isFinite(n) || n < 0 || n > 3) return;
  try { localStorage.setItem(_AUTO_BACKUP_FREQ_KEY, String(n)); } catch (e) {}
}
function getAutoBackupScope() {
  try {
    const raw = localStorage.getItem(_AUTO_BACKUP_SCOPE_KEY);
    if (!raw) return { ..._AUTO_BACKUP_SCOPE_DEFAULTS };
    const saved = JSON.parse(raw);
    const out = {};
    for (const k of _CHECKPOINT_SCOPE_KEYS) out[k] = !!saved[k];
    return out;
  } catch (e) { return { ..._AUTO_BACKUP_SCOPE_DEFAULTS }; }
}
function setAutoBackupScope(scope) {
  if (!scope || typeof scope !== 'object') return;
  const out = {};
  for (const k of _CHECKPOINT_SCOPE_KEYS) out[k] = !!scope[k];
  try { localStorage.setItem(_AUTO_BACKUP_SCOPE_KEY, JSON.stringify(out)); } catch (e) {}
}

// Auto-backup hook called by app.js's _logRoundBump after every round-
// completion site (continuing, unanimous, majority, builder-only,
// apply-decisions). Quietly no-ops on unsupported browsers, when freq=0,
// when the round counter isn't on a save-cadence boundary, or when the
// sync folder handle isn't reachable/permitted. Writes inline using the
// already-permitted handle; no picker/permission re-prompt (those need
// user activation, which we don't have inside a round-completion path).
async function _autoBackupAfterRound() {
  if (!_fsaSupported()) return;
  const freq = getAutoBackupFreq();
  if (!freq || freq < 1) return;
  const r = (typeof window !== 'undefined' && typeof window.round === 'number') ? window.round : NaN;
  if (!isFinite(r) || r < 1) return;
  // Frequency math: fire when round is a multiple of freq.
  //   freq=1 → every round (1, 2, 3, 4, …)
  //   freq=2 → every other round (2, 4, 6, …)
  //   freq=3 → every 3rd round (3, 6, 9, …)
  if (r % freq !== 0) return;
  // Folder handle must already exist + be currently permitted. We can't
  // requestPermission here (no user gesture) so a permission lapse just
  // skips this round's auto-backup silently. Next manual Save Checkpoint
  // re-grants permission and resumes the loop.
  let dir = null;
  try { dir = await _fsaGetStoredHandle(); } catch (e) {}
  if (!dir) return;
  try {
    const perm = await dir.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;
  } catch (e) { return; }

  const scope = getAutoBackupScope();
  const env = await _buildCheckpointEnvelope(scope);
  if (!env) return;

  try {
    const fileHandle = await dir.getFileHandle(env.filename, { create: true });
    const writable   = await fileHandle.createWritable();
    await writable.write(env.json);
    await writable.close();
    if (typeof toast === 'function') {
      toast(`📁 Auto-backup saved — round ${r}`, 2500);
    }
    console.info(`[auto-backup] round ${r} → ${env.filename}`);
  } catch (e) {
    console.warn('[auto-backup] write failed:', e);
  }
}
// Expose under the canonical name so app.js can call it without a tight
// cross-file binding. _logRoundBump checks typeof before calling.
if (typeof window !== 'undefined') {
  window._autoBackupAfterRound = _autoBackupAfterRound;
}

// ── SETTINGS HANDLERS ──
// All wired to the Settings panel HTML in index.html v3.63.320. Each
// handler persists immediately and updates UI state where needed.

// Pick / re-pick the sync folder. Uses the same _fsaEnsureSyncDir
// helper as manual Save Checkpoint — first call shows the OS picker;
// subsequent calls reuse the stored handle (re-requesting permission
// if needed, since this fires inside a user gesture).
async function settingsPickBackupFolder() {
  if (!_fsaSupported()) {
    toast('⚠️ Backup folder selection needs Chrome, Edge, or Opera.', 5000);
    return;
  }
  // forceRePick:true so the user always sees the picker when they click
  // — otherwise they couldn't change folders without first calling
  // fsaForgetSyncDir from the console.
  const dir = await _fsaEnsureSyncDir(true);
  if (!dir) return;   // user canceled — toast handled inside if it was a denial
  _refreshBackupFolderLabel();
  toast(`📁 Backup folder set — ${dir.name || '(unnamed)'}`, 4000);
}
async function _refreshBackupFolderLabel() {
  const label = document.getElementById('setBackupFolderLabel');
  if (!label) return;
  if (!_fsaSupported()) {
    label.textContent = '— Not supported in this browser —';
    return;
  }
  try {
    const handle = await _fsaGetStoredHandle();
    label.textContent = handle?.name ? handle.name : '— Not set —';
  } catch (e) {
    label.textContent = '— Not set —';
  }
}

function saveAutoBackupFreq(value) {
  setAutoBackupFreq(value);
}

function saveAutoBackupScope() {
  const out = {};
  for (const key of _CHECKPOINT_SCOPE_KEYS) {
    const el = document.getElementById('setBackupScope' + key[0].toUpperCase() + key.slice(1));
    out[key] = !!el?.checked;
  }
  setAutoBackupScope(out);
}

// Jump to the Checkpoint Save screen from inside the Settings panel.
// Used by the "See section details →" link next to the scope checkboxes.
function openCheckpointFromSettings() {
  if (typeof closeSettings === 'function') closeSettings();
  if (typeof backupSession === 'function') backupSession();
}

// Initial render — populate the Settings UI from saved state. Called
// by openSettings() before the section becomes visible.
function initBackupSyncSettings() {
  if (!_fsaSupported()) {
    const row = document.getElementById('setBackupUnsupportedRow');
    if (row) row.classList.remove('is-hidden');
    const btn = document.getElementById('setBackupFolderBtn');
    if (btn) { btn.disabled = true; btn.title = 'Requires Chrome, Edge, or Opera'; }
    document.querySelectorAll('input[name="setBackupFreq"]').forEach(el => { el.disabled = true; });
    _CHECKPOINT_SCOPE_KEYS.forEach(k => {
      const el = document.getElementById('setBackupScope' + k[0].toUpperCase() + k.slice(1));
      if (el) el.disabled = true;
    });
  }
  // Frequency radio
  const freq = String(getAutoBackupFreq());
  document.querySelectorAll('input[name="setBackupFreq"]').forEach(el => {
    el.checked = (el.value === freq);
  });
  // Scope checkboxes
  const scope = getAutoBackupScope();
  for (const k of _CHECKPOINT_SCOPE_KEYS) {
    const el = document.getElementById('setBackupScope' + k[0].toUpperCase() + k.slice(1));
    if (el) el.checked = !!scope[k];
  }
  // Folder label
  _refreshBackupFolderLabel();
}
// v3.63.323 — UI-level "Forget folder" handler. Calls the existing
// fsaForgetSyncDir, then refreshes the folder label so the user sees
// "— Not set —" immediately. Useful when the stored handle's
// permission has locked into a denied state Edge won't recover from
// (David's Save Checkpoint silent-failure debug — Chrome works on the
// same code, suggesting an Edge-specific stale permission state). Once
// forgotten, the next Pick folder click pops a fresh OS picker and
// re-grants permission cleanly.
async function settingsForgetBackupFolder() {
  if (!_fsaSupported()) return;
  await fsaForgetSyncDir();
  _refreshBackupFolderLabel();
}

if (typeof window !== 'undefined') {
  window.settingsPickBackupFolder   = settingsPickBackupFolder;
  window.settingsForgetBackupFolder = settingsForgetBackupFolder;
  window.saveAutoBackupFreq         = saveAutoBackupFreq;
  window.saveAutoBackupScope        = saveAutoBackupScope;
  window.openCheckpointFromSettings = openCheckpointFromSettings;
  window.initBackupSyncSettings     = initBackupSyncSettings;
}

// Forget the stored folder handle. Console-callable for users who want
// to change their sync folder mid-session; Phase 2 will surface a UI
// affordance ("Change sync folder…") in the checkpoint screen settings.
async function fsaForgetSyncDir() {
  if (!_fsaSupported()) return;
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete(_FSA_SYNC_DIR_KEY);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
    if (typeof toast === 'function') toast('🗑 Sync folder forgotten — next Save Checkpoint will re-prompt.', 4000);
  } catch(e) { console.warn('[fsa] forgetSyncDir failed:', e); }
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

// v3.63.227 — The old monolithic importSession() (which fired a wfConfirm
// trust warning, then a file picker, then opened the Restore modal) is
// retired. importSession() now lives near backupSession() above as a
// thin nav-screen entry point; the file picker logic moved to
// chooseCheckpointFile() (called from the Restore screen's "Choose File"
// button); the file-parsed handoff target was renamed
// _openRestoreCheckpointModal → _populateRestoreCheckpointDiff to reflect
// that it populates a screen panel rather than opening a modal.

// v3.63.227 — Per-section summary helpers. One per of the 9 scope keys.
// Each takes the parsed payload (project blob, hive blob, IDB session, or
// raw license string) and returns a short human-readable string for the
// Current vs Checkpoint diff modal. Pure functions — no DOM, no side
// effects, safe to call with null/undefined/garbage input. Used by both
// the Save modal's Current column and the Restore modal's two columns.
function _restoreSummarizeProjectInfo(p) {
  if (!p || typeof p !== 'object') return '(none)';
  const name = (p.projectName || '').trim();
  const ver  = (p.projectVersion || '').trim();
  const goalSet = ['goalDocType','goalAudience','goalOutcome','goalScope','goalTone','goalNotes']
    .some(k => typeof p[k] === 'string' && p[k].trim());
  const parts = [];
  if (name || ver) parts.push(ver ? `${name || '(unnamed)'} ${ver}` : (name || '(unnamed)'));
  else parts.push('(unnamed project)');
  if (goalSet) parts.push('goal set');
  return parts.join(' · ');
}

function _restoreSummarizeRefMaterial(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.referenceDocs) || !p.referenceDocs.length) return '(none)';
  const docs = p.referenceDocs;
  const total = docs.reduce((acc, d) => {
    const t = (typeof d?.text === 'string') ? d.text.length
            : (typeof d?.content === 'string') ? d.content.length
            : 0;
    return acc + t;
  }, 0);
  return `${docs.length} doc${docs.length === 1 ? '' : 's'} · ${total.toLocaleString()} chars`;
}

function _restoreSummarizeStartingDoc(p) {
  if (!p || typeof p !== 'object') return '(none)';
  const s = typeof p.pastedDocument === 'string' ? p.pastedDocument : '';
  if (!s.trim()) return '(none)';
  return `${s.length.toLocaleString()} chars`;
}

function _restoreSummarizeSession(idb) {
  if (!idb || typeof idb !== 'object') return '(empty)';
  const rounds  = Array.isArray(idb.history) ? idb.history.length : 0;
  const docLen  = typeof idb.docText === 'string' ? idb.docText.length : 0;
  if (!rounds && !docLen) return '(empty)';
  const docPart = docLen ? `${docLen.toLocaleString()} chars` : 'empty doc';
  return `${rounds} round${rounds === 1 ? '' : 's'} · ${docPart}`;
}

function _restoreSummarizeAIList(hive) {
  if (!hive || typeof hive !== 'object') return '(empty)';
  const activeCount = Array.isArray(hive.activeAIIds) ? hive.activeAIIds.length : 0;
  const customCount = Array.isArray(hive.customAIs)   ? hive.customAIs.length   : 0;
  if (!activeCount && !customCount) return '(no AIs)';
  const parts = [`${activeCount} active`];
  if (customCount) parts.push(`${customCount} custom`);
  if (hive.hiveMode) parts.push(`${hive.hiveMode} mode`);
  return parts.join(' · ');
}

function _restoreSummarizeModels(hive) {
  if (!hive || typeof hive !== 'object' || !hive.models || typeof hive.models !== 'object') return '(none)';
  const n = Object.values(hive.models).filter(v => typeof v === 'string' && v.trim()).length;
  return n ? `${n} model pick${n === 1 ? '' : 's'}` : '(none)';
}

function _restoreSummarizeKeys(hive) {
  if (!hive || typeof hive !== 'object' || !hive.keys || typeof hive.keys !== 'object') return '(none)';
  const n = Object.values(hive.keys).filter(v => typeof v === 'string' && v.trim()).length;
  return n ? `${n} key${n === 1 ? '' : 's'} set` : '(none)';
}

function _restoreSummarizeBuilder(hive) {
  if (!hive || typeof hive !== 'object') return '(none)';
  const id = typeof hive.builder === 'string' ? hive.builder.trim() : '';
  return id || '(none)';
}

function _restoreSummarizeLicense(raw) {
  if (!raw) return '(not set)';
  // v3.63.261 — Extract the actual key string and render it masked with
  // an inline 👁 reveal button. Was a hardcoded 'Set' that gave the user
  // no signal that a real value lived there and no way to inspect it.
  // The license blob may be a JSON wrapper ({valid, key, ...}) or, on
  // legacy installs, the raw key string itself.
  // v3.63.262 — Now returns { html, compareKey } so the match-detector
  // (Restore mode setRow) can compare RAW values across the two columns
  // and light up matching rows green-on-both-sides. Without compareKey
  // the comparison would run against the masked display string, which
  // would falsely match any two keys that happen to share their last 4
  // characters. Plain-string summaries keep their old shape — the
  // _checkpointCompareKey helper handles both forms.
  let key = '';
  try {
    const j = JSON.parse(raw);
    if (j && typeof j.key === 'string' && j.key.trim()) key = j.key.trim();
  } catch(_) {
    if (typeof raw === 'string' && raw.trim()) key = raw.trim();
  }
  if (!key) return 'Set';   // present but unreadable — safe fallback
  return { html: _checkpointSecretHTML(key), compareKey: key };
}

/* v3.63.261 — Render a sensitive value (license key, API key) as a
   masked string with an inline 👁 reveal button. Returns an HTML
   string (the preview-value setter checks for a leading '<' and
   switches to innerHTML when present). Click toggles the
   .is-revealed class on the wrapper to swap the masked span for the
   real span. The button absorbs click + calls stopPropagation so
   toggling visibility doesn't also toggle the row's checkbox (each
   row is a <label> that targets the checkbox on click). */
function _checkpointSecretHTML(rawValue) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const v = String(rawValue || '');
  const tail = v.length > 4 ? v.slice(-4) : v;
  const maskLen = Math.min(12, Math.max(4, v.length - 4));
  const mask = '•'.repeat(maskLen) + esc(tail);
  return `<span class="checkpoint-secret"><span class="checkpoint-secret-mask">${mask}</span><span class="checkpoint-secret-real">${esc(v)}</span><button type="button" class="checkpoint-secret-reveal" data-action="call" data-fn="toggleCheckpointSecret" data-arg-event="1" title="Show or hide the full value" aria-label="Show or hide the full value">👁</button></span>`;
}

/* v3.63.261 — Set a preview-value element from a summarizer's return.
   Most summarizers return plain text — use textContent for safety.
   The license (and future sensitive rows) return an HTML string with
   masked value + reveal button — detect via leading '<' and switch
   to innerHTML. Defense-in-depth: summarizers are the only source of
   HTML strings here, and they generate their HTML internally with
   escaped values, so we're not handing user-supplied HTML to innerHTML.
   v3.63.262 — Now also accepts the { html, compareKey } object shape
   used by sensitive-row summarizers; the html field renders, the
   compareKey is read separately by the match-detector. */
function _setCheckpointPreviewValue(el, val) {
  if (!el) return;
  // Object form: { html, compareKey } — render the html branch.
  if (val && typeof val === 'object' && typeof val.html === 'string') {
    el.innerHTML = val.html;
    return;
  }
  const s = String(val == null ? '' : val);
  if (s.length > 0 && s.charCodeAt(0) === 60 /* < */) {
    el.innerHTML = s;
  } else {
    el.textContent = s;
  }
}

/* v3.63.262 — Extract a stable comparison string from a summarizer's
   return value. For sensitive rows the displayed HTML is masked
   (••••••••XXXX) — comparing those would falsely match any two keys
   sharing their last 4 chars. The summarizer's compareKey field
   carries the raw value for an accurate compare. Plain-string
   summaries (the common case) compare against themselves. */
function _checkpointCompareKey(summary) {
  if (summary == null) return '';
  if (typeof summary === 'object' && typeof summary.compareKey === 'string') {
    return summary.compareKey;
  }
  return String(summary);
}

/* v3.63.262 — Decide whether a Restore-mode row's two sides agree.
   Same-summary rows light up green on BOTH panels (instead of just
   the file panel on check) and the chevron becomes "=" — so the user
   sees at a glance which sections would be no-op restores. Skips the
   placeholder summaries ("(none)", "(empty)", "(not set)") so empty-
   on-both-sides rows don't get a misleading green match. */
function _checkpointRowsMatch(curSummary, ckSummary, hasInFile) {
  if (!hasInFile) return false;
  const cur = _checkpointCompareKey(curSummary);
  const ck  = _checkpointCompareKey(ckSummary);
  if (!cur || !ck) return false;
  if (cur !== ck) return false;
  // Don't treat (none)/(empty) on both sides as a meaningful match —
  // those are placeholders, not real shared data.
  const placeholder = /^\((?:none|empty|not set|unnamed project|no AIs)\)$/i;
  if (placeholder.test(cur)) return false;
  return true;
}

window.toggleCheckpointSecret = function(ev) {
  ev.preventDefault();
  ev.stopPropagation();
  const wrap = ev.currentTarget.closest('.checkpoint-secret');
  if (wrap) wrap.classList.toggle('is-revealed');
};

/* ════════════════════════════════════════════════════════════
   v3.63.263 — Expand-on-click detail panels (Phase B)
   ────────────────────────────────────────────────────────────
   Matches the bee-card .ai-setup-row.is-expanded pattern. Each
   .checkpoint-row gets an absolutely-positioned chevron button at
   its top-right corner. Clicking the chevron toggles a slide-down
   detail panel below the previews; the panel content is rendered
   lazily on first expand from the data cached at populate time.

   The chevron is a <button> so the browser doesn't forward its click
   to the parent <label>'s checkbox. The detail panel's own click
   handler additionally stopPropagation's so users can read/select
   inside the panel without toggling the row's checkbox.

   Per-row detail content comes from _renderCheckpointDetailContent()
   which dispatches to a renderer per scope key. Restore mode renders
   two columns (current | file); Save mode renders one (current only).
   ════════════════════════════════════════════════════════════ */
function _initCheckpointExpandUI() {
  document.querySelectorAll('.checkpoint-row').forEach(row => {
    if (row.querySelector('.checkpoint-row-expand-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'checkpoint-row-expand-btn';
    // v3.63.265 — Bolder glyph (▼ instead of ▾) so the chevron reads
    // more clearly inside the 32px button. The small-triangle ▾ was
    // visibly anemic at this size.
    btn.innerHTML = '▼';
    btn.title = 'Show details';
    btn.setAttribute('aria-label', 'Show details');
    btn.setAttribute('aria-expanded', 'false');
    btn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      _toggleCheckpointRowExpand(row);
    };
    // v3.63.267 — Append inside .checkpoint-row-previews instead of the
    // row itself. At desktop widths the previews flex-row, so the chevron
    // becomes a third inline item beside the two preview cards (David:
    // "shrink down the cards and move the Chevron up to the same row").
    // At laptop widths the previews stack vertically, so the chevron
    // naturally falls below them — same visual as before.
    const previewsEl = row.querySelector('.checkpoint-row-previews');
    (previewsEl || row).appendChild(btn);
  });
}

function _toggleCheckpointRowExpand(row) {
  const wasExpanded = row.classList.contains('is-expanded');
  row.classList.toggle('is-expanded');
  const btn = row.querySelector('.checkpoint-row-expand-btn');
  if (btn) btn.setAttribute('aria-expanded', wasExpanded ? 'false' : 'true');
  if (!wasExpanded) _populateCheckpointDetail(row);
}

function _populateCheckpointDetail(row) {
  const key  = _detectCheckpointRowKey(row);
  const mode = _detectCheckpointRowMode(row);
  if (!key) return;
  let detailEl = row.querySelector('.checkpoint-row-detail');
  if (!detailEl) {
    detailEl = document.createElement('div');
    detailEl.className = 'checkpoint-row-detail';
    // Stop click bubbling so reading inside the panel doesn't toggle the
    // row's checkbox via the parent <label>.
    detailEl.addEventListener('click', (ev) => ev.stopPropagation());
    row.appendChild(detailEl);
  }
  detailEl.innerHTML = _renderCheckpointDetailContent(key, mode);
}

function _detectCheckpointRowKey(row) {
  const cb = row.querySelector('input[type="checkbox"]');
  if (!cb) return null;
  const m = cb.id.match(/^(?:save|restore)Scope(.+)$/);
  if (!m) return null;
  return m[1][0].toLowerCase() + m[1].slice(1);
}
function _detectCheckpointRowMode(row) {
  const cb = row.querySelector('input[type="checkbox"]');
  if (!cb) return 'save';
  return cb.id.startsWith('restore') ? 'restore' : 'save';
}

function _renderCheckpointDetailContent(key, mode) {
  const cache = window._checkpointDataCache || {};
  const live  = cache.live || {};
  const file  = cache.file || null;
  const hasInFile = file && file.hasFlags && file.hasFlags[key];

  const liveHTML = _detailRender(key, live, false);
  const fileHTML = (mode === 'restore')
    ? (hasInFile ? _detailRender(key, file, true) : '<p class="checkpoint-detail-empty">Not in this checkpoint file.</p>')
    : null;

  const labelLive = 'Current state — details';
  const labelFile = 'Checkpoint file — details';

  if (mode === 'save') {
    return `<div class="checkpoint-detail-col"><div class="checkpoint-detail-col-label">${labelLive}</div>${liveHTML}</div>`;
  }
  return `<div class="checkpoint-detail-cols">
    <div class="checkpoint-detail-col"><div class="checkpoint-detail-col-label">${labelLive}</div>${liveHTML}</div>
    <div class="checkpoint-detail-col checkpoint-detail-col-file"><div class="checkpoint-detail-col-label">${labelFile}</div>${fileHTML}</div>
  </div>`;
}

/* ── Per-key detail renderers ──
   Each takes the data cache slot ({project, hive, sessionIdb, licenseRaw})
   and a `fromFile` flag (for context in renderers that care). Return an
   HTML string. Keep these defensive — the data may be missing/malformed
   from older checkpoint formats. */
function _detailRender(key, data, fromFile) {
  switch (key) {
    case 'projectInfo': return _detailProjectInfo(data.project);
    case 'refMaterial': return _detailRefMaterial(data.project);
    case 'startingDoc': return _detailStartingDoc(data.project);
    case 'session':     return _detailSession(data.sessionIdb);
    case 'aiList':      return _detailAIList(data.hive);
    case 'models':      return _detailModels(data.hive);
    case 'keys':        return _detailKeys(data.hive);
    case 'builder':     return _detailBuilder(data.hive);
    case 'license':     return _detailLicense(data.licenseRaw);
    default:            return '<p class="checkpoint-detail-empty">No details available.</p>';
  }
}

function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}
function _detailDL(rows) {
  if (!rows.length) return '<p class="checkpoint-detail-empty">(none)</p>';
  return '<dl class="checkpoint-detail-dl">' + rows.map(([k, v]) =>
    `<dt>${_esc(k)}</dt><dd>${typeof v === 'string' && v.startsWith('<') ? v : _esc(v)}</dd>`
  ).join('') + '</dl>';
}
function _detailUL(items) {
  if (!items.length) return '<p class="checkpoint-detail-empty">(none)</p>';
  return '<ul class="checkpoint-detail-ul">' + items.map(it =>
    `<li>${typeof it === 'string' && it.startsWith('<') ? it : _esc(it)}</li>`
  ).join('') + '</ul>';
}

function _detailProjectInfo(p) {
  if (!p || typeof p !== 'object') return '<p class="checkpoint-detail-empty">No project loaded.</p>';
  const rows = [];
  if (p.projectName)    rows.push(['Name',        p.projectName]);
  if (p.projectVersion) rows.push(['Version',     p.projectVersion]);
  if (p.goalDocType)    rows.push(['Document',    p.goalDocType]);
  if (p.goalAudience)   rows.push(['Audience',    p.goalAudience]);
  if (p.goalOutcome)    rows.push(['Outcome',     p.goalOutcome]);
  if (p.goalScope)      rows.push(['Scope',       p.goalScope]);
  if (p.goalTone)       rows.push(['Tone',        p.goalTone]);
  if (p.goalNotes)      rows.push(['Notes',       p.goalNotes]);
  if (p.lengthConstraint && typeof p.lengthConstraint === 'object') {
    const lc = p.lengthConstraint;
    let s = '';
    if (lc.mode) s += lc.mode + ' · ';
    if (lc.limit) s += lc.limit;
    if (lc.unit) s += ' ' + lc.unit;
    if (lc.min)  s += ' (min ' + lc.min + ')';
    if (s.trim()) rows.push(['Length', s.trim()]);
  }
  if (p.exportFileName)  rows.push(['Export filename', p.exportFileName]);
  return _detailDL(rows);
}

function _detailRefMaterial(p) {
  const docs = (p && Array.isArray(p.referenceDocs)) ? p.referenceDocs : [];
  if (!docs.length) return '<p class="checkpoint-detail-empty">No reference docs.</p>';
  return _detailUL(docs.map(d => {
    const name = d?.name || d?.filename || '(unnamed)';
    const text = (typeof d?.text === 'string') ? d.text
                : (typeof d?.content === 'string') ? d.content : '';
    const src = d?.source ? ` · ${d.source}` : '';
    return `<strong>${_esc(name)}</strong> — ${text.length.toLocaleString()} chars${_esc(src)}`;
  }));
}

function _detailStartingDoc(p) {
  const s = (p && typeof p.pastedDocument === 'string') ? p.pastedDocument : '';
  if (!s.trim()) return '<p class="checkpoint-detail-empty">No starting document.</p>';
  const preview = s.length > 400 ? s.slice(0, 400) + '…' : s;
  return `<p class="checkpoint-detail-meta">${s.length.toLocaleString()} chars</p><pre class="checkpoint-detail-pre">${_esc(preview)}</pre>`;
}

function _detailSession(idb) {
  if (!idb || typeof idb !== 'object') return '<p class="checkpoint-detail-empty">Session empty.</p>';
  const rounds = Array.isArray(idb.history) ? idb.history.length : 0;
  const doc    = typeof idb.docText === 'string' ? idb.docText : '';
  const notes  = typeof idb.notes === 'string' ? idb.notes : '';
  const standing = typeof idb.standingNotes === 'string' ? idb.standingNotes : '';
  const rows = [
    ['Rounds in history', rounds],
    ['Working document', doc ? `${doc.length.toLocaleString()} chars` : '(empty)'],
  ];
  if (notes.trim())    rows.push(['Notes', `${notes.length.toLocaleString()} chars`]);
  if (standing.trim()) rows.push(['Standing notes', `${standing.length.toLocaleString()} chars`]);
  return _detailDL(rows);
}

function _detailAIList(hive) {
  if (!hive || typeof hive !== 'object') return '<p class="checkpoint-detail-empty">No hive.</p>';
  const active = Array.isArray(hive.activeAIIds) ? hive.activeAIIds : [];
  const customs = Array.isArray(hive.customAIs) ? hive.customAIs : [];
  const builder = typeof hive.builder === 'string' ? hive.builder : '';
  const mode = hive.hiveMode || '';
  const customById = new Map(customs.map(c => [c.id, c]));
  // Display-name resolution: prefer custom AI label, fall back to id capitalized.
  const items = active.map(id => {
    const c = customById.get(id);
    const name = c ? (c.label || c.name || id) : id;
    const star = (id === builder) ? ' 🔨' : '';
    const isCustom = !!c;
    return `<strong>${_esc(name)}</strong>${isCustom ? ' <span class="checkpoint-detail-tag">custom</span>' : ''}${star}`;
  });
  const head = `<p class="checkpoint-detail-meta">${active.length} active${mode ? ' · ' + _esc(mode) + ' mode' : ''}${customs.length ? ' · ' + customs.length + ' custom defined' : ''}</p>`;
  return head + _detailUL(items);
}

function _detailModels(hive) {
  if (!hive || typeof hive !== 'object' || !hive.models) return '<p class="checkpoint-detail-empty">No model picks.</p>';
  const entries = Object.entries(hive.models).filter(([, v]) => typeof v === 'string' && v.trim());
  if (!entries.length) return '<p class="checkpoint-detail-empty">No model picks set.</p>';
  return _detailUL(entries.map(([id, model]) => `<strong>${_esc(id)}</strong> → <code>${_esc(model)}</code>`));
}

function _detailKeys(hive) {
  if (!hive || typeof hive !== 'object' || !hive.keys) return '<p class="checkpoint-detail-empty">No keys stored.</p>';
  const entries = Object.entries(hive.keys).filter(([, v]) => typeof v === 'string' && v.trim());
  if (!entries.length) return '<p class="checkpoint-detail-empty">No keys stored.</p>';
  // Each key gets a masked-display + 👁 reveal — reuses the v3.63.261
  // .checkpoint-secret pattern. Per-AI rows are read-only inline list items.
  return _detailUL(entries.map(([id, val]) =>
    `<strong>${_esc(id)}</strong> ${_checkpointSecretHTML(val)}`
  ));
}

function _detailBuilder(hive) {
  if (!hive || typeof hive !== 'object') return '<p class="checkpoint-detail-empty">No builder set.</p>';
  const b = typeof hive.builder === 'string' ? hive.builder.trim() : '';
  if (!b) return '<p class="checkpoint-detail-empty">No builder set.</p>';
  return `<p class="checkpoint-detail-meta">Selected Builder: <strong>${_esc(b)}</strong></p>`;
}

function _detailLicense(raw) {
  if (!raw) return '<p class="checkpoint-detail-empty">No license stored.</p>';
  let key = '';
  let extras = {};
  try {
    const j = JSON.parse(raw);
    if (j && typeof j === 'object') {
      if (typeof j.key === 'string') key = j.key.trim();
      extras = j;
    }
  } catch(_) {
    if (typeof raw === 'string') key = raw.trim();
  }
  const rows = [];
  rows.push(['Key', key ? _checkpointSecretHTML(key) : '(not readable)']);
  if (extras.valid != null) rows.push(['Validated', extras.valid ? 'Yes' : 'No']);
  if (extras.purchaseId)    rows.push(['Purchase ID', extras.purchaseId]);
  if (extras.email)         rows.push(['Email', extras.email]);
  if (extras.activatedAt)   rows.push(['Activated', new Date(extras.activatedAt).toLocaleString()]);
  return _detailDL(rows);
}

// v3.63.227 — Populate the Restore screen's diff view with 9-section
// granularity. Reads live state, parses the checkpoint's sections, detects
// the file format (v6 has 9-key scope directly; v5's 6-key scope is mapped
// to the 9 sub-sections by inspecting which sub-fields the file actually
// carries; v4/legacy uses field presence only), populates the screen rows,
// stashes the parsed data on window._pendingRestoreData for the confirm
// handler, then swaps the Restore panel from intro state (trust warning +
// Choose File button) to diff state (the 9 rows). Sections the file
// doesn't carry are disabled with a "(not in checkpoint)" hint.
async function _populateRestoreCheckpointDiff(data) {
  const ver       = data._waxframe_backup_version || 1;
  const fileScope = (ver >= 5 && data._waxframe_backup_scope && typeof data._waxframe_backup_scope === 'object')
    ? data._waxframe_backup_scope
    : null;

  let parsedCkProj = null;
  try { parsedCkProj = data.LS_PROJECT ? JSON.parse(data.LS_PROJECT) : null; } catch(_) { parsedCkProj = null; }
  let parsedCkHive = null;
  try { parsedCkHive = data.LS_HIVE ? JSON.parse(data.LS_HIVE) : null; } catch(_) { parsedCkHive = null; }

  // Sub-field presence detectors. A row is "available" iff the FILE actually
  // carries restorable content for it — for v6 files we trust the scope
  // flags directly (they describe what was sliced in at save time); for v5
  // files we look at the underlying sub-fields because v5's flat scope
  // can't distinguish project-info-only from project+ref-material.
  const ckProjHasInfo = !!(parsedCkProj && _PROJECT_INFO_FIELDS.some(k => parsedCkProj[k] !== undefined && parsedCkProj[k] !== ''));
  const ckProjHasRef  = !!(parsedCkProj && Array.isArray(parsedCkProj.referenceDocs) && parsedCkProj.referenceDocs.length);
  const ckProjHasDoc  = !!(parsedCkProj && typeof parsedCkProj.pastedDocument === 'string' && parsedCkProj.pastedDocument.trim());
  const ckHiveHasList = !!(parsedCkHive && _HIVE_LIST_FIELDS.some(k => parsedCkHive[k] !== undefined));
  const ckHiveHasModels = !!(parsedCkHive && parsedCkHive.models && typeof parsedCkHive.models === 'object'
                              && Object.values(parsedCkHive.models).some(v => typeof v === 'string' && v.trim()));
  const ckHasKeys    = !!(parsedCkHive && parsedCkHive.keys && typeof parsedCkHive.keys === 'object'
                          && Object.values(parsedCkHive.keys).some(v => typeof v === 'string' && v.trim()));
  const ckHasBuilder = !!(parsedCkHive && typeof parsedCkHive.builder === 'string' && parsedCkHive.builder.trim());

  // Format-version branch — v6's scope is granular; v5's is coarse but we
  // can refine it via sub-field detection; v4 falls through to pure presence.
  let has;
  if (ver >= 6 && fileScope) {
    has = {
      projectInfo: !!fileScope.projectInfo && ckProjHasInfo,
      refMaterial: !!fileScope.refMaterial && ckProjHasRef,
      startingDoc: !!fileScope.startingDoc && ckProjHasDoc,
      session:     !!fileScope.session     && !!(data.LS_SESSION || data.IDB_SESSION),
      aiList:      !!fileScope.aiList      && ckHiveHasList,
      models:      !!fileScope.models      && ckHiveHasModels,
      keys:        !!fileScope.keys        && ckHasKeys,
      builder:     !!fileScope.builder     && ckHasBuilder,
      license:     !!fileScope.license     && !!data.LS_LICENSE,
    };
  } else if (ver === 5 && fileScope) {
    // v5 → 9-key map. Project sub-sections gated by both v5.project=true AND
    // sub-field presence. Same for hive sub-sections under v5.hive=true.
    has = {
      projectInfo: !!fileScope.project && ckProjHasInfo,
      refMaterial: !!fileScope.project && ckProjHasRef,
      startingDoc: !!fileScope.project && ckProjHasDoc,
      session:     !!fileScope.session && !!(data.LS_SESSION || data.IDB_SESSION),
      aiList:      !!fileScope.hive    && ckHiveHasList,
      models:      !!fileScope.hive    && ckHiveHasModels,
      keys:        !!fileScope.keys    && ckHasKeys,
      builder:     !!fileScope.builder && ckHasBuilder,
      license:     !!fileScope.license && !!data.LS_LICENSE,
    };
  } else {
    // v4 / no scope — just check sub-field presence directly.
    has = {
      projectInfo: ckProjHasInfo,
      refMaterial: ckProjHasRef,
      startingDoc: ckProjHasDoc,
      session:     !!(data.LS_SESSION || data.IDB_SESSION),
      aiList:      ckHiveHasList,
      models:      ckHiveHasModels,
      keys:        ckHasKeys,
      builder:     ckHasBuilder,
      license:     !!data.LS_LICENSE,
    };
  }

  // Snapshot current local state for the left column.
  const liveHiveRaw    = localStorage.getItem(LS_HIVE);
  const liveProjectRaw = localStorage.getItem(LS_PROJECT);
  const liveLicenseRaw = localStorage.getItem(LS_LICENSE);
  let liveHive    = null;
  let liveProject = null;
  try { liveHive    = liveHiveRaw    ? JSON.parse(liveHiveRaw)    : null; } catch(_) { liveHive = null; }
  try { liveProject = liveProjectRaw ? JSON.parse(liveProjectRaw) : null; } catch(_) { liveProject = null; }
  let liveSessionIDB = null;
  try { liveSessionIDB = await idbGet(); } catch(_) { liveSessionIDB = null; }

  const cur = {
    projectInfo: _restoreSummarizeProjectInfo(liveProject),
    refMaterial: _restoreSummarizeRefMaterial(liveProject),
    startingDoc: _restoreSummarizeStartingDoc(liveProject),
    session:     _restoreSummarizeSession(liveSessionIDB),
    aiList:      _restoreSummarizeAIList(liveHive),
    models:      _restoreSummarizeModels(liveHive),
    keys:        _restoreSummarizeKeys(liveHive),
    builder:     _restoreSummarizeBuilder(liveHive),
    license:     _restoreSummarizeLicense(liveLicenseRaw),
  };
  const ck = {
    projectInfo: _restoreSummarizeProjectInfo(parsedCkProj),
    refMaterial: _restoreSummarizeRefMaterial(parsedCkProj),
    startingDoc: _restoreSummarizeStartingDoc(parsedCkProj),
    session:     _restoreSummarizeSession(data.IDB_SESSION),
    aiList:      _restoreSummarizeAIList(parsedCkHive),
    models:      _restoreSummarizeModels(parsedCkHive),
    keys:        _restoreSummarizeKeys(parsedCkHive),
    builder:     _restoreSummarizeBuilder(parsedCkHive),
    license:     _restoreSummarizeLicense(data.LS_LICENSE),
  };

  // Stash for the modal's confirm handler.
  window._pendingRestoreData = data;
  window._pendingRestoreHas  = has;

  // Default tick state for Restore: portable-project case. Project sub-
  // sections + session ON when available; hive sub-sections OFF (local hive
  // wins); license OFF (per the project rule — you don't re-import a
  // license you already have locally).
  const restoreDefaults = {
    projectInfo: true,  refMaterial: true,  startingDoc: true,
    session:     true,
    aiList:      false, models:      false, keys: false, builder: false,
    license:     false,
  };

  // Wire each row. A row's checkbox is enabled iff the file carries content
  // for it; disabled rows show "(not in checkpoint)" in the right column.
  const setRow = (key) => {
    const cap   = key[0].toUpperCase() + key.slice(1);
    const cb    = document.getElementById('restoreScope'      + cap);
    const curEl = document.getElementById('restoreCurrent'    + cap);
    const ckEl  = document.getElementById('restoreCheckpoint' + cap);
    if (cb) {
      cb.checked  = !!has[key] && !!restoreDefaults[key];
      cb.disabled = !has[key];
    }
    // v3.63.261 — Use the secret-aware setter so license/key rows
    // get their masked-value + 👁 reveal markup, while plain summary
    // rows still go through textContent.
    _setCheckpointPreviewValue(curEl, cur[key]);
    _setCheckpointPreviewValue(ckEl,  has[key] ? ck[key] : '(not in checkpoint)');
    // v3.63.262 — Match-detection. Toggle .is-match on the row when
    // the current and checkpoint-file summaries compare equal — both
    // panels then light up green and the chevron between them flips
    // to "=" so the user can see at a glance which rows would be a
    // no-op restore.
    const rowEl = cb ? cb.closest('.checkpoint-row') : null;
    if (rowEl) {
      rowEl.classList.toggle('is-match', _checkpointRowsMatch(cur[key], ck[key], !!has[key]));
    }
  };
  for (const key of _CHECKPOINT_SCOPE_KEYS) setRow(key);

  // Header line: where the file came from + when it was saved.
  const fileVer = data._waxframe_app_version || '(unknown version)';
  const tsRaw   = data._waxframe_backup_ts;
  const fileTs  = (typeof tsRaw === 'number' && tsRaw > 0) ? new Date(tsRaw).toLocaleString() : '(no timestamp)';
  const metaEl  = document.getElementById('restoreCheckpointFileMeta');
  if (metaEl) {
    metaEl.textContent = `From ${fileVer} · Saved ${fileTs} · Format v${ver}. Tick the sections you want to restore — unticked sections keep their current local values.`;
  }

  // Swap the Restore panel from intro state (trust warning + Choose File
  // button) to diff state (the 9 rows). The screen is already visible —
  // no goToScreen() needed because importSession() already navigated us
  // here before the file picker opened.
  const introEl = document.getElementById('chkRestoreIntro');
  const diffEl  = document.getElementById('chkRestoreDiff');
  if (introEl) introEl.style.display = 'none';
  if (diffEl)  diffEl.classList.remove('is-hidden');

  // v3.63.263 — Stash live + checkpoint state for the expand-on-click
  // detail panels. Both sides need their full data accessible
  // synchronously when a row's chevron is clicked.
  window._checkpointDataCache = window._checkpointDataCache || {};
  window._checkpointDataCache.live = {
    project:    liveProject,
    hive:       liveHive,
    sessionIdb: liveSessionIDB,
    licenseRaw: liveLicenseRaw,
  };
  window._checkpointDataCache.file = {
    project:    parsedCkProj,
    hive:       parsedCkHive,
    sessionIdb: data.IDB_SESSION,
    licenseRaw: data.LS_LICENSE,
    hasFlags:   has,
  };
  _initCheckpointExpandUI();
}

async function confirmRestoreCheckpoint() {
  const data = window._pendingRestoreData;
  const has  = window._pendingRestoreHas;
  if (!data || !has) {
    // Stale state — bounce back to intro and let the user pick a file again.
    switchCheckpointMode('restore');
    return;
  }

  // AND the user's picks with availability — a disabled+checked state shouldn't
  // be possible via the UI, but enforce here so a stale DOM can't produce a
  // nonsense apply (e.g. trying to restore a section the file doesn't have).
  const userScope = {};
  for (const key of _CHECKPOINT_SCOPE_KEYS) {
    const cap = key[0].toUpperCase() + key.slice(1);
    userScope[key] = !!document.getElementById('restoreScope' + cap)?.checked && !!has[key];
  }

  const any = _CHECKPOINT_SCOPE_KEYS.some(k => userScope[k]);
  if (!any) {
    toast('⚠️ Nothing selected — tick at least one section or hit Cancel');
    return;
  }

  await _applyCheckpoint(data, userScope);
  window._pendingRestoreData = null;
  window._pendingRestoreHas  = null;
}

// v3.63.227 — Apply a parsed checkpoint to local storage, gated by the
// user's 9-key per-section picks. Splices LS_PROJECT and LS_HIVE so only
// the ticked sub-sections overwrite local fields; everything else stays
// byte-for-byte. Session and license remain atomic. Ends with a
// location.reload() so live state re-reads from storage cleanly.
async function _applyCheckpoint(data, scope) {
  try {
    // ── LS_PROJECT merge (3 sub-sections: projectInfo, refMaterial, startingDoc) ──
    if (scope.projectInfo || scope.refMaterial || scope.startingDoc) {
      let importedProject = null;
      try { importedProject = data.LS_PROJECT ? JSON.parse(data.LS_PROJECT) : null; } catch(_) { importedProject = null; }
      if (importedProject && typeof importedProject === 'object') {
        const existingRaw  = localStorage.getItem(LS_PROJECT);
        let   existingProj = null;
        try { existingProj = existingRaw ? JSON.parse(existingRaw) : null; } catch(_) { existingProj = null; }
        const merged = { ...(existingProj || {}) };
        if (scope.projectInfo) {
          for (const k of _PROJECT_INFO_FIELDS) {
            if (importedProject[k] !== undefined) merged[k] = importedProject[k];
          }
        }
        if (scope.refMaterial && importedProject.referenceDocs !== undefined) {
          merged.referenceDocs = importedProject.referenceDocs;
        }
        if (scope.startingDoc && importedProject.pastedDocument !== undefined) {
          merged.pastedDocument = importedProject.pastedDocument;
        }
        localStorage.setItem(LS_PROJECT, JSON.stringify(merged));
      }
    }

    // ── LS_HIVE merge (4 sub-sections: aiList, models, keys, builder) ──
    if (scope.aiList || scope.models || scope.keys || scope.builder) {
      let importedHive = null;
      try { importedHive = data.LS_HIVE ? JSON.parse(data.LS_HIVE) : null; } catch(_) { importedHive = null; }
      if (importedHive && typeof importedHive === 'object') {
        const existingRaw  = localStorage.getItem(LS_HIVE);
        let   existingHive = null;
        try { existingHive = existingRaw ? JSON.parse(existingRaw) : null; } catch(_) { existingHive = null; }
        const merged = { ...(existingHive || {}) };
        if (scope.aiList) {
          for (const k of _HIVE_LIST_FIELDS) {
            if (importedHive[k] !== undefined) merged[k] = importedHive[k];
          }
        }
        if (scope.models  && importedHive.models  !== undefined) merged.models  = importedHive.models;
        if (scope.keys    && importedHive.keys    !== undefined) merged.keys    = importedHive.keys;
        if (scope.builder && importedHive.builder !== undefined) merged.builder = importedHive.builder;
        localStorage.setItem(LS_HIVE, JSON.stringify(merged));
      }
    }

    // ── License (atomic). Missing/null never clears local. ──
    if (scope.license && data.LS_LICENSE) localStorage.setItem(LS_LICENSE, data.LS_LICENSE);

    // ── Session: localStorage layer first (legacy, rarely populated), then IDB ──
    let restoredFromIDB = false;
    let wipedToScratch  = false;
    if (scope.session) {
      // v3.63.276 — Restore the round-state localStorage keys before the
      // session blob so the in-memory mirrors that loadSession or app.js's
      // boot path read pick up the restored values. Old (v6) checkpoints
      // have no LS_ROUND_STATE — `if (rs)` skips silently in that case.
      const rs = data.LS_ROUND_STATE;
      if (rs && typeof rs === 'object') {
        if (rs.resolvedDecisions) localStorage.setItem('waxframe_resolved_decisions', rs.resolvedDecisions);
        else localStorage.removeItem('waxframe_resolved_decisions');
        if (rs.conflictLedger)    localStorage.setItem('waxframe_conflict_ledger',    rs.conflictLedger);
        else localStorage.removeItem('waxframe_conflict_ledger');
        if (rs.aiWarnings)        localStorage.setItem('waxframe_ai_warnings',        rs.aiWarnings);
        else localStorage.removeItem('waxframe_ai_warnings');
      }
      if (data.LS_SESSION) localStorage.setItem(LS_SESSION, data.LS_SESSION);
      if (data.IDB_SESSION) {
        try {
          await idbSet(data.IDB_SESSION);
          try { localStorage.setItem('waxframe_v2_session_exists', '1'); } catch(_) {}
          restoredFromIDB = true;
        } catch(idbErr) {
          console.error('[_applyCheckpoint] IDB restore failed:', idbErr);
          toast(`⚠️ Project restored but IDB session write failed: ${idbErr.message || idbErr}. See console.`, 14000);
        }
      } else {
        // User explicitly ticked Session but the file's IDB blob is null —
        // means the checkpoint captured a pre-Round-1 state intentionally.
        // Match by wiping local IDB so reload shows the captured fresh setup.
        try {
          await idbClear();
          localStorage.removeItem('waxframe_v2_session_exists');
          wipedToScratch = true;
        } catch(clearErr) {
          console.error('[_applyCheckpoint] IDB clear failed:', clearErr);
          toast(`⚠️ Project restored but IDB clear failed: ${clearErr.message || clearErr}. Prior session may persist.`, 14000);
        }
      }
    }
    // !scope.session → leave local IDB untouched (don't wipe, don't restore).

    // Toast summary — restored vs preserved sections.
    const labels = {
      projectInfo: 'project info', refMaterial: 'ref material', startingDoc: 'starting doc',
      session:     'session',
      aiList:      'AI list',      models:      'model picks', keys: 'API keys', builder: 'builder',
      license:     'license',
    };
    const restoredTags  = [];
    const preservedTags = [];
    for (const k of _CHECKPOINT_SCOPE_KEYS) {
      if (scope[k]) {
        if (k === 'session') {
          const sh = data.IDB_SESSION?.history?.length || 0;
          restoredTags.push(sh > 0 ? `session (${sh} rounds)` : 'session (empty)');
        } else {
          restoredTags.push(labels[k]);
        }
      } else {
        preservedTags.push(labels[k]);
      }
    }
    const restoredPart  = restoredTags.length  ? `Restored: ${restoredTags.join(', ')}` : 'Nothing restored';
    const preservedPart = preservedTags.length ? ` · Kept local: ${preservedTags.join(', ')}` : '';
    toast(`✅ ${restoredPart}${preservedPart}. Reloading…`, 7000);

    setTimeout(() => location.reload(), 1500);
  } catch (e) {
    console.error('[_applyCheckpoint]', e);
    toast('⚠️ Restore failed — see console.');
  }
}
