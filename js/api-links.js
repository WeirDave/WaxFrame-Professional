// api-links.js — Standalone API URL opener
// Build: 20260415-002
// Used by api-details.html and any other helper pages that need to open API consoles or billing pages.
// The main app (app.js) has its own openAllConsoles() that reads from the live aiList —
// this file is for standalone pages that don't have access to app.js.

function openAllConsoles() {
  const consoles = [
    'https://platform.openai.com/api-keys',
    'https://console.anthropic.com/settings/keys',
    'https://platform.deepseek.com/api_keys',
    'https://aistudio.google.com/apikey',
    'https://console.x.ai',
    'https://console.perplexity.ai'
  ];
  var opened = 0;
  consoles.forEach(function(url) {
    // v3.52.8 — noopener feature added per audit. Prevents opened tabs
    // from accessing window.opener (security) and lets browser fully
    // isolate processes (performance).
    var w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) opened++;
  });
  return { total: consoles.length, opened: opened };
}

// v3.52.7 — openAllBilling helper removed. Companion to openAllConsoles
// above; was never wired to any UI surface. Confirmed zero callers across
// helper pages and main app before removal. If a bulk-billing-pages opener
// is wanted later, the canonical billing URLs are in this file's history.
