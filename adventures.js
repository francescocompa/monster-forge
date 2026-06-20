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
  let html=active.map(a=>`<div class="ai ${a.id===state.selAdv?"sel":""}${a.pinned?" pinned":""}" data-adv="${a.id}" draggable="true" title="${esc(advDName(a))}"${aiStyle(a)}>${aiIni(a)}<div class="ai-info"><div class="nm">${advDot(a.id,a.color)}${esc(advDName(a))}</div><div class="dt">${a.uneven?"mixed lvl":(a.size+"× lvl "+a.level)} · ${a.encounters.filter(e=>!e.archived).length} enc.</div></div>${aiPin(a)}${aiMenu(a)}</div>`).join("")||`<div class="hint" style="padding:8px">No adventures yet.</div>`;
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
$("#newAdv").addEventListener("click",()=>{const d=state.settings.defaults,sz=clamp(d.partySize||4,1,12),lv=clamp(d.partyLevel||1,1,20);const a=normalizeAdv({id:uid(),name:"",size:sz,level:lv,uneven:false,levels:Array(sz).fill(lv),notes:"",notesOn:notesDefault("adventure"),encounters:[]});state.adv.unshift(a);advListView=false;state.selAdv=a.id;saveAdv();renderAdvList();});
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
  setCrumbs(["Adventures",advDName(a)]);
  const bud=baseBudget(partyOf(a,null));
  const infoColl=advInfoCollapsed();
  d.innerHTML=`<div class="adv-topbar" data-advcolor="${a.id}" title="Adventure colour"${a.color?` style="background:linear-gradient(90deg,${a.color},color-mix(in srgb,${a.color} 55%,#000))"`:""}></div>
    <div class="adv-detail-body"${a.color?` style="--sel-accent:${a.color}"`:""}>
    <div class="col-head"><div class="ch-left"><button class="adv-back" id="advBack" title="Adventures" aria-label="Open the adventure list">${ADV_TAB_SVG}</button><h2 contenteditable="true" id="advName" data-ph="New Adventure" style="outline:none">${esc(a.name)}</h2><button class="adv-info-toggle" id="advInfoToggle" title="${infoColl?"Show":"Hide"} adventure info" aria-label="Toggle adventure info"><span class="st-chev${infoColl?" closed":""}">${FS_CHEVRON}</span></button></div>
    <div class="menu-wrap" style="flex:none"><button class="kebab" data-menu="adv-opts" title="Adventure options">⋯</button>
    <div class="menu" id="menu-adv-opts">
      <button id="advToggleUneven">${a.uneven?"✓ Uneven levels":"Uneven levels"}</button>
      <button id="advToggleNotes">${a.notesOn?"Remove notes":"Add notes"}</button>
      <div class="sep"></div>
      <button id="advPin">${a.pinned?"Unpin":"Pin to top"}</button>
      <button id="advDuplicate">Duplicate adventure</button>
      <button id="advArchive">${a.archived?"Unarchive":"Archive"} adventure</button>
      <div class="sep"></div>
      <button class="danger" id="delAdv">Delete adventure</button>
    </div></div></div>
    <div id="advInfoWrap"${infoColl?' style="display:none"':""}>
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
    ${a.notesOn?`<label class="f advnotes">Adventure notes<textarea id="advNotes" placeholder="Premise, hooks, party goals, open threads…">${esc(a.notes||"")}</textarea></label>`:""}
    <div class="section-label section-toggle" id="partyHead"><span class="st-chev${partyCollapsed()?" closed":""}">${FS_CHEVRON}</span> Party roster <span class="party-count">${a.party.length}</span></div>
    <div id="partyWrap"${partyCollapsed()?' style="display:none"':""}></div>
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
  $("#advInfoToggle").addEventListener("click",()=>{setAdvInfoCollapsed(!advInfoCollapsed());renderAdvDetail();});
  d.querySelectorAll("[data-advcolor]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openAdvColorMenu(el,el.dataset.advcolor);}));
  const nm=$("#advName");nm.addEventListener("blur",()=>{a.name=nm.textContent.trim();saveAdv();renderAdvList();});
  $("#delAdv").addEventListener("click",()=>confirmModal(`Delete "${advDName(a)}" and its encounters?`,()=>{state.adv=state.adv.filter(x=>x.id!==a.id);state.selAdv=null;saveAdv();renderAdvList();}));
  $("#advPin").addEventListener("click",()=>{a.pinned=!a.pinned;saveAdv();renderAdvList();});
  $("#advDuplicate").addEventListener("click",()=>{const c=normalizeAdv(JSON.parse(JSON.stringify(a)));c.id=uid();c.name=advDName(a)+" (copy)";c.encounters=c.encounters.map(e=>Object.assign({},e,{id:uid()}));state.adv.splice(state.adv.indexOf(a)+1,0,c);state.selAdv=c.id;saveAdv();renderAdvList();});
  $("#advArchive").addEventListener("click",()=>{a.archived=!a.archived;saveAdv();renderAdvList();});
  $("#advToggleUneven").addEventListener("click",()=>{a.uneven=!a.uneven;syncLevels(a);saveAdv();renderAdvDetail();});
  $("#advToggleNotes").addEventListener("click",()=>{a.notesOn=!a.notesOn;if(!a.notesOn)a.notes="";saveAdv();renderAdvDetail();});
  wrapStepper($("#pSize"),1,1);wrapStepper($("#pLevel"),1,1);
  $("#pSize").addEventListener("change",e=>{a.size=clamp(Number(e.target.value||1),1,12);syncLevels(a);saveAdv();renderAdvDetail();});
  $("#pLevel").addEventListener("change",e=>{a.level=clamp(Number(e.target.value||1),1,20);saveAdv();renderAdvDetail();});
  {const an=$("#advNotes");if(an)an.addEventListener("input",e=>{a.notes=e.target.value;saveAdv();});}
  $("#addEnc").addEventListener("click",()=>{const e=blankEncounter();a.encounters.push(e);a._focusEnc=e.id;saveAdv();renderAdvDetail();});
  $("#encAddScene").addEventListener("click",()=>addScene(a));
  $("#encImport").addEventListener("click",()=>openImportEnc(a));
  $("#encArchiveAll").addEventListener("click",()=>{const live=a.encounters.filter(e=>!encArchived(a,e));if(!live.length)return;confirmModal(`Archive all ${live.length} active encounter${live.length>1?"s":""}?`,()=>{live.forEach(e=>e.archived=true);saveAdv();renderAdvDetail();});});
  $("#encClearAll").addEventListener("click",()=>{if(!a.encounters.length)return;confirmModal(`Delete all ${a.encounters.length} encounter${a.encounters.length>1?"s":""} and clear every scene? This cannot be undone.`,()=>{a.encounters=[];a.scenes=[];saveAdv();renderAdvDetail();});});
  bindCtrlIcons($("#encCtrlIcons"),encCtrl,ENC_DESC,()=>renderEncList(a));
  $("#partyHead").addEventListener("click",()=>{setPartyCollapsed(!partyCollapsed());renderAdvDetail();});
  renderPCgrid(a);renderParty(a);renderEncList(a);
}
// Party roster (Combat Tracker, B80): named PCs with AC / HP / initiative + free-form DM fields.
function partyCollapsed(){try{return localStorage.getItem("mf_partycoll")==="1";}catch(e){return false;}}
function setPartyCollapsed(v){try{localStorage.setItem("mf_partycoll",v?"1":"0");}catch(e){}}
// Whole adventure "main info" block (party bar + notes + roster) collapses from the chevron by the title.
function advInfoCollapsed(){try{return localStorage.getItem("mf_advinfocoll")==="1";}catch(e){return false;}}
function setAdvInfoCollapsed(v){try{localStorage.setItem("mf_advinfocoll",v?"1":"0");}catch(e){}}
function blankPC(){return {id:uid(),name:"",ac:"",hp:"",init:"",fields:[]};}
function renderParty(a){
  const box=$("#partyWrap");if(!box)return;
  const rows=a.party.map(p=>`<div class="pc-row" data-pc="${p.id}">
    <div class="pc-main">
      <input class="pc-name" placeholder="Character name" data-pcf="${p.id}:name" value="${esc(p.name)}">
      <label class="pc-stat">AC<input type="number" min="0" data-pcf="${p.id}:ac" value="${p.ac??""}"></label>
      <label class="pc-stat">HP<input type="number" min="0" data-pcf="${p.id}:hp" value="${p.hp??""}"></label>
      <label class="pc-stat">Init<input type="number" data-pcf="${p.id}:init" value="${p.init??""}" placeholder="—" title="Initiative modifier (left blank = rolled flat when combat starts)"></label>
      <button class="iconbtn" data-pcfield="${p.id}" title="Add custom field">＋</button>
      <button class="iconbtn" data-pcdel="${p.id}" title="Remove">✕</button>
    </div>
    ${p.fields.length?`<div class="pc-fields">${p.fields.map((f,i)=>`<span class="pc-field"><input class="pcf-l" placeholder="label" data-pcfl="${p.id}:${i}" value="${esc(f.label)}"><input class="pcf-v" placeholder="value" data-pcfv="${p.id}:${i}" value="${esc(f.value)}"><button class="chipx" data-pcfdel="${p.id}:${i}" title="Remove field">×</button></span>`).join("")}</div>`:""}
  </div>`).join("");
  box.innerHTML=`${rows||`<div class="hint" style="margin:2px 0 6px">No player characters yet. Add them so they roll into the initiative order when you run a combat.</div>`}
    <button class="addbtn" id="addPC" style="width:100%">＋ Add player character</button>`;
  $("#addPC").addEventListener("click",()=>{a.party.push(blankPC());saveAdv();renderAdvDetail();});
  const findPC=id=>a.party.find(p=>p.id===id);
  box.querySelectorAll("[data-pcf]").forEach(el=>{const[id,f]=el.dataset.pcf.split(":");
    el.addEventListener("input",()=>{const p=findPC(id);if(!p)return;p[f]=el.type==="number"?(el.value===""?"":clamp(Number(el.value||0),f==="init"?-20:0,9999)):el.value;saveAdv();});});
  box.querySelectorAll("[data-pcfield]").forEach(el=>el.addEventListener("click",()=>{const p=findPC(el.dataset.pcfield);if(p){p.fields.push({label:"",value:""});saveAdv();renderParty(a);}}));
  box.querySelectorAll("[data-pcdel]").forEach(el=>el.addEventListener("click",()=>{a.party=a.party.filter(p=>p.id!==el.dataset.pcdel);saveAdv();renderAdvDetail();}));
  box.querySelectorAll("[data-pcfl]").forEach(el=>{const[id,i]=el.dataset.pcfl.split(":");el.addEventListener("input",()=>{const p=findPC(id);if(p&&p.fields[i]){p.fields[i].label=el.value;saveAdv();}});});
  box.querySelectorAll("[data-pcfv]").forEach(el=>{const[id,i]=el.dataset.pcfv.split(":");el.addEventListener("input",()=>{const p=findPC(id);if(p&&p.fields[i]){p.fields[i].value=el.value;saveAdv();}});});
  box.querySelectorAll("[data-pcfdel]").forEach(el=>el.addEventListener("click",()=>{const[id,i]=el.dataset.pcfdel.split(":");const p=findPC(id);if(p){p.fields.splice(i,1);saveAdv();renderParty(a);}}));
}
// Whether a notes field is added to a newly-created item, per Settings (B65).
function notesDefault(kind){return !!(state.settings&&state.settings.notes&&state.settings.notes[kind]);}
function blankEncounter(sceneId){return {id:uid(),name:"",archived:false,status:"draft",notes:"",notesOn:notesDefault("encounter"),partyOverride:null,sceneId:sceneId||null,combatants:[]};}
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
          <button data-encovr="${e.id}">${e.partyOverride?"Remove party override":"Override party for this encounter"}</button>
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
    <div class="ovr ${e.partyOverride?"show":""}">${e.partyOverride?ovrInner(e):""}</div>
    ${e.notesOn?`<label class="f encnotes"><textarea data-encnotes="${e.id}" placeholder="Battlefield notes — terrain, light, hazards, special rules…">${esc(e.notes||"")}</textarea></label>`:""}
    <div data-combat="${e.id}">${e.combatants.map(c=>combatHTML(e,c)).join("")||'<div class="hint" style="margin:4px 0">No combatants yet.</div>'}</div>
    <div class="addrow">
      <button class="addbtn" data-addmon="${e.id}" style="flex:1">＋ Add combatant</button>
      <button class="start-combat${e.combat&&e.combat.active?" resume":""}" data-startcombat="${e.id}" title="${e.combat&&e.combat.active?"Resume combat":"Start combat"}" aria-label="${e.combat&&e.combat.active?"Resume combat":"Start combat"}">${SWORDS_SVG}<span class="sc-label">${e.combat&&e.combat.active?"Resume":"Start combat"}</span></button>
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
  q("[data-encovr]").forEach(el=>el.addEventListener("click",()=>{const e=findEnc(a,el.dataset.encovr);e.partyOverride=e.partyOverride?null:{size:a.size,level:a.level,uneven:a.uneven,levels:[...a.levels]};saveAdv();renderAdvDetail();}));
  q("[data-ovrsize]").forEach(el=>el.addEventListener("change",()=>{const e=findEnc(a,el.dataset.ovrsize);e.partyOverride.size=clamp(Number(el.value||1),1,12);e.partyOverride.levels=Array.from({length:e.partyOverride.size},(_,i)=>e.partyOverride.levels[i]??e.partyOverride.level);saveAdv();renderAdvDetail();}));
  q("[data-ovrlevel]").forEach(el=>el.addEventListener("change",()=>{findEnc(a,el.dataset.ovrlevel).partyOverride.level=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));
  q("[data-ovruneven]").forEach(el=>el.addEventListener("change",()=>{const e=findEnc(a,el.dataset.ovruneven);e.partyOverride.uneven=el.checked;e.partyOverride.levels=Array.from({length:e.partyOverride.size},(_,i)=>e.partyOverride.levels[i]??e.partyOverride.level);saveAdv();renderAdvDetail();}));
  q("[data-ovrpc]").forEach(el=>el.addEventListener("change",()=>{const[id,i]=el.dataset.ovrpc.split(":");findEnc(a,id).partyOverride.levels[+i]=clamp(Number(el.value||1),1,20);saveAdv();renderEncList(a);}));
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
      body.innerHTML=html||'<div class="empty-state">No encounters yet — add one below.</div>';
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
function combatBaseName(c){if(c.type==="event")return c.name||"Event";if(c.nickname)return c.nickname;const m=c.type==="monster"?monOf(c):null;return m?m.name:(c.type==="quick"?"Combatant":"?");}
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
function pcInstance(p){const im=p.init===""||p.init==null?0:Number(p.init),man=!rollPartyOn();
  return {id:uid(),kind:"pc",srcId:p.id,srcEntry:"pc:"+p.id,name:p.name||"PC",init:man?null:rollOrAvgInit(im),initMod:im,initRolled:man?false:autoRollOn(),initManual:man,dex:0,
    ac:p.ac===""?null:Number(p.ac),hpMax:p.hp===""?null:Number(p.hp),hpCur:p.hp===""?null:Number(p.hp),
    hpTemp:0,status:"active",conditions:[],comment:"",faction:"PC",groupId:"pc:"+p.id,resources:[]};}
function startCombat(a,e){
  const order=[];
  // Pass 1: total instances per base name → continuous numbering across same-name entries.
  const totals={},offs={};
  e.combatants.forEach(c=>{const n=combatBaseName(c);totals[n]=(totals[n]||0)+Math.max(1,Number(c.count||1));});
  // Pass 2: create, advancing the per-name offset so each entry's numbers follow the previous one's.
  e.combatants.forEach(c=>{const n=combatBaseName(c),cnt=Math.max(1,Number(c.count||1));order.push(...combatantInstances(c,totals[n],offs[n]||0));offs[n]=(offs[n]||0)+cnt;});
  a.party.forEach(p=>order.push(pcInstance(p)));
  sortInitiative(order);
  e.combat={active:true,round:1,turnIndex:0,order};saveAdv();
}
// Live-update (CT7b note 4): pull any encounter combatant / party member not yet in the order into the
// running combat (rolling init/HP), re-sorting while keeping whose turn it is. Returns true if changed.
function syncCombatOrder(a,e){const cb=e.combat;if(!cb)return false;
  const have=new Set(cb.order.map(o=>o.srcEntry||o.groupId));let added=false;
  e.combatants.forEach(c=>{if(!have.has(c.id)){const n=combatBaseName(c),existing=cb.order.filter(o=>(o.name||"").replace(/\s+\d+$/,"")===n).length,cnt=Math.max(1,Number(c.count||1));cb.order.push(...combatantInstances(c,existing+cnt,existing));added=true;}});
  a.party.forEach(p=>{if(!have.has("pc:"+p.id)){cb.order.push(pcInstance(p));added=true;}});
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
  else it.hpCur=clamp(it.hpCur-amt,0,it.hpMax);}
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
function toggleReaction(itId){const it=combatItem(itId);if(!it)return;it.reaction=(it.reaction===false);saveAdv();renderCombat();}
let combatRolling=false; // transient: show the "Rolling initiative…" flourish over a freshly-started order
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
// Step initiative, skipping downed combatants in the travel direction (round wraps as we pass the
// ends). The step cap (>n) guards against an infinite loop when everyone is down. Forward steps
// tick the conditions of the combatant whose turn is beginning (minimal turn/round automation).
function combatAdvance(dir){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,n=cb.order.length;if(!n)return;
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
function addCombatCond(itId,name,rounds,timing){const it=combatItem(itId);if(!it||!name)return;const c={name,rounds:Math.max(0,Number(rounds)||0)};if(timing){if(timing.endWhen==="end")c.endWhen="end";if(timing.endWho)c.endWho=timing.endWho;}(it.conditions=it.conditions||[]).push(c);saveAdv();renderCombat();}
function removeCombatCond(itId,i){const it=combatItem(itId);if(!it||!it.conditions)return;it.conditions.splice(i,1);saveAdv();renderCombat();}
function setCombatNote(itId,text){const it=combatItem(itId);if(!it)return;it.comment=text;saveAdv();renderCombat();}
// Split a count:N group into independent combatants — each re-rolls its own initiative.
function ungroupCombatant(itId){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,it=combatItem(itId);if(!it)return;
  const cur=cb.order[cb.turnIndex];
  cb.order.filter(x=>x.groupId===it.groupId).forEach(x=>{x.init=rollInit(x.initMod||0);x.groupId=x.id;});
  sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));saveAdv();renderCombat();}
function removeCombatant(itId){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,idx=cb.order.findIndex(x=>x.id===itId);if(idx<0)return;
  cb.order.splice(idx,1);if(idx<cb.turnIndex)cb.turnIndex--;
  cb.turnIndex=Math.max(0,Math.min(cb.turnIndex,cb.order.length-1));saveAdv();renderCombat();}
// Condition chip: known conditions become reflinks (global hover/click → definition popover).
function condChipHTML(itId,c,i){
  const known=findCondition(c.name);
  const label=known?`<span class="reflink reflink-plain" data-ref="condition" data-name="${esc(c.name)}">${esc(c.name)}</span>`:`<span>${esc(c.name)}</span>`;
  return `<span class="cc-chip cc-cond${known?" known":""}">${label}${c.rounds>0?`<span class="cc-dur" title="Rounds remaining">${c.rounds}</span>`:""}<button class="cc-x" data-rmcond="${itId}:${i}" title="Remove">×</button></span>`;
}
function condsHTML(it){
  if(it.kind==="event")return "";
  return `<div class="ci-conds">${(it.conditions||[]).map((c,i)=>condChipHTML(it.id,c,i)).join("")}<button class="ci-addcond" data-addcond="${it.id}" title="Add effect">＋</button></div>`;
}
function openCondAdd(itId,anchor,targets){
  const ctx=combatOf(),order=ctx?ctx.e.combat.order:[];
  const self=order.find(o=>o.id===itId),selfName=self?self.name:"this creature";
  const whoItems=order.map(o=>`<button type="button" class="popitem" data-whoid="${esc(o.id)}">${esc(o.name)}</button>`).join("");
  const p=showPopover(anchor,`<div class="cond-add">
    <div class="cond-add-row">
      <div class="cond-combo">
        <input type="text" class="cond-input" placeholder="Effect…" autocomplete="off">
        <button class="cond-combo-chev" type="button" tabindex="-1" aria-label="Show effects">${FS_CHEVRON}</button>
      </div>
      <button class="cond-clock" type="button" title="Set when it ends (whose turn · start/end)">${ALARM_CLOCK_ICON}</button>
      <input type="number" class="cond-rounds" min="0" placeholder="∞" title="Duration in rounds (blank = until removed)">
      <button class="btn primary sm cond-go" style="width:auto">Add</button>
    </div>
    <div class="cond-when" hidden>
      <span class="cw-lbl">ends at</span>
      <button class="cond-edge" type="button" data-edge="start" title="Toggle: ends at turn start / end"><span class="cw-hg">${HOURGLASS_ICON}</span><span class="cw-t">turn start</span></button>
      <span class="cw-lbl">of</span>
      <div class="cond-who-wrap">
        <button type="button" class="cond-who is-self" data-whoid="${esc(itId)}" title="Whose turn ends it"><span class="cw-who-t">${esc(selfName)}</span>${FS_CHEVRON}</button>
        <div class="cond-who-list" hidden>${whoItems}</div>
      </div>
    </div></div>`);
  const inp=p.querySelector(".cond-input"),rd=p.querySelector(".cond-rounds"),clk=p.querySelector(".cond-clock"),when=p.querySelector(".cond-when"),edge=p.querySelector(".cond-edge"),who=p.querySelector(".cond-who"),list=p.querySelector(".cond-who-list");
  inp.focus();
  // Effect-name suggestions as the same custom dropdown as the forge name fields (not a native datalist).
  const condNames=()=>[...new Set(enConditions().map(c=>c.name))].sort((a,b)=>a.localeCompare(b));
  attachCombo(inp,condNames,{});
  // The chevron opens the full suggestion list (filtered by whatever's already typed), like a combo box.
  {const chev=p.querySelector(".cond-combo-chev");if(chev)chev.addEventListener("mousedown",ev=>{ev.preventDefault();
    const q=inp.value.trim().toLowerCase(),items=condNames().filter(v=>{const l=v.toLowerCase();return l!==q&&(!q||l.includes(q));}).slice(0,12);
    showComboSuggest(inp,items,v=>{inp.value=v;inp.focus();});inp.focus();});}
  clk.addEventListener("click",()=>{const open=when.hasAttribute("hidden");when.toggleAttribute("hidden",!open);clk.classList.toggle("on",open);});
  edge.addEventListener("click",()=>{const toEnd=edge.dataset.edge==="start";edge.dataset.edge=toEnd?"end":"start";edge.querySelector(".cw-t").textContent=toEnd?"end turn":"turn start";edge.classList.toggle("is-end",toEnd);edge.classList.remove("pop");void edge.offsetWidth;edge.classList.add("pop");});
  // Custom whose-turn dropdown (inline — showPopover is single-instance so it can't nest in this popover).
  who.addEventListener("click",e=>{e.stopPropagation();const open=list.hasAttribute("hidden");list.toggleAttribute("hidden",!open);who.classList.toggle("open",open);});
  list.querySelectorAll("[data-whoid]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();who.dataset.whoid=b.dataset.whoid;who.querySelector(".cw-who-t").textContent=b.textContent;who.classList.toggle("is-self",b.dataset.whoid===itId);list.setAttribute("hidden","");who.classList.remove("open");}));
  const commit=()=>{const name=(inp.value||"").trim(),timed=!when.hasAttribute("hidden");closePopover();if(!name)return;
    (targets&&targets.length?targets:[itId]).forEach(tid=>addCombatCond(tid,name,rd.value,timed?{endWhen:edge.dataset.edge,endWho:who.dataset.whoid===tid?null:who.dataset.whoid}:null));};
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
function setCombatStatus(itId,status){const it=combatItem(itId);if(!it)return;it.status=status;saveAdv();renderCombat();}
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
// Cycle the combatant status active → waiting → dead → active (CT7b).
function cycleCombatStatus(itId){const it=combatItem(itId);if(!it)return;const i=CI_STATUSES.indexOf(it.status||"active");it.status=CI_STATUSES[(i+1)%CI_STATUSES.length];saveAdv();renderCombat();}
// Edit a combatant's initiative inline, then re-sort the order (preserving whose turn it is).
function setCombatInit(itId,v){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,it=combatItem(itId);if(!it)return;
  if(v===""){it.init=null;it.initRolled=false;} // cleared → blank again
  else{it.init=Number(v)||0;it.initRolled=true;it.initManual=false;} // typing commits it (not a placeholder / blank manual)
  // Re-sort on an init edit only in Initiative mode; in Manual mode the hand-set order is preserved
  // (the edit may change the "out of order" count instead).
  if(combatView(cb).sort==="init"){const cur=cb.order[cb.turnIndex];sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));}
  saveAdv();renderCombat();}
function endCombat(){const ctx=combatOf();if(!ctx)return;confirmModal("End this combat? The initiative order and tracked HP will be cleared.",()=>{ctx.e.combat=null;if(!ctx.e.archived)ctx.e.status="completed";combatRollSrc=null;clearCombatSel();saveAdv();renderCombat();});}
// Compact HP tracker (CT7b): a ratio-coloured bar (current + temp segment), an add-dmg field
// (Enter applies; negative heals; temp absorbs first), an editable current, and the max.
function hpCellHTML(it){
  if(!hpTracked(it))return `<span class="ci-noh"></span>`;
  const max=it.hpMax,cur=it.hpCur,tmp=it.hpTemp||0,ratio=max?cur/max:0;
  const col=ratio>.5?"#5fa873":ratio>.25?"var(--warn)":"var(--bad)";
  const curPct=clamp(max?cur/max*100:0,0,100),tmpPct=clamp(max?tmp/max*100:0,0,100-curPct);
  return `<div class="hpbar" title="${cur} / ${max} HP${tmp?` (+${tmp} temp)`:""}"><i class="hpbar-cur" style="width:${curPct}%;background:${col}"></i>${tmp?`<i class="hpbar-tmp" style="left:${curPct}%;width:${tmpPct}%"></i>`:""}</div>
    <div class="hpline"><input class="hp-dmg" type="number" data-hpdmg="${it.id}" placeholder="dmg" title="Apply damage (negative = heal); temp HP absorbs first"><span class="hp-nums"><input class="hp-cur" type="number" data-hpcur="${it.id}" value="${cur}" title="Current HP"><span class="hp-sl">/</span><span class="hp-max">${max}</span></span>${tmp?`<span class="hp-tmp" title="Temporary HP">+${tmp}</span>`:""}</div>`;
}
// ── CT8: combat view (group / sort / filter) + manual drag-sort ──────────────────────────────────
// cb.order stays the canonical TURN order (advance/turnIndex always follow it). The toolbar's group/
// sort/filter are DISPLAY-only scanning aids — turns never change because of them. The ONE thing that
// reorders the actual turn order is a manual drag (→ sort:"manual"); if that pulls a card out of its
// initiative slot, a soft "out of order" warning offers a one-click restore.
const CV_SORTS=[["init","Initiative"],["manual","Manual"],["name","Name"],["status","Status"],["hp","HP remaining"]];
const CV_GROUPS=[["","None"],["status","Status"],["faction","Faction"],["statblock","Statblock"]];
const CI_STATUS_ORDER={active:0,waiting:1,down:2,dead:3};
const CI_STATUS_GLABEL={active:"Active",waiting:"Waiting",down:"Down",dead:"Dead"};
const GRIP_SVG='<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1.25"/><circle cx="10" cy="4" r="1.25"/><circle cx="6" cy="8" r="1.25"/><circle cx="10" cy="8" r="1.25"/><circle cx="6" cy="12" r="1.25"/><circle cx="10" cy="12" r="1.25"/></svg>';
function combatView(cb){if(!cb.view)cb.view={group:"status",sort:"init",filter:{}};if(!cb.view.filter)cb.view.filter={};return cb.view;}
function ciStatusKey(it){return it.status==="dead"?"dead":isDown(it)?"down":(it.status||"active");}
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
  const v=combatView(cb),rows=combatRows(cb),ti=cb.turnIndex,drag=combatDragOK(cb);
  const rowH=r=>combatRowHTML(r.it,r.idx===ti,drag);
  if(!rows.length)return `<div class="hint" style="padding:6px 2px">No combatants match the filter.</div>`;
  if(!v.group)return rows.map(rowH).join("");
  const groups=new Map();rows.forEach(r=>{const k=combatGroupKey(r.it,v.group);(groups.get(k)||groups.set(k,[]).get(k)).push(r);});
  let keys=[...groups.keys()];
  if(v.group==="status")keys.sort((a,b)=>(CI_STATUS_ORDER[a]??9)-(CI_STATUS_ORDER[b]??9));
  else keys.sort((a,b)=>a.localeCompare(b));
  return keys.map(k=>{const gico=(v.group==="status"&&CI_STATUS_ICON[k])?`<span class="cbt-grp-ico st-${k}">${CI_STATUS_ICON[k]}</span>`:"";
    return `<div class="cbt-group"><div class="cbt-group-h">${gico}${esc(combatGroupLabel(v.group,k))} <span class="cbt-group-n">${groups.get(k).length}</span></div>${groups.get(k).map(rowH).join("")}</div>`;}).join("");
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
  const stOpts=[["active","Active"],["waiting","Waiting"],["down","Down"],["dead","Dead"]];
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
// Re-roll initiative for every combatant (identical-monster groups share one roll), then re-sort.
function rollAllInit(){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,cur=cb.order[cb.turnIndex],byGroup=new Map();
  cb.order.forEach(it=>{const g=it.groupId||it.id;if(!byGroup.has(g))byGroup.set(g,rollOrAvgInit(it.initMod||0));it.init=byGroup.get(g);});
  sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));combatView(cb).sort="init";saveAdv();renderCombat();toast("Initiative re-rolled.");}
// The round-bar d20 (auto-roll-off mode): roll ACTUAL dice for the still-unrolled combatants, animate the
// init cells number-flow style (vertical digit scroll), then commit the values + re-sort.
function rollInitNow(){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,cur=cb.order[cb.turnIndex],byGroup=new Map();
  // Roll (or re-roll) every group — works whether combatants are still unrolled averages or already rolled.
  cb.order.forEach(it=>{if(it.initManual&&it.init==null)return;const g=it.groupId||it.id;if(!byGroup.has(g))byGroup.set(g,rollInit(it.initMod||0));});
  if(!byGroup.size)return;
  animateInitRoll(byGroup,()=>{
    cb.order.forEach(it=>{const g=it.groupId||it.id;if(byGroup.has(g)){it.init=byGroup.get(g);it.initRolled=true;}});
    sortInitiative(cb.order);cb.turnIndex=Math.max(0,cb.order.indexOf(cur));combatView(cb).sort="init";saveAdv();renderCombat();
  });
}
// Build a vertical digit reel per digit of `target` — a 0–9 column (×2 cycles) ending on the digit, so a
// translateY to the end scrolls through the numbers and lands on it (number-flow style).
function nfReelHTML(target){
  return String(target).split("").map(d=>{const seq=[];for(let c=0;c<2;c++)for(let n=0;n<=9;n++)seq.push(n);seq.push(Number(d));
    return `<span class="nf-digit"><span class="nf-col" style="--nf-len:${seq.length}">${seq.map(n=>`<span class="nf-n">${n}</span>`).join("")}</span></span>`;}).join("");
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
    // pane's own overflow clips any cell that's half-hidden under the statblock panel.
    ov.style.cssText=`left:${r.left-pr.left+pane.scrollLeft}px;top:${r.top-pr.top+pane.scrollTop}px;width:${r.width}px;height:${r.height}px`;
    ov.innerHTML=nfReelHTML(target);pane.appendChild(ov);overlays.push(ov);
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
function moveCombatant(itId,dir){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,i=cb.order.findIndex(x=>x.id===itId),j=i+dir;
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
function bindCombatRows(host,dragOK){
  if(!host)return;
  host.querySelectorAll(".cbt-row").forEach(row=>{
    // Suppress the text selection a modifier-click would otherwise drag across rows (B122).
    row.addEventListener("mousedown",e=>{if((e.shiftKey||e.metaKey||e.ctrlKey)&&!e.target.closest(CI_NOSELECT))e.preventDefault();});
    row.addEventListener("click",e=>{if(e.target.closest(CI_NOSELECT))return;const id=row.dataset.ci;
      if(e.shiftKey||e.metaKey||e.ctrlKey)toggleCombatSel(id);else selectOnlyCombat(id);});
    // Double-click a row → make it the current turn (B122).
    row.addEventListener("dblclick",e=>{if(e.target.closest(CI_NOSELECT))return;clearCombatSel();setCurrentTurn(row.dataset.ci);});
  });
  if(!dragOK)return;
  let dragId=null;const clearMarks=()=>host.querySelectorAll(".cbt-row").forEach(r=>r.classList.remove("dragging","drop-before","drop-after"));
  host.querySelectorAll('.cbt-row[draggable="true"]').forEach(row=>{
    row.addEventListener("dragstart",e=>{if(e.target.closest(CI_NOSELECT)){e.preventDefault();return;}dragId=row.dataset.ci;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",dragId);}catch(_){}row.classList.add("dragging");});
    row.addEventListener("dragend",()=>{dragId=null;clearMarks();});
    row.addEventListener("dragover",e=>{if(!dragId)return;e.preventDefault();const r=row.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;row.classList.toggle("drop-after",after);row.classList.toggle("drop-before",!after);});
    row.addEventListener("dragleave",()=>row.classList.remove("drop-before","drop-after"));
    row.addEventListener("drop",e=>{if(!dragId)return;e.preventDefault();const r=row.getBoundingClientRect(),after=e.clientY>r.top+r.height/2;reorderCombatSel(dragId,row.dataset.ci,after);});
  });
}
// Selection action bar — appears above the order when ≥1 card is selected: set status / add an effect /
// apply damage to all selected at once, plus a clear.
// Selection action bar — a floating bar pinned to the centre-bottom of the page (the same .batch-bar
// style as the bestiary/preset multi-select), so it doesn't displace the initiative entries (B122).
function combatSelBarHTML(){const n=combatSelInOrder().length;if(!n)return "";
  const one=n===1?`<button class="btn ghost sm" id="csbTurn">Set current turn</button>`:"";
  return `<div class="batch-bar combat-selbar" id="combatSelBar">
    <span class="bb-n">${n} selected</span>
    <button class="btn primary sm" id="csbStatus">Status ▾</button>
    <button class="btn ghost sm" id="csbEffect">＋ Effect</button>
    <button class="btn ghost sm" id="csbDmg">Damage</button>
    ${one}
    <button class="btn ghost sm" id="csbClear">Clear</button>
  </div>`;}
// Jump the current turn to a combatant (selection-bar "Set current turn" + double-click a row) (B122).
function setCurrentTurn(itId){const ctx=combatOf();if(!ctx)return;const cb=ctx.e.combat,i=cb.order.findIndex(x=>x.id===itId);if(i<0)return;cb.turnIndex=i;saveAdv();renderCombat();}
function setCombatStatusSel(status){combatSelInOrder().forEach(it=>{it.status=status;});saveAdv();renderCombat();}
function applyDmgSel(amt){amt=Math.abs(Number(amt)||0);if(!amt)return;combatSelInOrder().forEach(it=>{if(hpTracked(it))changeHP(it,amt);});saveAdv();renderCombat();}
function openSelStatusMenu(anchor){const p=showPopover(anchor,CI_STATUSES.map(s=>`<button class="popitem has-ico" data-selst="${s}"><span class="csb-ico">${CI_STATUS_ICON[s]}</span>${CI_STATUS_LABEL[s]}</button>`).join(""));
  p.querySelectorAll("[data-selst]").forEach(b=>b.addEventListener("click",()=>{closePopover();setCombatStatusSel(b.dataset.selst);}));}
function openSelDmg(anchor){const p=showPopover(anchor,`<div class="seldmg"><input type="number" class="seldmg-in" min="0" placeholder="dmg" autocomplete="off"><button class="btn primary sm seldmg-go" style="width:auto">Apply</button></div>`);
  const inp=p.querySelector(".seldmg-in");inp.focus();const go=()=>{const v=inp.value;closePopover();applyDmgSel(v);};
  p.querySelector(".seldmg-go").addEventListener("click",go);inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go();}else if(e.key==="Escape")closePopover();});}
function combatRowHTML(it,active,drag){
  const dead=isDown(it),status=it.status||"active",out=dead||status==="dead";
  const manual=it.initManual&&it.init==null,unrolled=!manual&&it.initRolled===false;
  const initEl=it.kind==="event"?`<div class="ci-init" title="Initiative count">${it.init}</div>`
    :`<input class="ci-init-in${manual?" manual":unrolled?" unrolled":""}" type="number" data-initset="${it.id}" ${manual?`value="" placeholder="—"`:unrolled?`value="" placeholder="${it.init}"`:`value="${it.init}"`} title="${manual?"Enter this character's initiative":unrolled?"Average shown — roll initiative, or type to set":"Initiative — edit to re-sort"}">`;
  // Status no longer shows an icon on the row (B122): it reads from the row variant instead — .dead =
  // strikethrough/dim, .waiting = muted + italic, reinforced by the grouped "Waiting"/"Dead" headers.
  // Down (0 HP, not yet marked dead) keeps its own chip.
  const badge=dead?'<span class="ci-down">down</span>':"";
  return `<div class="cbt-row ${cFac(it.faction)}${active?" active":""}${out?" dead":""}${status==="waiting"?" waiting":""}${combatSel.has(it.id)?" selected":""}" data-ci="${it.id}"${drag?' draggable="true"':''}>
    ${initEl}
    <div class="ci-body"><div class="ci-name">${esc(it.name)}${badge}</div>
      ${it.comment?`<div class="ci-note">${esc(it.comment)}</div>`:""}
      ${condsHTML(it)}</div>
    ${it.ac!=null?`<div class="ci-ac" title="Armor Class">AC ${it.ac}</div>`:`<div class="ci-ac"></div>`}
    <div class="ci-hp">${hpCellHTML(it)}</div>
    ${it.kind!=="event"?`<button class="ci-react${it.reaction===false?" used":""}" data-cireact="${it.id}" aria-label="Toggle reaction">${REACT_ICON}</button>`:""}
    <button class="ci-menu" data-cimenu="${it.id}" title="More" aria-label="More">⋯</button>
  </div>`;
}
// Best attack-roll bonus for the quick-ref chip: use explicit attack-mode entries when present, else
// fall back to PB + the better physical mod (the typical weapon attack). Approximate for spellcasters.
function combatAtkBonus(m){const pb=pbForCR(m.cr);let best=null;
  [].concat(m.actions||[],m.bonus||[],(m.legend&&m.legend.items)||[]).forEach(en=>{if(en&&en.mode==="attack"){const b=(en.atk!==""&&en.atk!=null)?Number(en.atk):pb+mod(m[en.ability||"str"]);if(best==null||b>best)best=b;}});
  return best!=null?best:pb+Math.max(mod(m.str),mod(m.dex));}
function combatMainSave(m){if(!m.saves||!m.saves.length)return null;const pb=pbForCR(m.cr);let best=null,ab=null;
  m.saves.forEach(a=>{const b=mod(m[a])+pb;if(best==null||b>best){best=b;ab=a;}});return {ab,bonus:best};}
// Highest save DC the creature imposes (spellcasting etc.) — explicit when present, else 8+PB+ability.
function combatMainDC(m){let best=null;
  [].concat(m.actions||[],m.bonus||[],m.traits||[],(m.legend&&m.legend.items)||[]).forEach(en=>{if(en&&en.mode==="spell"){const pb=pbForCR(m.cr);const dc=(en.dc!==""&&en.dc!=null)?Number(en.dc):8+pb+mod(m[en.ability||"int"]);if(best==null||dc>best)best=dc;}});
  return best;}
// The inner content of the active panel for one combatant: head (name/faction, conditions, quick-ref stat
// chips, resources) + statblock + note. Reused for the active combatant and the selection "peek" preview.
function combatPanelInnerHTML(it){
  const who=it.faction==="PC"?"Player character":(it.kind==="event"?"Event":it.faction);
  const m=it.kind==="monster"?monById(it.srcId):null;
  const conds=it.kind==="event"?"":`<div class="ca-conds">${(it.conditions||[]).map((c,i)=>condChipHTML(it.id,c,i)).join("")}<button class="ci-addcond" data-addcond="${it.id}" title="Add effect">＋ effect</button></div>`;
  // Quick-ref stat chips — the numbers a DM glances at, all on one compact line.
  const chip=(k,v,t)=>`<span class="ca-stat"${t?` title="${t}"`:""}><span class="cas-k">${k}</span><span class="cas-v">${v}</span></span>`;
  const stats=[];
  if(it.ac!=null)stats.push(chip("AC",it.ac));
  if(m){stats.push(chip("ATK",sgn(combatAtkBonus(m)),"Best attack-roll bonus"));
    const dc=combatMainDC(m);if(dc!=null)stats.push(chip("DC",dc,"Highest save DC imposed"));
    const sv=combatMainSave(m);if(sv)stats.push(chip(sv.ab.toUpperCase(),sgn(sv.bonus),"Best saving throw"));}
  if(hpTracked(it))stats.push(chip("HP",`${it.hpCur}/${it.hpMax}${it.hpTemp?` +${it.hpTemp}`:""}`));
  const statRow=stats.length?`<div class="ca-stats">${stats.join("")}</div>`:"";
  const sb=m
    ?`<div class="sb ca-sb" data-sbmon="${it.srcId}"></div>`
    :`<div class="ca-soon">${it.kind==="pc"?"Player character — no statblock to roll from.":it.kind==="event"?"":"Quick combatant — no statblock."}</div>`;
  const note=it.comment
    ?`<div class="ca-noteblock"><div class="ca-note-txt">${esc(it.comment)}</div><button class="ca-noteedit" data-cinote="${it.id}" title="Edit note" aria-label="Edit note">${PEN_ICON}</button></div>`
    :`<button class="ca-addnote" data-cinote="${it.id}">${PEN_ICON} Add note</button>`;
  return `<div class="ca-head">
      <div class="ca-name">${esc(it.name)}<span class="ca-faction">${esc(who)}</span></div>
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
  if(peek)return `<div class="ca-topbar ${cFac(it.faction)}"></div>
    <div class="ca-scroll"><div class="ca-panel">
      <div class="ca-peekhead">
        <div class="ca-name">${esc(it.name)}<span class="ca-faction">${esc(who0)}</span></div>
        <span class="ca-activeflag">Active turn</span>
      </div>
      <div class="ca-divider"></div>
      <div class="ca-peek" data-peek="${esc(peek.id)}">${combatPanelInnerHTML(peek)}</div>
    </div></div>`;
  return `<div class="ca-topbar ${cFac(it.faction)}"></div>
    <div class="ca-scroll"><div class="ca-panel">${combatPanelInnerHTML(it)}</div></div>`;
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
      <div class="ct-encrow"><span class="ct-enc-lg">${esc(encDName(e))}</span><span class="pill sm ${cls}">${label}</span>${drop}</div>
    </div>`;
  const notes=(e.notesOn&&e.notes)?`<div class="ct-notes-wrap"><div class="ct-notes clamped">${esc(e.notes)}</div><button class="ct-notes-more" hidden>more</button></div>`:"";
  return `<div class="ct-bar" style="--ct-accent:${advc}">
    ${title}
    <button class="btn ghost sm ct-loadbtn" id="combatLoadTitle" title="Load a different scene or encounter">${LOAD_ICON}<span>Load encounter</span></button>
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
  const canRoll=!autoRollOn(); // auto-roll off: a manual d20 to roll (or re-roll) initiative is always offered
  return `<div class="ct-roundbar">
    <button class="ct-round" id="combatRoundEdit" title="Set the round">Round ${cb.round}</button>
    <span class="ct-turnline"></span>
    <button class="ct-turnbtn" id="combatPrev" title="Previous turn" aria-label="Previous turn">${CHEV_L}</button>
    <button class="ct-turnbtn" id="combatNext" title="Next turn" aria-label="Next turn">${CHEV_R}</button>
    ${oop?`<button class="ct-oop" id="combatRestoreOrder" title="The turn order was changed by hand and no longer matches initiative — click to restore">⚠ ${oop} out of order</button>`:""}
    ${canRoll?`<button class="ct-d20" id="combatRollInit" title="Roll initiative">${D20_ICON}</button>`:""}
    <button class="ct-toolsbtn${active}" id="combatTools" title="Group · sort · filter · re-roll">${TUNE_ICON}</button>
  </div>`;
}
function openRoundEdit(anchor){
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
    ${oop?`<button class="popitem" data-ctool="restore">Restore initiative order</button>`:""}`;
  const p=showPopover(anchor,html);
  p.querySelectorAll("[data-ctool]").forEach(b=>b.addEventListener("click",ev=>{ev.stopPropagation();const k=b.dataset.ctool;
    if(k==="roll"){closePopover();rollAllInit();}
    else if(k==="restore"){closePopover();restoreInitOrder();}
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
    <p class="hint">${done?"This encounter is marked completed — start it again from the button below.":n?`${n} combatant group${n>1?"s":""} ready${a.party.length?` · ${a.party.length} party member${a.party.length>1?"s":""}`:""}.`:"No combatants in this encounter yet — add some from the Adventures tab."}</p>
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
function renderCombat(){
  const body=$("#combatBody");if(!body)return;
  const ctx=loadedCtx();
  if(!ctx){setCrumbs(["Combat"]);combatRollSrc=null;
    body.innerHTML=`<div class="combat-empty">
      <div class="ce-icon">${SWORDS_SVG}</div>
      <h2>No encounter loaded</h2>
      <p class="hint">Load a scene or encounter to run its initiative — or hit the ⚔ button on an encounter in Adventures.</p>
      <button class="btn primary" id="combatLoad" style="width:auto">Load encounter</button>
    </div>`;
    $("#combatLoad").addEventListener("click",openLoadCombat);return;}
  const {a,e}=ctx,cb=e.combat,sc=sceneOf(a,e.sceneId);
  if(cb&&syncCombatOrder(a,e))saveAdv(); // pick up combatants added to the source encounter (CT7b)
  const cur=cb?cb.order[cb.turnIndex]:null;
  // Attribute rolls made from the active statblock to this combatant (CT4).
  combatRollSrc=(cb&&cur&&cur.kind==="monster")?{name:cur.name,id:cur.srcId||null}:null;
  setCrumbs(["Combat"]); // combat is a top-level tab now, not a sub-section of Adventures (CT7)
  const fab=cb?`<button class="fab combat-fab end" id="combatFab" style="width:auto">End combat</button>`
    :`<button class="fab combat-fab" id="combatFab" style="width:auto">${SWORDS_SVG}<span>${e.status==="completed"?"Restart combat":"Start combat"}</span></button>`;
  // Preserve the scroll position of the order list (and active panel) across the full re-render — selecting
  // or editing a row rebuilds the DOM and would otherwise jump back to the top (B123).
  const _pOrd=body.querySelector(".combat-order"),_pAct=body.querySelector(".ca-scroll");
  const _ordTop=_pOrd?_pOrd.scrollTop:0,_actTop=_pAct?_pAct.scrollTop:0;
  body.innerHTML=combatHeaderHTML(a,e,sc,cb)+(cb?
    combatRoundBarHTML(cb)+`
    <div class="combat-grid">
      <div class="combat-order"><div class="combat-rows" id="combatRows">${combatOrderBodyHTML(cb)}</div><button class="cbt-add" id="combatAddBtn">＋ Add combatant</button>${combatRolling?`<div class="combat-roll-overlay"><span class="cro-die">${D20_ICON}</span><span class="cro-t">Rolling initiative…</span></div>`:""}</div>
      <div class="combat-resizer" id="combatResizer" title="Drag to resize · double-click to reset"></div>
      <div class="combat-active">${combatActiveHTML(cur)}</div>
    </div>${combatSelBarHTML()}`:combatNotStartedHTML(a,e))+fab;
  {const o=body.querySelector(".combat-order");if(o&&_ordTop)o.scrollTop=_ordTop;const ac=body.querySelector(".ca-scroll");if(ac&&_actTop)ac.scrollTop=_actTop;}
  bindCombatResizer();
  const titleBtn=$("#combatLoadTitle");if(titleBtn)titleBtn.addEventListener("click",openLoadCombat);
  // Combat notes: collapse to 2 rows when taller, with a more/less toggle (only shown when it overflows).
  {const nt=$(".ct-notes"),mb=$(".ct-notes-more");if(nt&&mb&&nt.scrollHeight>nt.clientHeight+2){mb.hidden=false;mb.addEventListener("click",()=>{mb.textContent=nt.classList.toggle("clamped")?"more":"less";});}}
  {const ed=$("#combatEncDrop");if(ed)ed.addEventListener("click",ev=>{ev.stopPropagation();openSceneEncMenu(ed,a,e);});}
  $("#combatFab").addEventListener("click",()=>cb?endCombat():runCombat(a,e));
  const addBtn=$("#combatAddBtn");if(addBtn)addBtn.addEventListener("click",()=>openBestiaryPicker(a,e));
  if(!cb)return; // not-started panel has no tracker bindings
  $("#combatPrev").addEventListener("click",()=>combatAdvance(-1));
  $("#combatNext").addEventListener("click",()=>combatAdvance(1));
  {const re=$("#combatRoundEdit");if(re)re.addEventListener("click",ev=>{ev.stopPropagation();openRoundEdit(re);});}
  // CT9-fix: group / sort / filter / roll live in the round-bar tools menu; restore-order is its own chip.
  {const tb=$("#combatTools");if(tb)tb.addEventListener("click",ev=>{ev.stopPropagation();openCombatToolsMenu(tb);});}
  {const ri=$("#combatRollInit");if(ri)ri.addEventListener("click",rollInitNow);}
  {const ro=$("#combatRestoreOrder");if(ro)ro.addEventListener("click",restoreInitOrder);}
  bindCombatRows($("#combatRows"),combatDragOK(cb));
  // Selection action bar (B120): set status / add effect / damage for all selected.
  {const sb=$("#combatSelBar");if(sb){
    const sel=()=>[...combatSel];
    $("#csbStatus").addEventListener("click",e=>{e.stopPropagation();openSelStatusMenu(e.currentTarget);});
    $("#csbEffect").addEventListener("click",e=>{e.stopPropagation();const s=combatSelInOrder();if(s.length)openCondAdd(s[0].id,e.currentTarget,sel());});
    $("#csbDmg").addEventListener("click",e=>{e.stopPropagation();openSelDmg(e.currentTarget);});
    {const t=$("#csbTurn");if(t)t.addEventListener("click",e=>{e.stopPropagation();const s=combatSelInOrder();if(s.length){clearCombatSel();setCurrentTurn(s[0].id);}});}
    $("#csbClear").addEventListener("click",()=>{clearCombatSel();renderCombat();});
  }}
  // Click the empty order background to clear the selection.
  {const co=document.querySelector(".combat-order");if(co)co.addEventListener("click",e=>{if(!e.target.closest(".cbt-row,.combat-selbar,.cbt-add")&&clearCombatSel())renderCombat();});}
  // Current HP edited directly.
  body.querySelectorAll("[data-hpcur]").forEach(el=>el.addEventListener("change",()=>{const it=cb.order.find(x=>x.id===el.dataset.hpcur);if(!it||it.hpMax==null)return;it.hpCur=clamp(Number(el.value||0),0,it.hpMax);saveAdv();renderCombat();}));
  // Add-dmg field: positive = damage (temp first), negative = heal; applied on commit, then cleared.
  body.querySelectorAll("[data-hpdmg]").forEach(el=>el.addEventListener("change",()=>{const it=cb.order.find(x=>x.id===el.dataset.hpdmg),amt=Number(el.value||0);if(!it||!amt){el.value="";return;}changeHP(it,amt);saveAdv();renderCombat();}));
  body.querySelectorAll("[data-initset]").forEach(el=>el.addEventListener("change",()=>setCombatInit(el.dataset.initset,el.value)));
  body.querySelectorAll("[data-cireact]").forEach(el=>{
    el.addEventListener("click",e=>{e.stopPropagation();toggleReaction(el.dataset.cireact);});
    // Hover tooltip (the app's established tail-popover style) explaining the reaction toggle (B122).
    el.addEventListener("mouseenter",()=>{const it=cb.order.find(x=>x.id===el.dataset.cireact);if(!it)return;
      tailPopover(el,`<div class="cr-pop"><b>Reaction — ${it.reaction===false?"used":"available"}</b><br>Each creature gets one reaction per round. Click to toggle; it resets at the start of its turn.</div>`);});
    el.addEventListener("mouseleave",()=>closePopover());
  });
  body.querySelectorAll("[data-cimenu]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openCombatRowMenu(el.dataset.cimenu,el);}));
  body.querySelectorAll("[data-addcond]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openCondAdd(el.dataset.addcond,el);}));
  body.querySelectorAll("[data-cinote]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();openNoteEdit(el.dataset.cinote,el);}));
  body.querySelectorAll("[data-rmcond]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const[id,i]=el.dataset.rmcond.split(":");removeCombatCond(id,+i);}));
  // Resource pips: filled pip → spend one, empty pip → restore one.
  body.querySelectorAll("[data-respip]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();
    const[id,ri,i]=el.dataset.respip.split(":"),it=cb.order.find(x=>x.id===id);if(!it)return;const r=it.resources[+ri];if(!r)return;
    r.used=clamp((+i<(r.max-r.used))?r.used+1:r.used-1,0,r.max);saveAdv();renderCombat();}));
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

function doExportJSON(){
  const data={kind:"monster-forge",exported:new Date().toISOString(),monsters:state.lib,adventures:state.adv};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="monster-forge-backup.json";a.click();URL.revokeObjectURL(url);toast("Exported.");
}
// Export/Import JSON now live in Settings only (B64); the #fileIn change handler is shared.
$("#settingsBtn").addEventListener("click",()=>switchView(_curView==="settings"?_prevView:"settings"));
// Rule finder (B66): hover the (?) for an explainer, click to toggle the study mode.
{const rb=$("#ruleFinderBtn");if(rb){
  rb.addEventListener("mouseenter",()=>{if(!ruleFinder)tailPopover(rb,`<div class="cr-pop"><b>Rule finder</b><br>Highlights every rules-glossary term, condition, and detected spell on the statblock; hover one for its definition. Rolls are paused while it's on. Click to start; click again (✕) to exit.</div>`);});
  rb.addEventListener("mouseleave",()=>{if(!ruleFinder)closePopover();});
  rb.addEventListener("click",e=>{e.stopPropagation();closePopover();toggleRuleFinder();});
}}
// Click-to-roll: delegated on the statblock preview. Left-click = quick roll (attack NAME rolls
// attack + damage); right-click = options popover.
$("#statblock").addEventListener("click",e=>{
  if(!clickRollOn())return;
  const t=e.target.closest("[data-roll]");
  // Alt/Option-click a rollable → open the custom-roll popover pre-filled (same as right-click). Cmd is
  // reserved for multi-select (combat init list / bestiary), so the roll modifier moved to Alt (B122).
  if(t&&e.altKey){e.preventDefault();openRollMenu(t);return;}
  const nm=e.target.closest(".roll-atkname[data-roll]");if(nm){rollAttackSequence(nm);return;}
  // The inner "(Recharge N–N)" tag rolls recharge only; the entry NAME rolls recharge + damage (B78).
  const rt=e.target.closest(".roll-rchtag[data-roll]");if(rt){quickRoll(rt);return;}
  const rn=e.target.closest(".roll-rchname[data-roll]");if(rn){rollRechargeSequence(rn);return;}
  if(t)quickRoll(t);
});
$("#statblock").addEventListener("contextmenu",e=>{const t=e.target.closest("[data-roll]");if(!t||!clickRollOn())return;e.preventDefault();openRollMenu(t);});
// Animated d20 that follows the pointer over anything rollable (a real CSS cursor can't be
// animated). Only active while click-to-roll is on; the native cursor is hidden via .mf-clickroll.
let _diceCur=null;
// Font Awesome d20 (dice-d20, free solid) — used only for the rollable cursor.
const D20_ICON=`<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M48.7 125.8l53.2 31.9c7.8 4.7 17.8 2 22.2-5.9L201.6 12.1c3-5.4-.9-12.1-7.1-12.1c-1.6 0-3.2 .5-4.6 1.4L47.9 98.8c-9.6 6.6-9.2 20.9 .8 26.9zM16 171.7l0 123.5c0 8 10.4 11 14.7 4.4l60-92c5-7.6 2.6-17.8-5.2-22.5L40.2 158C29.6 151.6 16 159.3 16 171.7zM310.4 12.1l77.6 139.6c4.4 7.9 14.5 10.6 22.2 5.9l53.2-31.9c10-6 10.4-20.3 .8-26.9L322.1 1.4c-1.4-.9-3-1.4-4.6-1.4c-6.2 0-10.1 6.7-7.1 12.1zM496 171.7c0-12.4-13.6-20.1-24.2-13.7l-45.3 27.2c-7.8 4.7-10.1 14.9-5.2 22.5l60 92c4.3 6.7 14.7 3.6 14.7-4.4l0-123.5zm-49.3 246L286.1 436.6c-8.1 .9-14.1 7.8-14.1 15.9l0 52.8c0 3.7 3 6.8 6.8 6.8c.8 0 1.6-.1 2.4-.4l172.7-64c6.1-2.2 10.1-8 10.1-14.5c0-9.3-8.1-16.5-17.3-15.4zM233.2 512c3.7 0 6.8-3 6.8-6.8l0-52.6c0-8.1-6.1-14.9-14.1-15.9l-160.6-19c-9.2-1.1-17.3 6.1-17.3 15.4c0 6.5 4 12.3 10.1 14.5l172.7 64c.8 .3 1.6 .4 2.4 .4zM41.7 382.9l170.9 20.2c7.8 .9 13.4-7.5 9.5-14.3l-85.7-150c-5.9-10.4-20.7-10.8-27.3-.8L30.2 358.2c-6.5 9.9-.3 23.3 11.5 24.7zm439.6-24.8L402.9 238.1c-6.5-10-21.4-9.6-27.3 .8L290.2 388.5c-3.9 6.8 1.6 15.2 9.5 14.3l170.1-20c11.8-1.4 18-14.7 11.5-24.6zm-216.9 11l78.4-137.2c6.1-10.7-1.6-23.9-13.9-23.9l-145.7 0c-12.3 0-20 13.3-13.9 23.9l78.4 137.2c3.7 6.4 13 6.4 16.7 0zM174.4 176l163.2 0c12.2 0 19.9-13.1 14-23.8l-80-144c-2.8-5.1-8.2-8.2-14-8.2l-3.2 0c-5.8 0-11.2 3.2-14 8.2l-80 144c-5.9 10.7 1.8 23.8 14 23.8z"/></svg>`;
function diceCursorEl(){if(!_diceCur){_diceCur=document.createElement("div");_diceCur.id="diceCursor";_diceCur.innerHTML=D20_ICON;document.body.appendChild(_diceCur);}return _diceCur;}
let _ptrX=0,_ptrY=0,_cmdHeld=false;
function clickRollOn(){return !ruleFinder&&!!(state.settings&&state.settings.clickRoll&&state.settings.clickRoll.on);}
// Show the spinning d20 over rollable elements, and anywhere while Alt/Option is held (since that arms
// the click-anywhere custom roll). Body gets .cmd-armed so the native cursor hides for the d20 (B61).
function updateDiceCursor(overRoll){
  if((clickRollOn()&&overRoll)||_cmdHeld){const el=diceCursorEl();el.classList.add("show");el.style.left=_ptrX+"px";el.style.top=_ptrY+"px";}
  else if(_diceCur)_diceCur.classList.remove("show");
}
document.addEventListener("mousemove",e=>{_ptrX=e.clientX;_ptrY=e.clientY;updateDiceCursor(e.target.closest&&e.target.closest("[data-roll]"));});
document.addEventListener("keydown",e=>{if(e.key==="Alt"&&!_cmdHeld&&clickRollOn()){_cmdHeld=true;document.body.classList.add("cmd-armed");updateDiceCursor(false);}});
// Esc exits rule finder. If a definition popover is showing, close that first (one Esc per layer);
// note .refpop nodes persist hidden in the DOM, so test for the visible .show class.
document.addEventListener("keydown",e=>{if(e.key!=="Escape"||!ruleFinder)return;
  if($(".refpop.show")){e.preventDefault();hideRefpopNow(0);return;}
  if($(".popover"))return; // let an open popover handle its own Esc
  e.preventDefault();toggleRuleFinder();});
// ⌘/Ctrl-S saves the Forge to the Bestiary (instead of the browser's Save Page dialog). B68.
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&!e.altKey&&(e.key==="s"||e.key==="S")){if(_curView!=="forge")return;e.preventDefault();const b=$("#saveMonster");if(b)b.click();}});
function dropCmd(){if(!_cmdHeld)return;_cmdHeld=false;document.body.classList.remove("cmd-armed");const el=document.elementFromPoint(_ptrX,_ptrY);updateDiceCursor(el&&el.closest&&el.closest("[data-roll]"));}
document.addEventListener("keyup",e=>{if(e.key==="Alt")dropCmd();});
window.addEventListener("blur",dropCmd);
// Alt/Option-click anywhere → quick custom-roll popover at the cursor (skips interactive elements,
// which keep their own click behaviour). Cmd is now reserved for multi-select, so this moved off Cmd (B122).
const ROLL_INERT="input,textarea,select,a,button,label,[data-roll],[data-card],[data-menu],.menu,.menu-wrap,.combo,.popover,.modal,.refpop,.roll-log";
function openCustomRollAt(x,y){openCustomRoll({getBoundingClientRect:()=>({left:x,right:x,top:y,bottom:y,width:0,height:0})});}
document.addEventListener("click",e=>{
  if(!e.altKey||!clickRollOn())return;
  if(e.target.closest(ROLL_INERT))return;
  e.preventDefault();
  openCustomRollAt(e.clientX,e.clientY);
});
// Mobile: a long-press on any non-interactive spot opens the custom roll (the touch equivalent of
// Cmd/Ctrl-click) (B65).
(function(){let timer=null,sx=0,sy=0,fired=false;
  const clear=()=>{if(timer){clearTimeout(timer);timer=null;}};
  document.addEventListener("touchstart",e=>{
    if(!clickRollOn()||e.touches.length!==1)return;
    const t=e.touches[0];if(e.target.closest(ROLL_INERT))return;
    sx=t.clientX;sy=t.clientY;fired=false;
    clear();timer=setTimeout(()=>{fired=true;timer=null;openCustomRollAt(sx,sy);if(navigator.vibrate)navigator.vibrate(15);},500);
  },{passive:true});
  document.addEventListener("touchmove",e=>{if(!timer)return;const t=e.touches[0];if(Math.abs(t.clientX-sx)>10||Math.abs(t.clientY-sy)>10)clear();},{passive:true});
  document.addEventListener("touchend",e=>{clear();if(fired){fired=false;e.preventDefault();}},{passive:false});
  document.addEventListener("touchcancel",clear,{passive:true});
})();
// Read/write a dotted path inside state.settings (e.g. "colorCode.damage").
function settingPath(path,val){const p=path.split(".");let o=state.settings;for(let i=0;i<p.length-1;i++)o=o[p[i]];if(val!==undefined)o[p[p.length-1]]=val;return o[p[p.length-1]];}
async function resyncCloud(){const ok1=await jbinSet("library:monsters",state.lib),ok2=await jbinSet("library:adventures",state.adv);if(ok1&&ok2){setDirty(false);cloudReady=true;toast("Synced to cloud.");}else toast("Sync failed — your work stays on this device.");if($("#view-settings").classList.contains("active"))renderSettings();}
function clearLocalCache(){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf("mf_cache:")===0)keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));toast("Local cache cleared — reload to re-fetch from the cloud.");}
