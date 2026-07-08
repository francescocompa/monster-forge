// Advisory dev tool (T1.5) — grade the CR math layer against a full 5etools bestiary corpus.
// Boots the real app in jsdom (test/harness.js), imports the bestiary through the PRODUCTION pipeline
// (parseBestiaryJSON → mapMonsterJSON), runs offensiveCR/defensiveCR on every monster, and reports how
// close the blended CR lands to the published label. NOT part of `npm run verify` — it needs an
// external corpus that isn't (and shouldn't be) committed. The committed accuracy floor lives in
// test/cr-model.test.js; this is the deep, repeatable grade you re-run whenever the math changes.
//
//   node scripts/grade-corpus.mjs [path-to-bestiary.json]
//   MF_CORPUS=/path/to/bestiary-xmm.json node scripts/grade-corpus.mjs
//
// Defaults to the local 5etools mirror; prints a skip notice (exit 0) if no corpus is found.
import { existsSync, readFileSync } from "node:fs";
import { bootApp, settle } from "../test/harness.js";

const DEFAULTS = [
  process.argv[2],
  process.env.MF_CORPUS,
  `${process.env.HOME}/Documents/D&D/5etool_mirror/5etools-v2.29.0/data/bestiary/bestiary-xmm.json`,
].filter(Boolean);
const corpusPath = DEFAULTS.find((p) => existsSync(p));
if (!corpusPath) {
  console.log("grade-corpus: no corpus found. Pass a bestiary JSON path or set MF_CORPUS. Skipping.");
  process.exit(0);
}

const bestiary = JSON.parse(readFileSync(corpusPath, "utf8"));
const { window } = bootApp();
await settle();
window.__json = bestiary;

const rows = window.eval(`(()=>{
  return parseBestiaryJSON(window.__json,"corpus").monsters.filter(m=>CR_LIST.includes(m.cr)).map(m=>{
    const off = offensiveCR(m), def = defensiveCR(m);
    const finalIdx = Math.round((off.idx + def.idx)/2);
    return { name:m.name, type:(m.type||"").toLowerCase(), cr:m.cr,
      err: finalIdx - CR_LIST.indexOf(m.cr), offErr: off.idx - CR_LIST.indexOf(m.cr),
      defErr: def.idx - CR_LIST.indexOf(m.cr), conf: off.confidence };
  });
})()`);

const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
const pct = (a, f) => a.length ? Math.round(100 * a.filter(f).length / a.length) : 0;
const line = (label, g, key = "err") => {
  const e = g.map((r) => r[key]);
  console.log(`  ${label.padEnd(22)} n=${String(g.length).padStart(3)}  bias ${med(e)}  mean|e| ${mean(e.map(Math.abs))}  ±1 ${pct(e, (x) => Math.abs(x) <= 1)}%  ±2 ${pct(e, (x) => Math.abs(x) <= 2)}%`);
};

console.log(`\ngrade-corpus: ${rows.length} monsters from ${corpusPath.split("/").pop()}\n`);
const ok = rows.filter((r) => r.conf === "ok");
const conf = {}; rows.forEach((r) => (conf[r.conf] = (conf[r.conf] || 0) + 1));
console.log("confidence:", conf, "\n");
line("blended (all)", rows);
line("blended (ok-conf)", ok);
line("offensive-only (ok)", ok, "offErr");
line("defensive-only (ok)", ok, "defErr");

console.log("\nworst blended misses (|err| ≥ 3, ok-conf):");
ok.filter((r) => Math.abs(r.err) >= 3).sort((a, b) => Math.abs(b.err) - Math.abs(a.err))
  .forEach((r) => console.log(`  ${r.err > 0 ? "+" : ""}${r.err}  CR${r.cr}  ${r.name}`));
