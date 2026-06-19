# CLAUDE.md — Monster Forge

> Combat tracker / creature-library web app — a **no-build static site** served
> as-is (GitHub Pages). This file is the index; the full dev workflow lives in
> `DEVELOPMENT.md`, imported below so it's always in context.

@DEVELOPMENT.md

## The two rules that must not break

- **YOU MUST keep it no-build.** `index.html` + `styles.css` + the JS files load
  as classic `<script>` tags sharing **one global lexical scope** (a function in
  `data.js` is callable from `app.js` with no imports). Never add a bundler,
  module syntax, or a build step.
- **YOU MUST run `npm run verify` after any JS edit** before treating it as done
  (`check` → `lint` → `test`). IMPORTANT: the Edit tool occasionally swaps a
  straight `"` for a smart `"` — `node --check` catches it, so never skip verify.
  Update `CHANGELOG.md` (newest batch first) each batch; don't copy its history here.

## Working here

- Match the existing patterns in the shared-scope files; no new globals without
  need (ESLint `no-undef` flags typos).
- Automated tests are the regression floor, **not** a replacement for looking at
  the UI — still verify visually in the live preview.

## Context boundary

This is the **code companion** to my D&D work (`~/Documents/D&D`) — software
engineering here, not design. Don't carry token/card aesthetics into the app, or
app conventions back into the design work. (See `~/.claude/CLAUDE.md` for the
cross-project rules.)
