// ============================================================
//  WaxFrame — nav-helper.js
//  Build: 20260529-013
//  Shared hamburger-menu open/close functions for helper pages
//  (api-details, document-playbooks, prompt-editor, what-are-tokens,
//   waxframe-user-manual). Mirrors the work-screen openNavMenu /
//   closeNavMenu in app.js so the visual + behavior is identical.
//  Helper pages use the slim helper-nav markup (Documentation /
//   Create Something / Support) — see each page's <div id="navPanel">.
// ============================================================

function openNavMenu() {
  document.getElementById('navPanel')?.classList.add('open');
  document.getElementById('navBackdrop')?.classList.add('open');
}

function closeNavMenu() {
  document.getElementById('navPanel')?.classList.remove('open');
  document.getElementById('navBackdrop')?.classList.remove('open');
}

// ESC key closes the menu — matches in-app behavior
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeNavMenu();
});


// ============================================================
//  v3.63.40 — Download as Word (.doc)
//  Replaces the flaky browser "Save as PDF" (window.print) on the
//  helper pages. window.print produced a blank page because the
//  helper-body flex/min-height:100vh/overflow layout collapses in
//  the print box. A generated .doc sidesteps the print engine
//  entirely: wrap the page's main content in Word's Office HTML
//  header + an embedded print-safe stylesheet, hand it back as an
//  application/msword blob. Opens formatted in Word, Google Docs,
//  and LibreOffice. Dependency-free + air-gap safe (no library).
// ============================================================
function downloadAsWord() {
  var root = document.querySelector('.doc-main') || document.querySelector('.page-main');
  if (!root) { if (typeof toast === 'function') toast('\u26a0\ufe0f Nothing to export'); return; }
  var clone = root.cloneNode(true);
  // Strip on-screen-only chrome: TOC sidebar, buttons, scripts, back-to-top,
  // nav panels, and anything explicitly hidden inline.
  clone.querySelectorAll('.doc-sidebar, script, style, button, .wh-back-top, .nav-panel, .nav-toggle, .nav-backdrop, [data-no-export]').forEach(function(el){ el.remove(); });
  clone.querySelectorAll('[style]').forEach(function(el){
    var st = (el.getAttribute('style') || '').replace(/\s+/g,'').toLowerCase();
    if (st.indexOf('display:none') !== -1 || st.indexOf('visibility:hidden') !== -1) el.remove();
  });
  var docTitle = document.title || 'WaxFrame';
  var css =
    "body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000;line-height:1.4;}" +
    "h1,h2,h3,h4{font-family:Calibri,Arial,sans-serif;color:#000;}" +
    "h1{font-size:20pt;} h2{font-size:15pt;}" +
    "a{color:#000;text-decoration:none;}" +
    ".doc-sidebar{display:none;}" +
    ".wh-section{margin:0 0 16pt;}" +
    ".wh-section-hdr{margin:14pt 0 6pt;}" +
    ".wh-section-title{font-size:13pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;color:#000;border-bottom:1.5pt solid #888;padding-bottom:3pt;display:block;}" +
    ".wh-section-icon{font-size:13pt;}" +
    ".wh-block{margin:0 0 8pt;}" +
    ".wh-block-title{font-size:12pt;font-weight:bold;color:#000;margin:10pt 0 4pt;}" +
    ".wh-block p,.wh-block li{font-size:11pt;color:#222;margin:0 0 6pt;}" +
    ".wh-block ul,.wh-block ol{margin:4pt 0 8pt;padding-left:22pt;}" +
    ".wh-steps{padding-left:0;list-style:none;}" +
    ".wh-step{margin:0 0 6pt;}" +
    ".wh-step-num{font-weight:bold;color:#b87a00;margin-right:6pt;}" +
    ".wh-tip{background:#fffbea;border:1pt solid #e5c84a;padding:6pt 8pt;margin:8pt 0;}" +
    ".wh-tip p{color:#5a4a00;margin:0;}" +
    ".wh-warn{background:#fff0f0;border:1pt solid #d99;padding:6pt 8pt;margin:8pt 0;}" +
    ".wh-warn p{color:#b00000;margin:0;}" +
    ".wh-table{border-collapse:collapse;width:100%;margin:8pt 0;}" +
    ".wh-table th{background:#efefef;color:#000;font-weight:bold;text-align:left;border:1pt solid #999;padding:4pt 8pt;}" +
    ".wh-table td{color:#222;border:1pt solid #999;padding:4pt 8pt;}" +
    "code{font-family:Consolas,'Courier New',monospace;background:#f0f0f0;color:#222;padding:0 2pt;}";
  var head =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
    "xmlns:w='urn:schemas-microsoft-com:office:word' " +
    "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>" +
    "<title>" + docTitle + "</title><style>" + css + "</style></head><body>" +
    "<h1>" + docTitle + "</h1>";
  var html = head + clone.innerHTML + "</body></html>";
  var blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  var url = URL.createObjectURL(blob);
  var safe = docTitle.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'WaxFrame';
  var a = document.createElement('a');
  a.href = url; a.download = safe + '.doc';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ try { document.body.removeChild(a); } catch(e){} URL.revokeObjectURL(url); }, 1000);
}
