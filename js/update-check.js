// ============================================================
//  WaxFrame — update-check.js
// Build: 20260830-003
//  Portable-install ("file://") update notifier. Checks GitHub's
//  Releases API for a newer tag than the running APP_VERSION and,
//  if one exists, shows a footer pill + an About-modal row pointing
//  at Update-WaxFrame.ps1 (the companion updater shipped alongside
//  every release — see repo root). Self-contained, no app.js
//  dependency, same pattern as license-helper.js / nav-helper.js.
//
//  Hosted (https://waxframe.com) pages are always current by
//  definition and never run any of this — see the file:// gate
//  below, which is the single most important line in the file.
//
//  Not loaded on help.html by design: that page is the
//  troubleshooting/diagnostics surface (own header comment: minimal,
//  self-contained, no shared footer/About-modal scaffolding) — the
//  wrong place to add a new network dependency.
// ============================================================

(function () {
  'use strict';

  // ── Gate: portable installs only ──
  if (location.protocol !== 'file:') return;

  const REPO = 'WeirDave/WaxFrame-Professional';
  const API_LATEST = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  const CACHE_KEY = 'waxframe_update_check';
  const DISMISS_KEY = 'waxframe_update_dismissed';
  const TTL_MS = 24 * 60 * 60 * 1000;
  const ERROR_TTL_MS = 30 * 60 * 1000;

  function cmpVer(a, b) {
    const pa = String(a || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const av = pa[i] || 0, bv = pb[i] || 0;
      if (av > bv) return 1;
      if (av < bv) return -1;
    }
    return 0;
  }

  function currentVersion() {
    if (typeof APP_VERSION === 'undefined') return null;
    const m = APP_VERSION.match(/v?([\d.]+)\s+Pro/);
    return m ? m[1] : null;
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (!v || typeof v.checkedAt !== 'number') return null;
      const age = Date.now() - v.checkedAt;
      if (v.error) {
        if (v.kind === 'ratelimit' && v.resetAt) {
          if (Date.now() < v.resetAt + 30 * 1000) return v;
          return null;
        }
        return age > ERROR_TTL_MS ? null : v;
      }
      return age > TTL_MS ? null : v;
    } catch (e) { return null; }
  }

  function writeCache(v) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) {}
  }

  function dismissedVersion() {
    try { return localStorage.getItem(DISMISS_KEY) || ''; } catch (e) { return ''; }
  }

  function dismiss(version) {
    try { localStorage.setItem(DISMISS_KEY, version); } catch (e) {}
  }

  function render(info) {
    const current = currentVersion();
    if (!current || !info || !info.latestVersion) return;
    if (cmpVer(info.latestVersion, current) <= 0) return;
    if (info.latestVersion === dismissedVersion()) return;

    renderFooterPill(info, current);
    renderAboutRow(info, current);
  }

  function renderFooterPill(info, current) {
    const target = document.querySelector('.page-footer-center');
    const licenseBadge = document.getElementById('licenseBadge');
    if (!target && !licenseBadge) return;
    if (document.getElementById('wfUpdateBadge')) return;

    const badge = document.createElement('button');
    badge.id = 'wfUpdateBadge';
    badge.type = 'button';
    badge.className = 'wf-update-badge';
    badge.title = 'A newer version of WaxFrame is available';
    badge.textContent = 'Update available — v' + info.latestVersion;
    badge.addEventListener('click', () => openUpdateModal(info, current));

    if (target) {
      target.appendChild(badge);
    } else if (licenseBadge) {
      licenseBadge.insertAdjacentElement('beforebegin', badge);
    }
  }

  function renderAboutRow(info, current) {
    ['aboutModal', 'aboutModalHelper'].forEach(id => {
      const modal = document.getElementById(id);
      if (!modal) return;
      const body = modal.querySelector('.goal-info-body');
      if (!body || body.querySelector('.wf-update-about-row')) return;

      const row = document.createElement('div');
      row.className = 'goal-info-row wf-update-about-row';

      const label = document.createElement('span');
      label.className = 'info-label';
      label.textContent = 'Update';

      const desc = document.createElement('span');
      desc.className = 'goal-info-desc';
      desc.textContent = 'v' + info.latestVersion + ' available — ';

      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'wf-update-about-link';
      link.textContent = 'View instructions';
      link.addEventListener('click', () => openUpdateModal(info, current));

      desc.appendChild(link);
      row.appendChild(label);
      row.appendChild(desc);
      body.insertBefore(row, body.firstChild);
    });
  }

  // ── Platform-appropriate instructions ──
  // Best-effort UA sniff — fine for informational copy like this (picking
  // which of the two shipped scripts to point at first), not fine for
  // anything security-relevant. Defaults to the Windows steps if detection
  // is inconclusive, since that's this project's primary platform.
  function platformSteps() {
    const ua = (navigator.platform || '') + ' ' + (navigator.userAgent || '');
    if (/mac/i.test(ua)) {
      return {
        steps:
          '<li>Find <code>Update-WaxFrame.command</code> in this WaxFrame folder.</li>' +
          '<li>Double-click it. macOS may ask you to confirm running it the first time &mdash; that&rsquo;s expected for an unsigned script (right-click &rarr; Open if Gatekeeper blocks the double-click).</li>' +
          '<li>It downloads the new version, checks it, and swaps it in &mdash; your old version is kept as a backup, nothing is deleted.</li>' +
          '<li>WaxFrame reopens automatically when it&rsquo;s done.</li>',
        note: 'On Linux, run the same file from a terminal instead: <code>bash Update-WaxFrame.command</code>.'
      };
    }
    if (/linux/i.test(ua)) {
      return {
        steps:
          '<li>Open a terminal in this WaxFrame folder.</li>' +
          '<li>Run <code>bash Update-WaxFrame.command</code>.</li>' +
          '<li>It downloads the new version, checks it, and swaps it in &mdash; your old version is kept as a backup, nothing is deleted.</li>' +
          '<li>WaxFrame reopens automatically when it&rsquo;s done.</li>',
        note: 'On Mac, double-click the same file in Finder instead.'
      };
    }
    return {
      steps:
        '<li>Find <code>Update-WaxFrame.ps1</code> in this WaxFrame folder.</li>' +
        '<li>Right-click it &rarr; &ldquo;Run with PowerShell&rdquo;.</li>' +
        '<li>It downloads the new version, checks it, and swaps it in &mdash; your old version is kept as a backup, nothing is deleted.</li>' +
        '<li>WaxFrame reopens automatically when it&rsquo;s done.</li>',
      note: 'On Mac or Linux, use <code>Update-WaxFrame.command</code> instead (double-click on Mac, or <code>bash Update-WaxFrame.command</code> in a terminal on Linux).'
    };
  }

  // ── Instructional modal — lazily created, reuses .license-modal-* chrome ──
  function ensureUpdateDialog() {
    let overlay = document.getElementById('wfUpdateDialogOverlay');
    if (overlay) return overlay;
    const platform = platformSteps();
    overlay = document.createElement('div');
    overlay.id = 'wfUpdateDialogOverlay';
    overlay.className = 'license-modal-overlay';
    overlay.innerHTML =
      '<div class="license-modal wf-update-modal">' +
        '<img src="images/Waxframe_logo_v19.png" alt="WaxFrame" class="license-modal-logo">' +
        '<h2 class="license-modal-title" id="wfUpdateDialogTitle">A new version is available</h2>' +
        '<p class="license-modal-msg" id="wfUpdateDialogMsg"></p>' +
        '<ol class="wf-update-steps">' + platform.steps + '</ol>' +
        '<p class="wf-update-platform-note">' + platform.note + '</p>' +
        '<div class="license-modal-actions" id="wfUpdateDialogActions"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeUpdateDialog(); });
    return overlay;
  }

  function closeUpdateDialog() {
    const overlay = document.getElementById('wfUpdateDialogOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function openUpdateModal(info, current) {
    const overlay = ensureUpdateDialog();
    document.getElementById('wfUpdateDialogMsg').textContent =
      'WaxFrame v' + info.latestVersion + ' is out — you’re running v' + current +
      '. WaxFrame can’t install this automatically from inside the browser (portable installs don’t run background services by design). To update:';

    const actions = document.getElementById('wfUpdateDialogActions');
    actions.innerHTML = '';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'license-modal-btn-secondary';
    copyBtn.textContent = 'Copy Release Link';
    copyBtn.addEventListener('click', () => {
      if (navigator.clipboard && info.htmlUrl) {
        navigator.clipboard.writeText(info.htmlUrl).catch(() => {});
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Release Link'; }, 1500);
      }
    });

    const openBtn = document.createElement('button');
    openBtn.className = 'license-modal-btn-secondary';
    openBtn.textContent = 'Open Release Page ↗';
    openBtn.addEventListener('click', () => {
      if (info.htmlUrl) window.open(info.htmlUrl, '_blank', 'noopener,noreferrer');
    });

    const gotItBtn = document.createElement('button');
    gotItBtn.className = 'license-modal-btn';
    gotItBtn.textContent = 'Got it';
    gotItBtn.addEventListener('click', () => {
      dismiss(info.latestVersion);
      const pill = document.getElementById('wfUpdateBadge');
      if (pill) pill.remove();
      closeUpdateDialog();
    });

    actions.appendChild(copyBtn);
    actions.appendChild(openBtn);
    actions.appendChild(gotItBtn);
    overlay.classList.add('active');
  }

  // ── Check flow ──
  function check() {
    const current = currentVersion();
    if (!current) return;

    const cached = readCache();
    if (cached) {
      if (!cached.error) render(cached);
      return;
    }

    fetch(API_LATEST, { headers: { Accept: 'application/vnd.github+json' } })
      .then(resp => {
        if (!resp.ok) {
          const kind = resp.status === 403 ? 'ratelimit' : 'http';
          let resetAt = null;
          if (kind === 'ratelimit') {
            const reset = resp.headers.get('X-RateLimit-Reset');
            if (reset) resetAt = parseInt(reset, 10) * 1000;
          }
          writeCache({ checkedAt: Date.now(), error: true, kind, resetAt });
          return null;
        }
        return resp.json();
      })
      .then(data => {
        if (!data) return;
        const tag = String(data.tag_name || '');
        const latestVersion = tag.replace(/^v/i, '');
        const info = {
          checkedAt: Date.now(),
          latestTag: tag,
          latestVersion,
          htmlUrl: data.html_url || '',
          error: false,
          kind: null
        };
        writeCache(info);
        render(info);
      })
      .catch(() => {
        writeCache({ checkedAt: Date.now(), error: true, kind: 'network' });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
