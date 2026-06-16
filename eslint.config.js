// Flat ESLint config for Monster Forge — a no-build static site whose three scripts
// (data.js, parsers.js, app.js) are loaded as classic <script> tags and therefore SHARE one
// global lexical scope. ESLint lints each file in isolation, so without help every cross-file
// reference (a function defined in data.js, used in app.js) would trip `no-undef`.
//
// To keep `no-undef` useful (it catches real typos) without that noise, we parse each file's
// TOP-LEVEL declarations with espree and register them as shared globals. This is self-maintaining:
// add a new top-level function/const and it's automatically known everywhere.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import globals from "globals";
import * as espree from "espree";

const here = dirname(fileURLToPath(import.meta.url));
const SHARED_FILES = ["data.js", "parsers.js", "app.js"];

// Collect every name declared at the top level of the shared scripts.
function collectSharedGlobals() {
  const names = new Set();
  for (const file of SHARED_FILES) {
    let ast;
    try {
      ast = espree.parse(readFileSync(join(here, file), "utf8"), {
        ecmaVersion: "latest", sourceType: "script", loc: false,
      });
    } catch { continue; } // a parse error is surfaced by the lint run itself
    for (const node of ast.body) {
      if (node.type === "FunctionDeclaration" && node.id) names.add(node.id.name);
      else if (node.type === "VariableDeclaration") {
        for (const d of node.declarations) {
          if (d.id.type === "Identifier") names.add(d.id.name);
          else if (d.id.type === "ObjectPattern") for (const p of d.id.properties) if (p.value && p.value.type === "Identifier") names.add(p.value.name);
          else if (d.id.type === "ArrayPattern") for (const e of d.id.elements) if (e && e.type === "Identifier") names.add(e.name);
        }
      } else if (node.type === "ClassDeclaration" && node.id) names.add(node.id.name);
    }
  }
  return Object.fromEntries([...names].map((n) => [n, "writable"]));
}

const sharedGlobals = collectSharedGlobals();

export default [
  {
    files: ["data.js", "parsers.js", "app.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, ...sharedGlobals },
    },
    rules: {
      // The high-value catches — the recurring break causes documented in the project memory.
      "no-undef": "error",            // typos / renamed-but-not-everywhere references
      // builtinGlobals:false → don't flag the shared-scope declarations we inject as globals as
      // "redeclarations"; still catches a genuine `var x;…var x;` within one file.
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-unreachable": "error",
      // no-cond-assign is intentionally OFF: this codebase pervasively (and deliberately) uses
      // `if (mt = l.match(...))` / `while ((m = re.exec(s)))` assignment-in-condition idioms. It
      // isn't one of the project's documented break causes, so the rule is all false-positive here.
      "no-cond-assign": "off",
      "no-irregular-whitespace": ["error", { skipStrings: false, skipComments: false, skipTemplates: false }],
      "use-isnan": "error",
      "valid-typeof": "error",
      "no-self-assign": "error",
      // vars:"local" → only flag unused LOCALS (reliable); top-level fns are used cross-file so the
      // shared scope makes global-unused detection meaningless here.
      "no-unused-vars": ["warn", { args: "none", vars: "local", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  // The tooling itself runs in Node (ESM).
  {
    files: ["eslint.config.js", "test/**/*.js", "scripts/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.node } },
    rules: { "no-unused-vars": ["warn", { args: "none" }] },
  },
];
