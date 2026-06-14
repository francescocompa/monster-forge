"use strict";
const CR_LIST=["0","1/8","1/4","1/2","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"];
const CR_XP={"0":10,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,"5":1800,"6":2300,"7":2900,"8":3900,"9":5000,"10":5900,"11":7200,"12":8400,"13":10000,"14":11500,"15":13000,"16":15000,"17":18000,"18":20000,"19":22000,"20":25000,"21":33000,"22":41000,"23":50000,"24":62000,"25":75000,"26":90000,"27":105000,"28":120000,"29":135000,"30":155000};
const CR_NUM={"0":0,"1/8":.125,"1/4":.25,"1/2":.5};CR_LIST.forEach(c=>{if(!(c in CR_NUM))CR_NUM[c]=Number(c);});
function pbForCR(cr){const v={"0":2,"1/8":2,"1/4":2,"1/2":2,"1":2,"2":2,"3":2,"4":2,"5":3,"6":3,"7":3,"8":3,"9":4,"10":4,"11":4,"12":4,"13":5,"14":5,"15":5,"16":5,"17":6,"18":6,"19":6,"20":6,"21":7,"22":7,"23":7,"24":7,"25":8,"26":8,"27":8,"28":8,"29":9,"30":9};return v[cr]||2;}
const BOH={"0":[13,3,2,1,9,0],"1/8":[13,9,3,3,10,1],"1/4":[13,15,3,6,10,1],"1/2":[14,24,4,9,11,2],"1":[14,30,4,12,11,2],"2":[14,45,5,18,12,3],"3":[15,60,5,24,12,3],"4":[15,75,6,30,13,4],"5":[15,90,6,36,13,4],"6":[16,105,7,42,14,4],"7":[16,120,7,48,14,4],"8":[16,135,8,54,15,4],"9":[17,150,8,60,15,4],"10":[17,165,9,66,16,5],"11":[17,180,9,72,16,5],"12":[18,195,10,78,17,5],"13":[18,210,10,84,17,5],"14":[18,225,11,90,18,6],"15":[19,240,11,96,18,6],"16":[19,255,12,102,19,6],"17":[19,270,12,108,19,6],"18":[20,285,13,114,20,7],"19":[20,300,13,120,20,7],"20":[20,315,14,126,21,7],"21":[21,350,14,132,21,7],"22":[21,400,15,138,22,8],"23":[21,450,15,144,22,8],"24":[22,500,16,150,23,8],"25":[22,550,16,156,23,8],"26":[22,600,17,162,24,9],"27":[22,650,17,168,24,9],"28":[22,700,18,174,25,9],"29":[22,750,18,180,25,9],"30":[22,800,19,186,26,9]};
const BUDGET={1:[50,75,100],2:[100,150,200],3:[150,225,400],4:[250,375,500],5:[500,750,1100],6:[600,1000,1400],7:[750,1300,1700],8:[1000,1700,2100],9:[1300,2000,2600],10:[1600,2300,3100],11:[1900,2900,4100],12:[2200,3700,4700],13:[2600,4200,5400],14:[2900,4900,6200],15:[3300,5400,7800],16:[3800,6100,9800],17:[4500,7200,11700],18:[5000,8700,14200],19:[5500,10700,17200],20:[6400,13200,22000]};
const SIZES=["Tiny","Small","Medium","Large","Huge","Gargantuan"];
const SKILLS={Acrobatics:"dex",Animal_Handling:"wis",Arcana:"int",Athletics:"str",Deception:"cha",History:"int",Insight:"wis",Intimidation:"cha",Investigation:"int",Medicine:"wis",Nature:"int",Perception:"wis",Performance:"cha",Persuasion:"cha",Religion:"int",Sleight_of_Hand:"dex",Stealth:"dex",Survival:"wis"};
const ABILS=["str","dex","con","int","wis","cha"];
const DMG_TYPES=["Acid","Bludgeoning","Cold","Fire","Force","Lightning","Necrotic","Piercing","Poison","Psychic","Radiant","Slashing","Thunder"];
const FACTIONS=["Enemy","Ally","Party","Setting"];
const STATUSES=["Draft","Ready","Archived"]; // bestiary workflow status (Batch 13)
const LEGEND_INTRO="Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, [c] can expend a use to take one of the following options. [C] regains all expended uses at the start of each of its turns.";
const LAIR_INTRO="On initiative count 20 (losing initiative ties), [c] takes a lair action to cause one of the following effects; [c] can't use the same effect two rounds in a row:";
const VILLAIN_INTRO="[C] has three villain actions. [C] can take each one once per encounter, immediately after another creature's turn, and must use them in order (Action 1, then 2, then 3).";

const mod=s=>Math.floor((Number(s||10)-10)/2);
const sgn=n=>(n>=0?"+":"")+n;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const diceAvg=d=>{const m=String(d||"").match(/(\d+)\s*d\s*(\d+)/i);return m?Number(m[1])*(Number(m[2])+1)/2:0;};
const SIZE_DIE={Tiny:"d4",Small:"d6",Medium:"d8",Large:"d10",Huge:"d12",Gargantuan:"d20"};
// average a full dice expression like "2d6 + 6" or "1d8 - 1"; rounds down, min 1
function exprAvg(expr){let t=0;let s=String(expr).replace(/\s+/g,"");
  s=s.replace(/([+-]?)(\d+)d(\d+)/gi,(_,sg,n,f)=>{const v=Number(n)*(Number(f)+1)/2;t+=(sg==="-"?-v:v);return "+";});
  (s.match(/[+-]?\d+/g)||[]).forEach(x=>t+=Number(x));
  return Math.max(1,Math.floor(t));}
// replace [dice] tokens in rendered text with "avg (dice)"
function avgBrackets(t){return String(t).replace(/\[([^\]]*?\d+\s*[dD]\s*\d+[^\]]*?)\]/g,(_,e)=>exprAvg(e)+" ("+e.trim()+")");}
function initOf(m){if(m.init!==""&&m.init!=null)return Number(m.init);const pb=pbForCR(m.cr);const b=m.initProf==="exp"?pb*2:m.initProf==="prof"?pb:0;return mod(m.dex)+b;}

function mk(o){return{id:o.id,chassis:true,name:o.name,size:o.size||"Medium",type:o.type||"Humanoid",subtype:o.subtype||"",align:o.align||"Neutral",
  ac:o.ac,acnote:o.acnote||"",hp:o.hp,hpf:o.hpf||"",spd:o.spd||{walk:30,climb:0,fly:0,swim:0,burrow:0,hover:false},init:"",
  str:o.s[0],dex:o.s[1],con:o.s[2],int:o.s[3],wis:o.s[4],cha:o.s[5],saves:o.saves||[],skills:o.skills||[],
  dmg:o.dmg||{},dmgnote:o.dmgnote||"",cimm:o.cimm||"",gear:o.gear||"",senses:o.senses||"",lang:o.lang||"Common",cr:o.cr,xpOver:"",
  traits:o.traits||[],actions:o.actions||[],bonus:o.bonus||[],reactions:o.reactions||[],
  legend:{on:false,intro:"",items:[]},villain:{on:false,intro:"",items:[]},lair:{on:false,intro:"",items:[],regional:""},_auto:{ac:false,hp:false}};}
const T=(name,text)=>({name,text,mode:"text"});
const ATK=o=>Object.assign({mode:"attack",name:"",kind:"Melee",ability:"str",atk:"",reach:5,range:"",targets:"",dice:"1d6",addMod:true,dtype:"Slashing",extra:""},o);
const SPELL=o=>Object.assign({mode:"spell",name:"Spellcasting",ability:"cha",dc:"",atk:"",groups:[{freq:"At Will",spells:""}]},o);

// ── Snippet library ───────────────────────────────────────────────────────────
// Canonical 2024-style wording, genericised with [C]/[c]/[s] reference tokens and
// {DC} (expands to 8 + PB + best ability mod). Inserted via the per-section
// "From library" dropdowns or by typing a known name into an entry's Name field.
const TRAIT_SNIPS={
  "Aggressive":"As a Bonus Action, [c] moves up to its Speed toward an enemy it can see.",
  "Amorphous":"[C] can move through a space as narrow as 1 inch without expending extra movement to do so.",
  "Amphibious":"[C] can breathe air and water.",
  "Beast Whisperer":"[C] can communicate with Beasts as if they shared a language.",
  "Brave":"[C] has Advantage on saving throws against being Frightened.",
  "Charge":"If [c] moves at least 20 feet straight toward a target and then hits it with a melee attack on the same turn, the target takes an extra 7 (2d6) damage of the attack's type.",
  "Death Burst":"[C] explodes when it dies. Dexterity Saving Throw: DC {DC}, each creature in a 5-foot Emanation originating from [c]. Failure: 5 (2d4) damage. Success: Half damage.",
  "Devil's Sight":"Magical Darkness doesn't impede [c]'s Darkvision.",
  "Echolocation":"[C] can't use [c]'s Blindsight while it has the Deafened condition.",
  "False Appearance":"While [c] remains motionless, it is indistinguishable from an ordinary object.",
  "Flyby":"[C] doesn't provoke an Opportunity Attack when it flies out of an enemy's reach.",
  "Hold Breath":"[C] can hold its breath for 1 hour.",
  "Incorporeal Movement":"[C] can move through other creatures and objects as if they were Difficult Terrain. [C] takes 5 (1d10) Force damage if it ends its turn inside an object.",
  "Keen Hearing and Sight":"[C] has Advantage on Wisdom (Perception) checks that rely on hearing or sight.",
  "Keen Senses":"[C] has Advantage on Wisdom (Perception) checks that rely on hearing, sight, or smell.",
  "Keen Smell":"[C] has Advantage on Wisdom (Perception) checks that rely on smell.",
  "Legendary Resistance (3/Day)":"If [c] fails a saving throw, it can choose to succeed instead.",
  "Magic Resistance":"[C] has Advantage on saving throws against spells and other magical effects.",
  "Nimble Escape":"[C] takes the Disengage or Hide action.",
  "Pack Tactics":"[C] has Advantage on an attack roll against a creature if at least one of [c]'s allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.",
  "Pounce":"If [c] moves at least 20 feet straight toward a creature and then hits it with a melee attack on the same turn, the target must succeed on a DC {DC} Strength saving throw or have the Prone condition. If the target is Prone, [c] can make one melee attack against it as a Bonus Action.",
  "Reckless":"At the start of its turn, [c] can gain Advantage on melee attack rolls during that turn, but attack rolls against it have Advantage until the start of its next turn.",
  "Regeneration":"[C] regains 10 Hit Points at the start of each of its turns. If [c] takes Acid or Fire damage, this trait doesn't function on [c]'s next turn. [C] dies only if it starts its turn with 0 Hit Points and doesn't regenerate.",
  "Rejuvenation":"If [c] is destroyed, it gains a new body in 1d10 days, regaining all its Hit Points and becoming active again. The new body appears within [c]'s lair.",
  "Relentless":"If [c] takes damage that would reduce it to 0 Hit Points, it drops to 1 Hit Point instead (recharges after a Short or Long Rest).",
  "Shapechanger":"[C] can shape-shift into a Beast or Humanoid, or back into its true form, as a Bonus Action. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
  "Siege Monster":"[C] deals double damage to objects and structures.",
  "Sneak Attack":"Once per turn, [c] deals an extra 7 (2d6) damage to a creature it hits with an attack roll if [c] has Advantage on the roll, or if another enemy of the target is within 5 feet of it, that enemy doesn't have the Incapacitated condition, and [c] doesn't have Disadvantage on the roll.",
  "Spell Immunity":"[C] is immune to three spells chosen by its creator. Typical choices are Heat Metal, Lightning Bolt, and Magic Missile.",
  "Spider Climb":"[C] can climb difficult surfaces, including along ceilings, without needing to make an ability check.",
  "Standing Leap":"[C]'s Long Jump is up to 30 feet and its High Jump is up to 15 feet, with or without a running start.",
  "Sunlight Sensitivity":"While in sunlight, [c] has Disadvantage on ability checks and attack rolls.",
  "Sure-Footed":"[C] has Advantage on Strength and Dexterity saving throws made against effects that would knock it Prone.",
  "Turn Resistance":"[C] has Advantage on saving throws against any effect that turns Undead.",
  "Two Heads":"[C] has Advantage on saving throws against being Blinded, Charmed, Deafened, Frightened, Stunned, or knocked Unconscious.",
  "Undead Fortitude":"If damage reduces [c] to 0 Hit Points, it makes a Constitution saving throw (DC 5 plus the damage taken) unless the damage is Radiant or from a Critical Hit. On a success, [c] drops to 1 Hit Point instead.",
  "Water Breathing":"[C] can breathe only underwater.",
  "Web Sense":"While in contact with a web, [c] knows the exact location of any other creature in contact with the same web.",
  "Web Walker":"[C] ignores movement restrictions caused by webs.",
};
// guided-attack presets: starting points for the guided builder (dice & type are editable suggestions)
const ATK_PRESETS={
  "Bite":{kind:"Melee",ability:"str",dice:"1d6",dtype:"Piercing",reach:5},
  "Claw":{kind:"Melee",ability:"str",dice:"1d4",dtype:"Slashing",reach:5},
  "Slam":{kind:"Melee",ability:"str",dice:"1d6",dtype:"Bludgeoning",reach:5},
  "Gore":{kind:"Melee",ability:"str",dice:"1d6",dtype:"Piercing",reach:5},
  "Tail":{kind:"Melee",ability:"str",dice:"1d8",dtype:"Bludgeoning",reach:10},
  "Tentacle":{kind:"Melee",ability:"str",dice:"1d6",dtype:"Bludgeoning",reach:10},
  "Sting":{kind:"Melee",ability:"str",dice:"1d4",dtype:"Piercing",reach:5},
  "Tusk":{kind:"Melee",ability:"str",dice:"1d8",dtype:"Piercing",reach:5},
  "Hooves":{kind:"Melee",ability:"str",dice:"2d4",dtype:"Bludgeoning",reach:5},
  "Fist":{kind:"Melee",ability:"str",dice:"1d4",dtype:"Bludgeoning",reach:5},
  "Longsword":{kind:"Melee",ability:"str",dice:"1d8",dtype:"Slashing",reach:5},
  "Shortsword":{kind:"Melee",ability:"dex",dice:"1d6",dtype:"Piercing",reach:5},
  "Greatsword":{kind:"Melee",ability:"str",dice:"2d6",dtype:"Slashing",reach:5},
  "Greataxe":{kind:"Melee",ability:"str",dice:"1d12",dtype:"Slashing",reach:5},
  "Battleaxe":{kind:"Melee",ability:"str",dice:"1d8",dtype:"Slashing",reach:5},
  "Mace":{kind:"Melee",ability:"str",dice:"1d6",dtype:"Bludgeoning",reach:5},
  "Warhammer":{kind:"Melee",ability:"str",dice:"1d8",dtype:"Bludgeoning",reach:5},
  "Maul":{kind:"Melee",ability:"str",dice:"2d6",dtype:"Bludgeoning",reach:5},
  "Spear":{kind:"Melee or Ranged",ability:"str",dice:"1d6",dtype:"Piercing",reach:5,range:"20/60"},
  "Halberd":{kind:"Melee",ability:"str",dice:"1d10",dtype:"Slashing",reach:10},
  "Glaive":{kind:"Melee",ability:"str",dice:"1d10",dtype:"Slashing",reach:10},
  "Pike":{kind:"Melee",ability:"str",dice:"1d10",dtype:"Piercing",reach:10},
  "Dagger":{kind:"Melee or Ranged",ability:"dex",dice:"1d4",dtype:"Piercing",reach:5,range:"20/60"},
  "Scimitar":{kind:"Melee",ability:"dex",dice:"1d6",dtype:"Slashing",reach:5},
  "Rapier":{kind:"Melee",ability:"dex",dice:"1d8",dtype:"Piercing",reach:5},
  "Quarterstaff":{kind:"Melee",ability:"str",dice:"1d6",dtype:"Bludgeoning",reach:5},
  "Longbow":{kind:"Ranged",ability:"dex",dice:"1d8",dtype:"Piercing",range:"150/600"},
  "Shortbow":{kind:"Ranged",ability:"dex",dice:"1d6",dtype:"Piercing",range:"80/320"},
  "Light Crossbow":{kind:"Ranged",ability:"dex",dice:"1d8",dtype:"Piercing",range:"80/320"},
  "Heavy Crossbow":{kind:"Ranged",ability:"dex",dice:"1d10",dtype:"Piercing",range:"100/400"},
  "Hand Crossbow":{kind:"Ranged",ability:"dex",dice:"1d6",dtype:"Piercing",range:"30/120"},
  "Sling":{kind:"Ranged",ability:"dex",dice:"1d4",dtype:"Bludgeoning",range:"30/120"},
  "Javelin":{kind:"Melee or Ranged",ability:"str",dice:"1d6",dtype:"Piercing",reach:5,range:"30/120"},
  "Dart":{kind:"Ranged",ability:"dex",dice:"1d4",dtype:"Piercing",range:"20/60"},
  "Fire Bolt":{kind:"Ranged",ability:"cha",dice:"1d10",dtype:"Fire",addMod:false,range:"120"},
  "Ray of Frost":{kind:"Ranged",ability:"cha",dice:"1d8",dtype:"Cold",addMod:false,range:"60",extra:"plus the target's Speed decreases by 10 feet until the start of [c]'s next turn."},
  "Eldritch Blast":{kind:"Ranged",ability:"cha",dice:"1d10",dtype:"Force",addMod:false,range:"120"},
  "Poison Spray":{kind:"Ranged",ability:"cha",dice:"1d12",dtype:"Poison",addMod:false,range:"10"},
  "Acid Splash":{kind:"Ranged",ability:"cha",dice:"1d6",dtype:"Acid",addMod:false,range:"60"},
};
const TEXT_ACTIONS={
  "Frightful Presence":"Each creature of [c]'s choice within 120 feet of [c] and aware of it must succeed on a DC {DC} Wisdom saving throw or have the Frightened condition for 1 minute. A Frightened creature repeats the save at the end of each of its turns, ending the effect on itself on a success.",
  "Teleport":"[C] teleports up to 30 feet to an unoccupied space it can see.",
  "Change Shape":"[C] transforms into a Beast or Humanoid of challenge rating equal to or less than its own, or back into its true form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
};
const BONUS_SNIPS={
  "Nimble Escape":"[C] takes the Disengage or Hide action.",
  "Leadership":"For 1 minute, [c] can utter a special command or warning whenever a nonhostile creature it can see within 30 feet of it makes an attack roll or a saving throw. The creature can add a d4 to its roll provided it can hear and understand [c]. This effect ends if [c] has the Incapacitated condition.",
  "Frightful Presence":TEXT_ACTIONS["Frightful Presence"],
  "Teleport":TEXT_ACTIONS["Teleport"],
  "Change Shape":TEXT_ACTIONS["Change Shape"],
};
const REACT_SNIPS={
  "Parry":{trigger:"[C] is hit by a melee attack roll while holding a weapon.",response:"[C] adds 2 to its AC against that attack, possibly causing it to miss."},
  "Riposte":{trigger:"[C] is hit by a melee attack roll while holding a weapon.",response:"[C] adds 3 to its AC against that attack, possibly causing it to miss. On a miss, [c] makes one melee attack against the triggering creature if it is within range."},
  "Redirect Attack":{trigger:"A creature [c] can see makes an attack roll against it.",response:"[C] chooses a Small or Medium ally within 5 feet of itself. [C] and that ally swap places, and the ally becomes the target of the attack instead."},
  "Shield":{trigger:"[C] is hit by an attack roll or targeted by the Magic Missile spell.",response:"[C] casts the Shield spell, gaining a +5 bonus to AC until the start of its next turn, including against the triggering attack."},
  "Uncanny Dodge":{trigger:"[C] is hit by an attack roll that it can see.",response:"[C] halves the damage (round down) it takes from that attack."},
  "Deflect Missiles":{trigger:"[C] is hit by a ranged attack roll and takes Bludgeoning, Piercing, or Slashing damage.",response:"[C] reduces the damage by 1d10 plus its Dexterity modifier."},
  "Opportunity Attack":{trigger:"A creature [c] can see leaves [c]'s reach.",response:"[C] makes one melee attack against the triggering creature."},
};
// Generic, reskinnable presets in the same [C]/[c]/{DC} token style as the trait library.
const LEGEND_SNIPS={
  "Attack":"[C] makes one attack.",
  "Move":"[C] moves up to its Speed without provoking Opportunity Attacks.",
  "Cantrip":"[C] casts one of its cantrips.",
  "Detect":"[C] makes a Wisdom (Perception) check.",
  "Teleport":"[C] teleports, along with any equipment it is wearing or carrying, up to 30 feet to an unoccupied space it can see.",
  "Frightening Gaze":"[C] targets one creature it can see within 30 feet. The target makes a DC {DC} Wisdom saving throw or has the Frightened condition until the end of [c]'s next turn.",
  "Tail Swipe":"[C] makes one melee attack with its tail against a creature within reach.",
  "Wing Attack (Costs 2 Uses)":"[C] beats its wings. Each creature within 10 feet of [c] makes a DC {DC} Dexterity saving throw, taking 14 (4d6) Bludgeoning damage on a failed save, or half as much on a success. [C] can then fly up to half its Speed.",
  "Drain (Costs 2 Uses)":"One creature within 30 feet of [c] makes a DC {DC} Constitution saving throw, taking 14 (4d6) Necrotic damage on a failed save, or half as much on a success.",
  "Summon (Costs 2 Uses)":"[C] summons one ally of challenge rating 2 or lower in an unoccupied space within 30 feet; it acts on [c]'s initiative.",
};
const VILLAIN_SNIPS={
  "Reposition":"[C] and each ally within 30 feet of it can move up to their Speed without provoking Opportunity Attacks.",
  "Signature Strike":"[C] makes one attack against each creature of its choice that it can reach.",
  "Area Assault":"Each creature in a 20-foot-radius Sphere centered on a point [c] can see within 60 feet makes a DC {DC} Dexterity saving throw, taking 21 (6d6) damage on a failed save, or half as much on a success.",
  "Rallying Command":"Each ally within 30 feet of [c] can immediately use its Reaction to make one attack.",
  "Desperate Gambit":"[C] takes the Dodge action and regains 22 (4d10) Hit Points. Until the start of its next turn, the first attack roll against [c] each turn has Disadvantage.",
  "Mass Debilitation":"Each enemy within 30 feet of [c] makes a DC {DC} Constitution saving throw or has the Frightened condition until the end of [c]'s next turn.",
};
const LAIR_SNIPS={
  "Grasping Terrain":"The ground in a 20-foot-radius area [c] can see becomes Difficult Terrain until the next lair action. Each creature there makes a DC {DC} Strength saving throw or has the Restrained condition until the next lair action.",
  "Eruption":"[C] targets a point it can see within 60 feet. Each creature within a 5-foot radius makes a DC {DC} Dexterity saving throw, taking 11 (2d10) damage on a failed save, or half as much on a success.",
  "Obscuring Veil":"A 20-foot-radius Sphere of magical mist appears within 120 feet of [c], Heavily Obscuring its area until the next lair action.",
  "Hazardous Ground":"A 15-foot-radius area [c] can see becomes hazardous until the next lair action. A creature that enters it for the first time on a turn or starts its turn there makes a DC {DC} Constitution saving throw, taking 7 (2d6) damage on a failure.",
  "Summon Hazard":"[C] conjures a creature of challenge rating 1 or lower in an unoccupied space it can see within 60 feet; it acts on initiative count 20.",
};
const LIB_PROMPT='<option value="">＋ From library…</option>';
const CHASSIS=[
  mk({id:"c_commoner",name:"Commoner",ac:10,hp:4,hpf:"1d8",s:[10,10,10,10,10,10],cr:"0",actions:[ATK({name:"Club",dice:"1d4",addMod:false,dtype:"Bludgeoning",reach:5})]}),
  mk({id:"c_critter",name:"Critter",size:"Tiny",type:"Beast",ac:11,hp:3,hpf:"1d4",s:[3,14,8,2,12,4],cr:"0",spd:{walk:20,climb:20,fly:0,swim:0,burrow:0,hover:false},lang:"—",skills:[["Perception","prof"]],actions:[ATK({name:"Bite",ability:"dex",dice:"1",addMod:false,dtype:"Piercing"})]}),
  mk({id:"c_bandit",name:"Bandit",ac:12,acnote:"leather",hp:11,hpf:"2d8+2",s:[11,12,12,10,10,10],cr:"1/8",gear:"Scimitar, Light Crossbow",actions:[ATK({name:"Scimitar",dice:"1d6",addMod:true,dtype:"Slashing"}),ATK({name:"Light Crossbow",kind:"Ranged",ability:"dex",range:"80/320",dice:"1d8",dtype:"Piercing"})]}),
  mk({id:"c_guard",name:"Guard",ac:16,acnote:"chain shirt, shield",hp:11,hpf:"2d8+2",s:[13,12,12,10,11,10],cr:"1/8",skills:[["Perception","prof"]],gear:"Spear",actions:[ATK({name:"Spear",kind:"Melee or Ranged",range:"20/60",dice:"1d6",dtype:"Piercing"})]}),
  mk({id:"c_cultist",name:"Cultist",ac:12,acnote:"leather",hp:9,hpf:"2d8",s:[11,12,10,10,11,10],cr:"1/8",skills:[["Deception","prof"],["Religion","prof"]],gear:"Ritual Dagger",actions:[ATK({name:"Ritual Dagger",ability:"dex",dice:"1d4",dtype:"Slashing",extra:"plus 2 (1d4) Necrotic damage."})]}),
  mk({id:"c_skeleton",name:"Skeleton",type:"Undead",ac:14,acnote:"armor scraps",hp:13,hpf:"2d8+4",s:[10,14,15,6,8,5],cr:"1/4",dmg:{Poison:"imm",Bludgeoning:"vuln"},cimm:"Exhaustion, Poisoned",senses:"Darkvision 60 ft.",lang:"understands Common",gear:"Shortsword, Shortbow",actions:[ATK({name:"Shortsword",ability:"dex",dice:"1d6",dtype:"Piercing"}),ATK({name:"Shortbow",kind:"Ranged",ability:"dex",range:"80/320",dice:"1d6",dtype:"Piercing"})]}),
  mk({id:"c_wolf",name:"Wolf",type:"Beast",ac:12,hp:11,hpf:"2d8+2",s:[12,15,12,3,12,6],cr:"1/4",spd:{walk:40,climb:0,fly:0,swim:0,burrow:0,hover:false},skills:[["Perception","prof"],["Stealth","prof"]],lang:"—",traits:[T("Pack Tactics","Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of it.")],actions:[ATK({name:"Bite",ability:"dex",dice:"2d4",dtype:"Piercing",extra:"If the target is a creature, it has the Prone condition (DC 11 Str save negates)."})]}),
  mk({id:"c_acolyte",name:"Acolyte",ac:13,acnote:"chain shirt",hp:11,hpf:"2d8+2",s:[10,10,11,11,14,11],cr:"1/4",skills:[["Medicine","prof"],["Religion","prof"]],traits:[T("Spellcasting","WIS (save DC 12). At will: Light, Thaumaturgy. 1/day each: Bless, Cure Wounds.")],actions:[ATK({name:"Mace",dice:"1d6",addMod:false,dtype:"Bludgeoning"})]}),
  mk({id:"c_scout",name:"Scout",ac:13,acnote:"leather",hp:16,hpf:"3d8+3",s:[11,14,12,11,13,11],cr:"1/2",skills:[["Nature","prof"],["Perception","exp"],["Stealth","prof"],["Survival","exp"]],gear:"Shortsword, Longbow",actions:[T("Multiattack","The scout makes two attacks."),ATK({name:"Shortsword",ability:"dex",dice:"1d6",dtype:"Piercing"}),ATK({name:"Longbow",kind:"Ranged",ability:"dex",range:"150/600",dice:"1d8",dtype:"Piercing"})]}),
  mk({id:"c_thug",name:"Thug",ac:11,hp:32,hpf:"5d8+10",s:[15,11,14,10,10,11],cr:"1/2",skills:[["Intimidation","prof"]],gear:"Mace",traits:[T("Pack Tactics","Advantage on an attack roll against a creature if an ally is within 5 feet of it.")],actions:[T("Multiattack","The thug makes two Mace attacks."),ATK({name:"Mace",dice:"1d6",dtype:"Bludgeoning"})]}),
  mk({id:"c_berserker",name:"Berserker",ac:13,acnote:"hide",hp:67,hpf:"9d8+27",s:[16,12,17,9,11,9],cr:"2",gear:"Greataxe",actions:[ATK({name:"Greataxe",dice:"1d12",dtype:"Slashing"})]}),
  mk({id:"c_priest",name:"Priest",ac:13,acnote:"chain shirt",hp:38,hpf:"7d8+7",s:[10,10,12,13,16,13],cr:"2",skills:[["Medicine","prof"],["Persuasion","prof"],["Religion","prof"]],traits:[T("Spellcasting","WIS (save DC 13, +5 to hit). At will: Light, Sacred Flame, Thaumaturgy. 1/day each: Dispel Magic, Spirit Guardians.")],actions:[ATK({name:"Mace",dice:"1d6",addMod:false,dtype:"Bludgeoning",extra:"plus 4 (1d8) Radiant damage."})]}),
  mk({id:"c_ogre",name:"Ogre",size:"Large",type:"Giant",ac:11,hp:68,hpf:"8d10+24",s:[19,8,16,5,7,7],cr:"2",senses:"Darkvision 60 ft.",lang:"Common, Giant",gear:"Greatclub",actions:[ATK({name:"Greatclub",dice:"2d8",dtype:"Bludgeoning"})]}),
  mk({id:"c_veteran",name:"Veteran",ac:17,acnote:"splint",hp:65,hpf:"10d8+20",s:[16,13,14,10,11,10],cr:"3",skills:[["Athletics","prof"],["Perception","prof"]],gear:"Longsword, Shortsword",actions:[T("Multiattack","The veteran makes two Longsword attacks and one Shortsword attack."),ATK({name:"Longsword",dice:"1d8",dtype:"Slashing"}),ATK({name:"Shortsword",dice:"1d6",dtype:"Piercing"})]}),
  mk({id:"c_knight",name:"Knight",ac:18,acnote:"plate",hp:52,hpf:"8d8+16",s:[16,11,14,11,11,15],cr:"3",saves:["con","wis"],gear:"Greatsword",traits:[T("Brave","The knight has Advantage on saving throws against being Frightened.")],actions:[T("Multiattack","The knight makes two Greatsword attacks."),ATK({name:"Greatsword",dice:"2d6",dtype:"Slashing"})],reactions:[{name:"Parry",trigger:"The knight is hit by a melee attack and can see the attacker.",response:"The knight adds 2 to its AC against that attack.",mode:"react"}]}),
  mk({id:"c_lycan",name:"Lycanthrope",type:"Monstrosity",ac:15,hp:58,hpf:"9d8+18",s:[15,13,14,10,11,10],cr:"3",dmg:{},dmgnote:"Bludgeoning, Piercing, Slashing from nonmagical, non-silvered attacks (Resistance)",actions:[T("Multiattack","The creature makes two attacks."),ATK({name:"Bite",dice:"1d10",dtype:"Piercing",extra:"If the target is Humanoid, it must succeed on a DC 12 Con save or be cursed with lycanthropy."})]}),
  mk({id:"c_ettin",name:"Two-Headed Brute",size:"Large",type:"Giant",ac:12,hp:85,hpf:"10d10+30",s:[21,8,17,6,10,8],cr:"4",senses:"Darkvision 60 ft.",lang:"Giant",traits:[T("Two Heads","Advantage on Perception checks and on saves against Blinded, Charmed, Deafened, Frightened, Stunned, and Unconscious.")],actions:[T("Multiattack","The brute makes one Battleaxe attack and one Morningstar attack."),ATK({name:"Battleaxe",dice:"2d8",dtype:"Slashing"}),ATK({name:"Morningstar",dice:"2d8",dtype:"Piercing"})]}),
  mk({id:"c_gladiator",name:"Champion",ac:16,acnote:"studded leather, shield",hp:112,hpf:"15d8+45",s:[18,15,16,10,12,15],cr:"5",saves:["str","dex","con"],skills:[["Athletics","exp"],["Intimidation","prof"]],gear:"Spear, Shield",actions:[T("Multiattack","The champion makes three Spear attacks."),ATK({name:"Spear",kind:"Melee or Ranged",range:"20/60",dice:"2d6",dtype:"Piercing"})],reactions:[{name:"Parry",trigger:"Hit by a melee attack.",response:"Adds 3 to AC against that attack.",mode:"react"}]}),
  mk({id:"c_troll",name:"Regenerating Brute",size:"Large",type:"Giant",ac:15,hp:94,hpf:"9d10+45",s:[18,13,20,7,9,7],cr:"5",senses:"Darkvision 60 ft.",traits:[T("Regeneration","Regains 10 HP at the start of its turn. If it takes Acid or Fire damage, this doesn't function on its next turn. It dies only if it starts its turn with 0 HP and doesn't regenerate.")],actions:[T("Multiattack","One Bite and two Claw attacks."),ATK({name:"Bite",dice:"1d10",dtype:"Piercing"}),ATK({name:"Claw",dice:"1d6",dtype:"Slashing"})]}),
  mk({id:"c_mage",name:"Mage",ac:15,acnote:"Mage Armor",hp:81,hpf:"18d8",s:[9,14,11,17,12,11],cr:"6",saves:["int","wis"],skills:[["Arcana","exp"],["History","prof"]],traits:[T("Spellcasting","INT (save DC 14, +6 to hit). At will: Fire Bolt, Light, Mage Hand. 2/day each: Fireball, Misty Step. 1/day each: Cone of Cold, Wall of Force.")],actions:[ATK({name:"Fire Bolt",kind:"Ranged",ability:"int",range:"120",dice:"2d10",addMod:false,dtype:"Fire"})]}),
  mk({id:"c_assassin",name:"Assassin",ac:16,acnote:"studded leather",hp:97,hpf:"15d8+30",s:[11,18,14,16,11,10],cr:"8",saves:["dex","int"],skills:[["Acrobatics","prof"],["Perception","prof"],["Stealth","exp"]],dmg:{Poison:"res"},gear:"Shortsword",traits:[T("Assassinate","During the first round, the assassin has Advantage on attacks against any creature that hasn't taken a turn. Any hit against a Surprised creature is a Critical Hit."),T("Sneak Attack (1/Turn)","+17 (5d6) Poison damage when it hits with Advantage or while an ally is within 5 ft. of the target.")],actions:[T("Multiattack","The assassin makes three Shortsword attacks."),ATK({name:"Shortsword",ability:"dex",dice:"1d6",dtype:"Piercing",extra:"plus 7 (2d6) Poison damage."})]}),
  mk({id:"c_commander",name:"Commander",ac:18,acnote:"plate, shield",hp:153,hpf:"18d8+72",s:[18,12,18,12,14,16],cr:"9",saves:["str","con","wis"],skills:[["Athletics","prof"],["Intimidation","prof"],["Perception","prof"]],gear:"Greatsword",traits:[T("Aura of Command","Allies within 30 ft. have Advantage on saves against Frightened and Charmed.")],actions:[T("Multiattack","The commander makes three Greatsword attacks."),ATK({name:"Greatsword",dice:"2d6",dtype:"Slashing"}),T("Rallying Cry (Recharge 5–6)","Each ally within 30 ft. gains 10 temporary HP and can move up to its Speed as a Reaction.")],bonus:[T("Command Ally","One ally within 30 ft. uses its Reaction to make one weapon attack.")]}),
  mk({id:"c_aberration",name:"Aberrant Horror",size:"Large",type:"Aberration",ac:16,hp:135,hpf:"18d10+36",s:[16,14,15,18,15,18],cr:"10",saves:["con","int","wis"],senses:"Darkvision 120 ft., Truesight 30 ft.",cimm:"Charmed, Frightened",traits:[T("Maddening Presence","A creature that starts its turn within 30 ft. and can see the horror makes a DC 16 Wis save or has Disadvantage on attacks until its next turn.")],actions:[T("Multiattack","The horror makes three Tentacle attacks."),ATK({name:"Tentacle",dice:"2d8",dtype:"Bludgeoning",reach:15,extra:"plus 7 (2d6) Psychic damage."}),T("Mind Blast (Recharge 5–6)","Intelligence Saving Throw: DC 16, each creature in a 60-foot Cone. Failure: 31 (6d8 + 4) Psychic damage and Stunned until the end of its next turn. Success: Half damage.")]}),
  mk({id:"c_sorcererlord",name:"Sorcerer-Lord",ac:16,hp:144,hpf:"17d8+68",s:[12,16,18,14,13,20],cr:"12",saves:["con","cha"],skills:[["Arcana","prof"],["Deception","prof"]],dmg:{},dmgnote:"damage from spells (Resistance)",traits:[T("Spellcasting","CHA (save DC 18, +10 to hit). At will: Eldritch Blast (3 beams), Detect Magic. 2/day each: Dimension Door, Hold Monster. 1/day each: Finger of Death, Power Word Stun.")],actions:[ATK({name:"Withering Touch",ability:"cha",dice:"4d8",dtype:"Necrotic"})],legend:{on:true,intro:"",items:[T("Blink","The lord teleports up to 30 feet."),T("Drain (Costs 2 Uses)","One creature within 30 ft. makes a DC 18 Con save, taking 16 (3d10) Necrotic damage on a failure.")]}}),
  mk({id:"c_archfiend",name:"Archfiend",size:"Large",type:"Fiend",ac:19,acnote:"natural armor",hp:262,hpf:"21d10+147",s:[26,15,24,22,18,26],cr:"17",saves:["str","con","wis","cha"],dmg:{Cold:"res",Fire:"imm",Poison:"imm"},cimm:"Charmed, Frightened, Poisoned",senses:"Truesight 120 ft.",traits:[T("Legendary Resistance (3/Day)","If the archfiend fails a save, it can choose to succeed instead."),T("Magic Resistance","Advantage on saves against spells and other magical effects.")],actions:[T("Multiattack","The archfiend makes one Flame Blade attack and one Slam attack."),ATK({name:"Flame Blade",dice:"3d6",reach:10,dtype:"Slashing",extra:"plus 13 (3d8) Fire damage."}),T("Hellfire (Recharge 5–6)","Dexterity Saving Throw: DC 21, each creature in a 30-foot-radius Sphere within 120 ft. Failure: 52 (15d6) Fire damage. Success: Half damage.")],legend:{on:true,intro:"",items:[T("Teleport","The archfiend teleports up to 120 feet."),T("Hurl Flame","Ranged attack, +14, range 120 ft., 13 (3d8) Fire damage."),T("Dread (Costs 2 Uses)","Each creature within 30 ft. makes a DC 21 Wis save or is Frightened until the end of its next turn.")]},lair:{on:true,intro:"",items:[T("Eruption","Magma erupts from a point the archfiend can see within its lair; each creature in a 5-ft radius makes a DC 18 Dex save, taking 11 (2d10) Fire damage on a failure.")],regional:""}}),
];

let state={lib:[],adv:[],selAdv:null,presets:[],spells:[],conditions:[]};
let M=null, pendingForge=null;

// ── Uploaded reference libraries (Batch 13/14) ───────────────────────────────
// 5etools .md dumps the user uploads at runtime: statblocks (chassis bases), spells,
// and conditions/glossary terms. Stored in localStorage only (never JSONBin / never
// the repo): bulky, copyrighted reference data that stays on-device. Each kind lives
// in its own array/key so a spell is never mistaken for a statblock (Batch 14 note).
const PRESET_KEY="mf_presets",SPELL_KEY="mf_spells",COND_KEY="mf_conditions";
function loadPresets(){try{state.presets=(JSON.parse(localStorage.getItem(PRESET_KEY))||[]).map(normalizeMonster);}catch(e){state.presets=[];}}
function savePresets(){try{localStorage.setItem(PRESET_KEY,JSON.stringify(state.presets));}catch(e){toast("Couldn't store presets — device storage may be full.");}}
function loadSpells(){try{state.spells=JSON.parse(localStorage.getItem(SPELL_KEY))||[];}catch(e){state.spells=[];}}
function saveSpells(){try{localStorage.setItem(SPELL_KEY,JSON.stringify(state.spells));}catch(e){toast("Couldn't store spells — device storage may be full.");}}
function loadConditions(){try{state.conditions=JSON.parse(localStorage.getItem(COND_KEY))||[];}catch(e){state.conditions=[];}}
function saveConditions(){try{localStorage.setItem(COND_KEY,JSON.stringify(state.conditions));}catch(e){toast("Couldn't store conditions — device storage may be full.");}}
function loadRefLibs(){loadPresets();loadSpells();loadConditions();}
// statblock sources only (drives the From-chassis source picker)
function presetSources(){const s=[];state.presets.forEach(m=>{const k=m._source||"Uploaded";const e=s.find(x=>x.name===k);if(e)e.count++;else s.push({name:k,count:1});});return s;}
// every uploaded library across kinds, for the manage modal
function presetLibraries(){const map={};
  const add=(arr,kind)=>arr.forEach(x=>{const n=x._source||"Uploaded",key=n+" "+kind;(map[key]=map[key]||{name:n,kind,count:0}).count++;});
  add(state.presets,"statblock");add(state.spells,"spell");add(state.conditions,"condition");
  return Object.values(map);}
const KIND_LABEL={statblock:"Statblocks",spell:"Spells",condition:"Conditions"};

// ── JSONBin cloud storage ─────────────────────────────────────────────────────
// Personal-use master key (full CRUD). The previous value was a read-only ACCESS key,
// which is why every create/write returned 401 "Invalid X-Master-Key".
const JBIN_KEY="$2a$10$O99keLRG2gcLv9rw7bX1KOacdL.mv/OuBSrg2m6FqHf3k2CTBG3KK";
const JBIN_BASE="https://api.jsonbin.io/v3";
const JBIN_HEADERS={"Content-Type":"application/json","X-Master-Key":JBIN_KEY,"X-Bin-Private":"true"};
// Bin IDs are created on first save and persisted in localStorage as a cheap lookup table
function getBinId(k){return localStorage.getItem("mf_bin:"+k)||null;}
function setBinId(k,id){localStorage.setItem("mf_bin:"+k,id);}
// Local mirror: every save is written here first so work survives a cloud outage or a
// cleared/empty bin. On load we hydrate from this instantly, then reconcile with the cloud.
function cacheGet(k){try{return JSON.parse(localStorage.getItem("mf_cache:"+k));}catch(e){return null;}}
function cacheSet(k,val){try{localStorage.setItem("mf_cache:"+k,JSON.stringify(val));}catch(e){/* quota — cloud is still the backstop */}}
// "dirty" = we have local edits that haven't been confirmed written to the cloud
function isDirty(){return localStorage.getItem("mf_dirty")==="1";}
function setDirty(v){if(v)localStorage.setItem("mf_dirty","1");else localStorage.removeItem("mf_dirty");}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let cloudReady=false; // true once the cloud has been read (or confirmed to have no bin yet)

// fetch with retry on rate-limit (429) and transient 5xx; returns the Response or null
async function jbinFetch(url,opts,tries=3){
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(url,opts);
      if(r.ok)return r;
      if(r.status!==429&&r.status<500)return r; // hard error — don't burn retries
    }catch(e){/* network — retry */}
    if(i<tries-1)await sleep(500*(i+1));
  }
  return null;
}
// returns {ok:true,record} on success, {ok:true,record:null,noBin:true} when no bin exists
// yet, {ok:false} when the cloud was unreachable (so callers never confuse "empty" with "down")
async function jbinGet(k){
  const id=getBinId(k);
  if(!id)return {ok:true,record:null,noBin:true};
  const r=await jbinFetch(`${JBIN_BASE}/b/${id}/latest`,{headers:{"X-Master-Key":JBIN_KEY}});
  if(!r||!r.ok)return {ok:false};
  try{const d=await r.json();return {ok:true,record:d.record};}catch(e){return {ok:false};}
}
// returns true on a confirmed write, false otherwise
async function jbinSet(k,val){
  const id=getBinId(k);
  // JSONBin rejects an empty bin ("Bin cannot be blank", HTTP 400), so an empty library/adventure
  // list can't be PUT. Treat "empty" as "delete the bin": loadAll reads a missing bin (noBin) as
  // empty and keeps the local mirror, and the next non-empty save recreates the bin via POST.
  if(isBlankVal(val)){
    if(!id)return true; // nothing stored yet — already in sync
    const r=await jbinFetch(`${JBIN_BASE}/b/${id}`,{method:"DELETE",headers:{"X-Master-Key":JBIN_KEY}});
    if(r&&(r.ok||r.status===404)){localStorage.removeItem("mf_bin:"+k);return true;}
    return false;
  }
  if(id){
    const r=await jbinFetch(`${JBIN_BASE}/b/${id}`,{method:"PUT",headers:JBIN_HEADERS,body:JSON.stringify(val)});
    return !!(r&&r.ok);
  }
  const r=await jbinFetch(`${JBIN_BASE}/b`,{method:"POST",headers:{...JBIN_HEADERS,"X-Bin-Name":k},body:JSON.stringify(val)});
  if(r&&r.ok){try{const d=await r.json();setBinId(k,d.metadata.id);return true;}catch(e){return false;}}
  return false;
}
function isBlankVal(val){return val==null||(Array.isArray(val)?val.length===0:(typeof val==="object"&&Object.keys(val).length===0));}

async function loadAll(){
  // 1. instant hydrate from the local mirror so the UI is never empty while the cloud loads
  const cl=cacheGet("library:monsters"),ca=cacheGet("library:adventures");
  if(cl)state.lib=cl.map(normalizeMonster);
  if(ca)state.adv=ca.map(normalizeAdv);
  // 2. reconcile with the cloud
  const a=await jbinGet("library:monsters"),b=await jbinGet("library:adventures");
  if(a.ok&&b.ok){
    cloudReady=true;
    if(isDirty()){
      // we have unsynced local edits — push them up rather than letting the cloud overwrite them
      const ok1=await jbinSet("library:monsters",state.lib),ok2=await jbinSet("library:adventures",state.adv);
      if(ok1&&ok2)setDirty(false);
    } else {
      // cloud is authoritative; only adopt it when a bin actually exists (else keep cache)
      if(!a.noBin){state.lib=(a.record||[]).map(normalizeMonster);cacheSet("library:monsters",state.lib);}
      if(!b.noBin){state.adv=(b.record||[]).map(normalizeAdv);cacheSet("library:adventures",state.adv);}
    }
  } else {
    // cloud unreachable: keep the local mirror and pause nothing — _flush still caches every edit
    cloudReady=false;
    showBanner("Cloud unreachable — working from your local copy. Edits are saved on this device and will sync when the cloud is back.",hideBanner);
  }
}
// debounced writes: edits fire on every keystroke; coalesce them so we don't hit the rate limit
let _saveTimer=null,_pend={lib:false,adv:false};
function saveLib(){_pend.lib=true;_schedule();}
function saveAdv(){_pend.adv=true;_schedule();}
function _schedule(){clearTimeout(_saveTimer);_saveTimer=setTimeout(_flush,800);}
async function _flush(){
  // local mirror first — this write cannot fail to a network, so work is never lost
  cacheSet("library:monsters",state.lib);
  cacheSet("library:adventures",state.adv);
  let okAll=true;
  if(_pend.lib){_pend.lib=false;if(!await jbinSet("library:monsters",state.lib))okAll=false;}
  if(_pend.adv){_pend.adv=false;if(!await jbinSet("library:adventures",state.adv))okAll=false;}
  if(okAll){setDirty(false);_cloudWarned=false;hideBanner();}
  else{setDirty(true);if(!_cloudWarned){_cloudWarned=true;showBanner("Cloud save failed — your work is saved on this device and will retry. Export JSON for an extra backup.",hideBanner);}}
}
let _cloudWarned=false; // show the cloud-failure banner once, not on every debounced save
if(typeof document!=="undefined")document.addEventListener("visibilitychange",()=>{if(document.hidden)_flush();});

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const clone=o=>JSON.parse(JSON.stringify(o));
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("show"),1900);}
function showBanner(t,withCancel){const b=$("#banner");b.innerHTML=esc(t)+(withCancel?'<button id="bannerCancel">Cancel</button>':"");b.classList.add("show");if(withCancel)$("#bannerCancel").onclick=withCancel;}
function hideBanner(){$("#banner").classList.remove("show");}
function xpOf(m){return (m.xpOver!==""&&m.xpOver!=null)?Number(m.xpOver):(CR_XP[m.cr]??0);}

function blankMonster(){return{id:uid(),chassis:false,name:"",shortName:{word:"creature",proper:false,plural:false},size:"Medium",type:"",subtype:"",align:"",
  ac:null,acnote:"",hp:null,hpf:"",spd:{walk:30,climb:0,fly:0,swim:0,burrow:0,hover:false},init:"",initProf:"none",
  str:10,dex:10,con:10,int:10,wis:10,cha:10,saves:[],skills:[],dmg:{},dmgnote:"",cimm:"",gear:"",
  senses:{darkvision:0,blindsight:0,tremorsense:0,truesight:0,blindBeyond:false,other:""},lang:"Common",
  cr:"1",xpOver:"",traits:[],actions:[],bonus:[],reactions:[],sort:{},
  legend:{on:false,intro:"",items:[]},villain:{on:false,intro:"",items:[]},lair:{on:false,intro:"",items:[]},regional:{on:false,text:""},
  status:"Draft",tags:[],archived:false,
  _auto:{ac:true,hp:true}};}
function parseSpeed(str){const s={walk:0,climb:0,fly:0,swim:0,burrow:0,hover:/hover/i.test(str||"")};
  const w=String(str||"").match(/^\s*(\d+)\s*ft/i);if(w)s.walk=+w[1];
  ["climb","fly","swim","burrow"].forEach(k=>{const m=new RegExp(k+"\\s*(\\d+)","i").exec(str||"");if(m)s[k]=+m[1];});
  return s;}
function parseSenses(str){const s={darkvision:0,blindsight:0,tremorsense:0,truesight:0,blindBeyond:/blind beyond/i.test(str||""),other:""};
  ["darkvision","blindsight","tremorsense","truesight"].forEach(k=>{const m=new RegExp(k+"\\s*(\\d+)","i").exec(str||"");if(m)s[k]=+m[1];});
  return s;}
function migrateDefenses(m){
  const dmg={};let note=[];
  const apply=(str,st)=>{if(!str)return;String(str).split(",").forEach(tok=>{tok=tok.trim();const hit=DMG_TYPES.find(d=>d.toLowerCase()===tok.toLowerCase());if(hit)dmg[hit]=st;else if(tok)note.push(tok+" ("+({res:"Resistance",imm:"Immunity",vuln:"Vulnerability"}[st])+")");});};
  apply(m.res,"res");apply(m.dimm,"imm");apply(m.vuln,"vuln");
  m.dmg=dmg;m.dmgnote=(m.dmgnote?m.dmgnote+"; ":"")+note.join("; ");
  delete m.res;delete m.dimm;delete m.vuln;
}
function normalizeMonster(m){
  if(!m.spd){m.spd=parseSpeed(m.speed);delete m.speed;}
  if(typeof m.senses==="string"||m.senses==null)m.senses=parseSenses(m.senses);
  if(!m.shortName)m.shortName={word:"creature",proper:false,plural:false};
  if(!m.initProf)m.initProf="none";
  if(m.res!==undefined||m.dimm!==undefined||m.vuln!==undefined){if(!m.dmg)m.dmg={};migrateDefenses(m);}
  if(!m.dmg)m.dmg={};
  if(m.dmgnote===undefined)m.dmgnote="";
  m.legend=m.legend||{on:false,intro:"",items:[]};m.legend.intro=m.legend.intro||"";
  m.villain=m.villain||{on:false,intro:"",items:[]};m.villain.intro=m.villain.intro||"";
  m.lair=m.lair||{on:false,intro:"",items:[]};m.lair.intro=m.lair.intro||"";
  if(!m.regional)m.regional={on:!!(m.lair&&m.lair.regional),text:(m.lair&&m.lair.regional)||""};
  if(m.lair&&m.lair.regional!==undefined)delete m.lair.regional;
  ["traits","actions","bonus","reactions"].forEach(k=>{m[k]=(m[k]||[]).map(e=>e.mode?e:Object.assign({mode:e.trigger!==undefined?"react":"text"},e));});
  m.legend.items=(m.legend.items||[]).map(e=>e.mode?e:T(e.name,e.text));
  m.lair.items=(m.lair.items||[]).map(e=>e.mode?e:T(e.name,e.text));
  m.villain.items=(m.villain.items||[]).map(e=>Object.assign({mode:"villain",round:e.round||1},e));
  m._auto=m._auto||{ac:false,hp:false};
  m.sort=m.sort||{};
  // Bestiary organisation (Batch 13): workflow status, free-text tag, archive flag
  if(!STATUSES.includes(m.status))m.status="Draft";
  if(typeof m.tag==="string"){m.tags=m.tag?[m.tag]:[];delete m.tag;} // migrate single tag → tags[]
  if(!Array.isArray(m.tags))m.tags=[];
  m.archived=!!m.archived;
  return m;
}
function normalizeAdv(a){
  a.archived=!!a.archived;a.notes=a.notes||"";a.levels=a.levels||[];
  a.encounters=(a.encounters||[]).map(e=>{
    e.archived=!!e.archived;e.notes=e.notes||"";e.partyOverride=e.partyOverride||null;
    e.combatants=(e.combatants||[]).map(c=>{
      if(!c.type)return{type:"monster",id:uid(),monsterId:c.monsterId,nickname:"",count:c.count||1,faction:c.faction||"Enemy"};
      c.id=c.id||uid();return c;
    });
    return e;
  });
  return a;
}

function fillSelect(id,arr,fmt){$(id).innerHTML=arr.map(v=>`<option value="${v}">${fmt?fmt(v):v}</option>`).join("");}
function buildAbilityGrid(){$("#abilGrid").innerHTML=ABILS.map(a=>`<div class="cell"><div class="ab">${a.toUpperCase()}</div><input type="number" id="ab_${a}"><div class="mod" id="mod_${a}">+0</div><button type="button" class="svtog" id="sv_${a}" aria-pressed="false">Save <b id="svv_${a}">+0</b></button></div>`).join("");}
// Damage modifiers — same shape as the Skills section: one row per type = name select +
// 3-state toggle (Resist/Immune/Vulnerable) + remove. "All Physical" expands to B/P/S.
const DMG3=[["res","Resist"],["imm","Immune"],["vuln","Vulnerable"]];
const DMG_SELECT=["All Physical",...DMG_TYPES];
const PHYS=["Bludgeoning","Piercing","Slashing"];
function renderDmg(){const box=$("#dmgRows");if(!box)return;
  const entries=Object.entries(M.dmg);
  box.innerHTML=entries.length?entries.map(([type,st])=>`<div class="rowline">
    <select data-dt="${esc(type)}" class="dmgName">${DMG_SELECT.map(d=>`<option value="${d}" ${d===type?"selected":""}>${d}</option>`).join("")}</select>
    <button type="button" class="tritog dmgState" data-dt="${esc(type)}"></button>
    <button class="iconbtn" data-rmdmg="${esc(type)}">✕</button></div>`).join(""):`<div class="hint" style="margin:2px 0">No damage modifiers — add resistances, immunities, or vulnerabilities.</div>`;
  box.querySelectorAll(".dmgName").forEach(el=>el.addEventListener("change",e=>{const old=e.target.dataset.dt,val=e.target.value,st=M.dmg[old]||"res";delete M.dmg[old];if(val==="All Physical")PHYS.forEach(t=>M.dmg[t]=st);else M.dmg[val]=st;renderDmg();renderPreview();}));
  box.querySelectorAll(".dmgState").forEach(el=>{const t=el.dataset.dt;paintTri(el,M.dmg[t]||"res",DMG3);el.addEventListener("click",()=>{const nv=nextTri(M.dmg[t]||"res",DMG3);M.dmg[t]=nv;paintTri(el,nv,DMG3);renderPreview();});});
  box.querySelectorAll("[data-rmdmg]").forEach(el=>el.addEventListener("click",()=>{delete M.dmg[el.dataset.rmdmg];renderDmg();renderPreview();}));
}
$("#addDmg").addEventListener("click",()=>{const avail=DMG_TYPES.find(d=>!(d in M.dmg))||DMG_TYPES[0];M.dmg[avail]="res";renderDmg();renderPreview();});

function bindField(id,key,num){const el=$(id);if(!el)return;el.addEventListener("input",()=>{M[key]=num?(el.value===""?null:Number(el.value)):el.value;renderPreview();});}
// Condition Immunities as removable chips. m.cimm stays a comma-joined string (compatible with
// import/export and the statblock); the chip UI just splits/joins it.
function cimmList(){return (M.cimm||"").split(",").map(s=>s.trim()).filter(Boolean);}
function renderCimm(){const box=$("#cimmChips");if(!box)return;const list=cimmList();
  box.innerHTML=list.map((c,i)=>`<span class="chip${findCondition(c)?" known":""}">${esc(c)}<button class="chipx" data-rmcimm="${i}" title="Remove">×</button></span>`).join("");
  box.querySelectorAll("[data-rmcimm]").forEach(b=>b.addEventListener("click",()=>{const a=cimmList();a.splice(+b.dataset.rmcimm,1);M.cimm=a.join(", ");renderCimm();renderPreview();}));}
function bindCimm(){const ci=$("#f_cimm_input");if(!ci)return;
  const add=v=>{v=(v||"").trim();if(!v)return;const a=cimmList();if(!a.some(x=>x.toLowerCase()===v.toLowerCase()))a.push(v);M.cimm=a.join(", ");ci.value="";renderCimm();renderPreview();};
  ci.addEventListener("input",()=>{if(ci.value.includes(",")){const p=ci.value.split(",");p.slice(0,-1).forEach(add);ci.value=p[p.length-1];}});
  ci.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add(ci.value);}else if(e.key==="Backspace"&&!ci.value){const a=cimmList();if(a.length){a.pop();M.cimm=a.join(", ");renderCimm();renderPreview();}}});
  ci.addEventListener("change",()=>{if(ci.value.trim())add(ci.value);}); // datalist pick / commit on blur
  $("#f_cimm_field").addEventListener("click",e=>{if(e.target.id==="f_cimm_field")ci.focus();});}
function buildCondDatalist(){const dl=$("#condDatalist");if(!dl)return;dl.innerHTML=[...new Set(state.conditions.map(c=>c.name))].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${esc(n)}">`).join("");}
function buildSpellDatalist(){const dl=$("#spellDatalist");if(!dl)return;dl.innerHTML=[...new Set(state.spells.map(s=>s.name))].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${esc(n)}">`).join("");}
function bindStatic(){
  bindField("#f_name","name");bindField("#f_size","size");bindField("#f_type","type");bindField("#f_subtype","subtype");bindField("#f_align","align");
  bindField("#f_acnote","acnote");bindField("#f_init","init",true);
  $("#f_hpf").addEventListener("input",()=>{M.hpf=$("#f_hpf").value;
    // a valid dice formula auto-derives HP, but only when HP is empty or just the CR autofill (not a manual edit)
    if(/\d+\s*d\s*\d+/i.test(M.hpf)&&(M.hp==null||M._auto.hp)){M.hp=exprAvg(M.hpf);M._auto.hp=false;$("#f_hp").value=M.hp;$("#wb_hp").classList.remove("suggested");}
    renderPreview();});
  bindField("#f_dmgnote","dmgnote");bindField("#f_gear","gear");bindField("#f_lang","lang");
  bindCimm();
  $("#f_snword").addEventListener("input",()=>{M.shortName.word=$("#f_snword").value||"creature";renderEntries();renderPreview();});
  $("#f_snproper").addEventListener("change",()=>{M.shortName.proper=$("#f_snproper").checked;renderEntries();renderPreview();});
  const itp=$("#f_initprof");itp.addEventListener("click",()=>{const nv=nextTri(itp.dataset.state);M.initProf=nv;paintTri(itp,nv);renderPreview();});
  $("#f_cr").addEventListener("change",()=>{const p=parseCRInput($("#f_cr").value);if(p)setCR(p);else updateCRDisplay();});
  $("#f_size").addEventListener("change",updateHpDie);
  $("#f_snplural").addEventListener("change",()=>{M.shortName.plural=$("#f_snplural").checked;renderEntries();renderPreview();});
  ["darkvision","blindsight","tremorsense","truesight"].forEach(k=>$("#se_"+k).addEventListener("input",()=>{M.senses[k]=Number($("#se_"+k).value||0);renderPreview();}));
  $("#se_blindBeyond").addEventListener("change",()=>{M.senses.blindBeyond=$("#se_blindBeyond").checked;renderPreview();});
  $("#se_other").addEventListener("input",()=>{M.senses.other=$("#se_other").value;renderPreview();});
  $("#f_ac").addEventListener("input",()=>{M.ac=$("#f_ac").value===""?null:Number($("#f_ac").value);M._auto.ac=false;$("#wb_ac").classList.remove("suggested");renderPreview();});
  $("#f_hp").addEventListener("input",()=>{M.hp=$("#f_hp").value===""?null:Number($("#f_hp").value);M._auto.hp=false;$("#wb_hp").classList.remove("suggested");renderPreview();});
  ["walk","climb","fly","swim","burrow"].forEach(k=>$("#sp_"+k).addEventListener("input",()=>{M.spd[k]=Number($("#sp_"+k).value||0);renderPreview();}));
  $("#sp_hover").addEventListener("change",()=>{M.spd.hover=$("#sp_hover").checked;renderPreview();});
  ABILS.forEach(a=>{
    $("#ab_"+a).addEventListener("input",()=>{M[a]=Number($("#ab_"+a).value||10);refreshAbil();renderEntries();renderPreview();});
    $("#sv_"+a).addEventListener("click",()=>{const on=!M.saves.includes(a);M.saves=M.saves.filter(x=>x!==a);if(on)M.saves.push(a);refreshAbil();renderPreview();});
  });
  $("#f_legintro").addEventListener("input",()=>{M.legend.intro=$("#f_legintro").value;renderPreview();});
  $("#f_vilintro").addEventListener("input",()=>{M.villain.intro=$("#f_vilintro").value;renderPreview();});
  $("#f_lairintro").addEventListener("input",()=>{M.lair.intro=$("#f_lairintro").value;renderPreview();});
  $("#f_regional").addEventListener("input",()=>{M.regional.text=$("#f_regional").value;renderPreview();});
  $("#t_legend").addEventListener("change",e=>{M.legend.on=e.target.checked;if(e.target.checked&&!M.legend.intro){M.legend.intro=LEGEND_INTRO;$("#f_legintro").value=LEGEND_INTRO;}$("#legendInner").style.display=e.target.checked?"":"none";$("#fsLegend").classList.toggle("collapsed",!e.target.checked);renderPreview();});
  $("#t_villain").addEventListener("change",e=>{M.villain.on=e.target.checked;if(e.target.checked&&!M.villain.intro){M.villain.intro=VILLAIN_INTRO;$("#f_vilintro").value=VILLAIN_INTRO;}$("#villainInner").style.display=e.target.checked?"":"none";$("#fsVillain").classList.toggle("collapsed",!e.target.checked);renderPreview();});
  $("#t_lair").addEventListener("change",e=>{M.lair.on=e.target.checked;if(e.target.checked&&!M.lair.intro){M.lair.intro=LAIR_INTRO;$("#f_lairintro").value=LAIR_INTRO;}$("#lairInner").style.display=e.target.checked?"":"none";$("#fsLair").classList.toggle("collapsed",!e.target.checked);renderPreview();});
  $("#t_regional").addEventListener("change",e=>{M.regional.on=e.target.checked;$("#regionalInner").style.display=e.target.checked?"":"none";$("#fsRegional").classList.toggle("collapsed",!e.target.checked);renderPreview();});
}
// while HP is still auto (not manually set), derive it from a valid HP formula if present, else from CR
function syncAutoHP(){if(!M._auto.hp)return;const f=M.hpf||"";const badge=$("#wb_hp .badge");
  if(/\d+\s*d\s*\d+/i.test(f)){M.hp=exprAvg(f);if(badge)badge.textContent="avg";}
  else{const boh=BOH[M.cr];if(boh)M.hp=boh[1];if(badge)badge.textContent="≈CR";}
  $("#f_hp").value=M.hp??"";}
function applyCRAuto(){const boh=BOH[M.cr];if(!boh)return;
  if(M._auto.ac){M.ac=boh[0];$("#f_ac").value=boh[0];$("#wb_ac").classList.add("suggested");}
  if(M._auto.hp){$("#wb_hp").classList.add("suggested");syncAutoHP();}}
function updateHpDie(){const el=$("#f_hpf");if(!el)return;const sz=$("#f_size");const size=(sz&&sz.value)||M.size;el.placeholder="4"+(SIZE_DIE[size]||"d8")+" + 8";}
function updateCRDisplay(){const el=$("#f_cr");if(el)el.value=M.cr;}
function parseCRInput(v){v=String(v).trim().replace(/^cr\s*/i,"");if(CR_LIST.includes(v))return v;
  const frac={"0.125":"1/8",".125":"1/8","0.25":"1/4",".25":"1/4","0.5":"1/2",".5":"1/2","⅛":"1/8","¼":"1/4","½":"1/2"};if(frac[v])return frac[v];
  const n=Number(v);if(!isNaN(n)&&v!==""){if(n>0&&n<.1875)return "1/8";if(n<.375)return "1/4";if(n<.75)return "1/2";const i=String(Math.round(n));if(CR_LIST.includes(i))return i;}
  return null;}
// tri-state proficiency toggle, shared by Initiative and each Skill row
const PROF3=[["none","No prof."],["prof","Proficient"],["exp","Expertise"]];
function paintTri(el,val,states){states=states||PROF3;const s=states.find(x=>x[0]===val)||states[0];el.dataset.state=s[0];el.textContent=s[1];el.classList.toggle("on",s[0]!=="none");el.classList.toggle("exp",s[0]==="exp");}
function nextTri(val,states){states=states||PROF3;const i=states.findIndex(x=>x[0]===val);return states[(i+1)%states.length][0];}
function setCR(cr){M.cr=cr;updateCRDisplay();applyCRAuto();refreshAbil();renderEntries();renderPreview();}
function buildCRStepper(){const w=$("#wb_cr");if(!w||w.querySelector(".stepbtns"))return;
  const b=document.createElement("span");b.className="stepbtns";
  b.innerHTML='<button type="button" data-d="1">▲</button><button type="button" data-d="-1">▼</button>';
  w.appendChild(b);
  b.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    const i=CR_LIST.indexOf(M.cr),ni=clamp(i+(+btn.dataset.d),0,CR_LIST.length-1);
    if(ni!==i)setCR(CR_LIST[ni]);}));}
function refreshAbil(){const pb=pbForCR(M.cr);ABILS.forEach(a=>{const m=mod(M[a]);$("#mod_"+a).textContent=sgn(m);const p=M.saves.includes(a);$("#svv_"+a).textContent=sgn(m+(p?pb:0));const b=$("#sv_"+a);b.classList.toggle("active",p);b.setAttribute("aria-pressed",p?"true":"false");});}

function renderSkills(){const box=$("#skillRows");
  box.innerHTML=M.skills.map((s,i)=>`<div class="rowline">
    <select data-si="${i}" class="skName">${Object.keys(SKILLS).map(k=>`<option value="${k}" ${k===s[0]?"selected":""}>${k.replace(/_/g," ")}</option>`).join("")}</select>
    <button type="button" class="tritog skProf" data-si="${i}"></button>
    <button class="iconbtn" data-rmskill="${i}">✕</button></div>`).join("");
  box.querySelectorAll(".skName").forEach(el=>el.addEventListener("change",e=>{M.skills[+e.target.dataset.si][0]=e.target.value;renderPreview();}));
  box.querySelectorAll(".skProf").forEach(el=>{paintTri(el,M.skills[+el.dataset.si][1]||"prof");el.addEventListener("click",()=>{const i=+el.dataset.si;const nv=nextTri(M.skills[i][1]||"prof");M.skills[i][1]=nv;paintTri(el,nv);renderPreview();});});
  box.querySelectorAll("[data-rmskill]").forEach(el=>el.addEventListener("click",e=>{M.skills.splice(+e.target.dataset.rmskill,1);renderSkills();renderPreview();}));
}
$("#addSkill").addEventListener("click",()=>{M.skills.push(["Perception","prof"]);renderSkills();renderPreview();});

function arrFor(k){return k==="traits"?M.traits:k==="actions"?M.actions:k==="bonus"?M.bonus:k==="reactions"?M.reactions:k==="villain"?M.villain.items:k==="legend"?M.legend.items:k==="lair"?M.lair.items:[];}
function attackText(e){
  const pb=pbForCR(M.cr);const ab=mod(M[e.ability]);
  const atk=e.atk!==""&&e.atk!=null?Number(e.atk):ab+pb;
  const kind=e.kind==="Ranged"?"Ranged Attack Roll:":e.kind==="Melee or Ranged"?"Melee or Ranged Attack Roll:":"Melee Attack Roll:";
  let rr=e.kind==="Ranged"?`range ${e.range||"30/120"} ft.`:e.kind==="Melee or Ranged"?`reach ${e.reach||5} ft. or range ${e.range||"20/60"} ft.`:`reach ${e.reach||5} ft.`;
  const avg=Math.max(1,Math.floor(diceAvg(e.dice)+(e.addMod?ab:0)));
  const dtxt=e.dice+(e.addMod&&ab!==0?` ${sgn(ab)}`:"");
  return `*${kind}* ${sgn(atk)}, ${rr}${e.targets?` ${e.targets}.`:""} *Hit:* ${avg} (${dtxt}) ${e.dtype} damage.${e.extra?` ${e.extra}`:""}`;
}
const SNIPS=[["Save block","*Constitution Saving Throw:* DC {DC}, each creature in a 15-foot Cone. *Failure:* 0 (2d6) damage. *Success:* Half damage."],["Recharge","(Recharge 5–6) "],["1/Day","(1/Day) "],["Multiattack","[C] make[s] two attacks."]];
// Traits/actions/bonus/reactions are always alpha-sorted; legend/villain/lair keep manual order.
const ALWAYS_SORTED=new Set(["traits","actions","bonus","reactions"]);
function rowCtrls(kind,i){const arrows=ALWAYS_SORTED.has(kind)?"":`<button class="iconbtn up" data-mv="${kind}:${i}:-1" title="Move up">▲</button><button class="iconbtn down" data-mv="${kind}:${i}:1" title="Move down">▼</button>`;
  return arrows+`<button class="iconbtn" data-rm="${kind}:${i}">✕</button>`;}
function dlFor(kind){return kind==="traits"?"dl-traits":kind==="bonus"?"dl-bonus":kind==="actions"?"dl-textact":"";}
function entryHTML(arr,kind){return arr.map((e,i)=>{
  if(kind==="reactions"){return `<div class="entry"><div class="ehead"><input type="text" placeholder="Name" list="dl-react" data-k="${kind}" data-i="${i}" data-f="name" value="${esc(e.name)}">${rowCtrls(kind,i)}</div>
    <input type="text" placeholder="Trigger" data-k="${kind}" data-i="${i}" data-f="trigger" value="${esc(e.trigger||"")}" style="margin-bottom:6px">
    <textarea placeholder="Response" data-k="${kind}" data-i="${i}" data-f="response">${esc(e.response||"")}</textarea></div>`;}
  if(kind==="villain"){return `<div class="entry"><div class="ehead"><select data-k="villain" data-i="${i}" data-f="round" style="width:104px;flex:none">${[1,2,3].map(r=>`<option value="${r}" ${(+e.round||1)===r?"selected":""}>Round ${r}</option>`).join("")}</select><input type="text" placeholder="Name" data-k="villain" data-i="${i}" data-f="name" value="${esc(e.name)}"><button class="iconbtn" data-rm="villain:${i}">✕</button></div>
    <textarea placeholder="Effect" data-k="villain" data-i="${i}" data-f="text">${esc(e.text||"")}</textarea></div>`;}
  if(e.mode==="spell"){const pb=pbForCR(M.cr),ab=mod(M[e.ability]||0),dc=e.dc||(8+pb+ab);return `<div class="entry" data-entry-kind="${kind}" data-entry-i="${i}" data-entry-abil="${e.ability}"><div class="ehead"><span class="kind">Spellcasting</span><span class="entry-dc">DC ${dc}</span><input type="text" placeholder="Spellcasting" data-k="${kind}" data-i="${i}" data-f="name" value="${esc(e.name)}">${rowCtrls(kind,i)}</div>
    <div class="atk-fields" style="grid-template-columns:repeat(3,1fr)">
      <label class="f">Ability<select data-k="${kind}" data-i="${i}" data-f="ability">${ABILS.map(a=>`<option value="${a}" ${a===e.ability?"selected":""}>${a.toUpperCase()}</option>`).join("")}</select></label>
      <label class="f">Save DC (auto)<input type="number" placeholder="${8+pb+ab}" data-k="${kind}" data-i="${i}" data-f="dc" value="${e.dc}"></label>
      <label class="f">Spell atk (auto)<input type="number" placeholder="${sgn(pb+ab)}" data-k="${kind}" data-i="${i}" data-f="atk" value="${e.atk}"></label>
    </div>
    <div class="fs-sub" style="margin:4px 0 6px">Spell groups <span style="color:var(--faint);text-transform:none;letter-spacing:0">— each renders on its own line</span></div>
    ${(e.groups||[]).map((g,gi)=>`<div class="rowline">
      <select data-sg="${i}:${gi}:freq" style="flex:none;width:120px">${["At Will","1/Day Each","2/Day Each","3/Day Each","1/Day","2/Day","3/Day"].map(f=>`<option ${f===g.freq?"selected":""}>${f}</option>`).join("")}</select>
      <div class="chipfield sgfield" id="sgfield-${i}-${gi}"><span class="chips" id="sgchips-${i}-${gi}"></span><input type="text" class="chipinput sgci" id="sgci-${i}-${gi}" placeholder="add spell…" list="spellDatalist" autocomplete="off"></div>
      <button class="iconbtn" data-sgrm="${i}:${gi}">✕</button></div>`).join("")}
    <button class="addbtn" data-sgadd="${i}" style="width:100%;margin-top:4px">＋ Add spell group</button>
    <div class="hint" style="margin-top:6px">→ ${esc(applyRefs(spellLines(e).main))}</div></div>`;}
  if(e.mode==="attack"){return `<div class="entry" data-entry-kind="${kind}" data-entry-i="${i}" data-entry-abil="${e.ability}"><div class="ehead"><span class="kind">Attack</span><input type="text" placeholder="Attack name" list="dl-atk" data-k="${kind}" data-i="${i}" data-f="name" value="${esc(e.name)}">${rowCtrls(kind,i)}</div>
    <div class="atk-fields">
      <label class="f">Kind<select data-k="${kind}" data-i="${i}" data-f="kind">${["Melee","Ranged","Melee or Ranged"].map(k=>`<option ${k===e.kind?"selected":""}>${k}</option>`).join("")}</select></label>
      <label class="f">Ability<select data-k="${kind}" data-i="${i}" data-f="ability">${ABILS.map(a=>`<option value="${a}" ${a===e.ability?"selected":""}>${a.toUpperCase()}</option>`).join("")}</select></label>
      <label class="f">Atk (auto)<input type="number" placeholder="${sgn(mod(M[e.ability])+pbForCR(M.cr))}" data-k="${kind}" data-i="${i}" data-f="atk" value="${e.atk}"></label>
      <label class="f">Reach<input type="number" data-k="${kind}" data-i="${i}" data-f="reach" value="${e.reach}"></label>
      <label class="f">Range<input type="text" placeholder="20/60" data-k="${kind}" data-i="${i}" data-f="range" value="${esc(e.range)}"></label>
      <label class="f">Dice<input type="text" data-k="${kind}" data-i="${i}" data-f="dice" value="${esc(e.dice)}"></label>
      <label class="f">Dmg type<select data-k="${kind}" data-i="${i}" data-f="dtype">${DMG_TYPES.map(d=>`<option ${d===e.dtype?"selected":""}>${d}</option>`).join("")}</select></label>
      <label class="f">Targets<input type="text" placeholder="one target" data-k="${kind}" data-i="${i}" data-f="targets" value="${esc(e.targets)}"></label>
      <label class="f" style="grid-column:span 2;flex-direction:row;align-items:center;gap:6px;margin-top:18px"><input type="checkbox" data-k="${kind}" data-i="${i}" data-f="addMod" ${e.addMod?"checked":""}> add ability to damage</label>
    </div>
    <input type="text" class="atk-extra" placeholder="Rider, e.g. plus 7 (2d6) Poison damage." data-k="${kind}" data-i="${i}" data-f="extra" value="${esc(e.extra)}">
    <div class="hint" style="margin-top:6px">→ ${esc(attackText(e))}</div></div>`;}
  return `<div class="entry"><div class="ehead"><input type="text" placeholder="Name"${dlFor(kind)?` list="${dlFor(kind)}"`:""} data-k="${kind}" data-i="${i}" data-f="name" value="${esc(e.name)}">${rowCtrls(kind,i)}</div>
    <textarea placeholder="Description" data-k="${kind}" data-i="${i}" data-f="text">${esc(e.text||"")}</textarea>
    ${kind==="actions"?`<div class="snips">${SNIPS.map((s,si)=>`<button class="snip" data-snip="${si}" data-target="${kind}:${i}">${s[0]}</button>`).join("")}</div>`:""}</div>`;
}).join("");}
function sortEntries(kind){arrFor(kind).sort((a,b)=>(a.name||"").toLowerCase().localeCompare((b.name||"").toLowerCase()));}
function renderSgChips(ai,gi){
  const g=M.actions[ai]&&M.actions[ai].groups&&M.actions[ai].groups[gi];
  const box=$("#sgchips-"+ai+"-"+gi);if(!g||!box)return;
  const spells=g.spells?g.spells.split(",").map(s=>s.trim()).filter(Boolean):[];
  const known=n=>state.spells.some(s=>s.name.toLowerCase()===n.toLowerCase());
  box.innerHTML=spells.map((sp,si)=>`<span class="chip${known(sp)?" known":""}">${esc(sp)}<button class="chipx" data-sgrmsp="${ai}:${gi}:${si}" title="Remove">×</button></span>`).join("");
  box.querySelectorAll("[data-sgrmsp]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();
    const[a,g2,s]=b.dataset.sgrmsp.split(":").map(Number);const arr=M.actions[a].groups[g2].spells.split(",").map(x=>x.trim()).filter(Boolean);
    arr.splice(s,1);M.actions[a].groups[g2].spells=arr.join(", ");renderSgChips(a,g2);renderPreview();}));
}
function renderEntries(){
  ALWAYS_SORTED.forEach(k=>sortEntries(k));
  $("#traitList").innerHTML=entryHTML(M.traits,"traits");
  $("#actionList").innerHTML=entryHTML(M.actions,"actions");
  $("#bonusList").innerHTML=entryHTML(M.bonus,"bonus");
  $("#reactList").innerHTML=entryHTML(M.reactions,"reactions");
  $("#legendList").innerHTML=entryHTML(M.legend.items,"legend");
  $("#villainList").innerHTML=entryHTML(M.villain.items,"villain");
  $("#lairList").innerHTML=entryHTML(M.lair.items,"lair");
  bindEntries();
  // populate spell group chip fields after DOM is ready
  M.actions.forEach((e,i)=>{if(e.mode==="spell")(e.groups||[]).forEach((_,gi)=>renderSgChips(i,gi));});
  $("#cntTraits").textContent=M.traits.length||"";$("#cntActions").textContent=M.actions.length||"";
  $("#cntBonus").textContent=M.bonus.length||"";$("#cntReact").textContent=M.reactions.length||"";
}
function bindEntries(){
  $$("#formCol [data-k]").forEach(el=>{
    const ev=el.type==="checkbox"||el.tagName==="SELECT"?"change":"input";
    el.addEventListener(ev,()=>{const k=el.dataset.k,i=+el.dataset.i,f=el.dataset.f;
      let v=el.type==="checkbox"?el.checked:el.value;if(f==="round")v=+v;arrFor(k)[i][f]=v;
      if(["kind","ability","atk","reach","range","dice","dtype","targets","addMod","extra"].includes(f))renderEntries();
      renderPreview();});
  });
  $$("#formCol [data-rm]").forEach(el=>el.addEventListener("click",()=>{const[k,i]=el.dataset.rm.split(":");arrFor(k).splice(+i,1);renderEntries();renderPreview();}));
  $$("#formCol [data-mv]").forEach(el=>el.addEventListener("click",()=>{const[k,i,d]=el.dataset.mv.split(":");moveEntry(k,+i,+d);}));
  $$('#formCol [data-f="name"]').forEach(el=>el.addEventListener("change",()=>autofillEntry(el.dataset.k,+el.dataset.i)));
  $$("#formCol [data-snip]").forEach(el=>el.addEventListener("click",()=>{const si=+el.dataset.snip,s=SNIPS[si][1];const[k,i]=el.dataset.target.split(":");const o=arrFor(k)[+i];o.text=(o.text?o.text+" ":"")+expandSnip(s);if(SNIPS[si][0]==="Multiattack"&&!o.name)o.name="Multiattack";renderEntries();renderPreview();}));
  // freq select for spell groups (text input for spells replaced by chip field bound separately)
  $$("#formCol [data-sg]").forEach(el=>{if(el.tagName!=="SELECT")return;el.addEventListener("change",()=>{const[i,gi,f]=el.dataset.sg.split(":");M.actions[+i].groups[+gi][f]=el.value;renderEntries();renderPreview();});});
  $$("#formCol [data-sgadd]").forEach(el=>el.addEventListener("click",()=>{M.actions[+el.dataset.sgadd].groups.push({freq:"1/Day Each",spells:""});renderEntries();renderPreview();}));
  $$("#formCol [data-sgrm]").forEach(el=>el.addEventListener("click",()=>{const[i,gi]=el.dataset.sgrm.split(":");M.actions[+i].groups.splice(+gi,1);renderEntries();renderPreview();}));
  // spell group chip inputs
  $$("#formCol .sgci").forEach(inp=>{
    const parts=inp.id.replace("sgci-","").split("-");const ai=+parts[0],gi=+parts[1];
    const add=v=>{v=(v||"").replace(/,$/,"").trim();if(!v)return;const g=M.actions[ai].groups[gi];const cur=g.spells?g.spells.split(",").map(s=>s.trim()).filter(Boolean):[];
      if(!cur.some(x=>x.toLowerCase()===v.toLowerCase()))cur.push(v);g.spells=cur.join(", ");inp.value="";renderSgChips(ai,gi);renderPreview();};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();add(inp.value.replace(/,/g,""));}
      else if(e.key==="Backspace"&&!inp.value){const g=M.actions[ai].groups[gi];const cur=g.spells?g.spells.split(",").map(s=>s.trim()).filter(Boolean):[];if(cur.length){cur.pop();g.spells=cur.join(", ");renderSgChips(ai,gi);renderPreview();}}});
    inp.addEventListener("change",()=>{if(inp.value)add(inp.value);});});
}
function expandSnip(s){const pb=pbForCR(M.cr);const best=Math.max(...ABILS.map(a=>mod(M[a])));return s.replace("{DC}",8+pb+best);}
function moveEntry(kind,i,dir){const arr=arrFor(kind),j=i+dir;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];renderEntries();renderPreview();}
function findCI(map,key){return Object.keys(map).find(k=>k.toLowerCase()===key);}
// plain-text rendering for an action snippet (text action, or an attack preset as prose)
function actionTextFor(name){if(TEXT_ACTIONS[name])return expandSnip(TEXT_ACTIONS[name]);if(ATK_PRESETS[name])return attackText(ATK(Object.assign({name},ATK_PRESETS[name])));return null;}
// type-to-autofill: typing a known snippet name into an entry's Name field fills it in
function autofillEntry(kind,i){const e=arrFor(kind)[i];if(!e||!e.name)return;const key=e.name.trim().toLowerCase();
  if(e.mode==="attack"){const p=findCI(ATK_PRESETS,key);if(p)Object.assign(e,clone(ATK_PRESETS[p]),{mode:"attack",name:p});else return;}
  else if(e.mode==="react"){const p=findCI(REACT_SNIPS,key);if(!p)return;e.name=p;e.trigger=expandSnip(REACT_SNIPS[p].trigger);e.response=expandSnip(REACT_SNIPS[p].response);}
  else{const map=kind==="traits"?TRAIT_SNIPS:kind==="bonus"?BONUS_SNIPS:null;
    if(kind==="actions"){const keys=[...Object.keys(TEXT_ACTIONS),...Object.keys(ATK_PRESETS)];const p=keys.find(k=>k.toLowerCase()===key);if(!p)return;e.name=p;e.text=actionTextFor(p);}
    else{if(!map)return;const p=findCI(map,key);if(!p)return;e.name=p;e.text=expandSnip(map[p]);}}
  if(ALWAYS_SORTED.has(kind))sortEntries(kind);renderEntries();renderPreview();}
// insert a fresh entry chosen from a section's "From library" dropdown
function insertLib(kind,val){if(!val)return;const ci=val.indexOf(":"),pre=ci>=0?val.slice(0,ci):"",name=ci>=0?val.slice(ci+1):val;
  if(kind==="traits")M.traits.push(T(name,expandSnip(TRAIT_SNIPS[name])));
  else if(kind==="actions"){if(pre==="atk")M.actions.push(ATK(Object.assign({name},clone(ATK_PRESETS[name]))));else M.actions.push(T(name,expandSnip(TEXT_ACTIONS[name])));}
  else if(kind==="bonus")M.bonus.push(T(name,expandSnip(BONUS_SNIPS[name])));
  else if(kind==="reactions"){const s=REACT_SNIPS[name];M.reactions.push({mode:"react",name,trigger:expandSnip(s.trigger),response:expandSnip(s.response)});}
  else if(kind==="legend")M.legend.items.push(T(name,expandSnip(LEGEND_SNIPS[name])));
  else if(kind==="lair")M.lair.items.push(T(name,expandSnip(LAIR_SNIPS[name])));
  else if(kind==="villain")M.villain.items.push({mode:"villain",round:Math.min(3,M.villain.items.length+1),name,text:expandSnip(VILLAIN_SNIPS[name])});
  if(ALWAYS_SORTED.has(kind))sortEntries(kind);renderEntries();renderPreview();}
function buildDatalist(id,names){let dl=document.getElementById(id);if(!dl){dl=document.createElement("datalist");dl.id=id;document.body.appendChild(dl);}dl.innerHTML=names.map(n=>`<option value="${esc(n)}"></option>`).join("");}
function buildLibSelects(){
  const opt=(v,t)=>`<option value="${esc(v)}">${esc(t)}</option>`;
  const list=names=>names.map(n=>opt(n,n)).join("");
  const pre=(p,names)=>names.map(n=>opt(p+":"+n,n)).join("");
  $('[data-lib="traits"]').innerHTML=LIB_PROMPT+list(Object.keys(TRAIT_SNIPS));
  $('[data-lib="actions"]').innerHTML=LIB_PROMPT+`<optgroup label="Attacks — guided">${pre("atk",Object.keys(ATK_PRESETS))}</optgroup><optgroup label="Text actions">${pre("txt",Object.keys(TEXT_ACTIONS))}</optgroup>`;
  $('[data-lib="bonus"]').innerHTML=LIB_PROMPT+pre("txt",Object.keys(BONUS_SNIPS));
  $('[data-lib="reactions"]').innerHTML=LIB_PROMPT+pre("react",Object.keys(REACT_SNIPS));
  $('[data-lib="legend"]').innerHTML=LIB_PROMPT+list(Object.keys(LEGEND_SNIPS));
  $('[data-lib="villain"]').innerHTML=LIB_PROMPT+list(Object.keys(VILLAIN_SNIPS));
  $('[data-lib="lair"]').innerHTML=LIB_PROMPT+list(Object.keys(LAIR_SNIPS));
  $$("[data-lib]").forEach(sel=>sel.addEventListener("change",()=>{insertLib(sel.dataset.lib,sel.value);sel.value="";}));
  buildDatalist("dl-traits",Object.keys(TRAIT_SNIPS));
  buildDatalist("dl-atk",Object.keys(ATK_PRESETS));
  buildDatalist("dl-textact",[...Object.keys(TEXT_ACTIONS),...Object.keys(ATK_PRESETS)]);
  buildDatalist("dl-bonus",Object.keys(BONUS_SNIPS));
  buildDatalist("dl-react",Object.keys(REACT_SNIPS));
}
// Stat focus: highlight the ability cell used by the focused attack/spell entry.
let _statFocusCell=null;
function setStatFocus(abil){const inp=$("#ab_"+abil);const cell=inp&&inp.closest(".cell");if(cell===_statFocusCell)return;if(_statFocusCell)_statFocusCell.classList.remove("stat-focus");_statFocusCell=cell;if(cell)cell.classList.add("stat-focus");}
function clearStatFocus(){if(_statFocusCell)_statFocusCell.classList.remove("stat-focus");_statFocusCell=null;}
(function bindStatFocus(){const fc=document.getElementById("formCol");if(!fc)return;
  fc.addEventListener("focusin",e=>{const entry=e.target.closest&&e.target.closest(".entry[data-entry-abil]");if(!entry){clearStatFocus();return;}setStatFocus(entry.dataset.entryAbil);});
  fc.addEventListener("focusout",e=>{const entry=e.target.closest&&e.target.closest(".entry[data-entry-abil]");if(entry&&entry.contains(e.relatedTarget))return;clearStatFocus();});
})();
$$("[data-add]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.add;
  if(k==="reactions")M.reactions.push({mode:"react",name:"",trigger:"",response:""});
  else if(k==="villain")M.villain.items.push({mode:"villain",round:Math.min(3,M.villain.items.length+1),name:"",text:""});
  else arrFor(k).push(T("",""));renderEntries();renderPreview();}));
$$("[data-addatk]").forEach(b=>b.addEventListener("click",()=>{const best=mod(M.str)>=mod(M.dex)?"str":"dex";M.actions.push(ATK({ability:best}));renderEntries();renderPreview();}));
$$("[data-addspell]").forEach(b=>b.addEventListener("click",()=>{const best=["int","wis","cha"].reduce((p,a)=>mod(M[a])>mod(M[p])?a:p,"cha");M.actions.push(SPELL({ability:best}));renderEntries();renderPreview();}));
$$("[data-addmulti]").forEach(b=>b.addEventListener("click",()=>{M.actions.unshift(T("Multiattack","[C] make[s] two attacks."));renderEntries();renderPreview();}));

function loadMonster(m){
  M=normalizeMonster(clone(m));M.id=m.id;M.chassis=false;
  $("#f_name").value=M.name;$("#f_type").value=M.type;$("#f_subtype").value=M.subtype||"";$("#f_align").value=M.align||"";
  $("#f_size").value=M.size;updateCRDisplay();
  $("#f_ac").value=M.ac??"";$("#f_acnote").value=M.acnote||"";$("#f_hp").value=M.hp??"";$("#f_hpf").value=M.hpf||"";$("#f_init").value=M.init??"";
  paintTri($("#f_initprof"),M.initProf||"none");updateHpDie();
  $("#wb_ac").classList.toggle("suggested",!!M._auto.ac);$("#wb_hp").classList.toggle("suggested",!!M._auto.hp);
  ["walk","climb","fly","swim","burrow"].forEach(k=>$("#sp_"+k).value=M.spd[k]||"");$("#sp_hover").checked=!!M.spd.hover;
  $("#f_snword").value=(M.shortName.word==="creature"?"":M.shortName.word)||"";$("#f_snproper").checked=!!M.shortName.proper;$("#f_snplural").checked=!!M.shortName.plural;
  ["darkvision","blindsight","tremorsense","truesight"].forEach(k=>$("#se_"+k).value=M.senses[k]||"");$("#se_blindBeyond").checked=!!M.senses.blindBeyond;$("#se_other").value=M.senses.other||"";
  $("#f_dmgnote").value=M.dmgnote||"";$("#f_gear").value=M.gear||"";$("#f_lang").value=M.lang||"";
  ABILS.forEach(a=>$("#ab_"+a).value=M[a]);
  $("#t_legend").checked=M.legend.on;$("#legendInner").style.display=M.legend.on?"":"none";$("#f_legintro").value=M.legend.intro||"";
  $("#t_villain").checked=M.villain.on;$("#villainInner").style.display=M.villain.on?"":"none";$("#f_vilintro").value=M.villain.intro||"";
  $("#t_lair").checked=M.lair.on;$("#lairInner").style.display=M.lair.on?"":"none";$("#f_lairintro").value=M.lair.intro||"";
  $("#t_regional").checked=M.regional.on;$("#regionalInner").style.display=M.regional.on?"":"none";$("#f_regional").value=M.regional.text||"";
  $("#fsLegend").classList.toggle("collapsed",!M.legend.on);$("#fsVillain").classList.toggle("collapsed",!M.villain.on);
  $("#fsLair").classList.toggle("collapsed",!M.lair.on);$("#fsRegional").classList.toggle("collapsed",!M.regional.on);
  if(M._auto.ac||M._auto.hp)applyCRAuto();
  refreshAbil();renderDmg();renderSkills();renderCimm();renderEntries();renderPreview();
}

function speedStr(m){const s=m.spd;let p=[`${s.walk||0} ft.`];
  if(s.climb)p.push(`Climb ${s.climb} ft.`);if(s.fly)p.push(`Fly ${s.fly} ft.${s.hover?" (hover)":""}`);
  if(s.swim)p.push(`Swim ${s.swim} ft.`);if(s.burrow)p.push(`Burrow ${s.burrow} ft.`);return p.join(", ");}
function defenseStrings(m){
  const res=DMG_TYPES.filter(d=>m.dmg[d]==="res"),imm=DMG_TYPES.filter(d=>m.dmg[d]==="imm"),vuln=DMG_TYPES.filter(d=>m.dmg[d]==="vuln");
  const noteRes=[],noteImm=[],noteVuln=[];
  (m.dmgnote||"").split(";").map(x=>x.trim()).filter(Boolean).forEach(n=>{if(/vulnerab/i.test(n))noteVuln.push(n.replace(/\s*\(Vulnerability\)/i,""));else if(/immun/i.test(n))noteImm.push(n.replace(/\s*\(Immunity\)/i,""));else noteRes.push(n.replace(/\s*\(Resistance\)/i,""));});
  const sj=a=>a.slice().sort((x,y)=>x.localeCompare(y)).join(", "); // always list alphabetically
  const immDmg=sj([...imm,...noteImm]);
  return{res:sj([...res,...noteRes]),vuln:sj([...vuln,...noteVuln]),immDmg,imm:[immDmg,m.cimm].filter(Boolean).join("; ")};
}
function sensesStr(m){const s=m.senses||{};let p=[];
  if(s.darkvision)p.push(`Darkvision ${s.darkvision} ft.`);
  if(s.blindsight)p.push(`Blindsight ${s.blindsight} ft.${s.blindBeyond?" (blind beyond this radius)":""}`);
  if(s.tremorsense)p.push(`Tremorsense ${s.tremorsense} ft.`);
  if(s.truesight)p.push(`Truesight ${s.truesight} ft.`);
  if(s.other)p.push(s.other);
  return p.join(", ");}
function refPhrase(cap){const sn=M.shortName||{word:"creature",proper:false};const w=sn.word||"creature";return sn.proper?w:((cap?"The ":"the ")+w);}
function applyRefsFor(mon,t){if(!t)return t;const sn=(mon&&mon.shortName)||{word:"creature",proper:false,plural:false};const w=sn.word||"creature";
  const ph=cap=>sn.proper?w:((cap?"The ":"the ")+w);const sfx=sn.plural?"":"s";
  return avgBrackets(t.replace(/\[C\]/g,ph(true)).replace(/\[c\]/g,ph(false)).replace(/\[Name\]/g,ph(true)).replace(/\[name\]/g,ph(false)).replace(/\[s\]/g,sfx)
    .replace(/\{C\}/g,ph(true)).replace(/\{c\}/g,ph(false)).replace(/\{Name\}/g,ph(true)).replace(/\{name\}/g,ph(false)).replace(/\{s\}/g,sfx)
    .replace(/\bThe creature\b/g,ph(true)).replace(/\bthe creature\b/g,ph(false)));}
function applyRefs(t){return applyRefsFor(M,t);}
function spellLines(e){const pb=pbForCR(M.cr),ab=mod(M[e.ability]||0);
  const dc=e.dc!==""&&e.dc!=null?Number(e.dc):8+pb+ab;
  const atk=e.atk!==""&&e.atk!=null?Number(e.atk):pb+ab;
  const abName={str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"}[e.ability||"cha"];
  const main=`[C] casts one of the following spells, requiring no Material components and using ${abName} as the spellcasting ability (spell save DC ${dc}, ${sgn(atk)} to hit with spell attacks):`;
  const groups=(e.groups||[]).filter(g=>g.spells).map(g=>({label:g.freq,spells:g.spells}));
  return{main,groups};}
function subName(t){return applyRefs(t);}
function fmtInline(t){return esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*([^*]+?)\*/g,"<i>$1</i>");}
function fmtBlock(t){return esc(String(t||"")).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*([^*]+?)\*/g,"<i>$1</i>").replace(/\n{2,}/g,"<br><br>").replace(/\n([-•])\s*/g,"<br><span class=\"blk-item\">").replace(/\n/g,"<br>");}
// ── Spell / condition references (Batch 14) ──────────────────────────────────
// Look up uploaded reference data by name (case-insensitive).
function findSpell(name){const n=String(name||"").trim().toLowerCase();return state.spells.find(s=>(s.name||"").toLowerCase()===n);}
function findCondition(name){const n=String(name||"").trim().toLowerCase();return state.conditions.find(c=>(c.name||"").toLowerCase()===n);}
function refSpan(kind,name){return `<span class="reflink" data-ref="${kind}" data-name="${esc(name)}">${esc(name)}</span>`;}
// Linkify a comma-separated spell list; matched spells become hover/click refs.
function linkSpells(str){return String(str||"").split(",").map(tok=>{const t=tok.trim();if(!t)return "";return findSpell(t)?refSpan("spell",t):esc(t);}).filter(Boolean).join(", ");}
// Build the hover/click card body for a spell or condition.
function refContent(kind,name){
  if(kind==="spell"){const s=findSpell(name);if(!s)return "";
    const meta=s.level===0?(s.school+" cantrip"):s.level?("Level "+s.level+" "+s.school):s.school;
    const sub=[s.castingTime&&["Casting Time",s.castingTime],s.range&&["Range",s.range],s.components&&["Components",s.components],s.duration&&["Duration",s.duration]]
      .filter(Boolean).map(([k,v])=>`<b>${k}</b> ${esc(v)}`).join("<br>");
    return `<div class="refcard-h">${esc(s.name)}</div><div class="refcard-meta">${esc(meta)}</div>${sub?`<div class="refcard-sub">${sub}</div>`:""}${s.text?`<div class="refcard-body">${fmtBlock(s.text)}</div>`:""}`;}
  const c=findCondition(name);if(!c)return "";
  return `<div class="refcard-h">${esc(c.name)}${c.source?` <span class="refcard-src">${esc(c.source)}</span>`:""}</div>${c.category?`<div class="refcard-meta">${esc(c.category.replace(/s$/,""))}</div>`:""}${c.text?`<div class="refcard-body">${fmtBlock(c.text)}</div>`:""}`;}
let _refTimer=null;
function ensureRefpop(){let p=$("#refpop");if(!p){p=document.createElement("div");p.id="refpop";p.className="refpop";document.body.appendChild(p);
  p.addEventListener("mouseenter",()=>clearTimeout(_refTimer));p.addEventListener("mouseleave",hideRefpop);}return p;}
function showRefpop(anchor,kind,name){const html=refContent(kind,name);if(!html)return;const p=ensureRefpop();p.innerHTML=html;p.classList.add("show");
  const r=anchor.getBoundingClientRect();let left=Math.min(r.left,window.innerWidth-p.offsetWidth-10);left=Math.max(8,left);
  let top=r.bottom+6;if(top+p.offsetHeight>window.innerHeight-8)top=Math.max(8,r.top-p.offsetHeight-6);
  p.style.left=left+"px";p.style.top=top+"px";}
function hideRefpop(){clearTimeout(_refTimer);_refTimer=setTimeout(()=>{const p=$("#refpop");if(p)p.classList.remove("show");},140);}
document.addEventListener("mouseover",e=>{const r=e.target.closest&&e.target.closest(".reflink");if(r){clearTimeout(_refTimer);showRefpop(r,r.dataset.ref,r.dataset.name);}});
document.addEventListener("mouseout",e=>{if(e.target.closest&&e.target.closest(".reflink"))hideRefpop();});
document.addEventListener("click",e=>{const r=e.target.closest&&e.target.closest(".reflink");if(r){e.stopPropagation();clearTimeout(_refTimer);showRefpop(r,r.dataset.ref,r.dataset.name);return;}if(!(e.target.closest&&e.target.closest("#refpop")))hideRefpop();},true);
function skProfBonus(v,pb){return v==="exp"?pb*2:v==="none"?0:pb;}
function passivePerc(m){const pb=pbForCR(m.cr);const sk=m.skills.find(s=>s[0]==="Perception");return 10+mod(m.wis)+(sk?skProfBonus(sk[1],pb):0);}
// headline attack bonus / save DC: from the creature's first attack / first spell, else the CR target
function mainAttackBonus(m){const pb=pbForCR(m.cr),boh=BOH[m.cr];const atk=m.actions.find(e=>e.mode==="attack");
  if(atk)return{val:atk.atk!==""&&atk.atk!=null?Number(atk.atk):mod(m[atk.ability])+pb,cr:false};
  return{val:boh?boh[2]:null,cr:true};}
function mainSaveDC(m){const pb=pbForCR(m.cr),boh=BOH[m.cr];const sp=m.actions.find(e=>e.mode==="spell");
  if(sp)return{val:sp.dc!==""&&sp.dc!=null?Number(sp.dc):8+pb+mod(m[sp.ability]||0),cr:false,abil:sp.ability};
  // CR-target DC is keyed off the creature's best ability
  return{val:boh?boh[4]:null,cr:true,abil:ABILS.reduce((a,b)=>mod(m[b])>mod(m[a])?b:a,"str")};}
function renderPreview(){
  const m=M,pb=pbForCR(m.cr),xp=xpOf(m),boh=BOH[m.cr];
  const acFromCR=m.ac==null,acVal=m.ac??(boh?boh[0]:null);
  const ab=mainAttackBonus(m),dc=mainSaveDC(m);
  const chip=(lbl,val,approx,tip,suf)=>`<div class="dchip2"${tip?` title="${tip}"`:""}>${lbl}<b>${approx?'<span style="color:var(--faint)">≈</span>':''}${val??"—"}${suf?` <span class="dabil">${suf}</span>`:""}</b></div>`;
  $("#derived").innerHTML=chip("AC",acVal,acFromCR,acFromCR?"from CR target — no AC set":"")
    +chip("Attack",ab.val==null?null:sgn(ab.val),ab.cr,ab.cr?"from CR target — no attack defined":"")
    +chip("Save DC",dc.val,dc.cr,dc.cr?"from CR target — no save/spell defined":"",dc.val!=null&&dc.abil?dc.abil.toUpperCase():"");
  $("#crTargets").innerHTML=boh?`<b>CR ${m.cr} targets</b> — AC ${boh[0]} · HP ${boh[1]} · Attack ${sgn(boh[2])} · Damage/round ~${boh[3]} · Save DC ${boh[4]} · best ability ${sgn(boh[5])}`:"";
  $("#forgeTitle").textContent=m.name?("Editing · "+m.name):"New Creature";
  const initVal=initOf(m);
  const def=defenseStrings(m);
  let h=`<div class="topbar"></div><h2>${esc(m.name||"Unnamed Creature")}</h2>`;
  h+=`<div class="typeline">${esc([m.size,m.type+(m.subtype?` (${m.subtype})`:""),m.align].filter(Boolean).join(" "))||"&nbsp;"}</div><hr class="rule">`;
  h+=`<div class="topstats"><p><span class="k">AC</span> ${m.ac??"—"}${m.acnote?` (${esc(m.acnote)})`:""}</p><p><span class="k">Initiative</span> ${sgn(initVal)} (${10+initVal})</p><p><span class="k">HP</span> ${m.hp??"—"}${m.hpf?` (${esc(m.hpf)})`:""}</p><p><span class="k">Speed</span> ${esc(speedStr(m))}</p></div>`;
  h+=`<table class="ab"><tr><td class="lbl"></td><td class="mh">Mod</td><td class="mh">Save</td><td class="lbl"></td><td class="mh">Mod</td><td class="mh">Save</td></tr>`;
  [["str","int"],["dex","wis"],["con","cha"]].forEach(([l,r])=>{h+="<tr>"+[l,r].map(a=>{const md=mod(m[a]),sv=md+(m.saves.includes(a)?pb:0);return `<td class="h lbl">${a.toUpperCase()} <span class="sc">${m[a]}</span></td><td class="num">${sgn(md)}</td><td class="num">${sgn(sv)}</td>`;}).join("")+"</tr>";});
  h+=`</table><hr class="rule thin"><div class="meta">`;
  if(m.skills.length)h+=`<p><span class="k">Skills</span> ${m.skills.slice().sort((a,b)=>a[0].localeCompare(b[0])).map(s=>`${s[0].replace(/_/g," ")} ${sgn(mod(m[SKILLS[s[0]]])+skProfBonus(s[1],pb))}`).join(", ")}</p>`;
  if(def.vuln)h+=`<p><span class="k">Vulnerabilities</span> ${esc(def.vuln)}</p>`;
  if(def.res)h+=`<p><span class="k">Resistances</span> ${esc(def.res)}</p>`;
  const conds=(m.cimm||"").split(",").map(s=>s.trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b));
  const condHTML=conds.map(c=>findCondition(c)?refSpan("condition",c):esc(c)).join(", ");
  const immLine=[def.immDmg?esc(def.immDmg):"",condHTML].filter(Boolean).join("; ");
  if(immLine)h+=`<p><span class="k">Immunities</span> ${immLine}</p>`;
  if(m.gear)h+=`<p><span class="k">Gear</span> ${esc(m.gear)}</p>`;
  const sStr=sensesStr(m);
  h+=`<p><span class="k">Senses</span> ${esc(sStr?sStr+", ":"")}Passive Perception ${passivePerc(m)}</p>`;
  h+=`<p><span class="k">Languages</span> ${esc(m.lang||"None")}</p>`;
  h+=`<p><span class="k">CR</span> ${m.cr} (XP ${xp.toLocaleString()}; PB ${sgn(pb)})</p></div>`;
  const blk=e=>{
    if(e.mode==="spell"){const sp=spellLines(e);return `<p class="blk"><span class="nm">${esc(e.name||"Spellcasting")}.</span> ${fmtInline(applyRefs(sp.main))}</p>`+sp.groups.map(g=>`<p class="blk" style="margin:2px 0 2px 14px"><b>${esc(g.label)}:</b> ${linkSpells(g.spells)}</p>`).join("");}
    const body=e.mode==="attack"?attackText(e):e.text;
    return `<p class="blk"><span class="nm">${esc(e.name)}.</span> ${fmtInline(applyRefs(body))}</p>`;
  };
  const sec=arr=>arr.filter(e=>e.name||e.text||e.mode==="spell").map(blk).join("");
  if(m.traits.some(e=>e.name||e.text))h+=`<div style="margin-top:8px">${sec(m.traits)}</div>`;
  if(m.actions.some(e=>e.name||e.text||e.mode==="spell"))h+=`<h3>Actions</h3>${sec(m.actions)}`;
  if(m.bonus.some(e=>e.name||e.text))h+=`<h3>Bonus Actions</h3>${sec(m.bonus)}`;
  if(m.reactions.some(e=>e.name||e.response))h+=`<h3>Reactions</h3>`+m.reactions.filter(e=>e.name||e.response).map(e=>`<p class="blk"><span class="nm">${esc(e.name)}.</span> ${e.trigger?`<i>Trigger:</i> ${fmtInline(applyRefs(e.trigger))} <i>Response:</i> `:""}${fmtInline(applyRefs(e.response))}</p>`).join("");
  if(m.legend.on&&m.legend.items.some(e=>e.name||e.text))h+=`<h3>Legendary Actions</h3><p class="blk"><i>${fmtInline(applyRefs(m.legend.intro))}</i></p>${sec(m.legend.items)}`;
  if(m.villain.on&&m.villain.items.some(e=>e.name||e.text))h+=`<h3>Villain Actions</h3><p class="blk"><i>${fmtInline(applyRefs(m.villain.intro))}</i></p>`+[...m.villain.items].sort((a,b)=>(a.round||0)-(b.round||0)).filter(e=>e.name||e.text).map(e=>`<div class="va"><span class="rd">ACTION ${e.round||"?"}</span> <span class="nm">${esc(e.name)}.</span> ${fmtInline(applyRefs(e.text))}</div>`).join("");
  if(m.lair.on&&m.lair.items.some(e=>e.name||e.text)){h+=`<h3>Lair Actions</h3>`;if(m.lair.intro)h+=`<p class="blk"><i>${fmtInline(applyRefs(m.lair.intro))}</i></p>`;h+=sec(m.lair.items);}
  if(m.regional.on&&m.regional.text)h+=`<h3>Regional Effects</h3><p class="blk">${fmtInline(applyRefs(m.regional.text))}</p>`;
  $("#statblock").innerHTML=h;
}
function validName(){if(!M.name.trim()){toast("Give the creature a name first.");return false;}return true;}
function notionSingle(m){
  const pb=pbForCR(m.cr),xp=xpOf(m),initVal=initOf(m),def=defenseStrings(m);
  let L=[`## ${m.name}`,`*${[m.size,m.type+(m.subtype?` (${m.subtype})`:""),m.align].filter(Boolean).join(" ")}*`,
    `**AC** ${m.ac??"—"}${m.acnote?` (${m.acnote})`:""}`,`**Initiative** ${sgn(initVal)} (${10+initVal})`,
    `**HP** ${m.hp??"—"}${m.hpf?` (${m.hpf})`:""}`,`**Speed** ${speedStr(m)}`,"",
    `| | STR | DEX | CON | INT | WIS | CHA |`,`|---|---|---|---|---|---|---|`,
    `| Score | ${ABILS.map(a=>m[a]).join(" | ")} |`,`| Mod | ${ABILS.map(a=>sgn(mod(m[a]))).join(" | ")} |`,
    `| Save | ${ABILS.map(a=>sgn(mod(m[a])+(m.saves.includes(a)?pb:0))).join(" | ")} |`,""];
  if(m.skills.length)L.push(`**Skills** ${m.skills.map(s=>`${s[0].replace(/_/g," ")} ${sgn(mod(m[SKILLS[s[0]]])+skProfBonus(s[1],pb))}`).join(", ")}`);
  if(def.vuln)L.push(`**Vulnerabilities** ${def.vuln}`);
  if(def.res)L.push(`**Resistances** ${def.res}`);
  if(def.imm)L.push(`**Immunities** ${def.imm}`);
  if(m.gear)L.push(`**Gear** ${m.gear}`);
  const sStr=sensesStr(m);
  L.push(`**Senses** ${sStr?sStr+", ":""}Passive Perception ${passivePerc(m)}`);
  L.push(`**Languages** ${m.lang||"None"}`);
  L.push(`**CR** ${m.cr} (XP ${xp.toLocaleString()}; PB ${sgn(pb)})`);
  const line=e=>{
    if(e.mode==="spell"){const sp=spellLines(e);return [`***${e.name||"Spellcasting"}.*** ${applyRefs(sp.main)}`,...sp.groups.map(g=>`**${g.label}:** ${applyRefs(g.spells)}`)].join("\n");}
    const body=e.mode==="attack"?attackText(e):applyRefs(e.text);
    return `***${e.name}.*** ${body}`;};
  const sec=(t,arr)=>{const f=arr.filter(e=>e.name||e.text||e.mode==="spell");if(!f.length)return;L.push("");if(t)L.push(`### ${t}`);f.forEach(e=>L.push(line(e)));};
  sec("",m.traits);sec("Actions",m.actions);sec("Bonus Actions",m.bonus);
  if(m.reactions.some(e=>e.name)){L.push("","### Reactions");m.reactions.filter(e=>e.name).forEach(e=>L.push(`***${e.name}.*** ${e.trigger?`*Trigger:* ${applyRefs(e.trigger)} *Response:* `:""}${applyRefs(e.response||"")}`));}
  if(m.legend.on&&m.legend.items.some(e=>e.name)){L.push("","### Legendary Actions",`*${applyRefs(m.legend.intro)}*`);m.legend.items.filter(e=>e.name).forEach(e=>L.push(line(e)));}
  if(m.villain.on&&m.villain.items.some(e=>e.name)){L.push("","### Villain Actions",`*${applyRefs(m.villain.intro)}*`);[...m.villain.items].sort((a,b)=>(a.round||0)-(b.round||0)).filter(e=>e.name).forEach(e=>L.push(`**Action ${e.round}: ${e.name}.** ${applyRefs(e.text)}`));}
  if(m.lair.on&&m.lair.items.some(e=>e.name)){L.push("","### Lair Actions");if(m.lair.intro)L.push(`*${applyRefs(m.lair.intro)}*`);m.lair.items.filter(e=>e.name).forEach(e=>L.push(line(e)));}
  if(m.regional.on&&m.regional.text){L.push("","### Regional Effects",applyRefs(m.regional.text));}
  return L.join("\n");
}
function claudeMonster(m){
  const out=clone(m);delete out._auto;
  out.derived={pb:pbForCR(m.cr),xp:xpOf(m),speed:speedStr(m),senses:sensesStr(m),defenses:defenseStrings(m),passive_perception:passivePerc(m)};
  out.rendered_actions=m.actions.map(e=>e.mode==="spell"?{name:e.name||"Spellcasting",text:[applyRefs(spellLines(e).main),...spellLines(e).groups.map(g=>g.label+": "+applyRefs(g.spells))].join("\n")}:e.mode==="attack"?{name:e.name,text:attackText(e)}:{name:e.name,text:applyRefs(e.text)});
  const payload={forge:"monster",v:2,props:{Name:m.name,AC:m.ac,HP:m.hp,XP:xpOf(m),CR:m.cr,PB:pbForCR(m.cr)},monster:out,notion_single_column:notionSingle(m)};
  return "<<CLAUDE-FORGE / push this monster to my Notion Statblocks DB in MM25 two-column format; set AC/HP/XP properties; flag if a same-name page exists>>\n```json\n"+JSON.stringify(payload,null,2)+"\n```";
}

const VIEW_LABELS={forge:"Forge",library:"Bestiary",adventures:"Adventures"};
function setCrumbs(parts){const el=$("#crumbs");if(!el)return;el.innerHTML=parts.map((p,i)=>`<span class="${i===parts.length-1?"cur":"up"}">${esc(p)}</span>`).join('<span class="sep">›</span>');}
function switchView(v){$$("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$$(".view").forEach(s=>s.classList.toggle("active",s.id==="view-"+v));setCrumbs([VIEW_LABELS[v]||"Forge"]);if(v==="library")renderLibrary();if(v==="adventures")renderAdvList();}
$("#nav").addEventListener("click",e=>{const b=e.target.closest("button");if(b){switchView(b.dataset.view);$("#app").classList.remove("sidebar-open");}});

// ====== Notion-style control bars: search · filter · sort · group (Batch 15) ======
// A control bar drives a list via a `ctrl` state object + a `desc` descriptor. The same
// machinery powers the Bestiary and the From-chassis popup; only the descriptor differs.
const STATUS_ORDER=["Draft","Ready","Archived","Preset"];
const ICO_SEARCH=`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4 14 14" stroke-linecap="round"/></svg>`;
const ICO_FILTER=`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M4.5 8h7M6.5 12h3"/></svg>`;
const ICO_SORT=`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 3v10M4.8 13 2.6 10.6M4.8 13l2.2-2.4M11.2 13V3M11.2 3 9 5.4M11.2 3l2.2 2.4"/></svg>`;
const ICO_GROUP=`<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.4" y="2.4" width="4.4" height="4.4" rx="1"/><rect x="9.2" y="2.4" width="4.4" height="4.4" rx="1"/><rect x="2.4" y="9.2" width="4.4" height="4.4" rx="1"/><rect x="9.2" y="9.2" width="4.4" height="4.4" rx="1"/></svg>`;
const CTRL_ICONS=[["search",ICO_SEARCH,"Search"],["filter",ICO_FILTER,"Filter"],["sort",ICO_SORT,"Sort"],["group",ICO_GROUP,"Group by"]];
function blankCtrl(){return {q:"",filters:{},sort:{key:"name",dir:1},group:null};}
function ctrlIconButtonsHTML(){return CTRL_ICONS.map(([k,svg,t])=>`<button class="ctrl-ico" data-ico="${k}" title="${t}" aria-label="${t}">${svg}</button>`).join("");}
function bindCtrlIcons(host,ctrl,desc,onChange){if(!host)return;host.innerHTML=ctrlIconButtonsHTML();host.addEventListener("click",e=>{const b=e.target.closest("[data-ico]");if(!b)return;e.stopPropagation();openCtrlMenu(b.dataset.ico,b,ctrl,desc,onChange);});}

// --- menus (each icon opens a popover; selections mutate `ctrl` and call onChange) ---
function openCtrlMenu(kind,anchor,ctrl,desc,onChange){
  const reopen=()=>openCtrlMenu(kind,anchor,ctrl,desc,onChange);
  if(kind==="search"){
    const p=showPopover(anchor,`<input type="text" class="popinput" placeholder="Search name or type…" autocomplete="off">`);
    const inp=p.querySelector("input");inp.value=ctrl.q||"";inp.focus();inp.select();
    inp.addEventListener("input",()=>{ctrl.q=inp.value;onChange();});
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key==="Escape"){e.preventDefault();closePopover();}});
    return;}
  if(kind==="filter")return openFilterMenu(anchor,ctrl,desc,onChange);
  if(kind==="sort"){
    const html=desc.sortKeys.map(s=>`<button class="popitem popcheck${ctrl.sort.key===s.key?" on":""}" data-k="${s.key}"><span class="ck">${ctrl.sort.key===s.key?"●":""}</span>${esc(s.label)}</button>`).join("")
      +`<div class="popsep"></div>`+[[1,"Ascending"],[-1,"Descending"]].map(([d,l])=>`<button class="popitem popcheck${ctrl.sort.dir===d?" on":""}" data-dir="${d}"><span class="ck">${ctrl.sort.dir===d?"✓":""}</span>${l}</button>`).join("");
    const p=showPopover(anchor,html);
    p.querySelectorAll("[data-k]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();ctrl.sort.key=b.dataset.k;onChange();reopen();}));
    p.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();ctrl.sort.dir=+b.dataset.dir;onChange();reopen();}));
    return;}
  if(kind==="group"){
    const opts=[{k:"",label:"None"},...desc.params.map(p=>({k:p.key,label:p.label}))];
    const p=showPopover(anchor,opts.map(o=>`<button class="popitem popcheck${(ctrl.group||"")===o.k?" on":""}" data-g="${o.k}"><span class="ck">${(ctrl.group||"")===o.k?"●":""}</span>${esc(o.label)}</button>`).join(""));
    p.querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();ctrl.group=b.dataset.g||null;onChange();reopen();}));
    return;}
}
// Two-level filter menu: pick a parameter, then toggle one or more values (OR within a parameter).
function openFilterMenu(anchor,ctrl,desc,onChange){
  const root=()=>{const p=showPopover(anchor,desc.params.map(pp=>{const n=(ctrl.filters[pp.key]||[]).length;return `<button class="popitem" data-p="${pp.key}">${esc(pp.label)}${n?` <span class="pcount">${n}</span>`:""}<span class="popchev">›</span></button>`;}).join(""));
    p.querySelectorAll("[data-p]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();level(b.dataset.p);}));};
  const level=pkey=>{const pp=desc.params.find(x=>x.key===pkey),sel=ctrl.filters[pkey]||[],vals=pp.values();
    if(!vals.length){const p=showPopover(anchor,`<button class="popitem popback" data-back>‹ ${esc(pp.label)}</button><div class="empty-state" style="padding:14px 10px;font-size:12px">No values yet.</div>`);p.querySelector("[data-back]").addEventListener("click",e=>{e.stopPropagation();root();});return;}
    const p=showPopover(anchor,`<button class="popitem popback" data-back>‹ ${esc(pp.label)}</button><div class="popscroll">`+vals.map(v=>`<button class="popitem popcheck${sel.includes(v)?" on":""}" data-v="${esc(v)}"><span class="ck">${sel.includes(v)?"✓":""}</span>${esc(pp.fmt?pp.fmt(v):v)}</button>`).join("")+`</div>`);
    p.querySelector("[data-back]").addEventListener("click",e=>{e.stopPropagation();root();});
    p.querySelectorAll("[data-v]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const cur=ctrl.filters[pkey]||(ctrl.filters[pkey]=[]),i=cur.indexOf(b.dataset.v);if(i>=0)cur.splice(i,1);else cur.push(b.dataset.v);if(!cur.length)delete ctrl.filters[pkey];onChange();level(pkey);}));};
  root();
}
// Active-modifier chips below the header. Click a chip body to re-open its menu; × removes it.
function renderCtrlChips(host,ctrl,desc,onChange){
  if(!host)return;const chips=[];
  if(ctrl.q)chips.push({cls:"q",ico:ICO_SEARCH,txt:`“${ctrl.q}”`,open:"search",clear:()=>{ctrl.q="";}});
  desc.params.forEach(pp=>(ctrl.filters[pp.key]||[]).forEach(v=>chips.push({cls:"f",ico:ICO_FILTER,txt:`${pp.label}: ${pp.fmt?pp.fmt(v):v}`,open:"filter",clear:()=>{const cur=ctrl.filters[pp.key]||[],i=cur.indexOf(v);if(i>=0)cur.splice(i,1);if(!cur.length)delete ctrl.filters[pp.key];}})));
  if(ctrl.sort.key!=="name"||ctrl.sort.dir!==1){const sk=desc.sortKeys.find(s=>s.key===ctrl.sort.key);chips.push({cls:"s",ico:ICO_SORT,txt:`${sk?sk.label:ctrl.sort.key} ${ctrl.sort.dir<0?"↓":"↑"}`,open:"sort",clear:()=>{ctrl.sort={key:"name",dir:1};}});}
  if(ctrl.group){const gp=desc.params.find(p=>p.key===ctrl.group);chips.push({cls:"g",ico:ICO_GROUP,txt:`Group: ${gp?gp.label:ctrl.group}`,open:"group",clear:()=>{ctrl.group=null;}});}
  if(!chips.length){host.innerHTML="";host.style.display="none";return;}
  host.style.display="";
  host.innerHTML=chips.map((c,i)=>`<span class="ctrl-chip ${c.cls}" data-ci="${i}">${c.ico?`<span class="ci">${c.ico}</span>`:""}<span class="ct">${esc(c.txt)}</span><button class="chipx" data-cx="${i}" title="Remove">×</button></span>`).join("")+(chips.length>1?`<button class="ctrl-clear" data-clearall>Clear all</button>`:"");
  host.querySelectorAll("[data-cx]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();chips[+b.dataset.cx].clear();onChange();}));
  host.querySelectorAll("[data-ci]").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest("[data-cx]"))return;const c=chips[+el.dataset.ci];if(c.open)openCtrlMenu(c.open,el,ctrl,desc,onChange);}));
  const ca=host.querySelector("[data-clearall]");if(ca)ca.addEventListener("click",e=>{e.stopPropagation();Object.assign(ctrl,{q:"",filters:{},sort:{key:"name",dir:1},group:null});onChange();});
}
// Generic engine: filter (AND across params, OR within), then sort.
function ctrlApply(records,ctrl,desc){
  const q=(ctrl.q||"").toLowerCase().trim();
  let recs=records.filter(r=>{
    if(q&&!r.m.name.toLowerCase().includes(q)&&!(r.m.type||"").toLowerCase().includes(q))return false;
    for(const p of desc.params){const sel=ctrl.filters[p.key]||[];if(!sel.length)continue;const vs=p.multi?(p.get(r)||[]):[p.get(r)];if(!vs.some(v=>sel.includes(v)))return false;}
    return true;});
  const sp=desc.sortKeys.find(s=>s.key===ctrl.sort.key),cmp=(sp&&sp.cmp)||((a,b)=>a.m.name.localeCompare(b.m.name));
  recs.sort((a,b)=>cmp(a,b)*ctrl.sort.dir||a.m.name.localeCompare(b.m.name));
  return recs;
}
function groupSorter(key){
  if(key==="status")return (a,b)=>STATUS_ORDER.indexOf(a)-STATUS_ORDER.indexOf(b);
  if(key==="cr")return (a,b)=>(CR_NUM[a]??-1)-(CR_NUM[b]??-1);
  if(key==="source")return (a,b)=>(a==="Built-in"?-1:b==="Built-in"?1:a.localeCompare(b));
  return (a,b)=>a==="∅"?1:b==="∅"?-1:a.localeCompare(b);
}
// Render records into `body`, grouped (exclusive) or flat. Group-by repeats a multi-valued
// (tag) card once per group it belongs to; untagged cards fall into an "Untagged" group.
function renderRecords(body,recs,ctrl,desc,opts){
  const cap=opts.cap||9999;
  if(!recs.length){body.innerHTML=`<div class="empty-state">${opts.emptyMsg}</div>`;return;}
  if(!ctrl.group){const shown=recs.slice(0,cap);body.innerHTML=`<div class="cards">${shown.map(opts.cardOf).join("")}</div>`+(recs.length>cap?capHint(recs.length,cap):"");return;}
  const p=desc.params.find(x=>x.key===ctrl.group),groups=new Map();
  const add=(k,lab,r)=>{if(!groups.has(k))groups.set(k,{label:lab,items:[]});groups.get(k).items.push(r);};
  recs.forEach(r=>{if(p.multi){const vs=p.get(r)||[];if(!vs.length)add("∅","Untagged",r);else vs.forEach(v=>add(v,p.fmt?p.fmt(v):v,r));}else{const v=p.get(r);add(v??"∅",(v==null||v==="")?"—":(p.fmt?p.fmt(v):v),r);}});
  const keys=[...groups.keys()].sort(groupSorter(ctrl.group));
  let shown=0;body.innerHTML=keys.map(k=>{const g=groups.get(k),items=g.items.slice(0,Math.max(0,cap-shown));shown+=items.length;const col=opts.collapsible&&libCollapsed.has(k);return items.length?`<div class="grp${col?" collapsed":""}" data-grpkey="${esc(k)}"><div class="grp-head">${esc(g.label)}<span class="grp-n">${g.items.length}</span><button class="grp-collapse" title="${col?"Expand":"Collapse"}">▾</button></div><div class="cards">${items.map(opts.cardOf).join("")}</div></div>`:"";}).join("")+(shown<recs.length?capHint(recs.length,shown):"");
  body.querySelectorAll(".grp-head").forEach(h=>{h.addEventListener("click",e=>{if(e.target.closest(".grp-collapse")||e.target.tagName==="BUTTON"){}const grp=h.closest(".grp");const k=grp.dataset.grpkey;libCollapsed.has(k)?libCollapsed.delete(k):libCollapsed.add(k);grp.classList.toggle("collapsed",libCollapsed.has(k));const btn=h.querySelector(".grp-collapse");if(btn)btn.title=libCollapsed.has(k)?"Expand":"Collapse";});});
}
function capHint(total,shown){return `<div class="hint" style="margin-top:10px">Showing first ${shown.toLocaleString()} of ${total.toLocaleString()} — refine your search.</div>`;}

// ---- Bestiary control descriptor + records ----
function libFirstTag(r){return ((r.m.tags||[]).slice().sort((x,y)=>x.localeCompare(y))[0])||"￿";}
const LIB_DESC={search:true,group:true,
  params:[
    {key:"status",label:"Status",get:r=>r.status,values:()=>STATUS_ORDER.slice()},
    {key:"cr",label:"CR",fmt:v=>"CR "+v,get:r=>r.m.cr,values:()=>[...new Set(state.lib.map(m=>m.cr))].sort((a,b)=>(CR_NUM[a]??0)-(CR_NUM[b]??0))},
    {key:"tag",label:"Tag",multi:true,get:r=>r.m.tags||[],values:()=>[...new Set(state.lib.flatMap(m=>m.tags||[]))].sort((a,b)=>a.localeCompare(b))},
  ],
  sortKeys:[
    {key:"name",label:"Name",cmp:(a,b)=>a.m.name.localeCompare(b.m.name)},
    {key:"cr",label:"CR",cmp:(a,b)=>(CR_NUM[a.m.cr]??0)-(CR_NUM[b.m.cr]??0)},
    {key:"status",label:"Status",cmp:(a,b)=>STATUS_ORDER.indexOf(a.status)-STATUS_ORDER.indexOf(b.status)},
    {key:"tag",label:"Tag",cmp:(a,b)=>libFirstTag(a).localeCompare(libFirstTag(b))},
  ]};
let libCtrl=blankCtrl();
const libCollapsed=new Set(); // keys of collapsed group headers
// Presets (built-in chassis + uploaded statblocks) are opt-in: they appear only when the
// Status filter includes "Preset" or the list is grouped by status (which gets a Preset group).
function libRecords(){
  const incPreset=(libCtrl.filters.status||[]).includes("Preset")||libCtrl.group==="status";
  let recs=state.lib.map(m=>({m,status:m.status||"Draft",preset:false}));
  if(incPreset)recs=recs.concat(presetPool().map(o=>({m:o.m,status:"Preset",preset:true,src:o.src})));
  return recs;
}
function libEmptyMsg(){return state.lib.length?"No creatures match these controls.":`No saved creatures yet. Build one in the Forge, or start <b>From chassis</b>.`;}
function buildTagDatalist(){const dl=$("#libTagList");if(dl)dl.innerHTML=[...new Set(state.lib.flatMap(m=>m.tags||[]))].sort((a,b)=>a.localeCompare(b)).map(t=>`<option value="${esc(t)}">`).join("");}
function renderLibrary(){
  buildTagDatalist();
  renderCtrlChips($("#libChips"),libCtrl,LIB_DESC,renderLibrary);
  const body=$("#libBody"),recs=ctrlApply(libRecords(),libCtrl,LIB_DESC);
  renderRecords(body,recs,libCtrl,LIB_DESC,{cardOf:r=>r.preset?presetCardHTML({m:r.m,src:r.src}):cardHTML(r.m),emptyMsg:libEmptyMsg(),cap:400,collapsible:true});
  wireLibCards(body);
}
function wireLibCards(body){
  const find=id=>state.lib.find(x=>x.id===id);
  body.querySelectorAll("[data-card]").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest(".menu-wrap")||e.target.closest(".tags")||e.target.closest(".card-tags"))return;loadMonster(find(el.dataset.card));switchView("forge");}));
  body.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{loadMonster(find(b.dataset.edit));switchView("forge");}));
  body.querySelectorAll("[data-dup]").forEach(b=>b.addEventListener("click",()=>{const m=clone(find(b.dataset.dup));m.id=uid();m.name+=" (copy)";m.chassis=false;state.lib.unshift(m);saveLib();renderLibrary();toast("Duplicated.");}));
  body.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>confirmModal(`Delete “${find(b.dataset.del).name}”?`,()=>{state.lib=state.lib.filter(x=>x.id!==b.dataset.del);saveLib();renderLibrary();toast("Deleted.");})));
  body.querySelectorAll("[data-arch]").forEach(b=>b.addEventListener("click",()=>{const m=find(b.dataset.arch);setStatus(m,m.archived?"Ready":"Archived");}));
  body.querySelectorAll("[data-claude]").forEach(b=>b.addEventListener("click",()=>{const sav=M;M=normalizeMonster(clone(find(b.dataset.claude)));const txt=claudeMonster(M);M=sav;copyModal("Copy for Claude",txt,"Paste in chat — I build the Notion page in MM25 format and set its properties.");}));
  body.querySelectorAll("[data-notion]").forEach(b=>b.addEventListener("click",()=>{const sav=M;M=normalizeMonster(clone(find(b.dataset.notion)));const txt=notionSingle(M);M=sav;copyModal("Copy for Notion (manual)",txt,"Single-column, paste-safe. Set AC/HP/XP properties by hand.");}));
  body.querySelectorAll("[data-stchip]").forEach(ch=>ch.addEventListener("click",e=>{e.stopPropagation();openStatusMenu(find(ch.dataset.stchip),ch);}));
  body.querySelectorAll("[data-addtag]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();openTagAdd(find(b.dataset.addtag),b);}));
  body.querySelectorAll("[data-rmtag]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const m=find(b.dataset.rmtag);m.tags=(m.tags||[]).filter(t=>t!==b.dataset.tagval);saveLib();renderLibrary();}));
  body.querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>{const ch=findChassis(b.dataset.pick);if(ch)applyChassis(ch,false,false);}));
}
// Small floating popover used by the status & tag-add chips.
let _pop=null;
function closePopover(){if(_pop){_pop.remove();_pop=null;document.removeEventListener("click",_popOutside,true);}}
function _popOutside(e){if(_pop&&!_pop.contains(e.target))closePopover();}
function showPopover(anchor,html){closePopover();const p=document.createElement("div");p.className="popover";p.innerHTML=html;document.body.appendChild(p);
  const r=anchor.getBoundingClientRect();let left=Math.min(r.left,window.innerWidth-p.offsetWidth-8);left=Math.max(8,left);
  let top=r.bottom+4;if(top+p.offsetHeight>window.innerHeight-8)top=Math.max(8,r.top-p.offsetHeight-4);
  p.style.left=left+"px";p.style.top=top+"px";_pop=p;setTimeout(()=>document.addEventListener("click",_popOutside,true),0);return p;}
function openStatusMenu(m,anchor){if(!m)return;const p=showPopover(anchor,STATUSES.map(s=>`<button class="popitem${s===m.status?" on":""}" data-s="${s}">${s}</button>`).join(""));
  p.querySelectorAll("[data-s]").forEach(b=>b.addEventListener("click",()=>{closePopover();setStatus(m,b.dataset.s);}));}
function openTagAdd(m,anchor){if(!m)return;const p=showPopover(anchor,`<input type="text" class="popinput" list="libTagList" placeholder="Add or pick a tag…" autocomplete="off">`);
  const inp=p.querySelector("input");inp.focus();
  const commit=v=>{v=(v||"").replace(/,/g,"").trim();closePopover();if(v&&!(m.tags||[]).includes(v)){(m.tags=m.tags||[]).push(v);saveLib();}renderLibrary();};
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit(inp.value);}else if(e.key==="Escape")closePopover();});
  inp.addEventListener("input",()=>{if(inp.value.includes(","))commit(inp.value);});}
function setStatus(m,status){if(!m)return;m.status=status;m.archived=(status==="Archived");saveLib();renderLibrary();}
function cardHTML(m){const arch=m.archived;return `<div class="card${arch?" archived":""}" data-card="${m.id}">
  <div class="menu-wrap cardmenu">
    <button class="kebab" data-menu="lib-${m.id}" title="More">⋯</button>
    <div class="menu" id="menu-lib-${m.id}">
      <button data-edit="${m.id}">Edit</button>
      <button data-dup="${m.id}">Duplicate</button>
      <button data-arch="${m.id}">${arch?"Restore":"Archive"}</button>
      <div class="sep"></div>
      <button data-claude="${m.id}">Copy for Claude</button>
      <button data-notion="${m.id}">Copy for Notion</button>
      <div class="sep"></div>
      <button class="danger" data-del="${m.id}">Delete</button>
    </div>
  </div>
  <h4>${esc(m.name)}</h4><div class="meta">${esc([m.size,m.type].filter(Boolean).join(" "))||"—"}</div>
  <div class="tags">
    <span class="tag cr">CR ${m.cr}</span>
    <span class="tag st st-${m.status} statchip" data-stchip="${m.id}">${m.status} <span class="caret">▾</span></span>
    <button class="tag addtag" data-addtag="${m.id}" title="Add tag">＋ tag</button>
  </div>
  <div class="card-tags">
    ${(m.tags||[]).map(t=>`<span class="tag tagchip">${esc(t)}<button class="chipx" data-rmtag="${m.id}" data-tagval="${esc(t)}" title="Remove tag">×</button></span>`).join("")}
  </div>
</div>`;}
// "Preset" status view: built-in chassis + uploaded statblock presets, de-emphasised (like
// Archived). These are reference bases — clicking one loads a fresh copy into the Forge.
function presetPool(){return [...CHASSIS.map(m=>({m,src:"Built-in"})),...state.presets.map(m=>({m,src:m._source||"Uploaded"}))];}
function presetCardHTML(o){const m=o.m;return `<div class="card preset" data-pick="${esc(m.id)}" title="Use as base">
  <span class="src-badge${o.src==="Built-in"?" built":""}">${esc(o.src)}</span>
  <h4>${esc(m.name)}</h4><div class="meta">${esc([m.size,m.type].filter(Boolean).join(" "))||"—"}</div>
  <div class="tags"><span class="tag cr">CR ${m.cr}</span><span class="tag st st-Preset">Preset</span></div>
</div>`;}
bindCtrlIcons($("#libCtrlIcons"),libCtrl,LIB_DESC,renderLibrary);
$("#libNew").addEventListener("click",()=>{loadMonster(blankMonster());switchView("forge");});
$("#libChassis").addEventListener("click",()=>openChassis());
$("#forgeChassis").addEventListener("click",()=>openChassis(true));
$("#forgePaste").addEventListener("click",openImportModal);
$("#clearForge").addEventListener("click",()=>confirmModal("Clear the Forge? Any unsaved edits to this creature will be lost.",()=>{loadMonster(blankMonster());toast("Cleared.");}));

$("#saveMonster").addEventListener("click",async()=>{
  if(!validName())return;
  const rec=clone(M);rec.chassis=false;
  const i=state.lib.findIndex(x=>x.id===rec.id);
  if(i>=0)state.lib[i]=rec;else state.lib.unshift(rec);
  await saveLib();
  if(pendingForge){const a=state.adv.find(x=>x.id===pendingForge.advId);const e=a&&a.encounters.find(x=>x.id===pendingForge.encId);
    if(e){addMonsterCombatant(e,rec.id);await saveAdv();}
    const pf=pendingForge;pendingForge=null;hideBanner();toast("Saved & added to encounter.");state.selAdv=pf.advId;switchView("adventures");return;}
  toast(i>=0?"Updated in Bestiary.":"Saved to Bestiary.");
});
$("#pushClaude").addEventListener("click",()=>{if(!validName())return;copyModal("Copy for Claude",claudeMonster(M),"Paste in chat — I build the Notion page in MM25 format and set its properties.");});
$("#copyNotion").addEventListener("click",()=>{if(!validName())return;copyModal("Copy for Notion (manual)",notionSingle(M),"Single-column, paste-safe. Set AC/HP/XP properties by hand.");});

function monsterDirty(){const m=M;
  if(m.name.trim()||m.type||m.subtype||m.align||m.acnote||m.hpf||m.gear||m.dmgnote||m.cimm)return true;
  if((m.ac!=null&&!m._auto.ac)||(m.hp!=null&&!m._auto.hp)||(m.init!==""&&m.init!=null))return true;
  if((m.lang||"Common")!=="Common"||m.cr!=="1")return true;
  if(ABILS.some(a=>m[a]!==10))return true;
  if(m.saves.length||m.skills.length||Object.keys(m.dmg).length)return true;
  if(m.traits.length||m.actions.length||m.bonus.length||m.reactions.length)return true;
  if(m.legend.on||m.villain.on||m.lair.on||m.regional.on)return true;
  const sp=m.spd;if(sp.walk!==30||sp.climb||sp.fly||sp.swim||sp.burrow||sp.hover)return true;
  const se=m.senses;if(se.darkvision||se.blindsight||se.tremorsense||se.truesight||se.other||se.blindBeyond)return true;
  if((m.shortName.word||"creature")!=="creature"||m.shortName.proper||m.shortName.plural)return true;
  return false;}
function mergeChassis(ch){const m=M,out=clone(ch);out.id=m.id;out.chassis=false;out._auto={ac:false,hp:false};
  if(m.name.trim())out.name=m.name;
  ["type","subtype","align","acnote","hpf","gear","dmgnote","cimm"].forEach(k=>{if(m[k])out[k]=m[k];});
  if(m.ac!=null)out.ac=m.ac;if(m.hp!=null)out.hp=m.hp;if(m.init!==""&&m.init!=null)out.init=m.init;
  if((m.lang||"Common")!=="Common")out.lang=m.lang;if(m.cr!=="1")out.cr=m.cr;
  if(ABILS.some(a=>m[a]!==10))ABILS.forEach(a=>out[a]=m[a]);
  if(m.saves.length)out.saves=clone(m.saves);if(m.skills.length)out.skills=clone(m.skills);
  if(Object.keys(m.dmg).length)out.dmg=clone(m.dmg);
  ["traits","actions","bonus","reactions"].forEach(k=>{if(m[k].length)out[k]=clone(m[k]);});
  if(m.legend.on)out.legend=clone(m.legend);if(m.villain.on)out.villain=clone(m.villain);
  if(m.lair.on)out.lair=clone(m.lair);if(m.regional.on)out.regional=clone(m.regional);
  const sp=m.spd;if(sp.walk!==30||sp.climb||sp.fly||sp.swim||sp.burrow||sp.hover)out.spd=clone(sp);
  const se=m.senses;if(se.darkvision||se.blindsight||se.tremorsense||se.truesight||se.other||se.blindBeyond)out.senses=clone(se);
  if((m.shortName.word||"creature")!=="creature"||m.shortName.proper||m.shortName.plural)out.shortName=clone(m.shortName);
  return out;}
function applyChassis(ch,keepId,merge){
  let base;
  if(merge)base=mergeChassis(ch);
  else{base=clone(ch);base.id=(keepId&&M)?M.id:uid();base.chassis=false;base._auto={ac:false,hp:false};}
  delete base._preset;delete base._source;
  loadMonster(base);switchView("forge");toast("Loaded chassis — edit & save.");
}
function findChassis(id){return CHASSIS.find(x=>x.id===id)||state.presets.find(x=>x.id===id);}
function openChassis(fromForge){
  const ctrl=blankCtrl();ctrl.sort.key="cr";
  const chPool=()=>[...CHASSIS.map(m=>({m,src:"Built-in"})),...state.presets.map(m=>({m,src:m._source||"Uploaded"}))];
  const desc={search:true,group:true,
    params:[
      {key:"source",label:"Source",get:r=>r.src,values:()=>["Built-in",...presetSources().map(s=>s.name)]},
      {key:"cr",label:"CR",fmt:v=>"CR "+v,get:r=>r.m.cr,values:()=>[...new Set(chPool().map(r=>r.m.cr))].sort((a,b)=>(CR_NUM[a]??0)-(CR_NUM[b]??0))},
    ],
    sortKeys:[
      {key:"cr",label:"CR",cmp:(a,b)=>(CR_NUM[a.m.cr]??0)-(CR_NUM[b.m.cr]??0)},
      {key:"name",label:"Name",cmp:(a,b)=>a.m.name.localeCompare(b.m.name)},
    ]};
  openModalRaw(`<h3>Start from a chassis</h3>
    <p class="hint" style="margin:-4px 0 10px">Generic built-in bases plus any preset libraries you've uploaded. PB/XP/save math is exact; flavor stats are starting points — reskin freely.</p>
    <div class="ctrl-icons" id="chCtrlIcons"></div>
    <div class="ctrl-chips" id="chChips"></div>
    <div id="chBody"></div>`);
  const cardOf=o=>`<div class="card" style="cursor:default"><span class="src-badge${o.src==="Built-in"?" built":""}">${esc(o.src)}</span><h4 style="padding-right:0">${esc(o.m.name)}</h4><div class="meta">${esc([o.m.size,o.m.type].filter(Boolean).join(" "))||"—"}</div><div class="tags"><span class="tag cr">CR ${o.m.cr}</span><span class="tag">${xpOf(o.m).toLocaleString()} XP</span></div><div style="margin-top:auto;padding-top:8px"><button class="btn ghost sm" data-pick="${esc(o.m.id)}" style="width:100%">Use as base</button></div></div>`;
  function draw(){
    renderCtrlChips($("#chChips"),ctrl,desc,draw);
    const body=$("#chBody"),recs=ctrlApply(chPool(),ctrl,desc);
    renderRecords(body,recs,ctrl,desc,{cardOf,emptyMsg:`No matches.${state.presets.length?"":" Upload a .md preset library from the sidebar (“Preset libraries…”) to add more bases."}`,cap:200});
    body.querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>{const ch=findChassis(b.dataset.pick);if(!ch)return;closeModal();
      if(fromForge===true&&monsterDirty())chassisConflictModal(ch);else applyChassis(ch,fromForge===true,false);}));
  }
  bindCtrlIcons($("#chCtrlIcons"),ctrl,desc,draw);
  draw();
}
function presetModal(){
  const libs=presetLibraries();
  let h=`<h3>Preset libraries</h3><p class="hint" style="margin:-4px 0 14px">Upload 5etools-style <code>.md</code> dumps — <b>statblocks</b> (bases for <b>From chassis</b>), <b>spells</b>, or <b>conditions</b>. The kind is detected automatically. Parsed in your browser and stored only on this device — never sent to the cloud or committed to the repo.</p>`;
  if(libs.length)h+=`<div class="preset-list">`+libs.map(s=>`<div class="preset-row"><div><b>${esc(s.name)}</b> <span class="kind-badge k-${s.kind}">${KIND_LABEL[s.kind]}</span><span class="hint"> · ${s.count.toLocaleString()}</span></div><button class="iconbtn" data-rmsrc="${esc(s.name)}" data-rmkind="${s.kind}" title="Remove library">✕</button></div>`).join("")+`</div>`;
  else h+=`<div class="empty-state" style="padding:26px">No preset libraries uploaded yet.</div>`;
  h+=`<div class="mrow"><button class="btn ghost sm" id="prClose" style="width:auto">Close</button><button class="btn primary sm" id="prAdd" style="width:auto">＋ Upload .md files</button></div>`;
  openModalRaw(h);
  $("#prClose").addEventListener("click",closeModal);
  $("#prAdd").addEventListener("click",()=>$("#mdIn").click());
  $("#modal").querySelectorAll("[data-rmsrc]").forEach(b=>b.addEventListener("click",()=>{const n=b.dataset.rmsrc,k=b.dataset.rmkind;
    if(k==="spell"){state.spells=state.spells.filter(x=>x._source!==n);saveSpells();}
    else if(k==="condition"){state.conditions=state.conditions.filter(x=>x._source!==n);saveConditions();}
    else{state.presets=state.presets.filter(x=>x._source!==n);savePresets();}
    toast("Removed “"+n+"”.");presetModal();}));
}
function chassisConflictModal(ch){
  openModalRaw(`<h3>You have unsaved edits</h3><p class="hint" style="margin:-4px 0 14px">Loading “${esc(ch.name)}” — what should happen to your current edits?</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn ghost sm" id="ccKeep" style="width:auto;justify-content:flex-start">Import chassis, keep my edits <span class="sub">— chassis fills only empty fields</span></button>
      <button class="btn ghost sm" id="ccOverride" style="width:auto;justify-content:flex-start">Import chassis, override my edits <span class="sub">— discard current edits</span></button>
      <button class="btn ghost sm" id="ccBack" style="width:auto;justify-content:flex-start">Go back <span class="sub">— keep editing, don't import</span></button>
    </div>`);
  $("#ccKeep").addEventListener("click",()=>{closeModal();applyChassis(ch,true,true);});
  $("#ccOverride").addEventListener("click",()=>{closeModal();applyChassis(ch,true,false);});
  $("#ccBack").addEventListener("click",closeModal);
}

function renderAdvList(){
  const box=$("#advItems");
  const active=state.adv.filter(a=>!a.archived),arch=state.adv.filter(a=>a.archived);
  let html=active.map(a=>`<div class="ai ${a.id===state.selAdv?"sel":""}" data-adv="${a.id}"><div class="nm">${esc(a.name)}</div><div class="dt">${a.uneven?"mixed lvl":(a.size+"× lvl "+a.level)} · ${a.encounters.filter(e=>!e.archived).length} enc.</div></div>`).join("")||`<div class="hint" style="padding:8px">No adventures yet.</div>`;
  if(arch.length)html+=`<div class="hint" style="padding:6px 8px 2px;font-size:11px">Archived</div>`+arch.map(a=>`<div class="ai ${a.id===state.selAdv?"sel":""}" data-adv="${a.id}" style="opacity:.5"><div class="nm">${esc(a.name)}</div></div>`).join("");
  box.innerHTML=html;
  box.querySelectorAll("[data-adv]").forEach(el=>el.addEventListener("click",()=>{state.selAdv=el.dataset.adv;renderAdvList();}));
  const btn=$("#newAdv");if(btn){btn.className=`btn ${state.adv.length?"ghost":"primary"} sm`;btn.style.width="auto";}
  renderAdvDetail();
}
$("#newAdv").addEventListener("click",()=>{const a=normalizeAdv({id:uid(),name:"New Adventure",size:4,level:1,uneven:false,levels:[1,1,1,1],notes:"",encounters:[]});state.adv.unshift(a);state.selAdv=a.id;saveAdv();renderAdvList();});
function curAdv(){return state.adv.find(a=>a.id===state.selAdv);}
function partyOf(adv,e){return (e&&e.partyOverride)?e.partyOverride:{size:adv.size,level:adv.level,uneven:adv.uneven,levels:adv.levels};}
function partyLevels(p){return p.uneven?p.levels.slice(0,p.size):Array.from({length:p.size},()=>p.level);}
function baseBudget(p){const lv=partyLevels(p);return [0,1,2].map(di=>lv.reduce((s,l)=>s+BUDGET[clamp(l,1,20)][di],0));}
function monOf(c){return state.lib.find(x=>x.id===c.monsterId);}
function addMonsterCombatant(enc,monsterId){
  const cid=uid();
  enc.combatants.push({type:"monster",id:cid,monsterId,nickname:"",count:1,faction:"Enemy"});
  const m=state.lib.find(x=>x.id===monsterId);
  if(m&&m.lair&&m.lair.on&&(m.lair.items||[]).some(it=>it.name||it.text)){
    const lines=[];
    if(m.lair.intro)lines.push(applyRefsFor(m,m.lair.intro));
    m.lair.items.filter(it=>it.name||it.text).forEach(it=>lines.push(`${it.name?it.name+": ":""}${applyRefsFor(m,it.text)}`));
    enc.combatants.push({type:"event",id:uid(),name:`${m.name} — Lair Action`,init:"20",text:lines.join("\n"),lairFor:cid});
  }
  return cid;
}
function combatCR(c){return c.type==="monster"?(monOf(c)?monOf(c).cr:null):c.type==="quick"?c.cr:null;}
function combatXP(c){if(c.type==="monster"&&monOf(c))return xpOf(monOf(c))*Number(c.count||1);const cr=combatCR(c);return cr!=null?(CR_XP[cr]||0)*Number(c.count||1):0;}
function encBudget(adv,e){
  const base=baseBudget(partyOf(adv,e));const add=[0,0,0];
  e.combatants.forEach(c=>{if(c.faction==="Ally"&&c.type!=="event"){const cr=combatCR(c);if(cr!=null){const lv=clamp(Math.round(CR_NUM[cr]),1,20);for(let i=0;i<3;i++)add[i]+=BUDGET[lv][i]*Number(c.count||1);}}});
  return base.map((b,i)=>b+add[i]);
}
function encSpent(e){return e.combatants.filter(c=>c.faction==="Enemy"&&c.type!=="event").reduce((s,c)=>s+combatXP(c),0);}
function diffOf(spent,bud){if(spent<=0)return["trivial","Empty"];if(spent>bud[2])return["over","Over High"];if(spent>=bud[2]*0.92)return["high","High"];if(spent>=bud[1]*0.92)return["moderate","Moderate"];if(spent>=bud[0]*0.85)return["low","Low"];return["trivial","Trivial"];}

function renderAdvDetail(){
  const a=curAdv(),d=$("#advDetail");
  if(!a){setCrumbs(["Adventures"]);d.innerHTML=`<div class="empty-state">Select or create an adventure.</div>`;return;}
  setCrumbs(["Adventures",a.name||"Untitled"]);
  const bud=baseBudget(partyOf(a,null));
  const budW=bud[2]||1;const budPcts=[Math.round(bud[0]/budW*100),Math.round(bud[1]/budW*100),100];
  d.innerHTML=`<div class="col-head"><h2 contenteditable="true" id="advName" style="outline:none">${esc(a.name)}</h2>
    <div class="menu-wrap" style="flex:none"><button class="kebab" data-menu="adv-opts" title="Adventure options">⋯</button>
    <div class="menu" id="menu-adv-opts">
      <button id="advDuplicate">Duplicate adventure</button>
      <button id="advArchive">${a.archived?"Unarchive":"Archive"} adventure</button>
      <div class="sep"></div>
      <button class="danger" id="delAdv">Delete adventure</button>
    </div></div></div>
    <div class="party-bar">
      <label class="f">Party size<input type="number" id="pSize" min="1" max="12" value="${a.size}" style="width:78px"></label>
      <label class="f" id="pLevelWrap" ${a.uneven?'style="display:none"':""}>Party level<input type="number" id="pLevel" min="1" max="20" value="${a.level}" style="width:78px"></label>
      <label class="toggle" style="margin-bottom:8px"><input type="checkbox" id="pUneven" ${a.uneven?"checked":""}> Uneven levels</label>
      <div id="pcLevels" ${a.uneven?"":'style="display:none"'} style="flex-basis:100%"><div class="hint" style="margin-bottom:4px">Per-PC levels</div><div class="pcgrid" id="pcGrid"></div></div>
      <div style="flex-basis:100%">
        <div class="adv-bud-bar">
          <div class="adv-bud-track">
            <div class="bud-seg low" style="left:0;width:${budPcts[0]}%"></div>
            <div class="bud-seg mod" style="left:${budPcts[0]}%;width:${budPcts[1]-budPcts[0]}%"></div>
            <div class="bud-seg high" style="left:${budPcts[1]}%;width:${100-budPcts[1]}%"></div>
          </div>
          <div class="adv-bud-labels"><span>Low ${bud[0].toLocaleString()}</span><span>Mod ${bud[1].toLocaleString()}</span><span>High ${bud[2].toLocaleString()}</span></div>
        </div>
      </div>
    </div>
    <label class="f advnotes">Adventure notes<textarea id="advNotes" placeholder="Premise, hooks, party goals, open threads…">${esc(a.notes||"")}</textarea></label>
    <div class="section-label">Encounters <button class="btn ghost sm" id="addEnc" style="width:auto">＋ Encounter</button></div>
    <div id="encList"></div>
    <div id="archWrap"></div>`;
  const nm=$("#advName");nm.addEventListener("blur",()=>{a.name=nm.textContent.trim()||"Untitled";saveAdv();renderAdvList();});
  $("#delAdv").addEventListener("click",()=>confirmModal(`Delete "${a.name}" and its encounters?`,()=>{state.adv=state.adv.filter(x=>x.id!==a.id);state.selAdv=null;saveAdv();renderAdvList();}));
  $("#advDuplicate").addEventListener("click",()=>{const c=normalizeAdv(JSON.parse(JSON.stringify(a)));c.id=uid();c.name=a.name+" (copy)";c.encounters=c.encounters.map(e=>Object.assign({},e,{id:uid()}));state.adv.splice(state.adv.indexOf(a)+1,0,c);state.selAdv=c.id;saveAdv();renderAdvList();});
  $("#advArchive").addEventListener("click",()=>{a.archived=!a.archived;saveAdv();renderAdvList();});
  wrapStepper($("#pSize"),1,1);wrapStepper($("#pLevel"),1,1);
  $("#pSize").addEventListener("change",e=>{a.size=clamp(Number(e.target.value||1),1,12);syncLevels(a);saveAdv();renderAdvDetail();});
  $("#pLevel").addEventListener("change",e=>{a.level=clamp(Number(e.target.value||1),1,20);saveAdv();renderAdvDetail();});
  $("#pUneven").addEventListener("change",e=>{a.uneven=e.target.checked;syncLevels(a);saveAdv();renderAdvDetail();});
  $("#advNotes").addEventListener("input",e=>{a.notes=e.target.value;saveAdv();});
  $("#addEnc").addEventListener("click",()=>{a.encounters.push({id:uid(),name:"New Encounter",archived:false,notes:"",partyOverride:null,combatants:[]});saveAdv();renderAdvDetail();});
  renderPCgrid(a);renderEncList(a);
}
function syncLevels(a){a.levels=Array.from({length:a.size},(_,i)=>a.levels[i]??a.level);}
function renderPCgrid(a){const g=$("#pcGrid");if(!g)return;syncLevels(a);g.innerHTML=a.levels.slice(0,a.size).map((l,i)=>`<input type="number" min="1" max="20" value="${l}" data-pc="${i}">`).join("");g.querySelectorAll("[data-pc]").forEach(el=>el.addEventListener("input",()=>{a.levels[+el.dataset.pc]=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));}

function renderEncList(a){
  const box=$("#encList");if(!box)return;
  const active=a.encounters.filter(e=>!e.archived),arch=a.encounters.filter(e=>e.archived);
  box.innerHTML=active.length?active.map(e=>encHTML(a,e)).join(""):`<div class="hint">No active encounters.</div>`;
  const aw=$("#archWrap");
  if(arch.length){
    aw.innerHTML=`<div class="section-label" style="margin-top:24px"><button class="arch-reveal" id="archToggle"><span class="arch-chev">▶</span> Archived (${arch.length})</button></div><div id="archBody" style="display:none">${arch.map(e=>encHTML(a,e)).join("")}</div>`;
    const toggle=document.getElementById("archToggle"),body=document.getElementById("archBody");
    toggle.addEventListener("click",()=>{const open=body.style.display!=="none";body.style.display=open?"none":"block";toggle.classList.toggle("open",!open);});
  }else{aw.innerHTML="";}
  bindEncEvents(a);
}
// Patch an encounter's derived numbers (difficulty pill, budget bar, spent read-out, and each
// combatant's XP) in place — used on count edits so we never rebuild (and refocus) the input.
function updateEncMeta(a,e){
  const root=document.querySelector(`#advDetail .enc[data-enc="${e.id}"]`);if(!root)return;
  const bud=encBudget(a,e),spent=encSpent(e),[cls,label]=diffOf(spent,bud);
  const pct=Math.min(100,bud[2]?spent/bud[2]*100:0);
  const fill=cls==="over"?"var(--bad)":cls==="high"?"var(--accent)":cls==="moderate"?"var(--warn)":"var(--ok)";
  const pill=root.querySelector(".eh .pill");if(pill){pill.className="pill "+cls;pill.textContent=label;}
  const f=root.querySelector(".budget .fill");if(f){f.style.width=pct+"%";f.style.background=fill;}
  const p=partyOf(a,e),read=root.querySelector(".budget .read");
  if(read)read.innerHTML=`Spent <b>${spent.toLocaleString()} XP</b> of ${bud[2].toLocaleString()} (High)${e.partyOverride?` · <span style="color:var(--amber)">override: ${p.uneven?"mixed":p.size+"× lvl "+p.level}</span>`:""}${e.combatants.some(c=>c.faction==="Ally")?` · <span style="color:var(--ok)">allies raised budget</span>`:""}`;
  e.combatants.forEach(c=>{const x=root.querySelector(`.cbt[data-cid="${c.id}"] .xpv`);if(x)x.textContent=combatXP(c).toLocaleString()+" XP";});
}
function encHTML(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[cls,label]=diffOf(spent,bud);
  const pct=Math.min(100,bud[2]?spent/bud[2]*100:0);
  const fill=cls==="over"?"var(--bad)":cls==="high"?"var(--accent)":cls==="moderate"?"var(--warn)":"var(--ok)";
  const p=partyOf(a,e);
  return `<div class="enc ${e.archived?"arch":""}" data-enc="${e.id}">
    <div class="eh">
      <div class="ehbtns"><button class="iconbtn up" data-encup="${e.id}">▲</button><button class="iconbtn down" data-encdown="${e.id}">▼</button></div>
      <input class="enm" value="${esc(e.name)}" data-encname="${e.id}">
      <span class="pill ${cls}">${label}</span>
      <div class="menu-wrap">
        <button class="kebab" data-menu="enc-${e.id}" title="More">⋯</button>
        <div class="menu" id="menu-enc-${e.id}">
          <button data-encovr="${e.id}">${e.partyOverride?"Remove party override":"Override party for this encounter"}</button>
          <button data-pushenc="${e.id}">Copy encounter for Claude</button>
          <button data-encarch="${e.id}">${e.archived?"Unarchive":"Archive"}</button>
          <div class="sep"></div>
          <button class="danger" data-encdel="${e.id}">Delete</button>
        </div>
      </div>
    </div>
    <div class="budget"><div class="bar"><div class="fill" style="width:${pct}%;background:${fill}"></div></div>
      <div class="ticks"><span>Low ${bud[0].toLocaleString()}</span><span>Mod ${bud[1].toLocaleString()}</span><span>High ${bud[2].toLocaleString()}</span></div>
      <div class="read">Spent <b>${spent.toLocaleString()} XP</b> of ${bud[2].toLocaleString()} (High)${e.partyOverride?` · <span style="color:var(--amber)">override: ${p.uneven?"mixed":p.size+"× lvl "+p.level}</span>`:""}${e.combatants.some(c=>c.faction==="Ally")?` · <span style="color:var(--ok)">allies raised budget</span>`:""}</div>
    </div>
    <div class="ovr ${e.partyOverride?"show":""}">${e.partyOverride?ovrInner(e):""}</div>
    <label class="f encnotes">Battlefield notes<textarea data-encnotes="${e.id}" placeholder="Terrain, light, hazards, special rules…">${esc(e.notes||"")}</textarea></label>
    <div data-combat="${e.id}">${e.combatants.map(c=>combatHTML(e,c)).join("")||'<div class="hint" style="margin:4px 0">No combatants yet.</div>'}</div>
    <div class="addrow">
      <button class="addbtn" data-addmon="${e.id}" style="flex:1">＋ Add combatant <span style="color:var(--faint)">(Bestiary)</span></button>
      <div class="menu-wrap">
        <button class="kebab" data-menu="addc-${e.id}" title="More ways to add">⋯</button>
        <div class="menu" id="menu-addc-${e.id}">
          <button data-addquick="${e.id}">＋ Quick combatant (CR only)</button>
          <button data-addforge="${e.id}">＋ Forge new monster →</button>
          <button data-addev="${e.id}">＋ Event / entity</button>
        </div>
      </div>
    </div>
  </div>`;
}
function ovrInner(e){const o=e.partyOverride;return `<div class="row">
  <label class="f">Size<input type="number" min="1" max="12" value="${o.size}" data-ovrsize="${e.id}" style="width:74px"></label>
  <label class="f" ${o.uneven?'style="display:none"':""}>Level<input type="number" min="1" max="20" value="${o.level}" data-ovrlevel="${e.id}" style="width:74px"></label>
  <label class="toggle" style="margin-bottom:8px"><input type="checkbox" data-ovruneven="${e.id}" ${o.uneven?"checked":""}> Uneven</label>
  </div>${o.uneven?`<div class="pcgrid" style="margin-top:8px">${(o.levels||[]).slice(0,o.size).map((l,i)=>`<input type="number" min="1" max="20" value="${l}" data-ovrpc="${e.id}:${i}">`).join("")}</div>`:""}`;}
function combatHTML(e,c){
  if(c.type==="event")return `<div class="cbt ev" data-cid="${c.id}"><div class="top"><input class="nick" placeholder="Event / entity name" data-cf="${c.id}:name" value="${esc(c.name||"")}"><input type="text" placeholder="init / count 20" data-cf="${c.id}:init" value="${esc(c.init||"")}" style="width:120px;flex:none"><button class="iconbtn" data-cdel="${c.id}">✕</button></div><textarea placeholder="Description — e.g. recurring battlefield effect on this initiative count" data-cf="${c.id}:text">${esc(c.text||"")}</textarea></div>`;
  const cls=c.faction==="Ally"?"ally":"";const xp=combatXP(c);
  if(c.type==="quick")return `<div class="cbt ${cls}" data-cid="${c.id}"><div class="top">
    <input class="nick" placeholder="Combatant name" data-cf="${c.id}:nickname" value="${esc(c.nickname||"")}">
    <select class="crsel" data-cf="${c.id}:cr">${CR_LIST.map(x=>`<option value="${x}" ${x===c.cr?"selected":""}>CR ${x}</option>`).join("")}</select>
    <input class="cnt" type="number" min="1" value="${c.count}" data-cf="${c.id}:count">
    <select class="fac" data-cf="${c.id}:faction">${FACTIONS.map(f=>`<option ${f===c.faction?"selected":""}>${f}</option>`).join("")}</select>
    <span class="xpv">${xp.toLocaleString()} XP</span><button class="iconbtn" data-cdel="${c.id}">✕</button></div>
    <div class="sec"><span class="lab">no statblock — budget only</span></div></div>`;
  const m=monOf(c);
  return `<div class="cbt ${cls}" data-cid="${c.id}"><div class="top">
    <input class="nick" placeholder="${esc(m?m.name:"(missing)")}" data-cf="${c.id}:nickname" value="${esc(c.nickname||"")}">
    <input class="cnt" type="number" min="1" value="${c.count}" data-cf="${c.id}:count">
    <select class="fac" data-cf="${c.id}:faction">${FACTIONS.map(f=>`<option ${f===c.faction?"selected":""}>${f}</option>`).join("")}</select>
    <span class="xpv">${xp.toLocaleString()} XP</span><button class="iconbtn" data-cdel="${c.id}">✕</button></div>
    <div class="sec"><span class="lab">statblock:</span><select data-cf="${c.id}:monsterId">${state.lib.map(x=>`<option value="${x.id}" ${x.id===c.monsterId?"selected":""}>${esc(x.name)} (CR ${x.cr})</option>`).join("")}</select></div></div>`;
}
function findEnc(a,id){return a.encounters.find(e=>e.id===id);}
function findCombat(a,cid){for(const e of a.encounters){const c=e.combatants.find(x=>x.id===cid);if(c)return{e,c};}return{};}
function bindEncEvents(a){
  const q=sel=>$$("#advDetail "+sel);
  q("[data-encname]").forEach(el=>el.addEventListener("change",()=>{findEnc(a,el.dataset.encname).name=el.value;saveAdv();}));
  q("[data-encnotes]").forEach(el=>el.addEventListener("input",()=>{findEnc(a,el.dataset.encnotes).notes=el.value;saveAdv();}));
  q("[data-encdel]").forEach(el=>el.addEventListener("click",()=>{a.encounters=a.encounters.filter(e=>e.id!==el.dataset.encdel);saveAdv();renderAdvDetail();}));
  q("[data-encarch]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encarch);e.archived=!e.archived;saveAdv();renderAdvDetail();}));
  q("[data-encup]").forEach(el=>el.addEventListener("click",()=>moveEnc(a,el.dataset.encup,-1)));
  q("[data-encdown]").forEach(el=>el.addEventListener("click",()=>moveEnc(a,el.dataset.encdown,1)));
  q("[data-encovr]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encovr);e.partyOverride=e.partyOverride?null:{size:a.size,level:a.level,uneven:a.uneven,levels:[...a.levels]};saveAdv();renderAdvDetail();}));
  q("[data-ovrsize]").forEach(el=>el.addEventListener("change",()=>{const e=findEnc(a,el.dataset.ovrsize);e.partyOverride.size=clamp(Number(el.value||1),1,12);e.partyOverride.levels=Array.from({length:e.partyOverride.size},(_,i)=>e.partyOverride.levels[i]??e.partyOverride.level);saveAdv();renderAdvDetail();}));
  q("[data-ovrlevel]").forEach(el=>el.addEventListener("change",()=>{findEnc(a,el.dataset.ovrlevel).partyOverride.level=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));
  q("[data-ovruneven]").forEach(el=>el.addEventListener("change",()=>{const e=findEnc(a,el.dataset.ovruneven);e.partyOverride.uneven=el.checked;e.partyOverride.levels=Array.from({length:e.partyOverride.size},(_,i)=>e.partyOverride.levels[i]??e.partyOverride.level);saveAdv();renderAdvDetail();}));
  q("[data-ovrpc]").forEach(el=>el.addEventListener("change",()=>{const[id,i]=el.dataset.ovrpc.split(":");findEnc(a,id).partyOverride.levels[+i]=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));
  q("[data-addmon]").forEach(el=>el.addEventListener("click",()=>{if(!state.lib.length){toast("Save a creature first, or use Quick / Forge.");return;}addMonsterCombatant(findEnc(a,el.dataset.addmon),state.lib[0].id);saveAdv();renderAdvDetail();}));
  q("[data-addquick]").forEach(el=>el.addEventListener("click",()=>{findEnc(a,el.dataset.addquick).combatants.push({type:"quick",id:uid(),nickname:"",cr:"1",count:1,faction:"Enemy"});saveAdv();renderAdvDetail();}));
  q("[data-addev]").forEach(el=>el.addEventListener("click",()=>{findEnc(a,el.dataset.addev).combatants.push({type:"event",id:uid(),name:"",init:"",text:""});saveAdv();renderAdvDetail();}));
  q("[data-addforge]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.addforge);pendingForge={advId:a.id,encId:e.id};loadMonster(blankMonster());showBanner(`Forging a new monster for “${e.name}”. Save to add it to that encounter.`,()=>{pendingForge=null;hideBanner();});switchView("forge");}));
  q("[data-pushenc]").forEach(el=>el.addEventListener("click",()=>pushEncounter(a,findEnc(a,el.dataset.pushenc))));
  q("[data-cf]").forEach(el=>{
    const[cid,f]=el.dataset.cf.split(":");
    if(el.tagName==="SELECT"){
      el.addEventListener("change",()=>{const{c}=findCombat(a,cid);if(!c)return;c[f]=el.value;saveAdv();if(["cr","faction","monsterId"].includes(f))renderEncList(a);});
    } else if(el.type==="number"){
      // count: patch derived totals in place. Never re-render the input — keyboard arrows and the
      // native spinner fire change/input immediately (not just on blur) and would drop focus.
      el.addEventListener("input",()=>{const{e,c}=findCombat(a,cid);if(!c)return;c[f]=clamp(Number(el.value||1),1,99);saveAdv();updateEncMeta(a,e);});
    } else {
      el.addEventListener("input",()=>{const{c}=findCombat(a,cid);if(!c)return;c[f]=el.value;saveAdv();}); // free-text: no re-render
    }
  });
  q("[data-cdel]").forEach(el=>el.addEventListener("click",()=>{const{e,c}=findCombat(a,el.dataset.cdel);if(e){e.combatants=e.combatants.filter(x=>x.id!==c.id&&x.lairFor!==c.id);saveAdv();renderAdvDetail();}}));
}
function moveEnc(a,id,dir){
  const list=a.encounters,i=list.findIndex(e=>e.id===id),e=list[i];
  const same=list.map((x,ix)=>({x,ix})).filter(o=>o.x.archived===e.archived).map(o=>o.ix);
  const pos=same.indexOf(i),tgt=same[pos+dir];
  if(tgt===undefined)return;[list[i],list[tgt]]=[list[tgt],list[i]];saveAdv();renderAdvDetail();
}
function pushEncounter(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[,label]=diffOf(spent,bud),p=partyOf(a,e);
  const payload={forge:"encounter",v:2,adventure:a.name,encounter_tag:`${a.name} / ${e.name}`,
    party:{size:p.size,levels:partyLevels(p),overridden:!!e.partyOverride},
    battlefield_notes:e.notes||"",
    budget:{low:bud[0],moderate:bud[1],high:bud[2],spent,reads_as:label,note:"allies (faction Ally) already folded into budget via CR→level"},
    combatants:e.combatants.filter(c=>c.type!=="event").map(c=>{const m=c.type==="monster"?monOf(c):null;return{kind:c.type,statblock_name:c.type==="monster"?(m?m.name:"(missing)"):null,nickname:c.nickname||null,cr:combatCR(c),xp_each:c.type==="monster"&&m?xpOf(m):(combatCR(c)!=null?CR_XP[combatCR(c)]:0),count:Number(c.count),faction:c.faction};}),
    environment_entities:e.combatants.filter(c=>c.type==="event").map(c=>({name:c.name||"(unnamed)",initiative:c.init||null,description:c.text||""}))};
  const txt="<<CLAUDE-FORGE / create the Enemy/Ally combatants below as Nemici entries in Notion, link each to its Statblock by name (use nickname as the entry Name when given, else the statblock name), set Faction & Status=Alive, and ROLL initiative for each (d20 + the statblock's DEX mod). Add environment_entities and battlefield_notes as encounter notes, not as statblock-linked enemies. Flag any statblock name not found.>>\n```json\n"+JSON.stringify(payload,null,2)+"\n```";
  copyModal("Copy encounter for Claude",txt,"Paste in chat — I create the combatant entries, link statblocks, roll initiative, and attach the notes/entities.");
}

function doExportJSON(){
  const data={kind:"monster-forge",exported:new Date().toISOString(),monsters:state.lib,adventures:state.adv};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="monster-forge-backup.json";a.click();URL.revokeObjectURL(url);toast("Exported.");
}
$("#exportAll").addEventListener("click",doExportJSON);
$("#importAll").addEventListener("click",()=>$("#fileIn").click());
$("#pasteStatblock").addEventListener("click",openImportModal);
$("#libPaste").addEventListener("click",openImportModal);
$("#presetManage").addEventListener("click",presetModal);
$("#mdIn").addEventListener("change",e=>{
  const files=[...e.target.files];if(!files.length)return;
  const summary=[];let done=0;
  files.forEach(f=>{const r=new FileReader();
    r.onload=()=>{const kind=detectMdKind(r.result);let n=0;
      try{
        if(kind==="spell"){const p=parseSpellsMD(r.result,f.name);state.spells=state.spells.filter(x=>x._source!==f.name).concat(p);n=p.length;saveSpells();buildSpellDatalist();}
        else if(kind==="condition"){const p=parseConditionsMD(r.result,f.name);state.conditions=state.conditions.filter(x=>x._source!==f.name).concat(p);n=p.length;saveConditions();buildCondDatalist();}
        else{const p=parseStatblockMD(r.result,f.name);state.presets=state.presets.filter(x=>x._source!==f.name).concat(p);n=p.length;savePresets();}
      }catch(err){n=0;}
      summary.push(`${f.name}: ${n.toLocaleString()} ${KIND_LABEL[kind]?KIND_LABEL[kind].toLowerCase():kind}`);
      if(++done===files.length){toast(`Loaded — ${summary.join("; ")}`);if($("#modalBg").classList.contains("show"))presetModal();}};
    r.readAsText(f);});
  e.target.value="";
});
// Single sidebar toggle in the appbar. Wide screens dock/undock; narrow screens open the
// floating drawer (no hover on touch).
$("#navToggle").addEventListener("click",e=>{e.stopPropagation();const app=$("#app");
  if(window.matchMedia("(max-width:720px)").matches)app.classList.toggle("sidebar-open");
  else{app.classList.toggle("nav-collapsed");app.classList.remove("sidebar-open");}});
// tapping outside the open drawer closes it
document.addEventListener("click",e=>{const app=$("#app");if(app.classList.contains("sidebar-open")&&!e.target.closest(".rail")&&!e.target.closest("#navToggle"))app.classList.remove("sidebar-open");});
// Wide screens: hovering the burger reveals the flying sidebar; it stays while the pointer is
// over the burger or the rail, and closes after a short grace period (tolerance) once you leave both.
(function(){const app=$("#app"),burger=$("#navToggle"),rail=$(".rail");let t;
  const show=()=>{clearTimeout(t);if(app.classList.contains("nav-collapsed")&&!window.matchMedia("(max-width:720px)").matches)app.classList.add("sidebar-open");};
  const hide=()=>{clearTimeout(t);t=setTimeout(()=>app.classList.remove("sidebar-open"),350);};
  burger.addEventListener("mouseenter",show);burger.addEventListener("mouseleave",hide);
  rail.addEventListener("mouseenter",()=>clearTimeout(t));rail.addEventListener("mouseleave",hide);
})();
$("#fileIn").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);const mons=(d.monsters||d.lib||(Array.isArray(d)?d:[])).map(normalizeMonster);let added=0;mons.forEach(m=>{if(!state.lib.some(x=>x.id===m.id)){state.lib.push(m);added++;}});if(d.adventures)d.adventures.map(normalizeAdv).forEach(av=>{if(!state.adv.some(x=>x.id===av.id))state.adv.push(av);});saveLib();saveAdv();renderLibrary();toast(`Imported ${added} creature(s).`);}catch(err){toast("Couldn't read that file — is it Forge JSON?");}};
  r.readAsText(f);e.target.value="";
});

function openModalRaw(html){$("#modal").innerHTML=html;$("#modalBg").classList.add("show");}
function closeModal(){$("#modalBg").classList.remove("show");}
$("#modalBg").addEventListener("click",e=>{if(e.target.id==="modalBg")closeModal();});
function copyModal(title,text,hint){
  openModalRaw(`<h3>${esc(title)}</h3><p class="hint" style="margin:-4px 0 12px">${esc(hint)}</p><textarea id="copyArea" readonly>${esc(text)}</textarea><div class="mrow"><button class="btn ghost sm" id="mClose" style="width:auto">Close</button><button class="btn primary sm" id="mCopy" style="width:auto">Copy to clipboard</button></div>`);
  $("#mClose").addEventListener("click",closeModal);
  $("#mCopy").addEventListener("click",async()=>{const ta=$("#copyArea");try{await navigator.clipboard.writeText(text);toast("Copied.");}catch(e){ta.focus();ta.select();try{document.execCommand("copy");toast("Copied.");}catch(_){toast("Select the text and copy manually.");}}});
  setTimeout(()=>{const ta=$("#copyArea");ta.focus();ta.select();},50);
}
function confirmModal(msg,onYes){
  openModalRaw(`<h3>Confirm</h3><p style="margin:-4px 0 14px">${esc(msg)}</p><div class="mrow"><button class="btn ghost sm" id="cNo" style="width:auto">Cancel</button><button class="btn primary sm" id="cYes" style="width:auto">Yes</button></div>`);
  $("#cNo").addEventListener("click",closeModal);$("#cYes").addEventListener("click",()=>{closeModal();onYes();});
}

// ── 5etools paste importer ────────────────────────────────────────────────────
// Parses a 5e.tools / MM'25-style plain-text block into a monster. Label-keyed,
// European-number tolerant; actions/traits imported as text entries.
const SEC_HEADERS={traits:"traits",actions:"actions","bonus actions":"bonus",reactions:"reactions","legendary actions":"legend","lair actions":"lair","regional effects":"regional","villain actions":"villain"};
function classifyDmg(str){const types={},note=[];String(str).split(/[,;]/).map(t=>t.trim()).filter(Boolean).forEach(tok=>{const hit=DMG_TYPES.find(d=>d.toLowerCase()===tok.toLowerCase());if(hit)types[hit]=1;else note.push(tok);});return{types,note};}
// split a section's blocks into named entries; frequency/continuation lines fold into the previous entry
function parseEntries(blocks){const out=[];(blocks||[]).forEach(b=>{b=b.trim();if(!b)return;
  const isCont=/^(at will|cantrip|constant|\d\s*\/\s*day|\d(?:st|nd|rd|th)[- ]level|level \d)/i.test(b);
  const mm=b.match(/^(.{1,60}?)\.\s+([\s\S]+)$/);
  if(mm&&!isCont)out.push({name:mm[1].trim(),text:mm[2].trim()});
  else if(out.length)out[out.length-1].text+="\n"+b;
  else out.push({name:"",text:b});});
  return out;}
function splitIntro(blocks){if(!blocks||!blocks.length)return{intro:"",items:[]};
  const introRe=/legendary action uses|immediately after another creature|on initiative count|can take \d+ legendary|^the .* takes a lair action|villain action/i;
  if(introRe.test(blocks[0]))return{intro:blocks[0].trim(),items:parseEntries(blocks.slice(1))};
  return{intro:"",items:parseEntries(blocks)};}
function parse5etools(raw){
  const m=blankMonster();m._auto={ac:false,hp:false};
  const lines=raw.replace(/\r/g,"").split("\n").map(l=>l.trim());
  let i=0;while(i<lines.length&&!lines[i])i++;if(i>=lines.length)return null;
  m.name=lines[i++];
  const sizeRe=/^(tiny|small|medium|large|huge|gargantuan)\b/i;
  let typeIdx=-1;for(let j=i;j<lines.length;j++){if(/^AC\s/i.test(lines[j]))break;if(sizeRe.test(lines[j])){typeIdx=j;break;}}
  if(typeIdx>=0){const parts=lines[typeIdx].split(",");const left=parts[0].trim();m.align=parts.slice(1).join(",").trim();
    const sm=left.match(sizeRe);m.size=sm[0][0].toUpperCase()+sm[0].slice(1).toLowerCase();
    let rest=left.replace(sizeRe,"").trim();const sub=rest.match(/\(([^)]+)\)/);if(sub){m.subtype=sub[1].trim();rest=rest.replace(/\([^)]*\)/,"").trim();}
    m.type=rest;i=typeIdx+1;}
  const isHeader=l=>SEC_HEADERS[l.toLowerCase()]!==undefined;
  let secStart=lines.length;for(let j=i;j<lines.length;j++){if(isHeader(lines[j])){secStart=j;break;}}
  let skillsRaw=null,mt;
  for(let j=i;j<secStart;j++){const l=lines[j];if(!l)continue;
    if(mt=l.match(/^AC\s+(\d+)\s*(?:\(([^)]+)\))?/i)){m.ac=+mt[1];if(mt[2])m.acnote=mt[2].trim();}
    else if(mt=l.match(/^Initiative\s+([+-]?\d+)/i))m.init=+mt[1];
    else if(mt=l.match(/^HP\s+(\d+)\s*(?:\(([^)]+)\))?/i)){m.hp=+mt[1];if(mt[2])m.hpf=mt[2].trim();}
    else if(mt=l.match(/^Speed\s+(.+)/i))m.spd=Object.assign(m.spd,parseSpeed(mt[1]));
    else if(mt=l.match(/^Skills?\s+(.+)/i))skillsRaw=mt[1];
    else if(mt=l.match(/^Saving Throws?\s+(.+)/i))mt[1].split(",").forEach(s=>{const sm2=s.trim().match(/^(str|dex|con|int|wis|cha)/i);if(sm2&&!m.saves.includes(sm2[1].toLowerCase()))m.saves.push(sm2[1].toLowerCase());});
    else if(mt=l.match(/^Immunities\s+(.+)/i)){const c=classifyDmg(mt[1]);Object.keys(c.types).forEach(t=>m.dmg[t]="imm");if(c.note.length)m.cimm=(m.cimm?m.cimm+", ":"")+c.note.join(", ");}
    else if(mt=l.match(/^Resistances\s+(.+)/i)){const c=classifyDmg(mt[1]);Object.keys(c.types).forEach(t=>m.dmg[t]="res");if(c.note.length)m.dmgnote=c.note.map(n=>n+" (Resistance)").join("; ");}
    else if(mt=l.match(/^Vulnerabilities\s+(.+)/i)){const c=classifyDmg(mt[1]);Object.keys(c.types).forEach(t=>m.dmg[t]="vuln");}
    else if(mt=l.match(/^Condition Immunities\s+(.+)/i))m.cimm=(m.cimm?m.cimm+", ":"")+mt[1].trim().replace(/\s*;\s*/g,", ");
    else if(mt=l.match(/^Gear\s+(.+)/i))m.gear=mt[1].trim();
    else if(mt=l.match(/^Senses\s+(.+)/i)){m.senses=parseSenses(mt[1]);
      let other=mt[1].replace(/Passive Perception\s+\d+/i,"").replace(/(darkvision|blindsight|tremorsense|truesight)\s*\d+\s*ft\.?/ig,"").replace(/\bblind beyond[^,;]*/i,"").replace(/[,;\s]+$/,"").replace(/^[,;\s]+/,"").trim();
      if(other)m.senses.other=other;}
    else if(mt=l.match(/^Languages?\s+(.+)/i))m.lang=mt[1].trim();
    else if(mt=l.match(/^(?:CR|Challenge(?: Rating)?)\s+([\d/]+)/i)){if(CR_LIST.includes(mt[1]))m.cr=mt[1];}
    else if(/^(str|dex|con|int|wis|cha)$/i.test(l)){const ab=l.toLowerCase(),nums=[];let k=j+1;
      while(k<secStart&&nums.length<3){const t=lines[k];if(t!==""){if(/^[+-]?\d+$/.test(t))nums.push(t);else break;}k++;}
      if(nums.length>=1)m[ab]=+nums[0];
      if(nums.length>=3&&Number(nums[2])!==mod(m[ab])&&!m.saves.includes(ab))m.saves.push(ab);
      j=k-1;}}
  if(skillsRaw){const pb=pbForCR(m.cr);skillsRaw.split(",").forEach(s=>{const mm2=s.trim().match(/^([A-Za-z' ]+?)\s*([+-]\d+)$/);if(!mm2)return;const nm=mm2[1].trim().replace(/ /g,"_");if(!SKILLS[nm])return;
    const bonus=(+mm2[2])-mod(m[SKILLS[nm]]);m.skills.push([nm,bonus>=pb*2?"exp":bonus<=0?"none":"prof"]);});}
  // sections → blank-line-separated blocks
  let cur=null;const sec={};let buf=[];
  const flush=()=>{if(buf.length){(sec[cur]=sec[cur]||[]).push(buf.join(" ").trim());buf=[];}};
  for(let j=secStart;j<lines.length;j++){const l=lines[j];if(isHeader(l)){flush();cur=SEC_HEADERS[l.toLowerCase()];continue;}if(!cur)continue;if(l==="")flush();else buf.push(l);}
  flush();
  const toEntries=blocks=>parseEntries(blocks).map(e=>T(e.name,e.text));
  if(sec.traits)m.traits=toEntries(sec.traits);
  if(sec.actions)m.actions=toEntries(sec.actions);
  if(sec.bonus)m.bonus=toEntries(sec.bonus);
  if(sec.reactions)m.reactions=parseEntries(sec.reactions).map(e=>{const tm=e.text.match(/Trigger:\s*([\s\S]*?)\s*Response:\s*([\s\S]+)/i);return tm?{mode:"react",name:e.name,trigger:tm[1].trim(),response:tm[2].trim()}:{mode:"react",name:e.name,trigger:"",response:e.text};});
  if(sec.legend){const s=splitIntro(sec.legend);m.legend={on:true,intro:s.intro,items:s.items.map(e=>T(e.name,e.text))};}
  if(sec.lair){const s=splitIntro(sec.lair);m.lair={on:true,intro:s.intro,items:s.items.map(e=>T(e.name,e.text))};}
  if(sec.villain){const s=splitIntro(sec.villain);m.villain={on:true,intro:s.intro,items:s.items.map((e,ix)=>Object.assign(T(e.name,e.text),{mode:"villain",round:Math.min(3,ix+1)}))};}
  if(sec.regional)m.regional={on:true,text:(sec.regional||[]).join("\n\n")};
  return m;}
// ── Markdown statblock importer (Batch 13) ────────────────────────────────────
// Converts a 5etools-style markdown dump (### Name / *type* / - **AC** … / ability
// table / **Actions** …) into the plain-text shape parse5etools already understands,
// then reuses that parser. One .md file holds many statblocks split by `---`.
function stripMdTokens(s){
  return s
    .replace(/\{@recharge(\s+\d+)?\}/gi,(m,n)=>n?`(Recharge ${n.trim()}–6)`:"(Recharge 5–6)")
    .replace(/\{@[a-z]+\s+([^}|]+?)(?:\|[^}]*)?\}/gi,"$1") // {@creature Foo|src} → Foo
    .replace(/\{@[a-z]+\}/gi,"")
    .replace(/\[Area of Effect\]/gi,"").replace(/\[hover\]/gi,"");
}
function mdBlockToPlain(block){
  block=stripMdTokens(block.replace(/\r/g,""));
  const out=[],ORD=["STR","DEX","CON","INT","WIS","CHA"];let pend=false;
  block.split("\n").forEach(raw=>{
    let l=raw.trim();
    if(!l){out.push("");return;}
    if(l.startsWith("|")){
      const cells=l.split("|").map(c=>c.trim()).filter(c=>c.length);
      if(cells.every(c=>/^:?-+:?$/.test(c)))return;                       // table rule
      if(ORD.every((a,i)=>(cells[i]||"").toUpperCase()===a)){pend=true;return;} // ability header
      if(pend){pend=false;cells.slice(0,6).forEach((c,i)=>{const sm=c.match(/(-?\d+)\s*\(([+-]?\d+)\)/);out.push(ORD[i]);if(sm){out.push(sm[1]);out.push(sm[2]);}else{const n=c.match(/-?\d+/);out.push(n?n[0]:"10");}});return;}
      return;
    }
    if(l.startsWith("#")){out.push(l.replace(/^#+\s*/,""));return;}        // ### Name
    const hd=l.match(/^\*\*([A-Za-z ]+)\*\*$/);if(hd){out.push(hd[1].trim());return;} // **Actions**
    l=l.replace(/^[-]\s+/,"").replace(/\*+/g,"").replace(/\s{2,}/g," ").replace(/\s+([.,;])/g,"$1");
    out.push(l.trim());
  });
  return out.join("\n");
}
function parseStatblockMD(raw,source){
  const chunks=raw.replace(/\r/g,"").split(/^\s*---\s*$/m).filter(c=>/^\s*#{2,3}\s+/m.test(c));
  const out=[];
  chunks.forEach(ch=>{
    let m;try{m=parse5etools(mdBlockToPlain(ch));}catch(e){m=null;}
    if(m&&m.name){m._preset=true;m._source=source;m._kind="statblock";m.chassis=true;m.id="p_"+slug(source)+"_"+slug(m.name);out.push(m);}
  });
  return out;
}
function slug(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}
// Decide what an uploaded .md actually is, so spells/conditions aren't parsed as statblocks.
function detectMdKind(raw){
  if(/-\s*\*\*Casting Time:\*\*/i.test(raw))return "spell";
  if(/^##\s+Conditions\b/mi.test(raw)||/^\*Source:\s*X?PHB/mi.test(raw))return "condition";
  return "statblock";
}
// Spell dump: ### Name / *Level N School* (or *School cantrip*) / - **Casting Time:** … / body.
function parseSpellsMD(raw,source){
  const chunks=stripMdTokens(raw.replace(/\r/g,"")).split(/^\s*---\s*$/m).filter(c=>/^\s*#{2,3}\s+/m.test(c));
  const out=[];
  chunks.forEach(ch=>{
    const lines=ch.split("\n");let i=0,name="",meta="",fields={},body=[];
    for(;i<lines.length;i++){const t=lines[i].trim();if(/^#{2,3}\s+/.test(t)){name=t.replace(/^#+\s*/,"").trim();i++;break;}}
    for(;i<lines.length;i++){const t=lines[i].trim();if(!t)continue;const mm=t.match(/^\*(.+)\*$/);if(mm)meta=mm[1].trim();i++;break;}
    for(;i<lines.length;i++){const t=lines[i].trim();
      const fm=t.match(/^-\s*\*\*([^:*]+):\*\*\s*(.*)$/);
      if(fm){fields[fm[1].trim().toLowerCase()]=fm[2].trim();continue;}
      body.push(t);}
    if(!name)return;
    let level=null,school=meta,mm;
    if(mm=meta.match(/^(.+?)\s+cantrip$/i)){level=0;school=mm[1].trim();}
    else if(mm=meta.match(/^Level\s+(\d+)\s+(.+)$/i)){level=+mm[1];school=mm[2].trim();}
    out.push({id:"sp_"+slug(source)+"_"+slug(name),name,level,school,
      castingTime:fields["casting time"]||"",range:fields["range"]||"",components:fields["components"]||"",duration:fields["duration"]||"",
      text:body.join("\n").replace(/\n{3,}/g,"\n\n").trim(),source,_source:source,_kind:"spell"});
  });
  return out;
}
// Conditions/diseases/status effects. The file lists several sources per name; when an
// X-prefixed source (e.g. XPHB) shares a name with its legacy version (PHB), keep only the
// newer one (Batch 14 note).
function parseConditionsMD(raw,source){
  const lines=stripMdTokens(raw.replace(/\r/g,"")).split("\n");
  const out=[];let category="",cur=null;
  const push=()=>{if(cur&&cur.name){cur.text=cur.body.join("\n").replace(/\n{3,}/g,"\n\n").trim();delete cur.body;out.push(cur);}cur=null;};
  lines.forEach(raw2=>{const l=raw2.replace(/\s+$/,""),t=l.trim();
    if(/^###\s+/.test(t)){push();cur={name:t.replace(/^#+\s*/,"").trim(),category,source:"",body:[]};return;}
    if(/^##\s+/.test(t)){push();category=t.replace(/^#+\s*/,"").trim();return;}
    if(!cur)return;
    const sm=t.match(/^\*Source:\s*(.+?)\*$/i);if(sm){cur.source=sm[1].trim();return;}
    if(/^---$/.test(t))return;
    cur.body.push(l);});
  push();
  const byName={},rank=s=>/^x/i.test(s)?2:1; // prefer XPHB/XDMG over PHB/DMG
  out.forEach(c=>{const k=c.name.toLowerCase(),ex=byName[k];if(!ex||rank(c.source)>rank(ex.source))byName[k]=c;});
  return Object.values(byName).map(c=>Object.assign(c,{id:"cd_"+slug(source)+"_"+slug(c.name),_source:source,_kind:"condition"}));
}

function openImportModal(){
  openModalRaw(`<h3>Paste a 5etools statblock</h3><p class="hint" style="margin:-4px 0 12px">Copy a creature's text from 5e.tools (or an MM'25-style block) and paste it below. Attacks come in as text; review in the Forge, then Save to Bestiary.</p><textarea id="impArea" placeholder="Adult Black Dragon&#10;Huge Dragon (Chromatic), Chaotic Evil&#10;AC 19&#10;HP 195 (17d12 + 85)&#10;..."></textarea><div class="mrow"><button class="btn ghost sm" id="impCancel" style="width:auto">Cancel</button><button class="btn primary sm" id="impGo" style="width:auto">Import → Forge</button></div>`);
  setTimeout(()=>$("#impArea")&&$("#impArea").focus(),50);
  $("#impCancel").addEventListener("click",closeModal);
  $("#impGo").addEventListener("click",()=>{const raw=$("#impArea").value;if(!raw.trim()){toast("Paste a statblock first.");return;}
    let m;try{m=parse5etools(raw);}catch(e){m=null;}
    if(!m||!m.name){toast("Couldn't parse that — is it a 5etools block?");return;}
    closeModal();loadMonster(m);switchView("forge");toast("Imported — review and Save to Bestiary.");});
}

document.addEventListener("click",e=>{
  const k=e.target.closest(".kebab");
  document.querySelectorAll(".menu.open").forEach(mn=>{if(!k||mn.id!=="menu-"+k.dataset.menu)mn.classList.remove("open");});
  if(k){const mn=document.getElementById("menu-"+k.dataset.menu);if(mn){mn.classList.toggle("open");e.stopPropagation();}}
});

function wrapStepper(input,step,min){
  if(!input||input.parentNode.classList.contains("stepper"))return;
  min=(min===undefined?0:min);
  const w=document.createElement("span");w.className="stepper";
  input.parentNode.insertBefore(w,input);w.appendChild(input);
  const b=document.createElement("span");b.className="stepbtns";
  b.innerHTML='<button type="button" data-d="1">▲</button><button type="button" data-d="-1">▼</button>';
  w.appendChild(b);
  b.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    const base=input.value===""?(input.id==="f_init"?initOf(M):0):Number(input.value||0);
    const nv=Math.max(min,base+(+btn.dataset.d)*step);
    input.value=nv;input.dispatchEvent(new Event("input",{bubbles:true}));
  }));
}

(async function init(){
  buildAbilityGrid();
  fillSelect("#f_size",SIZES);
  bindStatic();buildCRStepper();buildLibSelects();
  ["sp_walk","sp_climb","sp_fly","sp_swim","sp_burrow","se_darkvision","se_blindsight","se_tremorsense","se_truesight"].forEach(id=>wrapStepper($("#"+id),5));
  wrapStepper($("#f_ac"),1,0);wrapStepper($("#f_init"),1,-20);
  ABILS.forEach(a=>wrapStepper($("#ab_"+a),1,1));
  loadRefLibs();buildCondDatalist();buildSpellDatalist();
  await loadAll();
  loadMonster(blankMonster());
})();
