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
