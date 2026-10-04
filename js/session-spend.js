// ============================================================
//  WaxFrame — session-spend.js
// Build: 20261004-002
//  Session spend meter (v3.63.562). Every provider response that
//  reports token usage is priced against the embedded pricing
//  snapshot (window.WFPricing, from pricing-renderer.js) and added
//  to a running total shown in the work-screen footer. Clicking the
//  pill opens a per-AI breakdown.
//
//  WHY. WaxFrame is pay-per-token on the user's own keys, and the
//  only spend figure anywhere in the app was the welcome screen's
//  "~$0.30 per full hive review" — a forecast, never a measurement.
//  A customer had to open every provider's billing console to learn
//  what a session actually cost. The tokens were already being
//  reported by every response; they were simply never added up.
//
//  WHAT IT IS NOT. An invoice. Prices are list prices from the
//  snapshot shipped with this build; cached-input discounts, batch
//  or priority tiers, reasoning-token surcharges and per-search fees
//  are not modelled, so the figure is labelled an estimate
//  everywhere it appears. Gemini is priced at paid-tier rates
//  because the free tier cannot be detected from a response; the
//  breakdown says so.
//
//  STORAGE. One small localStorage key, waxframe_session_spend,
//  written after each recorded call so a reload keeps the total.
//  Cleared by resetSessionState() when a session ends. Contains
//  AI names, model ids, token counts and dollar figures only —
//  never prompt or document text, never keys.
// ============================================================

(function () {
  'use strict';

  var LS_KEY = 'waxframe_session_spend';
  var MAX_ROWS = 200;      // a hive has ~10 rows; anything near this is junk
  var MAX_ROUNDS = 1000;

  // WaxFrame provider id → pricing snapshot provider id. Gemini is the one
  // provider whose snapshot entry is split by tier.
  var PROVIDER_MAP = { gemini: 'gemini-paid' };

  function emptyState() { return { rows: {}, rounds: {} }; }

  function num(v) { return (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0; }

  // Saved state is read back defensively: it is user-writable storage, and a
  // value that is not a plain non-negative number is dropped, not trusted.
  function load() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { raw = null; }
    var st = emptyState();
    if (!raw || typeof raw !== 'object') return st;
    var rows = raw.rows && typeof raw.rows === 'object' ? raw.rows : {};
    Object.keys(rows).slice(0, MAX_ROWS).forEach(function (k) {
      var r = rows[k];
      if (!r || typeof r !== 'object') return;
      st.rows[String(k).slice(0, 300)] = {
        name:    String(r.name || '').slice(0, 80),
        model:   String(r.model || '').slice(0, 120),
        calls:   num(r.calls),
        inTok:   num(r.inTok),
        outTok:  num(r.outTok),
        usd:     num(r.usd),
        priced:  r.priced === true,
        noUsage: num(r.noUsage)
      };
    });
    var rounds = raw.rounds && typeof raw.rounds === 'object' ? raw.rounds : {};
    Object.keys(rounds).slice(0, MAX_ROUNDS).forEach(function (k) {
      if (/^\d{1,5}$/.test(k)) st.rounds[k] = num(rounds[k]);
    });
    return st;
  }

  var state = load();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* quota — the meter still works this tab */ }
  }

  // ── Pricing lookup ──────────────────────────────────────────
  function snapshotProviders() {
    var s = window.WFPricing && window.WFPricing.snapshot;
    return (s && Array.isArray(s.providers)) ? s.providers : [];
  }

  function normModel(m) {
    return String(m || '').toLowerCase().trim().replace(/^models\//, '');
  }

  // Exact id first; otherwise the longest priced id the model id begins with,
  // so a dated snapshot id (claude-haiku-4-5-20251001) prices as its family.
  function priceFor(provider, model) {
    var pid = PROVIDER_MAP[provider] || provider;
    var prov = null, list = snapshotProviders();
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === pid) { prov = list[i]; break; }
    if (!prov || !Array.isArray(prov.models)) return null;
    var want = normModel(model);
    if (!want) return null;
    var best = null;
    prov.models.forEach(function (m) {
      if (!m || m.status !== 'verified') return;
      if (typeof m.inputPerM !== 'number' || typeof m.outputPerM !== 'number') return;
      var id = normModel(m.id);
      if (id === want) { best = m; return; }
      if (best && normModel(best.id) === want) return;
      if (want.indexOf(id + '-') === 0 && (!best || id.length > normModel(best.id).length)) best = m;
    });
    return best ? { inPerM: best.inputPerM, outPerM: best.outputPerM, id: best.id } : null;
  }

  // Same coalescing app.js uses for the Deep Dive capture: OpenAI, Anthropic
  // and Gemini name their usage fields differently.
  function usageOf(data) {
    var u = (data && data.usage) || {};
    var g = (data && data.usageMetadata) || {};
    var pt = u.prompt_tokens || u.input_tokens || g.promptTokenCount || null;
    var ct = u.completion_tokens || u.output_tokens || g.candidatesTokenCount || null;
    if (pt == null && ct == null) return null;
    return { inTok: num(pt), outTok: num(ct) };
  }

  // ── Public API ──────────────────────────────────────────────
  function record(ai, model, data, roundNo) {
    try {
      if (!ai) return;
      var key = String(ai.id || ai.provider || 'unknown') + '|' + String(model || '');
      var row = state.rows[key];
      if (!row) {
        if (Object.keys(state.rows).length >= MAX_ROWS) return;
        row = state.rows[key] = { name: String(ai.name || ai.id || '').slice(0, 80), model: String(model || '').slice(0, 120),
                                  calls: 0, inTok: 0, outTok: 0, usd: 0, priced: false, noUsage: 0 };
      }
      row.calls++;
      var usage = usageOf(data);
      if (!usage) { row.noUsage++; save(); render(); return; }
      row.inTok += usage.inTok;
      row.outTok += usage.outTok;
      var price = priceFor(ai.provider, model);
      if (price) {
        var usd = usage.inTok / 1e6 * price.inPerM + usage.outTok / 1e6 * price.outPerM;
        row.usd += usd;
        row.priced = true;
        var rk = String(Math.max(0, Math.floor(num(roundNo))));
        if (/^\d{1,5}$/.test(rk)) state.rounds[rk] = num(state.rounds[rk]) + usd;
      }
      save();
      render();
    } catch (e) { /* the meter must never break a round */ }
  }

  function reset() {
    state = emptyState();
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    render();
  }

  function total() {
    var t = 0;
    Object.keys(state.rows).forEach(function (k) { t += state.rows[k].usd; });
    return t;
  }

  function roundCost(n) { return num(state.rounds[String(n)]); }

  function unpricedRows() {
    return Object.keys(state.rows).map(function (k) { return state.rows[k]; })
      .filter(function (r) { return !r.priced && r.calls > 0; });
  }

  function fmt(usd) {
    if (usd === 0) return '$0.00';
    if (usd < 0.01) return '<$0.01';
    return '$' + usd.toFixed(2);
  }

  function fmtPrecise(usd) {
    if (usd === 0) return '$0.00';
    if (usd < 0.0001) return '<$0.0001';
    return '$' + usd.toFixed(usd < 1 ? 4 : 2);
  }

  function render() {
    var btn = document.getElementById('spendIndicator');
    var label = document.getElementById('spendIndicatorLabel');
    if (!btn || !label) return;
    var t = total();
    var calls = Object.keys(state.rows).reduce(function (a, k) { return a + state.rows[k].calls; }, 0);
    label.textContent = calls === 0 ? 'Spend: $0.00' : 'Spend: ~' + fmt(t);
    var unpriced = unpricedRows().length;
    btn.title = calls === 0
      ? 'Estimated API spend for this session. Nothing sent yet. Click for the breakdown.'
      : 'Estimated API spend this session: ' + fmtPrecise(t) + ' across ' + calls + ' call' + (calls === 1 ? '' : 's') +
        (unpriced ? ' (' + unpriced + ' AI' + (unpriced === 1 ? '' : 's') + ' not priced)' : '') +
        '. List prices from the bundled pricing snapshot, not your invoice. Click for the breakdown.';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function snapshotDate() {
    var s = window.WFPricing && window.WFPricing.snapshot;
    var d = s && s.lastUpdated ? String(s.lastUpdated).slice(0, 10) : '';
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : 'this release';
  }

  function openBreakdown() {
    var existing = document.getElementById('spendModal');
    if (existing) existing.remove();
    var rows = Object.keys(state.rows).map(function (k) { return state.rows[k]; })
      .sort(function (a, b) { return b.usd - a.usd; });
    var hasGemini = Object.keys(state.rows).some(function (k) { return /^gemini/i.test(k); });
    var body = rows.length === 0
      ? '<p class="spend-modal-empty">Nothing has been sent yet. The meter starts counting with the first round.</p>'
      : '<table class="spend-table"><thead><tr><th>AI</th><th>Model</th><th class="num">Calls</th><th class="num">Input tokens</th><th class="num">Output tokens</th><th class="num">Est. cost</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var cost = r.priced ? fmtPrecise(r.usd)
                   : (r.noUsage === r.calls ? '<span class="spend-dim" title="This endpoint does not report token usage">no usage reported</span>'
                                             : '<span class="spend-dim" title="This model is not in the pricing snapshot — local and custom models usually cost nothing per token">not priced</span>');
          return '<tr><td>' + esc(r.name) + '</td><td class="spend-model">' + esc(r.model || '—') + '</td><td class="num">' + r.calls +
                 '</td><td class="num">' + r.inTok.toLocaleString() + '</td><td class="num">' + r.outTok.toLocaleString() +
                 '</td><td class="num">' + cost + '</td></tr>';
        }).join('') +
        '</tbody><tfoot><tr><td colspan="5">Session total (estimate)</td><td class="num">' + fmtPrecise(total()) + '</td></tr></tfoot></table>';
    var notes = '<ul class="spend-notes">' +
      '<li>Token counts are what each provider reported back. Prices are list prices from the pricing snapshot bundled with this build (' + esc(snapshotDate()) + ').</li>' +
      '<li>Cached-input discounts, batch or priority tiers, reasoning surcharges and per-search fees are not modelled. Your provider\'s billing page is the authority.</li>' +
      (hasGemini ? '<li>Gemini is priced at paid-tier rates. On AI Studio\'s free tier those calls cost nothing.</li>' : '') +
      '<li>The total resets when you start a new project.</li></ul>';
    var modal = document.createElement('div');
    modal.id = 'spendModal';
    modal.className = 'spend-modal';
    modal.innerHTML =
      '<div class="spend-modal-inner" role="dialog" aria-modal="true" aria-labelledby="spendModalTitle">' +
        '<div class="spend-modal-hdr"><span id="spendModalTitle">💲 Session spend</span>' +
        '<button class="btn btn-ghost btn-sm" data-action="remove-element" data-target="spendModal">✕ Close</button></div>' +
        '<div class="spend-modal-body">' + body + notes +
        '<p class="spend-modal-link"><a href="ai-api-pricing.html" target="_blank" rel="noopener">Compare per-model prices →</a></p></div>' +
      '</div>';
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  // Plain-text block for the session transcript header.
  function summaryText() {
    var rows = Object.keys(state.rows).map(function (k) { return state.rows[k]; });
    if (rows.length === 0) return '';
    var lines = ['Estimated API spend: ' + fmtPrecise(total()) + ' (list prices, pricing snapshot ' + snapshotDate() + ')'];
    rows.forEach(function (r) {
      lines.push('  ' + r.name + ' (' + (r.model || 'default') + '): ' + r.calls + ' call' + (r.calls === 1 ? '' : 's') + ', ' +
                 r.inTok.toLocaleString() + ' in / ' + r.outTok.toLocaleString() + ' out tokens, ' +
                 (r.priced ? fmtPrecise(r.usd) : 'not priced'));
    });
    return lines.join('\n');
  }

  window.WFSpend = {
    record: record, reset: reset, total: total, roundCost: roundCost,
    render: render, openBreakdown: openBreakdown, summaryText: summaryText,
    format: fmtPrecise, _priceFor: priceFor
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
