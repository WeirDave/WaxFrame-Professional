# Data handling — hard constraint

**Status: non-negotiable. Escalated by David to an emergency on 2026-09-15.**
**Build: 20260915-008**

This file is committed deliberately, so a fresh clone carries the rule even though
`CLAUDE.md` is gitignored and does not. `CLAUDE.md` §0 states the same rule; if the two
ever disagree, they both need fixing.

---

## The rule

**Never put real personal or company information into this project. Ask David first — every
time, without exception.**

"Ask first" means ask. Not "use it and flag it afterwards", not "use it because it seems
harmless", not "use it because he pasted it into the chat". If David shares something real,
that is permission to *read* it, never permission to *persist* it.

**Assume this repository is public.** It is. So is every release note, every issue comment,
and every automatically generated source archive of every tag.

---

## What counts as real information

Never commit, publish, or embed any of the following unless David has explicitly said to:

- **His employer's name**, in any form — full name, short name, adjectival form, or an
  abbreviation that resolves to it.
- **Site, building, and location identifiers** — site codes, building numbers, campus names,
  street addresses, ZIP codes tied to a real site.
- **Client, customer, vendor, and partner names.**
- **Colleague names**, and his work email address.
- **Internal infrastructure** — hostnames, URLs, IP addresses, ports, service names, and the
  *names of internal tools*. An internal service name is exactly the kind of thing that must
  not be public, even with no address attached.
- **Internal Slack channels**, ticket IDs, and internal wiki or document links.
- **Real project or document filenames**, including ones used only as a UI example.
- **Any figure attributed to an identifiable real site** — client counts, AP counts,
  throughput numbers, survey results.
- **Credentials of any kind** — API keys, bearer tokens, JWTs, session cookies, presigned
  URLs, private keys. These are never "example values".

If you are unsure whether something is traceable back to his employer, **leave it out and
ask.** Treat uncertainty as a hit. The cost of asking is one message; the cost of being
wrong is public and permanent.

### WaxFrame-specific high-risk items

These are called out by name because they are not obvious, and because every one of them has
already appeared in this repository at least once:

1. **The internal AI gateway David uses at work.** Its name, hostname, URL, port, model list,
   and any branding or artwork referencing it. WaxFrame talks to this class of server
   directly, so it surfaces naturally in debugging — that is exactly why it keeps leaking.
   Write "an enterprise gateway" or "a self-hosted Open WebUI deployment" instead.
2. **API keys and tokens** for any provider, his own included.
3. **Real work documents he shares to settle a technical question** — for example a Scout
   Bundle captured from a real work session, or a WLAN remediation report. See below.

---

## When David shares a real file

He will, because sometimes it is the only way to answer a question — a Scout Bundle from a
failing build, a document that reproduces a parser bug.

**Read it for structure and metadata only.** Response shapes, HTTP status codes, token
counts, field names, timings, file size. Those are facts about the *software*.

**Never** copy its content anywhere. **Never** use it as a test fixture. **Never** let a name,
address, figure, or filename from it reach a commit, a comment, a changelog entry, or a
release note. When you cite it, cite the mechanism, not the document.

---

## Everything that persists is in scope

The rule applies to anything that outlives the conversation:

source · code comments · test fixtures and sample data · documentation and help pages ·
the user manual · setup pages · `docs/` including the backlog and rules files · screenshots
and other images · **commit messages** · **published GitHub release notes** · issue and PR
comments · the README · repository description and topics.

Release notes and commit messages are the two that get forgotten, and they are the two that
are hardest to retract. A release note is public the instant it is published. A commit
message can only be removed by rewriting history.

---

## Capture and diagnostic tooling — output is secret

Any tool that records live traffic or captures diagnostics produces output that may contain
credentials, internal hostnames, and real document content.

**That output is secret.** Never commit it, never paste it into an issue or a pull request,
never use it as an example in documentation, and never derive a fixture from it.

This applies to WaxFrame's own Scout and diagnostic bundles: `js/wf-debug.js` redacts before
export (`scrubFailureRecord`, `safeRefId`, `safeUrl`), and that redaction is load-bearing. If
you touch anything that lands in an export, audit **every** field — ring buffers and separate
storage blobs are where secrets hide. If this repository ever gains request-capture scripts
under `docs/reverse-engineering/` or anywhere else, their README must carry the same warning
and their output must be gitignored before the first run.

---

## Enforcement

`tools/check-confidentiality.mjs` runs as a stage of `tools/release-check.mjs`, so the
release gate fails on a violation.

It works two ways:

- **Structural rules**, committed, that match the *shape* of sensitive data: credential
  formats, private IP ranges, internal-only hostname suffixes, Slack channel names, street
  addresses. These carry no secret, so they are safe to publish and they run in CI.
- **A literal term list** at `.confidential-terms` — gitignored, never committed, holding the
  real forbidden strings. Present on David's machine. See `.confidential-terms.example`.
  The gate hard-fails if this file is ever tracked by git, because committing it would
  publish exactly what it exists to protect.

The checker deliberately contains **no real identifier**. A gate that hardcodes the forbidden
words would itself be the leak.

A line that legitimately shows a sensitive *shape* using an invented value can be exempted
with a `confidentiality-allow` comment. Use it rarely, and only on values you invented.

**The gate is a backstop, not the rule.** It cannot recognise a client name or a real
building number. Judgement comes first; the check catches what judgement missed.

---

## Why this exists

On 2026-09-15 an audit of this public repository found David's employer named in the README,
the CHANGELOG, the user manual, a sample prompt and a rules document; the name of his
employer's internal AI gateway in roughly 100 places including 21 code comments; an icon whose
artwork spelled that gateway's name; a real work filename used as a UI example; and all of it
mirrored across 43 published GitHub release notes.

None of it was malicious. It accumulated one reasonable-seeming line at a time, while
debugging real problems against real infrastructure. That is precisely how this kind of leak
happens, and it is why the rule is "ask first" rather than "use good judgement".

David's words: *"Make sure ALL products that I ever work on NEVER USE real data from my
workplace EVER unless I explicitly tell you to do otherwise."*
