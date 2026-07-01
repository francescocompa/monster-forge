// Monster Forge — ADVENTURES: adventures, scenes, encounters, combatants, and the encounter budget.
// Loaded as a classic <script> sharing ONE global scope with the other files (data.js, parsers.js,
// core/forge/engine/bestiary/adventures/app — in that order). No imports/exports. See DEVELOPMENT.md.

// Pinned items float to the top of their list while keeping manual order within each group (B78).
// Array.prototype.sort is stable, so this preserves the underlying drag/move order otherwise.
function pinSort(arr){return arr.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));}
// At narrow widths the list + detail share one column; the back button forces the LIST to show without
// deselecting the adventure (selAdv stays so re-entering the tab reopens it). Reset on select. B79.
let advListView=false;
// A Move submenu with no-op options disabled: top/up greyed when already first, down/bottom when last,
// and the whole submenu disabled when the item is alone in its group. `group` is the displayed
// (pinSorted) sibling order, matching the move* functions. B79.
function moveSubmenuHTML(menuKey,dataAttr,id,group,item){
  const n=group.length,i=group.indexOf(item),atTop=i<=0,atBot=i>=n-1,only=n<=1;
  const b=(where,label,dis)=>`<button data-${dataAttr}="${id}:${where}"${dis?" disabled":""}>${label}</button>`;
  return `<div class="menu-wrap submenu-wrap${only?" disabled":""}">
    <button class="submenu-trigger" data-menu="${menuKey}-${id}"${only?" disabled":""}>Move<span class="submenu-arrow">▸</span></button>
    <div class="menu submenu" id="menu-${menuKey}-${id}">
      ${b("top","Move to top",atTop)}${b("up","Move up",atTop)}${b("down","Move down",atBot)}${b("bottom","Move to bottom",atBot)}
    </div>
  </div>`;
}
function renderAdvList(){
  const box=$("#advItems");
  const active=pinSort(state.adv.filter(a=>!a.archived)),arch=pinSort(state.adv.filter(a=>a.archived));
  // Always open an adventure when entering the tab: restore the last-opened one, else the most recent.
  if(!curAdv()){let sa="";try{sa=localStorage.getItem("mf_seladv")||"";}catch(e){}
    state.selAdv=(sa&&state.adv.some(a=>a.id===sa&&!a.archived))?sa:(active[0]?active[0].id:null);}
  if(state.selAdv){try{localStorage.setItem("mf_seladv",state.selAdv);}catch(e){}}
  // Em dash when the adventure is still untitled (the default name), else up to 3 initials (B66).
  const aiIni=a=>`<span class="ai-ini">${a.name&&a.name.trim()?esc(advInitials(a.name)):"—"}</span>`;
  const aiPin=a=>a.pinned?`<span class="ai-pin" title="Pinned">${PIN_SVG}</span>`:"";
  let html=active.map(a=>`<div class="ai ${a.id===state.selAdv?"sel":""}${a.pinned?" pinned":""}" data-adv="${a.id}" draggable="true" title="${esc(advDName(a))}"${aiStyle(a)}>${aiIni(a)}<div class="ai-info"><div class="nm">${advDot(a.id,a.color)}${esc(advDName(a))}</div><div class="dt">${advPartyLabel(a)} · ${a.encounters.filter(e=>!e.archived).length} enc.</div></div>${aiPin(a)}${aiMenu(a)}</div>`).join("")||`<div class="hint" style="padding:8px">No adventures yet. Add one with ＋ New adventure above.</div>`;
  if(arch.length)html+=`<div class="hint" style="padding:6px 8px 2px;font-size:11px">Archived</div>`+arch.map(a=>`<div class="ai arch ${a.id===state.selAdv?"sel":""}${a.pinned?" pinned":""}" data-adv="${a.id}" draggable="true" title="${esc(advDName(a))}"${aiStyle(a)}>${aiIni(a)}<div class="ai-info"><div class="nm">${advDot(a.id,a.color)}${esc(advDName(a))}</div></div>${aiPin(a)}${aiMenu(a)}</div>`).join("");
  box.innerHTML=html;
  // Select on a card click (anywhere but the colour dot / kebab). Right-click opens a compact menu —
  // this is the only way to reach an adventure's actions in the collapsed colour-card mode (B63).
  box.querySelectorAll(".ai").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest("[data-advcolor],.menu-wrap"))return;advListView=false;state.selAdv=el.dataset.adv;closeAdvDrawer();renderAdvList();}));
  box.querySelectorAll(".ai").forEach(el=>el.addEventListener("contextmenu",e=>{e.preventDefault();e.stopPropagation();const a=state.adv.find(x=>x.id===el.dataset.adv);if(a)openAdvCardMenu(el,a);}));
  box.querySelectorAll("[data-advcolor]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openAdvColorMenu(el,el.dataset.advcolor);}));
  box.querySelectorAll("[data-aim-dup]").forEach(el=>el.addEventListener("click",()=>{const src=state.adv.find(x=>x.id===el.dataset.aimDup);if(!src)return;const c=normalizeAdv(JSON.parse(JSON.stringify(src)));c.id=uid();c.name=advDName(src)+" (copy)";c.encounters=c.encounters.map(e=>Object.assign({},e,{id:uid()}));state.adv.splice(state.adv.indexOf(src)+1,0,c);advListView=false;state.selAdv=c.id;saveAdv();renderAdvList();}));
  box.querySelectorAll("[data-aim-arch]").forEach(el=>el.addEventListener("click",()=>{const src=state.adv.find(x=>x.id===el.dataset.aimArch);if(!src)return;src.archived=!src.archived;saveAdv();renderAdvList();}));
  box.querySelectorAll("[data-aim-del]").forEach(el=>el.addEventListener("click",()=>{const aId=el.dataset.aimDel;const src=state.adv.find(x=>x.id===aId);if(!src)return;confirmModal(`Delete "${advDName(src)}"?`,()=>{state.adv=state.adv.filter(x=>x.id!==aId);if(state.selAdv===aId)state.selAdv=null;saveAdv();renderAdvList();});}));
  box.querySelectorAll("[data-aim-pin]").forEach(el=>el.addEventListener("click",()=>{const src=state.adv.find(x=>x.id===el.dataset.aimPin);if(!src)return;src.pinned=!src.pinned;saveAdv();renderAdvList();}));
  box.querySelectorAll("[data-aim-move]").forEach(el=>el.addEventListener("click",()=>{const[id,where]=el.dataset.aimMove.split(":");moveAdvTo(id,where);}));
  bindAdvDrag(box);
  const btn=$("#newAdv");if(btn){btn.className=`btn ${state.adv.length?"ghost":"primary"} sm`;btn.style.removeProperty("width");}
  const lay=$(".adv-layout");if(lay){lay.classList.toggle("detail-open",!!curAdv()&&!advListView);lay.classList.toggle("adv-mini",advMini());}
  renderAdvDetail();
}
// Collapsed adventures column: compact menu reachable by right-click on a colour card (B63).
function openAdvCardMenu(anchor,a){
  const grp=pinSort(state.adv.filter(x=>!!x.archived===!!a.archived)),i=grp.indexOf(a),atTop=i<=0,atBot=i>=grp.length-1;
  const mv=(where,label,dis)=>`<button class="popitem" data-acm="${where}"${dis?" disabled":""}>${label}</button>`;
  const moveBlock=grp.length<=1?"":`<div class="popsep"></div>${mv("top","Move to top",atTop)}${mv("up","Move up",atTop)}${mv("down","Move down",atBot)}${mv("bottom","Move to bottom",atBot)}`;
  const p=showPopover(anchor,`<button class="popitem" data-acm="open">Open</button><button class="popitem" data-acm="pin">${a.pinned?"Unpin":"Pin to top"}</button>${moveBlock}<div class="popsep"></div><button class="popitem" data-acm="color">Colour</button><button class="popitem" data-acm="dup">Duplicate</button><button class="popitem" data-acm="arch">${a.archived?"Unarchive":"Archive"}</button><div class="popsep"></div><button class="popitem danger" data-acm="del">Delete</button>`);
  p.querySelectorAll("[data-acm]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const act=b.dataset.acm;
    if(act==="color"){closePopover();openAdvColorMenu(anchor,a.id);return;}
    closePopover();
    if(act==="open"){advListView=false;state.selAdv=a.id;renderAdvList();}
    else if(act==="pin"){a.pinned=!a.pinned;saveAdv();renderAdvList();}
    else if(["top","up","down","bottom"].includes(act)){moveAdvTo(a.id,act);}
    else if(act==="dup"){const c=normalizeAdv(JSON.parse(JSON.stringify(a)));c.id=uid();c.name=advDName(a)+" (copy)";c.encounters=c.encounters.map(e=>Object.assign({},e,{id:uid()}));advListView=false;state.selAdv=c.id;saveAdv();renderAdvList();}
    else if(act==="arch"){a.archived=!a.archived;saveAdv();renderAdvList();}
    else if(act==="del"){confirmModal(`Delete "${a.name}"?`,()=>{state.adv=state.adv.filter(x=>x.id!==a.id);if(state.selAdv===a.id)state.selAdv=null;saveAdv();renderAdvList();});}
  }));
}
// Adventure reorder (menu + drag). Reorders within the same archived/active group; pinned cards still
// float to the top at render. Mirrors the encounter move/reorder helpers (B78).
function setAdvGroupOrder(archived,group){let k=0;state.adv.forEach((x,i)=>{if(!!x.archived===!!archived)state.adv[i]=group[k++];});}
function moveAdvTo(id,where){
  const a=state.adv.find(x=>x.id===id);if(!a)return;
  const group=pinSort(state.adv.filter(x=>!!x.archived===!!a.archived)),pos=group.indexOf(a);
  let tgt=where==="up"?pos-1:where==="down"?pos+1:where==="top"?0:group.length-1;
  tgt=clamp(tgt,0,group.length-1);if(tgt===pos)return;
  group.splice(pos,1);group.splice(tgt,0,a);setAdvGroupOrder(a.archived,group);saveAdv();renderAdvList();
}
function reorderAdvRel(fromId,toId,after){
  if(!fromId||!toId||fromId===toId)return;
  const from=state.adv.find(x=>x.id===fromId),to=state.adv.find(x=>x.id===toId);
  if(!from||!to||!!from.archived!==!!to.archived)return;
  const group=pinSort(state.adv.filter(x=>!!x.archived===!!from.archived));
  group.splice(group.indexOf(from),1);let idx=group.indexOf(to);if(after)idx++;group.splice(idx,0,from);
  setAdvGroupOrder(from.archived,group);saveAdv();renderAdvList();
}
let dragAdvId=null,dropAdv=null;
function clearAdvDropMarks(){$$("#advItems .ai.drop-before,#advItems .ai.drop-after").forEach(x=>x.classList.remove("drop-before","drop-after"));}
function bindAdvDrag(box){
  box.querySelectorAll(".ai[data-adv]").forEach(ai=>{
    ai.addEventListener("dragstart",ev=>{
      if(ev.target.closest(".menu-wrap,[data-advcolor]")){ev.preventDefault();return;}
      dragAdvId=ai.dataset.adv;dropAdv=null;ev.dataTransfer.effectAllowed="move";
      try{ev.dataTransfer.setData("text/plain",ai.dataset.adv);}catch(_){}
      requestAnimationFrame(()=>ai.classList.add("dragging"));
    });
    ai.addEventListener("dragend",()=>{ai.classList.remove("dragging");clearAdvDropMarks();dragAdvId=null;dropAdv=null;});
    ai.addEventListener("dragover",ev=>{
      if(!dragAdvId||dragAdvId===ai.dataset.adv)return;
      const from=state.adv.find(x=>x.id===dragAdvId),to=state.adv.find(x=>x.id===ai.dataset.adv);
      if(!from||!to||!!from.archived!==!!to.archived)return;
      ev.preventDefault();
      const r=ai.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2;
      clearAdvDropMarks();ai.classList.add(after?"drop-after":"drop-before");
      dropAdv={id:ai.dataset.adv,after};
    });
    ai.addEventListener("drop",ev=>{ev.preventDefault();const dt=dropAdv,id=dragAdvId;clearAdvDropMarks();if(dt)reorderAdvRel(id,dt.id,dt.after);});
  });
}
function advMini(){try{return localStorage.getItem("mf_advmini")==="1";}catch(e){return false;}}
function closeAdvDrawer(){const lay=$(".adv-layout");if(lay)lay.classList.remove("adv-drawer");}
{const sc=$("#advScrim");if(sc)sc.addEventListener("click",closeAdvDrawer);}
$("#newAdv").addEventListener("click",()=>{const a=normalizeAdv({id:uid(),name:"",notes:"",notesOn:notesDefault("adventure"),encounters:[]});state.adv.unshift(a);advListView=false;state.selAdv=a.id;saveAdv();renderAdvList();});
function curAdv(){return state.adv.find(a=>a.id===state.selAdv);}
// The party is the adventure's roster (B142): size = member count, levels = each character's Level field
// (unset → 1). The XP budget is the sum of every member's per-level Low/Moderate/High threshold.
function charLevel(c){const v=c&&charFieldVal(c,"level");return (v===""||v==null)?1:clamp(Number(v)||1,1,20);}
function advPartyLevels(a){return (a.party||[]).map(rid=>{const c=rosterById(rid);return c?charLevel(c):1;});}
function baseBudget(a){const lv=advPartyLevels(a);return [0,1,2].map(di=>lv.reduce((s,l)=>s+(BUDGET[clamp(l,1,20)]||[0,0,0])[di],0));}
function advPartyLabel(a){const lv=advPartyLevels(a);if(!lv.length)return "no party";const set=[...new Set(lv)];return set.length===1?`${lv.length}× lvl ${set[0]}`:`${lv.length} PCs`;}
function monOf(c){return state.lib.find(x=>x.id===c.monsterId);}
// How many encounters (across every adventure) reference this bestiary monster — used to warn before a delete
// would orphan those combatants (they'd resolve to "?" / 0 XP).
function monsterUsage(id){let n=0;(state.adv||[]).forEach(a=>(a.encounters||[]).forEach(e=>{if((e.combatants||[]).some(c=>c.type==="monster"&&c.monsterId===id))n++;}));return n;}
// Before a bestiary monster is deleted, stamp its name onto every combatant that references it so the
// now-orphaned rows can show what they were ("⚠ Goblin — deleted") and stay re-linkable (B195).
function markOrphanedCombatants(id,lostName){(state.adv||[]).forEach(a=>(a.encounters||[]).forEach(e=>(e.combatants||[]).forEach(c=>{if(c.type==="monster"&&c.monsterId===id&&!c._lostName)c._lostName=lostName||"";})));}
function addMonsterCombatant(enc,monsterId){
  const cid=uid();
  enc.combatants.push({type:"monster",id:cid,monsterId,nickname:"",count:1,faction:state.settings.defaults.faction});
  const m=state.lib.find(x=>x.id===monsterId);
  if(m&&m.lair&&m.lair.on&&(m.lair.items||[]).some(it=>it.name||it.text)){
    const lines=[];
    if(m.lair.intro)lines.push(applyRefsFor(m,m.lair.intro));
    m.lair.items.filter(it=>it.name||it.text).forEach(it=>lines.push(`${it.name?it.name+": ":""}${applyRefsFor(m,it.text)}`));
    enc.combatants.push({type:"event",id:uid(),name:`${m.name}: Lair Action`,init:"20",text:lines.join("\n"),lairFor:cid});
  }
  return cid;
}
function combatCR(c){return c.type==="monster"?(monOf(c)?monOf(c).cr:null):c.type==="quick"?c.cr:null;}
// Per-creature XP for the budget. MCDM minions use the special low minion-XP table (so a horde
// counts fairly); everyone else uses standard CR XP. `count` multiplies either way.
// `c.minion` is a per-combatant override (set via the row kebab "Turn into minion", B172) — when present it
// wins; otherwise a monster inherits its statblock's minion flag and a quick combatant defaults to non-minion.
function combatIsMinion(c){if(c.minion!=null)return !!c.minion;return c.type==="monster"?!!(monOf(c)&&monOf(c).minion):false;}
function combatXPEach(c){if(c.type==="monster"){const m=monOf(c);if(!m)return 0;return combatIsMinion(c)?(MINION_XP[m.cr]??0):xpOf(m);}const cr=combatCR(c);if(cr==null)return 0;return (combatIsMinion(c)?MINION_XP[cr]:CR_XP[cr])||0;}
function combatXP(c){return combatXPEach(c)*Number(c.count||1);}
const MINION_NOTE="MCDM minion: a weak foe that drops at any damage and counts as reduced “minion XP” toward the budget.";
function encBudget(adv,e){
  const base=baseBudget(adv);const add=[0,0,0];
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
  if(!a){setCrumbs(["Adventures"]);d.innerHTML=`<div class="empty-state">Select an adventure on the left, or create one with ＋ New adventure.</div>`;return;}
  setCrumbs(["Adventures",advDName(a)],()=>{const lay=$(".adv-layout");if(lay)lay.classList.toggle("adv-drawer");});
  d.innerHTML=`<div class="adv-topbar" data-advcolor="${a.id}" title="Adventure colour"${a.color?` style="background:linear-gradient(90deg,${a.color},color-mix(in srgb,${a.color} 55%,#000))"`:""}></div>
    <div class="adv-detail-body">
    <div class="col-head"><div class="ch-left"><button class="adv-back" id="advBack" title="Adventures" aria-label="Open the adventure list">${ADV_TAB_SVG}</button><h2 contenteditable="true" id="advName" data-ph="New Adventure" style="outline:none">${esc(a.name)}</h2></div>
    <div class="menu-wrap" style="flex:none"><button class="kebab" data-menu="adv-opts" title="Adventure options">⋯</button>
    <div class="menu" id="menu-adv-opts">
      <button id="advToggleNotes">${a.notesOn?"Remove notes":"Add notes"}</button>
      <div class="sep"></div>
      <button id="advPin">${a.pinned?"Unpin":"Pin to top"}</button>
      <button id="advDuplicate">Duplicate adventure</button>
      <button id="advArchive">${a.archived?"Unarchive":"Archive"} adventure</button>
      <div class="sep"></div>
      <button class="danger" id="delAdv">Delete adventure</button>
    </div></div></div>
    <div id="advInfoWrap">
    ${a.notesOn?`<label class="f advnotes">Adventure notes<textarea id="advNotes" placeholder="Premise, hooks, party goals, open threads…">${esc(a.notes||"")}</textarea></label>`:""}
    <div class="section-label" id="partyHead"><span>Party roster${a.party.length?` <span class="pc-count2">${a.party.length}</span>`:""}</span><button class="lvlup-btn" id="partyLvlUp" title="Level up the party">${ARROW_TREND_UP}<span class="lvlup-txt">Level Up</span></button></div>
    <div id="partyWrap"></div>
    </div>
    <div class="section-label">Scenes <span class="sl-acts"><div class="ctrl-icons" id="encCtrlIcons"></div></span></div>
    <div class="ctrl-chips" id="encChips"></div>
    <div id="encList"></div>
    <div class="fab-split menu-wrap" id="encFab">
      <button class="btn primary sm" id="addEnc" style="width:auto">＋ Encounter</button>
      <button class="kebab split-caret" data-menu="encfab" title="More encounter actions" aria-label="More encounter actions">▾</button>
      <div class="menu" id="menu-encfab">
        <button id="encAddScene">＋ Scene</button>
        <button id="encImport">⤵ Import from another adventure</button>
        <div class="sep"></div>
        <button id="encArchiveAll">Archive all encounters</button>
        <button class="danger" id="encClearAll">Clear all encounters</button>
      </div>
    </div>
    <div id="archWrap"></div>
    </div>`;
  // Narrow widths: the adventure list is an off-canvas drawer; this button slides it in/out over the
  // detail (the main app rail is already collapsed to the burger here, so there's no sidebar conflict).
  $("#advBack").addEventListener("click",()=>{const lay=$(".adv-layout");if(lay)lay.classList.toggle("adv-drawer");});
  d.querySelectorAll("[data-advcolor]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openAdvColorMenu(el,el.dataset.advcolor);}));
  const nm=$("#advName");nm.addEventListener("blur",()=>{a.name=nm.textContent.trim();saveAdv();renderAdvList();});
  $("#delAdv").addEventListener("click",()=>confirmModal(`Delete "${advDName(a)}" and its encounters?`,()=>{state.adv=state.adv.filter(x=>x.id!==a.id);state.selAdv=null;saveAdv();renderAdvList();}));
  $("#advPin").addEventListener("click",()=>{a.pinned=!a.pinned;saveAdv();renderAdvList();});
  $("#advDuplicate").addEventListener("click",()=>{const c=normalizeAdv(JSON.parse(JSON.stringify(a)));c.id=uid();c.name=advDName(a)+" (copy)";c.encounters=c.encounters.map(e=>Object.assign({},e,{id:uid()}));state.adv.splice(state.adv.indexOf(a)+1,0,c);state.selAdv=c.id;saveAdv();renderAdvList();});
  $("#advArchive").addEventListener("click",()=>{a.archived=!a.archived;saveAdv();renderAdvList();});
  $("#advToggleNotes").addEventListener("click",()=>{a.notesOn=!a.notesOn;if(!a.notesOn)a.notes="";saveAdv();renderAdvDetail();});
  {const an=$("#advNotes");if(an)an.addEventListener("input",e=>{a.notes=e.target.value;saveAdv();});}
  $("#addEnc").addEventListener("click",()=>{const e=blankEncounter();a.encounters.push(e);a._focusEnc=e.id;saveAdv();renderEncList(a);revealFocusedEnc();});
  $("#encAddScene").addEventListener("click",()=>addScene(a));
  $("#encImport").addEventListener("click",()=>openImportEnc(a));
  $("#encArchiveAll").addEventListener("click",()=>{const live=a.encounters.filter(e=>!encArchived(a,e));if(!live.length)return;confirmModal(`Archive all ${live.length} active encounter${live.length>1?"s":""}?`,()=>{live.forEach(e=>e.archived=true);saveAdv();renderAdvDetail();});});
  $("#encClearAll").addEventListener("click",()=>{if(!a.encounters.length)return;confirmModal(`Delete all ${a.encounters.length} encounter${a.encounters.length>1?"s":""} and clear every scene? This cannot be undone.`,()=>{a.encounters=[];a.scenes=[];saveAdv();renderAdvDetail();});});
  bindCtrlIcons($("#encCtrlIcons"),encCtrl,ENC_DESC,()=>renderEncList(a));
  {const lu=$("#partyLvlUp");if(lu)lu.addEventListener("click",()=>levelUpParty(a));}
  renderParty(a);renderEncList(a);
}
// Whether a notes field is added to a newly-created item, per Settings (B65).
function notesDefault(kind){return !!(state.settings&&state.settings.notes&&state.settings.notes[kind]);}
function blankEncounter(sceneId){return {id:uid(),name:"",archived:false,status:"draft",notes:"",notesOn:notesDefault("encounter"),sceneId:sceneId||null,combatants:[]};}
// Effective lifecycle status: archived (the operative flag) wins, else the stored status. Starting a combat
// sets status to "active" explicitly (runCombat/renderCombat); ending one sets "completed" (endCombat) —
// but the status itself is always freely user-editable afterward with no effect on the live combat (B246;
// previously this re-derived "active" from e.combat.active on every read, so a manually-picked status never
// stuck as long as any combat had ever been started — that flag never went false again after B162 removed
// the old Start/End FAB).
function encStatus(e){return e.archived?"archived":(e.status||"draft");}
function applyEncStatus(e,st){if(st==="archived"){e.archived=true;}else{e.archived=false;e.status=st;}}
function setEncStatus(a,e,st){applyEncStatus(e,st);saveAdv();renderEncList(a);} // renderEncList (not renderAdvDetail) so the page keeps its scroll position (B177)
// The Resume button's dropdown (B246): End combat (stop without wiping — see endCombat in combat.js) and
// Reset & restart (rebuild fresh — see restartCombat), for when the DM doesn't want to open the combat tab
// just to do either. Only rendered while a combat is live (see the encounter card's start-combat-more button).
function openStartCombatMenu(a,e,anchor){
  if(!e||!e.combat)return;
  const p=showPopover(anchor,`<button class="popitem" data-scmore="end">End combat</button>
    <div class="popsep"></div>
    <button class="popitem danger" data-scmore="reset">Reset &amp; restart</button>`);
  p.querySelectorAll("[data-scmore]").forEach(b=>b.addEventListener("click",()=>{closePopover();
    if(b.dataset.scmore==="end")endCombat(a,e);else resetCombatFromCard(a,e);}));
}
// `after` (optional) overrides the default re-render — the load popup passes its own redraw (CT7c).
function openEncStatusMenu(a,e,anchor,after){
  if(!e)return;const cur=encStatus(e);
  const p=showPopover(anchor,ENC_STATUS_MENU.map(s=>`<button class="popitem${s===cur?" on":""}" data-es="${s}">${ENC_STATUS_LABEL[s]}</button>`).join(""));
  p.querySelectorAll("[data-es]").forEach(b=>b.addEventListener("click",()=>{closePopover();if(after){applyEncStatus(e,b.dataset.es);saveAdv();after();}else setEncStatus(a,e,b.dataset.es);}));
}
// Small dimmed folder glyph next to scene names in the load popup (CT7c).
// Quick / event combatant adds (moved off the encounter card into the Add-combatant picker footer, CT6).
function addQuickCombatant(a,e){if(!e)return;a._focusEnc=e.id;e.combatants.push({type:"quick",id:uid(),nickname:"",cr:"1",count:1,faction:state.settings.defaults.faction});afterCombatantAdded(a,e);}
function addEventCombatant(a,e){if(!e)return;a._focusEnc=e.id;e.combatants.push({type:"event",id:uid(),name:"",init:"",text:""});afterCombatantAdded(a,e);}
function addScene(a){const s={id:uid(),name:"",collapsed:false,notes:"",notesOn:notesDefault("scene"),archived:false};a.scenes.push(s);saveAdv();renderEncList(a);document.querySelector(`#advDetail .scene[data-scene="${s.id}"]`)?.scrollIntoView({block:"nearest"});}
// Display name: an empty (untitled) item shows its default label everywhere except its own input,
// which keeps the placeholder so there's nothing to clear (B66).
function advDName(a){return (a&&a.name&&a.name.trim())||"New Adventure";}
function sceneDName(s){return (s&&s.name&&s.name.trim())||"New Scene";}
function encDName(e){return (e&&e.name&&e.name.trim())||"New Encounter";}

// The encounter most recently edited (focused) gets a highlight. Editing = focusing any field inside
// it (delegated) or adding a combatant; we update classes in place so no re-render is needed.
function setEncFocus(a,encId){if(!a||a._focusEnc===encId&&document.querySelector("#advDetail .enc.focused"))return;a._focusEnc=encId;
  $$("#advDetail .enc.focused").forEach(x=>x.classList.remove("focused"));
  const el=document.querySelector(`#advDetail .enc[data-enc="${encId}"]`);if(el)el.classList.add("focused");}
// After an add (which re-renders via renderEncList to keep scroll), bring the new — focused — encounter
// into view so it isn't left off-screen below the fold (B177).
function revealFocusedEnc(){const el=document.querySelector("#advDetail .enc.focused");if(el)el.scrollIntoView({block:"nearest"});}
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
      <input class="scene-name" value="${esc(s.name)}" data-scenename="${s.id}" placeholder="New Scene">
      <span class="scene-count">${encs.length} enc.</span>
      ${s.pinned?`<span class="ai-pin" title="Pinned">${PIN_SVG}</span>`:""}
      <div class="menu-wrap">
        <button class="kebab" data-menu="scene-${s.id}" title="Scene options">⋯</button>
        <div class="menu" id="menu-scene-${s.id}">
          <button data-scenepin="${s.id}">${s.pinned?"Unpin":"Pin to top"}</button>
          ${moveSubmenuHTML("scenemove","scenemove",s.id,pinSort((a.scenes||[]).filter(x=>!!x.archived===!!s.archived)),s)}
          <div class="sep"></div>
          <button data-scenenotes-tog="${s.id}">${s.notesOn?"Remove notes":"Add notes"}</button>
          <button data-scenearch="${s.id}">${s.archived?"Unarchive scene":"Archive scene"}</button>
          <div class="sep"></div>
          <button class="danger" data-scenedel="${s.id}">Delete scene</button>
        </div>
      </div>
    </div>`;
  if(s.collapsed)return `<div class="scene${s.archived?" arch":""} collapsed" data-scene="${s.id}" draggable="true">${head}</div>`;
  const body=`<div class="scene-body">
      ${s.notesOn?`<label class="f scenenotes"><textarea data-scenenotes="${s.id}" placeholder="Scene notes: premise, transitions, pacing…">${esc(s.notes||"")}</textarea></label>`:""}
      <div class="scene-droparea" data-scenedrop="${s.id}">
        ${encs.map(e=>encHTML(a,e)).join("")||`<div class="hint scene-empty">No encounters in this scene yet.</div>`}
        ${s.archived?"":`<button class="addbtn scene-add" data-sceneadd="${s.id}" style="width:100%">＋ Encounter in this scene</button>`}
      </div>
    </div>`;
  return `<div class="scene${s.archived?" arch":""}" data-scene="${s.id}" draggable="true">${head}${body}</div>`;
}
function renderEncList(a){
  const box=$("#encList");if(!box)return;
  if(!box._focusBound){box._focusBound=true;box.addEventListener("focusin",e=>{const enc=e.target.closest(".enc[data-enc]");if(enc)setEncFocus(a,enc.dataset.enc);});}
  renderCtrlChips($("#encChips"),encCtrl,ENC_DESC,()=>renderEncList(a));
  const scenes=a.scenes||[];
  // Pinned scenes / encounters float to the top of their group (B78).
  const activeScenes=pinSort(scenes.filter(s=>!s.archived)),archScenes=scenes.filter(s=>s.archived);
  const visible=encApply(a,a.encounters);                       // filtered + sorted view
  const inScene=sid=>pinSort(visible.filter(e=>!e.archived&&e.sceneId===sid));
  const sceneAdd=`<button class="addbtn" id="addScene" style="width:100%;margin-top:2px">＋ Scene</button>`;
  if(activeScenes.length){
    const ungrouped=pinSort(visible.filter(e=>!e.archived&&!activeScenes.some(s=>s.id===e.sceneId)&&!sceneArchived(a,e.sceneId)));
    box.innerHTML=activeScenes.map(s=>sceneHTML(a,s,inScene(s.id))).join("")
      +sceneAdd
      +`<div class="scene-loose" data-scenedrop="">${ungrouped.length?`<div class="scene-loose-lbl">Ungrouped</div>${ungrouped.map(e=>encHTML(a,e)).join("")}`:""}</div>`;
  }else{
    const active=pinSort(visible.filter(e=>!e.archived));
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
// Fixed Low/Moderate/High threshold markers on the XP bar (High pinned to the right end; Low/Mod scaled
// to the High cap). Each carries its XP for a hover popover. The draggable target marker snaps to these.
// Budget bar uses a Low→High scale (B170): Low pinned at the left edge, High at the right, Moderate placed
// proportionally between them. The three threshold notches are neutral + clear; colour rides the fill only.
function budModPct(bud){const span=bud[2]-bud[0];return span>0?clamp((bud[1]-bud[0])/span*100,0,100):50;}
function budSpentPct(spent,bud){const span=bud[2]-bud[0];return span>0?clamp((spent-bud[0])/span*100,0,100):(spent>=bud[2]?100:0);}
// Difficulty-tinted fill: a desaturated hue per band (slate→green→amber→coral→red) so the bar colour agrees
// with the difficulty pill; the threshold notches stay neutral (B173).
function budFillColor(cls){return {trivial:"#39495c",low:"#4a6b52",moderate:"#6e5a36",high:"#8a4d42",over:"#a8503e"}[cls]||"#39495c";}
function budMarksHTML(bud){
  const m=(lbl,xp,cls,style)=>`<div class="bud-mark ${cls}" style="${style}" data-budtip="${lbl} · ${xp.toLocaleString()} XP"></div>`;
  return m("Low",bud[0],"bm-start","left:0")
    +m("Moderate",bud[1],"bm-mid","left:"+budModPct(bud)+"%")
    +m("High",bud[2],"bm-end","right:0");
}
// Patch an encounter's derived numbers (difficulty pill, budget bar, target marker, read-out, and
// each combatant's XP) in place — used on count/target edits so we never rebuild (and refocus) the input.
function updateEncMeta(a,e){
  const root=document.querySelector(`#advDetail .enc[data-enc="${e.id}"]`);if(!root)return;
  const bud=encBudget(a,e),spent=encSpent(e),[cls,label]=diffOf(spent,bud);
  const pct=budSpentPct(spent,bud);
  const pill=root.querySelector(".budget-top .pill")||root.querySelector(".eh .pill");if(pill){pill.className="pill "+cls;pill.textContent=label;}
  const f=root.querySelector(".budget .fill");if(f){f.style.width=pct+"%";f.style.background=budFillColor(cls);} // colour rides the fill; notches stay neutral
  e.combatants.forEach(c=>{const x=root.querySelector(`.cbt[data-cid="${c.id}"] .xpv`);if(x)x.textContent=combatXP(c).toLocaleString()+" XP";});
}
function encHTML(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[cls,label]=diffOf(spent,bud);
  const pct=budSpentPct(spent,bud);
  const head=`<div class="eh">
      <button class="enc-collapse ${e.collapsed?"closed":""}" data-enccollapse="${e.id}" title="${e.collapsed?"Expand":"Collapse"}" aria-label="${e.collapsed?"Expand":"Collapse"}"><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <input class="enm" value="${esc(e.name)}" data-encname="${e.id}" placeholder="New Encounter">
      <button class="enc-status st-${encStatus(e)}" data-encstatus="${e.id}" title="Encounter status">${ENC_STATUS_LABEL[encStatus(e)]}</button>
      ${e.collapsed?`<span class="pill ${cls}">${label}</span>`:""}
      ${e.pinned?`<span class="ai-pin" title="Pinned">${PIN_SVG}</span>`:""}
      <div class="menu-wrap">
        <button class="kebab" data-menu="enc-${e.id}" title="More">⋯</button>
        <div class="menu" id="menu-enc-${e.id}">
          <button data-encpin="${e.id}">${e.pinned?"Unpin":"Pin to top"}</button>
          ${moveSubmenuHTML("encmove","encmove",e.id,pinSort(a.encounters.filter(x=>x.archived===e.archived)),e)}
          <div class="sep"></div>
          <button data-encnotes-tog="${e.id}">${e.notesOn?"Remove notes":"Add notes"}</button>
          <button data-pushenc="${e.id}">Copy encounter for Claude</button>
          <div class="sep"></div>
          <button${e.combatants.length?"":" disabled"} data-encclear="${e.id}">Clear encounter</button>
          <button class="danger" data-encdel="${e.id}">Delete</button>
        </div>
      </div>
    </div>`;
  const foc=e.id===a._focusEnc?" focused":"";
  if(e.collapsed)return `<div class="enc ${e.archived?"arch":""} collapsed${foc}" data-enc="${e.id}" draggable="true">${head}</div>`;
  return `<div class="enc ${e.archived?"arch":""}${foc}" data-enc="${e.id}" draggable="true">
    ${head}
    <div class="budget">
      <div class="budget-top">
        <div class="bartrack">
          <div class="bar"><div class="fill" style="width:${pct}%;background:${budFillColor(cls)}"></div></div>
          ${budMarksHTML(bud)}
        </div>
        <span class="pill ${cls}">${label}</span>
      </div>
    </div>
    ${e.notesOn?`<label class="f encnotes"><textarea data-encnotes="${e.id}" placeholder="Battlefield notes: terrain, light, hazards, special rules…">${esc(e.notes||"")}</textarea></label>`:""}
    <div data-combat="${e.id}">${e.combatants.map(c=>combatHTML(e,c)).join("")||'<div class="hint" style="margin:4px 0">No combatants yet.</div>'}</div>
    <div class="addrow">
      <button class="addbtn" data-addmon="${e.id}" style="flex:1">＋ Add combatant</button>
      <div class="start-combat-wrap">
        <button class="start-combat${e.combat?" resume":""}" data-startcombat="${e.id}" title="${e.combat?"Resume combat":"Start combat"}" aria-label="${e.combat?"Resume combat":"Start combat"}">${SWORDS_SVG}<span class="sc-label">${e.combat?"Resume":"Start combat"}</span></button>
        ${e.combat?`<button class="start-combat-more" data-startmore="${e.id}" title="More combat options" aria-label="More combat options">${FS_CHEVRON}</button>`:""}
      </div>
    </div>
  </div>`;
}
function combatHTML(e,c){
  if(c.type==="event")return `<div class="cbt ev" data-cid="${c.id}"><div class="top"><input class="nick" placeholder="Event / entity name" data-cf="${c.id}:name" value="${esc(c.name||"")}"><input type="text" placeholder="init / count 20" data-cf="${c.id}:init" value="${esc(c.init||"")}" style="width:120px;flex:none"><button class="iconbtn" data-cdel="${c.id}">✕</button></div><textarea placeholder="Description, e.g. recurring battlefield effect on this initiative count" data-cf="${c.id}:text">${esc(c.text||"")}</textarea></div>`;
  const fc=facClass(c.faction);const xp=combatXP(c);
  // Faction reads as a chip (the native select is styled like the app's pills — consistent chip language, B170).
  const facSel=`<select class="fac ${fc}" data-cf="${c.id}:faction" aria-label="Faction">${FACTIONS.map(f=>`<option ${f===c.faction?"selected":""}>${f}</option>`).join("")}</select>`;
  // Count leads on the left as a large ghost number with a trailing dim × (default 1 shows dimmed); the
  // statblock / CR control drops to a quiet subtitle under the name; XP sits right with a hover-only remove.
  const cnt=`<div class="cbt-cnt"><input class="cnt" type="number" min="1" placeholder="1" value="${c.count===1?"":c.count}" data-cf="${c.id}:count" aria-label="Count"><span class="cbt-x">×</span></div>`;
  // Faction + XP sit side-by-side on the right at full width and stack (faction over XP) only when the row is
  // narrow (container query). The ⋯ menu is always visible (no gradient) so faction/XP stay clickable (B180).
  const right=`<div class="cbt-right">${facSel}<span class="xpv">${xp.toLocaleString()} XP</span></div>`;
  const kebab=`<button class="cbt-kebab" data-emenu="${c.id}" title="Combatant actions" aria-label="Combatant actions">⋯</button>`;
  if(c.type==="quick")return `<div class="cbt ${fc}" data-cid="${c.id}">
    ${cnt}
    <div class="cbt-main">
      <input class="nick" placeholder="Combatant name" data-cf="${c.id}:nickname" value="${esc(c.nickname||"")}">
      <div class="cbt-sb"><button type="button" class="cbt-pick" data-cropen="${c.id}" aria-label="Challenge rating"><span class="cbt-pick-lbl">CR ${esc(c.cr)}${combatIsMinion(c)?" · minion":""}</span><span class="cbt-pick-chev">▾</span></button></div>
    </div>
    ${right}${kebab}</div>`;
  const m=monOf(c);
  const orphan=!m&&!!c.monsterId; // had a statblock that has since been deleted from the Bestiary (B195)
  const sbLabel=m?`${esc(m.name)} (CR ${m.cr})${combatIsMinion(c)?" · minion":""}`
    :orphan?`⚠ ${esc(c._lostName||"Statblock")} (deleted)`:"Pick a statblock…";
  const pickCls=m?"":orphan?" orphan":" empty";
  const pickTitle=orphan?' title="This statblock was deleted. Pick another to re-link, or remove the combatant from its ⋯ menu"':"";
  return `<div class="cbt ${fc}${orphan?" cbt-orphan":""}" data-cid="${c.id}">
    ${cnt}
    <div class="cbt-main">
      <input class="nick" placeholder="${esc(m?m.name:(c._lostName||"(missing)"))}" data-cf="${c.id}:nickname" value="${esc(c.nickname||"")}">
      <div class="cbt-sb"><button type="button" class="cbt-pick${pickCls}" data-sbopen="${c.id}" aria-label="Statblock"${pickTitle}><span class="cbt-pick-lbl">${sbLabel}</span><span class="cbt-pick-chev">▾</span></button></div>
    </div>
    ${right}${kebab}</div>`;
}
function findEnc(a,id){return a.encounters.find(e=>e.id===id);}
function findCombat(a,cid){for(const e of a.encounters){const c=e.combatants.find(x=>x.id===cid);if(c)return{e,c};}return{};}
// Per-row actions (B172) — the combatant row's hover kebab. Turn into minion (a per-combatant override,
// explained by the inline ?), edit the statblock in the Forge, duplicate, or delete.
function openEncCombatantMenu(a,e,c,anchor){
  const isMin=combatIsMinion(c),m=c.type==="monster"?monOf(c):null;
  let html=`<button class="popitem" data-emi="minion">${isMin?"Remove minion":"Turn into minion"}<span class="popitem-q" data-mintip data-note="${esc(MINION_NOTE)}" aria-label="What is a minion?">?</span></button>`;
  if(m)html+=`<button class="popitem" data-emi="forge">Edit in Forge</button>`;
  html+=`<button class="popitem" data-emi="dupe">Duplicate</button>`;
  html+=`<div class="popsep"></div><button class="popitem danger" data-emi="del">Delete</button>`;
  const p=showPopover(anchor,html);
  p.querySelectorAll("[data-emi]").forEach(b=>b.addEventListener("click",ev=>{
    if(ev.target.closest("[data-mintip]")){ev.stopPropagation();return;} // the ? just carries its own tooltip
    const k=b.dataset.emi;closePopover();
    if(k==="minion"){c.minion=!combatIsMinion(c);saveAdv();renderEncList(a);}
    else if(k==="forge"){if(m)guardedLoad(()=>{loadMonster(m);switchView("forge");});}
    else if(k==="dupe"){const i=e.combatants.findIndex(x=>x.id===c.id);e.combatants.splice(i+1,0,{...c,id:uid()});saveAdv();renderEncList(a);}
    else if(k==="del"){e.combatants=e.combatants.filter(x=>x.id!==c.id&&x.lairFor!==c.id);saveAdv();renderEncList(a);}
  }));
}
// Custom type-to-search statblock picker (B173) — replaces the native <select> on a monster row. Grouped
// "Last edited" + by-CR, filtered by the search field (per [[custom-dropdown-rule]], never a native datalist).
function monPickListHTML(selId,q){
  q=(q||"").trim().toLowerCase();
  const match=m=>!q||(m.name||"").toLowerCase().includes(q)||("cr "+m.cr).includes(q);
  const item=m=>`<button class="popitem${m.id===selId?" on":""}" data-mid="${m.id}"><span class="mp-nm">${esc(m.name)}</span>${m.minion?`<span class="mp-cr">minion</span>`:""}</button>`;
  let html="";
  const recent=state.lib.reduce((a,b)=>((b._savedAt||0)>((a&&a._savedAt)||0)?b:a),null);
  if(recent&&match(recent))html+=`<div class="pop-grp-lbl">Last edited</div>${item(recent)}`;
  const byCR={};state.lib.filter(match).forEach(m=>{(byCR[m.cr]=byCR[m.cr]||[]).push(m);});
  Object.keys(byCR).sort((x,y)=>(CR_NUM[x]??0)-(CR_NUM[y]??0)).forEach(cr=>{
    const list=byCR[cr].slice().sort((a,b)=>a.name.localeCompare(b.name));
    html+=`<div class="pop-grp-lbl">CR ${cr}</div>${list.map(item).join("")}`;});
  return html||`<div class="cl-empty">No creature matches.</div>`;
}
function openStatblockDropdown(a,c,anchor){
  if(!state.lib.length){openBestiaryPicker(a,findCombat(a,c.id).e);return;} // no saved creatures → the full picker
  const p=showPopover(anchor,`<input class="popinput sb-pick-in" placeholder="Search creatures…" autocomplete="off"><div class="popscroll sb-pick-list">${monPickListHTML(c.monsterId)}</div>`);
  const inp=p.querySelector(".sb-pick-in"),list=p.querySelector(".sb-pick-list");inp.focus();
  const bind=()=>list.querySelectorAll("[data-mid]").forEach(b=>b.addEventListener("click",()=>{closePopover();c.monsterId=b.dataset.mid;delete c._lostName;saveAdv();renderEncList(a);}));
  bind();
  inp.addEventListener("input",()=>{list.innerHTML=monPickListHTML(c.monsterId,inp.value);bind();});
  inp.addEventListener("keydown",ev=>{if(ev.key==="Escape")closePopover();else if(ev.key==="Enter"){const f=list.querySelector("[data-mid]");if(f){ev.preventDefault();f.click();}}});
}
// Custom type-to-search CR picker for quick combatants (B173) — with the minion toggle + ? explainer inside.
function openCRDropdown(a,c,anchor){
  const crItems=q=>{q=(q||"").trim().toLowerCase();const list=CR_LIST.filter(x=>!q||("cr "+x).includes(q)||String(x).toLowerCase().includes(q));
    return list.map(x=>`<button class="popitem${x===c.cr?" on":""}" data-cr="${x}">CR ${x}</button>`).join("")||`<div class="cl-empty">No CR matches.</div>`;};
  const minRow=()=>`<div class="popsep"></div><button class="popitem popcheck${combatIsMinion(c)?" on":""}" data-crmin><span class="ck">${combatIsMinion(c)?"✓":""}</span>Minion<span class="popitem-q" data-mintip data-note="${esc(MINION_NOTE)}" aria-label="What is a minion?">?</span></button>`;
  const p=showPopover(anchor,`<input class="popinput cr-pick-in" placeholder="Search CR…" autocomplete="off"><div class="popscroll cr-pick-list">${crItems("")}</div>${minRow()}`);
  const inp=p.querySelector(".cr-pick-in"),list=p.querySelector(".cr-pick-list");inp.focus();
  const bind=()=>list.querySelectorAll("[data-cr]").forEach(b=>b.addEventListener("click",()=>{closePopover();c.cr=b.dataset.cr;saveAdv();renderEncList(a);}));
  bind();
  inp.addEventListener("input",()=>{list.innerHTML=crItems(inp.value);bind();});
  inp.addEventListener("keydown",ev=>{if(ev.key==="Escape")closePopover();else if(ev.key==="Enter"){const f=list.querySelector("[data-cr]");if(f){ev.preventDefault();f.click();}}});
  p.querySelector("[data-crmin]").addEventListener("click",ev=>{if(ev.target.closest("[data-mintip]")){ev.stopPropagation();return;}closePopover();c.minion=!combatIsMinion(c);saveAdv();renderEncList(a);});
}
function bindEncEvents(a){
  const q=sel=>$$("#advDetail "+sel);
  q("[data-encname]").forEach(el=>el.addEventListener("change",()=>{findEnc(a,el.dataset.encname).name=el.value;saveAdv();}));
  q("[data-encnotes]").forEach(el=>el.addEventListener("input",()=>{findEnc(a,el.dataset.encnotes).notes=el.value;saveAdv();}));
  q("[data-encdel]").forEach(el=>el.addEventListener("click",()=>{a.encounters=a.encounters.filter(e=>e.id!==el.dataset.encdel);saveAdv();renderEncList(a);}));
  q("[data-encnotes-tog]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encnotesTog);if(e){e.notesOn=!e.notesOn;if(!e.notesOn)e.notes="";saveAdv();renderEncList(a);}}));
  q("[data-enccollapse]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.enccollapse);e.collapsed=!e.collapsed;saveAdv();renderEncList(a);}));
  q("[data-encmove]").forEach(el=>el.addEventListener("click",()=>{const[id,where]=el.dataset.encmove.split(":");moveEncTo(a,id,where);}));
  q("[data-encpin]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encpin);if(e){e.pinned=!e.pinned;saveAdv();renderEncList(a);}}));
  q("[data-scenepin]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenepin);if(s){s.pinned=!s.pinned;saveAdv();renderEncList(a);}}));
  q("[data-scenemove]").forEach(el=>el.addEventListener("click",()=>{const[id,where]=el.dataset.scenemove.split(":");moveSceneTo(a,id,where);}));
  q("#addScene").forEach(el=>el.addEventListener("click",()=>addScene(a)));
  q("[data-scenename]").forEach(el=>el.addEventListener("change",()=>{const s=sceneOf(a,el.dataset.scenename);if(s){s.name=el.value.trim()||"Scene";saveAdv();}}));
  q("[data-scenenotes]").forEach(el=>el.addEventListener("input",()=>{const s=sceneOf(a,el.dataset.scenenotes);if(s){s.notes=el.value;saveAdv();}}));
  q("[data-scenecollapse]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenecollapse);if(s){s.collapsed=!s.collapsed;saveAdv();renderEncList(a);}}));
  q("[data-scenearch]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenearch);if(s){s.archived=!s.archived;saveAdv();renderEncList(a);}}));
  q("[data-scenenotes-tog]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenenotesTog);if(s){s.notesOn=!s.notesOn;if(!s.notesOn)s.notes="";saveAdv();renderEncList(a);}}));
  q("[data-sceneadd]").forEach(el=>el.addEventListener("click",()=>{const e=blankEncounter(el.dataset.sceneadd);a.encounters.push(e);a._focusEnc=e.id;saveAdv();renderEncList(a);revealFocusedEnc();}));
  q("[data-scenedel]").forEach(el=>el.addEventListener("click",()=>{const sid=el.dataset.scenedel,s=sceneOf(a,sid);if(!s)return;const n=a.encounters.filter(e=>e.sceneId===sid).length;
    const go=()=>{a.encounters.forEach(e=>{if(e.sceneId===sid)e.sceneId=null;});a.scenes=a.scenes.filter(x=>x.id!==sid);saveAdv();renderEncList(a);};
    n?confirmModal(`Delete scene "${s.name}"? Its ${n} encounter${n>1?"s":""} will become ungrouped.`,go):go();}));
  bindEncDrag(a,q);
  bindEncTarget(a,q);
  q("[data-addmon]").forEach(el=>el.addEventListener("click",()=>openBestiaryPicker(a,findEnc(a,el.dataset.addmon))));
  q("[data-pushenc]").forEach(el=>el.addEventListener("click",()=>pushEncounter(a,findEnc(a,el.dataset.pushenc))));
  q("[data-startcombat]").forEach(el=>el.addEventListener("click",()=>runCombat(a,findEnc(a,el.dataset.startcombat))));
  q("[data-startmore]").forEach(el=>el.addEventListener("click",ev=>{ev.stopPropagation();openStartCombatMenu(a,findEnc(a,el.dataset.startmore),el);}));
  q("[data-encstatus]").forEach(el=>el.addEventListener("click",()=>openEncStatusMenu(a,findEnc(a,el.dataset.encstatus),el)));
  q("[data-encclear]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encclear);if(!e||!e.combatants.length)return;
    confirmModal(`Clear all combatants from "${e.name||"this encounter"}"?`,()=>{e.combatants=[];saveAdv();renderEncList(a);});}));
  q("[data-emenu]").forEach(el=>el.addEventListener("click",()=>{const{e,c}=findCombat(a,el.dataset.emenu);if(c)openEncCombatantMenu(a,e,c,el);}));
  q("[data-sbopen]").forEach(el=>el.addEventListener("click",()=>{const{c}=findCombat(a,el.dataset.sbopen);if(c)openStatblockDropdown(a,c,el);}));
  q("[data-cropen]").forEach(el=>el.addEventListener("click",()=>{const{c}=findCombat(a,el.dataset.cropen);if(c)openCRDropdown(a,c,el);}));
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
  q("[data-cdel]").forEach(el=>el.addEventListener("click",()=>{const{e,c}=findCombat(a,el.dataset.cdel);if(e){e.combatants=e.combatants.filter(x=>x.id!==c.id&&x.lairFor!==c.id);saveAdv();renderEncList(a);}})); // renderEncList preserves the page scroll (only #encList re-renders)
}
// Encounters share one array but render in two groups (active / archived). Reorder within a group,
// then write the regrouped order back into the slots that group occupied so the other group is untouched.
function setGroupOrder(a,archived,group){let k=0;a.encounters.forEach((e,i)=>{if(e.archived===archived)a.encounters[i]=group[k++];});}
function moveEncTo(a,id,where){
  const e=findEnc(a,id);if(!e)return;
  const group=pinSort(a.encounters.filter(x=>x.archived===e.archived)),pos=group.indexOf(e);
  let tgt=where==="up"?pos-1:where==="down"?pos+1:where==="top"?0:group.length-1;
  tgt=clamp(tgt,0,group.length-1);if(tgt===pos)return;
  group.splice(pos,1);group.splice(tgt,0,e);setGroupOrder(a,e.archived,group);saveAdv();renderEncList(a);
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
  setGroupOrder(a,from.archived,group);saveAdv();renderEncList(a);
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
  setGroupOrder(a,false,group);saveAdv();renderEncList(a);
}
let dragEncId=null,dropTarget=null;
// Skip drag-init when the press starts on an interactive control inside the card so editing
// inputs / clicking the menu / dragging the XP-target marker never triggers a card-drag.
function dragInert(t){return !!(t&&t.closest('input,textarea,select,button,a,label,[contenteditable="true"]'));}
let dragSceneId=null,dropScene=null;
function clearDropMarks(){$$("#advDetail .enc.drop-before,#advDetail .enc.drop-after,#advDetail .scene.drop-before,#advDetail .scene.drop-after").forEach(x=>x.classList.remove("drop-before","drop-after"));$$("#advDetail [data-scenedrop].scene-drop").forEach(x=>x.classList.remove("scene-drop"));}
// Reorder a scene within a.scenes (active scenes among active, archived among archived).
function reorderScene(a,fromId,toId,after){
  if(!fromId||!toId||fromId===toId)return;
  const arr=a.scenes,from=arr.find(s=>s.id===fromId),to=arr.find(s=>s.id===toId);
  if(!from||!to||!!from.archived!==!!to.archived)return;
  arr.splice(arr.indexOf(from),1);let idx=arr.indexOf(to);if(after)idx++;arr.splice(idx,0,from);
  saveAdv();renderEncList(a);
}
// Scene reorder by menu (top/up/down/bottom), within the active or archived group. Pinned scenes
// still float to the top at render. Mirrors moveEncTo (B78).
function setSceneGroupOrder(a,archived,group){let k=0;a.scenes.forEach((x,i)=>{if(!!x.archived===!!archived)a.scenes[i]=group[k++];});}
function moveSceneTo(a,id,where){
  const s=sceneOf(a,id);if(!s)return;
  const group=pinSort((a.scenes||[]).filter(x=>!!x.archived===!!s.archived)),pos=group.indexOf(s);
  let tgt=where==="up"?pos-1:where==="down"?pos+1:where==="top"?0:group.length-1;
  tgt=clamp(tgt,0,group.length-1);if(tgt===pos)return;
  group.splice(pos,1);group.splice(tgt,0,s);setSceneGroupOrder(a,s.archived,group);saveAdv();renderEncList(a);
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
// The draggable XP target was dropped in the budget redesign (B170); the bar now just shows the Low/Mod/High
// notches (hover → the XP each represents) + a difficulty-tinted fill.
function bindEncTarget(a,q){
  q(".budget [data-budtip]").forEach(mk=>{
    mk.addEventListener("mouseenter",()=>tailPopover(mk,`<div class="bud-pop">${esc(mk.dataset.budtip)}</div>`));
    mk.addEventListener("mouseleave",()=>closePopover());
  });
}
function openBestiaryPicker(a,e){
  if(!e)return;
  // An empty bestiary still opens the picker — the footer (Forge / From chassis / Event / Quick) can add
  // a combatant without any saved creatures, and the body shows an empty-bestiary hint.
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
  openModalRaw(`<h3 class="modal-h-row"><span>Add combatant</span><button class="cr-help" id="bpHelp" aria-label="About this picker">?</button></h3>
    <div class="ctrl-bar"><div class="ctrl-icons" id="bpCtrlIcons"></div><div class="ctrl-chips" id="bpChips"></div></div>
    <div id="bpBody" class="picker-scroll"></div>
    <div class="mrow picker-foot">
      <button class="btn ghost sm pf-btn" id="bpForge">${FORGE_ICON}<span>Forge new</span></button>
      <button class="btn ghost sm pf-btn" id="bpChassis">${CHASSIS_ICON}<span>From chassis</span></button>
      <button class="btn ghost sm pf-btn" id="bpEvent">Event / entity</button>
      <button class="btn ghost sm pf-btn" id="bpQuick">Quick <small class="pf-note">CR only</small></button>
      <button class="btn primary sm pf-done" id="bpClose">Done</button>
    </div>`);
  bindHelpHover($("#bpHelp"),`Adds the chosen creature to “${esc(e.name)}”. You can add several without closing.`);
  const cardOf=o=>pickerCardHTML(o,"＋ Add",false);
  function draw(){
    renderCtrlChips($("#bpChips"),ctrl,desc,draw);
    const emptyMsg=state.lib.length?"No creatures match these controls.":"Your bestiary is empty. Use <b>From chassis</b> to load a ready-made statblock, <b>Forge new</b> to build one, or add a <b>Quick</b> / <b>Event</b> combatant below.";
    renderRecords($("#bpBody"),ctrlApply(pool(),ctrl,desc),ctrl,desc,{cardOf,emptyMsg,cap:300});
    $("#bpBody").querySelectorAll("[data-cardprev]").forEach(b=>bindPreviewHover(b,()=>state.lib.find(m=>m.id===b.dataset.cardprev)));
    $("#bpBody").querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>{a._focusEnc=e.id;addMonsterCombatant(e,b.dataset.pick);afterCombatantAdded(a,e);toast("Added.");}));
  }
  bindCtrlIcons($("#bpCtrlIcons"),ctrl,desc,draw);
  draw();
  $("#bpClose").addEventListener("click",closeModal);
  $("#bpQuick").addEventListener("click",()=>{closeModal();addQuickCombatant(a,e);});
  $("#bpEvent").addEventListener("click",()=>{closeModal();addEventCombatant(a,e);});
  $("#bpForge").addEventListener("click",()=>{closeModal();forgeForEncounter(a,e);});
  $("#bpChassis").addEventListener("click",()=>{closeModal();openChassisForEncounter(a,e,true);});
}
// "Forge new →" from anywhere: park a pendingForge target, load a blank monster, jump to the Forge.
function forgeForEncounter(a,e){guardedLoad(()=>{pendingForge={advId:a.id,encId:e.id};loadMonster(blankMonster());showBanner(`Forging a new monster for “${e.name}”. Save to add it to that encounter.`,()=>{pendingForge=null;hideBanner();});switchView("forge");});}
function pushEncounter(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[,label]=diffOf(spent,bud);
  const payload={forge:"encounter",v:2,adventure:a.name,encounter_tag:`${a.name} / ${e.name}`,
    party:{size:(a.party||[]).length,levels:advPartyLevels(a)},
    battlefield_notes:e.notes||"",
    budget:{low:bud[0],moderate:bud[1],high:bud[2],spent,reads_as:label,note:"allies (faction Ally) already folded into budget via CR→level"},
    combatants:e.combatants.filter(c=>c.type!=="event").map(c=>{const m=c.type==="monster"?monOf(c):null;return{kind:c.type,statblock_name:c.type==="monster"?(m?m.name:"(missing)"):null,nickname:c.nickname||null,cr:combatCR(c),minion:combatIsMinion(c),xp_each:combatXPEach(c),count:Number(c.count),faction:c.faction};}),
    environment_entities:e.combatants.filter(c=>c.type==="event").map(c=>({name:c.name||"(unnamed)",initiative:c.init||null,description:c.text||""}))};
  const txt="<<CLAUDE-FORGE / create the Enemy/Ally combatants below as Nemici entries in Notion, link each to its Statblock by name (use nickname as the entry Name when given, else the statblock name), set Faction & Status=Alive, and ROLL initiative for each (d20 + the statblock's DEX mod). Add environment_entities and battlefield_notes as encounter notes, not as statblock-linked enemies. Flag any statblock name not found.>>\n```json\n"+JSON.stringify(payload,null,2)+"\n```";
  copyModal("Copy encounter for Claude",txt,"Paste in chat: I create the combatant entries, link statblocks, roll initiative, and attach the notes/entities.");
}
