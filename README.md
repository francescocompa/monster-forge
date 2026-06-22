# Monster Forge

A D&D 2024 homebrew monster builder and encounter manager. Build statblocks with
live CR-math, organise them into a bestiary, and plan encounters against an XP
budget — then push everything to Notion (via Claude) or export plain JSON.

It's a single static page with **no build step and no dependencies**. Open
`index.html` in a browser and it runs.

## Running it

- **Locally:** double-click `index.html`, or serve the folder with any static
  server (`python3 -m http.server`, `npx serve`, etc.) and visit it.
- **Hosted:** it's a static site — drop the files on GitHub Pages or any
  static host.

## Project layout

The page is `index.html` + `styles.css` + a set of plain JavaScript files, loaded with
ordinary `<link>` / `<script src>` tags. The scripts are **not** modules: they load in order and
share one global scope (a function in `data.js` is callable from `app.js` with no imports), so there's
no bundler and no build step — it still works from `file://`. See `DEVELOPMENT.md` for the dev workflow.

| File | What's in it |
|------|--------------|
| `index.html` | Markup for the four views (Forge / Bestiary / Adventures / Combat). |
| `styles.css` | All styling and the dark-theme design tokens. |
| `data.js` | Lookup tables (CR/XP, budgets), pure helpers, snippet libraries, and the chassis bases. |
| `parsers.js` | 5etools text / JSON / `.zip` importers (statblocks, spells, conditions, rules). |
| `core.js` | App state, storage (JSONBin cloud + IndexedDB ref libs), settings, the monster model, and field wiring. |
| `forge.js` | Statblock-entry editing, the bracket-token expander, and `loadMonster`. |
| `engine.js` | Statblock preview rendering, the colour/roll engine, and reference popovers. |
| `bestiary.js` | The Bestiary view, library controls, and the chassis/preset pickers. |
| `adventures.js` | Adventures, scenes, encounters, the party roster, and the XP budget. |
| `combat.js` | The live combat tracker (initiative order, HP, conditions, death saves). |
| `app.js` | App shell: settings UI, modal/popover primitives, the preset-library manager, and the init bootstrap (loaded last). |

## Features

- **Forge** — a guided statblock editor with live preview. AC/HP/attack/save
  fields pre-fill from CR as editable suggestions; PB, XP, passive Perception,
  speed, senses and defenses are all derived. Steppers on AC, initiative,
  ability scores and CR (the CR stepper walks the `0 → 1/8 → 1/4 → 1/2 → 1 …`
  ladder). Supports traits, guided attacks, spellcasting, multiattack, bonus
  actions, reactions, and optional Legendary / Villain (MCDM) / Lair / Regional
  sections.
- **Bestiary** — saved creatures, searchable, with duplicate / edit / delete and
  per-creature export.
- **Adventures** — encounters grouped by adventure, each scored against the 2024
  XP budget for the party (with per-encounter party overrides and allies that
  raise the budget). Monsters, quick CR-only combatants, and environment events.
- **Start from a chassis** — generic, editable CR-accurate bases to reskin.

## Bracket shortcuts

Inside any trait, action, reaction, or note you can use tokens that expand in the
preview and in every export:

| Token | Expands to |
|-------|-----------|
| `[C]` / `[c]` | “The creature” / “the creature”, using the **Short name word**. Respects the **Proper name** toggle. |
| `[Name]` / `[name]` | Aliases for `[C]` / `[c]`. |
| `[s]` | Verb “-s” for a singular subject; drops to nothing when **Plural** is on (`make[s]` → makes / make). |
| `[2d6 + 6]` | Averages any dice expression → `13 (2d6 + 6)`. |
| `{C}` `{c}` `{s}` | Brace forms, in case square brackets clash with your text. |

## Storage & exports

- **Cloud sync:** the bestiary and adventures auto-save to a private
  [JSONBin](https://jsonbin.io) bin (writes are debounced). Bin IDs are kept in
  `localStorage`. If a cloud save fails, a banner suggests exporting JSON as a
  backup.
- **Export / Import JSON:** a full local backup of all monsters and adventures.
- **Copy for Claude:** structured payload — paste into a chat and Claude builds
  the Notion page in MM25 two-column format and sets AC/HP/XP/CR properties.
- **Copy for Notion:** a no-tokens, single-column Markdown fallback you paste and
  set properties by hand.

> Note: `app.js` contains an embedded JSONBin master key for the author's personal
> bin. If you fork this, replace it with your own key (or swap out the storage
> layer).
