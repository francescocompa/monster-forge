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
      if(t.kind==="skill"){ // plain-name tables (D-030): every entry must be a real skill
        for(const e of t.entries)if(typeof e!=="string"||!GEN_SKILL_ABIL[e])bad.push(id+":"+t.id+":"+e);
        continue;}
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
        .concat((ch.spCasts||[]).flatMap(x=>(x.cantrip?[x.cantrip]:[]).concat(x.spell?[x.spell]:[])))
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

test("species pack floor (D-030): every shipped pack rolls, validates, and derives legally", () => {
  const r = ev(`(()=>{
    const DTYPES=["Acid","Bludgeoning","Cold","Fire","Force","Lightning","Necrotic","Piercing","Poison","Psychic","Radiant","Slashing","Thunder"];
    const out={bad:[],species:{}};
    for(const spId of Object.keys(GEN_SPECIES)){
      const sp=GEN_SPECIES[spId];
      if(!sp.label||!sp.size||!sp.speed||!Array.isArray(sp.langs)||!sp.langs.length)out.bad.push(spId+":schema");
      for(let seed=1;seed<=30;seed++){
        const rng=${RNG}(seed*104729+spId.length*997);
        const d=genNewDraft({sp:spId,set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
        genRollAll(d,rng);
        genApplyPick(d,"name",sp.label+" "+seed);
        if(!genIsComplete(d)){out.bad.push(spId+":"+seed+":incomplete");continue;}
        const v=validateGenPayload(genCompletePayload(d));
        if(!v.ok){out.bad.push(spId+":"+seed+":invalid:"+v.err);continue;}
        const ch=deriveGenChar(v.clean);
        out.species[spId]=(out.species[spId]||0)+1;
        if(ch.hp<1)out.bad.push(spId+":"+seed+":hp");
        if(!(ch.speed.walk>0))out.bad.push(spId+":"+seed+":speed");
        for(const dt of (ch.resists||[]))if(!DTYPES.includes(dt))out.bad.push(spId+":"+seed+":resist:"+dt);
        const names=ch.skills.map(s=>s.n);
        if(new Set(names).size!==names.length)out.bad.push(spId+":"+seed+":dupskill");
        for(const c of (ch.spCasts||[])){
          if(c.dc!==10+ch.mods[c.abil]||c.atk!==2+ch.mods[c.abil])out.bad.push(spId+":"+seed+":castmath");
        }
        for(const res of ch.resources)if(!(res.max>=1)||!res.label)out.bad.push(spId+":"+seed+":res:"+res.k);
        const all=[]
          .concat(ch.caster?ch.caster.cantrips:[]).concat(ch.caster?ch.caster.prepared:[])
          .concat((ch.spCasts||[]).flatMap(x=>(x.cantrip?[x.cantrip]:[]).concat(x.spell?[x.spell]:[])))
          .concat((ch.extraCasts||[]).flatMap(x=>x.cantrips.concat([x.spell])));
        if(new Set(all).size!==all.length)out.bad.push(spId+":"+seed+":spelldupe:"+all.join("|"));
        // kind:"skill" tables land as proficiencies; extraFeat species carry two distinct feats
        for(const t of (sp.tables||[]))if(t.kind==="skill"){
          const val=v.clean.steps["sp:"+t.id].value;
          if(!names.includes(val))out.bad.push(spId+":"+seed+":skilltable");
        }
        if(sp.extraFeat){
          if(!v.clean.steps.feat2||v.clean.steps.feat2.value===v.clean.steps.feat.value)out.bad.push(spId+":"+seed+":feat2");
          const f2=GEN_FEATS.find(f=>f.n===v.clean.steps.feat2.value);
          if(f2&&f2.hp2&&ch.hp<GEN_CLASSES[ch.cls].hd+ch.mods.con+2)out.bad.push(spId+":"+seed+":toughhp");
        }
        // the card composes without throwing, and species resistances reach the dmg map
        const m=genToMonster(ch);
        for(const dt of (ch.resists||[]))if(m.dmg[dt]!=="res")out.bad.push(spId+":"+seed+":dmgline");
      }
    }
    return out;})()`);
  assert.deepEqual(r.bad, []);
  assert.equal(Object.keys(r.species).length, Object.keys(ev("GEN_SPECIES")).length, "every pack derived");
});

test("species ritual mode (D-031): species step leads, species change cascades, locked crews reject other species", () => {
  const r = ev(`(()=>{
    const out={};
    const rng=${RNG}(4242);
    const d=genNewDraft({sp:"kobold",spMode:"ritual",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    out.firstStep=genStepOrder(d)[0];
    out.noTablesYet=!genStepOrder(d).some(id=>id.startsWith("sp:"));
    genRollAll(d,rng);
    genApplyPick(d,"name","Ritual test");
    out.rolledSp=d.sp;
    out.spMatchesStep=d.steps.species&&d.steps.species.value===d.sp;
    out.complete=genIsComplete(d);
    const v=validateGenPayload(genCompletePayload(d));
    out.valid=v.ok&&v.clean.sp===d.sp;
    // switching species cascades: human adds feat2, moving away drops it and the old sp tables
    out.pickHuman=genApplyPick(d,"species","human");
    out.feat2Step=genStepOrder(d).includes("feat2");
    out.oldTablesGone=!Object.keys(d.steps).some(k=>k.startsWith("sp:"));
    genRollAll(d,rng);
    out.humanComplete=genIsComplete(d)&&d.steps.feat2&&d.steps.feat2.value!==d.steps.feat.value;
    out.pickKobold=genApplyPick(d,"species","kobold");
    out.feat2Gone=!d.steps.feat2&&!genStepOrder(d).includes("feat2");
    // locked-crew ingestion rejects a different species (D-031)
    genRollAll(d,rng); // completes the kobold again
    const p=genCompletePayload(d);
    const a={id:"t",party:[],crew:{sp:"tiefling",spMode:"locked",set:{stat:"3d6",mode:"plausible",asi:true},shareId:"",fallen:[]}};
    out.lockedRejects=genIngestPayload(a,p,"","")===null;
    a.crew.spMode="ritual";
    const pc=genIngestPayload(a,p,"","");
    out.ritualAccepts=!!pc;
    if(pc){state.roster=state.roster.filter(x=>x.id!==pc.id);} // leave no test data behind
    return out;})()`);
  assert.equal(r.firstStep, "species");
  assert.equal(r.noTablesYet, true);
  assert.equal(r.spMatchesStep, true);
  assert.equal(r.complete, true);
  assert.equal(r.valid, true);
  assert.equal(r.pickHuman, true);
  assert.equal(r.feat2Step, true);
  assert.equal(r.oldTablesGone, true);
  assert.equal(r.humanComplete, true);
  assert.equal(r.pickKobold, true);
  assert.equal(r.feat2Gone, true);
  assert.equal(r.lockedRejects, true);
  assert.equal(r.ritualAccepts, true);
});

test("feat texts from uploads (D-033): a name-matched uploaded text wins, disable falls back to shipped", () => {
  const r = ev(`(()=>{
    const parsed=parseFeatsJSON({feat:[
      {name:"Alert",source:"HB",category:"O",entries:["Custom Alert wording from the uploaded book."]},
      {name:"Some Level 4 Feat",source:"HB",category:"G",entries:["Not an origin feat."]}
    ]},"homebrew-feats.json",{});
    const prev=state.feats;state.feats=parsed;
    const out={parsed:parsed.length,up:genFeatText("Alert","shipped"),miss:genFeatText("Tough","shipped")};
    setLibEnabled("feat","homebrew-feats.json",false);
    out.disabled=genFeatText("Alert","shipped");
    setLibEnabled("feat","homebrew-feats.json",true);
    // the card actually carries the uploaded wording
    const rng=${RNG}(31337);
    const d=genNewDraft({sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    genRollAll(d,rng);
    genApplyPick(d,"feat","Alert");
    genApplyPick(d,"name","T");
    const v=validateGenPayload(genCompletePayload(d));
    const ch=v.ok?deriveGenChar(v.clean):null;
    out.cardText=ch?(ch.traits.find(t=>t.n==="Feat: Alert")||{}).t:null;
    state.feats=prev;
    return out;})()`);
  assert.equal(r.parsed, 2);
  assert.equal(r.up, "Custom Alert wording from the uploaded book.");
  assert.equal(r.miss, "shipped", "unmatched names keep the shipped text");
  assert.equal(r.disabled, "shipped", "disabling the source falls back");
  assert.equal(r.cardText, "Custom Alert wording from the uploaded book.");
});

test("step grouping (D-034): species resolves with its tables, gear groups, class skills dodge species skills", () => {
  const r = ev(`(()=>{
    const out={};
    // locked crew: the species tables lead, before the scores
    const k=genNewDraft({sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    const kOrder=genStepOrder(k);
    out.kobold=kOrder.slice(0,4);
    // ritual crew: species step, then its tables, then the scores
    const rr=genNewDraft({sp:"kobold",spMode:"ritual",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    genApplyPick(rr,"species","elf");
    const rOrder=genStepOrder(rr);
    out.ritual=rOrder.slice(0,4);
    // gear group is contiguous once a class is known
    genApplyPick(rr,"stats",[12,13,14,10,11,9]);
    genApplyPick(rr,"cls","Fighter");
    const g=genStepOrder(rr);
    out.gear=[g.indexOf("equip"),g.indexOf("gearPack"),g.indexOf("sundries")];
    // the elf's Keen Senses skill lands BEFORE the class skills, which must dodge it
    out.dupes=[];
    for(let seed=1;seed<=40;seed++){
      const d=genNewDraft({sp:"elf",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
      genRollAll(d,${RNG}(seed*613+11));
      const sp=d.steps["sp:keensenses"]&&d.steps["sp:keensenses"].value;
      const cls=(d.steps.skills&&d.steps.skills.value)||[];
      if(sp&&cls.includes(sp))out.dupes.push(seed+":"+sp);
    }
    return out;})()`);
  assert.deepEqual(r.kobold, ["sp:legacy", "sp:wings", "stats", "cls"]);
  assert.deepEqual(r.ritual, ["species", "sp:keensenses", "sp:lineage", "stats"]);
  assert.deepEqual(r.gear, [r.gear[0], r.gear[0] + 1, r.gear[0] + 2], "kit, pack and sundries are contiguous");
  assert.deepEqual(r.dupes, [], "a class skill roll never repeats a species-granted skill");
});

test("boons toggle (D-035): a boon table drops out of the ritual and stays optional on the wire", () => {
  const r = ev(`(()=>{
    const out={};
    const off=genNewDraft({sp:"kobold",boons:false,set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    out.offOrder=genStepOrder(off).filter(id=>id.startsWith("sp:"));
    genRollAll(off,${RNG}(808));genApplyPick(off,"name","No boon");
    out.offComplete=genIsComplete(off);
    const v=validateGenPayload(genCompletePayload(off));
    out.offValid=v.ok;
    out.offNoBoonStep=!v.clean.steps["sp:wings"];
    if(v.ok){const ch=deriveGenChar(v.clean);
      out.offNoBoonFx=(ch.resists||[]).length===0&&!ch.speed.fly;}
    const on=genNewDraft({sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    out.onOrder=genStepOrder(on).filter(id=>id.startsWith("sp:"));
    // a non-boon table stays mandatory: strip the legacy and the payload is rejected
    const p=genCompletePayload(off);delete p.steps["sp:legacy"];
    out.legacyStillRequired=validateGenPayload(p).err;
    return out;})()`);
  assert.deepEqual(r.offOrder, ["sp:legacy"], "the boon table leaves the ritual");
  assert.equal(r.offComplete, true);
  assert.equal(r.offValid, true, "a boon-less payload validates");
  assert.equal(r.offNoBoonStep, true);
  assert.equal(r.offNoBoonFx, true, "no boon effects derive");
  assert.deepEqual(r.onOrder, ["sp:legacy", "sp:wings"]);
  assert.equal(r.legacyStillRequired, "sp:legacy", "a core species table is still required");
});

test("background ASI default (D-036): the +1 lands on an odd score so it buys a modifier", () => {
  const r = ev(`(()=>{
    const mk=(cls,scores)=>{const d=genNewDraft({sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
      genApplyPick(d,"stats",scores);genApplyPick(d,"cls",cls);return genAsiDefault(d);};
    return {
      // Barbarian (str/con): con 14 buys nothing, dex 13 buys a modifier → the +1 goes to dex
      barbOddDex:mk("Barbarian",[15,13,14,10,10,10]),
      // con odd → the class secondary keeps it
      barbOddCon:mk("Barbarian",[15,12,13,10,10,10]),
      // nothing odd → the class default stands
      barbAllEven:mk("Barbarian",[16,12,14,10,10,10]),
      // Wizard (int/con): odd dex wins over an even con
      wizardOddDex:mk("Wizard",[10,13,14,15,10,10]),
      // the primary always takes the +2 whatever its parity (it buys a step either way)
      wizardEvenInt:mk("Wizard",[10,14,13,16,10,10]),
      // a class whose primary IS dex never doubles up on it
      fighterDexPrim:mk("Fighter",[10,13,14,10,10,10]),
    };})()`);
  assert.deepEqual(r.barbOddDex, ["str", "dex"]);
  assert.deepEqual(r.barbOddCon, ["str", "con"]);
  assert.deepEqual(r.barbAllEven, ["str", "con"]);
  assert.deepEqual(r.wizardOddDex, ["int", "dex"]);
  assert.deepEqual(r.wizardEvenInt, ["int", "con"]);
  assert.deepEqual(r.fighterDexPrim, ["dex", "con"]);
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
  assert.equal(r.notes, "", "D-044: quirk and trinket no longer squat in the roster's notes field");
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

test("D-037: a fighting style narrows the kit table, and the narrowed kit is the only one a payload can carry", () => {
  const r = ev(`(()=>{
    const K=GEN_CLASSES.Fighter,all=K.kits.length;
    // every fits tag is a tag some kit actually carries, and no style narrows below a real roll
    // D-040: the tag set is the authored weapon shape PLUS the tags derived from the armor recipe
    const tags=new Set();K.kits.forEach(k=>genKitTags(k).forEach(t=>tags.add(t)));
    const styles=K.featureOpt.options.map(o=>{
      const idx=genKitIdxFor(K,o.value);
      return {v:o.value,fits:o.fits||null,n:idx.length,
        unknown:(o.fits||[]).filter(t=>!tags.has(t)),
        allMatch:!o.fits||idx.every(i=>genKitTags(K.kits[i]).some(t=>o.fits.includes(t)))};});
    // gated kits stay out of every fighter table (the fighter has none) and inside the classes that own them
    const cleric=GEN_CLASSES.Cleric,druid=GEN_CLASSES.Druid;
    const gated={clericOff:genKitIdxFor(cleric,"thaumaturge").length,clericOn:genKitIdxFor(cleric,"protector").length,
      druidOff:genKitIdxFor(druid,"magician").length,druidOn:genKitIdxFor(druid,"warden").length};
    // 40 seeded fighters: the rolled kit always fits the rolled style
    const mismatch=[];
    for(let s=1;s<=40;s++){
      const d=genNewDraft({sp:"kobold",set:{},counts:{}});
      genApplyPick(d,"stats",[14,14,14,10,10,10]);genRollAll(d,${RNG}(500+s));
      genApplyPick(d,"cls","Fighter");genRollAll(d,${RNG}(700+s));
      genApplyPick(d,"name","F"+s);
      const p=genCompletePayload(d),val=validateGenPayload(p);
      if(!val.ok){mismatch.push("seed"+s+":"+val.err);continue;}
      const o=K.featureOpt.options.find(x=>x.value===p.steps.feature.value);
      if(o&&o.fits&&!genKitTags(K.kits[p.steps.equip.value]).some(t=>o.fits.includes(t)))
        mismatch.push("seed"+s+":"+o.value+"/"+K.kits[p.steps.equip.value].n);}
    // a hand-built payload that pairs Archery with a melee kit is rejected at the wire
    const d2=genNewDraft({sp:"kobold",set:{},counts:{}});
    genApplyPick(d2,"stats",[14,14,14,10,10,10]);genRollAll(d2,${RNG}(61));
    genApplyPick(d2,"cls","Fighter");genApplyPick(d2,"feature","Archery");genRollAll(d2,${RNG}(62));
    genApplyPick(d2,"name","Arch");
    const p2=genCompletePayload(d2);
    const melee=K.kits.findIndex(k=>(k.tags||[]).includes("twohand"));
    const pickRejects=!genApplyPick(d2,"equip",melee);
    const tampered=JSON.parse(JSON.stringify(p2));tampered.steps.equip={value:melee};
    const v2=validateGenPayload(tampered);
    // switching the style under a landed kit reopens the step instead of keeping a mismatch
    genApplyPick(d2,"feature","Great Weapon Fighting");
    return {all,styles,gated,mismatch,pickRejects,wireRejects:!v2.ok&&v2.err==="equip",
      reopened:!genStepDone(d2,"equip")};})()`);
  assert.ok(r.all >= 12, "the fighter table is broad enough that every style still rolls (D-022/D-037)");
  r.styles.forEach(s => {
    assert.deepEqual(s.unknown, [], s.v + " fits a tag no kit carries");
    assert.equal(s.allMatch, true, s.v + " kept a kit that doesn't match its fits");
    assert.ok(s.n >= 3, s.v + " narrows to " + s.n + " kits — too few to roll on");
    if (s.fits) assert.ok(s.n < r.all, s.v + " declares fits but narrows nothing");
    else assert.equal(s.n, r.all, s.v + " has no gear tie, so it keeps the whole table");
  });
  assert.ok(r.gated.clericOn > r.gated.clericOff, "Protector unlocks the cleric's martial kits");
  assert.ok(r.gated.druidOn > r.gated.druidOff, "Warden unlocks the martial druid kit");
  assert.deepEqual(r.mismatch, [], "seeded fighters rolled a kit their style doesn't fit");
  assert.equal(r.pickRejects, true, "picking a kit outside the style's table is refused");
  assert.equal(r.wireRejects, true, "a tampered payload pairing Archery with a two-hander is rejected");
  assert.equal(r.reopened, true, "changing the style reopens a kit that no longer fits");
});

test("B295: noisy armor carries its Stealth penalty onto the card; quiet armor doesn't", () => {
  const r = ev(`(()=>{
    const mk=(str)=>{
      const d=genNewDraft({sp:"kobold",set:{},counts:{}});
      genApplyPick(d,"stats",[str,14,14,10,10,10]);
      genRollAll(d,${RNG}(71));genApplyPick(d,"cls","Fighter");
      genApplyPick(d,"feature","Protection");genRollAll(d,${RNG}(72));
      const K=GEN_CLASSES.Fighter;
      genApplyPick(d,"equip",K.kits.findIndex(k=>k.ac==="chainMailShield"));
      genApplyPick(d,"name","N");
      const ch=deriveGenChar(validateGenPayload(genCompletePayload(d)).clean);
      return {stealth:ch.acStealth,note:genToMonster(ch).acnote};};
    const noisy=mk(14),quiet=mk(8); // Str 8 demotes to Chain Shirt, which is quiet
    return {noisy,quiet,flagged:Object.keys(GEN_AC).filter(a=>GEN_AC[a].stealth).length};})()`);
  assert.equal(r.noisy.stealth, true);
  assert.match(r.noisy.note, /Disadvantage on Stealth/);
  assert.equal(r.quiet.stealth, false);
  assert.doesNotMatch(r.quiet.note, /Stealth/);
  assert.ok(r.flagged >= 8, "the stealth-penalty recipes are flagged in the data");
});

test("D-040: every kit is tagged, offers a Dex option, and no class repeats one armor recipe to death", () => {
  const r = ev(`(()=>{
    const SHAPE=["onehand","twohand","dual","ranged","thrown","finesse"];
    const DEF=["light","medium","heavy","shield","unarmored"];
    const untagged=[],noShape=[],noDex=[],badTag=[],thin=[],heavyRage=[],strOnlyRogue=[];
    Object.entries(GEN_CLASSES).forEach(([cls,K])=>{
      const acUse={};
      K.kits.forEach(k=>{
        const tags=genKitTags(k),shape=(k.tags||[]);
        if(!tags.length)untagged.push(cls+":"+k.n);
        if(!shape.length)noShape.push(cls+":"+k.n);
        shape.forEach(t=>{if(!SHAPE.includes(t))badTag.push(cls+":"+k.n+":"+t);});
        tags.forEach(t=>{if(!SHAPE.includes(t)&&!DEF.includes(t))badTag.push(cls+":"+k.n+":"+t);});
        // a Strength weapon always needs a Dex-usable partner to fall back on
        const abil=k.weapons.map(w=>GEN_W[w.w]&&GEN_W[w.w].ability);
        if(abil.includes("str")&&!abil.includes("dex"))noDex.push(cls+":"+k.n);
        acUse[k.ac]=(acUse[k.ac]||0)+1;
        // Rage is off in Heavy armor, so no barbarian kit may wear it
        if(cls==="Barbarian"&&GEN_AC[k.ac].w==="heavy")heavyRage.push(k.n);
        // Sneak Attack needs Finesse or Ranged: no rogue kit may carry a Strength weapon
        if(cls==="Rogue"&&abil.includes("str"))strOnlyRogue.push(k.n);
      });
      const distinct=Object.keys(acUse).length,most=Math.max(...Object.values(acUse));
      // classes that can actually choose their armor must spread it; Monk/Sorcerer/Wizard can't
      if(GEN_AC[K.kits[0].ac].kind!=="none"&&!/^unarmored/.test(GEN_AC[K.kits[0].ac].kind||"")
         &&(distinct<3||most>K.kits.length*0.5))thin.push(cls+":"+distinct+"distinct/"+most+"max of "+K.kits.length);
    });
    return {untagged,noShape,noDex,badTag,thin,heavyRage,strOnlyRogue,
      // the derived half of the tag set tracks the recipe, so a fits:["heavy"] would work today
      heavyKits:GEN_CLASSES.Fighter.kits.filter(k=>genKitTags(k).includes("heavy")).length,
      shieldKits:GEN_CLASSES.Fighter.kits.filter(k=>genKitTags(k).includes("shield")).length};})()`);
  assert.deepEqual(r.untagged, [], "every kit resolves to at least one tag");
  assert.deepEqual(r.noShape, [], "every kit declares its own weapon-shape tags");
  assert.deepEqual(r.badTag, [], "a kit carries a tag outside the closed vocabulary");
  assert.deepEqual(r.noDex, [], "a Strength kit with no Dex weapon to fall back on");
  assert.deepEqual(r.heavyRage, [], "a barbarian kit wears Heavy armor, which switches Rage off");
  assert.deepEqual(r.strOnlyRogue, [], "a rogue kit carries a Strength weapon");
  assert.deepEqual(r.thin, [], "a class leans on too few armor recipes");
  assert.ok(r.heavyKits > 0 && r.shieldKits > 0, "defence tags are derived from the armor recipe");
});

test("D-038: every weapon and armor is featured in some kit, and everything carries a price", () => {
  const r = ev(`(()=>{
    const usedW=new Set(),usedAC=new Set();
    Object.values(GEN_CLASSES).forEach(K=>K.kits.forEach(k=>{
      usedAC.add(k.ac);(k.weapons||[]).forEach(w=>usedW.add(w.w));}));
    return {
      orphanW:Object.keys(GEN_W).filter(w=>!usedW.has(w)),
      orphanAC:Object.keys(GEN_AC).filter(a=>!usedAC.has(a)),
      badRefW:[...usedW].filter(w=>!GEN_W[w]),
      badRefAC:[...usedAC].filter(a=>!GEN_AC[a]),
      noPriceW:Object.keys(GEN_W).filter(w=>typeof GEN_W[w].gp!=="number"),
      noPriceAC:Object.keys(GEN_AC).filter(a=>typeof GEN_AC[a].gp!=="number"),
      noPricePack:GEN_PACKS.filter(p=>typeof GEN_PACK_GP[p]!=="number"),
      noPriceSun:[...GEN_SUNDRIES_A,...GEN_SUNDRIES_B].filter(s=>typeof GEN_SUNDRY_GP[s]!=="number"),
      classGold:Object.entries(GEN_CLASSES).filter(([,K])=>typeof K.gp!=="number").map(([c])=>c),
      firearms:Object.keys(GEN_W).filter(w=>GEN_W[w].gp>=250)};})()`);
  assert.deepEqual(r.badRefW, [], "a kit references a weapon that doesn't exist");
  assert.deepEqual(r.badRefAC, [], "a kit references an armor recipe that doesn't exist");
  assert.deepEqual(r.orphanW, [], "every modelled weapon appears in at least one kit");
  assert.deepEqual(r.orphanAC, [], "every armor recipe appears in at least one kit");
  assert.deepEqual(r.noPriceW, [], "every weapon carries an XPHB price");
  assert.deepEqual(r.noPriceAC, [], "every armor recipe carries an XPHB price");
  assert.deepEqual(r.noPricePack, [], "every pack carries a price");
  assert.deepEqual(r.noPriceSun, [], "every sundry carries a price");
  assert.deepEqual(r.classGold, [], "every class carries its XPHB starting gold");
  assert.ok(r.firearms.length >= 2, "the firearms are modelled (and priced out of every budget)");
});

test("D-038: the gold budget filters the gear tables, leaves coin, and rejects an overspent payload", () => {
  const r = ev(`(()=>{
    const mk=(gold,plus,cls)=>{
      const d=genNewDraft({sp:"kobold",set:{gold,goldPlus:plus},counts:{}});
      genApplyPick(d,"stats",[14,15,14,12,12,12]);genApplyPick(d,"cls",cls);
      return d;};
    // 1. the budget is the class's own XPHB gold, plus the crew bonus
    const budgets={fighterOff:genBudget(mk(false,0,"Fighter")),fighter:genBudget(mk(true,0,"Fighter")),
      wizard:genBudget(mk(true,0,"Wizard")),fighterPlus:genBudget(mk(true,45,"Fighter"))};
    // 2. restricted mode drops the kits the purse can't cover; unrestricted keeps them all
    const K=GEN_CLASSES.Fighter;
    const dOn=mk(true,0,"Fighter"),dOff=mk(false,0,"Fighter");
    genApplyPick(dOn,"feature","Defense");genApplyPick(dOff,"feature","Defense");
    const onIdx=genKitIdx(dOn,K),offIdx=genKitIdx(dOff,K);
    const overpriced=onIdx.filter(i=>genKitCost(K,K.kits[i])>genBudget(dOn));
    const plateOff=offIdx.some(i=>K.kits[i].ac==="plate");
    const plateOn=onIdx.some(i=>K.kits[i].ac==="plate");
    // 3. 30 seeded restricted rolls across classes: never overspend, always leave coin >= 0
    const bad=[];
    GEN_CLASS_LIST.forEach((cls,ci)=>{
      for(let s=0;s<3;s++){
        const d=mk(true,0,cls);
        const rng=(seed=>{let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};})(900+ci*7+s);
        genRollAll(d,rng);genApplyPick(d,"name",cls+s);
        const p=genCompletePayload(d),v=validateGenPayload(p,{gold:true,goldPlus:0});
        if(!v.ok){bad.push(cls+s+":"+v.err);continue;}
        const coin=genCoin(v.clean);
        if(coin==null||coin<0)bad.push(cls+s+":coin="+coin);
        const ch=deriveGenChar(v.clean);
        // the card prints whole gold only: a remainder under 1 GP is deliberately not a line
        if(Math.floor(coin)>0&&!new RegExp("(^|, )"+Math.floor(coin)+" GP$").test(ch.gear))
          bad.push(cls+s+":coin "+coin+" missing from '"+ch.gear+"'");}});
    // 4. a hand-built payload that buys plate on a budget is rejected; the same one passes unrestricted
    const dRich=mk(false,0,"Fighter");
    genApplyPick(dRich,"feature","Great Weapon Fighting");
    const plateIdx=K.kits.findIndex(k=>k.ac==="plate");
    const pickedPlate=genApplyPick(dRich,"equip",plateIdx);
    const rng2=(seed=>{let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};})(41);
    genRollAll(dRich,rng2);genApplyPick(dRich,"name","Rich");
    const pRich=genCompletePayload(dRich);
    const okUnrestricted=validateGenPayload(pRich,{gold:false,goldPlus:0}).ok;
    const vGold=validateGenPayload(pRich,{gold:true,goldPlus:0});
    // 5. the DM cfg outranks the payload's own claim that the budget was off
    const spoofed=JSON.parse(JSON.stringify(pRich));spoofed.set={...spoofed.set,gold:false};
    const spoofRejected=!validateGenPayload(spoofed,{gold:true,goldPlus:0}).ok;
    // 6. raising the budget lets the plate kit back onto the table
    const dHuge=mk(true,2000,"Fighter");genApplyPick(dHuge,"feature","Great Weapon Fighting");
    const plateAffordable=genKitIdx(dHuge,GEN_CLASSES.Fighter).includes(plateIdx);
    return {budgets,overpriced:overpriced.length,onLen:onIdx.length,offLen:offIdx.length,
      plateOff,plateOn,bad,pickedPlate,okUnrestricted,
      // D-040: the validator replays the availability chain, so the rejection names the step the
      // payload could not have rolled rather than a generic overspend
      goldRejects:!vGold.ok&&vGold.err==="equip",
      spoofRejected,plateAffordable};})()`);
  // D-040: class gold + the background's 50 GP (every XPHB background offers exactly that)
  assert.equal(r.budgets.fighterOff, null, "budget off means no ceiling at all");
  assert.equal(r.budgets.fighter, 205, "the Fighter's 155 plus the background's 50");
  assert.equal(r.budgets.wizard, 105, "the Wizard's 55 plus the background's 50");
  assert.equal(r.budgets.fighterPlus, 250, "the crew's extra gold rides on top of both");
  assert.equal(r.overpriced, 0, "no kit on the restricted table costs more than the purse");
  assert.ok(r.onLen < r.offLen, "the restricted table is smaller than the unrestricted one");
  assert.equal(r.plateOff, true, "plate is reachable with the budget off");
  assert.equal(r.plateOn, false, "plate is not reachable on 155 GP");
  assert.deepEqual(r.bad, [], "a seeded restricted roll overspent or lost its coin");
  assert.equal(r.pickedPlate, true, "plate is pickable with the budget off");
  assert.equal(r.okUnrestricted, true, "the same payload is legal when the crew allows anything");
  assert.equal(r.goldRejects, true, "a payload buying plate is rejected at the step it couldn't roll");
  assert.equal(r.spoofRejected, true, "the DM's cfg outranks the payload's own gold flag");
  assert.equal(r.plateAffordable, true, "raising the crew's gold puts plate back on the table");
});

test("v4: Chain Mail falls back to Chain Shirt under Str 13, gear line follows; gear steps pluralize", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});
    genApplyPick(d,"stats",[8,14,12,10,10,10]); // Str 8: below the Chain Mail gate
    genRollAll(d,${RNG}(33));
    genApplyPick(d,"cls","Fighter");
    genApplyPick(d,"feature","Protection"); // D-037: a shield kit needs a style that fits one
    genRollAll(d,${RNG}(34));
    const K=GEN_CLASSES.Fighter,cmIdx=K.kits.findIndex(k=>k.ac==="chainMailShield");
    genApplyPick(d,"equip",cmIdx);genApplyPick(d,"name","Weakling");
    const ch=deriveGenChar(validateGenPayload(genCompletePayload(d)).clean);
    return {ac:ch.ac,acSrc:ch.acSrc,acStealth:ch.acStealth,gearHasShirt:/Chain Shirt/.test(ch.gear),gearHasMail:/Chain Mail/.test(ch.gear),
      torch:gkGearStep("10 Torches",-1),torchUp:gkGearStep("1 Torch",1),gone:gkGearStep("1 Javelin",-1)};})()`);
  assert.equal(r.acSrc, "Chain Shirt, Shield");
  assert.equal(r.acStealth, false, "the Str-gate demotion sheds Chain Mail's Stealth penalty");
  assert.equal(r.ac, 13 + 2 + 2, "chain shirt 13 + dex cap 2 + shield 2");
  assert.equal(r.gearHasShirt, true);
  assert.equal(r.gearHasMail, false);
  assert.equal(r.torch, "9 Torches");
  assert.equal(r.torchUp, "2 Torches");
  assert.equal(r.gone, null);
});

// D-042: the identity tables and the procedural name generator. The SRD hundred is content under a
// licence — its size and its first/last rows are locked so an accidental edit shows up as a failure.
test("D-042: identity tables are whole, and every species can name a character", () => {
  const r = ev(`(()=>{
    const rng=${RNG}(4242);
    const names={};
    Object.keys(GEN_SPECIES).forEach(k=>{
      const set=new Set();
      for(let i=0;i<40;i++)set.add(genRollName(k,rng));
      names[k]={n:set.size,sample:[...set][0],
                bad:[...set].filter(x=>!x||x.length<2||x.length>28||/[^A-Za-z']/.test(x)).length};});
    // an uploaded pack has no profile of its own and must still produce names
    GEN_SPECIES.u_test={label:"Test",size:"Medium",speed:30,langs:["Common"],traits:[],tables:[]};
    const up=new Set();for(let i=0;i<20;i++)up.add(genRollName("u_test",rng));
    delete GEN_SPECIES.u_test;
    const d=genNewDraft({sp:"kobold",set:{},counts:{}});
    genRollAll(d,rng);
    const q=genRollIdentity(d,"quirk",rng),t=genRollIdentity(d,"trinket",rng);
    d.trinketTab="forge";const t2=genRollIdentity(d,"trinket",rng);
    const nm=genRollIdentity(d,"name",rng);
    const p=genCompletePayload(d),v=validateGenPayload(p);
    return {trinkets:GEN_TRINKETS.length,extras:GEN_TRINKETS_X.length,quirks:GEN_QUIRKS.length,
      srdFirst:GEN_TRINKETS[0],srdLast:GEN_TRINKETS[99],
      dupT:GEN_TRINKETS.filter((x,i)=>GEN_TRINKETS.indexOf(x)!==i).length,
      dupQ:GEN_QUIRKS.filter((x,i)=>GEN_QUIRKS.indexOf(x)!==i).length,
      names,upN:up.size,
      qIn:GEN_QUIRKS.includes(q.value),qDie:q.die,tIn:GEN_TRINKETS.includes(t.value),tDie:t.die,
      t2In:GEN_TRINKETS_X.includes(t2.value),
      nmOk:!!nm.value,
      wireOk:v.ok,wireQuirk:v.ok&&v.clean.steps.quirk.value===q.value};})()`);
  assert.equal(r.trinkets, 100, "the SRD trinket table is a d100");
  assert.equal(r.srdFirst, "A mummified goblin hand");
  assert.equal(r.srdLast, "A metal urn containing the ashes of a hero");
  assert.equal(r.dupT, 0);
  assert.equal(r.quirks, 100, "quirks are a d100");
  assert.equal(r.dupQ, 0);
  assert.ok(r.extras >= 20, "our own trinket extras");
  assert.equal(r.qDie, 100);
  assert.equal(r.tDie, 100);
  assert.equal(r.qIn, true, "a rolled quirk comes from the table");
  assert.equal(r.tIn, true, "a rolled trinket comes from the SRD table by default");
  assert.equal(r.t2In, true, "the Ours tab rolls the extras table");
  assert.equal(r.nmOk, true);
  assert.equal(r.wireOk, true, "rolled identity validates on the wire unchanged");
  assert.equal(r.wireQuirk, true);
  Object.keys(r.names).forEach(k => {
    assert.equal(r.names[k].bad, 0, k + " produced a malformed name");
    assert.ok(r.names[k].n >= 12, k + " names are too repetitive (" + r.names[k].n + "/40 distinct)");
  });
  assert.ok(r.upN >= 8, "an uploaded species falls back to the neutral profile");
});

// D-043 (G4): individual boons switch off. A disabled boon leaves the option table, a die landing
// on its face resolves to no boon, and the DM's cfg outranks a stale phone's payload — tolerantly.
test("D-043: a switched-off boon leaves the table, the roll, and the wire", () => {
  const r = ev(`(()=>{
    const rng=${RNG}(77);
    const raw=genBoonEntries("kobold").map(e=>e.value);   // values are not all strings (wings is true)
    const all=raw.map(String);
    const off=[all[all.length-1]];                       // switch off the last one (the wings)
    const d=genNewDraft({sp:"kobold",set:{},counts:{},boonOff:off});
    const tbl=genStepTable(d,"sp:wings");
    const shown=tbl.rows.map(x=>String(x.value));
    // a pick of the disabled boon is refused; an allowed one still lands
    const pickOff=genApplyPick(d,"sp:wings",off[0]);
    const pickOn=genApplyPick(d,"sp:wings",raw[0]);
    // every face of the die: the disabled boon can never be the landed value
    let landedOff=0;
    for(let i=0;i<300;i++){delete d.steps["sp:wings"];genRollStep(d,"sp:wings",rng);
      if(String(d.steps["sp:wings"].value)===off[0])landedOff++;}
    // the wire: a payload carrying the disabled boon is cleaned, not rejected (D-035 tolerance)
    const d2=genNewDraft({sp:"kobold",set:{},counts:{}});
    genRollAll(d2,rng);genApplyPick(d2,"name","T");
    const p=genCompletePayload(d2);
    p.steps["sp:wings"]={rolls:[20],value:raw[raw.length-1]};
    const v=validateGenPayload(p,{boonOff:off});
    const vNoCfg=validateGenPayload(p);
    return {all:all.length,shownHasOff:shown.includes(off[0]),shownRest:shown.length,
      pickOff,pickOn,landedOff,
      wireOk:v.ok,wireValue:v.ok?String(v.clean.steps["sp:wings"].value):null,
      looseOk:vNoCfg.ok,looseValue:vNoCfg.ok?String(vNoCfg.clean.steps["sp:wings"].value):null,
      cleaned:genCleanBoonOff(["ok",{x:1},"ok",123,"z".repeat(80)])};})()`);
  assert.ok(r.all >= 8, "the kobold ships a real boon list");
  assert.equal(r.shownHasOff, false, "a switched-off boon is not on the option table");
  assert.equal(r.pickOff, false, "…and cannot be picked");
  assert.equal(r.pickOn, true, "an allowed boon still picks");
  assert.equal(r.landedOff, 0, "…and never lands on a roll");
  assert.equal(r.wireOk, true, "a stale phone's payload is not rejected over a boon");
  assert.equal(r.wireValue, "false", "…the disabled boon is dropped to no boon");
  assert.equal(r.looseOk, true);
  assert.notEqual(r.looseValue, "false", "with no cfg the payload's own boon stands");
  assert.deepEqual(r.cleaned, ["ok", "123", "z".repeat(40)], "the list is rebuilt, never trusted");
});

// D-045 (G5) — the D-034 macro categories, made visible. The floor is that every step in a real order
// belongs to a category and the groups stay contiguous: a category that reappears later would print a
// second rule and make the grouping a lie.
test("ritual steps: every step carries a macro category, and each category is one contiguous run", () => {
  const r = ev(`(()=>{
    const d=genNewDraft({sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    genRollAll(d,${RNG}(4242));
    const order=genStepOrder(d),cats=order.map(genStepCat);
    const seen=[],runs=[];
    cats.forEach(c=>{if(!runs.length||runs[runs.length-1]!==c)runs.push(c);});
    runs.forEach(c=>{if(seen.indexOf(c)<0)seen.push(c);});
    // The ritual with species in play: a species table and a gear step must be in the same run as
    // their siblings, and nothing may fall through uncategorised.
    const dr=genNewDraft({sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},spMode:"ritual",counts:{}});
    genRollAll(dr,${RNG}(99));
    const ritualCats=genStepOrder(dr).map(genStepCat);
    return {blank:cats.filter(c=>!c).length, runs, seen, dupRuns:runs.length-seen.length,
      first:cats[0], gearLast:cats[cats.length-1], koboldSpecies:cats.filter(c=>c==="Species").length,
      spTables:ritualCats.filter(c=>c==="Species").length,ritualFirst:ritualCats[0],
      ritualBlank:ritualCats.filter(c=>!c).length,
      known:cats.every(c=>["Species","Scores","Class","Background","Training","Magic","Gear"].indexOf(c)>=0)};})()`);
  assert.equal(r.blank, 0, "an uncategorised step would sit under the previous group's rule");
  assert.equal(r.known, true, "categories come from the one map, not ad-hoc strings");
  assert.equal(r.dupRuns, 0, "a category never reappears after another one interrupts it");
  assert.equal(r.gearLast, "Gear", "gear closes the ritual");
  assert.equal(r.ritualBlank, 0);
  assert.equal(r.ritualFirst, "Species", "in ritual-species mode the species group leads the ritual");
  assert.ok(r.spTables >= 1, "…carrying whatever tables that species happens to ship (a Dwarf ships none)");
  assert.ok(r.koboldSpecies >= 2, "a species WITH tables groups them with itself (kobold: legacy + boon)");
});
