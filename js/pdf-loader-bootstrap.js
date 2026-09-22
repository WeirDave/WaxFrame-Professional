// ============================================================
//  WaxFrame — pdf-loader-bootstrap.js
// Build: 20260922-004
//
//  Hybrid pdf.js loader (added v3.63.393). Runtime-detects how
//  the page was served and loads the right pdf.js build:
//
//   http(s)://  →  ESM build (pdf.js 6.3.289 via pdf-loader.mjs)
//                  Fully closes CVE-2024-4367 at library level.
//
//  v3.63.528 — the two URLs above were frozen at version 3.63.436 for
//  ninety releases, because the release sweep only rewrites a
//  cache-bust whose version matches the one being replaced. A
//  stamp that misses one sweep is skipped by every sweep after
//  it. Both now carry the current version and move with it.
//
//   file://     →  UMD build (pdf.js 3.11.174 via lib/pdf.min.js)
//                  Classic script + classic worker = both load
//                  fine without ESM. WaxFrame already uses
//                  isEvalSupported:false at getDocument() time
//                  as the runtime mitigation for CVE-2024-4367 —
//                  same defense the app shipped pre-v3.63.16.
//                  Portable users get working PDF import again.
//
//  This file is a CLASSIC script (no `import` syntax) so it
//  itself loads happily on file://. It dispatches to the right
//  loader by inserting a <script> tag into the head.
//
//  Why a runtime split instead of just shipping the UMD 3.x for
//  everyone? Defense-in-depth: hosted users get the library-level
//  CVE fix at zero cost. Only portable file:// users — who chose
//  the air-gap deployment — fall back to the runtime mitigation.
// ============================================================

(function () {
  var isFile = (location.protocol === 'file:');
  var s = document.createElement('script');

  if (isFile) {
    // Classic-script UMD build. pdfjs 3.11.174 attaches the library
    // to window.pdfjsLib automatically on load. The matching classic-
    // script worker (pdf.worker.min.js) is wired up by extractPDF()
    // via GlobalWorkerOptions.workerSrc when the first PDF is read.
    s.src = 'lib/pdf.min.js?v=3.63.547';
    s.onerror = function () {
      window._pdfjsLoadError = new Error(
        'Failed to load lib/pdf.min.js (portable file:// path). ' +
        'Check that the lib/ folder is present alongside index.html.'
      );
    };
  } else {
    // ESM build via the existing pdf-loader.mjs (which catches its own
    // dynamic-import failure and stashes the error on window._pdfjsLoadError).
    s.type = 'module';
    s.src = 'js/pdf-loader.mjs?v=3.63.547';
  }

  document.head.appendChild(s);
})();
