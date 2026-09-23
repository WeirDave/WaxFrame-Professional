#!/usr/bin/env node
// Build: 20260923-003
// audit-html-sinks.mjs — every place WaxFrame writes HTML into the DOM, and
// whether the values it interpolates are escaped.
//
// WaxFrame builds its UI by assigning template literals to .innerHTML. That is
// a deliberate architecture — vanilla JS, no framework, no build step — and it
// is fine as long as every interpolated value is escaped or provably not
// attacker-controlled. "Provably" is the problem: there are well over a
// hundred of these, and nobody had ever looked at them as a set.
//
// The threat model is not hypothetical. WaxFrame pastes text from three
// sources it does not control into its own UI:
//   • documents the user imports (.docx, .pdf, .xlsx, .txt)
//   • responses from AI providers, which are remote servers
//   • saved sessions restored from a checkpoint file
// Any of those can contain <img src=x onerror=...>. An AI provider returning
// markup is not even adversarial — it is a model quoting HTML back.
//
// What this does: find every HTML sink, extract the expression assigned to it,
// pull out each ${...} interpolation, and decide whether that interpolation is
// escaped. It reports the ones that are not.
//
// What it cannot do: know whether an unescaped value is safe. A sink that
// interpolates a hardcoded colour token is fine. One that interpolates a model
// name from a remote server is not. That judgement is why this prints findings
// and exits 0 rather than failing a build, and why it is not a gate stage.
//
// Usage:  node tools/audit-html-sinks.mjs [--all]
//         --all also lists the sites judged safe, for spot-checking the
//         classifier itself rather than trusting it.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SHOW_ALL = process.argv.includes('--all');

const jsFiles = execFileSync('git', ['ls-files', 'js/*.js', 'js/*.mjs'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

// Calls that are known to return escaped or structurally-safe output. A value
// wrapped in one of these is treated as handled.
//
// Keep this list SHORT and justified. Every name added here is a promise that
// the function cannot emit active markup, and a wrong entry here silently
// clears a real finding — the opposite of what this tool is for.
const ESCAPERS = [
  'escapeHtml',     // the project's HTML-entity escaper
  'esc',            // its short alias
  'encodeURIComponent',
  'safeUrl',        // wf-debug: rejects anything but http(s)
  'safeRefId',      // wf-debug: id-shaped output only
  'String(Number',  // numeric coercion
  'Number(',
  'parseInt(',
  'parseFloat(',
  'toFixed(',
  'JSON.stringify'  // cannot introduce a bare < that closes a tag context
];

// Interpolations that are structurally incapable of carrying markup: numeric
// literals, arithmetic, boolean ternaries choosing between literal strings,
// and calls to the escapers above.
function looksSafe(expr) {
  const e = expr.trim();
  if (!e) return true;
  if (/^[\d\s+\-*/%.()]+$/.test(e)) return true;                 // pure arithmetic
  if (/^['"`][^'"`]*['"`]$/.test(e)) return true;                // string literal
  if (ESCAPERS.some(fn => e.includes(fn))) return true;          // routed through an escaper
  // A ternary whose branches are both string literals or class names.
  if (/^\s*[^?]+\?\s*['"][^'"]*['"]\s*:\s*['"][^'"]*['"]\s*$/.test(e)) return true;
  // Common safe idioms in this codebase: index counters, lengths, booleans.
  if (/^(i|j|k|idx|n|num|count|len|total|pct|pageNum|round|_?i\+\+?)$/.test(e)) return true;
  if (/\.length\s*$/.test(e)) return true;
  if (/^\s*!+/.test(e)) return true;
  return false;
}

// Pull the expression assigned to a sink, from `= ` to the end of the
// statement. Template literals can span many lines and contain nested braces,
// so this scans forward tracking backtick depth rather than regexing a line.
// The scan is BOUNDED. An earlier version tracked backtick depth across the
// whole file and, whenever that desynced, ran on for hundreds of lines and
// reported consoleLog() and toast() strings as if they were sinks. A sink
// expression in this codebase is never longer than a few hundred lines, so a
// cap turns a silent, confident wrong answer into a truncated one.
const MAX_SPAN = 20000;
function readAssigned(text, fromIndex) {
  const limit = Math.min(text.length, fromIndex + MAX_SPAN);
  let i = fromIndex;
  while (i < text.length && /\s/.test(text[i])) i++;
  const out = [];
  let depthTpl = 0, depthParen = 0, q = null;
  for (; i < limit; i++) {
    const c = text[i];
    out.push(c);
    if (q) {
      if (c === '\\') { out.push(text[++i]); continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '`') { depthTpl += depthTpl ? -1 : 1; continue; }
    if (depthTpl) continue;                      // inside a template literal
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === '(') depthParen++;
    else if (c === ')') { if (depthParen === 0) break; depthParen--; }
    else if (c === ';' && depthParen === 0) break;
    else if (c === '\n' && depthParen === 0 && !depthTpl) {
      // An assignment ending at a newline without a semicolon.
      const rest = text.slice(i + 1, i + 40);
      if (!/^\s*[+.?:]/.test(rest)) break;
    }
  }
  return out.join('');
}

// Every ${...} inside a template literal, brace-matched so nested objects and
// nested templates do not truncate the expression.
function interpolations(src) {
  const found = [];
  for (let i = 0; i < src.length - 1; i++) {
    if (src[i] !== '$' || src[i + 1] !== '{') continue;
    let depth = 1, j = i + 2, q = null, tpl = 0;
    for (; j < src.length && depth; j++) {
      const c = src[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"') { q = c; continue; }
      if (c === '`') { tpl = tpl ? 0 : 1; continue; }
      if (tpl) continue;
      if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    found.push(src.slice(i + 2, j - 1));
    i = j - 1;
  }
  return found;
}

const SINKS = [
  ['.innerHTML =',        /\.innerHTML\s*=(?!=)/g],
  ['.outerHTML =',        /\.outerHTML\s*=(?!=)/g],
  ['insertAdjacentHTML',  /\.insertAdjacentHTML\s*\(/g],
  ['document.write',      /document\s*\.\s*write(?:ln)?\s*\(/g]
];

let sites = 0, flagged = 0, safeSites = 0;
const findings = [];

for (const file of jsFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [label, re] of SINKS) {
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(text))) {
      sites++;
      const line = text.slice(0, m.index).split('\n').length;
      const expr = readAssigned(text, m.index + m[0].length);
      const parts = interpolations(expr);
      const unsafe = parts.filter(p => !looksSafe(p));
      if (!parts.length) { safeSites++; if (SHOW_ALL) console.log(`  static   ${file}:${line}  ${label}`); continue; }
      if (!unsafe.length) { safeSites++; if (SHOW_ALL) console.log(`  escaped  ${file}:${line}  ${label}  (${parts.length} interpolation(s))`); continue; }
      flagged++;
      findings.push({ file, line, label, total: parts.length, unsafe });
    }
  }
}

console.log(`HTML sinks in js/: ${sites}  (${safeSites} static or fully escaped)`);
console.log(`\n▶ SINKS WITH UNESCAPED INTERPOLATIONS  —  ${flagged} site(s)\n`);
console.log('  Each line is a value reaching innerHTML without passing through an');
console.log('  escaper. That is not automatically a vulnerability: a hardcoded token');
console.log('  or an internal enum is fine. It IS the set a person has to look at.\n');

for (const f of findings.sort((a, b) => b.unsafe.length - a.unsafe.length)) {
  console.log(`  ${f.file}:${f.line}  [${f.label}]  ${f.unsafe.length} of ${f.total} unescaped`);
  for (const u of f.unsafe.slice(0, 4)) {
    console.log(`      \${${u.replace(/\s+/g, ' ').slice(0, 96)}}`);
  }
  if (f.unsafe.length > 4) console.log(`      … and ${f.unsafe.length - 4} more`);
}

console.log(`\nSUMMARY: ${sites} sink(s), ${flagged} needing a human read.`);
console.log('Nothing here fails a build. The classifier cannot know whether an');
console.log('unescaped value is attacker-reachable — that is the judgement call.');
