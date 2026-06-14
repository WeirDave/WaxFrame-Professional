// ============================================================
//  WaxFrame — mobile-share.js
// Build: 20260614-027
//  navigator.share() helper for the mobile-overlay save/share
//  button. Falls back to clipboard.writeText + a brief toast
//  if navigator.share is unavailable. Extracted from the
//  formerly-inline <script> on index.html in v3.63.352. The
//  original lived inline so it would work even if app.js
//  failed; that constraint is preserved here — this file is
//  self-contained and has no app.js dependency.
// ============================================================

function wfMobileShare() {
  var url = 'https://waxframe.com/';
  var data = {
    title: 'WaxFrame — Multi-AI Document Refinement',
    text: 'A browser-based multi-AI tool where AI Worker Bees review and refine your documents in iterative rounds.',
    url: url
  };
  if (navigator.share) {
    navigator.share(data).catch(function(){ /* user cancelled — ignore */ });
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      wfMobileShareToast('Link copied! Open your browser menu to bookmark it.');
    }).catch(function() {
      wfMobileShareToast('Tap your browser menu → Bookmark this page');
    });
    return;
  }
  wfMobileShareToast('Tap your browser menu → Bookmark this page');
}
function wfMobileShareToast(msg) {
  var t = document.createElement('div');
  t.className = 'mobile-overlay-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.classList.add('is-visible'); }, 10);
  setTimeout(function(){
    t.classList.remove('is-visible');
    setTimeout(function(){ t.remove(); }, 300);
  }, 3200);
}
