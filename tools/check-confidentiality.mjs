#!/usr/bin/env node
// ── Confidentiality gate ────────────────────────────────────────────────
// Build: 20260920-005
//
// WHY THIS EXISTS
// This repository is public, and on 2026-09-15 David escalated to an
// emergency that no product of his may ever carry real data from his
// workplace. A scrub that day found his employer's name, the name and
// branding of an internal AI gateway, and a real work filename shipped in
// source, docs and 43 published release notes. Manual vigilance had already
// failed once. This gate is the mechanical backstop.
//
// THE DESIGN CONSTRAINT THAT SHAPES THIS FILE
// A check that hardcodes the forbidden words would publish them — the exact
// harm it exists to prevent. So this file contains NO real identifier. It
// works two ways instead:
//
//   1. STRUCTURAL rules (below) that match the SHAPE of sensitive data —
//      credential formats, private IPs, internal-only hostnames, Slack
//      channels, street addresses. These need no secret to work.
//
//   2. An optional LOCAL term list at .confidential-terms — one literal
//      term per line, gitignored, never committed. Present on David's
//      machine; absent in CI, where the structural rules still run. See
//      .confidential-terms.example for the format.
//
// If the term list is ever committed, that is itself a leak, so this gate
// hard-fails on it.
//
// Run standalone:  node tools/check-confidentiality.mjs
// Runs in the release gate as a numbered stage.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TERMS_FILE = '.confidential-terms';

const problems = [];
const note = (file, line, msg) => problems.push({ file, line, msg });

// ── Paths we do not scan ────────────────────────────────────────────────
// Vendored libraries are third-party artifacts; their minified bodies throw
// constant false positives (a webpack chunk that happens to contain "AKIA",
// a geolocation database full of town names). We do not edit them, and a
// secret of David's cannot originate inside one.
const SKIP_PATH = /^(lib\/|images\/|fonts\/|sounds\/|.*\.(png|jpg|jpeg|gif|ico|webp|svg|woff2?|ttf|otf|mp3|flac|wav|pdf|zip|docx|xlsx)$)/i;

// Known-safe literals that would otherwise trip a structural rule. Each one
// is public documentation, not internal infrastructure.
const ALLOW = [
  'host.docker.internal',   // Docker's documented host alias
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'example.com', 'example.org', 'example.net', 'company.com',
  'user@example.com', 'email@company.com',
];
const allowed = (s) => ALLOW.some(a => s.toLowerCase().includes(a));

// ── Structural rules ────────────────────────────────────────────────────
// Each matches a SHAPE. The examples in the comments are invented.
const RULES = [
  { id: 'private-key',  re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,
    msg: 'a private key block' },
  { id: 'openai-key',   re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/,
    msg: 'an OpenAI/Anthropic-style secret key' },
  { id: 'google-key',   re: /\bAIza[0-9A-Za-z_-]{30,}/,
    msg: 'a Google API key' },
  { id: 'aws-key',      re: /\bAKIA[0-9A-Z]{16}\b/,
    msg: 'an AWS access key id' },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}/,
    msg: 'a GitHub token' },
  { id: 'slack-token',  re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    msg: 'a Slack token' },
  { id: 'jwt',          re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./,
    msg: 'a JSON Web Token' },
  { id: 'bearer',       re: /\bBearer\s+[A-Za-z0-9._~+/-]{24,}/,
    msg: 'a literal bearer token' },
  { id: 'presigned',    re: /[?&]X-Amz-Signature=|[?&]sig=[A-Za-z0-9%]{30,}/,
    msg: 'a presigned URL signature' },
  // Internal-only namespaces. Public TLDs are fine; these are not.
  // `host.docker.internal` is Docker's documented alias and is excluded by
  // the lookbehind rather than the allowlist, because the match itself would
  // otherwise be the bare tail of that name.  confidentiality-allow
  { id: 'internal-host',
    re: /(?<!host\.)\b[a-z0-9][a-z0-9-]*\.(?:corp|intra|intranet|internal|lan|priv)\b/i,
    msg: 'an internal-only hostname' },
  // RFC1918 / CGNAT literals. A real internal address should never ship.
  { id: 'private-ip',
    re: /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})\b/,
    msg: 'a private/internal IP address' },
  // Slack channels, e.g. an invented "#eng-example-team".
  //
  // This rule is deliberately narrow. A broad "#word" pattern is useless
  // here: it matches every CSS hex colour, every id selector and every
  // in-page anchor, which buried the two real findings under ~80 false
  // positives on its first run. So it fires only in prose files, only on
  // multi-word hyphenated names, and never on a hex colour. REAL channel
  // names belong in .confidential-terms, which needs no heuristic at all.
  // A leading '(' is excluded too: that is a markdown anchor link, ](#heading).
  { id: 'slack-channel',
    re: /(?:^|\s)#(?![0-9a-f]{3,8}\b)[a-z][a-z0-9]{1,}(?:-[a-z0-9]+){1,}\b/,
    msg: 'what looks like a Slack channel name',
    only: /\.(md|txt)$/i },
  // Street addresses, e.g. an invented "1234 Example Street".  confidentiality-allow
  { id: 'street-address',
    re: /\b\d{2,5}\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Parkway|Pkwy|Way)\b\.?/,
    msg: 'what looks like a street address' },
];

// Comment markers that mean "this line deliberately shows the shape".
// Use sparingly and only on invented values.
const EXEMPT = /confidentiality-allow/i;

// ── Gather tracked text files ───────────────────────────────────────────
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const tracked = git(['ls-files']).split('\n').filter(Boolean).filter(f => !SKIP_PATH.test(f));

// ── The local term list must never be committed ─────────────────────────
if (tracked.includes(TERMS_FILE)) {
  note(TERMS_FILE, 0,
    `${TERMS_FILE} is TRACKED BY GIT. It holds the literal forbidden terms; committing it publishes them. ` +
    `Run: git rm --cached ${TERMS_FILE}`);
}

let terms = [];
const termsPath = join(ROOT, TERMS_FILE);
if (existsSync(termsPath)) {
  terms = readFileSync(termsPath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.toLowerCase());
}

// ── Scan ────────────────────────────────────────────────────────────────
let scanned = 0;
for (const file of tracked) {
  let body;
  try { body = readFileSync(join(ROOT, file), 'utf8'); } catch { continue; }
  scanned++;
  const lines = body.split(/\r?\n/);

  lines.forEach((line, i) => {
    if (EXEMPT.test(line)) return;

    // Literal forbidden terms (local list only — never in this file).
    const lower = line.toLowerCase();
    for (const t of terms) {
      if (lower.includes(t)) {
        note(file, i + 1,
          `contains a term from ${TERMS_FILE} (not quoted here, by design). Replace it with an invented equivalent.`);
        return;
      }
    }

    for (const rule of RULES) {
      if (rule.only && !rule.only.test(file)) continue;
      const m = line.match(rule.re);
      if (!m) continue;
      if (allowed(m[0]) || allowed(line)) continue;
      note(file, i + 1,
        `${rule.msg} — "${m[0].slice(0, 40)}${m[0].length > 40 ? '…' : ''}". ` +
        `If this is invented and safe, append a "confidentiality-allow" comment on the line.`);
    }
  });
}

// ── Report ──────────────────────────────────────────────────────────────
const mode = terms.length
  ? `${terms.length} local term(s) + ${RULES.length} structural rules`
  : `${RULES.length} structural rules (no ${TERMS_FILE} present — expected in CI)`;

if (problems.length === 0) {
  console.log(`  ✓ confidentiality: ${scanned} tracked text files scanned — ${mode}`);
  process.exit(0);
}

console.log(`  ✗ confidentiality: ${problems.length} problem(s) across ${scanned} files — ${mode}`);
for (const p of problems) console.log(`    • ${p.file}:${p.line} — ${p.msg}`);
console.log('\n  Nothing real from a workplace may ship. See docs/DATA_HANDLING_RULES.md.');
process.exit(1);
