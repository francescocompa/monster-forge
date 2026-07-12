# ROLE_CLUSTERS — T1.11 role-clustering spike (exhibits for the Q1.D naming session)

> Batch 266. **These are proposed clusters, not a taxonomy.** The names are yours to give (Q1.D);
> this memo is the raw material: what the math found, per-cluster profiles in plain units, and
> exemplars to look at. Regenerate with `node scripts/role-spike.mjs [k]` (needs the corpus, same
> convention as `npm run grade`; writes `scripts/role-spike-out.json`, gitignored).

## Method (short)

503 monsters from the 2024 MM corpus through the production import pipeline; 455 with an
ok-confidence DPR read are clustered, the 48 low-confidence ones are assigned to the nearest
cluster afterward and flagged (their damage feature is untrustworthy — they are the T1.5
controller blind spot, and they cluster like it).

**Features are CR-normalized** (each stat is measured against `crExpected` at the label CR), so
clusters capture *role*, not level. Continuous: AC delta, log HP ratio, log DPR ratio, nova shape
(best round vs mean — recharge/X-day spikes), accuracy delta, log speed ratio, log attack count,
condition breadth (distinct conditions inflicted, capped 4). Binary: rangedness (0 melee / ½ has a
ranged option / 1 has a long-range ≥80 ft option), AoE, flight, spellcaster, legendary, physical
resistance. Continuous features are z-scored (capped ±2.5), binaries bounded — a naive z-score run
let the rare physical-resistance flag dominate and produced one 359-monster blob. Weights favor
the role axes (damage, durability, rangedness, control). K-means (k-means++, 30 restarts),
silhouette across k=3–9: 0.170 / 0.168 / **0.179** / 0.171 / 0.164 / 0.148 / 0.162 — k=5 is the
statistical optimum; k=6 and k=7 trade a little cohesion for distinctions that matter at the
table. Deterministic (fixed seeds).

## The split hierarchy (how k grows)

- **k=5:** damage-forward strikers · big-HP low-AC brutes · condition/AoE controllers ·
  nova-flyer bosses (the dragon pattern) · under-statted low-CR critters.
- **k=6:** the critters split — slow weak meat vs **nimble glass skirmishers** (AC +1.2, HP 0.79×,
  DPR 1.11×: the same defensive budget spent the other way).
- **k=7:** the strikers split — **durable soldiers** (HP 1.05×, AC +0.6) vs **glass artillery**
  (DPR 1.45×, 41% long-range, 41% casters).

k=7 is the exhibit below — it is the most table-useful cut, and it lands strikingly close to the
4e role taxonomy (brute / soldier / artillery / skirmisher / controller / minion) derived here
from 2024 data alone. **Open question for Q1.D: how many of these earn a name?** (Too few = useless
for encounter shapes, too many = unreliable inference — T1.12's classifier has to reproduce
whatever you pick.)

## Exhibits at k=7 (all stats vs the CR-expected value)

### Cluster A — "durable soldiers" (n=87 · CR q1/med/q3 3/5/9 · humanoids, fiends, monstrosities)
DPR 0.92× · HP 1.05× · AC +0.6 · 2.4 attacks · 56% ranged option (22% long) · 29% casters.
At-expectation everything, slightly tough, multiattack: the standard elite warrior.
*Fire Giant (9), Spined Devil (2), Gnoll Pack Lord (2), Troll (5), Stone Giant (7), Bandit
Captain (2), Pirate (1), Quaggoth Thonot (3), Blue Slaad (7), Ice Devil (14).*

### Cluster B — "glass artillery" (n=51 · CR 2/4/8 · humanoids, beasts, monstrosities)
DPR 1.45× · HP 0.91× · AC −0.6 · 2.4 attacks · 51% ranged (41% long-range) · 41% casters.
Hits far above its CR and pays for it in durability.
*Bandit Crime Lord (11), Tree Blight (7), Priest (2), Merrow (2), Quaggoth (2), Ghoul (1),
Scout (1/2), Sahuagin Priest (2), Fiend Cultist (8), Cultist Hierophant (10).*

### Cluster C — "brutes" (n=85 · CR ¼/1/3 · beasts, fiends, monstrosities)
DPR 0.83× · HP 1.30× · AC −1.4 · 1.2 attacks · melee-first (15% ranged).
The meat wall: a third more HP, worst AC in the corpus, modest sustained damage.
*Mule (1/8), Pony (1/8), Giant Lizard (1/4), Minotaur of Baphomet (3), Hydra (8), Axe Beak (1/4),
Needle Blight (1/4), Reef Shark (1/2), Giant Hyena (1), Goristro (17).*

### Cluster D — "glass skirmishers" (n=64 · CR ⅛/¼/2 · beasts, monstrosities, fey)
DPR 1.07× · HP 0.79× · AC +1.1 · 1.1 attacks · 30% fliers · fast for their band.
The brute trade in reverse: hard to hit, folds when hit, keeps expected damage.
*Slaad Tadpole (1/8), Giant Seahorse (1/2), Sphinx of Wonder (1), Bullywug Warrior (1/4), Priest
Acolyte (1/4), Giant Rat (1/8), Giant Weasel (1/8), Grimlock (1/4), Imp (1), Swarm of Venomous
Snakes (2).*

### Cluster E — "controllers" (n=57 · CR 3/6/11 · monstrosities, aberrations)
2.6 distinct conditions inflicted · 49% AoE · DPR 0.88× · fast (46 ft) · 12% legendary.
Damage under label because the budget went to grabs, stuns, petrification, frightens.
*Cockatrice Regent (8), Vampire Spawn (5), Giant Crocodile (5), Hill Giant (5), Remorhaz (11),
Vampire Familiar (3), Wolf (1/4), Grell (3), Brazen Gorgon (9), Death Tyrant (14).*

### Cluster F — "nova flyers / the dragon pattern" (n=55 · CR 3/8/17 · 39 of 40 ok-conf dragons)
Nova 0.4 (recharge spikes) · 95% AoE · 82% fliers · 38% legendary · DPR 1.29× · AC +0.8 · speed 63.
This cluster IS the T1.5 "dragons run hot" outlier family, isolated by the math.
*Red Dragon Wyrmling (4), Adult Black Dragon (14), Bronze Dragon Wyrmling (2), Young Blue
Dragon (9), Adult Green Dragon (15), Ancient Black Dragon (21), Hell Hound (3), Gold Dragon
Wyrmling (3), Adult Gold Dragon (17), Ancient Copper Dragon (21).*

### Cluster G — "weak critters" (n=56 · CR 0/½/2 · beasts)
DPR 0.58× · HP 0.73× · AC −1.0 · 23% physical resistance (the swarms/incorporeals live here).
Under label on every axis — the CR floor population (a Cat is not ⅛ of a Goblin).
*Baboon (0), Bearded Devil (3), Octopus (0), Giant Boar (2), Jackal (0), Crab (0), Cat (0),
Boar (1/4), Specter (1), Shadow Demon (4).*

### Where the 48 low-confidence monsters land (assigned post hoc, damage feature untrustworthy)
Controllers get the biggest share — Aboleth, Roper, Ettercap, Carrion Crawler, Vampire, Sphinx of
Valor et al. land in cluster E, exactly the T1.5 finding (control/curse monsters are what the
extractor can't read). The rest scatter thinly; the full lists print with every run.

## Corpus findings along the way (standing directive: recurring patterns)

1. **Every ok-confidence 2024 monster anchors its offense on attack rolls** — the save-DC-anchored
   feature had literally zero variance on the clustered set, so it was dropped. Save-only offense
   co-occurs with an unreadable DPR (the controller blind spot), never with a clean read.
2. **No monster in the 2024 MM is ranged-only.** Everyone gets a melee fallback; rangedness is a
   spectrum (has an option → has a long-range option), not a class.
3. **The defensive budget bends two ways from the same point:** brutes (HP 1.30× / AC −1.4) and
   glass skirmishers (HP 0.79× / AC +1.1) are mirror images; the corpus almost never grants both.
4. **Physical resistance concentrates in the weak-critter band** (23% vs ~3% elsewhere) —
   consistent with T1.3's finding that it is the only resistance the HP budget actually pays for.
5. **The dragon pattern is a design template, not a family quirk:** nova + AoE + flight +
   legendary co-select as one bundle (Hell Hound and elementals cluster with dragons).
6. **Low-CR labels are floors, not estimates** — the critter cluster reads 0.6–0.7× on both axes.

## Second sweep (same batch, user-directed): five locked roles × a stature axis

The user locked the roles — **soldier · artillery · brute · skirmisher · controller** — and called
nova-flyer/critter what they are: not roles. The second sweep (`scripts/role-map.mjs`) implements
the two-axis model:

- **ROLE** by nearest centroid over role features only (stature signals — legendary, nova,
  physRes — excluded). The old nova-flyer cluster dissolves into artillery (26: young dragons,
  whose breath IS their damage) and soldier (14: adults/ancients, whose Rends outweigh it); the
  critter cluster into skirmisher (28) and brute (23).
- **STATURE — RELATIVE to party level (user insight, B267 revision).** The first attempt keyed "boss"
  to legendary actions, which only exist at high CR, so it found bosses nowhere else — backwards. A boss
  is a monster that stands alone against a party of a given level; the same body is a minion to an
  over-levelled party. So stature = **intrinsic packaging × (CR − party level)**:
  - **Packaging** (intrinsic, all CRs): how concentrated/resilient a monster's budget is FOR ITS OWN CR.
    `packRaw = 0.5·(lhp+ldpr) − 0.3·|lhp−ldpr| + econ` (lhp/ldpr = clamped log2 of HP/DPR ratio; econ =
    attacks + legendary-resistance + legendary), z-scored → tiers heavy/elite/standard/light/minimal.
    The **imbalance penalty is the key move**: a damage sponge (HP, no offense) and a glass cannon (DPR,
    no HP) both score low — only a body above par on its *weaker* axis reads heavy. This is why
    boss-SHAPED monsters exist at every CR (Saber-Toothed Tiger CR2, Giant Constrictor CR2, Mummy CR3),
    not just where legendary actions do. Skirmishers never read heavy (budget buys evasion); soldiers/
    artillery concentrate elite/heavy; brutes/controllers span the range.
  - **Deployment stature — SIMPLIFIED to four (user call, B268): boss · elite · pack · minion.**
    `eff = (CR − L) + 1.8·packagingZ`, banded eff≥+2.5 boss / ≥0 elite / ≥−3 pack / else minion.
    "Standard" was unclear and is gone (its band splits into elite/pack); **swarm is a creature
    SUBTYPE, not a stature** — a Swarm statblock is pinned to deploy as pack; the **nova tag left the
    UI** (stays an internal recharge-spike signal for the encounter-designer math, T3.2).
  - **Pins that don't slide** (design intent): legendary actions → always boss (Adult Red Dragon stays
    boss at L20); Swarm subtype → pack; Pack Tactics biases elite→pack. Note: this is coarse
    (CR≈level heuristic); the real budget math is T3.2's job.
- **Reading between the numbers** (per the user's directive, samples read in full): 2024 sprinkles
  on-hit rider conditions everywhere (the Hill Giant's Prone-on-club made it misread as
  controller), so the control signal now counts **save-gated conditions in full, riders at half**
  — keep this in T1.12's classifier. Honest borderline cases: Ghoul and Medusa read artillery on
  numbers, controller on kit (tie-break policy = naming-session decision). **Support is invisible**
  (the Priest's Divine Aid heals/buffs — no feature sees it); a support role would need Phase 2's
  effect vocabulary. Kraken reads boss controller off its grapple kit despite unreadable damage.

Full assignments + per-role profiles print with every `role-map` run; the interactive exhibit
(role dossiers, packaging crosstab, a **party-level slider** driving deployment stature, and per-role
**trend curves** over any feature pair) is the naming-session Artifact. Open decisions in its final
panel: stature names; whether the bestiary shows intrinsic packaging and lets the encounter designer
do the party-relative read; the borderline policy; whether nova/packaging surface as badges.

**Note — role vs stature and party level:** ROLE is intrinsic (a soldier fights like a soldier
regardless of who it faces). STATURE slides with party level. The user flagged this precisely:
a monster that's a boss for a low-level party is a pack member or minion for a high-level one,
*unless* it's design-pinned (legendary/swarm). Trend curves go fuzzy (dashed) at high CR where
data thins — the user called this out too.

## The skirmisher question (user, B268): why does the role vanish at high CR?

Answer: **mostly the Monster Manual, partly our model — and the model half is fixed.**
- **MM (real):** the classifier-free glass signature (AC ≥ +1 AND HP ≤ 0.85×) thins 16 / 15 / 9 /
  5 / 0 / 8 % across CR bands 0–1 → 17+, and low-HP bodies generally fall 44% → 8%. The MM stops
  publishing fragile bodies once one PC nova round would delete them; the evasion budget migrates
  into **speed** (band-average best speed 35 → 68 ft) and flight. High-CR "skirmishers" become fast
  flying soldiers.
- **Model (fixed in B268):** attacks/turn and speed rise with CR by design (band means 1.1 → 2.6
  attacks), and un-normalized they leaked LEVEL into ROLE — every high-CR monster got dragged toward
  soldier/artillery, reading 0% skirmishers at CR 9+. `role-map.mjs` now **centers atkN and spdR per
  CR band** before role assignment ("more attacks than a monster of this CR usually has"). After the
  fix, classified skirmisher runs 37 / 18 / 11 / 4 / 4 / 7 % — tracking the raw signature instead of
  dying. **T1.12's classifier must keep this band-centering.** Residual gap at CR 0–1 (37% classified
  vs 16% raw) is the CR floor: under-statted critters read skirmisher by shape but are minions by
  stature. Side effects of the fix, verified by reading blocks: Hill Giant → brute (fits the fiction
  better than its earlier soldier read); controllers GROW with CR (high-CR design is where grapples,
  gazes and lair-scale control get their budget).

## The visual series (user request, B268 — all in the Artifact)

1. **Role anatomy fingerprints** — five small multiples, one per role: deviation bars vs the corpus
   on damage / HP / AC / attacks / speed / control / ranged (center line = corpus mean, printed value
   = the role's average). Brute↔skirmisher mirror on HP/AC; artillery↔controller split on
   damage-vs-control.
2. **The two trade planes** — static scatters of all 503: defense (HP× vs AC delta) and offense
   (damage× vs save-gated conditions), with role-mean markers. The two budgets whose bends ARE the
   role distinctions.
3. **Where roles live on CR** — 100% stacked role-share bars per CR band + the raw-vs-classified
   skirmisher table (the evidence for the question above).

## What T1.12 builds on this

The classifier ships as a pure function over the SAME feature extraction (it lives in
`scripts/role-map.mjs`'s realm-side block — port it into data.js when T1.12 starts), predicting
role + stature as decided in Q1.D. Q1.E then sets the benchmark protocol before anything depends
on the labels.

## T1.14 — the benchmark verdict and the speed gate (B271)

The user's blind 100-monster pass (protocol: Q1.E; labels committed at
`scripts/role-benchmark-labels.json`, re-run = `npm run benchmark`) scored **68.3% clean / 75.0%
ambiguous vs the ≥85% gate** — top-2 contains the user's label 80/100. Misses in four groups:
**(A)** slow glass reading skirmisher → **fixed: hard speed gate** in `classifyRole` (at-or-below
band speed norm + no evasion kit + no flight ⇒ skirmisher excluded; demotes, never promotes). New
`evasive` feature: Flyby / no-OA movement / bonus-action Disengage-Hide (2024 phrasing lives in the
bonus SECTION without the words "Bonus Action") / leap kits / ethereal + teleport escapes. Mirrored
in `role-map.mjs` (evasive sourced from the shipped `roleFeatures` — regenerating constants keeps
the gate). Corpus: skirmisher 104→68, tracking the raw glass signature. **(B)** on-attack rider
conditions over-counting toward controller (Vampire Spawn, Tarrasque, Water Elemental) — **user
chose not to retune**; the half-weight rider rule stands as-is; revisit only with new evidence.
**(C)** kit-invisible control (Performers, Arch-hag, Roper, Slaadi) — the low-conf blind spot,
closes at T2.10 when effects become features. **(D)** genuine ambiguity: the dragon family,
Merrow, Abominable Yeti; Cloud Giant and Bandit Captain flagged as user labels worth a rethink.
**After A: 71.7 / 80.0 — the Phase-1 benchmark gate stays open pending T2.10** (user's policy).
A manual override (`m.roleOv`) ships in-app (Forge select + card-tag popover) as the escape hatch.
CAVEAT for re-runs: the set is no longer blind (the user has seen the model's answers), so treat
same-set improvements as provisional; T2.10's re-run is the honest checkpoint.

**B272 addenda.** Labels amended after the dispute protocol (AskUserQuestion with kit evidence —
the standing way to challenge a user label): **Bandit Captain → soldier** and **Wyvern → brute**
(user walk-backs); **Cloud Giant AFFIRMED skirmisher** — fly speed + at-will Misty Step + a 240 ft
incapacitating ranged attack; the low AC pays for a kit geared to skirmishing tactics (note: this
reasoning is exactly what the Phase-2 effect vocabulary must be able to see); **Satyr Revelmaster
AFFIRMED skirmisher** — the single-target Prance charm rider is its get-in/get-out tool; only Fey
Melody reads as an AoE controller feature. Re-score after amendments: **clean 75.0 / ambiguous
80.0**. Stature tier renamed **"minion" → "fodder"** (boss · elite · pack · fodder) — the old name
collided with the MCDM minion feature/tag, which keeps the word exclusively.
