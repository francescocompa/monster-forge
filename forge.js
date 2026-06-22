// Monster Forge — FORGE: statblock-entry rendering/binding (traits/actions/etc.), the bracket-token
// expander, identity comboboxes, and loadMonster.
// Loaded as a classic <script> sharing ONE global scope with the other files (data.js, parsers.js,
// core/forge/engine/bestiary/adventures/app — in that order). No imports/exports. See DEVELOPMENT.md.

// Render one editor row per entry. Each kind/mode has its own builder; entryHTML just dispatches (B74).
function entryHTML(arr,kind){return arr.map((e,i)=>{
  if(kind==="reactions")return entryReactionHTML(e,i,kind);
  if(kind==="villain")return entryVillainHTML(e,i,kind);
  if(e.mode==="spell")return entrySpellHTML(e,i,kind);
  if(e.mode==="attack")return entryAttackHTML(e,i,kind);
  return entryTextHTML(e,i,kind);
}).join("");}
// Reaction row: name + trigger + response.
function entryReactionHTML(e,i,kind){return `<div class="entry" ${dragAttr(kind,i)}><div class="ehead">${nameField(kind,i,e,"Name")}${rowCtrls(kind,i)}</div>
    <input type="text" placeholder="Trigger" data-k="${kind}" data-i="${i}" data-f="trigger" value="${esc(e.trigger||"")}" style="margin-bottom:6px">
    <textarea placeholder="Response" data-k="${kind}" data-i="${i}" data-f="response">${esc(e.response||"")}</textarea></div>`;}
// Villain-action row: round selector + name + effect.
function entryVillainHTML(e,i,kind){return `<div class="entry" ${dragAttr(kind,i)}><div class="ehead"><select data-k="villain" data-i="${i}" data-f="round" style="width:104px;flex:none">${[1,2,3].map(r=>`<option value="${r}" ${(+e.round||1)===r?"selected":""}>Round ${r}</option>`).join("")}</select>${nameField("villain",i,e,"Name")}<button class="iconbtn" data-rm="villain:${i}">✕</button></div>
    <textarea placeholder="Effect" data-k="villain" data-i="${i}" data-f="text">${esc(e.text||"")}</textarea></div>`;}
// Spellcasting row: ability/DC/atk + spell groups.
function entrySpellHTML(e,i,kind){const pb=pbForCR(M.cr),ab=mod(M[e.ability]||0),dc=e.dc||(8+pb+ab);return `<div class="entry" data-entry-kind="${kind}" data-entry-i="${i}" data-entry-abil="${e.ability}" draggable="true" data-drag><div class="ehead"><span class="kind">Spellcasting</span><span class="entry-dc">DC ${dc}</span>${nameField(kind,i,e,"Spellcasting")}${rowCtrls(kind,i)}</div>
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
// Attack row: kind/ability/atk/reach/range/dice/type/targets + rider.
function entryAttackHTML(e,i,kind){return `<div class="entry" data-entry-kind="${kind}" data-entry-i="${i}" data-entry-abil="${e.ability}" draggable="true" data-drag><div class="ehead"><span class="kind">Attack</span>${nameField(kind,i,e,"Attack name")}${rowCtrls(kind,i)}</div>
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
// Plain text row (traits / generic actions / bonus / legendary / lair): name + description (+ snippets for actions).
function entryTextHTML(e,i,kind){return `<div class="entry" ${dragAttr(kind,i)}><div class="ehead">${nameField(kind,i,e,"Name")}${rowCtrls(kind,i)}</div>
    <textarea placeholder="Description" data-k="${kind}" data-i="${i}" data-f="text">${esc(e.text||"")}</textarea>
    ${kind==="actions"?`<div class="snips">${SNIPS.map((s,si)=>`<button class="snip" data-snip="${si}" data-target="${kind}:${i}">${s[0]}</button>`).join("")}</div>`:""}</div>`;}
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
// `mon` (optional) gates DC/attack-bonus replacement to numbers that actually match this stat block
// (B59 item 12) — so a feature's own DC/+hit becomes a live [SAVE]/[ATK] token, but an unrelated
// hard-coded number is left alone. Without `mon` the replacements are unconditional (import path).
function bracketize(text,srcName,mon){
  if(!text)return text;let t=String(text);
  const AB={strength:"STR",dexterity:"DEX",constitution:"CON",intelligence:"INT",wisdom:"WIS",charisma:"CHA"};
  const ABK={STR:"str",DEX:"dex",CON:"con",INT:"int",WIS:"wis",CHA:"cha"};
  const pb=mon?pbForCR(mon.cr):0,am=a=>mon?mod(mon[a]??10):0,best=mon?Math.max(...ABILS.map(am)):0;
  const okSave=(code,n)=>!mon||+n===8+pb+am(ABK[code]),okBest=n=>!mon||+n===8+pb+best,okAtk=n=>!mon||+n===pb+best;
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
  // "<Ability> Saving Throw: DC N" → keep wording, swap the DC for the token (matching DCs only when mon)
  t=t.replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(\s+Saving\s+Throw:?\s*)DC\s*(\d+)/gi,(m0,ab,mid,n)=>{const c=AB[ab.toLowerCase()];return okSave(c,n)?ab+mid+"["+c+" SAVE]":m0;});
  // "DC N <Ability> saving throw/save" → "[ABIL SAVE] <Ability> saving throw"
  t=t.replace(/DC\s*(\d+)(\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(?:saving throw|save))/gi,(m0,n,rest,ab)=>{const c=AB[ab.toLowerCase()];return okSave(c,n)?"["+c+" SAVE]"+rest:m0;});
  // any remaining bare "DC N" → highest-ability save DC
  t=t.replace(/\bDC\s*(\d+)/g,(m0,n)=>okBest(n)?"[SAVE]":m0);
  // attack bonus → highest-ability attack
  t=t.replace(/(Attack Roll:\*?\s*)\+(\d+)/gi,(m0,pre,n)=>okAtk(n)?pre+"[ATK]":m0).replace(/\+(\d+)\s+to hit/gi,(m0,n)=>okAtk(n)?"[ATK] to hit":m0);
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
  // Close any open preview when this anchor has nothing to show, so a previous card never lingers
  // and appears to belong to the row being hovered (B63 fix for the roll-log source link).
  btn.addEventListener("mouseenter",()=>{const m=getMon();if(m)showStatPreview(btn,m);else closePopover();});
  btn.addEventListener("click",ev=>{ev.stopPropagation();const m=getMon();if(m)showStatPreview(btn,m);else closePopover();});
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
// Human-readable source for a monster: the full book title from books.json when available,
// else a tidied filename/code. Drives the Source filter in the chassis & bestiary pickers (B58).
function bookLabelOf(m){return (m&&(m._book||prettySource(m._srcCode||m._source)))||"";}
function presetSourceLabels(){const set=new Set();enPresets().forEach(m=>{const l=bookLabelOf(m);if(l)set.add(l);});return [...set].sort((a,b)=>a.localeCompare(b));}
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

// ── Forge draft undo/redo (B193) ───────────────────────────────────────────────
// Whole-draft snapshot history (JSON of M). A burst of edits coalesces into one step via a debounced
// recorder hooked off renderPreview; Cmd/Ctrl+Z steps back, Cmd/Ctrl+Shift+Z (or Ctrl+Y) forward. A
// genuine loadMonster (new / clear / chassis / paste / bestiary) RESETS the history — undo never
// crosses creatures. Restores replay through loadMonster(snapshot, true), which skips re-recording and
// the scroll-to-top so the form just reverts in place.
let _forgeHist=[],_forgeHi=-1,_forgeHistTimer=null,_forgeRestoring=false;
const FORGE_HIST_CAP=80;
function _forgeSnap(){try{return JSON.stringify(M);}catch(e){return null;}}
function resetForgeHistory(){clearTimeout(_forgeHistTimer);_forgeHistTimer=null;const s=_forgeSnap();_forgeHist=s==null?[]:[s];_forgeHi=_forgeHist.length-1;_forgeRestoring=false;}
function scheduleForgeHistory(){if(_forgeRestoring||_forgeHi<0)return;clearTimeout(_forgeHistTimer);_forgeHistTimer=setTimeout(recordForgeHistory,500);}
function recordForgeHistory(){clearTimeout(_forgeHistTimer);_forgeHistTimer=null;
  if(_forgeHi<0){resetForgeHistory();return;}
  const cur=_forgeSnap();if(cur==null||cur===_forgeHist[_forgeHi])return; // unchanged since the last entry
  _forgeHist=_forgeHist.slice(0,_forgeHi+1);_forgeHist.push(cur);_forgeHi=_forgeHist.length-1; // drop the redo branch
  if(_forgeHist.length>FORGE_HIST_CAP){_forgeHist.shift();_forgeHi--;}}
function _forgeRestore(i){_forgeRestoring=true;_forgeHi=i;loadMonster(JSON.parse(_forgeHist[i]),true);_forgeRestoring=false;}
function forgeUndo(){recordForgeHistory(); // settle any pending burst first (keeps it redoable)
  if(_forgeHi>0){_forgeRestore(_forgeHi-1);toast("Undo.");}else toast("Nothing to undo.");}
function forgeRedo(){recordForgeHistory();
  if(_forgeHi<_forgeHist.length-1){_forgeRestore(_forgeHi+1);toast("Redo.");}else toast("Nothing to redo.");}
document.addEventListener("keydown",e=>{
  if(typeof _curView!=="undefined"&&_curView!=="forge")return; // draft undo only on the Forge tab
  const mb=document.getElementById("modalBg");if(mb&&mb.classList.contains("show"))return; // a modal owns the keys
  if(!(e.metaKey||e.ctrlKey)||e.altKey)return;
  const k=(e.key||"").toLowerCase();
  if(k==="z"&&!e.shiftKey){e.preventDefault();forgeUndo();}
  else if((k==="z"&&e.shiftKey)||k==="y"){e.preventDefault();forgeRedo();}
});

function loadMonster(m,_restoring){
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
  expandAllFsBlocks(); // every fresh edit opens with all sections expanded (B64)
  if(!_restoring)requestAnimationFrame(()=>{const fc=document.getElementById("formCol");if(fc)fc.scrollTop=0;}); // forge starts at the top (undo/redo keeps scroll)
  if(!_restoring)resetForgeHistory(); // a genuine load begins a fresh undo history (B193); restores keep it
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
