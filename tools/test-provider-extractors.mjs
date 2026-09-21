// ============================================================
//  WaxFrame — tools/test-provider-extractors.mjs
// Build: 20260921-003
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

// The catalog is a classic script that publishes onto a root object —
// `window` in a browser, this module's exports under Node. CATALOG_ROOT is
// that root, which is where the body builders look for
// WF_STREAM_THIS_REQUEST, so the streaming fixtures can flip the real switch
// instead of simulating it.
const CATALOG_ROOT = require(path.join(__dirname, '..', 'js', 'provider-catalog.js'));
const { WFProviderCatalog } = CATALOG_ROOT;

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
check('default output budget is well above the old 4096/16384 constants',
  WFProviderCatalog.DEFAULT_OUTPUT_BUDGET >= 32768, true);
// v3.63.494 — the budget now comes from the model, not a constant. With no
// resolver installed (the Node test environment), it must fall back to the
// default rather than to zero or NaN — a zero budget would ask every
// provider for no output at all.
check('with no resolver installed, the default applies',
  WFProviderCatalog.resolveOutputBudget('any-model'), WFProviderCatalog.DEFAULT_OUTPUT_BUDGET);

// ── Model token limits (v3.63.490) ──────────────────────────────────
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

console.log('▶ Model-list entry types (entryLooksChatCapable)');

// v3.63.523 — found by pointing WaxFrame at a live LM Studio. The filter
// required type === 'chat', which LM Studio never sends: it labels models
// "llm" and "vlm". Every LM Studio model was dropped, and since
// /api/v0/models is the ONLY LM Studio endpoint carrying context limits, the
// v3.63.512 support for them could not be reached at all.
const chatCapable = WFProviderCatalog.entryLooksChatCapable;

// Providers that omit `type` entirely must pass through untouched.
check('an entry with no type passes (OpenAI, Mistral, DeepSeek, Ollama)',
  chatCapable({ id: 'gpt-6-astra' }), true);
// Together AI's mixed catalog — the case the original filter was written for.
check("Together's chat type passes", chatCapable({ id: 'x', type: 'chat' }), true);
// LM Studio's real labels, verified live.
check('LM Studio llm passes', chatCapable({ id: 'x', type: 'llm' }), true);
check('LM Studio vlm passes (a vision-language model is still chat-capable)',
  chatCapable({ id: 'x', type: 'vlm' }), true);
check('type casing does not matter', chatCapable({ id: 'x', type: 'LLM' }), true);

// Must still be excluded — these are the reason the filter exists.
check('embeddings excluded', chatCapable({ id: 'x', type: 'embeddings' }), false);
check('embedding excluded', chatCapable({ id: 'x', type: 'embedding' }), false);
check('image excluded', chatCapable({ id: 'x', type: 'image' }), false);
check('audio excluded', chatCapable({ id: 'x', type: 'audio' }), false);
check('moderation excluded', chatCapable({ id: 'x', type: 'moderation' }), false);
check('rerank excluded', chatCapable({ id: 'x', type: 'rerank' }), false);
// Deliberately still excluded: base-completion models make poor reviewers, and
// admitting them is the cost of flipping this to a denylist.
check("Together's language type stays excluded", chatCapable({ id: 'x', type: 'language' }), false);
check("Together's code type stays excluded", chatCapable({ id: 'x', type: 'code' }), false);
check('a null entry is not chat-capable', chatCapable(null), false);

// ── Local-server native shapes (v3.63.512) ────────────────────────────
//
// A self-hosted server is the one case no maintained table can be right
// about, because the ceiling is whatever its operator configured. These are
// the shapes the three servers WaxFrame is tested against actually return.
// Fixture values are invented; the SHAPES are what matters.

// Ollama /api/tags — the Quick-Add Ollama preset already points Models
// Endpoint here, and the context length has been arriving in the response
// and being discarded the whole time.
const ollamaTag = WFProviderCatalog.limitsFromModelEntry('openai-models',
  { name: 'llama3.2:3b', details: { family: 'llama', parameter_size: '3.2B', context_length: 131072 } });
check('Ollama /api/tags details.context_length is read',
  ollamaTag && ollamaTag.context, 131072);

// Ollama /api/show — model_info keys are architecture-prefixed, so the
// architecture must not be guessed at.
check('Ollama model_info architecture-prefixed context_length is read',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { name: 'q', model_info: { 'qwen2.context_length': 32768, 'qwen2.block_count': 36 } }).context, 32768);

// A Modelfile num_ctx is a deliberate operator override and outranks the
// architectural figure. Ollama returns `parameters` as a raw Modelfile
// string, not an object.
const ollamaShow = WFProviderCatalog.limitsFromModelEntry('openai-models',
  { name: 'q', parameters: 'stop "<|im_end|>"\nnum_ctx 8192\ntemperature 0.7',
    model_info: { 'qwen2.context_length': 32768 } });
check('Ollama Modelfile num_ctx leads over the architectural figure',
  ollamaShow && ollamaShow.context, 8192);
check('the architectural figure is kept beside it, not discarded',
  ollamaShow && ollamaShow.contextMax, 32768);

// Open WebUI /api/models embeds the entire raw Ollama object under .ollama.
check('Open WebUI nested ollama.details.context_length is read',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 'llama3.2:3b', name: 'Llama 3.2', ollama: { details: { context_length: 131072 } } }).context, 131072);

// Ollama /api/ps reports the runtime allocation for a LOADED model, which
// is the configured figure, not the architectural one.
check('Ollama /api/ps context_length is treated as the configured window',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { name: 'q', context_length: 16384, details: { context_length: 131072 } }).context, 16384);

// contextMax exists only to name a gap. When the two agree, or when only one
// figure is published, it must be absent rather than a duplicate number.
check('contextMax is absent when configured and architectural agree',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 'q', loaded_context_length: 32768, max_context_length: 32768 }).contextMax, undefined);
check('contextMax is absent when only one figure is published',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 'q', context_length: 8192 }).contextMax, undefined);
// A loaded window ABOVE the reported architectural maximum is not a gap to
// report — it means the architectural figure is the unreliable one.
check('contextMax is absent when the configured window is the larger number',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 'q', loaded_context_length: 32768, max_context_length: 8192 }).contextMax, undefined);

// Open WebUI deliberately withholds per-model limits on some deployments.
// That must stay "unknown", not become a fabricated number.
check('a model entry carrying no limits at all still yields null',
  WFProviderCatalog.limitsFromModelEntry('openai-models',
    { id: 'x', name: 'X', object: 'model', owned_by: 'openwebui' }), null);

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

// ── Observed-cap analysis (v3.63.491) ───────────────────────────────
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

// ── Requested output budget (v3.63.492) ─────────────────────────────
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

// ── Streaming SSE accumulator (v3.63.499) ──────────────────────
// Streaming is the fix for gateway timeouts on long builds, and the parser
// sits directly in the response path: if it drops a frame, a document loses
// text silently. These fixtures pin the cases that actually bite in the wild
// — chunk boundaries landing mid-JSON, keepalive comments, a missing final
// blank line — none of which a happy-path test would catch.
const mkAcc = () => WFProviderCatalog.createOpenAIStreamAccumulator();
// SSE frames are separated by a blank line; built from a char code so the
// fixture text stays readable and cannot be mangled by an editor.
const NL = String.fromCharCode(10);

console.log('\u25b6 Streaming: SSE accumulation');

// The core case: chunk boundaries do not respect frame boundaries.
const split = mkAcc();
split.push('data: {"choices":[{"delta":{"content":"Hel"}}]}' + `${NL}${NL}` + 'data: {"choi');
split.push('ces":[{"delta":{"content":"lo wor"}}]}' + `${NL}${NL}` + ': keepalive' + `${NL}${NL}`);
split.push('data: {"choices":[{"delta":{"content":"ld"},"finish_reason":"stop"}]}' + `${NL}${NL}`);
split.push('data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":3}}' + `${NL}${NL}` + 'data: [DONE]' + `${NL}${NL}`);
const splitOut = split.finish();
check('text reassembles across a chunk split mid-JSON', splitOut.text, 'Hello world');
check('finish_reason survives streaming', splitOut.finishReason, 'stop');
check('usage survives streaming (include_usage)', splitOut.usage.completion_tokens, 3);
check('a keepalive comment line is ignored, not concatenated',
  splitOut.text.indexOf('keepalive'), -1);

// A truncated stream must still carry its evidence, or the error screen
// silently loses the reason.
const trunc = mkAcc();
trunc.push('data: {"choices":[{"delta":{"content":"cut"},"finish_reason":"length"}],"usage":{"completion_tokens":4096}}');
const truncOut = trunc.finish();
check('a stream with no trailing blank line still yields its last frame', truncOut.text, 'cut');
check('truncation finish_reason survives streaming', truncOut.finishReason, 'length');
check('truncation token count survives streaming', truncOut.usage.completion_tokens, 4096);

// The fallback trigger: the endpoint accepted stream:true and sent something
// that is not SSE. sawAnyChunk is what tells callAPI to retry unstreamed.
const notSse = mkAcc();
notSse.push('{"choices":[{"message":{"content":"plain json"}}]}');
check('a non-SSE body yields sawAnyChunk false (the fallback trigger)',
  notSse.finish().sawAnyChunk, false);

const empty = mkAcc();
check('an empty stream is safe', empty.finish().text, '');

// Off-spec servers seen in the wild.
const camel = mkAcc();
camel.push('data: {"choices":[{"delta":{"content":"x"},"finishReason":"length"}]}' + `${NL}${NL}`);
check('camelCase finishReason from off-spec servers is read',
  camel.finish().finishReason, 'length');

// A server that sends a whole message on the final chunk instead of deltas
// must not be double-counted against a compliant delta stream.
const whole = mkAcc();
whole.push('data: {"choices":[{"message":{"content":"whole"}}]}' + `${NL}${NL}`);
check('a whole-message chunk is used when no deltas arrived', whole.finish().text, 'whole');

const both = mkAcc();
both.push('data: {"choices":[{"delta":{"content":"delta"}}]}' + `${NL}${NL}`);
both.push('data: {"choices":[{"message":{"content":"whole"}}]}' + `${NL}${NL}`);
check('a whole-message chunk does NOT double-count after deltas', both.finish().text, 'delta');

console.log('\u25b6 Streaming: which shapes stream');
// v3.63.513 \u2014 all three. Anthropic needed the relay Worker to stop buffering
// the upstream response; Gemini needed the endpoint swap below.
check('OpenAI shape streams', WFProviderCatalog.supportsStreaming('openai'), true);
check('Anthropic shape streams', WFProviderCatalog.supportsStreaming('anthropic'), true);
check('Gemini shape streams', WFProviderCatalog.supportsStreaming('google'), true);

console.log('\u25b6 Streaming: Gemini endpoint swap (streamingEndpoint)');

// Gemini is the only shape where streaming is a different METHOD rather than
// a body flag, and ?alt=sse is not optional: without it the same endpoint
// returns a growing JSON array, which cannot be parsed incrementally.
check('Gemini :generateContent becomes :streamGenerateContent?alt=sse',
  WFProviderCatalog.streamingEndpoint('google',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'),
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse');
check('an endpoint already carrying a query string gets alt=sse appended with &',
  WFProviderCatalog.streamingEndpoint('google',
    'https://example.invalid/v1beta/models/m:generateContent?key=x'),
  'https://example.invalid/v1beta/models/m:streamGenerateContent?key=x&alt=sse');
check('an already-streaming Gemini endpoint is left alone',
  WFProviderCatalog.streamingEndpoint('google',
    'https://example.invalid/v1beta/models/m:streamGenerateContent?alt=sse'),
  'https://example.invalid/v1beta/models/m:streamGenerateContent?alt=sse');
check('the OpenAI shape streams from the same URL',
  WFProviderCatalog.streamingEndpoint('openai', 'https://api.example.invalid/v1/chat/completions'),
  'https://api.example.invalid/v1/chat/completions');
check('the Anthropic shape streams from the same URL',
  WFProviderCatalog.streamingEndpoint('anthropic', 'https://relay.example.invalid/v1/messages'),
  'https://relay.example.invalid/v1/messages');

console.log('\u25b6 Streaming: Anthropic SSE accumulator');

const mkAnt = () => WFProviderCatalog.createAnthropicStreamAccumulator();
const antFrames = (...frames) => {
  const a = mkAnt();
  for (const f of frames) a.push(f + `${NL}${NL}`);
  return a.finish();
};

const antBasic = antFrames(
  'event: message_start' + NL + 'data: {"type":"message_start","message":{"usage":{"input_tokens":25}}}',
  'event: content_block_start' + NL + 'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
  'event: content_block_delta' + NL + 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello "}}',
  'event: content_block_delta' + NL + 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"world"}}',
  'event: message_delta' + NL + 'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":15}}',
  'event: message_stop' + NL + 'data: {"type":"message_stop"}');
check('Anthropic text deltas concatenate', antBasic.text, 'Hello world');
check('Anthropic stop_reason comes off message_delta', antBasic.finishReason, 'end_turn');
check('Anthropic output_tokens is captured', antBasic.usage.output_tokens, 15);
check('Anthropic input_tokens from message_start survives the message_delta merge',
  antBasic.usage.input_tokens, 25);

// The v3.63.410 lesson, applied to the streaming path before it can bite:
// an extended-thinking model emits thinking_delta events ahead of the real
// answer. Folding those into the text pastes the model's reasoning into the
// user's document.
const antThinking = antFrames(
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"let me consider"}}',
  'data: {"type":"content_block_start","index":1,"content_block":{"type":"text"}}',
  'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"the real answer"}}');
check('Anthropic thinking deltas are excluded from the text',
  antThinking.text, 'the real answer');

// A server that omits delta.type must still be readable; fall back to the
// block type opened by content_block_start.
check('Anthropic falls back to the block type when the delta omits its own',
  antFrames(
    'data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
    'data: {"type":"content_block_delta","index":0,"delta":{"text":"typeless"}}').text,
  'typeless');
check('a thinking block with a typeless delta is still excluded',
  antFrames(
    'data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}',
    'data: {"type":"content_block_delta","index":0,"delta":{"text":"reasoning"}}').text,
  '');

check('Anthropic truncation arrives as stop_reason max_tokens',
  antFrames('data: {"type":"message_delta","delta":{"stop_reason":"max_tokens"},"usage":{"output_tokens":4096}}').finishReason,
  'max_tokens');

// Split mid-frame: the reader hands over whatever bytes arrived, which is
// routinely half a frame.
const antSplit = mkAnt();
antSplit.push('data: {"type":"content_block_delta","index":0,"delta":{"type":"text_de');
antSplit.push('lta","text":"split across reads"}}' + `${NL}${NL}`);
check('Anthropic frames split across reads reassemble', antSplit.finish().text, 'split across reads');

// A ping event carries no useful payload but must not break the stream.
check('Anthropic ping events are harmless',
  antFrames('event: ping' + NL + 'data: {"type":"ping"}',
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"after ping"}}').text,
  'after ping');

check('an Anthropic stream that carried nothing parseable reports sawAnyChunk false',
  mkAnt().finish().sawAnyChunk, false);

console.log('\u25b6 Streaming: Gemini SSE accumulator');

const mkGem = () => WFProviderCatalog.createGeminiStreamAccumulator();
const gemFrames = (...frames) => {
  const a = mkGem();
  for (const f of frames) a.push(f + `${NL}${NL}`);
  return a.finish();
};

const gemBasic = gemFrames(
  'data: {"candidates":[{"content":{"parts":[{"text":"Hello "}],"role":"model"},"index":0}]}',
  'data: {"candidates":[{"content":{"parts":[{"text":"world"}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":12,"candidatesTokenCount":34,"totalTokenCount":46}}');
check('Gemini text parts concatenate', gemBasic.text, 'Hello world');
check('Gemini finishReason is captured', gemBasic.finishReason, 'STOP');
check('Gemini usageMetadata is captured', gemBasic.usage.candidatesTokenCount, 34);

check('Gemini thought parts are excluded from the text',
  gemFrames('data: {"candidates":[{"content":{"parts":[{"thought":true,"text":"reasoning"},{"text":"answer"}]}}]}').text,
  'answer');

check('Gemini truncation arrives as finishReason MAX_TOKENS',
  gemFrames('data: {"candidates":[{"content":{"parts":[{"text":"cut"}]},"finishReason":"MAX_TOKENS"}]}').finishReason,
  'MAX_TOKENS');

const gemSplit = mkGem();
gemSplit.push('data: {"candidates":[{"content":{"parts":[{"text":"split ac');
gemSplit.push('ross reads"}]}}]}' + `${NL}${NL}`);
check('Gemini frames split across reads reassemble', gemSplit.finish().text, 'split across reads');

check('a Gemini stream that carried nothing parseable reports sawAnyChunk false',
  mkGem().finish().sawAnyChunk, false);

console.log('\u25b6 Streaming: streamed responses are rewrapped in each provider shape');

// Everything downstream \u2014 the text extractors, the finish-reason coalescer,
// truncation detection, usage capture, the Deep Dive ring buffer \u2014 reads the
// provider's own response shape. A streamed round must hand back exactly
// what a non-streamed one would, or every one of those has to learn a second
// shape.
const antShape = WFProviderCatalog.streamedResponseShape('anthropic',
  { text: 'streamed answer', finishReason: 'end_turn', usage: { output_tokens: 9 } });
check('a streamed Anthropic response reads back through the normal extractor',
  WFProviderCatalog.extractAnthropicText(antShape), 'streamed answer');
check('a streamed Anthropic finish reason reads back through the coalescer',
  WFProviderCatalog.extractFinishReason(antShape), 'end_turn');

const gemShape = WFProviderCatalog.streamedResponseShape('google',
  { text: 'streamed answer', finishReason: 'MAX_TOKENS', usage: { candidatesTokenCount: 9 } });
check('a streamed Gemini response reads back through the normal extractor',
  WFProviderCatalog.extractGeminiText(gemShape), 'streamed answer');
check('a streamed Gemini finish reason reads back through the coalescer',
  WFProviderCatalog.extractFinishReason(gemShape), 'MAX_TOKENS');
check('a streamed Gemini MAX_TOKENS still trips truncation detection',
  WFProviderCatalog.isTruncationSignal(WFProviderCatalog.extractFinishReason(gemShape)), true);

const oaiShape = WFProviderCatalog.streamedResponseShape('openai',
  { text: 'streamed answer', finishReason: 'stop', usage: { completion_tokens: 9 } });
check('a streamed OpenAI response reads back through the normal extractor',
  WFProviderCatalog.extractOpenAIText(oaiShape), 'streamed answer');
check('every streamed shape is flagged as streamed',
  [antShape, gemShape, oaiShape].every(s => s._wfStreamed === true), true);

check('output-token count is read from the right field per provider \u2014 Anthropic',
  WFProviderCatalog.streamedOutputTokens('anthropic', { output_tokens: 11 }), 11);
check('output-token count is read from the right field per provider \u2014 Gemini',
  WFProviderCatalog.streamedOutputTokens('google', { candidatesTokenCount: 12 }), 12);
check('output-token count is read from the right field per provider \u2014 OpenAI',
  WFProviderCatalog.streamedOutputTokens('openai', { completion_tokens: 13 }), 13);
check('no usage means no token count rather than a zero',
  WFProviderCatalog.streamedOutputTokens('openai', null), null);

const CONFIGS_FOR_BUDGET = WFProviderCatalog.buildApiConfigs();
const ENVELOPE_FOR_BUDGET = 'the document body\n\n\u26a0\ufe0f BUILDER: build instructions here';

console.log('\u25b6 Rejected parameter NAMES (parseParamRename)');

// v3.63.516 \u2014 live failure on gpt-6-astra: the newer OpenAI models refuse
// max_tokens outright and name the replacement. Surfacing that as an error
// card threw away an answer the provider had already given us.
check('the exact live OpenAI wording yields the replacement key',
  JSON.stringify(WFProviderCatalog.parseParamRename(
    "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.")),
  JSON.stringify({ from: 'max_tokens', to: 'max_completion_tokens' }));
check('double-quoted variant parses too',
  JSON.stringify(WFProviderCatalog.parseParamRename(
    'Unsupported parameter: "max_tokens" is not supported with this model. Use "max_completion_tokens" instead.')),
  JSON.stringify({ from: 'max_tokens', to: 'max_completion_tokens' }));
check('the phrasing without the "Unsupported parameter" prefix parses too',
  JSON.stringify(WFProviderCatalog.parseParamRename(
    "'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.")),
  JSON.stringify({ from: 'max_tokens', to: 'max_completion_tokens' }));

// Must NOT fire \u2014 these belong to other recovery paths or to nothing.
check('a budget-VALUE rejection is not a rename', WFProviderCatalog.parseParamRename(
  'max_tokens is too large: 32768. This model supports at most 4096 completion tokens.'), null);
check('an unrelated error is not a rename',
  WFProviderCatalog.parseParamRename('You exceeded your current quota'), null);
check('null input is handled', WFProviderCatalog.parseParamRename(null), null);
check('a message naming the same parameter twice is not a rename',
  WFProviderCatalog.parseParamRename(
    "Unsupported parameter: 'max_tokens'. Use 'max_tokens' instead."), null);

console.log('\u25b6 Output budget: a null budget means OMIT, not a default');

// The reject-and-learn retry has a case where the provider refuses the budget
// without naming a ceiling. Before v3.63.516 that set the override to 0, which
// fell through to the 32768 default \u2014 so the retry re-sent the identical
// request and failed identically. The recovery path was a no-op.
CATALOG_ROOT.WF_OUTPUT_BUDGET_OVERRIDE = 0;
const omitOAI = JSON.parse(CONFIGS_FOR_BUDGET.chatgpt.bodyFn('m', ENVELOPE_FOR_BUDGET));
const omitGem = JSON.parse(CONFIGS_FOR_BUDGET.gemini.bodyFn('m', ENVELOPE_FOR_BUDGET));
const omitAnt = JSON.parse(CONFIGS_FOR_BUDGET.claude.bodyFn('m', ENVELOPE_FOR_BUDGET));
CATALOG_ROOT.WF_OUTPUT_BUDGET_OVERRIDE = null;
const clearedOAI = JSON.parse(CONFIGS_FOR_BUDGET.chatgpt.bodyFn('m', ENVELOPE_FOR_BUDGET));

check('an omit override drops max_tokens from the OpenAI body', omitOAI.max_tokens, undefined);
check('an omit override drops max_completion_tokens too', omitOAI.max_completion_tokens, undefined);
check('an omit override drops generationConfig from the Gemini body', omitGem.generationConfig, undefined);
// Anthropic REQUIRES max_tokens \u2014 omitting it would make every Claude call a 400.
check('Anthropic still states max_tokens when the budget is omitted', omitAnt.max_tokens, 32768);
// Clearing the hook with null (not 0) must restore normal behaviour \u2014 the cap
// probe clears it in a finally block, and clearing with 0 would have left every
// later request with no budget at all.
check('clearing the override with null restores the budget', clearedOAI.max_tokens, 32768);

console.log('\u25b6 Streaming: request bodies carry the flag only when asked');

// The body builders read WF_STREAM_THIS_REQUEST off the module root, which is
// `window` in the browser and this module's own exports under Node \u2014 so the
// real switch can be flipped here rather than simulated.
const CONFIGS = WFProviderCatalog.buildApiConfigs();
const ENVELOPE = 'the document body\n\n\u26a0\ufe0f BUILDER: build instructions here';

const antBodyPlain = JSON.parse(CONFIGS.claude.bodyFn('claude-sonnet-4-6', ENVELOPE));
check('the Anthropic body has no stream flag by default', antBodyPlain.stream, undefined);

CATALOG_ROOT.WF_STREAM_THIS_REQUEST = true;
const antBodyStream = JSON.parse(CONFIGS.claude.bodyFn('claude-sonnet-4-6', ENVELOPE));
const gemBodyStream = JSON.parse(CONFIGS.gemini.bodyFn('gemini-3.5-flash', ENVELOPE));
const oaiBodyStream = JSON.parse(CONFIGS.chatgpt.bodyFn('gpt-5.6-sol', ENVELOPE));
CATALOG_ROOT.WF_STREAM_THIS_REQUEST = false;

check('the Anthropic body carries stream:true when streaming', antBodyStream.stream, true);
check('the Anthropic system prompt is unchanged by streaming',
  antBodyStream.system, antBodyPlain.system);
check('the Anthropic max_tokens is unchanged by streaming',
  antBodyStream.max_tokens, antBodyPlain.max_tokens);
// Gemini has no body flag at all \u2014 streaming there is an endpoint swap, and
// sending an unknown field would be a request Google rejects.
check('the Gemini body carries no stream flag', gemBodyStream.stream, undefined);
check('the OpenAI body still carries stream:true', oaiBodyStream.stream, true);
check('the OpenAI body still asks for usage on the stream',
  oaiBodyStream.stream_options && oaiBodyStream.stream_options.include_usage, true);

const antBodyAfter = JSON.parse(CONFIGS.claude.bodyFn('claude-sonnet-4-6', ENVELOPE));
check('the flag does not leak into the next request', antBodyAfter.stream, undefined);

console.log('');
if (fail === 0) {
  console.log(`✅ All ${pass} provider-extractor fixture checks passed.`);
  process.exit(0);
} else {
  console.log(`❌ ${fail} of ${pass + fail} provider-extractor fixture checks failed.`);
  process.exit(1);
}
