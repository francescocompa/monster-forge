// Pure-function checks that run against the booted realm (the helpers live in the shared global scope,
// so we exercise them exactly as the app does). These guard the maths the roll engine and statblock
// rely on, where a silent off-by-one wouldn't throw but would be wrong.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });

const ev = (expr) => evalIn(window, expr);

test("ability modifier (mod)", () => {
  assert.equal(ev("mod(10)"), 0);
  assert.equal(ev("mod(20)"), 5);
  assert.equal(ev("mod(1)"), -5);
  assert.equal(ev("mod(8)"), -1);
});

test("signed formatting (sgn)", () => {
  assert.equal(ev("sgn(3)"), "+3");
  assert.equal(ev("sgn(0)"), "+0");
  assert.equal(ev("sgn(-2)"), "-2");
});

test("clamp", () => {
  assert.equal(ev("clamp(5,1,10)"), 5);
  assert.equal(ev("clamp(-3,1,10)"), 1);
  assert.equal(ev("clamp(99,1,10)"), 10);
});

test("proficiency bonus by CR (pbForCR)", () => {
  assert.equal(ev("pbForCR('1')"), 2);
  assert.equal(ev("pbForCR('5')"), 3);
  assert.equal(ev("pbForCR('17')"), 6);
  assert.equal(ev("pbForCR('30')"), 9);
});

test("dice formula roller is bounded and deterministic on d1 (rollFormula)", () => {
  // d1 always rolls 1, so the total is fully determined regardless of RNG.
  assert.equal(ev("rollFormula('2d1').total"), 2);
  assert.equal(ev("rollFormula('2d1+3').total"), 5);
  // a d20 result must always land in [1+mod, 20+mod]
  assert.equal(ev("(()=>{for(let i=0;i<200;i++){const t=rollFormula('1d20+5').total;if(t<6||t>25)return 'OUT:'+t;}return 'ok';})()"), "ok");
});

test("expression average (exprAvg — rounds down, min 1, per D&D convention)", () => {
  assert.equal(ev("exprAvg('1d8')"), 4);   // 4.5 floored
  assert.equal(ev("exprAvg('2d6+3')"), 10); // 7 + 3
  assert.equal(ev("exprAvg('1d4')"), 2);   // 2.5 floored
  assert.equal(ev("exprAvg('1d1-5')"), 1);  // clamped to min 1
});

test("bracketize is a pure string transform that never throws", () => {
  // Exercises the bracket engine on a representative token without needing a full monster.
  assert.equal(ev("typeof bracketize('The [c] makes an attack.','Goblin')"), "string");
});

test("CR_EXPECT covers every CR_LIST key with a well-formed 7-tuple", () => {
  assert.equal(ev("CR_LIST.every(c=>Array.isArray(CR_EXPECT[c])&&CR_EXPECT[c].length===7)"), true);
});

test("CR_EXPECT is non-decreasing CR-over-CR on AC/HP/Attack/DPR/DC (2014 DMG table shape)", () => {
  const monotonic = ev(`(()=>{
    for(let i=1;i<CR_LIST.length;i++){
      const a=CR_EXPECT[CR_LIST[i-1]],b=CR_EXPECT[CR_LIST[i]];
      const [ac0,hMin0,,atk0,,dMax0,dc0]=a,[ac1,hMin1,,atk1,,dMax1,dc1]=b;
      if(ac1<ac0||hMin1<hMin0||atk1<atk0||dMax1<dMax0||dc1<dc0)return 'CR '+CR_LIST[i]+' regresses vs '+CR_LIST[i-1];
    }
    return 'ok';
  })()`);
  assert.equal(monotonic, "ok");
});

const evJSON = (expr) => JSON.parse(ev(`JSON.stringify(${expr})`));

test("crExpected(cr) — known spot values from the 2014 DMG table", () => {
  assert.deepEqual(evJSON("crExpected('1')"), { cr: "1", pb: 2, ac: 13, hpMin: 71, hpMax: 85, hpAvg: 78, atk: 3, dprMin: 9, dprMax: 14, dprAvg: 12, dc: 13 });
  assert.deepEqual(evJSON("crExpected('5')"), { cr: "5", pb: 3, ac: 15, hpMin: 131, hpMax: 145, hpAvg: 138, atk: 6, dprMin: 33, dprMax: 38, dprAvg: 36, dc: 15 });
  assert.deepEqual(evJSON("crExpected('20')"), { cr: "20", pb: 6, ac: 19, hpMin: 356, hpMax: 400, hpAvg: 378, atk: 10, dprMin: 123, dprMax: 140, dprAvg: 132, dc: 19 });
  assert.deepEqual(evJSON("crExpected('30')"), { cr: "30", pb: 9, ac: 19, hpMin: 806, hpMax: 850, hpAvg: 828, atk: 14, dprMin: 303, dprMax: 320, dprAvg: 312, dc: 23 });
});

test("crExpected returns null for an unknown CR", () => {
  assert.equal(ev("crExpected('99')"), null);
});
