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
//     codebase uses (e.g. `?v=3.X.Y` cache-bust idiom, `var(--token)`
//     CSS calls). A more general validator would over-fit.
// ============================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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

// ── Check 1: JS syntax ──────────────────────────────────────

section('JS syntax (node --check)');
const jsFiles = walk(join(ROOT, 'js'), p => p.endsWith('.js'));
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    ok(rel(file));
  } catch (e) {
    const stderr = (e.stderr ? e.stderr.toString() : '') || (e.message || '');
    fail(rel(file), `node --check failed: ${stderr.trim().split('\n')[0]}`);
  }
}

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

// Every JS file's Build: comment should match
for (const file of jsFiles) {
  if (!buildStamp) break;
  const content = read(file);
  const m = content.match(/\/\/\s*Build:\s*(\d{8}-\d{3})/);
  if (m && m[1] !== buildStamp) {
    const lineNum = findLine(content, m[0]);
    fail(rel(file), `stale // Build: ${m[1]} (expected ${buildStamp})`, lineNum);
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
  // v3.63.353 — strict-CSP cutover. script-src must contain the sha256
  // hash that pins the v3.63.345 pre-paint head guard AND must NOT
  // contain 'unsafe-inline'. The "must contain" half is encoded as a
  // substring match in the loop below; the "must NOT contain
  // 'unsafe-inline' on script-src" half is a separate dedicated check
  // immediately after.
  "'sha256-v6gFi56+2bv74Kb6ZsiwAOsnOhaMjjXtAhflRjSVRcw='",
  // v3.63.356 — strict style-src cutover. style-src must carry both
  // <style>-block hashes (head guard + help.html break-glass), the
  // 'unsafe-hashes' keyword, and the 11 style="..." attribute hashes
  // covering every inline-style attr the codebase emits. Without all
  // of these, the page either fails to render correctly (missing block
  // hash) or fails a CSP violation listener at runtime (missing attr
  // hash). The "must NOT contain 'unsafe-inline' on style-src" half is
  // a separate dedicated check below.
  "'sha256-bQY2E+lKIxmgh8LMogBp9rdv0Dv7ap3tp2TdMtYuYYo='",  // <style> head guard
  "'sha256-2s7ScrUyOdjkV3zbZCPukmcPp6fD094kYGhSk6nHpt8='",  // <style> help.html break-glass
  "'unsafe-hashes'",                                        // required to let style="" hashes apply
  "'sha256-U39LwpFPBpT3Lt7xuEnj4BJI8V09wjPcxMKm3L/O4UI='",  // style="background: rgba(247,195,64...)"
  "'sha256-aqNNdDLnnrDOnTNdkJpYlAxKVJtLt9CtFLklmInuUAE='",  // style="display:none"
  "'sha256-0EZqoz+oBhx7gF4nvY2bSqoGyy4zLjNF+SDQXGp/ZrY='",  // style="display:none;"
  "'sha256-ukRLfhNT2UwV6SrWA/TIvp9f6n9i7rlY8yTJ7/Q4Aj4='",  // style="display:none;margin-top:8px;"
  "'sha256-JzjJaC8w0SNFOqj128IsNlFo2pjyKirpYABgcVjzRlo='",  // style="flex-direction:column;..."
  "'sha256-xJgw9VSwNWk+JhDx6dCtEnb5rREf+xfiKboIRRQ2wyk='",  // style="font-style: italic; color: ..."
  "'sha256-1vbUwk7z0f5vVRhaiAOVIE7zWtBPpnUQrHt+FHxrfo0='",  // style="font-weight: 400; opacity: 0.7;"
  "'sha256-ayqU6ju5l8n91VHdnqda+AJokO4F7JlcyuLJ97i8ADs='",  // style="font-weight:600;"
  "'sha256-51C2sujOczlVGMvLFIZvjBzQ4whhqY1WZWebTLn72hI='",  // style="margin-top: var(--space-16);"
  "'sha256-mHwBL94Tr/tKp56eEVRJEyifdcssVP0Gtta7uViWopE='",  // style="width:1.4em;height:1.4em;..."
  "'sha256-nMxMqdZhkHxz5vAuW/PAoLvECzzsmeAxD/BNwG15HuA='"   // style="width:100%;"
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
  // v3.63.353 strict-CSP cutover — script-src must NOT contain
  // 'unsafe-inline'. 'unsafe-eval' is still accepted on script-src
  // (vendored SheetJS/mammoth/pdf.js use new Function() internally —
  // dropping it would break document import; documented as residual
  // risk under Check 7's CVE-tracked floor checks).
  const scriptSrc = (policy.match(/script-src\s+([^;]+)/) || [])[1] || '';
  if (/'unsafe-inline'/.test(scriptSrc)) {
    fail(rel(file), `CSP script-src must NOT contain 'unsafe-inline' (strict-CSP cutover landed in v3.63.353). Got: script-src ${scriptSrc.trim()}`);
    continue;
  }
  // v3.63.356 strict style-src cutover — style-src must NOT contain
  // 'unsafe-inline' either. Inline <style> blocks and style="..."
  // attributes are pinned via the sha256 entries listed above instead;
  // a new value introduced anywhere needs its hash added to that list
  // or the browser will block the style.
  const styleSrc = (policy.match(/style-src\s+([^;]+)/) || [])[1] || '';
  if (/'unsafe-inline'/.test(styleSrc)) {
    fail(rel(file), `CSP style-src must NOT contain 'unsafe-inline' (strict style-src cutover landed in v3.63.356). Got: style-src ${styleSrc.trim()}`);
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
  'privacy.html':                 0, // migrated in v3.63.348
  'prompt-editor.html':           0, // migrated in v3.63.350
  'start-here.html':              0, // migrated in v3.63.347
  'templates.html':               0, // migrated in v3.63.348
  'terms.html':                   0, // migrated in v3.63.348
  'waxframe-user-manual.html':    0, // migrated in v3.63.348
  'what-are-tokens.html':         0  // migrated in v3.63.348
};

const INLINE_HANDLER_RE = /\son(click|input|change|keydown|keyup|keypress|submit|focus|blur|mousedown|mouseup|mouseover|mouseout|wheel|load|error)\s*=/gi;

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
const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');

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
