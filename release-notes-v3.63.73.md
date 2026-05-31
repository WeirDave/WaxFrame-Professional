# Builder-Only Edits: Softer Prompt Envelope

Builder-only rounds now get a little more context around tiny edit requests.

---

## What Changed

**Builder-only prompts now include an editing frame**

Before the user's note and document are sent to the Builder, WaxFrame now explains that the Builder is editing a user-provided document in place and should apply only the requested edits.

**Tiny replacement edits should trip filters less often**

Short requests like "replace X with Y" can make isolated words look more suspicious than they do inside a full document. The new frame clarifies that quoted words and replacements are document text, not standalone requests.

**Full hive rounds are unchanged**

This change only affects Send to Builder / Builder-only paths. Reviewer rounds and normal Builder synthesis rounds keep their existing prompt envelope.

---

## Files Changed

- `js/app.js`
- `js/version.js`
- `CHANGELOG.md`
- `docs/WaxFrame_Backlog_Master_v139.txt`
- Release stamp sweep across all HTML, JavaScript, and CSS source files
