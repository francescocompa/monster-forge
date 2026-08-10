// Pure-function checks that run against the booted realm (the helpers live in the shared global scope,
// so we exercise them exactly as the app does). These guard the maths the roll engine and statblock
// rely on, where a silent off-by-one wouldn't throw but would be wrong.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });

const ev = (expr) => evalIn(window, expr);

test("ability modifier (mod)", () => {
  assert.equal(ev("mod(10)"), 0);
  assert.equal(ev("mod(20)"), 5);
  assert.equal(ev("mod(1)"), -5);
  assert.equal(ev("mod(8)"), -1);
});

test("signed formatting (sgn)", () => {
  assert.equal(ev("sgn(3)"), "+3");
  assert.equal(ev("sgn(0)"), "+0");
  assert.equal(ev("sgn(-2)"), "-2");
});

test("clamp", () => {
  assert.equal(ev("clamp(5,1,10)"), 5);
  assert.equal(ev("clamp(-3,1,10)"), 1);
  assert.equal(ev("clamp(99,1,10)"), 10);
});

test("proficiency bonus by CR (pbForCR)", () => {
  assert.equal(ev("pbForCR('1')"), 2);
  assert.equal(ev("pbForCR('5')"), 3);
  assert.equal(ev("pbForCR('17')"), 6);
  assert.equal(ev("pbForCR('30')"), 9);
});

test("dice formula roller is bounded and deterministic on d1 (rollFormula)", () => {
  // d1 always rolls 1, so the total is fully determined regardless of RNG.
  assert.equal(ev("rollFormula('2d1').total"), 2);
  assert.equal(ev("rollFormula('2d1+3').total"), 5);
  // a d20 result must always land in [1+mod, 20+mod]
  assert.equal(ev("(()=>{for(let i=0;i<200;i++){const t=rollFormula('1d20+5').total;if(t<6||t>25)return 'OUT:'+t;}return 'ok';})()"), "ok");
});

test("expression average (exprAvg — rounds down, min 1, per D&D convention)", () => {
  assert.equal(ev("exprAvg('1d8')"), 4);   // 4.5 floored
  assert.equal(ev("exprAvg('2d6+3')"), 10); // 7 + 3
  assert.equal(ev("exprAvg('1d4')"), 2);   // 2.5 floored
  assert.equal(ev("exprAvg('1d1-5')"), 1);  // clamped to min 1
});

test("bracketize is a pure string transform that never throws", () => {
  // Exercises the bracket engine on a representative token without needing a full monster.
  assert.equal(ev("typeof bracketize('The [c] makes an attack.','Goblin')"), "string");
});

test("CR_EXPECT covers every CR_LIST key with a well-formed 7-tuple", () => {
  assert.equal(ev("CR_LIST.every(c=>Array.isArray(CR_EXPECT[c])&&CR_EXPECT[c].length===7)"), true);
});

test("CR_EXPECT is non-decreasing CR-over-CR on AC/HP/Attack/DPR/DC", () => {
  const monotonic = ev(`(()=>{
    for(let i=1;i<CR_LIST.length;i++){
      const a=CR_EXPECT[CR_LIST[i-1]],b=CR_EXPECT[CR_LIST[i]];
      const [ac0,hMin0,,atk0,,dMax0,dc0]=a,[ac1,hMin1,,atk1,,dMax1,dc1]=b;
      if(ac1<ac0||hMin1<hMin0||atk1<atk0||dMax1<dMax0||dc1<dc0)return 'CR '+CR_LIST[i]+' regresses vs '+CR_LIST[i-1];
    }
    return 'ok';
  })()`);
  assert.equal(monotonic, "ok");
});

const evJSON = (expr) => JSON.parse(ev(`JSON.stringify(${expr})`));

test("crExpected(cr) — known spot values from the calibrated table (CR_CALIBRATION.md)", () => {
  assert.deepEqual(evJSON("crExpected('1')"), { cr: "1", pb: 2, ac: 13, hpMin: 24, hpMax: 36, hpAvg: 30, atk: 4, dprMin: 10, dprMax: 13, dprAvg: 12, dc: 12 });
  assert.deepEqual(evJSON("crExpected('5')"), { cr: "5", pb: 3, ac: 15, hpMin: 83, hpMax: 102, hpAvg: 93, atk: 7, dprMin: 33, dprMax: 41, dprAvg: 37, dc: 14 });
  assert.deepEqual(evJSON("crExpected('20')"), { cr: "20", pb: 6, ac: 20, hpMin: 309, hpMax: 333, hpAvg: 321, atk: 15, dprMin: 131, dprMax: 136, dprAvg: 134, dc: 21 });
  assert.deepEqual(evJSON("crExpected('30')"), { cr: "30", pb: 9, ac: 22, hpMin: 776, hpMax: 825, hpAvg: 801, atk: 19, dprMin: 198, dprMax: 203, dprAvg: 201, dc: 27 });
});

test("CR_EXPECT HP and DPR bands tile the ladder — no gaps, no overlaps (inverse lookup safety)", () => {
  const tiled = ev(`(()=>{
    for(let i=1;i<CR_LIST.length;i++){
      const a=CR_EXPECT[CR_LIST[i-1]],b=CR_EXPECT[CR_LIST[i]];
      if(b[1]!==a[2]+1)return 'HP gap/overlap at CR '+CR_LIST[i]+': '+a[2]+' -> '+b[1];
      if(b[4]!==a[5]+1)return 'DPR gap/overlap at CR '+CR_LIST[i]+': '+a[5]+' -> '+b[4];
    }
    return 'ok';
  })()`);
  assert.equal(tiled, "ok");
});

test("crExpected returns null for an unknown CR", () => {
  assert.equal(ev("crExpected('99')"), null);
});

// ── Defensive CR (T1.3) ──────────────────────────────────────────────────────
test("crFromHP maps HP into the CR band that contains it, clamped at the ends", () => {
  assert.equal(ev("crFromHP(1)"), "0");     // CR0 band floor
  assert.equal(ev("crFromHP(30)"), "1");    // CR1 band 24-36
  assert.equal(ev("crFromHP(93)"), "5");    // CR5 band 83-102
  assert.equal(ev("crFromHP(0)"), "0");     // non-positive clamps down
  assert.equal(ev("crFromHP(99999)"), "30"); // above the CR30 ceiling clamps up
});

test("crFromHP never returns undefined for any positive HP up to the ceiling (bands tile)", () => {
  assert.equal(ev("(()=>{for(let hp=1;hp<=825;hp++){if(CR_LIST.indexOf(crFromHP(hp))<0)return 'miss@'+hp;}return 'ok';})()"), "ok");
});

test("effectiveHP applies the physical-resistance multiplier only for physRes profiles", () => {
  assert.equal(ev("effectiveHP(100,{physRes:false})"), 100);
  assert.equal(ev("effectiveHP(100,{physRes:true})"), 128); // 100 * 1.28
  assert.equal(ev("effectiveHP(100,null)"), 100);
});

test("defenseProfile flags physical resistance from m.dmg and from legacy nonmagical note", () => {
  assert.equal(ev("defenseProfile({dmg:{Bludgeoning:'res',Piercing:'res',Slashing:'res'}}).physRes"), true);
  assert.equal(ev("defenseProfile({dmg:{Fire:'res',Cold:'imm'}}).physRes"), false); // elemental only → no
  assert.equal(ev("defenseProfile({dmg:{Bludgeoning:'res',Piercing:'res'}}).physRes"), false); // needs all three
  assert.equal(ev("defenseProfile({dmg:{},dmgnote:'Bludgeoning, Piercing, Slashing from nonmagical attacks (Resistance)'}).physRes"), true);
});

test("defensiveCR — HP anchors the CR, physical resistance raises it, AC nudges gently", () => {
  // vanilla CR5-HP monster at expected AC → CR 5, no AC shift
  assert.deepEqual(evJSON("(()=>{const d=defensiveCR({hp:93,ac:15,dmg:{}});return {cr:d.cr,acStep:d.acStep,physRes:d.physRes};})()"),
    { cr: "5", acStep: 0, physRes: false });
  // same HP but physical-resistant → 93*1.28=119 → CR7 band
  assert.equal(ev("defensiveCR({hp:93,ac:15,dmg:{Bludgeoning:'res',Piercing:'res',Slashing:'res'}}).cr"), "7");
  // AC 4 over expected shifts +1 step; AC 3 under expected shifts -1 (round(±/4))
  assert.equal(ev("defensiveCR({hp:93,ac:19,dmg:{}}).acStep"), 1);
  assert.equal(ev("defensiveCR({hp:93,ac:12,dmg:{}}).acStep"), -1);
  // a +1 AC deviation is inside the deadzone → no shift (this is the point of ÷4 vs the DMG's ÷2)
  assert.equal(ev("defensiveCR({hp:93,ac:16,dmg:{}}).acStep"), 0);
});

test("defensiveCR tolerates a missing AC (no shift) and clamps to the ladder", () => {
  assert.equal(ev("defensiveCR({hp:93,ac:null,dmg:{}}).acStep"), 0);
  assert.equal(ev("defensiveCR({hp:93,dmg:{}}).acDelta"), null);
  assert.equal(ev("defensiveCR({hp:99999,ac:30,dmg:{}}).cr"), "30");
  assert.equal(ev("defensiveCR({hp:1,ac:1,dmg:{}}).cr"), "0");
});

// ── Offensive CR / DPR extractor (T1.4) ─────────────────────────────────────
// Minimal monster scaffold — dprExtract only reads cr/abilities/entry arrays.
const mon = (over) => `Object.assign({cr:"1",str:16,dex:10,con:10,int:10,wis:10,cha:10,actions:[],bonus:[],legend:{on:false,items:[]}},${over})`;

test("dprExtract — plain text attack: damage, to-hit, ok confidence", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[{mode:"text",name:"Bite",text:"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 7 (1d8 + 3) Piercing damage."}]}`)})`);
  assert.equal(x.dpr, 7); assert.equal(x.atk, 4); assert.equal(x.confidence, "ok");
});

test("dprExtract — multiattack multiplies named attacks; riders and best or-branch counted", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[
    {mode:"text",name:"Multiattack",text:"It makes two Claw attacks."},
    {mode:"text",name:"Claw",text:"*Melee Attack Roll:* +5. *Hit:* 6 (1d6 + 3) Slashing damage plus 3 (1d6) Fire damage, or 13 (3d6 + 3) Slashing damage if the target is Prone."}
  ]}`)})`);
  // best or-branch: max(6+3, 13) = 13 → routine 2×13 = 26
  assert.equal(x.dpr, 26);
});

test("dprExtract — save-based AoE doubles damage (DMG two-target convention)", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[{mode:"text",name:"Breath",text:"*Dexterity Saving Throw:* DC 13, each creature in a 20-foot Cone. *Failure:* 10 (3d6) Fire damage. *Success:* Half damage."}]}`)})`);
  assert.equal(x.dpr, 20); assert.equal(x.dc, 13);
});

test("dprExtract — recharge nova: certain round 1, expected-value rounds 2-3", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[
    {mode:"text",name:"Slam",text:"*Melee Attack Roll:* +4. *Hit:* 10 (2d6 + 3) Bludgeoning damage."},
    {mode:"text",name:"Fire Breath (Recharge 5–6)",text:"*Dexterity Saving Throw:* DC 12, each creature in a 30-foot Cone. *Failure:* 20 (6d6) Fire damage. *Success:* Half damage."}
  ]}`)})`);
  // nova 40 (AoE ×2), base 10; r1 = 40, r2 = r3 = 10 + round((40-10)×1/3) = 20 → (40+20+20)/3 = 26.7
  assert.equal(x.dpr, 26.7);
  assert.equal(x.rounds[0].dmg, 40);
});

test("dprExtract — structured Forge attack entry mirrors attackText's damage maths", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[{mode:"attack",name:"Greatsword",ability:"str",atk:"",dice:"2d6",addMod:true,dtype:"Slashing",extra:""}]}`)})`);
  assert.equal(x.dpr, 10); // 2d6 avg 7 + STR mod 3, floored
  assert.equal(x.atk, 5);  // mod 3 + PB 2 at CR 1
});

test("dprExtract — legendary actions add the best damage option ONCE per round", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[{mode:"text",name:"Bite",text:"*Melee Attack Roll:* +4. *Hit:* 10 (2d6 + 3) Piercing damage."}],
    legend:{on:true,intro:"Legendary Action Uses: 3.",items:[
      {mode:"text",name:"Tail",text:"*Melee Attack Roll:* +4. *Hit:* 5 (1d4 + 3) Bludgeoning damage."},
      {mode:"text",name:"Stomp",text:"*Melee Attack Roll:* +4. *Hit:* 8 (2d4 + 3) Bludgeoning damage."}]}}`)})`);
  assert.equal(x.legendary, 8); // 1× the best option, NOT uses × best (see CR_CALIBRATION.md §T1.4)
  assert.equal(x.dpr, 18);      // base 10 + legendary 8
});

test("dprExtract — aura trait damage ticks every round; on-death explosions don't", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[{mode:"text",name:"Slam",text:"*Melee Attack Roll:* +4. *Hit:* 10 (2d6 + 3) Bludgeoning damage."}],
    traits:[
      {name:"Fire Aura",text:"At the end of each of the demon's turns, each creature in a 5-foot Emanation originating from the demon takes 7 (2d6) Fire damage."},
      {name:"Death Throes",text:"The demon explodes when it dies. *Dexterity Saving Throw:* DC 15, each creature in a 30-foot Emanation. *Failure:* 21 (6d6) Fire damage."}]}`)})`);
  assert.equal(x.aura, 14); // 7 × 2 (each creature); Death Throes excluded
  assert.equal(x.dpr, 24);
  assert.ok(x.notes.some(n => /Fire Aura/.test(n)));
});

test("dprExtract — a 3+ Failure body is a random menu: mean of the options, not the best", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[
    {mode:"text",name:"Multiattack",text:"It uses Rays three times."},
    {mode:"text",name:"Rays",text:"Random ray: - **1: Fire.** *Dexterity Saving Throw:* DC 14. *Failure:* 12 (4d4 + 2) Fire damage. *Success:* Half damage. - **2: Stun.** *Constitution Saving Throw:* DC 14. *Failure:* The target has the Stunned condition. - **3: Frost.** *Constitution Saving Throw:* DC 14. *Failure:* 18 (4d6 + 4) Cold damage. *Success:* Half damage."}
  ]}`)})`);
  // mean over the 3 menu items: (12 + 0 + 18)/3 = 10 → routine 3× = 30
  assert.equal(x.dpr, 30);
});

test("dprExtract — multiattack resolves qualified names and A-or-B counts", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[
    {mode:"text",name:"Multiattack",text:"It makes two Claw or Ray attacks and uses Bite."},
    {mode:"text",name:"Claw",text:"*Melee Attack Roll:* +5. *Hit:* 8 (1d10 + 3) Slashing damage."},
    {mode:"text",name:"Ray",text:"*Ranged Attack Roll:* +5. *Hit:* 11 (2d10) Necrotic damage."},
    {mode:"text",name:"Bite (Wolf Form Only)",text:"*Melee Attack Roll:* +5. *Hit:* 9 (1d12 + 3) Piercing damage."}
  ]}`)})`);
  assert.equal(x.dpr, 31); // 2 × max(8, 11) + 9 via the parenthetical-stripped alias
});

test("dprExtract — spell lists score against SPELL_DPR: at-will base, X/Day nova, upcast honored", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[{mode:"spell",name:"Spellcasting",ability:"int",dc:16,atk:"",groups:[
    {freq:"At Will",spells:"Fire Bolt, Fireball"},
    {freq:"1/Day Each",spells:"Meteor Swarm, Fly"}
  ]}]}`)})`);
  // Fireball 28×2 (AoE) = 56 at-will base; Meteor Swarm 140×2 = 280 as the round-1 nova
  assert.equal(x.dpr, Math.round((280 + 56 + 56) / 3 * 10) / 10);
  assert.equal(x.confidence, "ok"); // scored spells → the caster is covered, no low flag
  assert.ok(x.notes.some(n => /Spellcasting scored/.test(n)));
  const up = evJSON(`dprExtract(${mon(`{actions:[{mode:"spell",name:"Spellcasting",ability:"int",dc:16,atk:"",groups:[
    {freq:"At Will",spells:"Insect Plague (level 7 version)"}]}]}`)})`);
  assert.equal(up.dpr, (22 + 2 * 5.5) * 2); // base 22 +2 levels ×5.5, then AoE ×2 = 66
});

test("dprExtract — spellcaster with nothing scored is flagged, not silently zero", () => {
  const x = evJSON(`dprExtract(${mon(`{actions:[{mode:"spell",name:"Spellcasting",ability:"int",dc:14,atk:"",groups:[]}]}`)})`);
  assert.equal(x.confidence, "none"); // no damage parsed at all
  assert.equal(x.dc, 14);             // but the DC is still surfaced
  assert.ok(x.notes.some(n => /Spellcasting/.test(n)));
});

test("offensiveCR — DPR band anchors the CR, attack bonus nudges at the softened rate", () => {
  // dpr 36 → CR 5 band (33-41); atk +7 = expected → no step
  const o = evJSON(`offensiveCR(${mon(`{actions:[
    {mode:"text",name:"Multiattack",text:"It makes three Claw attacks."},
    {mode:"text",name:"Claw",text:"*Melee Attack Roll:* +7. *Hit:* 12 (2d8 + 3) Slashing damage."}
  ]}`)})`);
  assert.equal(o.cr, "5"); assert.equal(o.step, 0); assert.equal(o.dpr, 36);
});

// B285 — statblock entry text keeps its structure: paragraph breaks, "- " bullets (closed spans),
// " | " table runs, and inline bold/italic. fmtBlock is the single formatter behind all of it.
test("fmtBlock — paragraphs, bullets, tables, inline marks", () => {
  assert.equal(ev("fmtBlock('one\\n\\ntwo')"), "one<br><br>two");
  assert.equal(
    ev("fmtBlock('Pick one:\\n- Acid Vial\\n- Fire Cone')"),
    'Pick one:<br><span class="blk-item">Acid Vial</span><br><span class="blk-item">Fire Cone</span>');
  assert.ok(ev("fmtBlock('d6 | Effect\\n1 | Nothing')").startsWith('<table class="rc-table">'));
  assert.equal(ev("fmtBlock('plain *i* and **b**')"), "plain <i>i</i> and <b>b</b>");
});

test("statblock entries render multi-paragraph action bodies with breaks and bullets", () => {
  const html = ev(`(()=>{const m=normalizeMonster(blankMonster());m.name="Tester";
    m.actions=[{mode:"text",name:"Weapon Invention",text:"[C] uses one invention:\\n- Acid. Ranged.\\n- Alchemist Fire. Ranged."}];
    return sbEntriesHTML(m);})()`);
  assert.ok(html.includes('<span class="blk-item">'), "bullets render as items");
  assert.ok(/<div class="blk"/.test(html), "entry wrapper is a div (tables must be legal inside)");
  assert.ok((html.match(/<br>/g) || []).length >= 2, "line breaks survive");
});

// B287 — the combat panel renders LIBRARY records directly (no blankMonster template behind them),
// so normalizeMonster is the only shape guarantee they get. A record that never carried `saves`
// (hand-built import JSON; any creature with no save proficiencies) used to reach
// `m.saves.includes(a)` in sbAbilityTableHTML and blank the whole statblock.
test("normalizeMonster guarantees the array fields the renderers index unguarded", () => {
  // Shapes are asserted INSIDE the realm — cross-realm arrays fail strict deepEqual on prototypes.
  const o = ev(`(()=>{const m=normalizeMonster({id:"bare",name:"Swarm of Ravens",size:"Medium",
    type:"Beast",ac:12,hp:24,cr:"1/4",str:6,dex:14,con:10,int:3,wis:12,cha:6});
    return ["saves","mainAbils","skills","tools"]
      .map(k=>k+":"+(Array.isArray(m[k])?m[k].length:typeof m[k])).join(" ");})()`);
  assert.equal(o, "saves:0 mainAbils:0 skills:0 tools:0");
});

test("a bare library record renders through the full statblock composer", () => {
  const o = ev(`(()=>{const m=normalizeMonster({id:"bare2",name:"Swarm of Ravens",size:"Medium",
      type:"Beast",ac:12,hp:24,cr:"1/4",str:6,dex:14,con:10,int:3,wis:12,cha:6});
    const prev=M;try{M=m;const pb=pbForCR(m.cr);
      const h=sbHeaderHTML(m)+sbAbilityTableHTML(m,pb)+sbMetaHTML(m,pb,xpOf(m))+sbEntriesHTML(m);
      return {ok:true,len:h.length,name:h.indexOf("Swarm of Ravens")>=0};}
    catch(e){return {ok:false,err:e.message};}finally{M=prev;}})()`);
  assert.equal(o.ok, true, "composer threw: " + o.err);
  assert.equal(o.name, true);
  assert.ok(o.len > 200);
});

// D-046 — the death-save widget. The rules half is pure, so it's pinned here; the render is checked for
// the two things a consumer depends on (a segment per point, and the outcome glyph lighting on arrival).
test("death saves: a flat d20, with the natural 1 and natural 20 rules", () => {
  // JSON-roundtripped: cross-realm objects fail strict deepEqual on their prototypes.
  const r = ev(`JSON.stringify((()=>{const z={success:0,fail:0};return {
      hit:deathSaveApply(z,10), miss:deathSaveApply(z,9), high:deathSaveApply(z,19),
      one:deathSaveApply(z,1), oneNearDeath:deathSaveApply({success:0,fail:2},1),
      twenty:deathSaveApply({success:1,fail:2},20),
      thirdFail:deathSaveApply({success:2,fail:2},4),
      capped:deathSaveApply({success:3,fail:0},15)};})())`);
  const j = JSON.parse(r);
  assert.deepEqual(j.hit.ds, { success: 1, fail: 0 }, "10 is the DC, so 10 succeeds");
  assert.deepEqual(j.miss.ds, { success: 0, fail: 1 });
  assert.deepEqual(j.high.ds, { success: 1, fail: 0 });
  assert.deepEqual(j.one.ds, { success: 0, fail: 2 }, "a natural 1 counts twice");
  assert.equal(j.oneNearDeath.ds.fail, 3, "and it never runs past three");
  assert.equal(j.twenty.up, true, "a natural 20 puts them back up");
  assert.deepEqual(j.twenty.ds, { success: 0, fail: 0 }, "…with the slate cleared");
  assert.equal(j.thirdFail.ds.fail, 3);
  assert.equal(j.capped.ds.success, 3, "counts stay in 0-3");
});

test("death-save widget: one lit segment per point, outcome glyphs light only on arrival", () => {
  const r = ev(`(()=>{const lit=h=>(h.match(/dsw-seg dsw-[fs] on/g)||[]).length;
    const mid=deathSavesWidgetHTML({fail:2,success:1},{interactive:true});
    const dead=deathSavesWidgetHTML({fail:3,success:1},{interactive:true});
    const stable=deathSavesWidgetHTML({fail:1,success:3},{interactive:false});
    return {midLit:lit(mid), deadLit:lit(dead),
      midEndsOff:mid.indexOf("dsw-end dsw-f on")<0&&mid.indexOf("dsw-end dsw-s on")<0,
      deadSkullOn:dead.indexOf("dsw-end dsw-f on")>=0, deadClass:dead.indexOf("dsw-dead")>=0,
      stablePulseOn:stable.indexOf("dsw-end dsw-s on")>=0, stableClass:stable.indexOf("dsw-stable")>=0,
      midHits:(mid.match(/data-dsset=/g)||[]).length, midRoll:mid.indexOf("data-dsroll")>=0,
      roHits:(stable.match(/data-dsset=/g)||[]).length, roRoll:stable.indexOf("data-dsroll")>=0,
      overflow:lit(deathSavesWidgetHTML({fail:9,success:-4},{}))};})()`);
  assert.equal(r.midLit, 3, "two failures and one success light three segments");
  assert.equal(r.midEndsOff, true, "neither outcome glyph lights before its side completes");
  assert.equal(r.deadLit, 4);
  assert.equal(r.deadSkullOn, true);
  assert.equal(r.deadClass, true);
  assert.equal(r.stablePulseOn, true);
  assert.equal(r.stableClass, true);
  assert.equal(r.midHits, 6, "every segment is correctable when interactive");
  assert.equal(r.midRoll, true, "…and the die is a button");
  assert.equal(r.roHits, 0, "a read-only widget offers no targets");
  assert.equal(r.roRoll, false);
  assert.equal(r.overflow, 3, "junk counts clamp to 0-3 rather than drawing extra arcs");
});
