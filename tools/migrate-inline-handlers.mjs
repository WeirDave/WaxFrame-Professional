// One-shot tool: rewrite inline on*= attributes on an HTML file to
// data-action / data-input-action / data-change-action / data-key-action
// attributes for the strict-CSP migration.
//
// Usage:  node tools/migrate-inline-handlers.mjs <path/to/file.html>
//
// Handles, in priority order:
//   1. Multi-statement combos (about-open, etc.)
//   2. Modal-backdrop patterns (existing data-action="modal-backdrop-close")
//   3. Shared helper actions already in helper-handlers.js (nav-close, etc.)
//   4. Generic single-arg parameterized calls (setTheme('light'), goToScreen('X'))
//   5. Generic `this`-arg calls (selectImportServerIconPreset(this))
//   6. Generic `event`-arg calls (handleRefFileSelect(event))
//   7. Conditional Enter-key calls
//   8. Multi-statement input chains (saveProject();updateGoalCounter();...)
//   9. Catch-all simple `funcName()` -> data-action="call" data-fn="funcName"
//  10. <img onerror="this.style.display='none'"> -> data-hide-on-error

import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: migrate-inline-handlers.mjs <file.html>'); process.exit(1); }
let s = readFileSync(file, 'utf8');

// Helpers
const xform = (re, replacement, label) => {
  const before = s.length;
  const matches = (s.match(re) || []).length;
  s = s.replace(re, replacement);
  if (matches) console.log(`  ${label}: ${matches}`);
};

// ──────────────────────────────────────────────────────────────
// 1. Multi-statement combos that already have a named ACTIONS entry
// ──────────────────────────────────────────────────────────────
// closeNavMenu + open about modal (any ID — helper uses aboutModalHelper,
// index.html uses aboutModal).
xform(/onclick="closeNavMenu\(\);\s*document\.getElementById\('([\w-]+)'\)\.classList\.add\('active'\)"/g,
      'data-action="about-open" data-target="$1"', 'about-open combo');
// closeNavMenu + goToScreen('X') (index.html nav menu — 5 occurrences)
xform(/onclick="closeNavMenu\(\);\s*goToScreen\('([\w-]+)'\)"/g,
      'data-action="nav-goto-screen" data-arg="$1"', 'nav-goto-screen');
// hideFinishModal + goToScreen('screen-welcome') (finish modal "Exit to Home")
xform(/onclick="hideFinishModal\(\);\s*goToScreen\('screen-welcome'\)"/g,
      'data-action="finish-exit-home"', 'finish-exit-home');
// hideFinishModal + openSaveTemplateModal (finish modal "Save as Template")
xform(/onclick="hideFinishModal\(\);\s*openSaveTemplateModal\(\);"/g,
      'data-action="finish-save-template"', 'finish-save-template');
// document.getElementById('X').click() — file-picker trigger pattern
xform(/onclick="document\.getElementById\('([\w-]+)'\)\.click\(\)"/g,
      'data-action="click-element" data-target="$1"', 'click-element');
// document.getElementById('X').style.display='none' — hide-element pattern
xform(/onclick="document\.getElementById\('([\w-]+)'\)\.style\.display='none'"/g,
      'data-action="hide-element" data-target="$1"', 'hide-element');

// ──────────────────────────────────────────────────────────────
// 2. Modal-backdrop patterns
// ──────────────────────────────────────────────────────────────
xform(/onclick="if\(event\.target===this\)this\.classList\.remove\('active'\)"/g,
      'data-action="modal-backdrop-close"', 'modal-backdrop-close (self)');
xform(/onclick="if\(event\.target===this\)document\.getElementById\('([\w-]+)'\)\.classList\.remove\('active'\)"/g,
      'data-action="modal-backdrop-close" data-target="$1"', 'modal-backdrop-close (target)');
xform(/onclick="if\(event\.target===this\)hideLicenseModal\(\)"/g,
      'data-action="license-modal-backdrop-close"', 'license-modal-backdrop-close');
xform(/onclick="if\(event\.target===this\)hideLicenseManageModal\(\)"/g,
      'data-action="license-manage-modal-backdrop-close"', 'license-manage-modal-backdrop-close');
// Generic backdrop-call: if target===this, call any function name
xform(/onclick="if\(event\.target===this\)(\w+)\(\)"/g,
      'data-action="backdrop-call" data-fn="$1"', 'backdrop-call');

// ──────────────────────────────────────────────────────────────
// 3. Shared helper actions (mirror helper-handlers.js)
// ──────────────────────────────────────────────────────────────
xform(/onclick="closeNavMenu\(\)"/g,       'data-action="nav-close"',     'nav-close');
xform(/onclick="openNavMenu\(\)"/g,        'data-action="nav-open"',      'nav-open');
xform(/onclick="toggleMute\(\)"/g,         'data-action="mute-toggle"',   'mute-toggle');
xform(/onclick="setTheme\('light'\)"/g,    'data-action="theme-set"',     'theme-set light');
xform(/onclick="setTheme\('auto'\)"/g,     'data-action="theme-set"',     'theme-set auto');
xform(/onclick="setTheme\('dark'\)"/g,     'data-action="theme-set"',     'theme-set dark');
xform(/onclick="submitLicenseKey\(\)"/g,   'data-action="license-submit"','license-submit');
xform(/onclick="hideLicenseModal\(\)"/g,   'data-action="license-modal-hide"',        'license-modal-hide');
xform(/onclick="hideLicenseManageModal\(\)"/g, 'data-action="license-manage-modal-hide"','license-manage-modal-hide');
xform(/onclick="replaceLicenseKey\(\)"/g,  'data-action="license-replace"','license-replace');
xform(/onclick="confirmRemoveLicense\(\)"/g,'data-action="license-remove-confirm"','license-remove-confirm');
xform(/onclick="downloadPageAsDocx\(\)"/g, 'data-action="doc-download"',  'doc-download');

// ──────────────────────────────────────────────────────────────
// 4. Modal open/close with explicit ID target
// ──────────────────────────────────────────────────────────────
xform(/onclick="document\.getElementById\('([\w-]+)'\)\.classList\.add\('active'\)"/g,
      'data-action="modal-open" data-target="$1"', 'modal-open (target)');
xform(/onclick="document\.getElementById\('([\w-]+)'\)\.classList\.remove\('active'\)"/g,
      'data-action="modal-close" data-target="$1"', 'modal-close (target)');

// ──────────────────────────────────────────────────────────────
// 5. event.stopPropagation() -> noop
// ──────────────────────────────────────────────────────────────
xform(/onclick="event\.stopPropagation\(\)"/g,
      'data-action="noop"', 'noop (stopPropagation)');

// ──────────────────────────────────────────────────────────────
// 6. Parameterized single-arg calls: funcName('VALUE')
// ──────────────────────────────────────────────────────────────
xform(/onclick="([\w.]+)\('([^']*)'\)"/g,
      'data-action="call" data-fn="$1" data-arg="$2"', 'call(arg)');

// ──────────────────────────────────────────────────────────────
// 7. `this` and `event` argument calls
// ──────────────────────────────────────────────────────────────
xform(/onclick="(\w+)\(this\)"/g,
      'data-action="call" data-fn="$1" data-arg-this="1"', 'call(this)');
xform(/onclick="(\w+)\(event\)"/g,
      'data-action="call" data-fn="$1" data-arg-event="1"', 'call(event)');

// ──────────────────────────────────────────────────────────────
// 8. Multi-statement onclick chains: f1();f2();f3() (no args)
// ──────────────────────────────────────────────────────────────
// Allow optional trailing semicolon ("f1(); f2();" with the trailing
// semi present, which appears in the Save-Template combo and several
// oninput chains).
xform(/onclick="((?:\w+\(\)\s*;\s*)+\w+\(\))\s*;?\s*"/g,
      (_, chain) => {
        const fns = chain.split(';').map(s => s.trim().replace(/\(\)$/, '')).filter(Boolean).join(',');
        return `data-action="call-chain" data-fn="${fns}"`;
      },
      'click call-chain');
// Also handle the onchange variant of `funcName(this)` (icon picker upload)
xform(/onchange="(\w+)\(this\)"/g,
      'data-change-action="call" data-fn="$1" data-arg-this="1"', 'change call(this)');

// ──────────────────────────────────────────────────────────────
// 9. Specific WF_DEBUG.setDeepDive toggle expression — too unique for generic
// ──────────────────────────────────────────────────────────────
xform(/onclick="WF_DEBUG\.setDeepDive\(!WF_DEBUG\.deepDiveOn\)"/g,
      'data-action="call" data-fn="__wfDeepDiveToggle"', 'WF_DEBUG.deepDive toggle (will need bootstrap)');

// ──────────────────────────────────────────────────────────────
// 10. Generic simple zero-arg `funcName()` — catch-all for click
//     Allow dotted: WF_DEBUG.bundleForScout()
// ──────────────────────────────────────────────────────────────
xform(/onclick="([\w.]+)\(\)"/g,
      'data-action="call" data-fn="$1"', 'call() simple');

// ──────────────────────────────────────────────────────────────
// 11. onkeydown patterns
// ──────────────────────────────────────────────────────────────
xform(/onkeydown="if\(event\.key==='Enter'\)\s*submitLicenseKey\(\)"/g,
      'data-key-action="license-submit-on-enter"', 'key license-submit-on-enter');
xform(/onkeydown="if\(event\.key==='Enter'\)\s*submitSettingsLicenseKey\(\)"/g,
      'data-key-action="enter-call" data-fn="submitSettingsLicenseKey"', 'key settings license');
xform(/onkeydown="if\(event\.key==='Enter'\)\s*submitDevPassword\(\)"/g,
      'data-key-action="enter-call" data-fn="submitDevPassword"', 'key dev password');
xform(/onkeydown="if\(event\.key==='Enter'\)\s*\{\s*event\.preventDefault\(\);\s*fetchCustomAIModels\(\);\s*\}"/g,
      'data-key-action="enter-call" data-fn="fetchCustomAIModels" data-prevent-default="1"', 'key fetch custom AI');
xform(/onkeydown="if\(event\.key==='Enter'\)wfPromptOk\(\);\s*else if\(event\.key==='Escape'\)wfPromptCancel\(\)"/g,
      'data-key-action="enter-escape-call" data-fn-enter="wfPromptOk" data-fn-escape="wfPromptCancel"',
      'key wf-prompt enter/escape');

// ──────────────────────────────────────────────────────────────
// 12. oninput patterns
// ──────────────────────────────────────────────────────────────
// Specific multi-statement chains (most common)
xform(/oninput="this\.dataset\.userTyped='true'"/g,
      'data-input-action="set-data" data-key="userTyped" data-value="true"', 'input set-data userTyped');
xform(/oninput="this\.dataset\.userTyped='true';\s*refreshCustomAIIconPreview && refreshCustomAIIconPreview\(\);"/g,
      'data-input-action="call-chain" data-fn="__wfMarkUserTyped,refreshCustomAIIconPreview"',
      'input userTyped+icon');
// Generic multi-statement input chain: f1();f2();f3() (no args)
xform(/oninput="((?:\w+\(\)\s*;\s*)+\w+\(\))\s*;?\s*"/g,
      (_, chain) => {
        const fns = chain.split(';').map(s => s.trim().replace(/\(\)$/, '')).filter(Boolean).join(',');
        return `data-input-action="call-chain" data-fn="${fns}"`;
      },
      'input call-chain');
// Single-arg input call: funcName('VALUE')
xform(/oninput="([\w.]+)\('([^']*)'\)"/g,
      'data-input-action="call" data-fn="$1" data-arg="$2"', 'input call(arg)');
// Generic simple oninput="funcName()"
xform(/oninput="([\w.]+)\(\)"/g,
      'data-input-action="call" data-fn="$1"', 'input call() simple');
// autoFillAIName(this.value); updateChooseModelLink();
xform(/oninput="autoFillAIName\(this\.value\);\s*updateChooseModelLink\(\);"/g,
      'data-input-action="call-chain" data-fn="__wfAutoFillAndChoose"', 'input autoFillAIName chain');

// ──────────────────────────────────────────────────────────────
// 13. onchange patterns
// ──────────────────────────────────────────────────────────────
// Pass this.value (text/select input's value, not the element)
xform(/onchange="([\w.]+)\(this\.value\)"/g,
      'data-change-action="call" data-fn="$1" data-arg-value="1"', 'change call(this.value)');
// Pass this.checked (checkbox/radio boolean state, not the element)
xform(/onchange="([\w.]+)\(this\.checked\)"/g,
      'data-change-action="call" data-fn="$1" data-arg-checked="1"', 'change call(this.checked)');
// Single-arg
xform(/onchange="([\w.]+)\('([^']*)'\)"/g,
      'data-change-action="call" data-fn="$1" data-arg="$2"', 'change call(arg)');
// (event) arg
xform(/onchange="(\w+)\(event\)"/g,
      'data-change-action="call" data-fn="$1" data-arg-event="1"', 'change call(event)');
// Multi-statement chain
xform(/onchange="((?:\w+\(\)\s*;\s*)+\w+\(\))\s*;?\s*"/g,
      (_, chain) => {
        const fns = chain.split(';').map(s => s.trim().replace(/\(\)$/, '')).filter(Boolean).join(',');
        return `data-change-action="call-chain" data-fn="${fns}"`;
      },
      'change call-chain');
// Simple
xform(/onchange="([\w.]+)\(\)"/g,
      'data-change-action="call" data-fn="$1"', 'change call() simple');

// ──────────────────────────────────────────────────────────────
// 14. <img onerror="this.style.display='none'"> -> data-hide-on-error
//     <img onerror="this.style.opacity='0.3'"> -> data-dim-on-error
// ──────────────────────────────────────────────────────────────
xform(/onerror="this\.style\.display='none'"/g,
      'data-hide-on-error', 'img hide-on-error');
xform(/onerror="this\.style\.opacity='0\.3'"/g,
      'data-dim-on-error', 'img dim-on-error');

writeFileSync(file, s);

// Count any remaining inline handlers
const remaining = (s.match(/\son(click|input|change|keydown|keyup|keypress|submit|focus|blur|mousedown|mouseup|mouseover|mouseout|wheel|load|error)\s*=/gi) || []);
console.log(`\n${file}: ${remaining.length} inline handler(s) remaining`);
if (remaining.length && remaining.length <= 50) {
  // Show what's left
  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/\son(click|input|change|keydown|keyup|keypress|submit|focus|blur|mousedown|mouseup|mouseover|mouseout|wheel|load|error)\s*=/i.test(lines[i])) {
      console.log(`  ${i+1}: ${lines[i].trim().slice(0, 200)}`);
    }
  }
}
