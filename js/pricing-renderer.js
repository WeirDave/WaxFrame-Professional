// ============================================================
//  WaxFrame — pricing-renderer.js
// Build: 20260802-001
//  Dynamic pricing renderer for ai-api-pricing.html. Fetches
//  live data from the waxframe-pricing Cloudflare Worker;
//  falls back to the embedded snapshot if the Worker is
//  unreachable. Extracted from the formerly-inline <script>
//  block in v3.63.352 so the page can drop 'unsafe-inline'.
//
//  v3.63.437 — schema v3: each provider carries a `models[]` array (every
//  model WaxFrame curates for that provider in js/provider-catalog.js, not
//  just the default) plus a `defaultModel` pointer into it. The Defaults
//  table below reads exactly the fields it always has by looking up
//  defaultModel in models[] — same visible experience as schema v2. A new
//  "All tracked models" section renders every row, including models with
//  no verified price yet (status needs-verification) or that aren't
//  API-priceable at all (status unsupported, e.g. Copilot).
//
//  FALLBACK_DATA is generated FROM tools/pricing-worker/data/pricing-seed.json
//  by tools/generate-pricing-fallback.mjs — do not hand-edit the literal
//  below; run that script instead. This is what closed the old dual-
//  maintenance drift risk (this comment used to say "refresh in lockstep
//  by hand," which is exactly the kind of instruction that eventually
//  doesn't happen).
// ============================================================

(function(){
  'use strict';

  var PRICING_API = 'https://waxframe-pricing.weirdave.workers.dev/api/pricing';

  // GENERATED — do not hand-edit. Run: node tools/generate-pricing-fallback.mjs
  var FALLBACK_DATA = /*__FALLBACK_DATA__*/{"lastUpdated":"2026-08-02T00:00:00Z","schemaVersion":3,"tokensPerRound":{"input":5000,"output":2000},"providers":[{"id":"gemini-free","name":"Gemini (Google) — free tier","shortName":"Gemini Flash (free tier)","defaultModel":"gemini-3.5-flash","billingUrl":"https://aistudio.google.com/api-keys","tier1Rpm":"15","tier1Tpm":"—","freeTier":"1500 RPD","rateLimitNotes":"Free while billing disabled. Daily quota resets at midnight Pacific.","recommendationTag":"cheapest","recommendationNote":"Free while AI Studio billing is disabled. 1M-token context window, 1500 requests/day quota, synthesizes Builder output reliably. Catch: enable billing on AI Studio and routing can quietly flip to paid tier on the same model name.","models":[{"id":"gemini-3.5-flash","inputPerM":0,"outputPerM":0,"contextWindow":"1M","maxOutput":"8K","estPerRound":0,"estNote":"free while AI Studio billing is disabled","sourceUrl":"https://aistudio.google.com/api-keys","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"gemini-3.1-pro","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"gemini-3.1-flash-lite","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"gemini-paid","name":"Gemini (Google) — paid","shortName":"Gemini Flash (paid)","defaultModel":"gemini-3.5-flash","billingUrl":"https://aistudio.google.com/api-keys","tier1Rpm":"2K","tier1Tpm":"4M","freeTier":"n/a","rateLimitNotes":"Paid-tier limits are very generous; cost discipline matters more than RPM.","recommendationTag":null,"recommendationNote":null,"models":[{"id":"gemini-3.5-flash","inputPerM":0.075,"outputPerM":0.3,"contextWindow":"1M","maxOutput":"8K","estPerRound":0.001,"estNote":null,"sourceUrl":"https://aistudio.google.com/api-keys","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"gemini-3.1-pro","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"gemini-3.1-flash-lite","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"grok","name":"Grok (xAI)","shortName":"Grok","defaultModel":"grok-4.1-fast","billingUrl":"https://console.x.ai","tier1Rpm":"~60","tier1Tpm":"varies","freeTier":"Limited","rateLimitNotes":"API availability and quotas vary; check console for current tier.","recommendationTag":null,"recommendationNote":null,"models":[{"id":"grok-4.1-fast","inputPerM":0.2,"outputPerM":0.5,"contextWindow":"256K","maxOutput":"8K","estPerRound":0.002,"estNote":null,"sourceUrl":"https://console.x.ai","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"grok-4.3","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"grok-4.20-reasoning","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"deepseek","name":"DeepSeek","shortName":"DeepSeek","defaultModel":"deepseek-v4-flash","billingUrl":"https://platform.deepseek.com/top_up","tier1Rpm":"~60","tier1Tpm":"varies","freeTier":"None","rateLimitNotes":"Cheapest paid option, but consistently the slowest responder in the hive (60–90s/round).","recommendationTag":"cheapest","recommendationNote":"Cheapest reliable paid Builder — roughly 10x cheaper per token than Claude or ChatGPT. Caveat: consistently the slowest responder in the hive, often 60–90 seconds per round. If you don't mind the wait, it's the best value.","models":[{"id":"deepseek-v4-flash","inputPerM":0.14,"outputPerM":0.28,"contextWindow":"1M","maxOutput":"384K","estPerRound":0.001,"estNote":null,"sourceUrl":"https://platform.deepseek.com/top_up","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"deepseek-v4-pro","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"together","name":"Together AI","shortName":"Together AI","defaultModel":"meta-llama/Llama-3.3-70B-Instruct-Turbo","billingUrl":"https://api.together.ai/settings/organization/~current/billing","tier1Rpm":"~600","tier1Tpm":"varies","freeTier":"Trial credits","rateLimitNotes":"Open-weight model gateway; generous limits, not yet hive-tested in production.","recommendationTag":null,"recommendationNote":null,"models":[{"id":"meta-llama/Llama-3.3-70B-Instruct-Turbo","inputPerM":0.88,"outputPerM":0.88,"contextWindow":"128K","maxOutput":"4K","estPerRound":0.006,"estNote":null,"sourceUrl":"https://api.together.ai/settings/organization/~current/billing","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"Qwen/Qwen2.5-72B-Instruct-Turbo","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"mistralai/Mixtral-8x7B-Instruct-v0.1","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"mistral","name":"Mistral","shortName":"Mistral","defaultModel":"mistral-large-latest","billingUrl":"https://admin.mistral.ai/organization/billing","tier1Rpm":"~30","tier1Tpm":"varies","freeTier":"Trial credits","rateLimitNotes":"Low RPS on paid Tier 1. A parallel 6-bee hive can trigger 429 even with token budget remaining. Contact Mistral support for tier raise.","recommendationTag":"balanced","recommendationNote":"Similar territory to ChatGPT — fast, reliable, with a distinct European model lineage that adds genuine diversity to the hive. Watch the low Tier 1 RPM on paid accounts.","models":[{"id":"mistral-large-latest","inputPerM":2,"outputPerM":6,"contextWindow":"128K","maxOutput":"8K","estPerRound":0.022,"estNote":null,"sourceUrl":"https://admin.mistral.ai/organization/billing","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"mistral-small-latest","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"ministral-8b-latest","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"chatgpt","name":"ChatGPT (OpenAI)","shortName":"ChatGPT","defaultModel":"gpt-5.5","billingUrl":"https://platform.openai.com/settings/organization/billing/overview","tier1Rpm":"500","tier1Tpm":"30K","freeTier":"None","rateLimitNotes":"Tiers scale with usage history; $5 credit unlocks most user needs.","recommendationTag":"balanced","recommendationNote":"Strong all-rounder — fast, reliable formatting compliance, consistent convergence behavior. A good default for long-form documents where Builder speed matters.","models":[{"id":"gpt-5.5","inputPerM":5,"outputPerM":30,"contextWindow":"1M","maxOutput":"32K","estPerRound":0.085,"estNote":null,"sourceUrl":"https://platform.openai.com/settings/organization/billing/overview","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"gpt-5.6-sol","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"gpt-5.6-terra","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"gpt-5.6-luna","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"gpt-5.4","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"gpt-5.4-mini","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"gpt-5.4-nano","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"cohere","name":"Cohere","shortName":"Cohere","defaultModel":"command-r-plus","billingUrl":"https://dashboard.cohere.com/billing","tier1Rpm":"~100","tier1Tpm":"varies","freeTier":"Trial credits","rateLimitNotes":"Generous trial credits; not yet hive-tested in production.","recommendationTag":null,"recommendationNote":null,"models":[{"id":"command-r-plus","inputPerM":2.5,"outputPerM":10,"contextWindow":"128K","maxOutput":"4K","estPerRound":0.033,"estNote":null,"sourceUrl":"https://dashboard.cohere.com/billing","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"command-r","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"command-a-03-2025","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"claude","name":"Claude (Anthropic)","shortName":"Claude","defaultModel":"claude-sonnet-4-6","billingUrl":"https://platform.claude.com/settings/billing","tier1Rpm":"50","tier1Tpm":"50K","freeTier":"None","rateLimitNotes":"Tiers progress automatically with paid spend over time.","recommendationTag":"highest-capability","recommendationNote":"Frequently the best at nuanced voice, precise instruction-following, and detailed reasoning on complex documents. For high-stakes documents (RFP responses, executive summaries, board memos), the premium pays off in fewer rounds to converge.","models":[{"id":"claude-sonnet-4-6","inputPerM":3,"outputPerM":15,"contextWindow":"1M","maxOutput":"8K","estPerRound":0.045,"estNote":null,"sourceUrl":"https://platform.claude.com/settings/billing","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"claude-opus-4-8","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"claude-opus-4-7","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"claude-opus-4-6","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"claude-haiku-4-5","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"perplexity","name":"Perplexity","shortName":"Perplexity","defaultModel":"sonar-pro","billingUrl":"https://console.perplexity.ai","tier1Rpm":"~50","tier1Tpm":"varies","freeTier":"None","rateLimitNotes":"$5/month recurring subscription tier (enable auto-pay at signup) covers most usage; $50/month otherwise.","recommendationTag":null,"recommendationNote":null,"models":[{"id":"sonar","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"sonar-pro","inputPerM":3,"outputPerM":15,"contextWindow":"200K","maxOutput":"8K","estPerRound":0.045,"estNote":null,"sourceUrl":"https://console.perplexity.ai","verifiedAt":"2026-08-01T19:25:30Z","status":"verified"},{"id":"sonar-reasoning","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"sonar-reasoning-pro","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"},{"id":"sonar-deep-research","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"needs-verification"}]},{"id":"copilot","name":"Microsoft (Copilot)","shortName":"Copilot","defaultModel":null,"billingUrl":null,"tier1Rpm":null,"tier1Tpm":null,"freeTier":null,"rateLimitNotes":"Copilot API is not available for personal Microsoft 365 accounts — no per-token pricing to track. Use Copilot in free/manual mode.","recommendationTag":null,"recommendationNote":null,"models":[{"id":"gpt-4o","inputPerM":null,"outputPerM":null,"contextWindow":null,"maxOutput":null,"estPerRound":null,"estNote":null,"sourceUrl":null,"verifiedAt":null,"status":"unsupported"}]}]}/*__END_FALLBACK_DATA__*/;

  var STATUS_LABELS = {
    'verified': 'Verified',
    'needs-verification': 'Needs verification',
    'unsupported': 'Unsupported'
  };

  var currentData = null;
  var sortColumn = 'estPerRound';
  var sortDir = 'asc';
  var allModelsFilters = { provider: '', status: '', search: '' };

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // "1M" -> 1000000, "256K" -> 256000, "8K" -> 8000, "—" / "varies" / "n/a" -> NaN
  function normalizeKMG(v) {
    if (v == null) return NaN;
    var s = String(v).trim();
    if (s === '' || s === '—' || /^(varies|n\/a|none|limited|trial credits)$/i.test(s)) return NaN;
    var m = s.match(/^~?\s*([0-9]*\.?[0-9]+)\s*([KMGB]?)$/i);
    if (!m) return NaN;
    var n = parseFloat(m[1]);
    var suffix = m[2].toUpperCase();
    if (suffix === 'K') n *= 1e3;
    else if (suffix === 'M') n *= 1e6;
    else if (suffix === 'G' || suffix === 'B') n *= 1e9;
    return n;
  }

  // ── getDefaultRows ──────────────────────────────────────────────
  // Flattens each provider's defaultModel lookup into the same flat shape
  // schema v2 used to hand renderPricingTable/renderBuilderPicks directly
  // (model/inputPerM/outputPerM/contextWindow/maxOutput/estPerRound/estNote
  // merged with the provider-level fields). Keeps those two render
  // functions — and their sort/compare helpers — completely unchanged by
  // the v3 models[] restructuring. A provider with no defaultModel
  // (Copilot: API unavailable, nothing to default to) or whose default
  // model has no verified price is simply absent from the Defaults table —
  // it still exists in "All tracked models" below.
  function getDefaultRows() {
    if (!currentData || !Array.isArray(currentData.providers)) return [];
    var rows = [];
    currentData.providers.forEach(function(p) {
      if (!p.defaultModel) return;
      var m = (p.models || []).filter(function(x) { return x.id === p.defaultModel; })[0];
      if (!m || typeof m.inputPerM !== 'number' || typeof m.outputPerM !== 'number') return;
      rows.push({
        id: p.id, name: p.name, shortName: p.shortName,
        model: m.id, inputPerM: m.inputPerM, outputPerM: m.outputPerM,
        contextWindow: m.contextWindow, maxOutput: m.maxOutput,
        estPerRound: m.estPerRound, estNote: m.estNote,
        billingUrl: p.billingUrl, tier1Rpm: p.tier1Rpm, tier1Tpm: p.tier1Tpm,
        freeTier: p.freeTier, rateLimitNotes: p.rateLimitNotes,
        recommendationTag: p.recommendationTag, recommendationNote: p.recommendationNote
      });
    });
    return rows;
  }

  function sortKey(provider, col) {
    var v = provider[col];
    // Numeric columns first
    if (col === 'inputPerM' || col === 'outputPerM' || col === 'estPerRound') {
      return typeof v === 'number' ? v : NaN;
    }
    if (col === 'contextWindow' || col === 'maxOutput' || col === 'tier1Rpm' || col === 'tier1Tpm') {
      return normalizeKMG(v);
    }
    // String columns
    return String(v == null ? '' : v).toLowerCase();
  }

  function compareProviders(a, b, col, dir) {
    var av = sortKey(a, col);
    var bv = sortKey(b, col);
    var cmp;
    // NaN goes to the bottom regardless of direction
    var aNaN = typeof av === 'number' && isNaN(av);
    var bNaN = typeof bv === 'number' && isNaN(bv);
    if (aNaN && bNaN) cmp = 0;
    else if (aNaN) return 1;
    else if (bNaN) return -1;
    else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  }

  function renderPricingTable() {
    var tbody = document.getElementById('pricingBody');
    if (!tbody || !currentData) return;
    var rows = getDefaultRows().sort(function(a, b) {
      return compareProviders(a, b, sortColumn, sortDir);
    });
    var html = rows.map(function(p) {
      var est = '$' + Number(p.estPerRound).toFixed(3);
      if (p.estNote) est += '<span title="' + escapeHtml(p.estNote) + '">*</span>';
      return '<tr>' +
        '<td data-label="Provider"><strong>' + escapeHtml(p.name) + '</strong></td>' +
        '<td data-label="Default model"><code>' + escapeHtml(p.model) + '</code></td>' +
        '<td data-label="Input $/M">$' + Number(p.inputPerM).toFixed(2) + '</td>' +
        '<td data-label="Output $/M">$' + Number(p.outputPerM).toFixed(2) + '</td>' +
        '<td data-label="Context">' + escapeHtml(p.contextWindow) + '</td>' +
        '<td data-label="Max output">' + escapeHtml(p.maxOutput) + '</td>' +
        '<td data-label="Est. $/round">' + est + '</td>' +
        '<td data-label="Billing"><a href="' + escapeHtml(p.billingUrl) + '" target="_blank" rel="noopener noreferrer" class="token-billing-link external-link">Check rates<svg class="external-link-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"></path><path d="M5 5h6v2H7v10h10v-4h2v6H5V5z"></path></svg><span class="sr-only">(opens in a new tab)</span></a></td>' +
      '</tr>';
    }).join('');
    tbody.innerHTML = html;
    updateSortIndicators();
  }

  function renderRateLimitsTable() {
    var tbody = document.getElementById('rateLimitsBody');
    if (!tbody || !currentData) return;
    var html = currentData.providers.map(function(p) {
      return '<tr>' +
        '<td data-label="Provider"><strong>' + escapeHtml(p.name) + '</strong></td>' +
        '<td data-label="Tier 1 RPM">' + escapeHtml(p.tier1Rpm == null ? '—' : p.tier1Rpm) + '</td>' +
        '<td data-label="Tier 1 TPM">' + escapeHtml(p.tier1Tpm == null ? '—' : p.tier1Tpm) + '</td>' +
        '<td data-label="Free tier">' + escapeHtml(p.freeTier == null ? '—' : p.freeTier) + '</td>' +
        '<td data-label="Notes">' + escapeHtml(p.rateLimitNotes == null ? '' : p.rateLimitNotes) + '</td>' +
      '</tr>';
    }).join('');
    tbody.innerHTML = html;
  }

  function updateSortIndicators() {
    var headers = document.querySelectorAll('.pricing-sortable');
    for (var i = 0; i < headers.length; i++) {
      var th = headers[i];
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.getAttribute('data-sort') === sortColumn) {
        th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    }
  }

  // Maps US daylight/standard timezone abbreviations to their umbrella
  // ("Pacific Time" / "Eastern Time" / etc.) form. Sidesteps the
  // PDT-vs-PST mental friction — readers familiar with their own
  // wallclock time don't care which side of the November cutover the
  // date falls on, they just want "PT". International zones (BST, JST,
  // GMT, AKST/AKDT, HST, etc.) intentionally stay as-is — their
  // abbreviations don't have the same daylight/standard ambiguity.
  var US_TIMEZONE_UMBRELLA = {
    'PDT': 'PT', 'PST': 'PT',
    'EDT': 'ET', 'EST': 'ET',
    'CDT': 'CT', 'CST': 'CT',
    'MDT': 'MT', 'MST': 'MT'
  };

  // Format the lastUpdated value for display in the visitor's local time.
  // Accepts ISO datetime ("2026-06-04T00:58:02Z") or legacy date-only
  // ("2026-06-03") strings. Uses Intl.DateTimeFormat with the browser's
  // default locale + timezone so each visitor sees the timestamp in
  // wallclock time they recognize. US DST/standard pairs are collapsed
  // into the umbrella abbreviation (PDT/PST → PT, EDT/EST → ET, etc.)
  // before display.
  // Example outputs (same UTC moment in different timezones):
  //   US Pacific:   "Jun 3, 2026, 5:58 PM PT"
  //   US Eastern:   "Jun 3, 2026, 8:58 PM ET"
  //   UK:           "4 Jun 2026, 01:58 BST"
  function formatLastUpdatedLocal(iso) {
    if (!iso) return 'unknown';
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso; // date-only fallback
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    try {
      var formatted = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(d);
      return formatted.replace(/\b(PDT|PST|EDT|EST|CDT|CST|MDT|MST)\b/, function(m) {
        return US_TIMEZONE_UMBRELLA[m];
      });
    } catch (e) {
      // Fallback for older browsers that don't support timeZoneName: 'short'
      return d.toLocaleString();
    }
  }

  // UTC-formatted version for the hover tooltip — keeps the unambiguous
  // global timestamp available for technical users without cluttering the
  // visible text.
  function formatLastUpdatedUtc(iso) {
    if (!iso) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
      ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
  }

  function setLastUpdated(stamp) {
    var el = document.getElementById('lastUpdatedStamp');
    if (!el || !stamp) return;
    el.textContent = formatLastUpdatedLocal(stamp);
    // Hover tooltip surfaces UTC for visitors who want the unambiguous moment.
    var utc = formatLastUpdatedUtc(stamp);
    if (utc) el.title = 'UTC: ' + utc;
  }

  function renderBuilderPicks() {
    if (!currentData) return;
    var tags = [
      { tag:'cheapest',           namesEl:'pickCheapestNames',   bodyEl:'pickCheapestBody' },
      { tag:'balanced',           namesEl:'pickBalancedNames',   bodyEl:'pickBalancedBody' },
      { tag:'highest-capability', namesEl:'pickCapabilityNames', bodyEl:'pickCapabilityBody' }
    ];
    tags.forEach(function(t) {
      var picks = getDefaultRows().filter(function(p) { return p.recommendationTag === t.tag; });
      picks.sort(function(a, b) { return (a.estPerRound || 0) - (b.estPerRound || 0); });
      var names = document.getElementById(t.namesEl);
      var body = document.getElementById(t.bodyEl);
      if (names) {
        names.textContent = picks.length
          ? picks.map(function(p) { return p.shortName || p.name; }).join(' or ')
          : '(none configured)';
      }
      if (body) {
        body.innerHTML = picks.map(function(p) {
          var label = p.shortName || p.name;
          var price;
          if (p.estPerRound > 0) {
            price = ' at about $' + Number(p.estPerRound).toFixed(3) + '/round';
          } else if (p.estPerRound === 0 && p.estNote) {
            price = ' (' + escapeHtml(p.estNote) + ')';
          } else {
            price = '';
          }
          var note = p.recommendationNote ? ' — ' + escapeHtml(p.recommendationNote) : '';
          return '<p><strong>' + escapeHtml(label) + '</strong>' + price + note + '</p>';
        }).join('');
      }
    });
  }

  // ── "All tracked models" section ────────────────────────────────
  // Flattens every provider's models[] into one row-per-model list
  // (unlike getDefaultRows, this deliberately INCLUDES rows with no
  // price yet — that's the whole point of the section: nothing curated
  // in js/provider-catalog.js is silently absent from the pricing page).

  function getAllModelRows() {
    if (!currentData || !Array.isArray(currentData.providers)) return [];
    var rows = [];
    currentData.providers.forEach(function(p) {
      (p.models || []).forEach(function(m) {
        rows.push({
          providerId: p.id, providerName: p.name,
          modelId: m.id, inputPerM: m.inputPerM, outputPerM: m.outputPerM,
          contextWindow: m.contextWindow, maxOutput: m.maxOutput,
          sourceUrl: m.sourceUrl, verifiedAt: m.verifiedAt,
          status: m.status || 'needs-verification'
        });
      });
    });
    return rows;
  }

  function populateProviderFilterOptions() {
    var sel = document.getElementById('allModelsProviderFilter');
    if (!sel || !currentData) return;
    var providers = currentData.providers.slice().sort(function(a, b) {
      return String(a.name).localeCompare(String(b.name));
    });
    var html = '<option value="">All providers</option>' + providers.map(function(p) {
      return '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.name) + '</option>';
    }).join('');
    sel.innerHTML = html;
  }

  function formatVerifiedDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  function renderAllModelsTable() {
    var tbody = document.getElementById('allModelsBody');
    var countEl = document.getElementById('allModelsCount');
    var emptyEl = document.getElementById('allModelsEmpty');
    if (!tbody || !currentData) return;

    var rows = getAllModelRows().filter(function(r) {
      if (allModelsFilters.provider && r.providerId !== allModelsFilters.provider) return false;
      if (allModelsFilters.status && r.status !== allModelsFilters.status) return false;
      if (allModelsFilters.search) {
        var q = allModelsFilters.search.toLowerCase();
        var hay = (r.providerName + ' ' + r.modelId).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function(a, b) {
      var byProvider = String(a.providerName).localeCompare(String(b.providerName));
      return byProvider !== 0 ? byProvider : String(a.modelId).localeCompare(String(b.modelId));
    });

    if (countEl) countEl.textContent = '(' + getAllModelRows().length + ')';

    if (!rows.length) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    tbody.innerHTML = rows.map(function(r) {
      var hasPrice = typeof r.inputPerM === 'number' && typeof r.outputPerM === 'number';
      var statusLabel = STATUS_LABELS[r.status] || r.status;
      var pillClass = 'status-pill status-pill-' + r.status;
      var sourceCell = r.sourceUrl
        ? '<a href="' + escapeHtml(r.sourceUrl) + '" target="_blank" rel="noopener noreferrer" class="link-accent">source</a>'
        : '—';
      return '<tr>' +
        '<td data-label="Provider">' + escapeHtml(r.providerName) + '</td>' +
        '<td data-label="Model"><code>' + escapeHtml(r.modelId) + '</code></td>' +
        '<td data-label="Input $/M">' + (hasPrice ? '$' + Number(r.inputPerM).toFixed(2) : '—') + '</td>' +
        '<td data-label="Output $/M">' + (hasPrice ? '$' + Number(r.outputPerM).toFixed(2) : '—') + '</td>' +
        '<td data-label="Context">' + (r.contextWindow ? escapeHtml(r.contextWindow) : '—') + '</td>' +
        '<td data-label="Max output">' + (r.maxOutput ? escapeHtml(r.maxOutput) : '—') + '</td>' +
        '<td data-label="Status"><span class="' + pillClass + '">' + escapeHtml(statusLabel) + '</span></td>' +
        '<td data-label="Verified">' + formatVerifiedDate(r.verifiedAt) + '</td>' +
        '<td data-label="Source">' + sourceCell + '</td>' +
      '</tr>';
    }).join('');
  }

  function attachAllModelsFilterHandlers() {
    var providerSel = document.getElementById('allModelsProviderFilter');
    var statusSel = document.getElementById('allModelsStatusFilter');
    var searchInput = document.getElementById('allModelsSearch');
    if (providerSel) {
      providerSel.addEventListener('change', function() {
        allModelsFilters.provider = providerSel.value;
        renderAllModelsTable();
      });
    }
    if (statusSel) {
      statusSel.addEventListener('change', function() {
        allModelsFilters.status = statusSel.value;
        renderAllModelsTable();
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        allModelsFilters.search = searchInput.value.trim();
        renderAllModelsTable();
      });
    }
  }

  function setStatusBanner(message, isWarning) {
    var el = document.getElementById('pricingStatusBanner');
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle('is-warning', !!isWarning);
  }

  function attachSortHandlers() {
    var headers = document.querySelectorAll('.pricing-sortable');
    for (var i = 0; i < headers.length; i++) {
      (function(th) {
        th.addEventListener('click', function() {
          var col = th.getAttribute('data-sort');
          if (col === sortColumn) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = col;
            sortDir = 'asc';
          }
          renderPricingTable();
        });
      })(headers[i]);
    }
  }

  function loadPricing() {
    // cache: 'no-store' so the browser never caches its own copy of the
    // pricing payload. Cloudflare's edge cache (driven by the Worker's
    // Cache-Control: max-age=300) still absorbs the load. Net result:
    // KV updates propagate to every visitor within ~5 minutes instead
    // of being stuck in browser caches for an hour after each refresh.
    return fetch(PRICING_API, { cache: 'no-store' })
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        if (!data || !Array.isArray(data.providers)) throw new Error('malformed payload');
        return { data: data, source: 'live' };
      })
      .catch(function(err) {
        return { data: FALLBACK_DATA, source: 'fallback', error: err };
      });
  }

  function init() {
    attachSortHandlers();
    attachAllModelsFilterHandlers();
    loadPricing().then(function(result) {
      currentData = result.data;
      setLastUpdated(currentData.lastUpdated);
      renderPricingTable();
      renderRateLimitsTable();
      renderBuilderPicks();
      populateProviderFilterOptions();
      renderAllModelsTable();
      if (result.source === 'fallback') {
        setStatusBanner('Live pricing service unreachable — showing the last embedded snapshot from ' + (currentData.lastUpdated || 'an earlier release') + '. Per-row billing links are still current.', true);
      } else {
        setStatusBanner(null);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
