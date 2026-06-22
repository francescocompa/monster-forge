# Monster Forge — Holistic Audit

> Full-project review: code structure, engineering practice & metrics, design,
> UX flows, and content. Audited 2026-06-22 against `main` (post–Batch 190).
> Scope was diagnostic + safe fixes only; nothing in the runtime behaviour was changed.

---

## 0. Executive summary

Monster Forge is a **mature, unusually well-engineered no-build static app** — a D&D 2024
homebrew statblock builder, encounter planner, and live combat tracker. ~8,800 lines of
hand-written JavaScript across 9 classic-script files sharing one global scope, ~1,900 lines
of CSS, zero runtime dependencies, served from GitHub Pages.

The headline: **the discipline is real.** Despite "no build step," the project carries a
genuine safety net (ESLint with self-maintaining shared globals, a jsdom smoke test that boots
the real page, `node --check` for smart-quote breakage, a commit gate), zero `console.*` /
`TODO` debt in shipped code, a 0-error/0-warning lint, and a consistent set of architectural
patterns. The colour/roll statblock engine and the dependency-free 5etools `.zip`/`_copy`
importer are standout pieces of engineering.

The main costs are **readability and scale headroom**, not correctness: extreme line density
(single statements up to ~1,400 chars), a handful of 100–150-line functions, and a
"re-render-the-world + rebind every listener" UI pattern that is perfectly fine at personal
scale but is the first thing that would strain if libraries grew large. One accepted security
exposure (an embedded JSONBin master key) is documented and out of scope to change.

| Dimension | Grade | One-line verdict |
|---|---|---|
| Code structure | **A−** | Clean layering, consistent patterns; held back by density + a few giant functions. |
| Engineering practice | **A** | Excellent safety net for a no-build site; clean lint/test; no debt. |
| Performance | **B+** | Fine today; full re-render + per-keystroke rebind won't scale to hundreds of items. |
| Security | **B** (accepted) | XSS well-mitigated; public master key is a real exposure, knowingly accepted. |
| Design | **A−** | Cohesive dark system, standout semantic statblock colouring; minor contrast/overlap nits. |
| UX flows | **B+** | Coherent Forge→Bestiary→Adventures→Combat pipeline; no undo; some discoverability gaps. |
| Content / copy | **A−** | Plain, active, sentence-case, on-brand; docs had drifted (fixed in this pass). |

---

## 1. Code structure

### 1.1 Architecture

A no-build static site: `index.html` + `styles.css` + nine JS files loaded as ordinary
`<script src>` tags in a fixed order, sharing **one global lexical scope** (no imports/exports;
a `const` in `data.js` is visible in `app.js`). Load order is mirrored in four places that must
stay in sync: `index.html`, `test/harness.js`, `eslint.config.js`, `package.json`.

```
data.js → parsers.js → core.js → forge.js → engine.js → bestiary.js → adventures.js → combat.js → seed.js → app.js
(constants/  (importers)  (state/    (entry     (preview/   (bestiary   (adventures/   (combat     (dev      (shell/
 helpers/                  storage/   editing/   colour/      view/        encounters/    tracker)    sandbox)   init,
 chassis)                  model)     brackets)  roll engine) pickers)     party/budget)                        last)
```

The layering is sound and reads top-down: pure data → parsing → state/model → editing →
rendering → feature views → shell. Init is a single async IIFE at the bottom of `app.js`.

### 1.2 Size & shape (metrics)

| File | Lines | Role | Longest line (chars) | Lines > 300 chars |
|---|---:|---|---:|---:|
| `combat.js` | 1,166 | Live combat tracker | 954 | 24 |
| `adventures.js` | 1,126 | Adventures / encounters / party / budget | 856 | 28 |
| `engine.js` | 987 | Preview render + colour/roll engine + popovers | 1,419 | 20 |
| `bestiary.js` | 725 | Bestiary view + pickers | 783 | 23 |
| `core.js` | 646 | State / storage / settings / model | 524 | 4 |
| `parsers.js` | 504 | 5etools text/JSON/zip importers | 299 | 0 |
| `forge.js` | 462 | Entry editing + bracket expander | 561 | 5 |
| `app.js` | 376 | Shell / modals / init | 712 | — |
| `data.js` | 287 | Tables / helpers / chassis | 1,363 | — |
| `seed.js` | 125 | Dev-only localhost seed | — | — |
| **JS total** | **~8,825** | | | |
| `styles.css` | 1,901 | Styling + 44 design tokens | | |
| `index.html` | 333 | Markup, 4 views | | |

Other signals (whole codebase): ~2,679 function/arrow occurrences · `innerHTML` assignments
concentrated in `forge.js` (21), `core.js` (13), `adventures.js`/`bestiary.js` (12 each) ·
**0 `console.*` and 0 `TODO/FIXME` in shipped code** (2 `console` in dev `testkit.js`, 1 in
`seed.js`) · 17 `!important` in 1,900 CSS lines · 18 `@media`/`@container` queries.

### 1.3 Longest functions (refactor candidates)

| Lines | Function | File |
|---:|---|---|
| 147 | `openCharacterDetail` | `adventures.js` |
| 126 | `renderCombat` | `combat.js` |
| 79 | `openLoadCombat` | `combat.js` |
| 79 | `renderAdvDetail` | `adventures.js` |
| 67 | `bindEncDrag` | `adventures.js` |
| 65 | `openCondAdd` | `combat.js` |
| 61 | `presetModal` | `bestiary.js` |

These are the densest spots in the codebase — large HTML-string templates interleaved with
binding logic. They work, but they're where a regression is most likely to hide and where a new
reader slows down most.

### 1.4 Consistent patterns (the codebase's "grammar")

- **HTML via template strings + `esc()`**, committed to a container with `innerHTML`.
- **Event delegation + per-render rebinding**: after each `innerHTML` write, the same code
  re-queries and re-attaches listeners (`renderEntries`→`bindEntries`, etc.).
- **Wholesale re-render with `preserveScroll(sel, fn)`** (`core.js:223`) to keep scroll position
  through a full rebuild — a good extraction of a previously copy-pasted pattern.
- **Defensive normalize/migrate on load** (`normalizeMonster`, `normalizeAdv`,
  `normalizeRosterPC`, `migratePartyModel`): every old data shape is upgraded idempotently. This
  is genuinely careful work and a big part of why the app survives its own evolution.
- **"Why" comments with batch references** (`// B187 …`) throughout — excellent institutional
  memory, paired with `CHANGELOG.md`.

### 1.5 Structural weaknesses

1. **Line density.** Single statements reach ~1,400 chars (`engine.js`), ~1,360 (`data.js`).
   This hurts diff review, blame, debugging (no per-sub-expression breakpoints), and onboarding.
   It is consistent house style, so it's a *readability* cost, not a bug — but it's the single
   biggest drag on maintainability.
2. **A few oversized functions** (§1.3) mix templating and wiring.
3. **File growth**: `combat.js` and `adventures.js` are each >1,100 lines and still growing;
   each is really 3–4 sub-features (e.g. adventures = adventure list + encounters + party roster
   + budget). A future split (the way `combat.js` was already carved out of `adventures.js` in
   B131) would keep them legible.

---

## 2. Engineering practice, frameworks & tooling

### 2.1 What's in place (and it's good)

- **ESLint flat config** (`eslint.config.js`) that parses each shared file's *top-level*
  declarations with `espree` and registers them as globals — so `no-undef` stays useful (catches
  real typos) without false-positives on the shared scope, and it's **self-maintaining** as new
  functions are added. This is a clever, correct solution to the no-build linting problem.
- **jsdom smoke test** (`test/smoke.test.js`) that boots the *real* `index.html` with all nine
  scripts injected into one realm and asserts init throws zero errors — exactly the historical
  failure mode (a top-level `addEventListener` bound to a removed DOM node white-screens the
  live page). ~322 `addEventListener` calls across the JS make this net valuable.
- **`node --check`** on every script — catches the smart-quote substitution the Edit tooling
  occasionally introduces.
- **Pure-function unit tests** (`test/units.test.js`) guarding the maths (`mod`, `pbForCR`,
  `rollFormula` bounds, `exprAvg`, `bracketize`).
- **`npm run verify`** (`check` → `lint` → `test`) wired as a **git pre-commit gate**.

**Current state:** `npm run verify` is green — 9 tests pass, **lint 0 errors / 0 warnings**.

### 2.2 Gaps / opportunities

- **Coverage is thin relative to surface.** Tests cover boot + ~6 pure functions. The parser
  layer (`parse5etools`, `mapMonsterJSON`, `_copy`/`_mod` resolution, the zip reader) is the most
  complex and brittle code in the project and has **no direct tests** — a fixture-based round-trip
  test (sample 5etools JSON → expected Forge monster) would be high-value insurance, and is
  achievable in the existing jsdom harness with no new deps.
- **No CSS tooling.** 1,900 lines, 17 `!important`, dynamically-built class families
  (`cc-ab-*`, `st-*`, `ds-*`, …). The B185 manual dead-rule audit found 45 dead selectors — that
  recurring chore could be assisted by a lint step (e.g. a small script cross-referencing class
  literals against the JS/HTML), though tooling here risks false-positives on dynamic classes.
- **No formatter.** Prettier with a very high `printWidth` would *not* reflow the intentional
  one-liners much, so it's mostly moot — but a formatter on the *test/config* ESM files is cheap.
- **No type checking.** A `// @ts-check` + JSDoc pass on `core.js`/`parsers.js` (the model + the
  riskiest parsing) would catch shape drift with zero build step. Optional; weigh against the
  house preference for terseness.

### 2.3 Dependency footprint

Runtime: **none.** Dev: `eslint`, `jsdom`, `fake-indexeddb`, `globals` — all appropriate and
minimal. The 5etools `.zip` importer pointedly avoids JSZip by using the browser's native
`DecompressionStream` (`parsers.js:461`) — a deliberate, correct call to preserve no-build.

---

## 3. Performance & optimization

Today's scale (single user, a handful of monsters/adventures) makes none of this urgent, but
for completeness and future headroom:

1. **Re-render-the-world UI.** Editing a field commits to the model and re-renders large
   subtrees via `innerHTML`, then re-binds every listener. `renderPreview()` runs on **every
   `input` event** (no debounce/rAF) and rebuilds the whole statblock + runs the colorize
   TreeWalker each time. Smooth now; the first thing to feel laggy if statblocks get very large
   or libraries reach hundreds of entries. **Cheap win:** `requestAnimationFrame`-coalesce
   `renderPreview` so a burst of keystrokes paints once.
2. **Per-render listener churn.** Rebinding on every render creates/discards many closures
   (GC pressure). A single delegated handler per container (already used in places, e.g.
   `#formCol` click delegation) could replace several rebind loops.
3. **Cache-busting.** `index.html` appends `?cb=Date.now()` to every script/style on **every
   load** — necessary to defeat GitHub Pages' stale-CDN problem, but it also defeats the browser
   cache entirely, so all JS/CSS re-download each visit (fonts are separate). Acceptable given
   the constraint; the only real alternative (content-hash filenames) needs a build step, which
   is off the table. Leave as-is.
4. **Repeated work in hot paths.** Functions like `enPresets()`/`enSpells()` filter the full
   library on each call and are called from render loops; memoising while libraries are unchanged
   would help only at large library sizes.

None of these are defects — they're scale-headroom notes, ordered by likely first impact.

---

## 4. Security

- **XSS posture: good.** User content is consistently escaped (`esc()`), and crucially the
  markdown formatter escapes *before* applying markup (`fmtInline`/`fmtBlock`, `engine.js:32`),
  while the colour pass works on **DOM text nodes via TreeWalker** (`colorizeNode`/`walkColorize`)
  rather than string concatenation. The untrusted inputs (pasted statblocks, imported 5etools
  JSON) flow through the escaped path. For a single-user tool, this is more than sufficient.
- **Embedded JSONBin master key** (`core.js:108`). The full-CRUD key is committed to the repo and
  ships in `core.js` on the public GitHub Pages site. Framed honestly: this is not merely
  "personal data in the cloud" — **anyone who views source can read, overwrite, or delete the
  account's bins.** Per the project's locked decision this is *knowingly accepted* (personal use,
  documented in `README.md`), and replacing JSONBin has been evaluated and declined, so **this
  audit does not propose changing it.** Recorded here only so the exposure is explicit. (If it
  ever mattered, the sole real mitigation without a backend rewrite is a thin serverless proxy
  holding the key.)

---

## 5. Design assessment (from the rendered app)

Reviewed live across Forge, Bestiary, Adventures, Combat, the character-detail modal, and at
mobile (375px) and wide-desktop (1366px) widths.

### 5.1 Strengths

- **Cohesive dark system.** A 44-token custom-property palette: `--bg #121317`, `--panel
  #1b1d22`, `--txt #e7e9ee`, warm coral brand `--brand #e2654d`. Inter for UI, JetBrains Mono
  for numerics. Consistent radii, spacing, and card treatment throughout.
- **The semantic statblock colouring is the standout.** A genuine, internally-consistent colour
  language: yellow = static bonuses you don't roll, **blue = dice you roll**, teal = ranges,
  violet = conditions, purple = spells, per-ability tinted pills (STR/DEX/CON/INT/WIS/CHA). It
  reads beautifully and it's *functional* (the blue things are literally the clickable rolls).
  This is the product's signature and it lands.
- **Combat tracker** uses faction colour (green party, red enemies) as a left stripe + HP
  underbars + state-adjective effect chips (Sapped/Hasted/Marked) — dense but legible.
- **Responsive depth.** Container-queries + breakpoints; the combat rows reflow from a single
  line to stacked cards on mobile, the two-column Forge collapses to one column, the sidebar
  becomes a drawer. This is more responsive care than most hobby apps attempt.
- **Polish details:** skeleton statblock loader, calm boot screen, FABs, draggable column
  resizers with persistence, status chips, the Notion-peek character modal.

### 5.2 Issues (small)

1. **`--faint` (#6e7580) fails WCAG AA for small text** — roughly **3.8:1** on `--bg`, under the
   4.5:1 floor (it's used for hints, placeholders, "·" separators). `--dim` (#a4aab4, ~7.6:1) and
   `--txt` (~15:1) are fine. Nudging `--faint` a few steps lighter (≈ `#7e858f`+) would clear AA
   with no design change of substance.
2. **Mobile combat overlap:** the active-combatant panel's "Add note" button is partially
   covered by the "Next turn" FAB at 375px. A bottom safe-area / extra `padding-bottom` on the
   panel would fix it.
3. **Information density in combat rows** — many small icons (reaction, concentration, kebab,
   AC, HP) compete at a glance; fine for a power user, slightly busy on first contact.
4. White-on-coral button text is ~3.3:1 (passes for large UI, marginal as a general rule) — leave
   for primary buttons, just don't reuse coral-on-white for small text.

---

## 6. UX flows

### 6.1 The core pipeline works

Forge (build with live preview + CR-derived placeholder suggestions) → Save to Bestiary →
drop into an Adventure's encounter against an XP budget → run Combat. Each step hands off
cleanly, and the Forge's "suggested value shows as placeholder, typed value is manual" model is
an elegant way to give CR-accurate defaults without locking the user in.

### 6.2 Friction points & gaps

1. **No undo/redo anywhere.** For a builder app this is the most notable absence. Destructive
   actions are guarded by confirm dialogs (and B187 added unsaved-change indicators + a "used in
   N encounters" warning on delete), but a mis-edit or accidental clear has no recovery beyond
   re-typing. Even a single-level undo on the Forge draft would be a meaningful safety net.
2. **Deleting a monster orphans encounter references** — combatants degrade to "?" / 0 XP. Now
   *warned* (B187) but not auto-cleaned or re-linkable. Consider an "unresolved combatant" repair
   affordance.
3. **Discoverability** of power features (bracket shortcuts `[C]`/`[2d6]`/`[ATK]`, Alt-click
   custom roll, the rule finder) leans on help icons and a Settings note. There's no first-run
   tour; a brand-new user lands on an empty Forge with no nudge toward "Load chassis" or "Paste
   5etools".
4. **Boot fallback is 9 s** (`index.html:23`) — if init stalls, the user stares at the boot
   screen for nine seconds before the failsafe reveals the app. 3–4 s would feel less broken
   while still tolerating a slow cold load.
5. **Save model is subtle.** One global draft `M`; switching creatures routes through
   `guardedLoad`/`forgeUnsaved`. Recently hardened and now solid, but it's inherent complexity
   worth keeping covered by the smoke/round-trip tests.

---

## 7. Content & copy

Overall the copy is **strong and on-brand** — active voice, sentence case, plain verbs, things
named by what the user controls. The Settings descriptions are model microcopy (clear, scoped,
no jargon). Empty states ("Select or create an adventure.", "No character details yet — add
abilities, skills or passives to …") are well done.

- **`README.md` had drifted** — it described "three plain files" with all logic in `app.js`, and
  "three views". Reality is 9 JS files across 4 views (Forge/Bestiary/Adventures/Combat).
  **Fixed in this pass** (see §8) — the layout table now lists every file and the four views.
- "Copy for Claude" / "Copy for Notion" read clearly given the documented workflow.
- Conventions already enforced (no trailing `…` on menu items; FA solid icons) keep the UI
  copy tidy; no violations spotted in the live walkthrough.
- Minor: nothing blocking. The bracket-shortcut help table in the Forge is genuinely good
  reference copy.

---

## 8. Changes made in this audit (safe fixes only)

The shipped code is clean (lint 0/0, no dead code after the B185 sweep, no debug/TODO debt), so
the only warranted safe fix was **documentation accuracy**:

- **`README.md`** — replaced the stale "three plain files / all logic in `app.js` / three views"
  layout section with an accurate 9-file table and the four-view list; corrected "drop the three
  files" → "drop the files". Docs only; no runtime code touched. `npm run verify` re-confirmed
  green.

Nothing in `data/parsers/core/forge/engine/bestiary/adventures/combat/seed/app.js` or
`styles.css` was modified.

---

## 9. Prioritized recommendations

**P1 — high value, low risk**
- Add **parser round-trip tests** (sample 5etools JSON/text → expected Forge monster) in the
  existing jsdom harness — covers the riskiest, least-tested code with no new deps.
- Bump **`--faint`** to clear WCAG AA (≈ `#7e858f`+); fix the **mobile combat FAB overlap**.
- Add a **single-level undo** for the Forge draft (or at minimum a "restore last cleared").

**P2 — worthwhile, moderate effort**
- `requestAnimationFrame`-coalesce `renderPreview` to batch keystroke re-renders.
- Break up the 100–150-line functions (`openCharacterDetail`, `renderCombat`) into named
  template + bind helpers; longer term, split `combat.js`/`adventures.js` by sub-feature.
- Add an "unresolved combatant" repair affordance for orphaned monster references.
- Shorten the boot fallback timeout (9 s → ~4 s).

**P3 — nice to have**
- A lightweight first-run nudge toward Load chassis / Paste 5etools.
- Optional `// @ts-check` + JSDoc on `core.js`/`parsers.js` for shape safety with no build.
- A small CSS dead-class linter to replace the periodic manual audit.

**Explicitly out of scope (locked decisions):** replacing JSONBin / the embedded key; adding a
bundler or any build step; module syntax. These are intentional and should stay.
