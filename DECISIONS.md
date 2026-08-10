# DECISIONS — Monster Forge

> Append-only feature-decision log (format: `~/.claude/skills/decision`). Phase-scoped decisions
> (Q1.A, Q2.A …) live in `ROADMAP.md`'s decision log and `TASKS.md`'s 🔶 blocks — this file holds
> off-roadmap / feature-level decisions so they don't get re-litigated. Never delete; supersede.

### D-001 — The PC generator is a species-blind engine; v1 ships only the Kobold pack · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, round 1 (kobold-generator interview)
Raw note: picked the recommended option ("Species-ready core, kobold pack only")
Options: A kobold-only content on a species-ready core / B + ~10 curated XPHB species packs / C parse `races.json` for any species
Chosen: A — fastest safe path to the oneshot; generalization proven by architecture (species = one data object: size/speed/senses/fixed traits/rolled-trait tables/flavor tables), not content volume. Rejected B — doubles content + review load, risks the one-session build. Rejected C — species traits are prose with embedded player choices; auto-condensing to rules-legal packages is unreliable and still needs manual review.
Enforced by: engine reads everything from the `GEN_SPECIES` pack object (no kobold literals in the engine); test asserts the kobold pack satisfies the pack schema.
Affects: data.js (or gen data file), DEVELOPMENT.md (generator section).

### D-002 — The crew is an adventure-tied feature, not a nav view · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, rounds 2–3 (answer evolved across rounds)
Raw note: "New nav view, although I'm not sure if I want this in the final product." → "Instead of making it a nav, how can we make it somewhat separate and quick and easy to access for players?" → "When I create a new adventure, from there I should be able to mark it as tied to the kobold generator, and it gives me the share link for the players as well as show all the created kobolds as PCs in that adventure. In this case, the players should mark the kobolds as dead to create a new one, so that the adventure keeps track of the current PCs and archives the dead ones."
Options: A new nav view / B section in the adventure detail / C hidden view (settings pattern) / D modal
Chosen: B — an adventure is flagged generator-tied; its detail hosts the crew panel (share link/QR, crew settings, living PCs, dead archive with Caduti counter). Rejected A — Francesco doubts it belongs in the final product's nav. Rejected C/D — global surfaces detached from the adventure that owns the crew.
Enforced by: prose only — code shape follows it (crew state lives on the adventure object).
Affects: adventures.js (crew panel), data model (`a.crew`), roster integration.

### D-003 — Players generate on their phones via a crew share link; rolling replaces the dead kobold · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, rounds 2–3
Raw note: "No need to mark death, the player will just generate a new kobold. As a matter of fact, this feature should be available in player mode."
Options: A crew share link (`index.html?crew=<id>`, shares namespace, same pattern as combat share) / B button inside the combat-share player view / C local-only page, no sync
Chosen: A — one link/QR for the whole oneshot; works before, between, and during fights. Rejected B — exists only while a fight share is live. Rejected C — kills the DM-side crew and party integration.
Death rule: completing a new roll retires the player's previous kobold as dead (archived, last words revealed, Caduti +1). The roll IS the death rite — no separate bookkeeping (reconciles the raw note above with the round-3 "Roll replaces" pick).
Enforced by: prose + the crew ingestion path (one living kobold per player id).
Affects: app.js boot (crew param), new crew-mode surface, DEVELOPMENT.md security section.

### D-004 — Every choice is pick-or-roll, for everyone; generation is a step-through dice ritual with a one-shot escape · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, rounds 1 + 4
Raw note: "Every choice should be either rolled or picked." + "Full pick-or-roll everywhere. Also, rolls should actually be dice rolls from tables if possible, so it doesn't simply generate, but you roll through the process (a button could still allow you to fully generate in one shot a full character)"
Options: A players roll-only / B players may pick class only / C full pick-or-roll everywhere
Chosen: C — the ritual of rolling through the tables is the product; every step shows real dice from a real table and offers a pick override; a "full generate" button rolls everything in one shot. Rejected A/B — conflict with the stated principle.
Enforced by: engine design — every step is a pure function returning `{rolls, result}`; UI renders both paths.
Affects: generator engine + both surfaces (player crew view, DM panel).

### D-005 — Draconic Sorcery cantrip table = the full 2024 sorcerer cantrip list · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, round 4
Raw note: picked "Full sorcerer list"
Options: A curated d8 (handoff assumption) / B full XPHB sorcerer cantrip list
Chosen: B. Rejected A — Francesco prefers variety over the curated shortlist. Verify the XPHB list against the 5etools mirror at build time; if it counts 20, the roll is a clean d20.
Enforced by: data table transcribed from the mirror; test pins the list length to the die size.
Affects: species pack (kobold Draconic Sorcery sub-table).

### D-006 — Print (2-up A4) and crew JSON export/import are cut from v1 · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, round 4
Raw note: picked "Neither — core only"
Options: A print stylesheet / B JSON export+import / C neither
Chosen: C — tightest core in the one-session budget; both go to the open backlog. Rejected A — net-new print CSS (none exists today), theater not necessity once phones sync. Rejected B — cloud sync already persists the crew.
Enforced by: prose only — backlog entry in the open-backlog memory.
Affects: open-backlog memory (updated 2026-08-05).

### D-007 — The crew share channel carries roll results and picks, never derived stats · 2026-08-05 · DECIDED
Mechanism: delegated to Claude (proposed against the handoff's design; aligned with the B250 boundary)
Raw note: (handoff had the player client compute the statblock and the DM trust it)
Options: A sync the computed character / B sync only `{playerName, choices/rolls}` and re-derive locally on the DM side
Chosen: B — player payloads stay untrusted data; the DM app re-runs the same deterministic engine over the payload's rolls/picks, so every mechanical value is locally derived; the only free text is the player name (sanitized + length-capped at ingestion). Rejected A — violates "player-supplied data stays untrusted at ingestion" (ROADMAP ground rule, B250).
Enforced by: ingestion path re-derives; payload schema has no stat fields; test asserts ingestion of a hostile payload yields a legal PC.
Affects: crew sync schema, DEVELOPMENT.md security section.

### D-009 — Flavor tables shelved; identity is typed by the players · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion (Stage-B checkpoint, round 1)
Raw note: "Ignore for now these tables and hide them, leave the fields for the players to fill."
Options: A lock the four drafted Italian tables / B line-edit them / C shelve rolled flavor, fields typed by players
Chosen: C — the ritual's final Identity step takes a typed name (required) plus optional quirk/trinket/last words; nothing is rolled. Partially supersedes D-004 for identity fields (they are pick-only) and the flavor part of D-008. The drafted tables stay in `GEN_SPECIES.kobold.flavor` as dormant data for a possible later revival; the engine does not roll them.
Enforced by: `test/gen.test.js` (payload without a name rejected; free-text quirk cleaned + capped; no table validation).
Affects: gen.js engine + ritual; DEVELOPMENT.md generator section.

### D-010 — The crew card is a REAL statblock, dice are creation-only, resources get a tracker · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion (Stage-B checkpoint, round 1)
Raw note: "The actual card should look more like an actual statblock, not this slight revisitation, with the features in the right sections, converted in monster statblock standard. The stat rolls should be hidden, only visible when creating the statblock. There should be a tracker below for all resources in a statblock."
Options: A keep the MM25-flavored compact card / B tweak details / C convert to monster-statblock standard
Chosen: C — `genToMonster(ch)` builds a monster-shaped object from `blankMonster()` and the card renders through the app's own composer (`sbHeaderHTML`/`sbAbilityTableHTML`/`sbEntriesHTML`); features are sorted into Traits / Actions / Bonus Actions (weapon + damage-cantrip action lines, Spellcasting action, Cry/Rage/Second Wind as Bonus Actions). Raw stat dice render only inside the ritual. A pip resource tracker (species/class/slots/feat resources, declared in the data packs) sits under living cards; spent state persists on the roster PC (`pc.gen.res`).
Enforced by: `test/gen.test.js` resources+conversion test; `test/crew-flow.test.js` asserts the ability table + Bonus Actions section on the rendered card.
Affects: gen.js (data + card), styles.css, both checkpoint artifact rounds.

### D-011 — B279 revision directives (the thirteen notes) · 2026-08-05 · DECIDED
Mechanism: Francesco's call (written notes on the shipped B279)
Raw note (abridged): "remove all AI tells such as emoji icons, the way the contextual text of the pages is written" · "the crew generator section in adventure seems not well organized, untidy" · "individual rolls for each score and actually show the dice rolls, as well as the table of options before rolling" · "if we have 3 options, they should have the same weight (1-2, 3-4, 5-6)" · "I should be able to overwrite any rolled decision by clicking on the result" · "origin feats seem lackluster … internal additional choices (ex. magic initiate) should feature an additional roll" · "remove the last words identity element" · "the generator misses a few key class elements choices from level one … (armor, weapons, spells, features like Primal Order etc.)" · "the statblock should look like our monster statblocks … highlight in the text, linked spells and conditions, rollable attacks" · "spells should work like character spells with slots, not 1/LR like monsters, but organized in a tidy list like monsters" · "remove the flagged substitution for kobold text" · "the Long rest … text in the resource section should be clickable to reset" · "a way to also randomize the starting gear aside from the weapons and armor"
Chosen: all thirteen applied as written (equal-weight table spans supersede the weighted 1-3/4-5/6 plausible mapping; last words removed from identity/card/archive; the flag line removed — partially supersedes D-008/D-009 details).
Enforced by: B280 build + updated test floors.
Affects: gen.js, styles.css, tests, the review artifact.

### D-012 — Rolled spells come from the install's uploaded spell library, per class · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion (B280 interview)
Raw note: "All spells uploaded in Monster Forge that match the class"
Options: A full XPHB lists transcribed as static tables / B curated shortlists / C the live reference library filtered by class+level
Chosen: C — `genSpellTables()` builds cantrip/level-1 tables at runtime by intersecting `state.spells` (class-matched via `enSpells()`) with a shipped per-class XPHB index (`GEN_CLASS_SPELLS`); when an install's uploads are too thin to cover the needed rolls, the FULL INDEX is the fallback for that class (not a separate minimal list — the index doubles as both the safety net and the validator's closed domain). The crew share cfg carries the resolved tables so phones (which never load the DM library) roll over the same lists. Rejected A/B — a second spell source that drifts from what the app actually knows (and C gives linked spell names on the card for free).
Enforced by: `test/gen.test.js` ("spell tables: empty library falls back to the full index…").
Affects: gen.js (spell steps, share cfg, ingest), DEVELOPMENT.md crew section.

### D-013 — Equipment kits: hand-drafted, PHB-legal, variable count per class · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion (B280 interview)
Raw note: "More than kits per class, PHB-legal, depending on the class (a fighter has many more kits available than casters for example)"
Options: A two kits per class / B PHB-verbatim gear options only / C variable kit counts by class breadth
Chosen: C — martials carry more kits (Fighter most), casters fewer; every item within class proficiencies; equal-weight table spans; kits presented on the review artifact before locking.
Enforced by: kit-table integrity test (spans cover the die; items legal per class proficiency data).
Affects: gen.js class packages.

### D-014 — Random gear = random pack identity + two sundries rolls · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion (B280 interview)
Raw note: picked "Both"
Options: A custom d20 sundries ×2 / B random PHB pack / C both
Chosen: C — the Gear line rolls its pack (Explorer's/Dungeoneer's/Priest's/Burglar's/Scholar's/Entertainer's, d6) and two distinct sundries from a drafted d20 table (English — the Gear line is mechanics). Table content reviewed on the artifact before locking.
Enforced by: gear-table test (die coverage, distinct sundries).
Affects: gen.js gear step + card Gear line.

### D-008 — Content locks for v1 · 2026-08-05 · DECIDED
Mechanism: handoff spec + interview confirmations (round 4) + stated assumptions accepted in-round
Raw note: (handoff) "rules-legal D&D 2024 level-1 characters (with a flagged 2014 species substitution)"
Locks: ~~2014 MPMM Kobold verbatim as the flagged species substitution~~ **SUPERSEDED → D-011: the flag line is removed from the app; the species pack still carries only 2014 MPMM Kobold mechanics** (no 2024 kobold exists — the substitution is real, just no longer narrated) · all 12 D&D 2024 PHB classes as fixed iconic level-1 packages, now with rolled kits/features/spells on top (D-012–D-014) rather than fully fixed · origin feat d10 = exactly the ten XPHB origin feats, now with comprehensive texts + internal sub-rolls (D-011) · custom background = +2/+1 class-appropriate ASI + rolled feat + rolled class skills · UI/mechanics English · ~~flavor content Italian, drafted flavor tables locked after review~~ **SUPERSEDED → D-009 (tables shelved) → D-011 (last words removed): identity is name + optional quirk/trinket, free-typed by whoever rolls, no language constraint** · defaults 3d6 / Plausible / ASI-on, DM-set per adventure as crew settings.
Enforced by: `test/gen.test.js` legality invariants (HP ≥ 1, attack = mod+PB, DC = 8+PB+mod, ASI +2/+1 legality, all 12 classes reachable).
Affects: generator data tables.

### D-015 — Ritual v3: Forge-style scores grid, real 3D dice, quiet chrome · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (round 1), live walkthrough on the B280 build
Raw note: "The score section is a mess. Instead, display it like we display the stat section in monster forge for example, with less abundant use of accent color. Also, right now the same score is repeated 3 times, keep only one that can also be edited manually. Also, the actual 3d dice roll is missing" + "Drop the whole strip"
Chosen: scores render as the Forge-style six-ability grid; ONE score display per ability, manually editable (editing IS the override); the totals+dice summary strip is deleted; accent color use cut back; ritual rolls fire the app's real 3D dice. Partially supersedes D-011's raw-dice-inline for scores — the roll theater moves from printed dice strings to the 3D roll itself.
Enforced by: gen.js ritual renderer + styles; test keeps per-ability edit → derived-stat cascade.
Affects: gen.js, styles.css, dice3d integration.

### D-016 — Class table: all 12 visible, top-3 span-marked, rest collapsed · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (round 1)
Raw note: "Show all 12, top-3 span marked (the rest are collapsed to reduce space)"
Chosen: the class step lists all twelve classes; the plausible three carry the d6 spans; the other nine sit collapsed behind an expander and are pickable when expanded. Rejected: top-3-only table (hides the pick space), fully expanded 12 (too tall on phones).
Enforced by: gen.js class step renderer.
Affects: gen.js.

### D-017 — Ritual interaction conventions v3 · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (rounds 1-3)
Raw notes: "Keep the labels clean to only the label name, hide the other info behind a small ? tooltip button right after the name." · "Clicking over a completed step should open the section, not only clicking the result" · "Make it an explicit step" (background ASI) · "when a section is closed, the reroll button should collapse to a small ghost dice icon instead of a full button" · "on the dropdown lists (ex. equipment), make the items always numbered so they can be rolled manually" · "The Roll the rest button icon is wrongly sized" · post-add closes to the panel (picked recommended)
Chosen: section labels = bare names with a small ? popover carrying die/method info; whole completed sections are click targets to reopen; no self-resolving steps (ASI waits like the rest); collapsed sections shrink Reroll to an icon-only ghost; every pick dropdown numbers its items so physical dice map to rows; the one-shot button's icon is sized right; "Add to the crew" closes the modal back to the panel.
Enforced by: gen.js ritual renderer + styles; DOM test covers section-reopen-by-header-click and the explicit ASI step.
Affects: gen.js, styles.css, test/crew-flow.test.js.

### D-018 — Generation constraints: cross-source spell dedupe, guaranteed damage cantrip · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (rounds 2-3; dupe observed live — Detect Poison and Disease from both Magic Initiate and the prepared roll)
Raw note: "Reroll cross-source dupes" (picked recommended) + "we need to make sure to always have at least one damage cantrip for full spellcasters"
Chosen: any spell roll rerolls names already granted by another source (feat, legacy, class kit) — a card never lists the same spell twice; cantrip rolls for full casters are constrained so at least one damage cantrip lands. Rejected: RAW-honest dupes (wasted rolls read as bugs).
Enforced by: gen.js engine + test/gen.test.js (dedupe invariant, damage-cantrip invariant over seed batches).
Affects: gen.js, tests.

### D-019 — Card v3: statblock fidelity, chevron panels, merged spellcasting, player tooltips · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (round 3)
Raw note: "the section labels type specs are wrong (ex. Actions) · the dice rolls don't seem to work in the modal · add a chevron aligned to the right with the skills row that shows a section with all skills (even those w/o prof. and their bonuses), collapsed by default · add a chevron also next to gear, and clicking on it shows a menu where you can edit the gear manually (ex. you used or lost something and you need to remove it) · collapse the spellcasting features into one if they share the same ability … · Do not show redundant features (ex. draconic sorcery is already featured in the spellcasting, no need to have it as a trait) · Can we embed spell and condition tooltips even for players?"
Chosen: card section labels match the real statblock type specs; click-to-roll works inside the ritual/card modal; skills row gains a right-aligned chevron opening a collapsed all-skills panel (every skill with its bonus, proficient or not); gear row gains a chevron opening a manual gear editor (remove/add — post-roll state, stored as a per-PC overlay, never in the wire payload); spellcasting groups sharing the spellcasting ability collapse into one entry; traits fully covered by a spellcasting entry are suppressed; phone player cards get spell/condition popovers by shipping a trimmed name→text map in the crew share cfg (texts sanitized at ingestion like all share data).
Enforced by: gen.js (genToMonster + card mount), styles.css, crew share cfg schema, tests.
Affects: gen.js, styles.css, core.js (esc/popovers reuse), DEVELOPMENT.md crew section.

### D-020 — Tracker: dual-recharge resources (X on short rest, all on long) · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (round 3)
Raw note: "Keep as is. Make sure there is also a functioning version for features that recharge X on SR and Y on LR (ex. recharge 1 on short rest and all on long rest, like Rage)"
Chosen: resource declarations may carry a short-rest partial recharge (regain N) beside the long-rest full reset; such rows render both reset affordances.
Enforced by: gen.js resource schema + pip renderer; test covers partial vs full reset.
Affects: gen.js, tests.

### D-021 — The crew dissolves into the party roster · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (round 3)
Raw note: "The species restriction, score style, classes, background and other settings should lie in a dedicated modal that can be opened as settings. The name of the section should changed to be agnostic. In general, this section should collapsed into the party roster, adding a setting button after level up, move the roll a character button replacing add character (but keep the option for adding a regular character in a submenu that can be opened from an arrow after a divider like the encounter FAB button). Generated party members default open the statblock modal instead of their dedicated page, which should include a note section at the bottom."
Chosen: no separate CREW section — on a generator-enabled adventure the party-roster header carries a settings (gear) button after Level Up opening a dedicated crew-settings modal (species, scores, class mode, background ASI, player link); the primary roster action becomes species-agnostic "Roll a character", replacing Add character, as a split button whose divider+arrow submenu keeps "Add a regular character"; generated members open the statblock modal (card + tracker + a notes section at the bottom) instead of the roster detail page. Supersedes D-002's in-detail crew panel layout (the adventure-tied principle stands).
Enforced by: adventures.js/roster.js render paths + gen.js modal; DOM test covers the split button and member-click → statblock modal.
Affects: adventures.js, roster.js, gen.js, styles.css, tests.

### D-022 — Content expansion: more kits everywhere, sundries split into two lists · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion feedback session (round 4)
Raw note: "I think we need more kits, for all classes" + "Increase the number of sundries that can be drafted, if we have enough we can do two different lists for the 2 rolls"
Chosen: every class's kit table grows (martials stay broader than casters per D-013's shape; counts land on clean dice); the sundries pool grows to two distinct d20 lists — roll 1 draws from list A, roll 2 from list B. Supersedes D-013's counts (6/3) and D-014's single shared d20.
Enforced by: kit/gear integrity tests (die coverage, class legality, list disjointness).
Affects: gen.js data packs, tests.

### D-023 — Roll button copy stays species-driven · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, 1 round (B282 follow-up interview)
Raw note: eyeball-pass note "instead of Roll a kobold, remove all hard coded references to kobolds, it needs to work regardless of the selected species"; on the follow-up question picked "Species-driven" over generic.
Chosen: the roster's primary roll button reads the crew's selected species ("Roll a kobold" while the species is kobold, "Roll a goblin" if it changes) — the intent of the original note was no hardcoded kobold STRINGS (fixed in B282: feat/cantrip texts, legacy trait name, phone screens), not generic copy. Supersedes the species-agnostic "Roll a character" label clause inside D-021 (everything else in D-021 stands). Generic "Roll a character" is rejected — don't re-propose.
Enforced by: roster.js split button reading GEN_SPECIES[a.crew.sp].label; B282 purged the hardcoded strings.
Affects: roster.js, gen.js, CHANGELOG B282.

> **D-023 amended 2026-08-09 (D-031):** species-driven copy applies to LOCKED-species crews. When
> the crew's species rides the ritual (D-031 ritual mode) the button reads "Roll a character" —
> the user explicitly reversed the generic-copy rejection for that mode only.

### D-024 — Spell rolls: two tables per class, Damaging and All · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, v4 feedback round 1
Raw note: "divide the cantrips into three tables: all cantrips and damaging cantrips. By default, the first roll with spellcasting is on the damaging cantrips table and the rest on the all cantrips, but you should be able to choose the table. The same should be done for prepared spells."
Chosen: per class TWO roll tables — Damaging (entries with a damage line) and All — for cantrips AND prepared level-1 spells. The first roll of each step defaults to Damaging, later rolls to All; every roll slot carries a table toggle. (The "three" in the note resolved to two on the follow-up — Utility was rejected as redundant.) Subsumes D-018's guaranteed-damage-cantrip invariant for rolled casters.
Enforced by: gen.js tables + ritual UI; tests.
Affects: gen.js, tests.

### D-025 — Familiars roll, and land as a full appended statblock · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, v4 feedback round 1 (user free-text upgrade over both offered options)
Raw note: "pact of the chain should roll the familiar (or any time the find familiar spell is selected as well)" + "Append the full familiar or summon statblock after the player statblock"
Chosen: Pact of the Chain rolls a d8 over the 2024 special forms; any character knowing Find Familiar rolls the standard beast forms; the familiar's FULL statblock renders after the PC card. The blocks ship as a compact data pack in gen.js so phones stay self-sufficient — the wire stays payload-only (D-007).
Enforced by: gen.js familiar pack + card composer; tests.
Affects: gen.js, styles.css, tests.

### D-026 — Kit weapon standard: daggers universal, casters dagger + light crossbow · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, v4 feedback round 1
Raw note: "make sure kits do not feature some weapons too frequently compared to others unless the golden standard (ex. daggers)" + "Casters default to dagger and light crossbows"
Chosen: dagger stays the universal sidearm; caster kits standardize on dagger + light crossbow as the ranged default (slings thinned); martial throwers (handaxe/javelin) stay the martial standard; the rest spread more evenly.
Enforced by: gen.js kit data; kit integrity tests.
Affects: gen.js.

### D-027 — Pack contents open as click popovers, packs unpack in the gear editor · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, v4 feedback round 1
Raw note: "hovering on the packs should show a tooltip with the content of the pack. The full gear list should have the packs unpacked by items"
Chosen: pack names on the Gear line are reflink-style CLICK popovers (site convention; hover does not exist on phones — accepted over the hover phrasing); the gear editor expands a pack into its component item chips so single items can be removed.
Enforced by: gen.js pack-contents data + card bind; styles.css.
Affects: gen.js, styles.css.

### D-028 — The wings table becomes the Draconic Boon table · 2026-08-05 · DECIDED
Mechanism: AskUserQuestion, v4 feedback round 2 (joint design per the note "let's think on them together")
Raw note: "the wings section should have other buffs and boons ... (one could be the legacy pack tactics feature for example)" + pool picks "Pack Tactics, Grovel Cower and Beg, Draconic Resistance" + "Other options could be: dragon's breath from dragonborn locked to a rolled dmg type, medium size + powerful build from goliath, a 1/LR dragon fear effect, a tail that can grasp and grapple"
Chosen: one d20 roll — 1-12 nothing, 13-19 one boon each (ascending: grasping tail, Draconic Resistance w/ rolled chromatic type, Grovel Cower and Beg, Medium size + Powerful Build, Dragon Fear 1/LR, Dragon's Breath w/ rolled type, Pack Tactics at 19), natural 20 = functional wings. Extra-sorcerer-cantrip was offered and NOT picked — out. Old wings payload values (true/false) stay valid.
Enforced by: gen.js kobold species pack + deriveGenChar boon handling; tests.
Affects: gen.js, tests.

> **D-028 amended 2026-08-05 (B284, user note):** Dragon Fear is a BONUS ACTION against ONE
> creature (not an action against a group); Grasping Tail additionally manipulates objects as a
> Bonus Action (hadozee dexterous-feet model) beside its Grapple. Table shape and the rest of the
> pool unchanged.

### D-030 — Species generalization is hybrid: curated XPHB packs plus a races.json import path · 2026-08-09 · DECIDED
Mechanism: AskUserQuestion, species-generalization interview round 1 (re-opens D-001's v1 scope at the user's initiative)
Raw note: ". Let's update the kobold generator so that it allows for every species. If possible, it (and all other elements in the generator) should work with any content uploaded by the DM in monster forge." → picked "Hybrid (Recommended)"
Options: A hybrid (curated 10 XPHB packs + races.json upload kind) / B curated packs only / C parse uploads only
Chosen: A — hand-curated packs for the ten XPHB 2024 species (plus the existing 2014 MPMM Kobold) ship in gen.js at kobold-pack depth, AND a new "species" upload kind parses 5etools races.json so any uploaded species becomes rollable. Curated gives full ritual quality where it matters most; uploads give unlimited coverage. Rejected B — the generator would only ever know transcribed species. Rejected C — XPHB quality capped by parsing; a fresh install would have almost nothing to roll. D-001's engine architecture (species = one data object, no kobold literals) is what makes this feasible; its kobold-only CONTENT scope is superseded, its architecture stands.
Enforced by: gen.js species packs + parser; pack-schema test extended over every shipped pack; parser floor over mirror-sourced fixtures.
Affects: gen.js, parsers.js, app.js (upload kind), DEVELOPMENT.md, tests.

### D-031 — Crew species mode: DM toggles locked-species vs species-as-ritual-step · 2026-08-09 · DECIDED
Mechanism: AskUserQuestion, interview round 2 (user free-text over the offered options)
Raw note: "Among the crew settings, the DM can choose whether to lock it to one specific species or have it as a part of the ritual"
Options offered: A one species per crew (as today) / B species is a ritual step / C DM-picked shortlist
Chosen: BOTH A and B behind a crew-settings toggle — locked mode keeps today's model (DM picks the species, species-driven button copy per D-023); ritual mode adds a species step to the ritual, rolled/picked over ALL ENABLED species (curated + uploaded, pool controlled by the existing per-source library enable toggles — no new shortlist surface, which covers C's use case for free).
Button copy in ritual mode: **"Roll a character"** — the user consciously walked back D-023's rejection for this mode ("the mixed-mode context changes your mind" option picked). D-023 amended: species-driven copy WHEN LOCKED, "Roll a character" when species rides the ritual. Locked mode unchanged.
Enforced by: gen.js crew settings + ritual step; roster.js button copy branch; wire cfg carries the mode + the species pack(s) in play.
Affects: gen.js, roster.js, DECISIONS.md D-023 (amended in place below), tests.

### D-032 — Parsed species: detect choices into pick-or-roll tables, degrade to prose, use as-is · 2026-08-09 · DECIDED
Mechanism: AskUserQuestion, interview round 2
Raw note: "Detect + tables (Recommended)" + "Use as-is. We'll test some species from 5etools to make sure they parse well"
Chosen: the races.json parser extracts structured basics (size, speed, darkvision, languages) always; where the JSON structure marks a player choice (lineage/ancestry tables, skill choices) it synthesizes a real pick-or-roll table like the kobold Legacy table; anything it cannot structure lands as a VERBATIM PROSE TRAIT on the card — never wrong mechanics, just less structured. No pack editor: parsed species appear directly in the picker; quality is validated by testing real 5etools species together. Rejected: pick-only lists (breaks D-004 for uploaded species); prose-only (choices sit unresolved); the pack editor (a whole new surface pre-playtest).
Enforced by: parser floor tests over mirror fixtures (basics exact, detected tables legal, undetected choices present as prose).
Affects: parsers.js (or gen.js parse layer), tests.

### D-033 — Feats read uploads via the D-012 index-intersect pattern; items and classes stay shipped · 2026-08-09 · DECIDED
Mechanism: AskUserQuestion, interview round 3 (multi-select: only Feats picked)
Raw note: picked "Feats (Recommended)" only
Chosen: a feats.json upload kind; the origin-feat d10 becomes uploads ∩ a shipped index (the index doubles as fallback and validation domain, exactly D-012). Rejected items/equipment — kits are curated loadouts, not parseable from an item list; sundry-flavor gain doesn't pay for the parser. Rejected class features — class JSON is the most prose-heavy and choice-entangled content of all; the 12 shipped class packages stay the rules floor. Don't re-propose either without new evidence.
Enforced by: app.js upload kind + gen.js feat table resolution; test mirrors the D-012 fallback floor.
Affects: app.js, parsers.js, gen.js, tests.

### D-034 — Ritual steps group by macro category; species resolves with everything it decides · 2026-08-09 · DECIDED
Mechanism: Francesco's call (written note on the B288-B290 build)
Raw note: "after selecting species, resolve all elements related to species. In general, group micro choices by their macro category so they resolve together."
Chosen: `genStepOrder` groups steps by the category that owns them — Species (the species step + ALL its tables, which now lead the ritual instead of trailing at the end), Ability scores, Class (+ the background ASI that depends on it), Origin feats (feat, feat2), Class training (skills, feature), Magic (cantrips, spells, familiar), Gear (kit + pack + sundries, previously split across the ritual), Identity. Dependencies still order the steps INSIDE a group (the class default needs the scores; gated kits need the feature; the familiar needs the spells).
Consequence handled: species tables now resolve BEFORE the class steps, so the class skill roll must dodge species-granted skills (`genRollStep("skills")` passes `genOwnedSkillNames`) — previously the species table did the dodging because it went last. The backwards dedupe (`genSpDedupe`) stays for the re-pick path.
Enforced by: `test/gen.test.js` step-grouping floor (leading species group locked/ritual, contiguous gear group, 40-seed no-duplicate-skill sweep); `test/crew-flow.test.js` walks the species group first.
Affects: gen.js, tests.
Open: whether the ritual should also show a VISIBLE macro-category header per group (a core-surface visual change — Francesco's convention is mockup + AskUserQuestion, not invented in passing).

### D-035 — Species boons are an optional extra behind a crew setting · 2026-08-09 · DECIDED
Mechanism: Francesco's call (written note)
Raw note: "the kobold 'boon' and in general the boon option should be a toggle in the settings, possibly customizable (we'll table this for later)"
Chosen: a species table may be flagged `boon:true` — an optional extra on top of the species' actual rules, not part of it. Crew settings gains "Species boons: Rolled / Off" (default Rolled = today's behavior); off drops boon tables from the ritual, the payload and the derivation. Validation treats boon tables as OPTIONAL both ways, so a phone on a stale cfg is never rejected over one absent extra and old payloads stay valid; core species tables (lineages, ancestries, legacies, Kobold Legacy) stay mandatory. The kobold Draconic Boon table (D-028) is the only flagged table today; the parser flags none (it can't tell).
Enforced by: gen.js (`genSpTablesOf`, draft `boons`, optional-boon validation), core.js normalizeAdv default, crew share cfg `boons`; `test/gen.test.js` boons-toggle floor.
Affects: gen.js, core.js, tests.
OPEN (tabled by Francesco): making the boon table itself CUSTOMIZABLE — DM-edited entries, or per-boon enable. Not designed; ask before building. **Un-tabled 2026-08-09 → scheduled as TASKS G4 (D-039): the design round opens the next session.**

### D-036 — The background ASI defaults to the assignment that buys modifiers · 2026-08-09 · DECIDED
Mechanism: Francesco's call (written note)
Raw note: "the BG ability scores should be assigned in a way to tries to make the scores even (a +1 in CON with a 14 CON gives you nothing, while a +1 in DEX with 13 DEX gives you a +1 mod to that score)"
Chosen: `genAsiDefault(d)` — the +2 stays on the class primary (it crosses exactly one modifier step at any parity, so it can't be wasted); the +1 goes to the best ODD-scored ability among the class secondary, Constitution and Dexterity (in that preference order), falling back to the class secondary when nothing is odd. Suggestion only — the ASI step stays explicit and fully overridable (D-017), and the label now reads "Suggested" rather than "class default".
Enforced by: gen.js `genAsiDefault` (consumed by the roll, the editor hint and the step info text); `test/gen.test.js` ASI-default floor over odd/even fixtures.
Affects: gen.js, tests.

### D-037 — The class feature option decides the kit table: `needs` unlocks, `fits` narrows · 2026-08-09 · DECIDED
Mechanism: Francesco's note + AskUserQuestion (three scoping calls)
Raw note: "currently, there is no tie between fighting styles and kits when a fighter is rolled. Instead, one solution could be to roll the fighting style and then have a smaller selection of kits that match that fighting style."
Chosen: a kit answers to its class feature option twice. `needs:"<hook>"` UNLOCKS a kit the option's training makes legal (the existing Pact-of-the-Blade path); the option's `fits` array NARROWS the table to kits whose `tags` match the tactic it rolled. One definition — `genKitIdxFor(K,featVal)` — is read by the roll, the pick, `genStepDone` and `validateGenPayload`, so the ritual, the DM app and the wire agree on which kits a character could have had. No reordering was needed: D-034 already resolves the feature inside Class training, before the gear group. Changing the option DROPS a kit it no longer allows (`genDropUnfitKit`) rather than leaving a stale line above the new table.
Scope settled with Francesco: (1) only styles with a real gear consequence narrow — Defense, Interception and Unarmed Fighting keep the whole table because every fighter kit is armored and neither reaction cares which weapon it is; inventing a tie there would be noise. Blind Fighting narrows to melee kits. (2) The fighter kit table grows 8 → 12 (Twin shortswords, Twin handaxes, Heavy crossbow, Greataxe) because a pure filter left Two-Weapon Fighting with a table of ONE; every style now rolls on ≥3 kits and every span die stays clean. (3) The same gate closes the Cleric's ungated Warhammer kit (it carried a prose note saying it needed Protector's Martial training) and gives the Druid's Warden order a martial kit — both `needs:"martialTrained"`.
Rejected: narrowing every style, including the three with no mechanical gear tie (three of the ten ties would be invented rather than derived — don't re-propose without a rules reason); keeping the 8-kit table and accepting a one-row Two-Weapon table; deferring cleric/druid to a later batch.
Also settled here: Dueling's "+2 damage (counted on the main line)" was false — the `dueling` hook had no consumer and the composer's attack entries have no flat-damage field. Claim and dead hook removed. Counting it properly needs an entry-schema change in the Forge; NOT done, and it is the only Fighting Style number the card doesn't carry (Archery's `rangedAtk` and Defense's `acArmor` both count).
Enforced by: gen.js (`genKitIdxFor`/`genKitIdx`/`genDropUnfitKit`, kit `tags`, option `fits`, the validator's equip check); `test/gen.test.js` D-037 floor (fits-tag integrity, ≥3 kits per style, 40 seeded fighters, cleric/druid unlock deltas, tampered-payload rejection, reopen-on-change).
Affects: gen.js, tests.

### D-040 — Kit review: tags on every kit, armor variety, a Dex fallback in every Strength kit, background gold in the purse · 2026-08-09 · DECIDED
Mechanism: Francesco's review notes on the B293-B295 kit table (the D-013 content review)
Raw notes: "in general, armor options are too repeated within the class kits, there should be more variance" · "casters should have more variety and details for their foci" · "add the tags column to all kits for ease of reference and for futureproofing (ex a species gets a fighting style, and so protector/warden works the same way as fighting styles)" · "we should consider that class starting budget should be added to background budget" · "barbarian aren't always unarmored, some kits should reflect their armor options as well (exclude heavy armor which doesn't work with rage). This also includes kits with one weapon and shield and not only two-handed weapons" · "If you give them a STR option, always add also a finesse or ranged option that could help if STR isn't high enough (usually dex is preferred)" · "cleric should have more protector variants" · "why do all kits for druid feature the herbalism kit? The druidic focus should be detailed with what it is" · "monk should have more kits" · "the blowgun ranger should have a stronger melee option" · "remove the light hammer option from rogue, all rogue kits should have finesse or ranged weapons" · "add one more blade pact gated option"
Chosen: (1) **Tags are half authored, half derived.** A kit declares its weapon-shape tags (`onehand`/`twohand`/`dual`/`ranged`/`thrown`/`finesse`); `genKitTags()` appends the defence tags read off the armor recipe (`light`/`medium`/`heavy`, `shield`, `unarmored`, via a new `w:` on GEN_AC). Deriving the defence half means it can never drift from the recipe, and it is what lets a future `fits` express an armor tie — the futureproofing Francesco asked for: a species-granted Fighting Style, or Protector/Warden moving from `needs` to `fits`, needs no new vocabulary. (2) Armor spreads across every recipe a class is trained in (Fighter 15 of 21 kits distinct, Ranger one per kit); classes with no armor training stay at one, which is a rules fact, not a gap. (3) **Every kit containing a Strength weapon must also carry a Dex-usable one** — test-enforced across all 109 kits. (4) Barbarians reach Light and Medium armor (never Heavy: Rage switches off) and gain shield-and-one-weapon kits. (5) Every caster kit names its specific focus, every cleric kit its holy symbol, every druid kit its Druidic Focus; the Herbalism Kit rides only the kits built around it; bard kits each carry a different real XPHB instrument. (6) Rogue kits are Finesse-or-Ranged throughout (Sneak Attack can't use a Strength weapon) — test-enforced. (7) **The purse is class gold + the background's 50 GP** + the crew's extra: a 2024 character takes both alternatives, and all sixteen XPHB backgrounds offer exactly 50.
Consequence handled: the wire validator no longer re-sums prices, it REPLAYS the ritual's availability chain (`genKitIdx` → `genPacksAvail` → `genSundriesAvail`) against a scratch draft. The old sum contradicted the D-038 "a filtered table never empties" fallback — a druid whose kit emptied the purse legitimately rolled the cheapest pack, and the total then rejected that legal character. The chain is the single definition of what a roll could produce, so ritual and validator cannot drift, and a rejection now names the offending step rather than a generic `gold`.
Rejected: authoring the defence tags by hand alongside the shape tags (two sources of truth for one fact); giving Monk/Sorcerer/Wizard armor variety (they have no armor training — the "repetition" there is the rules); keeping the naive price sum and loosening the fallback instead.
Enforced by: gen.js (`genKitTags`, `w:` on GEN_AC, `GEN_BG_GP`, the replayed validator chain); `test/gen.test.js` D-040 floor (tags present and in-vocabulary, Dex-fallback rule, armor-spread rule, no Heavy on a barbarian, no Strength on a rogue).
Affects: gen.js, tests.
Open: leftover coin is now large for cheap-kit casters (a bard can walk away with ~108 GP of a 140 GP purse). Rules-true — XPHB's alternative is literally "take the gold instead" — but worth a look in play before deciding whether it wants a cap.

### D-039 — Next-session slate: reroll button, identity summary screen, quirk/trinket tables, boons design · 2026-08-09 · DECIDED (direction) / OPEN (details, gated)
Mechanism: Francesco's four written notes on the B293–B295 build; plan recorded in TASKS.md ("Side quest — crew generator follow-ups"), implementation deferred to the next session by his call.
Raw notes: "when a character is fully rolled, a reroll option should appear in place of roll the rest." · "We could move the identity elements to a successive step of the modal before the view the card, that sums up the main information of the character and you have to enter at least the name, and the other info if you want." · "We'll also have a to create a huge quirks and trinkets table, so that players can roll those as well or enter manually. Ideally, we should draw them from established resources or appreciated online lists." · "Lastly, let's work on the boons changes I postponed earlier."
Direction locked: (G1) a finished ritual's footer offers a full Reroll in place of "Roll the rest"; (G2) identity moves OUT of the step list to a closing summary screen — main facts recapped, name required, everything else optional — between the ritual and the card; (G3) quirk and trinket become rollable from large tables (manual entry stays), which PARTIALLY SUPERSEDES the identity-is-typed-only stance that D-009/D-011 settled — quirk/trinket now roll-or-type, the name stays typed; (G4) the D-035 tabled boons-customization item is un-tabled and gets its design round.
Open, each behind its gate (don't build past them): G2 is a core-surface visual — mockup + AskUserQuestion round before code; G3 needs a sourcing round — candidate lists presented WITH license status before any content is authored (tables enter the repo; provenance is Francesco's call, not an assumption); G4 needs the per-boon-enable vs DM-edited-entries design round D-035 anticipated; G1's one detail (does typed identity survive the reroll) settles at build time.
Enforced by: TASKS.md G1–G4 task lines; nothing in code yet.
Affects: gen.js, core.js, styles.css, tests (next session).

### D-038 — The complete XPHB armory, priced, behind an optional per-class starting-gold budget · 2026-08-09 · DECIDED
Mechanism: Francesco's three notes + AskUserQuestion (four scoping calls)
Raw note: "when lists have a range of 1 in dice results, it should show only the number (ex. 3), not the range (ex. 3-3)" · "the armor options should be more varied, and we should make sure all weapons are featured" · "We should add an option in the settings to restrict GP budgeting or randomize everything. With restricted GP budget, it would be great if we could find a way to make kits, packs and random items all fit into the starting gold (50 gp if I'm not mistaken). And we could allow to increase starting goal as well."
Chosen: (1) `genSpanText` renders a one-face span as a bare number everywhere. (2) The whole XPHB weapon table is modelled, firearms included, and all 7 missing armors are added; every weapon and armor recipe must appear in at least one kit (test-enforced). (3) A crew setting switches between "Roll anything" (today's behavior, the default) and "Class budget": every kit, pack and sundry carries its XPHB list price, the ceiling is the class's OWN starting gold — the "or N GP" alternative each class prints — plus a crew-wide "Extra gold" the DM can raise, tables filter to what the purse still covers in ritual order, and the remainder prints on the gear line as whole gold.
Facts that shaped it: 50 GP is the Druid/Monk/Sorcerer figure, NOT universal (Fighter is 155) — a flat 50 would price a fighter out of Chain Mail and a wizard out of its own spellbook. XPHB packages are not priced to their gold alternative either (the wizard's runs ~101 against 55), so class-mandatory gear — spellbook, holy symbol, spellcasting focus — is exempt from the count. All prices and the twelve gold figures were read out of the local 5etools mirror, not written from memory.
Rejected: narrowing the weapon list to the "sensible" ones (Francesco chose all 12 — the price gate is what keeps a 500 GP musket off a level-1 sheet, so no editorial cut is needed); adding only the affordable armors (same reasoning); a single flat budget for the whole crew; twelve individually-editable per-class figures (one dial that shifts all twelve keeps the classes from flattening into each other); "roll freely then show the bill" (a budget that doesn't stop a 400 GP breastplate is a note, not a rule); dropping the leftover instead of paying it out as coin.
Boundary: the DM's cfg is the authority — `validateGenPayload(raw,cfg)` re-prices the gear group and rejects an overspend with `err:"gold"`, so a phone can't claim the budget was off. No cfg means the payload's own set is used (the phone's self-check); `genIngestPayload` always passes the real one. A filtered table never empties (cheapest option survives), and a step whose price stops fitting is dropped rather than left showing an unpayable total.
Enforced by: gen.js (`genSpanText`/`genSpanDie`, `gp` on every GEN_W/GEN_AC/class, `GEN_PACK_GP`/`GEN_SUNDRY_GP`, `genBudget`/`genKitCost`/`genPurseAt`/`genCoin`/`genAfford`/`genDropUnaffordable`, the validator's gold check), core.js normalizeAdv defaults, the crew share cfg; `test/gen.test.js` armory-coverage and budget floors.
Affects: gen.js, core.js, tests.
~~Open: armor Stealth disadvantage is modelled in the data (`stealth:true`) but not yet surfaced on the card.~~ **Resolved B295:** `deriveGenChar` exports `acStealth` from the POST-swap recipe (a Str-gate demotion sheds the penalty with the armor) and the card's AC note reads "…; Disadvantage on Stealth". Test-locked both ways.

### D-029 — Players track HP and keep notes on the crew card; HP reports, notes don't · 2026-08-06 · DECIDED
Mechanism: AskUserQuestion, B286 scoping round
Raw note: "let the players keep notes and edit HP also on their character pages"
Chosen: the crew phone card (`?crew=<id>`) grows an HP row (−/+, tap-to-type current + temporary, "full"; damage eats temporary HP first) and a Notes box. HP is per-device like the pips AND reported to the DM — a `{cur,tmp,at}` leaf written to the device's own `crew/<pid>/hp`, clamped at ingestion, applied to the roster PC and any live combat instance, idempotent by stamp so a stale report never overwrites a DM edit. Notes stay in localStorage: player free text never goes on the wire. The DM's copy of the row (statblock modal) is READ-ONLY — their tracker still owns combat HP.
Rejected: notes on the wire too (a new hostile free-text surface for no table gain); everything per-device (the DM's tracker would keep lying); the player-mode share sheet as the surface (the crew card is where his players actually live — that surface stays as it is).
Enforced by: gen.js (genHpTrackerHTML/crewPushHp/crewCleanHp/crewApplyHp), combat.js (crew poll kept alive while the fight is on screen), test/crew-flow.test.js.
Affects: gen.js, combat.js, styles.css, tests.
