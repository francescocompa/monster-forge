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

// ── Species packs (D-001) ─────────────────────────────────────────────────────
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
          sub:{id:"craftskill",label:"Craftiness skill",die:6,kind:"skill",
               entries:["Arcana","Investigation","Medicine","Sleight of Hand","Survival"]}},
        {lo:3,hi:4,label:"Defiance",value:"defiance"},
        {lo:5,hi:6,label:"Draconic Sorcery",value:"sorcery",
          sub:{id:"cantrip",label:"Sorcerer cantrip",die:20,kind:"cantrip",
               entries:["Acid Splash","Blade Ward","Chill Touch","Dancing Lights","Elementalism",
                 "Fire Bolt","Friends","Light","Mage Hand","Mending","Message","Mind Sliver",
                 "Minor Illusion","Poison Spray","Prestidigitation","Ray of Frost","Shocking Grasp",
                 "Sorcerous Burst","Thunderclap","True Strike"]}}
      ]},
      {id:"wings",label:"Wings",die:20,entries:[
        {lo:1,hi:19,label:"No wings",value:false},
        {lo:20,hi:20,label:"Functional wings: Fly Speed 30 ft.",value:true}
      ]}
    ]
  }
};

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
  chainMail:{kind:"fixed",base:16,label:"Chain Mail"},
  chainMailShield:{kind:"fixed",base:16,shield:true,label:"Chain Mail, Shield"},
  unarmCon:{kind:"unarmored-con",label:"Unarmored Defense"},
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
      {n:"Greatsword and daggers",ac:"unarmCon",weapons:[{w:"greatsword"},{w:"dagger",count:2}],gear:"Greatsword, 2 Daggers"}],
    traits:[{n:"Unarmored Defense",t:"AC equals 10 + Dex modifier + Con modifier while the barbarian isn't wearing armor (a Shield is allowed)."}],
    bonus:[{n:"Rage (2/Long Rest)",t:"While not wearing Heavy armor: +2 bonus to damage with Strength-based weapon attacks, Resistance to Bludgeoning, Piercing, and Slashing damage, and Advantage on Strength checks and Strength saving throws. Lasts 10 minutes while the barbarian attacks a foe or takes damage each round."}],
    res:[{k:"rage",label:"Rage",max:2,per:"Long Rest"}]},
  Bard:{hd:8,saves:["dex","cha"],prim:"cha",sec:"dex",
    skills:{from:GEN_SKILL_NAMES,n:3},
    kits:[
      {n:"Daggers and a lute",ac:"leather",weapons:[{w:"dagger",count:2}],gear:"Leather Armor, 2 Daggers, Lute"},
      {n:"Spear and a drum",ac:"leather",weapons:[{w:"spear"}],gear:"Leather Armor, Spear, Drum"},
      {n:"Light crossbow and a flute",ac:"leather",weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Leather Armor, Light Crossbow, 20 Bolts, Dagger, Flute"}],
    traits:[],
    bonus:[{n:"Bardic Inspiration (d6)",t:"One creature within 60 feet that can hear the bard gains a d6 it can add to one d20 Test within the next hour. Uses per Long Rest equal the bard's Charisma modifier (minimum 1)."}],
    res:[{k:"insp",label:"Bardic Inspiration",max:"chaMin1",per:"Long Rest"}],
    caster:{abil:"cha",cantrips:2,prepared:4,slots:2}},
  Cleric:{hd:8,saves:["wis","cha"],prim:"wis",sec:"con",
    skills:{from:["History","Insight","Medicine","Persuasion","Religion"],n:2},
    kits:[
      {n:"Mace and shield",ac:"chainShirtShield",weapons:[{w:"mace"}],gear:"Chain Shirt, Shield, Mace, Holy Symbol"},
      {n:"Warhammer",ac:"scaleShield",weapons:[{w:"warhammer",noMastery:true}],gear:"Scale Mail, Shield, Warhammer, Holy Symbol",note:"Warhammer needs Protector's Martial training"},
      {n:"Crossbow and mace",ac:"chainShirt",weapons:[{w:"lightxbow"},{w:"mace"}],gear:"Chain Shirt, Light Crossbow, 20 Bolts, Mace, Holy Symbol"}],
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
      {n:"Sling and staff",ac:"leather",weapons:[{w:"sling"},{w:"quarterstaff"}],gear:"Leather Armor, Sling, Quarterstaff (Druidic Focus), Herbalism Kit"}],
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
      {n:"Crossbow and shield",ac:"chainShirtShield",weapons:[{w:"lightxbow"},{w:"mace"}],gear:"Chain Shirt, Shield, Light Crossbow, 20 Bolts, Mace"}],
    traits:[],
    bonus:[{n:"Second Wind (2 uses)",t:"The fighter regains 1d10 + 1 Hit Points. One use returns on a Short Rest, all of them on a Long Rest."}],
    res:[{k:"wind",label:"Second Wind",max:2,per:"Short/Long Rest"}],
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
      {n:"Staff and sling",ac:"unarmWis",weapons:[{w:"unarmed"},{w:"quarterstaff"},{w:"sling"}],gear:"Quarterstaff, Sling"}],
    traits:[{n:"Martial Arts (d6)",t:"Unarmed Strikes and Monk weapons (Simple Melee, plus Light Martial Melee) deal 1d6 and can use Dexterity."},
            {n:"Unarmored Defense",t:"AC equals 10 + Dex modifier + Wis modifier while wearing no armor and no Shield."}],
    bonus:[{n:"Bonus Unarmed Strike",t:"The monk makes one Unarmed Strike as a Bonus Action."}]},
  Paladin:{hd:10,saves:["wis","cha"],prim:"str",sec:"cha",masteries:2,
    skills:{from:["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"],n:2},
    kits:[
      {n:"Longsword and shield",ac:"chainMailShield",weapons:[{w:"longsword"},{w:"javelin",count:6}],gear:"Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol"},
      {n:"Greatsword",ac:"chainMail",weapons:[{w:"greatsword"},{w:"javelin",count:3}],gear:"Chain Mail, Greatsword, 3 Javelins, Holy Symbol"},
      {n:"Warhammer and shield",ac:"chainMailShield",weapons:[{w:"warhammer"},{w:"handaxe",count:2}],gear:"Chain Mail, Shield, Warhammer, 2 Handaxes, Holy Symbol"},
      {n:"Flail and shield",ac:"scaleShield",weapons:[{w:"flail"},{w:"javelin",count:4}],gear:"Scale Mail, Shield, Flail, 4 Javelins, Holy Symbol"}],
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
      {n:"Spear and shield",ac:"studdedShield",weapons:[{w:"spear"},{w:"shortbow"}],gear:"Studded Leather, Shield, Spear, Shortbow, 20 Arrows, Druidic Focus"}],
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
      {n:"Twin shortswords",ac:"leather",weapons:[{w:"shortsword",count:2},{w:"sling"}],gear:"Leather Armor, 2 Shortswords, Sling, Thieves' Tools"}],
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
      {n:"Quarterstaff",ac:"none",weapons:[{w:"quarterstaff"},{w:"dagger"}],gear:"Quarterstaff, Dagger, Arcane Focus (crystal)"}],
    traits:[],
    bonus:[{n:"Innate Sorcery (2/Long Rest)",t:"For 1 minute: the sorcerer's spell save DC increases by 1 and it has Advantage on Sorcerer spell attack rolls."}],
    res:[{k:"innate",label:"Innate Sorcery",max:2,per:"Long Rest"}],
    caster:{abil:"cha",cantrips:4,prepared:2,slots:2}},
  Warlock:{hd:8,saves:["wis","cha"],prim:"cha",sec:"con",
    skills:{from:["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"],n:2},
    kits:[
      {n:"Sickle and daggers",ac:"leather",weapons:[{w:"sickle"},{w:"dagger",count:2}],gear:"Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb)"},
      {n:"Light crossbow",ac:"leather",weapons:[{w:"lightxbow"},{w:"dagger"}],gear:"Leather Armor, Light Crossbow, 20 Bolts, Dagger, Arcane Focus (orb)"},
      {n:"Spear",ac:"leather",weapons:[{w:"spear"},{w:"club"}],gear:"Leather Armor, Spear, Club, Arcane Focus (orb)"}],
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
      {n:"Dagger and sling",ac:"none",weapons:[{w:"dagger"},{w:"sling"}],gear:"Dagger, Sling, Arcane Focus (wand), Robe, Spellbook"},
      {n:"Traveling scholar",ac:"none",weapons:[{w:"quarterstaff"}],gear:"Quarterstaff (Arcane Focus), Robe, Spellbook, Ink and Quill"}],
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
const GEN_MI_ABIL={Cleric:"wis",Druid:"wis",Wizard:"int"};
const GEN_FEATS=[
  {n:"Alert",t:"Initiative includes the proficiency bonus (counted). Immediately after rolling Initiative, the kobold can swap its result with one willing ally in the same combat (neither can be Incapacitated).",initPB:true},
  {n:"Crafter",t:"Proficient with three Artisan's Tools (rolled). 20 percent discount on nonmagical items; on each Long Rest, craft one piece of gear from the Fast Crafting table with the right tools in hand.",sub:"tools"},
  {n:"Healer",t:"Battle Medic (needs a Healer's Kit): as a Utilize action, a creature within 5 feet expends one of its Hit Dice; it regains the roll + the kobold's proficiency bonus. The kobold rerolls 1s on any die rolled to determine Hit Points restored.",act:"action"},
  {n:"Lucky",t:"Luck Points equal to the proficiency bonus (2), regained on a Long Rest. Spend 1 to give the kobold Advantage on a d20 Test, or to impose Disadvantage on an attack roll made against it.",res:{k:"luck",label:"Luck Points",max:2,per:"Long Rest"}},
  {n:"Magic Initiate",t:"Two cantrips and one always-prepared level-1 spell from the rolled list (one free cast per Long Rest; also castable with slots).",sub:"mi",res:{k:"mi",label:"Feat spell (free cast)",max:1,per:"Long Rest"}},
  {n:"Musician",t:"Proficient with three instruments (rolled). After a Short or Long Rest, play a tune to give Heroic Inspiration to allies who heard it, up to the proficiency bonus (2).",sub:"instr"},
  {n:"Savage Attacker",t:"Once per turn when a weapon attack hits, roll the weapon's damage dice twice and use either result."},
  {n:"Skilled",t:"Proficient in three more skills (rolled; counted in the Skills line).",sub:"skills"},
  {n:"Tavern Brawler",t:"Unarmed Strike deals 1d4 + Str Bludgeoning and rerolls 1s on that damage. Proficient with improvised weapons. Once per turn, a creature hit by the kobold's Unarmed Strike can be pushed 5 feet."},
  {n:"Tough",t:"Hit Point maximum increases by 2 per level (counted).",hp2:true}
];

// ── Gear rolls (D-014): pack d6 + two sundries off a drafted d20 ─────────────
const GEN_PACKS=["Burglar's Pack","Dungeoneer's Pack","Entertainer's Pack","Explorer's Pack","Priest's Pack","Scholar's Pack"];
const GEN_SUNDRIES=["Rope (50 ft.)","Crowbar","Grappling Hook","Caltrops (bag)","Ball Bearings (bag)",
  "Chalk (10 pieces)","Steel Mirror","Hooded Lantern and Oil Flask","Tinderbox and 10 Torches","Shovel",
  "Manacles","Fishing Tackle","Healer's Kit","Hunting Trap","Bell and String (10 ft.)","Playing Cards",
  "Net","Bedroll and Blanket","3 Empty Vials","Signal Whistle"];

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
  return {v:2,sp,set:{stat:cfg.set&&cfg.set.stat==="4d6"?"4d6":"3d6",
                      mode:cfg.set&&cfg.set.mode==="chaos"?"chaos":"plausible",
                      asi:!(cfg.set&&cfg.set.asi===false)},
          counts:cfg.counts||{},tables:cfg.tables||null,steps:{}};
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
  const ids=["stats","cls"];
  if(d.set.asi)ids.push("asi");
  ids.push("feat","skills");
  const cls=genClsOf(d);
  if(cls){
    if(GEN_CLASSES[cls].featureOpt)ids.push("feature");
    ids.push("equip");
    if(genCantripCount(d)>0)ids.push("cantrips");
    if(GEN_CLASSES[cls].caster)ids.push("spells");
  }
  ids.push("gearPack","sundries");
  (GEN_SPECIES[d.sp].tables||[]).forEach(t=>ids.push("sp:"+t.id));
  return ids.concat(["name"]);
}
function genSpTable(sp,id){return (GEN_SPECIES[sp].tables||[]).find(t=>t.id===id)||null;}
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
function genRollN(rng,list,n,takenNames){
  const die=genDieFor(list.length),taken=new Set();
  (takenNames||[]).forEach(nm=>{const i=list.indexOf(nm);if(i>=0)taken.add(i+1);});
  const rolls=[],names=[];
  for(let i=0;i<n&&taken.size<list.length;i++){
    const r=genRollTable(rng,die,list.length,taken);taken.add(r);rolls.push(r);names.push(list[r-1]);}
  return {rolls,value:names};
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
  if(id==="cls"){
    const scores={};GEN_ABILS.forEach((a,i)=>{scores[a]=d.steps.stats&&d.steps.stats.value[i]!=null?d.steps.stats.value[i]:10;});
    if(d.set.mode==="chaos"){const r=genRollDie(rng,12);d.steps.cls={rolls:[r],value:GEN_CLASS_LIST[r-1]};}
    else{const top3=genClassShortlist(scores,d.counts);const span=genSpanFor(3);const r=genRollDie(rng,span.die);
      d.steps.cls={rolls:[r],top3,value:top3[genSpanHit(span,r)]};}
    genClsCascade(d);
  }else if(id==="asi"){
    d.steps.asi={rolls:[],value:[K?K.prim:"str",K?K.sec:"con"]};
  }else if(id==="feat"){
    const r=genRollDie(rng,10);const f=GEN_FEATS[r-1];
    d.steps.feat={rolls:[r],value:f.n};
    if(f.sub)genRollSub(d,"feat",rng);
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
      const rec={rolls:[r],value:opts[idx].value};
      d.steps.feature=rec;
      const o=opts[idx];
      if(o.hooks&&o.hooks.tome)rec.sub=genRollN(rng,GEN_ALL_CANTRIPS,3,[]);
    }
  }else if(id==="equip"){
    if(!K)return null;
    const span=genSpanFor(K.kits.length);
    const r=genRollTable(rng,span.die,span.reroll?K.kits.length:span.die,null);
    d.steps.equip={rolls:[r],value:span.reroll?r-1:genSpanHit(span,r)};
  }else if(id==="cantrips"){
    if(!cls)return null;
    d.steps.cantrips=genRollN(rng,T.can[cls]||[],genCantripCount(d),[]);
  }else if(id==="spells"){
    if(!K||!K.caster)return null;
    d.steps.spells=genRollN(rng,T.l1[cls]||[],K.caster.prepared,K.caster.always||[]);
  }else if(id==="gearPack"){
    const r=genRollDie(rng,6);d.steps.gearPack={rolls:[r],value:GEN_PACKS[r-1]};
  }else if(id==="sundries"){
    d.steps.sundries=genRollN(rng,GEN_SUNDRIES,2,[]);
  }else if(id.startsWith("sp:")){
    const t=genSpTable(d.sp,id.slice(3));if(!t)return null;
    const r=genRollDie(rng,t.die);const e=t.entries.find(x=>r>=x.lo&&r<=x.hi);
    const rec={rolls:[r],value:e.value};
    d.steps[id]=rec;
    if(e.sub)genRollSub(d,id,rng);
  }
  return d.steps[id];
}
// Roll only a step's pending sub-chain (feat subs, species subs, tome cantrips).
function genRollSub(d,id,rng){
  rng=rng||Math.random;const rec=d.steps[id];if(!rec)return false;
  if(id==="feat"){
    const f=GEN_FEATS.find(x=>x.n===rec.value);if(!f||!f.sub)return false;
    if(f.sub==="skills"){const owned=genOwnedSkillNames(d,true);rec.sub=genRollN(rng,GEN_SKILL_NAMES,3,[...owned]);rec.sub.kind="skills";}
    else if(f.sub==="tools")rec.sub={...genRollN(rng,GEN_TOOLS8,3,[]),kind:"tools"};
    else if(f.sub==="instr")rec.sub={...genRollN(rng,GEN_INSTR10,3,[]),kind:"instr"};
    else if(f.sub==="mi"){
      const span=genSpanFor(3),r=genRollDie(rng,span.die);
      const list=GEN_MI_LISTS[genSpanHit(span,r)],T=genTablesOf(d);
      rec.sub={kind:"mi",list:{rolls:[r],value:list},
        cans:genRollN(rng,T.can[list]||GEN_CLASS_SPELLS[list][0],2,[]),
        sp:(()=>{const s=genRollN(rng,T.l1[list]||GEN_CLASS_SPELLS[list][1],1,[]);return {rolls:s.rolls,value:s.value[0]};})()};
    }
    return true;
  }
  if(id==="feature"){
    const K=GEN_CLASSES[genClsOf(d)];const o=K&&K.featureOpt&&K.featureOpt.options&&K.featureOpt.options.find(x=>x.value===rec.value);
    if(!o||!o.hooks||!o.hooks.tome)return false;
    rec.sub=genRollN(rng,GEN_ALL_CANTRIPS,3,[]);return true;
  }
  const t=genSpTable(d.sp,id.slice(3));if(!t)return false;
  const e=t.entries.find(x=>x.value===rec.value);if(!e||!e.sub)return false;
  if(e.sub.kind==="skill"){const owned=genOwnedSkillNames(d,false);
    rec.sub=genRollN(rng,e.sub.entries,1,[...owned]);rec.sub.value=rec.sub.value[0];
  }else{const sr=genRollTable(rng,e.sub.die,e.sub.entries.length,null);
    rec.sub={rolls:[sr],value:e.sub.entries[sr-1]};}
  return true;
}
function genOwnedSkillNames(d,includeFeat){
  const s=new Set();
  (d.steps.skills&&d.steps.skills.value||[]).forEach(n=>s.add(n));
  if(includeFeat!==false){const f=d.steps.feat;
    if(f&&f.sub&&f.sub.kind==="skills"&&Array.isArray(f.sub.value))f.sub.value.forEach(n=>s.add(n));}
  const leg=d.steps["sp:legacy"];
  if(leg&&leg.sub&&typeof leg.sub.value==="string"&&GEN_SKILL_ABIL[leg.sub.value])s.add(leg.sub.value);
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
  if(id==="cls"){if(!GEN_CLASSES[value])return false;d.steps.cls={rolls:[],pick:true,value};genClsCascade(d);return true;}
  if(id==="asi"){
    if(!Array.isArray(value)||value.length!==2||!GEN_ABILS.includes(value[0])||!GEN_ABILS.includes(value[1])||value[0]===value[1])return false;
    d.steps.asi={rolls:[],pick:true,value:[value[0],value[1]]};return true;}
  if(id==="feat"){
    const f=GEN_FEATS.find(x=>x.n===value);if(!f)return false;
    const rec={rolls:[],pick:true,value:f.n};
    if(f.sub)rec.sub=null; // resolve via genRollSub or genApplySubPick
    d.steps.feat=rec;return true;}
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
    if(value.some((s,i)=>!GEN_SUNDRIES.includes(s)||value.indexOf(s)!==i))return false;
    d.steps.sundries={rolls:[],pick:true,value:[...value]};return true;}
  if(id.startsWith("sp:")){
    const t=genSpTable(d.sp,id.slice(3));if(!t)return false;
    const e=t.entries.find(x=>x.value===value||x.label===value||String(x.value)===String(value));if(!e)return false;
    const rec={rolls:[],pick:true,value:e.value};
    if(e.sub)rec.sub=null;
    d.steps[id]=rec;return true;}
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
  if(id==="feat"){const f=GEN_FEATS.find(x=>x.n===rec.value);if(!f||!f.sub)return false;
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
  if(id==="feat"){const f=GEN_FEATS.find(x=>x.n===s.value);
    if(f&&f.sub){if(!s.sub)return false;
      if(f.sub==="mi")return !!(s.sub.list&&s.sub.cans&&Array.isArray(s.sub.cans.value)&&s.sub.cans.value.length===2&&s.sub.sp&&s.sub.sp.value);
      return Array.isArray(s.sub.value)&&s.sub.value.length===3;}}
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];
    const o=K&&K.featureOpt&&K.featureOpt.options&&K.featureOpt.options.find(x=>x.value===s.value);
    if(o&&o.hooks&&o.hooks.tome)return !!(s.sub&&Array.isArray(s.sub.value)&&s.sub.value.length===3);}
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
    // feat (+sub)
    const ft=S.feat||{};const F=GEN_FEATS.find(x=>x.n===ft.value);if(!F)return {ok:false,err:"feat"};
    out.feat={rolls:Array.isArray(ft.rolls)?ft.rolls.slice(0,1).map(x=>intIn(x,1,10)||1):[],pick:!!ft.pick,value:F.n};
    if(F.sub){const sub=ft.sub||{};
      if(F.sub==="mi"){
        const list=sub.list&&sub.list.value;
        if(!GEN_MI_LISTS.includes(list))return {ok:false,err:"featsub"};
        const cans=sub.cans&&sub.cans.value,spv=sub.sp&&sub.sp.value;
        if(!distinctIn(cans,2,GEN_CLASS_SPELLS[list][0]))return {ok:false,err:"featsub"};
        if(!GEN_CLASS_SPELLS[list][1].includes(spv))return {ok:false,err:"featsub"};
        out.feat.sub={kind:"mi",list:{rolls:[],value:list},cans:{rolls:[],value:[...cans]},sp:{rolls:[],value:spv}};
      }else{
        const list=F.sub==="skills"?GEN_SKILL_NAMES:F.sub==="tools"?GEN_TOOLS8:GEN_INSTR10;
        if(!distinctIn(sub.value,3,list))return {ok:false,err:"featsub"};
        out.feat.sub={kind:F.sub==="skills"?"skills":F.sub,rolls:[],value:[...sub.value]};
      }}
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
    // equipment kit
    const eq=S.equip||{};const ki=intIn(eq.value,0,K.kits.length-1);
    if(ki==null)return {ok:false,err:"equip"};
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
    // gear
    const gp=S.gearPack||{};if(!GEN_PACKS.includes(gp.value))return {ok:false,err:"gearPack"};
    out.gearPack={rolls:[],pick:!!gp.pick,value:gp.value};
    const su=S.sundries||{};
    if(!distinctIn(su.value,2,GEN_SUNDRIES))return {ok:false,err:"sundries"};
    out.sundries={rolls:[],pick:!!su.pick,value:[...su.value]};
    // species tables
    for(const t of (GEN_SPECIES[sp].tables||[])){
      const key="sp:"+t.id,rec=S[key]||{};
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
  const feat=GEN_FEATS.find(f=>f.n===p.steps.feat.value);
  const featureVal=p.steps.feature?p.steps.feature.value:null;
  const featureOpt=K.featureOpt&&!K.featureOpt.kind?(K.featureOpt.options.find(o=>o.value===featureVal)||null):null;
  const fh=(featureOpt&&featureOpt.hooks)||{};
  const kit=K.kits[p.steps.equip?p.steps.equip.value:0];
  const hp=Math.max(1,K.hd+mods.con+(feat.hp2?2:0));
  // AC from the kit recipe (+Defense style; Armor of Shadows upgrades an unarmored kit)
  const A=GEN_AC[kit.ac]||GEN_AC.none;
  let ac=10+mods.dex,acSrc=A.label||"Unarmored";
  if(A.kind==="unarmored-con")ac=10+mods.dex+mods.con;
  else if(A.kind==="unarmored-wis")ac=10+mods.dex+mods.wis;
  else if(A.kind==="armor"){const dx=A.dexMax!=null?Math.min(mods.dex,A.dexMax):mods.dex;
    ac=A.base+dx+(A.shield?2:0)+(fh.acArmor||0);}
  else if(A.kind==="fixed")ac=A.base+(A.shield?2:0)+(fh.acArmor||0);
  if(A.kind==="none"&&fh.mageArmor){ac=13+mods.dex;acSrc="Mage Armor (at will)";}
  // skills / expertise
  const profSkills=new Map();
  p.steps.skills.value.forEach(s=>profSkills.set(s,1));
  if(feat.sub==="skills"&&p.steps.feat.sub)p.steps.feat.sub.value.forEach(s=>profSkills.set(s,1));
  const leg=p.steps["sp:legacy"];
  if(leg&&leg.value==="craftiness"&&leg.sub)profSkills.set(leg.sub.value,1);
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
    const useMast=!ref.noMastery&&mastLeft>0&&w.mastery?w.mastery:(mastLeft<=0?"":w.mastery&&!ref.noMastery?w.mastery:"");
    const entry={...w,count:ref.count||1,mastery:""};
    if(!ref.noMastery&&(K.masteries||0)>0&&w.mastery&&mastLeft>0){entry.mastery=w.mastery;mastLeft--;}
    weapons.push(entry);
  });
  if(fh.pactBlade)weapons.push({n:"Pact Blade",ability:"cha",dice:"1d8",dtype:"Slashing",kind:"Melee",count:1,mastery:"",note:"conjured; uses Charisma"});
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
  if(feat.sub==="mi"&&p.steps.feat.sub){
    const s=p.steps.feat.sub,ab=GEN_MI_ABIL[s.list.value],km=mods[ab];
    extraCasts.push({label:"Magic Initiate ("+s.list.value+")",abil:ab,dc:8+pb+km,atk:pb+km,
      cantrips:[...s.cans.value],spell:s.sp.value});}
  let sorcery=null;
  if(leg&&leg.value==="sorcery"&&leg.sub){
    const best=["int","wis","cha"].sort((a,b)=>mods[b]-mods[a])[0];
    sorcery={cantrip:leg.sub.value,abil:best,dc:8+pb+mods[best],atk:pb+mods[best]};}
  // statblock sections
  const traits=sp.traits.map(t=>({...t})).concat((K.traits||[]).map(t=>({...t})));
  const bonus=(sp.bonus||[]).map(t=>({...t})).concat((K.bonus||[]).map(t=>({...t})));
  const actions=[];
  if(featureOpt)traits.push({n:K.featureOpt.label+": "+featureOpt.label,t:featureOpt.t.replace(/^[^.]*\.\s*/,"")});
  if(p.steps.feature&&p.steps.feature.kind==="expertise")traits.push({n:"Expertise",t:"Double proficiency with "+p.steps.feature.value.join(" and ")+" (counted in the Skills line)."});
  if(fh.pactBlade)bonus.push({n:"Pact of the Blade",t:"The warlock conjures its bonded pact weapon in its hand; the weapon's attack and damage rolls use Charisma."});
  if(leg){if(leg.value==="craftiness"&&leg.sub)traits.push({n:"Kobold Legacy: Craftiness",t:"Proficient in "+leg.sub.value+" (counted in the Skills line)."});
    if(leg.value==="defiance")traits.push({n:"Kobold Legacy: Defiance",t:"Advantage on saving throws to avoid or end the Frightened condition."});
    if(sorcery)traits.push({n:"Kobold Legacy: Draconic Sorcery",t:"Knows "+sorcery.cantrip+" (spell attack "+(sorcery.atk>=0?"+":"")+sorcery.atk+", save DC "+sorcery.dc+", "+GEN_ABIL_LABEL[sorcery.abil]+")."});}
  const wings=p.steps["sp:wings"]&&p.steps["sp:wings"].value===true;
  if(feat.act==="action")actions.push({n:feat.n,t:feat.t});
  else{
    let ftxt=feat.t;
    if(feat.sub==="tools"&&p.steps.feat.sub)ftxt+=" Tools: "+p.steps.feat.sub.value.join(", ")+".";
    if(feat.sub==="instr"&&p.steps.feat.sub)ftxt+=" Instruments: "+p.steps.feat.sub.value.join(", ")+".";
    traits.push({n:"Feat: "+feat.n,t:ftxt});
  }
  // resources
  const resources=[];
  (sp.res||[]).forEach(r=>resources.push({...r}));
  (K.res||[]).forEach(r=>resources.push({...r,max:r.max==="chaMin1"?Math.max(1,mods.cha):r.max}));
  if(caster&&caster.slots)resources.push({k:"slots",label:"Spell Slots (Level 1)",max:caster.slots,per:caster.short?"Short Rest":"Long Rest"});
  if(feat.res)resources.push({...feat.res});
  // gear line: kit + rolled pack + rolled sundries
  const gear=[kit.gear,p.steps.gearPack.value].concat(p.steps.sundries.value).join(", ");
  const tools=[...(K.tools||[])];
  if(feat.sub==="tools"&&p.steps.feat.sub)tools.push(...p.steps.feat.sub.value);
  const langs=[...sp.langs,...(K.langs||[])];
  return {name:p.steps.name.value,species:sp.label,cls,size:sp.size,level:1,pb,
    scores,mods,hp,hd:"1d"+K.hd,ac,acSrc,gear,tools,kitName:kit.n,
    speed:{walk:sp.speed,fly:wings?30:0},
    init:mods.dex+(feat.initPB?pb:0),
    darkvision:sp.darkvision,langs,saves,skills,pp,
    traits,bonus,actions,resources,
    feat:{n:feat.n,t:feat.t},attacks,caster,extraCasts,sorcery,
    flavor:{quirk:p.steps.quirk?p.steps.quirk.value:"",trinket:p.steps.trinket?p.steps.trinket.value:""},
    statRolls:p.steps.stats.pick?null:p.steps.stats.rolls,statPick:!!p.steps.stats.pick,
    statMethod:p.set.stat};
}

// ── Statblock conversion — real Forge entries, rendered by the app's composer ─
// Save-based damage cantrips keep the monster save-line format; attack cantrips and weapons become
// mode:"attack" entries so attackText/colorize/click-to-roll treat them exactly like a monster's.
const GEN_CANTRIP_LINES={
  "Acid Splash":{save:"dex",r:"range 60 ft. (5-ft. sphere)",d:"1d6",t:"Acid"},
  "Chill Touch":{atk:"Melee",reach:5,d:"1d10",t:"Necrotic",x:"the target can't regain Hit Points until the start of the kobold's next turn."},
  "Eldritch Blast":{atk:"Ranged",range:"120",d:"1d10",t:"Force"},
  "Fire Bolt":{atk:"Ranged",range:"120",d:"1d10",t:"Fire"},
  "Mind Sliver":{save:"int",r:"range 60 ft.",d:"1d6",t:"Psychic",x:"the target subtracts 1d4 from its next saving throw before the end of the kobold's next turn."},
  "Poison Spray":{atk:"Ranged",range:"30",d:"1d12",t:"Poison"},
  "Produce Flame":{atk:"Ranged",range:"60",d:"1d8",t:"Fire"},
  "Ray of Frost":{atk:"Ranged",range:"60",d:"1d8",t:"Cold",x:"the target's Speed decreases by 10 ft. until the start of the kobold's next turn."},
  "Sacred Flame":{save:"dex",r:"range 60 ft.",d:"1d8",t:"Radiant",x:"the target gains no benefit from Half or Three-Quarters Cover on this save."},
  "Shocking Grasp":{atk:"Melee",reach:5,d:"1d8",t:"Lightning",x:"the target can't take Reactions until the start of its next turn."},
  "Sorcerous Burst":{atk:"Ranged",range:"120",d:"1d8",t:"Force",x:"on a die showing 8, roll and add one extra d8 (max 2 extra)."},
  "Starry Wisp":{atk:"Ranged",range:"60",d:"1d8",t:"Radiant",x:"the target sheds Dim Light until the end of the kobold's next turn."},
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
  m.hp=ch.hp;m.hpf=`${ch.hd}${ch.mods.con?(ch.mods.con>0?" + ":" − ")+Math.abs(ch.mods.con):""}, maxed`;
  m.spd.walk=ch.speed.walk;m.spd.fly=ch.speed.fly||0;
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
  if(ch.caster){
    ch.caster.cantrips.forEach(cn=>{const e=genCantripEntry(cn,ch.caster.dc,ch.caster.atk);if(e)acts.push(e);});
    const groups=[];
    if(ch.caster.cantrips.length)groups.push({freq:"Cantrips (at will)",spells:ch.caster.cantrips.join(", ")});
    groups.push({freq:`Level 1 (${ch.caster.slots} slot${ch.caster.slots>1?"s":""}, ${ch.caster.short?"Short Rest":"Long Rest"})`,spells:ch.caster.prepared.join(", ")});
    acts.push({name:"Spellcasting",mode:"spell",ability:ch.caster.abil,dc:ch.caster.dc,atk:ch.caster.atk,groups});
  }
  if(ch.sorcery){
    const e=genCantripEntry(ch.sorcery.cantrip,ch.sorcery.dc,ch.sorcery.atk,ch.sorcery.cantrip+" (Draconic Sorcery)");
    if(e){if(e.mode==="attack")e.name=ch.sorcery.cantrip+" (Draconic Sorcery)";acts.push(e);}
    else acts.push({name:"Draconic Sorcery",mode:"spell",ability:ch.sorcery.abil,dc:ch.sorcery.dc,atk:ch.sorcery.atk,
      groups:[{freq:"At will",spells:ch.sorcery.cantrip}]});
  }
  (ch.extraCasts||[]).forEach(x=>{
    acts.push({name:x.label,mode:"spell",ability:x.abil,dc:x.dc,atk:x.atk,
      groups:[{freq:"At will",spells:x.cantrips.join(", ")},{freq:"1/Long Rest (also castable with slots)",spells:x.spell}]});
  });
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
    {k:"senses",v:"Darkvision "+ch.darkvision+" ft."},
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
function genPcMetaHTML(ch,opts){
  const sgnf=n=>(n>=0?"+":"")+n;
  let h=`<hr class="rule thin"><div class="meta">`;
  if(ch.skills.length)h+=`<p><span class="k">Skills</span> ${ch.skills.map(s=>`${esc(s.n)} ${sgnf(s.bonus)}`).join(", ")}</p>`;
  if(ch.tools&&ch.tools.length)h+=`<p><span class="k">Tools</span> ${ch.tools.map(esc).join(", ")}</p>`;
  if(ch.gear)h+=`<p><span class="k">Gear</span> ${esc(ch.gear)}</p>`;
  h+=`<p><span class="k">Senses</span> Darkvision ${ch.darkvision} ft., Passive Perception ${ch.pp}</p>`;
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
    return `<div class="gk-res-row"><span class="gk-res-l">${esc(r.label)}</span><span class="gk-pips">${pips}</span>${interactive?`<button class="gk-res-per" data-gkreset="${esc(r.k)}" title="Reset (${esc(r.per)})">${esc(r.per)}</button>`:`<span class="gk-res-per gk-res-per-s">${esc(r.per)}</span>`}</div>`;
  }).join("")}</div>`;
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
  return `<div class="sb gk-card${opts.dead?" gk-dead":""}">${core}${flavor}</div>`
    +(opts.dead||opts.pips==="off"?"":genResTrackerHTML(ch,opts.res,opts.pips==="live"));
}
// Mount + post-process: the colour/link/rollable pass runs with M swapped so DCs, damage, spell
// names, and condition names light up exactly like a bestiary statblock.
function genMountCard(host,ch,opts,handlers){
  host.innerHTML=genCardHTML(ch,opts);
  const cardEl=host.querySelector(".gk-card");
  if(cardEl&&typeof colorizeStatblock==="function"){
    const prevM=M;
    try{M=genToMonster(ch);colorizeStatblock(cardEl);}catch(e){/* colour pass is cosmetic */}
    finally{M=prevM;}
  }
  bindGenCard(host,handlers||{});
}
function bindGenCard(root,h){
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
}
function openGenCard(a,payload,o){
  o=o||{};
  const v=validateGenPayload(payload);if(!v.ok){toast("This card can't be rebuilt from its data.");return;}
  const ch=deriveGenChar(v.clean);
  const pc=o.pcId?rosterById(o.pcId):null;
  if(pc)o={...o,res:(pc.gen&&pc.gen.res)||{},pips:"live"};
  openModalRaw(`<div id="gkCardHost"></div>
    <div class="mrow">${o.pcId?`<button class="btn ghost sm" id="gkDied" style="width:auto">Mark dead</button>`:""}<button class="btn ghost sm" id="gkClose" style="width:auto">Close</button></div>`);
  genMountCard($("#gkCardHost"),ch,o,{onRes:pc?(k,used)=>{pc.gen.res=pc.gen.res||{};pc.gen.res[k]=used;saveRoster();}:null});
  $("#gkClose").addEventListener("click",closeModal);
  const died=$("#gkDied");
  if(died)died.addEventListener("click",()=>{
    confirmModal(`Mark ${ch.name} as dead? The card moves to the fallen list.`,()=>{
      genRetirePC(a,o.pcId);closeModal();preserveScroll(".adv-detail-body",renderAdvDetail);});});
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RITUAL — one step at a time; the option table shows before the roll; any result is clickable
// to override (D-011). Identity is typed. A "Roll the rest" fast-path fills everything but the name.
// ═══════════════════════════════════════════════════════════════════════════
let _genR=null; // {mode, pn, editing, draft, done}
function genStepLabel(d,id){
  if(id==="stats")return "Ability scores, in order ("+d.set.stat+")";
  if(id==="cls")return d.set.mode==="chaos"?"Class (d12)":"Class (d6 over the three best fits)";
  if(id==="asi")return "Background ability scores (+2 / +1)";
  if(id==="feat")return "Origin feat (d10)";
  if(id==="skills"){const K=GEN_CLASSES[genClsOf(d)||"Fighter"];
    return `Class skills (${K.skills.n} rolls, ${genDieLabel(K.skills.from.length)})`;}
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];return K&&K.featureOpt?(K.featureOpt.kind==="expertise"?"Expertise (2 of the rolled skills)":K.featureOpt.label):"Class feature";}
  if(id==="equip"){const K=GEN_CLASSES[genClsOf(d)];return "Equipment kit ("+(K?K.kits.length:0)+" options)";}
  if(id==="cantrips")return `Cantrips (${genCantripCount(d)} rolls, ${genDieLabel((genTablesOf(d).can[genClsOf(d)]||[]).length)})`;
  if(id==="spells"){const K=GEN_CLASSES[genClsOf(d)];
    return `Prepared spells (${K.caster.prepared} rolls, ${genDieLabel((genTablesOf(d).l1[genClsOf(d)]||[]).length)})`;}
  if(id==="gearPack")return "Pack (d6)";
  if(id==="sundries")return "Sundries (2 rolls, d20)";
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));return t?t.label+" (d"+t.die+")":id;}
  if(id==="name")return "Identity";
  return id;
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
      pickAll:GEN_CLASS_LIST};
  }
  if(id==="feat")return {die:10,rows:GEN_FEATS.map((f,i)=>({span:String(i+1),label:f.n,value:f.n,hit:s&&s.value===f.n}))};
  if(id==="skills"&&K)return mk(K.skills.from);
  if(id==="feature"&&K&&K.featureOpt){
    if(K.featureOpt.kind==="expertise"){const own=(d.steps.skills&&d.steps.skills.value)||[];return own.length?mk(own):null;}
    const opts=K.featureOpt.options,span=genSpanFor(opts.length);
    return {die:span.die,rows:opts.map((o,i)=>({span:span.reroll?String(i+1):span.spans[i][0]+"-"+span.spans[i][1],label:o.label,value:o.value,hit:s&&s.value===o.value})),
      note:span.reroll?"reroll over "+opts.length:""};
  }
  if(id==="equip"&&K){const span=genSpanFor(K.kits.length);
    return {die:span.die,rows:K.kits.map((k,i)=>({span:span.reroll?String(i+1):span.spans[i][0]+"-"+span.spans[i][1],label:k.n,sub:k.gear,value:i,hit:s&&s.value===i})),
      note:span.reroll?"reroll over "+K.kits.length:""};}
  if(id==="cantrips"&&cls)return mk(genTablesOf(d).can[cls]||[]);
  if(id==="spells"&&cls){const K2=GEN_CLASSES[cls];
    const list=(genTablesOf(d).l1[cls]||[]).filter(x=>!(K2.caster.always||[]).includes(x));
    return mk(list);}
  if(id==="gearPack")return {die:6,rows:GEN_PACKS.map((p,i)=>({span:String(i+1),label:p,value:p,hit:s&&s.value===p}))};
  if(id==="sundries")return mk(GEN_SUNDRIES);
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3));if(!t)return null;
    return {die:t.die,rows:t.entries.map(e=>({span:e.lo===e.hi?String(e.lo):e.lo+"-"+e.hi,label:e.label,value:e.value,hit:s&&s.value===e.value}))};}
  return null;
}
function genDiceChips(s){
  if(!s||s.pick)return s&&s.pick?`<span class="gk-picked">chosen</span>`:"";
  if(!s.rolls||!s.rolls.length)return "";
  return `<span class="gk-dchips">${s.rolls.map(r=>Array.isArray(r)?r.join("·"):r).join(" | ")}</span>`;
}
function genStatDice(dice,method){
  let cut=-1;
  if(method==="4d6"){let min=7;dice.forEach((v,i)=>{if(v<min){min=v;cut=i;}});}
  return dice.map((v,i)=>i===cut?`<s>${v}</s>`:String(v)).join("·");
}
function genStepValueHTML(d,id){
  const s=d.steps[id];if(!s||s.value==null)return "";
  if(id==="asi")return `<b data-gkedit="asi">+2 ${s.value[0].toUpperCase()} / +1 ${s.value[1].toUpperCase()}</b> <span class="gk-dim">${s.pick?"chosen":"class default"}</span>`;
  if(id==="equip"){const K=GEN_CLASSES[genClsOf(d)];const k=K&&K.kits[s.value];
    return `<b data-gkedit="equip">${esc(k?k.n:String(s.value))}</b> ${genDiceChips(s)} <span class="gk-dim">${esc(k?k.gear:"")}</span>`;}
  if(id==="feature"&&s.kind==="expertise")return s.value.map(x=>`<span class="gk-chip2" data-gkedit="feature">${esc(x)}</span>`).join(" ")+" "+genDiceChips(s);
  if(id==="feature"){const K=GEN_CLASSES[genClsOf(d)];const o=K.featureOpt.options.find(x=>x.value===s.value);
    let h=`<b data-gkedit="feature">${esc(o?o.label:String(s.value))}</b> ${genDiceChips(s)}`;
    if(o&&o.hooks&&o.hooks.tome)h+=s.sub&&s.sub.value?(" → "+s.sub.value.map(x=>`<span class="gk-chip2">${esc(x)}</span>`).join(" ")):` <span class="gk-warn">three cantrips pending</span>`;
    return h;}
  if(id==="feat"){let h=`<b data-gkedit="feat">${esc(String(s.value))}</b> ${genDiceChips(s)}`;
    const sub=s.sub;
    if(sub){
      if(sub.kind==="mi"&&sub.list)h+=` → <span class="gk-chip2">${esc(sub.list.value)}</span> `+
        (sub.cans&&sub.cans.value?sub.cans.value.map(x=>`<span class="gk-chip2">${esc(x)}</span>`).join(" "):"")+
        (sub.sp&&sub.sp.value?` <span class="gk-chip2">${esc(sub.sp.value)}</span>`:"");
      else if(Array.isArray(sub.value))h+=" → "+sub.value.map(x=>`<span class="gk-chip2">${esc(x)}</span>`).join(" ");
    }else if(GEN_FEATS.find(x=>x.n===s.value&&x.sub))h+=` <span class="gk-warn">extra rolls pending</span>`;
    return h;}
  if(Array.isArray(s.value))return s.value.map(x=>`<span class="gk-chip2" data-gkedit="${id}">${esc(String(x))}</span>`).join(" ")+" "+genDiceChips(s);
  if(id.startsWith("sp:")){const t=genSpTable(d.sp,id.slice(3)),e=t.entries.find(x=>x.value===s.value);
    let h=`<b data-gkedit="${id}">${esc(e?e.label:String(s.value))}</b> ${genDiceChips(s)}`;
    if(e&&e.sub)h+=s.sub&&s.sub.value!=null?` → <span class="gk-chip2">${esc(String(s.sub.value))}</span> ${genDiceChips(s.sub)}`:` <span class="gk-warn">${esc(e.sub.label)} pending</span>`;
    return h;}
  if(id==="name"){const extras=["quirk","trinket"].filter(k=>d.steps[k]&&d.steps[k].value).length;
    return `<b data-gkedit="name">${esc(String(s.value))}</b>${extras?` <span class="gk-dim">notes: ${extras}/2</span>`:""}`;}
  return `<b data-gkedit="${id}">${esc(String(s.value))}</b> ${genDiceChips(s)}`;
}
function genSel(id,opts,cur,labels){
  return `<select id="${id}" class="gk-sel">${opts.map((o,i)=>`<option value="${esc(String(o))}"${String(o)===String(cur)?" selected":""}>${esc(labels?labels[i]:String(o))}</option>`).join("")}</select>`;
}
function genEditorHTML(d,id){
  const cls=genClsOf(d),K=cls?GEN_CLASSES[cls]:null,s=d.steps[id];
  const nSel=(list,n,cur,idp)=>Array.from({length:n},(x,i)=>genSel(idp+i,list,cur&&cur[i]||list[i]));
  if(id==="stats")return GEN_ABILS.map((a,i)=>`<label class="gk-si">${a.toUpperCase()}<input type="number" min="3" max="20" id="gkSt_${a}" value="${s&&s.value&&s.value[i]!=null?s.value[i]:10}"></label>`).join("")+`<button class="btn primary sm gk-apply" data-gkapply="stats">Set scores</button>`;
  if(id==="asi"){const cur=s?s.value:[K?K.prim:"str",K?K.sec:"con"];
    return genSel("gkAsi2",GEN_ABILS,cur[0],GEN_ABILS.map(a=>"+2 "+a.toUpperCase()))+genSel("gkAsi1",GEN_ABILS,cur[1],GEN_ABILS.map(a=>"+1 "+a.toUpperCase()))+`<button class="btn primary sm gk-apply" data-gkapply="asi">Apply</button>`;}
  if(id==="skills"&&K)return nSel(K.skills.from,K.skills.n,s&&s.value,"gkSk_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="skills">Apply</button>`;
  if(id==="feature"&&K&&K.featureOpt&&K.featureOpt.kind==="expertise"){const own=(d.steps.skills&&d.steps.skills.value)||[];
    return nSel(own,Math.min(2,own.length),s&&s.value,"gkEx_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="feature">Apply</button>`;}
  if(id==="cantrips"&&cls)return nSel(genTablesOf(d).can[cls]||[],genCantripCount(d),s&&s.value,"gkCn_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="cantrips">Apply</button>`;
  if(id==="spells"&&cls&&K){const list=(genTablesOf(d).l1[cls]||[]).filter(x=>!(K.caster.always||[]).includes(x));
    return nSel(list,K.caster.prepared,s&&s.value,"gkSp_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="spells">Apply</button>`;}
  if(id==="sundries")return nSel(GEN_SUNDRIES,2,s&&s.value,"gkSu_").join("")+`<button class="btn primary sm gk-apply" data-gkapply="sundries">Apply</button>`;
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
  if(id==="feat"){const f=GEN_FEATS.find(x=>x.n===s.value);if(!f||!f.sub)return "";
    if(f.sub==="mi")return `<div class="gk-subrow"><span class="gk-dim">Magic Initiate: list (d6, 1-2 / 3-4 / 5-6), two cantrips, one spell.</span>${roll}${genSel("gkMiL",GEN_MI_LISTS,"")}<button class="btn primary sm" data-gksubapply="feat">Choose list, roll spells</button></div>`;
    const list=f.sub==="skills"?GEN_SKILL_NAMES:f.sub==="tools"?GEN_TOOLS8:GEN_INSTR10;
    const lbl=f.sub==="skills"?"three skills":f.sub==="tools"?"three artisan tools ("+genDieLabel(list.length)+")":"three instruments (d10)";
    return `<div class="gk-subrow"><span class="gk-dim">${esc(s.value)}: ${lbl}.</span>${roll}${[0,1,2].map(i=>genSel("gkFs_"+i,list,list[i])).join("")}<button class="btn primary sm" data-gksubapply="feat">Choose</button></div>`;}
  if(id==="feature")return `<div class="gk-subrow"><span class="gk-dim">Pact of the Tome: three cantrips, any list (${genDieLabel(GEN_ALL_CANTRIPS.length)}).</span>${roll}${[0,1,2].map(i=>genSel("gkTm_"+i,GEN_ALL_CANTRIPS,GEN_ALL_CANTRIPS[i])).join("")}<button class="btn primary sm" data-gksubapply="feature">Choose</button></div>`;
  const t=genSpTable(d.sp,id.slice(3)),e=t&&t.entries.find(x=>x.value===s.value);
  if(!e||!e.sub)return "";
  return `<div class="gk-subrow"><span class="gk-dim">${esc(e.sub.label)} (${genDieLabel(e.sub.entries.length)}).</span>${roll}${genSel("gkSub_"+id.slice(3),e.sub.entries,"")}<button class="btn primary sm" data-gksubapply="${id}">Choose</button></div>`;
}
function genStatsRowsHTML(d){
  const s=d.steps.stats,n=s&&!s.pick?s.rolls.length:0;
  return `<div class="gk-stat6">${GEN_ABILS.map((a,i)=>{
    const rolled=s&&s.value&&s.value[i]!=null&&(s.pick||i<n);
    const next=!s||(!s.pick&&n===i);
    return `<div class="gk-st${rolled?" gk-st-done":""}${next?" gk-st-next":""}">
      <span class="gk-st-k">${a.toUpperCase()}</span>
      ${rolled?`<span class="gk-st-v" data-gkedit="stats">${s.value[i]}</span>${!s.pick?`<span class="gk-dice">${genStatDice(s.rolls[i],d.set.stat)}</span>`:`<span class="gk-picked">chosen</span>`}`
        :next?`<button class="btn primary sm gk-roll1" data-gkroll="stats">${D20_ICON}<span>Roll</span></button>`
        :`<span class="gk-dim">·</span>`}
    </div>`;}).join("")}</div>`;
}
function genTableHTML(d,id,tbl){
  const long=tbl.rows.length>12;
  return `<div class="gk-tbl${long?" gk-tbl-long":""}">
    ${tbl.rows.map(r=>`<button class="gk-tr${r.hit?" gk-hit":""}" data-gkopt="${esc(String(r.value))}" data-gkstep="${id}">
      <span class="gk-td">${esc(r.span)}</span><span class="gk-tl">${esc(r.label)}${r.sub?` <span class="gk-dim">${esc(r.sub)}</span>`:""}</span></button>`).join("")}
    ${tbl.note?`<div class="gk-tbl-note">${esc(tbl.note)}</div>`:""}
  </div>`;
}
function renderGenRitual(){
  const R=_genR;if(!R)return;
  const d=R.draft,host=$("#gkR");if(!host)return;
  // The ASI step has no dice — it self-resolves to the class default the moment it goes active
  // (still clickable to override, D-011).
  let order=genStepOrder(d);
  if(order.find(id=>!genStepDone(d,id))==="asi"){genRollStep(d,"asi");order=genStepOrder(d);}
  const firstOpen=order.find(id=>!genStepDone(d,id));
  const complete=!firstOpen;
  const rows=order.map(id=>{
    const s=d.steps[id],done=genStepDone(d,id),active=id===firstOpen;
    const state=done?"done":(active?"active":"idle");
    const needsSub=s&&s.value!=null&&!done&&id!=="stats";
    const editing=R.editing===id||(id==="name"&&active);
    const isMulti=["skills","cantrips","spells","sundries"].includes(id)||(id==="feature"&&s&&s.kind==="expertise");
    const rollable=id!=="name"&&id!=="asi"&&!(id==="stats"&&s&&s.pick);
    const tbl=(active&&!done&&id!=="stats")||editing?genStepTable(d,id):null;
    const wholeRoll=id!=="stats"&&rollable&&(active||done)&&!needsSub;
    return `<div class="gk-step gk-${state}" data-step="${id}">
      <div class="gk-step-h"><span class="gk-step-l">${esc(genStepLabel(d,id))}</span>
        <span class="gk-step-acts">${wholeRoll?`<button class="btn ${done?"ghost":"primary"} sm gk-roll" data-gkroll="${id}">${D20_ICON}<span>${done?"Reroll":"Roll"}</span></button>`:""}</span></div>
      ${id==="stats"?genStatsRowsHTML(d):""}
      ${done||s&&s.value!=null?`<div class="gk-step-v">${genStepValueHTML(d,id)}</div>`:""}
      ${tbl&&!(isMulti&&editing)?genTableHTML(d,id,tbl):""}
      ${needsSub?genSubEditorHTML(d,id):""}
      ${editing&&id!=="stats"?`<div class="gk-editor${id==="name"?" gk-ed-id":""}">${genEditorHTML(d,id)}</div>`:""}
      ${editing&&id==="stats"?`<div class="gk-editor">${genEditorHTML(d,"stats")}</div>`:""}
    </div>`;
  }).join("");
  host.innerHTML=`<div class="gk-steps">${rows}</div>
    <div class="mrow gk-foot">
      <button class="btn ghost sm" id="gkCancel" style="width:auto">Cancel</button>
      ${complete?"":`<button class="btn ghost sm" id="gkAll" style="width:auto">${D20_ICON}<span>Roll the rest</span></button>`}
      ${complete?`<button class="btn primary sm" id="gkFinish" style="width:auto">View the card</button>`:""}
    </div>`;
  bindGenRitual();
}
function bindGenRitual(){
  const R=_genR,d=R.draft,host=$("#gkR");
  host.querySelectorAll("[data-gkroll]").forEach(b=>b.addEventListener("click",()=>{
    genRollStep(d,b.dataset.gkroll);R.editing=null;renderGenRitual();}));
  host.querySelectorAll("[data-gkopt]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gkstep;let v=b.dataset.gkopt;
    if(id==="equip")v=Number(v);
    if(id==="sp:wings")v=v==="true";
    const isMulti=["skills","cantrips","spells","sundries"].includes(id)||(id==="feature"&&GEN_CLASSES[genClsOf(d)]&&GEN_CLASSES[genClsOf(d)].featureOpt&&GEN_CLASSES[genClsOf(d)].featureOpt.kind==="expertise");
    if(isMulti){R.editing=id;renderGenRitual();return;} // multi-pick steps edit through the selects
    if(genApplyPick(d,id,v)){R.editing=null;renderGenRitual();}
    else toast("That option doesn't fit here.");}));
  host.querySelectorAll("[data-gkedit]").forEach(el=>el.addEventListener("click",()=>{
    R.editing=R.editing===el.dataset.gkedit?null:el.dataset.gkedit;renderGenRitual();}));
  host.querySelectorAll("[data-gkrollsub]").forEach(b=>b.addEventListener("click",()=>{
    genRollSub(d,b.dataset.gkrollsub);renderGenRitual();}));
  host.querySelectorAll("[data-gksubapply]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.gksubapply;
    if(id==="feat"){const f=GEN_FEATS.find(x=>x.n===d.steps.feat.value);
      if(f.sub==="mi"){
        const list=$("#gkMiL").value;
        // Choosing the list still rolls the two cantrips and the spell from it.
        const T=genTablesOf(d);
        const cans=genRollN(Math.random,T.can[list]||GEN_CLASS_SPELLS[list][0],2,[]);
        const sp=genRollN(Math.random,T.l1[list]||GEN_CLASS_SPELLS[list][1],1,[]);
        d.steps.feat.sub={kind:"mi",list:{rolls:[],pick:true,value:list},cans,sp:{rolls:sp.rolls,value:sp.value[0]}};
        renderGenRitual();return;
      }
      const v=[0,1,2].map(i=>$("#gkFs_"+i).value);
      if(new Set(v).size!==3){toast("Three different picks needed.");return;}
      if(!genApplySubPick(d,"feat",v)){toast("Those picks don't fit here.");return;}
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
  const set=ctx.set;
  _genR={mode:ctx.mode,pn:ctx.pn||"",editing:null,
    draft:genNewDraft({sp:ctx.sp,set,counts:ctx.counts||{},tables:ctx.tables||null}),done:ctx.done};
  openModalRaw(`<h3 style="margin-bottom:4px">Roll a ${esc(GEN_SPECIES[ctx.sp].label.toLowerCase())}</h3>
    <p class="hint" style="margin:0 0 10px">${esc(set.stat)} scores, ${set.mode==="chaos"?"chaos class":"plausible class"}, ASI ${set.asi?"on":"off"}. Roll each step, or tap an option to choose it. Tap any result to change it.</p>
    <div id="gkR"></div>`);
  const m=$("#modal");if(m)m.classList.add("gk-host");
  renderGenRitual();
}
function openGenRitualDM(a){
  openGenRitual({sp:a.crew.sp,set:a.crew.set,counts:genCrewCounts(a),tables:genSpellTables(),mode:"dm",done:payload=>{
    const pc=genIngestPayload(a,payload,"",null);
    _genR=null;closeModal();
    if(pc){toast(esc(pc.name)+" joins the crew.",2200,true);preserveScroll(".adv-detail-body",renderAdvDetail);}
  }});
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CREW PANEL (adventure detail, D-002) — settings, the link, members, the fallen.
// ═══════════════════════════════════════════════════════════════════════════
function renderCrewPanel(a){
  const box=$("#crewWrap");if(!box)return;
  if(!a.crew){box.innerHTML="";crewStopPoll();return;}
  crewEnsurePoll(a);
  const sp=GEN_SPECIES[a.crew.sp],living=genLivingPCs(a),fallen=a.crew.fallen||[];
  const spOpts=Object.keys(GEN_SPECIES);
  const chips=living.map(pc=>{
    const cls=(pc.gen.payload.steps.cls||{}).value||"?";
    return `<button class="gk-chip" data-gkcard="${pc.id}" title="Open the card">${esc(pc.name)} <span class="gk-dim">${esc(cls)}</span>${pc.gen.pn?` <span class="gk-pn">${esc(pc.gen.pn)}</span>`:""}</button>`;
  }).join("");
  const fallenRows=fallen.map((f,i)=>`<div class="gk-fallen-row">
      <span class="gk-fallen-n">${esc(f.name)}${f.cls?` <span class="gk-dim">${esc(f.cls)}</span>`:""}${f.pn?` <span class="gk-pn">${esc(f.pn)}</span>`:""}</span>
      ${f.payload?`<button class="gk-linklike" data-gkfallen="${i}">card</button>`:""}
    </div>`).join("");
  box.innerHTML=`<div class="section-label"><span>Crew${living.length?` <span class="pc-count2">${living.length}</span>`:""}</span></div>
    <div class="gk-panel">
      <div class="gk-cfg">
        <label class="gk-f"><span>Species</span>${spOpts.length>1?genSel("crewSp",spOpts,a.crew.sp,spOpts.map(k=>GEN_SPECIES[k].label)):`<span class="gk-static">${esc(sp.label)}</span>`}</label>
        <label class="gk-f"><span>Scores</span>${genSel("crewStat",["3d6","4d6"],a.crew.set.stat,["3d6, in order","4d6 drop lowest"])}</label>
        <label class="gk-f"><span>Class</span>${genSel("crewMode",["plausible","chaos"],a.crew.set.mode,["Plausible (best fits)","Chaos (any)"])}</label>
        <label class="gk-f"><span>Background ASI</span>${genSel("crewAsi",["on","off"],a.crew.set.asi?"on":"off",["+2 / +1","Off"])}</label>
      </div>
      <div class="gk-share">
        ${a.crew.shareId
          ?`<span class="gk-share-on">Player link active</span><button class="btn ghost sm" id="crewCopy" style="width:auto">Copy link</button><button class="btn ghost sm" id="crewQR" style="width:auto">QR</button><button class="btn ghost sm" id="crewStop" style="width:auto">Stop</button>`
          :`<button class="btn ghost sm" id="crewShare" style="width:auto">Create the player link</button><span class="gk-dim">Players roll their own kobolds from their phones.</span>`}
      </div>
      <div class="gk-members">
        <button class="btn primary sm" id="crewRoll" style="width:auto">Roll a ${esc(sp.label.toLowerCase())}</button>
        ${chips||`<span class="gk-dim">No crew yet.</span>`}
      </div>
      ${fallen.length?`<div class="gk-fallen"><div class="gk-fallen-h">Caduti · ${fallen.length}</div>${fallenRows}</div>`:""}
    </div>`;
  bindCrewPanel(a);
}
function bindCrewPanel(a){
  const box=$("#crewWrap");
  const sel=(id,fn)=>{const el=$(id);if(el)el.addEventListener("change",()=>{fn(el.value);saveAdv();crewPushConfig(a);});};
  sel("#crewSp",v=>{if(GEN_SPECIES[v])a.crew.sp=v;});
  sel("#crewStat",v=>{a.crew.set.stat=v==="4d6"?"4d6":"3d6";});
  sel("#crewMode",v=>{a.crew.set.mode=v==="chaos"?"chaos":"plausible";});
  sel("#crewAsi",v=>{a.crew.set.asi=v==="on";});
  const roll=$("#crewRoll");if(roll)roll.addEventListener("click",()=>openGenRitualDM(a));
  box.querySelectorAll("[data-gkcard]").forEach(b=>b.addEventListener("click",()=>{
    const pc=rosterById(b.dataset.gkcard);if(!pc||!pc.gen)return;
    openGenCard(a,pc.gen.payload,{pcId:pc.id,pn:pc.gen.pn||""});}));
  box.querySelectorAll("[data-gkfallen]").forEach(b=>b.addEventListener("click",()=>{
    const f=a.crew.fallen[Number(b.dataset.gkfallen)];if(!f||!f.payload)return;
    openGenCard(a,f.payload,{dead:true,pn:f.pn||""});}));
  const share=$("#crewShare");if(share)share.addEventListener("click",()=>crewMintShare(a));
  const copy=$("#crewCopy");if(copy)copy.addEventListener("click",()=>{navigator.clipboard.writeText(genCrewUrl(a.crew.shareId)).then(()=>toast("Link copied."),()=>toast("Copy failed. Use the QR instead."));});
  const qr=$("#crewQR");if(qr)qr.addEventListener("click",()=>openShareQR(genCrewUrl(a.crew.shareId)));
  const stop=$("#crewStop");if(stop)stop.addEventListener("click",()=>confirmModal("Stop the player link? Phones lose access until you create a new one.",async()=>{
    const id=a.crew.shareId;a.crew.shareId="";saveAdv();renderCrewPanel(a);await jbinDeletePublic(id);}));
}
// Config under /cfg (never clobbers the phones' /crew subtree). Carries the resolved spell tables
// so phones roll over the same lists the DM's library produces (D-012).
function crewShareCfg(a){return {name:advDName(a),sp:a.crew.sp,set:{...a.crew.set},tables:genSpellTables()};}
async function crewMintShare(a){
  const id=await jbinSetPublic(null,{v:1,kind:"crew",cfg:crewShareCfg(a)});
  if(!id){toast("Cloud unreachable. Try again in a moment.");return;}
  a.crew.shareId=id;saveAdv();renderCrewPanel(a);
}
async function crewPushConfig(a){
  if(!a.crew||!a.crew.shareId)return;
  await jbinFetch(`${FB_BASE}/shares/${a.crew.shareId}/cfg.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(crewShareCfg(a))});
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
  renderCrewScreen();
  const refresh=async()=>{const n=await jbinReadBin(_crew.id);
    if(n&&n.kind==="crew"&&n.cfg){_crew.node=n;if(!document.querySelector("#gkR"))renderCrewScreen();}};
  setInterval(refresh,12000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
}
function crewMyRec(){const c=_crew.node&&_crew.node.crew;return (c&&c[_crew.pid])||null;}
function crewResGet(payloadId){try{return JSON.parse(localStorage.getItem("mf_crewres:"+payloadId)||"{}");}catch(e){return {};}}
function crewResSet(payloadId,k,used){try{const o=crewResGet(payloadId);o[k]=used;localStorage.setItem("mf_crewres:"+payloadId,JSON.stringify(o));}catch(e){}}
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
        <button class="btn ghost crew-die" id="crewDied">${esc(ch.name)} died. Roll the next one</button>`;
    }else main=`<p class="gk-dim">Your character data can't be read. Roll a fresh one.</p><button class="btn primary" id="crewRollBtn">Roll your kobold</button>`;
  }else{
    main=`<div class="crew-claim"><p>No ${esc(GEN_SPECIES[sp].label.toLowerCase())} yet, ${esc(_crew.pn)}.</p>
      <button class="btn primary" id="crewRollBtn">Roll your ${esc(GEN_SPECIES[sp].label.toLowerCase())}</button></div>`;
  }
  root.innerHTML=`<div class="crew-wrap">
    <div class="crew-head"><div class="crew-title">${esc(cfg.name||"The crew")}</div>
      <div class="crew-subtitle">${esc(GEN_SPECIES[sp].label)} crew${deathsTotal?` · fallen so far: ${deathsTotal}`:""}${_crew.pn?` · you: <b>${esc(_crew.pn)}</b> <button class="gk-linklike" id="crewRename">change</button>`:""}</div></div>
    ${main}
    ${crewRows?`<div class="crew-mates"><div class="crew-mates-h">The rest of the crew</div>${crewRows}</div>`:""}
  </div>`;
  bindCrewScreen(sp,cfg,my);
}
function bindCrewScreen(sp,cfg,my){
  const root=$("#crewRoot");
  if(my&&my.cur){const v=validateGenPayload(my.cur);
    if(v.ok){const ch=deriveGenChar(v.clean);
      const host=$("#crewCard");
      if(host)genMountCard(host,ch,{pn:_crew.pn,res:crewResGet(v.clean.id),pips:"live"},
        {onRes:(k,used)=>crewResSet(v.clean.id,k,used)});}}
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
  if(died)died.addEventListener("click",()=>confirmModal("Rolling a new kobold marks this one as dead for the whole crew. Continue?",()=>crewOpenRitual(sp,cfg,true)));
}
function crewCounts(){
  const c={};Object.values(_crew.node.crew||{}).forEach(r=>{
    const cls=r&&r.cur&&r.cur.steps&&r.cur.steps.cls?r.cur.steps.cls.value:null;
    if(cls)c[cls]=(c[cls]||0)+1;});
  return c;
}
function crewOpenRitual(sp,cfg,isReplacement){
  openGenRitual({sp,set:cfg.set||{},counts:crewCounts(),tables:cfg.tables||null,mode:"crew",pn:_crew.pn,done:async payload=>{
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
    let changed=false;
    for(const [pid,rec] of Object.entries(node.crew)){
      if(!rec||!rec.cur)continue;
      const pn=String(rec.pn||"").replace(/[<>]/g,"").slice(0,24);
      if(genIngestPayload(adv,rec.cur,pn,"p:"+String(pid).slice(0,24)))changed=true;
    }
    if(changed&&state.selAdv===advId&&$("#crewWrap"))preserveScroll(".adv-detail-body",renderAdvDetail);
  };
  _crewPoll={advId,timer:setInterval(tick,12000)};
  tick();
}
function crewStopPoll(){if(_crewPoll){clearInterval(_crewPoll.timer);_crewPoll=null;}}
