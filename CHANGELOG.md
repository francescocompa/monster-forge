# Changelog

Monster Forge — D&D 2024 homebrew monster & encounter builder. No-build static
site (`index.html` + `styles.css` + the shared scripts, `data.js` … `app.js`).
Newest batches first.

## Batch 250 — security: fix player→DM stored XSS (audit P1)
- Full-project re-audit refreshed `AUDIT.md`; its P1 was a **confirmed stored-XSS**. Any player device can
  push a crafted dice-roll (or sheet edit) over the open share write-back path; the DM app folds it into the
  roll log and rendered it **unescaped** — proven live (`<img onerror>` executed in the DM origin, which can
  read `mf_fbid` and tamper with the whole cloud library). Two root causes, both fixed:
  - **`esc()` never escaped quotes** (only `& < >`), so user/player strings interpolated into `value="…"`/
    `title="…"`/`data-*="…"` allowed attribute breakout. It now also encodes `"`→`&quot;` and `'`→`&#39;`.
    All 310 call sites are HTML contexts (verified), and quotes/apostrophes still decode correctly in text
    and input values, so there is no visual regression.
  - **The player→DM ingestion boundary trusted field types.** New `_pmSafeRoll` sanitizes every incoming
    roll event in `pollShareEdits`: `total` coerced to a finite number, `id` validated (`^[\w-]{1,40}$`),
    `type`/`abil` whitelisted (they flow into unescaped CSS classes), free-text clamped.
  - Defense-in-depth: `rlSingleHTML`/`rlSubHTML` now `esc()` `total`/`id` at the sink too, so the roll-log
    render is safe regardless of caller.
- Verified live: the exact prior payload now renders inert (`&lt;img…&gt;`, `data-rollid="x&quot;onx"`),
  the sanitizer rejects bad ids/types, and the Firebase share round-trip still works. `npm run verify` green.

## Batch 249 — docs: fix "three JS files" drift, stale datalist comment
- `DEVELOPMENT.md` and the changelog header still described the pre-split site ("the three JS files",
  five-file list); updated to the twelve-script reality and pointed at the four sync points
  (`package.json` check, index.html loader, `test/harness.js`, `eslint.config.js`) as the source of truth
  for the ordered list.
- Fixed a stale `roster.js` comment claiming the skills chipfield "keeps the datalist combobox" — skills
  have used the custom add control since B160. (The one deliberate native-datalist survivor is the
  bestiary tag-add input.)

## Batch 248 — mobile tap-highlight, template leaking class/subclass, dice margin widened
- **Killed the default mobile tap-highlight flash everywhere** (`*{-webkit-tap-highlight-color:transparent}`).
  Every interactive element already has its own hover/active/focus treatment (or intentionally none for
  plain rows), so the browser's translucent blue tap rectangle only ever fought with those.
- **Character "Save as template" was leaking Class/Subclass onto new characters.** `buildPcTemplate` only
  blanked scalar field values; an array-valued chipfield (Class, Subclass) slipped through unblanked. Now
  blanks arrays to `[]` and objects to `{}` too.
- **Widened the B244 dice edge-balance fix's margin (0.04→0.06) and step budget (600→900)** after
  stress-testing the actual reported scenario — a crit with two damage types throws 9 dice across two waves;
  busier scenes need more headroom for the nudge-retry to converge on every die. 540 dice-checks across 60
  crit two-wave throws: 1 residual mismatch (~0.2%), down from a clearly frequent failure pre-B244. This is a
  large improvement, not a proven elimination — a very rare edge case likely remains in the busiest scenes.

## Batch 247 — fix party-row chipfield actually starving on flex-grow, not shrink
- Every prior pass at the party-chip clipping bug (B169, B178/179, B241) retuned the shrink side; the real
  bug was `.pc-name`'s `flex-grow:3` out-competing `.pc-chips`' `flex-grow:1` for leftover row space 3-to-1,
  ballooning the name into empty air even with room to spare while chips (the actual data) stayed clipped.
  `.pc-name` is now `flex-grow:0`; chips get all the leftover space. Verified at 1200/700/480/400px with a
  long-name + 3-chip stress case: no dead gap with room to spare, both degrade together (chips first) only
  when genuinely tight.

## Batch 246 — restore End combat + fix encounter status getting silently overridden
- Batch 162 ("combat is always live") removed the old Start/End FAB and `endCombat()` but left `encStatus()`
  reading `e.combat.active` as an override — and since that flag was set true once and never false again,
  every started encounter showed "active"/"Resume" forever, discarding any manual status pick. `encStatus()`
  now just reads `e.status`. New `endCombat(a,e)` clears the live combat and marks the encounter Completed
  (status stays freely editable after, no further effect on the cleared combat) — exposed via "End combat"
  in the combat tab's round-bar tools menu and a new dropdown chevron on the adventure card's Resume button
  (End combat / Reset & restart). Also fixed a bug found during testing: the combat tab's own "always
  auto-start" render logic instantly undid End Combat on the next render; it now skips auto-start for a
  "completed" encounter, and the not-started screen got the real "Start again" button its copy always
  promised but B162 never wired up.

## Batch 245 — fix Slow effect popover still showing mastery text
- B242's group-disambiguation only reached the chip's ref/class computation — the actual popover content is
  built by a separate, generic reflink system (`engine.js` `showRefpop`/`refContent`) that only had the
  chip's `data-ref`/`data-name`, not its `effGroup`, so it always fell back to the mastery. Threaded
  `effGroup` through as a `data-eg` attribute, read by `showRefpop`. Verified live: the Slow spell's popover
  now correctly shows "Spell effects" with the spell's own text.

## Batch 244 — dice edge-balance fix + player-mode full-height initiative list
- **3D dice could show a number that didn't match the roll.** Reported and reproduced: an attack roll's d20
  visibly balanced on an edge between two faces, neither of which was the actual to-hit result. Root cause —
  `d3dAtRest`'s settle check only watches velocity/cannon-sleep, which can fire while a die is still
  precariously perched on an edge or vertex (a known failure mode of physics-based dice); it then gets
  relabeled and replayed frozen in that ambiguous pose. `d3dPreSim` now requires the top face's y-normal to
  clearly beat the runner-up before accepting a settle (`d3dFaceMargin`); an ambiguous landing gets a small
  random nudge (`d3dNudge`) and re-settles. Verified with 120+ synthetic trials (random + adversarial
  straight-drop landings, including a d20 for every target value 1–20): 0 mismatches, 0 hit the raised step
  cap (300 → 600).
- **Player mode's initiative list was stuck in the top ~44% of the screen** with a dead void below it on
  narrow viewports — the `@media (max-width:1080px)` combat-grid rule unconditionally reserves ~56% of the
  height (`--cah`) for the DM's detail panel, even though that panel is `display:none` in player mode. Player
  mode now always gets a single full-height row.

## Batch 243 — replace JSONBin with Firebase Realtime Database
- **Cloud storage moved off JSONBin entirely.** Its single hardcoded master key (shared across every
  install) hit the account's request quota — "Requests exhausted" — which took down cloud saves and combat
  sharing everywhere at once, locally and on the deployed site, for everyone, simultaneously. Firebase RTDB's
  client key is *designed* to be public (security comes from server-side rules, not key secrecy), which is
  the correct model for a no-backend static site, not a stopgap.
- `jbinGet`/`jbinSet` (library/adventures/roster) now read/write `installs/<per-device-id>/<key>` on the RTDB
  REST API — same function names/signatures as before, so no call sites elsewhere needed to change. Same
  local-mirror-first / retry-on-429-5xx / dirty-flag behavior. The per-device id replaces JSONBin's
  bin-id-per-key scheme; generated once, persisted in `localStorage`.
- `jbinSetPublic`/`jbinDeletePublic`/`jbinReadBin` (combat share + player write-back) move to `shares/<id>`,
  with ids generated client-side instead of server-assigned.
- **The player-edit "Access Key" setting (B203) is gone.** Firebase's open-rule write path means any
  player's phone can already write to its own share bin — there was nothing left for a pasted JSONBin Access
  Key to gate. Removed the Settings → Combat key field and `settings.combat.playerEditKey`; the share
  dialog's Player Editing Off/On toggle now works standalone, no setup step.
- Verified live against the real database: save/load round-trip, share start/stop, and player-editing-on all
  confirmed working end to end (`jbinGet` needed an explicit `cache:"no-store"` — without it, a save
  immediately followed by a read intermittently served a stale/cached empty response).

## Batch 242 — disambiguate the Slow weapon-mastery vs Slow spell effect chip
- Both are named "Slow" in 5e 2024 canon (a real name collision, not a data bug), and the add-effect picker
  only stored a bare name, so the condition chip's definition popover always showed the weapon mastery's
  rules text even when the spell was picked from the list. The picker now tags mastery/spell items with
  their group (`data-eg`) and carries it onto the condition record (`c.effGroup`); `findCuratedEffect` prefers
  an exact name+group match and falls back to name-only for conditions saved before this existed.

## Batch 241 — playtesting fixes: party chips, adventure-list crumb, multi-damage attacks, Slow spell
- **Party-roster chip cluster no longer clips before it needs to.** `.pc-chips` was `flex:1 100 30px` — a
  30px basis with a 100x shrink factor absorbs almost all of any shrinkage instantly, crushing the chips to a
  sliver well before the row is actually tight. Now `flex:1 12 70px`: chips still yield to the name first, but
  scroll/fade under their mask gracefully instead of being squeezed to a few visible pixels.
  (`styles.css` `.pc-chips`.)
- **The adventure-list breadcrumb is now a second way back to the list at narrow widths.** `setCrumbs` takes
  an optional `onUp` callback that turns every non-current crumb into a button; the adventures page wires it
  to the same `.adv-drawer` toggle as the existing back-arrow button, so "Adventures" in the breadcrumb also
  reopens the list drawer on mobile (previously that small corner button was the only entry point).
  (`engine.js` `setCrumbs`, `adventures.js` `renderAdvDetail`.)
- **Attacks with more than one damage instance now roll all of them.** A line like "Hit: 9 (2d8) Bludgeoning
  damage plus 7 (2d6) Psychic damage" was only ever rolling the first — `colorizeAttackNames` grabbed a single
  `[data-rolltype="damage"]` span per block. It now collects every damage span in the block (pipe-joined on
  the name's dataset), and `rollAttackSequence`/`rollRechargeSequence` roll and report each one, joined with
  "plus" in the notification and roll log. (`engine.js`.)
- **Added the "Slow" spell to the curated combat-effects list.** The weapon-mastery Slow was already there,
  but the actual concentration spell (common enemy-side control effect) was missing from the always-available
  add-effect dropdown, unlike Bane/Haste/Hex/Hold Person and friends. (`data.js` `CURATED_EFFECTS`.)
- Investigated the reported "shared initiative — half the screen hidden behind a mask" bug: the character-gate
  modal and the bottom-sheet character preview (`pm-gate-bg`/`pm-sheet-bg`) both checked out correctly in
  testing (full-viewport fixed overlay, correct z-index/stacking, dims as coded) via the network-free "Preview
  as player" path. Could not reproduce a masking defect in the dev preview; likely device/browser-specific
  (e.g. a mobile Safari dynamic-toolbar viewport quirk) — needs a repro from the reporting device.

## Batch 240 — animated-logo loading overlay + visual welcome modal + combat first-run hint
- **Loading overlay uses the animated brand-eye logo** (the boot-screen mark) instead of a spinning d20,
  everywhere `showLoadingOverlay` appears (zip read, adding libraries, re-parse). The SVG is cloned from the
  live `.boot-logo`/`#brandMark` so there's no duplicated markup; `.loading-logo` drives the eye animation in
  CSS (gaze/blink/pupil/frame), reduced-motion safe. Dead `.loading-spin` CSS removed. (The d20 stays where
  it's a real dice feature: roll-init button, dice cursor, "Rolling initiative…".)
- **Welcome modal redesigned to be visual** (B238 was a numbered list). The four screens are now tappable
  blocks — each with the real rail icon (cloned from the sidebar) + a one-line tag — and tapping one expands a
  detail panel about that screen (`WELCOME_STEPS`). Forge is open by default. The 5etools-library callout +
  Load-the-library CTA stay. New `.mfw-steps`/`.mfw-step`/`.mfw-detail` styles (old `.mfw-flow` removed).
- **First-run combat hint:** the first time a DM opens a running combat, a one-time dismissable bar points at
  the two least-obvious interactions ("Click a name to roll… Click HP to apply damage and healing"); dismissed
  for good via localStorage `mf_hint_combat`, hidden in player mode (`combatHintHTML` + `.combat-hint`).
- Planning only (not built): a **smart CR calculator + CR adjuster** for the Forge is now on the roadmap.

## Batch 239 — onboarding follow-ups: consistent reachable help popovers + em-dash copy sweep
- **Help "?" buttons unified + popovers now reachable.** The Preset-libraries help was a one-off
  (`.help-btn` + a `showPopover` that closed on `mouseleave`, so the popover vanished the moment the pointer
  travelled toward it). It now uses the shared `.cr-help` button + `bindHelpHover` like the chassis /
  add-combatant pickers, and `bindHelpHover` no longer closes on `mouseleave` (it closes on the next outside
  click) so the help text is reachable everywhere. Removed dead `.help-btn`/`.help-pop` CSS; added `.cr-pop a`
  link styling. `PRESET_HINT` shortened to about a third (kept the source link + Download-ZIP step).
- **Em dashes removed from user-facing copy** across all views (toasts, settings notes, modal/confirm text,
  field placeholders, tooltips/titles, the welcome modal, the bracket-token help table). Replaced with
  sentence breaks, colons, or commas to fit each context. Em-dash *glyph* placeholders (`"—"` for empty
  values) and code comments were intentionally left as-is.
- **(Local dev only, not shipped)** the gitignored `testkit.js` panel gains a **Welcome** button to
  re-trigger the first-run modal (clears `mf_welcomed`, calls `maybeShowWelcome`).

## Batch 238 — onboarding: first-run welcome modal + matter-of-fact empty-state/import copy
- **New first-run welcome modal** (`maybeShowWelcome`, app.js; localStorage `mf_welcomed`) replaces the old
  thin in-Forge tip (B200's `maybeShowOnboarding` + `.forge-onboard`/`.fo-*` CSS, both removed). Names the
  four-screen pipeline (Forge → Bestiary → Adventures → Combat) as a numbered list, states the one
  non-obvious fact ("Saving a creature puts it in the Bestiary; encounters draw from there"), and makes
  **loading the 5etools library the primary first step** — an accent callout linking
  `github.com/5etools-mirror-3/5etools-src` (Code → Download ZIP) with a "Load the library" button that
  closes the modal and opens the Preset-libraries manager. Shown once; reuses the existing `openModalRaw`
  modal primitive. New `.mf-welcome`/`.mfw-*` styles in styles.css.
- **5etools zip source surfaced where it was missing.** `PRESET_HINT` (the Preset-libraries help popover)
  now leads with where to get the data + the Download-ZIP step + the source link, before the import
  mechanics. The paste importer (`openImportModal`) copy now explains what pasting *means* (open a creature
  on 5e.tools, copy its statblock text, one at a time) and points bulk imports at the library instead.
- **Empty-state copy tightened, matter-of-fact:** Bestiary empty (`libEmptyMsg`) now mentions paste + the
  bulk-library path; Adventures list/detail empties point at ＋ New adventure. (No getting-started
  checklist — dropped per design review; audience is DM-side new users only.)

## Batch 237 — player mode: hide waiting, green "You" tag, "Playing as" in the header
- **Waiting combatants are hidden from players** — filtered out of the shared snapshot (both the lite list and
  the in-app order).
- **"You" tag uses the row's local accent (PC green)** for the whole chip (text + tint + border) via
  `--sel-accent`, not the global brand accent; and hover now underlines only the name (`.ci-nm`), not the tag.
- **"Playing as <name>" moved into the header's Load-encounter slot** (`playerPlayingAsBtnHTML`, reusing
  `.ct-loadbtn` so it collapses to just the icon when the header narrows); tapping it reopens the gate. The
  slim `.pm-bar` above the order is gone.

## Batch 236 — roll log: player-side My/DM tabs + subtler tab styling
- **Player side now gets roll-log tabs too** — "My rolls" / "DM rolls", splitting the shared log by whether a
  roll is attributed to the player's own claimed character (`pmMyRollName`). Shows when the DM is mirroring dice
  and the player has claimed a character. (DM side keeps "My rolls" / "Player rolls".)
- **Subtler tab section** in both pages — dropped the solid-accent fill + boxed buttons for a flat underline
  style: faint inactive labels, a brighter label + accent-soft underline on the active tab, no panel background.

## Batch 235 — initiative sharing: character-gate modal (pick or create-to-join)
- **Replaced the "Playing as" picker with a gating modal + dark overlay.** In player mode with editing on, the
  page is gated until you choose your character: pick a named PC, or type a name to **join the live fight as a
  new PC**. A join writes to the share's write-back bin (`rec.joins`); the DM creates a roster character + a
  combat instance with the player's chosen id, so the new character appears in the order for everyone; the
  player sees themselves optimistically until the DM confirms (`pmInjectJoin`). Multiple devices may pick the
  same character (claims are per-device, non-exclusive).
- Once chosen, a slim "Playing as &lt;name&gt; · Change" bar replaces the picker; Change reopens the gate
  (dismissable, marks your current pick). The initial gate has no dismiss.

## Batch 234 — initiative sharing: "show dice to players" mirror + "You" badge
- **New share toggle "Show dice to players".** When on, the DM publishes the shared roll log in the snapshot;
  players see the roll log, the 3D dice animate when anyone rolls (their own immediately, the DM's/others' on
  the next poll), and the result alerts. When off, players get no dice UI at all (`clickRollOn` is gated on it
  in player mode, so rolling, the d20 cursor, and the log are all suppressed). DM rolls now republish the
  snapshot; player rolls fold back and republish so every device converges. Shared roll ids dedupe local vs
  echoed entries so nothing double-animates. (`snap.diceOn`/`snap.rolls`, `pmIngestRolls`.)
- **"You" badge** marks the player's own claimed character row (after the name), in the brand accent.

## Batch 233 — initiative sharing: enemy names, enemy-condition persistence, read-only react/conc, encounter name
- **Players see combatant names** now — enemies show their custom nickname if set, else the statblock name
  (`playerSafeInstance` sends `it.name`); HP/statblock stay obscured.
- **Fixed enemy conditions reverting** — the DM-side poll skipped every non-PC edit, so a player-set enemy
  condition was never applied/republished and vanished when the player's optimistic window lapsed. The poll
  now applies enemy edits (conditions only; HP/init stay DM-owned).
- **Enemy reaction & concentration are visible but read-only for players** — a plain coloured icon (no button
  bg/border) with a state popover on hover/click, instead of an editable chip. Applies to any row the player
  doesn't control. (`.ci-react-ind`/`.ci-conc-ind`.)
- **Player header shows the encounter name** (published in the snapshot) instead of the hardcoded
  "Initiative"; falls back to "Initiative" when the encounter is unnamed. (Difficulty was already hidden.)

## Batch 232 — 3D dice: crit effect coincides with the extra dice appearing
- On an attack crit the crit flourish (glow/sheen + d20 pop) now fires **the moment the extra crit dice drop
  in** (wave-2 launch), not when they settle at the card stage. The crit pulse is driven in any roll state so
  the d20 pops during wave-2 flight; a `critFired` guard prevents a double-fire. Lone crits with no extra dice
  (e.g. a bare nat-20) still flash on settle.

## Batch 231 — roll-log pill/icon hover popover: styled + structured like the log
- The collapsed-pill / mini-icon **hover popover was unstyled** — its row HTML lived in a bare `.popover`, so the
  `.roll-log .rl-*` row styles never matched. It now renders inside a `.roll-log` wrapper (`.roll-log rl-poprow`)
  so it picks up the exact log-row styling, in the standard popover chrome.
- It now shows the **newest group exactly as the log structures it** (source + label header + each sub-roll with
  totals, breakdown, type tags, and the ability colour bar) instead of a single bare row. Extracted `rlGroupHTML`
  (shared by the log body) + new `rlLatestGroup`; `showRollPopover` uses them.

## Batch 230 — 3D dice crit sheen tuning
- Made the crit sheen sweep **faster** (520→420ms) and **softer** (gradient opacity .92→.6) per feedback.

## Batch 229 — 3D dice: richer crit flourish (sheen + bloom)
- **Reworked the crit VFX** (the plain glow read flat). Now a **vivid terracotta bloom** snaps in over the crit
  die while a **glossy sheen glint sweeps across its face**, and the die does a **snappier scale-pop** (pulse
  shortened 750→420ms, peak ~1.22). `#d3dCrit` gains a `.d3dcrit-glow` (brighter, more saturated radial) +
  `.d3dcrit-sheenwrap`/`.d3dcrit-sheen` (a light streak clipped to the die face). Still DOM/CSS only,
  material-agnostic, reduced-motion safe. Picked from an animated mockup of three options.

## Batch 228 — 3D dice: staged crit dice, crit glow+pulse flourish, bigger d10/d12 numbers
- **Crit damage is now thrown in two waves.** On a critical hit the attack to-hit + the *base* damage dice
  tumble first; once they land, the **extra crit dice drop in** as a second wave, and the result alert is
  **held until that second wave settles**. New `d3dSplitCrit(parts)` halves a crit-doubled damage parts string
  into `{base, extra}` (flat modifiers ride with the base); the throw is generalised into `d3dLaunchWave` and
  `rollDice3D` chains a `pending` wave. Wired from `rollAttackSequence` (nat-20) and `doRoll` (crit-chip damage).
- **Crit flourish — the die awakens.** On a crit a terracotta glow blooms over the die showing the logo (its
  max face, prefers the d20) while the die itself does a quick scale pulse. `d3dCritFlash`/`d3dCritEnd` +
  `d3dCritPulse` (driven in the loop's "still" branch) + a `#d3dCrit` radial-gradient halo. Material-agnostic,
  no WebGL shader work; honours reduced-motion (the 3D layer already no-ops there). *(The eye poke-animation
  can't ride the logo: a CSS animation can't be rasterised onto a baked WebGL texture in this no-build setup,
  so the VFX rides the die instead.)*
- **Bigger d10 & d12 numbers** — bumped their label-size factors (d10 0.52→0.60, d12 0.62→0.70; d20 unchanged).

## Batch 227 — 3D dice: real d10, fixed d12 faces, bigger d6 numbers
- **Added the d10** as a proper **pentagonal trapezohedron** (it was falling through to the 6-sided box). The
  apex height is derived from the zigzag amplitude so every kite face is planar (and so merges to exactly 10
  faces); excluded d10 from the box path; physics hull builds from the same geometry.
- **Fixed the d12 showing two numbers per face.** `d3dFaceList` merged triangles by a rounded normal *string
  key*, which split coplanar pentagon triangles (the d12 came out as 17 face-groups). It now clusters by
  normal *direction* (dot > .999) and orients normals outward — d12 → 12 faces, d10 → 10, d20/d8/d4 unchanged.
- **Bigger d6 numbers** — bumped the d6 label size (its box face is large, so the old factor read small).

## Batch 226 — roll log: tidy-up (always-shown breakdown, bottom tabs, full-row hover popover)
- **Breakdown is always shown** now (removed the click-to-reveal — there's room).
- **"My rolls / Player rolls" tabs docked to the bottom** of the log (were under the header).
- **Title is just "Rolls"; removed the roll counter** badge.
- **Mini icon & floating pill hover → a custom popover with the full last-roll row** (who rolled + label +
  breakdown + total), replacing the plain text tooltip; the mini icon also got more vertical breathing room
  between the die and the number. Row builders extracted to module scope (`rlSingleHTML` etc.) so the popover
  reuses the real row.

## Batch 225 — roll log: lives in the sidebar (section / mini icon / float), tidier rows
- **The roll log is now part of the sidebar.** Wide rail → a **section pinned to the bottom** of the sidebar;
  **Preset libraries** moved up under a divider right below the section buttons. Mini rail → a **mode-coloured
  dice icon + the last total** (click opens the menu). Rail hidden (mobile) → it **detaches to the floating
  corner pill** (last rolled number; hover shows the full last roll). `renderRollLog` picks the form from
  `rollLogPlacement()`; re-docks on resize + on `#app` class changes (MutationObserver).
- **Tidier rows:** the breakdown (`1d8:[8]+3`) is **hidden until you click a row** to expand it; subtle
  **alternating row shading**. Entry content/placement otherwise unchanged.
- **Header mode tag is clickable again:** a flat→advantage→disadvantage **cycle tag** (in addition to the ⋯
  menu and ↑/↓), coloured by state. The collapse chevron only shows on the floating panel (a docked section
  stays open).

## Batch 224 — roll mode: d20-only scope + tell synced to the cursor-die
- **Sticky advantage/disadvantage now applies only to d20 tests** (attacks/checks/saves), not damage or other
  dice — clicking a `3d6` with Advantage on no longer rolls it with advantage. (`quickRoll` gates `adv` on
  `isD20Roll`; a custom roll can still apply a mode to any dice.)
- **The ▲/▼ tell now rides the actual d20 cursor-die** instead of any hover: it shows only while a d20 held
  die is present (`d3dHeld.sides===20`), driven from `d3dHoldAt`/`d3dClearHeld`, so it no longer lingers
  without the die or flashes white, and never appears over non-d20 rolls.

## Batch 223 — roll log: corner-docked, collapses to a dice pill, sticky mode
- **Reworked the roll log's chrome** (the entry rows are unchanged — they were already good). It's now
  `position:fixed` and **docked to a viewport corner** (no longer floating in the scrolling content);
  **dragging snaps it to the nearest corner**, and the corner + open/closed state **persist** (`mf_rolllog`).
- **Collapsed = a compact dice pill** (glyph + roll count), tinted when a sticky mode is on — replaces the
  old full-width closed header. A roll no longer force-opens the log (the 3D dice already show the result);
  it just updates the pill, respecting your collapsed state.
- **Advantage/Disadvantage is now sticky** (no longer resets to flat after each roll) and persists. The
  control moved out of the header into the **⋯ menu** (Flat / Advantage / Disadvantage); the open header
  shows a read-only **ADV/DIS chip** when active. Quick shortcut: **↑ = advantage, ↓ = disadvantage** (press
  the active one again → flat), gated so it never steals arrows from a field, dialog, or modifier combo.
- **Cursor tell:** a small ▲/▼ badge rides the cursor over any rollable while a mode is active, so you see it
  right where you roll. `setRollMode`/`cycleRollMode` route through one path (persist + tell + re-render).

## Batch 222 — 3D dice: roll on attack/recharge names (compounded throw)
- **Fixed: clicking an attack (or recharge) name didn't tumble any 3D dice.** `rollAttackSequence`/
  `rollRechargeSequence` roll their sub-rolls with `silent:true` (to show one combined alert instead of two),
  but `doRoll` also gated the 3D dice on `!silent` — so the compound clicks updated the log yet never threw
  dice. Now each sequence rolls both sub-rolls silently, then fires **one combined `rollDice3D` throw with the
  union of their dice** (the to-hit d20 + the damage dice, e.g. 1d20 + 3d6, tumbling together) and the combined
  alert. `rollDice3D` gained `desc.msg` (ready-made card text for a compound throw) + `desc.reroll` (the card's
  reroll button re-runs the whole sequence). Falls back to the toast when 3D is off (reduced-motion/no WebGL).

## Batch 221 — touch: stop the spinning d20 cursor sticking on iPad
- **Fixed the 2D d20 roll-cursor lingering over a tapped rollable on touch devices.** iPad Safari fires a
  synthetic `mousemove` on tap, so `updateDiceCursor` showed the pointer-following d20 over the tapped
  `[data-roll]` — and with no "move away" on touch it stayed stuck. Gated the 2D cursor on a real pointer
  (`matchMedia("(hover:hover) and (pointer:fine)")`), matching the 3D held-die's existing check. Mouse/
  trackpad behaviour (and the reduced-motion 2D fallback) is unchanged; touch taps just roll. (engine.js)

## Batch 220 — animated logo: loading screen + a living sidebar mark
- **The brand mark is now an animated eye, one mark with three behaviours (CSS-only animations).** Switched
  both the boot loader and the sidebar mark to the outline-free logo, wrapped in nested animation layers
  (`mk-turn` head › `mk-socket` black backing › `mk-gaze` eyeball foreshorten › `mk-lids` clip-path eyelids ›
  sclera + `mk-pupil`; `mk-frame` is the gear/spike frame).
- **Loading** (boot screen): the eye darts frantically with strong cornea distortion (skew/roll), foreshortens
  to an ellipse on side-looks, blinks (eyelids *crop* the pupil, they don't scale it), and runs a half-closed
  squint scan — left, right, then facing us. Shown on the dark loader with **no coral chip** (the logo's white
  outline carries it); replaced the old tumbling d20.
- **Sidebar mark** uses both in-page behaviours with different triggers: it sits still, **dozes** at a random
  interval (≥ 2–5 min — heavy lids close slow / snap open fast, nods off, sleeps, jolts awake and checks
  around), and a **click pokes** it any time (snappy slam shut → frantic scan → resettle), interrupting a doze.
  Wired in `initBrandMark()` (toggles `.dozing`/`.poked`, cleared on each cycle's `*-pupil` animationend).
- Honours `prefers-reduced-motion` (animations off; doze timer skipped). The black socket disc shows on every
  turn/blink reveal so the eye never bleeds the chip colour. `npm run verify` green; smoke test boots clean.

## Batch 219 — combat: drop the monster save stat box (malformed alert)
- **Removed the monster "best saving throw" stat box.** The active panel's monster stat row is now just
  AC · ATK · DC · HP — only the attack-roll modifier and the save DC, as intended. That box also produced a
  malformed roll alert ("DEX save Saving Throw: X") because its label already contained "save"; removing the
  box removes the bug.
- **Wording audit:** `naturalRollText` is correct everywhere else — every other save roll (the ability table,
  PC saves) passes the full ability name, so they read "Dexterity Saving Throw: X". Only that one box fed it a
  bad label. Dropped the now-unused `combatMainSave` helper.

## Batch 218 — 3D dice: cursor-die tuning + retire the 2D d20 cursor
- **Held cursor-die now matches the spike** — it was too big and shivered too hard. Capped its size to a
  rolled die's (the held R had no upper bound), nudged the scale 0.42→0.4, and softened the shiver to the
  spike's gentle values (slower frequency, less lift and jitter).
- **Retired the 2D spinning d20 cursor on hover.** Where the 3D held die engages (desktop, motion on, WebGL
  ok), the old `#diceCursor` d20 is suppressed (`d3dPickupOn()`); it stays as the fallback on touch /
  reduced-motion / no-WebGL and as the Alt-armed custom-roll indicator.
- `npm run verify` green.

## Batch 217 — 3D dice: cursor-die pickup + slower exit
- **Hover a roll → the die rides your cursor.** On desktop, hovering any rollable (`[data-roll]`) summons one
  small die that follows the pointer, **logo face up, shivering** as if held aloft (the native cursor is hidden
  via `body.dicing`); clicking rolls and the dice launch from the cursor. Touch/phones keep spawning from the
  tap point. Mouse only (`hover:hover` + `pointer:fine`), skipped under reduced-motion or when dice rolling is
  off. The held die's type is read from the roll's formula (`1d20+7` → a d20, `2d6` → a d6).
- **Slower exit.** The dice + result alert linger longer before imploding (dwell 1300→2000 ms, vanish
  300→520 ms) so a roll is easier to read.
- **3D-dice settings card hidden for now** (the B216 material/colour/edges picker) — the engine (`d3dDieMat` +
  the `dice3d.*` settings) stays; re-expose the card to bring the picker back.
- `npm run verify` green.

## Batch 216 — 3D dice: materials + a settings panel
- **The 3D dice look is now configurable.** New **Settings → 3D dice** card: a **material** picker (Stone /
  Smooth / Metal / Crystal / Ceramic), an **edges** toggle (Sharp / Rounded — affects the six-sided die), and a
  **colour** swatch. Persists to `mf_settings` (`dice3d:{material,color,edges}`); changes re-skin any dice on
  screen immediately and apply to every future roll.
- **All five materials ported from the spike** into `dice3d.js` (`d3dDieMat`): Stone keeps the baked mottled
  terracotta texture; Smooth/Metal/Ceramic tint from the chosen colour (metal = anodised partial-metalness,
  ceramic = a clearcoat glaze); Crystal = a baked gem **matcap** (faceted, no refraction cost). sRGB colour
  throughout (`convertSRGBToLinear`). Stone is unchanged from B214 — it already matches the spike.
- **Debug hook** `window.__d3d.showcase(material)` places a few static dice so a material can be inspected in
  the preview (synthetic pointer events otherwise clear a live roll).
- `npm run verify` green; verified live (every material renders; the settings card + colour swatch work).

## Batch 214 — 3D dice (integration: stone, sharp edges)
- **Physical 3D dice on every roll.** A new shared-scope `dice3d.js` renders real tumbling dice (three.js +
  cannon.js, both vendored locally in `vendor/` — the site stays no-build/self-contained) that land on the
  roll's actual values. `doRoll` (engine.js) passes the result to `rollDice3D()`; the dice are decided by the
  engine, not the physics: a deterministic **pre-roll** simulates to rest off-screen, paints the value onto the
  face that lands up, then resets & replays the identical fixed-step sim, so the shown number never changes on
  settle. Spawns from the last pointer position.
- **Stone material, sharp edges** (the look chosen from the spike): a procedural mottled-stone texture, a tiny
  edge bevel (no drawn edge line), a soft environment map (matches the spike's lighter coral), **Vecna** font on
  the faces (vendored `vecna.otf`/`vecna-bold.otf`, re-baked once the webfont loads), the **logo on the max
  face**, sRGB colour. Numbers are **upright per face** (basis matrix).
- **Standard d20 numbering** — opposite faces sum to 21 and **20 is adjacent to 2/8/14** (the canonical layout).
  The rolled value is shown by an icosahedral **symmetry permutation** of the face textures (a value-shift can't
  be a real d20 rotation, so it scrambled the arrangement); the layout stays intact and the value is exact.
- **Result alert** (replaces the plain roll toast while dice show) — uses the **same wording as the old toast**
  (`naturalRollText`, e.g. "Arcane Burst: 23 to hit") + a ghost **reroll** button + an auto-dismiss **timer
  bar**; **hovering pauses** it so the dice persist as long as the alert. Above the dice canvas + roll log.
- **Advantage/disadvantage** dims the dropped die (transparent, clearly unselected) and keeps the chosen one
  solid (parsed from `r.parts` — `kh/kl/dh/dl` and the `d20(a,b)→keep` shorthand).
- **Safety:** all THREE/CANNON/WebGL use is lazy + guarded, so page init and the jsdom smoke test (no libs, no
  WebGL) never touch it; honours `prefers-reduced-motion`. `npm run verify` green (`dice3d.js` added to
  check/lint/eslint-shared-globals + THREE/CANNON globals + the smoke-test injection list).
- **Pending (next session):** the cursor-die pickup-on-hover interaction; optional material/colour/edge
  settings; the other materials (crystal/metal/ceramic). The d20 middle-band arrangement is deterministic but
  not a specific manufacturer's (there's no single universal one beyond the sum-21 + 20-neighbourhood rules).
  See the dice-spike (`dice-spike.html`) for the full material set + cursor interaction reference.

## Batch 213 — Share-feedback round 3 (player-mode polish + roll-log)
- **Player editing simplified to Off / On.** The four-way picker (Off/Suggest/Own/All) collapsed to a
  two-way **Off / On** segmented control; "On" means a player claims their own character and edits only that
  PC (HP, conditions & sheet) plus rolls. Suggest/All are retired — they needed far more testing than the
  feature warranted. `playerCanEdit` is now own-PC-only; the "You can edit any character below" banner is gone
  (only the "Playing as" claim picker remains).
- **Phantom-input bug fixed.** In player mode a double-click could momentarily change the turn (then revert on
  the next poll); enemy conditions had the same optimistic-then-revert flicker. Player mode now hard-blocks the
  DM-only mutations at the source — `setCurrentTurn`, `combatAdvance`, `moveCombatant`, `ungroupCombatant`,
  `removeCombatant`, `setCombatStatus(Sel)`, `openRoundEdit` no-op; `addCombatCond`/`removeCombatCond`,
  `setCombatInit`, `openHPManage`, `toggleReaction`/`toggleConcentration` gate on `playerCanEdit` /
  `playerCondAllowed` — so the input never registers rather than registering and reverting.
- **Player preview overlay.** The roll log now floats **top-left, above the overlay** (`position:fixed`,
  z-index 130 over the backdrop's 120) so a player sees their result while the sheet is open; the in-overlay
  **Edit** pencil is kept clear of the ✕ close button.
- **DM roll log.** Title is now **"My Rolls"**. When the combat is shared, a second row of tabs (**My rolls /
  Player rolls**) splits the log so the DM can isolate players' incoming rolls (`fromPlayer`).
- **Roll-log player names are now previewable.** A player's name in the roll log opens a character-summary
  popover (`showPcPreview` — name/class header + AC/HP + the read-only sheet), the PC counterpart to the
  monster statblock preview, instead of underlining a dead link.
- Verified in preview: Off/On picker; floating roll log above the overlay at top-left; Edit clear of ✕; the
  banner note gone; double-click + enemy-condition edits blocked in player mode; "My Rolls" title with shared
  tabs; player-name popover renders. `npm run verify` green.

## Batch 212 — Share-feedback round 2 (network-free preview + cropping)
- **"Preview as player" is now network-free and reliable.** It no longer opens the real (origin/localhost-
  bound) link — it stashes the live combat snapshot to `localStorage` and opens `index.html?share=__preview__`,
  which renders the player view straight from that snapshot (no JSONBin fetch, so it works even when the bin
  was never created / got deleted — the cause of the earlier "Can't reach the shared fight"). The DM tab keeps
  the stash fresh on every render, so the preview tracks the fight live; the preview forces the editing UI on
  (sentinel `__preview__` bin) with writes short-circuited so edits/rolls show optimistically without a bin.
  Copy/QR still give the real shareable link for actual players.
- **Cropping fixed (DM side).** The stacked combat layout gave the active panel only 46% and reserved a
  redundant bottom gutter, so the sheet/statblock was cramped and cut. It now gets **56%** and runs to the
  page bottom (the `.ca-scroll` padding already clears the turn FAB) — the full statblock/sheet is visible.
  The player preview overlay was also raised to 94vh with safe-area padding.
- Verified in preview: `index.html?share=__preview__` loads with no network, shows editable PC rows + enemy-
  condition rows; the DM active panel reaches the page bottom (gap 0) showing the whole statblock.

## Batch 211 — Share-feedback fixes
- **"Preview as player" button** in the share dialog opens the live player view in a new tab — the testing
  shortcut for seeing the in-app player page without copy-pasting the link (the link itself is `localhost`/
  origin-bound, so it only resolves in the DM's own browser or, once deployed, anywhere).
- **QR is now a button, not an always-on code.** A "QR" button sits inline with the link + Copy; clicking
  opens the code large in a dismissable overlay (`openShareQR`). Less clutter in the dialog.
- **Player-editing divider spacing** widened (3px → 14px) so the "Player editing" header isn't cramped.
- **Lone spellcasting ability no longer clutters the preview.** `pcSheetHTML` skips the Abilities/Saves rows
  when every entered score is a spellcasting "main" ability (already shown as ATK/DC) — so a Wizard with only
  INT set no longer renders a sparse "Abilities: INT" row. Multi-ability sheets are unchanged.
- **Player preview overlay** is taller (94vh) and scroll-safe (safe-area bottom padding) so long sheets reach
  the bottom instead of clipping.

## Batch 210 — In-app player mode, stage 6 (the in-app view is now the share target)
- **The share link now points at the in-app player mode.** `combatShareURL` generates
  `index.html?share=<bin>` (was `player.html?b=<bin>`), so a shared QR/link opens the real locked-down tracker
  with full parity (preview, rolling, row + sheet editing, enemy toggles).
- **`player.html` retired to a redirect.** Its standalone view (B202/B203) is superseded; the file now just
  forwards old `player.html?b=<bin>` links to `index.html?share=<bin>` so previously-shared QR codes keep
  working. Verified in preview: the redirect resolves and `combatShareURL` emits the in-app URL.
- This completes the in-app player-mode rework (stages 1–6).

## Batch 209 — In-app player mode, stage 5 (enemy toggles)
- **Two per-share enemy toggles** in the share dialog (`shareOpts`, stored per encounter): **Show enemy health
  (bloodied bands)** — off ⇒ enemies show no HP info at all (`playerSafeInstance` omits the band); and **Let
  players edit enemy conditions** — rides in the snapshot (`snap.enemyConds`) and is gated to when an edit
  mode + key are set.
- **Enemy condition editing.** When enabled, obscured combatants get a `pm-edit-conds` row — the +effect / ×
  controls work, but initiative/reaction/concentration/HP stay inert. Edits push a **conditions-only** payload
  (`playerPushEdits`) so the DM's enemy HP/init are never touched; the DM applies just the conditions. Diff
  baseline now covers enemies too.
- Verified in preview: dialog shows both switches; bloodied-off suppresses the band end-to-end; enemy-conds-on
  makes enemy rows condition-editable and an added condition pushed a conditions-only edit to the bin.

## Batch 208 — In-app player mode, stage 4b (character-sheet editing)
- **Players edit the full character sheet** from the preview's Edit pencil — the real character-detail modal,
  locked down in player mode (notes/backstory, adventure tags, the kebab and "save as template" hidden). Every
  field change routes through `saveRoster`, intercepted in player mode → debounced `playerPushChars` diffs the
  editable PCs' sheets against the published baseline (`charSig`) and writes changed ones (notes stripped) to a
  `charEdits` channel on the write-back bin.
- **DM applies sheet edits, keeping private notes.** The poller folds new `charEdits` into the roster char via
  `applyCharEdit` (replaces name/fields, **preserves the DM's notes**) then `resyncPcInstances`; in suggest mode
  they queue in the inbox ("updated their character sheet"). The roster now hydrates **in place**
  (`hydratePlayerRoster`) so an open edit modal keeps a live reference, and a player's unconfirmed sheet edits
  survive incoming snapshots (15s reconcile) until the DM confirms them.
- Verified in preview: the Edit pencil opens the locked-down modal, a name/ability edit wrote to `charEdits`
  (notes stripped) and pended through a poll, and `applyCharEdit` applied it while keeping the DM's notes.
  **Remaining: stage 5** (Show-bloodied + Enemy-conditions toggles) and **stage 6** (point the share link at
  `index.html?share=` and retire `player.html`).

## Batch 207 — In-app player mode, stage 4 (character preview + dice rolling → DM roll log)
- **Tap-to-open character preview.** Tapping an editable PC's name opens a bottom-sheet overlay (`pm-sheet`)
  that reuses the real active-panel content (`combatPanelInnerHTML`) — the full sheet with its rollable
  ability/skill/ATK chips. It's preview + roll only (the row stays the edit surface): edit/HP-manage/note/
  resource affordances are suppressed in the overlay.
- **Dice rolling runs locally and mirrors to the DM.** Roll chips use the real engine (`quickRoll`/`doRoll`),
  so a player sees the result + roll log on their phone. `doRoll` now also pushes the roll to the write-back
  bin's new `rolls[]` channel in player mode (`playerPushRoll`, attributed via `combatRollSrc`); the DM poller
  folds new roll events into the DM `rollLog` (dedup via `_shareRollSeen`) and re-renders it — so the DM sees
  e.g. "Lyra Vance · Arcana 16". All player write-backs (edits + rolls) now serialize through one
  read-modify-write queue (`pmQueueWrite`) so concurrent pushes can't clobber each other.
- Verified end-to-end in preview: preview overlay opens and renders the panel; a roll mirrored to the bin and
  surfaced in the DM roll log attributed to the PC. (Seed PCs carry no ability fields, so the sandbox preview
  has few chips — real characters render the full rollable sheet.) **Next (4b): character-SHEET field editing
  via the detail modal** (write-back → DM applies to the roster char). Then stage 5 toggles + stage 6 redirect.

## Batch 206 — In-app player mode, stage 3 (PC combat-row editing)
- **Players edit their PC through the real combat row.** In player mode, editable PC rows (`.pm-edit`) keep
  the full DM controls — editable initiative, HP-manage popover, add/remove conditions, reaction &
  concentration toggles — while enemies and non-controlled PCs stay inert and the ⋯ menu / DM chrome / "out
  of order" chip stay hidden. Editability follows the mode: **own** = the claimed PC only (a "Playing as"
  picker), **all/suggest** = any PC.
- **Write-back via the existing transport.** `saveAdv` is intercepted in player mode → debounced
  `playerPushEdits` diffs the editable PCs against the DM's snapshot baseline and writes the changed ones
  (full field set: hp/temp/conditions/init/reaction/concentration/status, with `by`/`suggest`) to the
  write-back bin. `applyPlayerEdit` (DM poller) now applies all those fields and re-sorts when a player's
  initiative changes. Optimistic local edits (`_pmPending`) are re-applied over each incoming snapshot until
  the DM confirms them (15s safety timeout) so they don't flicker.
- Verified in preview: all-mode PC rows editable, an HP edit via the real popover wrote the full parity
  payload to the bin, and `applyPlayerEdit` applied hp/temp/conds/init/reaction/concentration correctly.
  Active panel stays hidden until stage 4 (tap-to-open preview + dice rolling).

## Batch 205 — In-app player mode, stage 2 (publish character sheets)
- **Snapshot now carries PC sheets.** `buildCombatShareSnapshot` adds `snap.chars` = each editable PC's
  roster record keyed by `srcId`, deep-copied with **notes/backstory stripped** (`playerSafeChar`) — the one
  part of the sheet kept private from players. `hydratePlayerCombat` populates `state.roster` from it (run
  through `normalizeRosterPC`), so `rosterById` resolves and `pcSheetHTML` / the active panel render the full
  sheet (abilities, saves, skills, passives, defenses, ATK/DC) instead of "linked record not found".
- Foundational/plumbing stage (sheet surfaces + becomes editable in stages 3–4). Verified in preview: 4
  sheets published with notes stripped, roster hydrated, `pcSheetHTML` returns real content, zero errors.

## Batch 204 — In-app player mode, stage 1 (locked-down read-only shared tracker)
- **First stage of the parity rework** (the player view becomes the *real* tracker, not the standalone
  page). `index.html?share=<bin>` boots a new **player mode**: init skips loading the DM's library/adventures
  entirely, fetches the shared bin, hydrates a one-encounter synthetic `state`, and renders the actual combat
  view. `PLAYER_MODE`/`PLAYER_BIN` globals (core.js) gate persistence — `_schedule` (all saves) no-ops in
  player mode, so the DM app is provably untouched.
- **Richer share payload.** `buildCombatShareSnapshot` now also emits `snap.combat` = full PC instances
  (minus the DM note) + obscured enemy instances (`playerSafeInstance`: faction label + health band, no
  statblock id / HP numbers / note). Events dropped. The old sanitized `order` stays for the current
  player.html until it's retired in a later stage.
- **Shell lockdown + read-only.** `body.player-mode` hides the rail/nav, settings, rule-finder, and every
  combat editing affordance (load/share/tools/roll, the turn FAB, add-combatant, row menus, add-effect,
  reaction/concentration, init/HP controls); the active panel is hidden and the grid goes single-column.
  Enemies render a health band (`ci-band`) in place of HP via a `hpCellHTML` player-mode branch. Verified in
  preview: real rows, PCs full (HP + conditions), enemies obscured (Bloodied/Healthy), no DM chrome, boots
  with zero console errors. (Stages 2–6 next: expanded sheets, PC editing parity, preview + rolling, the two
  enemy toggles, and the player.html redirect.)

## Batch 203 — Players can edit / suggest from the shared initiative
- **Three DM-selectable editing modes** (picker in the share dialog, both states): **Suggest** (player edits
  queue as pending suggestions the DM approves/dismisses), **Own PC** (a player claims their character by
  name and edits only its HP & conditions, live), **All PCs** (any player edits any PC, live). Off = today's
  read-only. The modes are disabled until a key is set, with a setup hint.
- **Write-back over a dedicated limited key.** A new **Settings → Combat → "Player edit key"** field holds a
  JSONBin **Access Key** (Read+Update only) the user creates once. Starting a share with editing on creates a
  separate public **write-back bin**; the snapshot carries the mode, that bin id, the access key, and each
  editable PC's instance id. Phones write their edits to the write-back bin via `X-Access-Key` (read-modify-
  write); the embedded key can only edit share data — verified it **can Update but 401s on Delete**, and it
  never reaches the library/adventure bins. Key is on-device only (`mf_settings`), exposed only while editing
  is enabled.
- **DM poller + apply.** `pollShareEdits` (every ~3s while a share with editing is live, resumed on reload)
  reads the write-back bin: live modes apply HP/temp/conditions to the matching instance (conditions are
  reconciled by name so DM-set durations on kept effects survive); suggest mode queues each as a pending
  suggestion with a count badge on the round-bar Share button and an inbox (Apply / Dismiss) in the dialog.
  Approving applies it and strips it from the bin. `_shareApplied` ts-guards each PC so nothing reapplies.
- **`player.html` gains the edit UI** — a claim bar (own mode), per-PC HP steppers + numeric field, a
  condition chip editor with a common-condition palette, and a Suggest button in suggest mode. Optimistic
  local overrides hold until the DM's snapshot catches up (15s safety timeout); polls skip re-render while a
  field is focused so typing isn't clobbered. Monsters stay read-only/obscured throughout.
- Verified end-to-end in the live preview against real bins: all-live edit applied to the tracker, a
  suggestion queued → approved → applied → removed, and own-mode claim restricting edits to one PC; test bins
  deleted afterward (404).

## Batch 202 — Share initiative with players (live phone view)
- **New combat feature: share the live initiative to players' phones.** A **Share** button in the combat
  round bar opens a dialog that publishes the fight to a player view — a scannable **QR** + a copy-link, with
  a green "live" dot on the round-bar button while sharing is on. Players open a read-only page that follows
  the fight live; **Stop sharing** kills the link.
- **Sanitized snapshot — players see only what they should.** PCs show full name + HP (current/max/temp) +
  conditions + down/dead state; **monsters are obscured** (generic faction label + a coarse health band —
  Healthy/Hurt/Bloodied/Critical/Down — no numbers or real names); DM-only **events are hidden**. The
  encounter name is omitted (no spoilers). `buildCombatShareSnapshot(cb)` in `combat.js`.
- **Transport reuses the JSONBin layer, no new infra.** New `jbinSetPublic`/`jbinDeletePublic` in `core.js`
  create a **public** bin (`X-Bin-Private:false`) so a phone reads it with just the bin id and **no key** —
  the embedded master key never leaves the DM app. The bin holds only the snapshot. Re-published debounced
  (~0.8s) from `renderCombat` on every combat change; players poll every 5s. Per-encounter bin id lives in
  `localStorage` (`mf_share:<encId>`). Unlike `jbinSet`, the public helpers have NO seed-sandbox guard — a
  share bin is separate/ephemeral/user-initiated, so the link works for real even from the local sandbox.
- **Dialog matches the design system.** Off → plain title + a short subtitle + a `.btn.primary.sm` "Start
  sharing". On → "Sharing is live" with an inline pulsing **Live** badge, a one-line subtitle, the QR + a
  `.btn.ghost.sm` copy, and "Stop sharing" demoted to a low-hierarchy text button (faint → red on hover).
  Stopping closes the modal and toasts "Sharing stopped — players disconnected."
- **Round-bar Roll initiative d20 now always shows** (was gated to manual/average-init mode, so it never
  appeared in the default auto-roll mode — looked like a missing button). `rollInitNow` already rolls fresh
  dice with the digit-flow animation in every mode, so the gate was removed.
- **New standalone `player.html`** — a tiny mobile-first read-only page; does NOT load the app scripts.
  Polls the public bin, highlights whose turn it is, shows the round, and degrades to "Sharing ended" on 404.
  Themed to match the app (coral accent, cool-dark panels, blue PC names, health-band pips).
- **New vendored `vendor/qrcode.min.js`** (qrcode-generator 1.4.4, MIT) — self-contained QR, no third-party
  call at runtime. Loaded once in `index.html`, isolated from the shared-scope app pipeline; the share dialog
  reads it via `window.qrcode` (degrades to link-only if absent). Verified end-to-end in the live preview
  (DM dialog + QR, sanitized snapshot, mobile player render, and the 404 "ended" state).

## Batch 201 — Advisory type-check on parsers.js (npm run typecheck, P3)
- **`// @ts-check` on `parsers.js`** (the pure 5etools-import layer — where a shape/typo bug actually
  bites) + a new advisory `npm run typecheck`. Dev-only `typescript` devDependency; the shipped site stays
  no-build. Catches things ESLint can't: wrong arg counts / signature drift on local functions, and typos
  with suggestions (verified: a deliberate `parseSpeed(1,2,3)` → TS2554, `richStripp` → TS2552 "Did you mean
  'richStrip'?"). Clean baseline: **0 errors**.
- **Cross-file globals solved like the lint config.** tsc's `checkJs` treats each script's top-level
  `const`/`let` as file-local, so `scripts/gen-globals.mjs` parses every *other* shared file's top-level
  declarations with espree and emits `globals.d.ts` (ambient `declare const … : any;` × 909). Self-
  maintaining — `npm run typecheck` regenerates it before running `tsc`. `globals.d.ts` is gitignored
  (generated artifact). Advisory only — NOT part of `verify`. `tsconfig.json` is scoped to `parsers.js`
  with loose settings; documented in `DEVELOPMENT.md` (incl. how to extend coverage to another file).

## Batch 200 — First-run nudge on the Forge (P3)
- **A one-time, dismissable welcome tip** at the top of the Forge form (`maybeShowOnboarding`, app.js):
  points a newcomer at the live preview and the faster starting points ("open the ⋯ menu — load a chassis
  or paste a 5etools block"). Coral-accented card (`.forge-onboard`) with a ✕; dismissing sets
  `localStorage.mf_onboarded` so it never shows again. Inserted in the init IIFE; degrades silently if
  localStorage is unavailable. Verified live: shows once, dismiss removes it + persists, stays gone.

## Batch 199 — Split the roster/character subsystem out of adventures.js → roster.js
- **New `roster.js` (387 lines), carved from `adventures.js` (1138 → 754 lines).** A clean, contiguous
  extraction of the whole player-character subsystem: the shared roster store accessors, the PC field /
  ability / skill model, the party row (`renderParty`), and the character-detail modal
  (`charDetailHTML` / `openCharacterDetail`). No code changed — the block moved verbatim (lines 219–602),
  so behavior is identical; it's purely a file boundary for legibility (the encounter/scene/budget code
  stays in `adventures.js`). Mirrors the B131 combat.js split.
- **Load order updated in all four sync points** (`index.html`, `test/harness.js`, `eslint.config.js`,
  `package.json` check+lint): `roster.js` loads right after `adventures.js`, before `combat.js`. Every
  cross-file reference is a runtime call, and the file has no eager top-level statements, so the move is
  load-order-safe — the smoke test (which boots the real page with all scripts) confirms zero init errors.
- Verified live: party roster renders, character-detail modal opens with property + ability rows, combat
  builds PC instances and the PC sheet — all driven by roster.js helpers, zero console errors. `npm run
  verify` green (12 tests, lint 0/0); `npm run lint:css` still clean.

## Batch 198 — Refactor: split the two longest functions (no behavior change)
- **`openCharacterDetail` (was ~146 lines) → `charDetailHTML(c,curAdv,ui,advs)` + the binding block.** The
  pure modal-body builder (tags / property rows / preset rows / ability grid / template) is now a named
  function; `openCharacterDetail` keeps only the setup + `openModalRaw(charDetailHTML(…))` + the event
  bindings. The closure web around `re()` was left intact (it's the risky part) — only the pure HTML moved.
- **`renderCombat` (was ~124 lines) → render + `bindCombatTracker(body,a,e,cb)`.** The markup was already
  built by the `combat*HTML` helpers; the ~80-line event-binding pass is now its own function, leaving
  `renderCombat` as setup + `innerHTML` + scroll-restore + one `bindCombatTracker(…)` call.
- Pure extractions, no logic change. Verified live: combat (rows select, Next-turn advances, HP popover,
  menus) and the character modal (name sync, ability-star re-render, field menu) all work, zero console
  errors. `npm run verify` green (12 tests, lint 0/0).

## Batch 197 — Advisory dead-CSS-class linter (npm run lint:css)
- **New `scripts/lint-css.mjs` + `npm run lint:css`.** Lists classes defined in `styles.css` that have no
  literal match in any JS file or `index.html` — automating the periodic manual sweep (B185 removed 45 dead
  selectors by hand). **Advisory only:** it never fails the build and is NOT part of `verify`, because it
  can't see classes assembled from string fragments. The documented dynamic families are allowlisted
  (`cc-ab-`, `st-`, `ds-`, `pcs-`, `rl-tag-`, `nf-`, plus `dchip-` and `k-` confirmed this pass). Current
  baseline: **0 dead of 829 classes checked** — the stylesheet is clean. Documented in `DEVELOPMENT.md`.

## Batch 196 — Definition-popover scroll-fade fix (stationary overlay)
- **The reference-popover bottom fade no longer drifts onto a mid-content line.** The fade was a
  `position:sticky` strip *inside* the scrolling box with triple negative margins (`-22px -14px -22px`) —
  a brittle combo (re-tuned once in B183) that, when the popover's height was inline-clamped by
  `showRefpop`, ended up fading a line in the middle while the true last line stayed sharp (the bug in the
  capture). Rebuilt as the textbook pattern: content scrolls in an inner `.refpop-body` and the fade is a
  **non-scrolling absolute overlay** on `.refpop` (now a flex column so the inline `max-height` clamp still
  drives the scroll). The overlay always sits at the true bottom edge.
- Verified live (overflowing popover, height-clamped): scrolled to top the **bottom** line fades (more-
  below hint), scrolled to the end the last line is fully clear, content scrolls within the clamp (no
  clipping), and no mid-content line is faded. `npm run verify` green (12 tests, lint 0/0).

## Batch 195 — Unresolved-combatant repair (deleted statblock)
- **A combatant whose statblock was deleted now reads as broken instead of blank.** Previously an
  orphaned monster combatant (its `monsterId` points at a since-deleted Bestiary creature) was
  indistinguishable from a never-picked one — both said "Pick a statblock…" and silently scored 0 XP.
  Now the row flags itself: **"⚠ {name} — deleted"** in amber (`.cbt-pick.orphan` / `--warn`), with a
  tooltip explaining you can pick another statblock to re-link or remove it from the ⋯ menu.
- **The deleted creature's name is captured at delete time.** `markOrphanedCombatants(id, name)` stamps
  `_lostName` onto every referencing combatant just before the Bestiary delete, so the orphan row (and the
  combat tracker, via `combatBaseName`) can show *what it was* rather than a bare "?". Re-linking through
  the statblock picker clears `_lostName`. The delete confirm wording softened from "those combatants will
  break" to "…will show as unresolved until you re-link or remove them" (the breakage is now recoverable).
- Verified live: deleting a seeded monster used in 4 combatants flags all four amber with the right label,
  the encounter budget recomputes (orphans = 0 XP), and re-linking clears the flag. verify green (12 tests).

## Batch 194 — Coalesced statblock render + faster boot fallback
- **`renderPreview` now coalesces a burst of edits into one rebuild.** It used to do a full
  `#statblock` `innerHTML` rebuild + colorize TreeWalker on *every* keystroke. The work moved to
  `renderPreviewNow`; `renderPreview` defers + dedupes it via `requestAnimationFrame` (one paint per
  frame in the foreground) with a 100 ms `setTimeout` fallback so it still flushes when rAF is paused
  (a backgrounded tab) — which also keeps the persist-draft + undo-history side effects firing. No caller
  reads `#statblock` synchronously after `renderPreview()`, so the sub-frame defer is safe. Verified: a
  3-keystroke burst queues a single paint and lands on the latest value, no stale frames.
- **Boot fallback 9 s → 5 s.** The safety timeout that reveals the app if init hangs (`index.html`) was a
  sluggish 9 s; 5 s recovers faster while staying well clear of a normal ~1 s init (init still reveals the
  app itself the instant it finishes, and on any error).

## Batch 193 — Forge draft undo/redo (Ctrl/Cmd+Z)
- **Full undo/redo on the Forge draft.** A snapshot history of the whole draft `M` (forge.js): edits
  coalesce into one undo step via a 500 ms debounced recorder hooked off `renderPreview`, so a burst of
  typing is one step rather than per-keystroke. **Cmd/Ctrl+Z** steps back, **Cmd/Ctrl+Shift+Z** (or
  **Ctrl+Y**) forward, each with a toast. Undo flushes any pending burst first, so the in-progress edit
  stays redoable.
- **History boundaries.** A genuine `loadMonster` (New / Clear / Load chassis / Paste 5etools / open from
  Bestiary / forge-for-encounter) **resets** the history — undo never carries you back into a different
  creature. Restores replay through `loadMonster(snapshot, true)`, a new second arg that skips both the
  re-record and the scroll-to-top, so the form reverts in place. Stack capped at 80; a new edit after an
  undo drops the redo branch.
- **Scope guard.** The key handler is active only on the Forge tab and is suppressed while a modal is open
  (so the paste/character dialogs keep their own keys). Verified live: undo/redo, keyboard shortcuts,
  reset-on-load, branch truncation, and the view guard all behave. `npm run verify` green (12 tests, 0/0 lint).

## Batch 192 — Audit P1 fixes (chipfield ＋, faint contrast, mobile combat FAB, parser tests)
- **Character-detail chipfield add control trimmed to `＋`.** The per-row add button (`cd-chip-addbtn`,
  `adventures.js`) read "＋ Add" on every preset row (Class / Subclass / Skills & expertise / Passive skills /
  Damage modifiers); now it's just `＋`, with `title`/`aria-label="Add"` kept so screen readers still announce
  it. One shared builder, so all five preset rows update together; the section-level buttons (Add character,
  Add a property, Add combatant) are untouched.
- **`--faint` bumped #6e7580 → #7e858f to clear WCAG AA.** The old faint grey was ~3.8:1 on `--bg` (under the
  4.5:1 floor for small text — hints, placeholders, separators); the new value is ~5:1 on `--bg` and ~4.5:1 on
  `--panel`, a minimal nudge that preserves the faint/`--dim` hierarchy. Single-token change.
- **Mobile combat: "Add note" no longer sits under the turn FAB.** On the stacked layout (`@media
  max-width:1080px`) the active panel reaches the bottom of the viewport, under the fixed `.combat-fab-turn`.
  Added `.combat-wrap{padding-bottom:60px}` in that breakpoint to reserve a gutter, so the active panel clips
  above the FAB band and its bottom controls clear it (verified at 375px: scrolled-to-bottom gap +92px, no
  overlap). Desktop (tall full-height active panel + existing 84px `.ca-scroll` pad) was already fine.
- **New `test/parsers.test.js` — round-trip coverage for the importers.** Three tests through the jsdom harness:
  `parse5etools` (text block → monster fields + action), `mapMonsterJSON` (5etools JSON → monster, incl.
  `{@atkr}`/`{@hit}` tag stripping), and `parseBestiaryJSON` (a `_copy` variant inheriting its base). Covers the
  most complex, previously-untested code. `npm run verify` now runs 12 tests, all green; lint 0/0.

## Batch 191 — Holistic project audit + README architecture refresh
- **New `AUDIT.md`** — full diagnostic across code structure, engineering practice/metrics, performance,
  security, design, UX flows, and content, with prioritized P1–P3 recommendations. No runtime behaviour
  was changed (report + safe doc fix only). Headlines: code is clean (lint 0/0, no `console.`/`TODO` debt,
  XSS-safe via `esc()`-before-markup + TreeWalker colorize); main costs are line density + a few 100–150-line
  functions + the re-render-the-world UI pattern (fine at personal scale). Logged findings: `--faint` (#6e7580)
  is sub-AA (~3.8:1); parser layer has no direct tests; no undo anywhere; mobile combat "Add note" overlaps the
  Next-turn FAB. Locked decisions (JSONBin/embedded key, no build step) left as-is by design.
- **`README.md` was stale → corrected.** It still described "three plain files" with all logic in `app.js`
  and "three views". Replaced the layout section with the real 9-file table (data/parsers/core/forge/engine/
  bestiary/adventures/combat + app) and the four views (Forge/Bestiary/Adventures/Combat); fixed "drop the
  three files" → "drop the files". Docs only; `npm run verify` green.

## Batch 190 — Kebab (⋯) buttons centred
- **The ⋯ menu buttons sat ~1–1.7px right of centre.** Cause: the UA default button padding (`1px 6px`)
  shrank the content box below the wide `⋯` glyph advance, so the glyph overflowed right and the
  `place-items:center` couldn't centre it. Zeroing the padding (`.kebab,.ai-kbtn,.rr-kebab,.cd-gx,.cbt-kebab
  {padding:0}`) lets it centre exactly — verified the adventure-card, adventure-detail, scene and encounter
  kebabs all measure dX 0. (Found via the icon-centring audit; the user flagged the adventure-card kebab.)

## Batch 189 — Loading-screen + dice-cursor animation rework
- **Boot screen: calm pulse, no dots.** The d20 now gently breathes (`bootPulse` — a scale + opacity pulse)
  instead of the old jerky `ease-in-out` tumble-with-scale-swell. The three bouncing dots under the wordmark
  (a dated trope) are gone (markup + CSS removed). Sleeker, less busy.
- **Dice cursor + sync spinner: smooth even spin.** Rewrote the shared `diceSpin` keyframe from a
  dwell-and-swell tumble to a constant-speed `rotate(360deg)`, and switched both consumers (`#diceCursor`,
  `.loading-spin`) to `linear` timing — no more accelerate/decelerate stutter.
- Reduced-motion still disables the boot animation.

## Batch 188 — Checkbox tick recentred, lighter, group-aligned
- **The checked tick is now perfectly centred.** Replaced the hand-positioned rotated-border tick (`left:5px;
  top:1px`, visibly off-centre) with a centred SVG check used as an alpha mask (`--mf-check`,
  `mask:… center/11px`), so it sits dead-centre in the 16px box regardless of sub-pixel rounding.
- **Lighter weight, in line with the system.** The tick's stroke is `2` in a 16-unit viewBox rendered at
  11px (~1.4px effective), down from the old 2px border — less heavy.
- **Group select-all aligns with the row checkboxes.** `.lib-grp-head` got a right pad matching the
  preset-row's border+padding (12px), so the group checkbox and the per-row checkboxes share a vertical line
  (verified: both right edges at the same x).

## Batch 187 — Forge→Bestiary save-flow hardening (audit fixes ①–④)
- **① No more silent loss of unsaved edits when switching creatures.** New `guardedLoad(fn)` helper routes
  every path that REPLACES the Forge draft `M` — bestiary card click & Edit, paste-import, "Edit in Forge"
  from combat and the encounter combatant menu, and "forge a monster for this encounter" — through the same
  `forgeUnsaved()` confirm that "New"/"Load chassis" already used. Previously those paths called
  `loadMonster()` directly and discarded edits with no prompt.
- **② Unsaved-changes indicator.** A subtle white/accent dot appears on the Save FAB and the toolbar Save
  button (`.is-dirty`) whenever the draft differs from its saved copy; `refreshSaveState()` runs after each
  edit (in `renderPreview`) and after a save clears it. (The `#forgeStatus` chip only ever showed the
  Bestiary *status*, which was easy to mistake for save-state.)
- **③ `pendingForge` no longer dangles.** Leaving the Forge via `switchView` clears a pending
  "forge-for-encounter" link + hides its banner, so an abandoned flow can't mis-route a later, unrelated Save
  into that encounter.
- **④ Delete warns when a monster is in use.** Deleting a Bestiary creature now counts referencing encounters
  (`monsterUsage(id)`) and says "It's used in N encounter(s) — those combatants will break" in the confirm.
- (⑤ JSONBin whole-blob last-write-wins is by-design for single-user use — left as-is.)

## Batch 186 — Hover-to-reveal full text on truncated fields
- **Any clipped text field now shows its full text in a hover tooltip.** A single global handler (engine.js)
  detects truncation generically — `text-overflow:ellipsis`, `-webkit-line-clamp`, or an overflowing
  input/textarea, checked by `scrollWidth/clientWidth` — and reveals the full value in the app's tail
  tooltip (`.trunc-pop`). Covers party-row names, combatant/scene/statblock names, the statblock picker
  label, etc., with no maintained selector list, so new truncating fields are covered automatically.
- Suppressed while a menu/popover is open and while you're editing the field (skips `document.activeElement`),
  and dismissed on mouse-out. Reuses `tailPopover`/`closeTipPop`.

## Batch 185 — Maintenance: dead-code + CSS audit, zero lint warnings
- **Removed dead JS functions** (verified zero callers): `monsterOptionsHTML` (unused since the B173 custom
  dropdowns), and the orphaned XP-target cluster `encTargetActive`/`encTargetVal`/`combCount`/`encReadHTML`
  (left over from the B171 draggable-target removal). Dropped the dead `[data-enctgt]` from `dragInert`'s
  selector.
- **Cleared both ESLint advisory warnings** → lint is now 0 errors / 0 warnings: removed an empty `if(){}`
  no-op in `bestiary.js`'s group-head handler (the toggle ran regardless) and an unused `pr` rect in
  `engine.js`'s `bindRollLogDrag`.
- **CSS dead-rule audit** — removed 45 selectors whose class never appears (even as a fragment) in any JS/HTML
  and isn't built dynamically, all leftovers from reworked features: old combat header (`combat-head`/
  `ch-title`/`ch-sub`/`combat-ctrls`), old scene nav (`scene-strip`/`scene-nav`/`scene-pos`/`scene-enc-name`),
  load-combat popup bits (`lc-ctrls`/`lc-ctrl`/`lc-add`/`lc-adds`/`lc-cnt`), old combat header chevrons/turn
  buttons (`ct-encpos`/`ct-turnbtn`/`ghost-chev`), the B173-retired `crsel`/`mini-chip`, the removed
  `cbt-grip` drag handle, the B163 free-text class field (`cd-class-wrap`/`cd-class-chev`), the dropped
  `cd-foot`/`cd-del` footer, plus `splitbtn`/`save-row`/`forge-actions`/`dmg-grid`/`hover-tog`/`card-ctl`/
  `chassis-tools`/`preset-list`/`g3`/`g4` and more. Dynamically-built classes (`cc-ab-*`, `st-*`, `ds-*`,
  `pcs-*`, `rl-tag-*`, `nf-*`) were identified and kept. Visually regression-checked Adventures, Combat,
  Bestiary, Forge, and the character-detail modal — no changes.

## Batch 184 — preserveScroll helper (de-duplicate re-render scroll save/restore)
- **New `preserveScroll(sel,fn)` helper** (core.js, beside `$`/`$$`): captures a scroll container's scrollTop,
  runs a wholesale re-render `fn`, re-queries the (rebuilt) element by selector and restores the position.
  Replaces the hand-rolled save/restore that had been copied per call site (B181 level-up, B143 character
  modal). The pattern that kept producing scroll-jump bugs now lives in one place.
- Adopted at both sites: `levelUpParty` (`.adv-detail-body`) and the character-detail modal's `re()`
  (`.cd-scroll`). Behaviour unchanged; verified scroll is preserved through both re-renders.

## Batch 183 — Effect chips show state-adjectives + refpop fade fix
- **Curated effect chips read as a state.** Each `CURATED_EFFECTS` entry gained an optional `adj` (Haste →
  "Hasted", Bless → "Blessed", Hex → "Hexed", Hunter's Mark → "Marked", Invisibility → "Invisible", Hold
  Person → "Held", etc.). `condChipHTML` shows the adjective on the chip while the reflink's `data-name` keeps
  the canonical name, so the definition popover still titles itself "Haste". Entries with no clean adjective
  (Resistance) keep the name.
- **Reference popover bottom line is readable + scrolls clean.** The sticky scroll-fade was 26px tall over
  only 12px of bottom padding, so the final line of a long effect/spell/condition always sat half-faded and
  clipped. Bumped `.refpop` bottom padding to 22px and matched the `::after` fade height/margins, so at max
  scroll the last line clears the gradient.

## Batch 182 — CT10 curated effect library + refined spell group
- **Curated combat-effect library (CT10).** New hand-authored `CURATED_EFFECTS` set in `data.js` — the 3
  weapon masteries (Sap/Slow/Vex) plus ~15 common combat buffs/debuffs (Bless, Bane, Haste, Hex, Hunter's
  Mark, Faerie Fire, Blur, Shield of Faith, Heroism, Invisibility, Hold Person, Guidance, Resistance,
  Sanctuary, Aid) with concise 2024 mechanical reminders. Standard conditions still come from the parsed
  conditions library.
- **Every recognized effect chip now has a description popover.** `condChipHTML` resolves a chip's reflink in
  order: parsed condition → curated effect (`data-ref="effect"`) → parsed spell. So masteries and tracked
  spell-effects — which previously had no definition — now get a hover/click popover. New `refContent`
  branch for `kind:"effect"` (via `findCuratedEffect`, `CURATED_EFFECT_GROUP_LABEL`).
- **Add-effect dropdown groups** are now Conditions / Weapon masteries / Spell effects / Spells. The first
  three are curated/parsed; the curated names are excluded from the parsed Spells group (no duplicates).
- **Refined the parsed "Spells" heuristic** (the smaller task). Was: any non-instantaneous duration — which
  swept in utility spells like Alarm. Now: concentration, OR a *short* timed duration (rounds/minutes);
  excludes instantaneous, permanent, until-dispelled, special, and the long hour+/utility durations.
- Removed the now-unused `WEAPON_MASTERIES` const (folded into `CURATED_EFFECTS`).

## Batch 181 — Level Up keeps scroll position
- **Clicking "Level Up" no longer jumps the page to the top.** `levelUpParty` still re-renders the whole
  adventure detail (a level change recomputes every encounter's budget), but it now captures the
  `.adv-detail-body` scrollTop before `renderAdvDetail()` and restores it after — same pattern as the
  character-detail modal's `re()`.

## Batch 180 — Combatant faction/XP side-by-side + always-visible kebab
- **Faction + XP are side by side at full width again** (a `.cbt-right` cluster), and only **stack** (faction
  over XP) when the row is narrow — a container query on `.cbt` (`@container (max-width:340px)` flips
  `.cbt-right` to a column). The B179 always-stacked layout is gone.
- **The `⋯` row menu is always visible with no gradient** (styled like the combat init-row's `.ci-menu`),
  so the faction chip and XP are never covered and stay clickable. Removed the full-height hover gradient.

## Batch 179 — Combatant row reflow + party-name shrink
- **Combatant row reflows cleanly when narrow.** `.cbt-main` is two rows: name + faction chip on top
  (`.cbt-l1`), statblock/CR + XP below (`.cbt-sb`) — so the **XP sits in line with the statblock** instead of
  dropping to its own left-aligned line. Name/statblock fields shrink (ellipsis) at low width without overflow.
- **Per-row kebab is pinned full-height to the right.** `.cbt-kebab` is absolute (`right:0;top:0;bottom:0`),
  vertically centred, and its row-bg gradient covers the whole row height, fading the faction/XP beneath the ⋯.
- **Party-row names stay complete (real fix).** The previous attempt left the name at exactly its content width,
  so it still clipped at the borderline. Now the name has growth priority (`.pc-name{flex:3 1 auto}`) and the
  chip cluster claims a small basis + very high shrink (`.pc-chips{flex:1 100 30px}`), so the name always keeps
  a margin and only truncates at very low width; chips scroll/yield first and still show fully when there's room.
  The class label yields before the name (`.pc-cls{flex:0 8 auto}`).

## Batch 178 — Focused-encounter bg, scroll preservation, party-name truncation
- **Focused encounter has no tinted background** anymore — `.enc.focused` is just the accent border. A loose
  encounter used to get a coral-tinted bg while one inside a scene (overridden by `.scene-body .enc`) did not;
  now both match the no-tint scene look.
- **No more scroll-jump on status change (and friends).** `setEncStatus` and every other encounter/scene
  *list* operation — pin, notes-toggle, archive, delete, menu moves, and drag-reorders — now re-render via
  `renderEncList` (rebuilds only `#encList`) instead of `renderAdvDetail`, so the page keeps its scroll position.
  Adds (`#addEnc`, scene `＋`, new scene) also use `renderEncList` + scroll the new item into view rather than
  jumping to the top. (Party-roster/header/modal-close re-renders still use `renderAdvDetail` — they sit at the
  top and a level change must recompute every budget.)
- **Party-row names stay complete.** The chip cluster now absorbs almost all the row's shrink
  (`.pc-chips{flex:1 100 auto}`), so the name only truncates at very low width instead of clipping as soon as
  the row gets tight; chips scroll under their fade first.

## Batch 177 — Encounter muted text uses the plain greyscale
- **Reverted the whole-palette neutralization (B175/B176).** Globally retuning every grey token was the wrong
  call — all grey tokens (`--txt`/`--dim`/`--faint`, `--bg`/`--panel*`/`--line`/`--in`, `--sb*`) and the
  hardcoded near-greys are restored to their original (cool) values. The difficulty-tinted budget fill, which
  was already correct, is unchanged.
- **The actual fix:** a *focused* encounter (`.enc.focused`) was tinting its muted greys 15% toward the accent
  (`--dim`/`--faint` `color-mix(... var(--sel-accent) ...)`), so the statblock-name subtitle, "Add combatant",
  etc. read warm/coral. Excluded `.enc.focused` from that rule so the encounter block keeps the **plain local
  greyscale palette**; its accent focus border/tint and `--brand` Start-combat CTA are untouched. `.card.selected`,
  the adventure list, and combat rows still tint as before.

## Batch 174 — Encounter card micro-fixes
- **Statblock dropdown drops the per-item "CR x"** (the list is already grouped by CR); minion creatures keep a
  small `minion` tag.
- **Minion `?` now has a styled note popover** (CSS hover tooltip with the `MINION_NOTE` text, right-aligned in
  the menu item) instead of relying on the native `title`.
- **Row kebab `⋯` is vertically centred** — it was inheriting `.iconbtn`'s `height:32px` and overflowing the
  22px XP cell; dropped the class so it fills the cell.

## Batch 173 — Type-to-search statblock & CR dropdowns
- **Statblock picker is now a custom type-to-search dropdown** (`openStatblockDropdown`), replacing the native
  `<select>` on monster rows: a search field over the creatures grouped "Last edited" + by CR, the current pick
  highlighted, Enter selects the top match (per the project's custom-dropdown rule — never a native datalist).
  An empty bestiary falls back to the full `openBestiaryPicker`.
- **Quick-CR is a custom dropdown too** (`openCRDropdown`): searchable CR list **plus the minion toggle inside
  it** (with the same `?` explainer), so a quick combatant's minion flag lives where you set its CR.
- Both triggers are ghost buttons (`.cbt-pick`) that match the row's quiet-field language; the shared minion
  copy lives in `MINION_NOTE`.

## Batch 172 — Encounter card polish round
- **Combatant name shows full-strength at rest.** The statblock/quick name placeholder now renders in `--txt`
  (looks like the creature's name) and only **dims on focus** to act as an editable placeholder.
- **Per-row actions moved into a hover kebab** (`⋯`, replaces the inline `✕`): **Turn into minion** (a
  per-combatant override with an inline `?` explainer), **Edit in Forge**, **Duplicate**, **Delete**.
- **Minion is now an override, not a chip.** Dropped the separate minion chip/tag; a minion statblock shows
  `· minion` next to its CR in the statblock select, and `c.minion` (set via the kebab) overrides the
  inherited flag for both monster and quick combatants (`combatIsMinion`/`combatXPEach`).
- **"Clear encounter"** added to the encounter `⋯` menu (confirm → empties the combatant list).
- **Difficulty pill is fixed-width** (82px, its "Over High" max) so the bar end no longer shifts as difficulty changes.
- **Bug: difficulty pill now updates on count edits.** `updateEncMeta` looked for the pill in `.eh`, but in an
  expanded card it lives in `.budget-top` — now found in either.
- **Encounters use the global accent**, not the adventure's colour (dropped the `--sel-accent:<a.color>`
  override on `.adv-detail-body`).
- **No scroll jump on delete.** Combatant delete (and the kebab actions) re-render via `renderEncList`
  (which only rebuilds `#encList`) instead of the whole `renderAdvDetail`, so the page keeps its scroll position.
- Count cell vertically centred with the rest of the row.
- **Deferred:** turning the statblock + quick-CR selects into type-to-search custom dropdowns (with the minion
  toggle inside the CR dropdown) — a larger change, next.

## Batch 171 — Encounter card redesign (combatant rows + budget bar)
- **Combatant rows are now hairline rows** on the encounter card instead of nested dark boxes: a faction
  stripe + thin dividers, no per-row surface (they already sit inside the encounter/scene surfaces).
- **Count leads on the left** as a large tabular number with a trailing dim `×` (e.g. `4×`); the default `1`
  shows dimmed via the placeholder — mirrors the initiative / party-level number styling.
- **Ghost fields, no underline.** Name, count and both selects read as clean text at rest and only grow an
  input/select border on hover/focus. The statblock (or CR) control drops to a quiet dim subtitle under the name.
- **One chip language.** Faction is now a `.pill`-styled chip (native `<select>` restyled, faction-tinted) so
  status / difficulty / faction all share the same rounded translucent chip.
- **Remove on hover.** The `✕` is hidden at rest and fades in over the XP total via a row-background gradient
  (`.cbt-del`, `pointer-events` gated), freeing horizontal space.
- **Rows wrap gracefully** on narrow cards (`flex-wrap` + a `min-width` floor on the name column) so the
  faction/XP cluster drops to a second line instead of crushing the name.
- **XP budget bar reworked.** New **Low→High scale** — Low pinned at the left, High at the right, Moderate
  placed proportionally (`budModPct`); the fill only grows between Low and High (`budSpentPct`) and carries a
  **difficulty-tinted colour** (`budFillColor`) while the three threshold notches stay neutral + clear. No text
  labels. **The draggable XP target was dropped** (and its pointer-drag binding removed); `bindEncTarget` now
  only wires the notch hover tooltips.

## Batch 170 — Combat preview polish + roll-init fixes
- **Add-effect dropdown headers align when sticky.** The first group (`.cl-grp:first-child`) had a tighter
  `padding-top` (2px vs 7px), so once it pinned to the top it sat closer to the divider than Masteries /
  Spells. Dropped the `:first-child` override — all headers now share a uniform `padding:5px 7px 3px`, so
  every stuck header is equidistant from the divider.
- **Edit button moved in line with the name** (character + statblock preview). For monsters it's "Edit in
  Forge", for PCs "Edit", both pushed to the right of `.ca-name` (`.ca-name-edit{margin-left:auto}`) — the
  old `.ca-sbbar` / `.pcs-head` edit rows are gone.
- **Tighter preview spacing.** Reduced the gap between the stat boxes and the statblock/character details:
  `.ca-pcsheet` margin/padding 12/11 → 7/8, `.ca-sb` 0/14 → 7/8. The PC sheet's **"Character details"
  placeholder title is removed** — only a slim "Level N" line shows when a level is set.
- **Roll-initiative reel no longer drops numbers.** The reel column was vertically centred in the full
  ~30px cell box, so neighbouring numbers bled through / vanished mid-spin. It's now clipped to a single
  1em window (`.nf-digit`) centred in the cell, matching the roll-log / level-up reels.
- **"Roll initiative" label on the round-bar d20.** The button now carries its text when there's room and
  collapses to the icon-only 28px button (tooltip kept) below 440px — `.ct-roundbar` is now a size container.

## Batch 169 — Party-row chip fixes + live combat edits
- **Party-row chips no longer clip.** They were right-aligned with `justify-content:flex-end`, which (the
  classic flexbox bug) pushed the leftmost chips (atk/DC) off-screen to negative positions. Now the cluster
  is **`flex-direction:row-reverse`** (AC still rightmost) so it overflows toward the name *reachably*, and
  the **left fade only shows when it actually overflows** (`.pc-chips.ov`, toggled per render) instead of a
  permanent gradient over a chip.
- **Edits during combat now apply on ANY close path.** Closing the character detail via a **backdrop click**
  previously called `closeModal()` directly, bypassing the resync + `renderCombat`. Added a `_onModalClose`
  callback that fires on ✕, action buttons, AND backdrop clicks — so e.g. changing a PC's main ability
  re-tints its ATK/DC boxes and updates its stats immediately.

## Batch 168 — FAB divider, init reel, chipfield add button, stat-box colours
- **Turn FAB** now shows a **divider line between its two parts** (the `button{border:none}` rule was
  hiding it).
- **Initiative reel** uses the same range-based spin as the roll log — only plausible results (1d20+mod,
  1- or 2-digit) appear during the animation, regardless of the final value (`rollReelHTML`; removed the
  old per-digit `nfReelHTML`).
- **Chipfield ＋add control moved to the left** (before the chips) in the character detail and relabelled a
  uniform **"＋ Add"** across all chipfields.
- **ATK / DC / save stat boxes** in the combat panel are now **tinted by their source ability** when there
  is one (PC main ability; monster save ability).

## Batch 167 — Initiative-row popovers + rule finder scope
- **Concentration / Reaction hover popovers** are now just a **title + the current status**, right-aligned
  and **coloured** (available / on = green, used / off = neutral) — no body text, no em dash.
- **Tooltip popovers fit their content** (dropped the `.popover` min-width floor for tail-pops), so the AC
  popover (and the others) are no longer over-wide.
- **Added hover popovers** to the **Initiative** field ("Initiative") and the **HP** cell ("Hit points");
  removed their redundant native `title` tooltips.
- **Rule finder now works in the combat statblock preview** (toggling it re-renders the combat panel) and
  its button is **shown only on Forge + Combat** (hidden on Bestiary / Adventures; exits if you leave).

## Batch 166 — Selection menu rework (combat)
- **Removed "Set current turn"** from the selection strip (still available via a row's ⋯ menu).
- **Reworked the visual hierarchy:** a dim count leads (`N selected`), the actions are compact secondary
  buttons, and **Clear is a subtle ✕** pushed to the trailing edge. The strip **never wraps** (scrolls if
  cramped) and **slides in** only when the selection first opens.

## Batch 165 — Character detail: wider, no Done button, inline chipfields
- **Removed the redundant Done button** (the top ✕ closes the detail).
- **The detail is wider** (max-width 368→540px) and its content widens to fill.
- **Chipfield properties (Class / Subclass / Skills / Passives / Damage) now sit inline with their label**
  and **scroll horizontally under a right-edge fade**, with the ＋add control pinned outside the scroller
  so it's always reachable.

## Batch 164 — Combat polish: chip order, reels, selection bar, split FAB
- **Party-row chips reversed** so the first field (AC) sits rightmost (the always-visible end behind the
  left fade).
- **Roll-log reels spin through whole numbers within the roll's possible range** (e.g. 1–20 for a d20,
  via `formulaFloor`/`formulaCeil`) and vary their digit count, so a spin never telegraphs whether the
  result is above or below 10. New single-column `rollReelHTML`.
- **Selection action bar moved into the active panel** (a strip pinned below the faction bar) instead of
  floating center-bottom where it collided with the roll log + turn FAB.
- **Turn FAB is now a split button** — the previous-turn chevron is divided from the "Next turn" button
  (like the Bestiary New FAB).

## Batch 163 — Class/subclass chipfields + PC combat stat boxes
- **Class and Subclass are now chipfields** (preset properties). **Class** adds from a custom dropdown of the
  13 D&D classes (incl. Artificer) and also accepts a typed custom class; **multiple class chips = multiclass**.
  **Subclass** is a free-text chipfield. The party row still shows the **first** class next to the name; the
  combat preview's identity line **appends all classes, slash-joined** (e.g. "Player character · Fighter /
  Wizard"). Legacy scalar/custom "Class" fields migrate to the array shape (`normalizeRosterPC` +
  `migratePartyModel`); `classList` / `charClass` / `charClasses` helpers added. The old single class field +
  its chevron dropdown are gone.
- **PC combat stat boxes now include ATK / DC** as boxes like monsters (computed from the main ability; ATK
  rolls, DC static), and the class moved out of the sheet subtitle into the identity line. The sheet's
  former "ATK / DC" chip line was removed.

## Batch 162 — Combat is always live (no start screen)
- **Removed the pre-combat "Start combat" screen.** Loading an encounter into the combat tab now
  **auto-starts** the tracker (builds the order silently) whenever it has combatants or party — combat is
  always "started". The dramatic "Rolling initiative…" flourish stays on the explicit ⚔ entry from an
  encounter card (`runCombat`).
- **The FAB is now the turn control:** a primary **"Next turn"** button + a previous-turn chevron
  (`combatNext` / `combatPrev` → `combatAdvance`). The old Start/End FAB and `endCombat` are gone; the
  duplicate turn arrows were removed from the round bar. Reset / re-roll initiative live in the round-bar
  tools (⚙) menu. Encounter "completed" status is managed from the encounter card as before.

## Batch 161 — Party row + roll/dropdown polish
- **Party row name truncation is consistent + generous.** The name now keeps a `min-width` floor and the
  chip cluster shrinks/scrolls first, so every row truncates at the same point and short names (e.g. "Vex")
  no longer collapse to one letter.
- **Roll reels are randomized.** Each digit column spins through random digits before landing (fixed length
  so timing stays consistent) — no two spins look identical.
- **Sticky dropdown group headers** sit flush (removed the `.cond-list` padding-top gap that let a scrolling
  item peek above the pinned header).
- **Combat sheet labels shortened** to avoid wrapping: "Attack / DC" → **"ATK / DC"**, "Passive skills" →
  **"Passives"** (the character-detail preset keeps the full "Passive skills" name).

## Batch 160 — Combat/character fixes round 2
- **Roll log animation fixed properly.** Each roll animates while it's *fresh* (added < `ROLL_REEL_MS`
  ago, tracked via a new `_t` timestamp); an in-flight reel survives the per-sub-roll re-render, so a new
  attack's atk + damage animate together while a previously-rolled identical attack grouped with it stays
  static. Also locked `.rl-total` to a constant height so reel/static rows align (no more fractured gutter
  line).
- **Grit** unchanged from B159 (crits only) — listed here for context.
- **Senses field** in the character detail now prefills a dimmed editable default of **"Darkvision 60 ft."**
  (`fieldDefault`), like Speed's "30 ft.".
- **Add-skill control is a custom dropdown** (replaced the native datalist). New convention: any
  type-to-filter suggestion list uses a custom dropdown, never a datalist.
- **Real-time stat edits reflect in combat.** Closing the character detail re-syncs each live PC combat
  instance's AC / max HP / initiative modifier from the roster (`resyncPcInstances`, preserving damage
  taken). Added an **"Edit in Forge"** button to the monster combat panel → opens the creature in the Forge.
- **Grouped dropdowns get sticky headers.** The current group label pins to the top of the scroll area
  until the next group arrives — applied to the add-effect list (`.cl-grp`) and the menu groups
  (`.popgrp-h`); the skill/tool dropdown (`.pop-grp-lbl`) already did this.
- **Generic derived label.** The PC combat sheet's main-ability line is now **"Attack / DC"** instead of
  "Spell" (the ability may not be a spellcaster).
- **Note popup** field and button are now equal width (`.popinput` no longer forced to 190px inside the
  note editor).
- Testkit **Fill** now also populates the party roster with fully-detailed characters (abilities, saves,
  skills, passives, defenses) by class — dev-only, not shipped.

## Batch 159 — Combat/character fixes round
- **Roll log no longer re-spins settled rolls.** Each roll's number-flow reel now plays exactly once, when
  it's added (`_rlAnimated` tracks spun ids, pruned to the live log); adding a roll no longer re-rolls the
  whole group's numbers.
- **Grit applies only on crits.** The Grit homebrew floor (a roll deals at least its pre-crit maximum) now
  fires only when the damage roll is a critical hit — a normal hit is never floored.
- **Retired the Passive Perception field.** Dropped the standard `pp` field and the legacy custom "Passive
  Perception" field (migrated out in `migrateCharShape` / `normalizeRosterPC`); the **Passives** preset is
  renamed **Passive skills**. The Passive skills preset already computes passive Perception.
- **PC combat chips are rollable.** Ability checks, saves, skills and spell attack in the PC combat sheet now
  roll (1d20 + bonus, Alt/right-click for options), attributed to the PC. Roll attribution (`combatRollSrc`)
  now follows the panel actually shown — the peeked selection if any, else the active turn — for PCs and
  monsters alike. Passive scores / spell DC / defenses stay static.
- **Damage-modifier chips recoloured** to yellow / green / red (resistance / immunity / vulnerability) to
  match the Forge palette, in both the character detail and the combat sheet.

## Batch 158 — Character details in combat (PC sheet)
- A PC selected in the combat tracker now shows a **display-only character sheet** in the active/peek panel
  — the PC counterpart to the monster statblock embed — replacing the old "no statblock to roll from" line.
- Reads the full roster character live (`pcSheetHTML`, fed by `rosterById`) and renders **statblock-style
  labelled lines** for only the fields that carry data: **Abilities** (score + mod), **Saves** (proficient
  ones emphasised), **Skills** (expertise tinted), **Spell** (atk + DC from the character's main ability),
  **Defenses** (damage res/imm/vuln), **Speed**, **Senses**, and any remaining custom fields. Chips reuse
  the ability/skill **colour scheme**; nothing is click-to-roll (players roll their own dice).
- An **Edit** pencil opens the existing character-detail modal; closing it re-renders combat so edits show
  immediately. The initiative row is unchanged.

## Batch 157 — Local test kit loader (dev only)
- `seed.js` now pulls in a **gitignored, localhost-only `testkit.js`** (`loadTestkit`) when seeding. The
  kit adds two sidebar buttons under a "Testing · local" block — **Fill** (populate the bestiary +
  adventures + party with placeholder data via `applySeedData`) and **Clear** (wipe the bestiary,
  adventures and shared roster in-memory; a reload re-seeds). Never runs on the live site (only reached
  from the localhost branch of `maybeApplySeed`) and the buttons/logic are not shipped.

## Batch 156 — Party rework (21/n): Class field chevron dropdown
- The **Class** field (the default 2nd property) keeps its free-text input but now has a **chevron that appears
  on hover/focus** and opens a **custom dropdown of the 13 D&D classes** (current value marked), replacing the
  native datalist.

## Batch 155 — Party rework (20/n): character-detail kebab menu
- A **kebab (⋯) menu** at the top of the character detail consolidates: **Clear page** (wipe name, notes and
  every property value — confirmed), **Import current template** (reshape the character to the saved template,
  keeping overlapping fields' values and **prompting before removing any *filled* property**), **Unsync**
  (shared characters only) and **Delete character**. The standalone unsync icon and the footer Delete button
  are gone (footer is just Done); dropped the now-unused `UNLINK_ICON`. `fieldHasVal` detects filled fields.

## Batch 154 — Party rework (19/n): roster header tweaks + main-ability save tint
- **"Level Up" text** beside the level-up button. The **member count moved back next to the "Party roster"
  label** (dim, no border) — removed from the adventure title.
- A **main-flagged ability's Save toggle carries a faint ability tint even when unselected** (`.is-main .svtog`),
  so the main cell reads as a unit.

## Batch 153 — Party rework (18/n): property template
- **"Save as template"** button next to ＋ Add a property in the character detail. It stores the current
  character's **property structure** (fields + flags + preset entries, with scalar values and ATK/DC
  overrides cleared) to a local `mf_pc_template`. **New characters then start from that template**
  (`newRosterChar` → `loadPcTemplate`), falling back to the Level·Class·AC·HP·Speed default when none is set.

## Batch 152 — Party rework (17/n): split Senses & Passives
- The old **Senses & passives** preset is split. **Senses** is now a plain text field (darkvision / special
  senses; legacy object values migrate to text in `normalizeRosterPC`). **Passives** is its own chip-field
  preset (default Perception / Insight / Investigation, add more via a custom skill dropdown), and each
  passive's value = **10 + ability mod, taking proficiency FROM the Skills preset** when that skill is listed
  there (`charSkillProf` / `passiveVal`); a proficient passive is tinted.

## Batch 151 — Party rework (16/n): Damage Modifiers dropdown + grayscale saves
- Renamed the damage preset to **Damage Modifiers** (`fieldLabel` now resolves preset labels from
  `PC_PRESETS`, so the rename applies to existing fields too) and its **add control is a custom dropdown**
  (showPopover of the remaining damage types) instead of the native datalist.
- **Ability Save toggles** (Forge + character detail) now use a **desaturated, hue-tinted grayscale** when
  active instead of the full ability colour — distinguishing them from the colour-saturated "main" star.

## Batch 150 — Party rework (15/n): roster-row polish + Player field
- **Class shows next to the character name** in the roster row (dimmed, smaller; `charClass` finds the
  standard `class` field or a legacy "Class" custom field) and no longer renders as a row chip.
- **"LV" cap** sits above each row's level number (tightened so the row height doesn't grow). The party-row
  **chips scroll on one line behind a left gradient** near the title, and a long **name truncates with `…`**
  (`.pc-name` / `.pc-cls`, masked `.pc-chips`).
- **Level-up button border removed.** New **Player** standard field (real-world player name) offered in the
  Add-a-property menu.

## Batch 149 — Party rework (14/n): Senses & passives preset
- Third preset field: **Senses & passives** — a free-text senses/darkvision line plus **passive Perception /
  Insight / Investigation** chips, each computed **10 + ability mod (+ proficiency if flagged)** and coloured
  by ability (WIS / WIS / INT). Click a passive chip to toggle its proficiency. Value is an object
  (`{dv, prof:{}}`); `passiveVal` computes the scores.

## Batch 148 — Party rework (13/n): chip-field presets (damage mods + skills)
- Two **preset chip fields** in the Add-a-property menu (`PC_PRESETS`). Each holds an array of entries shown
  as **click-to-cycle chips**, added via a datalist input, removed with the chip's ×.
  - **Damage res / imm / vuln** — chip shows the multiplier (`½×` resistance default → `0×` immunity →
    `2×` vulnerability), cycling on click with a colour shift (cool / amber / red).
  - **Skills & expertise** — chip shows the signed bonus (ability mod + proficiency, **×2 for expertise**),
    **coloured by the skill's ability**; click toggles proficient ↔ expertise (the expert chip is tinted).
- Field values for presets are arrays (`newPresetField` / `isPreset`); `normalizeRosterPC` already preserves
  them. Reuses `SKILLS` / `DMG_TYPES`.

## Batch 147 — Party rework (12/n): editable row levels + party level-up
- The **party roster no longer collapses** (chevron removed) and the **member count moved next to the
  adventure title** (a small badge). Where the count sat, a **level-up button** (arrow-trend-up) now bumps
  **every member's level by one** (capped at 20, snapshotting current levels first so unset members don't
  inherit a just-bumped one), then **scrolls each row's level number from current → next** — a single
  deterministic step reusing the init number-flow reel (`nfStepHTML` / `animateLevelUp`).
- Each row's **level is editable inline** (a 30px number input; empty shows the party-default placeholder).
  `rowLevel` resolves the displayed value.

## Batch 146 — Party rework (11/n): field defaults, Class dropdown, abilities always open
- **New characters** start with **Level · Class · AC · HP · Speed**. **Dimmed editable defaults** show as
  placeholders (empty value falls back to them): **Speed 30 ft.**, **Level = the party's level** (first set
  member, so a new PC inherits it), and once any ability score is filled, **Initiative = DEX mod** and
  **Passive Perception = 10 + WIS mod** (no prof assumed). `fieldDefault` drives the placeholders; combat
  reads `effInit` so an unset initiative uses the DEX-mod default.
- **Class field** value is a combobox over the 13 D&D classes (`<datalist>`), still free-text.
- **Ability-score grid is always shown** (no longer behind an "Add" action) — cells bind by ability key and
  the field is created lazily on first edit (`abilFieldOf` / `ensureAbilField`).

## Batch 145 — Party rework (10/n): add-menu cleanup + footer + roster label
- **Add-a-property menu** no longer suggests **Proficiency** (derived from Level) or **Ability scores** (always
  shown in the grid now), and **hides any option already present** — by key *or* by a matching custom label
  (so a custom "Passive Perception" suppresses the standard one). Groundwork for chip-field presets
  (`PC_PRESETS` / `newPresetField`, populated later).
- **Done** now fills the footer row beside Delete (no more fixed width). The party-roster add button reads
  **"Add character"**.

## Batch 144 — Party rework (9/n): drag-to-reorder properties
- Each character-detail property row gets a **grip handle**; dragging it **reorders the properties** and,
  when dropped onto a row in the other group (or the "Hidden from the party row" divider), **moves the field
  between the shown/hidden groups** (`reorderField` sets `hide` from the drop target; init stays hidden and
  Level stays shown). The grip keeps the value inputs fully editable (only the handle starts a drag). Mirrors
  the existing adventure-list/encounter drag pattern (grip drag-image, before/after drop marks). Scroll
  position is preserved across the resulting re-render (B143).

## Batch 143 — Party rework (8/n): Level placement fix + scroll-preserving re-render
- **Level is back to a regular field** at the **top** of the character detail's property list (new characters
  get it first), not the big number by the name. Instead the **party-roster row shows the level as a number
  before the name** (initiative-sized, 17px), bright when set and a dimmed `1` when unset. `chipHidden` keeps
  Level out of the row chips since the number now represents it.
- **Editing in the detail no longer bounces you to the top.** `re()` preserves the `.cd-scroll` position
  across its full re-render, so toggling Save proficiency / main / hiding a field keeps your place.

## Batch 142 — Party rework (7/n): roster drives the budget; adventure top trimmed
The party roster is now the single source of truth for encounter scaling.
- **Encounter XP budget is derived from the roster.** Party size = number of members; each member's level
  comes from its **Level** field (unset → 1); the Low/Moderate/High budget is the **sum of every member's
  per-level threshold** (`advPartyLevels` / `baseBudget`). Confirmed live (e.g. levels [5,1,1,1] →
  [650, 975, 1400]). Allies still fold in via CR→level as before.
- **Removed the manual party controls.** The top **party bar is gone** — party size, party level, the
  per-PC level grid, the **Uneven levels** option, and the **Low/Mod/High budget chips**. The **per-encounter
  party override** is gone too (button, panel, handlers). The per-encounter budget **bar, difficulty pill,
  and draggable XP target stay** (now fed by the roster). The **chevron beside the adventure title** (the
  whole-info collapse) is removed; the info is always shown. New adventures no longer carry
  size/level/uneven/levels. Adventure-list subtitle now reads from the roster (e.g. "4× lvl 1", "no party").
- Dropped the dead helpers (`partyOf`, `partyLevels`, `syncLevels`, `renderPCgrid`, `ovrInner`, the adv-info
  collapse) and their CSS (`.party-bar`, `.adv-bud-chips`/`.bud-chip`, `.pcgrid`, `.ovr`, `.adv-info-toggle`).

## Batch 141 — Party rework (6/n): Level as the big number by the name
- New characters get a **Level** field by default. In the character detail it renders as a **large editable
  number with a "LVL" cap before the name** (like combat initiative), not as a plain property row; empty shows
  a **dimmed `1`** placeholder and editing it lazily creates the field. Level still surfaces as a party-row
  chip when set, and drives the derived ATK/save PB (`pbForLevel`). Committing level re-renders so those
  placeholders refresh.

## Batch 140 — Party rework (5/n): ability-block polish + detail sizing
- **Ability cells (Forge + character detail).** The character detail gained the **Save-proficiency toggle**
  (parity with Forge). Save + main toggles and the main-cell highlight now use **the ability's own colour**
  (`var(--abc)`), not the generic accent/amber; **"main" tints the cell background** (a hue of the ability)
  instead of a yellow border. An **empty ability score reads as 10** so the modifier shows +0, not −5
  (`abilScore`); derived ATK/save and the Save value use it too.
- **Detail chrome.** The modal now **sizes to its content** (`.modal.cd-host`, ~368px) instead of sitting in
  the generic 580px shell with a big right gutter. **Done** keeps its regular height but is **wider** (min
  120px). The **party-row chip quick-edit popover is compact** (~160px, was 230). **Delete skips the confirm
  prompt when the character is blank** (`charIsBlank`).

## Batch 139 — Party rework (4/n): reuse the Forge ability grid + shared "main ability"
Replaced B138's inline per-ability atk/save toggles with the **Forge ability-score block, reused** in the
character detail and a shared **"main ability"** concept across both surfaces.
- **Forge.** Each ability cell gains a ★ **main** toggle (`M.mainAbils`, multi-select). A flagged ability
  **sources the bare `[ATK]` / `[SAVE]` brackets** — they now use the highest of the *marked* abilities
  (instead of the creature's highest overall); unflagged behaviour is unchanged. `buildAbilityGrid` /
  `refreshAbil` render the star + `is-main` ring; `applyRefsFor` (engine) does the resolution.
- **Character detail.** The six abilities no longer render as property rows — they're a **3-column ability
  grid appended at the foot** (reusing `.abil .cell`), each cell with a ★ main toggle. Marking an ability
  **main derives both its spell ATK and save DC** (mod + PB from Level; DC +8); a per-ability override row
  (computed value as a **dimmed placeholder**, `atkV` / `dcV`) sits under the grid, and the derived values
  surface as party-row chips. Multiple abilities can be main. `f.main` replaces B138's split `atk`/`dc`
  flags; `normalizeRosterPC` migrates `spell`/`atk`/`dc` → `main`. `chipHidden` now also keeps abilities out
  of the row (the grid owns them; the row shows their derived chips).

## Batch 138 — Party rework (3/n): detail polish + per-ability ATK/save toggles
Feedback round on B137's character detail.
- **Initiative is never a party-row chip** (`chipHidden`) — combat rolls it; the row stays a clean summary.
  In the detail it always lands in the *Hidden from the party row* group (no show/hide toggle).
- **Per-ability spell ATK / save DC.** Replaced the single exclusive "spell ability" flag with **atk / save
  toggles next to each ability's value** (any ability, independently). Toggling one reveals a derived sub-row
  (one or two columns) whose input shows the computed value (mod + PB; DC also +8) as a **dimmed placeholder**,
  cleared for input but counted as filled → it surfaces as a row chip. Typing **overrides** (`atkV`/`dcV`,
  empty = computed). `charDerivedChips` collects every enabled atk/DC across the abilities. Legacy `spell:true`
  migrates to both atk + dc in `normalizeRosterPC`.
- **Detail chrome.** Modal narrowed (max 360, was 460); **Done** is now the larger primary button to the right
  of **Delete**; removed the redundant top add-field gear (＋ Add a property stays at the foot). The **field
  name menu and Add-a-property dropdown now use the shared `showPopover` base** like every other menu (dropped
  the bespoke `.cd-pmenu` / `.cd-add-dd` / scrim). Adventure **tags read clearer** (tinted fill + full-contrast
  text) and the **current adventure's tag always leads**.
- *Next:* swap the inline atk/save toggles for the Forge ability-score block reused here, with a shared
  "main ability" marker (multi-select, overridable) in both Forge and the character detail.

## Batch 137 — Party rework (2/n): detail peek refinements, roster dropdown, ATK/DC
Addressed the feedback on B136 (cross-checked against the mockups).
- **Character detail.** Fixed top (tags · icons) + footer (Done · Delete, right-aligned); the title /
  properties / notes scroll together between them (the notes no longer scroll inside themselves and lost the
  resize handle). Property **values are transparent, background on hover only** (the global input rule was
  overriding them). Properties split into two groups — **shown in the party row vs hidden** — by a labelled
  divider; a property's name menu toggles its group, and more space sits before ＋ Add a property. **Tags
  inherit each adventure's colour** (solid = current adventure, outline = others).
- **Standard fields reworked.** Added **Level** and a single **Ability scores** option (auto-creates all six,
  hidden by default). Dropped the standalone Spell attack / Spell save DC; instead **flag one ability as the
  spell ability** (name menu) → the party row shows derived **ATK / DC chips** computed from the ability
  modifier + proficiency (from Level). Initiative is no longer a forced default property.
- **Roster is now a dropdown field** (like the combat add-effect), not a modal: type to filter, browse by
  adventure; **click a row to add that character to this adventure's party**, or the hover-revealed ⋯ to open
  its detail.
- **Party rows.** The chip quick-edit popover adopts the Notion property style; the ⋯ became a **ghost ✕**
  (remove from this adventure, revealed on hover).
- Verified: migration (init-optional), rows, roster add, detail groups/scroll/transparent fields, ATK/DC
  derivation, notes. **Deferred to the next pass:** drag-to-reorder properties (and drag between groups).

## Batch 136 — Party rework (1/n): typed-field model + compact rows + character detail peek
Foundation of the redesigned party system (mockup-driven, A "compact row" direction).
- **New model.** A player character lives ONCE in the shared roster; each `a.party` is now an **ordered list
  of roster ids**, so membership *is* the adventure tag (`rosterAdventures(rid)` derives it). Fields are
  **typed**: a standard key (ac / hp / init / spell save DC / spell attack / passive perception / proficiency
  / speed / the six abilities) carrying a canonical label + icon, or a free custom label. Defaults are AC + HP
  (both removable). One-time idempotent migration (`migratePartyModel`) folds every pre-B136 shape (B80 local
  members, B134 `{id,sharedId}` links, old roster chars) into the new model.
- **Compact rows.** Each party member is a one-line row: name + its enabled stats as chips (♥ HP = max only,
  ⛊ AC by icon; init / DC / etc. by short label). Click a chip to quick-edit it; click the row to open the
  character; ⋯ for open / unsync / remove.
- **Character detail — Notion peek.** Plain editable title, single-column typed properties (click a name for
  a small options menu, click the value to edit), the shared-adventure tags up top (current adventure filled,
  others outlined; scroll-faded), an **unsync** icon shown only when >1 adventure shares it (forks a separate
  roster copy tagged to the current adventure), notes/backstory below a divider, Done (bottom-left) / delete.
  ＋ Add a property suggests the standard fields.
- **Roster** button (replaces From roster / Manage roster) opens a searchable list grouped by adventure.
- Combat reads PCs from the typed fields. Verified: migration, rows, detail, add-field, unsync, combat.
- Next pass: the roster search-dropdown polish + a path to add an existing character to another adventure.

## Batch 135 — CT13 (2/2): roster manager + safe delete — CT13 complete
- **Roster manager modal** (opened from a new "Manage roster" button by ＋ From roster): lists every shared
  character — including ones no adventure currently links (otherwise orphaned and uneditable) — each editable
  in place (name / AC / HP / Init / custom fields), with a **usage badge** ("used in N", with the adventure
  names on hover, or "unused") and a ＋ New character button. Editing here syncs everywhere the character is
  linked.
- **Safe delete:** removing a shared character that adventures still link prompts a stacked confirm and then
  **unsyncs every linked member into a frozen local copy** (`freezePCLocal`) before dropping it — no party
  slot is silently emptied. Deleting an unused character is immediate.
- Concludes CT13 (the user chose the live-shared-reference model + a roster manager, no per-adventure tags).

## Batch 134 — CT13 (1/n): shared party roster + cross-adventure sync (foundation)
- **New shared character store** `state.roster`, persisted to its own JSONBin bin `library:party` (cached +
  debounced-synced exactly like monsters/adventures — `saveRoster`, `_pend.roster`, hydrate + reconcile in
  `loadAll`).
- A party member is now either **local** (its own data, as before) or **linked** to a shared roster character
  by `sharedId` — a **live reference**, so editing a linked member changes that character in *every* adventure
  that uses it. `pcData(p)` resolves the effective data; `pcInstance` (combat) and `renderParty` both read it.
- Member actions (link button → menu): **Save to shared roster** (promote a local member + link it), **Link
  to a shared character**, and **Unsync** (freeze the shared data onto a local copy and detach). A **＋ From
  roster** button adds an existing shared character to the party. Linked members show an accent link icon.
- `normalizeAdv` preserves `{id,sharedId}` for linked members across reloads. Per-adventure tags and richer
  sync states are the next CT13 pass.

## Batch 133 — Combat & statblock fixes
- **Cursor can finally reach the add-effect popover.** The `＋` chip's hover tooltip and the click-popover
  share one `_pop`, so the chip's `mouseleave` was slamming the popover shut the instant the cursor moved
  toward it. New `closeTipPop()` only dismisses the hover *tooltip* (`.tail-pop`), never the popover — applied
  to the AC / reaction / concentration / add-effect chips.
- **Add-effect list is collapsed by default**, revealed by the field's chevron (or once you start typing) —
  no more 396-item dump on open.
- **Roll-log reel spins for every roll in a group**, not just the last — `animateNewGroup` animates the whole
  newest source+label run (attack + damage, recharge + damage), driven from `renderRollLog`.
- **Definition popovers scroll in place.** `showRefpop` now caps the popover height to the free space on the
  chosen side (so a long entry scrolls instead of running off-screen), keeps its right edge within the
  statblock card, and a sticky bottom-fade gradient hints at more content.
- **Ability table stops wrapping early.** `STR 19` etc. are `white-space:nowrap` with slightly narrower
  numeric columns, so the cells stay on one line at low preview widths.
- **Tighter initiative cards.** The wrapped (narrow) card's title→chips gap was the base `gap:8px` bleeding
  through (a row can't be restyled by its own container query) — split to `column-gap:8px` / `row-gap:2px`
  and trimmed padding; the gap dropped ~20px→8px.

## Batch 132 — Audit (3/3): relocate the misplaced adventures.js tail
- The bottom of `adventures.js` held global app-shell code that was never adventure-specific. Moved it home:
  - **→ `engine.js`** (the rolling/refpop engine): the rule-finder button, the `#statblock` click-to-roll
    delegation, the pointer-following d20 cursor, the Alt / long-press custom-roll, and the rolling keyboard
    shortcuts. All their callbacks already resolved to engine.js functions.
  - **→ `app.js`** (the app shell + settings): `doExportJSON`, the `#settingsBtn` toggle, `settingPath`,
    `resyncCloud`, `clearLocalCache` — all consumed only by the settings panel.
- `adventures.js` is now 771 lines of purely adventure / encounter / party / scene code. No behaviour change;
  `verify` green and the moved bindings (settings toggle, statblock click-to-roll, dice cursor) re-checked live.

## Batch 131 — Audit (2/3): split combat.js out of adventures.js
- **The live combat tracker moved to its own file `combat.js`** (~1,040 lines: the `── Combat Tracker ──`
  banner through `bindCombatStatblockRolls`). `adventures.js` drops from ~1,900 to ~860 lines and now owns
  just the adventure / encounter / party / scene building; `combat.js` owns running the fight (start/advance,
  the order grid + rows, HP popover, death saves, drag/regroup, round bar, tools, active panel).
- Loaded as a classic `<script>` **after adventures.js, before seed.js**, sharing the one global scope (no
  imports) — every cross-file reference here is a runtime call, so nothing is load-order-sensitive. Registered
  in all four manifests: `index.html`, `test/harness.js`, `eslint.config.js`, `package.json` (check + lint).
- No behaviour change; `npm run verify` green (smoke test boots all scripts in one realm — zero init errors,
  every top-level binding survived) and combat re-checked in the live preview.

## Batch 130 — Audit (1/3): dead-code sweep
- Removed unreferenced combat code: `cycleCombatStatus()` and `condsHTML()` (the row condition cluster —
  superseded by the active-panel / row chip rendering) and the unused `GRIP_SVG` const.
- Removed orphaned CSS for the old in-row death-save pips (`.ci-ds`, `.ds-grp`, `.ds-sep`, `.ds-pip`) — death
  saves moved into the HP-management popover (`.hpm-ds-*`, B127) — plus the unused `.ci-wait` badge.
- No behaviour change. First of three audit batches (next: split `combat.js` out of `adventures.js`).

## Batch 129 — Combat tracker polish: effect list, roll reel, narrow card, responsive header
- **Add-effect popover reverted to one grouped list.** The Conditions / Masteries / Spells **tabs are gone**;
  the popover now shows a single scrollable list with those three as headed sections, filtered by the search
  field. The list lives **inside** the popover (not a detached floating dropdown), so the cursor can travel
  onto it without it closing — fixes the "closes too soon / can't reach the menu" interaction. Clicking an
  item adds it immediately; typing a custom name + Add still works.
- **Roll log gets the initiative roll reel.** A freshly recorded total spins through the same number-flow
  digit reel the initiative roll uses, and the **notification is timed to land as the reel settles**
  (`ROLL_REEL_MS`) rather than firing instantly — for single rolls and the combined attack/recharge toasts.
- **Death-save circles centred.** The FA circle-check / circle-xmark glyphs were sized to the full pip and
  overlapped its border; shrunk to sit cleanly centred inside the ring.
- **Round bar icons tightened.** The turn arrows · d20 · tools cluster spacing dropped from 10px to a uniform
  3px (the "Round N" label keeps its breathing room via the divider's own margin).
- **Narrow initiative card.** When the pane is narrow the initiative number is now **small and leads the chip
  line** (in line with AC and the effects) instead of a tall left rail; the roll reel reads the cell's
  font-size so the animation scales down to match. Tighter title→chips gap + trimmed padding = a more compact
  card.
- **Responsive combat header.** At small widths the **Load encounter** button collapses to an icon and the
  **difficulty pill collapses to a colour dot** (full label moves to its hover title).

## Batch 128b — Within-group reorder + back-to-active
- **Reorder within a group breaks initiative.** Dropping a card on another row (even in a grouped view) now
  reorders the turn order → `manual` sort, flagging the "out of order" restore chip; dropping on a group's open
  space still restatus/refactions. (Row drop stops propagation so the two don't collide.)
- **Click the "Active turn" flag** in the statblock-preview peek header to clear the selection and jump back to
  the active combatant.

## Batch 128 — Drag between groups, reset encounter, death-save clarity, render polish
- **Drag cards between groups.** Grouped by status/faction, dragging a card onto another group now changes
  its status/faction (`combatDragMode` "regroup" + `.cbt-group` drop zones); ungrouped init/manual still
  reorders the turn order. Multi-selection moves together.
- **Reset encounter** added to the round tools menu — rebuilds the order from the encounter (full HP, fresh
  initiative, round 1, cleared conditions/death saves/statuses).
- **Roll animation:** the old initiative number is hidden behind the reel while it scrolls (`.nf-hide`).
- **Death-save tracker** reads clearly now: successes (green) left of the centred title, failures (red)
  right, with coloured borders on the empty circles so each group's meaning is obvious.
- **Down rows keep the normal background** (the bad-colour tint clashed with faction tints) — the "down"
  chip carries the state.
- **Selected statblock preview no longer refreshes** on unrelated interactions: reaction/concentration
  toggles update in place, and the peek only animates when the previewed combatant actually changes.
- Concentration-alert **Roll** button is now accent.

## Batch 127 — Init clipping fix + death-save UX, effect tabs, rollable chips, click-only popovers
- **Fixed the initiative "drops a digit" bug:** the value was always stored correctly, but the 32px init box
  visually clipped two-digit numbers (centred) — widened to 40px (committed as 127a).
- **Death saves moved into the HP popover:** a row of six circles (3 success / 3 failure) that fill with
  green circle-check / red circle-xmark on click; the row just shows a **down** chip. When it's a dying
  combatant's **turn**, the HP section pulses red to prompt the save.
- **Concentration auto-drops at 0 HP** (down or dead) — no save prompt.
- **Add-effect dropdown gets category tabs** — Conditions · Masteries · Spells — so the masteries (and
  continuous-effect, non-instantaneous spells) show without typing. Tabs sit above the field.
- **Rollable quick-ref chips:** clicking the **ATK** or **save** chip in the statblock preview rolls
  1d20 + bonus (Alt-click = options), tagged to the combatant.
- **Tooltips** added for the AC chip and the add-effect chip (tail-popover style).
- **Definition popovers are click-only** now (hover was messy); the rule finder keeps hover.
- **"Enable dice rolling"** (renamed from click-to-roll) now disables *every* roll feature when off, including
  the roll log.
- HP-section hover uses `--panel3` so it stays visible on a selected (panel2) row.

## Batch 126 — Death saves, concentration checks, init-roll & multi-select fixes
- **Death saves / "down".** At 0 HP a combatant drops to "down" (rolls death saves) or is marked dead outright,
  per a new **Settings → Drop to "down" at 0 HP** (players only / anyone / nobody; default players). Monsters are
  otherwise dead immediately. Dying rows show a 3-success / 3-failure **death-save tracker** by the name
  (`deathSavesHTML`, `setDeathSave`); 3 failures = dead, 3 successes = stable; healing clears it. `applyDownState`
  reconciles state on every HP change; "Down" removed as a status group/filter (it's a hidden subset of Active).
- **Concentration checks.** Damaging a concentrating combatant in the HP popover pulses its marker and shows a
  **Concentration check** prompt — DC = max(10, ⌊damage/2⌋) with the statblock CON save (and a Roll button that
  breaks concentration on a fail).
- **Initiative rolls respect party setting.** "Re-roll initiative" (and the d20) no longer roll the party when
  *Roll party initiative* is off. Added **Clear initiative** to the tools menu (resets everyone, party included).
- **Effect dropdown = conditions only** (the library's diseases/status entries are filtered out) **plus the 2024
  weapon masteries** Sap · Slow · Vex.
- **Multi-select menu:** Damage now also heals (negative = heal); all buttons except Clear are accent; Clear
  standardised to the ghost/last style shared with the preset-library bar.
- **HP popover** opens from the **statblock-preview HP chip** too. Empty party initiative is neutral-dimmed (not yellow).
- (Initiative RNG checked — d20 is uniform over 100k rolls; group-init sharing kept as-is.)

## Batch 125 — Initiative row iteration (neutral init, concentration, HP polish, tooltips)
- **Initiative numbers are neutral** (no faction colour); the roll-animation reel lost its box (matches the
  boxless number).
- **Concentration toggle** — a bullseye chip beside reaction (`toggleConcentration`, `CONC_ICON`); accent when on.
- **Chip order:** wide single row now leads with +add-effect and pins AC · reaction · concentration next to HP
  (flex `order`); the narrow two-row version keeps the natural order (AC · reaction · conc · effects · +add).
- **Narrow two-row card:** initiative is a vertically-centred left rail, the chip cluster is left-aligned to the
  name (not under the init), and the title→chips gap is tighter.
- **HP control:** number/bar centred; the whole section gets a subtle bg on hover (button-like) and no longer
  tints the number on hover. **HP popover:** dropped the ±1/±5 quick buttons; added a full-width health bar
  under the title.
- **Global:** custom tooltips / `(?)` bodies (`.cr-pop`) are now neutral grey, not yellow — everywhere.

## Batch 124 — Initiative row redesign (plain init, radial-less H6 HP, responsive chips)
- **Initiative is a plain faction-coloured number** — no field box; a box only appears on hover/focus to edit
  (`.ci-init` / `.ci-init-in`).
- **HP control reworked (the "H6" design):** a bold `current/max` with a thin health-coloured underbar
  (`hpCellHTML` → `.ci-hpbtn`). The whole thing is a button that opens a **HP-manage popover** (`openHPManage`):
  damage/heal field (positive damages, negative heals), quick −5/−1/+1/+5, and editable current/temp. The old
  inline dmg + current/max fields are gone from the row.
- **Fixed-chip cluster** (`.ci-meta`): AC chip, **reaction as a toggle chip**, effect chips, and the +add-effect
  button, grouped together. Reaction colour is neutral.
- **Responsive row:** single line when the pane is wide; when narrow (container query ≤470px) the chip cluster
  drops to its own line below, while init · name · HP · kebab stay on the first line with **HP pinned to the
  right end**. Row markup `.ci-body`→`.ci-id`; `combatRowHTML`/CSS order rebuilt.

## Batch 123 — Combat tracker follow-ups (selection scroll, kebab, reaction colour)
- **Selecting a row keeps the scroll position.** `renderCombat` now preserves the `.combat-order` (and
  `.ca-scroll`) scroll offsets across the full re-render, so selecting/editing a row no longer jumps to top.
- **Reaction icon is neutral** (`--dim`) instead of the accent colour.
- **Kebab menu gains status + current turn.** Each card's ⋯ menu now has **Make current turn** and a
  **Status** group (Active / Waiting / Dead, current marked) via `setCombatStatus` / `setCurrentTurn`.
- **Peek active-turn name dimmed.** In the selection statblock peek, the active combatant's name up top is
  muted (`--dim`) so the previewed card reads as the focus.

## Batch 122 — Combat selection polish: faction accent, floating bar, statblock peek
- **Status reads from the row, not an icon.** The per-row status glyph is gone; status now shows via the
  row variant — `.dead` (strikethrough/dim) and a new `.waiting` (muted + italic) — reinforced by a status
  icon next to the grouped **Active / Waiting / Dead** headers (`.cbt-grp-ico`). The waiting chip is dropped.
- **Selection restyled.** The selected card's ring is now the row's **faction colour** (`--sel-accent`),
  not the global accent. The selection action bar moved out of the initiative column to a **floating
  centre-bottom bar** (reuses `.batch-bar`, like the bestiary/preset multi-select) so it no longer displaces
  the entries.
- **Statblock peek (replaces the B121 collapse).** While a selection points at a non-active card, the active
  panel keeps the active combatant's name + faction up top with an **"Active turn"** flag pushed right, a
  full-width divider, then the **selected card's header + statblock animate in** below (`combatPanelInnerHTML`,
  `.ca-peek` / `caPeekIn`). Selecting the active card (or nothing) shows the normal panel; multi-select previews
  the first. Rolls from the peek tag the previewed creature.
- **Two new ways to set the current turn** (`setCurrentTurn`): a **Set current turn** button in the selection
  bar (single selection) and **double-clicking a row**.
- **Effect popover fixes.** Clicking an effect suggestion no longer closes the whole popover (`_popOutside`
  now ignores `.combo-suggest`), and the field gets a **chevron** that opens the full suggestion list. Added
  spacing between icon and label in the status dropdown (`.popitem.has-ico`).
- **Reaction button** gets a hover tooltip (tail-popover style); **shift-select** no longer highlights row text.
- **Rolls moved to Alt/Option-click.** Cmd/Ctrl is now reserved for multi-select, so the modifier that opens
  the roll-options popover (and the click-anywhere custom roll + armed d20 cursor) is **Alt/Option** (right-click
  still works). Hints updated in Settings + dice help.

## Batch 121 — Collapse active when selecting + reaction tracker
- **Collapse the active panel while selecting.** When ≥1 card is selected, the active combatant's full
  info+statblock collapses to a single "Active turn — [name]" row (`.ca-collapsed`) so it doesn't compete
  with the selection you're working on.
- **Reaction tracker.** Each combatant row gets a reaction toggle (FA-free arrow icon): accent when
  available, dimmed when used; click to toggle. It **regains at the start of its turn** (reset in
  `combatAdvance`'s forward step). Defaults to available for existing combats.

## Batch 120 — Init-card selection model + multi-select action bar
- **Click selects, shift/cmd toggles a multi-selection** (`combatSel`); the drag handle is gone — the whole
  row drags to reorder (a multi-selection drags as a block via `reorderCombatMulti`), and editable/interactive
  areas (init, HP, ⋯, effect chips) are excluded from both select and drag (`CI_NOSELECT`). Selected rows get
  the **accent ring + lift** (`.cbt-row.selected`), distinct from the faction-tinted "active" (current turn);
  clicking empty space or re-clicking the sole selection clears it.
- **Selection action bar** above the order (`combatSelBarHTML`): **Status / + Effect / Damage** applied to all
  selected at once (`setCombatStatusSel`, `applyDmgSel`, `openCondAdd` now takes a `targets` list) + clear.
- **Per-card status control removed** (note): the status icon is now a read-only indicator; status is set via
  the action bar (and, coming next, by dragging into a status section). `bindCombatDrag` → `bindCombatRows`.

## Batch 119 — Polish: reel border + manual init field
- The number-flow reel no longer draws an accent highlight border while rolling (`--accent` → `--line`).
- Blank party init field (party-roll off) toned down: **solid yellow border** (was dashed) with a **dimmed
  grey em-dash** placeholder (was amber).

## Batch 118 — Status as icons (no faction-colour clash)
- Combat status no longer relies on colour (which collided with the faction colours). The card status
  control now shows **FA-free icons by shape**: active = shield-heart, waiting = circle-pause, dead = skull
  (`CI_STATUS_ICON`). Rendered monochrome (`--dim`, dead dimmer) so it's unambiguous regardless of faction.
- (Still clickable to cycle for now; per the plan, the per-card control is removed and status moves to the
  multi-select popover / drag-into-status-section in the upcoming Batch 5 interaction work.)

## Batch 117 — Number-flow reels follow scroll/clip + party-roll setting
- **Number-flow animation fixed properly.** The reels were `position:fixed`, so scrolling left them behind and
  a cell half-hidden under the statblock panel still drew its reel over the panel. They now render *inside*
  the scrollable order pane (`position:absolute` in scroll coords) — so they scroll with the rows and the
  pane's own overflow clips any half-hidden cell.
- **Setting: "Roll party initiative"** (`combat.rollParty`, default on). Off = PC entries start **blank at the
  top, flagged amber for manual entry** (`initManual`, `init:null`); blank inits sort to the top and the
  round-bar d20 skips them. Typing a value commits it; clearing reverts to blank. `initOutOfPlace` treats
  blank inits as top so they don't trip the "out of order" warning.

## Batch 116 — Initiative: merged numbering across same-name groups + group-init setting
- **Continuous numbering for same-statblock groups.** Two separate "Goblin" entries of 5 now number
  **Goblin 1–5 then 6–10** instead of each restarting at 1, while staying separate for initiative. startCombat
  does a two-pass tally (`combatBaseName`, per-name totals + offsets); single instances stay unnumbered.
- **Setting: "Group initiative for identical enemies"** (`combat.groupInit`, default on). On = all copies of
  one enemy entry share a single roll; off = each instance rolls its own initiative (its own `groupId`, so it
  sorts and re-rolls independently).
- Decoupled entry-linkage from init-grouping: instances now carry `srcEntry` (the encounter entry id) so
  `syncCombatOrder` still recognises an entry even when `groupId` is per-instance (ungrouped). Backward
  compatible (`srcEntry || groupId`).

## Batch 115 — Fixes: caret position + number-flow reels clipped to the order pane
- **Active caret** moved to the far left edge (`left:-18px`) so it hugs the left end with more gap from the
  init row (was `-13px`, too close to the row).
- **Number-flow reel bug.** The reels are `position:fixed` at each cell's coordinates, so cells scrolled
  *below the fold* spawned reels that floated over the active panel and everything below. `animateInitRoll`
  now skips cells outside the visible order-pane bounds (their values still commit) — reels only render over
  visible cells.

## Batch 114 — Init-card interaction (1/n): active-row caret
- Active row now shows a **faction-coloured caret (▶) in the left margin**, next to the divider — making the
  current turn unmistakable on top of the faction tint (addresses "active highlight too subtle"). `.cbt-row`
  is now `position:relative`; the caret is a `::before` using the row's faction `--sel-accent`.
- Locked design decisions for the rest of this batch (from mockup + AskUserQuestion): **active = caret** (this);
  **selected (multi-select) = accent ring + lift** (the standardized selected-card look). Still to build:
  click-to-select / hold-to-drag / shift-cmd multi-select, the multi-select popover (status / effect-all /
  damage-all), collapsing the active combatant to one row when a card is selected, and reactions tracking.

## Batch 113 — Fixes: auto-roll discoverability, hourglass orientation, collapsible combat notes
- **Auto-roll wasn't visible.** The feature was gated (off by default, labelled "Initiative", and the
  dimmed-average/d20 only appeared on a *fresh* combat). Fixes: the setting is relabelled **"Auto-roll
  initiative" (On / Off)**; the **d20 ghost button** (now `--dim`, per request) shows in the round bar
  **whenever auto-roll is off** — not only when combatants are unrolled — and rolls/re-rolls *every* group
  with the number-flow animation, so it works on an already-running combat too.
- **Hourglass orientation** in the effect-timing toggle was inverted: added a 180° base rotation so "turn
  start" shows the filled half up and "end turn" flips it down.
- **Combat notes collapse.** Encounter notes in the combat header now clamp to **2 rows** with a more/less
  toggle (shown only when the text actually overflows). `.ct-notes.clamped` + an overflow check.

## Batch 112 — Initiative (2/2): auto-roll toggle + number-flow manual roll
- **Auto-roll on/off** is the existing `combat.initMode` (Roll vs Average) setting. When **off** (Average),
  combatants start with their **dimmed average** initiative shown as a dashed placeholder (`initRolled:false`
  via `autoRollOn()`) — it still counts for sorting, and typing a value commits it. The "Rolling initiative…"
  flourish is suppressed in this mode (nothing was auto-rolled).
- **Round-bar d20.** When auto-roll is off and combatants are still unrolled, a **d20 button appears before
  the filter-tools icon**. Clicking it rolls actual dice (`rollInit`, grouped) for the unrolled combatants
  and plays a **number-flow** animation: a vertical digit reel (`nfReelHTML`/`animateInitRoll`) overlays each
  init cell and scrolls to the rolled value over ~1.35s, then the values commit and the order re-sorts.
  Hand-rolled CSS reel (`.nf-roll`/`.nf-col`), no library — stays no-build.

## Batch 111 — Effect-popover fixes: alarm toggle, effect-name combo, stray tools dot
- **The timing row no longer shows by default / the alarm now works.** `.cond-when{display:flex}` was
  overriding the `[hidden]` attribute, so the "ends at …" row was always visible and the alarm-clock toggle
  appeared dead. Added `.cond-when[hidden]{display:none}` — the row is hidden until the alarm is clicked.
- **Effect-name field → custom combo dropdown.** Replaced the native `<datalist>` on the effect-name input
  with `attachCombo` (the same type-ahead suggestion dropdown the forge name fields use), so both dropdowns
  in the popover are now the app's custom style.
- **Stray notification dot on the round-bar tools button.** It lit whenever `view.group` was set — and
  group-by-status is now the default, so it was always on. It now flags only a view that *differs* from the
  default (non-status group, non-init sort, or any filter).

## Batch 110 — Initiative (1/2): group-by-status default + "rolling initiative" flourish
- **Group by status is now the default** combat view (`combatView` default `group:"status"` instead of a flat
  list) — existing combats keep their chosen view; new ones group on load.
- **Fake "calculating" animation on Start.** Freshly starting combat shows a brief (1.2s) overlay over the
  order — a spinning accent d20 + "Rolling initiative…" — then reveals the rolled order, so it's clear
  initiative was just rolled (the roll itself still happens in `startCombat`; this is presentational).
  `combatRolling` transient flag + `.combat-roll-overlay` (croSpin/croFade).

## Batch 109 — Effects (4/n): whose-turn picker → custom dropdown
- Replaced the native `<select>` in the effect-timing row with a **custom dropdown** matching the app's
  others (the forge recharge/freq picker style): a trigger button (current creature, dimmed while it still
  means "self") + an inline `.popitem` list with the standard popover surface. Built inline rather than via
  `showPopover` because that's single-instance and would have closed the parent add-effect popover.

## Batch 108 — Effects (3/n): alarm-clock timing control (ends at start/end of whose turn)
- The add-effect popover gains a FA-free **alarm-clock** toggle next to the rounds field. Clicking it reveals
  a timing row: **"ends at [⧗ turn start | end turn] of [whose turn ▾]"**. The hourglass is a ghost toggle —
  clicking it flips the filled half (180° ease-in-out) with a little scale pop and swaps the label
  start↔end; the name selector defaults (dimmed) to the current creature.
- **Model (per the design call): rounds = how many, clock = when.** An effect lasts N rounds (blank = until
  removed) and ticks at the chosen moment. New per-effect fields `endWhen` ("start"|"end", default start) and
  `endWho` (a combatant id, default = the effect's own owner). `tickConditions(cb, turnIt, edge)` now scans
  every combatant and decrements effects that end on `turnIt`'s turn at that edge; `combatAdvance` fires an
  "end" tick for the turn it leaves and a "start" tick for the new turn. Default (self/start) reproduces the
  old behaviour. Verified: a self/1-round effect ends at the owner's next turn start, and a
  "1 round, end of Goblin 1's turn" effect ends when Goblin 1's turn ends.

## Batch 107 — Effects (2/n): active-panel layout — effect chip below title, full-width stat boxes
- Reordered the combat active panel: the **"+ effect" chip now sits directly below the title**, and the
  **AC/ATK/DC/save/HP boxes occupy the row full-width** (each `flex:1`, min 64px, wrapping on narrow panes)
  instead of compact left-aligned pills. Verified with a PC (AC/HP) and a monster (AC/ATK/HP).

## Batch 106 — Effects (1/n): rename conditions→effects + keep semantic colour sets fixed
- **Accent-set fix (folded in).** The B105 local-accent remap was too broad: status chips and faction
  indicators (which are members of a *colour set*) wrongly adopted the card's local colour — the "active"
  status chip went purple on a purple adventure, the enemy faction stopped being reddish. Rule: where accent
  is one member of a semantic set, it must stay fixed. New `--brand-soft` token; `.enc-status.st-active`,
  `.fac.enemy`, the minion tag and the mini-chip "on" state now use `--brand`/`--brand-soft` (immune to the
  per-card `--accent` remap). Hovers/focus still follow the local colour as intended.
- **Conditions → "effects".** The combatant chips we add are now "effects" (an umbrella over conditions,
  concentration, spell effects — any are free-text; known D&D conditions still link to the library). Label-only
  rename (the internal `conditions[]` field is unchanged, so no data migration): the row/active-panel add
  buttons ("＋ effect" / "Add effect"), the add popover placeholder ("Effect…"), and the row-menu item.

## Batch 105 — Design-system pass (4/n): selected cards fully adopt their local colour
- Follow-up to the colour-aware selected state. On a selected/focused card the **entire** accent now follows
  the card's local colour — not just the border/tint but **hovers and focus rings** too (was still flashing
  the global orange). Done by remapping `--accent`/`--accent-soft`/`--accent-hover` to `--sel-accent` on the
  selected card.
- **Solid CTAs stay brand.** New `--brand` token (fixed orange); `.start-combat` uses it so the primary
  action keeps the brand colour even inside a purple/teal/etc. selected card.
- **Accent-tinted greyscale** (chosen over a darker bg / no-bg option): muted greys are mixed 15% toward the
  card's colour (`color-mix(--sel-accent 15%, light-grey)`) so they blend with the tint instead of clashing
  as cool grey-on-colour — and stay light enough to read on every ADV_COLOR (spot-checked red/teal/purple).

## Batch 104 — Bug fix: multi-type attack damage now rolls (e.g. "Fire or Lightning damage")
- The attack name only rolled the to-hit (no damage) when the damage line listed **multiple types joined by
  "or"/"and"** — e.g. the Eldritch Eddy's "Hit: 13 (3d6 + 3) Fire or Lightning damage". The dice→damage
  detector only allowed a single optional type word before "damage", so it missed the chain and never tagged
  the damage span. Broadened it to permit the same type/connector chain the damage-type colouriser already
  uses (a lone unknown type word still works). Verified: the name now carries `data-dmg`, so it rolls to-hit
  + damage. (Pairs with the B103 CON-last ability tie-break.)

## Batch 103 — Bug fixes: bestiary selection across tabs + attack-ability tie-break (CON last)
- **Bestiary multi-select no longer persists across tabs.** The batch action bar (`#libBatchBar`) is
  appended to `document.body`, so it survived a view switch. `switchView` now clears `libSel` (and the bar)
  whenever you leave the Bestiary.
- **Attack ability inference: CON is now lowest priority in a tie.** When several abilities share the same
  to-hit bonus, `inferAbil` still prefers the spellcasting ability, then ABILS order — but always pushes
  CON last (a creature almost never attacks with CON, so it's the least likely correct guess).

## Batch 102 — Design-system pass (3/n): colour-aware selected state + muted-text legibility
- **Selected state now follows the card's own colour.** A coloured card (an adventure, a faction-tagged
  init row) tints its selected background AND border with its local colour instead of the global accent —
  a purple adventure selects purple, a blue ally selects blue, etc. Mechanism: `--sel-accent` (defaults to
  `--accent`) is overridden inline per card — `aiStyle` sets it from `a.color`, the adventure detail body
  cascades it to its encounter cards, and the combat faction classes set it. The selected rules reference
  `--sel-accent` directly (composing a derived token at `:root` baked in the root accent and never picked
  up the per-card override).
- **Fixed the grey-text clash on tinted cards.** Cool muted greys muddied against the (often warm) tint;
  selected/focused/active cards now lift `--dim`/`--faint` to brighter neutrals, which cascades to all their
  muted text (190 usages) automatically.
- Combat active row: was a flat white lift; now a faction-coloured tint + inset ring (the richer
  active-vs-selected treatment + edge marker stays in the init-card batch).

## Batch 101 — Design-system pass (2/n): radius scale + structural-surface tokens
- Added a **radius token scale** — `--r-sm:5px / --r:7px (default control) / --r-lg:9px / --r-xl:11px` — and
  applied it to the component *families* users compare side-by-side, leaving deep-nested micro-radii alone
  (churning all ~200 radius values for 1–2px deltas was high-risk, low-value):
  - **Cards** → `--r-lg`: `.card`, `.enc`, `.scene`, `.cbt-row` (init card 8→9).
  - **Primary CTAs** → `--r`: `.btn`, `.fab` (8→7), `.start-combat` (9→7) now share one radius.
  - **Popups** → tokens + one shadow: `.menu`/`.popover` = `--r`; `.refpop` = `--r-lg` and its bespoke
    `0 14px 36px` shadow now uses the shared `--shadow-pop`; `.modal` = `--r-xl`.
  - **Small square chips** aligned to `--r-sm`: `.tag` (4→5), `.ctrl-chip` (6→5). Rounded `.pill`/`.chip`
    keep their pill shape (semantic).
- Left intentionally untouched (diminishing returns / regression risk): nested control micro-radii, and
  chip/pill *font-size* hierarchy (10px status vs 11.5px interactive is deliberate). The note/save button
  size mismatch is a separate polish item (B6).

## Batch 100 — Design-system pass (1/n): unified "selected" card state
- Audited the recurring UI primitives; first fix lands the headline discrepancy. The "selected/active" card
  state was rendered four different ways (Bestiary = 2px hard outline, Encounter = soft accent *glow* + tint,
  Adventure = accent border + lighter bg, Combat row = white lift). Standardized Bestiary/Encounter/Adventure
  on **one glow-free treatment** (per the design call): 1px accent border + faint accent tint, no box-shadow.
  New tokens `--sel-border` / `--sel-bg` (`color-mix(accent 7%, panel)`) drive `.card.selected`,
  `.adv-list .ai.sel`, and `.enc.focused`. Also softened the collapsed mini-rail swatch ring (double → single).
- Still pending in this design-system effort (next sub-batches): a radius scale (components hardcode
  4/5/6/7/8/9/11/20px), chip/pill/tag alignment (5 overlapping types, inconsistent radius/size), primary-CTA
  button unification (`.btn`/`.fab`/`.start-combat` differ), and a shared popup-surface base (`.refpop`/`.modal`
  diverge from the consistent `.menu`/`.popover`).

## Batch 99 — Fix botched combat-tracker→main merge (empty Combat section)
- The `Merge branch 'combat-tracker'` commit on `main` hit the old B80-revert and silently **dropped the
  Combat view wiring** while keeping the combat *functions* — so the Combat tab opened an empty section.
- Restored the three dropped bits from the verified union (`combat-tracker` @ d2fc8b3): the `#view-combat`
  section (index.html), the `if(v==="combat")renderCombat()` case in `switchView` (bestiary.js), and
  `combat:"Combat"` in `VIEW_LABELS` (engine.js). `main` now matches the complete union. Fix-forward
  commit (no force-push); verified the initiative tracker renders end-to-end in the preview.

## Batch 98 — Branch reconcile: fold main's B82–B86 features onto combat-tracker
- **Brought `main`'s isolated feature commits onto the `combat-tracker` branch** so the branch is now the
  complete union of both lines (cherry-pick of B82–B86, skipping the B80 revert). The branch keeps all the
  Combat Tracker work + `seed.js`; it now ALSO has, from `main`:
  - **5etools `.zip` import** (B85–86): `unzipJsonFiles` (parsers.js, native `DecompressionStream`), zip
    staging + Pending-import tray (app.js/bestiary.js), `#zipIn` (index.html).
  - **Encounter XP-bar threshold markers** (B83–84): `budMarksHTML` circles — kept the branch's newer
    `.budget-top` structure and neutral `--budfill` fill (B91/B92 decisions) and added the markers on top.
  - **Bestiary/Forge new-creature menu icons** (B83): file-import glyph for "From chassis", clipboard for
    "Paste 5etools".
  - B82 (chip-field fix) was already effectively present on the branch (empty cherry-pick).
- **Reconcile fixups:** restored the four branch-only `index.html` additions that the icon-conflict
  resolution had to merge around — the Combat nav button, `#advScrim`, the `#view-combat` section, and
  `seed.js` in the script loader. `main` is left untouched (promote it to the union when deploying).

## Batch 97 — Combat Tracker v2 (CT9 fixes): resize regression, active panel, popovers, load popup
- **Fixed the two-pane resize regression.** Below ~1080px the view now stacks cleanly (it was clipping
  the statblock off the right and squeezing the layout in the 980–1080px band); the active column shrinks
  rather than overflowing, and the divider stays draggable.
- **Active panel.** The faction accent is now a **full-bleed colour bar on top** (like the adventure
  page — pinned above the scroll). The meta is more compact (name + faction on one line; AC, attack
  bonus, **save DC**, best save, and HP all as chips on one line). The note moved to a bottom block with
  a **pen icon**, and the panel keeps Forge-style bottom space so it never tucks under the FAB.
- **Popovers.** The condition adder is one row — a dark dropdown-styled field with an **hourglass** +
  small rounds input. The note editor's field and button are the same width. The round counter is now
  **clickable to set the round**. The combat tools button lost its border.
- **Load encounter popup.** Adventures **collapse** (chevron before the title) and gained a right-aligned
  **⋯ menu** to add an encounter or scene (the inline +Encounter/+Scene buttons are gone). Scene rows
  highlight as a whole on hover, and the **Active** status tag is now visually distinct from Draft.

## Batch 96 — Combat Tracker v2 (CT9 follow-up): header, round bar, active-panel polish
- **Header restructure.** The scene name is now a small label above the **encounter name** (the large
  title). A chevron next to the encounter opens a **dropdown of the scene's encounters** to switch
  between them (only shown when the encounter is in a scene with more than one). The encounter switcher
  on the right is replaced by a **Load encounter** button that opens the picker.
- **Round bar.** Now spans the **full width** above both panes (and stays above the initiative when the
  layout stacks). The turn arrows are borderless and the "turn" label is gone; **group / sort / filter /
  re-roll** moved into a **tools menu** at its right end. A full-width divider under it separates the
  header, and that divider plus the list/preview divider now run edge-to-edge.
- **Active panel.** The combatant's key numbers — **AC, attack bonus, and best save** — are surfaced as
  prominent chips. The note moved to a full-width **＋ Add note** block at the bottom (Forge "Add
  section" style). The lateral faction line became a **horizontal accent on top**.

## Batch 95 — Combat Tracker v2 (CT9): layout + header overhaul
- **Resizable two-pane combat view.** The initiative list and the active-combatant panel are now a
  Forge-style split with a **draggable divider** (drag to resize, double-click to reset, persists);
  each pane scrolls on its own. On narrow screens the split stacks with a horizontal handle.
- **Minimal header.** One slim context line — adventure-colour accent, the scene · encounter title
  (click it to load another), the difficulty pill, and a small same-scene **‹ n/m ›** nav. The
  **round counter + turn controls moved onto the top of the initiative list**, where the turns happen.
- **No more box-in-a-box.** The active combatant is one flat panel — its meta (name / HP / conditions /
  note) on top, the statblock flowing directly below, instead of a card nested inside a card.
- **Initiative cards reflow.** When the list pane is narrow, a card keeps its name + AC on one row and
  drops the HP tracker to a second row, so names no longer get squeezed and wrapped.

## Batch 94 — Combat Tracker v2 (CT8): initiative filtering / sorting / grouping + manual drag-sort
- **Combat toolbar.** Above the initiative list: **Group** (none / status / faction / statblock),
  **Sort** (initiative / manual / name / status / HP remaining), and **Filter** (by status and faction).
  Grouping/sorting/filtering are **view-only** — turns always advance in initiative order regardless of
  how you've arranged the list to scan it.
- **Drag to reorder.** Grab a card's handle to set a manual turn order (e.g. to resolve a tie or a held
  action). If that pulls a card out of its initiative slot, a soft **"N out of order"** warning appears;
  click it to **restore initiative order**. (A Move up / Move down fallback lives in each card's ⋯ menu.)
- **Re-roll initiative** for everyone from the toolbar, and a new Settings option to start combat with
  **rolled (1d20 + mod)** or **average (10 + mod)** initiative.

## Batch 93 — Combat Tracker v2 (CT7d): load-popup polish, filter-chip alignment, init-row tidy
- **Load encounter popup.** Dropped the folder icon and the "● loaded" tag (the running encounter keeps
  its highlight). A scene's **chevron** now toggles its encounters while clicking the **rest of the row
  loads the scene** (its running encounter, else its first). Empty scenes **and** empty encounters show a
  dimmed "empty" caption next to their name.
- **Active-filter chips.** Across every filterable list the chips now sit in a single row **right-aligned
  in line with the filter icons**; when they overflow they scroll horizontally and fade out behind a
  gradient, with clearer spacing below the row. In the Load / Add-combatant popups the icons and chips
  share one row.
- **Initiative card.** The active combatant's highlight is a softer neutral lift (no longer the accent
  colour), and untracked HP shows blank instead of an em-dash.
- *(Fix)* Seed bestiary skills used the wrong shape, which threw when a seed creature was the active
  combatant; corrected to the `[name, prof]` form.

## Batch 92 — Feedback follow-ups: drawer shadow + XP-bar fill colour
- **Narrow-width adventure drawer** no longer casts a shadow onto the detail when it's parked off-canvas
  (closed) — the drop shadow now appears only while the drawer is open.
- **XP budget bar fill** is now a neutral bluish slate from the background family (lighter than the bar
  track) instead of the bronze, so it reads as a calm fill rather than a coloured one.

## Batch 91 — Feedback round: local seed data, empty-bestiary picker, XP-bar colours, adventure header
- **Pre-filled local test data.** On `localhost` only, the app now seeds a realistic sandbox — a bestiary
  (goblin, dire wolf, bandit captain, ogre, cult fanatic, young green dragon), two adventures with party
  rosters, scenes, and encounters wired to those creatures — so the app and the Combat Tracker can be
  exercised without touching real data. It coexists with any real data, never writes to the cloud bin
  (`seed.js` sets a flag that makes `jbinSet` a no-op), and is skipped on the live site and in tests.
- **Add combatant with an empty bestiary.** The "Add combatant" picker no longer errors when you have no
  saved creatures — it opens with an empty-bestiary hint so you can load a chassis, Forge one, or add a
  Quick / Event combatant straight from the footer.
- **XP budget bar restyled.** The spent bar is now a single subtle bronze that blends with the palette
  (risk still reads from the difficulty pill), and the draggable target marker turns **blue with a focus
  ring while you drag it** so it no longer reads as the "high/over" threshold colour.
- **Adventure header polish.** The adventure-colour band now spans the **full width** of the column (the
  scrollbar starts below it, not beside it), and the **collapse chevron moved to after the title**.
- **Narrow-width adventure drawer.** On small screens the adventure list is now an off-canvas drawer: the
  button by the title shows the **Adventures glyph** and slides the list in as an overlay over the detail
  (tap a scrim or an adventure to close), instead of swapping the whole view.

## Batch 90 — Combat Tracker v2 (CT7b finish): add combatants from initiative + live-update
- **Add combatants from the initiative tracker** — a "＋ Add combatant" button at the bottom of the
  order opens the usual picker (Bestiary / Quick / Chassis / Forge / Event) and injects the new
  combatant straight into the running order (rolling its initiative + HP).
- **Live-update.** Adding a combatant or party member to a running encounter (from anywhere) now flows
  into the live initiative order automatically, re-sorted while keeping whose turn it is.

## Batch 89 — Combat Tracker v2 (CT7b core): initiative card + HP tracker redesign
- **Rebalanced combat view** — the initiative list is narrower and the active statblock/trackers panel
  wider, separated by a Forge-style divider.
- **Redesigned initiative card.** Initiative is an editable field (changing it re-sorts the order); a
  status control cycles **active / waiting / dead** (dead and downed combatants are skipped on advance,
  waiting is dimmed); the old mystery 0± field is gone.
- **New HP tracker.** A compact ratio-coloured bar (with a temp-HP segment), an **add-dmg** field
  (Enter applies; negative heals; temp HP absorbs first), an editable **current**, and the **max**.
  Temp HP and a signed **max-HP adjust** (e.g. Aid +5 raises max and current) live in the ⋯ menu.
- **Settings: Track party HP** toggle — turn it off to hide the HP tracker for player characters.

## Batch 88 — Combat Tracker v2 (CT7c, branch): load popup standardised + polish
- **Load popup uses the standard toolbar** (like Add combatant): search, **sort** (name / creation),
  **group** (None / Status / Adventure — disable grouping is "None"), and **filter** by status + adventure,
  with active-filter chips.
- **Click a status chip** in the load popup to change that encounter's status inline.
- **Scenes** show a small dimmed **folder icon** and a dimmed **"empty"** caption when they have no
  encounters.
- **Add-combatant** footer buttons no longer wrap their text.
- **Focused encounter block** in Adventures uses a softer highlight (less accent).

## Batch 87 — Combat Tracker v2 (CT7 fixes): header + load popup + footer
- **Combat header:** dropped the back button and "Load other"; the **adventure/scene title is now the
  control** — click it to open the load popup. Title aligns left.
- **Reworked load popup:** a **Group** (Adventure / Status) and **Status** filter; scenes are
  collapsible folders (chevron, collapsed by default — the running encounter's scene auto-expands) and
  read distinctly from encounter rows; the **currently-loaded** encounter/scene is highlighted; the
  "× grp" text is gone; per-adventure **＋ Encounter / ＋ Scene** buttons let you create on the spot.
- **Add-combatant footer:** the four add buttons now stretch to fill the row evenly.
- **Softer active-row highlight** in the initiative list (less accent glow).

## Batch 86 — Combat Tracker v2 (CT7): tab chrome + add-combatant polish
- **Cleaner combat-tab header.** The breadcrumb is just "Combat" now (it's a top-level tab). The title
  block shows the **adventure over the scene** with a vertical adventure-colour bar; the encounter
  selector (‹ › ghost chevrons) sits in line with it. The current encounter, its **budget rating**, and
  its notes show in a strip below, with the **round counter + turn chevrons** right-aligned.
- **Start/End combat moved to a tab FAB** (bottom-right). When an encounter hasn't started, the header
  expands full width and the FAB reads "Start combat".
- **Encounters get an Active status** while a combat is running (and again if you restart a completed one).
- **Encounter card (Adventures):** the start-combat button now shows a "Start combat" label (collapsing
  to just the sword icon when the card is narrow) in solid orange; the budget rating moved onto the
  budget-bar line, right-aligned.
- **Add-combatant popup:** taller minimum height so cards don't crowd the footer; footer reordered to
  Forge new · From chassis · Event · Quick · Done, with icons on Forge and From chassis and a dimmed
  "CR only" note on Quick; at narrow widths the footer wraps cleanly into three full-width rows. The
  "load chassis" menu items (Forge toolbar + Bestiary) now use a clipboard icon.

## Batch 85 — Combat Tracker v2 (CT5 + CT6): standalone tab, load popup, launch UX
- **Combat is now its own sidebar tab** (below Adventures), always reachable. Its empty state has a
  **Load encounter** popup that lets you pick any adventure → scene → encounter (shows status, group
  count, and whether a combat is already running).
- **Scene as header with prev/next.** When the loaded encounter belongs to a scene, the scene is the
  title and a strip shows the current encounter with ‹ Prev / Next › to move between the scene's
  encounters. Ending a combat keeps you on the tab so you can roll straight into the next fight.
- **Encounter status.** Each encounter now carries a lifecycle status — Draft → Ready → Completed
  (auto-set when you end its combat) — with Archived folded into the same status chip (and still the
  operative archive flag). Click the chip on the encounter card to change it.
- **Sword button starts combat.** The little "＋" next to Add combatant is replaced by a rounded accent
  **⚔ button** that starts (or resumes) combat for that encounter; the old "Run combat" menu item is gone.
- **One "Add combatant" popup.** The extra add options (Quick / From chassis / Forge new / Event) now
  live in the picker's footer instead of a separate menu.
- **Party is green, allies are blue** across the tracker, the active card, the encounter combatant rows,
  and the party roster.

## Batch 84 — Combat Tracker part 3 (CT4): active statblock, click-to-roll, resources
- **The active combatant's full statblock** now renders right in the combat view, colour-coded just like
  the Forge preview.
- **Click-to-roll, tagged to the combatant.** Click an attack, save DC, or any dice in that statblock to
  roll it — and the roll log attributes it to the combatant by name (e.g. "Archmage 2"), not the Forge's
  working creature.
- **Auto-detected resource trackers.** Starting combat scans each monster for "(N/Day)" features,
  recharge abilities, and the legendary-action pool, and turns them into clickable pips you spend and
  restore. Legendary-action pools refresh at the start of that creature's turn.

## Batch 83 — Combat Tracker part 2 (CT3): conditions, notes, skip-defeated, ungroup
- **Condition chips per combatant.** Add conditions from your conditions library (autocomplete) with an
  optional duration in rounds. Known conditions show their definition on hover, and timed conditions tick
  down — and drop off — at the start of that combatant's turn.
- **Per-combatant notes.** Jot a note on any combatant (e.g. "Concentrating on Haste"); it shows under
  their name in the order and on the active card.
- **Defeated combatants are skipped.** Advancing turns steps over anyone at 0 HP (in either direction),
  so you no longer click past downed creatures.
- **Ungroup.** A stacked group of identical monsters can be split so each rolls its own initiative.
- **Per-row ⋯ menu** for add note / add condition / ungroup / remove from combat.

## Batch 82 — Chip-field scrolling, really fixed (form-column cap + scroll fade)
- **Condition-immunity / gear chip fields now actually scroll.** The real cause wasn't the field — the
  Forge form column was sized to its widest child (a bare `1fr` = `minmax(auto,1fr)`), so the nowrap chip
  row inflated the whole column past the viewport and `.forge`'s `overflow:hidden` just clipped it. The
  column is now capped (`minmax(0,1fr)` + `min-width:0` down the chain), so the field is bounded and its
  chips scroll horizontally inside it.
- **Scroll-fade hint.** When chips overflow, the hidden edge fades out (right, left, or both depending on
  scroll position) so it's clearly scrollable.
- *(Combat Tracker (Batch 80) was moved off `main` onto the `combat-tracker` branch — the live site no
  longer carries the in-progress tracker; CT3/CT4 continue on that branch.)*

## Batch 81 — Loading screen, ability-tinted skills/tools, adventure header, fixes
- **Boot loading screen.** A tumbling amber d20 + wordmark covers the brief startup, so reloading no
  longer flashes the Forge before jumping to your last tab.
- **Skill & tool rows are ability-tinted.** Each skill/tool name box now borders in its tied ability's
  colour (Acrobatics = DEX blue, Arcana = INT purple, …); text stays white.
- **Adventure header redo.** The colour dot by the title is replaced with a thin adventure-coloured
  bar across the top of the column (click it to recolour). A chevron beside the title collapses the
  whole adventure info block (party, budget, notes, roster) so you can focus on the scene list.
- **Move submenu no longer clipped.** When a card's Move submenu would open under the sidebar, it now
  flips open to the right instead.
- **Chip fields really stay put now.** Condition-immunity and gear chip fields keep a fixed size and
  scroll their chips horizontally within the box (the field no longer stretches to fit them).
- **Collapsed New-adventure button** has its “+” properly centred.

## Batch 80 — Combat Tracker, part 1 (party roster + live initiative tracker)
- **Party roster.** Each adventure has a collapsible Party section: add player characters with
  AC / HP / initiative modifier plus free-form custom fields (passive perception, save bonuses, …).
- **Run combat.** An encounter's ⋯ menu has **Run combat** (▶). It snapshots the encounter's
  combatants and the party, expands `count:N` monsters into N HP-separate rows (identical monsters
  share one rolled initiative), rolls everyone's initiative (DEX tie-break), and opens a dedicated
  full-screen **Combat** view.
- **Live tracker.** Initiative order with the active combatant highlighted, round counter, Next/Prev
  turn, per-combatant HP with quick damage/heal (and a defeated state at 0 HP), AC, and a panel for the
  active combatant. The combat is resumable and survives a reload; **End combat** clears it.
- **Combat setting.** A new Settings → Combat card: roll monster HP from Hit Dice or use average HP, and
  toggle DEX initiative tie-breaking.
- *(Coming next: condition chips, status/comment, and the active creature's full statblock with
  click-to-roll tagged to that combatant.)*

## Batch 79 — Ability colours, cleaner roll labels, back-button fix, menu polish
- **Ability boxes are colour-coded.** Each ability/save box in the Forge is tinted with its ability
  colour (STR red, DEX blue, CON orange, INT purple, WIS green, CHA pink), matching the statblock.
- **Cleaner roll-log labels.** Rolling an attack/feature whose name carries a usage note —
  "(Recharge 5–6)", "(3/Day)", "(Costs 2 Actions)" — now logs just the action name, without the note.
- **Back-to-adventures button works.** At narrow widths the ‹ button next to an adventure's title now
  reliably returns to the adventure-cards column (it stopped working because the list immediately
  re-opened the last adventure).
- **Menus sit above the sidebar.** Dropdown menus no longer slip behind the floating sidebar drawer.
- **Smarter Move options.** Move is disabled entirely when an item is the only one in its list, and the
  individual options grey out when they'd do nothing (Move-to-top/up while already first, etc.) — across
  adventures, scenes, and encounters.

## Batch 78 — Pins, reordering, reload memory, recharge split, chip-field scroll
- **Pin anything to the top.** Adventures, scenes, encounters, and bestiary cards all get a Pin/Unpin
  option in their menu (Unpin replaces Pin once pinned). Pinned adventures/scenes float to the top of
  their list; a pinned encounter rises to the top of its scene (or the ungrouped list); pinned bestiary
  cards **ignore the active filters** — they always show, dimmed when they'd otherwise be filtered away.
- **Reorder adventures.** Adventure cards are now draggable, and their menu (plus the right-click menu)
  has a Move → top/up/down/bottom submenu — matching encounters. Scenes gained the same Move submenu.
- **Reload remembers where you were.** A reload restores the stat block you were editing in the Forge
  and the tab you were on (Forge / Bestiary / Adventures), instead of always dropping you back on Forge
  with a blank creature.
- **Recharge split into two rolls.** For a recharge action that deals damage, clicking the entry NAME
  still rolls recharge + damage as a group, but the inner "(Recharge 5–6)" tag now rolls the recharge
  die ONLY — so you can check the recharge without also rolling damage.
- **Card menus organised.** Bestiary, adventure, scene, and encounter menus are grouped into logical
  sections with separators.
- **Chip fields scroll, not grow.** Condition-immunity / gear chip fields are a single fixed-height row
  that scrolls horizontally (cropped at the right edge) instead of wrapping and growing the field. The
  "add condition…" / "add gear…" prompt disappears once a chip is added.

## Batch 77 — Rule-finder coverage, recharge grouping, notification polish
- **Rule finder finds more.** Statblock abbreviations now resolve to their glossary rules (AC → Armor
  Class, HP → Hit Points, CR → Challenge Rating, XP → Experience Points), and section headers (Actions,
  Bonus Actions, Reactions…) are scanned. (Terms whose rule isn't in the loaded set — abilities, damage
  types, sizes, PB — still don't highlight; no rules are fabricated.)
- **Recharge actions roll as a group.** Clicking the name of a recharge action that deals damage now
  rolls the recharge die *and* the damage together — grouped in the roll log, with one combined
  notification.
- **Roll notifications highlight the result.** The rolled number is emphasised in the toast (e.g.
  "Bite: **15** Piercing damage").
- **Consistent damage capitalization.** The damage-type hover on a roll-log DMG tag (and the
  notification text) now reads "Piercing damage", not "piercing damage".
- **Scrollable chip fields.** Condition-immunity and other chip fields top-align and scroll instead of
  clipping the top row when full.
- **Readable dice-notation help.** The dice-notation tooltip tokens use the same JetBrains Mono chip
  style as the bracket shortcuts.
- **Statblock skeleton.** A shimmer placeholder fills the statblock preview on startup so the box
  doesn't collapse before the first render.

## Batch 76 — Refactor phase 2f: decompose openRollPopover
- Extracted the roll popover's 3-branch lead control into a pure `rollPopLeadHTML`. Verified the
  popover renders identically for normal (mode tag) / damage (CRIT chip) / spell-scale (upcast stepper)
  variants. **Completes phase 2 — all 5 render builders decomposed.**

## Batch 75 — Refactor phase 2e: decompose colorizeStatblock
- `colorizeStatblock` → coordinator + `colorizeAttackLabels` / `colorizeAttackNames` /
  `colorizeRechargeTags`. Verified byte-identical colorized statblock for an archmage and a recharge
  dragon; click-to-roll on attack names confirmed.

## Batch 74 — Refactor phase 2c: decompose entryHTML
- `entryHTML` → dispatcher over `entryReactionHTML` / `entryVillainHTML` / `entrySpellHTML` /
  `entryAttackHTML` / `entryTextHTML`. Verified byte-identical for every entry kind.

## Batch 73 — Refactor phase 2b: decompose renderRollLog
- `renderRollLog` → pure `rollLogHTML()` + `bindRollLog()` + coordinator. Verified byte-identical
  roll-log HTML against a fixed entry set (single/grouped/damage/adv/crit).

## Batch 72 — Refactor phase 2a: decompose renderPreview
- The 8 KB `renderPreview` is now a thin coordinator over named pure builders — `sbHeaderHTML`,
  `sbAbilityTableHTML`, `sbMetaHTML`, `sbEntryBlockHTML`, `sbEntriesHTML`.
- Behaviour-preserving: the rendered statblock HTML was verified byte-identical to the old output for
  an archmage, a blank creature, and a goblin (traits / attack / legendary / condition immunities).
- No user-facing changes. (Remaining render-builders to decompose: `renderRollLog`, `entryHTML`,
  `colorizeStatblock`, `openRollPopover`.)

## Batch 71 — Refactor phase 1: split app.js by concern
- `app.js` (3,334 lines) split into six classic scripts loaded in order — `core.js`, `forge.js`,
  `engine.js`, `bestiary.js`, `adventures.js`, `app.js` — still one shared global scope, still no build.
  Pure code-move: the concatenation is byte-identical to the old `app.js`, so behaviour is unchanged.
- The jsdom smoke test earned its keep immediately: it caught the one cross-script hazard (the
  `#forgePaste` handler referenced `openImportModal`, which now lives in a later-loading file — fixed by
  deferring the lookup to click time). The tooling's file lists were updated to match.
- No user-facing changes.

## Batch 70 — Dev tooling (no-build safety net)
- Added a dev-only tooling layer — the shipped site stays no-build. `npm run verify` runs `node --check`,
  ESLint, and a jsdom smoke test. See `DEVELOPMENT.md`.
- **ESLint** (`eslint.config.js`): self-maintaining cross-file globals (parses each shared script's
  top-level declarations) so `no-undef` catches real typos without false positives. Baseline: 0 errors.
- **Smoke test** (`test/`): boots the real `index.html` + all three scripts in jsdom and asserts init
  throws nothing — the net for the "top-level binding to a removed node white-screens the page" failure.
  Plus pure-function maths checks (mod/sgn/clamp/pbForCR/rollFormula/exprAvg/bracketize).
- **Pre-commit hook** (`.githooks/pre-commit`, enable with `git config core.hooksPath .githooks`) runs
  the full verify before a commit can land.

## Batch 69 — Rule-finder consistency, popover toggle, ⌘S
- **Rule finder now scans the whole statblock consistently.** Header stats (Initiative, Speed) and the
  value lines (skills, senses, condition immunities, languages) are highlighted whether or not the
  creature has traits/actions. Previously, any creature *with* body blocks silently skipped the header
  and value lines (so "Initiative" highlighted on a blank creature but not on a full one).
- **No more yellow attack-label text in the rule finder.** Italic labels like "Melee / Ranged" are
  dimmed with the rest of the prose; only actual rule terms stay amber.
- **New setting — "Spell & condition popovers"** (Settings → Definition popovers). Turn off the
  hover/click definition cards for spells and conditions while keeping everything else. The rule finder
  still shows definitions while it's active.
- **⌘/Ctrl-S saves the Forge** to the Bestiary (instead of the browser's Save-Page dialog) when the
  Forge is open.
- **Self-references in popovers are now plain text.** A definition that mentions its own name (e.g. the
  Charmed card saying "charmed") shows it with no colour and no link — matching the rule-finder
  behaviour — so a card never points back at itself.
- **Roll-log collapse uses the standard chevron** instead of a tiny unicode triangle.

## Batch 68 — Rule-finder & popover fixes
- **No false unsaved-edits prompt** when loading a chassis from the picker. The picker now checks
  `forgeUnsaved()` (which ignores an unedited chassis/preset) instead of the raw `monsterDirty()`, so
  swapping bases without having made edits no longer asks to confirm.
- **Esc exits the rule finder.** If a definition popover is open, the first Esc closes that popover and
  a second Esc exits the finder.
- **No dead amber highlights.** A rule-finder term is only highlighted if it actually resolves to a
  rule/condition — words that matched loosely but had no definition (e.g. stray "Melee"/"Hit") are no
  longer painted yellow with an empty hover.
- **`(level N version)` upcast default fixed.** The cast level beside a spell name (e.g. "Lightning
  Bolt (level 7 version)") now seeds the roll popover's level stepper. It was looking at the wrong DOM
  node (the tail renders next to the `.cc-spell` wrapper, not the link itself).
- **Rule-finder popovers never link to themselves** — like conditions, a definition's own name inside
  its popover is shown as plain text (no amber link that reopens the same card).
- **Ghost dismiss icon.** Every definition popover (spell / condition / rule) now has a small, subtle
  ✕ in the top-right corner to close it.

## Batch 67 — Rule-finder depth, popover tables, damage abbreviations
- **Rule finder** now reads from more reference files — upload any of 5etools' `variantrule`, `action`,
  `sense`, or `skill` JSONs as a "Rules" library (conditions still work as before and also feed the
  finder). Matching is smarter: it catches plurals ("Attack Rolls", "saving throws") and lower-case
  phrasing for multi-word terms, while single words stay case-sensitive so "prone to" / "damage" don't
  false-fire. The rule-explanation popover is no longer dimmed and highlights terms inside itself.
- **Tables render in popovers** (e.g. Teleport's familiarity table) instead of pipe-separated text.
- **Damage tag** in the roll log shows the damage type abbreviated (Fire, Bludg., Light., Necr.,
  Pierc., Pois., Psych., Rad., Slash., Thun., …) in place of "DMG".
- **Upcast rolls** tag the cast level after the spell name in the log + notification, e.g.
  "Lightning Bolt • LV5".
- **Tools** are formatted like skills now — ability-coloured name pill + underlined modifier.
- The statblock's **Unnamed Creature** placeholder is muted instead of accent-coloured until you name it.

## Batch 66 — Rule finder, three roller chips, roll-notif checks & polish
- **Rule finder:** a new **?** button in the header (hover for what it does, click to start). It dims the
  statblock and highlights every rules-glossary term, condition, and already-linked spell in amber —
  hover any highlight for its definition (popovers highlight too). Rolls and other popovers pause while
  it's on; click the **✕** to exit. Upload a rules file (5etools `variantrules.json`) in Preset
  libraries as a new "Rules" library; without one, conditions and spells still highlight and a toast
  prompts you to add rules. Glossary/condition matching is case-sensitive and spells are limited to
  detected references, so ordinary words ("light", "shield") don't falsely light up.
- **Three roll-popover chips by context:** a d20 roll keeps the adv/dis chip; a **damage** roll shows a
  **CRIT** chip (off by default) that doubles the dice when enabled; a **spell** damage roll shows a
  level **stepper** (no dropdown) — blank means its base level, and if the spell was cast at a
  "(level N version)" the field defaults to N.
- **Check notifications** now name the ability: "Strength Check: 12", "Wisdom (Persuasion) Check: 14",
  "Intelligence (Jeweler's Kit) Check: 7".
- **Untitled items:** new adventures/scenes/encounters start blank with a placeholder (nothing to
  clear); the collapsed adventure shows an em dash instead of initials until you name it.
- **Settings:** a master toggle on the Notes-fields card flips all three at once.
- Loading a chassis/preset with no edits no longer prompts "unsaved edits" when you load another; the
  Save & New / Replace choices now read as primary vs. the quiet Back. The custom-roll popup now layers
  above a reference popover when opened from inside one.

## Batch 65 — Spell upcast roller, grit rule, notes toggles & polish
- **Spell upcast roller:** right- or Cmd/Ctrl-click a spell's damage dice in its popover to open a
  roller with a **spell-level field + dropdown** (in place of the adv/dis chip) that rescales the dice
  to the chosen slot level — e.g. Cone of Cold 8d8 → 11d8 at level 8. *(Re-parse your spell library to
  capture the scaling: Preset libraries → ⋯ → Re-parse.)*
- **Grit (minimum damage) rule:** a new Settings → Homebrew toggle so damage rolls deal at least their
  maximum possible non-crit value (every die's top face + modifiers); crits still roll and keep the
  higher result.
- **Natural roll notifications:** the roll toast now reads naturally and lingers longer — e.g.
  "Arcane Burst: 23 to hit, 25 force damage", "Strength Saving Throw: 16".
- **Re-parse:** shows a loading overlay while it works, and now warns when a library can't be
  re-parsed because its original upload predates raw-file storage (re-upload it once to fix).
- **Notes fields:** Settings toggles for whether new adventures / scenes / encounters get a notes
  field, plus an Add/Remove notes item in each ⋯ menu.
- **Collapsed adventures column:** each adventure is a 40×40 rounded colour square showing up to three
  name initials in a contrast-checked text colour; the add button is a centred "+".
- **Unsaved-edits chassis dialog:** three side-by-side choices — **Save & New** (save current edits to
  the Bestiary, then start the chassis), **Replace**, **Back** — and ":" instead of an em dash.
- **Mobile:** long-press an empty spot to open the custom roller (the touch equivalent of Cmd-click).
- New rolls auto-scroll the log to the newest entry; the textarea resize grip is themed for dark mode;
  the ⚒ icon is gone from the Homebrew tag; Export/Import JSON live only in Settings.

## Batch 64 — Spell scaling, smarter damage detection, drag-resize columns
- **"At higher levels" fix:** spell scaling like Cone of Cold now reads "increases by **1d8** per level"
  (the per-level increment), not the base 8d8. *(Re-parse your spell library to update existing data:
  Preset libraries → ⋯ → Re-parse libraries.)*
- **Smarter damage-type colouring:** a word like *fire* or *force* is only flagged as damage when it's
  actually in a damage context (followed by "damage", possibly via "fire, cold, or lightning damage").
  No more false hits on Prestidigitation's "Fire Play" or Shield's "magical force".
- **Stickier popovers:** spell/condition popovers wait longer before closing, so you can move onto them
  to roll their dice without them vanishing.
- **No self-references:** a popover no longer links a term to itself (e.g. the Invisible condition card
  no longer has an "Invisible" link).
- **Drag to resize the sidebar & adventures column:** instead of a button, drag the divider (like the
  forge preview splitter); it snaps to the icon / colour-card view once labels stop fitting, and a
  double-click restores the default width. Fixes the empty gutter when hiding an icon-collapsed sidebar
  via the burger.
- **Roll log:** a grouped roll whose entries all share one ability now shows a single colour bar
  spanning the whole group; the window keeps its dragged position when collapsed (with a new "Reset
  position" menu item once moved); crits drop the background gradient for a **yellow number with a few
  twinkling stars**.
- **Forge:** opening a creature to edit now expands all sections.
- Export / Import JSON removed from the sidebar (they live in Settings).

## Batch 63 — Roll-log alignment, popover stacking, collapsible sidebar & adventures
- **Roll-log alignment:** the ability-colour bar and the TYPE tag (ATK/DMG/CHK/SAVE) now sit at the
  exact same position whether a roll is shown on its own or inside a group, and the dice breakdown
  uses the same faint colour and size in both cases.
- **Adv/dis tag** now sits inline at the **start** of the dice breakdown and scrolls with it (no
  longer pinned at the end).
- **No scrollbar** over the roll log (it covered the rolls) — still scrolls, including by touch on
  mobile; the dice breakdown also scrolls without a visible bar.
- **Drag the roll-log window** by its header to place it anywhere on the page; collapsing or clearing
  it restores the default bottom-left spot.
- **Ability bar on damage rolls:** a damage roll now shows the same ability bar as the attack it came
  from. For prose attacks (e.g. the Archmage's *Arcane Burst*, +9) the ability is inferred from the
  to-hit bonus — so it correctly reads as INT.
- **DMG-tag hover** in the log shows the damage type again.
- **Popover from a popover:** a condition named inside a spell's popover now opens its own stacked
  popover instead of replacing the spell card.
- **Unified detection & colours in popovers:** spell/condition popovers use the same colour-coding and
  rollable detection as the statblock — conditions are the same violet, dice are rollable.
- **Roll-log statblock link fix:** hovering a source no longer shows a leftover card from another row.
- **Underlines match their text:** rollable features and reference links underline in their own text
  colour (white attack names, blue dice, violet conditions) instead of a fixed accent.
- **Collapsible sidebar:** a handle collapses the left rail to an icon-only strip (remembered across
  loads).
- **Collapsible adventures column:** a handle collapses the adventures list into square colour cards
  (right-click a card for Open / Colour / Duplicate / Archive / Delete).

## Batch 62 — Popover rolls, roll-log layout, ability bar
- **Roll from inside reference popovers:** spell/condition hover popovers are now colour-coded and
  their dice are clickable — e.g. roll Lightning Bolt's 8d6 straight from its popover.
- **Roll-log rows:** the dice breakdown is horizontally **scrollable** when long; the adv/dis tag
  stays **pinned** beside the type tag (doesn't scroll). The ability colour is now a **vertical bar**
  in a reserved right gutter (replacing the bg tint that wasn't reading), so the type tags line up.
- **Grouped sub-rolls** are a single centred line: total + breakdown + (adv) + right-aligned type tag.
- **Hovering a DMG tag** shows a small popover with the damage type (when known).
- Disabling **click-to-roll** now also disables Cmd/Ctrl-click custom rolls and the d20 cursor.
- With **colour-coding off**, the ability codes (STR…) left-align and take the accent title colour.

## Batch 61 — Roll log polish, grouped rolls, ability tint, dice shorthand
- **Grouped rolls:** consecutive log entries that share a source + name (e.g. an attack's to-hit +
  damage) collapse into one block — the source/name shown once, each sub-roll listed under it.
- **Ability tint:** a roll tied to an ability (STR attack, INT check, a save) gets a subtle
  ability-coloured background in the log; the stat-block name is white with a dashed underline.
- **Roll log:** ATK tag is now yellow; the adv/dis indicator moved next to the breakdown line; the
  source ref is white + dashed-underlined. The mode chip says **FLAT** (fixed width) and **resets to
  flat after every roll** (set adv/dis again right before the next).
- **Cmd/Ctrl-click a rollable** opens the custom-roll popover pre-filled (same as right-click); the
  spinning **d20 cursor** now also shows while Cmd/Ctrl is held (the native cursor hides).
- **Dice shorthand:** `d20!` and `d20>d20` mean advantage, `d20<d20` means disadvantage.
- **Vertical forge resizer:** the form/preview handle now works in the stacked layout at narrow
  widths (drag up/down); double-click still resets.
- Resizing audit: no horizontal overflow found across forge/bestiary/adventures at 480–1280px;
  hardened the encounter & scene headers against name-field bleed.

## Batch 60 — Roll mode, in-prose checks, re-parse & resizable forge
- **Roll mode tag:** the adv/disadvantage dice-icon is now a small clickable **NORMAL / ADV / DIS**
  tag (cycles on click) shown in both the custom-roll popover and the **roll-log header**. The chosen
  mode applies to click-rolls and custom rolls.
- **Roll log layout:** the source statblock ref now sits **above** the roll name, and the total is
  vertically centered in the row.
- **In-prose checks are now coloured & rollable:** a skill check like *Intelligence (Investigation)*
  rolls with this creature's modifier (ability mod + proficiency if it has that skill) on an
  ability-coloured pill; the **spellcasting ability** ("using Intelligence…") is likewise rollable.
- **Saving-throw phrases** are now white text on the **ability's colour** (e.g. *Dexterity Saving
  Throw* on a blue pill).
- **Re-parse libraries:** uploaded .json is now kept (in IndexedDB), so the upload button has a
  **▾ dropdown** with *Re-parse libraries* (replays files through the latest parser — no re-upload)
  and *Clear all disabled*. Re-parse is non-destructive: libraries without stored raw are untouched.
- **Resizable Forge:** a hover-revealed handle between the editor and preview lets you drag the
  split; **double-click resets** it. The width persists.
- **Roll labels** use the full ability name (Intelligence, not INT).
- **Settings simplified:** colour-coding and click-to-roll are now single on/off toggles (the
  sub-options are gone); the click-to-roll card notes the ⌘/Ctrl-click custom-roll shortcut.
- The Forge title shows just the creature name (no "Editing ·"); the settings gear **toggles** the
  Settings page closed; the d20 cursor animation is **snappier** with less rest (none when enlarged).

## Batch 59 — IndexedDB storage, spellcasting & chassis polish
- **Reference libraries now live in IndexedDB** (presets/spells/conditions), with a one-time
  migration out of localStorage. Fixes the silent data loss on GitHub Pages where the ~5MB
  localStorage cap was exceeded (a parsed bestiary alone is ~10MB). Your own monsters still sync
  via JSONBin; the small ref state stays in localStorage.
- **Spellcasting import fixes:** a "hidden"-list block (e.g. *Misty Step (3/Day)*) now renders as a
  plain feature — name + its sentence — instead of a malformed spell-group list. Spell names
  mentioned in any spellcasting-derived feature (reactions, bonus actions, …) are now linked with the
  hover popover (scoped to each block's own spells, so no false positives). The Spellcasting line's
  **save DC and to-hit are now coloured**.
- **Saving-throw phrase is coloured** ("Dexterity Saving Throw" → blue, matching the scheme: blue =
  the roll, yellow = the DC target number).
- **Chassis picker:** an always-open inline **search field** (type immediately); the search is no
  longer hidden behind a popover icon.
- **Loading a chassis bracketises matching parts** — the creature's self-reference, and any DC /
  to-hit / dice-average that matches the stat block, become live `[c]`/`[SAVE]`/`[ATK]`/`[XdY]`
  tokens (non-matching numbers are left alone), so edits to the stats flow through automatically.
- **Animated d20 cursor** now uses a real d20 and an eased tumble (rotation + a subtle scale swell,
  resting upright & small for a beat).
- **Preset library:** a **Clear** button in the batch-selection bar.
- **Adventures:** opening the tab now restores the last-opened adventure (or the most recent).
- **XP target marker** is the same size whether placed or not yet placed.
- **Scene drop zone** sits below the notes box, so the dashed landing box no longer overlaps it.

## Batch 58 — Tools, colour audit & roll-popover polish
- **Tool checks are rollable with the right ability** — added the XPHB 2024 tool→ability
  map (`TOOL_ABIL`); each tool now rolls `1d20 + its ability mod + PB` and shows the modifier.
- **Source filter shows real book titles** — the From-chassis and Bestiary filters now label
  sources with the full name from `books.json` (e.g. "Monster Manual (2025)") instead of the
  filename, and the Bestiary gained a **Source** filter.
- **Yellow/blue colour split:** yellow now means a static number you *don't* roll (to-hit /
  attack bonus, save/check DC); **blue means dice you actually roll** (NdX, recharge). Saving-throw
  phrases stay blue.
- **Animated d20 cursor** follows the pointer over anything rollable (a real CSS cursor can't be
  animated). Respects reduced-motion.
- **Roll popover:** the adv/disadv icon lost its box — it's now a larger (16px) icon that only
  changes colour (grey → green → red); the **(?) moved after the Roll button** and shows the dice
  notation on **hover** (in a separate tooltip that no longer tears down the roll field). The
  dice-notation popover uses a cleaner sans font.
- **Custom rolls:** carry no source, so the roll-log shows no statblock name; the field starts
  empty with a `1d20` placeholder and rolls 1d20 if left blank.
- **Saving-throw bonuses are bold when the creature is proficient** in that save.
- **Condition immunities:** the condition link keeps its dotted underline + popover but loses the
  blue tint. For both condition immunities and spell lists, a trailing `(comment)` is no longer
  coloured/underlined — only the bare name links.
- **Clear log** in the roll-log menu is now red, matching other destructive actions.
- **Settings gear icon** shrunk to 15×15.

## Batch 57 — Roll & colour round
- **Condition immunities** now ignore a trailing `(comment)` when matching a known
  condition — `charmed (with mind blank)` resolves to the *charmed* reference (same
  rule already used for spell chips).
- **Skills and tools are rollable:** a skill rolls `1d20 + its shown modifier`; a
  tool rolls `1d20 + proficiency bonus` (the ability is the DM's choice, so PB only).
- **Chassis-preset attacks roll again:** the `*Melee Attack Roll:* +N` jargon was
  split across an italic by the formatter, so the attack bonus (and the attack name)
  weren't tagged as rollable; the `+N` after an italic "…Attack Roll:" is now tagged,
  and damage wrapped in parentheses (`(8d6)`) is recognised too.
- **⌘/Ctrl-click anywhere** opens a quick custom-roll popover at the cursor
  (documented in the dice-notation help).
- **Roll-log result** is now neutral (white); green/red are used **only** when a
  pass/fail is evident — e.g. a **recharge** roll shows green when the d6 meets the
  recharge number, red when it doesn't.
- **Ability colours** changed: STR red, DEX light blue, CON orange, INT purple,
  WIS green, CHA pink. Ability codename pills are a **fixed width** (sized to the
  longest) with a larger gap before the scores. **Mod/Save bonuses are white.**
- Dropped the trailing `…` from action menu items / buttons (Dice notation, Custom
  roll, Import from another adventure, From chassis).

## Batch 56 — Roll/colour fixes + spellcasting import
- **Roll-log:** header buttons collapsed into a **kebab menu** (Dice notation ·
  Sort order [newest top/bottom] · Custom roll · Clear log). Right-click a log entry
  to **Reroll** or **Remove** it. CHK tag recoloured purple.
- **Recharge** in an action name is now rollable (1d6); dice that aren't clearly
  damage/attack/save/check carry **no tag** (damage requires a following "… damage").
- **Ability-score block:** colour highlight now sits behind only the fixed-width
  codename (neutral text, scores uncoloured), with spacing between highlights and
  Mod/Save numbers centred. **Skills** inherit their ability's colour.
- **Spells** get their own purple colour; spellcasting blocks are excluded from the
  colouriser (so "Wall of Fire" no longer tags "fire" as a damage type).
- **Spellcasting import fix:** 5etools `spellcasting` blocks now route by `displayAs`
  — Spellcasting → **Actions**, "Misty Step (3/Day)" → **Bonus Actions**, "Protective
  Magic" → **Reactions** (was: everything dumped into traits) — and are structured
  into spell-mode entries with parsed groups. (Re-import affected creatures to apply.)
- **Spell chips** may carry a "(comment)" beside the name; reference lookup ignores
  anything in brackets.

## Batch 55 — Roll & colour overhaul
- **Colours:** all damage types now share one fixed colour (no per-element palette);
  conditions recoloured violet (distinct from the accent); ability-score block gets
  per-ability colour highlights behind each label.
- **Recognised conditions in prose** are underlined and get the hover/click info
  popover (same as the condition-immunities line) when the condition is in an
  uploaded library.
- **Rolling:** saving throws & ability checks (the stat block's mod/save cells) are
  now rollable; attack jargon ("Melee/Ranged Attack Roll: +N") is rollable as
  d20+N; clicking an **attack's name** rolls the attack **and** its damage, and a
  natural 20 auto-crits (gold-glow row) and doubles the damage dice.
- **Custom rolls** use [clockworkmod dice notation](https://dice.clockworkmod.com/)
  (NdY, +/-, kh/kl/dh/dl, d%) with a (?) help link in the popup and the roll-log.
- **Roll popup** redesigned: a single advantage/disadvantage cycle dice-icon
  (green → red → off), an editable formula, (?) help, and Roll — no preset buttons.
- **Roll-log:** name-only label + a right-aligned type tag (ATK/DMG/CHK/SAVE);
  advantage/disadvantage shown as a green/red dice icon; **CRIT** rows are gold; each
  roll shows its **source** statblock (click to open it in the Forge, hover to preview).
  Higher-contrast panel so it no longer blends into the background.
- **Legacy spellcasting:** a Spellcasting trait on an imported/legacy statblock is
  detected and converted to the 2024 **Spellcasting action** (ability/DC/spell groups
  parsed; falls back to a plain action if the list can't be parsed).
- All FABs standardised to 32px; the stat-block preview scrolls clear of the Save
  button.

## Batch 54 — Click-to-roll dice
- The colour-coded **dice / to-hit** tokens in the statblock preview are now
  **clickable** (gated by Settings). **Left-click** rolls instantly; **right-click**
  opens options: **advantage / disadvantage** (2d20 keep hi/lo on d20 rolls),
  **critical hit** (double damage dice), and an **editable formula**.
- Results show as a **toast** and accumulate in a collapsible **roll-log panel**
  (bottom-left of the main area) with each roll's total + dice breakdown and a clear
  button.

## Batch 53 — Statblock colour-coding
- The Forge **statblock preview** now colour-codes prose (gated by Settings):
  **damage types** (elemental palette), **dice / +to-hit** (also tagged for
  click-to-roll), **save DCs** and **saving-throw** phrases, **conditions**, and
  **ranges & areas**. The **ability-score block** tints mods/saves by sign.
- Colouring runs as a TreeWalker over the prose bodies only (`.blk`/`.va`/notes) —
  the structured header lines (AC/Speed/Senses/CR…) and the exports are untouched.

## Batch 52 — Settings page
- New **Settings** view, opened by a **gear icon in the appbar** (present on every
  view). Persists to `localStorage` (`mf_settings`), merged over defaults at load.
- **Feature toggles** — master + per-category switches for the upcoming Statblock
  colour-coding and Click-to-roll dice (so they'll be opt-in).
- **Adventure defaults** — default party size / level / faction, now used when
  creating a new adventure and when adding combatants.
- **Data & sync** — Export / Import JSON, a live cloud-sync status line, a manual
  **Re-sync now**, and **Clear local cache** (cloud data untouched).

## Batch 51 — Scenes overhaul
- _Follow-up fixes:_ filter tools trimmed to **search + sort** (Name / Difficulty;
  dropped the filter menu and the Spent-XP sort); **＋ Scene** moved to sit directly
  under the scenes and above Ungrouped; Ungrouped shows nothing when empty (no
  placeholder text); added **＋ Scene** to the encounter-FAB dropdown; the encounter
  and Bestiary FABs use **rounded-square** corners (8px) instead of full pills.
- **Section renamed Encounters → Scenes.** Scene blocks are now **neutral** (grey
  left-rule, no amber) and the scene name is no longer force-uppercased.
- **+ Scene moved into the list** (dashed add-button, like add-combatant/add-section);
  the **Scenes header** now carries right-aligned **filter tools** — search, filter
  (difficulty / faction / has-minion) and sort (Name / Difficulty / Spent XP).
  Manual drag order is the default (no chip until you pick a sort).
- **Inside each scene:** a **notes** field under the title, and an **+ Encounter in
  this scene** button at the bottom (removed from the scene ⋯ menu).
- **Scenes can be archived** from their ⋯ menu — the scene and its encounters move to
  the Archived area and are excluded from the active list.
- **Scenes are draggable** to reorder (grab the scene header), like encounters.
- **Encounter FAB is now a split button** (＋ Encounter ▾, keeping the rounded pill):
  the caret opens **Import from another adventure…** (pick individual scenes /
  encounters to copy in), **Archive all encounters**, and **Clear all encounters**.

## Batch 50 — Bestiary adventure grouping + library polish + fixes
- **Bestiary grouping by adventure** now shows each adventure's **identity colour
  dot** (FP4) in the group header; the no-adventure bucket reads **Not in any
  adventure** (and **Not in any encounter** when grouped by encounter). New
  non-interactive `advDotStatic` + generic `groupLabelHTML`/`emptyLabel` hooks on
  the control descriptor.
- **Preset-library manager:** the remove control is now a proper **red trash-bin
  SVG** (was a 🗑 emoji).
- **Batch-select bar (Bestiary):** the **Set status** button no longer stretches
  full-width or shows the grey browser default — it's a content-width accent
  button (base `.btn` never set a background, so the un-modified button fell back
  to the UA button-face; `.batch-bar .btn` now also pins `width:auto`).
- **Combatant minion tag** (the read-only tag on a loaded minion statblock, not the
  quick-combatant toggle) is now **right-aligned** in the statblock row.
- **Encounter battlefield notes:** dropped the "Battlefield notes" label; the cue
  now lives in the textarea placeholder.

## Batch 49 — Encounter scenes + minion chip
- **Encounter scenes:** an adventure can now group its encounters into named,
  collapsible **scene** containers (`a.scenes[]` + `enc.sceneId`). A **＋ Scene**
  button sits beside **＋ Encounter**; each scene has an editable name, a collapse
  chevron, an encounter count, and a ⋯ menu (add an encounter to the scene, delete
  the scene — its encounters fall back to **Ungrouped**, not deleted). Encounters
  **drag between scenes**: drop onto another encounter to adopt its scene + position,
  or onto a scene header / body / the Ungrouped bucket to re-parent. Adventures with
  no scenes render exactly as before (flat list).
- **Minion checkbox → chip:** the cramped, clipped minion checkbox on quick
  combatants is now a clean toggle **chip** matching the existing MINION tag (click
  to enable/disable; re-renders to refresh XP + budget).

## Batch 48 — Minion edge cases
- **Minion allies** now raise the encounter budget proportionally (scaled by
  minion-XP ÷ standard-XP) instead of as a full creature — matching the enemy-side
  minion math (5 CR-1 minion allies ≈ 1 standard ally).
- **Quick (CR-only) combatants** can be flagged as minions via a **minion checkbox**
  in their row; the flag flows through XP, the budget, and the Claude export.

## Batch 47 — Minion encounter math + B44 polish
- **MCDM minion encounter budgeting:** a minion combatant now contributes the
  special low **minion XP** (Flee, Mortals! table) instead of standard CR XP, so a
  horde counts fairly (e.g. 5 CR-1 minions = 200 XP ≈ one standard CR-1 creature; a
  CR-11 minion is 720 XP, not 7,200). New `MINION_XP` table + `combatXPEach` /
  `combatIsMinion`. Minion combatant rows show a **MINION** tag; the Claude encounter
  export tags minions and uses their minion XP.
- **Preset-libraries `?`** help now opens on **hover** (all `?` helpers are now
  hover-consistent); the sidebar **“Preset libraries”** button drops its trailing “…”.
- **Doubled the adventure color palette** to 20 swatches.

## Batch 46 — FP4: adventure color identity
- Each adventure can carry a **color**. A filled **dot** sits before the name in the
  sidebar card and the open adventure title; clicking it opens a curated 10-color
  preset palette (+ “No color”).
- A selected adventure's sidebar card uses its color for the **highlight border**.
- Migrated in `normalizeAdv`; the `advDot` helper is reusable for future
  adventure-colored UI (e.g. grouping the bestiary by adventure).

## Batch 45 — FP5: budget chips + FAB standardization
- **Adventure budget caps** are now **three color-coded chips** (Low green /
  Moderate amber / High red, each with its XP value), replacing the old gradient bar.
  The per-encounter bar with the draggable target marker is unchanged.
- **Save FAB** uses a floppy-disk save icon + label (placeholder for the intended
  custom SVG — swap the single `<path>` in `#forgeSaveFab`).
- The 3 floating action buttons (Forge Save, Bestiary New split, Adventures +) are
  consistent accent pills; `.fab` now lays out an icon + label.

## Batch 44 — Fixes round 2
- **Fly / Blindsight options gear** moved out of the field and up to the field
  **title row** (right-aligned next to the label), like the short-name gear.
- **Removed the XP tag** from chassis picker cards (CR + source only).
- **Loading a chassis from a feature chip** now uses the same **“You have unsaved
  edits”** keep/override/back dialog as loading a chassis from the Forge.
- **`?` help buttons and card statblock-preview icons open on hover** (still
  clickable) — matching the forge CR / short-name help.

## Batch 43 — Fixes round (forge + encounter polish)
- **Add-section button moved to the bottom** of the added sections (after Custom Notes).
- **XP-target marker** default position is now the true **left end** of the bar.
- Library-preset grouping option renamed **Group → Category**.
- **Imported-feature chip** loses its ✕; its kebab opens a popover with a scrollable
  mini statblock preview + **Load … as chassis →**. Editing the name auto-clears the chip.
- **Fly “can hover”** and **Blindsight “blind beyond radius”** moved into gear-icon
  popovers next to their fields (matching the short-name gear).
- Removed the helper text from the **Abilities & saves** title.
- Fixed the **collapse** of inline-styled last lines (Skills/defenses/senses) — the
  collapse rule is now `!important`; the Other-senses row is a normal full-width field.
- **Textarea resize grips** follow `color-scheme:dark` instead of a light-grey gradient.
- The **creature Name field** uses our styled suggestion dropdown (names from the
  library / chassis / presets); native autofill suppressed on free-text fields.
- **Statblock preview everywhere:** a “Preview” item in bestiary card menus, and a
  magnifying-glass-chart icon on chassis + add-combatant cards.
- The **last-edited encounter** gets a focus highlight.
- Add-combatant → **From chassis** has a back arrow to the bestiary picker; both
  pickers hide their description behind a **?** by the title; chassis cards now use the
  same tags row (CR · XP · source) and position as the bestiary cards.

## Batch 42 — Encounter & combatant UX (FP3)
- **XP-target marker is OFF until dragged:** it parks at the **low-end** of the
  budget, renders dimmed/hollow, and the "target / ±delta" read-out is hidden until
  the DM positions it (`e.target` stays null; click or drag activates it).
- **Combatant statblock dropdown** is grouped by **CR** (ascending) with the
  **last-edited** creature pinned in a "Last edited" group on top (`_savedAt`).
- **Add-combatant picker:** fixed footer (card list scrolls inside) with
  **From chassis…**, **Forge new →**, and **Done**.
- **Add from chassis:** picks a base, **auto-creates & saves a Bestiary entry**, and
  drops it straight into the encounter — no trip through the Forge.
- **Chassis preview popover:** an 👁 on each chassis card shows a compact statblock
  (stats, ability mods, trait / action names) before you pick it.
- **Screen-aware menus:** the "+" / ⋯ dropdowns flip **upward** when they'd run off
  the bottom of the viewport.
- **Edit-vs-new guard:** starting a New creature warns first if the Forge holds
  unsaved changes (`forgeUnsaved`).
- **Invisible encounter title:** the name field is borderless until hover/focus.

## Batch 41 — Add-section refactor (FP6) + forge fold-in fixes
- **One "＋ Add section" control** replaces the five always-present enable
  checkboxes (Legendary / Villain / Lair / Regional / Minion). Picking one reveals
  its fieldset; each section has a remove **✕** in its title. Turning a section off
  keeps its data (re-adding restores it); Minion still adds/removes its traits.
- **Custom notes:** a new repeatable section. Each note has an optional title +
  body (bracket tokens supported) and renders in the stat block as a **visually
  isolated note block below everything** (dashed, amber-tinted). Notes flow through
  the Notion / Claude exports, chassis merge, dirty-check, and `normalizeMonster`
  migration (`m.notes`).
- **Smarter `[c]` detection on import (`bracketize`):** now also tokenises the
  source creature's **first name** (e.g. *K'thriss* from "K'thriss Drow'b"), a
  **partial / last-word** reference (e.g. "the ruffian" from "Tarkanan Ruffian"),
  and **plural** forms (→ `[c][s]`). Bare proper-name references are emitted as
  `[c]` and promoted to `[C]` at sentence starts.
- **Source chip:** an imported feature now shows a right-aligned chip in its name
  field — source statblock · book code (e.g. *Wraith · XMM*) — with a ✕ to forget
  it. Stripped from exports and the origin signature (`stripSrc`).
- **Initiative Proficiency** button has a fixed width (sized to the widest label).
- **Identity layout:** Subtype / Alignment / Short name share one responsive row
  (`g-id2`), wrapping when narrow.

## Batch 40 — Forge entry overhaul, combo everywhere, FP2 + CSS tokens
- **Combo dropdowns project-wide:** every feature-**name** field (traits / actions /
  bonus / reactions / legendary / villain / lair) now uses the combo suggestion
  dropdown — typing filters built-in snippets **and** library features.
- **Picking a suggestion imports the body too** (not just the name).
- **Bracketize on import:** importing a library/chassis feature rewrites its concrete
  text into live tokens — creature name → `[c]`/`[C]`, `DC N` / `<Ability> Saving
  Throw: DC N` → `[ABIL SAVE]`/`[SAVE]`, `N (XdY)` → `[XdY]`, attack `+N` → `[ATK]` —
  so it retunes to the new creature. (Built-in snippets are already bracketed.)
- **Free drag-reorder** for the manually-ordered sections (actions/legendary/villain/
  lair), replacing the ▲▼ move arrows (mirrors the encounter-block drag).
- **Recharge / X-per-day "+"** moved **inside** the entry name field (divider-separated,
  like the Gear field).
- **CR-suggested AC / HP** show the value as a **placeholder** (empty field, behaves as
  set, no need to clear).
- **Short name:** Proper-name + Plural folded into a **gear popover** inside the field.
- Sidebar **"Preset libraries…"** uses the library **book icon**.
- **CSS:** introduced `--accent-hover`, `--in`, `--shadow-pop` tokens and swapped the
  repeated literals (no visual change).

## Batch 39 — Identity combo dropdowns
- **Type / Subtype / Alignment** are now proper combo fields. The **chevron opens the
  native OS dropdown** (your screenshot-2 style) listing every value — the canonical
  D&D set plus your own values, **de-duplicated by case** (no more `dragon`/`Dragon`
  twins). **Typing** instead opens a **custom styled suggestion dropdown** that filters
  as you type, and free-text is still allowed. This replaces the old `<input list>`
  datalist whose popup was a different, often mis-aligned browser widget.

## Batch 38 — FP1 follow-up fixes
- **Origin tags reworked:** the home-brew tag now reads **Homebrew** and is **red**;
  the chassis tag now shows the **source it came from** (e.g. `MM25`, or `Built-in`
  for the generic chassis) instead of the generic "Chassis" label/icon.
- **Add-skill dropdown:** the scrolling list no longer bleeds over the sticky group
  header; the popover clips to its rounded corners and the header has a divider. Tall
  dropdowns also stay fully on-screen instead of running off the bottom.
- **Dropdowns actually unified now:** the native datalist arrow is properly hidden, so
  Type / Alignment / Subtype / feature-name fields show a **single** chevron matching
  the `<select>`s (previously a second native arrow appeared, especially on focus).
- **Removed** the stray preview **collapse (◀)** toggle.

## Batch 37 — Forge quick-fixes + dropdown standardization (FP1)
- **Removed the Multiattack action button** — it's already available as a chip inside a
  custom action.
- **Removed "Paste statblock"** from the sidebar (Paste 5etools is still in the Forge ⋯
  menu and the Bestiary add menu).
- **Condition Immunities dropdown:** pins the **XPHB** group to the top and no longer
  lists **diseases** (only true conditions/statuses).
- **Unified dropdown chevrons:** every dropdown — native `<select>`s _and_ the
  Type/Subtype/Alignment comboboxes — now uses the **same chevron glyph and right
  margin** (previously the comboboxes showed a different browser arrow with no spacing).

## Batch 36 — Bestiary origin, bracket-driven library & UI polish (B43)
- **Bestiary origin badge:** every card now shows whether it's **⚒ Home-brew**
  (created or edited here) or **⊕ Chassis** (loaded from a chassis and saved without
  edits). The first edit flips it to home-brew; re-statusing/tagging doesn't.
- **Gear "Suggest" → wand icon:** the Suggest button is now a ghost magic-wand icon
  inside the Gear field, divider-separated (the chip area is cropped at the divider).
- **Dropdown chevron spacing:** more right padding on every native select so the text
  no longer crowds the chevron.
- **Tool proficiencies folded into "Add skill":** the separate _Add tool proficiency_
  button is gone; the **＋ Add skill** button now opens a dropdown of skills with a
  **Tools** subgroup after them.
- **Bare `[SAVE]` / `[ATK]`:** with no ability named, these now use the creature's
  **highest** ability modifier (e.g. `[SAVE]` → save DC from the best stat).
- **Bracket shortcuts in preset features:** the custom-action **Save block** snippet and
  the whole built-in library (traits, actions, bonus, reactions, legendary, villain, lair)
  now use **live bracket tokens** (`[CON SAVE]`, `[2d6]`, …) instead of baked-in numbers,
  so inserted features retune to the creature's CR/abilities. Attack-row hints expand
  tokens too.
- **Recharge / X-per-day control:** the per-row freq button is now a ghost **＋** icon in
  the entry's name bar (was a `↻`).
- **Live feature-name suggestions:** typing in a Trait/Action/Bonus/Reaction **name**
  field now suggests built-in snippets **and** every distinct feature harvested from
  loaded chassis, presets and saved monsters.
- **Library overrides built-ins:** when a typed name matches a feature in your library
  (saved bestiary + uploaded presets), that version fills in instead of the built-in
  snippet; curated built-ins still win over the example chassis text.

## Batch 35 — Bracket shortcuts + library aggregation (B41–B42 + fixes)
- **New bracket tokens** (work in any trait/action/note, expand in preview + every
  export):
  - `[STR SAVE]` → save DC for that ability (8 + PB + mod), e.g. `DC 15`.
  - `[STR ATK]` → attack/check modifier (PB + mod), e.g. `+7`. Any ability.
  - `[C+]` / `[c+]` force the article ("the"); `[C-]` / `[c-]` remove it —
    overriding the Proper-name toggle for one reference (capital = capitalised).
- **"From library" aggregation:** the trait/action/bonus/reaction/legendary/
  villain/lair pickers now include a **From bestiary** group listing every distinct
  feature (by name) harvested from all loaded chassis, presets and saved monsters;
  picking one inserts a copy.
- **Bestiary header fix:** cards no longer bleed above the sticky header while
  scrolling (the 20px scroll-padding gap is now painted over).
- **Mobile batch bar:** anchors to the left edge and grows rightward instead of
  centering off-screen.

## Batch 34 — Gear, spellcasting/action & focus fixes (B38–B40 + add-ons)
- **Gear "Suggest" button:** the Gear field is now a chipfield (like Condition
  Immunities). A **Suggest** button harvests manufactured weapons from attack
  names and armor/shield from the AC note, adding any new ones as removable chips
  (never overwrites; natural weapons like Bite are ignored).
- **Spellcasting lines** now always list spells **alphabetically**.
- **Recharge / X-per-day → title:** a new ↻ control on action / bonus-action /
  reaction rows appends `(Recharge 5–6)`, `(1/Day)`, etc. to the **name** (not the
  body), replacing any existing freq tag. Removed the old body-text Recharge/1-Day
  snippets.
- **Tool proficiencies:** an **Add tool proficiency** button under Add skill picks
  from the official 2024 tool list and shows a **Tools** line on the stat block.
- **Focus fix:** typing in an attack/spell field (dice, range, rider, etc.) no
  longer re-renders the whole list — it patches just that row's live hint, so the
  field keeps focus and the page no longer jumps.
- **Forge starts at the top** whenever a creature is loaded.
- **Bestiary:** new **Encounter** and **Adventure** filter/group options (group by
  adventure includes every monster used in any of its encounters).
- Multi-select batch bar stays on one line (no wrap) when there's room.

## Batch 33 — Bestiary batch ops + MCDM minions (B36–B37)
- **Multi-select bestiary cards:** Cmd/Ctrl-click toggles a card and Shift-click
  extends a range; a floating bar shows the count with **Set status** (bulk) and
  **Clear**. Plain click still opens the creature.
- **Drag to restatus:** when the Bestiary is grouped by status, dragging a card
  onto another status group sets that status (a multi-selection moves together).
- **Minion flag (MCDM):** a new **Minion · MCDM** toggle adds the Flee Mortals
  **Minion** + **Minion Group** traits, shows a **MINION** tag on the stat block,
  and renders attack damage as **fixed values** (no dice). It's fully reversible —
  flat damage and the badge are render-time, so toggling off restores rolled
  damage and removes the traits with no data loss.
- (Noted for later: reflecting minion economics in the encounter XP/CR budget.)

## Batch 32 — Native dropdowns + parser fixes (B34–B35)
- **Form dropdowns → native:** form-field `<select>`s now use the browser's own
  dropdown (native arrow + native option list), and the whole app is pinned to
  `color-scheme:dark` so those native menus, number spinners and autofill render
  dark instead of flashing to a light theme.
- **White-mode bug fixed:** a global `:-webkit-autofill` override keeps a field
  dark after the browser autofills/datalist-picks it (e.g. Languages).
- **Reactions parser (2024 jargon):** `richStrip` now translates the 2024
  `{@actTrigger}` / `{@actResponse}` / `{@actSave}` / `{@actSaveFail}` /
  `{@actSaveSuccess}` markup, so reactions like **Eldritch Eddy**'s "Eldritch
  Overload" import with their Trigger/Response split and house-style saving-throw
  wording intact.
- **Same-name monsters grouped:** in the chassis picker and the Bestiary preset
  view, creatures sharing a name collapse into one card whose **source tag is a
  dropdown** of every source; XMM then XPHB are preferred as the default variant.
  (Visual only — each source stays its own underlying record.)

## Batch 31 — Forge field, ability & popover polish (B31–B33)
- **Field cleanup:** removed the inline `(blank = auto)`, `(optional)` and
  "Passive Perception is added automatically" hints from the Initiative, HP-formula
  and Senses fields.
- **Short name:** the `Word` field is retitled **Short name** with a `?` custom
  popover carrying the explainer; the old standalone label/comment line is gone.
- **Damage modifier:** the resist/immune/vuln list under Skills now has a
  **Damage modifier** sub-title with more breathing room above it; the
  "No damage modifiers…" placeholder text is removed when nothing is set.
- **Setting faction → Neutral:** the third combatant faction is renamed
  `Neutral` (old `Setting` data migrates automatically; keeps its styling).
- **Ability scores:** numbers are centred in their boxes ignoring the steppers;
  a value of `10` shows as the placeholder (`10`) and behaves as 10 with no need
  to clear. The stepper treats a blank ability as 10.
- **Number of monsters:** combatant count shows `1` as a placeholder, behaving as
  1 without needing a typed value.
- **CR field** is left-aligned.
- **CR / Short-name popovers:** the default browser `title` tooltip on the CR `?`
  is removed; both `?` buttons now open a single custom popover centred over the
  icon with a balloon **tail** (`tail-pop`).

## Batch 30 — Reference popovers + preset-manager refinements
- Spell/condition hover cards already render the structured 5etools fields; the
  **source id** (e.g. `XPHB`) is now shown instead of the source filename, with
  the **full book title as a hover tooltip** when a `books.json` is loaded.
  Spell-picker options are labelled/grouped by source id too.
- Preset-library manager:
  - Selection-actions popover moved to the **top-left** (clear of the
    right-aligned group checkbox); the Enable/Disable buttons are replaced by a
    single **switch toggle** (mid-state when the selection is mixed; a click
    enables all first), and Remove is a **red bin** button.
  - **Remove confirmations stack above** the still-open manager (`confirmStack`).
  - Uploading a `books.json` now **re-annotates every already-loaded library**,
    not just ones uploaded afterward, and persists the labels.
  - Multi-file uploads show a concise **"Loaded N sources"** toast; a
    **device-storage-full alert** fires when a write is dropped over quota.

## Batch 29 — Legendary-group import + preset-modal UX overhaul
- `legendarygroups.json` ingestion: monsters referencing a `legendaryGroup` get
  their **lair actions + regional effects** filled in. Re-applies across sessions
  via the stored `_legGroup` ref. Nameless lair entries now render.
- Preset-library modal restructured: fixed Close/Upload bar with a scrolling
  list, selection-first rows, working group-by control (None/Type/Group),
  reference sheets pinned subdued at the bottom, intro moved into a `?` popover.

## Batch 28 — 5etools JSON ingestion + preset library manager
- Replaced the markdown importers with native **5etools JSON parsing**
  (bestiary / spells / conditions / books). Exact AC/HP/saves/skills/spellcasting;
  cross-file **`_copy`/`_mod` resolution**; one file holds a whole book.
- `books.json` reference stamps full title + group onto each library.
- Library **enable/disable** (kept on disk, hidden from pools); manager modal with
  type/group/name filter + sort.

_Earlier batches (8–27) are recorded in the project hand-off notes._
