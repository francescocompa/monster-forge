// Integration guard for the CR math layer (T1.5). The unit tests in units.test.js check each function
// in isolation; this runs the full offensiveCR + defensiveCR → blended-CR pipeline on composite
// monsters, each built to isolate one mechanic (multiattack, save-AoE, recharge nova, legendary,
// physical resistance, spell list). Stats are authored to sit in a known CR band, so the assertions
// are on the derivation, not on any external corpus — this is the committed accuracy floor that
// scripts/grade-corpus.mjs measures at scale. If a refactor moves any of these by more than the stated
// tolerance, that's a regression to investigate.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });
const ev = (expr) => evalIn(window, expr);

// Minimal monster: only the fields the CR functions read. `atk` entries are Forge-structured;
// `text` entries exercise the import/plain-text path.
function build(o) {
  const base = { cr: "1", ac: null, hp: null, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    dmg: {}, dmgnote: "", actions: [], bonus: [], traits: [], legend: { on: false, intro: "", items: [] } };
  return JSON.stringify(Object.assign(base, o));
}
// blended CR index = round(avg(offensive, defensive))
const blendIdx = (mObj) => ev(`(()=>{const m=${mObj};const o=offensiveCR(m),d=defensiveCR(m);return {off:o.idx,def:d.idx,blend:Math.round((o.idx+d.idx)/2),oCR:o.cr,dCR:d.cr,conf:o.confidence,dpr:o.dpr};})()`);
const idxOf = (cr) => ev(`CR_LIST.indexOf(${JSON.stringify(cr)})`);

// Each fixture: a monster built to a target CR, and the tolerance (in CR steps) we hold the blend to.
const FIXTURES = [
  { label: "CR1 plain attacker", cr: "1",
    m: { cr: "1", hp: 30, ac: 13, str: 14, actions: [{ mode: "text", name: "Club", text: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 9 (2d6 + 2) Bludgeoning damage." }] }, tol: 1 },
  { label: "CR5 multiattack bruiser", cr: "5",
    m: { cr: "5", hp: 93, ac: 15, str: 18, actions: [
      { mode: "text", name: "Multiattack", text: "It makes two Greatsword attacks." },
      { mode: "text", name: "Greatsword", text: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 18 (4d6 + 4) Slashing damage." }] }, tol: 1 },
  { label: "CR8 save-AoE artillery", cr: "8",
    m: { cr: "8", hp: 138, ac: 16, dex: 16, actions: [
      { mode: "text", name: "Firebolt", text: "*Ranged Attack Roll:* +7, range 120 ft. *Hit:* 27 (6d8) Fire damage." },
      { mode: "text", name: "Flame Wave (Recharge 5–6)", text: "*Dexterity Saving Throw:* DC 15, each creature in a 30-foot Cone. *Failure:* 45 (10d8) Fire damage. *Success:* Half damage." }] }, tol: 2 },
  { label: "CR12 legendary striker", cr: "12",
    m: { cr: "12", hp: 210, ac: 18, str: 20, actions: [
      { mode: "text", name: "Multiattack", text: "It makes three Claw attacks." },
      { mode: "text", name: "Claw", text: "*Melee Attack Roll:* +9, reach 10 ft. *Hit:* 20 (3d8 + 7) Slashing damage." }],
      legend: { on: true, intro: "Legendary Action Uses: 3.", items: [
        { mode: "text", name: "Tail Swipe", text: "*Melee Attack Roll:* +9, reach 15 ft. *Hit:* 16 (2d10 + 5) Bludgeoning damage." }] } }, tol: 2 },
  { label: "CR3 phys-resist swarm/incorporeal", cr: "3",
    m: { cr: "3", hp: 45, ac: 12, dex: 14, dmg: { Bludgeoning: "res", Piercing: "res", Slashing: "res" },
      actions: [{ mode: "text", name: "Life Drain", text: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 21 (5d6 + 4) Necrotic damage." }] }, tol: 2 },
  { label: "CR6 spell-list caster", cr: "6",
    m: { cr: "6", hp: 82, ac: 15, int: 18, actions: [
      { mode: "text", name: "Dagger", text: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 4 (1d4 + 2) Piercing damage." },
      { mode: "spell", name: "Spellcasting", ability: "int", dc: 14, atk: "", groups: [
        { freq: "At Will", spells: "Fire Bolt, Scorching Ray" },
        { freq: "1/Day Each", spells: "Fireball, Fly" }] }] }, tol: 2 },
  { label: "CR15 high-AC tank", cr: "15",
    m: { cr: "15", hp: 230, ac: 19, str: 22, actions: [
      { mode: "text", name: "Multiattack", text: "It makes two Slam attacks." },
      { mode: "text", name: "Slam", text: "*Melee Attack Roll:* +11, reach 10 ft. *Hit:* 40 (6d10 + 7) Bludgeoning damage." }] }, tol: 2 },
  { label: "CR1/2 structured Forge attack", cr: "1/2",
    m: { cr: "1/2", hp: 19, ac: 13, str: 14, actions: [
      { mode: "attack", name: "Spear", ability: "str", atk: "", dice: "1d6", addMod: true, dtype: "Piercing", extra: "" }] }, tol: 1 },
];

for (const f of FIXTURES) {
  test(`blended CR: ${f.label} → CR ${f.cr}`, () => {
    const r = blendIdx(build(f.m));
    const label = idxOf(f.cr);
    assert.ok(Math.abs(r.blend - label) <= f.tol,
      `${f.label}: blended CR ${JSON.stringify(r)} vs label CR ${f.cr} (idx ${label}) exceeds tolerance ±${f.tol}`);
  });
}

test("aggregate: fixtures are unbiased and mostly within ±1 (accuracy floor)", () => {
  const errs = FIXTURES.map((f) => blendIdx(build(f.m)).blend - idxOf(f.cr));
  const bias = errs.reduce((s, e) => s + e, 0) / errs.length;
  const within1 = errs.filter((e) => Math.abs(e) <= 1).length / errs.length;
  assert.ok(Math.abs(bias) <= 0.6, `mean signed error ${bias.toFixed(2)} — the model has drifted biased`);
  assert.ok(within1 >= 0.6, `only ${(within1 * 100).toFixed(0)}% within ±1 — accuracy floor breached`);
});

test("overallCR: the public helper equals the inline round(avg(off,def)) blend the read-out consumes", () => {
  // overallCR(m) is what the Forge CR read-out band (T1.7) reports; it must match the exact blend the
  // grader and the fixtures above compute, or the on-screen CR would diverge from the graded model.
  for (const f of FIXTURES) {
    const m = build(f.m);
    const r = ev(`(()=>{const m=${m};const r=overallCR(m),o=offensiveCR(m),d=defensiveCR(m);`
      + `return {idx:r.idx,cr:r.cr,inline:Math.round((o.idx+d.idx)/2),offIdx:r.off.idx,defIdx:r.def.idx,conf:r.confidence,offConf:o.confidence};})()`);
    assert.equal(r.idx, r.inline, `${f.label}: overallCR idx ${r.idx} ≠ inline blend ${r.inline}`);
    assert.equal(r.cr, ev(`CR_LIST[${r.idx}]`), `${f.label}: overallCR cr/idx mismatch`);
    assert.equal(r.conf, r.offConf, `${f.label}: overallCR confidence must be the offensive half's`);
  }
});

test("scaleMonster: preserve-character scaling tracks the target monotonically and stays close for balanced builds", () => {
  // Preserve-character (× expected-ratio) keeps a creature's proportional deviation, so the scaled read
  // equals the target only for a creature that already reads at its label; a below/above-average one
  // stays below/above. The invariants that MUST hold: (1) scaling up raises the read and scaling down
  // lowers it (monotonic — the dial always moves the CR the right way); (2) a creature that reads at its
  // own label lands within ±1 of a nearby target. This is the committed floor; grade-corpus.mjs checks
  // the distribution at scale.
  const readIdx = (mObj, tgt) => ev(`(()=>{const s=scaleMonster(${mObj},${JSON.stringify(tgt)});return s?overallCR(s).idx:null;})()`);
  const top = idxOf("30");
  let balancedChecks = 0;
  for (const f of FIXTURES) {
    const orig = blendIdx(build(f.m));
    if (orig.conf !== "ok") continue;
    const li = idxOf(f.cr), self = orig.blend;
    const upCR = CR_LIST_at(Math.min(li + 3, top)), downCR = CR_LIST_at(Math.max(li - 3, 0));
    const up = readIdx(build(f.m), upCR), down = readIdx(build(f.m), downCR);
    assert.ok(up >= self, `${f.label}: scaling up to ${upCR} must not lower the read (${up} < ${self})`);
    assert.ok(down <= self, `${f.label}: scaling down to ${downCR} must not raise the read (${down} > ${self})`);
    // if the fixture reads at its own label, a modest 2-step scale should land within ±1
    if (orig.blend === li) {
      const near = CR_LIST_at(Math.min(li + 2, top));
      const r = readIdx(build(f.m), near);
      assert.ok(Math.abs(r - idxOf(near)) <= 1, `${f.label} (reads at label) scaled to ${near}: idx ${r} vs ${idxOf(near)}`);
      balancedChecks++;
    }
  }
  assert.ok(balancedChecks >= 1, `expected at least one balanced-fixture scaling check, ran ${balancedChecks}`);
});
const CR_LIST_at = (i) => ev(`CR_LIST[${i}]`);

test("scaleMonster: scaling to the same CR is a no-op, and off-ladder targets return null", () => {
  const noop = ev(`(()=>{const m=${build({ cr: "5", hp: 100, ac: 15, actions: [{ mode: "text", name: "Slam", text: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 14 (2d10 + 3) Bludgeoning damage." }] })};`
    + `const s=scaleMonster(m,"5");return {hp:s.hp,ac:s.ac,cr:s.cr,txt:s.actions[0].text};})()`);
  assert.equal(noop.cr, "5");
  assert.equal(noop.hp, 100, "same-CR scale must not move HP");
  assert.equal(noop.ac, 15, "same-CR scale must not move AC");
  assert.equal(noop.txt, "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 14 (2d10 + 3) Bludgeoning damage.",
    "same-CR scale must not rewrite entry text");
  assert.equal(ev(`scaleMonster(${build({ cr: "5", hp: 100 })},"99")`), null, "off-ladder target → null");
});

test("scaleMonster: a save DC embedded in an attack's extra rider shifts with the target CR", () => {
  // Review fix (Phase-1 close): the attack branch scaled rider DICE but left rider DCs frozen at the
  // source CR (Wolf's "Prone condition (DC 11 Str save negates)"), while text-mode entries shifted.
  // Both free-text carriers now go through the same scaleRider pass.
  const r = ev(`(()=>{const m=${build({ cr: "1/4", hp: 11, ac: 13, actions: [
    { mode: "attack", name: "Bite", ability: "str", atk: 4, dice: "1d6+2",
      extra: "If the target is a creature, it has the Prone condition (DC 11 Str save negates)." }] })};`
    + `const s=scaleMonster(m,"5"),dc=crExpected("5").dc-crExpected("1/4").dc;`
    + `return {extra:s.actions[0].extra,shift:dc};})()`);
  assert.ok(r.shift > 0, "fixture needs a real DC shift between CR 1/4 and 5");
  assert.ok(r.extra.includes(`DC ${11 + r.shift} `), `rider DC must shift by ${r.shift} (got: ${r.extra})`);
});

test("scaleMonster: auto-delegated AC/HP land on the TARGET's expected values, and an auto-HP dice formula still scales", () => {
  // An auto field (author left it empty, value tracks crExpected) carries zero deviation, so its
  // preserve-character scale IS the target's expected — not the source CR's stale value. B264 audit fix:
  // without this the scaled preview showed the old CR's AC/HP on auto monsters until Save resolved it.
  const r = ev(`(()=>{const m=${build({ cr: "1", ac: 13, hp: 30 })};m._auto={ac:true,hp:true};`
    + `const s=scaleMonster(m,"5"),e=crExpected("5");return {ac:s.ac,hp:s.hp,expAC:e.ac,expHP:e.hpAvg};})()`);
  assert.equal(r.ac, r.expAC, "auto AC must track the target CR's expected AC");
  assert.equal(r.hp, r.expHP, "auto HP must track the target CR's expected average HP");
  const f = ev(`(()=>{const m=${build({ cr: "5", ac: 15, hp: 93, hpf: "12d10 + 24" })};m._auto={hp:true};`
    + `const s=scaleMonster(m,"10");return {hpf:s.hpf,hp:s.hp,avg:exprAvg(s.hpf)};})()`);
  assert.notEqual(f.hpf, "12d10 + 24", "auto-HP dice formula must still be rescaled");
  assert.equal(f.hp, f.avg, "auto HP must equal the scaled formula's average");
});

test("classifyRole: five engineered archetypes land in their locked roles", () => {
  // One fixture per role, each built to sit unambiguously on its role's side of the trade planes
  // (ROLE_CLUSTERS.md): brute = HP-for-AC, skirmisher = AC-for-HP, artillery = damage-first + long
  // range, controller = save-gated conditions + AoE over damage, soldier = at-expectation multiattack.
  // If a retune of the centroids/features flips any of these, that's a regression to investigate.
  const CASES = [
    ["brute", { cr: "2", hp: 68, ac: 11, str: 18, actions: [
      { mode: "text", name: "Greatclub", text: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 13 (2d8 + 4) Bludgeoning damage." }] }],
    ["skirmisher", { cr: "1", hp: 18, ac: 16, dex: 16, spd: { walk: 40 }, actions: [
      { mode: "text", name: "Shortsword", text: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Piercing damage." }] }],
    ["artillery", { cr: "2", hp: 33, ac: 13, dex: 14, actions: [
      { mode: "text", name: "Multiattack", text: "It makes two Bolt attacks." },
      { mode: "text", name: "Bolt", text: "*Ranged Attack Roll:* +5, range 150/600 ft. *Hit:* 13 (2d10 + 2) Piercing damage." }] }],
    ["controller", { cr: "5", hp: 90, ac: 14, wis: 18, actions: [
      { mode: "text", name: "Tentacle", text: "*Melee Attack Roll:* +6, reach 10 ft. *Hit:* 15 (2d10 + 4) Bludgeoning damage. *Constitution Saving Throw:* DC 15. *Failure:* The target has the Restrained condition." },
      { mode: "text", name: "Dread Gaze", text: "*Wisdom Saving Throw:* DC 15, each creature in a 30-foot Cone. *Failure:* 7 (2d6) Psychic damage, and the target has the Frightened condition until the end of its next turn." },
      { mode: "text", name: "Numbing Pulse", text: "*Constitution Saving Throw:* DC 15, one creature within 60 feet. *Failure:* The target has the Stunned condition until the end of its next turn." }] }],
    ["soldier", { cr: "5", hp: 100, ac: 16, str: 18, actions: [
      { mode: "text", name: "Multiattack", text: "It makes two Glaive attacks." },
      { mode: "text", name: "Glaive", text: "*Melee Attack Roll:* +7, reach 10 ft. *Hit:* 18 (3d8 + 5) Slashing damage." }] }],
  ];
  for (const [want, mObj] of CASES) {
    const r = ev(`classifyRole(${build(mObj)})`);
    assert.ok(r, `${want}: classifyRole returned null`);
    assert.equal(r.role, want, `${want} archetype read as ${r.role} (runner-up ${r.runnerUp}, margin ${r.margin?.toFixed(2)})`);
  }
  assert.equal(ev(`classifyRole({...${build({ cr: "5", hp: 90 })},cr:"99"})`), null, "off-ladder CR → null");
});

test("roleOf: a manual override (roleOv) wins over the calculator and keeps the auto read for the tooltip", () => {
  const brute = { cr: "2", hp: 68, ac: 11, str: 18, actions: [
    { mode: "text", name: "Greatclub", text: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 13 (2d8 + 4) Bludgeoning damage." }] };
  const r = ev(`(()=>{const m=${build(brute)};m.id="t-ov";m.roleOv="artillery";const r=roleOf(m);return {role:r.role,manual:!!r.manual,auto:r.auto};})()`);
  assert.equal(r.role, "artillery", "override must win");
  assert.ok(r.manual, "override result must be flagged manual");
  assert.equal(r.auto, "brute", "the calculator's own read must ride along for the tooltip");
  const auto = ev(`(()=>{const m=${build(brute)};m.id="t-ov2";m.roleOv="";return roleOf(m).role;})()`);
  assert.equal(auto, "brute", "empty override = the calculator's read");
});

test("classifyRole: the skirmisher speed gate — slow glass is not a skirmisher unless it has evasion kit", () => {
  // T1.14 benchmark finding: the glass stat-shape alone (AC up, HP down) pulled slow bodies (Azer
  // Sentinel, Troll Limb) into skirmisher; the user's definition is "fast and evasive". Same glass
  // chassis as the skirmisher archetype above, but at walk 25 (below the CR-1 band speed norm):
  const slowGlass = { cr: "1", hp: 18, ac: 16, dex: 16, spd: { walk: 25 }, actions: [
    { mode: "text", name: "Shortsword", text: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Piercing damage." }] };
  const gated = ev(`classifyRole(${build(slowGlass)})`);
  assert.notEqual(gated.role, "skirmisher", `slow glass with no evasion kit must not read skirmisher (got ${gated.role})`);
  // …but the same slow body with a bonus-action escape (2024 Nimble Escape phrasing: the bonus
  // section text does NOT contain the words "Bonus Action") keeps skirmisher eligibility:
  const nimble = { ...slowGlass, bonus: [
    { mode: "text", name: "Nimble Escape", text: "It takes the Disengage or Hide action." }] };
  const kept = ev(`classifyRole(${build(nimble)})`);
  assert.equal(kept.role, "skirmisher", `slow glass WITH evasion kit should read skirmisher (got ${kept.role})`);
});

test("confidence: a damage-dealing monster grades ok; a pure controller flags low/none", () => {
  // a monster whose only action deals no rollable damage should not silently read as high-confidence 0
  const controller = blendIdx(build({ cr: "5", hp: 93, ac: 15,
    actions: [{ mode: "text", name: "Hypnotic Gaze", text: "*Wisdom Saving Throw:* DC 14. *Failure:* The target has the Charmed condition." }] }));
  assert.notEqual(controller.conf, "ok", "a damage-free controller must not report ok confidence");
});
