// ============================================================
//  WaxFrame — tools/test-provider-extractors.mjs
// Build: 20260815-006
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

console.log('');
if (fail === 0) {
  console.log(`✅ All ${pass} provider-extractor fixture checks passed.`);
  process.exit(0);
} else {
  console.log(`❌ ${fail} of ${pass + fail} provider-extractor fixture checks failed.`);
  process.exit(1);
}
