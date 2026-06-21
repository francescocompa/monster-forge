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
  let html=active.map(a=>`<div class="ai ${a.id===state.selAdv?"sel":""}${a.pinned?" pinned":""}" data-adv="${a.id}" draggable="true" title="${esc(advDName(a))}"${aiStyle(a)}>${aiIni(a)}<div class="ai-info"><div class="nm">${advDot(a.id,a.color)}${esc(advDName(a))}</div><div class="dt">${advPartyLabel(a)} · ${a.encounters.filter(e=>!e.archived).length} enc.</div></div>${aiPin(a)}${aiMenu(a)}</div>`).join("")||`<div class="hint" style="padding:8px">No adventures yet.</div>`;
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
  if(!a){setCrumbs(["Adventures"]);d.innerHTML=`<div class="empty-state">Select or create an adventure.</div>`;return;}
  setCrumbs(["Adventures",advDName(a)]);
  d.innerHTML=`<div class="adv-topbar" data-advcolor="${a.id}" title="Adventure colour"${a.color?` style="background:linear-gradient(90deg,${a.color},color-mix(in srgb,${a.color} 55%,#000))"`:""}></div>
    <div class="adv-detail-body"${a.color?` style="--sel-accent:${a.color}"`:""}>
    <div class="col-head"><div class="ch-left"><button class="adv-back" id="advBack" title="Adventures" aria-label="Open the adventure list">${ADV_TAB_SVG}</button><h2 contenteditable="true" id="advName" data-ph="New Adventure" style="outline:none">${esc(a.name)}</h2>${a.party.length?`<span class="adv-pc-count" title="${a.party.length} player character${a.party.length>1?"s":""}">${a.party.length}</span>`:""}</div>
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
    <div class="section-label" id="partyHead">Party roster <button class="lvlup-btn" id="partyLvlUp" title="Level up the party" aria-label="Level up the party">${ARROW_TREND_UP}</button></div>
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
  $("#addEnc").addEventListener("click",()=>{const e=blankEncounter();a.encounters.push(e);a._focusEnc=e.id;saveAdv();renderAdvDetail();});
  $("#encAddScene").addEventListener("click",()=>addScene(a));
  $("#encImport").addEventListener("click",()=>openImportEnc(a));
  $("#encArchiveAll").addEventListener("click",()=>{const live=a.encounters.filter(e=>!encArchived(a,e));if(!live.length)return;confirmModal(`Archive all ${live.length} active encounter${live.length>1?"s":""}?`,()=>{live.forEach(e=>e.archived=true);saveAdv();renderAdvDetail();});});
  $("#encClearAll").addEventListener("click",()=>{if(!a.encounters.length)return;confirmModal(`Delete all ${a.encounters.length} encounter${a.encounters.length>1?"s":""} and clear every scene? This cannot be undone.`,()=>{a.encounters=[];a.scenes=[];saveAdv();renderAdvDetail();});});
  bindCtrlIcons($("#encCtrlIcons"),encCtrl,ENC_DESC,()=>renderEncList(a));
  {const lu=$("#partyLvlUp");if(lu)lu.addEventListener("click",()=>levelUpParty(a));}
  renderParty(a);renderEncList(a);
}
// ── Party roster v2 (B136) ───────────────────────────────────────────────────
// A player character lives ONCE in the shared roster (state.roster); each adventure's `a.party` is an
// ORDERED list of roster ids. Membership IS the adventure tag — `rosterAdventures(rid)` derives which
// adventures a character is in. Editing a character changes it in every adventure (live shared). "Unsync"
// forks a separate roster entry tagged only with the current adventure. Fields are TYPED: a standard key
// (ac/hp/init/…) carrying its canonical label + icon, or a custom label. Defaults are AC + HP (removable).
const PC_AC_ICON='<svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.5 31 38.4 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.4-57.2L242.6 2.9C246.8 1 251.4 0 256 0z"/></svg>';
const PC_HP_ICON='<svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/></svg>';
const UNLINK_ICON='<svg viewBox="0 0 640 512" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L489.3 358.2l60.4-60.5c56.5-56.5 56.5-148 0-204.5-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6 31.5 31.5 31.5 82.5 0 114l-65.1 65.2-71-55.9c1.1-14.5-3.8-29.5-15-40.7-19.9-19.9-51.4-21.5-73.2-4.9L38.8 5.1zM276 247.5C261.8 235.9 248.5 223.6 224 223.6c-10.3 0-20.2 3.9-27.7 10.9L75.6 348.9c-30.4 28.3-47.6 68-47.6 109.5v5.8c0 26.2 16.3 47.9 38.4 57.2l188.2 79.9c5.8 2.5 12.1 3.7 18.4 3.7s12.6-1.2 18.4-3.7l36.9-15.7-160-126.1z"/></svg>';
// Standard typed fields (B137): a key carrying its canonical label + (AC/HP) icon or short label. Spell
// attack / save DC are NO LONGER standalone — they're DERIVED from whichever ability is flagged the spell
// ability + the Level (proficiency). Abilities carry `abil:true` so they can be grouped + flagged.
const PC_FIELDS=[
  {k:"ac",label:"AC",icon:PC_AC_ICON},{k:"hp",label:"HP",icon:PC_HP_ICON},
  {k:"init",label:"Initiative",short:"init",mod:true},{k:"level",label:"Level",short:"lvl"},{k:"class",label:"Class",short:"class"},{k:"player",label:"Player",short:"player"},
  {k:"pp",label:"Passive Perception",short:"PP"},{k:"prof",label:"Proficiency",short:"prof",mod:true},{k:"speed",label:"Speed",short:"spd"},{k:"senses",label:"Senses",short:"senses"},
  {k:"str",label:"Strength",short:"STR",abil:true},{k:"dex",label:"Dexterity",short:"DEX",abil:true},{k:"con",label:"Constitution",short:"CON",abil:true},
  {k:"int",label:"Intelligence",short:"INT",abil:true},{k:"wis",label:"Wisdom",short:"WIS",abil:true},{k:"cha",label:"Charisma",short:"CHA",abil:true}];
const PC_FIELD={};PC_FIELDS.forEach(f=>{PC_FIELD[f.k]=f;});
const PC_ABILS=["str","dex","con","int","wis","cha"];
const PC_LEGACY={dc:"Spell save DC",spellatk:"Spell attack"}; // dropped standard keys → label fallback only
const D5_CLASSES=["Artificer","Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"];
function rosterById(id){return state.roster.find(r=>r.id===id)||null;}
// A character's class — the standard `class` field, or a legacy custom field labelled "Class".
function charClass(c){const f=(c&&c.fields||[]).find(x=>x.k==="class"||(!x.k&&(x.label||"").toLowerCase()==="class"));return f&&f.v!=null?String(f.v):"";}
function newRosterChar(name){return {id:uid(),name:name||"",notes:"",fields:[{k:"level",v:""},{k:"class",v:""},{k:"ac",v:""},{k:"hp",v:""},{k:"speed",v:""}]};}
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
// Level up every party member by one (capped at 20), then scroll each row's level number from current to
// next (a single deterministic step, not the random init spin) before re-rendering (B147).
function levelUpParty(a){const box=$("#partyWrap"),inputs=box?[...box.querySelectorAll("[data-pclvl]")]:[],moves=[];
  // Snapshot the displayed levels BEFORE mutating — otherwise an unset member would inherit a member we just
  // bumped (partyDefaultLevel shifts mid-loop).
  const snap=(a.party||[]).map(rid=>{const c=rosterById(rid);return c?rowLevel(c,a.id):null;});
  (a.party||[]).forEach((rid,i)=>{const c=rosterById(rid),from=snap[i];if(!c||from==null||from>=20)return;const to=from+1;
    let f=(c.fields||[]).find(x=>x.k==="level");if(!f){f={k:"level",v:""};c.fields.unshift(f);}f.v=String(to);
    moves.push({inp:inputs.find(el=>el.dataset.pclvl===rid),from,to});});
  if(!moves.length)return;saveRoster();animateLevelUp(moves,()=>renderAdvDetail());}
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
  case "level":return String(partyDefaultLevel(advId));
  case "init":return hasAbilScores(c)?sgn(abilMod(abilScoreOf(c,"dex"))):"";
  case "pp":return hasAbilScores(c)?String(10+abilMod(abilScoreOf(c,"wis"))):"";
  default:return "";}}
// Effective initiative modifier for combat — the set value, else the DEX-mod default when abilities exist.
function effInit(c){const v=charFieldVal(c,"init");if(v!==""&&v!=null)return Number(v)||0;return hasAbilScores(c)?abilMod(abilScoreOf(c,"dex")):0;}
function normalizeRosterPC(p){p=p||{};return {id:p.id||uid(),name:p.name||"",notes:p.notes||"",
  fields:Array.isArray(p.fields)?p.fields.map(f=>({k:f.k||"",label:f.label||"",
    // Legacy B149 "senses" preset (an object) collapses to the plain text field it became in B152.
    v:(f.k==="senses"&&f.v&&typeof f.v==="object"&&!Array.isArray(f.v))?(f.v.dv||""):(f.v??""),hide:!!f.hide,
    main:!!(f.main||f.atk||f.dc||f.spell),prof:!!f.prof,atkV:f.atkV??"",dcV:f.dcV??""})):[{k:"ac",v:""},{k:"hp",v:""}]};}
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
const PC_PRESETS=[{k:"dmgmod",label:"Damage Modifiers"},{k:"skills",label:"Skills & expertise"},{k:"passives",label:"Passives"}];
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
function charIsBlank(c){return !c||(!(c.name||"").trim()&&!(c.notes||"").trim()&&!(c.fields||[]).some(f=>String(f.v??"").trim()!==""));}
// Delete a character everywhere: drop it from the roster and from every adventure's party.
function deleteRosterChar(rid){state.roster=state.roster.filter(r=>r.id!==rid);state.adv.forEach(a=>{if(a.party)a.party=a.party.filter(x=>x!==rid);});saveRoster();saveAdv();}
function pcChipHTML(rid,f){const d=fieldDef(f);const lbl=d&&d.icon?d.icon:`<span class="pc-cl">${esc((d&&d.short)||fieldLabel(f))}</span>`;
  return `<button class="pc-chip" data-pcchip="${rid}:${f.k||""}" title="${esc(fieldLabel(f))}">${lbl}${esc(String(f.v))}</button>`;}
function renderParty(a){
  const box=$("#partyWrap");if(!box)return;
  const rows=(a.party||[]).map(rid=>{const c=rosterById(rid);if(!c)return "";
    const lv=charFieldVal(c,"level"),lvSet=lv!==""&&lv!=null,cls=charClass(c);
    const chips=(c.fields||[]).filter(f=>!chipHidden(f)&&f.k!=="class"&&f.k&&PC_FIELD[f.k]&&f.v!==""&&f.v!=null).map(f=>pcChipHTML(rid,f)).join("");
    const derived=charDerivedChips(c).map(x=>x.kind==="atk"
      ?`<span class="pc-dchip"><span class="pc-cl">atk</span>${sgn(x.v)}</span>`
      :`<span class="pc-dchip dc"><span class="pc-cl">DC</span>${x.v}</span>`).join("");
    return `<div class="pc-row" data-pcopen="${rid}">
      <span class="pc-lvl-wrap"><span class="pc-lv-cap">LV</span><input class="pc-lvl-in${lvSet?"":" dim"}" type="number" min="1" max="20" data-pclvl="${rid}" value="${lvSet?esc(String(lv)):""}" placeholder="${partyDefaultLevel(a.id)}" title="Level — click to edit"></span>
      <span class="pc-name"><span class="pc-nm">${esc(c.name)||'<span class="pc-unnamed">New character</span>'}</span>${cls?`<span class="pc-cls">${esc(cls)}</span>`:""}</span>
      <span class="pc-chips">${chips}${derived}</span>
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
function openCharacterDetail(rid,curAdvId,ui){
  ui=ui||{};const c=rosterById(rid);if(!c){closeModal();return;}
  const curAdv=curAdvId!==undefined?curAdvId:state.selAdv;
  // Current adventure's tag always leads (B138).
  const advs=rosterAdventures(rid).slice().sort((x,y)=>(x.id===curAdv?-1:y.id===curAdv?1:0)),shared=advs.length>1;
  const tag=ad=>`<span class="cd-tag${ad.id===curAdv?" cur":""}" style="--tagc:${ad.color||"var(--accent)"}">${esc(advDName(ad))}</span>`;
  const tagsHTML=advs.length?advs.map(tag).join(""):`<span class="cd-tag empty">Not in any adventure</span>`;
  const propRow=(f,i)=>{const d=fieldDef(f),ico=d&&d.icon?d.icon:"";
    const nameEl=(ui.rename===i&&!f.k)?`<input class="cd-pn-edit" data-cdrenval="${i}" value="${esc(f.label)}" placeholder="Field name">`
      :`<button class="cd-pn" data-cdname="${i}">${ico}${esc(fieldLabel(f))}</button>`;
    const ph=fieldDefault(c,f,curAdv)||"Empty";
    const list=f.k==="class"?` list="pcClassList"`:"";
    return `<div class="cd-prop" data-cdrow="${i}"><span class="cd-grip" draggable="true" data-cdgrip="${i}" title="Drag to reorder">${GRIP_SVG}</span>${nameEl}<input class="cd-pv" data-cdval="${i}"${list} value="${esc(String(f.v))}" placeholder="${esc(ph)}"></div>`;};
  // Preset chip field (B148) — label + a wrapping field of chips and an add control. dmgmod/passives pick from
  // a custom dropdown; skills keep the datalist combobox. Passive chips derive proficiency from the Skills field.
  const presetRow=(f,i)=>{const arr=Array.isArray(f.v)?f.v:[];
    const chips=arr.map((e,j)=>f.k==="dmgmod"?dmgChipHTML(e,j):f.k==="passives"?passiveChipHTML(c,e,j):skillChipHTML(c,e,j)).join("");
    const addCtrl=f.k==="dmgmod"?`<button class="cd-chip-addbtn" data-cddmgadd="${i}">＋ type</button>`
      :f.k==="passives"?`<button class="cd-chip-addbtn" data-cdpassadd="${i}">＋ skill</button>`
      :`<input class="cd-chip-add" data-cdchipadd="${i}" list="pcSkillList" placeholder="add skill…" autocomplete="off">`;
    return `<div class="cd-prop cd-preset" data-cdrow="${i}"><span class="cd-grip" draggable="true" data-cdgrip="${i}" title="Drag to reorder">${GRIP_SVG}</span><button class="cd-pn" data-cdname="${i}">${esc(fieldLabel(f))}</button><div class="cd-chipfield" data-cdchips="${i}">${chips}${addCtrl}</div></div>`;};
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
  openModalRaw(`<div class="char-detail">
    <div class="cd-top">
      <div class="cd-tags">${tagsHTML}</div>
      <div class="cd-icons">${shared&&curAdv?`<button class="cd-gx" data-cdunsync title="Unsync from this adventure" aria-label="Unsync">${UNLINK_ICON}</button>`:""}<button class="cd-gx" data-cdclose aria-label="Close">✕</button></div>
    </div>
    <div class="cd-scroll">
      <input class="cd-title" placeholder="Character name" value="${esc(c.name)}">
      <div class="cd-props">${visHTML}${hidBlock}<button class="cd-addprop" data-cdaddprop>＋ Add a property</button>${abilBlock}</div>
      <div class="cd-divider"></div>
      <textarea class="cd-notes" placeholder="Notes & backstory…">${esc(c.notes||"")}</textarea>
    </div>
    <div class="cd-foot"><button class="cd-del" data-cddelete>Delete</button><button class="btn primary sm" data-cddone style="flex:1">Done</button></div>
    <datalist id="pcClassList">${D5_CLASSES.map(x=>`<option value="${x}">`).join("")}</datalist>
    <datalist id="pcSkillList">${Object.keys(SKILLS).map(s=>`<option value="${s.replace(/_/g," ")}">`).join("")}</datalist>
  </div>`);
  $("#modal").classList.add("cd-host");
  // re() re-renders the whole modal; preserve the scroll position so toggling Save/main/etc. doesn't bounce
  // the user back to the top (B143).
  const m=$("#modal"),re=u=>{const sc=m.querySelector(".cd-scroll"),top=sc?sc.scrollTop:0;openCharacterDetail(rid,curAdv,u);const ns=$("#modal").querySelector(".cd-scroll");if(ns)ns.scrollTop=top;},close=()=>{closeModal();if(state.selAdv)renderAdvDetail();};
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
  m.querySelector("[data-cddone]").addEventListener("click",close);
  m.querySelector(".cd-title").addEventListener("input",e=>{c.name=e.target.value;saveRoster();});
  m.querySelectorAll("[data-cdval]").forEach(el=>el.addEventListener("input",()=>{const f=c.fields[+el.dataset.cdval];if(f){f.v=el.value;saveRoster();}}));
  m.querySelectorAll("[data-cdabsub]").forEach(el=>el.addEventListener("input",()=>{const[kind,k]=el.dataset.cdabsub.split(":"),f=ensureAbilField(c,k);if(kind==="atk")f.atkV=el.value;else f.dcV=el.value;saveRoster();}));
  // Ability grid binds by key (the field is created on demand). Score commits on change so the mod + derived
  // placeholders refresh without stealing focus mid-type.
  m.querySelectorAll("[data-cdabkey]").forEach(el=>el.addEventListener("change",()=>{ensureAbilField(c,el.dataset.cdabkey).v=el.value;saveRoster();re({});}));
  m.querySelectorAll("[data-cdabmain]").forEach(el=>el.addEventListener("click",()=>{const f=ensureAbilField(c,el.dataset.cdabmain);f.main=!f.main;saveRoster();re({});}));
  m.querySelectorAll("[data-cdabsave]").forEach(el=>el.addEventListener("click",()=>{const f=ensureAbilField(c,el.dataset.cdabsave);f.prof=!f.prof;saveRoster();re({});}));
  // Preset chip fields (B148): add via the datalist input, click a chip to cycle its state, the × to remove.
  const addChip=(f,el)=>{const val=el.value.trim();if(!val)return;
    if(f.k==="dmgmod"){const t=DMG_TYPES.find(x=>x.toLowerCase()===val.toLowerCase());if(t&&!f.v.some(e=>e.t===t)){f.v.push({t,m:"res"});saveRoster();re({});return;}}
    else{const key=Object.keys(SKILLS).find(s=>s.replace(/_/g," ").toLowerCase()===val.toLowerCase());if(key&&!f.v.some(e=>e.s===key)){f.v.push({s:key,e:1});saveRoster();re({});return;}}
    el.value="";};
  m.querySelectorAll("[data-cdchipadd]").forEach(el=>{const f=c.fields[+el.dataset.cdchipadd];if(!f)return;
    el.addEventListener("change",()=>addChip(f,el));
    el.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();addChip(f,el);}});});
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
  {const us=m.querySelector("[data-cdunsync]");if(us)us.addEventListener("click",()=>{const a=state.adv.find(x=>x.id===curAdv);if(a)unsyncPartyMember(a,rid);closeModal();});}
  m.querySelector("[data-cddelete]").addEventListener("click",()=>{const del=()=>{deleteRosterChar(rid);closeModal();if(state.selAdv)renderAdvDetail();};
    if(charIsBlank(c))del();else confirmStack(`Delete "${esc(c.name||"this character")}" everywhere? It's removed from every adventure.`,del);});
}
// Whether a notes field is added to a newly-created item, per Settings (B65).
function notesDefault(kind){return !!(state.settings&&state.settings.notes&&state.settings.notes[kind]);}
function blankEncounter(sceneId){return {id:uid(),name:"",archived:false,status:"draft",notes:"",notesOn:notesDefault("encounter"),sceneId:sceneId||null,combatants:[]};}
// Effective lifecycle status: archived (the operative flag) wins, then a running combat reads "active",
// else the stored status. (CT7)
function encStatus(e){return e.archived?"archived":(e.combat&&e.combat.active?"active":(e.status||"draft"));}
function applyEncStatus(e,st){if(st==="archived"){e.archived=true;}else{e.archived=false;e.status=st;}}
function setEncStatus(a,e,st){applyEncStatus(e,st);saveAdv();renderAdvDetail();}
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
function addScene(a){a.scenes.push({id:uid(),name:"",collapsed:false,notes:"",notesOn:notesDefault("scene"),archived:false});saveAdv();renderAdvDetail();}
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
      ${s.notesOn?`<label class="f scenenotes"><textarea data-scenenotes="${s.id}" placeholder="Scene notes — premise, transitions, pacing…">${esc(s.notes||"")}</textarea></label>`:""}
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
function budMarksHTML(bud){
  const m=(cls,lbl,xp)=>{const pct=bud[2]?clamp(xp/bud[2]*100,0,100):0;return `<div class="bud-mark ${cls}" style="left:${pct}%" data-budtip="${lbl} · ${xp.toLocaleString()} XP"></div>`;};
  return m("bm-low","Low",bud[0])+m("bm-mod","Moderate",bud[1])+m("bm-high","High",bud[2]);
}
function encTargetActive(e){return e.target!=null;}
function encTargetVal(e,bud){return e.target!=null?clamp(e.target,0,bud[2]):bud[0];}
function combCount(e){return e.combatants.filter(c=>c.type!=="event").reduce((s,c)=>s+Number(c.count||1),0);}
function encReadHTML(a,e,bud,spent){
  const extra=e.combatants.some(c=>c.faction==="Ally")?` · <span style="color:var(--ok)">allies raised budget</span>`:"";
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
  const pill=root.querySelector(".eh .pill");if(pill){pill.className="pill "+cls;pill.textContent=label;}
  const f=root.querySelector(".budget .fill");if(f)f.style.width=pct+"%"; // fill is neutral (--budfill) — the pill conveys risk
  const tgt=root.querySelector(".budget .tgt");if(tgt){tgt.style.left=(encTargetActive(e)?(bud[2]?encTargetVal(e,bud)/bud[2]*100:0):0)+"%";tgt.classList.toggle("inactive",!encTargetActive(e));}
  const read=root.querySelector(".budget .read");if(read)read.innerHTML=encReadHTML(a,e,bud,spent);
  e.combatants.forEach(c=>{const x=root.querySelector(`.cbt[data-cid="${c.id}"] .xpv`);if(x)x.textContent=combatXP(c).toLocaleString()+" XP";});
}
function encHTML(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[cls,label]=diffOf(spent,bud);
  const pct=Math.min(100,bud[2]?spent/bud[2]*100:0);
  const tgt=encTargetVal(e,bud),tgtPct=encTargetActive(e)?(bud[2]?tgt/bud[2]*100:0):0;
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
          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
          ${budMarksHTML(bud)}
          <div class="tgt ${encTargetActive(e)?"":"inactive"}" data-enctgt="${e.id}" style="left:${tgtPct}%" title="Drag to set XP target"><span class="tgt-tip">${encTargetActive(e)?tgt.toLocaleString()+" XP":"set target"}</span></div>
        </div>
        <span class="pill ${cls}">${label}</span>
      </div>
    </div>
    ${e.notesOn?`<label class="f encnotes"><textarea data-encnotes="${e.id}" placeholder="Battlefield notes — terrain, light, hazards, special rules…">${esc(e.notes||"")}</textarea></label>`:""}
    <div data-combat="${e.id}">${e.combatants.map(c=>combatHTML(e,c)).join("")||'<div class="hint" style="margin:4px 0">No combatants yet.</div>'}</div>
    <div class="addrow">
      <button class="addbtn" data-addmon="${e.id}" style="flex:1">＋ Add combatant</button>
      <button class="start-combat${e.combat&&e.combat.active?" resume":""}" data-startcombat="${e.id}" title="${e.combat&&e.combat.active?"Resume combat":"Start combat"}" aria-label="${e.combat&&e.combat.active?"Resume combat":"Start combat"}">${SWORDS_SVG}<span class="sc-label">${e.combat&&e.combat.active?"Resume":"Start combat"}</span></button>
    </div>
  </div>`;
}
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
  q("[data-encnotes-tog]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encnotesTog);if(e){e.notesOn=!e.notesOn;if(!e.notesOn)e.notes="";saveAdv();renderAdvDetail();}}));
  q("[data-enccollapse]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.enccollapse);e.collapsed=!e.collapsed;saveAdv();renderEncList(a);}));
  q("[data-encmove]").forEach(el=>el.addEventListener("click",()=>{const[id,where]=el.dataset.encmove.split(":");moveEncTo(a,id,where);}));
  q("[data-encpin]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encpin);if(e){e.pinned=!e.pinned;saveAdv();renderAdvDetail();}}));
  q("[data-scenepin]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenepin);if(s){s.pinned=!s.pinned;saveAdv();renderAdvDetail();}}));
  q("[data-scenemove]").forEach(el=>el.addEventListener("click",()=>{const[id,where]=el.dataset.scenemove.split(":");moveSceneTo(a,id,where);}));
  q("#addScene").forEach(el=>el.addEventListener("click",()=>addScene(a)));
  q("[data-scenename]").forEach(el=>el.addEventListener("change",()=>{const s=sceneOf(a,el.dataset.scenename);if(s){s.name=el.value.trim()||"Scene";saveAdv();}}));
  q("[data-scenenotes]").forEach(el=>el.addEventListener("input",()=>{const s=sceneOf(a,el.dataset.scenenotes);if(s){s.notes=el.value;saveAdv();}}));
  q("[data-scenecollapse]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenecollapse);if(s){s.collapsed=!s.collapsed;saveAdv();renderEncList(a);}}));
  q("[data-scenearch]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenearch);if(s){s.archived=!s.archived;saveAdv();renderAdvDetail();}}));
  q("[data-scenenotes-tog]").forEach(el=>el.addEventListener("click",()=>{const s=sceneOf(a,el.dataset.scenenotesTog);if(s){s.notesOn=!s.notesOn;if(!s.notesOn)s.notes="";saveAdv();renderAdvDetail();}}));
  q("[data-sceneadd]").forEach(el=>el.addEventListener("click",()=>{const e=blankEncounter(el.dataset.sceneadd);a.encounters.push(e);a._focusEnc=e.id;saveAdv();renderAdvDetail();}));
  q("[data-scenedel]").forEach(el=>el.addEventListener("click",()=>{const sid=el.dataset.scenedel,s=sceneOf(a,sid);if(!s)return;const n=a.encounters.filter(e=>e.sceneId===sid).length;
    const go=()=>{a.encounters.forEach(e=>{if(e.sceneId===sid)e.sceneId=null;});a.scenes=a.scenes.filter(x=>x.id!==sid);saveAdv();renderAdvDetail();};
    n?confirmModal(`Delete scene "${s.name}"? Its ${n} encounter${n>1?"s":""} will become ungrouped.`,go):go();}));
  bindEncDrag(a,q);
  bindEncTarget(a,q);
  q("[data-addmon]").forEach(el=>el.addEventListener("click",()=>openBestiaryPicker(a,findEnc(a,el.dataset.addmon))));
  q("[data-pushenc]").forEach(el=>el.addEventListener("click",()=>pushEncounter(a,findEnc(a,el.dataset.pushenc))));
  q("[data-startcombat]").forEach(el=>el.addEventListener("click",()=>runCombat(a,findEnc(a,el.dataset.startcombat))));
  q("[data-encstatus]").forEach(el=>el.addEventListener("click",()=>openEncStatusMenu(a,findEnc(a,el.dataset.encstatus),el)));
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
  const group=pinSort(a.encounters.filter(x=>x.archived===e.archived)),pos=group.indexOf(e);
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
// Scene reorder by menu (top/up/down/bottom), within the active or archived group. Pinned scenes
// still float to the top at render. Mirrors moveEncTo (B78).
function setSceneGroupOrder(a,archived,group){let k=0;a.scenes.forEach((x,i)=>{if(!!x.archived===!!archived)a.scenes[i]=group[k++];});}
function moveSceneTo(a,id,where){
  const s=sceneOf(a,id);if(!s)return;
  const group=pinSort((a.scenes||[]).filter(x=>!!x.archived===!!s.archived)),pos=group.indexOf(s);
  let tgt=where==="up"?pos-1:where==="down"?pos+1:where==="top"?0:group.length-1;
  tgt=clamp(tgt,0,group.length-1);if(tgt===pos)return;
  group.splice(pos,1);group.splice(tgt,0,s);setSceneGroupOrder(a,s.archived,group);saveAdv();renderAdvDetail();
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
    // Ring the draggable marker in a threshold's colour when it sits exactly on that threshold (CT7c).
    const ring=()=>{const bud=encBudget(a,e),THR=[["#5fa873",bud[0]],["var(--warn)",bud[1]],["var(--bad)",bud[2]]];
      const hit=encTargetActive(e)&&THR.find(t=>encTargetVal(e,bud)===t[1]);
      handle.style.boxShadow=hit?`0 0 0 2px ${hit[0]}, 0 1px 3px rgba(0,0,0,.6)`:"";};
    const apply=clientX=>{const r=track.getBoundingClientRect(),bud=encBudget(a,e);
      let frac=clamp((clientX-r.left)/r.width,0,1),val=clamp(Math.round(frac*bud[2]/25)*25,0,bud[2]);
      // Snap to a Low/Mod/High threshold when the marker is dragged within ~3% of it.
      [bud[0],bud[1],bud[2]].forEach(thr=>{if(bud[2]&&Math.abs(frac-thr/bud[2])<0.03)val=thr;});
      e.target=val;handle.style.left=(bud[2]?val/bud[2]*100:0)+"%";if(tip)tip.textContent=val.toLocaleString()+" XP";ring();updateEncMeta(a,e);};
    ring();
    handle.addEventListener("pointerdown",ev=>{ev.preventDefault();ev.stopPropagation();dragging=true;closePopover();handle.classList.add("drag");try{handle.setPointerCapture(ev.pointerId);}catch(_){}apply(ev.clientX);});
    handle.addEventListener("pointermove",ev=>{if(dragging)apply(ev.clientX);});
    handle.addEventListener("pointerup",ev=>{if(!dragging)return;dragging=false;handle.classList.remove("drag");try{handle.releasePointerCapture(ev.pointerId);}catch(_){}saveAdv();});
    // Hover the draggable marker → spent / on-target comment (replaces the old text read-out).
    handle.addEventListener("mouseenter",()=>{if(!dragging)tailPopover(handle,`<div class="bud-pop">${encReadHTML(a,e,encBudget(a,e),encSpent(e))}</div>`);});
    handle.addEventListener("mouseleave",()=>{if(!dragging)closePopover();});
    // Hover a fixed threshold marker → the XP it represents.
    track.querySelectorAll("[data-budtip]").forEach(mk=>{
      mk.addEventListener("mouseenter",()=>tailPopover(mk,`<div class="bud-pop">${esc(mk.dataset.budtip)}</div>`));
      mk.addEventListener("mouseleave",()=>closePopover());});
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
function forgeForEncounter(a,e){pendingForge={advId:a.id,encId:e.id};loadMonster(blankMonster());showBanner(`Forging a new monster for “${e.name}”. Save to add it to that encounter.`,()=>{pendingForge=null;hideBanner();});switchView("forge");}
function pushEncounter(a,e){
  const bud=encBudget(a,e),spent=encSpent(e),[,label]=diffOf(spent,bud);
  const payload={forge:"encounter",v:2,adventure:a.name,encounter_tag:`${a.name} / ${e.name}`,
    party:{size:(a.party||[]).length,levels:advPartyLevels(a)},
    battlefield_notes:e.notes||"",
    budget:{low:bud[0],moderate:bud[1],high:bud[2],spent,reads_as:label,note:"allies (faction Ally) already folded into budget via CR→level"},
    combatants:e.combatants.filter(c=>c.type!=="event").map(c=>{const m=c.type==="monster"?monOf(c):null;return{kind:c.type,statblock_name:c.type==="monster"?(m?m.name:"(missing)"):null,nickname:c.nickname||null,cr:combatCR(c),minion:combatIsMinion(c),xp_each:combatXPEach(c),count:Number(c.count),faction:c.faction};}),
    environment_entities:e.combatants.filter(c=>c.type==="event").map(c=>({name:c.name||"(unnamed)",initiative:c.init||null,description:c.text||""}))};
  const txt="<<CLAUDE-FORGE / create the Enemy/Ally combatants below as Nemici entries in Notion, link each to its Statblock by name (use nickname as the entry Name when given, else the statblock name), set Faction & Status=Alive, and ROLL initiative for each (d20 + the statblock's DEX mod). Add environment_entities and battlefield_notes as encounter notes, not as statblock-linked enemies. Flag any statblock name not found.>>\n```json\n"+JSON.stringify(payload,null,2)+"\n```";
  copyModal("Copy encounter for Claude",txt,"Paste in chat — I create the combatant entries, link statblocks, roll initiative, and attach the notes/entities.");
}
