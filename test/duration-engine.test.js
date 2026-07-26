// Behavior floor for the T2.3 duration engine (combat.js) over the T2.2 payloads (data.js).
// Locks: mech resolution (effectMechOf/saveEndsEdge incl. the "Slow" mastery/spell collision), the
// save-ends prompt queue (edge + owner match, dedup, dead-skip), pointer-style pruning, resolution
// semantics (success removes the tracked effect, failure only clears the prompt), the legacy-condition
// migration, and the generalized save-bonus read. All exercised in the booted realm; objects are
// JSON-normalized (cross-realm prototypes fail strict deepEqual — see effect-mech.test.js).
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });
const ev = (expr) => { const v = evalIn(window, expr); return v !== null && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v; };

// A minimal combat object: Goblin holds two effects (one save-ends, one plain), the Knight none.
const CB = `{prompts:[],round:2,turnIndex:0,order:[
  {id:"g1",name:"Goblin",status:"active",conditions:[{name:"Hold Person",rounds:0,dc:13},{name:"Poisoned",rounds:0}]},
  {id:"k1",name:"Knight",status:"active",conditions:[]}
]}`;

// ── mech resolution ──────────────────────────────────────────────────────────
test("effectMechOf: curated effect, condition (case-insensitive), and unknown name", () => {
  assert.equal(ev(`effectMechOf("Hold Person").save.abil`), "wis");
  assert.ok(ev(`effectMechOf("poisoned").atoms.length`) >= 1, "condition payload found case-insensitively");
  assert.equal(ev(`String(effectMechOf("Totally Made Up"))`), "null", "no payload → null (degrades to manual)");
});

test("effectMechOf: the Slow mastery/spell collision resolves by group", () => {
  assert.equal(ev(`String(effectMechOf("Slow","mastery").save)`), "undefined", "the mastery has no repeat save");
  assert.equal(ev(`effectMechOf("Slow","spell").save.abil`), "wis", "the spell repeats a WIS save");
});

test("saveEndsEdge: end-of-turn for save-ends effects, null otherwise", () => {
  assert.equal(ev(`saveEndsEdge("Hold Person")`), "end");
  assert.equal(ev(`String(saveEndsEdge("Bless"))`), "null");
  assert.equal(ev(`String(saveEndsEdge("Prone"))`), "null");
});

// ── prompt queueing ──────────────────────────────────────────────────────────
test("queueSavePrompts: fires only at the owner's own matching edge, and dedups", () => {
  const cb = ev(`(()=>{const cb=${CB};
    queueSavePrompts(cb,cb.order[0],"start");   // wrong edge → nothing
    queueSavePrompts(cb,cb.order[1],"end");     // wrong owner → nothing
    queueSavePrompts(cb,cb.order[0],"end");     // fires
    queueSavePrompts(cb,cb.order[0],"end");     // duplicate → skipped
    return cb;})()`);
  assert.equal(cb.prompts.length, 1, "exactly one prompt (edge+owner matched once, dedup held)");
  const p = cb.prompts[0];
  assert.equal(p.kind, "save");
  assert.equal(p.itId, "g1");
  assert.equal(p.name, "Hold Person");
  assert.equal(p.abil, "wis");
  assert.equal(p.dc, 13, "the instance's DC rides onto the prompt");
});

test("queueSavePrompts: a dead owner is skipped; a plain condition never prompts", () => {
  const cb = ev(`(()=>{const cb=${CB};cb.order[0].status="dead";
    queueSavePrompts(cb,cb.order[0],"end");return cb;})()`);
  assert.equal(cb.prompts.length, 0);
  const cb2 = ev(`(()=>{const cb=${CB};cb.order[0].conditions=[{name:"Poisoned",rounds:0}];
    queueSavePrompts(cb,cb.order[0],"end");return cb;})()`);
  assert.equal(cb2.prompts.length, 0, "Poisoned has no save descriptor");
});

// ── pruning + resolution ─────────────────────────────────────────────────────
test("prunePrompts: drops prompts whose condition or owner is gone", () => {
  const cb = ev(`(()=>{const cb=${CB};queueSavePrompts(cb,cb.order[0],"end");
    cb.order[0].conditions=cb.order[0].conditions.filter(c=>c.name!=="Hold Person"); // cured by hand
    prunePrompts(cb);return cb;})()`);
  assert.equal(cb.prompts.length, 0);
});

test("resolvePromptOn: success removes the tracked effect, failure keeps it", () => {
  const ok = ev(`(()=>{const cb=${CB};queueSavePrompts(cb,cb.order[0],"end");
    resolvePromptOn(cb,cb.prompts[0].id,true);return cb;})()`);
  assert.equal(ok.prompts.length, 0);
  assert.deepEqual(ok.order[0].conditions.map(c => c.name), ["Poisoned"], "only the saved-against effect is removed");
  const keep = ev(`(()=>{const cb=${CB};queueSavePrompts(cb,cb.order[0],"end");
    resolvePromptOn(cb,cb.prompts[0].id,false);return cb;})()`);
  assert.equal(keep.prompts.length, 0, "the prompt clears either way");
  assert.equal(keep.order[0].conditions.length, 2, "a failed save leaves the effect running");
});

// ── migration + add-time defaults ────────────────────────────────────────────
test("migrateCombat: legacy string conditions and junk rounds normalize; prompts default", () => {
  const cb = ev(`(()=>{const cb={round:1,turnIndex:0,order:[
      {id:"a",name:"X",conditions:["Prone",{name:"Poisoned",rounds:"3"},{rounds:2},null]},
      {id:"b",name:"Y",conditions:"junk"}]};
    migrateCombat(cb);return cb;})()`);
  assert.ok(Array.isArray(cb.prompts), "prompts queue is defaulted");
  assert.deepEqual(cb.order[0].conditions, [{ name: "Prone", rounds: 0 }, { name: "Poisoned", rounds: 3 }],
    "strings become objects, rounds coerce, nameless/null entries drop");
  assert.deepEqual(cb.order[1].conditions, [], "a non-array conditions field resets");
});

test("addCombatCond defaults the tick edge from the save descriptor (via saveEndsEdge)", () => {
  // The defaulting rule itself: no explicit timing + a save-ends effect → endWhen "end". Locked at the
  // helper level (addCombatCond needs a live combat ctx); the wiring is one guarded line in combat.js.
  assert.equal(ev(`saveEndsEdge("Slow","spell")`), "end");
  assert.equal(ev(`String(saveEndsEdge("Slow","mastery"))`), "null");
});

// ── save bonus ───────────────────────────────────────────────────────────────
test("combatSaveBonus: monster from the statblock (proficiency counts), unknown kinds null", () => {
  const b = ev(`(()=>{state.lib.push({id:"tm1",name:"T",cr:"5",con:16,wis:10,saves:["con"]});
    const it={kind:"monster",srcId:"tm1"};
    const out={con:combatSaveBonus(it,"con"),wis:combatSaveBonus(it,"wis"),quick:combatSaveBonus({kind:"quick"},"wis")};
    state.lib=state.lib.filter(m=>m.id!=="tm1");return out;})()`);
  assert.equal(b.con, 6, "CON +3 mod +3 PB (proficient at CR 5)");
  assert.equal(b.wis, 0, "non-proficient save is the bare mod");
  assert.equal(b.quick, null, "quick-add combatants have no derivable save");
});
