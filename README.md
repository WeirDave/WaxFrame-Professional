<div align="center">

<img src="images/AI_Hive_Logo_v4.png" width="140" alt="AI Hive">

# AI Hive

**Orchestrate the Hive**

Put a team of AI assistants to work on your document — simultaneously. One writes. The rest review. Every round, it gets better.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0-orange.svg)](https://github.com/WeirDave/AIHive/releases)
[![Runs In Browser](https://img.shields.io/badge/Runs_In_Browser-No_Install-green.svg)](https://weirdave.github.io/AIHive/)

<a href="https://weirdave.github.io/AIHive/" target="_blank"><strong>→ Launch AI Hive</strong></a>

</div>

---

![AI Hive Welcome Screen](screenshots/screenshot_welcome_dark.png)

---

## What is AI Hive?

AI Hive is a browser-based multi-AI document collaboration tool. You bring the AIs — AI Hive coordinates them. One AI acts as the **Builder**, rewriting your document each round based on numbered suggestions from your **Reviewer** AIs. Round by round, your document converges on something great.

No install. No server. No account. Just open it and go.

---

## How It Works

<img src="images/AI_Hive_Worker_Bee_v2.png" width="160" align="right" alt="Worker Bee">

**1. Set up your Hive**
Add API keys for the AIs you want to use and pick your Builder. You need at least 2 AIs to run a round.

**2. Describe your project**
Give it a name, version, and a detailed goal. The more specific your goal, the better your results from round one.

**3. Run the Draft phase — once**
If you started from scratch, run one Draft round. Every AI writes an independent first draft. Your Builder consolidates them into a single document. That's all Draft is for — one round to get you a starting document. If you uploaded or pasted an existing document, AI Hive skips Draft entirely and starts you in Refine Text automatically.

**4. Switch to Refine Text**
After your first draft exists, switch the phase selector to **Refine Text**. This is where you'll spend most of your time. Reviewers now send targeted numbered suggestions instead of full rewrites, and your Builder applies the best ones each round.

**5. Iterate**
Add notes before each round to guide the hive. Keep shaking. Watch the document sharpen round by round.

**6. Export**
When you're done, export the clean final document and the full session transcript.

---

## Setup — Configure Your Hive

![Setup Step 1 — Worker Bees and Builder](screenshots/screenshot_setup1_dark.png)

Add API keys for each AI you want to use, then pick your **Builder** — the AI that will rewrite the document each round. You need at least 2 AIs with saved keys to run a round. Your Builder needs a paid API subscription with enough token capacity.

---

## Setup — Your Project

![Setup Step 2 — Your Project](screenshots/screenshot_setup2_dark.png)

Give your project a name, version, and goal. Then choose how to start:
- **Upload a file** — Word, PDF, PowerPoint, or plain text
- **Paste text** — paste an existing draft directly
- **Start from Scratch** — let your AIs build the first draft from your goal

> **To launch you need:** a project name, a project goal, and a document source (upload, paste, or scratch). The Launch button won't proceed until all three are filled.

---

## The Work Screen

![Work Screen](screenshots/screenshot_work_dark.png)

Three columns keep everything in view:

- **Working Document** — your live document with line numbers. Edit directly any time.
- **Conflicts** — anything the Builder couldn't resolve is flagged here for your review.
- **Notes for this Round** — optional direction for the Builder before each round. Reference line numbers.

Hit **Smoke the Hive** to run a round. Watch the Live Console as each AI responds in real time.

### Phases

The phase selector at the top of the screen controls what your AIs do each round.

**Draft** — each AI writes a complete first draft from your project goal. Use this once, for the very first round of a from-scratch project. Your Builder consolidates all the drafts into one document.

**Refine Text** — each AI reads the current document and sends numbered suggestions only. Your Builder applies the best ones and rewrites the full document. This is where you'll spend most of your session — switch to Refine Text after your first draft is ready and stay there.

> If you uploaded or pasted a document at setup, AI Hive starts you in Refine Text automatically. You never need to touch Draft.

---

## Also looks great in Light Mode

| Welcome | Setup | Work |
|---|---|---|
| ![](screenshots/screenshot_welcome_light.png) | ![](screenshots/screenshot_setup1_light.png) | ![](screenshots/screenshot_work_light.png) |

---

## Two Modes

### 🆓 Free — Manual
No API keys needed. AI Hive generates the prompts. You copy each one to your AI tabs, paste the responses back, and AI Hive assembles the Builder prompt for you. Works with any AI — free tiers included.

### ⚡ Pro — Automated
One button does everything. Each AI needs its own API key. AI Hive sends the prompts and collects responses automatically — no copy/paste, no tab switching.

---

## Supported AIs

<img src="images/AI_Hive_Builder_v3.png" width="140" align="right" alt="Builder Bee">

| AI | Provider | Best Role | Notes |
|---|---|---|---|
| ChatGPT | OpenAI | Builder | Excellent at high volume |
| Claude | Anthropic | Builder | Large context, precise |
| Gemini | Google | Builder | Free tier available — great starting point |
| DeepSeek | DeepSeek | Builder | Very low cost per token |
| Grok | xAI | Reviewer | Good context, API limits vary |
| Perplexity | Perplexity | Reviewer | Search-focused, better as reviewer |

You can also add any **custom AI** with an OpenAI-compatible API endpoint.

---

## Getting Started

AI Hive runs entirely in your browser — no install, no server, no account required.

**Option 1 — Hosted version (easiest):**
👉 [weirdave.github.io/AIHive](https://weirdave.github.io/AIHive/)

**Option 2 — Run locally:**
1. Download or clone this repo
2. Open `index.html` in your browser
3. That's it

---

## API Keys

Each AI in Pro mode needs its own key from that provider. Keys are stored in your browser's `localStorage` and never leave your machine.

| Provider | Key Console |
|---|---|
| OpenAI (ChatGPT) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic (Claude) | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Google (Gemini) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |
| xAI (Grok) | [console.x.ai](https://console.x.ai) |
| Perplexity | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |

For step-by-step instructions, open the **API Key Guide** inside the app.

---

## Privacy

- **No server.** No backend. No tracking. No analytics.
- **Your documents stay on your machine.** Nothing is ever uploaded anywhere.
- **Your API keys stay in your browser.** They go directly to each AI provider.
- **Fully open source.** Read every line at [github.com/WeirDave/AIHive](https://github.com/WeirDave/AIHive).

---

## Understanding Tokens

If you're using Pro mode, tokens matter — especially for your Builder. Every round, your Builder reads the entire document plus all reviewer suggestions and rewrites it. On a 2,000-word document that's roughly **6,000 tokens per round**.

**Gemini's free tier is genuinely generous** and a great way to start. For paid options, DeepSeek is the most cost-effective Builder.

Open the **Token Guide** inside the app for a full breakdown.

---

## License

AI Hive is open source under the **GPL-3.0** license. See [LICENSE](LICENSE) for full terms.

---

<div align="center">

<img src="images/AI_Hive_Logo_v4.png" width="60" alt="AI Hive">

Built by **WeirDave** · [github.com/WeirDave](https://github.com/WeirDave)

*With a lot of help from the hive.* 🐝

</div>
