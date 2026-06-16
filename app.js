"use strict";
let state={lib:[],adv:[],selAdv:null,presets:[],spells:[],conditions:[],books:{},disabledLibs:[],legendaryGroups:{},refMeta:{},settings:null};
// ── User settings (Batch 52) ─ persisted on-device only (mf_settings). Feature toggles gate the
// statblock colour-coding (B53) and click-to-roll dice (B54); defaults seed new adventures/combatants.
const SETTINGS_KEY="mf_settings";
const SETTINGS_DEFAULT={
  colorCode:{on:true,damage:true,dice:true,conditions:true,ranges:true,abilityBlock:true},
  clickRoll:{on:true,adv:true,crit:true,editFormula:true},
  defaults:{partySize:4,partyLevel:1,faction:"Enemy"}
};
function _mergeDefaults(def,got){const o=Array.isArray(def)?[]:{};for(const k in def){const dv=def[k],gv=got?got[k]:undefined;o[k]=(dv&&typeof dv==="object"&&!Array.isArray(dv))?_mergeDefaults(dv,gv&&typeof gv==="object"?gv:{}):(gv===undefined?dv:gv);}return o;}
function loadSettings(){let got=null;try{got=JSON.parse(localStorage.getItem(SETTINGS_KEY));}catch(e){}state.settings=_mergeDefaults(SETTINGS_DEFAULT,got||{});}
function saveSettings(){_store(SETTINGS_KEY,state.settings);}
let M=null, pendingForge=null;
const SHOW_DERIVED=false; // B23: legacy AC/Attack/Save-DC chips above the statblock, kept but off by default

// ── Uploaded reference libraries (Batch 13/14) ───────────────────────────────
// 5etools .md dumps the user uploads at runtime: statblocks (chassis bases), spells,
// and conditions/glossary terms. Stored in localStorage only (never JSONBin / never
// the repo): bulky, copyrighted reference data that stays on-device. Each kind lives
// in its own array/key so a spell is never mistaken for a statblock (Batch 14 note).
const PRESET_KEY="mf_presets",SPELL_KEY="mf_spells",COND_KEY="mf_conditions",BOOK_KEY="mf_books",DISLIB_KEY="mf_disabled_libs",LEGGRP_KEY="mf_leggroups",REFMETA_KEY="mf_refmeta";
// Quota-aware writes: a failed setItem (device storage full) flips _storageFailed so the
// upload flow can surface a single consolidated alert instead of silently dropping data.
let _storageFailed=false;
function _store(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true;}catch(e){_storageFailed=true;return false;}}
function loadPresets(){try{state.presets=(JSON.parse(localStorage.getItem(PRESET_KEY))||[]).map(normalizeMonster);}catch(e){state.presets=[];}}
function savePresets(){_store(PRESET_KEY,state.presets);}
function loadSpells(){try{state.spells=JSON.parse(localStorage.getItem(SPELL_KEY))||[];}catch(e){state.spells=[];}}
function saveSpells(){_store(SPELL_KEY,state.spells);}
function loadConditions(){try{state.conditions=JSON.parse(localStorage.getItem(COND_KEY))||[];}catch(e){state.conditions=[];}}
function saveConditions(){_store(COND_KEY,state.conditions);}
function loadBooks(){try{state.books=JSON.parse(localStorage.getItem(BOOK_KEY))||{};}catch(e){state.books={};}}
function saveBooks(){_store(BOOK_KEY,state.books);}
function loadDisabled(){try{state.disabledLibs=JSON.parse(localStorage.getItem(DISLIB_KEY))||[];}catch(e){state.disabledLibs=[];}}
function saveDisabled(){_store(DISLIB_KEY,state.disabledLibs);}
function loadLegGroups(){try{state.legendaryGroups=JSON.parse(localStorage.getItem(LEGGRP_KEY))||{};}catch(e){state.legendaryGroups={};}}
function saveLegGroups(){_store(LEGGRP_KEY,state.legendaryGroups);}
function loadRefMeta(){try{state.refMeta=JSON.parse(localStorage.getItem(REFMETA_KEY))||{};}catch(e){state.refMeta={};}}
function saveRefMeta(){_store(REFMETA_KEY,state.refMeta);}
function loadRefLibs(){loadBooks();loadDisabled();loadLegGroups();loadRefMeta();loadPresets();loadSpells();loadConditions();reannotateBooks();reapplyLegGroups();}
// Stamp _book/_group onto every stored item from its _srcCode via the loaded books map,
// so uploading books.json after a library still resolves its full title + group.
function reannotateBooks(persist){const ann=x=>{const b=state.books[x._srcCode];x._book=b?b.name:"";x._group=b?b.group:"";};
  state.presets.forEach(ann);state.spells.forEach(ann);state.conditions.forEach(ann);
  if(persist){savePresets();saveSpells();saveConditions();}}
// Re-apply lair/regional from the loaded legendarygroups onto any preset that references one
// (so uploading the groups file after a bestiary, or in a later session, still fills them in).
function reapplyLegGroups(){const map=state.legendaryGroups||{};let any=false;
  state.presets.forEach(m=>{if(!m._legGroup)return;const g=map[((m._legGroup.name||"")+"|"+(m._legGroup.source||"")).toLowerCase()];if(g){applyLegendaryGroup(m,g);any=true;}});
  if(any)savePresets();}
// ---- Library enable/disable ----
const LIBSEP="";
function libKey(kind,source){return kind+LIBSEP+(source||"");}
function isLibEnabled(kind,source){return !state.disabledLibs.includes(libKey(kind,source));}
function setLibEnabled(kind,source,on){const k=libKey(kind,source),i=state.disabledLibs.indexOf(k);
  if(on&&i>=0)state.disabledLibs.splice(i,1);else if(!on&&i<0)state.disabledLibs.push(k);saveDisabled();}
// Enabled subsets - every pool consumer (chassis picker, spell/condition lookups & datalists)
// reads through these so a toggled-off library disappears from the app but stays on disk.
function enPresets(){return state.presets.filter(m=>isLibEnabled("statblock",m._source||""));}
function enSpells(){return state.spells.filter(s=>isLibEnabled("spell",s._source||""));}
function enConditions(){return state.conditions.filter(c=>isLibEnabled("condition",c._source||""));}
// statblock sources only (drives the From-chassis source picker)
function presetSources(){const s=[];enPresets().forEach(m=>{const k=m._source||"Uploaded";const e=s.find(x=>x.name===k);if(e)e.count++;else s.push({name:k,count:1});});return s;}
// every uploaded library across kinds, for the manage modal
function presetLibraries(){const map={};
  const add=(arr,kind)=>arr.forEach(x=>{const n=x._source||"Uploaded",key=kind+LIBSEP+n,e=map[key]=map[key]||{name:n,kind,count:0,books:{},groups:{}};
    e.count++;if(x._book)e.books[x._book]=(e.books[x._book]||0)+1;if(x._group)e.groups[x._group]=(e.groups[x._group]||0)+1;});
  add(state.presets,"statblock");add(state.spells,"spell");add(state.conditions,"condition");
  const dom=o=>Object.keys(o).sort((a,b)=>o[b]-o[a])[0]||"";
  return Object.values(map).map(e=>({name:e.name,kind:e.kind,count:e.count,book:dom(e.books),group:dom(e.groups),enabled:isLibEnabled(e.kind,e.name)}));}
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
  str:10,dex:10,con:10,int:10,wis:10,cha:10,saves:[],skills:[],tools:[],dmg:{},dmgnote:"",cimm:"",gear:"",
  senses:{darkvision:0,blindsight:0,tremorsense:0,truesight:0,blindBeyond:false,other:""},lang:"Common",
  cr:"1",xpOver:"",traits:[],actions:[],bonus:[],reactions:[],sort:{},
  legend:{on:false,intro:"",items:[]},villain:{on:false,intro:"",items:[]},lair:{on:false,intro:"",items:[]},regional:{on:false,text:""},notes:[],
  status:"Draft",tags:[],archived:false,minion:false,
  _auto:{ac:true,hp:true}};}
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
  // FP6 — free-form note blocks rendered isolated below the stat block.
  if(!Array.isArray(m.notes))m.notes=[];
  m.notes=m.notes.map(n=>typeof n==="string"?{title:"",text:n}:{title:n.title||"",text:n.text||""});
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
  m.minion=!!m.minion;
  if(!Array.isArray(m.tools))m.tools=[];
  return m;
}
function normalizeAdv(a){
  a.archived=!!a.archived;a.notes=a.notes||"";a.levels=a.levels||[];a.color=a.color||"";
  a.scenes=(a.scenes||[]).map(s=>({id:s.id||uid(),name:s.name||"Scene",collapsed:!!s.collapsed,notes:s.notes||"",archived:!!s.archived}));
  a.encounters=(a.encounters||[]).map(e=>{
    e.archived=!!e.archived;e.notes=e.notes||"";e.partyOverride=e.partyOverride||null;e.sceneId=e.sceneId||null;
    e.collapsed=!!e.collapsed;if(e.target==null)e.target=null;else e.target=Number(e.target);
    e.combatants=(e.combatants||[]).map(c=>{
      if(!c.type)return{type:"monster",id:uid(),monsterId:c.monsterId,nickname:"",count:c.count||1,faction:"Enemy"};
      c.id=c.id||uid();if(c.faction)c.faction=migrateFaction(c.faction);return c;
    });
    return e;
  });
  return a;
}

function fillSelect(id,arr,fmt){$(id).innerHTML=arr.map(v=>`<option value="${v}">${fmt?fmt(v):v}</option>`).join("");}
function buildAbilityGrid(){$("#abilGrid").innerHTML=ABILS.map(a=>`<div class="cell"><div class="ab">${a.toUpperCase()}</div><input type="number" id="ab_${a}" placeholder="10"><div class="mod" id="mod_${a}">+0</div><button type="button" class="svtog" id="sv_${a}" aria-pressed="false">Save <b id="svv_${a}">+0</b></button></div>`).join("");}
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
    <button class="iconbtn" data-rmdmg="${esc(type)}">✕</button></div>`).join(""):"";
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
  const add=v=>{v=(v||"").replace(/;/g,",").split(",").map(x=>x.trim()).filter(Boolean);const a=cimmList();v.forEach(t=>{if(!a.some(x=>x.toLowerCase()===t.toLowerCase()))a.push(t);});M.cimm=a.join(", ");ci.value="";renderCimm();renderPreview();};
  ci.addEventListener("input",()=>{if(/[,;]/.test(ci.value)){const p=ci.value.split(/[,;]/);p.slice(0,-1).forEach(x=>add(x));ci.value=p[p.length-1];}});
  ci.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add(ci.value);}else if(e.key==="Backspace"&&!ci.value){const a=cimmList();if(a.length){a.pop();M.cimm=a.join(", ");renderCimm();renderPreview();}}});
  ci.addEventListener("change",()=>{if(ci.value.trim())add(ci.value);}); // datalist pick / commit on blur
  $("#f_cimm_field").addEventListener("click",e=>{if(e.target.id==="f_cimm_field")ci.focus();});}
// Gear chipfield (B38) — mirrors the condition-immunity chip pattern.
function gearList(){return (M.gear||"").split(",").map(s=>s.trim()).filter(Boolean);}
function renderGear(){const box=$("#gearChips");if(!box)return;const list=gearList();
  box.innerHTML=list.map((g,i)=>`<span class="chip">${esc(g)}<button class="chipx" data-rmgear="${i}" title="Remove">×</button></span>`).join("");
  box.querySelectorAll("[data-rmgear]").forEach(b=>b.addEventListener("click",()=>{const a=gearList();a.splice(+b.dataset.rmgear,1);M.gear=a.join(", ");renderGear();renderPreview();}));}
function bindGear(){const gi=$("#f_gear_input");if(!gi)return;
  const add=v=>{v=(v||"").split(",").map(x=>x.trim()).filter(Boolean);const a=gearList();v.forEach(t=>{if(!a.some(x=>x.toLowerCase()===t.toLowerCase()))a.push(t);});M.gear=a.join(", ");gi.value="";renderGear();renderPreview();};
  gi.addEventListener("input",()=>{if(/,/.test(gi.value)){const p=gi.value.split(",");p.slice(0,-1).forEach(x=>add(x));gi.value=p[p.length-1];}});
  gi.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add(gi.value);}else if(e.key==="Backspace"&&!gi.value){const a=gearList();if(a.length){a.pop();M.gear=a.join(", ");renderGear();renderPreview();}}});
  gi.addEventListener("change",()=>{if(gi.value.trim())add(gi.value);});
  $("#f_gear_field").addEventListener("click",e=>{if(e.target.id==="f_gear_field")gi.focus();});
  $("#suggestGear").addEventListener("click",suggestGear);}
// Harvest gear from manufactured-weapon attack names + the AC note, adding any new items as chips.
function suggestGear(){
  const have=gearList(),add=[];const seen=t=>have.concat(add).some(x=>x.toLowerCase()===t.toLowerCase());
  M.actions.forEach(e=>{if(e.mode!=="attack"&&!/weapon|sword|axe|bow|spear|hammer|mace|dagger|crossbow/i.test(e.name||""))return;
    const w=GEAR_WEAPONS.find(g=>new RegExp("\\b"+g.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&")+"\\b","i").test(e.name||""));if(w&&!seen(w))add.push(w);});
  GEAR_ARMOR.forEach(g=>{if(new RegExp("\\b"+g.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&")+"\\b","i").test(M.acnote||"")&&!seen(g))add.push(g);});
  if(add.length){M.gear=have.concat(add).join(", ");renderGear();renderPreview();toast(`Added ${add.length} item${add.length>1?"s":""}: ${add.join(", ")}.`);}
  else toast("No new gear found in attacks or AC note.");}
function buildCondDatalist(){const dl=$("#condDatalist");if(!dl)return;dl.innerHTML=[...new Set(enConditions().map(c=>c.name))].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${esc(n)}">`).join("");}
function buildSpellDatalist(){const dl=$("#spellDatalist");if(!dl)return;dl.innerHTML=[...new Set(enSpells().map(s=>s.name))].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${esc(n)}">`).join("");}
function bindStatic(){
  bindField("#f_name","name");bindField("#f_size","size");bindField("#f_type","type");bindField("#f_subtype","subtype");bindField("#f_align","align");
  bindField("#f_acnote","acnote");bindField("#f_init","init",true);
  $("#f_hpf").addEventListener("input",()=>{M.hpf=$("#f_hpf").value;
    // a valid dice formula auto-derives HP, but only when HP is empty or just the CR autofill (not a manual edit)
    if(/\d+\s*d\s*\d+/i.test(M.hpf)&&(M.hp==null||M._auto.hp)){M.hp=exprAvg(M.hpf);M._auto.hp=false;$("#f_hp").value=M.hp;$("#wb_hp").classList.remove("suggested");}
    renderPreview();});
  bindField("#f_dmgnote","dmgnote");bindField("#f_lang","lang");
  setupIdentityCombos();
  bindCimm();bindGear();
  $("#f_snword").addEventListener("input",()=>{M.shortName.word=$("#f_snword").value||"creature";renderEntries();renderPreview();});
  $("#f_snproper").addEventListener("change",()=>{M.shortName.proper=$("#f_snproper").checked;renderEntries();renderPreview();});
  const itp=$("#f_initprof");itp.addEventListener("click",()=>{const nv=nextTri(itp.dataset.state);M.initProf=nv;paintTri(itp,nv);renderPreview();});
  $("#f_cr").addEventListener("change",()=>{const p=parseCRInput($("#f_cr").value);if(p)setCR(p);else updateCRDisplay();});
  $("#f_size").addEventListener("change",updateHpDie);
  $("#f_snplural").addEventListener("change",()=>{M.shortName.plural=$("#f_snplural").checked;renderEntries();renderPreview();});
  // Name options (proper name / plural) live behind the gear inside the Short name field.
  $("#snGear").addEventListener("click",e=>{e.stopPropagation();openSnMenu(e.currentTarget);});
  $("#flyGear").addEventListener("click",e=>{e.stopPropagation();openCheckGear(e.currentTarget,"#sp_hover","Fly speed can hover");});
  $("#bsGear").addEventListener("click",e=>{e.stopPropagation();openCheckGear(e.currentTarget,"#se_blindBeyond","Blind beyond this radius");});
  ["darkvision","blindsight","tremorsense","truesight"].forEach(k=>$("#se_"+k).addEventListener("input",()=>{M.senses[k]=Number($("#se_"+k).value||0);renderPreview();}));
  $("#se_blindBeyond").addEventListener("change",()=>{M.senses.blindBeyond=$("#se_blindBeyond").checked;renderPreview();});
  $("#se_other").addEventListener("input",()=>{M.senses.other=$("#se_other").value;renderPreview();});
  // Empty → revert to the CR-suggested value (re-auto, shows as placeholder); a typed value is manual.
  $("#f_ac").addEventListener("input",()=>{if($("#f_ac").value===""){M._auto.ac=true;applyCRAuto();}else{M.ac=Number($("#f_ac").value);M._auto.ac=false;$("#f_ac").placeholder="";$("#wb_ac").classList.remove("suggested");}renderPreview();});
  $("#f_hp").addEventListener("input",()=>{if($("#f_hp").value===""){M._auto.hp=true;applyCRAuto();}else{M.hp=Number($("#f_hp").value);M._auto.hp=false;$("#f_hp").placeholder="";$("#wb_hp").classList.remove("suggested");}renderPreview();});
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
  $("#addSection").addEventListener("click",()=>openSectionMenu($("#addSection")));
  $("#formCol").addEventListener("click",e=>{const rm=e.target.closest("[data-secrm]");if(rm){removeSection(rm.dataset.secrm);return;}const an=e.target.closest("[data-addnote]");if(an){addNote();}});
  $("#notesList").addEventListener("input",e=>{const t=e.target.closest("[data-note]");if(!t)return;const i=+t.dataset.note,f=t.dataset.nf;if(M.notes[i]){M.notes[i][f]=t.value;renderPreview();}});
  document.getElementById("pfExpand").addEventListener("click",()=>setPreviewCollapsed(false));
  document.getElementById("pfSave").addEventListener("click",()=>document.getElementById("saveMonster").click());
  document.getElementById("pfClaude").addEventListener("click",()=>document.getElementById("pushClaude").click());
  document.getElementById("pfNotion").addEventListener("click",()=>document.getElementById("copyNotion").click());
}
let previewCollapsed=false;
function setPreviewCollapsed(v){
  previewCollapsed=v;
  const forge=document.querySelector(".forge");
  const fl=document.getElementById("previewFloat");
  if(forge)forge.classList.toggle("preview-hidden",v);
  if(fl)fl.classList.toggle("show",v);
  if(v){const pfn=document.getElementById("pfName");if(pfn)pfn.textContent=M.name||"New Creature";}
}
// while HP is still auto (not manually set), derive it from a valid HP formula if present, else from CR
// Auto (CR-suggested) AC/HP show the suggested number as a PLACEHOLDER (the field stays empty,
// behaves as the suggested value, no need to clear) — mirrors the ability placeholder-10 pattern.
function syncAutoHP(){if(!M._auto.hp)return;const f=M.hpf||"";const badge=$("#wb_hp .badge");
  if(/\d+\s*d\s*\d+/i.test(f)){M.hp=exprAvg(f);if(badge)badge.textContent="avg";}
  else{const boh=BOH[M.cr];if(boh)M.hp=boh[1];if(badge)badge.textContent="≈CR";}
  const el=$("#f_hp");el.value="";el.placeholder=M.hp??"";}
function applyCRAuto(){const boh=BOH[M.cr];if(!boh)return;
  if(M._auto.ac){M.ac=boh[0];const el=$("#f_ac");el.value="";el.placeholder=String(boh[0]);$("#wb_ac").classList.add("suggested");}
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
// Tool proficiencies (B39) — official 2024 tool list; a simple proficient/none list (no ability math).
function renderTools(){const box=$("#toolRows");if(!box)return;
  box.innerHTML=(M.tools||[]).map((t,i)=>`<div class="rowline">
    <select data-ti="${i}" class="tlName">${TOOLS.map(k=>`<option ${k===t?"selected":""}>${esc(k)}</option>`).join("")}</select>
    <button class="iconbtn" data-rmtool="${i}">✕</button></div>`).join("");
  box.querySelectorAll(".tlName").forEach(el=>el.addEventListener("change",e=>{M.tools[+e.target.dataset.ti]=e.target.value;renderPreview();}));
  box.querySelectorAll("[data-rmtool]").forEach(el=>el.addEventListener("click",e=>{M.tools.splice(+e.target.dataset.rmtool,1);renderTools();renderPreview();}));
}
// B43 — "Add skill" opens a dropdown of skills, with the tool proficiencies as a subgroup after.
function openSkillToolMenu(anchor){
  const have=new Set(M.skills.map(s=>s[0])),haveT=new Set(M.tools||[]);
  const sk=Object.keys(SKILLS).filter(k=>!have.has(k)).map(k=>`<button class="popitem" data-addsk="${k}">${k.replace(/_/g," ")}</button>`).join("")||`<div class="pop-empty">All skills added</div>`;
  const tl=TOOLS.filter(t=>!haveT.has(t)).map(t=>`<button class="popitem" data-addtl="${esc(t)}">${esc(t)}</button>`).join("")||`<div class="pop-empty">All tools added</div>`;
  const p=showPopover(anchor,`<div class="popscroll"><div class="pop-grp-lbl">Skills</div>${sk}<div class="popsep"></div><div class="pop-grp-lbl">Tools</div>${tl}</div>`);
  p.classList.add("menu-pop");
  p.querySelectorAll("[data-addsk]").forEach(b=>b.addEventListener("click",()=>{closePopover();M.skills.push([b.dataset.addsk,"prof"]);renderSkills();renderPreview();}));
  p.querySelectorAll("[data-addtl]").forEach(b=>b.addEventListener("click",()=>{closePopover();(M.tools=M.tools||[]).push(b.dataset.addtl);renderTools();renderPreview();}));
}
$("#addSkill").addEventListener("click",e=>{e.stopPropagation();openSkillToolMenu(e.currentTarget);});

function arrFor(k){return k==="traits"?M.traits:k==="actions"?M.actions:k==="bonus"?M.bonus:k==="reactions"?M.reactions:k==="villain"?M.villain.items:k==="legend"?M.legend.items:k==="lair"?M.lair.items:[];}
function attackText(e){
  const pb=pbForCR(M.cr);const ab=mod(M[e.ability]);
  const atk=e.atk!==""&&e.atk!=null?Number(e.atk):ab+pb;
  const kind=e.kind==="Ranged"?"Ranged Attack Roll:":e.kind==="Melee or Ranged"?"Melee or Ranged Attack Roll:":"Melee Attack Roll:";
  let rr=e.kind==="Ranged"?`range ${e.range||"30/120"} ft.`:e.kind==="Melee or Ranged"?`reach ${e.reach||5} ft. or range ${e.range||"20/60"} ft.`:`reach ${e.reach||5} ft.`;
  const avg=Math.max(1,Math.floor(diceAvg(e.dice)+(e.addMod?ab:0)));
  const dtxt=e.dice+(e.addMod&&ab!==0?` ${sgn(ab)}`:"");
  // MCDM minions deal fixed damage — show the flat value with no dice expression.
  const hit=M.minion?`${avg}`:`${avg} (${dtxt})`;
  return `*${kind}* ${sgn(atk)}, ${rr}${e.targets?` ${e.targets}.`:""} *Hit:* ${hit} ${e.dtype} damage.${e.extra?` ${e.extra}`:""}`;
}
// MCDM minion flag: adds the Minion + Minion Group traits (flat damage & badge are render-time
// via attackText/renderPreview reading M.minion, so toggling off fully reverts with no data loss).
function applyMinion(on){
  M.minion=on;
  const has=re=>M.traits.some(t=>re.test(t.name||""));
  if(on){
    if(!has(/^Minion$/i))M.traits.push(T("Minion",MINION_TRAIT_TEXT));
    if(!has(/^Minion Group$/i))M.traits.push(T("Minion Group",MINION_GROUP_TEXT));
  }else{
    M.traits=M.traits.filter(t=>!/^Minion( Group)?$/i.test(t.name||""));
  }
  renderEntries();renderPreview();
}
// FP6 — optional stat-block sections are added on demand from one "＋ Add section" menu
// (replacing the old always-present enable checkboxes). Each entry: key, menu label, optional tag,
// an `is(M)` predicate for "already added", and `add/remove` actions. Custom notes are repeatable.
const SECTIONS=[
  {k:"legend",label:"Legendary Actions",is:m=>m.legend.on},
  {k:"villain",label:"Villain Actions",tag:"MCDM",is:m=>m.villain.on},
  {k:"lair",label:"Lair Actions",tag:"2014 style",is:m=>m.lair.on},
  {k:"regional",label:"Regional Effects",is:m=>m.regional.on},
  {k:"minion",label:"Minion",tag:"MCDM",is:m=>!!m.minion},
  {k:"note",label:"Custom note",repeat:true,is:()=>false},
];
const SEC_FS={legend:"fsLegend",villain:"fsVillain",lair:"fsLair",regional:"fsRegional",minion:"fsMinion",note:"fsNotes"};
function sectionShown(k){return k==="minion"?!!M.minion:k==="note"?M.notes.length>0:M[k]&&M[k].on;}
function updateSectionVis(){Object.keys(SEC_FS).forEach(k=>$("#"+SEC_FS[k]).classList.toggle("shown",sectionShown(k)));$("#addSectionRow").style.display=SECTIONS.every(s=>!s.repeat&&s.is(M))?"none":"";}
function openSectionMenu(anchor){
  const items=SECTIONS.filter(s=>s.repeat||!s.is(M));
  if(!items.length)return;
  const html=items.map(s=>`<button class="popitem" data-sec="${s.k}">${esc(s.label)}${s.tag?` <span style="color:var(--faint)">· ${esc(s.tag)}</span>`:""}</button>`).join("");
  const p=showPopover(anchor,html);
  p.querySelectorAll("[data-sec]").forEach(b=>b.addEventListener("click",()=>{closePopover();addSection(b.dataset.sec);}));
}
function addSection(k){
  if(k==="minion"){applyMinion(true);}
  else if(k==="regional"){M.regional.on=true;}
  else if(k==="note"){M.notes.push({title:"",text:""});renderNotes();}
  else if(M[k]){M[k].on=true;const intro=k==="legend"?LEGEND_INTRO:k==="villain"?VILLAIN_INTRO:LAIR_INTRO;
    if(!M[k].intro){M[k].intro=intro;const f=$(k==="legend"?"#f_legintro":k==="villain"?"#f_vilintro":"#f_lairintro");if(f)f.value=intro;}}
  updateSectionVis();renderPreview();
  const fs=$("#"+SEC_FS[k]);if(fs)fs.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function removeSection(k){
  if(k==="minion"){applyMinion(false);}
  else if(k==="note"){M.notes=[];renderNotes();}
  else if(M[k])M[k].on=false;
  updateSectionVis();renderPreview();
}
function addNote(){M.notes.push({title:"",text:""});renderNotes();updateSectionVis();renderPreview();}
function renderNotes(){
  const wrap=$("#notesList");if(!wrap)return;
  wrap.innerHTML=M.notes.map((n,i)=>`<div class="entry" data-noteblk="${i}"><div class="ehead"><input type="text" class="ename" data-note="${i}" data-nf="title" value="${esc(n.title||"")}" placeholder="Note title (optional)" autocomplete="off"><button class="iconbtn" data-noterm="${i}">✕</button></div><textarea data-note="${i}" data-nf="text" placeholder="Note text — supports bracket tokens">${esc(n.text||"")}</textarea></div>`).join("");
  wrap.querySelectorAll("[data-noterm]").forEach(b=>b.addEventListener("click",()=>{M.notes.splice(+b.dataset.noterm,1);renderNotes();updateSectionVis();renderPreview();}));
  const c=$("#cntNotes");if(c)c.textContent=M.notes.length?`(${M.notes.length})`:"";
}
const SNIPS=[["Save block","*Constitution Saving Throw:* [CON SAVE], each creature in a 15-foot Cone. *Failure:* [2d6] damage. *Success:* Half damage."],["Multiattack","[C] make[s] two attacks."]];
// Traits/bonus/reactions are always alpha-sorted; actions keep statblock/manual order
// (Multiattack first) and get move arrows, like legend/villain/lair.
const ALWAYS_SORTED=new Set(["traits","bonus","reactions"]);
const freqKind=k=>k==="actions"||k==="bonus"||k==="reactions";
// Entry name field. For Recharge/X-per-day kinds the freq "+" sits INSIDE the field (divider-
// separated, like the gear field). Type-ahead suggestions (attachCombo) bind to [data-f=name].
// Chip shown inside an imported feature's name field: source creature · book code (e.g. "Vampire · XMM").
// Its kebab opens a preview + "load chassis" menu; the chip auto-clears when the name is edited.
function srcChip(kind,i,e){if(!e._src)return"";const lbl=[e._src.n,e._src.c].filter(Boolean).join(" · ");
  return `<span class="ename-src" title="Imported from ${esc(lbl)}"><span class="src-t">${esc(lbl)}</span><button type="button" class="src-k" data-srcmenu="${kind}:${i}" title="Source options">⋯</button></span>`;}
// Locate the bestiary/chassis/preset record an imported feature came from (by name + book code).
function chipSourceMon(e){if(!e._src)return null;const n=(e._src.n||"").toLowerCase(),c=e._src.c||"";
  return [...state.lib,...CHASSIS,...enPresets()].find(m=>m&&(m.name||"").toLowerCase()===n&&(!c||srcCodeOf(m)===c))||null;}
function openChipMenu(anchor,kind,i){const e=arrFor(kind)[+i];if(!e||!e._src)return;const src=chipSourceMon(e);
  const prev=src?chassisPreviewHTML(src):`<div class="chprev-pop"><div class="refcard-meta">Source “${esc(e._src.n)}” isn't in your libraries.</div></div>`;
  const foot=src?`<div class="chip-pop-foot"><button class="btn ghost sm" data-chipload style="width:100%">Load ${esc(src.name)} as chassis →</button></div>`:"";
  const p=showPopover(anchor,`<div class="chip-pop">${prev}${foot}</div>`);
  const b=p.querySelector("[data-chipload]");if(b)b.addEventListener("click",()=>{closePopover();
    if(forgeUnsaved())chassisConflictModal(src);else applyChassis(src,false,false);});}
function nameField(kind,i,e,ph){
  const attrs=`data-k="${kind}" data-i="${i}" data-f="name" value="${esc(e.name||"")}" autocomplete="off" placeholder="${ph}"`;
  const chip=srcChip(kind,i,e);
  if(!freqKind(kind))return chip?`<span class="ename-wrap"><input type="text" class="ename" ${attrs}>${chip}</span>`:`<input type="text" class="ename" ${attrs}>`;
  return `<div class="field-action ename-fa"><input type="text" class="ename fa-input" ${attrs}>${chip}<button type="button" class="fa-btn freqbtn" data-freq="${kind}:${i}" title="Add Recharge / X-per-day to the name">＋</button></div>`;
}
function rowCtrls(kind,i){return `<button class="iconbtn" data-rm="${kind}:${i}">✕</button>`;}
// Free drag-reorder (like encounter blocks) on the manually-ordered sections only.
function dragAttr(kind,i){return `data-entry-kind="${kind}" data-entry-i="${i}"${ALWAYS_SORTED.has(kind)?"":' draggable="true" data-drag'}`;}
// Append a Recharge / X-per-day tag to an entry's TITLE (not its body); replaces any existing freq tag.
function applyFreqTag(kind,i,tag){const e=arrFor(kind)[i];const n=(e.name||"").replace(/\s*\((?:Recharge[^)]*|\d+\/Day(?:\s+each)?)\)\s*$/i,"").trim();e.name=tag?((n?n+" ":"")+tag):n;renderEntries();renderPreview();}
function openSnMenu(anchor){
  const cb=k=>$(k==="proper"?"#f_snproper":"#f_snplural");
  const item=(k,lbl,extra)=>`<button class="popitem popcheck${cb(k).checked?" on":""}" data-sn="${k}"><span class="ck">${cb(k).checked?"✓":""}</span>${lbl}${extra||""}</button>`;
  const p=showPopover(anchor,item("proper","Proper name",' <span style="color:var(--faint)">(no “the”)</span>')+item("plural","Plural"));
  p.querySelectorAll("[data-sn]").forEach(b=>b.addEventListener("click",()=>{const c=cb(b.dataset.sn);c.checked=!c.checked;c.dispatchEvent(new Event("change",{bubbles:true}));closePopover();}));
}
// Generic gear popover toggling a single hidden checkbox (Fly→hover, Blindsight→blind-beyond).
function openCheckGear(anchor,cbSel,label){const cb=$(cbSel);
  const p=showPopover(anchor,`<button class="popitem popcheck${cb.checked?" on":""}" data-ck><span class="ck">${cb.checked?"✓":""}</span>${label}</button>`);
  p.querySelector("[data-ck]").addEventListener("click",()=>{cb.checked=!cb.checked;cb.dispatchEvent(new Event("change",{bubbles:true}));closePopover();});}
function openFreqMenu(anchor,target){const[k,i]=target.split(":");const e=arrFor(k)[+i];const m=(e.name||"").match(/\((Recharge[^)]*|\d+\/Day(?:\s+each)?)\)\s*$/i);const cur=m?"("+m[1]+")":"";
  const p=showPopover(anchor,FREQ_TAGS.map(o=>`<button class="popitem${o.toLowerCase()===cur.toLowerCase()?" on":""}" data-freqv="${esc(o)}">${esc(o)}</button>`).join("")+`<div class="popsep"></div><button class="popitem" data-freqv="">None</button>`);
  p.querySelectorAll("[data-freqv]").forEach(b=>b.addEventListener("click",()=>{closePopover();applyFreqTag(k,+i,b.dataset.freqv);}));}
function dlFor(kind){return kind==="traits"?"dl-traits":kind==="bonus"?"dl-bonus":kind==="actions"?"dl-textact":"";}
function entryHTML(arr,kind){return arr.map((e,i)=>{
  if(kind==="reactions"){return `<div class="entry" ${dragAttr(kind,i)}><div class="ehead">${nameField(kind,i,e,"Name")}${rowCtrls(kind,i)}</div>
    <input type="text" placeholder="Trigger" data-k="${kind}" data-i="${i}" data-f="trigger" value="${esc(e.trigger||"")}" style="margin-bottom:6px">
    <textarea placeholder="Response" data-k="${kind}" data-i="${i}" data-f="response">${esc(e.response||"")}</textarea></div>`;}
  if(kind==="villain"){return `<div class="entry" ${dragAttr(kind,i)}><div class="ehead"><select data-k="villain" data-i="${i}" data-f="round" style="width:104px;flex:none">${[1,2,3].map(r=>`<option value="${r}" ${(+e.round||1)===r?"selected":""}>Round ${r}</option>`).join("")}</select>${nameField("villain",i,e,"Name")}<button class="iconbtn" data-rm="villain:${i}">✕</button></div>
    <textarea placeholder="Effect" data-k="villain" data-i="${i}" data-f="text">${esc(e.text||"")}</textarea></div>`;}
  if(e.mode==="spell"){const pb=pbForCR(M.cr),ab=mod(M[e.ability]||0),dc=e.dc||(8+pb+ab);return `<div class="entry" data-entry-kind="${kind}" data-entry-i="${i}" data-entry-abil="${e.ability}" draggable="true" data-drag><div class="ehead"><span class="kind">Spellcasting</span><span class="entry-dc">DC ${dc}</span>${nameField(kind,i,e,"Spellcasting")}${rowCtrls(kind,i)}</div>
    <div class="atk-fields" style="grid-template-columns:repeat(3,1fr)">
      <label class="f">Ability<select data-k="${kind}" data-i="${i}" data-f="ability">${ABILS.map(a=>`<option value="${a}" ${a===e.ability?"selected":""}>${a.toUpperCase()}</option>`).join("")}</select></label>
      <label class="f">Save DC (auto)<input type="number" placeholder="${8+pb+ab}" data-k="${kind}" data-i="${i}" data-f="dc" value="${e.dc}"></label>
      <label class="f">Spell atk (auto)<input type="number" placeholder="${sgn(pb+ab)}" data-k="${kind}" data-i="${i}" data-f="atk" value="${e.atk}"></label>
    </div>
    <div class="fs-sub" style="margin:4px 0 6px">Spell groups <span style="color:var(--faint);text-transform:none;letter-spacing:0">— each renders on its own line</span></div>
    ${(e.groups||[]).map((g,gi)=>`<div class="rowline">
      <select data-sg="${i}:${gi}:freq" style="flex:none;width:120px">${["At Will","1/Day Each","2/Day Each","3/Day Each","1/Day","2/Day","3/Day"].map(f=>`<option ${f===g.freq?"selected":""}>${f}</option>`).join("")}</select>
      <div class="chipfield sgfield" id="sgfield-${i}-${gi}"><span class="chips" id="sgchips-${i}-${gi}"></span><input type="text" class="chipinput sgci" id="sgci-${i}-${gi}" placeholder="add spell…" autocomplete="off"></div>
      <span class="libsel-wrap" title="From spell library"><button class="libsel-btn" type="button" tabindex="-1">${BOOK_SVG}</button><select class="libsel" data-spellsel="${i}:${gi}"></select></span>
      <button class="iconbtn" data-sgrm="${i}:${gi}">✕</button></div>`).join("")}
    <button class="addbtn" data-sgadd="${i}" style="width:100%;margin-top:4px">＋ Add spell group</button>
    <div class="hint" style="margin-top:6px">→ ${esc(applyRefs(spellLines(e).main))}</div></div>`;}
  if(e.mode==="attack"){return `<div class="entry" data-entry-kind="${kind}" data-entry-i="${i}" data-entry-abil="${e.ability}" draggable="true" data-drag><div class="ehead"><span class="kind">Attack</span>${nameField(kind,i,e,"Attack name")}${rowCtrls(kind,i)}</div>
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
    <div class="hint" style="margin-top:6px">→ ${esc(applyRefs(attackText(e)))}</div></div>`;}
  return `<div class="entry" ${dragAttr(kind,i)}><div class="ehead">${nameField(kind,i,e,"Name")}${rowCtrls(kind,i)}</div>
    <textarea placeholder="Description" data-k="${kind}" data-i="${i}" data-f="text">${esc(e.text||"")}</textarea>
    ${kind==="actions"?`<div class="snips">${SNIPS.map((s,si)=>`<button class="snip" data-snip="${si}" data-target="${kind}:${i}">${s[0]}</button>`).join("")}</div>`:""}</div>`;
}).join("");}
function sortEntries(kind){arrFor(kind).sort((a,b)=>(a.name||"").toLowerCase().localeCompare((b.name||"").toLowerCase()));}
function renderSgChips(ai,gi){
  const g=M.actions[ai]&&M.actions[ai].groups&&M.actions[ai].groups[gi];
  const box=$("#sgchips-"+ai+"-"+gi);if(!g||!box)return;
  const spells=g.spells?g.spells.split(",").map(s=>s.trim()).filter(Boolean):[];
  const known=n=>enSpells().some(s=>s.name.toLowerCase()===n.toLowerCase());
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
      if(["kind","ability","atk","reach","range","dice","dtype","targets","addMod","extra"].includes(f)){
        // Typing in a text/number field (ev==="input") must NOT re-render the whole list — that
        // destroys the focused input and jumps the scroll. Patch only this entry's live hint.
        if(ev==="input"){const ent=el.closest(".entry"),hint=ent&&ent.querySelector(".hint"),obj=arrFor(k)[i];
          if(hint&&obj)hint.textContent="→ "+applyRefs(obj.mode==="attack"?attackText(obj):spellLines(obj).main);}
        else renderEntries();
      }
      renderPreview();});
  });
  $$("#formCol [data-rm]").forEach(el=>el.addEventListener("click",()=>{const[k,i]=el.dataset.rm.split(":");arrFor(k).splice(+i,1);renderEntries();renderPreview();}));
  $$("#formCol [data-srcmenu]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const[k,i]=el.dataset.srcmenu.split(":");openChipMenu(el,k,+i);}));
  $$("#formCol [data-freq]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openFreqMenu(el,el.dataset.freq);}));
  // Name fields: autofill the body on commit (change), plus a type-ahead suggestion dropdown
  // whose pick imports the body too (dispatches change → autofillEntry).
  $$('#formCol [data-f="name"]').forEach(el=>{const k=el.dataset.k;
    // Editing the name forgets the imported-source chip (drop the data + the chip node, no re-render
    // so focus/caret are kept). A picked suggestion re-stamps it via autofillEntry's full re-render.
    el.addEventListener("input",()=>{const o=arrFor(k)[+el.dataset.i];if(o&&o._src){delete o._src;const c=el.parentElement.querySelector(".ename-src");if(c)c.remove();}});
    el.addEventListener("change",()=>autofillEntry(k,+el.dataset.i));
    attachCombo(el,()=>nameSuggest(k),{onPick:v=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}});});
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
  // spell group "from library" native dropdowns (grouped by source) overlaid on the book icon
  $$("#formCol select[data-spellsel]").forEach(sel=>{
    sel.innerHTML=groupedSpellOptions(enSpells()||[],"Add spell…");
    sel.addEventListener("mousedown",()=>{sel.innerHTML=groupedSpellOptions(enSpells()||[],"Add spell…");});
    sel.addEventListener("change",()=>{const[i,gi]=sel.dataset.spellsel.split(":").map(Number);const v=sel.value;sel.value="";if(!v)return;
      const g=M.actions[i]&&M.actions[i].groups&&M.actions[i].groups[gi];if(!g)return;
      const cur=g.spells?g.spells.split(",").map(s=>s.trim()).filter(Boolean):[];
      if(!cur.some(x=>x.toLowerCase()===v.toLowerCase()))cur.push(v);g.spells=cur.join(", ");renderSgChips(i,gi);renderPreview();});
  });
  bindEntryDrag();
}
// Suggestions for an entry Name field (built-in snippet names + library-harvested features).
function nameSuggest(kind){
  if(kind==="actions")return featureSuggestNames("actions",[...Object.keys(TEXT_ACTIONS),...Object.keys(ATK_PRESETS)]);
  if(kind==="traits")return featureSuggestNames("traits",Object.keys(TRAIT_SNIPS));
  if(kind==="bonus")return featureSuggestNames("bonus",Object.keys(BONUS_SNIPS));
  if(kind==="reactions")return featureSuggestNames("reactions",Object.keys(REACT_SNIPS));
  if(kind==="legend")return featureSuggestNames("legend",Object.keys(LEGEND_SNIPS));
  if(kind==="villain")return featureSuggestNames("villain",Object.keys(VILLAIN_SNIPS));
  if(kind==="lair")return featureSuggestNames("lair",Object.keys(LAIR_SNIPS));
  return [];
}
// Free drag-reorder for the manually-ordered entry sections (mirrors the encounter-block DnD).
function reorderEntryRel(kind,fromI,toI,after){
  const arr=arrFor(kind);if(fromI===toI||!arr[fromI]||!arr[toI])return;
  const item=arr[fromI],target=arr[toI];arr.splice(fromI,1);
  let idx=arr.indexOf(target);if(after)idx++;arr.splice(idx,0,item);
  renderEntries();renderPreview();
}
let dragEntry=null,entryDrop=null;
function entryDragInert(t){return !!(t&&t.closest('input,textarea,select,button,a,label,[contenteditable="true"]'));}
function clearEntryDrops(){$$("#formCol .entry.drop-before,#formCol .entry.drop-after").forEach(x=>x.classList.remove("drop-before","drop-after"));}
function bindEntryDrag(){
  $$("#formCol .entry[data-drag]").forEach(en=>{
    en.addEventListener("dragstart",ev=>{if(entryDragInert(ev.target)){ev.preventDefault();return;}
      dragEntry={kind:en.dataset.entryKind,i:+en.dataset.entryI};entryDrop=null;ev.dataTransfer.effectAllowed="move";
      try{ev.dataTransfer.setData("text/plain","e");}catch(_){}
      requestAnimationFrame(()=>en.classList.add("dragging"));});
    en.addEventListener("dragend",()=>{en.classList.remove("dragging");clearEntryDrops();dragEntry=null;entryDrop=null;});
    en.addEventListener("dragover",ev=>{if(!dragEntry||en.dataset.entryKind!==dragEntry.kind)return;
      const toI=+en.dataset.entryI;if(toI===dragEntry.i)return;ev.preventDefault();
      const r=en.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2;
      clearEntryDrops();en.classList.add(after?"drop-after":"drop-before");entryDrop={toI,after};});
    en.addEventListener("drop",ev=>{ev.preventDefault();const d=entryDrop,from=dragEntry;clearEntryDrops();
      if(d&&from)reorderEntryRel(from.kind,from.i,d.toI,d.after);});
  });
}
function expandSnip(s){const pb=pbForCR(M.cr);const best=Math.max(...ABILS.map(a=>mod(M[a])));return s.replace("{DC}",8+pb+best);}
function moveEntry(kind,i,dir){const arr=arrFor(kind),j=i+dir;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];renderEntries();renderPreview();}
function findCI(map,key){return Object.keys(map).find(k=>k.toLowerCase()===key);}
// plain-text rendering for an action snippet (text action, or an attack preset as prose)
function actionTextFor(name){if(TEXT_ACTIONS[name])return expandSnip(TEXT_ACTIONS[name]);if(ATK_PRESETS[name])return attackText(ATK(Object.assign({name},ATK_PRESETS[name])));return null;}
// FP2 — bracketize an imported feature's concrete text into our live tokens, so a library/chassis
// feature retunes to the new creature's CR/abilities on import. (Built-in snippets are already bracketed.)
function bracketize(text,srcName){
  if(!text)return text;let t=String(text);
  const AB={strength:"STR",dexterity:"DEX",constitution:"CON",intelligence:"INT",wisdom:"WIS",charisma:"CHA"};
  if(srcName&&srcName.trim()){
    const rx=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const full=srcName.trim(),words=full.split(/\s+/),last=words[words.length-1];
    // Common-noun references take an article ("the Tarkanan Ruffian" / "the ruffian"); a trailing
    // plural "s" maps to [s]. Try the full name first, then its last word (e.g. "Ruffian"→"the ruffian").
    const articled=words.length>1?[full,last]:[full];
    articled.forEach(w=>{const n=rx(w);
      t=t.replace(new RegExp("\\bThe "+n+"(s?)\\b","g"),(_,pl)=>"[C]"+(pl?"[s]":""))
         .replace(new RegExp("\\bthe "+n+"(s?)\\b","gi"),(_,pl)=>"[c]"+(pl?"[s]":""));});
    // Bare proper-name references (no article): the full name and, for multi-word names, the given
    // name (e.g. "K'thriss" from "K'thriss Drow'b"). Case-sensitive to avoid common-word collisions;
    // emitted as [c] so the sentence-start pass below promotes leading ones to [C].
    const proper=[full];
    if(words.length>1&&/^[A-Z][\w'’-]+$/.test(words[0]))proper.push(words[0]);
    proper.forEach(w=>{const n=rx(w);t=t.replace(new RegExp("\\b"+n+"(s?)\\b","g"),(_,pl)=>"[c]"+(pl?"[s]":""));});
  }
  // dice average "N (XdY ± Z)" → "[XdY±Z]"
  t=t.replace(/\b\d+\s*\(\s*(\d+\s*d\s*\d+(?:\s*[+\-]\s*\d+)?)\s*\)/gi,(_,d)=>"["+d.replace(/\s+/g,"")+"]");
  // "<Ability> Saving Throw: DC N" → keep wording, swap the DC for the token
  t=t.replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(\s+Saving\s+Throw:?\s*)DC\s*\d+/gi,(_,ab,mid)=>ab+mid+"["+AB[ab.toLowerCase()]+" SAVE]");
  // "DC N <Ability> saving throw/save" → "[ABIL SAVE] <Ability> saving throw"
  t=t.replace(/DC\s*\d+(\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(?:saving throw|save))/gi,(_,rest,ab)=>"["+AB[ab.toLowerCase()]+" SAVE]"+rest);
  // any remaining bare "DC N" → highest-ability save DC
  t=t.replace(/\bDC\s*\d+/g,"[SAVE]");
  // attack bonus → highest-ability attack
  t=t.replace(/(Attack Roll:\*?\s*)\+\d+/gi,"$1[ATK]").replace(/\+\d+\s+to hit/gi,"[ATK] to hit");
  // capitalise the creature reference at a sentence start
  t=t.replace(/(^|[.!?]\s+)\[c\]/g,"$1[C]");
  return t;
}
function bracketizeEntry(h){const ent=clone(h.e),s=h.src;
  ["text","trigger","response","extra"].forEach(f=>{if(ent[f]!=null)ent[f]=bracketize(ent[f],s);});
  // FP6 — remember where an imported feature came from, for the source chip in its name field.
  if(s)ent._src={n:s,c:h.code||""};else delete ent._src;
  return ent;}
// type-to-autofill: typing/picking a known snippet name in an entry's Name field fills its body in
function autofillEntry(kind,i){const e=arrFor(kind)[i];if(!e||!e.name)return;const key=e.name.trim().toLowerCase();
  const modeOK=h=>!(e.mode==="attack"&&h.e.mode!=="attack")&&!(e.mode==="react"&&h.e.trigger===undefined);
  const applyFull=h=>{arrFor(kind)[i]=bracketizeEntry(h);if(ALWAYS_SORTED.has(kind))sortEntries(kind);renderEntries();renderPreview();};
  const done=()=>{if(ALWAYS_SORTED.has(kind))sortEntries(kind);renderEntries();renderPreview();};
  // 1. user library (saved bestiary + uploaded presets) overrides built-in snippets of the same name
  const userHit=aggregatedUserFor(kind).get(key);if(userHit&&modeOK(userHit)){applyFull(userHit);return;}
  // 2. curated built-in snippet
  if(e.mode==="attack"){const p=findCI(ATK_PRESETS,key);if(p){Object.assign(e,clone(ATK_PRESETS[p]),{mode:"attack",name:p});done();return;}}
  else if(e.mode==="react"){const p=findCI(REACT_SNIPS,key);if(p){e.name=p;e.trigger=expandSnip(REACT_SNIPS[p].trigger);e.response=expandSnip(REACT_SNIPS[p].response);done();return;}}
  else if(kind==="actions"){const keys=[...Object.keys(TEXT_ACTIONS),...Object.keys(ATK_PRESETS)];const p=keys.find(k=>k.toLowerCase()===key);if(p){e.name=p;e.text=actionTextFor(p);done();return;}}
  else{const map=kind==="traits"?TRAIT_SNIPS:kind==="bonus"?BONUS_SNIPS:null;if(map){const p=findCI(map,key);if(p){e.name=p;e.text=expandSnip(map[p]);done();return;}}}
  // 3. any aggregated feature incl. built-in chassis (so every suggestion fills)
  const anyHit=aggregatedFor(kind).get(key);if(anyHit&&modeOK(anyHit))applyFull(anyHit);}
// B42/FP2 — aggregate same-kind features (by name) across loaded monsters; the map value keeps the
// source creature name so bracketize() can convert self-references on import.
function aggKindArr(m,kind){return kind==="traits"?m.traits:kind==="actions"?m.actions:kind==="bonus"?m.bonus:kind==="reactions"?m.reactions:kind==="legend"?(m.legend&&m.legend.items):kind==="villain"?(m.villain&&m.villain.items):kind==="lair"?(m.lair&&m.lair.items):null;}
function srcCodeOf(m){return (m&&(m._srcCode||prettySource(m._source)))||"";}
function aggMapFrom(mons,kind){const map=new Map();mons.forEach(m=>{(aggKindArr(m,kind)||[]).forEach(e=>{const nm=(e&&e.name||"").trim();if(!nm)return;const k=nm.toLowerCase();if(!map.has(k))map.set(k,{e,src:m.name||"",code:srcCodeOf(m)});});});return map;}
function aggregatedFor(kind){return aggMapFrom([...state.lib,...CHASSIS,...enPresets()],kind);}
function aggregatedUserFor(kind){return aggMapFrom([...state.lib,...enPresets()],kind);}
let aggCache={};
function refreshAggOptgroup(kind,sel){
  sel.querySelectorAll("optgroup.agg-grp").forEach(g=>g.remove());
  const map=aggregatedFor(kind);aggCache[kind]=map;if(!map.size)return;
  const og=document.createElement("optgroup");og.className="agg-grp";og.label="From bestiary";
  [...map.values()].map(v=>v.e.name).sort((a,b)=>a.localeCompare(b)).forEach(n=>{const o=document.createElement("option");o.value="agg:"+n;o.textContent=n;og.appendChild(o);});
  sel.appendChild(og);
}
function insertLib(kind,val){if(!val)return;const ci=val.indexOf(":"),pre=ci>=0?val.slice(0,ci):"",name=ci>=0?val.slice(ci+1):val;
  if(pre==="agg"){const h=aggCache[kind]&&aggCache[kind].get(name.toLowerCase());if(h){arrFor(kind).push(bracketizeEntry(h));if(ALWAYS_SORTED.has(kind))sortEntries(kind);renderEntries();renderPreview();}return;}
  if(kind==="traits")M.traits.push(T(name,expandSnip(TRAIT_SNIPS[name])));
  else if(kind==="actions"){if(pre==="atk")M.actions.push(ATK(Object.assign({name},clone(ATK_PRESETS[name]))));else M.actions.push(T(name,expandSnip(TEXT_ACTIONS[name])));}
  else if(kind==="bonus")M.bonus.push(T(name,expandSnip(BONUS_SNIPS[name])));
  else if(kind==="reactions"){const s=REACT_SNIPS[name];M.reactions.push({mode:"react",name,trigger:expandSnip(s.trigger),response:expandSnip(s.response)});}
  else if(kind==="legend")M.legend.items.push(T(name,expandSnip(LEGEND_SNIPS[name])));
  else if(kind==="lair")M.lair.items.push(T(name,expandSnip(LAIR_SNIPS[name])));
  else if(kind==="villain")M.villain.items.push({mode:"villain",round:Math.min(3,M.villain.items.length+1),name,text:expandSnip(VILLAIN_SNIPS[name])});
  if(ALWAYS_SORTED.has(kind))sortEntries(kind);renderEntries();renderPreview();}
function buildDatalist(id,names){let dl=document.getElementById(id);if(!dl){dl=document.createElement("datalist");dl.id=id;document.body.appendChild(dl);}dl.innerHTML=names.map(n=>`<option value="${esc(n)}"></option>`).join("");}
const BOOK_SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M192 576L512 576C529.7 576 544 561.7 544 544C544 526.3 529.7 512 512 512L512 445.3C530.6 438.7 544 420.9 544 400L544 112C544 85.5 522.5 64 496 64L448 64L448 233.4C448 245.9 437.9 256 425.4 256C419.4 256 413.6 253.6 409.4 249.4L368 208L326.6 249.4C322.4 253.6 316.6 256 310.6 256C298.1 256 288 245.9 288 233.4L288 64L192 64C139 64 96 107 96 160L96 480C96 533 139 576 192 576zM160 480C160 462.3 174.3 448 192 448L448 448L448 512L192 512C174.3 512 160 497.7 160 480z"/></svg>';
// FontAwesome classic/solid magnifying-glass-chart — "preview statblock" affordance on cards.
const SEARCH_CHART_SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM128 168l0 72c0 13.3 10.7 24 24 24s24-10.7 24-24l0-72c0-13.3-10.7-24-24-24s-24 10.7-24 24zm80-72l0 144c0 13.3 10.7 24 24 24s24-10.7 24-24l0-144c0-13.3-10.7-24-24-24s-24 10.7-24 24zm80 96l0 48c0 13.3 10.7 24 24 24s24-10.7 24-24l0-48c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>';
const BACK_SVG='<svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M8 2 L4 6 L8 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// Shared "preview a creature's statblock" popover, anchored to a card icon / menu item.
function showStatPreview(anchor,m){if(m)showPopover(anchor,`<div class="chip-pop">${chassisPreviewHTML(m)}</div>`);}
// A "?" affordance whose tail popover opens on hover (and click), like the forge CR / short-name help.
function bindHelpHover(btn,text){if(!btn)return;const open=e=>{e.stopPropagation();tailPopover(btn,`<div class="cr-pop">${text}</div>`);};
  btn.addEventListener("mouseenter",open);btn.addEventListener("click",open);btn.addEventListener("mouseleave",()=>closePopover());}
// Bind a card's preview icon to show the statblock on hover (and click).
function bindPreviewHover(btn,getMon){if(!btn)return;
  btn.addEventListener("mouseenter",()=>{const m=getMon();if(m)showStatPreview(btn,m);});
  btn.addEventListener("click",ev=>{ev.stopPropagation();const m=getMon();if(m)showStatPreview(btn,m);});
  btn.addEventListener("mouseleave",()=>closePopover());}
// Shared card for the add-combatant + chassis pickers: same tags row + position, with a top-right
// preview icon (matching where the bestiary card's menu sits). `srcTag` adds the source badge tag.
function pickerCardHTML(o,pickLabel,srcTag,noXP){return `<div class="card pick-card" style="cursor:default">
  <button class="card-prev" data-cardprev="${esc(o.m.id)}" title="Preview statblock" aria-label="Preview statblock">${SEARCH_CHART_SVG}</button>
  <h4>${esc(o.m.name)}</h4><div class="meta">${esc([o.m.size,o.m.type].filter(Boolean).join(" "))||"—"}</div>
  <div class="tags"><span class="tag cr">CR ${o.m.cr}</span>${noXP?"":`<span class="tag">${xpOf(o.m).toLocaleString()} XP</span>`}${srcTag?srcBadgeHTML(o):""}</div>
  <div style="margin-top:auto;padding-top:8px"><button class="btn ghost sm" data-pick="${esc(o.m.id)}" style="width:100%">${pickLabel}</button></div>
</div>`;}
// Short, human label for a preset source filename (e.g. "PHB24_Spells.md" → "PHB24").
function prettySource(s){return (s||"").replace(/\.(md|json)$/i,"").replace(/_(Spells|Conditions|Statblocks)$/i,"").replace(/_/g," ").trim()||s;}
// Native <select> options for a preset reference list (conditions), grouped by source
// (PHB, XGE…) via <optgroup>. Items are {name,_source} (or bare strings).
function groupedRefOptions(items,placeholder){
  const groups={};
  (items||[]).forEach(it=>{const name=it.name||it;const src=(it&&(it._srcCode||it._source))||"Other";(groups[src]=groups[src]||[]).push(name);});
  const srcs=Object.keys(groups).sort((a,b)=>((a==="XPHB"?0:1)-(b==="XPHB"?0:1))||a.localeCompare(b)); // XPHB pinned first
  return `<option value="">${esc(placeholder)}</option>`+srcs.map(s=>`<optgroup label="${esc(s)}">`+[...new Set(groups[s])].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("")+`</optgroup>`).join("");
}
// Spell picker options: grouped by spell level (Cantrip, Level 1…), each option labelled
// "Name (SOURCE)" so the source is visible. Value stays the bare spell name.
function groupedSpellOptions(items,placeholder){
  const byLvl={};
  (items||[]).forEach(sp=>{const lv=(sp.level==null?99:sp.level);(byLvl[lv]=byLvl[lv]||[]).push(sp);});
  const lvls=Object.keys(byLvl).map(Number).sort((a,b)=>a-b);
  const lvlLabel=lv=>lv===0?"Cantrip":lv===99?"Other":"Level "+lv;
  return `<option value="">${esc(placeholder)}</option>`+lvls.map(lv=>{
    const seen=new Set();
    const opts=byLvl[lv].slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"")).map(sp=>{
      const key=(sp.name||"")+"|"+(sp._source||"");if(seen.has(key))return "";seen.add(key);
      const code=sp._srcCode||sp._source;const src=code?` (${code})`:"";
      return `<option value="${esc(sp.name)}">${esc(sp.name)}${esc(src)}</option>`;
    }).join("");
    return `<optgroup label="${esc(lvlLabel(lv))}">${opts}</optgroup>`;
  }).join("");
}
function buildLibSelects(){
  const opt=(v,t)=>`<option value="${esc(v)}">${esc(t)}</option>`;
  const list=names=>names.map(n=>opt(n,n)).join("");
  const pre=(p,names)=>names.map(n=>opt(p+":"+n,n)).join("");
  const ls=k=>document.querySelector(`select[data-lib="${k}"]`);
  ls("traits").innerHTML=LIB_PROMPT+list(Object.keys(TRAIT_SNIPS));
  ls("actions").innerHTML=LIB_PROMPT+`<optgroup label="Attacks — guided">${pre("atk",Object.keys(ATK_PRESETS))}</optgroup><optgroup label="Text actions">${pre("txt",Object.keys(TEXT_ACTIONS))}</optgroup>`;
  ls("bonus").innerHTML=LIB_PROMPT+pre("txt",Object.keys(BONUS_SNIPS));
  ls("reactions").innerHTML=LIB_PROMPT+pre("react",Object.keys(REACT_SNIPS));
  ls("legend").innerHTML=LIB_PROMPT+list(Object.keys(LEGEND_SNIPS));
  ls("villain").innerHTML=LIB_PROMPT+list(Object.keys(VILLAIN_SNIPS));
  ls("lair").innerHTML=LIB_PROMPT+list(Object.keys(LAIR_SNIPS));
  $$("select[data-lib]").forEach(sel=>{sel.addEventListener("change",()=>{insertLib(sel.dataset.lib,sel.value);sel.value="";});sel.addEventListener("mousedown",()=>refreshAggOptgroup(sel.dataset.lib,sel));});
  const cimmSel=$("#cimm-sel");
  if(cimmSel){
    // Condition immunities exclude diseases (5etools `disease` category); XPHB is pinned first (groupedRefOptions).
    const rebuildCimmSel=()=>{cimmSel.innerHTML=groupedRefOptions((enConditions()||[]).filter(c=>c.category!=="Diseases"),"Pick condition…");};
    rebuildCimmSel();
    cimmSel.addEventListener("mousedown",rebuildCimmSel); // refresh just before the native list opens
    cimmSel.addEventListener("change",()=>{const v=cimmSel.value;if(v){const a=cimmList();if(!a.some(x=>x.toLowerCase()===v.toLowerCase()))a.push(v);M.cimm=a.join(", ");renderCimm();renderPreview();cimmSel.value="";}});
  }
  buildMonsterDatalists(); // also rebuilds the feature-name datalists
}
// Live-typing suggestions for entry Name fields: built-in snippet names PLUS every distinct
// feature harvested from loaded chassis/presets/saved monsters (B43). A library entry with the
// same name as a built-in is folded in once (built-in display kept); autofillEntry then prefers
// the library version's content. An optional modeFilter limits the aggregated half (e.g. attacks).
function featureSuggestNames(kind,builtin,modeFilter){
  const set=new Map();builtin.forEach(n=>set.set(n.toLowerCase(),n));
  aggregatedFor(kind).forEach((v,k)=>{if(modeFilter&&!modeFilter(v.e))return;if(!set.has(k))set.set(k,v.e.name);});
  return [...set.values()].sort((a,b)=>a.localeCompare(b));
}
function buildFeatureDatalists(){
  buildDatalist("dl-traits",featureSuggestNames("traits",Object.keys(TRAIT_SNIPS)));
  buildDatalist("dl-atk",featureSuggestNames("actions",Object.keys(ATK_PRESETS),e=>e.mode==="attack"));
  buildDatalist("dl-textact",featureSuggestNames("actions",[...Object.keys(TEXT_ACTIONS),...Object.keys(ATK_PRESETS)]));
  buildDatalist("dl-bonus",featureSuggestNames("bonus",Object.keys(BONUS_SNIPS)));
  buildDatalist("dl-react",featureSuggestNames("reactions",Object.keys(REACT_SNIPS)));
}
// Type / Subtype / Alignment comboboxes (B37 "combo" widget): the chevron opens a native
// <select> popup of every value (canonical + mined), while typing opens a custom styled
// suggestion dropdown — free text always allowed. Values are mined from the saved bestiary,
// built-in chassis and uploaded presets, plus a canonical seed.
const ALIGN_CANON=["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil","Unaligned","Any Alignment"];
const TYPE_CANON=["Aberration","Beast","Celestial","Construct","Dragon","Elemental","Fey","Fiend","Giant","Humanoid","Monstrosity","Ooze","Plant","Undead"];
function monsterFieldValues(field,seed){
  const pool=[...state.lib,...CHASSIS,...state.presets];
  // Case-insensitive de-dupe; the seed (canonical) is added first so its casing wins over
  // any inconsistently-cased imported value (e.g. canonical "Dragon" beats a mined "dragon").
  const byLow=new Map();
  (seed||[]).forEach(v=>{const k=v.toLowerCase();if(!byLow.has(k))byLow.set(k,v);});
  pool.forEach(m=>{const v=(m&&m[field]||"").trim();if(v){const k=v.toLowerCase();if(!byLow.has(k))byLow.set(k,v);}});
  return [...byLow.values()].sort((a,b)=>a.localeCompare(b));
}
// Shared custom suggestion dropdown for combo inputs (and, later, feature-name fields).
let _csEl=null;
function comboSuggestEl(){if(!_csEl){_csEl=document.createElement("div");_csEl.className="combo-suggest";document.body.appendChild(_csEl);}return _csEl;}
function hideComboSuggest(){if(_csEl)_csEl.style.display="none";}
function showComboSuggest(input,items,pick){
  const el=comboSuggestEl();
  if(!items.length){hideComboSuggest();return;}
  el.innerHTML=items.map(v=>`<button type="button" class="cs-item" data-v="${esc(v)}">${esc(v)}</button>`).join("");
  el.querySelectorAll(".cs-item").forEach(b=>b.addEventListener("mousedown",e=>{e.preventDefault();pick(b.dataset.v);hideComboSuggest();}));
  const r=input.getBoundingClientRect();el.style.display="block";el.style.left=r.left+"px";el.style.width=r.width+"px";
  let top=r.bottom+3;if(top+el.offsetHeight>window.innerHeight-8)top=Math.max(8,r.top-3-el.offsetHeight);
  el.style.top=top+"px";
}
// Wire a combo input: type-ahead suggestion dropdown + (if a sibling .combo-native exists)
// the chevron's native <select> populated with every value. opts.onPick(value) customises a pick.
function attachCombo(input,valuesFn,opts){
  if(!input||input._combo)return;input._combo=true;opts=opts||{};
  const pick=opts.onPick||(v=>{input.value=v;input.dispatchEvent(new Event("input",{bubbles:true}));input.focus();});
  input.addEventListener("input",()=>{const q=input.value.trim().toLowerCase();
    const items=valuesFn().filter(v=>{const l=v.toLowerCase();return l!==q&&(!q||l.includes(q));}).slice(0,12);
    showComboSuggest(input,items,pick);});
  input.addEventListener("blur",()=>setTimeout(hideComboSuggest,140));
  input.addEventListener("keydown",e=>{if(e.key==="Escape"||e.key==="Enter")hideComboSuggest();});
  const sel=input.parentElement&&input.parentElement.querySelector(".combo-native");
  if(sel){
    sel.addEventListener("mousedown",()=>{const cur=input.value;sel.innerHTML='<option value=""></option>'+valuesFn().map(v=>`<option${v===cur?" selected":""}>${esc(v)}</option>`).join("");});
    sel.addEventListener("change",()=>{if(sel.value){input.value=sel.value;input.dispatchEvent(new Event("input",{bubbles:true}));}});
  }
}
function setupIdentityCombos(){
  attachCombo($("#f_name"),()=>monsterFieldValues("name"));
  attachCombo($("#f_type"),()=>monsterFieldValues("type",TYPE_CANON));
  attachCombo($("#f_subtype"),()=>monsterFieldValues("subtype"));
  attachCombo($("#f_align"),()=>monsterFieldValues("align",ALIGN_CANON));
}
function buildMonsterDatalists(){
  buildDatalist("dl-type",monsterFieldValues("type"));
  buildDatalist("dl-subtype",monsterFieldValues("subtype"));
  buildDatalist("dl-align",monsterFieldValues("align",ALIGN_CANON));
  if(typeof buildFeatureDatalists==="function")buildFeatureDatalists(); // refresh feature name suggestions with current library
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

function loadMonster(m){
  M=normalizeMonster(clone(m));M.id=m.id;M.chassis=false;
  $("#f_name").value=M.name;$("#f_type").value=M.type;$("#f_subtype").value=M.subtype||"";$("#f_align").value=M.align||"";
  $("#f_size").value=M.size;updateCRDisplay();
  $("#f_ac").value=M._auto.ac?"":(M.ac??"");$("#f_ac").placeholder="";$("#f_acnote").value=M.acnote||"";$("#f_hp").value=M._auto.hp?"":(M.hp??"");$("#f_hp").placeholder="";$("#f_hpf").value=M.hpf||"";$("#f_init").value=M.init??"";
  paintTri($("#f_initprof"),M.initProf||"none");updateHpDie();
  $("#wb_ac").classList.toggle("suggested",!!M._auto.ac);$("#wb_hp").classList.toggle("suggested",!!M._auto.hp);
  ["walk","climb","fly","swim","burrow"].forEach(k=>$("#sp_"+k).value=M.spd[k]||"");$("#sp_hover").checked=!!M.spd.hover;
  $("#f_snword").value=(M.shortName.word==="creature"?"":M.shortName.word)||"";$("#f_snproper").checked=!!M.shortName.proper;$("#f_snplural").checked=!!M.shortName.plural;
  ["darkvision","blindsight","tremorsense","truesight"].forEach(k=>$("#se_"+k).value=M.senses[k]||"");$("#se_blindBeyond").checked=!!M.senses.blindBeyond;$("#se_other").value=M.senses.other||"";
  $("#f_dmgnote").value=M.dmgnote||"";$("#f_lang").value=M.lang||"";
  ABILS.forEach(a=>$("#ab_"+a).value=(M[a]===10?"":M[a]));
  $("#f_legintro").value=M.legend.intro||"";$("#f_vilintro").value=M.villain.intro||"";
  $("#f_lairintro").value=M.lair.intro||"";$("#f_regional").value=M.regional.text||"";
  renderNotes();updateSectionVis();
  if(M._auto.ac||M._auto.hp)applyCRAuto();
  if(M._fromChassis&&!M._chassisSig)M._chassisSig=contentSig(M); // capture the pristine chassis baseline (B43)
  refreshAbil();renderDmg();renderSkills();renderTools();renderCimm();renderGear();renderEntries();renderPreview();
  requestAnimationFrame(()=>{const fc=document.getElementById("formCol");if(fc)fc.scrollTop=0;}); // forge starts at the top
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
  // [ABIL SAVE] → save DC, [ABIL ATK] → attack/check modifier (PB + ability mod, from this creature's CR).
  // Bare [SAVE]/[ATK] (no ability) fall back to the creature's HIGHEST ability modifier.
  const pb=mon?pbForCR(mon.cr):2,abmod=a=>mon?mod(mon[a.toLowerCase()]??10):0,capw=w.charAt(0).toUpperCase()+w.slice(1);
  const bestMod=Math.max(...ABILS.map(a=>abmod(a)));
  t=t.replace(/[[{](STR|DEX|CON|INT|WIS|CHA)\s+SAVE[\]}]/gi,(_,a)=>"DC "+(8+pb+abmod(a)))
     .replace(/[[{](STR|DEX|CON|INT|WIS|CHA)\s+ATK[\]}]/gi,(_,a)=>sgn(pb+abmod(a)))
     .replace(/[[{]\s*SAVE\s*[\]}]/gi,"DC "+(8+pb+bestMod))
     .replace(/[[{]\s*ATK\s*[\]}]/gi,sgn(pb+bestMod))
     // local article override: + forces "the", - removes it (capital = capitalised first letter)
     .replace(/[[{]C\+[\]}]/g,"The "+w).replace(/[[{]c\+[\]}]/g,"the "+w).replace(/[[{]C-[\]}]/g,capw).replace(/[[{]c-[\]}]/g,w);
  return avgBrackets(t.replace(/\[C\]/g,ph(true)).replace(/\[c\]/g,ph(false)).replace(/\[Name\]/g,ph(true)).replace(/\[name\]/g,ph(false)).replace(/\[s\]/g,sfx)
    .replace(/\{C\}/g,ph(true)).replace(/\{c\}/g,ph(false)).replace(/\{Name\}/g,ph(true)).replace(/\{name\}/g,ph(false)).replace(/\{s\}/g,sfx)
    .replace(/\bThe creature\b/g,ph(true)).replace(/\bthe creature\b/g,ph(false)));}
function applyRefs(t){return applyRefsFor(M,t);}
function spellLines(e){const pb=pbForCR(M.cr),ab=mod(M[e.ability]||0);
  const dc=e.dc!==""&&e.dc!=null?Number(e.dc):8+pb+ab;
  const atk=e.atk!==""&&e.atk!=null?Number(e.atk):pb+ab;
  const abName={str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"}[e.ability||"cha"];
  const main=`[C] casts one of the following spells, requiring no Material components and using ${abName} as the spellcasting ability (spell save DC ${dc}, ${sgn(atk)} to hit with spell attacks):`;
  const groups=(e.groups||[]).filter(g=>g.spells).map(g=>({label:g.freq,spells:g.spells.split(",").map(s=>s.trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b)).join(", ")}));
  return{main,groups};}
function subName(t){return applyRefs(t);}
function fmtInline(t){return esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*([^*]+?)\*/g,"<i>$1</i>");}
function fmtBlock(t){return esc(String(t||"")).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*([^*]+?)\*/g,"<i>$1</i>").replace(/\n{2,}/g,"<br><br>").replace(/\n([-•])\s*/g,"<br><span class=\"blk-item\">").replace(/\n/g,"<br>");}
// ── Spell / condition references (Batch 14) ──────────────────────────────────
// Look up uploaded reference data by name (case-insensitive).
function findSpell(name){const n=String(name||"").trim().toLowerCase();return enSpells().find(s=>(s.name||"").toLowerCase()===n);}
function findCondition(name){const n=String(name||"").trim().toLowerCase();return enConditions().find(c=>(c.name||"").toLowerCase()===n);}
function refSpan(kind,name){return `<span class="reflink" data-ref="${kind}" data-name="${esc(name)}">${esc(name)}</span>`;}
// Linkify a comma-separated spell list; matched spells become hover/click refs.
function linkSpells(str){return String(str||"").split(",").map(tok=>{const t=tok.trim();if(!t)return "";return findSpell(t)?refSpan("spell",t):esc(t);}).filter(Boolean).join(", ");}
// Build the hover/click card body for a spell or condition.
function refContent(kind,name){
  if(kind==="spell"){const s=findSpell(name);if(!s)return "";
    const meta=s.level===0?(s.school+" cantrip"):s.level?("Level "+s.level+" "+s.school):s.school;
    const sub=[s.castingTime&&["Casting Time",s.castingTime],s.range&&["Range",s.range],s.components&&["Components",s.components],s.duration&&["Duration",s.duration]]
      .filter(Boolean).map(([k,v])=>`<b>${k}</b> ${esc(v)}`).join("<br>");
    return `<div class="refcard-h">${esc(s.name)}${srcBadge(s)}</div><div class="refcard-meta">${esc(meta)}</div>${sub?`<div class="refcard-sub">${sub}</div>`:""}${s.text?`<div class="refcard-body">${fmtBlock(s.text)}</div>`:""}`;}
  const c=findCondition(name);if(!c)return "";
  return `<div class="refcard-h">${esc(c.name)}${srcBadge(c)}</div>${c.category?`<div class="refcard-meta">${esc(c.category.replace(/s$/,""))}</div>`:""}${c.text?`<div class="refcard-body">${fmtBlock(c.text)}</div>`:""}`;}
// Source-id badge (e.g. XPHB) with the full book title as a hover tooltip when known.
function srcBadge(x){const id=x._srcCode||x.source||"";if(!id)return "";const full=x._book||"";
  return ` <span class="refcard-src"${full?` title="${esc(full)}"`:""}>${esc(id)}</span>`;}
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
  // SHOW_DERIVED gates the legacy AC/Attack/Save-DC chip row above the statblock (B23).
  // Kept (not deleted) so it can return as an opt-in "legacy" feature.
  $("#derived").innerHTML=SHOW_DERIVED?(chip("AC",acVal,acFromCR,acFromCR?"from CR target — no AC set":"")
    +chip("Attack",ab.val==null?null:sgn(ab.val),ab.cr,ab.cr?"from CR target — no attack defined":"")
    +chip("Save DC",dc.val,dc.cr,dc.cr?"from CR target — no save/spell defined":"",dc.val!=null&&dc.abil?dc.abil.toUpperCase():"")):"";
  crTargetsHTML=boh?`<b>CR ${m.cr} targets</b><br>AC ${boh[0]} · HP ${boh[1]} · Attack ${sgn(boh[2])} · Damage/round ~${boh[3]} · Save DC ${boh[4]} · best ability ${sgn(boh[5])}`:"";
  $("#forgeTitle").textContent=m.name?("Editing · "+m.name):"New Creature";
  refreshForgeStatus();
  if(previewCollapsed){const pfn=document.getElementById("pfName");if(pfn)pfn.textContent=m.name||"New Creature";}
  const initVal=initOf(m);
  const def=defenseStrings(m);
  let h=`<div class="topbar"></div><h2>${esc(m.name||"Unnamed Creature")}</h2>`;
  h+=`<div class="typeline">${esc([m.size,m.type+(m.subtype?` (${m.subtype})`:""),m.align].filter(Boolean).join(" "))||"&nbsp;"}${m.minion?` <span class="minion-tag">Minion</span>`:""}</div><hr class="rule">`;
  h+=`<div class="topstats"><p><span class="k">AC</span> ${m.ac??"—"}${m.acnote?` (${esc(m.acnote)})`:""}</p><p><span class="k">Initiative</span> ${sgn(initVal)} (${10+initVal})</p><p><span class="k">HP</span> ${m.hp??"—"}${m.hpf?` (${esc(m.hpf)})`:""}</p><p><span class="k">Speed</span> ${esc(speedStr(m))}</p></div>`;
  h+=`<table class="ab"><tr><td class="lbl"></td><td class="mh">Mod</td><td class="mh">Save</td><td class="lbl"></td><td class="mh">Mod</td><td class="mh">Save</td></tr>`;
  [["str","int"],["dex","wis"],["con","cha"]].forEach(([l,r])=>{h+="<tr>"+[l,r].map(a=>{const md=mod(m[a]),sv=md+(m.saves.includes(a)?pb:0);return `<td class="h lbl">${a.toUpperCase()} <span class="sc">${m[a]}</span></td><td class="num">${sgn(md)}</td><td class="num">${sgn(sv)}</td>`;}).join("")+"</tr>";});
  h+=`</table><hr class="rule thin"><div class="meta">`;
  if(m.skills.length)h+=`<p><span class="k">Skills</span> ${m.skills.slice().sort((a,b)=>a[0].localeCompare(b[0])).map(s=>`${s[0].replace(/_/g," ")} ${sgn(mod(m[SKILLS[s[0]]])+skProfBonus(s[1],pb))}`).join(", ")}</p>`;
  if(m.tools&&m.tools.length)h+=`<p><span class="k">Tools</span> ${esc(m.tools.slice().sort((a,b)=>a.localeCompare(b)).join(", "))}</p>`;
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
  (m.notes||[]).filter(n=>n.title||n.text).forEach(n=>h+=`<div class="sb-note">${n.title?`<div class="sb-note-h">${esc(n.title)}</div>`:""}<div class="sb-note-b">${fmtInline(applyRefs(n.text))}</div></div>`);
  $("#statblock").innerHTML=h;
  colorizeStatblock();
}
// B53: colour-code the statblock PREVIEW only (gated by settings). Works on prose paragraphs
// (.blk/.va/.sb-note-b) via a TreeWalker — never the structured header lines or the export text.
const CC_CONDITIONS=["blinded","charmed","deafened","exhaustion","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious"];
function normRoll(s){return s.replace(/\s+/g,"").replace(/−/g,"-");}
function colorizeNode(node,cats){
  const text=node.nodeValue;if(!text.trim())return;const hits=[];
  cats.forEach(cat=>{cat.re.lastIndex=0;let m;while((m=cat.re.exec(text))){hits.push({s:m.index,e:m.index+m[0].length,txt:m[0],cls:cat.cls(m),roll:cat.roll?cat.roll(m):null,rtype:cat.rtype||null});if(m.index===cat.re.lastIndex)cat.re.lastIndex++;}});
  if(!hits.length)return;
  hits.sort((a,b)=>a.s-b.s||b.e-a.e);
  const out=[];let pos=0;
  hits.forEach(h=>{if(h.s<pos)return;if(h.s>pos)out.push({t:text.slice(pos,h.s)});out.push(h);pos=h.e;});
  if(pos<text.length)out.push({t:text.slice(pos)});
  const frag=document.createDocumentFragment();
  out.forEach(o=>{if(o.t!==undefined){frag.appendChild(document.createTextNode(o.t));}else{const sp=document.createElement("span");sp.className=o.cls;sp.textContent=o.txt;if(o.roll){sp.dataset.roll=o.roll;sp.dataset.rolltype=o.rtype;}frag.appendChild(sp);}});
  node.parentNode.replaceChild(frag,node);
}
function colorizeStatblock(){
  const s=state.settings&&state.settings.colorCode;if(!s||!s.on)return;
  const root=$("#statblock");if(!root)return;
  if(s.abilityBlock)root.querySelectorAll(".ab td.num").forEach(td=>{const v=parseInt(td.textContent.replace("−","-"),10);if(isNaN(v))return;td.classList.add(v>0?"cc-mod-pos":v<0?"cc-mod-neg":"cc-mod-zero");});
  const cats=[];
  if(s.damage)cats.push({re:new RegExp("\\b("+DMG_TYPES.join("|")+")\\b","gi"),cls:m=>"cc-dmg cc-"+m[1].toLowerCase()});
  if(s.dice){
    cats.push({re:/\b\d+d\d+(?:\s*[+\-−]\s*\d+)?\b/g,cls:()=>"cc-roll",roll:m=>normRoll(m[0]),rtype:"damage"});
    cats.push({re:/([+\-−]\d+)(?=\s+to hit)/g,cls:()=>"cc-roll",roll:m=>"1d20"+normRoll(m[1]),rtype:"attack"});
    cats.push({re:/\bDC\s*\d+\b/g,cls:()=>"cc-dc"});
    cats.push({re:/\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/g,cls:()=>"cc-save"});
  }
  if(s.conditions)cats.push({re:new RegExp("\\b("+CC_CONDITIONS.join("|")+")\\b","gi"),cls:()=>"cc-cond"});
  if(s.ranges){
    cats.push({re:/\b\d+(?:\/\d+)?\s*(?:ft\.?|feet)\b/gi,cls:()=>"cc-range"});
    cats.push({re:/\b\d+-foot(?:[ \-](?:cone|cube|line|sphere|radius|emanation|cylinder))?\b/gi,cls:()=>"cc-range"});
  }
  if(!cats.length)return;
  const skip=".nm,.reflink,a,.cc-roll,.cc-dmg,.cc-cond,.cc-range,.cc-dc,.cc-save";
  root.querySelectorAll(".blk,.va,.sb-note-b").forEach(container=>{
    const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest(skip)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>colorizeNode(node,cats));
  });
  if(state.settings.clickRoll&&state.settings.clickRoll.on)root.querySelectorAll(".cc-roll[data-roll]").forEach(sp=>sp.title="Click to roll — right-click for options");
}
// ── B54 click-to-roll ───────────────────────────────────────────────────────
function syncFeatureClasses(){document.body.classList.toggle("mf-clickroll",!!(state.settings&&state.settings.clickRoll&&state.settings.clickRoll.on));}
function d(n){return 1+Math.floor(Math.random()*n);}
// Roll a formula like "1d20+7", "2d6+4", "3d6". mode adv/dis affects a lone d20; crit doubles dice.
function rollFormula(f,opts){
  opts=opts||{};const mode=opts.mode||"normal",crit=!!opts.crit;
  const norm=String(f).replace(/\s+/g,"").replace(/−/g,"-").replace(/^\+/,"");
  const terms=norm.match(/[+-]?(?:\d*d\d+|\d+)/gi)||[];
  let total=0;const parts=[];
  terms.forEach(t=>{
    const neg=t[0]==="-";const body=t.replace(/^[+-]/,"");
    if(/d/i.test(body)){
      let[n,m]=body.toLowerCase().split("d");n=Number(n||1);m=Number(m);if(!m)return;
      const count=crit?n*2:n;
      if((mode==="adv"||mode==="dis")&&m===20&&count===1){
        const a=d(20),b=d(20),keep=mode==="adv"?Math.max(a,b):Math.min(a,b);
        total+=neg?-keep:keep;parts.push(`d20(${a},${b})→${keep}`);
      }else{
        const rolls=[];for(let i=0;i<count;i++)rolls.push(d(m));
        const sum=rolls.reduce((x,y)=>x+y,0);total+=neg?-sum:sum;
        parts.push(`${count}d${m}:[${rolls.join(",")}]`);
      }
    }else{const v=Number(body);if(!isNaN(v)){total+=neg?-v:v;parts.push((neg?"−":"+")+v);}}
  });
  return {total,parts:parts.join(" ")};
}
function rollLabelFor(span){const blk=span.closest(".blk,.va,.sb-note-b");const nm=blk&&blk.querySelector(".nm");const base=nm?nm.textContent.replace(/\.\s*$/,"").trim():"Roll";const t=span.dataset.rolltype;return base+(t==="attack"?" to hit":t==="damage"?" damage":"");}
let rollLog=[],rollLogOpen=true;
function doRoll(formula,opts,label){
  const r=rollFormula(formula,opts);
  rollLog.unshift({label,total:r.total,parts:r.parts});if(rollLog.length>60)rollLog.length=60;
  rollLogOpen=true;renderRollLog();toast(`${label}: ${r.total}`);
}
function renderRollLog(){
  let el=document.getElementById("rollLog");
  if(!rollLog.length){if(el)el.remove();return;}
  if(!el){el=document.createElement("div");el.id="rollLog";el.className="roll-log";(document.querySelector(".main")||document.body).appendChild(el);}
  el.classList.toggle("open",rollLogOpen);
  el.innerHTML=`<div class="rl-head"><button class="rl-tog" id="rlTog" title="${rollLogOpen?"Collapse":"Expand"}">${rollLogOpen?"▾":"▸"}</button><span class="rl-title">Rolls</span><span class="rl-n">${rollLog.length}</span><div class="rl-grow"></div><button class="rl-clear" id="rlClear" title="Clear rolls">${TRASH_SVG}</button></div>`
    +(rollLogOpen?`<div class="rl-body">${rollLog.map(r=>`<div class="rl-row"><span class="rl-total">${r.total}</span><span class="rl-mid"><span class="rl-lbl">${esc(r.label)}</span><span class="rl-parts">${esc(r.parts)}</span></span></div>`).join("")}</div>`:"");
  el.querySelector("#rlTog").addEventListener("click",()=>{rollLogOpen=!rollLogOpen;renderRollLog();});
  el.querySelector("#rlClear").addEventListener("click",()=>{rollLog=[];renderRollLog();});
}
function openRollMenu(span){
  const f=span.dataset.roll,rtype=span.dataset.rolltype,cr=state.settings.clickRoll;
  const isD20=/(?:^|[^0-9])1?d20\b/i.test(f);
  let html=`<button class="popitem" data-rm="normal">🎲 Roll ${esc(f)}</button>`;
  if(cr.adv&&isD20)html+=`<button class="popitem" data-rm="adv">Advantage</button><button class="popitem" data-rm="dis">Disadvantage</button>`;
  if(cr.crit&&rtype==="damage")html+=`<button class="popitem" data-rm="crit">Critical hit (×2 dice)</button>`;
  if(cr.editFormula)html+=`<div class="roll-edit"><input type="text" class="roll-edit-in" value="${esc(f)}" autocomplete="off"><button class="btn primary sm" data-rm="edit" style="width:auto">Roll</button></div>`;
  const p=showPopover(span,html);
  const inp=p.querySelector(".roll-edit-in");
  p.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const mode=b.dataset.rm;const lbl=rollLabelFor(span);
    if(mode==="edit"){const v=(inp&&inp.value.trim())||f;closePopover();doRoll(v,{},lbl);return;}
    closePopover();
    if(mode==="adv")doRoll(f,{mode:"adv"},lbl+" (adv)");
    else if(mode==="dis")doRoll(f,{mode:"dis"},lbl+" (dis)");
    else if(mode==="crit")doRoll(f,{crit:true},lbl+" (crit)");
    else doRoll(f,{},lbl);
  }));
  if(inp)inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const v=inp.value.trim()||f;closePopover();doRoll(v,{},rollLabelFor(span));}});
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
    return e.name?`***${e.name}.*** ${body}`:body;};
  const sec=(t,arr)=>{const f=arr.filter(e=>e.name||e.text||e.mode==="spell");if(!f.length)return;L.push("");if(t)L.push(`### ${t}`);f.forEach(e=>L.push(line(e)));};
  sec("",m.traits);sec("Actions",m.actions);sec("Bonus Actions",m.bonus);
  if(m.reactions.some(e=>e.name)){L.push("","### Reactions");m.reactions.filter(e=>e.name).forEach(e=>L.push(`***${e.name}.*** ${e.trigger?`*Trigger:* ${applyRefs(e.trigger)} *Response:* `:""}${applyRefs(e.response||"")}`));}
  if(m.legend.on&&m.legend.items.some(e=>e.name)){L.push("","### Legendary Actions",`*${applyRefs(m.legend.intro)}*`);m.legend.items.filter(e=>e.name).forEach(e=>L.push(line(e)));}
  if(m.villain.on&&m.villain.items.some(e=>e.name)){L.push("","### Villain Actions",`*${applyRefs(m.villain.intro)}*`);[...m.villain.items].sort((a,b)=>(a.round||0)-(b.round||0)).filter(e=>e.name).forEach(e=>L.push(`**Action ${e.round}: ${e.name}.** ${applyRefs(e.text)}`));}
  if(m.lair.on&&m.lair.items.some(e=>e.name||e.text)){L.push("","### Lair Actions");if(m.lair.intro)L.push(`*${applyRefs(m.lair.intro)}*`);m.lair.items.filter(e=>e.name||e.text).forEach(e=>L.push(line(e)));}
  if(m.regional.on&&m.regional.text){L.push("","### Regional Effects",applyRefs(m.regional.text));}
  (m.notes||[]).filter(n=>n.title||n.text).forEach(n=>{L.push("","---");if(n.title)L.push(`**${n.title}**`);L.push(applyRefs(n.text));});
  return L.join("\n");
}
// Drop per-entry import metadata (the source chip's `_src`) from a monster copy, so it never
// reaches exports or the origin signature.
function stripSrc(m){[m.traits,m.actions,m.bonus,m.reactions,m.legend&&m.legend.items,m.villain&&m.villain.items,m.lair&&m.lair.items].forEach(a=>(a||[]).forEach(e=>{if(e)delete e._src;}));return m;}
function claudeMonster(m){
  const out=stripSrc(clone(m));delete out._auto;
  out.derived={pb:pbForCR(m.cr),xp:xpOf(m),speed:speedStr(m),senses:sensesStr(m),defenses:defenseStrings(m),passive_perception:passivePerc(m)};
  out.rendered_actions=m.actions.map(e=>e.mode==="spell"?{name:e.name||"Spellcasting",text:[applyRefs(spellLines(e).main),...spellLines(e).groups.map(g=>g.label+": "+applyRefs(g.spells))].join("\n")}:e.mode==="attack"?{name:e.name,text:attackText(e)}:{name:e.name,text:applyRefs(e.text)});
  const payload={forge:"monster",v:2,props:{Name:m.name,AC:m.ac,HP:m.hp,XP:xpOf(m),CR:m.cr,PB:pbForCR(m.cr)},monster:out,notion_single_column:notionSingle(m)};
  return "<<CLAUDE-FORGE / push this monster to my Notion Statblocks DB in MM25 two-column format; set AC/HP/XP properties; flag if a same-name page exists>>\n```json\n"+JSON.stringify(payload,null,2)+"\n```";
}

const VIEW_LABELS={forge:"Forge",library:"Bestiary",adventures:"Adventures",settings:"Settings"};
function setCrumbs(parts){const el=$("#crumbs");if(!el)return;el.innerHTML=parts.map((p,i)=>`<span class="${i===parts.length-1?"cur":"up"}">${esc(p)}</span>`).join('<span class="sep">›</span>');}
function switchView(v){$$("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$$(".view").forEach(s=>s.classList.toggle("active",s.id==="view-"+v));const gear=$("#settingsBtn");if(gear)gear.classList.toggle("active",v==="settings");setCrumbs([VIEW_LABELS[v]||"Forge"]);if(v==="library")renderLibrary();if(v==="adventures")renderAdvList();if(v==="settings")renderSettings();}
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
const TRASH_SVG=`<svg viewBox="0 0 448 512" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>`;
function blankCtrl(){return {q:"",filters:{},sort:{key:"name",dir:1},group:null};}
function ctrlIconButtonsHTML(desc){const allow=desc&&desc.icons;return CTRL_ICONS.filter(([k])=>!allow||allow.includes(k)).map(([k,svg,t])=>`<button class="ctrl-ico" data-ico="${k}" title="${t}" aria-label="${t}">${svg}</button>`).join("");}
function bindCtrlIcons(host,ctrl,desc,onChange){if(!host)return;host.innerHTML=ctrlIconButtonsHTML(desc);host.addEventListener("click",e=>{const b=e.target.closest("[data-ico]");if(!b)return;e.stopPropagation();openCtrlMenu(b.dataset.ico,b,ctrl,desc,onChange);});}

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
  const dft=desc.defaultSortKey||"name";if(ctrl.sort.key!==dft||ctrl.sort.dir!==1){const sk=desc.sortKeys.find(s=>s.key===ctrl.sort.key);chips.push({cls:"s",ico:ICO_SORT,txt:`${sk?sk.label:ctrl.sort.key} ${ctrl.sort.dir<0?"↓":"↑"}`,open:"sort",clear:()=>{ctrl.sort={key:dft,dir:1};}});}
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
  recs.forEach(r=>{if(p.multi){const vs=p.get(r)||[];if(!vs.length)add("∅",p.emptyLabel||"Untagged",r);else vs.forEach(v=>add(v,p.fmt?p.fmt(v):v,r));}else{const v=p.get(r);add(v??"∅",(v==null||v==="")?"—":(p.fmt?p.fmt(v):v),r);}});
  const keys=[...groups.keys()].sort(groupSorter(ctrl.group));
  let shown=0;body.innerHTML=keys.map(k=>{const g=groups.get(k),items=g.items.slice(0,Math.max(0,cap-shown));shown+=items.length;const col=opts.collapsible&&libCollapsed.has(k);const lbl=p.groupLabelHTML?p.groupLabelHTML(k,g.label):esc(g.label);return items.length?`<div class="grp${col?" collapsed":""}" data-grpkey="${esc(k)}"><div class="grp-head">${lbl}<span class="grp-n">${g.items.length}</span><button class="grp-collapse" title="${col?"Expand":"Collapse"}">▾</button></div><div class="cards">${items.map(opts.cardOf).join("")}</div></div>`:"";}).join("")+(shown<recs.length?capHint(recs.length,shown):"");
  body.querySelectorAll(".grp-head").forEach(h=>{h.addEventListener("click",e=>{if(e.target.closest(".grp-collapse")||e.target.tagName==="BUTTON"){}const grp=h.closest(".grp");const k=grp.dataset.grpkey;libCollapsed.has(k)?libCollapsed.delete(k):libCollapsed.add(k);grp.classList.toggle("collapsed",libCollapsed.has(k));const btn=h.querySelector(".grp-collapse");if(btn)btn.title=libCollapsed.has(k)?"Expand":"Collapse";});});
}
function capHint(total,shown){return `<div class="hint" style="margin-top:10px">Showing first ${shown.toLocaleString()} of ${total.toLocaleString()} — refine your search.</div>`;}

// ---- Bestiary control descriptor + records ----
function libFirstTag(r){return ((r.m.tags||[]).slice().sort((x,y)=>x.localeCompare(y))[0])||"￿";}
// Which encounters / adventures each saved monster appears in (rebuilt each renderLibrary).
let libUsage={};
function rebuildLibUsage(){libUsage={};(state.adv||[]).forEach(a=>(a.encounters||[]).forEach(e=>(e.combatants||[]).forEach(c=>{if(c.type==="monster"&&c.monsterId){const u=libUsage[c.monsterId]=libUsage[c.monsterId]||{enc:new Set(),adv:new Set()};u.enc.add(e.name||"Untitled encounter");u.adv.add(a.name||"Untitled adventure");}})));}
function usageVals(key){const s=new Set();Object.values(libUsage).forEach(u=>u[key].forEach(x=>s.add(x)));return [...s].sort((a,b)=>a.localeCompare(b));}
const LIB_DESC={search:true,group:true,
  params:[
    {key:"status",label:"Status",get:r=>r.status,values:()=>STATUS_ORDER.slice()},
    {key:"cr",label:"CR",fmt:v=>"CR "+v,get:r=>r.m.cr,values:()=>[...new Set(state.lib.map(m=>m.cr))].sort((a,b)=>(CR_NUM[a]??0)-(CR_NUM[b]??0))},
    {key:"tag",label:"Tag",multi:true,get:r=>r.m.tags||[],values:()=>[...new Set(state.lib.flatMap(m=>m.tags||[]))].sort((a,b)=>a.localeCompare(b))},
    {key:"encounter",label:"Encounter",multi:true,emptyLabel:"Not in any encounter",get:r=>r.m&&libUsage[r.m.id]?[...libUsage[r.m.id].enc]:[],values:()=>usageVals("enc")},
    {key:"adventure",label:"Adventure",multi:true,emptyLabel:"Not in any adventure",get:r=>r.m&&libUsage[r.m.id]?[...libUsage[r.m.id].adv]:[],values:()=>usageVals("adv"),
      // Group headers carry the adventure's FP4 identity colour dot.
      groupLabelHTML:(k,label)=>{if(k==="∅")return esc(label);const a=(state.adv||[]).find(x=>(x.name||"Untitled adventure")===k);return (a?advDotStatic(a.color):"")+esc(label);}},
  ],
  sortKeys:[
    {key:"name",label:"Name",cmp:(a,b)=>a.m.name.localeCompare(b.m.name)},
    {key:"cr",label:"CR",cmp:(a,b)=>(CR_NUM[a.m.cr]??0)-(CR_NUM[b.m.cr]??0)},
    {key:"status",label:"Status",cmp:(a,b)=>STATUS_ORDER.indexOf(a.status)-STATUS_ORDER.indexOf(b.status)},
    {key:"tag",label:"Tag",cmp:(a,b)=>libFirstTag(a).localeCompare(libFirstTag(b))},
  ]};
let libCtrl=blankCtrl();
const libCollapsed=new Set(); // keys of collapsed group headers
// B24: per-section collapse for the main Forge build blocks (Identity, Core stats, …).
// Persisted across loads like libCollapsed. Keyed by a slug of the section title so the
// state survives even if section order changes. The optfs blocks (Legendary/Villain/Lair/
// Regional) are excluded — they collapse via their own on/off checkbox.
const FSCOLL_KEY="mf_fscollapsed";
let fsCollapsed=new Set();try{fsCollapsed=new Set(JSON.parse(localStorage.getItem(FSCOLL_KEY))||[]);}catch(e){}
function saveFsCollapsed(){try{localStorage.setItem(FSCOLL_KEY,JSON.stringify([...fsCollapsed]));}catch(e){}}
const FS_CHEVRON='<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4 L6 8 L10 4"/></svg>';
function fsKeyOf(title){return "fsc-"+slug([...title.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join("").trim());}
function initFsCollapse(){
  $$("#formCol fieldset.fieldset:not(.optfs)").forEach(fs=>{
    const title=fs.querySelector(".fs-title");if(!title||title.querySelector(".fs-collapse"))return;
    const key=fsKeyOf(title);
    const btn=document.createElement("button");btn.type="button";btn.className="fs-collapse";btn.innerHTML=FS_CHEVRON;
    title.appendChild(btn);title.classList.add("fs-clickable");
    const apply=()=>{const c=fsCollapsed.has(key);fs.classList.toggle("fs-collapsed",c);btn.classList.toggle("closed",c);};
    apply();
    title.addEventListener("click",e=>{if(e.target.closest("input,select,textarea,a,label"))return;
      fsCollapsed.has(key)?fsCollapsed.delete(key):fsCollapsed.add(key);saveFsCollapsed();apply();});
  });
}
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
  buildTagDatalist();buildMonsterDatalists();rebuildLibUsage();
  renderCtrlChips($("#libChips"),libCtrl,LIB_DESC,renderLibrary);
  const body=$("#libBody");let recs=ctrlApply(libRecords(),libCtrl,LIB_DESC);
  if(libCtrl.group!=="source")recs=collapseVariants(recs,r=>r.preset);
  renderRecords(body,recs,libCtrl,LIB_DESC,{cardOf:r=>r.preset?presetCardHTML(r):cardHTML(r.m),emptyMsg:libEmptyMsg(),cap:400,collapsible:true});
  wireLibCards(body);
  bindSrcDrops(body,recs,renderLibrary);
}
function wireLibCards(body){
  const find=id=>state.lib.find(x=>x.id===id);
  body.querySelectorAll("[data-card]").forEach(el=>el.addEventListener("click",e=>{
    if(e.target.closest(".menu-wrap")||e.target.closest(".tags")||e.target.closest(".card-tags"))return;
    const id=el.dataset.card;
    if(e.metaKey||e.ctrlKey){e.preventDefault();toggleLibSel(id);libSelAnchor=id;return;}
    if(e.shiftKey){e.preventDefault();selectLibRange(id,body);return;}
    if(libSel.size)clearLibSel();
    loadMonster(find(id));switchView("forge");}));
  body.querySelectorAll("[data-preview]").forEach(b=>b.addEventListener("click",()=>showStatPreview(b,find(b.dataset.preview))));
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
  applyLibSelMarks(body);renderLibBatchBar();bindLibDrag(body);
}
// Bestiary multi-select (modifier-click) + batch status bar. Cmd/Ctrl-click toggles a card,
// Shift-click extends a range; a floating bar applies a status to all selected.
const libSel=new Set();let libSelAnchor=null,libDragId=null;
function applyLibSelMarks(body){body.querySelectorAll("[data-card]").forEach(el=>el.classList.toggle("selected",libSel.has(el.dataset.card)));}
function toggleLibSel(id){libSel.has(id)?libSel.delete(id):libSel.add(id);const el=document.querySelector(`#libBody [data-card="${id}"]`);if(el)el.classList.toggle("selected",libSel.has(id));renderLibBatchBar();}
function selectLibRange(id,body){const ids=[...body.querySelectorAll("[data-card]")].map(el=>el.dataset.card);const a=ids.indexOf(libSelAnchor),b=ids.indexOf(id);if(a<0||b<0){toggleLibSel(id);libSelAnchor=id;return;}const lo=Math.min(a,b),hi=Math.max(a,b);for(let i=lo;i<=hi;i++)libSel.add(ids[i]);applyLibSelMarks(body);renderLibBatchBar();}
function clearLibSel(){libSel.clear();document.querySelectorAll("#libBody .card.selected").forEach(el=>el.classList.remove("selected"));renderLibBatchBar();}
function renderLibBatchBar(){
  let bar=document.getElementById("libBatchBar");
  if(!libSel.size){if(bar)bar.remove();return;}
  if(!bar){bar=document.createElement("div");bar.id="libBatchBar";bar.className="batch-bar";document.body.appendChild(bar);}
  bar.innerHTML=`<span class="bb-n">${libSel.size} selected</span><button class="btn primary sm" id="bbStatus">Set status ▾</button><button class="btn ghost sm" id="bbClear">Clear</button>`;
  bar.querySelector("#bbStatus").addEventListener("click",e=>{e.stopPropagation();const opts=STATUSES.filter(s=>s!=="Preset");const p=showPopover(e.currentTarget,opts.map(s=>`<button class="popitem" data-s="${s}">${s}</button>`).join(""));p.querySelectorAll("[data-s]").forEach(b=>b.addEventListener("click",()=>{closePopover();batchSetStatus(b.dataset.s);}));});
  bar.querySelector("#bbClear").addEventListener("click",()=>clearLibSel());
}
function batchSetStatus(status){let n=0;libSel.forEach(id=>{const m=state.lib.find(x=>x.id===id);if(m){m.status=status;m.archived=(status==="Archived");n++;}});clearLibSel();saveLib();renderLibrary();toast(`Set ${n} to ${status}.`);}
// Drag a card onto another status group (only when grouped by status) to restatus it.
function libDragInert(t){return dragInert(t)||!!(t&&t.closest(".statchip,.tagchip,.addtag,.cardmenu,.chipx"));}
function bindLibDrag(body){
  if(libCtrl.group!=="status")return;
  const ASSIGN=["Draft","Ready","Archived"];
  body.querySelectorAll(".card[data-card]").forEach(card=>{
    card.addEventListener("dragstart",ev=>{if(libDragInert(ev.target)){ev.preventDefault();return;}libDragId=card.dataset.card;ev.dataTransfer.effectAllowed="move";try{ev.dataTransfer.setData("text/plain",libDragId);}catch(_){}requestAnimationFrame(()=>card.classList.add("dragging"));});
    card.addEventListener("dragend",()=>{card.classList.remove("dragging");libDragId=null;body.querySelectorAll(".grp.drop-into").forEach(g=>g.classList.remove("drop-into"));});
  });
  body.querySelectorAll(".grp[data-grpkey]").forEach(grp=>{
    const st=grp.dataset.grpkey;if(!ASSIGN.includes(st))return;
    grp.addEventListener("dragover",ev=>{if(!libDragId)return;ev.preventDefault();grp.classList.add("drop-into");});
    grp.addEventListener("dragleave",ev=>{if(!grp.contains(ev.relatedTarget))grp.classList.remove("drop-into");});
    grp.addEventListener("drop",ev=>{if(!libDragId)return;ev.preventDefault();grp.classList.remove("drop-into");
      const id=libDragId;libDragId=null;
      const ids=(libSel.has(id)&&libSel.size>1)?[...libSel]:[id];
      let n=0;ids.forEach(x=>{const m=state.lib.find(y=>y.id===x);if(m&&m.status!==st){m.status=st;m.archived=(st==="Archived");n++;}});
      if(n){if(libSel.size>1)clearLibSel();saveLib();renderLibrary();toast(`Moved ${n} to ${st}.`);}});
  });
}
// Small floating popover used by the status & tag-add chips.
let _pop=null;
function closePopover(){if(_pop){_pop.remove();_pop=null;document.removeEventListener("click",_popOutside,true);}}
function _popOutside(e){if(_pop&&!_pop.contains(e.target))closePopover();}
function showPopover(anchor,html){closePopover();const p=document.createElement("div");p.className="popover";p.innerHTML=html;document.body.appendChild(p);
  const r=anchor.getBoundingClientRect();let left=Math.min(r.left,window.innerWidth-p.offsetWidth-8);left=Math.max(8,left);
  let top=r.bottom+4;if(top+p.offsetHeight>window.innerHeight-8)top=Math.max(8,r.top-p.offsetHeight-4);
  // keep tall popovers fully on-screen even if neither below nor above fully fits
  if(top+p.offsetHeight>window.innerHeight-8)top=Math.max(8,window.innerHeight-8-p.offsetHeight);
  p.style.left=left+"px";p.style.top=top+"px";_pop=p;setTimeout(()=>document.addEventListener("click",_popOutside,true),0);return p;}
function openStatusMenu(m,anchor){if(!m)return;const p=showPopover(anchor,STATUSES.map(s=>`<button class="popitem${s===m.status?" on":""}" data-s="${s}">${s}</button>`).join(""));
  p.querySelectorAll("[data-s]").forEach(b=>b.addEventListener("click",()=>{closePopover();setStatus(m,b.dataset.s);}));}
function openTagAdd(m,anchor){if(!m)return;const p=showPopover(anchor,`<input type="text" class="popinput" list="libTagList" placeholder="Add or pick a tag…" autocomplete="off">`);
  const inp=p.querySelector("input");inp.focus();
  const commit=v=>{v=(v||"").replace(/,/g,"").trim();closePopover();if(v&&!(m.tags||[]).includes(v)){(m.tags=m.tags||[]).push(v);saveLib();}renderLibrary();};
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit(inp.value);}else if(e.key==="Escape")closePopover();});
  inp.addEventListener("input",()=>{if(inp.value.includes(","))commit(inp.value);});}
function setStatus(m,status){if(!m)return;m.status=status;m.archived=(status==="Archived");saveLib();renderLibrary();}
// Forge status chip — sets the working copy's status (persisted on Save to Bestiary).
let crTargetsHTML="";
function refreshForgeStatus(){const el=$("#forgeStatus");if(!el)return;el.className="tag st st-"+(M.status||"Draft")+" statchip";el.innerHTML=esc(M.status||"Draft")+' <span class="caret">▾</span>';}
function openForgeStatusMenu(anchor){const p=showPopover(anchor,STATUSES.map(s=>`<button class="popitem${s===M.status?" on":""}" data-s="${s}">${s}</button>`).join(""));
  p.querySelectorAll("[data-s]").forEach(b=>b.addEventListener("click",()=>{closePopover();M.status=b.dataset.s;refreshForgeStatus();renderPreview();}));}
// Origin chip on a bestiary card: distinguishes home-brew (created/edited here) from an entry
// loaded straight from a chassis and saved without edits (B43).
function originBadgeHTML(m){const o=originOf(m);
  return o.kind==="chassis"
    ?`<span class="tag origin chassis" title="From the ${esc(o.name)} chassis (${esc(o.src||"built-in")}) — saved without edits">${esc(o.src||"Built-in")}</span>`
    :`<span class="tag origin brew" title="Homebrew — created or edited here">⚒ Homebrew</span>`;}
function cardHTML(m){const arch=m.archived;return `<div class="card${arch?" archived":""}" data-card="${m.id}" draggable="true">
  <div class="menu-wrap cardmenu">
    <button class="kebab" data-menu="lib-${m.id}" title="More">⋯</button>
    <div class="menu" id="menu-lib-${m.id}">
      <button data-preview="${m.id}">Preview</button>
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
    ${originBadgeHTML(m)}
    <button class="tag addtag" data-addtag="${m.id}" title="Add tag">＋ tag</button>
  </div>
  <div class="card-tags">
    ${(m.tags||[]).map(t=>`<span class="tag tagchip">${esc(t)}<button class="chipx" data-rmtag="${m.id}" data-tagval="${esc(t)}" title="Remove tag">×</button></span>`).join("")}
  </div>
</div>`;}
// "Preset" status view: built-in chassis + uploaded statblock presets, de-emphasised (like
// Archived). These are reference bases — clicking one loads a fresh copy into the Forge.
function presetPool(){return [...CHASSIS.map(m=>({m,src:"Built-in"})),...enPresets().map(m=>({m,src:m._source||"Uploaded"}))];}

// Same-name visual grouping (no data merge): collapse records sharing a name into one
// representative carrying every source variant. XMM then XPHB are preferred as the default
// active variant; the source tag becomes a dropdown to switch between them.
const SRC_RANK={XMM:0,XPHB:1};
function srcOf(m){return m&&(m._srcCode||m._source)||"";}
function srcRank(s){const k=(s||"").toUpperCase();return k in SRC_RANK?SRC_RANK[k]:50;}
const variantSel=new Map(); // name(lowercased) -> chosen variant src
function collapseVariants(recs,canMerge){
  const seen=new Map(),out=[];
  recs.forEach(r=>{
    if(canMerge&&!canMerge(r)){out.push(r);return;}
    const key=(r.m.name||"").toLowerCase();
    if(seen.has(key)){seen.get(key).variants.push(r);return;}
    const rep=Object.assign({},r,{variants:[r]});seen.set(key,rep);out.push(rep);
  });
  out.forEach(rep=>{if(rep.variants&&rep.variants.length>1){
    rep.variants.sort((a,b)=>srcRank(srcOf(a.m))-srcRank(srcOf(b.m))||String(a.src).localeCompare(String(b.src)));
    const chosen=variantSel.get((rep.m.name||"").toLowerCase());
    const active=rep.variants.find(v=>String(v.src)===chosen)||rep.variants[0];
    rep.m=active.m;rep.src=active.src;}});
  return out;
}
function srcLbl(s){return s==="Built-in"?"Built-in":prettySource(s);}
function srcBadgeHTML(o){
  const vs=o.variants||[o],built=o.src==="Built-in";
  if(vs.length<2)return `<span class="src-badge${built?" built":""}">${esc(srcLbl(o.src))}</span>`;
  return `<button type="button" class="src-badge srcdrop${built?" built":""}" data-srcdrop="${esc(o.m.name||"")}" title="${vs.length} sources — click to switch">${esc(srcLbl(o.src))} ▾</button>`;
}
function bindSrcDrops(body,recs,redraw){
  body.querySelectorAll("[data-srcdrop]").forEach(btn=>btn.addEventListener("click",e=>{
    e.stopPropagation();e.preventDefault();
    const key=btn.dataset.srcdrop.toLowerCase();
    const rep=recs.find(r=>r.variants&&r.variants.length>1&&(r.m.name||"").toLowerCase()===key);
    if(!rep)return;
    const p=showPopover(btn,rep.variants.map(v=>`<button class="popitem${String(v.src)===String(rep.src)?" on":""}" data-srcv="${esc(String(v.src))}">${esc(srcLbl(v.src))} <span style="color:var(--faint);font-size:11px">CR ${esc(v.m.cr)}</span></button>`).join(""));
    p.querySelectorAll("[data-srcv]").forEach(b=>b.addEventListener("click",ev=>{ev.stopPropagation();variantSel.set(key,b.dataset.srcv);closePopover();redraw();}));
  }));
}
function presetCardHTML(o){const m=o.m;return `<div class="card preset" data-pick="${esc(m.id)}" title="Use as base">
  ${srcBadgeHTML(o)}
  <h4>${esc(m.name)}</h4><div class="meta">${esc([m.size,m.type].filter(Boolean).join(" "))||"—"}</div>
  <div class="tags"><span class="tag cr">CR ${m.cr}</span><span class="tag st st-Preset">Preset</span></div>
</div>`;}
bindCtrlIcons($("#libCtrlIcons"),libCtrl,LIB_DESC,renderLibrary);
// True when the Forge holds content that differs from its saved Bestiary copy (or was never saved).
function forgeUnsaved(){if(!monsterDirty())return false;const saved=state.lib.find(x=>x.id===M.id);return !saved||contentSig(M)!==contentSig(saved);}
function startFreshMonster(){const go=()=>{loadMonster(blankMonster());switchView("forge");};
  if(forgeUnsaved())confirmModal("Start a new creature? The current Forge has unsaved changes that will be lost.",go);else go();}
$("#libNew").addEventListener("click",startFreshMonster);
$("#libChassis").addEventListener("click",()=>openChassis());
$("#forgeChassis").addEventListener("click",()=>openChassis(true));
$("#forgePaste").addEventListener("click",openImportModal);
$("#clearForge").addEventListener("click",()=>confirmModal("Clear the Forge? Any unsaved edits to this creature will be lost.",()=>{loadMonster(blankMonster());toast("Cleared.");}));

$("#saveMonster").addEventListener("click",async()=>{
  if(!validName())return;
  const rec=clone(M);rec.chassis=false;rec._savedAt=Date.now();
  const i=state.lib.findIndex(x=>x.id===rec.id);
  if(i>=0)state.lib[i]=rec;else state.lib.unshift(rec);
  await saveLib();
  if(pendingForge){const a=state.adv.find(x=>x.id===pendingForge.advId);const e=a&&a.encounters.find(x=>x.id===pendingForge.encId);
    if(e){a._focusEnc=e.id;addMonsterCombatant(e,rec.id);await saveAdv();}
    const pf=pendingForge;pendingForge=null;hideBanner();toast("Saved & added to encounter.");state.selAdv=pf.advId;switchView("adventures");return;}
  toast(i>=0?"Updated in Bestiary.":"Saved to Bestiary.");
});
$("#pushClaude").addEventListener("click",()=>{if(!validName())return;copyModal("Copy for Claude",claudeMonster(M),"Paste in chat — I build the Notion page in MM25 format and set its properties.");});
$("#copyNotion").addEventListener("click",()=>{if(!validName())return;copyModal("Copy for Notion (manual)",notionSingle(M),"Single-column, paste-safe. Set AC/HP/XP properties by hand.");});
$("#forgeSaveFab").addEventListener("click",()=>$("#saveMonster").click());
$("#forgeStatus").addEventListener("click",e=>{e.stopPropagation();openForgeStatusMenu(e.currentTarget);});
// Popover with a balloon "tail" pointing at the anchor icon, centred horizontally over it.
function tailPopover(anchor,html){const p=showPopover(anchor,html);p.classList.add("tail-pop");const ar=anchor.getBoundingClientRect();const pr=p.getBoundingClientRect();const below=pr.top>=ar.bottom-1;p.classList.toggle("tail-up",below);p.classList.toggle("tail-down",!below);let left=ar.left+ar.width/2-pr.width/2;left=Math.max(8,Math.min(left,window.innerWidth-pr.width-8));p.style.left=left+"px";p.style.setProperty("--tail-x",(ar.left+ar.width/2-left)+"px");return p;}
function showCrHelp(anchor){tailPopover(anchor,`<div class="cr-pop">${crTargetsHTML||"Set a Challenge Rating to see its AC / HP / attack / DC targets."}</div>`);}
$("#crHelp").addEventListener("click",e=>{e.stopPropagation();showCrHelp(e.currentTarget);});
$("#crHelp").addEventListener("mouseenter",e=>showCrHelp(e.currentTarget));
$("#crHelp").addEventListener("mouseleave",()=>closePopover());
const SN_HELP="The noun used for 'the ___' references in text — e.g. set it to 'dragon' and [c] becomes 'the dragon'. Turn on Proper name to drop the article.";
function showSnHelp(anchor){tailPopover(anchor,`<div class="cr-pop">${SN_HELP}</div>`);}
$("#snHelp").addEventListener("click",e=>{e.stopPropagation();showSnHelp(e.currentTarget);});
$("#snHelp").addEventListener("mouseenter",e=>showSnHelp(e.currentTarget));
$("#snHelp").addEventListener("mouseleave",()=>closePopover());

function monsterDirty(){const m=M;
  if(m.name.trim()||m.type||m.subtype||m.align||m.acnote||m.hpf||m.gear||m.dmgnote||m.cimm)return true;
  if((m.ac!=null&&!m._auto.ac)||(m.hp!=null&&!m._auto.hp)||(m.init!==""&&m.init!=null))return true;
  if((m.lang||"Common")!=="Common"||m.cr!=="1")return true;
  if(ABILS.some(a=>m[a]!==10))return true;
  if(m.saves.length||m.skills.length||Object.keys(m.dmg).length)return true;
  if(m.traits.length||m.actions.length||m.bonus.length||m.reactions.length)return true;
  if(m.legend.on||m.villain.on||m.lair.on||m.regional.on)return true;
  if((m.notes||[]).some(n=>n.title||n.text))return true;
  const sp=m.spd;if(sp.walk!==30||sp.climb||sp.fly||sp.swim||sp.burrow||sp.hover)return true;
  const se=m.senses;if(se.darkvision||se.blindsight||se.tremorsense||se.truesight||se.other||se.blindBeyond)return true;
  if((m.shortName.word||"creature")!=="creature"||m.shortName.proper||m.shortName.plural)return true;
  return false;}
// B43 — origin tracking: a monster loaded straight from a chassis carries `_fromChassis`
// (the chassis name) plus `_chassisSig`, a content signature captured at load. A bestiary
// entry counts as "from chassis (unedited)" only while its current content still matches that
// signature; the first edit flips it to home-brew. Bestiary meta (status/tags/archive) is
// excluded from the signature so re-statusing doesn't change the origin.
const SIG_SKIP=["id","status","tags","archived","chassis","_auto","_fromChassis","_fromSrc","_chassisSig","sort","_preset","_source","_srcCode","_book","_group","_legGroup","_savedAt"];
function contentSig(m){const c=stripSrc(clone(m));SIG_SKIP.forEach(k=>delete c[k]);return JSON.stringify(c);}
function originOf(m){return (m&&m._fromChassis&&m._chassisSig&&contentSig(m)===m._chassisSig)?{kind:"chassis",name:m._fromChassis,src:m._fromSrc||""}:{kind:"brew"};}
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
  if((m.notes||[]).some(n=>n.title||n.text))out.notes=clone(m.notes);
  const sp=m.spd;if(sp.walk!==30||sp.climb||sp.fly||sp.swim||sp.burrow||sp.hover)out.spd=clone(sp);
  const se=m.senses;if(se.darkvision||se.blindsight||se.tremorsense||se.truesight||se.other||se.blindBeyond)out.senses=clone(se);
  if((m.shortName.word||"creature")!=="creature"||m.shortName.proper||m.shortName.plural)out.shortName=clone(m.shortName);
  return out;}
// A fresh home-brew monster derived from a chassis (origin tracking stamped, preset markers dropped).
function chassisToMonster(ch,id){const b=clone(ch);b.id=id||uid();b.chassis=false;b._auto={ac:false,hp:false};
  b._fromChassis=ch.name;b._fromSrc=ch._srcCode||(ch._source?prettySource(ch._source):"")||"";
  delete b._chassisSig;delete b._preset;delete b._source;return b;}
// Compact statblock preview for a chassis/preset (shown in a popover before picking it).
function chassisPreviewHTML(m){
  const pb=pbForCR(m.cr),abil=ABILS.map(a=>`${a.toUpperCase()} ${sgn(mod(m[a]))}`).join(" · ");
  const names=arr=>(arr||[]).map(e=>e&&e.name).filter(Boolean);
  const sec=(lbl,arr)=>names(arr).length?`<div class="blk-item"><b>${lbl}:</b> ${esc(names(arr).join(", "))}</div>`:"";
  return `<div class="chprev-pop"><div class="refcard-h">${esc(m.name)}${m._srcCode?` <span class="refcard-src">${esc(m._srcCode)}</span>`:""}</div>
    <div class="refcard-meta">${esc([m.size,m.type,m.align].filter(Boolean).join(" "))||"—"}</div>
    <div class="refcard-sub"><b>AC</b> ${m.ac??"—"} · <b>HP</b> ${m.hp??"—"} · <b>CR</b> ${m.cr} (${xpOf(m).toLocaleString()} XP) · <b>PB</b> ${sgn(pb)}</div>
    <div class="refcard-body"><div class="blk-item">${abil}</div>${sec("Traits",m.traits)}${sec("Actions",m.actions)}${sec("Bonus",m.bonus)}${sec("Reactions",m.reactions)}</div></div>`;
}
function applyChassis(ch,keepId,merge){
  const base=merge?mergeChassis(ch):chassisToMonster(ch,(keepId&&M)?M.id:uid());
  if(merge){delete base._preset;delete base._source;}
  loadMonster(base);switchView("forge");toast("Loaded chassis — edit & save.");
}
// Add-from-chassis: build the bestiary entry from a chassis, save it, and drop it into the encounter
// without a trip through the Forge.
function openChassisForEncounter(a,e,fromPicker){
  if(!e)return;
  openChassis(false,{onBack:fromPicker?(()=>openBestiaryPicker(a,e)):null,onPick:ch=>{const rec=normalizeMonster(chassisToMonster(ch));rec._savedAt=Date.now();
    a._focusEnc=e.id;state.lib.unshift(rec);saveLib();addMonsterCombatant(e,rec.id);saveAdv();renderEncList(a);
    closeModal();toast(`Added “${rec.name}” — saved to Bestiary.`);}});
}
function findChassis(id){return CHASSIS.find(x=>x.id===id)||enPresets().find(x=>x.id===id);}
function openChassis(fromForge,opts){
  opts=opts||{};
  const ctrl=blankCtrl();ctrl.sort.key="cr";
  const chPool=()=>[...CHASSIS.map(m=>({m,src:"Built-in"})),...enPresets().map(m=>({m,src:m._source||"Uploaded"}))];
  const desc={search:true,group:true,
    params:[
      {key:"source",label:"Source",get:r=>r.src,values:()=>["Built-in",...presetSources().map(s=>s.name)]},
      {key:"cr",label:"CR",fmt:v=>"CR "+v,get:r=>r.m.cr,values:()=>[...new Set(chPool().map(r=>r.m.cr))].sort((a,b)=>(CR_NUM[a]??0)-(CR_NUM[b]??0))},
    ],
    sortKeys:[
      {key:"cr",label:"CR",cmp:(a,b)=>(CR_NUM[a.m.cr]??0)-(CR_NUM[b.m.cr]??0)},
      {key:"name",label:"Name",cmp:(a,b)=>a.m.name.localeCompare(b.m.name)},
    ]};
  const forEnc=!!opts.onPick;
  const helpText=(forEnc?"Picks a base, saves it to your Bestiary, and adds it to the encounter. ":"")+"Generic built-in bases plus any preset libraries you've uploaded. PB/XP/save math is exact; flavor stats are starting points — reskin freely.";
  openModalRaw(`<h3 class="modal-h-row">${opts.onBack?`<button class="modal-back" id="chBack" title="Back" aria-label="Back">${BACK_SVG}</button>`:""}<span>${forEnc?"Add from a chassis":"Start from a chassis"}</span><button class="cr-help" id="chHelp" aria-label="About this picker">?</button></h3>
    <div class="ctrl-icons" id="chCtrlIcons"></div>
    <div class="ctrl-chips" id="chChips"></div>
    <div id="chBody"></div>`);
  if(opts.onBack)$("#chBack").addEventListener("click",()=>{closeModal();opts.onBack();});
  bindHelpHover($("#chHelp"),helpText);
  const pickLabel=forEnc?"Add to encounter":"Use as base";
  const cardOf=o=>pickerCardHTML(o,pickLabel,true,true);
  function draw(){
    renderCtrlChips($("#chChips"),ctrl,desc,draw);
    const body=$("#chBody");let recs=ctrlApply(chPool(),ctrl,desc);
    if(ctrl.group!=="source")recs=collapseVariants(recs);
    renderRecords(body,recs,ctrl,desc,{cardOf,emptyMsg:`No matches.${state.presets.length?"":" Upload 5etools .json libraries from the sidebar (“Preset libraries”) to add more bases."}`,cap:200});
    bindSrcDrops(body,recs,draw);
    body.querySelectorAll("[data-cardprev]").forEach(b=>bindPreviewHover(b,()=>findChassis(b.dataset.cardprev)));
    body.querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>{const ch=findChassis(b.dataset.pick);if(!ch)return;
      if(opts.onPick){opts.onPick(ch);return;}
      closeModal();
      if(fromForge===true&&monsterDirty())chassisConflictModal(ch);else applyChassis(ch,fromForge===true,false);}));
  }
  bindCtrlIcons($("#chCtrlIcons"),ctrl,desc,draw);
  draw();
}
// Re-render the chassis/spell/condition pools after a library is toggled or removed.
function refreshLibPools(){if(typeof buildSpellDatalist==="function")buildSpellDatalist();if(typeof buildCondDatalist==="function")buildCondDatalist();if(typeof buildMonsterDatalists==="function")buildMonsterDatalists();}
function removeLib(kind,name){
  if(kind==="spell"){state.spells=state.spells.filter(x=>x._source!==name);saveSpells();}
  else if(kind==="condition"){state.conditions=state.conditions.filter(x=>x._source!==name);saveConditions();}
  else{state.presets=state.presets.filter(x=>x._source!==name);savePresets();}
  const i=state.disabledLibs.indexOf(libKey(kind,name));if(i>=0){state.disabledLibs.splice(i,1);saveDisabled();}
  presetSel.delete(libKey(kind,name));
}
// Remove a reference sheet (books / legendary groups). Already-applied book labels and
// lair/regional stay on imported presets; this just stops future application.
function removeReference(k){
  if(k==="books"){state.books={};delete state.refMeta.books;saveBooks();saveRefMeta();reannotateBooks();}
  else if(k==="leg"){state.legendaryGroups={};delete state.refMeta.legGroups;saveLegGroups();saveRefMeta();}
  presetModal();
}
const GROUP_LABELS={core:"Core",supplement:"Supplements","supplement-alt":"Supplements (alt)",setting:"Settings","setting-alt":"Settings (alt)",adventure:"Adventures",screen:"Screens","organized-play":"Organized Play",other:"Other"};
const groupLabel=g=>g?(GROUP_LABELS[g]||g.replace(/(^|[-\s])\w/g,c=>c.toUpperCase()).replace(/-/g," ")):"Ungrouped";
const PRESET_HINT="Upload native 5etools <code>.json</code> files — <b>bestiary</b> (chassis bases), <b>spells</b>, <b>conditions</b>, a <b>books.json</b> reference sheet (full titles + groups), or <b>legendarygroups.json</b> (lair actions &amp; regional effects). The kind is auto-detected. Everything is parsed in your browser and stored only on this device — never sent to the cloud or committed to the repo. Tick a library and use the actions to enable, disable, or remove it; a disabled library is hidden from the app but kept on disk.";
let presetCtrl=blankCtrl();presetCtrl.group="group";
const presetSel=new Set();
function prUpdateSelUI(){
  const modal=$("#modal");if(!modal)return;
  modal.querySelectorAll(".preset-row").forEach(row=>{const on=presetSel.has(libKey(row.dataset.kind,row.dataset.name));row.classList.toggle("picked",on);const cb=row.querySelector(".lib-sel");if(cb)cb.checked=on;});
  modal.querySelectorAll(".lib-grp").forEach(grp=>{const rows=[...grp.querySelectorAll(".preset-row")];const sel=rows.filter(r=>presetSel.has(libKey(r.dataset.kind,r.dataset.name))).length;const cb=grp.querySelector(".grp-sel");if(cb){cb.checked=rows.length>0&&sel===rows.length;cb.indeterminate=sel>0&&sel<rows.length;}});
  const act=$("#prActions"),n=presetSel.size;if(act){act.classList.toggle("show",n>0);const s=act.querySelector(".sel-n");if(s)s.textContent=n+" selected";
    const tog=act.querySelector("#prToggle");if(tog){const keys=[...presetSel],on=keys.filter(k=>{const p=splitLibKey(k);return isLibEnabled(p[0],p[1]);}).length;
      tog.checked=keys.length>0&&on===keys.length;tog.indeterminate=on>0&&on<keys.length;}}
}
function splitLibKey(k){const i=k.indexOf(LIBSEP);return[k.slice(0,i),k.slice(i+LIBSEP.length)];}
function presetModal(){
  const libs=presetLibraries();
  const live=new Set(libs.map(L=>libKey(L.kind,L.name)));[...presetSel].forEach(k=>{if(!live.has(k))presetSel.delete(k);});
  const desc={search:true,group:true,
    params:[
      {key:"type",label:"Type",fmt:v=>KIND_LABEL[v]||v,get:r=>r.lib.kind,values:()=>[...new Set(libs.map(L=>L.kind))]},
      {key:"group",label:"Category",fmt:v=>groupLabel(v),get:r=>r.lib.group||"",values:()=>[...new Set(libs.map(L=>L.group).filter(Boolean))].sort((a,b)=>groupLabel(a).localeCompare(groupLabel(b)))},
    ],
    sortKeys:[
      {key:"name",label:"Name",cmp:(a,b)=>a.m.name.localeCompare(b.m.name)},
      {key:"type",label:"Type",cmp:(a,b)=>(KIND_LABEL[a.lib.kind]||"").localeCompare(KIND_LABEL[b.lib.kind]||"")},
      {key:"group",label:"Category",cmp:(a,b)=>groupLabel(a.lib.group).localeCompare(groupLabel(b.lib.group))},
    ]};
  let recs=libs.map(L=>({m:{name:(L.book||L.name),type:KIND_LABEL[L.kind]},lib:L}));
  recs=ctrlApply(recs,presetCtrl,desc);
  // group the filtered rows by the active group-by control (None / Type / Group)
  const gk=presetCtrl.group,gmap=new Map();
  recs.forEach(r=>{let key,label;
    if(gk==="type"){key="t:"+r.lib.kind;label=KIND_LABEL[r.lib.kind]||r.lib.kind;}
    else if(gk==="group"){key="g:"+(r.lib.group||"");label=groupLabel(r.lib.group);}
    else{key="__all";label="All libraries";}
    if(!gmap.has(key))gmap.set(key,{label,items:[]});gmap.get(key).items.push(r.lib);});
  const order=["core","supplement","supplement-alt","setting","setting-alt","adventure","screen","organized-play","other",""];
  let grpKeys=[...gmap.keys()];
  if(gk==="group")grpKeys.sort((a,b)=>{const ga=a.slice(2),gb=b.slice(2),ia=order.indexOf(ga),ib=order.indexOf(gb);return (ia<0?99:ia)-(ib<0?99:ib)||gmap.get(a).label.localeCompare(gmap.get(b).label);});
  else grpKeys.sort((a,b)=>gmap.get(a).label.localeCompare(gmap.get(b).label));
  let h=`<h3 class="modal-title">Preset libraries<button class="help-btn" id="prHelp" title="About preset libraries" aria-label="About">?</button></h3>`;
  h+=`<div class="lib-toolbar"><div class="ctrl-chips" id="prChips"></div><div class="ctrl-icons" id="prCtrlIcons"></div></div>`;
  h+=`<div class="lib-actions" id="prActions"><span class="sel-n"></span><label class="switch" title="Enable / disable selected"><input type="checkbox" id="prToggle"><span class="sl"></span></label><button class="binbtn" id="prRemove" title="Remove selected">${TRASH_SVG}</button></div>`;
  h+=`<div class="lib-scroll">`;
  if(!libs.length)h+=`<div class="empty-state" style="padding:26px">No preset libraries uploaded yet.</div>`;
  else if(!recs.length)h+=`<div class="empty-state" style="padding:26px">No libraries match these filters.</div>`;
  else h+=grpKeys.map(k=>{const g=gmap.get(k);
    const sel=g.items.filter(L=>presetSel.has(libKey(L.kind,L.name))).length,allOn=sel===g.items.length;
    return `<div class="lib-grp" data-grpkey="${esc(k)}"><div class="lib-grp-head"><span class="lib-grp-name">${esc(g.label)}</span><span class="grp-n">${g.items.length}</span><label class="lib-check grp" title="Select all in group"><input type="checkbox" class="grp-sel"${allOn?" checked":""}></label></div>`
      +g.items.map(L=>{const isSel=presetSel.has(libKey(L.kind,L.name));
        const sub=[L.group?groupLabel(L.group):"",L.count.toLocaleString()+" entries",(L.book?esc(L.name):"")].filter(Boolean).join(" · ");
        return `<div class="preset-row${L.enabled?"":" off"}${isSel?" picked":""}" data-kind="${esc(L.kind)}" data-name="${esc(L.name)}"><div class="lib-meta"><div class="lib-title"><b>${esc(L.book||L.name)}</b><span class="kind-badge k-${esc(L.kind)}">${KIND_LABEL[L.kind]}</span>${L.enabled?"":'<span class="off-badge">Off</span>'}</div><div class="hint lib-sub">${sub}</div></div><label class="lib-check" title="Select"><input type="checkbox" class="lib-sel"${isSel?" checked":""}></label></div>`;}).join("")
      +`</div>`;}).join("");
  h+=`</div>`;
  // reference sheets — subdued, outside any grouping
  const refs=[];
  if(state.refMeta.books&&Object.keys(state.books).length)refs.push({k:"books",label:"Book reference",file:state.refMeta.books.file,count:Object.keys(state.books).length,unit:"sources"});
  if(state.refMeta.legGroups&&Object.keys(state.legendaryGroups).length)refs.push({k:"leg",label:"Legendary groups",file:state.refMeta.legGroups.file,count:Object.keys(state.legendaryGroups).length,unit:"groups"});
  if(refs.length)h+=`<div class="lib-refs">`+refs.map(r=>`<div class="lib-ref"><span class="ref-meta">${esc(r.label)} · ${r.count.toLocaleString()} ${r.unit}<span class="hint"> · ${esc(r.file)}</span></span><button class="ref-x" data-refx="${esc(r.k)}" title="Remove reference">✕</button></div>`).join("")+`</div>`;
  h+=`<div class="lib-foot"><button class="btn ghost sm" id="prClose" style="width:auto">Close</button><button class="btn primary sm" id="prAdd" style="width:auto">＋ Upload .json files</button></div>`;
  openModalRaw(`<div class="preset-mgr">${h}</div>`);
  bindCtrlIcons($("#prCtrlIcons"),presetCtrl,desc,presetModal);
  renderCtrlChips($("#prChips"),presetCtrl,desc,presetModal);
  $("#prClose").addEventListener("click",closeModal);
  $("#prAdd").addEventListener("click",()=>$("#mdIn").click());
  {const ph=$("#prHelp"),openPh=e=>{e.stopPropagation();showPopover(ph,`<div class="help-pop">${PRESET_HINT}</div>`);};
    ph.addEventListener("mouseenter",openPh);ph.addEventListener("click",openPh);ph.addEventListener("mouseleave",()=>closePopover());}
  $("#modal").querySelectorAll("[data-refx]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.refx;confirmStack(`Remove this reference sheet?`,()=>removeReference(k));}));
  $("#modal").querySelectorAll(".lib-sel").forEach(cb=>cb.addEventListener("change",()=>{const row=cb.closest(".preset-row"),key=libKey(row.dataset.kind,row.dataset.name);if(cb.checked)presetSel.add(key);else presetSel.delete(key);prUpdateSelUI();}));
  $("#modal").querySelectorAll(".grp-sel").forEach(cb=>cb.addEventListener("change",()=>{cb.closest(".lib-grp").querySelectorAll(".preset-row").forEach(row=>{const key=libKey(row.dataset.kind,row.dataset.name);if(cb.checked)presetSel.add(key);else presetSel.delete(key);});prUpdateSelUI();}));
  // Toggle reflects the selection's combined state: on=all enabled, off=all disabled,
  // mid (indeterminate)=mixed. A click enables all unless they're already all enabled.
  $("#prToggle").addEventListener("change",()=>{const keys=[...presetSel];if(!keys.length)return;
    const allOn=keys.every(k=>{const p=splitLibKey(k);return isLibEnabled(p[0],p[1]);});const target=!allOn;
    keys.forEach(k=>{const p=splitLibKey(k);setLibEnabled(p[0],p[1],target);});refreshLibPools();presetModal();});
  $("#prRemove").addEventListener("click",()=>{const keys=[...presetSel],n=keys.length;if(!n)return;
    confirmStack(`Remove ${n} selected ${n===1?"library":"libraries"}? Their presets are deleted from this device.`,()=>{keys.forEach(k=>{const p=splitLibKey(k);removeLib(p[0],p[1]);});refreshLibPools();presetModal();});});
  $("#modal").querySelectorAll(".grp-sel").forEach(c=>{const grp=c.closest(".lib-grp"),rows=[...grp.querySelectorAll(".preset-row")],sel=rows.filter(r=>presetSel.has(libKey(r.dataset.kind,r.dataset.name))).length;c.indeterminate=sel>0&&sel<rows.length;});
  prUpdateSelUI();
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

function aiMenu(a){return `<div class="menu-wrap" style="flex:none"><button class="ai-kbtn" data-menu="aim-${a.id}" title="Options">⋯</button><div class="menu" id="menu-aim-${a.id}"><button data-aim-dup="${a.id}">Duplicate</button><button data-aim-arch="${a.id}">${a.archived?"Unarchive":"Archive"}</button><div class="sep"></div><button class="danger" data-aim-del="${a.id}">Delete</button></div></div>`;}
// FP4 — per-adventure color identity. Curated palette that reads well on the dark theme.
const ADV_COLORS=["#e2654d","#e08b3f","#d9a941","#ccc24a","#9fb84a","#6aa84f","#4caf7d","#4db6ac","#45a7bf","#5b9bd5","#4f7fc8","#7e8cd6","#8f7bd4","#b07cd6","#c06fc0","#d76a9e","#d2647a","#b6794a","#8a93a0","#7a8290"];
// Clickable color dot before an adventure name (sidebar card + open title). Reusable wherever an
// adventure is shown (e.g. future bestiary grouping by adventure).
function advDot(advId,color){return `<button class="adv-dot${color?"":" none"}" data-advcolor="${advId}"${color?` style="background:${color};border-color:${color}"`:""} title="Adventure color"></button>`;}
// Non-interactive colour dot for showing an adventure's identity colour where clicking shouldn't open
// the colour picker (e.g. a bestiary group header grouped by adventure). Reuses the .adv-dot visual.
function advDotStatic(color){return `<span class="adv-dot static${color?"":" none"}"${color?` style="background:${color};border-color:${color}"`:""}></span>`;}
function openAdvColorMenu(anchor,advId){
  const a=state.adv.find(x=>x.id===advId);if(!a)return;
  const sw=c=>`<button class="adv-sw${a.color===c?" on":""}" data-sw="${c}" style="background:${c}" title="${c}"></button>`;
  const p=showPopover(anchor,`<div class="adv-sw-grid">${ADV_COLORS.map(sw).join("")}</div><button class="popitem" data-sw="" style="margin-top:4px">No color</button>`);
  p.querySelectorAll("[data-sw]").forEach(b=>b.addEventListener("click",()=>{a.color=b.dataset.sw;saveAdv();closePopover();renderAdvList();}));
}
function renderAdvList(){
  const box=$("#advItems");
  const active=state.adv.filter(a=>!a.archived),arch=state.adv.filter(a=>a.archived);
  const selStyle=a=>a.id===state.selAdv&&a.color?` style="border-color:${a.color}"`:"";
  let html=active.map(a=>`<div class="ai ${a.id===state.selAdv?"sel":""}" data-adv="${a.id}"${selStyle(a)}><div class="ai-info"><div class="nm">${advDot(a.id,a.color)}${esc(a.name)}</div><div class="dt">${a.uneven?"mixed lvl":(a.size+"× lvl "+a.level)} · ${a.encounters.filter(e=>!e.archived).length} enc.</div></div>${aiMenu(a)}</div>`).join("")||`<div class="hint" style="padding:8px">No adventures yet.</div>`;
  if(arch.length)html+=`<div class="hint" style="padding:6px 8px 2px;font-size:11px">Archived</div>`+arch.map(a=>`<div class="ai ${a.id===state.selAdv?"sel":""}" data-adv="${a.id}" style="opacity:.5"><div class="ai-info"><div class="nm">${advDot(a.id,a.color)}${esc(a.name)}</div></div>${aiMenu(a)}</div>`).join("");
  box.innerHTML=html;
  box.querySelectorAll(".ai-info").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest("[data-advcolor]"))return;state.selAdv=el.closest("[data-adv]").dataset.adv;renderAdvList();}));
  box.querySelectorAll("[data-advcolor]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openAdvColorMenu(el,el.dataset.advcolor);}));
  box.querySelectorAll("[data-aim-dup]").forEach(el=>el.addEventListener("click",()=>{const src=state.adv.find(x=>x.id===el.dataset.aimDup);if(!src)return;const c=normalizeAdv(JSON.parse(JSON.stringify(src)));c.id=uid();c.name=src.name+" (copy)";c.encounters=c.encounters.map(e=>Object.assign({},e,{id:uid()}));state.adv.splice(state.adv.indexOf(src)+1,0,c);state.selAdv=c.id;saveAdv();renderAdvList();}));
  box.querySelectorAll("[data-aim-arch]").forEach(el=>el.addEventListener("click",()=>{const src=state.adv.find(x=>x.id===el.dataset.aimArch);if(!src)return;src.archived=!src.archived;saveAdv();renderAdvList();}));
  box.querySelectorAll("[data-aim-del]").forEach(el=>el.addEventListener("click",()=>{const aId=el.dataset.aimDel;const src=state.adv.find(x=>x.id===aId);if(!src)return;confirmModal(`Delete "${src.name}"?`,()=>{state.adv=state.adv.filter(x=>x.id!==aId);if(state.selAdv===aId)state.selAdv=null;saveAdv();renderAdvList();});}));
  const btn=$("#newAdv");if(btn){btn.className=`btn ${state.adv.length?"ghost":"primary"} sm`;btn.style.removeProperty("width");}
  const lay=$(".adv-layout");if(lay)lay.classList.toggle("detail-open",!!curAdv());
  renderAdvDetail();
}
$("#newAdv").addEventListener("click",()=>{const d=state.settings.defaults,sz=clamp(d.partySize||4,1,12),lv=clamp(d.partyLevel||1,1,20);const a=normalizeAdv({id:uid(),name:"New Adventure",size:sz,level:lv,uneven:false,levels:Array(sz).fill(lv),notes:"",encounters:[]});state.adv.unshift(a);state.selAdv=a.id;saveAdv();renderAdvList();});
function curAdv(){return state.adv.find(a=>a.id===state.selAdv);}
function partyOf(adv,e){return (e&&e.partyOverride)?e.partyOverride:{size:adv.size,level:adv.level,uneven:adv.uneven,levels:adv.levels};}
function partyLevels(p){return p.uneven?p.levels.slice(0,p.size):Array.from({length:p.size},()=>p.level);}
function baseBudget(p){const lv=partyLevels(p);return [0,1,2].map(di=>lv.reduce((s,l)=>s+BUDGET[clamp(l,1,20)][di],0));}
function monOf(c){return state.lib.find(x=>x.id===c.monsterId);}
function addMonsterCombatant(enc,monsterId){
  const cid=uid();
  enc.combatants.push({type:"monster",id:cid,monsterId,nickname:"",count:1,faction:state.settings.defaults.faction});
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
// Per-creature XP for the budget. MCDM minions use the special low minion-XP table (so a horde
// counts fairly); everyone else uses standard CR XP. `count` multiplies either way.
function combatIsMinion(c){return c.type==="monster"?!!(monOf(c)&&monOf(c).minion):c.type==="quick"?!!c.minion:false;}
function combatXPEach(c){if(c.type==="monster"){const m=monOf(c);if(!m)return 0;return m.minion?(MINION_XP[m.cr]??0):xpOf(m);}const cr=combatCR(c);if(cr==null)return 0;return (combatIsMinion(c)?MINION_XP[cr]:CR_XP[cr])||0;}
function combatXP(c){return combatXPEach(c)*Number(c.count||1);}
function encBudget(adv,e){
  const base=baseBudget(partyOf(adv,e));const add=[0,0,0];
  // Ally creatures raise the party's budget ≈ a PC of level round(CR). A minion ally contributes
  // proportionally less (scaled by minion-XP ÷ standard-XP), matching the enemy-side minion math.
  e.combatants.forEach(c=>{if(c.faction==="Ally"&&c.type!=="event"){const cr=combatCR(c);if(cr!=null){const lv=clamp(Math.round(CR_NUM[cr]),1,20);
    const f=combatIsMinion(c)?((MINION_XP[cr]||0)/(CR_XP[cr]||1)):1;
    for(let i=0;i<3;i++)add[i]+=BUDGET[lv][i]*Number(c.count||1)*f;}}});
  return base.map((b,i)=>Math.round(b+add[i]));
}
function encSpent(e){return e.combatants.filter(c=>c.faction==="Enemy"&&c.type!=="event").reduce((s,c)=>s+combatXP(c),0);}
function diffOf(spent,bud){if(spent<=0)return["trivial","Empty"];if(spent>bud[2])return["over","Over High"];if(spent>=bud[2]*0.92)return["high","High"];if(spent>=bud[1]*0.92)return["moderate","Moderate"];if(spent>=bud[0]*0.85)return["low","Low"];return["trivial","Trivial"];}

function renderAdvDetail(){
  const a=curAdv(),d=$("#advDetail");
  if(!a){setCrumbs(["Adventures"]);d.innerHTML=`<div class="empty-state">Select or create an adventure.</div>`;return;}
  setCrumbs(["Adventures",a.name||"Untitled"]);
  const bud=baseBudget(partyOf(a,null));
  d.innerHTML=`<div class="col-head"><div class="ch-left"><button class="adv-back" id="advBack" title="Back to adventures" aria-label="Back to adventures"><svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M8 2 L4 6 L8 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${advDot(a.id,a.color)}<h2 contenteditable="true" id="advName" style="outline:none">${esc(a.name)}</h2></div>
    <div class="menu-wrap" style="flex:none"><button class="kebab" data-menu="adv-opts" title="Adventure options">⋯</button>
    <div class="menu" id="menu-adv-opts">
      <button id="advToggleUneven">${a.uneven?"✓ Uneven levels":"Uneven levels"}</button>
      <div class="sep"></div>
      <button id="advDuplicate">Duplicate adventure</button>
      <button id="advArchive">${a.archived?"Unarchive":"Archive"} adventure</button>
      <div class="sep"></div>
      <button class="danger" id="delAdv">Delete adventure</button>
    </div></div></div>
    <div class="party-bar">
      <label class="f">Party size<input type="number" id="pSize" min="1" max="12" value="${a.size}" style="width:78px"></label>
      <label class="f" id="pLevelWrap" ${a.uneven?'style="display:none"':""}>Party level<input type="number" id="pLevel" min="1" max="20" value="${a.level}" style="width:78px"></label>
      <div id="pcLevels" ${a.uneven?"":'style="display:none"'} style="flex-basis:100%"><div class="hint" style="margin-bottom:4px">Per-PC levels</div><div class="pcgrid" id="pcGrid"></div></div>
      <div style="flex-basis:100%">
        <div class="adv-bud-chips">
          <div class="bud-chip low"><span class="bc-lbl">Low</span><span class="bc-val">${bud[0].toLocaleString()}</span></div>
          <div class="bud-chip mod"><span class="bc-lbl">Moderate</span><span class="bc-val">${bud[1].toLocaleString()}</span></div>
          <div class="bud-chip high"><span class="bc-lbl">High</span><span class="bc-val">${bud[2].toLocaleString()}</span></div>
        </div>
      </div>
    </div>
    <label class="f advnotes">Adventure notes<textarea id="advNotes" placeholder="Premise, hooks, party goals, open threads…">${esc(a.notes||"")}</textarea></label>
    <div class="section-label">Scenes <span class="sl-acts"><div class="ctrl-icons" id="encCtrlIcons"></div></span></div>
    <div class="ctrl-chips" id="encChips"></div>
    <div id="encList"></div>
    <div class="fab-split menu-wrap" id="encFab">
      <button class="btn primary sm" id="addEnc" style="width:auto">＋ Encounter</button>
      <button class="kebab split-caret" data-menu="encfab" title="More encounter actions" aria-label="More encounter actions">▾</button>
      <div class="menu" id="menu-encfab">
        <button id="encAddScene">＋ Scene</button>
        <button id="encImport">⤵ Import from another adventure…</button>
        <div class="sep"></div>
        <button id="encArchiveAll">Archive all encounters</button>
        <button class="danger" id="encClearAll">Clear all encounters</button>
      </div>
    </div>
    <div id="archWrap"></div>`;
  $("#advBack").addEventListener("click",()=>{state.selAdv=null;renderAdvList();});
  d.querySelectorAll("[data-advcolor]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openAdvColorMenu(el,el.dataset.advcolor);}));
  const nm=$("#advName");nm.addEventListener("blur",()=>{a.name=nm.textContent.trim()||"Untitled";saveAdv();renderAdvList();});
  $("#delAdv").addEventListener("click",()=>confirmModal(`Delete "${a.name}" and its encounters?`,()=>{state.adv=state.adv.filter(x=>x.id!==a.id);state.selAdv=null;saveAdv();renderAdvList();}));
  $("#advDuplicate").addEventListener("click",()=>{const c=normalizeAdv(JSON.parse(JSON.stringify(a)));c.id=uid();c.name=a.name+" (copy)";c.encounters=c.encounters.map(e=>Object.assign({},e,{id:uid()}));state.adv.splice(state.adv.indexOf(a)+1,0,c);state.selAdv=c.id;saveAdv();renderAdvList();});
  $("#advArchive").addEventListener("click",()=>{a.archived=!a.archived;saveAdv();renderAdvList();});
  $("#advToggleUneven").addEventListener("click",()=>{a.uneven=!a.uneven;syncLevels(a);saveAdv();renderAdvDetail();});
  wrapStepper($("#pSize"),1,1);wrapStepper($("#pLevel"),1,1);
  $("#pSize").addEventListener("change",e=>{a.size=clamp(Number(e.target.value||1),1,12);syncLevels(a);saveAdv();renderAdvDetail();});
  $("#pLevel").addEventListener("change",e=>{a.level=clamp(Number(e.target.value||1),1,20);saveAdv();renderAdvDetail();});
  $("#advNotes").addEventListener("input",e=>{a.notes=e.target.value;saveAdv();});
  $("#addEnc").addEventListener("click",()=>{const e=blankEncounter();a.encounters.push(e);a._focusEnc=e.id;saveAdv();renderAdvDetail();});
  $("#encAddScene").addEventListener("click",()=>addScene(a));
  $("#encImport").addEventListener("click",()=>openImportEnc(a));
  $("#encArchiveAll").addEventListener("click",()=>{const live=a.encounters.filter(e=>!encArchived(a,e));if(!live.length)return;confirmModal(`Archive all ${live.length} active encounter${live.length>1?"s":""}?`,()=>{live.forEach(e=>e.archived=true);saveAdv();renderAdvDetail();});});
  $("#encClearAll").addEventListener("click",()=>{if(!a.encounters.length)return;confirmModal(`Delete all ${a.encounters.length} encounter${a.encounters.length>1?"s":""} and clear every scene? This cannot be undone.`,()=>{a.encounters=[];a.scenes=[];saveAdv();renderAdvDetail();});});
  bindCtrlIcons($("#encCtrlIcons"),encCtrl,ENC_DESC,()=>renderEncList(a));
  renderPCgrid(a);renderEncList(a);
}
function blankEncounter(sceneId){return {id:uid(),name:"New Encounter",archived:false,notes:"",partyOverride:null,sceneId:sceneId||null,combatants:[]};}
function addScene(a){a.scenes.push({id:uid(),name:"New Scene",collapsed:false,notes:"",archived:false});saveAdv();renderAdvDetail();}
function syncLevels(a){a.levels=Array.from({length:a.size},(_,i)=>a.levels[i]??a.level);}
function renderPCgrid(a){const g=$("#pcGrid");if(!g)return;syncLevels(a);g.innerHTML=a.levels.slice(0,a.size).map((l,i)=>`<input type="number" min="1" max="20" value="${l}" data-pc="${i}">`).join("");g.querySelectorAll("[data-pc]").forEach(el=>el.addEventListener("input",()=>{a.levels[+el.dataset.pc]=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));}

// The encounter most recently edited (focused) gets a highlight. Editing = focusing any field inside
// it (delegated) or adding a combatant; we update classes in place so no re-render is needed.
function setEncFocus(a,encId){if(!a||a._focusEnc===encId&&document.querySelector("#advDetail .enc.focused"))return;a._focusEnc=encId;
  $$("#advDetail .enc.focused").forEach(x=>x.classList.remove("focused"));
  const el=document.querySelector(`#advDetail .enc[data-enc="${encId}"]`);if(el)el.classList.add("focused");}
// ---- Encounter list controls (search / filter / sort) — manual order is the default (no sort). ----
let encCtrl={q:"",filters:{},sort:{key:"manual",dir:1},group:null};
const ENC_DESC={search:true,icons:["search","sort"],defaultSortKey:"manual",params:[],
  sortKeys:[{key:"manual",label:"Manual order"},{key:"alpha",label:"Name"},{key:"diff",label:"Difficulty"}]};
function encFilterActive(){return !!(encCtrl.q||Object.keys(encCtrl.filters).some(k=>(encCtrl.filters[k]||[]).length)||encCtrl.sort.key!=="manual");}
// Apply search/filter/sort to a list of encounters. Manual sort preserves the array (drag) order.
function encApply(a,list){
  const q=(encCtrl.q||"").toLowerCase().trim();
  let recs=list.filter(e=>{
    if(q&&!(e.name||"").toLowerCase().includes(q))return false;
    for(const p of ENC_DESC.params){const sel=encCtrl.filters[p.key]||[];if(!sel.length)continue;const vs=p.get(e,a)||[];if(!vs.some(v=>sel.includes(v)))return false;}
    return true;});
  const k=encCtrl.sort.key,dir=encCtrl.sort.dir;
  if(k==="alpha")recs=recs.slice().sort((x,y)=>(x.name||"").localeCompare(y.name||"")*dir);
  else if(k==="diff"){const rat=e=>encSpent(e)/(encBudget(a,e)[2]||1);recs=recs.slice().sort((x,y)=>(rat(x)-rat(y))*dir);}
  return recs;
}
function sceneArchived(a,sceneId){const s=sceneOf(a,sceneId);return !!(s&&s.archived);}
// An encounter is treated as archived if it's individually archived OR sits in an archived scene.
function encArchived(a,e){return !!(e.archived||sceneArchived(a,e.sceneId));}
// Deep-copy an encounter into adventure `a` under `sceneId` (new ids for the encounter + its combatants;
// monsterId still points at the shared global bestiary, so statblock links survive the copy).
function cloneEncInto(a,srcEnc,sceneId){const e=JSON.parse(JSON.stringify(srcEnc));e.id=uid();e.sceneId=sceneId||null;e.archived=false;e.combatants=(e.combatants||[]).map(c=>Object.assign({},c,{id:uid()}));a.encounters.push(e);return e;}
function openImportEnc(a){
  const others=state.adv.filter(x=>x.id!==a.id);
  if(!others.length){toast("No other adventures to import from.");return;}
  const body=others.map(o=>{
    const scenes=o.scenes||[];
    const sceneRows=scenes.map(s=>{const n=o.encounters.filter(e=>e.sceneId===s.id).length;return `<label class="imp-row"><input type="checkbox" data-imp="scene:${o.id}:${s.id}"><span class="imp-k">Scene</span><span class="imp-nm">${esc(s.name)}</span><span class="imp-n">${n} enc.</span></label>`;}).join("");
    const loose=o.encounters.filter(e=>!scenes.some(s=>s.id===e.sceneId));
    const encRows=loose.map(e=>`<label class="imp-row"><input type="checkbox" data-imp="enc:${o.id}:${e.id}"><span class="imp-k enc">Enc</span><span class="imp-nm">${esc(e.name)}</span></label>`).join("");
    if(!sceneRows&&!encRows)return "";
    return `<div class="imp-adv"><div class="imp-adv-h">${advDotStatic(o.color)}${esc(o.name)}</div>${sceneRows}${encRows}</div>`;
  }).join("")||`<div class="empty-state">Other adventures have no encounters.</div>`;
  openModalRaw(`<h3>Import from another adventure</h3><div class="hint" style="margin:-4px 0 12px">Checked scenes (with their encounters) and encounters are copied into "${esc(a.name)}".</div><div class="imp-scroll">${body}</div><div class="lib-foot"><button class="btn ghost sm" id="impCancel" style="width:auto">Cancel</button><button class="btn primary sm" id="impCopy" style="width:auto">Copy selected</button></div>`);
  $("#impCancel").addEventListener("click",closeModal);
  $("#impCopy").addEventListener("click",()=>{
    const checked=[...$("#modal").querySelectorAll("[data-imp]:checked")];
    if(!checked.length){closeModal();return;}
    let nEnc=0,nSc=0;
    checked.forEach(cb=>{const[kind,advId,id]=cb.dataset.imp.split(":");const src=state.adv.find(x=>x.id===advId);if(!src)return;
      if(kind==="scene"){const s=(src.scenes||[]).find(x=>x.id===id);if(!s)return;const ns={id:uid(),name:s.name,collapsed:false,notes:s.notes||"",archived:false};a.scenes.push(ns);nSc++;src.encounters.filter(e=>e.sceneId===id).forEach(e=>{cloneEncInto(a,e,ns.id);nEnc++;});}
      else{const e=src.encounters.find(x=>x.id===id);if(e){cloneEncInto(a,e,null);nEnc++;}}});
    saveAdv();closeModal();renderAdvDetail();toast(`Imported ${nEnc} encounter${nEnc===1?"":"s"}${nSc?` · ${nSc} scene${nSc===1?"":"s"}`:""}.`);
  });
}
function sceneOf(a,id){return id?(a.scenes||[]).find(s=>s.id===id):null;}
// A scene is a named collapsible container grouping some of an adventure's encounters. Encounters keep
// their order in the flat a.encounters array; we render scene-by-scene (filtering by sceneId), then a
// trailing "Ungrouped" bucket for encounters with no scene (or pointing at a deleted one).
function sceneHTML(a,s,encs){
  const chev=`<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const head=`<div class="scene-h" data-scenedrop="${s.id}">
      <button class="scene-collapse${s.collapsed?" closed":""}" data-scenecollapse="${s.id}" title="${s.collapsed?"Expand":"Collapse"}" aria-label="${s.collapsed?"Expand":"Collapse"}">${chev}</button>
      <input class="scene-name" value="${esc(s.name)}" data-scenename="${s.id}" placeholder="Scene name">
      <span class="scene-count">${encs.length} enc.</span>
      <div class="menu-wrap">
        <button class="kebab" data-menu="scene-${s.id}" title="Scene options">⋯</button>
        <div class="menu" id="menu-scene-${s.id}">
          <button data-scenearch="${s.id}">${s.archived?"Unarchive scene":"Archive scene"}</button>
          <div class="sep"></div>
          <button class="danger" data-scenedel="${s.id}">Delete scene</button>
        </div>
      </div>
    </div>`;
  if(s.collapsed)return `<div class="scene${s.archived?" arch":""} collapsed" data-scene="${s.id}" draggable="true">${head}</div>`;
  const body=`<div class="scene-body" data-scenedrop="${s.id}">
      <label class="f scenenotes"><textarea data-scenenotes="${s.id}" placeholder="Scene notes — premise, transitions, pacing…">${esc(s.notes||"")}</textarea></label>
      ${encs.map(e=>encHTML(a,e)).join("")||`<div class="hint scene-empty">No encounters in this scene yet.</div>`}
      ${s.archived?"":`<button class="addbtn scene-add" data-sceneadd="${s.id}" style="width:100%">＋ Encounter in this scene</button>`}
    </div>`;
  return `<div class="scene${s.archived?" arch":""}" data-scene="${s.id}" draggable="true">${head}${body}</div>`;
}
function renderEncList(a){
  const box=$("#encList");if(!box)return;
  if(!box._focusBound){box._focusBound=true;box.addEventListener("focusin",e=>{const enc=e.target.closest(".enc[data-enc]");if(enc)setEncFocus(a,enc.dataset.enc);});}
  renderCtrlChips($("#encChips"),encCtrl,ENC_DESC,()=>renderEncList(a));
  const scenes=a.scenes||[];
  const activeScenes=scenes.filter(s=>!s.archived),archScenes=scenes.filter(s=>s.archived);
  const visible=encApply(a,a.encounters);                       // filtered + sorted view
  const inScene=sid=>visible.filter(e=>!e.archived&&e.sceneId===sid);
  const sceneAdd=`<button class="addbtn" id="addScene" style="width:100%;margin-top:2px">＋ Scene</button>`;
  if(activeScenes.length){
    const ungrouped=visible.filter(e=>!e.archived&&!activeScenes.some(s=>s.id===e.sceneId)&&!sceneArchived(a,e.sceneId));
    box.innerHTML=activeScenes.map(s=>sceneHTML(a,s,inScene(s.id))).join("")
      +sceneAdd
      +`<div class="scene-loose" data-scenedrop="">${ungrouped.length?`<div class="scene-loose-lbl">Ungrouped</div>${ungrouped.map(e=>encHTML(a,e)).join("")}`:""}</div>`;
  }else{
    const active=visible.filter(e=>!e.archived);
    box.innerHTML=(active.length?active.map(e=>encHTML(a,e)).join(""):`<div class="hint">${encFilterActive()?"No encounters match these controls.":"No active encounters."}</div>`)+sceneAdd;
  }
  const aw=$("#archWrap");
  const archEncs=a.encounters.filter(e=>e.archived&&!sceneArchived(a,e.sceneId));
  const archTotal=archScenes.length+archEncs.length; // top-level archived blocks (scenes + loose encounters)
  if(archScenes.length||archEncs.length){
    const archInner=archScenes.map(s=>sceneHTML(a,s,a.encounters.filter(e=>e.sceneId===s.id))).join("")+archEncs.map(e=>encHTML(a,e)).join("");
    aw.innerHTML=`<div class="section-label" style="margin-top:24px"><button class="arch-reveal" id="archToggle"><span class="arch-chev">▶</span> Archived (${archTotal})</button></div><div id="archBody" style="display:none">${archInner}</div>`;
    const toggle=document.getElementById("archToggle"),body=document.getElementById("archBody");
    toggle.addEventListener("click",()=>{const open=body.style.display!=="none";body.style.display=open?"none":"block";toggle.classList.toggle("open",!open);});
  }else{aw.innerHTML="";}
  bindEncEvents(a);
}
// The XP target is OFF until the DM drags the marker. While inactive it parks at the low-end of the
// budget, renders dimmed, and the target/delta read-out is hidden (e.target stays null).
function encTargetActive(e){return e.target!=null;}
function encTargetVal(e,bud){return e.target!=null?clamp(e.target,0,bud[2]):bud[0];}
function combCount(e){return e.combatants.filter(c=>c.type!=="event").reduce((s,c)=>s+Number(c.count||1),0);}
function encReadHTML(a,e,bud,spent){
  const p=partyOf(a,e);
  const extra=`${e.partyOverride?` · <span style="color:var(--amber)">override: ${p.uneven?"mixed":p.size+"× lvl "+p.level}</span>`:""}${e.combatants.some(c=>c.faction==="Ally")?` · <span style="color:var(--ok)">allies raised budget</span>`:""}`;
  if(!encTargetActive(e))return `Spent <b>${spent.toLocaleString()} XP</b> · <span style="color:var(--faint)">drag the marker to set a target</span>${extra}`;
  const tgt=encTargetVal(e,bud),d=spent-tgt;
  const dtxt=d===0?`<span style="color:var(--ok)">on target</span>`:d>0?`<span style="color:var(--accent)">+${d.toLocaleString()} over target</span>`:`<span style="color:var(--dim)">${Math.abs(d).toLocaleString()} under target</span>`;
  return `Spent <b>${spent.toLocaleString()} XP</b> · target ${tgt.toLocaleString()} · ${dtxt}${extra}`;
}
// Patch an encounter's derived numbers (difficulty pill, budget bar, target marker, read-out, and
// each combatant's XP) in place — used on count/target edits so we never rebuild (and refocus) the input.
function updateEncMeta(a,e){
  const root=document.querySelector(`#advDetail .enc[data-enc="${e.id}"]`);if(!root)return;
  const bud=encBudget(a,e),spent=encSpent(e),[cls,label]=diffOf(spent,bud);
  const pct=Math.min(100,bud[2]?spent/bud[2]*100:0);
  const fill=cls==="over"?"var(--bad)":cls==="high"?"var(--accent)":cls==="moderate"?"var(--warn)":"var(--ok)";
  const pill=root.querySelector(".eh .pill");if(pill){pill.className="pill "+cls;pill.textContent=label;}
  const f=root.querySelector(".budget .fill");if(f){f.style.width=pct+"%";f.style.background=fill;}
  const tgt=root.querySelector(".budget .tgt");if(tgt){tgt.style.left=(encTargetActive(e)?(bud[2]?encTargetVal(e,bud)/bud[2]*100:0):0)+"%";tgt.classList.toggle("inactive",!encTargetActive(e));}
  const read=root.querySelector(".budget .read");if(read)read.innerHTML=encReadHTML(a,e,bud,spent);
  e.combatants.forEach(c=>{const x=root.querySelector(`.cbt[data-cid="${c.id}"] .xpv`);if(x)x.textContent=combatXP(c).toLocaleString()+" XP";});
}
function encHTML(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[cls,label]=diffOf(spent,bud);
  const pct=Math.min(100,bud[2]?spent/bud[2]*100:0);
  const fill=cls==="over"?"var(--bad)":cls==="high"?"var(--accent)":cls==="moderate"?"var(--warn)":"var(--ok)";
  const tgt=encTargetVal(e,bud),tgtPct=encTargetActive(e)?(bud[2]?tgt/bud[2]*100:0):0;
  const head=`<div class="eh">
      <button class="enc-collapse ${e.collapsed?"closed":""}" data-enccollapse="${e.id}" title="${e.collapsed?"Expand":"Collapse"}" aria-label="${e.collapsed?"Expand":"Collapse"}"><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <input class="enm" value="${esc(e.name)}" data-encname="${e.id}">
      <span class="pill ${cls}">${label}</span>
      <div class="menu-wrap">
        <button class="kebab" data-menu="enc-${e.id}" title="More">⋯</button>
        <div class="menu" id="menu-enc-${e.id}">
          <button data-encovr="${e.id}">${e.partyOverride?"Remove party override":"Override party for this encounter"}</button>
          <button data-pushenc="${e.id}">Copy encounter for Claude</button>
          <button data-encarch="${e.id}">${e.archived?"Unarchive":"Archive"}</button>
          <div class="sep"></div>
          <div class="menu-wrap submenu-wrap">
            <button class="submenu-trigger" data-menu="encmove-${e.id}">Move<span class="submenu-arrow">▸</span></button>
            <div class="menu submenu" id="menu-encmove-${e.id}">
              <button data-encmove="${e.id}:top">Move to top</button>
              <button data-encmove="${e.id}:up">Move up</button>
              <button data-encmove="${e.id}:down">Move down</button>
              <button data-encmove="${e.id}:bottom">Move to bottom</button>
            </div>
          </div>
          <div class="sep"></div>
          <button class="danger" data-encdel="${e.id}">Delete</button>
        </div>
      </div>
    </div>`;
  const foc=e.id===a._focusEnc?" focused":"";
  if(e.collapsed)return `<div class="enc ${e.archived?"arch":""} collapsed${foc}" data-enc="${e.id}" draggable="true">${head}</div>`;
  return `<div class="enc ${e.archived?"arch":""}${foc}" data-enc="${e.id}" draggable="true">
    ${head}
    <div class="budget">
      <div class="bartrack">
        <div class="bar"><div class="fill" style="width:${pct}%;background:${fill}"></div></div>
        <div class="tgt ${encTargetActive(e)?"":"inactive"}" data-enctgt="${e.id}" style="left:${tgtPct}%" title="Drag to set XP target"><span class="tgt-tip">${encTargetActive(e)?tgt.toLocaleString()+" XP":"set target"}</span></div>
      </div>
      <div class="ticks"><span>Low ${bud[0].toLocaleString()}</span><span>Mod ${bud[1].toLocaleString()}</span><span>High ${bud[2].toLocaleString()}</span></div>
      <div class="read">${encReadHTML(a,e,bud,spent)}</div>
    </div>
    <div class="ovr ${e.partyOverride?"show":""}">${e.partyOverride?ovrInner(e):""}</div>
    <label class="f encnotes"><textarea data-encnotes="${e.id}" placeholder="Battlefield notes — terrain, light, hazards, special rules…">${esc(e.notes||"")}</textarea></label>
    <div data-combat="${e.id}">${e.combatants.map(c=>combatHTML(e,c)).join("")||'<div class="hint" style="margin:4px 0">No combatants yet.</div>'}</div>
    <div class="addrow">
      <button class="addbtn" data-addmon="${e.id}" style="flex:1">＋ Add combatant <span style="color:var(--faint)">(Bestiary)</span></button>
      <div class="menu-wrap">
        <button class="kebab addc-plus" data-menu="addc-${e.id}" title="More ways to add" aria-label="More ways to add">＋</button>
        <div class="menu" id="menu-addc-${e.id}">
          <button data-addquick="${e.id}">＋ Quick combatant (CR only)</button>
          <button data-addchassis="${e.id}">＋ From chassis (auto-saves)</button>
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
  const fc=facClass(c.faction);const xp=combatXP(c);
  const facSel=`<select class="fac ${fc}" data-cf="${c.id}:faction">${FACTIONS.map(f=>`<option ${f===c.faction?"selected":""}>${f}</option>`).join("")}</select>`;
  if(c.type==="quick")return `<div class="cbt ${fc}" data-cid="${c.id}"><div class="top">
    <input class="nick" placeholder="Combatant name" data-cf="${c.id}:nickname" value="${esc(c.nickname||"")}">
    <select class="crsel" data-cf="${c.id}:cr">${CR_LIST.map(x=>`<option value="${x}" ${x===c.cr?"selected":""}>CR ${x}</option>`).join("")}</select>
    <input class="cnt" type="number" min="1" placeholder="1" value="${c.count===1?"":c.count}" data-cf="${c.id}:count">
    ${facSel}
    <button type="button" class="mini-chip${c.minion?" on":""}" data-minion="${c.id}" aria-pressed="${c.minion?"true":"false"}" title="MCDM minion — counts as minion XP toward the budget">minion</button>
    <span class="xpv">${xp.toLocaleString()} XP</span><button class="iconbtn" data-cdel="${c.id}">✕</button></div>
    <div class="sec"><span class="lab">no statblock — budget only</span></div></div>`;
  const m=monOf(c);
  return `<div class="cbt ${fc}" data-cid="${c.id}"><div class="top">
    <input class="nick" placeholder="${esc(m?m.name:"(missing)")}" data-cf="${c.id}:nickname" value="${esc(c.nickname||"")}">
    <input class="cnt" type="number" min="1" placeholder="1" value="${c.count===1?"":c.count}" data-cf="${c.id}:count">
    ${facSel}
    <span class="xpv">${xp.toLocaleString()} XP</span><button class="iconbtn" data-cdel="${c.id}">✕</button></div>
    <div class="sec"><span class="lab">statblock:</span><select data-cf="${c.id}:monsterId">${monsterOptionsHTML(c.monsterId)}</select>${m&&m.minion?`<span class="minion-tag" title="MCDM minion — counts as ${(MINION_XP[m.cr]??0).toLocaleString()} XP each toward the budget">minion</span>`:""}</div></div>`;
}
// Statblock <select> options for a combatant: the most-recently-saved creature is pinned at the top,
// then the rest grouped by CR (ascending). The current pick stays selected wherever it sits.
function monsterOptionsHTML(selId){
  if(!state.lib.length)return"";
  const opt=m=>`<option value="${m.id}" ${m.id===selId?"selected":""}>${esc(m.name)} (CR ${m.cr})</option>`;
  const recent=state.lib.reduce((a,b)=>((b._savedAt||0)>((a&&a._savedAt)||0)?b:a),null);
  let html=recent?`<optgroup label="Last edited">${opt(recent)}</optgroup>`:"";
  const byCR={};state.lib.forEach(m=>{(byCR[m.cr]=byCR[m.cr]||[]).push(m);});
  Object.keys(byCR).sort((x,y)=>(CR_NUM[x]??0)-(CR_NUM[y]??0)).forEach(cr=>{
    const list=byCR[cr].slice().sort((a,b)=>a.name.localeCompare(b.name));
    html+=`<optgroup label="CR ${cr}">${list.map(opt).join("")}</optgroup>`;});
  return html;
}
function findEnc(a,id){return a.encounters.find(e=>e.id===id);}
function findCombat(a,cid){for(const e of a.encounters){const c=e.combatants.find(x=>x.id===cid);if(c)return{e,c};}return{};}
function bindEncEvents(a){
  const q=sel=>$$("#advDetail "+sel);
  q("[data-encname]").forEach(el=>el.addEventListener("change",()=>{findEnc(a,el.dataset.encname).name=el.value;saveAdv();}));
  q("[data-encnotes]").forEach(el=>el.addEventListener("input",()=>{findEnc(a,el.dataset.encnotes).notes=el.value;saveAdv();}));
  q("[data-encdel]").forEach(el=>el.addEventListener("click",()=>{a.encounters=a.encounters.filter(e=>e.id!==el.dataset.encdel);saveAdv();renderAdvDetail();}));
  q("[data-encarch]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encarch);e.archived=!e.archived;saveAdv();renderAdvDetail();}));
  q("[data-enccollapse]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.enccollapse);e.collapsed=!e.collapsed;saveAdv();renderEncList(a);}));
  q("[data-encmove]").forEach(el=>el.addEventListener("click",()=>{const[id,where]=el.dataset.encmove.split(":");moveEncTo(a,id,where);}));
  q("#addScene").forEach(el=>el.addEventListener("click",()=>addScene(a)));
  q("[data-scenename]").forEach(el=>el.addEventListener("change",()=>{const s=sceneOf(a,el.dataset.scenename);if(s){s.name=el.value.trim()||"Scene";saveAdv();}}));
  q("[data-scenenotes]").forEach(el=>el.addEventListener("input",()=>{const s=sceneOf(a,el.dataset.scenenotes);if(s){s.notes=el.value;saveAdv();}}));
  q("[data-scenecollapse]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenecollapse);if(s){s.collapsed=!s.collapsed;saveAdv();renderEncList(a);}}));
  q("[data-scenearch]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenearch);if(s){s.archived=!s.archived;saveAdv();renderAdvDetail();}}));
  q("[data-sceneadd]").forEach(el=>el.addEventListener("click",()=>{const e=blankEncounter(el.dataset.sceneadd);a.encounters.push(e);a._focusEnc=e.id;saveAdv();renderAdvDetail();}));
  q("[data-scenedel]").forEach(el=>el.addEventListener("click",()=>{const sid=el.dataset.scenedel,s=sceneOf(a,sid);if(!s)return;const n=a.encounters.filter(e=>e.sceneId===sid).length;
    const go=()=>{a.encounters.forEach(e=>{if(e.sceneId===sid)e.sceneId=null;});a.scenes=a.scenes.filter(x=>x.id!==sid);saveAdv();renderAdvDetail();};
    n?confirmModal(`Delete scene "${s.name}"? Its ${n} encounter${n>1?"s":""} will become ungrouped.`,go):go();}));
  bindEncDrag(a,q);
  bindEncTarget(a,q);
  q("[data-encovr]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encovr);e.partyOverride=e.partyOverride?null:{size:a.size,level:a.level,uneven:a.uneven,levels:[...a.levels]};saveAdv();renderAdvDetail();}));
  q("[data-ovrsize]").forEach(el=>el.addEventListener("change",()=>{const e=findEnc(a,el.dataset.ovrsize);e.partyOverride.size=clamp(Number(el.value||1),1,12);e.partyOverride.levels=Array.from({length:e.partyOverride.size},(_,i)=>e.partyOverride.levels[i]??e.partyOverride.level);saveAdv();renderAdvDetail();}));
  q("[data-ovrlevel]").forEach(el=>el.addEventListener("change",()=>{findEnc(a,el.dataset.ovrlevel).partyOverride.level=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));
  q("[data-ovruneven]").forEach(el=>el.addEventListener("change",()=>{const e=findEnc(a,el.dataset.ovruneven);e.partyOverride.uneven=el.checked;e.partyOverride.levels=Array.from({length:e.partyOverride.size},(_,i)=>e.partyOverride.levels[i]??e.partyOverride.level);saveAdv();renderAdvDetail();}));
  q("[data-ovrpc]").forEach(el=>el.addEventListener("change",()=>{const[id,i]=el.dataset.ovrpc.split(":");findEnc(a,id).partyOverride.levels[+i]=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));
  q("[data-addmon]").forEach(el=>el.addEventListener("click",()=>openBestiaryPicker(a,findEnc(a,el.dataset.addmon))));
  q("[data-addquick]").forEach(el=>el.addEventListener("click",()=>{a._focusEnc=el.dataset.addquick;findEnc(a,el.dataset.addquick).combatants.push({type:"quick",id:uid(),nickname:"",cr:"1",count:1,faction:state.settings.defaults.faction});saveAdv();renderAdvDetail();}));
  q("[data-addev]").forEach(el=>el.addEventListener("click",()=>{a._focusEnc=el.dataset.addev;findEnc(a,el.dataset.addev).combatants.push({type:"event",id:uid(),name:"",init:"",text:""});saveAdv();renderAdvDetail();}));
  q("[data-addforge]").forEach(el=>el.addEventListener("click",()=>forgeForEncounter(a,findEnc(a,el.dataset.addforge))));
  q("[data-addchassis]").forEach(el=>el.addEventListener("click",()=>openChassisForEncounter(a,findEnc(a,el.dataset.addchassis))));
  q("[data-pushenc]").forEach(el=>el.addEventListener("click",()=>pushEncounter(a,findEnc(a,el.dataset.pushenc))));
  // Minion flag on a quick combatant is a toggle chip (was a cramped checkbox). Flipping it changes
  // the combatant's XP, so re-render the list to refresh budget bars + the chip state.
  q("[data-minion]").forEach(el=>el.addEventListener("click",()=>{const{c}=findCombat(a,el.dataset.minion);if(!c)return;c.minion=!c.minion;saveAdv();renderEncList(a);}));
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
// Encounters share one array but render in two groups (active / archived). Reorder within a group,
// then write the regrouped order back into the slots that group occupied so the other group is untouched.
function setGroupOrder(a,archived,group){let k=0;a.encounters.forEach((e,i)=>{if(e.archived===archived)a.encounters[i]=group[k++];});}
function moveEncTo(a,id,where){
  const e=findEnc(a,id);if(!e)return;
  const group=a.encounters.filter(x=>x.archived===e.archived),pos=group.indexOf(e);
  let tgt=where==="up"?pos-1:where==="down"?pos+1:where==="top"?0:group.length-1;
  tgt=clamp(tgt,0,group.length-1);if(tgt===pos)return;
  group.splice(pos,1);group.splice(tgt,0,e);setGroupOrder(a,e.archived,group);saveAdv();renderAdvDetail();
}
function reorderEncRel(a,fromId,toId,after){
  if(!fromId||!toId||fromId===toId)return;
  const from=findEnc(a,fromId),to=findEnc(a,toId);
  if(!from||!to||from.archived!==to.archived)return;
  const group=a.encounters.filter(x=>x.archived===from.archived);
  group.splice(group.indexOf(from),1);
  let idx=group.indexOf(to);if(after)idx++;
  group.splice(idx,0,from);
  from.sceneId=to.sceneId||null; // dropping onto an encounter adopts that encounter's scene
  setGroupOrder(a,from.archived,group);saveAdv();renderAdvDetail();
}
// Move an encounter into a scene (or out of all scenes when sceneId is null/""), placing it after the
// scene's last current member so it lands at the end of that group.
function moveEncToScene(a,encId,sceneId){
  const e=findEnc(a,encId);if(!e||e.archived)return;
  sceneId=sceneId||null;
  if((e.sceneId||null)===sceneId)return;
  e.sceneId=sceneId;
  const group=a.encounters.filter(x=>!x.archived);
  group.splice(group.indexOf(e),1);
  let last=-1;group.forEach((x,i)=>{if((x.sceneId||null)===sceneId)last=i;});
  group.splice(last+1,0,e);
  setGroupOrder(a,false,group);saveAdv();renderAdvDetail();
}
let dragEncId=null,dropTarget=null;
// Skip drag-init when the press starts on an interactive control inside the card so editing
// inputs / clicking the menu / dragging the XP-target marker never triggers a card-drag.
function dragInert(t){return !!(t&&t.closest('input,textarea,select,button,a,label,[data-enctgt],[contenteditable="true"]'));}
let dragSceneId=null,dropScene=null;
function clearDropMarks(){$$("#advDetail .enc.drop-before,#advDetail .enc.drop-after,#advDetail .scene.drop-before,#advDetail .scene.drop-after").forEach(x=>x.classList.remove("drop-before","drop-after"));$$("#advDetail [data-scenedrop].scene-drop").forEach(x=>x.classList.remove("scene-drop"));}
// Reorder a scene within a.scenes (active scenes among active, archived among archived).
function reorderScene(a,fromId,toId,after){
  if(!fromId||!toId||fromId===toId)return;
  const arr=a.scenes,from=arr.find(s=>s.id===fromId),to=arr.find(s=>s.id===toId);
  if(!from||!to||!!from.archived!==!!to.archived)return;
  arr.splice(arr.indexOf(from),1);let idx=arr.indexOf(to);if(after)idx++;arr.splice(idx,0,from);
  saveAdv();renderAdvDetail();
}
function bindEncDrag(a,q){
  q(".enc[data-enc]").forEach(enc=>{
    enc.addEventListener("dragstart",ev=>{
      if(dragInert(ev.target)){ev.preventDefault();return;}
      ev.stopPropagation(); // don't also start a scene-drag on the enclosing .scene
      dragEncId=enc.dataset.enc;dropTarget=null;ev.dataTransfer.effectAllowed="move";
      try{ev.dataTransfer.setData("text/plain",enc.dataset.enc);}catch(_){}
      // Use the header as a compact drag-image instead of hiding the body — hiding reflowed the
      // list mid-gesture and made drop targets jump (the "buggy drag"). Fade is applied after the
      // snapshot via rAF so the source stays full-height (stable targets) but visibly inert.
      const eh=enc.querySelector(".eh");if(eh)try{ev.dataTransfer.setDragImage(eh,14,14);}catch(_){}
      requestAnimationFrame(()=>enc.classList.add("dragging"));
    });
    enc.addEventListener("dragend",()=>{enc.classList.remove("dragging");clearDropMarks();dragEncId=null;dropTarget=null;});
    enc.addEventListener("dragover",ev=>{
      if(!dragEncId||dragEncId===enc.dataset.enc)return;
      const from=findEnc(a,dragEncId),to=findEnc(a,enc.dataset.enc);
      if(!from||!to||from.archived!==to.archived)return;
      ev.preventDefault();
      const r=enc.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2;
      clearDropMarks();enc.classList.add(after?"drop-after":"drop-before");
      dropTarget={id:enc.dataset.enc,after};
    });
    enc.addEventListener("drop",ev=>{ev.preventDefault();const dt=dropTarget,id=dragEncId;clearDropMarks();
      if(dt)reorderEncRel(a,id,dt.id,dt.after);});
  });
  // Scene headers, scene bodies, and the Ungrouped bucket are drop zones: dropping a dragged encounter
  // anywhere that isn't an encounter card re-parents it to that scene (empty value = ungrouped). When
  // the pointer is over an .enc, its own handler wins (reorder + adopt scene), so we bail here.
  q("[data-scenedrop]").forEach(zone=>{
    zone.addEventListener("dragover",ev=>{
      if(!dragEncId||ev.target.closest(".enc"))return;
      const from=findEnc(a,dragEncId);if(!from||from.archived)return;
      ev.preventDefault();ev.stopPropagation();
      clearDropMarks();zone.classList.add("scene-drop");
    });
    zone.addEventListener("drop",ev=>{
      if(!dragEncId||ev.target.closest(".enc"))return;
      ev.preventDefault();ev.stopPropagation();
      const id=dragEncId,sc=zone.dataset.scenedrop;clearDropMarks();
      moveEncToScene(a,id,sc);
    });
  });
  // Scenes reorder among themselves (grab the scene header; encounters inside drag independently).
  q(".scene[data-scene]").forEach(scene=>{
    scene.addEventListener("dragstart",ev=>{
      if(dragInert(ev.target)||ev.target.closest(".enc")){ev.preventDefault();return;}
      dragSceneId=scene.dataset.scene;dropScene=null;ev.dataTransfer.effectAllowed="move";
      try{ev.dataTransfer.setData("text/plain",scene.dataset.scene);}catch(_){}
      const h=scene.querySelector(".scene-h");if(h)try{ev.dataTransfer.setDragImage(h,14,14);}catch(_){}
      requestAnimationFrame(()=>scene.classList.add("dragging"));
    });
    scene.addEventListener("dragend",()=>{scene.classList.remove("dragging");clearDropMarks();dragSceneId=null;dropScene=null;});
    scene.addEventListener("dragover",ev=>{
      if(!dragSceneId||dragSceneId===scene.dataset.scene)return;
      const from=sceneOf(a,dragSceneId),to=sceneOf(a,scene.dataset.scene);
      if(!from||!to||!!from.archived!==!!to.archived)return;
      ev.preventDefault();ev.stopPropagation();
      const r=scene.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2;
      clearDropMarks();scene.classList.add(after?"drop-after":"drop-before");
      dropScene={id:scene.dataset.scene,after};
    });
    scene.addEventListener("drop",ev=>{if(!dragSceneId)return;ev.preventDefault();ev.stopPropagation();const dt=dropScene,id=dragSceneId;clearDropMarks();if(dt)reorderScene(a,id,dt.id,dt.after);});
  });
}
function bindEncTarget(a,q){
  q("[data-enctgt]").forEach(handle=>{
    const enc=handle.closest(".enc"),e=findEnc(a,enc.dataset.enctgt||handle.dataset.enctgt);if(!e)return;
    const track=handle.parentElement,tip=handle.querySelector(".tgt-tip");let dragging=false;
    const apply=clientX=>{const r=track.getBoundingClientRect(),bud=encBudget(a,e);
      let frac=clamp((clientX-r.left)/r.width,0,1),val=clamp(Math.round(frac*bud[2]/25)*25,0,bud[2]);
      e.target=val;handle.style.left=(bud[2]?val/bud[2]*100:0)+"%";if(tip)tip.textContent=val.toLocaleString()+" XP";updateEncMeta(a,e);};
    handle.addEventListener("pointerdown",ev=>{ev.preventDefault();ev.stopPropagation();dragging=true;handle.classList.add("drag");try{handle.setPointerCapture(ev.pointerId);}catch(_){}apply(ev.clientX);});
    handle.addEventListener("pointermove",ev=>{if(dragging)apply(ev.clientX);});
    handle.addEventListener("pointerup",ev=>{if(!dragging)return;dragging=false;handle.classList.remove("drag");try{handle.releasePointerCapture(ev.pointerId);}catch(_){}saveAdv();});
  });
}
function openBestiaryPicker(a,e){
  if(!e)return;
  if(!state.lib.length){toast("No saved creatures yet — Forge one, or use Quick / Forge from the ⋯ menu.");return;}
  const ctrl=blankCtrl();ctrl.sort.key="name";
  const pool=()=>state.lib.map(m=>({m}));
  const desc={search:true,group:true,
    params:[
      {key:"type",label:"Type",get:r=>r.m.type||"—",values:()=>[...new Set(state.lib.map(m=>m.type||"—"))].sort()},
      {key:"cr",label:"CR",fmt:v=>"CR "+v,get:r=>r.m.cr,values:()=>[...new Set(state.lib.map(m=>m.cr))].sort((x,y)=>(CR_NUM[x]??0)-(CR_NUM[y]??0))},
    ],
    sortKeys:[
      {key:"name",label:"Name",cmp:(x,y)=>x.m.name.localeCompare(y.m.name)},
      {key:"cr",label:"CR",cmp:(x,y)=>(CR_NUM[x.m.cr]??0)-(CR_NUM[y.m.cr]??0)},
    ]};
  openModalRaw(`<h3 class="modal-h-row"><span>Add combatant — pick from Bestiary</span><button class="cr-help" id="bpHelp" aria-label="About this picker">?</button></h3>
    <div class="ctrl-icons" id="bpCtrlIcons"></div>
    <div class="ctrl-chips" id="bpChips"></div>
    <div id="bpBody" class="picker-scroll"></div>
    <div class="mrow picker-foot">
      <button class="btn ghost sm" id="bpChassis" style="width:auto">From chassis…</button>
      <button class="btn ghost sm" id="bpForge" style="width:auto">Forge new →</button>
      <button class="btn primary sm" id="bpClose" style="width:auto;margin-left:auto">Done</button>
    </div>`);
  bindHelpHover($("#bpHelp"),`Adds the chosen creature to “${esc(e.name)}”. You can add several without closing.`);
  const cardOf=o=>pickerCardHTML(o,"＋ Add",false);
  function draw(){
    renderCtrlChips($("#bpChips"),ctrl,desc,draw);
    renderRecords($("#bpBody"),ctrlApply(pool(),ctrl,desc),ctrl,desc,{cardOf,emptyMsg:"No creatures match these controls.",cap:300});
    $("#bpBody").querySelectorAll("[data-cardprev]").forEach(b=>bindPreviewHover(b,()=>state.lib.find(m=>m.id===b.dataset.cardprev)));
    $("#bpBody").querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>{a._focusEnc=e.id;addMonsterCombatant(e,b.dataset.pick);saveAdv();renderEncList(a);toast("Added.");}));
  }
  bindCtrlIcons($("#bpCtrlIcons"),ctrl,desc,draw);
  draw();
  $("#bpClose").addEventListener("click",closeModal);
  $("#bpForge").addEventListener("click",()=>{closeModal();forgeForEncounter(a,e);});
  $("#bpChassis").addEventListener("click",()=>{closeModal();openChassisForEncounter(a,e,true);});
}
// "Forge new →" from anywhere: park a pendingForge target, load a blank monster, jump to the Forge.
function forgeForEncounter(a,e){pendingForge={advId:a.id,encId:e.id};loadMonster(blankMonster());showBanner(`Forging a new monster for “${e.name}”. Save to add it to that encounter.`,()=>{pendingForge=null;hideBanner();});switchView("forge");}
function pushEncounter(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[,label]=diffOf(spent,bud),p=partyOf(a,e);
  const payload={forge:"encounter",v:2,adventure:a.name,encounter_tag:`${a.name} / ${e.name}`,
    party:{size:p.size,levels:partyLevels(p),overridden:!!e.partyOverride},
    battlefield_notes:e.notes||"",
    budget:{low:bud[0],moderate:bud[1],high:bud[2],spent,reads_as:label,note:"allies (faction Ally) already folded into budget via CR→level"},
    combatants:e.combatants.filter(c=>c.type!=="event").map(c=>{const m=c.type==="monster"?monOf(c):null;return{kind:c.type,statblock_name:c.type==="monster"?(m?m.name:"(missing)"):null,nickname:c.nickname||null,cr:combatCR(c),minion:combatIsMinion(c),xp_each:combatXPEach(c),count:Number(c.count),faction:c.faction};}),
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
$("#settingsBtn").addEventListener("click",()=>switchView("settings"));
// Click-to-roll: delegated on the statblock preview. Left-click = quick roll; right-click = options.
$("#statblock").addEventListener("click",e=>{const t=e.target.closest(".cc-roll[data-roll]");if(!t||!state.settings.clickRoll.on)return;doRoll(t.dataset.roll,{},rollLabelFor(t));});
$("#statblock").addEventListener("contextmenu",e=>{const t=e.target.closest(".cc-roll[data-roll]");if(!t||!state.settings.clickRoll.on)return;e.preventDefault();openRollMenu(t);});
// Read/write a dotted path inside state.settings (e.g. "colorCode.damage").
function settingPath(path,val){const p=path.split(".");let o=state.settings;for(let i=0;i<p.length-1;i++)o=o[p[i]];if(val!==undefined)o[p[p.length-1]]=val;return o[p[p.length-1]];}
async function resyncCloud(){const ok1=await jbinSet("library:monsters",state.lib),ok2=await jbinSet("library:adventures",state.adv);if(ok1&&ok2){setDirty(false);cloudReady=true;toast("Synced to cloud.");}else toast("Sync failed — your work stays on this device.");if($("#view-settings").classList.contains("active"))renderSettings();}
function clearLocalCache(){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf("mf_cache:")===0)keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));toast("Local cache cleared — reload to re-fetch from the cloud.");}
function renderSettings(){
  const body=$("#settingsBody");if(!body)return;const s=state.settings;
  const SW=(path,label,sub)=>`<label class="set-row${sub?" sub":""}"><span class="set-lbl">${label}</span><span class="switch"><input type="checkbox" data-set="${path}" ${settingPath(path)?"checked":""}><span class="sl"></span></span></label>`;
  body.innerHTML=`<h2 class="set-title">Settings</h2>
    <div class="set-card">
      <div class="set-head">Statblock colour-coding</div>
      ${SW("colorCode.on","Enable colour-coding")}
      <div class="set-subs${s.colorCode.on?"":" off"}">
        ${SW("colorCode.damage","Damage types",true)}
        ${SW("colorCode.dice","Dice, to-hit &amp; DCs",true)}
        ${SW("colorCode.conditions","Conditions",true)}
        ${SW("colorCode.ranges","Ranges &amp; areas",true)}
        ${SW("colorCode.abilityBlock","Ability-score block",true)}
      </div>
      <div class="set-note">Colours the Forge statblock preview only.</div>
    </div>
    <div class="set-card">
      <div class="set-head">Click-to-roll dice</div>
      ${SW("clickRoll.on","Enable click-to-roll")}
      <div class="set-subs${s.clickRoll.on?"":" off"}">
        ${SW("clickRoll.adv","Advantage / disadvantage",true)}
        ${SW("clickRoll.crit","Critical hit (double dice)",true)}
        ${SW("clickRoll.editFormula","Editable roll formula",true)}
      </div>
    </div>
    <div class="set-card">
      <div class="set-head">Adventure defaults</div>
      <div class="set-grid">
        <label class="f">Default party size<input type="number" min="1" max="12" data-set="defaults.partySize" value="${s.defaults.partySize}"></label>
        <label class="f">Default party level<input type="number" min="1" max="20" data-set="defaults.partyLevel" value="${s.defaults.partyLevel}"></label>
        <label class="f">Default faction<select data-set="defaults.faction">${FACTIONS.map(f=>`<option ${f===s.defaults.faction?"selected":""}>${esc(f)}</option>`).join("")}</select></label>
      </div>
      <div class="set-note">Seeds new adventures and combatants.</div>
    </div>
    <div class="set-card">
      <div class="set-head">Data &amp; sync</div>
      <div class="set-sync" id="setSync"></div>
      <div class="set-btns">
        <button class="btn ghost sm" id="setExport" style="width:auto">⭳ Export JSON</button>
        <button class="btn ghost sm" id="setImport" style="width:auto">⭱ Import JSON</button>
        <button class="btn ghost sm" id="setResync" style="width:auto">↻ Re-sync now</button>
        <button class="btn ghost sm danger" id="setClearCache" style="width:auto">Clear local cache</button>
      </div>
      <div class="set-note">JSONBin is the cloud store; a local mirror keeps you working offline. Cloud data is never deleted by “Clear local cache”.</div>
    </div>`;
  const dirty=isDirty();
  $("#setSync").innerHTML=`<span class="sync-dot ${cloudReady?(dirty?"warn":"ok"):"bad"}"></span>${cloudReady?(dirty?"Connected · unsynced local edits":"Connected · all changes synced"):"Offline · saved on this device"}`;
  body.querySelectorAll("[data-set]").forEach(el=>el.addEventListener("change",()=>{
    let v;
    if(el.type==="checkbox")v=el.checked;
    else if(el.type==="number")v=clamp(Number(el.value||1),Number(el.min||1),Number(el.max||99));
    else v=el.value;
    settingPath(el.dataset.set,v);saveSettings();syncFeatureClasses();renderPreview();
    if(el.dataset.set==="colorCode.on"||el.dataset.set==="clickRoll.on")renderSettings();
  }));
  $("#setExport").addEventListener("click",doExportJSON);
  $("#setImport").addEventListener("click",()=>$("#fileIn").click());
  $("#setResync").addEventListener("click",resyncCloud);
  $("#setClearCache").addEventListener("click",()=>confirmModal("Clear the on-device cache? Your cloud data is untouched and re-fetched on the next load.",clearLocalCache));
}
$("#libPaste").addEventListener("click",openImportModal);
$("#presetManage").addEventListener("click",()=>{presetSel.clear();presetModal();});
// Accumulates raw bestiary monsters across every upload this session so cross-file
// _copy bases resolve even when the base book was uploaded in a separate action.
let sessionBestiaryIndex=new Map();
// 5etools JSON uploader (Batch 28). One change handler ingests bestiary / spell /
// condition / books files; the kind is detected from the JSON's top-level keys.
$("#mdIn").addEventListener("change",e=>{
  const files=[...e.target.files];if(!files.length)return;
  Promise.all(files.map(f=>f.text().then(txt=>{let json=null;try{json=JSON.parse(txt);}catch(_){}return{name:f.name,json};})))
    .then(loaded=>{
      // 1. reference sheets first so bestiary/spell/condition loads can use them
      let bookAdded=false,legAdded=false;
      loaded.forEach(L=>{const k=L.json&&detectJsonKind(L.json);
        if(k==="book"){Object.assign(state.books,parseBooksJSON(L.json));bookAdded=true;state.refMeta.books={file:L.name,count:Object.keys(parseBooksJSON(L.json)).length};}
        if(k==="legendaryGroup"){Object.assign(state.legendaryGroups,parseLegendaryGroupsJSON(L.json));legAdded=true;state.refMeta.legGroups={file:L.name,count:((L.json.legendaryGroup||[]).length)};}});
      _storageFailed=false;
      // A newly-uploaded books.json must re-annotate EVERY already-loaded library (not just
      // ones uploaded afterwards), then persist so the labels survive a reload.
      if(bookAdded){saveBooks();reannotateBooks(true);}
      if(legAdded){saveLegGroups();}
      if(bookAdded||legAdded)saveRefMeta();
      // 2. base indexes (raw monsters + legendary groups) across this batch + the session
      loaded.forEach(L=>{if(L.json&&L.json.monster)L.json.monster.forEach(m=>{if(m&&m.name)sessionBestiaryIndex.set(((m.name||"")+"|"+(m.source||"")).toLowerCase(),m);});});
      const legIdx=new Map();Object.keys(state.legendaryGroups).forEach(k=>legIdx.set(k,state.legendaryGroups[k]));
      const summary=[];
      loaded.forEach(L=>{
        const kind=L.json?detectJsonKind(L.json):null;
        if(!kind){summary.push(`${L.name}: not recognised 5etools JSON`);return;}
        try{
          if(kind==="book"){summary.push(`${L.name}: ${Object.keys(parseBooksJSON(L.json)).length} book refs`);}
          else if(kind==="legendaryGroup"){summary.push(`${L.name}: ${(L.json.legendaryGroup||[]).length} legendary groups`);}
          else if(kind==="spell"){const p=parseSpellsJSON(L.json,L.name,state.books);state.spells=state.spells.filter(x=>x._source!==L.name).concat(p);saveSpells();buildSpellDatalist();summary.push(`${L.name}: ${p.length.toLocaleString()} spells`);}
          else if(kind==="condition"){const p=parseConditionsJSON(L.json,L.name,state.books);state.conditions=state.conditions.filter(x=>x._source!==L.name).concat(p);saveConditions();buildCondDatalist();summary.push(`${L.name}: ${p.length.toLocaleString()} conditions`);}
          else{const res=parseBestiaryJSON(L.json,L.name,state.books,sessionBestiaryIndex,legIdx);state.presets=state.presets.filter(x=>x._source!==L.name).concat(res.monsters);savePresets();buildMonsterDatalists();summary.push(`${L.name}: ${res.monsters.length.toLocaleString()} statblocks${res.skipped?` (${res.skipped} skipped — base not loaded)`:""}`);}
        }catch(err){summary.push(`${L.name}: failed to parse`);}
      });
      if(legAdded)reapplyLegGroups(); // backfill lair/regional onto already-loaded bestiaries
      // Concise feedback: for a multi-file batch show only the count of sources loaded.
      toast(summary.length>1?`Loaded ${summary.length} sources.`:`Loaded — ${summary[0]||"nothing"}`);
      if(_storageFailed)alertStack("Device storage full","Some libraries couldn't be saved and won't persist after a reload. Remove libraries you don't need to free space, then re-upload.");
      if($("#modalBg").classList.contains("show"))presetModal();
    });
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
// Stacked dialogs: rendered in their own overlay ABOVE the current modal (which stays open),
// so e.g. a remove-confirmation appears on top of the preset-library manager.
function stackDialog(html){const bg=document.createElement("div");bg.className="modal-bg stack show";
  bg.innerHTML=`<div class="modal" style="max-width:430px">${html}</div>`;document.body.appendChild(bg);
  bg.addEventListener("click",e=>{if(e.target===bg)bg.remove();});return bg;}
function confirmStack(msg,onYes){const bg=stackDialog(`<h3>Confirm</h3><p style="margin:-4px 0 14px">${esc(msg)}</p><div class="mrow"><button class="btn ghost sm" data-no style="width:auto">Cancel</button><button class="btn primary sm" data-yes style="width:auto">Yes</button></div>`);
  bg.querySelector("[data-no]").addEventListener("click",()=>bg.remove());
  bg.querySelector("[data-yes]").addEventListener("click",()=>{bg.remove();onYes();});}
function alertStack(title,msg){const bg=stackDialog(`<h3>${esc(title)}</h3><p style="margin:-4px 0 14px">${esc(msg)}</p><div class="mrow"><button class="btn primary sm" data-ok style="width:auto">OK</button></div>`);
  bg.querySelector("[data-ok]").addEventListener("click",()=>bg.remove());}

// ── 5etools paste importer ────────────────────────────────────────────────────

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
  const k=e.target.closest("[data-menu]");
  document.querySelectorAll(".menu.open").forEach(mn=>{if(!k||(mn.id!=="menu-"+k.dataset.menu&&!mn.contains(k)))mn.classList.remove("open");});
  if(k){const mn=document.getElementById("menu-"+k.dataset.menu);if(mn){
    const willOpen=!mn.classList.contains("open");mn.classList.toggle("open");
    // Screen-aware: flip a bottom-anchored menu upward when it would overrun the viewport.
    if(willOpen&&!mn.classList.contains("submenu")){mn.classList.remove("up");if(mn.getBoundingClientRect().bottom>window.innerHeight-8)mn.classList.add("up");}
    e.stopPropagation();}}
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
    const base=input.value===""?(input.id==="f_init"?initOf(M):(input.id&&input.id.startsWith("ab_")?Number(M[input.id.slice(3)]||10):0)):Number(input.value||0);
    const nv=Math.max(min,base+(+btn.dataset.d)*step);
    input.value=nv;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));
  }));
}

(async function init(){
  loadSettings();syncFeatureClasses();
  buildAbilityGrid();
  fillSelect("#f_size",SIZES);
  bindStatic();buildCRStepper();buildLibSelects();initFsCollapse();
  ["sp_walk","sp_climb","sp_fly","sp_swim","sp_burrow","se_darkvision","se_blindsight","se_tremorsense","se_truesight"].forEach(id=>wrapStepper($("#"+id),5));
  wrapStepper($("#f_ac"),1,0);wrapStepper($("#f_init"),1,-20);
  ABILS.forEach(a=>wrapStepper($("#ab_"+a),1,1));
  loadRefLibs();buildCondDatalist();buildSpellDatalist();
  await loadAll();
  buildMonsterDatalists();
  loadMonster(blankMonster());
})();
