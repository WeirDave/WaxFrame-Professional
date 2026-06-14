// ============================================================
//  WaxFrame — templates-page.js
// Build: 20260614-028
//  Catalog rendering for templates.html. Extracted from the
//  formerly-inline <script> block in v3.63.352 so the page can
//  drop 'unsafe-inline' from CSP. Pure renderer + ItemList JSON-LD
//  injection driven by WAXFRAME_TEMPLATES (loaded from
//  js/templates.js earlier in the page).
// ============================================================

// ============================================================
//  Catalog rendering — read-only showcase, no actions.
//  Uses .hp-section primitives for category sections (matching
//  user-manual.html visual system); .tpl-card for the catalog
//  cards inside each section's body.
// ============================================================
'use strict';

const CUSTOM_TEMPLATES_KEY = 'waxframe_custom_templates';
const CATEGORY_ORDER = [
  'Quick Start',
  'Career & Hiring',
  'Business & Sales',
  'Content & Marketing',
  'Personal & Everyday',
  'Reviews & Recommendations'
];

const CATEGORY_BLURBS = {
  'Quick Start':
    'A low-stakes starter project for first-time WaxFrame users. Runs the same full hive flow as any other document — multi-AI rounds, hive convergence, Builder synthesis — on a small, comfortable subject so you can see the engine work end-to-end before committing to something important.',
  'Career & Hiring':
    "Job-search and hiring documents that have to land on a busy reader's desk and earn 30 seconds of real attention. Cover letters, résumés, job descriptions, LinkedIn About sections, thank-you notes — each scaffold is built around the actual decision the reader makes when they finish reading.",
  'Business & Sales':
    'B2B documents where credibility and clarity decide the outcome. Business proposals, executive summaries, cold outreach emails, RFP responses — written to be read by busy decision-makers who reward specificity and tune out marketing language.',
  'Content & Marketing':
    'Publishing-class long-form content with voice intact. Blog posts and articles that earn the click and the share, LinkedIn posts that read as expert peer-talk not thought-leader pose, presentation outlines where every slide carries weight.',
  'Personal & Everyday':
    "Lower-stakes personal projects where the hive's multi-AI review still earns its keep — anything you'd rather not send as a first draft. Useful for one-off documents that don't fit a corporate or career template but deserve a careful read.",
  'Reviews & Recommendations':
    "Review and recommendation documents calibrated for the platform they'll publish on. Generic review templates handle the writing-from-scratch case; platform-specific templates (TripAdvisor, Google Maps, Yelp, Trustpilot, Amazon) take an existing review and rewrite it for that platform's voice, length, and convention."
};

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pathLabel(path) {
  if (path === 'scratch') return 'From scratch';
  if (path === 'refine')  return 'Refine existing';
  return path;
}

function pathPill(path) {
  return `<span class="tpl-path-pill tpl-path-${escapeHtml(path)}">${escapeHtml(pathLabel(path))}</span>`;
}

function loadCustomTemplates() {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function renderTemplateCard(t) {
  const paths = Array.isArray(t.paths) && t.paths.length ? t.paths : ['scratch'];
  const primaryPath = paths[0];
  const primaryContent = (t.pathContent && t.pathContent[primaryPath]) || {};
  const description = primaryContent.description || t.description || '';
  const docType = primaryContent.goalDocType || '';
  const lengthMode = primaryContent.lengthMode;
  const lengthLimit = primaryContent.lengthLimit;
  const lengthMin = primaryContent.lengthMin;
  const lengthUnit = primaryContent.lengthUnit;

  let lengthLabel = '';
  if (lengthMode === 'hardcap' && lengthLimit) {
    lengthLabel = `Up to ${escapeHtml(lengthLimit)} ${escapeHtml(lengthUnit || '')}`.trim();
  } else if (lengthMode === 'range' && lengthMin && lengthLimit) {
    lengthLabel = `${escapeHtml(lengthMin)}–${escapeHtml(lengthLimit)} ${escapeHtml(lengthUnit || '')}`.trim();
  }

  const scaffold = primaryContent.refMaterial || '';
  const scaffoldBlock = scaffold ? `
    <details class="tpl-scaffold">
      <summary class="tpl-scaffold-summary">See the reference scaffold</summary>
      <pre class="tpl-scaffold-body">${escapeHtml(scaffold)}</pre>
    </details>
  ` : '';

  const factsRow = (docType || lengthLabel) ? `
    <div class="tpl-card-facts">
      ${docType ? `<div class="tpl-card-fact"><span class="tpl-card-fact-label">Document type</span><span class="tpl-card-fact-val">${escapeHtml(docType)}</span></div>` : ''}
      ${lengthLabel ? `<div class="tpl-card-fact"><span class="tpl-card-fact-label">Length</span><span class="tpl-card-fact-val">${lengthLabel}</span></div>` : ''}
    </div>
  ` : '';

  const pathsRow = `<div class="tpl-card-paths">${paths.map(pathPill).join('')}</div>`;

  // v3.63.138 — Per-card "View full details" expander. Shows the goal
  // fields (audience / outcome / scope / tone / constraints) that drive
  // how the hive treats this template — visible without bouncing into
  // the app. Falls back gracefully when a field is empty.
  const detailRows = [
    ['Audience',    primaryContent.goalAudience],
    ['Outcome',     primaryContent.goalOutcome],
    ['Scope',       primaryContent.goalScope],
    ['Tone',        primaryContent.goalTone],
    ['Constraints', primaryContent.goalNotes]
  ].filter(([, v]) => typeof v === 'string' && v.trim().length);

  const detailsBlock = detailRows.length ? `
    <details class="tpl-details">
      <summary class="tpl-details-summary">View full details</summary>
      <div class="tpl-details-body">
        ${detailRows.map(([label, val]) => `
          <div class="tpl-details-row">
            <span class="tpl-details-label">${escapeHtml(label)}</span>
            <span class="tpl-details-val">${escapeHtml(val)}</span>
          </div>
        `).join('')}
      </div>
    </details>
  ` : '';

  // v3.63.123 — Cross-link to dedicated use-case landing page for the three SEO targets.
  // v3.63.127 — Reframed as "deep dive" — these landing pages are the WHY
  // (screening reality, why a hive beats one AI, the origin story, what gets
  // edited and what doesn't), not a shorter version of the template itself.
  const LANDING_PAGES = {
    'cover-letter':      { href: 'ai-cover-letter-editor.html', label: '🔍 Deep dive: AI Cover Letter Editor →' },
    'resume':            { href: 'ai-resume-review.html',       label: '🔍 Deep dive: AI Résumé Review →' },
    'business-proposal': { href: 'ai-business-proposal.html',   label: '🔍 Deep dive: AI Business Proposal Writer →' }
  };
  const landing = LANDING_PAGES[t.id];
  const landingLink = landing
    ? `<a class="tpl-card-landing-link" href="${landing.href}" target="_blank" rel="noopener noreferrer">${landing.label}</a>`
    : '';

  // v3.63.138 — Filter haystack baked into a data attribute so the search
  // bar's matcher doesn't have to re-walk DOM text per keystroke. Includes
  // every visible-text field plus category so the catalog is searchable
  // by any of the things a visitor might type.
  const haystack = [
    t.name, t.category, description, docType,
    primaryContent.goalAudience, primaryContent.goalOutcome,
    primaryContent.goalScope, primaryContent.goalTone, primaryContent.goalNotes
  ].filter(Boolean).join(' ').toLowerCase();

  return `
    <article class="tpl-card" id="tpl-${escapeHtml(t.id || '')}" data-tpl-search="${escapeHtml(haystack)}">
      <header class="tpl-card-header">
        <span class="tpl-card-icon" aria-hidden="true">${escapeHtml(t.icon || '📄')}</span>
        <div class="tpl-card-title-wrap">
          <h3 class="tpl-card-title">${escapeHtml(t.name)}</h3>
          ${pathsRow}
        </div>
      </header>
      <p class="tpl-card-desc">${escapeHtml(description)}</p>
      ${factsRow}
      ${detailsBlock}
      ${landingLink}
      ${scaffoldBlock}
    </article>
  `;
}

function catSlug(category) {
  return 'cat-' + String(category).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderCategorySection(category, list) {
  const blurb = CATEGORY_BLURBS[category] || '';
  const id = catSlug(category);
  return `
    <div class="hp-section">
      <div class="hp-section-header is-bare">
        <div class="hp-section-title-block">
          <h2 class="hp-section-title" id="${id}">${escapeHtml(category)} <span class="tpl-cat-count">${list.length} template${list.length === 1 ? '' : 's'}</span></h2>
          ${blurb ? `<p class="hp-section-sub">${escapeHtml(blurb)}</p>` : ''}
        </div>
      </div>
      <div class="hp-section-body">
        <div class="tpl-grid">${list.map(renderTemplateCard).join('')}</div>
        <div class="tpl-section-cta">
          <a href="index.html" class="tpl-section-cta-btn">Start a project in WaxFrame →</a>
        </div>
        <a href="#top" class="wh-back-top">↑ Back to top</a>
      </div>
    </div>
  `;
}

function renderBuiltIn() {
  const body = document.getElementById('tplBuiltInBody');
  const tpls = (typeof WAXFRAME_TEMPLATES !== 'undefined' && Array.isArray(WAXFRAME_TEMPLATES)) ? WAXFRAME_TEMPLATES : [];

  if (tpls.length === 0) {
    body.innerHTML = '<div class="hp-section"><div class="hp-section-body"><p>Template data failed to load. Refresh the page or report the issue.</p></div></div>';
    return;
  }

  const byCat = {};
  for (const t of tpls) {
    const cat = t.category || 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(t);
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter(c => byCat[c]),
    ...Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c)).sort()
  ];

  body.innerHTML = orderedCats.map(cat => {
    const list = byCat[cat].slice().sort((a, b) => a.name.localeCompare(b.name));
    return renderCategorySection(cat, list);
  }).join('');
}

function renderCustom() {
  const body = document.getElementById('tplCustomBody');
  const customs = loadCustomTemplates();
  if (customs.length === 0) { body.innerHTML = ''; return; }

  const list = customs.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  body.innerHTML = `
    <div class="hp-section">
      <div class="hp-section-header is-bare">
        <div class="hp-section-title-block">
          <h2 class="hp-section-title" id="cat-custom">Your Saved Templates <span class="tpl-cat-count">${list.length} template${list.length === 1 ? '' : 's'}</span></h2>
          <p class="hp-section-sub">Templates you've saved from your own finished WaxFrame projects, stored in this browser. Manage these inside the WaxFrame app from the Project setup screen.</p>
          <div class="tpl-custom-actions">
            <button class="tpl-export-all-btn" id="tplExportAllBtn" type="button" title="Export every saved template as a single .zip">⬆ Export all as .zip</button>
          </div>
        </div>
      </div>
      <div class="hp-section-body">
        <div class="tpl-grid">${list.map(renderTemplateCard).join('')}</div>
        <div class="tpl-section-cta">
          <a href="index.html" class="tpl-section-cta-btn">Open WaxFrame and apply one of these →</a>
        </div>
        <a href="#top" class="wh-back-top">↑ Back to top</a>
      </div>
    </div>
  `;

  // Reveal the "Your Templates" sidebar group now that the section exists.
  // Inline display: '' clears the inline style="display:none" defaults
  // set in the hardcoded sidebar markup. Audited inline-style exception.
  const sbCat = document.getElementById('sbCustomCategory');
  const sbLink = document.getElementById('sbCustomLink');
  if (sbCat)  sbCat.style.display  = '';
  if (sbLink) sbLink.style.display = '';

  const btn = document.getElementById('tplExportAllBtn');
  if (btn) btn.addEventListener('click', exportAllCustomsAsZip);
}

// ============================================================
//  v3.63.138 — Catalog search/filter.
//  Operates on the rendered cards via the data-tpl-search attribute
//  the card renderer bakes in. Each keystroke walks the cards once,
//  toggles a `is-hidden` class, then collapses any category section
//  whose cards are all hidden. O(n) on cards which is fine here —
//  the full catalog is under 60 templates.
// ============================================================
function applyTemplateFilter() {
  const input = document.getElementById('tplSearchInput');
  const clear = document.getElementById('tplSearchClear');
  const count = document.getElementById('tplSearchCount');
  if (!input || !clear || !count) return;

  const raw = input.value.trim();
  const needle = raw.toLowerCase();
  const cards = document.querySelectorAll('.tpl-card[data-tpl-search]');

  let total = 0, shown = 0;
  cards.forEach(card => {
    total++;
    const hay = card.getAttribute('data-tpl-search') || '';
    const match = needle === '' || hay.indexOf(needle) !== -1;
    card.classList.toggle('is-hidden', !match);
    if (match) shown++;
  });

  // Collapse category sections that no longer have any visible cards
  // so the page doesn't show empty "X templates" headers.
  document.querySelectorAll('.tpl-grid').forEach(grid => {
    const section = grid.closest('.hp-section');
    if (!section) return;
    const anyVisible = grid.querySelector('.tpl-card:not(.is-hidden)');
    section.classList.toggle('is-empty-by-filter', !anyVisible);
  });

  clear.hidden = raw === '';
  count.textContent = raw === ''
    ? ''
    : `${shown} of ${total} match${shown === 1 ? '' : 'es'}`;
}

function clearTemplateFilter() {
  const input = document.getElementById('tplSearchInput');
  if (!input) return;
  input.value = '';
  applyTemplateFilter();
  input.focus();
}

function wireUpSearch() {
  const input = document.getElementById('tplSearchInput');
  const clear = document.getElementById('tplSearchClear');
  if (input) input.addEventListener('input', applyTemplateFilter);
  if (clear) clear.addEventListener('click', clearTemplateFilter);
}

// ============================================================
//  v3.63.138 — Bulk Export All custom templates as a .zip.
//  Each template gets wrapped in the same envelope shape the
//  in-app exportCustomTemplate() produces, so a downloaded
//  archive's files are drop-in importable via the in-app
//  Import action. Filename convention mirrors the per-template
//  exporter ({slug}-{YYYYMMDD-HHmm}-template.json) so users
//  can pluck single files back out and recognize what they are.
// ============================================================
function _wfTemplateStampLocal() {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function _wfSlugLocal(s) {
  return String(s || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
}

async function exportAllCustomsAsZip() {
  const btn = document.getElementById('tplExportAllBtn');
  if (typeof JSZip === 'undefined') {
    alert('Export library failed to load. Refresh the page and try again.');
    return;
  }
  const customs = loadCustomTemplates();
  if (!customs.length) {
    alert('You have no saved custom templates to export yet.');
    return;
  }

  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Bundling…'; }

  try {
    const zip = new JSZip();
    const stamp = _wfTemplateStampLocal();
    const appVer = (typeof APP_VERSION === 'string') ? APP_VERSION : '';
    const usedNames = new Set();

    customs.forEach((tpl, idx) => {
      const envelope = {
        _waxframe_template:         true,
        _waxframe_template_version: 1,
        _waxframe_app_version:      appVer,
        exportedTs:                 Date.now(),
        template:                   tpl
      };
      const base = (tpl.srcName ? _wfSlugLocal(tpl.srcName) + (tpl.srcVersion ? '-' + _wfSlugLocal(tpl.srcVersion) : '') : _wfSlugLocal(tpl.name)) || `template-${idx + 1}`;
      let name = `${base}-${stamp}-template.json`;
      // De-dupe within the archive — two customs sharing a slug would
      // otherwise overwrite each other inside the zip.
      let suffix = 2;
      while (usedNames.has(name)) {
        name = `${base}-${stamp}-${suffix}-template.json`;
        suffix++;
      }
      usedNames.add(name);
      zip.file(name, JSON.stringify(envelope, null, 2));
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waxframe-custom-templates-${stamp}.zip`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch (e) {}
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (e) {
    alert('Export failed: ' + (e && e.message ? e.message : 'unknown error'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel || '⬆ Export all as .zip'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.app-version-stamp').forEach(el => { el.textContent = APP_VERSION; });
  renderBuiltIn();
  renderCustom();
  wireUpSearch();
  injectJsonLd();
  const targetId = window.location.hash ? window.location.hash.slice(1) : '';
  if (targetId) {
    setTimeout(() => {
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ block: 'start' });
    }, 0);
  }
});

// ============================================================
//  Structured data (JSON-LD) — schema.org ItemList of templates.
//  Renders an ItemList where each ListItem is a CreativeWork
//  describing one template. Eligible for Google rich-snippet
//  treatment ("Document templates from WaxFrame" carousel).
//  Runtime-rendered so the list stays in sync with templates.js
//  without maintaining a parallel static block. Googlebot
//  executes JS so this is crawlable.
// ============================================================
function injectJsonLd() {
  const tpls = (typeof WAXFRAME_TEMPLATES !== 'undefined' && Array.isArray(WAXFRAME_TEMPLATES)) ? WAXFRAME_TEMPLATES : [];
  if (tpls.length === 0) return;

  // Order categories the same way the page renders them, then templates alpha.
  const byCat = {};
  for (const t of tpls) {
    const cat = t.category || 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(t);
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter(c => byCat[c]),
    ...Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c)).sort()
  ];

  const items = [];
  let position = 1;
  for (const cat of orderedCats) {
    const list = byCat[cat].slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const t of list) {
      const paths = Array.isArray(t.paths) && t.paths.length ? t.paths : ['scratch'];
      const primaryContent = (t.pathContent && t.pathContent[paths[0]]) || {};
      const description = primaryContent.description || t.description || '';
      items.push({
        '@type': 'ListItem',
        position: position++,
        item: {
          '@type': 'CreativeWork',
          name: t.name,
          description: description,
          genre: cat,
          inLanguage: 'en',
          url: `https://waxframe.com/templates.html#tpl-${t.id}`,
          isPartOf: {
            '@type': 'WebPage',
            name: 'WaxFrame Document Templates',
            url: 'https://waxframe.com/templates.html'
          }
        }
      });
    }
  }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'WaxFrame Document Templates',
    description: 'Curated document templates for cover letters, résumés, business proposals, RFP responses, product reviews, and more.',
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
}
