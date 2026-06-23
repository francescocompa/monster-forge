// Smoke test: the app must boot end-to-end without throwing. This is the net for the project's most
// painful failure mode — a top-level binding (one of ~40) referencing a DOM node that was removed, or
// a typo'd global, which throws during init and white-screens the whole live page.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

test("app boots from index.html with no init errors", async () => {
  const { window, errors } = bootApp();
  await settle();
  assert.deepEqual(
    errors.map(String), [],
    "init threw — first error:\n" + (errors[0] ? (errors[0].stack || errors[0]) : ""),
  );
  // init ends by loading a blank monster; M is a top-level `let`, so read it through the realm.
  assert.equal(evalIn(window, "typeof M"), "object", "current monster M is initialised");
  assert.ok(evalIn(window, "M && M.id"), "M has an id");
  // the statblock preview should have rendered something
  const sb = window.document.querySelector("#statblock");
  assert.ok(sb, "#statblock node exists");
  assert.ok(sb.textContent.trim().length > 0, "#statblock rendered content");
  window.close(); // tear down jsdom so app timers (e.g. the brand-mark doze) can't keep the runner alive
});

test("every top-level addEventListener binding survived init", async () => {
  // If init got past the bindStatic phase the bindings are all live; assert the key controls exist so a
  // future HTML edit that drops an id (without dropping its binding) fails here, not on the live site.
  const { window, errors } = bootApp();
  await settle();
  assert.deepEqual(errors.map(String), [], "init threw");
  for (const id of ["#statblock", "#saveMonster", "#nav", "#settingsBody"]) {
    assert.ok(window.document.querySelector(id), `expected node ${id} to exist`);
  }
  window.close(); // tear down jsdom (see note above)
});
