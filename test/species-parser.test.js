// D-030/D-032 floor: races.json → species packs. Fixtures mirror the real 5etools XPHB shapes
// (lineage table, choose-one list, skill choice, origin feat, PB-uses, resist traits) so the
// parser's condensation rules are locked against the structures it will actually meet; the
// end-to-end leg registers a parsed pack and rolls a legal character from it, and the phone
// sanitizer leg proves hostile cfg packs are rebuilt or dropped (the share is world-writable).
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });
const ev = (expr) => { const v = evalIn(window, expr); return v !== null && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v; };
const RNG = `(seed=>{let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})`;

const FIXTURE = `({race:[
  {name:"Moon Elf",source:"HB",size:["M"],speed:30,darkvision:60,entries:[
    {name:"Darkvision",entries:["You have {@sense Darkvision|XPHB} with a range of 60 feet."]},
    {name:"Moon Lineage",entries:[
      "You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Moon Lineages table. You gain the level 1 benefit of that lineage.",
      "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait.",
      {type:"table",caption:"Moon Lineages",colLabels:["Lineage","Level 1","Level 3"],rows:[
        ["Bright","The range of your {@sense Darkvision|XPHB} increases to 120 feet. You also know the {@spell Dancing Lights|XPHB} cantrip.","{@spell Faerie Fire|XPHB}"],
        ["Dim","You know the {@spell Prestidigitation|XPHB} cantrip.","{@spell Detect Magic|XPHB}"],
        ["Dark","Your {@variantrule Speed|XPHB} increases to 35 feet. You also know the {@spell Druidcraft|XPHB} cantrip.","{@spell Longstrider|XPHB}"]]}]},
    {name:"Keen Nose",entries:["You have proficiency in the {@skill Insight|XPHB}, {@skill Perception|XPHB}, or {@skill Survival|XPHB} skill."]},
    {name:"Moon Trance",entries:["You don't need to sleep, and magic can't put you to sleep."]},
    {name:"Lunar Form",entries:["When you reach character level 3, you can transform as a {@variantrule Bonus Action|XPHB}."]}
  ]},
  {name:"Stone Kin",source:"HB",size:["M"],speed:30,darkvision:120,entries:[
    {name:"Stone Resilience",entries:["You have {@variantrule Resistance|XPHB} to Poison damage. You also have {@variantrule Advantage|XPHB} on saving throws you make to avoid or end the {@condition Poisoned|XPHB} condition."]},
    {name:"Stone Toughness",entries:["Your {@variantrule Hit Points|XPHB|Hit Point} maximum increases by 1, and it increases by 1 again whenever you gain a level."]},
    {name:"Ancestral Boon",entries:[
      "You are descended from stone spirits. Choose one of the following benefits; you can use the chosen benefit a number of times equal to your {@variantrule Proficiency|XPHB|Proficiency Bonus}, and you regain all expended uses when you finish a {@variantrule Long Rest|XPHB}:",
      {type:"list",style:"list-hang-notitle",items:[
        {type:"item",name:"Rock Throw",entries:["When you hit a target with an attack roll and deal damage to it, you can also deal {@damage 1d10} Bludgeoning damage to that target."]},
        {type:"item",name:"Stone Step",entries:["As a {@variantrule Bonus Action|XPHB}, you magically teleport up to 30 feet to an unoccupied space you can see."]}]}]}
  ]},
  {name:"Plainsfolk",source:"HB",size:["M"],speed:30,entries:[
    {name:"Adaptable",entries:["You gain proficiency in one skill of your choice."]},
    {name:"Driven",entries:["You gain an {@filter Origin feat|feats|category=o} of your choice."]},
    {name:"Second Wind of Luck",entries:["When you roll a 1 on the {@dice d20} of a {@variantrule D20 Test|XPHB}, you can reroll the die, and you must use the new roll."]}
  ]}
]})`;

test("parseRacesJSON: basics land exactly; choices become tables; level-gated traits are skipped", () => {
  const r = ev(`(()=>{
    const packs=parseRacesJSON(${FIXTURE},"homebrew-races.json",{});
    const by={};packs.forEach(p=>{by[p.label]=p;});
    const elf=by["Moon Elf"],stone=by["Stone Kin"],plain=by["Plainsfolk"];
    return {
      count:packs.length,
      elfKey:elf.key, elfDv:elf.darkvision, elfSpeed:elf.speed,
      elfTables:elf.tables.map(t=>({id:t.id,kind:t.kind||null,n:t.entries.length,die:t.die||null})),
      lineage:elf.tables.find(t=>!t.kind),
      keen:elf.tables.find(t=>t.kind==="skill"),
      elfHasLunar:elf.traits.some(t=>/Lunar/.test(t.n)),
      elfTrance:elf.traits.some(t=>/Moon Trance/.test(t.n)),
      stoneResists:stone.resists, stoneHp:stone.hpPerLevel||0,
      boon:stone.tables[0],
      plainExtra:plain.extraFeat===true,
      plainSkill:plain.tables.find(t=>t.kind==="skill"),
      plainLuck:plain.traits.some(t=>/Second Wind of Luck/.test(t.n)),
    };})()`);
  assert.equal(r.count, 3);
  assert.match(r.elfKey, /^u_homebrew-races-json_moon-elf$/);
  assert.equal(r.elfDv, 60);
  // lineage: 3 options on a d6, full coverage, per-row fx detected from the Level 1 column
  const lin = r.lineage;
  assert.equal(lin.die, 6);
  assert.equal(lin.entries.length, 3);
  assert.equal(lin.entries.reduce((s, e) => s + (e.hi - e.lo + 1), 0), 6, "spans tile the die");
  const bright = lin.entries.find(e => e.label === "Bright");
  assert.equal(bright.fx.darkvision, 120);
  assert.equal([].concat(bright.fx.cast)[0].cantrip, "Dancing Lights");
  const dark = lin.entries.find(e => e.label === "Dark");
  assert.equal(dark.fx.speed, 35);
  assert.equal([].concat(dark.fx.cast)[0].cantrip, "Druidcraft");
  // skill choice → kind:"skill" table over the named three
  assert.deepEqual(r.keen.entries, ["Insight", "Perception", "Survival"]);
  // the level-3 trait is out of scope; the plain trait stays as prose
  assert.equal(r.elfHasLunar, false);
  assert.equal(r.elfTrance, true);
  // Stone Kin: fixed resist + per-level HP + a choose-one list with shared PB uses
  assert.deepEqual(r.stoneResists, ["Poison"]);
  assert.equal(r.stoneHp, 1);
  assert.equal(r.boon.entries.length, 2);
  assert.equal(r.boon.entries.reduce((s, e) => s + (e.hi - e.lo + 1), 0), r.boon.die);
  const step = r.boon.entries.find(e => e.label === "Stone Step");
  assert.equal(step.fx.res.max, 2, "PB uses bake at 2 (level-1 scope)");
  assert.ok(step.fx.bonus, "a Bonus Action benefit lands in the bonus section");
  // Plainsfolk: origin feat → extraFeat, one-skill-of-choice → all-18 table
  assert.equal(r.plainExtra, true);
  assert.equal(r.plainSkill.entries.length, 18);
  assert.equal(r.plainLuck, true);
});

test("uploaded pack end to end: registers via genSyncSpecies, rolls, validates, derives legally", () => {
  const r = ev(`(()=>{
    const packs=parseRacesJSON(${FIXTURE},"homebrew-races.json",{});
    const prev=state.species;
    state.species=packs;
    genSyncSpecies();
    const out={pool:genSpeciesPool().filter(k=>/^u_/.test(k)).length,bad:[]};
    for(const key of ["u_homebrew-races-json_moon-elf","u_homebrew-races-json_stone-kin","u_homebrew-races-json_plainsfolk"]){
      for(let seed=1;seed<=12;seed++){
        const rng=${RNG}(seed*7907+key.length);
        const d=genNewDraft({sp:key,set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
        genRollAll(d,rng);
        genApplyPick(d,"name","Up "+seed);
        if(!genIsComplete(d)){out.bad.push(key+":"+seed+":incomplete");continue;}
        const v=validateGenPayload(genCompletePayload(d));
        if(!v.ok){out.bad.push(key+":"+seed+":"+v.err);continue;}
        const ch=deriveGenChar(v.clean);
        if(ch.hp<1)out.bad.push(key+":"+seed+":hp");
        const m=genToMonster(ch); // composes without throwing
        if(!m.name)out.bad.push(key+":"+seed+":card");
      }
    }
    // library disable empties the pool again
    setLibEnabled("species","homebrew-races.json",false);
    genSyncSpecies();
    out.afterDisable=genSpeciesPool().filter(k=>/^u_/.test(k)).length;
    setLibEnabled("species","homebrew-races.json",true);
    state.species=prev;genSyncSpecies();
    return out;})()`);
  assert.equal(r.pool, 3);
  assert.deepEqual(r.bad, []);
  assert.equal(r.afterDisable, 0);
});

test("phone sanitizer (D-030): a parsed pack survives the cfg round trip; hostile packs are rebuilt or dropped", () => {
  const r = ev(`(()=>{
    const packs=parseRacesJSON(${FIXTURE},"homebrew-races.json",{});
    const elf=packs.find(p=>p.label==="Moon Elf");
    const clean=crewCleanSpeciesPack(elf.key,JSON.parse(JSON.stringify(elf)));
    const out={cleanOk:!!clean,label:clean&&clean.label,tables:clean?clean.tables.length:0,
      lineageFx:null,shipped:null,hostile:null,junkTable:null};
    if(clean){const lin=clean.tables.find(t=>!t.kind);
      out.lineageFx=lin&&[].concat(lin.entries[0].fx.cast)[0].cantrip;}
    // a shipped key can never be shadowed through the wire
    out.shipped=crewCleanSpeciesPack("kobold",{label:"Evil",size:"Medium",speed:30})===null;
    // script injection is stripped; insane numbers clamp; junk fx dropped
    const h=crewCleanSpeciesPack("u_x_h",{label:"<script>x</script>Bad",size:"Huge",speed:9000,darkvision:-5,
      langs:[{a:1},"Common<img>"],traits:[{n:"<b>T</b>",t:"ok<script>"}],
      resists:["Poison","Nonsense"],casts:[{label:"L",abil:"str",cantrip:"Fire Bolt"}],
      tables:[{id:"t",die:6,entries:[{lo:1,hi:9,label:"broken",value:"x"}]}]});
    out.hostile=h&&{label:h.label,speed:h.speed,dv:h.darkvision,langs:h.langs,
      trait:h.traits[0],resists:h.resists,castAbil:h.casts[0].abil,tables:h.tables.length};
    return out;})()`);
  assert.equal(r.cleanOk, true);
  assert.equal(r.label, "Moon Elf");
  assert.equal(r.tables, 2);
  assert.equal(r.lineageFx, "Dancing Lights");
  assert.equal(r.shipped, true, "shipped keys rejected");
  assert.equal(r.hostile.label, "scriptx/scriptBad");
  assert.equal(r.hostile.speed, 30, "insane speed clamps to default");
  assert.equal(r.hostile.dv, 0);
  assert.deepEqual(r.hostile.langs, ["Commonimg"]);
  assert.equal(r.hostile.trait.t, "okscript");
  assert.deepEqual(r.hostile.resists, ["Poison"]);
  assert.equal(r.hostile.castAbil, "mental", "unknown ability falls back");
  assert.equal(r.hostile.tables, 0, "a table not tiling its die is dropped");
});
