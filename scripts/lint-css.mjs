#!/usr/bin/env node
// Advisory dead-CSS-class check (B197). Lists classes defined in styles.css that don't appear — as a
// literal token — anywhere in the JS or index.html, i.e. candidates for removal. This automates the
// periodic manual sweep (B185 removed 45 dead selectors by hand).
//
// ADVISORY ONLY: it deliberately never fails the build and is NOT part of `npm run verify`. It cannot see
// classes assembled from string fragments (e.g. `"cc-ab-"+abil`), so the documented dynamic families are
// allowlisted below; anything else it flags is for a human to confirm before deleting. Run: npm run lint:css
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "styles.css"), "utf8");

// Corpus = every shipped JS file + index.html, where a class name appears (literally or as a fragment).
const jsFiles = readdirSync(root).filter((f) => f.endsWith(".js") && f !== "eslint.config.js");
const corpus = [join(root, "index.html"), ...jsFiles.map((f) => join(root, f))]
  .map((p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } })
  .join("\n");

// Classes built from string fragments in JS — any class starting with one of these is assumed used.
// Keep this list TIGHT (matching the families documented in the project memory) so real dead classes
// aren't hidden; if the tool flags a class you know is built dynamically, add its prefix here.
const DYNAMIC_PREFIXES = ["cc-ab-", "st-", "ds-", "pcs-", "rl-tag-", "nf-", "dchip-", "k-", "mode-"];

// Collect class tokens from the stylesheet (comments stripped so commented-out names don't count).
const classes = new Set();
css.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\.([a-zA-Z_-][\w-]*)/g, (_, c) => { classes.add(c); return ""; });

const isDynamic = (c) => DYNAMIC_PREFIXES.some((p) => c.startsWith(p));
const dead = [...classes].filter((c) => !isDynamic(c) && !corpus.includes(c)).sort();

if (!dead.length) {
  console.log(`CSS: no obviously-dead classes (${classes.size} checked).`);
} else {
  console.log(`CSS: ${dead.length} of ${classes.size} class(es) have no literal match in JS/HTML — review (some may be built dynamically):`);
  for (const c of dead) console.log("  ." + c);
  console.log("\nAdvisory only. Confirm each is truly unused before removing; add dynamic prefixes to scripts/lint-css.mjs if needed.");
}
process.exit(0); // never block — this is a guide for the human, not a gate
