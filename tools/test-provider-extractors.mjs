// ============================================================
//  WaxFrame — tools/test-provider-extractors.mjs
// Build: 20260914-001
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

// ── Truncation detection (v3.63.493) ────────────────────────────────
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
// The pre-v3.63.493 blind spot: this response HAS a conflicts block, so the
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

// ── Model token limits (v3.63.493) ──────────────────────────────────
// Which model can actually finish a Builder round is decided by its max
// output tokens. These fixtures pin BOTH the per-provider extraction (the
// shapes drift) and the provenance precedence (the part that would quietly
// mislead if it broke).

console.log('\u25b6 Limit extraction per provider shape (limitsFromModelEntry)');

const gem = WFProviderCatalog.limitsFromModelEntry('gemini-list',
  { name: 'models/gemini-3.5-pro', inputTokenLimit: 1048576, outputTokenLimit: 65536 });
check('Gemini publishes both limits - context', gem && gem.context, 1048576);
check('Gemini publishes both limits - output',  gem && gem.output,  65536);

const ant = WFProviderCatalog.limitsFromModelEntry('anthropic-via-proxy',
  { id: 'claude-sonnet-4-6', max_input_tokens: 200000, max_tokens: 64000 });
check('Anthropic publishes both limits - context', ant && ant.context, 200000);
check('Anthropic publishes both limits - output',  ant && ant.output,  64000);

// Anthropic returns 0 where a limit is not published. Zero is not a real
// ceiling of zero - it must read as unknown, or the picker would claim a
// model can emit nothing.
check('Anthropic zeroes mean unknown, not a real limit of zero',
  WFProviderCatalog.limitsFromModelEntry('anthropic-via-proxy',
    { id: 'x', max_input_tokens: 0, max_tokens: 0 }), null);

// Verified against the live openai-openapi spec on 2026-09-11: the Model
// object carries id / created / object / owned_by / shutdown_date only.
check('OpenAI publishes no limits at all',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 'gpt-5.6-sol', created: 1, object: 'model', owned_by: 'openai' }), null);

// LM Studio reports both an architectural max and what the running
// instance actually serves. The loaded value is the operational truth.
const lms = WFProviderCatalog.limitsFromModelEntry('openai-models',
  { id: 'qwen', max_context_length: 262144, loaded_context_length: 81920 });
check('LM Studio loaded_context_length wins over max_context_length',
  lms && lms.context, 81920);
check('LM Studio max_context_length used when nothing is loaded',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 'q', max_context_length: 32768 }).context, 32768);
check('Together context_length is picked up',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 't', context_length: 131072 }).context, 131072);

console.log('\u25b6 Provenance precedence (mergeModelLimits)');

// An OBSERVED truncation beats a declared figure. This is the whole reason
// observations are recorded: the declared number can be right about the
// model and still wrong about this setup (a self-hosted server's own cap,
// or an org policy).
const conflict = WFProviderCatalog.mergeModelLimits(
  { context: 200000, output: 64000, source: 'api' },
  { output: 4096, at: '2026-09-11T12:00:00Z' },
  'claude-sonnet-4-6');
check('observed output beats declared', conflict.output, 4096);
check('observed output is labelled observed', conflict.outputSource, 'observed');
check('the contradicted declared figure is preserved, not discarded',
  conflict.declaredOutput, 64000);
check('context still comes from the API', conflict.contextSource, 'api');

// Providers round, and a model stopping slightly under its ceiling is not
// evidence of a lower cap. Only a MEANINGFUL shortfall counts as a conflict.
const nearMiss = WFProviderCatalog.mergeModelLimits(
  { context: 200000, output: 64000, source: 'api' },
  { output: 63000, at: '2026-09-11T12:00:00Z' },
  'claude-sonnet-4-6');
check('a near-miss observation is not reported as contradicting the provider',
  nearMiss.declaredOutput, null);

const apiOnly = WFProviderCatalog.mergeModelLimits(
  { context: 1048576, output: 65536, source: 'api' }, null, 'gemini-3.5-pro');
check('API-only output is labelled api', apiOnly.outputSource, 'api');
check('API-only context is labelled api', apiOnly.contextSource, 'api');

// Nothing published: fall back to the hand-maintained table, and say so.
const tableOnly = WFProviderCatalog.mergeModelLimits(null, null, 'gpt-5.6-sol');
check('falls back to the maintained table', tableOnly.outputSource, 'table');
check('the table carries its review date so staleness is visible',
  tableOnly.reviewed, WFProviderCatalog.LIMITS_TABLE_REVIEWED);

// Unknown must stay unknown. Inventing a number here is worse than showing
// nothing, because a displayed number gets trusted.
const unknown = WFProviderCatalog.mergeModelLimits(null, null, 'some-local-model-nobody-publishes');
check('unknown model reports no output limit',  unknown.output, null);
check('unknown model reports no context limit', unknown.context, null);
check('unknown model reports no source',        unknown.outputSource, null);

// A dated variant should still resolve against its base table entry.
check('dated model variant resolves via prefix match',
  WFProviderCatalog.limitsFromTable('gpt-5.6-sol-20260401').output,
  WFProviderCatalog.LIMITS_TABLE['gpt-5.6-sol'].output);

// Observed alone, with nothing published anywhere - the self-hosted case.
const obsOnly = WFProviderCatalog.mergeModelLimits(null, { output: 2048, at: '2026-09-11T12:00:00Z' }, 'local-llama');
check('observation alone is enough to report a ceiling', obsOnly.output, 2048);
check('observation alone is labelled observed', obsOnly.outputSource, 'observed');
check('observation alone raises no false conflict', obsOnly.declaredOutput, null);

console.log('\u25b6 Limit formatting (formatTokenLimit)');

// Providers pick round-decimal OR round-binary limits, and each family is
// named accordingly in the wild. 65536 is "64K" to everyone; 128000 is
// "128K", never "125K".
check('65536 renders as 64K',    WFProviderCatalog.formatTokenLimit(65536), '64K');
check('4096 renders as 4K',      WFProviderCatalog.formatTokenLimit(4096), '4K');
check('8192 renders as 8K',      WFProviderCatalog.formatTokenLimit(8192), '8K');
check('128000 renders as 128K',  WFProviderCatalog.formatTokenLimit(128000), '128K');
check('200000 renders as 200K',  WFProviderCatalog.formatTokenLimit(200000), '200K');
check('1048576 renders as 1M',   WFProviderCatalog.formatTokenLimit(1048576), '1M');
check('262144 renders as 256K',  WFProviderCatalog.formatTokenLimit(262144), '256K');
check('null renders as null',    WFProviderCatalog.formatTokenLimit(null), null);
check('zero renders as null',    WFProviderCatalog.formatTokenLimit(0), null);

check('source labels are human wording, not codes',
  WFProviderCatalog.limitSourceLabel('api'), 'from provider API');
check('observed source label',
  WFProviderCatalog.limitSourceLabel('observed'), 'observed in a real run');
check('table source label',
  WFProviderCatalog.limitSourceLabel('table'), 'from WaxFrame table');

// ── Observed-cap analysis (v3.63.493) ───────────────────────────────
// When a server administrator caps token usage, no declared number reveals
// it — only watching where responses stop. These fixtures pin the part that
// would mislead if it broke: how much a given set of stop points actually
// justifies claiming.

const A = (obs) => WFProviderCatalog.analyzeObservations(obs);

console.log('\u25b6 What a stop point justifies claiming');

check('no observations yield no analysis', A([]), null);
check('null input is safe', A(null), null);

// One truncation is a LOWER BOUND. Claiming it as the cap would be wrong:
// that run may have been cut short for an unrelated reason.
const one = A([{ out: 4096, prompt: 3000 }]);
check('a single run is not treated as a confirmed cap', one.capValue, null);
check('a single run reports a lower bound',             one.lowerBound, 4096);
check('a single run is labelled as one data point',     one.confidence, 'single-datapoint');
check('single-run wording says lower bound, not cap',
  WFProviderCatalog.describeObservations(one).includes('lower bound'), true);

console.log('\u25b6 Telling the kinds of cap apart');

// Output count holds steady while prompt size varies ~20x. Only a
// per-request OUTPUT cap behaves like that — a context limit would have
// squeezed the output down as the prompt grew.
const outCap = A([
  { out: 4096, prompt: 1000 },
  { out: 4090, prompt: 9000 },
  { out: 4096, prompt: 20000 }
]);
check('steady output across varied prompts reads as an output cap', outCap.kind, 'output');
check('output cap value is the clustered figure', outCap.capValue, 4090);
check('three clustered runs read as consistent',   outCap.confidence, 'consistent');
check('output-cap wording names a per-request output cap',
  WFProviderCatalog.describeObservations(outCap).includes('per-request output cap'), true);

// Same evidence, but every prompt was the same size. An output cap and a
// context limit both fit. Picking one would be a guess, so it must not.
const ambiguous = A([
  { out: 4096, prompt: 3000 },
  { out: 4090, prompt: 3050 }
]);
check('identical prompt sizes cannot separate output cap from context limit',
  ambiguous.kind, 'output-or-context');
check('the ambiguity is stated rather than resolved by guessing',
  WFProviderCatalog.describeObservations(ambiguous).includes('not enough variation yet'), true);

// Output falls as the prompt grows, but prompt+output stays put: the shared
// window is what is filling up.
const ctxCap = A([
  { out: 5000, prompt: 3000, total: 8000 },
  { out: 2000, prompt: 6000, total: 8000 },
  { out: 1000, prompt: 7000, total: 8000 }
]);
check('steady prompt+output reads as a context limit', ctxCap.kind, 'context');
check('context limit value is the combined figure',    ctxCap.capValue, 8000);
check('context wording explains that longer prompts leave less room',
  WFProviderCatalog.describeObservations(ctxCap).includes('leaves less room to write'), true);

// Stops that land nowhere in particular. Could be a rate or quota policy.
// Must NOT be reported as a size cap.
const noisy = A([
  { out: 900,  prompt: 3000 },
  { out: 5000, prompt: 3000 },
  { out: 200,  prompt: 3000 }
]);
check('scattered stops are not reported as a cap', noisy.capValue, null);
check('scattered stops are labelled inconclusive',  noisy.kind, 'inconclusive');
check('scattered stops raise the rate/quota possibility',
  WFProviderCatalog.describeObservations(noisy).includes('rate or quota'), true);

console.log('\u25b6 Clustering tolerance');

// 4096 and 8192 are different caps and must never merge into one.
check('4096 and 8192 do not read as the same cap',
  A([{ out: 4096, prompt: 1000 }, { out: 8192, prompt: 9000 }]).kind, 'inconclusive');
// A model stopping a few tokens early is the same cap.
check('small variation still reads as one cap',
  A([{ out: 4096, prompt: 1000 }, { out: 4050, prompt: 9000 }]).kind, 'output');

console.log('\u25b6 Bookkeeping');

const many = A([
  { out: 4096, prompt: 1000, at: '2026-09-01T00:00:00Z' },
  { out: 4096, prompt: 9000, at: '2026-09-02T00:00:00Z' }
]);
check('observation count is reported', many.count, 2);
check('two clustered runs read as likely, not consistent', many.confidence, 'likely');
check('the most recent timestamp is carried', many.lastAt, '2026-09-02T00:00:00Z');
check('runs with no usable token count are ignored',
  A([{ out: 0, prompt: 100 }, { out: null }]), null);
check('varied prompts are flagged so the UI can explain the ambiguity',
  ambiguous.promptsVaried, false);
check('genuinely varied prompts are detected', outCap.promptsVaried, true);

// ── Requested output budget (v3.63.493) ─────────────────────────────
// "Stopped after N tokens" is half an answer. What the request ASKED for is
// the other half: asking for 16K and getting 4K means something clamped us,
// while asking for NOTHING and getting 4K means a server-side default
// filled the gap — which is invisible unless the absence is reported.
const RB = WFProviderCatalog.requestedOutputBudget;

console.log('▶ Reading back what the request asked for');

check('OpenAI shape max_tokens',            RB(JSON.stringify({ max_tokens: 16384 })), 16384);
check('gpt-5 shape max_completion_tokens',  RB(JSON.stringify({ max_completion_tokens: 8192 })), 8192);
check('Gemini generationConfig',            RB(JSON.stringify({ generationConfig: { maxOutputTokens: 65536 } })), 65536);
check('Ollama native options.num_predict',  RB(JSON.stringify({ options: { num_predict: 2048 } })), 2048);

// The case that matters most: WaxFrame's OpenAI-shape body deliberately
// sends no limit, so an Open WebUI admin default silently fills it in. The
// error screen can only say so if "absent" is distinguishable from "zero".
check('no budget specified reads as null (the admin-default case)',
  RB(JSON.stringify({ model: 'gpt-4o', messages: [] })), null);
check('Ollama -1 means unbounded, not a budget',
  RB(JSON.stringify({ options: { num_predict: -1 } })), null);
check('zero is not a budget',    RB(JSON.stringify({ max_tokens: 0 })), null);
check('unparseable body is safe', RB('not json'), null);
check('null body is safe',        RB(null), null);
check('non-string body is safe',  RB({ max_tokens: 100 }), null);

console.log('');
if (fail === 0) {
  console.log(`✅ All ${pass} provider-extractor fixture checks passed.`);
  process.exit(0);
} else {
  console.log(`❌ ${fail} of ${pass + fail} provider-extractor fixture checks failed.`);
  process.exit(1);
}
