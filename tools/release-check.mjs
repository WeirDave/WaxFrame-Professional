#!/usr/bin/env node
// ============================================================
// WaxFrame — release-check.mjs (v3.63.134)
//
// Pre-flight checks that run as a GitHub Action on every push to main,
// and can also be run locally (`node tools/release-check.mjs`). Catches
// the kinds of typos and drift that bit us in v3.63.131:
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
    if (entry === 'node_modules' || entry === '.git' || entry === '.claude') continue;
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
