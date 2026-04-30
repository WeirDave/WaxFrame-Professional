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
    var w = window.open(url, '_blank');
    if (w) opened++;
  });
  return { total: consoles.length, opened: opened };
}

function openAllBilling() {
  const billing = [
    'https://platform.openai.com/settings/organization/billing/overview',
    'https://console.anthropic.com/settings/billing',
    'https://platform.deepseek.com/top_up',
    'https://aistudio.google.com/apikey',
    'https://console.x.ai',
    'https://console.perplexity.ai'
  ];
  var opened = 0;
  billing.forEach(function(url) {
    var w = window.open(url, '_blank');
    if (w) opened++;
  });
  return { total: billing.length, opened: opened };
}
