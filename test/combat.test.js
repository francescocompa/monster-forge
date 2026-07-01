// Trust-boundary + clamp tests for the combat sharing layer (combat.js). Player devices push edits over an
// open Firebase path, so `_pmSafeRoll` (roll-event sanitizer, the B250 XSS fix) and `applyPlayerEdit` (HP/
// condition apply) are the two functions that must never trust their input. Exercised in the booted realm so
// a regression here — e.g. someone loosening the sanitizer — fails in CI, not on a live shared fight.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });

const evj = (expr) => JSON.parse(evalIn(window, expr));
const call = (expr) => evj(`JSON.stringify(${expr})`);

// ── _pmSafeRoll: the untrusted-roll sanitizer ────────────────────────────────
test("_pmSafeRoll: an HTML-in-total payload is coerced to a number", () => {
  const r = call(`_pmSafeRoll({id:"ok-1",total:"<img src=x onerror=alert(1)>"})`);
  assert.equal(r.total, 0, "non-numeric total → 0 (never a string that could carry markup)");
  assert.equal(typeof r.total, "number");
});

test("_pmSafeRoll: a broken/attribute-injecting id is rejected outright", () => {
  assert.equal(evalIn(window, `String(_pmSafeRoll({id:'a" onx="y',total:5}))`), "null");
  assert.equal(evalIn(window, `String(_pmSafeRoll({id:"",total:5}))`), "null", "empty id rejected");
  assert.equal(evalIn(window, `String(_pmSafeRoll({total:5}))`), "null", "missing id rejected");
});

test("_pmSafeRoll: type and abil are whitelisted (they flow into unescaped CSS classes)", () => {
  const r = call(`_pmSafeRoll({id:"ok-2",total:5,type:'"><script>',abil:"zz"})`);
  assert.equal(r.type, null, "unknown roll type → null");
  assert.equal(r.abil, null, "unknown ability → null");
});

test("_pmSafeRoll: valid fields pass through, free-text is clamped", () => {
  const r = call(`_pmSafeRoll({id:"ok-3",total:7,type:"damage",abil:"str",label:"Fire Bolt",parts:"1d10:[7]",by:"Ann",crit:true})`);
  assert.equal(r.total, 7);
  assert.equal(r.type, "damage");
  assert.equal(r.abil, "str");
  assert.equal(r.label, "Fire Bolt");
  assert.equal(r.by, "Ann");
  assert.equal(r.crit, true);
  const long = call(`_pmSafeRoll({id:"ok-4",total:1,label:"${"x".repeat(500)}"})`);
  assert.ok(long.label.length <= 120, "over-long label is clamped");
});

test("_pmSafeRoll: a non-object is rejected", () => {
  assert.equal(evalIn(window, `String(_pmSafeRoll(null))`), "null");
  assert.equal(evalIn(window, `String(_pmSafeRoll("nope"))`), "null");
});

// ── applyPlayerEdit: HP/temp clamps + condition reconcile ─────────────────────
test("applyPlayerEdit: HP is clamped to [0, hpMax]", () => {
  const hi = call(`(()=>{const it={id:"x",kind:"pc",hpMax:20,hpCur:20,hpTemp:0,conditions:[],status:"active"};applyPlayerEdit(it,{hp:999});return it;})()`);
  assert.equal(hi.hpCur, 20, "over-max HP clamps down to hpMax");
  const lo = call(`(()=>{const it={id:"x",kind:"pc",hpMax:20,hpCur:20,hpTemp:0,conditions:[],status:"active"};applyPlayerEdit(it,{hp:-5});return it;})()`);
  assert.equal(lo.hpCur, 0, "negative HP clamps up to 0");
});

test("applyPlayerEdit: temp HP cannot go negative", () => {
  const it = call(`(()=>{const it={id:"x",kind:"pc",hpMax:20,hpCur:10,hpTemp:5,conditions:[],status:"active"};applyPlayerEdit(it,{temp:-3});return it;})()`);
  assert.equal(it.hpTemp, 0);
});

test("applyPlayerEdit: conditions reconcile by name, keeping DM-set durations", () => {
  const it = call(`(()=>{const it={id:"x",kind:"pc",hpMax:20,hpCur:20,hpTemp:0,conditions:[{name:"Prone",rounds:3}],status:"active"};applyPlayerEdit(it,{conds:["Prone","Poisoned"]});return it;})()`);
  const prone = it.conditions.find((c) => c.name === "Prone");
  const poisoned = it.conditions.find((c) => c.name === "Poisoned");
  assert.equal(prone.rounds, 3, "an existing condition keeps its DM-set duration");
  assert.ok(poisoned, "a new condition is added");
  assert.equal(it.conditions.length, 2, "conditions replaced exactly by the pushed set");
});

test("applyPlayerEdit: an out-of-range status is ignored", () => {
  const it = call(`(()=>{const it={id:"x",kind:"pc",hpMax:20,hpCur:20,hpTemp:0,conditions:[],status:"active"};applyPlayerEdit(it,{status:"bogus"});return it;})()`);
  assert.equal(it.status, "active", "unknown status left unchanged");
});
