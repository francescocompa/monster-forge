# TASKS — Execution plan for ROADMAP Phases 1–6

> Derived 2026-07-08 from `ROADMAP.md` rev 2 (`233d9ad`). Working document: check tasks off as they
> ship, collapse completed phases to a one-liner. Batch history stays in `CHANGELOG.md`; strategy
> stays in `ROADMAP.md`. Phases 7–12 get their task breakdown when Phase 6's gate passes.

## How to read this

- **Model @ effort** — recommended Claude model and reasoning effort for the session running the
  task. Rationale: **Fable @ high** for architecture, novel math, security, and migrations (wrong
  cheaply is expensive here); **Opus @ high** for complex implementation and design iteration;
  **Sonnet @ medium/high** for well-specified implementation on established patterns; **Haiku**
  only for corpus/scratch wrangling — never for edits to the shared-scope files (the conventions
  are too easy to miss).
- **🔶 DECIDE** — an AskUserQuestion checkpoint. Blocks the tasks listed after it; never skipped.
- **🔍 REVIEW** — a dedicated revision session (not the per-batch `npm run verify`, which is
  assumed always).
- **🎲 GATE** — a real-session playtest gate. Preview-verified ≠ table-verified.
- **~N** — rough batch count (the project's working unit).

**Standing protocol for every build session:** `npm run verify` → `CHANGELOG.md` entry → handoff
STATE update. Every 🔶 runs through AskUserQuestion with 2–3 options and tradeoffs. Every new
surface starts as mockups, never code. Day-to-day playtest fixes always pre-empt this plan.

---

## Phase 1 — Monster math engine · CLOSED 2026-07-12 (Batches 258–273, ~16 batches)

**Everything shipped and reviewed** — full history in `CHANGELOG.md` (B258–273), calibration paper
trail in `CR_CALIBRATION.md`, role derivation in `ROLE_CLUSTERS.md`. Decisions: Q1.A hybrid ·
Q1.B read-out band + dial scaler · Q1.D roles soldier/artillery/brute/skirmisher/controller, stature
boss/elite/pack/fodder (designer-only) · Q1.E blind two-tier ≥85% benchmark. Deliverables: the
data.js math layer (`crExpected`/`defensiveCR`/`offensiveCR`/`overallCR`, graded 86% within ±1 on
503), the Forge read-out band + preserve-character scaler, bestiary CR audit (T1.10), the role
classifier + tags/filter/override (T1.12), the committed benchmark harness (`npm run benchmark`),
and the phase code review with fixes applied (B273).

**Still open, carried forward:**
- **🔶 Q1.C — adjuster permissions (USER):** blocks T1.8 (suggest-mode edit list) and any field-lock
  work; T1.7's dial scaler already absorbed old T1.9's auto-scale. Ask before building either.
- **Benchmark gate:** 75.0 clean / 80.0 ambiguous vs ≥85 — re-arms at **T2.10** (`npm run benchmark`);
  remaining misses = the user-accepted control-garnish group + the Phase-2 kit-invisible blind spot.
- Parked from the B273 review (rationale in CHANGELOG): role-map.mjs extractor unification + a ROLE_*
  constants regeneration check (needs a corpus-mounted session); the `input[type=text]` CSS global;
  entry-walk dedup. Plus the card-role-tag casing question (lowercase card vs capitalized statblock).

---

## Phase 2 — Executable rules, the 5e effect engine (~10–12 batches)

### 🔶 Decide first (blocks everything here)
- **Q2.A — Enforcement philosophy: DECIDED 2026-07-12 (AskUserQuestion) — REMIND-FIRST.** Chips
  state the mechanical fact ("attacker has disadvantage"); the DM rolls. The schema still carries
  machine-readable mechanics so per-class auto-apply can layer on later without a schema change.
- **Q2.B — Prompt surface: DECIDED 2026-07-12 (AskUserQuestion) — PROMPT STRIP.** A slim dedicated
  strip on the combat tracker where pending prompts queue (save-ends, concentration; later recharge,
  death saves, lair actions). T2.5 mockups design it before any code.

### Tasks
- [x] **T2.1 — Effect schema design** · Batch 275
  DEVELOPMENT.md "The effect schema": `mech` payloads — typed reminder atoms + save/end/conc/implies,
  closed `if` vocabulary, `note` escape hatch — designed together with T2.9's classifier contract
  (atom-kind control weights, one exported map). Documentation-only by design. (P2.1)
- [x] **T2.2 — Effect data pass** · Batch 276
  All CURATED_EFFECTS payloads + `CONDITION_MECH` (the 15 XPHB conditions), transcribed from the
  5etools mirror with the text open. Four curated texts 2024-corrected (Resistance, Guidance,
  Invisibility, Sanctuary). Integrity floor: `test/effect-mech.test.js`; exports EFFECT_ATOM_KINDS/
  EFFECT_IF_TERMS/EFFECT_CONTROL_W (weights provisional until T2.10's calibration).
- [ ] **T2.3 — Duration engine** · Opus @ high · ~1
  Unify `rounds`/`endWhen` into the engine: tick on `combatAdvance`, expiry announcements,
  save-ends prompts. Includes migration of conditions saved in existing encounters. (P2.2)
- [ ] **T2.4 — Concentration** · Sonnet @ high · ~1
  Damage → CON save prompt (DC max(10, ⌊dmg/2⌋)), one-tap roll, break drops linked effect. (P2.3)
- [ ] **T2.5 — Reminder chips design session** · Opus @ high · *(design session)*
  Mockups for where/how chips render on a turn — per Q2.A's philosophy. (P2.4)
- [ ] **T2.6 — Reminder chips build** · Sonnet @ medium · ~1
- [ ] **T2.7 — X/Day slots + recharge auto-roll** · Sonnet @ high · ~1
  Resource parsing from statblock text; recharge rolls itself at turn start. (P2.5)
- [ ] **T2.8 — PC death saves** · Sonnet @ medium · ~1
  Extend the monster tracker to PC rows. Player-mode surface waits for Phase 7. (P2.6)
- [ ] **T2.9 — Damage-type hooks** · Sonnet @ high · ~1
  Auto resist/immune/vulnerable at damage entry; verify B241 coverage first. (P2.7)
- [ ] **T2.10 — Roles read effects** · Opus @ high · ~1
  Classifier consumes effect payloads; re-run the T1.13 benchmark. Acceptance = the P1.9 misses
  close without new regressions. (P2.8)

### Phase close
- **🔍 REVIEW:** `/code-review` high — special attention to `combatAdvance` (the engine now
  mutates during it) and the migration path.
- **🎲 GATE (soft):** one real session with the effect engine live before Phase 3 UI work — this
  phase changes in-fight feel more than any other early phase, and Q2.A's answer may not survive
  contact with the table.

---

## Phase 3 — Guided encounter designer (~12–14 batches)

### 🔶 Decide first (blocks T3.3+)
- **Q3.A — Where the designer lives:** inside the Adventures encounter-creation flow (recommended
  instinct: it *is* encounter creation) vs a standalone view; and does it replace or sit beside
  the current bestiary-picker flow?
- **Q3.B — The v1 shape list:** which 5–8 shapes ship first (boss+minions, swarm, pack of hunters,
  artillery+soldiers, ambush, elite duo…) and what the dials are (difficulty, theme, headcount).
  Shape names are copy — yours. **Standing requirement (user, 2026-07-11): one dial must be the
  TARGET party level, not just the roster's current level** — planning the post-level-up session
  has no intuitive path today, and stature (boss/elite/pack/minion, decided in Q1.D) only exists
  relative to that chosen level. The naming-session artifact's party-level slider is the
  interaction seed.
- **Q3.C — Theme/family model:** creature type only, or type + custom tags on library monsters?
  Determines how "undead ambush" finds candidates.

### Tasks
- [ ] **T3.1 — Party profile** · Opus @ high (tables) + Sonnet @ high (wiring) · ~1–2
  Class-chip → baseline DPR/AC/HP expectation tables (content design, done carefully once), then
  per-PC derivation with overrides. (P3.1)
- [ ] **T3.2 — Composition model** · Fable @ high · ~2
  The action-economy model: actions/round, target spread, nova risk, damage balance vs party
  profile. Pure, unit-tested, every output explainable in one sentence — this is the phase's
  novel math and its make-or-break. (P3.2)
- [ ] **T3.3 — Creation brief schema** · Fable @ medium · ~½
  Defined *early*, not at integration time: target CR envelope + role + theme tags. The contract
  between designer, adjuster, chassis, and (later) P11. (P3.6)
- [ ] **T3.4 — Shape templates** · Opus @ high · ~1
  Data-driven shape definitions (role slots, CR distribution, action-economy targets) for the
  Q3.B list. (P3.3)
- [ ] **T3.5 — Guided flow design sessions** · Opus @ high · *(design, 2–3 sessions)*
  THE new surface of the early roadmap: shape picker → dials → slot list. Expect real
  back-and-forth; budget two full mockup iterations minimum before any code. (P3.4)
- [ ] **T3.6 — Guided flow build** · Sonnet @ high · ~2
- [ ] **T3.7 — Slot filling: matcher + scale-to-fit** · Sonnet @ high · ~1
  Role+CR+theme matched suggestions from library/presets; near-miss auto-scale via T1.9. (P3.5)
- [ ] **T3.8 — Forge-to-brief handoff** · Opus @ high · ~1
  Forge opens pre-loaded with the brief; chassis builds toward the envelope; returning to the
  encounter slots the result. Cross-surface state handoff — the fiddly one. (P3.5/P3.6)
- [ ] **T3.9 — Composition warnings** · Sonnet @ high · ~1
  Static-math lint chips. **🔶 Q3.D — warning copy pass (yours):** the tone of "this will grind"
  advice — matter-of-fact, never scolding.

### Phase close
- **🔍 REVIEW:** `/code-review` high across the designer + a UX pass session in the live preview.
- **🎲 GATE (prep gate):** you prep one real session's encounters entirely through the designer.
  The measure isn't correctness, it's whether it beats your current flow. If it doesn't, we find
  out why before the foundation arc starts.

---

## Phase 4 — Toolchain migration (~13–15 batches) · *foundation break 1*

### 🔶 Decide first (blocks all)
- **Q4.A — Bundler:** Vite (recommended: dev server + build + vitest affinity) vs esbuild-minimal.
- **Q4.B — Layout:** files move to `src/` vs converted in place; single bundle (recommended —
  closest to today's behavior) vs code-split.
- **Q4.C — TS strictness ramp:** `checkJs`-loose → per-file strict (recommended) vs strict-only.
- **Q4.D — Test runner:** vitest (recommended if Vite) vs staying on node:test.

### Tasks
- [ ] **T4.1 — Migration spike** · Fable @ high · ~1 *(spike)*
  Prove the build preserves runtime shape AND the per-load `?cb=` cache-bust semantics (the
  loader behavior is load-bearing — see the cache-bust memory; its replacement is designed, not
  incidental). Output: decision memo answering Q4.A–D with evidence, then 🔶 confirm.
- [ ] **T4.2 — Modularization: first file** · Opus @ high · ~1
  `data.js` → ES module, establishing the conversion pattern, import conventions, and what
  happens to the espree config machinery. The pattern-setter.
- [ ] **T4.3 — Modularization: remaining files** · Sonnet @ high · ~4
  Grouped: parsers+core / forge+engine / bestiary+adventures+roster / combat+dice3d+seed+app.
  One group per batch, smoke test green after each — **never two groups in one batch.**
- [ ] **T4.4 — Type the data model** · Fable @ high · ~1
  Instance, PC, encounter, adventure, effect schema, event precursors — the types Phase 5 will
  lean on. This is where typing pays for the whole migration.
- [ ] **T4.5 — Progressive TS renames** · Sonnet @ high · ~3
  Per-file `.ts` conversion behind the Q4.C ramp; `parsers.js`'s existing `@ts-check` goes first.
- [ ] **T4.6 — Test harness port** · Opus @ high · ~1
  Runner per Q4.D; the invariant survives verbatim: boot real `index.html`, zero init errors,
  against source AND built output. (P4.4)
- [ ] **T4.7 — CI + deploy + the rules rewrite** · Opus @ high · ~1
  GitHub Action: verify → build → Pages. **🔶 Q4.E — CLAUDE.md's new "must not break" rules:**
  the no-build rule is *yours*; I draft its replacement ("single static deployable; verify runs
  in CI; …"), you approve the wording before it lands — same batch as the switch flips. (P4.5)

### Phase close
- **🔍 REVIEW — ultra:** you trigger `/code-review ultra` on the migration branch (multi-agent
  cloud review earns its cost exactly here); Opus @ high fix session on the findings.
- **🎲 GATE:** one full real DM session on the built site. Phase 5 does not start before this
  passes. (P4.6)

---

## Phase 5 — Event-sourced combat core (~9–11 batches) · *foundation break 2*

### 🔶 Decide first
- **Q5.A — Undo UX:** what "undo three turns" looks and feels like at the table (timeline
  scrubber vs stepped undo vs per-action revert list) — decides P5.4's whole design.
- **Q5.B — Dual-write exit criterion:** how long the dual-write soak runs before the flip (N real
  sessions? N days of preview use?) — cheap to decide now, contentious to decide under pressure.

### Tasks
- [ ] **T5.1 — Event schema** · Fable @ high · ~1
  Versioned event types for damage/heal/condition/roll/turn/init/join/leave; designed against the
  T4.4 types. (P5.1)
- [ ] **T5.2 — Pure reducer + property tests** · Fable @ high · ~2
  `project(events) → combatState` equivalent to today's `e.combat`; replay-equivalence property
  tests. The core of the foundation — highest-effort session of the phase. (P5.2)
- [ ] **T5.3 — Dual-write + divergence assert** · Opus @ high · ~1
  Events emitted alongside current mutations; dev-mode divergence alarm. (P5.3a)
- [ ] **T5.4 — The flip** · Opus @ high · ~1
  After Q5.B's soak: state derives from the log, direct mutations retire. Own batch, own gate,
  trivially revertible. (P5.3b)
- [ ] **T5.5 — Undo design session + build** · Opus @ high (design) + Sonnet @ high (build) · ~1–2
  Per Q5.A; compensating events, log stays append-only. (P5.4)
- [ ] **T5.6 — Replay timeline + fight recap** · Sonnet @ high · ~1
  Post-fight timeline; readable recap export. **🔶 Q5.C — recap voice (yours):** the copy pattern
  for auto-generated prose — this text eventually feeds P10's journal, so its tone gets set here.
- [ ] **T5.7 — Persistence + snapshot/truncate** · Opus @ high · ~1
  Per-encounter log in IndexedDB + cloud; snapshot policy so long fights stay light. (P5.6)

### Phase close
- **🔍 REVIEW:** `/code-review` high with focus on the reducer's edge cases and the flip diff.
- **🎲 GATE:** a real session run on the event-sourced core, including at least one deliberate
  mid-fight reload and one undo-in-anger. Phase 6 waits for it.

---

## Phase 6 — Real-time local-first sync (~11–13 batches) · *foundation break 3*

### Tasks
- [ ] **T6.1 — Transport spike** · Fable @ high · ~2 *(spike)*
  Two working prototypes: Firebase RTDB streaming (SDK) vs CRDT (Yjs or Automerge) over
  Firebase/PartyKit — measured on free-tier cost at your table's scale, offline-merge quality,
  payload size, failure modes. Output: decision memo. **🔶 Q6.A — transport decision** on the
  memo's evidence. (P6.1)
- [ ] **T6.2 — Share channel v2** · Fable @ high · ~2
  The P5 event log as an append-only sync stream; last-write-wins only for cursor state. (P6.2)
- **🔶 Q6.B — Migration story for live installs:** your real library and any mid-campaign state
  cross this bridge — migration UX, fallback, and rollback decided *before* T6.3, not during.
- **🔶 Q6.C — Multi-device identity:** today a library is per-device by construction. Keypairs
  make "my desktop and my phone are the same me" possible (key handoff via QR between your own
  devices) — in scope now, or explicitly later?
- [ ] **T6.3 — Identity + E2E encryption** · Fable @ high · ~2
  Device keypairs (WebCrypto), signed share write-backs, claimed-PC-binds-to-key, library
  encrypted at rest in the cloud. Security-critical: the B250 trust boundary gets re-verified
  end-to-end here. (P6.3)
- [ ] **T6.4 — Offline queue + service worker groundwork** · Opus @ high · ~1–2
  Queue-and-replay on reconnect; offline shell. Full install UX stays in P12. (P6.4)
- [ ] **T6.5 — Firebase rules v2** · Opus @ high · ~1
  Rewritten for the new shapes, documented in DEVELOPMENT.md with the same "the rules ARE the
  boundary" discipline. **Applying them in the console is your action** — done together, verified
  live before the batch closes. (P6.5)
- [ ] **T6.6 — Live-feeling UX** · Opus @ high (design mini-session) + Sonnet @ high (build) · ~1
  Presence dots, live indicators, sub-second roll mirroring; the 15s reconcile dies. (P6.6)

### Phase close
- **🔍 REVIEW — security ultra:** you trigger `/code-review ultra` (or a dedicated
  `/security-review`) scoped to identity, encryption, rules, and the ingestion boundary. Fable @
  high on the findings — this is the one review where model ceiling matters most.
- **🎲 GATE:** a real session with real players on their phones, ideally once with the venue's
  bad wifi. Passing this gate closes the foundation arc and unlocks Phases 7–12 task derivation.

---

## Cadence and totals

| Phase | Build batches | Design sessions | Spikes | Reviews | Gates |
|---|---|---|---|---|---|
| P1 math + roles | ~11 | 2 (calc UI, taxonomy) | 2 | 2 + phase review | — |
| P2 effect engine | ~9 | 1 (chips) | — | phase review | soft table gate |
| P3 designer | ~9 | 2–3 (the flow) | — | phase review + UX pass | prep gate |
| P4 toolchain | ~12 | — | 1 | **ultra** | full session |
| P5 events | ~8 | 1 (undo) | — | phase review | session + undo-in-anger |
| P6 sync | ~9 | 1 (presence) | 1 (×2 protos) | **security ultra** | players-on-phones |

Roughly **58–65 build batches** plus ~8 design sessions, 4 spikes, and the review/gate cadence.
At the project's historical pace this is a long arc — which is fine: phases 1–3 interleave freely
with playtest-driven fixes, and each phase ends in a state worth living in. The model mix is
deliberately top-heavy early (Fable on the math keystones T1.4/T3.2 and every foundation core)
and delegates to Sonnet wherever a pattern is already established.

**Standing decision checkpoints not tied to one task:** any scope growth mid-phase → back to
AskUserQuestion before building; any gate failure → diagnose in a dedicated session before
touching the plan; any temptation to resurrect the simulator → read the non-goals.
