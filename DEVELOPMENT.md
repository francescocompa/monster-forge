# Development

Monster Forge is a **no-build static site**: `index.html` + `styles.css` + twelve JS files, served as-is
(GitHub Pages). The shared scripts are loaded as classic `<script>` tags and **share one global lexical
scope** — a function defined in `data.js` is callable from `app.js` with no imports. Keep it that way;
there is no bundler. The ordered list (`data.js` first, `app.js` last) lives in `package.json`'s `check`
script and index.html's loader — those, plus `test/harness.js` and `eslint.config.js`, are the four sync
points that must stay matched when a file is added.

## Tooling (dev-only — the shipped site stays no-build)

```sh
npm install        # one-time: eslint, jsdom, fake-indexeddb
npm run check      # node --check on every shared script (syntax / smart-quote breakage)
npm run lint       # eslint — blocks on errors, warnings are advisory
npm test           # init smoke test + pure-function maths (jsdom)
npm run verify     # all three, in order
npm run lint:css   # advisory: classes in styles.css with no JS/HTML match (dead-CSS guide; never blocks)
npm run typecheck  # advisory: tsc --checkJs on parsers.js (catches typos/signature drift; never blocks)
npm run grade      # advisory: grade the CR math layer against a 5etools bestiary corpus (needs the corpus)
```

`grade` (T1.5) runs the CR calculator (`offensiveCR`/`defensiveCR` in `data.js`) over a full 5etools
bestiary and reports how close the blended CR lands to the published label. It needs an external corpus
(`node scripts/grade-corpus.mjs [path]`, or `MF_CORPUS=…`; defaults to the local `5etool_mirror`), so it
is NOT in `verify` and skips cleanly when no corpus is present. The committed accuracy floor — a handful
of composite monsters graded end-to-end — lives in `test/cr-model.test.js` and DOES run in `verify`; the
full derivation and per-column calibration is documented in `CR_CALIBRATION.md`.

`typecheck` (B201) runs `// @ts-check` over `parsers.js` — the pure 5etools-import layer, where a shape bug
actually bites. The shared scripts run in one global scope, which tsc's `checkJs` can't see across files,
so `scripts/gen-globals.mjs` regenerates `globals.d.ts` (ambient `declare const` for every cross-file global,
parsed with espree — the same trick `eslint.config.js` uses) before tsc runs. It's advisory (not in
`verify`) and editor-friendly: `globals.d.ts` is gitignored and regenerated on each run; open `parsers.js`
in an editor after one `npm run typecheck` for inline checking. To extend coverage, add `// @ts-check` to
another file and a matching `include` entry in `tsconfig.json` (drop its own globals from the generator).

`lint:css` automates the periodic manual dead-selector sweep (B185 removed 45 by hand). It's advisory —
not part of `verify` — because it can't see classes built from string fragments; the documented dynamic
families are allowlisted in `scripts/lint-css.mjs` (add a prefix there if it flags a known-dynamic class).

Enable the commit gate once (runs `verify` before every commit):

```sh
git config core.hooksPath .githooks
```

## What the safety net catches

These are the project's historically painful failure modes, each now covered:

- **Smart-quote / syntax breakage** (the Edit tool occasionally swaps a `"` for a `“`) → `node --check`.
- **A typo'd or renamed global** → ESLint `no-undef`. The flat config (`eslint.config.js`) parses each
  shared file's top-level declarations with espree and registers them as globals, so cross-file
  references don't false-positive — and it stays correct as you add functions.
- **A top-level `addEventListener` bound to a DOM node that no longer exists** (throws during init and
  white-screens the live page) → the smoke test (`test/smoke.test.js`) boots the real `index.html` in
  jsdom with the shared scripts injected into one realm and asserts init produces zero errors.

## Testing notes

- `test/harness.js` mounts `index.html` in jsdom, stubs `fetch`/`localStorage`/`indexedDB`/`matchMedia`,
  and injects the scripts so they share scope exactly like the browser. Read globals with
  `window.eval("…")` — top-level `let`/`const` live in the realm's global lexical environment, not on
  `window`.
- Manual/visual verification still happens in the live preview (the `monster-forge` preview server).
  The automated tests are the regression floor, not a replacement for looking at the UI.

## Cloud storage & the security model (Firebase RTDB)

Cloud data lives in a Firebase Realtime Database (`FB_BASE` in `core.js`), reached over plain REST — no
SDK, so the site stays no-build. The client "key" is just the DB URL and is *designed* to be public:
**access is controlled entirely by the database's server-side rules, not by keeping anything secret.**
That means the rules ARE the security boundary. They must stay scoped to exactly two namespaces:

```json
{ "rules": {
  "installs": { "$inst": { ".read": true, ".write": true } },
  "shares":   { "$id":   { ".read": true, ".write": true } }
} }
```

- `installs/<per-device-random-id>/…` — one device's private library (monsters/adventures/party). The id
  (`fbInstallId()`, localStorage `mf_fbid`) is the only thing protecting it, so it must never leak into a
  share payload, URL, or QR.
- `shares/<random-id>` — ephemeral combat-share snapshots + the player write-back channel (open by design;
  players must write to it). Player-supplied data from here is untrusted — sanitize at ingestion
  (`_pmSafeRoll` and friends in `combat.js`) and never render it unescaped (see `esc()` in `core.js`).

**Do NOT leave the console's default "test mode" rule in place** — it grants root read/write and expires
after 30 days, after which one `GET /installs.json` would dump every install. Paste the scoped rules above
instead. If cloud saves or sharing ever break, check the Firebase console rules FIRST before assuming a code
regression. Re-check the rules periodically; they are the whole game.

## The effect schema (Phase 2 — designed T2.1, populated T2.2 · data lives in data.js)

The mechanics payload that turns a tracked effect from prose into machine-readable facts. Decided
context (Q2.A/Q2.B, 2026-07-12): the tracker is **remind-first** — payloads render as reminder chips
and prompt-strip entries; the DM rolls. Nothing in the schema assumes auto-apply, but every atom is
precise enough that a per-class auto-apply mode can consume it later without a schema change.

### Where payloads live

- **`CURATED_EFFECTS` entries** (data.js) carry an optional `mech` field (populated in T2.2 from the
  XPHB 2024 text in the 5etools mirror — which also corrected four drifted texts: Resistance,
  Guidance, Invisibility, Sanctuary).
- **Standard conditions** keep their *text* from the parsed reference library (`findCondition`), but
  their *mechanics* are ours: `CONDITION_MECH` in data.js, keyed by canonical condition name — the
  15 XPHB 2024 conditions (Exhaustion and Invisible are among the 15). Text and payload marry at
  chip render. The closed vocabularies are exported beside it: `EFFECT_ATOM_KINDS`,
  `EFFECT_IF_TERMS`, and the T2.9 weight map `EFFECT_CONTROL_W`; `test/effect-mech.test.js` is the
  schema-integrity floor (every atom validates against the vocabularies; load-bearing payloads are
  asserted against the rules text).
- A tracked instance (`it.conditions[i]` in combat) stays `{name, rounds, endWhen, endWho, effGroup}`
  — the payload is looked up from the definition, never copied per-instance. Per-instance facts that
  vary (a save DC from the inflicting statblock) ride on the instance as `dc` when known.

### The `mech` payload

```js
mech: {
  atoms: [ /* typed mechanical facts, see below */ ],
  save:  { abil:"wis", when:"end", who:"self", onSuccess:"end" }, // repeat-save descriptor (optional)
  end:   { on:["attacks","casts"] },   // early-termination triggers (optional)
  conc:  true,                          // rides the source's concentration (optional)
  implies:["Incapacitated"],            // condition inclusion chains, e.g. Paralyzed (optional)
}
```

**Atoms** are flat `{k, ...}` records. One atom = one fact = one reminder line. `who` says whose
roll the fact touches: `self` (the afflicted creature's own rolls), `attackers` (anyone targeting
it), `source` (the effect's owner, resolved via the instance's `endWho`/inflicter — Vex, Hex).

| k | fields | example |
|---|---|---|
| `adv` / `dis` | `on:"attack"\|"attacked"\|"check"\|"save"\|"save.dex"…`, `who`, `if?` | Poisoned: `{k:"dis",on:"attack",who:"self"}` |
| `autofail` | `on:"save.str"\|"save.dex"`, `who:"self"` | Paralyzed str/dex saves |
| `autocrit` | `if:"melee5"`, `who:"attackers"` | Paralyzed: hits within 5 ft crit |
| `bonus` | `dice:"1d4"\|"-1d4"`, `on:"attack"\|"save"\|"check"`, `who` | Bless/Bane |
| `ac` | `delta:±n`, `who:"self"` | Haste +2, Slow −2 |
| `speed` | `set:0` \| `mult:0.5\|2` \| `delta:-10`, `who:"self"` | Grappled set 0; Slow-spell mult .5 |
| `incap` | — (no actions/reactions; implied by the big four) | Incapacitated and its supersets |
| `noreact` | — | Slow spell |
| `dmg` | `dice:"1d6"`, `dtype:"Necrotic"`, `who:"source"`, `vs:"target"` | Hex/Hunter's Mark rider |
| `immune` | `to:"Frightened"` (condition or dtype) | Heroism |
| `note` | `text` — the escape hatch for facts no atom encodes; renders verbatim | Sanctuary's retarget save |

`if` clauses are a small closed vocabulary, not free text (`EFFECT_IF_TERMS`): `melee5` (attacker
within 5 ft) · `beyond5` · `sighted` (attacker relies on sight / can see the target) · `unseen`
(unless the attacker can somehow see it) · `sourceVisible` (while the effect's source is in line of
sight) · `vsNonSource` (against any target other than the effect's source). Extend the vocabulary
deliberately; anything situational beyond it belongs in a `note` atom — remind-first means a
verbatim sentence is always an acceptable payload; never contort a rule to fit an atom.

T2.2 extensions (all consumed by the data, locked by the test): atoms may carry `once:true` (spent
after the next qualifying roll — Sap, Vex); `bonus` may carry a flat `delta` instead of `dice`;
`bonus`/`speed` may carry `perLevel:true` (scales by the instance's level — Exhaustion); `bonus.on`
includes `d20` (every D20 Test); `end.on` terms are `attacks` · `casts` · `dealsDamage`.

### Reminder timing (who consumes which atom, and when)

- **Turn-start / turn-end edges** (the existing `combatAdvance` edge walk, `endWhen` semantics):
  `save` descriptors surface on the **prompt strip** (Q2.B) at their edge; `speed`/`incap`/
  `noreact` atoms render as chips when the afflicted combatant's turn starts (T2.3/T2.6).
- **Act-time:** `adv`/`dis`/`bonus`/`autofail` with `who:"self"` surface on the active combatant;
  `who:"attackers"`/`autocrit`/`dmg` surface when someone targets the afflicted creature.
- **Concentration** (`conc`): damage to the source prompts the CON save on the strip
  (DC max(10, ⌊dmg/2⌋)); a break removes every effect linked to that source (T2.4).

### Classifier contract (T2.9 — designed together with this schema, by requirement)

`roleFeatures`' control signal today counts condition NAMES in statblock text (save-gated full,
rider half). T2.9 upgrades it to read payloads: score an effect's control value from its atoms —
`incap`-class 1.0 · `autofail` 0.8 · `speed set 0` 0.6 · `adv/dis` 0.4 · `speed` partial 0.3 ·
`bonus`/`dmg`/`ac` 0 (that's damage/support, not control) — keeping the save-gated × 1 / rider × ½
weighting. The weights live in ONE exported map next to `CONDITION_MECH` so the classifier, the
benchmark, and any future designer math read the same numbers. Acceptance for the re-run: the P1.9
kit-invisible misses close without new regressions (`npm run benchmark`).

**Schema rules:** atoms are facts, not renderings — copy lives in the chip renderer, not the data.
No new atom kinds without a consumer. The payload is optional everywhere: an effect with no `mech`
degrades to today's behavior (text popover, manual tracking), so T2.2 can land incrementally.

## Conventions

See `CHANGELOG.md` (newest batch first) and the architecture notes. After editing any JS file run
`npm run verify`; update `CHANGELOG.md` each batch.
