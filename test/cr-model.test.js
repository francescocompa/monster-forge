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

test("confidence: a damage-dealing monster grades ok; a pure controller flags low/none", () => {
  // a monster whose only action deals no rollable damage should not silently read as high-confidence 0
  const controller = blendIdx(build({ cr: "5", hp: 93, ac: 15,
    actions: [{ mode: "text", name: "Hypnotic Gaze", text: "*Wisdom Saving Throw:* DC 14. *Failure:* The target has the Charmed condition." }] }));
  assert.notEqual(controller.conf, "ok", "a damage-free controller must not report ok confidence");
});
