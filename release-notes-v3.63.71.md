# Builder Roster: Smarter Tile Sizing

Setup Step 2 now makes better use of the Available Builders panel without changing the overall setup card layout.

---

## What Changed

**Builder tiles scale by hive size**

The roster now adapts to how many active AIs you have:

- 1-3 AIs use larger tiles.
- 4-6 AIs use medium tiles.
- 7-9 AIs use roomy default tiles.
- 10-12 AIs tighten up cleanly.
- 13+ AIs switch to compact mode for model-server clutter.

**Icons get room when the roster has room**

Known/default hives now show larger provider icons and less sparse spacing on desktop, while laptop layouts stay compact.

**Long names stay contained**

Roster labels clamp to two lines in normal modes and use single-line ellipsis in compact many-AI mode.

---

## Files Changed

- `js/app.js`
- `style.css`
- `js/version.js`
- `CHANGELOG.md`
- `docs/WaxFrame_Backlog_Master_v137.txt`
- Release stamp sweep across all HTML, JavaScript, and CSS source files
