// api-links.js — Canonical API console URL list + opener
// Build: 20260524-014
// SINGLE SOURCE OF TRUTH for the default AI API-console (key / sign-up) URLs.
// Loaded by index.html *before* app.js (which reads API_CONSOLE_URLS into
// DEFAULT_AIS) and by standalone helper pages such as api-details.html that
// don't load app.js. There is exactly ONE openAllConsoles() and it lives here
// — the former duplicate in app.js was removed in v3.56.17.

// Keyed by DEFAULT_AIS id so app.js can map them 1:1.
window.API_CONSOLE_URLS = {
  chatgpt:    'https://platform.openai.com/api-keys',
  claude:     'https://console.anthropic.com/settings/keys',
  gemini:     'https://aistudio.google.com/apikey',
  grok:       'https://console.x.ai',
  perplexity: 'https://console.perplexity.ai',
  mistral:    'https://console.mistral.ai/api-keys'
};

// Open the API key / sign-up console for every default AI in new tabs.
// Dedupes, counts results, and — only where a toast() exists (i.e. the main
// app) — surfaces feedback; on standalone helper pages it opens silently.
// Browsers may show a one-time "allow popups from this site" prompt on first
// click; once allowed, subsequent invocations open every tab cleanly.
function openAllConsoles() {
  const seen = new Set();
  let opened = 0, blocked = 0;
  for (const url of Object.values(window.API_CONSOLE_URLS)) {
    if (!url || url === '#' || seen.has(url)) continue;
    seen.add(url);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) opened++; else blocked++;
  }
  if (typeof toast === 'function') {
    if (opened === 0 && blocked === 0) {
      toast('⚠️ No API console URLs available');
    } else if (blocked > 0 && opened === 0) {
      toast('⚠️ Popups blocked — allow popups for this site and try again', 4500);
    } else if (blocked > 0) {
      toast(`↗ Opened ${opened} of ${opened + blocked} — allow popups to open the rest`, 4500);
    } else {
      toast(`↗ Opened ${opened} API website${opened !== 1 ? 's' : ''} in new tabs`, 3000);
    }
  }
  return { total: seen.size, opened, blocked };
}

// v3.52.7 — openAllBilling helper removed. Companion to openAllConsoles
// above; was never wired to any UI surface. Confirmed zero callers across
// helper pages and main app before removal. If a bulk-billing-pages opener
// is wanted later, the canonical billing URLs are in this file's history.
