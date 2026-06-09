#!/usr/bin/env python3
"""One-shot rewrite of the Checkpoints screen Save and Restore panels.

Generates new HTML for both panels using plain-language descriptions
and the stacked preview-block row layout, then replaces both panels in
index.html. Run once for the v3.63.228 redesign, then delete this file.
"""
import pathlib, re

desc = {
    'projectInfo': "<strong>What&rsquo;s in here:</strong> project name, version number, document type, target audience, desired outcome, scope and constraints, tone, notes, length settings, and the file export name.",
    'refMaterial': "<strong>What&rsquo;s in here:</strong> the documents you uploaded on Setup 3 for the hive to reference each round &mdash; source materials the AIs read while working, but never edit.",
    'startingDoc': "<strong>What&rsquo;s in here:</strong> the document you pasted on Setup 4 (if you started from a draft rather than from scratch). The hive&rsquo;s Round 1 refinement begins from this text.",
    'session':     "<strong>What&rsquo;s in here:</strong> your in-progress refinement &mdash; every round that&rsquo;s already run, the current working document, the live console transcript, your notes and standing notes, and the debug ring buffer. Include this if you want to resume the session later without losing progress.",
    'aiList':      "<strong>What&rsquo;s in here:</strong> which default AIs are currently active in your hive, any custom AIs you&rsquo;ve added (with their endpoint configs), and the hive mode (Internet vs Server). Does <strong>not</strong> include the model picks or API keys &mdash; those are separate rows below.",
    'models':      "<strong>What&rsquo;s in here:</strong> which specific model each AI is set to (e.g. Claude &rarr; Opus 4.5 vs Sonnet 4.6). Include this when sharing an exact-model recipe. <strong>Leave off</strong> when the receiving machine should pick its own best model per AI &mdash; useful when you have different access tiers at work vs home.",
    'keys':        "<strong>What&rsquo;s in here:</strong> the API key string saved for each AI in your hive. Sensitive &mdash; <strong>leave off when sharing the file with anyone else</strong>. Safe to include for your own private backups.",
    'builder':     "<strong>What&rsquo;s in here:</strong> which AI in your hive is currently set as the Builder for refinement rounds. Just the AI selection &mdash; not the specific model under it (that&rsquo;s the Model picks row above).",
    'license':     "<strong>What&rsquo;s in here:</strong> your WaxFrame Pro license key. Default on when saving for self-portability between your own machines; default off when restoring on a machine that already has its own license.",
}

label = {
    'projectInfo': 'Project info',
    'refMaterial': 'Reference Material',
    'startingDoc': 'Starting Document',
    'session':     'Session in progress',
    'aiList':      'AI list',
    'models':      'Model picks',
    'keys':        'API keys',
    'builder':     'Builder selection',
    'license':     'License key',
}

groups = [
    ('Project', ['projectInfo', 'refMaterial', 'startingDoc']),
    ('Session', ['session']),
    ('Hive',    ['aiList', 'models', 'keys', 'builder']),
    ('License', ['license']),
]

def cap(k): return k[0].upper() + k[1:]

def save_row(k):
    cid = 'saveScope' + cap(k)
    vid = 'saveCurrent' + cap(k)
    return (
        '              <label class="checkpoint-row">\n'
        '                <span class="checkpoint-row-pick">\n'
        f'                  <input type="checkbox" id="{cid}">\n'
        '                  <span class="checkpoint-row-text">\n'
        f'                    <span class="checkpoint-row-name">{label[k]}</span>\n'
        f'                    <span class="checkpoint-row-desc">{desc[k]}</span>\n'
        '                  </span>\n'
        '                </span>\n'
        '                <span class="checkpoint-row-previews">\n'
        '                  <span class="checkpoint-row-preview">\n'
        '                    <span class="checkpoint-row-preview-label">In your current state</span>\n'
        f'                    <span class="checkpoint-row-preview-value" id="{vid}">&mdash;</span>\n'
        '                  </span>\n'
        '                </span>\n'
        '              </label>'
    )

def restore_row(k):
    cid = 'restoreScope' + cap(k)
    cur_vid = 'restoreCurrent' + cap(k)
    ck_vid  = 'restoreCheckpoint' + cap(k)
    return (
        '                <label class="checkpoint-row">\n'
        '                  <span class="checkpoint-row-pick">\n'
        f'                    <input type="checkbox" id="{cid}">\n'
        '                    <span class="checkpoint-row-text">\n'
        f'                      <span class="checkpoint-row-name">{label[k]}</span>\n'
        f'                      <span class="checkpoint-row-desc">{desc[k]}</span>\n'
        '                    </span>\n'
        '                  </span>\n'
        '                  <span class="checkpoint-row-previews">\n'
        '                    <span class="checkpoint-row-preview">\n'
        '                      <span class="checkpoint-row-preview-label">In your current state</span>\n'
        f'                      <span class="checkpoint-row-preview-value" id="{cur_vid}">&mdash;</span>\n'
        '                    </span>\n'
        '                    <span class="checkpoint-row-preview">\n'
        '                      <span class="checkpoint-row-preview-label">In this checkpoint file</span>\n'
        f'                      <span class="checkpoint-row-preview-value" id="{ck_vid}">&mdash;</span>\n'
        '                    </span>\n'
        '                  </span>\n'
        '                </label>'
    )

def save_group(name, keys):
    rows = '\n'.join(save_row(k) for k in keys)
    return (
        '            <div class="checkpoint-row-group">\n'
        f'              <div class="checkpoint-row-group-label">{name}</div>\n'
        f'{rows}\n'
        '            </div>'
    )

def restore_group(name, keys):
    rows = '\n'.join(restore_row(k) for k in keys)
    return (
        '              <div class="checkpoint-row-group">\n'
        f'                <div class="checkpoint-row-group-label">{name}</div>\n'
        f'{rows}\n'
        '              </div>'
    )

save_body = '\n\n'.join(save_group(n, ks) for n, ks in groups)
restore_body = '\n\n'.join(restore_group(n, ks) for n, ks in groups)

save_panel = (
    '          <div class="checkpoint-panel" id="chkSavePanel">\n'
    '            <p class="checkpoint-panel-help">Pick which sections of your current local state go in the checkpoint file. Each row describes what&rsquo;s in that section and shows what&rsquo;s in your live state right now. Tick the sections you want included; untick what to leave out. <strong>License</strong> is included by default for self-portability (work &rarr; home on the same machine) &mdash; untick it when sharing the checkpoint with anyone else.</p>\n\n'
    f'{save_body}\n\n'
    '            <div class="checkpoint-actions">\n'
    '              <button class="btn" onclick="exitCheckpointScreen()" title="Cancel and return without saving">Cancel</button>\n'
    '              <button class="btn btn-cta" onclick="confirmSaveCheckpoint()" title="Save the ticked sections to a JSON file">&#x1F4BE; Save Checkpoint</button>\n'
    '            </div>\n'
    '          </div>'
)

restore_panel = (
    '          <div class="checkpoint-panel" id="chkRestorePanel" style="display:none">\n\n'
    '            <!-- Restore intro: shown before a file is picked. Trust warning\n'
    '                 + file-picker CTA. -->\n'
    '            <div id="chkRestoreIntro">\n'
    '              <div class="checkpoint-trust-warning">\n'
    '                <h3 class="checkpoint-trust-title">&#x26A0;&#xFE0F; Restore replaces local state</h3>\n'
    '                <p>Only restore checkpoints you created or trust. A checkpoint file can replace your project, AI setup, API keys, license key, and session state. After picking the file you&rsquo;ll see a side-by-side comparison &mdash; tick only the sections you want to bring in. Unticked sections keep their current local values byte-for-byte.</p>\n'
    '              </div>\n'
    '              <div class="checkpoint-actions">\n'
    '                <button class="btn" onclick="exitCheckpointScreen()" title="Cancel and go back">Cancel</button>\n'
    '                <button class="btn btn-cta" onclick="chooseCheckpointFile()" title="Open a file picker to choose a checkpoint JSON file">&#x1F4C2; Choose Checkpoint File</button>\n'
    '              </div>\n'
    '            </div>\n\n'
    '            <!-- Restore diff: shown after a file is parsed. Each row shows\n'
    '                 what is in that section, your current local value, and the\n'
    '                 checkpoint file value. Tick what to apply. -->\n'
    '            <div id="chkRestoreDiff" style="display:none">\n'
    '              <p class="checkpoint-restore-file-meta" id="restoreCheckpointFileMeta"></p>\n\n'
    f'{restore_body}\n\n'
    '              <div class="checkpoint-actions">\n'
    '                <button class="btn" onclick="chooseCheckpointFile()" title="Pick a different checkpoint file">&#x1F4C2; Choose Different File</button>\n'
    '                <button class="btn btn-cta" onclick="confirmRestoreCheckpoint()" title="Apply the ticked sections; unticked sections keep their current local values">&#x1F504; Restore Selected</button>\n'
    '              </div>\n'
    '            </div>\n'
    '          </div>'
)

p = pathlib.Path('index.html')
s = p.read_text()

save_re = re.compile(
    r'(?s)<div class="checkpoint-panel" id="chkSavePanel">.*?\n          </div>(?=\n\n          <!--)'
)
new_s, n1 = save_re.subn(save_panel, s)
print(f"Save panel replacements: {n1}")

restore_re = re.compile(
    r'(?s)<div class="checkpoint-panel" id="chkRestorePanel"[^>]*>.*?\n          </div>(?=\n\n        </div>)'
)
new_s, n2 = restore_re.subn(restore_panel, new_s)
print(f"Restore panel replacements: {n2}")

if n1 == 1 and n2 == 1:
    p.write_text(new_s)
    print("Written successfully.")
else:
    print("ERROR: expected exactly 1 each; nothing written.")
