// ============================================================
//  WaxFrame — license-helper.js
// Build: 20260614-009
//  Self-contained license badge + modal logic for helper pages.
//  Mirrors the in-app license functions in app.js, minus the
//  trial-rounds tracking (helper pages don't run rounds, so the
//  trial counter is read-only — display only).
//  Loaded by every helper page that renders a license badge or hosts
//  the license-manage modal (~13 pages today; the badge lives in the
//  page-header on the standard helper-page footer, and on
//  hive-profiles.html alongside the version stamp). No app.js
//  dependency.
// ============================================================

const LS_LICENSE_HELPER     = 'waxframe_v2_license';
const FREE_TRIAL_ROUNDS_HELPER = 3;
const GUMROAD_PRODUCT_ID_HELPER = 'Iyg5j-ySEnBtA5CKcuVT9A==';

// ── State helpers — pure localStorage reads ──
function isLicensed() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE_HELPER) || 'null');
    return data && data.valid === true && data.key;
  } catch(e) { return false; }
}

function getTrialRoundsUsed() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE_HELPER) || 'null');
    return (data && data.trialRoundsUsed) ? data.trialRoundsUsed : 0;
  } catch(e) { return 0; }
}

function getLicenseKey() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE_HELPER) || 'null');
    return (data && data.valid && data.key) ? data.key : null;
  } catch(e) { return null; }
}

function saveLicense(key) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_LICENSE_HELPER) || '{}');
    existing.valid = true;
    existing.key   = key;
    localStorage.setItem(LS_LICENSE_HELPER, JSON.stringify(existing));
    const saved = JSON.parse(localStorage.getItem(LS_LICENSE_HELPER) || 'null');
    return !!(saved && saved.valid === true && saved.key === key);
  } catch(e) {
    console.warn('[license-helper saveLicense] write failed:', e);
    return false;
  }
}

function clearLicense() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_LICENSE_HELPER) || '{}');
    delete data.valid;
    delete data.key;
    localStorage.setItem(LS_LICENSE_HELPER, JSON.stringify(data));
  } catch(e) {}
}

// ── Badge rendering ──
function updateLicenseBadge() {
  // v3.63.282 — Keep the pinned Buy footer in sync with license state, same
  // as app.js's updateLicenseBadge does on the work screen. Visible for
  // non-licensed (trial) users, hidden once a valid license is present.
  // Pre-v3.63.282 helper pages carried a "🛒 Buy WaxFrame Pro" inline
  // nav-item that showed unconditionally — fired even for licensed users
  // who shouldn't see an upsell at all. Now the wider pinned CTA shows
  // only on trial, matching the canonical index.html pattern.
  const buyFooter = document.getElementById('navBuyFooter');
  if (buyFooter) buyFooter.style.display = isLicensed() ? 'none' : '';

  const badge = document.getElementById('licenseBadge');
  if (!badge) return;
  if (isLicensed()) {
    badge.textContent = '✓ Licensed';
    badge.title       = 'WaxFrame Pro — manage license';
    badge.classList.add('licensed');
    badge.onclick     = () => showLicenseManageModal();
  } else {
    const used      = getTrialRoundsUsed();
    const remaining = Math.max(0, FREE_TRIAL_ROUNDS_HELPER - used);
    badge.textContent = remaining > 0
      ? `Trial — ${remaining} round${remaining === 1 ? '' : 's'} left`
      : 'Trial expired';
    badge.title   = 'Click to enter license key';
    badge.classList.remove('licensed');
    badge.onclick = () => showLicenseModal('');
  }
}

// ── Entry modal ──
function showLicenseModal(reason) {
  const modal = document.getElementById('licenseModal');
  const msg   = document.getElementById('licenseModalMsg');
  if (msg) {
    msg.textContent = reason === 'trial_expired'
      ? `You've used your ${FREE_TRIAL_ROUNDS_HELPER} free rounds. Enter your license key to keep going.`
      : 'Enter your license key to continue using WaxFrame Pro.';
  }
  if (modal) modal.classList.add('active');
  setTimeout(() => document.getElementById('licenseKeyInput')?.focus(), 100);
}

function hideLicenseModal() {
  const modal = document.getElementById('licenseModal');
  if (modal) modal.classList.remove('active');
}

async function submitLicenseKey() {
  const input = document.getElementById('licenseKeyInput');
  const errEl = document.getElementById('licenseKeyError');
  const btn   = document.getElementById('licenseSubmitBtn');
  const key   = input?.value.trim();

  if (!key) { if (errEl) errEl.textContent = 'Please enter your license key.'; return; }
  if (btn)   { btn.disabled = true; btn.textContent = 'Verifying…'; }
  if (errEl) errEl.textContent = '';

  try {
    const resp = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id:           GUMROAD_PRODUCT_ID_HELPER,
        license_key:          key,
        increment_uses_count: 'false'
      })
    });
    const data = await resp.json();
    if (data.success && !data.purchase?.refunded && !data.purchase?.chargebacked) {
      if (!saveLicense(key)) {
        if (errEl) errEl.textContent = 'License verified, but this browser could not save it. Check site storage settings or clear space, then try again.';
        return;
      }
      hideLicenseModal();
      updateLicenseBadge();
    } else {
      if (errEl) errEl.textContent = data.message || 'Invalid key. Check your Gumroad receipt and try again.';
    }
  } catch(e) {
    if (errEl) errEl.textContent = 'Could not reach Gumroad. Check your connection and try again.';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Unlock Pro'; }
  }
}

// ── Manage modal ──
function showLicenseManageModal() {
  const modal = document.getElementById('licenseManageModal');
  const keyEl = document.getElementById('licenseManageKey');
  if (keyEl) {
    const key = getLicenseKey();
    if (key && key.length >= 8) {
      const masked = key.slice(0, -8).replace(/[A-Za-z0-9]/g, '•') + key.slice(-8);
      keyEl.textContent = masked;
    } else {
      keyEl.textContent = '••••••••-••••••••-••••••••-••••••••';
    }
  }
  if (modal) modal.classList.add('active');
}

function hideLicenseManageModal() {
  const modal = document.getElementById('licenseManageModal');
  if (modal) modal.classList.remove('active');
}

function replaceLicenseKey() {
  hideLicenseManageModal();
  showLicenseModal('');
}

// ── Styled confirm/notice for helper pages ──
// Self-contained, injected once, reuses the .license-modal-* classes
// already defined in style.css and loaded by every helper page. Replaces
// the old native confirm()/alert() so license removal matches the rest
// of the app's modal styling. No app.js dependency.
function _ensureLhDialog() {
  let overlay = document.getElementById('lhDialogOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'license-modal-overlay';
  overlay.id = 'lhDialogOverlay';
  overlay.innerHTML =
    '<div class="license-modal">' +
      '<img src="images/Waxframe_logo_v19.png" alt="WaxFrame" class="license-modal-logo">' +
      '<h2 class="license-modal-title" id="lhDialogTitle"></h2>' +
      '<p class="license-modal-msg" id="lhDialogMsg"></p>' +
      '<div class="license-modal-actions" id="lhDialogActions"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function lhConfirm(title, message, opts) {
  opts = opts || {};
  const okText     = opts.okText     || 'Confirm';
  const cancelText = opts.cancelText || 'Cancel';
  const danger     = !!opts.danger;
  return new Promise(function(resolve) {
    const overlay = _ensureLhDialog();
    document.getElementById('lhDialogTitle').textContent = title;
    document.getElementById('lhDialogMsg').textContent   = message;
    const actions = document.getElementById('lhDialogActions');
    actions.innerHTML = '';

    const cancelBtn = document.createElement('button');
    cancelBtn.className   = 'license-modal-btn-secondary';
    cancelBtn.textContent = cancelText;

    const okBtn = document.createElement('button');
    okBtn.className   = danger ? 'license-modal-btn-danger' : 'license-modal-btn';
    okBtn.textContent = okText;

    function close(result) {
      overlay.classList.remove('active');
      overlay.onclick = null;
      resolve(result);
    }
    cancelBtn.onclick = function() { close(false); };
    okBtn.onclick     = function() { close(true); };
    overlay.onclick   = function(e) { if (e.target === overlay) close(false); };

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    overlay.classList.add('active');
    setTimeout(function() { okBtn.focus(); }, 100);
  });
}

function lhNotice(title, message, okText) {
  return new Promise(function(resolve) {
    const overlay = _ensureLhDialog();
    document.getElementById('lhDialogTitle').textContent = title;
    document.getElementById('lhDialogMsg').textContent   = message;
    const actions = document.getElementById('lhDialogActions');
    actions.innerHTML = '';

    const okBtn = document.createElement('button');
    okBtn.className   = 'license-modal-btn';
    okBtn.textContent = okText || 'OK';

    function close() {
      overlay.classList.remove('active');
      overlay.onclick = null;
      resolve();
    }
    okBtn.onclick   = close;
    overlay.onclick = function(e) { if (e.target === overlay) close(); };

    actions.appendChild(okBtn);
    overlay.classList.add('active');
    setTimeout(function() { okBtn.focus(); }, 100);
  });
}

async function confirmRemoveLicense() {
  const ok = await lhConfirm(
    'Remove License',
    'Remove your WaxFrame Pro license key from this browser? You will revert to the free trial. If your trial is already used up, you will need to enter a license key to keep running rounds.',
    { okText: 'Remove Key', cancelText: 'Cancel', danger: true }
  );
  if (!ok) return;
  clearLicense();
  hideLicenseManageModal();
  updateLicenseBadge();
  await lhNotice(
    'License Removed',
    "Your license key has been removed from this browser. You're back on the free trial.",
    'Got it'
  );
}

// ── Init on load ──
document.addEventListener('DOMContentLoaded', updateLicenseBadge);
