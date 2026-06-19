// Monster Forge — CORE: app state, storage (JSONBin cloud + IndexedDB ref libs), settings, the
// monster data model, ability grid, and bindStatic (the forge field wiring).
// Loaded as a classic <script> sharing ONE global scope with the other files (data.js, parsers.js,
// core/forge/engine/bestiary/adventures/app — in that order). No imports/exports. See DEVELOPMENT.md.

"use strict";
let state={lib:[],adv:[],selAdv:null,presets:[],spells:[],conditions:[],rules:[],books:{},disabledLibs:[],legendaryGroups:{},refMeta:{},settings:null};
// ── User settings (Batch 52) ─ persisted on-device only (mf_settings). Feature toggles gate the
// statblock colour-coding (B53) and click-to-roll dice (B54); defaults seed new adventures/combatants.
const SETTINGS_KEY="mf_settings";
const SETTINGS_DEFAULT={
  colorCode:{on:true,damage:true,dice:true,conditions:true,ranges:true,abilityBlock:true},
  clickRoll:{on:true,adv:true,crit:true,editFormula:true},
  defaults:{partySize:4,partyLevel:1,faction:"Enemy"},
  homebrew:{gritMin:false}, // grit: damage rolls deal at least their pre-crit maximum (B65)
  notes:{adventure:true,scene:true,encounter:true}, // include a notes field on newly-created items (B65)
  refPopovers:{on:true}, // hover/click definition popovers for spells & conditions (rule finder ignores this) (B68)
  combat:{hpMode:"rolled",initMode:"roll",dexTiebreak:true,partyHP:true,groupInit:true} // Combat Tracker: roll vs average HP; roll vs average initiative; init DEX tiebreak; track party HP; share one init across an identical-monster group (B116)
};
function _mergeDefaults(def,got){const o=Array.isArray(def)?[]:{};for(const k in def){const dv=def[k],gv=got?got[k]:undefined;o[k]=(dv&&typeof dv==="object"&&!Array.isArray(dv))?_mergeDefaults(dv,gv&&typeof gv==="object"?gv:{}):(gv===undefined?dv:gv);}return o;}
function loadSettings(){let got=null;try{got=JSON.parse(localStorage.getItem(SETTINGS_KEY));}catch(e){}state.settings=_mergeDefaults(SETTINGS_DEFAULT,got||{});}
function saveSettings(){_store(SETTINGS_KEY,state.settings);}
let M=null, pendingForge=null;
const SHOW_DERIVED=false; // B23: legacy AC/Attack/Save-DC chips above the statblock, kept but off by default
// Persist the in-progress Forge creature so a reload restores exactly what was being edited (B78).
// Stored locally only (never the cloud bestiary); replayed through loadMonster on init.
function persistForgeDraft(){try{if(M)localStorage.setItem("mf_forgedraft",JSON.stringify(M));}catch(e){}}
function readForgeDraft(){try{const d=localStorage.getItem("mf_forgedraft");return d?JSON.parse(d):null;}catch(e){return null;}}

// ── Uploaded reference libraries (Batch 13/14) ───────────────────────────────
// 5etools .md dumps the user uploads at runtime: statblocks (chassis bases), spells,
// and conditions/glossary terms. Stored in localStorage only (never JSONBin / never
// the repo): bulky, copyrighted reference data that stays on-device. Each kind lives
// in its own array/key so a spell is never mistaken for a statblock (Batch 14 note).
const PRESET_KEY="mf_presets",SPELL_KEY="mf_spells",COND_KEY="mf_conditions",RULE_KEY="mf_rules",BOOK_KEY="mf_books",DISLIB_KEY="mf_disabled_libs",LEGGRP_KEY="mf_leggroups",REFMETA_KEY="mf_refmeta";
// Quota-aware writes: a failed setItem (device storage full) flips _storageFailed so the
// upload flow can surface a single consolidated alert instead of silently dropping data.
let _storageFailed=false;
function _store(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true;}catch(e){_storageFailed=true;return false;}}
// ── Reference libraries live in IndexedDB (B59) ──────────────────────────────
// The 5etools dumps (a parsed bestiary alone is several MB) blow past the ~5MB localStorage cap,
// which silently dropped data on the live origin. IndexedDB holds far more, persists, and works
// everywhere. Small ref state (books/disabled/leg-groups/meta) stays in localStorage.
const IDB_NAME="monsterforge",IDB_STORE="kv";let _idbP=null;
function idbOpen(){if(_idbP)return _idbP;_idbP=new Promise((res,rej)=>{let req;try{req=indexedDB.open(IDB_NAME,1);}catch(e){return rej(e);}
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE);};
  req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});return _idbP;}
function idbGet(key){return idbOpen().then(db=>new Promise((res,rej)=>{const r=db.transaction(IDB_STORE,"readonly").objectStore(IDB_STORE).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);})).catch(()=>undefined);}
function idbSet(key,val){return idbOpen().then(db=>new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,"readwrite");tx.objectStore(IDB_STORE).put(val,key);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);})).catch(()=>{_storageFailed=true;return false;});}
// Read an IDB list, migrating any legacy localStorage copy on first run (then freeing the LS key).
async function _loadIdbList(idbKey,lsKey){let v=await idbGet(idbKey);
  if(v==null){let old=null;try{old=JSON.parse(localStorage.getItem(lsKey));}catch(e){}
    if(old!=null){v=old;if(await idbSet(idbKey,old)){try{localStorage.removeItem(lsKey);}catch(e){}}}}
  return v||[];}
async function loadPresets(){try{state.presets=(await _loadIdbList("presets",PRESET_KEY)).map(normalizeMonster);}catch(e){state.presets=[];}}
function savePresets(){idbSet("presets",state.presets);}
async function loadSpells(){try{state.spells=await _loadIdbList("spells",SPELL_KEY);}catch(e){state.spells=[];}}
function saveSpells(){idbSet("spells",state.spells);}
async function loadConditions(){try{state.conditions=await _loadIdbList("conditions",COND_KEY);}catch(e){state.conditions=[];}}
function saveConditions(){idbSet("conditions",state.conditions);}
async function loadRules(){try{state.rules=await _loadIdbList("rules",RULE_KEY);}catch(e){state.rules=[];}}
function saveRules(){idbSet("rules",state.rules);}
function loadBooks(){try{state.books=JSON.parse(localStorage.getItem(BOOK_KEY))||{};}catch(e){state.books={};}}
function saveBooks(){_store(BOOK_KEY,state.books);}
function loadDisabled(){try{state.disabledLibs=JSON.parse(localStorage.getItem(DISLIB_KEY))||[];}catch(e){state.disabledLibs=[];}}
function saveDisabled(){_store(DISLIB_KEY,state.disabledLibs);}
function loadLegGroups(){try{state.legendaryGroups=JSON.parse(localStorage.getItem(LEGGRP_KEY))||{};}catch(e){state.legendaryGroups={};}}
function saveLegGroups(){_store(LEGGRP_KEY,state.legendaryGroups);}
function loadRefMeta(){try{state.refMeta=JSON.parse(localStorage.getItem(REFMETA_KEY))||{};}catch(e){state.refMeta={};}}
function saveRefMeta(){_store(REFMETA_KEY,state.refMeta);}
async function loadRefLibs(){loadBooks();loadDisabled();loadLegGroups();loadRefMeta();await Promise.all([loadPresets(),loadSpells(),loadConditions(),loadRules()]);reannotateBooks();reapplyLegGroups();}
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
function enRules(){return state.rules.filter(r=>isLibEnabled("rule",r._source||""));}
// statblock sources only (drives the From-chassis source picker)
function presetSources(){const s=[];enPresets().forEach(m=>{const k=m._source||"Uploaded";const e=s.find(x=>x.name===k);if(e)e.count++;else s.push({name:k,count:1});});return s;}
// every uploaded library across kinds, for the manage modal
function presetLibraries(){const map={};
  const add=(arr,kind)=>arr.forEach(x=>{const n=x._source||"Uploaded",key=kind+LIBSEP+n,e=map[key]=map[key]||{name:n,kind,count:0,books:{},groups:{}};
    e.count++;if(x._book)e.books[x._book]=(e.books[x._book]||0)+1;if(x._group)e.groups[x._group]=(e.groups[x._group]||0)+1;});
  add(state.presets,"statblock");add(state.spells,"spell");add(state.conditions,"condition");add(state.rules,"rule");
  const dom=o=>Object.keys(o).sort((a,b)=>o[b]-o[a])[0]||"";
  return Object.values(map).map(e=>({name:e.name,kind:e.kind,count:e.count,book:dom(e.books),group:dom(e.groups),enabled:isLibEnabled(e.kind,e.name)}));}
const KIND_LABEL={statblock:"Statblocks",spell:"Spells",condition:"Conditions",rule:"Rules"};

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
  // Dev seed sandbox (seed.js): never write the local test data to the real cloud bin.
  if(typeof window!=="undefined"&&window.__MF_SEED)return true;
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
// asHtml lets roll notifications highlight the result number; callers MUST esc any user content (B77).
function toast(t,ms,asHtml){const e=$("#toast");if(asHtml)e.innerHTML=t;else e.textContent=t;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("show"),ms||1900);}
// Wrap a roll's result number in a highlight span for the notification toast.
function rollNum(n){return `<span class="toast-num">${n}</span>`;}
// Capitalise a single word (e.g. a lower-case damage type → "Piercing").
function capWord(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
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
const _ABFULL={strength:"str",dexterity:"dex",constitution:"con",intelligence:"int",wisdom:"wis",charisma:"cha"};
const ABIL_NAME={str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
function _freqLabel(s){const t=s.replace(/\s+/g," ").trim();if(/^at will$/i.test(t))return "At Will";const m=t.match(/^(\d)\s*\/\s*day(\s+each)?$/i);if(m)return m[1]+"/Day"+(m[2]?" Each":"");if(/^cantrip/i.test(t))return "Cantrips";return t.replace(/\b\w/g,c=>c.toUpperCase());}
const _SPELL_FREQ="(?:At Will|Cantrips?(?:\\s*\\([^)]*\\))?|\\d\\s*\\/\\s*Day(?:\\s+Each)?|\\d(?:st|nd|rd|th)[ -]?Level(?:\\s*\\([^)]*\\))?)";
function parseSpellGroups(text){
  const re=new RegExp("("+_SPELL_FREQ+")\\s*:\\s*([\\s\\S]*?)(?=(?:"+_SPELL_FREQ+")\\s*:|$)","gi");
  const groups=[];let m;
  while((m=re.exec(text))){const spells=m[2].replace(/[.;]\s*$/,"").replace(/\s+/g," ").trim().replace(/\s*,\s*/g,", ");if(spells)groups.push({freq:_freqLabel(m[1]),spells});}
  return groups;
}
// Legacy statblocks place Spellcasting in traits; 2024 puts it under Actions. Detect a spellcasting
// trait, structure it into the app's spell-mode action (ability/DC/groups), and move it; if the spell
// list can't be parsed, move the trait to Actions as plain text so nothing is lost. Idempotent.
function convertLegacySpellcasting(m){
  if(!Array.isArray(m.traits)||!m.traits.length)return;
  const keep=[];
  m.traits.forEach(t=>{
    if(t&&/spellcasting/i.test(t.name||"")&&t.text){
      const text=t.text,abM=text.match(/(strength|dexterity|constitution|intelligence|wisdom|charisma)/i),dcM=text.match(/DC\s*(\d+)/i),groups=parseSpellGroups(text);
      m.actions=m.actions||[];
      if(groups.length)m.actions.push({mode:"spell",name:t.name,ability:abM?_ABFULL[abM[1].toLowerCase()]:"cha",dc:dcM?Number(dcM[1]):"",atk:"",groups});
      else m.actions.push({mode:"text",name:t.name,text:t.text});
    }else keep.push(t);
  });
  m.traits=keep;
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
  convertLegacySpellcasting(m);
  m._auto=m._auto||{ac:false,hp:false};
  m.sort=m.sort||{};
  // Bestiary organisation (Batch 13): workflow status, free-text tag, archive flag
  if(!STATUSES.includes(m.status))m.status="Draft";
  if(typeof m.tag==="string"){m.tags=m.tag?[m.tag]:[];delete m.tag;} // migrate single tag → tags[]
  if(!Array.isArray(m.tags))m.tags=[];
  m.archived=!!m.archived;
  m.minion=!!m.minion;
  m.pinned=!!m.pinned; // pinned bestiary cards ignore filters (B78)
  if(!Array.isArray(m.tools))m.tools=[];
  return m;
}
function normalizeAdv(a){
  a.archived=!!a.archived;a.notes=a.notes||"";a.levels=a.levels||[];a.color=a.color||"";
  a.notesOn=a.notesOn!==false; // notes field shown unless explicitly removed (B65)
  a.pinned=!!a.pinned; // pinned adventures float to the top of the column (B78)
  // Party roster for the Combat Tracker (B80): named PCs with AC/HP/initiative + DM custom fields.
  a.party=(Array.isArray(a.party)?a.party:[]).map(p=>({id:p.id||uid(),name:p.name||"",ac:p.ac??"",hp:p.hp??"",init:p.init??"",
    fields:(Array.isArray(p.fields)?p.fields:[]).map(f=>({label:f.label||"",value:f.value||""}))}));
  a.scenes=(a.scenes||[]).map(s=>({id:s.id||uid(),name:s.name||"Scene",collapsed:!!s.collapsed,notes:s.notes||"",notesOn:s.notesOn!==false,archived:!!s.archived,pinned:!!s.pinned}));
  a.encounters=(a.encounters||[]).map(e=>{
    e.archived=!!e.archived;e.notes=e.notes||"";e.notesOn=e.notesOn!==false;e.partyOverride=e.partyOverride||null;e.sceneId=e.sceneId||null;
    // Lifecycle status (CT6): draft→ready→completed; "archived" is reflected from the e.archived flag
    // (kept as the operative archive mechanism) so existing filtering/behavior is unchanged.
    e.status=ENC_STATUSES.includes(e.status)?e.status:"draft";
    e.pinned=!!e.pinned; // pinned encounters float to the top of their scene / the ungrouped list (B78)
    e.combat=e.combat||null; // Combat Tracker state, null until a combat is started (B80)
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
function buildAbilityGrid(){$("#abilGrid").innerHTML=ABILS.map(a=>`<div class="cell cc-ab-${a}"><div class="ab">${a.toUpperCase()}</div><input type="number" id="ab_${a}" placeholder="10"><div class="mod" id="mod_${a}">+0</div><button type="button" class="svtog" id="sv_${a}" aria-pressed="false">Save <b id="svv_${a}">+0</b></button></div>`).join("");}
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
// Chip-field scroll-fade (B82): flag the scroller (.chipfield, or .cf-main for gear) so CSS fades the
// edge that has hidden chips — a discoverability hint that the row scrolls. Updated on scroll/resize.
function updateChipFade(el){if(!el)return;const max=el.scrollWidth-el.clientWidth;el.classList.toggle("ov-l",el.scrollLeft>1);el.classList.toggle("ov-r",el.scrollLeft<max-1);}
function observeChipFade(el){if(!el)return;if(!el._fadeBound){el._fadeBound=true;el.addEventListener("scroll",()=>updateChipFade(el));if(window.ResizeObserver)new ResizeObserver(()=>updateChipFade(el)).observe(el);}requestAnimationFrame(()=>updateChipFade(el));}
// Condition Immunities as removable chips. m.cimm stays a comma-joined string (compatible with
// import/export and the statblock); the chip UI just splits/joins it.
function cimmList(){return (M.cimm||"").split(",").map(s=>s.trim()).filter(Boolean);}
function renderCimm(){const box=$("#cimmChips");if(!box)return;const list=cimmList();
  box.innerHTML=list.map((c,i)=>`<span class="chip${findCondition(c)?" known":""}">${esc(c)}<button class="chipx" data-rmcimm="${i}" title="Remove">×</button></span>`).join("");
  const ci=$("#f_cimm_input");if(ci)ci.placeholder=list.length?"":"add condition…"; // drop the prompt once a chip exists (B78)
  observeChipFade($("#f_cimm_field"));
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
  const gi=$("#f_gear_input");if(gi)gi.placeholder=list.length?"":"add gear…"; // drop the prompt once a chip exists (B78)
  observeChipFade(document.querySelector("#f_gear_field .cf-main"));
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
    <select data-si="${i}" class="skName cc-ab-${SKILLS[s[0]]||"int"}">${Object.keys(SKILLS).map(k=>`<option value="${k}" ${k===s[0]?"selected":""}>${k.replace(/_/g," ")}</option>`).join("")}</select>
    <button type="button" class="tritog skProf" data-si="${i}"></button>
    <button class="iconbtn" data-rmskill="${i}">✕</button></div>`).join("");
  box.querySelectorAll(".skName").forEach(el=>el.addEventListener("change",e=>{M.skills[+e.target.dataset.si][0]=e.target.value;renderSkills();renderPreview();}));
  box.querySelectorAll(".skProf").forEach(el=>{paintTri(el,M.skills[+el.dataset.si][1]||"prof");el.addEventListener("click",()=>{const i=+el.dataset.si;const nv=nextTri(M.skills[i][1]||"prof");M.skills[i][1]=nv;paintTri(el,nv);renderPreview();});});
  box.querySelectorAll("[data-rmskill]").forEach(el=>el.addEventListener("click",e=>{M.skills.splice(+e.target.dataset.rmskill,1);renderSkills();renderPreview();}));
}
// Tool proficiencies (B39) — official 2024 tool list; a simple proficient/none list (no ability math).
function renderTools(){const box=$("#toolRows");if(!box)return;
  box.innerHTML=(M.tools||[]).map((t,i)=>`<div class="rowline">
    <select data-ti="${i}" class="tlName cc-ab-${TOOL_ABIL[t]||"int"}">${TOOLS.map(k=>`<option ${k===t?"selected":""}>${esc(k)}</option>`).join("")}</select>
    <button class="iconbtn" data-rmtool="${i}">✕</button></div>`).join("");
  box.querySelectorAll(".tlName").forEach(el=>el.addEventListener("change",e=>{M.tools[+e.target.dataset.ti]=e.target.value;renderTools();renderPreview();}));
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
