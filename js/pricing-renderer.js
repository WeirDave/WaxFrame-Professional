// ============================================================
//  WaxFrame — pricing-renderer.js
// Build: 20260614-042
//  Dynamic pricing renderer for ai-api-pricing.html. Fetches
//  live data from the waxframe-pricing Cloudflare Worker;
//  falls back to the embedded snapshot if the Worker is
//  unreachable. Extracted from the formerly-inline <script>
//  block in v3.63.352 so the page can drop 'unsafe-inline'.
//  Refresh FALLBACK_DATA in lockstep with
//  tools/pricing-worker/data/pricing-seed.json on each
//  release that touches pricing.
// ============================================================

(function(){
  'use strict';

  var PRICING_API = 'https://waxframe-pricing.weirdave.workers.dev/api/pricing';

  // FALLBACK_DATA mirrors tools/pricing-worker/data/pricing-seed.json
  // Refresh this literal in lockstep with the seed file on each release that
  // touches pricing — so first-paint and unreachable-Worker cases stay current.
  var FALLBACK_DATA = {
    lastUpdated: '2026-06-04T00:58:02Z',
    schemaVersion: 2,
    tokensPerRound: { input: 5000, output: 2000 },
    providers: [
      { id:'gemini-free', name:'Gemini (Google) — free tier', shortName:'Gemini Flash (free tier)', model:'gemini-3.5-flash', inputPerM:0.00, outputPerM:0.00, contextWindow:'1M', maxOutput:'8K', estPerRound:0.000, estNote:'free while AI Studio billing is disabled', billingUrl:'https://aistudio.google.com/apikey', tier1Rpm:'15', tier1Tpm:'—', freeTier:'1500 RPD', rateLimitNotes:'Free while billing disabled. Daily quota resets at midnight Pacific.', recommendationTag:'cheapest', recommendationNote:'Free while AI Studio billing is disabled. 1M-token context window, 1500 requests/day quota, synthesizes Builder output reliably. Catch: enable billing on AI Studio and routing can quietly flip to paid tier on the same model name.' },
      { id:'gemini-paid', name:'Gemini (Google) — paid', shortName:'Gemini Flash (paid)', model:'gemini-3.5-flash', inputPerM:0.075, outputPerM:0.30, contextWindow:'1M', maxOutput:'8K', estPerRound:0.001, billingUrl:'https://aistudio.google.com/apikey', tier1Rpm:'2K', tier1Tpm:'4M', freeTier:'n/a', rateLimitNotes:'Paid-tier limits are very generous; cost discipline matters more than RPM.', recommendationTag:null, recommendationNote:null },
      { id:'grok', name:'Grok (xAI)', shortName:'Grok', model:'grok-4.1-fast', inputPerM:0.20, outputPerM:0.50, contextWindow:'256K', maxOutput:'8K', estPerRound:0.002, billingUrl:'https://console.x.ai', tier1Rpm:'~60', tier1Tpm:'varies', freeTier:'Limited', rateLimitNotes:'API availability and quotas vary; check console for current tier.', recommendationTag:null, recommendationNote:null },
      { id:'deepseek', name:'DeepSeek', shortName:'DeepSeek', model:'deepseek-v4-flash', inputPerM:0.14, outputPerM:0.28, contextWindow:'1M', maxOutput:'384K', estPerRound:0.001, billingUrl:'https://platform.deepseek.com/top_up', tier1Rpm:'~60', tier1Tpm:'varies', freeTier:'None', rateLimitNotes:'Cheapest paid option, but consistently the slowest responder in the hive (60–90s/round).', recommendationTag:'cheapest', recommendationNote:'Cheapest reliable paid Builder — roughly 10x cheaper per token than Claude or ChatGPT. Caveat: consistently the slowest responder in the hive, often 60–90 seconds per round. If you don’t mind the wait, it’s the best value.' },
      { id:'together', name:'Together AI', shortName:'Together AI', model:'Llama-3.3-70B-Instruct-Turbo', inputPerM:0.88, outputPerM:0.88, contextWindow:'128K', maxOutput:'4K', estPerRound:0.006, billingUrl:'https://api.together.ai/settings/billing', tier1Rpm:'~600', tier1Tpm:'varies', freeTier:'Trial credits', rateLimitNotes:'Open-weight model gateway; generous limits, not yet hive-tested in production.', recommendationTag:null, recommendationNote:null },
      { id:'mistral', name:'Mistral', shortName:'Mistral', model:'mistral-large-latest', inputPerM:2.00, outputPerM:6.00, contextWindow:'128K', maxOutput:'8K', estPerRound:0.022, billingUrl:'https://admin.mistral.ai/organization/billing', tier1Rpm:'~30', tier1Tpm:'varies', freeTier:'Trial credits', rateLimitNotes:'Low RPS on paid Tier 1. A parallel 6-bee hive can trigger 429 even with token budget remaining. Contact Mistral support for tier raise.', recommendationTag:'balanced', recommendationNote:'Similar territory to ChatGPT — fast, reliable, with a distinct European model lineage that adds genuine diversity to the hive. Watch the low Tier 1 RPM on paid accounts.' },
      { id:'chatgpt', name:'ChatGPT (OpenAI)', shortName:'ChatGPT', model:'gpt-5.5', inputPerM:2.00, outputPerM:8.00, contextWindow:'1M', maxOutput:'32K', estPerRound:0.026, billingUrl:'https://platform.openai.com/settings/organization/billing/overview', tier1Rpm:'500', tier1Tpm:'30K', freeTier:'None', rateLimitNotes:'Tiers scale with usage history; $5 credit unlocks most user needs.', recommendationTag:'balanced', recommendationNote:'Strong all-rounder — fast, reliable formatting compliance, consistent convergence behavior. A good default for long-form documents where Builder speed matters.' },
      { id:'cohere', name:'Cohere', shortName:'Cohere', model:'command-r-plus', inputPerM:2.50, outputPerM:10.00, contextWindow:'128K', maxOutput:'4K', estPerRound:0.033, billingUrl:'https://dashboard.cohere.com/billing', tier1Rpm:'~100', tier1Tpm:'varies', freeTier:'Trial credits', rateLimitNotes:'Generous trial credits; not yet hive-tested in production.', recommendationTag:null, recommendationNote:null },
      { id:'claude', name:'Claude (Anthropic)', shortName:'Claude', model:'claude-sonnet-4-6', inputPerM:3.00, outputPerM:15.00, contextWindow:'200K', maxOutput:'8K', estPerRound:0.045, billingUrl:'https://platform.claude.com/settings/billing', tier1Rpm:'50', tier1Tpm:'50K', freeTier:'None', rateLimitNotes:'Tiers progress automatically with paid spend over time.', recommendationTag:'highest-capability', recommendationNote:'Frequently the best at nuanced voice, precise instruction-following, and detailed reasoning on complex documents. For high-stakes documents (RFP responses, executive summaries, board memos), the premium pays off in fewer rounds to converge.' },
      { id:'perplexity', name:'Perplexity', shortName:'Perplexity', model:'sonar-pro', inputPerM:3.00, outputPerM:15.00, contextWindow:'200K', maxOutput:'8K', estPerRound:0.045, billingUrl:'https://console.perplexity.ai', tier1Rpm:'~50', tier1Tpm:'varies', freeTier:'None', rateLimitNotes:'$5/month recurring subscription tier (enable auto-pay at signup) covers most usage; $50/month otherwise.', recommendationTag:null, recommendationNote:null }
    ]
  };

  var currentData = null;
  var sortColumn = 'estPerRound';
  var sortDir = 'asc';

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
    var rows = currentData.providers.slice().sort(function(a, b) {
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
      var picks = currentData.providers.filter(function(p) { return p.recommendationTag === t.tag; });
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
    loadPricing().then(function(result) {
      currentData = result.data;
      setLastUpdated(currentData.lastUpdated);
      renderPricingTable();
      renderRateLimitsTable();
      renderBuilderPicks();
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
