# AI Hive

<img src="images/AI_Hive_Logo_v4__ChatGPT.png" alt="AI Hive" width="120">

**A multi-AI document collaboration workspace — no install, no server, just open and go.**

AI Hive orchestrates multiple AI assistants to collaboratively create and refine documents through a structured 3-phase process. One AI acts as the **Builder** — it owns the document and produces updated versions. The rest act as **Reviewers** — they give numbered, actionable suggestions only.

---

## ⚡ Quick Start — No Install Required

**Step 1 — Download**

Click the green **Code** button at the top of this page → **Download ZIP**

| Light Mode | Dark Mode |
|-----------|-----------|
| ![AI Hive Light Mode](images/readme-screenshot-light.png) | ![AI Hive Dark Mode](readme-screenshot-dark.png) |

**Step 2 — Unzip**

Right-click the downloaded ZIP file and choose **Extract All** (Windows) or double-click it (Mac). Put the folder anywhere you like — your Desktop, Documents, wherever.

**Step 3 — Launch**

Open the folder and double-click **AI Hive.html**

That's it. It opens in your browser and is ready to use. No installation, no account, no internet connection required after download.

> **Tip:** Right-click `AI Hive.html` and choose **Pin to taskbar** (Windows) or drag it to your Dock (Mac) for one-click access in the future.

---

## ✨ Features

- **6 built-in AI worker bees** — ChatGPT, Claude, Copilot, Gemini, Grok, Perplexity
- **Add any AI** — custom name, URL, and auto-fetched favicon
- **Smart build button** — automatically detects what to build based on current state
- **3-phase workflow** — Draft → Refine Text → User Review
- **Builder / Reviewer roles** — one AI builds, the rest critique
- **Project goal field** — included in Draft prompts, dropped in later phases
- **Round tracking** — advances through rounds, saves all history
- **Full session history** — review and restore any past round
- **Export to .txt** — saves full transcript plus current document
- **Light / Dark / Auto theme** — follows OS preference or set manually
- **Persistent state** — everything saved to localStorage, survives page refresh
- **Zero dependencies** — pure HTML, CSS, and vanilla JS. No npm, no build step.

---

## 🚀 First Time Setup

1. Follow the **Quick Start** steps above to download and launch
2. Fill in **Project Details** — version, name, and goal
3. Set your **Builder** AI — the one that will write the updated document each round
4. Follow the 3-phase workflow below

---

## 📋 The 3-Phase Workflow

### Phase 1 — Draft

**Starting from scratch (no document):**
1. Fill in your project goal
2. Click **⚡ Build & Copy Prompt** — builds a "create a first draft" prompt
3. Paste into all AI tabs and wait for responses
4. Paste each response into its card
5. Click **⚡ Build & Copy Prompt** again — builds a Builder prompt to consolidate the best draft
6. Paste into your Builder AI only — get the first unified document
7. Paste that document into Working Document and move to Phase 2

**Starting with an existing document:**
1. Paste your document into Working Document
2. Click **⚡ Build & Copy Prompt** — builds a Reviewer prompt
3. Paste into all AI tabs, collect feedback
4. Paste responses into cards
5. Click **⚡ Build & Copy Prompt** again — builds a Builder prompt
6. Paste into your Builder AI only — get the updated document
7. Move to Phase 2

---

### Phase 2 — Refine Text *(loop until consensus)*

1. Paste current document into Working Document
2. Click **⚡ Build & Copy Prompt** — builds Reviewer prompt (send to all AIs)
3. Paste into all AI tabs and wait for responses
4. Paste responses into cards
5. Click **⚡ Build & Copy Prompt** — now builds Builder prompt (send to Builder only)
6. Paste into Builder AI — get updated document
7. Paste updated document into Working Document
8. Click **Next Round →**
9. Repeat from step 2 until all AIs respond **NO CHANGES NEEDED**

---

### Phase 3 — User Review

Use this when you want to read the document yourself and make your own edits before the next AI round.

1. Paste current document into Working Document
2. Click **⚡ Build & Copy Prompt** — builds a Builder-only prompt for a clean review copy
3. Paste into Builder AI only — get the clean document
4. Read it and make your own edits directly in Working Document
5. When satisfied, switch back to **Phase 2** for another AI review round

---

## 🐝 The Build Button — How It Decides What to Build

The **⚡ Build & Copy Prompt** button is context-aware. It reads the current state and builds the right prompt automatically:

| State | What it builds | Who gets it |
|-------|---------------|-------------|
| No document, no responses | Create a first draft | All AIs |
| Document pasted, no responses | Review this document | All AIs |
| Responses pasted | Compile the updated document | Builder only |
| Phase 3 (User Review) | Produce a clean review copy | Builder only |

The compiled prompt always shows **SEND TO ALL AIs** or **⚠️ SEND THIS TO [BUILDER] ONLY** so you always know who gets it.

---

## 🔧 UI Layout

| Column | Purpose |
|--------|---------|
| **Sidebar — Project Details** | Version, project name, goal, and AI worker bees |
| **Col 3 — Working Document** | The current document — paste or edit directly |
| **Col 4 — Paste Responses** | Paste each AI's response into its card |
| **Col 5 — Prompts** | Build & Copy button, phase instructions, compiled send block |
| **Bottom bar** | Round, phase, response count, status, ← Prev Round, Next Round → |

---

## 🛠 Customization

**Add a custom AI:** Click **＋ Add** in the worker bees panel, enter a name and URL. The favicon is fetched automatically.

**Change the Builder:** Click **Set Builder** next to any AI. The 👑 crown moves to that AI.

**Deactivate an AI for a round:** Uncheck its checkbox. It disappears from the response cards but stays in your panel.

**Edit phase instructions:** The instructions in the Prompts column are fully editable. Changes are saved per-phase.

**Switch themes:** Use the ☀️ ⚙️ 🌙 toggle in the top-right corner. Auto follows your OS preference.

---

## 🔒 Privacy

Everything stays in your browser. No data is sent anywhere by AI Hive itself. Your prompts and responses go directly between you and each AI's website.

---

## 📁 File Structure

```
ai-hive/
├── AI Hive.html        — Double-click this to launch the app
├── style.css           — All styling, light/dark themes
├── app.js              — All logic, state, and workflow
├── README.md           — This file
├── LICENSE             — MIT license
└── images/
    ├── AI_Hive_Logo_v4__ChatGPT.png
    ├── Ai_Hive_Bee_v1.png
    ├── chatgpt.ico
    ├── claude.ico
    ├── copilot.ico
    ├── perplexity.ico
    ├── readme-screenshot-light.png
    └── readme-screenshot-dark.png
```

---

## 📄 License

MIT — see `LICENSE` for details.

---

*Built for humans who think the best document is the one that survived the most criticism.*
