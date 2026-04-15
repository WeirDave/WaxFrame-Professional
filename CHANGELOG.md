# WaxFrame Changelog

All notable changes to WaxFrame Professional are documented here.

---

## v3.2 — April 15, 2026

### Changed
- Renamed `tokens-explainer.html` to `what-are-tokens.html`. If you are running WaxFrame locally, delete the old file after updating.
- Fixed Gemini billing URL in `api-links.js` — was pointing to `aistudio.google.com/plan_information` (broken); corrected to `aistudio.google.com/apikey` where billing setup actually lives.
- Fixed Grok billing URL in `api-links.js` — was pointing to `console.x.ai/billing` (returns 403 when not authenticated); corrected to `console.x.ai`.

### Added
- Popup-blocked warning banner on `api-details.html`. When clicking Open All Billing Pages or Open All API Consoles, WaxFrame now detects how many tabs the browser actually opened and shows a dismissible notice if any were blocked, with instructions to allow popups.
- Perplexity billing warning on `api-details.html` and `know-your-hive.html`. New users are warned to enable auto-billing and set a low monthly limit at signup — if credits expire without auto-billing active, Perplexity raises the required minimum top-up to $50.
- Billing rate links added to the AI table on `what-are-tokens.html` — each provider now has a Check Rates link opening their billing page directly.
- Rates-change notice added to `what-are-tokens.html` advising users to check billing rates at least monthly as they are subject to change.

---

## v3.1 — April 13, 2026

### Added
- Fuzzy matching for resolved decisions — DeepSeek and Perplexity were re-raising the same conflicts with slightly different wording each round, bypassing duplicate detection. Resolved decisions are now matched by similarity, not exact string.
- Internal-only AI deployment support — default AIs can now be fully hidden or removed for work environments that use only custom AIs with internal endpoints.
- Beginner instructional document covering step-by-step setup from scratch, including the internal/custom-AI-only deployment use case.
- README screenshots added.

### Fixed
- Favicon visibility — previous dark hexagon favicon was nearly invisible on dark browser tabs. Replaced with a higher-contrast icon.

---

## v3.0 — April 14, 2026

### Changed
- Rebranded from AI Hive to WaxFrame. All localStorage keys migrated from `aihive_*` to `waxframe_*`. All filenames, UI labels, and documentation updated.
- Removed Copilot from the default AI list. Default hive is now ChatGPT, Claude, DeepSeek, Gemini, Grok, and Perplexity.

### Fixed
- Removed 2 orphaned JS functions (`toggleAISetup`, `toggleHistItem`) with no remaining callers.
- Removed approximately 354 lines of dead CSS left over from pre-rebrand naming.
- Converted remaining inline styles to class-based approaches using a `setFileStatusState()` helper and modifier classes.

---

## v2.x and earlier

See git history for changes prior to the WaxFrame rebrand.
