// ── parsers.js — markdown / 5etools statblock & reference importers ───────────
// Pure parsing layer, extracted from app.js (Batch 26). Loaded after data.js,
// before app.js. Functions are called at runtime, so cross-file globals
// (blankMonster from app.js; mod/T/SKILLS/DMG_TYPES/CR_LIST/pbForCR from data.js)
// resolve via the shared global lexical environment.

const ABIL_FULL={str:"Strength",dex:"Dexterity",con:"Constitution",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};

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
function slug(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}

// ── 5etools JSON ingestion (Batch 28) ─────────────────────────────────────────
// Native 5etools data files are the canonical structured source the old markdown
// dumps were generated from. Parsing them directly is far more reliable: AC/HP/
// saves/skills come in exact, and one bestiary-*.json holds a whole book. These
// importers map the JSON straight onto the Forge monster/spell/condition shapes.

// Strip/translate 5etools "{@tag …}" markup into the app's lightly-marked-down text.
// Attack/Hit/DC/damage/recharge get house wording; every other tag collapses to its
// display text. Output uses the same *italic*/**bold**/"- " list markup the preview
// already renders (fmtBlock/fmtInline).
function richStrip(s){
  if(s==null)return "";
  s=String(s);
  s=s.replace(/\{@atkr?\s+([^}]+)\}/gi,(_,codes)=>{const c=codes.toLowerCase().replace(/\s+/g,"");
    const mel=/m/.test(c),ran=/r/.test(c);
    return "*"+(mel&&ran?"Melee or Ranged Attack Roll":mel?"Melee Attack Roll":ran?"Ranged Attack Roll":"Attack Roll")+":*";});
  s=s.replace(/\{@hit\s+([+-]?\d+)\}/gi,(_,n)=>sgn(+n));
  s=s.replace(/\{@h\}/gi,"*Hit:* ");
  s=s.replace(/\{@dc\s+([^}|]+)(?:\|[^}]*)?\}/gi,(_,n)=>"DC "+n.trim());
  s=s.replace(/\{@recharge(\s+\d+)?\}/gi,(m,n)=>n?`(Recharge ${n.trim()}–6)`:"(Recharge 5–6)");
  s=s.replace(/\{@(?:damage|dice|scaledamage|scaledice|autodice)\s+([^}|]+)(?:\|[^}]*)?\}/gi,(_,d)=>d.trim());
  // 2024 action/reaction markup (must precede the generic collapses below). Trigger/Response
  // are emitted plain so reaction parsing can split them; saves use the house italic wording.
  s=s.replace(/\{@actTrigger\}/gi,"Trigger: ");
  s=s.replace(/\{@actResponse(?:\s+[^}]*)?\}/gi,"Response: ");
  s=s.replace(/\{@actSave\s+([a-z|]+)\}/gi,(_,ab)=>"*"+ab.split("|").map(a=>ABIL_FULL[a.toLowerCase()]||a.toUpperCase()).join(" or ")+" Saving Throw:*");
  s=s.replace(/\{@actSaveSuccessOrFail(?:\s+[^}]*)?\}/gi,"*Failure or Success:*");
  s=s.replace(/\{@actSaveFail(?:\s+[^}]*)?\}/gi,"*Failure:*");
  s=s.replace(/\{@actSaveSuccess(?:\s+[^}]*)?\}/gi,"*Success:*");
  // generic links: keep the display text (3+ parts → trailing override, else first segment)
  s=s.replace(/\{@[a-z]+\s+([^}]*?)\}/gi,(_,body)=>{const parts=body.split("|");
    let txt=(parts.length>=3&&parts[parts.length-1].trim())?parts[parts.length-1]:parts[0];
    return txt.replace(/\s*\[[^\]]*\]\s*/g," ").trim();});
  s=s.replace(/\{@[a-z]+\}/gi,"");
  s=s.replace(/(Attack Roll:\*)\s*([+-]\d+)\s+to hit/g,"$1 $2"); // drop the 2014 "+5 to hit" redundancy
  return s.replace(/[ \t]{2,}/g," ").replace(/[ \t]+([.,;])/g,"$1").trim();
}
// Flatten a 5etools "entries" array (strings + typed objects) to plain marked-down text.
function entriesToText(entries){
  if(entries==null)return "";
  if(!Array.isArray(entries))entries=[entries];
  const out=[];
  entries.forEach(e=>{
    if(e==null)return;
    if(typeof e==="string"||typeof e==="number"){out.push(richStrip(String(e)));return;}
    if(typeof e!=="object")return;
    const named=(body)=>e.name?"**"+richStrip(e.name)+".** "+body:body;
    switch(e.type){
      case "list":(e.items||[]).forEach(it=>{
        if(typeof it==="string")out.push("- "+richStrip(it));
        else if(it&&(it.entries||it.entry||it.name))out.push("- "+(it.name?"**"+richStrip(it.name)+".** ":"")+entriesToText(it.entries||it.entry||[]));
        else out.push("- "+entriesToText(it));});
        break;
      case "table":
        if(e.caption)out.push("**"+richStrip(e.caption)+"**");
        (e.rows||[]).forEach(row=>out.push((row||[]).map(c=>typeof c==="string"?richStrip(c):entriesToText(c)).join(" | ")));
        break;
      case "quote":out.push(entriesToText(e.entries||[]));break;
      default:out.push(named(entriesToText(e.entries||e.entry||[])));
    }
  });
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

// Render a 5etools "spellcasting" block to a Spellcasting trait body.
function renderSpellcasting(sc){
  const out=[];
  const hdr=entriesToText(sc.headerEntries||[]);if(hdr)out.push(hdr);
  const names=arr=>(arr||[]).map(x=>richStrip(x)).join(", ");
  if(sc.will&&sc.will.length)out.push("At will: "+names(sc.will));
  const freqBlock=(obj,label)=>{if(!obj)return;Object.keys(obj).sort().forEach(k=>{
    const each=/e$/.test(k),n=k.replace(/e$/,"");out.push(n+"/"+label+(each?" each":"")+": "+names(obj[k]));});};
  freqBlock(sc.daily,"day");freqBlock(sc.rest,"rest");freqBlock(sc.weekly,"week");freqBlock(sc.recharge,"recharge");
  if(sc.spells){Object.keys(sc.spells).sort((a,b)=>+a-+b).forEach(lv=>{const g=sc.spells[lv];
    const lab=lv==="0"?"Cantrips (at will)":(lv+(lv==="1"?"st":lv==="2"?"nd":lv==="3"?"rd":"th")+"-level"+(g.slots?` (${g.slots} slot${g.slots>1?"s":""})`:""));
    out.push(lab+": "+names(g.spells));});}
  const ftr=entriesToText(sc.footerEntries||[]);if(ftr)out.push(ftr);
  return out.join("\n");
}

// Map one resolved 5etools monster object onto a Forge monster.
function mapMonsterJSON(mon,legGroups){
  const m=blankMonster();m._auto={ac:false,hp:false};
  m.name=mon.name||"Unnamed";
  if(Array.isArray(mon.size)&&mon.size.length)m.size=SIZE_CODE[mon.size[0]]||m.size;
  // type: string, or {type, tags:[…]}, or {type:{choose:[…]}}
  if(typeof mon.type==="string")m.type=mon.type.replace(/^./,c=>c.toUpperCase());
  else if(mon.type&&typeof mon.type==="object"){
    const t=typeof mon.type.type==="string"?mon.type.type:(mon.type.type&&mon.type.type.choose&&mon.type.type.choose[0])||"";
    if(t)m.type=t.replace(/^./,c=>c.toUpperCase());
    const tags=(mon.type.tags||[]).map(x=>typeof x==="string"?x:(x.tag||x.prefix||"")).filter(Boolean);
    if(tags.length)m.subtype=tags.join(", ");}
  m.align=alignFromArr(mon.alignment)||"";
  // AC
  if(Array.isArray(mon.ac)&&mon.ac.length){const a0=mon.ac[0];
    if(typeof a0==="number")m.ac=a0;
    else if(a0&&typeof a0==="object"){m.ac=a0.ac;const note=[].concat(a0.from||[]).map(x=>richStrip(typeof x==="string"?x:x.entry||"")).filter(Boolean).join(", ");if(note)m.acnote=note;else if(a0.condition)m.acnote=richStrip(a0.condition);}}
  // HP
  if(mon.hp){if(typeof mon.hp.average==="number")m.hp=mon.hp.average;if(mon.hp.formula)m.hpf=mon.hp.formula;
    if(mon.hp.special&&m.hp==null){m.hpf=richStrip(mon.hp.special);}}
  // speed
  if(mon.speed&&typeof mon.speed==="object"){const sp=Object.assign({walk:0,climb:0,fly:0,swim:0,burrow:0,hover:false},m.spd);
    ["walk","climb","fly","swim","burrow"].forEach(k=>{const v=mon.speed[k];if(typeof v==="number")sp[k]=v;else if(v&&typeof v==="object"&&typeof v.number==="number")sp[k]=v.number;});
    if(mon.speed.canHover||(mon.speed.fly&&typeof mon.speed.fly==="object"&&/hover/i.test(mon.speed.fly.condition||"")))sp.hover=true;
    m.spd=sp;}
  ["str","dex","con","int","wis","cha"].forEach(a=>{if(typeof mon[a]==="number")m[a]=mon[a];});
  // saving throws → proficiency flags (exact bonus is recomputed from CR like the paste importer)
  if(mon.save)Object.keys(mon.save).forEach(k=>{const a=k.toLowerCase();if(ABILS.includes(a)&&!m.saves.includes(a))m.saves.push(a);});
  // skills → [Name, tier]
  if(mon.skill){const pb=pbForCR(m.cr);Object.keys(mon.skill).forEach(k=>{const key=SKILL_LOOKUP[k.toLowerCase()];if(!key)return;
    const bonus=(parseInt(mon.skill[k],10)||0)-mod(m[SKILLS[key]]);m.skills.push([key,bonus>=pb*2?"exp":bonus<=0?"none":"prof"]);});}
  // senses + passive
  const senseStr=[].concat(mon.senses||[]).map(s=>richStrip(s)).join(", ");
  m.senses=parseSenses(senseStr);
  let other=senseStr.replace(/(darkvision|blindsight|tremorsense|truesight)\s*\d+\s*ft\.?/ig,"").replace(/\bblind beyond[^,;]*/i,"").replace(/[,;\s]+$/,"").replace(/^[,;\s]+/,"").trim();
  if(other)m.senses.other=other;
  // damage immune/resist/vuln + condition immunities
  const applyDmg=(list,tier)=>{const notes=[];[].concat(list||[]).forEach(x=>{
    if(typeof x==="string"){const hit=DMG_TYPES.find(d=>d.toLowerCase()===x.toLowerCase());if(hit)m.dmg[hit]=tier;else notes.push(x);}
    else if(x&&typeof x==="object"){const inner=x.immune||x.resist||x.vulnerable||[];const txt=inner.map(i=>typeof i==="string"?i:"").filter(Boolean).join(", ");
      const note=(txt?txt:"")+(x.note?" "+x.note:"");if(note.trim())notes.push(note.trim());}});
    return notes;};
  applyDmg(mon.immune,"imm").forEach(n=>m.cimm=(m.cimm?m.cimm+", ":"")+n);
  const resNotes=applyDmg(mon.resist,"res");if(resNotes.length)m.dmgnote=(m.dmgnote?m.dmgnote+"; ":"")+resNotes.map(n=>n+" (Resistance)").join("; ");
  applyDmg(mon.vulnerable,"vuln");
  if(mon.conditionImmune){const ci=[].concat(mon.conditionImmune).map(x=>typeof x==="string"?x:(x.conditionImmune?[].concat(x.conditionImmune).join(", ")+(x.note?" "+x.note:""):"")).filter(Boolean).map(s=>richStrip(s)).join(", ");
    if(ci)m.cimm=(m.cimm?m.cimm+", ":"")+ci;}
  // languages
  if(mon.languages){const lg=[].concat(mon.languages).map(x=>richStrip(x)).join(", ");m.lang=lg||"—";}
  // CR
  let cr=mon.cr;if(cr&&typeof cr==="object")cr=cr.cr;if(cr!=null){cr=String(cr);if(CR_LIST.includes(cr))m.cr=cr;}
  // entry sections
  const toEntries=arr=>[].concat(arr||[]).map(e=>T(richStrip(e.name||""),entriesToText(e.entries||e.entry||[])));
  if(mon.trait)m.traits=m.traits.concat(toEntries(mon.trait));
  if(mon.spellcasting)[].concat(mon.spellcasting).forEach(sc=>m.traits.push(T(richStrip(sc.name||"Spellcasting"),renderSpellcasting(sc))));
  if(mon.action)m.actions=toEntries(mon.action);
  if(mon.bonus)m.bonus=toEntries(mon.bonus);
  if(mon.reaction)m.reactions=[].concat(mon.reaction).map(e=>{const body=entriesToText(e.entries||e.entry||[]);
    const tm=body.match(/Trigger:\s*([\s\S]*?)\s*Response:\s*([\s\S]+)/i);
    return tm?{mode:"react",name:richStrip(e.name||""),trigger:tm[1].trim(),response:tm[2].trim()}:{mode:"react",name:richStrip(e.name||""),trigger:"",response:body};});
  if(mon.legendary){const intro=entriesToText(mon.legendaryHeader||[]);m.legend={on:true,intro,items:toEntries(mon.legendary)};}
  if(mon.mythic){const intro=entriesToText(mon.mythicHeader||[]);if(!m.legend.on)m.legend={on:true,intro,items:[]};m.legend.items=m.legend.items.concat(toEntries(mon.mythic));}
  // Lair actions & regional effects live in a separate legendarygroups file, referenced
  // by name|source. Stash the ref so a later legendarygroups upload can be re-applied.
  if(mon.legendaryGroup){m._legGroup={name:mon.legendaryGroup.name,source:mon.legendaryGroup.source};
    const grp=legGroups&&legGroups.get((m._legGroup.name+"|"+(m._legGroup.source||"")).toLowerCase());
    if(grp)applyLegendaryGroup(m,grp);}
  return m;
}
// legendarygroups.json → name|source → raw group. Build an index across blobs.
function parseLegendaryGroupsJSON(json){const map={};((json&&json.legendaryGroup)||[]).forEach(g=>{if(g&&g.name)map[(g.name+"|"+(g.source||"")).toLowerCase()]=g;});return map;}
function legGroupIndex(jsonBlobs){const idx=new Map();[].concat(jsonBlobs||[]).forEach(j=>{((j&&j.legendaryGroup)||[]).forEach(g=>{if(g&&g.name)idx.set((g.name+"|"+(g.source||"")).toLowerCase(),g);});});return idx;}
// Split a lairActions/regionalEffects block (leading prose + a {type:list}) into the
// Forge's intro + named-less items. Mutates m.lair / m.regional in place.
function applyLegendaryGroup(m,grp){
  if(grp.lairActions){const intro=[],items=[];let started=false;
    [].concat(grp.lairActions).forEach(e=>{
      if(typeof e==="string"){if(started)items.push(T("",richStrip(e)));else intro.push(richStrip(e));}
      else if(e&&e.type==="list"){started=true;(e.items||[]).forEach(it=>items.push(T("",entriesToText(it))));}
      else{started=true;items.push(T("",entriesToText(e)));}});
    m.lair={on:true,intro:intro.join("\n"),items};}
  if(grp.regionalEffects){m.regional={on:true,text:entriesToText(grp.regionalEffects)};}
}

// ── _copy / _mod resolution ───────────────────────────────────────────────────
// ~26% of 5etools monsters are deltas of another creature (often in a different book).
// Resolve against a name|source index so variants inherit the base statblock; bases
// that aren't loaded leave the variant unresolved (the caller skips & reports it).
const _ckey=m=>((m.name||"")+"|"+(m.source||"")).toLowerCase();
function _deepClone(o){return o==null?o:JSON.parse(JSON.stringify(o));}
function _deepReplaceTxt(o,find,repl){
  if(typeof o==="string")return find?o.split(find).join(repl):o;
  if(Array.isArray(o))return o.map(x=>_deepReplaceTxt(x,find,repl));
  if(o&&typeof o==="object"){const r={};for(const k in o)r[k]=_deepReplaceTxt(o[k],find,repl);return r;}
  return o;}
function _applyMod(target,modObj){
  const run=(prop,ops)=>{(Array.isArray(ops)?ops:[ops]).forEach(op=>{
    if(!op||typeof op!=="object"){return;}
    const mode=op.mode;
    if(mode==="replaceTxt"){const find=op.replace,repl=op.with!=null?op.with:"";
      if(prop==="*"){const r=_deepReplaceTxt(target,find,repl);for(const k in r)target[k]=r[k];}
      else if(target[prop]!=null)target[prop]=_deepReplaceTxt(target[prop],find,repl);
      return;}
    if(mode==="setProp"){if(op.prop)target[op.prop]=op.value;return;}
    if(mode==="addSkills"){target.skill=Object.assign({},target.skill,op.skills);return;}
    if(prop==="*")return;
    const items=op.items==null?[]:(Array.isArray(op.items)?op.items:[op.items]);
    const nameOf=x=>x&&x.name;
    if(!Array.isArray(target[prop]))target[prop]=target[prop]==null?[]:[target[prop]];
    const arr=target[prop];
    switch(mode){
      case "appendArr":arr.push(...items);break;
      case "prependArr":arr.unshift(...items);break;
      case "insertArr":arr.splice(op.index==null?arr.length:op.index,0,...items);break;
      case "appendIfNotExistsArr":items.forEach(it=>{if(!arr.some(x=>nameOf(x)===nameOf(it)))arr.push(it);});break;
      case "replaceArr":{const find=op.replace&&typeof op.replace==="object"?op.replace.index:arr.findIndex(x=>nameOf(x)===op.replace);
        const idx=typeof find==="number"?find:-1;if(idx>=0)arr.splice(idx,1,...items);else arr.push(...items);break;}
      case "removeArr":{const names=op.names||(op.items?items.map(nameOf):[]);target[prop]=arr.filter(x=>!names.includes(nameOf(x)));break;}
      default:break; // replaceSpells/addSpells/removeSpells etc. left as the base's
    }});};
  for(const prop in modObj)run(prop,modObj[prop]);
}
// Returns a resolved clone, or null if the base can't be found / a cycle is hit.
function resolveCopy(mon,index,seen){
  if(!mon._copy)return mon;
  seen=seen||new Set();
  const bk=((mon._copy.name||"")+"|"+(mon._copy.source||"")).toLowerCase();
  if(seen.has(bk))return null;
  let base=index.get(bk);if(!base)return null;
  if(base._copy)base=resolveCopy(base,index,new Set([...seen,_ckey(mon)]));
  if(!base)return null;
  const out=_deepClone(base);
  // adopt the variant's identity + any directly-overridden fields
  Object.keys(mon).forEach(k=>{if(k==="_copy"||k==="_mod"||k==="_preserve"||k==="_trait")return;out[k]=_deepClone(mon[k]);});
  delete out._copy;
  if(mon._copy._mod)_applyMod(out,mon._copy._mod);
  return out;
}
// Build a name|source → raw-monster index from any number of bestiary JSON blobs.
function bestiaryIndex(jsonBlobs){const idx=new Map();[].concat(jsonBlobs||[]).forEach(j=>{((j&&j.monster)||[]).forEach(m=>{if(m&&m.name)idx.set(_ckey(m),m);});});return idx;}

// Parse a bestiary JSON file → {monsters:[…], skipped:n}. `index` is a shared base index
// (build it across the whole upload batch + session so cross-file _copy resolves).
function parseBestiaryJSON(json,fileName,booksMap,index,legGroups){
  index=index||bestiaryIndex([json]);
  const out=[];let skipped=0;const used={};
  ((json&&json.monster)||[]).forEach(mon=>{
    if(!mon||!mon.name)return;
    let resolved=mon;
    if(mon._copy){resolved=resolveCopy(mon,index);if(!resolved){skipped++;return;}}
    let m;try{m=mapMonsterJSON(resolved,legGroups);}catch(e){skipped++;return;}
    m._preset=true;m._kind="statblock";m.chassis=true;m._source=fileName;
    annotateBook(m,mon.source,booksMap);
    let id="p_"+slug(fileName)+"_"+slug(m.name);if(used[id])id+="_"+(++used[id]);used[id]=(used[id]||0)+1;
    m.id=id;out.push(m);
  });
  return {monsters:out,skipped};
}
// books.json → {SOURCE:{name,group}} reference map
function parseBooksJSON(json){const map={};((json&&json.book)||[]).forEach(b=>{if(b&&b.source)map[b.source]={name:b.name||b.source,group:b.group||""};});return map;}
// stamp _book (full title) + _group from the entry's own source code, when a books ref is loaded
function annotateBook(obj,srcCode,booksMap){const b=booksMap&&srcCode&&booksMap[srcCode];obj._srcCode=srcCode||"";obj._book=b?b.name:"";obj._group=b?b.group:"";return obj;}

// Spell JSON → Forge spell record (same shape parseSpellsMD produced, plus _srcCode/_book/_group).
function parseSpellsJSON(json,fileName,booksMap){
  const out=[];
  ((json&&json.spell)||[]).forEach(sp=>{if(!sp||!sp.name)return;
    const time=(sp.time||[]).map(t=>(t.number?t.number+" ":"")+(t.unit||"")+(t.condition?", "+richStrip(t.condition):"")).join(", ");
    const range=fmtSpellRange(sp.range);
    const comp=fmtSpellComponents(sp.components);
    const dur=fmtSpellDuration(sp.duration);
    let body=entriesToText(sp.entries||[]);
    const higher=entriesToText(sp.entriesHigherLevel||[]);if(higher)body+="\n\n"+higher;
    const rec={id:"sp_"+slug(fileName)+"_"+slug(sp.name),name:sp.name,level:(sp.level==null?null:sp.level),
      school:SPELL_SCHOOL[sp.school]||sp.school||"",castingTime:time,range,components:comp,duration:dur,
      text:body,source:fileName,_source:fileName,_kind:"spell"};
    annotateBook(rec,sp.source,booksMap);out.push(rec);});
  return out;
}
function fmtSpellRange(r){if(!r)return "";if(typeof r==="string")return r;
  if(r.type==="special")return "Special";
  const d=r.distance;if(!d)return r.type||"";
  if(d.type==="self")return "Self"+(r.type&&r.type!=="point"?` (${r.type})`:"");
  if(d.type==="touch")return "Touch";
  if(d.amount!=null)return d.amount+" "+(d.type||"feet")+(r.type&&r.type!=="point"&&r.type!=="radius"?` (${r.type})`:"");
  return d.type||r.type||"";}
function fmtSpellComponents(c){if(!c)return "";const p=[];if(c.v)p.push("V");if(c.s)p.push("S");
  if(c.m)p.push("M"+(typeof c.m==="string"?` (${richStrip(c.m)})`:(c.m&&c.m.text?` (${richStrip(c.m.text)})`:"")));return p.join(", ");}
function fmtSpellDuration(d){if(!d)return "";return [].concat(d).map(x=>{if(typeof x==="string")return x;
  if(x.type==="instant")return "Instantaneous";if(x.type==="permanent")return "Permanent";
  if(x.type==="special")return "Special";
  if(x.type==="timed"&&x.duration)return (x.concentration?"Concentration, up to ":"")+(x.duration.amount||"")+" "+(x.duration.type||"");
  return x.type||"";}).join(", ");}

// Conditions/diseases/status JSON → Forge condition records (matches parseConditionsMD output).
function parseConditionsJSON(json,fileName,booksMap){
  const out=[];const take=(arr,cat)=>[].concat(arr||[]).forEach(c=>{if(!c||!c.name)return;
    const rec={id:"cd_"+slug(fileName)+"_"+slug(c.name),name:c.name,category:cat,source:c.source||"",
      text:entriesToText(c.entries||[]),_source:fileName,_kind:"condition"};
    annotateBook(rec,c.source,booksMap);out.push(rec);});
  take(json&&json.condition,"Conditions");take(json&&json.disease,"Diseases");take(json&&json.status,"Status");
  // de-dupe by name, preferring the newer X-prefixed source (XPHB over PHB), as the .md importer did
  const byName={},rank=s=>/^x/i.test(s||"")?2:1;
  out.forEach(c=>{const k=c.name.toLowerCase(),ex=byName[k];if(!ex||rank(c.source)>rank(ex.source))byName[k]=c;});
  return Object.values(byName);
}
// Identify an uploaded 5etools JSON by its top-level keys.
function detectJsonKind(json){
  if(!json||typeof json!=="object")return null;
  if(json.book)return "book";
  if(json.legendaryGroup)return "legendaryGroup";
  if(json.monster)return "statblock";
  if(json.spell)return "spell";
  if(json.condition||json.disease||json.status)return "condition";
  return null;
}
