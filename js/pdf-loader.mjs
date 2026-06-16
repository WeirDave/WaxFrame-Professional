// ============================================================
//  WaxFrame — pdf-loader.mjs
// Build: 20260615-003
//  Bootstraps pdf.js 4.x by importing the ESM build and
//  stashing it on window so the rest of app.js (which
//  references window.pdfjsLib) keeps working unchanged.
//  Extracted from the formerly-inline <script type=module>
//  in index.html in v3.63.352 so the page can drop unsafe-
//  inline. ESM scripts default to deferred execution, so the
//  body runs after the document is parsed and well before
//  any user interaction touches pdfjsLib.
//
//  v3.63.387 — Caught the dynamic-import failure path. The
//  portable install (downloaded ZIP, double-click index.html)
//  loads via file:// protocol, and browsers REFUSE to load
//  ESM imports across file:// origins (CORS-style block in
//  the module loader). Pre-v3.63.387 this failed silently:
//  window.pdfjsLib stayed undefined, and the first PDF the
//  user tried to ingest threw the generic "PDF.js not loaded"
//  error with no actionable hint. Now we surface the real
//  reason via window._pdfjsLoadError so extractPDF can show
//  a portable-aware error to the user.
// ============================================================

try {
  const pdfjsLib = await import("../lib/pdf.min.mjs");
  window.pdfjsLib = pdfjsLib;
} catch (err) {
  window._pdfjsLoadError = err;
  console.error('[pdf-loader] Failed to load lib/pdf.min.mjs:', err);
}
