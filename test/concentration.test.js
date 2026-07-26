// Behavior floor for T2.4 concentration (combat.js): the effect→source link (`concBy`), the break
// cascade (breakConcentrationOn / dropLinkedEffects), the damage→CON-prompt queue in changeHP (DC
// max(10, ⌊lost/2⌋); temp loss counts; 0 HP drops without a save), conc-prompt pruning, and the
// conc branch of the prompt resolver. Same realm/JSON-normalize pattern as duration-engine.test.js.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });
const ev = (expr) => { const v = evalIn(window, expr); return v !== null && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v; };

// Caster c1 concentrates on Bless (two targets) while t1 also suffers an unlinked Poisoned.
const CB = `{prompts:[],round:1,turnIndex:0,order:[
  {id:"c1",name:"Cleric",status:"active",concentration:true,conditions:[]},
  {id:"t1",name:"Fighter",status:"active",conditions:[{name:"Bless",effGroup:"spell",rounds:0,concBy:"c1"},{name:"Poisoned",rounds:0}]},
  {id:"t2",name:"Rogue",status:"active",conditions:[{name:"Bless",effGroup:"spell",rounds:0,concBy:"c1"}]}
]}`;

// ── the link + the cascade ───────────────────────────────────────────────────
test("dropLinkedEffects: removes only the source's linked effects; exceptName spares same-name", () => {
  const all = ev(`(()=>{const cb=${CB};const gone=dropLinkedEffects(cb,"c1");return {gone,t1:cb.order[1].conditions.map(c=>c.name),t2:cb.order[2].conditions.map(c=>c.name)};})()`);
  assert.deepEqual(all.gone, ["Fighter: Bless", "Rogue: Bless"]);
  assert.deepEqual(all.t1, ["Poisoned"], "the unlinked condition survives");
  assert.deepEqual(all.t2, []);
  const spared = ev(`(()=>{const cb=${CB};const gone=dropLinkedEffects(cb,"c1","Bless");return gone.length;})()`);
  assert.equal(spared, 0, "a re-cast of the same spell spares its own multi-target siblings");
});

test("breakConcentrationOn: flag off, linked effects end, that owner's conc prompts clear", () => {
  const r = ev(`(()=>{const cb=${CB};
    cb.prompts.push({id:"p1",kind:"conc",itId:"c1",dc:10,round:1},{id:"p2",kind:"save",itId:"t1",name:"Poisoned",effGroup:null,abil:"con",dc:11,round:1});
    const gone=breakConcentrationOn(cb,cb.order[0]);
    return {gone,conc:cb.order[0].concentration,prompts:cb.prompts.map(p=>p.id)};})()`);
  assert.equal(r.conc, false);
  assert.deepEqual(r.gone, ["Fighter: Bless", "Rogue: Bless"]);
  assert.deepEqual(r.prompts, ["p2"], "only the broken caster's conc prompts are culled");
});

// ── damage → CON prompt (via a real combat ctx so changeHP can reach the queue) ──
test("changeHP: damage while concentrating queues the CON prompt; DC = max(10, half the loss)", () => {
  const r = ev(`(()=>{
    const it={id:"c1",kind:"quick",name:"Cleric",hpMax:30,hpCur:30,hpTemp:4,status:"active",concentration:true,conditions:[]};
    const cb={round:3,turnIndex:0,order:[it],prompts:[]};
    state.adv.push({id:"tA",name:"t",party:[],scenes:[],encounters:[{id:"tE",combatants:[],status:"active",combat:cb}]});
    const oldCtx=combatCtx;combatCtx={advId:"tA",encId:"tE"};
    changeHP(it,26);            // 4 temp + 22 HP = 26 lost → DC 13
    changeHP(it,-5);            // healing never prompts
    const afterDmg=cb.prompts.map(p=>({kind:p.kind,dc:p.dc,round:p.round}));
    changeHP(it,3);             // 3 lost → floor is DC 10
    const small=cb.prompts.length;
    changeHP(it,999);           // drops to 0 → concentration just ends, no new prompt (B127)
    const out={afterDmg,small,atZero:cb.prompts.length,conc:it.concentration};
    combatCtx=oldCtx;state.adv=state.adv.filter(a=>a.id!=="tA");
    return out;})()`);
  assert.deepEqual(r.afterDmg, [{ kind: "conc", dc: 13, round: 3 }], "temp-HP loss counts as damage taken");
  assert.equal(r.small, 2, "each damage event is its own save; small hits floor at DC 10");
  assert.equal(r.atZero, 0, "hitting 0 clears the pending prompts (breakConcentrationOn) and queues none");
  assert.equal(r.conc, false, "down drops concentration outright");
});

test("concCheckPrompt (the B124 inline prompt) uses the same DC formula", () => {
  assert.equal(ev(`concCheckPrompt({kind:"quick"},26).dc`), 13);
  assert.equal(ev(`concCheckPrompt({kind:"quick"},3).dc`), 10);
});

// ── pruning + resolution ─────────────────────────────────────────────────────
test("prunePrompts: a conc prompt lives on the flag, not a condition", () => {
  const r = ev(`(()=>{const cb=${CB};cb.prompts.push({id:"p1",kind:"conc",itId:"c1",dc:10,round:1});
    prunePrompts(cb);const kept=cb.prompts.length;
    cb.order[0].concentration=false;prunePrompts(cb);
    return {kept,after:cb.prompts.length};})()`);
  assert.equal(r.kept, 1, "valid while the owner is concentrating");
  assert.equal(r.after, 0, "culled once the flag drops by any path");
});

test("resolvePromptOn: conc affirm breaks with the cascade; not-affirmed leaves everything", () => {
  const broken = ev(`(()=>{const cb=${CB};cb.prompts.push({id:"p1",kind:"conc",itId:"c1",dc:12,round:1});
    const res=resolvePromptOn(cb,"p1",true);
    return {gone:res.gone,conc:cb.order[0].concentration,t2:cb.order[2].conditions.length};})()`);
  assert.deepEqual(broken.gone, ["Fighter: Bless", "Rogue: Bless"]);
  assert.equal(broken.conc, false);
  assert.equal(broken.t2, 0);
  const held = ev(`(()=>{const cb=${CB};cb.prompts.push({id:"p1",kind:"conc",itId:"c1",dc:12,round:1});
    resolvePromptOn(cb,"p1",false);
    return {conc:cb.order[0].concentration,prompts:cb.prompts.length,t2:cb.order[2].conditions.length};})()`);
  assert.equal(held.conc, true);
  assert.equal(held.prompts, 0, "the prompt clears either way");
  assert.equal(held.t2, 1);
});

test("applyPlayerEdit standalone (no combat ctx): a conc-off edit still flips the flag", () => {
  const it = ev(`(()=>{const it={id:"x",kind:"pc",hpMax:20,hpCur:20,hpTemp:0,conditions:[],status:"active",concentration:true};
    applyPlayerEdit(it,{concentration:false});return it;})()`);
  assert.equal(it.concentration, false);
});
