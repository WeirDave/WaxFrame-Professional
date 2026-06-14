# Round History Security Hardening

This release closes a remaining crafted-checkpoint XSS edge case in the Round History document modal.

## What Changed

**Round History tab IDs are now attribute-escaped.** Restored reviewer response IDs are inserted into `data-tab-id` and `data-panel-id` with attribute-safe escaping, so quotes cannot break out of the attribute context.

**Tab switching no longer builds selectors from restored data.** The modal now finds the matching panel by direct `dataset.panelId` comparison instead of constructing a CSS selector from an imported history key.

## Files Changed

- `js/app.js`
- `CHANGELOG.md`
- version/cache-bust stamps
