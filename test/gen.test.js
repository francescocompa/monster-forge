// Legality floor for the PC generator v2 (gen.js, D-001…D-014). Locks: table/die integrity (equal-
// weight spans, the locked d12/d10/d20 lists, kit and gear tables), per-score stat rolling, a big
// seeded batch of rules-legal derivations, the spell-table resolution (library ∩ index with index
// fallback), and the D-007 boundary: hostile payloads are rejected or rebuilt clean.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });
const ev = (expr) => { const v = evalIn(window, expr); return v !== null && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v; };
const RNG = `(seed=>{let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})`;

test("locked tables: classes d12, feats d10, legacy cantrips d20, packs d6, two disjoint d20 sundries lists, tools d8, instruments d10", () => {
  const r = ev(`(()=>{
    const legacy=GEN_SPECIES.kobold.tables.find(t=>t.id==="legacy");
    return {cls:GEN_CLASS_LIST,feats:GEN_FEATS.map(f=>f.n),
      can:legacy.entries.find(e=>e.value==="sorcery").sub.entries.length,
      packs:GEN_PACKS.length,sundriesA:GEN_SUNDRIES_A.length,sundriesB:GEN_SUNDRIES_B.length,
      overlap:GEN_SUNDRIES_A.filter(x=>GEN_SUNDRIES_B.includes(x)).length,
      tools:GEN_TOOLS8.length,instr:GEN_INSTR10.length,
      union:GEN_ALL_CANTRIPS.length,
      casters:Object.keys(GEN_CLASS_SPELLS).length};})()`);
  assert.equal(r.cls.length, 12);
  assert.deepEqual([...r.cls].sort(), r.cls);
  assert.equal(r.feats.length, 10);
  assert.deepEqual([...r.feats].sort(), r.feats);
  assert.equal(r.can, 20);
  assert.equal(r.packs, 6);
  assert.equal(r.sundriesA, 20);
  assert.equal(r.sundriesB, 20);
  assert.equal(r.overlap, 0, "the two sundries lists never collide (D-022)");
  assert.equal(r.tools, 8);
  assert.equal(r.instr, 10);
  assert.equal(r.casters, 8);
  assert.ok(r.union > 20, "the any-list cantrip union covers more than one class");
});

test("equal-weight spans (D-011): 2→d4 halves, 3→d6 thirds, 5→d10 fifths; species tables cover their die", () => {
  const r = ev(`(()=>{
    const bad=[];
    for(const [id,p] of Object.entries(GEN_SPECIES))for(const t of (p.tables||[])){
      let cover=0;for(const e of t.entries){if(e.lo>e.hi)bad.push(id+":"+t.id);cover+=e.hi-e.lo+1;}
      if(cover!==t.die)bad.push(id+":"+t.id+":cover");}
    return {s2:genSpanFor(2),s3:genSpanFor(3),s5:genSpanFor(5),s10:genSpanFor(10),bad};})()`);
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.s3, { die: 6, spans: [[1, 2], [3, 4], [5, 6]], reroll: false });
  assert.deepEqual(r.s2.spans, [[1, 2], [3, 4]]);
  assert.deepEqual(r.s5, { die: 10, spans: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]], reroll: false });
  assert.equal(r.s10.die, 10);
});

test("class kits: every class has kits, more for the Fighter than for casters; kit items carry weapon defs", () => {
  const r = ev(`(()=>{
    const out={counts:{},badRefs:[]};
    for(const [c,K] of Object.entries(GEN_CLASSES)){
      out.counts[c]=(K.kits||[]).length;
      (K.kits||[]).forEach(k=>{if(!GEN_AC[k.ac])out.badRefs.push(c+":"+k.n+":ac");
        k.weapons.forEach(w=>{if(!GEN_W[w.w])out.badRefs.push(c+":"+k.n+":"+w.w);});
        if(!k.gear)out.badRefs.push(c+":"+k.n+":gear");});
    }
    return out;})()`);
  assert.deepEqual(r.badRefs, []);
  for (const [c, n] of Object.entries(r.counts)) assert.ok(n >= 3, c + " has at least 3 kits");
  assert.ok(r.counts.Fighter > r.counts.Wizard, "martials carry more kits (D-013)");
  assert.ok(r.counts.Fighter >= 6);
});

test("stats roll one ability at a time, in order, with raw dice kept", () => {
  const r = ev(`(()=>{
    const rng=${RNG}(3);
    const d=genNewDraft({sp:"kobold",set:{stat:"4d6"},counts:{}});
    genRollStep(d,"stats",rng);genRollStep(d,"stats",rng);genRollStep(d,"stats",rng);
    const mid={n:d.steps.stats.rolls.length,partial:!!d.steps.stats.partial,dice:d.steps.stats.rolls[0].length};
    genRollStep(d,"stats",rng);genRollStep(d,"stats",rng);genRollStep(d,"stats",rng);
    return {mid,done:genStepDone(d,"stats"),n:d.steps.stats.rolls.length,
      totals:d.steps.stats.value.length,legal:d.steps.stats.value.every(v=>v>=3&&v<=18)};})()`);
  assert.equal(r.mid.n, 3);
  assert.equal(r.mid.partial, true);
  assert.equal(r.mid.dice, 4);
  assert.equal(r.done, true);
  assert.equal(r.n, 6);
  assert.equal(r.totals, 6);
  assert.equal(r.legal, true);
});

test("seeded batch of 160 full rolls: complete, rules-legal, deterministic, all 12 classes appear", () => {
  const r = ev(`(()=>{
    const out={bad:[],classes:{},total:0};
    for(let seed=1;seed<=160;seed++){
      const rng=${RNG}(seed*7919);
      const d=genNewDraft({sp:"kobold",set:{stat:seed%2?"3d6":"4d6",mode:"plausible",asi:seed%5!==0},counts:{}});
      genRollAll(d,rng);
      genApplyPick(d,"name","Kobold "+seed);
      if(seed%4===0)genApplyPick(d,"quirk","Nota di prova");
      if(!genIsComplete(d)){out.bad.push(seed+":incomplete");continue;}
      const p=genCompletePayload(d);
      const v=validateGenPayload(p);
      if(!v.ok){out.bad.push(seed+":invalid:"+v.err);continue;}
      const ch=deriveGenChar(v.clean);
      if(JSON.stringify(ch)!==JSON.stringify(deriveGenChar(v.clean)))out.bad.push(seed+":nondeterministic");
      out.total++;out.classes[ch.cls]=(out.classes[ch.cls]||0)+1;
      const K=GEN_CLASSES[ch.cls];
      if(ch.hp<1)out.bad.push(seed+":hp");
      const archery=ch.cls==="Fighter"&&p.steps.feature&&p.steps.feature.value==="Archery";
      for(const a of ch.attacks){
        const expected=ch.mods[a.ability]+2+((a.kind==="Ranged"&&archery)?2:0);
        if(a.bonus!==expected)out.bad.push(seed+":atk:"+a.n);
      }
      if(ch.caster){const cm=ch.mods[K.caster.abil];
        if(ch.caster.dc!==10+cm||ch.caster.atk!==2+cm)out.bad.push(seed+":spell");
        const extra=p.steps.feature&&(K.featureOpt&&K.featureOpt.options||[]).some(o=>o.value===p.steps.feature.value&&o.hooks&&o.hooks.extraCantrip)?1:0;
        const tome=p.steps.feature&&p.steps.feature.sub?3:0;
        if(ch.caster.cantrips.length!==K.caster.cantrips+extra+tome)out.bad.push(seed+":cantripN");
        if(ch.caster.prepared.length!==K.caster.prepared+((K.caster.always||[]).length))out.bad.push(seed+":prepN");
        for(const s of ch.caster.prepared.concat(ch.caster.cantrips))if(typeof s!=="string"||!s)out.bad.push(seed+":spellname");
      }
      for(const a of Object.values(ch.scores))if(a<3||a>20)out.bad.push(seed+":score");
      for(const s of ch.saves)if(s.bonus!==ch.mods[s.abil]+2)out.bad.push(seed+":save");
      const names=ch.skills.map(s=>s.n);
      if(new Set(names).size!==names.length)out.bad.push(seed+":dupskill");
      if(ch.cls==="Rogue"&&ch.skills.filter(s=>s.exp).length!==2)out.bad.push(seed+":expertise");
      if(!ch.gear.includes(p.steps.gearPack.value))out.bad.push(seed+":pack");
      for(const su of p.steps.sundries.value)if(!ch.gear.includes(su))out.bad.push(seed+":sundry");
      if(!GEN_SUNDRIES_A.includes(p.steps.sundries.value[0])||!GEN_SUNDRIES_B.includes(p.steps.sundries.value[1]))out.bad.push(seed+":sundrylist");
      if(ch.caster&&!ch.resources.some(x=>x.k==="slots"))out.bad.push(seed+":slots");
      // D-018: no spell name appears twice across sources on one character…
      const allSpells=[]
        .concat(ch.caster?ch.caster.cantrips:[]).concat(ch.caster?ch.caster.prepared:[])
        .concat(ch.sorcery?[ch.sorcery.cantrip]:[])
        .concat((ch.extraCasts||[]).flatMap(x=>x.cantrips.concat([x.spell])));
      if(new Set(allSpells).size!==allSpells.length)out.bad.push(seed+":spelldupe:"+allSpells.join("|"));
      // …and a rolled full caster always knows at least one damage cantrip.
      if(ch.caster&&ch.caster.cantrips.length&&!p.steps.cantrips.pick){
        if(!ch.caster.cantrips.some(n=>GEN_CANTRIP_LINES[n]))out.bad.push(seed+":nodmgcantrip");
      }
      // D-019: spellcasting entries sharing an ability collapse into one.
      const spellEntries=genToMonster(ch).actions.filter(e=>e.mode==="spell");
      const byAbil={};spellEntries.forEach(e=>{const k=e.ability+":"+e.dc+":"+e.atk;byAbil[k]=(byAbil[k]||0)+1;});
      if(Object.values(byAbil).some(n=>n>1))out.bad.push(seed+":unmerged");
    }
    return out;})()`);
  assert.deepEqual(r.bad, []);
  assert.equal(r.total, 160);
  assert.equal(Object.keys(r.classes).length, 12, "all 12 classes appear: " + JSON.stringify(r.classes));
});

test("plausible class maps the d6 equally: 1-2 first, 3-4 second, 5-6 third", () => {
  const r = ev(`(()=>{
    const out=[];
    for(let i=0;i<40;i++){
      const rng=${RNG}(i*31+7);
      const d=genNewDraft({sp:"kobold",set:{},counts:{}});
      for(let k=0;k<6;k++)genRollStep(d,"stats",rng);
      genRollStep(d,"cls",rng);
      const s=d.steps.cls,slot=s.rolls[0]<=2?0:(s.rolls[0]<=4?1:2);
      if(s.value!==s.top3[slot])out.push(i);
    }
    return out;})()`);
  assert.deepEqual(r, []);
});

test("spell tables: empty library falls back to the full index; a cfg table constrains the rolls", () => {
  const r = ev(`(()=>{
    const t=genSpellTables();
    const small={can:{Wizard:["Fire Bolt","Light","Mage Hand","Ray of Frost","Chill Touch","Mind Sliver"]},
                 l1:{Wizard:["Sleep","Shield","Magic Missile","Mage Armor","Grease","Jump","Alarm"]}};
    const d=genNewDraft({sp:"kobold",set:{},counts:{},tables:small});
    genRollAll(d,${RNG}(88));genApplyPick(d,"cls","Wizard");genRollAll(d,${RNG}(89));
    genApplyPick(d,"name","T");
    const p=genCompletePayload(d),v=validateGenPayload(p);
    return {wiz:t.can.Wizard.length,wl1:t.l1.Wizard.length,
      inTable:p.steps.cantrips.value.every(x=>small.can.Wizard.includes(x))&&p.steps.spells.value.every(x=>small.l1.Wizard.includes(x)),
      valid:v.ok};})()`);
  assert.equal(r.wiz, 20, "no uploads → full index");
  assert.equal(r.wl1, 31);
  assert.equal(r.inTable, true, "rolls stay inside the provided cfg table");
  assert.equal(r.valid, true, "cfg-table rolls validate against the index superset");
});

test("Magic Initiate: the list is its own roll; kit comes from that list; validator checks the chain", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});
    genRollAll(d,${RNG}(55));
    genApplyPick(d,"feat","Magic Initiate");
    genRollSub(d,"feat",${RNG}(56));
    genApplyPick(d,"name","T");
    const p=genCompletePayload(d),v=validateGenPayload(p);
    if(!v.ok)return {err:v.err};
    const ch=deriveGenChar(v.clean);
    const sub=p.steps.feat.sub,list=sub.list.value;
    const tam=JSON.parse(JSON.stringify(p));tam.steps.feat.sub.cans.value=["Fireball","Wish"];
    return {list,listOk:["Cleric","Druid","Wizard"].includes(list),
      cansOk:sub.cans.value.every(x=>GEN_CLASS_SPELLS[list][0].includes(x)),
      spOk:GEN_CLASS_SPELLS[list][1].includes(sub.sp.value),
      extra:ch.extraCasts.length===1&&ch.extraCasts[0].cantrips.length===2,
      resMi:ch.resources.some(x=>x.k==="mi"),
      tamOk:validateGenPayload(tam).ok};})()`);
  assert.equal(r.err, undefined);
  assert.equal(r.listOk, true);
  assert.equal(r.cansOk, true);
  assert.equal(r.spOk, true);
  assert.equal(r.extra, true);
  assert.equal(r.resMi, true);
  assert.equal(r.tamOk, false, "off-list feat spells are rejected");
});

test("feature options: Fighter styles are a d10; Warlock Tome forces three extra cantrips; Rogue expertise doubles rolled skills", () => {
  const r = ev(`(()=>{
    const mk=(cls,seed)=>{const d=genNewDraft({sp:"kobold",set:{},counts:{}});
      genRollAll(d,${RNG}(seed));genApplyPick(d,"cls",cls);genRollAll(d,${RNG}(seed+1));
      genApplyPick(d,"name","T");return d;};
    const f=mk("Fighter",70);
    const w=mk("Warlock",80);
    genApplyPick(w,"feature","Pact of the Tome");genRollSub(w,"feature",${RNG}(81));genRollAll(w,${RNG}(82));
    const wp=genCompletePayload(w),wv=validateGenPayload(wp);
    const wch=wv.ok?deriveGenChar(wv.clean):null;
    const ro=mk("Rogue",90);
    const rp=genCompletePayload(ro),rv=validateGenPayload(rp);
    const rch=rv.ok?deriveGenChar(rv.clean):null;
    return {fOpts:GEN_CLASSES.Fighter.featureOpt.options.length,
      fVal:f.steps.feature&&GEN_CLASSES.Fighter.featureOpt.options.some(o=>o.value===f.steps.feature.value),
      tomeOk:wv.ok,tomeCans:wch?wch.caster.cantrips.length:0,
      expOk:rv.ok,exp:rch?rch.skills.filter(s=>s.exp).map(s=>s.n):null,
      own:rp?rp.steps.skills.value:null};})()`);
  assert.equal(r.fOpts, 10);
  assert.equal(r.fVal, true);
  assert.equal(r.tomeOk, true);
  assert.equal(r.tomeCans, 2 + 3, "Warlock knows 2 class + 3 Tome cantrips");
  assert.equal(r.expOk, true);
  assert.equal(r.exp.length, 2);
  for (const s of r.exp) assert.ok(r.own.includes(s), "expertise stays inside the rolled skills");
});

test("feat hooks and subs: Tough +2 HP, Alert +PB init, Crafter tools and Musician instruments roll distinct", () => {
  const r = ev(`(()=>{
    const mk=feat=>{const d=genNewDraft({sp:"kobold",set:{},counts:{}});
      genRollAll(d,${RNG}(11));genApplyPick(d,"feat",feat);
      if(GEN_FEATS.find(x=>x.n===feat).sub)genRollSub(d,"feat",${RNG}(12));
      genApplyPick(d,"name","T");
      return deriveGenChar(validateGenPayload(genCompletePayload(d)).clean);};
    const base=mk("Savage Attacker"),tough=mk("Tough"),alert=mk("Alert"),crafter=mk("Crafter"),mus=mk("Musician");
    const cTools=crafter.tools.filter(t=>GEN_TOOLS8.includes(t));
    return {hpBase:base.hp,hpTough:tough.hp,initBase:base.init,initAlert:alert.init,
      cTools:cTools.length,cDistinct:new Set(cTools).size,
      mus:(mus.traits.find(t=>t.n.includes("Musician"))||{}).t||""};})()`);
  assert.equal(r.hpTough, r.hpBase + 2);
  assert.equal(r.initAlert, r.initBase + 2);
  assert.equal(r.cTools, 3);
  assert.equal(r.cDistinct, 3);
  assert.ok(/Instruments: /.test(r.mus), "musician trait lists the rolled instruments");
});

test("D-007 boundary: hostile payloads rejected; identity cleaned; stale fields dropped", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});
    genRollAll(d,${RNG}(21));genApplyPick(d,"name","Sgrizzo");
    const good=genCompletePayload(d);
    const T=x=>JSON.parse(JSON.stringify(x));
    const t1=T(good);t1.steps.cls.value="Godzilla";
    const t2=T(good);t2.steps.stats.rolls[0]=[9,9,9];
    const t3=T(good);t3.steps.skills.value=[t3.steps.skills.value[0],t3.steps.skills.value[0]];
    const t4=T(good);if(t4.steps.spells)t4.steps.spells.value=["Wish","Meteor Swarm"];else t4.steps.equip.value=99;
    const t5=T(good);t5.steps.sundries.value=["Rope (50 ft.)","Rope (50 ft.)"];
    const t6=T(good);delete t6.steps.name;
    const t7=T(good);t7.steps.quirk={pick:true,value:"<img onerror=x>"+"y".repeat(200)};
    const t8=T(good);t8.steps.last={pick:true,value:"ghost field"};
    const v7=validateGenPayload(t7),v8=validateGenPayload(t8);
    return {v1:validateGenPayload(t1).ok,v2:validateGenPayload(t2).ok,v3:validateGenPayload(t3).ok,
      v4:validateGenPayload(t4).ok,v5:validateGenPayload(t5).ok,v6:validateGenPayload(t6).ok,
      q:v7.ok?v7.clean.steps.quirk.value:null,
      lastDropped:v8.ok&&!("last" in v8.clean.steps)};})()`);
  assert.equal(r.v1, false);
  assert.equal(r.v2, false);
  assert.equal(r.v3, false);
  assert.equal(r.v4, false);
  assert.equal(r.v5, false);
  assert.equal(r.v6, false, "a payload without a name is rejected");
  assert.ok(r.q && !r.q.includes("<") && r.q.length <= 90);
  assert.equal(r.lastDropped, true, "removed identity fields do not survive validation");
});

test("statblock conversion: attack entries are real mode:attack, casters get a mode:spell group list, resources land", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});
    genRollAll(d,${RNG}(77));genApplyPick(d,"cls","Wizard");genRollAll(d,${RNG}(78));
    genApplyPick(d,"cantrips",["Fire Bolt","Mage Hand","Light"]);
    genApplyPick(d,"name","T");
    const ch=deriveGenChar(validateGenPayload(genCompletePayload(d)).clean);
    const m=genToMonster(ch);
    const fb=m.actions.find(a=>a.name==="Fire Bolt (Cantrip)");
    const sc=m.actions.find(a=>a.mode==="spell");
    const wpn=m.actions.find(a=>a.mode==="attack"&&!/Cantrip/.test(a.name));
    const barb=(()=>{const b=genNewDraft({sp:"kobold",set:{},counts:{}});
      genRollAll(b,${RNG}(95));genApplyPick(b,"cls","Barbarian");genRollAll(b,${RNG}(96));
      genApplyPick(b,"feat","Lucky");genApplyPick(b,"name","B");
      return deriveGenChar(validateGenPayload(genCompletePayload(b)).clean);})();
    return {fbMode:fb&&fb.mode,fbAtk:fb&&fb.atk===ch.caster.atk,
      scOk:!!(sc&&sc.dc===ch.caster.dc&&Array.isArray(sc.groups)&&sc.groups.length>=2),
      slotLine:sc&&sc.groups[sc.groups.length-1].freq,
      wpnOk:!!(wpn&&typeof wpn.atk==="number"&&wpn.dice),
      bonusNames:genToMonster(barb).bonus.map(b=>b.name),
      barbRes:barb.resources.map(x=>x.k).sort(),
      init:String(genToMonster(barb).init)===String(barb.init)};})()`);
  assert.equal(r.fbMode, "attack");
  assert.equal(r.fbAtk, true, "cantrip attack line carries the spell attack bonus");
  assert.equal(r.scOk, true, "Spellcasting is a real mode:spell entry with dc/atk overrides");
  assert.ok(/Level 1 \\(2 slots?, Long Rest\\)/.test(r.slotLine) || /Level 1/.test(r.slotLine), "slots read like character slots: " + r.slotLine);
  assert.equal(r.wpnOk, true);
  assert.ok(r.bonusNames.some(n => /Draconic Cry/.test(n)) && r.bonusNames.some(n => /Rage/.test(n)));
  assert.deepEqual(r.barbRes, ["cry", "luck", "rage"]);
  assert.equal(r.init, true);
});

test("roster bridge: the generated PC normalizes with gen payload, class chip, save profs intact", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});genRollAll(d,${RNG}(31));
    genApplyPick(d,"cls","Paladin");genRollAll(d,${RNG}(32));
    genApplyPick(d,"name","Braciola");genApplyPick(d,"quirk","Conta i gradini");
    const p=genCompletePayload(d),ch=deriveGenChar(validateGenPayload(p).clean);
    const pc=normalizeRosterPC(genToRosterPC(ch,p,"Fra"));
    const f=k=>(pc.fields.find(x=>x.k===k)||{}).v;
    return {hasGen:!!(pc.gen&&pc.gen.payload),cls:f("class"),lvl:f("level"),
      ac:f("ac"),acDerived:String(ch.ac),hp:f("hp"),hpDerived:String(ch.hp),
      wisProf:!!(pc.fields.find(x=>x.k==="wis")||{}).prof,
      notes:pc.notes,player:f("player")};})()`);
  assert.equal(r.hasGen, true);
  assert.deepEqual(r.cls, ["Paladin"]);
  assert.equal(r.lvl, "1");
  assert.equal(r.ac, r.acDerived);
  assert.equal(r.hp, r.hpDerived);
  assert.equal(r.wisProf, true);
  assert.ok(r.notes.includes("Conta i gradini"));
  assert.equal(r.player, "Fra");
});

test("craftiness sub-table rerolls skills the draft already owns", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});
    genRollAll(d,${RNG}(41));
    genApplyPick(d,"cls","Wizard");genRollAll(d,${RNG}(42));
    genApplyPick(d,"skills",["Arcana","Investigation"]);
    genApplyPick(d,"sp:legacy","craftiness");
    genRollSub(d,"sp:legacy",${RNG}(1));
    const v=d.steps["sp:legacy"].sub.value;
    return {v,owned:["Arcana","Investigation"].includes(v)};})()`);
  assert.equal(r.owned, false, "craftiness must not duplicate an owned skill: got " + r.v);
});

// ── v4 round (D-024…D-028) floors ────────────────────────────────────────────

test("D-024: first spell-step roll lands on the Damaging table by default, toggles are honored", () => {
  const r = ev(`(()=>{
    const out=[];
    for(let s=60;s<70;s++){
      const d=genNewDraft({sp:"kobold",set:{},counts:{}});genRollAll(d,${RNG}(s));
      genApplyPick(d,"cls","Wizard");genRollAll(d,${RNG}(s+100));
      out.push({firstDmg:!!GEN_CANTRIP_LINES[d.steps.cantrips.value[0]],
        firstSpellDmg:GEN_DMG_SPELLS.includes(d.steps.spells.value[0]),
        tabs:d.steps.cantrips.tabs});
    }
    const d2=genNewDraft({sp:"kobold",set:{},counts:{}});genRollAll(d2,${RNG}(7));
    genApplyPick(d2,"cls","Wizard");
    d2.tabs={cantrips:["all","all","all"]};genRollAll(d2,${RNG}(8));
    return {out,tabs2:d2.steps.cantrips.tabs};})()`);
  r.out.forEach(o => {
    assert.equal(o.firstDmg, true, "first cantrip must come from the Damaging table");
    assert.equal(o.firstSpellDmg, true, "first prepared spell must come from the Damaging table");
    assert.deepEqual(o.tabs[0], "dmg");
  });
  assert.deepEqual(r.tabs2, ["all","all","all"], "draft-level tab overrides drive the roll");
});

test("D-028: boons derive to traits/actions/resources; legacy true/false wings values stay valid", () => {
  const r = ev(`(()=>{
    const mk=v=>{const d=genNewDraft({sp:"kobold",set:{},counts:{}});genRollAll(d,${RNG}(9));
      genApplyPick(d,"cls","Fighter");genRollAll(d,${RNG}(10));
      genApplyPick(d,"sp:wings",v);
      if(d.steps["sp:wings"]&&!genStepDone(d,"sp:wings"))genRollSub(d,"sp:wings",${RNG}(3));
      genApplyPick(d,"name","Boonling");
      const p=genCompletePayload(d);const val=validateGenPayload(p);
      if(!val.ok)return {fail:val.err,v:String(v)};
      return deriveGenChar(val.clean);};
    const breath=mk("breath"),build=mk("build"),pt=mk("packtactics"),wings=mk(true),none=mk(false);
    return {
      breathAct:breath.actions.some(a=>/Dragon's Breath/.test(a.n)),
      breathRes:breath.resources.some(x=>x.k==="breath"&&x.max===2),
      buildSize:build.size,buildTrait:build.traits.some(t=>t.n==="Powerful Build"),
      ptTrait:pt.traits.some(t=>t.n==="Pack Tactics"),
      wingsFly:wings.speed.fly,noneFly:none.speed.fly};})()`);
  assert.equal(r.fail, undefined, "boon payload failed validation: " + r.fail);
  assert.equal(r.breathAct, true);
  assert.equal(r.breathRes, true);
  assert.equal(r.buildSize, "Medium");
  assert.equal(r.buildTrait, true);
  assert.equal(r.ptTrait, true);
  assert.equal(r.wingsFly, 30, "value true still means wings");
  assert.equal(r.noneFly, 0);
});

test("D-025: chain warlock rolls a familiar; the payload validates; ineligible familiars are dropped", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});genRollAll(d,${RNG}(21));
    genApplyPick(d,"cls","Warlock");genRollAll(d,${RNG}(22));
    genApplyPick(d,"feature","Pact of the Chain");genRollAll(d,${RNG}(23));
    genApplyPick(d,"name","Chainling");
    const p=genCompletePayload(d);if(!p)return {fail:"incomplete"};
    const val=validateGenPayload(p);if(!val.ok)return {fail:val.err};
    const ch=deriveGenChar(val.clean);
    // tamper: claim a chain form on a non-chain payload
    const p2=JSON.parse(JSON.stringify(p));p2.steps.feature={value:"Eldritch Mind"};
    delete p2.steps.equip;p2.steps.equip={value:0};
    const val2=validateGenPayload(p2);
    const cardHTML=genCardHTML(ch,{});
    return {form:val.clean.steps.familiar&&val.clean.steps.familiar.value,
      chainForm:GEN_FAMILIAR_CHAIN.includes(val.clean.steps.familiar.value),
      chFam:ch.familiar,hasBlock:!!GEN_FAMILIARS[ch.familiar],
      famRendered:cardHTML.includes("gk-fam")&&cardHTML.includes(ch.familiar),
      tamperedKept:!!(val2.ok&&val2.clean.steps.familiar)};})()`);
  assert.equal(r.fail, undefined, "chain payload failed: " + r.fail);
  assert.equal(r.chainForm, true, "familiar must be a chain form: got " + r.form);
  assert.equal(r.hasBlock, true, "the derived familiar has a shipped statblock");
  assert.equal(r.famRendered, true, "the familiar block renders on the card without throwing");
  assert.equal(r.tamperedKept, false, "a familiar without a qualifying source is dropped");
});

test("v4: pact-blade kits are feature-gated and the kit weapon attacks with Charisma", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});genRollAll(d,${RNG}(25));
    genApplyPick(d,"cls","Warlock");genRollAll(d,${RNG}(26));
    genApplyPick(d,"feature","Pact of the Blade");
    const K=GEN_CLASSES.Warlock,bladeIdx=K.kits.findIndex(k=>k.needs==="pactBlade");
    const okPick=genApplyPick(d,"equip",bladeIdx);
    genRollAll(d,${RNG}(27));genApplyPick(d,"name","Blade");
    const p=genCompletePayload(d),val=validateGenPayload(p);
    if(!val.ok)return {fail:val.err};
    const ch=deriveGenChar(val.clean);
    const pact=ch.attacks.find(a=>/pact weapon/.test(a.note||""));
    // gate: same kit index on a payload without the blade feature must be rejected
    const p2=JSON.parse(JSON.stringify(p));p2.steps.feature={value:"Eldritch Mind"};
    const val2=validateGenPayload(p2);
    return {okPick,pactAbil:pact&&pact.ability,gateRejects:!val2.ok&&val2.err==="equip"};})()`);
  assert.equal(r.fail, undefined, "blade payload failed: " + r.fail);
  assert.equal(r.okPick, true);
  assert.equal(r.pactAbil, "cha", "the kit melee weapon is the Cha pact weapon");
  assert.equal(r.gateRejects, true, "a gated kit without its feature fails validation");
});

test("v4: Chain Mail falls back to Chain Shirt under Str 13, gear line follows; gear steps pluralize", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});
    genApplyPick(d,"stats",[8,14,12,10,10,10]); // Str 8: below the Chain Mail gate
    genRollAll(d,${RNG}(33));
    genApplyPick(d,"cls","Fighter");genRollAll(d,${RNG}(34));
    const K=GEN_CLASSES.Fighter,cmIdx=K.kits.findIndex(k=>k.ac==="chainMailShield");
    genApplyPick(d,"equip",cmIdx);genApplyPick(d,"name","Weakling");
    const ch=deriveGenChar(validateGenPayload(genCompletePayload(d)).clean);
    return {ac:ch.ac,acSrc:ch.acSrc,gearHasShirt:/Chain Shirt/.test(ch.gear),gearHasMail:/Chain Mail/.test(ch.gear),
      torch:gkGearStep("10 Torches",-1),torchUp:gkGearStep("1 Torch",1),gone:gkGearStep("1 Javelin",-1)};})()`);
  assert.equal(r.acSrc, "Chain Shirt, Shield");
  assert.equal(r.ac, 13 + 2 + 2, "chain shirt 13 + dex cap 2 + shield 2");
  assert.equal(r.gearHasShirt, true);
  assert.equal(r.gearHasMail, false);
  assert.equal(r.torch, "9 Torches");
  assert.equal(r.torchUp, "2 Torches");
  assert.equal(r.gone, null);
});
