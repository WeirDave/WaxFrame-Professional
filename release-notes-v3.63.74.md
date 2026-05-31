# Dump Provider Models Diagnostic

WaxFrame now has a Help-page tool for the model-list debugging loop: when a provider dropdown looks stale, suspicious, or out of sync with the model server, you can dump exactly what WaxFrame has cached and compare it with a fresh provider fetch.

---

## Added

**Dump Provider Models**

- Pick a provider from the Help page.
- View the cached `waxframe_models_{provider}` list from localStorage.
- Fetch the live provider model list without writing back to the cache.
- Copy either list as JSON for support/debugging.
- See a stale-cache warning when cached and live lists differ.

**Model Server Coverage**

Imported model-server AIs with explicit model endpoints are included in the provider picker. Local/no-key servers can be dumped without forcing an Authorization header.

**Diagnostic Bundle Attachment**

Help-page diagnostic bundles now include cached model lists by model name only. API keys and secrets remain stripped.

---

## Files Changed

- `help.html`
- `CHANGELOG.md`
- `docs/WaxFrame_Backlog_Master_v140.txt`
