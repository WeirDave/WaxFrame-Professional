// ============================================================
//  tools/verify-prompts-equivalence.mjs
//  Build: 20260619-002
//
//  Post-Release-F (v3.63.401) the prompt consts (DEFAULT_PHASE_INSTRUCTIONS,
//  BUILDER_INSTRUCTIONS, MODEL_RECOMMENDATION_PROMPT_*, MODEL_TIER_CLASSIFICATION_PROMPT)
//  no longer exist in js/app.js — every consumer site reads from
//  WF_PROMPTS in js/prompts.js, and the Prompt Editor reads from the
//  same source.
//
//  Verifier responsibilities now:
//   1. WF_PROMPTS contains all expected keys with non-empty values.
//   2. js/app.js consumer sites reference WF_PROMPTS (not deleted consts).
//   3. js/prompt-editor.js DEFAULTS sources every value from WF_PROMPTS
//      and stays under the 1000-char body-length ceiling.
//   4. No code path in js/app.js still references a deleted const.
//
//  Pre-Release-F equivalence-check sections are retained as no-ops when
//  the historical consts are absent, so a CI rollback to Release E or
//  earlier still produces useful output.
//
//  Run: node tools/verify-prompts-equivalence.mjs
//  Exit 0 if every check passes; exit 1 with details otherwise.
// ============================================================
import fs from 'node:fs';
import crypto from 'node:crypto';

const appSource     = fs.readFileSync('js/app.js',          'utf8');
const promptsSource = fs.readFileSync('js/prompts.js',      'utf8');
const peSource      = fs.readFileSync('js/prompt-editor.js','utf8');

function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }

// Extract a top-level `const NAME = ...;` block, template-literal or object-literal.
// Returns null if not found (used to detect post-Release-F state).
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
    let j = i + 1, depth = 0;
    while (j < src.length) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (depth === 0 && c === '`') {
        if (src[j+1] === ';') { end = j + 2; break; }
        end = j + 1; break;
      }
      if (c === '$' && src[j+1] === '{') { depth++; j += 2; continue; }
      if (c === '}' && depth > 0) depth--;
      j++;
    }
  } else if (kind === '{') {
    let depth = 0, inStr = null, inTpl = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) inStr = null; continue; }
      if (inTpl) { if (c === '\\') { j++; continue; } if (c === '`') inTpl = false; continue; }
      if (c === '"' || c === "'") { inStr = c; continue; }
      if (c === '`') { inTpl = true; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { if (src[j+1] === ';') { end = j + 2; break; } end = j + 1; break; }
      }
    }
  }
  if (end < 0) return null;
  return src.slice(start, end);
}

// Load WF_PROMPTS
const prFn = new Function(promptsSource.replace("'use strict';", '') + '\nreturn WF_PROMPTS;');
const pr = prFn();

let allOk = true;

// ──────────────────────────────────────────────────────────
// Check 1 — WF_PROMPTS has all expected keys, non-empty values.
// ──────────────────────────────────────────────────────────
console.log('Check 1 — WF_PROMPTS shape:');
const expectedKeys = [
  'draft_scratch', 'refine',
  'builder_draft', 'builder_refine',
  'resolved_builder', 'resolved_reviewers', 'ai_warning',
  'recommend_model_reviewer', 'recommend_model_builder',
  'tier_classification'
];
for (const k of expectedKeys) {
  const v = pr[k];
  const ok = typeof v === 'string' && v.length > 0;
  console.log(`  ${k.padEnd(28)} ${ok ? 'OK' : 'MISSING/EMPTY'}  ${ok ? 'md5=' + md5(v).slice(0,8) + ' len=' + v.length : ''}`);
  if (!ok) allOk = false;
}

// ──────────────────────────────────────────────────────────
// Check 2 — js/app.js consumer sites reference WF_PROMPTS.
// ──────────────────────────────────────────────────────────
console.log('\nCheck 2 — app.js consumer sites:');
const consumerSiteChecks = [
  // key, regex matching the new pattern, label
  ['draft_scratch',      /getPrompt\('draft_scratch',\s*WF_PROMPTS\.draft_scratch\)/,           "getPrompt('draft_scratch', WF_PROMPTS.draft_scratch)"],
  ['refine',             /getPrompt\('refine',\s*WF_PROMPTS\.refine\)/,                         "getPrompt('refine', WF_PROMPTS.refine)"],
  ['resolved_builder',   /getPrompt\('resolved_builder',\s*WF_PROMPTS\.resolved_builder\)/,     "getPrompt('resolved_builder', WF_PROMPTS.resolved_builder)"],
  ['resolved_reviewers', /getPrompt\('resolved_reviewers',\s*WF_PROMPTS\.resolved_reviewers\)/, "getPrompt('resolved_reviewers', WF_PROMPTS.resolved_reviewers)"],
  ['ai_warning',         /getPrompt\('ai_warning',\s*WF_PROMPTS\.ai_warning\)/,                 "getPrompt('ai_warning', WF_PROMPTS.ai_warning)"],
  ['builderKey path',    /getPrompt\(builderKey,\s*WF_PROMPTS\[builderKey\]\s*\|\|\s*WF_PROMPTS\.builder_refine\)/, "getPrompt(builderKey, WF_PROMPTS[builderKey] || WF_PROMPTS.builder_refine)"],
  ['recommend Builder',  /\?\s*WF_PROMPTS\.recommend_model_builder/,                            "? WF_PROMPTS.recommend_model_builder"],
  ['recommend Reviewer', /:\s*WF_PROMPTS\.recommend_model_reviewer/,                            ": WF_PROMPTS.recommend_model_reviewer"],
  ['tier classify',      /WF_PROMPTS\.tier_classification\.replace\(/,                          "WF_PROMPTS.tier_classification.replace(...)"]
];
for (const [key, re, label] of consumerSiteChecks) {
  const ok = re.test(appSource);
  console.log(`  ${key.padEnd(20)} ${ok ? 'OK' : 'MISSING'}  ${label}`);
  if (!ok) allOk = false;
}

// ──────────────────────────────────────────────────────────
// Check 3 — js/prompt-editor.js DEFAULTS reads from WF_PROMPTS.
// ──────────────────────────────────────────────────────────
console.log('\nCheck 3 — prompt-editor.js DEFAULTS:');
const peBlockMatch = /const\s+DEFAULTS\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(peSource);
if (!peBlockMatch) {
  console.log('  DEFAULTS block NOT FOUND'); allOk = false;
} else {
  const body = peBlockMatch[1];
  const defaultsKeys = ['draft_scratch','refine','builder_draft','builder_refine','resolved_builder','resolved_reviewers','ai_warning','recommend_model'];
  for (const k of defaultsKeys) {
    const ok = new RegExp(`\\b${k}\\s*:\\s*WF_PROMPTS\\.\\w+`).test(body);
    console.log(`  ${k.padEnd(28)} ${ok ? 'WF_PROMPTS' : 'INLINE — DRIFT'}`);
    if (!ok) allOk = false;
  }
  const sz = body.length;
  const szOk = sz < 1000;
  console.log(`  body length                  ${sz} chars  ${szOk ? 'OK (under 1000-char ceiling)' : 'REGRESSION (>= 1000)'}`);
  if (!szOk) allOk = false;
}

// ──────────────────────────────────────────────────────────
// Check 4 — no app.js code path references a deleted const.
// Allowed: paper-trail historical comments referring to the OLD names.
// Disallowed: any code line that's not inside a // or /* */ comment.
// ──────────────────────────────────────────────────────────
console.log('\nCheck 4 — no live references to deleted consts:');
const deletedConsts = [
  'BUILDER_INSTRUCTIONS',
  'DEFAULT_PHASE_INSTRUCTIONS',
  'MODEL_RECOMMENDATION_PROMPT_REVIEWER',
  'MODEL_RECOMMENDATION_PROMPT_BUILDER',
  'MODEL_RECOMMENDATION_PROMPT_DEFAULT',
  'MODEL_TIER_CLASSIFICATION_PROMPT'
];
const appLines = appSource.split('\n');
for (const sym of deletedConsts) {
  const hits = [];
  for (let i = 0; i < appLines.length; i++) {
    const line = appLines[i];
    if (!line.includes(sym)) continue;
    // Comment-line check: trim leading whitespace, check for // or *
    const trimmed = line.trimStart();
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('*');
    if (!isComment) hits.push(i + 1);
  }
  const ok = hits.length === 0;
  console.log(`  ${sym.padEnd(36)} ${ok ? 'OK (no live refs)' : 'LIVE REF at lines ' + hits.join(',')}`);
  if (!ok) allOk = false;
}

// ──────────────────────────────────────────────────────────
// Pre-Release-F backward-compat (no-op when consts are absent)
// Kept so a CI rollback to Release ≤ E still produces useful output.
// ──────────────────────────────────────────────────────────
const stillHaveOldConsts = ['DEFAULT_PHASE_INSTRUCTIONS','BUILDER_INSTRUCTIONS','MODEL_RECOMMENDATION_PROMPT_REVIEWER','MODEL_RECOMMENDATION_PROMPT_BUILDER','MODEL_TIER_CLASSIFICATION_PROMPT']
  .some(n => getConst(appSource, n));
if (stillHaveOldConsts) {
  console.log('\n[backward-compat] historical consts still present in app.js — running pre-Release-F byte-equivalence check…');
  for (const name of ['DEFAULT_PHASE_INSTRUCTIONS','BUILDER_INSTRUCTIONS','MODEL_RECOMMENDATION_PROMPT_REVIEWER','MODEL_RECOMMENDATION_PROMPT_BUILDER','MODEL_TIER_CLASSIFICATION_PROMPT']) {
    const block = getConst(appSource, name);
    if (!block) { console.log(`  ${name.padEnd(40)} ABSENT (already swept)`); continue; }
    try {
      const v = (new Function(block + `\nreturn ${name};`))();
      const map = {
        DEFAULT_PHASE_INSTRUCTIONS: () => [['draft_scratch', v.draft_scratch, pr.draft_scratch], ['refine', v.refine, pr.refine]],
        BUILDER_INSTRUCTIONS: () => [['builder_draft', v.draft, pr.builder_draft], ['builder_refine', v.refine, pr.builder_refine]],
        MODEL_RECOMMENDATION_PROMPT_REVIEWER: () => [['recommend_model_reviewer', v, pr.recommend_model_reviewer]],
        MODEL_RECOMMENDATION_PROMPT_BUILDER:  () => [['recommend_model_builder',  v, pr.recommend_model_builder]],
        MODEL_TIER_CLASSIFICATION_PROMPT:     () => [['tier_classification',      v, pr.tier_classification]]
      };
      for (const [k, oldV, newV] of map[name]()) {
        const ok = oldV === newV;
        console.log(`  ${k.padEnd(28)} ${ok ? 'MATCH' : 'DRIFT'} old=${md5(oldV).slice(0,8)} new=${md5(newV).slice(0,8)}`);
        if (!ok) allOk = false;
      }
    } catch (e) {
      console.log(`  ${name.padEnd(40)} EVAL_ERROR  ${e.message}`);
      allOk = false;
    }
  }
}

console.log('');
process.exit(allOk ? 0 : 1);
