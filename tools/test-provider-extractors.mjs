// ============================================================
//  WaxFrame — tools/test-provider-extractors.mjs
// Build: 20260911-002
// ============================================================
// Fixture-based regression test for provider response-shape drift.
// Backlog item 4 (docs/WaxFrame_Backlog_Master_v267.txt) — v3.63.410 shipped
// a live bug where Claude's extended-thinking responses were misread as
// empty because every Anthropic extractor hardcoded content[0].text. Nothing
// in WaxFrame changed to cause it; Anthropic started returning a leading
// thinking block server-side with zero notice. This test feeds canned
// response JSON through the real extractor functions in
// js/provider-catalog.js (no live API calls, no browser) so the same class
// of drift — for Anthropic, Gemini, or OpenAI — gets caught here instead of
// live, mid-demo, from a customer-facing error modal.
//
// Run: node tools/test-provider-extractors.mjs
//
// Wire into release-check.mjs by adding it alongside the other
// tools/*.mjs checks it already shells out to (see the "Pricing coverage"
// / "Pricing Worker review-gate" sections there for the pattern).
// ============================================================

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { WFProviderCatalog } = require(path.join(__dirname, '..', 'js', 'provider-catalog.js'));

let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
}

console.log('▶ Anthropic extractor (extractAnthropicText)');

// (a) plain single-block response
check(
  'plain text block',
  WFProviderCatalog.extractAnthropicText({
    content: [{ type: 'text', text: 'plain answer' }]
  }),
  'plain answer'
);

// (b) thinking-block-then-text — the exact v3.63.410 live bug shape
check(
  'thinking block before text block',
  WFProviderCatalog.extractAnthropicText({
    content: [
      { type: 'thinking', thinking: 'reasoning about the answer' },
      { type: 'text', text: 'the real answer' }
    ]
  }),
  'the real answer'
);

// (c) thinking-only — genuinely empty, should still report empty, not throw
check(
  'thinking-only content (genuinely empty)',
  WFProviderCatalog.extractAnthropicText({
    content: [{ type: 'thinking', thinking: 'reasoning with no final answer' }]
  }),
  ''
);

console.log('▶ Gemini extractor (extractGeminiText)');

// (d) plain single-part response
check(
  'plain text part',
  WFProviderCatalog.extractGeminiText({
    candidates: [{ content: { parts: [{ text: 'plain answer' }] } }]
  }),
  'plain answer'
);

// (e) thought-part-then-text
check(
  'thought part before text part',
  WFProviderCatalog.extractGeminiText({
    candidates: [
      {
        content: {
          parts: [
            { thought: true, text: 'reasoning about the answer' },
            { text: 'the real answer' }
          ]
        }
      }
    ]
  }),
  'the real answer'
);

// (f) thought-only — genuinely empty
check(
  'thought-only content (genuinely empty)',
  WFProviderCatalog.extractGeminiText({
    candidates: [
      { content: { parts: [{ thought: true, text: 'reasoning with no final answer' }] } }
    ]
  }),
  ''
);

console.log('▶ OpenAI extractor (extractOpenAIText)');

// (g) plain content
check(
  'plain message content',
  WFProviderCatalog.extractOpenAIText({
    choices: [{ message: { content: 'plain answer' } }]
  }),
  'plain answer'
);

// (h) refusal-only — message.content is null/absent, refusal field carries text.
// This should report empty (not throw) — refusal text has its own separate
// parser (wf-debug.js's parseRefusal) that reads the raw un-parsed response,
// not this already-parsed-object path (see v3.63.428 note in provider-catalog.js).
check(
  'refusal-only choice (no content)',
  WFProviderCatalog.extractOpenAIText({
    choices: [{ message: { role: 'assistant', content: null, refusal: 'I cannot help with that.' } }]
  }),
  ''
);

// (i) empty choices array — genuinely empty, should still report empty
check(
  'empty choices array (genuinely empty)',
  WFProviderCatalog.extractOpenAIText({ choices: [] }),
  ''
);

console.log('▶ Provider-specific model filters');

const geminiEntry = WFProviderCatalog.CATALOG.find(entry => entry.id === 'gemini');
const geminiExtraFilters = geminiEntry?.filterExtras || [];
check(
  'Gemini Deep Research agents are excluded from generateContent model lists',
  geminiExtraFilters.some(pattern => pattern.test('deep-research-preview-04-2026')),
  true
);
check(
  'standard Gemini models survive the Deep Research filter',
  geminiExtraFilters.some(pattern => pattern.test('gemini-3.5-flash')),
  false
);

// ── Truncation detection (v3.63.489) ────────────────────────────────
// A Builder that hits its output cap returns a response that LOOKS
// finished. These fixtures pin the two signals that catch it, per provider
// response shape. Live values were verified against provider docs when
// this was written; drift here means a real cut-off document gets
// presented to the user as a complete one.

console.log('▶ Finish-reason extraction (extractFinishReason)');

check('OpenAI shape — choices[0].finish_reason',
  WFProviderCatalog.extractFinishReason({ choices: [{ finish_reason: 'length' }] }), 'length');
check('Gemini shape — candidates[0].finishReason',
  WFProviderCatalog.extractFinishReason({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), 'MAX_TOKENS');
check('Anthropic shape — stop_reason',
  WFProviderCatalog.extractFinishReason({ stop_reason: 'max_tokens' }), 'max_tokens');
check('off-spec local server — choices[0].finishReason (camelCase)',
  WFProviderCatalog.extractFinishReason({ choices: [{ finishReason: 'length' }] }), 'length');
check('normal OpenAI completion still reads back as stop',
  WFProviderCatalog.extractFinishReason({ choices: [{ finish_reason: 'stop' }] }), 'stop');
check('no finish reason anywhere (common on local servers)',
  WFProviderCatalog.extractFinishReason({ choices: [{ message: { content: 'hi' } }] }), null);
check('null response object',
  WFProviderCatalog.extractFinishReason(null), null);

console.log('▶ Truncation signal (isTruncationSignal)');

// Must fire — these mean "ran out of output room".
check("OpenAI / Grok / Perplexity / DeepSeek / Together 'length'",
  WFProviderCatalog.isTruncationSignal('length'), true);
check("Gemini 'MAX_TOKENS'",
  WFProviderCatalog.isTruncationSignal('MAX_TOKENS'), true);
check("Anthropic 'max_tokens'",
  WFProviderCatalog.isTruncationSignal('max_tokens'), true);
check("Mistral 'model_length' (carried defensively, unverified upstream)",
  WFProviderCatalog.isTruncationSignal('model_length'), true);

// Must NOT fire — these are finished responses or unrelated failures.
// A false positive here would fire a continuation at an already-complete
// document, which is worse than the bug being guarded against.
check("normal OpenAI stop", WFProviderCatalog.isTruncationSignal('stop'), false);
check("Anthropic 'end_turn'", WFProviderCatalog.isTruncationSignal('end_turn'), false);
check("Gemini 'STOP'", WFProviderCatalog.isTruncationSignal('STOP'), false);
check("Cohere 'COMPLETE'", WFProviderCatalog.isTruncationSignal('COMPLETE'), false);
check("Together 'eos'", WFProviderCatalog.isTruncationSignal('eos'), false);
check("'tool_calls'", WFProviderCatalog.isTruncationSignal('tool_calls'), false);
check("'content_filter' is a different failure",
  WFProviderCatalog.isTruncationSignal('content_filter'), false);
check("DeepSeek 'insufficient_system_resource' is infra, not capacity",
  WFProviderCatalog.isTruncationSignal('insufficient_system_resource'), false);
check("DeepSeek 'aborted' is infra, not capacity",
  WFProviderCatalog.isTruncationSignal('aborted'), false);
check('null', WFProviderCatalog.isTruncationSignal(null), false);
check('undefined', WFProviderCatalog.isTruncationSignal(undefined), false);
check('empty string', WFProviderCatalog.isTruncationSignal(''), false);

console.log('▶ Structural truncation (looksStructurallyTruncated)');

const DOC_OK   = `%%DOCUMENT_START%%\nbody\n%%DOCUMENT_END%%`;
const CONF_OK  = `%%CONFLICTS_START%%\nNO CONFLICTS\n%%CONFLICTS_END%%`;
const APPL_OK  = `%%APPLIED_START%%\nNO APPLIED CHANGES\n%%APPLIED_END%%`;
const COMPLETE = [DOC_OK, CONF_OK, APPL_OK].join(`\n`);

check('complete three-block response is not truncated',
  WFProviderCatalog.looksStructurallyTruncated(COMPLETE), false);
check('draft-phase response with no APPLIED block is not truncated',
  WFProviderCatalog.looksStructurallyTruncated([DOC_OK, CONF_OK].join(`\n`)), false);
check('cut off mid-document (no DOCUMENT_END)',
  WFProviderCatalog.looksStructurallyTruncated(`%%DOCUMENT_START%%\nhalf a docum`), true);
// The pre-v3.63.489 blind spot: this response HAS a conflicts block, so the
// old check — nested inside `if (!hasConflictBlock)` — never examined it.
check('cut off inside the conflicts block (the old blind spot)',
  WFProviderCatalog.looksStructurallyTruncated(
    DOC_OK + `\n%%CONFLICTS_START%%\n[USER DECISION] half a conf`), true);
check('cut off inside the applied block',
  WFProviderCatalog.looksStructurallyTruncated(
    [DOC_OK, CONF_OK].join(`\n`) + `\n%%APPLIED_START%%\n[APPLIED] half`), true);
check('backtick-wrapped markers are normalised before the check',
  WFProviderCatalog.looksStructurallyTruncated(
    [`%%DOCUMENT_START%%\nbody with \`[bracket]\` text\n%%DOCUMENT_END%%`, CONF_OK].join(`\n`)), false);
check('empty string', WFProviderCatalog.looksStructurallyTruncated(''), false);
check('non-string input', WFProviderCatalog.looksStructurallyTruncated(null), false);

console.log('▶ Anthropic Builder output ceiling');

// Regression guard on the self-inflicted cap. WaxFrame must send
// max_tokens to Anthropic (the API requires it), and for the life of the
// app it sent 4096 — about 3,000 words for a payload that carries the
// document AND the conflicts block AND the applied-changes block. That was
// the cap that cut a real build off on 2026-09-11.
check('Anthropic ceiling is well above the old 4096 default',
  WFProviderCatalog.ANTHROPIC_MAX_OUTPUT_TOKENS >= 16384, true);

console.log('');
if (fail === 0) {
  console.log(`✅ All ${pass} provider-extractor fixture checks passed.`);
  process.exit(0);
} else {
  console.log(`❌ ${fail} of ${pass + fail} provider-extractor fixture checks failed.`);
  process.exit(1);
}
