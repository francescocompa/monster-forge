// Schema-integrity floor for the T2.2 effect payloads (DEVELOPMENT.md "The effect schema").
// These tests lock the SHAPE contract — every atom kind and `if` term is in the closed vocabulary,
// the condition table covers exactly the 15 XPHB 2024 conditions, and a handful of load-bearing
// payloads (Paralyzed, Hold Person, Poisoned) match the rules text they were transcribed from.
// The engine consumers (T2.3+) get their own behavior tests; this is the data floor they stand on.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });
// JSON-normalize: evalIn returns realm-side objects whose prototypes fail strict deepEqual here
const ev = (expr) => { const v = evalIn(window, expr); return v !== null && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v; };

const XPHB_CONDITIONS = ["Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained",
  "Stunned", "Unconscious"];

test("CONDITION_MECH covers exactly the 15 XPHB 2024 conditions", () => {
  const keys = ev(`Object.keys(CONDITION_MECH).sort()`);
  assert.deepEqual(keys, [...XPHB_CONDITIONS].sort());
});

test("every atom everywhere uses only the closed vocabularies (kinds, if-terms, who)", () => {
  const bad = ev(`(()=>{
    const kinds=new Set(EFFECT_ATOM_KINDS),ifs=new Set(EFFECT_IF_TERMS),whos=new Set(["self","attackers","source"]);
    const out=[];
    const check=(owner,mech)=>{
      if(!mech)return;
      (mech.atoms||[]).forEach(a=>{
        if(!kinds.has(a.k))out.push(owner+": unknown kind "+a.k);
        if(a.if&&!ifs.has(a.if))out.push(owner+": unknown if-term "+a.if);
        if(a.who&&!whos.has(a.who))out.push(owner+": unknown who "+a.who);
        if(a.k==="note"&&!a.text)out.push(owner+": note without text");
      });
      if(mech.save&&mech.save.onSuccess!=="end")out.push(owner+": unsupported save.onSuccess");
      (mech.implies||[]).forEach(n=>{if(!(n in CONDITION_MECH))out.push(owner+": implies unknown condition "+n);});
      (mech.end&&mech.end.on||[]).forEach(t=>{if(!["attacks","casts","dealsDamage"].includes(t))out.push(owner+": unknown end trigger "+t);});
    };
    Object.entries(CONDITION_MECH).forEach(([n,m])=>check("cond:"+n,m));
    CURATED_EFFECTS.forEach(e=>check(e.group+":"+e.name,e.mech));
    return out;})()`);
  assert.deepEqual(bad, [], `vocabulary violations:\n${bad.join("\n")}`);
});

test("every curated effect carries a payload, and concentration flags match the text", () => {
  const misses = ev(`CURATED_EFFECTS.filter(e=>!e.mech).map(e=>e.name)`);
  assert.deepEqual(misses, [], "curated effects missing mech");
  const concMismatch = ev(`CURATED_EFFECTS
    .filter(e=>/Concentration/i.test(e.text)!==!!(e.mech&&e.mech.conc))
    .map(e=>e.group+":"+e.name)`);
  assert.deepEqual(concMismatch, [], "conc flag disagrees with the effect text");
});

test("load-bearing payloads match the 2024 rules text", () => {
  // Paralyzed: implies Incapacitated; speed 0; auto-fails STR/DEX saves; attackers advantage;
  // auto-crit within 5 ft. (XPHB, transcribed in T2.2.)
  const par = ev(`CONDITION_MECH.Paralyzed`);
  assert.deepEqual(par.implies, ["Incapacitated"]);
  const kinds = par.atoms.map(a => a.k).sort();
  assert.deepEqual(kinds, ["adv", "autocrit", "autofail", "autofail", "speed"].sort());
  assert.ok(par.atoms.some(a => a.k === "autocrit" && a.if === "melee5"), "auto-crit is melee-5ft gated");
  assert.ok(par.atoms.some(a => a.k === "speed" && a.set === 0), "speed is set to 0");
  // Poisoned: disadvantage on attacks AND checks, nothing else.
  const poi = ev(`CONDITION_MECH.Poisoned.atoms.map(a=>a.k+":"+a.on).sort()`);
  assert.deepEqual(poi, ["dis:attack", "dis:check"]);
  // Hold Person: rides concentration, implies Paralyzed, repeat WIS save at end of turn ends it.
  const hp = ev(`findCuratedEffect("Hold Person","spell").mech`);
  assert.ok(hp.conc, "Hold Person is concentration");
  assert.deepEqual(hp.implies, ["Paralyzed"]);
  assert.deepEqual(hp.save, { abil: "wis", when: "end", who: "self", onSuccess: "end" });
  // Exhaustion: per-level scaling on the d20 penalty and the speed reduction.
  const ex = ev(`CONDITION_MECH.Exhaustion.atoms.filter(a=>a.perLevel).map(a=>a.k+":"+a.delta).sort()`);
  assert.deepEqual(ex, ["bonus:-2", "speed:-5"]);
});

test("the T2.9 control-weight map scores every atom kind", () => {
  const missing = ev(`EFFECT_ATOM_KINDS.filter(k=>k!=="speed"&&!(k in EFFECT_CONTROL_W))`);
  assert.deepEqual(missing, [], "atom kinds without a control weight");
  const speedSplit = ev(`["speedZero","speedPartial"].every(k=>k in EFFECT_CONTROL_W)`);
  assert.ok(speedSplit, "speed must be weighted as speedZero/speedPartial");
});
