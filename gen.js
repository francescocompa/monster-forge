// Monster Forge — GEN: the random level-1 PC generator ("crew"). Species-blind engine over data
// packs (D-001); every choice is pick-or-roll with the option table shown before the dice land and
// any result overridable by clicking it (D-004, D-011). Payloads — never derived stats — travel the
// share channel; the DM app re-derives locally (D-007). Loaded as a classic <script> sharing ONE
// global scope (after roster.js, before combat.js). No imports. UI copy English, matter-of-fact.
//
// Rules basis: D&D 2024 PHB (XPHB) classes, feats, spell lists, transcribed from the local 5etools
// mirror; species = 2014 MPMM Kobold. Class spells roll from the install's own uploaded spell
// library intersected with the shipped class index (D-012); equipment rolls over drafted PHB-legal
// kits, more for martials (D-013); gear adds a rolled pack + two sundries (D-014).

// ── Tiny pure helpers ─────────────────────────────────────────────────────────
function genRollDie(rng,faces){return 1+Math.floor((rng||Math.random)()*faces);}
// Roll on a numbered table whose die may exceed its length (reroll results above `len`), or whose
// entries must avoid `taken` (reroll duplicates). Returns the final accepted result (1-based).
function genRollTable(rng,die,len,taken){
  for(let i=0;i<200;i++){const r=genRollDie(rng,die);if(r>len)continue;if(taken&&taken.has(r))continue;return r;}
  for(let r=1;r<=len;r++)if(!taken||!taken.has(r))return r; // degenerate fallback: first free entry
  return 1;
}
function genDieFor(len){return [4,6,8,10,12,20].find(f=>f>=len)||100;}
function genDieLabel(len){const d=genDieFor(len);return "d"+d+(d>len?" (reroll over "+len+")":"");}
// Equal-weight span over a die: N options on dF → each option covers F/N faces (D-011: 3 options on
// a d6 = 1-2 / 3-4 / 5-6). Requires F divisible by N or falls back to reroll-above-len numbering.
function genSpanFor(nOpts){
  const die=[4,6,8,10,12,20].find(f=>f%nOpts===0&&f>=nOpts)||genDieFor(nOpts);
  const w=die%nOpts===0?die/nOpts:1;
  return {die,spans:Array.from({length:nOpts},(x,i)=>w>1?[i*w+1,(i+1)*w]:[i+1,i+1]),reroll:die%nOpts!==0};
}
function genSpanHit(span,r){return Array.from({length:span.spans.length},(x,i)=>i).find(i=>r>=span.spans[i][0]&&r<=span.spans[i][1]);}
const GEN_ABILS=["str","dex","con","int","wis","cha"];
const GEN_ABIL_LABEL={str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const GEN_SKILLS=[["Acrobatics","dex"],["Animal Handling","wis"],["Arcana","int"],["Athletics","str"],
  ["Deception","cha"],["History","int"],["Insight","wis"],["Intimidation","cha"],["Investigation","int"],
  ["Medicine","wis"],["Nature","int"],["Perception","wis"],["Performance","cha"],["Persuasion","cha"],
  ["Religion","int"],["Sleight of Hand","dex"],["Stealth","dex"],["Survival","wis"]];
const GEN_SKILL_ABIL={};GEN_SKILLS.forEach(([n,a])=>{GEN_SKILL_ABIL[n]=a;});
const GEN_SKILL_NAMES=GEN_SKILLS.map(s=>s[0]);

// D-025: familiar statblocks (XMM, via the app's own 5etools parser) — shipped in-code so
// phones render them without the DM's bestiary; the wire stays payload-only (D-007).
const GEN_FAMILIAR_CHAIN=["Imp","Pseudodragon","Quasit","Skeleton","Slaad Tadpole","Sphinx of Wonder","Sprite","Venomous Snake"];
const GEN_FAMILIAR_BEASTS=["Bat","Cat","Frog","Hawk","Lizard","Octopus","Owl","Rat","Raven","Spider","Weasel"];
const GEN_FAMILIARS={
"Bat":{"name":"Bat","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":12,"hp":1,"hpf":"1d4 - 1","spd":{"walk":5,"climb":0,"fly":30,"swim":0,"burrow":0,"hover":false},"str":2,"dex":15,"con":8,"int":2,"wis":12,"cha":4,"senses":{"darkvision":0,"blindsight":60,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","actions":[{"name":"Bite","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 1 Piercing damage.","mode":"text"}]},
"Cat":{"name":"Cat","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":12,"hp":2,"hpf":"1d4","spd":{"walk":40,"climb":40,"fly":0,"swim":0,"burrow":0,"hover":false},"str":3,"dex":15,"con":10,"int":3,"wis":12,"cha":7,"saves":["dex"],"skills":[["Perception","prof"],["Stealth","prof"]],"senses":{"darkvision":60,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Jumper","text":"The cat's jump distance is determined using its Dexterity rather than its Strength.","mode":"text"}],"actions":[{"name":"Scratch","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 1 Slashing damage.","mode":"text"}]},
"Frog":{"name":"Frog","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":11,"hp":1,"hpf":"1d4 - 1","spd":{"walk":20,"climb":0,"fly":0,"swim":20,"burrow":0,"hover":false},"str":1,"dex":13,"con":8,"int":1,"wis":8,"cha":3,"skills":[["Perception","prof"],["Stealth","prof"]],"senses":{"darkvision":30,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Amphibious","text":"The frog can breathe air and water.","mode":"text"},{"name":"Standing Leap","text":"The frog's Long Jump is up to 10 feet and its High Jump is up to 5 feet with or without a running start.","mode":"text"}],"actions":[{"name":"Bite","text":"*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 1 Piercing damage.","mode":"text"}]},
"Hawk":{"name":"Hawk","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":13,"hp":1,"hpf":"1d4 - 1","spd":{"walk":10,"climb":0,"fly":60,"swim":0,"burrow":0,"hover":false},"str":5,"dex":16,"con":8,"int":2,"wis":14,"cha":6,"skills":[["Perception","exp"]],"senses":{"darkvision":0,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","actions":[{"name":"Talons","text":"*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 1 Slashing damage.","mode":"text"}]},
"Imp":{"name":"Imp","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Fiend","subtype":"devil","align":"Lawful Evil","ac":13,"hp":21,"hpf":"6d4 + 6","spd":{"walk":20,"climb":0,"fly":40,"swim":0,"burrow":0,"hover":false},"str":6,"dex":17,"con":13,"int":11,"wis":12,"cha":14,"skills":[["Deception","prof"],["Insight","prof"],["Stealth","prof"]],"dmg":{"Fire":"imm","Poison":"imm","Cold":"res"},"cimm":"poisoned","senses":{"darkvision":120,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":"(unimpeded by magical Darkness)"},"lang":"Common, Infernal","cr":"1","traits":[{"name":"Magic Resistance","text":"The imp has Advantage on saving throws against spells and other magical effects.","mode":"text"}],"actions":[{"name":"Sting","text":"*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Piercing damage plus 7 (2d6) Poison damage.","mode":"text"},{"name":"Shape-Shift","text":"The imp shape-shifts to resemble a rat (Speed 20 ft.), a raven (20 ft., Fly 60 ft.), or a spider (20 ft., Climb 20 ft.), or it returns to its true form. Its statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed.","mode":"text"},{"mode":"text","name":"Invisibility","text":"The imp casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.","_spells":["Invisibility"]}]},
"Lizard":{"name":"Lizard","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":10,"hp":2,"hpf":"1d4","spd":{"walk":20,"climb":20,"fly":0,"swim":0,"burrow":0,"hover":false},"str":2,"dex":11,"con":10,"int":1,"wis":8,"cha":3,"senses":{"darkvision":30,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Spider Climb","text":"The lizard can climb difficult surfaces, including along ceilings, without needing to make an ability check.","mode":"text"}],"actions":[{"name":"Bite","text":"*Melee Attack Roll:* +2, reach 5 ft. *Hit:* 1 Piercing damage.","mode":"text"}]},
"Octopus":{"name":"Octopus","shortName":{"word":"creature","proper":false,"plural":false},"size":"Small","type":"Beast","align":"Unaligned","ac":12,"hp":3,"hpf":"1d6","spd":{"walk":5,"climb":0,"fly":0,"swim":30,"burrow":0,"hover":false},"str":4,"dex":15,"con":11,"int":3,"wis":10,"cha":4,"skills":[["Perception","prof"],["Stealth","exp"]],"senses":{"darkvision":30,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Compression","text":"The octopus can move through a space as narrow as 1 inch without expending extra movement to do so.","mode":"text"},{"name":"Water Breathing","text":"The octopus can breathe only underwater.","mode":"text"}],"actions":[{"name":"Tentacles","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 1 Bludgeoning damage.","mode":"text"}],"reactions":[{"mode":"react","name":"Ink Cloud (1/Day)","trigger":"A creature ends its turn within 5 feet of the octopus while underwater.","response":"The octopus releases ink that fills a 5-foot Cube centered on itself, and the octopus moves up to its Swim Speed. The Cube is Heavily Obscured for 1 minute or until a strong current or similar effect disperses the ink."}]},
"Owl":{"name":"Owl","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":11,"hp":1,"hpf":"1d4 - 1","spd":{"walk":5,"climb":0,"fly":60,"swim":0,"burrow":0,"hover":false},"str":3,"dex":13,"con":8,"int":2,"wis":12,"cha":7,"skills":[["Perception","exp"],["Stealth","exp"]],"senses":{"darkvision":120,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Flyby","text":"The owl doesn't provoke Opportunity Attacks when it flies out of an enemy's reach.","mode":"text"}],"actions":[{"name":"Talons","text":"*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 1 Slashing damage.","mode":"text"}]},
"Pseudodragon":{"name":"Pseudodragon","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Dragon","align":"Neutral Good","ac":14,"hp":10,"hpf":"3d4 + 3","spd":{"walk":15,"climb":0,"fly":60,"swim":0,"burrow":0,"hover":false},"str":6,"dex":15,"con":13,"int":10,"wis":12,"cha":10,"skills":[["Perception","exp"],["Stealth","prof"]],"senses":{"darkvision":60,"blindsight":10,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"understands Common and Draconic but can't speak","cr":"1/4","traits":[{"name":"Magic Resistance","text":"The pseudodragon has Advantage on saving throws against spells and other magical effects.","mode":"text"}],"actions":[{"name":"Multiattack","text":"The pseudodragon makes two Bite attacks.","mode":"text"},{"name":"Bite","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 4 (1d4 + 2) Piercing damage.","mode":"text"},{"name":"Sting","text":"*Constitution Saving Throw:* DC 12, one creature the pseudodragon can see within 5 feet. *Failure:* 5 (2d4) Poison damage, and the target has the Poisoned condition for 1 hour. While Poisoned, the target also has the Unconscious condition, which ends early if the target takes damage or a creature within 5 feet of it takes an action to wake it.","mode":"text"}]},
"Quasit":{"name":"Quasit","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Fiend","subtype":"demon","align":"Chaotic Evil","ac":13,"hp":25,"hpf":"10d4","spd":{"walk":40,"climb":0,"fly":0,"swim":0,"burrow":0,"hover":false},"str":5,"dex":17,"con":10,"int":7,"wis":10,"cha":10,"skills":[["Stealth","prof"]],"dmg":{"Poison":"imm","Cold":"res","Fire":"res","Lightning":"res"},"cimm":"poisoned","senses":{"darkvision":120,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Abyssal, Common","cr":"1","traits":[{"name":"Magic Resistance","text":"The quasit has Advantage on saving throws against spells and other magical effects.","mode":"text"}],"actions":[{"name":"Rend","text":"*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 5 (1d4 + 3) Slashing damage, and the target has the Poisoned condition until the start of the quasit's next turn.","mode":"text"},{"name":"Scare (1/Day)","text":"*Wisdom Saving Throw:* DC 10, one creature within 20 feet. *Failure:* The target has the Frightened condition. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success. After 1 minute, it succeeds automatically.","mode":"text"},{"name":"Shape-Shift","text":"The quasit shape-shifts to resemble a bat (Speed 10 ft., Fly 40 ft.), a centipede (40 ft., Climb 40 ft.), or a toad (40 ft., Swim 40 ft.), or it returns to its true form. Its game statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed.","mode":"text"},{"mode":"text","name":"Invisibility","text":"The quasit casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.","_spells":["Invisibility"]}]},
"Rat":{"name":"Rat","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":10,"hp":1,"hpf":"1d4 - 1","spd":{"walk":20,"climb":20,"fly":0,"swim":0,"burrow":0,"hover":false},"str":2,"dex":11,"con":9,"int":2,"wis":10,"cha":4,"skills":[["Perception","prof"]],"senses":{"darkvision":30,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Agile","text":"The rat doesn't provoke Opportunity Attacks when it moves out of an enemy's reach.","mode":"text"}],"actions":[{"name":"Bite","text":"*Melee Attack Roll:* +2, reach 5 ft. *Hit:* 1 Piercing damage.","mode":"text"}]},
"Raven":{"name":"Raven","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":12,"hp":2,"hpf":"1d4","spd":{"walk":10,"climb":0,"fly":50,"swim":0,"burrow":0,"hover":false},"str":2,"dex":14,"con":10,"int":5,"wis":13,"cha":6,"skills":[["Perception","prof"]],"senses":{"darkvision":0,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Mimicry","text":"The raven can mimic simple sounds it has heard, such as a whisper or chitter. A hearer can discern the sounds are imitations with a successful DC 10 Wisdom (Insight) check.","mode":"text"}],"actions":[{"name":"Beak","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 1 Piercing damage.","mode":"text"}]},
"Skeleton":{"name":"Skeleton","shortName":{"word":"creature","proper":false,"plural":false},"size":"Medium","type":"Undead","align":"Lawful Evil","ac":14,"hp":13,"hpf":"2d8 + 4","spd":{"walk":30,"climb":0,"fly":0,"swim":0,"burrow":0,"hover":false},"str":10,"dex":16,"con":15,"int":6,"wis":8,"cha":5,"dmg":{"Poison":"imm","Bludgeoning":"vuln"},"cimm":"exhaustion, poisoned","senses":{"darkvision":60,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"understands Common plus one other language but can't speak","cr":"1/4","actions":[{"name":"Shortsword","text":"*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Piercing damage.","mode":"text"},{"name":"Shortbow","text":"*Ranged Attack Roll:* +5, range 80/320 ft. *Hit:* 6 (1d6 + 3) Piercing damage.","mode":"text"}]},
"Slaad Tadpole":{"name":"Slaad Tadpole","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Aberration","align":"Chaotic Neutral","ac":12,"hp":7,"hpf":"3d4","spd":{"walk":30,"climb":0,"fly":0,"swim":0,"burrow":10,"hover":false},"str":7,"dex":15,"con":10,"int":3,"wis":5,"cha":3,"skills":[["Stealth","prof"]],"dmg":{"Acid":"res","Cold":"res","Fire":"res","Lightning":"res","Thunder":"res"},"senses":{"darkvision":60,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"understands Slaad but can't speak","cr":"1/8","traits":[{"name":"Magic Resistance","text":"The slaad has Advantage on saving throws against spells and other magical effects.","mode":"text"}],"actions":[{"name":"Bite","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage.","mode":"text"}]},
"Sphinx of Wonder":{"name":"Sphinx of Wonder","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Celestial","align":"Lawful Good","ac":13,"hp":24,"hpf":"7d4 + 7","spd":{"walk":20,"climb":0,"fly":40,"swim":0,"burrow":0,"hover":false},"str":6,"dex":17,"con":13,"int":15,"wis":12,"cha":11,"skills":[["Arcana","prof"],["Religion","prof"],["Stealth","prof"]],"dmg":{"Necrotic":"res","Psychic":"res","Radiant":"res"},"senses":{"darkvision":60,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Celestial, Common","cr":"1","traits":[{"name":"Magic Resistance","text":"The sphinx has Advantage on saving throws against spells and other magical effects.","mode":"text"}],"actions":[{"name":"Rend","text":"*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 5 (1d4 + 3) Slashing damage plus 7 (2d6) Radiant damage.","mode":"text"}],"reactions":[{"mode":"react","name":"Burst of Ingenuity (2/Day)","trigger":"The sphinx or another creature within 30 feet makes an ability check or a saving throw.","response":"The sphinx adds 2 to the roll."}]},
"Spider":{"name":"Spider","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":12,"hp":1,"hpf":"1d4 - 1","spd":{"walk":20,"climb":20,"fly":0,"swim":0,"burrow":0,"hover":false},"str":2,"dex":14,"con":8,"int":1,"wis":10,"cha":2,"skills":[["Stealth","prof"]],"senses":{"darkvision":30,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","traits":[{"name":"Spider Climb","text":"The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check.","mode":"text"},{"name":"Web Walker","text":"The spider ignores movement restrictions caused by webs, and the spider knows the location of any other creature in contact with the same web.","mode":"text"}],"actions":[{"name":"Bite","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 1 Piercing damage plus 2 (1d4) Poison damage.","mode":"text"}]},
"Sprite":{"name":"Sprite","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Fey","align":"Neutral Good","ac":15,"hp":10,"hpf":"4d4","spd":{"walk":10,"climb":0,"fly":40,"swim":0,"burrow":0,"hover":false},"str":3,"dex":18,"con":10,"int":14,"wis":13,"cha":11,"skills":[["Perception","prof"],["Stealth","exp"]],"senses":{"darkvision":0,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common, Elvish, Sylvan","cr":"1/4","actions":[{"name":"Needle Sword","text":"*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 6 (1d4 + 4) Piercing damage.","mode":"text"},{"name":"Enchanting Bow","text":"*Ranged Attack Roll:* +6, range 40/160 ft. *Hit:* 1 Piercing damage, and the target has the Charmed condition until the start of the sprite's next turn.","mode":"text"},{"name":"Heart Sight","text":"*Charisma Saving Throw:* DC 10, one creature within 5 feet the sprite can see (Celestials, Fiends, and Undead automatically fail the save). *Failure:* The sprite knows the target's emotions and alignment.","mode":"text"},{"mode":"text","name":"Invisibility","text":"The sprite casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.","_spells":["Invisibility"]}]},
"Venomous Snake":{"name":"Venomous Snake","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":12,"hp":5,"hpf":"2d4","spd":{"walk":30,"climb":0,"fly":0,"swim":30,"burrow":0,"hover":false},"str":2,"dex":15,"con":11,"int":1,"wis":10,"cha":3,"senses":{"darkvision":0,"blindsight":10,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"1/8","actions":[{"name":"Bite","text":"*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 4 (1d4 + 2) Piercing damage plus 3 (1d6) Poison damage.","mode":"text"}]},
"Weasel":{"name":"Weasel","shortName":{"word":"creature","proper":false,"plural":false},"size":"Tiny","type":"Beast","align":"Unaligned","ac":13,"hp":1,"hpf":"1d4 - 1","spd":{"walk":30,"climb":30,"fly":0,"swim":0,"burrow":0,"hover":false},"str":3,"dex":16,"con":8,"int":2,"wis":12,"cha":3,"skills":[["Acrobatics","prof"],["Perception","prof"],["Stealth","prof"]],"senses":{"darkvision":60,"blindsight":0,"tremorsense":0,"truesight":0,"blindBeyond":false,"other":""},"lang":"Common","cr":"0","actions":[{"name":"Bite","text":"*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 1 Piercing damage.","mode":"text"}]}
};

// ── Species packs (D-001, generalized D-030) ─────────────────────────────────
// A pack: {label, size, speed, darkvision, langs, traits, bonus, res, tables, resists?, casts?,
//   hpPerLevel?, extraFeat?}. Table entries carry a declarative `fx` payload consumed generically
// by deriveGenChar — no species names in the engine. fx fields (all optional):
//   trait/bonus/action:{n,t} — statblock entries; t may template {DC:abil}, {MOD:abil}, {PB}
//   skillSub:true   — the entry's sub value is a skill proficiency
//   cast:{label,abil,cantrip?|spell?,freq?} — a species-granted cast; abil "mental" = best of
//     Int/Wis/Cha; cantrip:"sub" reads the sub value (Draconic Sorcery)
//   resist:"Fire"|"sub" — damage resistance (sub reads the sub value)
//   size:"Medium" — size override · fly:30 — fly speed · res:{k,label,max,per,sr?} — a resource
// A table may instead be kind:"skill": entries are plain skill names, the value is the chosen name
// (Human Skillful, Elf Keen Senses). `extraFeat:true` adds a second origin-feat step (Human).
const GEN_SPECIES={
  kobold:{
    label:"Kobold",
    size:"Small",speed:30,darkvision:60,langs:["Common","Draconic"],
    traits:[],
    bonus:[{n:"Draconic Cry (2/Long Rest)",t:"The kobold cries out at enemies within 10 feet of it. Until the start of its next turn, it and its allies have Advantage on attack rolls against those enemies."}],
    res:[{k:"cry",label:"Draconic Cry",max:2,per:"Long Rest"}],
    tables:[
      {id:"legacy",label:"Kobold Legacy",die:6,entries:[
        {lo:1,hi:2,label:"Craftiness",value:"craftiness",
          fx:{skillSub:true,trait:{n:"Kobold Legacy: Craftiness",t:"Proficient in {SUB} (counted in the Skills line)."}},
          sub:{id:"craftskill",label:"Craftiness skill",die:6,kind:"skill",
               entries:["Arcana","Investigation","Medicine","Sleight of Hand","Survival"]}},
        {lo:3,hi:4,label:"Defiance",value:"defiance",
          fx:{trait:{n:"Kobold Legacy: Defiance",t:"Advantage on saving throws to avoid or end the Frightened condition."}}},
        {lo:5,hi:6,label:"Draconic Sorcery",value:"sorcery",
          fx:{cast:{label:"Draconic Sorcery",abil:"mental",cantrip:"sub"}},
          sub:{id:"cantrip",label:"Sorcerer cantrip",die:20,kind:"cantrip",
               entries:["Acid Splash","Blade Ward","Chill Touch","Dancing Lights","Elementalism",
                 "Fire Bolt","Friends","Light","Mage Hand","Mending","Message","Mind Sliver",
                 "Minor Illusion","Poison Spray","Prestidigitation","Ray of Frost","Shocking Grasp",
                 "Sorcerous Burst","Thunderclap","True Strike"]}}
      ]},
      // D-028: the boon table — most rolls land nothing, 13-19 one boon each (ascending power),
      // a natural 20 keeps the mythic wings. Old payloads (value true/false) stay valid.
      {id:"wings",label:"Draconic Boon",die:20,entries:[
        {lo:1,hi:12,label:"No boon",value:false},
        {lo:13,hi:13,label:"Grasping tail",value:"tail",
          fx:{bonus:{n:"Grasping Tail",t:"As a Bonus Action, the character can use its tail to manipulate an object, open or close a door or container, or pick up or set down a Tiny object. The tail can also Grapple (escape DC {DC:str})."}}},
        {lo:14,hi:14,label:"Draconic Resistance",value:"resist",
          fx:{resist:"sub",trait:{n:"Draconic Resistance",t:"Resistance to {SUB} damage."}},
          sub:{id:"boontype",label:"Draconic type",die:6,entries:["Acid","Cold","Fire","Lightning","Poison"]}},
        {lo:15,hi:15,label:"Grovel, Cower, and Beg",value:"grovel",
          fx:{action:{n:"Grovel, Cower, and Beg (1/Short Rest)",t:"The character throws a distracting fit. Until the start of its next turn, its allies have Advantage on attack rolls against enemies within 10 feet of it."},
              res:{k:"grovel",label:"Grovel, Cower, and Beg",max:1,per:"Short Rest"}}},
        {lo:16,hi:16,label:"Medium size and Powerful Build",value:"build",
          fx:{size:"Medium",trait:{n:"Powerful Build",t:"Counts as one size larger for carrying capacity; Advantage on ability checks made to end the Grappled condition."}}},
        {lo:17,hi:17,label:"Dragon Fear",value:"fear",
          fx:{bonus:{n:"Dragon Fear (1/Long Rest)",t:"*Wisdom Saving Throw:* DC {DC:cha}, one creature within 10 feet. *Failure:* the target has the Frightened condition until the end of the character's next turn."},
              res:{k:"fear",label:"Dragon Fear",max:1,per:"Long Rest"}}},
        {lo:18,hi:18,label:"Dragon's Breath",value:"breath",
          fx:{action:{n:"Dragon's Breath (2/Long Rest)",t:"*Dexterity Saving Throw:* DC {DC:con}, each creature in a 15-foot Cone. *Failure:* 1d10 {SUB} damage. *Success:* Half damage."},
              res:{k:"breath",label:"Dragon's Breath",max:2,per:"Long Rest"}},
          sub:{id:"boontype",label:"Breath type",die:6,entries:["Acid","Cold","Fire","Lightning","Poison"]}},
        {lo:19,hi:19,label:"Pack Tactics",value:"packtactics",
          fx:{trait:{n:"Pack Tactics",t:"Advantage on an attack roll if at least one of the character's allies is within 5 feet of the target and the ally doesn't have the Incapacitated condition."}}},
        {lo:20,hi:20,label:"Functional wings: Fly Speed 30 ft.",value:true,fx:{fly:30}}
      ]}
    ]
  },
  // ── The ten XPHB 2024 species (D-030) — level-1 content only, transcribed from the mirror.
  // Higher-level traits (Celestial Revelation, Draconic Flight, Large Form, lineage L3/L5 spells)
  // are out of the generator's level-1 scope. PB-scaled uses are baked at 2 (L1-only by scope).
  aasimar:{
    label:"Aasimar",
    size:"Medium",speed:30,darkvision:60,langs:["Common"],
    resists:["Necrotic","Radiant"],
    casts:[{label:"Light Bearer",abil:"cha",cantrip:"Light"}],
    traits:[],
    bonus:[],
    actions:[{n:"Healing Hands (1/Long Rest)",t:"As a Magic action, the character touches a creature: it regains 2d4 Hit Points."}],
    res:[{k:"heal",label:"Healing Hands",max:1,per:"Long Rest"}],
    tables:[]
  },
  dragonborn:{
    label:"Dragonborn",
    size:"Medium",speed:30,darkvision:60,langs:["Common","Draconic"],
    traits:[],
    tables:[
      {id:"ancestry",label:"Draconic Ancestry",die:10,entries:[
        ["Black","Acid"],["Blue","Lightning"],["Brass","Fire"],["Bronze","Lightning"],["Copper","Acid"],
        ["Gold","Fire"],["Green","Poison"],["Red","Fire"],["Silver","Cold"],["White","Cold"]
      ].map(([drag,type],i)=>({lo:i+1,hi:i+1,label:drag+" ("+type+")",value:drag.toLowerCase(),
        fx:{resist:type,
            action:{n:"Breath Weapon (2/Long Rest)",t:"*Dexterity Saving Throw:* DC {DC:con}, each creature in a 15-foot Cone or a 30-foot Line 5 feet wide (chosen each use). *Failure:* 1d10 "+type+" damage. *Success:* Half damage. Taking the Attack action, the breath can replace one attack."},
            res:{k:"breath",label:"Breath Weapon",max:2,per:"Long Rest"}}}))}
    ]
  },
  dwarf:{
    label:"Dwarf",
    size:"Medium",speed:30,darkvision:120,langs:["Common","Dwarvish"],
    resists:["Poison"],hpPerLevel:1,
    traits:[
      {n:"Dwarven Resilience",t:"Advantage on saving throws to avoid or end the Poisoned condition."},
      {n:"Dwarven Toughness",t:"Hit Point maximum increases by 1 per level (already counted)."}],
    bonus:[{n:"Stonecunning (2/Long Rest)",t:"As a Bonus Action, gain Tremorsense with a range of 60 feet for 10 minutes. The character must be on or touching a stone surface (natural or worked)."}],
    res:[{k:"stone",label:"Stonecunning",max:2,per:"Long Rest"}],
    tables:[]
  },
  elf:{
    label:"Elf",
    size:"Medium",speed:30,darkvision:60,langs:["Common","Elvish"],
    traits:[
      {n:"Fey Ancestry",t:"Advantage on saving throws to avoid or end the Charmed condition."},
      {n:"Trance",t:"The character doesn't need sleep and magic can't put it to sleep; a Long Rest completes in 4 hours of trancelike meditation."}],
    tables:[
      {id:"keensenses",label:"Keen Senses",kind:"skill",entries:["Insight","Perception","Survival"]},
      {id:"lineage",label:"Elven Lineage",die:6,entries:[
        {lo:1,hi:2,label:"Drow",value:"drow",
          fx:{darkvision:120,cast:{label:"Drow Lineage",abil:"mental",cantrip:"Dancing Lights"},
              trait:{n:"Elven Lineage: Drow",t:"Darkvision range is 120 feet (already counted)."}}},
        {lo:3,hi:4,label:"High Elf",value:"high",
          fx:{cast:{label:"High Elf Lineage",abil:"mental",cantrip:"Prestidigitation"},
              trait:{n:"Elven Lineage: High Elf",t:"After a Long Rest, the Prestidigitation cantrip can be swapped for another Wizard cantrip."}}},
        {lo:5,hi:6,label:"Wood Elf",value:"wood",
          fx:{speed:35,cast:{label:"Wood Elf Lineage",abil:"mental",cantrip:"Druidcraft"},
              trait:{n:"Elven Lineage: Wood Elf",t:"Speed is 35 feet (already counted)."}}}
      ]}
    ]
  },
  gnome:{
    label:"Gnome",
    size:"Small",speed:30,darkvision:60,langs:["Common","Gnomish"],
    traits:[{n:"Gnomish Cunning",t:"Advantage on Intelligence, Wisdom, and Charisma saving throws."}],
    tables:[
      {id:"lineage",label:"Gnomish Lineage",die:6,entries:[
        {lo:1,hi:3,label:"Forest Gnome",value:"forest",
          fx:{cast:{label:"Forest Gnome",abil:"mental",cantrip:"Minor Illusion",spell:"Speak with Animals",freq:"2/Long Rest (also castable with slots)"},
              res:{k:"speakan",label:"Speak with Animals",max:2,per:"Long Rest"}}},
        {lo:4,hi:6,label:"Rock Gnome",value:"rock",
          fx:{cast:[{label:"Rock Gnome",abil:"mental",cantrip:"Mending"},{label:"Rock Gnome",abil:"mental",cantrip:"Prestidigitation"}],
              trait:{n:"Gnomish Lineage: Rock Gnome",t:"Spending 10 minutes casting Prestidigitation creates a Tiny clockwork device (AC 5, 1 HP) that produces one chosen Prestidigitation effect when activated with a touch as a Bonus Action. It works for 8 hours; up to 3 can exist at once."}}}
      ]}
    ]
  },
  goliath:{
    label:"Goliath",
    size:"Medium",speed:35,darkvision:0,langs:["Common","Giant"],
    traits:[{n:"Powerful Build",t:"Advantage on ability checks made to end the Grappled condition; counts as one size larger for carrying capacity."}],
    tables:[
      {id:"ancestry",label:"Giant Ancestry",die:6,entries:[
        {lo:1,hi:1,label:"Cloud's Jaunt",value:"cloud",
          fx:{bonus:{n:"Cloud's Jaunt (2/Long Rest)",t:"As a Bonus Action, the character magically teleports up to 30 feet to an unoccupied space it can see."},
              res:{k:"giant",label:"Cloud's Jaunt",max:2,per:"Long Rest"}}},
        {lo:2,hi:2,label:"Fire's Burn",value:"fire",
          fx:{trait:{n:"Fire's Burn (2/Long Rest)",t:"On hitting a target with an attack roll and dealing damage, deal an extra 1d10 Fire damage to it."},
              res:{k:"giant",label:"Fire's Burn",max:2,per:"Long Rest"}}},
        {lo:3,hi:3,label:"Frost's Chill",value:"frost",
          fx:{trait:{n:"Frost's Chill (2/Long Rest)",t:"On hitting a target with an attack roll and dealing damage, deal an extra 1d6 Cold damage and reduce its Speed by 10 feet until the start of the character's next turn."},
              res:{k:"giant",label:"Frost's Chill",max:2,per:"Long Rest"}}},
        {lo:4,hi:4,label:"Hill's Tumble",value:"hill",
          fx:{trait:{n:"Hill's Tumble (2/Long Rest)",t:"On hitting a Large or smaller creature with an attack roll and dealing damage, give it the Prone condition."},
              res:{k:"giant",label:"Hill's Tumble",max:2,per:"Long Rest"}}},
        {lo:5,hi:5,label:"Stone's Endurance",value:"stone",
          fx:{trait:{n:"Stone's Endurance (2/Long Rest)",t:"On taking damage, use a Reaction to roll 1d12, add the Constitution modifier ({MOD:con}), and reduce the damage by the total."},
              res:{k:"giant",label:"Stone's Endurance",max:2,per:"Long Rest"}}},
        {lo:6,hi:6,label:"Storm's Thunder",value:"storm",
          fx:{trait:{n:"Storm's Thunder (2/Long Rest)",t:"On taking damage from a creature within 60 feet, use a Reaction to deal 1d8 Thunder damage to that creature."},
              res:{k:"giant",label:"Storm's Thunder",max:2,per:"Long Rest"}}}
      ]}
    ]
  },
  halfling:{
    label:"Halfling",
    size:"Small",speed:30,darkvision:0,langs:["Common","Halfling"],
    traits:[
      {n:"Brave",t:"Advantage on saving throws to avoid or end the Frightened condition."},
      {n:"Halfling Nimbleness",t:"Can move through the space of any creature a size larger, but can't stop there."},
      {n:"Luck",t:"On rolling a 1 on the d20 of a D20 Test, reroll the die; the new roll stands."},
      {n:"Naturally Stealthy",t:"Can take the Hide action even when obscured only by a creature at least one size larger."}],
    tables:[]
  },
  human:{
    label:"Human",
    size:"Medium",speed:30,darkvision:0,langs:["Common"],extraFeat:true,
    traits:[{n:"Resourceful",t:"Gains Heroic Inspiration on finishing a Long Rest."}],
    tables:[{id:"skillful",label:"Skillful",kind:"skill",entries:[...GEN_SKILL_NAMES]}]
  },
  orc:{
    label:"Orc",
    size:"Medium",speed:30,darkvision:120,langs:["Common","Orc"],
    traits:[{n:"Relentless Endurance (1/Long Rest)",t:"On being reduced to 0 Hit Points but not killed outright, drop to 1 Hit Point instead."}],
    bonus:[{n:"Adrenaline Rush (2/Short Rest)",t:"Take the Dash action as a Bonus Action, gaining 2 Temporary Hit Points."}],
    res:[{k:"rush",label:"Adrenaline Rush",max:2,per:"Short Rest"},
         {k:"relentless",label:"Relentless Endurance",max:1,per:"Long Rest"}],
    tables:[]
  },
  tiefling:{
    label:"Tiefling",
    size:"Medium",speed:30,darkvision:60,langs:["Common","Infernal"],
    casts:[{label:"Otherworldly Presence",abil:"mental",cantrip:"Thaumaturgy"}],
    traits:[],
    tables:[
      {id:"legacy",label:"Fiendish Legacy",die:6,entries:[
        {lo:1,hi:2,label:"Abyssal",value:"abyssal",
          fx:{resist:"Poison",cast:{label:"Abyssal Legacy",abil:"mental",cantrip:"Poison Spray"}}},
        {lo:3,hi:4,label:"Chthonic",value:"chthonic",
          fx:{resist:"Necrotic",cast:{label:"Chthonic Legacy",abil:"mental",cantrip:"Chill Touch"}}},
        {lo:5,hi:6,label:"Infernal",value:"infernal",
          fx:{resist:"Fire",cast:{label:"Infernal Legacy",abil:"mental",cantrip:"Fire Bolt"}}}
      ]}
    ]
  }
};
// D-033: origin-feat TEXTS follow the install's uploaded feats.json when a name matches; the
// shipped condensed text is the fallback, and the d10 + mechanical hooks stay shipped (the
// closed domain) — the D-012 pattern applied to feats.
function genFeatText(name,fallback){
  if(typeof enFeats!=="function")return fallback;
  const up=enFeats().find(f=>f.name.toLowerCase()===String(name).toLowerCase()&&f.text);
  return up?up.text:fallback;
}
// D-030: uploaded species packs (races.json → parseRacesJSON → state.species) join the shipped
// packs under their namespaced keys ("u_<file>_<name>" — never colliding with shipped ids).
// Rebuilt on load, upload, and library toggles; shipped packs are never touched.
const GEN_SPECIES_SHIPPED=new Set(Object.keys(GEN_SPECIES));
function genSyncSpecies(){
  Object.keys(GEN_SPECIES).forEach(k=>{if(!GEN_SPECIES_SHIPPED.has(k))delete GEN_SPECIES[k];});
  (typeof enSpecies==="function"?enSpecies():[]).forEach(p=>{
    if(p&&p.key&&!GEN_SPECIES_SHIPPED.has(p.key))GEN_SPECIES[p.key]=p;
  });
}
// fx text templating: {DC:abil} = 8+PB+mod, {MOD:abil} = the signed mod, {PB}, {SUB} = the entry's
// resolved sub value. Pure string work — the vocabulary stays data, copy stays in the pack.
function genFxText(t,mods,pb,subVal){
  return String(t)
    .replace(/\{DC:(\w+)\}/g,(x,a)=>String(8+pb+(mods[a]||0)))
    .replace(/\{MOD:(\w+)\}/g,(x,a)=>{const m=mods[a]||0;return (m>=0?"+":"")+m;})
    .replace(/\{PB\}/g,String(pb))
    .replace(/\{SUB\}/g,subVal!=null?String(subVal):"");
}

// ── The class spell index (D-012) — XPHB lists per caster, cantrips + level 1 ─
// Roll tables are the intersection of these lists with the install's uploaded spell library
// (genSpellTables); the index alone is the fallback and the validation domain.
const GEN_CLASS_SPELLS={
  Bard:{0:["Blade Ward","Dancing Lights","Friends","Light","Mage Hand","Mending","Message","Minor Illusion","Prestidigitation","Starry Wisp","Thunderclap","True Strike","Vicious Mockery"],
    1:["Animal Friendship","Bane","Charm Person","Color Spray","Command","Comprehend Languages","Cure Wounds","Detect Magic","Disguise Self","Dissonant Whispers","Faerie Fire","Feather Fall","Healing Word","Heroism","Identify","Illusory Script","Longstrider","Silent Image","Sleep","Speak with Animals","Tasha's Hideous Laughter","Thunderwave","Unseen Servant"]},
  Cleric:{0:["Guidance","Light","Mending","Resistance","Sacred Flame","Spare the Dying","Thaumaturgy","Toll the Dead","Word of Radiance"],
    1:["Bane","Bless","Command","Create or Destroy Water","Cure Wounds","Detect Evil and Good","Detect Magic","Detect Poison and Disease","Guiding Bolt","Healing Word","Inflict Wounds","Protection from Evil and Good","Purify Food and Drink","Sanctuary","Shield of Faith"]},
  Druid:{0:["Druidcraft","Elementalism","Guidance","Mending","Message","Poison Spray","Produce Flame","Resistance","Shillelagh","Spare the Dying","Starry Wisp","Thorn Whip","Thunderclap"],
    1:["Animal Friendship","Charm Person","Create or Destroy Water","Cure Wounds","Detect Magic","Detect Poison and Disease","Entangle","Faerie Fire","Fog Cloud","Goodberry","Healing Word","Ice Knife","Jump","Longstrider","Protection from Evil and Good","Purify Food and Drink","Speak with Animals","Thunderwave"]},
  Paladin:{0:[],
    1:["Bless","Command","Compelled Duel","Cure Wounds","Detect Evil and Good","Detect Magic","Detect Poison and Disease","Divine Favor","Divine Smite","Heroism","Protection from Evil and Good","Purify Food and Drink","Searing Smite","Shield of Faith","Thunderous Smite","Wrathful Smite"]},
  Ranger:{0:[],
    1:["Alarm","Animal Friendship","Cure Wounds","Detect Magic","Detect Poison and Disease","Ensnaring Strike","Entangle","Fog Cloud","Goodberry","Hail of Thorns","Hunter's Mark","Jump","Longstrider","Speak with Animals"]},
  Sorcerer:{0:["Acid Splash","Blade Ward","Chill Touch","Dancing Lights","Elementalism","Fire Bolt","Friends","Light","Mage Hand","Mending","Message","Mind Sliver","Minor Illusion","Poison Spray","Prestidigitation","Ray of Frost","Shocking Grasp","Sorcerous Burst","Thunderclap","True Strike"],
    1:["Burning Hands","Charm Person","Chromatic Orb","Color Spray","Comprehend Languages","Detect Magic","Disguise Self","Expeditious Retreat","False Life","Feather Fall","Fog Cloud","Grease","Ice Knife","Jump","Mage Armor","Magic Missile","Ray of Sickness","Shield","Silent Image","Sleep","Thunderwave","Witch Bolt"]},
  Warlock:{0:["Blade Ward","Chill Touch","Eldritch Blast","Friends","Mage Hand","Mind Sliver","Minor Illusion","Poison Spray","Prestidigitation","Thunderclap","Toll the Dead","True Strike"],
    1:["Armor of Agathys","Arms of Hadar","Bane","Charm Person","Comprehend Languages","Detect Magic","Expeditious Retreat","Hellish Rebuke","Hex","Illusory Script","Protection from Evil and Good","Speak with Animals","Tasha's Hideous Laughter","Unseen Servant","Witch Bolt"]},
  Wizard:{0:["Acid Splash","Blade Ward","Chill Touch","Dancing Lights","Elementalism","Fire Bolt","Friends","Light","Mage Hand","Mending","Message","Mind Sliver","Minor Illusion","Poison Spray","Prestidigitation","Ray of Frost","Shocking Grasp","Thunderclap","Toll the Dead","True Strike"],
    1:["Alarm","Burning Hands","Charm Person","Chromatic Orb","Color Spray","Comprehend Languages","Detect Magic","Disguise Self","Expeditious Retreat","False Life","Feather Fall","Find Familiar","Fog Cloud","Grease","Ice Knife","Identify","Illusory Script","Jump","Longstrider","Mage Armor","Magic Missile","Protection from Evil and Good","Ray of Sickness","Shield","Silent Image","Sleep","Tasha's Hideous Laughter","Tenser's Floating Disk","Thunderwave","Unseen Servant","Witch Bolt"]}
};
// The union of every class cantrip list (Pact of the Tome rolls over it).
const GEN_ALL_CANTRIPS=[...new Set(Object.values(GEN_CLASS_SPELLS).flatMap(c=>c[0]))].sort();
// D-024: the Damaging subset for level-1 spells — spells that roll damage of their own (riders like
// Hex count; buffs and control without a damage line don't). Cantrips use GEN_CANTRIP_LINES instead.
const GEN_DMG_SPELLS=["Armor of Agathys","Arms of Hadar","Burning Hands","Chromatic Orb",
  "Dissonant Whispers","Divine Favor","Divine Smite","Ensnaring Strike","Guiding Bolt",
  "Hail of Thorns","Hellish Rebuke","Hex","Hunter's Mark","Ice Knife","Inflict Wounds",
  "Magic Missile","Ray of Sickness","Searing Smite","Thunderous Smite","Thunderwave",
  "Witch Bolt","Wrathful Smite"];

// ── Weapon and armor atoms for the kit tables (XPHB numbers) ─────────────────
// w: {n, ability ("dex" marks finesse/ranged use), dice, dtype, kind, reach/range, mastery?, note?}
const GEN_W={
  greataxe:{n:"Greataxe",ability:"str",dice:"1d12",dtype:"Slashing",kind:"Melee",mastery:"Cleave"},
  greatsword:{n:"Greatsword",ability:"str",dice:"2d6",dtype:"Slashing",kind:"Melee",mastery:"Graze"},
  maul:{n:"Maul",ability:"str",dice:"2d6",dtype:"Bludgeoning",kind:"Melee",mastery:"Topple"},
  halberd:{n:"Halberd",ability:"str",dice:"1d10",dtype:"Slashing",kind:"Melee",reach:10,mastery:"Cleave"},
  longsword:{n:"Longsword",ability:"str",dice:"1d8",dtype:"Slashing",kind:"Melee",mastery:"Sap",note:"1d10 two-handed"},
  warhammer:{n:"Warhammer",ability:"str",dice:"1d8",dtype:"Bludgeoning",kind:"Melee",mastery:"Push",note:"1d10 two-handed"},
  flail:{n:"Flail",ability:"str",dice:"1d8",dtype:"Bludgeoning",kind:"Melee",mastery:"Sap"},
  battleaxe:{n:"Battleaxe",ability:"str",dice:"1d8",dtype:"Slashing",kind:"Melee",mastery:"Topple",note:"1d10 two-handed"},
  rapier:{n:"Rapier",ability:"dex",dice:"1d8",dtype:"Piercing",kind:"Melee",mastery:"Vex"},
  scimitar:{n:"Scimitar",ability:"dex",dice:"1d6",dtype:"Slashing",kind:"Melee",mastery:"Nick"},
  shortsword:{n:"Shortsword",ability:"dex",dice:"1d6",dtype:"Piercing",kind:"Melee",mastery:"Vex"},
  spear:{n:"Spear",ability:"str",dice:"1d6",dtype:"Piercing",kind:"Melee or Ranged",range:"20/60",mastery:"Sap",note:"1d8 two-handed"},
  dagger:{n:"Dagger",ability:"dex",dice:"1d4",dtype:"Piercing",kind:"Melee or Ranged",range:"20/60",mastery:"Nick"},
  handaxe:{n:"Handaxe",ability:"str",dice:"1d6",dtype:"Slashing",kind:"Melee or Ranged",range:"20/60",mastery:"Vex"},
  javelin:{n:"Javelin",ability:"str",dice:"1d6",dtype:"Piercing",kind:"Melee or Ranged",range:"30/120",mastery:"Slow"},
  mace:{n:"Mace",ability:"str",dice:"1d6",dtype:"Bludgeoning",kind:"Melee",mastery:"Sap"},
  quarterstaff:{n:"Quarterstaff",ability:"str",dice:"1d6",dtype:"Bludgeoning",kind:"Melee",mastery:"Topple",note:"1d8 two-handed"},
  sickle:{n:"Sickle",ability:"str",dice:"1d4",dtype:"Slashing",kind:"Melee",mastery:"Nick"},
  club:{n:"Club",ability:"str",dice:"1d4",dtype:"Bludgeoning",kind:"Melee",mastery:"Slow"},
  unarmed:{n:"Unarmed Strike",ability:"dex",dice:"1d6",dtype:"Bludgeoning",kind:"Melee",note:"Martial Arts"},
  longbow:{n:"Longbow",ability:"dex",dice:"1d8",dtype:"Piercing",kind:"Ranged",range:"150/600",mastery:"Slow"},
  shortbow:{n:"Shortbow",ability:"dex",dice:"1d6",dtype:"Piercing",kind:"Ranged",range:"80/320",mastery:"Vex"},
  lightxbow:{n:"Light Crossbow",ability:"dex",dice:"1d8",dtype:"Piercing",kind:"Ranged",range:"80/320",mastery:"Slow"},
  heavyxbow:{n:"Heavy Crossbow",ability:"dex",dice:"1d10",dtype:"Piercing",kind:"Ranged",range:"100/400",mastery:"Push"},
  handxbow:{n:"Hand Crossbow",ability:"dex",dice:"1d6",dtype:"Piercing",kind:"Ranged",range:"30/120",mastery:"Vex"},
  sling:{n:"Sling",ability:"dex",dice:"1d4",dtype:"Bludgeoning",kind:"Ranged",range:"30/120",mastery:"Slow"},
  dart:{n:"Dart",ability:"dex",dice:"1d4",dtype:"Piercing",kind:"Ranged",range:"20/60",mastery:"Vex"}
};
// AC recipes: {kind:"none"|"armor"|"fixed"|"unarmored-con"|"unarmored-wis", base, dex, dexMax, shield, label}
const GEN_AC={
  none:{kind:"none",label:"Unarmored"},
  leather:{kind:"armor",base:11,dex:true,label:"Leather Armor"},
  leatherShield:{kind:"armor",base:11,dex:true,shield:true,label:"Leather Armor, Shield"},
  studded:{kind:"armor",base:12,dex:true,label:"Studded Leather"},
  studdedShield:{kind:"armor",base:12,dex:true,shield:true,label:"Studded Leather, Shield"},
  chainShirt:{kind:"armor",base:13,dex:true,dexMax:2,label:"Chain Shirt"},
  chainShirtShield:{kind:"armor",base:13,dex:true,dexMax:2,shield:true,label:"Chain Shirt, Shield"},
  scaleShield:{kind:"armor",base:14,dex:true,dexMax:2,shield:true,label:"Scale Mail, Shield"},
  chainMail:{kind:"fixed",base:16,label:"Chain Mail",str:13,alt:"chainShirt"},
  chainMailShield:{kind:"fixed",base:16,shield:true,label:"Chain Mail, Shield",str:13,alt:"chainShirtShield"},
  unarmCon:{kind:"unarmored-con",label:"Unarmored Defense"},
  unarmConShield:{kind:"unarmored-con",shield:true,label:"Unarmored Defense, Shield"},
  unarmWis:{kind:"unarmored-wis",label:"Unarmored Defense"}
};

// ── Class packages v2 (D-013): kits, feature options, spells config ──────────
// {hd, saves, prim, sec, skills:{from,n}, kits:[{n, ac, weapons:[{w, count?, noMastery?}], gear}],
//  traits/bonus (statblock sections), res, caster:{abil, cantrips:N, prepared:N, slots, short?,
//  always?:[names]}, featureOpt:{label, kind?, options:[{label, value, t, hooks?}]}, tools, langs}
// Kit weapons reference GEN_W keys; masteries print only for classes with the Weapon Mastery
// feature (masteries:N caps how many kit weapons carry the tag).
const GEN_CLASS_LIST=["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"]; // d12, alphabetical
const GEN_CLASSES={
  Barbarian:{hd:12,saves:["str","con"],prim:"str",sec:"con",masteries:2,
    skills:{from:["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"],n:2},
    kits:[
      {n:"Greataxe and handaxes",ac:"unarmCon",weapons:[{w:"greataxe"},{w:"handaxe",count:4}],gear:"Greataxe, 4 Handaxes"},
      {n:"Maul and javelins",ac:"unarmCon",weapons:[{w:"maul"},{w:"javelin",count:4}],gear:"Maul, 4 Javelins"},
      {n:"Twin handaxes",ac:"unarmCon",weapons:[{w:"handaxe",count:2},{w:"javelin",count:2}],gear:"2 Handaxes, 2 Javelins"},
      {n:"Greatsword and daggers",ac:"unarmCon",weapons:[{w:"greatsword"},{w:"dagger",count:2}],gear:"Greatsword, 2 Daggers"},
      {n:"Halberd",ac:"unarmCon",weapons:[{w:"halberd"},{w:"javelin",count:3}],gear:"Halberd, 3 Javelins"},
      {n:"Spear and shield",ac:"unarmConShield",weapons:[{w:"spear"},{w:"javelin",count:3}],gear:"Shield, Spear, 3 Javelins"}],
    traits:[{n:"Unarmored Defense",t:"AC equals 10 + Dex modifier + Con modifier while the barbarian isn't wearing armor (a Shield is allowed)."}],
    bonus:[{n:"Rage (2/Long Rest)",t:"While not wearing Heavy armor: +2 bonus to damage with Strength-based weapon attacks, Resistance to Bludgeoning, Piercing, and Slashing damage, and Advantage on Strength checks and Strength saving throws. Lasts 10 minutes while the barbarian attacks a foe or takes damage each round. One use returns on a Short Rest, all of them on a Long Rest."}],
    res:[{k:"rage",label:"Rage",max:2,per:"Long Rest",sr:1}]},
  Bard:{hd:8,saves:["dex","cha"],prim:"cha",sec:"dex",
    skills:{from:GEN_SKILL_NAMES,n:3},
    kits:[
      {n:"Daggers and a lute",ac:"leather",weapons:[{w:"dagger",count:2}],gear:"Leather Armor, 2 Daggers, Lute"},
      {n:"Spear and a drum",ac:"leather",weapons:[{w:"spear"}],gear:"Leather Armor, Spear, Drum"},
      {n:"Light crossbow and a flute",ac:"leather",weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Leather Armor, Light Crossbow, 20 Bolts, Dagger, Flute"},
      {n:"Quarterstaff and a lyre",ac:"leather",weapons:[{w:"quarterstaff"},{w:"dagger"}],gear:"Leather Armor, Quarterstaff, Dagger, Lyre"}],
    traits:[],
    bonus:[{n:"Bardic Inspiration (d6)",t:"One creature within 60 feet that can hear the bard gains a d6 it can add to one d20 Test within the next hour. Uses per Long Rest equal the bard's Charisma modifier (minimum 1)."}],
    res:[{k:"insp",label:"Bardic Inspiration",max:"chaMin1",per:"Long Rest"}],
    caster:{abil:"cha",cantrips:2,prepared:4,slots:2}},
  Cleric:{hd:8,saves:["wis","cha"],prim:"wis",sec:"con",
    skills:{from:["History","Insight","Medicine","Persuasion","Religion"],n:2},
    kits:[
      {n:"Mace and shield",ac:"chainShirtShield",weapons:[{w:"mace"}],gear:"Chain Shirt, Shield, Mace, Holy Symbol"},
      {n:"Warhammer",ac:"scaleShield",weapons:[{w:"warhammer",noMastery:true}],gear:"Scale Mail, Shield, Warhammer, Holy Symbol",note:"Warhammer needs Protector's Martial training"},
      {n:"Crossbow and mace",ac:"chainShirt",weapons:[{w:"lightxbow"},{w:"mace"}],gear:"Chain Shirt, Light Crossbow, 20 Bolts, Mace, Holy Symbol"},
      {n:"Quarterstaff and shield",ac:"chainShirtShield",weapons:[{w:"quarterstaff"}],gear:"Chain Shirt, Shield, Quarterstaff, Holy Symbol"},
      {n:"Spear and crossbow",ac:"scaleShield",weapons:[{w:"spear"},{w:"lightxbow"}],gear:"Scale Mail, Shield, Spear, Light Crossbow, 20 Bolts, Holy Symbol"}],
    traits:[],bonus:[],
    featureOpt:{label:"Divine Order",options:[
      {label:"Protector",value:"protector",t:"Divine Order: Protector. Trained for battle — proficient with Martial weapons and Heavy armor."},
      {label:"Thaumaturge",value:"thaumaturge",t:"Divine Order: Thaumaturge. One extra Cleric cantrip; add the Wisdom modifier (minimum +1) to Intelligence (Arcana or Religion) checks.",hooks:{extraCantrip:true}}]},
    caster:{abil:"wis",cantrips:3,prepared:4,slots:2}},
  Druid:{hd:8,saves:["int","wis"],prim:"wis",sec:"con",
    skills:{from:["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"],n:2},
    kits:[
      {n:"Sickle and shield",ac:"leatherShield",weapons:[{w:"sickle"}],gear:"Leather Armor, Shield, Sickle, Druidic Focus (Quarterstaff), Herbalism Kit"},
      {n:"Spear",ac:"leather",weapons:[{w:"spear"}],gear:"Leather Armor, Spear, Druidic Focus (sprig of mistletoe), Herbalism Kit"},
      {n:"Sling and staff",ac:"leather",weapons:[{w:"sling"},{w:"quarterstaff"}],gear:"Leather Armor, Sling, Quarterstaff (Druidic Focus), Herbalism Kit"},
      {n:"Club and shield",ac:"leatherShield",weapons:[{w:"club"},{w:"sling"}],gear:"Leather Armor, Shield, Club, Sling, Druidic Focus (yew wand), Herbalism Kit"}],
    traits:[{n:"Druidic",t:"The druid knows Druidic and always has Speak with Animals prepared."}],
    bonus:[],langs:["Druidic"],
    featureOpt:{label:"Primal Order",options:[
      {label:"Magician",value:"magician",t:"Primal Order: Magician. One extra Druid cantrip; add the Wisdom modifier (minimum +1) to Intelligence (Arcana or Nature) checks.",hooks:{extraCantrip:true}},
      {label:"Warden",value:"warden",t:"Primal Order: Warden. Trained for battle — proficient with Martial weapons and Medium armor."}]},
    caster:{abil:"wis",cantrips:2,prepared:4,slots:2,always:["Speak with Animals"]}},
  Fighter:{hd:10,saves:["str","con"],prim:"dex",sec:"con",masteries:3,
    skills:{from:["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Persuasion","Perception","Survival"],n:2},
    kits:[
      {n:"Sword and shield",ac:"chainMailShield",weapons:[{w:"longsword"},{w:"javelin",count:4}],gear:"Chain Mail, Shield, Longsword, 4 Javelins"},
      {n:"Greatsword",ac:"chainMail",weapons:[{w:"greatsword"},{w:"handaxe",count:2}],gear:"Chain Mail, Greatsword, 2 Handaxes"},
      {n:"Archer",ac:"studded",weapons:[{w:"longbow"},{w:"shortsword"}],gear:"Studded Leather, Longbow, 20 Arrows, Shortsword"},
      {n:"Two scimitars",ac:"studded",weapons:[{w:"scimitar",count:2},{w:"dagger"}],gear:"Studded Leather, 2 Scimitars, Dagger"},
      {n:"Polearm",ac:"chainMail",weapons:[{w:"halberd"},{w:"handaxe",count:2}],gear:"Chain Mail, Halberd, 2 Handaxes"},
      {n:"Crossbow and shield",ac:"chainShirtShield",weapons:[{w:"lightxbow"},{w:"mace"}],gear:"Chain Shirt, Shield, Light Crossbow, 20 Bolts, Mace"},
      {n:"Warhammer and shield",ac:"chainMailShield",weapons:[{w:"warhammer"},{w:"handaxe",count:2}],gear:"Chain Mail, Shield, Warhammer, 2 Handaxes"},
      {n:"Duelist",ac:"chainShirt",weapons:[{w:"rapier"},{w:"dagger",count:2}],gear:"Chain Shirt, Rapier, 2 Daggers"}],
    traits:[],
    bonus:[{n:"Second Wind (2 uses)",t:"The fighter regains 1d10 + 1 Hit Points. One use returns on a Short Rest, all of them on a Long Rest."}],
    res:[{k:"wind",label:"Second Wind",max:2,per:"Long Rest",sr:1}],
    featureOpt:{label:"Fighting Style",options:[
      {label:"Archery",value:"Archery",t:"Fighting Style: Archery. +2 bonus to attack rolls with Ranged weapons (counted).",hooks:{rangedAtk:2}},
      {label:"Blind Fighting",value:"Blind Fighting",t:"Fighting Style: Blind Fighting. Blindsight within 10 feet."},
      {label:"Defense",value:"Defense",t:"Fighting Style: Defense. +1 AC while wearing armor (counted).",hooks:{acArmor:1}},
      {label:"Dueling",value:"Dueling",t:"Fighting Style: Dueling. +2 damage with a Melee weapon held in one hand and no other weapons (counted on the main line).",hooks:{dueling:2}},
      {label:"Great Weapon Fighting",value:"Great Weapon Fighting",t:"Fighting Style: Great Weapon Fighting. Treat 1s and 2s on damage dice as 3s with two-handed Melee weapons."},
      {label:"Interception",value:"Interception",t:"Fighting Style: Interception. Reaction: reduce damage to a creature within 5 feet by 1d10 + 2 (needs Shield or weapon in hand)."},
      {label:"Protection",value:"Protection",t:"Fighting Style: Protection. Reaction while holding a Shield: impose Disadvantage on an attack against a creature within 5 feet."},
      {label:"Thrown Weapon Fighting",value:"Thrown Weapon Fighting",t:"Fighting Style: Thrown Weapon Fighting. +2 damage with thrown weapon attacks."},
      {label:"Two-Weapon Fighting",value:"Two-Weapon Fighting",t:"Fighting Style: Two-Weapon Fighting. Add the ability modifier to the damage of the extra (Light-weapon) attack."},
      {label:"Unarmed Fighting",value:"Unarmed Fighting",t:"Fighting Style: Unarmed Fighting. Unarmed Strikes deal 1d6 + Str (1d8 with both hands free); 1d4 to grappled creatures at the start of turns."}]}},
  Monk:{hd:8,saves:["str","dex"],prim:"dex",sec:"wis",
    skills:{from:["Acrobatics","Athletics","History","Insight","Religion","Stealth"],n:2},
    kits:[
      {n:"Spear and daggers",ac:"unarmWis",weapons:[{w:"unarmed"},{w:"spear"},{w:"dagger",count:5}],gear:"Spear, 5 Daggers"},
      {n:"Shortsword and darts",ac:"unarmWis",weapons:[{w:"unarmed"},{w:"shortsword"},{w:"dart",count:6}],gear:"Shortsword, 6 Darts"},
      {n:"Staff and sling",ac:"unarmWis",weapons:[{w:"unarmed"},{w:"quarterstaff"},{w:"sling"}],gear:"Quarterstaff, Sling"},
      {n:"Handaxes and darts",ac:"unarmWis",weapons:[{w:"unarmed"},{w:"handaxe",count:2},{w:"dart",count:4}],gear:"2 Handaxes, 4 Darts"}],
    traits:[{n:"Martial Arts (d6)",t:"Unarmed Strikes and Monk weapons (Simple Melee, plus Light Martial Melee) deal 1d6 and can use Dexterity."},
            {n:"Unarmored Defense",t:"AC equals 10 + Dex modifier + Wis modifier while wearing no armor and no Shield."}],
    bonus:[{n:"Bonus Unarmed Strike",t:"The monk makes one Unarmed Strike as a Bonus Action."}]},
  Paladin:{hd:10,saves:["wis","cha"],prim:"str",sec:"cha",masteries:2,
    skills:{from:["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"],n:2},
    kits:[
      {n:"Longsword and shield",ac:"chainMailShield",weapons:[{w:"longsword"},{w:"javelin",count:6}],gear:"Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol"},
      {n:"Greatsword",ac:"chainMail",weapons:[{w:"greatsword"},{w:"javelin",count:3}],gear:"Chain Mail, Greatsword, 3 Javelins, Holy Symbol"},
      {n:"Warhammer and shield",ac:"chainMailShield",weapons:[{w:"warhammer"},{w:"handaxe",count:2}],gear:"Chain Mail, Shield, Warhammer, 2 Handaxes, Holy Symbol"},
      {n:"Flail and shield",ac:"scaleShield",weapons:[{w:"flail"},{w:"javelin",count:4}],gear:"Scale Mail, Shield, Flail, 4 Javelins, Holy Symbol"},
      {n:"Halberd",ac:"chainMail",weapons:[{w:"halberd"},{w:"javelin",count:3}],gear:"Chain Mail, Halberd, 3 Javelins, Holy Symbol"},
      {n:"Battleaxe and shield",ac:"scaleShield",weapons:[{w:"battleaxe"},{w:"handaxe",count:2}],gear:"Scale Mail, Shield, Battleaxe, 2 Handaxes, Holy Symbol"}],
    traits:[],
    bonus:[{n:"Lay on Hands (5 HP pool)",t:"The paladin touches a creature and restores any number of Hit Points remaining in the pool. The pool refills on a Long Rest."}],
    res:[{k:"loh",label:"Lay on Hands (HP)",max:5,per:"Long Rest"}],
    caster:{abil:"cha",cantrips:0,prepared:2,slots:2}},
  Ranger:{hd:10,saves:["str","dex"],prim:"dex",sec:"wis",masteries:2,
    skills:{from:["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"],n:3},
    kits:[
      {n:"Longbow and shortsword",ac:"studded",weapons:[{w:"longbow"},{w:"shortsword"}],gear:"Studded Leather, Longbow, 20 Arrows, Shortsword, Druidic Focus"},
      {n:"Twin shortswords",ac:"studded",weapons:[{w:"shortsword",count:2},{w:"dagger",count:2}],gear:"Studded Leather, 2 Shortswords, 2 Daggers, Druidic Focus"},
      {n:"Heavy crossbow",ac:"studded",weapons:[{w:"heavyxbow"},{w:"scimitar"}],gear:"Studded Leather, Heavy Crossbow, 20 Bolts, Scimitar, Druidic Focus"},
      {n:"Spear and shield",ac:"studdedShield",weapons:[{w:"spear"},{w:"shortbow"}],gear:"Studded Leather, Shield, Spear, Shortbow, 20 Arrows, Druidic Focus"},
      {n:"Scimitar and shield",ac:"studdedShield",weapons:[{w:"scimitar"},{w:"dagger",count:2}],gear:"Studded Leather, Shield, Scimitar, 2 Daggers, Druidic Focus"},
      {n:"Shortbow and handaxes",ac:"studded",weapons:[{w:"shortbow"},{w:"handaxe",count:2}],gear:"Studded Leather, Shortbow, 20 Arrows, 2 Handaxes, Druidic Focus"}],
    traits:[],
    bonus:[{n:"Favored Enemy (Hunter's Mark)",t:"Hunter's Mark is always prepared and castable twice per Long Rest without a spell slot."}],
    res:[{k:"fav",label:"Hunter's Mark (free)",max:2,per:"Long Rest"}],
    caster:{abil:"wis",cantrips:0,prepared:2,slots:2,always:["Hunter's Mark"]}},
  Rogue:{hd:8,saves:["dex","int"],prim:"dex",sec:"int",masteries:2,
    skills:{from:["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Persuasion","Sleight of Hand","Stealth"],n:4},
    kits:[
      {n:"Shortsword and shortbow",ac:"leather",weapons:[{w:"shortsword"},{w:"shortbow"},{w:"dagger",count:2}],gear:"Leather Armor, Shortsword, Shortbow, 20 Arrows, 2 Daggers, Thieves' Tools"},
      {n:"Rapier and dagger",ac:"leather",weapons:[{w:"rapier"},{w:"dagger",count:2}],gear:"Leather Armor, Rapier, 2 Daggers, Thieves' Tools"},
      {n:"Rapier and hand crossbow",ac:"leather",weapons:[{w:"rapier"},{w:"handxbow"}],gear:"Leather Armor, Rapier, Hand Crossbow, 20 Bolts, Thieves' Tools"},
      {n:"Twin shortswords",ac:"leather",weapons:[{w:"shortsword",count:2},{w:"sling"}],gear:"Leather Armor, 2 Shortswords, Sling, Thieves' Tools"},
      {n:"Daggers everywhere",ac:"leather",weapons:[{w:"dagger",count:4},{w:"dart",count:2}],gear:"Leather Armor, 4 Daggers, 2 Darts, Thieves' Tools"},
      {n:"Scimitar and shortbow",ac:"leather",weapons:[{w:"scimitar"},{w:"shortbow"}],gear:"Leather Armor, Scimitar, Shortbow, 20 Arrows, Thieves' Tools"}],
    traits:[{n:"Sneak Attack (1d6)",t:"Once per turn, +1d6 damage on a hit with a Finesse or Ranged weapon if the rogue has Advantage, or if an able ally is within 5 feet of the target and the rogue doesn't have Disadvantage."},
            {n:"Thieves' Cant",t:"The rogue knows Thieves' Cant and one other language."}],
    bonus:[],tools:["Thieves' Tools"],langs:["Thieves' Cant"],
    featureOpt:{label:"Expertise",kind:"expertise",n:2},
    hooks:{}},
  Sorcerer:{hd:6,saves:["con","cha"],prim:"cha",sec:"con",
    skills:{from:["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"],n:2},
    kits:[
      {n:"Spear and daggers",ac:"none",weapons:[{w:"spear"},{w:"dagger",count:2}],gear:"Spear, 2 Daggers, Arcane Focus (crystal)"},
      {n:"Light crossbow",ac:"none",weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Light Crossbow, 20 Bolts, Dagger, Arcane Focus (crystal)"},
      {n:"Quarterstaff",ac:"none",weapons:[{w:"quarterstaff"},{w:"dagger"}],gear:"Quarterstaff, Dagger, Arcane Focus (crystal)"},
      {n:"Darts and staff",ac:"none",weapons:[{w:"dart",count:4},{w:"quarterstaff"}],gear:"4 Darts, Quarterstaff, Arcane Focus (crystal)"}],
    traits:[],
    bonus:[{n:"Innate Sorcery (2/Long Rest)",t:"For 1 minute: the sorcerer's spell save DC increases by 1 and it has Advantage on Sorcerer spell attack rolls."}],
    res:[{k:"innate",label:"Innate Sorcery",max:2,per:"Long Rest"}],
    caster:{abil:"cha",cantrips:4,prepared:2,slots:2}},
  Warlock:{hd:8,saves:["wis","cha"],prim:"cha",sec:"con",
    skills:{from:["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"],n:2},
    kits:[
      {n:"Sickle and daggers",ac:"leather",weapons:[{w:"sickle"},{w:"dagger",count:2}],gear:"Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb)"},
      {n:"Light crossbow",ac:"leather",weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Leather Armor, Light Crossbow, 20 Bolts, Dagger, Arcane Focus (orb)"},
      {n:"Spear",ac:"leather",weapons:[{w:"spear"},{w:"club"}],gear:"Leather Armor, Spear, Club, Arcane Focus (orb)"},
      {n:"Daggers and darts",ac:"leather",weapons:[{w:"dagger",count:2},{w:"dart",count:3}],gear:"Leather Armor, 2 Daggers, 3 Darts, Arcane Focus (orb)"},
      // Blade-pact kits (v4 note): only on the table once Pact of the Blade is the invocation —
      // the pact makes the warlock proficient with its bonded martial weapon.
      {n:"Pact greatsword",ac:"leather",needs:"pactBlade",weapons:[{w:"greatsword"},{w:"dagger"}],gear:"Leather Armor, Greatsword, Dagger, Arcane Focus (orb)"},
      {n:"Pact halberd",ac:"leather",needs:"pactBlade",weapons:[{w:"halberd"},{w:"dagger"}],gear:"Leather Armor, Halberd, Dagger, Arcane Focus (orb)"},
      {n:"Pact rapier",ac:"leather",needs:"pactBlade",weapons:[{w:"rapier"},{w:"dagger",count:2}],gear:"Leather Armor, Rapier, 2 Daggers, Arcane Focus (orb)"}],
    traits:[{n:"Pact Magic",t:"One level-1 Pact slot; it refills on a Short or Long Rest."}],
    bonus:[],
    featureOpt:{label:"Eldritch Invocation",options:[
      {label:"Armor of Shadows",value:"Armor of Shadows",t:"Invocation: Armor of Shadows. The warlock can cast Mage Armor on itself at will, without a slot.",hooks:{mageArmor:true}},
      {label:"Eldritch Mind",value:"Eldritch Mind",t:"Invocation: Eldritch Mind. Advantage on Constitution saves to maintain Concentration."},
      {label:"Pact of the Blade",value:"Pact of the Blade",t:"Invocation: Pact of the Blade. Bonus Action: conjure a bonded pact weapon; its attack and damage rolls use Charisma.",hooks:{pactBlade:true}},
      {label:"Pact of the Chain",value:"Pact of the Chain",t:"Invocation: Pact of the Chain. The warlock knows Find Familiar and can take special familiar forms (imp, quasit, sprite...); the familiar can attack when the warlock takes the Attack action."},
      {label:"Pact of the Tome",value:"Pact of the Tome",t:"Invocation: Pact of the Tome. A Book of Shadows grants three extra cantrips from any class list.",hooks:{tome:true}}]},
    caster:{abil:"cha",cantrips:2,prepared:2,slots:1,short:true}},
  Wizard:{hd:6,saves:["int","wis"],prim:"int",sec:"con",
    skills:{from:["Arcana","History","Insight","Investigation","Medicine","Nature","Religion"],n:2},
    kits:[
      {n:"Staff and daggers",ac:"none",weapons:[{w:"quarterstaff"},{w:"dagger",count:2}],gear:"Quarterstaff (Arcane Focus), 2 Daggers, Robe, Spellbook"},
      {n:"Dagger and darts",ac:"none",weapons:[{w:"dagger"},{w:"dart",count:3}],gear:"Dagger, 3 Darts, Arcane Focus (wand), Robe, Spellbook"},
      {n:"Traveling scholar",ac:"none",weapons:[{w:"quarterstaff"}],gear:"Quarterstaff (Arcane Focus), Robe, Spellbook, Ink and Quill"},
      {n:"Light crossbow",ac:"none",weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Light Crossbow, 20 Bolts, Dagger, Arcane Focus (wand), Spellbook"}],
    traits:[{n:"Arcane Recovery (1/day)",t:"On a Short Rest, the wizard recovers one expended level-1 spell slot."},
            {n:"Ritual Adept",t:"The wizard can cast Ritual-tagged spells straight from its spellbook without preparing them."}],
    bonus:[],
    res:[{k:"arc",label:"Arcane Recovery",max:1,per:"day"}],
    caster:{abil:"int",cantrips:3,prepared:4,slots:2}}
};

// ── Origin feats (d10 = the ten XPHB origin feats, alphabetical) ─────────────
// Fuller texts (D-011); `sub` describes the feat's internal choice as its own roll: skills (full
// list), tools (Fast Crafting d8), instruments (d10), or the Magic Initiate chain (list d6 → two
// cantrips + one level-1 spell from that class's tables).
const GEN_TOOLS8=["Carpenter's Tools","Leatherworker's Tools","Mason's Tools","Potter's Tools","Smith's Tools","Tinker's Tools","Weaver's Tools","Woodcarver's Tools"];
const GEN_INSTR10=["Bagpipes","Drum","Dulcimer","Flute","Horn","Lute","Lyre","Pan Flute","Shawm","Viol"];
const GEN_MI_LISTS=["Cleric","Druid","Wizard"];
const GEN_FEATS=[
  {n:"Alert",t:"Initiative includes the proficiency bonus (counted). Immediately after rolling Initiative, the character can swap its result with one willing ally in the same combat (neither can be Incapacitated).",initPB:true},
  {n:"Crafter",t:"Proficient with three Artisan's Tools (rolled). 20 percent discount on nonmagical items; on each Long Rest, craft one piece of gear from the Fast Crafting table with the right tools in hand.",sub:"tools"},
  {n:"Healer",t:"Battle Medic (needs a Healer's Kit): as a Utilize action, a creature within 5 feet expends one of its Hit Dice; it regains the roll + the character's proficiency bonus. The character rerolls 1s on any die rolled to determine Hit Points restored.",act:"action"},
  {n:"Lucky",t:"Luck Points equal to the proficiency bonus (2), regained on a Long Rest. Spend 1 to give the character Advantage on a d20 Test, or to impose Disadvantage on an attack roll made against it.",res:{k:"luck",label:"Luck Points",max:2,per:"Long Rest"}},
  {n:"Magic Initiate",t:"Two cantrips and one always-prepared level-1 spell from the rolled list (one free cast per Long Rest; also castable with slots).",sub:"mi",res:{k:"mi",label:"Feat spell (free cast)",max:1,per:"Long Rest"}},
  {n:"Musician",t:"Proficient with three instruments (rolled). After a Short or Long Rest, play a tune to give Heroic Inspiration to allies who heard it, up to the proficiency bonus (2).",sub:"instr"},
  {n:"Savage Attacker",t:"Once per turn when a weapon attack hits, roll the weapon's damage dice twice and use either result."},
  {n:"Skilled",t:"Proficient in three more skills (rolled; counted in the Skills line).",sub:"skills"},
  {n:"Tavern Brawler",t:"Unarmed Strike deals 1d4 + Str Bludgeoning and rerolls 1s on that damage. Proficient with improvised weapons. Once per turn, a creature hit by the character's Unarmed Strike can be pushed 5 feet."},
  {n:"Tough",t:"Hit Point maximum increases by 2 per level (counted).",hp2:true}
];

// ── Gear rolls (D-014, expanded D-022): pack d6 + one sundry from EACH d20 list.
// The two lists are disjoint, so the two rolls can never collide.
const GEN_PACKS=["Burglar's Pack","Dungeoneer's Pack","Entertainer's Pack","Explorer's Pack","Priest's Pack","Scholar's Pack"];
// D-027: pack contents (XPHB) — the Gear line's pack popover and the gear editor's unpacked view.
// Numbered items follow the "<n> <plural>" convention so the editor's count steppers work on them.
const GEN_PACK_CONTENTS={
  "Burglar's Pack":["Backpack","Ball Bearings","Bell","10 Candles","Crowbar","Hooded Lantern","7 Oil Flasks","5 Rations","Rope (50 ft)","Tinderbox","Waterskin"],
  "Dungeoneer's Pack":["Backpack","Caltrops","Crowbar","2 Oil Flasks","10 Rations","Rope (50 ft)","Tinderbox","10 Torches","Waterskin"],
  "Entertainer's Pack":["Backpack","Bedroll","Bell","Bullseye Lantern","3 Costumes","Mirror","8 Oil Flasks","9 Rations","Tinderbox","Waterskin"],
  "Explorer's Pack":["Backpack","Bedroll","2 Oil Flasks","10 Rations","Rope (50 ft)","Tinderbox","10 Torches","Waterskin"],
  "Priest's Pack":["Backpack","Blanket","Holy Water","Lamp","7 Rations","Robe","Tinderbox"],
  "Scholar's Pack":["Backpack","Book","Ink","Ink Pen","Lamp","10 Oil Flasks","10 Parchment Sheets","Tinderbox"]
};
const GEN_SUNDRIES_A=["Rope (50 ft.)","Crowbar","Grappling Hook","Caltrops (bag)","Ball Bearings (bag)",
  "Chalk (10 pieces)","Steel Mirror","Hooded Lantern and Oil Flask","Tinderbox and 10 Torches","Shovel",
  "Manacles","Fishing Tackle","Healer's Kit","Hunting Trap","Bell and String (10 ft.)","Playing Cards",
  "Net","Bedroll and Blanket","3 Empty Vials","Signal Whistle"];
const GEN_SUNDRIES_B=["Block and Tackle","Iron Pot and Ladle","Waterskin (full)","Bar of Soap","Perfume (vial)",
  "Ink, Quill, and 5 Sheets of Parchment","Candles (10)","Oil Flask (spare)","Whetstone","Two Sacks",
  "Bucket","Iron Spikes (10)","Padlock with Key","Merchant's Scale","Hourglass",
  "String (50 ft.)","Sealing Wax and Plain Seal","Dice Set","Two-Person Tent","Blank Book"];

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE — draft, steps, rolls, picks, completion, validation, derivation.
// A step record is {rolls:[raw dice], value, pick?} (+sub for chained tables). `rolls` is display
// truth, `value` is derivation truth; validation re-checks every value against its closed domain.
// ═══════════════════════════════════════════════════════════════════════════

// Per-class spell roll tables (D-012): the shipped index intersected with the uploaded library;
// the index alone when the library is too thin to cover the rolls. DM-side only (phones get the
// resolved tables through the crew share cfg).
function genSpellTables(){
  const lib=new Set((typeof enSpells==="function"?enSpells():[]).map(s=>String(s.name||"").toLowerCase()));
  const out={can:{},l1:{}};
  for(const [cls,idx] of Object.entries(GEN_CLASS_SPELLS)){
    const K=GEN_CLASSES[cls];
    const needC=(K.caster?K.caster.cantrips:0)+2,needP=(K.caster?K.caster.prepared:0)+2;
    const pick=(list,need)=>{const inter=list.filter(n=>lib.has(n.toLowerCase()));return inter.length>=need?inter:list;};
    out.can[cls]=pick(idx[0],needC);
    out.l1[cls]=pick(idx[1],needP);
  }
  return out;
}
function genNewDraft(cfg){
  const sp=GEN_SPECIES[cfg.sp]?cfg.sp:"kobold";
  return {v:2,sp,spRitual:cfg.spMode==="ritual", // D-031: species rides the ritual when the crew says so
          set:{stat:cfg.set&&cfg.set.stat==="4d6"?"4d6":"3d6",
                      mode:cfg.set&&cfg.set.mode==="chaos"?"chaos":"plausible",
                      asi:!(cfg.set&&cfg.set.asi===false)},
          counts:cfg.counts||{},tables:cfg.tables||null,steps:{}};
}
// The rollable species pool (D-031). Curated packs ship in-code; uploaded packs join here (B289).
function genSpeciesPool(){return Object.keys(GEN_SPECIES);}
// Species change cascade: the old species' table steps die with it; feat2 follows extraFeat; the
// new pack's FIXED casts reopen colliding spell steps exactly like a landed fx.cast (genSpDedupe).
function genSpeciesSet(d,v){
  if(d.sp===v)return;
  d.sp=v;
  Object.keys(d.steps).forEach(k=>{if(k.startsWith("sp:"))delete d.steps[k];});
  if(!GEN_SPECIES[v].extraFeat)delete d.steps.feat2;
  const names=new Set();
  (GEN_SPECIES[v].casts||[]).forEach(c=>{if(c.cantrip)names.add(c.cantrip);if(c.spell)names.add(c.spell);});
  if(!names.size)return;
  ["cantrips","spells"].forEach(sid=>{const s=d.steps[sid];
    if(s&&Array.isArray(s.value)&&s.value.some(n=>names.has(n)))delete d.steps[sid];});
  ["feat","feat2"].forEach(fid=>{const f=d.steps[fid];
    if(f&&f.sub&&f.sub.kind==="mi"){
      const vals=[...(f.sub.cans&&f.sub.cans.value||[]),f.sub.sp&&f.sub.sp.value].filter(Boolean);
      if(vals.some(n=>names.has(n)))f.sub=null;}});
  const fe=d.steps.feature;
  if(fe&&fe.sub&&Array.isArray(fe.sub.value)&&fe.sub.value.some(n=>names.has(n)))fe.sub=null;
}
function genTablesOf(d){return d.tables||{can:Object.fromEntries(Object.keys(GEN_CLASS_SPELLS).map(c=>[c,GEN_CLASS_SPELLS[c][0]])),
                                          l1:Object.fromEntries(Object.keys(GEN_CLASS_SPELLS).map(c=>[c,GEN_CLASS_SPELLS[c][1]]))};}
function genClsOf(d){return d.steps.cls?d.steps.cls.value:null;}
function genCasterOf(d){const c=genClsOf(d);return c&&GEN_CLASSES[c].caster?GEN_CLASSES[c]:null;}
function genCantripCount(d){
  const K=genCasterOf(d);if(!K)return 0;
  let n=K.caster.cantrips;
  const f=d.steps.feature;
  if(f&&K.featureOpt&&K.featureOpt.options){const o=K.featureOpt.options.find(x=>x.value===f.value);
    if(o&&o.hooks&&o.hooks.extraCantrip)n+=1;}
  return n;
}
function genStepOrder(d){
  const ids=[];
  if(d.spRitual)ids.push("species"); // D-031: the ritual opens with the species roll
  ids.push("stats","cls");
  if(d.set.asi)ids.push("asi");
  ids.push("feat");
  // Species-dependent steps hold back until the ritual species lands.
  const spReady=!d.spRitual||(d.steps.species&&d.steps.species.value!=null);
  if(spReady&&GEN_SPECIES[d.sp].extraFeat)ids.push("feat2"); // Human Versatile: a second origin feat
  ids.push("skills");
  const cls=genClsOf(d);
  if(cls){
    if(GEN_CLASSES[cls].featureOpt)ids.push("feature");
    ids.push("equip");
    if(genCantripCount(d)>0)ids.push("cantrips");
    if(GEN_CLASSES[cls].caster)ids.push("spells");
    if(genFamiliarKind(d))ids.push("familiar"); // D-025: appears once chain/Find Familiar resolves
  }
  ids.push("gearPack","sundries");
  if(spReady)(GEN_SPECIES[d.sp].tables||[]).forEach(t=>ids.push("sp:"+t.id));
  return ids.concat(["name"]);
}
function genSpTable(sp,id){return (GEN_SPECIES[sp].tables||[]).find(t=>t.id===id)||null;}
// Hooks of the currently-resolved class feature option (invocation etc.); {} when none.
function genFeatureHooks(d){
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null,fe=d.steps.feature;
  if(!K||!K.featureOpt||K.featureOpt.kind||!fe)return {};
  const o=(K.featureOpt.options||[]).find(x=>x.value===fe.value);
  return (o&&o.hooks)||{};
}
// Kits legal for the draft right now — full-array indexes, so payloads stay stable.
function genKitIdx(d,K){
  const fh=genFeatureHooks(d);
  return K.kits.map((k,i)=>k.needs&&!fh[k.needs]?null:i).filter(i=>i!=null);
}
// D-025: which familiar list applies — the Chain invocation's special forms, or the plain
// Find Familiar beasts when the spell is known through any source. Null = no familiar step.
function genFamiliarKind(d){
  const fe=d.steps.feature;
  if(fe&&fe.value==="Pact of the Chain")return "chain";
  const K=genCasterOf(d),knows=new Set();
  if(K&&K.caster)(K.caster.always||[]).forEach(n=>knows.add(n));
  if(d.steps.spells&&Array.isArray(d.steps.spells.value))d.steps.spells.value.forEach(n=>knows.add(n));
  ["feat","feat2"].forEach(fid=>{const ft=d.steps[fid];
    if(ft&&ft.sub&&ft.sub.kind==="mi"&&ft.sub.sp&&ft.sub.sp.value)knows.add(ft.sub.sp.value);});
  return knows.has("Find Familiar")?"beast":null;
}
function genClassShortlist(scores,counts){
  const mod=s=>Math.floor((s-10)/2);
  return GEN_CLASS_LIST.map(c=>{const k=GEN_CLASSES[c];
      return {c,score:mod(scores[k.prim])*2+mod(scores[k.sec])-2*Math.max(0,(counts&&counts[c]||0)-2)};})
    .sort((a,b)=>b.score-a.score||(a.c<b.c?-1:1)).slice(0,3).map(x=>x.c);
}
function genStatTotal(dice,method){
  const s=[...dice].sort((a,b)=>a-b);
  return method==="4d6"?s[1]+s[2]+s[3]:dice.reduce((a,b)=>a+b,0);
}
// N distinct rolls over a plain list (die = next die over its length, reroll dupes/overshoot).
// The die is stamped on the record so the UI can hand the raw faces to the 3D dice (D-015).
// D-024: per-slot table assignment for the spell steps — slot 1 defaults to the Damaging table,
// the rest to All; the user's overrides live on the draft (d.tabs) so Roll-the-rest honors them.
function genStepTabs(d,id,n){
  const t=(d.tabs&&d.tabs[id])||[];
  return Array.from({length:n},(x,i)=>t[i]==="dmg"||t[i]==="all"?t[i]:(i===0?"dmg":"all"));
}
// Slot-by-slot roll over each slot's chosen table; names stay distinct across both tables.
// A dmg table with nothing left falls back to the full list rather than stalling the slot.
function genRollSlots(rng,full,dmg,tabs,takenNames){
  const taken=new Set(takenNames||[]);
  const rolls=[],names=[],dice=[];
  tabs.forEach(tab=>{
    let list=(tab==="dmg"&&dmg.length)?dmg:full;
    if(!list.some(nm=>!taken.has(nm)))list=full;
    if(!list.some(nm=>!taken.has(nm)))return;
    const die=genDieFor(list.length),tk=new Set();
    list.forEach((nm,i)=>{if(taken.has(nm))tk.add(i+1);});
    const r=genRollTable(rng,die,list.length,tk);
    taken.add(list[r-1]);rolls.push(r);names.push(list[r-1]);dice.push(die);
  });
  return {rolls,value:names,die:genDieFor(full.length),dice,tabs:[...tabs]};
}
function genRollN(rng,list,n,takenNames){
  const die=genDieFor(list.length),taken=new Set();
  (takenNames||[]).forEach(nm=>{const i=list.indexOf(nm);if(i>=0)taken.add(i+1);});
  const rolls=[],names=[];
  for(let i=0;i<n&&taken.size<list.length;i++){
    const r=genRollTable(rng,die,list.length,taken);taken.add(r);rolls.push(r);names.push(list[r-1]);}
  return {rolls,value:names,die};
}
// Cascade: a re-resolved class invalidates its dependents (skills domain, feature, equipment,
// spells, defaulted ASI). Rolled dependents re-roll; picked skills survive only if still legal.
function genClsCascade(d){
  const K=GEN_CLASSES[d.steps.cls.value],sk=d.steps.skills;
  if(sk){
    const stillValid=sk.pick&&Array.isArray(sk.value)&&sk.value.length===K.skills.n&&
      sk.value.every((s,i)=>K.skills.from.includes(s)&&sk.value.indexOf(s)===i);
    if(!stillValid)delete d.steps.skills;
  }
  if(d.steps.asi&&!d.steps.asi.pick)delete d.steps.asi;
  delete d.steps.feature;delete d.steps.equip;delete d.steps.cantrips;delete d.steps.spells;
  delete d.steps.familiar;
}
function genRollStep(d,id,rng){
  rng=rng||Math.random;
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null,T=genTablesOf(d);
  if(id==="stats"){
    // One ability per call (D-011: individual rolls, dice on show). Rolls land in order STR→CHA.
    const n=d.set.stat==="4d6"?4:3;
    const st=d.steps.stats&&!d.steps.stats.pick?d.steps.stats:(d.steps.stats={rolls:[],value:[]});
    if(st.pick)return st;
    if(st.rolls.length<6){
      st.rolls.push(Array.from({length:n},()=>genRollDie(rng,6)));
      st.value=st.rolls.map(r=>genStatTotal(r,d.set.stat));
    }
    if(st.rolls.length<6)st.partial=true;else delete st.partial;
    return st;
  }
  if(id==="species"){
    const pool=genSpeciesPool(),span=genSpanFor(pool.length);
    const r=genRollTable(rng,span.die,span.reroll?pool.length:span.die,null);
    const v=pool[span.reroll?r-1:genSpanHit(span,r)];
    d.steps.species={rolls:[r],value:v,die:span.die};
    genSpeciesSet(d,v);
    return d.steps.species;
  }
  if(id==="cls"){
    const scores={};GEN_ABILS.forEach((a,i)=>{scores[a]=d.steps.stats&&d.steps.stats.value[i]!=null?d.steps.stats.value[i]:10;});
    if(d.set.mode==="chaos"){const r=genRollDie(rng,12);d.steps.cls={rolls:[r],value:GEN_CLASS_LIST[r-1],die:12};}
    else{const top3=genClassShortlist(scores,d.counts);const span=genSpanFor(3);const r=genRollDie(rng,span.die);
      d.steps.cls={rolls:[r],top3,value:top3[genSpanHit(span,r)],die:span.die};}
    genClsCascade(d);
  }else if(id==="asi"){
    d.steps.asi={rolls:[],value:[K?K.prim:"str",K?K.sec:"con"]};
  }else if(id==="feat"||id==="feat2"){
    // feat2 (extraFeat species): the second origin feat rerolls the first one's name.
    const other=id==="feat2"?(d.steps.feat&&d.steps.feat.value):(d.steps.feat2&&d.steps.feat2.value);
    const taken=new Set();GEN_FEATS.forEach((f,i)=>{if(f.n===other)taken.add(i+1);});
    const r=genRollTable(rng,10,10,taken.size?taken:null);const f=GEN_FEATS[r-1];
    d.steps[id]={rolls:[r],value:f.n,die:10};
    if(f.sub)genRollSub(d,id,rng);
  }else if(id==="skills"){
    if(!K)return null;
    d.steps.skills=genRollN(rng,K.skills.from,K.skills.n,[]);
  }else if(id==="feature"){
    if(!K||!K.featureOpt)return null;
    if(K.featureOpt.kind==="expertise"){
      const own=(d.steps.skills&&d.steps.skills.value)||[];
      d.steps.feature=genRollN(rng,own,Math.min(K.featureOpt.n,own.length),[]);
      d.steps.feature.kind="expertise";
    }else{
      const opts=K.featureOpt.options,span=genSpanFor(opts.length);
      const r=genRollTable(rng,span.die,span.reroll?opts.length:span.die,null);
      const idx=span.reroll?r-1:genSpanHit(span,r);
      const rec={rolls:[r],value:opts[idx].value,die:span.die};
      d.steps.feature=rec;
      const o=opts[idx];
      if(o.hooks&&o.hooks.tome)rec.sub=genRollN(rng,GEN_ALL_CANTRIPS,3,[...genSpellsGranted(d,"feature")]);
    }
  }else if(id==="equip"){
    if(!K)return null;
    const avail=genKitIdx(d,K),span=genSpanFor(avail.length);
    const r=genRollTable(rng,span.die,span.reroll?avail.length:span.die,null);
    d.steps.equip={rolls:[r],value:avail[span.reroll?r-1:genSpanHit(span,r)],die:span.die};
  }else if(id==="cantrips"){
    if(!cls)return null;
    // D-024 (subsumes D-018): slot 1 rolls on the Damaging table by default, so a rolled caster
    // structurally lands a damage cantrip; a thin live table borrows the shipped index's subset.
    const granted=[...genSpellsGranted(d,"cantrips")];
    const full=T.can[cls]||[];
    let dmg=full.filter(n=>!!GEN_CANTRIP_LINES[n]);
    if(!dmg.length)dmg=GEN_CLASS_SPELLS[cls][0].filter(n=>!!GEN_CANTRIP_LINES[n]);
    d.steps.cantrips=genRollSlots(rng,full,dmg,genStepTabs(d,"cantrips",genCantripCount(d)),granted);
  }else if(id==="spells"){
    if(!K||!K.caster)return null;
    const granted=[...genSpellsGranted(d,"spells")];
    const full=T.l1[cls]||[];
    let dmg=full.filter(n=>GEN_DMG_SPELLS.includes(n));
    if(!dmg.length)dmg=GEN_CLASS_SPELLS[cls][1].filter(n=>GEN_DMG_SPELLS.includes(n));
    d.steps.spells=genRollSlots(rng,full,dmg,genStepTabs(d,"spells",K.caster.prepared),granted);
  }else if(id==="familiar"){
    const kind=genFamiliarKind(d);if(!kind)return null;
    const list=kind==="chain"?GEN_FAMILIAR_CHAIN:GEN_FAMILIAR_BEASTS;
    const span=genSpanFor(list.length);
    const r=genRollTable(rng,span.die,span.reroll?list.length:span.die,null);
    d.steps.familiar={rolls:[r],value:list[span.reroll?r-1:genSpanHit(span,r)],die:span.die,kind};
  }else if(id==="gearPack"){
    const r=genRollDie(rng,6);d.steps.gearPack={rolls:[r],value:GEN_PACKS[r-1],die:6};
  }else if(id==="sundries"){
    const rA=genRollDie(rng,20),rB=genRollDie(rng,20);
    d.steps.sundries={rolls:[rA,rB],value:[GEN_SUNDRIES_A[rA-1],GEN_SUNDRIES_B[rB-1]],die:20};
  }else if(id.startsWith("sp:")){
    const t=genSpTable(d.sp,id.slice(3));if(!t)return null;
    if(t.kind==="skill"){
      // Plain-name skill table (Human Skillful, Elf Keen Senses) — dodge already-owned skills.
      const owned=genOwnedSkillNames(d,true),taken=new Set();
      t.entries.forEach((n,i)=>{if(owned.has(n))taken.add(i+1);});
      const die=t.die||genDieFor(t.entries.length);
      const r=genRollTable(rng,die,t.entries.length,taken.size<t.entries.length?taken:null);
      d.steps[id]={rolls:[r],value:t.entries[r-1],die};
    }else{
      const r=genRollDie(rng,t.die);const e=t.entries.find(x=>r>=x.lo&&r<=x.hi);
      const rec={rolls:[r],value:e.value,die:t.die};
      d.steps[id]=rec;
      if(e.sub)genRollSub(d,id,rng);
      genSpDedupe(d,id);
    }
  }
  return d.steps[id];
}
// D-018 across step order (D-030): species tables resolve AFTER the class spell steps, so a
// landed entry granting FIXED casts (lineage cantrips, legacy cantrips) can collide with names
// already rolled. Colliding steps/subs reopen — genRollAll rerolls them with the grant now known.
function genSpDedupe(d,id){
  const t=genSpTable(d.sp,id.slice(3));if(!t||t.kind)return;
  const rec=d.steps[id];if(!rec||rec.value==null)return;
  const e=t.entries.find(x=>x.value===rec.value);if(!e||!e.fx||!e.fx.cast)return;
  const names=new Set();
  [].concat(e.fx.cast).forEach(c=>{if(c.cantrip&&c.cantrip!=="sub")names.add(c.cantrip);if(c.spell)names.add(c.spell);});
  if(!names.size)return;
  ["cantrips","spells"].forEach(sid=>{
    const s=d.steps[sid];
    if(s&&Array.isArray(s.value)&&s.value.some(n=>names.has(n)))delete d.steps[sid];
  });
  ["feat","feat2"].forEach(fid=>{const f=d.steps[fid];
    if(f&&f.sub&&f.sub.kind==="mi"){
      const vals=[...(f.sub.cans&&f.sub.cans.value||[]),f.sub.sp&&f.sub.sp.value].filter(Boolean);
      if(vals.some(n=>names.has(n)))f.sub=null;}});
  const fe=d.steps.feature; // Pact of the Tome cantrips
  if(fe&&fe.sub&&Array.isArray(fe.sub.value)&&fe.sub.value.some(n=>names.has(n)))fe.sub=null;
}
// Roll only a step's pending sub-chain (feat subs, species subs, tome cantrips).
function genRollSub(d,id,rng){
  rng=rng||Math.random;const rec=d.steps[id];if(!rec)return false;
  if(id==="feat"||id==="feat2"){
    const f=GEN_FEATS.find(x=>x.n===rec.value);if(!f||!f.sub)return false;
    if(f.sub==="skills"){const owned=genOwnedSkillNames(d,true);rec.sub=genRollN(rng,GEN_SKILL_NAMES,3,[...owned]);rec.sub.kind="skills";}
    else if(f.sub==="tools")rec.sub={...genRollN(rng,GEN_TOOLS8,3,[]),kind:"tools"};
    else if(f.sub==="instr")rec.sub={...genRollN(rng,GEN_INSTR10,3,[]),kind:"instr"};
    else if(f.sub==="mi"){
      const span=genSpanFor(3),r=genRollDie(rng,span.die);
      const list=GEN_MI_LISTS[genSpanHit(span,r)],T=genTablesOf(d);
      const granted=[...genSpellsGranted(d,id)];
      rec.sub={kind:"mi",list:{rolls:[r],value:list,die:span.die},
        cans:genRollN(rng,T.can[list]||GEN_CLASS_SPELLS[list][0],2,granted),
        sp:(()=>{const s=genRollN(rng,T.l1[list]||GEN_CLASS_SPELLS[list][1],1,granted);return {rolls:s.rolls,value:s.value[0],die:s.die};})()};
    }
    return true;
  }
  if(id==="feature"){
    const K=GEN_CLASSES[genClsOf(d)];const o=K&&K.featureOpt&&K.featureOpt.options&&K.featureOpt.options.find(x=>x.value===rec.value);
    if(!o||!o.hooks||!o.hooks.tome)return false;
    rec.sub=genRollN(rng,GEN_ALL_CANTRIPS,3,[...genSpellsGranted(d,"feature")]);return true;
  }
  const t=genSpTable(d.sp,id.slice(3));if(!t)return false;
  const e=t.entries.find(x=>x.value===rec.value);if(!e||!e.sub)return false;
  if(e.sub.kind==="skill"){const owned=genOwnedSkillNames(d,false);
    rec.sub=genRollN(rng,e.sub.entries,1,[...owned]);rec.sub.value=rec.sub.value[0];
  }else if(e.sub.kind==="cantrip"){
    // D-018 for the species cantrip too: avoid names granted by class/feat sources.
    const granted=genSpellsGranted(d,id),taken=new Set();
    e.sub.entries.forEach((n,i)=>{if(granted.has(n))taken.add(i+1);});
    const sr=genRollTable(rng,e.sub.die,e.sub.entries.length,taken.size<e.sub.entries.length?taken:null);
    rec.sub={rolls:[sr],value:e.sub.entries[sr-1],die:e.sub.die};
  }else{const sr=genRollTable(rng,e.sub.die,e.sub.entries.length,null);
    rec.sub={rolls:[sr],value:e.sub.entries[sr-1],die:e.sub.die};}
  return true;
}
// Every spell name the draft already grants through some OTHER source (D-018: cross-source dedupe).
// excludeId names the step being rolled so its own current value doesn't block its reroll.
function genSpellsGranted(d,excludeId){
  const s=new Set();
  const K=genCasterOf(d);
  if(K&&K.caster)(K.caster.always||[]).forEach(n=>s.add(n));
  if(excludeId!=="cantrips"&&d.steps.cantrips&&Array.isArray(d.steps.cantrips.value))d.steps.cantrips.value.forEach(n=>s.add(n));
  if(excludeId!=="spells"&&d.steps.spells&&Array.isArray(d.steps.spells.value))d.steps.spells.value.forEach(n=>s.add(n));
  ["feat","feat2"].forEach(fid=>{
    const ft=d.steps[fid];
    if(excludeId!==fid&&ft&&ft.sub&&ft.sub.kind==="mi"){
      if(ft.sub.cans&&Array.isArray(ft.sub.cans.value))ft.sub.cans.value.forEach(n=>s.add(n));
      if(ft.sub.sp&&ft.sub.sp.value)s.add(ft.sub.sp.value);
    }});
  const fe=d.steps.feature; // Pact of the Tome cantrips
  if(excludeId!=="feature"&&fe&&fe.sub&&Array.isArray(fe.sub.value))fe.sub.value.forEach(n=>s.add(n));
  // Species-granted cantrips (fx.cast — Draconic Sorcery, lineage cantrips, pack-level grants).
  (GEN_SPECIES[d.sp].casts||[]).forEach(c=>{if(c.cantrip)s.add(c.cantrip);if(c.spell)s.add(c.spell);});
  (GEN_SPECIES[d.sp].tables||[]).forEach(t=>{
    const key="sp:"+t.id;if(excludeId===key||t.kind)return;
    const rec=d.steps[key];if(!rec||rec.value==null)return;
    const e=t.entries.find(x=>x.value===rec.value);if(!e||!e.fx||!e.fx.cast)return;
    [].concat(e.fx.cast).forEach(c=>{
      if(c.cantrip==="sub"){if(rec.sub&&typeof rec.sub.value==="string")s.add(rec.sub.value);}
      else if(c.cantrip)s.add(c.cantrip);
      if(c.spell)s.add(c.spell);
    });
  });
  return s;
}
function genOwnedSkillNames(d,includeFeat){
  const s=new Set();
  (d.steps.skills&&d.steps.skills.value||[]).forEach(n=>s.add(n));
  if(includeFeat!==false)["feat","feat2"].forEach(id=>{const f=d.steps[id];
    if(f&&f.sub&&f.sub.kind==="skills"&&Array.isArray(f.sub.value))f.sub.value.forEach(n=>s.add(n));});
  // Species-granted skills: kind:"skill" table values + skillSub sub values, any pack.
  (GEN_SPECIES[d.sp].tables||[]).forEach(t=>{
    const rec=d.steps["sp:"+t.id];if(!rec||rec.value==null)return;
    if(t.kind==="skill"){if(typeof rec.value==="string")s.add(rec.value);return;}
    const e=t.entries.find(x=>x.value===rec.value);
    if(e&&e.fx&&e.fx.skillSub&&rec.sub&&typeof rec.sub.value==="string")s.add(rec.sub.value);
  });
  return s;
}
// Explicit pick for a step (D-004/D-011: any result is overridable). Values are validated against
// the step's closed domain; free text exists only in the identity fields.
function genApplyPick(d,id,value){
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null;
  if(id==="stats"){
    if(!Array.isArray(value)||value.length!==6)return false;
    const v=value.map(x=>Math.max(3,Math.min(20,Math.round(Number(x)||10))));
    d.steps.stats={rolls:[],pick:true,value:v};return true;
  }
  if(id==="species"){
    if(!GEN_SPECIES[value])return false;
    d.steps.species={rolls:[],pick:true,value};
    genSpeciesSet(d,value);return true;}
  if(id==="cls"){if(!GEN_CLASSES[value])return false;d.steps.cls={rolls:[],pick:true,value};genClsCascade(d);return true;}
  if(id==="asi"){
    if(!Array.isArray(value)||value.length!==2||!GEN_ABILS.includes(value[0])||!GEN_ABILS.includes(value[1])||value[0]===value[1])return false;
    d.steps.asi={rolls:[],pick:true,value:[value[0],value[1]]};return true;}
  if(id==="feat"||id==="feat2"){
    const f=GEN_FEATS.find(x=>x.n===value);if(!f)return false;
    const other=id==="feat2"?(d.steps.feat&&d.steps.feat.value):(d.steps.feat2&&d.steps.feat2.value);
    if(f.n===other)return false; // the two origin feats stay distinct
    const rec={rolls:[],pick:true,value:f.n};
    if(f.sub)rec.sub=null; // resolve via genRollSub or genApplySubPick
    d.steps[id]=rec;return true;}
  if(id==="skills"){
    if(!K)return false;
    if(!Array.isArray(value)||value.length!==K.skills.n)return false;
    if(value.some((s,i)=>!K.skills.from.includes(s)||value.indexOf(s)!==i))return false;
    d.steps.skills={rolls:[],pick:true,value:[...value]};
    if(d.steps.feature&&d.steps.feature.kind==="expertise")delete d.steps.feature;
    return true;}
  if(id==="feature"){
    if(!K||!K.featureOpt)return false;
    if(K.featureOpt.kind==="expertise"){
      const own=(d.steps.skills&&d.steps.skills.value)||[];
      if(!Array.isArray(value)||value.length!==Math.min(K.featureOpt.n,own.length))return false;
      if(value.some((s,i)=>!own.includes(s)||value.indexOf(s)!==i))return false;
      d.steps.feature={rolls:[],pick:true,kind:"expertise",value:[...value]};return true;}
    const o=K.featureOpt.options.find(x=>x.value===value);if(!o)return false;
    const rec={rolls:[],pick:true,value:o.value};
    if(o.hooks&&o.hooks.tome)rec.sub=null;
    d.steps.feature=rec;
    if(d.steps.cantrips)delete d.steps.cantrips; // extra-cantrip hooks change the count
    return true;}
  if(id==="equip"){
    if(!K)return false;const i=Number(value);
    if(!(i>=0&&i<K.kits.length))return false;
    if(K.kits[i].needs&&!genFeatureHooks(d)[K.kits[i].needs])return false;
    d.steps.equip={rolls:[],pick:true,value:i};return true;}
  if(id==="cantrips"){
    if(!cls)return false;const T=genTablesOf(d),need=genCantripCount(d);
    if(!Array.isArray(value)||value.length!==need)return false;
    if(value.some((s,i)=>!(T.can[cls]||[]).includes(s)||value.indexOf(s)!==i))return false;
    d.steps.cantrips={rolls:[],pick:true,value:[...value]};return true;}
  if(id==="spells"){
    if(!K||!K.caster)return false;const T=genTablesOf(d);
    if(!Array.isArray(value)||value.length!==K.caster.prepared)return false;
    if(value.some((s,i)=>!(T.l1[cls]||[]).includes(s)||value.indexOf(s)!==i||(K.caster.always||[]).includes(s)))return false;
    d.steps.spells={rolls:[],pick:true,value:[...value]};return true;}
  if(id==="gearPack"){if(!GEN_PACKS.includes(value))return false;d.steps.gearPack={rolls:[],pick:true,value};return true;}
  if(id==="sundries"){
    if(!Array.isArray(value)||value.length!==2)return false;
    if(!GEN_SUNDRIES_A.includes(value[0])||!GEN_SUNDRIES_B.includes(value[1]))return false;
    d.steps.sundries={rolls:[],pick:true,value:[...value]};return true;}
  if(id==="familiar"){
    const kind=genFamiliarKind(d);if(!kind)return false;
    if(!(kind==="chain"?GEN_FAMILIAR_CHAIN:GEN_FAMILIAR_BEASTS).includes(value))return false;
    d.steps.familiar={rolls:[],pick:true,value,kind};return true;}
  if(id.startsWith("sp:")){
    const t=genSpTable(d.sp,id.slice(3));if(!t)return false;
    if(t.kind==="skill"){
      if(!t.entries.includes(value))return false;
      d.steps[id]={rolls:[],pick:true,value};return true;}
    const e=t.entries.find(x=>x.value===value||x.label===value||String(x.value)===String(value));if(!e)return false;
    const rec={rolls:[],pick:true,value:e.value};
    if(e.sub)rec.sub=null;
    d.steps[id]=rec;
    genSpDedupe(d,id);
    return true;}
  if(id==="name"){
    const v=String(value||"").replace(/[<>]/g,"").trim().slice(0,28);if(!v)return false;
    d.steps.name={rolls:[],pick:true,value:v};return true;}
  if(id==="quirk"||id==="trinket"){
    const v=String(value||"").replace(/[<>]/g,"").trim().slice(0,90);
    if(!v){delete d.steps[id];return true;}
    d.steps[id]={rolls:[],pick:true,value:v};return true;}
  return false;
}
function genApplySubPick(d,id,value){
  const rec=d.steps[id];if(!rec)return false;
  if(id==="feat"||id==="feat2"){const f=GEN_FEATS.find(x=>x.n===rec.value);if(!f||!f.sub)return false;
    if(f.sub==="skills"||f.sub==="tools"||f.sub==="instr"){
      const list=f.sub==="skills"?GEN_SKILL_NAMES:f.sub==="tools"?GEN_TOOLS8:GEN_INSTR10;
      if(!Array.isArray(value)||value.length!==3||value.some((s,i)=>!list.includes(s)||value.indexOf(s)!==i))return false;
      rec.sub={rolls:[],pick:true,kind:f.sub==="skills"?"skills":f.sub,value:[...value]};return true;}
    if(f.sub==="mi"){
      if(!value||!GEN_MI_LISTS.includes(value.list))return false;
      const can=GEN_CLASS_SPELLS[value.list][0],l1=GEN_CLASS_SPELLS[value.list][1];
      if(!Array.isArray(value.cans)||value.cans.length!==2||value.cans.some((s,i)=>!can.includes(s)||value.cans.indexOf(s)!==i))return false;
      if(!l1.includes(value.sp))return false;
      rec.sub={kind:"mi",pick:true,list:{rolls:[],value:value.list},cans:{rolls:[],value:[...value.cans]},sp:{rolls:[],value:value.sp}};
      return true;}
    return false;}
  if(id==="feature"){
    if(!Array.isArray(value)||value.length!==3||value.some((s,i)=>!GEN_ALL_CANTRIPS.includes(s)||value.indexOf(s)!==i))return false;
    rec.sub={rolls:[],pick:true,value:[...value]};return true;}
  const t=genSpTable(d.sp,id.slice(3));if(!t)return false;
  const e=t.entries.find(x=>x.value===rec.value);if(!e||!e.sub)return false;
  if(!e.sub.entries.includes(value))return false;
  rec.sub={rolls:[],pick:true,value};return true;
}
function genStepDone(d,id){
  const s=d.steps[id];if(!s||s.value==null)return false;
  if(id==="stats")return s.pick||(Array.isArray(s.rolls)&&s.rolls.length===6);
  if(id==="feat"||id==="feat2"){const f=GEN_FEATS.find(x=>x.n===s.value);
    if(f&&f.sub){if(!s.sub)return false;
      if(f.sub==="mi")return !!(s.sub.list&&s.sub.cans&&Array.isArray(s.sub.cans.value)&&s.sub.cans.value.length===2&&s.sub.sp&&s.sub.sp.value);
      return Array.isArray(s.sub.value)&&s.sub.value.length===3;}}
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];
    const o=K&&K.featureOpt&&K.featureOpt.options&&K.featureOpt.options.find(x=>x.value===s.value);
    if(o&&o.hooks&&o.hooks.tome)return !!(s.sub&&Array.isArray(s.sub.value)&&s.sub.value.length===3);}
  if(id==="familiar"){const kind=genFamiliarKind(d);
    return !!kind&&(kind==="chain"?GEN_FAMILIAR_CHAIN:GEN_FAMILIAR_BEASTS).includes(s.value);}
  if(id==="equip"){const K=GEN_CLASSES[genClsOf(d)];const kit=K&&K.kits[s.value];
    if(!kit)return false;
    if(kit.needs&&!genFeatureHooks(d)[kit.needs])return false;} // feature changed under a gated kit
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));const e=t&&t.entries.find(x=>x.value===s.value);
    if(e&&e.sub&&(!s.sub||s.sub.value==null))return false;}
  return true;
}
function genRollAll(d,rng){
  rng=rng||Math.random;
  let guard=0;
  while(guard++<60){
    const order=genStepOrder(d); // the order grows as cls/feature resolve
    const open=order.find(id=>id!=="name"&&!genStepDone(d,id));
    if(!open)break;
    if(open==="stats"&&d.steps.stats&&!d.steps.stats.pick){genRollStep(d,"stats",rng);continue;}
    if(d.steps[open]&&d.steps[open].value!=null&&!genStepDone(d,open)){genRollSub(d,open,rng);continue;}
    genRollStep(d,open,rng);
  }
  return d;
}
function genIsComplete(d){return genStepOrder(d).every(id=>genStepDone(d,id));}
function genCompletePayload(d){
  if(!genIsComplete(d))return null;
  return {v:2,id:uid(),sp:d.sp,set:{...d.set},steps:clone(d.steps)};
}

// ── Validation (D-007) — rebuilds a clean payload from an untrusted one ─────
function validateGenPayload(raw){
  try{
    if(!raw||raw.v!==2||typeof raw!=="object")return {ok:false,err:"shape"};
    const sp=GEN_SPECIES[raw.sp]?raw.sp:null;if(!sp)return {ok:false,err:"species"};
    const set={stat:raw.set&&raw.set.stat==="4d6"?"4d6":"3d6",
               mode:raw.set&&raw.set.mode==="chaos"?"chaos":"plausible",
               asi:!(raw.set&&raw.set.asi===false)};
    const S=raw.steps||{};const out={};
    const intIn=(v,lo,hi)=>{const n=Math.round(Number(v));return n>=lo&&n<=hi?n:null;};
    const clean1=(v,cap)=>String(v==null?"":v).replace(/[<>]/g,"").trim().slice(0,cap);
    const distinctIn=(arr,n,list)=>Array.isArray(arr)&&arr.length===n&&arr.every((s,i)=>list.includes(s)&&arr.indexOf(s)===i);
    // stats
    const st=S.stats||{};
    if(st.pick){const v=Array.isArray(st.value)?st.value.map(x=>intIn(x,3,20)):null;
      if(!v||v.length!==6||v.some(x=>x==null))return {ok:false,err:"stats"};
      out.stats={rolls:[],pick:true,value:v};}
    else{const n=set.stat==="4d6"?4:3;
      if(!Array.isArray(st.rolls)||st.rolls.length!==6)return {ok:false,err:"stats"};
      const rolls=st.rolls.map(r=>{if(!Array.isArray(r)||r.length!==n)return null;
        const q=r.map(x=>intIn(x,1,6));return q.some(x=>x==null)?null:q;});
      if(rolls.some(r=>!r))return {ok:false,err:"stats"};
      out.stats={rolls,value:rolls.map(r=>genStatTotal(r,set.stat))};}
    // class
    const cl=S.cls||{};if(!GEN_CLASSES[cl.value])return {ok:false,err:"class"};
    out.cls={rolls:Array.isArray(cl.rolls)?cl.rolls.slice(0,1).map(x=>intIn(x,1,12)||1):[],pick:!!cl.pick,value:cl.value};
    if(Array.isArray(cl.top3)&&cl.top3.every(c=>GEN_CLASSES[c]))out.cls.top3=cl.top3.slice(0,3);
    const K=GEN_CLASSES[cl.value];
    // asi
    if(set.asi){const as=S.asi||{};const v=Array.isArray(as.value)?as.value:null;
      if(!v||v.length!==2||!GEN_ABILS.includes(v[0])||!GEN_ABILS.includes(v[1])||v[0]===v[1])return {ok:false,err:"asi"};
      out.asi={rolls:[],pick:!!as.pick,value:[v[0],v[1]]};}
    // feat (+sub) — cleanFeat serves both origin-feat steps (feat2 = extraFeat species, D-030)
    const cleanFeat=ft=>{
      const F=GEN_FEATS.find(x=>x.n===ft.value);if(!F)return null;
      const o={rolls:Array.isArray(ft.rolls)?ft.rolls.slice(0,1).map(x=>intIn(x,1,10)||1):[],pick:!!ft.pick,value:F.n};
      if(F.sub){const sub=ft.sub||{};
        if(F.sub==="mi"){
          const list=sub.list&&sub.list.value;
          if(!GEN_MI_LISTS.includes(list))return null;
          const cans=sub.cans&&sub.cans.value,spv=sub.sp&&sub.sp.value;
          if(!distinctIn(cans,2,GEN_CLASS_SPELLS[list][0]))return null;
          if(!GEN_CLASS_SPELLS[list][1].includes(spv))return null;
          o.sub={kind:"mi",list:{rolls:[],value:list},cans:{rolls:[],value:[...cans]},sp:{rolls:[],value:spv}};
        }else{
          const list=F.sub==="skills"?GEN_SKILL_NAMES:F.sub==="tools"?GEN_TOOLS8:GEN_INSTR10;
          if(!distinctIn(sub.value,3,list))return null;
          o.sub={kind:F.sub==="skills"?"skills":F.sub,rolls:[],value:[...sub.value]};
        }}
      return o;};
    const outFeat=cleanFeat(S.feat||{});if(!outFeat)return {ok:false,err:"feat"};
    out.feat=outFeat;
    if(GEN_SPECIES[sp].extraFeat){
      const f2=cleanFeat(S.feat2||{});
      if(!f2||f2.value===out.feat.value)return {ok:false,err:"feat2"};
      out.feat2=f2;
    }
    // skills
    const sk=S.skills||{};
    if(!distinctIn(sk.value,K.skills.n,K.skills.from))return {ok:false,err:"skills"};
    out.skills={rolls:[],pick:!!sk.pick,value:[...sk.value]};
    // feature
    if(K.featureOpt){
      const fe=S.feature||{};
      if(K.featureOpt.kind==="expertise"){
        if(!distinctIn(fe.value,Math.min(K.featureOpt.n,out.skills.value.length),out.skills.value))return {ok:false,err:"feature"};
        out.feature={rolls:[],pick:!!fe.pick,kind:"expertise",value:[...fe.value]};
      }else{
        const o=K.featureOpt.options.find(x=>x.value===fe.value);if(!o)return {ok:false,err:"feature"};
        out.feature={rolls:[],pick:!!fe.pick,value:o.value};
        if(o.hooks&&o.hooks.tome){
          if(!distinctIn(fe.sub&&fe.sub.value,3,GEN_ALL_CANTRIPS))return {ok:false,err:"featuresub"};
          out.feature.sub={rolls:[],value:[...fe.sub.value]};
        }
      }
    }
    // equipment kit (a feature-gated kit must be earned by the payload's own feature)
    const eq=S.equip||{};const ki=intIn(eq.value,0,K.kits.length-1);
    if(ki==null)return {ok:false,err:"equip"};
    if(K.kits[ki].needs){
      const fo=out.feature&&(K.featureOpt&&K.featureOpt.options||[]).find(x=>x.value===out.feature.value);
      if(!(fo&&fo.hooks&&fo.hooks[K.kits[ki].needs]))return {ok:false,err:"equip"};
    }
    out.equip={rolls:[],pick:!!eq.pick,value:ki};
    // spells (validated against the shipped index — the superset of any live table)
    if(K.caster){
      let needC=K.caster.cantrips;
      if(out.feature){const o=(K.featureOpt.options||[]).find(x=>x.value===out.feature.value);
        if(o&&o.hooks&&o.hooks.extraCantrip)needC+=1;}
      if(needC>0){
        const cn=S.cantrips||{};
        if(!distinctIn(cn.value,needC,GEN_CLASS_SPELLS[cl.value][0]))return {ok:false,err:"cantrips"};
        out.cantrips={rolls:[],pick:!!cn.pick,value:[...cn.value]};
      }
      const spl=S.spells||{};
      const legalL1=GEN_CLASS_SPELLS[cl.value][1].filter(x=>!(K.caster.always||[]).includes(x));
      if(!distinctIn(spl.value,K.caster.prepared,legalL1))return {ok:false,err:"spells"};
      out.spells={rolls:[],pick:!!spl.pick,value:[...spl.value]};
    }
    // familiar (D-025) — optional so pre-familiar payloads stay valid; kind re-derived here, and
    // a form that doesn't match the payload's own sources is dropped, not trusted.
    if(S.familiar&&S.familiar.value!=null){
      const knows=new Set([...(K.caster&&K.caster.always||[]),...(out.spells?out.spells.value:[])]);
      [out.feat,out.feat2].forEach(f=>{if(f&&f.sub&&f.sub.kind==="mi"&&f.sub.sp)knows.add(f.sub.sp.value);});
      const kind=(out.feature&&out.feature.value==="Pact of the Chain")?"chain":(knows.has("Find Familiar")?"beast":null);
      const fv=S.familiar.value;
      if(kind&&(kind==="chain"?GEN_FAMILIAR_CHAIN:GEN_FAMILIAR_BEASTS).includes(fv))
        out.familiar={rolls:[],pick:!!S.familiar.pick,value:fv,kind};
    }
    // gear
    const gp=S.gearPack||{};if(!GEN_PACKS.includes(gp.value))return {ok:false,err:"gearPack"};
    out.gearPack={rolls:[],pick:!!gp.pick,value:gp.value};
    const su=S.sundries||{};
    if(!Array.isArray(su.value)||su.value.length!==2||!GEN_SUNDRIES_A.includes(su.value[0])||!GEN_SUNDRIES_B.includes(su.value[1]))return {ok:false,err:"sundries"};
    out.sundries={rolls:[],pick:!!su.pick,value:[...su.value]};
    // species tables
    for(const t of (GEN_SPECIES[sp].tables||[])){
      const key="sp:"+t.id,rec=S[key]||{};
      if(t.kind==="skill"){
        if(!t.entries.includes(rec.value))return {ok:false,err:key};
        out[key]={rolls:[],pick:!!rec.pick,value:rec.value};continue;}
      const e=t.entries.find(x=>x.value===rec.value);if(!e)return {ok:false,err:key};
      const o={rolls:Array.isArray(rec.rolls)?rec.rolls.slice(0,1).map(x=>intIn(x,1,t.die)||e.lo):[],pick:!!rec.pick,value:e.value};
      if(e.sub){const sub=rec.sub||{};if(!e.sub.entries.includes(sub.value))return {ok:false,err:key+".sub"};
        o.sub={rolls:[],pick:!!sub.pick,value:sub.value};}
      out[key]=o;
    }
    // identity (name required; quirk/trinket optional; free text cleaned + capped)
    {const v=clean1((S.name||{}).value,28);if(!v)return {ok:false,err:"name"};
     out.name={rolls:[],pick:true,value:v};}
    for(const key of ["quirk","trinket"]){
      const rec=S[key];if(!rec||rec.value==null)continue;
      const v=clean1(rec.value,90);if(v)out[key]={rolls:[],pick:true,value:v};
    }
    return {ok:true,clean:{v:2,id:String(raw.id||uid()).slice(0,24),sp,set,steps:out}};
  }catch(e){return {ok:false,err:"exception"};}
}

// ── Derivation: payload → character (pure — D-007) ───────────────────────────
function deriveGenChar(p){
  const sp=GEN_SPECIES[p.sp],cls=p.steps.cls.value,K=GEN_CLASSES[cls],pb=2;
  const mod=s=>Math.floor((s-10)/2);
  const scores={};GEN_ABILS.forEach((a,i)=>{scores[a]=p.steps.stats.value[i];});
  if(p.set.asi&&p.steps.asi){const v=p.steps.asi.value;
    scores[v[0]]=Math.min(20,scores[v[0]]+2);scores[v[1]]=Math.min(20,scores[v[1]]+1);}
  const mods={};GEN_ABILS.forEach(a=>{mods[a]=mod(scores[a]);});
  // Generic species-table effects (D-030): one walk over the pack's tables builds everything they
  // grant — the engine never names a species. Pack-level fixed resists/casts merge in.
  const bestMental=()=>["int","wis","cha"].sort((a,b)=>mods[b]-mods[a])[0];
  const mkCast=c=>{const ab=c.abil==="mental"?bestMental():c.abil;
    return {label:c.label,abil:ab,dc:8+pb+mods[ab],atk:pb+mods[ab],
      cantrip:c.cantrip||null,spell:c.spell||null,freq:c.freq||null};};
  const fxAcc={skills:[],casts:(sp.casts||[]).map(mkCast),resists:[...(sp.resists||[])],
    traits:[],bonus:[],actions:[],res:[],size:null,fly:0};
  (sp.tables||[]).forEach(t=>{
    const rec=p.steps["sp:"+t.id];if(!rec||rec.value==null)return;
    if(t.kind==="skill"){if(typeof rec.value==="string")fxAcc.skills.push(rec.value);return;}
    const e=t.entries.find(x=>x.value===rec.value);if(!e||!e.fx)return;
    const subVal=rec.sub?rec.sub.value:null,fx=e.fx;
    if(fx.skillSub&&typeof subVal==="string")fxAcc.skills.push(subVal);
    if(fx.trait)fxAcc.traits.push({n:fx.trait.n,t:genFxText(fx.trait.t,mods,pb,subVal)});
    if(fx.bonus)fxAcc.bonus.push({n:fx.bonus.n,t:genFxText(fx.bonus.t,mods,pb,subVal)});
    if(fx.action)fxAcc.actions.push({n:fx.action.n,t:genFxText(fx.action.t,mods,pb,subVal)});
    if(fx.res)fxAcc.res.push({...fx.res});
    if(fx.resist){const r=fx.resist==="sub"?subVal:fx.resist;if(r&&!fxAcc.resists.includes(r))fxAcc.resists.push(r);}
    if(fx.size)fxAcc.size=fx.size;
    if(fx.fly)fxAcc.fly=Math.max(fxAcc.fly,fx.fly);
    if(fx.speed)fxAcc.speed=Math.max(fxAcc.speed||0,fx.speed);         // Wood Elf
    if(fx.darkvision)fxAcc.dark=Math.max(fxAcc.dark||0,fx.darkvision); // Drow
    if(fx.cast)[].concat(fx.cast).forEach(c=>fxAcc.casts.push(mkCast(c.cantrip==="sub"?{...c,cantrip:subVal}:c)));
  });
  const feat=GEN_FEATS.find(f=>f.n===p.steps.feat.value);
  // extraFeat (Human Versatile): a second origin feat rides step "feat2"; every feat consumer
  // below loops featRecs so both apply identically.
  const feat2=sp.extraFeat&&p.steps.feat2?(GEN_FEATS.find(f=>f.n===p.steps.feat2.value)||null):null;
  const featRecs=[[p.steps.feat,feat]].concat(feat2?[[p.steps.feat2,feat2]]:[]);
  const featureVal=p.steps.feature?p.steps.feature.value:null;
  const featureOpt=K.featureOpt&&!K.featureOpt.kind?(K.featureOpt.options.find(o=>o.value===featureVal)||null):null;
  const fh=(featureOpt&&featureOpt.hooks)||{};
  const kit=K.kits[p.steps.equip?p.steps.equip.value:0];
  const hp=Math.max(1,K.hd+mods.con+featRecs.reduce((n,[,f])=>n+(f.hp2?2:0),0)+(sp.hpPerLevel||0));
  // AC from the kit recipe (+Defense style; Armor of Shadows upgrades an unarmored kit).
  // Str-gated armor falls back to its lighter counterpart when the requirement is unmet;
  // the gear string swaps with it so the card and the armor agree.
  let A=GEN_AC[kit.ac]||GEN_AC.none,gearSwap=null;
  if(A.str&&scores.str<A.str&&A.alt&&GEN_AC[A.alt]){
    gearSwap=[A.label.replace(/, Shield$/,""),GEN_AC[A.alt].label.replace(/, Shield$/,"")];
    A=GEN_AC[A.alt];}
  let ac=10+mods.dex,acSrc=A.label||"Unarmored";
  if(A.kind==="unarmored-con")ac=10+mods.dex+mods.con+(A.shield?2:0);
  else if(A.kind==="unarmored-wis")ac=10+mods.dex+mods.wis+(A.shield?2:0);
  else if(A.kind==="armor"){const dx=A.dexMax!=null?Math.min(mods.dex,A.dexMax):mods.dex;
    ac=A.base+dx+(A.shield?2:0)+(fh.acArmor||0);}
  else if(A.kind==="fixed")ac=A.base+(A.shield?2:0)+(fh.acArmor||0);
  if(A.kind==="none"&&fh.mageArmor){ac=13+mods.dex;acSrc="Mage Armor (at will)";}
  // skills / expertise
  const profSkills=new Map();
  p.steps.skills.value.forEach(s=>profSkills.set(s,1));
  featRecs.forEach(([rec,f])=>{if(f.sub==="skills"&&rec.sub)rec.sub.value.forEach(s=>profSkills.set(s,1));});
  fxAcc.skills.forEach(s=>profSkills.set(s,1));
  if(p.steps.feature&&p.steps.feature.kind==="expertise")p.steps.feature.value.forEach(s=>profSkills.set(s,2));
  const skills=[...profSkills.entries()].map(([n,e])=>({n,abil:GEN_SKILL_ABIL[n],bonus:mods[GEN_SKILL_ABIL[n]]+pb*e,exp:e===2}))
    .sort((a,b)=>a.n<b.n?-1:1);
  const perception=skills.find(s=>s.n==="Perception");
  const pp=10+(perception?perception.bonus:mods.wis);
  const saves=K.saves.map(a=>({abil:a,bonus:mods[a]+pb}));
  // weapons from the kit (+ Pact of the Blade), masteries capped by the class allotment
  const weapons=[];let mastLeft=K.masteries||0;
  kit.weapons.forEach(ref=>{
    const w=GEN_W[ref.w];if(!w)return;
    const entry={...w,count:ref.count||1,mastery:""};
    if(!ref.noMastery&&(K.masteries||0)>0&&w.mastery&&mastLeft>0){entry.mastery=w.mastery;mastLeft--;}
    weapons.push(entry);
  });
  // Pact of the Blade bonds the kit's main melee weapon by default (uses Charisma); a kit with
  // no melee weapon still gets the conjured blade.
  if(fh.pactBlade){
    const pw=weapons.find(w=>w.kind==="Melee");
    if(pw){pw.ability="cha";pw.note=(pw.note?pw.note+"; ":"")+"pact weapon; uses Charisma";}
    else weapons.push({n:"Pact Blade",ability:"cha",dice:"1d8",dtype:"Slashing",kind:"Melee",count:1,mastery:"",note:"conjured; uses Charisma"});
  }
  const rangedBonus=fh.rangedAtk||0;
  const attacks=weapons.map(w=>{
    const ab=mods[w.ability]||0;
    const ranged=w.kind==="Ranged";
    return {n:w.n+(w.count>1?" (x"+w.count+")":""),kind:w.kind,ability:w.ability,
      bonus:ab+pb+(ranged?rangedBonus:0),dice:w.dice,addMod:true,dtype:w.dtype,
      reach:w.reach||5,range:w.range||"",mastery:w.mastery||"",note:w.note||""};
  });
  // spellcasting
  let caster=null;
  if(K.caster){const cm=mods[K.caster.abil];
    caster={abil:K.caster.abil,dc:8+pb+cm,atk:pb+cm,
      cantrips:p.steps.cantrips?[...p.steps.cantrips.value]:[],
      prepared:[...(K.caster.always||[]),...(p.steps.spells?p.steps.spells.value:[])],
      slots:K.caster.slots,short:!!K.caster.short};}
  if(p.steps.feature&&p.steps.feature.sub&&caster)caster.cantrips=[...caster.cantrips,...p.steps.feature.sub.value]; // Pact of the Tome
  const extraCasts=[];
  featRecs.forEach(([rec,f])=>{
    if(f.sub!=="mi"||!rec.sub)return;
    // 2024 Magic Initiate: the ability is the chooser's pick of Int/Wis/Cha — default to the best.
    const s=rec.sub,ab=bestMental(),km=mods[ab];
    extraCasts.push({label:"Magic Initiate ("+s.list.value+")",abil:ab,dc:8+pb+km,atk:pb+km,
      cantrips:[...s.cans.value],spell:s.sp.value});});
  // Species-granted casts (Draconic Sorcery, lineage cantrips, pack-level grants) — generic.
  // A name the class already grants (always-prepared: Druid's Speak with Animals) is a fixed-vs-
  // fixed collision no reroll can clear — the card lists it once, under the class entry; the
  // species' free-cast resource still rides (the uses are real either way).
  const classKnown=new Set([...(caster?caster.cantrips:[]),...(caster?caster.prepared:[])]);
  const spCasts=fxAcc.casts.map(c=>({...c,
      cantrip:c.cantrip&&!classKnown.has(c.cantrip)?c.cantrip:null,
      spell:c.spell&&!classKnown.has(c.spell)?c.spell:null}))
    .filter(c=>c.cantrip||c.spell);
  // statblock sections
  const traits=sp.traits.map(t=>({...t})).concat((K.traits||[]).map(t=>({...t})));
  const bonus=(sp.bonus||[]).map(t=>({...t})).concat((K.bonus||[]).map(t=>({...t})));
  const actions=(sp.actions||[]).map(t=>({...t}));
  if(featureOpt)traits.push({n:K.featureOpt.label+": "+featureOpt.label,t:featureOpt.t.replace(/^[^.]*\.\s*/,"")});
  if(p.steps.feature&&p.steps.feature.kind==="expertise")traits.push({n:"Expertise",t:"Double proficiency with "+p.steps.feature.value.join(" and ")+" (counted in the Skills line)."});
  if(fh.pactBlade)bonus.push({n:"Pact of the Blade",t:"The kit's melee weapon is the bonded pact weapon: its attack and damage rolls use Charisma, and it can be conjured to hand as a Bonus Action."});
  // D-019 note stands: features fully expressed by a spellcasting entry (fx.cast, Magic Initiate)
  // live in the merged Spellcasting block, not the trait list — fx authors traits separately.
  // D-030: the species tables' grants land here through the fx accumulator; D-028's old payload
  // values (false / true for wings) stay valid because the entries kept their values.
  fxAcc.traits.forEach(t=>traits.push(t));
  fxAcc.bonus.forEach(t=>bonus.push(t));
  fxAcc.actions.forEach(t=>actions.push(t));
  const wings=fxAcc.fly>0;
  const resists=fxAcc.resists,sizeOv=fxAcc.size;
  featRecs.forEach(([rec,f])=>{
    if(f.act==="action")actions.push({n:f.n,t:genFeatText(f.n,f.t)});
    else if(f.sub!=="mi"){
      let ftxt=genFeatText(f.n,f.t); // D-033: uploaded feat texts win by name; shipped is the fallback
      if(f.sub==="tools"&&rec.sub)ftxt+=" Tools: "+rec.sub.value.join(", ")+".";
      if(f.sub==="instr"&&rec.sub)ftxt+=" Instruments: "+rec.sub.value.join(", ")+".";
      traits.push({n:"Feat: "+f.n,t:ftxt});
    }});
  // resources
  const resources=[];
  (sp.res||[]).forEach(r=>resources.push({...r}));
  (K.res||[]).forEach(r=>resources.push({...r,max:r.max==="chaMin1"?Math.max(1,mods.cha):r.max}));
  if(caster&&caster.slots)resources.push({k:"slots",label:"Spell Slots (Level 1)",max:caster.slots,per:caster.short?"Short Rest":"Long Rest"});
  featRecs.forEach(([,f])=>{if(f.res)resources.push({...f.res});});
  fxAcc.res.forEach(r=>resources.push({...r}));
  // gear line: kit + rolled pack + rolled sundries (armor swapped if the Str gate demoted it)
  const kitGear=gearSwap?kit.gear.replace(gearSwap[0],gearSwap[1]):kit.gear;
  const gear=[kitGear,p.steps.gearPack.value].concat(p.steps.sundries.value).join(", ");
  const tools=[...(K.tools||[])];
  featRecs.forEach(([rec,f])=>{if(f.sub==="tools"&&rec.sub)tools.push(...rec.sub.value);});
  const langs=[...sp.langs,...(K.langs||[])];
  const familiar=p.steps.familiar&&GEN_FAMILIARS[p.steps.familiar.value]?p.steps.familiar.value:null;
  return {name:p.steps.name.value,species:sp.label,cls,size:sizeOv||sp.size,level:1,pb,resists,familiar,
    scores,mods,hp,hd:"1d"+K.hd,ac,acSrc,gear,tools,kitName:kit.n,
    speed:{walk:fxAcc.speed||sp.speed,fly:wings?fxAcc.fly:0},
    init:mods.dex+(featRecs.some(([,f])=>f.initPB)?pb:0),
    darkvision:Math.max(sp.darkvision||0,fxAcc.dark||0),langs,saves,skills,pp,
    traits,bonus,actions,resources,
    feat:{n:feat.n,t:feat.t},attacks,caster,extraCasts,spCasts,
    flavor:{quirk:p.steps.quirk?p.steps.quirk.value:"",trinket:p.steps.trinket?p.steps.trinket.value:""},
    statRolls:p.steps.stats.pick?null:p.steps.stats.rolls,statPick:!!p.steps.stats.pick,
    statMethod:p.set.stat};
}

// ── Statblock conversion — real Forge entries, rendered by the app's composer ─
// Save-based damage cantrips keep the monster save-line format; attack cantrips and weapons become
// mode:"attack" entries so attackText/colorize/click-to-roll treat them exactly like a monster's.
const GEN_CANTRIP_LINES={
  "Acid Splash":{save:"dex",r:"range 60 ft. (5-ft. sphere)",d:"1d6",t:"Acid"},
  "Chill Touch":{atk:"Melee",reach:5,d:"1d10",t:"Necrotic",x:"the target can't regain Hit Points until the start of the caster's next turn."},
  "Eldritch Blast":{atk:"Ranged",range:"120",d:"1d10",t:"Force"},
  "Fire Bolt":{atk:"Ranged",range:"120",d:"1d10",t:"Fire"},
  "Mind Sliver":{save:"int",r:"range 60 ft.",d:"1d6",t:"Psychic",x:"the target subtracts 1d4 from its next saving throw before the end of the caster's next turn."},
  "Poison Spray":{atk:"Ranged",range:"30",d:"1d12",t:"Poison"},
  "Produce Flame":{atk:"Ranged",range:"60",d:"1d8",t:"Fire"},
  "Ray of Frost":{atk:"Ranged",range:"60",d:"1d8",t:"Cold",x:"the target's Speed decreases by 10 ft. until the start of the caster's next turn."},
  "Sacred Flame":{save:"dex",r:"range 60 ft.",d:"1d8",t:"Radiant",x:"the target gains no benefit from Half or Three-Quarters Cover on this save."},
  "Shocking Grasp":{atk:"Melee",reach:5,d:"1d8",t:"Lightning",x:"the target can't take Reactions until the start of its next turn."},
  "Sorcerous Burst":{atk:"Ranged",range:"120",d:"1d8",t:"Force",x:"on a die showing 8, roll and add one extra d8 (max 2 extra)."},
  "Starry Wisp":{atk:"Ranged",range:"60",d:"1d8",t:"Radiant",x:"the target sheds Dim Light until the end of the caster's next turn."},
  "Thorn Whip":{atk:"Melee",reach:30,d:"1d6",t:"Piercing",x:"a Large or smaller target is pulled up to 10 ft. closer."},
  "Thunderclap":{save:"con",r:"5-ft. Emanation",d:"1d6",t:"Thunder"},
  "Toll the Dead":{save:"wis",r:"range 60 ft.",d:"1d8",t:"Necrotic",x:"1d12 instead if the target is missing Hit Points."},
  "Vicious Mockery":{save:"wis",r:"range 60 ft.",d:"1d6",t:"Psychic",x:"the target has Disadvantage on its next attack roll before the end of its next turn."},
  "Word of Radiance":{save:"con",r:"5-ft. Emanation",d:"1d6",t:"Radiant"}
};
function genCantripEntry(name,dc,atk,label){
  const c=GEN_CANTRIP_LINES[name];if(!c)return null;
  if(c.atk)return {name:(label||name)+" (Cantrip)",mode:"attack",kind:c.atk,ability:"",atk:atk,
    reach:c.reach||5,range:c.range||"",dice:c.d,addMod:false,dtype:c.t,extra:c.x||""};
  return {name:(label||name)+" (Cantrip)",text:`*${GEN_ABIL_LABEL[c.save]} Saving Throw:* DC ${dc}, one target, ${c.r}. *Failure:* ${c.d} ${c.t} damage.${c.x?" "+c.x:""}`};
}
function genToMonster(ch){
  const m=blankMonster();
  m.name=ch.name;m.size=ch.size;m.type="Humanoid";m.subtype=ch.species;m.align="";
  m.ac=ch.ac;m.acnote=ch.acSrc&&ch.acSrc!=="Unarmored"?ch.acSrc:"";
  m.hp=ch.hp;m.hpf=`${ch.hd}${ch.mods.con?(ch.mods.con>0?" + ":" − ")+Math.abs(ch.mods.con):""}`;
  m.spd.walk=ch.speed.walk;m.spd.fly=ch.speed.fly||0;
  (ch.resists||[]).forEach(r=>{m.dmg[r]="res";}); // species/boon resistances → the real resistance line
  m.init=String(ch.init);
  GEN_ABILS.forEach(a=>{m[a]=ch.scores[a];});
  m.saves=ch.saves.map(s=>s.abil);
  m.skills=ch.skills.map(s=>[s.n.replace(/ /g,"_"),s.exp?"exp":"prof"]);
  m.tools=[...(ch.tools||[])];
  m.senses.darkvision=ch.darkvision;
  m.lang=ch.langs.join(", ");
  m.gear=ch.gear||"";
  m.cr="1"; // proficiency source for the composer; the CR line is not part of the crew card meta
  m.traits=ch.traits.map(t=>({name:t.n,text:t.t}));
  const acts=ch.attacks.map(w=>({name:w.n,mode:"attack",kind:w.kind==="Melee or Ranged"?"Melee or Ranged":w.kind,
    ability:w.ability,atk:w.bonus,reach:w.reach,range:w.range,dice:w.dice,addMod:w.addMod!==false,
    dtype:w.dtype,extra:[w.note?"("+w.note+")":"",w.mastery?"Mastery: "+w.mastery+".":""].filter(Boolean).join(" ")}));
  // D-019: cast sources sharing the same spellcasting ability (same DC/attack by construction)
  // collapse into ONE Spellcasting entry; only a genuinely different ability keeps its own block.
  // Every damage cantrip gets its attack/save line with its own block's numbers.
  {const casts=[];
    if(ch.caster)casts.push({name:"Spellcasting",abil:ch.caster.abil,dc:ch.caster.dc,atk:ch.caster.atk,
      cantrips:[...ch.caster.cantrips],
      groups:[{freq:`Level 1 (${ch.caster.slots} slot${ch.caster.slots>1?"s":""}, ${ch.caster.short?"Short Rest":"Long Rest"})`,spells:ch.caster.prepared.join(", ")}]});
    (ch.spCasts||[]).forEach(x=>casts.push({name:x.label,abil:x.abil,dc:x.dc,atk:x.atk,
      cantrips:x.cantrip?[x.cantrip]:[],
      groups:x.spell?[{freq:x.freq||"1/Long Rest",spells:x.spell}]:[]}));
    (ch.extraCasts||[]).forEach(x=>casts.push({name:x.label,abil:x.abil,dc:x.dc,atk:x.atk,
      cantrips:[...x.cantrips],groups:[{freq:`${x.label}, 1/Long Rest (also castable with slots)`,spells:x.spell}]}));
    const merged=[];
    casts.forEach(c=>{const m=merged.find(x=>x.abil===c.abil&&x.dc===c.dc&&x.atk===c.atk);
      if(m){m.cantrips.push(...c.cantrips);m.groups.push(...c.groups);}else merged.push(c);});
    merged.forEach(c=>c.cantrips.forEach(cn=>{const e=genCantripEntry(cn,c.dc,c.atk);if(e)acts.push(e);}));
    merged.forEach(c=>{
      const groups=[];
      if(c.cantrips.length)groups.push({freq:"Cantrips (at will)",spells:c.cantrips.join(", ")});
      groups.push(...c.groups.filter(g=>g.spells));
      if(!groups.length)return;
      acts.push({name:merged.length===1?"Spellcasting":c.name,mode:"spell",ability:c.abil,dc:c.dc,atk:c.atk,groups});
    });}
  (ch.actions||[]).forEach(t=>acts.push({name:t.n,text:t.t}));
  m.actions=acts;
  m.bonus=ch.bonus.map(t=>({name:t.n,text:t.t}));
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROSTER BRIDGE + CREW STATE (DM side)
// ═══════════════════════════════════════════════════════════════════════════
function genToRosterPC(ch,payload,playerName){
  const fields=[
    {k:"ac",v:String(ch.ac)},{k:"hp",v:String(ch.hp)},
    {k:"level",v:"1"},{k:"class",v:[ch.cls]},
    {k:"player",v:playerName||""},
    {k:"speed",v:ch.speed.fly?ch.speed.walk+" ft., Fly "+ch.speed.fly+" ft.":ch.speed.walk+" ft."},
    {k:"senses",v:ch.darkvision?"Darkvision "+ch.darkvision+" ft.":""},
    {k:"init",v:String(ch.init),hide:true}
  ];
  GEN_ABILS.forEach(a=>{
    const f={k:a,v:String(ch.scores[a])};
    if(ch.saves.some(s=>s.abil===a))f.prof=true;
    if(ch.caster&&ch.caster.abil===a)f.main=true;
    fields.push(f);
  });
  fields.push({k:"skills",v:ch.skills.map(s=>({s:s.n,e:s.exp?2:1}))});
  const noteBits=[ch.flavor.quirk?"Quirk: "+ch.flavor.quirk:"",ch.flavor.trinket?"Trinket: "+ch.flavor.trinket:""].filter(Boolean);
  return {id:payload.id,name:ch.name,notes:noteBits.join(" · "),
    fields,gen:{v:2,payload:clone(payload),pn:playerName||""}};
}
function genLivingPCs(a){return (a.party||[]).map(id=>rosterById(id)).filter(pc=>pc&&pc.gen&&pc.gen.payload);}
function genCrewCounts(a){const c={};genLivingPCs(a).forEach(pc=>{const v=pc.gen.payload.steps.cls&&pc.gen.payload.steps.cls.value;if(v)c[v]=(c[v]||0)+1;});return c;}
function genCrewUrl(id){return location.origin+location.pathname.replace(/[^/]*$/,"")+"index.html?crew="+encodeURIComponent(id);}
function genIngestPayload(a,rawPayload,pn,pid){
  const v=validateGenPayload(rawPayload);if(!v.ok)return null;
  // D-031: a locked-species crew accepts only its own species; ritual mode takes any shipped pack.
  if(a.crew&&a.crew.spMode!=="ritual"&&v.clean.sp!==a.crew.sp)return null;
  if(state.roster.some(r=>r.id===v.clean.id)||(a.crew.fallen||[]).some(f=>f.payload&&f.payload.id===v.clean.id))return null;
  const ch=deriveGenChar(v.clean),pc=genToRosterPC(ch,v.clean,pn||"");
  if(pid){pc.gen.pid=pid;
    const prev=state.roster.find(r=>r.gen&&r.gen.pid===pid&&(a.party||[]).includes(r.id));
    if(prev)genRetirePC(a,prev.id);}
  state.roster.push(normalizeRosterPC(pc));
  a.party.push(pc.id);
  saveRoster();saveAdv();
  return pc;
}
function genRetirePC(a,pcId,opts){
  const pc=state.roster.find(r=>r.id===pcId);if(!pc||!a.crew)return;
  let ch=null;
  if(pc.gen&&pc.gen.payload){const v=validateGenPayload(pc.gen.payload);if(v.ok)ch=deriveGenChar(v.clean);}
  a.crew.fallen.unshift({payload:pc.gen&&pc.gen.payload||null,pn:(pc.gen&&pc.gen.pn)||"",pid:(pc.gen&&pc.gen.pid)||"",
    name:pc.name||"?",cls:ch?ch.cls:"",at:Date.now()});
  a.party=(a.party||[]).filter(id=>id!==pcId);
  state.roster=state.roster.filter(r=>r.id!==pcId);
  saveRoster();saveAdv();
  if(!(opts&&opts.silent))toast(esc(pc.name)+" has fallen.",2400,true);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CARD — mounted through the app's own statblock composer. The Forge's builders read the
// global M (attack math, spell lines, colour categories), so the render swaps M to the generated
// monster for its synchronous duration and always restores it.
// ═══════════════════════════════════════════════════════════════════════════
// D-027: pack names on the Gear line are click popovers listing the pack's contents.
function genGearLineHTML(gear){
  return String(gear||"").split(",").map(s=>s.trim()).filter(Boolean)
    .map(it=>GEN_PACK_CONTENTS[it]?`<button class="gk-pack" data-gkpack="${esc(it)}">${esc(it)}</button>`:esc(it))
    .join(", ");
}
function genPcMetaHTML(ch,opts){
  const sgnf=n=>(n>=0?"+":"")+n;
  const rollSpan=(n,b,abil)=>`<span class="roll-num" data-roll="1d20${b>=0?"+":""}${b}" data-rolltype="check" data-rolllabel="${esc(n)}" data-abil="${abil}">${sgnf(b)}</span>`;
  let h=`<hr class="rule thin"><div class="meta">`;
  // D-019: the Skills line carries a chevron opening the full 18-skill panel (proficient or not,
  // every bonus rollable); Gear carries one opening the manual gear editor (owned cards only).
  if(ch.skills.length)h+=`<p class="gk-metarow"><span class="k">Skills</span> <span class="gk-meta-b">${ch.skills.map(s=>`${esc(s.n)} ${sgnf(s.bonus)}`).join(", ")}</span><button class="gk-chev" data-gkchev="skills" title="All skills" aria-label="All skills">▾</button></p>`;
  h+=`<div class="gk-allskills" hidden>${GEN_SKILLS.map(([n,abil])=>{
    const prof=ch.skills.find(s=>s.n===n);
    const b=prof?prof.bonus:ch.mods[abil];
    return `<span class="gk-ask${prof?" gk-ask-p":""}">${esc(n)} ${rollSpan(n,b,abil)}</span>`;
  }).join("")}</div>`;
  if(ch.tools&&ch.tools.length)h+=`<p><span class="k">Tools</span> ${ch.tools.map(esc).join(", ")}</p>`;
  if(ch.gear)h+=`<p class="gk-metarow"><span class="k">Gear</span> <span class="gk-meta-b" id="gkGearLine">${genGearLineHTML(ch.gear)}</span>${opts&&opts.gearEdit?`<button class="gk-chev" data-gkchev="gear" title="Edit gear" aria-label="Edit gear">▾</button>`:""}</p>`;
  if(opts&&opts.gearEdit)h+=`<div class="gk-gearedit" hidden></div>`;
  if(ch.resists&&ch.resists.length)h+=`<p><span class="k">Resistances</span> ${ch.resists.map(esc).join(", ")}</p>`;
  h+=`<p><span class="k">Senses</span> ${ch.darkvision?`Darkvision ${ch.darkvision} ft., `:""}Passive Perception ${ch.pp}</p>`;
  h+=`<p><span class="k">Languages</span> ${ch.langs.map(esc).join(", ")}</p>`;
  h+=`<p><span class="k">Level</span> 1 ${esc(ch.cls)} (PB +2)${opts&&opts.pn?` · Player: ${esc(opts.pn)}`:""}</p></div>`;
  return h;
}
function genResTrackerHTML(ch,used,interactive){
  if(!ch.resources||!ch.resources.length)return "";
  used=used||{};
  return `<div class="gk-res">${ch.resources.map(r=>{
    const u=Math.max(0,Math.min(r.max,Number(used[r.k])||0));
    const pips=Array.from({length:r.max},(x,i)=>`<button class="gk-pip${i<u?" gk-spent":""}"${interactive?` data-gkpip="${esc(r.k)}" data-i="${i}"`:" disabled"} aria-label="${esc(r.label)} use ${i+1}"></button>`).join("");
    // D-020: a resource may recharge partially on a Short Rest (sr uses) and fully on its `per`
    // rest — such rows carry both reset affordances.
    const sr=r.sr?(interactive
      ?`<button class="gk-res-per gk-res-sr" data-gksr="${esc(r.k)}" data-n="${r.sr}" title="Short Rest: regain ${r.sr}">SR +${r.sr}</button>`
      :`<span class="gk-res-per gk-res-per-s">SR +${r.sr}</span>`):"";
    return `<div class="gk-res-row"><span class="gk-res-l">${esc(r.label)}</span><span class="gk-pips">${pips}</span>${sr}${interactive?`<button class="gk-res-per" data-gkreset="${esc(r.k)}" title="Reset (${esc(r.per)})">${esc(r.per)}</button>`:`<span class="gk-res-per gk-res-per-s">${esc(r.per)}</span>`}</div>`;
  }).join("")}</div>`;
}
// B286: the character's own hit points, tracked on the card. Interactive on the player's phone
// (the crew card); the DM's copy of the same row is read-only — their tracker still owns combat HP,
// the phone only REPORTS (D-029). Damage eats temporary HP first, per the rules.
function genHpClamp(v,max,dflt){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(max,n)):dflt;}
function genHpTmpClamp(v){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(999,n)):0;}
function genHpState(hp,max){return {cur:genHpClamp(hp&&hp.cur,max,max),tmp:genHpTmpClamp(hp&&hp.tmp)};}
function genHpValHTML(s,max){
  return `<b>${s.cur}</b><span class="gk-hp-max">/${max}</span>${s.tmp?`<span class="gk-hp-tmp">+${s.tmp}</span>`:""}`;
}
function genHpTrackerHTML(ch,hp,interactive){
  const max=Math.max(0,Math.round(Number(ch.hp)||0));
  const s=genHpState(hp,max);
  const step=(d,l)=>`<button class="gk-hp-step" data-gkhp="${d}" aria-label="${l}">${d>0?"+":"−"}</button>`;
  return `<div class="gk-hp${s.cur<=0?" gk-hp-out":(max&&s.cur<=Math.ceil(max/3)?" gk-hp-low":"")}" data-max="${max}">
    <span class="gk-res-l">Hit points</span>
    ${interactive?step(-1,"Lose a hit point"):""}
    <button class="gk-hp-v"${interactive?` data-gkhpedit title="Type exact values"`:" disabled"}>${genHpValHTML(s,max)}</button>
    ${interactive?step(1,"Regain a hit point"):""}
    ${interactive?`<button class="gk-res-per" data-gkhpfull title="Back to full">full</button>`:`<span class="gk-res-per gk-res-per-s">reported</span>`}
  </div>`;
}
function genCardHTML(ch,opts){
  opts=opts||{};
  const m=genToMonster(ch);
  const prevM=M;let core;
  try{M=m;core=sbHeaderHTML(m)+sbAbilityTableHTML(m,ch.pb)+genPcMetaHTML(ch,opts)+sbEntriesHTML(m);}
  finally{M=prevM;}
  const fl=ch.flavor;
  const rows=[];
  if(opts.dead)rows.push(`<div class="gk-dead-line">Fallen</div>`);
  if(fl.quirk)rows.push(`<div><b>Quirk:</b> ${esc(fl.quirk)}</div>`);
  if(fl.trinket)rows.push(`<div><b>Trinket:</b> ${esc(fl.trinket)}</div>`);
  const flavor=rows.length?`<div class="gk-flavor">${rows.join("")}</div>`:"";
  // D-025: the familiar's full statblock rides below the PC card, through the same composer.
  let fam="";
  if(!opts.dead&&ch.familiar&&GEN_FAMILIARS[ch.familiar]){
    const fm=genFamiliarMonster(ch.familiar);
    const prevF=M,fpb=pbForCR(fm.cr);
    try{M=fm;fam=`<div class="gk-fam-h">Familiar</div><div class="sb gk-card gk-fam">${sbHeaderHTML(fm)+sbAbilityTableHTML(fm,fpb)+sbMetaHTML(fm,fpb,xpOf(fm))+sbEntriesHTML(fm)}</div>`;}
    finally{M=prevF;}
  }
  return `<div class="sb gk-card${opts.dead?" gk-dead":""}">${core}${flavor}</div>`
    +(opts.dead||!opts.hp?"":genHpTrackerHTML(ch,opts.hp,!!opts.hpEdit))
    +(opts.dead||opts.pips==="off"?"":genResTrackerHTML(ch,opts.res,opts.pips==="live"))
    +fam;
}
function genFamiliarMonster(name){
  const m={...blankMonster(),...JSON.parse(JSON.stringify(GEN_FAMILIARS[name]||{}))};
  m._auto={ac:false,hp:false};
  return m;
}
// Mount + post-process: the colour/link/rollable pass runs with M swapped so DCs, damage, spell
// names, and condition names light up exactly like a bestiary statblock.
function genMountCard(host,ch,opts,handlers){
  opts=opts||{};handlers=handlers||{};
  if(handlers.onGear){opts={...opts,gearEdit:true};
    if(handlers.gearGet){const g=handlers.gearGet();if(g!=null)ch={...ch,gear:g};}}
  host.innerHTML=genCardHTML(ch,opts);
  const cardEl=host.querySelector(".gk-card:not(.gk-fam)");
  if(cardEl&&typeof colorizeStatblock==="function"){
    const prevM=M;
    try{M=genToMonster(ch);colorizeStatblock(cardEl);}catch(e){/* colour pass is cosmetic */}
    finally{M=prevM;}
  }
  const famEl=host.querySelector(".gk-card.gk-fam");
  if(famEl&&ch.familiar&&typeof colorizeStatblock==="function"){
    const prevM=M;
    try{M=genFamiliarMonster(ch.familiar);colorizeStatblock(famEl);}catch(e){/* cosmetic */}
    finally{M=prevM;}
  }
  bindGenCard(host,handlers);
}
// The gear editor (D-019): remove/add items by hand — used or lost gear stays edited on THIS
// character (an overlay owned by the card's holder; the wire payload never carries it).
// Count stepping over "<n> <plural>" items; the singular/plural rules cover the kit and pack
// vocabulary (Javelins/Bolts +s, Torches +es).
function gkGearStep(item,delta){
  const m=String(item||"").match(/^(\d+)\s+(.+)$/);if(!m)return item;
  const n=Number(m[1])+delta;if(n<=0)return null;
  let base=m[2];
  if(/(ch|sh|x|ss)es$/i.test(base))base=base.slice(0,-2);
  else if(/s$/i.test(base)&&!/ss$/i.test(base))base=base.slice(0,-1);
  const plural=/(ch|sh|x|s)$/i.test(base)?base+"es":base+"s";
  return n===1?`1 ${base}`:`${n} ${plural}`;
}
function gkBuildGearEditor(root,h){
  const box=root.querySelector(".gk-gearedit");if(!box||!h.gearGet)return;
  // D-027: packs unpack into their component items in the editor; the first edit materializes
  // the expansion into the stored overlay (Back-to-rolled-gear still restores the pack name).
  const items=String(h.gearGet()||"").split(",").map(s=>s.trim()).filter(Boolean)
    .flatMap(it=>GEN_PACK_CONTENTS[it]||[it]);
  box.innerHTML=items.map((it,i)=>{
    const num=/^\d+\s+/.test(it);
    return `<span class="gk-gitem">${esc(it)}${num?`<button class="gk-gq" data-gkgq="${i}" data-d="-1" aria-label="One fewer: ${esc(it)}">−</button><button class="gk-gq" data-gkgq="${i}" data-d="1" aria-label="One more: ${esc(it)}">+</button>`:""}<button class="gk-gx" data-gkgx="${i}" aria-label="Remove ${esc(it)}">✕</button></span>`;
  }).join("")
    +`<span class="gk-gadd"><input type="text" class="popinput gk-gin" maxlength="60" placeholder="Add an item"><button class="btn ghost sm gk-gbtn" style="width:auto">Add</button></span>`
    +(h.gearDirty&&h.gearDirty()?`<button class="gk-linklike gk-greset">Back to the rolled gear</button>`:"");
  const commit=str=>{
    if(h.onGear)h.onGear(str);
    const line=root.querySelector("#gkGearLine");
    if(line)line.innerHTML=genGearLineHTML(h.gearGet()||"");
    gkBuildGearEditor(root,h);
  };
  box.querySelectorAll("[data-gkgx]").forEach(x=>x.addEventListener("click",()=>{
    const arr=items.slice();arr.splice(Number(x.dataset.gkgx),1);commit(arr.join(", "));}));
  // Numbered items ("4 Javelins", "20 Bolts") step their count; 0 removes the item.
  box.querySelectorAll("[data-gkgq]").forEach(x=>x.addEventListener("click",()=>{
    const arr=items.slice(),i=Number(x.dataset.gkgq);
    const next=gkGearStep(arr[i],Number(x.dataset.d));
    if(next==null)arr.splice(i,1);else arr[i]=next;
    commit(arr.join(", "));}));
  const add=()=>{const inp=box.querySelector(".gk-gin");
    const v=String(inp.value||"").replace(/[<>]/g,"").trim().slice(0,60);
    if(!v)return;commit(items.concat([v]).join(", "));};
  box.querySelector(".gk-gbtn").addEventListener("click",add);
  box.querySelector(".gk-gin").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add();}});
  const rst=box.querySelector(".gk-greset");
  if(rst)rst.addEventListener("click",()=>commit(null));
}
function bindGenCard(root,h){
  // D-027: pack-name popover (delegated, so gear-line rewrites keep working).
  root.addEventListener("click",e=>{
    const pk=e.target.closest("[data-gkpack]");if(!pk)return;
    const items=GEN_PACK_CONTENTS[pk.dataset.gkpack];if(!items)return;
    e.stopPropagation();
    showPopover(pk,`<div class="gk-packpop"><b>${esc(pk.dataset.gkpack)}</b>${items.map(i=>`<div>${esc(i)}</div>`).join("")}</div>`);
  });
  // D-019: the card is rollable wherever it's mounted — same delegation the statblock preview
  // uses, bound on the card's own host (the modal is outside #statblock's listener).
  root.addEventListener("click",e=>{
    if(typeof clickRollOn!=="function"||!clickRollOn())return;
    const t=e.target.closest("[data-roll]");
    if(t&&e.altKey){e.preventDefault();openRollMenu(t);return;}
    const nm=e.target.closest(".roll-atkname[data-roll]");if(nm){rollAttackSequence(nm);return;}
    const rt=e.target.closest(".roll-rchtag[data-roll]");if(rt){quickRoll(rt);return;}
    const rn=e.target.closest(".roll-rchname[data-roll]");if(rn){rollRechargeSequence(rn);return;}
    if(t)quickRoll(t);
  });
  root.addEventListener("contextmenu",e=>{
    const t=e.target.closest("[data-roll]");
    if(!t||typeof clickRollOn!=="function"||!clickRollOn())return;
    e.preventDefault();openRollMenu(t);
  });
  root.querySelectorAll("[data-gkchev]").forEach(b=>b.addEventListener("click",()=>{
    const kind=b.dataset.gkchev;
    const panel=root.querySelector(kind==="skills"?".gk-allskills":".gk-gearedit");
    if(!panel)return;
    const open=panel.hasAttribute("hidden");
    if(open)panel.removeAttribute("hidden");else panel.setAttribute("hidden","");
    b.classList.toggle("gk-chev-open",open);
    if(kind==="gear"&&open)gkBuildGearEditor(root,h);
  }));
  root.querySelectorAll("[data-gkpip]").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.gkpip,i=Number(b.dataset.i);
    const row=b.parentElement,cur=row.querySelectorAll(".gk-spent").length;
    const next=i<cur?i:i+1;
    [...row.children].forEach((p,j)=>p.classList.toggle("gk-spent",j<next));
    if(h.onRes)h.onRes(k,next);}));
  root.querySelectorAll("[data-gkreset]").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.gkreset;
    const row=root.querySelector(`[data-gkpip="${k}"]`);
    if(row)[...row.parentElement.children].forEach(p=>p.classList.remove("gk-spent"));
    if(h.onRes)h.onRes(k,0);}));
  // Short-Rest partial recharge (D-020): clear `n` spent pips, keep the rest spent.
  root.querySelectorAll("[data-gksr]").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.gksr,n=Number(b.dataset.n)||1;
    const pip=root.querySelector(`[data-gkpip="${k}"]`);if(!pip)return;
    const row=pip.parentElement,cur=row.querySelectorAll(".gk-spent").length;
    const next=Math.max(0,cur-n);
    [...row.children].forEach((p,j)=>p.classList.toggle("gk-spent",j<next));
    if(h.onRes)h.onRes(k,next);}));
  // B286: HP row. Repainted in place (a full card re-render on every tap would re-run the
  // composer + colourizer); the handler owns persistence and the cloud report.
  {const box=root.querySelector(".gk-hp");
  if(box&&h.onHp&&h.hpGet){
    const max=Math.max(0,Math.round(Number(box.dataset.max)||0));
    const paint=s=>{const v=box.querySelector(".gk-hp-v");if(v)v.innerHTML=genHpValHTML(s,max);
      box.classList.toggle("gk-hp-out",s.cur<=0);
      box.classList.toggle("gk-hp-low",s.cur>0&&!!max&&s.cur<=Math.ceil(max/3));};
    const commit=s=>{const n=genHpState(s,max);paint(n);h.onHp(n);};
    const now=()=>genHpState(h.hpGet(),max);
    box.querySelectorAll("[data-gkhp]").forEach(b=>b.addEventListener("click",()=>{
      const d=Number(b.dataset.gkhp)||0,s=now();
      // Damage comes off temporary hit points first; healing never touches them.
      if(d<0&&s.tmp>0)commit({cur:s.cur,tmp:s.tmp-1});else commit({cur:s.cur+d,tmp:s.tmp});}));
    const full=box.querySelector("[data-gkhpfull]");
    if(full)full.addEventListener("click",()=>commit({cur:max,tmp:0}));
    const edit=box.querySelector("[data-gkhpedit]");
    if(edit)edit.addEventListener("click",e=>{e.stopPropagation();const s=now();
      const p=showPopover(edit,`<div class="gk-hppop">
        <label class="f">Current<input type="number" class="popinput" id="gkHpCur" value="${s.cur}" min="0" max="${max}" inputmode="numeric"></label>
        <label class="f">Temporary<input type="number" class="popinput" id="gkHpTmp" value="${s.tmp}" min="0" inputmode="numeric"></label>
        <div class="mrow"><button class="btn primary sm" id="gkHpOk" style="width:auto">Apply</button></div></div>`);
      const cin=p.querySelector("#gkHpCur"),tin=p.querySelector("#gkHpTmp");
      const apply=()=>{commit({cur:cin.value,tmp:tin.value});closePopover();};
      p.querySelector("#gkHpOk").addEventListener("click",apply);
      p.querySelectorAll("input").forEach(i=>i.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();apply();}}));
      setTimeout(()=>{try{cin.focus();cin.select();}catch(err){}},30);});
  }}
}
function openGenCard(a,payload,o){
  o=o||{};
  const v=validateGenPayload(payload);if(!v.ok){toast("This card can't be rebuilt from its data.");return;}
  const ch=deriveGenChar(v.clean);
  const pc=o.pcId?rosterById(o.pcId):null;
  // The HP row appears only once the player's phone has reported some (D-029: read-only here).
  if(pc)o={...o,res:(pc.gen&&pc.gen.res)||{},pips:"live",hp:(pc.gen&&pc.gen.hp)||null};
  // D-021: the statblock modal is the generated member's home surface — notes live at its bottom.
  openModalRaw(`<div id="gkCardHost"></div>
    ${pc?`<label class="f gk-noterow">Notes<textarea id="gkNotes" placeholder="Anything worth remembering about ${esc(ch.name)}">${esc(pc.notes||"")}</textarea></label>`:""}
    <div class="mrow">${o.pcId?`<button class="btn ghost sm" id="gkDied" style="width:auto">Mark dead</button><button class="btn ghost sm" id="gkPage" style="width:auto">Full page</button>`:""}<button class="btn ghost sm" id="gkClose" style="width:auto">Close</button></div>`);
  const rolledGear=ch.gear;
  genMountCard($("#gkCardHost"),ch,o,{
    onRes:pc?(k,used)=>{pc.gen.res=pc.gen.res||{};pc.gen.res[k]=used;saveRoster();}:null,
    gearGet:pc?()=>(pc.gen&&pc.gen.gear!=null?pc.gen.gear:rolledGear):null,
    gearDirty:pc?()=>!!(pc.gen&&pc.gen.gear!=null):null,
    onGear:pc?s=>{if(s==null)delete pc.gen.gear;else pc.gen.gear=String(s).slice(0,400);saveRoster();}:null});
  const notes=$("#gkNotes");
  if(notes&&pc)notes.addEventListener("change",()=>{pc.notes=String(notes.value||"").slice(0,2000);saveRoster();});
  $("#gkClose").addEventListener("click",closeModal);
  const page=$("#gkPage");
  if(page&&pc)page.addEventListener("click",()=>{closeModal();openCharacterDetail(pc.id,a?a.id:null);});
  const died=$("#gkDied");
  if(died)died.addEventListener("click",()=>{
    confirmModal(`Mark ${ch.name} as dead? The card moves to the fallen list.`,()=>{
      genRetirePC(a,o.pcId);closeModal();preserveScroll(".adv-detail-body",renderAdvDetail);});});
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RITUAL — one step at a time; the option table shows before the roll; any result is clickable
// to override (D-011). Identity is typed. A "Roll the rest" fast-path fills everything but the name.
// ═══════════════════════════════════════════════════════════════════════════
let _genR=null; // {mode, pn, editing, draft, done, more:{}}
// Font Awesome gear (free solid) — the crew-settings button in the roster header (D-021).
const GEN_GEAR_ICON='<svg viewBox="0 0 512 512" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>';
// D-017: labels are bare names; the die/method detail lives behind the small ? button (genStepInfo).
function genStepLabel(d,id){
  if(id==="species")return "Species";
  if(id==="stats")return "Ability scores";
  if(id==="cls")return "Class";
  if(id==="asi")return "Background ability scores";
  if(id==="feat")return "Origin feat";
  if(id==="feat2")return "Second origin feat";
  if(id==="skills")return "Class skills";
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];return K&&K.featureOpt?(K.featureOpt.kind==="expertise"?"Expertise":K.featureOpt.label):"Class feature";}
  if(id==="equip")return "Equipment kit";
  if(id==="cantrips")return "Cantrips";
  if(id==="spells")return "Prepared spells";
  if(id==="familiar")return "Familiar";
  if(id==="gearPack")return "Pack";
  if(id==="sundries")return "Sundries";
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));return t?t.label:id;}
  if(id==="name")return "Identity";
  return id;
}
function genStepInfo(d,id){
  if(id==="species")return `${genDieLabel(genSpeciesPool().length)} over the available species. Rerolling replaces the species and its rolled traits.`;
  if(id==="stats")return d.set.stat==="4d6"?"Six rolls of 4d6, lowest die dropped, in order STR to CHA. Any landed score can be edited by hand.":"Six rolls of 3d6, in order STR to CHA. Any landed score can be edited by hand.";
  if(id==="cls")return d.set.mode==="chaos"?"d12 over all twelve classes.":"d6 over the three classes that best fit the rolled scores; the rest are pickable below them.";
  if(id==="asi")return "+2 and +1 to two different abilities. The class default is preselected; apply it or change it.";
  if(id==="feat")return "d10 over the ten origin feats. Feats with internal choices roll those too.";
  if(id==="feat2")return "The species grants a second origin feat: d10 over the ten, the first feat rerolled.";
  if(id==="skills"){const K=GEN_CLASSES[genClsOf(d)||"Fighter"];
    return `${K.skills.n} rolls on ${genDieLabel(K.skills.from.length)} over the class skill list, duplicates rerolled.`;}
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];
    if(K&&K.featureOpt&&K.featureOpt.kind==="expertise")return "Two of the rolled skills, duplicates rerolled.";
    if(K&&K.featureOpt)return `${genDieLabel(K.featureOpt.options.length)} over the ${K.featureOpt.options.length} options.`;
    return "";}
  if(id==="equip"){const K=GEN_CLASSES[genClsOf(d)];const n=K?genKitIdx(d,K).length:0;
    return `${genDieLabel(n)} over the class kit table. Every item is within the class's training; some kits unlock with a class feature.`;}
  if(id==="cantrips")return `${genCantripCount(d)} rolls over the class cantrips, one table each: the first defaults to Damaging, the rest to All. Duplicates and cantrips granted elsewhere reroll.`;
  if(id==="spells"){const K=GEN_CLASSES[genClsOf(d)];
    return `${K.caster.prepared} rolls over the class level-1 spells, one table each: the first defaults to Damaging, the rest to All. Duplicates and spells granted elsewhere reroll.`;}
  if(id==="familiar"){const kind=genFamiliarKind(d);
    return kind==="chain"?"d8 over the eight Pact of the Chain special forms; the familiar's statblock joins the card."
      :"Find Familiar is known: "+genDieLabel(GEN_FAMILIAR_BEASTS.length)+" over the beast forms; the familiar's statblock joins the card.";}
  if(id==="gearPack")return "d6 over the six equipment packs.";
  if(id==="sundries")return "Two d20 rolls, one on each sundries list.";
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));if(!t)return "";
    if(t.kind==="skill")return `${genDieLabel(t.entries.length)} over the listed skills; skills already owned reroll.`;
    return `d${t.die} on the ${t.label} table.`;}
  if(id==="name")return "Typed, never rolled. The name is required; quirk and trinket are optional.";
  return "";
}
// The option table for a step, when one exists: [{span, label, value, hit}]
function genStepTable(d,id){
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null,s=d.steps[id];
  const mk=(list,labels)=>{const die=genDieFor(list.length);
    return {die,note:die>list.length?"reroll over "+list.length:"",multi:true,
      rows:list.map((v,i)=>({span:String(i+1),label:labels?labels[i]:String(v),value:v,
        hit:s&&Array.isArray(s.value)&&s.value.includes(v)}))};};
  if(id==="cls"){
    if(d.set.mode==="chaos")return {die:12,rows:GEN_CLASS_LIST.map((c,i)=>({span:String(i+1),label:c,value:c,hit:s&&s.value===c}))};
    const scores={};GEN_ABILS.forEach((a,i)=>{scores[a]=d.steps.stats&&d.steps.stats.value&&d.steps.stats.value[i]!=null?d.steps.stats.value[i]:10;});
    const top3=(s&&s.top3)||genClassShortlist(scores,d.counts);
    const span=genSpanFor(3);
    return {die:span.die,rows:top3.map((c,i)=>({span:span.spans[i][0]+"-"+span.spans[i][1],label:c,value:c,hit:s&&s.value===c})),
      moreRows:GEN_CLASS_LIST.filter(c=>!top3.includes(c)).map(c=>({span:"·",label:c,value:c,hit:s&&s.value===c}))};
  }
  if(id==="species"){const pool=genSpeciesPool(),span=genSpanFor(pool.length);
    return {die:span.die,note:span.reroll?"reroll over "+pool.length:"",
      rows:pool.map((v,i)=>({span:span.reroll?String(i+1):span.spans[i][0]+"-"+span.spans[i][1],label:GEN_SPECIES[v].label,value:v,hit:s&&s.value===v}))};}
  if(id==="feat"||id==="feat2")return {die:10,rows:GEN_FEATS.map((f,i)=>({span:String(i+1),label:f.n,value:f.n,hit:s&&s.value===f.n}))};
  if(id==="skills"&&K)return mk(K.skills.from);
  if(id==="feature"&&K&&K.featureOpt){
    if(K.featureOpt.kind==="expertise"){const own=(d.steps.skills&&d.steps.skills.value)||[];return own.length?mk(own):null;}
    const opts=K.featureOpt.options,span=genSpanFor(opts.length);
    return {die:span.die,rows:opts.map((o,i)=>({span:span.reroll?String(i+1):span.spans[i][0]+"-"+span.spans[i][1],label:o.label,value:o.value,hit:s&&s.value===o.value})),
      note:span.reroll?"reroll over "+opts.length:""};
  }
  if(id==="equip"&&K){const avail=genKitIdx(d,K),span=genSpanFor(avail.length);
    return {die:span.die,rows:avail.map((ki,i)=>({span:span.reroll?String(i+1):span.spans[i][0]+"-"+span.spans[i][1],label:K.kits[ki].n,sub:K.kits[ki].gear,value:ki,hit:s&&s.value===ki})),
      note:span.reroll?"reroll over "+avail.length:""};}
  // D-024: the spell steps show BOTH tables — Damaging and All — numbered independently.
  const mk2=(full,dmg)=>{
    const one=(list,title)=>({title:`${title} (${genDieLabel(list.length)})`,die:genDieFor(list.length),multi:true,
      rows:list.map((v,i)=>({span:String(i+1),label:v,value:v,hit:s&&Array.isArray(s.value)&&s.value.includes(v)}))});
    return {pair:[one(dmg,"Damaging"),one(full,"All")]};};
  if(id==="cantrips"&&cls){const full=genTablesOf(d).can[cls]||[];
    return mk2(full,full.filter(n=>!!GEN_CANTRIP_LINES[n]));}
  if(id==="spells"&&cls){const K2=GEN_CLASSES[cls];
    const list=(genTablesOf(d).l1[cls]||[]).filter(x=>!(K2.caster.always||[]).includes(x));
    return mk2(list,list.filter(n=>GEN_DMG_SPELLS.includes(n)));}
  if(id==="familiar"){const kind=genFamiliarKind(d);if(!kind)return null;
    const list=kind==="chain"?GEN_FAMILIAR_CHAIN:GEN_FAMILIAR_BEASTS,span=genSpanFor(list.length);
    return {die:span.die,note:span.reroll?"reroll over "+list.length:"",
      rows:list.map((v,i)=>({span:span.reroll?String(i+1):span.spans[i][0]+"-"+span.spans[i][1],label:v,value:v,hit:s&&s.value===v}))};}
  if(id==="gearPack")return {die:6,rows:GEN_PACKS.map((p,i)=>({span:String(i+1),label:p,value:p,hit:s&&s.value===p}))};
  if(id==="sundries")return {pair:[
    {title:"First roll (d20)",die:20,rows:GEN_SUNDRIES_A.map((v,i)=>({span:String(i+1),label:v,value:v,hit:s&&Array.isArray(s.value)&&s.value[0]===v}))},
    {title:"Second roll (d20)",die:20,rows:GEN_SUNDRIES_B.map((v,i)=>({span:String(i+1),label:v,value:v,hit:s&&Array.isArray(s.value)&&s.value[1]===v}))}]};
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));if(!t)return null;
    if(t.kind==="skill"){const die=t.die||genDieFor(t.entries.length);
      return {die,note:die>t.entries.length?"reroll over "+t.entries.length:"",
        rows:t.entries.map((n,i)=>({span:String(i+1),label:n,value:n,hit:s&&s.value===n}))};}
    return {die:t.die,rows:t.entries.map(e=>({span:e.lo===e.hi?String(e.lo):e.lo+"-"+e.hi,label:e.label,value:e.value,hit:s&&s.value===e.value}))};}
  return null;
}
function genDiceChips(s){
  if(!s||s.pick)return s&&s.pick?`<span class="gk-picked">chosen</span>`:"";
  if(!s.rolls||!s.rolls.length)return "";
  return `<span class="gk-dchips">${s.rolls.map(r=>Array.isArray(r)?r.join("·"):r).join(" | ")}</span>`;
}
// Hand a ritual roll's raw faces to the app's 3D dice (D-015). Values are already decided by the
// engine; the 3D layer replays them, so what settles on the felt is always what the step recorded.
function genFire3D(label,groups,msg,total){
  if(typeof rollDice3D!=="function")return;
  const parts=groups.filter(g=>g&&Array.isArray(g.rolls)&&g.rolls.length&&g.die)
    .map(g=>`${g.rolls.length}d${g.die}${g.k||""}:[${g.rolls.join(",")}]`).join(" ");
  if(!parts)return;
  try{rollDice3D({parts,label:label||"Roll",msg:msg||"",total});}catch(e){/* the ritual never depends on the dice layer */}
}
function genSubGroups(sub){
  if(!sub)return [];
  if(sub.kind==="mi")return [sub.list,sub.cans,sub.sp].filter(Boolean);
  return [sub];
}
function genStepValueHTML(d,id){
  const s=d.steps[id];if(!s||s.value==null)return "";
  if(id==="species"){const spp=GEN_SPECIES[s.value];
    return `<b data-gkedit="species">${esc(spp?spp.label:String(s.value))}</b> ${genDiceChips(s)}`;}
  if(id==="asi")return `<b data-gkedit="asi">+2 ${s.value[0].toUpperCase()} / +1 ${s.value[1].toUpperCase()}</b> <span class="gk-dim">${s.pick?"chosen":"class default"}</span>`;
  if(id==="equip"){const K=GEN_CLASSES[genClsOf(d)];const k=K&&K.kits[s.value];
    return `<b data-gkedit="equip">${esc(k?k.n:String(s.value))}</b> ${genDiceChips(s)} <span class="gk-dim">${esc(k?k.gear:"")}</span>`;}
  if(id==="feature"&&s.kind==="expertise")return s.value.map(x=>`<span class="gk-chip2" data-gkedit="feature">${esc(x)}</span>`).join(" ")+" "+genDiceChips(s);
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];const o=K.featureOpt.options.find(x=>x.value===s.value);
    let h=`<b data-gkedit="feature">${esc(o?o.label:String(s.value))}</b> ${genDiceChips(s)}`;
    if(o&&o.hooks&&o.hooks.tome)h+=s.sub&&s.sub.value?(" → "+s.sub.value.map(x=>`<span class="gk-chip2" data-gksubedit="feature" title="Change">${esc(x)}</span>`).join(" ")):` <span class="gk-warn">three cantrips pending</span>`;
    return h;}
  if(id==="feat"||id==="feat2"){let h=`<b data-gkedit="${id}">${esc(String(s.value))}</b> ${genDiceChips(s)}`;
    const sub=s.sub;
    if(sub){
      if(sub.kind==="mi"&&sub.list)h+=` → <span class="gk-chip2" data-gksubedit="${id}" title="Change">${esc(sub.list.value)}</span> `+
        (sub.cans&&sub.cans.value?sub.cans.value.map(x=>`<span class="gk-chip2" data-gksubedit="${id}" title="Change">${esc(x)}</span>`).join(" "):"")+
        (sub.sp&&sub.sp.value?` <span class="gk-chip2" data-gksubedit="${id}" title="Change">${esc(sub.sp.value)}</span>`:"");
      else if(Array.isArray(sub.value))h+=" → "+sub.value.map(x=>`<span class="gk-chip2" data-gksubedit="${id}" title="Change">${esc(x)}</span>`).join(" ");
    }else if(GEN_FEATS.find(x=>x.n===s.value&&x.sub))h+=` <span class="gk-warn">extra rolls pending</span>`;
    return h;}
  if(Array.isArray(s.value))return s.value.map(x=>`<span class="gk-chip2" data-gkedit="${id}">${esc(String(x))}</span>`).join(" ")+" "+genDiceChips(s);
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3)),e=t.entries.find(x=>x.value===s.value);
    let h=`<b data-gkedit="${id}">${esc(e?e.label:String(s.value))}</b> ${genDiceChips(s)}`;
    if(e&&e.sub)h+=s.sub&&s.sub.value!=null?` → <span class="gk-chip2" data-gksubedit="${id}" title="Change">${esc(String(s.sub.value))}</span> ${genDiceChips(s.sub)}`:` <span class="gk-warn">${esc(e.sub.label)} pending</span>`;
    return h;}
  if(id==="name"){const extras=["quirk","trinket"].filter(k=>d.steps[k]&&d.steps[k].value).length;
    return `<b data-gkedit="name">${esc(String(s.value))}</b>${extras?` <span class="gk-dim">notes: ${extras}/2</span>`:""}`;}
  return `<b data-gkedit="${id}">${esc(String(s.value))}</b> ${genDiceChips(s)}`;
}
// D-017: ritual dropdown rows carry their table number (pass `numbered`) so physical dice can
// drive any pick; settings dropdowns stay plain.
function genSel(id,opts,cur,labels,numbered){
  return `<select id="${id}" class="gk-sel">${opts.map((o,i)=>`<option value="${esc(String(o))}"${String(o)===String(cur)?" selected":""}>${numbered?`${i+1} · `:""}${esc(labels?labels[i]:String(o))}</option>`).join("")}</select>`;
}
function genEditorHTML(d,id){
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null,s=d.steps[id];
  const nSel=(list,n,cur,idp)=>Array.from({length:n},(x,i)=>genSel(idp+i,list,cur&&cur[i]||list[i],null,true));
  if(id==="stats")return GEN_ABILS.map((a,i)=>`<label class="gk-si">${a.toUpperCase()}<input type="number" min="3" max="20" id="gkSt_${a}" value="${s&&s.value&&s.value[i]!=null?s.value[i]:10}"></label>`).join("")+`<button class="btn primary sm gk-apply" data-gkapply="stats">Set scores</button>`;
  if(id==="asi"){const cur=s?s.value:[K?K.prim:"str",K?K.sec:"con"];
    return `<span class="gk-dim">Class default: +2 ${(K?K.prim:"str").toUpperCase()} / +1 ${(K?K.sec:"con").toUpperCase()}.</span>`
      +genSel("gkAsi2",GEN_ABILS,cur[0],GEN_ABILS.map(a=>"+2 "+a.toUpperCase()),true)+genSel("gkAsi1",GEN_ABILS,cur[1],GEN_ABILS.map(a=>"+1 "+a.toUpperCase()),true)+`<button class="btn primary sm gk-apply" data-gkapply="asi">Apply</button>`;}
  if(id==="skills"&&K)return nSel(K.skills.from,K.skills.n,s&&s.value,"gkSk_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="skills">Apply</button>`;
  if(id==="feature"&&K&&K.featureOpt&&K.featureOpt.kind==="expertise"){const own=(d.steps.skills&&d.steps.skills.value)||[];
    return nSel(own,Math.min(2,own.length),s&&s.value,"gkEx_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="feature">Apply</button>`;}
  if(id==="cantrips"&&cls)return nSel(genTablesOf(d).can[cls]||[],genCantripCount(d),s&&s.value,"gkCn_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="cantrips">Apply</button>`;
  if(id==="spells"&&cls&&K){const list=(genTablesOf(d).l1[cls]||[]).filter(x=>!(K.caster.always||[]).includes(x));
    return nSel(list,K.caster.prepared,s&&s.value,"gkSp_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="spells">Apply</button>`;}
  if(id==="sundries")return genSel("gkSu_0",GEN_SUNDRIES_A,s&&s.value&&s.value[0]||GEN_SUNDRIES_A[0],null,true)
    +genSel("gkSu_1",GEN_SUNDRIES_B,s&&s.value&&s.value[1]||GEN_SUNDRIES_B[0],null,true)
    +`<button class="btn primary sm gk-apply" data-gkapply="sundries">Apply</button>`;
  if(id==="name"){
    const v=k=>d.steps[k]&&d.steps[k].value?esc(d.steps[k].value):"";
    return `<input type="text" id="gkNm" class="popinput gk-nm" maxlength="28" placeholder="Name (required)" value="${s?esc(s.value):""}">
      <input type="text" id="gkQk" class="popinput gk-idf" maxlength="90" placeholder="Quirk (optional)" value="${v("quirk")}">
      <input type="text" id="gkTk" class="popinput gk-idf" maxlength="90" placeholder="Trinket (optional)" value="${v("trinket")}">
      <button class="btn primary sm gk-apply" data-gkapply="name">Done</button>`;
  }
  return "";
}
function genSubEditorHTML(d,id){
  const s=d.steps[id];if(!s)return "";
  const roll=`<button class="btn ghost sm" data-gkrollsub="${id}">${D20_ICON}<span>Roll</span></button>`;
  if(id==="feat"||id==="feat2"){const f=GEN_FEATS.find(x=>x.n===s.value);if(!f||!f.sub)return "";
    if(f.sub==="mi"){
      // v4 follow-up: the spells are manually pickable too — list select drives the spell selects,
      // "Roll from it" keeps the pick-list-roll-spells flow, Choose applies the four selects as-is.
      const curList=_genR.miList||(s.sub&&s.sub.list&&s.sub.list.value)||"Cleric";
      const can=GEN_CLASS_SPELLS[curList][0],l1=GEN_CLASS_SPELLS[curList][1];
      const curC=(s.sub&&s.sub.cans&&s.sub.cans.value)||[],curS=s.sub&&s.sub.sp&&s.sub.sp.value;
      return `<div class="gk-subrow"><span class="gk-dim">Magic Initiate: list (d6, 1-2 / 3-4 / 5-6), two cantrips, one spell.</span>${roll}${genSel("gkMiL",GEN_MI_LISTS,curList,null,true)}<button class="btn ghost sm" data-gkmiroll="1" style="width:auto">Roll from it</button>${genSel("gkMiC_0",can,can.includes(curC[0])?curC[0]:can[0],null,true)}${genSel("gkMiC_1",can,can.includes(curC[1])?curC[1]:can[1],null,true)}${genSel("gkMiS",l1,l1.includes(curS)?curS:l1[0],null,true)}<button class="btn primary sm" data-gksubapply="${id}">Choose</button></div>`;}
    const list=f.sub==="skills"?GEN_SKILL_NAMES:f.sub==="tools"?GEN_TOOLS8:GEN_INSTR10;
    const lbl=f.sub==="skills"?"three skills":f.sub==="tools"?"three artisan tools ("+genDieLabel(list.length)+")":"three instruments (d10)";
    return `<div class="gk-subrow"><span class="gk-dim">${esc(s.value)}: ${lbl}.</span>${roll}${[0,1,2].map(i=>genSel("gkFs_"+i,list,list[i],null,true)).join("")}<button class="btn primary sm" data-gksubapply="${id}">Choose</button></div>`;}
  if(id==="feature")return `<div class="gk-subrow"><span class="gk-dim">Pact of the Tome: three cantrips, any list (${genDieLabel(GEN_ALL_CANTRIPS.length)}).</span>${roll}${[0,1,2].map(i=>genSel("gkTm_"+i,GEN_ALL_CANTRIPS,GEN_ALL_CANTRIPS[i],null,true)).join("")}<button class="btn primary sm" data-gksubapply="feature">Choose</button></div>`;
  const t=genSpTable(d.sp,id.slice(3)),e=t&&t.entries.find(x=>x.value===s.value);
  if(!e||!e.sub)return "";
  return `<div class="gk-subrow"><span class="gk-dim">${esc(e.sub.label)} (${genDieLabel(e.sub.entries.length)}).</span>${roll}${genSel("gkSub_"+id.slice(3),e.sub.entries,"",null,true)}<button class="btn primary sm" data-gksubapply="${id}">Choose</button></div>`;
}
// D-015: the six abilities render as the statblock-style grid — one editable score per ability,
// no printed dice strings (the 3D roll is the theater). Cells are editable once all six landed;
// before that, "Type them in" opens the manual editor (v4 follow-up).
function genStatsRowsHTML(d,editing){
  const s=d.steps.stats,n=s&&!s.pick?s.rolls.length:0;
  const complete=!!s&&(s.pick||n===6);
  return `<div class="gk-ab6">${GEN_ABILS.map((a,i)=>{
    const rolled=s&&s.value&&s.value[i]!=null&&(s.pick||i<n);
    const next=s?(!s.pick&&n===i):i===0; // one walking Roll button, STR first
    return `<div class="gk-ab${next?" gk-ab-next":""}">
      <span class="gk-ab-k">${a.toUpperCase()}</span>
      ${rolled?`<input class="gk-ab-in" type="number" min="3" max="20" data-gkstat="${i}" value="${s.value[i]}"${complete?"":" disabled"} aria-label="${GEN_ABIL_LABEL[a]} score">`
        :next?`<button class="btn primary sm gk-ab-roll" data-gkroll="stats" aria-label="Roll ${GEN_ABIL_LABEL[a]}">${D20_ICON}<span>Roll</span></button>`
        :`<span class="gk-ab-dot">·</span>`}
    </div>`;}).join("")}</div>`
    +(!complete&&!editing?`<button class="gk-linklike gk-typein" data-gkedit="stats">Type them in</button>`:"");
}
function genTableHTML(d,id,tbl){
  if(tbl.pair)return tbl.pair.map(p=>`<div class="gk-tbl-h">${esc(p.title)}</div>`+genTableHTML(d,id,p)).join("");
  const long=tbl.rows.length>12;
  const row=r=>`<button class="gk-tr${r.hit?" gk-hit":""}" data-gkopt="${esc(String(r.value))}" data-gkstep="${id}">
      <span class="gk-td">${esc(r.span)}</span><span class="gk-tl">${esc(r.label)}${r.sub?` <span class="gk-dim">${esc(r.sub)}</span>`:""}</span></button>`;
  // D-016: the class table shows all twelve — the rollable three span-marked, the other nine
  // collapsed behind an expander (pickable once revealed).
  let more="";
  if(tbl.moreRows&&tbl.moreRows.length){
    more=`<button class="gk-tr gk-more" data-gkmore="${id}"><span class="gk-td">·</span><span class="gk-tl">${tbl.moreOpen?"Fewer options":`+ ${tbl.moreRows.length} more (pick only)`}</span></button>`
      +(tbl.moreOpen?tbl.moreRows.map(row).join(""):"");
  }
  return `<div class="gk-tbl${long?" gk-tbl-long":""}">
    ${tbl.rows.map(row).join("")}${more}
    ${tbl.note?`<div class="gk-tbl-note">${esc(tbl.note)}</div>`:""}
  </div>`;
}
// D-024: one Damaging/All toggle per roll slot, shown with the spell steps' tables.
function genTabStripHTML(d,id){
  const cls=genClsOf(d);if(!cls)return "";
  const n=id==="cantrips"?genCantripCount(d):(GEN_CLASSES[cls].caster?GEN_CLASSES[cls].caster.prepared:0);
  if(n<1)return "";
  const tabs=genStepTabs(d,id,n);
  return `<div class="gk-tabstrip">${tabs.map((t,i)=>`<span class="gk-tabslot"><span class="gk-dim">Roll ${i+1}</span>
    <button class="gk-tab${t==="dmg"?" gk-tab-on":""}" data-gktab="${id}:${i}:dmg">Damaging</button><button class="gk-tab${t==="all"?" gk-tab-on":""}" data-gktab="${id}:${i}:all">All</button></span>`).join("")}</div>`;
}
function renderGenRitual(){
  const R=_genR;if(!R)return;
  const d=R.draft,host=$("#gkR");if(!host)return;
  const order=genStepOrder(d);
  const firstOpen=order.find(id=>!genStepDone(d,id));
  const complete=!firstOpen;
  const rows=order.map(id=>{
    const s=d.steps[id],done=genStepDone(d,id),active=id===firstOpen;
    const state=done?"done":(active?"active":"idle");
    const needsSub=s&&s.value!=null&&!done&&id!=="stats";
    // D-017: the ASI step is explicit — when it goes active its editor opens on the class default
    // and waits for Apply (no self-resolving steps). Identity behaves the same.
    const editing=R.editing===id||((id==="name"||id==="asi")&&active&&!done);
    const isMulti=["skills","cantrips","spells","sundries"].includes(id)||(id==="feature"&&s&&s.kind==="expertise");
    const rollable=id!=="name"&&id!=="asi"&&!(id==="stats"&&s&&s.pick);
    const tbl=(active&&!done&&id!=="stats"&&id!=="asi")||(editing&&id!=="asi"&&id!=="name")?genStepTable(d,id):null;
    if(tbl&&!tbl.pair)tbl.moreOpen=!!R.more[id];
    // v4 follow-up: stats join the header roll like every other step — it rolls all remaining
    // abilities at once (the walking per-cell button stays for the one-at-a-time ritual).
    const wholeRoll=rollable&&(active||done)&&!needsSub;
    const info=genStepInfo(d,id);
    return `<div class="gk-step gk-${state}" data-step="${id}">
      <div class="gk-step-h"><span class="gk-step-l">${esc(genStepLabel(d,id))}${info?`<button class="gk-q" data-gkq="${id}" aria-label="How this step works">?</button>`:""}</span>
        <span class="gk-step-acts">${wholeRoll?(done
          ?`<button class="gk-roll-ico" data-gkroll="${id}"${id==="stats"?' data-gkall="1"':""} title="Reroll" aria-label="Reroll">${D20_ICON}</button>`
          :`<button class="btn primary sm gk-roll" data-gkroll="${id}"${id==="stats"?' data-gkall="1"':""}>${D20_ICON}<span>${id==="stats"?"Roll all":"Roll"}</span></button>`):""}</span></div>
      ${id==="stats"?genStatsRowsHTML(d,editing):""}
      ${id!=="stats"&&(done||s&&s.value!=null)?`<div class="gk-step-v">${genStepValueHTML(d,id)}</div>`:""}
      ${(id==="cantrips"||id==="spells")&&(tbl||editing)?genTabStripHTML(d,id):""}
      ${tbl&&!(isMulti&&editing)?genTableHTML(d,id,tbl):""}
      ${needsSub?genSubEditorHTML(d,id):""}
      ${editing&&id!=="stats"?`<div class="gk-editor${id==="name"?" gk-ed-id":""}">${genEditorHTML(d,id)}</div>`:""}
      ${editing&&id==="stats"?`<div class="gk-editor">${genEditorHTML(d,"stats")}</div>`:""}
    </div>`;
  }).join("");
  host.innerHTML=`<div class="gk-steps">${rows}</div>
    <div class="mrow gk-foot">
      <button class="btn ghost sm" id="gkCancel" style="width:auto">Cancel</button>
      ${complete?"":`<button class="btn ghost sm gk-allbtn" id="gkAll" style="width:auto">${D20_ICON}<span>Roll the rest</span></button>`}
      ${complete?`<button class="btn primary sm" id="gkFinish" style="width:auto">View the card</button>`:""}
    </div>`;
  bindGenRitual();
}
function bindGenRitual(){
  const R=_genR,d=R.draft,host=$("#gkR");
  host.querySelectorAll("[data-gkroll]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gkroll;
    if(id==="stats"&&b.dataset.gkall){
      // Header Roll all: reroll from scratch when complete, else fill the remaining abilities.
      if(genStepDone(d,"stats")||(d.steps.stats&&d.steps.stats.pick))d.steps.stats={rolls:[],value:[]};
      let st=d.steps.stats;
      while(!st||st.rolls.length<6){st=genRollStep(d,"stats");if(!st)break;}
      if(st&&st.rolls.length)genFire3D("Ability scores",
        st.rolls.map(dice=>({rolls:dice,die:6,k:d.set.stat==="4d6"?"kh3":""})),
        "Scores: "+st.value.join(" · "));
    }else if(id==="stats"){
      const st=genRollStep(d,"stats");
      if(st&&!st.pick&&st.rolls.length){
        const i=st.rolls.length-1,dice=st.rolls[i],a=GEN_ABILS[i];
        genFire3D(GEN_ABIL_LABEL[a],[{rolls:dice,die:6,k:d.set.stat==="4d6"?"kh3":""}],
          `${a.toUpperCase()}: ${st.value[i]}`,st.value[i]);
      }
    }else{
      genRollStep(d,id);
      const rec=d.steps[id];
      if(rec&&!rec.pick){
        // Per-slot dice (D-024 spell steps) replay one group per slot; single-die steps as before.
        const main=rec.dice?rec.rolls.map((r,i)=>({rolls:[r],die:rec.dice[i]})):[{rolls:rec.rolls,die:rec.die}];
        const groups=main.concat(genSubGroups(rec.sub));
        const face=rec.rolls&&rec.rolls.length===1?rec.rolls[0]:undefined;
        genFire3D(genStepLabel(d,id),groups,`${genStepLabel(d,id)}: ${rec.rolls.join(" · ")}`,face);
      }
    }
    R.editing=null;renderGenRitual();}));
  // D-017: a completed section is one big click target — tapping anywhere on it reopens the step
  // for edits; taps on its own controls keep their meaning.
  host.querySelectorAll(".gk-step.gk-done").forEach(sec=>sec.addEventListener("click",e=>{
    if(e.target.closest("button,input,select,a,[data-gkopt],[data-gkedit],[data-gkq]"))return;
    const id=sec.dataset.step;
    if(R.editing!==id){R.editing=id;renderGenRitual();}}));
  // The ? opens a real site popover (tailed, dismiss-anywhere) — not an inline line (v4 note).
  host.querySelectorAll("[data-gkq]").forEach(b=>b.addEventListener("click",e=>{
    e.stopPropagation();
    const info=genStepInfo(d,b.dataset.gkq);
    if(info)tailPopover(b,`<div class="gk-infopop">${esc(info)}</div>`);}));
  host.querySelectorAll("[data-gkmore]").forEach(b=>b.addEventListener("click",e=>{
    e.stopPropagation();const id=b.dataset.gkmore;R.more[id]=!R.more[id];renderGenRitual();}));
  // D-024: table toggles set the slot's table on the draft; an already-rolled step rerolls so the
  // landed names always come from the tables on show.
  host.querySelectorAll("[data-gktab]").forEach(b=>b.addEventListener("click",e=>{
    e.stopPropagation();
    const [id,slot,tab]=b.dataset.gktab.split(":");
    const cls=genClsOf(d);if(!cls)return;
    const n=id==="cantrips"?genCantripCount(d):(GEN_CLASSES[cls].caster?GEN_CLASSES[cls].caster.prepared:0);
    d.tabs=d.tabs||{};d.tabs[id]=genStepTabs(d,id,n);
    d.tabs[id][Number(slot)]=tab;
    const rec=d.steps[id];
    if(rec&&!rec.pick){
      genRollStep(d,id);
      const nr=d.steps[id];
      if(nr)genFire3D(genStepLabel(d,id),nr.rolls.map((r,i)=>({rolls:[r],die:nr.dice?nr.dice[i]:nr.die})),`${genStepLabel(d,id)}: ${nr.rolls.join(" · ")}`);
    }
    renderGenRitual();}));
  // Manual score edits (D-015): once all six landed, typing over any score converts the step to a
  // chosen array (the override) and cascades through the usual pick path.
  host.querySelectorAll(".gk-ab-in").forEach(inp=>{
    inp.addEventListener("click",e=>e.stopPropagation());
    inp.addEventListener("change",()=>{
      const s=d.steps.stats;if(!s||!Array.isArray(s.value)||s.value.length!==6)return;
      const vals=s.value.slice();vals[Number(inp.dataset.gkstat)]=inp.value;
      if(genApplyPick(d,"stats",vals)){R.editing=null;renderGenRitual();}
      else toast("Scores run 3 to 20.");});});
  host.querySelectorAll("[data-gkopt]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gkstep;let v=b.dataset.gkopt;
    if(id==="equip")v=Number(v);
    // Species-table values normalize inside genApplyPick (String comparison covers true/false).
    const isMulti=["skills","cantrips","spells","sundries"].includes(id)||(id==="feature"&&GEN_CLASSES[genClsOf(d)]&&GEN_CLASSES[genClsOf(d)].featureOpt&&GEN_CLASSES[genClsOf(d)].featureOpt.kind==="expertise");
    if(isMulti){R.editing=id;renderGenRitual();return;} // multi-pick steps edit through the selects
    if(genApplyPick(d,id,v)){R.editing=null;renderGenRitual();}
    else toast("That option doesn't fit here.");}));
  host.querySelectorAll("[data-gkedit]").forEach(el=>el.addEventListener("click",()=>{
    R.editing=R.editing===el.dataset.gkedit?null:el.dataset.gkedit;renderGenRitual();}));
  // Magic Initiate: the list select re-renders the spell selects; "Roll from it" keeps the
  // pick-list-roll-spells flow (cross-source dedupe included).
  {const miL=host.querySelector("#gkMiL");
   if(miL)miL.addEventListener("change",()=>{R.miList=miL.value;renderGenRitual();});}
  host.querySelectorAll("[data-gkmiroll]").forEach(b=>b.addEventListener("click",()=>{
    // The mi editor belongs to whichever feat step carries Magic Initiate right now.
    const fid=["feat","feat2"].find(x=>d.steps[x]&&d.steps[x].value==="Magic Initiate")||"feat";
    const list=$("#gkMiL").value,T=genTablesOf(d);
    const granted=[...genSpellsGranted(d,fid)];
    const cans=genRollN(Math.random,T.can[list]||GEN_CLASS_SPELLS[list][0],2,granted);
    const sp=genRollN(Math.random,T.l1[list]||GEN_CLASS_SPELLS[list][1],1,granted);
    d.steps[fid].sub={kind:"mi",list:{rolls:[],pick:true,value:list},cans,sp:{rolls:sp.rolls,value:sp.value[0]}};
    genFire3D("Magic Initiate",[cans,{rolls:sp.rolls,die:sp.die}],"");
    R.miList=null;renderGenRitual();}));
  // v4 follow-up: any auto-rolled sub element is editable on click — the chip clears the sub and
  // reopens its editor (roll or choose again).
  host.querySelectorAll("[data-gksubedit]").forEach(el=>el.addEventListener("click",e=>{
    e.stopPropagation();
    const rec=d.steps[el.dataset.gksubedit];if(!rec)return;
    rec.sub=null;R.editing=null;renderGenRitual();}));
  host.querySelectorAll("[data-gkrollsub]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gkrollsub;
    if(genRollSub(d,id)){
      const rec=d.steps[id];
      if(rec&&rec.sub)genFire3D(genStepLabel(d,id),genSubGroups(rec.sub),"");
    }
    renderGenRitual();}));
  host.querySelectorAll("[data-gksubapply]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gksubapply;
    if(id==="feat"||id==="feat2"){const f=GEN_FEATS.find(x=>x.n===d.steps[id].value);
      if(f.sub==="mi"){
        // Manual pick of all four (v4 follow-up); "Roll from it" handles the rolled path.
        const v={list:$("#gkMiL").value,cans:[$("#gkMiC_0").value,$("#gkMiC_1").value],sp:$("#gkMiS").value};
        if(v.cans[0]===v.cans[1]){toast("Two different cantrips needed.");return;}
        if(!genApplySubPick(d,id,v)){toast("Those picks don't fit that list.");return;}
        R.miList=null;renderGenRitual();return;
      }
      const v=[0,1,2].map(i=>$("#gkFs_"+i).value);
      if(new Set(v).size!==3){toast("Three different picks needed.");return;}
      if(!genApplySubPick(d,id,v)){toast("Those picks don't fit here.");return;}
      renderGenRitual();return;}
    if(id==="feature"){const v=[0,1,2].map(i=>$("#gkTm_"+i).value);
      if(new Set(v).size!==3){toast("Three different cantrips needed.");return;}
      if(!genApplySubPick(d,"feature",v)){toast("Those picks don't fit here.");return;}
      renderGenRitual();return;}
    const sel=$("#gkSub_"+id.slice(3));
    if(!genApplySubPick(d,id,sel.value)){toast("That pick doesn't fit here.");return;}
    renderGenRitual();}));
  host.querySelectorAll("[data-gkapply]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gkapply;let ok=false;
    const K=GEN_CLASSES[genClsOf(d)||"Fighter"];
    const read=(n,idp)=>Array.from({length:n},(x,i)=>$("#"+idp+i).value);
    if(id==="stats")ok=genApplyPick(d,"stats",GEN_ABILS.map(a=>$("#gkSt_"+a).value));
    else if(id==="asi"){const a2=$("#gkAsi2").value,a1=$("#gkAsi1").value;
      if(a2===a1){toast("Two different abilities needed.");return;}ok=genApplyPick(d,"asi",[a2,a1]);}
    else if(id==="skills"){const v=read(K.skills.n,"gkSk_");
      if(new Set(v).size!==v.length){toast("No duplicate skills.");return;}ok=genApplyPick(d,"skills",v);}
    else if(id==="feature"){const own=(d.steps.skills&&d.steps.skills.value)||[];
      const v=read(Math.min(2,own.length),"gkEx_");
      if(new Set(v).size!==v.length){toast("Two different skills needed.");return;}ok=genApplyPick(d,"feature",v);}
    else if(id==="cantrips"){const v=read(genCantripCount(d),"gkCn_");
      if(new Set(v).size!==v.length){toast("No duplicate cantrips.");return;}ok=genApplyPick(d,"cantrips",v);}
    else if(id==="spells"){const v=read(K.caster.prepared,"gkSp_");
      if(new Set(v).size!==v.length){toast("No duplicate spells.");return;}ok=genApplyPick(d,"spells",v);}
    else if(id==="sundries"){const v=read(2,"gkSu_");
      if(new Set(v).size!==2){toast("Two different items needed.");return;}ok=genApplyPick(d,"sundries",v);}
    else if(id==="name"){
      ok=genApplyPick(d,"name",$("#gkNm").value);
      if(!ok){toast("It needs a name.");return;}
      genApplyPick(d,"quirk",$("#gkQk").value);
      genApplyPick(d,"trinket",$("#gkTk").value);
    }
    if(!ok){toast("That choice doesn't fit here.");return;}
    R.editing=null;renderGenRitual();}));
  const all=$("#gkAll");if(all)all.addEventListener("click",()=>{genRollAll(d);R.editing=null;renderGenRitual();});
  const fin=$("#gkFinish");if(fin)fin.addEventListener("click",()=>{
    const p=genCompletePayload(d);if(!p){toast("Not finished yet.");return;}
    const v=validateGenPayload(p);if(!v.ok){toast("Something is off with this roll ("+v.err+").");return;}
    const ch=deriveGenChar(v.clean);
    $("#gkR").innerHTML=`<div id="gkFinCard"></div>
      <div class="mrow"><button class="btn ghost sm" id="gkBack" style="width:auto">Back to the rolls</button>
      <button class="btn primary sm" id="gkSave" style="width:auto">${R.mode==="dm"?"Add to the crew":"Join the crew"}</button></div>`;
    genMountCard($("#gkFinCard"),ch,{pn:R.pn||"",pips:"off"},{});
    $("#gkBack").addEventListener("click",renderGenRitual);
    $("#gkSave").addEventListener("click",()=>{R.done(v.clean);});});
  const cancel=$("#gkCancel");if(cancel)cancel.addEventListener("click",()=>{_genR=null;closeModal();});
}
function openGenRitual(ctx){
  const set=ctx.set,ritual=ctx.spMode==="ritual";
  _genR={mode:ctx.mode,pn:ctx.pn||"",editing:null,more:{},
    draft:genNewDraft({sp:ctx.sp,spMode:ctx.spMode,set,counts:ctx.counts||{},tables:ctx.tables||null}),done:ctx.done};
  openModalRaw(`<h3 style="margin-bottom:4px">Roll a ${ritual?"character":esc(GEN_SPECIES[ctx.sp].label.toLowerCase())}</h3>
    <p class="hint" style="margin:0 0 10px">${esc(set.stat)} scores, ${set.mode==="chaos"?"chaos class":"plausible class"}, ASI ${set.asi?"on":"off"}. Roll each step, or tap an option to choose it. Tap any result to change it.</p>
    <div id="gkR"></div>`);
  const m=$("#modal");if(m)m.classList.add("gk-host");
  renderGenRitual();
}
function openGenRitualDM(a){
  openGenRitual({sp:a.crew.sp,spMode:a.crew.spMode,set:a.crew.set,counts:genCrewCounts(a),tables:genSpellTables(),mode:"dm",done:payload=>{
    const pc=genIngestPayload(a,payload,"",null);
    _genR=null;closeModal();
    if(pc){toast(esc(pc.name)+" joins the crew.",2200,true);preserveScroll(".adv-detail-body",renderAdvDetail);}
  }});
}

// ═══════════════════════════════════════════════════════════════════════════
// CREW IN THE ROSTER (D-021) — no separate section. The party-roster header carries a settings
// button (openCrewSettings modal: config + the player link); the roster's primary action rolls a
// character; generated members are ordinary party rows that open the statblock modal. All that
// remains here is the fallen list under the roster.
// ═══════════════════════════════════════════════════════════════════════════
function renderCrewPanel(a){
  const box=$("#crewWrap");if(!box)return;
  if(!a.crew){box.innerHTML="";crewStopPoll();return;}
  crewEnsurePoll(a);
  const fallen=a.crew.fallen||[];
  if(!fallen.length){box.innerHTML="";return;}
  const fallenRows=fallen.map((f,i)=>`<div class="gk-fallen-row">
      <span class="gk-fallen-n">${esc(f.name)}${f.cls?` <span class="gk-dim">${esc(f.cls)}</span>`:""}${f.pn?` <span class="gk-pn">${esc(f.pn)}</span>`:""}</span>
      ${f.payload?`<button class="gk-linklike" data-gkfallen="${i}">card</button>`:""}
    </div>`).join("");
  box.innerHTML=`<div class="gk-fallen"><div class="gk-fallen-h">Caduti · ${fallen.length}</div>${fallenRows}</div>`;
  box.querySelectorAll("[data-gkfallen]").forEach(b=>b.addEventListener("click",()=>{
    const f=a.crew.fallen[Number(b.dataset.gkfallen)];if(!f||!f.payload)return;
    openGenCard(a,f.payload,{dead:true,pn:f.pn||""});}));
}
// The crew settings modal (D-021, slimmed in the v4 round): species, scores, class mode,
// background ASI. The player link lives in its own share dialog now.
function openCrewSettings(a){
  if(!a.crew)return;
  const draw=()=>{
    const sp=GEN_SPECIES[a.crew.sp],spOpts=Object.keys(GEN_SPECIES),ritual=a.crew.spMode==="ritual";
    openModalRaw(`<h3>Crew generator</h3>
    <div class="gk-cfg gk-cfg-modal">
      <label class="gk-f"><span>Species</span>${genSel("crewSpMode",["locked","ritual"],ritual?"ritual":"locked",["One species for the crew","Rolled in the ritual"])}</label>
      ${ritual?"":`<label class="gk-f"><span>Which</span>${spOpts.length>1?genSel("crewSp",spOpts,a.crew.sp,spOpts.map(k=>GEN_SPECIES[k].label)):`<span class="gk-static">${esc(sp.label)}</span>`}</label>`}
      <label class="gk-f"><span>Scores</span>${genSel("crewStat",["3d6","4d6"],a.crew.set.stat,["3d6, in order","4d6 drop lowest"])}</label>
      <label class="gk-f"><span>Class</span>${genSel("crewMode",["plausible","chaos"],a.crew.set.mode,["Plausible (best fits)","Chaos (any)"])}</label>
      <label class="gk-f"><span>Background ASI</span>${genSel("crewAsi",["on","off"],a.crew.set.asi?"on":"off",["+2 / +1","Off"])}</label>
    </div>
    <div class="mrow"><button class="btn ghost sm" id="crewCfgClose" style="width:auto">Close</button></div>`);
    const sel=(id,fn)=>{const el=$(id);if(el)el.addEventListener("change",()=>{fn(el.value);saveAdv();crewPushConfig(a);});};
    sel("#crewSpMode",v=>{a.crew.spMode=v==="ritual"?"ritual":"locked";draw();});
    sel("#crewSp",v=>{if(GEN_SPECIES[v])a.crew.sp=v;});
    sel("#crewStat",v=>{a.crew.set.stat=v==="4d6"?"4d6":"3d6";});
    sel("#crewMode",v=>{a.crew.set.mode=v==="chaos"?"chaos":"plausible";});
    sel("#crewAsi",v=>{a.crew.set.asi=v==="on";});
    $("#crewCfgClose").addEventListener("click",()=>{closeModal();preserveScroll(".adv-detail-body",renderAdvDetail);});
  };
  draw();
}
// The crew share dialog (v4 round): mirrors the combat share modal — primer + create when off,
// live link with Copy/QR and a low-key stop when on.
function openCrewShareDialog(a){
  if(!a.crew)return;
  const draw=()=>{
    const sp=GEN_SPECIES[a.crew.sp];
    if(!a.crew.shareId){
      openModalRaw(`<h3>Share the crew</h3>
        <div class="share-dlg">
          <p class="share-sub">Players roll their own ${esc(sp.label.toLowerCase())}s from their phones and land straight in this adventure's party.</p>
          <div class="mrow"><button class="btn primary sm" id="crewShareStart" style="width:auto">Create the player link</button></div>
        </div>`);
      $("#crewShareStart").addEventListener("click",async()=>{
        const b=$("#crewShareStart");b.disabled=true;b.textContent="Creating…";
        await crewMintShare(a);
        if(a.crew.shareId){draw();preserveScroll(".adv-detail-body",renderAdvDetail);}
        else{b.disabled=false;b.textContent="Create the player link";}});
      return;
    }
    const url=genCrewUrl(a.crew.shareId);
    openModalRaw(`<h3 class="share-h">Crew link is live<span class="share-badge">Live</span></h3>
      <div class="share-dlg">
        <p class="share-sub">Players open the link to roll and keep their characters.</p>
        <div class="share-link"><input type="text" id="crewUrl" class="popinput" readonly value="${esc(url)}"><button class="btn ghost sm" id="crewCopy" title="Copy link" style="width:auto">${COPY_ICON}<span>Copy</span></button><button class="btn ghost sm" id="crewQR" title="Show QR code" style="width:auto">${QR_ICON}<span>QR</span></button></div>
        <button class="share-stop" id="crewStop">Stop the link</button>
      </div>`);
    $("#crewCopy").addEventListener("click",()=>{const inp=$("#crewUrl");inp.select();
      const done=()=>{const s=$("#crewCopy").querySelector("span");s.textContent="Copied";setTimeout(()=>{s.textContent="Copy";},1500);};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(inp.value).then(done,()=>{try{document.execCommand("copy");done();}catch(_){}});
      else{try{document.execCommand("copy");done();}catch(_){}}});
    $("#crewQR").addEventListener("click",()=>openShareQR(url));
    $("#crewStop").addEventListener("click",()=>confirmModal("Stop the player link? Phones lose access until you create a new one.",async()=>{
      const id=a.crew.shareId;a.crew.shareId="";saveAdv();draw();
      preserveScroll(".adv-detail-body",renderAdvDetail);await jbinDeletePublic(id);}));
  };
  draw();
}
// Config under /cfg (never clobbers the phones' /crew subtree). Carries the resolved spell tables
// so phones roll over the same lists the DM's library produces (D-012).
function crewShareCfg(a){
  const cfg={name:advDName(a),sp:a.crew.sp,spMode:a.crew.spMode||"locked",set:{...a.crew.set},tables:genSpellTables()};
  // D-030: uploaded packs ride the cfg so phones can roll and derive them (curated packs ship
  // in-code). Phones SANITIZE these at ingestion like every other cloud-read field.
  const need=a.crew.spMode==="ritual"?genSpeciesPool():[a.crew.sp];
  const up={};need.forEach(k=>{if(!GEN_SPECIES_SHIPPED.has(k)&&GEN_SPECIES[k])up[k]=GEN_SPECIES[k];});
  if(Object.keys(up).length)cfg.species=up;
  return cfg;
}
// Reference texts under /refs (D-019): trimmed spell/condition entries for every name the
// generator can reach, so player cards get the same tap-for-text popovers the DM has. Written by
// the DM at mint + config pushes; phones read it once at boot and SANITIZE it at ingestion (the
// share is world-writable, so refs are untrusted data like everything else on it).
function crewShareRefs(a){
  const t=genSpellTables();
  const names=new Set(GEN_ALL_CANTRIPS);
  Object.keys(GEN_CLASS_SPELLS).forEach(cls=>{
    (t.can[cls]||[]).forEach(n=>names.add(n));(t.l1[cls]||[]).forEach(n=>names.add(n));
    const K=GEN_CLASSES[cls];if(K.caster&&K.caster.always)K.caster.always.forEach(n=>names.add(n));});
  (GEN_SPECIES[a.crew.sp].tables||[]).forEach(tb=>tb.entries.forEach(e=>{
    if(e.sub&&e.sub.kind==="cantrip")e.sub.entries.forEach(n=>names.add(n));}));
  const cap=(s,n)=>String(s==null?"":s).slice(0,n);
  const spells=[...names].map(n=>typeof findSpell==="function"?findSpell(n):null).filter(Boolean)
    .map(s=>({name:cap(s.name,60),level:Number(s.level)||0,school:cap(s.school,24),
      castingTime:cap(s.castingTime,60),range:cap(s.range,60),components:cap(s.components,80),
      duration:cap(s.duration,60),text:cap(s.text,1400),_source:cap(s._source||s.source,12)}));
  const conds=(typeof enConditions==="function"?enConditions():[])
    .map(c=>({name:cap(c.name,40),category:cap(c.category,24),text:cap(c.text,1400),_source:cap(c._source,12)}));
  return {spells,conds};
}
async function crewMintShare(a){
  const id=await jbinSetPublic(null,{v:1,kind:"crew",cfg:crewShareCfg(a),refs:crewShareRefs(a)});
  if(!id){toast("Cloud unreachable. Try again in a moment.");return;}
  a.crew.shareId=id;saveAdv();renderCrewPanel(a);
}
async function crewPushConfig(a){
  if(!a.crew||!a.crew.shareId)return;
  await jbinFetch(`${FB_BASE}/shares/${a.crew.shareId}/cfg.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(crewShareCfg(a))});
  await jbinFetch(`${FB_BASE}/shares/${a.crew.shareId}/refs.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(crewShareRefs(a))});
}

// ═══════════════════════════════════════════════════════════════════════════
// CREW MODE — the player's phone (index.html?crew=<id>). Same isolation stance as player mode.
// ═══════════════════════════════════════════════════════════════════════════
let CREW_MODE=false,_crew=null;
function crewPid(){let p=null;try{p=localStorage.getItem("mf_crewpid");}catch(e){}
  if(!p){p=randToken();try{localStorage.setItem("mf_crewpid",p);}catch(e){}}return p;}
function crewMsg(title,body){
  $("#crewRoot").innerHTML=`<div class="crew-msg"><h2>${esc(title)}</h2><p>${esc(body)}</p></div>`;
}
// Sanitize cloud refs at ingestion (the crew share is world-writable): whitelisted keys only,
// angle brackets stripped, lengths capped. Anything else is dropped.
function crewCleanRefs(raw){
  if(!raw||typeof raw!=="object")return null;
  const clean=(v,n)=>String(v==null?"":v).replace(/[<>]/g,"").slice(0,n);
  const sp=Array.isArray(raw.spells)?raw.spells.filter(s=>s&&s.name).slice(0,400).map(s=>({
    name:clean(s.name,60),level:Math.max(0,Math.min(9,Math.round(Number(s.level))||0)),
    school:clean(s.school,24),castingTime:clean(s.castingTime,60),range:clean(s.range,60),
    components:clean(s.components,80),duration:clean(s.duration,60),text:clean(s.text,1400),
    _source:clean(s._source,12)})):[];
  const cd=Array.isArray(raw.conds)?raw.conds.filter(c=>c&&c.name).slice(0,60).map(c=>({
    name:clean(c.name,40),category:clean(c.category,24),text:clean(c.text,1400),
    _source:clean(c._source,12)})):[];
  return {spells:sp,conds:cd};
}
// D-030: uploaded species packs arrive on the cfg — world-writable share, so they are HOSTILE data.
// Rebuild each pack strictly: whitelisted fields, closed vocabularies, capped lengths and counts.
// Anything that doesn't fit is dropped (a pack that fails entirely just doesn't register).
function crewCleanSpeciesPack(key,raw){
  try{
    if(!raw||typeof raw!=="object")return null;
    const DT=["Acid","Bludgeoning","Cold","Fire","Force","Lightning","Necrotic","Piercing","Poison","Psychic","Radiant","Slashing","Thunder"];
    const str=(v,n)=>String(v==null?"":v).replace(/[<>]/g,"").slice(0,n);
    const int=(v,lo,hi,dflt)=>{const n=Math.round(Number(v));return Number.isFinite(n)&&n>=lo&&n<=hi?n:dflt;};
    const kSlug=str(key,48).replace(/[^a-z0-9_-]/gi,"");
    if(!kSlug||!/^u_/.test(kSlug))return null; // uploaded namespace only — shipped keys can't be shadowed
    const cast=c=>{if(!c||typeof c!=="object")return null;
      const abil=["int","wis","cha","mental"].includes(c.abil)?c.abil:"mental";
      const o={label:str(c.label,40)||"Species magic",abil};
      if(c.cantrip)o.cantrip=c.cantrip==="sub"?"sub":str(c.cantrip,40);
      if(c.spell)o.spell=str(c.spell,40);
      if(c.freq)o.freq=str(c.freq,60);
      return (o.cantrip||o.spell)?o:null;};
    const resDecl=r=>{if(!r||typeof r!=="object")return null;
      const per=r.per==="Short Rest"?"Short Rest":"Long Rest";
      const max=int(r.max,1,9,null);if(max==null)return null;
      return {k:str(r.k,16).replace(/[^a-z0-9-]/gi,"")||"use",label:str(r.label,48)||"Uses",max,per};};
    const entryText=t=>t&&t.n?{n:str(t.n,80),t:str(t.t,700)}:null;
    const fxClean=f=>{if(!f||typeof f!=="object")return undefined;
      const o={};
      ["trait","bonus","action"].forEach(k=>{const e=entryText(f[k]);if(e)o[k]=e;});
      if(f.skillSub===true)o.skillSub=true;
      if(f.cast){const cs=[].concat(f.cast).map(cast).filter(Boolean).slice(0,4);if(cs.length)o.cast=cs.length===1?cs[0]:cs;}
      if(f.resist)o.resist=f.resist==="sub"?"sub":(DT.includes(f.resist)?f.resist:undefined);
      if(o.resist===undefined)delete o.resist;
      if(f.size&&["Tiny","Small","Medium","Large"].includes(f.size))o.size=f.size;
      if(f.fly)o.fly=int(f.fly,5,90,0)||undefined;
      if(f.speed)o.speed=int(f.speed,5,120,0)||undefined;
      if(f.darkvision)o.darkvision=int(f.darkvision,10,300,0)||undefined;
      const rd=resDecl(f.res);if(rd)o.res=rd;
      return Object.keys(o).length?o:undefined;};
    const pack={key:kSlug,label:str(raw.label,40)||"Species",
      size:["Tiny","Small","Medium","Large"].includes(raw.size)?raw.size:"Medium",
      speed:int(raw.speed,5,120,30),darkvision:int(raw.darkvision,0,300,0),
      langs:(Array.isArray(raw.langs)?raw.langs:["Common"]).filter(l=>typeof l==="string").slice(0,6).map(l=>str(l,30)).filter(Boolean),
      traits:(Array.isArray(raw.traits)?raw.traits:[]).map(entryText).filter(Boolean).slice(0,12),
      bonus:(Array.isArray(raw.bonus)?raw.bonus:[]).map(entryText).filter(Boolean).slice(0,8),
      actions:(Array.isArray(raw.actions)?raw.actions:[]).map(entryText).filter(Boolean).slice(0,6),
      res:(Array.isArray(raw.res)?raw.res:[]).map(resDecl).filter(Boolean).slice(0,6),
      casts:(Array.isArray(raw.casts)?raw.casts:[]).map(cast).filter(Boolean).slice(0,4),
      resists:(Array.isArray(raw.resists)?raw.resists:[]).filter(x=>DT.includes(x)).slice(0,4),
      tables:[]};
    if(!pack.langs.length)pack.langs=["Common"];
    if(raw.hpPerLevel)pack.hpPerLevel=int(raw.hpPerLevel,1,2,0)||undefined;
    if(pack.hpPerLevel===undefined)delete pack.hpPerLevel;
    if(raw.extraFeat===true)pack.extraFeat=true;
    (Array.isArray(raw.tables)?raw.tables:[]).slice(0,3).forEach(t=>{
      if(!t||typeof t!=="object")return;
      const id=str(t.id,24).replace(/[^a-z0-9-]/gi,"");if(!id)return;
      const label=str(t.label,40)||id;
      if(t.kind==="skill"){
        const entries=(Array.isArray(t.entries)?t.entries:[]).filter(n=>GEN_SKILL_ABIL[n]).slice(0,18);
        if(entries.length>=2)pack.tables.push({id,label,kind:"skill",entries});
        return;}
      const die=int(t.die,2,100,null);if(!die)return;
      const entries=[];let ok=true,expect=1;
      (Array.isArray(t.entries)?t.entries:[]).slice(0,13).forEach(e=>{
        if(!ok||!e||typeof e!=="object"){ok=false;return;}
        const lo=int(e.lo,1,die,null),hi=int(e.hi,1,die,null);
        if(lo==null||hi==null||lo!==expect||hi<lo){ok=false;return;}
        expect=hi+1;
        const val=typeof e.value==="boolean"?e.value:str(e.value,24).replace(/[^a-z0-9-]/gi,"");
        const ent={lo,hi,label:str(e.label,60)||String(val),value:val};
        const fx=fxClean(e.fx);if(fx)ent.fx=fx;
        if(e.sub&&typeof e.sub==="object"){
          const sEntries=(Array.isArray(e.sub.entries)?e.sub.entries:[]).map(x=>str(x,40)).filter(Boolean).slice(0,24);
          const sKind=e.sub.kind==="skill"||e.sub.kind==="cantrip"?e.sub.kind:undefined;
          if(sEntries.length>=2)ent.sub={id:str(e.sub.id,24)||"sub",label:str(e.sub.label,40)||"Choice",
            die:int(e.sub.die,2,100,sEntries.length),entries:sEntries,...(sKind?{kind:sKind}:{})};
        }
        entries.push(ent);});
      if(ok&&expect===die+1&&entries.length)pack.tables.push({id,label,die,entries});
    });
    return pack;
  }catch(e){return null;}
}
// Register the cfg's sanitized uploaded packs on the phone realm (shipped packs never shadowed).
function crewApplySpecies(cfg){
  if(!cfg||!cfg.species||typeof cfg.species!=="object")return;
  Object.keys(cfg.species).slice(0,40).forEach(k=>{
    const p=crewCleanSpeciesPack(k,cfg.species[k]);
    if(p&&!GEN_SPECIES_SHIPPED.has(p.key))GEN_SPECIES[p.key]=p;
  });
}
async function initCrewMode(id){
  CREW_MODE=true;
  document.body.classList.add("crew-mode");
  const root=document.createElement("div");root.id="crewRoot";document.body.appendChild(root);
  state.settings=state.settings||{};
  state.settings.colorCode=state.settings.colorCode||{on:true};
  state.settings.clickRoll=state.settings.clickRoll||{on:true};
  let pn="";try{pn=localStorage.getItem("mf_crewpn")||"";}catch(e){}
  _crew={id:String(id),node:null,pid:crewPid(),pn};
  const node=await jbinReadBin(_crew.id);
  if(!node||node.kind!=="crew"||!node.cfg){crewMsg("This crew link is not active","Ask your DM for a fresh link, or check the connection and reload.");return;}
  _crew.node=node;
  crewApplySpecies(node.cfg); // D-030: uploaded species packs, sanitized, phone-side
  // D-019: seed the reference stores from the share's sanitized refs so the card's spell and
  // condition links pop the same texts the DM sees. Crew mode never persists these.
  const refs=crewCleanRefs(node.refs);
  if(refs){state.spells=refs.spells;state.conditions=refs.conds;}
  renderCrewScreen();
  // The poll reads only the light /crew subtree (mates + payloads); cfg is re-read on
  // focus/visibility, and refs only at boot — they are the heavy part of the node.
  const refresh=async()=>{
    const c=await jbinFetch(`${FB_BASE}/shares/${_crew.id}/crew.json`);
    if(c&&c.ok){try{_crew.node.crew=(await c.json())||{};}catch(e){}
      // Don't rebuild under the player's caret (the notes box) or mid-ritual.
      if(!document.querySelector("#gkR")&&!crewTyping())renderCrewScreen();}};
  const refreshCfg=async()=>{
    const r=await jbinFetch(`${FB_BASE}/shares/${_crew.id}/cfg.json`);
    if(r&&r.ok){try{const cfg=await r.json();if(cfg){_crew.node.cfg=cfg;crewApplySpecies(cfg);}}catch(e){}}};
  setInterval(refresh,12000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){refresh();refreshCfg();}});
}
function crewMyRec(){const c=_crew.node&&_crew.node.crew;return (c&&c[_crew.pid])||null;}
function crewTyping(){const a=document.activeElement;return !!(a&&a.id==="crewNotes");}
function crewResGet(payloadId){try{return JSON.parse(localStorage.getItem("mf_crewres:"+payloadId)||"{}");}catch(e){return {};}}
function crewResSet(payloadId,k,used){try{const o=crewResGet(payloadId);o[k]=used;localStorage.setItem("mf_crewres:"+payloadId,JSON.stringify(o));}catch(e){}}
function crewGearGet(payloadId){try{return localStorage.getItem("mf_crewgear:"+payloadId);}catch(e){return null;}}
function crewGearSet(payloadId,s){try{if(s==null)localStorage.removeItem("mf_crewgear:"+payloadId);else localStorage.setItem("mf_crewgear:"+payloadId,String(s).slice(0,400));}catch(e){}}
// B286 / D-029 — HP is per-device like the pips, and ALSO reported to the DM (two clamped numbers
// plus a stamp, written to this device's own `crew/<pid>/hp` leaf so nothing else is clobbered).
// Notes stay on the phone: free text never goes on the wire.
function crewHpGet(payloadId){try{const o=JSON.parse(localStorage.getItem("mf_crewhp:"+payloadId)||"null");return (o&&typeof o==="object")?o:null;}catch(e){return null;}}
function crewHpSet(payloadId,s){try{localStorage.setItem("mf_crewhp:"+payloadId,JSON.stringify({cur:s.cur,tmp:s.tmp}));}catch(e){}}
function crewNoteGet(payloadId){try{return localStorage.getItem("mf_crewnote:"+payloadId)||"";}catch(e){return "";}}
function crewNoteSet(payloadId,s){try{localStorage.setItem("mf_crewnote:"+payloadId,String(s||"").slice(0,2000));}catch(e){}}
let _crewHpT=null;
function crewPushHp(s){
  if(!_crew||!_crew.id||!_crew.pid)return;
  if(_crewHpT)clearTimeout(_crewHpT);
  _crewHpT=setTimeout(()=>{_crewHpT=null;
    jbinFetch(`${FB_BASE}/shares/${_crew.id}/crew/${_crew.pid}/hp.json`,
      {method:"PUT",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({cur:s.cur,tmp:s.tmp,at:Date.now()})});},700);
}
function renderCrewScreen(){
  const root=$("#crewRoot");if(!root||!_crew.node)return;
  const cfg=_crew.node.cfg,sp=GEN_SPECIES[cfg.sp]?cfg.sp:"kobold";
  const my=crewMyRec();
  const others=Object.entries(_crew.node.crew||{}).filter(([pid])=>pid!==_crew.pid);
  const deathsTotal=Object.values(_crew.node.crew||{}).reduce((s,r)=>s+(Number(r&&r.deaths)||0),0);
  const crewRows=others.map(([pid,r])=>{
    if(!r)return "";
    const cls=r.cur&&r.cur.steps&&r.cur.steps.cls?r.cur.steps.cls.value:"?";
    const nm=r.cur&&r.cur.steps&&r.cur.steps.name?r.cur.steps.name.value:"—";
    return `<div class="crew-mate"><b>${esc(String(nm))}</b> <span class="gk-dim">${esc(String(cls))}</span>${r.pn?` <span class="gk-pn">${esc(String(r.pn))}</span>`:""}${Number(r.deaths)?` <span class="crew-deaths">deaths: ${Number(r.deaths)}</span>`:""}</div>`;
  }).join("");
  let main="";
  if(!_crew.pn){
    main=`<div class="crew-claim"><p>Enter your name to join the crew.</p>
      <input type="text" id="crewPn" class="popinput" maxlength="24" placeholder="Your name">
      <button class="btn primary" id="crewJoin">Join</button></div>`;
  }else if(my&&my.cur){
    const v=validateGenPayload(my.cur);
    if(v.ok){const ch=deriveGenChar(v.clean);
      main=`<div id="crewCard"></div>
        <label class="f gk-noterow">Notes<textarea id="crewNotes" maxlength="2000" placeholder="Anything worth remembering about ${esc(ch.name)}">${esc(crewNoteGet(v.clean.id))}</textarea></label>
        <button class="btn ghost crew-die" id="crewDied">Mark ${esc(ch.name)} dead and roll the next one</button>`;
    }else main=`<p class="gk-dim">Your character data can't be read. Roll a fresh one.</p><button class="btn primary" id="crewRollBtn">Roll your ${esc(crewRollNoun(cfg,sp))}</button>`;
  }else{
    main=`<div class="crew-claim"><p>No ${esc(crewRollNoun(cfg,sp))} yet, ${esc(_crew.pn)}.</p>
      <button class="btn primary" id="crewRollBtn">Roll your ${esc(crewRollNoun(cfg,sp))}</button></div>`;
  }
  root.innerHTML=`<div class="crew-wrap">
    <div class="crew-head"><div class="crew-title">${esc(cfg.name||"The crew")}</div>
      <div class="crew-subtitle">${cfg.spMode==="ritual"?"Crew":esc(GEN_SPECIES[sp].label)+" crew"}${deathsTotal?` · fallen so far: ${deathsTotal}`:""}${_crew.pn?` · you: <b>${esc(_crew.pn)}</b> <button class="gk-linklike" id="crewRename">change</button>`:""}</div></div>
    ${main}
    ${crewRows?`<div class="crew-mates"><div class="crew-mates-h">The rest of the crew</div>${crewRows}</div>`:""}
  </div>`;
  bindCrewScreen(sp,cfg,my);
}
function bindCrewScreen(sp,cfg,my){
  if(my&&my.cur){const v=validateGenPayload(my.cur);
    if(v.ok){const ch=deriveGenChar(v.clean);
      const host=$("#crewCard");
      if(host)genMountCard(host,ch,{pn:_crew.pn,res:crewResGet(v.clean.id),pips:"live",
          hp:crewHpGet(v.clean.id)||{cur:ch.hp,tmp:0},hpEdit:true},
        {onRes:(k,used)=>crewResSet(v.clean.id,k,used),
         hpGet:()=>crewHpGet(v.clean.id)||{cur:ch.hp,tmp:0},
         onHp:s=>{crewHpSet(v.clean.id,s);crewPushHp(s);},
         gearGet:()=>{const g=crewGearGet(v.clean.id);return g!=null?g:ch.gear;},
         gearDirty:()=>crewGearGet(v.clean.id)!=null,
         onGear:s=>crewGearSet(v.clean.id,s)});
      const nt=$("#crewNotes");
      if(nt){let t=null;const save=()=>crewNoteSet(v.clean.id,nt.value);
        nt.addEventListener("input",()=>{if(t)clearTimeout(t);t=setTimeout(save,400);});
        nt.addEventListener("change",save);}}}
  const join=$("#crewJoin");
  if(join)join.addEventListener("click",()=>{
    const v=String($("#crewPn").value||"").replace(/[<>]/g,"").trim().slice(0,24);
    if(!v){toast("A name is required.");return;}
    _crew.pn=v;try{localStorage.setItem("mf_crewpn",v);}catch(e){}
    renderCrewScreen();});
  const rename=$("#crewRename");
  if(rename)rename.addEventListener("click",()=>{_crew.pn="";renderCrewScreen();});
  const roll=$("#crewRollBtn");
  if(roll)roll.addEventListener("click",()=>crewOpenRitual(sp,cfg,false));
  const died=$("#crewDied");
  if(died)died.addEventListener("click",()=>confirmModal(`Rolling a new ${esc(crewRollNoun(cfg,sp))} marks this one as dead for the whole crew. Continue?`,()=>crewOpenRitual(sp,cfg,true)));
}
// D-031/D-023 (as amended): species-driven copy when the crew is locked to one, plain "character"
// when the species rides the ritual.
function crewRollNoun(cfg,sp){return cfg&&cfg.spMode==="ritual"?"character":GEN_SPECIES[sp].label.toLowerCase();}
function crewCounts(){
  const c={};Object.values(_crew.node.crew||{}).forEach(r=>{
    const cls=r&&r.cur&&r.cur.steps&&r.cur.steps.cls?r.cur.steps.cls.value:null;
    if(cls)c[cls]=(c[cls]||0)+1;});
  return c;
}
function crewOpenRitual(sp,cfg,isReplacement){
  openGenRitual({sp,spMode:cfg.spMode==="ritual"?"ritual":"locked",set:cfg.set||{},counts:crewCounts(),tables:cfg.tables||null,mode:"crew",pn:_crew.pn,done:async payload=>{
    const prev=crewMyRec();
    const rec={pn:_crew.pn,deaths:(prev&&Number(prev.deaths)||0)+(isReplacement&&prev&&prev.cur?1:0),cur:payload};
    const r=await jbinFetch(`${FB_BASE}/shares/${_crew.id}/crew/${_crew.pid}.json`,
      {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(rec)});
    if(!r||!r.ok){toast("Cloud unreachable. Tap the button again in a moment.");return;}
    _crew.node.crew=_crew.node.crew||{};_crew.node.crew[_crew.pid]=rec;
    _genR=null;closeModal();renderCrewScreen();
    toast(esc(payload.steps.name.value)+" joins the crew.",2400,true);
  }});
}

// B286 / D-029 — the phone's HP report, read back DM-side. The share is world-writable, so this is
// hostile input like everything else under /crew: two numbers and a stamp, clamped, nothing else.
function crewCleanHp(raw,max){
  if(!raw||typeof raw!=="object")return null;
  const cur=Number(raw.cur);if(!Number.isFinite(cur))return null;
  const cap=Number.isFinite(Number(max))&&Number(max)>0?Math.round(Number(max)):9999;
  const tmp=Number(raw.tmp),at=Number(raw.at);
  return {cur:Math.max(0,Math.min(Math.round(cur),cap)),
    tmp:Math.max(0,Math.min(Number.isFinite(tmp)?Math.round(tmp):0,999)),
    at:Number.isFinite(at)?at:0};
}
// Apply a crew member's reported HP to their roster PC + any live combat instance. The stamp makes
// it idempotent: a report already applied never re-lands on top of the DM's own later edit.
function crewApplyHp(a,pid,rec){
  if(!rec||!rec.hp)return false;
  const pc=state.roster.find(r=>r.gen&&r.gen.pid===pid&&(a.party||[]).includes(r.id));
  if(!pc)return false;
  const max=Number(charFieldVal(pc,"hp"));
  const hp=crewCleanHp(rec.hp,max);
  if(!hp)return false;
  const prev=pc.gen.hp;
  if(prev&&Number(pc.gen.hpAt||0)>=hp.at&&prev.cur===hp.cur&&prev.tmp===hp.tmp)return false;
  if(Number(pc.gen.hpAt||0)>hp.at)return false;
  pc.gen.hp={cur:hp.cur,tmp:hp.tmp};pc.gen.hpAt=hp.at;
  (a.encounters||[]).forEach(e=>{
    const cb=e.combat;if(!cb||!cb.order)return;
    cb.order.forEach(it=>{if(it.kind==="pc"&&it.srcId===pc.id){
      it.hpCur=it.hpMax!=null?Math.min(hp.cur,it.hpMax):hp.cur;it.hpTemp=hp.tmp;}});
  });
  return true;
}
// ── DM-side crew sync: poll the share node while the adventure's panel is live ──
let _crewPoll=null;
function crewEnsurePoll(a){
  if(!a.crew||!a.crew.shareId){crewStopPoll();return;}
  if(_crewPoll&&_crewPoll.advId===a.id)return;
  crewStopPoll();
  const advId=a.id;
  const tick=async()=>{
    const adv=state.adv.find(x=>x.id===advId);
    if(!adv||!adv.crew||!adv.crew.shareId){crewStopPoll();return;}
    const node=await jbinReadBin(adv.crew.shareId);
    if(!node||!node.crew)return;
    let changed=false,hpChanged=false;
    for(const [pid,rec] of Object.entries(node.crew)){
      if(!rec||!rec.cur)continue;
      const key="p:"+String(pid).slice(0,24);
      const pn=String(rec.pn||"").replace(/[<>]/g,"").slice(0,24);
      if(genIngestPayload(adv,rec.cur,pn,key))changed=true;
      if(crewApplyHp(adv,key,rec)){changed=true;hpChanged=true;}
    }
    if(changed){saveRoster();saveAdv();}
    if(changed&&state.selAdv===advId&&$("#crewWrap"))preserveScroll(".adv-detail-body",renderAdvDetail);
    // Reported HP only matters if the DM is looking at the fight — repaint the tracker too (B286).
    if(hpChanged&&_curView==="combat"&&typeof renderCombat==="function")renderCombat();
  };
  _crewPoll={advId,timer:setInterval(tick,12000)};
  tick();
}
function crewStopPoll(){if(_crewPoll){clearInterval(_crewPoll.timer);_crewPoll=null;}}
