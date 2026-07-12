// T1.13 — role-benchmark harness (Q1.E protocol, decided 2026-07-12):
//   blind labeling sheet · two-tier ≥85% threshold · diagnostic 60/25/15 set · Artifact surface.
// Corpus-gated dev tool like grade-corpus.mjs — NOT in verify; skips cleanly without the corpus.
//
//   node scripts/role-benchmark.mjs select [--force]   freeze the 100-monster set → role-benchmark-set.json
//   node scripts/role-benchmark.mjs sheet [out.json]   labeling payload (full statblocks, NO guesses)
//   node scripts/role-benchmark.mjs score labels.json  two-tier score + disagreement list for T1.14
//
// The set file is COMMITTED and spoiler-free: name/cr/type/pool only, in display order — no role
// guesses anywhere the labeler might see. Pool membership freezes at selection; the model's top pick
// and runner-up are always computed LIVE at score time, so re-runs after model changes (T2.10) ask
// the right question: "do the model's two best guesses contain the user's label?"
// Scoring tiers: clean (n=60) label must equal the live top pick; ambiguous (borderline+low-conf,
// n=40) top pick OR runner-up counts. Both tiers pass at ≥85%.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { bootApp, settle } from "../test/harness.js";

const SET_PATH = new URL("./role-benchmark-set.json", import.meta.url);
const SEED = 20260712;
const BANDS = [["0-1", 0, 5], ["2-4", 6, 8], ["5-8", 9, 12], ["9-12", 13, 16], ["13-16", 17, 20], ["17+", 21, 99]];
const bandOf = (crIdx) => BANDS.find(([, lo, hi]) => crIdx >= lo && crIdx <= hi)[0];

// mulberry32 — deterministic selection, same seed every run
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (arr, rand) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const mode = process.argv[2];
if (!["select", "sheet", "score"].includes(mode)) {
  console.log("usage: node scripts/role-benchmark.mjs select [--force] | sheet [out.json] | score labels.json");
  process.exit(mode ? 1 : 0);
}

const CORPUS = process.env.MF_CORPUS
  || `${process.env.HOME}/Documents/D&D/5etool_mirror/5etools-v2.29.0/data/bestiary/bestiary-xmm.json`;
if (!existsSync(CORPUS)) { console.log("role-benchmark: no corpus found. Set MF_CORPUS. Skipping."); process.exit(0); }

const bestiary = JSON.parse(readFileSync(CORPUS, "utf8"));
const { window } = bootApp();
await settle();
window.__json = bestiary;

// Classify the whole corpus through the production pipeline + the shipped classifier.
// `block` is the full statblock render for the sheet (never truncated — kit details decide labels).
const rows = window.eval(`(()=>{
  const line=(e)=>{
    if(e.mode==="spell")return "(spellcasting) "+(e.groups||[]).map(g=>g.freq+": "+g.spells).join(" | ");
    if(e.mode==="react")return ["*Trigger:* "+(e.trigger||""),"*Response:* "+(e.response||"")].join(" ");
    return [e.text,e.extra].filter(Boolean).join(" ");
  };
  return parseBestiaryJSON(window.__json,"corpus").monsters.filter(m=>CR_LIST.includes(m.cr)).map(m=>{
    const r=classifyRole(m);if(!r)return null;
    const abil=["str","dex","con","int","wis","cha"].map(a=>a.toUpperCase()+" "+m[a]).join("  ");
    const spd=["walk","climb","fly","swim","burrow"].filter(k=>m.spd[k]).map(k=>(k==="walk"?"":k+" ")+m.spd[k]+" ft").join(", ");
    const dmg=Object.keys(m.dmg||{}).map(k=>k+" ("+m.dmg[k]+")").join(", ");
    const sections=["traits","actions","bonus","reactions"].map(k=>({
      k, items:(m[k]||[]).map(e=>({n:e.name||"",t:line(e)}))
    })).filter(s=>s.items.length);
    if(m.legend&&m.legend.on&&(m.legend.items||[]).length)
      sections.push({k:"legendary",items:m.legend.items.map(e=>({n:e.name||"",t:e.text||""}))});
    // CR yardstick for the labeling sheet (Q1.E follow-up). Expected stats + the HP×/AC± deltas are
    // CR-label / printed-number arithmetic and stay blind. The DPR delta is DELIBERATELY different:
    // dpr/dprX come from dprExtract, the extractor being benchmarked, so this line DOES leak the
    // model's damage read (user-decided 2026-07-12, aware it de-blinds the low-conf controller cases;
    // no confidence marker is shown, which would additionally reveal the pool).
    const ex=crExpected(m.cr),x=dprExtract(m);
    const yard={ac:ex.ac,hp:ex.hpAvg,atk:ex.atk,dc:ex.dc,dprMin:ex.dprMin,dprMax:ex.dprMax,
      hpX:m.hp?+(m.hp/ex.hpAvg).toFixed(2):null,acD:typeof m.ac==="number"?m.ac-ex.ac:null,
      dpr:x&&isFinite(x.dpr)?Math.round(x.dpr):null,
      dprX:x&&isFinite(x.dpr)&&ex.dprAvg?+(x.dpr/ex.dprAvg).toFixed(2):null};
    return {
      name:m.name, cr:m.cr, crIdx:CR_LIST.indexOf(m.cr), type:(m.type||"").toLowerCase(),
      role:r.role, runnerUp:r.runnerUp, margin:+r.margin.toFixed(3), conf:r.confidence,
      yard,
      block:{
        head:m.name, meta:(m.size||"")+" "+(m.type||"")+(m.subtype?" ("+m.subtype+")":"")+", CR "+m.cr,
        ac:m.ac+(m.acnote?" ("+m.acnote+")":""), hp:m.hp+(m.hpf?" ("+m.hpf+")":""),
        spd:spd||"30 ft", abil, dmg, cimm:m.cimm||"", sections
      }
    };
  }).filter(Boolean);
})()`);

const pools = {
  clean: rows.filter((r) => r.conf === "ok" && r.margin >= 0.2),
  borderline: rows.filter((r) => r.conf === "ok" && r.margin < 0.1),
  lowconf: rows.filter((r) => r.conf !== "ok"),
};

// Stratified pick: quotas per CR band by SQUARE-ROOT weighting (plain proportionality reproduces the
// corpus's CR 0–1 dominance — the rejected "proportional mirror"; sqrt compresses it and lifts the
// thin high bands), largest-remainder rounding, then inside a band round-robin across the
// classifier's roles, greedily preferring the least-used creature type — the set should not
// accidentally become 30 beasts.
function pick(pool, want, rand) {
  const byBand = {};
  pool.forEach((r) => { (byBand[bandOf(r.crIdx)] = byBand[bandOf(r.crIdx)] || []).push(r); });
  const bands = BANDS.map(([b]) => b).filter((b) => byBand[b] && byBand[b].length);
  const wSum = bands.reduce((s, b) => s + Math.sqrt(byBand[b].length), 0);
  const exact = bands.map((b) => (want * Math.sqrt(byBand[b].length)) / wSum);
  const quota = exact.map((x, i) => Math.min(Math.floor(x), byBand[bands[i]].length));
  let left = want - quota.reduce((s, n) => s + n, 0);
  while (left > 0) {
    const open = exact.map((x, i) => [x - quota[i], i]).filter(([, i]) => quota[i] < byBand[bands[i]].length);
    if (!open.length) break; // pool smaller than want — take what exists
    open.sort((a, b) => b[0] - a[0]);
    for (const [, i] of open) { if (left <= 0) break; quota[i]++; left--; }
  }
  const typeUse = {};
  const out = [];
  bands.forEach((b, bi) => {
    const byRole = {};
    shuffle(byBand[b], rand).forEach((r) => { (byRole[r.role] = byRole[r.role] || []).push(r); });
    const order = shuffle(Object.keys(byRole), rand);
    let taken = 0, ri = 0;
    while (taken < quota[bi] && order.some((role) => byRole[role].length)) {
      const role = order[ri % order.length]; ri++;
      const cands = byRole[role];
      if (!cands.length) continue;
      cands.sort((a, b2) => (typeUse[a.type] || 0) - (typeUse[b2.type] || 0));
      const picked = cands.shift();
      typeUse[picked.type] = (typeUse[picked.type] || 0) + 1;
      out.push(picked); taken++;
    }
  });
  return out;
}

if (mode === "select") {
  if (existsSync(SET_PATH) && !process.argv.includes("--force")) {
    console.log("role-benchmark: set already frozen (role-benchmark-set.json). Use --force to reselect — this INVALIDATES existing labels.");
    process.exit(1);
  }
  const rand = rng(SEED);
  const sel = [
    ...pick(pools.clean, 60, rand).map((r) => ({ ...r, pool: "clean" })),
    ...pick(pools.borderline, 25, rand).map((r) => ({ ...r, pool: "borderline" })),
    ...pick(pools.lowconf, 15, rand).map((r) => ({ ...r, pool: "lowconf" })),
  ];
  const order = shuffle(sel, rand); // interleave so the hard slice doesn't telegraph itself
  const set = order.map((r) => ({ name: r.name, cr: r.cr, type: r.type, pool: r.pool }));
  writeFileSync(SET_PATH, JSON.stringify({ seed: SEED, frozen: "2026-07-12", protocol: "Q1.E blind/two-tier-85/60-25-15", set }, null, 1));
  console.log(`froze ${set.length} monsters → scripts/role-benchmark-set.json`);
  const n = { clean: 0, borderline: 0, lowconf: 0 };
  set.forEach((r) => n[r.pool]++);
  console.log("pools:", JSON.stringify(n));
}

if (mode === "sheet") {
  const set = JSON.parse(readFileSync(SET_PATH, "utf8")).set;
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  const missing = set.filter((s) => !byName[s.name]);
  if (missing.length) { console.error("set monsters missing from corpus:", missing.map((m) => m.name).join(", ")); process.exit(1); }
  // Blind payload: statblocks in frozen display order. No role, no runner-up, no margin, no pool.
  // `yard` (CR-expected strip + printed-number deltas) is CR-label arithmetic, not model output.
  const sheet = set.map((s, i) => ({ i, name: s.name, yard: byName[s.name].yard, block: byName[s.name].block }));
  const out = process.argv[3] || new URL("./role-benchmark-sheet.json", import.meta.url);
  writeFileSync(out, JSON.stringify(sheet));
  console.log(`wrote ${sheet.length} blind statblocks → ${String(out).replace(/^file:\/\//, "")}`);
}

if (mode === "score") {
  // default = the committed ground truth (the user's 2026-07-12 blind pass); pass a path to score
  // a different export. Re-runs recompute the classifier LIVE, so this is the repeatable benchmark.
  const labelPath = process.argv[3] || new URL("./role-benchmark-labels.json", import.meta.url);
  if (!existsSync(labelPath)) { console.error("score: no labels JSON found — pass the export from the labeling page."); process.exit(1); }
  const raw = JSON.parse(readFileSync(labelPath, "utf8"));
  const labels = Array.isArray(raw) ? Object.fromEntries(raw.map((r) => [r.name, r.role])) : (raw.labels || raw);
  const set = JSON.parse(readFileSync(SET_PATH, "utf8")).set;
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  const ROLES = ["soldier", "artillery", "brute", "skirmisher", "controller"];
  const tiers = { clean: { n: 0, hit: 0 }, ambiguous: { n: 0, hit: 0 } };
  const perRole = Object.fromEntries(ROLES.map((r) => [r, { n: 0, hit: 0 }]));
  const misses = [];
  let unlabeled = 0;
  set.forEach((s) => {
    const user = labels[s.name];
    if (!user) { unlabeled++; return; }
    if (!ROLES.includes(user)) { console.error(`bad label for ${s.name}: ${user}`); process.exit(1); }
    const live = byName[s.name];
    if (!live) { console.error(`${s.name} missing from corpus — corpus changed since freeze?`); process.exit(1); }
    const tier = s.pool === "clean" ? "clean" : "ambiguous";
    const ok = tier === "clean" ? live.role === user : (live.role === user || live.runnerUp === user);
    tiers[tier].n++; if (ok) tiers[tier].hit++;
    perRole[user].n++; if (ok) perRole[user].hit++;
    if (!ok) misses.push({ name: s.name, cr: s.cr, pool: s.pool, user, model: live.role, runnerUp: live.runnerUp, margin: live.margin, conf: live.conf });
  });
  if (unlabeled) console.log(`⚠ ${unlabeled} monsters unlabeled — score is partial`);
  const pct = (t) => t.n ? (100 * t.hit / t.n).toFixed(1) : "—";
  console.log(`\nclean tier (label = top pick):        ${tiers.clean.hit}/${tiers.clean.n}  ${pct(tiers.clean)}%  ${tiers.clean.hit / Math.max(tiers.clean.n, 1) >= 0.85 ? "PASS" : "FAIL"} (≥85%)`);
  console.log(`ambiguous tier (top OR runner-up):    ${tiers.ambiguous.hit}/${tiers.ambiguous.n}  ${pct(tiers.ambiguous)}%  ${tiers.ambiguous.hit / Math.max(tiers.ambiguous.n, 1) >= 0.85 ? "PASS" : "FAIL"} (≥85%)`);
  console.log("\nagreement by YOUR label:");
  ROLES.forEach((r) => console.log(`  ${r.padEnd(11)} ${perRole[r].hit}/${perRole[r].n}  ${pct(perRole[r])}%`));
  if (misses.length) {
    console.log(`\n${misses.length} disagreements (the T1.14 review list):`);
    misses.sort((a, b) => a.margin - b.margin).forEach((m) =>
      console.log(`  ${m.name} (CR ${m.cr}, ${m.pool}${m.conf !== "ok" ? ", low-conf" : ""}) — you: ${m.user} · model: ${m.model}/${m.runnerUp} m${m.margin}`));
  } else console.log("\nno disagreements.");
}
