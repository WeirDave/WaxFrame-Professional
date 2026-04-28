// ============================================================
//  WaxFrame — license-helper.js
//  Build: 20260427-013
//  Self-contained license badge + modal logic for helper pages.
//  Mirrors the in-app license functions in app.js, minus the
//  trial-rounds tracking (helper pages don't run rounds, so the
//  trial counter is read-only — display only).
//  Loaded by all five helper pages alongside theme.js and
//  nav-helper.js. No app.js dependency.
// ============================================================

const LS_LICENSE_HELPER     = 'waxframe_v2_license';
const FREE_TRIAL_ROUNDS_HELPER = 3;
const GUMROAD_PRODUCT_ID_HELPER = 'Iyg5j-ySEnBtA5CKcuVT9A==';

// ── State helpers — pure localStorage reads ──
function isLicensed() {
  if (localStorage.getItem('waxframe_dev') === '1') return true;
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
  } catch(e) {}
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
      saveLicense(key);
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

function confirmRemoveLicense() {
  if (!confirm('Remove your WaxFrame Pro license key from this browser?\n\nYou will revert to the free trial. If your trial is already used up, you will need to enter a license key to keep running rounds.')) return;
  clearLicense();
  hideLicenseManageModal();
  updateLicenseBadge();
  alert('License key removed');
}

// ── Init on load ──
document.addEventListener('DOMContentLoaded', updateLicenseBadge);
