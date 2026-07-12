// T1.11 role-clustering spike (scratch, regenerable). Boots the app via test/harness.js, imports the
// corpus through the production pipeline, extracts CR-NORMALIZED role features per monster (so clusters
// capture ROLE, not level), scales them (capped z for continuous, bounded weights for binaries — a raw
// z-score run let rare binaries like physical-resistance dominate and produced one 359-monster blob),
// runs k-means for k=3..9 with silhouette, prints cluster exhibits (profile in raw units + exemplars).
// Output feeds ROLE_CLUSTERS.md and the Q1.D naming session.
//   node scripts/role-spike.mjs [k]     (k forces the exhibit dump; default = best silhouette among k>=5)
//   MF_CORPUS=/path/to/bestiary.json node scripts/role-spike.mjs
// Skips cleanly (exit 0) when no corpus is present — dev tool, NOT part of verify.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { bootApp, settle } from "../test/harness.js";

const CORPUS = process.env.MF_CORPUS
  || `${process.env.HOME}/Documents/D&D/5etool_mirror/5etools-v2.29.0/data/bestiary/bestiary-xmm.json`;
if (!existsSync(CORPUS)) { console.log("role-spike: no corpus found. Set MF_CORPUS. Skipping."); process.exit(0); }

const bestiary = JSON.parse(readFileSync(CORPUS, "utf8"));
const { window } = bootApp();
await settle();
window.__json = bestiary;

// ---- feature extraction (inside the app realm: real parsers + CR math) ----
const rows = window.eval(`(()=>{
  const CONDS=["Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated","Paralyzed",
    "Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious","Exhaustion"];
  const W2N={two:2,three:3,four:4,five:5,six:6};
  const txtOf=m=>{const parts=[];["actions","bonus","reactions","traits"].forEach(k=>(m[k]||[]).forEach(e=>{
    parts.push(e.name||"",e.text||"",e.extra||"");}));
    if(m.legend&&m.legend.items)m.legend.items.forEach(e=>parts.push(e.name||"",e.text||""));
    return parts.join(" ");};
  return parseBestiaryJSON(window.__json,"corpus").monsters.filter(m=>CR_LIST.includes(m.cr)).map(m=>{
    const e=crExpected(m.cr),off=offensiveCR(m),def=defensiveCR(m),x=dprExtract(m);
    const t=txtOf(m);
    const ranged=/(Ranged|Melee or Ranged) Attack Roll/i.test(t);
    const longRange=Math.max(0,...[...t.matchAll(/range (\\d+)/gi)].map(x=>+x[1]))>=80;
    const aoe=/each creature (?:in|within)|\\d+-foot(?:-| )(?:Cone|Line|Sphere|Cube|Emanation|radius)/i.test(t);
    const conds=CONDS.filter(c=>new RegExp(c+" condition","i").test(t)).length;
    const caster=(m.actions||[]).some(a=>a.mode==="spell")||/Spellcasting/i.test(t);
    const ma=t.match(/makes? (two|three|four|five|six|\\d)\\b[^.]{0,60}attack/i);
    const atkN=ma?(W2N[ma[1].toLowerCase()]||+ma[1]||1):1;
    const rdmg=x.rounds&&x.rounds.length?x.rounds.map(r=>r.dmg):[x.dpr,x.dpr,x.dpr];
    const meanR=rdmg.reduce((a,b)=>a+b,0)/rdmg.length||1;
    const maxSpd=Math.max(m.spd.walk||0,m.spd.fly||0,m.spd.swim||0,m.spd.burrow||0,m.spd.climb||0)||30;
    return {
      name:m.name,cr:m.cr,type:(m.type||"").toLowerCase(),conf:off.confidence,
      raw:{dpr:x.dpr,expDPR:e.dprAvg,hp:def.rawHP,expHP:e.hpAvg,ac:def.ac,expAC:e.ac,conds,atkN},
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
      }
    };
  });
})()`);

// ---- scaling: capped z (continuous) / bounded weight (binary), role-semantic weights ----
const CONT = ["acD", "hpR", "dprR", "nova", "acc", "spdR", "atkN", "control"];
const BIN = ["ranged", "aoe", "fly", "caster", "legendary", "physRes"]; // saveBased dropped: zero variance (all ok-conf monsters anchor on attack rolls — a corpus finding)
const W = { dprR: 1.4, hpR: 1.4, ranged: 1.3, control: 1.2, acD: 1.0, aoe: 1.0, nova: 1.0, atkN: 0.9,
  saveBased: 0.8, spdR: 0.8, caster: 0.8, fly: 0.6, legendary: 0.6, physRes: 0.6, acc: 0.5 };
const KEYS = [...CONT, ...BIN];
const ok = rows.filter(r => r.conf === "ok");
const low = rows.filter(r => r.conf !== "ok");
console.log(`corpus: ${rows.length} monsters (${ok.length} ok-conf clustered, ${low.length} low-conf assigned after)\n`);

const stats = {};
for (const k of CONT) {
  const v = ok.map(r => r.f[k]);
  const mu = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 1;
  stats[k] = { mu, sd };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const vec = (r) => [
  ...CONT.map(k => clamp((r.f[k] - stats[k].mu) / stats[k].sd, -2.5, 2.5) * W[k]),
  ...BIN.map(k => r.f[k] * 1.2 * W[k]),
];
const X = ok.map(vec);

// ---- k-means (k-means++ init, multi-restart) + silhouette ----
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
function silhouette(X, assign, k) {
  let tot = 0, n = 0;
  for (let i = 0; i < X.length; i++) {
    const own = [], others = Array.from({ length: k }, () => []);
    for (let j = 0; j < X.length; j++) { if (i === j) continue; (assign[j] === assign[i] ? own : others[assign[j]]).push(Math.sqrt(d2(X[i], X[j]))); }
    if (!own.length) continue;
    const a = own.reduce((s, v) => s + v, 0) / own.length;
    const b = Math.min(...others.filter(o => o.length).map(o => o.reduce((s, v) => s + v, 0) / o.length));
    tot += (b - a) / Math.max(a, b); n++;
  }
  return tot / n;
}

const forced = process.argv[2] ? +process.argv[2] : null;
const results = {};
console.log("k-sweep (30 restarts each):");
for (let k = 3; k <= 9; k++) {
  let best = null;
  for (let s = 1; s <= 30; s++) { const r = kmeans(X, k, s * 7919); if (!best || r.inertia < best.inertia) best = r; }
  const sil = silhouette(X, best.assign, k);
  results[k] = { ...best, sil };
  console.log(`  k=${k}  inertia ${best.inertia.toFixed(0)}  silhouette ${sil.toFixed(3)}  sizes [${Array.from({ length: k }, (_, c) => best.assign.filter(a => a === c).length).sort((a, b) => b - a).join(",")}]`);
}
const bestK = forced || +Object.entries(results).filter(([k]) => +k >= 5).sort((a, b) => b[1].sil - a[1].sil)[0][0];
console.log(`\n==== exhibits at k=${bestK}${forced ? " (forced)" : " (best silhouette, k>=5)"} ====\n`);

const { cents, assign } = results[bestK];
const crNum = (cr) => ({ "1/8": 0.125, "1/4": 0.25, "1/2": 0.5 }[cr] ?? +cr);
const pctOf = (mem, f) => Math.round(100 * mem.filter(f).length / mem.length);
const meanOf = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const out = [];
for (let c = 0; c < bestK; c++) {
  const mem = ok.filter((_, i) => assign[i] === c);
  if (!mem.length) continue;
  const scored = mem.map(r => ({ r, d: d2(vec(r), cents[c]) })).sort((a, b) => a.d - b.d);
  const ex = scored.slice(0, 6).map(s => s.r);
  const crsAll = mem.map(r => crNum(r.cr)).sort((a, b) => a - b);
  [0, .25, .5, .75].forEach((q, qi) => {
    const lo = crsAll[Math.floor(q * (crsAll.length - 1))], hi = crsAll[Math.floor(Math.min(.999, q + .25) * (crsAll.length - 1))];
    const cand = scored.find(s => !ex.includes(s.r) && crNum(s.r.cr) >= lo && crNum(s.r.cr) <= hi);
    if (cand) ex.push(cand.r);
  });
  const crs = mem.map(r => crNum(r.cr)).sort((a, b) => a - b);
  const types = {}; mem.forEach(r => types[r.type] = (types[r.type] || 0) + 1);
  const topTypes = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t} ${n}`).join(", ");
  // profile in RAW units — readable for the naming session
  const prof = {
    dprX: +meanOf(mem.map(r => r.raw.dpr / r.raw.expDPR)).toFixed(2),
    hpX: +meanOf(mem.map(r => r.raw.hp / r.raw.expHP)).toFixed(2),
    acD: +meanOf(mem.map(r => (r.raw.ac ?? r.raw.expAC) - r.raw.expAC)).toFixed(1),
    atkN: +meanOf(mem.map(r => r.raw.atkN)).toFixed(1),
    conds: +meanOf(mem.map(r => r.raw.conds)).toFixed(1),
    nova: +meanOf(mem.map(r => r.f.nova)).toFixed(2),
    spd: +meanOf(mem.map(r => 30 * 2 ** r.f.spdR)).toFixed(0),
    rangedPct: pctOf(mem, r => r.f.ranged >= 0.5), longRangePct: pctOf(mem, r => r.f.ranged === 1),
    aoePct: pctOf(mem, r => r.f.aoe), flyPct: pctOf(mem, r => r.f.fly),
    casterPct: pctOf(mem, r => r.f.caster), legPct: pctOf(mem, r => r.f.legendary), physResPct: pctOf(mem, r => r.f.physRes),
  };
  out.push({ c, n: mem.length, q1: crs[Math.floor(crs.length * .25)], medCR: crs[Math.floor(crs.length / 2)], q3: crs[Math.floor(crs.length * .75)], prof, topTypes,
    exemplars: ex.map(r => `${r.name} (${r.cr})`), members: mem.map(r => `${r.name} (${r.cr})`) });
  console.log(`cluster ${c}: n=${mem.length}  CR q1/med/q3 ${out.at(-1).q1}/${out.at(-1).medCR}/${out.at(-1).q3}  [${topTypes}]`);
  console.log(`  DPR ${prof.dprX}× · HP ${prof.hpX}× · AC ${prof.acD >= 0 ? "+" : ""}${prof.acD} · ${prof.atkN} atks · ${prof.conds} conds · nova ${prof.nova} · spd ${prof.spd}`);
  console.log(`  ranged ${prof.rangedPct}% (long ${prof.longRangePct}%) · aoe ${prof.aoePct}% · fly ${prof.flyPct}% · caster ${prof.casterPct}% · legendary ${prof.legPct}% · physRes ${prof.physResPct}%`);
  console.log(`  exemplars: ${out.at(-1).exemplars.join(", ")}\n`);
}

console.log("low-conf (extractor can't fully read; assigned by remaining features):");
const lowAssign = {};
low.forEach(r => {
  const v = vec(r);
  let best = 0, bd = Infinity;
  cents.forEach((cc, c) => { const dd = d2(v, cc); if (dd < bd) { bd = dd; best = c; } });
  (lowAssign[best] = lowAssign[best] || []).push(`${r.name} (${r.cr})`);
});
Object.entries(lowAssign).forEach(([c, names]) => console.log(`  → cluster ${c} (${names.length}): ${names.join(", ")}`));

writeFileSync(new URL("./role-spike-out.json", import.meta.url),
  JSON.stringify({ k: bestK, sweep: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, +r.sil.toFixed(3)])), clusters: out, lowAssign }, null, 1));
console.log("\nwrote role-spike-out.json");
