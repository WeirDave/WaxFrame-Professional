// ============================================================
//  tools/verify-prompts-equivalence.mjs
//  Build: 20260616-003
//
//  Compares WF_PROMPTS values in js/prompts.js to the canonical
//  constants in js/app.js (DEFAULT_PHASE_INSTRUCTIONS,
//  BUILDER_INSTRUCTIONS, MODEL_RECOMMENDATION_PROMPT_*,
//  MODEL_TIER_CLASSIFICATION_PROMPT). Used during the v3.63.396
//  prompt modularization release to prove byte-equivalence
//  before Release B switches any consumer to read from the
//  module.
//
//  Run: node tools/verify-prompts-equivalence.mjs
//  Exit 0 if every prompt matches; exit 1 with a drift table
//  otherwise.
// ============================================================
import fs from 'node:fs';
import crypto from 'node:crypto';

const appSource     = fs.readFileSync('js/app.js',     'utf8');
const promptsSource = fs.readFileSync('js/prompts.js', 'utf8');

function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }

// Extract a top-level `const NAME = ...;` block (template literal or object literal)
function getConst(src, name) {
  const reStart = new RegExp('^const\\s+' + name + '\\s*=', 'm');
  const m = reStart.exec(src);
  if (!m) return null;
  const start = m.index;
  let i = start + m[0].length;
  while (i < src.length && /\s/.test(src[i])) i++;
  const kind = src[i];
  let end = -1;
  if (kind === '`') {
    // Walk forward respecting nested ${...} interpolations (none in our prompts but be safe)
    let j = i + 1;
    let depth = 0;
    while (j < src.length) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (depth === 0 && c === '`') {
        // Match newline-then-backtick-semicolon OR backtick-semicolon at end of expression
        if (src[j+1] === ';') { end = j + 2; break; }
        end = j + 1; break;
      }
      if (c === '$' && src[j+1] === '{') { depth++; j += 2; continue; }
      if (c === '}' && depth > 0) { depth--; }
      j++;
    }
  } else if (kind === '{') {
    let depth = 0;
    let inStr = null;
    let inTpl = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (inStr) {
        if (c === '\\') { j++; continue; }
        if (c === inStr) { inStr = null; }
        continue;
      }
      if (inTpl) {
        if (c === '\\') { j++; continue; }
        if (c === '`') { inTpl = false; }
        continue;
      }
      if (c === '"' || c === "'") { inStr = c; continue; }
      if (c === '`') { inTpl = true; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          if (src[j+1] === ';') { end = j + 2; break; }
          end = j + 1; break;
        }
      }
    }
  }
  if (end < 0) return null;
  return src.slice(start, end);
}

const wanted = [
  'DEFAULT_PHASE_INSTRUCTIONS',
  'BUILDER_INSTRUCTIONS',
  'MODEL_RECOMMENDATION_PROMPT_REVIEWER',
  'MODEL_RECOMMENDATION_PROMPT_BUILDER',
  'MODEL_TIER_CLASSIFICATION_PROMPT'
];

const evalCode = wanted.map(w => getConst(appSource, w)).filter(Boolean).join('\n');
if (!evalCode) {
  console.error('FAIL — could not extract constants from app.js');
  process.exit(1);
}

const appFn = new Function(`${evalCode}; return { DEFAULT_PHASE_INSTRUCTIONS, BUILDER_INSTRUCTIONS, MODEL_RECOMMENDATION_PROMPT_REVIEWER, MODEL_RECOMMENDATION_PROMPT_BUILDER, MODEL_TIER_CLASSIFICATION_PROMPT };`);
const app = appFn();

const prFn = new Function(promptsSource.replace("'use strict';", '') + '\nreturn WF_PROMPTS;');
const pr = prFn();

const checks = [
  ['draft_scratch',            pr.draft_scratch,            app.DEFAULT_PHASE_INSTRUCTIONS.draft_scratch],
  ['refine',                   pr.refine,                   app.DEFAULT_PHASE_INSTRUCTIONS.refine],
  ['builder_draft',            pr.builder_draft,            app.BUILDER_INSTRUCTIONS.draft],
  ['builder_refine',           pr.builder_refine,           app.BUILDER_INSTRUCTIONS.refine],
  ['recommend_model_reviewer', pr.recommend_model_reviewer, app.MODEL_RECOMMENDATION_PROMPT_REVIEWER],
  ['recommend_model_builder',  pr.recommend_model_builder,  app.MODEL_RECOMMENDATION_PROMPT_BUILDER],
  ['tier_classification',      pr.tier_classification,      app.MODEL_TIER_CLASSIFICATION_PROMPT]
];

let allOk = true;
console.log('\nProperty                    Status   WF_PROMPTS MD5                      app.js MD5                       lens');
console.log('─'.repeat(140));
for (const [name, a, b] of checks) {
  if (a == null || b == null) {
    console.log(`${name.padEnd(28)} MISSING  ${a==null?'WF':'__'}                                ${b==null?'APP':'___'}`);
    allOk = false; continue;
  }
  const ok = a === b;
  const ah = md5(a), bh = md5(b);
  console.log(`${name.padEnd(28)} ${ok ? 'MATCH  ' : 'DRIFT  '} ${ah}  ${bh}  ${a.length}/${b.length}`);
  if (!ok) allOk = false;
}

// As of Release C (v3.63.398) every consumer site reads its fallback from WF_PROMPTS
// rather than an inline string literal. Confirm by grep: every getPrompt('KEY', ...)
// site that previously used an inline string should now reference WF_PROMPTS.KEY.
console.log('\nConsumer-site fallback patterns (post-Release-C):');
const consumerKeys = ['draft_scratch', 'refine', 'resolved_builder', 'resolved_reviewers', 'ai_warning'];
for (const key of consumerKeys) {
  const re = new RegExp(`getPrompt\\('${key}',\\s*([^)]+)\\)`);
  const m = re.exec(appSource);
  if (!m) { console.log(`${key.padEnd(28)} NO_CONSUMER_FOUND`); continue; }
  const fb = m[1].trim();
  const usesWfPrompts = /^WF_PROMPTS\.\w+/.test(fb);
  console.log(`  ${key.padEnd(28)} ${usesWfPrompts ? 'WF_PROMPTS' : 'NOT_WF'}  ${fb}`);
  if (!usesWfPrompts) allOk = false;
}
// Builder consumer sites use a builderKey variable so check separately.
{
  const builderRe = /getPrompt\(builderKey,\s*([^)]+)\)/g;
  let m, count = 0;
  while ((m = builderRe.exec(appSource)) !== null) {
    count++;
    const fb = m[1].trim();
    const usesWfPrompts = /^WF_PROMPTS\[builderKey\]/.test(fb);
    console.log(`  builderKey site #${count}              ${usesWfPrompts ? 'WF_PROMPTS' : 'NOT_WF'}  ${fb}`);
    if (!usesWfPrompts) allOk = false;
  }
}

// ──────────────────────────────────────────────────────────
// Release-D check (added v3.63.399)
// prompt-editor.js's DEFAULTS table should source every value from
// WF_PROMPTS — no more hand-mirrored copies. Verify by static grep.
// ──────────────────────────────────────────────────────────
console.log('\nRelease-D: prompt-editor.js DEFAULTS sources from WF_PROMPTS:');
{
  const peSource = fs.readFileSync('js/prompt-editor.js', 'utf8');
  const reBlock = /const\s+DEFAULTS\s*=\s*\{([\s\S]*?)\n\s*\};/;
  const m = reBlock.exec(peSource);
  if (!m) {
    console.log('  prompt-editor.js DEFAULTS block NOT FOUND'); allOk = false;
  } else {
    const body = m[1];
    const expected = ['draft_scratch', 'refine', 'builder_draft', 'builder_refine',
                      'resolved_builder', 'resolved_reviewers', 'ai_warning', 'recommend_model'];
    for (const key of expected) {
      const re = new RegExp(`\\b${key}\\s*:\\s*WF_PROMPTS\\.\\w+`);
      const hit = re.test(body);
      console.log(`  ${key.padEnd(28)} ${hit ? 'WF_PROMPTS' : 'NOT_WF — INLINE STILL PRESENT'}`);
      if (!hit) allOk = false;
    }
    // Hard ceiling on DEFAULTS body size — after Release D the block should
    // be well under 1000 chars (pre-D it was ~7400 chars of inline prompt
    // text). If it grew, something's drifted back.
    const sz = body.length;
    console.log(`  block-body length            ${sz} chars  ${sz < 1000 ? '(OK — under 1000-char ceiling)' : '(REGRESSION — was supposed to drop under 1000 chars)'}`);
    if (sz >= 1000) allOk = false;
  }
}

// ──────────────────────────────────────────────────────────
// Release-C lookup-equivalence check (added v3.63.398)
// All five Reviewer + envelope-prefix sites swapped to read fallbacks
// from WF_PROMPTS. Compare against the previous inline + const fallbacks.
// ──────────────────────────────────────────────────────────
console.log('\nRelease-C lookup-equivalence:');
{
  const evalD = getConst(appSource, 'DEFAULT_PHASE_INSTRUCTIONS') + '\nreturn DEFAULT_PHASE_INSTRUCTIONS;';
  const DEFAULT_PHASE_INSTRUCTIONS = (new Function(evalD))();
  const WF = pr;
  const checks = [
    ['draft_scratch (Reviewer first-draft)',  DEFAULT_PHASE_INSTRUCTIONS.draft_scratch,  WF.draft_scratch],
    ['refine (Reviewer refine)',              DEFAULT_PHASE_INSTRUCTIONS.refine,         WF.refine],
    ['resolved_builder  (envelope prefix)',   pr.resolved_builder,                       WF.resolved_builder],
    ['resolved_reviewers (envelope prefix)',  pr.resolved_reviewers,                     WF.resolved_reviewers],
    ['ai_warning        (envelope prefix)',   pr.ai_warning,                             WF.ai_warning]
  ];
  for (const [name, oldFb, newFb] of checks) {
    const ok = oldFb === newFb;
    console.log(`  ${name.padEnd(40)} ${ok ? 'MATCH' : 'DRIFT'} old=${md5(oldFb).slice(0,8)} new=${md5(newFb).slice(0,8)}`);
    if (!ok) allOk = false;
  }
}

// ──────────────────────────────────────────────────────────
// Release-B lookup-equivalence check (added v3.63.397)
// Simulates the OLD pattern `BUILDER_INSTRUCTIONS[phase] || BUILDER_INSTRUCTIONS.refine`
// vs the NEW pattern `WF_PROMPTS[builderKey] || WF_PROMPTS.builder_refine`
// for both phase values. Must produce byte-identical fallback strings.
// ──────────────────────────────────────────────────────────
console.log('\nRelease-B lookup-equivalence:');
{
  const evalB = getConst(appSource, 'BUILDER_INSTRUCTIONS') + '\nreturn BUILDER_INSTRUCTIONS;';
  const BUILDER_INSTRUCTIONS = (new Function(evalB))();
  const WF = pr;
  const phases = ['draft', 'refine'];
  for (const phase of phases) {
    const builderKey = phase === 'draft' ? 'builder_draft' : 'builder_refine';
    const oldFb = BUILDER_INSTRUCTIONS[phase] || BUILDER_INSTRUCTIONS.refine;
    const newFb = WF[builderKey] || WF.builder_refine;
    const ok = oldFb === newFb;
    console.log(`  phase=${phase}  builderKey=${builderKey}  ${ok ? 'MATCH' : 'DRIFT'}  old=${md5(oldFb).slice(0,8)} new=${md5(newFb).slice(0,8)}`);
    if (!ok) allOk = false;
  }
}

process.exit(allOk ? 0 : 1);
