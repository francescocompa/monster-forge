// Monster Forge — ENGINE: bracket refs (applyRefsFor), spell/condition/rule popovers, the rule
// finder, the colour-coding engine, and renderPreview.
// Loaded as a classic <script> sharing ONE global scope with the other files (data.js, parsers.js,
// core/forge/engine/bestiary/adventures/app — in that order). No imports/exports. See DEVELOPMENT.md.

function applyRefsFor(mon,t){if(!t)return t;const sn=(mon&&mon.shortName)||{word:"creature",proper:false,plural:false};const w=sn.word||"creature";
  const ph=cap=>sn.proper?w:((cap?"The ":"the ")+w);const sfx=sn.plural?"":"s";
  // [ABIL SAVE] → save DC, [ABIL ATK] → attack/check modifier (PB + ability mod, from this creature's CR).
  // Bare [SAVE]/[ATK] (no ability) use the highest of the creature's flagged MAIN abilities (B139), or the
  // highest ability overall when none is flagged.
  const pb=mon?pbForCR(mon.cr):2,abmod=a=>mon?mod(mon[a.toLowerCase()]??10):0,capw=w.charAt(0).toUpperCase()+w.slice(1);
  const mains=(mon&&Array.isArray(mon.mainAbils)&&mon.mainAbils.length)?mon.mainAbils:ABILS;
  const bestMod=Math.max(...mains.map(a=>abmod(a)));
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
// B67: render "a | b | c" line runs (from 5etools tables, e.g. Teleport) as real <table>s; the first
// row is the header. Everything else keeps the lightweight bold/italic/bullet/line-break handling.
function fmtBlock(t){
  const lines=String(t||"").split("\n");const out=[];let i=0;
  const isRow=s=>s.indexOf(" | ")>=0;
  while(i<lines.length){
    if(isRow(lines[i])){
      const rows=[];while(i<lines.length&&isRow(lines[i])){rows.push(lines[i].split("|").map(c=>c.trim()));i++;}
      out.push(`<table class="rc-table">`+rows.map((r,ri)=>"<tr>"+r.map(c=>{const tag=ri===0?"th":"td";return `<${tag}>${fmtInline(c)}</${tag}>`;}).join("")+"</tr>").join("")+`</table>`);
    }else{
      const buf=[];while(i<lines.length&&!isRow(lines[i])){buf.push(lines[i]);i++;}
      out.push(esc(buf.join("\n")).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*([^*]+?)\*/g,"<i>$1</i>").replace(/\n{2,}/g,"<br><br>").replace(/\n([-•])\s*/g,"<br><span class=\"blk-item\">").replace(/\n/g,"<br>"));
    }
  }
  return out.join("");
}
// ── Spell / condition references (Batch 14) ──────────────────────────────────
// Look up uploaded reference data by name (case-insensitive).
// A spell chip may carry a "(comment)" next to the name (e.g. "Fly (level 5 version)"); ignore the
// bracketed part when resolving the reference.
function findSpell(name){const n=String(name||"").replace(/\([^)]*\)/g,"").trim().toLowerCase();return enSpells().find(s=>(s.name||"").toLowerCase()===n);}
// A condition-immunity entry may carry a "(comment)" too (e.g. "charmed (with mind blank)"); ignore
// the bracketed part when resolving the reference — same as findSpell.
function findCondition(name){const n=String(name||"").replace(/\([^)]*\)/g,"").trim().toLowerCase();return enConditions().find(c=>(c.name||"").toLowerCase()===n);}
function findRule(name){const n=String(name||"").trim().toLowerCase();return enRules().find(r=>(r.name||"").toLowerCase()===n);}
function refSpan(kind,name){return `<span class="reflink" data-ref="${kind}" data-name="${esc(name)}">${esc(name)}</span>`;}
// Subtle ghost dismiss icon shown top-right of every definition popover (spell/condition/rule). B68.
const REFPOP_X_SVG=`<svg viewBox="0 0 384 512" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>`;
// Linkify a comma-separated spell list; matched spells become hover/click refs.
// Split a "Name (comment)" token into [name, "(comment)"]; the bracket part is never part of the
// reference and must not be coloured/underlined (B58).
function splitBracket(s){const m=String(s||"").match(/^([^(]*?)(\s*\(.*\))?\s*$/);return m?[m[1].trim(),(m[2]||"").trim()]:[String(s||"").trim(),""];}
function linkSpells(str){return String(str||"").split(",").map(tok=>{const t=tok.trim();if(!t)return "";
  const [bare,tail]=splitBracket(t);
  const inner=findSpell(bare)?`<span class="cc-spell"><span class="reflink" data-ref="spell" data-name="${esc(bare)}">${esc(bare)}</span></span>`:`<span class="cc-spell">${esc(bare)}</span>`;
  return inner+(tail?" "+esc(tail):"");}).filter(Boolean).join(", ");}
// Build the hover/click card body for a spell or condition.
function refContent(kind,name){
  if(kind==="spell"){const s=findSpell(name);if(!s)return "";
    const meta=s.level===0?(s.school+" cantrip"):s.level?("Level "+s.level+" "+s.school):s.school;
    const sub=[s.castingTime&&["Casting Time",s.castingTime],s.range&&["Range",s.range],s.components&&["Components",s.components],s.duration&&["Duration",s.duration]]
      .filter(Boolean).map(([k,v])=>`<b>${k}</b> ${esc(v)}`).join("<br>");
    return `<div class="refcard-h">${esc(s.name)}${srcBadge(s)}</div><div class="refcard-meta">${esc(meta)}</div>${sub?`<div class="refcard-sub">${sub}</div>`:""}${s.text?`<div class="refcard-body">${fmtBlock(s.text)}</div>`:""}`;}
  if(kind==="rule"){const r=findRule(name);if(!r)return "";
    return `<div class="refcard-h">${esc(r.name)}${srcBadge(r)}</div><div class="refcard-meta">${esc(r.category||"Rule")}</div>${r.text?`<div class="refcard-body">${fmtBlock(r.text)}</div>`:""}`;}
  if(kind==="effect"){const e=findCuratedEffect(name);if(!e)return "";
    return `<div class="refcard-h">${esc(e.name)}</div><div class="refcard-meta">${esc(CURATED_EFFECT_GROUP_LABEL[e.group]||"Effect")}</div><div class="refcard-body">${fmtBlock(e.text)}</div>`;}
  const c=findCondition(name);if(!c)return "";
  return `<div class="refcard-h">${esc(c.name)}${srcBadge(c)}</div>${c.category?`<div class="refcard-meta">${esc(c.category.replace(/s$/,""))}</div>`:""}${c.text?`<div class="refcard-body">${fmtBlock(c.text)}</div>`:""}`;}
// Source-id badge (e.g. XPHB) with the full book title as a hover tooltip when known.
function srcBadge(x){const id=x._srcCode||x.source||"";if(!id)return "";const full=x._book||"";
  return ` <span class="refcard-src"${full?` title="${esc(full)}"`:""}>${esc(id)}</span>`;}
let _refTimer=null;
// Reference popovers are STACKED (B63): a ref link inside a popover (e.g. a condition named in a
// spell's text) opens a second popover one level deeper instead of overwriting the first. Each
// popover carries data-level; hiding a level drops it and every deeper one. A single shared timer
// means moving from a parent popover into its child cancels the parent's pending hide.
function bindRefpopRolls(p){
  p.addEventListener("mouseenter",()=>clearTimeout(_refTimer));
  p.addEventListener("mouseleave",()=>{if(ruleFinder)hideRefpopFrom(+p.dataset.level||0);}); // click-only outside the rule finder (B127)
  // Roll dice from inside a spell/condition popover (e.g. Lightning Bolt's 8d6) — B62.
  const scaleOf=t=>t.dataset.scalebase?{base:t.dataset.scalebase,per:t.dataset.scaleper,lvl:+t.dataset.scalelvl,cast:+t.dataset.scalecast||0}:null;
  p.addEventListener("click",e=>{if(e.target.closest(".reflink"))return; // a nested ref opens its own popover
    const t=e.target.closest("[data-roll]");if(!t||!clickRollOn())return;e.stopPropagation();
    const meta={label:p.dataset.refname||"Roll",type:t.dataset.rolltype,dmgType:t.dataset.dmgtype};
    if(e.altKey){openRollPopover(t,{formula:t.dataset.roll,label:meta.label,type:meta.type,dmgType:meta.dmgType,scale:scaleOf(t)});return;}
    doRoll(t.dataset.roll,{adv:rollMode},meta);});
  p.addEventListener("contextmenu",e=>{if(e.target.closest(".reflink"))return;const t=e.target.closest("[data-roll]");if(!t||!clickRollOn())return;e.preventDefault();e.stopPropagation();openRollPopover(t,{formula:t.dataset.roll,label:p.dataset.refname||"Roll",type:t.dataset.rolltype,dmgType:t.dataset.dmgtype,scale:scaleOf(t)});});
}
// Combine a spell's base damage with its per-level increment for casting at slot level L (B65).
function parseDie(s){const m=String(s||"").match(/^(\d*)d(\d+)([+-]\d+)?$/i);return m?{n:Number(m[1]||1),sides:Number(m[2]),mod:Number(m[3]||0)}:null;}
function scaledFormula(scale,L){
  const extra=Math.max(0,(L|0)-scale.lvl);if(!extra)return scale.base;
  const b=parseDie(scale.base),p=parseDie(scale.per);
  if(b&&p&&b.sides===p.sides){const n=b.n+p.n*extra;return n+"d"+b.sides+(b.mod?(b.mod>0?"+":"")+b.mod:"");}
  return [scale.base,...Array(extra).fill(scale.per)].join("+");
}
function refpopAt(level){let p=document.querySelector('.refpop[data-level="'+level+'"]');
  if(!p){p=document.createElement("div");p.className="refpop";p.dataset.level=level;p.style.zIndex=70+level;document.body.appendChild(p);bindRefpopRolls(p);}
  return p;}
// The level a ref link opens: 0 at the top, or one deeper than the popover it lives in.
function refLevelOf(node){const pop=node&&node.closest&&node.closest(".refpop");return pop?((+pop.dataset.level||0)+1):0;}
function showRefpop(anchor,kind,name){const level=refLevelOf(anchor);
  const html=refContent(kind,name);if(!html)return;
  hideRefpopNow(level); // drop this level + any deeper before re-showing
  // Content scrolls inside .refpop-body; the bottom scroll-fade is a non-scrolling overlay on .refpop
  // itself (see CSS), so it always sits at the true bottom edge instead of drifting with the scroll.
  const p=refpopAt(level);p.innerHTML=`<div class="refpop-body"><button class="refpop-x" type="button" aria-label="Close" title="Close">${REFPOP_X_SVG}</button>`+html+`</div>`;p.dataset.refname=name;p.classList.add("show");
  const xb=p.querySelector(".refpop-x");if(xb)xb.addEventListener("click",e=>{e.stopPropagation();hideRefpopNow(level);});
  const body=p.querySelector(".refcard-body");
  if(body&&ruleFinder){ruleFindRoot(body);} // rule-finder: highlight rules/conditions inside the popover too (B66)
  // Colour-code + make rollable the popover body (generic cats — no creature-specific ability rolls).
  else if(body&&state.settings&&state.settings.colorCode&&state.settings.colorCode.on){walkColorize(body,buildColorCats(false));
    // Tag the spell's base damage dice with its upcast scaling so the roll popover can rescale it (B65).
    // If the link sat next to "(level N version)" wording, carry N as the default cast level (B66).
    if(kind==="spell"){const sp=findSpell(name);if(sp&&sp._scale){const base=normRoll(sp._scale.base);
      // The "(level N version)" tail renders as a sibling of the .cc-spell wrapper (the reflink's
      // parent), not of the reflink itself — so look past the wrapper to find it. B68.
      let cast=0;const around=(anchor&&anchor.parentElement&&anchor.parentElement.classList.contains("cc-spell"))?anchor.parentElement:anchor;
      const sib=around&&around.nextSibling;const near=(sib&&sib.nodeType===3?sib.nodeValue:"")||"";
      const cm=near.match(/\(level\s+(\d+)\s+version\)/i);if(cm)cast=+cm[1];
      body.querySelectorAll(".cc-dice[data-roll]").forEach(d=>{if(normRoll(d.dataset.roll)===base){d.dataset.scalebase=sp._scale.base;d.dataset.scaleper=sp._scale.per;d.dataset.scalelvl=sp._scale.lvl;if(cast)d.dataset.scalecast=cast;}});}}
  }
  // Never link a reference to itself (e.g. the Invisible condition mentioning "Invisible"). The self
  // term is rendered as PLAIN TEXT — no link, no colour, no rule-finder highlight — so a definition
  // never visually points back at the card you're already reading (B64 → B68: was a coloured span;
  // now stripped to plain text for spells/conditions/rules alike).
  const self=(name||"").toLowerCase();
  p.querySelectorAll(".reflink").forEach(r=>{if((r.dataset.name||"").toLowerCase()===self)r.replaceWith(document.createTextNode(r.textContent));});
  const r=anchor.getBoundingClientRect();
  // Keep the popover inside the statblock card it sprang from — its right edge aligns with the card's right
  // margin instead of spilling past it (falls back to the viewport for non-card anchors) (B133).
  const card=anchor.closest&&anchor.closest(".sb");
  const rightBound=card?card.getBoundingClientRect().right:window.innerWidth-10;
  let left=Math.max(8,Math.min(r.left,rightBound-p.offsetWidth));
  // Place below the anchor if it fits, else above; cap the height to the free space on the chosen side so a
  // long entry SCROLLS inside the box (with the bottom fade) rather than running off-screen (B133).
  const spaceBelow=window.innerHeight-8-(r.bottom+6),spaceAbove=(r.top-6)-8;
  let top,avail;
  if(p.offsetHeight<=spaceBelow||spaceBelow>=spaceAbove){top=r.bottom+6;avail=spaceBelow;}
  else{avail=spaceAbove;top=Math.max(8,r.top-6-Math.min(p.offsetHeight,avail));}
  p.style.maxHeight=Math.max(140,avail)+"px";
  p.style.left=left+"px";p.style.top=top+"px";}
function hideRefpopNow(level){document.querySelectorAll(".refpop").forEach(p=>{if((+p.dataset.level||0)>=level)p.classList.remove("show");});}
// Generous grace period so the cursor can travel from the link into the popover (to roll its dice)
// without it vanishing (B64).
function hideRefpopFrom(level){clearTimeout(_refTimer);_refTimer=setTimeout(()=>hideRefpopNow(level),360);}
function hideRefpop(){hideRefpopFrom(0);}
// Definition popovers (spell/condition/rule) are suppressible via Settings, but the rule finder always
// shows them — its whole purpose is to surface definitions on hover (B68).
function refPopOn(){return ruleFinder||!(state.settings&&state.settings.refPopovers)||state.settings.refPopovers.on!==false;}
// Definition popovers are click-only in normal use (hover was visually messy) — only the rule-finder study
// mode keeps the hover behaviour (B127).
document.addEventListener("mouseover",e=>{if(!ruleFinder)return;const r=e.target.closest&&e.target.closest(".reflink");if(r&&refPopOn()){clearTimeout(_refTimer);showRefpop(r,r.dataset.ref,r.dataset.name);}});
document.addEventListener("mouseout",e=>{if(!ruleFinder)return;const r=e.target.closest&&e.target.closest(".reflink");if(r)hideRefpopFrom(refLevelOf(r));});
document.addEventListener("click",e=>{const r=e.target.closest&&e.target.closest(".reflink");if(r&&refPopOn()){e.stopPropagation();clearTimeout(_refTimer);showRefpop(r,r.dataset.ref,r.dataset.name);return;}if(!(e.target.closest&&e.target.closest(".refpop")))hideRefpopNow(0);},true);
// Truncated-text hover tooltip: any element whose text is clipped (ellipsis / line-clamp / overflowing input)
// reveals its full text in the app's tail tooltip on hover. Generic — covers every truncating field (party,
// combatant, scene & statblock names, etc.) with no maintained selector list. Reuses tailPopover/closeTipPop.
let _truncEl=null;
function _truncFull(el){const t=(el.tagName==="INPUT"||el.tagName==="TEXTAREA")?el.value:el.textContent;return (t||"").trim();}
function _isTruncated(el){if(!el||el.nodeType!==1)return false;
  const cs=getComputedStyle(el),clamp=cs.webkitLineClamp&&cs.webkitLineClamp!=="none";
  if(cs.textOverflow!=="ellipsis"&&!clamp&&el.tagName!=="INPUT"&&el.tagName!=="TEXTAREA")return false;
  return el.scrollWidth>el.clientWidth+1||(clamp&&el.scrollHeight>el.clientHeight+1);}
document.addEventListener("mouseover",e=>{
  if((_pop&&!_pop.classList.contains("tail-pop"))||document.querySelector(".menu.open"))return; // don't fight an open menu/popover
  let n=e.target,hit=null,d=0;while(n&&n.nodeType===1&&d<4){if(_isTruncated(n)){hit=n;break;}n=n.parentElement;d++;}
  if(!hit||hit===_truncEl||hit===document.activeElement)return; // skip the field you're editing
  const full=_truncFull(hit);if(!full)return;
  _truncEl=hit;tailPopover(hit,`<div class="cr-pop trunc-pop">${esc(full)}</div>`);});
document.addEventListener("mouseout",e=>{if(!_truncEl)return;
  if(!e.relatedTarget||!_truncEl.contains(e.relatedTarget)){closeTipPop();_truncEl=null;}});
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
// renderPreview is split into pure HTML builders (header / ability table / meta / entry sections) plus
// a coordinator that updates the surrounding chrome and commits + post-processes the statblock (B72).

// Name, type line, and the AC/Initiative/HP/Speed header block.
function sbHeaderHTML(m){
  const initVal=initOf(m);
  let h=`<div class="topbar"></div><h2>${m.name.trim()?esc(m.name):`<span class="sb-name-ph">Unnamed Creature</span>`}</h2>`;
  h+=`<div class="typeline">${esc([m.size,m.type+(m.subtype?` (${m.subtype})`:""),m.align].filter(Boolean).join(" "))||"&nbsp;"}${m.minion?` <span class="minion-tag">Minion</span>`:""}</div><hr class="rule">`;
  h+=`<div class="topstats"><p><span class="k">AC</span> ${m.ac??"—"}${m.acnote?` (${esc(m.acnote)})`:""}</p><p><span class="k">Initiative</span> ${sgn(initVal)} (${10+initVal})</p><p><span class="k">HP</span> ${m.hp??"—"}${m.hpf?` (${esc(m.hpf)})`:""}</p><p><span class="k">Speed</span> ${esc(speedStr(m))}</p></div>`;
  return h;
}
// The six-column STR/DEX/CON · INT/WIS/CHA ability table (score / rollable mod / rollable save).
function sbAbilityTableHTML(m,pb){
  let h=`<table class="ab"><tr><td class="lbl"></td><td class="mh">Mod</td><td class="mh">Save</td><td class="lbl"></td><td class="mh">Mod</td><td class="mh">Save</td></tr>`;
  const rfm=v=>"1d20"+(v>=0?"+":"")+v;
  [["str","int"],["dex","wis"],["con","cha"]].forEach(([l,r])=>{h+="<tr>"+[l,r].map(a=>{const prof=m.saves.includes(a),md=mod(m[a]),sv=md+(prof?pb:0),A=a.toUpperCase(),FN=ABIL_NAME[a];return `<td class="h lbl" data-ab="${a}"><span class="abc">${A}</span> <span class="sc">${m[a]}</span></td><td class="num roll-num" data-roll="${rfm(md)}" data-rolltype="check" data-rolllabel="${FN}" data-abil="${a}">${sgn(md)}</td><td class="num roll-num${prof?" save-prof":""}" data-roll="${rfm(sv)}" data-rolltype="save" data-rolllabel="${FN}" data-abil="${a}">${sgn(sv)}</td>`;}).join("")+"</tr>";});
  h+=`</table>`;
  return h;
}
// The meta block: skills, tools, defenses, immunities, gear, senses, languages, CR line.
function sbMetaHTML(m,pb,xp){
  const def=defenseStrings(m);
  let h=`<hr class="rule thin"><div class="meta">`;
  // Skills/tools are rollable too: skill = 1d20 + its shown modifier; tool = 1d20 + PB (ability is DM's choice, so PB only).
  if(m.skills.length)h+=`<p><span class="k">Skills</span> ${m.skills.slice().sort((a,b)=>a[0].localeCompare(b[0])).map(s=>{const nm=s[0].replace(/_/g," "),mv=mod(m[SKILLS[s[0]]])+skProfBonus(s[1],pb);return `<span class="cc-skill" data-ab="${SKILLS[s[0]]}">${nm}</span> <span class="roll-num" data-roll="1d20${mv>=0?"+":""}${mv}" data-rolltype="check" data-rolllabel="${esc(nm)}" data-abil="${SKILLS[s[0]]}">${sgn(mv)}</span>`;}).join(", ")}</p>`;
  if(m.tools&&m.tools.length)h+=`<p><span class="k">Tools</span> ${m.tools.slice().sort((a,b)=>a.localeCompare(b)).map(t=>{const ab=TOOL_ABIL[t]||"int",mv=mod(m[ab])+pb;return `<span class="cc-skill" data-ab="${ab}">${esc(t)}</span> <span class="roll-num" data-roll="1d20${mv>=0?"+":""}${mv}" data-rolltype="check" data-rolllabel="${esc(t)}" data-abil="${ab}">${sgn(mv)}</span>`;}).join(", ")}</p>`;
  if(def.vuln)h+=`<p><span class="k">Vulnerabilities</span> ${esc(def.vuln)}</p>`;
  if(def.res)h+=`<p><span class="k">Resistances</span> ${esc(def.res)}</p>`;
  const conds=(m.cimm||"").split(",").map(s=>s.trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b));
  // Condition immunities: only the condition name links (underline, no blue — B58); a trailing
  // "(comment)" stays plain text.
  const condHTML=conds.map(c=>{const [bare,tail]=splitBracket(c);
    const inner=findCondition(bare)?`<span class="reflink reflink-plain" data-ref="condition" data-name="${esc(bare)}">${esc(bare)}</span>`:esc(bare);
    return inner+(tail?" "+esc(tail):"");}).join(", ");
  const immLine=[def.immDmg?esc(def.immDmg):"",condHTML].filter(Boolean).join("; ");
  if(immLine)h+=`<p><span class="k">Immunities</span> ${immLine}</p>`;
  if(m.gear)h+=`<p><span class="k">Gear</span> ${esc(m.gear)}</p>`;
  const sStr=sensesStr(m);
  h+=`<p><span class="k">Senses</span> ${esc(sStr?sStr+", ":"")}Passive Perception ${passivePerc(m)}</p>`;
  h+=`<p><span class="k">Languages</span> ${esc(m.lang||"None")}</p>`;
  h+=`<p><span class="k">CR</span> ${m.cr} (XP ${xp.toLocaleString()}; PB ${sgn(pb)})</p></div>`;
  return h;
}
// One entry paragraph (trait / action / spellcasting / attack), bracket-refs applied.
function sbEntryBlockHTML(e){
  // data-spells lets a post-pass re-link spell names mentioned in spellcasting-derived feature text.
  const spAttr=x=>x&&x._spells&&x._spells.length?` data-spells="${encodeURIComponent(JSON.stringify(x._spells))}"`:"";
  // Spellcasting: the MAIN line is colourised (DC / to-hit), but the spell-group lines are skipped
  // because their spell names are already linked via linkSpells.
  if(e.mode==="spell"){const sp=spellLines(e);return `<p class="blk"><span class="nm">${esc(e.name||"Spellcasting")}.</span> ${fmtInline(applyRefs(sp.main))}</p>`+sp.groups.map(g=>`<p class="blk cc-skip" style="margin:2px 0 2px 14px"><b>${esc(g.label)}:</b> ${linkSpells(g.spells)}</p>`).join("");}
  const body=e.mode==="attack"?attackText(e):e.text;
  // Carry the attack's ability + damage type onto the name so a click can tint/annotate the roll.
  const ab=e.mode==="attack"&&e.ability?` data-abil="${esc(e.ability)}"`:"";
  const dt=e.mode==="attack"&&e.dtype?` data-dmgtype="${esc(e.dtype)}"`:"";
  return `<p class="blk"${spAttr(e)}><span class="nm"${ab}${dt}>${esc(e.name)}.</span> ${fmtInline(applyRefs(body))}</p>`;
}
// All action/trait/legendary/villain/lair/regional/notes sections.
function sbEntriesHTML(m){
  const spAttr=e=>e&&e._spells&&e._spells.length?` data-spells="${encodeURIComponent(JSON.stringify(e._spells))}"`:"";
  const sec=arr=>arr.filter(e=>e.name||e.text||e.mode==="spell").map(sbEntryBlockHTML).join("");
  let h="";
  if(m.traits.some(e=>e.name||e.text))h+=`<div style="margin-top:8px">${sec(m.traits)}</div>`;
  if(m.actions.some(e=>e.name||e.text||e.mode==="spell"))h+=`<h3>Actions</h3>${sec(m.actions)}`;
  if(m.bonus.some(e=>e.name||e.text))h+=`<h3>Bonus Actions</h3>${sec(m.bonus)}`;
  if(m.reactions.some(e=>e.name||e.response))h+=`<h3>Reactions</h3>`+m.reactions.filter(e=>e.name||e.response).map(e=>`<p class="blk"${spAttr(e)}><span class="nm">${esc(e.name)}.</span> ${e.trigger?`<i>Trigger:</i> ${fmtInline(applyRefs(e.trigger))} <i>Response:</i> `:""}${fmtInline(applyRefs(e.response))}</p>`).join("");
  if(m.legend.on&&m.legend.items.some(e=>e.name||e.text))h+=`<h3>Legendary Actions</h3><p class="blk"><i>${fmtInline(applyRefs(m.legend.intro))}</i></p>${sec(m.legend.items)}`;
  if(m.villain.on&&m.villain.items.some(e=>e.name||e.text))h+=`<h3>Villain Actions</h3><p class="blk"><i>${fmtInline(applyRefs(m.villain.intro))}</i></p>`+[...m.villain.items].sort((a,b)=>(a.round||0)-(b.round||0)).filter(e=>e.name||e.text).map(e=>`<div class="va"><span class="rd">ACTION ${e.round||"?"}</span> <span class="nm">${esc(e.name)}.</span> ${fmtInline(applyRefs(e.text))}</div>`).join("");
  if(m.lair.on&&m.lair.items.some(e=>e.name||e.text)){h+=`<h3>Lair Actions</h3>`;if(m.lair.intro)h+=`<p class="blk"><i>${fmtInline(applyRefs(m.lair.intro))}</i></p>`;h+=sec(m.lair.items);}
  if(m.regional.on&&m.regional.text)h+=`<h3>Regional Effects</h3><p class="blk">${fmtInline(applyRefs(m.regional.text))}</p>`;
  (m.notes||[]).filter(n=>n.title||n.text).forEach(n=>h+=`<div class="sb-note">${n.title?`<div class="sb-note-h">${esc(n.title)}</div>`:""}<div class="sb-note-b">${fmtInline(applyRefs(n.text))}</div></div>`);
  return h;
}
// Update the chrome around the statblock (legacy derived chips, CR-target tip, title, status), then
// build the statblock HTML from the section builders, commit it, and run the link/colour post-pass.
// Coalesce a burst of edits into ONE statblock rebuild (B194). renderPreview() runs on every keystroke;
// each call used to do a full innerHTML rebuild + colorize TreeWalker + persist/history side effects.
// We now defer + dedupe: an animation frame paints once per frame in the foreground, and a setTimeout
// fallback guarantees the render (and its persist/undo side effects) still flushes if rAF is paused —
// e.g. a backgrounded tab. No caller reads #statblock synchronously after renderPreview(), so the
// sub-frame defer is safe.
let _previewRAF=null,_previewTO=null;
function _flushPreview(){
  if(_previewRAF==null&&_previewTO==null)return;
  if(_previewRAF!=null&&typeof cancelAnimationFrame!=="undefined")cancelAnimationFrame(_previewRAF);
  clearTimeout(_previewTO);_previewRAF=null;_previewTO=null;
  renderPreviewNow();
}
function renderPreview(){
  if(_previewRAF!=null||_previewTO!=null)return; // a paint is already queued — coalesce into it
  if(typeof requestAnimationFrame!=="undefined")_previewRAF=requestAnimationFrame(_flushPreview);
  _previewTO=setTimeout(_flushPreview,100);
}
function renderPreviewNow(){
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
  $("#forgeTitle").textContent=m.name||"New Creature";
  refreshForgeStatus();
  if(previewCollapsed){const pfn=document.getElementById("pfName");if(pfn)pfn.textContent=m.name||"New Creature";}
  const h=sbHeaderHTML(m)+sbAbilityTableHTML(m,pb)+sbMetaHTML(m,pb,xp)+sbEntriesHTML(m);
  $("#statblock").innerHTML=h;
  linkSpellFeatures($("#statblock"));
  if(ruleFinder)ruleFindRoot($("#statblock"));else colorizeStatblock();
  persistForgeDraft(); // remember what's being edited so a reload restores it (B78)
  if(typeof scheduleForgeHistory==="function")scheduleForgeHistory(); // B193: coalesce edits into the undo history
  if(typeof refreshSaveState==="function")refreshSaveState(); // reflect unsaved-changes state on the save controls
}
// Re-link spell names mentioned in spellcasting-derived feature bodies (reactions, hidden bonus
// actions, etc.). Scoped to each block's own [data-spells] list — so only genuine spells link, no
// false positives on common words. Runs before colorizeStatblock (which then skips .reflink).
function linkSpellFeatures(root){
  if(!root)return;
  root.querySelectorAll("[data-spells]").forEach(el=>{
    let names;try{names=JSON.parse(decodeURIComponent(el.dataset.spells));}catch(e){return;}
    names=(names||[]).filter(n=>findSpell(n));if(!names.length)return;
    names.sort((a,b)=>b.length-a.length);
    const re=new RegExp("(?<![\\w'’])("+names.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")(?![\\w'’])","g");
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest(".reflink,.cc-spell,a,.nm")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const text=node.nodeValue;re.lastIndex=0;if(!re.test(text))return;re.lastIndex=0;
      const frag=document.createDocumentFragment();let pos=0,m;
      while((m=re.exec(text))){if(m.index>pos)frag.appendChild(document.createTextNode(text.slice(pos,m.index)));
        const outer=document.createElement("span");outer.className="cc-spell";
        const inner=document.createElement("span");inner.className="reflink";inner.dataset.ref="spell";inner.dataset.name=m[1];inner.textContent=m[1];
        outer.appendChild(inner);frag.appendChild(outer);pos=m.index+m[1].length;}
      if(pos<text.length)frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag,node);});
  });
}
// B53: colour-code the statblock PREVIEW only (gated by settings). Works on prose paragraphs
// (.blk/.va/.sb-note-b) via a TreeWalker — never the structured header lines or the export text.
const CC_CONDITIONS=["blinded","charmed","deafened","exhaustion","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious"];
function normRoll(s){return s.replace(/\s+/g,"").replace(/−/g,"-");}
function colorizeNode(node,cats){
  const text=node.nodeValue;if(!text.trim())return;const hits=[];
  cats.forEach(cat=>{cat.re.lastIndex=0;let m;while((m=cat.re.exec(text))){hits.push({s:m.index,e:m.index+m[0].length,txt:m[0],cls:cat.cls(m),roll:cat.roll?cat.roll(m):null,rtype:cat.rtype||null,rlabel:cat.rlabel?cat.rlabel(m):null,abil:cat.abil?cat.abil(m):null,dmgtype:cat.dmgtype?cat.dmgtype(m):null,ref:cat.ref?cat.ref(m):null});if(m.index===cat.re.lastIndex)cat.re.lastIndex++;}});
  if(!hits.length)return;
  hits.sort((a,b)=>a.s-b.s||b.e-a.e);
  const out=[];let pos=0;
  hits.forEach(h=>{if(h.s<pos)return;if(!h.cls&&!h.ref&&!h.roll)return;if(h.s>pos)out.push({t:text.slice(pos,h.s)});out.push(h);pos=h.e;});
  if(pos<text.length)out.push({t:text.slice(pos)});
  const frag=document.createDocumentFragment();
  out.forEach(o=>{if(o.t!==undefined){frag.appendChild(document.createTextNode(o.t));}else{const sp=document.createElement("span");sp.className=o.cls;sp.textContent=o.txt;if(o.roll){sp.dataset.roll=o.roll;if(o.rtype)sp.dataset.rolltype=o.rtype;if(o.rlabel)sp.dataset.rolllabel=o.rlabel;if(o.abil)sp.dataset.abil=o.abil;if(o.dmgtype)sp.dataset.dmgtype=o.dmgtype;}if(o.ref){sp.classList.add("reflink");sp.dataset.ref=o.ref.kind;sp.dataset.name=o.ref.name;}frag.appendChild(sp);}});
  node.parentNode.replaceChild(frag,node);
}
// Full ability name → 3-letter key. Skill modifier for the current creature M (ability mod + PB if
// proficient in that skill), used to make in-prose "Ability (Skill)" checks rollable (B60).
function _ab3(full){return _ABFULL[full.toLowerCase()]||"int";}
function _skMod(abFull,skillName){const a=_ab3(abFull),pb=pbForCR(M.cr);
  const key=(skillName||"").trim().toLowerCase();
  const sk=(M.skills||[]).find(s=>s[0].replace(/_/g," ").toLowerCase()===key);
  const md=mod(M[a])+(sk?skProfBonus(sk[1],pb):0);return (md>=0?"+":"")+md;}
// Build the colour/roll categories. `forCreature` adds the ability-context cats (skill checks,
// spellcasting ability) that depend on the current monster M — omitted for generic content like
// spell/condition popovers (B62).
function buildColorCats(forCreature){
  const cats=[];
  // A damage-type word is only flagged as damage in a damage CONTEXT: it must be followed (allowing a
  // chain of other type words + connectors like "or"/"and"/",") by the word "damage" (B64). This
  // avoids false hits like Prestidigitation's "Fire Play" or Shield's "magical force".
  const TY=DMG_TYPES.join("|");
  const dmgRe=new RegExp("\\b("+TY+")\\b(?=(?:[\\s,;/]+(?:or|and|nonmagical|magical|"+TY+"))*[\\s,;/]+damage\\b)","gi");
  cats.push({re:dmgRe,cls:m=>"cc-dmg cc-"+m[1].toLowerCase()});
  // Colour split (B58): yellow = static bonuses/targets you DON'T roll; blue (cc-dice) = dice you roll.
  cats.push({re:/(?:Melee or Ranged|Melee|Ranged)\s+Attack Roll:\s*[+\-−]\d+/gi,cls:()=>"cc-roll",roll:m=>"1d20"+normRoll(m[0].match(/[+\-−]\d+/)[0]),rtype:"attack"});
  // The damage dice are followed by an optional type phrase before "damage" — allow a CHAIN of type
  // words + connectors (e.g. "Fire or Lightning damage", "piercing and slashing damage"), mirroring dmgRe
  // above; a lone unknown type word still works. (Was a single optional word → multi-type attacks like the
  // Eldritch Eddy's "(3d6+3) Fire or Lightning damage" tagged no damage, so the name rolled to-hit only.)
  cats.push({re:new RegExp("\\b\\d+d\\d+(?:\\s*[+\\-−]\\s*\\d+)?(?=\\)?\\s+(?:([a-zA-Z]+)(?:[\\s,;/]+(?:or|and|nonmagical|magical|"+TY+"))*[\\s,;/]+)?damage\\b)","gi"),cls:()=>"cc-dice",roll:m=>normRoll(m[0]),rtype:"damage",dmgtype:m=>m[1]||null});
  cats.push({re:/\b\d+d\d+(?:\s*[+\-−]\s*\d+)?\b/g,cls:()=>"cc-dice",roll:m=>normRoll(m[0]),rtype:null});
  cats.push({re:/([+\-−]\d+)(?=\s+to hit)/g,cls:()=>"cc-roll",roll:m=>"1d20"+normRoll(m[1]),rtype:"attack"});
  cats.push({re:/\bDC\s*\d+\b/g,cls:()=>"cc-dc"});
  cats.push({re:/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/gi,cls:m=>"cc-save cc-ab cc-ab-"+_ab3(m[1])});
  if(forCreature){
    cats.push({re:/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+\(([A-Za-z][A-Za-z ]+?)\)/g,cls:m=>"cc-ab cc-ab-"+_ab3(m[1]),
      roll:m=>"1d20"+_skMod(m[1],m[2]),rtype:"check",rlabel:m=>m[2].trim(),abil:m=>_ab3(m[1])});
    cats.push({re:/(?<=using\s)(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?=\sas the spellcasting ability)/g,cls:m=>"cc-ab cc-ab-"+_ab3(m[1]),
      roll:m=>{const a=_ab3(m[1]),md=mod(M[a]);return "1d20"+(md>=0?"+":"")+md;},rtype:"check",rlabel:m=>m[1],abil:m=>_ab3(m[1])});
  }
  cats.push({re:new RegExp("\\b("+CC_CONDITIONS.join("|")+")\\b","gi"),cls:()=>"cc-cond",ref:m=>findCondition(m[0])?{kind:"condition",name:m[0]}:null});
  cats.push({re:/\b\d+(?:\/\d+)?\s*(?:ft\.?|feet)\b/gi,cls:()=>"cc-range"});
  cats.push({re:/\b\d+-foot(?:[ \-](?:cone|cube|line|sphere|radius|emanation|cylinder))?\b/gi,cls:()=>"cc-range"});
  return cats;
}
const CC_SKIP=".nm,.reflink,a,.cc-roll,.cc-dice,.cc-dmg,.cc-cond,.cc-range,.cc-dc,.cc-save";
function walkColorize(container,cats){
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest(CC_SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>colorizeNode(node,cats));
}
// Colour-code + make rollable the statblock preview (gated by settings). Pill colours + the prose walk
// run here; three follow-up DOM passes (attack labels / attack names / recharge tags) are split out (B75).
function colorizeStatblock(root){
  root=root||$("#statblock");
  const s=state.settings&&state.settings.colorCode;if(!s||!s.on)return;
  if(!root)return;
  // B60: colour-coding is now a single on/off — when on, every category is active.
  root.querySelectorAll(".ab td.lbl[data-ab] .abc").forEach(c=>c.classList.add("cc-ab","cc-ab-"+c.parentElement.dataset.ab));
  root.querySelectorAll(".cc-skill[data-ab]").forEach(sp=>sp.classList.add("cc-ab","cc-ab-"+sp.dataset.ab));
  const cats=buildColorCats(true);
  root.querySelectorAll(".blk:not(.cc-skip),.va,.sb-note-b").forEach(container=>walkColorize(container,cats));
  colorizeAttackLabels(root);
  colorizeAttackNames(root);
  colorizeRechargeTags(root);
  if(state.settings.clickRoll&&state.settings.clickRoll.on){
    root.querySelectorAll(".cc-roll[data-roll],.cc-dice[data-roll],.roll-num[data-roll]").forEach(sp=>sp.title="Click to roll · right-click for options");
    root.querySelectorAll(".roll-atkname[data-roll]").forEach(sp=>sp.title="Roll attack"+(sp.dataset.dmg?" + damage":""));
    root.querySelectorAll(".roll-rchname[data-roll]").forEach(sp=>sp.title="Roll recharge"+(sp.dataset.dmg?" + damage":""));
    root.querySelectorAll(".roll-rchtag[data-roll]").forEach(sp=>sp.title="Roll recharge only");
  }
}
// attackText renders "*Melee Attack Roll:* +N", and fmtInline wraps the label in <i> — so the jargon
// regex (which needs the +N contiguous) never matches and chassis-preset attacks weren't rollable.
// Tag the +N that immediately follows an italic "…Attack Roll:" label.
function colorizeAttackLabels(root){
  root.querySelectorAll(".blk i,.va i").forEach(it=>{
    if(!/Attack Roll:\s*$/i.test(it.textContent))return;
    const nx=it.nextSibling;if(!nx||nx.nodeType!==3)return;
    const mm=nx.nodeValue.match(/^(\s*)([+\-−]\d+)/);if(!mm)return;
    const parent=nx.parentNode;
    if(mm[1])parent.insertBefore(document.createTextNode(mm[1]),nx);
    const sp=document.createElement("span");sp.className="cc-roll";sp.dataset.roll="1d20"+normRoll(mm[2]);sp.dataset.rolltype="attack";sp.textContent=mm[2];
    parent.insertBefore(sp,nx);
    nx.nodeValue=nx.nodeValue.slice(mm[0].length);
  });
}
// Make an attack entry's NAME roll the attack (+ its damage) in one click.
// For prose attacks (no entry-mode ability) infer the ability from the to-hit bonus so the
// roll-log still shows the ability-colour bar — incl. on the damage roll (B63). The Archmage's
// Arcane Burst (+9 = INT 20 mod +5 + PB +4) resolves to INT this way.
function colorizeAttackNames(root){
  const pbCR=pbForCR(M.cr),spAbil=(M.actions.find(e=>e.mode==="spell")||{}).ability;
  // In a tie (several abilities share the to-hit bonus) prefer the spellcasting ability, else fall back to
  // ABILS order — but always push CON last: a creature almost never attacks with CON, so it's the least
  // likely correct guess in a tie.
  const inferAbil=bonus=>{const ms=ABILS.filter(a=>mod(M[a])+pbCR===bonus);if(!ms.length)return null;if(spAbil&&ms.includes(spAbil))return spAbil;return ms.slice().sort((a,b)=>(a==="con")-(b==="con"))[0];};
  root.querySelectorAll(".blk,.va").forEach(blk=>{
    const atk=blk.querySelector('[data-rolltype="attack"]'),dmg=blk.querySelector('[data-rolltype="damage"]'),nm=blk.querySelector(".nm");
    if(atk&&nm){
      nm.classList.add("roll-atkname");nm.dataset.roll=atk.dataset.roll;nm.dataset.rolltype="attack";
      if(dmg){nm.dataset.dmg=dmg.dataset.roll;if(dmg.dataset.dmgtype&&!nm.dataset.dmgtype)nm.dataset.dmgtype=dmg.dataset.dmgtype;}
      if(!nm.dataset.abil){const mm=(atk.dataset.roll||"").match(/[+\-]\d+/);const ab=mm?inferAbil(parseInt(mm[0],10)):null;if(ab)nm.dataset.abil=ab;}
      if(nm.dataset.abil&&dmg&&!dmg.dataset.abil)dmg.dataset.abil=nm.dataset.abil;
    }
  });
}
// Recharge tag in an entry NAME (e.g. "Fire Breath (Recharge 5–6)") → rollable d6 (no type tag).
function colorizeRechargeTags(root){
  root.querySelectorAll(".nm").forEach(nm=>{
    if(nm.classList.contains("roll-atkname"))return;
    const t=nm.textContent,mm=t.match(/\(Recharge\s+[^)]*\)/i);if(!mm)return;
    const idx=t.indexOf(mm[0]),before=t.slice(0,idx),after=t.slice(idx+mm[0].length);
    nm.textContent="";if(before)nm.appendChild(document.createTextNode(before));
    const sp=document.createElement("span");sp.className="cc-dice";sp.dataset.roll="1d6";sp.dataset.rolllabel=before.replace(/\.\s*$/,"").trim()||"Recharge";sp.textContent=mm[0];
    const num=mm[0].match(/\d+/);if(num)sp.dataset.rollmin=num[0]; // recharge succeeds when the d6 ≥ this
    nm.appendChild(sp);if(after)nm.appendChild(document.createTextNode(after));
    // If the action also deals damage, clicking the NAME rolls recharge + damage as one group (B77).
    // The inner "(Recharge N–N)" tag stays its own roll target that rolls ONLY the recharge die, so
    // the DM can split the two (recharge-only vs recharge+damage) from one statblock entry (B78).
    const blk=nm.closest(".blk,.va"),dmg=blk&&blk.querySelector('[data-rolltype="damage"]');
    if(dmg){
      nm.classList.add("roll-rchname");nm.dataset.roll="1d6";if(num)nm.dataset.rollmin=num[0];
      nm.dataset.rolllabel=before.replace(/\.\s*$/,"").trim()||"Recharge";
      nm.dataset.dmg=dmg.dataset.roll;if(dmg.dataset.dmgtype)nm.dataset.dmgtype=dmg.dataset.dmgtype;
      sp.classList.add("roll-rchtag"); // keeps its own data-roll/rollmin → recharge-only on click
    }
  });
}
// ── Rule finder (B66) ────────────────────────────────────────────────────────
// A study mode: instead of colour-coding, every rules-glossary term + condition (matched by name,
// case-sensitive to dodge common-word false positives) and every already-detected spell is highlighted
// in amber; the rest of the text is dimmed. Hovering a highlight shows its reference popover. Rolls and
// non-reference popovers are suppressed while active.
let ruleFinder=false;
function rfEscapeName(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
// Smarter matching (B67): tolerate the natural-text variations a rule name takes in prose —
//  • plurals ("Attack Rolls" → Attack Roll, "Conditions" → Condition)
//  • case: MULTI-word names match case-insensitively (distinctive phrases, low false-positive risk);
//    SINGLE-word names stay case-sensitive (so "Damage"/"Save"/"prone to" lowercase don't false-fire,
//    but a capitalized keyword like "Prone"/"Advantage" still matches).
// The ref strips a trailing plural before looking the term up, and stores the canonical name so the
// popover resolves.
function rfResolve(finder,kind){return m=>{const w=m[0];const r=finder(w)||finder(w.replace(/s$/i,""))||finder(w.replace(/es$/i,""));return r?{kind,name:r.name}:null;};}
function buildRuleCats(){
  const cats=[];
  const add=(names,kind,finder)=>{
    names=names.filter(n=>n&&/^[A-Za-z]/.test(n)&&!/[[\]]/.test(n));if(!names.length)return;
    const multi=names.filter(n=>/\s/.test(n)).sort((a,b)=>b.length-a.length);
    const single=names.filter(n=>!/\s/.test(n)).sort((a,b)=>b.length-a.length);
    const ref=rfResolve(finder,kind);
    // Only highlight a term that actually resolves to a rule/condition — a regex match whose lookup
    // comes back empty (case/plural edge, or a name the finder can't round-trip) gets no class, and
    // colorizeNode then drops it (no orphan yellow term with an empty popover). B68.
    const cls=m=>ref(m)?"rf-hit":"";
    if(multi.length)cats.push({re:new RegExp("\\b("+multi.map(rfEscapeName).join("|")+")s?\\b","gi"),cls,ref});
    if(single.length)cats.push({re:new RegExp("\\b("+single.map(rfEscapeName).join("|")+")(?:es|s)?\\b","g"),cls,ref});
  };
  add(enRules().map(r=>r.name),"rule",findRule);
  add(enConditions().map(c=>c.name),"condition",findCondition);
  // Statblock abbreviations/labels resolve to their (longer-named) glossary rule (B77). Only aliases
  // whose target rule is actually loaded are added — unknown ones simply don't highlight. Case-sensitive
  // so the uppercase labels ("AC 17", "CR 12", "PB +4") match without firing on lowercase prose.
  Object.keys(RULE_ALIASES).forEach(al=>{const canon=RULE_ALIASES[al];if(findRule(canon))
    cats.push({re:new RegExp("\\b"+rfEscapeName(al)+"\\b","g"),cls:()=>"rf-hit",ref:()=>({kind:"rule",name:canon})});});
  return cats;
}
const RULE_ALIASES={AC:"Armor Class",HP:"Hit Points",CR:"Challenge Rating",PB:"Proficiency Bonus",XP:"Experience Points"};
function ruleFindRoot(root){
  if(!root)return;
  // Any already-linked reference (spell / condition-immunity / rule) becomes a finder hit — no raw
  // name-matching of spells, so no false positives.
  root.querySelectorAll(".reflink").forEach(s=>s.classList.add("rf-hit"));
  const cats=buildRuleCats();if(!cats.length)return;
  // Walk the header stats (.topstats: Initiative/Speed) + value lines (.meta: skills/senses/immunities/
  // languages) + prose blocks consistently. Previously only .blk was walked when blocks existed, so the
  // header & value lines were silently skipped for any creature that had traits/actions (B68). A popover
  // body matches none of these, so walk the body itself.
  const sel=".topstats,.meta,.blk:not(.cc-skip),.va,.sb-note-b,h3";
  const conts=root.querySelectorAll(sel);
  (conts.length?[...conts]:[root]).forEach(c=>walkColorize(c,cats));
}
function toggleRuleFinder(){
  ruleFinder=!ruleFinder;
  document.body.classList.toggle("rule-finder",ruleFinder);
  const btn=$("#ruleFinderBtn");if(btn){btn.classList.toggle("active",ruleFinder);btn.innerHTML=ruleFinder?RF_X_ICON:RF_Q_ICON;btn.title=ruleFinder?"Exit rule finder":"Rule finder";}
  closePopover();hideRefpopNow(0);
  if(ruleFinder&&!enRules().length)toast("No rules loaded — upload a rules file (variantrules.json) in Preset libraries to highlight rules. Conditions and spells still highlight.",4200);
  // Re-render whichever statblock surface is showing so the finder highlights apply there too (B167).
  if(typeof _curView!=="undefined"&&_curView==="combat")renderCombat();else renderPreview();
}
const RF_Q_ICON=`<svg viewBox="0 0 512 512" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM169.8 165.3c7.9-22.3 29.1-37.3 52.8-37.3l58.3 0c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24l0-13.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1l-58.3 0c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>`;
const RF_X_ICON=`<svg viewBox="0 0 384 512" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>`;
// ── B54/B55 click-to-roll ────────────────────────────────────────────────────
function syncFeatureClasses(){document.body.classList.toggle("mf-clickroll",!ruleFinder&&!!(state.settings&&state.settings.clickRoll&&state.settings.clickRoll.on));}
function d(n){return 1+Math.floor(Math.random()*n);}
const DICE_HELP_URL="https://dice.clockworkmod.com/";
const DICE_ICON=`<svg viewBox="0 0 640 512" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M274.9 34.3c-28.1-28.1-73.7-28.1-101.8 0L34.3 173.1c-28.1 28.1-28.1 73.7 0 101.8l138.8 138.8c28.1 28.1 73.7 28.1 101.8 0l138.8-138.8c28.1-28.1 28.1-73.7 0-101.8L274.9 34.3zM200 224c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zM96 200a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zm104 176c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zm128-128c0 13.3-10.7 24-24 24s-24-10.7-24-24 10.7-24 24-24 24 10.7 24 24zm-24-80a24 24 0 1 1 0-48 24 24 0 1 1 0 48zm288 32V480c0 35.3-28.7 64-64 64H192c-19.1 0-36.3-8.4-48-21.7 5.4 .9 10.5 1.7 16 1.7h288c53 0 96-43 96-96V224c0-5.5-.8-10.6-1.7-16 13.3 11.7 21.7 28.9 21.7 48z"/></svg>`;
// Roll a dice-notation formula (clockworkmod-style): NdY, +/-N, kh/kl/dh/dl (keep/drop highest/lowest),
// d% (percentile). opts.adv ("adv"/"dis") rerolls a lone d20; opts.crit doubles each die's count.
function rollFormula(f,opts){
  opts=opts||{};const adv=opts.adv,crit=!!opts.crit;
  // Shorthand (B61): "d20!" = advantage, "d20>d20" = advantage, "d20<d20" = disadvantage.
  const norm=String(f).replace(/\s+/g,"").replace(/−/g,"-").replace(/^\+/,"")
    .replace(/\d*d20>\d*d20/gi,"2d20kh1").replace(/\d*d20<\d*d20/gi,"2d20kl1").replace(/\d*d20!/gi,"2d20kh1");
  const re=/([+-]?)(\d*)d(%|\d+)((?:kh|kl|dh|dl)\d*)?|([+-]?\d+)/gi;
  let total=0;const parts=[];let nat20=false,m;
  while((m=re.exec(norm))){
    if(m[5]!==undefined){const v=Number(m[5]);if(isNaN(v))continue;total+=v;parts.push((v<0?"−":"+")+Math.abs(v));continue;}
    const neg=m[1]==="-";const n=Number(m[2]||1),sides=m[3]==="%"?100:Number(m[3]);if(!sides||!n)continue;
    const kmod=m[4]||"";
    if(adv&&sides===20&&n===1&&!kmod&&!crit){const a=d(20),b=d(20),keep=adv==="adv"?Math.max(a,b):Math.min(a,b);if(keep===20)nat20=true;total+=neg?-keep:keep;parts.push(`d20(${a},${b})→${keep}`);continue;}
    const count=crit?n*2:n;const rolls=[];for(let i=0;i<count;i++)rolls.push(d(sides));
    let kept=rolls;
    if(kmod){const mt=kmod.slice(0,2).toLowerCase(),kn=Number(kmod.slice(2)||1),sorted=rolls.slice().sort((x,y)=>x-y);
      kept=mt==="kh"?sorted.slice(-kn):mt==="kl"?sorted.slice(0,kn):mt==="dh"?sorted.slice(0,Math.max(0,count-kn)):sorted.slice(kn);}
    const sum=kept.reduce((x,y)=>x+y,0);total+=neg?-sum:sum;
    if(sides===20&&kept.indexOf(20)>=0)nat20=true;
    parts.push(`${count}d${m[3]}${kmod}:[${rolls.join(",")}]`);
  }
  return {total,parts:parts.join(" "),nat20};
}
// Pre-crit maximum of a formula: every die's top face × count, plus flat modifiers. Used by the
// grit homebrew rule (B65) as a damage floor.
function formulaCeil(f){
  const norm=String(f).replace(/\s+/g,"").replace(/−/g,"-").replace(/^\+/,"");
  const re=/([+-]?)(\d*)d(%|\d+)((?:kh|kl|dh|dl)\d*)?|([+-]?\d+)/gi;
  let total=0,m;
  while((m=re.exec(norm))){
    if(m[5]!==undefined){const v=Number(m[5]);if(!isNaN(v))total+=v;continue;}
    const neg=m[1]==="-";let n=Number(m[2]||1),sides=m[3]==="%"?100:Number(m[3]);if(!sides||!n)continue;
    if(m[4]){const kn=Number(m[4].slice(2)||1);if(/^(kh|kl)/i.test(m[4]))n=Math.min(n,kn);else n=Math.max(0,n-kn);}
    total+=(neg?-1:1)*n*sides;
  }
  return total;
}
// Minimum of a formula: every die's lowest face (1) × count, plus flat modifiers. Used to bound the
// roll-log reel's random spin to the roll's plausible result range (B164).
function formulaFloor(f){
  const norm=String(f).replace(/\s+/g,"").replace(/−/g,"-").replace(/^\+/,"");
  const re=/([+-]?)(\d*)d(%|\d+)((?:kh|kl|dh|dl)\d*)?|([+-]?\d+)/gi;
  let total=0,m;
  while((m=re.exec(norm))){
    if(m[5]!==undefined){const v=Number(m[5]);if(!isNaN(v))total+=v;continue;}
    const neg=m[1]==="-";let n=Number(m[2]||1),sides=m[3]==="%"?100:Number(m[3]);if(!sides||!n)continue;
    if(m[4]){const kn=Number(m[4].slice(2)||1);if(/^(kh|kl)/i.test(m[4]))n=Math.min(n,kn);else n=Math.max(0,n-kn);}
    total+=(neg?-1:1)*n*1; // each die contributes its minimum face (1)
  }
  return total;
}
function gritOn(){return !!(state.settings&&state.settings.homebrew&&state.settings.homebrew.gritMin);}
// Label = feature/ability name only (the roll type is shown as a separate tag).
// Strip trailing-period + any bracketed note ("(Recharge 5–6)", "(3/Day)", "(Costs 2 Actions)"…) from
// a feature name so the roll log shows just the action name, not its usage note (B79).
function cleanRollLabel(s){return (s||"").replace(/\s*\([^)]*\)/g,"").replace(/\.\s*$/,"").trim();}
function rollLabelFor(span){if(span.dataset.rolllabel)return cleanRollLabel(span.dataset.rolllabel);const blk=span.closest(".blk,.va,.sb-note-b");const nm=blk&&blk.querySelector(".nm");return nm?cleanRollLabel(nm.textContent):"Roll";}
// Combatant-scoped roll source (CT4): while the Combat view is showing an active creature's statblock,
// rolls are attributed to that combatant (e.g. "Archmage 2") instead of the Forge's working monster.
let combatRollSrc=null;
function rollSource(){if(_curView==="combat"&&combatRollSrc)return combatRollSrc;if(!M)return null;const saved=state.lib.find(x=>x.id===M.id);return {name:M.name||"Unnamed",id:saved?M.id:null};}
let rollLog=[],rollLogOpen=false,rollLogSort="desc",rollLogTab="mine",_rlCorner="bl"; // desc = newest at top; tab = mine|players (B213, when shared); corner = bl|br|tl|tr (B223)
// Roll-log UI state persists across reloads (B223): which corner it's docked in, open/closed, and the
// sticky roll mode. Loaded once at init (initRollLogState), saved on every change.
function loadRollLogState(){try{const s=JSON.parse(localStorage.getItem("mf_rolllog")||"{}");
  if(["bl","br","tl","tr"].includes(s.corner))_rlCorner=s.corner;
  if(typeof s.open==="boolean")rollLogOpen=s.open;
  if(s.mode==="adv"||s.mode==="dis")rollMode=s.mode;}catch(e){}}
function saveRollLogState(){try{localStorage.setItem("mf_rolllog",JSON.stringify({corner:_rlCorner,open:rollLogOpen,mode:rollMode}));}catch(e){}}
let _rlPos=null; // custom drag position {left,top}; cleared (restored to default) on collapse/close (B63)
const ROLL_TAG={attack:"ATK",damage:"DMG",check:"CHK",save:"SAVE"}; // recharge/other rolls get no tag
// Abbreviated damage-type labels shown on the roll-log damage tag instead of "DMG" (B67).
const DMG_ABBR={acid:"Acid",bludgeoning:"Bludg.",cold:"Cold",fire:"Fire",force:"Force",lightning:"Light.",necrotic:"Necr.",piercing:"Pierc.",poison:"Pois.",psychic:"Psych.",radiant:"Rad.",slashing:"Slash.",thunder:"Thun."};
// A natural-language phrase for a roll's notification, by type (B65/B66):
//  attack → "Arcane Burst: 23 to hit" · save → "Strength Saving Throw: 16"
//  check  → "Strength Check: 12" (plain) / "Wisdom (Persuasion) Check: 14" (skill/tool)
//  damage → "25 fire damage" (with label prefix when shown alone).
// Returns HTML (the result number is highlighted via rollNum); label is esc'd. Render with toast(...,true).
function naturalRollText(label,type,total,dmgType,abil){
  const L=esc(label||"Roll"),N=rollNum(total);
  if(type==="attack")return `${L}: ${N} to hit`;
  if(type==="save")return `${L} Saving Throw: ${N}`;
  if(type==="check"){const af=ABIL_NAME[abil];if(af)return (af===L?`${af} Check`:`${af} (${L}) Check`)+`: ${N}`;return `${L} Check: ${N}`;}
  if(type==="damage")return `${L}: ${N}${dmgType?" "+capWord(dmgType.toLowerCase()):""} damage`;
  return `${L}: ${N}`;
}
function doRoll(formula,opts,meta){
  opts=opts||{};meta=meta||{};
  const r=rollFormula(formula,opts);
  // Grit (B65): a CRITICAL damage roll deals at least its pre-crit maximum (a crit never undershoots a
  // normal max hit). Only applies on crits — a normal hit is never floored.
  if(meta.type==="damage"&&gritOn()&&opts.crit){const floor=formulaCeil(formula);if(r.total<floor){r.parts=(r.parts?r.parts+" ":"")+`→ ${floor} (grit)`;r.total=floor;}}
  const crit=!!opts.crit||(meta.type==="attack"&&r.nat20); // attack nat-20 glows as a crit
  // Win/lose colouring only when a pass/fail threshold is known (e.g. a recharge roll).
  const outcome=meta.success!=null?(r.total>=meta.success?"win":"lose"):null;
  // Custom rolls carry no source (nothing to attribute them to), so the log shows no statblock name.
  const src=meta.custom?null:(meta.source||rollSource());
  const _entryId=uid();
  rollLog.unshift({id:_entryId,_t:Date.now(),label:meta.label||"Roll",type:meta.type||null,total:r.total,parts:r.parts,adv:opts.adv||null,crit,outcome,abil:meta.abil||null,dmgType:meta.dmgType||null,source:src,
    roll:{formula,adv:opts.adv||null,crit:!!opts.crit,label:meta.label||"Roll",type:meta.type||null,success:meta.success!=null?meta.success:null,custom:!!meta.custom,abil:meta.abil||null,dmgType:meta.dmgType||null,source:src}});
  if(rollLog.length>60)rollLog.length=60;
  // Roll mode is STICKY (B223): it stays on adv/dis until the user changes it (menu / ↑↓), so don't reset.
  // Player mode (B204 stage 4): mirror the roll to the DM's roll log via the write-back bin. The shared id
  // matches the local entry so it doesn't echo back as a duplicate / re-animate (B234).
  if(PLAYER_MODE&&!meta.silent&&typeof playerPushRoll==="function")playerPushRoll({id:_entryId,label:meta.label,type:meta.type,total:r.total,parts:r.parts,abil:meta.abil,dmgType:meta.dmgType,crit});
  // DM rolls: republish the snapshot so players mirroring dice see this roll (no-ops unless sharing) (B234).
  if(!PLAYER_MODE&&!meta.silent&&typeof publishCombatShareSoon==="function")publishCombatShareSoon();
  renderRollLog(true); // update the log + spin the new group's totals (B133); don't force-open — respect the collapsed pill (B223)
  // 3D dice flourish (B214): tumble physical dice that land on this roll's actual values, with their own
  // result alert (timer + reroll). Returns true if it took over the notification → skip the plain toast.
  // No-ops (returns false) when the libs/WebGL are absent (jsdom), reduced-motion, or the roll has no dice.
  let _diced=false;
  if(!meta.silent&&typeof rollDice3D==="function"){
    // On a crit damage roll (the dice are doubled), stage the extra dice as a second wave + fire the crit
    // flourish; crit is also true for a natural-20 attack (no extra dice, just the flourish) (B228).
    let _p=r.parts,_w2="";
    if(opts.crit&&meta.type==="damage"&&typeof d3dSplitCrit==="function"){const sp=d3dSplitCrit(r.parts);_p=sp.base;_w2=sp.extra;}
    _diced=rollDice3D({formula,parts:_p,wave2:_w2,crit,total:r.total,label:meta.label,type:meta.type,dmgType:meta.dmgType,abil:meta.abil,opts,meta});
  }
  // Fire the notification as the digits land (B129) — unless the 3D dice are showing their own alert.
  if(!meta.silent&&!_diced)setTimeout(()=>toast(naturalRollText(meta.label,meta.type,r.total,meta.dmgType,meta.abil),3200,true),ROLL_REEL_MS);
  return r;
}
function rerollEntry(id){const e=rollLog.find(x=>x.id===id);if(!e)return;const rl=e.roll;doRoll(rl.formula,{adv:rl.adv,crit:rl.crit},{label:rl.label,type:rl.type,success:rl.success,custom:rl.custom,abil:rl.abil,source:rl.source});}
function removeRollEntry(id){rollLog=rollLog.filter(x=>x.id!==id);renderRollLog();}
// The sticky adv/dis mode only applies to d20 tests (attacks/checks/saves) — not damage or other dice (B224);
// a custom roll can still apply it to anything.
function isD20Roll(formula){return /d20/i.test(String(formula||""));}
function quickRoll(t){const adv=isD20Roll(t.dataset.roll)?rollMode:null;doRoll(t.dataset.roll,{adv},{label:rollLabelFor(t),type:t.dataset.rolltype,success:t.dataset.rollmin?Number(t.dataset.rollmin):null,abil:t.dataset.abil,dmgType:t.dataset.dmgtype});}
// Attack-name click: roll the attack, then its damage (crit-doubled on a natural 20). One combined
// notification (B65): "Arcane Burst: 23 to hit, 25 force damage".
function rollAttackSequence(nameEl){
  const label=cleanRollLabel(nameEl.dataset.rolllabel||nameEl.textContent),abil=nameEl.dataset.abil,dmgType=nameEl.dataset.dmgtype;
  const atk=doRoll(nameEl.dataset.roll,{adv:rollMode},{label,type:"attack",abil,silent:true});
  let msg=`${esc(label)}: ${rollNum(atk.total)} to hit`,parts=atk.parts||"",wave2="";
  if(nameEl.dataset.dmg){const dmg=doRoll(nameEl.dataset.dmg,{crit:atk.nat20},{label,type:"damage",abil,dmgType,silent:true});
    msg+=`, ${rollNum(dmg.total)}${dmgType?" "+capWord(dmgType.toLowerCase()):""} damage`;
    // On a crit the damage dice are doubled — throw the base dice with the to-hit (wave 1) and let the EXTRA
    // crit dice drop in as a second wave once wave 1 lands, holding the alert until then (B228).
    if(atk.nat20&&typeof d3dSplitCrit==="function"){const sp=d3dSplitCrit(dmg.parts);parts+=" "+sp.base;wave2=sp.extra;}
    else parts+=" "+(dmg.parts||"");}
  if(atk.nat20)msg+=" — crit!";
  // Both sub-rolls are `silent` (no individual dice/toast); fire ONE compounded 3D throw so the to-hit d20
  // and the damage dice tumble together (B222), with the combined alert. Falls back to the toast if 3D is off.
  const diced=typeof rollDice3D==="function"&&rollDice3D({formula:nameEl.dataset.roll,parts,wave2,crit:atk.nat20,label,type:"attack",dmgType,abil,msg,reroll:()=>rollAttackSequence(nameEl)});
  if(!diced)setTimeout(()=>toast(msg,3600,true),ROLL_REEL_MS);
}
// Recharge-name click: roll the recharge die (win/lose vs the threshold) and, if the action deals
// damage, its damage too — as one group in the log + one combined notification (B77).
function rollRechargeSequence(nameEl){
  const label=cleanRollLabel(nameEl.dataset.rolllabel||nameEl.textContent),dmgType=nameEl.dataset.dmgtype;
  const min=nameEl.dataset.rollmin?Number(nameEl.dataset.rollmin):null;
  const rech=doRoll(nameEl.dataset.roll,{},{label,type:null,success:min,silent:true});
  const ready=min==null||rech.total>=min;
  let msg=`${esc(label)} recharge: ${rollNum(rech.total)}${min!=null?(ready?" — ready":" — not yet"):""}`,parts=rech.parts||"";
  if(nameEl.dataset.dmg){const dmg=doRoll(nameEl.dataset.dmg,{},{label,type:"damage",dmgType,silent:true});
    msg+=`, ${rollNum(dmg.total)}${dmgType?" "+capWord(dmgType.toLowerCase()):""} damage`;parts+=" "+(dmg.parts||"");}
  // One compounded 3D throw (recharge die + damage dice) — see rollAttackSequence (B222).
  const diced=typeof rollDice3D==="function"&&rollDice3D({formula:nameEl.dataset.roll,parts,label,type:null,dmgType,msg,reroll:()=>rollRechargeSequence(nameEl)});
  if(!diced)setTimeout(()=>toast(msg,3600,true),ROLL_REEL_MS);
}
function diceHelpHTML(){return `<div class="dice-help"><b>Dice notation</b><div class="dh-ex"><code>2d6+4</code> dice + modifier<br><code>1d20+7</code> attack roll<br><code>4d6kh3</code> keep highest 3<br><code>2d20kl1</code> keep lowest (disadvantage)<br><code>4d6dl1</code> drop lowest 1<br><code>d%</code> percentile<br><code>d20!</code> or <code>d20&gt;d20</code> advantage<br><code>d20&lt;d20</code> disadvantage</div><div class="dh-tip"><b>Alt/Option-click</b> anywhere for a custom roll.</div><a href="${DICE_HELP_URL}" target="_blank" rel="noopener">Full reference ↗</a></div>`;}
// Global roll mode (B60): a persistent neutral/advantage/disadvantage applied to click & custom
// rolls. Set via the cycling tag shown in the roll-log header and the custom-roll popover.
let rollMode=null; // null | "adv" | "dis"
function rollModeTagHTML(){return `<button class="roll-mode${rollMode?" "+rollMode:""}" data-rollmode title="Roll mode — click to cycle: flat → advantage → disadvantage">${rollMode==="adv"?"ADV":rollMode==="dis"?"DIS":"FLAT"}</button>`;}
// Set the sticky roll mode (B223): persist it, refresh the cursor tell, and re-render the log chrome.
function setRollMode(m){rollMode=(m==="adv"||m==="dis")?m:null;saveRollLogState();updateRollModeTell();if(document.getElementById("rollLog"))renderRollLog();}
function cycleRollMode(){setRollMode(rollMode===null?"adv":rollMode==="adv"?"dis":null);}
// The roll-log total spins through a vertical digit reel to its value — the same number-flow effect the
// initiative roll uses (nfReelHTML lives in adventures.js, shared scope). Notifications are delayed by
// ROLL_REEL_MS so the alert appears exactly as the reel settles (B129).
const ROLL_REEL_MS=1000;
// A single-column reel that spins through whole NUMBERS (not per-digit) within [min,max] before landing on
// `value`. The intermediate count varies (1- or 2-digit) so the spin never telegraphs the result's
// magnitude, and the range tracks the roll's possible results when known (B164).
function rollReelHTML(value,min,max){
  if(min==null||max==null||!(max>=min)){min=value;max=value;}
  min=Math.min(min,value);max=Math.max(max,value);
  const span=Math.max(0,max-min),seq=[];
  for(let i=0;i<20;i++)seq.push(min+(span?Math.floor(Math.random()*(span+1)):0));
  seq.push(value);
  return `<span class="nf-col" style="--nf-len:${seq.length}">${seq.map(n=>`<span class="nf-n">${n}</span>`).join("")}</span>`;
}
function animateRollTotal(el,value,formula){
  if(!el)return;
  let min=value,max=value;
  if(formula){try{min=formulaFloor(formula);max=formulaCeil(formula);}catch(e){/* fall back to value */}}
  const reel=document.createElement("span");reel.className="rl-reel";reel.innerHTML=rollReelHTML(value,min,max);
  el.textContent="";el.appendChild(reel);
  requestAnimationFrame(()=>reel.querySelectorAll(".nf-col").forEach(col=>{col.style.transform=`translateY(-${(Number(col.style.getPropertyValue("--nf-len"))||1)-1}em)`;}));
  setTimeout(()=>{if(reel.isConnected)el.textContent=value;},ROLL_REEL_MS);
}
// Spin only rolls still within their animation window (added < ROLL_REEL_MS ago). A multi-roll sequence
// (attack + damage) re-renders once per sub-roll; an in-flight reel survives that rebuild because the
// roll is still "fresh", so the whole sequence animates together — while rolls from an EARLIER click
// (already settled) are left static and never re-spun, even when grouped with the new ones. Each entry
// carries `_t` (its creation time) set in doRoll.
function animateNewGroup(el){
  if(!el||!rollLog.length)return;
  const now=Date.now();
  for(const r of rollLog){
    if(now-(r._t||0)>=ROLL_REEL_MS)continue; // settled — leave static
    animateRollTotal(el.querySelector(`[data-rollid="${r.id}"] .rl-total`),r.total,r.roll&&r.roll.formula);
  }
}
// Where the roll log lives (B224b): docked in the sidebar when the rail is usable (a bottom section when
// wide; a thin number+icon when the rail is mini), or detached as a floating corner pill when the rail is
// hidden (mobile). offsetParent===null on the mount means the rail is display:none → float.
function rollLogPlacement(){
  const mount=document.getElementById("rollLogMount");
  const docked=!!(mount&&mount.offsetParent!==null);
  const app=document.getElementById("app");
  const mini=docked&&!!app&&app.classList.contains("rail-mini")&&!app.classList.contains("sidebar-open");
  return {mount,docked,mini};
}
function renderRollLog(scrollNew){
  let el=document.getElementById("rollLog");
  // With dice rolling disabled, suppress the roll log entirely (B127).
  if(!rollLog.length||!clickRollOn()){if(el)el.remove();return;}
  const {mount,docked,mini}=rollLogPlacement();
  if(!el){el=document.createElement("div");el.id="rollLog";el.className="roll-log";}
  const parent=docked?mount:(document.querySelector(".main")||document.body);
  if(el.parentNode!==parent)parent.appendChild(el);
  el.classList.toggle("rl-docked",docked);el.classList.toggle("rl-float",!docked);el.classList.toggle("rl-mini",mini);
  el.classList.toggle("open",docked?!mini:rollLogOpen); // docked-wide = always-shown section; mini = icon; float = pill/panel
  el.classList.remove("rl-bl","rl-br","rl-tl","rl-tr");if(!docked)el.classList.add("rl-"+_rlCorner);
  el.innerHTML=rollLogHTML({docked,mini});
  bindRollLog(el,scrollNew,{docked,mini});
  if(scrollNew)animateNewGroup(el);
}
// Re-dock/re-render when the layout changes (mobile breakpoint, or the rail toggling mini/open).
let _rlReflow=null;
function reflowRollLog(){if(document.getElementById("rollLog")){clearTimeout(_rlReflow);_rlReflow=setTimeout(()=>renderRollLog(),60);}}
if(typeof window!=="undefined"){window.addEventListener("resize",reflowRollLog);
  // The rail toggling mini/open changes the dock form — re-render on #app class changes.
  const _app=document.getElementById("app");
  if(_app&&typeof MutationObserver!=="undefined")new MutationObserver(reflowRollLog).observe(_app,{attributes:true,attributeFilter:["class"]});}
// Roll-row building blocks (module-level so the collapsed pill/mini-icon hover popover can render a full
// row too — total · who-rolled · label · breakdown · type tag) (B226).
function rlTagHTML(r){if(!r.type)return "";const dmgAbbr=r.type==="damage"&&r.dmgType?(DMG_ABBR[r.dmgType.toLowerCase()]||r.dmgType):null;const label=dmgAbbr||ROLL_TAG[r.type]||r.type.toUpperCase();return `<span class="rl-tag rl-tag-${r.type}"${r.type==="damage"&&r.dmgType?` data-dmgtype="${esc(r.dmgType)}"`:""}>${esc(label)}</span>`;}
function rlPartsHTML(r){const adv=r.adv?`<span class="rl-advlbl ${r.adv}">${r.adv==="adv"?"ADV":"DIS"}</span>`:"";const crit=r.crit?'<span class="rl-crit">CRIT</span>':"";return `<span class="rl-parts">${adv}${crit}<span class="rl-pnum">${esc(r.parts)}</span></span>`;}
function rlSrcHTML(src){return src?`<button class="rl-src" data-rollsrc="${esc(src.id||"")}" data-rollsrcname="${esc(src.name)}">${esc(src.name)}</button>`:"";}
function rlAbAttr(ab){return ab?` data-abil="${esc(ab)}"`:"";}
function rlSingleHTML(r){return `<div class="rl-row${r.crit?" crit":""}${r.outcome?" "+r.outcome:""}"${rlAbAttr(r.abil)} data-rollid="${r.id}"><span class="rl-total">${r.total}</span><span class="rl-mid">${rlSrcHTML(r.source)}<span class="rl-lbl">${esc(r.label)}</span>${rlPartsHTML(r)}</span>${rlTagHTML(r)}</div>`;}
function rlSubHTML(r){return `<div class="rl-row rl-sub${r.crit?" crit":""}${r.outcome?" "+r.outcome:""}"${rlAbAttr(r.abil)} data-rollid="${r.id}"><span class="rl-total">${r.total}</span><span class="rl-mid">${rlPartsHTML(r)}</span>${rlTagHTML(r)}</div>`;}
// One group's HTML, exactly as the log renders it: a single roll → one row; multiple consecutive rolls that
// share source+label → a header once, then each sub-roll (with a spanning colour bar when the ability matches).
function rlGroupHTML(g){
  if(g.items.length===1)return rlSingleHTML(g.items[0]);
  const ab0=g.items[0].abil,allSame=ab0&&g.items.every(it=>it.abil===ab0);
  return `<div class="rl-group${allSame?" rl-group-abil":""}"${allSame?rlAbAttr(ab0):""}><div class="rl-ghead">${rlSrcHTML(g.source)}<span class="rl-glbl">${esc(g.label)}</span></div>${g.items.map(rlSubHTML).join("")}</div>`;
}
// The newest group = the most recent roll plus any directly-preceding rolls that share its source+label
// (same grouping the log uses), so the pill/icon hover previews exactly what the log shows.
function rlLatestGroup(){
  if(!rollLog.length)return null;
  const key0=(rollLog[0].source?rollLog[0].source.name:"~")+"|"+(rollLog[0].label||"");
  const items=[];
  for(const r of rollLog){if(((r.source?r.source.name:"~")+"|"+(r.label||""))!==key0)break;items.push(r);}
  return {items,source:rollLog[0].source,label:rollLog[0].label,abil:rollLog[0].abil};
}
// Hover popover for the collapsed pill / mini icon: the full latest group, structured + styled exactly like
// the log (wrapped in .roll-log so the row styles apply) inside the standard popover chrome.
function showRollPopover(anchor){if(typeof showPopover!=="function")return;const g=rlLatestGroup();if(!g)return;showPopover(anchor,`<div class="roll-log rl-poprow">${rlGroupHTML(g)}</div>`);}
// Build the roll-log inner HTML (header + grouped/single rows). Pure — no DOM mutation or binding.
// ctx = {docked, mini} chooses the form: sidebar section / mini rail icon / floating pill or panel (B224b).
function rollLogHTML(ctx){
  // Split the shared log into two tabs: DM side = "My rolls" / "Player rolls" (B213); player side (when the
  // DM is mirroring dice and the player has claimed a character) = "My rolls" / "DM rolls" (B236). "Mine" =
  // !fromPlayer on the DM side; on the player side = rolls attributed to the player's own character name.
  const dmShare=(typeof combatShareOn==="function"&&combatShareOn()&&!PLAYER_MODE);
  const myName=PLAYER_MODE&&typeof pmMyRollName==="function"?pmMyRollName():null;
  const playerShare=PLAYER_MODE&&!!(state&&state.__pmDiceOn)&&!!myName;
  const tabbed=dmShare||playerShare,otherLabel=dmShare?"Player rolls":"DM rolls";
  const isMine=r=>dmShare?!r.fromPlayer:!!(r.source&&r.source.name===myName);
  const list=tabbed?rollLog.filter(r=>rollLogTab==="players"?!isMine(r):isMine(r)):rollLog;
  const ordered=rollLogSort==="asc"?list.slice().reverse():list;
  // Shared bits. The TYPE tag (carries the dmg type for the hover popover) is a row-level child on
  // the right, and the ability-colour bar sits in a reserved right gutter (data-abil on the row), so
  // tags + bars line up identically for single and grouped rows (B63). The breakdown line scrolls
  // horizontally with no visible scrollbar; the adv/dis tag is inline at the START of it (scrolls
  // with the dice rather than staying pinned).
  // Group consecutive rolls that share source + name (B61): a header once, then each sub-roll. When
  // every roll in the group shares one ability, draw a SINGLE colour bar spanning the whole group (B64).
  const groups=[];ordered.forEach(r=>{const key=(r.source?r.source.name:"~")+"|"+(r.label||"");const g=groups[groups.length-1];
    if(g&&g.key===key)g.items.push(r);else groups.push({key,items:[r],source:r.source,label:r.label,abil:r.abil});});
  const tabs=tabbed?`<div class="rl-tabs"><button class="rl-tab${rollLogTab==="mine"?" on":""}" data-rltab="mine">My rolls</button><button class="rl-tab${rollLogTab==="players"?" on":""}" data-rltab="players">${otherLabel}</button></div>`:"";
  const bodyInner=groups.length?groups.map(rlGroupHTML).join(""):`<div class="rl-empty">No ${tabbed&&rollLogTab==="players"?(dmShare?"player ":"DM "):""}rolls yet.</div>`;
  const last=ordered.length?rollLog[0]:null;const lastTotal=last?String(last.total):"";const modeCls=rollMode||"flat";
  // Mini rail → a mode-coloured dice icon + the last total; click opens the menu, hover shows the full roll.
  if(ctx&&ctx.mini)return `<button class="rl-icon mode-${modeCls}" id="rlIcon" title="Rolls" aria-label="Rolls"><span class="rl-pill-ico">${D20_ICON}</span><span class="rl-icon-n">${esc(lastTotal)}</span></button>`;
  // Floating (rail hidden) + collapsed → a pill showing the LAST rolled number (hover shows the full last roll).
  if(ctx&&!ctx.docked&&!rollLogOpen)return `<button class="rl-pill mode-${modeCls}" id="rlPill" title="Open roll log" aria-label="Open roll log"><span class="rl-pill-ico">${D20_ICON}</span><span class="rl-pill-n">${esc(lastTotal)}</span></button>`;
  // Section (docked-wide) or open floating panel → header + body + tabs (tabs docked at the BOTTOM, B226).
  // The header carries a CLICKABLE flat→adv→dis cycle tag; the collapse chevron only floats.
  const cycle=`<button class="rl-modecycle ${modeCls}" data-rollcycle title="Roll mode — click to cycle: flat → advantage → disadvantage">${rollMode==="adv"?"ADV":rollMode==="dis"?"DIS":"FLAT"}</button>`;
  const collapse=(ctx&&ctx.docked)?"":`<button class="rl-tog" id="rlTog" title="Collapse">${FS_CHEVRON}</button>`;
  return `<div class="rl-head">${collapse}<span class="rl-title">Rolls</span><div class="rl-grow"></div>${cycle}<button class="rl-kebab" id="rlMenu" title="Roll options">⋯</button></div>`
    +`<div class="rl-body">${bodyInner}</div>`+tabs;
}
// Wire up the roll-log controls + row interactions after its HTML is in the DOM.
function bindRollLog(el,scrollNew,ctx){
  ctx=ctx||{};
  const last=rollLog[0];
  const popHover=anchor=>{if(!last)return;anchor.addEventListener("mouseenter",()=>showRollPopover(anchor));anchor.addEventListener("mouseleave",()=>{if(typeof closePopover==="function")closePopover();});};
  // Mini rail → the icon opens the menu; hover shows the full last roll.
  const icon=el.querySelector("#rlIcon");
  if(icon){icon.addEventListener("click",e=>{e.stopPropagation();openRollLogMenu(icon);});popHover(icon);return;}
  // Floating + collapsed → a draggable pill; click expands (suppressed right after a drag); hover = full last roll.
  const pill=el.querySelector("#rlPill");
  if(pill){
    bindRollLogDrag(el,pill);
    pill.addEventListener("click",()=>{if(performance.now()-_rlDragEnd<300)return;rollLogOpen=true;saveRollLogState();renderRollLog();});
    popHover(pill);
    return;
  }
  // Section (docked) or open floating panel.
  if(ctx.docked===false)bindRollLogDrag(el,el.querySelector(".rl-head")); // only the floating panel drags/snaps
  const tog=el.querySelector("#rlTog");if(tog)tog.addEventListener("click",()=>{rollLogOpen=!rollLogOpen;saveRollLogState();renderRollLog();});
  const cyc=el.querySelector("[data-rollcycle]");if(cyc)cyc.addEventListener("click",e=>{e.stopPropagation();cycleRollMode();});
  el.querySelector("#rlMenu").addEventListener("click",e=>{e.stopPropagation();openRollLogMenu(e.currentTarget);});
  // Breakdown is always shown now (B226); rows just take a right-click entry menu.
  el.querySelectorAll("[data-rollid]").forEach(rw=>rw.addEventListener("contextmenu",e=>{e.preventDefault();e.stopPropagation();openRollEntryMenu(rw,rw.dataset.rollid);}));
  el.querySelectorAll(".rl-body .rl-row").forEach((r,i)=>r.classList.toggle("rl-alt",i%2===1)); // subtle zebra
  // Hover a DMG tag → small popover naming the damage type (B62).
  el.querySelectorAll(".rl-tag-damage[data-dmgtype]").forEach(t=>{
    t.addEventListener("mouseenter",()=>showMiniTip(t,esc(capWord(t.dataset.dmgtype))+" damage"));
    t.addEventListener("mouseleave",hideMiniTip);});
  el.querySelectorAll("[data-rltab]").forEach(t=>t.addEventListener("click",e=>{e.stopPropagation();rollLogTab=t.dataset.rltab;renderRollLog();}));
  el.querySelectorAll("[data-rollsrc]").forEach(b=>{
    const id=b.dataset.rollsrc,monSaved=id&&state.lib.find(x=>x.id===id),mon=monSaved||(M&&M.name===b.dataset.rollsrcname?M:null);
    if(mon){
      b.addEventListener("click",e=>{e.stopPropagation();if(monSaved){loadMonster(monSaved);switchView("forge");}});
      bindPreviewHover(b,()=>mon);
    }else{
      // A player's roll → preview their character (B213), the PC counterpart to the monster statblock preview.
      const pc=state.roster&&state.roster.find(r=>r.name===b.dataset.rollsrcname);
      if(pc&&typeof showPcPreview==="function"){
        b.addEventListener("click",e=>{e.stopPropagation();showPcPreview(b,pc);});
        b.addEventListener("mouseenter",()=>showPcPreview(b,pc));
        b.addEventListener("mouseleave",closePopover);
      }
    }
  });
  // Scroll to the newest roll when one was just recorded — top for newest-first, bottom otherwise (B65).
  if(scrollNew&&el.classList.contains("open")){const body=el.querySelector(".rl-body");if(body)body.scrollTop=rollLogSort==="desc"?0:body.scrollHeight;}
}
// Drag the roll-log (by its header, or the pill itself when collapsed) and SNAP to the nearest viewport
// corner on release; the corner persists (B223). A real drag suppresses the pill's expand-click via _rlDragEnd.
let _rlDragEnd=0;
function bindRollLogDrag(el,head){
  if(!head)return;head.classList.add("rl-drag-h");
  head.addEventListener("pointerdown",e=>{
    if(e.target.closest("button:not(.rl-pill),[data-rltab]"))return; // header controls keep their clicks; the pill IS the handle
    const startX=e.clientX,startY=e.clientY,r=el.getBoundingClientRect(),ox=r.left,oy=r.top;let moved=false;
    el.classList.add("dragging");el.style.left=ox+"px";el.style.top=oy+"px";el.style.right="auto";el.style.bottom="auto";
    const move=ev=>{const dx=ev.clientX-startX,dy=ev.clientY-startY;if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;
      el.style.left=Math.max(4,Math.min(window.innerWidth-el.offsetWidth-4,ox+dx))+"px";
      el.style.top=Math.max(4,Math.min(window.innerHeight-el.offsetHeight-4,oy+dy))+"px";};
    const up=ev=>{el.classList.remove("dragging");document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);
      el.style.left="";el.style.top="";el.style.right="";el.style.bottom="";
      if(!moved)return; // a click, not a drag — leave the corner as-is, let the click handler run
      _rlDragEnd=performance.now();
      const cx=ev.clientX,cy=ev.clientY;_rlCorner=(cy<window.innerHeight/2?"t":"b")+(cx<window.innerWidth/2?"l":"r");
      saveRollLogState();renderRollLog();};
    document.addEventListener("pointermove",move);document.addEventListener("pointerup",up);
    e.preventDefault();
  });
}
function openRollLogMenu(anchor){
  const sortLabel=rollLogSort==="desc"?"Newest at bottom":"Newest at top";
  // Sticky roll mode lives here now (B223): Flat / Advantage / Disadvantage, the active one checked.
  const modeItem=(m,lbl)=>`<button class="popitem popcheck${rollMode===m||(m===null&&!rollMode)?" on":""}" data-rlmode="${m===null?"flat":m}"><span class="ck">${rollMode===m||(m===null&&!rollMode)?"✓":""}</span>${lbl}</button>`;
  const p=showPopover(anchor,`<div class="pop-grp-lbl">Roll mode</div>${modeItem(null,"Flat")}${modeItem("adv","Advantage")}${modeItem("dis","Disadvantage")}<div class="popsep"></div><button class="popitem" data-rlm="notation">Dice notation</button><button class="popitem" data-rlm="sort">${sortLabel}</button><button class="popitem" data-rlm="custom">Custom roll</button><div class="popsep"></div><button class="popitem danger" data-rlm="clear">Clear log</button>`);
  p.querySelectorAll("[data-rlmode]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();setRollMode(b.dataset.rlmode==="flat"?null:b.dataset.rlmode);closePopover();}));
  p.querySelectorAll("[data-rlm]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const a=b.dataset.rlm;
    if(a==="notation"){closePopover();showPopover(anchor,diceHelpHTML());}
    else if(a==="sort"){rollLogSort=rollLogSort==="desc"?"asc":"desc";closePopover();renderRollLog();}
    else if(a==="custom"){closePopover();openCustomRoll(anchor);}
    else{rollLog=[];closePopover();renderRollLog();}
  }));
}
function openRollEntryMenu(anchor,id){
  const p=showPopover(anchor,`<button class="popitem" data-re="reroll">↻ Reroll</button><button class="popitem danger" data-re="remove">Remove</button>`);
  p.querySelectorAll("[data-re]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const a=b.dataset.re;closePopover();if(a==="reroll")rerollEntry(id);else removeRollEntry(id);}));
}
// Custom roll: no base formula (cmd-click). Field is empty with a "1d20" placeholder and rolls
// 1d20 if left blank; no source is attached (so the roll-log shows no statblock name).
function openCustomRoll(anchor){openRollPopover(anchor,{value:"",formula:"1d20",placeholder:"1d20",label:"Custom roll",type:null,custom:true});}
// Roll-options popover: the shared roll-mode tag + editable clockworkmod formula + Roll + (?) help.
// For a scalable spell (o.scale), the adv/dis tag is replaced by an upcast level field + dropdown
// that rescales the dice (B65).
// The lead control of the roll popover: an upcast level stepper (spell scaling), a CRIT chip (damage),
// or the flat/adv/dis mode tag (everything else). B75.
function rollPopLeadHTML(o,sc,isDmg,phLvl){
  if(sc)return `<div class="upcast" title="Cast at spell level — leave blank for level ${phLvl}"><span class="up-lbl">Lv</span><input type="number" class="up-in" min="${sc.lvl}" max="9" placeholder="${phLvl}"></div>`;
  if(isDmg)return `<button class="crit-chip" data-critchip title="Treat as a critical hit (double the dice)">CRIT</button>`;
  return rollModeTagHTML();
}
function openRollPopover(anchor,o){
  const sc=o.scale;                       // spell-damage roller: level stepper
  const isDmg=!sc&&o.type==="damage";     // damage roller: crit chip
  const phLvl=sc?(sc.cast||sc.lvl):0;     // placeholder/default cast level
  let critOn=false;
  const initVal=sc?scaledFormula(sc,phLvl):(o.value!=null?o.value:(o.formula||""));
  const lead=rollPopLeadHTML(o,sc,isDmg,phLvl);
  const html=`<div class="roll-pop">${lead}<input type="text" class="roll-edit-in" value="${esc(initVal)}" autocomplete="off" spellcheck="false" placeholder="${esc(o.placeholder||"e.g. 2d6+4")}"><button class="btn primary sm" data-rollgo style="width:auto">Roll</button><button class="roll-help" data-rollhelp title="Dice notation">?</button></div>`;
  const p=showPopover(anchor,html);
  // When opened from inside a reference popover, sit above it and keep that popover alive while the
  // roll popup is hovered (B66).
  const rp=anchor.closest&&anchor.closest(".refpop");
  if(rp){p.style.zIndex=(parseInt(rp.style.zIndex,10)||70)+5;clearTimeout(_refTimer);p.addEventListener("mouseenter",()=>clearTimeout(_refTimer));}
  const inp=p.querySelector(".roll-edit-in");if(inp){inp.focus();inp.select();}
  const at=p.querySelector("[data-rollmode]");
  if(at)at.addEventListener("click",e=>{e.stopPropagation();cycleRollMode();at.className="roll-mode"+(rollMode?" "+rollMode:"");at.textContent=rollMode==="adv"?"ADV":rollMode==="dis"?"DIS":"NORMAL";if(document.getElementById("rollLog"))renderRollLog();});
  const crit=p.querySelector("[data-critchip]");
  if(crit)crit.addEventListener("click",e=>{e.stopPropagation();critOn=!critOn;crit.classList.toggle("on",critOn);});
  if(sc){const upin=p.querySelector(".up-in");
    const applyLvl=()=>{const L=clamp(parseInt(upin.value,10)||phLvl,sc.lvl,9);if(inp)inp.value=scaledFormula(sc,L);};
    if(upin)upin.addEventListener("input",applyLvl);}
  const go=()=>{const v=(inp&&inp.value.trim())||o.formula;if(!v)return;
    // Tag the cast level onto a spell roll's label, e.g. "Lightning Bolt • LV5" (B67).
    let label=o.label;
    if(sc){const upin=p.querySelector(".up-in");const L=clamp(parseInt(upin&&upin.value,10)||phLvl,sc.lvl,9);label=`${o.label} • LV${L}`;}
    closePopover();doRoll(v,{adv:sc||isDmg?null:rollMode,crit:critOn},{label,type:o.type,custom:o.custom,abil:o.abil,dmgType:o.dmgType});};
  p.querySelector("[data-rollgo]").addEventListener("click",e=>{e.stopPropagation();go();});
  if(inp)inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go();}});
  const help=p.querySelector("[data-rollhelp]");
  help.addEventListener("mouseenter",()=>showDiceHelp(help));
  help.addEventListener("mouseleave",()=>hideDiceHelp());
  help.addEventListener("click",e=>{e.stopPropagation();showDiceHelp(help);});
}
// Lightweight dice-notation tooltip shown beside the (?) — a separate floating element so it does
// not tear down the roll popover underneath (hover or click).
let _diceTip=null;
function showDiceHelp(anchor){hideDiceHelp();const p=document.createElement("div");p.className="popover dice-help-pop";p.innerHTML=diceHelpHTML();document.body.appendChild(p);
  const r=anchor.getBoundingClientRect();let left=Math.min(r.left,window.innerWidth-p.offsetWidth-8);left=Math.max(8,left);
  let top=r.bottom+6;if(top+p.offsetHeight>window.innerHeight-8)top=Math.max(8,r.top-p.offsetHeight-6);
  p.style.left=left+"px";p.style.top=top+"px";_diceTip=p;}
function hideDiceHelp(){if(_diceTip){_diceTip.remove();_diceTip=null;}}
// Tiny hover tooltip (e.g. the damage type behind a DMG tag) — a separate floating element.
let _miniTip=null;
function showMiniTip(anchor,html){hideMiniTip();const p=document.createElement("div");p.className="mini-tip";p.innerHTML=html;document.body.appendChild(p);
  const r=anchor.getBoundingClientRect();let left=Math.min(r.left,window.innerWidth-p.offsetWidth-8);left=Math.max(8,left);
  let top=r.top-p.offsetHeight-6;if(top<8)top=r.bottom+6;p.style.left=left+"px";p.style.top=top+"px";_miniTip=p;}
function hideMiniTip(){if(_miniTip){_miniTip.remove();_miniTip=null;}}
function openRollMenu(span){openRollPopover(span,{formula:span.dataset.roll,label:rollLabelFor(span),type:span.dataset.rolltype,abil:span.dataset.abil});}
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

const VIEW_LABELS={forge:"Forge",library:"Bestiary",adventures:"Adventures",combat:"Combat",settings:"Settings"};
function setCrumbs(parts){const el=$("#crumbs");if(!el)return;el.innerHTML=parts.map((p,i)=>`<span class="${i===parts.length-1?"cur":"up"}">${esc(p)}</span>`).join('<span class="sep">›</span>');}
// Draggable split between the form and preview columns; width persists, dbl-click resets (B60).
function initForgeResizer(){
  const fg=document.querySelector(".forge"),rz=$("#forgeResizer");if(!fg||!rz)return;
  try{const w=localStorage.getItem("mf_pvw");if(w)fg.style.setProperty("--pvw",w);const h=localStorage.getItem("mf_pvh");if(h)fg.style.setProperty("--pvh",h);}catch(e){}
  const vertical=()=>window.matchMedia("(max-width:1080px)").matches; // stacked layout → drag up/down
  let drag=false;
  rz.addEventListener("pointerdown",e=>{drag=true;rz.classList.add("drag");rz.setPointerCapture(e.pointerId);e.preventDefault();});
  rz.addEventListener("pointermove",e=>{if(!drag)return;const r=fg.getBoundingClientRect();
    if(vertical()){let hp=Math.round(r.bottom-e.clientY);hp=Math.max(150,Math.min(r.height-170,hp));fg.style.setProperty("--pvh",hp+"px");}
    else{let w=Math.round(r.right-e.clientX);w=Math.max(300,Math.min(r.width-340,w));fg.style.setProperty("--pvw",w+"px");}});
  const end=e=>{if(!drag)return;drag=false;rz.classList.remove("drag");try{rz.releasePointerCapture(e.pointerId);}catch(_){}
    try{localStorage.setItem("mf_pvw",fg.style.getPropertyValue("--pvw"));localStorage.setItem("mf_pvh",fg.style.getPropertyValue("--pvh"));}catch(_){}};
  rz.addEventListener("pointerup",end);rz.addEventListener("pointercancel",end);
  rz.addEventListener("dblclick",()=>{fg.style.removeProperty("--pvw");fg.style.removeProperty("--pvh");try{localStorage.removeItem("mf_pvw");localStorage.removeItem("mf_pvh");}catch(_){}});
}
let _curView="forge",_prevView="forge"; // track views so the gear can toggle settings closed

// ── Global rolling UI (moved from adventures.js, B132) ───────────────────────
// Rule-finder button, statblock click-to-roll delegation, the pointer-following d20 cursor, the
// Alt/long-press custom-roll, and the rolling-related keyboard shortcuts. Lives here (the rolling +
// refpop engine) rather than in adventures.js. All callbacks resolve at runtime, so load order is moot.
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
// In player mode all dice UI (rolling, the d20 cursor, the roll log) is gated on the DM's "show dice" toggle
// (B234): no dice at all when it's off, full dice when it's on.
function clickRollOn(){return !ruleFinder&&!!(state.settings&&state.settings.clickRoll&&state.settings.clickRoll.on)&&(!PLAYER_MODE||!!(state&&state.__pmDiceOn));}
// Show the spinning d20 over rollable elements, and anywhere while Alt/Option is held (since that arms
// the click-anywhere custom roll). Body gets .cmd-armed so the native cursor hides for the d20 (B61).
function updateDiceCursor(overRoll){
  // The pointer-following d20 only makes sense with a real (mouse/trackpad) pointer. On touch, iPad Safari
  // fires a synthetic mousemove on tap, which would otherwise leave the spinning d20 stuck over the tapped
  // rollable (there's no "move away" on touch) — so gate the whole cursor on a fine, hovering pointer.
  let fine=true;try{fine=matchMedia("(hover:hover) and (pointer:fine)").matches;}catch(e){}
  // The 3D held cursor-die (B217) replaces the 2D d20 on hover-over-roll where it engages (desktop, motion on,
  // WebGL ok); keep the 2D cursor as the fallback elsewhere and as the Alt-armed custom-roll indicator.
  const d3dHover=overRoll&&typeof d3dPickupOn==="function"&&d3dPickupOn();
  if(fine&&((clickRollOn()&&overRoll&&!d3dHover)||_cmdHeld)){const el=diceCursorEl();el.classList.add("show");el.style.left=_ptrX+"px";el.style.top=_ptrY+"px";}
  else if(_diceCur)_diceCur.classList.remove("show");
}
// The sticky-mode TELL (B223): a small ▲/▼ badge riding the cursor (beside the 3D held die) over any
// rollable while advantage/disadvantage is on, so you can see the active mode right where you roll.
let _rmTell=null;
function rollModeTellEl(){if(!_rmTell){_rmTell=document.createElement("div");_rmTell.id="rollModeTell";document.body.appendChild(_rmTell);}return _rmTell;}
// Tie the tell to the actual d20 cursor-die: it shows only while a d20 die is held (B224) — so it never
// lingers without the die or over non-d20 rolls. dice3d.js calls this when the held die appears/clears.
function updateRollModeTell(){
  const held=(typeof d3dHeld!=="undefined"&&d3dHeld&&d3dHeld.sides===20);
  if(rollMode&&held){const t=rollModeTellEl();t.className="show "+rollMode;t.textContent=rollMode==="adv"?"▲":"▼";t.style.left=_ptrX+"px";t.style.top=_ptrY+"px";}
  else if(_rmTell)_rmTell.className="";
}
document.addEventListener("mousemove",e=>{_ptrX=e.clientX;_ptrY=e.clientY;const over=e.target.closest&&e.target.closest("[data-roll]");updateDiceCursor(over);updateRollModeTell();});
document.addEventListener("keydown",e=>{if(e.key==="Alt"&&!_cmdHeld&&clickRollOn()){_cmdHeld=true;document.body.classList.add("cmd-armed");updateDiceCursor(false);}});
// ↑ / ↓ set the sticky roll mode to advantage / disadvantage (press the active one again → flat). Gated so
// it never steals arrows from a focused field, an open dialog/menu, or a modifier combo (B223).
document.addEventListener("keydown",e=>{
  if((e.key!=="ArrowUp"&&e.key!=="ArrowDown")||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey||!clickRollOn())return;
  const ae=document.activeElement;
  if(ae&&(ae.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)))return;
  if([...document.querySelectorAll(".modal,.popover")].some(el=>el.getClientRects().length))return; // a VISIBLE dialog/menu owns the arrows (hidden hosts persist in the DOM)
  e.preventDefault();
  const want=e.key==="ArrowUp"?"adv":"dis";
  setRollMode(rollMode===want?null:want);
  if(typeof toast==="function")toast(rollMode==="adv"?"Advantage on":rollMode==="dis"?"Disadvantage on":"Flat rolls",1300);
});
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
