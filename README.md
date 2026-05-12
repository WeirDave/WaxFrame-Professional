<div align="center">

<img src="images/Waxframe_logo_v19.png" width="140" alt="WaxFrame">

# WaxFrame

### One-shot AI writing is good.
### Multi-AI refinement is better.

**Many minds. One refined result.**

WaxFrame is a browser-based multi-AI document refinement system that lets multiple AIs review, critique, and improve the same document simultaneously — while one AI acts as the Builder, merging the best ideas into a new version each round.

Instead of trusting a single AI response, WaxFrame creates a structured editorial workflow:
- multiple reviewers,
- one Builder,
- conflict tracking,
- iterative refinement,
- and human oversight at every stage.

No install. No server. No account. No cloud lock-in.

Your documents stay on your machine.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-3.38.12-orange.svg)](https://github.com/WeirDave/WaxFrame-Professional/releases)
[![Build](https://img.shields.io/badge/Build-20260511--019-blue.svg)](https://github.com/WeirDave/WaxFrame-Professional)
[![Runs In Browser](https://img.shields.io/badge/Runs_In_Browser-No_Install-green.svg)](https://weirdave.github.io/WaxFrame-Professional/)

<a href="https://weirdave.github.io/WaxFrame-Professional/" target="_blank"><strong>→ Launch WaxFrame</strong></a>

</div>

![WaxFrame Welcome Screen](screenshots/screenshot_welcome_dark.png)

---

# Why WaxFrame Exists

Most AI writing workflows are one-shot:
- ask one model,
- get one answer,
- manually rewrite,
- repeat.

That works for simple tasks.

But longer, more important documents break down quickly:
- inconsistent tone,
- hallucinated details,
- weak structure,
- repetitive wording,
- conflicting edits,
- unclear priorities.

WaxFrame approaches document creation differently.

Instead of relying on one AI response, it creates a collaborative review process where multiple AIs critique the same document simultaneously. One AI — the **Builder** — then evaluates those suggestions, resolves disagreements, and rewrites the document into a new refined version.

Round by round, the document converges toward something stronger.

---

# What Makes WaxFrame Different

## Multiple AIs reviewing the same document

Each AI brings different strengths:
- structure,
- clarity,
- tone,
- factual rigor,
- conciseness,
- formatting,
- persuasion,
- editing style.

WaxFrame lets them all review the same document at once.

---

## One Builder — two roles

The Builder is both a **synthesizer** and a **handyman**.

As **synthesizer**, the Builder:
- reads the entire document,
- reads every reviewer suggestion,
- resolves conflicts,
- rewrites the document,
- and flags unresolved disagreements for you.

As **handyman**, the Builder acts on direct instructions from you. Write a targeted directive in the **Notes drawer** — *"rewrite the first paragraph,"* *"stop saying 'refine' so much,"* *"tighten paragraph three"* — and click **Send to Builder**. The Builder performs just that one task, no reviewer round needed. Click **Smoke the Hive** afterward when you want the reviewers to weigh in on the change.

The pairing — Notes plus Send to Builder for targeted edits, then full reviewer feedback when you want validation — is one of WaxFrame's most useful workflows.

You stay in control the entire time.

---

## Human decisions stay human

When reviewer AIs disagree, WaxFrame surfaces the conflict instead of pretending certainty.

You can:
- choose an option,
- override the Builder,
- type your own direction,
- or bypass the conflict entirely.

Nothing is hidden.

---

## Privacy-first architecture

WaxFrame runs entirely in your browser.

There is:
- no WaxFrame server,
- no cloud sync,
- no account system,
- no telemetry,
- no document collection.

Your API keys remain in your browser storage and connect directly to the AI providers you choose.

This makes WaxFrame especially useful for:
- business documents,
- proposals,
- RFPs,
- internal drafts,
- technical writing,
- legal-adjacent workflows,
- and sensitive material you may not want routed through another SaaS platform.

---

# How It Works

## 1. Build your Hive

Choose the AIs you want reviewing your document.

Every AI with an API key becomes a reviewer.

Then choose one Builder AI responsible for rewriting the document each round.

You need at least:
- 2 AIs total,
- 1 Builder,
- 1 reviewer.

Three or more is recommended for faster convergence — a third reviewer breaks decision ties automatically and lets Auto Mode chain rounds without interrupts.

---

## 2. Define your project

Give the Hive context:
- document type,
- audience,
- desired outcome,
- tone,
- constraints,
- scope,
- and additional instructions.

WaxFrame includes built-in templates for:
- cover letters,
- resumes,
- RFP responses,
- executive summaries,
- blog posts,
- proposals,
- recipes,
- reviews,
- and more.

---

## 3. Add Reference Material (optional)

Reference Material is source content the hive **consults but never edits** — distinct from the Notes drawer and the Starting Document.

Use it for:
- a source recipe the hive should base a write-up on,
- a transcript or interview the document needs to draw facts from,
- a competitor's RFP response you want to outflank,
- a stay-details questionnaire for a hotel review,
- any concrete material the hive should treat as ground truth rather than as a draft to refine.

Reference Material is the lever behind WaxFrame's biggest convergence-speed gains. The same blog post that took 16 rounds when refined as a Starting Document converged in 4 rounds when the source thesis went into Reference Material instead, with an empty Starting Document — the hive built fresh from the scaffold rather than fighting an existing draft.

You can also edit Reference Material mid-session via the **📚 Reference** button on the work toolbar.

---

## 4. Start your document

You can:
- upload an existing file,
- paste text directly,
- or start entirely from scratch.

Supported formats include:
- Word (.docx),
- PDF (.pdf),
- PowerPoint (.pptx),
- Excel (.xlsx, .xlsm),
- Markdown (.md),
- plain text (.txt).

---

## 5. Smoke the Hive

Every reviewer AI reads the document simultaneously and returns structured suggestions.

The Builder:
- evaluates those suggestions,
- merges the best ones,
- rewrites the document,
- and generates the next version.

For targeted edits between rounds, use **Send to Builder** (described in *One Builder — two roles* above) — write a directive in Notes, run a Builder-only round, then return to full reviewer rounds with **Smoke the Hive**.

---

## 6. Resolve conflicts

When AIs disagree, WaxFrame creates conflict cards instead of silently guessing.

You decide what happens next.

---

## 7. Iterate until convergence

Keep running rounds until:
- the document stabilizes,
- reviewer disagreement drops,
- and the result feels finished.

There is no forced endpoint.

You decide when the document is done.

---

# Free vs Pro

## Free Mode — Manual Workflow

No API keys required.

WaxFrame generates prompts for you:
1. copy prompt,
2. paste into AI websites,
3. paste responses back into WaxFrame.

Works with:
- ChatGPT,
- Claude,
- Gemini,
- DeepSeek,
- Grok,
- Perplexity,
- or virtually any AI service.

---

## Pro Mode — Fully Automated

One button runs the entire round automatically.

WaxFrame:
- sends prompts,
- collects responses,
- builds Builder prompts,
- rewrites the document,
- tracks conflicts,
- and advances the workflow automatically.

You provide your own API keys. **3 free rounds included** — try it before you buy. After that, a license key from [Gumroad](https://weirdave.gumroad.com/l/WaxFrame) unlocks unlimited rounds.

---

# Supported AI Providers

WaxFrame ships with default configurations for these providers:

| AI | Default Model |
|---|---|
| ChatGPT (OpenAI) | gpt-4.1 |
| Claude (Anthropic) | claude-sonnet-4-6 |
| Gemini (Google) | gemini-2.5-flash |
| Copilot (Microsoft) | gpt-4o |
| Grok (xAI) | grok-4-fast-non-reasoning |
| DeepSeek | deepseek-chat |
| Perplexity | sonar-pro |

You can change any AI's model at any time from the Worker Bee screen.

**Custom OpenAI-compatible endpoints** are also supported — connect to a local **LMStudio** or **Open WebUI** instance, a hosted **Together AI** or **Mistral** or **Cohere** endpoint, an enterprise gateway, or any other API that speaks the OpenAI chat-completions shape.

---

# Why the Builder Matters

Reviewer AIs are lightweight.

The Builder does the heavy lifting.

It must:
- read the entire document,
- read every reviewer response,
- reconcile disagreements,
- and rewrite the next version.

For large documents, the Builder benefits from:
- larger context windows,
- stronger instruction following,
- and higher token limits.

DeepSeek, Claude, ChatGPT, and Gemini all work well as Builders depending on your budget and document size.

---

# Quick Start

New users should start with the built-in:

## ⭐ Quick Start Template

It walks through the entire workflow using a simple chocolate-chip-cookie recipe so you can:
- see reviewer suggestions,
- understand conflict handling,
- watch convergence happen,
- and learn the interface quickly before using real documents.

Typical convergence:
- 2–4 rounds,
- only a few minutes,
- very low API cost.

---

# Export Options

WaxFrame can export:
- the final document,
- or a complete transcript of the entire session.

Full transcripts include:
- every round,
- every AI response,
- every Builder rewrite,
- every conflict,
- timestamps,
- and session history.

---

# Local-First Design

WaxFrame intentionally avoids:
- backend dependency,
- SaaS lock-in,
- forced subscriptions,
- cloud document storage,
- account systems,
- and platform surveillance.

Everything possible happens locally in the browser. Sessions persist via IndexedDB — no size limits, no data loss across long multi-round sessions, no third party between you and the AI providers.

Your workflow stays yours.

---

# Best Use Cases

WaxFrame works especially well for:

- RFP responses
- executive summaries
- technical documentation
- blog posts
- business proposals
- job application materials
- editing existing drafts
- collaborative refinement
- review rewriting
- structured long-form writing

It is less useful for:
- very short social posts,
- one-sentence prompts,
- or quick disposable AI output.

WaxFrame shines when multiple perspectives improve the result.

---

# Getting Started

## Hosted Version

https://weirdave.github.io/WaxFrame-Professional/

---

## Run Locally

1. Download the repository ZIP
2. Extract the files
3. Open `index.html`

No build step required.

---

# License

WaxFrame Professional is licensed under:

## AGPL-3.0

See the LICENSE file for details.

---

# Final Thought

Most AI tools try to replace the writing process.

WaxFrame treats writing more like editing:
- iterative,
- collaborative,
- opinionated,
- imperfect,
- and improved through multiple perspectives.

The Hive works for you.

You make the final call.
