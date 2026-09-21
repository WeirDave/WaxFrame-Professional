#!/usr/bin/env node
// Build: 20260920-027
// audit-dead-code.mjs — dead-code and dynamic-execution audit for js/ and the
// HTML pages. Run it; it prints findings and exits non-zero only on a hard
// failure, never on a finding, because several of its passes are judgement
// calls rather than rules.
//
// Why this is a committed tool and not a one-off script: the last full audit
// of this kind ran on 2026-07-25 and the next one ran on 2026-09-20, fifty-odd
// releases later. It found five genuinely dead things. An audit nobody can
// re-run in one command is an audit that gets run twice a year.
//
// It is deliberately NOT a release-check stage. Two of its passes need a human
// to read the result — "exported but never called" is correct for a function
// that exists for the dev console, and the dangling-DOM pass cannot fully
// model ids built from template literals. A gate that blocks a release on
// either would get routed around, and a gate people route around is worse
// than no gate.
//
// Usage:  node tools/audit-dead-code.mjs
//
// ── Passes ────────────────────────────────────────────────────────────
//   1. Orphan functions       declared in js/, referenced nowhere
//   2. Export-only functions  window.X = X and no other use
//   3. Dynamic execution      eval, new Function, string timers,
//                             document.write, javascript: URLs
//   4. Dangling DOM lookups   getElementById('x') where no x is ever created
//   5. Write-only storage     localStorage keys written but never read
//
// Pass 4 is the one that earns its keep. Reference counting cannot see a
// function that is called often and does nothing: in v3.63.524 two Builder
// renderers, a pair of round-timer writes and a diff-mode button lookup were
// all dead while every one of them HAD live callers. They were dead because
// the elements they wrote to had been deleted from index.html releases
// earlier, and each function opened by looking one up and returning.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// ── Source loading ─────────────────────────────────────────────────────
const tracked = (patterns) =>
  execFileSync('git', ['ls-files', ...patterns], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);

const jsFiles   = tracked(['js/*.js', 'js/*.mjs']);
const htmlFiles = tracked(['*.html']);
const toolFiles = tracked(['tools/*.mjs']);
const allFiles  = [...jsFiles, ...htmlFiles, ...toolFiles];
const src       = new Map(allFiles.map(f => [f, fs.readFileSync(f, 'utf8')]));

// Comments are the single biggest source of false positives here. This file's
// own history is the proof: the first run of pass 4 reported #lengthMode and
// #modelsel-${aiId} as dangling, and both were prose inside a comment
// explaining an old bug. Strings are left intact — an id in a string literal
// is a real lookup — and every replacement keeps the newline count so the
// line numbers this tool prints still point at the right place.
function stripComments(text) {
  // State is scoped to a single line on purpose. A whole-file tokeniser has to
  // get regex literals right, and getting them wrong desyncs everything after
  // the mistake: the first version of this function read the quotes inside a
  // /['"]/ literal as an opening string and then treated the rest of the file
  // as string content. Resetting per line means a bad guess costs one line.
  // Block comments are the one thing that must carry across lines, and they
  // are unambiguous.
  const out = [];
  let inBlock = false;
  for (const line of text.split("\n")) {
    if (inBlock) {
      const close = line.indexOf('*/');
      if (close < 0) { out.push(''); continue; }
      inBlock = false;
      out.push(' '.repeat(close + 2) + line.slice(close + 2));
      continue;
    }
    let q = null, cut = -1;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === "\\") { i++; continue; }
        if (c === q) q = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === '/' && line[i + 1] === '/') { cut = i; break; }
      if (c === '/' && line[i + 1] === '*') {
        cut = i;
        inBlock = line.indexOf('*/', i + 2) < 0;
        break;
      }
    }
    out.push(cut < 0 ? line : line.slice(0, cut));
  }
  return out.join("\n");
}

// HTML comments, same idea, same line-count preservation.
const stripHtmlComments = (t) =>
  t.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ''));

const code = new Map();
for (const f of allFiles) {
  code.set(f, f.endsWith('.html') ? stripHtmlComments(src.get(f))
                                  : stripComments(src.get(f)));
}
const codeText = allFiles.map(f => code.get(f)).join('\n');

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

let findings = 0;
const head = (t) => console.log(`\n▶ ${t}`);
const none = () => console.log('  none');

// ── Pass 1 + 2: orphan and export-only functions ───────────────────────
// A reference is any occurrence of the bare name that is not the declaration
// itself. Counting over the whole tree at once is what makes this work under
// strict CSP: handlers live in data-fn="" attributes and inside JS template
// literals, and any scheme that tried to model call sites would call the lot
// of them dead.
const declared = new Map();
for (const f of jsFiles) {
  const re = /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(code.get(f)))) declared.set(m[1], f);
}
console.log(`declared top-level functions in js/: ${declared.size}`);

const orphans = [], exportOnly = [];
for (const [name, file] of declared) {
  const re = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g');
  const total = (codeText.match(re) || []).length;
  if (total <= 1) orphans.push({ name, file, total });
  else if (total === 2 && new RegExp('window\\.' + name + '\\s*=').test(codeText))
    exportOnly.push({ name, file });
}

head('ORPHAN FUNCTIONS — declared, referenced nowhere');
orphans.length ? orphans.forEach(o => console.log(`  ${o.file.padEnd(28)} ${o.name}`)) : none();
findings += orphans.length;

head('EXPORTED BUT NEVER CALLED — window.X = X and nothing else');
console.log('  (not automatically a finding: a dev-console helper looks exactly like this)');
exportOnly.length ? exportOnly.forEach(o => console.log(`  ${o.file.padEnd(28)} ${o.name}`)) : none();

// ── Pass 3: dynamic execution ──────────────────────────────────────────
// 'unsafe-eval' is in script-src because the vendored SheetJS, mammoth and
// pdf.js need it. That is the reason none of WaxFrame's own code may use it:
// the CSP cannot tell the difference, so the only thing keeping the app's own
// surface closed is that nothing here opens it.
head('DYNAMIC CODE EXECUTION in shipped code');
const PATTERNS = [
  ['direct eval',         /(?<![.\w])eval\s*\(/g],
  ['new Function',        /new\s+Function\s*\(/g],
  ['setTimeout(string)',  /setTimeout\s*\(\s*['"`]/g],
  ['setInterval(string)', /setInterval\s*\(\s*['"`]/g],
  ['document.write',      /document\s*\.\s*write\s*\(/g],
  ['javascript: URL',     /["'`]javascript:/g]
];
const shipped = [...jsFiles, ...htmlFiles];   // tools/ is build-time, not shipped
for (const [label, re] of PATTERNS) {
  const hits = [];
  for (const f of shipped) {
    const t = code.get(f);
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(t))) hits.push(`${f}:${lineOf(t, m.index)}`);
  }
  findings += hits.length;
  console.log(`  ${label.padEnd(22)} ${hits.length ? hits.join(', ') : 'none'}`);
}
console.log('  note: tools/ is excluded — release-check.mjs and');
console.log('        verify-prompts-equivalence.mjs use new Function at build time,');
console.log('        which never reaches a browser.');

// ── Pass 4: dangling DOM lookups ───────────────────────────────────────
head('DANGLING DOM LOOKUPS — an id is searched for that nothing ever creates');
const htmlIds = new Set();
for (const f of htmlFiles)
  for (const m of code.get(f).matchAll(/\bid="([^"]+)"/g)) htmlIds.add(m[1]);

const jsIds = new Set();
const dynamicPrefixes = new Set();
for (const f of jsFiles) {
  const t = code.get(f);
  for (const m of t.matchAll(/\bid="?\$?\{?([A-Za-z][\w-]*)/g)) jsIds.add(m[1]);
  for (const m of t.matchAll(/\.id\s*=\s*['"`]([^'"`$]+)['"`]/g)) jsIds.add(m[1]);
  for (const m of t.matchAll(/setAttribute\(\s*['"]id['"]\s*,\s*['"`]([^'"`$]+)['"`]/g)) jsIds.add(m[1]);
  // Ids assembled from a template literal — record the static prefix so
  // `beecard-${ai.id}` does not read as dangling.
  for (const m of t.matchAll(/id="([A-Za-z][\w-]*)-?\$\{/g)) dynamicPrefixes.add(m[1]);
  for (const m of t.matchAll(/getElementById\(\s*`([A-Za-z][\w-]*)-?\$\{/g)) dynamicPrefixes.add(m[1]);
}
console.log(`  ids in HTML: ${htmlIds.size} · created in JS: ${jsIds.size} · dynamic prefixes: ${dynamicPrefixes.size}`);

const looked = new Map();
for (const f of jsFiles) {
  const t = code.get(f);
  const push = (id, idx) => {
    if (!looked.has(id)) looked.set(id, []);
    looked.get(id).push(`${f}:${lineOf(t, idx)}`);
  };
  for (const m of t.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) push(m[1], m.index);
  for (const m of t.matchAll(/querySelector(?:All)?\(\s*['"]#([A-Za-z][\w-]*)['"]\s*\)/g)) push(m[1], m.index);
}

const dangling = [];
for (const [id, where] of looked) {
  if (htmlIds.has(id) || jsIds.has(id)) continue;
  if ([...dynamicPrefixes].some(p => id === p || id.startsWith(p + '-'))) continue;
  dangling.push({ id, where });
}
dangling.length
  ? dangling.sort((a, b) => b.where.length - a.where.length)
      .forEach(d => console.log(`  #${d.id.padEnd(30)} ${d.where.length} site(s): ${d.where.slice(0, 4).join(', ')}`))
  : none();
findings += dangling.length;

// ── Pass 5: write-only storage keys ────────────────────────────────────
head('localStorage KEYS WRITTEN BUT NEVER READ');
console.log('  (waxframe_v2_hive_recovery is expected here — it is a write-only');
console.log('   break-glass stash, read by hand from the console, never by the app)');
const writes = new Set(), reads = new Set();
for (const f of jsFiles) {
  const t = code.get(f);
  for (const m of t.matchAll(/localStorage\.setItem\(\s*['"]([^'"]+)['"]/g)) writes.add(m[1]);
  for (const m of t.matchAll(/localStorage\.getItem\(\s*['"]([^'"]+)['"]/g)) reads.add(m[1]);
}
const writeOnly = [...writes].filter(k => !reads.has(k) && k !== 'waxframe_v2_hive_recovery');
writeOnly.length ? writeOnly.forEach(k => console.log(`  ${k}`)) : none();
findings += writeOnly.length;

console.log(`\n${findings === 0 ? '✅' : '⚠'}  ${findings} finding(s) needing a look.`);
console.log('   Nothing here fails a build. Read each one and decide.');
