// Monster Forge — APP: settings render, shared modal/popover primitives, preset-library manager,
// global key/pointer handlers, and the init IIFE (loaded LAST — it boots everything).
// Loaded as a classic <script> sharing ONE global scope with the other files (data.js, parsers.js,
// core/forge/engine/bestiary/adventures/app — in that order). No imports/exports. See DEVELOPMENT.md.

function renderSettings(){
  const body=$("#settingsBody");if(!body)return;const s=state.settings;
  const SW=(path,label,sub)=>`<label class="set-row${sub?" sub":""}"><span class="set-lbl">${label}</span><span class="switch"><input type="checkbox" data-set="${path}" ${settingPath(path)?"checked":""}><span class="sl"></span></span></label>`;
  body.innerHTML=`<h2 class="set-title">Settings</h2>
    <div class="set-card">
      <div class="set-head">Statblock colour-coding</div>
      ${SW("colorCode.on","Enable colour-coding")}
      <div class="set-note">Colours the Forge statblock preview only.</div>
    </div>
    <div class="set-card">
      <div class="set-head">Click-to-roll dice<span class="set-kbd">⌘/Ctrl-click anywhere = custom roll</span></div>
      ${SW("clickRoll.on","Enable click-to-roll")}
      <div class="set-note">Click a die, bonus, or save in the preview to roll it; right-click for options.</div>
    </div>
    <div class="set-card">
      <div class="set-head">Definition popovers</div>
      ${SW("refPopovers.on","Spell &amp; condition popovers")}
      <div class="set-note">Hover or click a linked spell or condition to see its rules. The rule finder still shows definitions while it's active.</div>
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
      <div class="set-head">Homebrew rules</div>
      ${SW("homebrew.gritMin","Grit — minimum damage")}
      <div class="set-note">Damage rolls deal at least their maximum possible non-crit value (the sum of every die's top face plus modifiers). Crits still roll and keep the higher result.</div>
    </div>
    <div class="set-card">
      <div class="set-head">Combat tracker</div>
      <div class="set-grid">
        <label class="f">Monster HP<select data-set="combat.hpMode"><option value="rolled" ${s.combat.hpMode==="rolled"?"selected":""}>Roll from Hit Dice</option><option value="average" ${s.combat.hpMode==="average"?"selected":""}>Average (book HP)</option></select></label>
        <label class="f">Auto-roll initiative<select data-set="combat.initMode"><option value="roll" ${s.combat.initMode!=="average"?"selected":""}>On — roll 1d20 + mod</option><option value="average" ${s.combat.initMode==="average"?"selected":""}>Off — average, roll manually</option></select></label>
      </div>
      ${SW("combat.groupInit","Group initiative for identical enemies")}
      ${SW("combat.rollParty","Roll party initiative")}
      ${SW("combat.dexTiebreak","Break initiative ties by DEX")}
      ${SW("combat.partyHP","Track party HP")}
      <div class="set-note">When you run a combat, each monster's HP is rolled from its Hit Dice formula or set to its average, and initiative is rolled (1d20 + mod) or taken as a static average (10 + mod) — you can re-roll everyone from the combat toolbar. With grouped initiative on, all copies of one enemy entry share a single roll; turn it off to roll each separately. Initiative ties fall to the higher Dexterity. Turn off party HP to hide the HP tracker for player characters.</div>
    </div>
    <div class="set-card">
      <div class="set-head set-head-row">Notes fields<span class="switch" title="Toggle all"><input type="checkbox" id="setNotesAll"><span class="sl"></span></span></div>
      ${SW("notes.adventure","Notes on new adventures")}
      ${SW("notes.scene","Notes on new scenes")}
      ${SW("notes.encounter","Notes on new encounters")}
      <div class="set-note">Whether a notes field is added when you create a new item. You can always add or remove one later from its ⋯ menu.</div>
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
  // Notes master toggle (B66): reflects all/some/none and flips all three when clicked.
  {const all=$("#setNotesAll"),n=state.settings.notes,vals=[n.adventure,n.scene,n.encounter],on=vals.filter(Boolean).length;
    if(all){all.checked=on===3;all.indeterminate=on>0&&on<3;
      all.addEventListener("change",()=>{const t=all.checked;n.adventure=n.scene=n.encounter=t;saveSettings();renderSettings();});}}
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
// Ingest a batch of {name,json} blobs: reference sheets first, then bestiary/spell/condition.
// Mutates state + persists each kind; returns a per-file summary. Shared by upload + re-parse (B60).
function ingestLibraries(loaded){
  let bookAdded=false,legAdded=false;
  loaded.forEach(L=>{const k=L.json&&detectJsonKind(L.json);
    if(k==="book"){Object.assign(state.books,parseBooksJSON(L.json));bookAdded=true;state.refMeta.books={file:L.name,count:Object.keys(parseBooksJSON(L.json)).length};}
    if(k==="legendaryGroup"){Object.assign(state.legendaryGroups,parseLegendaryGroupsJSON(L.json));legAdded=true;state.refMeta.legGroups={file:L.name,count:((L.json.legendaryGroup||[]).length)};}});
  _storageFailed=false;
  if(bookAdded){saveBooks();reannotateBooks(true);}
  if(legAdded){saveLegGroups();}
  if(bookAdded||legAdded)saveRefMeta();
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
      else if(kind==="rule"){const p=parseRulesJSON(L.json,L.name,state.books);state.rules=state.rules.filter(x=>x._source!==L.name).concat(p);saveRules();summary.push(`${L.name}: ${p.length.toLocaleString()} rules`);}
      else{const res=parseBestiaryJSON(L.json,L.name,state.books,sessionBestiaryIndex,legIdx);state.presets=state.presets.filter(x=>x._source!==L.name).concat(res.monsters);savePresets();buildMonsterDatalists();summary.push(`${L.name}: ${res.monsters.length.toLocaleString()} statblocks${res.skipped?` (${res.skipped} skipped — base not loaded)`:""}`);}
    }catch(err){summary.push(`${L.name}: failed to parse`);}
  });
  if(legAdded)reapplyLegGroups();
  return summary;
}
// Stash the raw uploaded JSON so libraries can be re-parsed later without re-uploading.
async function stashRawLibs(loaded){
  const valid=loaded.filter(L=>L.json);if(!valid.length)return;
  let raw=await idbGet("rawlibs");raw=Array.isArray(raw)?raw:[];
  const names=new Set(valid.map(L=>L.name));
  raw=raw.filter(L=>!names.has(L.name)).concat(valid);
  await idbSet("rawlibs",raw);
}
// Lightweight loading overlay shown above any modal (B65) — used while re-parsing libraries.
function showLoadingOverlay(title,sub){
  let o=document.getElementById("loadingOverlay");
  if(!o){o=document.createElement("div");o.id="loadingOverlay";o.className="loading-overlay";document.body.appendChild(o);}
  o.innerHTML=`<div class="loading-card"><div class="loading-spin">${D20_ICON}</div><div class="loading-title">${esc(title)}</div>${sub?`<div class="loading-sub">${esc(sub)}</div>`:""}</div>`;
  o.classList.add("show");
}
function hideLoadingOverlay(){const o=document.getElementById("loadingOverlay");if(o)o.classList.remove("show");}
// Replay every stored raw file through the current parser (picks up parser improvements).
async function reparseLibraries(){
  const raw=await idbGet("rawlibs");
  if(!raw||!raw.length){alertStack("Nothing to re-parse","Re-parsing replays the original .json files through the latest parser, but none are stored yet. Upload your libraries once with this version and they'll be re-parseable from then on — no re-upload needed afterwards.");return;}
  // Non-destructive: ingestLibraries replaces each source by name, so libraries without stored raw
  // (e.g. uploaded before this version) are left untouched rather than wiped.
  showLoadingOverlay("Re-parsing libraries","Replaying your stored .json files through the latest parser…");
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); // let the spinner paint before the (blocking) parse
  sessionBestiaryIndex=new Map();
  const summary=ingestLibraries(raw);
  hideLoadingOverlay();
  toast(`Re-parsed ${summary.length} file(s).`);
  if($("#modalBg").classList.contains("show"))presetModal();
  // Diagnostic (B65): flag libraries present in state but with no stored original — those can't be
  // re-parsed and need a one-time re-upload to pick up parser fixes (e.g. the upcasting fix).
  const rawNames=new Set(raw.map(L=>L.name));
  const missing=[...new Set([...state.spells,...state.conditions,...state.rules,...state.presets].map(x=>x._source).filter(Boolean))].filter(n=>!rawNames.has(n));
  if(missing.length)alertStack("Some libraries weren't re-parsed",`These were uploaded before originals were stored, so re-parsing can't reach them: ${missing.join(", ")}. Re-upload each once (Preset libraries → Upload .json files) and they'll pick up the latest parser — including the spell upcasting fix.`);
}
// 5etools JSON uploader (Batch 28). One change handler ingests bestiary / spell /
// condition / books files; the kind is detected from the JSON's top-level keys.
$("#mdIn").addEventListener("change",e=>{
  const files=[...e.target.files];if(!files.length)return;
  Promise.all(files.map(f=>f.text().then(txt=>{let json=null;try{json=JSON.parse(txt);}catch(_){}return{name:f.name,json};})))
    .then(async loaded=>{
      const summary=ingestLibraries(loaded);
      await stashRawLibs(loaded);
      toast(summary.length>1?`Loaded ${summary.length} sources.`:`Loaded — ${summary[0]||"nothing"}`);
      if(_storageFailed)alertStack("Device storage full","Some libraries couldn't be saved and won't persist after a reload. Remove libraries you don't need to free space, then re-upload.");
      if($("#modalBg").classList.contains("show"))presetModal();
    });
  e.target.value="";
});
// ── 5etools .zip import → staging ────────────────────────────────────────────────────────────────
// A whole 5etools data zip can carry thousands of statblocks across dozens of sources, so we DON'T
// commit it wholesale: each content library lands in a temporary list (stagedLibs) shown in the
// preset-libraries popup, where the user ticks which sources to keep. Reference sheets (books +
// legendary groups) apply immediately since the bestiary parser needs them. A source already imported
// (or already staged) is skipped.
let stagedLibs=[]; // [{name, kind, count, book, group, json}] — parsed lightly, not yet committed
const stagedSel=new Set();
// Count + label a 5etools content file without the expensive full parse (mapMonster / _copy).
function lightLibInfo(name,json){
  const kind=detectJsonKind(json);if(!kind||kind==="book"||kind==="legendaryGroup")return null;
  const list=kind==="statblock"?(json.monster||[]):kind==="spell"?(json.spell||[]):kind==="condition"
    ?[].concat(json.condition||[],json.disease||[],json.status||[]):[].concat(json.variantrule||[],json.action||[],json.sense||[],json.skill||[]);
  const sc={};list.forEach(x=>{const s=x.source;if(s)sc[s]=(sc[s]||0)+1;});
  const src=Object.keys(sc).sort((a,b)=>sc[b]-sc[a])[0]||"",b=src&&state.books[src];
  return {name,kind,count:list.length,book:(b&&b.name)||"",group:(b&&b.group)||"",json};
}
async function handleZipArrayBuffer(buf){
  let loaded;
  try{loaded=await unzipJsonFiles(buf);}catch(err){hideLoadingOverlay();alertStack("Couldn't read that .zip",esc(err.message||String(err)));return;}
  // Apply reference sheets (books + legendary groups) right away — the bestiary parser needs them.
  const refs=loaded.filter(L=>{const k=detectJsonKind(L.json);return k==="book"||k==="legendaryGroup";});
  if(refs.length)ingestLibraries(refs);
  // Seed the cross-file _copy index from every statblock file so copies resolve at commit time.
  loaded.forEach(L=>{if(L.json&&L.json.monster)L.json.monster.forEach(m=>{if(m&&m.name)sessionBestiaryIndex.set(((m.name||"")+"|"+(m.source||"")).toLowerCase(),m);});});
  const committed=new Set(presetLibraries().map(L=>libKey(L.kind,L.name)));
  const stagedKeys=new Set(stagedLibs.map(L=>libKey(L.kind,L.name)));
  let added=0,skipped=0;
  loaded.forEach(L=>{const info=lightLibInfo(L.name,L.json);if(!info)return;const key=libKey(info.kind,info.name);
    if(committed.has(key)||stagedKeys.has(key)){skipped++;return;}
    stagedLibs.push(info);stagedKeys.add(key);added++;});
  hideLoadingOverlay();
  if(!added){toast(skipped?`Nothing new — all ${skipped} source${skipped===1?" is":"s are"} already imported.`:"No 5etools libraries found in that zip.");if(stagedLibs.length)presetModal();return;}
  presetModal();
  toast(`${added} source${added===1?"":"s"} ready to review${skipped?` · ${skipped} already imported`:""}.`);
}
// Commit the ticked staged libraries: full-parse + persist + stash for re-parse, then drop from staging.
async function commitStagedLibs(keys){
  const set=new Set(keys),picked=stagedLibs.filter(L=>set.has(libKey(L.kind,L.name)));if(!picked.length)return;
  showLoadingOverlay("Adding libraries…",`${picked.length} source${picked.length===1?"":"s"}`);
  const loaded=picked.map(L=>({name:L.name,json:L.json}));
  await new Promise(r=>setTimeout(r,30)); // yield so the loading overlay paints before the blocking parse
  const summary=ingestLibraries(loaded);
  await stashRawLibs(loaded);
  stagedLibs=stagedLibs.filter(L=>!set.has(libKey(L.kind,L.name)));keys.forEach(k=>stagedSel.delete(k));
  hideLoadingOverlay();refreshLibPools();
  if(_storageFailed)alertStack("Device storage full","Some libraries couldn't be saved and won't persist after a reload. Remove libraries you don't need, then re-import.");
  presetModal();
  toast(`Added ${summary.length} source${summary.length===1?"":"s"}.`);
}
function discardStaged(keys){const set=new Set(keys);stagedLibs=stagedLibs.filter(L=>!set.has(libKey(L.kind,L.name)));keys.forEach(k=>stagedSel.delete(k));presetModal();}
$("#zipIn").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  showLoadingOverlay("Reading zip…",esc(f.name));
  f.arrayBuffer().then(handleZipArrayBuffer).catch(err=>{hideLoadingOverlay();alertStack("Couldn't read that .zip",esc(err&&err.message||String(err)));});});
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
// Draggable column resizer (B64): the rail and the adventures list collapse via a divider handle —
// like the forge resizer — that snaps to the icon/colour-card view past a breakpoint, with the width
// driven by a CSS var. Double-click the handle resets to default. State persists.
function initColResizer(o){
  const handle=$(o.handle),cont=document.querySelector(o.container);if(!handle||!cont)return;
  let expandedW=o.defaultW,mini=false;
  try{const sw=localStorage.getItem(o.lsW);if(sw)expandedW=clamp(parseInt(sw,10)||o.defaultW,o.minW,o.maxW);mini=localStorage.getItem(o.lsMini)==="1";}catch(e){}
  const setVar=w=>cont.style.setProperty(o.cssVar,w+"px");
  const applyMini=m=>cont.classList.toggle(o.miniClass,m);
  setVar(mini?o.collapsedW:expandedW);applyMini(mini);if(o.onChange)o.onChange();
  let drag=false;
  handle.addEventListener("pointerdown",e=>{drag=true;handle.classList.add("drag");handle.setPointerCapture(e.pointerId);e.preventDefault();});
  handle.addEventListener("pointermove",e=>{if(!drag)return;let w=Math.round(e.clientX-cont.getBoundingClientRect().left);
    if(w<o.snapW){mini=true;setVar(o.collapsedW);applyMini(true);}
    else{mini=false;w=Math.min(o.maxW,w);expandedW=w;setVar(w);applyMini(false);}});
  const end=e=>{if(!drag)return;drag=false;handle.classList.remove("drag");try{handle.releasePointerCapture(e.pointerId);}catch(_){}
    try{localStorage.setItem(o.lsMini,mini?"1":"0");localStorage.setItem(o.lsW,String(expandedW));}catch(_){}if(o.onChange)o.onChange();};
  handle.addEventListener("pointerup",end);handle.addEventListener("pointercancel",end);
  handle.addEventListener("dblclick",()=>{mini=false;expandedW=o.defaultW;setVar(o.defaultW);applyMini(false);
    try{localStorage.removeItem(o.lsMini);localStorage.removeItem(o.lsW);}catch(_){}if(o.onChange)o.onChange();});
}
initColResizer({handle:"#railResizer",container:".app",cssVar:"--railw",lsW:"mf_railw",lsMini:"mf_railmini",
  defaultW:206,minW:150,maxW:320,snapW:150,collapsedW:58,miniClass:"rail-mini"});
initColResizer({handle:"#advResizer",container:".adv-layout",cssVar:"--advw",lsW:"mf_advw",lsMini:"mf_advmini",
  defaultW:236,minW:160,maxW:380,snapW:150,collapsedW:66,miniClass:"adv-mini",onChange:()=>{if(_curView==="adventures")renderAdvList();}});
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
    // Submenus open leftward by default; flip them rightward when the left edge would be clipped
    // (e.g. an adventure-card menu sitting against the sidebar). B81.
    if(willOpen&&mn.classList.contains("submenu")){mn.classList.remove("flip-right");if(mn.getBoundingClientRect().left<8)mn.classList.add("flip-right");}
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
  bindStatic();buildCRStepper();buildLibSelects();initFsCollapse();initForgeResizer();
  ["sp_walk","sp_climb","sp_fly","sp_swim","sp_burrow","se_darkvision","se_blindsight","se_tremorsense","se_truesight"].forEach(id=>wrapStepper($("#"+id),5));
  wrapStepper($("#f_ac"),1,0);wrapStepper($("#f_init"),1,-20);
  ABILS.forEach(a=>wrapStepper($("#ab_"+a),1,1));
  await loadRefLibs();buildCondDatalist();buildSpellDatalist();
  await loadAll();
  if(typeof maybeApplySeed==="function")maybeApplySeed(); // dev-only local sandbox data (seed.js)
  buildMonsterDatalists();
  // Restore the creature that was being edited + the last open tab across reloads (B78).
  loadMonster(readForgeDraft()||blankMonster());
  combatCtx=readCombatCtx(); // restore an in-progress combat so a reload returns to it (B80)
  let savedView="forge";try{savedView=localStorage.getItem("mf_view")||"forge";}catch(e){}
  if(VIEW_LABELS[savedView]&&savedView!=="forge"&&savedView!=="settings")switchView(savedView);
  hideBootLoader(); // correct tab is set — reveal the app (no Forge flash)
})();
// Remove the boot loader once the app is ready (or on a fatal init error so the page isn't stuck).
function hideBootLoader(){const b=document.getElementById("bootLoader");if(!b)return;requestAnimationFrame(()=>{b.classList.add("hide");setTimeout(()=>b.remove(),450);});}
window.addEventListener("error",hideBootLoader);
