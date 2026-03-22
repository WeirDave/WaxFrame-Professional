// ============================================================
//  AI Hive v3.0 — app.js
//  Author: WeirDave | License: AGPL-3.0
//  GitHub: github.com/WeirDave/AIHive
//
//  Storage keys:
//    LS_HIVE    (aihive_v2_hive)    — AI list + API keys, persistent
//    LS_PROJECT (aihive_v2_project) — project name/version/goal, per project
//    LS_SESSION (aihive_v2_session) — round state + document, per session
//
//  Screen flow:
//    screen-welcome → screen-setup → screen-project → screen-work
// ============================================================

// ── PHASES ──
const PHASES = [
  { id: 'draft',  label: '1 · Draft',       icon: '✏️' },
  { id: 'refine', label: '2 · Refine Text',  icon: '🔁' },
  { id: 'review', label: '3 · User Review',  icon: '👤' },
];

// ── DEFAULT AI LIST ──
const DEFAULT_AIS = [
  { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chatgpt.com',           icon: 'images/chatgpt.ico',    provider: 'chatgpt',    apiConsole: 'https://platform.openai.com/api-keys' },
  { id: 'claude',     name: 'Claude',     url: 'https://claude.ai',             icon: 'images/claude.ico',     provider: 'claude',     apiConsole: 'https://console.anthropic.com/settings/keys' },
  { id: 'deepseek',   name: 'DeepSeek',   url: 'https://chat.deepseek.com',     icon: 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=64', provider: 'deepseek', apiConsole: 'https://platform.deepseek.com/api_keys' },
  { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com',     icon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64', provider: 'gemini', apiConsole: 'https://aistudio.google.com/apikey' },
  { id: 'grok',       name: 'Grok',       url: 'https://grok.com',              icon: 'https://www.google.com/s2/favicons?domain=grok.com&sz=64', provider: 'grok', apiConsole: 'https://console.x.ai' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai',     icon: 'images/perplexity.ico', provider: 'perplexity', apiConsole: 'https://www.perplexity.ai/settings/api' },
];

// ══════════════════════════════════════
// API CONFIGS
// Each entry: endpoint, model, headers fn, body fn, response extractor
// ══════════════════════════════════════
const API_CONFIGS = {
  claude: {
    label: 'Anthropic (Claude)', model: 'claude-opus-4-5',
    endpoint: 'https://api.anthropic.com/v1/messages',
    note: null,
    headersFn: k => ({ 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
    bodyFn: (model, prompt) => JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    extractFn: d => d?.content?.[0]?.text || ''
  },
  chatgpt: {
    label: 'OpenAI (ChatGPT)', model: 'gpt-4o',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    note: null,
    headersFn: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
    bodyFn: (model, prompt) => JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    extractFn: d => d?.choices?.[0]?.message?.content || ''
  },
  copilot: {
    label: 'Microsoft (Copilot)', model: 'gpt-4o',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    note: '⚠️ Copilot API not available for personal Microsoft 365 accounts. Use Copilot in free/manual mode.',
    headersFn: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
    bodyFn: (model, prompt) => JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    extractFn: d => d?.choices?.[0]?.message?.content || ''
  },
  gemini: {
    label: 'Google (Gemini)', model: 'gemini-2.0-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    note: null,
    headersFn: k => ({ 'Content-Type': 'application/json', 'x-goog-api-key': k }),
    bodyFn: (model, prompt) => JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    extractFn: d => d?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  },
  grok: {
    label: 'xAI (Grok)', model: 'grok-beta',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    note: '⚠️ Check console.x.ai for API availability',
    headersFn: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
    bodyFn: (model, prompt) => JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    extractFn: d => d?.choices?.[0]?.message?.content || ''
  },
  perplexity: {
    label: 'Perplexity', model: 'sonar-pro',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    note: null,
    headersFn: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
    bodyFn: (model, prompt) => JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    extractFn: d => d?.choices?.[0]?.message?.content || ''
  },
  deepseek: {
    label: 'DeepSeek', model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    note: null,
    headersFn: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
    bodyFn: (model, prompt) => JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    extractFn: d => d?.choices?.[0]?.message?.content || ''
  }
};

// ── STATE ──
let aiList    = JSON.parse(JSON.stringify(DEFAULT_AIS)); // full list, active = checked ones
let activeAIs = [];   // AIs selected in setup
let builder   = null; // id of builder AI
let round     = 1;
let phase     = 'draft';
let history   = [];
let docText   = '';
let docTab    = 'upload';

// ── STORAGE KEYS ──
const LS_HIVE     = 'aihive_v2_hive';      // AI list + API keys — persistent across projects
const LS_PROJECT  = 'aihive_v2_project';   // project name/version/goal/docTab — per project
const LS_SESSION  = 'aihive_v2_session';   // round state — per session
const LS_SETTINGS = 'aihive_v2_settings';  // legacy key — migrated on first load

// ── UTILS ──
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function toast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function setStatus(msg) {
  const el = document.getElementById('statusText');
  if (el) el.textContent = msg;
}

// ── LIVE CONSOLE ──
function consoleLog(msg, type = 'info') {
  const el = document.getElementById('liveConsole');
  if (!el) return;
  const entry = document.createElement('div');
  entry.className = `console-entry console-${type}`;
  const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const timeSpan = document.createElement('span');
  timeSpan.className = 'console-time';
  timeSpan.textContent = time + ' ';
  const msgSpan = document.createElement('span');
  // Strip any HTML tags from message for CSP safety
  msgSpan.textContent = msg.replace(/<[^>]+>/g, '');
  entry.appendChild(timeSpan);
  entry.appendChild(msgSpan);
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
}

function copyConsole() {
  const el = document.getElementById('liveConsole');
  if (!el) return;
  const text = Array.from(el.querySelectorAll('.console-entry')).map(e => e.textContent).join('\n');
  navigator.clipboard.writeText(text).then(() => toast('📋 Console copied'));
}

function clearConsole() {
  const el = document.getElementById('liveConsole');
  if (el) el.innerHTML = '<div class="console-entry console-info">Console cleared.</div>';
}

// ── SCREEN NAVIGATION ──
function goToScreen(id) {
  // Always save document state before navigating away from work screen
  const currentDoc = document.getElementById('workDocument');
  if (currentDoc && currentDoc.value.trim()) {
    docText = currentDoc.value.trim();
    saveSession();
  }

  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = 'flex';
    requestAnimationFrame(() => target.classList.add('active'));
  }
  // Render screen-specific content immediately on navigation
  if (id === 'screen-setup') {
    // Only default to all active on very first visit ever
    if (activeAIs.length === 0 && !localStorage.getItem(LS_HIVE)) {
      activeAIs = [...aiList];
    }
    renderAISetupGrid();
  }
  if (id === 'screen-setup') {
    renderBuilderPicker();
  }
  if (id === 'screen-project') {
    switchDocTab(docTab);
    // Restore file status if we had an uploaded file
    if (docTab === 'upload' && docText) {
      const fname = localStorage.getItem('aihive_v2_filename') || 'uploaded file';
      const status = document.getElementById('fileStatus');
      if (status) {
        status.style.display = 'block';
        status.textContent = `✅ ${docText.length.toLocaleString()} characters loaded from ${fname}`;
        status.style.background = 'var(--green-dim)';
        status.style.borderColor = 'var(--green)';
        status.style.color = 'var(--green)';
      }
    }
  }
}

function goToFree() {
  window.open('https://github.com/WeirDave/AIHive/releases/tag/v1.2', '_blank');
}

// ── SETTINGS PERSISTENCE (split storage) ──

// saveHive — AI list + keys — persistent forever
function saveHive() {
  const keys = {};
  Object.keys(API_CONFIGS).forEach(id => {
    if (API_CONFIGS[id]._key) keys[id] = API_CONFIGS[id]._key;
  });
  const hive = {
    activeAIIds:    activeAIs.map(a => a.id),
    knownDefaultIds: DEFAULT_AIS.map(d => d.id),
    builder,
    keys,
    customAIs: aiList.filter(a => !DEFAULT_AIS.find(d => d.id === a.id))
  };
  try { localStorage.setItem(LS_HIVE, JSON.stringify(hive)); } catch(e) {}
}

// saveProject — project name/version/goal/docTab — cleared per project
function saveProject() {
  const proj = {
    projectName:    document.getElementById('projectName')?.value    || '',
    projectVersion: document.getElementById('projectVersion')?.value || '',
    projectGoal:    document.getElementById('projectGoal')?.value    || '',
    docTab,
  };
  try { localStorage.setItem(LS_PROJECT, JSON.stringify(proj)); } catch(e) {}
}

// saveSettings — writes both (convenience wrapper)
function saveSettings() { saveHive(); saveProject(); }

// clearProject — wipe project data only, keep hive intact
function clearProject() {
  localStorage.removeItem(LS_PROJECT);
  localStorage.removeItem(LS_SESSION);
  localStorage.removeItem('aihive_v2_filename');
  document.getElementById('projectName').value    = '';
  document.getElementById('projectVersion').value = '';
  document.getElementById('projectGoal').value    = '';
  docTab = 'upload';
  switchDocTab('upload');
  round = 1; phase = 'draft'; history = []; docText = '';
  toast('🗑 Project cleared — AI keys and settings kept');
}

function loadSettings() {
  try {
    // ── Try new split storage first ──
    const hiveRaw = localStorage.getItem(LS_HIVE);
    const projRaw = localStorage.getItem(LS_PROJECT);

    // ── Legacy migration: if old key exists, migrate and delete it ──
    const legacyRaw = localStorage.getItem(LS_SETTINGS);
    if (legacyRaw && !hiveRaw) {
      const s = JSON.parse(legacyRaw);
      // Migrate keys and AI list to LS_HIVE
      const keys = s.keys || {};
      const hive = {
        activeAIIds: s.activeAIIds,
        knownDefaultIds: s.knownDefaultIds || DEFAULT_AIS.map(d => d.id),
        builder: s.builder,
        keys,
        customAIs: (s.customAIs || []).filter(ai =>
          // Only keep custom AIs that aren't duplicates of defaults
          !DEFAULT_AIS.find(d => d.id === ai.id)
        )
      };
      localStorage.setItem(LS_HIVE, JSON.stringify(hive));
      localStorage.removeItem(LS_SETTINGS);
    }

    // ── Load hive (AI list + keys) ──
    const hiveData = localStorage.getItem(LS_HIVE);
    if (!hiveData) return false;
    const h = JSON.parse(hiveData);

    aiList = JSON.parse(JSON.stringify(DEFAULT_AIS));
    if (h.customAIs) {
      h.customAIs.forEach(ai => {
        if (!aiList.find(a => a.id === ai.id)) aiList.push(ai);
        if (!API_CONFIGS[ai.provider] && h.customAIConfigs?.[ai.provider]) {
          API_CONFIGS[ai.provider] = h.customAIConfigs[ai.provider];
        }
      });
    }
    if (h.keys) {
      Object.keys(h.keys).forEach(id => {
        if (API_CONFIGS[id]) API_CONFIGS[id]._key = h.keys[id];
      });
    }
    if (h.activeAIIds !== undefined) {
      activeAIs = h.activeAIIds.map(id => aiList.find(a => a.id === id)).filter(Boolean);
      DEFAULT_AIS.forEach(d => {
        if (!h.activeAIIds.includes(d.id)) {
          const wasKnown = h.knownDefaultIds && h.knownDefaultIds.includes(d.id);
          if (!wasKnown) activeAIs.push(aiList.find(a => a.id === d.id));
        }
      });
      activeAIs = activeAIs.filter(Boolean);
    } else {
      activeAIs = [...aiList];
    }
    builder = h.builder || null;

    // ── Load project (name/version/goal/docTab) ──
    if (projRaw) {
      const p = JSON.parse(projRaw);
      if (p.projectName)    { const el = document.getElementById('projectName');    if (el) el.value = p.projectName; }
      if (p.projectVersion) { const el = document.getElementById('projectVersion'); if (el) el.value = p.projectVersion; }
      if (p.projectGoal)    { const el = document.getElementById('projectGoal');    if (el) el.value = p.projectGoal; }
      if (p.docTab) docTab = p.docTab;
    }

    return true;
  } catch(e) { return false; }
}

function saveSession() {
  const session = { round, phase, history, docText };
  try { localStorage.setItem(LS_SESSION, JSON.stringify(session)); } catch(e) {}
  saveProject(); // keep project fields in sync
}

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return false;
    const s = JSON.parse(raw);
    round   = s.round   || 1;
    phase   = s.phase   || 'draft';
    history = s.history || [];
    // Only restore docText if it's a real document (not scratch with empty doc)
    docText = s.docText || '';
    return true;
  } catch(e) { return false; }
}

// ── SCREEN 2: API SETUP ──
function renderAISetupGrid() {
  const grid = document.getElementById('aiSetupGrid');
  if (!grid) return;

  // Don't auto-fill activeAIs here — let toggleAllBees/init handle that

  grid.innerHTML = aiList.map(ai => {
    const isActive = !!activeAIs.find(a => a.id === ai.id);
    const isCustom = !DEFAULT_AIS.find(d => d.id === ai.id);
    const cfg = API_CONFIGS[ai.provider];
    const key = cfg?._key || '';
    const hasKey = !!key;
    const consoleUrl = ai.apiConsole || '#';
    return `
    <div class="ai-setup-row" id="airow-${ai.id}">
      <img src="${ai.icon}" class="ai-setup-icon" onerror="this.style.display='none'">
      <span class="ai-setup-name">${ai.name}</span>
      <div class="ai-setup-key-wrap">
        <div class="ai-setup-key-status ${hasKey ? 'has-key' : ''}" 
          title="${hasKey ? 'API key saved ✅' : 'No API key — free mode only'}">
          ${hasKey ? '🔑' : '⬜'}
        </div>
        <input type="password" class="ai-setup-key" id="key-${ai.id}"
          placeholder="Paste key then press Enter to save…"
          value="${esc(key)}"
          ${!isActive ? 'disabled' : ''}
          onkeydown="if(event.key==='Enter'){saveKeyForAI('${ai.id}',this.value,this);}"
          onchange="saveKeyForAI('${ai.id}',this.value,this)">
        <button class="ai-eye-btn" onclick="toggleKeyVis('${ai.id}')" title="Show/hide key">👁</button>
        ${hasKey ? `<button class="ai-clear-key-btn" onclick="clearKeyForAI('${ai.id}')" title="Remove saved API key">✕ Key</button>` : ''}
        ${hasKey ? `<button class="ai-test-btn" id="testbtn-${ai.id}" onclick="testApiKey('${ai.id}')" title="Test this API key">Test</button>` : ''}
        <a class="ai-info-btn" href="${consoleUrl}" target="_blank" title="Get API key for ${ai.name}">↗</a>
      </div>
      <button class="ai-remove-btn" onclick="removeAI('${ai.id}')" title="Remove ${ai.name} from hive">🗑</button>
    </div>`;
  }).join('');
  renderBuilderPicker();
}

function openAllConsoles() {
  aiList.forEach(ai => {
    if (ai.apiConsole && ai.id !== 'copilot') window.open(ai.apiConsole, '_blank');
  });
  toast('🔑 Opening API consoles — if blocked, click "Allow" in your browser bar', 5000);
}

// toggleAllBees() removed — checkboxes replaced by per-session AI selection on work screen


function resetBeesToDefaults() {
  if (!confirm('Reset to the 6 default AIs? Your saved API keys will be kept. Custom AIs will be removed.')) return;
  // Save existing keys before reset
  const savedKeys = {};
  Object.keys(API_CONFIGS).forEach(id => {
    if (API_CONFIGS[id]._key) savedKeys[id] = API_CONFIGS[id]._key;
  });
  // Restore default list
  aiList = JSON.parse(JSON.stringify(DEFAULT_AIS));
  activeAIs = [...aiList];
  builder = null;
  // Re-apply saved keys
  Object.keys(savedKeys).forEach(id => {
    if (API_CONFIGS[id]) API_CONFIGS[id]._key = savedKeys[id];
  });
  saveHive();
  renderAISetupGrid();
  toast('↺ Reset to 6 defaults — your API keys were kept');
}

function toggleAISetup(id, checked) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  const row = document.getElementById('airow-' + id);
  const keyInput = document.getElementById('key-' + id);
  if (checked) {
    if (!activeAIs.find(a => a.id === id)) activeAIs.push(ai);
    row?.classList.add('checked');
    if (keyInput) keyInput.disabled = false;
  } else {
    activeAIs = activeAIs.filter(a => a.id !== id);
    row?.classList.remove('checked');
    if (keyInput) keyInput.disabled = true;
    if (builder === id) { builder = null; }
  }
  renderBuilderPicker();
  saveSettings();
}

function saveKeyForAI(id, val, inputEl) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  const cfg = API_CONFIGS[ai.provider];
  if (cfg) cfg._key = val.trim();
  saveSettings();
  // Move focus away so user knows it saved
  if (inputEl) inputEl.blur();
  // Re-render just this row so the ✕ Key button appears/disappears correctly
  renderAIRow(id);
  toast(val.trim() ? `🔑 ${ai.name} key saved` : `🗑 ${ai.name} key cleared`, 2000);
}

function renderAIRow(id) {
  const ai = aiList.find(a => a.id === id);
  const rowEl = document.getElementById('airow-' + id);
  if (!ai || !rowEl) return;
  const isActive = !!activeAIs.find(a => a.id === id);
  const isCustom = !DEFAULT_AIS.find(d => d.id === ai.id);
  const cfg = API_CONFIGS[ai.provider];
  const key = cfg?._key || '';
  const hasKey = !!key;
  const consoleUrl = ai.apiConsole || '#';

  rowEl.className = 'ai-setup-row';
  rowEl.querySelector('.ai-setup-key-wrap').innerHTML = `
    <div class="ai-setup-key-status ${hasKey ? 'has-key' : ''}"
      title="${hasKey ? 'API key saved ✅' : 'No API key — free mode only'}">
      ${hasKey ? '🔑' : '⬜'}
    </div>
    <input type="password" class="ai-setup-key" id="key-${ai.id}"
      placeholder="Paste key then press Enter to save…"
      value="${esc(key)}"
      ${!isActive ? 'disabled' : ''}
      onkeydown="if(event.key==='Enter'){saveKeyForAI('${ai.id}',this.value,this);}"
      onchange="saveKeyForAI('${ai.id}',this.value,this)">
    <button class="ai-eye-btn" onclick="toggleKeyVis('${ai.id}')" title="Show/hide key">👁</button>
    ${hasKey ? `<button class="ai-clear-key-btn" onclick="clearKeyForAI('${ai.id}')" title="Remove saved API key">✕ Key</button>` : ''}
    ${hasKey ? `<button class="ai-test-btn" id="testbtn-${ai.id}" onclick="testApiKey('${ai.id}')" title="Test connection">Test</button>` : ''}
    <a class="ai-info-btn" href="${consoleUrl}" target="_blank" title="Get API key for ${ai.name}">↗</a>
  `;
  // Update remove button outside key-wrap
  const removeBtn = rowEl.querySelector('.ai-remove-btn, .ai-remove-placeholder');
  if (removeBtn) {
    removeBtn.className = 'ai-remove-btn';
    removeBtn.title = `Remove ${ai.name} from hive`;
    removeBtn.textContent = '🗑';
    removeBtn.onclick = () => removeAI(id);
  }
}

function renderBuilderPicker() {
  const grid = document.getElementById('builderPickGrid');
  if (!grid) return;
  if (activeAIs.length === 0) return;
  if (!builder || !activeAIs.find(a => a.id === builder)) {
    builder = activeAIs[0].id;
  }
  grid.innerHTML = activeAIs.map(ai => `
    <button class="builder-pick-btn ${builder === ai.id ? 'selected' : ''}"
      onclick="setBuilder('${ai.id}'); return false;">
      <img src="${ai.icon}" class="builder-pick-icon" onerror="this.style.display='none'">
      <span class="builder-pick-name">${ai.name}</span>
      ${builder === ai.id ? '<img src="images/AI_Hive_Builder_v3.png" class="builder-selected-badge" onerror="this.style.display=\'none\'">' : ''}
    </button>
  `).join('');
}

function setBuilder(id) {
  builder = id;
  renderBuilderPicker();
  const ai = aiList.find(a => a.id === id);
  toast(`🏗️ ${ai?.name} is now the Builder`);
}

function removeCustomAI(id) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  if (!confirm(`Remove "${ai.name}" from your hive? This cannot be undone.`)) return;
  aiList    = aiList.filter(a => a.id !== id);
  activeAIs = activeAIs.filter(a => a.id !== id);
  if (builder === id) builder = null;
  if (API_CONFIGS[id]) delete API_CONFIGS[id];
  saveSettings();
  renderAISetupGrid();
  toast(`🗑 ${ai.name} removed from your hive`);
}

async function testApiKey(id) {
  const ai = aiList.find(a => a.id === id);
  const cfg = API_CONFIGS[ai?.provider];
  if (!cfg || !cfg._key) { toast('⚠️ Save a key first'); return; }

  const btn = document.getElementById('testbtn-' + id);
  if (btn) { btn.textContent = '…'; btn.disabled = true; }

  try {
    const response = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: cfg.headersFn(cfg._key),
      body: cfg.bodyFn(cfg.model, 'Reply with exactly one word: CONNECTED')
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${response.status}`;
      if (btn) { btn.textContent = '❌'; btn.disabled = false; }
      toast(`❌ ${ai.name}: ${msg}`, 4000);
      return;
    }
    const data = await response.json();
    const text = cfg.extractFn(data);
    if (btn) { btn.textContent = '✅'; btn.disabled = false; }
    toast(`✅ ${ai.name} connected — response: "${text.trim().substring(0, 30)}"`, 3500);
    setTimeout(() => { if (btn) btn.textContent = 'Test'; }, 4000);
  } catch(e) {
    if (btn) { btn.textContent = '❌'; btn.disabled = false; }
    toast(`❌ ${ai.name}: ${e.message}`, 4000);
    setTimeout(() => { if (btn) btn.textContent = 'Test'; }, 4000);
  }
}

function removeAI(id) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  const isDefault = !!DEFAULT_AIS.find(d => d.id === id);
  const label = isDefault ? `Remove "${ai.name}" from your hive? You can restore defaults with ↺ Defaults.` : `Remove "${ai.name}" from your hive?`;
  if (!confirm(label)) return;
  aiList    = aiList.filter(a => a.id !== id);
  activeAIs = activeAIs.filter(a => a.id !== id);
  if (builder === id) builder = null;
  if (API_CONFIGS[id]) delete API_CONFIGS[id];
  saveHive();
  renderAISetupGrid();
  toast(`🗑 ${ai.name} removed`);
}

function removeCustomAI(id) { removeAI(id); } // legacy alias

function clearKeyForAI(id) {
  const ai = aiList.find(a => a.id === id);
  if (!ai) return;
  if (!confirm(`Remove the saved API key for ${ai.name}?`)) return;
  const cfg = API_CONFIGS[ai.provider];
  if (cfg) delete cfg._key;
  saveSettings();
  renderAISetupGrid();
  toast(`🗑 ${ai.name} API key removed`);
}

function goToBuilderStep() {
  // Count AIs with saved keys
  const keyed = aiList.filter(ai => {
    const cfg = API_CONFIGS[ai.provider];
    return cfg?._key;
  });
  if (keyed.length < 2) {
    toast('⚠️ You need API keys for at least 2 AIs — that\'s what makes the collaboration work!');
    return;
  }
  // Make sure activeAIs reflects who has keys
  activeAIs = keyed;
  saveHive();
  goToScreen('screen-setup');
  renderBuilderPicker();
}

function toggleKeyVis(id) {
  const input = document.getElementById('key-' + id);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function autoFillAIName(url) {
  const nameInput = document.getElementById('customAIName');
  if (!nameInput) return;
  // Only auto-fill if user hasn't manually typed a name
  if (nameInput.dataset.userTyped === 'true') return;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    // Take the main domain part (first segment), capitalize properly
    const raw = parts[0];
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    nameInput.value = name;
    nameInput.placeholder = 'e.g. DeepSeek';
  } catch(e) {
    nameInput.value = '';
    nameInput.placeholder = 'e.g. DeepSeek';
  }
}

function showAddCustomAI() {
  const f = document.getElementById('addCustomAIForm');
  const isHidden = f.style.display === 'none' || f.style.display === '';
  if (isHidden) {
    // Always clear form fresh when opening
    const urlInput  = document.getElementById('customAIUrl');
    const nameInput = document.getElementById('customAIName');
    const keyInput  = document.getElementById('customAIKey');
    const fmtSelect = document.getElementById('customAIFormat');
    if (urlInput)  urlInput.value  = '';
    if (nameInput) { nameInput.value = ''; nameInput.placeholder = 'e.g. DeepSeek'; nameInput.dataset.userTyped = 'false'; }
    if (keyInput)  keyInput.value  = '';
    if (fmtSelect) fmtSelect.value = 'openai';
    f.style.display = 'block';
    urlInput?.focus();
  } else {
    f.style.display = 'none';
  }
}

function addCustomAI() {
  const url    = document.getElementById('customAIUrl').value.trim();
  const format = document.getElementById('customAIFormat').value;
  const key    = document.getElementById('customAIKey').value.trim();
  let   name   = document.getElementById('customAIName').value.trim();

  if (!url || !url.startsWith('http')) { toast('⚠️ Enter a valid URL starting with http'); return; }

  // Auto-detect name from URL if not provided
  if (!name) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
      name = hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch(e) { name = 'Custom AI'; }
  }

  const id     = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  const origin = (() => { try { return new URL(url).origin; } catch(e) { return url; } })();
  const icon   = `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
  const ai     = { id, name, url, icon, provider: id };

  // Build API config based on selected format
  const baseConfigs = {
    openai: {
      headersFn: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
      bodyFn: (model, prompt) => JSON.stringify({ model: 'default', messages: [{ role: 'user', content: prompt }] }),
      extractFn: d => d?.choices?.[0]?.message?.content || ''
    },
    anthropic: {
      headersFn: k => ({ 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
      bodyFn: (model, prompt) => JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
      extractFn: d => d?.content?.[0]?.text || ''
    },
    google: {
      headersFn: k => ({ 'Content-Type': 'application/json', 'x-goog-api-key': k }),
      bodyFn: (model, prompt) => JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      extractFn: d => d?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }
  };

  const formatLabels = { openai: 'OpenAI compatible', anthropic: 'Anthropic', google: 'Google' };
  const base = baseConfigs[format] || baseConfigs.openai;

  API_CONFIGS[id] = {
    label: name,
    model: 'default',
    endpoint: url.replace(/\/$/, '') + (format === 'openai' ? '/v1/chat/completions' : ''),
    note: `Format: ${formatLabels[format] || 'OpenAI compatible'}`,
    ...base
  };
  if (key) API_CONFIGS[id]._key = key;

  aiList.push(ai);
  activeAIs.push(ai);

  // Clear form
  document.getElementById('addCustomAIForm').style.display = 'none';
  document.getElementById('customAIName').value  = '';
  document.getElementById('customAIUrl').value   = '';
  document.getElementById('customAIKey').value   = '';
  document.getElementById('customAIFormat').value = 'openai';

  renderAISetupGrid();
  toast(`🐝 ${name} added to the hive`);
}

function validateAndContinue() {
  const keyed = aiList.filter(ai => {
    const cfg = API_CONFIGS[ai.provider];
    return cfg?._key;
  });
  if (keyed.length < 2) {
    toast('⚠️ You need API keys for at least 2 AIs to collaborate');
    return;
  }
  if (!builder) { toast('⚠️ Choose a Builder AI on the right'); return; }
  activeAIs = keyed;
  saveHive();
  goToScreen('screen-project');
}

// ── SCREEN 3: PROJECT SETUP ──
function switchDocTab(tab) {
  docTab = tab;
  document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.doc-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-'   + tab)?.classList.add('active');
  document.getElementById('panel-' + tab)?.classList.add('active');
  saveSettings();
}

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.add('drag-over');
}

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

async function processFile(file) {
  const status = document.getElementById('fileStatus');
  const ext = file.name.split('.').pop().toLowerCase();
  status.style.display = 'block';
  status.textContent = `⏳ Reading ${file.name}…`;
  status.style.background = 'var(--blue-dim)';
  status.style.borderColor = 'var(--blue)';
  status.style.color = 'var(--blue)';

  try {
    let text = '';
    if (ext === 'txt') {
      text = await file.text();
    } else if (ext === 'pdf') {
      text = await extractPDF(file);
    } else if (ext === 'docx') {
      text = await extractDOCX(file);
    } else if (ext === 'pptx') {
      text = await extractPPTX(file);
    } else {
      throw new Error('Unsupported file type');
    }
    docText = text.trim();
    // Save extracted text immediately so refresh doesn't lose it
    saveSession();
    // Save filename for status restoration
    try { localStorage.setItem('aihive_v2_filename', file.name); } catch(e) {}
    status.textContent = `✅ Extracted ${docText.length.toLocaleString()} characters from ${file.name}`;
    status.style.background = 'var(--green-dim)';
    status.style.borderColor = 'var(--green)';
    status.style.color = 'var(--green)';
  } catch(e) {
    status.textContent = `❌ Could not read file: ${e.message}. Try pasting the text instead.`;
    status.style.background = 'var(--red-dim)';
    status.style.borderColor = 'var(--red)';
    status.style.color = 'var(--red)';
  }
}

async function extractPDF(file) {
  // Use PDF.js from CDN
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

async function extractDOCX(file) {
  if (!window.mammoth) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractPPTX(file) {
  // Use JSZip to unzip and extract text from pptx XML
  if (!window.JSZip) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }
  const arrayBuffer = await file.arrayBuffer();
  const zip = await window.JSZip.loadAsync(arrayBuffer);
  let text = '';
  const slideFiles = Object.keys(zip.files).filter(name => name.match(/ppt\/slides\/slide[0-9]+\.xml$/));
  slideFiles.sort();
  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async('text');
    // Strip XML tags and extract text
    const stripped = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    text += stripped + '\n\n';
  }
  return text;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function startSession() {
  const name = document.getElementById('projectName').value.trim();
  const goal = document.getElementById('projectGoal').value.trim();

  if (!name) { toast('⚠️ Enter a project name'); return; }
  if (!goal) { toast('⚠️ Enter a project goal'); return; }

  if (docTab === 'paste') {
    docText = document.getElementById('pasteText').value.trim();
  } else if (docTab === 'scratch') {
    docText = '';
  }

  if (docTab !== 'scratch' && !docText) {
    toast('⚠️ Please upload a file or paste your document text');
    return;
  }

  saveSettings();
  goToScreen('screen-work');
  initWorkScreen();
}

// ── SCREEN 4: WORK ──
function initWorkScreen() {
  const name    = document.getElementById('projectName')?.value.trim()    || 'Project';
  const version = document.getElementById('projectVersion')?.value.trim() || '';
  const goal    = document.getElementById('projectGoal')?.value.trim()    || '';

  const el = document.getElementById('workProjectName');
  const ve = document.getElementById('workProjectVersion');
  const me = document.getElementById('workStartMode');

  if (el) el.textContent = name;
  if (ve) { ve.textContent = version; ve.style.display = version ? 'inline' : 'none'; }
  if (me) {
    const modeLabels = { upload: '📄 Uploaded file', paste: '📋 Pasted text', scratch: '✍️ From scratch' };
    me.textContent = modeLabels[docTab] || '';
  }

  // For scratch: show project context as a starting reference — not a document yet
  const docTa = document.getElementById('workDocument');
  if (docTa) {
    if (docTab === 'scratch' && !docText) {
      docTa.value = '';
      docTa.placeholder = `Starting from scratch — click "Activate the Hive" to generate your first draft.\n\nProject: ${name}${version ? ' ' + version : ''}\nGoal: ${goal}`;
    } else {
      docTa.value = docText;
    }
    updateLineNumbers();
  }

  const ps = document.getElementById('phaseSelect');
  if (ps) ps.value = phase;

  // Pre-fill notes with project goal on round 1 (helps the AI understand intent)
  if (round === 1) {
    const goal = document.getElementById('projectGoal')?.value?.trim();
    const notesTa = document.getElementById('workNotes');
    if (goal && notesTa && !notesTa.value) {
      notesTa.value = `Project goal: ${goal}`;
    }
  }

  // Reset per-session bee selection to all active AIs
  window.sessionAIs = new Set(activeAIs.map(a => a.id));

  renderWorkPhaseBar();
  renderBeeStatusGrid();
  renderRoundHistory();
  updateRoundBadge();
  setStatus('Standing by — toggle bees above, then Shake the Hive');

  // Keep line numbers filled on resize
  if (window._lineNumObserver) window._lineNumObserver.disconnect();
  const ta = document.getElementById('workDocument');
  if (ta && window.ResizeObserver) {
    window._lineNumObserver = new ResizeObserver(() => updateLineNumbers());
    window._lineNumObserver.observe(ta);
  }
  updateLineNumbers();
}

function updateLineNumbers() {
  const ta = document.getElementById('workDocument');
  const ln = document.getElementById('lineNumbers');
  if (!ta || !ln) return;
  const lineH = 24; // must match CSS line-height of .work-doc-ta
  const lines = ta.value.split('\n').length;
  // Always show at least enough lines to fill the visible area
  const visibleLines = Math.ceil(ta.clientHeight / lineH);
  const totalLines = Math.max(lines, visibleLines);
  ln.innerHTML = Array.from({length: totalLines}, (_, i) =>
    `<div>${i + 1}</div>`
  ).join('');
  syncLineNumberScroll();
}

function syncLineNumberScroll() {
  const ta = document.getElementById('workDocument');
  const ln = document.getElementById('lineNumbers');
  if (!ta || !ln) return;
  ln.scrollTop = ta.scrollTop;
}

function renderWorkPhaseBar() {
  const bar = document.getElementById('workPhaseBar');
  if (!bar) return;
  const idx = PHASES.findIndex(p => p.id === phase);
  bar.innerHTML = PHASES.map((p, i) => {
    const cls = i < idx ? 'work-phase-pill done' : i === idx ? 'work-phase-pill active' : 'work-phase-pill';
    return (i > 0 ? '<span class="work-phase-arrow">›</span>' : '') +
      `<span class="${cls}" onclick="setPhase('${p.id}')" title="Switch to ${p.label}">${p.label}</span>`;
  }).join('');
}

function setPhase(id) {
  phase = id;
  const ps = document.getElementById('phaseSelect');
  if (ps) ps.value = id;
  renderWorkPhaseBar();
  toast(`📍 ${PHASES.find(p => p.id === id)?.label}`);
}

function updateRoundBadge() {
  const el = document.getElementById('workRoundBadge');
  if (el) el.textContent = `Round ${round}`;
}

function renderBeeStatusGrid() {
  const grid = document.getElementById('beeStatusGrid');
  if (!grid) return;
  if (!window.sessionAIs) window.sessionAIs = new Set(activeAIs.map(a => a.id));
  grid.innerHTML = activeAIs.map(ai => {
    const isB  = ai.id === builder;
    const isOn = isB || window.sessionAIs.has(ai.id);
    return `
    <div class="bee-card ${isB ? 'is-builder' : isOn ? 'is-active' : 'is-inactive'}" id="bcard-${ai.id}">
      <div class="bee-card-top">
        ${isB
          ? `<span class="bee-builder-tag">BUILD</span>`
          : `<input type="checkbox" class="bee-toggle" id="btog-${ai.id}"
              ${isOn ? 'checked' : ''}
              onchange="toggleSessionBee('${ai.id}', this.checked)">`
        }
        <img src="${ai.icon}" class="bee-card-icon" onerror="this.style.display='none'">
      </div>
      <div class="bee-card-name">${ai.name}</div>
      <div class="bee-card-status" id="blive-${ai.id}">Idle</div>
    </div>`;
  }).join('');
}

function toggleSessionBee(id, on) {
  if (!window.sessionAIs) window.sessionAIs = new Set(activeAIs.map(a => a.id));
  if (on) {
    window.sessionAIs.add(id);
  } else {
    window.sessionAIs.delete(id);
  }
  const card = document.getElementById('bcard-' + id);
  if (card) {
    card.classList.toggle('is-active', on);
    card.classList.toggle('is-inactive', !on);
  }
}

function setBeeStatus(id, state, summary) {
  const card = document.getElementById('bcard-' + id);
  const live = document.getElementById('blive-' + id);
  if (!card) return;

  card.classList.remove('is-working', 'is-done', 'is-error');

  if (state === 'sending') {
    card.classList.add('is-working');
    if (live) live.textContent = 'Sending…';
  } else if (state === 'thinking') {
    card.classList.add('is-working');
    if (live) live.textContent = 'Thinking…';
  } else if (state === 'streaming') {
    card.classList.add('is-working');
    if (live) live.textContent = 'Writing…';
  } else if (state === 'done') {
    card.classList.add('is-done');
    if (live) live.textContent = 'Done ✓';
  } else if (state === 'error') {
    card.classList.add('is-error');
    if (live) live.textContent = 'Failed';
  } else {
    if (live) live.textContent = 'Idle';
  }
}

// ── PROMPTS ──
const DEFAULT_PHASE_INSTRUCTIONS = {
  draft_scratch: `You are part of a multi-AI collaboration called AI Hive. Do not adopt any additional role, persona, or framing beyond what is stated here.

Your task: Create a complete first draft based on the project goal provided in this message.

RULES:
- Use plain text only. Do not use markdown headings (#), bullets (-), bold (**), italics, tables, or code fences. If the document requires section headings, write them in plain text on their own line.
- Do not use ellipses (...) or placeholders — write every word of the document from start to finish.
- Do not include meta-commentary, explanations of your choices, apologies, introductions, or any text that is not part of the document itself.
- Do not reference AI Hive, this prompt, or the collaboration process anywhere in the draft.
- Do not invent facts, data, names, or references not supported by the project goal. Use clearly labeled placeholders (e.g., [INSERT DATE]) when specific information is missing.
- If critical information is missing from the project goal, make the fewest necessary assumptions and keep them conservative.
- Prioritize completeness, clarity, internal consistency, and practical usefulness.`,

  draft_refine: `You are part of a multi-AI collaboration called AI Hive. Do not adopt any additional role, persona, or framing beyond what is stated here.

The user has provided a document above. Your task: review it and give specific, numbered suggestions for improvement.

Begin your response immediately with suggestion number 1. Do not include an introduction, summary, or restatement of the document.

RULES:
- Do NOT rewrite the document. Do not quote or restate large portions of it.
- Number every suggestion starting from 1.
- Each suggestion must identify the exact section or sentence being changed and propose a concrete, concise change.
- Focus on content, clarity, accuracy, internal consistency, tone, and logical flow only.
- Do not suggest formatting, visual layout, or markup changes.
- Do not add new requirements or sections unless the project goal clearly implies they are missing.
- Do not include general praise, summaries, or filler.
- Only suggest changes that materially improve accuracy, professional tone, or clarity.`,

  refine: `You are in the text refinement phase of a multi-AI collaboration called AI Hive. Do not adopt any additional role, persona, or framing beyond what is stated here.

Review the current document provided in this message and give specific, numbered suggestions to improve it.

Begin your response immediately with suggestion number 1. Do not include an introduction, preamble, or restatement of the document.

RULES:
- Do NOT rewrite the document. Do not quote or restate large portions of it.
- Number every suggestion starting from 1.
- Each suggestion must identify the exact section or sentence and propose a concrete change.
- Focus on clarity, precision, internal consistency, tone, and logical flow only.
- Do not suggest formatting, structural layout, or markup changes.
- Do not introduce new content that changes the intended meaning of the document.
- Keep each suggestion concise — one to two sentences maximum.
- If you believe the text needs no further changes, return exactly this and nothing else: NO CHANGES NEEDED

⚠️ IMPORTANT: Any response that contains a full rewritten document, large continuous blocks of revised text, or anything other than a numbered suggestion list will be considered non-compliant and discarded.`,

  review: `You are the Builder in this AI Hive collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

The team has been refining this document and the user is ready for a clean review copy.

Your task: Produce the complete, clean current version of the document as it stands now.

RULES:
- Return the full document — every section, complete. Do not use ellipses or placeholders.
- Use plain text only. Do not use markdown headings, bullets, bold, italics, or tables.
- Do not add meta-commentary, explanations, or any text that is not part of the document itself.
- Do not introduce new content, requirements, or changes not already present in the document.
- Structure your response EXACTLY like this:

[DOCUMENT START]
...the complete document here...
[DOCUMENT END]`,
};

const BUILDER_INSTRUCTIONS = {
  refine: `You are the Builder in this AI Hive collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

All reviewer suggestions are included above. Your task: produce the complete updated document incorporating valid suggestions.

A valid suggestion is one that improves clarity, accuracy, consistency, logic, or readability without changing the document's intended meaning or scope.

RULES:
- Return the FULL document — every section, complete. Do not use ellipses or placeholders.
- Use plain text only. Do not use markdown headings, bullets, bold, italics, or tables.
- Do not add meta-commentary or any text inside the document that is not document content.
- Do not introduce new content, claims, or requirements that no reviewer suggested.
- Do not treat repeated or substantially similar suggestions as conflicts — apply them once.
- Preserve the existing section order and structure unless a reviewer suggestion specifically requires a change.
- Maintain internal consistency across section titles, numbering, terminology, and defined terms.
- Keep each conflict explanation to one or two sentences.
- Structure your response EXACTLY like this:

[DOCUMENT START]
...the complete updated document here...
[DOCUMENT END]

[CONFLICTS START]
List any conflicting or incompatible suggestions here. If there are no conflicts write exactly: NO CONFLICTS
[CONFLICTS END]`,

  draft: `You are the Builder in this AI Hive collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

All reviewer drafts are included above. Your task: produce a single consolidated first draft that integrates the strongest elements from each provided draft.

RULES:
- Return the FULL document — every section, complete. Do not use ellipses or placeholders.
- Use plain text only. Do not use markdown headings, bullets, bold, italics, or tables.
- Prioritize accuracy, completeness, clarity, internal consistency, and practical usefulness.
- Do not introduce new ideas not present in any of the provided drafts.
- Do not merge conflicting text mechanically — choose the stronger approach and note the conflict below.
- Normalize terminology across drafts for consistency.
- Structure your response EXACTLY like this:

[DOCUMENT START]
...the complete first draft here...
[DOCUMENT END]

[CONFLICTS START]
List any conflicting approaches. If none write exactly: NO CONFLICTS
[CONFLICTS END]`,

  review: `You are the Builder in this AI Hive collaboration. Do not adopt any additional role, persona, or framing beyond what is stated here.

The user has reviewed the document and their edits are incorporated above. Your task: produce the complete updated document.

RULES:
- Return the FULL document — every section, complete.
- Use plain text only.
- The user's edits and stated intent have absolute priority.
- Only apply reviewer suggestions that do not contradict or undo a user edit.
- Structure your response EXACTLY like this:

[DOCUMENT START]
...the complete updated document here...
[DOCUMENT END]

[CONFLICTS START]
List any cases where reviewer suggestions were discarded due to user edits. If none write exactly: NO CONFLICTS
[CONFLICTS END]`,
};

function buildPromptForAI(ai, reviewerResponses) {
  const doc      = document.getElementById('workDocument')?.value.trim() || '';
  const goal     = document.getElementById('projectGoal')?.value.trim()  || '';
  const name     = document.getElementById('projectName')?.value.trim()  || '';
  const notes    = document.getElementById('workNotes')?.value.trim()    || '';
  const sep      = '─'.repeat(60);
  const eq       = '═'.repeat(60);
  const isScratch     = !doc;
  const isBuilder     = ai.id === builder;
  const isReview      = phase === 'review';
  const hasResponses  = reviewerResponses && reviewerResponses.length > 0;
  const builderAI     = activeAIs.find(a => a.id === builder);

  let prompt = `${eq}\n  AI HIVE — ${name.toUpperCase()}\n  Round ${round} · Phase: ${PHASES.find(p => p.id === phase)?.label || phase}\n${eq}\n\n`;

  if (goal && phase === 'draft') prompt += `PROJECT GOAL:\n${sep}\n${goal}\n\n`;
  if (notes) prompt += `USER NOTES FOR THIS ROUND:\n${sep}\n${notes}\n\n`;

  if (isReview) {
    prompt += doc ? `CURRENT DOCUMENT:\n${sep}\n${doc}\n\n` : '';
    prompt += `${sep}\n⚠️ SEND TO ${builderAI?.name?.toUpperCase() || 'BUILDER'} ONLY\n${sep}\n\n`;
    prompt += BUILDER_INSTRUCTIONS.review;
  } else if (isBuilder && hasResponses) {
    prompt += doc ? `CURRENT DOCUMENT:\n${sep}\n${doc}\n\n` : '';
    reviewerResponses.forEach(r => {
      prompt += `${sep}\nFROM ${r.name.toUpperCase()}:\n${sep}\n${r.response}\n\n`;
    });
    prompt += `${sep}\n⚠️ BUILDER: produce the complete updated document\n${sep}\n\n`;
    prompt += BUILDER_INSTRUCTIONS[phase] || BUILDER_INSTRUCTIONS.refine;
  } else if (isScratch) {
    prompt += `${sep}\nSEND TO ALL AIs\n${sep}\n\n`;
    prompt += DEFAULT_PHASE_INSTRUCTIONS.draft_scratch;
  } else {
    prompt += doc ? `CURRENT DOCUMENT:\n${sep}\n${doc}\n\n` : '';
    prompt += `${sep}\nSEND TO ALL AIs\n${sep}\n\n`;
    const key = phase === 'draft' ? 'draft_refine' : phase;
    prompt += DEFAULT_PHASE_INSTRUCTIONS[key] || DEFAULT_PHASE_INSTRUCTIONS.refine;
  }

  return prompt;
}

// ── RUN ROUND ──
async function runRound() {
  const btn = document.getElementById('runRoundBtn');
  const hiveStatus = document.getElementById('hiveStatus');

  if (btn?.classList.contains('running')) return;

  // Save current doc state
  docText = document.getElementById('workDocument')?.value.trim() || '';

  // Check all active AIs have API keys
  const missingKeys = activeAIs.filter(ai => {
    const cfg = API_CONFIGS[ai.provider];
    return !cfg || !cfg._key;
  });
  if (missingKeys.length > 0) {
    toast(`⚠️ Missing API keys: ${missingKeys.map(a => a.name).join(', ')}`);
    return;
  }

  // Set running state
  btn?.classList.add('running');
  if (btn) btn.innerHTML = '<span class="hex-label">Shaking…</span>';
  if (hiveStatus) hiveStatus.textContent = 'Working…';
  setStatus(`⚡ Round ${round} in progress — AI Hive is thinking…`);
  consoleLog(`═══ Round ${round} · Phase: ${PHASES.find(p=>p.id===phase)?.label||phase} ═══`, 'divider');

  // Reset all bee statuses
  activeAIs.forEach(ai => setBeeStatus(ai.id, 'waiting', 'Ready'));

  const reviewers = activeAIs.filter(ai => ai.id !== builder);
  const builderAI = activeAIs.find(ai => ai.id === builder);
  const reviewerResponses = [];

  consoleLog(`🐝 ${reviewers.length} reviewer${reviewers.length!==1?'s':''} + 1 builder — starting simultaneously`, 'info');
  // Phase 1: Send to all reviewers simultaneously
  setStatus(`⚡ Sending to ${reviewers.length} reviewer${reviewers.length !== 1 ? 's' : ''}…`);
  reviewers.forEach(ai => setBeeStatus(ai.id, 'sending', 'Thinking…'));

  const reviewerPromises = reviewers.map(async ai => {
    const prompt = buildPromptForAI(ai, []);
    try {
      const response = await callAPI(ai, prompt);
      const summary = extractSummary(response);
      setBeeStatus(ai.id, 'done', summary);
      reviewerResponses.push({ id: ai.id, name: ai.name, response });
      return { ai, response, success: true };
    } catch(e) {
      if (e.message.startsWith('RATE_LIMITED:')) {
        setBeeStatus(ai.id, 'error', `⏳ Rate limited — skipped this round`);
        toast(`⏳ ${ai.name} hit a usage limit — skipped this round`, 4000);
      } else if (e.message.startsWith('CORS_BLOCKED:')) {
        setBeeStatus(ai.id, 'error', 'CORS blocked — proxy needed');
      } else {
        setBeeStatus(ai.id, 'error', e.message);
      }
      return { ai, response: '', success: false };
    }
  });

  await Promise.all(reviewerPromises);

  const successfulReviews = reviewerResponses.filter(r => r.response);

  // Phase 2: Send to Builder
  const failedCount = reviewers.length - successfulReviews.length;
  if (failedCount > 0) consoleLog(`⚠️ ${failedCount} reviewer${failedCount!==1?'s':''} failed — continuing with ${successfulReviews.length} response${successfulReviews.length!==1?'s':''}`, 'warn');
  if (builderAI && (successfulReviews.length > 0 || phase === 'review')) {
    consoleLog(`🔨 ${builderAI.name} (Builder) — compiling document from ${successfulReviews.length} review${successfulReviews.length!==1?'s':''}…`, 'info');
    setBeeStatus(builderAI.id, 'sending', 'Building document…');
    setStatus(`🏗️ ${builderAI.name} is building the updated document…`);

    const builderPrompt = buildPromptForAI(builderAI, successfulReviews);
    try {
      const builderResponse = await callAPI(builderAI, builderPrompt);
      const newDoc = extractDocument(builderResponse);
      if (newDoc) {
        const docTa = document.getElementById('workDocument');
        if (docTa) { docTa.value = newDoc; updateLineNumbers(); }
        docText = newDoc;
        setBeeStatus(builderAI.id, 'done', 'Document updated ✓');
        setStatus(`✅ Round ${round} complete — document updated`);
        consoleLog(`✅ Round ${round} complete — document updated (${docText.split(/\s+/).length} words)`, 'success');
      } else {
        // Builder returned full response, use as-is
        const docTa = document.getElementById('workDocument');
        if (docTa) { docTa.value = builderResponse; updateLineNumbers(); }
        docText = builderResponse;
        setBeeStatus(builderAI.id, 'done', 'Document updated ✓');
        setStatus(`✅ Round ${round} complete`);
        consoleLog(`✅ Round ${round} complete`, 'success');
      }
    } catch(e) {
      setBeeStatus(builderAI.id, 'error', e.message);
      setStatus(`⚠️ Builder failed: ${e.message}`);
      consoleLog(`❌ Builder (${builderAI.name}) failed: ${e.message}`, 'error');
    }
  }

  // Save to history
  history.push({
    round, phase,
    projectName:    document.getElementById('projectName')?.value.trim()    || '',
    projectVersion: document.getElementById('projectVersion')?.value.trim() || '',
    doc:            docText,
    responses:      Object.fromEntries(reviewerResponses.map(r => [r.id, r.response])),
    timestamp:      new Date().toLocaleTimeString()
  });

  round++;
  updateRoundBadge();
  renderRoundHistory();
  renderWorkPhaseBar();
  saveSession();

  // Clear notes
  const notesTa = document.getElementById('workNotes');
  if (notesTa) notesTa.value = '';

  // Reset button
  if (btn) {
    btn.classList.remove('running');
    btn.innerHTML = '<span class="hex-label">Shake<br>the Hive</span>';
  }
  if (hiveStatus) hiveStatus.textContent = 'Ready';
  toast(`✅ Round ${round - 1} complete!`);
}

// ── API CALL ──
async function callAPI(ai, prompt) {
  const cfg = API_CONFIGS[ai.provider];
  if (!cfg || !cfg._key) throw new Error('No API key');

  const keyHint = cfg._key.length > 8 ? cfg._key.slice(0,4) + '••••' + cfg._key.slice(-4) : '••••';
  consoleLog(`📤 ${ai.name} — sending request (key: ${keyHint})`, 'info');
  const t0 = Date.now();

  let response;
  try {
    response = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: cfg.headersFn(cfg._key),
      body: cfg.bodyFn(cfg.model, prompt)
    });
  } catch(fetchErr) {
    const isCors = fetchErr.message.toLowerCase().includes('network') ||
                   fetchErr.message.toLowerCase().includes('fetch') ||
                   fetchErr.message.toLowerCase().includes('cors');
    if (isCors) {
      consoleLog(`❌ ${ai.name} — CORS blocked. Browser cannot call this API directly. A proxy is required.`, 'error');
      throw new Error('CORS_BLOCKED: Browser cannot reach ' + ai.name + ' API directly. Proxy required.');
    }
    consoleLog(`❌ ${ai.name} — Network error: ${fetchErr.message}`, 'error');
    throw fetchErr;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${response.status}`;
    if (response.status === 429 || msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('too many')) {
      consoleLog(`⏳ ${ai.name} — Rate limited / quota exceeded: ${msg}`, 'warn');
      throw new Error('RATE_LIMITED:' + msg);
    }
    consoleLog(`❌ ${ai.name} — HTTP ${response.status}: ${msg}`, 'error');
    throw new Error(msg);
  }

  const data = await response.json();
  const text = cfg.extractFn(data);
  if (!text) throw new Error('Empty response');
  const words = text.trim().split(/\s+/).length;
  consoleLog(`✅ ${ai.name} — responded in ${elapsed}s (~${words} words)`, 'success');
  return text;
}

// ── HELPERS ──
function extractDocument(text) {
  const start = text.indexOf('[DOCUMENT START]');
  const end   = text.indexOf('[DOCUMENT END]');
  if (start === -1 || end === -1) return null;
  return text.slice(start + '[DOCUMENT START]'.length, end).trim();
}

function extractSummary(text) {
  // Get first meaningful line as summary
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  return first.length > 80 ? first.substring(0, 80) + '…' : first;
}

// ── ROUND HISTORY ──
function renderRoundHistory() {
  const el = document.getElementById('roundHistory');
  if (!el) return;
  if (history.length === 0) {
    el.innerHTML = '<div class="round-history-empty">No completed rounds yet.</div>';
    return;
  }
  el.innerHTML = history.slice().reverse().map((h, ri) => {
    const idx = history.length - 1 - ri;
    const phaseLabel = PHASES.find(p => p.id === h.phase)?.label || h.phase || '';
    return `
    <div class="round-hist-item">
      <div class="round-hist-hdr" onclick="toggleHistItem(${idx})">
        <span class="round-hist-badge">Round ${h.round}</span>
        <span class="round-hist-meta">${phaseLabel} · ${h.timestamp}</span>
        <span id="rha${idx}" style="color:var(--muted);font-size:11px;">▼</span>
      </div>
      <div class="round-hist-body" id="rhb${idx}">
        ${h.doc ? `<div style="color:var(--text-dim);font-size:12px;line-height:1.5;">${esc(h.doc.substring(0, 200))}${h.doc.length > 200 ? '…' : ''}</div>` : ''}
        <button class="round-hist-restore" onclick="restoreRound(${idx})">↩ Restore this round</button>
      </div>
    </div>`;
  }).join('');
}

function toggleHistItem(idx) {
  const b = document.getElementById('rhb' + idx);
  const a = document.getElementById('rha' + idx);
  if (!b) return;
  b.classList.toggle('open');
  if (a) a.textContent = b.classList.contains('open') ? '▲' : '▼';
}

function restoreRound(idx) {
  const h = history[idx];
  if (!h) return;
  round = h.round;
  phase = h.phase || 'draft';
  docText = h.doc || '';
  const docTa = document.getElementById('workDocument');
  if (docTa) docTa.value = docText;
  const ps = document.getElementById('phaseSelect');
  if (ps) ps.value = phase;
  updateRoundBadge();
  renderWorkPhaseBar();
  saveSession();
  toast(`↩ Restored Round ${h.round}`);
}

// ── EXPORT ──
function exportDocument() {
  const doc = document.getElementById('workDocument')?.value?.trim();
  if (!doc) { toast('⚠️ Nothing to export yet'); return; }
  const name = document.getElementById('workProjectName')?.textContent || 'document';
  const ver  = document.getElementById('workProjectVersion')?.textContent || '';
  const blob = new Blob([doc], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `${name}${ver ? ' ' + ver : ''}.txt`;
  a.click();
  toast('💾 Document exported');
}

function exportSession() {
  const name    = document.getElementById('projectName')?.value.trim()    || 'AI-Hive';
  const version = document.getElementById('projectVersion')?.value.trim() || '';
  const doc     = document.getElementById('workDocument')?.value.trim()   || '';
  const safeName  = name.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').substring(0, 40);
  const versionStr = version ? `-${version.replace(/[^a-z0-9.]/gi, '')}` : '';
  const eq = '═'.repeat(30);

  if (history.length === 0 && !doc) { toast('⚠️ Nothing to export'); return; }

  let out = `${eq}\nAI HIVE v2.0 — SESSION TRANSCRIPT\nProject: ${name}\nExported: ${new Date().toLocaleString()}\n${eq}\n\n`;
  history.forEach(h => {
    const phaseLabel = PHASES.find(p => p.id === h.phase)?.label || h.phase || '';
    out += `${eq}\nROUND ${h.round} · ${phaseLabel} — ${h.timestamp}\n${eq}\n\n`;
    if (h.doc) out += `DOCUMENT:\n${'─'.repeat(30)}\n${h.doc}\n\n`;
    Object.keys(h.responses || {}).forEach(id => {
      if (h.responses[id]) {
        const ai = activeAIs.find(a => a.id === id);
        out += `${(ai ? ai.name : id).toUpperCase()}:\n${'─'.repeat(30)}\n${h.responses[id]}\n\n`;
      }
    });
  });

  const blob = new Blob([out], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `AIHive-${safeName}${versionStr}-Transcript.txt`;
  a.click();
  URL.revokeObjectURL(url);

  if (doc) {
    setTimeout(() => {
      const b2 = new Blob([doc], { type: 'text/plain' });
      const u2 = URL.createObjectURL(b2);
      const a2 = document.createElement('a');
      a2.href = u2; a2.download = `AIHive-${safeName}${versionStr}-Document.txt`;
      a2.click();
      URL.revokeObjectURL(u2);
    }, 400);
  }

  toast('💾 Exported transcript + document');
}

function copyDocument() {
  const text = document.getElementById('workDocument')?.value.trim();
  if (!text) { toast('⚠️ No document to copy'); return; }
  navigator.clipboard.writeText(text).then(() => toast('📋 Document copied'));
}

function clearDocument() {
  if (!confirm('Clear the working document?')) return;
  const docTa = document.getElementById('workDocument');
  if (docTa) { docTa.value = ''; updateLineNumbers(); }
  docText = '';
  saveSession();
}

// ── THEME ──
const THEME_KEY = 'aihive_v2_theme';

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === t);
  });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  setTheme(saved);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadSettings(); // always load hive (AI keys) silently

  const hasSession = loadSession();

  // Only resume project if there's actually a project name saved
  let projectName = '';
  try {
    const proj = JSON.parse(localStorage.getItem(LS_PROJECT) || '{}');
    projectName = proj.projectName || '';
  } catch(e) {}

  if (hasSession && docText) {
    // Active session with document — resume work screen
    goToScreen('screen-work');
    initWorkScreen();
  } else if (projectName) {
    // Named project in progress — resume at project setup
    goToScreen('screen-project');
  } else {
    // Fresh start — always show welcome screen
    goToScreen('screen-welcome');
  }

  // Render API setup if starting on that screen
  if (document.getElementById('screen-setup')?.classList.contains('active')) {
    if (activeAIs.length === 0) activeAIs = [...aiList];
    renderAISetupGrid();
  }
});
