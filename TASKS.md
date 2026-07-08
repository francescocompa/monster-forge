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

## Phase 1 — Monster math engine (~14–16 batches)

### 🔶 Decide first (blocks T1.1)
- **Q1.A — Which math model is canonical?** (a) The 2014 DMG p.274 table as written; (b) empirical:
  fit the expected-stats-per-CR tables from the 2024 MM corpus you already mirror locally
  (`5etool_mirror/Sources/`); (c) **hybrid (recommended)** — 2014 table structure, recalibrated
  against the 2024 corpus, divergences documented. The app targets 5e 2024 and 2024 monster math
  drifted from the 2014 table; you own the data to measure by how much.
  **DECIDED 2026-07-08: hybrid.**

### Tasks
- [x] **T1.1 — CR expectation tables** · Sonnet @ medium · ~1 · Batch 258
  Audit the existing CR/XP tables in `data.js`, add the missing columns (expected AC, HP range,
  attack bonus, save DC, DPR per CR 0–30), accessors + unit tests. (P1.1)
- [x] **T1.2 — Corpus calibration spike** · Fable @ high · ~1 *(spike, scratch scripts)* · Batch 259
  Run the tables against the MM25/bestiary corpus: predicted vs actual stats per CR, drift report.
  Output: a calibration memo that settles Q1.A's numbers. Haiku may prep the corpus extraction;
  Fable does the analysis. **Done — memo: `CR_CALIBRATION.md`; calibrated table adopted into
  `CR_EXPECT`; BOH unification deferred to T1.5 by decision.**
- [x] **T1.3 — Defensive CR** · Opus @ high · ~1 · Batch 260
  Effective-HP function: resistance/immunity multipliers by CR tier, AC adjustment steps. Pure
  function + tests. (P1.2) **Done — `defensiveCR(m)` in data.js. Corpus validation overturned the
  2014 blanket multipliers (only physical-resistance depresses HP → ×1.28; elemental/immunity get
  none) and softened the AC rule to ÷4; adopted config scores mean |err| 0.76 CR steps / 86% within
  ±1 on 503 monsters. See `CR_CALIBRATION.md` §T1.3.**
- [x] **T1.4 — Offensive CR: the DPR extractor** · Fable @ high · ~2 · Batches 261–262
  The keystone function of the whole plan (CR calc, role inference, and the P3 composition model
  all consume it): best-3-round DPR from statblock entries — multiattack, recharge weighting,
  save-for-half, riders — with a confidence flag for what it can't parse. Batch 1 core, batch 2
  edge cases against the corpus. (P1.3) **Done — `dprExtract`/`offensiveCR` in data.js. Final
  grade: blended CR bias 0, mean |err| 0.78 steps, 86% within ±1, 96% within ±2, at 90%
  ok-confidence coverage (455/503). Legendary = best option once/round (sweep-validated); auras +
  ~28-spell SPELL_DPR scored; summons/reactions deliberately flagged-not-scored. Outliers
  characterized for T1.5 — see `CR_CALIBRATION.md` §T1.4.**
- [x] **T1.5 — Corpus regression run** · Opus @ high · ~1 · Batch 263
  Derived CR across the full preset corpus; divergence distribution report.
  **🔍 REVIEW (with you):** read the outliers together — they're either parser bugs, table
  miscalibration, or genuinely mislabeled monsters. This session decides which, before the UI
  exists. **Done — final blended CR: 86% within ±1, bias 0, mean 0.78 steps (455 ok-conf / 503).
  Harness graduated (`npm run grade` + `test/cr-model.test.js`). Review done: 17 outliers, no
  parser bugs — dragons accepted (run hot), control/curse monsters deferred to roles/effects; BOH
  unification held to T1.7. Visual report published as an Artifact. See `CR_CALIBRATION.md` §T1.5.**

### 🔶 Decide before UI (blocks T1.6–T1.7)
- **Q1.B — Calculator UI home:** popover off the Forge CR field vs a Forge side panel; and what
  the divergence line actually says (tone matters — it's judging the author's work).

- [ ] **T1.6 — Calculator UI design session** · Opus @ high · *(design session, no production code)*
  Mockups for the calc surface, 1–2 AskUserQuestion iterations. (P1.4)
- [ ] **T1.7 — Calculator UI build** · Sonnet @ high · ~1

### 🔶 Decide before adjuster (blocks T1.8–T1.9)
- **Q1.C — Adjuster permissions:** which fields auto-scale may touch; is suggest-mode the only
  default with auto-scale behind a confirm; how locked fields are marked. (The open question
  carried from the original CR plan.)

- [ ] **T1.8 — Adjuster: suggest mode** · Fable @ high · ~1
  Target CR → concrete edit list (AC ±n, HP dice, attack/DC ±n, damage dice) rendered as
  accept-per-line suggestions. This is constrained search over the stat envelope — the math must
  find *coherent* combinations, not just any that sum right. (P1.5)
- [ ] **T1.9 — Adjuster: auto-scale mode** · Opus @ high · ~1
  One-click chassis-aware rescale; single reversible `_forgeHist` step; respects locks. (P1.6)
- [ ] **T1.10 — Bestiary CR audit** · Sonnet @ medium · ~1
  Divergence badge on library cards + bulk "audit my bestiary" list. (P1.7)

### Combat roles
- [ ] **T1.11 — Role clustering spike** · Fable @ high · ~1 *(spike)*
  Feature extraction (AC/HP ratio, DPR shape, speed, range profile, DCs) + clustering over the
  corpus. Output: proposed clusters, each with 5–10 exemplar monsters — the raw material for the
  naming session, not a finished taxonomy.
- **🔶 Q1.D — Taxonomy naming (design session, yours):** you name the roles from the cluster
  exhibits. Copy is design material; the math proposes, you dispose. Also: how many roles is
  right (too few = useless for shapes, too many = unreliable inference)?
- [ ] **T1.12 — Classifier + role badges** · Sonnet @ high · ~1
  Classifier as a pure function; badge on library cards; role filter in the bestiary. (P1.8)
- **🔶 Q1.E — Benchmark protocol:** who labels the ~100-monster benchmark set (you, assisted — a
  Haiku-prepped sheet with the classifier's guess *hidden* to avoid anchoring?); what agreement
  threshold counts as passing (e.g. ≥85% before anything builds on roles); which monsters make
  the set (spread across CR, type, source, including known-ambiguous ones on purpose).
- [ ] **T1.13 — Benchmark harness + labeling pass** · Haiku @ medium (prep) + you (labels) · ~1
  Sheet prep, your labeling pass, scoring harness as a repeatable test.
- [ ] **T1.14 — Benchmark run + misses report** · Opus @ high · ~1
  Score the classifier; review disagreements one by one **🔍 REVIEW (with you)**. Every miss gets
  a diagnosis: parser bug / feature the math can't see (→ recorded for T2.9) / genuinely
  ambiguous. Manual role override ships here. (P1.9)

### Phase close
- **🔍 REVIEW — Phase 1 code review:** `/code-review` at high on the whole math layer; fixes
  applied same session. Sonnet @ high for the fix pass.
- **Consolidation** · Sonnet @ medium · ~½ — collapse Phase 1 in ROADMAP/TASKS, memory update.

**Exit check:** benchmark passed at the Q1.E threshold; corpus regression outliers dispositioned;
the Forge computes CR live.

---

## Phase 2 — Executable rules, the 5e effect engine (~10–12 batches)

### 🔶 Decide first (blocks everything here)
- **Q2.A — Enforcement philosophy:** per effect class, does the tracker *auto-apply* mechanics
  (disadvantage rolled for you) or *remind* (chip says "attacker has disadvantage", you roll)?
  This is the trust contract between DM and tool — likely a per-class or global setting, but the
  default is a design decision, yours.
- **Q2.B — Prompt surface:** where save-ends/concentration prompts appear (roll-log toasts, init
  row, a dedicated prompt strip) — sets the pattern every later prompt reuses.

### Tasks
- [ ] **T2.1 — Effect schema design** · Fable @ high · ~1
  The mechanics payload shape (adv/dis grants, auto-fail, speed/incapacitation, damage
  multipliers, triggers, repeat-save descriptors), documented in DEVELOPMENT.md. Schema only —
  and it must be expressive enough for T2.9's classifier signals, so design them together. (P2.1)
- [ ] **T2.2 — Effect data pass** · Sonnet @ medium · ~1–2
  Populate the payloads across `CURATED_EFFECTS` from the 2024 rules text. Bulk but
  correctness-sensitive: Sonnet, with the rules text open, never from memory.
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
  Shape names are copy — yours.
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
