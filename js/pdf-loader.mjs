// ============================================================
//  WaxFrame — pdf-loader.mjs
// Build: 20260614-010
//  Bootstraps pdf.js 4.x by importing the ESM build and
//  stashing it on window so the rest of app.js (which
//  references window.pdfjsLib) keeps working unchanged.
//  Extracted from the formerly-inline <script type=module>
//  in index.html in v3.63.352 so the page can drop unsafe-
//  inline. ESM scripts default to deferred execution, so the
//  body runs after the document is parsed and well before
//  any user interaction touches pdfjsLib.
// ============================================================

import * as pdfjsLib from "../lib/pdf.min.mjs";
window.pdfjsLib = pdfjsLib;
