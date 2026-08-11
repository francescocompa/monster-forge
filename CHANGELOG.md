# Changelog

Monster Forge — D&D 2024 homebrew monster & encounter builder. No-build static
site (`index.html` + `styles.css` + the shared scripts, `data.js` … `app.js`).
Newest batches first.

## Batch 305b — Docs: /handoff pass — G7 and G9 bodies archived, DEVELOPMENT catches up

No code. Session close-out after B304/B305.
- `TASKS.md`: the G7 and G9 bodies move to `ARCHIVE.md` behind outcome-line stubs; the side-quest
  header gets a status line (5 of 6, G8 remains); the stale `origin/main = b5d29f6` claim in the
  standing line is replaced with a dated ⚑ that B304/B305 are committed but unpushed.
- `DEVELOPMENT.md` catches up with D-042 as amended: the three assembly rules (seam alternation, the
  per-profile repair policy, "a stem is only worth keeping if every name it can build is ours"), the
  tiefling virtue branch, the second-person quirk voice and why the render frame forces it, and the
  exactly-20 trinket floor with its d20 reason.
- Handoff memory restamped to `8b72bb0`; two new gotchas recorded — a deduplicated sample is a
  biased sample (it nearly produced a false finding in B304), and a procedural assembler can land on
  somebody else's name.

## Batch 305 — The quirk voice goes second person, and G7 closes (D-042 amended)

His call, in four words: *"use you instead of it."*

- **All 100 quirks are now whole second-person sentences.** 33 of them said "it"/"its" — written
  when the crew was kobolds only, so after B288 the list was calling a human paladin "it".
- **A pronoun swap alone would not have worked.** The card renders `<b>Quirk:</b> <text>`, and the
  rows were headless third person ("Counts everything out loud, badly"), whose implied subject is
  the character. Dropping "you" into that disagrees with the row's own verb ("Names every weapon you
  pick up"). So every row became a sentence whose subject is the reader: "You count everything out
  loud, badly." That also matches both trinket lists, which already say "you"/"your".
- The only "it" left in the list is an **object** pronoun — "then follow it", "then regret it" —
  which is correct English and stays. The test allows exactly those two shapes and nothing else.
- Floor added: any row that does not start "You ", or that calls the character "it"/"its"/"itself",
  fails `test/gen.test.js`. Voices drift silently otherwise.
- 137 tests green; verified in the live preview through the real card composer — a generated human
  renders "Quirk: You always take the smallest portion, loudly".
- **G7 is closed** on his re-read: *"G7 looks ok for now."* The crew side quest is down to G8.

## Batch 304 — G7 content pass: the mid stops padding, nine species get real phonology, and the lists get pruned (D-042 amended)

His G7 read-through, executed. The headline finding was his: **"mid is the weakest part of the
generator so far."** B303 made a clashing seam take a middle piece unconditionally, which is right
for the species whose names should FLOW and wrong for the ones whose names should read as WORDS —
the padding is exactly what turned Merric into Merolins and Meepo into Snivurutix.

- **Seam policy, per profile.** `seam:"repick"` draws a different SUFFIX on a clash instead of
  padding the join; `midRate` sets the chance of a mid on an already-clean seam (default 0.30, the
  word-like species run 0.03-0.22). The mid survives as the last-resort repair, so B303's invariant
  — every clashing pair is repairable — still holds for every profile, guard test unchanged.
  Nine profiles take the new policy. **Elf and aasimar are untouched: he signed both off.**
- **Kobold** was "too harsh, not enough funny, clumsy or weird". The canon kobolds anyone remembers
  are Meepo, Deekin and Spurt — rarely two syllables. Mean length 7.9 → 6.0: Blipit, Squibo, Gnibee,
  Meepup, Plopub.
- **Dragonborn**: the Z is gone (he counted them), and length is down. Draconic canon barely uses it
  and leans on aspirated stops and -ar/-ash/-inn/-aar instead: Tarhath, Krivar, Medrax, Rhogash.
- **Dwarf** — "something off, compare it to established dwarven names". Measured against the
  Dvergatal, the Old Norse dwarf-catalogue in Völuspá that Tolkien mined for The Hobbit. What was
  off is now nameable: the `-muth` suffix and the `oro`/`ara` mids gave dwarves a rolling, almost
  soft cadence (Baroromuth, Torkorodur). Both gone; hard stops and -inn/-i/-ur/-nir/-orn in.
- **Goliath** — "not enough variety, research languages with similar sounds". The answer was better
  than a lookalike: **Gol-Kaa is documented as having exactly thirteen phonetic elements** (a e g i
  k l m n o p u th v). The old profile spent most of its parts OUTSIDE that inventory (r, z, d, s,
  b, h, w, x), which is precisely why it read generic. Rebuilt inside the thirteen — Eglekai,
  Muthela, Pethume, Kuopai — and the tight inventory is what buys the variety back.
- **Halfling and gnome** both "mashed words". Halfling names are rustic ENGLISH diminutives (Alton,
  Merric, Osborn, Roscoe, Wellby) and the gnome joke is a bouncy WORD (Gimble, Zook, Boddynock), so
  both run the mid near zero: Roscin, Cadard, Hildie, Alton / Fennick, Gimbock, Seebo, Nackix.
- **Human** — "use more existing names and name parts as bases". So the parts ARE the real ones:
  Germanic dithematic elements, prototheme + deuterotheme, the system every medieval European name
  was actually built from. Eadette, Jorard, Nellald, Cuthedon, Berard.
- **Orc** — "often too long now, repeated sounds". It had settled into a -ga-thak formula at three
  syllables. Tolkien's and Warhammer's orcs are both one-or-two and done: Drubash, Zulurk, Grashug.
- **Tiefling** now does BOTH halves of the D&D convention, his call: an infernal name (Greek-shaped,
  -os/-on/-ai and -a/-eis/-aia) or a **virtue name**, one word chosen as a statement of intent and
  not required to be a virtue. Roughly a third carry one; the forty words are ours, not the PHB's.
- **A guard test, and it earned itself twice.** The dwarf parts are public-domain Old Norse and the
  orc parts are phonology, both legitimate — but an ASSEMBLY can still land on a name a reader
  recognises. The live preview rolled **Gandolf** (Gand+olf), and the exhaustive check then caught
  **Durin** (Dur+in). Both stems are gone. A stem is only worth keeping if every name it can build
  is ours.
- **Quirks:** the five negation pairs collapse to one each (he asked), plus ten pruned for being
  thin or for crowding a cluster — three sleep quirks, three repeat-speech, three musical, and the
  record-keeping group down from 16 of 100 to 10. Fifteen new entries, still exactly d100.
- **Trinkets:** six of twenty replaced against the rule he set — every row must hint at a PAST
  without dating it, show a QUIRK of the owner, or plant a quiet HOOK. Out: "two dungeons back" and
  "a room you have never entered" (a fresh level-1 character has neither), and the candle stub
  burned at both ends (an object with an adjective, doing none of the three jobs). The list stays at
  exactly 20 and the test now pins that — `genDieFor` gives 20 a clean d20 and 21+ falls to
  "d100 (reroll over N)".
- Floors: the name test now also pins mean length per seam policy, the virtue-name share, and the
  blocklist. 137 tests green, verified live end to end (eleven species, three characters composed
  through the real card composer, wire validation green).
- **Still open, deliberately: the quirk pronoun.** 33 of the 100 say "it" — written when the crew
  was kobolds only, and now describing a human paladin. He did not answer that one, so nothing was
  changed and the new entries match the existing voice.

## Batch 303 — G7 (part): names get a seam rule, and the parts collection grows to feed it (D-042 amended)
Sampling the name profiles for G7's review turned up a real defect, not a taste one.
- **The defect**: the middle piece was a flat 45% coin flip, so half the time `pre` was glued
  straight onto `suf` — Vorptch, Skitp, Gnashk, Ordnrik, and the entire Human column (Aldrdon,
  Garteic, Elmsel). An exhaustive audit put the clashing-seam rate at **33-66% per profile**.
- **The rule**: where pre meets suf the sound must ALTERNATE. Two consonants collide, two vowels
  smear, a repeated 2-gram stutters (Thur+urr) — in all three the middle piece is now REQUIRED
  rather than optional. Where the seam is already clean it stays a flourish, dropped from 45% to
  **30%**: a forced repair fires far more often, and without that reduction every name grew a
  syllable and the short punchy ones stopped appearing.
- **The first cut fixed the clash and introduced a stutter** — Thurururr, Pavakaka, Lugagagar —
  because a repair that echoes its own neighbours reads worse than the clash it replaced.
  `genNameEchoes` drops any mid that repeats the tail of `pre` or the head of `suf`, whole or in
  its first/last two letters.
- **The parts collection grew because the rule needs material.** A mid only repairs a seam if it
  starts opposite to pre's last sound and ends opposite to suf's first, which sorts mids into four
  families. The shipped profiles carried **two of the four**: no profile had a single
  consonant-ending mid, so no vowel-vowel seam could be repaired (the elf had 54 such pairs), and
  the two echo-repairing families were nearly empty. Every profile now carries all four, with
  wider `pre`/`suf` lists to match.
- **Result: 0 class clashes and 0 stutters across all 21,505 reachable combinations**, and the pool
  roughly doubled — ~1,240 distinct names per species against ~530 before. Kobolds read as kobolds
  (Snivizz, Trikup), gnomes as gnomes (Murrelobble, Nackizzle), dwarves as dwarves (Kragodin,
  Brogokar).
- New floor in `test/gen.test.js` pins both halves: the CONTENT (every profile carries every mid
  family; no clashing pair is unrepairable) and the RULE (every mid the chooser offers alternates at
  both joins). **137 tests green**, verified live on the summary screen, zero console errors.
- This is the mechanical half of G7. The list content — quirks, the 20 extra trinkets, and whether
  each species sounds right — is still Francesco's read-through.

## Batch 302 — G9: the beyond-level-1 spike, plus a domination sweep over the 109 kits
No app code. A written spike and one mechanical check.
- **`GEN_LEVELS.md`** — the G9 feasibility memo. Measured against the local 5etools mirror and gen.js:
  **67 class features across levels 2-5**, and **48 XPHB subclasses carrying 162 features at levels
  3-5**. The cliff is level 3, because 2024 puts the subclass there for every class, and it is a step
  rather than a slope: everything before it is arithmetic, everything from it is a second content
  library the size of the species arc times four.
- **On the parser question**: `class.json` condenses for prose and for progressions — `classFeatures`
  is a flat `Name|Class|Source|Level` list so filtering by level is trivial, and `classTableGroups`
  carries slots, cantrips known and Sneak Attack dice as machine-readable rows indexed by level. It
  does NOT condense for the features the card must COMPUTE (Extra Attack, Sneak Attack scaling, Wild
  Shape), which need a progression-aware successor to the species `fx` vocabulary, nor for choices
  that cascade into later choices' domains. Prose and numbers are cheap; a runnable statblock is not.
- **The wire is the easy part** (~1 batch): payload `v:3` with a `lvl` field, every closed domain in
  `validateGenPayload` becomes level-indexed, and the crew cfg gains a level with the DM's cfg still
  the authority. **Nothing new crosses D-007.**
- Nine level-1 assumptions catalogued in the memo, of which only three (`pb=2`, `genHdMax()`,
  the meta line) are one-line changes.
- **A flaky test found and fixed** (`test/crew-flow.test.js`, the D-011 override test). `data-gkopt`
  is `String(value)` while the rolled step value is a number, so `x.dataset.gkopt!==before` was
  ALWAYS true: `.find` silently returned row 1, and the test no-oped whenever the roll had landed
  there — a ~1-in-3 flake that randomly blocked the commit hook. Stringified. Ten consecutive clean
  suite runs after the fix. **The fix's first attempt re-broke the file the documented way**: the
  test body is a template literal, and backticks inside a comment terminate it (the gotcha is in the
  memory and now in the comment itself, in capitals).
- **Domination sweep over all 109 kits** (same armor recipe, same gate, weapon multiset containment):
  the only hit is Wizard's Traveling scholar under Cloistered adept, and it is a false positive — the
  scholar trades a dagger for Ink and Quill and a separate staff focus, which a weapon-only
  comparison can't see. **Barbarian's Berserker (fixed in B301) was the only real one.**

## Batch 301 — G6 review: two dominated kits fixed, nine names re-cut (D-047 amended)
Francesco's eight notes on the B300 list. Two were content, six were naming.
- **The Barbarian's Berserker was strictly dominated** — 2 Handaxes + 2 Daggers, every item of which
  the Executioner also carried, plus a greataxe. It is now the **throwing** barbarian: 2 Handaxes,
  2 Light Hammers, 2 Daggers — six thrown weapons and two Nick masteries — and the Executioner drops
  to 2 backup handaxes so the two kits stop overlapping. 18 gp against a 125 gp purse; nothing
  filters out.
- **The Monk leaned on darts and one kit had no answer to range at all.** Darts were the ranged
  option in four of the eight kits, and Dancing adept (2 Scimitars) had none. Rough traveler takes a
  Shortbow, Forge disciple a Light Crossbow, Dancing adept a Sling; Wandering ascetic and Reaper keep
  their darts. Every monk kit now answers range, and no more than two do it the same way. No rules
  change either way: darts are Simple Ranged, so they were never Monk weapons and never carried
  Martial Arts.
- **Nine names re-cut**: War priest → **Battle priest** (War Cleric is a subclass) · Pistolier →
  **Gunslinger** · Venom tracker → **Canopy warrior** (tribal, per his note) · Frugal conjurer →
  **Frugal ritualist** (Conjurer is a wizard subclass).
- **The pure casters now key off what the kit actually is**, which was the note that the caster names
  described the character and not the loadout. Sorcerer: Wild talent → **Reckless prodigy** (the
  spear kit, the one that closes), Untamed spark → **Wary spark** (the crossbow kit, the one that
  doesn't) — which also splits the two that read as near-synonyms; Storm-touched → **Nimble
  channeler** (darts and staff); Drifter → **Gutter mage** (the cheapest kit in the game). Warlock:
  Bargain keeper → **Watchful supplicant** (the ranged kit).
- **136 tests green**, verified live, zero console errors. The G6 floor still holds: no contents
  lists, no name echoing more than one item off its own gear line, unique inside a class, sentence
  case, count pinned at 109.

## Batch 300 — G6: the equipment kits are named for the characters they imply (D-047)
A naming pass over the whole armory. The kits used to name their own contents ("Rapier and hand
crossbow"), which the roll table already prints beside them, so the name was a wasted line.
- **104 of the 109 kits renamed** into archetype voice — a noun phrase for the character the loadout
  implies, no leading article, sentence case like every other name in the app. Fighter's *Sword and
  shield* is now **Line soldier**, the Protector-gated *Chain mail and halberd* is **Cathedral
  sentinel**, the Rogue's *Scimitar and hand crossbow* is **Cat burglar**.
- **Five were already archetypes and were left alone** — Fighter's Archer, Duelist, Musketeer and
  Pistolier, and Wizard's Traveling scholar. They were the existing voice; the pass matched them.
- **No gendered forms.** The generator is species-blind and its characters have no assumed gender, so
  the "-man" names that a weapon-first pass produces (Pikeman, Reachman, Glaivesman) are instead
  **Bulwark**, **Gatekeeper** and **Harrower**.
- **Nothing keys off a kit name.** `kit.n` is display-only — the roll-table label, the summary line
  and the gear editor. Every gate reads the kit INDEX plus `ac` and `tags` (`genKitIdxFor`,
  `genKitTags`, `genAfford`, `validateGenPayload`), so the D-037 style filter, the D-038 purse and
  the wire validator are untouched by the rename.
- New floor in `test/gen.test.js`: a kit name is never a contents list ("X and Y"), never echoes more
  than one item off its own gear line, is unique inside its class, and stays sentence case; the kit
  count is pinned at 109 so the pass can't have dropped one. **136 tests green**, verified live in
  the ritual and on the summary screen, zero console errors.
- Noted while working: `deriveGenChar` sets `kitName` on the derived character and nothing reads it.
  Left in place — it is one field, and the card's gear line is the obvious future consumer.

## Batch 299 — G5 and G10: the ritual's categories become visible, death saves become one widget (D-045, D-046)
Four design rounds with Francesco (mockups + a research round he called for), then both builds.
- **G5 — the ritual's macro categories are on screen** (D-045). The D-034 groups — Species · Scores ·
  Class · Background · Training · Magic · Gear — now print as a labelled hairline above each group's
  first step. Steps themselves are untouched: same border, same states, same accent on the active one.
  `GEN_STEP_CAT`/`genStepCat` is the one definition of which group a step belongs to, so a category
  with no step in the current order never prints (a class with no spells shows no Magic rule).
  **This closes D-034's open question** about visible category headers. Rejected in the round: one box
  per group (the active-step signal would have had to move), a per-group spine (costs phone width), and
  a quiet spacing-plus-prefix treatment (too quiet to count as an answer).
- **G10 — death saves are one widget, on both surfaces** (D-046). The six pips are gone. In their place:
  a centred d20 with three segments a side, failures arcing left from twelve o'clock and successes
  right, both stopping short of the bottom where each side ends at its outcome glyph — a skull left, a
  pulse right — which lights when that side completes. Because the glyphs carry "dead" and "stable",
  **the die never morphs**; it just goes inert.
  - **Tapping the die rolls the save**: a flat d20 (XPHB, no modifier), 10+ a success, 9- a failure, a
    natural 1 counts as two failures, a natural 20 puts them back up at 1 hit point. The 3D dice show
    it when that layer is loaded. Tapping a filled segment corrects the count, exactly as the pips did.
  - **One renderer, two surfaces**: `deathSavesWidgetHTML` serves the tracker's HP popover (its home —
    combat rows keep only their down/stable badge, his call) and the crew card's HP block.
  - The rules half is pure (`deathSaveApply`/`deathSaveVerdict`) so both surfaces and the tests read
    the same rules.
- **The crew card's HP row became the combat panel, inline.** Label and value, a coloured bar, the
  death-save widget while at 0 HP, a damage/heal field with Apply (positive damages, temporary hit
  points absorb first; negative heals), and hit dice as its footer. **The −/+ steppers are gone** — that
  was the difference between the option he picked and the one he didn't.
- **Hit dice are new per-character state**: the class die and a spent count, spending one heals 1dHD +
  CON (minimum 1), tapping a spent die hands it back, and `rest` clears dice and death saves and fills
  HP. The row greys out at 0 HP — you can't take a rest while you're dying. Hit dice and death-save
  counts ride the resource store under reserved keys (`hd`, `dsF`, `dsS`), which means **per-device,
  never on the wire** — nothing new crosses D-029's boundary.
- The HP block repaints itself and rebinds rather than re-rendering the card (a card render re-runs the
  composer and the colourizer on every tap).
- **The research round is worth keeping** (recorded in D-046): D&D Beyond turns the HP section itself
  into the tracker at 0 HP; BG3 uses a big solid skull as a STATE badge, never as a counter; Pathfinder
  2e collapses the whole race into one numbered condition; Foundry's Custom D&D 5e treats it as a
  counter primitive and auto-clears counts on regaining HP and on rests; the paper sheet survives on
  countability. Nobody draws a detailed skull as a counter — which is why the skull here is large,
  solid, and only ever an outcome.
- Drawn and rejected on the way: two glyph plates with the number inside (the glyph fought the digit),
  a socketless skull silhouette (it reads as a lightbulb at small size), fractions, a segmented ring,
  a bidirectional track, orbiting pips, concentric rings.
- **135 tests green** (three new floors: the category map is total and its groups stay contiguous; the
  death-save rules including the natural 1 and 20; the widget's segment/glyph rendering and its
  read-only variant). Verified live: the ritual's seven rules, the block at 0 HP and above, a segment
  correction, a rolled save, a hit-die spend, the rest, and the tracker's popover row. Zero console
  errors.
- Retired: `CIRCLE_CHECK_ICON`/`CIRCLE_XMARK_ICON` (the pip glyphs) and the `.gk-hp-step` stepper CSS.
- Mockups and the research digest: https://claude.ai/code/artifact/a3805f3b-2889-46d3-850b-ca44e5982ddb

## Batch 298 — The B297 review: plausible classes, manual scores, struck-through options, filters (D-044)
Francesco's review of B297 — the eleven mechanical notes. The other six are planned, not built
(TASKS "Side quest 2"), because they need naming passes, a spike, or a design round with him.
- **Two real bugs, both his.** (1) **The plausible-class shortlist was suggesting classes you
  cannot play**: an 8 WIS character was offered Cleric and Druid because a 14 CON secondary
  outweighed the primary. The primary now leads (weighted ×10) and any class whose primary is below
  average drops out of the shortlist entirely; only if that empties does the raw ranking stand
  ("unless all stats are terrible"). His exact roll now reads Barbarian / Fighter / Paladin.
  Related: **a class's primary may be a CHOICE** — XPHB's Fighter is "Strength or Dexterity", and
  judging it on Dexterity alone is what hid the Fighter from a STR 11 character; `prim` takes a
  list now and the best of them counts. (2) **The ASI's +1 was landing where it did nothing**: it
  took the first odd score in a fixed order rather than the best one, and never looked past the
  class's own abilities. It now picks the best odd score and widens the search before settling for
  one where +1 changes no modifier.
- **"Type them in" is a header button** beside the roll, and it opens the six REAL score fields —
  the redundant second row of inputs is gone.
- **Species features group with the species**: the Human's Versatile origin feat sat three steps
  down among the background choices; it now resolves with Skillful, before the scores.
- **Excluded options render struck through** with the reason, disabled: the second origin feat's
  twin reads "taken", a species skill you already have reads "already yours". (The rule was already
  right — the two origin feats must differ, on the roll and on the pick. It just wasn't visible.)
- **Roll filters hide behind a filter button** in the step header, before the roll button.
- **Packs list their contents** after the name, like kits list their gear.
- **The trinket list is a crew setting** now ("Classic (SRD)" / "Our own list"), not a per-roll tab.
- **Reroll is scoped to the screen it is on**: on the rolls it mints a new character; on the
  summary it rerolls identity only. A whole new body from the summary is one Back away.
- **Quirk and trinket leave the roster's notes field** — that space belongs to the player — and
  become editable on the card through the same per-character overlay the gear editor uses
  (`pc.gen.flavor` DM-side, localStorage on phones). The wire payload is never touched.
- The identity columns match height.
- 132 tests green (two updated for the new behaviour: empty notes, scoped reroll). Verified live:
  his exact roll through the shortlist and the ASI, manual entry, the struck-through feat, the
  filter button, pack contents, the summary, the card editor, the settings. Zero console errors.

## Batch 297 — The G-slate: reroll, the closing summary screen, identity tables, per-boon toggles (D-041/042/043)
Francesco's four follow-ups from B295, all four gates settled in-session before any of it was built.
- **G1 — Reroll (D-039).** A finished ritual's ghost slot flips from "Roll the rest" to **Reroll**:
  a fresh draft on the same crew config with every step rolled again. Typed identity does not
  survive it (the judgment call the task left open — a reroll is a new body, not the old name).
  The same button rides the summary screen, so "not this one" is answered where you have it.
- **G2 — identity is a closing summary screen (D-041), after a mockup round.** Identity left the
  step list: the ritual now ends on the rolls with a **Next**, and the summary puts the headline
  facts (species, class, the ability line, the kit) beside the three identity fields. Francesco
  picked the two-column arrangement and added four notes, all in: the command bar is **sticky** so
  Reroll is reachable without scrolling (the steps scroll behind it, on both screens); the
  generator's ability scores wear the **site's ability colours** (`cc-ab-*`, the same tokens the
  Forge grid and statblock use); every identity field has its own **per-field reroll**; and the
  copy reads Next / Back rather than "View the card" / "Back to the rolls".
- **The DM never types a name (D-041).** His question, and it reshaped the gate: names are the
  player's to give, so a DM-rolled character takes a rolled name on arrival and only the crew
  (phone) flow requires one typed before the card.
- **G3 — identity content, with its provenance decided first (D-042).** The sourcing sweep found
  that the **d100 Trinkets table is in SRD 5.2 under CC-BY-4.0** — and it is the same beloved list
  the PHB printed, so the classic table ships verbatim (attribution in README.md and a new Credits
  card in the app's settings; the licence requires both to stay). Transcribed from the SRD text and
  cross-checked row-for-row against two independent copies. Behind an **Ours** tab sit 20 of our
  own, written for the crew's world. **Quirks are a d100** mixing original entries with rewritten
  staples — no SRD has a quirk table, and the popular online lists carry no licence. **Names are
  procedural**: each pack carries a small sound profile and a name is assembled from it, so nothing
  is copied (the D&D name tables are Xanathar's), the pool never runs out, and an uploaded species
  falls back to a neutral profile instead of having no names at all.
- **G4 — boons switch off one at a time (D-043),** scoped by Francesco to the packs that actually
  ship boons. A switched-off boon leaves the option table, cannot be picked, and never lands: a die
  on its face resolves to the table's no-boon entry, so the d20 stays honest. The list rides the
  share cfg and is rebuilt phone-side; on the wire the DM's cfg wins TOLERANTLY (D-035) — a stale
  phone's disabled boon drops to no-boon rather than failing the whole character.
- 132 tests green (new floors: G1's swap and reroll, the summary flow on both DM and phone paths,
  the identity tables and a name for every shipped pack plus an uploaded one, and the D-043 boon
  rules). Verified live end to end: sticky bar, coloured scores, summary, rolls, card, settings —
  zero console errors.
- Known taste item: the identity rolls are d100s, and the 3D engine renders a d100 as a boxy solid.
  It rolls and reads correctly; whether it should fire the dice at all is Francesco's call.

## Batch 296 — The kit review pass: tags everywhere, armor variety, Dex fallbacks, background gold (D-040)
Francesco's review notes on the B293–B295 kit table. Kits 92 → 109.
- **Tags on every kit, half of them derived.** A kit declares its WEAPON-SHAPE tags (`onehand`,
  `twohand`, `dual`, `ranged`, `thrown`, `finesse`); `genKitTags()` adds the DEFENCE tags from the
  armor recipe itself (`light`/`medium`/`heavy`, `shield`, `unarmored`). Deriving the defence half
  means it can't drift from the recipe, and it's what makes a future `fits` able to express an
  armor tie — a species-granted Fighting Style, or Protector/Warden switching from `needs` to
  `fits`, now works with no new vocabulary. `GEN_AC` gained a `w:` weight for this.
- **Armor variety.** The Fighter was wearing Chain Mail in six of twenty kits; it now spans 15
  recipes across 21. Cleric 8, Paladin 9, Barbarian 7, Ranger 8 (a different recipe per kit).
  Bard/Rogue/Warlock sit at 3 — the whole Light armor list, which is all their training allows —
  and Monk/Sorcerer/Wizard stay at 1 because they have no armor training at all. A test enforces
  the spread for every class that can actually choose.
- **Every Strength kit carries a Dex fallback.** Francesco's rule: a Str option always needs a
  finesse or ranged partner for when Strength doesn't land. Test-enforced across all 109 kits, and
  it shows on the card immediately (the sample cleric's Light Crossbow at +5 beats its Mace at +3).
- **Barbarians get armor.** Seven of eleven kits stay Unarmored Defense; the rest wear Light or
  Medium (never Heavy, which switches Rage off — test-enforced), and shield-and-one-weapon kits
  join the two-handers.
- **Casters name their foci.** Every arcane kit carries a specific focus (crystal/orb/rod/staff/
  wand), every cleric kit a specific holy symbol (amulet/emblem/reliquary), every druid kit a
  specific Druidic Focus (sprig of mistletoe/wooden staff/yew wand/totem). Bard kits each carry a
  different real XPHB instrument at its real price. The Wizard gained a Component Pouch kit.
- **The Druid's Herbalism Kit is no longer universal** — it rides the four kits built around it.
- **More kits where they were thin:** Monk 5 → 8, Cleric's Protector variants 2 → 4, one more
  blade-pact Warlock kit (Pact glaive), Barbarian 8 → 11, Bard 5 → 8.
- **Rogue is Finesse-or-Ranged throughout** — the Light hammers kit is gone and no rogue kit
  carries a Strength weapon, since Sneak Attack can't use one. Test-enforced.
- **The Ranger's blowgun kit got a real sidearm** (Rapier, not Shortsword): a blowgun's 1 damage
  is a utility line, not a melee plan.
- **D-040: the background's gold joins the purse.** A 2024 character takes its class's gold
  alternative AND its background's, and all sixteen XPHB backgrounds offer exactly 50 GP (read out
  of the mirror). Budgets are now class + 50 + the crew's extra: Fighter 205, Cleric 160,
  Wizard 105, Druid/Monk/Sorcerer 100.
- **The validator now REPLAYS the availability chain** instead of re-summing prices. The old sum
  contradicted the documented "a filtered table never empties" fallback: a druid whose kit emptied
  the purse legitimately rolled the cheapest pack, and the naive total then rejected that legal
  character (caught by the seeded sweep, not by hand). Validation walks the same
  `genKitIdx`/`genPacksAvail`/`genSundriesAvail` chain the ritual walked, so the two cannot drift
  and a rejection names the step that's wrong (`equip`) rather than a generic `gold`.
- 129 tests green (new D-040 floor: tags present and in-vocabulary, the Dex-fallback rule, the
  armor-spread rule, no Heavy on a barbarian, no Strength on a rogue). Verified live: 72 seeded
  restricted rolls across all twelve classes with zero rejections, the card, zero console errors.

## Batch 295 — Armor Stealth penalty on the card; the next-session plan recorded (D-039)
- **Noisy armor now says so** (closing D-038's open item): `deriveGenChar` exports `acStealth`
  from the POST-swap AC recipe — a Str-gate demotion (Chain Mail → Chain Shirt) sheds the penalty
  with the armor — and the card's AC note appends "; Disadvantage on Stealth". One consumer
  (`genToMonster`), so the DM card and the phone card agree. Test-locked both ways (noisy fighter
  / demoted quiet fighter); 128 tests green, verified live.
- **Kit-content review table delivered in-chat** (all 92 kits × class, gear, GP, tags, gates,
  stealth) — the D-013 review is Francesco's next move.
- **Next session planned, not built (D-039 + TASKS "Side quest — crew generator follow-ups"):**
  G1 Reroll replaces "Roll the rest" on a finished ritual · G2 identity → closing summary screen
  (name required; 🔶 mockup round first) · G3 quirk/trinket roll tables (🔶 sourcing-with-licenses
  round first; partially supersedes typed-only identity) · G4 the D-035 boons customization,
  un-tabled (🔶 design round first).

## Batch 294 — Bare span numbers, the whole XPHB armory, and a starting-gold budget (D-038)
Francesco's three notes.
- **One-face spans read as a number, not a range.** `genSpanText(span,i)` replaces five hand-built
  `lo+"-"+hi` renderers, so a 12-row table numbers 1…12 instead of 1-1…12-12. Real ranges are
  untouched. Reroll tables were already one face per row, so they route through the same helper.
- **The armory is complete.** Every XPHB weapon is now modelled: the 12 that were missing
  (Glaive, Greatclub, Lance, Light Hammer, Morningstar, Pike, Trident, War Pick, Whip, Blowgun,
  plus the Musket and Pistol at Francesco's call) with their real dice, mastery, range and price.
  Armor gained the 7 it lacked (Padded, Hide, Ring Mail, Breastplate, Half Plate, Splint, Plate).
  Both were pulled from the local 5etools mirror, not written from memory. **Every weapon and
  every armor recipe now appears in at least one kit** and a test enforces it, so the next
  addition can't sit unreachable. Kit count went 71 → 92 across the twelve classes.
- **D-038, the starting-gold budget.** Crew settings gains "Starting gold: Roll anything / Class
  budget" plus an "Extra gold" field. Under a budget every kit, pack and sundry is priced at its
  XPHB list price and measured against the class's OWN starting gold (Fighter 155, Paladin/Ranger
  150, Cleric 110, Rogue/Warlock 100, Bard 90, Barbarian 75, Wizard 55, Druid/Monk/Sorcerer 50 —
  the "or N GP" alternative each class prints, read out of the mirror's class files). Tables filter
  to what the purse still covers, in ritual order (kit → pack → sundries), and the remainder lands
  on the gear line as whole gold, the way XPHB's own packages hand over their leftover.
  - **50 GP was the Druid/Monk/Sorcerer figure**, not a universal one. A flat 50 would have priced
    a fighter out of Chain Mail (75) and a wizard out of its own spellbook (50).
  - **Class-mandatory gear is exempt** (spellbook, holy symbol, spellcasting focus): at 55 GP a
    wizard's spellbook alone would eat the budget, and XPHB's own package ignores that too.
  - **A filtered table never empties** (`genAfford` keeps the cheapest option when nothing fits),
    and a step whose price no longer fits gets dropped rather than left showing an unpayable total
    (`genDropUnaffordable`, the D-037 idiom).
  - **The DM's cfg is the authority on the wire.** `validateGenPayload(raw,cfg)` takes the crew's
    own settings and re-prices the whole gear group; a payload that overspends is rejected with
    `err:"gold"`. Passing no cfg falls back to the payload's own set (the phone's self-check),
    but `genIngestPayload` always passes the real one, so a phone can't claim the budget was off
    and hand back a fighter in plate.
  - Off by default, so existing crews roll exactly as they did.
- **Sundries and packs are priced too**, `GEN_PACK_GP` / `GEN_SUNDRY_GP`; an unpriced item costs 0,
  which is the safe direction (it can never make a legal roll unaffordable).
- 127 tests green (two new floors: armory coverage + every price present; and the budget end to
  end — per-class ceilings, filtered tables, 36 seeded restricted rolls that never overspend, coin
  on the card, the overspend rejection, the spoofed-cfg rejection, and plate returning to the table
  when the DM raises the gold). Verified live: settings, the narrowed tables, the ? copy, a rolled
  card carrying its coin, zero console errors.

## Batch 293 — The fighting style picks the kit table (D-037)
Francesco's note: a rolled Fighter's Fighting Style and its equipment kit had nothing to do with
each other — an Archery fighter could roll a greatsword. The style already resolves BEFORE the
gear group (D-034), so the fix is a filter on the kit table, not a reordering.
- **Mechanism (D-037), general, not Fighter-shaped:** a kit answers to its class feature option
  twice over. `needs:"<hook>"` UNLOCKS a kit the option's training makes legal (the existing
  Pact-of-the-Blade path); the option's new `fits` array NARROWS the table to the kits whose
  `tags` match the tactic it rolled. `genKitIdxFor(K,featVal)` is the one definition — the roll,
  the pick, `genStepDone`, and `validateGenPayload` all read it, so the DM app, the ritual UI and
  the wire agree on which kits a character could have had.
- **Three Fighting Styles keep the whole table on purpose** — Defense (+1 AC in armor, and every
  fighter kit is armored), Interception and Unarmed Fighting have no gear consequence, and
  inventing a tie for them would be noise. Blind Fighting narrows to the melee kits. The rest tie
  to what they actually modify: Archery → ranged (3), Great Weapon → two-handed (3), Protection →
  shield (3), Dueling → one-handed (4), Two-Weapon → paired Light weapons (3), Thrown → the
  javelin/handaxe kits (6).
- **The fighter kit table grew 8 → 12** (D-022's shape), because a pure filter left Two-Weapon
  Fighting with a table of ONE: added Twin shortswords, Twin handaxes, Heavy crossbow, Greataxe.
  Every style now rolls on at least 3 kits and every span die stays clean (d4/d6/d10/d12).
- **The same gap closed for Cleric and Druid** (Francesco's call): the Cleric's Warhammer kit
  carried a prose note saying it needed Protector's Martial training but wasn't actually gated —
  a Thaumaturge could roll a weapon it isn't trained with. It's now `needs:"martialTrained"`
  behind Protector's hook, and the Druid's Warden order (Martial weapons + Medium armor) finally
  has a kit of its own behind the same hook.
- **Changing the style DROPS a kit it no longer allows** (`genDropUnfitKit`, called from both the
  roll and the pick) — the step already reopened, but the stale kit line rendered above the new
  table. Same idiom as the extra-cantrip reset that sits next to it.
- **Die-label fix caught while verifying:** the equip step's info line quoted `genDieLabel`
  (next size up) while the table renders `genSpanFor` spans — they disagree at 3 and 5 options,
  so the line read "d4 (reroll over 3)" over a d6-thirds table. The line now quotes the span die.
  This was already wrong for the 5-kit Cleric before this batch.
- **Copy:** Dueling's text claimed its +2 damage was "counted on the main line". It never was —
  the `dueling` hook had no consumer anywhere (the composer's attack entries carry dice + ability
  modifier, with no flat-damage field). Claim removed, dead hook removed. Counting it properly
  would mean an entry-schema change in the Forge; not this batch.
- 125 tests green (new D-037 floor: fits-tag integrity, 3-kit minimum per style, 40 seeded
  fighters whose kit always fits the rolled style, the cleric/druid unlock deltas, a tampered
  Archery+greatsword payload rejected at the wire, and the reopen). Verified live: the narrowed
  table in the ritual, the drop-on-change, the derived card, zero console errors.

## Batch 292 — Fix: the crew share button was invisible in the roster header
Francesco's report. **Not a B288-B291 regression — broken since B283 (`d1ce89b`) when the share
dialog was split out of crew settings and the header button was introduced.**
- **Cause:** `SHARE_ICON` (combat.js) carries NO `width`/`height` on its `<svg>`, because its
  original home `.ct-toolsbtn` gives it a fixed 28×26 `display:grid` box to fill. The roster
  header's `.lvlup-btn` has no such box and no svg sizing rule, so the icon computed to **0×0**
  and the button rendered as a 12px sliver of bare padding — present in the DOM, invisible on
  screen. Its neighbours never showed the bug because `ARROW_TREND_UP` and `GEN_GEAR_ICON` both
  carry explicit `width`/`height` attributes.
- **Fix:** one scoped rule, `#crewShareBtn svg{width:13px;height:13px}`, sized to match the gear
  it sits beside (button now 25×24, identical to it). Scoped by id on purpose: adding dimensions
  to the shared `SHARE_ICON` constant would have resized the combat toolbar's icon (15×15 today)
  as a side effect.
- **Rule worth keeping:** an icon constant is only as portable as its intrinsic size. Reusing one
  in a container that doesn't size its svg needs either explicit attributes or a local rule.
- 124 tests green (CSS-only change), verified live in the roster header.

## Batch 291 — Ritual grouping, the boons toggle, a smarter ASI default (D-034/D-035/D-036)
Francesco's three notes on the B288-B290 build.
- **Steps group by macro category (D-034):** the species step and ALL its tables now LEAD the
  ritual (they used to trail at the very end, a screen away from the species that owns them);
  gear regrouped so the kit sits with the pack and the sundries; feats adjacent. Dependencies
  still order steps inside a group. Consequence handled: species tables resolving first means the
  CLASS skill roll now dodges species-granted skills (it rolled blind before, because the species
  table used to go last and do the dodging) — 40-seed floor.
- **Species boons are optional (D-035):** a table may carry `boon:true` — an extra on top of the
  species' rules, not part of them. Crew settings gains "Species boons: Rolled / Off"; off drops
  the table from the ritual, payload and derivation. Validation treats boon tables as optional in
  BOTH directions, so a phone on a stale cfg is never rejected over one missing extra and old
  payloads stay valid; core tables (lineages/ancestries/legacies/Kobold Legacy) stay required.
  The kobold Draconic Boon is the only flagged table. Making boons customizable is TABLED (D-035).
- **Background ASI default buys modifiers (D-036):** the +2 stays on the class primary (it crosses
  a modifier step at any parity); the +1 goes to the best ODD-scored ability among the class
  secondary, Con and Dex — 13→14 is worth a modifier, 14→15 is worth nothing — falling back to the
  secondary when nothing is odd. Suggestion only; the step stays explicit and overridable, and the
  label reads "Suggested" now, not "class default".
- **124 tests green**, verified live (grouped order in both species modes, boons toggle in and out
  of the ritual, `str/dex` suggested for a 15/13/14 barbarian), zero console errors.

## Batch 290 — Feat texts from uploads (D-033)
The origin-feat d10 and its mechanical hooks stay shipped (the closed domain); a feats.json
upload refreshes the TEXTS by name — the D-012 pattern applied to feats.
- New "feat" upload kind (`parseFeatsJSON`, XPHB-over-PHB name dedupe like conditions),
  `state.feats` persisted (`mf_feats`), library toggles + removal, `genFeatText(name,fallback)`
  consulted at derivation so the card carries the uploaded book's wording; unmatched names and
  disabled sources fall back to the shipped condensed texts. Items and class content stay shipped
  (D-033 rejections — don't re-propose). Mirror sanity: 218 feats after dedupe, Alert/Tough land
  their 2024 texts. **121 tests green.**

## Batch 289 — Species from uploads: the races.json import path (D-030/D-032)
Any 5etools races.json the DM uploads now yields rollable species packs.
- **Parser (`parseRacesJSON`, parsers.js):** basics land exactly (size/speed/darkvision/2014
  languages); JSON-marked choices synthesize REAL pick-or-roll tables — lineage/legacy/ancestry
  tables (level-1 column when leveled), "choose one" item lists (shared PB-uses → 2/rest at L1),
  named-skill and any-skill choices (kind:"skill"); per-choice fx detection (resist, granted
  cantrips/always-prepared spells with the named or mental ability, speed/darkvision increases);
  plain traits carry uses detection and Bonus-Action sectioning; everything else degrades to
  VERBATIM PROSE (D-032 — never wrong mechanics). Level-2+ traits are skipped (L1 scope).
  extraFeat detection reads the RAW entry (richStrip's generic link rule eats {@filter Origin
  feat|…} labels). Spans always tile the die (the sp: roller has no reroll-over).
- **Plumbing:** new "race" upload kind (detectJsonKind/app.js), `state.species` persisted like
  spells (`mf_species` IDB), per-source enable toggles + removal in the library manager,
  `genSyncSpecies()` merges enabled uploads into GEN_SPECIES under namespaced `u_<file>_<name>`
  keys (shipped packs never touched) on load/upload/toggle.
- **Wire:** uploaded packs ride the crew share cfg (locked crew → its one pack; ritual → all
  enabled); phones REBUILD each pack through `crewCleanSpeciesPack` — whitelisted fields, closed
  vocabularies, capped counts/lengths, die-tiling check, shipped keys unshadowable — before
  registering (the share is world-writable; D-007 stance).
- Floors: `test/species-parser.test.js` (mirror-shaped fixtures: lineage table fx, list choices,
  skill tables, extraFeat, level gating; end-to-end register→roll→validate→derive; hostile-pack
  sanitizer). Real-mirror sanity: 157 species parse, all 10 XPHB roll clean. **120 tests green.**

## Batch 288 — Crew generator: every species (D-030/D-031, supersedes D-001's kobold-only scope)
The generalization interview (4 AskUserQuestion rounds → D-030…D-033, D-023 amended) landed hybrid:
curated XPHB packs now, a races.json import path next (B289), feats-from-uploads after (B290).
- **fx vocabulary (B288a):** species-table entries now carry a declarative `fx` payload
  (trait/bonus/action with `{DC:abil}`/`{MOD:abil}`/`{PB}`/`{SUB}` templating, skillSub, cast
  incl. "mental" = best of Int/Wis/Cha, resist, size/fly/speed/darkvision overrides, resource
  declarations) consumed by ONE generic walk in `deriveGenChar` — the kobold-specific blocks
  (`sp:legacy`/`sp:wings` hardcoding) are gone; the kobold pack is rewritten in the vocabulary with
  identical ids and payload values (D-028 back-compat holds). `sorcery` → generic `spCasts` list;
  single `resist` → `resists` array; pack-level `casts`/`resists`/`actions`/`hpPerLevel`/`extraFeat`.
  New engine kinds: `kind:"skill"` tables (plain-name skill choice, owned-skill reroll) and the
  `feat2` step (a second origin feat, first feat rerolled — every feat consumer loops both).
- **Ten XPHB packs (B288b):** Aasimar, Dragonborn (ancestry d10 → resist + Breath Weapon + uses),
  Dwarf (+1 HP/level), Elf (Keen Senses skill table + Lineage d6: Drow/High/Wood), Gnome (Lineage
  d6: Forest/Rock), Goliath (Giant Ancestry d6), Halfling, Human (Skillful d20 skill table +
  Versatile = feat2), Orc, Tiefling (Fiendish Legacy d6) — level-1 content only, transcribed from
  the 5etools mirror, PB-scaled uses baked at 2.
- **Cross-source dedupe grew two arms:** `genSpDedupe` — a landed species entry granting FIXED
  casts reopens colliding class spell steps / mi / tome subs (species tables resolve after the
  spell steps, so the reroll runs backwards); derivation-level drop for fixed-vs-fixed collisions
  (Forest Gnome Druid both grant Speak with Animals — the card lists it once, the free-cast
  resource stays).
- **Species modes (B288c, D-031):** crew settings gained the toggle — "One species for the crew"
  (today's model, species-driven button copy per D-023) vs "Rolled in the ritual" (a Species step
  LEADS the ritual, equal-weight over all shipped packs; species change cascades: old sp: steps
  die, feat2 follows extraFeat, fixed-cast collisions reopen). Button copy in ritual mode is
  "Roll a character" (D-023 amended by the user's explicit walk-back). Wire cfg carries `spMode`;
  locked-mode ingestion REJECTS payloads of any other species; phones read the mode for their
  copy. Crew-card meta now prints a Resistances line and drops "Darkvision 0 ft." (senses field
  empty for the three no-darkvision species).
- Floors: species pack floor (11 packs × 30 seeds — legality, cast math, dedupe, skill tables,
  feat2, dmg-line round trip), ritual-mode floor (step order, cascade, locked-crew rejection),
  kind-table integrity. **117 tests green**, live-verified (ritual with species step, dragonborn +
  tiefling cards, settings modal, roster button).

## Batch 287 — Fix: enemy statblocks blank in combat (a library record with no `saves`)
Francesco's blocking bug, found from the B286 error message.
- **Cause:** the combat panel renders LIBRARY records directly, so `normalizeMonster` is the only
  shape guarantee they get — and it never defaulted `saves` / `mainAbils` / `skills`. A record that
  never carried them (hand-built import JSON, an old export, any creature with no save
  proficiencies) hit `m.saves.includes(a)` in `sbAbilityTableHTML` (engine.js), the composer threw,
  and the card stayed empty. The Forge survived it only because its own load path fills the fields
  from the blank template afterwards.
- **Fix:** `normalizeMonster` guarantees all four array fields. One line, at the layer whose job is
  exactly this; every surface that reads a library record is fixed at once, no re-import needed.
- Floors: `normalizeMonster` shape assertion + a bare record driven through the full composer.
  **115 tests green**, verified live (bare record → real combat panel → statblock renders).
- The combat statblock's failure message now carries the **throwing frame** (`file:line`) plus the
  creature name and id. A render failure here is always data-shaped, so the frame IS the diagnosis:
  it turned this bug from "blank card, no symptom" into a one-round-trip fix.
- **Deploy note:** the Pages build for this batch ERRORED (the publisher hang from B285's tail) and
  the fix sat undeployed through two "still broken" reports. `gh api -X POST .../pages/builds` built
  it in 50 s. See [[github-pages-deploy-gotchas]] — including the marker mistake that hid it.

## Batch 286 — Players track their own HP and notes on the crew card (D-029)
Francesco's request alongside the combat-statblock bug report.
- **HP row on the crew phone card** (`genHpTrackerHTML`, under the card beside the resource
  tracker): −/+ steps, a tap-to-type popover for exact current + temporary HP, and "full".
  Damage comes off temporary HP first; current clamps to 0…max; the row goes amber under a third
  and red at 0. Repainted in place (a full card re-render per tap would re-run the composer).
- **Notes box** under the card, mirroring the DM modal's — per device (`mf_crewnote:<payloadId>`),
  debounced on input. The 12s crew poll no longer rebuilds the screen while the box has focus.
- **HP reports to the DM, notes never do (D-029).** The phone PUTs `{cur,tmp,at}` to its own
  `crew/<pid>/hp` leaf (debounced, nothing else clobbered); the DM poll runs it through
  `crewCleanHp` (two clamped numbers + a stamp, anything else dropped) and `crewApplyHp`, which
  updates the roster PC and any live combat instance. Idempotent by stamp, so a repeated or stale
  report never lands on top of the DM's own edit. The DM's copy of the row (statblock modal) is
  read-only.
- The crew poll now also runs while the **Combat** view is open (it only ran from the adventure
  panel — exactly the wrong place for HP arriving mid-fight), and repaints the tracker on a change.
- Floors: two new crew-flow tests (phone HP leaf + notes-stay-local; DM clamp/apply/idempotence).
  **113 tests green**, verified live on a mobile viewport.

## Batch 285 — Two critical Forge fixes: chassis-save overwrite + entry paragraph rendering
Francesco's two bug reports (real creations were lost to the first).
- **Chassis load no longer overwrites the last-saved monster.** `applyChassis` used to keep the
  current Forge draft's id when opened from the Forge — and Save upserts by id, so picking a
  chassis right after saving a creature (Forge clean → no conflict modal) silently replaced that
  creature on the next Save. A chassis load now ALWAYS mints a fresh id via `chassisToMonster`;
  the conflict modal's choices are unchanged ("Replace" still discards edits, but the library
  copy is never touched). The dead `mergeChassis` merge path (never reachable — every call site
  passed `merge:false`) was removed with the `keepId`/`merge` params.
- **Statblock entries keep their paragraph structure.** Entry bodies (traits/actions/bonus,
  reaction responses, legendary/villain/lair intros, villain items, regional, notes) render
  through `fmtBlock` instead of `fmtInline`, so `\n\n` paragraph breaks, `- ` bullet lists
  (Kobold Inventor's invention menu), and `" | "` table runs finally survive into the preview —
  the importer was already emitting them (`entriesToText`); only the render collapsed them.
  Entry wrappers became `<div class="blk">` (a `<table>` legally can't live in a `<p>`; all CSS
  and the colorize/roll post-passes select by class, verified). `fmtBlock` itself was fixed to
  CLOSE its bullet spans (the old regex left every `<span class="blk-item">` open and later
  bullets nested); the bullet `::before` rule is now global, not refcard-only.
- Floors: `test/chassis-flow.test.js` (chassis id divergence + save-adds-not-overwrites) and
  fmtBlock/sbEntriesHTML render assertions in units. **111 tests green**, both fixes verified
  live in the pane (bullets colorized + rollable, d6 table renders).

## Batch 284 — Crew generator: pre-commit polish (stats entry, MI manual picks, boon fixes, sub editing)
Francesco's last four notes before the v4 commit.
- **Ability scores:** the stats step joins the header roll like every other step — "Roll all"
  rolls every remaining ability at once (one 3D volley; reroll icon when done); a "Type them in"
  link under the grid opens the manual editor BEFORE any roll (the walking one-die-at-a-time
  button stays, D-015 preserved).
- **Magic Initiate manual picks:** the sub-editor now carries the list select plus two cantrip
  selects and a spell select ("Choose" applies them via the existing validated genApplySubPick
  path); "Roll from it" keeps the pick-list-roll-spells flow with cross-source dedupe. The list
  select re-renders the spell selects.
- **Boon fixes:** Dragon Fear is a Bonus Action against ONE creature (was an action vs a group);
  Grasping Tail moves to Bonus Actions with hadozee-style object manipulation (manipulate an
  object, open/close a door or container, pick up or set down a Tiny object) plus the Grapple.
- **Sub elements editable on click:** every auto-rolled sub chip (Dragon's Breath/Resistance
  type, legacy skill/cantrip, Magic Initiate spells, Tome cantrips, feat triples) clears its sub
  on click and reopens the sub editor (roll or choose again).
- crew-flow's stats assertion re-targeted to the walking cell button (the header now also
  matches). **107 tests green**, all four behaviors verified live.

## Batch 283 — Crew generator v4: nine-note round (D-024…D-028 + five direct fixes)
Francesco's second notes batch, settled over two AskUserQuestion rounds; decisions in `DECISIONS.md`.
- **Magic Initiate ability fixed:** the feat's spellcasting ability is the character's best of
  Int/Wis/Cha (2024 rule), not the rolled list's class ability (`GEN_MI_ABIL` deleted).
- **Armor Str gates (v4 note):** Chain Mail atoms carry `str:13` + a lighter `alt`; below the gate
  the derive lands on Chain Shirt (shield preserved) and the gear line swaps with it.
- **Two spell tables (D-024):** cantrips AND prepared spells roll per-slot on Damaging or All
  (`GEN_DMG_SPELLS`, `genRollSlots`, `genStepTabs`); slot 1 defaults to Damaging (subsumes D-018's
  guarantee), a toggle strip above the step's two independently-numbered tables overrides per roll
  (toggling a rolled step rerolls it); per-slot dice replay on the 3D layer. Tabs are draft-only —
  the wire payload and validator are unchanged.
- **Draconic Boon table (D-028):** the wings d20 becomes 1-12 nothing / 13-19 one boon each
  (grasping tail, Draconic Resistance with a rolled chromatic type — real resistance line, Grovel
  Cower and Beg 1/SR, Medium size + Powerful Build, Dragon Fear 1/LR, Dragon's Breath 2/LR with a
  rolled type, Pack Tactics) / nat 20 wings. Legacy true/false payload values stay valid.
- **Familiars (D-025):** Pact of the Chain rolls d8 over the 2024 special forms; any character
  knowing Find Familiar rolls the beast forms; the familiar's FULL statblock (composer-rendered,
  colorized, rollable) appends under a Familiar heading on the card. The 19 XMM blocks ship in
  gen.js (`GEN_FAMILIARS`, extracted via the app's own 5etools parser) so phones stay
  payload-only (D-007). Validation re-derives eligibility and drops unearned forms.
- **Pact of the Blade (v4 note):** the kit's main melee weapon IS the bonded pact weapon (attacks
  with Cha, noted); three blade-gated martial kits (greatsword/halberd/rapier) join the warlock
  table only when the invocation is Pact of the Blade (`needs` gating: roll, pick, table, and
  validator all honor it; a feature change reopens a now-illegal kit).
- **Kit rebalance (D-026):** slings 10→4 (kept where thematic: Druid ×2, Monk, Rogue); casters
  standardize on dagger + light crossbow; darts absorb the variety (2→6).
- **Pack contents (D-027):** `GEN_PACK_CONTENTS` (XPHB); pack names on the Gear line are click
  popovers listing contents; the gear editor unpacks packs into component chips (first edit
  materializes the expansion; reset restores the pack name). Plural rules extended (+es).
- **Ritual ? popovers** are real site popovers (tailPopover) instead of inline lines; step info
  texts tightened (spell steps now describe the two tables).
- **Crew share split (v4 note):** the roster header gains a share button (before the icon-only
  settings gear) opening a crew-share dialog modeled on the combat share modal (create / link +
  Copy + QR / stop, Live badge); the settings modal carries only generator config.
- Floors: +5 gen tests (tables default+override, boons, familiar validate/derive/render,
  blade gating, armor fallback + plural stepper); crew-flow updated to the share/settings split.
  **107 tests green**, verified live (ritual, card with familiar block, pack popover, share and
  settings modals). Fixed live: the familiar meta line needed pb/xp args (pbForCR/xpOf).

## Batch 282 — Crew generator: v3 eyeball-pass fixes (species-blind copy, panel collapse, gear counts)
Five fixes from Francesco's first live pass over v3.
- **Species-blind copy:** no "kobold" hardcoded outside the kobold species pack. Feat texts say
  "the character", cantrip rider texts say "the caster", the legacy trait name derives from the
  species table's label (`Kobold Legacy` comes from `GEN_SPECIES.kobold.tables`, not the engine),
  and the phone screens (`Roll your …`, the replace-confirm) read the share's species label. The
  roster's "Roll a …" button already derived from `a.crew.sp` (B281) and is unchanged.
- **Skills/gear panels actually collapse:** `.gk-allskills`/`.gk-gearedit` set `display:flex`,
  which beat the UA's `[hidden]{display:none}` — both panels rendered permanently open, and the
  empty gear box was the "ghost section" under Gear. One CSS rule (`[hidden]{display:none}` on
  both classes) restores the chevron toggle; panels now start closed.
- **Gear counts editable:** numbered items ("4 Javelins", "20 Bolts") get − / + steppers in the
  gear editor (`gkGearStep`): count 1 renders singular ("1 Javelin"), 0 removes the item, naive
  +s pluralization (fits the whole kit vocabulary).
- **HP line:** the ", maxed" suffix is gone — `hpf` is just the die + Con ("1d8 + 1").
- **Phone death button:** "NAME died. Roll the next one" (read like a status) is now
  "Mark NAME dead and roll the next one".
- Verified: 102 tests green, live pass in the preview (panel toggles, steppers end to end,
  card copy), zero console errors.

## Batch 281 — Crew generator v3: live feedback round applied end to end (D-015…D-022)
Same-day revision of B280 from a four-round live interview; all decisions in `DECISIONS.md`.
- **Ritual (D-015/016/017):** the scores step is now the statblock-style six-cell grid — ONE
  editable number per ability (editing converts the step to chosen), no printed dice strings, no
  summary strip, one walking Roll button starting at STR; **ritual rolls fire the real 3D dice**
  (`genFire3D` hands the engine's raw faces to `rollDice3D`, which replays them — what settles is
  what the step recorded; dice stamped on step records as `die`). Class table lists all twelve
  (top-3 span-marked, other nine behind a pick-only expander). Section labels are bare names with
  a small `?` popover carrying the die/method text; whole completed sections are click targets to
  reopen; collapsed sections shrink Reroll to an icon-only ghost; every ritual dropdown numbers its
  rows (physical dice can drive picks); background ASI is an explicit step (editor opens on the
  class default, waits for Apply — Roll-the-rest still auto-applies it); Roll-the-rest icon sized.
- **Engine constraints (D-018):** every spell roll rerolls names already granted by another source
  (feat, legacy, tome, always-prepared — `genSpellsGranted`), and a rolled full caster always ends
  with at least one damage cantrip (bounded rerolls, index-subset fallback). Locked in the 160-seed
  batch alongside a no-cross-source-dupes invariant.
- **Card (D-019):** `.modal .sb h3` scoped rule restores statblock heading specs inside modals (the
  `.modal h3` title rule was clobbering "Actions"); the card host now carries the same roll
  delegation as `#statblock`, so click-to-roll works in every card modal; the Skills line gains a
  chevron opening an all-18-skills panel (every bonus rollable, proficient highlighted); Gear gains
  a chevron opening a manual editor (remove/add items — stored as a per-character overlay:
  `pc.gen.gear` DM-side, localStorage on phones; never on the wire); spellcasting sources sharing
  an ability collapse into ONE Spellcasting entry (attack lines keep per-source numbers); traits
  fully covered by the spellcasting block (Draconic Sorcery, Magic Initiate) no longer repeat.
- **Tracker (D-020):** resource declarations may carry `sr:N` — such rows render an `SR +N` partial
  reset beside the full reset (Rage and Second Wind regain 1 on a Short Rest, all on Long).
- **Roster restructure (D-021):** the crew section is dissolved. The party-roster header carries a
  gear button (after Level Up) opening the crew-settings modal (species/scores/class/ASI + the
  player link); the roster's primary action is the split "Roll a kobold" button (regular add behind
  the caret, encounter-FAB pattern); generated members are ordinary rows that open the statblock
  modal (with a notes section at the bottom and a Full page escape) instead of the roster page;
  only the Caduti list remains under the roster. "Add to the crew" closes back to the roster.
- **Content (D-022):** kit tables grew for all twelve classes (Fighter 8, Barbarian/Paladin/Ranger/
  Rogue 6, Cleric 5, the rest 4 — PHB-legal, clean dice; new `unarmConShield` AC atom, shields now
  count in unarmored AC recipes); sundries split into TWO disjoint d20 lists (roll 1 from each).
- **Player tooltips (D-019):** the crew share gains `/refs` — trimmed spell/condition texts for
  every generator-reachable name, written at mint + config pushes; phones sanitize at ingestion
  (whitelisted keys, brackets stripped, caps) and seed their reference stores so card links pop the
  same texts the DM sees. The phone poll now reads only the light `/crew` subtree; cfg refreshes on
  focus, refs load once at boot.
- Fixed in passing: B280's two lint warnings (dead `useMast`, dead `root`). **102 tests green**
  (floors updated: two-list sundries, dedupe + damage-cantrip + merged-spellcasting invariants over
  160 seeds, SR partial reset, restructured-roster DOM flow). Live pass done in the pane this time
  — 3D dice verified in flight, modal rolls land in the log. Phone flow parked until the next real
  playtest (his call).

## Batch 280 — Crew generator v2: Francesco's thirteen notes + the depth interview (D-011…D-014)
Full revision of B279 on written review notes; gen.js rewritten (1550 lines), payloads bumped to v:2.
- **No AI tells:** every emoji replaced (D20 icon or plain text), all copy rewritten matter-of-fact;
  the kobold "flagged substitution" line removed everywhere; the drafted Italian flavor tables
  (already shelved) left to git history — identity is name + optional quirk/trinket, typed
  (**last words removed** per the notes).
- **The ritual, rebuilt (D-011):** every step shows its OPTION TABLE before the dice land (rows are
  tappable as choices; the landed row highlights); any result is clickable to change — write over it
  or pick another option, with class changes cascading to dependents. Ability scores roll ONE AT A
  TIME in order, each with its raw dice on show (lowest struck on 4d6). All spans are EQUAL WEIGHT
  (three options = 1-2 / 3-4 / 5-6; the plausible-class d6 lost its old top-heavy mapping).
- **Level-1 choices now roll (interview):** per-class **equipment kits** (drafted PHB-legal, more
  for martials — Fighter 6, casters 3 — D-013); **feature options** (Divine Order d4, Primal Order
  d4, Fighting Style d10 = all ten, Eldritch Invocation d10/5 = the five level-1-legal ones incl.
  Pact of the Tome's three rolled any-list cantrips, Rogue Expertise 2 of the rolled skills);
  **spells** — known cantrips and prepared level-1 spells roll from the install's UPLOADED spell
  library intersected with the shipped per-class XPHB index (`GEN_CLASS_SPELLS`; index alone as the
  fallback and always the validation domain; the resolved tables ride the crew share cfg so phones
  roll the same lists — D-012); **gear** — a rolled pack (d6) plus two sundries off a drafted d20
  (D-014). Rangers/Druids keep their always-prepared spells on top.
- **Origin feats, comprehensive:** fuller texts for all ten; feats with internal choices roll them —
  Magic Initiate rolls its LIST (d6 equal thirds: Cleric/Druid/Wizard) then two cantrips and one
  level-1 spell from that list's tables (+ its own free-cast tracker row); Crafter rolls three
  artisan tools (d8, the Fast Crafting eight); Musician three instruments (d10); Skilled three
  skills (unchanged).
- **The card is now literally the app's statblock:** `genToMonster()` emits REAL Forge entries —
  weapons and attack cantrips as `mode:"attack"` (attackText math), Spellcasting as `mode:"spell"`
  with dc/atk overrides and character-style slot groups ("Level 1 (2 slots, Long Rest)"), and the
  render swaps the global `M` to the generated monster for its synchronous duration so the composer,
  the colour pass (`colorizeStatblock`), spell/condition reflinks, and click-to-roll all behave
  exactly as on a bestiary statblock. Raw stat dice appear only in the ritual. The resource
  tracker's recharge label ("Long Rest") is now a button that resets that row's pips.
- **Panel tidied:** labeled setting fields (Species / Scores / Class / Background ASI), the player
  link, members, and the Caduti list as separate grouped rows.
- **Floors rebuilt:** 102 tests — equal-weight spans, kit-table integrity, per-score rolling, a
  160-seed legality batch (attack math incl. Archery, cantrip/prepared counts incl. Thaumaturge/
  Magician/Tome, expertise, gear composition, slots), spell-table resolution + cfg constraint,
  Magic Initiate chain validation, hostile-payload boundary (off-list spells, stale `last` fields
  dropped), statblock conversion (real attack/spell modes), the DOM ritual end-to-end (six stat
  clicks, table-first class step, result-click override cascade), pip spend/reset, the phone flow,
  and DM replace/dedup. Review artifact round 3 (same URL) carries the kit and gear tables for
  Francesco's pending content review.

## Batch 279 — The crew generator (gen.js): random level-1 PCs, adventure-tied, player phones roll them
Side-quest feature for a comedic one-shot (kobold pirates die; each death rolls the next PC), built
off-roadmap in one session from a revived artifact-era handoff. All decisions in `DECISIONS.md`
(D-001…D-010 — that file is NEW: the feature-level decision log; phase decisions stay in ROADMAP/TASKS).
- **New shared-scope file `gen.js`** (13 files now; loader/check/lint/harness/eslint sync points all
  updated). A species-blind engine over data packs (D-001): `GEN_SPECIES` (v1: Kobold, 2014 MPMM as a
  flagged substitution — Draconic Cry, Legacy d6 with Craftiness-skill/d20-sorcerer-cantrip sub-tables,
  Wings d20), `GEN_CLASSES` (all 12 XPHB classes as fixed iconic level-1 packages: saves, skills lists,
  AC calc, weapon lines w/ masteries, Bonus-Action features, spell kits, resource declarations, gear),
  `GEN_FEATS` (the ten origin feats, d10 = the complete legal set, with derivation hooks).
- **Pick-or-roll ritual (D-004):** every step is a visible die roll over a real table — stats in order
  (3d6 default / 4d6-drop-lowest), class (Plausible = d6 over the array's computed top-3 with a
  crew-stack penalty; Chaos = flat d12), background ASI +2/+1 (class default, overridable), origin
  feat d10, class skills (dN reroll dupes), species tables with sub-rolls — each overridable via
  "choose…", plus a one-tap "Roll everything". Identity (name required; quirk/trinket/last words
  optional) is TYPED, never rolled — the drafted Italian flavor tables were shelved at the session
  checkpoint and stay dormant in the pack data (D-009).
- **The card is a real statblock (D-010):** `genToMonster()` converts the derived character into a
  monster-shaped object (from `blankMonster()`) rendered by the app's own composer — features sorted
  into Traits / Actions / Bonus Actions, weapon + damage-cantrip action lines, an MM25-style
  Spellcasting action, the PC meta line where CR would sit. Raw stat dice show ONLY in the ritual.
  A pip **resource tracker** (Rage, Draconic Cry, slots, Luck…, declared in the packs) sits under
  living cards; spent state persists on the roster PC (`pc.gen.res`) DM-side, per-device on phones.
- **Adventure-tied crew (D-002):** the adventure kebab gains "Enable the crew generator"; the panel
  (under the party roster) carries species/settings (3d6|4d6 · Plausible|Chaos · ASI on|off — pushed
  to the share config live), the crew link (mint/copy/QR/stop), a DM-side roll button, living-crew
  chips (click → card, with ☠ Mark dead), and the **Caduti archive** (deaths counted, last words
  revealed, cards re-derivable forever from archived payloads).
- **Generated kobolds are REAL party PCs:** `genToRosterPC()` emits the normal roster shape (class
  chip, abilities with save-prof flags + caster main flag, skills preset with expertise) so the
  combat tracker treats them like any PC; `normalizeRosterPC` now carries the `gen` provenance
  through. Death removes PC from roster+party into `a.crew.fallen` (payload archived).
- **Crew mode (D-003):** `index.html?crew=<id>` boots a standalone phone screen (same isolation
  stance as player mode — the DM library never loads): claim a name once, roll through the same
  ritual, get the statblock card + tracker; "è caduto — roll the next one" marks the death and rolls
  the replacement. Share node = `{v,kind:"crew",cfg,crew:{<pid>:{pn,deaths,cur}}}`; each device PUTs
  only its own `crew/<pid>` subtree (schema round-tripped against the real RTDB).
- **Trust boundary (D-007, the one deliberate deviation from the old handoff):** the wire carries
  ONLY roll results and picks plus two capped free-text fields (player name, identity fields) —
  never derived stats. The DM app re-derives every character locally through
  `validateGenPayload` → `deriveGenChar`; hostile payloads (fake classes, out-of-range dice, dupe
  skills, markup in strings) are rejected or rebuilt clean. DM polls the node every 12s while the
  panel is open; one living PC per device slot — a re-rolled payload retires its predecessor into
  the archive (with its last words as the toast).
- **Floors:** `test/gen.test.js` (pack schema + locked dice + a 240-seed legality batch: HP ≥ 1,
  attack = mod+PB, DC = 8+PB+mod, ASI legality, determinism, all 12 classes reachable; hostile-payload
  boundary; resources + statblock conversion; roster bridge; craftiness reroll guard) and
  `test/crew-flow.test.js` (DOM end-to-end: enable → ritual → save → card → death → archive; the
  full phone flow with a patched transport asserting the payload-only wire; DM replace/dedup
  semantics). Baseline now **97 tests**. Live-browser eyeballing was BLOCKED this session (the
  preview pane refused all navigation) — components were verified headless and via captured-HTML
  artifact; visual pass on localhost:8753 still owed.
- Cut to backlog (D-006): print stylesheet (2-up A4), crew JSON export/import, more species packs.

## Batch 278 — T2.4: concentration (the link, the prompt, the cascade)
- **The effect→source link:** a condition instance added with a known caster carries `concBy` (the
  caster's combat-instance id). The add-effect popover reveals a **"concentration by" picker** for any
  effect whose payload has `conc:true` — defaulting to whoever's turn it is (effects are usually added
  as they're cast), with a "Not tracked" opt-out that degrades to the old manual behavior. Picking a
  conc effect pauses for the caster the same way T2.3 pauses for a DC. Adding with a source lights the
  caster's concentration flag and applies the **new-cast-replaces-old rule**: the caster's linked
  effects with a DIFFERENT name end now ("ended (new concentration)"), same-name instances stay — one
  multi-target Bless adds several.
- **Damage → CON save prompt, now on the strip:** `changeHP` queues a `kind:"conc"` prompt (DC
  max(10, ⌊lost/2⌋); temp-HP loss counts as damage taken; each damage event is its own save, per the
  rules) whenever a still-up concentrating combatant takes damage — so multi-select damage and player
  write-backs prompt too, not just the HP popover. At 0 HP concentration just ends (B127), no save.
  The B124 inline popover prompt stays as the immediate affordance but now routes through the shared
  resolver (`rollConcSave`), clearing its queued strip twin either way.
- **The break cascade (`breakConcentrationOn`/`dropLinkedEffects`):** a failed save, the strip's
  "Breaks" verdict, a deliberate concentration toggle-off, dropping to 0 HP, and a player-reported
  conc-off all end EVERY linked effect across the order, cull the caster's now-moot conc prompts, and
  announce the full list. Prune rule: a conc prompt lives on the flag, not a condition.
- **Strip verdicts read as outcomes per kind:** save-ends = Ends/Continues; concentration =
  Breaks/Holds (`data-pend` = the decisive outcome). One-tap d20 uses the CON save bonus.
- **`test/concentration.test.js`** is the behavior floor (link + cascade + exceptName, the changeHP
  queue via a real combat ctx incl. the 0-HP path, DC formula parity with `concCheckPrompt`, conc
  pruning, resolver branches). Baseline now **84 tests**; verified live end to end (picker default →
  linked add → damage → both prompt surfaces → broken-roll cascade over three linked instances →
  re-cast replacement → toggle-off cascade → Holds), zero console errors.

## Batch 277 — T2.3: the duration engine (save-ends prompts on the strip skeleton)
- **The tracker now consumes `mech` for the first time.** `effectMechOf(name, effGroup)` in data.js
  resolves a tracked instance's payload (curated effect first — the "Slow" mastery/spell collision
  respects the group — else `CONDITION_MECH`, case-insensitive); `saveEndsEdge()` reads the repeat-save
  edge off it. Null payload still degrades to today's manual tracking, per the schema rules.
- **Save-ends prompts (Q2.B surface, skeleton form):** when a combatant reaches the edge named by an
  effect's `save` descriptor (Hold Person / Slow: end of its own turn), `combatAdvance` queues a prompt
  into `cb.prompts` (ticks run FIRST so an effect whose last round just expired doesn't also prompt;
  duplicates and dead owners are skipped). The strip (`combatPromptStripHTML`, `.ct-prompts`) renders
  under the round bar, DM-only, and persists until resolved: a one-tap d20 when the save bonus is
  derivable (DC known → auto-verdict + toast, like the B124 concentration roll; DC unknown → the total
  shows inline) plus explicit **Ends / Continues** verdicts — remind-first (Q2.A), the engine never
  rolls or removes anything on its own. Prompts are pointers, never copies: `prunePrompts` culls them
  when the condition is cured by hand or the combatant leaves. **The strip is a T2.5 placeholder —
  design it there, don't grow it feature-first here.** It stays out of the share snapshot (DM-only).
- **DC capture at add time:** picking a save-ends effect in the add-effect popover pauses for its DC
  (a revealed `.cond-dc` field, focused) instead of committing on click — the caster's DC is a
  per-instance fact the engine can't derive; it rides the instance as `dc` (schema T2.1). Committing
  without a DC is fine (the prompt then defers the verdict to the DM). A save-ends effect added with
  no explicit timing also defaults its tick edge from the descriptor (`endWhen:"end"`), so duration
  expiry and the repeat save land on the same edge the rules text names.
- **Save bonus generalized:** `combatSaveBonus(it, abil)` — monsters from the statblock (proficient →
  +PB), PCs from the roster sheet (`abilSave`), null for quick adds/events; `combatConSave` is now the
  CON specialization (concentration prompt unchanged).
- **Migration (T2.3 scope):** `migrateCombat(cb)` runs on every combat render — defaults the
  `cb.prompts` queue on pre-T2.3 combats and normalizes legacy condition instances (string entries →
  `{name}`, junk `rounds` coerced, nameless entries dropped). Idempotent and cheap.
- **`test/duration-engine.test.js`** is the behavior floor (mech resolution incl. the Slow collision,
  queue edge/owner/dedup/dead-skip, prune, resolve semantics, migration, save bonuses). Baseline now
  **77 tests**; verified live in the preview end to end (popover DC pause → strip → roll/verdicts →
  prune → expiry toast), zero console errors.

## Batch 276 — T2.2: the effect data pass (payloads from the 2024 text)
- **Every `CURATED_EFFECTS` entry now carries its `mech` payload, and `CONDITION_MECH` ships the 15
  XPHB 2024 conditions** (Exhaustion and Invisible are among the 15 — the B275 doc phrasing implied
  otherwise; corrected). All payloads transcribed from the XPHB text in the local 5etools mirror
  (v2.29.0: conditionsdiseases.json, spells-xphb.json, items-base.json itemMastery) — text open,
  never from memory, per the task.
- **Four curated texts had drifted from 2024 and were corrected while the source was open:**
  Resistance (2014's +1d4-to-a-save became 2024's reduce-damage-by-1d4-once-per-turn), Guidance
  (chosen SKILL, not any check), Invisibility + Sanctuary (both also end on DEALING damage),
  Hunter's Mark (the extra 1d6 is Force).
- **Schema extensions the data needed (documented in DEVELOPMENT.md, locked by test):** `once:true`
  (Sap/Vex spend on the next qualifying roll), flat `delta` + `perLevel:true` on bonus/speed
  (Exhaustion's −2/level d20 and −5 ft/level), `bonus.on:"d20"`, `end.on` = attacks·casts·
  dealsDamage, and three new `if` terms (unseen, sourceVisible, vsNonSource + beyond5).
- **New exports beside the data:** `EFFECT_ATOM_KINDS`, `EFFECT_IF_TERMS` (the closed vocabularies)
  and `EFFECT_CONTROL_W` (the T2.9 control-weight map, provisional until corpus calibration).
  **`test/effect-mech.test.js`** is the schema-integrity floor: every atom validates against the
  vocabularies, conc flags must match the text, and Paralyzed/Poisoned/Hold Person/Exhaustion are
  asserted against the rules text. Baseline now **67 tests**; verified live (payloads resolve through
  findCuratedEffect, corrected texts render, zero console errors). Nothing consumes `mech` yet —
  that's T2.3+ by design.

## Batch 275 — Phase 2 opens: Q2.A/Q2.B decided, T2.1 effect schema designed
- **Q2.A DECIDED (user, AskUserQuestion): REMIND-FIRST.** Chips state the mechanical fact, the DM
  rolls; every payload is still precise enough for per-class auto-apply to layer on later without a
  schema change. **Q2.B DECIDED: PROMPT STRIP** — a slim dedicated strip on the tracker where
  save-ends/concentration (later recharge, death saves, lair actions) queue; T2.5 mockups design it.
- **T2.1 — the effect schema (documentation only, no JS this batch):** DEVELOPMENT.md gains "The
  effect schema" — an optional `mech` payload on effect definitions: typed reminder **atoms**
  (adv/dis, autofail, autocrit, bonus dice, AC/speed deltas, incap/noreact, damage riders, immunity,
  and a verbatim `note` escape hatch so no rule ever gets contorted to fit), a repeat-**save**
  descriptor riding the existing `combatAdvance`/`endWhen` edges, **end** triggers, **conc** linkage,
  and condition `implies` chains. Payload homes: `mech` on `CURATED_EFFECTS` + a new `CONDITION_MECH`
  table for the 15 standard conditions + Exhaustion (their text stays from the parsed library; the
  mechanics are ours). Per the T2.1 requirement it was designed together with T2.9's classifier
  contract: control value scores from atom kinds (incap 1.0 → adv/dis 0.4; bonus/dmg/ac = 0), weights
  exported in one map shared by classifier, benchmark, and future designer math. Payloads are
  optional everywhere — no `mech` degrades to today's text-only behavior, so T2.2 lands incrementally.

→ archived 2026-08-10: Batch 274 and older (Phase 1 close + all prior batches) — `ARCHIVE.md#changelog-batch-274-and-older-phase-1-and-everything-before-it`
