// ── parsers.js — markdown / 5etools statblock & reference importers ───────────
// Pure parsing layer, extracted from app.js (Batch 26). Loaded after data.js,
// before app.js. Functions are called at runtime, so cross-file globals
// (blankMonster from app.js; mod/T/SKILLS/DMG_TYPES/CR_LIST/pbForCR from data.js)
// resolve via the shared global lexical environment.

function parseSpeed(str){const s={walk:0,climb:0,fly:0,swim:0,burrow:0,hover:/hover/i.test(str||"")};
  const w=String(str||"").match(/^\s*(\d+)\s*ft/i);if(w)s.walk=+w[1];
  ["climb","fly","swim","burrow"].forEach(k=>{const m=new RegExp(k+"\\s*(\\d+)","i").exec(str||"");if(m)s[k]=+m[1];});
  return s;}
function parseSenses(str){const s={darkvision:0,blindsight:0,tremorsense:0,truesight:0,blindBeyond:/blind beyond/i.test(str||""),other:""};
  ["darkvision","blindsight","tremorsense","truesight"].forEach(k=>{const m=new RegExp(k+"\\s*(\\d+)","i").exec(str||"");if(m)s[k]=+m[1];});
  return s;}

// Parses a 5e.tools / MM'25-style plain-text block into a monster. Label-keyed,
// European-number tolerant; actions/traits imported as text entries.
const SEC_HEADERS={traits:"traits",actions:"actions","bonus actions":"bonus",reactions:"reactions","legendary actions":"legend","lair actions":"lair","regional effects":"regional","villain actions":"villain"};
function classifyDmg(str){const types={},note=[];String(str).split(/[,;]/).map(t=>t.trim()).filter(Boolean).forEach(tok=>{const hit=DMG_TYPES.find(d=>d.toLowerCase()===tok.toLowerCase());if(hit)types[hit]=1;else note.push(tok);});return{types,note};}
// Expand the abbreviated 5etools attack notation (e.g. "m,r 9", "mw 6") that
// survives token-stripping into readable wording matching the app's own attacks.
// m=melee, r=ranged (mw/ms/rw/rs = weapon/spell variants); a comma pair = "or".
// Only fires when an entry body STARTS with a recognized code, so ordinary text
// ("moves 9 squares…") is left alone. Italicises the following "Hit:" to match.
function normAtkWording(t){
  if(!t)return t;let matched=false;
  let s=String(t).replace(/^\s*(mw,rw|ms,rs|m,r|r,m|mw|rw|ms|rs|m|r)\s+([+-]?\d+)(?=[,.\s])/i,(_,code,bon)=>{
    matched=true;const c=code.toLowerCase(),mel=/m/.test(c),ran=/r/.test(c);
    return "*"+(mel&&ran?"Melee or Ranged Attack Roll":mel?"Melee Attack Roll":"Ranged Attack Roll")+":* "+sgn(+bon);});
  if(matched)s=s.replace(/\bHit:/,"*Hit:*");
  return s;}
// split a section's blocks into named entries; frequency/continuation lines fold into the previous entry
function parseEntries(blocks){const out=[];(blocks||[]).forEach(b=>{b=b.trim();if(!b)return;
  const isCont=/^(at will|cantrip|constant|\d\s*\/\s*day|\d(?:st|nd|rd|th)[- ]level|level \d)/i.test(b);
  const mm=b.match(/^(.{1,60}?)\.\s+([\s\S]+)$/);
  if(mm&&!isCont)out.push({name:mm[1].trim(),text:normAtkWording(mm[2].trim())});
  else if(out.length)out[out.length-1].text+="\n"+b;
  else out.push({name:"",text:normAtkWording(b)});});
  return out;}
function splitIntro(blocks){if(!blocks||!blocks.length)return{intro:"",items:[]};
  const introRe=/legendary action uses|immediately after another creature|on initiative count|can take \d+ legendary|^the .* takes a lair action|villain action/i;
  if(introRe.test(blocks[0]))return{intro:blocks[0].trim(),items:parseEntries(blocks.slice(1))};
  return{intro:"",items:parseEntries(blocks)};}
function parse5etools(raw){
  const m=blankMonster();m._auto={ac:false,hp:false};
  const lines=raw.replace(/\r/g,"").split("\n").map(l=>l.trim());
  let i=0;while(i<lines.length&&!lines[i])i++;if(i>=lines.length)return null;
  m.name=lines[i++];
  const sizeRe=/^(tiny|small|medium|large|huge|gargantuan)\b/i;
  let typeIdx=-1;for(let j=i;j<lines.length;j++){if(/^AC\s/i.test(lines[j]))break;if(sizeRe.test(lines[j])){typeIdx=j;break;}}
  if(typeIdx>=0){const parts=lines[typeIdx].split(",");const left=parts[0].trim();m.align=parts.slice(1).join(",").trim();
    const sm=left.match(sizeRe);m.size=sm[0][0].toUpperCase()+sm[0].slice(1).toLowerCase();
    let rest=left.replace(sizeRe,"").trim();const sub=rest.match(/\(([^)]+)\)/);if(sub){m.subtype=sub[1].trim();rest=rest.replace(/\([^)]*\)/,"").trim();}
    m.type=rest;i=typeIdx+1;}
  const isHeader=l=>SEC_HEADERS[l.toLowerCase()]!==undefined;
  let secStart=lines.length;for(let j=i;j<lines.length;j++){if(isHeader(lines[j])){secStart=j;break;}}
  let skillsRaw=null,mt;
  for(let j=i;j<secStart;j++){const l=lines[j];if(!l)continue;
    if(mt=l.match(/^AC\s+(\d+)\s*(?:\(([^)]+)\))?/i)){m.ac=+mt[1];if(mt[2])m.acnote=mt[2].trim();}
    else if(mt=l.match(/^Initiative\s+([+-]?\d+)/i))m.init=+mt[1];
    else if(mt=l.match(/^HP\s+(\d+)\s*(?:\(([^)]+)\))?/i)){m.hp=+mt[1];if(mt[2])m.hpf=mt[2].trim();}
    else if(mt=l.match(/^Speed\s+(.+)/i))m.spd=Object.assign(m.spd,parseSpeed(mt[1]));
    else if(mt=l.match(/^Skills?\s+(.+)/i))skillsRaw=mt[1];
    else if(mt=l.match(/^Saving Throws?\s+(.+)/i))mt[1].split(",").forEach(s=>{const sm2=s.trim().match(/^(str|dex|con|int|wis|cha)/i);if(sm2&&!m.saves.includes(sm2[1].toLowerCase()))m.saves.push(sm2[1].toLowerCase());});
    else if(mt=l.match(/^Immunities\s+(.+)/i)){const c=classifyDmg(mt[1]);Object.keys(c.types).forEach(t=>m.dmg[t]="imm");if(c.note.length)m.cimm=(m.cimm?m.cimm+", ":"")+c.note.join(", ");}
    else if(mt=l.match(/^Resistances\s+(.+)/i)){const c=classifyDmg(mt[1]);Object.keys(c.types).forEach(t=>m.dmg[t]="res");if(c.note.length)m.dmgnote=c.note.map(n=>n+" (Resistance)").join("; ");}
    else if(mt=l.match(/^Vulnerabilities\s+(.+)/i)){const c=classifyDmg(mt[1]);Object.keys(c.types).forEach(t=>m.dmg[t]="vuln");}
    else if(mt=l.match(/^Condition Immunities\s+(.+)/i))m.cimm=(m.cimm?m.cimm+", ":"")+mt[1].trim().replace(/\s*;\s*/g,", ");
    else if(mt=l.match(/^Gear\s+(.+)/i))m.gear=mt[1].trim();
    else if(mt=l.match(/^Senses\s+(.+)/i)){m.senses=parseSenses(mt[1]);
      let other=mt[1].replace(/Passive Perception\s+\d+/i,"").replace(/(darkvision|blindsight|tremorsense|truesight)\s*\d+\s*ft\.?/ig,"").replace(/\bblind beyond[^,;]*/i,"").replace(/[,;\s]+$/,"").replace(/^[,;\s]+/,"").trim();
      if(other)m.senses.other=other;}
    else if(mt=l.match(/^Languages?\s+(.+)/i))m.lang=mt[1].trim();
    else if(mt=l.match(/^(?:CR|Challenge(?: Rating)?)\s+([\d/]+)/i)){if(CR_LIST.includes(mt[1]))m.cr=mt[1];}
    else if(/^(str|dex|con|int|wis|cha)$/i.test(l)){const ab=l.toLowerCase(),nums=[];let k=j+1;
      while(k<secStart&&nums.length<3){const t=lines[k];if(t!==""){if(/^[+-]?\d+$/.test(t))nums.push(t);else break;}k++;}
      if(nums.length>=1)m[ab]=+nums[0];
      if(nums.length>=3&&Number(nums[2])!==mod(m[ab])&&!m.saves.includes(ab))m.saves.push(ab);
      j=k-1;}}
  if(skillsRaw){const pb=pbForCR(m.cr);skillsRaw.split(",").forEach(s=>{const mm2=s.trim().match(/^([A-Za-z' ]+?)\s*([+-]\d+)$/);if(!mm2)return;const nm=mm2[1].trim().replace(/ /g,"_");if(!SKILLS[nm])return;
    const bonus=(+mm2[2])-mod(m[SKILLS[nm]]);m.skills.push([nm,bonus>=pb*2?"exp":bonus<=0?"none":"prof"]);});}
  // sections → blank-line-separated blocks
  let cur=null;const sec={};let buf=[];
  const flush=()=>{if(buf.length){(sec[cur]=sec[cur]||[]).push(buf.join(" ").trim());buf=[];}};
  for(let j=secStart;j<lines.length;j++){const l=lines[j];if(isHeader(l)){flush();cur=SEC_HEADERS[l.toLowerCase()];continue;}if(!cur)continue;if(l==="")flush();else buf.push(l);}
  flush();
  const toEntries=blocks=>parseEntries(blocks).map(e=>T(e.name,e.text));
  if(sec.traits)m.traits=toEntries(sec.traits);
  if(sec.actions)m.actions=toEntries(sec.actions);
  if(sec.bonus)m.bonus=toEntries(sec.bonus);
  if(sec.reactions)m.reactions=parseEntries(sec.reactions).map(e=>{const tm=e.text.match(/Trigger:\s*([\s\S]*?)\s*Response:\s*([\s\S]+)/i);return tm?{mode:"react",name:e.name,trigger:tm[1].trim(),response:tm[2].trim()}:{mode:"react",name:e.name,trigger:"",response:e.text};});
  if(sec.legend){const s=splitIntro(sec.legend);m.legend={on:true,intro:s.intro,items:s.items.map(e=>T(e.name,e.text))};}
  if(sec.lair){const s=splitIntro(sec.lair);m.lair={on:true,intro:s.intro,items:s.items.map(e=>T(e.name,e.text))};}
  if(sec.villain){const s=splitIntro(sec.villain);m.villain={on:true,intro:s.intro,items:s.items.map((e,ix)=>Object.assign(T(e.name,e.text),{mode:"villain",round:Math.min(3,ix+1)}))};}
  if(sec.regional)m.regional={on:true,text:(sec.regional||[]).join("\n\n")};
  return m;}
// ── Markdown statblock importer (Batch 13) ────────────────────────────────────
// Converts a 5etools-style markdown dump (### Name / *type* / - **AC** … / ability
// table / **Actions** …) into the plain-text shape parse5etools already understands,
// then reuses that parser. One .md file holds many statblocks split by `---`.
function stripMdTokens(s){
  return s
    .replace(/\{@recharge(\s+\d+)?\}/gi,(m,n)=>n?`(Recharge ${n.trim()}–6)`:"(Recharge 5–6)")
    .replace(/\{@[a-z]+\s+([^}|]+?)(?:\|[^}]*)?\}/gi,"$1") // {@creature Foo|src} → Foo
    .replace(/\{@[a-z]+\}/gi,"")
    .replace(/\[Area of Effect\]/gi,"").replace(/\[hover\]/gi,"");
}
function mdBlockToPlain(block){
  block=stripMdTokens(block.replace(/\r/g,""));
  const out=[],ORD=["STR","DEX","CON","INT","WIS","CHA"];let pend=false;
  block.split("\n").forEach(raw=>{
    let l=raw.trim();
    if(!l){out.push("");return;}
    if(l.startsWith("|")){
      const cells=l.split("|").map(c=>c.trim()).filter(c=>c.length);
      if(cells.every(c=>/^:?-+:?$/.test(c)))return;                       // table rule
      if(ORD.every((a,i)=>(cells[i]||"").toUpperCase()===a)){pend=true;return;} // ability header
      if(pend){pend=false;cells.slice(0,6).forEach((c,i)=>{const sm=c.match(/(-?\d+)\s*\(([+-]?\d+)\)/);out.push(ORD[i]);if(sm){out.push(sm[1]);out.push(sm[2]);}else{const n=c.match(/-?\d+/);out.push(n?n[0]:"10");}});return;}
      return;
    }
    if(l.startsWith("#")){out.push(l.replace(/^#+\s*/,""));return;}        // ### Name
    const hd=l.match(/^\*\*([A-Za-z ]+)\*\*$/);if(hd){out.push(hd[1].trim());return;} // **Actions**
    l=l.replace(/^[-]\s+/,"").replace(/\*+/g,"").replace(/\s{2,}/g," ").replace(/\s+([.,;])/g,"$1");
    out.push(l.trim());
  });
  return out.join("\n");
}
function parseStatblockMD(raw,source){
  const chunks=raw.replace(/\r/g,"").split(/^\s*---\s*$/m).filter(c=>/^\s*#{2,3}\s+/m.test(c));
  const out=[];
  chunks.forEach(ch=>{
    let m;try{m=parse5etools(mdBlockToPlain(ch));}catch(e){m=null;}
    if(m&&m.name){m._preset=true;m._source=source;m._kind="statblock";m.chassis=true;m.id="p_"+slug(source)+"_"+slug(m.name);out.push(m);}
  });
  return out;
}
function slug(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}
// Decide what an uploaded .md actually is, so spells/conditions aren't parsed as statblocks.
function detectMdKind(raw){
  if(/-\s*\*\*Casting Time:\*\*/i.test(raw))return "spell";
  if(/^##\s+Conditions\b/mi.test(raw)||/^\*Source:\s*X?PHB/mi.test(raw))return "condition";
  return "statblock";
}
// Spell dump: ### Name / *Level N School* (or *School cantrip*) / - **Casting Time:** … / body.
function parseSpellsMD(raw,source){
  const chunks=stripMdTokens(raw.replace(/\r/g,"")).split(/^\s*---\s*$/m).filter(c=>/^\s*#{2,3}\s+/m.test(c));
  const out=[];
  chunks.forEach(ch=>{
    const lines=ch.split("\n");let i=0,name="",meta="",fields={},body=[];
    for(;i<lines.length;i++){const t=lines[i].trim();if(/^#{2,3}\s+/.test(t)){name=t.replace(/^#+\s*/,"").trim();i++;break;}}
    for(;i<lines.length;i++){const t=lines[i].trim();if(!t)continue;const mm=t.match(/^\*(.+)\*$/);if(mm)meta=mm[1].trim();i++;break;}
    for(;i<lines.length;i++){const t=lines[i].trim();
      const fm=t.match(/^-\s*\*\*([^:*]+):\*\*\s*(.*)$/);
      if(fm){fields[fm[1].trim().toLowerCase()]=fm[2].trim();continue;}
      body.push(t);}
    if(!name)return;
    let level=null,school=meta,mm;
    if(mm=meta.match(/^(.+?)\s+cantrip$/i)){level=0;school=mm[1].trim();}
    else if(mm=meta.match(/^Level\s+(\d+)\s+(.+)$/i)){level=+mm[1];school=mm[2].trim();}
    out.push({id:"sp_"+slug(source)+"_"+slug(name),name,level,school,
      castingTime:fields["casting time"]||"",range:fields["range"]||"",components:fields["components"]||"",duration:fields["duration"]||"",
      text:body.join("\n").replace(/\n{3,}/g,"\n\n").trim(),source,_source:source,_kind:"spell"});
  });
  return out;
}
// Conditions/diseases/status effects. The file lists several sources per name; when an
// X-prefixed source (e.g. XPHB) shares a name with its legacy version (PHB), keep only the
// newer one (Batch 14 note).
function parseConditionsMD(raw,source){
  const lines=stripMdTokens(raw.replace(/\r/g,"")).split("\n");
  const out=[];let category="",cur=null;
  const push=()=>{if(cur&&cur.name){cur.text=cur.body.join("\n").replace(/\n{3,}/g,"\n\n").trim();delete cur.body;out.push(cur);}cur=null;};
  lines.forEach(raw2=>{const l=raw2.replace(/\s+$/,""),t=l.trim();
    if(/^###\s+/.test(t)){push();cur={name:t.replace(/^#+\s*/,"").trim(),category,source:"",body:[]};return;}
    if(/^##\s+/.test(t)){push();category=t.replace(/^#+\s*/,"").trim();return;}
    if(!cur)return;
    const sm=t.match(/^\*Source:\s*(.+?)\*$/i);if(sm){cur.source=sm[1].trim();return;}
    if(/^---$/.test(t))return;
    cur.body.push(l);});
  push();
  const byName={},rank=s=>/^x/i.test(s)?2:1; // prefer XPHB/XDMG over PHB/DMG
  out.forEach(c=>{const k=c.name.toLowerCase(),ex=byName[k];if(!ex||rank(c.source)>rank(ex.source))byName[k]=c;});
  return Object.values(byName).map(c=>Object.assign(c,{id:"cd_"+slug(source)+"_"+slug(c.name),_source:source,_kind:"condition"}));
}
