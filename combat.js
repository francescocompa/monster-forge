// Combat Tracker — split out of adventures.js (B131). A live initiative tracker launched from an
// encounter (see combatHTML / runCombat in adventures.js). Loaded as a classic <script> AFTER
// adventures.js and shares the one global lexical scope (no imports) — encounter-roster helpers stay in
// adventures.js; this file owns the live fight: start/advance, the order grid, rows, HP popover, death
// saves, drag/regroup, the round bar, tools menu and the active-combatant panel. See DEVELOPMENT.md.

// ── Combat Tracker (B80) ─────────────────────────────────────────────────────
// A live initiative tracker launched from an encounter. enc.combat holds the ordered instances; the
// combat view (full-screen) renders the order + the active combatant. Resumable + cloud-synced.
let combatCtx=null; // {advId,encId} of the encounter whose combat is open (persisted across reloads)
// Init-card multi-select (B120): a Set of selected combatant ids. Click selects; shift/cmd toggles; a
// selection action bar lets you set status / add an effect / apply damage to all selected at once.
let combatSel=new Set();
function clearCombatSel(){if(!combatSel.size)return false;combatSel.clear();return true;}
function combatSelInOrder(){const ctx=combatOf();return ctx?ctx.e.combat.order.filter(it=>combatSel.has(it.id)):[];}
function toggleCombatSel(id){if(combatSel.has(id))combatSel.delete(id);else combatSel.add(id);renderCombat();}
function selectOnlyCombat(id){const was=combatSel.size===1&&combatSel.has(id);combatSel.clear();if(id&&!was)combatSel.add(id);renderCombat();}
function persistCombatCtx(){try{combatCtx?localStorage.setItem("mf_combatctx",JSON.stringify(combatCtx)):localStorage.removeItem("mf_combatctx");}catch(e){}}
function readCombatCtx(){try{const d=localStorage.getItem("mf_combatctx");return d?JSON.parse(d):null;}catch(e){return null;}}
function combatOf(){if(!combatCtx)return null;const a=state.adv.find(x=>x.id===combatCtx.advId);const e=a&&findEnc(a,combatCtx.encId);return (e&&e.combat)?{a,e}:null;}
// The encounter loaded into the Combat tab, regardless of whether combat is active (CT5). combatOf()
// stays the active-combat gate for tracker actions; loadedCtx() drives the tab's framing/empty state.
function loadedCtx(){if(!combatCtx)return null;const a=state.adv.find(x=>x.id===combatCtx.advId);const e=a&&findEnc(a,combatCtx.encId);return e?{a,e}:null;}
// Sibling encounters in the same scene (active only), in display order — for the scene prev/next nav.
function sceneEncs(a,e){return e.sceneId?a.encounters.filter(x=>x.sceneId===e.sceneId&&!x.archived):[];}
// Load an encounter into the Combat tab without starting combat (used by the load popup + scene nav).
function loadCombatEncounter(a,e){combatCtx={advId:a.id,encId:e.id};persistCombatCtx();clearCombatSel();switchView("combat");renderCombat();}
// Load popup (CT5, reworked CT7-fixes): grouped adventure→scene→encounter picker with a status filter,
// collapsible scenes (chevron, collapsed by default; the running encounter's scene auto-expands), the
// currently-loaded line highlighted, and inline create buttons.
function openLoadCombat(){
  const ctrl=blankCtrl();ctrl.group="adventure";ctrl.sort={key:"name",dir:1};
  const exp={}; // expanded scene ids (scenes collapsed by default)
  const advColl={}; // collapsed adventure ids (adventures expanded by default)
  const isRunning=(a,e)=>combatCtx&&combatCtx.advId===a.id&&combatCtx.encId===e.id;
  if(combatCtx){const a=state.adv.find(x=>x.id===combatCtx.advId),e=a&&findEnc(a,combatCtx.encId);if(e&&e.sceneId)exp[e.sceneId]=true;}
  const recOf=(a,e)=>({m:{name:encDName(e),type:""},a,e});
  const allRecs=()=>{const out=[];state.adv.filter(a=>!a.archived).forEach(a=>a.encounters.filter(e=>!e.archived).forEach(e=>out.push(recOf(a,e))));return out;};
  const desc={icons:["search","filter","sort","group"],defaultSortKey:"name",
    params:[
      {key:"status",label:"Status",fmt:v=>ENC_STATUS_LABEL[v]||v,get:r=>encStatus(r.e),values:()=>{const s=new Set();state.adv.forEach(a=>{if(a.archived)return;a.encounters.forEach(e=>{if(!e.archived)s.add(encStatus(e));});});return ENC_STATUSES.filter(x=>s.has(x));}},
      {key:"adventure",label:"Adventure",get:r=>advDName(r.a),values:()=>state.adv.filter(a=>!a.archived&&a.encounters.some(e=>!e.archived)).map(a=>advDName(a))},
    ],
    sortKeys:[
      {key:"name",label:"Name",cmp:(x,y)=>encDName(x.e).localeCompare(encDName(y.e))},
      {key:"created",label:"Creation",cmp:(x,y)=>String(x.e.id).localeCompare(String(y.e.id))},
    ]};
  const encRow=(a,e,withAdv)=>{const empty=!(e.combatants&&e.combatants.length);
    return `<div class="lc-enc${isRunning(a,e)?" running":""}" data-lcpick="${a.id}:${e.id}" role="button" tabindex="0">
      <span class="lc-enc-l"><span class="lc-enc-nm">${esc(encDName(e))}${withAdv?` <span class="lc-enc-adv">${esc(advDName(a))}</span>`:""}</span>${empty?'<span class="lc-empty-cap">empty</span>':""}</span>
      <span class="lc-enc-meta"><span class="enc-status sm st-${encStatus(e)}" data-lcstatus="${a.id}:${e.id}" title="Change status">${ENC_STATUS_LABEL[encStatus(e)]}</span></span>
    </div>`;};
  // Scene row: the chevron toggles the encounter list; clicking the rest loads the scene (its running
  // encounter, else its first) into the Combat tab. An empty scene's name just expands (nothing to load).
  const sceneBlock=(a,s,sRecs,isEmpty)=>{const open=!!exp[s.id],hasRun=sRecs.some(r=>isRunning(a,r.e));
    return `<div class="lc-scene-wrap${hasRun?" running":""}">
      <div class="lc-scene-h${open?" open":""}">
        <button class="lc-scene-tog" data-lcscene="${s.id}" title="${open?"Collapse":"Expand"} encounters" aria-label="Toggle encounters"><span class="lc-chev">${CHEV_R}</span></button>
        <button class="lc-scene-load" data-lcsceneload="${s.id}" title="Load this scene"><span class="lc-scene-nm">${esc(sceneDName(s))}</span>${isEmpty?'<span class="lc-empty-cap">empty</span>':`<span class="lc-scene-n">${sRecs.length}</span>`}</button>
      </div>
      <div class="lc-scene-encs"${open?"":" hidden"}>${sRecs.map(r=>encRow(a,r.e)).join("")||'<div class="lc-empty">No encounters.</div>'}</div></div>`;};
  const advBlock=(a,aRecs)=>{
    const liveScenes=(a.scenes||[]).filter(x=>!x.archived);let inner="";
    liveScenes.forEach(s=>{const sRecs=aRecs.filter(r=>r.e.sceneId===s.id),total=a.encounters.filter(e=>!e.archived&&e.sceneId===s.id).length;
      if(!sRecs.length&&total>0)return; // has encounters but all filtered out → hide
      inner+=sceneBlock(a,s,sRecs,total===0);});
    inner+=aRecs.filter(r=>!liveScenes.some(s=>s.id===r.e.sceneId)).map(r=>encRow(a,r.e)).join("");
    const filtering=ctrl.q||Object.keys(ctrl.filters).length;
    if(!inner&&filtering)return "";
    const collapsed=advColl[a.id];
    return `<div class="lc-adv${collapsed?" collapsed":""}">
      <div class="lc-adv-h">
        <button class="lc-adv-tog" data-lcadvtog="${a.id}" title="${collapsed?"Expand":"Collapse"}" aria-label="Toggle adventure"><span class="lc-chev">${CHEV_R}</span></button>
        ${advDot(a.id,a.color)}<span class="lc-adv-nm">${esc(advDName(a))}</span>
        <button class="lc-adv-kebab" data-lcadvadd="${a.id}" title="Add encounter or scene" aria-label="Add encounter or scene">⋯</button>
      </div>
      <div class="lc-adv-body"${collapsed?" hidden":""}>${inner||'<div class="lc-empty">No encounters.</div>'}</div>
    </div>`;};
  const draw=()=>{
    renderCtrlChips($("#lcChips"),ctrl,desc,draw);
    const recs=ctrlApply(allRecs(),ctrl,desc),body=$("#lcBody");
    if(ctrl.group==="adventure"){
      const byAdv=new Map();recs.forEach(r=>{(byAdv.get(r.a.id)||byAdv.set(r.a.id,[]).get(r.a.id)).push(r);});
      let html="";state.adv.filter(a=>!a.archived).forEach(a=>{html+=advBlock(a,byAdv.get(a.id)||[]);});
      body.innerHTML=html||'<div class="empty-state">No encounters yet. Add one below.</div>';
    }else if(ctrl.group==="status"){
      let html="";ENC_STATUSES.forEach(stat=>{const rs=recs.filter(r=>encStatus(r.e)===stat);if(rs.length)html+=`<div class="lc-statgrp"><div class="lc-stat-h">${ENC_STATUS_LABEL[stat]}</div>${rs.map(r=>encRow(r.a,r.e,true)).join("")}</div>`;});
      body.innerHTML=html||'<div class="empty-state">No encounters match.</div>';
    }else body.innerHTML=recs.length?recs.map(r=>encRow(r.a,r.e,true)).join(""):'<div class="empty-state">No encounters match.</div>';
    body.querySelectorAll("[data-lcpick]").forEach(el=>el.addEventListener("click",()=>{const[advId,encId]=el.dataset.lcpick.split(":");const a=state.adv.find(x=>x.id===advId),e=a&&findEnc(a,encId);if(e){closeModal();loadCombatEncounter(a,e);}}));
    body.querySelectorAll("[data-lcstatus]").forEach(el=>el.addEventListener("click",ev=>{ev.stopPropagation();const[advId,encId]=el.dataset.lcstatus.split(":");const a=state.adv.find(x=>x.id===advId),e=a&&findEnc(a,encId);if(e)openEncStatusMenu(a,e,el,draw);}));
    body.querySelectorAll("[data-lcscene]").forEach(el=>el.addEventListener("click",()=>{exp[el.dataset.lcscene]=!exp[el.dataset.lcscene];draw();}));
    body.querySelectorAll("[data-lcsceneload]").forEach(el=>el.addEventListener("click",()=>{const sid=el.dataset.lcsceneload,a=state.adv.find(x=>(x.scenes||[]).some(sc=>sc.id===sid));if(!a)return;const encs=a.encounters.filter(e=>e.sceneId===sid&&!e.archived),run=encs.find(e=>isRunning(a,e))||encs[0];if(run){closeModal();loadCombatEncounter(a,run);}else{exp[sid]=!exp[sid];draw();}}));
    body.querySelectorAll("[data-lcadvtog]").forEach(el=>el.addEventListener("click",()=>{advColl[el.dataset.lcadvtog]=!advColl[el.dataset.lcadvtog];draw();}));
    body.querySelectorAll("[data-lcadvadd]").forEach(el=>el.addEventListener("click",ev=>{ev.stopPropagation();const aid=el.dataset.lcadvadd;
      const p=showPopover(el,`<button class="popitem" data-add="enc">＋ Add encounter</button><button class="popitem" data-add="scene">＋ Add scene</button>`);
      p.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",e2=>{e2.stopPropagation();const a=state.adv.find(x=>x.id===aid);closePopover();
        if(b.dataset.add==="enc"){a.encounters.push(blankEncounter());toast("Encounter added.");}
        else a.scenes.push({id:uid(),name:"",collapsed:false,notes:"",notesOn:notesDefault("scene"),archived:false,pinned:false});
        saveAdv();draw();}));}));
  };
  openModalRaw(`<h3 class="modal-h-row"><span>Load encounter</span></h3>
    <div class="ctrl-bar"><div class="ctrl-icons" id="lcCtrlIcons"></div><div class="ctrl-chips" id="lcChips"></div></div>
    <div class="load-combat picker-scroll" id="lcBody"></div>
    <div class="mrow picker-foot"><button class="btn primary sm" id="lcClose" style="width:auto;margin-left:auto">Close</button></div>`);
  bindCtrlIcons($("#lcCtrlIcons"),ctrl,desc,draw);
  $("#lcClose").addEventListener("click",closeModal);
  draw();
}
function cFac(f){return f==="PC"?"pc":facClass(f);}
// HP for a monster instance per the Combat setting (rolled from Hit Dice, else average / book HP).
function rollMonsterHP(m){
  if(state.settings.combat.hpMode==="rolled"&&m.hpf&&/\d+\s*d\s*\d+/i.test(m.hpf))return Math.max(1,rollFormula(m.hpf).total);
  return Math.max(1,Number(m.hp||exprAvg(m.hpf||"1")||1));
}
function rollInit(mod){return rollFormula("1d20"+(mod>0?"+"+mod:mod<0?String(mod):"")).total;}
// Initiative when combat starts: roll 1d20+mod, or take a static "average" (10+mod) per the Settings
// option (CT8). The DM can re-roll everyone from the combat toolbar afterwards.
function rollOrAvgInit(mod){return (state.settings.combat&&state.settings.combat.initMode==="average")?10+mod:rollInit(mod);}
function sortInitiative(order){const tie=state.settings.combat.dexTiebreak;order.sort((x,y)=>{
  const xn=x.init==null,yn=y.init==null;if(xn!==yn)return xn?-1:1; // blank (manual, unset) inits float to the top
  if(xn)return 0;return (y.init-x.init)||(tie?((y.dex||0)-(x.dex||0)):0);});}
// Run fn with the global working monster M temporarily set to `m` (so the statblock builders +
// colorizer, which read M, render an arbitrary creature). Restores M synchronously (CT4).
function withM(m,fn){const prev=M;M=m;try{return fn();}finally{M=prev;}}
function monById(id){return state.lib.find(x=>x.id===id);}
// Auto-detect decrementable resources from a creature's entries (CT4): "(N/Day)" features, recharge
// abilities, and the legendary-action pool. Stored on the combat instance; the DM can spend/restore.
function detectResources(m){
  const res=[],seen=new Set();
  const items=[].concat(m.traits||[],m.actions||[],m.bonus||[],m.reactions||[],(m.legend&&m.legend.items)||[],(m.lair&&m.lair.items)||[]);
  items.forEach(e=>{
    const nm=(e.name||""),hay=nm+" "+(e.text||e.response||e.trigger||"");
    const base=nm.replace(/\s*\(.*$/,"").trim()||"Feature";
    const day=hay.match(/\((\d+)\s*\/\s*Day\)/i);
    if(day){const k="d:"+base.toLowerCase();if(!seen.has(k)){seen.add(k);res.push({label:base,max:Number(day[1]),used:0});}}
    const rc=nm.match(/\(Recharge\s+(\d+)(?:\s*[–-]\s*(\d+))?\)/i);
    if(rc){const k="r:"+base.toLowerCase();if(!seen.has(k)){seen.add(k);res.push({label:base,max:1,used:0,recharge:rc[2]?`${rc[1]}–${rc[2]}`:`${rc[1]}`});}}
  });
  if(m.legend&&m.legend.on){const lm=(m.legend.intro||"").match(/(\d+)\s+(?:legendary action|\(per round\))/i);res.push({label:"Legendary Actions",max:lm?Number(lm[1]):3,used:0,perRound:true});}
  return res;
}
// Build the ordered instances and roll initiative. count:N → N HP-separate rows sharing one rolled
// initiative (groupId = the combatant entry). PCs roll d20 + their roster initiative modifier.
// Build the order instance(s) for one encounter combatant entry (event = 1, monster/quick = its count;
// identical monsters share one rolled initiative via groupId = the combatant entry id).
// The display base name for an entry (nickname, else statblock name) — drives the merged numbering.
function combatBaseName(c){if(c.type==="event")return c.name||"Event";if(c.nickname)return c.nickname;const m=c.type==="monster"?monOf(c):null;return m?m.name:(c._lostName||(c.type==="quick"?"Combatant":"?"));}
// Group initiative for identical-monster groups? (Settings combat.groupInit) — on = one shared roll per
// entry; off = each instance rolls its own initiative (kept separate in the order).
function groupInitOn(){return !state.settings.combat||state.settings.combat.groupInit!==false;}
// `nameTotal`/`nameOffset` come from startCombat: continuous numbering across same-name entries (two goblin
// groups of 5 → Goblin 1–5 then 6–10), while each entry stays separate for initiative. `srcEntry` links an
// instance back to its encounter entry (independent of groupId, which may be per-instance when ungrouped).
function combatantInstances(c,nameTotal,nameOffset){
  if(c.type==="event")return [{id:uid(),kind:"event",srcId:null,srcEntry:c.id,name:c.name||"Event",init:Number(c.init)||0,initMod:0,initRolled:true,dex:0,ac:null,hpMax:null,hpCur:null,hpTemp:0,status:"active",conditions:[],comment:c.text||"",faction:"Neutral",groupId:c.id,resources:[]}];
  const m=c.type==="monster"?monOf(c):null,base=combatBaseName(c);
  const im=m?initOf(m):0,count=Math.max(1,Number(c.count||1)),arr=[];
  const grouped=groupInitOn(),gi=grouped?rollOrAvgInit(im):null;
  const total=nameTotal||count,off=nameOffset||0;
  for(let i=0;i<count;i++){const hp=m?rollMonsterHP(m):null;
    arr.push({id:uid(),kind:c.type,srcId:c.type==="monster"?c.monsterId:null,srcEntry:c.id,
      name:total>1?`${base} ${off+i+1}`:base,init:grouped?gi:rollOrAvgInit(im),initMod:im,initRolled:autoRollOn(),dex:m?Number(m.dex||10):10,
      ac:m?(m.ac??null):null,hpMax:hp,hpCur:hp,hpTemp:0,status:"active",conditions:[],comment:"",faction:c.faction||"Enemy",groupId:grouped?c.id:uid(),resources:m?detectResources(m):[]});}
  return arr;
}
// Auto-roll initiative? (Settings combat.initMode) — off = "average" mode: combatants start with a dimmed
// average init (still counts for sorting) until the round-bar d20 is clicked to roll them.
function autoRollOn(){return !(state.settings.combat&&state.settings.combat.initMode==="average");}
// Roll party (PC) initiative on start? (Settings combat.rollParty) — off = PCs start blank at the top,
// flagged for the DM to type each character's roll.
function rollPartyOn(){return !(state.settings.combat&&state.settings.combat.rollParty===false);}
// A party member is a shared-roster id (B136); pull AC/HP/Initiative from its typed fields.
function pcInstance(rid){const c=rosterById(rid);if(!c)return null;
  const av=charFieldVal(c,"ac"),hv=charFieldVal(c,"hp");
  const im=effInit(c),man=!rollPartyOn();
  const acN=av===""||av==null?null:Number(av),hpN=hv===""||hv==null?null:Number(hv);
  return {id:uid(),kind:"pc",srcId:rid,srcEntry:"pc:"+rid,name:c.name||"PC",init:man?null:rollOrAvgInit(im),initMod:im,initRolled:man?false:autoRollOn(),initManual:man,dex:0,
    ac:acN!=null&&!isNaN(acN)?acN:null,hpMax:hpN!=null&&!isNaN(hpN)?hpN:null,hpCur:hpN!=null&&!isNaN(hpN)?hpN:null,
    hpTemp:0,status:"active",conditions:[],comment:"",faction:"PC",groupId:"pc:"+rid,resources:[]};}
// Re-sync live PC combat instances from their roster source after an edit (e.g. closing the character
// detail). AC + the initiative modifier track the source; max HP follows too, preserving any damage taken
// (a full-HP combatant rises with a raised max). Abilities/skills already read live in pcSheetHTML.
function resyncPcInstances(){
  const ctx=combatOf();if(!ctx)return;let ch=false;
  ctx.e.combat.order.forEach(it=>{if(it.kind!=="pc")return;const c=rosterById(it.srcId);if(!c)return;
    const av=charFieldVal(c,"ac"),acN=(av===""||av==null)?null:Number(av);
    if(acN!=null&&!isNaN(acN)&&acN!==it.ac){it.ac=acN;ch=true;}
    const hv=charFieldVal(c,"hp"),hpN=(hv===""||hv==null)?null:Number(hv);
    if(hpN!=null&&!isNaN(hpN)&&hpN!==it.hpMax){const full=it.hpCur===it.hpMax;it.hpMax=hpN;it.hpCur=full?hpN:Math.min(it.hpCur,hpN);ch=true;}
    const im=effInit(c);if(im!==it.initMod){it.initMod=im;ch=true;}
  });
  if(ch)saveAdv();
}
function startCombat(a,e){
  const order=[];
  // Pass 1: total instances per base name → continuous numbering across same-name entries.
  const totals={},offs={};
  e.combatants.forEach(c=>{const n=combatBaseName(c);totals[n]=(totals[n]||0)+Math.max(1,Number(c.count||1));});
  // Pass 2: create, advancing the per-name offset so each entry's numbers follow the previous one's.
  e.combatants.forEach(c=>{const n=combatBaseName(c),cnt=Math.max(1,Number(c.count||1));order.push(...combatantInstances(c,totals[n],offs[n]||0));offs[n]=(offs[n]||0)+cnt;});
  (a.party||[]).forEach(rid=>{const inst=pcInstance(rid);if(inst)order.push(inst);});
  sortInitiative(order);
  e.combat={active:true,round:1,turnIndex:0,order};saveAdv();
}
// Live-update (CT7b note 4): pull any encounter combatant / party member not yet in the order into the
// running combat (rolling init/HP), re-sorting while keeping whose turn it is. Returns true if changed.
function syncCombatOrder(a,e){const cb=e.combat;if(!cb)return false;
  const have=new Set(cb.order.map(o=>o.srcEntry||o.groupId));let added=false;
  e.combatants.forEach(c=>{if(!have.has(c.id)){const n=combatBaseName(c),existing=cb.order.filter(o=>(o.name||"").replace(/\s+\d+$/,"")===n).length,cnt=Math.max(1,Number(c.count||1));cb.order.push(...combatantInstances(c,existing+cnt,existing));added=true;}});
  (a.party||[]).forEach(rid=>{if(!have.has("pc:"+rid)){const inst=pcInstance(rid);if(inst){cb.order.push(inst);added=true;}}});
  if(added&&combatView(cb).sort==="init"){const cur=cb.order[cb.turnIndex];sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));}
  return added;
}
// Refresh after a combatant is added to an encounter — updates the adventures list and, if that
// encounter's combat is live, syncs the order + re-renders the tracker.
function afterCombatantAdded(a,e){saveAdv();if(e.combat&&e.combat.active){syncCombatOrder(a,e);renderCombat();}renderEncList(a);}
function partyHPOn(){return !state.settings.combat||state.settings.combat.partyHP!==false;}
// Whether an instance's HP is tracked/shown (party HP can be disabled in Settings — CT7b).
function hpTracked(it){return it.hpMax!=null&&!(it.kind==="pc"&&!partyHPOn());}
// Apply a signed HP change: positive = damage (depletes temp HP first), negative = heal (current only).
function changeHP(it,amt){if(it.hpMax==null)return;
  if(amt>0){let d=amt;const t=it.hpTemp||0;if(t>0){const u=Math.min(t,d);it.hpTemp=t-u;d-=u;}it.hpCur=clamp(it.hpCur-d,0,it.hpMax);}
  else it.hpCur=clamp(it.hpCur-amt,0,it.hpMax);
  applyDownState(it);}
// Adjust max HP by a signed delta (e.g. Aid: +5 raises max AND current); reductions clamp current.
function adjustMaxHP(it,delta){if(it.hpMax==null)return;it.hpMax=Math.max(1,it.hpMax+delta);if(delta>0)it.hpCur=Math.min(it.hpCur+delta,it.hpMax);else it.hpCur=Math.min(it.hpCur,it.hpMax);}
const CI_STATUSES=["active","waiting","dead"];
const CI_STATUS_LABEL={active:"Active",waiting:"Waiting",dead:"Dead"};
// FA Free solid status icons (B118) — shapes convey status so it no longer relies on colour (which clashed
// with the faction colours). alive/active = shield-heart, waiting = circle-pause, dead = skull.
const SHIELD_HEART_ICON='<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M269.4 2.9C265.2 1 260.7 0 256 0s-9.2 1-13.4 2.9L54.3 82.8c-22 9.3-38.4 31-38.3 57.2 .5 99.2 41.3 280.7 213.6 363.2 16.7 8 36.1 8 52.8 0 172.4-82.5 213.2-264 213.6-363.2 .1-26.2-16.3-47.9-38.3-57.2L269.4 2.9zM249.6 183.5l6.4 8.5 6.4-8.5c11.1-14.8 28.5-23.5 46.9-23.5 32.4 0 58.7 26.3 58.7 58.7l0 5.3c0 49.1-65.8 98.1-96.5 118.3-9.5 6.2-21.5 6.2-30.9 0-30.7-20.2-96.5-69.3-96.5-118.3l0-5.3c0-32.4 26.3-58.7 58.7-58.7 18.5 0 35.9 8.7 46.9 23.5z"/></svg>';
const CIRCLE_PAUSE_ICON='<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM224 192l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-128c0-17.7 14.3-32 32-32s32 14.3 32 32zm128 0l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-128c0-17.7 14.3-32 32-32s32 14.3 32 32z"/></svg>';
const SKULL_ICON='<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M416 427.4c58.5-44 96-111.6 96-187.4 0-132.5-114.6-240-256-240S0 107.5 0 240c0 75.8 37.5 143.4 96 187.4L96 464c0 26.5 21.5 48 48 48l32 0 0-40c0-13.3 10.7-24 24-24s24 10.7 24 24l0 40 64 0 0-40c0-13.3 10.7-24 24-24s24 10.7 24 24l0 40 32 0c26.5 0 48-21.5 48-48l0-36.6zM96 256a64 64 0 1 1 128 0 64 64 0 1 1 -128 0zm256-64a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>';
const CI_STATUS_ICON={active:SHIELD_HEART_ICON,waiting:CIRCLE_PAUSE_ICON,dead:SKULL_ICON};
// Reaction tracker (B120): a per-combatant toggle (FA Free arrow-turn-up) that resets at the start of each
// of its turns. Reaction is "available" unless explicitly set false (so existing combats default to available).
const REACT_ICON='<svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M32 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c53 0 96-43 96-96l0-306.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 109.3 160 416c0 17.7-14.3 32-32 32l-96 0z"/></svg>';
// FA-free "shield-blank" — the AC chip glyph on combat rows (B124).
const SHIELD_ICON='<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.5 31 38.4 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.4-57.2L242.6 2.9C246.8 1 251.4 0 256 0z"/></svg>';
// Toggle in place (just flip the chip class) rather than re-rendering — a full render would refresh the
// selected statblock preview, which is jarring (B128).
function toggleReaction(itId){const it=combatItem(itId);if(!it)return;if(PLAYER_MODE&&!playerCanEdit(it))return;it.reaction=(it.reaction===false);saveAdv();
  const el=document.querySelector(`[data-cireact="${itId}"]`);if(el)el.classList.toggle("used",it.reaction===false);else renderCombat();}
// Concentration toggle (B125): a bullseye chip beside reaction — "on" = the creature is concentrating on a
// spell. Manual (broken by failed CON saves, which the DM adjudicates); unlike reaction it doesn't auto-reset.
const CONC_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>';
// FA-free solid circle-check / circle-xmark — death-save success / failure pips in the HP popover (B127).
const CIRCLE_CHECK_ICON='<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>';
const CIRCLE_XMARK_ICON='<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';
function toggleConcentration(itId){const it=combatItem(itId);if(!it)return;if(PLAYER_MODE&&!playerCanEdit(it))return;it.concentration=!it.concentration;saveAdv();
  const el=document.querySelector(`[data-ciconc="${itId}"]`);if(el)el.classList.toggle("on",it.concentration);else renderCombat();}
let combatRolling=false; // transient: show the "Rolling initiative…" flourish over a freshly-started order
let _caPeekId=null; // last previewed (peeked) combatant id — the peek only animates when this changes (B128)
function runCombat(a,e){
  combatCtx={advId:a.id,encId:e.id};persistCombatCtx();
  const fresh=!e.combat||!e.combat.active;
  if(fresh){
    if(!e.combatants.some(c=>c.type!=="event")&&!a.party.length){toast("Add combatants or party members first.");return;}
    startCombat(a,e);
  }
  if(!e.archived)e.status="active"; // started (or restarted after completed) → Active (CT7)
  saveAdv();switchView("combat");
  // Fresh start: a brief "calculating" flourish so it's clear initiative was just rolled (the roll already
  // happened in startCombat — this is purely presentational), then reveal the order.
  if(fresh&&autoRollOn()){combatRolling=true;renderCombat();setTimeout(()=>{combatRolling=false;renderCombat();},1200);}
  else renderCombat(); // average mode shows the dimmed averages immediately — roll via the round-bar d20
}
function isDown(it){return !!it&&it.hpMax!=null&&it.hpCur<=0;}
// "Out" of the turn order for skip purposes: downed (0 HP) or explicitly marked dead (CT7b).
function isOut(it){return isDown(it)||(it&&it.status==="dead");}
// Death-saves / "down" (B126). At 0 HP a combatant either drops to "down" (rolls death saves, a hidden
// subset of Active) or is marked dead outright — governed by the downMode setting (players|anyone|nobody).
function downMode(){return (state.settings.combat&&state.settings.combat.downMode)||"players";}
function downEligible(it){if(!it||it.kind==="event"||it.hpMax==null)return false;const m=downMode();return m==="anyone"?true:m==="players"?it.kind==="pc":false;}
function dsOf(it){return it&&it.deathSaves?it.deathSaves:{success:0,fail:0};}
// Dying = down, eligible, not yet dead, and neither three failures (dead) nor three successes (stable).
function isDying(it){if(!(isDown(it)&&downEligible(it))||it.status==="dead")return false;const d=dsOf(it);return d.fail<3&&d.success<3;}
function isStable(it){if(!(isDown(it)&&downEligible(it))||it.status==="dead")return false;return dsOf(it).success>=3;}
// Reconcile a combatant's state with its HP after any change: at 0 HP start death saves (eligible) or mark
// dead (not eligible); above 0 clear any death-save tracking. Called from changeHP + direct HP edits.
function applyDownState(it){
  if(!it||it.hpMax==null||it.kind==="event")return;
  if(it.hpCur<=0){
    it.concentration=false; // down/dead drops concentration outright — no save prompt (B127)
    if(it.status==="dead")return;
    if(downEligible(it)){if(!it.deathSaves)it.deathSaves={success:0,fail:0};}
    else it.status="dead";
  }else if(it.deathSaves){it.deathSaves=null;}
}
// Mark a death save (success|fail) to count n (click a filled pip again to step it back). 3 failures = dead.
function setDeathSave(itId,kind,n){const it=combatItem(itId);if(!it)return;if(!it.deathSaves)it.deathSaves={success:0,fail:0};
  it.deathSaves[kind]=clamp(it.deathSaves[kind]===n?n-1:n,0,3);
  if((it.deathSaves.fail||0)>=3){it.status="dead";}
  saveAdv();renderCombat();}
// Step initiative, skipping downed combatants in the travel direction (round wraps as we pass the
// ends). The step cap (>n) guards against an infinite loop when everyone is down. Forward steps
// tick the conditions of the combatant whose turn is beginning (minimal turn/round automation).
function combatAdvance(dir){if(PLAYER_MODE)return;const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,n=cb.order.length;if(!n)return;
  const prev=cb.order[cb.turnIndex];
  let ti=cb.turnIndex,round=cb.round,steps=0;
  do{ti+=dir;
    if(ti>=n){ti=0;round++;}else if(ti<0){ti=n-1;round=Math.max(1,round-1);}
    steps++;
  }while(isOut(cb.order[ti])&&steps<=n);
  cb.turnIndex=ti;cb.round=round;
  if(dir>0){const cur=cb.order[ti];tickConditions(cb,prev,"end");tickConditions(cb,cur,"start");resetRoundResources(cur);if(cur)cur.reaction=true;} // regain reaction at the start of its turn
  saveAdv();renderCombat();}
function resetRoundResources(it){if(it&&it.resources)it.resources.forEach(r=>{if(r.perRound)r.used=0;});}
// Duration tick: when `turnIt` reaches the given turn `edge` (start|end), decrement every effect (across all
// combatants) that ends on that combatant's turn at that edge, dropping those that reach 0. An effect's
// timing defaults to the start of its own owner's turn (endWhen "start", endWho = owner) — i.e. the
// original behaviour. The add-effect popover can retarget it to any combatant's turn start/end.
function tickConditions(cb,turnIt,edge){
  if(!cb||!turnIt)return;const gone=[];
  cb.order.forEach(owner=>{
    if(!owner.conditions||!owner.conditions.length)return;
    owner.conditions=owner.conditions.filter(c=>{
      if((c.endWhen||"start")!==edge)return true;
      if((c.endWho||owner.id)!==turnIt.id)return true;
      if(c.rounds>0){c.rounds--;if(c.rounds<=0){gone.push(`${owner.name}: ${c.name}`);return false;}}
      return true;
    });
  });
  if(gone.length)toast(`${gone.join("; ")} ended.`);
}
// Per-combatant edits (CT3): conditions, note, ungroup, remove.
function combatItem(id){const ctx=combatOf();return ctx?ctx.e.combat.order.find(x=>x.id===id):null;}
function addCombatCond(itId,name,rounds,timing,effGroup){const it=combatItem(itId);if(!it||!name)return;if(!playerCondAllowed(it))return;const c={name,rounds:Math.max(0,Number(rounds)||0)};if(timing){if(timing.endWhen==="end")c.endWhen="end";if(timing.endWho)c.endWho=timing.endWho;}if(effGroup)c.effGroup=effGroup;(it.conditions=it.conditions||[]).push(c);saveAdv();renderCombat();}
function removeCombatCond(itId,i){const it=combatItem(itId);if(!it||!it.conditions)return;if(!playerCondAllowed(it))return;it.conditions.splice(i,1);saveAdv();renderCombat();}
function setCombatNote(itId,text){const it=combatItem(itId);if(!it)return;it.comment=text;saveAdv();renderCombat();}
// Split a count:N group into independent combatants — each re-rolls its own initiative.
function ungroupCombatant(itId){if(PLAYER_MODE)return;const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,it=combatItem(itId);if(!it)return;
  const cur=cb.order[cb.turnIndex];
  cb.order.filter(x=>x.groupId===it.groupId).forEach(x=>{x.init=rollInit(x.initMod||0);x.groupId=x.id;});
  sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));saveAdv();renderCombat();}
function removeCombatant(itId){if(PLAYER_MODE)return;const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,idx=cb.order.findIndex(x=>x.id===itId);if(idx<0)return;
  cb.order.splice(idx,1);if(idx<cb.turnIndex)cb.turnIndex--;
  cb.turnIndex=Math.max(0,Math.min(cb.turnIndex,cb.order.length-1));saveAdv();renderCombat();}
// Condition/effect chip: anything the app can describe becomes a reflink (global hover/click → definition
// popover). Resolution order: a parsed condition, then the curated effect library (masteries + common
// buffs/debuffs, CT10), then a parsed spell — so masteries and tracked spell-effects get a description too.
function condChipHTML(itId,c,i){
  const eff=findCuratedEffect(c.name,c.effGroup);
  const ref=findCondition(c.name)?"condition":eff?"effect":(findSpell(c.name)?"spell":null);
  // Show the state-adjective on the chip (Haste → "Hasted") so the combatant reads as the state it's in; the
  // popover (data-name) keeps the canonical effect name.
  const disp=(eff&&eff.adj)||c.name;
  const label=ref?`<span class="reflink reflink-plain" data-ref="${ref}" data-name="${esc(c.name)}">${esc(disp)}</span>`:`<span>${esc(disp)}</span>`;
  return `<span class="cc-chip cc-cond${ref?" known":""}">${label}${c.rounds>0?`<span class="cc-dur" title="Rounds remaining">${c.rounds}</span>`:""}<button class="cc-x" data-rmcond="${itId}:${i}" title="Remove">×</button></span>`;
}
// A chip's hover tooltip and a click-popover (e.g. the add-effect popover) share the single `_pop`
// instance, so a bare mouseleave→closePopover would slam the click-popover shut the moment the cursor
// leaves the chip toward it. Only dismiss the hover TOOLTIP (tailPopover adds `.tail-pop`) (B133).
function closeTipPop(){if(_pop&&_pop.classList.contains("tail-pop"))closePopover();}
function openCondAdd(itId,anchor,targets){
  const ctx=combatOf(),order=ctx?ctx.e.combat.order:[];
  const self=order.find(o=>o.id===itId),selfName=self?self.name:"this creature";
  const whoItems=order.map(o=>`<button type="button" class="popitem" data-whoid="${esc(o.id)}">${esc(o.name)}</button>`).join("");
  const p=showPopover(anchor,`<div class="cond-add">
    <div class="cond-add-row">
      <div class="cond-combo">
        <input type="text" class="cond-input" placeholder="Search or type an effect…" autocomplete="off">
        <button class="cond-combo-chev" type="button" tabindex="-1" aria-label="Browse effects" title="Browse effects">${FS_CHEVRON}</button>
      </div>
      <button class="cond-clock" type="button" title="Set when it ends (whose turn · start/end)">${ALARM_CLOCK_ICON}</button>
      <input type="number" class="cond-rounds" min="0" placeholder="∞" title="Duration in rounds (blank = until removed)">
      <button class="btn primary sm cond-go" style="width:auto">Add</button>
    </div>
    <div class="cond-list" hidden></div>
    <div class="cond-when" hidden>
      <span class="cw-lbl">ends at</span>
      <button class="cond-edge" type="button" data-edge="start" title="Toggle: ends at turn start / end"><span class="cw-hg">${HOURGLASS_ICON}</span><span class="cw-t">turn start</span></button>
      <span class="cw-lbl">of</span>
      <div class="cond-who-wrap">
        <button type="button" class="cond-who is-self" data-whoid="${esc(itId)}" title="Whose turn ends it"><span class="cw-who-t">${esc(selfName)}</span>${FS_CHEVRON}</button>
        <div class="cond-who-list" hidden>${whoItems}</div>
      </div>
    </div></div>`);
  const inp=p.querySelector(".cond-input"),rd=p.querySelector(".cond-rounds"),clk=p.querySelector(".cond-clock"),when=p.querySelector(".cond-when"),edge=p.querySelector(".cond-edge"),who=p.querySelector(".cond-who"),list=p.querySelector(".cond-who-list"),clist=p.querySelector(".cond-list");
  inp.focus();
  // One inline grouped list inside the popover (B129 — reverted from the B127 tabs): Conditions (the library's
  // true conditions, not diseases/status), Masteries (the 2024 weapon masteries) and Spells (continuous —
  // non-instantaneous — effects) as headed sections in a single scrollable list, filtered by the search field.
  // The list lives in the popover (not a separate floating dropdown), so the cursor can move onto it freely.
  const condNames=()=>enConditions().filter(c=>(c.category||"Conditions")==="Conditions").map(c=>c.name).sort((a,b)=>a.localeCompare(b));
  const curatedNames=g=>()=>CURATED_EFFECTS.filter(e=>e.group===g).map(e=>e.name).sort((a,b)=>a.localeCompare(b));
  const curatedSet=new Set(CURATED_EFFECTS.map(e=>e.name.toLowerCase()));
  // "An effect you'd track on a combatant": concentration, or a short timed duration (rounds/minutes) — NOT
  // instantaneous, and NOT the long hour+/permanent/until-dispelled durations that are almost all utility
  // (Alarm, wards, etc.). Curated entries are excluded — they have their own Spell effects group above.
  const spellNames=()=>[...new Set(enSpells().filter(s=>{const d=s.duration||"";
    if(curatedSet.has(s.name.toLowerCase()))return false;
    if(/concentration/i.test(d))return true;
    if(/instant|until dispelled|permanent|special/i.test(d))return false;
    return /\b(?:round|minute)s?\b/i.test(d);
  }).map(s=>s.name))].sort((a,b)=>a.localeCompare(b));
  // The 3rd element (an effGroup tag) disambiguates a name that exists in more than one curated group (e.g.
  // "Slow" is both a weapon mastery and a spell in 5e 2024 — B242) so the right definition/rules text shows.
  const GROUPS=[["Conditions",condNames,null],["Weapon masteries",curatedNames("mastery"),"mastery"],["Spell effects",curatedNames("spell"),"spell"],["Spells",spellNames,null]];
  const chev=p.querySelector(".cond-combo-chev");
  const renderList=()=>{const q=inp.value.trim().toLowerCase();
    const html=GROUPS.map(([label,fn,eg])=>{const items=fn().filter(v=>!q||v.toLowerCase().includes(q));
      return items.length?`<div class="cl-grp">${label}</div>`+items.map(v=>`<button type="button" class="cl-item" data-v="${esc(v)}"${eg?` data-eg="${eg}"`:""}>${esc(v)}</button>`).join(""):"";}).join("");
    clist.innerHTML=html||`<div class="cl-empty">No match. Press Add to use this name.</div>`;};
  // The grouped list is collapsed by default — it opens on the chevron (or once the user starts typing) (B133).
  const setList=open=>{clist.toggleAttribute("hidden",!open);chev.classList.toggle("open",open);if(open)renderList();};
  chev.addEventListener("click",ev=>{ev.preventDefault();setList(clist.hasAttribute("hidden"));inp.focus();});
  inp.addEventListener("input",()=>{if(inp.value.trim())setList(true);else renderList();});
  clist.addEventListener("click",e=>{const b=e.target.closest(".cl-item");if(!b)return;commitName(b.dataset.v,b.dataset.eg||null);});
  clk.addEventListener("click",()=>{const open=when.hasAttribute("hidden");when.toggleAttribute("hidden",!open);clk.classList.toggle("on",open);});
  edge.addEventListener("click",()=>{const toEnd=edge.dataset.edge==="start";edge.dataset.edge=toEnd?"end":"start";edge.querySelector(".cw-t").textContent=toEnd?"end turn":"turn start";edge.classList.toggle("is-end",toEnd);edge.classList.remove("pop");void edge.offsetWidth;edge.classList.add("pop");});
  // Custom whose-turn dropdown (inline — showPopover is single-instance so it can't nest in this popover).
  who.addEventListener("click",e=>{e.stopPropagation();const open=list.hasAttribute("hidden");list.toggleAttribute("hidden",!open);who.classList.toggle("open",open);});
  list.querySelectorAll("[data-whoid]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();who.dataset.whoid=b.dataset.whoid;who.querySelector(".cw-who-t").textContent=b.textContent;who.classList.toggle("is-self",b.dataset.whoid===itId);list.setAttribute("hidden","");who.classList.remove("open");}));
  const commitName=(name,effGroup)=>{name=(name||"").trim();const timed=!when.hasAttribute("hidden");closePopover();if(!name)return;
    (targets&&targets.length?targets:[itId]).forEach(tid=>addCombatCond(tid,name,rd.value,timed?{endWhen:edge.dataset.edge,endWho:who.dataset.whoid===tid?null:who.dataset.whoid}:null,effGroup));};
  const commit=()=>commitName(inp.value);
  p.querySelector(".cond-go").addEventListener("click",commit);
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit();}else if(e.key==="Escape")closePopover();});
  rd.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit();}});
}
function openNoteEdit(itId,anchor){
  const it=combatItem(itId);if(!it)return;
  const p=showPopover(anchor,`<div class="note-edit"><textarea class="popinput note-ta" rows="3" placeholder="Note…">${esc(it.comment||"")}</textarea><button class="btn primary sm note-go">Save</button></div>`);
  const ta=p.querySelector("textarea");ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
  const commit=()=>{const v=ta.value.trim();closePopover();setCombatNote(itId,v);};
  p.querySelector(".note-go").addEventListener("click",commit);
  ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();commit();}else if(e.key==="Escape")closePopover();});
}
// Set one combatant's status directly (kebab menu / selection bar) (B123).
function setCombatStatus(itId,status){if(PLAYER_MODE)return;const it=combatItem(itId);if(!it)return;it.status=status;saveAdv();renderCombat();}
function openCombatRowMenu(itId,anchor){
  const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,it=combatItem(itId);if(!it)return;
  const groupN=cb.order.filter(x=>x.groupId===it.groupId).length;
  const isCur=cb.order[cb.turnIndex]&&cb.order[cb.turnIndex].id===itId;
  let html=`<button class="popitem" data-act="turn"${isCur?" disabled":""}>Make current turn</button>`;
  if(it.kind!=="event"){
    html+=`<div class="popgrp-h">Status</div>`;
    html+=CI_STATUSES.map(s=>{const on=(it.status||"active")===s;return `<button class="popitem has-ico${on?" on":""}" data-st="${s}"><span class="csb-ico">${CI_STATUS_ICON[s]}</span>${CI_STATUS_LABEL[s]}${on?'<span class="pop-tick">●</span>':""}</button>`;}).join("");
  }
  html+=`<div class="popsep"></div><button class="popitem" data-act="note">${it.comment?"Edit note":"Add note"}</button>`;
  if(it.kind!=="event")html+=`<button class="popitem" data-act="cond">Add effect</button>`;
  if(it.hpMax!=null)html+=`<button class="popitem" data-act="temp">Set temp HP</button><button class="popitem" data-act="max">Adjust max HP</button>`;
  if(groupN>1)html+=`<button class="popitem" data-act="ungroup">Ungroup (separate initiative)</button>`;
  // Manual reorder fallback (drag needs a pointer): only when the displayed order == the turn order.
  if(combatDragOK(cb)){const idx=cb.order.findIndex(x=>x.id===itId);html+=`<div class="popsep"></div><button class="popitem" data-act="up"${idx<=0?" disabled":""}>Move up</button><button class="popitem" data-act="down"${idx>=cb.order.length-1?" disabled":""}>Move down</button>`;}
  html+=`<div class="popsep"></div><button class="popitem danger" data-act="remove">Remove from combat</button>`;
  const p=showPopover(anchor,html);
  const act=k=>{closePopover();if(k==="turn")setCurrentTurn(itId);else if(k==="note")openNoteEdit(itId,anchor);else if(k==="cond")openCondAdd(itId,anchor);else if(k==="temp")openHPNumEdit(itId,anchor,"temp");else if(k==="max")openHPNumEdit(itId,anchor,"max");else if(k==="up")moveCombatant(itId,-1);else if(k==="down")moveCombatant(itId,1);else if(k==="ungroup")ungroupCombatant(itId);else if(k==="remove")removeCombatant(itId);};
  p.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("click",()=>act(b.dataset.act)));
  p.querySelectorAll("[data-st]").forEach(b=>b.addEventListener("click",()=>{closePopover();setCombatStatus(itId,b.dataset.st);}));
}
// Temp-HP set (absolute) / max-HP adjust (signed delta, e.g. +5 for Aid) via a small popover (CT7b).
function openHPNumEdit(itId,anchor,kind){
  const it=combatItem(itId);if(!it)return;const isMax=kind==="max";
  const p=showPopover(anchor,`<div class="note-edit"><label class="cond-rl">${isMax?"Adjust max by (±)":"Temp HP"} <input type="number" class="popinput hpnum" value="${isMax?"":(it.hpTemp||0)}" placeholder="${isMax?"+5":"0"}" style="width:80px"></label><button class="btn primary sm hpnum-go" style="width:auto">${isMax?"Apply":"Set"}</button></div>`);
  const inp=p.querySelector(".hpnum");inp.focus();inp.select();
  const commit=()=>{const v=Number(inp.value||0);closePopover();const t=combatItem(itId);if(!t)return;if(isMax){if(v)adjustMaxHP(t,v);}else t.hpTemp=Math.max(0,v);saveAdv();renderCombat();};
  p.querySelector(".hpnum-go").addEventListener("click",commit);
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit();}else if(e.key==="Escape")closePopover();});
}
// HP management popover (B124): opened from the row's compact HP control. Primary field is damage/heal
// (positive damages — temp absorbs first; negative heals), with quick ±1/±5 chips and editable current/temp.
// CON save bonus from the statblock (proficient → + PB), for the concentration prompt. Null when unknown (PCs).
function combatConSave(it){if(!it||it.kind!=="monster")return null;const m=monById(it.srcId);if(!m)return null;const pb=pbForCR(m.cr);return mod(m.con)+((m.saves||[]).includes("con")?pb:0);}
// Concentration save prompt for `lost` HP taken: DC = max(10, ⌊damage/2⌋), with the CON save bonus if known.
function concCheckPrompt(it,lost){return {dc:Math.max(10,Math.floor(lost/2)),bonus:combatConSave(it)};}
function openHPManage(itId,anchor,concPrompt){
  const it=combatItem(itId);if(!it||it.hpMax==null)return;if(PLAYER_MODE&&!playerCanEdit(it))return;
  const headHP=t=>`${t.hpCur}/${t.hpMax}${t.hpTemp?` <span class="hpm-tmp">+${t.hpTemp}</span>`:""}`;
  const barFill=t=>{const r=t.hpMax?t.hpCur/t.hpMax:0;return `width:${clamp(r*100,0,100)}%;background:${r>.5?"var(--ok)":r>.25?"var(--warn)":"var(--bad)"}`;};
  const concHTML=concPrompt?`<div class="hpm-conc"><span class="hpm-conc-t"><b>Concentration check</b>: DC ${concPrompt.dc}${concPrompt.bonus!=null?` · CON ${sgn(concPrompt.bonus)}`:""}</span>${concPrompt.bonus!=null?`<button class="btn primary sm hpm-conc-roll" style="width:auto">Roll</button>`:""}</div>`:"";
  const p=showPopover(anchor,`<div class="hp-manage">
    <div class="hpm-head"><span class="hpm-nm">${esc(it.name)}</span><span class="ini hpm-cur-disp">${headHP(it)}</span></div>
    <div class="hpm-bar"><i style="${barFill(it)}"></i></div>
    <div class="hpm-row"><input type="number" class="hpm-dmg" placeholder="damage / heal" autocomplete="off"><button class="btn primary sm hpm-apply" style="width:auto">Apply</button></div>
    <div class="hpm-fields"><label>Current<input type="number" class="hpm-cur" value="${it.hpCur}" min="0" max="${it.hpMax}"></label><label>Temp<input type="number" class="hpm-temp" value="${it.hpTemp||0}" min="0"></label></div>
    ${(isDown(it)&&downEligible(it))?deathSavesRowHTML(it):""}
    ${concHTML}
  </div>`);
  const dmg=p.querySelector(".hpm-dmg");dmg.focus();
  // A full re-render keeps the row (death saves, dying/dead variant, HP control) correct; then we reopen the
  // popover anchored to the fresh HP control, carrying any concentration prompt and pulsing its marker.
  const reopen=prompt=>{saveAdv();renderCombat();
    if(prompt){const chip=document.querySelector(`[data-ciconc="${itId}"]`);if(chip){chip.classList.remove("pulse");void chip.offsetWidth;chip.classList.add("pulse");}}
    const a2=document.querySelector(`[data-hpmanage="${itId}"]`);if(a2)openHPManage(itId,a2,prompt);};
  const applyDmg=()=>{const v=Number(dmg.value||0);if(!v)return;
    const before=(it.hpCur||0)+(it.hpTemp||0);changeHP(it,v);
    const lost=Math.max(0,before-((it.hpCur||0)+(it.hpTemp||0)));
    reopen((v>0&&it.concentration&&lost>0)?concCheckPrompt(it,lost):null);};
  p.querySelector(".hpm-apply").addEventListener("click",applyDmg);
  dmg.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();applyDmg();}else if(e.key==="Escape")closePopover();});
  p.querySelector(".hpm-cur").addEventListener("change",e=>{it.hpCur=clamp(Number(e.target.value||0),0,it.hpMax);applyDownState(it);reopen(null);});
  p.querySelector(".hpm-temp").addEventListener("change",e=>{it.hpTemp=Math.max(0,Number(e.target.value||0));reopen(null);});
  p.querySelectorAll(".hpm-ds-pip").forEach(b=>b.addEventListener("click",()=>{const[kind,n]=b.dataset.ds.split(":");const t=combatItem(itId);if(!t)return;if(!t.deathSaves)t.deathSaves={success:0,fail:0};
    t.deathSaves[kind]=clamp(t.deathSaves[kind]===+n?+n-1:+n,0,3);if((t.deathSaves.fail||0)>=3)t.status="dead";reopen(null);}));
  const cr=p.querySelector(".hpm-conc-roll");if(cr)cr.addEventListener("click",()=>{const b=concPrompt.bonus||0,r=rollFormula("1d20"+(b>=0?"+"+b:String(b))),pass=r.total>=concPrompt.dc;
    toast(`Concentration: rolled ${r.total} vs DC ${concPrompt.dc}, ${pass?"held":"broken"}`);
    if(!pass)it.concentration=false;closePopover();saveAdv();renderCombat();});
}
// Edit a combatant's initiative inline, then re-sort the order (preserving whose turn it is).
function setCombatInit(itId,v){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,it=combatItem(itId);if(!it)return;if(PLAYER_MODE&&!playerCanEdit(it))return;
  if(v===""){it.init=null;it.initRolled=false;} // cleared → blank again
  else{it.init=Number(v)||0;it.initRolled=true;it.initManual=false;} // typing commits it (not a placeholder / blank manual)
  // Re-sort on an init edit only in Initiative mode; in Manual mode the hand-set order is preserved
  // (the edit may change the "out of order" count instead).
  if(combatView(cb).sort==="init"){const cur=cb.order[cb.turnIndex];sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));}
  saveAdv();renderCombat();}
// Reset the encounter to a fresh start: rebuild the order from the encounter combatants + party — full HP,
// fresh initiative, round 1, cleared conditions / death saves / statuses (B128).
function resetCombat(){const ctx=combatOf();if(!ctx)return;const a=ctx.a,e=ctx.e;
  confirmModal("Reset the encounter? HP, conditions, death saves, initiative and the round all reset to the start.",()=>{
    clearCombatSel();startCombat(a,e);
    if(autoRollOn()){combatRolling=true;renderCombat();setTimeout(()=>{combatRolling=false;renderCombat();},1200);}else renderCombat();
    toast("Encounter reset.");});}
// Compact HP tracker (CT7b): a ratio-coloured bar (current + temp segment), an add-dmg field
// (Enter applies; negative heals; temp absorbs first), an editable current, and the max.
// Compact HP control (B124): a bold current/max number with a thin health-coloured underbar (the "H6"
// design). The whole thing is a button that opens the HP-management popover (damage/heal, temp, current).
function hpCellHTML(it){
  // Player mode: enemies show a coarse health band instead of HP numbers (B204).
  if(PLAYER_MODE&&it._enemy){if(!it.band)return `<span class="ci-noh"></span>`;
    const B={healthy:["var(--ok)","Healthy"],hurt:["var(--warn)","Hurt"],bloodied:["var(--bad)","Bloodied"],critical:["var(--bad)","Critical"],down:["var(--dim)","Down"]};
    const b=B[it.band]||B.hurt;return `<span class="ci-band"><span class="ci-band-pip" style="background:${b[0]}"></span>${b[1]}</span>`;}
  if(!hpTracked(it))return `<span class="ci-noh"></span>`;
  const max=it.hpMax,cur=it.hpCur,tmp=it.hpTemp||0,ratio=max?cur/max:0;
  const col=ratio>.5?"var(--ok)":ratio>.25?"var(--warn)":"var(--bad)";
  const pct=clamp(max?cur/max*100:0,0,100);
  return `<button class="ci-hpbtn" data-hpmanage="${it.id}">
    <span class="ci-hpnum">${cur}<span class="ci-hpmax">/${max}</span>${tmp?`<span class="ci-hptmp">+${tmp}</span>`:""}</span>
    <span class="ci-hpbar"><i style="width:${pct}%;background:${col}"></i></span>
  </button>`;
}
// ── CT8: combat view (group / sort / filter) + manual drag-sort ──────────────────────────────────
// cb.order stays the canonical TURN order (advance/turnIndex always follow it). The toolbar's group/
// sort/filter are DISPLAY-only scanning aids — turns never change because of them. The ONE thing that
// reorders the actual turn order is a manual drag (→ sort:"manual"); if that pulls a card out of its
// initiative slot, a soft "out of order" warning offers a one-click restore.
const CV_SORTS=[["init","Initiative"],["manual","Manual"],["name","Name"],["status","Status"],["hp","HP remaining"]];
const CV_GROUPS=[["","None"],["status","Status"],["faction","Faction"],["statblock","Statblock"]];
const CI_STATUS_ORDER={active:0,waiting:1,dead:2};
const CI_STATUS_GLABEL={active:"Active",waiting:"Waiting",dead:"Dead"};
function combatView(cb){if(!cb.view)cb.view={group:"status",sort:"init",filter:{}};if(!cb.view.filter)cb.view.filter={};return cb.view;}
// "Down" is no longer a group of its own (B126) — a dying combatant stays under Active; only explicit dead splits out.
function ciStatusKey(it){return it.status==="dead"?"dead":(it.status||"active");}
function ciFactionLabel(f){return f==="PC"?"Party":f;}
function hpRemainPct(it){return it.hpMax?it.hpCur/it.hpMax:1;}
function combatSortFn(sort){
  if(sort==="name")return (a,b)=>a.it.name.localeCompare(b.it.name);
  if(sort==="status")return (a,b)=>(CI_STATUS_ORDER[ciStatusKey(a.it)]-CI_STATUS_ORDER[ciStatusKey(b.it)])||(b.it.init-a.it.init);
  if(sort==="hp")return (a,b)=>hpRemainPct(a.it)-hpRemainPct(b.it)||(b.it.init-a.it.init);
  return null; // init / manual keep the cb.order sequence
}
// Display rows: {it, idx} where idx is the position in cb.order (for the active highlight + drag).
function combatRows(cb){
  const v=combatView(cb);let rows=cb.order.map((it,idx)=>({it,idx}));
  const fS=v.filter.status||[],fF=v.filter.faction||[];
  if(fS.length)rows=rows.filter(r=>fS.includes(ciStatusKey(r.it)));
  if(fF.length)rows=rows.filter(r=>fF.includes(r.it.faction));
  const fn=combatSortFn(v.sort);if(fn)rows.sort(fn);
  return rows;
}
// Drag (reorder the real turn order) is only allowed when the displayed order maps 1:1 to cb.order:
// init/manual sort, no grouping, no active filter.
function combatDragOK(cb){const v=combatView(cb);return (v.sort==="init"||v.sort==="manual")&&!v.group&&!((v.filter.status||[]).length)&&!((v.filter.faction||[]).length);}
// Drag mode (B128): "reorder" = ungrouped init/manual → drag reorders the turn order; "regroup" = grouped by
// status/faction (no filter) → drag a card onto another group to change its status/faction. Else no drag.
function combatDragMode(cb){if(combatDragOK(cb))return "reorder";const v=combatView(cb);
  if((v.group==="status"||v.group==="faction")&&!((v.filter.status||[]).length)&&!((v.filter.faction||[]).length))return "regroup";return null;}
function setCombatFaction(itId,fac){const it=combatItem(itId);if(!it)return;it.faction=fac;saveAdv();renderCombat();}
function combatGroupKey(it,g){
  if(g==="status")return ciStatusKey(it);
  if(g==="faction")return it.faction||"Neutral";
  if(g==="statblock"){if(it.kind==="monster"){const m=monById(it.srcId);return m?m.name:it.name.replace(/\s+\d+$/,"");}return it.kind==="pc"?"Party":it.kind==="event"?"Events":(it.name||"Other");}
  return "";
}
function combatGroupLabel(g,key){if(g==="status")return CI_STATUS_GLABEL[key]||key;if(g==="faction")return ciFactionLabel(key);return key;}
// How many cards would have to move to restore initiative order = n − (longest run already in
// non-increasing-init order). Ties (equal init) count as in-place, so re-ordering tied cards isn't
// flagged. This reads as "1 out of place" for a single misplaced card, not "everything shifted".
function initOutOfPlace(cb){const a=cb.order,n=a.length;if(n<2)return 0;
  const v=a.map(x=>x.init==null?Infinity:x.init); // blank (manual) inits belong at the top, not "out of order"
  const dp=new Array(n).fill(1);let best=1;
  for(let i=0;i<n;i++){for(let j=0;j<i;j++)if(v[j]>=v[i]&&dp[j]+1>dp[i])dp[i]=dp[j]+1;if(dp[i]>best)best=dp[i];}
  return n-best;}
function combatOrderBodyHTML(cb){
  const v=combatView(cb),rows=combatRows(cb),ti=cb.turnIndex,drag=!!combatDragMode(cb);
  const rowH=r=>combatRowHTML(r.it,r.idx===ti,drag);
  if(!rows.length)return `<div class="hint" style="padding:6px 2px">No combatants match the filter.</div>`;
  if(!v.group)return rows.map(rowH).join("");
  const groups=new Map();rows.forEach(r=>{const k=combatGroupKey(r.it,v.group);(groups.get(k)||groups.set(k,[]).get(k)).push(r);});
  let keys=[...groups.keys()];
  if(v.group==="status")keys.sort((a,b)=>(CI_STATUS_ORDER[a]??9)-(CI_STATUS_ORDER[b]??9));
  else keys.sort((a,b)=>a.localeCompare(b));
  const regroup=combatDragMode(cb)==="regroup";
  return keys.map(k=>{const gico=(v.group==="status"&&CI_STATUS_ICON[k])?`<span class="cbt-grp-ico st-${k}">${CI_STATUS_ICON[k]}</span>`:"";
    return `<div class="cbt-group"${regroup?` data-grpkey="${esc(k)}"`:""}><div class="cbt-group-h">${gico}${esc(combatGroupLabel(v.group,k))} <span class="cbt-group-n">${groups.get(k).length}</span></div>${groups.get(k).map(rowH).join("")}</div>`;}).join("");
}
function openCombatViewMenu(tool,anchor){
  const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,v=combatView(cb);
  if(tool==="group"){
    const p=showPopover(anchor,CV_GROUPS.map(([k,l])=>`<button class="popitem popcheck${(v.group||"")===k?" on":""}" data-g="${k}"><span class="ck">${(v.group||"")===k?"●":""}</span>${l}</button>`).join(""));
    p.querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();v.group=b.dataset.g||null;saveAdv();closePopover();renderCombat();}));
    return;}
  if(tool==="sort"){
    const p=showPopover(anchor,CV_SORTS.map(([k,l])=>`<button class="popitem popcheck${v.sort===k?" on":""}" data-s="${k}"><span class="ck">${v.sort===k?"●":""}</span>${l}</button>`).join(""));
    p.querySelectorAll("[data-s]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();closePopover();setCombatSort(b.dataset.s);}));
    return;}
  // filter: status + faction value toggles; re-render then reopen so several can be toggled in a row.
  const stOpts=[["active","Active"],["waiting","Waiting"],["dead","Dead"]];
  const present=new Set(cb.order.map(it=>it.faction));
  const facOpts=["PC","Enemy","Ally","Neutral"].filter(f=>present.has(f)).map(f=>[f,ciFactionLabel(f)]);
  const fs=v.filter.status||[],ff=v.filter.faction||[];
  const sec=(label,opts,sel,attr)=>`<div class="popgrp-h">${label}</div>`+opts.map(([k,l])=>`<button class="popitem popcheck${sel.includes(k)?" on":""}" data-${attr}="${k}"><span class="ck">${sel.includes(k)?"✓":""}</span>${l}</button>`).join("");
  const clr=(fs.length||ff.length)?`<div class="popsep"></div><button class="popitem" data-fclear>Clear filters</button>`:"";
  const p=showPopover(anchor,sec("Status",stOpts,fs,"fst")+`<div class="popsep"></div>`+sec("Faction",facOpts,ff,"ffac")+clr);
  const reopen=()=>{const a2=document.querySelector('#combatTools');if(a2)openCombatViewMenu("filter",a2);};
  p.querySelectorAll("[data-fst]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();toggleCombatFilter("status",b.dataset.fst);reopen();}));
  p.querySelectorAll("[data-ffac]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();toggleCombatFilter("faction",b.dataset.ffac);reopen();}));
  const c=p.querySelector("[data-fclear]");if(c)c.addEventListener("click",e=>{e.stopPropagation();v.filter={};saveAdv();closePopover();renderCombat();});
}
function setCombatSort(s){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,v=combatView(cb);v.sort=s;
  if(s==="init"){const cur=cb.order[cb.turnIndex];sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));}
  saveAdv();renderCombat();}
function toggleCombatFilter(kind,val){const ctx=combatOf();if(!ctx)return;const v=combatView(ctx.e.combat);const cur=v.filter[kind]||(v.filter[kind]=[]);const i=cur.indexOf(val);if(i>=0)cur.splice(i,1);else cur.push(val);if(!cur.length)delete v.filter[kind];saveAdv();renderCombat();}
function restoreInitOrder(){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,cur=cb.order[cb.turnIndex];sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));combatView(cb).sort="init";saveAdv();renderCombat();toast("Initiative order restored.");}
// Re-roll initiative for every combatant (identical-monster groups share one roll), then re-sort. With
// "Roll party initiative" off, the party is left alone (their manual inits are preserved) (B126).
function rollAllInit(){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,cur=cb.order[cb.turnIndex],byGroup=new Map(),skipParty=!rollPartyOn();
  cb.order.forEach(it=>{if(skipParty&&it.kind==="pc")return;const g=it.groupId||it.id;if(!byGroup.has(g))byGroup.set(g,rollOrAvgInit(it.initMod||0));it.init=byGroup.get(g);});
  sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));combatView(cb).sort="init";saveAdv();renderCombat();toast("Initiative re-rolled.");}
// Clear initiative back to the default pre-roll state for EVERYONE (party included): party → blank manual
// (when party-roll is off) else unrolled average; others → unrolled average placeholder (B126).
function clearInitiative(){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,cur=cb.order[cb.turnIndex];
  cb.order.forEach(it=>{if(it.kind==="event")return;const man=(it.kind==="pc"&&!rollPartyOn());
    it.init=man?null:(10+(it.initMod||0));it.initRolled=false;it.initManual=man;});
  sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));combatView(cb).sort="init";saveAdv();renderCombat();toast("Initiative cleared.");}
// The round-bar d20 (auto-roll-off mode): roll ACTUAL dice for the still-unrolled combatants, animate the
// init cells number-flow style (vertical digit scroll), then commit the values + re-sort.
function rollInitNow(){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,cur=cb.order[cb.turnIndex],byGroup=new Map();
  // Roll (or re-roll) every group — works whether combatants are still unrolled averages or already rolled.
  const skipParty=!rollPartyOn();
  cb.order.forEach(it=>{if(skipParty&&it.kind==="pc")return;if(it.initManual&&it.init==null)return;const g=it.groupId||it.id;if(!byGroup.has(g))byGroup.set(g,rollInit(it.initMod||0));});
  if(!byGroup.size)return;
  animateInitRoll(byGroup,()=>{
    cb.order.forEach(it=>{const g=it.groupId||it.id;if(byGroup.has(g)){it.init=byGroup.get(g);it.initRolled=true;}});
    sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));combatView(cb).sort="init";saveAdv();renderCombat();
  });
}
function animateInitRoll(byGroup,done){
  const d20=document.getElementById("combatRollInit");if(d20)d20.classList.add("rolling");
  const pane=document.querySelector(".combat-order");if(!pane){done();return;}
  const pr=pane.getBoundingClientRect(),overlays=[];
  pane.querySelectorAll(".ci-init-in").forEach(inp=>{
    const it=combatItem(inp.dataset.initset);if(!it)return;const target=byGroup.get(it.groupId||it.id);if(target==null)return;
    const r=inp.getBoundingClientRect();
    const ov=document.createElement("div");ov.className="nf-roll";
    // Positioned inside the scrollable pane (in scroll coords) so the reel scrolls WITH the rows and the
    // pane's own overflow clips any cell that's half-hidden under the statblock panel. The reel inherits the
    // cell's own font-size so it matches whether the init is full-size (wide) or the small narrow-card number.
    ov.style.cssText=`left:${r.left-pr.left+pane.scrollLeft}px;top:${r.top-pr.top+pane.scrollTop}px;width:${r.width}px;height:${r.height}px;font-size:${getComputedStyle(inp).fontSize}`;
    // Clip the reel to a single 1em-tall window centred in the cell (.nf-digit) — without it the tall
    // column was vertically centred in the full cell box, so adjacent numbers showed through / vanished mid-spin.
    ov.innerHTML=`<span class="nf-digit">${rollReelHTML(target,1+(it.initMod||0),20+(it.initMod||0))}</span>`;pane.appendChild(ov);overlays.push(ov);
    inp.classList.add("nf-hide"); // hide the old number behind the (transparent) reel while it scrolls (B128)
    requestAnimationFrame(()=>ov.querySelectorAll(".nf-col").forEach(col=>{col.style.transform=`translateY(-${(Number(col.style.getPropertyValue("--nf-len"))||1)-1}em)`;}));
  });
  setTimeout(()=>{overlays.forEach(o=>o.remove());if(d20)d20.classList.remove("rolling");done();},1450);
}
// Drag a card's grip to reorder the real turn order (→ manual sort); keeps whose turn it is.
function reorderCombat(dragId,targetId,after){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat;
  if(dragId===targetId)return;const cur=cb.order[cb.turnIndex];
  const from=cb.order.findIndex(x=>x.id===dragId);if(from<0)return;const moved=cb.order.splice(from,1)[0];
  let to=cb.order.findIndex(x=>x.id===targetId);if(to<0)cb.order.push(moved);else{if(after)to++;cb.order.splice(to,0,moved);}
  combatView(cb).sort="manual";cb.turnIndex=Math.max(0,cb.order.indexOf(cur));saveAdv();renderCombat();}
function moveCombatant(itId,dir){if(PLAYER_MODE)return;const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,i=cb.order.findIndex(x=>x.id===itId),j=i+dir;
  if(i<0||j<0||j>=cb.order.length)return;const cur=cb.order[cb.turnIndex];
  const[m]=cb.order.splice(i,1);cb.order.splice(j,0,m);combatView(cb).sort="manual";cb.turnIndex=Math.max(0,cb.order.indexOf(cur));saveAdv();renderCombat();}
// Move all `ids` (a multi-selection) as a block to just before/after targetId.
function reorderCombatMulti(ids,targetId,after){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,cur=cb.order[cb.turnIndex];
  if(ids.includes(targetId))return;const moved=cb.order.filter(x=>ids.includes(x.id)),rest=cb.order.filter(x=>!ids.includes(x.id));
  let to=rest.findIndex(x=>x.id===targetId);if(to<0)to=rest.length;else if(after)to++;
  rest.splice(to,0,...moved);cb.order=rest;combatView(cb).sort="manual";cb.turnIndex=Math.max(0,cb.order.indexOf(cur));saveAdv();renderCombat();}
function reorderCombatSel(dragId,targetId,after){
  if(combatSel.has(dragId)&&combatSel.size>1)reorderCombatMulti([...combatSel],targetId,after);
  else reorderCombat(dragId,targetId,after);}
// Click selects (shift/cmd toggles into a multi-selection); editable/interactive areas are excluded. When
// drag is allowed, the whole row drags to reorder (a multi-selection drags together).
const CI_NOSELECT="input,select,textarea,button,a,.ci-status,.cc-chip,.reflink,[data-addcond]";
function bindCombatRows(host,mode,cb){
  if(!host)return;
  host.querySelectorAll(".cbt-row").forEach(row=>{
    // Suppress the text selection a modifier-click would otherwise drag across rows (B122).
    row.addEventListener("mousedown",e=>{if((e.shiftKey||e.metaKey||e.ctrlKey)&&!e.target.closest(CI_NOSELECT))e.preventDefault();});
    row.addEventListener("click",e=>{if(e.target.closest(CI_NOSELECT))return;const id=row.dataset.ci;
      if(e.shiftKey||e.metaKey||e.ctrlKey)toggleCombatSel(id);else selectOnlyCombat(id);});
    // Double-click a row → make it the current turn (B122).
    row.addEventListener("dblclick",e=>{if(e.target.closest(CI_NOSELECT))return;clearCombatSel();setCurrentTurn(row.dataset.ci);});
  });
  if(!mode)return;
  let dragId=null;const clearMarks=()=>{host.querySelectorAll(".cbt-row").forEach(r=>r.classList.remove("dragging","drop-before","drop-after"));host.querySelectorAll(".cbt-group").forEach(g=>g.classList.remove("drop-into"));};
  host.querySelectorAll('.cbt-row[draggable="true"]').forEach(row=>{
    row.addEventListener("dragstart",e=>{if(e.target.closest(CI_NOSELECT)){e.preventDefault();return;}dragId=row.dataset.ci;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",dragId);}catch(_){}row.classList.add("dragging");});
    row.addEventListener("dragend",()=>{dragId=null;clearMarks();});
    // Row-to-row drop reorders the turn order in BOTH modes — dropping on a row inside its group breaks the
    // initiative order (→ manual sort, flagged "out of order"). stopPropagation keeps the group drop (regroup
    // mode, below) from also firing while the pointer is over a row (B128b).
    row.addEventListener("dragover",e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();const r=row.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;row.classList.toggle("drop-after",after);row.classList.toggle("drop-before",!after);});
    row.addEventListener("dragleave",e=>{e.stopPropagation();row.classList.remove("drop-before","drop-after");});
    row.addEventListener("drop",e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();const r=row.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;reorderCombatSel(dragId,row.dataset.ci,after);});
  });
  if(mode==="regroup"){ // also: drop a card onto a group's open space to change its status / faction (B128)
    const grp=combatView(cb).group;
    host.querySelectorAll(".cbt-group[data-grpkey]").forEach(g=>{
      g.addEventListener("dragover",e=>{if(!dragId)return;e.preventDefault();g.classList.add("drop-into");});
      g.addEventListener("dragleave",e=>{if(!g.contains(e.relatedTarget))g.classList.remove("drop-into");});
      g.addEventListener("drop",e=>{if(!dragId)return;e.preventDefault();g.classList.remove("drop-into");
        const key=g.dataset.grpkey,ids=(combatSel.has(dragId)&&combatSel.size>1)?[...combatSel]:[dragId];
        ids.forEach(id=>{const it=combatItem(id);if(!it)return;if(grp==="status")it.status=key;else it.faction=key;});
        if(combatSel.size>1)clearCombatSel();saveAdv();renderCombat();});
    });
  }
}
// Selection action bar — appears above the order when ≥1 card is selected: set status / add an effect /
// apply damage to all selected at once, plus a clear.
// Selection action bar — a floating bar pinned to the centre-bottom of the page (the same .batch-bar
// style as the bestiary/preset multi-select), so it doesn't displace the initiative entries (B122).
// Selection action strip — pinned inside the active panel (B164), below the faction bar. Acts on every
// selected combatant. Hierarchy (B166): a dim count leads, the actions are compact secondary buttons,
// and Clear is a subtle ✕ pushed to the trailing edge. Never wraps (scrolls if cramped); slides in only
// when the selection first opens (`_selPrevN`).
let _selPrevN=0;
function combatSelBarHTML(){const n=combatSelInOrder().length;if(!n){_selPrevN=0;return "";}
  const opening=_selPrevN===0;_selPrevN=n;
  return `<div class="ca-selbar${opening?" caSel-in":""}" id="combatSelBar">
    <span class="csb-count"><b>${n}</b> selected</span>
    <div class="csb-actions">
      <button class="csb-act" id="csbStatus" title="Set status for all selected">Status ▾</button>
      <button class="csb-act" id="csbEffect" title="Add an effect to all selected">＋ Effect</button>
      <button class="csb-act" id="csbDmg" title="Damage or heal all selected">Damage</button>
    </div>
    <button class="csb-x" id="csbClear" title="Clear selection" aria-label="Clear selection">✕</button>
  </div>`;}
// Jump the current turn to a combatant (selection-bar "Set current turn" + double-click a row) (B122).
function setCurrentTurn(itId){if(PLAYER_MODE)return;const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,i=cb.order.findIndex(x=>x.id===itId);if(i<0)return;cb.turnIndex=i;saveAdv();renderCombat();}
function setCombatStatusSel(status){if(PLAYER_MODE)return;combatSelInOrder().forEach(it=>{it.status=status;});saveAdv();renderCombat();}
// Positive = damage (temp absorbs first), negative = heal — applied to every selected HP-tracked combatant.
function applyDmgSel(amt){amt=Number(amt)||0;if(!amt)return;combatSelInOrder().forEach(it=>{if(hpTracked(it)){changeHP(it,amt);applyDownState(it);}});saveAdv();renderCombat();}
function openSelStatusMenu(anchor){const p=showPopover(anchor,CI_STATUSES.map(s=>`<button class="popitem has-ico" data-selst="${s}"><span class="csb-ico">${CI_STATUS_ICON[s]}</span>${CI_STATUS_LABEL[s]}</button>`).join(""));
  p.querySelectorAll("[data-selst]").forEach(b=>b.addEventListener("click",()=>{closePopover();setCombatStatusSel(b.dataset.selst);}));}
function openSelDmg(anchor){const p=showPopover(anchor,`<div class="seldmg"><input type="number" class="seldmg-in" placeholder="dmg / heal" title="Positive damages; negative heals" autocomplete="off"><button class="btn primary sm seldmg-go" style="width:auto">Apply</button></div>`);
  const inp=p.querySelector(".seldmg-in");inp.focus();const go=()=>{const v=inp.value;closePopover();applyDmgSel(v);};
  p.querySelector(".seldmg-go").addEventListener("click",go);inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go();}else if(e.key==="Escape")closePopover();});}
// Death-save tracker rendered inside the HP popover (B127): three success + three failure circles. Empty
// circles fill green (circle-check) / red (circle-xmark) on click.
function deathSavesRowHTML(it){
  const d=dsOf(it);
  const grp=(kind,n,ico)=>[0,1,2].map(i=>`<button class="hpm-ds-pip ds-${kind}${i<n?" on":""}" data-ds="${kind}:${i+1}" aria-label="${kind==="success"?"Success":"Failure"} ${i+1}">${i<n?ico:""}</button>`).join("");
  return `<div class="hpm-ds"><span class="hpm-ds-grp succ">${grp("success",d.success,CIRCLE_CHECK_ICON)}</span><span class="hpm-ds-lbl">Death saves</span><span class="hpm-ds-grp fail">${grp("fail",d.fail,CIRCLE_XMARK_ICON)}</span></div>`;
}
function combatRowHTML(it,active,drag){
  const status=it.status||"active",isDead=status==="dead",dying=isDying(it),stable=isStable(it);
  const manual=it.initManual&&it.init==null,unrolled=!manual&&it.initRolled===false;
  const initEl=it.kind==="event"?`<div class="ci-init" title="Initiative count">${it.init}</div>`
    :`<input class="ci-init-in${manual?" manual":unrolled?" unrolled":""}" type="number" data-initset="${it.id}" ${manual?`value="" placeholder="—"`:unrolled?`value="" placeholder="${it.init}"`:`value="${it.init}"`}>`;
  // Status reads from the row variant (B122): .dead = strikethrough/dim, .waiting = muted + italic, .dying =
  // down. The death-save tracker now lives in the HP popover (B127); the row just flags down/stable.
  const badge=dying?'<span class="ci-down" title="Down: rolling death saves">down</span>':stable?'<span class="ci-stable" title="Stabilised at 0 HP">stable</span>':"";
  // Player mode: mark the player's OWN claimed character with a "You" badge after the name (B234).
  const youBadge=(PLAYER_MODE&&typeof playerClaimId==="function"&&it.id===playerClaimId())?'<span class="ci-you">You</span>':"";
  // Fixed-chip cluster (B124): AC · reaction toggle · effect chips · add-effect. It sits inline when the
  // pane is wide and wraps to its own line below the name when narrow (container query). Events have none.
  // DOM order is the narrow two-row order (AC · reaction · concentration · effect chips · +add). The wide
  // single-row layout flips it via flex `order` so +add leads and AC/reaction/conc sit fixed next to HP (B125).
  const acChip=it.ac!=null?`<span class="ci-ac-chip">${SHIELD_ICON}${it.ac}</span>`:"";
  // In player mode, reaction & concentration on rows the player doesn't control (enemies, other PCs) are
  // VISIBLE but not editable: a plain coloured icon (no button bg/border) with a state popover on hover/click.
  const roCtrl=PLAYER_MODE&&typeof playerCanEdit==="function"&&!playerCanEdit(it);
  const reactChip=it.kind==="event"?"":roCtrl
    ?`<span class="ci-react-ind${it.reaction===false?" used":""}" data-roreact="${it.id}" tabindex="0" aria-label="Reaction ${it.reaction===false?"used":"available"}">${REACT_ICON}</span>`
    :`<button class="ci-react-chip${it.reaction===false?" used":""}" data-cireact="${it.id}" aria-label="Toggle reaction">${REACT_ICON}</button>`;
  const concChip=it.kind==="event"?"":roCtrl
    ?`<span class="ci-conc-ind${it.concentration?" on":""}" data-roconc="${it.id}" tabindex="0" aria-label="Concentration ${it.concentration?"on":"off"}">${CONC_ICON}</span>`
    :`<button class="ci-conc-chip${it.concentration?" on":""}" data-ciconc="${it.id}" aria-label="Toggle concentration">${CONC_ICON}</button>`;
  const effChips=(it.conditions||[]).map((c,i)=>condChipHTML(it.id,c,i)).join("");
  const meta=it.kind==="event"?"":`<div class="ci-meta">${acChip}${reactChip}${concChip}${effChips}<button class="ci-addcond" data-addcond="${it.id}" aria-label="Add effect">＋</button></div>`;
  return `<div class="cbt-row ${cFac(it.faction)}${active?" active":""}${isDead?" dead":""}${(dying||stable)?" dying":""}${status==="waiting"?" waiting":""}${combatSel.has(it.id)?" selected":""}${PLAYER_MODE&&playerCanEdit(it)?" pm-edit":""}${PLAYER_MODE&&playerEnemyCondsEditable(it)?" pm-edit-conds":""}" data-ci="${it.id}"${drag?' draggable="true"':''}>
    ${initEl}
    <div class="ci-id"><div class="ci-name"><span class="ci-nm">${esc(it.name)}</span>${youBadge}${badge}</div>${it.comment?`<div class="ci-note">${esc(it.comment)}</div>`:""}</div>
    ${meta}
    <div class="ci-hp${active&&dying?" ds-turn":""}"${active&&dying?' title="It\'s their turn: click to roll a death save"':""}>${hpCellHTML(it)}</div>
    <button class="ci-menu" data-cimenu="${it.id}" title="More" aria-label="More">⋯</button>
  </div>`;
}
// Best attack-roll bonus for the quick-ref chip: use explicit attack-mode entries when present, else
// fall back to PB + the better physical mod (the typical weapon attack). Approximate for spellcasters.
function combatAtkBonus(m){const pb=pbForCR(m.cr);let best=null;
  [].concat(m.actions||[],m.bonus||[],(m.legend&&m.legend.items)||[]).forEach(en=>{if(en&&en.mode==="attack"){const b=(en.atk!==""&&en.atk!=null)?Number(en.atk):pb+mod(m[en.ability||"str"]);if(best==null||b>best)best=b;}});
  return best!=null?best:pb+Math.max(mod(m.str),mod(m.dex));}
// Highest save DC the creature imposes (spellcasting etc.) — explicit when present, else 8+PB+ability.
function combatMainDC(m){let best=null;
  [].concat(m.actions||[],m.bonus||[],m.traits||[],(m.legend&&m.legend.items)||[]).forEach(en=>{if(en&&en.mode==="spell"){const pb=pbForCR(m.cr);const dc=(en.dc!==""&&en.dc!=null)?Number(en.dc):8+pb+mod(m[en.ability||"int"]);if(best==null||dc>best)best=dc;}});
  return best;}
// The inner content of the active panel for one combatant: head (name/faction, conditions, quick-ref stat
// chips, resources) + statblock + note. Reused for the active combatant and the selection "peek" preview.
// Display-only character sheet for a PC in the combat panel — the PC counterpart to the monster
// statblock embed. Surfaces the full roster character (abilities/saves, skills, passives,
// spellcasting, defenses, senses, speed + any custom fields) as statblock-style labelled lines,
// showing ONLY fields that carry data. Read-only here (no click-to-roll); the pencil opens the
// character detail. Reads live from the roster so edits reflect on the next render.
function pcSheetHTML(it){
  const c=rosterById(it.srcId);
  if(!c)return `<div class="ca-soon">Player character: linked record not found.</div>`;
  const lines=[];
  const R=clickRollOn(); // rollable when dice rolling is enabled; otherwise plain display chips
  const line=(lbl,inner,txt)=>`<div class="pcs-line${txt?" txt":""}"><span class="pcs-lbl">${lbl}</span><span class="pcs-${txt?"txt":"chips"}">${inner}</span></div>`;
  // A coloured chip; rollable (button + data-roll) when dice rolling is on, else a static span.
  const rchip=(ab,inner,roll,type,label,extra)=>R
    ?`<button class="pchip skchip cc-ab-${ab}${extra||""} pcs-roll" data-roll="${roll}" data-rolltype="${type}" data-rolllabel="${esc(label)}" data-abil="${ab}" title="Roll ${esc(label)}">${inner}</button>`
    :`<span class="pchip skchip cc-ab-${ab}${extra||""}">${inner}</span>`;
  // Abilities the character has actually filled (a value, not the placeholder default).
  const ab=ABILS.map(k=>{const f=abilFieldOf(c,k);return (!f||f.v===""||f.v==null)?null:{k,f};}).filter(Boolean);
  // Skip the Abilities/Saves rows when the ONLY entered scores are spellcasting "main" abilities — those are
  // already surfaced as the ATK/DC chips, so a lone "Abilities: INT" reads as accidental clutter.
  if(ab.length&&!ab.every(a=>a.f.main)){
    lines.push(line("Abilities",ab.map(a=>{const mod=abilMod(abilScore(a.f));return rchip(a.k,`<span class="pchip-n">${abilScore(a.f)}</span> ${a.k.toUpperCase()} ${sgn(mod)}`,`1d20${sgn(mod)}`,"check",ABIL_NAME[a.k]||a.k.toUpperCase());}).join("")));
    lines.push(line("Saves",ab.map(a=>{const sv=abilSave(c,a.f);return rchip(a.k,`<span class="pchip-n">${sgn(sv)}</span> ${a.k.toUpperCase()}`,`1d20${sgn(sv)}`,"save",ABIL_NAME[a.k]||a.k.toUpperCase(),a.f.prof?" exp":"");}).join("")));
  }
  const sf=(c.fields||[]).find(f=>f.k==="skills");
  if(sf&&Array.isArray(sf.v)&&sf.v.length)
    lines.push(line("Skills",sf.v.map(e=>{const a=SKILLS[e.s]||"int",exp=(Number(e.e)||1)>=2,b=skillBonus(c,e),nm=e.s.replace(/_/g," ");return rchip(a,`<span class="pchip-n">${sgn(b)}</span> ${esc(nm)}`,`1d20${sgn(b)}`,"check",nm,exp?" exp":"");}).join("")));
  const pf=(c.fields||[]).find(f=>f.k==="passives");
  if(pf&&Array.isArray(pf.v)&&pf.v.length)
    lines.push(line("Passives",pf.v.map(name=>{const a=SKILLS[name]||"wis",prof=charSkillProf(c,name)>0;return `<span class="pchip skchip cc-ab-${a}${prof?" exp":""}"><span class="pchip-n">${passiveVal(c,name)}</span> ${esc(name)}</span>`;}).join("")));
  // ATK / DC now render as stat boxes in the panel header (combatPanelInnerHTML), like monsters.
  const df=(c.fields||[]).find(f=>f.k==="dmgmod");
  if(df&&Array.isArray(df.v)&&df.v.length)
    lines.push(line("Defenses",df.v.map(e=>{const m=e.m||"res";return `<span class="pchip dchip-${m}"><span class="pchip-n">${DMG_MULT[m]}</span> ${esc(e.t)}</span>`;}).join("")));
  const spd=charFieldVal(c,"speed");if(spd!==""&&spd!=null)lines.push(line("Speed",esc(String(spd)),true));
  const sen=charFieldVal(c,"senses");if(sen!==""&&sen!=null)lines.push(line("Senses",esc(String(sen)),true));
  // Remaining custom / standard scalar fields with a value (Player, PP, custom notes…).
  const SKIP=new Set(["ac","hp","init","level","class","speed","senses","prof","skills","passives","dmgmod",...ABILS]);
  (c.fields||[]).forEach(f=>{
    if(SKIP.has(f.k)||isPreset(f)||Array.isArray(f.v)||f.v===""||f.v==null)return;
    if(!f.k&&/^(class|level)$/i.test((f.label||"").trim()))return; // legacy class/level live in the subtitle
    lines.push(line(esc(fieldLabel(f)),esc(String(f.v)),true));
  });
  // Class(es) live in the identity line; the Edit button moved up to the name (B170). A slim level line
  // only shows when a level is set — the old "Character details" placeholder title is gone.
  const lv=charFieldVal(c,"level");
  const head=(lv!==""&&lv!=null)?`<div class="pcs-head"><span class="pcs-sub dim">Level ${esc(String(lv))}</span></div>`:"";
  if(!lines.length)return `<div class="ca-pcsheet">${head}<div class="ca-soon">No character details yet. Add abilities, skills or passives to ${esc(c.name||"this PC")}.</div></div>`;
  return `<div class="ca-pcsheet">${head}${lines.join("")}</div>`;
}
function combatPanelInnerHTML(it,isTurn){
  const pc=it.kind==="pc"?rosterById(it.srcId):null;
  let who=it.faction==="PC"?"Player character":(it.kind==="event"?"Event":it.faction);
  if(pc){const cs=charClasses(pc);if(cs.length)who+=" · "+cs.join(" / ");} // multiclass: slash-joined (B163)
  const m=it.kind==="monster"?monById(it.srcId):null;
  const conds=it.kind==="event"?"":`<div class="ca-conds">${(it.conditions||[]).map((c,i)=>condChipHTML(it.id,c,i)).join("")}<button class="ci-addcond" data-addcond="${it.id}" aria-label="Add effect">＋ effect</button></div>`;
  // Quick-ref stat chips — the numbers a DM glances at, all on one compact line.
  // Optional `ab` (ability key) tints the box with that ability's colour (B168).
  const chip=(k,v,t,ab)=>`<span class="ca-stat${ab?` cc-ab-${ab}`:""}"${t?` title="${t}"`:""}><span class="cas-k">${k}</span><span class="cas-v">${v}</span></span>`;
  // A rollable chip (ATK / save): click rolls 1d20+bonus tagged to this combatant; Alt-click opens options.
  const rollChip=(k,bonus,type,label,t,ab)=>`<button class="ca-stat ca-stat-btn ca-stat-roll${ab?` cc-ab-${ab}`:""}" data-roll="1d20${sgn(bonus)}" data-rolltype="${type}" data-rolllabel="${esc(label)}"${t?` title="${t}"`:""}><span class="cas-k">${k}</span><span class="cas-v">${sgn(bonus)}</span></button>`;
  const stats=[];
  if(it.ac!=null)stats.push(chip("AC",it.ac));
  if(m){stats.push(rollChip("ATK",combatAtkBonus(m),"attack","Attack","Best attack-roll bonus, click to roll"));
    const dc=combatMainDC(m);if(dc!=null)stats.push(chip("DC",dc,"Highest save DC imposed"));}
  if(pc){const mains=(pc.fields||[]).filter(f=>{const d=fieldDef(f);return d&&d.abil&&f.main;});
    if(mains.length){const atkF=mains.reduce((b,f)=>(!b||effAtk(pc,f)>effAtk(pc,b))?f:b,null),dcF=mains.reduce((b,f)=>(!b||effDc(pc,f)>effDc(pc,b))?f:b,null);
      stats.push(rollChip("ATK",effAtk(pc,atkF),"attack","Attack","Attack bonus, click to roll",atkF.k));
      stats.push(chip("DC",effDc(pc,dcF),"Save DC",dcF.k));}}
  if(hpTracked(it))stats.push(`<button class="ca-stat ca-stat-btn${isTurn&&isDying(it)?" ds-turn":""}" data-hpmanage="${it.id}" title="Manage HP: damage, heal, temp"><span class="cas-k">HP</span><span class="cas-v">${it.hpCur}/${it.hpMax}${it.hpTemp?` +${it.hpTemp}`:""}</span></button>`);
  const statRow=stats.length?`<div class="ca-stats">${stats.join("")}</div>`:"";
  // The edit affordance sits inline with the name (B170) — "Edit in Forge" for monsters, "Edit" for PCs.
  const editBtn=(m&&monById(it.srcId))
    ?`<button class="pcs-edit ca-name-edit" data-monedit="${esc(it.srcId)}" title="Open this creature in the Forge">${PEN_ICON} Edit in Forge</button>`
    :it.kind==="pc"?`<button class="pcs-edit ca-name-edit" data-pcedit="${esc(it.srcId)}" title="Edit character">${PEN_ICON} Edit</button>`:"";
  const sb=m
    ?`<div class="sb ca-sb" data-sbmon="${it.srcId}"></div>`
    :it.kind==="pc"?pcSheetHTML(it)
    :`<div class="ca-soon">${it.kind==="event"?"":"Quick combatant: no statblock."}</div>`;
  const note=it.comment
    ?`<div class="ca-noteblock"><div class="ca-note-txt">${esc(it.comment)}</div><button class="ca-noteedit" data-cinote="${it.id}" title="Edit note" aria-label="Edit note">${PEN_ICON}</button></div>`
    :`<button class="ca-addnote" data-cinote="${it.id}">${PEN_ICON} Add note</button>`;
  return `<div class="ca-head">
      <div class="ca-name">${esc(it.name)}<span class="ca-faction">${esc(who)}</span>${editBtn}</div>
      ${conds}
      ${statRow}
      ${resourcePipsHTML(it)}
    </div>
    ${sb}
    ${note}`;
}
function combatActiveHTML(it){
  if(!it)return `<div class="empty-state">No active combatant.</div>`;
  const who0=it.faction==="PC"?"Player character":(it.kind==="event"?"Event":it.faction);
  const selList=combatSelInOrder();
  const peek=(selList.length&&selList[0].id!==it.id)?selList[0]:null;
  // CT9-fix2: a full-bleed faction colour bar pinned on top (like the adventure-page bar — outside the
  // scroller so it spans edge-to-edge); the compact meta + statblock + note scroll below it.
  // While a selection points at a NON-active card, the panel keeps the active combatant's identity up top
  // (name + faction, "Active turn" flag pushed right) and previews the selected card's header + statblock
  // below a divider (B122). Selecting the active card itself (or nothing) shows the normal panel.
  // Selection actions live INSIDE this panel now (B164) — a strip pinned below the faction bar — instead of
  // a floating bar that collided with the roll log + FAB. (Called unconditionally so its open-animation
  // state resets when nothing is selected — it returns "" for an empty selection.)
  const selBar=combatSelBarHTML();
  if(peek)return `<div class="ca-topbar ${cFac(it.faction)}"></div>${selBar}
    <div class="ca-scroll"><div class="ca-panel">
      <div class="ca-peekhead">
        <div class="ca-name">${esc(it.name)}<span class="ca-faction">${esc(who0)}</span></div>
        <button class="ca-activeflag" id="caBackToActive" title="Back to the active combatant">Active turn</button>
      </div>
      <div class="ca-divider"></div>
      <div class="ca-peek" data-peek="${esc(peek.id)}">${combatPanelInnerHTML(peek,false)}</div>
    </div></div>`;
  return `<div class="ca-topbar ${cFac(it.faction)}"></div>${selBar}
    <div class="ca-scroll"><div class="ca-panel">${combatPanelInnerHTML(it,true)}</div></div>`;
}
// Auto-detected resource trackers as clickable pips. Click a filled pip to spend, an empty one to restore.
function resourcePipsHTML(it){
  if(!it.resources||!it.resources.length)return "";
  return `<div class="ca-res">${it.resources.map((r,ri)=>{
    const avail=Math.max(0,r.max-r.used);
    const note=r.recharge?`<span class="res-tag" title="Recharge ${r.recharge}">⟳ ${r.recharge}</span>`:r.perRound?`<span class="res-tag" title="Resets each round">↻ rd</span>`:"";
    const pips=Array.from({length:r.max},(_,i)=>`<button class="res-pip${i<avail?" on":""}" data-respip="${it.id}:${ri}:${i}" title="${i<avail?"Spend":"Restore"}" aria-label="${i<avail?"Spend":"Restore"} ${esc(r.label)}"></button>`).join("");
    return `<div class="res-row"><span class="res-lbl">${esc(r.label)} ${note}</span><span class="res-pips">${pips}</span></div>`;
  }).join("")}</div>`;
}
// Compact lifecycle chip used on the encounter card + combat tab.
function encStatusChipHTML(e){const st=encStatus(e);return `<span class="enc-status sm st-${st}">${ENC_STATUS_LABEL[st]}</span>`;}
const CHEV_L='<svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M8 2 L4 6 L8 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV_R='<svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LOAD_ICON='<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.4 1.5H12.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z"/></svg>';
const TUNE_ICON='<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 5h6M11 5h3M2 11h3M8 11h6"/><circle cx="9.5" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="6.5" cy="11" r="1.7" fill="currentColor" stroke="none"/></svg>';
const HOURGLASS_ICON='<svg viewBox="0 0 384 512" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M32 0C14.3 0 0 14.3 0 32S14.3 64 32 64V75c0 42.4 16.9 83.1 46.9 113.1L146.7 256 78.9 323.9C48.9 353.9 32 394.6 32 437v11c-17.7 0-32 14.3-32 32s14.3 32 32 32H64 320h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V437c0-42.4-16.9-83.1-46.9-113.1L237.3 256l67.9-67.9c30-30 46.9-70.7 46.9-113.1V64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320 64 32zM96 75V64H288V75c0 25.5-10.1 49.9-28.1 67.9L192 210.7l-67.9-67.9C106.1 124.9 96 100.4 96 75z"/></svg>';
// FA Free 7 solid "alarm-clock" — toggles the effect-timing row in the add-effect popover.
const ALARM_CLOCK_ICON='<svg viewBox="0 0 512 512" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M504.4 132.5c-4.5 10.5-18.4 9.8-24.9 .4-27.8-40-66.1-72.2-111-92.6-10.4-4.7-13.7-18.3-4.1-24.6 15-9.9 33-15.7 52.3-15.7 52.6 0 95.2 42.6 95.2 95.2 0 13.2-2.7 25.8-7.6 37.3zm-471.9 .4c-6.5 9.4-20.5 10.1-24.9-.4-4.9-11.5-7.6-24.1-7.6-37.3 0-52.6 42.6-95.2 95.2-95.2 19.3 0 37.3 5.8 52.3 15.7 9.6 6.3 6.3 19.9-4.1 24.6-44.8 20.4-83.1 52.6-111 92.6zM390.2 467.4C352.8 495.4 306.3 512 256 512s-96.8-16.6-134.1-44.6L86.6 502.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l35.2-35.2C48.6 384.8 32 338.3 32 288 32 164.3 132.3 64 256 64S480 164.3 480 288c0 50.3-16.6 96.8-44.6 134.2l35.2 35.2c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0l-35.2-35.2zM280 184c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 104c0 6.4 2.5 12.5 7 17l56 56c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-49-49 0-94.1z"/></svg>';
const PEN_ICON='<svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"/></svg>';
// The Adventures sidebar-tab glyph — reused on the narrow-width "open the adventure list as a drawer" button.
const ADV_TAB_SVG='<svg viewBox="0 0 640 640" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M539.3 64.1C549.2 63.3 558.9 67.1 565.9 74.1C572.9 81.1 576.7 90.8 575.9 100.7C571.9 150 558.5 226.9 529.6 300.4C527.8 304.9 524.1 308.3 519.4 309.7L438.5 334C434.6 335.2 432 338.7 432 342.8C432 347.9 436.1 352 441.2 352L479.8 352C491.8 352 499.5 364.8 493.3 375.1C489.3 381.8 485 388.3 480.6 394.7C478.6 397.6 475.6 399.7 472.2 400.8L374.5 430C370.6 431.2 368 434.7 368 438.8C368 443.9 372.1 448 377.2 448L393.2 448C407.8 448 414.2 465.4 402 473.4C334 518.4 264.3 516.7 219.6 504.7C206.9 501.3 195.6 494.8 185.2 486.8L112 560C103.2 568.8 88.8 568.8 80 560C71.2 551.2 71.2 536.8 80 528L160 448L160.5 448.5C161.2 447.2 162.1 446 163.2 444.9L320 288C328.8 279.2 328.8 264.8 320 256C311.2 247.2 296.8 247.2 288 256L153.7 390.2C144.8 399.1 129.7 394.6 128.7 382C124.4 328.8 138 258.9 201.3 195.6C292.4 104.5 455.5 70.9 539.2 64.1z"/></svg>';
// Combat-tab header (CT9, Direction C): one slim context line — adventure-colour accent, the scene ·
// encounter title (click to load another), the difficulty pill, and a non-prominent same-scene ‹n/m›
// nav. The round counter + turn controls live on the initiative list (combatTurnBarHTML), not here.
function combatHeaderHTML(a,e,sc,cb){
  const sibs=sc?sceneEncs(a,e):[];
  const advc=a.color||"var(--accent)";
  const[cls,label]=diffOf(encSpent(e),encBudget(a,e));
  const drop=(sc&&sibs.length>1)?`<button class="ct-encdrop" id="combatEncDrop" title="Switch encounter in this scene" aria-label="Switch encounter">${FS_CHEVRON}</button>`:"";
  const title=`<div class="ct-titleblock">
      ${sc?`<div class="ct-scene-sm">${esc(sceneDName(sc))}</div>`:""}
      <div class="ct-encrow"><span class="ct-enc-lg">${esc(encDName(e))}</span><span class="pill sm ct-diff ${cls}" title="Difficulty: ${esc(label)}">${label}</span>${drop}</div>
    </div>`;
  const notes=(e.notesOn&&e.notes)?`<div class="ct-notes-wrap"><div class="ct-notes clamped">${esc(e.notes)}</div><button class="ct-notes-more" hidden>more</button></div>`:"";
  // Player mode (editing on) puts the "Playing as" control in the Load-encounter slot instead (B237).
  const headerBtn=(PLAYER_MODE&&typeof playerEditMode==="function"&&playerEditMode()!=="off")
    ? playerPlayingAsBtnHTML()
    : `<button class="btn ghost sm ct-loadbtn" id="combatLoadTitle" title="Load a different scene or encounter">${LOAD_ICON}<span>Load encounter</span></button>`;
  return `<div class="ct-bar" style="--ct-accent:${advc}">
    ${title}
    ${headerBtn}
  </div>${notes}`;
}
// Full-width round/turn bar above the grid (CT9-fix): round counter, borderless turn arrows, an
// out-of-order chip, and a tools menu (group / sort / filter / roll / restore). The header divider is
// this bar's bottom border. On stacked layouts it still sits above the initiative (the top pane).
function combatRoundBarHTML(cb){
  const v=combatView(cb),oop=initOutOfPlace(cb);
  // "on" = the view differs from the default (group-by-status, sort-by-init, no filters), so the dot only
  // flags a deliberately-changed view — not the default grouping itself.
  const active=(v.group!=="status"||v.sort!=="init"||(v.filter.status||[]).length||(v.filter.faction||[]).length)?" on":"";
  // The d20 roll/re-roll button is always offered now — rollInitNow works in every init mode (it rolls fresh
  // dice with the digit-flow animation whether combatants are still unrolled averages or already rolled).
  return `<div class="ct-roundbar">
    <button class="ct-round" id="combatRoundEdit" title="Set the round">Round ${cb.round}</button>
    <span class="ct-turnline"></span>
    ${oop?`<button class="ct-oop" id="combatRestoreOrder" title="The turn order was changed by hand and no longer matches initiative. Click to restore">⚠ ${oop} out of order</button>`:""}
    <button class="ct-d20" id="combatRollInit" title="Roll initiative">${D20_ICON}<span class="ct-d20-lbl">Roll initiative</span></button>
    <button class="ct-toolsbtn ct-sharebtn${combatShareOn()?" on":""}" id="combatShare" title="${combatShareOn()?"Sharing initiative with players, manage":"Share initiative with players"}" aria-label="Share initiative with players">${SHARE_ICON}${_shareSuggest.size?`<span class="ct-sug-badge">${_shareSuggest.size}</span>`:""}</button>
    <button class="ct-toolsbtn${active}" id="combatTools" title="Group · sort · filter · re-roll">${TUNE_ICON}</button>
  </div>`;
}
function openRoundEdit(anchor){if(PLAYER_MODE)return;
  const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat;
  const p=showPopover(anchor,`<div class="round-edit">Round <input type="number" class="round-in" min="1" value="${cb.round}"><button class="btn primary sm" style="width:auto">Set</button></div>`);
  const inp=p.querySelector(".round-in");inp.focus();inp.select();
  const commit=()=>{const v=Math.max(1,Math.round(Number(inp.value)||1));closePopover();cb.round=v;saveAdv();renderCombat();};
  p.querySelector("button").addEventListener("click",commit);
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit();}else if(e.key==="Escape")closePopover();});
}
// Tools menu opened from the round bar — routes to the existing group/sort/filter pickers + roll/restore.
function openCombatToolsMenu(anchor){
  const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,v=combatView(cb),oop=initOutOfPlace(cb);
  const gL=(CV_GROUPS.find(([k])=>k===(v.group||""))||["","None"])[1];
  const sL=(CV_SORTS.find(([k])=>k===v.sort)||["init","Initiative"])[1];
  const nF=((v.filter.status||[]).length)+((v.filter.faction||[]).length);
  const html=`<button class="popitem" data-ctool="group">Group <span class="pop-val">${esc(gL)}</span></button>
    <button class="popitem" data-ctool="sort">Sort <span class="pop-val">${esc(sL)}</span></button>
    <button class="popitem" data-ctool="filter">Filter${nF?` <span class="pop-val">${nF}</span>`:""}</button>
    <div class="popsep"></div>
    <button class="popitem" data-ctool="roll">↻ Re-roll initiative</button>
    <button class="popitem" data-ctool="clear">Clear initiative</button>
    ${oop?`<button class="popitem" data-ctool="restore">Restore initiative order</button>`:""}
    <div class="popsep"></div>
    <button class="popitem danger" data-ctool="reset">Reset encounter</button>`;
  const p=showPopover(anchor,html);
  p.querySelectorAll("[data-ctool]").forEach(b=>b.addEventListener("click",ev=>{ev.stopPropagation();const k=b.dataset.ctool;
    if(k==="roll"){closePopover();rollAllInit();}
    else if(k==="clear"){closePopover();clearInitiative();}
    else if(k==="restore"){closePopover();restoreInitOrder();}
    else if(k==="reset"){closePopover();resetCombat();}
    else openCombatViewMenu(k,anchor);}));
}
// Scene-encounter dropdown (CT9-fix): switch between encounters of the current scene.
function openSceneEncMenu(anchor,a,e){
  const sibs=sceneEncs(a,e);
  const html=sibs.map(x=>`<button class="popitem popcheck${x.id===e.id?" on":""}" data-encpick="${x.id}"><span class="ck">${x.id===e.id?"●":""}</span>${esc(encDName(x))}<span class="enc-status sm st-${encStatus(x)}" style="margin-left:auto">${ENC_STATUS_LABEL[encStatus(x)]}</span></button>`).join("");
  const p=showPopover(anchor,html);
  p.querySelectorAll("[data-encpick]").forEach(b=>b.addEventListener("click",ev=>{ev.stopPropagation();closePopover();const x=findEnc(a,b.dataset.encpick);if(x)loadCombatEncounter(a,x);}));
}
function combatNotStartedHTML(a,e){
  const n=e.combatants.filter(c=>c.type!=="event").length;
  const done=e.status==="completed";
  return `<div class="combat-notstarted">
    <div class="ce-icon">${SWORDS_SVG}</div>
    <p class="hint">${done?"This encounter is marked completed. Start it again from the button below.":n?`${n} combatant group${n>1?"s":""} ready${a.party.length?` · ${a.party.length} party member${a.party.length>1?"s":""}`:""}.`:"No combatants in this encounter yet. Add some from the Adventures tab."}</p>
  </div>`;
}
// Forge-style draggable split between the initiative list and the active-combatant panel (CT9). The
// grid is rebuilt on every render, so re-apply the persisted size + rebind each time. Mirrors
// initForgeResizer (engine.js): horizontal drag wide, vertical drag when stacked.
function bindCombatResizer(){
  const fg=document.querySelector(".combat-grid"),rz=$("#combatResizer");if(!fg||!rz)return;
  try{const w=localStorage.getItem("mf_caw");if(w)fg.style.setProperty("--caw",w);const h=localStorage.getItem("mf_cah");if(h)fg.style.setProperty("--cah",h);}catch(e){}
  const vertical=()=>window.matchMedia("(max-width:1080px)").matches;
  let drag=false;
  rz.addEventListener("pointerdown",e=>{drag=true;rz.classList.add("drag");rz.setPointerCapture(e.pointerId);e.preventDefault();});
  rz.addEventListener("pointermove",e=>{if(!drag)return;const r=fg.getBoundingClientRect();
    if(vertical()){let hp=Math.round(r.bottom-e.clientY);hp=Math.max(150,Math.min(r.height-150,hp));fg.style.setProperty("--cah",hp+"px");}
    else{let w=Math.round(r.right-e.clientX);w=Math.max(320,Math.min(r.width-360,w));fg.style.setProperty("--caw",w+"px");}});
  const end=e=>{if(!drag)return;drag=false;rz.classList.remove("drag");try{rz.releasePointerCapture(e.pointerId);}catch(_){}
    try{localStorage.setItem("mf_caw",fg.style.getPropertyValue("--caw"));localStorage.setItem("mf_cah",fg.style.getPropertyValue("--cah"));}catch(_){}};
  rz.addEventListener("pointerup",end);rz.addEventListener("pointercancel",end);
  rz.addEventListener("dblclick",()=>{fg.style.removeProperty("--caw");fg.style.removeProperty("--cah");try{localStorage.removeItem("mf_caw");localStorage.removeItem("mf_cah");}catch(_){}});
}
// ── Share initiative with players (B202) ─────────────────────────────────────
// The DM publishes a sanitized snapshot of the live order to a PUBLIC JSONBin bin; players open player.html
// on their phones (link/QR) and it polls the bin every few seconds. Players see the initiative order, whose
// turn it is, and the round — with PCs shown in full (name + HP + conditions) but monsters obscured (a
// generic faction label + a coarse health band, no numbers or real names) and DM-only events hidden.
// FA-free "share-nodes" + "copy" glyphs for the round-bar button and dialog.
const SHARE_ICON='<svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M352 224c53 0 96-43 96-96s-43-96-96-96-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145.4 170.2 121.9 160 96 160c-53 0-96 43-96 96s43 96 96 96c25.9 0 49.4-10.2 66.6-26.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9 0 53 43 96 96 96s96-43 96-96-43-96-96-96c-25.9 0-49.4 10.2-66.6 26.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C302.6 213.8 326.1 224 352 224z"/></svg>';
const COPY_ICON='<svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 176c0-26.5 21.5-48 48-48z"/></svg>';
const QR_ICON='<svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M0 80C0 53.5 21.5 32 48 32l96 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-96 0c-26.5 0-48-21.5-48-48L0 80zM64 96l0 64 64 0 0-64L64 96zM0 336c0-26.5 21.5-48 48-48l96 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-96 0c-26.5 0-48-21.5-48-48l0-96zm64 16l0 64 64 0 0-64-64 0zM304 32l96 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-96 0c-26.5 0-48-21.5-48-48l0-96c0-26.5 21.5-48 48-48zm80 64l-64 0 0 64 64 0 0-64zM256 304c0-8.8 7.2-16 16-16l64 0c8.8 0 16 7.2 16 16s7.2 16 16 16l32 0c8.8 0 16-7.2 16-16s7.2-16 16-16s16 7.2 16 16l0 96c0 8.8-7.2 16-16 16l-64 0c-8.8 0-16-7.2-16-16s-7.2-16-16-16-16 7.2-16 16l0 64c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-160zm144 160a16 16 0 1 0 0 32 16 16 0 1 0 0-32zm-48 0a16 16 0 1 0 0 32 16 16 0 1 0 0-32z"/></svg>';
// Per-encounter share state in localStorage (per device, off the cloud-synced adventure data):
//   mf_share:<encId>     = read-snapshot bin id (presence == sharing is on; stopping deletes the bin)
//   mf_sharewb:<encId>   = player write-back bin id (present only while an edit mode is enabled)
//   mf_sharemode:<encId> = player edit mode: off | suggest | own | all (persists between shares)
function combatShareKey(){const ctx=loadedCtx();return ctx?"mf_share:"+ctx.e.id:null;}
function combatShareId(){const k=combatShareKey();return k?localStorage.getItem(k):null;}
function combatShareOn(){return !!combatShareId();}
function combatShareWbId(){const ctx=loadedCtx();return ctx?localStorage.getItem("mf_sharewb:"+ctx.e.id):null;}
function combatShareMode(){const ctx=loadedCtx();return (ctx&&localStorage.getItem("mf_sharemode:"+ctx.e.id))||"off";}
// Per-share enemy options (B204 stage 5): showBloodied = enemies show a health band (off ⇒ no HP info at
// all); enemyConds = players may edit enemy conditions (routing matches the PC mode). Stored per encounter.
function shareOpts(){const ctx=loadedCtx(),def={showBloodied:true,enemyConds:false,showDice:false};if(!ctx)return def;
  try{return Object.assign(def,JSON.parse(localStorage.getItem("mf_shareopts:"+ctx.e.id)||"{}"));}catch(e){return def;}}
function setShareOpt(k,v){const ctx=loadedCtx();if(!ctx)return;const o=shareOpts();o[k]=v;localStorage.setItem("mf_shareopts:"+ctx.e.id,JSON.stringify(o));}
function combatShareURL(id){return location.origin+location.pathname.replace(/[^/]*$/,"")+"index.html?share="+encodeURIComponent(id);}
// Coarse health band for an obscured (monster) row — no numbers leak to players.
function hpBand(it){if(it.hpMax==null)return null;if(it.hpCur<=0)return "down";const p=it.hpCur/it.hpMax;
  return p>=1?"healthy":p>0.5?"hurt":p>0.25?"bloodied":"critical";}
// Build the sanitized snapshot players receive. Order follows cb.order (the initiative/turn order); events
// are dropped and `turn` is the current combatant's index WITHIN the filtered list. When an edit mode is
// live, editable PC rows carry their instance id and the snapshot carries edit/wbin/wkey so phones can write.
function buildCombatShareSnapshot(cb){
  const list=[];let turn=-1;
  const mode=combatShareMode(),editing=mode!=="off"&&!!combatShareWbId();
  cb.order.forEach((it,i)=>{
    if(it.kind==="event")return; // lair/timing cues — DM-only
    if(it.status==="waiting")return; // waiting combatants are hidden from players (B237)
    if(i===cb.turnIndex)turn=list.length;
    const isPc=it.kind==="pc";
    const row={n:isPc?(it.name||"Character"):(it.name||it.faction||"Enemy"),pc:isPc};
    if(i===cb.turnIndex)row.cur=true;
    const conds=(it.conditions||[]).map(c=>c.name).filter(Boolean);
    if(conds.length)row.c=conds;
    if(isPc){if(hpTracked(it))row.hp={c:it.hpCur,m:it.hpMax,t:it.hpTemp||0};if(isDown(it))row.down=true;
      if(it.status==="dead")row.dead=true;
      if(editing&&hpTracked(it))row.id=it.id;} // editable PCs carry their instance id for the write-back
    else{const b=hpBand(it);if(b)row.band=b;}
    list.push(row);
  });
  const opts=shareOpts();
  const snap={v:1,round:cb.round,turn,updated:Date.now(),order:list};
  if(editing){snap.edit=mode;snap.wbin=combatShareWbId();snap.enemyConds=!!opts.enemyConds;}
  // Richer payload for the in-app player mode (B204): the real tracker renders from this. Full PC instances
  // (minus the DM note) + obscured enemy instances (faction label + band, no statblock/HP). Events dropped.
  const porder=[];let pturn=0;
  cb.order.forEach((it,i)=>{if(it.kind==="event"||it.status==="waiting")return;if(i===cb.turnIndex)pturn=porder.length;porder.push(playerSafeInstance(it,opts));});
  const _ctx=loadedCtx();
  snap.combat={round:cb.round,turnIndex:pturn,order:porder,name:(_ctx&&_ctx.e&&_ctx.e.name&&_ctx.e.name.trim())||""};
  // Character sheets (B204 stage 2): each editable PC's roster record, notes stripped, keyed by srcId. In
  // player mode these hydrate state.roster so the real pcSheet/active-panel render with full data.
  const chars={};
  cb.order.forEach(it=>{if(it.kind==="pc"&&it.srcId&&!chars[it.srcId]){const c=rosterById(it.srcId);if(c)chars[it.srcId]=playerSafeChar(c);}});
  snap.chars=chars;
  // Dice mirror (B234): when "show dice" is on, publish the shared roll log so players see every roll —
  // their own + the DM's — animate (3D), alert, and list. Compact entries; newest first (rollLog order).
  if(opts.showDice){
    snap.diceOn=true;
    snap.rolls=(typeof rollLog!=="undefined"?rollLog:[]).slice(0,30).map(r=>({id:r.id,ts:r._t||Date.now(),label:r.label||"Roll",type:r.type||null,total:r.total,parts:r.parts||"",abil:r.abil||null,dmgType:r.dmgType||null,crit:!!r.crit,by:(r.source&&r.source.name)||""}));
  }
  return snap;
}
// A roster character sanitized for the shared payload — a deep copy with the notes/backstory stripped
// (the one part of the sheet the user keeps private from players).
function playerSafeChar(c){const o=JSON.parse(JSON.stringify(c));o.notes="";return o;}
// One combat instance, sanitized for the shared payload. PCs keep their fields (the DM note is dropped);
// enemies are obscured to a faction label + health band with no statblock id, HP numbers, or note.
function playerSafeInstance(it,opts){
  opts=opts||{showBloodied:true};
  const conds=(it.conditions||[]).map(c=>{const o={name:c.name};if(c.rounds)o.rounds=c.rounds;if(c.endWhen)o.endWhen=c.endWhen;if(c.endWho)o.endWho=c.endWho;return o;});
  const base={id:it.id,kind:it.kind,faction:it.faction,init:it.init,initMod:it.initMod||0,initRolled:it.initRolled!==false,initManual:!!it.initManual,dex:it.dex||10,status:it.status||"active",groupId:it.groupId,conditions:conds,reaction:it.reaction!==false};
  if(it.concentration)base.concentration=true;
  if(it.kind==="pc")return Object.assign(base,{name:it.name,ac:it.ac,hpMax:it.hpMax,hpCur:it.hpCur,hpTemp:it.hpTemp||0,srcId:it.srcId,srcEntry:it.srcEntry,resources:it.resources||[]},it.deathSaves?{deathSaves:it.deathSaves}:{});
  // Enemy: HP/statblock obscured, but the display NAME is shown (custom nickname if set, else the statblock
  // name — same label the DM sees). Health band only when "show bloodied" is on (off ⇒ no HP info at all).
  return Object.assign(base,{name:it.name||it.faction||"Enemy",ac:null,hpMax:null,hpCur:null,hpTemp:0,srcId:null,resources:[],_enemy:true,band:opts.showBloodied?hpBand(it):null});
}
// Debounced re-publish: every combat change re-renders, which calls this; it no-ops when sharing is off.
let _sharePending=null,_shareBusy=false;
function publishCombatShareSoon(){if(!combatShareOn())return;clearTimeout(_sharePending);_sharePending=setTimeout(publishCombatShareNow,800);}
async function publishCombatShareNow(){
  if(_shareBusy)return;const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return;
  const id=localStorage.getItem("mf_share:"+ctx.e.id);if(!id)return;
  _shareBusy=true;
  try{await jbinSetPublic(id,buildCombatShareSnapshot(ctx.e.combat));}
  finally{_shareBusy=false;}
}
async function startCombatShare(){
  const ctx=loadedCtx();if(!ctx||!ctx.e.combat){toast("Load an encounter first.");return null;}
  const encId=ctx.e.id;
  // An edit mode selected → create the write-back bin FIRST so the snapshot can carry it.
  if(combatShareMode()!=="off"&&!localStorage.getItem("mf_sharewb:"+encId)){
    const wb=await jbinSetPublic(null,{v:1,edits:{}});if(wb)localStorage.setItem("mf_sharewb:"+encId,wb);
  }
  const id=await jbinSetPublic(null,buildCombatShareSnapshot(ctx.e.combat));
  if(id){localStorage.setItem("mf_share:"+encId,id);startSharePoll();return id;}
  toast("Couldn't start sharing. Check your connection.");return null;
}
async function stopCombatShare(){
  const ctx=loadedCtx();if(!ctx)return;const encId=ctx.e.id;
  stopSharePoll();_shareSuggest.clear();_shareApplied={};
  const rid=localStorage.getItem("mf_share:"+encId),wid=localStorage.getItem("mf_sharewb:"+encId);
  localStorage.removeItem("mf_share:"+encId);localStorage.removeItem("mf_sharewb:"+encId);
  if(rid)await jbinDeletePublic(rid);if(wid)await jbinDeletePublic(wid);
}
// Switch the player-edit mode. Stored regardless; if a share is already live, it spins up / tears down the
// write-back bin + poller and republishes so phones pick up the new mode immediately.
async function setShareEditMode(mode){
  const ctx=loadedCtx();if(!ctx)return;const encId=ctx.e.id;
  localStorage.setItem("mf_sharemode:"+encId,mode);
  if(!combatShareOn())return; // not live yet — just remember it for when sharing starts
  if(mode==="off"){
    stopSharePoll();_shareSuggest.clear();
    const wid=localStorage.getItem("mf_sharewb:"+encId);localStorage.removeItem("mf_sharewb:"+encId);if(wid)await jbinDeletePublic(wid);
  }else{
    if(!localStorage.getItem("mf_sharewb:"+encId)){const wb=await jbinSetPublic(null,{v:1,edits:{}});if(wb)localStorage.setItem("mf_sharewb:"+encId,wb);}
    if(mode!=="suggest")_shareSuggest.clear();
    startSharePoll();
  }
  await publishCombatShareNow();
}
// ── Player write-back poller + apply (B203) ──────────────────────────────────
// Polls the write-back bin a few times a second-ish; live modes apply each PC edit to its instance, suggest
// mode queues it for DM approval. `_shareApplied` tracks the last-seen ts per PC id so nothing reapplies.
let _sharePoll=null,_sharePollBusy=false,_shareApplied={};
const _shareSuggest=new Map(); // pcId → {id,name,by,edit,ts} pending DM approval (suggest mode)
const _shareRollSeen=new Set(); // roll-event ids already folded into the DM roll log (B204 stage 4)
const _shareCharApplied={}; // srcId → last-applied sheet-edit ts (B204 stage 4b)
const _shareJoinApplied={}; // instId → ts of a processed player "join the fight" request (B235)
function startSharePoll(){if(_sharePoll)return;_sharePoll=setInterval(pollShareEdits,3000);pollShareEdits();}
function stopSharePoll(){if(_sharePoll){clearInterval(_sharePoll);_sharePoll=null;}}
async function pollShareEdits(){
  if(_sharePollBusy)return;const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return;
  const mode=combatShareMode(),wid=combatShareWbId();if(mode==="off"||!wid){stopSharePoll();return;}
  _sharePollBusy=true;
  try{
    const rec=await jbinReadBin(wid);if(!rec||!rec.edits)return;
    const cb=ctx.e.combat;let applied=false,queued=false,reorder=false;
    Object.keys(rec.edits).forEach(id=>{
      const e=rec.edits[id];if(!e||!e.ts)return;
      if(_shareApplied[id]&&_shareApplied[id]>=e.ts)return; // already handled this edit
      const it=cb.order.find(o=>o.id===id);if(!it||it.kind==="event")return;
      _shareApplied[id]=e.ts;
      const isPc=it.kind==="pc";
      if(mode==="suggest"){_shareSuggest.set(id,{id,name:it.name,by:e.by||"",edit:e,ts:e.ts});queued=true;}
      else if(isPc){if(e.init!=null&&Number(e.init)!==it.init)reorder=true;applyPlayerEdit(it,e);applied=true;}
      // Enemy rows: apply ONLY the conditions (HP/init stay DM-owned) so player-set enemy conditions persist
      // instead of reverting when the player's optimistic window lapses (B233 fix).
      else if(Array.isArray(e.conds)){it.conditions=e.conds.map(n=>(it.conditions||[]).find(c=>c.name===n)||{name:String(n)});applied=true;}
    });
    // Player character-SHEET edits (B204 stage 4b): apply to the roster char (keeping the DM's notes) +
    // resync instances, or queue as a suggestion.
    let charApplied=false;
    if(rec.charEdits)Object.keys(rec.charEdits).forEach(srcId=>{const ce=rec.charEdits[srcId];if(!ce||!ce.ts)return;
      if(_shareCharApplied[srcId]&&_shareCharApplied[srcId]>=ce.ts)return;_shareCharApplied[srcId]=ce.ts;
      if(mode==="suggest"){_shareSuggest.set("char:"+srcId,{id:"char:"+srcId,name:ce.by||"Player",charEdit:ce.char,ts:ce.ts,isChar:true});queued=true;}
      else{applyCharEdit(srcId,ce.char);charApplied=true;}});
    if(charApplied){resyncPcInstances();saveRoster();}
    // Player "join the fight" requests (B235): create a roster char + a PC combat instance with the player's
    // chosen id, so the new character appears in the order for everyone (and the player can claim it).
    let joinNew=false;
    if(rec.joins)Object.keys(rec.joins).forEach(jid=>{const j=rec.joins[jid];if(!j||!j.ts||!j.instId)return;
      if(_shareJoinApplied[j.instId])return;_shareJoinApplied[j.instId]=j.ts;
      if(cb.order.some(o=>o.id===j.instId))return;
      const srcId=j.srcId||uid();
      if(!rosterById(srcId)){const c={id:srcId,name:j.name||"Player",notes:"",fields:[{k:"level",v:""},{k:"class",v:[]},{k:"ac",v:""},{k:"hp",v:""}]};state.roster.push(typeof normalizeRosterPC==="function"?normalizeRosterPC(c):c);}
      cb.order.push(pmNewJoinInstance(j.instId,srcId,j.name));joinNew=true;});
    if(joinNew){if(combatView(cb).sort==="init"){const cur=cb.order[cb.turnIndex];sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));}saveRoster();saveAdv();}
    // Player dice rolls → fold new ones into the DM roll log (B204 stage 4).
    let rollNew=false;
    if(Array.isArray(rec.rolls)){rec.rolls.forEach(ev=>{if(!ev||!ev.id||_shareRollSeen.has(ev.id))return;_shareRollSeen.add(ev.id);
      rollLog.unshift({id:ev.id,_t:ev.ts||Date.now(),label:ev.label||"Roll",type:ev.type||null,total:ev.total,parts:ev.parts||"",adv:null,crit:!!ev.crit,outcome:null,abil:ev.abil||null,dmgType:ev.dmgType||null,source:{name:ev.by||"Player",id:null},fromPlayer:true,roll:{formula:String(ev.total||0),label:ev.label||"Roll",type:ev.type||null}});rollNew=true;});
      if(rollLog.length>60)rollLog.length=60;}
    if(applied){if(reorder&&combatView(cb).sort==="init"){const cur=cb.order[cb.turnIndex];sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));}saveAdv();}
    if(applied||charApplied||queued||joinNew)renderCombat(); // renderCombat republishes so the new PC reaches everyone
    // A player's roll folded in → re-render the log and (when dice mirroring is on) republish so the OTHER
    // players' views pick it up too (B234).
    if(rollNew){renderRollLog(true);if(typeof shareOpts==="function"&&shareOpts().showDice)publishCombatShareSoon();}
  }finally{_sharePollBusy=false;}
}
// Apply one player edit to a combat instance: HP/temp clamp to the instance's max; conditions are reconciled
// by name so DM-set durations on kept conditions survive; initiative / reaction / concentration / status
// follow the player too (B204 stage 3 — full combat-row parity).
function applyPlayerEdit(it,e){
  if(it.hpMax!=null){
    if(e.hp!=null&&!isNaN(Number(e.hp)))it.hpCur=clamp(Number(e.hp),0,it.hpMax);
    if(e.temp!=null&&!isNaN(Number(e.temp)))it.hpTemp=Math.max(0,Number(e.temp));
  }
  if(Array.isArray(e.conds)){const cur=it.conditions||[];it.conditions=e.conds.map(n=>cur.find(c=>c.name===n)||{name:String(n)});}
  if(e.init!=null&&!isNaN(Number(e.init)))it.init=Number(e.init);
  if(typeof e.reaction==="boolean")it.reaction=e.reaction;
  if(typeof e.concentration==="boolean")it.concentration=e.concentration;
  if(e.status&&CI_STATUSES.indexOf(e.status)>=0)it.status=e.status;
  applyDownState(it);
}
// Apply a player's sheet edit to the DM's roster char — replace name/fields, KEEP the DM's private notes.
function applyCharEdit(srcId,pchar){const c=rosterById(srcId);if(!c||!pchar)return;c.name=pchar.name;c.fields=pchar.fields;}
// Approve / dismiss a pending suggestion, then strip it from the write-back bin so it isn't re-surfaced.
async function resolveSuggestion(id,accept){
  const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return;
  const s=_shareSuggest.get(id);_shareSuggest.delete(id);const isChar=s&&s.isChar,srcId=isChar?id.slice(5):null;
  if(accept&&s){if(isChar){applyCharEdit(srcId,s.charEdit);resyncPcInstances();saveRoster();}
    else{const it=ctx.e.combat.order.find(o=>o.id===id);if(it){applyPlayerEdit(it,s.edit);saveAdv();}}}
  const wid=combatShareWbId();
  if(wid){const rec=await jbinReadBin(wid);if(rec){
    if(isChar){if(rec.charEdits&&rec.charEdits[srcId]){delete rec.charEdits[srcId];await jbinSetPublic(wid,rec);}}
    else if(rec.edits&&rec.edits[id]){delete rec.edits[id];await jbinSetPublic(wid,rec);}}}
  if(isChar)delete _shareCharApplied[srcId];else delete _shareApplied[id];
  renderCombat();
}
// Compact human description of a pending suggestion for the inbox row.
function suggestDesc(s){if(s.isChar)return "updated their character sheet";const e=s.edit,parts=[];
  if(e.hp!=null)parts.push("HP → "+e.hp);
  if(e.temp!=null)parts.push("temp "+e.temp);
  if(Array.isArray(e.conds))parts.push("conditions: "+(e.conds.length?e.conds.join(", "):"none"));
  return parts.join(" · ")||"edit";}
// The player-editing picker (segmented Off/On) — shown in both share-dialog states. No setup key needed
// (B243): Firebase's open-rule write path means any device can write to its own share, so there's nothing
// left to gate the toggle on.
function shareEditPickerHTML(){
  const on=combatShareMode()!=="off";
  const seg=`<button type="button" class="seg-btn${!on?" on":""}" data-emode="off">Off</button>`+
    `<button type="button" class="seg-btn${on?" on":""}" data-emode="own">On</button>`;
  const hint=!on?`Players can only watch (read-only).`
    :`Each player claims their character and can edit its HP, conditions &amp; sheet (and roll), live.`;
  return `<div class="share-edit">
    <div class="share-edit-h">Player editing</div>
    <div class="seg" role="group" aria-label="Player editing">${seg}</div>
    <p class="share-edit-hint">${hint}</p>
  </div>`;
}
// Two enemy toggles (B204 stage 5): show health bands; let players edit enemy conditions (needs an edit mode).
function shareTogglesHTML(){
  const o=shareOpts(),editing=combatShareMode()!=="off";
  const tog=(opt,label,on,disabled)=>`<label class="share-tog${disabled?" dim":""}"><span class="share-tog-l">${label}</span><span class="switch"><input type="checkbox" data-shareopt="${opt}" ${on?"checked":""} ${disabled?"disabled":""}><span class="sl"></span></span></label>`;
  return `<div class="share-toggles">
    ${tog("showBloodied","Show enemy health (bloodied bands)",o.showBloodied,false)}
    ${tog("enemyConds","Let players edit enemy conditions",o.enemyConds&&editing,!editing)}
    ${tog("showDice","Show dice to players (roll log, 3D dice & alerts)",o.showDice,false)}
  </div>`;
}
function shareSuggestHTML(){
  if(combatShareMode()!=="suggest"||!_shareSuggest.size)return "";
  const rows=[..._shareSuggest.values()].map(s=>`<div class="sug-row">
    <div class="sug-info"><span class="sug-who">${esc(s.name)}${s.by&&s.by!==s.name?` <span class="sug-by">(${esc(s.by)})</span>`:""}</span><span class="sug-desc">${esc(suggestDesc(s))}</span></div>
    <div class="sug-acts"><button class="btn ghost sm" data-sugno="${esc(s.id)}" style="width:auto">Dismiss</button><button class="btn primary sm" data-sugyes="${esc(s.id)}" style="width:auto">Apply</button></div>
  </div>`).join("");
  return `<div class="share-suggests"><div class="share-edit-h">Pending suggestions</div>${rows}</div>`;
}
function bindShareEditControls(draw){
  document.querySelectorAll("[data-emode]").forEach(b=>b.addEventListener("click",async()=>{if(b.disabled||b.classList.contains("on"))return;b.classList.add("busy");await setShareEditMode(b.dataset.emode);draw();}));
  document.querySelectorAll("[data-sugyes]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;await resolveSuggestion(b.dataset.sugyes,true);draw();}));
  document.querySelectorAll("[data-sugno]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;await resolveSuggestion(b.dataset.sugno,false);draw();}));
  document.querySelectorAll("[data-shareopt]").forEach(cb=>cb.addEventListener("change",async()=>{setShareOpt(cb.dataset.shareopt,cb.checked);if(combatShareOn())await publishCombatShareNow();draw();}));
}
// The share dialog: off → a primer + editing picker + "Start sharing"; on → the link/QR, editing picker,
// any pending suggestions, and a low-key "Stop sharing".
function openCombatShareDialog(){
  const draw=()=>{
    const id=combatShareId();
    if(!id){
      openModalRaw(`<h3>Share initiative</h3>
        <div class="share-dlg">
          <p class="share-sub">Players follow the turn order and party HP live on their phones. Monster names and HP stay hidden.</p>
          ${shareEditPickerHTML()}
          ${shareTogglesHTML()}
          <div class="mrow"><button class="btn primary sm" id="shareStart" style="width:auto">Start sharing</button></div>
        </div>`);
      bindShareEditControls(draw);
      $("#shareStart").addEventListener("click",async()=>{const b=$("#shareStart");b.disabled=true;b.textContent="Starting…";const nid=await startCombatShare();if(nid){renderCombat();draw();}else{b.disabled=false;b.textContent="Start sharing";}});
      return;
    }
    const url=combatShareURL(id);
    openModalRaw(`<h3 class="share-h">Sharing is live<span class="share-badge">Live</span></h3>
      <div class="share-dlg">
        <p class="share-sub">Players open the link to follow the fight live.</p>
        <div class="share-link"><input type="text" id="shareUrl" class="popinput" readonly value="${esc(url)}"><button class="btn ghost sm" id="shareCopy" title="Copy link" style="width:auto">${COPY_ICON}<span>Copy</span></button><button class="btn ghost sm" id="shareQrBtn" title="Show QR code" style="width:auto">${QR_ICON}<span>QR</span></button></div>
        <button class="share-preview" id="sharePreview" title="Open the player view in a new tab">Preview as player ↗</button>
        ${shareEditPickerHTML()}
        ${shareTogglesHTML()}
        ${shareSuggestHTML()}
        <button class="share-stop" id="shareStop">Stop sharing</button>
      </div>`);
    bindShareEditControls(draw);
    $("#shareCopy").addEventListener("click",()=>{const inp=$("#shareUrl");inp.select();
      const done=()=>{const s=$("#shareCopy").querySelector("span");s.textContent="Copied";setTimeout(()=>{s.textContent="Copy";},1500);};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(inp.value).then(done,()=>{try{document.execCommand("copy");done();}catch(_){}});
      else{try{document.execCommand("copy");done();}catch(_){}}});
    $("#shareQrBtn").addEventListener("click",()=>openShareQR(url));
    // "Preview as player" → a network-free local preview of the CURRENT combat (no bin fetch, always works):
    // stash the snapshot to localStorage and open the player view against it. Copy/QR give the real link.
    $("#sharePreview").addEventListener("click",()=>{_pmPreviewOn=true;stashPreviewSnap();
      try{window.open("index.html?share=__preview__","_blank");}catch(e){location.href="index.html?share=__preview__";}});
    $("#shareStop").addEventListener("click",async()=>{const b=$("#shareStop");b.disabled=true;b.textContent="Stopping…";await stopCombatShare();closeModal();renderCombat();toast("Sharing stopped, players disconnected.");});
  };
  draw();
}
// QR overlay (B210 feedback): the share dialog now offers a "QR" button instead of an always-on code; this
// shows it large in a dismissable overlay.
function openShareQR(url){
  const old=document.getElementById("qrOverlay");if(old)old.remove();
  let svg="";try{const QR=window.qrcode;if(typeof QR==="function"){const q=QR(0,"M");q.addData(url);q.make();svg=q.createSvgTag({cellSize:7,margin:2,scalable:true});}}catch(e){}
  const bg=document.createElement("div");bg.className="qr-overlay";bg.id="qrOverlay";
  bg.innerHTML=`<div class="qr-card"><button class="qr-x" aria-label="Close">✕</button><div class="qr-svg">${svg||'<p class="hint" style="padding:30px">QR code unavailable.</p>'}</div></div>`;
  document.body.appendChild(bg);
  const close=()=>bg.remove();
  bg.addEventListener("click",e=>{if(e.target===bg)close();});
  bg.querySelector(".qr-x").addEventListener("click",close);
}
// ── In-app player mode (B204, stage 1) ───────────────────────────────────────
// index.html?share=<bin> boots here instead of the normal DM init: fetch the shared bin, hydrate a synthetic
// combat into `state`, lock the shell to a read-only combat view, and poll for updates. PLAYER_MODE gates
// every persistence/DM path elsewhere so the real app is untouched.
// Mirror the current combat to localStorage for the network-free "Preview as player" tab (B211 feedback).
// Force the editing surfaces on (with a sentinel wbin/wkey) so the DM can review the full player UX; writes
// short-circuit locally (see pmQueueWrite) so edits show optimistically without needing a real bin.
function stashPreviewSnap(){const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return;
  const snap=buildCombatShareSnapshot(ctx.e.combat),mode=combatShareMode();
  if(mode!=="off"){snap.edit=mode;snap.wbin="__preview__";snap.enemyConds=!!shareOpts().enemyConds;}
  try{localStorage.setItem("mf_previewsnap",JSON.stringify(snap));}catch(e){}}
async function initPlayerMode(bin){
  PLAYER_MODE=true;PLAYER_BIN=bin;
  document.body.classList.add("player-mode");
  // Local preview (no JSONBin): read the snapshot the DM stashed in localStorage and poll it for live updates.
  if(bin==="__preview__"){
    let started=false;
    const load=()=>{let s=null;try{s=JSON.parse(localStorage.getItem("mf_previewsnap")||"null");}catch(e){}
      if(!s||!s.combat){if(!started)playerModeMessage("Preview not ready","In the DM app, open the share dialog and tap “Preview as player”.");return;}
      hydratePlayerCombat(s);if(!started){started=true;switchView("combat");}else if(_curView==="combat")renderCombat();};
    load();setInterval(load,1500);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
    return;
  }
  const rec=await jbinReadBin(bin);
  if(!rec){playerModeMessage("Can’t reach the shared fight","Check your connection and reload.");return;}
  if(!rec.combat){playerModeMessage("Sharing ended","Your DM stopped sharing this fight.");return;}
  hydratePlayerCombat(rec);switchView("combat");
  const refresh=async()=>{const r=await jbinReadBin(bin);if(r&&r.combat){hydratePlayerCombat(r);if(_curView==="combat")renderCombat();}};
  setInterval(refresh,5000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
}
// Build a one-adventure / one-encounter synthetic state from the shared payload so the real renderer works.
function hydratePlayerCombat(rec){
  const c=rec.combat;
  state.__pmEdit=rec.edit||"off";state.__pmWbin=rec.wbin||null;state.__pmEnemyConds=!!rec.enemyConds;
  state.__pmDiceOn=!!rec.diceOn; // DM's "show dice to players" toggle (B234)
  state.adv=[{id:"share",name:"",color:null,archived:false,scenes:[],party:[],
    encounters:[{id:"enc",name:(c.name&&c.name.trim())||"Initiative",archived:false,sceneId:null,combatants:[],notes:"",notesOn:false,
      combat:{active:true,round:c.round||1,turnIndex:c.turnIndex||0,order:c.order||[],view:{group:"status",sort:"init",filter:{}}}}]}];
  combatCtx={advId:"share",encId:"enc"};
  // Hydrate the published PC sheets into the roster (in place; keeps unconfirmed local sheet edits — B204 s4b).
  hydratePlayerRoster(rec);
  // Baseline = the DM's confirmed state; then re-apply any unconfirmed local edits on top (optimistic).
  const order=state.adv[0].encounters[0].combat.order;
  pmInjectJoin(order); // show ourselves optimistically while a join request is pending (B235)
  _pmBaseline={};order.forEach(it=>{if(it.kind!=="event")_pmBaseline[it.id]=instEditFields(it);}); // PCs + enemies (cond edits)
  pmReconcile(order);
  pmIngestRolls(rec); // dice mirror: surface the DM's/other players' rolls (B234)
}
// Player dice mirror (B234): the shared roll log rides in the snapshot. Rebuild the local roll log from it
// (keeping a just-made local roll that hasn't echoed back yet) and animate the most-recent NEW roll someone
// else made — their own rolls already animated locally, so those are skipped by id.
let _pmRollSeen=new Set(),_pmRollInit=false;
function pmRollToEntry(r){return {id:r.id,_t:r.ts||Date.now(),label:r.label||"Roll",type:r.type||null,total:r.total,parts:r.parts||"",adv:null,crit:!!r.crit,outcome:null,abil:r.abil||null,dmgType:r.dmgType||null,source:{name:r.by||"",id:null},roll:{formula:String(r.total||0),label:r.label||"Roll",type:r.type||null}};}
function pmIngestRolls(rec){
  if(!PLAYER_MODE)return;
  if(!state.__pmDiceOn){if(rollLog.length){rollLog.length=0;if(typeof renderRollLog==="function")renderRollLog();}return;} // dice hidden → no log
  const rolls=Array.isArray(rec.rolls)?rec.rolls:[];
  const localIds=new Set(rollLog.map(r=>r.id));
  const fresh=rolls.filter(r=>r&&r.id&&!_pmRollSeen.has(r.id)&&!localIds.has(r.id)); // rolls made elsewhere we haven't shown
  rolls.forEach(r=>{if(r&&r.id)_pmRollSeen.add(r.id);});
  // The shared log is authoritative; keep any local-only entry (a roll just made, not yet echoed) on top.
  const mapped=rolls.map(pmRollToEntry),mappedIds=new Set(mapped.map(r=>r.id));
  rollLog=mapped.concat(rollLog.filter(r=>!mappedIds.has(r.id))).sort((a,b)=>(b._t||0)-(a._t||0)).slice(0,60);
  // Animate the newest unseen external roll (not on first load — don't replay history when joining).
  const anim=_pmRollInit?fresh.filter(r=>r.parts).sort((a,b)=>(b.ts||0)-(a.ts||0))[0]:null;
  _pmRollInit=true;
  if(anim){
    combatRollSrc={name:anim.by||"Roll",id:null};
    const did=typeof rollDice3D==="function"&&rollDice3D({parts:anim.parts,total:anim.total,label:anim.label,type:anim.type,dmgType:anim.dmgType,abil:anim.abil,crit:!!anim.crit});
    if(!did&&typeof toast==="function"&&typeof naturalRollText==="function")toast(naturalRollText(anim.label,anim.type,anim.total,anim.dmgType,anim.abil),3200,true);
  }
  if(typeof renderRollLog==="function")renderRollLog(fresh.length>0);
}
// ── Player editing (B204 stage 3) ────────────────────────────────────────────
// The shared edit mode + write-back bin/key ride along in the snapshot. Editability per mode: own = the
// claimed PC only; all/suggest = any PC. The claim (own mode) is a localStorage pick keyed by the bin.
let _pmBaseline={},_pmPending={},_pmPushTimer=null,_pmWrite=Promise.resolve();
let _pmCharBaseline={},_pmCharPending={},_pmCharPushTimer=null; // sheet-edit (B204 stage 4b) baseline + optimistic
let _pmPreviewOn=false; // DM tapped "Preview as player" → mirror the live snapshot to localStorage (network-free)
function playerEditMode(){return (PLAYER_MODE&&state.__pmEdit)||"off";}
function playerClaimId(){try{return PLAYER_BIN?localStorage.getItem("mf_claim:"+PLAYER_BIN):null;}catch(e){return null;}}
function setPlayerClaim(id){try{id?localStorage.setItem("mf_claim:"+PLAYER_BIN,id):localStorage.removeItem("mf_claim:"+PLAYER_BIN);}catch(e){}}
// Editing is own-PC-only now (B213 — simplified to Off/On): a player may edit only their claimed character.
function playerCanEdit(it){if(!PLAYER_MODE||!it||it.kind!=="pc")return false;
  if(playerEditMode()==="off"||!state.__pmWbin)return false;return it.id===playerClaimId();}
// Enemy CONDITIONS-only editing (B204 stage 5): any obscured combatant when the DM enabled it + editing on.
function playerEnemyCondsEditable(it){return !!(PLAYER_MODE&&it&&it.kind!=="pc"&&it.kind!=="event"&&state.__pmEnemyConds&&playerEditMode()!=="off"&&state.__pmWbin);}
// Phantom-input guard (B213): conditions may be edited on a player's own PC, or on enemies when permitted.
function playerCondAllowed(it){return !PLAYER_MODE||playerCanEdit(it)||playerEnemyCondsEditable(it);}
// The editable slice of a combat instance + equality, for diffing against the DM's snapshot.
function instEditFields(it){return {hp:it.hpCur,temp:it.hpTemp||0,conds:(it.conditions||[]).map(c=>c.name),init:it.init,reaction:it.reaction!==false,concentration:!!it.concentration,status:it.status||"active"};}
function sameEdit(a,b){return !!a&&!!b&&a.hp===b.hp&&a.temp===b.temp&&a.init===b.init&&a.reaction===b.reaction&&a.concentration===b.concentration&&a.status===b.status&&JSON.stringify(a.conds||[])===JSON.stringify(b.conds||[]);}
function applyEditFields(it,f){it.hpCur=f.hp;it.hpTemp=f.temp;it.init=f.init;it.reaction=f.reaction;it.concentration=f.concentration;it.status=f.status;
  it.conditions=(f.conds||[]).map(n=>(it.conditions||[]).find(c=>c.name===n)||{name:n});applyDownState(it);}
// Re-apply unconfirmed local edits over a fresh snapshot; clear ones the DM has now confirmed (or timed out).
function pmReconcile(order){const now=Date.now();
  Object.keys(_pmPending).forEach(id=>{const p=_pmPending[id],it=order.find(o=>o.id===id);
    if(!it||sameEdit(_pmBaseline[id],p.fields)||now-p.ts>15000){delete _pmPending[id];return;}
    applyEditFields(it,p.fields);});}
// Debounced write-back: push the editable PCs that differ from the DM's snapshot to the write-back bin.
function playerScheduleEdits(){if(!PLAYER_MODE)return;clearTimeout(_pmPushTimer);_pmPushTimer=setTimeout(playerPushEdits,500);}
// Serialize every player write-back (edits + rolls) through one read-modify-write queue so concurrent
// pushes can't clobber each other's slice of the bin.
function pmQueueWrite(mutate){
  const wbin=state.__pmWbin;if(!wbin)return Promise.resolve();
  if(wbin==="__preview__")return Promise.resolve(); // local preview — edits stay optimistic, no network write
  _pmWrite=_pmWrite.then(async()=>{const rec=(await jbinReadBin(wbin))||{v:1,edits:{}};mutate(rec);
    await jbinSetPublic(wbin,rec);}).catch(()=>{});
  return _pmWrite;
}
function playerPushEdits(){
  const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return;
  const suggest=playerEditMode()==="suggest",changes={},now=Date.now();
  ctx.e.combat.order.forEach(it=>{
    const pc=playerCanEdit(it),enemy=!pc&&playerEnemyCondsEditable(it);
    if(!pc&&!enemy)return;
    const cur=instEditFields(it);if(sameEdit(_pmBaseline[it.id],cur))return; // unchanged from the DM's state
    // PCs push the full field set; enemies push ONLY their conditions (so DM-owned HP/init aren't touched).
    changes[it.id]=pc?Object.assign({},cur,{ts:now,by:it.name,suggest}):{conds:cur.conds,ts:now,by:it.name,suggest};
    _pmPending[it.id]={fields:cur,ts:now};});
  if(!Object.keys(changes).length)return;
  pmQueueWrite(rec=>{rec.edits=rec.edits||{};Object.keys(changes).forEach(id=>rec.edits[id]=changes[id]);});
}
// ── Player character-SHEET editing (B204 stage 4b) ───────────────────────────
function charSig(c){return JSON.stringify({n:(c&&c.name)||"",f:(c&&c.fields)||[]});}
function editableCharIds(){const ctx=loadedCtx(),s=new Set();if(ctx&&ctx.e.combat)ctx.e.combat.order.forEach(it=>{if(playerCanEdit(it)&&it.srcId)s.add(it.srcId);});return s;}
function playerScheduleCharPush(){if(!PLAYER_MODE)return;clearTimeout(_pmCharPushTimer);_pmCharPushTimer=setTimeout(playerPushChars,500);}
function playerPushChars(){
  if(playerEditMode()==="off")return;
  const editable=editableCharIds(),suggest=playerEditMode()==="suggest",now=Date.now(),changes={};
  state.roster.forEach(c=>{if(!editable.has(c.id)||charSig(c)===_pmCharBaseline[c.id])return;
    const copy=JSON.parse(JSON.stringify(c));copy.notes="";changes[c.id]={char:copy,ts:now,by:c.name,suggest};_pmCharPending[c.id]=now;});
  if(!Object.keys(changes).length)return;
  pmQueueWrite(rec=>{rec.charEdits=rec.charEdits||{};Object.keys(changes).forEach(id=>rec.charEdits[id]=changes[id]);});
}
// Rebuild the roster from the published sheets, MUTATING existing char objects in place so an open edit
// modal keeps a live reference — and keeping a player's own unconfirmed edits until the DM confirms them.
function hydratePlayerRoster(rec){
  const pub=rec.chars||{},now=Date.now();
  state.roster=state.roster.filter(c=>pub[c.id]||_pmCharPending[c.id]);
  Object.keys(pub).forEach(id=>{
    const np=typeof normalizeRosterPC==="function"?normalizeRosterPC(pub[id]):pub[id];
    _pmCharBaseline[id]=charSig(np);
    const c=state.roster.find(x=>x.id===id);
    if(!c){state.roster.push(np);return;}
    const pend=_pmCharPending[id];
    if(pend&&now-pend<15000&&charSig(c)!==_pmCharBaseline[id])return; // keep the player's unconfirmed sheet edits
    delete _pmCharPending[id];c.name=np.name;c.fields=np.fields; // notes stay stripped; mutate in place
  });
}
// A dice roll the player made → append to the write-back bin's rolls[] so the DM's poller surfaces it in
// the roll log (attributed to the previewed PC via combatRollSrc).
function playerPushRoll(ev){
  const evt={id:ev.id||uid(),by:(combatRollSrc&&combatRollSrc.name)||"Player",label:ev.label||"Roll",type:ev.type||null,total:ev.total,parts:ev.parts||"",abil:ev.abil||null,dmgType:ev.dmgType||null,crit:!!ev.crit,ts:Date.now()};
  pmQueueWrite(rec=>{rec.rolls=rec.rolls||[];rec.rolls.push(evt);if(rec.rolls.length>20)rec.rolls=rec.rolls.slice(-20);});
}
// Player chrome (B235): when editing is on the player must pick (or create) their character via a gating
// modal before the page is usable; once claimed, a slim "Playing as <name> · Change" bar sits above the order.
function playerClaimedInst(){const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return null;const id=playerClaimId();return id?ctx.e.combat.order.find(o=>o.id===id&&o.kind==="pc"):null;}
// The name rolls made by THIS player carry (their claimed character) — used to split the shared roll log into
// "My rolls" vs "DM rolls" on the player side (B236).
function pmMyRollName(){const i=playerClaimedInst();return i?i.name:null;}
const PM_PERSON_ICON='<svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"/></svg>';
// The "Playing as <name>" control that takes the Load-encounter slot in the header in player mode; tapping
// it reopens the character gate. Reuses .ct-loadbtn so it collapses to just the icon when the header narrows.
function playerPlayingAsBtnHTML(){
  const inst=playerClaimedInst(),has=!!playerClaimId(),name=inst?inst.name:(has?"…":"Choose character");
  return `<button class="btn ghost sm ct-loadbtn pm-playingas" id="pmPlayingAs" title="${has?"Playing as "+esc(name)+", tap to change":"Choose your character"}">${PM_PERSON_ICON}<span><span class="pm-pa-l">Playing as</span> ${esc(name)}</span></button>`;
}
function playerGateNeeded(){return PLAYER_MODE&&playerEditMode()!=="off"&&!playerClaimId();}
function pmNamedPCs(){const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return [];
  return ctx.e.combat.order.filter(o=>o.kind==="pc"&&o.name&&o.name.trim()&&o.name!=="Character"&&o.name!=="PC");}
function playerModeChrome(body){
  if(playerEditMode()==="off"){closePlayerGate();return;} // read-only share: no claim concept
  if(playerGateNeeded()){if(!document.getElementById("pmGateBg"))openPlayerGate(false);return;} // gate until chosen (don't rebuild mid-type)
  closePlayerGate();
  // The "Playing as" control lives in the header (Load-encounter slot, B237) — tapping it reopens the gate.
  const pa=document.getElementById("pmPlayingAs");
  if(pa)pa.addEventListener("click",e=>{e.stopPropagation();openPlayerGate(true);});
  // Tapping an editable PC's name opens its character sheet (read + roll) — B204 stage 4.
  body.querySelectorAll(".cbt-row.pm-edit .ci-id").forEach(el=>{el.classList.add("pm-tap");
    el.addEventListener("click",e=>{e.stopPropagation();const row=el.closest(".cbt-row");if(row)openPlayerSheet(row.dataset.ci);});});
}
// The gating modal: pick a named character, or type a name to JOIN the live fight as a new PC. Not
// dismissable on the initial gate (no claim yet); dismissable when reopened via "Change" (keeps the claim).
function openPlayerGate(dismissable){
  closePlayerGate();
  const pcs=pmNamedPCs(),hasPCs=pcs.length>0;
  const list=pcs.map(p=>`<button class="pm-gate-pc" data-claimpc="${esc(p.id)}">${esc(p.name)}${p.id===playerClaimId()?' <span class="pm-gate-cur">current</span>':""}</button>`).join("");
  const bg=document.createElement("div");bg.className="pm-gate-bg";bg.id="pmGateBg";
  bg.innerHTML=`<div class="pm-gate">
    ${dismissable?'<button class="pm-gate-x" id="pmGateX" aria-label="Close">✕</button>':""}
    <div class="pm-gate-h">Choose your character</div>
    <div class="pm-gate-sub">${hasPCs?"Pick your character to join the fight.":"No characters yet. Enter your character's name to join."}</div>
    ${hasPCs?`<div class="pm-gate-list">${list}</div>`:""}
    <div class="pm-gate-new">
      ${hasPCs?`<div class="pm-gate-or">Not listed? Add your character</div>`:""}
      <div class="pm-gate-newrow"><input type="text" class="pm-gate-in" id="pmGateName" placeholder="Character name" autocomplete="off" maxlength="40"><button class="btn primary sm" id="pmGateJoin" style="width:auto">Join</button></div>
    </div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll("[data-claimpc]").forEach(b=>b.addEventListener("click",()=>{setPlayerClaim(b.dataset.claimpc);closePlayerGate();renderCombat();}));
  const inp=bg.querySelector("#pmGateName"),go=bg.querySelector("#pmGateJoin");
  const submit=()=>{const n=(inp.value||"").trim();if(n)playerJoinAs(n);};
  go.addEventListener("click",submit);
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submit();}});
  if(dismissable){const x=bg.querySelector("#pmGateX");if(x)x.addEventListener("click",closePlayerGate);bg.addEventListener("click",e=>{if(e.target===bg)closePlayerGate();});}
  if(!hasPCs)setTimeout(()=>{try{inp.focus();}catch(e){}},50);
}
function closePlayerGate(){const b=document.getElementById("pmGateBg");if(b)b.remove();}
// A minimal PC combat instance for a player-created join (HP/AC unknown until they fill their sheet).
function pmNewJoinInstance(instId,srcId,name){
  return {id:instId,kind:"pc",srcId:srcId,srcEntry:"pc:"+srcId,name:name||"PC",init:10,initMod:0,initRolled:false,initManual:false,dex:0,
    ac:null,hpMax:null,hpCur:null,hpTemp:0,status:"active",conditions:[],comment:"",faction:"PC",groupId:"pc:"+srcId,resources:[]};
}
// Player types a name → claim a fresh id and ask the DM (write-back `joins`) to create the real combatant.
// We optimistically show ourselves (pmInjectJoin) until the DM's snapshot carries the instance.
let _pmJoin=null;
function playerJoinAs(name){
  const instId=uid(),srcId=uid();
  _pmJoin={instId,srcId,name,ts:Date.now()};
  setPlayerClaim(instId);
  pmQueueWrite(rec=>{rec.joins=rec.joins||{};rec.joins[instId]={instId,srcId,name,ts:Date.now(),by:name};});
  closePlayerGate();
  if(typeof toast==="function")toast("Joining the fight…");
  // Immediate optimistic insert so we see ourselves right away (a direct push — NOT pmInjectJoin, which is
  // for the fresh per-poll order and uses presence to detect the DM's confirmation).
  const ctx=loadedCtx();
  if(ctx&&ctx.e.combat&&!ctx.e.combat.order.some(o=>o.id===instId)){
    ctx.e.combat.order.push(pmNewJoinInstance(instId,srcId,name));
    if(!rosterById(srcId))state.roster.push({id:srcId,name:name,notes:"",fields:[]});
  }
  renderCombat();
}
// Until the DM creates our requested instance, inject a placeholder so we see ourselves in the order. Cleared
// once the snapshot carries the instance (DM confirmed) or after a minute (DM never picked it up).
function pmInjectJoin(order){
  if(!_pmJoin)return;
  if(order.some(o=>o.id===_pmJoin.instId)){_pmJoin=null;return;}
  if(Date.now()-_pmJoin.ts>60000){_pmJoin=null;return;}
  order.push(pmNewJoinInstance(_pmJoin.instId,_pmJoin.srcId,_pmJoin.name));
  if(!rosterById(_pmJoin.srcId))state.roster.push({id:_pmJoin.srcId,name:_pmJoin.name,notes:"",fields:[]});
}
// Character preview overlay (B204 stage 4): reuses the real active-panel content (sheet + rollable chips).
// Edit affordances are suppressed (the row is the edit surface); rolling runs locally + mirrors to the DM.
function openPlayerSheet(pcId){
  const ctx=loadedCtx();if(!ctx||!ctx.e.combat)return;const it=ctx.e.combat.order.find(o=>o.id===pcId);if(!it||it.kind!=="pc")return;
  closePlayerSheet();
  const isTurn=ctx.e.combat.order[ctx.e.combat.turnIndex]&&ctx.e.combat.order[ctx.e.combat.turnIndex].id===pcId;
  const setSrc=()=>{combatRollSrc={name:it.name,id:null};};setSrc();
  const bg=document.createElement("div");bg.className="pm-sheet-bg";bg.id="pmSheetBg";
  bg.innerHTML=`<div class="pm-sheet"><button class="pm-sheet-x" id="pmSheetX" aria-label="Close">✕</button><div class="pm-sheet-body">${combatPanelInnerHTML(it,isTurn)}</div></div>`;
  document.body.appendChild(bg);
  bg.addEventListener("click",e=>{if(e.target===bg)closePlayerSheet();});
  bg.querySelector("#pmSheetX").addEventListener("click",closePlayerSheet);
  // Edit pencil → the real character-detail modal (sheet editing routes back to the DM — B204 stage 4b).
  bg.querySelectorAll("[data-pcedit]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();closePlayerSheet();openCharacterDetail(el.dataset.pcedit,null);}));
  bg.querySelectorAll(".pcs-roll[data-roll],.ca-stat-roll[data-roll]").forEach(el=>{
    el.addEventListener("click",e=>{if(!clickRollOn())return;e.stopPropagation();setSrc();if(e.altKey){openRollMenu(el);return;}quickRoll(el);});
    el.addEventListener("contextmenu",e=>{if(!clickRollOn())return;e.preventDefault();setSrc();openRollMenu(el);});});
}
function closePlayerSheet(){const b=document.getElementById("pmSheetBg");if(b)b.remove();}
// Character-summary popover for a roll-log player name (B213) — the PC counterpart to the monster statblock
// preview. Reuses pcSheetHTML (read-only) under a name/class header + AC/HP.
function showPcPreview(anchor,c){
  if(!c)return;const cls=(typeof charClasses==="function"?charClasses(c):[])||[];
  const ac=charFieldVal(c,"ac"),hp=charFieldVal(c,"hp");
  const stat=(k,v)=>(v==null||v==="")?"":`<span><b>${k}</b> ${esc(String(v))}</span>`;
  const stats=(stat("AC",ac)+stat("HP",hp));
  const head=`<div class="pcprev-h">${esc(c.name||"Character")}${cls.length?` <span class="pcprev-sub">${esc(cls.join(" / "))}</span>`:""}</div>`;
  tailPopover(anchor,`<div class="pcprev">${head}${stats?`<div class="pcprev-stats">${stats}</div>`:""}${pcSheetHTML({id:"_pcprev",kind:"pc",srcId:c.id,name:c.name,conditions:[]})}</div>`);
}
function playerModeMessage(title,sub){
  document.body.classList.add("player-mode");
  const app=document.getElementById("app");
  if(app)app.innerHTML=`<div class="pm-msg"><div class="pm-msg-t">${esc(title)}</div><div class="pm-msg-s">${esc(sub||"")}</div></div>`;
}
function renderCombat(){
  const body=$("#combatBody");if(!body)return;
  const ctx=loadedCtx();
  if(!ctx){setCrumbs(["Combat"]);combatRollSrc=null;
    body.innerHTML=`<div class="combat-empty">
      <div class="ce-icon">${SWORDS_SVG}</div>
      <h2>No encounter loaded</h2>
      <p class="hint">Load a scene or encounter to run its initiative, or hit the ⚔ button on an encounter in Adventures.</p>
      <button class="btn primary" id="combatLoad" style="width:auto">Load encounter</button>
    </div>`;
    $("#combatLoad").addEventListener("click",openLoadCombat);return;}
  const {a,e}=ctx,sc=sceneOf(a,e.sceneId);let cb=e.combat;
  // Combat is always "started": auto-start the tracker on load (no pre-combat screen) whenever the
  // encounter has something to fight. The dramatic "Rolling initiative…" flourish stays on the explicit
  // ⚔ entry (runCombat); loading the tab just builds the order silently.
  if(!cb&&(e.combatants.some(c=>c.type!=="event")||a.party.length)){startCombat(a,e);if(!e.archived)e.status="active";cb=e.combat;}
  if(cb&&syncCombatOrder(a,e))saveAdv(); // pick up combatants added to the source encounter (CT7b)
  const cur=cb?cb.order[cb.turnIndex]:null;
  // Attribute statblock / chip rolls to the combatant whose panel is shown — the peeked selection if any,
  // else the active turn (CT4; extended to PCs + the peek panel). PCs carry no id (not in the bestiary).
  {const sel=cb?combatSelInOrder():[];const shown=(sel.length&&cur&&sel[0].id!==cur.id)?sel[0]:cur;
   combatRollSrc=shown?{name:shown.name,id:shown.kind==="monster"?(shown.srcId||null):null}:null;}
  setCrumbs(["Combat"]); // combat is a top-level tab now, not a sub-section of Adventures (CT7)
  // The FAB is the turn control now (combat is always live): a primary "Next turn" + a previous-turn
  // chevron. Reset / re-roll live in the round-bar tools menu.
  const fab=cb?`<div class="combat-fab-turn">
      <button class="combat-fab-prev" id="combatPrev" title="Previous turn" aria-label="Previous turn">${CHEV_L}</button>
      <button class="combat-fab-next" id="combatNext" title="Next turn"><span>Next turn</span>${CHEV_R}</button>
    </div>`:"";
  // Preserve the scroll position of the order list (and active panel) across the full re-render — selecting
  // or editing a row rebuilds the DOM and would otherwise jump back to the top (B123).
  const _pOrd=body.querySelector(".combat-order"),_pAct=body.querySelector(".ca-scroll");
  const _ordTop=_pOrd?_pOrd.scrollTop:0,_actTop=_pAct?_pAct.scrollTop:0;
  body.innerHTML=combatHeaderHTML(a,e,sc,cb)+(cb?
    combatRoundBarHTML(cb)+combatHintHTML()+`
    <div class="combat-grid">
      <div class="combat-order"><div class="combat-rows" id="combatRows">${combatOrderBodyHTML(cb)}</div><button class="cbt-add" id="combatAddBtn">＋ Add combatant</button>${combatRolling?`<div class="combat-roll-overlay"><span class="cro-die">${D20_ICON}</span><span class="cro-t">Rolling initiative…</span></div>`:""}</div>
      <div class="combat-resizer" id="combatResizer" title="Drag to resize · double-click to reset"></div>
      <div class="combat-active">${combatActiveHTML(cur)}</div>
    </div>`:combatNotStartedHTML(a,e))+fab;
  {const o=body.querySelector(".combat-order");if(o&&_ordTop)o.scrollTop=_ordTop;const ac=body.querySelector(".ca-scroll");if(ac&&_actTop)ac.scrollTop=_actTop;}
  // Animate the statblock peek only when the previewed combatant actually changes — not on every re-render
  // (toggling reaction, marking a death save, etc. shouldn't visibly refresh the preview) (B128).
  {const pk=body.querySelector(".ca-peek"),pid=pk?pk.dataset.peek:null;if(pk&&pid!==_caPeekId)pk.classList.add("ca-anim");_caPeekId=pid;}
  bindCombatTracker(body,a,e,cb);
  if(PLAYER_MODE)playerModeChrome(body); // claim picker / editing-scope banner (B204 stage 3)
  publishCombatShareSoon(); // if sharing is on, push the updated snapshot to players (debounced; no-ops otherwise)
  if(_pmPreviewOn&&!PLAYER_MODE)stashPreviewSnap(); // keep the local "Preview as player" tab live
  if(combatShareOn()&&combatShareMode()!=="off"&&combatShareWbId())startSharePoll(); // resume the write-back poller after a reload
}
// One-time combat hint (B240): the first time a DM opens a running combat, point at the two least-obvious
// interactions. Dismissed for good via localStorage mf_hint_combat. Hidden in player mode.
function combatHintHTML(){
  if(PLAYER_MODE)return "";
  let seen=true;try{seen=!!localStorage.getItem("mf_hint_combat");}catch(e){}
  if(seen)return "";
  return `<div class="combat-hint" id="combatHint"><span class="ch-txt">Click a name to roll its attack or save. Click HP to apply damage and healing.</span><button class="ch-x" id="combatHintX" type="button" aria-label="Dismiss">✕</button></div>`;
}
// Wire every combat-tracker event handler onto the freshly-rendered DOM (B198 — extracted from
// renderCombat; the markup is built by the combat*HTML helpers, this is purely the binding pass).
function bindCombatTracker(body,a,e,cb){
  bindCombatResizer();
  {const hx=$("#combatHintX");if(hx)hx.addEventListener("click",()=>{try{localStorage.setItem("mf_hint_combat","1");}catch(e){}const h=$("#combatHint");if(h)h.remove();});}
  const titleBtn=$("#combatLoadTitle");if(titleBtn)titleBtn.addEventListener("click",openLoadCombat);
  // Combat notes: collapse to 2 rows when taller, with a more/less toggle (only shown when it overflows).
  {const nt=$(".ct-notes"),mb=$(".ct-notes-more");if(nt&&mb&&nt.scrollHeight>nt.clientHeight+2){mb.hidden=false;mb.addEventListener("click",()=>{mb.textContent=nt.classList.toggle("clamped")?"more":"less";});}}
  {const ed=$("#combatEncDrop");if(ed)ed.addEventListener("click",ev=>{ev.stopPropagation();openSceneEncMenu(ed,a,e);});}
  const addBtn=$("#combatAddBtn");if(addBtn)addBtn.addEventListener("click",()=>openBestiaryPicker(a,e));
  if(!cb)return; // not-started panel has no tracker bindings
  $("#combatPrev").addEventListener("click",()=>combatAdvance(-1));
  $("#combatNext").addEventListener("click",()=>combatAdvance(1));
  {const re=$("#combatRoundEdit");if(re)re.addEventListener("click",ev=>{ev.stopPropagation();openRoundEdit(re);});}
  // CT9-fix: group / sort / filter / roll live in the round-bar tools menu; restore-order is its own chip.
  {const tb=$("#combatTools");if(tb)tb.addEventListener("click",ev=>{ev.stopPropagation();openCombatToolsMenu(tb);});}
  {const sh=$("#combatShare");if(sh)sh.addEventListener("click",ev=>{ev.stopPropagation();openCombatShareDialog();});}
  {const ri=$("#combatRollInit");if(ri)ri.addEventListener("click",rollInitNow);}
  {const ro=$("#combatRestoreOrder");if(ro)ro.addEventListener("click",restoreInitOrder);}
  bindCombatRows($("#combatRows"),combatDragMode(cb),cb);
  // Selection action bar (B120): set status / add effect / damage for all selected.
  {const sb=$("#combatSelBar");if(sb){
    const sel=()=>[...combatSel];
    $("#csbStatus").addEventListener("click",e=>{e.stopPropagation();openSelStatusMenu(e.currentTarget);});
    $("#csbEffect").addEventListener("click",e=>{e.stopPropagation();const s=combatSelInOrder();if(s.length)openCondAdd(s[0].id,e.currentTarget,sel());});
    $("#csbDmg").addEventListener("click",e=>{e.stopPropagation();openSelDmg(e.currentTarget);});
    $("#csbClear").addEventListener("click",()=>{clearCombatSel();renderCombat();});
  }}
  // Click the empty order background to clear the selection.
  {const co=document.querySelector(".combat-order");if(co)co.addEventListener("click",e=>{if(!e.target.closest(".cbt-row,.combat-selbar,.cbt-add")&&clearCombatSel())renderCombat();});}
  // Compact HP control → manage popover (damage/heal, temp, current) (B124).
  body.querySelectorAll("[data-hpmanage]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openHPManage(el.dataset.hpmanage,el);}));
  body.querySelectorAll("[data-initset]").forEach(el=>el.addEventListener("change",()=>setCombatInit(el.dataset.initset,el.value)));
  body.querySelectorAll("[data-cireact]").forEach(el=>{
    el.addEventListener("click",e=>{e.stopPropagation();toggleReaction(el.dataset.cireact);});
    // Hover tooltip (the app's established tail-popover style) explaining the reaction toggle (B122).
    el.addEventListener("mouseenter",()=>{const it=cb.order.find(x=>x.id===el.dataset.cireact);if(!it)return;const up=it.reaction!==false;
      tailPopover(el,`<div class="cr-pop cr-stat"><span class="cr-stat-t">Reaction</span><span class="cr-stat-v ${up?"on":"off"}">${up?"available":"used"}</span></div>`);});
    el.addEventListener("mouseleave",closeTipPop);
  });
  body.querySelectorAll("[data-ciconc]").forEach(el=>{
    el.addEventListener("click",e=>{e.stopPropagation();toggleConcentration(el.dataset.ciconc);});
    el.addEventListener("mouseenter",()=>{const it=cb.order.find(x=>x.id===el.dataset.ciconc);if(!it)return;
      tailPopover(el,`<div class="cr-pop cr-stat"><span class="cr-stat-t">Concentration</span><span class="cr-stat-v ${it.concentration?"on":"off"}">${it.concentration?"on":"off"}</span></div>`);});
    el.addEventListener("mouseleave",closeTipPop);
  });
  // Read-only reaction/concentration indicators (player mode, rows the player doesn't control): state popover
  // on hover/click, no toggle (B233).
  body.querySelectorAll("[data-roreact]").forEach(el=>{
    const show=()=>{const it=cb.order.find(x=>x.id===el.dataset.roreact);if(!it)return;const up=it.reaction!==false;
      tailPopover(el,`<div class="cr-pop cr-stat"><span class="cr-stat-t">Reaction</span><span class="cr-stat-v ${up?"on":"off"}">${up?"available":"used"}</span></div>`);};
    el.addEventListener("mouseenter",show);el.addEventListener("mouseleave",closeTipPop);el.addEventListener("click",e=>{e.stopPropagation();show();});
  });
  body.querySelectorAll("[data-roconc]").forEach(el=>{
    const show=()=>{const it=cb.order.find(x=>x.id===el.dataset.roconc);if(!it)return;
      tailPopover(el,`<div class="cr-pop cr-stat"><span class="cr-stat-t">Concentration</span><span class="cr-stat-v ${it.concentration?"on":"off"}">${it.concentration?"on":"off"}</span></div>`);};
    el.addEventListener("mouseenter",show);el.addEventListener("mouseleave",closeTipPop);el.addEventListener("click",e=>{e.stopPropagation();show();});
  });
  body.querySelectorAll("[data-cimenu]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openCombatRowMenu(el.dataset.cimenu,el);}));
  body.querySelectorAll("[data-addcond]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openCondAdd(el.dataset.addcond,el);}));
  body.querySelectorAll("[data-cinote]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openNoteEdit(el.dataset.cinote,el);}));
  // PC sheet "Edit" → open the full character detail (closing it re-renders combat — see openCharacterDetail).
  body.querySelectorAll("[data-pcedit]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const ctx=loadedCtx();openCharacterDetail(el.dataset.pcedit,ctx?ctx.a.id:null);}));
  // Monster statblock "Edit in Forge" → load the creature in the Forge and switch there.
  body.querySelectorAll("[data-monedit]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const mon=monById(el.dataset.monedit);if(mon)guardedLoad(()=>{loadMonster(mon);switchView("forge");});}));
  // PC sheet chips (ability checks / saves / skills / spell attack) roll like the monster quick-ref chips,
  // attributed to the shown PC via combatRollSrc. Alt-click / right-click opens roll options.
  body.querySelectorAll(".pcs-roll[data-roll]").forEach(el=>{
    el.addEventListener("click",e=>{if(!clickRollOn())return;e.stopPropagation();if(e.altKey){openRollMenu(el);return;}quickRoll(el);});
    el.addEventListener("contextmenu",e=>{if(!clickRollOn())return;e.preventDefault();openRollMenu(el);});
  });
  body.querySelectorAll("[data-rmcond]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const[id,i]=el.dataset.rmcond.split(":");removeCombatCond(id,+i);}));
  // Resource pips: filled pip → spend one, empty pip → restore one.
  body.querySelectorAll("[data-respip]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();
    const[id,ri,i]=el.dataset.respip.split(":"),it=cb.order.find(x=>x.id===id);if(!it)return;const r=it.resources[+ri];if(!r)return;
    r.used=clamp((+i<(r.max-r.used))?r.used+1:r.used-1,0,r.max);saveAdv();renderCombat();}));
  // Click the "Active turn" flag in the peek header → clear the selection and return to the active combatant (B128b).
  {const af=$("#caBackToActive");if(af)af.addEventListener("click",()=>{clearCombatSel();renderCombat();});}
  // Quick-ref ATK / save chips in the active panel header → click rolls 1d20+bonus (Alt-click = options) (B127).
  body.querySelectorAll(".ca-stat-roll[data-roll]").forEach(el=>{
    el.addEventListener("click",e=>{if(!clickRollOn())return;e.stopPropagation();if(e.altKey){openRollMenu(el);return;}quickRoll(el);});
    el.addEventListener("contextmenu",e=>{if(!clickRollOn())return;e.preventDefault();openRollMenu(el);});
  });
  // Hover tooltips (the app's tail-popover style) for the AC chip and the add-effect chips (B127).
  body.querySelectorAll(".ci-ac-chip").forEach(el=>{el.addEventListener("mouseenter",()=>tailPopover(el,`<div class="cr-pop">Armour Class</div>`));el.addEventListener("mouseleave",closeTipPop);});
  body.querySelectorAll(".ci-addcond").forEach(el=>{el.addEventListener("mouseenter",()=>tailPopover(el,`<div class="cr-pop">Add an effect or condition</div>`));el.addEventListener("mouseleave",closeTipPop);});
  body.querySelectorAll(".ci-init-in,.ci-init").forEach(el=>{el.addEventListener("mouseenter",()=>tailPopover(el,`<div class="cr-pop">Initiative</div>`));el.addEventListener("mouseleave",closeTipPop);});
  body.querySelectorAll(".ci-hpbtn").forEach(el=>{el.addEventListener("mouseenter",()=>tailPopover(el,`<div class="cr-pop">Hit points</div>`));el.addEventListener("mouseleave",closeTipPop);});
  // Active-combatant statblock: render the source creature (M swapped) + colour-code, then make it
  // click-to-roll with rolls tagged to the combatant via combatRollSrc (CT4).
  const sbHost=body.querySelector(".ca-sb");
  if(sbHost){const m=monById(sbHost.dataset.sbmon);
    if(m){withM(m,()=>{const pb=pbForCR(m.cr);
        sbHost.innerHTML=sbHeaderHTML(m)+sbAbilityTableHTML(m,pb)+sbMetaHTML(m,pb,xpOf(m))+sbEntriesHTML(m);
        linkSpellFeatures(sbHost);if(ruleFinder)ruleFindRoot(sbHost);else colorizeStatblock(sbHost);});
      bindCombatStatblockRolls(sbHost);}}
}
// Click-to-roll on the active-combatant statblock — mirrors the #statblock handlers (engine.js); the
// roll source is set view-wide via combatRollSrc so quick rolls AND popover rolls tag the combatant.
function bindCombatStatblockRolls(root){
  root.addEventListener("click",ev=>{
    if(!clickRollOn())return;
    const t=ev.target.closest("[data-roll]");
    if(t&&ev.altKey){ev.preventDefault();openRollMenu(t);return;}
    const nm=ev.target.closest(".roll-atkname[data-roll]");if(nm){rollAttackSequence(nm);return;}
    const rt=ev.target.closest(".roll-rchtag[data-roll]");if(rt){quickRoll(rt);return;}
    const rn=ev.target.closest(".roll-rchname[data-roll]");if(rn){rollRechargeSequence(rn);return;}
    if(t)quickRoll(t);
  });
  root.addEventListener("contextmenu",ev=>{const t=ev.target.closest("[data-roll]");if(!t||!clickRollOn())return;ev.preventDefault();openRollMenu(t);});
}
