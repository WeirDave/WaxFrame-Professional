#!/usr/bin/env node
// ============================================================
// WaxFrame — release-check.mjs (v3.63.275)
//
// Pre-flight checks that run as a GitHub Action on every push to main,
// and can also be run locally (`node tools/release-check.mjs`). Catches
// the kinds of typos and drift that bit us in v3.63.131 and v3.63.180-182:
//
//   1. JS syntax — every .js file under js/ must parse cleanly.
//   2. Version-stamp consistency — APP_VERSION (js/version.js) must
//      match package.json `version`, the JSON-LD `softwareVersion` on
//      index.html, every helper page's ?v=X.Y.Z cache-bust on script
//      and stylesheet refs, and the `<meta name="waxframe-build">`
//      stamp + the `// Build:` comment on every JS file.
//   3. CSS token references — for every `var(--TOKEN)` in style.css,
//      the TOKEN must be defined in a :root rule somewhere in the
//      same file. This is the check that would have caught the
//      v3.63.131 `--space-22` and `--modal-w-md` typos which silently
//      failed at runtime with no browser warning.
//   4. Cache-bust drift — if style.css or any js/*.js changed since the
//      last reachable tag, APP_VERSION must have advanced. This catches
//      the v3.63.180-182 failure mode: CSS/JS shipped multiple times
//      against the same ?v= key, leaving CDN and browser caches serving
//      stale files until the next "ceremonial" bump finally swept the
//      cache-bust. Check 2 already enforces ?v= matches APP_VERSION;
//      check 4 enforces APP_VERSION advances when shipped code does.
//
// Exit 0 on success, 1 on any failure. Failures print a line per
// problem with file path + line number when possible, suitable for
// GitHub Actions to surface as annotations.
//
// Design notes:
//   • Pure Node stdlib — no npm deps. WaxFrame has no build step;
//     adding deps just for this check would invert the project's
//     "vanilla HTML/CSS/JS" stance.
//   • Read-only — never modifies any file. Inspecting state, not
//     fixing it.
//   • Regex-based, not AST-based. Trading completeness for speed +
//     zero deps. The patterns target the specific shapes WaxFrame's
//     codebase uses (e.g. the query-string cache-bust idiom, `var(--token)`
//     CSS calls). A more general validator would over-fit.
// ============================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = []; // { file, line?, msg }
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (file, msg, line) => { errors.push({ file, line, msg }); };
const section = (title) => console.log(`\n▶ ${title}`);

// ── Helpers ──────────────────────────────────────────────────

function walk(dir, predicate) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === '.claude' || entry === 'release-artifacts') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, predicate));
    else if (predicate(p)) out.push(p);
  }
  return out;
}

function rel(p) { return relative(ROOT, p).replace(/\\/g, '/'); }
function read(p) { return readFileSync(p, 'utf8'); }
function findLine(content, needle, fromIdx = 0) {
  const idx = content.indexOf(needle, fromIdx);
  if (idx < 0) return -1;
  return content.slice(0, idx).split('\n').length;
}

// ── Check 1: JS syntax + source integrity ───────────────────

section('JS syntax (node --check) + source integrity');

// .mjs added v3.63.511: js/pdf-loader.mjs had evaded both this check and the
// Build-stamp sweep in Check 2 for weeks purely because the walk filtered on
// `.js`. tools/**/*.mjs joins it here — those files are the release gate
// itself and its fixtures, and a syntax error in one of them is a gate that
// silently stops gating. tools/**/*.js is deliberately NOT included: the two
// Cloudflare Worker sources are ES modules carrying a `.js` extension, which
// `node --check` would reject as CommonJS.
const jsFiles = walk(join(ROOT, 'js'), p => p.endsWith('.js') || p.endsWith('.mjs'));
const toolFiles = walk(join(ROOT, 'tools'), p => p.endsWith('.mjs'));
for (const file of [...jsFiles, ...toolFiles]) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    ok(rel(file));
  } catch (e) {
    const stderr = (e.stderr ? e.stderr.toString() : '') || (e.message || '');
    fail(rel(file), `node --check failed: ${stderr.trim().split('\n')[0]}`);
  }
}

// Raw C0 control characters in source. Added v3.63.511 after a real one:
// js/wf-debug.js line 133 held a literal 0x08 BACKSPACE where the regex
// `\b` word-boundary escape was meant, so the Bearer/Basic redaction rule in
// scrubFailureRecord could never match and bearer tokens went into Scout
// bundles unredacted from v3.63.493 on. `node --check` passes on it — the
// byte is legal inside a regex literal, it just means something else — and
// it is invisible in an editor, so nothing but a byte-level scan finds it.
// Tab, LF and CR are the only control characters a source file may hold.
const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const integrityFiles = [
  ...jsFiles,
  ...toolFiles,
  ...walk(ROOT, p => p.endsWith('.html') || p.endsWith('.css'))
].filter(p => !rel(p).startsWith('lib/')); // vendored minified bundles are not ours to police
let controlHits = 0;
for (const file of integrityFiles) {
  const content = read(file);
  const idx = content.search(CONTROL_RE);
  if (idx >= 0) {
    controlHits++;
    const code = content.charCodeAt(idx).toString(16).padStart(2, '0');
    fail(rel(file), `raw control character 0x${code} in source — almost certainly a mangled backslash escape`,
      content.slice(0, idx).split('\n').length);
  }
}
if (controlHits === 0) ok(`${integrityFiles.length} source files: no raw control characters`);

// ── Check 2: Version-stamp consistency ──────────────────────

section('Version-stamp consistency');

// Extract APP_VERSION from js/version.js — e.g. "v3.63.133 Pro" → "3.63.133"
const versionJs = read(join(ROOT, 'js/version.js'));
const m1 = versionJs.match(/const\s+APP_VERSION\s*=\s*['"]v?([\d.]+)\s+Pro['"]/);
if (!m1) {
  fail('js/version.js', 'could not parse APP_VERSION');
}
const appVersion = m1 ? m1[1] : null;
ok(`APP_VERSION = ${appVersion}`);

// Extract package.json version
const pkg = JSON.parse(read(join(ROOT, 'package.json')));
if (appVersion && pkg.version !== appVersion) {
  fail('package.json', `version "${pkg.version}" != APP_VERSION "${appVersion}"`);
} else if (appVersion) {
  ok(`package.json version = ${pkg.version}`);
}

// Extract JSON-LD softwareVersion from index.html
const indexHtml = read(join(ROOT, 'index.html'));
const m2 = indexHtml.match(/"softwareVersion":\s*"([\d.]+)"/);
if (!m2) {
  fail('index.html', 'could not find JSON-LD softwareVersion');
} else if (appVersion && m2[1] !== appVersion) {
  fail('index.html', `JSON-LD softwareVersion "${m2[1]}" != APP_VERSION "${appVersion}"`, findLine(indexHtml, '"softwareVersion"'));
} else {
  ok(`index.html JSON-LD softwareVersion = ${m2[1]}`);
}

// Extract build stamp from js/version.js — // Build: YYYYMMDD-NNN
const m3 = versionJs.match(/\/\/\s*Build:\s*(\d{8}-\d{3})/);
const buildStamp = m3 ? m3[1] : null;
if (!buildStamp) {
  fail('js/version.js', 'could not parse Build stamp from header comment');
} else {
  ok(`Build stamp = ${buildStamp}`);
}

// Every HTML file should have matching ?v= cache-bust AND waxframe-build meta
// AND the comment-header `Build:` line (lines 3-4 of every HTML — was the
// silent drift surface that bit v3.63.275; comments don't fail tests so they
// rotted while the meta tag stayed current).
const htmlFiles = walk(ROOT, p => p.endsWith('.html') && !p.includes('node_modules') && !p.includes('.git'));
for (const file of htmlFiles) {
  const content = read(file);
  // Cache-bust check: every ?v=X.Y.Z should match APP_VERSION
  if (appVersion) {
    const vRefs = [...content.matchAll(/\?v=([\d.]+)/g)];
    for (const m of vRefs) {
      if (m[1] !== appVersion) {
        const lineNum = findLine(content, m[0]);
        fail(rel(file), `stale ?v=${m[1]} (expected ${appVersion})`, lineNum);
      }
    }
  }
  // Build-stamp meta check
  if (buildStamp) {
    const metaMatch = content.match(/<meta\s+name="waxframe-build"\s+content="(\d{8}-\d{3})"/);
    if (metaMatch && metaMatch[1] !== buildStamp) {
      const lineNum = findLine(content, metaMatch[0]);
      fail(rel(file), `stale waxframe-build meta "${metaMatch[1]}" (expected ${buildStamp})`, lineNum);
    }
    // HTML comment-header `Build:` line — bare "Build: YYYYMMDD-NNN" inside
    // an HTML comment block at the top of the file. The existing JS-file
    // check uses `// Build:` so this one needs its own pattern.
    const commentMatch = content.match(/<!--[\s\S]*?Build:\s*(\d{8}-\d{3})[\s\S]*?-->/);
    if (commentMatch && commentMatch[1] !== buildStamp) {
      const lineNum = findLine(content, `Build: ${commentMatch[1]}`);
      fail(rel(file), `stale comment-header Build: ${commentMatch[1]} (expected ${buildStamp})`, lineNum);
    }
  }
}

// Every JS file's Build: comment should match. v3.63.511 widened this from
// js/*.js to js/**/*.{js,mjs} plus tools/**/*.mjs, which closes two known
// gaps at once: js/pdf-loader.mjs was never stamp-checked, and the tools/
// scripts were swept off a hand-maintained list in CLAUDE.md that had already
// let tools/indexnow-ping.mjs rot ~90 releases behind. The rule is now simply
// "a file carrying a Build: header must carry the current one" — files with
// no header are skipped, so adding one is opt-in.
for (const file of [...jsFiles, ...toolFiles]) {
  const content = read(file);
  if (buildStamp) {
    const m = content.match(/\/\/\s*Build:\s*(\d{8}-\d{3})/);
    if (m && m[1] !== buildStamp) {
      const lineNum = findLine(content, m[0]);
      fail(rel(file), `stale // Build: ${m[1]} (expected ${buildStamp})`, lineNum);
    }
  }
  // v3.63.528 — the ?v= cache-bust check above walked HTML only, so a stamp
  // written into a JS file was never checked. Two were: the pdf.js loader
  // builds its own <script> src and its own dynamic import(), and both sat at
  // version 3.63.436 for ninety releases. A release sweep rewrites the stamp
  // it is replacing and nothing else, so a
  // stamp that misses a single sweep is skipped by every sweep after it and
  // freezes silently. That is not cosmetic — a returning browser keeps running
  // the cached file, so replacing a vendored library changed nothing for
  // anyone who had loaded the page before.
  if (appVersion) {
    for (const m of content.matchAll(/\?v=([\d.]+)/g)) {
      if (m[1] !== appVersion) {
        fail(rel(file), `stale ?v=${m[1]} (expected ${appVersion})`, findLine(content, m[0]));
      }
    }
  }
}

// js/app.js has a runtime BUILD const at the top — also ships into the
// Scout/diagnostic bundle envelope (wf-debug.js:337). Was a separate stamp
// from the `// Build:` comment pattern and silently rotted until v3.63.275.
if (buildStamp) {
  const appJs = read(join(ROOT, 'js/app.js'));
  const m = appJs.match(/const\s+BUILD\s*=\s*['"](\d{8}-\d{3})['"]/);
  if (m && m[1] !== buildStamp) {
    const lineNum = findLine(appJs, m[0]);
    fail('js/app.js', `stale const BUILD = '${m[1]}' (expected ${buildStamp})`, lineNum);
  } else if (m) {
    ok(`js/app.js const BUILD = ${m[1]}`);
  }
}

// style.css build stamp
const styleCss = read(join(ROOT, 'style.css'));
if (buildStamp) {
  const m = styleCss.match(/\/\*\s*Build:\s*(\d{8}-\d{3})/) || styleCss.match(/Build:\s*(\d{8}-\d{3})/);
  if (m && m[1] !== buildStamp) {
    const lineNum = findLine(styleCss, m[0]);
    fail('style.css', `stale Build: ${m[1]} (expected ${buildStamp})`, lineNum);
  }
}

// v3.63.551 — The changelog's own history must not move. A release sweep
// replaces the version it is superseding across every tracked file, and a
// blanket replacement will happily rewrite a version number that is a
// STATEMENT ABOUT THE PAST rather than a stamp. The v3.63.551 sweep rewrote
// two: the previous release's own CHANGELOG heading, and a note in the
// vendored inventory recording which release upgraded mammoth. Nothing in the
// gate noticed, because every stamp it checks was correct.
//
// Deliberately narrow, and the narrowness is the point. The first draft
// asserted that every heading in the file is strictly older than the one above
// it, and it failed on real history: v3.39.8 and v3.19.0 each legitimately
// have two entries, one release re-issued under one version. A check that
// fails the correct case is how checks get deleted. So this asserts only the
// three things a rewritten-past-version looks like and nothing about the rest
// of the file:
//
//   • the newest heading is the version being released
//   • that version appears exactly once as a heading
//   • the heading below it is strictly older
//
// The sweep's mistake trips all three at once: it turns the previous heading
// into this one, so the newest version appears twice and the second is no
// longer older.
const changelog = read(join(ROOT, 'CHANGELOG.md'));
const clHeads = [...changelog.matchAll(/^##\s+v(\d+)\.(\d+)\.(\d+)/gm)]
  .map(m => ({ raw: `${m[1]}.${m[2]}.${m[3]}`, n: [+m[1], +m[2], +m[3]] }));
if (!clHeads.length) {
  fail('CHANGELOG.md', 'no "## vX.Y.Z" headings found — the format changed, so this check is now blind');
} else if (appVersion) {
  if (clHeads[0].raw !== appVersion) {
    fail('CHANGELOG.md', `newest heading is v${clHeads[0].raw} but APP_VERSION is ${appVersion} — this release has no entry, or the sweep rewrote the previous one`,
      findLine(changelog, `## v${clHeads[0].raw}`));
  } else {
    ok(`CHANGELOG.md newest heading = v${clHeads[0].raw}`);
  }
  const sameAsCurrent = clHeads.filter(h => h.raw === appVersion).length;
  if (sameAsCurrent > 1) {
    fail('CHANGELOG.md', `v${appVersion} appears as ${sameAsCurrent} headings — a release sweep rewriting a past version looks exactly like this`);
  } else if (sameAsCurrent === 1) {
    ok(`CHANGELOG.md: v${appVersion} appears once`);
  }
  // Zero is reported by the newest-heading check above, not here. Saying
  // "appears once" for a version that appears no times is the kind of true-
  // looking line that makes a gate's output stop being read.
  if (clHeads.length > 1) {
    const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
    if (cmp(clHeads[1].n, clHeads[0].n) >= 0) {
      fail('CHANGELOG.md', `the heading below the newest is v${clHeads[1].raw}, which is not older than v${clHeads[0].raw}`,
        findLine(changelog, `## v${clHeads[1].raw}`));
    } else {
      ok(`CHANGELOG.md: previous heading v${clHeads[1].raw} is older`);
    }
  }
}

// The same sweep rewrites the build stamp, and the changelog records one per
// release. If the current stamp appears against more than one entry, a past
// entry was overwritten — the identical mistake one line down from the
// version heading, and it happened in the same sweep the check above exists
// for. Asserting "exactly one" rather than "the newest one matches" is what
// makes it catch the overwrite instead of just the omission.
if (buildStamp) {
  const clBuilds = [...changelog.matchAll(/^\*\*Build:\*\*\s*(\d{8}-\d{3})/gm)].map(m => m[1]);
  const hits = clBuilds.filter(s => s === buildStamp).length;
  if (hits === 0) {
    fail('CHANGELOG.md', `no entry records build ${buildStamp} — this release has no changelog entry`);
  } else if (hits > 1) {
    fail('CHANGELOG.md', `build ${buildStamp} is recorded against ${hits} entries — a release sweep overwrote a past entry's stamp`);
  } else {
    ok(`CHANGELOG.md: build ${buildStamp} recorded once`);
  }
}

// ── Check 3: CSS token references ───────────────────────────

section('CSS token references (var(--TOKEN) must be defined)');

// Two layers of "defined":
//
//  (a) Theme-level tokens declared in :root { } blocks — these are the
//      design-system tokens (--accent, --space-14, etc.). A typo'd
//      reference to one of these is what bit us in v3.63.131.
//
//  (b) Locally-scoped CSS custom properties declared ANYWHERE else —
//      typically animation params (--dx, --dy, --dur), keyframe-driven
//      values, or per-element overrides set via style="--foo: 5px" in
//      HTML. These are legitimate even though they're not in :root.
//      We accept them as long as the property name appears somewhere
//      else in style.css too — i.e. it's a "known" property name.
//
// Combining both into one "defined" set is permissive but catches the
// real failure mode (theme-token typos that silently fall back) without
// flagging legitimate scoped tokens. Also scans HTML files for
// style="--foo: ..." inline definitions which set custom properties on
// specific elements (typically used to parameterize a CSS animation
// or template-literal-style component).
const defined = new Set();
const rootBlocks = [...styleCss.matchAll(/:root[^{]*\{([^}]+)\}/g)];
for (const block of rootBlocks) {
  const body = block[1];
  for (const m of body.matchAll(/--([\w-]+)\s*:/g)) {
    defined.add(m[1]);
  }
}
const rootCount = defined.size;
// Layer (b): any --token: definition anywhere in style.css (not just :root)
for (const m of styleCss.matchAll(/--([\w-]+)\s*:/g)) {
  defined.add(m[1]);
}
// Layer (b) cont.: any style="--token: ..." inline def in any HTML file
for (const file of htmlFiles) {
  const content = read(file);
  for (const m of content.matchAll(/style="[^"]*--([\w-]+)\s*:/g)) {
    defined.add(m[1]);
  }
  // Also accept declarations inside <style> blocks (helper pages like
  // help.html keep their CSS inline rather than depending on style.css).
  for (const m of content.matchAll(/--([\w-]+)\s*:/g)) {
    defined.add(m[1]);
  }
}
// Layer (b) cont.: scan JS files for `style.setProperty('--foo', …)` or
// for `--foo:` patterns inside template-literal strings (this is how the
// hive-smoke-particle effects and similar JS-spawned elements parameterize
// their CSS animations). Without this, the static-only check would flag
// every animation parameter as undefined.
for (const file of jsFiles) {
  const content = read(file);
  for (const m of content.matchAll(/setProperty\(\s*['"`]--([\w-]+)['"`]/g)) {
    defined.add(m[1]);
  }
  for (const m of content.matchAll(/--([\w-]+)\s*:/g)) {
    defined.add(m[1]);
  }
}

ok(`${rootCount} :root tokens + ${defined.size - rootCount} scoped/inline → ${defined.size} total`);

// Find every var(--TOKEN) reference and verify it's defined.
// Note: var(--foo, fallback) is fine — we still check that foo is defined,
// since a typo'd token with a fallback would silently use the fallback
// (which is the exact failure mode the v3.63.131 audit caught).
const refs = [...styleCss.matchAll(/var\(\s*--([\w-]+)\s*[,)]/g)];
const referenced = new Set(refs.map(m => m[1]));
let missing = 0;
for (const ref of refs) {
  const token = ref[1];
  if (!defined.has(token)) {
    const lineNum = findLine(styleCss, ref[0]);
    fail('style.css', `undefined CSS token: var(--${token})`, lineNum);
    missing++;
  }
}
if (missing === 0) {
  ok(`${referenced.size} unique token refs, all defined`);
} else {
  ok(`${referenced.size} unique token refs, ${missing} undefined (see above)`);
}

// ── Check 4: Cache-bust drift since last tag ────────────────

section('Cache-bust drift since last tag');

// The failure mode: between v3.63.180 and v3.63.182, three "ceremonial"
// releases shipped CSS/JS changes without the cache-bust ?v= query
// advancing. End result was CDN + browser caches serving stale files
// until v3.63.183 finally swept the key. Check 2 enforces ?v= matches
// APP_VERSION; this check enforces that APP_VERSION moved since the last
// release whenever shippable code did. The two checks combined close the
// loop: ship code → bump APP_VERSION → ?v= follows.
//
// Compares HEAD against the most recent tag reachable from HEAD. If HEAD
// itself is tagged (the typical case immediately after a release-cut
// commit), looks at the PREVIOUS tag instead via HEAD^. Skips silently
// when no reachable tag exists — first commit on a fresh repo, shallow
// CI clone without `fetch-depth: 0`, or PR branches that haven't been
// rebased onto a tagged main. The skip is intentional: a missing tag is
// noise, not a real drift signal.

function gitOut(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch {
    return null;
  }
}

let prevTag = null;
const tagOnHead = gitOut(['tag', '--points-at', 'HEAD']);
const describeRef = tagOnHead ? 'HEAD^' : 'HEAD';
prevTag = gitOut(['describe', '--tags', '--abbrev=0', '--match', 'v*', describeRef]);

if (!prevTag) {
  ok('no reachable tag — skipping (first commit, shallow clone, or no tag history)');
} else {
  const diffOut = gitOut(['diff', '--name-only', `${prevTag}..HEAD`]);
  if (diffOut === null) {
    ok(`could not diff against ${prevTag} — skipping`);
  } else {
    const changed = diffOut ? diffOut.split('\n') : [];
    const shipped = changed.filter(f => f === 'style.css' || /^js\/[^/]+\.js$/.test(f));

    if (shipped.length === 0) {
      ok(`no CSS/JS changes since ${prevTag}`);
    } else {
      // Read APP_VERSION at prevTag for comparison. If the file didn't
      // exist there or its shape was different, fall back to the tag's
      // own name as a proxy (v3.63.182 → 3.63.182). The tag-name fallback
      // is sound because the tag IS the version stamp by convention.
      const prevVersionJs = gitOut(['show', `${prevTag}:js/version.js`]);
      let prevAppVersion = null;
      if (prevVersionJs) {
        const m = prevVersionJs.match(/const\s+APP_VERSION\s*=\s*['"]v?([\d.]+)\s+Pro['"]/);
        if (m) prevAppVersion = m[1];
      }
      if (!prevAppVersion) {
        const m = prevTag.match(/^v?([\d.]+)/);
        if (m) prevAppVersion = m[1];
      }

      if (appVersion && prevAppVersion && appVersion === prevAppVersion) {
        const preview = shipped.slice(0, 5).join(', ');
        const more = shipped.length > 5 ? ` (+${shipped.length - 5} more)` : '';
        fail('js/version.js', `${shipped.length} CSS/JS file(s) changed since ${prevTag} but APP_VERSION still ${appVersion} — bump APP_VERSION so ?v= invalidates stale caches. Changed: ${preview}${more}`);
      } else if (appVersion && prevAppVersion) {
        ok(`${shipped.length} CSS/JS file(s) changed since ${prevTag}; APP_VERSION advanced ${prevAppVersion} → ${appVersion}`);
      } else {
        ok(`${shipped.length} CSS/JS file(s) changed since ${prevTag}; could not compare APP_VERSION (skipping)`);
      }
    }
  }
}

// ── Check 5: Content-Security-Policy presence ─────────────

section('Content-Security-Policy meta tag (every HTML file)');

// Defends against silent removal of the CSP added in v3.63.340. The policy
// itself is permissive on script-src (the app's inline-handler architecture
// would break under strict-CSP without a multi-release migration), but it
// locks down the truly unused attack surface — object/embed, base-uri,
// form-action, http downgrades. Losing those is a regression no test loop
// would catch otherwise, since the CSP doesn't change rendered behavior.

const REQUIRED_CSP_DIRECTIVES = [
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
  // v3.63.366 — script-src strict-CSP RE-TIGHTENED. The v3.63.360
  // rollback restored 'unsafe-inline' on script-src after the v3.63.353
  // strict cutover broke ~107 inline on*= attributes embedded in
  // template literals inside js/app.js (the original migration only
  // swept static HTML and missed the template-string handlers, which
  // injected via innerHTML at render time). Phase 8 (v3.63.361 →
  // v3.63.365) migrated every one of those to data-action / data-fn
  // delegation routed through the dispatcher in js/helper-handlers.js.
  // Ratchet for tracked JS files is now zero. With every inline
  // handler gone, 'unsafe-inline' can drop again and the head-guard
  // sha256 pins the pre-paint inline <script> in its place.
  //
  // The head-guard hash below is for the CURRENT content of the v3.63.345
  // clickjacking + CSP-violation block (recomputed in v3.63.366 because
  // the original v3.63.353 hash was for a different content snapshot).
  // CSP3 rule: when ANY hash is present in a script-src directive,
  // 'unsafe-inline' is ignored — so keeping the hash here AND a stray
  // 'unsafe-inline' would silently re-block the dynamic handlers. The
  // dedicated "must NOT contain 'unsafe-inline'" check below catches
  // any future regression.
  //
  // 'unsafe-eval' stays. SheetJS / mammoth.browser / pdf.js use
  // new Function() internals for their parsers; dropping eval would
  // break every Word / Excel / PDF import.
  "'sha256-7Y4L6Gvf5pUX/QazVPPy8L2NNVJXPiwOtKXXiGsW4Kg='",  // <script> head guard (clickjacking + CSP-violation listener)
  //
  // v3.63.380 — style-src strict CLOSE-OUT. The v3.63.367 → v3.63.379
  // arc migrated every inline `style="display:none*"` attribute in the
  // HTML to a shared `.is-hidden` utility class (which lives in
  // style.css for the app pages and inside help.html's own inline
  // <style> for the self-contained break-glass page). With zero
  // attribute-value styles left, 'unsafe-hashes' AND the three
  // attribute hashes can all drop. The help.html big <style> block
  // gained the .is-hidden + .wipe-status-spacer rules, so its sha256
  // changed; the new hash is below.
  "'sha256-bQY2E+lKIxmgh8LMogBp9rdv0Dv7ap3tp2TdMtYuYYo='",  // <style> head guard (framebust hide)
  // <style> help.html break-glass (now with .is-hidden + .wipe-status-spacer).
  // Hash is computed over the HTML5-parsed textContent of the <style> element
  // (the canonical form the browser uses for CSP hash matching) — newlines
  // are normalized to LF and the surrounding whitespace inside the element
  // is preserved verbatim. Computed by DOMParser('text/html'), which is what
  // every modern browser does.
  "'sha256-hdqL9dwb/eI2C+1dFzfMlqXVyj8sPJpj9zPJpvG5jzs='"
];

for (const file of htmlFiles) {
  const content = read(file);
  const cspMatch = content.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  if (!cspMatch) {
    fail(rel(file), 'missing CSP meta tag (regressed from v3.63.340 baseline)');
    continue;
  }
  const policy = cspMatch[1];
  const missing = REQUIRED_CSP_DIRECTIVES.filter(d => !policy.includes(d));
  if (missing.length) {
    fail(rel(file), `CSP missing required directive(s): ${missing.join(', ')}`);
    continue;
  }
  // v3.63.366 — script-src strict cutover RE-LANDED. Phase 8
  // (v3.63.361 → v3.63.365) migrated every template-string inline on*=
  // handler in js/ to data-action delegation routed through the
  // dispatcher in helper-handlers.js. With the ratchet at zero,
  // 'unsafe-inline' drops from script-src and the pre-paint head
  // guard is pinned with the sha256 listed in REQUIRED_CSP_DIRECTIVES.
  // Adding 'unsafe-inline' back would silently re-break the dispatch
  // because CSP3 ignores hashes when 'unsafe-inline' is present —
  // any future regression on this directive must fail CI here.
  // 'unsafe-eval' stays (SheetJS / mammoth / pdf.js use new Function()
  // internally — dropping it would break document import).
  const scriptSrc = (policy.match(/script-src\s+([^;]+)/) || [])[1] || '';
  if (/'unsafe-inline'/.test(scriptSrc)) {
    fail(rel(file), `CSP script-src must NOT contain 'unsafe-inline' (strict-CSP re-tightened in v3.63.366 after Phase 8 inline-handler migration). Got: script-src ${scriptSrc.trim()}`);
    continue;
  }
  // v3.63.356 strict style-src cutover — style-src must NOT contain
  // 'unsafe-inline'. Inline <style> blocks are pinned via the two
  // sha256 entries listed above (framebust hide + help.html break-
  // glass); a new value introduced anywhere needs its hash added to
  // that list or the browser will block the style.
  //
  // v3.63.380 close-out — style-src must NOT contain 'unsafe-hashes'
  // either. Pre-v3.63.380, 'unsafe-hashes' + three attribute-value
  // hashes covered the inline `style="display:none*"` attrs scattered
  // across index.html / help.html / templates.html. The v3.63.367 →
  // v3.63.379 cleanup arc removed every one of those, so the keyword
  // and its three companion hashes all dropped. Adding 'unsafe-hashes'
  // back would silently re-allow any new inline style attribute that
  // hash-matched, defeating the whole arc.
  const styleSrc = (policy.match(/style-src\s+([^;]+)/) || [])[1] || '';
  if (/'unsafe-inline'/.test(styleSrc)) {
    fail(rel(file), `CSP style-src must NOT contain 'unsafe-inline' (strict style-src cutover landed in v3.63.356). Got: style-src ${styleSrc.trim()}`);
    continue;
  }
  if (/'unsafe-hashes'/.test(styleSrc)) {
    fail(rel(file), `CSP style-src must NOT contain 'unsafe-hashes' (strict-CSS close-out landed in v3.63.380 after all inline style="display:none*" attributes migrated to .is-hidden). Got: style-src ${styleSrc.trim()}`);
    continue;
  }
  ok(rel(file));
}

// ── Check 6: Clickjacking guard + CSP violation listener presence ───

section('Clickjacking guard + CSP violation listener (every HTML file)');

// Defends against silent removal of the inline security hook added in
// v3.63.345. Two security mechanisms ride that single inline block:
// (a) frame-busting class + JS that hides the page when embedded in an
// iframe (GitHub Pages can't set the HTTP frame-ancestors directive, so
// the client-side check is our equivalent), and (b) a securitypolicy
// violation listener that captures CSP-blocked actions into the Deep Dive
// ring buffer for forensic visibility. Losing either is a security
// regression no functional test would catch.

for (const file of htmlFiles) {
  const content = read(file);
  const hasFrameClass = content.includes('wf-framebusted');
  const hasViolationListener = content.includes('securitypolicyviolation');
  if (!hasFrameClass && !hasViolationListener) {
    fail(rel(file), 'missing both clickjacking guard AND CSP violation listener (regressed from v3.63.345 baseline)');
  } else if (!hasFrameClass) {
    fail(rel(file), 'missing clickjacking guard (wf-framebusted class)');
  } else if (!hasViolationListener) {
    fail(rel(file), 'missing CSP violation listener (securitypolicyviolation event)');
  } else {
    ok(rel(file));
  }
}

// ── Check 7: Vendored library version floors ───────────────

section('Vendored library floors (CVE-tracked minimums)');

// For each library, we extract its version from the vendored minified blob
// and assert it's at or above a known-safe floor. SheetJS specifically is
// NOT in Dependabot (see SECURITY.md — npm no longer publishes; the canonical
// source is cdn.sheetjs.com). Pre-v3.63.339, that gap was covered only by
// manual discipline against the SheetJS advisory page — a process this check
// replaces with automation.
//
// Floors are bumped DELIBERATELY when a new advisory drops — keeping a CVE-
// tracked floor in code (instead of a wiki page) means the next person to
// bump a vendored file gets an automatic comparison against the last known
// safe version. To bump a floor: change the `floor` value below in the same
// commit that ships the new vendored file.

const LIB_FLOORS = [
  {
    file: 'lib/pdf.min.mjs',
    name: 'pdf.js (ESM, served over http)',
    // GHSA-hq66-cqwq-w95j — HIGH, affects >= 5.6.83 and < 6.2.108.
    // v3.63.528 moved this build 4.10.38 -> 6.3.289. The old version was not
    // in that range and the new one is past it, but several 6.x releases sit
    // INSIDE it: taking 6.0.227 or 6.1.200 would have looked like an upgrade
    // while moving onto a high-severity advisory. This floor makes that a
    // build failure instead of something nobody notices.
    //
    // The classic build in lib/pdf.min.js is deliberately NOT floored here.
    // It is pinned at 3.11.174 because pdfjs-dist has published ESM only
    // since 4.x and browsers refuse ESM imports across file:// origins, so
    // no newer version exists in a form the portable copy can load. It is
    // therefore below the fix for GHSA-wgrm-67xf-hhpq (CVE-2024-4367), and
    // the mitigation is isEvalSupported:false passed at every getDocument()
    // call site — asserted separately below. A floor here would fail every
    // build forever and teach people to ignore this stage.
    floor: '6.2.108',
    extract: (content) => {
      // The bundle is minified, so the exported `version` const is renamed
      // to something like Lt. What survives minification is the apiVersion
      // field pdf.js sends to its own worker for a compatibility check — it
      // is a string literal with a stable key, present in every 2.x-6.x
      // build, and it is by definition the version of this file.
      const m = content.match(/apiVersion\s*:\s*["']([\d.]+)["']/);
      return m ? m[1] : null;
    }
  },
  {
    file: 'lib/xlsx.full.min.js',
    name: 'SheetJS xlsx',
    // SECURITY.md: tracked manually against cdn.sheetjs.com.
    // Known CVEs that determined this floor:
    //   • CVE-2023-30533 (Prototype Pollution) — fixed in 0.19.3
    //   • CVE-2024-22363 (ReDoS in NUMBER parser) — fixed in 0.20.2
    // 0.20.3 is past both. Bump this floor whenever a newer advisory
    // applies AND you ship a newer vendored file.
    floor: '0.20.3',
    extract: (content) => {
      // Main XLSX bundle has multiple inner libs each carrying their own
      // `version:"X.Y.Z"`. The main XLSX version is the only 0.x in the set
      // (sub-libs cptable / codepages / etc. are 1.x or 2.x).
      const m = content.match(/version["']?\s*[:=]\s*["'](0\.\d+\.\d+)["']/);
      return m ? m[1] : null;
    }
  }
];

function cmpVer(a, b) {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

for (const lib of LIB_FLOORS) {
  let content;
  try {
    content = read(join(ROOT, lib.file));
  } catch (e) {
    fail(lib.file, `vendored library missing — release-check expected to find it at this path`);
    continue;
  }
  const ver = lib.extract(content);
  if (!ver) {
    fail(lib.file, `${lib.name}: could not extract version from vendored blob — version-detection regex in tools/release-check.mjs may need updating after a library refactor`);
    continue;
  }
  if (cmpVer(ver, lib.floor) < 0) {
    fail(lib.file, `${lib.name}: vendored version ${ver} is below safety floor ${lib.floor} — known CVEs apply, ship a newer file (SheetJS: cdn.sheetjs.com)`);
    continue;
  }
  ok(`${lib.name} = ${ver} (floor ${lib.floor})`);
}

// The classic build (lib/pdf.min.js, 3.11.174) sits below the fix for
// GHSA-wgrm-67xf-hhpq / CVE-2024-4367 and cannot be upgraded: pdfjs-dist has
// shipped ESM only since 4.x, and browsers refuse ESM imports across file://
// origins, so no newer version can load in the portable copy at all. What
// carries that risk is a runtime option — isEvalSupported:false — passed
// wherever a PDF is opened. It is one word, it is easy to drop during an
// unrelated edit, and nothing else in this repo would notice.
{
  const appJs = read(join(ROOT, 'js/app.js'));
  const calls = [...appJs.matchAll(/getDocument\s*\(\s*\{([^}]*)\}/g)];
  if (!calls.length) {
    fail('js/app.js', 'no getDocument() call found — the CVE-2024-4367 mitigation check can no longer see the call sites it guards');
  } else {
    const unguarded = calls.filter(c => !/isEvalSupported\s*:\s*false/.test(c[1]));
    if (unguarded.length) {
      fail('js/app.js',
        `${unguarded.length} of ${calls.length} getDocument() call(s) omit isEvalSupported:false — that option is the mitigation for CVE-2024-4367 on the portable file:// build, which is pinned below the library-level fix and cannot be upgraded`,
        findLine(appJs, unguarded[0][0].slice(0, 40)));
    } else {
      ok(`CVE-2024-4367 mitigation present at all ${calls.length} getDocument() call site(s)`);
    }
  }
}

// SECURITY.md states the pdf.js versions by number, and it is the document a
// security researcher reads before deciding whether a finding is already
// known. It went stale: v3.63.528 moved the ESM build 4.10.38 -> 6.3.289 and
// updated the inventory, the floor and the gate, but not the prose. The
// public statement named a version two majors behind what actually shipped
// for nineteen releases, so anyone assessing the hosted build was assessing
// the wrong library.
//
// Nothing caught it because everything that is checked here is
// machine-readable — docs/vendored-dependencies.json is hash-verified at
// check 17, the floor is compared at check 7 — and the sentence a human
// reads was the one part with no check behind it. Same shape as the install
// scripts: half a family verified, half never looked at.
//
// Narrowed to pdf.js deliberately. SECURITY.md also cites SheetJS 0.18.5 as
// the *stale npm* version it is explicitly not shipping, so a blanket "every
// version token must be in the inventory" rule would fail on a sentence that
// is correct.
{
  const security = read(join(ROOT, 'SECURITY.md'));
  const inventory = JSON.parse(read(join(ROOT, 'docs/vendored-dependencies.json')));
  const shipped = new Set(
    inventory.dependencies
      .filter(d => d.name.startsWith('pdfjs-dist'))
      .map(d => d.version)
  );

  if (!shipped.size) {
    fail('docs/vendored-dependencies.json',
      'no pdfjs-dist entry found — the SECURITY.md version cross-check can no longer see what is shipped');
  } else {
    // Any version number stated within a sentence that mentions pdf.js.
    const claimed = new Set();
    for (const line of security.split('\n')) {
      if (!/pdf\.?js/i.test(line)) continue;
      for (const m of line.matchAll(/\b(\d+\.\d+\.\d+)\b/g)) claimed.add(m[1]);
    }

    const wrong = [...claimed].filter(v => !shipped.has(v));
    if (wrong.length) {
      fail('SECURITY.md',
        `states pdf.js version(s) ${wrong.join(', ')} that are not what is shipped (${[...shipped].sort().join(', ')}) — SECURITY.md is the public record of an accepted risk and naming the wrong version makes it wrong about what users are running`,
        findLine(security, wrong[0]));
    } else if (!claimed.size) {
      fail('SECURITY.md',
        'names no pdf.js version — the accepted risk on the portable build is disclosed by version number, and this check has nothing left to verify');
    } else {
      ok(`SECURITY.md pdf.js versions match what is shipped (${[...claimed].sort().join(', ')})`);
    }
  }
}

// ── Check 8: Inline-handler budget (strict-CSP migration ratchet) ──

section('Inline event-handler budget (strict-CSP migration ratchet)');

// The strict-CSP migration (started in v3.63.347) tightens script-src to
// drop 'unsafe-inline'. Every inline on*= attribute (onclick, oninput,
// onkeydown, …) must be replaced with addEventListener / data-action
// delegation before the directive can be removed.
//
// This check is a ratchet: per-file budgets fixed below, releases can
// only HOLD or DECREASE them, never increase. The budget for a migrated
// file is 0 — adding back any inline handler fails CI. New HTML files
// must be added to the table with budget 0, no exceptions.
//
// To update after a migration release: re-run this check, copy the
// reported actual counts into INLINE_HANDLER_BUDGET below for any file
// whose count went down. A file at 0 is "strict-CSP-clean" and forms
// part of the implicit allowlist for the eventual script-src
// tightening.

const INLINE_HANDLER_BUDGET = {
  'ai-api-pricing.html':          0, // migrated in v3.63.348
  'ai-business-proposal.html':    0, // migrated in v3.63.348
  'ai-cover-letter-editor.html':  0, // migrated in v3.63.348
  'ai-resume-review.html':        0, // migrated in v3.63.348
  'api-details.html':             0, // migrated in v3.63.349
  'document-playbooks.html':      0, // migrated in v3.63.348
  'help.html':                    0,
  'hive-profiles.html':           0, // migrated in v3.63.348
  'index.html':                   0, // migrated in v3.63.351
  'open-webui-setup.html':        0, // new in v3.63.472
  'privacy.html':                 0, // migrated in v3.63.348
  'prompt-editor.html':           0, // migrated in v3.63.350
  'start-here.html':              0, // migrated in v3.63.347
  'templates.html':               0, // migrated in v3.63.348
  'terms.html':                   0, // migrated in v3.63.348
  'waxframe-user-manual.html':    0, // migrated in v3.63.348
  'what-are-tokens.html':         0  // migrated in v3.63.348
};

// v3.63.488 — drag/drop event names added. They were missing from this
// list since the check was written, and it cost a real bug: the
// v3.63.351 migration left six ondragenter/ondragover/ondragleave/ondrop
// attributes behind on index.html's two drop zones, this regex could not
// see them, and the check happily reported index.html as
// "strict-CSP-clean (0 inline handlers)". When v3.63.366 re-tightened
// script-src the browser stopped compiling those attributes and both
// drop zones died silently — the handler functions still existed on
// window, so nothing that merely asserted their presence would catch it.
// Keep this list exhaustive: an event name missing here is a handler the
// ratchet cannot protect.
const INLINE_HANDLER_RE = /\son(click|dblclick|input|change|keydown|keyup|keypress|submit|reset|focus|focusin|focusout|blur|mousedown|mouseup|mousemove|mouseover|mouseout|mouseenter|mouseleave|contextmenu|wheel|scroll|dragstart|dragenter|dragover|dragleave|dragend|drag|drop|paste|copy|cut|touchstart|touchend|touchmove|animationend|transitionend|load|error)\s*=/gi;

for (const file of htmlFiles) {
  const r = rel(file);
  const content = read(file);
  const count = (content.match(INLINE_HANDLER_RE) || []).length;
  if (!(r in INLINE_HANDLER_BUDGET)) {
    fail(r, `new HTML file has no INLINE_HANDLER_BUDGET entry — add one in tools/release-check.mjs (must be 0 for new files post-v3.63.347)`);
    continue;
  }
  const budget = INLINE_HANDLER_BUDGET[r];
  if (count > budget) {
    fail(r, `inline on*= handler count regressed: ${count} > budget ${budget}. Migrate the new handlers to data-action / addEventListener (see js/helper-handlers.js for the delegation pattern), or ratchet by reducing other handlers in the same file. Budgets ratchet down only.`);
  } else if (count < budget) {
    ok(`${r}: ${count} / budget ${budget} — ratchet budget DOWN to ${count} in tools/release-check.mjs`);
  } else if (budget === 0) {
    ok(`${r}: strict-CSP-clean (0 inline handlers)`);
  } else {
    ok(`${r}: ${count} / budget ${budget}`);
  }
}

// ── Check 9: Inline-script count (post-v3.63.352 strict-CSP) ──

section('Inline <script> count (strict-CSP migration ratchet)');

// v3.63.352 finished extracting every page-specific inline <script>
// block to external js/*.js files. The only inline script that
// remains is the v3.63.345 pre-paint head guard (clickjacking class
// hook + CSP-violation ring-buffer listener) which MUST stay inline
// because any external file load gives an attacker a window of
// visible-but-clickable UI before the guard runs. When 'unsafe-
// inline' drops from script-src that head block will be pinned by
// a 'sha256-' entry in the directive.
//
// Until then, this check enforces the invariant: every HTML page
// has exactly ONE inline <script> content block (the head guard).
// Any new inline block introduced after v3.63.352 fails CI per
// this check, forcing the author to extract it before merge.

const SCRIPT_OPEN_TAG = /<script(\s[^>]*)?>/gi;
// Strip <!-- ... --> comments first so example markup inside an HTML
// comment doesn't get counted as a real inline script. Multiline-safe.
// Looped to a fixed point: a single pass can leave a fresh '<!--' exposed
// when comments are malformed/overlapping (e.g. '<!--<!-- -->'), which
// would otherwise slip an unstripped comment marker past this sanitizer.
const stripComments = (text) => {
  let prev;
  do {
    prev = text;
    text = text.replace(/<!--[\s\S]*?-->/g, '');
  } while (text !== prev);
  return text;
};

for (const file of htmlFiles) {
  const r = rel(file);
  const content = stripComments(read(file));
  let inlineCount = 0;
  let m;
  SCRIPT_OPEN_TAG.lastIndex = 0;
  while ((m = SCRIPT_OPEN_TAG.exec(content)) !== null) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;             // external <script src=...>
    if (/\btype\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue; // JSON-LD data, not executable
    inlineCount++;
  }
  if (inlineCount === 0) {
    fail(r, `expected exactly 1 inline <script> (the v3.63.345 head guard); found 0 — the clickjacking + CSP-violation listener went missing`);
  } else if (inlineCount === 1) {
    ok(`${r}: 1 inline <script> (the head guard)`);
  } else {
    fail(r, `expected exactly 1 inline <script> (the v3.63.345 head guard); found ${inlineCount}. v3.63.352 extracted every other inline block to external js/*.js files — extract any new inline content the same way before merging.`);
  }
}

// ── Check 10: Prompt/DEFAULTS equivalence ───────────────────

section('Prompt equivalence (tools/verify-prompts-equivalence.mjs)');

// v3.63.415 — This tool existed, was documented in CLAUDE.md's release
// sweep, and was never actually invoked by anything automated — the same
// "trusted by habit, never enforced" gap that let the pricing Worker's
// deploy step get silently skipped for 6 weeks (v3.63.251), found via a
// full-codebase audit hunting for more instances of exactly that pattern.
// Shell out rather than import — the tool calls its own process.exit(),
// which would kill this script before every other check gets to run and
// report if it were imported in-process instead.
try {
  execFileSync(process.execPath, [join(ROOT, 'tools/verify-prompts-equivalence.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/verify-prompts-equivalence.mjs — pass');
} catch (e) {
  const out = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
  const tail = out.split('\n').filter(l => l.includes('MISSING') || l.includes('DRIFT') || l.includes('NOT FOUND') || l.includes('REGRESSION') || l.includes('LIVE REF') || l.includes('EVAL_ERROR'));
  fail('tools/verify-prompts-equivalence.mjs', `prompt/DEFAULTS drift detected — run it locally for full output. Failures: ${tail.length ? tail.join(' | ') : (out.slice(-300) || 'non-zero exit, no output captured')}`);
}

// ── Check 11: Pricing coverage (tools/check-pricing-coverage.mjs) ──

section('Pricing coverage (tools/check-pricing-coverage.mjs)');

// v3.63.437 — every model curated in js/provider-catalog.js's fallback
// arrays must have a tracked row in tools/pricing-worker/data/pricing-seed.json,
// even if its pricing status is needs-verification. Shell out for the same
// reason as Check 10 — the tool calls its own process.exit().
try {
  execFileSync(process.execPath, [join(ROOT, 'tools/check-pricing-coverage.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/check-pricing-coverage.mjs — pass');
} catch (e) {
  const out = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
  const tail = out.split('\n').filter(l => l.trim().startsWith('•'));
  fail('tools/check-pricing-coverage.mjs', `pricing coverage drift detected — run it locally for full output. Failures: ${tail.length ? tail.join(' | ') : (out.slice(-300) || 'non-zero exit, no output captured')}`);
}

// ── Check 12: Pricing Worker review-gate behavior (tools/pricing-worker/test-refresh-logic.mjs) ──

section('Pricing Worker review-gate behavior (tools/pricing-worker/test-refresh-logic.mjs)');

// v3.63.437 — pure-function unit tests for decideModelUpdate() (the logic
// that decides whether a Sonar-researched price auto-confirms or holds for
// human review). No KV/network involved, so this runs fast and in-process
// via a plain node --check-style invocation.
try {
  execFileSync(process.execPath, [join(ROOT, 'tools/pricing-worker/test-refresh-logic.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/pricing-worker/test-refresh-logic.mjs — pass');
} catch (e) {
  const out = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
  const tail = out.split('\n').filter(l => l.includes('FAIL'));
  fail('tools/pricing-worker/test-refresh-logic.mjs', `review-gate behavior test failure — run it locally for full output. Failures: ${tail.length ? tail.join(' | ') : (out.slice(-300) || 'non-zero exit, no output captured')}`);
}

// ── Check 13: Provider extractor fixtures (tools/test-provider-extractors.mjs) ──

section('Provider extractor fixtures (tools/test-provider-extractors.mjs)');

// v3.63.453 — backlog item 4. v3.63.410 fixed a live bug where Claude's
// extended-thinking responses were misread as empty because every Anthropic
// extractor hardcoded content[0].text — Anthropic started returning a
// leading thinking block server-side with zero notice, no WaxFrame-side
// change involved. Same drift class is plausible for any provider whose
// response shape isn't a flat single value (Gemini thought parts, OpenAI
// refusal/empty-choices shapes). Fixture-feeds canned JSON through the real
// extractors in js/provider-catalog.js so the next silent shape change gets
// caught here instead of live. Shell out for the same reason as Checks 10-12.
try {
  execFileSync(process.execPath, [join(ROOT, 'tools/test-provider-extractors.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/test-provider-extractors.mjs — pass');
} catch (e) {
  const out = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
  const tail = out.split('\n').filter(l => l.trim().startsWith('✗'));
  fail('tools/test-provider-extractors.mjs', `provider extractor fixture failure — run it locally for full output. Failures: ${tail.length ? tail.join(' | ') : (out.slice(-300) || 'non-zero exit, no output captured')}`);
}

// ── Check 14: Scout-bundle redaction fixtures (tools/test-debug-redaction.mjs) ──

section('Scout-bundle redaction fixtures (tools/test-debug-redaction.mjs)');

// v3.63.511 — backlog item 4. WF_DEBUG.scrubFailureRecord is the redaction
// pass on the failure record that ships inside a Scout bundle, and it was
// hoisted out of a closure into a method in v3.63.493 specifically so a test
// could reach it. No test did, and the first one written found that the
// Bearer/Basic rule had never worked at all. Redaction is exactly the code
// that must not silently rot, so it gates now.
try {
  execFileSync(process.execPath, [join(ROOT, 'tools/test-debug-redaction.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/test-debug-redaction.mjs — pass');
} catch (e) {
  const out = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
  const tail = out.split('\n').filter(l => l.trim().startsWith('✗'));
  fail('tools/test-debug-redaction.mjs', `redaction fixture failure — run it locally for full output. Failures: ${tail.length ? tail.join(' | ') : (out.slice(-300) || 'non-zero exit, no output captured')}`);
}

// ── Check 15: Server AI eligibility (tools/test-server-ai-eligibility.mjs) ──

section('Server AI eligibility (tools/test-server-ai-eligibility.mjs)');

// v3.63.511 — backlog item 10. This test covered isServerImportedAI /
// isAIReadyForUse / getConfiguredAIsForMode / continueFromBees since it was
// written but was wired into nothing, so it only ran when somebody
// remembered it existed. A test nothing runs is a test that rots.
try {
  execFileSync(process.execPath, [join(ROOT, 'tools/test-server-ai-eligibility.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/test-server-ai-eligibility.mjs — pass');
} catch (e) {
  const out = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
  fail('tools/test-server-ai-eligibility.mjs', `server AI eligibility failure — run it locally for full output. ${out.slice(-400) || 'Non-zero exit, no output captured'}`);
}

// ── Check 16: Claude relay security behavior ────────────────────────

section('Claude relay security behavior (tools/claude-proxy/test-security.mjs)');

try {
  execFileSync(process.execPath, [join(ROOT, 'tools/claude-proxy/test-security.mjs')], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/claude-proxy/test-security.mjs — pass');
} catch (e) {
  const out = ((e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')).trim();
  fail('tools/claude-proxy/test-security.mjs', `relay security test failure — run it locally for full output. ${out.slice(-400) || 'Non-zero exit, no output captured'}`);
}

// ── Check 17: vendored dependency inventory + hashes ───────────────

section('Vendored dependency inventory + hashes');

const inventoryPath = join(ROOT, 'docs/vendored-dependencies.json');
let inventory;
try {
  inventory = JSON.parse(read(inventoryPath));
} catch (e) {
  fail('docs/vendored-dependencies.json', `missing or invalid JSON: ${e.message}`);
}

if (inventory) {
  const inventoried = new Set();
  for (const dependency of inventory.dependencies || []) {
    for (const [file, expectedHash] of Object.entries(dependency.files || {})) {
      inventoried.add(file);
      const filePath = join(ROOT, file);
      try {
        const actualHash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
        if (actualHash !== expectedHash) fail(file, `SHA-256 differs from dependency inventory (expected ${expectedHash}, got ${actualHash})`);
      } catch (e) {
        fail(file, `inventoried file missing or unreadable: ${e.message}`);
      }
    }
  }

  for (const filePath of walk(join(ROOT, 'lib'), p => /\.(?:js|mjs)$/.test(p))) {
    const file = rel(filePath);
    if (!inventoried.has(file)) fail(file, 'vendored executable is not listed in docs/vendored-dependencies.json');
  }
  if (!errors.some(e => e.file === 'docs/vendored-dependencies.json' || e.msg.includes('dependency inventory') || e.msg.includes('inventoried'))) {
    ok(`${inventoried.size} vendored files match their recorded SHA-256 hashes`);
  }

  // v3.63.551 — the recorded version has to clear its own CVE floor, and
  // package.json has to agree with it.
  //
  // Three separate things were watching mammoth and all three were blind.
  // Check 7's LIB_FLOORS covered pdf.js and SheetJS only, so mammoth, jszip
  // and docx had no floor at all. The inventory recorded mammoth as 1.13.1 —
  // which is the version of the **underscore.js bundled inside it**, a
  // version mammoth has never published. And package.json declared that same
  // 1.13.1, where it cannot resolve, so Dependabot silently watched nothing
  // for the one library that parses untrusted .docx files. It was sitting on
  // 1.6.0, inside the affected range of CVE-2025-11849.
  //
  // Why the floor is compared against the INVENTORY rather than against a
  // version read out of the bundle: reading the bundle is what produced the
  // wrong answer. mammoth and docx carry no trustworthy version string of
  // their own, and the strings they do carry belong to their dependencies.
  // The inventory is safe to trust because the hash check directly above
  // pins each file to the version recorded beside it — so file-to-version is
  // proven there, and version-to-minimum is proven here. Neither half is
  // sufficient alone.
  //
  // A null floor is a deliberate "no floor", not a missing one. Only the
  // classic pdf.js build has it, and its entry says why.
  const cmpVer = (a, b) => {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  };

  let pkg = null;
  try { pkg = JSON.parse(read(join(ROOT, 'package.json'))); } catch (e) { /* reported below */ }

  const floored = [];
  for (const dependency of inventory.dependencies || []) {
    const { name, version } = dependency;
    if (!('cveFloor' in dependency)) {
      fail('docs/vendored-dependencies.json',
        `${name} has no cveFloor — every vendored library states its minimum `
        + `safe version or states null with a reason, so a downgrade cannot `
        + `pass unnoticed the way mammoth's did`);
      continue;
    }
    const floor = dependency.cveFloor;
    if (floor === null) continue;          // documented no-floor
    if (!/^\d+(\.\d+)*$/.test(String(version || ''))) {
      fail('docs/vendored-dependencies.json',
        `${name} records version ${JSON.stringify(version)}, which is not a version`);
      continue;
    }
    if (cmpVer(version, floor) < 0) {
      fail('docs/vendored-dependencies.json',
        `${name} ${version} is below its CVE floor ${floor} — a published `
        + `advisory affects it`);
      continue;
    }
    floored.push(`${name} ${version} >= ${floor}`);
  }

  // package.json exists only so Dependabot watches these. A version there
  // that disagrees with what is vendored means Dependabot is watching
  // something this repository does not ship.
  if (pkg && pkg.dependencies) {
    const byNpmName = { mammoth: 'mammoth', jszip: 'jszip', docx: 'docx',
                        'pdfjs-dist': 'pdfjs-dist-esm' };
    for (const [npmName, inventoryName] of Object.entries(byNpmName)) {
      const declared = pkg.dependencies[npmName];
      if (!declared) continue;
      const entry = (inventory.dependencies || []).find(d => d.name === inventoryName);
      if (!entry) continue;
      if (String(declared) !== String(entry.version)) {
        fail('package.json',
          `declares ${npmName} ${declared} but ${entry.version} is vendored — `
          + `this manifest exists so Dependabot watches what ships, and a `
          + `version that disagrees (or does not exist upstream) means it is `
          + `watching the wrong thing or nothing at all`);
      }
    }
  }

  if (floored.length) ok(`${floored.length} vendored libraries clear their CVE floors`);
}

// ── Check 18: companion updater scripts presence + repo reference ────

section('Companion updater scripts presence + repo reference');

// Companion updaters for the portable install (see js/update-check.js for
// the in-app half that points users at them) — Update-WaxFrame.ps1
// (Windows) and Update-WaxFrame.command (Mac/Linux, added v3.63.458). No
// execution-based check is possible here — CI runs on ubuntu-latest,
// which can't run .ps1, and .command needs a real double-click/terminal
// context — so this is presence/shape only, mirroring Check 2's
// in-process regex style rather than Checks 10-16's execFileSync pattern.

const UPDATER_SCRIPTS = ['Update-WaxFrame.ps1', 'Update-WaxFrame.command'];

for (const scriptName of UPDATER_SCRIPTS) {
  const updaterPath = join(ROOT, scriptName);
  let updaterContent = null;
  try {
    updaterContent = read(updaterPath);
  } catch (e) {
    fail(scriptName, 'file missing at repo root');
    continue;
  }

  if (!updaterContent.includes('WeirDave/WaxFrame-Professional')) {
    fail(scriptName, 'does not reference the repo slug WeirDave/WaxFrame-Professional — check for a copy-paste typo (e.g. a sibling project\'s repo slug)');
  } else {
    ok(`${scriptName}: references correct repo slug`);
  }

  // Must never hardcode a version literal — both scripts read
  // js/version.js live at runtime instead (see each script's header
  // comment), which is what keeps them exempt from the release-ceremony
  // version-stamp sweep (CLAUDE.md §5 item 2). A hardcoded X.Y.Z
  // assignment here would silently break that property the next time
  // someone edits the script.
  const nonCommentLines = updaterContent.split('\n').filter(l => !l.trim().startsWith('#'));
  const versionLiteralRe = /=\s*['"]v?\d+\.\d+\.\d+/;
  const literalHit = nonCommentLines.find(l => versionLiteralRe.test(l));
  if (literalHit) {
    fail(scriptName, `appears to hardcode a version literal ("${literalHit.trim()}") — it must read js/version.js live at runtime instead, or it will silently need a release-ceremony sweep step`);
  } else {
    ok(`${scriptName}: no hardcoded version literal (reads js/version.js live)`);
  }

  // The updater must verify the detached checksum published beside the
  // predictable release ZIP before extracting any downloaded bytes.
  if (/\.digest\b/.test(updaterContent)) {
    fail(scriptName, 'references the GitHub API `.digest` field instead of the published .sha256 sidecar');
  } else {
    ok(`${scriptName}: no phantom digest-verification reference`);
  }

  if (!/WaxFrame-Professional-[^\r\n"']+\.zip/.test(updaterContent) || !updaterContent.includes('.sha256')) {
    fail(scriptName, 'does not use the predictable release ZIP and .sha256 sidecar names');
  } else if (!/SHA256|sha256sum|shasum/i.test(updaterContent)) {
    fail(scriptName, 'downloads a checksum but does not appear to verify SHA-256');
  } else {
    ok(`${scriptName}: verifies the release ZIP against its SHA-256 sidecar`);
  }
}

// ── Check 19: Confidentiality gate (tools/check-confidentiality.mjs) ──

section('Confidentiality — no real workplace data in tracked files');

// Added 2026-09-15 after David escalated to an emergency: this public repo had
// been carrying his employer's name, an internal AI gateway's name and
// branding, and a real work filename — in source, docs, and 43 published
// release notes. Manual vigilance had already failed once, so the gate is
// mechanical now. See docs/DATA_HANDLING_RULES.md.
//
// The checker holds NO real identifier: structural rules match the SHAPE of
// sensitive data, and the literal terms live in a gitignored
// .confidential-terms that never ships. Shell out like Checks 10-16.
try {
  const out = execFileSync(process.execPath, [join(ROOT, 'tools/check-confidentiality.mjs')],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  ok(out.trim().replace(/^\s*✓\s*/, ''));
} catch (e) {
  const out = `${e.stdout || ''}${e.stderr || ''}`;
  const lines = out.split(/\r?\n/).filter(l => l.includes('•')).slice(0, 12);
  fail('tools/check-confidentiality.mjs',
    `real-data check failed — ${lines.length ? lines.map(l => l.trim()).join(' | ') : out.slice(-300)}`);
}

// -- Check 20: every download script refuses an unverified download --

section('Download scripts - absent and wrong checksums are the same answer');

// Added 2026-09-22. The two UPDATE scripts verified correctly; the two INSTALL
// scripts did not, and the gate could not see it because Check 18 iterates
// UPDATER_SCRIPTS only. Both installers carried
//
//     if (checksum published) { verify } else { warn; install anyway }
//
// which hands the whole check to anyone able to serve a malicious ZIP: they
// simply do not publish a hash beside it. The macOS one was worse - the fetch
// WAS the `if` condition, so a dropped connection took the same branch as a
// genuinely absent checksum and a flaky network skipped verification too.
//
// The property is asserted over all four scripts, because the bug was not that
// one file was wrong but that half the family was never looked at.

const DOWNLOAD_SCRIPTS = [
  'Update-WaxFrame.ps1', 'Update-WaxFrame.command',
  'Install-WaxFrame.ps1', 'Install-WaxFrame.command',
];

// The wording checks below are kept and are not sufficient on their own.
// Proved on 2026-09-22 by reintroducing the exact macOS bug with no
// give-away phrasing - `if curl ... .sha256; then verify; fi` wrapping the
// whole verification, so a failed fetch falls straight through to the
// install. The gate printed "an unverifiable download is refused" and
// exited 0. A check that cannot fail is worse than no check, because it is
// believed - so the shape is asserted structurally as well.
//
// The structural rule per language:
//
//   sh   - the checksum fetch must make failure exit. `if ! curl ...` or
//          `curl ... || { exit }`. A bare `if curl ...; then` is the bug:
//          the failure path is the empty else, which continues.
//   ps1  - the absent-checksum branch must `throw`. Anything softer is a
//          warning, and a warning installs.

function checksumFetchIsFatal(scriptName, content) {
  const lines = content.split('\n');

  if (scriptName.endsWith('.command')) {
    const idx = lines.findIndex(l =>
      /\.sha256/.test(l) && /\bcurl\b/.test(l) && !/^\s*#/.test(l));
    if (idx < 0) return 'has no curl fetch of the .sha256 sidecar';
    const line = lines[idx];
    if (/^\s*if\s+curl\b/.test(line)) {
      return 'fetches the checksum as a positive `if` condition, so a failed '
        + 'fetch falls through to the install - the exact shape that let a '
        + 'dropped connection skip verification';
    }
    const fatal = /^\s*if\s+!\s*curl\b/.test(line)
      || /\|\|/.test(line)
      || /\|\|/.test(lines[idx + 1] || '');
    if (!fatal) {
      return 'fetches the checksum without making a failed fetch exit';
    }
    return null;
  }

  // PowerShell. The two scripts reach the same guarantee by different routes
  // and both are correct, so this accepts either rather than pinning one
  // shape - a rule that fired on the updater's route was the first draft of
  // this check, and a guard that fails the correct case is how guards get
  // deleted.
  //
  //   installer - looks the asset up in the release listing, so an absent
  //               checksum is a null it must `throw` on.
  //   updater   - fetches the sidecar by direct URL. With
  //               $ErrorActionPreference = 'Stop' a 404 throws by itself,
  //               so there is no branch to test and nothing to get wrong -
  //               unless the call is softened with -ErrorAction.
  const explicitTest = lines.findIndex(l => /-not\s+\$sum\b/.test(l));
  if (explicitTest >= 0) {
    const branch = lines.slice(explicitTest, explicitTest + 4).join('\n');
    if (!/\bthrow\b/.test(branch)) {
      return 'tests for an absent checksum but does not throw - a warning '
        + 'here installs the download anyway';
    }
    return null;
  }

  if (!/\$ErrorActionPreference\s*=\s*'Stop'/.test(content)) {
    return 'neither tests for an absent checksum nor sets '
      + "$ErrorActionPreference = 'Stop', so a missing sidecar does not stop "
      + 'the install';
  }
  const fetchLine = lines.find(l =>
    /Invoke-WebRequest/.test(l) && /checksum/i.test(l) && !/^\s*#/.test(l));
  if (!fetchLine) {
    return 'has no checksum fetch this check can find - if the shape changed, '
      + 'this rule has to change with it rather than be deleted';
  }
  if (/-ErrorAction\s+(SilentlyContinue|Ignore)|-EA\s+(SilentlyContinue|Ignore|0)/i.test(fetchLine)) {
    return 'softens the checksum fetch with -ErrorAction, so a missing '
      + 'sidecar is swallowed and the install continues unverified';
  }
  return null;
}

for (const scriptName of DOWNLOAD_SCRIPTS) {
  let content = null;
  try {
    content = read(join(ROOT, scriptName));
  } catch (e) {
    fail(scriptName, 'file missing at repo root');
    continue;
  }

  const skips = /skipping verification|skip(ping)? the checksum|no checksum published/i.exec(content);
  const structural = checksumFetchIsFatal(scriptName, content);

  if (skips) {
    fail(scriptName,
      'contains a skip-verification branch ("' + skips[0] + '") - an absent checksum must refuse the download, not warn and continue');
  } else if (!/\.sha256/.test(content)) {
    fail(scriptName, 'never references the .sha256 sidecar, so nothing is verified');
  } else if (!/(Get-FileHash|sha256sum|shasum)/i.test(content)) {
    fail(scriptName, 'references a checksum but never computes one to compare against');
  } else if (structural) {
    fail(scriptName, structural, findLine(content, '.sha256'));
  } else {
    ok(scriptName + ': an unverifiable download is refused');
  }
}

// Checks 21-23 deliberately do NOT live here. The three security checks from
// the 2026-09-21 review each drive a real browser, and this gate is browser-free
// by design -- CI runs it on a runner with no browser setup and no npm install.
// Each check file says the same thing in its own header. They run as steps in
// the `smoke` job of .github/workflows/release-check.yml, which already locates
// Chrome, and they are hand-runnable the same way locally.

// ── Report ──────────────────────────────────────────────────

console.log('');
if (errors.length === 0) {
  console.log('✅ All release-ceremony checks passed.');
  process.exit(0);
}

console.log(`❌ ${errors.length} problem${errors.length === 1 ? '' : 's'} found:`);
for (const e of errors) {
  const loc = e.line ? `${e.file}:${e.line}` : e.file;
  console.log(`  • ${loc} — ${e.msg}`);
}
process.exit(1);
