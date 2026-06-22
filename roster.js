// Monster Forge — ROSTER: the shared player-character store (state.roster), the PC field/ability
// model, the party row, and the character-detail modal. Split out of adventures.js (B199).
// Loaded as a classic <script> sharing ONE global scope (after adventures.js, before combat.js). No imports.
// ── Party roster v2 (B136) ───────────────────────────────────────────────────
// A player character lives ONCE in the shared roster (state.roster); each adventure's `a.party` is an
// ORDERED list of roster ids. Membership IS the adventure tag — `rosterAdventures(rid)` derives which
// adventures a character is in. Editing a character changes it in every adventure (live shared). "Unsync"
// forks a separate roster entry tagged only with the current adventure. Fields are TYPED: a standard key
// (ac/hp/init/…) carrying its canonical label + icon, or a custom label. Defaults are AC + HP (removable).
const PC_AC_ICON='<svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.5 31 38.4 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.4-57.2L242.6 2.9C246.8 1 251.4 0 256 0z"/></svg>';
const PC_HP_ICON='<svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/></svg>';
// Standard typed fields (B137): a key carrying its canonical label + (AC/HP) icon or short label. Spell
// attack / save DC are NO LONGER standalone — they're DERIVED from whichever ability is flagged the spell
// ability + the Level (proficiency). Abilities carry `abil:true` so they can be grouped + flagged.
const PC_FIELDS=[
  {k:"ac",label:"AC",icon:PC_AC_ICON},{k:"hp",label:"HP",icon:PC_HP_ICON},
  {k:"init",label:"Initiative",short:"init",mod:true},{k:"level",label:"Level",short:"lvl"},{k:"player",label:"Player",short:"player"},
  {k:"prof",label:"Proficiency",short:"prof",mod:true},{k:"speed",label:"Speed",short:"spd"},{k:"senses",label:"Senses",short:"senses"},
  {k:"str",label:"Strength",short:"STR",abil:true},{k:"dex",label:"Dexterity",short:"DEX",abil:true},{k:"con",label:"Constitution",short:"CON",abil:true},
  {k:"int",label:"Intelligence",short:"INT",abil:true},{k:"wis",label:"Wisdom",short:"WIS",abil:true},{k:"cha",label:"Charisma",short:"CHA",abil:true}];
const PC_FIELD={};PC_FIELDS.forEach(f=>{PC_FIELD[f.k]=f;});
const PC_ABILS=["str","dex","con","int","wis","cha"];
const PC_LEGACY={dc:"Spell save DC",spellatk:"Spell attack"}; // dropped standard keys → label fallback only
const D5_CLASSES=["Artificer","Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"];
function rosterById(id){return state.roster.find(r=>r.id===id)||null;}
// Property template (B153): a saved set of properties new characters start from. Stored locally (a UI
// preference, not roster data). `buildPcTemplate` keeps each field's structure + flags + preset entries but
// clears the instance-specific scalar values and ATK/DC overrides.
function buildPcTemplate(c){return (c&&c.fields||[]).map(f=>{const t=JSON.parse(JSON.stringify(f));if(!Array.isArray(t.v)&&!(t.v&&typeof t.v==="object"))t.v="";t.atkV="";t.dcV="";return t;});}
function savePcTemplate(c){try{localStorage.setItem("mf_pc_template",JSON.stringify(buildPcTemplate(c)));}catch(e){}}
function loadPcTemplate(){try{const s=localStorage.getItem("mf_pc_template");if(s){const f=JSON.parse(s);if(Array.isArray(f)&&f.length)return JSON.parse(JSON.stringify(f));}}catch(e){}return null;}
// A character's class — the standard `class` field, or a legacy custom field labelled "Class".
// Class is a chipfield now (array of class names; multiple = multiclass). These tolerate legacy scalar
// values and the legacy custom "Class" field so they work before/after migration.
function classField(c){return (c&&c.fields||[]).find(x=>x.k==="class"||(!x.k&&(x.label||"").toLowerCase()==="class"));}
function classList(c){const f=classField(c);if(!f)return [];return Array.isArray(f.v)?f.v.filter(Boolean):(f.v?[String(f.v)]:[]);}
function charClass(c){return classList(c)[0]||"";}   // first class — the party row shows this one
function charClasses(c){return classList(c);}         // all classes — the combat preview appends these
function newRosterChar(name){return {id:uid(),name:name||"",notes:"",fields:loadPcTemplate()||[{k:"level",v:""},{k:"class",v:[]},{k:"ac",v:""},{k:"hp",v:""},{k:"speed",v:""}]};}
// Ability helpers that tolerate a missing field (ability grid is always shown; fields are created lazily).
function abilFieldOf(c,k){return (c.fields||[]).find(f=>f.k===k)||null;}
function abilScoreOf(c,k){const f=abilFieldOf(c,k);return f?abilScore(f):10;}
function hasAbilScores(c){return PC_ABILS.some(k=>{const f=abilFieldOf(c,k);return f&&f.v!==""&&f.v!=null;});}
function ensureAbilField(c,k){let f=abilFieldOf(c,k);if(!f){f={k,v:"",hide:true};c.fields.push(f);}return f;}
// The prevailing party level — the first member with a set Level, else 1 (B145: new-member level default).
function partyDefaultLevel(advId){const a=state.adv.find(x=>x.id===advId);if(a)for(const rid of (a.party||[])){const v=charFieldVal(rosterById(rid),"level");if(v!==""&&v!=null)return clamp(Number(v)||1,1,20);}return 1;}
// The level shown for a character's row — its set Level, or the party default when unset.
function rowLevel(c,advId){const v=charFieldVal(c,"level");return (v!==""&&v!=null)?clamp(Number(v)||1,1,20):partyDefaultLevel(advId);}
const ARROW_TREND_UP='<svg viewBox="0 0 576 512" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M384 160c-17.7 0-32-14.3-32-32s14.3-32 32-32l160 0c17.7 0 32 14.3 32 32l0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-82.7L342.6 374.6c-12.5 12.5-32.8 12.5-45.3 0L192 269.3 54.6 406.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160c12.5-12.5 32.8-12.5 45.3 0L320 306.7 466.7 160 384 160z"/></svg>';
const SAVE_TPL_ICON='<svg viewBox="0 0 384 512" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M0 48C0 21.5 21.5 0 48 0L336 0c26.5 0 48 21.5 48 48l0 426.7c0 20.6-23.5 32.4-40 20l-152-114-152 114c-16.5 12.4-40 .6-40-20L0 48z"/></svg>';
// Level up every party member by one (capped at 20), then scroll each row's level number from current to
// next (a single deterministic step, not the random init spin) before re-rendering (B147).
function levelUpParty(a){const box=$("#partyWrap"),inputs=box?[...box.querySelectorAll("[data-pclvl]")]:[],moves=[];
  // Snapshot the displayed levels BEFORE mutating — otherwise an unset member would inherit a member we just
  // bumped (partyDefaultLevel shifts mid-loop).
  const snap=(a.party||[]).map(rid=>{const c=rosterById(rid);return c?rowLevel(c,a.id):null;});
  (a.party||[]).forEach((rid,i)=>{const c=rosterById(rid),from=snap[i];if(!c||from==null||from>=20)return;const to=from+1;
    let f=(c.fields||[]).find(x=>x.k==="level");if(!f){f={k:"level",v:""};c.fields.unshift(f);}f.v=String(to);
    moves.push({inp:inputs.find(el=>el.dataset.pclvl===rid),from,to});});
  // Level-up recomputes party budgets so it must re-render the whole detail (renderAdvDetail), but that
  // rebuilds .adv-detail-body and would jump scroll to the top — preserveScroll keeps the position.
  if(!moves.length)return;saveRoster();animateLevelUp(moves,()=>preserveScroll(".adv-detail-body",renderAdvDetail));}
function nfStepHTML(from,to){return `<span class="nf-digit"><span class="nf-col"><span class="nf-n">${from}</span><span class="nf-n">${to}</span></span></span>`;}
function animateLevelUp(moves,done){const ovs=[];
  moves.forEach(({inp,from,to})=>{if(!inp)return;const r=inp.getBoundingClientRect();
    const ov=document.createElement("div");ov.className="nf-roll pc-lvl-roll";
    ov.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;font-size:${getComputedStyle(inp).fontSize}`;
    ov.innerHTML=nfStepHTML(from,to);document.body.appendChild(ov);ovs.push(ov);inp.style.color="transparent";
    requestAnimationFrame(()=>{const col=ov.querySelector(".nf-col");if(col)col.style.transform="translateY(-1em)";});});
  if(!ovs.length){done();return;}setTimeout(()=>{ovs.forEach(o=>o.remove());done();},620);}
// Dimmed default shown as a field's placeholder (empty value falls back to it): speed 30 ft.; level = the
// party's level; init = DEX mod and passive perception = 10 + WIS mod once any ability score is filled.
function fieldDefault(c,f,advId){switch(f.k){
  case "speed":return "30 ft.";
  case "senses":return "Darkvision 60 ft.";
  case "level":return String(partyDefaultLevel(advId));
  case "init":return hasAbilScores(c)?sgn(abilMod(abilScoreOf(c,"dex"))):"";
  case "pp":return hasAbilScores(c)?String(10+abilMod(abilScoreOf(c,"wis"))):"";
  default:return "";}}
// Effective initiative modifier for combat — the set value, else the DEX-mod default when abilities exist.
function effInit(c){const v=charFieldVal(c,"init");if(v!==""&&v!=null)return Number(v)||0;return hasAbilScores(c)?abilMod(abilScoreOf(c,"dex")):0;}
function normalizeRosterPC(p){p=p||{};return {id:p.id||uid(),name:p.name||"",notes:p.notes||"",
  // Drop the retired Passive Perception field (the standard `pp` key + the legacy custom field) — the
  // Passive skills preset covers it now.
  fields:(Array.isArray(p.fields)?p.fields:[{k:"ac",v:""},{k:"hp",v:""}])
    .filter(f=>f&&f.k!=="pp"&&!(!f.k&&/^passive perception$/i.test((f.label||"").trim())))
    .map(f=>{
      let k=f.k||"",label=f.label||"";
      // Legacy custom "Class"/"Subclass" fields fold into the new class/subclass chipfield presets.
      if(!k&&/^class$/i.test(label.trim())){k="class";label="";}
      if(!k&&/^subclass$/i.test(label.trim())){k="subclass";label="";}
      let v;
      if(k==="class"||k==="subclass")v=Array.isArray(f.v)?f.v.filter(Boolean):(f.v?[String(f.v)]:[]);
      // Legacy B149 "senses" preset (an object) collapses to the plain text field it became in B152.
      else if(k==="senses"&&f.v&&typeof f.v==="object"&&!Array.isArray(f.v))v=f.v.dv||"";
      else v=f.v??"";
      return {k,label,v,hide:!!f.hide,main:!!(f.main||f.atk||f.dc||f.spell),prof:!!f.prof,atkV:f.atkV??"",dcV:f.dcV??""};
    })};}
function charFieldVal(c,key){const f=c&&(c.fields||[]).find(x=>x.k===key);return f?f.v:undefined;}
function fieldDef(f){return f.k&&PC_FIELD[f.k]?PC_FIELD[f.k]:null;}
function fieldLabel(f){const d=fieldDef(f);if(d)return d.label;const pp=PC_PRESETS.find(p=>p.k===f.k);if(pp)return pp.label;return (f.k&&PC_LEGACY[f.k])||f.label||"Field";}
function pbForLevel(lv){lv=clamp(Number(lv)||1,1,20);return 2+Math.floor((lv-1)/4);}
function abilMod(score){const n=Number(score);return isNaN(n)?0:Math.floor((n-10)/2);}
// Per-ability derived spell ATK / save DC (B138): any ability field can flag `atk` and/or `dc` via the
// toggles next to its value. Each derives from the ability modifier + proficiency (DC also +8), with an
// optional manual override (atkV/dcV) — an empty override falls back to the computed value.
// An unset ability defaults to 10 (its placeholder) so the modifier reads +0, not −5 (B140).
function abilScore(f){return (f.v===""||f.v==null)?10:(Number(f.v)||0);}
function abilSave(c,f){return abilMod(abilScore(f))+(f.prof?pbForLevel(charFieldVal(c,"level")):0);}
function abilDerived(c,f){const m=abilMod(abilScore(f)),pb=pbForLevel(charFieldVal(c,"level"));return {atk:m+pb,dc:8+m+pb};}
function effAtk(c,f){const d=abilDerived(c,f);return (f.atkV!==""&&f.atkV!=null)?(Number(f.atkV)||0):d.atk;}
function effDc(c,f){const d=abilDerived(c,f);return (f.dcV!==""&&f.dcV!=null)?(Number(f.dcV)||0):d.dc;}
// A "main" ability (B139) derives BOTH the spell ATK and the save DC chip; multiple abilities can be main.
function charDerivedChips(c){const out=[];(c.fields||[]).forEach(f=>{const d=fieldDef(f);if(!d||!d.abil||!f.main)return;
  out.push({kind:"atk",v:effAtk(c,f)});out.push({kind:"dc",v:effDc(c,f)});});return out;}
// Never a party-row chip: hidden fields, initiative (combat rolls it) and abilities (they live in the grid;
// the row instead shows their derived ATK/DC chips when flagged main).
function chipHidden(f){const d=PC_FIELD[f.k];return !!f.hide||f.k==="init"||f.k==="level"||!!(d&&d.abil);}
// Chip-field presets offered in the Add-a-property menu — each holds an ARRAY of entries rendered as chips
// you click to cycle (B148). `newPresetField` builds the empty field; `isPreset` detects one.
const PC_PRESETS=[{k:"class",label:"Class"},{k:"subclass",label:"Subclass"},{k:"dmgmod",label:"Damage Modifiers"},{k:"skills",label:"Skills & expertise"},{k:"passives",label:"Passive skills"}];
// A plain (non-cycling) chip for string chipfields like Class / Subclass — name + delete only.
function plainChipHTML(name,j){return `<button class="pchip">${esc(String(name))}<span class="pchip-x" data-cdchipdel="${j}">×</span></button>`;}
function newPresetField(k){const p=PC_PRESETS.find(x=>x.k===k);return {k,label:p?p.label:k,v:k==="passives"?["Perception","Insight","Investigation"]:[]};}
function isPreset(f){return PC_PRESETS.some(p=>p.k===f.k);}
// Passive score = 10 + the skill's ability mod, + proficiency taken FROM the Skills preset if that skill is
// listed there (B152). `charSkillProf` returns the expertise multiplier (1 prof / 2 expertise / 0 none).
function charSkillProf(c,name){const sf=(c&&c.fields||[]).find(f=>f.k==="skills");if(!sf||!Array.isArray(sf.v))return 0;const e=sf.v.find(x=>x.s===name);return e?(Number(e.e)||1):0;}
function passiveVal(c,name){return 10+abilMod(abilScoreOf(c,SKILLS[name]||"wis"))+pbForLevel(charFieldVal(c,"level"))*charSkillProf(c,name);}
function passiveChipHTML(c,name,j){const ab=SKILLS[name]||"wis",prof=charSkillProf(c,name)>0;return `<button class="pchip skchip cc-ab-${ab}${prof?" exp":""}" title="Passive ${name}${prof?" (proficient via Skills)":""}"><span class="pchip-n">${passiveVal(c,name)}</span> ${name}<span class="pchip-x" data-cdchipdel="${j}">×</span></button>`;}
// Damage modifier chip: ½× resistance (default) → 0× immunity → 2× vulnerability, cycling on click.
const DMG_MULT={res:"½×",imm:"0×",vuln:"2×"},DMG_CYCLE={res:"imm",imm:"vuln",vuln:"res"};
function dmgChipHTML(e,j){const m=e.m||"res";return `<button class="pchip dchip-${m}" data-cdcycle="${j}" title="Click to change resistance / immunity / vulnerability"><span class="pchip-n">${DMG_MULT[m]}</span> ${esc(e.t)}<span class="pchip-x" data-cdchipdel="${j}">×</span></button>`;}
// Skill chip: signed bonus = the skill's ability mod + proficiency (×2 for expertise), coloured by ability.
function skillBonus(c,e){const ab=SKILLS[e.s]||"int";return abilMod(abilScoreOf(c,ab))+pbForLevel(charFieldVal(c,"level"))*(Number(e.e)||1);}
function skillChipHTML(c,e,j){const ab=SKILLS[e.s]||"int",exp=(Number(e.e)||1)>=2;return `<button class="pchip skchip cc-ab-${ab}${exp?" exp":""}" data-cdcycle="${j}" title="Click: proficient ↔ expertise"><span class="pchip-n">${sgn(skillBonus(c,e))}</span> ${esc(e.s.replace(/_/g," "))}<span class="pchip-x" data-cdchipdel="${j}">×</span></button>`;}
// The adventures a roster character is in (membership = the ordered id lists in each a.party).
function rosterAdventures(rid){return state.adv.filter(a=>(a.party||[]).includes(rid));}
function addPartyMember(a){const c=newRosterChar("");state.roster.push(c);a.party.push(c.id);saveRoster();saveAdv();renderAdvDetail();openCharacterDetail(c.id,a.id);}
function removePartyMember(a,rid){a.party=a.party.filter(x=>x!==rid);saveAdv();renderAdvDetail();}
function addExistingToParty(a,rid){if(!a.party.includes(rid)){a.party.push(rid);saveAdv();renderAdvDetail();}}
// Unsync: fork a SEPARATE roster entry (a copy) tagged only with the current adventure; the original keeps
// its other adventures. The current adventure's slot now points at the copy.
function unsyncPartyMember(a,rid){const c=rosterById(rid);if(!c)return;const copy=normalizeRosterPC(JSON.parse(JSON.stringify(c)));copy.id=uid();
  state.roster.push(copy);const i=a.party.indexOf(rid);if(i>=0)a.party[i]=copy.id;saveRoster();saveAdv();renderAdvDetail();toast("Unsynced — a separate copy for this adventure.");}
const GRIP_SVG='<svg viewBox="0 0 8 14" width="8" height="13" aria-hidden="true"><g fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></g></svg>';
let _cdDragIdx=null,_cdDrop=null;
// Whether a field renders in the detail's "hidden from the party row" group (Level is always shown; init +
// hidden-flagged fields are hidden; abilities aren't rows at all). Used for grouping and drag group-moves.
function cdRowHidden(f){return chipHidden(f)&&f.k!=="level";}
// Drag-reorder a property (B143b): move field `fromIdx` next to `toIdx` (or, for a divider drop, into the
// hidden group at the end). Dropping onto a row also joins that row's group (sets `hide`), except for the
// fixed-group standard fields (init always hidden, Level always shown).
function reorderField(c,fromIdx,toIdx,after,intoHidden){
  const fields=c.fields||[],moved=fields[fromIdx];if(!moved)return;
  const target=toIdx!=null?fields[toIdx]:null;
  let hide=null;if(intoHidden!=null)hide=intoHidden;else if(target)hide=cdRowHidden(target);
  if(hide!=null&&moved.k!=="init"&&moved.k!=="level")moved.hide=hide;
  const fi=fields.indexOf(moved);if(fi>=0)fields.splice(fi,1);
  if(target){let ti=fields.indexOf(target);if(ti<0)ti=fields.length;fields.splice(after?ti+1:ti,0,moved);}
  else fields.push(moved);
  saveRoster();
}
// A character is "blank" when nothing has been filled in — no name, no notes, no field values (B140):
// deleting it needs no confirmation prompt.
function charIsBlank(c){return !c||(!(c.name||"").trim()&&!(c.notes||"").trim()&&!(c.fields||[]).some(fieldHasVal));}
// A field "has a value": non-empty scalar, non-empty chip array, or non-empty object.
function fieldHasVal(f){const v=f&&f.v;return Array.isArray(v)?v.length>0:(v&&typeof v==="object")?Object.keys(v).length>0:String(v??"").trim()!=="";}
// Delete a character everywhere: drop it from the roster and from every adventure's party.
function deleteRosterChar(rid){state.roster=state.roster.filter(r=>r.id!==rid);state.adv.forEach(a=>{if(a.party)a.party=a.party.filter(x=>x!==rid);});saveRoster();saveAdv();}
function pcChipHTML(rid,f){const d=fieldDef(f);const lbl=d&&d.icon?d.icon:`<span class="pc-cl">${esc((d&&d.short)||fieldLabel(f))}</span>`;
  return `<button class="pc-chip" data-pcchip="${rid}:${f.k||""}" title="${esc(fieldLabel(f))}">${lbl}${esc(String(f.v))}</button>`;}
function renderParty(a){
  const box=$("#partyWrap");if(!box)return;
  const rows=(a.party||[]).map(rid=>{const c=rosterById(rid);if(!c)return "";
    const lv=charFieldVal(c,"level"),lvSet=lv!==""&&lv!=null,cls=charClass(c);
    const stdChips=(c.fields||[]).filter(f=>!chipHidden(f)&&f.k!=="class"&&f.k&&PC_FIELD[f.k]&&f.v!==""&&f.v!=null).map(f=>pcChipHTML(rid,f));
    const derChips=charDerivedChips(c).map(x=>x.kind==="atk"
      ?`<span class="pc-dchip"><span class="pc-cl">atk</span>${sgn(x.v)}</span>`
      :`<span class="pc-dchip dc"><span class="pc-cl">DC</span>${x.v}</span>`);
    // DOM order AC…DC; `.pc-chips` is row-reverse so AC sits rightmost (always visible) and extra chips
    // overflow toward the name, faded only when they actually overflow (B169 — see renderParty's rAF).
    const allChips=[...stdChips,...derChips].join("");
    return `<div class="pc-row" data-pcopen="${rid}">
      <span class="pc-lvl-wrap"><span class="pc-lv-cap">LV</span><input class="pc-lvl-in${lvSet?"":" dim"}" type="number" min="1" max="20" data-pclvl="${rid}" value="${lvSet?esc(String(lv)):""}" placeholder="${partyDefaultLevel(a.id)}" title="Level — click to edit"></span>
      <span class="pc-name"><span class="pc-nm">${esc(c.name)||'<span class="pc-unnamed">New character</span>'}</span>${cls?`<span class="pc-cls">${esc(cls)}</span>`:""}</span>
      <span class="pc-chips">${allChips}</span>
      <button class="pc-x" data-pcremove="${rid}" aria-label="Remove from this adventure" title="Remove from this adventure">✕</button>
    </div>`;}).join("");
  box.innerHTML=`${rows||`<div class="hint" style="margin:2px 0 6px">No player characters yet. Add them so they roll into the initiative order when you run a combat.</div>`}
    <div class="pc-addrow"><button class="addbtn" id="addPC" style="flex:1">＋ Add character</button>
      <div class="pc-roster"><input class="pc-roster-in" id="rosterIn" placeholder="Roster…" autocomplete="off"><div class="pc-roster-dd" hidden></div></div>
    </div>`;
  $("#addPC").addEventListener("click",()=>addPartyMember(a));
  bindRosterCombo(a,box);
  box.querySelectorAll(".pc-row").forEach(row=>row.addEventListener("click",e=>{if(e.target.closest(".pc-chip,.pc-dchip,[data-pcremove],[data-pclvl]"))return;openCharacterDetail(row.dataset.pcopen,a.id);}));
  box.querySelectorAll("[data-pclvl]").forEach(el=>{el.addEventListener("click",e=>e.stopPropagation());
    el.addEventListener("change",e=>{e.stopPropagation();const c=rosterById(el.dataset.pclvl);if(!c)return;let f=(c.fields||[]).find(x=>x.k==="level");if(!f){f={k:"level",v:""};c.fields.unshift(f);}f.v=el.value;saveRoster();renderAdvDetail();});});
  box.querySelectorAll("[data-pcchip]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const[rid,k]=el.dataset.pcchip.split(":");openPCFieldEdit(rid,k,el);}));
  box.querySelectorAll("[data-pcremove]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();removePartyMember(a,el.dataset.pcremove);}));
  // Fade the chip cluster toward the name ONLY when it actually overflows (B169).
  requestAnimationFrame(()=>box.querySelectorAll(".pc-chips").forEach(el=>el.classList.toggle("ov",el.scrollWidth>el.clientWidth+1)));
}
// Roster combo (B137): the "Roster" control is a fillable field that drops a dropdown of every character
// grouped by adventure (like the combat add-effect). Click a row to ADD that character to this adventure's
// party; click the hover-revealed ⋯ to open its detail. Typing filters.
function bindRosterCombo(a,box){
  const inp=box.querySelector("#rosterIn"),dd=box.querySelector(".pc-roster-dd");if(!inp||!dd)return;
  const draw=()=>{const q=inp.value.trim().toLowerCase();
    const groups=state.adv.map(ad=>[advDName(ad),(ad.party||[])]).concat([["Not in any adventure",state.roster.filter(r=>!state.adv.some(x=>(x.party||[]).includes(r.id))).map(r=>r.id)]]);
    let html="";groups.forEach(([title,ids])=>{const rows=ids.map(id=>rosterById(id)).filter(c=>c&&(!q||(c.name||"").toLowerCase().includes(q))).map(c=>
      `<div class="rr${a.party.includes(c.id)?" in":""}" data-rid="${c.id}"><span class="rr-nm">${esc(c.name)||"New character"}</span>${a.party.includes(c.id)?'<span class="rr-tag">in party</span>':""}<button class="rr-kebab" data-rropen="${c.id}" aria-label="Open character">⋯</button></div>`).join("");
      if(rows)html+=`<div class="gh">${esc(title)}</div>${rows}`;});
    dd.innerHTML=html||`<div class="rr-empty">No matching characters.</div>`;};
  const open=()=>{draw();dd.removeAttribute("hidden");};
  const close=()=>dd.setAttribute("hidden","");
  inp.addEventListener("focus",open);inp.addEventListener("click",open);inp.addEventListener("input",()=>{open();});
  dd.addEventListener("click",e=>{const k=e.target.closest("[data-rropen]");if(k){e.stopPropagation();close();openCharacterDetail(k.dataset.rropen,a.id);return;}
    const r=e.target.closest("[data-rid]");if(r){addExistingToParty(a,r.dataset.rid);}});
  document.addEventListener("click",e=>{if(!box.querySelector(".pc-roster").contains(e.target))close();});
}
// Quick edit of one field from a row chip (B137): a Notion-style mini property row (icon · label · value;
// label editable for custom fields). No backgrounds; both editable.
function openPCFieldEdit(rid,key,anchor){const c=rosterById(rid);if(!c)return;const i=(c.fields||[]).findIndex(x=>(x.k||"")===(key||""));const f=c.fields[i];if(!f)return;
  const d=fieldDef(f),ico=d&&d.icon?d.icon:"";
  const nameEl=f.k?`<span class="cd-pn static">${ico}${esc(fieldLabel(f))}</span>`:`<input class="cd-pn-edit pcfe-l" value="${esc(f.label)}" placeholder="Field name">`;
  const p=showPopover(anchor,`<div class="cd-prop cd-prop-pop">${nameEl}<input class="cd-pv pcfe" value="${esc(String(f.v))}" placeholder="Empty"></div>`);
  const inp=p.querySelector(".pcfe");inp.focus();inp.select();
  const save=()=>{f.v=inp.value;const l=p.querySelector(".pcfe-l");if(l)f.label=l.value.trim();saveRoster();renderAdvDetail();};
  inp.addEventListener("input",save);{const l=p.querySelector(".pcfe-l");if(l)l.addEventListener("input",save);}
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key==="Escape"){e.preventDefault();closePopover();}});}
const PC_TUNE_ICON='<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 96a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm73.3 0C253 67.7 224.8 48 192 48s-61 19.7-73.3 48L32 96C14.3 96 0 110.3 0 128s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 160c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 96z"/></svg>';
// Character detail — a Notion-style peek (B137). Fixed top (tags + icons) and footer (Done · Delete); the
// title, typed properties and notes scroll together between them. Properties are split into two groups —
// shown in the party row vs hidden — by a divider; a property's name menu toggles the group, flags an
// ability as the spell ATK/DC source, renames a custom field, or removes it. `curAdvId` = where it opened.
// Build the character-detail modal body (B198 — extracted from openCharacterDetail so the binding block
// below reads as one piece). Pure: the character, current-adventure id, ui flags, and its adventures (tags).
function charDetailHTML(c,curAdv,ui,advs){
  // Current adventure's tag always leads (B138).
  const tag=ad=>`<span class="cd-tag${ad.id===curAdv?" cur":""}" style="--tagc:${ad.color||"var(--accent)"}">${esc(advDName(ad))}</span>`;
  const tagsHTML=advs.length?advs.map(tag).join(""):`<span class="cd-tag empty">Not in any adventure</span>`;
  const propRow=(f,i)=>{const d=fieldDef(f),ico=d&&d.icon?d.icon:"";
    const nameEl=(ui.rename===i&&!f.k)?`<input class="cd-pn-edit" data-cdrenval="${i}" value="${esc(f.label)}" placeholder="Field name">`
      :`<button class="cd-pn" data-cdname="${i}">${ico}${esc(fieldLabel(f))}</button>`;
    const ph=fieldDefault(c,f,curAdv)||"Empty";
    const valEl=`<input class="cd-pv" data-cdval="${i}" value="${esc(String(f.v))}" placeholder="${esc(ph)}">`;
    return `<div class="cd-prop" data-cdrow="${i}"><span class="cd-grip" draggable="true" data-cdgrip="${i}" title="Drag to reorder">${GRIP_SVG}</span>${nameEl}${valEl}</div>`;};
  // Preset chip field (B148) — label + a wrapping field of chips and an add control. dmgmod/passives pick from
  // a custom dropdown; skills keep the datalist combobox. Passive chips derive proficiency from the Skills field.
  const presetRow=(f,i)=>{const arr=Array.isArray(f.v)?f.v:[];
    const chips=arr.map((e,j)=>f.k==="dmgmod"?dmgChipHTML(e,j):f.k==="passives"?passiveChipHTML(c,e,j):(f.k==="class"||f.k==="subclass")?plainChipHTML(e,j):skillChipHTML(c,e,j)).join("");
    const addAttr=f.k==="dmgmod"?"data-cddmgadd":f.k==="passives"?"data-cdpassadd":f.k==="class"?"data-cdclassadd":f.k==="subclass"?"data-cdsubadd":"data-cdskilladd";
    const addCtrl=`<button class="cd-chip-addbtn" ${addAttr}="${i}" title="Add" aria-label="Add">＋</button>`;
    // Add control sits BEFORE the chips (B168); chips scroll horizontally after it.
    return `<div class="cd-prop cd-preset" data-cdrow="${i}"><span class="cd-grip" draggable="true" data-cdgrip="${i}" title="Drag to reorder">${GRIP_SVG}</span><button class="cd-pn" data-cdname="${i}">${esc(fieldLabel(f))}</button>${addCtrl}<div class="cd-chipfield" data-cdchips="${i}">${chips}</div></div>`;};
  // Abilities live in the reused Forge ability grid (B139); everything else (incl. Level — a regular field
  // at the top) renders as property rows. chipHidden keeps Level/init/abilities off the party row only.
  let visHTML="",hidHTML="";(c.fields||[]).forEach((f,i)=>{const d=fieldDef(f);if(d&&d.abil)return;const html=isPreset(f)?presetRow(f,i):propRow(f,i);(cdRowHidden(f)?hidHTML+=html:visHTML+=html);});
  // Ability-score grid is ALWAYS shown (B145) — cells bind by ability key and the field is created lazily on
  // first edit. Star a cell to make it "main" (derives ATK/save), with override inputs per flagged ability.
  const abilCell=k=>{const f=abilFieldOf(c,k)||{k,v:"",main:false,prof:false},on=!!f.main;
    return `<div class="cell cc-ab-${k}${on?" is-main":""}"><button type="button" class="abmain${on?" active":""}" data-cdabmain="${k}" title="Main ability — derives spell ATK / save DC" aria-pressed="${on}">★</button><div class="ab">${k.toUpperCase()}</div><input type="number" data-cdabkey="${k}" value="${esc(String(f.v))}" placeholder="10"><div class="mod">${sgn(abilMod(abilScore(f)))}</div><button type="button" class="svtog${f.prof?" active":""}" data-cdabsave="${k}" aria-pressed="${f.prof?"true":"false"}">Save <b>${sgn(abilSave(c,f))}</b></button></div>`;};
  const cells=PC_ABILS.map(abilCell).join("");
  const mains=PC_ABILS.map(k=>abilFieldOf(c,k)).filter(f=>f&&f.main);
  const spell=mains.length?`<div class="cd-spell">${mains.map(f=>{const cv=abilDerived(c,f);
    return `<div class="cd-spellrow"><span class="cd-spell-ab cc-ab-${f.k}">${f.k.toUpperCase()}</span><div class="cd-sub"><span class="cd-sub-l">atk</span><input class="cd-sub-v" data-cdabsub="atk:${f.k}" value="${esc(f.atkV==null?"":String(f.atkV))}" placeholder="${sgn(cv.atk)}"></div><div class="cd-sub"><span class="cd-sub-l">save DC</span><input class="cd-sub-v" data-cdabsub="dc:${f.k}" value="${esc(f.dcV==null?"":String(f.dcV))}" placeholder="${cv.dc}"></div></div>`;}).join("")}</div>`:"";
  const abilBlock=`<div class="cd-grpdiv"><span>Ability scores</span></div><div class="abil cd-abilgrid">${cells}</div>${spell}`;
  const hidBlock=hidHTML?`<div class="cd-grpdiv" data-cdhiddiv><span>Hidden from the party row</span></div>${hidHTML}`:"";
  return `<div class="char-detail">
    <div class="cd-top">
      <div class="cd-tags">${tagsHTML}</div>
      <div class="cd-icons"><button class="cd-gx" data-cdmenu title="More" aria-label="More">⋯</button><button class="cd-gx" data-cdclose aria-label="Close">✕</button></div>
    </div>
    <div class="cd-scroll">
      <input class="cd-title" placeholder="Character name" value="${esc(c.name)}">
      <div class="cd-props">${visHTML}${hidBlock}<div class="cd-addrow2"><button class="cd-addprop" data-cdaddprop>＋ Add a property</button><button class="cd-addprop cd-savetpl" data-cdsavetpl title="New characters will start from this character's properties">${SAVE_TPL_ICON}Save as template</button></div>${abilBlock}</div>
      <div class="cd-divider"></div>
      <textarea class="cd-notes" placeholder="Notes & backstory…">${esc(c.notes||"")}</textarea>
    </div>
  </div>`;
}
function openCharacterDetail(rid,curAdvId,ui){
  ui=ui||{};const c=rosterById(rid);if(!c){closeModal();return;}
  const curAdv=curAdvId!==undefined?curAdvId:state.selAdv;
  const advs=rosterAdventures(rid).slice().sort((x,y)=>(x.id===curAdv?-1:y.id===curAdv?1:0)),shared=advs.length>1;
  openModalRaw(charDetailHTML(c,curAdv,ui,advs));
  $("#modal").classList.add("cd-host");
  // re() re-renders the whole modal; preserve the scroll position so toggling Save/main/etc. doesn't bounce
  // the user back to the top (B143).
  const m=$("#modal"),re=u=>preserveScroll(".cd-scroll",()=>openCharacterDetail(rid,curAdv,u)),close=()=>closeModal();
  // Refresh on ANY close path (✕, kebab action, or backdrop click) so edits made during combat show up (B169).
  _onModalClose=()=>{if(state.selAdv)renderAdvDetail();if(typeof _curView!=="undefined"&&_curView==="combat"){resyncPcInstances();renderCombat();}};
  const grow=t=>{t.style.height="auto";t.style.height=t.scrollHeight+"px";};
  // Field name menu — standard popover (group toggle / rename / remove), matching every other menu (B138).
  const fieldMenu=(i,anchor)=>{const f=c.fields[i];if(!f)return;
    const hideItem=f.k==="init"?"":`<button class="popitem" data-mh>${f.hide?"Show in party row":"Hide from party row"}</button>`;
    const p=showPopover(anchor,`${hideItem}${f.k?"":`<button class="popitem" data-mr>Rename</button>`}<button class="popitem danger" data-mx>Remove field</button>`);
    {const b=p.querySelector("[data-mh]");if(b)b.addEventListener("click",()=>{closePopover();f.hide=!f.hide;saveRoster();re({});});}
    {const b=p.querySelector("[data-mr]");if(b)b.addEventListener("click",()=>{closePopover();re({rename:i});});}
    p.querySelector("[data-mx]").addEventListener("click",()=>{closePopover();c.fields.splice(i,1);saveRoster();re({});});};
  // Add-a-property — standard popover: a filter input over the unused standard keys + an "Ability scores" group.
  // Suggest only standard fields that aren't already present (by key OR matching custom label) — abilities are
  // always shown in the grid, Proficiency is derived from Level, so neither is offered (B145).
  const addPropMenu=anchor=>{const present=new Set((c.fields||[]).map(f=>f.k).filter(Boolean));
    const labels=new Set((c.fields||[]).map(f=>fieldLabel(f).toLowerCase()));
    const stdOpts=PC_FIELDS.filter(f=>!f.abil&&f.k!=="prof"&&!present.has(f.k)&&!labels.has(f.label.toLowerCase())).map(f=>`<button class="popitem" data-cdadd="${f.k}">${f.icon||""}${esc(f.label)}</button>`).join("");
    const presetOpts=PC_PRESETS.filter(p=>!present.has(p.k)).map(p=>`<button class="popitem" data-cdaddpreset="${p.k}">${p.label}</button>`).join("");
    const p=showPopover(anchor,`<input class="popinput cd-add-in" placeholder="Field name…" autocomplete="off"><div class="cd-add-list">${stdOpts}${presetOpts}</div>`);
    const ai=p.querySelector(".cd-add-in");ai.focus();
    ai.addEventListener("input",()=>{const q=ai.value.trim().toLowerCase();p.querySelectorAll(".cd-add-list .popitem").forEach(b=>{b.style.display=(!q||b.textContent.toLowerCase().includes(q))?"":"none";});});
    ai.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const nm=ai.value.trim();if(nm){c.fields.push({k:"",label:nm,v:""});saveRoster();closePopover();re({});}}else if(e.key==="Escape")closePopover();});
    p.querySelectorAll("[data-cdadd]").forEach(el=>el.addEventListener("click",()=>{c.fields.push({k:el.dataset.cdadd,v:""});saveRoster();closePopover();re({});}));
    p.querySelectorAll("[data-cdaddpreset]").forEach(el=>el.addEventListener("click",()=>{c.fields.push(newPresetField(el.dataset.cdaddpreset));saveRoster();closePopover();re({});}));};
  m.querySelector("[data-cdclose]").addEventListener("click",close);
  m.querySelector(".cd-title").addEventListener("input",e=>{c.name=e.target.value;saveRoster();});
  m.querySelectorAll("[data-cdval]").forEach(el=>el.addEventListener("input",()=>{const f=c.fields[+el.dataset.cdval];if(f){f.v=el.value;saveRoster();}}));
  m.querySelectorAll("[data-cdabsub]").forEach(el=>el.addEventListener("input",()=>{const[kind,k]=el.dataset.cdabsub.split(":"),f=ensureAbilField(c,k);if(kind==="atk")f.atkV=el.value;else f.dcV=el.value;saveRoster();}));
  // Ability grid binds by key (the field is created on demand). Score commits on change so the mod + derived
  // placeholders refresh without stealing focus mid-type.
  m.querySelectorAll("[data-cdabkey]").forEach(el=>el.addEventListener("change",()=>{ensureAbilField(c,el.dataset.cdabkey).v=el.value;saveRoster();re({});}));
  m.querySelectorAll("[data-cdabmain]").forEach(el=>el.addEventListener("click",()=>{const f=ensureAbilField(c,el.dataset.cdabmain);f.main=!f.main;saveRoster();re({});}));
  m.querySelectorAll("[data-cdabsave]").forEach(el=>el.addEventListener("click",()=>{const f=ensureAbilField(c,el.dataset.cdabsave);f.prof=!f.prof;saveRoster();re({});}));
  // Preset chip fields (B148): add via a custom dropdown, click a chip to cycle its state, the × to remove.
  m.querySelectorAll("[data-cdskilladd]").forEach(el=>el.addEventListener("click",()=>{const f=c.fields[+el.dataset.cdskilladd];if(!f)return;
    const used=new Set((f.v||[]).map(e=>e.s)),avail=Object.keys(SKILLS).filter(s=>!used.has(s));
    if(!avail.length){toast("All skills added.");return;}
    const p=showPopover(el,`<div class="popscroll">${avail.map(s=>`<button class="popitem" data-sk="${s}">${s.replace(/_/g," ")}</button>`).join("")}</div>`);
    p.querySelectorAll("[data-sk]").forEach(b=>b.addEventListener("click",()=>{closePopover();f.v.push({s:b.dataset.sk,e:1});saveRoster();re({});}));}));
  m.querySelectorAll("[data-cddmgadd]").forEach(el=>el.addEventListener("click",()=>{const f=c.fields[+el.dataset.cddmgadd];if(!f)return;const used=new Set((f.v||[]).map(e=>e.t)),avail=DMG_TYPES.filter(t=>!used.has(t));
    if(!avail.length){toast("All damage types added.");return;}
    const p=showPopover(el,`<div class="popscroll">${avail.map(t=>`<button class="popitem" data-dt="${t}">${t}</button>`).join("")}</div>`);
    p.querySelectorAll("[data-dt]").forEach(b=>b.addEventListener("click",()=>{closePopover();f.v.push({t:b.dataset.dt,m:"res"});saveRoster();re({});}));}));
  m.querySelectorAll("[data-cdchips]").forEach(box=>box.addEventListener("click",e=>{const f=c.fields[+box.dataset.cdchips];if(!f||!Array.isArray(f.v))return;
    const del=e.target.closest("[data-cdchipdel]");if(del){e.stopPropagation();f.v.splice(+del.dataset.cdchipdel,1);saveRoster();re({});return;}
    const cyc=e.target.closest("[data-cdcycle]");if(cyc){const en=f.v[+cyc.dataset.cdcycle];if(!en)return;if(f.k==="dmgmod")en.m=DMG_CYCLE[en.m||"res"];else en.e=(Number(en.e)||1)>=2?1:2;saveRoster();re({});}}));
  m.querySelectorAll("[data-cdpassadd]").forEach(el=>el.addEventListener("click",()=>{const f=c.fields[+el.dataset.cdpassadd];if(!f)return;const used=new Set(f.v||[]),avail=Object.keys(SKILLS).filter(s=>!used.has(s));
    if(!avail.length){toast("All skills added.");return;}
    const p=showPopover(el,`<div class="popscroll">${avail.map(s=>`<button class="popitem" data-pk="${s}">${s.replace(/_/g," ")}</button>`).join("")}</div>`);
    p.querySelectorAll("[data-pk]").forEach(b=>b.addEventListener("click",()=>{closePopover();f.v.push(b.dataset.pk);saveRoster();re({});}));}));
  // Class: custom dropdown of the D&D classes (filterable) that ALSO accepts a typed custom class (Enter).
  m.querySelectorAll("[data-cdclassadd]").forEach(el=>el.addEventListener("click",()=>{const f=c.fields[+el.dataset.cdclassadd];if(!f)return;
    const used=new Set((f.v||[]).map(x=>String(x).toLowerCase())),avail=D5_CLASSES.filter(x=>!used.has(x.toLowerCase()));
    const p=showPopover(el,`<input class="popinput cd-class-in" placeholder="Class… (or type a custom one)" autocomplete="off"><div class="popscroll">${avail.map(x=>`<button class="popitem" data-cl="${esc(x)}">${esc(x)}</button>`).join("")}</div>`);
    const inp=p.querySelector(".cd-class-in");inp.focus();
    const add=v=>{v=(v||"").trim();if(!v)return;closePopover();f.v.push(v);saveRoster();re({});};
    inp.addEventListener("input",()=>{const q=inp.value.trim().toLowerCase();p.querySelectorAll(".popitem").forEach(b=>{b.style.display=(!q||b.textContent.toLowerCase().includes(q))?"":"none";});});
    inp.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();add(inp.value);}else if(ev.key==="Escape")closePopover();});
    p.querySelectorAll("[data-cl]").forEach(b=>b.addEventListener("click",()=>add(b.dataset.cl)));}));
  // Subclass: free-text chip (no fixed list) — type and press Enter.
  m.querySelectorAll("[data-cdsubadd]").forEach(el=>el.addEventListener("click",()=>{const f=c.fields[+el.dataset.cdsubadd];if(!f)return;
    const p=showPopover(el,`<input class="popinput cd-sub-in" placeholder="Subclass…" autocomplete="off">`);
    const inp=p.querySelector(".cd-sub-in");inp.focus();
    inp.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();const v=inp.value.trim();if(v){closePopover();f.v.push(v);saveRoster();re({});}}else if(ev.key==="Escape")closePopover();});}));
  // Drag-to-reorder properties (B143b): grip handles drag; dropping onto a row reorders + joins that row's
  // group, dropping on the "Hidden" divider moves into the hidden group.
  const clearDM=()=>m.querySelectorAll(".cd-prop.drop-before,.cd-prop.drop-after,.cd-grpdiv.drop-into").forEach(x=>x.classList.remove("drop-before","drop-after","drop-into"));
  m.querySelectorAll("[data-cdgrip]").forEach(g=>{const row=g.closest(".cd-prop");
    g.addEventListener("dragstart",ev=>{_cdDragIdx=+g.dataset.cdgrip;_cdDrop=null;ev.dataTransfer.effectAllowed="move";try{ev.dataTransfer.setData("text/plain","p");}catch(_){}try{ev.dataTransfer.setDragImage(row,12,12);}catch(_){}requestAnimationFrame(()=>row.classList.add("dragging"));});
    g.addEventListener("dragend",()=>{row.classList.remove("dragging");clearDM();_cdDragIdx=null;_cdDrop=null;});});
  m.querySelectorAll(".cd-prop[data-cdrow]").forEach(row=>{
    row.addEventListener("dragover",ev=>{if(_cdDragIdx==null)return;const toIdx=+row.dataset.cdrow;if(toIdx===_cdDragIdx)return;ev.preventDefault();const r=row.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2;clearDM();row.classList.add(after?"drop-after":"drop-before");_cdDrop={toIdx,after};});
    row.addEventListener("drop",ev=>{if(_cdDragIdx==null||!_cdDrop)return;ev.preventDefault();const from=_cdDragIdx,dp=_cdDrop;clearDM();reorderField(c,from,dp.toIdx,dp.after,null);re({});});});
  {const dv=m.querySelector("[data-cdhiddiv]");if(dv){
    dv.addEventListener("dragover",ev=>{if(_cdDragIdx==null)return;ev.preventDefault();clearDM();dv.classList.add("drop-into");_cdDrop={toIdx:null,intoHidden:true};});
    dv.addEventListener("drop",ev=>{if(_cdDragIdx==null||!_cdDrop)return;ev.preventDefault();const from=_cdDragIdx;clearDM();reorderField(c,from,null,false,true);re({});});}}
  {const nt=m.querySelector(".cd-notes");grow(nt);nt.addEventListener("input",e=>{c.notes=e.target.value;saveRoster();grow(e.target);});}
  m.querySelectorAll("[data-cdname]").forEach(el=>el.addEventListener("click",()=>fieldMenu(+el.dataset.cdname,el)));
  {const ri=m.querySelector("[data-cdrenval]");if(ri){ri.focus();const commit=()=>{const f=c.fields[+ri.dataset.cdrenval];if(f){f.label=ri.value.trim();saveRoster();}re({});};ri.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit();}else if(e.key==="Escape")re({});});ri.addEventListener("blur",commit);}}
  m.querySelectorAll("[data-cdaddprop]").forEach(el=>el.addEventListener("click",()=>addPropMenu(el)));
  {const st=m.querySelector("[data-cdsavetpl]");if(st)st.addEventListener("click",()=>{savePcTemplate(c);toast("Template saved — new characters start from these properties.");});}
  // Top kebab menu (B155): clear page · import template · unsync (shared only) · delete.
  {const km=m.querySelector("[data-cdmenu]");if(km)km.addEventListener("click",()=>{
    const items=`<button class="popitem" data-cdm="clear">Clear page</button><button class="popitem" data-cdm="template">Import current template</button>${shared&&curAdv?`<button class="popitem" data-cdm="unsync">Unsync from this adventure</button>`:""}<div class="popsep"></div><button class="popitem danger" data-cdm="delete">Delete character</button>`;
    const p=showPopover(km,items);
    p.querySelectorAll("[data-cdm]").forEach(b=>b.addEventListener("click",()=>{const act=b.dataset.cdm;closePopover();
      if(act==="clear"){confirmStack("Clear this page — name, notes and every property value? The properties themselves stay.",()=>{c.name="";c.notes="";(c.fields||[]).forEach(f=>{if(Array.isArray(f.v))f.v=[];else if(f.v&&typeof f.v==="object")f.v={};else f.v="";f.main=false;f.prof=false;f.atkV="";f.dcV="";});saveRoster();re({});});}
      else if(act==="template"){const tpl=loadPcTemplate();if(!tpl){toast("No template saved yet — use Save as template first.");return;}
        const keyOf=f=>f.k||("l:"+(f.label||"").toLowerCase()),cur=c.fields||[],tk=new Set(tpl.map(keyOf));
        const removed=cur.filter(f=>!tk.has(keyOf(f))&&fieldHasVal(f));
        const apply=()=>{c.fields=tpl.map(tf=>{const ex=cur.find(f=>keyOf(f)===keyOf(tf));return ex?ex:JSON.parse(JSON.stringify(tf));});saveRoster();re({});};
        if(removed.length)confirmStack(`Importing the template removes ${removed.length} filled propert${removed.length>1?"ies":"y"} (${esc(removed.map(fieldLabel).join(", "))}). Continue?`,apply);else apply();}
      else if(act==="unsync"){const ad=state.adv.find(x=>x.id===curAdv);if(ad)unsyncPartyMember(ad,rid);closeModal();}
      else if(act==="delete"){const del=()=>{deleteRosterChar(rid);closeModal();if(state.selAdv)renderAdvDetail();};if(charIsBlank(c))del();else confirmStack(`Delete "${esc(c.name||"this character")}" everywhere? It's removed from every adventure.`,del);}
    }));
  });}
}
