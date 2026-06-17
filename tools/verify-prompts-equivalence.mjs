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

// Inline-string fallbacks (resolved_builder, resolved_reviewers, ai_warning) — these live
// inside getPrompt() calls in app.js, not as named constants. Check them by source-grep.
function findInlineFallback(src, key) {
  // Pattern: getPrompt('KEY', '...TEXT...')
  const re = new RegExp(`getPrompt\\('${key}',\\s*'([^']*(?:\\\\.[^']*)*)'\\)`, 's');
  const m = re.exec(src);
  if (!m) return null;
  // Unescape JS string literal — handle \n and \\
  return m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

console.log('\nInline-fallback prefix strings (app.js getPrompt fallbacks):');
const inlineChecks = [
  ['resolved_builder',   pr.resolved_builder],
  ['resolved_reviewers', pr.resolved_reviewers],
  ['ai_warning',         pr.ai_warning]
];
for (const [key, prVal] of inlineChecks) {
  const inline = findInlineFallback(appSource, key);
  if (inline == null) { console.log(`${key.padEnd(28)} APP_NOT_FOUND`); allOk = false; continue; }
  const ok = prVal === inline;
  console.log(`${key.padEnd(28)} ${ok ? 'MATCH  ' : 'DRIFT  '} WF=${md5(prVal)}  APP=${md5(inline)}  ${prVal.length}/${inline.length}`);
  if (!ok) {
    console.log(`  --- WF -------\n${JSON.stringify(prVal)}`);
    console.log(`  --- APP ------\n${JSON.stringify(inline)}`);
    allOk = false;
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
