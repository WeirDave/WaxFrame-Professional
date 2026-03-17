// ============================================================
//  AI Hive — app.js
// ============================================================

// ── PHASES ──
const PHASES = [
  { id: 'draft',   label: '1 · Draft',       icon: '✏️' },
  { id: 'refine',  label: '2 · Refine Text', icon: '🔁' },
  { id: 'review',  label: '3 · User Review', icon: '👤' },
];

// ── DEFAULT AI LIST ──
const DEFAULT_AIS = [
  { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chatgpt.com',           icon: 'images/chatgpt.ico',    active: true },
  { id: 'claude',     name: 'Claude',     url: 'https://claude.ai',             icon: 'images/claude.ico',     active: true },
  { id: 'copilot',    name: 'Copilot',    url: 'https://copilot.microsoft.com', icon: 'images/copilot.ico',    active: true },
  { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com',     icon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64', active: true },
  { id: 'grok',       name: 'Grok',       url: 'https://grok.com',              icon: 'https://www.google.com/s2/favicons?domain=grok.com&sz=64', active: true },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai',     icon: 'images/perplexity.ico', active: true },
];

// ── STATE ──
let aiList        = JSON.parse(JSON.stringify(DEFAULT_AIS));
let round         = 1;
let phase         = 'draft';
let builder       = null;
let history       = [];
let feedbackBlock = '';

// ── LOCALSTORAGE ──
const LS = 'aihive_state';

function saveState() {
  const state = {
    round, phase, builder, history, aiList,
    projectVersion: document.getElementById('projectVersion')?.value || '',
    projectName: document.getElementById('projectName')?.value || '',
    projectGoal: document.getElementById('projectGoal')?.value || '',
    prompt:      document.getElementById('masterPrompt')?.value || '',
    sendBlock:   document.getElementById('sendBlock')?.value || '',
    responses:   {}
  };
  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    if (ta) state.responses[ai.id] = ta.value;
  });
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) { renderAll(); renderPhaseBar(); return; }
    const s = JSON.parse(raw);
    round   = s.round   || 1;
    phase   = s.phase   || 'draft';
    history = s.history || [];
    if (s.aiList && s.aiList.length) aiList = s.aiList;
    const savedBuilder = s.builder || null;
    builder = (savedBuilder && aiList.find(ai => ai.id === savedBuilder)) ? savedBuilder : null;

    renderAll();
    renderPhaseBar();

    if (s.projectVersion) { const pv = document.getElementById('projectVersion'); if (pv) pv.value = s.projectVersion; }
    if (s.projectName) document.getElementById('projectName').value = s.projectName;
    if (s.projectGoal) { const g = document.getElementById('projectGoal'); if (g) g.value = s.projectGoal; }
    document.getElementById('masterPrompt').value = s.prompt    || '';

    document.getElementById('sendBlock').value    = s.sendBlock || '';
    const _rn = document.getElementById('roundNum'); if (_rn) _rn.textContent = round;

    getActiveAIs().forEach(ai => {
      const ta = document.getElementById('r-' + ai.id);
      if (ta) ta.value = s.responses?.[ai.id] || '';
      updateMeta(ai.id);
    });

    applyBuilderUI(builder);
    renderHistory();
    updateBackButton();
    updateStatusBar();
    renderPhaseTabs();
  } catch(e) { renderAll(); renderPhaseBar(); }
}

function clearState() {
  if (!confirm('Start a new session? This clears everything and resets to defaults.')) return;
  round         = 1;
  phase         = 'draft';
  builder       = null;
  history       = [];
  feedbackBlock = '';
  aiList        = JSON.parse(JSON.stringify(DEFAULT_AIS));
  localStorage.removeItem(LS);

  renderAll();
  renderPhaseBar();

  const _pv = document.getElementById('projectVersion'); if (_pv) _pv.value = '';
  document.getElementById('projectName').value  = '';
  const _pg = document.getElementById('projectGoal'); if (_pg) _pg.value = '';
  document.getElementById('masterPrompt').value = '';
  document.getElementById('sendBlock').value    = '';
  const _rn2 = document.getElementById('roundNum'); if (_rn2) _rn2.textContent = 1;

  // Explicitly clear all response cards after renderAll
  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    if (ta) { ta.value = ''; updateMeta(ai.id); }
  });

  applyBuilderUI(null);
  renderHistory();
  renderPhaseTabs();
  saveState();
  updateStatusBar();
  toast('🆕 New session started');
}

// ── HELPERS ──
function getActiveAIs() { return aiList.filter(ai => ai.active); }
function getAI(id)      { return aiList.find(ai => ai.id === id); }

function getProjectName() {
  return document.getElementById('projectName')?.value.trim() || 'AI-Hive';
}

function getProjectGoal() {
  return document.getElementById('projectGoal')?.value.trim() || '';
}

function getProjectVersion() {
  return document.getElementById('projectVersion')?.value.trim() || '';
}

// ── PHASE BAR ──
function renderPhaseBar() {
  const bar = document.getElementById('phaseBar');
  if (!bar) return;
  const currentIdx = PHASES.findIndex(p => p.id === phase);
  bar.innerHTML = PHASES.map((p, i) => {
    const cls = i < currentIdx ? 'phase-pip done' : i === currentIdx ? 'phase-pip active' : 'phase-pip';
    return (i > 0 ? '<span class="phase-arrow">›</span>' : '') +
      `<span class="${cls}" onclick="setPhase('${p.id}')" title="Jump to phase">${p.label}</span>`;
  }).join('');
  renderPhaseTabs();
}

function renderPhaseTabs() {
  const tabs = document.getElementById('phaseTabs');
  if (!tabs) return;
  tabs.innerHTML = `<div class="phase-select-wrap">
    <select class="phase-select" onchange="setPhaseTab(this.value)">
      ${PHASES.map(p => `<option value="${p.id}" ${p.id === phase ? 'selected' : ''}>${p.icon} ${p.label}</option>`).join('')}
    </select>
  </div>`;
  loadPhaseInstructions();
}

function setPhaseTab(id) {
  phase = id;
  renderPhaseBar();
  saveState();
  updateStatusBar();
  toast(`📍 Phase: ${PHASES.find(p => p.id === id)?.label}`);
}

// Default instructions per phase
const DEFAULT_PHASE_INSTRUCTIONS = {

  draft_scratch: `You are part of a multi-AI collaboration called AI Hive.

Your task: Create a complete first draft based on the project goal provided above.

RULES:
- Text only — no markdown, no headers, no bullet formatting
- Return the full document, nothing else
- Write as if this is the only version that will be reviewed`,

  draft_refine: `You are part of a multi-AI collaboration called AI Hive.

The user has provided a starting document above. Your task: review it and give specific, numbered suggestions for improvement.

RULES:
- Do NOT rewrite the document
- Give numbered suggestions only: "Change X to Y", "Add a section about Z", "Remove the line about W"
- Focus on content and clarity only — ignore formatting entirely
- If a section is already strong, say so`,

  refine: `You are in the text refinement phase of a multi-AI collaboration called AI Hive.

Review the current document above and give specific, numbered suggestions to improve it.

RULES:
- Do NOT rewrite the document
- Numbered suggestions only: clarity, word choice, logical flow, anything that sounds off
- No formatting suggestions — text content only
- If you believe the text needs no further changes, say exactly: NO CHANGES NEEDED

⚠️ IMPORTANT: Do NOT return a rewritten or full document. If you return a full document instead of numbered suggestions, your response will be discarded.`,

  review: `You are the Builder in this AI Hive collaboration.

The team has been refining this document and the user is ready for a review copy.

Your task: Produce the complete, clean current version of the document incorporating all the suggestions and refinements discussed so far.

RULES:
- Return the full document — every section, complete
- Text only, no formatting
- This is what the user will read, edit, and return for final refinement`,

};

// Builder instructions — used when responses are present (Builder compiles the updated doc)
const BUILDER_INSTRUCTIONS = {
  refine: `You are the Builder in this AI Hive collaboration.

All reviewer suggestions are included above. Your task: produce the complete updated document incorporating all valid suggestions.

RULES:
- Return the FULL document — every section, complete
- Text only, no markdown formatting
- Structure your response EXACTLY like this:

[DOCUMENT START]
...the complete updated document here...
[DOCUMENT END]

[CONFLICTS START]
List any conflicting suggestions here — what each AI suggested, which you chose, and why.
If there are no conflicts write: NO CONFLICTS
[CONFLICTS END]

- Everything between [DOCUMENT START] and [DOCUMENT END] is the clean document to paste back
- Everything between [CONFLICTS START] and [CONFLICTS END] is for the user to review`,

  draft: `You are the Builder in this AI Hive collaboration.

All reviewer drafts are included above. Your task: produce the single best consolidated first draft.

RULES:
- Return the FULL document — every section, complete
- Take the best elements from each draft
- Text only, no markdown formatting
- Structure your response EXACTLY like this:

[DOCUMENT START]
...the complete first draft here...
[DOCUMENT END]

[CONFLICTS START]
List any major structural or approach conflicts between the drafts here.
If there are no conflicts write: NO CONFLICTS
[CONFLICTS END]`,

  review: `You are the Builder in this AI Hive collaboration.

The user has reviewed the document and provided their edits. Your task: produce the complete updated document incorporating the user's changes plus any reviewer suggestions.

RULES:
- Return the FULL document — every section, complete
- Honor the user's intent — their edits take priority
- Text only, no markdown formatting
- Structure your response EXACTLY like this:

[DOCUMENT START]
...the complete updated document here...
[DOCUMENT END]

[CONFLICTS START]
List any cases where reviewer suggestions conflicted with the user's edits.
If there are no conflicts write: NO CONFLICTS
[CONFLICTS END]`,

};

// Per-phase edits saved by user
const phaseEdits = {};

function loadPhaseInstructions() {
  const ta = document.getElementById('phaseInstructions');
  if (!ta) return;
  if (phase === 'draft') {
    const doc = document.getElementById('masterPrompt')?.value.trim() || '';
    const key = !doc ? 'draft_scratch' : 'draft_refine';
    ta.value = phaseEdits[phase] !== undefined ? phaseEdits[phase] : DEFAULT_PHASE_INSTRUCTIONS[key] || '';
  } else {
    ta.value = phaseEdits[phase] !== undefined ? phaseEdits[phase] : DEFAULT_PHASE_INSTRUCTIONS[phase] || '';
  }
}

function savePhaseInstruction() {
  const ta = document.getElementById('phaseInstructions');
  if (!ta) return;
  phaseEdits[phase] = ta.value;
}

function getPhasePrompt() {
  savePhaseInstruction();
  if (phase === 'draft') {
    const doc = document.getElementById('masterPrompt')?.value.trim() || '';
    const key = !doc ? 'draft_scratch' : 'draft_refine';
    return phaseEdits[phase] !== undefined ? phaseEdits[phase] : DEFAULT_PHASE_INSTRUCTIONS[key] || '';
  }
  return phaseEdits[phase] !== undefined ? phaseEdits[phase] : DEFAULT_PHASE_INSTRUCTIONS[phase] || '';
}

function setPhase(id) {
  phase = id;
  renderPhaseBar();
  saveState();
  updateStatusBar();
  toast(`📍 Phase: ${PHASES.find(p => p.id === id)?.label}`);
}

// ── RENDER ──
function renderAll() {
  // Capture current response values before rebuilding DOM
  const saved = {};
  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    if (ta) saved[ai.id] = ta.value;
  });
  renderAIPanel();
  renderResponsePanels();
  // Restore response values after DOM rebuild
  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    if (ta && saved[ai.id]) { ta.value = saved[ai.id]; updateMeta(ai.id); }
  });
}

function renderAIPanel() {
  const container = document.getElementById('aiPanelList');
  if (!container) return;
  container.innerHTML = aiList.map(ai => `
    <div class="ai-row ${ai.id === builder ? 'is-builder' : ''}" id="row-${ai.id}">
      <label class="ai-checkbox-wrap" title="${ai.active ? 'Deactivate' : 'Activate'}">
        <input type="checkbox" ${ai.active ? 'checked' : ''} onchange="toggleAI('${ai.id}', this.checked)">
      </label>
      <div class="ai-row-label ${!ai.active ? 'ai-inactive' : ''}">
        <img src="${ai.icon}" class="ai-icon${ai.invert ? ' ai-icon-invert' : ''}" onerror="this.style.display='none'">
        <span class="ai-name">${ai.name}</span>
      </div>
      <div class="ai-row-actions">
        <button class="ai-act builder-btn" id="setbuild-${ai.id}" onclick="setBuilder('${ai.id}')"
          style="${ai.id === builder ? 'color:var(--accent);' : ''}" title="Set as Builder">
          ${ai.id === builder
            ? '<span style="font-size:13px;line-height:1;">👑</span><span>Builder</span>'
            : '<span>Set</span><span>Builder</span>'}
        </button>
        <button class="ai-act ai-act-icon" onclick="openAI('${ai.id}')" title="Open ${ai.name}">↗</button>
        <button class="ai-act remove-btn" onclick="removeAI('${ai.id}')" title="Remove">✕</button>
      </div>
    </div>
  `).join('');
}

function renderResponsePanels() {
  const container = document.getElementById('responsePanels');
  if (!container) return;
  const active = getActiveAIs();
  container.innerHTML = active.map(ai => `
    <div class="resp-card ${ai.id === builder ? 'is-builder' : ''}" id="panel-${ai.id}">
      <div class="resp-card-header">
        <img src="${ai.icon}" class="resp-card-icon${ai.invert ? ' resp-card-icon-invert' : ''}" onerror="this.style.display='none'">
        <div class="resp-card-name">${ai.name}</div>
        ${ai.id === builder ? '<div class="resp-card-builder-badge"><span style="font-size:14px;">👑</span><span>Builder</span></div>' : ''}
        <div class="resp-card-status" id="cnt-${ai.id}">Waiting…</div>
      </div>
      <textarea id="r-${ai.id}" class="resp-card-ta" placeholder="Ctrl+V to paste response" oninput="updateMeta('${ai.id}')"></textarea>
      <div class="resp-card-actions">
        <button class="resp-btn" onclick="clearResp('${ai.id}')">✕ Clear</button>
      </div>
    </div>
  `).join('');
}

// ── TOGGLE ALL / TOGGLE ONE ──
function toggleAllAIs(active) {
  aiList.forEach(ai => {
    if (!active && ai.id === builder) return;
    ai.active = active;
  });
  renderAll();
  applyBuilderUI(builder);
  saveState();
  toast(active ? '🐝 All bees are in the hive' : '😴 All bees sitting out (except Builder)');
}

function toggleAI(id, active) {
  const ai = getAI(id);
  if (!ai) return;
  if (!active && id === builder) {
    toast(`⚠️ ${ai.name} is the Builder — set a different Builder first`);
    const cb = document.querySelector(`#row-${id} input[type=checkbox]`);
    if (cb) cb.checked = true;
    return;
  }
  ai.active = active;
  renderAll();
  applyBuilderUI(builder);
  saveState();
  toast(active ? `🐝 ${ai.name} is back in the hive` : `😴 ${ai.name} is sitting this round out`);
}

// ── ADD / REMOVE AI ──
function showAddAI() {
  const existing = document.getElementById('addAIForm');
  if (existing) { existing.remove(); return; }
  const form = document.createElement('div');
  form.id = 'addAIForm';
  form.className = 'add-ai-form';
  form.innerHTML = `
    <div style="font-size:var(--text-sm);font-weight:600;color:var(--text);margin-bottom:8px;">🐝 Add a new worker bee</div>
    <input id="newAIName" type="text" placeholder="Name (e.g. DeepSeek)" maxlength="30">
    <input id="newAIUrl"  type="text" placeholder="URL (e.g. https://chat.deepseek.com)" style="margin-top:6px;">
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button class="btn btn-accent btn-sm" style="flex:1;justify-content:center;" onclick="addAI()">Add to Hive</button>
      <button class="btn btn-ghost  btn-sm" onclick="document.getElementById('addAIForm').remove()">Cancel</button>
    </div>
  `;
  document.getElementById('aiPanelList').after(form);
  document.getElementById('newAIName').focus();
}

function addAI() {
  const name = document.getElementById('newAIName').value.trim();
  const url  = document.getElementById('newAIUrl').value.trim();
  if (!name) { toast('⚠️ Enter a name'); return; }
  if (!url || !url.startsWith('http')) { toast('⚠️ Enter a valid URL starting with http'); return; }
  const id   = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  const origin = new URL(url).origin;
  const icon = `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
  aiList.push({ id, name, url, icon, active: true });
  document.getElementById('addAIForm')?.remove();
  renderAll();
  applyBuilderUI(builder);
  saveState();
  toast(`🐝 ${name} is now in the hive!`);
}

function removeAI(id) {
  const ai = getAI(id);
  if (!ai) return;
  if (aiList.length <= 1) { toast('⚠️ Need at least one AI'); return; }
  if (!confirm(`Remove ${ai.name}?`)) return;
  aiList = aiList.filter(a => a.id !== id);
  if (builder === id) builder = null;
  renderAll();
  applyBuilderUI(builder);
  saveState();
  toast(`🗑 ${ai.name} removed`);
}

function resetToDefaults() {
  if (!confirm('Reset AI list to the 6 defaults?')) return;
  aiList = JSON.parse(JSON.stringify(DEFAULT_AIS));
  builder = null;
  renderAll();
  applyBuilderUI(null);
  saveState();
  toast('↺ Reset to default AIs');
}

// ── PROMPT ──
function clearPrompt() {
  document.getElementById('masterPrompt').value = '';
  saveState();
}

function copyAll() {
  const p = document.getElementById('masterPrompt').value.trim();
  if (!p) { toast('⚠️ Write a prompt first'); return; }
  navigator.clipboard.writeText(p).then(() => toast('📋 Copied — paste into each AI tab in your browser'));
}

function openAI(id) {
  const ai = getAI(id);
  if (ai) window.open(ai.url, '_blank');
}

// ── RESPONSES ──
function updateMeta(id) {
  const el   = document.getElementById('cnt-' + id);
  const ta   = document.getElementById('r-' + id);
  const card = document.getElementById('panel-' + id);
  if (!el || !ta) return;
  const len = ta.value.trim().length;
  const filled = len > 0;
  el.textContent = filled ? len.toLocaleString() + ' chars' : 'Waiting…';
  el.className = 'resp-card-status' + (filled ? ' filled' : '');
  if (card) card.classList.toggle('is-filled', filled);
  updateStatusBar();
}

function clearResp(id) {
  const ta = document.getElementById('r-' + id);
  if (!ta) return;
  ta.value = '';
  updateMeta(id);
  saveState();
}

function getResponses() {
  const out = {};
  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    out[ai.id] = ta ? ta.value.trim() : '';
  });
  return out;
}

// ── BUILDER ──
function setBuilder(id) {
  const ai = getAI(id);
  if (!ai) return;
  if (!ai.active) ai.active = true;
  builder = id;
  renderAll();
  applyBuilderUI(id);
  toast(`👑 ${ai.name} is now the Document Builder`);
  if (feedbackBlock) buildSendBlock();
  saveState();
}

function applyBuilderUI(id) {
  aiList.forEach(ai => {
    const row   = document.getElementById('row-' + ai.id);
    const panel = document.getElementById('panel-' + ai.id);
    const btn   = document.getElementById('setbuild-' + ai.id);
    const isB   = id !== null && ai.id === id;
    if (row)   row.classList.toggle('is-builder', isB);
    if (panel) {
      panel.classList.toggle('is-builder', isB);
      // Update crown in header
      const hdr = panel.querySelector('.resp-card-header');
      if (hdr) {
        const existing = hdr.querySelector('.resp-card-crown');
        if (isB && !existing) {
          const crown = document.createElement('span');
          crown.className = 'resp-card-crown';
          crown.textContent = '👑';
          hdr.appendChild(crown);
        } else if (!isB && existing) {
          existing.remove();
        }
      }
    }
    if (btn) {
      btn.innerHTML = isB
        ? '<span style="font-size:13px;line-height:1;">👑</span><span>Builder</span>'
        : '<span>Set</span><span>Builder</span>';
      btn.style.color = isB ? 'var(--accent)' : '';
    }
  });
}


// ── DYNAMIC BUILD BUTTON ──
function updateBuildButton() {
  const btn = document.getElementById('buildPromptBtn');
  if (!btn) return;
  const ico = (e, t) => `<span style="font-size:20px;line-height:1;">${e}</span> ${t}`;
  const doc   = document.getElementById('masterPrompt')?.value.trim() || '';
  const resp  = getResponses();
  const filled = getActiveAIs().filter(ai => resp[ai.id] && resp[ai.id].length > 0);
  const hasDoc  = doc.length > 0;
  const hasResp = filled.length > 0;
  const builderName = builder ? getAI(builder)?.name || 'Builder' : 'Builder';

  if (phase === 'format') {
    btn.innerHTML = ico('🎨', 'Build Prompt [Send to All]');
    btn.title = 'Each AI produces their own formatted document version for you to compare';
  } else if (!hasDoc && !hasResp) {
    btn.innerHTML = ico('✨', 'Build Prompt [Send to All]');
    btn.title = 'Asks all AIs to create a first draft from your project goal';
  } else if (hasResp) {
    btn.innerHTML = ico('👑', 'Build Prompt [Send to Builder]');
    btn.title = 'Compiles all responses and asks your Builder to produce the updated document';
  } else {
    btn.innerHTML = ico('📤', 'Build Prompt [Send to All]');
    btn.title = 'Sends the current document to all AIs asking for numbered suggestions';
  }
}

// ── BUILD SEND BLOCK ──
function buildSendBlock() {
  const resp      = getResponses();
  const doc       = document.getElementById('masterPrompt').value.trim();
  const active    = getActiveAIs();
  const filled    = active.filter(ai => resp[ai.id] && resp[ai.id].length > 0);
  const curPhase  = PHASES.find(p => p.id === phase);
  const sep       = '─'.repeat(60);
  const eq        = '═'.repeat(60);
  const projectName = getProjectName();
  const projectGoal = getProjectGoal();
  const phasePrompt = getPhasePrompt();
  const isScratch = !doc; // no document = starting from scratch

  // Guards: review phase just needs the document; scratch needs nothing; others need doc or responses
  if (phase === 'review' && !doc) {
    toast('⚠️ Paste the current document first so the Builder can compile it');
    return;
  }
  if (!isScratch && phase !== 'review' && filled.length === 0 && !doc) {
    toast('⚠️ Paste a document or at least one response first');
    return;
  }

  // Only include project goal in draft phase — later phases don't need it
  const goalLine = (projectGoal && phase === 'draft') ? `PROJECT GOAL:\n${sep}\n${projectGoal}\n\n` : '';

  // Phase 3 (User Review) — Builder-only prompt, no responses needed
  const isReviewPhase = phase === 'review';

  let header = `${eq}\n  AI HIVE — ${projectName.toUpperCase()}\n  Round ${round} · Phase: ${curPhase?.label || phase}\n${eq}\n\n` +
    goalLine;

  const builderName = builder ? getAI(builder)?.name || 'your Builder AI' : 'your Builder AI';
  const isBuilderPrompt = filled.length > 0 && !isReviewPhase && phase !== 'format';

  if (isReviewPhase) {
    // Phase 3 — Builder only, produce clean document
    header += (doc ? `CURRENT DOCUMENT:\n${sep}\n${doc}\n\n` : '');
    header += `${sep}\n⚠️ SEND THIS TO ${builderName.toUpperCase()} ONLY\n${sep}\n\n`;
  } else if (isScratch) {
    // Scratch — phasePrompt has create instructions, no doc needed
    header += `${sep}\nSEND TO ALL AIs\n${sep}\n\n`;
  } else if (phase === 'format') {
    // Format phase — send to all AIs, each produces their own formatted version
    header += (doc ? `CURRENT DOCUMENT:\n${sep}\n${doc}\n\n` : '');
    header += `${sep}\nSEND TO ALL AIs — each produces their own formatted document version\n${sep}\n\n`;
  } else if (isBuilderPrompt) {
    // Has responses — Builder compiles them into updated doc
    header += (doc ? `CURRENT DOCUMENT:\n${sep}\n${doc}\n\n` : '');
    header += filled.map(ai => `${sep}\nFROM ${ai.name.toUpperCase()}:\n${sep}\n${resp[ai.id]}\n\n`).join('');
    header += `${sep}\n⚠️ SEND THIS TO ${builderName.toUpperCase()} ONLY — produce the complete updated document\n${sep}\n\n`;
  } else {
    // Doc only, no responses — send to all AIs for review
    header += (doc ? `CURRENT DOCUMENT:\n${sep}\n${doc}\n\n` : '');
    header += `${sep}\nSEND TO ALL AIs\n${sep}\n\n`;
  }

  // Use builder instructions when we have responses, reviewer instructions otherwise
  const finalInstructions = isBuilderPrompt
    ? (BUILDER_INSTRUCTIONS[phase] || phasePrompt)
    : phasePrompt;

  feedbackBlock = header +
    `${eq}\n  INSTRUCTIONS FOR THIS PHASE\n${eq}\n` +
    finalInstructions;

  document.getElementById('sendBlock').value = feedbackBlock;
  saveState();
  updateStatusBar();
  toast('⚡ Prompt ready — copy and paste into all AI tabs');
}

function buildAndCopy() {
  buildSendBlock();
  // Small delay to let buildSendBlock finish writing to the textarea
  setTimeout(() => {
    const text = document.getElementById('sendBlock').value.trim();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      updateStatusBar();
      toast('✅ Built and copied — paste into AI tabs');
    }).catch(() => {
      toast('⚡ Built — click Copy if clipboard was blocked');
    });
  }, 100);
}

// ── NEXT ROUND ──
function buildAndAdvance() {
  const resp   = getResponses();
  const prompt = document.getElementById('masterPrompt').value.trim();
  const filled = getActiveAIs().filter(ai => resp[ai.id] && resp[ai.id].length > 0);

  if (filled.length === 0 && !prompt) { toast('⚠️ Nothing to save for this round'); return; }

  // Save current send block content (whatever is there)
  const currentSendBlock = document.getElementById('sendBlock').value;

  history.push({
    round, phase,
    projectName: getProjectName(),
    prompt,
    responses:  { ...resp },
    sendBlock:  currentSendBlock,
    timestamp:  new Date().toLocaleTimeString()
  });

  round++;
  const _rn = document.getElementById('roundNum'); if (_rn) _rn.textContent = round;
  // Move compiled prompt into working doc for next round
  document.getElementById('masterPrompt').value = currentSendBlock || prompt || '';

  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    if (ta) ta.value = '';
    updateMeta(ai.id);
  });

  document.getElementById('sendBlock').value = '';
  feedbackBlock = '';

  renderAll();
  renderHistory();
  updateBackButton();
  saveState();
  updateStatusBar();
  toast(`✅ Round ${round} started!`);
}

// ── BACK ONE ROUND ──
function goBackRound() {
  if (history.length === 0) { toast('⚠️ No previous round to go back to'); return; }
  if (!confirm('Go back to Round ' + history[history.length - 1].round + '? Current round will be lost.')) return;

  const h = history.pop();
  round = h.round;
  phase = h.phase || 'draft';

  const _rn = document.getElementById('roundNum'); if (_rn) _rn.textContent = round;
  if (h.projectName) document.getElementById('projectName').value = h.projectName;
  document.getElementById('masterPrompt').value = h.prompt || '';
  document.getElementById('sendBlock').value    = h.sendBlock || '';

  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    if (ta) { ta.value = h.responses?.[ai.id] || ''; updateMeta(ai.id); }
  });

  renderPhaseBar();
  updateBackButton();
  renderHistory();
  saveState();
  toast('← Restored Round ' + round);
}

function updateBackButton() {
  const btn = document.getElementById('backRoundBtn');
  if (!btn) return;
  if (history.length > 0) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.35';
    btn.style.cursor = 'not-allowed';
  }
}

// ── HISTORY ──
function openHistory() {
  document.getElementById('historyDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}

function closeHistory() {
  document.getElementById('historyDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function renderHistory() {
  const body = document.getElementById('historyBody');
  if (history.length === 0) {
    body.innerHTML = `<div style="color:var(--muted);font-size:var(--text-base);text-align:center;padding:40px 0;">No completed rounds yet.</div>`;
    return;
  }
  body.innerHTML = history.slice().reverse().map((h, ri) => {
    const idx    = history.length - 1 - ri;
    const filled = Object.keys(h.responses || {}).filter(id => h.responses[id]);
    const phaseLabel = PHASES.find(p => p.id === h.phase)?.label || h.phase || '';
    return `
      <div class="hist-item">
        <div class="hist-item-hdr" onclick="toggleHist(${idx})">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="background:var(--accent-dim);border:1px solid var(--accent);border-radius:5px;padding:2px 9px;font-size:var(--text-sm);color:var(--accent);font-weight:700;">Round ${h.round}</span>
            ${phaseLabel ? `<span style="font-size:var(--text-xs);color:var(--muted);border:1px solid var(--border2);border-radius:4px;padding:1px 7px;">${phaseLabel}</span>` : ''}
            ${h.projectName ? `<span style="font-size:var(--text-sm);color:var(--text);font-weight:600;">${esc(h.projectName)}</span>` : ''}
            <span style="font-size:var(--text-xs);color:var(--muted);">${filled.length} responses · ${h.timestamp}</span>
          </div>
          <span style="color:var(--muted);" id="ha${idx}">▼</span>
        </div>
        <div class="hist-item-body" id="hb${idx}">
          ${h.prompt ? `<div class="hist-ai-label" style="color:var(--muted);">Prompt</div><div class="hist-text">${esc(h.prompt.substring(0,300))}${h.prompt.length>300?'…':''}</div>` : ''}
          ${filled.map(id => {
            const ai = getAI(id);
            return `<div class="hist-ai-label" style="color:var(--accent);">${ai ? ai.name : id}</div>
                    <div class="hist-text">${esc(h.responses[id].substring(0,200))}${h.responses[id].length>200?'…':''}</div>`;
          }).join('')}
          <div style="margin-top:10px;">
            <button class="btn btn-sm" onclick="restoreRound(${idx})">↩ Restore this round</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleHist(idx) {
  const b = document.getElementById('hb' + idx);
  const a = document.getElementById('ha' + idx);
  b.classList.toggle('open');
  a.textContent = b.classList.contains('open') ? '▲' : '▼';
}

function restoreRound(idx) {
  const h = history[idx];
  document.getElementById('projectName').value  = h.projectName || '';
  document.getElementById('masterPrompt').value = h.prompt || '';
  getActiveAIs().forEach(ai => {
    const ta = document.getElementById('r-' + ai.id);
    if (ta) ta.value = h.responses?.[ai.id] || '';
    updateMeta(ai.id);
  });
  document.getElementById('sendBlock').value = h.sendBlock || '';
  round = h.round;
  phase = h.phase || 'draft';
  const _rn = document.getElementById('roundNum'); if (_rn) _rn.textContent = round;
  renderPhaseBar();
  closeHistory();
  saveState();
  toast(`↩ Restored Round ${h.round}`);
}

// ── EXPORT ──
function exportTxt() {
  const resp = getResponses();
  const projectName = getProjectName();
  const currentDoc = document.getElementById('masterPrompt').value.trim();
  const projectVersion = getProjectVersion();
  const versionStr = projectVersion ? `-${projectVersion.replace(/[^a-z0-9.]/gi, '')}` : '';
  const safeName = projectName.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').substring(0, 40);

  const allRounds = [...history, {
    round, phase,
    projectName,
    prompt:    currentDoc,
    responses: resp,
    timestamp: new Date().toLocaleTimeString(),
    isCurrent: true
  }].filter(h => h.prompt || Object.values(h.responses || {}).some(v => v));

  if (allRounds.length === 0 && !currentDoc) { toast('⚠️ Nothing to export'); return; }

  // 1. Export transcript
  if (allRounds.length > 0) {
    const eq = '═'.repeat(30);
    let out = `${eq}\nAI HIVE — SESSION TRANSCRIPT\nProject: ${projectName}\nExported: ${new Date().toLocaleString()}\n${eq}\n\n`;

    allRounds.forEach(h => {
      const phaseLabel = PHASES.find(p => p.id === h.phase)?.label || h.phase || '';
      out += `${eq}\nROUND ${h.round}${h.isCurrent ? ' (current)' : ''} · ${phaseLabel} — ${h.timestamp}\n${eq}\n\n`;
      if (h.prompt) out += `PROMPT:\n${'─'.repeat(30)}\n${h.prompt}\n\n`;
      Object.keys(h.responses || {}).forEach(id => {
        if (h.responses[id]) {
          const ai = getAI(id);
          out += `${(ai ? ai.name : id).toUpperCase()}:\n${'─'.repeat(30)}\n${h.responses[id]}\n\n`;
        }
      });
    });

    const blob1 = new Blob([out], { type: 'text/plain' });
    const url1  = URL.createObjectURL(blob1);
    const a1    = document.createElement('a');
    a1.href = url1; a1.download = `AIHive-${safeName}${versionStr}-Transcript.txt`;
    a1.click();
    URL.revokeObjectURL(url1);
  }

  // 2. Export current document
  if (currentDoc) {
    setTimeout(() => {
      const blob2 = new Blob([currentDoc], { type: 'text/plain' });
      const url2  = URL.createObjectURL(blob2);
      const a2    = document.createElement('a');
      a2.href = url2; a2.download = `AIHive-${safeName}${versionStr}-Document.txt`;
      a2.click();
      URL.revokeObjectURL(url2);
    }, 500);
  }

  toast('💾 Exported transcript + document');
}

// ── STATUS BAR ──
function updateStatusBar() {
  updateBuildButton();
  const bar      = document.getElementById('statusBar');
  const roundEl  = document.getElementById('statusRound');
  const phaseEl  = document.getElementById('statusPhase');
  const respEl   = document.getElementById('statusResponses');
  const actionEl = document.getElementById('statusAction');
  if (!bar) return;

  const active   = getActiveAIs();
  const resp     = getResponses();
  const filled   = active.filter(ai => resp[ai.id] && resp[ai.id].length > 0);
  const total    = active.length;
  const count    = filled.length;
  const curPhase = PHASES.find(p => p.id === phase);
  const hasDoc   = (document.getElementById('masterPrompt')?.value || '').trim().length > 0;
  const hasSend  = (document.getElementById('sendBlock')?.value || '').trim().length > 0;

  if (roundEl)  roundEl.textContent  = 'Round ' + round;
  if (phaseEl)  phaseEl.textContent  = curPhase?.label || phase;
  if (respEl)   respEl.textContent   = count + ' of ' + total + ' AIs responded';

  let state = 'waiting', action = '';
  if (!hasDoc) {
    state  = 'waiting';
    action = '👋 Step 1 — enter your version, project name and goal, then paste a document or click ⚡ Build & Copy Prompt to start from scratch';
  } else if (count === 0) {
    state  = 'waiting';
    action = '📋 Prompt copied — go paste it into each AI tab and wait for responses';
  } else if (phase === 'review' && hasDoc && !hasSend) {
    state  = 'ready';
    action = '👤 User Review — click ⚡ Build & Copy Prompt, then send to your Builder AI only';
  } else if (count < total) {
    state  = 'partial';
    action = '⏳ ' + (total - count) + ' AI' + (total - count !== 1 ? 's' : '') + ' still waiting — paste remaining responses';
  } else if (!hasSend) {
    state  = 'ready';
    action = '⚡ All ' + total + ' AIs responded — click Build Prompt to compile';
  } else {
    state  = 'built';
    action = '✅ Prompt built and copied — paste into AI tabs';
  }

  bar.className = 'status-bar state-' + state;
  if (actionEl) actionEl.textContent = action;
}

// ── UTILS ──
function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── THEME ──
const THEME_KEY = 'aihive_theme';

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === t);
  });
  const labels = { light: '☀️ Light mode', dark: '🌙 Dark mode', auto: '⚙️ Automatic (follows OS)' };
  toast(labels[t]);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  setTheme(saved);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadState();
  document.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', () => saveState());
  });
});
