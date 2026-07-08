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

test("CR_EXPECT is non-decreasing CR-over-CR on AC/HP/Attack/DPR/DC", () => {
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

test("crExpected(cr) — known spot values from the calibrated table (CR_CALIBRATION.md)", () => {
  assert.deepEqual(evJSON("crExpected('1')"), { cr: "1", pb: 2, ac: 13, hpMin: 24, hpMax: 36, hpAvg: 30, atk: 4, dprMin: 10, dprMax: 13, dprAvg: 12, dc: 12 });
  assert.deepEqual(evJSON("crExpected('5')"), { cr: "5", pb: 3, ac: 15, hpMin: 83, hpMax: 102, hpAvg: 93, atk: 7, dprMin: 31, dprMax: 39, dprAvg: 35, dc: 14 });
  assert.deepEqual(evJSON("crExpected('20')"), { cr: "20", pb: 6, ac: 20, hpMin: 309, hpMax: 333, hpAvg: 321, atk: 15, dprMin: 124, dprMax: 129, dprAvg: 127, dc: 21 });
  assert.deepEqual(evJSON("crExpected('30')"), { cr: "30", pb: 9, ac: 22, hpMin: 776, hpMax: 825, hpAvg: 801, atk: 19, dprMin: 184, dprMax: 189, dprAvg: 187, dc: 27 });
});

test("CR_EXPECT HP and DPR bands tile the ladder — no gaps, no overlaps (inverse lookup safety)", () => {
  const tiled = ev(`(()=>{
    for(let i=1;i<CR_LIST.length;i++){
      const a=CR_EXPECT[CR_LIST[i-1]],b=CR_EXPECT[CR_LIST[i]];
      if(b[1]!==a[2]+1)return 'HP gap/overlap at CR '+CR_LIST[i]+': '+a[2]+' -> '+b[1];
      if(b[4]!==a[5]+1)return 'DPR gap/overlap at CR '+CR_LIST[i]+': '+a[5]+' -> '+b[4];
    }
    return 'ok';
  })()`);
  assert.equal(tiled, "ok");
});

test("crExpected returns null for an unknown CR", () => {
  assert.equal(ev("crExpected('99')"), null);
});
