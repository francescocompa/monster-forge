# Changelog

Monster Forge — D&D 2024 homebrew monster & encounter builder. No-build static
site (`index.html` + `styles.css` + `data.js` + `parsers.js` + `app.js`).
Newest batches first.

## Batch 54 — Click-to-roll dice
- The colour-coded **dice / to-hit** tokens in the statblock preview are now
  **clickable** (gated by Settings). **Left-click** rolls instantly; **right-click**
  opens options: **advantage / disadvantage** (2d20 keep hi/lo on d20 rolls),
  **critical hit** (double damage dice), and an **editable formula**.
- Results show as a **toast** and accumulate in a collapsible **roll-log panel**
  (bottom-left of the main area) with each roll's total + dice breakdown and a clear
  button.

## Batch 53 — Statblock colour-coding
- The Forge **statblock preview** now colour-codes prose (gated by Settings):
  **damage types** (elemental palette), **dice / +to-hit** (also tagged for
  click-to-roll), **save DCs** and **saving-throw** phrases, **conditions**, and
  **ranges & areas**. The **ability-score block** tints mods/saves by sign.
- Colouring runs as a TreeWalker over the prose bodies only (`.blk`/`.va`/notes) —
  the structured header lines (AC/Speed/Senses/CR…) and the exports are untouched.

## Batch 52 — Settings page
- New **Settings** view, opened by a **gear icon in the appbar** (present on every
  view). Persists to `localStorage` (`mf_settings`), merged over defaults at load.
- **Feature toggles** — master + per-category switches for the upcoming Statblock
  colour-coding and Click-to-roll dice (so they'll be opt-in).
- **Adventure defaults** — default party size / level / faction, now used when
  creating a new adventure and when adding combatants.
- **Data & sync** — Export / Import JSON, a live cloud-sync status line, a manual
  **Re-sync now**, and **Clear local cache** (cloud data untouched).

## Batch 51 — Scenes overhaul
- _Follow-up fixes:_ filter tools trimmed to **search + sort** (Name / Difficulty;
  dropped the filter menu and the Spent-XP sort); **＋ Scene** moved to sit directly
  under the scenes and above Ungrouped; Ungrouped shows nothing when empty (no
  placeholder text); added **＋ Scene** to the encounter-FAB dropdown; the encounter
  and Bestiary FABs use **rounded-square** corners (8px) instead of full pills.
- **Section renamed Encounters → Scenes.** Scene blocks are now **neutral** (grey
  left-rule, no amber) and the scene name is no longer force-uppercased.
- **+ Scene moved into the list** (dashed add-button, like add-combatant/add-section);
  the **Scenes header** now carries right-aligned **filter tools** — search, filter
  (difficulty / faction / has-minion) and sort (Name / Difficulty / Spent XP).
  Manual drag order is the default (no chip until you pick a sort).
- **Inside each scene:** a **notes** field under the title, and an **+ Encounter in
  this scene** button at the bottom (removed from the scene ⋯ menu).
- **Scenes can be archived** from their ⋯ menu — the scene and its encounters move to
  the Archived area and are excluded from the active list.
- **Scenes are draggable** to reorder (grab the scene header), like encounters.
- **Encounter FAB is now a split button** (＋ Encounter ▾, keeping the rounded pill):
  the caret opens **Import from another adventure…** (pick individual scenes /
  encounters to copy in), **Archive all encounters**, and **Clear all encounters**.

## Batch 50 — Bestiary adventure grouping + library polish + fixes
- **Bestiary grouping by adventure** now shows each adventure's **identity colour
  dot** (FP4) in the group header; the no-adventure bucket reads **Not in any
  adventure** (and **Not in any encounter** when grouped by encounter). New
  non-interactive `advDotStatic` + generic `groupLabelHTML`/`emptyLabel` hooks on
  the control descriptor.
- **Preset-library manager:** the remove control is now a proper **red trash-bin
  SVG** (was a 🗑 emoji).
- **Batch-select bar (Bestiary):** the **Set status** button no longer stretches
  full-width or shows the grey browser default — it's a content-width accent
  button (base `.btn` never set a background, so the un-modified button fell back
  to the UA button-face; `.batch-bar .btn` now also pins `width:auto`).
- **Combatant minion tag** (the read-only tag on a loaded minion statblock, not the
  quick-combatant toggle) is now **right-aligned** in the statblock row.
- **Encounter battlefield notes:** dropped the "Battlefield notes" label; the cue
  now lives in the textarea placeholder.

## Batch 49 — Encounter scenes + minion chip
- **Encounter scenes:** an adventure can now group its encounters into named,
  collapsible **scene** containers (`a.scenes[]` + `enc.sceneId`). A **＋ Scene**
  button sits beside **＋ Encounter**; each scene has an editable name, a collapse
  chevron, an encounter count, and a ⋯ menu (add an encounter to the scene, delete
  the scene — its encounters fall back to **Ungrouped**, not deleted). Encounters
  **drag between scenes**: drop onto another encounter to adopt its scene + position,
  or onto a scene header / body / the Ungrouped bucket to re-parent. Adventures with
  no scenes render exactly as before (flat list).
- **Minion checkbox → chip:** the cramped, clipped minion checkbox on quick
  combatants is now a clean toggle **chip** matching the existing MINION tag (click
  to enable/disable; re-renders to refresh XP + budget).

## Batch 48 — Minion edge cases
- **Minion allies** now raise the encounter budget proportionally (scaled by
  minion-XP ÷ standard-XP) instead of as a full creature — matching the enemy-side
  minion math (5 CR-1 minion allies ≈ 1 standard ally).
- **Quick (CR-only) combatants** can be flagged as minions via a **minion checkbox**
  in their row; the flag flows through XP, the budget, and the Claude export.

## Batch 47 — Minion encounter math + B44 polish
- **MCDM minion encounter budgeting:** a minion combatant now contributes the
  special low **minion XP** (Flee, Mortals! table) instead of standard CR XP, so a
  horde counts fairly (e.g. 5 CR-1 minions = 200 XP ≈ one standard CR-1 creature; a
  CR-11 minion is 720 XP, not 7,200). New `MINION_XP` table + `combatXPEach` /
  `combatIsMinion`. Minion combatant rows show a **MINION** tag; the Claude encounter
  export tags minions and uses their minion XP.
- **Preset-libraries `?`** help now opens on **hover** (all `?` helpers are now
  hover-consistent); the sidebar **“Preset libraries”** button drops its trailing “…”.
- **Doubled the adventure color palette** to 20 swatches.

## Batch 46 — FP4: adventure color identity
- Each adventure can carry a **color**. A filled **dot** sits before the name in the
  sidebar card and the open adventure title; clicking it opens a curated 10-color
  preset palette (+ “No color”).
- A selected adventure's sidebar card uses its color for the **highlight border**.
- Migrated in `normalizeAdv`; the `advDot` helper is reusable for future
  adventure-colored UI (e.g. grouping the bestiary by adventure).

## Batch 45 — FP5: budget chips + FAB standardization
- **Adventure budget caps** are now **three color-coded chips** (Low green /
  Moderate amber / High red, each with its XP value), replacing the old gradient bar.
  The per-encounter bar with the draggable target marker is unchanged.
- **Save FAB** uses a floppy-disk save icon + label (placeholder for the intended
  custom SVG — swap the single `<path>` in `#forgeSaveFab`).
- The 3 floating action buttons (Forge Save, Bestiary New split, Adventures +) are
  consistent accent pills; `.fab` now lays out an icon + label.

## Batch 44 — Fixes round 2
- **Fly / Blindsight options gear** moved out of the field and up to the field
  **title row** (right-aligned next to the label), like the short-name gear.
- **Removed the XP tag** from chassis picker cards (CR + source only).
- **Loading a chassis from a feature chip** now uses the same **“You have unsaved
  edits”** keep/override/back dialog as loading a chassis from the Forge.
- **`?` help buttons and card statblock-preview icons open on hover** (still
  clickable) — matching the forge CR / short-name help.

## Batch 43 — Fixes round (forge + encounter polish)
- **Add-section button moved to the bottom** of the added sections (after Custom Notes).
- **XP-target marker** default position is now the true **left end** of the bar.
- Library-preset grouping option renamed **Group → Category**.
- **Imported-feature chip** loses its ✕; its kebab opens a popover with a scrollable
  mini statblock preview + **Load … as chassis →**. Editing the name auto-clears the chip.
- **Fly “can hover”** and **Blindsight “blind beyond radius”** moved into gear-icon
  popovers next to their fields (matching the short-name gear).
- Removed the helper text from the **Abilities & saves** title.
- Fixed the **collapse** of inline-styled last lines (Skills/defenses/senses) — the
  collapse rule is now `!important`; the Other-senses row is a normal full-width field.
- **Textarea resize grips** follow `color-scheme:dark` instead of a light-grey gradient.
- The **creature Name field** uses our styled suggestion dropdown (names from the
  library / chassis / presets); native autofill suppressed on free-text fields.
- **Statblock preview everywhere:** a “Preview” item in bestiary card menus, and a
  magnifying-glass-chart icon on chassis + add-combatant cards.
- The **last-edited encounter** gets a focus highlight.
- Add-combatant → **From chassis** has a back arrow to the bestiary picker; both
  pickers hide their description behind a **?** by the title; chassis cards now use the
  same tags row (CR · XP · source) and position as the bestiary cards.

## Batch 42 — Encounter & combatant UX (FP3)
- **XP-target marker is OFF until dragged:** it parks at the **low-end** of the
  budget, renders dimmed/hollow, and the "target / ±delta" read-out is hidden until
  the DM positions it (`e.target` stays null; click or drag activates it).
- **Combatant statblock dropdown** is grouped by **CR** (ascending) with the
  **last-edited** creature pinned in a "Last edited" group on top (`_savedAt`).
- **Add-combatant picker:** fixed footer (card list scrolls inside) with
  **From chassis…**, **Forge new →**, and **Done**.
- **Add from chassis:** picks a base, **auto-creates & saves a Bestiary entry**, and
  drops it straight into the encounter — no trip through the Forge.
- **Chassis preview popover:** an 👁 on each chassis card shows a compact statblock
  (stats, ability mods, trait / action names) before you pick it.
- **Screen-aware menus:** the "+" / ⋯ dropdowns flip **upward** when they'd run off
  the bottom of the viewport.
- **Edit-vs-new guard:** starting a New creature warns first if the Forge holds
  unsaved changes (`forgeUnsaved`).
- **Invisible encounter title:** the name field is borderless until hover/focus.

## Batch 41 — Add-section refactor (FP6) + forge fold-in fixes
- **One "＋ Add section" control** replaces the five always-present enable
  checkboxes (Legendary / Villain / Lair / Regional / Minion). Picking one reveals
  its fieldset; each section has a remove **✕** in its title. Turning a section off
  keeps its data (re-adding restores it); Minion still adds/removes its traits.
- **Custom notes:** a new repeatable section. Each note has an optional title +
  body (bracket tokens supported) and renders in the stat block as a **visually
  isolated note block below everything** (dashed, amber-tinted). Notes flow through
  the Notion / Claude exports, chassis merge, dirty-check, and `normalizeMonster`
  migration (`m.notes`).
- **Smarter `[c]` detection on import (`bracketize`):** now also tokenises the
  source creature's **first name** (e.g. *K'thriss* from "K'thriss Drow'b"), a
  **partial / last-word** reference (e.g. "the ruffian" from "Tarkanan Ruffian"),
  and **plural** forms (→ `[c][s]`). Bare proper-name references are emitted as
  `[c]` and promoted to `[C]` at sentence starts.
- **Source chip:** an imported feature now shows a right-aligned chip in its name
  field — source statblock · book code (e.g. *Wraith · XMM*) — with a ✕ to forget
  it. Stripped from exports and the origin signature (`stripSrc`).
- **Initiative Proficiency** button has a fixed width (sized to the widest label).
- **Identity layout:** Subtype / Alignment / Short name share one responsive row
  (`g-id2`), wrapping when narrow.

## Batch 40 — Forge entry overhaul, combo everywhere, FP2 + CSS tokens
- **Combo dropdowns project-wide:** every feature-**name** field (traits / actions /
  bonus / reactions / legendary / villain / lair) now uses the combo suggestion
  dropdown — typing filters built-in snippets **and** library features.
- **Picking a suggestion imports the body too** (not just the name).
- **Bracketize on import:** importing a library/chassis feature rewrites its concrete
  text into live tokens — creature name → `[c]`/`[C]`, `DC N` / `<Ability> Saving
  Throw: DC N` → `[ABIL SAVE]`/`[SAVE]`, `N (XdY)` → `[XdY]`, attack `+N` → `[ATK]` —
  so it retunes to the new creature. (Built-in snippets are already bracketed.)
- **Free drag-reorder** for the manually-ordered sections (actions/legendary/villain/
  lair), replacing the ▲▼ move arrows (mirrors the encounter-block drag).
- **Recharge / X-per-day "+"** moved **inside** the entry name field (divider-separated,
  like the Gear field).
- **CR-suggested AC / HP** show the value as a **placeholder** (empty field, behaves as
  set, no need to clear).
- **Short name:** Proper-name + Plural folded into a **gear popover** inside the field.
- Sidebar **"Preset libraries…"** uses the library **book icon**.
- **CSS:** introduced `--accent-hover`, `--in`, `--shadow-pop` tokens and swapped the
  repeated literals (no visual change).

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
