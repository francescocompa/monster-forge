# Beyond level 1 — feasibility spike for the crew generator (G9)

> Written 2026-08-10 (Batch 302). A written spike, no code. The question from TASKS G9: what would it
> cost to expand the crew generator past level 1, can 5etools `class.json` be condensed the way
> `parseRacesJSON` condenses races, and where would the wire and the validator have to change.
> **Output is a recommendation with a scope, not a plan of record — the direction is Francesco's.**
> Measurements below come from the local mirror (`5etools-v2.29.0/data/class/`) and from gen.js as of
> `69c8696`.

## 1 · What "level 1" means in the engine today

Level 1 isn't a parameter. It's an assumption compiled into nine places:

| Site | What it assumes |
|---|---|
| `deriveGenChar` — `pb=2` (gen.js:1832) | Proficiency bonus is a constant. It feeds every skill, save, attack bonus and spell DC. |
| `genHdMax()` → `1` (gen.js:2196) | One hit die, because one level. The HP block's footer renders from it. |
| statblock meta `{k:"level",v:"1"}` (gen.js:2088) | The card says level 1 in prose. |
| `GEN_CLASSES[cls].caster` | `cantrips`/`prepared`/`slots` are fixed numbers per class, not a progression. |
| `GEN_CLASS_SPELLS` (gen.js:306) | The shipped spell index is **cantrips and level-1 spells only** — it is also the validation domain. |
| Species packs (gen.js:136) | PB-scaled uses in trait text are **baked at 2**. |
| `res` declarations | Every resource's `max` is a level-1 count (Rage 2, slots 2, Second Wind 1). |
| `GEN_CLASSES[cls].gp` | Starting gold is a level-1 concept. A level-3 character doesn't roll it. |
| `featureOpt` | The option tables are the level-1 choices (Fighting Style, Divine/Primal Order, the five L1 invocations, Rogue expertise). |

Only the first three are one-line changes. The rest are content shapes that currently have no level axis.

## 2 · What levels 2–5 actually cost (measured, XPHB, all twelve classes)

| Level | Class features | The new axis it opens |
|---|---|---|
| 2 | **22** | Nothing structural. More resources (Action Surge, Cunning Action, Wild Shape), slots 2→3 for full casters. |
| 3 | **16** | **Subclasses.** 2024 puts the subclass at level 3 for every class: **48 XPHB subclasses**. |
| 4 | **13** | **ASI / general feats.** The generator knows the ten *origin* feats; the general-feat catalogue is a content axis it has never had. |
| 5 | **16** | **PB → +3**, Extra Attack (rewrites the composer's attack entries), and **spell levels 2 and 3** for full casters. |

**67 class features across levels 2–5**, plus **162 subclass features at levels 3–5** spread over those
48 subclasses. For scale: the whole eleven-species pack arc (B288–B291, `fx` vocabulary + parser +
his review round) was four batches and carried far less content than the subclass axis alone.

The cliff is **level 3**, and it is not a slope — it is a step. Everything before it is arithmetic;
everything from it is a second content library the size of the species work, times four.

## 3 · Can `class.json` be condensed like `parseRacesJSON` condenses races?

Partly, and the part that doesn't condense is the expensive part.

`parseRacesJSON` works because a race decomposes cleanly into **basics** (size, speed, darkvision — exact),
**marked choices** (→ synthesized pick-or-roll tables) and **everything else** (→ verbatim prose traits).
The 5etools class files are structurally friendly to the same treatment:

- `classFeatures` is a flat list of `"Name|Class|Source|Level"` references, so **filtering to a level is trivial**.
- `classFeature` / `subclassFeature` hold the entry bodies in the same `entries` shape the race parser
  already walks and the app's composer already renders.
- `classTableGroups` carries the progressions as **machine-readable rows indexed by level** — spell
  slots per spell level, cantrips known, prepared count, Sneak Attack dice, Rage count. This is the
  cleanest part of the data, and it is exactly what §1's rows 4 and 7 need.

What does **not** condense:

1. **Features the card must compute, not print.** Extra Attack changes the attack entry; Sneak Attack
   scales a damage line; Wild Shape appends a statblock. These are the same problem the species `fx`
   vocabulary solved, but the species vocabulary was built for *level-1 grants* — a flat set of
   traits, casts, resists and overrides. Progression needs a vocabulary that scales, and a rule that
   fires on a level threshold. That is a genuinely new engine, not a wider table.
2. **Choices that cascade.** A subclass picked at 3 changes what levels 4 and 5 grant, and for some
   classes what spells are on the list. `parseRacesJSON` never has to model a choice that changes a
   later choice's domain.
3. **The spell index.** Levels 2 and 3 multiply `GEN_CLASS_SPELLS`, which ships in-code and doubles as
   the validation domain. This is bulk rather than difficulty — but it is real bulk in a no-build file.

**Verdict on the parser question:** yes for prose and progressions, no for mechanics. A `parseClassJSON`
could plausibly deliver levels 2–5 as *readable text plus correct numbers* in roughly the effort of
`parseRacesJSON`. Delivering them as a *derived statblock the tracker can run* is the other 80%.

## 4 · The wire and the validator

Smaller than the content, and mostly mechanical:

- **Payload `v:2` → `v:3`** with a `lvl` field. `validateGenPayload` already replays the availability
  chain against a scratch draft (D-038/D-040), so the pattern holds — but every closed domain it
  checks becomes **level-indexed**: the subclass domain per class, the spell domain per spell level,
  the feat domain per ASI taken.
- **The crew cfg gains a level**, and the DM's cfg stays the authority exactly as it does for gold and
  boons today (D-043's tolerant precedent: a stale phone degrades rather than failing the character).
- **`deriveGenChar`** takes the level: `pb` becomes `pbForLevel(lvl)`, `genHdMax()` returns it, the
  meta line prints it, resource `max` reads the progression row.
- **Nothing new crosses D-007.** Levels stay payload-side; the DM re-derives. The trust boundary is
  unaffected, which is the one genuinely reassuring finding here.

Estimate for the wire and validator alone, given level-aware content already existing: **~1 batch.**

## 5 · The options, with scope

| | Scope | What you get | What it costs |
|---|---|---|---|
| **A · Stay at level 1** | 0 | The premise stays intact: "death → next kobold in seconds". | Kobolds keep dying to a single hit, which is the actual complaint underneath the question. |
| **B · Level 2 only** | ~2 batches | +1 hit die, slots 2→3, one or two features per class. No subclass, no ASI, no new spell levels. A one-shot that survives the first ambush. | 22 features to transcribe. Nothing structural — every §1 assumption except the spell index moves once and stays moved. |
| **B′ · A "hardened crew" dial (numbers only)** | ~1 batch | HP, hit dice, PB and slots scale by a crew setting; **no new features**. | It isn't D&D levels and shouldn't claim to be. Honest label required ("tougher crew", not "level 3"). |
| **C · Levels 2–3** | ~10–14 batches | Subclasses. The generator becomes a character builder. | 48 subclass packs, a progression-aware `fx` successor, cascading choice domains. A second crew arc. |
| **D · Full 2–5** | ~20+ batches | Everything, incl. general feats, spell levels 2–3, Extra Attack in the composer. | Larger than every crew batch shipped to date, combined. |

## 6 · Recommendation

**B′ first if the real problem is fragility; B if the real problem is level 1 itself; not C or D as a task.**

The question G9 asks is "can we expand to more levels". The question the table is asking is probably
"why does my kobold die to one hit". Those have different cheapest answers, and B′ answers the second
one in a batch without pretending to be a character builder.

C and D are feasible — nothing in the data or the architecture blocks them, and the wire is the easy
part. But they are an arc, not a task, and they would change what the generator *is*: the current
design earns its speed by being a closed, fixed, level-1 package where every option is a die roll.
A subclass is the first choice a player would genuinely want to *make* rather than roll, and once
levels 4–5 arrive the ritual is a character builder with a random button, which is a different product
than the one D-001 scoped.

**Reopen C only if a real campaign — not a one-shot — starts using the crew.** That is the condition
that would make it worth it, and it hasn't happened yet.

## 7 · What I need from Francesco

A direction: **A**, **B**, **B′**, or "keep C on the table for later". G9 is done when that is picked.
