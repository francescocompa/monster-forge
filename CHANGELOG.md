# Changelog

Monster Forge — D&D 2024 homebrew monster & encounter builder. No-build static
site (`index.html` + `styles.css` + `data.js` + `parsers.js` + `app.js`).
Newest batches first.

## Batch 30 — Reference popovers + preset-manager refinements
- Spell/condition hover cards already render the structured 5etools fields; the
  **source id** (e.g. `XPHB`) is now shown instead of the source filename, with
  the **full book title as a hover tooltip** when a `books.json` is loaded.
  Spell-picker options are labelled/grouped by source id too.
- Preset-library manager:
  - Selection-actions popover moved to the **top-left** (clear of the
    right-aligned group checkbox); the Enable/Disable buttons are replaced by a
    single **switch toggle** (mid-state when the selection is mixed; a click
    enables all first), and Remove is a **red bin** button.
  - **Remove confirmations stack above** the still-open manager (`confirmStack`).
  - Uploading a `books.json` now **re-annotates every already-loaded library**,
    not just ones uploaded afterward, and persists the labels.
  - Multi-file uploads show a concise **"Loaded N sources"** toast; a
    **device-storage-full alert** fires when a write is dropped over quota.

## Batch 29 — Legendary-group import + preset-modal UX overhaul
- `legendarygroups.json` ingestion: monsters referencing a `legendaryGroup` get
  their **lair actions + regional effects** filled in. Re-applies across sessions
  via the stored `_legGroup` ref. Nameless lair entries now render.
- Preset-library modal restructured: fixed Close/Upload bar with a scrolling
  list, selection-first rows, working group-by control (None/Type/Group),
  reference sheets pinned subdued at the bottom, intro moved into a `?` popover.

## Batch 28 — 5etools JSON ingestion + preset library manager
- Replaced the markdown importers with native **5etools JSON parsing**
  (bestiary / spells / conditions / books). Exact AC/HP/saves/skills/spellcasting;
  cross-file **`_copy`/`_mod` resolution**; one file holds a whole book.
- `books.json` reference stamps full title + group onto each library.
- Library **enable/disable** (kept on disk, hidden from pools); manager modal with
  type/group/name filter + sort.

_Earlier batches (8–27) are recorded in the project hand-off notes._
