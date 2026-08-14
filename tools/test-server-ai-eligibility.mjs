import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');

function extractFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const open = appSource.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = open; i < appSource.length; i++) {
    const char = appSource[i];
    const next = appSource[i + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return appSource.slice(start, i + 1);
  }
  throw new Error(`Unterminated function ${name}`);
}

const ais = [
  { id: 'cloud-ready', provider: 'cloud-ready', name: 'Cloud Ready' },
  { id: 'cloud-empty', provider: 'cloud-empty', name: 'Cloud Empty' },
  { id: 'server-local-a', provider: 'server-local-a', name: 'Local A' },
  { id: 'server-local-b', provider: 'server-local-b', name: 'Local B' }
];
const configs = {
  'cloud-ready': { _key: 'secret' },
  'cloud-empty': {},
  'server-local-a': { _modelsEndpoint: 'http://localhost:11434/v1/models' },
  'server-local-b': { _modelsEndpoint: 'http://localhost:1234/v1/models', _key: '' }
};

const harnessState = { toastMessages: [], lastScreen: null };
const context = vm.createContext({
  API_CONFIGS: configs,
  aiList: ais,
  _hiveMode: 'server',
  activeAIs: [],
  builder: null,
  toast(message) { harnessState.toastMessages.push(message); },
  _aiListAlpha(items) { return [...items].sort((a, b) => a.name.localeCompare(b.name)); },
  saveHive() {},
  goToScreen(id) { harnessState.lastScreen = id; },
  consoleLog() {}
});

vm.runInContext([
  extractFunction('isServerImportedAI'),
  extractFunction('isAIReadyForUse'),
  extractFunction('getConfiguredAIsForMode'),
  extractFunction('continueFromBees'),
  'this.api = { isServerImportedAI, isAIReadyForUse, getConfiguredAIsForMode, continueFromBees };'
].join('\n'), context);

assert.equal(context.api.isAIReadyForUse(ais[0]), true, 'a keyed Internet AI is ready');
assert.equal(context.api.isAIReadyForUse(ais[1]), false, 'an unkeyed Internet AI is not ready');
assert.equal(context.api.isAIReadyForUse(ais[2]), true, 'a keyless server AI is ready');
assert.deepEqual(
  Array.from(context.api.getConfiguredAIsForMode('server'), ai => ai.id),
  ['server-local-a', 'server-local-b'],
  'Server mode counts listed server imports regardless of API-key presence'
);
assert.deepEqual(
  Array.from(context.api.getConfiguredAIsForMode('internet'), ai => ai.id),
  ['cloud-ready'],
  'Internet mode counts only keyed, non-server AIs'
);

context.api.continueFromBees();
assert.deepEqual(
  Array.from(context.activeAIs, ai => ai.id),
  ['server-local-a', 'server-local-b'],
  'Continue activates the Server-mode list instead of filtering it by key'
);
assert.equal(harnessState.lastScreen, 'screen-project');
assert.equal(context.builder, 'server-local-a');

context._hiveMode = 'internet';
context.activeAIs = [];
context.builder = null;
harnessState.lastScreen = null;
context.api.continueFromBees();
assert.equal(harnessState.lastScreen, null, 'Internet mode still blocks with fewer than two keyed AIs');
assert.match(harnessState.toastMessages.at(-1), /API keys for at least 2 AIs/);

const normalRoundGate = appSource.slice(
  appSource.indexOf('// Internet AIs need keys; imported model-server AIs may be keyless.'),
  appSource.indexOf('// Set running state', appSource.indexOf('// Internet AIs need keys; imported model-server AIs may be keyless.'))
);
assert.match(normalRoundGate, /isAIReadyForUse\(ai\)/, 'normal rounds use the shared readiness rule');
assert.match(extractFunction('getBuilderContentFilterFailoverCandidates'), /isAIReadyForUse\(ai\)/);
const setupRow = extractFunction('buildAISetupRowHTML');
assert.match(setupRow, /const isReady\s+=\s+isAIReadyForUse\(ai\)/, 'server rows derive their controls from readiness');
assert.match(setupRow, /const compactModel = isReady/, 'keyless server rows retain their model picker');
assert.match(setupRow, /if \(!isReady\)/, 'Builder controls use readiness instead of key presence');
assert.match(storageSource, /if \(k\) headers\['Authorization'\]/, 'restored keyless configs omit Authorization');

console.log('Server AI eligibility tests passed.');
