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
// A one-face span reads as the bare number (3), never a degenerate range (3-3). Reroll tables
// are one face per row by construction, so this covers them too.
function genSpanText(span,i){const lo=span.spans[i][0],hi=span.spans[i][1];return lo===hi?String(lo):lo+"-"+hi;}
// The die a span actually rolls on — genDieFor's answer parts company with it at 3 and 5 options,
// so anything describing a rendered table must quote this, not the bare next-size-up die.
function genSpanDie(span,n){return "d"+span.die+(span.reroll?" (reroll over "+n+")":"");}
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
      {id:"wings",label:"Draconic Boon",die:20,boon:true,entries:[
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
// w: {n, ability ("dex" marks finesse/ranged use), dice, dtype, kind, reach/range, mastery?, note?,
//     gp} — `gp` is the XPHB list price, the unit the D-038 gold budget counts in. The full XPHB
// weapon table is modelled, firearms included: a Musket at 500 gp simply can't be afforded under
// any class budget, so it only ever surfaces with the budget switched off.
const GEN_W={
  greataxe:{n:"Greataxe",ability:"str",dice:"1d12",dtype:"Slashing",kind:"Melee",mastery:"Cleave",gp:30},
  greatsword:{n:"Greatsword",ability:"str",dice:"2d6",dtype:"Slashing",kind:"Melee",mastery:"Graze",gp:50},
  maul:{n:"Maul",ability:"str",dice:"2d6",dtype:"Bludgeoning",kind:"Melee",mastery:"Topple",gp:10},
  halberd:{n:"Halberd",ability:"str",dice:"1d10",dtype:"Slashing",kind:"Melee",reach:10,mastery:"Cleave",gp:20},
  glaive:{n:"Glaive",ability:"str",dice:"1d10",dtype:"Slashing",kind:"Melee",reach:10,mastery:"Graze",gp:20},
  pike:{n:"Pike",ability:"str",dice:"1d10",dtype:"Piercing",kind:"Melee",reach:10,mastery:"Push",gp:5},
  lance:{n:"Lance",ability:"str",dice:"1d10",dtype:"Piercing",kind:"Melee",reach:10,mastery:"Topple",gp:10,note:"Heavy; two-handed unless mounted"},
  longsword:{n:"Longsword",ability:"str",dice:"1d8",dtype:"Slashing",kind:"Melee",mastery:"Sap",note:"1d10 two-handed",gp:15},
  warhammer:{n:"Warhammer",ability:"str",dice:"1d8",dtype:"Bludgeoning",kind:"Melee",mastery:"Push",note:"1d10 two-handed",gp:15},
  warpick:{n:"War Pick",ability:"str",dice:"1d8",dtype:"Piercing",kind:"Melee",mastery:"Sap",note:"1d10 two-handed",gp:5},
  morningstar:{n:"Morningstar",ability:"str",dice:"1d8",dtype:"Piercing",kind:"Melee",mastery:"Sap",gp:15},
  flail:{n:"Flail",ability:"str",dice:"1d8",dtype:"Bludgeoning",kind:"Melee",mastery:"Sap",gp:10},
  battleaxe:{n:"Battleaxe",ability:"str",dice:"1d8",dtype:"Slashing",kind:"Melee",mastery:"Topple",note:"1d10 two-handed",gp:10},
  trident:{n:"Trident",ability:"str",dice:"1d8",dtype:"Piercing",kind:"Melee or Ranged",range:"20/60",mastery:"Topple",note:"1d10 two-handed",gp:5},
  rapier:{n:"Rapier",ability:"dex",dice:"1d8",dtype:"Piercing",kind:"Melee",mastery:"Vex",gp:25},
  scimitar:{n:"Scimitar",ability:"dex",dice:"1d6",dtype:"Slashing",kind:"Melee",mastery:"Nick",gp:25},
  shortsword:{n:"Shortsword",ability:"dex",dice:"1d6",dtype:"Piercing",kind:"Melee",mastery:"Vex",gp:10},
  whip:{n:"Whip",ability:"dex",dice:"1d4",dtype:"Slashing",kind:"Melee",reach:10,mastery:"Slow",gp:2},
  spear:{n:"Spear",ability:"str",dice:"1d6",dtype:"Piercing",kind:"Melee or Ranged",range:"20/60",mastery:"Sap",note:"1d8 two-handed",gp:1},
  dagger:{n:"Dagger",ability:"dex",dice:"1d4",dtype:"Piercing",kind:"Melee or Ranged",range:"20/60",mastery:"Nick",gp:2},
  handaxe:{n:"Handaxe",ability:"str",dice:"1d6",dtype:"Slashing",kind:"Melee or Ranged",range:"20/60",mastery:"Vex",gp:5},
  lighthammer:{n:"Light Hammer",ability:"str",dice:"1d4",dtype:"Bludgeoning",kind:"Melee or Ranged",range:"20/60",mastery:"Nick",gp:2},
  javelin:{n:"Javelin",ability:"str",dice:"1d6",dtype:"Piercing",kind:"Melee or Ranged",range:"30/120",mastery:"Slow",gp:0.5},
  mace:{n:"Mace",ability:"str",dice:"1d6",dtype:"Bludgeoning",kind:"Melee",mastery:"Sap",gp:5},
  quarterstaff:{n:"Quarterstaff",ability:"str",dice:"1d6",dtype:"Bludgeoning",kind:"Melee",mastery:"Topple",note:"1d8 two-handed",gp:0.2},
  greatclub:{n:"Greatclub",ability:"str",dice:"1d8",dtype:"Bludgeoning",kind:"Melee",mastery:"Push",gp:0.2},
  sickle:{n:"Sickle",ability:"str",dice:"1d4",dtype:"Slashing",kind:"Melee",mastery:"Nick",gp:1},
  club:{n:"Club",ability:"str",dice:"1d4",dtype:"Bludgeoning",kind:"Melee",mastery:"Slow",gp:0.1},
  unarmed:{n:"Unarmed Strike",ability:"dex",dice:"1d6",dtype:"Bludgeoning",kind:"Melee",note:"Martial Arts",gp:0},
  longbow:{n:"Longbow",ability:"dex",dice:"1d8",dtype:"Piercing",kind:"Ranged",range:"150/600",mastery:"Slow",gp:50},
  shortbow:{n:"Shortbow",ability:"dex",dice:"1d6",dtype:"Piercing",kind:"Ranged",range:"80/320",mastery:"Vex",gp:25},
  lightxbow:{n:"Light Crossbow",ability:"dex",dice:"1d8",dtype:"Piercing",kind:"Ranged",range:"80/320",mastery:"Slow",gp:25},
  heavyxbow:{n:"Heavy Crossbow",ability:"dex",dice:"1d10",dtype:"Piercing",kind:"Ranged",range:"100/400",mastery:"Push",gp:50},
  handxbow:{n:"Hand Crossbow",ability:"dex",dice:"1d6",dtype:"Piercing",kind:"Ranged",range:"30/120",mastery:"Vex",gp:75},
  blowgun:{n:"Blowgun",ability:"dex",dice:"1",dtype:"Piercing",kind:"Ranged",range:"25/100",mastery:"Vex",gp:10},
  musket:{n:"Musket",ability:"dex",dice:"1d12",dtype:"Piercing",kind:"Ranged",range:"40/120",mastery:"Slow",gp:500,note:"Loading; two-handed"},
  pistol:{n:"Pistol",ability:"dex",dice:"1d10",dtype:"Piercing",kind:"Ranged",range:"30/90",mastery:"Vex",gp:250,note:"Loading"},
  sling:{n:"Sling",ability:"dex",dice:"1d4",dtype:"Bludgeoning",kind:"Ranged",range:"30/120",mastery:"Slow",gp:0.1},
  dart:{n:"Dart",ability:"dex",dice:"1d4",dtype:"Piercing",kind:"Ranged",range:"20/60",mastery:"Vex",gp:0.05}
};
// AC recipes: {kind:"none"|"armor"|"fixed"|"unarmored-con"|"unarmored-wis", base, dex, dexMax,
// shield, label, gp, stealth?, str?/alt?}. `gp` includes the Shield (10 gp) on the shield variants.
// The whole XPHB armor table is modelled; Breastplate upward is priced out of every class budget,
// so heavy plate only reaches a kit when the DM turns the budget off or raises it a long way.
const GEN_AC={
  none:{kind:"none",w:"none",label:"Unarmored",gp:0},
  padded:{kind:"armor",w:"light",base:11,dex:true,label:"Padded Armor",gp:5,stealth:true},
  leather:{kind:"armor",w:"light",base:11,dex:true,label:"Leather Armor",gp:10},
  leatherShield:{kind:"armor",w:"light",base:11,dex:true,shield:true,label:"Leather Armor, Shield",gp:20},
  studded:{kind:"armor",w:"light",base:12,dex:true,label:"Studded Leather",gp:45},
  studdedShield:{kind:"armor",w:"light",base:12,dex:true,shield:true,label:"Studded Leather, Shield",gp:55},
  hide:{kind:"armor",w:"medium",base:12,dex:true,dexMax:2,label:"Hide Armor",gp:10},
  hideShield:{kind:"armor",w:"medium",base:12,dex:true,dexMax:2,shield:true,label:"Hide Armor, Shield",gp:20},
  chainShirt:{kind:"armor",w:"medium",base:13,dex:true,dexMax:2,label:"Chain Shirt",gp:50},
  chainShirtShield:{kind:"armor",w:"medium",base:13,dex:true,dexMax:2,shield:true,label:"Chain Shirt, Shield",gp:60},
  scale:{kind:"armor",w:"medium",base:14,dex:true,dexMax:2,label:"Scale Mail",gp:50,stealth:true},
  scaleShield:{kind:"armor",w:"medium",base:14,dex:true,dexMax:2,shield:true,label:"Scale Mail, Shield",gp:60,stealth:true},
  breastplate:{kind:"armor",w:"medium",base:14,dex:true,dexMax:2,label:"Breastplate",gp:400},
  halfPlate:{kind:"armor",w:"medium",base:15,dex:true,dexMax:2,label:"Half Plate Armor",gp:750,stealth:true},
  ringMail:{kind:"fixed",w:"heavy",base:14,label:"Ring Mail",gp:30,stealth:true},
  ringMailShield:{kind:"fixed",w:"heavy",base:14,shield:true,label:"Ring Mail, Shield",gp:40,stealth:true},
  chainMail:{kind:"fixed",w:"heavy",base:16,label:"Chain Mail",gp:75,stealth:true,str:13,alt:"chainShirt"},
  chainMailShield:{kind:"fixed",w:"heavy",base:16,shield:true,label:"Chain Mail, Shield",gp:85,stealth:true,str:13,alt:"chainShirtShield"},
  splint:{kind:"fixed",w:"heavy",base:17,label:"Splint Armor",gp:200,stealth:true,str:15,alt:"ringMail"},
  plate:{kind:"fixed",w:"heavy",base:18,label:"Plate Armor",gp:1500,stealth:true,str:15,alt:"splint"},
  unarmCon:{kind:"unarmored-con",w:"none",label:"Unarmored Defense",gp:0},
  unarmConShield:{kind:"unarmored-con",w:"none",shield:true,label:"Unarmored Defense, Shield",gp:10},
  unarmWis:{kind:"unarmored-wis",w:"none",label:"Unarmored Defense",gp:0}
};

// ── Class packages v2 (D-013): kits, feature options, spells config ──────────
// {hd, saves, prim, sec, skills:{from,n}, kits:[{n, ac, tags?, needs?, weapons:[{w, count?,
//  noMastery?}], gear}], traits/bonus (statblock sections), res, caster:{abil, cantrips:N,
//  prepared:N, slots, short?, always?:[names]},
//  featureOpt:{label, kind?, options:[{label, value, t, hooks?, fits?}]}, tools, langs}
// D-037: a kit answers to the class feature option twice over. `needs:"<hook>"` UNLOCKS it (the
// option grants the training the kit assumes); the option's `fits` NARROWS the table to the kits
// whose `tags` match the tactic it rolled. An option with no `fits` keeps the whole table — three
// Fighting Styles genuinely don't dictate gear, and inventing a tie for them would be noise.
// Kit weapons reference GEN_W keys; masteries print only for classes with the Weapon Mastery
// feature (masteries:N caps how many kit weapons carry the tag).
const GEN_CLASS_LIST=["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"]; // d12, alphabetical
const GEN_CLASSES={
  Barbarian:{hd:12,gp:75,saves:["str","con"],prim:"str",sec:"con",masteries:2,
    skills:{from:["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"],n:2},
    kits:[
      // Rage forbids Heavy armor, so the armored kits stop at Medium; taking any armor trades
      // Unarmored Defense away, which is the choice the kit is offering.
      {n:"Greataxe and handaxes",ac:"unarmCon",tags:["twohand","thrown"],weapons:[{w:"greataxe"},{w:"handaxe",count:4},{w:"dagger",count:2}],gear:"Greataxe, 4 Handaxes, 2 Daggers"},
      {n:"Maul and javelins",ac:"unarmCon",tags:["twohand","thrown"],weapons:[{w:"maul"},{w:"javelin",count:4},{w:"sling"}],gear:"Maul, 4 Javelins, Sling, 20 Bullets"},
      {n:"Twin handaxes",ac:"unarmCon",tags:["dual","thrown"],weapons:[{w:"handaxe",count:2},{w:"dagger",count:2}],gear:"2 Handaxes, 2 Daggers"},
      {n:"Greatsword and daggers",ac:"unarmCon",tags:["twohand"],weapons:[{w:"greatsword"},{w:"dagger",count:2}],gear:"Greatsword, 2 Daggers"},
      {n:"Halberd and shortbow",ac:"unarmCon",tags:["twohand","ranged"],weapons:[{w:"halberd"},{w:"shortbow"}],gear:"Halberd, Shortbow, 20 Arrows"},
      {n:"Spear and shield",ac:"unarmConShield",tags:["onehand","thrown"],weapons:[{w:"spear"},{w:"javelin",count:3},{w:"dagger"}],gear:"Shield, Spear, 3 Javelins, Dagger"},
      {n:"Greatclub and javelins",ac:"hide",tags:["twohand","thrown"],weapons:[{w:"greatclub"},{w:"javelin",count:4},{w:"dagger"}],gear:"Hide Armor, Greatclub, 4 Javelins, Dagger"},
      {n:"Pike and sling",ac:"studded",tags:["twohand","thrown","ranged"],weapons:[{w:"pike"},{w:"handaxe",count:2},{w:"sling"}],gear:"Studded Leather, Pike, 2 Handaxes, Sling, 20 Bullets"},
      {n:"Battleaxe and shield",ac:"scaleShield",tags:["onehand"],weapons:[{w:"battleaxe"},{w:"dagger",count:2}],gear:"Scale Mail, Shield, Battleaxe, 2 Daggers"},
      {n:"Flail and shield",ac:"chainShirtShield",tags:["onehand","ranged"],weapons:[{w:"flail"},{w:"shortbow"}],gear:"Chain Shirt, Shield, Flail, Shortbow, 20 Arrows"},
      {n:"Twin scimitars",ac:"leather",tags:["dual","finesse"],weapons:[{w:"scimitar",count:2},{w:"handaxe"}],gear:"Leather Armor, 2 Scimitars, Handaxe"}],
    traits:[{n:"Unarmored Defense",t:"AC equals 10 + Dex modifier + Con modifier while the barbarian isn't wearing armor (a Shield is allowed)."}],
    bonus:[{n:"Rage (2/Long Rest)",t:"While not wearing Heavy armor: +2 bonus to damage with Strength-based weapon attacks, Resistance to Bludgeoning, Piercing, and Slashing damage, and Advantage on Strength checks and Strength saving throws. Lasts 10 minutes while the barbarian attacks a foe or takes damage each round. One use returns on a Short Rest, all of them on a Long Rest."}],
    res:[{k:"rage",label:"Rage",max:2,per:"Long Rest",sr:1}]},
  Bard:{hd:8,gp:90,saves:["dex","cha"],prim:"cha",sec:"dex",
    skills:{from:GEN_SKILL_NAMES,n:3},
    kits:[
      // Bards train in Light armor only, so the variety is padded/leather/studded plus which
      // instrument the kit is built around (each one a real XPHB instrument at its real price).
      {n:"Daggers and a lute",ac:"leather",tags:["dual","finesse","thrown"],weapons:[{w:"dagger",count:2}],gear:"Leather Armor, 2 Daggers, Lute",gpExtra:35},
      {n:"Spear and a drum",ac:"padded",tags:["onehand","thrown"],weapons:[{w:"spear"},{w:"dagger"}],gear:"Padded Armor, Spear, Dagger, Drum",gpExtra:6},
      {n:"Light crossbow and a flute",ac:"leather",tags:["ranged"],weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Leather Armor, Light Crossbow, 20 Bolts, Dagger, Flute",gpExtra:2},
      {n:"Quarterstaff and a lyre",ac:"studded",tags:["twohand"],weapons:[{w:"quarterstaff"},{w:"dagger"}],gear:"Studded Leather, Quarterstaff, Dagger, Lyre",gpExtra:30},
      {n:"Greatclub and a horn",ac:"padded",tags:["twohand","ranged"],weapons:[{w:"greatclub"},{w:"sling"}],gear:"Padded Armor, Greatclub, Sling, 20 Bullets, Horn",gpExtra:3},
      {n:"Rapier and a pan flute",ac:"studded",tags:["onehand","finesse"],weapons:[{w:"rapier"},{w:"dagger"}],gear:"Studded Leather, Rapier, Dagger, Pan Flute",gpExtra:12},
      {n:"Shortsword and bagpipes",ac:"leather",tags:["onehand","finesse","ranged"],weapons:[{w:"shortsword"},{w:"handxbow"}],gear:"Leather Armor, Shortsword, Hand Crossbow, 20 Bolts, Bagpipes",gpExtra:30},
      {n:"Hand crossbow and a viol",ac:"studded",tags:["ranged"],weapons:[{w:"handxbow"},{w:"dagger"}],gear:"Studded Leather, Hand Crossbow, 20 Bolts, Dagger, Viol",gpExtra:30}],
    traits:[],
    bonus:[{n:"Bardic Inspiration (d6)",t:"One creature within 60 feet that can hear the bard gains a d6 it can add to one d20 Test within the next hour. Uses per Long Rest equal the bard's Charisma modifier (minimum 1)."}],
    res:[{k:"insp",label:"Bardic Inspiration",max:"chaMin1",per:"Long Rest"}],
    caster:{abil:"cha",cantrips:2,prepared:4,slots:2}},
  Cleric:{hd:8,gp:110,saves:["wis","cha"],prim:"wis",sec:"con",
    skills:{from:["History","Insight","Medicine","Persuasion","Religion"],n:2},
    kits:[
      // The holy symbol is named per kit (amulet / emblem / reliquary, all 5 gp in XPHB).
      {n:"Mace and shield",ac:"chainShirtShield",tags:["onehand","ranged"],weapons:[{w:"mace"},{w:"lightxbow"}],gear:"Chain Shirt, Shield, Mace, Light Crossbow, 20 Bolts, Holy Symbol (amulet)"},
      {n:"Crossbow and mace",ac:"chainShirt",tags:["ranged","onehand"],weapons:[{w:"lightxbow"},{w:"mace"}],gear:"Chain Shirt, Light Crossbow, 20 Bolts, Mace, Holy Symbol (emblem)"},
      {n:"Quarterstaff and shield",ac:"leatherShield",tags:["onehand","ranged"],weapons:[{w:"quarterstaff"},{w:"sling"}],gear:"Leather Armor, Shield, Quarterstaff, Sling, 20 Bullets, Holy Symbol (reliquary)"},
      {n:"Spear and crossbow",ac:"scaleShield",tags:["onehand","thrown","ranged"],weapons:[{w:"spear"},{w:"lightxbow"}],gear:"Scale Mail, Shield, Spear, Light Crossbow, 20 Bolts, Holy Symbol (amulet)"},
      {n:"Greatclub and sling",ac:"hide",tags:["twohand","ranged"],weapons:[{w:"greatclub"},{w:"sling"}],gear:"Hide Armor, Greatclub, Sling, 20 Bullets, Holy Symbol (emblem)"},
      {n:"Sickle and darts",ac:"studdedShield",tags:["onehand","ranged"],weapons:[{w:"sickle"},{w:"dart",count:3}],gear:"Studded Leather, Shield, Sickle, 3 Darts, Holy Symbol (reliquary)"},
      // Protector variants: the order's Martial weapon and Heavy armor training is what unlocks
      // these four, and it's the only way a cleric reaches a martial weapon or heavy plate.
      {n:"Warhammer and shield",ac:"scaleShield",needs:"martialTrained",tags:["onehand","ranged"],weapons:[{w:"warhammer",noMastery:true},{w:"lightxbow",noMastery:true}],gear:"Scale Mail, Shield, Warhammer, Light Crossbow, 20 Bolts, Holy Symbol (amulet)"},
      {n:"Ring mail and morningstar",ac:"ringMailShield",needs:"martialTrained",tags:["onehand","thrown"],weapons:[{w:"morningstar",noMastery:true},{w:"lighthammer",count:2,noMastery:true},{w:"dagger",noMastery:true}],gear:"Ring Mail, Shield, Morningstar, 2 Light Hammers, Dagger, Holy Symbol (emblem)"},
      {n:"Chain mail and battleaxe",ac:"chainMail",needs:"martialTrained",tags:["onehand","ranged"],weapons:[{w:"battleaxe",noMastery:true},{w:"lightxbow",noMastery:true}],gear:"Chain Mail, Battleaxe, Light Crossbow, 20 Bolts, Holy Symbol (reliquary)"},
      {n:"Chain mail and halberd",ac:"chainMail",needs:"martialTrained",tags:["twohand"],weapons:[{w:"halberd",noMastery:true},{w:"dagger",noMastery:true}],gear:"Chain Mail, Halberd, Dagger, Holy Symbol (amulet)"}],
    traits:[],bonus:[],
    featureOpt:{label:"Divine Order",options:[
      {label:"Protector",value:"protector",t:"Divine Order: Protector. Trained for battle — proficient with Martial weapons and Heavy armor.",hooks:{martialTrained:true}},
      {label:"Thaumaturge",value:"thaumaturge",t:"Divine Order: Thaumaturge. One extra Cleric cantrip; add the Wisdom modifier (minimum +1) to Intelligence (Arcana or Religion) checks.",hooks:{extraCantrip:true}}]},
    caster:{abil:"wis",cantrips:3,prepared:4,slots:2}},
  Druid:{hd:8,gp:50,saves:["int","wis"],prim:"wis",sec:"con",
    skills:{from:["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"],n:2},
    kits:[
      // The Druidic Focus is named per kit (XPHB offers sprig of mistletoe, wooden staff, yew
      // wand and totem), and the Herbalism Kit rides only the kits actually built around it.
      {n:"Sickle and shield",ac:"leatherShield",tags:["onehand","ranged"],weapons:[{w:"sickle"},{w:"sling"}],gear:"Leather Armor, Shield, Sickle, Sling, 20 Bullets, Druidic Focus (sprig of mistletoe), Herbalism Kit",gpExtra:5},
      {n:"Spear and totem",ac:"padded",tags:["onehand","thrown"],weapons:[{w:"spear"},{w:"dagger"}],gear:"Padded Armor, Spear, Dagger, Druidic Focus (totem)"},
      {n:"Sling and staff",ac:"leather",tags:["twohand","ranged"],weapons:[{w:"sling"},{w:"quarterstaff"}],gear:"Leather Armor, Sling, 20 Bullets, Druidic Focus (wooden staff), Herbalism Kit",gpExtra:5},
      {n:"Club and shield",ac:"leatherShield",tags:["onehand","ranged"],weapons:[{w:"club"},{w:"sling"}],gear:"Leather Armor, Shield, Club, Sling, 20 Bullets, Druidic Focus (yew wand)"},
      {n:"Greatclub and darts",ac:"studded",tags:["twohand","ranged"],weapons:[{w:"greatclub"},{w:"dart",count:4}],gear:"Studded Leather, Greatclub, 4 Darts, Druidic Focus (sprig of mistletoe), Herbalism Kit",gpExtra:5},
      // Warden-only: the order's Martial weapon and Medium armor training is what makes these legal.
      {n:"Warden's battleaxe",ac:"hideShield",needs:"martialTrained",tags:["onehand","thrown"],weapons:[{w:"battleaxe",noMastery:true},{w:"handaxe",count:2,noMastery:true},{w:"dagger",noMastery:true}],gear:"Hide Armor, Shield, Battleaxe, 2 Handaxes, Dagger, Druidic Focus (totem)"},
      {n:"Warden's scimitar",ac:"scaleShield",needs:"martialTrained",tags:["onehand","finesse"],weapons:[{w:"scimitar",noMastery:true},{w:"dagger",count:2,noMastery:true}],gear:"Scale Mail, Shield, Scimitar, 2 Daggers, Druidic Focus (wooden staff), Herbalism Kit",gpExtra:5}],
    traits:[{n:"Druidic",t:"The druid knows Druidic and always has Speak with Animals prepared."}],
    bonus:[],langs:["Druidic"],
    featureOpt:{label:"Primal Order",options:[
      {label:"Magician",value:"magician",t:"Primal Order: Magician. One extra Druid cantrip; add the Wisdom modifier (minimum +1) to Intelligence (Arcana or Nature) checks.",hooks:{extraCantrip:true}},
      {label:"Warden",value:"warden",t:"Primal Order: Warden. Trained for battle — proficient with Martial weapons and Medium armor.",hooks:{martialTrained:true}}]},
    caster:{abil:"wis",cantrips:2,prepared:4,slots:2,always:["Speak with Animals"]}},
  Fighter:{hd:10,gp:155,saves:["str","con"],prim:["str","dex"],sec:"con",masteries:3,
    skills:{from:["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Persuasion","Perception","Survival"],n:2},
    kits:[
      {n:"Sword and shield",ac:"chainMailShield",tags:["onehand","thrown"],weapons:[{w:"longsword"},{w:"javelin",count:4},{w:"dagger"}],gear:"Chain Mail, Shield, Longsword, 4 Javelins, Dagger"},
      {n:"Greatsword",ac:"scale",tags:["twohand","thrown"],weapons:[{w:"greatsword"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Scale Mail, Greatsword, 2 Handaxes, Dagger"},
      {n:"Archer",ac:"studded",tags:["ranged","finesse"],weapons:[{w:"longbow"},{w:"shortsword"}],gear:"Studded Leather, Longbow, 20 Arrows, Shortsword"},
      {n:"Two scimitars",ac:"leather",tags:["dual","finesse"],weapons:[{w:"scimitar",count:2},{w:"dagger"}],gear:"Leather Armor, 2 Scimitars, Dagger"},
      {n:"Polearm",ac:"chainMail",tags:["twohand","thrown"],weapons:[{w:"halberd"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Chain Mail, Halberd, 2 Handaxes, Dagger"},
      {n:"Crossbow and shield",ac:"chainShirtShield",tags:["ranged","onehand"],weapons:[{w:"lightxbow"},{w:"mace"},{w:"dagger"}],gear:"Chain Shirt, Shield, Light Crossbow, 20 Bolts, Mace, Dagger"},
      {n:"Warhammer and shield",ac:"ringMailShield",tags:["onehand","thrown"],weapons:[{w:"warhammer"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Ring Mail, Shield, Warhammer, 2 Handaxes, Dagger"},
      {n:"Duelist",ac:"chainShirt",tags:["onehand","finesse"],weapons:[{w:"rapier"},{w:"dagger",count:2}],gear:"Chain Shirt, Rapier, 2 Daggers"},
      {n:"Twin shortswords",ac:"studded",tags:["dual","finesse"],weapons:[{w:"shortsword",count:2},{w:"dagger",count:2}],gear:"Studded Leather, 2 Shortswords, 2 Daggers"},
      {n:"Twin handaxes",ac:"hide",tags:["dual","thrown"],weapons:[{w:"handaxe",count:2},{w:"javelin",count:3},{w:"dagger"}],gear:"Hide Armor, 2 Handaxes, 3 Javelins, Dagger"},
      {n:"Heavy crossbow",ac:"chainShirt",tags:["ranged","finesse"],weapons:[{w:"heavyxbow"},{w:"shortsword"}],gear:"Chain Shirt, Heavy Crossbow, 20 Bolts, Shortsword"},
      {n:"Greataxe",ac:"chainMail",tags:["twohand","thrown"],weapons:[{w:"greataxe"},{w:"javelin",count:3},{w:"dagger"}],gear:"Chain Mail, Greataxe, 3 Javelins, Dagger"},
      {n:"Glaive",ac:"scale",tags:["twohand","thrown"],weapons:[{w:"glaive"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Scale Mail, Glaive, 2 Handaxes, Dagger"},
      {n:"Pike wall",ac:"ringMail",tags:["twohand","thrown","ranged"],weapons:[{w:"pike"},{w:"javelin",count:3},{w:"sling"}],gear:"Ring Mail, Pike, 3 Javelins, Sling, 20 Bullets"},
      {n:"Morningstar and shield",ac:"hideShield",tags:["onehand","thrown"],weapons:[{w:"morningstar"},{w:"lighthammer",count:2},{w:"dagger"}],gear:"Hide Armor, Shield, Morningstar, 2 Light Hammers, Dagger"},
      {n:"War pick and shield",ac:"chainShirtShield",tags:["onehand","thrown"],weapons:[{w:"warpick"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Chain Shirt, Shield, War Pick, 2 Handaxes, Dagger"},
      {n:"Whip and shield",ac:"leatherShield",tags:["onehand","finesse"],weapons:[{w:"whip"},{w:"shortsword"}],gear:"Leather Armor, Shield, Whip, Shortsword"},
      // The four below are priced far past every class budget (D-038): they only reach the table
      // with the gold budget switched off, or raised a very long way.
      {n:"Half plate duelist",ac:"halfPlate",tags:["onehand","finesse"],weapons:[{w:"rapier"},{w:"dagger",count:2}],gear:"Half Plate Armor, Rapier, 2 Daggers"},
      {n:"Plate and greatsword",ac:"plate",tags:["twohand"],weapons:[{w:"greatsword"},{w:"dagger"}],gear:"Plate Armor, Greatsword, Dagger"},
      {n:"Musketeer",ac:"studded",tags:["ranged","finesse"],weapons:[{w:"musket"},{w:"rapier"}],gear:"Studded Leather, Musket, 20 Bullets, Rapier"},
      {n:"Pistolier",ac:"breastplate",tags:["ranged","onehand","finesse"],weapons:[{w:"pistol"},{w:"rapier"}],gear:"Breastplate, Pistol, 20 Bullets, Rapier"}],
    traits:[],
    bonus:[{n:"Second Wind (2 uses)",t:"The fighter regains 1d10 + 1 Hit Points. One use returns on a Short Rest, all of them on a Long Rest."}],
    res:[{k:"wind",label:"Second Wind",max:2,per:"Long Rest",sr:1}],
    featureOpt:{label:"Fighting Style",options:[
      {label:"Archery",value:"Archery",t:"Fighting Style: Archery. +2 bonus to attack rolls with Ranged weapons (counted).",hooks:{rangedAtk:2},fits:["ranged"]},
      {label:"Blind Fighting",value:"Blind Fighting",t:"Fighting Style: Blind Fighting. Blindsight within 10 feet.",fits:["shield","onehand","twohand","dual"]},
      {label:"Defense",value:"Defense",t:"Fighting Style: Defense. +1 AC while wearing armor (counted).",hooks:{acArmor:1}},
      {label:"Dueling",value:"Dueling",t:"Fighting Style: Dueling. +2 damage with a Melee weapon held in one hand and no other weapons.",fits:["onehand"]},
      {label:"Great Weapon Fighting",value:"Great Weapon Fighting",t:"Fighting Style: Great Weapon Fighting. Treat 1s and 2s on damage dice as 3s with two-handed Melee weapons.",fits:["twohand"]},
      {label:"Interception",value:"Interception",t:"Fighting Style: Interception. Reaction: reduce damage to a creature within 5 feet by 1d10 + 2 (needs Shield or weapon in hand)."},
      {label:"Protection",value:"Protection",t:"Fighting Style: Protection. Reaction while holding a Shield: impose Disadvantage on an attack against a creature within 5 feet.",fits:["shield"]},
      {label:"Thrown Weapon Fighting",value:"Thrown Weapon Fighting",t:"Fighting Style: Thrown Weapon Fighting. +2 damage with thrown weapon attacks.",fits:["thrown"]},
      {label:"Two-Weapon Fighting",value:"Two-Weapon Fighting",t:"Fighting Style: Two-Weapon Fighting. Add the ability modifier to the damage of the extra (Light-weapon) attack.",fits:["dual"]},
      {label:"Unarmed Fighting",value:"Unarmed Fighting",t:"Fighting Style: Unarmed Fighting. Unarmed Strikes deal 1d6 + Str (1d8 with both hands free); 1d4 to grappled creatures at the start of turns."}]}},
  Monk:{hd:8,gp:50,saves:["str","dex"],prim:"dex",sec:"wis",
    skills:{from:["Acrobatics","Athletics","History","Insight","Religion","Stealth"],n:2},
    kits:[
      // Monks train in no armor at all, so the variety is entirely in the weapons: Simple ones
      // plus the Light Martial melee that counts as a Monk weapon.
      {n:"Spear and daggers",ac:"unarmWis",tags:["onehand","thrown"],weapons:[{w:"unarmed"},{w:"spear"},{w:"dagger",count:5}],gear:"Spear, 5 Daggers"},
      {n:"Shortsword and darts",ac:"unarmWis",tags:["onehand","finesse","ranged"],weapons:[{w:"unarmed"},{w:"shortsword"},{w:"dart",count:6}],gear:"Shortsword, 6 Darts"},
      {n:"Staff and sling",ac:"unarmWis",tags:["twohand","ranged"],weapons:[{w:"unarmed"},{w:"quarterstaff"},{w:"sling"}],gear:"Quarterstaff, Sling, 20 Bullets"},
      {n:"Handaxes and darts",ac:"unarmWis",tags:["dual","thrown","ranged"],weapons:[{w:"unarmed"},{w:"handaxe",count:2},{w:"dart",count:4}],gear:"2 Handaxes, 4 Darts"},
      {n:"Light hammers and staff",ac:"unarmWis",tags:["dual","thrown","ranged"],weapons:[{w:"unarmed"},{w:"lighthammer",count:2},{w:"quarterstaff"},{w:"dart",count:3}],gear:"2 Light Hammers, Quarterstaff, 3 Darts"},
      {n:"Twin scimitars",ac:"unarmWis",tags:["dual","finesse"],weapons:[{w:"unarmed"},{w:"scimitar",count:2}],gear:"2 Scimitars"},
      {n:"Sickles and darts",ac:"unarmWis",tags:["dual","ranged"],weapons:[{w:"unarmed"},{w:"sickle",count:2},{w:"dart",count:4}],gear:"2 Sickles, 4 Darts"},
      {n:"Club and shortbow",ac:"unarmWis",tags:["onehand","ranged"],weapons:[{w:"unarmed"},{w:"club"},{w:"shortbow"}],gear:"Club, Shortbow, 20 Arrows"}],
    traits:[{n:"Martial Arts (d6)",t:"Unarmed Strikes and Monk weapons (Simple Melee, plus Light Martial Melee) deal 1d6 and can use Dexterity."},
            {n:"Unarmored Defense",t:"AC equals 10 + Dex modifier + Wis modifier while wearing no armor and no Shield."}],
    bonus:[{n:"Bonus Unarmed Strike",t:"The monk makes one Unarmed Strike as a Bonus Action."}]},
  Paladin:{hd:10,gp:150,saves:["wis","cha"],prim:"str",sec:"cha",masteries:2,
    skills:{from:["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"],n:2},
    kits:[
      {n:"Longsword and shield",ac:"chainMailShield",tags:["onehand","thrown"],weapons:[{w:"longsword"},{w:"javelin",count:6},{w:"dagger"}],gear:"Chain Mail, Shield, Longsword, 6 Javelins, Dagger, Holy Symbol (amulet)"},
      {n:"Greatsword",ac:"scale",tags:["twohand","thrown"],weapons:[{w:"greatsword"},{w:"javelin",count:3},{w:"dagger"}],gear:"Scale Mail, Greatsword, 3 Javelins, Dagger, Holy Symbol (emblem)"},
      {n:"Warhammer and shield",ac:"ringMailShield",tags:["onehand","thrown"],weapons:[{w:"warhammer"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Ring Mail, Shield, Warhammer, 2 Handaxes, Dagger, Holy Symbol (reliquary)"},
      {n:"Flail and shield",ac:"scaleShield",tags:["onehand","ranged"],weapons:[{w:"flail"},{w:"javelin",count:4},{w:"sling"}],gear:"Scale Mail, Shield, Flail, 4 Javelins, Sling, 20 Bullets, Holy Symbol (amulet)"},
      {n:"Halberd",ac:"chainMail",tags:["twohand","thrown"],weapons:[{w:"halberd"},{w:"javelin",count:3},{w:"dagger"}],gear:"Chain Mail, Halberd, 3 Javelins, Dagger, Holy Symbol (emblem)"},
      {n:"Battleaxe and shield",ac:"chainShirtShield",tags:["onehand","thrown"],weapons:[{w:"battleaxe"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Chain Shirt, Shield, Battleaxe, 2 Handaxes, Dagger, Holy Symbol (reliquary)"},
      {n:"Lance and shield",ac:"chainMailShield",tags:["onehand","thrown"],weapons:[{w:"lance"},{w:"javelin",count:3},{w:"dagger"}],gear:"Chain Mail, Shield, Lance, 3 Javelins, Dagger, Holy Symbol (amulet)"},
      {n:"Ring mail and pike",ac:"ringMail",tags:["twohand","ranged"],weapons:[{w:"pike"},{w:"javelin",count:4},{w:"lightxbow"}],gear:"Ring Mail, Pike, 4 Javelins, Light Crossbow, 20 Bolts, Holy Symbol (emblem)"},
      // Both priced past the paladin's purse (D-038/D-040) — budget-off kits.
      {n:"Breastplate and glaive",ac:"breastplate",tags:["twohand","thrown"],weapons:[{w:"glaive"},{w:"handaxe",count:2},{w:"dagger"}],gear:"Breastplate, Glaive, 2 Handaxes, Dagger, Holy Symbol (reliquary)"},
      {n:"Splint and morningstar",ac:"splint",tags:["onehand","ranged"],weapons:[{w:"morningstar"},{w:"javelin",count:4},{w:"handxbow"}],gear:"Splint Armor, Morningstar, 4 Javelins, Hand Crossbow, 20 Bolts, Holy Symbol (amulet)"}],
    traits:[],
    bonus:[{n:"Lay on Hands (5 HP pool)",t:"The paladin touches a creature and restores any number of Hit Points remaining in the pool. The pool refills on a Long Rest."}],
    res:[{k:"loh",label:"Lay on Hands (HP)",max:5,per:"Long Rest"}],
    caster:{abil:"cha",cantrips:0,prepared:2,slots:2}},
  Ranger:{hd:10,gp:150,saves:["str","dex"],prim:"dex",sec:"wis",masteries:2,
    skills:{from:["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"],n:3},
    kits:[
      {n:"Longbow and shortsword",ac:"studded",tags:["ranged","finesse"],weapons:[{w:"longbow"},{w:"shortsword"}],gear:"Studded Leather, Longbow, 20 Arrows, Shortsword, Druidic Focus (sprig of mistletoe)"},
      {n:"Twin shortswords",ac:"leather",tags:["dual","finesse"],weapons:[{w:"shortsword",count:2},{w:"dagger",count:2}],gear:"Leather Armor, 2 Shortswords, 2 Daggers, Druidic Focus (yew wand)"},
      {n:"Heavy crossbow",ac:"chainShirt",tags:["ranged","finesse"],weapons:[{w:"heavyxbow"},{w:"scimitar"}],gear:"Chain Shirt, Heavy Crossbow, 20 Bolts, Scimitar, Druidic Focus (wooden staff)"},
      {n:"Spear and shield",ac:"studdedShield",tags:["onehand","ranged","thrown"],weapons:[{w:"spear"},{w:"shortbow"}],gear:"Studded Leather, Shield, Spear, Shortbow, 20 Arrows, Druidic Focus (totem)"},
      {n:"Scimitar and shield",ac:"hideShield",tags:["onehand","finesse"],weapons:[{w:"scimitar"},{w:"dagger",count:2}],gear:"Hide Armor, Shield, Scimitar, 2 Daggers, Druidic Focus (sprig of mistletoe)"},
      {n:"Shortbow and handaxes",ac:"padded",tags:["ranged","thrown"],weapons:[{w:"shortbow"},{w:"handaxe",count:2}],gear:"Padded Armor, Shortbow, 20 Arrows, 2 Handaxes, Druidic Focus (yew wand)"},
      {n:"Trident and net",ac:"scale",tags:["onehand","thrown","finesse"],weapons:[{w:"trident"},{w:"dagger",count:2}],gear:"Scale Mail, Trident, Net, 2 Daggers, Druidic Focus (wooden staff)",gpExtra:1},
      // The blowgun's 1 damage is a utility line, so this kit carries a real martial sidearm.
      {n:"Blowgun and rapier",ac:"hide",tags:["ranged","onehand","finesse"],weapons:[{w:"blowgun"},{w:"rapier"}],gear:"Hide Armor, Blowgun, 50 Needles, Rapier, Druidic Focus (totem)",gpExtra:1}],
    traits:[],
    bonus:[{n:"Favored Enemy (Hunter's Mark)",t:"Hunter's Mark is always prepared and castable twice per Long Rest without a spell slot."}],
    res:[{k:"fav",label:"Hunter's Mark (free)",max:2,per:"Long Rest"}],
    caster:{abil:"wis",cantrips:0,prepared:2,slots:2,always:["Hunter's Mark"]}},
  Rogue:{hd:8,gp:100,saves:["dex","int"],prim:"dex",sec:"int",masteries:2,
    skills:{from:["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Persuasion","Sleight of Hand","Stealth"],n:4},
    kits:[
      // Every rogue kit is Finesse or Ranged throughout — Sneak Attack needs one or the other,
      // so a Strength weapon would be a dead line on the card.
      {n:"Shortsword and shortbow",ac:"leather",tags:["onehand","finesse","ranged"],weapons:[{w:"shortsword"},{w:"shortbow"},{w:"dagger",count:2}],gear:"Leather Armor, Shortsword, Shortbow, 20 Arrows, 2 Daggers, Thieves' Tools",gpExtra:25},
      {n:"Rapier and dagger",ac:"studded",tags:["onehand","finesse"],weapons:[{w:"rapier"},{w:"dagger",count:2}],gear:"Studded Leather, Rapier, 2 Daggers, Thieves' Tools",gpExtra:25},
      {n:"Rapier and hand crossbow",ac:"leather",tags:["onehand","finesse","ranged"],weapons:[{w:"rapier"},{w:"handxbow"}],gear:"Leather Armor, Rapier, Hand Crossbow, 20 Bolts, Thieves' Tools",gpExtra:25},
      {n:"Twin shortswords",ac:"padded",tags:["dual","finesse","ranged"],weapons:[{w:"shortsword",count:2},{w:"sling"}],gear:"Padded Armor, 2 Shortswords, Sling, 20 Bullets, Thieves' Tools",gpExtra:25},
      {n:"Daggers everywhere",ac:"leather",tags:["dual","finesse","thrown"],weapons:[{w:"dagger",count:4},{w:"dart",count:2}],gear:"Leather Armor, 4 Daggers, 2 Darts, Thieves' Tools",gpExtra:25},
      {n:"Scimitar and shortbow",ac:"studded",tags:["onehand","finesse","ranged"],weapons:[{w:"scimitar"},{w:"shortbow"}],gear:"Studded Leather, Scimitar, Shortbow, 20 Arrows, Thieves' Tools",gpExtra:25},
      {n:"Whip and daggers",ac:"padded",tags:["onehand","finesse"],weapons:[{w:"whip"},{w:"dagger",count:2}],gear:"Padded Armor, Whip, 2 Daggers, Thieves' Tools",gpExtra:25},
      {n:"Scimitar and hand crossbow",ac:"studded",tags:["onehand","finesse","ranged"],weapons:[{w:"scimitar"},{w:"handxbow"}],gear:"Studded Leather, Scimitar, Hand Crossbow, 20 Bolts, Thieves' Tools",gpExtra:25}],
    traits:[{n:"Sneak Attack (1d6)",t:"Once per turn, +1d6 damage on a hit with a Finesse or Ranged weapon if the rogue has Advantage, or if an able ally is within 5 feet of the target and the rogue doesn't have Disadvantage."},
            {n:"Thieves' Cant",t:"The rogue knows Thieves' Cant and one other language."}],
    bonus:[],tools:["Thieves' Tools"],langs:["Thieves' Cant"],
    featureOpt:{label:"Expertise",kind:"expertise",n:2},
    hooks:{}},
  Sorcerer:{hd:6,gp:50,saves:["con","cha"],prim:"cha",sec:"con",
    skills:{from:["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"],n:2},
    kits:[
      // One Arcane Focus per kit, named: XPHB offers crystal, orb, rod, staff and wand, and a
      // sorcerer's focus is the most personal thing it owns.
      {n:"Spear and crystal",ac:"none",tags:["onehand","thrown"],weapons:[{w:"spear"},{w:"dagger",count:2}],gear:"Spear, 2 Daggers, Arcane Focus (crystal)"},
      {n:"Light crossbow and wand",ac:"none",tags:["ranged"],weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Light Crossbow, 20 Bolts, Dagger, Arcane Focus (wand)"},
      {n:"Quarterstaff focus",ac:"none",tags:["twohand"],weapons:[{w:"quarterstaff"},{w:"dagger"}],gear:"Quarterstaff, Dagger, Arcane Focus (staff)"},
      {n:"Darts and orb",ac:"none",tags:["ranged"],weapons:[{w:"dart",count:4},{w:"quarterstaff"}],gear:"4 Darts, Quarterstaff, Arcane Focus (orb)"},
      {n:"Sling and rod",ac:"none",tags:["ranged","onehand"],weapons:[{w:"sling"},{w:"sickle"},{w:"dagger"}],gear:"Sling, 20 Bullets, Sickle, Dagger, Arcane Focus (rod)"}],
    traits:[],
    bonus:[{n:"Innate Sorcery (2/Long Rest)",t:"For 1 minute: the sorcerer's spell save DC increases by 1 and it has Advantage on Sorcerer spell attack rolls."}],
    res:[{k:"innate",label:"Innate Sorcery",max:2,per:"Long Rest"}],
    caster:{abil:"cha",cantrips:4,prepared:2,slots:2}},
  Warlock:{hd:8,gp:100,saves:["wis","cha"],prim:"cha",sec:"con",
    skills:{from:["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"],n:2},
    kits:[
      {n:"Sickle and orb",ac:"leather",tags:["onehand","thrown"],weapons:[{w:"sickle"},{w:"dagger",count:2}],gear:"Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb)"},
      {n:"Light crossbow and rod",ac:"padded",tags:["ranged"],weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Padded Armor, Light Crossbow, 20 Bolts, Dagger, Arcane Focus (rod)"},
      {n:"Spear and wand",ac:"leather",tags:["onehand","thrown"],weapons:[{w:"spear"},{w:"club"},{w:"dagger"}],gear:"Leather Armor, Spear, Club, Dagger, Arcane Focus (wand)"},
      {n:"Daggers and crystal",ac:"studded",tags:["dual","finesse","ranged"],weapons:[{w:"dagger",count:2},{w:"dart",count:3}],gear:"Studded Leather, 2 Daggers, 3 Darts, Arcane Focus (crystal)"},
      // Blade-pact kits (v4 note): only on the table once Pact of the Blade is the invocation —
      // the pact makes the warlock proficient with its bonded martial weapon.
      {n:"Pact greatsword",ac:"leather",needs:"pactBlade",tags:["twohand"],weapons:[{w:"greatsword"},{w:"dagger"}],gear:"Leather Armor, Greatsword, Dagger, Arcane Focus (orb)"},
      {n:"Pact halberd",ac:"leather",needs:"pactBlade",tags:["twohand"],weapons:[{w:"halberd"},{w:"dagger"}],gear:"Leather Armor, Halberd, Dagger, Arcane Focus (staff)"},
      {n:"Pact rapier",ac:"studded",needs:"pactBlade",tags:["onehand","finesse"],weapons:[{w:"rapier"},{w:"dagger",count:2}],gear:"Studded Leather, Rapier, 2 Daggers, Arcane Focus (rod)"},
      {n:"Pact glaive",ac:"padded",needs:"pactBlade",tags:["twohand","ranged"],weapons:[{w:"glaive"},{w:"handxbow"}],gear:"Padded Armor, Glaive, Hand Crossbow, 20 Bolts, Arcane Focus (crystal)"}],
    traits:[{n:"Pact Magic",t:"One level-1 Pact slot; it refills on a Short or Long Rest."}],
    bonus:[],
    featureOpt:{label:"Eldritch Invocation",options:[
      {label:"Armor of Shadows",value:"Armor of Shadows",t:"Invocation: Armor of Shadows. The warlock can cast Mage Armor on itself at will, without a slot.",hooks:{mageArmor:true}},
      {label:"Eldritch Mind",value:"Eldritch Mind",t:"Invocation: Eldritch Mind. Advantage on Constitution saves to maintain Concentration."},
      {label:"Pact of the Blade",value:"Pact of the Blade",t:"Invocation: Pact of the Blade. Bonus Action: conjure a bonded pact weapon; its attack and damage rolls use Charisma.",hooks:{pactBlade:true}},
      {label:"Pact of the Chain",value:"Pact of the Chain",t:"Invocation: Pact of the Chain. The warlock knows Find Familiar and can take special familiar forms (imp, quasit, sprite...); the familiar can attack when the warlock takes the Attack action."},
      {label:"Pact of the Tome",value:"Pact of the Tome",t:"Invocation: Pact of the Tome. A Book of Shadows grants three extra cantrips from any class list.",hooks:{tome:true}}]},
    caster:{abil:"cha",cantrips:2,prepared:2,slots:1,short:true}},
  Wizard:{hd:6,gp:55,saves:["int","wis"],prim:"int",sec:"con",
    skills:{from:["Arcana","History","Insight","Investigation","Medicine","Nature","Religion"],n:2},
    kits:[
      {n:"Staff and daggers",ac:"none",tags:["twohand","finesse"],weapons:[{w:"quarterstaff"},{w:"dagger",count:2}],gear:"Quarterstaff (Arcane Focus), 2 Daggers, Robe, Spellbook"},
      {n:"Dagger and darts",ac:"none",tags:["ranged","finesse"],weapons:[{w:"dagger"},{w:"dart",count:3}],gear:"Dagger, 3 Darts, Arcane Focus (wand), Robe, Spellbook"},
      {n:"Traveling scholar",ac:"none",tags:["twohand","finesse"],weapons:[{w:"quarterstaff"},{w:"dagger"}],gear:"Quarterstaff, Dagger, Arcane Focus (staff), Robe, Spellbook, Ink and Quill"},
      {n:"Light crossbow",ac:"none",tags:["ranged"],weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Light Crossbow, 20 Bolts, Dagger, Arcane Focus (crystal), Spellbook"},
      {n:"Sling and pouch",ac:"none",tags:["ranged","finesse"],weapons:[{w:"sling"},{w:"dagger",count:2}],gear:"Sling, 20 Bullets, 2 Daggers, Component Pouch, Robe, Spellbook"}],
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
// D-038 prices (XPHB list price, in GP). Packs are priced as the book prices them; a compound
// sundry is the sum of its parts. Anything absent from this map costs nothing, which is the safe
// direction: an unpriced item can never make a legal roll unaffordable.
const GEN_PACK_GP={"Burglar's Pack":16,"Dungeoneer's Pack":12,"Entertainer's Pack":40,
  "Explorer's Pack":10,"Priest's Pack":33,"Scholar's Pack":40};
const GEN_SUNDRY_GP={
  "Rope (50 ft.)":1,"Crowbar":2,"Grappling Hook":2,"Caltrops (bag)":1,"Ball Bearings (bag)":1,
  "Chalk (10 pieces)":0.1,"Steel Mirror":5,"Hooded Lantern and Oil Flask":5.1,"Tinderbox and 10 Torches":0.6,
  "Shovel":2,"Manacles":2,"Fishing Tackle":1,"Healer's Kit":5,"Hunting Trap":5,
  "Bell and String (10 ft.)":1.1,"Playing Cards":0.5,"Net":1,"Bedroll and Blanket":1.5,
  "3 Empty Vials":3,"Signal Whistle":0.05,
  "Block and Tackle":1,"Iron Pot and Ladle":2,"Waterskin (full)":0.2,"Bar of Soap":0.02,"Perfume (vial)":5,
  "Ink, Quill, and 5 Sheets of Parchment":10.5,"Candles (10)":0.1,"Oil Flask (spare)":0.1,"Whetstone":0.01,
  "Two Sacks":0.02,"Bucket":0.05,"Iron Spikes (10)":1,"Padlock with Key":10,"Merchant's Scale":5,
  "Hourglass":25,"String (50 ft.)":0.1,"Sealing Wax and Plain Seal":0.5,"Dice Set":0.1,
  "Two-Person Tent":2,"Blank Book":25};

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
          boons:cfg.boons!==false,               // D-035: optional species boon tables, crew setting
          boonOff:genCleanBoonOff(cfg.boonOff),   // D-043: and individual boons the crew switched off
          trinketTab:genCleanTrinketTab(cfg.trinketTab), // D-044: which trinket list the crew rolls
          set:{stat:cfg.set&&cfg.set.stat==="4d6"?"4d6":"3d6",
                      mode:cfg.set&&cfg.set.mode==="chaos"?"chaos":"plausible",
                      asi:!(cfg.set&&cfg.set.asi===false),
                      gold:!!(cfg.set&&cfg.set.gold),          // D-038: restricted starting gold
                      goldPlus:genGoldPlus(cfg.set&&cfg.set.goldPlus)},
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
// The species pack's live tables — boon tables (optional extras, D-035) drop out when the crew
// has them switched off.
function genSpTablesOf(d){
  const t=(GEN_SPECIES[d.sp]&&GEN_SPECIES[d.sp].tables)||[];
  return d.boons===false?t.filter(x=>!x.boon):t;
}
// The crew-settings list of individual boons (D-043). Only packs that actually ship a boon table
// have anything here — today that is the kobold — so the list is absent for everyone else rather
// than showing an empty box.
function genBoonListHTML(a){
  const keys=a.crew.spMode==="ritual"?Object.keys(GEN_SPECIES):[a.crew.sp];
  const off=genCleanBoonOff(a.crew.boonOff);
  const rows=keys.flatMap(k=>genBoonEntries(k).map(e=>({k,e})));
  if(!rows.length)return "";
  const seen=new Set();
  return `<div class="gk-boonlist">${rows.filter(({e})=>{
    const v=String(e.value);if(seen.has(v))return false;seen.add(v);return true;}).map(({k,e})=>{
    const v=String(e.value);
    return `<label class="gk-boonrow"><input type="checkbox" data-crewboon="${esc(v)}"${off.includes(v)?"":" checked"}>
      <span>${esc(e.label)}</span>${keys.length>1?`<span class="gk-dim">${esc(GEN_SPECIES[k].label)}</span>`:""}</label>`;
  }).join("")}</div>`;
}
// G4 (D-043): boons can also be switched off ONE AT A TIME. The crew keeps a list of the boon
// values it has disabled; a disabled boon leaves the option table and, if the die lands on its
// face, resolves to the table's own no-boon entry — the die stays honest, that result is just off
// the menu. Tolerant by design (D-035): an unknown id in the list is simply ignored.
function genBoonOff(d){return Array.isArray(d.boonOff)?d.boonOff:[];}
// The list arrives from a world-writable share, so it is rebuilt rather than trusted (D-007).
function genCleanBoonOff(v){
  if(!Array.isArray(v))return [];
  return [...new Set(v.filter(x=>typeof x==="string"||typeof x==="number").map(x=>String(x).slice(0,40)))].slice(0,40);
}
function genBoonEntries(sp){
  const t=((GEN_SPECIES[sp]&&GEN_SPECIES[sp].tables)||[]).filter(x=>x.boon);
  return t.flatMap(x=>x.entries.filter(e=>e.value!==false&&e.value!=null).map(e=>({...e,tid:x.id})));
}
function genBoonNone(t){const e=t.entries.find(x=>x.value===false);return e||t.entries[0];}
// The entry a roll resolves to, once the crew's disabled boons are taken out.
function genSpEntryFor(d,t,e){
  if(!t.boon||!e||e.value===false)return e;
  return genBoonOff(d).includes(String(e.value))?genBoonNone(t):e;
}
// D-034: steps run grouped by macro category, so every micro choice a category owns resolves
// with it — species and everything the species decides, then scores, class, origin feats, class
// training, magic, gear, identity. (Dependencies still constrain the order inside the groups:
// the class default needs the scores, gated kits need the feature, the familiar needs the spells.)
function genStepOrder(d){
  const ids=[];
  // Species-dependent steps hold back until the ritual species lands.
  const spReady=!d.spRitual||(d.steps.species&&d.steps.species.value!=null);
  if(d.spRitual)ids.push("species"); // D-031: the ritual opens with the species roll
  if(spReady)genSpTablesOf(d).forEach(t=>ids.push("sp:"+t.id)); // …and resolves its tables with it
  // D-044: a species' own extra origin feat (Human Versatile) is a SPECIES feature — it groups with
  // the species, not with the background's feat three steps later.
  if(spReady&&GEN_SPECIES[d.sp].extraFeat)ids.push("feat2");
  ids.push("stats","cls");
  if(d.set.asi)ids.push("asi");
  ids.push("feat","skills");
  const cls=genClsOf(d);
  if(cls){
    if(GEN_CLASSES[cls].featureOpt)ids.push("feature");
    if(genCantripCount(d)>0)ids.push("cantrips");
    if(GEN_CLASSES[cls].caster)ids.push("spells");
    if(genFamiliarKind(d))ids.push("familiar"); // D-025: appears once chain/Find Familiar resolves
    ids.push("equip"); // gear group: the kit sits with the pack and the sundries
  }
  ids.push("gearPack","sundries");
  // Identity is NOT a step any more (D-041): the ritual ends on the rolls, and name/quirk/trinket
  // are filled on the closing summary screen. genCompletePayload still requires the name, so the
  // summary is what gates the card.
  return ids;
}
function genSpTable(sp,id){return (GEN_SPECIES[sp].tables||[]).find(t=>t.id===id)||null;}
// Hooks of the currently-resolved class feature option (invocation etc.); {} when none.
function genFeatureHooks(d){
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null,fe=d.steps.feature;
  if(!K||!K.featureOpt||K.featureOpt.kind||!fe)return {};
  const o=(K.featureOpt.options||[]).find(x=>x.value===fe.value);
  return (o&&o.hooks)||{};
}
// D-037: kits legal for a class once its feature option has landed — full-array indexes, so
// payloads stay stable however the table narrows. `needs` gates a kit behind the option's hook
// (Pact of the Blade, the Cleric's and Druid's Martial training); the option's `fits` then keeps
// only the kits tagged for the tactic it rolled. An option with no `fits` leaves the table whole,
// and a `fits` that matches nothing falls back to it rather than emptying the step.
// D-040: a kit's full tag set = the WEAPON-SHAPE tags it declares, plus the DEFENCE tags derived
// from its armor recipe (weight, shield, unarmored). Deriving the defence half means it can never
// drift from the recipe, and it makes `fits` able to express an armor tie — which is what a
// species-granted Fighting Style, or a future Protector/Warden `fits`, would need.
function genKitTags(kit){
  const A=GEN_AC[kit.ac],t=(kit.tags||[]).slice();
  if(A){
    if(A.w&&A.w!=="none")t.push(A.w);
    if(A.shield)t.push("shield");
    if(A.kind==="none"||/^unarmored/.test(A.kind||""))t.push("unarmored");
  }
  return t;
}
function genKitIdxFor(K,featVal){
  const o=K.featureOpt&&!K.featureOpt.kind?(K.featureOpt.options||[]).find(x=>x.value===featVal):null;
  const hooks=(o&&o.hooks)||{};
  const avail=K.kits.map((k,i)=>k.needs&&!hooks[k.needs]?null:i).filter(i=>i!=null);
  const fits=o&&o.fits;
  if(!fits||!fits.length)return avail;
  const m=avail.filter(i=>genKitTags(K.kits[i]).some(t=>fits.indexOf(t)>=0));
  return m.length?m:avail;
}
// ── D-038: the starting-gold budget ─────────────────────────────────────────
// Restricted mode prices the whole gear group against the class's own XPHB starting gold — the
// "or N GP" alternative each class lists, which is what WotC balanced its package against — plus a
// crew-wide bonus the DM can raise. Tables filter to what the purse still covers, in ritual order
// (kit → pack → sundries), and the remainder prints on the card as coin, exactly as XPHB's own
// packages hand over their leftover. Class-mandatory gear (spellbook, holy symbol, spellcasting
// focus) is NOT counted: at 55 GP a wizard's own spellbook would eat the entire budget.
// An unpriced item costs 0 — the safe direction, since it can never make a legal roll unaffordable.
// ── Identity content (D-042) ────────────────────────────────────────────────────────────────
// TRINKETS: the d100 table from the System Reference Document 5.2, used VERBATIM under CC-BY-4.0.
// The licence requires attribution; it lives in README.md and in the app's settings credits line.
// Do not drop either, and do not edit these hundred rows — an edited row is no longer the SRD's.
// Transcribed from the SRD 5.2 text and cross-checked row-for-row against the local 5etools copy
// of the same table (the 2024 wording differs from the 2014 printing in about a third of the rows).
const GEN_TRINKETS=[
  "A mummified goblin hand","A crystal that faintly glows in moonlight","A gold coin minted in an unknown land",
  "A diary written in a language you don't know","A brass ring that never tarnishes","An old chess piece made from glass",
  "A pair of knucklebone dice, each with a skull symbol on the side that would normally show six pips",
  "A small idol depicting a nightmarish creature that gives you unsettling dreams when you sleep near it",
  "A lock of someone's hair","The deed for a parcel of land in a realm unknown to you",
  "A 1-ounce block made from an unknown material","A small cloth doll skewered with needles",
  "A tooth from an unknown beast","An enormous scale, perhaps from a dragon","A bright-green feather",
  "An old divination card bearing your likeness","A glass orb filled with moving smoke",
  "A 1-pound egg with a bright-red shell","A pipe that blows bubbles",
  "A glass jar containing a bit of flesh floating in pickling fluid",
  "A gnome-crafted music box that plays a song you dimly remember from your childhood",
  "A wooden statuette of a smug halfling","A brass orb etched with strange runes","A multicolored stone disk",
  "A silver icon of a raven","A bag containing forty-seven teeth, one of which is rotten",
  "A shard of obsidian that always feels warm to the touch","A dragon's talon strung on a leather necklace",
  "A pair of old socks","A blank book whose pages refuse to hold ink, chalk, graphite, or any other marking",
  "A silver badge that is a five-pointed star","A knife that belonged to a relative",
  "A glass vial filled with nail clippings",
  "A rectangular metal device with two tiny metal cups on one end that throws sparks when wet",
  "A white, sequined glove sized for a human","A vest with one hundred tiny pockets","A weightless stone",
  "A sketch of a goblin","An empty glass vial that smells of perfume",
  "A gemstone that looks like a lump of coal when examined by anyone but you",
  "A scrap of cloth from an old banner","A rank insignia from a lost legionnaire","A silver bell without a clapper",
  "A mechanical canary inside a lamp","A miniature chest carved to look like it has numerous feet on the bottom",
  "A dead sprite inside a clear glass bottle",
  "A metal can that has no opening but sounds as if it is filled with liquid, sand, spiders, or broken glass (your choice)",
  "A glass orb filled with water, in which swims a clockwork goldfish",
  "A silver spoon with an M engraved on the handle","A whistle made from gold-colored wood",
  "A dead scarab beetle the size of your hand","Two toy soldiers, one missing a head",
  "A small box filled with different-sized buttons","A candle that can't be lit","A miniature cage with no door",
  "An old key","An indecipherable treasure map","A hilt from a broken sword","A rabbit's foot","A glass eye",
  "A cameo of a hideous person","A silver skull the size of a coin","An alabaster mask",
  "A cone of sticky black incense that stinks","A nightcap that gives you pleasant dreams when you wear it",
  "A single caltrop made from bone","A gold monocle frame without the lens",
  "A 1-inch cube, each side a different color","A crystal doorknob","A packet filled with pink dust",
  "A fragment of a beautiful song, written as musical notes on two pieces of parchment",
  "A silver teardrop earring containing a real teardrop",
  "An eggshell painted with scenes of misery in disturbing detail",
  "A fan that, when unfolded, shows a sleepy cat","A set of bone pipes",
  "A four-leaf clover pressed inside a book discussing manners and etiquette",
  "A sheet of parchment upon which is drawn a mechanical contraption",
  "An ornate scabbard that fits no blade you have found","An invitation to a party where a murder happened",
  "A bronze pentacle with an etching of a rat's head in its center",
  "A purple handkerchief embroidered with the name of an archmage",
  "Half a floor plan for a temple, a castle, or another structure",
  "A bit of folded cloth that, when unfolded, turns into a stylish cap",
  "A receipt of deposit at a bank in a far-off city","A diary with seven missing pages",
  "An empty silver snuffbox bearing the inscription \"dreams\" on its lid",
  "An iron holy symbol devoted to an unknown god",
  "A book about a legendary hero's rise and fall, with the last chapter missing","A vial of dragon blood",
  "An ancient arrow of elven design","A needle that never bends","An ornate brooch of dwarven design",
  "An empty wine bottle bearing a pretty label that says, \"The Wizard of Wines Winery, Red Dragon Crush, 331422-W\"",
  "A mosaic tile with a multicolored, glazed surface","A petrified mouse",
  "A black pirate flag adorned with a dragon's skull and crossbones",
  "A tiny mechanical crab or spider that moves about when it's not being observed",
  "A glass jar containing lard with a label that reads, \"Griffon Grease\"",
  "A wooden box with a ceramic bottom that holds a living worm with a head on each end of its body",
  "A metal urn containing the ashes of a hero"];
// Our own extras (D-042), written for the crew's world: short lives, borrowed gear, previous owners.
// Rolled from the same step behind the second tab — never merged into the SRD hundred.
const GEN_TRINKETS_X=[
  "A ration tin with the previous owner's name scratched out",
  "A key that fits a door two dungeons back","A tooth on a string, drilled by hand",
  "A cracked whistle that only dogs answer","A pouch of teeth that are not yours",
  "A folded map of a room you have never entered","A cheap ring worn smooth by nervous hands",
  "A finger bone marked with three notches","A helmet liner too big for your head",
  "A letter of introduction addressed to nobody","A candle stub burned at both ends",
  "A shard of mirror wrapped in cloth","A collar with the tag filed off",
  "A wooden charm carved by someone who died first","A jar of grave dirt, labelled in a careful hand",
  "A knucklebone die that has never rolled a one","A note promising one favor, signed with a claw mark",
  "A boot worn through at the sole, kept for luck","A dented flask that still smells of something strong",
  "A scrap of banner from a company that no longer exists"];
// QUIRKS (D-042): a mix of original entries and well-worn table staples rewritten in our own words.
// One short behaviour each, playable at the table, no mechanics.
const GEN_QUIRKS=[
  "Counts everything out loud, badly","Names every weapon it picks up",
  "Refuses to walk through a door someone else opened","Repeats the last word anyone says",
  "Keeps a tally of debts owed to it, on its arm","Sleeps standing up","Won't eat anything with a face",
  "Eats anything with a face, first","Apologizes to doors before forcing them",
  "Whistles when nervous, which is often","Collects buttons off the dead",
  "Talks to its shadow when it thinks nobody is listening","Never sits with its back to a room",
  "Salutes anyone taller","Believes it is invisible when it holds still",
  "Insists on going last, out of manners","Insists on going first, out of pride",
  "Cracks its knuckles before lying","Hums the same six notes constantly",
  "Refuses to say its own name aloud","Rewords every order it is given, then follows it",
  "Keeps score of who has saved whom","Won't touch gold with bare hands","Licks unfamiliar objects",
  "Flinches at loud noises, then pretends it didn't","Sharpens a blade that is already sharp",
  "Sleeps with one boot on","Argues with corpses","Bows before attacking",
  "Keeps a running list of things that nearly killed it","Distrusts anything that floats",
  "Always takes the smallest portion, loudly","Steals salt","Narrates its own actions in the third person",
  "Refuses to cross running water without asking permission","Blames the nearest object when it trips",
  "Keeps stones in its pockets to feel heavier","Wears a talisman it knows is fake",
  "Tries to bargain with anything that talks","Won't be the one to open a chest",
  "Insists on opening every chest","Whispers when discussing money",
  "Draws maps that nobody else can read","Marks every room it has survived",
  "Feeds the first bite of every meal to the floor","Speaks to animals as equals, and waits for answers",
  "Snores loudly enough to be a tactical problem","Fusses over the party's gear before its own",
  "Keeps its teeth extremely clean","Refuses to be thanked","Names the dead out loud each morning",
  "Won't step on cracks, in dungeons or out","Trusts anyone who feeds it",
  "Wears trophies from fights it lost","Practices its last words","Hoards candle stubs",
  "Corrects other people's grammar mid-fight","Believes it is the reincarnation of something great",
  "Rubs a lucky scar before every risk","Will not lie, but omits generously",
  "Answers questions with questions","Keeps its hood up indoors","Sings while it works, badly and constantly",
  "Cannot resist a bet","Counts the party every few minutes","Wraps its hands before a fight, ritually",
  "Refuses to sleep in a bed","Divides all loot into equal piles, obsessively",
  "Won't fight anything smaller than itself","Keeps its old shackle as a bracelet",
  "Says grace over fallen enemies","Learns everyone's name and uses it constantly",
  "Never learns a name, uses job titles instead","Tastes the air before entering a room",
  "Keeps a pebble for each friend still living","Hates being touched on the shoulder",
  "Volunteers for everything first, then regrets it","Talks about itself in the plural",
  "Assumes every stranger is an old acquaintance","Won't part with a broken weapon",
  "Insists the walls are listening","Puts its gear in the same order every night",
  "Keeps a small mirror and checks it often","Refuses to be carried, ever",
  "Bites its cloak when concentrating","Claims to be allergic to magic","Sneezes near gold",
  "Buries what it cannot carry, and remembers where","Calls every big creature sir",
  "Repeats instructions back word for word","Trades away useful things for shiny ones",
  "Keeps a jar of dirt from each floor of a dungeon",
  "Insists on carrying the light, then walks too fast","Freezes solid at the sight of a rat",
  "Tells the same story every night, differently each time","Won't wear anything red","Only wears red",
  "Adopts anything small that survives","Swears elaborate oaths over trivial things",
  "Keeps a written will, updated weekly"];
// NAMES (D-042): built, never copied. A pack carries a sound profile (`names`) and genRollName
// assembles a name from it, so the pool is infinite and nothing is transcribed from a rulebook.
// A species with no profile of its own (every uploaded pack) borrows this one.
const GEN_NAME_FALLBACK={
  pre:["Ar","Bel","Cor","Dain","El","Fen","Gar","Hal","Kel","Mar","Nor","Ral","Sel","Tor","Vel"],
  mid:["a","e","i","o","u"],
  suf:["n","r","th","l","s","k","dor","wen","mir","ric"]};
// One profile per shipped pack. A pack may carry its own `names` instead (that wins); anything with
// neither — every uploaded species — falls back above, so no species is ever left without names.
const GEN_NAME_PROFILES={
  kobold:{pre:["Snik","Krib","Vex","Grik","Taz","Yip","Rek","Skit","Nub","Zik","Chak","Durt","Gnash","Mek","Rax","Sput","Klik","Vorp"],
          mid:["a","i","u","ka","ri"],suf:["k","x","tch","zz","rk","nak","rit","sk","p","nix"]},
  aasimar:{pre:["Ari","Cael","Eli","Ith","Lum","Nara","Ori","Sera","Thae","Val"],
           mid:["a","e","i","el"],suf:["ael","riel","thos","mira","dan","seth","lia","nor","vion"]},
  dragonborn:{pre:["Arjh","Bhar","Dhaz","Ghesh","Kriv","Med","Nagh","Pand","Rhog","Sham","Thur","Zar"],
              mid:["a","o","ra","ka"],suf:["ash","kar","rax","thar","ndra","zil","vash","kir","rios"]},
  dwarf:{pre:["Bar","Dur","Grum","Thra","Har","Mor","Bal","Kaz","Vond","Ordn","Fal","Gim"],
         mid:["a","o","u","ur"],suf:["din","rik","grim","bek","dur","nar","muth","kar","li","gar"]},
  elf:{pre:["Ae","Ily","Thal","Ny","Sae","Elu","Cael","Ari","Fael","Miri","Sol","Va"],
       mid:["la","ri","the","na","el"],suf:["nor","wen","riel","dris","thas","mir","lian","ath","ynn"]},
  gnome:{pre:["Fizz","Bim","Wren","Nack","Zook","Pim","Dab","Griz","Quil","Snor"],
         mid:["a","i","o","el"],suf:["wick","bles","dink","nap","tock","fizzle","bit","gle","zin"]},
  goliath:{pre:["Kav","Thul","Gar","Ura","Bur","Nal","Ka","Vand","Orn","Zar"],
           mid:["a","u","o","ak"],suf:["aka","thul","ruk","gan","mak","dor","nak","vok","tha"]},
  halfling:{pre:["Bil","Mer","Rosc","Tan","Pip","Dob","Wil","Hild","Cor","Nim"],
            mid:["a","o","er"],suf:["by","ric","ock","wise","bell","fin","dle","kin","row"]},
  human:{pre:["Aldr","Ber","Cas","Dor","Elm","Gart","Hen","Ives","Jor","Kest","Lor","Mira","Ren","Sabe","Tor"],
         mid:["a","e","i","o"],suf:["ic","na","ran","wyn","don","sel","ther","mund","va","lin"]},
  orc:{pre:["Gru","Thok","Mur","Zag","Bruk","Kor","Ur","Sha","Vrak","Ghar"],
       mid:["a","u","og"],suf:["mak","gash","thak","nar","zug","rok","dul","gar","ka"]},
  tiefling:{pre:["Ak","Bael","Cim","Dam","Eis","Kal","Mor","Nem","Ronw","Zar"],
            mid:["a","e","i","ae"],suf:["mon","zael","reth","ixis","thys","vane","noch","kar","ess"]}};
function genNameProfile(sp){
  const pack=GEN_SPECIES[sp];
  const p=(pack&&pack.names)||GEN_NAME_PROFILES[sp]||GEN_NAME_FALLBACK;
  return p&&Array.isArray(p.pre)&&p.pre.length&&Array.isArray(p.suf)&&p.suf.length?p:GEN_NAME_FALLBACK;
}
// A name is assembled, not drawn from a list — so it never runs out and nothing is transcribed.
// The middle piece lands about half the time, which is what makes the same profile give both
// "Snikk" and "Snikarit".
function genRollName(sp,rng){
  rng=rng||Math.random;
  const p=genNameProfile(sp),pick=a=>a[Math.floor(rng()*a.length)%a.length];
  const mid=Array.isArray(p.mid)&&p.mid.length&&rng()<0.45?pick(p.mid):"";
  let n=(pick(p.pre)+mid+pick(p.suf)).replace(/(.)\1{2,}/g,"$1$1");
  n=n.charAt(0).toUpperCase()+n.slice(1);
  return n.slice(0,28);
}
// The trinket step rolls on one of two tables (D-042), chosen by a toggle that rides the DRAFT only
// — never the wire, exactly like the D-024 spell tabs.
function genTrinketTab(d){return d.trinketTab==="forge"?"forge":"srd";}
function genCleanTrinketTab(v){return v==="forge"?"forge":"srd";}
function genIdList(d,id){
  if(id==="quirk")return GEN_QUIRKS;
  return genTrinketTab(d)==="forge"?GEN_TRINKETS_X:GEN_TRINKETS;
}
// Identity rolls (D-041/D-042). Name is generated; quirk and trinket roll a real die on a real
// table. All three still land on the draft as ordinary picked values, so the wire is unchanged.
function genRollIdentity(d,id,rng){
  rng=rng||Math.random;
  if(id==="name"){d.steps.name={rolls:[],pick:true,value:genRollName(d.sp,rng)};return d.steps.name;}
  if(id!=="quirk"&&id!=="trinket")return null;
  const list=genIdList(d,id),die=genDieFor(list.length);
  const r=genRollTable(rng,die,list.length,null);
  d.steps[id]={rolls:[r],value:list[r-1],die};
  return d.steps[id];
}
function genGoldPlus(v){const n=Number(v);return Number.isFinite(n)&&n>0?Math.min(Math.round(n),100000):0;}
function genGP(n){return Math.round(n*100)/100;}
function genGoldOn(d){return !!(d.set&&d.set.gold);}
// D-040: a 2024 character takes its class's gold alternative AND its background's, and every one
// of the sixteen XPHB backgrounds offers exactly 50 GP. The generator's custom background is no
// exception, so the purse is class + background + whatever the crew adds on top.
const GEN_BG_GP=50;
function genBudget(d){
  const K=GEN_CLASSES[genClsOf(d)];
  if(!genGoldOn(d)||!K)return Infinity;
  return genGP((K.gp||0)+GEN_BG_GP+genGoldPlus(d.set.goldPlus));
}
function genKitCost(K,kit){
  const A=GEN_AC[kit.ac];
  // Costed as written, never as the Str gate demotes it: the nominal armor is the dearer one, so
  // the budget can't be talked into affording something the character couldn't have bought.
  return genGP((A&&A.gp||0)
    +kit.weapons.reduce((n,r)=>{const w=GEN_W[r.w];return n+(w?(w.gp||0)*(r.count||1):0);},0)
    +(kit.gpExtra||0));
}
function genPackCost(n){return GEN_PACK_GP[n]||0;}
function genSundryCost(n){return GEN_SUNDRY_GP[n]||0;}
// What the purse holds when each gear step comes up. Steps that haven't landed cost nothing yet.
function genPurseAt(d,step){
  const b=genBudget(d);if(b===Infinity)return Infinity;
  const K=GEN_CLASSES[genClsOf(d)];
  let left=b;
  if(step==="equip")return left;
  if(K&&d.steps.equip&&K.kits[d.steps.equip.value])left=genGP(left-genKitCost(K,K.kits[d.steps.equip.value]));
  if(step==="gearPack")return left;
  if(d.steps.gearPack)left=genGP(left-genPackCost(d.steps.gearPack.value));
  return left; // "sundries"
}
// Leftover coin: what the character walks away with once every gear step has landed.
function genCoin(d){
  const b=genBudget(d);if(b===Infinity)return null;
  let left=genPurseAt(d,"sundries");
  if(d.steps.sundries&&Array.isArray(d.steps.sundries.value))
    d.steps.sundries.value.forEach(n=>{left=genGP(left-genSundryCost(n));});
  return Math.max(0,left);
}
// A filtered table never empties: if nothing fits, the cheapest option stays so the step can land.
function genAfford(list,cost,purse){
  if(purse===Infinity)return list.slice();
  const fit=list.filter(x=>cost(x)<=purse);
  if(fit.length)return fit;
  let best=list[0];list.forEach(x=>{if(cost(x)<cost(best))best=x;});
  return [best];
}
function genPacksAvail(d){return genAfford(GEN_PACKS,genPackCost,genPurseAt(d,"gearPack"));}
// The sentence a gear step adds to its ? popover while the budget is on.
function genPurseNote(d,step){
  const purse=genPurseAt(d,step);
  if(purse===Infinity)return "";
  const K=GEN_CLASSES[genClsOf(d)],plus=genGoldPlus(d.set.goldPlus);
  if(step==="equip")
    return ` The purse holds ${genGPText(genBudget(d))}: ${genGPText(K.gp||0)} from the class,`
      +` ${genGPText(GEN_BG_GP)} from the background`+(plus?`, ${genGPText(plus)} from the crew`:"")
      +". Anything dearer than the purse is off the table, and whatever is left becomes coin.";
  return ` ${genGPText(purse)} left in the purse; anything dearer is off the table.`;
}
function genGPText(n){return (Math.round(n*100)/100)+" GP";}
// The second sundry sees the purse the first one left behind.
function genSundriesAvail(d,which,firstPick){
  let purse=genPurseAt(d,"sundries");
  if(which===1&&purse!==Infinity&&firstPick!=null)purse=genGP(purse-genSundryCost(firstPick));
  return genAfford(which?GEN_SUNDRIES_B:GEN_SUNDRIES_A,genSundryCost,purse);
}
// Kits legal for the draft right now — feature-legal (D-037) AND affordable (D-038).
function genKitIdx(d,K){
  const idx=genKitIdxFor(K,(d.steps.feature||{}).value);
  const purse=genPurseAt(d,"equip");
  if(purse===Infinity)return idx;
  return genAfford(idx,i=>genKitCost(K,K.kits[i]),purse);
}
// A gear step whose price no longer fits the purse above it is DROPPED, not left showing a total
// the character can't pay (same idiom as genDropUnfitKit).
function genDropUnaffordable(d){
  if(!genGoldOn(d))return;
  if(d.steps.gearPack&&genPackCost(d.steps.gearPack.value)>genPurseAt(d,"gearPack"))delete d.steps.gearPack;
  if(d.steps.sundries&&genCoin(d)===0){
    let left=genPurseAt(d,"sundries");
    const v=d.steps.sundries.value||[];
    if(genGP(left-genSundryCost(v[0])-genSundryCost(v[1]))<0)delete d.steps.sundries;
  }
}
// The feature option just moved: a landed kit it no longer allows is DROPPED, not left on screen
// under a table it isn't in (the step reopens either way — this keeps the stale line off it).
function genDropUnfitKit(d,K){
  if(d.steps.equip&&genKitIdx(d,K).indexOf(d.steps.equip.value)<0)delete d.steps.equip;
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
// D-036: the background ASI defaults to the assignment that actually buys modifiers. The +2 always
// crosses exactly one modifier step whatever the score's parity, so it stays on the class primary;
// the +1 only buys a step on an ODD score (13→14 is +1 to the modifier, 14→15 is nothing), so it
// goes to the best ODD-scored ability the class cares about — secondary first, then the universally
// useful Constitution and Dexterity — and falls back to the secondary when nothing is odd.
// A class's primary ability may be a CHOICE (XPHB's Fighter is "Strength or Dexterity"), so `prim`
// is a string or a list and the one that matters is whichever the character actually rolled well.
function genPrimAbils(K){return K?(Array.isArray(K.prim)?K.prim:[K.prim]):["str"];}
function genPrimAbil(K,score){
  return genPrimAbils(K).slice().sort((a,b)=>(score[b]||10)-(score[a]||10))[0];
}
// D-044: the +2 goes on the class's primary; the +1 goes where it BUYS a modifier — the best ODD
// score among the abilities the class actually uses, widening to any odd score before it settles
// for one that changes nothing. It is a suggestion; the step stays explicit and overridable.
function genAsiDefault(d){
  const K=GEN_CLASSES[genClsOf(d)];
  const score={};GEN_ABILS.forEach((a,i)=>{
    score[a]=d.steps.stats&&d.steps.stats.value&&d.steps.stats.value[i]!=null?d.steps.stats.value[i]:10;});
  const plus2=K?genPrimAbil(K,score):"str",sec=K?K.sec:"con";
  const near=[sec,"con","dex",...genPrimAbils(K)].filter((a,i,arr)=>a!==plus2&&arr.indexOf(a)===i);
  const rest=GEN_ABILS.filter(a=>a!==plus2&&!near.includes(a));
  const bestOdd=list=>list.filter(a=>score[a]%2===1).sort((a,b)=>score[b]-score[a])[0];
  return [plus2,bestOdd(near)||bestOdd(rest)||near[0]||GEN_ABILS.find(a=>a!==plus2)];
}
// D-044: a class is only PLAUSIBLE if the character can actually play it — the primary ability
// leads and a strong secondary can no longer carry a class whose primary is a dump stat (an 8 WIS
// cleric was reaching the shortlist off a 14 CON). Classes with a below-average primary drop out
// entirely; if that leaves nobody, the ranking stands on its own (all stats are terrible).
function genClassShortlist(scores,counts){
  const mod=s=>Math.floor((s-10)/2);
  const rank=GEN_CLASS_LIST.map(c=>{const k=GEN_CLASSES[c];
      const prim=Math.max(...genPrimAbils(k).map(a=>mod(scores[a])));
      return {c,prim,score:prim*10+mod(scores[k.sec])-2*Math.max(0,(counts&&counts[c]||0)-2)};})
    .sort((a,b)=>b.score-a.score||(a.c<b.c?-1:1));
  const fit=rank.filter(x=>x.prim>=0);
  const out=(fit.length?fit:rank).slice(0,3).map(x=>x.c);
  // never collapse to a single option: the class step is a roll, and a d-something needs a spread
  for(const x of rank){if(out.length>=2)break;if(!out.includes(x.c))out.push(x.c);}
  return out;
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
    d.steps.asi={rolls:[],value:genAsiDefault(d)};
  }else if(id==="feat"||id==="feat2"){
    // feat2 (extraFeat species): the second origin feat rerolls the first one's name.
    const other=id==="feat2"?(d.steps.feat&&d.steps.feat.value):(d.steps.feat2&&d.steps.feat2.value);
    const taken=new Set();GEN_FEATS.forEach((f,i)=>{if(f.n===other)taken.add(i+1);});
    const r=genRollTable(rng,10,10,taken.size?taken:null);const f=GEN_FEATS[r-1];
    d.steps[id]={rolls:[r],value:f.n,die:10};
    if(f.sub)genRollSub(d,id,rng);
  }else if(id==="skills"){
    if(!K)return null;
    // Species tables resolve first now (D-034), so class skills must dodge what they granted.
    d.steps.skills=genRollN(rng,K.skills.from,K.skills.n,[...genOwnedSkillNames(d,true)]);
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
      genDropUnfitKit(d,K);
    }
  }else if(id==="equip"){
    if(!K)return null;
    const avail=genKitIdx(d,K),span=genSpanFor(avail.length);
    const r=genRollTable(rng,span.die,span.reroll?avail.length:span.die,null);
    d.steps.equip={rolls:[r],value:avail[span.reroll?r-1:genSpanHit(span,r)],die:span.die};
    genDropUnaffordable(d); // a dearer kit can price the landed pack out of the purse
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
    // D-038: the packs the purse still covers, equal-weight over whatever die that leaves.
    const av=genPacksAvail(d),span=genSpanFor(av.length);
    const r=genRollTable(rng,span.die,span.reroll?av.length:span.die,null);
    d.steps.gearPack={rolls:[r],value:av[span.reroll?r-1:genSpanHit(span,r)],die:span.die};
  }else if(id==="sundries"){
    const A=genSundriesAvail(d,0),spA=genSpanFor(A.length);
    const rA=genRollTable(rng,spA.die,spA.reroll?A.length:spA.die,null);
    const pickA=A[spA.reroll?rA-1:genSpanHit(spA,rA)];
    const B=genSundriesAvail(d,1,pickA),spB=genSpanFor(B.length);
    const rB=genRollTable(rng,spB.die,spB.reroll?B.length:spB.die,null);
    d.steps.sundries={rolls:[rA,rB],value:[pickA,B[spB.reroll?rB-1:genSpanHit(spB,rB)]],die:spA.die};
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
      const r=genRollDie(rng,t.die);
      const e=genSpEntryFor(d,t,t.entries.find(x=>r>=x.lo&&r<=x.hi));
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
    genDropUnfitKit(d,K);
    if(d.steps.cantrips)delete d.steps.cantrips; // extra-cantrip hooks change the count
    return true;}
  if(id==="equip"){
    if(!K)return false;const i=Number(value);
    if(!(i>=0&&i<K.kits.length))return false;
    if(genKitIdx(d,K).indexOf(i)<0)return false; // unlocked, fitting the feature option, affordable
    d.steps.equip={rolls:[],pick:true,value:i};genDropUnaffordable(d);return true;}
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
  if(id==="gearPack"){if(!genPacksAvail(d).includes(value))return false;
    d.steps.gearPack={rolls:[],pick:true,value};genDropUnaffordable(d);return true;}
  if(id==="sundries"){
    if(!Array.isArray(value)||value.length!==2)return false;
    if(!genSundriesAvail(d,0).includes(value[0])||!genSundriesAvail(d,1,value[0]).includes(value[1]))return false;
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
    if(t.boon&&e.value!==false&&genBoonOff(d).includes(String(e.value)))return false; // D-043: switched off
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
    if(genKitIdx(d,K).indexOf(s.value)<0)return false;} // the feature or the purse moved under it
  if(id==="gearPack"&&!genPacksAvail(d).includes(s.value))return false;
  if(id==="sundries"&&Array.isArray(s.value)
     &&!genSundriesAvail(d,1,s.value[0]).includes(s.value[1]))return false;
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));const e=t&&t.entries.find(x=>x.value===s.value);
    if(e&&e.sub&&(!s.sub||s.sub.value==null))return false;}
  return true;
}
function genRollAll(d,rng){
  rng=rng||Math.random;
  let guard=0;
  while(guard++<60){
    const order=genStepOrder(d); // the order grows as cls/feature resolve
    const open=order.find(id=>!genStepDone(d,id));
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
// `cfg` (optional) is the DM's own crew settings — the authority on the D-038 gold budget, since
// the payload's copy arrives from a world-writable share. Without it the payload's own set is used,
// which still catches drift but trusts the sender; every DM-side path passes the real cfg.
function validateGenPayload(raw,cfg){
  try{
    if(!raw||raw.v!==2||typeof raw!=="object")return {ok:false,err:"shape"};
    const sp=GEN_SPECIES[raw.sp]?raw.sp:null;if(!sp)return {ok:false,err:"species"};
    const cfgGold=cfg?!!cfg.gold:!!(raw.set&&raw.set.gold);
    const cfgBoonOff=genCleanBoonOff(cfg?cfg.boonOff:(raw.set&&raw.set.boonOff));
    const cfgGoldPlus=genGoldPlus(cfg?cfg.goldPlus:(raw.set&&raw.set.goldPlus));
    const set={stat:raw.set&&raw.set.stat==="4d6"?"4d6":"3d6",
               mode:raw.set&&raw.set.mode==="chaos"?"chaos":"plausible",
               asi:!(raw.set&&raw.set.asi===false),
               gold:cfgGold,goldPlus:cfgGoldPlus};
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
    // equipment kit — validated by REPLAYING the ritual's own availability chain against a scratch
    // draft (D-037 needs/fits + the D-038 purse), never by re-summing prices. The chain is the only
    // definition of what a roll could have produced, fallbacks and all, so validator and ritual
    // cannot drift apart: a kit that empties the purse legitimately leaves the cheapest pack on the
    // table, and a naive total would have rejected exactly that legal character.
    const scratch={set,steps:{cls:out.cls,feature:out.feature}};
    const eq=S.equip||{};const ki=intIn(eq.value,0,K.kits.length-1);
    if(ki==null)return {ok:false,err:"equip"};
    if(genKitIdx(scratch,K).indexOf(ki)<0)return {ok:false,err:"equip"};
    out.equip={rolls:[],pick:!!eq.pick,value:ki};
    scratch.steps.equip=out.equip;
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
    const gp=S.gearPack||{};if(!genPacksAvail(scratch).includes(gp.value))return {ok:false,err:"gearPack"};
    out.gearPack={rolls:[],pick:!!gp.pick,value:gp.value};
    scratch.steps.gearPack=out.gearPack;
    const su=S.sundries||{};
    if(!Array.isArray(su.value)||su.value.length!==2)return {ok:false,err:"sundries"};
    if(!genSundriesAvail(scratch,0).includes(su.value[0])
       ||!genSundriesAvail(scratch,1,su.value[0]).includes(su.value[1]))return {ok:false,err:"sundries"};
    out.sundries={rolls:[],pick:!!su.pick,value:[...su.value]};
    // species tables — a BOON table (D-035) is optional: the crew may have boons off, and a phone
    // on a stale cfg must not have its whole character rejected over one absent extra.
    for(const t of (GEN_SPECIES[sp].tables||[])){
      const key="sp:"+t.id,rec=S[key]||{};
      if(t.kind==="skill"){
        if(!t.entries.includes(rec.value)){if(t.boon)continue;return {ok:false,err:key};}
        out[key]={rolls:[],pick:!!rec.pick,value:rec.value};continue;}
      let e=t.entries.find(x=>x.value===rec.value);
      if(!e){if(t.boon)continue;return {ok:false,err:key};}
      // G4 (D-043): the DM's disabled-boon list is the authority. A phone on a stale cfg does not
      // get its character rejected over it — the boon is simply dropped to the no-boon entry.
      if(t.boon&&cfgBoonOff.includes(String(e.value)))e=genBoonNone(t);
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
  // D-038 (B295): noisy armor is a real cost of the cheap heavy recipes — carry the XPHB Stealth
  // penalty onto the card instead of leaving it silent. Reads the POST-swap recipe, so a Str-gate
  // demotion (Chain Mail → Chain Shirt) sheds the penalty with the armor.
  const acStealth=!!A.stealth;
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
  // D-038: whatever the purse didn't spend rides the gear line as coin, the way XPHB's own
  // starting packages hand over their remainder.
  // Coin lands on the card in whole gold — the loose silver and copper of an exact remainder is
  // noise on a level-1 sheet, and a purse under 1 GP simply isn't worth a line.
  const coin=Math.floor(genCoin(p)||0);
  const gear=[kitGear,p.steps.gearPack.value].concat(p.steps.sundries.value)
    .concat(coin>0?[coin+" GP"]:[]).join(", ");
  const tools=[...(K.tools||[])];
  featRecs.forEach(([rec,f])=>{if(f.sub==="tools"&&rec.sub)tools.push(...rec.sub.value);});
  const langs=[...sp.langs,...(K.langs||[])];
  const familiar=p.steps.familiar&&GEN_FAMILIARS[p.steps.familiar.value]?p.steps.familiar.value:null;
  return {name:p.steps.name.value,species:sp.label,cls,size:sizeOv||sp.size,level:1,pb,resists,familiar,
    scores,mods,hp,hd:"1d"+K.hd,ac,acSrc,acStealth,gear,tools,kitName:kit.n,
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
  m.ac=ch.ac;m.acnote=ch.acSrc&&ch.acSrc!=="Unarmored"?ch.acSrc+(ch.acStealth?"; Disadvantage on Stealth":""):"";
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
  // D-044: quirk and trinket no longer squat in the roster's notes field — that's the player's own
  // space. They live on the card, where they can be edited (genFlavorEditor).
  return {id:payload.id,name:ch.name,notes:"",
    fields,gen:{v:2,payload:clone(payload),pn:playerName||""}};
}
function genLivingPCs(a){return (a.party||[]).map(id=>rosterById(id)).filter(pc=>pc&&pc.gen&&pc.gen.payload);}
function genCrewCounts(a){const c={};genLivingPCs(a).forEach(pc=>{const v=pc.gen.payload.steps.cls&&pc.gen.payload.steps.cls.value;if(v)c[v]=(c[v]||0)+1;});return c;}
function genCrewUrl(id){return location.origin+location.pathname.replace(/[^/]*$/,"")+"index.html?crew="+encodeURIComponent(id);}
function genIngestPayload(a,rawPayload,pn,pid){
  const v=validateGenPayload(rawPayload,a.crew&&a.crew.set);if(!v.ok)return null;
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
  const fl=genFlavorOf(ch,opts);
  const rows=[];
  if(opts.dead)rows.push(`<div class="gk-dead-line">Fallen</div>`);
  const editable=!opts.dead&&!!opts.flavorKey;
  ["quirk","trinket"].forEach(k=>{
    if(!fl[k]&&!editable)return;
    rows.push(`<div class="gk-flrow"><b>${k==="quirk"?"Quirk":"Trinket"}:</b>
      <span class="gk-flv">${esc(fl[k]||"")}</span>${editable
        ?`<button class="gk-linklike" data-gkfl="${k}">${fl[k]?"Edit":"Add"}</button>`:""}</div>`);});
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
// D-044: quirk and trinket are editable on the card, through the same per-character overlay the
// gear editor uses (`pc.gen.flavor` DM-side, localStorage on phones) — never on the wire.
function genFlavorOf(ch,opts){
  const ov=(opts&&opts.flavor)||null;
  return {quirk:ov&&ov.quirk!=null?ov.quirk:(ch.flavor&&ch.flavor.quirk)||"",
          trinket:ov&&ov.trinket!=null?ov.trinket:(ch.flavor&&ch.flavor.trinket)||""};
}
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
  if(handlers.onFlavor)host.querySelectorAll("[data-gkfl]").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.gkfl,cur=b.closest(".gk-flrow").querySelector(".gk-flv").textContent.trim();
    showPopover(b,`<div class="gk-flpop"><input type="text" class="popinput" id="gkFlIn" maxlength="90"
      placeholder="${k==="quirk"?"Quirk":"Trinket"}" value="${esc(cur)}">
      <button class="btn primary sm" id="gkFlOk" style="width:auto">Save</button></div>`);
    const inp=$("#gkFlIn");if(inp)inp.focus();
    const ok=$("#gkFlOk");
    if(ok)ok.addEventListener("click",()=>{
      handlers.onFlavor(k,String(inp.value||"").replace(/[<>]/g,"").trim().slice(0,90));
      if(typeof closePopover==="function")closePopover();});}));
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
  if(pc)o={...o,res:(pc.gen&&pc.gen.res)||{},pips:"live",hp:(pc.gen&&pc.gen.hp)||null,
           flavor:(pc.gen&&pc.gen.flavor)||null,flavorKey:pc.id};
  // D-021: the statblock modal is the generated member's home surface — notes live at its bottom.
  openModalRaw(`<div id="gkCardHost"></div>
    ${pc?`<label class="f gk-noterow">Notes<textarea id="gkNotes" placeholder="Anything worth remembering about ${esc(ch.name)}">${esc(pc.notes||"")}</textarea></label>`:""}
    <div class="mrow">${o.pcId?`<button class="btn ghost sm" id="gkDied" style="width:auto">Mark dead</button><button class="btn ghost sm" id="gkPage" style="width:auto">Full page</button>`:""}<button class="btn ghost sm" id="gkClose" style="width:auto">Close</button></div>`);
  const rolledGear=ch.gear;
  genMountCard($("#gkCardHost"),ch,o,{
    onRes:pc?(k,used)=>{pc.gen.res=pc.gen.res||{};pc.gen.res[k]=used;saveRoster();}:null,
    gearGet:pc?()=>(pc.gen&&pc.gen.gear!=null?pc.gen.gear:rolledGear):null,
    gearDirty:pc?()=>!!(pc.gen&&pc.gen.gear!=null):null,
    onGear:pc?s=>{if(s==null)delete pc.gen.gear;else pc.gen.gear=String(s).slice(0,400);saveRoster();}:null,
    onFlavor:pc?(k,v)=>{pc.gen.flavor=pc.gen.flavor||{};pc.gen.flavor[k]=v;saveRoster();
      openGenCard(a,payload,o);}:null});
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
// to override (D-011). Identity is typed. A "Roll the rest" fast-path fills everything but the name,
// and on a finished ritual that same button becomes a full Reroll (G1, D-039).
// ═══════════════════════════════════════════════════════════════════════════
let _genR=null; // {mode, pn, editing, draft, ctx (the draft config, for Reroll), done, more:{}}
// Font Awesome gear (free solid) — the crew-settings button in the roster header (D-021).
// Font Awesome filter (free solid). Sized on the element: a constant is only as portable as its
// intrinsic size, and .gk-filt gives it no box of its own (B292).
const GEN_FILT_ICON='<svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M3.9 54.9C10.5 40.9 24.5 32 40 32l432 0c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9 320 448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6l0-79.1L9 97.4C-.7 85.4-2.8 68.8 3.9 54.9z"/></svg>';
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
  return id;
}
function genStepInfo(d,id){
  if(id==="species")return `${genDieLabel(genSpeciesPool().length)} over the available species. Rerolling replaces the species and its rolled traits.`;
  if(id==="stats")return d.set.stat==="4d6"?"Six rolls of 4d6, lowest die dropped, in order STR to CHA. Any landed score can be edited by hand.":"Six rolls of 3d6, in order STR to CHA. Any landed score can be edited by hand.";
  if(id==="cls")return d.set.mode==="chaos"?"d12 over all twelve classes.":"d6 over the three classes that best fit the rolled scores; the rest are pickable below them.";
  if(id==="asi")return "+2 and +1 to two different abilities. The +2 goes to the class's main ability; the +1 goes where it actually raises a modifier, which means an odd score. The suggestion is preselected; apply it or change it.";
  if(id==="feat")return "d10 over the ten origin feats. Feats with internal choices roll those too.";
  if(id==="feat2")return "The species grants a second origin feat: d10 over the ten, the first feat rerolled.";
  if(id==="skills"){const K=GEN_CLASSES[genClsOf(d)||"Fighter"];
    return `${K.skills.n} rolls on ${genDieLabel(K.skills.from.length)} over the class skill list, duplicates rerolled.`;}
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];
    if(K&&K.featureOpt&&K.featureOpt.kind==="expertise")return "Two of the rolled skills, duplicates rerolled.";
    if(K&&K.featureOpt)return `${genDieLabel(K.featureOpt.options.length)} over the ${K.featureOpt.options.length} options.`;
    return "";}
  if(id==="equip"){const K=GEN_CLASSES[genClsOf(d)];const n=K?genKitIdx(d,K).length:0;
    const die=genSpanDie(genSpanFor(Math.max(n,1)),n);
    const fo=K&&K.featureOpt&&!K.featureOpt.kind&&d.steps.feature
      ?(K.featureOpt.options||[]).find(x=>x.value===d.steps.feature.value):null;
    const narrowed=fo&&fo.fits&&n<K.kits.length
      ?` The table is down to the kits that suit ${fo.label}.`:"";
    return `${die} over the class kit table. Every item is within the class's training; some kits unlock with a class feature.${narrowed}${genPurseNote(d,"equip")}`;}
  if(id==="cantrips")return `${genCantripCount(d)} rolls over the class cantrips, one table each: the first defaults to Damaging, the rest to All. Duplicates and cantrips granted elsewhere reroll.`;
  if(id==="spells"){const K=GEN_CLASSES[genClsOf(d)];
    return `${K.caster.prepared} rolls over the class level-1 spells, one table each: the first defaults to Damaging, the rest to All. Duplicates and spells granted elsewhere reroll.`;}
  if(id==="familiar"){const kind=genFamiliarKind(d);
    return kind==="chain"?"d8 over the eight Pact of the Chain special forms; the familiar's statblock joins the card."
      :"Find Familiar is known: "+genDieLabel(GEN_FAMILIAR_BEASTS.length)+" over the beast forms; the familiar's statblock joins the card.";}
  if(id==="gearPack"){const av=genPacksAvail(d);
    return `${genSpanDie(genSpanFor(av.length),av.length)} over the equipment packs.${genPurseNote(d,"gearPack")}`;}
  if(id==="sundries"){const A=genSundriesAvail(d,0),B=genSundriesAvail(d,1,A[0]);
    return `Two rolls, one on each sundries list (${genSpanDie(genSpanFor(A.length),A.length)} and ${genSpanDie(genSpanFor(B.length),B.length)}).${genPurseNote(d,"sundries")}`;}
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));if(!t)return "";
    if(t.kind==="skill")return `${genDieLabel(t.entries.length)} over the listed skills; skills already owned reroll.`;
    return `d${t.die} on the ${t.label} table.`;}
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
    return {die:span.die,rows:top3.map((c,i)=>({span:genSpanText(span,i),label:c,value:c,hit:s&&s.value===c})),
      moreRows:GEN_CLASS_LIST.filter(c=>!top3.includes(c)).map(c=>({span:"·",label:c,value:c,hit:s&&s.value===c}))};
  }
  if(id==="species"){const pool=genSpeciesPool(),span=genSpanFor(pool.length);
    return {die:span.die,note:span.reroll?"reroll over "+pool.length:"",
      rows:pool.map((v,i)=>({span:genSpanText(span,i),label:GEN_SPECIES[v].label,value:v,hit:s&&s.value===v}))};}
  if(id==="feat"||id==="feat2"){
    // The two origin feats stay distinct (you can't take the same feat twice), so the one the other
    // step already took shows struck through rather than silently missing.
    const other=id==="feat2"?(d.steps.feat&&d.steps.feat.value):(d.steps.feat2&&d.steps.feat2.value);
    return {die:10,rows:GEN_FEATS.map((f,i)=>({span:String(i+1),label:f.n,value:f.n,
      hit:s&&s.value===f.n,off:f.n===other?"taken":""}))};}
  if(id==="skills"&&K)return mk(K.skills.from);
  if(id==="feature"&&K&&K.featureOpt){
    if(K.featureOpt.kind==="expertise"){const own=(d.steps.skills&&d.steps.skills.value)||[];return own.length?mk(own):null;}
    const opts=K.featureOpt.options,span=genSpanFor(opts.length);
    return {die:span.die,rows:opts.map((o,i)=>({span:genSpanText(span,i),label:o.label,value:o.value,hit:s&&s.value===o.value})),
      note:span.reroll?"reroll over "+opts.length:""};
  }
  if(id==="equip"&&K){const avail=genKitIdx(d,K),span=genSpanFor(avail.length);
    return {die:span.die,rows:avail.map((ki,i)=>({span:genSpanText(span,i),label:K.kits[ki].n,sub:K.kits[ki].gear,value:ki,hit:s&&s.value===ki})),
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
      rows:list.map((v,i)=>({span:genSpanText(span,i),label:v,value:v,hit:s&&s.value===v}))};}
  if(id==="gearPack"){const av=genPacksAvail(d),span=genSpanFor(av.length);
    const contents=n=>(GEN_PACK_CONTENTS[n]||[]).join(", ");
    return {die:span.die,rows:av.map((p,i)=>({span:genSpanText(span,i),label:p,sub:contents(p),value:p,hit:s&&s.value===p})),
      note:span.reroll?"reroll over "+av.length:""};}
  if(id==="sundries"){
    const one=(list,which)=>{const span=genSpanFor(list.length);
      return {title:`${which?"Second":"First"} roll (${genSpanDie(span,list.length)})`,die:span.die,
        rows:list.map((v,i)=>({span:genSpanText(span,i),label:v,value:v,
          hit:s&&Array.isArray(s.value)&&s.value[which]===v}))};};
    const A=genSundriesAvail(d,0);
    return {pair:[one(A,0),one(genSundriesAvail(d,1,s&&Array.isArray(s.value)?s.value[0]:null),1)]};}
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));if(!t)return null;
    if(t.kind==="skill"){const die=t.die||genDieFor(t.entries.length);
      const owned=genOwnedSkillNames(d,true);
      return {die,note:die>t.entries.length?"reroll over "+t.entries.length:"",
        rows:t.entries.map((n,i)=>({span:String(i+1),label:n,value:n,hit:s&&s.value===n,
          off:s&&s.value===n?"":(owned.has(n)?"already yours":"")}))};}
    const off=t.boon?genBoonOff(d):[];
    return {die:t.die,rows:t.entries.filter(e=>e.value===false||!off.includes(String(e.value)))
      .map(e=>({span:e.lo===e.hi?String(e.lo):e.lo+"-"+e.hi,label:e.label,value:e.value,hit:s&&s.value===e.value}))};}
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
  if(id==="asi")return `<b data-gkedit="asi">+2 ${s.value[0].toUpperCase()} / +1 ${s.value[1].toUpperCase()}</b> <span class="gk-dim">${s.pick?"chosen":"suggested"}</span>`;
  if(id==="equip"){const K=GEN_CLASSES[genClsOf(d)];const k=K&&K.kits[s.value];
    return `<b data-gkedit="equip">${esc(k?k.n:String(s.value))}</b> ${genDiceChips(s)} <span class="gk-dim">${esc(k?k.gear:"")}</span>`;}
  if(id==="gearPack")return `<b data-gkedit="gearPack">${esc(String(s.value))}</b> ${genDiceChips(s)} <span class="gk-dim">${esc((GEN_PACK_CONTENTS[s.value]||[]).join(", "))}</span>`;
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
  if(id==="asi"){const dflt=genAsiDefault(d),cur=s?s.value:dflt;
    return `<span class="gk-dim">Suggested: +2 ${dflt[0].toUpperCase()} / +1 ${dflt[1].toUpperCase()}.</span>`
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
// no printed dice strings (the 3D roll is the theater). Cells are editable once all six landed.
// D-044: "Type them in" is a header button beside the roll, and it opens THESE fields rather than
// a second row of inputs under them — one place to type a score, not two.
function genStatsRowsHTML(d,typing){
  const s=d.steps.stats,n=s&&!s.pick?s.rolls.length:0;
  const complete=!!s&&(s.pick||n===6);
  const typed=typing&&_genR?_genR.typed:null;
  return `<div class="gk-ab6">${GEN_ABILS.map((a,i)=>{
    const rolled=s&&s.value&&s.value[i]!=null&&(s.pick||i<n);
    const next=s?(!s.pick&&n===i):i===0; // one walking Roll button, STR first
    if(typed)return `<div class="gk-ab cc-ab-${a}">
      <span class="gk-ab-k">${a.toUpperCase()}</span>
      <input class="gk-ab-in" type="number" min="3" max="20" data-gkstat="${i}" value="${typed[i]==null?"":typed[i]}"
        placeholder="10" aria-label="${GEN_ABIL_LABEL[a]} score">
    </div>`;
    return `<div class="gk-ab cc-ab-${a}${next?" gk-ab-next":""}">
      <span class="gk-ab-k">${a.toUpperCase()}</span>
      ${rolled?`<input class="gk-ab-in" type="number" min="3" max="20" data-gkstat="${i}" value="${s.value[i]}"${complete?"":" disabled"} aria-label="${GEN_ABIL_LABEL[a]} score">`
        :next?`<button class="btn primary sm gk-ab-roll" data-gkroll="stats" aria-label="Roll ${GEN_ABIL_LABEL[a]}">${D20_ICON}<span>Roll</span></button>`
        :`<span class="gk-ab-dot">·</span>`}
    </div>`;}).join("")}</div>`;
}
function genTableHTML(d,id,tbl){
  if(tbl.pair)return tbl.pair.map(p=>`<div class="gk-tbl-h">${esc(p.title)}</div>`+genTableHTML(d,id,p)).join("");
  const long=tbl.rows.length>12;
  const row=r=>`<button class="gk-tr${r.hit?" gk-hit":""}${r.off?" gk-tr-off":""}"${r.off?" disabled":""} data-gkopt="${esc(String(r.value))}" data-gkstep="${id}">
      <span class="gk-td">${esc(r.span)}</span><span class="gk-tl">${esc(r.label)}${r.sub?` <span class="gk-dim">${esc(r.sub)}</span>`:""}</span>${r.off?`<span class="gk-dim gk-tr-why">${esc(r.off)}</span>`:""}</button>`;
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
// ── The closing summary (D-041) ──────────────────────────────────────────────────────────────
// Identity left the step list: the ritual ends on the rolls, then this screen recaps the headline
// facts beside the three identity fields. Name, quirk and trinket each roll on their own (D-042).
// The DM never types a name — theirs is rolled on arrival; a player's is required before the card.
function genSummaryScores(d){
  const base=(d.steps.stats&&d.steps.stats.value)||[];
  const out=GEN_ABILS.map((a,i)=>({a,v:Number(base[i])||10}));
  if(d.set.asi&&d.steps.asi&&Array.isArray(d.steps.asi.value)){
    const [big,small]=d.steps.asi.value;
    out.forEach(x=>{if(x.a===big)x.v=Math.min(20,x.v+2);if(x.a===small)x.v=Math.min(20,x.v+1);});
  }
  return out.map(x=>({...x,m:Math.floor((x.v-10)/2)}));
}
function genSummaryFactsHTML(d){
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null;
  const kit=K&&d.steps.equip?K.kits[d.steps.equip.value]:null;
  const rows=[["Species",GEN_SPECIES[d.sp]?GEN_SPECIES[d.sp].label:d.sp],["Class",cls||""]];
  return `<div class="gk-step gk-sum-facts">
    <div class="gk-sum-rows">${rows.map(([k,v])=>`<div class="gk-sum-row">
      <span class="gk-sum-k">${esc(k)}</span><span class="gk-sum-v">${esc(v)}</span></div>`).join("")}</div>
    <div class="gk-ab6 gk-ab6-sum">${genSummaryScores(d).map(x=>`<div class="gk-ab cc-ab-${x.a}">
      <span class="gk-ab-k">${x.a.toUpperCase()}</span><span class="gk-ab-s">${x.v}</span>
      <span class="gk-ab-m">${sgn(x.m)}</span></div>`).join("")}</div>
    ${kit?`<div class="gk-sum-gear"><b>${esc(kit.n)}</b> <span class="gk-dim">${esc(kit.gear)}</span></div>`:""}
  </div>`;
}
function genIdFieldHTML(d,id,label,ph){
  const v=d.steps[id]&&d.steps[id].value?String(d.steps[id].value):"";
  return `<div class="gk-idrow">
    <div class="gk-step-h"><span class="gk-step-l">${esc(label)}</span>
      <span class="gk-step-acts"><button class="gk-roll-ico" data-gkidroll="${id}" title="Roll ${esc(label.toLowerCase())}" aria-label="Roll ${esc(label.toLowerCase())}">${D20_ICON}</button></span></div>
    <input type="text" class="popinput gk-idf" id="gkId_${id}" maxlength="${id==="name"?28:90}"
      placeholder="${esc(ph)}" value="${esc(v)}" aria-label="${esc(label)}"${v?` title="${esc(v)}"`:""}>
  </div>`;
}
function renderGenSummary(){
  const R=_genR;if(!R)return;
  const d=R.draft,host=$("#gkR");if(!host)return;
  // The DM's name is rolled, never typed (D-041) — roll it once, on arrival.
  if(R.mode==="dm"&&!(d.steps.name&&d.steps.name.value))genRollIdentity(d,"name");
  const named=!!(d.steps.name&&String(d.steps.name.value||"").trim());
  host.innerHTML=`<div class="gk-sum">
      ${genSummaryFactsHTML(d)}
      <div class="gk-step gk-active gk-sum-id">
        ${genIdFieldHTML(d,"name","Name","Type or roll a name")}
        ${genIdFieldHTML(d,"quirk","Quirk","Optional")}
        ${genIdFieldHTML(d,"trinket","Trinket","Optional")}
      </div>
    </div>
    <div class="mrow gk-foot">
      <button class="btn ghost sm" id="gkBackSteps" style="width:auto">Back</button>
      <button class="btn ghost sm gk-allbtn" id="gkAgain" style="width:auto">${D20_ICON}<span>Reroll</span></button>
      <button class="btn primary sm" id="gkFinish" style="width:auto"${named?"":" disabled"}>View the card</button>
    </div>`;
  bindGenSummary();
}
function bindGenSummary(){
  const R=_genR,d=R.draft,host=$("#gkR");
  host.querySelectorAll("[data-gkidroll]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gkidroll,rec=genRollIdentity(d,id);
    if(rec&&rec.rolls&&rec.rolls.length)genFire3D(id==="quirk"?"Quirk":"Trinket",
      [{rolls:rec.rolls,die:rec.die}],`${id==="quirk"?"Quirk":"Trinket"}: ${rec.value}`);
    renderGenSummary();}));
  ["name","quirk","trinket"].forEach(id=>{
    const inp=$("#gkId_"+id);if(!inp)return;
    inp.addEventListener("change",()=>{genApplyPick(d,id,inp.value);renderGenSummary();});
    if(id==="name")inp.addEventListener("input",()=>{
      const fin=$("#gkFinish");if(fin)fin.disabled=!inp.value.trim();});});
  const back=$("#gkBackSteps");if(back)back.addEventListener("click",()=>{R.phase="steps";renderGenRitual();});
  bindGenAgain();
  const fin=$("#gkFinish");if(fin)fin.addEventListener("click",()=>{
    const nm=$("#gkId_name");if(nm&&nm.value.trim())genApplyPick(d,"name",nm.value);
    genApplyPick(d,"quirk",($("#gkId_quirk")||{}).value||"");
    genApplyPick(d,"trinket",($("#gkId_trinket")||{}).value||"");
    genShowCard();});
}
// G1 (D-039), scoped by D-044: Reroll rerolls THIS SCREEN, not the whole modal. On the rolls that
// is a fresh draft on the same crew config; on the summary it is the identity, which is all that
// screen owns. A whole new character from the summary is one Back away.
function bindGenAgain(){
  const R=_genR,again=$("#gkAgain");if(!again)return;
  again.addEventListener("click",()=>{
    if(R.phase==="summary"){
      const d=R.draft;
      ["name","quirk","trinket"].forEach(id=>genRollIdentity(d,id));
      const t=d.steps.trinket;
      if(t&&t.rolls&&t.rolls.length)genFire3D("Trinket",[{rolls:t.rolls,die:t.die}],"Trinket: "+t.value);
      renderGenSummary();return;}
    R.draft=genRollAll(genNewDraft(R.ctx));R.editing=null;R.more={};R.typed=null;R.phase="steps";renderGenRitual();});
}
function genShowCard(){
  const R=_genR,d=R.draft;
  const p=genCompletePayload(d);if(!p){toast("Not finished yet.");return;}
  const v=validateGenPayload(p);if(!v.ok){toast("Something is off with this roll ("+v.err+").");return;}
  const ch=deriveGenChar(v.clean);
  R.phase="card";
  $("#gkR").innerHTML=`<div id="gkFinCard"></div>
    <div class="mrow gk-foot"><button class="btn ghost sm" id="gkBack" style="width:auto">Back</button>
    <button class="btn primary sm" id="gkSave" style="width:auto">${R.mode==="dm"?"Add to the crew":"Join the crew"}</button></div>`;
  genMountCard($("#gkFinCard"),ch,{pn:R.pn||"",pips:"off"},{});
  $("#gkBack").addEventListener("click",()=>{R.phase="summary";renderGenSummary();});
  $("#gkSave").addEventListener("click",()=>{R.done(v.clean);});
}
function renderGenRitual(){
  const R=_genR;if(!R)return;
  R.phase="steps";
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
    const editing=R.editing===id||(id==="asi"&&active&&!done);
    const isMulti=["skills","cantrips","spells","sundries"].includes(id)||(id==="feature"&&s&&s.kind==="expertise");
    const rollable=id!=="asi"&&!(id==="stats"&&s&&s.pick);
    const tbl=(active&&!done&&id!=="stats"&&id!=="asi")||(editing&&id!=="asi")?genStepTable(d,id):null;
    if(tbl&&!tbl.pair)tbl.moreOpen=!!R.more[id];
    // v4 follow-up: stats join the header roll like every other step — it rolls all remaining
    // abilities at once (the walking per-cell button stays for the one-at-a-time ritual).
    const wholeRoll=rollable&&(active||done)&&!needsSub;
    const info=genStepInfo(d,id);
    // D-044: roll filters (the D-024 Damaging/All strip) hide behind a filter button in the header
    const hasTabs=(id==="cantrips"||id==="spells")&&!!genTabStripHTML(d,id);
    return `<div class="gk-step gk-${state}" data-step="${id}">
      <div class="gk-step-h"><span class="gk-step-l">${esc(genStepLabel(d,id))}${info?`<button class="gk-q" data-gkq="${id}" aria-label="How this step works">?</button>`:""}</span>
        <span class="gk-step-acts">${id==="stats"&&!genStepDone(d,id)
          ?`<button class="btn ghost sm gk-typein" data-gktype="1" style="width:auto">${R.typed?"Roll them":"Type them in"}</button>`:""}${hasTabs
          ?`<button class="gk-filt${R.filt[id]?" gk-filt-on":""}" data-gkfilt="${id}" title="Roll filters" aria-label="Roll filters">${GEN_FILT_ICON}</button>`:""}${wholeRoll?(done
          ?`<button class="gk-roll-ico" data-gkroll="${id}"${id==="stats"?' data-gkall="1"':""} title="Reroll" aria-label="Reroll">${D20_ICON}</button>`
          :`<button class="btn primary sm gk-roll" data-gkroll="${id}"${id==="stats"?' data-gkall="1"':""}>${D20_ICON}<span>${id==="stats"?"Roll all":"Roll"}</span></button>`):""}</span></div>
      ${id==="stats"?genStatsRowsHTML(d,!!R.typed):""}
      ${id!=="stats"&&(done||s&&s.value!=null)?`<div class="gk-step-v">${genStepValueHTML(d,id)}</div>`:""}
      ${hasTabs&&R.filt[id]?genTabStripHTML(d,id):""}
      ${tbl&&!(isMulti&&editing)?genTableHTML(d,id,tbl):""}
      ${needsSub?genSubEditorHTML(d,id):""}
      ${editing&&id!=="stats"?`<div class="gk-editor">${genEditorHTML(d,id)}</div>`:""}
    </div>`;
  }).join("");
  host.innerHTML=`<div class="gk-steps">${rows}</div>
    <div class="mrow gk-foot">
      <button class="btn ghost sm" id="gkCancel" style="width:auto">Cancel</button>
      <button class="btn ghost sm gk-allbtn" id="${complete?"gkAgain":"gkAll"}" style="width:auto">${D20_ICON}<span>${complete?"Reroll":"Roll the rest"}</span></button>
      ${complete?`<button class="btn primary sm" id="gkNext" style="width:auto">Next</button>`:""}
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
      const i=Number(inp.dataset.gkstat);
      const n=inp.value===""?null:Math.round(Number(inp.value));
      if(n!=null&&(!Number.isFinite(n)||n<3||n>20)){toast("Scores run 3 to 20.");return;}
      if(R.typed){
        R.typed[i]=n;
        if(R.typed.every(x=>x!=null)&&genApplyPick(d,"stats",R.typed))R.typed=null;
        R.editing=null;renderGenRitual();return;}
      const st=d.steps.stats;if(!st||!Array.isArray(st.value)||st.value.length!==6)return;
      const vals=st.value.slice();vals[i]=inp.value;
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
    if(id==="asi"){const a2=$("#gkAsi2").value,a1=$("#gkAsi1").value;
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
    if(!ok){toast("That choice doesn't fit here.");return;}
    R.editing=null;renderGenRitual();}));
  // D-044: type the scores straight into the grid; a second click hands them back to the dice.
  const typeBtn=host.querySelector("[data-gktype]");
  if(typeBtn)typeBtn.addEventListener("click",e=>{
    e.stopPropagation();
    if(R.typed){R.typed=null;}
    else{const st=d.steps.stats;
      R.typed=GEN_ABILS.map((a,i)=>st&&st.value&&st.value[i]!=null&&(st.pick||i<(st.rolls||[]).length)?st.value[i]:null);
      delete d.steps.stats;}
    R.editing=null;renderGenRitual();});
  host.querySelectorAll("[data-gkfilt]").forEach(b=>b.addEventListener("click",e=>{
    e.stopPropagation();const id=b.dataset.gkfilt;R.filt[id]=!R.filt[id];renderGenRitual();}));
  const all=$("#gkAll");if(all)all.addEventListener("click",()=>{R.typed=null;genRollAll(d);R.editing=null;renderGenRitual();});
  bindGenAgain();
  // The rolls are done: identity is the next screen, not the last step (D-041).
  const next=$("#gkNext");if(next)next.addEventListener("click",()=>{R.phase="summary";renderGenSummary();});
  const cancel=$("#gkCancel");if(cancel)cancel.addEventListener("click",()=>{_genR=null;closeModal();});
}
function openGenRitual(ctx){
  const set=ctx.set,ritual=ctx.spMode==="ritual";
  // The draft config is kept so the G1 Reroll can mint a fresh draft on the same crew settings.
  const dcfg={sp:ctx.sp,spMode:ctx.spMode,boons:ctx.boons,boonOff:ctx.boonOff,trinketTab:ctx.trinketTab,
    set,counts:ctx.counts||{},tables:ctx.tables||null};
  _genR={mode:ctx.mode,pn:ctx.pn||"",editing:null,more:{},filt:{},typed:null,ctx:dcfg,
    draft:genNewDraft(dcfg),done:ctx.done};
  openModalRaw(`<h3 style="margin-bottom:4px">Roll a ${ritual?"character":esc(GEN_SPECIES[ctx.sp].label.toLowerCase())}</h3>
    <p class="hint" style="margin:0 0 10px">${esc(set.stat)} scores, ${set.mode==="chaos"?"chaos class":"plausible class"}, ASI ${set.asi?"on":"off"}. Roll each step, or tap an option to choose it. Tap any result to change it.</p>
    <div id="gkR"></div>`);
  const m=$("#modal");if(m)m.classList.add("gk-host");
  renderGenRitual();
}
function openGenRitualDM(a){
  openGenRitual({sp:a.crew.sp,spMode:a.crew.spMode,boons:a.crew.boons,boonOff:a.crew.boonOff,
    trinketTab:a.crew.trinketTab,set:a.crew.set,counts:genCrewCounts(a),tables:genSpellTables(),mode:"dm",done:payload=>{
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
      <label class="gk-f"><span>Trinkets</span>${genSel("crewTrink",["srd","forge"],genCleanTrinketTab(a.crew.trinketTab),["Classic (SRD)","Our own list"])}</label>
      <label class="gk-f"><span>Species boons</span>${genSel("crewBoons",["on","off"],a.crew.boons?"on":"off",["Rolled","Off"])}</label>
      ${a.crew.boons?genBoonListHTML(a):""}
      <label class="gk-f"><span>Scores</span>${genSel("crewStat",["3d6","4d6"],a.crew.set.stat,["3d6, in order","4d6 drop lowest"])}</label>
      <label class="gk-f"><span>Class</span>${genSel("crewMode",["plausible","chaos"],a.crew.set.mode,["Plausible (best fits)","Chaos (any)"])}</label>
      <label class="gk-f"><span>Background ASI</span>${genSel("crewAsi",["on","off"],a.crew.set.asi?"on":"off",["+2 / +1","Off"])}</label>
      <label class="gk-f"><span>Starting gold</span>${genSel("crewGold",["off","on"],a.crew.set.gold?"on":"off",["Roll anything","Class budget"])}</label>
      ${a.crew.set.gold?`<label class="gk-f"><span>Extra gold</span><input type="number" id="crewGoldPlus" min="0" step="5" value="${genGoldPlus(a.crew.set.goldPlus)}"></label>`:""}
    </div>
    <p class="hint">Boons are the optional extras a species pack offers on top of its rules — the kobold's Draconic Boon table today.</p>
    <p class="hint">${a.crew.set.gold
      ?"Gear rolls stay inside the class's own XPHB starting gold (Fighter 155, Cleric 110, Wizard 55, and so on). Anything the purse can't cover drops off the table before the dice, and the remainder lands on the card as coin. Extra gold is added to every class alike. Spellbooks, holy symbols and spellcasting foci don't count against it."
      :"Every kit, pack and sundry is on the table whatever it costs — including plate armor and firearms no level-1 character could pay for."}</p>
    <div class="mrow"><button class="btn ghost sm" id="crewCfgClose" style="width:auto">Close</button></div>`);
    const sel=(id,fn)=>{const el=$(id);if(el)el.addEventListener("change",()=>{fn(el.value);saveAdv();crewPushConfig(a);});};
    sel("#crewSpMode",v=>{a.crew.spMode=v==="ritual"?"ritual":"locked";draw();});
    sel("#crewTrink",v=>{a.crew.trinketTab=genCleanTrinketTab(v);});
    sel("#crewBoons",v=>{a.crew.boons=v==="on";draw();}); // the per-boon list appears with it
    $("#modal").querySelectorAll("[data-crewboon]").forEach(cb=>cb.addEventListener("change",()=>{
      const v=cb.dataset.crewboon,off=genCleanBoonOff(a.crew.boonOff);
      a.crew.boonOff=cb.checked?off.filter(x=>x!==v):[...off,v];
      saveAdv();crewPushConfig(a);}));
    sel("#crewSp",v=>{if(GEN_SPECIES[v])a.crew.sp=v;});
    sel("#crewStat",v=>{a.crew.set.stat=v==="4d6"?"4d6":"3d6";});
    sel("#crewMode",v=>{a.crew.set.mode=v==="chaos"?"chaos":"plausible";});
    sel("#crewAsi",v=>{a.crew.set.asi=v==="on";});
    sel("#crewGold",v=>{a.crew.set.gold=v==="on";draw();}); // the extra-gold field appears with it
    const gpEl=$("#crewGoldPlus");
    if(gpEl)gpEl.addEventListener("change",()=>{
      a.crew.set.goldPlus=genGoldPlus(gpEl.value);gpEl.value=a.crew.set.goldPlus;
      saveAdv();crewPushConfig(a);});
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
  const cfg={name:advDName(a),sp:a.crew.sp,spMode:a.crew.spMode||"locked",boons:a.crew.boons!==false,
    boonOff:genCleanBoonOff(a.crew.boonOff),trinketTab:genCleanTrinketTab(a.crew.trinketTab),
    set:{...a.crew.set},tables:genSpellTables()};
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
function crewFlavorGet(payloadId){try{const o=JSON.parse(localStorage.getItem("mf_crewfl:"+payloadId)||"null");return (o&&typeof o==="object")?o:null;}catch(e){return null;}}
function crewFlavorSet(payloadId,k,v){try{const o=crewFlavorGet(payloadId)||{};o[k]=String(v||"").slice(0,90);
  localStorage.setItem("mf_crewfl:"+payloadId,JSON.stringify(o));}catch(e){}}
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
          hp:crewHpGet(v.clean.id)||{cur:ch.hp,tmp:0},hpEdit:true,
          flavor:crewFlavorGet(v.clean.id),flavorKey:v.clean.id},
        {onRes:(k,used)=>crewResSet(v.clean.id,k,used),
         hpGet:()=>crewHpGet(v.clean.id)||{cur:ch.hp,tmp:0},
         onHp:s=>{crewHpSet(v.clean.id,s);crewPushHp(s);},
         gearGet:()=>{const g=crewGearGet(v.clean.id);return g!=null?g:ch.gear;},
         gearDirty:()=>crewGearGet(v.clean.id)!=null,
         onGear:s=>crewGearSet(v.clean.id,s),
         onFlavor:(k,val)=>{crewFlavorSet(v.clean.id,k,val);renderCrewScreen();}});
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
  openGenRitual({sp,spMode:cfg.spMode==="ritual"?"ritual":"locked",boons:cfg.boons!==false,boonOff:genCleanBoonOff(cfg.boonOff),
    trinketTab:genCleanTrinketTab(cfg.trinketTab),set:cfg.set||{},counts:crewCounts(),tables:cfg.tables||null,mode:"crew",pn:_crew.pn,done:async payload=>{
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
