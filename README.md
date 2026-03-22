# AI Hive

**Orchestrate multiple AI assistants simultaneously on your documents.**

AI Hive puts a team of AI assistants to work on your document at the same time. One acts as the **Builder** — writing and refining the document each round. The rest act as **Reviewers** — giving specific, numbered suggestions. Round by round, your document gets sharper.

![AI Hive Screenshot](images/readmescreenshotdark.png)

---

## How it works

1. **Set up your hive** — add API keys for the AIs you want to use and pick your Builder
2. **Describe your project** — give it a name, version, and goal
3. **Shake the Hive** — all your AIs review the document simultaneously, then your Builder compiles their suggestions and rewrites the document
4. **Iterate** — add notes, keep shaking, watch the document improve round by round
5. **Export** — when you're happy, export the full session transcript and your clean final document

---

## Two modes

### Free — Manual
No API keys needed. AI Hive generates the prompts for you. You copy each prompt to your AI tabs manually, paste the responses back, and the Builder prompt is assembled for you. Works with any AI — free tiers included.

### Pro — Automated
One button does everything. Each AI you want to use needs its own API key. Requires a **[license key](https://weirdave.gumroad.com/l/aihive-pro)** after 3 free trial rounds.

---

## Supported AIs (Pro mode)

| AI | Provider | Notes |
|---|---|---|
| ChatGPT | OpenAI | Recommended Builder |
| Claude | Anthropic | Recommended Builder |
| Gemini | Google | Free tier available — great Builder option |
| DeepSeek | DeepSeek | Very low cost per token |
| Grok | xAI | Good reviewer |
| Perplexity | Perplexity | Best as a Reviewer |

You can also add any **custom AI** with an OpenAI-compatible API.

---

## Getting started

AI Hive runs entirely in your browser — no install, no server, no account required.

**Option 1 — Use the hosted version:**
👉 [weirdave.github.io/AIHive](https://weirdave.github.io/AIHive/)

**Option 2 — Run locally:**
1. Download or clone this repo
2. Open `index.html` in your browser
3. That's it

---

## API keys

Each AI in Pro mode needs its own API key from that provider. Keys are stored locally in your browser and never leave your machine.

- **OpenAI (ChatGPT):** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic (Claude):** [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- **Google (Gemini):** [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **DeepSeek:** [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
- **xAI (Grok):** [console.x.ai](https://console.x.ai)
- **Perplexity:** [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)

For step-by-step instructions open the **API Key Guide** inside the app.

---

## Privacy

- No server. No backend. No tracking.
- Your documents and API keys never leave your browser.
- Everything is stored in `localStorage` on your own machine.
- Source code is fully open — read every line.

---

## License

AI Hive is open source under the **AGPL-3.0** license.

The **Pro automated mode** requires a paid license key available at [weirdave.gumroad.com/l/aihive-pro](https://weirdave.gumroad.com/l/aihive-pro). The free manual mode is unlimited and always free.

See [LICENSE](LICENSE) for full terms.

---

## Built by

**WeirDave** — [github.com/WeirDave](https://github.com/WeirDave)

With a lot of help from the hive. 🐝
