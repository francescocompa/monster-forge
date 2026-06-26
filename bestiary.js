// Monster Forge — BESTIARY: view switching, the bestiary list/cards, the ctrl (filter/sort/group)
// engine, the chassis picker, and library-action popovers.
// Loaded as a classic <script> sharing ONE global scope with the other files (data.js, parsers.js,
// core/forge/engine/bestiary/adventures/app — in that order). No imports/exports. See DEVELOPMENT.md.

function switchView(v){if(_curView!=="settings")_prevView=_curView;_curView=v;if(v!=="library"&&libSel.size)clearLibSel();
  // Leaving the Forge abandons a "forge a monster for this encounter" flow — drop the pending link + banner so
  // a later, unrelated Save can't be mis-routed into that encounter.
  if(v!=="forge"&&typeof pendingForge!=="undefined"&&pendingForge){pendingForge=null;hideBanner();}$$("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$$(".view").forEach(s=>s.classList.toggle("active",s.id==="view-"+v));const gear=$("#settingsBtn");if(gear)gear.classList.toggle("active",v==="settings");
  // Rule finder only applies to statblock surfaces (Forge + Combat) — hide its button elsewhere, and exit
  // the mode if leaving while it's on (B167).
  {const rf=$("#ruleFinderBtn");if(rf){const ok=(v==="forge"||v==="combat");rf.style.display=ok?"":"none";if(!ok&&ruleFinder){ruleFinder=false;document.body.classList.remove("rule-finder");rf.classList.remove("active");rf.innerHTML=RF_Q_ICON;rf.title="Rule finder";closePopover();}}}
  setCrumbs([VIEW_LABELS[v]||"Forge"]);try{localStorage.setItem("mf_view",v);}catch(e){}if(v==="library")renderLibrary();if(v==="adventures"){advListView=false;renderAdvList();}if(v==="combat")renderCombat();if(v==="settings")renderSettings();}
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
// Font Awesome thumbtack (free solid) — pinned-card indicator (B78).
const PIN_SVG=`<svg viewBox="0 0 384 512" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M32 32C32 14.3 46.3 0 64 0L320 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-3.5 0 11.4 148.2c36.2 19.1 65.3 50.7 80.4 89.6c4.8 12.3 2.4 26.3-6.4 36.2S378 384 364.8 384L224 384l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96L19.2 384c-13.2 0-25.3-5.1-34.1-15s-11.2-23.9-6.4-36.2c15.1-38.9 44.2-70.5 80.4-89.6L67.5 64 64 64C46.3 64 32 49.7 32 32z"/></svg>`;
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
  observeChipFade(host); // fade the chip row's overflow edge when it scrolls (shared helper, core.js)
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
  body.querySelectorAll(".grp-head").forEach(h=>{h.addEventListener("click",()=>{const grp=h.closest(".grp");const k=grp.dataset.grpkey;libCollapsed.has(k)?libCollapsed.delete(k):libCollapsed.add(k);grp.classList.toggle("collapsed",libCollapsed.has(k));const btn=h.querySelector(".grp-collapse");if(btn)btn.title=libCollapsed.has(k)?"Expand":"Collapse";});});
}
function capHint(total,shown){return `<div class="hint" style="margin-top:10px">Showing first ${shown.toLocaleString()} of ${total.toLocaleString()}. Refine your search.</div>`;}

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
    {key:"source",label:"Source",get:r=>r.preset?(bookLabelOf(r.m)||"Uploaded"):"Homebrew",values:()=>["Homebrew",...presetSourceLabels()]},
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
// Expand every forge section (B64) — run on each fresh edit so a loaded creature opens fully open.
function expandAllFsBlocks(){
  fsCollapsed.clear();saveFsCollapsed();
  $$("#formCol fieldset.fieldset:not(.optfs)").forEach(fs=>{fs.classList.remove("fs-collapsed");const b=fs.querySelector(".fs-collapse");if(b)b.classList.remove("closed");});
}
// Presets (built-in chassis + uploaded statblocks) are opt-in: they appear only when the
// Status filter includes "Preset" or the list is grouped by status (which gets a Preset group).
function libRecords(){
  const incPreset=(libCtrl.filters.status||[]).includes("Preset")||libCtrl.group==="status";
  let recs=state.lib.map(m=>({m,status:m.status||"Draft",preset:false}));
  if(incPreset)recs=recs.concat(presetPool().map(o=>({m:o.m,status:"Preset",preset:true,src:o.src})));
  return recs;
}
function libEmptyMsg(){return state.lib.length?"No creatures match these controls.":`No creatures yet. Build one in the Forge, paste a 5etools block, or load a 5etools library under <b>Preset libraries</b> to import in bulk.`;}
function buildTagDatalist(){const dl=$("#libTagList");if(dl)dl.innerHTML=[...new Set(state.lib.flatMap(m=>m.tags||[]))].sort((a,b)=>a.localeCompare(b)).map(t=>`<option value="${esc(t)}">`).join("");}
function renderLibrary(){
  buildTagDatalist();buildMonsterDatalists();rebuildLibUsage();
  renderCtrlChips($("#libChips"),libCtrl,LIB_DESC,renderLibrary);
  const body=$("#libBody");const all=libRecords();let recs=ctrlApply(all,libCtrl,LIB_DESC);
  // Pinned cards ignore filters (B78): re-add any pinned creature the filter dropped — flagged dimmed
  // (`_dim`) so it reads as "would be filtered away" — and float every pinned card to the top.
  const shown=new Set(recs.map(r=>r.m));
  const extra=all.filter(r=>!r.preset&&r.m.pinned&&!shown.has(r.m));
  extra.forEach(r=>r._dim=true);
  recs=extra.concat(recs).sort((a,b)=>(b.m.pinned?1:0)-(a.m.pinned?1:0));
  if(libCtrl.group!=="source")recs=collapseVariants(recs,r=>r.preset);
  renderRecords(body,recs,libCtrl,LIB_DESC,{cardOf:r=>r.preset?presetCardHTML(r):cardHTML(r.m,r._dim),emptyMsg:libEmptyMsg(),cap:400,collapsible:true});
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
    guardedLoad(()=>{loadMonster(find(id));switchView("forge");});}));
  body.querySelectorAll("[data-preview]").forEach(b=>b.addEventListener("click",()=>showStatPreview(b,find(b.dataset.preview))));
  body.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>guardedLoad(()=>{loadMonster(find(b.dataset.edit));switchView("forge");})));
  body.querySelectorAll("[data-dup]").forEach(b=>b.addEventListener("click",()=>{const m=clone(find(b.dataset.dup));m.id=uid();m.name+=" (copy)";m.chassis=false;state.lib.unshift(m);saveLib();renderLibrary();toast("Duplicated.");}));
  body.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.del,used=monsterUsage(id),nm=(find(id)||{}).name||"";
    const msg=`Delete “${nm}”?`+(used?` It's used in ${used} encounter${used>1?"s":""}; those combatants will show as unresolved until you re-link or remove them.`:"");
    confirmModal(msg,()=>{if(used)markOrphanedCombatants(id,nm);state.lib=state.lib.filter(x=>x.id!==id);saveLib();if(used)saveAdv();renderLibrary();toast("Deleted.");});}));
  body.querySelectorAll("[data-arch]").forEach(b=>b.addEventListener("click",()=>{const m=find(b.dataset.arch);setStatus(m,m.archived?"Ready":"Archived");}));
  body.querySelectorAll("[data-pinlib]").forEach(b=>b.addEventListener("click",()=>{const m=find(b.dataset.pinlib);if(m){m.pinned=!m.pinned;saveLib();renderLibrary();}}));
  body.querySelectorAll("[data-claude]").forEach(b=>b.addEventListener("click",()=>{const sav=M;M=normalizeMonster(clone(find(b.dataset.claude)));const txt=claudeMonster(M);M=sav;copyModal("Copy for Claude",txt,"Paste in chat: I build the Notion page in MM25 format and set its properties.");}));
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
function closePopover(){hideDiceHelp&&hideDiceHelp();if(_pop){_pop.remove();_pop=null;document.removeEventListener("click",_popOutside,true);}}
// A click inside the floating combo-suggest dropdown (appended to <body>, not the popover) must NOT count
// as "outside" — otherwise picking an effect suggestion would close the whole add-effect popover (B122).
function _popOutside(e){if(_pop&&!_pop.contains(e.target)&&!(e.target.closest&&e.target.closest(".combo-suggest")))closePopover();}
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
    ?`<span class="tag origin chassis" title="From the ${esc(o.name)} chassis (${esc(o.src||"built-in")}), saved without edits">${esc(o.src||"Built-in")}</span>`
    :`<span class="tag origin brew" title="Homebrew: created or edited here">Homebrew</span>`;}
function cardHTML(m,dimmed){const arch=m.archived;return `<div class="card${arch?" archived":""}${m.pinned?" pinned":""}${dimmed?" filtered-out":""}" data-card="${m.id}" draggable="true">
  ${m.pinned?`<span class="card-pin" title="Pinned: ignores filters">${PIN_SVG}</span>`:""}
  <div class="menu-wrap cardmenu">
    <button class="kebab" data-menu="lib-${m.id}" title="More">⋯</button>
    <div class="menu" id="menu-lib-${m.id}">
      <button data-preview="${m.id}">Preview</button>
      <button data-edit="${m.id}">Edit</button>
      <div class="sep"></div>
      <button data-pinlib="${m.id}">${m.pinned?"Unpin":"Pin to top"}</button>
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
  return `<button type="button" class="src-badge srcdrop${built?" built":""}" data-srcdrop="${esc(o.m.name||"")}" title="${vs.length} sources, click to switch">${esc(srcLbl(o.src))} ▾</button>`;
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
// An unedited chassis/preset load doesn't count — loading another over it loses no real work (B66).
function forgeUnsaved(){if(!monsterDirty())return false;if(originOf(M).kind==="chassis")return false;const saved=state.lib.find(x=>x.id===M.id);return !saved||contentSig(M)!==contentSig(saved);}
// Any action that REPLACES the Forge draft M (open another creature, paste-import, edit-in-forge, forge a
// new one) must route through this so unsaved work isn't silently discarded — the same forgeUnsaved() guard
// "New" and "Load chassis" already use. `fn` performs the actual load/switch once confirmed.
function guardedLoad(fn){if(forgeUnsaved())confirmModal("The Forge has unsaved changes that will be lost. Continue?",fn);else fn();}
function startFreshMonster(){guardedLoad(()=>{loadMonster(blankMonster());switchView("forge");});}
// Subtle "unsaved changes" affordance on the save controls — reflects forgeUnsaved() after each edit/save.
function refreshSaveState(){const dirty=typeof M!=="undefined"&&M&&forgeUnsaved();
  $("#forgeSaveFab")&&$("#forgeSaveFab").classList.toggle("is-dirty",!!dirty);
  $("#saveMonster")&&$("#saveMonster").classList.toggle("is-dirty",!!dirty);}
$("#libNew").addEventListener("click",startFreshMonster);
$("#libChassis").addEventListener("click",()=>openChassis());
$("#forgeChassis").addEventListener("click",()=>openChassis(true));
// openImportModal lives in app.js (loaded after this file) — defer the lookup to click time so the
// eager binding doesn't reference a not-yet-declared function (cross-script hoisting; B71 split).
$("#forgePaste").addEventListener("click",()=>openImportModal());
$("#clearForge").addEventListener("click",()=>confirmModal("Clear the Forge? Any unsaved edits to this creature will be lost.",()=>{loadMonster(blankMonster());toast("Cleared.");}));

// Save the current forge creature into the Bestiary (upsert by id). Returns false if unnamed.
function saveCurrentToBestiary(){
  if(!validName())return false;
  const rec=clone(M);rec.chassis=false;rec._savedAt=Date.now();
  const i=state.lib.findIndex(x=>x.id===rec.id);
  if(i>=0)state.lib[i]=rec;else state.lib.unshift(rec);
  saveLib();refreshSaveState();return true;
}
$("#saveMonster").addEventListener("click",async()=>{
  if(!validName())return;
  const rec=clone(M);rec.chassis=false;rec._savedAt=Date.now();
  const i=state.lib.findIndex(x=>x.id===rec.id);
  if(i>=0)state.lib[i]=rec;else state.lib.unshift(rec);
  await saveLib();
  if(pendingForge){const a=state.adv.find(x=>x.id===pendingForge.advId);const e=a&&a.encounters.find(x=>x.id===pendingForge.encId);
    if(e){a._focusEnc=e.id;addMonsterCombatant(e,rec.id);await saveAdv();}
    const pf=pendingForge;pendingForge=null;hideBanner();refreshSaveState();toast("Saved & added to encounter.");state.selAdv=pf.advId;switchView("adventures");return;}
  refreshSaveState();toast(i>=0?"Updated in Bestiary.":"Saved to Bestiary.");
});
$("#pushClaude").addEventListener("click",()=>{if(!validName())return;copyModal("Copy for Claude",claudeMonster(M),"Paste in chat: I build the Notion page in MM25 format and set its properties.");});
$("#copyNotion").addEventListener("click",()=>{if(!validName())return;copyModal("Copy for Notion (manual)",notionSingle(M),"Single-column, paste-safe. Set AC/HP/XP properties by hand.");});
$("#forgeSaveFab").addEventListener("click",()=>$("#saveMonster").click());
$("#forgeStatus").addEventListener("click",e=>{e.stopPropagation();openForgeStatusMenu(e.currentTarget);});
// Popover with a balloon "tail" pointing at the anchor icon, centred horizontally over it.
function tailPopover(anchor,html){const p=showPopover(anchor,html);p.classList.add("tail-pop");const ar=anchor.getBoundingClientRect();const pr=p.getBoundingClientRect();const below=pr.top>=ar.bottom-1;p.classList.toggle("tail-up",below);p.classList.toggle("tail-down",!below);let left=ar.left+ar.width/2-pr.width/2;left=Math.max(8,Math.min(left,window.innerWidth-pr.width-8));p.style.left=left+"px";p.style.setProperty("--tail-x",(ar.left+ar.width/2-left)+"px");return p;}
function showCrHelp(anchor){tailPopover(anchor,`<div class="cr-pop">${crTargetsHTML||"Set a Challenge Rating to see its AC / HP / attack / DC targets."}</div>`);}
$("#crHelp").addEventListener("click",e=>{e.stopPropagation();showCrHelp(e.currentTarget);});
$("#crHelp").addEventListener("mouseenter",e=>showCrHelp(e.currentTarget));
$("#crHelp").addEventListener("mouseleave",()=>closePopover());
const SN_HELP="The noun used for 'the ___' references in text, e.g. set it to 'dragon' and [c] becomes 'the dragon'. Turn on Proper name to drop the article.";
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
  delete b._chassisSig;delete b._preset;delete b._source;bracketizeChassis(b);return b;}
// B59 item 12 — on chassis load, turn matching literals into live bracket tokens: the creature's
// self-reference → [c]/[C] (with a derived short name so display is unchanged), and any DC / +to-hit /
// dice-average that matches the stat block → [SAVE]/[ATK]/[XdY]. Non-matching numbers are left as-is.
function bracketizeChassis(m){
  const words=(m.name||"").trim().split(/\s+/),w=(words[words.length-1]||"").toLowerCase();
  if(w&&m.shortName&&(m.shortName.word||"creature")==="creature")m.shortName={word:w,proper:false,plural:false};
  const fields=["text","trigger","response","extra"];
  const doArr=arr=>(arr||[]).forEach(e=>fields.forEach(f=>{if(e[f]!=null)e[f]=bracketize(e[f],m.name,m);}));
  [m.traits,m.actions,m.bonus,m.reactions,m.legend&&m.legend.items,m.villain&&m.villain.items,m.lair&&m.lair.items].forEach(doArr);
  if(m.regional&&m.regional.text)m.regional.text=bracketize(m.regional.text,m.name,m);
  return m;}
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
  loadMonster(base);switchView("forge");toast("Loaded chassis. Edit & save.");
}
// Add-from-chassis: build the bestiary entry from a chassis, save it, and drop it into the encounter
// without a trip through the Forge.
function openChassisForEncounter(a,e,fromPicker){
  if(!e)return;
  openChassis(false,{onBack:fromPicker?(()=>openBestiaryPicker(a,e)):null,onPick:ch=>{const rec=normalizeMonster(chassisToMonster(ch));rec._savedAt=Date.now();
    a._focusEnc=e.id;state.lib.unshift(rec);saveLib();addMonsterCombatant(e,rec.id);saveAdv();renderEncList(a);
    closeModal();toast(`Added “${rec.name}”, saved to Bestiary.`);}});
}
function findChassis(id){return CHASSIS.find(x=>x.id===id)||enPresets().find(x=>x.id===id);}
function openChassis(fromForge,opts){
  opts=opts||{};
  const ctrl=blankCtrl();ctrl.sort.key="cr";
  const chPool=()=>[...CHASSIS.map(m=>({m,src:"Built-in"})),...enPresets().map(m=>({m,src:bookLabelOf(m)||"Uploaded"}))];
  const desc={search:true,group:true,icons:["filter","sort","group"], // search is an always-open inline field, not an icon
    params:[
      {key:"source",label:"Source",get:r=>r.src,values:()=>["Built-in",...presetSourceLabels()]},
      {key:"cr",label:"CR",fmt:v=>"CR "+v,get:r=>r.m.cr,values:()=>[...new Set(chPool().map(r=>r.m.cr))].sort((a,b)=>(CR_NUM[a]??0)-(CR_NUM[b]??0))},
    ],
    sortKeys:[
      {key:"cr",label:"CR",cmp:(a,b)=>(CR_NUM[a.m.cr]??0)-(CR_NUM[b.m.cr]??0)},
      {key:"name",label:"Name",cmp:(a,b)=>a.m.name.localeCompare(b.m.name)},
    ]};
  const forEnc=!!opts.onPick;
  const helpText=(forEnc?"Picks a base, saves it to your Bestiary, and adds it to the encounter. ":"")+"Generic built-in bases plus any preset libraries you've uploaded. PB/XP/save math is exact; flavor stats are starting points; reskin freely.";
  openModalRaw(`<h3 class="modal-h-row">${opts.onBack?`<button class="modal-back" id="chBack" title="Back" aria-label="Back">${BACK_SVG}</button>`:""}<span>${forEnc?"Add from a chassis":"Start from a chassis"}</span><button class="cr-help" id="chHelp" aria-label="About this picker">?</button></h3>
    <div class="picker-tools"><input type="search" class="picker-search" id="chSearch" placeholder="Search creatures…" autocomplete="off" spellcheck="false"><div class="ctrl-icons" id="chCtrlIcons"></div></div>
    <div class="ctrl-chips" id="chChips"></div>
    <div id="chBody"></div>`);
  if(opts.onBack)$("#chBack").addEventListener("click",()=>{closeModal();opts.onBack();});
  bindHelpHover($("#chHelp"),helpText);
  const chSearch=$("#chSearch");chSearch.value=ctrl.q||"";chSearch.addEventListener("input",()=>{ctrl.q=chSearch.value;draw();});
  setTimeout(()=>chSearch.focus(),0);
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
      if(fromForge===true&&forgeUnsaved())chassisConflictModal(ch);else applyChassis(ch,fromForge===true,false);}));
  }
  bindCtrlIcons($("#chCtrlIcons"),ctrl,desc,draw);
  draw();
}
// Re-render the chassis/spell/condition pools after a library is toggled or removed.
function refreshLibPools(){if(typeof buildSpellDatalist==="function")buildSpellDatalist();if(typeof buildCondDatalist==="function")buildCondDatalist();if(typeof buildMonsterDatalists==="function")buildMonsterDatalists();}
function removeLib(kind,name){
  if(kind==="spell"){state.spells=state.spells.filter(x=>x._source!==name);saveSpells();}
  else if(kind==="condition"){state.conditions=state.conditions.filter(x=>x._source!==name);saveConditions();}
  else if(kind==="rule"){state.rules=state.rules.filter(x=>x._source!==name);saveRules();}
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
const PRESET_HINT="Loads creatures, spells, conditions and rules from 5etools. Download a data <b>.zip</b> from <a href='https://github.com/5etools-mirror-3/5etools-src' target='_blank' rel='noopener'>github.com/5etools-mirror-3/5etools-src</a> (green <b>Code</b> button, then <b>Download ZIP</b>), upload it, and tick the sources to keep. Parsed in your browser; stays on this device.";
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
// ── Shared library list rendering (committed presets AND the zip staging tray use the same toolbar
//    + grouped rows so they filter/sort/group identically). ──────────────────────────────────────
function libCtrlDesc(libs){return {search:true,group:true,
  params:[
    {key:"type",label:"Type",fmt:v=>KIND_LABEL[v]||v,get:r=>r.lib.kind,values:()=>[...new Set(libs.map(L=>L.kind))]},
    {key:"group",label:"Category",fmt:v=>groupLabel(v),get:r=>r.lib.group||"",values:()=>[...new Set(libs.map(L=>L.group).filter(Boolean))].sort((a,b)=>groupLabel(a).localeCompare(groupLabel(b)))},
  ],
  sortKeys:[
    {key:"name",label:"Name",cmp:(a,b)=>a.m.name.localeCompare(b.m.name)},
    {key:"type",label:"Type",cmp:(a,b)=>(KIND_LABEL[a.lib.kind]||"").localeCompare(KIND_LABEL[b.lib.kind]||"")},
    {key:"group",label:"Category",cmp:(a,b)=>groupLabel(a.lib.group).localeCompare(groupLabel(b.lib.group))},
  ]};}
const LIB_GROUP_ORDER=["core","supplement","supplement-alt","setting","setting-alt","adventure","screen","organized-play","other",""];
function libRecs(libs){return libs.map(L=>({m:{name:(L.book||L.name),type:KIND_LABEL[L.kind]},lib:L}));}
// Group the filtered library records by the active group-by control and render each group (header with
// a select-all checkbox + its rows). selSet decides the group checkbox state; rowHTML draws each row.
function libGroupRowsHTML(recs,ctrl,selSet,rowHTML){
  const gk=ctrl.group,gmap=new Map();
  recs.forEach(r=>{let key,label;
    if(gk==="type"){key="t:"+r.lib.kind;label=KIND_LABEL[r.lib.kind]||r.lib.kind;}
    else if(gk==="group"){key="g:"+(r.lib.group||"");label=groupLabel(r.lib.group);}
    else{key="__all";label="All libraries";}
    if(!gmap.has(key))gmap.set(key,{label,items:[]});gmap.get(key).items.push(r.lib);});
  let keys=[...gmap.keys()];
  if(gk==="group")keys.sort((a,b)=>{const ia=LIB_GROUP_ORDER.indexOf(a.slice(2)),ib=LIB_GROUP_ORDER.indexOf(b.slice(2));return (ia<0?99:ia)-(ib<0?99:ib)||gmap.get(a).label.localeCompare(gmap.get(b).label);});
  else keys.sort((a,b)=>gmap.get(a).label.localeCompare(gmap.get(b).label));
  return keys.map(k=>{const g=gmap.get(k),sel=g.items.filter(L=>selSet.has(libKey(L.kind,L.name))).length,allOn=g.items.length>0&&sel===g.items.length;
    return `<div class="lib-grp" data-grpkey="${esc(k)}"><div class="lib-grp-head"><span class="lib-grp-name">${esc(g.label)}</span><span class="grp-n">${g.items.length}</span><label class="lib-check grp" title="Select all in group"><input type="checkbox" class="grp-sel"${allOn?" checked":""}></label></div>${g.items.map(rowHTML).join("")}</div>`;}).join("");
}
function libSub(L){return [L.group?groupLabel(L.group):"",L.count.toLocaleString()+" "+(L.count===1?"entry":"entries"),(L.book?esc(L.name):"")].filter(Boolean).join(" · ");}
function presetRowHTML(L){const isSel=presetSel.has(libKey(L.kind,L.name));
  return `<div class="preset-row${L.enabled?"":" off"}${isSel?" picked":""}" data-kind="${esc(L.kind)}" data-name="${esc(L.name)}"><div class="lib-meta"><div class="lib-title"><b>${esc(L.book||L.name)}</b><span class="kind-badge k-${esc(L.kind)}">${KIND_LABEL[L.kind]}</span>${L.enabled?"":'<span class="off-badge">Off</span>'}</div><div class="hint lib-sub">${libSub(L)}</div></div><label class="lib-check" title="Select"><input type="checkbox" class="lib-sel"${isSel?" checked":""}></label></div>`;}
function stagedRowHTML(L){const isSel=stagedSel.has(libKey(L.kind,L.name));
  return `<div class="staged-row${isSel?" picked":""}" data-stagekey="${esc(libKey(L.kind,L.name))}"><div class="lib-meta"><div class="lib-title"><b>${esc(L.book||L.name)}</b><span class="kind-badge k-${esc(L.kind)}">${KIND_LABEL[L.kind]}</span></div><div class="hint lib-sub">${libSub(L)}</div></div><label class="lib-check" title="Select"><input type="checkbox" class="stage-sel"${isSel?" checked":""}></label></div>`;}
// ── Zip staging tray ──────────────────────────────────────────────────────────────────────────────
let stageCtrl=blankCtrl();      // its own search / filter / sort / group
let stageCollapsed=false;
function stagingHTML(){
  if(!stagedLibs.length)return "";
  const recs=ctrlApply(libRecs(stagedLibs),stageCtrl,libCtrlDesc(stagedLibs));
  const body=stageCollapsed?"":`<div class="ctrl-chips" id="stageChips"></div>
    <div class="staged-rows">${recs.length?libGroupRowsHTML(recs,stageCtrl,stagedSel,stagedRowHTML):'<div class="empty-state" style="padding:14px;font-size:12px">No pending libraries match these filters.</div>'}</div>
    <div class="hint staged-note">Imported from a .zip. Tick the sources to keep, then Add them. Nothing is saved until you do; sources you already have are skipped.</div>`;
  return `<div class="lib-staging${stageCollapsed?" collapsed":""}">
    <div class="lib-staging-head">
      <button class="ls-chev" id="stageCollapse" title="${stageCollapsed?"Expand":"Collapse"}" aria-label="Toggle pending import"><span class="st-chev${stageCollapsed?" closed":""}">${FS_CHEVRON}</span></button>
      <span class="ls-title">Pending import</span><span class="grp-n">${stagedLibs.length}</span>
      <div class="ctrl-icons" id="stageCtrlIcons"></div>
      <div class="lib-actions stage-actions" id="stageActions"><span class="sel-n"></span><button class="btn ghost sm" id="stageClear" style="width:auto" title="Clear selection">Clear</button><button class="btn ghost sm danger-ghost" id="stageDiscardSel" style="width:auto">Discard</button><button class="btn primary sm" id="stageAdd" style="width:auto">Add</button></div>
    </div>
    ${body}</div>`;
}
function stageKeys(){return stagedLibs.map(L=>libKey(L.kind,L.name));}
function stageUpdateUI(){const modal=$("#modal");if(!modal)return;
  const nSel=stageKeys().filter(k=>stagedSel.has(k)).length;
  modal.querySelectorAll(".staged-row").forEach(r=>{const on=stagedSel.has(r.dataset.stagekey);r.classList.toggle("picked",on);const cb=r.querySelector(".stage-sel");if(cb)cb.checked=on;});
  modal.querySelectorAll(".lib-staging .grp-sel").forEach(cb=>{const rows=[...cb.closest(".lib-grp").querySelectorAll(".staged-row")];const sel=rows.filter(r=>stagedSel.has(r.dataset.stagekey)).length;cb.checked=rows.length>0&&sel===rows.length;cb.indeterminate=sel>0&&sel<rows.length;});
  const act=modal.querySelector("#stageActions");if(act){act.classList.toggle("show",nSel>0);const s=act.querySelector(".sel-n");if(s)s.textContent=nSel+" selected";}
}
function presetModal(){
  const libs=presetLibraries();
  const live=new Set(libs.map(L=>libKey(L.kind,L.name)));[...presetSel].forEach(k=>{if(!live.has(k))presetSel.delete(k);});
  const desc=libCtrlDesc(libs);
  const recs=ctrlApply(libRecs(libs),presetCtrl,desc);
  let h=`<h3 class="modal-h-row"><span>Preset libraries</span><button class="cr-help" id="prHelp" aria-label="About preset libraries">?</button></h3>`;
  h+=stagingHTML();
  h+=`<div class="lib-toolbar"><div class="ctrl-chips" id="prChips"></div><div class="ctrl-icons" id="prCtrlIcons"></div></div>`;
  h+=`<div class="lib-actions" id="prActions"><span class="sel-n"></span><button class="btn ghost sm" id="prClearSel" style="width:auto" title="Clear selection">Clear</button><label class="switch" title="Enable / disable selected"><input type="checkbox" id="prToggle"><span class="sl"></span></label><button class="binbtn" id="prRemove" title="Remove selected">${TRASH_SVG}</button></div>`;
  h+=`<div class="lib-scroll">`;
  if(!libs.length)h+=`<div class="empty-state" style="padding:26px">No preset libraries uploaded yet.</div>`;
  else if(!recs.length)h+=`<div class="empty-state" style="padding:26px">No libraries match these filters.</div>`;
  else h+=libGroupRowsHTML(recs,presetCtrl,presetSel,presetRowHTML);
  h+=`</div>`;
  // reference sheets — subdued, outside any grouping
  const refs=[];
  if(state.refMeta.books&&Object.keys(state.books).length)refs.push({k:"books",label:"Book reference",file:state.refMeta.books.file,count:Object.keys(state.books).length,unit:"sources"});
  if(state.refMeta.legGroups&&Object.keys(state.legendaryGroups).length)refs.push({k:"leg",label:"Legendary groups",file:state.refMeta.legGroups.file,count:Object.keys(state.legendaryGroups).length,unit:"groups"});
  if(refs.length)h+=`<div class="lib-refs">`+refs.map(r=>`<div class="lib-ref"><span class="ref-meta">${esc(r.label)} · ${r.count.toLocaleString()} ${r.unit}<span class="hint"> · ${esc(r.file)}</span></span><button class="ref-x" data-refx="${esc(r.k)}" title="Remove reference">✕</button></div>`).join("")+`</div>`;
  h+=`<div class="lib-foot"><button class="btn ghost sm" id="prClose" style="width:auto">Close</button><div class="split-btn"><button class="btn primary sm" id="prAddZip" style="width:auto">＋ Upload .zip</button><button class="btn primary sm split-caret" id="prMore" style="width:auto" title="More options" aria-label="More options">▾</button></div></div>`;
  openModalRaw(`<div class="preset-mgr">${h}</div>`);
  bindCtrlIcons($("#prCtrlIcons"),presetCtrl,desc,presetModal);
  renderCtrlChips($("#prChips"),presetCtrl,desc,presetModal);
  $("#prClose").addEventListener("click",closeModal);
  $("#prAddZip").addEventListener("click",()=>$("#zipIn").click());
  $("#prMore").addEventListener("click",e=>{e.stopPropagation();
    const p=showPopover(e.currentTarget,`<button class="popitem" data-prm="json">＋ Upload .json files</button><div class="popsep"></div><button class="popitem" data-prm="reparse">↻ Re-parse libraries</button><button class="popitem" data-prm="enableall">Clear all disabled</button>`);
    p.querySelectorAll("[data-prm]").forEach(b=>b.addEventListener("click",ev=>{ev.stopPropagation();const a=b.dataset.prm;closePopover();
      if(a==="json")$("#mdIn").click();
      else if(a==="reparse")reparseLibraries();
      else{state.disabledLibs=[];saveDisabled();refreshLibPools();presetModal();toast("All libraries enabled.");}
    }));});
  bindHelpHover($("#prHelp"),PRESET_HINT);
  $("#modal").querySelectorAll("[data-refx]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.refx;confirmStack(`Remove this reference sheet?`,()=>removeReference(k));}));
  $("#modal").querySelectorAll(".lib-sel").forEach(cb=>cb.addEventListener("change",()=>{const row=cb.closest(".preset-row"),key=libKey(row.dataset.kind,row.dataset.name);if(cb.checked)presetSel.add(key);else presetSel.delete(key);prUpdateSelUI();}));
  $("#modal").querySelectorAll(".lib-scroll .grp-sel").forEach(cb=>cb.addEventListener("change",()=>{cb.closest(".lib-grp").querySelectorAll(".preset-row").forEach(row=>{const key=libKey(row.dataset.kind,row.dataset.name);if(cb.checked)presetSel.add(key);else presetSel.delete(key);});prUpdateSelUI();}));
  // Toggle reflects the selection's combined state: on=all enabled, off=all disabled,
  // mid (indeterminate)=mixed. A click enables all unless they're already all enabled.
  $("#prClearSel").addEventListener("click",()=>{presetSel.clear();prUpdateSelUI();});
  $("#prToggle").addEventListener("change",()=>{const keys=[...presetSel];if(!keys.length)return;
    const allOn=keys.every(k=>{const p=splitLibKey(k);return isLibEnabled(p[0],p[1]);});const target=!allOn;
    keys.forEach(k=>{const p=splitLibKey(k);setLibEnabled(p[0],p[1],target);});refreshLibPools();presetModal();});
  $("#prRemove").addEventListener("click",()=>{const keys=[...presetSel],n=keys.length;if(!n)return;
    confirmStack(`Remove ${n} selected ${n===1?"library":"libraries"}? Their presets are deleted from this device.`,()=>{keys.forEach(k=>{const p=splitLibKey(k);removeLib(p[0],p[1]);});refreshLibPools();presetModal();});});
  $("#modal").querySelectorAll(".lib-scroll .grp-sel").forEach(c=>{const grp=c.closest(".lib-grp"),rows=[...grp.querySelectorAll(".preset-row")],sel=rows.filter(r=>presetSel.has(libKey(r.dataset.kind,r.dataset.name))).length;c.indeterminate=sel>0&&sel<rows.length;});
  prUpdateSelUI();
  // ── Staging (zip import) controls ──
  if(stagedLibs.length){
    const sdesc=libCtrlDesc(stagedLibs);
    {const ci=$("#stageCtrlIcons");if(ci)bindCtrlIcons(ci,stageCtrl,sdesc,presetModal);}
    {const ch=$("#stageChips");if(ch)renderCtrlChips(ch,stageCtrl,sdesc,presetModal);}
    {const col=$("#stageCollapse");if(col)col.addEventListener("click",()=>{stageCollapsed=!stageCollapsed;presetModal();});}
    $("#modal").querySelectorAll(".stage-sel").forEach(cb=>cb.addEventListener("change",()=>{const key=cb.closest(".staged-row").dataset.stagekey;if(cb.checked)stagedSel.add(key);else stagedSel.delete(key);stageUpdateUI();}));
    $("#modal").querySelectorAll(".lib-staging .grp-sel").forEach(cb=>cb.addEventListener("change",()=>{cb.closest(".lib-grp").querySelectorAll(".staged-row").forEach(row=>{const key=row.dataset.stagekey;if(cb.checked)stagedSel.add(key);else stagedSel.delete(key);});stageUpdateUI();}));
    {const cl=$("#stageClear");if(cl)cl.addEventListener("click",()=>{stagedSel.clear();stageUpdateUI();});}
    {const add=$("#stageAdd");if(add)add.addEventListener("click",()=>{const keys=stageKeys().filter(k=>stagedSel.has(k));if(keys.length)commitStagedLibs(keys);});}
    {const dis=$("#stageDiscardSel");if(dis)dis.addEventListener("click",()=>{const keys=stageKeys().filter(k=>stagedSel.has(k));if(keys.length)confirmStack(`Discard ${keys.length} pending ${keys.length===1?"library":"libraries"}? They won't be imported.`,()=>discardStaged(keys));});}
    stageUpdateUI();
  }
}
function chassisConflictModal(ch){
  openModalRaw(`<h3>You have unsaved edits</h3><p class="hint" style="margin:-4px 0 14px">Loading “${esc(ch.name)}”: what should happen to your current edits?</p>
    <div class="cc-choices">
      <button class="btn ghost sm cc-choice cc-go" id="ccSaveNew">Save &amp; New<span class="sub">Save current edits to the Bestiary, then start the chassis</span></button>
      <button class="btn ghost sm cc-choice cc-go" id="ccOverride">Replace<span class="sub">Discard current edits and load the chassis</span></button>
      <button class="btn ghost sm cc-choice cc-back" id="ccBack">Back<span class="sub">Keep editing, don't import</span></button>
    </div>`);
  $("#ccSaveNew").addEventListener("click",()=>{if(!saveCurrentToBestiary())return;closeModal();toast("Saved to Bestiary.");applyChassis(ch,false,false);});
  $("#ccOverride").addEventListener("click",()=>{closeModal();applyChassis(ch,true,false);});
  $("#ccBack").addEventListener("click",closeModal);
}

function aiMenu(a){return `<div class="menu-wrap" style="flex:none"><button class="ai-kbtn" data-menu="aim-${a.id}" title="Options">⋯</button><div class="menu" id="menu-aim-${a.id}">
  <button data-aim-pin="${a.id}">${a.pinned?"Unpin":"Pin to top"}</button>
  ${moveSubmenuHTML("aimmove","aim-move",a.id,pinSort(state.adv.filter(x=>!!x.archived===!!a.archived)),a)}
  <div class="sep"></div>
  <button data-aim-dup="${a.id}">Duplicate</button>
  <button data-aim-arch="${a.id}">${a.archived?"Unarchive":"Archive"}</button>
  <div class="sep"></div>
  <button class="danger" data-aim-del="${a.id}">Delete</button>
</div></div>`;}
// FP4 — per-adventure color identity. Curated palette that reads well on the dark theme.
const ADV_COLORS=["#e2654d","#e08b3f","#d9a941","#ccc24a","#9fb84a","#6aa84f","#4caf7d","#4db6ac","#45a7bf","#5b9bd5","#4f7fc8","#7e8cd6","#8f7bd4","#b07cd6","#c06fc0","#d76a9e","#d2647a","#b6794a","#8a93a0","#7a8290"];
// Clickable color dot before an adventure name (sidebar card + open title). Reusable wherever an
// adventure is shown (e.g. future bestiary grouping by adventure).
function advDot(advId,color){return `<button class="adv-dot${color?"":" none"}" data-advcolor="${advId}"${color?` style="background:${color};border-color:${color}"`:""} title="Adventure color"></button>`;}
// Non-interactive colour dot for showing an adventure's identity colour where clicking shouldn't open
// the colour picker (e.g. a bestiary group header grouped by adventure). Reuses the .adv-dot visual.
function advDotStatic(color){return `<span class="adv-dot static${color?"":" none"}"${color?` style="background:${color};border-color:${color}"`:""}></span>`;}
// Up to 3 word-initials for the collapsed colour-square cards (B65).
function advInitials(name){const w=(name||"").trim().split(/\s+/).filter(Boolean);if(!w.length)return "?";return w.slice(0,3).map(x=>x[0]).join("").toUpperCase();}
// Pick white or dark text for a coloured square based on the colour's luminance (B65).
function contrastOn(hex){if(!hex)return "var(--txt)";let h=hex.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)/255>0.62?"#1a1c21":"#fff";}
// Combined inline style for an adventure card: selected border + the --ai-color/--ai-fg vars the
// collapsed colour-square view reads.
function aiStyle(a){const p=[];
  if(a.color){p.push(`--ai-color:${a.color}`);p.push(`--ai-fg:${contrastOn(a.color)}`);p.push(`--sel-accent:${a.color}`);}else{p.push("--ai-color:var(--panel3)");p.push("--ai-fg:var(--txt)");}
  return ` style="${p.join(";")}"`;}
function openAdvColorMenu(anchor,advId){
  const a=state.adv.find(x=>x.id===advId);if(!a)return;
  const sw=c=>`<button class="adv-sw${a.color===c?" on":""}" data-sw="${c}" style="background:${c}" title="${c}"></button>`;
  const p=showPopover(anchor,`<div class="adv-sw-grid">${ADV_COLORS.map(sw).join("")}</div><button class="popitem" data-sw="" style="margin-top:4px">No color</button>`);
  p.querySelectorAll("[data-sw]").forEach(b=>b.addEventListener("click",()=>{a.color=b.dataset.sw;saveAdv();closePopover();renderAdvList();}));
}
