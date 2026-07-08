"use strict";
const CR_LIST=["0","1/8","1/4","1/2","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"];
const CR_XP={"0":10,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,"5":1800,"6":2300,"7":2900,"8":3900,"9":5000,"10":5900,"11":7200,"12":8400,"13":10000,"14":11500,"15":13000,"16":15000,"17":18000,"18":20000,"19":22000,"20":25000,"21":33000,"22":41000,"23":50000,"24":62000,"25":75000,"26":90000,"27":105000,"28":120000,"29":135000,"30":155000};
const CR_NUM={"0":0,"1/8":.125,"1/4":.25,"1/2":.5};CR_LIST.forEach(c=>{if(!(c in CR_NUM))CR_NUM[c]=Number(c);});
// MCDM "Flee, Mortals!" Minion Encounter Building table — a minion's XP for encounter budgeting is
// far lower than a standard creature of the same CR (so ~5–10 minions ≈ one standard creature).
const MINION_XP={"0":2,"1/8":5,"1/4":10,"1/2":20,"1":40,"2":90,"3":140,"4":220,"5":225,"6":285,"7":360,"8":485,"9":500,"10":590,"11":720,"12":840,"13":1000,"14":1150,"15":1300,"16":1500,"17":1800,"18":2000,"19":2200,"20":2500,"21":3300,"22":4100,"23":5000,"24":6200,"25":7500,"26":9000,"27":10500,"28":12000,"29":13500,"30":15500};
function pbForCR(cr){const v={"0":2,"1/8":2,"1/4":2,"1/2":2,"1":2,"2":2,"3":2,"4":2,"5":3,"6":3,"7":3,"8":3,"9":4,"10":4,"11":4,"12":4,"13":5,"14":5,"15":5,"16":5,"17":6,"18":6,"19":6,"20":6,"21":7,"22":7,"23":7,"24":7,"25":8,"26":8,"27":8,"28":8,"29":9,"30":9};return v[cr]||2;}
const BOH={"0":[13,3,2,1,9,0],"1/8":[13,9,3,3,10,1],"1/4":[13,15,3,6,10,1],"1/2":[14,24,4,9,11,2],"1":[14,30,4,12,11,2],"2":[14,45,5,18,12,3],"3":[15,60,5,24,12,3],"4":[15,75,6,30,13,4],"5":[15,90,6,36,13,4],"6":[16,105,7,42,14,4],"7":[16,120,7,48,14,4],"8":[16,135,8,54,15,4],"9":[17,150,8,60,15,4],"10":[17,165,9,66,16,5],"11":[17,180,9,72,16,5],"12":[18,195,10,78,17,5],"13":[18,210,10,84,17,5],"14":[18,225,11,90,18,6],"15":[19,240,11,96,18,6],"16":[19,255,12,102,19,6],"17":[19,270,12,108,19,6],"18":[20,285,13,114,20,7],"19":[20,300,13,120,20,7],"20":[20,315,14,126,21,7],"21":[21,350,14,132,21,7],"22":[21,400,15,138,22,8],"23":[21,450,15,144,22,8],"24":[22,500,16,150,23,8],"25":[22,550,16,156,23,8],"26":[22,600,17,162,24,9],"27":[22,650,17,168,24,9],"28":[22,700,18,174,25,9],"29":[22,750,18,180,25,9],"30":[22,800,19,186,26,9]};
// Expected-stats-per-CR table for the CR calculator (T1.1/T1.2) — the CANONICAL envelope of the Q1.A
// hybrid model: 2014 DMG p.274 structure, values recalibrated against the 2024 MM corpus (503 monsters).
// Full derivation, per-CR sample sizes, construction rules, and the raw 2014 table live in
// CR_CALIBRATION.md — read it before retuning any value here. Columns:
// [AC, HP min, HP max, Attack Bonus, DPR min, DPR max, Save DC]. HP/DPR bands tile the number line
// (no gaps/overlaps), mids strictly increasing, so value→CR inverse lookups are unambiguous.
// CR 26–29 are interpolation (no 2024 monsters exist there — low confidence).
// NOTE: BOH above is a separate, older empirical line that still drives the LIVE Forge suggestions;
// it differs from this table by ±1 on most columns (DC by 1–2). Unification is deliberately deferred
// to T1.5's regression run — don't reconcile the two before that, and don't add a third table.
const CR_EXPECT={"0":[12,1,6,2,1,3,11],"1/8":[12,7,11,4,4,5,11],"1/4":[13,12,16,4,6,7,11],"1/2":[13,17,23,4,8,9,11],"1":[13,24,36,4,10,13,12],"2":[13,37,55,5,14,19,12],"3":[14,56,68,5,20,24,13],"4":[15,69,82,5,25,30,13],"5":[15,83,102,7,31,39,14],"6":[15,103,118,7,40,45,14],"7":[16,119,131,7,46,51,15],"8":[16,132,146,7,52,57,15],"9":[18,147,159,9,58,58,16],"10":[18,160,179,9,59,66,17],"11":[18,180,198,10,67,76,17],"12":[18,199,200,10,77,81,17],"13":[18,201,206,10,82,87,17],"14":[18,207,219,10,88,93,18],"15":[18,220,236,11,94,99,18],"16":[19,237,251,12,100,105,19],"17":[19,252,271,12,106,111,20],"18":[20,272,293,13,112,117,20],"19":[20,294,308,14,118,123,20],"20":[20,309,333,15,124,129,21],"21":[21,334,375,15,130,135,22],"22":[21,376,425,16,136,141,23],"23":[21,426,475,16,142,147,23],"24":[22,476,525,17,148,153,24],"25":[22,526,575,17,154,159,24],"26":[22,576,625,17,160,165,25],"27":[22,626,675,17,166,171,25],"28":[22,676,725,18,172,177,26],"29":[22,726,775,18,178,183,26],"30":[22,776,825,19,184,189,27]};
// Accessor over CR_EXPECT: the expected-stats envelope for a CR, with PB folded in and midpoints
// precomputed (hpAvg/dprAvg) for callers that want one number instead of a range. Returns null for an
// unknown CR key rather than guessing.
function crExpected(cr){
  const e=CR_EXPECT[cr];if(!e)return null;
  const [ac,hpMin,hpMax,atk,dprMin,dprMax,dc]=e;
  return {cr,pb:pbForCR(cr),ac,hpMin,hpMax,hpAvg:Math.round((hpMin+hpMax)/2),atk,dprMin,dprMax,dprAvg:Math.round((dprMin+dprMax)/2),dc};
}
const BUDGET={1:[50,75,100],2:[100,150,200],3:[150,225,400],4:[250,375,500],5:[500,750,1100],6:[600,1000,1400],7:[750,1300,1700],8:[1000,1700,2100],9:[1300,2000,2600],10:[1600,2300,3100],11:[1900,2900,4100],12:[2200,3700,4700],13:[2600,4200,5400],14:[2900,4900,6200],15:[3300,5400,7800],16:[3800,6100,9800],17:[4500,7200,11700],18:[5000,8700,14200],19:[5500,10700,17200],20:[6400,13200,22000]};
const SIZES=["Tiny","Small","Medium","Large","Huge","Gargantuan"];
const SKILLS={Acrobatics:"dex",Animal_Handling:"wis",Arcana:"int",Athletics:"str",Deception:"cha",History:"int",Insight:"wis",Intimidation:"cha",Investigation:"int",Medicine:"wis",Nature:"int",Perception:"wis",Performance:"cha",Persuasion:"cha",Religion:"int",Sleight_of_Hand:"dex",Stealth:"dex",Survival:"wis"};
const ABILS=["str","dex","con","int","wis","cha"];
const DMG_TYPES=["Acid","Bludgeoning","Cold","Fire","Force","Lightning","Necrotic","Piercing","Poison","Psychic","Radiant","Slashing","Thunder"];
// ── 5etools JSON code maps (Batch 28 — JSON ingestion) ───────────────────────
const SIZE_CODE={T:"Tiny",S:"Small",M:"Medium",L:"Large",H:"Huge",G:"Gargantuan"};
const SPELL_SCHOOL={A:"Abjuration",C:"Conjuration",D:"Divination",E:"Enchantment",V:"Evocation",I:"Illusion",N:"Necromancy",T:"Transmutation",P:"Psionic"};
// lowercase 5etools skill name (e.g. "animal handling") → SKILLS key ("Animal_Handling")
const SKILL_LOOKUP={};Object.keys(SKILLS).forEach(k=>{SKILL_LOOKUP[k.replace(/_/g," ").toLowerCase()]=k;});
// 5etools alignment arrays → display string. Handles two-axis combos, chance objects,
// the special axis-neutral codes (NX/NY) and the "any" wildcards. Best-effort; leaves
// genuinely unmappable input empty so the field can stay blank.
function alignFromArr(a){
  if(!a||!a.length)return "";
  if(typeof a[0]==="object")a=a[0].alignment||a[0].special&&[]||[]; // chance-weighted → first option
  if(!a.length)return "";
  const M={L:"Lawful",C:"Chaotic",N:"Neutral",G:"Good",E:"Evil",U:"Unaligned",A:"Any",NX:"Neutral",NY:"Neutral"};
  if(a.length===1)return a[0]==="A"?"Any alignment":(M[a[0]]||"");
  if(a.includes("A"))return "Any alignment";
  const words=a.map(x=>M[x]||"").filter(Boolean);
  if(words.every(w=>w==="Neutral"))return "Neutral";
  // collapse a single-axis wildcard like ["L","NX","C","E"] → "Any Evil alignment"
  const moral=a.find(x=>x==="G"||x==="E"),lawc=a.find(x=>x==="L"||x==="C");
  if((a.includes("L")&&a.includes("C"))&&moral)return "Any "+M[moral]+" alignment";
  if((a.includes("G")&&a.includes("E"))&&lawc)return M[lawc]+" any alignment";
  return [...new Set(words)].join(" ");
}
const FACTIONS=["Enemy","Ally","Neutral"];
function migrateFaction(f){return f==="Party"?"Ally":f==="Setting"?"Neutral":(FACTIONS.includes(f)?f:"Enemy");}
function facClass(f){return f==="Ally"?"ally":(f==="Neutral"||f==="Setting")?"setting":"enemy";}
const STATUSES=["Draft","Ready","Archived"]; // bestiary workflow status (Batch 13)
// Encounter lifecycle status (CT6). "completed" is auto-set when a combat ends; "archived" is folded in
// here as a status but still mirrors the existing e.archived flag (so all prior archive behavior holds).
// "active" (CT7) is auto-set while a combat is running; it isn't a manual menu pick (ENC_STATUS_MENU).
const ENC_STATUSES=["draft","ready","active","completed","archived"];
const ENC_STATUS_MENU=["draft","ready","completed","archived"];
const ENC_STATUS_LABEL={draft:"Draft",ready:"Ready",active:"Active",completed:"Completed",archived:"Archived"};
// Crossed-swords icon (user-supplied) — combat nav tab + per-encounter "start combat" button.
const SWORDS_SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="nonzero" d="M7.05 13.406l3.534 3.536-1.413 1.414 1.415 1.415-1.414 1.414-2.475-2.475-2.829 2.829-1.414-1.414 2.829-2.83-2.475-2.474 1.414-1.414 1.414 1.413 1.413-1.414zM3 3l3.546.003 11.817 11.818 1.415-1.414 1.414 1.414-2.474 2.475 2.828 2.829-1.414 1.414-2.829-2.829-2.475 2.475-1.414-1.414 1.414-1.415L3.003 6.531 3 3zm14.457 0L21 3.003l.002 3.523-4.053 4.052-3.536-3.535L17.457 3z"/></svg>';
// Load-from-chassis = clipboard (FA6 solid); Forge new = the hammer (matches the Forge nav tab). CT7.
const CHASSIS_ICON='<svg viewBox="0 0 384 512" aria-hidden="true"><path fill="currentColor" d="M192 0c-41.8 0-77.4 26.7-90.5 64L64 64C28.7 64 0 92.7 0 128L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64l-37.5 0C269.4 26.7 233.8 0 192 0zm0 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM112 192l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>';
const FORGE_ICON='<svg viewBox="0 0 640 640" aria-hidden="true"><path fill="currentColor" d="M246.9 82.3L271 67.8C292.6 54.8 317.3 48 342.5 48C379.3 48 414.7 62.6 440.7 88.7L504.6 152.6C519.6 167.6 528 188 528 209.2L528 240.1L547.7 259.8C563.3 244.2 588.6 244.2 604.3 259.8C620 275.4 619.9 300.7 604.3 316.4L540.3 380.4C524.7 396 499.4 396 483.7 380.4C468 364.8 468.1 339.5 483.7 323.8L464 304L433.1 304C411.9 304 391.5 295.6 376.5 280.6L327.4 231.5C312.4 216.5 304 196.1 304 174.9L304 162.2C304 151 298.1 140.5 288.5 134.8L246.9 109.8C236.5 103.6 236.5 88.6 246.9 82.4zM50.7 466.7L272.8 244.6L363.3 335.1L141.2 557.2C116.2 582.2 75.7 582.2 50.7 557.2C25.7 532.2 25.7 491.7 50.7 466.7z"/></svg>';
const LEGEND_INTRO="Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, [c] can expend a use to take one of the following options. [C] regains all expended uses at the start of each of its turns.";
const LAIR_INTRO="On initiative count 20 (losing initiative ties), [c] takes a lair action to cause one of the following effects; [c] can't use the same effect two rounds in a row:";
const VILLAIN_INTRO="[C] has three villain actions. [C] can take each one once per encounter, immediately after another creature's turn, and must use them in order (Action 1, then 2, then 3).";
// MCDM (Flee Mortals!) minion ruleset — applied as traits when a stat block is flagged a minion.
const MINION_TRAIT_TEXT="If [c] takes damage from an attack or as the result of a failed saving throw, its hit points are reduced to 0. If [c] takes damage from an effect that allows a saving throw, it takes no damage on a success and is reduced to 0 hit points on a failure.";
const MINION_GROUP_TEXT="Minions of the same kind can occupy the same space and act as a group. When several minions in a group make the same attack, resolve it once and total the fixed damage of every minion that hit.";
// CT10 — curated combat-effect library: hand-authored mechanical reminders for effects the parsed reference
// libraries don't describe (the 3 weapon masteries) and for the common combat buffs/debuffs whose full spell
// card is more than you want on a tracker chip. `group` feeds the add-effect dropdown's sections; `text` is the
// chip's definition popover; `adj` (optional) is the state-adjective shown ON the chip (e.g. Haste → "Hasted")
// so a tracked combatant reads as the state it's in — the popover keeps the proper `name`. Standard conditions
// still come from the parsed conditions library (findCondition).
const CURATED_EFFECTS=[
  {name:"Sap",group:"mastery",adj:"Sapped",text:"On a hit, the target has disadvantage on its next attack roll before the start of your next turn."},
  {name:"Slow",group:"mastery",adj:"Slowed",text:"On a hit, reduce the target's speed by 10 feet until the start of your next turn. Once per turn."},
  {name:"Vex",group:"mastery",adj:"Vexed",text:"On a hit, you have advantage on your next attack roll against the target before the end of your next turn."},
  {name:"Bless",group:"spell",adj:"Blessed",text:"+1d4 to the target's attack rolls and saving throws. Concentration, up to 1 minute."},
  {name:"Bane",group:"spell",adj:"Baned",text:"−1d4 to the target's attack rolls and saving throws. Concentration, up to 1 minute."},
  {name:"Haste",group:"spell",adj:"Hasted",text:"+2 AC, advantage on Dexterity saving throws, doubled speed, and one extra limited action each turn. When it ends, the target can't move or take actions until the end of its next turn. Concentration."},
  {name:"Hex",group:"spell",adj:"Hexed",text:"Your attacks deal an extra 1d6 necrotic to the target, and it has disadvantage on ability checks made with one chosen ability. Concentration."},
  {name:"Hunter's Mark",group:"spell",adj:"Marked",text:"Your weapon attacks deal an extra 1d6 damage to the marked target. Concentration."},
  {name:"Faerie Fire",group:"spell",adj:"Outlined",text:"Attack rolls against the target have advantage, and it can't benefit from being Invisible. Concentration, up to 1 minute."},
  {name:"Blur",group:"spell",adj:"Blurred",text:"Attack rolls against the target have disadvantage, unless the attacker doesn't rely on sight. Concentration."},
  {name:"Shield of Faith",group:"spell",adj:"Shielded",text:"+2 AC. Concentration, up to 10 minutes."},
  {name:"Heroism",group:"spell",adj:"Emboldened",text:"Immune to the Frightened condition; gains temporary hit points equal to the caster's spellcasting modifier at the start of each of its turns. Concentration."},
  {name:"Invisibility",group:"spell",adj:"Invisible",text:"The target is Invisible. Attacks against it have disadvantage and its attacks have advantage. Ends if it attacks or casts a spell. Concentration, up to 1 hour."},
  {name:"Hold Person",group:"spell",adj:"Held",text:"The target is Paralyzed. It repeats the Wisdom saving throw at the end of each of its turns, ending the effect on a success. Concentration."},
  {name:"Slow",group:"spell",adj:"Slowed",text:"−2 AC and Dexterity saving throws, no Reactions, and it can take either an action or a Bonus Action on its turn (not both); Speed is halved. It repeats the Wisdom saving throw at the end of each of its turns, ending the effect on itself on a success. Concentration, up to 1 minute."},
  {name:"Guidance",group:"spell",adj:"Guided",text:"+1d4 to one ability check of the target's choice. Concentration. (Cantrip.)"},
  {name:"Resistance",group:"spell",text:"+1d4 to one saving throw of the target's choice. Concentration. (Cantrip.)"},
  {name:"Sanctuary",group:"spell",adj:"Warded",text:"An attacker must succeed on a Wisdom saving throw or choose a new target; ends if the warded creature attacks or casts a spell at an enemy."},
  {name:"Aid",group:"spell",adj:"Aided",text:"The target's hit point maximum and current hit points increase by 5 (or more at higher levels) for 8 hours."}
];
const CURATED_EFFECT_GROUP_LABEL={mastery:"Weapon masteries",spell:"Spell effects"};
// Case-insensitive lookup into the curated library (matches on the bare name, ignoring any "(…)" qualifier).
// `group` disambiguates same-named entries across categories (e.g. the "Slow" weapon mastery vs the "Slow"
// spell — real 5e 2024 name collision, B242): prefer an exact name+group match, else fall back to the first
// name match (legacy conditions saved before the group was tracked).
function findCuratedEffect(name,group){const n=String(name||"").replace(/\([^)]*\)/g,"").trim().toLowerCase();if(!n)return null;
  if(group){const hit=CURATED_EFFECTS.find(e=>e.name.toLowerCase()===n&&e.group===group);if(hit)return hit;}
  return CURATED_EFFECTS.find(e=>e.name.toLowerCase()===n);}
// Gear self-suggestion (B38): manufactured weapons matched against attack names, armor against the AC note.
const GEAR_WEAPONS=["Club","Dagger","Greatclub","Handaxe","Javelin","Light Hammer","Mace","Quarterstaff","Sickle","Spear","Dart","Light Crossbow","Shortbow","Sling","Battleaxe","Flail","Glaive","Greataxe","Greatsword","Halberd","Lance","Longsword","Maul","Morningstar","Pike","Rapier","Scimitar","Shortsword","Trident","War Pick","Warhammer","Whip","Blowgun","Hand Crossbow","Heavy Crossbow","Longbow","Net","Musket","Pistol","Scythe","Crossbow"];
const GEAR_ARMOR=["Padded Armor","Studded Leather Armor","Leather Armor","Hide Armor","Chain Shirt","Scale Mail","Breastplate","Half Plate Armor","Ring Mail","Chain Mail","Splint Armor","Plate Armor","Shield"];
// Official 2024 tool proficiencies (B39).
const TOOLS=["Alchemist's Supplies","Brewer's Supplies","Calligrapher's Supplies","Carpenter's Tools","Cartographer's Tools","Cobbler's Tools","Cook's Utensils","Glassblower's Tools","Jeweler's Tools","Leatherworker's Tools","Mason's Tools","Painter's Supplies","Potter's Tools","Smith's Tools","Tinker's Tools","Weaver's Tools","Woodcarver's Tools","Disguise Kit","Forgery Kit","Gaming Set","Herbalism Kit","Musical Instrument","Navigator's Tools","Poisoner's Kit","Thieves' Tools"];
// Ability used for each tool's checks (XPHB 2024 ch.6) — drives the rollable tool modifier.
const TOOL_ABIL={"Alchemist's Supplies":"int","Brewer's Supplies":"int","Calligrapher's Supplies":"dex","Carpenter's Tools":"str","Cartographer's Tools":"wis","Cobbler's Tools":"dex","Cook's Utensils":"wis","Glassblower's Tools":"int","Jeweler's Tools":"int","Leatherworker's Tools":"dex","Mason's Tools":"str","Painter's Supplies":"wis","Potter's Tools":"int","Smith's Tools":"str","Tinker's Tools":"dex","Weaver's Tools":"dex","Woodcarver's Tools":"dex","Disguise Kit":"cha","Forgery Kit":"dex","Gaming Set":"wis","Herbalism Kit":"int","Musical Instrument":"cha","Navigator's Tools":"wis","Poisoner's Kit":"int","Thieves' Tools":"dex"};
// Recharge / per-day frequency tags appended to an action/BA/reaction title (B39).
const FREQ_TAGS=["(Recharge 5–6)","(Recharge 6)","(1/Day)","(2/Day)","(3/Day)"];

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
// Canonical 2024-style wording, genericised with bracket shortcuts: [C]/[c]/[s]
// reference tokens, [ABIL SAVE]/[ABIL ATK] (or bare [SAVE]/[ATK] = highest stat) and
// dice averages like [2d6]. These stay LIVE in the entry text and expand at render
// (applyRefsFor) so they retune to the creature's CR/abilities when reskinned.
// Inserted via the per-section "From library" dropdowns or by typing a known name.
const TRAIT_SNIPS={
  "Aggressive":"As a Bonus Action, [c] moves up to its Speed toward an enemy it can see.",
  "Amorphous":"[C] can move through a space as narrow as 1 inch without expending extra movement to do so.",
  "Amphibious":"[C] can breathe air and water.",
  "Beast Whisperer":"[C] can communicate with Beasts as if they shared a language.",
  "Brave":"[C] has Advantage on saving throws against being Frightened.",
  "Charge":"If [c] moves at least 20 feet straight toward a target and then hits it with a melee attack on the same turn, the target takes an extra [2d6] damage of the attack's type.",
  "Death Burst":"[C] explodes when it dies. Dexterity Saving Throw: [DEX SAVE], each creature in a 5-foot Emanation originating from [c]. Failure: [2d4] damage. Success: Half damage.",
  "Devil's Sight":"Magical Darkness doesn't impede [c]'s Darkvision.",
  "Echolocation":"[C] can't use [c]'s Blindsight while it has the Deafened condition.",
  "False Appearance":"While [c] remains motionless, it is indistinguishable from an ordinary object.",
  "Flyby":"[C] doesn't provoke an Opportunity Attack when it flies out of an enemy's reach.",
  "Hold Breath":"[C] can hold its breath for 1 hour.",
  "Incorporeal Movement":"[C] can move through other creatures and objects as if they were Difficult Terrain. [C] takes [1d10] Force damage if it ends its turn inside an object.",
  "Keen Hearing and Sight":"[C] has Advantage on Wisdom (Perception) checks that rely on hearing or sight.",
  "Keen Senses":"[C] has Advantage on Wisdom (Perception) checks that rely on hearing, sight, or smell.",
  "Keen Smell":"[C] has Advantage on Wisdom (Perception) checks that rely on smell.",
  "Legendary Resistance (3/Day)":"If [c] fails a saving throw, it can choose to succeed instead.",
  "Magic Resistance":"[C] has Advantage on saving throws against spells and other magical effects.",
  "Nimble Escape":"[C] takes the Disengage or Hide action.",
  "Pack Tactics":"[C] has Advantage on an attack roll against a creature if at least one of [c]'s allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.",
  "Pounce":"If [c] moves at least 20 feet straight toward a creature and then hits it with a melee attack on the same turn, the target must succeed on a [STR SAVE] Strength saving throw or have the Prone condition. If the target is Prone, [c] can make one melee attack against it as a Bonus Action.",
  "Reckless":"At the start of its turn, [c] can gain Advantage on melee attack rolls during that turn, but attack rolls against it have Advantage until the start of its next turn.",
  "Regeneration":"[C] regains 10 Hit Points at the start of each of its turns. If [c] takes Acid or Fire damage, this trait doesn't function on [c]'s next turn. [C] dies only if it starts its turn with 0 Hit Points and doesn't regenerate.",
  "Rejuvenation":"If [c] is destroyed, it gains a new body in 1d10 days, regaining all its Hit Points and becoming active again. The new body appears within [c]'s lair.",
  "Relentless":"If [c] takes damage that would reduce it to 0 Hit Points, it drops to 1 Hit Point instead (recharges after a Short or Long Rest).",
  "Shapechanger":"[C] can shape-shift into a Beast or Humanoid, or back into its true form, as a Bonus Action. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
  "Siege Monster":"[C] deals double damage to objects and structures.",
  "Sneak Attack":"Once per turn, [c] deals an extra [2d6] damage to a creature it hits with an attack roll if [c] has Advantage on the roll, or if another enemy of the target is within 5 feet of it, that enemy doesn't have the Incapacitated condition, and [c] doesn't have Disadvantage on the roll.",
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
  "Frightful Presence":"Each creature of [c]'s choice within 120 feet of [c] and aware of it must succeed on a [WIS SAVE] Wisdom saving throw or have the Frightened condition for 1 minute. A Frightened creature repeats the save at the end of each of its turns, ending the effect on itself on a success.",
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
// Generic, reskinnable presets in the same [C]/[c]/[SAVE] bracket-shortcut style as the trait library.
const LEGEND_SNIPS={
  "Attack":"[C] makes one attack.",
  "Move":"[C] moves up to its Speed without provoking Opportunity Attacks.",
  "Cantrip":"[C] casts one of its cantrips.",
  "Detect":"[C] makes a Wisdom (Perception) check.",
  "Teleport":"[C] teleports, along with any equipment it is wearing or carrying, up to 30 feet to an unoccupied space it can see.",
  "Frightening Gaze":"[C] targets one creature it can see within 30 feet. The target makes a [WIS SAVE] Wisdom saving throw or has the Frightened condition until the end of [c]'s next turn.",
  "Tail Swipe":"[C] makes one melee attack with its tail against a creature within reach.",
  "Wing Attack (Costs 2 Uses)":"[C] beats its wings. Each creature within 10 feet of [c] makes a [DEX SAVE] Dexterity saving throw, taking [4d6] Bludgeoning damage on a failed save, or half as much on a success. [C] can then fly up to half its Speed.",
  "Drain (Costs 2 Uses)":"One creature within 30 feet of [c] makes a [CON SAVE] Constitution saving throw, taking [4d6] Necrotic damage on a failed save, or half as much on a success.",
  "Summon (Costs 2 Uses)":"[C] summons one ally of challenge rating 2 or lower in an unoccupied space within 30 feet; it acts on [c]'s initiative.",
};
const VILLAIN_SNIPS={
  "Reposition":"[C] and each ally within 30 feet of it can move up to their Speed without provoking Opportunity Attacks.",
  "Signature Strike":"[C] makes one attack against each creature of its choice that it can reach.",
  "Area Assault":"Each creature in a 20-foot-radius Sphere centered on a point [c] can see within 60 feet makes a [DEX SAVE] Dexterity saving throw, taking [6d6] damage on a failed save, or half as much on a success.",
  "Rallying Command":"Each ally within 30 feet of [c] can immediately use its Reaction to make one attack.",
  "Desperate Gambit":"[C] takes the Dodge action and regains [4d10] Hit Points. Until the start of its next turn, the first attack roll against [c] each turn has Disadvantage.",
  "Mass Debilitation":"Each enemy within 30 feet of [c] makes a [CON SAVE] Constitution saving throw or has the Frightened condition until the end of [c]'s next turn.",
};
const LAIR_SNIPS={
  "Grasping Terrain":"The ground in a 20-foot-radius area [c] can see becomes Difficult Terrain until the next lair action. Each creature there makes a [STR SAVE] Strength saving throw or has the Restrained condition until the next lair action.",
  "Eruption":"[C] targets a point it can see within 60 feet. Each creature within a 5-foot radius makes a [DEX SAVE] Dexterity saving throw, taking [2d10] damage on a failed save, or half as much on a success.",
  "Obscuring Veil":"A 20-foot-radius Sphere of magical mist appears within 120 feet of [c], Heavily Obscuring its area until the next lair action.",
  "Hazardous Ground":"A 15-foot-radius area [c] can see becomes hazardous until the next lair action. A creature that enters it for the first time on a turn or starts its turn there makes a [CON SAVE] Constitution saving throw, taking [2d6] damage on a failure.",
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
