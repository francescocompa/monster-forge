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
