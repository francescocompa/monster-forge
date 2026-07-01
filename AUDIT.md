# Monster Forge — Holistic Audit (2026-07-01)

> Full-project re-audit at `929c03b` (Batch 249). Dimensions: code structure, engineering
> practice, security & data integrity, performance, UX/copy/accessibility. The previous audit
> (2026-06-22, post–Batch 190) is treated as input, not baseline — every claim re-derived, with
> B190→B249 deltas called out. Findings verified statically **and** live in the preview + against
> the real Firebase DB. All P1–P3 findings were then fixed across Batches 250–253 (see the priorities
> table); the one open item is a tap-target sizing tweak awaiting the author's greenlight.

---

## 0. Executive summary

Monster Forge remains a **mature, unusually well-engineered no-build static app**: ~8,100 lines of
hand-written JS across **12 shared-scope files** (was 9 at B190 — `dice3d.js`, plus the roster/combat
splits landed since), ~2,300 lines of CSS, served from GitHub Pages. The engineering discipline is
still real — 0-error/0-warning lint, 12 green jsdom tests, a self-maintaining globals system feeding
both ESLint and `tsc`, a commit gate, and zero `console`/`TODO` debt in shipped code.

**What changed since B190 is mostly additive and mostly good:** the Firebase migration (B243) replaced
the exhausted shared JSONBin master key with a model that actually fits a no-backend static site
(public client URL, server-side rules) — I confirmed it round-trips end-to-end against the live DB
(write→read→delete→gone, 205 ms). The in-app player-mode sharing layer (B204–B237) is a genuinely
ambitious feature built cleanly on top of the real tracker.

**But that same sharing layer introduced the one serious problem this audit found: a confirmed
stored-XSS.** Any player device can push a crafted dice-roll (or character-sheet edit) through the
write-back channel that the DM app folds into its roll log and renders **unescaped** into the DOM —
proven live in the loaded app (`<img onerror>` executes). Because it runs in the DM's origin, it can
read `mf_fbid` from localStorage and tamper with the entire cloud library. This is the P1 and is fixed
in this pass. The root cause is twofold: `esc()` never escaped quotes (an attribute-breakout gap that
predates sharing), and the player→DM ingestion boundary trusts field types it shouldn't.

Two smaller correctness/perf items and a handful of dead-code leftovers round it out. Nothing else rises
to "correctness bug."

| Dimension | Grade | B190 | One-line verdict |
|---|---|---|---|
| Code structure | A− | A− | Clean shared-scope split; density still the main cost. |
| Engineering practice | A | A | Safety net intact and extended (typecheck, lint:css). |
| Security & data integrity | **C** | B− | One confirmed XSS (fixed here); trust boundary needs hardening. |
| Performance | B− | B | Vendor libs (724 KB) now render-blocking on every boot. |
| UX / copy | A− | B+ | Tone pass (B238–240) landed; copy reads human now. |
| Accessibility | B | B | aria/reduced-motion coverage decent; tap-target sweep still owed. |

---

## 1. Security & data integrity  — the important section

### P1 (fixed in this pass) — Stored XSS from any player device into the DM origin
**Confirmed live**, not theoretical. Chain:
1. A player's device calls `playerPushRoll` (combat.js) which writes a roll event to the shared
   write-back path with `total`/`id`/`label`/`parts` taken **verbatim**, no coercion.
2. The DM app's `pollShareEdits` (combat.js:1242-1243) folds those fields straight into `rollLog`.
3. `renderRollLog` (engine.js:791) sets `el.innerHTML = rollLogHTML(...)`, and `rlSingleHTML`
   (engine.js:808) renders `<span class="rl-total">${r.total}</span>` and `data-rollid="${r.id}"`
   with **no escaping**.
4. `esc()` (core.js:235) escaped only `& < >`, never `" '`, so even the fields that *are* run through
   `esc()` (character-sheet edits, condition names, join names → rendered into `value="…"`/`title="…"`/
   `data-*="…"`) allowed attribute breakout.

Proof (run in the live app): `esc('" onx="y')` returned a raw `"`, and `rlSingleHTML({total:'<img
src=x onerror=alert(1)>' …})` produced `<span class="rl-total"><img src=x onerror=alert(1)></span>`.
Impact: script execution in the DM's origin → read `localStorage.mf_fbid` → `PUT installs/<id>` =
full library/adventure/roster compromise. With "Show dice to players" on, the payload is also
re-published to every other player's device.

**Fix applied (Batch 250):**
- `esc()` now also encodes `"`→`&quot;` and `'`→`&#39;` (verified safe: all 310 call sites are HTML
  contexts; no `.value=`/`textContent=` sinks that would double-encode).
- The player→DM ingestion boundary in `pollShareEdits` now sanitizes every field it accepts: `total`
  coerced to a finite `Number`, `id` validated against `^[\w-]{1,40}$`, string fields (`label`,
  `parts`, `by`, `dmgType`, condition names) coerced-and-clamped. Untrusted data is normalized at the
  boundary rather than trusted downstream.

### P2 — The whole model rests on Firebase rules staying scoped (accepted, document it)
The DB uses open read/write on `installs/$inst` and `shares/$id` with default-deny elsewhere. That's
the correct model — **but the entire security boundary is those rules**. A single misedit (e.g. the
console's 30-day "test-mode" rule silently reverting to root read/write) would expose *every* install
via one `GET /installs.json`. Install ids come from `uid()+uid()` (ms timestamp + ~8 base36 random
chars) — fine against blind enumeration, not a cryptographic secret. Recommendations (not blocking):
keep the non-expiring scoped rules in place and re-check them periodically; consider
`crypto.getRandomValues` for newly-minted install/share ids.

### P2 — `loadAll` clears the dirty flag even if the roster push failed
core.js:191-193: on a dirty-push, `ok1`/`ok2` (monsters/adventures) are checked but the awaited
`jbinSet("library:party", …)` result is ignored, so `setDirty(false)` runs even when the roster write
failed. Next load then adopts the cloud roster and silently drops the unsynced local roster edits.
Fix: include the roster result in the `ok` gate.

### P3 — Players can overwrite the DM's published snapshot
`shares/<id>` is world-writable (players must write their edits there), so a malicious player can PUT
over the DM's read snapshot and spoof what *other* players see. The DM's next render republishes and
self-heals, so it's a transient prank vector, not data loss. Accepted risk for a personal tool; noted.

### P3 — `visibilitychange`→`_flush` isn't PLAYER_MODE-gated
core.js:227: `_schedule` early-returns in player mode but the visibility-hide `_flush` does not, so a
player hiding the tab writes snapshot-derived state into that device's real `mf_cache:*`. Harmless
unless the same device later runs the real app with an empty cloud bin. Gate `_flush` on `!PLAYER_MODE`.

---

## 2. Code structure & engineering

**Strengths (unchanged):** consistent shared-scope discipline, rationale-first comments, the
`normalizeMonster`/`normalizeAdv`/`normalizeRosterPC` migration layer, quota-aware storage with an IDB
fallback, and a real safety net (`node --check` → ESLint `no-undef` with espree-parsed globals → jsdom
smoke test → commit gate), now extended with advisory `lint:css` and `typecheck`.

**Costs (unchanged, accepted):** extreme line density (max lines: engine.js 1419 chars, data.js 1363,
combat.js 954) and a handful of 100-line-plus functions; the "re-render-the-world + rebind" UI pattern.
Fine at personal scale; the first thing that strains if libraries grow large.

**Dead code confirmed (P3 cleanup):**
- Unused globals: `dlFor`, `presetSources` (core.js), `encStatusChipHTML`, `setCombatFaction`,
  `setDeathSave` (combat.js), `_rlPos`, `refSpan`, `subName`, `hideRefpop`, `DICE_ICON` (engine.js),
  `moveEntry`, `refPhrase` (forge.js), `PC_TUNE_ICON` (roster.js). (Each referenced only at its own
  declaration — verify individually before removing; some may be near-miss dynamic references.)
- Dead CSS (0 JS/HTML refs, confirmed): `.pm-bar-l`, `.pm-bar-name`, `.pm-bar-change`, `.pm-claim`
  (B237 removal), `.rl-n` (B223 counter removal), `.share-qr` (B211), `.mode-adv`, `.mode-dis`,
  `.modal-title`.
- `condDatalist`/`spellDatalist` builders + elements — already being removed in a separate task.

**Test-coverage gaps:** the newest, riskiest code has no unit tests — combat math (`applyPlayerEdit`
clamps, `pollShareEdits` sanitization), the Firebase layer, and the dice pre-roll determinism. The
smoke test proves boot; it doesn't exercise these. A `combat.test.js` around the ingestion boundary
would be the highest-value addition (and would lock in the P1 fix).

---

## 3. Performance

- **P2 — Vendored libs are render-blocking on every boot.** index.html:335-337 load `qrcode.min.js` +
  `three.min.js` (592 KB) + `cannon.min.js` (132 KB) as plain blocking `<script src>`. The documented
  "lazy + guarded" property only covers *scene init* (`d3dReady`, dice3d.js:283) — the 748 KB is
  fetched (first visit), parsed, and executed on every page load, including mobile player mode and DMs
  who never roll a 3D die that session. They aren't `?cb`-busted, so they're browser-cacheable
  (unlike the shared scripts), but the parse/exec cost is unconditional. **Recommendation:** inject
  `three`/`cannon` dynamically on first `rollDice3D`; `d3dReady` already gates the scene. Drops ~724 KB
  off the critical boot path for the common case.
- **Note — the `?cb=Date.now()` cache-bust** (index.html:14, 338) is load-bearing for correctness
  (see the cache-bust memory note) but means the 12 shared scripts (~8,100 lines) + `styles.css`
  (200 KB) refetch on every load. Acceptable for a personal tool with a handful of users; flagged only
  so the tradeoff is explicit. Do **not** revert it casually — any HTML/JS version skew white-screens
  the page.
- `styles.css` at 200 KB is large for the surface area; the dead-selector list above is a start, but a
  deeper sweep of revert-orphaned rules is the real win if it's ever worth the risk.

---

## 4. UX, copy & accessibility

Verified live at 375 / 768 / 1280 px with a populated combat (the newest/densest surface).

- **Copy (improved since B190):** the "less corny / less AI-tell" tone pass (B238–240) landed. A scan
  for AI-tell patterns (seamless/effortless/unleash/dive in/oops/…) across all shipped strings found
  **none**; toasts read like a competent tool ("Sync failed. Your work stays on this device.", "Sharing
  stopped, players disconnected."). No rewrite table needed — remaining tone work is longer-form
  (welcome/help copy) and subjective, the author's call.
- **Contrast (all pass WCAG AA against `--bg` #121317):** `--txt` 15.3, `--dim` 7.9, `--faint` 5.0 (the
  B192 fix holds), `--accent`/`--brand` 5.5. The app is **dark-only** (no light-mode path), so there's a
  single theme to check and it's legible.
- **Responsive:** mobile / tablet / desktop all render the combat tracker cleanly — rows stack, the
  active panel drops below the order ≤1080 px, no clipping. The B248 player-mode dead-void fix holds at
  narrow widths. Welcome modal reflows to a 2×2 grid on mobile.
- **Keyboard/focus:** the combat controls are real `<button>`s (focusable, keyboard-reachable), and the
  add-effect button carries an `aria-label`. `aria-label`/`aria-hidden`/`aria-pressed` are used across
  combat/adventures/roster; `prefers-reduced-motion` honored (CSS 5 + dice3d 2).
- **P3 — tap targets:** measured on mobile (375 px). Most combat controls are 26–32 px — above the 24 px
  WCAG-AA minimum but below the 44 px comfort target. The one outlier is the row **add-effect (`+`)
  button at 31×19 px** — its 19 px height is below the AA 24 px minimum and is the fiddliest to tap. A
  small `min-height` bump would fix it. (The author reports touch overall "feels good," so this is a
  refinement, not a blocker — and a sizing/feel change is theirs to greenlight.)

---

## 5. Priorities

| # | Item | Where | Effort |
|---|---|---|---|
| **P1** | Player→DM stored XSS (esc() quotes + ingestion sanitization) | core.js, combat.js, engine.js | **fixed in B250** |
| P2 | Lazy-load three/cannon off the boot path | index.html, dice3d.js | **fixed in B251** |
| P2 | `loadAll` roster dirty-clear ignores write result | core.js:191-193 | **fixed in B251** |
| P2 | Firebase rules are the whole boundary — document + periodic check | DEVELOPMENT.md | **documented in B251** |
| P3 | Gate `_flush` on `!PLAYER_MODE` | core.js:227 | **fixed in B252** |
| P3 | Remove confirmed dead JS globals + dead CSS | multiple | **fixed in B252** |
| P3 | Add `combat.test.js` around the ingestion boundary | test/ | **fixed in B252** |
| P3 | `crypto.getRandomValues` for new install/share ids | core.js | **fixed in B252** |
| P3 | Roll-log double-open + first-roll-2D on touch | engine.js, dice3d.js | **fixed in B253** |
| P3 | Bump the row add-effect (`+`) tap target (19 px tall) | styles.css | open — awaiting greenlight |

## 6. Phone checklist (only your device can confirm)
- 3D dice FPS with 20 dice on a real phone (headless can't measure rAF).
- Held cursor-die feel (shiver → launch) with a real mouse/touch.
- Player-mode full flow on a phone: open share link → gate/claim → edit HP/conditions → roll → verify
  it appears on the DM tracker; and the join-as-new-PC path.
- Tap-target comfort on the combat init-row icon controls and the roll-log mini/pill.
