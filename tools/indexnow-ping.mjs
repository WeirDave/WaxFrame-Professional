// ============================================================
//  WaxFrame — tools/indexnow-ping.mjs
// Build: 20260725-001
//
//  IndexNow release ping (added v3.63.406). GitHub Pages is a
//  static host and cannot push index notifications itself, so
//  this dev-side tool tells the IndexNow endpoint (Bing, Yandex,
//  and partner engines — the indexes most AI search stacks read)
//  that the site changed. Run it AFTER commit + push, once the
//  new version is verified live on github.com:
//
//      node tools/indexnow-ping.mjs
//
//  The key file e277fd40ddadb981bd9a20e2c24d83d4.txt at the site
//  root proves domain ownership to the IndexNow protocol. If the
//  key is ever rotated, update KEY below AND replace the root
//  key file in the same release.
//
//  This does not replace Google Search Console / Bing Webmaster
//  sitemap submission — it complements them with instant
//  per-release change notification.
// ============================================================

const HOST = 'waxframe.com';
const KEY  = 'e277fd40ddadb981bd9a20e2c24d83d4';

const URLS = [
  'https://waxframe.com/',
  'https://waxframe.com/start-here.html',
  'https://waxframe.com/templates.html',
  'https://waxframe.com/waxframe-user-manual.html',
  'https://waxframe.com/hive-profiles.html',
  'https://waxframe.com/api-details.html',
  'https://waxframe.com/ai-api-pricing.html',
  'https://waxframe.com/document-playbooks.html',
  'https://waxframe.com/ai-cover-letter-editor.html',
  'https://waxframe.com/ai-business-proposal.html',
  'https://waxframe.com/ai-resume-review.html',
  'https://waxframe.com/what-are-tokens.html',
  'https://waxframe.com/prompt-editor.html',
  'https://waxframe.com/help.html',
  'https://waxframe.com/privacy.html',
  'https://waxframe.com/terms.html',
];

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: URLS,
});

try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  });
  // 200 = accepted; 202 = accepted, key validation pending.
  // 403 = key file missing/mismatched at keyLocation — check the
  // root key file deployed. 422 = URL/host mismatch. 429 = slow down.
  console.log(`IndexNow: HTTP ${res.status} ${res.statusText} — ${URLS.length} URLs submitted for ${HOST}`);
  if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
} catch (err) {
  console.error('IndexNow ping failed (network):', err.message);
  process.exitCode = 1;
}
