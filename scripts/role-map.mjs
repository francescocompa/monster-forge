// T1.11 second sweep — two-axis model per the user's direction:
//   ROLE (locked five: soldier / artillery / brute / skirmisher / controller) assigned by nearest
//   role-feature centroid (centroids seeded from the k=7 spike's five role clusters; the nova-flyer
//   and critter clusters dissolve into the five roles — their distinguishing signals move to STATURE).
//   STATURE (decided Q1.D; "minion"→"fodder" renamed B272 — it collided with the MCDM minion
//   feature/tag): boss / elite / pack / fodder, party-relative; swarm = subtype pinned to pack;
//   nova = internal signal only.
//   node scripts/role-map.mjs   (dev tool, corpus-gated, NOT in verify; writes explorer-dataset.json next to itself, gitignored)
// Also the qualitative pass: per role, the most-shared action/trait names, and full sample statblocks
// to read. Emits explorer-dataset.json for the artifact's parameter explorer.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { bootApp, settle } from "../test/harness.js";

const CORPUS = process.env.MF_CORPUS
  || `${process.env.HOME}/Documents/D&D/5etool_mirror/5etools-v2.29.0/data/bestiary/bestiary-xmm.json`;
if (!existsSync(CORPUS)) { console.log("role-map: no corpus found. Set MF_CORPUS. Skipping."); process.exit(0); }
const bestiary = JSON.parse(readFileSync(CORPUS, "utf8"));
const { window } = bootApp();
await settle();
window.__json = bestiary;

const rows = window.eval(`(()=>{
  const CONDS=["Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated","Paralyzed",
    "Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious","Exhaustion"];
  const W2N={two:2,three:3,four:4,five:5,six:6};
  const txtOf=m=>{const parts=[];["actions","bonus","reactions","traits"].forEach(k=>(m[k]||[]).forEach(e=>{
    parts.push(e.name||"",e.text||"",e.extra||"");}));
    if(m.legend&&m.legend.items)m.legend.items.forEach(e=>parts.push(e.name||"",e.text||""));
    return parts.join(" ");};
  const namesOf=m=>{const ns=[];["actions","bonus","reactions","traits"].forEach(k=>(m[k]||[]).forEach(e=>{if(e.name)ns.push(e.name.replace(/\\s*\\(.*$/,"").trim());}));return ns;};
  const blockOf=m=>{const L=[];L.push(m.name+" — CR "+m.cr+" "+(m.size||"")+" "+(m.type||"")+", AC "+m.ac+", HP "+m.hp+", spd "+JSON.stringify(m.spd));
    ["traits","actions","bonus","reactions"].forEach(k=>(m[k]||[]).forEach(e=>L.push("  ["+k+"] "+(e.name||"")+": "+String(e.text||e.extra||(e.mode==="spell"?"(spell list) "+(e.groups||[]).map(g=>g.freq+": "+g.spells).join(" | "):"")||"").slice(0,220))));
    if(m.legend&&m.legend.on)(m.legend.items||[]).forEach(e=>L.push("  [legendary] "+(e.name||"")+": "+String(e.text||"").slice(0,180)));
    return L.join("\\n");};
  return parseBestiaryJSON(window.__json,"corpus").monsters.filter(m=>CR_LIST.includes(m.cr)).map(m=>{
    const e=crExpected(m.cr),off=offensiveCR(m),def=defensiveCR(m),x=dprExtract(m);
    const t=txtOf(m);
    const ranged=/(Ranged|Melee or Ranged) Attack Roll/i.test(t);
    const longRange=Math.max(0,...[...t.matchAll(/range (\\d+)/gi)].map(x=>+x[1]))>=80;
    const aoe=/each creature (?:in|within)|\\d+-foot(?:-| )(?:Cone|Line|Sphere|Cube|Emanation|radius)/i.test(t);
    let conds=0;
    const entries=[];["actions","bonus","reactions","traits"].forEach(k=>(m[k]||[]).forEach(e=>entries.push(String(e.text||e.extra||""))));
    if(m.legend&&m.legend.items)m.legend.items.forEach(e=>entries.push(String(e.text||"")));
    CONDS.forEach(c=>{const re=new RegExp(c+" condition","i");
      const hits=entries.filter(x=>re.test(x));if(!hits.length)return;
      conds+=hits.some(x=>/Saving Throw/i.test(x))?1:0.5;});
    const caster=(m.actions||[]).some(a=>a.mode==="spell")||/Spellcasting/i.test(t);
    const ma=t.match(/makes? (two|three|four|five|six|\\d)\\b[^.]{0,60}attack/i);
    const atkN=ma?(W2N[ma[1].toLowerCase()]||+ma[1]||1):1;
    const rdmg=x.rounds&&x.rounds.length?x.rounds.map(r=>r.dmg):[x.dpr,x.dpr,x.dpr];
    const meanR=rdmg.reduce((a,b)=>a+b,0)/rdmg.length||1;
    const maxSpd=Math.max(m.spd.walk||0,m.spd.fly||0,m.spd.swim||0,m.spd.burrow||0,m.spd.climb||0)||30;
    return {
      name:m.name,cr:m.cr,type:(m.type||"").toLowerCase(),conf:off.confidence,
      names:namesOf(m),block:blockOf(m),
      packTactics:/Pack Tactics/i.test(t),swarm:/^Swarm of/i.test(m.name),
      legendary:m.legend&&m.legend.on?1:0,legResist:/Legendary Resistance/i.test(t)?1:0,
      raw:{dprX:+(x.dpr/e.dprAvg).toFixed(2),hpX:+(def.rawHP/e.hpAvg).toFixed(2),
        acD:def.acDelta==null?0:def.acDelta,atkN,conds,spd:maxSpd,
        nova:+Math.log2(Math.max(...rdmg,1)/Math.max(meanR,1)).toFixed(2)},
      f:{
        acD:def.acDelta==null?0:def.acDelta,
        hpR:Math.log2(Math.max(def.rawHP,1)/e.hpAvg),
        dprR:Math.log2(Math.max(x.dpr,e.dprAvg*0.05)/e.dprAvg),
        nova:Math.log2(Math.max(...rdmg,1)/Math.max(meanR,1)),
        acc:off.anchor?off.anchor.val-off.anchor.exp:0,
        spdR:Math.log2(maxSpd/30),
        atkN:Math.log2(atkN),
        control:Math.min(conds,4)/4,
        ranged:longRange?1:(ranged?0.5:0),
        aoe:aoe?1:0,
        fly:(m.spd.fly||0)>0?1:0,
        caster:caster?1:0,
        legendary:m.legend&&m.legend.on?1:0,
        physRes:def.physRes?1:0,
        // T1.14 skirmisher gate mirror — sourced from the SHIPPED extractor so the evasion
        // vocabulary can never drift between this generator and data.js classifyRole
        evasive:(roleFeatures(m)||{}).evasive||0,
      }
    };
  });
})()`);

// ---- reproduce the k=7 spike clustering exactly (same scaling/weights/seeds) ----
const CONT = ["acD", "hpR", "dprR", "nova", "acc", "spdR", "atkN", "control"];
const BIN = ["ranged", "aoe", "fly", "caster", "legendary", "physRes"];
const W = { dprR: 1.4, hpR: 1.4, ranged: 1.3, control: 1.2, acD: 1.0, aoe: 1.0, nova: 1.0, atkN: 0.9,
  spdR: 0.8, caster: 0.8, fly: 0.6, legendary: 0.6, physRes: 0.6, acc: 0.5 };
const ok = rows.filter(r => r.conf === "ok");
const stats = {};
for (const k of CONT) {
  const v = ok.map(r => r.f[k]);
  const mu = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 1;
  stats[k] = { mu, sd };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const vecFull = (r) => [
  ...CONT.map(k => clamp((r.f[k] - stats[k].mu) / stats[k].sd, -2.5, 2.5) * W[k]),
  ...BIN.map(k => r.f[k] * 1.2 * W[k]),
];
const d2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
function kmeans(X, k, seed) {
  let rng = seed;
  const rand = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const cents = [X[Math.floor(rand() * X.length)]];
  while (cents.length < k) {
    const dists = X.map(x => Math.min(...cents.map(c => d2(x, c))));
    const sum = dists.reduce((a, b) => a + b, 0);
    let t = rand() * sum, i = 0;
    while (t > dists[i]) t -= dists[i++];
    cents.push(X[Math.min(i, X.length - 1)]);
  }
  let assign = new Array(X.length).fill(0);
  for (let it = 0; it < 60; it++) {
    let moved = false;
    for (let i = 0; i < X.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < k; c++) { const dd = d2(X[i], cents[c]); if (dd < bd) { bd = dd; best = c; } }
      if (assign[i] !== best) { assign[i] = best; moved = true; }
    }
    for (let c = 0; c < k; c++) {
      const mem = X.filter((_, i) => assign[i] === c);
      if (!mem.length) continue;
      cents[c] = X[0].map((_, j) => mem.reduce((s, x) => s + x[j], 0) / mem.length);
    }
    if (!moved) break;
  }
  const inertia = X.reduce((s, x, i) => s + d2(x, cents[assign[i]]), 0);
  return { cents, assign, inertia };
}
const Xfull = ok.map(vecFull);
let k7 = null;
for (let s = 1; s <= 30; s++) { const r = kmeans(Xfull, 7, s * 7919); if (!k7 || r.inertia < k7.inertia) k7 = r; }

// identify the five role clusters among the seven by their signatures (matches the spike exhibits)
const cmean = (c, key) => { const mem = ok.filter((_, i) => k7.assign[i] === c); return mem.reduce((s, r) => s + r.f[key], 0) / mem.length; };
const csize = (c) => k7.assign.filter(a => a === c).length;
const clusters = Array.from({ length: 7 }, (_, c) => ({
  c, n: csize(c), control: cmean(c, "control"), nova: cmean(c, "nova"), hpR: cmean(c, "hpR"),
  dprR: cmean(c, "dprR"), acD: cmean(c, "acD"), ranged: cmean(c, "ranged"),
}));
const byScore = (fn) => [...clusters].sort((a, b) => fn(b) - fn(a))[0].c;
const roleOf = {};
roleOf.controller = byScore(x => x.control);
roleOf.novaFlyer = byScore(x => x.c === roleOf.controller ? -9 : x.nova);
const rest = clusters.filter(x => x.c !== roleOf.controller && x.c !== roleOf.novaFlyer);
const pick = (fn) => { const s = [...rest].sort((a, b) => fn(b) - fn(a))[0]; rest.splice(rest.indexOf(s), 1); return s.c; };
roleOf.artillery = pick(x => x.dprR);            // highest damage of the rest
roleOf.brute = pick(x => x.hpR - x.acD / 4);     // most HP-for-AC trade
roleOf.skirmisher = pick(x => x.acD - x.hpR);    // most AC-for-HP trade
roleOf.critter = pick(x => -(x.dprR + x.hpR));   // most under-statted
roleOf.soldier = rest[0].c;
console.log("cluster identities:", roleOf);

// ---- CR-band centering for level-trending features (atkN, spdR) — B268 fix ----
// Attacks/turn and speed RISE with CR by design (band means: 1.1 -> 2.6 attacks, 35 -> 68 ft), so
// un-centered they leak LEVEL into ROLE and drag every high-CR monster toward soldier/artillery —
// the classifier read 0% skirmishers at CR 9+ while the raw AC-for-HP signature still ran 5-8%.
// Centering makes them "more attacks / faster THAN A MONSTER OF THIS CR usually is".
const BANDS = [[0, 1], [1.5, 4], [5, 8], [9, 12], [13, 30]];
const crNumB = (cr) => ({ "1/8": 0.125, "1/4": 0.25, "1/2": 0.5 }[cr] ?? +cr);
const bandIdx = (c) => BANDS.findIndex(([lo, hi]) => c >= lo && c <= hi);
const roleBandMeans = {}; // captured for the T1.12 constants export
for (const key of ["atkN", "spdR"]) {
  const bm = BANDS.map((_, bi) => {
    const mem = ok.filter(r => bandIdx(crNumB(r.cr)) === bi);
    return mem.reduce((s, r) => s + r.f[key], 0) / (mem.length || 1);
  });
  roleBandMeans[key] = bm;
  rows.forEach(r => { r.f[key] = r.f[key] - bm[Math.max(0, bandIdx(crNumB(r.cr)))]; });
}
// re-derive stats for the centered features (used by vecRole's z-scoring)
for (const key of ["atkN", "spdR"]) {
  const v = ok.map(r => r.f[key]);
  const mu = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 1;
  stats[key] = { mu, sd };
}

// ---- ROLE assignment: nearest centroid over ROLE FEATURES ONLY (stature signals excluded) ----
const ROLE_CONT = ["acD", "hpR", "dprR", "spdR", "atkN", "control", "acc"];
const ROLE_BIN = ["ranged", "aoe", "caster", "fly"];
const RW = { dprR: 1.4, hpR: 1.4, ranged: 1.3, control: 1.2, acD: 1.0, aoe: 1.0, atkN: 0.9, spdR: 0.8, caster: 0.8, fly: 0.5, acc: 0.5 };
const vecRole = (r) => [
  ...ROLE_CONT.map(k => clamp((r.f[k] - stats[k].mu) / (stats[k].sd || 1), -2.5, 2.5) * RW[k]),
  ...ROLE_BIN.map(k => r.f[k] * 1.2 * RW[k]),
];
// acc has no stats entry? it does (in CONT). control/atkN/spdR too. ok.
const ROLES = ["soldier", "artillery", "brute", "skirmisher", "controller"];
const roleCent = {};
for (const role of ROLES) {
  const mem = ok.filter((_, i) => k7.assign[i] === roleOf[role]).map(vecRole);
  roleCent[role] = mem[0].map((_, j) => mem.reduce((s, x) => s + x[j], 0) / mem.length);
}
rows.forEach(r => {
  const v = vecRole(r);
  let best = null, bd = Infinity;
  for (const role of ROLES) {
    // T1.14 hard gate (mirrors data.js classifyRole): slow + no evasion kit + no flight ≠ skirmisher.
    // r.f.spdR is already CR-band-centered here (B268 pass above).
    if (role === "skirmisher" && r.f.spdR <= 0 && !r.f.evasive && !r.f.fly) continue;
    const dd = d2(v, roleCent[role]); if (dd < bd) { bd = dd; best = role; }
  }
  r.role = best;
});

// ---- T1.12 export: the fixed constants the app's pure classifier (data.js classifyRole) needs.
// Paste-ready. These are corpus-derived AGGREGATES (like CR_EXPECT), not corpus data.
const r4 = (x) => +(+x).toFixed(4);
console.log("\n==== T1.12 constants (paste into data.js) ====");
console.log("const ROLE_LIST=" + JSON.stringify(ROLES) + ";");
console.log("const ROLE_BANDS=" + JSON.stringify(BANDS) + ";");
console.log("const ROLE_BAND_MEANS=" + JSON.stringify({ atkN: roleBandMeans.atkN.map(r4), spdR: roleBandMeans.spdR.map(r4) }) + ";");
console.log("const ROLE_STATS=" + JSON.stringify(Object.fromEntries(ROLE_CONT.map(k => [k, { mu: r4(stats[k].mu), sd: r4(stats[k].sd) }]))) + ";");
console.log("const ROLE_W=" + JSON.stringify(RW) + ";");
console.log("const ROLE_CENTROIDS=" + JSON.stringify(Object.fromEntries(ROLES.map(r => [r, roleCent[r].map(r4)]))) + ";");

// ---- STATURE, reframed (user insight, B267): stature is RELATIVE to party level, not an absolute
// label. A boss is a monster that stands alone against a party of a given level; the SAME monster is
// fodder to an over-levelled party. So we split stature into two parts:
//   (1) PACKAGING — intrinsic, CR-normalized, present at ALL CRs: how concentrated/resilient the
//       monster's budget is FOR ITS OWN CR. Weighted toward the things that let a body solo — HP,
//       action economy, save-denial — not raw DPR (a glass cannon is artillery you protect, not a
//       boss). This is why boss-SHAPED monsters exist at every CR, not just where legendary actions do.
//   (2) DEPLOYMENT stature = f(CR − partyLevel, packaging, pins) — computed in the explorer against a
//       party-level slider, so the boss cloud slides down the CR axis as the party levels up.
// Pins (design intent that doesn't slide): legendary actions = built as a boss; a Swarm statblock = is
// a swarm; Pack Tactics = built to fight in a group. The nova tag (recharge/X-day spike) is orthogonal.
// boss-shaped = concentrated on BOTH axes (endures AND threatens) + action economy. A damage sponge
// (high HP, no offense) and a glass cannon (high DPR, no HP) are each imbalanced and score LOW — only
// a body that's above par on its weaker axis reads heavy. Ratios are clamped so the CR-0/⅛ floor
// (tiny absolute HP → huge ratio) can't manufacture a boss out of a Shrieker Fungus.
const packRaw = r => {
  const lhp = clamp(Math.log2(Math.max(r.raw.hpX, 0.15)), -1.5, 1.5);
  const ldpr = clamp(Math.log2(Math.max(r.raw.dprX, 0.3)), -1.5, 1.5);
  const conc = 0.5 * (lhp + ldpr) - 0.30 * Math.abs(lhp - ldpr);
  const econ = 0.30 * clamp((r.raw.atkN - 1.5) / 1.5, -1, 1) + 0.28 * r.legResist + 0.30 * r.legendary;
  return conc + econ;
};
const praw = rows.map(packRaw);
const pMu = praw.reduce((a, b) => a + b, 0) / praw.length;
const pSd = Math.sqrt(praw.reduce((a, b) => a + (b - pMu) ** 2, 0) / praw.length) || 1;
const PACK_TIERS = [["heavy", 0.9], ["elite", 0.3], ["standard", -0.3], ["light", -0.9], ["minimal", -Infinity]];
rows.forEach((r, i) => {
  r.novaTag = r.raw.nova >= 0.3;
  r.pack = +((praw[i] - pMu) / pSd).toFixed(2);        // intrinsic packaging z (all CRs)
  let tier = PACK_TIERS.find(([, lo]) => r.pack >= lo)[0];
  if (r.legendary && tier !== "heavy") tier = "heavy";  // legendary is boss-designed
  r.packTier = r.swarm ? "swarm" : tier;
});

// ---- report: role × intrinsic-packaging tier (replaces the old absolute stature crosstab) ----
const tab = {};
rows.forEach(r => { tab[r.role] = tab[r.role] || {}; tab[r.role][r.packTier] = (tab[r.role][r.packTier] || 0) + 1; });
console.log("\nrole × intrinsic packaging tier (all 503):");
console.table(tab);
console.log("nova tag:", rows.filter(r => r.novaTag).length, "monsters");
// the point of the reframe: boss-SHAPED (heavy) monsters at LOW CR, where the old legendary-gated
// detector found none
const crNumTmp = (cr) => ({ "1/8": 0.125, "1/4": 0.25, "1/2": 0.5 }[cr] ?? +cr);
console.log("\nheavy-packaging monsters at CR ≤ 4 (invisible to the old legendary-only detector):");
console.log("  " + rows.filter(r => r.packTier === "heavy" && crNumTmp(r.cr) <= 4 && !r.legendary)
  .sort((a, b) => crNumTmp(a.cr) - crNumTmp(b.cr)).map(r => `${r.name} (${r.cr})`).slice(0, 20).join(" · "));

for (const old of ["novaFlyer", "critter"]) {
  const mem = ok.filter((_, i) => k7.assign[i] === roleOf[old]);
  const dist = {};
  mem.forEach(r => dist[r.role] = (dist[r.role] || 0) + 1);
  console.log(`old ${old} cluster (n=${mem.length}) dissolves into:`, dist);
}

const exemplars = {};
for (const role of ROLES) {
  exemplars[role] = rows.filter(r => r.role === role && r.conf === "ok")
    .map(r => ({ r, d: d2(vecRole(r), roleCent[role]) })).sort((a, b) => a.d - b.d)
    .slice(0, 8).map(s => s.r.name + " (" + s.r.cr + ")");
}
const meanOf = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const pctOf = (mem, f) => Math.round(100 * mem.filter(f).length / mem.length);
console.log("\nper-role profiles (ok-conf members):");
const profiles = {};
for (const role of ROLES) {
  const mem = rows.filter(r => r.role === role && r.conf === "ok");
  const p = {
    n: rows.filter(r => r.role === role).length, nOk: mem.length,
    dprX: +meanOf(mem.map(r => r.raw.dprX)).toFixed(2), hpX: +meanOf(mem.map(r => r.raw.hpX)).toFixed(2),
    acD: +meanOf(mem.map(r => r.raw.acD)).toFixed(1), atkN: +meanOf(mem.map(r => r.raw.atkN)).toFixed(1),
    conds: +meanOf(mem.map(r => r.raw.conds)).toFixed(1), spd: Math.round(meanOf(mem.map(r => r.raw.spd))),
    ranged: pctOf(mem, r => r.f.ranged >= 0.5), long: pctOf(mem, r => r.f.ranged === 1),
    aoe: pctOf(mem, r => r.f.aoe), fly: pctOf(mem, r => r.f.fly), caster: pctOf(mem, r => r.f.caster),
  };
  profiles[role] = p;
  console.log(role, JSON.stringify(p));
}

// ---- qualitative: most-shared action/trait names per role (the "defining features") ----
console.log("\ndefining features (share of role members with the entry name):");
const featureFreq = {};
for (const role of ROLES) {
  const mem = rows.filter(r => r.role === role);
  const freq = {};
  mem.forEach(r => [...new Set(r.names)].forEach(n => freq[n] = (freq[n] || 0) + 1));
  const top = Object.entries(freq).filter(([n]) => !/^Multiattack$/.test(n)).sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([n, c]) => `${n} ${Math.round(100 * c / mem.length)}%`);
  featureFreq[role] = top;
  console.log(`\n${role} (n=${mem.length}): ${top.join(" · ")}`);
}

// ---- sample statblocks to actually read (2 per role: 1 central + 1 famous/edge) ----
console.log("\n================ SAMPLE STATBLOCKS ================");
const SAMPLES = ["Hill Giant", "Young Green Dragon", "Adult Red Dragon", "Archmage", "Goblin Minion", "Wolf",
  "Scout", "Ogre", "Ghoul", "Medusa", "Kraken", "Priest", "Sahuagin Warrior", "Will-o'-Wisp"];
SAMPLES.forEach(n => { const r = rows.find(x => x.name === n); if (r) console.log(`\n>>> ${r.role.toUpperCase()} / pack:${r.packTier} (z ${r.pack})${r.novaTag ? " / nova" : ""}\n${r.block}`); });

// ---- explorer dataset for the artifact ----
// emit role (intrinsic) + packaging + pins + crVal so the client computes DEPLOYMENT stature against a
// party-level slider. pin: 0 none, 1 legendary(boss-designed), 2 swarm; pt = Pack Tactics.
const crNum = (cr) => ({ "1/8": 0.125, "1/4": 0.25, "1/2": 0.5 }[cr] ?? +cr);
const data = rows.map(r => ({
  n: r.name, cr: r.cr, c: crNum(r.cr), role: r.role, pk: r.pack, pt: r.packTier,
  pin: r.swarm ? 2 : r.legendary ? 1 : 0, ptac: r.packTactics ? 1 : 0, nova: r.novaTag ? 1 : 0,
  lc: r.conf !== "ok" ? 1 : 0,
  p: { dprX: r.raw.dprX, hpX: r.raw.hpX, acD: r.raw.acD, atkN: r.raw.atkN, conds: r.raw.conds,
    spd: r.raw.spd, nv: r.raw.nova, rng: r.f.ranged, aoe: r.f.aoe, fly: r.f.fly, cst: r.f.caster },
}));
writeFileSync(new URL("./explorer-dataset.json", import.meta.url), JSON.stringify({ profiles, featureFreq, exemplars, tab, data }));
console.log("\nwrote explorer-dataset.json,", data.length, "monsters");
