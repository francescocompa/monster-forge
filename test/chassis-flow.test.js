// B285 regression floor — loading a chassis from the Forge must NEVER inherit the current draft's
// id. Save upserts by id, so an inherited id made the next Save silently overwrite the last-saved
// monster (real creations were lost to this). A chassis load always starts a fresh creature.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });

const ev = (expr) => evalIn(window, expr);

test("chassis load from a clean just-saved Forge mints a new id; saving adds, not overwrites", () => {
  const libLen0 = ev("state.lib.length");
  ev(`loadMonster(blankMonster())`);
  ev(`$("#forgeTitle").textContent = M.name = "Original Keeper"`);
  assert.equal(ev("saveCurrentToBestiary()"), true);
  const savedId = ev("state.lib[0].id");
  assert.equal(ev("state.lib.length"), libLen0 + 1);

  // Forge is clean (just saved) — this is exactly the path that used to overwrite: the from-Forge
  // chassis pick skips the conflict modal and applies directly.
  assert.equal(ev("forgeUnsaved()"), false);
  ev(`applyChassis(CHASSIS.find(c => c.id === "c_bandit"))`);
  assert.notEqual(ev("M.id"), savedId, "chassis draft must not carry the saved monster's id");

  ev(`$("#forgeTitle").textContent = M.name = "Bandit Fork"`);
  assert.equal(ev("saveCurrentToBestiary()"), true);
  assert.equal(ev("state.lib.length"), libLen0 + 2, "save adds a new entry");
  assert.equal(ev(`state.lib.find(x => x.id === ${JSON.stringify(savedId)}).name`), "Original Keeper",
    "the previously saved monster is untouched");
});

test("every chassis application mints a distinct id (repeat loads never collide)", () => {
  ev(`applyChassis(CHASSIS.find(c => c.id === "c_guard"))`);
  const first = ev("M.id");
  ev(`applyChassis(CHASSIS.find(c => c.id === "c_guard"))`);
  assert.notEqual(ev("M.id"), first);
});
