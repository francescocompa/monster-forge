# ROADMAP — Monster Forge, the next twelve phases

> Long-range plan agreed 2026-07-08 (Fable session, three AskUserQuestion rounds; revised the same
> day — the encounter simulator was cut in favor of the guided encounter designer). This file is the
> source of truth for *where the project is going*; `CHANGELOG.md` stays the record of *what shipped*.
> Maintain it like the handoff STATE block: edit in place, mark phases as they ship, never stack
> superseded versions. When a phase completes, collapse its task list to a one-line "shipped in
> B<n>–B<m>" note.

## Decision log (locked 2026-07-08)

- **Track:** hybrid ladder — value-first ordering. Three table-usable phases on today's stack,
  then the foundation rebuild, then the features those foundations unlock.
- **Breakable foundations:** the no-build rule (Phase 4), the Firebase snapshot+poll model
  (Phase 6), web-only delivery (Phases 6/12). **Until Phase 4 actually ships, the no-build rule
  in CLAUDE.md stands unchanged** — Phases 1–3 are built classic-scripts, shared scope, as ever.
- **Sacred:** 5e (2024) as the one and only rules target. The effect engine (Phase 2) is rules-as-data
  *for 5e*, not a system-agnostic engine. No user accounts/logins — identity stays device-keyed.
- **AI:** optional module only (Phase 11). Client-side key, off by default, zero missing-feeling
  without it. Never a dependency of any other phase.
- **Tactics:** tiered — abstract zones ship in Phase 9; a full grid map is *defined but unscheduled*
  (build only if zones prove insufficient in real play).
- **Encounter designer, not simulator (rev. 2026-07-08):** the Monte Carlo simulator is **cut
  entirely** — too easy to clone shallowly to be the innovation, and guidance must stay explainable.
  Phase 3 is the guided encounter designer: dramatic intent (encounter shapes) → role slots →
  library match / scale-to-fit / forge-to-brief. All judgments come from static, testable math
  (action economy, role balance, budgets) — never black-box simulation runs.
- **Combat roles:** our own math-derived taxonomy (naming is Francesco's design pass), gated by a
  hard validation requirement — a human-labeled benchmark must confirm the math finds the real
  role; features the math can't compute (control/support living in rider text) are handled via
  the P2 effect tags and a manual override, not ignored.
- **Prep scope:** encounter-level now; adventuring-day attrition guidance is *defined but
  unscheduled* (same tiering discipline as the grid).
- **Bridges in scope:** QR-linked printed tokens (P12), Notion lore sync (P10), table stage
  display (P8).

## Ground rules that apply to every phase

- Every new surface or visual rework starts as **mockup + AskUserQuestion iteration** (the B5
  init-card pattern) before code. Francesco owns every design call.
- `npm run verify` after any JS edit; `CHANGELOG.md` batch entries as always. Tasks below are
  scoped to be batch-sized (one to a few batches each).
- **Playtest gates:** a real DM session must pass between the end of each foundation phase (4, 5, 6)
  and the start of the next. Preview-verified is not table-verified.
- Player-supplied data stays untrusted at ingestion regardless of transport (the B250 lesson);
  every sync rework re-verifies the sanitize/escape boundary.

---

## Phase 1 — Monster math engine

**Goal:** CR is computed, not guessed; any statblock scales to any CR.
Expands the existing CR calculator/adjuster plan into a general math layer.

- **P1.1 CR data tables.** Verify and complete the DMG-model tables in `data.js` (expected AC, HP
  range, attack bonus, save DC, DPR per CR 0–30, plus XP — partially present already). Pure data
  plus accessors, unit-tested.
- **P1.2 Defensive CR.** Effective-HP calculator: HP × resistance/immunity multiplier (per-tier),
  ± AC adjustment steps against the expected AC for the HP tier. Pure function + tests.
- **P1.3 Offensive CR.** DPR extractor: best-3-round average parsed from statblock entries via the
  existing `attackText`/`exprAvg` machinery — multiattack, recharge (probability-weighted),
  save-for-half, rider damage. Returns a confidence flag for entries it can't parse.
- **P1.4 Calculator UI.** Panel/popover off the Forge CR field: defensive CR, offensive CR,
  suggested final, and the divergence line ("you set CR 5; the stats read as CR 7").
  *Mockup + AskUserQuestion before build.*
- **P1.5 CR adjuster, suggest mode.** Given a target CR: a concrete edit list (AC ±n, HP dice,
  attack/DC ±n, damage dice) that lands the target, rendered as accept-per-line suggestions.
- **P1.6 CR adjuster, auto-scale mode.** One-click proportional rescale, chassis-aware, one
  reversible step in `_forgeHist`, respects locked fields. *Open design question to settle first:
  which fields auto-scale may touch.*
- **P1.7 Bestiary audit.** Library cards show computed-vs-set CR divergence; a bulk "audit my
  bestiary" pass lists outliers.
- **P1.8 Combat-role inference.** Classify any statblock — preset, imported, homebrew — into
  combat roles from its stat profile (AC-to-HP ratio, DPR shape, speed, range profile, save DCs).
  The taxonomy is ours and math-derived: cluster the preset corpus first, then a naming/design
  pass with Francesco. Role badge on library cards; bestiary filterable by role.
- **P1.9 Role validation benchmark.** The hard gate P1.8 must pass before anything builds on it:
  a human-labeled benchmark set (100+ monsters across CR, type, and source) scored against the
  classifier, with the disagreements reviewed one by one. Where the math *can't* see the role
  (control/support value living in rider text the numbers don't capture), record the miss
  explicitly — those cases define P2.8's work — and every creature gets a manual role override so
  the classifier is never the last word.

**Exit:** the Forge shows live computed CR; a goblin scaled to CR 5 plays believably; the library
knows its bruisers from its artillery — and the benchmark proves it; the math has a test floor.

## Phase 2 — Executable rules (the 5e effect engine)

**Goal:** conditions and effects stop being display text — they carry machine-readable mechanics the
tracker enforces or reminds about.

- **P2.1 Effect schema.** Extend `CURATED_EFFECTS` entries with a mechanics payload —
  advantage/disadvantage grants, auto-fail flags, speed/incapacitation, damage multipliers,
  triggers (`onDamage`, `onTurnStart/End`), repeat-save descriptors (`{abil, dc, when}`). Data
  only in this task; no behavior change yet. Schema documented in DEVELOPMENT.md.
- **P2.2 Duration engine.** Unify the existing `rounds`/`endWhen` condition fields into the effect
  engine: tick on `combatAdvance`, expiry announcements in the roll log, "save ends" prompts on the
  right actor's turn with a one-tap roll.
- **P2.3 Concentration.** Damage to a concentrating creature prompts the CON save
  (DC max(10, ⌊dmg/2⌋)) with a one-tap roll; a failed save drops the linked effect.
- **P2.4 Reminder chips** *(backlog item, industrialized)*. On a combatant's turn, surface chips
  derived from active effects ("attacker has disadvantage — Sap", "speed 0 — Grappled").
  *Where and how chips render: mockup + AskUserQuestion.*
- **P2.5 Per-spell X/Day slots + recharge auto-roll** *(backlog items)*. Resources decrement from
  statblock text; recharge rolls itself at turn start and announces.
- **P2.6 PC death saves** *(backlog item)*. Extend the existing monster death-save tracker to PC
  rows (player-mode surface lands with Phase 7).
- **P2.7 Damage-type hooks.** Resistance/immunity/vulnerability applied automatically at HP-damage
  entry, covering the multi-damage-type rolls from B241. Verify current partial coverage first.
- **P2.8 Roles read effects.** Re-run the P1.9 benchmark with the classifier also reading the
  machine-readable effect payloads from P2.1 — control and support signals live in riders, not
  numbers, and this is where the misses P1.9 recorded get closed. The benchmark score is the
  acceptance test.

**Exit:** a fight where Hold Person, concentration, and a dragon's recharge all manage themselves —
and the role classifier now sees what those effects mean.

## Phase 3 — Guided encounter designer

**Goal:** encounter building becomes a directed creative act. The DM states dramatic intent — "a
boss and his pack", "a swarm", "hunters that harass" — and the tool turns it into a mechanically
sound composition; when a piece is missing, the Forge builds it to spec. No simulator: every
judgment comes from static, testable math the DM can understand in one sentence.

- **P3.1 Party profile.** Per-PC offensive/defensive baselines derived from roster fields (level +
  class chips → expected DPR/AC/HP from tables), overridable per PC — the reference frame all
  guidance measures against.
- **P3.2 Composition model.** Replace XP multipliers with the thing they crudely proxy: an
  action-economy model — actions per round, target spread, nova risk, incoming-vs-outgoing damage
  balance against the party profile. Pure functions, unit-tested, and every judgment it can emit
  must be explainable in plain language.
- **P3.3 Encounter shapes.** A data-driven template library: boss + minions, swarm, pack of
  hunters, artillery behind soldiers, ambush, elite duo… Each shape = role slots + a CR
  distribution relative to the party + action-economy targets. Extensible as data, not code.
- **P3.4 The guided flow.** Shape → dials (difficulty, theme/family, headcount preference) → a
  concrete slot list. *Core new surface: full mockup + AskUserQuestion iteration before code.*
- **P3.5 Slot filling.** Per slot, three exits and no dead ends: role- and CR-matched creatures
  suggested from the library and presets; a near-miss auto-scaled to fit (the P1.6 adjuster,
  load-bearing here); or "forge to brief".
- **P3.6 The creation brief.** The shared contract of the whole system: target CR envelope
  (AC/HP/attack/DC/DPR), role, theme tags. The designer emits it, the Forge opens pre-loaded with
  it, the chassis system builds toward it — and P11's optional generation (much later) consumes
  the exact same structure.
- **P3.7 Composition warnings.** Static-math lint on the assembled encounter: action-economy
  imbalance ("solo boss vs five PCs — outnumbered five actions to three"), nova risk, budget
  drift, role gaps. Advisory chips, never blocking.

**Adventuring-day tier — defined, deliberately unscheduled.** Guidance that knows where the fight
sits in the day ("third encounter since the long rest — expect the party at ~60% resources"):
attrition-aware difficulty. Revisit once the encounter-scoped designer has proven itself at the
table, with the same discipline as the grid tier.

**Exit:** pick "a boss and his pack"; moments later the encounter exists — two creatures straight
from the library, one auto-scaled to fit, one forged to a brief — and the DM understood every
suggestion the tool made along the way.

---

## Phase 4 — Toolchain migration *(foundation break 1)*

**Goal:** TypeScript + Vite, adopted incrementally, still deploying to GitHub Pages, with zero
behavior change. **This phase retires the no-build rule — CLAUDE.md and DEVELOPMENT.md are
rewritten in the same batch that flips the switch, not after.**

- **P4.1 Decision spike.** Verify a Vite build can preserve the current runtime shape and the
  per-load `?cb=` cache-bust semantics (see the cache-bust memory — that loader behavior is
  load-bearing; its replacement must be deliberate, not incidental). Define the target layout
  (`src/` modules, single bundle, hashed assets).
- **P4.2 Mechanical modularization.** Convert the 12 shared-scope files to ES modules with explicit
  imports/exports — one file per batch, names unchanged, behavior identical. The espree tricks in
  `eslint.config.js` and `scripts/gen-globals.mjs` retire file-by-file as real imports land.
- **P4.3 TypeScript adoption.** Progressive `.ts` renames behind the existing `checkJs` bridge.
  Type the data model first: instance, PC, encounter, and the P2.1 effect schema.
- **P4.4 Test harness port.** Move to vitest (or keep node:test) against both source and built
  output. The invariant survives verbatim: boot the real `index.html`, zero init errors.
- **P4.5 CI + deploy + rules rewrite.** GitHub Action: verify (typecheck+lint+test) → build →
  Pages. CLAUDE.md's two "must not break" rules are rewritten here — the no-build rule is replaced
  by "the build must stay a single static deployable; verify runs in CI".
- **P4.6 Soak.** One full real session on the built site before Phase 5 begins. *(Playtest gate.)*

**Exit:** the same app, typed, built, CI-deployed. Nothing visibly changed at the table.

## Phase 5 — Event-sourced combat core *(foundation break 2)*

**Goal:** combat becomes an append-only event log; current state is a projection of it. Undo,
replay, journal, and sync stop being four features and become one architecture.

- **P5.1 Event schema.** `{id, ts, actor, type, payload, round, turn}` for damage/heal/condition/
  roll/turn-advance/init/join/leave; versioned from day one.
- **P5.2 Pure reducer.** `project(events) → combatState`, provably equivalent to today's `e.combat`
  shape. Property tests: any replay reproduces the same state.
- **P5.3 Dual-write, then flip.** Actions emit events alongside the current mutations with a
  divergence assert in dev; once quiet, state derives from the log and direct mutations retire.
- **P5.4 Undo anything.** Undo emits *compensating events* (the log stays append-only — no history
  rewrite). Tracker UI affordance for "undo the last N actions", not just the last one.
- **P5.5 Replay + fight recap.** Post-fight timeline view; export a readable recap (kills, drops,
  crits, big saves) — the raw material for Phase 10's journal.
- **P5.6 Persistence.** Per-encounter log in IndexedDB + cloud, with a snapshot+truncate policy so
  long fights stay light.

**Exit:** pull the plug mid-fight, reload, and replay lands on the exact same state; a mistake from
three turns ago is undoable without hand-editing.

## Phase 6 — Real-time local-first sync *(foundation break 3)*

**Goal:** streaming replaces the 15-second poll; every device works offline and merges cleanly;
a random id stops being the only lock on a library.

- **P6.1 Transport spike.** Firebase RTDB streaming (SDK, now allowed post-P4) vs a CRDT layer
  (Automerge/Yjs) over Firebase or PartyKit. Criteria: free-tier cost, offline-merge quality,
  payload size, failure modes. *Recommendation + AskUserQuestion before committing.*
- **P6.2 Share channel v2.** The P5 event log syncs as an append-only stream — naturally
  conflict-light. Last-write-wins remains only for cursor state (whose turn it is).
- **P6.3 Identity upgrade.** Install id → device keypair; share write-backs are signed; a claimed
  PC binds to a player's key. The private library gets end-to-end encryption at rest in the cloud.
- **P6.4 Offline queue + PWA groundwork.** Offline edits queue and replay on reconnect (natural
  with an event log). Service worker + offline shell land here; the full install UX is P12.2.
- **P6.5 Firebase rules v2.** Rewritten for the new shapes, documented in DEVELOPMENT.md with the
  same "the rules ARE the boundary" discipline as today.
- **P6.6 Live-feeling UX.** Presence dots, live indicators, sub-second roll mirroring. The 15s
  optimistic reconcile dies here.

**Exit:** a player taps damage on their phone and the DM screen shows it before their hand leaves
the phone — and a session in a cellar with no signal still works, syncing later.

---

## Phase 7 — Player companion

**Goal:** player mode grows from "my row + sheet" into a full live character sheet that runs the
whole PC from a phone.

- **P7.1 Sheet expansion.** Spell slots, class resources, hit dice, rest buttons, inventory-lite —
  extending the PC fields model. The DM roster stays the source of truth for permissions.
- **P7.2 Action surface.** Players roll attacks/saves/checks from their sheet; results stream to
  the DM log (and later the stage); casting decrements slots.
- **P7.3 Death saves + downed state** in player mode (pairs with P2.6).
- **P7.4 Player-side effect view.** Their own active conditions with plain-language reminders —
  the P2.4 chips, reused player-side.
- **P7.5 Session lobby.** Pre-session join, initiative pre-roll, ready checks; the DM sees who's in
  before the fight starts.
- **P7.6 Permissions matrix.** Today's share toggles matured into a small coherent policy set
  (what players see of enemies, what they may edit). *UX pass with mockups + AskUserQuestion.*

**Exit:** a phone can run a whole PC — sheet, rolls, resources — with zero DM data entry.

## Phase 8 — Table stage

**Goal:** a third display mode — the TV/projector view the whole table watches.

- **P8.1 Stage route.** `?stage=<shareId>`: a read-only projection — initiative rail, health bands,
  active-turn spotlight, round banner, roll ticker — driven by the same event stream as player mode.
- **P8.2 Distance design.** Readable at 3–4 m, dark by default, zero interaction. *A brand-new
  surface: full mockup + AskUserQuestion iteration before any code.*
- **P8.3 Moments engine.** Event-triggered moments — crit flash, a death, initiative countdown.
  Subtle, individually toggleable.
- **P8.4 Creature art hooks.** Optional per-monster image (library field, share-safe delivery)
  shown on the stage when the creature acts.
- **P8.5 DM stage controls.** What the stage reveals (names, health granularity), plus a
  pause/blank button ("eyes on me").

**Exit:** cast a tab to the TV; the table watches initiative live while phones hold the sheets.

## Phase 9 — Tactical layer (zones tier)

**Goal:** "the archers are in the back" becomes app state instead of table memory — without
becoming a VTT.

- **P9.1 Zone model.** An encounter gets named zones (default Front/Mid/Back, customizable); every
  combatant sits in one; engagement pairs (X is engaged with Y).
- **P9.2 Range semantics.** Melee requires same zone/engagement; ranged reaches across zones;
  movement is a zone hop with a disengage prompt — the opportunity-attack reminder rides P2's
  trigger system.
- **P9.3 AoE by zone.** "Fireball hits Mid" → one tap rolls saves for everyone standing there.
- **P9.4 Tracker UI.** Zone lanes or chips inside the initiative list — explicitly *not* a map.
  *This reshapes the core combat surface: B5-style mockup + AskUserQuestion iteration.*
- **P9.5 Designer integration.** The composition model and shape templates become zone-aware —
  ranged vs melee positioning informs slot suggestions and composition warnings.

**Grid tier — defined, deliberately unscheduled.** Build only if zones prove insufficient in real
play: P9.G1 canvas map surface with token drag + measured AoE templates; P9.G2 fog of war;
P9.G3 stage-view map mirror. Revisit after several sessions on zones, not before.

**Exit (zones):** positioning questions get answered by the tracker, and the sim knows the archers
are safe until someone closes the gap.

## Phase 10 — Campaign memory + Notion sync

**Goal:** the app remembers the campaign, not just the fight — and stays in step with the Notion
lore.

- **P10.1 Persistent entities.** Promote a combat instance to a persistent NPC: it keeps wounds,
  state, and notes across encounters and sessions; adventures link recurring entities.
- **P10.2 Session journal.** Auto-drafted from P5 event logs (fights, kills, drops, memorable
  rolls) plus DM notes; fully editable prose.
- **P10.3 Notion bridge, read.** Import NPCs/lore from the Notion D&D space as linked reference —
  the existing Notion→Forge export method, industrialized. *Spike first: in-app Notion API with a
  user token vs a companion script; decide with AskUserQuestion.*
- **P10.4 Notion bridge, write.** Publish session journals to Notion; entity sheets sync back.
- **P10.5 Campaign dashboard.** Campaign = adventures + roster + entities + journals in one view.
  *New surface: mockups first.*

**Exit:** "what did the party do to Varek two sessions ago" is answerable inside the app — and the
answer also lives in Notion.

## Phase 11 — AI module (optional, off by default)

**Goal:** with an API key set, the Forge writes first drafts and monsters play smart; with no key,
nothing feels missing. No other phase depends on this one.

- **P11.1 Provider layer.** Client-side key (Anthropic-first), stored locally only — never in cloud
  saves or shares. Every AI feature hides entirely when unset.
- **P11.2 Generative forge.** Plain-language prompt → complete statblock, constrained by P1's math
  and consuming the same P3.6 creation-brief structure the designer emits (a post-generation CR
  and role audit auto-corrects drift). Output lands in the normal Forge for human editing — never
  straight into play.
- **P11.3 Quick-spawn.** "Three kobold variants that harass the flank", mid-session, minutes to
  ready.
- **P11.4 Tactical co-DM.** On a monster's turn, suggest the strong line (target, action, zone
  move) from *visible* state; the DM taps to accept or ignores. A deterministic fallback uses
  plain rule-based heuristics (role-appropriate targeting, opportunity-attack avoidance), so a
  keyless install still gets a modest version.
- **P11.5 Journal prose.** An optional prose pass over P10.2 drafts, in a tone Francesco controls
  (the "less corny" rule is the default).
- **P11.6 Guardrails.** Hard spend meter, no action ever auto-applies without a tap, every AI
  output logged as such.

**Exit:** the AI is a good hireling — useful, cheap to ignore, impossible to be surprised by.

## Phase 12 — Bridges & ecosystem

**Goal:** the app meets the physical table, installs like an app, and homebrew travels.

- **P12.1 QR token bridge.** Per-monster and per-encounter QR generation for printed tokens;
  scanning (camera + a vendored jsQR-class decoder) drops that creature into the active combat.
  The app emits standard payloads (`mf://monster/<id>` style) — token design and printing stay
  entirely in the D&D context, on the other side of the wall.
- **P12.2 PWA install.** Manifest + the P6.4 service worker matured: installable, offline-complete,
  with an update flow that respects the cache-bust lessons.
- **P12.3 Tauri shell** *(stretch)*. Desktop wrapper — only if the PWA leaves a real gap
  (filesystem exports, an always-on table server). Spike, then decide; default is *don't*.
- **P12.4 Round-trip import/export.** Own JSON schema versioned and documented; D&D Beyond
  character import for the roster; Foundry-compatible export where format/licensing allows
  (research first).
- **P12.5 Homebrew packs.** Publish a preset pack to a share-style id; another install imports it.
  Content packs, not live data — the private-library boundary holds.

**Exit:** scan a mini into initiative, install the app on the prep laptop and the table phone, and
hand a friend your homebrew as one id.

---

## Dependency spine

```
P1 math+roles ──► P3 designer ◄── P2 effects (P2.8 role enrichment)
P2 effects ──► P9 zones (triggers), P7 player effects view
P4 toolchain ──► P5 events ──► P6 sync ──► P7 player / P8 stage
P5 events ──► P10 journal        P6 sync ──► P12.2 PWA
P1 math + P3.6 briefs ──► P11 AI generation   P10 ──► P11.5 prose
```

Phases 1–3 are independent of the foundation arc and can interleave with playtesting as today.
Nothing in 7–12 starts before its foundation (4–6) has passed a real-session playtest gate.

## Explicit non-goals

- **No system-agnostic rules engine.** 5e (2024) is the target; the effect schema serves it alone.
- **No combat simulator.** Cut 2026-07-08: shallow clones made it worthless as a differentiator,
  and guidance must stay explainable. If a future feature seems to need simulation, the answer is
  better static math first — don't resurrect this quietly.
- **No full VTT.** The grid tier exists as an escape hatch, not a destination — if zones ever feel
  insufficient, the first answer is better zones or better physical tools, not a rendered map.
- **No accounts, no logins, no server we operate.** Identity stays device-keyed; infrastructure
  stays static hosting + a managed realtime backend.
- **No AI dependency.** Every deterministic feature works forever with no key and no network calls
  beyond sync.
