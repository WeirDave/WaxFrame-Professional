# WaxFrame — New Session Handoff Prompt

## Who you are working with
David (GitHub: WeirDave / R David Paine III), sole developer of WaxFrame. He uses voice-to-text so input is often informal or fragmented — interpret charitably. He is direct, no-nonsense, and does not want you thinking out loud in responses. He commits every session via GitHub Desktop and pushes publicly on every commit.

---

## What WaxFrame is
WaxFrame is a desktop-only multi-AI document collaboration tool. It runs locally in a browser from a single HTML file (no server needed). It orchestrates multiple AI models through structured rounds: Reviewer AIs critique a document, a Builder AI incorporates accepted changes, and rounds repeat until convergence or user satisfaction. Supported models: ChatGPT, Claude, DeepSeek, Gemini, Grok, Perplexity. Custom AIs via OpenAI-compatible endpoints are also supported. Desktop-only — 1024px minimum enforced via overlay.

---

## Repository
- **Pro version (active):** github.com/WeirDave/WaxFrame-Professional
- **Live URL:** weirdave.github.io/WaxFrame-Professional/
- **Local path:** C:\Users\weird\Dropbox\Websites\WaxFrame-Professional
- **Free version:** weirdave.github.io/WaxFrame-Free/ — local at C:\Users\weird\Dropbox\Websites\WaxFrame-Free
- **Active branch:** main
- **Sold via:** weirdave.gumroad.com/l/aihive-pro
- **License verification:** api.gumroad.com/v2/licenses/verify

---

## Current file line counts (April 15, 2026 — end of session)
- index.html — 1162 lines
- app.js — 5516 lines (NOTE: this is from project files, may differ from working copy — always verify)
- style.css — 5277 lines
- CHANGELOG.md — 122 lines

**CRITICAL:** Always verify line counts with `wc -l` before making any changes. If counts differ from the above by more than a few lines, stop and ask David to upload current files. Never assume a working copy is current.

---

## Tech stack rules — non-negotiable
- Vanilla HTML/CSS/JS only — no frameworks ever
- No inline CSS ever — everything goes in style.css
- Courier New is the only monospace font — never JetBrains Mono
- Dark mode primary; light mode maintained in parallel
- CSS cascade order matters — modifier classes must come after base classes in style.css
- When removing any function or CSS block, always reconcile all references (stragglers) across all files

---

## Key localStorage keys
- `waxframe_v2_hive` — AI list and keys
- `waxframe_v2_project` — project settings
- `waxframe_v2_session` — session/round history (primary: IndexedDB, fallback: localStorage)
- `waxframe_resolved_decisions` — fuzzy-matched resolved conflicts
- `waxframe-claude-proxy` — Cloudflare Worker proxy URL for Claude (CORS workaround)
- `waxframe_dev` — dev mode flag (set to '1' to enable)

---

## Architecture notes
- Claude API is CORS-blocked from browser — routed through a Cloudflare Worker proxy at waxframe-claude-proxy.weirdave.workers.dev
- DEFAULT_AIS = ChatGPT, Claude, DeepSeek, Gemini, Grok, Perplexity (Copilot was removed)
- Current default models: ChatGPT = gpt-4.1, Claude = claude-sonnet-4-6, Grok = grok-3 (verify in live app dropdowns), Perplexity = sonar-pro
- Convergence logic uses strict majority (more than half active AIs) — not hardcoded
- `_resolvedDecisions` persisted to localStorage to survive refreshes and prevent re-raising settled conflicts — uses fuzzy matching
- Missing `%%CONFLICTS_START%%` block = hard error (round rejected, not saved)
- Builder prompt restricts em dashes to prevent USER DECISION parsing failures
- Web Audio API only for all sounds — no external audio files
- IndexedDB primary for session storage with localStorage fallback
- Icon loading uses local images/icon-*.png with onerror handlers (Google favicon service blocked on file://)

---

## Workflow rules
- **Always output complete files, never snippets**
- **Always end every response with a GitHub Desktop commit summary + description** (plain sentences, no bullets, no dashes, no fancy formatting)
- **Always update CHANGELOG.md** at the end of every session (or add to current version entry if version unchanged) and include it in output files
- **Surgical changes only** — warn before anything risky, fix issues one at a time
- **Never touch files outside the scope of the request**
- **Verify before modifying** — always check line counts and grep for key features before editing
- **Plan before executing** — especially before any Git operations
- **Mockups before code** for UI/design work
- **Maximum 3 steps at a time** during complex reorganizations
- David downloads files at each step to test in the real product
- David commits via GitHub Desktop after each session

---

## Orphan detection approach
- Python `re.findall` with `\b` word-boundary patterns across all files combined is more reliable than grep
- Functions called only via dynamically injected innerHTML onclick strings require manual grep confirmation
- CSS block removal: Python parser tracking brace depth line-by-line, confirming all classes in a selector are in the orphan set before removing

---

## Current version
v3.4 — April 15, 2026

---

## Active issue at end of last session — UNRESOLVED
The utility buttons on Setup Page 1 (API Key Guide, Add Custom AI, Hide All Defaults, Open API Websites, Reset to Defaults, Test All Keys) and the clear buttons on Setup Page 2 (Clear Goal, Clear Project) are stretching to fill their container width instead of being compact like the CTA button.

The CTA button classes are: `btn btn-lg btn-accent btn-cta`
- `btn-lg` = font-size 15px, padding 12px 28px, border-radius var(--radius-md)
- `btn-accent` = filled amber background (toggled on by JS when checklist is met)
- `btn-cta` = min-width 320px, justify-content center

The utility buttons currently have `btn btn-lg btn-cta` in the working index.html. The stretching is likely caused by their flex/grid container forcing them to expand. The fix needs to account for the container layout — do NOT just add width: fit-content or flex: 0 0 auto without understanding why the container is stretching them. Inspect the full container CSS first before touching anything.

The relevant CSS containers are:
- `.bee-controls-row-setup` — wraps the 6 utility buttons on page 1 (display: flex, flex-wrap: wrap)
- `.proj-clear-row` / `.proj-clear-row--bottom` — wraps the 2 clear buttons on page 2 (display: flex)

David will provide a screenshot when you attempt a fix so you can see the actual result.

---

## Key collaborators
- **Kai** — creates logo/image assets, exports as transparent-background PNGs, edge-to-edge cropped, flat vector style
- **Candy** — branding and UX feedback, sound design input

---

## Files in the repo (notable)
Core: index.html, app.js, style.css, CHANGELOG.md, README.md
Helper pages: api-details.html, waxframe-user-manual.html, what-are-tokens.html, prompt-editor.html, document-playbooks.html
Reference: AI_Hive_-_Prompts_Reference_Document_v2.txt (needs renaming and WaxFrame rebrand update)
Assets: images/ directory containing all bee characters, logos, AI icons
PDFs/Docs: WaxFrame-Getting-Started.pdf/.docx, WaxFrame-README.pdf/.docx

---

## Things still on the to-do list
1. **Resolve the button stretching issue described above** — first priority
2. **Rename and update the Prompts Reference Document** — rename from AI_Hive_-_Prompts_Reference_Document_v2.txt to WaxFrame_Prompts_Reference_v3.txt, replace all "AI Hive" references with "WaxFrame", remove Copilot references, update majority rules description to match current strict majority logic, update version/build stamp
3. **Create a docs/ subdirectory** — move PDF and DOCX files out of repo root to clean up the folder
4. **Code scour** — check for stragglers, spelling errors, orphaned CSS/JS after all the recent churn
