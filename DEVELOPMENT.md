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
```

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

## Conventions

See `CHANGELOG.md` (newest batch first) and the architecture notes. After editing any JS file run
`npm run verify`; update `CHANGELOG.md` each batch.
