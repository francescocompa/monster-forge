// Round-trip tests for the 5etools importers (parsers.js) — the most complex, previously-untested
// code in the project. Exercised through the booted realm exactly as the upload/paste flows call them,
// so a regression in tag-stripping, JSON mapping, or _copy resolution fails here, not on a real import.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });

// Run an expression that returns a JSON string in the realm, parsed back here.
const evj = (expr) => JSON.parse(evalIn(window, expr));

test("parse5etools: plain-text statblock → monster", () => {
  const block = [
    "Goblin",
    "Small Humanoid, Neutral Evil",
    "AC 15",
    "HP 7 (2d6)",
    "Speed 30 ft.",
    "STR", "8", "-1",
    "DEX", "14", "+2",
    "CON", "10", "+0",
    "INT", "10", "+0",
    "WIS", "8", "-1",
    "CHA", "8", "-1",
    "CR 1/4",
    "Actions",
    "Scimitar. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage.",
  ].join("\n");
  const m = evj(`JSON.stringify(parse5etools(${JSON.stringify(block)}))`);
  assert.equal(m.name, "Goblin");
  assert.equal(m.size, "Small");
  assert.equal(m.type, "Humanoid");
  assert.equal(m.ac, 15);
  assert.equal(m.hp, 7);
  assert.equal(m.cr, "1/4");
  assert.equal(m.str, 8);
  assert.equal(m.dex, 14);
  assert.ok(m.actions.length >= 1, "parsed at least one action");
  assert.equal(m.actions[0].name, "Scimitar");
});

test("mapMonsterJSON: 5etools JSON object → monster (with {@tag} stripping)", () => {
  const mon = {
    name: "Test Drake", size: ["L"], type: "dragon",
    ac: [{ ac: 17, from: ["natural armor"] }],
    hp: { average: 78, formula: "12d10+12" },
    str: 18, dex: 12, con: 14, int: 8, wis: 10, cha: 11,
    cr: "5",
    action: [{ name: "Bite", entries: ["{@atkr m} {@hit 7}, reach 10 ft. {@h}11 ({@damage 2d6 + 4}) piercing damage."] }],
  };
  const m = evj(`JSON.stringify(mapMonsterJSON(${JSON.stringify(mon)}))`);
  assert.equal(m.name, "Test Drake");
  assert.equal(m.size, "Large");          // SIZE_CODE.L
  assert.equal(m.type, "Dragon");         // capitalised
  assert.equal(m.ac, 17);
  assert.match(m.acnote, /natural armor/);
  assert.equal(m.hp, 78);
  assert.equal(m.hpf, "12d10+12");
  assert.equal(m.str, 18);
  assert.equal(m.cr, "5");
  assert.ok(m.actions.length >= 1);
  assert.equal(m.actions[0].name, "Bite");
  assert.match(m.actions[0].text, /Melee Attack Roll/); // {@atkr m} → house wording
  assert.match(m.actions[0].text, /\+7/);               // {@hit 7} → +7
});

test("parseBestiaryJSON: a _copy variant inherits the base statblock", () => {
  const json = { monster: [
    {
      name: "Base Goblin", source: "TST", size: ["S"], type: "humanoid",
      hp: { average: 7, formula: "2d6" }, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, cr: "1/4",
      action: [{ name: "Scimitar", entries: ["{@atkr m} {@hit 4}, reach 5 ft. {@h}5 ({@damage 1d6+2}) slashing damage."] }],
    },
    { name: "Goblin Boss", source: "TST", _copy: { name: "Base Goblin", source: "TST" } },
  ] };
  const res = evj(`JSON.stringify(parseBestiaryJSON(${JSON.stringify(json)},"test.json",{}))`);
  assert.equal(res.skipped, 0, "nothing skipped — the base resolved");
  assert.equal(res.monsters.length, 2);
  const boss = res.monsters.find((m) => m.name === "Goblin Boss");
  assert.ok(boss, "variant resolved against the base index");
  assert.equal(boss.hp, 7, "variant inherited the base's HP");
  assert.equal(boss.str, 8, "variant inherited the base's STR");
  assert.ok(boss.actions.length >= 1, "variant inherited the base's actions");
});
