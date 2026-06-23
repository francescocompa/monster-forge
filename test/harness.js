// Boots the real app (data.js + parsers.js + app.js) inside a jsdom DOM built from index.html, with
// the browser APIs it touches stubbed out. The three files are injected as classic <script> tags into
// ONE realm so they share the global lexical scope exactly like the live site — that's the whole point
// of the no-build architecture, and the reason a plain "import" can't test this.
//
// Use `window.eval("<expr>")` to read globals: top-level `let`/`const` live in the realm's global
// lexical environment (not on the window object), so `window.M` would be undefined but
// `window.eval("M")` resolves it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function bootApp() {
  let html = readFileSync(join(ROOT, "index.html"), "utf8");
  // Drop the cache-bust loaders — they document.write external <script>/<link> the jsdom can't fetch.
  // We inject the actual files below.
  html = html
    .replace(/<script>var _cb[\s\S]*?<\/script>/g, "")
    .replace(/<script>document\.write\('<link[\s\S]*?<\/script>/g, "");

  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/" });
  const { window } = dom;

  // --- browser-API stubs the app expects ---
  // No network in tests: every JSONBin call resolves as a 404 so loadAll() falls back to the (empty)
  // local mirror instead of throwing.
  window.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => "" });
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false, media: "", onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
    });
  }
  window.indexedDB = new IDBFactory();
  window.IDBKeyRange = IDBKeyRange;

  // Capture anything that escapes — a synchronous init throw, or a rejected promise from the async
  // init IIFE (loadRefLibs/loadAll). These are exactly the failures the smoke test exists to catch.
  const errors = [];
  window.addEventListener("error", (e) => errors.push(e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => errors.push(e.reason));

  for (const file of ["data.js", "parsers.js", "core.js", "forge.js", "engine.js", "bestiary.js", "adventures.js", "roster.js", "combat.js", "dice3d.js", "seed.js", "app.js"]) {
    const s = window.document.createElement("script");
    s.textContent = readFileSync(join(ROOT, file), "utf8");
    try {
      window.document.body.appendChild(s); // executes synchronously in jsdom
    } catch (err) {
      errors.push(err);
    }
  }
  return { window, dom, errors };
}

// Resolve a global expression from the booted realm (handles let/const globals).
export function evalIn(window, expr) {
  return window.eval(expr);
}

// Let the async init IIFE (which awaits loadRefLibs + loadAll) settle.
export const settle = (ms = 250) => new Promise((r) => setTimeout(r, ms));
