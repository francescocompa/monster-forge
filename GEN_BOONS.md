# GEN_BOONS — the boon-lists content proposal (D-050 follow-up)

> **Status: PROPOSAL, nothing built.** His note (B307, D-050): boons become lists "like Quirks and
> Trinkets … we'll create a list later with several working boon options." This memo is the
> researched candidate content — sources first, then six shipped-list drafts plus an overflow pool.
> Every entry is written in OUR words at level-1 power; nothing lands in gen.js until he picks.
> Research base: the local 5etools mirror (v2.29.0, 272 reward entries + optional features + feats)
> and a web pass over the CC-licensed third-party SRDs (2026-08-13).

## 1 · What a boon has to be (the contract)

- **The grammar is the kobold's Draconic Boon table** (D-028): a d20 species-table row, `boon:true`,
  faces 1–12 = "No boon", 13–19 = one boon each, 20 = the big one. Old payloads stay valid; a
  disabled boon resolves to the no-boon entry (D-043).
- **The engine can express** (`fx` vocabulary, D-030): prose `trait`/`bonus`/`action` with
  `{DC:abil}` templating · `cast` grants (cantrip/spell, ability, freq) · `skill`/`resist` grants ·
  `speed`/`fly`/`darkvision`/`size` overrides · `res` resource declarations (n, per rest, `sr:N`).
  **Prose trait is the universal fallback** — remind-first means a sentence is always a legal boon.
- **Power band:** one 13–19 slot ≈ half an origin feat (a cantrip, one niche advantage, a 1/rest
  trick, +5 ft speed, one resistance-lite). The 20 ≈ a full origin feat (wings precedent). Rule of
  thumb: nothing that outshines a class's own level-1 feature.
- **Licence rule (D-042 stance):** CC-BY sources may land VERBATIM with attribution (SRD 5.1,
  SRD 5.2, Black Flag Reference Document). Non-SRD WotC content: mechanics may be adapted, the
  TEXT must be ours, and no Product Identity names (no "Charm of Euryale", no vestige names).
  Non-CC third party: inspiration only.
- **Wire boundary (D-007):** a SHIPPED list can carry full structured `fx`. If custom boon lists
  ever ship, they are **prose-trait-only** — a structured fx payload arriving from the
  world-writable share would be hostile mechanics, and there is no closed domain to validate a
  free-text `cast` or `res` against. Flagged as a design gate below.

## 2 · Sources investigated

### Official (5etools mirror, adaptable mechanics / our text)

| Set | Count | Level-1 fit | Notes |
|---|---|---|---|
| XDMG Charms | 12 | ★★★ | spell-in-a-pocket, limited uses — the cleanest boon shape |
| XDMG Blessings | 7 | ★ | +2 ability / +1 AC — campaign rewards, too flat for a table |
| DMG'14 Epic Boons | 26 | ★ (scaled) | epic tier; a few scale down (Luck → d10 after the roll) |
| XPHB Epic Boon feats | 29 (6 in SRD 5.2) | ★ (scaled) | Combat Prowess / Fate / Night Spirit / Truesight are CC — usable scaled down |
| IDRotF Charms | 15 | ★★★ | chwinga gifts: snowball strike, snow walker, biting cold — charge-based riders |
| BMT Charms | 23 | ★★ | card-themed: Fates (+d10), Key (weapon imbue), Comet, Fool — great trickster seeds |
| GGR Guild Charms | 10 | ★★ | one-shot spell menus + a reaction trick each |
| ToA Charms + Inhabitations | 9 + 9 | ★★ | Nine Lives, Treasure Sense; inhabitations = boon-with-a-cost |
| BGDIA Devil Charms | 7 | ★★ | infernal favours: Hellish Rebuke, Many Tongues, the Adamant |
| CoS Dark Gifts (Amber Temple) | 17 | ★★★ | THE boon-with-a-visible-cost model: gift + mark + flaw |
| VRGR Dark Gifts | 8 | ★★★ | character-creation grade: Mist Walker, Living Shadow, Watchers |
| FTD Draconic Gifts | 8 | ★★★ | directly extends the kobold table: Senses, Tongue, Scaled Toughness, Familiar |
| MOT Supernatural Gifts + Piety | 10 + 60 | ★★★ | Heroic Destiny, Pious, Unscarred, Inscrutable — heroic-gift band; piety = future deity lists |
| EFA Charms (planar) | 16 | ★★ | one per plane — a "planar touch" list seed |
| CRCotN Fragments of Suffering | 9 | ★★ | psychic mutation riders with a haunt |
| Optional features (FS/EI/MM/MV/AS/RN) | 100+ | ★★★ | the "flexible class features" quarry: styles, maneuvers, invocations, metamagic, runes |

### Third party (web pass)

| Source | Licence | Verdict |
|---|---|---|
| **Black Flag Reference Document** (Kobold Press / Tales of the Valiant) | **CC-BY-4.0 + ORC** | 21 named talents in the background-granted band — Touch of Luck, Field Medic, Aware, Combat Conditioning. **Verbatim-usable with attribution**, the same deal as the SRD trinkets. |
| **A5E SRD** (Level Up) | CC-BY-4.0/OGL/ORC | No direct boon analog in the open document (destinies are motivation mechanics); paragon gifts are level-10 heritage features. Pass. |
| Tal'Dorei Reborn (Blessings of the Gods, Fortune's Grace) | closed | Inspiration only: the "blessed survivor" concept feeds List D. |
| Grim Hollow, MCDM | closed | Transformations/boons are multi-level arcs — wrong band, closed licence. Pass. |
| Homebrew d100 perk tables (Chartopia #25659 and kin) | n/a | Tone reference for the flavour end (perks that read like quirks with teeth). |

## 3 · The candidate lists

Six lists in the shipped grammar (13–19 + a 20), one entry per line:
**face · Name — mechanic (one line, our text) · [source seed] · fx feasibility**.
A crew picks ONE list (replace-not-extend, D-049); the kobold's existing table stays the species
default for kobold crews.

### List A — Veteran tricks (the flexible class features)

The cross-class dip list. Strongest of the six — every entry borrows a real class lever.

- 13 · **Drilled stance** — you know one Fighting Style (roll d10 on the XPHB styles table you already ship). [XPHB FS · BFRD parallel] · fx trait; **interacts with D-037 kit `fits` — the armor-tie in `genKitTags` was built for this**
- 14 · **One good trick** — one Battle Master maneuver with a single d6 superiority die, regained on Short Rest. [XPHB MV:B] · fx trait + `res{n:1,per:"short"}`
- 15 · **Reserves** — Bonus Action, regain 1d10 + your level HP; 1/Short Rest. [Second Wind] · fx bonus + res
- 16 · **Field medic** — stabilize as a Bonus Action; a creature you patch regains +1d6 HP when it spends Hit Dice within an hour. [BFRD Field Medic, **CC verbatim-adaptable**] · fx trait
- 17 · **Honed craft** — Expertise: double proficiency in one skill you already have. [Rogue/BFRD Trade Skills] · fx trait (card note on the skill line)
- 18 · **Adept** — you know one cantrip from any class list (roll on the all-cantrips union — `GEN_ALL_CANTRIPS` already exists), best mental ability. [Magic Initiate half] · fx `cast{cantrip:"sub"}` — the sub-table mechanism is live today
- 19 · **Touch of luck** — once per Long Rest, after seeing your d20, roll a d8 and add it. [BFRD Touch of Luck, **CC** · BMT Fates] · fx trait + res
- 20 · **Initiate** — one 1st-level spell from any class list, castable once per Long Rest without a slot. [Magic Initiate] · fx `cast{spell,freq}` — live today

### List B — Pocket charms (spell-in-a-pocket)

The XDMG/IDRotF charm shape, recast from "vanishes when spent" to per-rest so the pip tracker
(D-020) carries it. Mostly `cast` grants — the cheapest list to build.

- 13 · **Everflame spark** — you know the Light cantrip; 1/Long Rest, cast Faerie Fire (best mental). [IDRotF Purplemancy] · fx cast
- 14 · **Feather token** — 1/Long Rest, Feather Fall as a reaction, no components. [XDMG Feather Falling] · fx cast
- 15 · **Mender's knot** — 1/Long Rest, Cure Wounds (WIS), no components. [IDRotF Cure Wounds] · fx cast
- 16 · **Cold-iron pellet** — Bonus Action, wreathe your weapon: +1d6 cold on hits for 1 minute; 1/Short Rest. [IDRotF Biting Cold] · fx bonus + res
- 17 · **Whisper shell** — you know the Message cantrip, no components, and can make your voice carry 300 ft for a minute, 1/day. [VRGR Whispers · FTD Tongue] · fx cast + trait
- 18 · **Traveler's twig** — 1/day, for 10 minutes you and allies within 15 ft ignore difficult terrain. [IDRotF Snow Walker] · fx action + res
- 19 · **Nine-lives bead** — the first time you would drop to 0 HP each Long Rest, drop to 1 instead. [ToA Nine Lives · MOT Heroic Destiny] · fx trait + res
- 20 · **Vanishing step** — 1/Short Rest, Misty Step. [VRGR Mist Walker · GGR Dimir] · fx cast + res

### List C — Dark gifts (a boon with a visible cost)

The Amber Temple model: every face grants something AND marks the character — the mark is flavour
text on the card, the mechanic stays a rider. Pairs beautifully with the Caduti tone.

- 13 · **Spider's patience** — climb difficult surfaces, even ceilings, without checks; a blind extra eye sits somewhere on you, always open. [CoS Drizlash] · fx trait
- 14 · **The whisperers** — you know Message (no components); only you hear the spirits that carry it, and they never quite shut up. [VRGR Gathered Whispers] · fx cast + trait
- 15 · **Disobedient shadow** — you know Mage Hand; the hand is your own shadow's, and your shadow doesn't always do what you do. [VRGR Living Shadow] · fx cast + trait
- 16 · **Grave-fed vigor** — +5 HP maximum; each dawn you must have eaten something no living person would call food. [CoS Yog · Tarakamedes' diet] · fx trait (hp delta — small vocabulary extension or prose)
- 17 · **Deathly touch** — 1/Short Rest, an unarmed strike deals +1d10 necrotic; your hands are cold as riverbed stones. [VRGR Touch of Death] · fx action + res
- 18 · **Kingmaker's poise** — advantage on Persuasion; you cannot gracefully take no for an answer, and everyone can tell. [CoS Zantras] · fx trait
- 19 · **The watchers** — small shadow-beasts follow you; 1/Long Rest, ask the DM what one of them saw within a mile in the last hour. [VRGR Watchers] · fx trait + res
- 20 · **Skeletal wings** — Fly Speed 30 ft on bone-bare wings; you must eat a handful of bones or grave dirt daily or lose them until you do. [CoS Tarakamedes] · fx `fly:30` + trait

### List D — Heroic gifts (destiny and blessing)

The Theros band — the table's "chosen one" seat, no cost attached.

- 13 · **Destined** — advantage on Death Saving Throws. [MOT Heroic Destiny] · fx trait (the D-046 widget reads it as a reminder)
- 14 · **Pious** — 1/Long Rest, reroll a failed saving throw. [MOT Pious] · fx trait + res
- 15 · **Unscarred** — 1/Short Rest, reaction when damaged: reduce the damage by 1d12 + CON. [MOT Unscarred] · fx trait + res
- 16 · **Lifelong companion** — allies within 5 ft of you have advantage on saves against Charmed and Frightened. [MOT Lifelong Companion] · fx trait
- 17 · **Oracle's glimpse** — 1/Long Rest, ask the DM one yes/no question about the coming hour; the answer is honest but unadorned. [MOT Oracle · Augury] · fx trait + res
- 18 · **Warded soul** — 1/Long Rest, Protection from Evil and Good on yourself, no components. [MOT Iconoclast] · fx cast + res
- 19 · **Inscrutable** — resistance to psychic damage; Insight checks against you have disadvantage. [MOT Inscrutable] · fx resist + trait
- 20 · **Godsblood** — one ability score of your choice increases by 2 (max 20). [XDMG Blessings] · fx trait (score delta — needs the same small extension as C-16, or the ASI machinery)

### List E — Trickster charms (fey and card-magic)

GGR/BMT/Witchlight energy — the comedy seats, tuned for one-shots.

- 13 · **Jester's tongue** — you know Vicious Mockery, best mental ability. [IDRotF] · fx cast
- 14 · **The key** — 1/Long Rest, touch a nonmagical lock or latch: it opens. [BMT Key · Knock-lite] · fx action + res
- 15 · **Thread of fate** — 1/Long Rest, after any creature's d20 roll within 60 ft, add or subtract 1d4. [BMT Fates · Guidance-adjacent] · fx trait + res
- 16 · **Cat-fall** — you always land on your feet; ignore the first 20 ft of any fall. [Slow Fall-lite] · fx trait
- 17 · **Borrowed face** — 1/Long Rest, Disguise Self, no components. [GGR Dimir flavour] · fx cast + res
- 18 · **Pocket wonders** — you know Prestidigitation, and small lost objects (a coin, a die, one key) turn up in your pockets a scene later. [BMT Fool · trinket-list crossover] · fx cast + trait
- 19 · **Fool's luck** — 1/Long Rest, when an attack roll against you would crit, it becomes a normal hit. [Adamant-lite, BGDIA] · fx trait + res
- 20 · **Minor wish** — 1/adventure, duplicate any cantrip you have SEEN cast during this adventure. [BMT Moon, drastically scaled] · fx trait (pure DM adjudication, remind-first)

### List F — Draconic gifts (the kobold table, grown species-agnostic)

Extends the existing table's theme so a Random-species crew can still run a dragon-cult one-shot.
The kobold pack's own table remains untouched (D-028 payload compatibility).

- 13 · **Dragon's tongue** — you speak, read and write Draconic; advantage on Persuasion with dragons and their servants. [FTD Tongue] · fx trait
- 14 · **Scaled hide** — while you wear no armor, your AC is 13 + DEX. [FTD Scaled Toughness, recut to the band] · fx trait (the composer already handles unarmored AC recipes)
- 15 · **Dragon senses** — Darkvision 60 ft (or +60 ft if you have it); advantage on Perception checks relying on smell. [FTD Senses] · fx `darkvision:60` + trait
- 16 · **Breath echo** — 1/Short Rest, a 15-ft cone of the gift's element: 2d6 damage, DEX {DC:con} half. [kobold Dragon's Breath, generalized] · fx action + res
- 17 · **Frightful moment** — 1/Long Rest, Bonus Action: one creature within 30 ft that can see you makes a WIS save ({DC:cha}) or is Frightened until the end of its next turn. [FTD Frightful Presence, one-target cut] · fx bonus + res
- 18 · **Hoard-sense** — you can smell precious metal and gems within 30 ft, though not their exact place. [ToA Treasure Sense] · fx trait
- 19 · **Draconic vigor** — resistance to the gift's element (roll d10: fire, cold, acid, lightning, poison…). [kobold Draconic Resistance, generalized] · fx `resist:"sub"` — live today
- 20 · **Pseudodragon familiar** — Find Familiar as a ritual; it is always a pseudodragon, statblock on the card. [FTD Draconic Familiar] · fx cast — **the D-025 familiar machinery already appends full statblocks**

### Overflow pool (bench strength, unplaced)

Planar touch (one EFA-style charm per plane — a full second list if a planar one-shot happens) ·
Guild favours (GGR: one faction, one favour — needs a setting) · Fragments (CRCotN psychic
mutations — darker than the Caduti tone wants?) · Piety tracks (MOT's 60 — a per-deity list system,
big) · Hellish rebate (BGDIA: 1/LR Hellish Rebuke when bloodied) · Biting retort (Balance: 1/SR
reaction, half the damage back as force — hot for the band, bench) · Snowball strike (IDRotF —
seasonal) · Symbiote (VRGR — roleplay-heavy, needs a willing table) · Second skin (VRGR alter-self
form) · Treasure-sense variants · BFRD Aware (can't be surprised while conscious — clean, CC,
maybe swap into List A) · SRD 5.2 Boon of Fate scaled (the d10-after-the-roll shape List E-15 uses).

## 4 · Decisions this raises (his calls, before any build)

1. **Where boon lists attach.** Today boons are SPECIES content (the kobold's table). Lists imply a
   CREW-level boon roll available to every species. Options: (a) crew list REPLACES any species
   boon table; (b) crew list rolls only for species without their own table; (c) the species table
   is just one more list in the picker, preselected for kobold crews. (c) reads cleanest against
   D-049's grammar.
2. **Custom lists: prose-only or not at all.** Shipped lists carry full fx; a DM-typed boon can
   only ever be a prose trait (wire boundary, §1). Even that is a new hostile-text surface —
   D-043 explicitly deferred DM-edited boon text. Option: ship the six lists with NO custom
   editing in round one; revisit after a playtest.
3. **The resource shape for charms.** "Vanishes after N uses" became per-rest powers here (the pip
   tracker's contract). If he wants true consumables, `res` needs a `per:"never"` variant — small,
   but a vocabulary change.
4. **Two tiny fx extensions** would unlock four entries: an `hp:{delta}` rider (C-16) and a
   `score:{abil,delta}` rider (D-20). Both are one-line derivation changes with validation caps —
   or both entries stay prose traits and the DM applies them by hand (remind-first says that's
   legal).
5. **Licence attributions to add if built:** Black Flag Reference Document (CC-BY-4.0, Kobold
   Press) joins the SRD 5.2 credit in README + the settings Credits card the moment one BFRD-derived
   entry lands verbatim (A-16, A-19; the rest are our text and need no credit — but credit SRD 5.2
   anyway if the scaled Boon of Fate shape ships).

## 5 · Sources (web pass)

- [Black Flag Reference Document](https://bfrd.net/) · [Black Flag SRD talents mirror](https://blackflagsrd.opengamingnetwork.com/player-characters/talents) · [Kobold Press licensing](https://koboldpress.com/black-flag-roleplaying/) — CC-BY-4.0 + ORC confirmed
- [A5E SRD](https://a5esrd.com/) — CC-BY-4.0, no boon analog in the open content
- [Tal'Dorei Reborn / Blessings of the Gods](https://criticalrole.fandom.com/wiki/Blessings_of_the_Gods) — closed licence, concept reference
- [Chartopia d100 Minor Character Perks](https://chartopia.d12dev.com/chart/25659/) · [Boons of the Major Arcana](https://groakette.itch.io/boons-of-the-major-arcana-a-character-benefit-tool-for-role-playing-games) — tone references
- Local 5etools mirror v2.29.0 (`~/Documents/D&D/5etool_mirror`): `rewards.json` (272 entries), `charcreationoptions.json` (VRGR dark gifts, MOT gifts, IDRotF secrets), `optionalfeatures.json`, `feats.json` (XPHB epic boons + `srd52` flags), `cultsboons.json`
