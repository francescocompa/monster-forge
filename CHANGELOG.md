# Changelog

Monster Forge — D&D 2024 homebrew monster & encounter builder. No-build static
site (`index.html` + `styles.css` + `data.js` + `parsers.js` + `app.js`).
Newest batches first.

## Batch 39 — Identity combo dropdowns
- **Type / Subtype / Alignment** are now proper combo fields. The **chevron opens the
  native OS dropdown** (your screenshot-2 style) listing every value — the canonical
  D&D set plus your own values, **de-duplicated by case** (no more `dragon`/`Dragon`
  twins). **Typing** instead opens a **custom styled suggestion dropdown** that filters
  as you type, and free-text is still allowed. This replaces the old `<input list>`
  datalist whose popup was a different, often mis-aligned browser widget.

## Batch 38 — FP1 follow-up fixes
- **Origin tags reworked:** the home-brew tag now reads **Homebrew** and is **red**;
  the chassis tag now shows the **source it came from** (e.g. `MM25`, or `Built-in`
  for the generic chassis) instead of the generic "Chassis" label/icon.
- **Add-skill dropdown:** the scrolling list no longer bleeds over the sticky group
  header; the popover clips to its rounded corners and the header has a divider. Tall
  dropdowns also stay fully on-screen instead of running off the bottom.
- **Dropdowns actually unified now:** the native datalist arrow is properly hidden, so
  Type / Alignment / Subtype / feature-name fields show a **single** chevron matching
  the `<select>`s (previously a second native arrow appeared, especially on focus).
- **Removed** the stray preview **collapse (◀)** toggle.

## Batch 37 — Forge quick-fixes + dropdown standardization (FP1)
- **Removed the Multiattack action button** — it's already available as a chip inside a
  custom action.
- **Removed "Paste statblock"** from the sidebar (Paste 5etools is still in the Forge ⋯
  menu and the Bestiary add menu).
- **Condition Immunities dropdown:** pins the **XPHB** group to the top and no longer
  lists **diseases** (only true conditions/statuses).
- **Unified dropdown chevrons:** every dropdown — native `<select>`s _and_ the
  Type/Subtype/Alignment comboboxes — now uses the **same chevron glyph and right
  margin** (previously the comboboxes showed a different browser arrow with no spacing).

## Batch 36 — Bestiary origin, bracket-driven library & UI polish (B43)
- **Bestiary origin badge:** every card now shows whether it's **⚒ Home-brew**
  (created or edited here) or **⊕ Chassis** (loaded from a chassis and saved without
  edits). The first edit flips it to home-brew; re-statusing/tagging doesn't.
- **Gear "Suggest" → wand icon:** the Suggest button is now a ghost magic-wand icon
  inside the Gear field, divider-separated (the chip area is cropped at the divider).
- **Dropdown chevron spacing:** more right padding on every native select so the text
  no longer crowds the chevron.
- **Tool proficiencies folded into "Add skill":** the separate _Add tool proficiency_
  button is gone; the **＋ Add skill** button now opens a dropdown of skills with a
  **Tools** subgroup after them.
- **Bare `[SAVE]` / `[ATK]`:** with no ability named, these now use the creature's
  **highest** ability modifier (e.g. `[SAVE]` → save DC from the best stat).
- **Bracket shortcuts in preset features:** the custom-action **Save block** snippet and
  the whole built-in library (traits, actions, bonus, reactions, legendary, villain, lair)
  now use **live bracket tokens** (`[CON SAVE]`, `[2d6]`, …) instead of baked-in numbers,
  so inserted features retune to the creature's CR/abilities. Attack-row hints expand
  tokens too.
- **Recharge / X-per-day control:** the per-row freq button is now a ghost **＋** icon in
  the entry's name bar (was a `↻`).
- **Live feature-name suggestions:** typing in a Trait/Action/Bonus/Reaction **name**
  field now suggests built-in snippets **and** every distinct feature harvested from
  loaded chassis, presets and saved monsters.
- **Library overrides built-ins:** when a typed name matches a feature in your library
  (saved bestiary + uploaded presets), that version fills in instead of the built-in
  snippet; curated built-ins still win over the example chassis text.

## Batch 35 — Bracket shortcuts + library aggregation (B41–B42 + fixes)
- **New bracket tokens** (work in any trait/action/note, expand in preview + every
  export):
  - `[STR SAVE]` → save DC for that ability (8 + PB + mod), e.g. `DC 15`.
  - `[STR ATK]` → attack/check modifier (PB + mod), e.g. `+7`. Any ability.
  - `[C+]` / `[c+]` force the article ("the"); `[C-]` / `[c-]` remove it —
    overriding the Proper-name toggle for one reference (capital = capitalised).
- **"From library" aggregation:** the trait/action/bonus/reaction/legendary/
  villain/lair pickers now include a **From bestiary** group listing every distinct
  feature (by name) harvested from all loaded chassis, presets and saved monsters;
  picking one inserts a copy.
- **Bestiary header fix:** cards no longer bleed above the sticky header while
  scrolling (the 20px scroll-padding gap is now painted over).
- **Mobile batch bar:** anchors to the left edge and grows rightward instead of
  centering off-screen.

## Batch 34 — Gear, spellcasting/action & focus fixes (B38–B40 + add-ons)
- **Gear "Suggest" button:** the Gear field is now a chipfield (like Condition
  Immunities). A **Suggest** button harvests manufactured weapons from attack
  names and armor/shield from the AC note, adding any new ones as removable chips
  (never overwrites; natural weapons like Bite are ignored).
- **Spellcasting lines** now always list spells **alphabetically**.
- **Recharge / X-per-day → title:** a new ↻ control on action / bonus-action /
  reaction rows appends `(Recharge 5–6)`, `(1/Day)`, etc. to the **name** (not the
  body), replacing any existing freq tag. Removed the old body-text Recharge/1-Day
  snippets.
- **Tool proficiencies:** an **Add tool proficiency** button under Add skill picks
  from the official 2024 tool list and shows a **Tools** line on the stat block.
- **Focus fix:** typing in an attack/spell field (dice, range, rider, etc.) no
  longer re-renders the whole list — it patches just that row's live hint, so the
  field keeps focus and the page no longer jumps.
- **Forge starts at the top** whenever a creature is loaded.
- **Bestiary:** new **Encounter** and **Adventure** filter/group options (group by
  adventure includes every monster used in any of its encounters).
- Multi-select batch bar stays on one line (no wrap) when there's room.

## Batch 33 — Bestiary batch ops + MCDM minions (B36–B37)
- **Multi-select bestiary cards:** Cmd/Ctrl-click toggles a card and Shift-click
  extends a range; a floating bar shows the count with **Set status** (bulk) and
  **Clear**. Plain click still opens the creature.
- **Drag to restatus:** when the Bestiary is grouped by status, dragging a card
  onto another status group sets that status (a multi-selection moves together).
- **Minion flag (MCDM):** a new **Minion · MCDM** toggle adds the Flee Mortals
  **Minion** + **Minion Group** traits, shows a **MINION** tag on the stat block,
  and renders attack damage as **fixed values** (no dice). It's fully reversible —
  flat damage and the badge are render-time, so toggling off restores rolled
  damage and removes the traits with no data loss.
- (Noted for later: reflecting minion economics in the encounter XP/CR budget.)

## Batch 32 — Native dropdowns + parser fixes (B34–B35)
- **Form dropdowns → native:** form-field `<select>`s now use the browser's own
  dropdown (native arrow + native option list), and the whole app is pinned to
  `color-scheme:dark` so those native menus, number spinners and autofill render
  dark instead of flashing to a light theme.
- **White-mode bug fixed:** a global `:-webkit-autofill` override keeps a field
  dark after the browser autofills/datalist-picks it (e.g. Languages).
- **Reactions parser (2024 jargon):** `richStrip` now translates the 2024
  `{@actTrigger}` / `{@actResponse}` / `{@actSave}` / `{@actSaveFail}` /
  `{@actSaveSuccess}` markup, so reactions like **Eldritch Eddy**'s "Eldritch
  Overload" import with their Trigger/Response split and house-style saving-throw
  wording intact.
- **Same-name monsters grouped:** in the chassis picker and the Bestiary preset
  view, creatures sharing a name collapse into one card whose **source tag is a
  dropdown** of every source; XMM then XPHB are preferred as the default variant.
  (Visual only — each source stays its own underlying record.)

## Batch 31 — Forge field, ability & popover polish (B31–B33)
- **Field cleanup:** removed the inline `(blank = auto)`, `(optional)` and
  "Passive Perception is added automatically" hints from the Initiative, HP-formula
  and Senses fields.
- **Short name:** the `Word` field is retitled **Short name** with a `?` custom
  popover carrying the explainer; the old standalone label/comment line is gone.
- **Damage modifier:** the resist/immune/vuln list under Skills now has a
  **Damage modifier** sub-title with more breathing room above it; the
  "No damage modifiers…" placeholder text is removed when nothing is set.
- **Setting faction → Neutral:** the third combatant faction is renamed
  `Neutral` (old `Setting` data migrates automatically; keeps its styling).
- **Ability scores:** numbers are centred in their boxes ignoring the steppers;
  a value of `10` shows as the placeholder (`10`) and behaves as 10 with no need
  to clear. The stepper treats a blank ability as 10.
- **Number of monsters:** combatant count shows `1` as a placeholder, behaving as
  1 without needing a typed value.
- **CR field** is left-aligned.
- **CR / Short-name popovers:** the default browser `title` tooltip on the CR `?`
  is removed; both `?` buttons now open a single custom popover centred over the
  icon with a balloon **tail** (`tail-pop`).

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
