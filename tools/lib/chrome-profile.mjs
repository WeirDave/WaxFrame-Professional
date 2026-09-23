// Build: 20260923-004
// chrome-profile.mjs — dispose of a headless Chrome and its --user-data-dir.
//
// Every browser-driven harness in tools/ spawns Chrome with a throwaway profile
// under the system temp directory and removes it in a finally. That removal used
// to run a few hundred milliseconds after chrome.kill(), which on Windows is
// before the process has finished exiting: the profile's files are still locked,
// rmSync throws EBUSY/EPERM, and the surrounding try/catch swallows it.
//
// force:true is not the mistake — a profile that is already gone must never fail
// a check that otherwise passed. The mistake is that the same flag also hid a
// profile that was still sitting there. One evening of running these checks left
// 774 MB across 23 directories and nothing said a word about it.
//
// Two rules, and they are the whole point of this file:
//   1. WAIT for the process to actually exit before removing its profile.
//   2. REPORT a removal that could not be completed, rather than swallowing it.
//
// A leftover profile is untidiness, not a security finding, so a failed removal
// warns and does not change the caller's exit code.

import fs from 'node:fs';

const EXIT_GRACE_MS = 5000;   // how long a killed Chrome gets to exit on its own
const KILL_GRACE_MS = 2000;   // how long it then gets after SIGKILL
const RM_ATTEMPTS   = 12;     // bounded retries once the process is gone
const RM_BACKOFF_MS = 250;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function sleepSync(ms) {
  // Teardown only. Blocking the thread here is deliberate: the sync path runs
  // from a signal handler, where there is no turn of the event loop left.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function hasExited(child) {
  return !child || child.exitCode !== null || child.signalCode !== null;
}

/**
 * Kill a child process and wait for it to actually exit.
 * Resolves true if it is gone, false if it outlived both grace windows.
 */
export async function killAndWait(child, { grace = EXIT_GRACE_MS } = {}) {
  if (!child) return true;
  if (hasExited(child)) return true;

  const exited = new Promise(resolve => child.once('exit', () => resolve(true)));
  try { child.kill(); } catch {}
  if (await Promise.race([exited, sleep(grace).then(() => false)])) return true;

  try { child.kill('SIGKILL'); } catch {}
  return Promise.race([exited, sleep(KILL_GRACE_MS).then(() => false)]);
}

/**
 * Remove a profile directory, retrying while the OS still holds its files.
 * Warns — visibly, on stderr — if it survives every attempt. Returns true if
 * the directory is gone.
 */
export async function removeProfile(dir, label = 'harness') {
  if (!dir) return true;
  let last = null;
  for (let i = 0; i < RM_ATTEMPTS; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      if (!fs.existsSync(dir)) return true;
    } catch (err) {
      last = err;
    }
    await sleep(RM_BACKOFF_MS * (i + 1));
  }
  if (!fs.existsSync(dir)) return true;
  warnLeftover(label, dir, last);
  return false;
}

/**
 * The normal teardown: kill Chrome, wait for it to go, then remove its profile.
 * Never throws — a harness's finally block must not lose the real result.
 */
export async function disposeChrome(chrome, dir, label = 'harness') {
  try {
    const gone = await killAndWait(chrome);
    if (!gone) {
      warnLeftover(label, dir, new Error('the browser process did not exit'));
      return false;
    }
    return await removeProfile(dir, label);
  } catch (err) {
    warnLeftover(label, dir, err);
    return false;
  }
}

/**
 * The signal-handler teardown. Same contract, no event loop available, so the
 * wait is a bounded blocking poll rather than an 'exit' listener.
 */
export function disposeChromeSync(chrome, dir, label = 'harness') {
  try {
    if (chrome && !hasExited(chrome)) {
      try { chrome.kill(); } catch {}
      for (let i = 0; i < 20 && !hasExited(chrome); i++) sleepSync(100);
      if (!hasExited(chrome)) { try { chrome.kill('SIGKILL'); } catch {} sleepSync(500); }
    }
    if (!dir) return true;
    let last = null;
    for (let i = 0; i < 6; i++) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        if (!fs.existsSync(dir)) return true;
      } catch (err) { last = err; }
      sleepSync(200 * (i + 1));
    }
    if (!fs.existsSync(dir)) return true;
    warnLeftover(label, dir, last);
    return false;
  } catch (err) {
    warnLeftover(label, dir, err);
    return false;
  }
}

function warnLeftover(label, dir, err) {
  const why = err && err.message ? ` (${err.message})` : '';
  console.warn(`\n⚠ ${label}: could not remove the browser profile${why}`);
  console.warn(`  left behind: ${dir}`);
  console.warn('  Delete it by hand. These accumulate at tens of MB each.');
}

// ── Ports ─────────────────────────────────────────────────────────────
//
// The harnesses used to pick a fixed port from the process id and bind it with
// no error handling, so an unavailable port took down the whole check with a
// raw stack trace. On Windows that is not hypothetical: Hyper-V and WinNAT
// reserve blocks of TCP ports, and binding inside one fails with EACCES rather
// than EADDRINUSE. Port 8884 sits in a reserved block on this machine and
// inside the 8790–8939 window every server harness drew from, so roughly one
// run in a hundred and fifty died for a reason that looked like a flake.
//
// Walk forward until something binds, and report the port actually used.

const PORT_ATTEMPTS = 40;

export async function listenOnFreePort(server, preferred, host = '127.0.0.1') {
  let lastErr = null;
  for (let i = 0; i < PORT_ATTEMPTS; i++) {
    const port = preferred + i;
    try {
      await new Promise((resolve, reject) => {
        const onError = (err) => { server.removeListener('listening', onOk); reject(err); };
        const onOk = () => { server.removeListener('error', onError); resolve(); };
        server.once('error', onError);
        server.once('listening', onOk);
        server.listen(port, host);
      });
      return port;
    } catch (err) {
      if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) { lastErr = err; continue; }
      throw err;
    }
  }
  throw new Error(`no free port in ${preferred}..${preferred + PORT_ATTEMPTS - 1}` +
                  (lastErr ? ` (last: ${lastErr.code})` : ''));
}
