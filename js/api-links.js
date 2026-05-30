// api-links.js — Canonical API console URL list + opener
// Build: 20260529-029
// SINGLE SOURCE OF TRUTH for the default AI API-console (key / sign-up) URLs.
// Loaded by index.html *before* app.js (which reads API_CONSOLE_URLS into
// DEFAULT_AIS) and by standalone helper pages such as api-details.html that
// don't load app.js. The "get an API key" UI (a slide-up drawer of
// per-provider links, same pattern as the Notes drawer) also lives here so
// both the guide page and the main app share one component (v3.56.42).

// Keyed by DEFAULT_AIS id so app.js can map them 1:1.
window.API_CONSOLE_URLS = {
  chatgpt:    'https://platform.openai.com/api-keys',
  claude:     'https://console.anthropic.com/settings/keys',
  gemini:     'https://aistudio.google.com/apikey',
  grok:       'https://console.x.ai',
  perplexity: 'https://console.perplexity.ai',
  mistral:    'https://console.mistral.ai/api-keys'
};

// ── "Get an API key" drawer ───────────────────────────────────────────
// v3.56.42 — Replaces the old openAllConsoles() bulk-opener. Browsers allow
// only ONE window.open() per user click, so firing six at once got five
// blocked as pop-ups. Instead, a slide-up drawer (same pattern/markup as the
// Notes drawer) lists each provider as a real link — the user clicks the ones
// they want and each click opens exactly one tab, never blocked. Shared by
// both the API guide page (fixed: default 6 + 3 library providers) and the
// main app (the live hive's AIs that have a console URL); each surface passes
// its own item list. The drawer is created lazily on first open, so neither
// page needs duplicate markup.

// Display names for the six default providers (keyed to API_CONSOLE_URLS).
const _DEFAULT_CONSOLE_NAMES = {
  chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini',
  grok: 'Grok', perplexity: 'Perplexity', mistral: 'Mistral'
};

// Non-default providers documented in the API guide that have a real
// API-key page. Copilot is intentionally excluded — Microsoft offers no
// direct consumer API-key path yet.
const _GUIDE_EXTRA_CONSOLES = [
  { name: 'DeepSeek',    url: 'https://platform.deepseek.com/api_keys' },
  { name: 'Cohere',      url: 'https://dashboard.cohere.com/api-keys' },
  { name: 'Together AI', url: 'https://api.together.ai/settings/api-keys' }
];

function _clEsc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function _clHost(u) {
  try { return new URL(u).host.replace(/^www\./, ''); } catch (_) { return ''; }
}
function _clSafe(u) {
  try {
    const p = new URL(String(u ?? ''));
    return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : '';
  } catch (_) { return ''; }
}

// Fixed list for the API guide page: default 6 + library 3.
function _guideConsoleItems() {
  const defaults = [];
  for (const [id, url] of Object.entries(window.API_CONSOLE_URLS)) {
    if (url) defaults.push({ name: _DEFAULT_CONSOLE_NAMES[id] || id, url });
  }
  return [
    { label: 'Default providers', items: defaults },
    { label: 'Additional AI', items: [].concat(_GUIDE_EXTRA_CONSOLES) }
  ];
}

function _ensureConsolesDrawer() {
  let d = document.getElementById('consolesDrawer');
  if (d) return d;
  d = document.createElement('div');
  d.id = 'consolesDrawer';
  d.className = 'notes-drawer consoles-drawer';
  d.innerHTML =
    '<div class="notes-drawer-hdr">' +
      '<span class="notes-drawer-title">🔑 Get an API key</span>' +
      '<span class="notes-drawer-sub">Click a provider to open its key page in a new tab.</span>' +
      '<div class="notes-drawer-actions">' +
        '<button type="button" title="Close" class="btn btn-accent" onclick="closeConsolesDrawer()">✕ Close</button>' +
      '</div>' +
    '</div>' +
    '<div class="consoles-list" id="consolesList"></div>';
  document.body.appendChild(d);
  return d;
}

// v3.56.44 — accepts an array of {label, items[{name,url}]} groups, renders
// each with a label header, alphabetical within each group.
function openConsolesDrawer(groups) {
  const d = _ensureConsolesDrawer();
  const list = d.querySelector('#consolesList');
  if (!groups || !groups.length || groups.every(function (g) { return !g.items || !g.items.length; })) {
    list.innerHTML = '<div class="consoles-empty">No API console links available.</div>';
    d.classList.add('active');
    return;
  }
  var sortName = function (a, b) { return (a.name || '').localeCompare(b.name || ''); };
  var html = '';
  groups.forEach(function (g) {
    var valid = (g.items || []).filter(function (it) { return it && _clSafe(it.url); }).sort(sortName);
    if (!valid.length) return;
    if (g.label) html += '<div class="consoles-group-label">' + _clEsc(g.label) + '</div>';
    html += valid.map(function (it) {
      var url = _clSafe(it.url);
      return '<a class="consoles-link" href="' + _clEsc(url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="consoles-link-name">' + _clEsc(it.name) + '</span>' +
        '<span class="consoles-link-host">' + _clEsc(_clHost(url)) + '</span>' +
        '<span class="consoles-link-arrow">↗</span>' +
      '</a>';
    }).join('');
  });
  list.innerHTML = html || '<div class="consoles-empty">No API console links available.</div>';
  d.classList.add('active');
}

function closeConsolesDrawer() {
  const d = document.getElementById('consolesDrawer');
  if (d) d.classList.remove('active');
}

function toggleConsolesDrawer(items) {
  const d = document.getElementById('consolesDrawer');
  if (d && d.classList.contains('active')) closeConsolesDrawer();
  else openConsolesDrawer(items);
}

// API guide page entry point (button onclick).
function toggleGuideConsoles() {
  toggleConsolesDrawer(_guideConsoleItems());
}

// Dismiss on Escape, consistent with other dismissible surfaces.
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeConsolesDrawer();
});

// v3.52.7 — openAllBilling helper removed. Companion to openAllConsoles
// above; was never wired to any UI surface. Confirmed zero callers across
// helper pages and main app before removal. If a bulk-billing-pages opener
// is wanted later, the canonical billing URLs are in this file's history.
