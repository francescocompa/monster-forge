# Changelog

Monster Forge — D&D 2024 homebrew monster & encounter builder. No-build static
site (`index.html` + `styles.css` + `data.js` + `parsers.js` + `app.js`).
Newest batches first.

## Batch 91 — Feedback round: local seed data, empty-bestiary picker, XP-bar colours, adventure header
- **Pre-filled local test data.** On `localhost` only, the app now seeds a realistic sandbox — a bestiary
  (goblin, dire wolf, bandit captain, ogre, cult fanatic, young green dragon), two adventures with party
  rosters, scenes, and encounters wired to those creatures — so the app and the Combat Tracker can be
  exercised without touching real data. It coexists with any real data, never writes to the cloud bin
  (`seed.js` sets a flag that makes `jbinSet` a no-op), and is skipped on the live site and in tests.
- **Add combatant with an empty bestiary.** The "Add combatant" picker no longer errors when you have no
  saved creatures — it opens with an empty-bestiary hint so you can load a chassis, Forge one, or add a
  Quick / Event combatant straight from the footer.
- **XP budget bar restyled.** The spent bar is now a single subtle bronze that blends with the palette
  (risk still reads from the difficulty pill), and the draggable target marker turns **blue with a focus
  ring while you drag it** so it no longer reads as the "high/over" threshold colour.
- **Adventure header polish.** The adventure-colour band now spans the **full width** of the column (the
  scrollbar starts below it, not beside it), and the **collapse chevron moved to after the title**.
- **Narrow-width adventure drawer.** On small screens the adventure list is now an off-canvas drawer: the
  button by the title shows the **Adventures glyph** and slides the list in as an overlay over the detail
  (tap a scrim or an adventure to close), instead of swapping the whole view.

## Batch 90 — Combat Tracker v2 (CT7b finish): add combatants from initiative + live-update
- **Add combatants from the initiative tracker** — a "＋ Add combatant" button at the bottom of the
  order opens the usual picker (Bestiary / Quick / Chassis / Forge / Event) and injects the new
  combatant straight into the running order (rolling its initiative + HP).
- **Live-update.** Adding a combatant or party member to a running encounter (from anywhere) now flows
  into the live initiative order automatically, re-sorted while keeping whose turn it is.

## Batch 89 — Combat Tracker v2 (CT7b core): initiative card + HP tracker redesign
- **Rebalanced combat view** — the initiative list is narrower and the active statblock/trackers panel
  wider, separated by a Forge-style divider.
- **Redesigned initiative card.** Initiative is an editable field (changing it re-sorts the order); a
  status control cycles **active / waiting / dead** (dead and downed combatants are skipped on advance,
  waiting is dimmed); the old mystery 0± field is gone.
- **New HP tracker.** A compact ratio-coloured bar (with a temp-HP segment), an **add-dmg** field
  (Enter applies; negative heals; temp HP absorbs first), an editable **current**, and the **max**.
  Temp HP and a signed **max-HP adjust** (e.g. Aid +5 raises max and current) live in the ⋯ menu.
- **Settings: Track party HP** toggle — turn it off to hide the HP tracker for player characters.

## Batch 88 — Combat Tracker v2 (CT7c, branch): load popup standardised + polish
- **Load popup uses the standard toolbar** (like Add combatant): search, **sort** (name / creation),
  **group** (None / Status / Adventure — disable grouping is "None"), and **filter** by status + adventure,
  with active-filter chips.
- **Click a status chip** in the load popup to change that encounter's status inline.
- **Scenes** show a small dimmed **folder icon** and a dimmed **"empty"** caption when they have no
  encounters.
- **Add-combatant** footer buttons no longer wrap their text.
- **Focused encounter block** in Adventures uses a softer highlight (less accent).

## Batch 87 — Combat Tracker v2 (CT7 fixes): header + load popup + footer
- **Combat header:** dropped the back button and "Load other"; the **adventure/scene title is now the
  control** — click it to open the load popup. Title aligns left.
- **Reworked load popup:** a **Group** (Adventure / Status) and **Status** filter; scenes are
  collapsible folders (chevron, collapsed by default — the running encounter's scene auto-expands) and
  read distinctly from encounter rows; the **currently-loaded** encounter/scene is highlighted; the
  "× grp" text is gone; per-adventure **＋ Encounter / ＋ Scene** buttons let you create on the spot.
- **Add-combatant footer:** the four add buttons now stretch to fill the row evenly.
- **Softer active-row highlight** in the initiative list (less accent glow).

## Batch 86 — Combat Tracker v2 (CT7): tab chrome + add-combatant polish
- **Cleaner combat-tab header.** The breadcrumb is just "Combat" now (it's a top-level tab). The title
  block shows the **adventure over the scene** with a vertical adventure-colour bar; the encounter
  selector (‹ › ghost chevrons) sits in line with it. The current encounter, its **budget rating**, and
  its notes show in a strip below, with the **round counter + turn chevrons** right-aligned.
- **Start/End combat moved to a tab FAB** (bottom-right). When an encounter hasn't started, the header
  expands full width and the FAB reads "Start combat".
- **Encounters get an Active status** while a combat is running (and again if you restart a completed one).
- **Encounter card (Adventures):** the start-combat button now shows a "Start combat" label (collapsing
  to just the sword icon when the card is narrow) in solid orange; the budget rating moved onto the
  budget-bar line, right-aligned.
- **Add-combatant popup:** taller minimum height so cards don't crowd the footer; footer reordered to
  Forge new · From chassis · Event · Quick · Done, with icons on Forge and From chassis and a dimmed
  "CR only" note on Quick; at narrow widths the footer wraps cleanly into three full-width rows. The
  "load chassis" menu items (Forge toolbar + Bestiary) now use a clipboard icon.

## Batch 85 — Combat Tracker v2 (CT5 + CT6): standalone tab, load popup, launch UX
- **Combat is now its own sidebar tab** (below Adventures), always reachable. Its empty state has a
  **Load encounter** popup that lets you pick any adventure → scene → encounter (shows status, group
  count, and whether a combat is already running).
- **Scene as header with prev/next.** When the loaded encounter belongs to a scene, the scene is the
  title and a strip shows the current encounter with ‹ Prev / Next › to move between the scene's
  encounters. Ending a combat keeps you on the tab so you can roll straight into the next fight.
- **Encounter status.** Each encounter now carries a lifecycle status — Draft → Ready → Completed
  (auto-set when you end its combat) — with Archived folded into the same status chip (and still the
  operative archive flag). Click the chip on the encounter card to change it.
- **Sword button starts combat.** The little "＋" next to Add combatant is replaced by a rounded accent
  **⚔ button** that starts (or resumes) combat for that encounter; the old "Run combat" menu item is gone.
- **One "Add combatant" popup.** The extra add options (Quick / From chassis / Forge new / Event) now
  live in the picker's footer instead of a separate menu.
- **Party is green, allies are blue** across the tracker, the active card, the encounter combatant rows,
  and the party roster.

## Batch 84 — Combat Tracker part 3 (CT4): active statblock, click-to-roll, resources
- **The active combatant's full statblock** now renders right in the combat view, colour-coded just like
  the Forge preview.
- **Click-to-roll, tagged to the combatant.** Click an attack, save DC, or any dice in that statblock to
  roll it — and the roll log attributes it to the combatant by name (e.g. "Archmage 2"), not the Forge's
  working creature.
- **Auto-detected resource trackers.** Starting combat scans each monster for "(N/Day)" features,
  recharge abilities, and the legendary-action pool, and turns them into clickable pips you spend and
  restore. Legendary-action pools refresh at the start of that creature's turn.

## Batch 83 — Combat Tracker part 2 (CT3): conditions, notes, skip-defeated, ungroup
- **Condition chips per combatant.** Add conditions from your conditions library (autocomplete) with an
  optional duration in rounds. Known conditions show their definition on hover, and timed conditions tick
  down — and drop off — at the start of that combatant's turn.
- **Per-combatant notes.** Jot a note on any combatant (e.g. "Concentrating on Haste"); it shows under
  their name in the order and on the active card.
- **Defeated combatants are skipped.** Advancing turns steps over anyone at 0 HP (in either direction),
  so you no longer click past downed creatures.
- **Ungroup.** A stacked group of identical monsters can be split so each rolls its own initiative.
- **Per-row ⋯ menu** for add note / add condition / ungroup / remove from combat.

## Batch 82 — Chip-field scrolling, really fixed (form-column cap + scroll fade)
- **Condition-immunity / gear chip fields now actually scroll.** The real cause wasn't the field — the
  Forge form column was sized to its widest child (a bare `1fr` = `minmax(auto,1fr)`), so the nowrap chip
  row inflated the whole column past the viewport and `.forge`'s `overflow:hidden` just clipped it. The
  column is now capped (`minmax(0,1fr)` + `min-width:0` down the chain), so the field is bounded and its
  chips scroll horizontally inside it.
- **Scroll-fade hint.** When chips overflow, the hidden edge fades out (right, left, or both depending on
  scroll position) so it's clearly scrollable.
- *(Combat Tracker (Batch 80) was moved off `main` onto the `combat-tracker` branch — the live site no
  longer carries the in-progress tracker; CT3/CT4 continue on that branch.)*

## Batch 81 — Loading screen, ability-tinted skills/tools, adventure header, fixes
- **Boot loading screen.** A tumbling amber d20 + wordmark covers the brief startup, so reloading no
  longer flashes the Forge before jumping to your last tab.
- **Skill & tool rows are ability-tinted.** Each skill/tool name box now borders in its tied ability's
  colour (Acrobatics = DEX blue, Arcana = INT purple, …); text stays white.
- **Adventure header redo.** The colour dot by the title is replaced with a thin adventure-coloured
  bar across the top of the column (click it to recolour). A chevron beside the title collapses the
  whole adventure info block (party, budget, notes, roster) so you can focus on the scene list.
- **Move submenu no longer clipped.** When a card's Move submenu would open under the sidebar, it now
  flips open to the right instead.
- **Chip fields really stay put now.** Condition-immunity and gear chip fields keep a fixed size and
  scroll their chips horizontally within the box (the field no longer stretches to fit them).
- **Collapsed New-adventure button** has its “+” properly centred.

## Batch 80 — Combat Tracker, part 1 (party roster + live initiative tracker)
- **Party roster.** Each adventure has a collapsible Party section: add player characters with
  AC / HP / initiative modifier plus free-form custom fields (passive perception, save bonuses, …).
- **Run combat.** An encounter's ⋯ menu has **Run combat** (▶). It snapshots the encounter's
  combatants and the party, expands `count:N` monsters into N HP-separate rows (identical monsters
  share one rolled initiative), rolls everyone's initiative (DEX tie-break), and opens a dedicated
  full-screen **Combat** view.
- **Live tracker.** Initiative order with the active combatant highlighted, round counter, Next/Prev
  turn, per-combatant HP with quick damage/heal (and a defeated state at 0 HP), AC, and a panel for the
  active combatant. The combat is resumable and survives a reload; **End combat** clears it.
- **Combat setting.** A new Settings → Combat card: roll monster HP from Hit Dice or use average HP, and
  toggle DEX initiative tie-breaking.
- *(Coming next: condition chips, status/comment, and the active creature's full statblock with
  click-to-roll tagged to that combatant.)*

## Batch 79 — Ability colours, cleaner roll labels, back-button fix, menu polish
- **Ability boxes are colour-coded.** Each ability/save box in the Forge is tinted with its ability
  colour (STR red, DEX blue, CON orange, INT purple, WIS green, CHA pink), matching the statblock.
- **Cleaner roll-log labels.** Rolling an attack/feature whose name carries a usage note —
  "(Recharge 5–6)", "(3/Day)", "(Costs 2 Actions)" — now logs just the action name, without the note.
- **Back-to-adventures button works.** At narrow widths the ‹ button next to an adventure's title now
  reliably returns to the adventure-cards column (it stopped working because the list immediately
  re-opened the last adventure).
- **Menus sit above the sidebar.** Dropdown menus no longer slip behind the floating sidebar drawer.
- **Smarter Move options.** Move is disabled entirely when an item is the only one in its list, and the
  individual options grey out when they'd do nothing (Move-to-top/up while already first, etc.) — across
  adventures, scenes, and encounters.

## Batch 78 — Pins, reordering, reload memory, recharge split, chip-field scroll
- **Pin anything to the top.** Adventures, scenes, encounters, and bestiary cards all get a Pin/Unpin
  option in their menu (Unpin replaces Pin once pinned). Pinned adventures/scenes float to the top of
  their list; a pinned encounter rises to the top of its scene (or the ungrouped list); pinned bestiary
  cards **ignore the active filters** — they always show, dimmed when they'd otherwise be filtered away.
- **Reorder adventures.** Adventure cards are now draggable, and their menu (plus the right-click menu)
  has a Move → top/up/down/bottom submenu — matching encounters. Scenes gained the same Move submenu.
- **Reload remembers where you were.** A reload restores the stat block you were editing in the Forge
  and the tab you were on (Forge / Bestiary / Adventures), instead of always dropping you back on Forge
  with a blank creature.
- **Recharge split into two rolls.** For a recharge action that deals damage, clicking the entry NAME
  still rolls recharge + damage as a group, but the inner "(Recharge 5–6)" tag now rolls the recharge
  die ONLY — so you can check the recharge without also rolling damage.
- **Card menus organised.** Bestiary, adventure, scene, and encounter menus are grouped into logical
  sections with separators.
- **Chip fields scroll, not grow.** Condition-immunity / gear chip fields are a single fixed-height row
  that scrolls horizontally (cropped at the right edge) instead of wrapping and growing the field. The
  "add condition…" / "add gear…" prompt disappears once a chip is added.

## Batch 77 — Rule-finder coverage, recharge grouping, notification polish
- **Rule finder finds more.** Statblock abbreviations now resolve to their glossary rules (AC → Armor
  Class, HP → Hit Points, CR → Challenge Rating, XP → Experience Points), and section headers (Actions,
  Bonus Actions, Reactions…) are scanned. (Terms whose rule isn't in the loaded set — abilities, damage
  types, sizes, PB — still don't highlight; no rules are fabricated.)
- **Recharge actions roll as a group.** Clicking the name of a recharge action that deals damage now
  rolls the recharge die *and* the damage together — grouped in the roll log, with one combined
  notification.
- **Roll notifications highlight the result.** The rolled number is emphasised in the toast (e.g.
  "Bite: **15** Piercing damage").
- **Consistent damage capitalization.** The damage-type hover on a roll-log DMG tag (and the
  notification text) now reads "Piercing damage", not "piercing damage".
- **Scrollable chip fields.** Condition-immunity and other chip fields top-align and scroll instead of
  clipping the top row when full.
- **Readable dice-notation help.** The dice-notation tooltip tokens use the same JetBrains Mono chip
  style as the bracket shortcuts.
- **Statblock skeleton.** A shimmer placeholder fills the statblock preview on startup so the box
  doesn't collapse before the first render.

## Batch 76 — Refactor phase 2f: decompose openRollPopover
- Extracted the roll popover's 3-branch lead control into a pure `rollPopLeadHTML`. Verified the
  popover renders identically for normal (mode tag) / damage (CRIT chip) / spell-scale (upcast stepper)
  variants. **Completes phase 2 — all 5 render builders decomposed.**

## Batch 75 — Refactor phase 2e: decompose colorizeStatblock
- `colorizeStatblock` → coordinator + `colorizeAttackLabels` / `colorizeAttackNames` /
  `colorizeRechargeTags`. Verified byte-identical colorized statblock for an archmage and a recharge
  dragon; click-to-roll on attack names confirmed.

## Batch 74 — Refactor phase 2c: decompose entryHTML
- `entryHTML` → dispatcher over `entryReactionHTML` / `entryVillainHTML` / `entrySpellHTML` /
  `entryAttackHTML` / `entryTextHTML`. Verified byte-identical for every entry kind.

## Batch 73 — Refactor phase 2b: decompose renderRollLog
- `renderRollLog` → pure `rollLogHTML()` + `bindRollLog()` + coordinator. Verified byte-identical
  roll-log HTML against a fixed entry set (single/grouped/damage/adv/crit).

## Batch 72 — Refactor phase 2a: decompose renderPreview
- The 8 KB `renderPreview` is now a thin coordinator over named pure builders — `sbHeaderHTML`,
  `sbAbilityTableHTML`, `sbMetaHTML`, `sbEntryBlockHTML`, `sbEntriesHTML`.
- Behaviour-preserving: the rendered statblock HTML was verified byte-identical to the old output for
  an archmage, a blank creature, and a goblin (traits / attack / legendary / condition immunities).
- No user-facing changes. (Remaining render-builders to decompose: `renderRollLog`, `entryHTML`,
  `colorizeStatblock`, `openRollPopover`.)

## Batch 71 — Refactor phase 1: split app.js by concern
- `app.js` (3,334 lines) split into six classic scripts loaded in order — `core.js`, `forge.js`,
  `engine.js`, `bestiary.js`, `adventures.js`, `app.js` — still one shared global scope, still no build.
  Pure code-move: the concatenation is byte-identical to the old `app.js`, so behaviour is unchanged.
- The jsdom smoke test earned its keep immediately: it caught the one cross-script hazard (the
  `#forgePaste` handler referenced `openImportModal`, which now lives in a later-loading file — fixed by
  deferring the lookup to click time). The tooling's file lists were updated to match.
- No user-facing changes.

## Batch 70 — Dev tooling (no-build safety net)
- Added a dev-only tooling layer — the shipped site stays no-build. `npm run verify` runs `node --check`,
  ESLint, and a jsdom smoke test. See `DEVELOPMENT.md`.
- **ESLint** (`eslint.config.js`): self-maintaining cross-file globals (parses each shared script's
  top-level declarations) so `no-undef` catches real typos without false positives. Baseline: 0 errors.
- **Smoke test** (`test/`): boots the real `index.html` + all three scripts in jsdom and asserts init
  throws nothing — the net for the "top-level binding to a removed node white-screens the page" failure.
  Plus pure-function maths checks (mod/sgn/clamp/pbForCR/rollFormula/exprAvg/bracketize).
- **Pre-commit hook** (`.githooks/pre-commit`, enable with `git config core.hooksPath .githooks`) runs
  the full verify before a commit can land.

## Batch 69 — Rule-finder consistency, popover toggle, ⌘S
- **Rule finder now scans the whole statblock consistently.** Header stats (Initiative, Speed) and the
  value lines (skills, senses, condition immunities, languages) are highlighted whether or not the
  creature has traits/actions. Previously, any creature *with* body blocks silently skipped the header
  and value lines (so "Initiative" highlighted on a blank creature but not on a full one).
- **No more yellow attack-label text in the rule finder.** Italic labels like "Melee / Ranged" are
  dimmed with the rest of the prose; only actual rule terms stay amber.
- **New setting — "Spell & condition popovers"** (Settings → Definition popovers). Turn off the
  hover/click definition cards for spells and conditions while keeping everything else. The rule finder
  still shows definitions while it's active.
- **⌘/Ctrl-S saves the Forge** to the Bestiary (instead of the browser's Save-Page dialog) when the
  Forge is open.
- **Self-references in popovers are now plain text.** A definition that mentions its own name (e.g. the
  Charmed card saying "charmed") shows it with no colour and no link — matching the rule-finder
  behaviour — so a card never points back at itself.
- **Roll-log collapse uses the standard chevron** instead of a tiny unicode triangle.

## Batch 68 — Rule-finder & popover fixes
- **No false unsaved-edits prompt** when loading a chassis from the picker. The picker now checks
  `forgeUnsaved()` (which ignores an unedited chassis/preset) instead of the raw `monsterDirty()`, so
  swapping bases without having made edits no longer asks to confirm.
- **Esc exits the rule finder.** If a definition popover is open, the first Esc closes that popover and
  a second Esc exits the finder.
- **No dead amber highlights.** A rule-finder term is only highlighted if it actually resolves to a
  rule/condition — words that matched loosely but had no definition (e.g. stray "Melee"/"Hit") are no
  longer painted yellow with an empty hover.
- **`(level N version)` upcast default fixed.** The cast level beside a spell name (e.g. "Lightning
  Bolt (level 7 version)") now seeds the roll popover's level stepper. It was looking at the wrong DOM
  node (the tail renders next to the `.cc-spell` wrapper, not the link itself).
- **Rule-finder popovers never link to themselves** — like conditions, a definition's own name inside
  its popover is shown as plain text (no amber link that reopens the same card).
- **Ghost dismiss icon.** Every definition popover (spell / condition / rule) now has a small, subtle
  ✕ in the top-right corner to close it.

## Batch 67 — Rule-finder depth, popover tables, damage abbreviations
- **Rule finder** now reads from more reference files — upload any of 5etools' `variantrule`, `action`,
  `sense`, or `skill` JSONs as a "Rules" library (conditions still work as before and also feed the
  finder). Matching is smarter: it catches plurals ("Attack Rolls", "saving throws") and lower-case
  phrasing for multi-word terms, while single words stay case-sensitive so "prone to" / "damage" don't
  false-fire. The rule-explanation popover is no longer dimmed and highlights terms inside itself.
- **Tables render in popovers** (e.g. Teleport's familiarity table) instead of pipe-separated text.
- **Damage tag** in the roll log shows the damage type abbreviated (Fire, Bludg., Light., Necr.,
  Pierc., Pois., Psych., Rad., Slash., Thun., …) in place of "DMG".
- **Upcast rolls** tag the cast level after the spell name in the log + notification, e.g.
  "Lightning Bolt • LV5".
- **Tools** are formatted like skills now — ability-coloured name pill + underlined modifier.
- The statblock's **Unnamed Creature** placeholder is muted instead of accent-coloured until you name it.

## Batch 66 — Rule finder, three roller chips, roll-notif checks & polish
- **Rule finder:** a new **?** button in the header (hover for what it does, click to start). It dims the
  statblock and highlights every rules-glossary term, condition, and already-linked spell in amber —
  hover any highlight for its definition (popovers highlight too). Rolls and other popovers pause while
  it's on; click the **✕** to exit. Upload a rules file (5etools `variantrules.json`) in Preset
  libraries as a new "Rules" library; without one, conditions and spells still highlight and a toast
  prompts you to add rules. Glossary/condition matching is case-sensitive and spells are limited to
  detected references, so ordinary words ("light", "shield") don't falsely light up.
- **Three roll-popover chips by context:** a d20 roll keeps the adv/dis chip; a **damage** roll shows a
  **CRIT** chip (off by default) that doubles the dice when enabled; a **spell** damage roll shows a
  level **stepper** (no dropdown) — blank means its base level, and if the spell was cast at a
  "(level N version)" the field defaults to N.
- **Check notifications** now name the ability: "Strength Check: 12", "Wisdom (Persuasion) Check: 14",
  "Intelligence (Jeweler's Kit) Check: 7".
- **Untitled items:** new adventures/scenes/encounters start blank with a placeholder (nothing to
  clear); the collapsed adventure shows an em dash instead of initials until you name it.
- **Settings:** a master toggle on the Notes-fields card flips all three at once.
- Loading a chassis/preset with no edits no longer prompts "unsaved edits" when you load another; the
  Save & New / Replace choices now read as primary vs. the quiet Back. The custom-roll popup now layers
  above a reference popover when opened from inside one.

## Batch 65 — Spell upcast roller, grit rule, notes toggles & polish
- **Spell upcast roller:** right- or Cmd/Ctrl-click a spell's damage dice in its popover to open a
  roller with a **spell-level field + dropdown** (in place of the adv/dis chip) that rescales the dice
  to the chosen slot level — e.g. Cone of Cold 8d8 → 11d8 at level 8. *(Re-parse your spell library to
  capture the scaling: Preset libraries → ⋯ → Re-parse.)*
- **Grit (minimum damage) rule:** a new Settings → Homebrew toggle so damage rolls deal at least their
  maximum possible non-crit value (every die's top face + modifiers); crits still roll and keep the
  higher result.
- **Natural roll notifications:** the roll toast now reads naturally and lingers longer — e.g.
  "Arcane Burst: 23 to hit, 25 force damage", "Strength Saving Throw: 16".
- **Re-parse:** shows a loading overlay while it works, and now warns when a library can't be
  re-parsed because its original upload predates raw-file storage (re-upload it once to fix).
- **Notes fields:** Settings toggles for whether new adventures / scenes / encounters get a notes
  field, plus an Add/Remove notes item in each ⋯ menu.
- **Collapsed adventures column:** each adventure is a 40×40 rounded colour square showing up to three
  name initials in a contrast-checked text colour; the add button is a centred "+".
- **Unsaved-edits chassis dialog:** three side-by-side choices — **Save & New** (save current edits to
  the Bestiary, then start the chassis), **Replace**, **Back** — and ":" instead of an em dash.
- **Mobile:** long-press an empty spot to open the custom roller (the touch equivalent of Cmd-click).
- New rolls auto-scroll the log to the newest entry; the textarea resize grip is themed for dark mode;
  the ⚒ icon is gone from the Homebrew tag; Export/Import JSON live only in Settings.

## Batch 64 — Spell scaling, smarter damage detection, drag-resize columns
- **"At higher levels" fix:** spell scaling like Cone of Cold now reads "increases by **1d8** per level"
  (the per-level increment), not the base 8d8. *(Re-parse your spell library to update existing data:
  Preset libraries → ⋯ → Re-parse libraries.)*
- **Smarter damage-type colouring:** a word like *fire* or *force* is only flagged as damage when it's
  actually in a damage context (followed by "damage", possibly via "fire, cold, or lightning damage").
  No more false hits on Prestidigitation's "Fire Play" or Shield's "magical force".
- **Stickier popovers:** spell/condition popovers wait longer before closing, so you can move onto them
  to roll their dice without them vanishing.
- **No self-references:** a popover no longer links a term to itself (e.g. the Invisible condition card
  no longer has an "Invisible" link).
- **Drag to resize the sidebar & adventures column:** instead of a button, drag the divider (like the
  forge preview splitter); it snaps to the icon / colour-card view once labels stop fitting, and a
  double-click restores the default width. Fixes the empty gutter when hiding an icon-collapsed sidebar
  via the burger.
- **Roll log:** a grouped roll whose entries all share one ability now shows a single colour bar
  spanning the whole group; the window keeps its dragged position when collapsed (with a new "Reset
  position" menu item once moved); crits drop the background gradient for a **yellow number with a few
  twinkling stars**.
- **Forge:** opening a creature to edit now expands all sections.
- Export / Import JSON removed from the sidebar (they live in Settings).

## Batch 63 — Roll-log alignment, popover stacking, collapsible sidebar & adventures
- **Roll-log alignment:** the ability-colour bar and the TYPE tag (ATK/DMG/CHK/SAVE) now sit at the
  exact same position whether a roll is shown on its own or inside a group, and the dice breakdown
  uses the same faint colour and size in both cases.
- **Adv/dis tag** now sits inline at the **start** of the dice breakdown and scrolls with it (no
  longer pinned at the end).
- **No scrollbar** over the roll log (it covered the rolls) — still scrolls, including by touch on
  mobile; the dice breakdown also scrolls without a visible bar.
- **Drag the roll-log window** by its header to place it anywhere on the page; collapsing or clearing
  it restores the default bottom-left spot.
- **Ability bar on damage rolls:** a damage roll now shows the same ability bar as the attack it came
  from. For prose attacks (e.g. the Archmage's *Arcane Burst*, +9) the ability is inferred from the
  to-hit bonus — so it correctly reads as INT.
- **DMG-tag hover** in the log shows the damage type again.
- **Popover from a popover:** a condition named inside a spell's popover now opens its own stacked
  popover instead of replacing the spell card.
- **Unified detection & colours in popovers:** spell/condition popovers use the same colour-coding and
  rollable detection as the statblock — conditions are the same violet, dice are rollable.
- **Roll-log statblock link fix:** hovering a source no longer shows a leftover card from another row.
- **Underlines match their text:** rollable features and reference links underline in their own text
  colour (white attack names, blue dice, violet conditions) instead of a fixed accent.
- **Collapsible sidebar:** a handle collapses the left rail to an icon-only strip (remembered across
  loads).
- **Collapsible adventures column:** a handle collapses the adventures list into square colour cards
  (right-click a card for Open / Colour / Duplicate / Archive / Delete).

## Batch 62 — Popover rolls, roll-log layout, ability bar
- **Roll from inside reference popovers:** spell/condition hover popovers are now colour-coded and
  their dice are clickable — e.g. roll Lightning Bolt's 8d6 straight from its popover.
- **Roll-log rows:** the dice breakdown is horizontally **scrollable** when long; the adv/dis tag
  stays **pinned** beside the type tag (doesn't scroll). The ability colour is now a **vertical bar**
  in a reserved right gutter (replacing the bg tint that wasn't reading), so the type tags line up.
- **Grouped sub-rolls** are a single centred line: total + breakdown + (adv) + right-aligned type tag.
- **Hovering a DMG tag** shows a small popover with the damage type (when known).
- Disabling **click-to-roll** now also disables Cmd/Ctrl-click custom rolls and the d20 cursor.
- With **colour-coding off**, the ability codes (STR…) left-align and take the accent title colour.

## Batch 61 — Roll log polish, grouped rolls, ability tint, dice shorthand
- **Grouped rolls:** consecutive log entries that share a source + name (e.g. an attack's to-hit +
  damage) collapse into one block — the source/name shown once, each sub-roll listed under it.
- **Ability tint:** a roll tied to an ability (STR attack, INT check, a save) gets a subtle
  ability-coloured background in the log; the stat-block name is white with a dashed underline.
- **Roll log:** ATK tag is now yellow; the adv/dis indicator moved next to the breakdown line; the
  source ref is white + dashed-underlined. The mode chip says **FLAT** (fixed width) and **resets to
  flat after every roll** (set adv/dis again right before the next).
- **Cmd/Ctrl-click a rollable** opens the custom-roll popover pre-filled (same as right-click); the
  spinning **d20 cursor** now also shows while Cmd/Ctrl is held (the native cursor hides).
- **Dice shorthand:** `d20!` and `d20>d20` mean advantage, `d20<d20` means disadvantage.
- **Vertical forge resizer:** the form/preview handle now works in the stacked layout at narrow
  widths (drag up/down); double-click still resets.
- Resizing audit: no horizontal overflow found across forge/bestiary/adventures at 480–1280px;
  hardened the encounter & scene headers against name-field bleed.

## Batch 60 — Roll mode, in-prose checks, re-parse & resizable forge
- **Roll mode tag:** the adv/disadvantage dice-icon is now a small clickable **NORMAL / ADV / DIS**
  tag (cycles on click) shown in both the custom-roll popover and the **roll-log header**. The chosen
  mode applies to click-rolls and custom rolls.
- **Roll log layout:** the source statblock ref now sits **above** the roll name, and the total is
  vertically centered in the row.
- **In-prose checks are now coloured & rollable:** a skill check like *Intelligence (Investigation)*
  rolls with this creature's modifier (ability mod + proficiency if it has that skill) on an
  ability-coloured pill; the **spellcasting ability** ("using Intelligence…") is likewise rollable.
- **Saving-throw phrases** are now white text on the **ability's colour** (e.g. *Dexterity Saving
  Throw* on a blue pill).
- **Re-parse libraries:** uploaded .json is now kept (in IndexedDB), so the upload button has a
  **▾ dropdown** with *Re-parse libraries* (replays files through the latest parser — no re-upload)
  and *Clear all disabled*. Re-parse is non-destructive: libraries without stored raw are untouched.
- **Resizable Forge:** a hover-revealed handle between the editor and preview lets you drag the
  split; **double-click resets** it. The width persists.
- **Roll labels** use the full ability name (Intelligence, not INT).
- **Settings simplified:** colour-coding and click-to-roll are now single on/off toggles (the
  sub-options are gone); the click-to-roll card notes the ⌘/Ctrl-click custom-roll shortcut.
- The Forge title shows just the creature name (no "Editing ·"); the settings gear **toggles** the
  Settings page closed; the d20 cursor animation is **snappier** with less rest (none when enlarged).

## Batch 59 — IndexedDB storage, spellcasting & chassis polish
- **Reference libraries now live in IndexedDB** (presets/spells/conditions), with a one-time
  migration out of localStorage. Fixes the silent data loss on GitHub Pages where the ~5MB
  localStorage cap was exceeded (a parsed bestiary alone is ~10MB). Your own monsters still sync
  via JSONBin; the small ref state stays in localStorage.
- **Spellcasting import fixes:** a "hidden"-list block (e.g. *Misty Step (3/Day)*) now renders as a
  plain feature — name + its sentence — instead of a malformed spell-group list. Spell names
  mentioned in any spellcasting-derived feature (reactions, bonus actions, …) are now linked with the
  hover popover (scoped to each block's own spells, so no false positives). The Spellcasting line's
  **save DC and to-hit are now coloured**.
- **Saving-throw phrase is coloured** ("Dexterity Saving Throw" → blue, matching the scheme: blue =
  the roll, yellow = the DC target number).
- **Chassis picker:** an always-open inline **search field** (type immediately); the search is no
  longer hidden behind a popover icon.
- **Loading a chassis bracketises matching parts** — the creature's self-reference, and any DC /
  to-hit / dice-average that matches the stat block, become live `[c]`/`[SAVE]`/`[ATK]`/`[XdY]`
  tokens (non-matching numbers are left alone), so edits to the stats flow through automatically.
- **Animated d20 cursor** now uses a real d20 and an eased tumble (rotation + a subtle scale swell,
  resting upright & small for a beat).
- **Preset library:** a **Clear** button in the batch-selection bar.
- **Adventures:** opening the tab now restores the last-opened adventure (or the most recent).
- **XP target marker** is the same size whether placed or not yet placed.
- **Scene drop zone** sits below the notes box, so the dashed landing box no longer overlaps it.

## Batch 58 — Tools, colour audit & roll-popover polish
- **Tool checks are rollable with the right ability** — added the XPHB 2024 tool→ability
  map (`TOOL_ABIL`); each tool now rolls `1d20 + its ability mod + PB` and shows the modifier.
- **Source filter shows real book titles** — the From-chassis and Bestiary filters now label
  sources with the full name from `books.json` (e.g. "Monster Manual (2025)") instead of the
  filename, and the Bestiary gained a **Source** filter.
- **Yellow/blue colour split:** yellow now means a static number you *don't* roll (to-hit /
  attack bonus, save/check DC); **blue means dice you actually roll** (NdX, recharge). Saving-throw
  phrases stay blue.
- **Animated d20 cursor** follows the pointer over anything rollable (a real CSS cursor can't be
  animated). Respects reduced-motion.
- **Roll popover:** the adv/disadv icon lost its box — it's now a larger (16px) icon that only
  changes colour (grey → green → red); the **(?) moved after the Roll button** and shows the dice
  notation on **hover** (in a separate tooltip that no longer tears down the roll field). The
  dice-notation popover uses a cleaner sans font.
- **Custom rolls:** carry no source, so the roll-log shows no statblock name; the field starts
  empty with a `1d20` placeholder and rolls 1d20 if left blank.
- **Saving-throw bonuses are bold when the creature is proficient** in that save.
- **Condition immunities:** the condition link keeps its dotted underline + popover but loses the
  blue tint. For both condition immunities and spell lists, a trailing `(comment)` is no longer
  coloured/underlined — only the bare name links.
- **Clear log** in the roll-log menu is now red, matching other destructive actions.
- **Settings gear icon** shrunk to 15×15.

## Batch 57 — Roll & colour round
- **Condition immunities** now ignore a trailing `(comment)` when matching a known
  condition — `charmed (with mind blank)` resolves to the *charmed* reference (same
  rule already used for spell chips).
- **Skills and tools are rollable:** a skill rolls `1d20 + its shown modifier`; a
  tool rolls `1d20 + proficiency bonus` (the ability is the DM's choice, so PB only).
- **Chassis-preset attacks roll again:** the `*Melee Attack Roll:* +N` jargon was
  split across an italic by the formatter, so the attack bonus (and the attack name)
  weren't tagged as rollable; the `+N` after an italic "…Attack Roll:" is now tagged,
  and damage wrapped in parentheses (`(8d6)`) is recognised too.
- **⌘/Ctrl-click anywhere** opens a quick custom-roll popover at the cursor
  (documented in the dice-notation help).
- **Roll-log result** is now neutral (white); green/red are used **only** when a
  pass/fail is evident — e.g. a **recharge** roll shows green when the d6 meets the
  recharge number, red when it doesn't.
- **Ability colours** changed: STR red, DEX light blue, CON orange, INT purple,
  WIS green, CHA pink. Ability codename pills are a **fixed width** (sized to the
  longest) with a larger gap before the scores. **Mod/Save bonuses are white.**
- Dropped the trailing `…` from action menu items / buttons (Dice notation, Custom
  roll, Import from another adventure, From chassis).

## Batch 56 — Roll/colour fixes + spellcasting import
- **Roll-log:** header buttons collapsed into a **kebab menu** (Dice notation ·
  Sort order [newest top/bottom] · Custom roll · Clear log). Right-click a log entry
  to **Reroll** or **Remove** it. CHK tag recoloured purple.
- **Recharge** in an action name is now rollable (1d6); dice that aren't clearly
  damage/attack/save/check carry **no tag** (damage requires a following "… damage").
- **Ability-score block:** colour highlight now sits behind only the fixed-width
  codename (neutral text, scores uncoloured), with spacing between highlights and
  Mod/Save numbers centred. **Skills** inherit their ability's colour.
- **Spells** get their own purple colour; spellcasting blocks are excluded from the
  colouriser (so "Wall of Fire" no longer tags "fire" as a damage type).
- **Spellcasting import fix:** 5etools `spellcasting` blocks now route by `displayAs`
  — Spellcasting → **Actions**, "Misty Step (3/Day)" → **Bonus Actions**, "Protective
  Magic" → **Reactions** (was: everything dumped into traits) — and are structured
  into spell-mode entries with parsed groups. (Re-import affected creatures to apply.)
- **Spell chips** may carry a "(comment)" beside the name; reference lookup ignores
  anything in brackets.

## Batch 55 — Roll & colour overhaul
- **Colours:** all damage types now share one fixed colour (no per-element palette);
  conditions recoloured violet (distinct from the accent); ability-score block gets
  per-ability colour highlights behind each label.
- **Recognised conditions in prose** are underlined and get the hover/click info
  popover (same as the condition-immunities line) when the condition is in an
  uploaded library.
- **Rolling:** saving throws & ability checks (the stat block's mod/save cells) are
  now rollable; attack jargon ("Melee/Ranged Attack Roll: +N") is rollable as
  d20+N; clicking an **attack's name** rolls the attack **and** its damage, and a
  natural 20 auto-crits (gold-glow row) and doubles the damage dice.
- **Custom rolls** use [clockworkmod dice notation](https://dice.clockworkmod.com/)
  (NdY, +/-, kh/kl/dh/dl, d%) with a (?) help link in the popup and the roll-log.
- **Roll popup** redesigned: a single advantage/disadvantage cycle dice-icon
  (green → red → off), an editable formula, (?) help, and Roll — no preset buttons.
- **Roll-log:** name-only label + a right-aligned type tag (ATK/DMG/CHK/SAVE);
  advantage/disadvantage shown as a green/red dice icon; **CRIT** rows are gold; each
  roll shows its **source** statblock (click to open it in the Forge, hover to preview).
  Higher-contrast panel so it no longer blends into the background.
- **Legacy spellcasting:** a Spellcasting trait on an imported/legacy statblock is
  detected and converted to the 2024 **Spellcasting action** (ability/DC/spell groups
  parsed; falls back to a plain action if the list can't be parsed).
- All FABs standardised to 32px; the stat-block preview scrolls clear of the Save
  button.

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
