// End-to-end crew flow through the REAL DOM handlers (jsdom), v2: enable the crew, roll a kobold
// through the table-first ritual (per-score stat rolls, sub-rolls, typed identity), save it, open
// the statblock card, mark it dead, see the archive; then the full phone flow on a patched
// transport, and the DM's replace/dedup ingest semantics.
import test from "node:test";
import assert from "node:assert/strict";
import { bootApp, evalIn, settle } from "./harness.js";

let window;
test.before(async () => { ({ window } = bootApp()); await settle(); });
const ev = (expr) => { const v = evalIn(window, expr); return v !== null && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v; };
const evA = async (expr) => { const v = await evalIn(window, expr); return v !== null && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v; };

// Click through the ritual: whatever roll or sub-roll button the active step offers — plus the
// explicit ASI Apply (D-017: no self-resolving steps) — until only the identity step remains.
// Mirrors a player hammering the dice.
const ROLL_THROUGH = `
  { let rtGuard=0;
    while(rtGuard++<80){
      const b=document.querySelector(".gk-step.gk-active [data-gkroll]")
        ||document.querySelector("#gkR [data-gkrollsub]")
        ||document.querySelector('.gk-step.gk-active [data-gkapply="asi"]');
      if(!b)break;
      b.click();
    } }`;

test("crew flow: enable → table-first ritual → save → statblock card → mark dead → archive", async () => {
  const setup = ev(`(()=>{
    const a=normalizeAdv({id:"gk-test-adv",name:"Kobold Cannon",encounters:[]});
    state.adv.unshift(a);state.selAdv=a.id;advListView=false;
    switchView("adventures");renderAdvList();
    const tog=document.getElementById("advCrewTog");
    if(!tog)return {fail:"no advCrewTog in the kebab"};
    tog.click();
    // D-021 (v4 revision): no separate crew section — the roster header grows a share button and
    // an icon-only settings gear; the link controls live in their own share dialog, and the
    // settings modal carries only the generator config.
    const gear=document.getElementById("crewSettings");
    let shareInSettings=false;
    if(gear){gear.click();shareInSettings=!!document.getElementById("crewShareStart");
      const x=document.getElementById("crewCfgClose");if(x)x.click();}
    const shareBtn=document.getElementById("crewShareBtn");
    let share=false;
    if(shareBtn){shareBtn.click();share=!!document.getElementById("crewShareStart");closeModal();}
    return {crewOn:!!a.crew,panelGone:!document.querySelector(".gk-panel"),
            roll:!!document.getElementById("rollPC"),gear:!!gear,share,shareInSettings,
            caret:!!document.querySelector('[data-menu="pcadd"]'),
            regularAdd:!!document.getElementById("addPC")};})()`);
  assert.equal(setup.fail, undefined);
  assert.equal(setup.crewOn, true);
  assert.equal(setup.panelGone, true, "the old crew panel is dissolved");
  assert.equal(setup.roll, true, "split Roll button is the roster primary");
  assert.equal(setup.gear, true, "settings gear in the roster header");
  assert.equal(setup.share, true, "the share dialog opens from the roster-header share button");
  assert.equal(setup.shareInSettings, false, "the settings modal no longer carries link controls");
  assert.equal(setup.caret, true);
  assert.equal(setup.regularAdd, true, "regular add stays behind the caret");

  const ritual = ev(`(()=>{
    document.getElementById("rollPC").click();
    if(!document.getElementById("gkR"))return {fail:"ritual modal missing"};
    // D-034: the species group leads now — its tables resolve before the scores.
    let sp=0,spGuard=0;
    while(spGuard++<10&&document.querySelector('.gk-step.gk-active[data-step^="sp:"]')){
      const b=document.querySelector('.gk-step.gk-active [data-gkroll]')||document.querySelector("#gkR [data-gkrollsub]");
      if(!b)break;
      b.click();sp++;}
    // The class step must show its option table BEFORE any class roll (D-011)
    let stats=0,guard=0;
    while(guard++<10&&document.querySelector('.gk-step.gk-active[data-step="stats"]')){
      // the CELL button (walking one-ability roll) — the header also carries a Roll-all now (B284)
      document.querySelector('.gk-step.gk-active .gk-ab-roll[data-gkroll="stats"]').click();stats++;}
    const clsTable=document.querySelector('.gk-step.gk-active[data-step="cls"] .gk-tbl');
    const clsRows=clsTable?clsTable.querySelectorAll(".gk-tr").length:0;
    ${ROLL_THROUGH}
    // D-041: the rolls end the ritual; identity lives on the closing summary screen.
    const next=document.getElementById("gkNext");
    if(!next)return {fail:"the finished ritual did not offer Next"};
    next.click();
    const sum=document.querySelector(".gk-sum");
    const nm=document.getElementById("gkId_name");
    if(!sum||!nm)return {fail:"summary screen did not open"};
    // the DM's name is rolled on arrival, never typed
    const dmRolled=nm.value.trim();
    document.querySelector('[data-gkidroll="quirk"]').click();
    const quirk=document.getElementById("gkId_quirk").value;
    const nm2=document.getElementById("gkId_name");
    nm2.value="Sgrizzo";nm2.dispatchEvent(new window.Event("change"));
    const fin=document.getElementById("gkFinish");
    return {sp,stats,clsRows,finish:!!fin&&!fin.disabled,dmRolled,quirk};})()`);
  assert.equal(ritual.fail, undefined);
  assert.ok(ritual.sp >= 1, "the species tables resolve before the scores (D-034)");
  assert.equal(ritual.stats, 6, "six individual ability rolls");
  assert.ok(ritual.clsRows >= 3, "class table shown before rolling (rows: " + ritual.clsRows + ")");
  assert.ok(ritual.finish, "all steps resolved and the card is reachable");
  assert.ok(ritual.dmRolled, "the DM's name is rolled on arrival, never typed (D-041)");
  assert.ok(ritual.quirk, "the quirk rolls on the summary (D-042)");

  const saved = ev(`(()=>{
    document.getElementById("gkFinish").click();
    const card=document.querySelector("#gkR .gk-card");
    if(!card)return {fail:"card did not render"};
    if(!card.querySelector(".ab"))return {fail:"no statblock ability table"};
    if(!card.querySelector(".ab .roll-num"))return {fail:"ability table not rollable"};
    if(![...card.querySelectorAll("h3")].some(h=>h.textContent==="Bonus Actions"))return {fail:"no Bonus Actions section"};
    if(![...card.querySelectorAll(".blk .nm")].length)return {fail:"no entry names"};
    const nm=card.querySelector("h2").textContent.trim();
    document.getElementById("gkSave").click();
    const a=state.adv.find(x=>x.id==="gk-test-adv");
    const pc=a.party.map(id=>state.roster.find(r=>r.id===id)).find(p=>p&&p.gen);
    return {nm,party:a.party.length,pc:!!pc,pcName:pc&&pc.name,
            modalClosed:document.getElementById("modal").style.display!=="block",
            row:!!document.querySelector(".pc-row")};})()`);
  assert.equal(saved.fail, undefined);
  assert.equal(saved.pc, true);
  assert.equal(saved.pcName, saved.nm);
  assert.ok(saved.row, "the generated member is an ordinary party row");
  assert.equal(saved.modalClosed, true, "Add to the crew closes back to the roster (D-021)");
  assert.equal(saved.party, 1);

  const card = ev(`(()=>{
    // D-021: clicking the member's party row opens the statblock modal, not the roster page.
    document.querySelector(".pc-row").click();
    const host=document.getElementById("gkCardHost");
    if(!host||!host.querySelector(".gk-card"))return {fail:"card modal missing"};
    const notes=document.getElementById("gkNotes");
    // resource tracker: pips spend, SR restores partially where declared, the recharge label resets
    const pip=host.querySelector("[data-gkpip]");
    let pips=null;
    if(pip){pip.click();
      const spent=host.querySelectorAll(".gk-spent").length;
      let srAfter=null;
      const sr=host.querySelector("[data-gksr]");
      if(sr){const row=sr.closest(".gk-res-row");
        const pipsIn=row.querySelectorAll("[data-gkpip]");
        pipsIn[pipsIn.length-1].click(); // spend the row fully
        sr.click();                       // SR gives back its declared share
        srAfter=row.querySelectorAll(".gk-spent").length;}
      const reset=host.querySelector("[data-gkreset]");reset.click();
      pips={spent,srAfter,after:host.querySelectorAll(".gk-spent").length};}
    return {pips,notes:!!notes};})()`);
  assert.equal(card.fail, undefined);
  assert.equal(card.notes, true, "the statblock modal carries the notes section");
  if (card.pips) {
    assert.ok(card.pips.spent >= 1, "clicking a pip spends it");
    if (card.pips.srAfter != null) assert.ok(card.pips.srAfter >= 1, "SR restores only its share");
  }

  const dead = ev(`(()=>{
    const btn=document.getElementById("gkDied");
    if(!btn)return {fail:"no Mark dead on a living card"};
    btn.click();
    const yes=document.getElementById("cYes");
    if(!yes)return {fail:"confirm modal missing"};
    yes.click();
    const a=state.adv.find(x=>x.id==="gk-test-adv");
    return {party:a.party.length,fallen:a.crew.fallen.length,
            fallenName:a.crew.fallen[0]&&a.crew.fallen[0].name,
            rosterLeft:state.roster.filter(r=>r.gen).length,
            row:!!document.querySelector(".gk-fallen-row")};})()`);
  assert.equal(dead.fail, undefined);
  assert.equal(dead.party, 0);
  assert.equal(dead.fallen, 1);
  assert.equal(dead.rosterLeft, 0);
  assert.ok(dead.row);

  const fallenCard = ev(`(()=>{
    const b=document.querySelector("[data-gkfallen]");if(!b)return {fail:"no fallen card link"};
    b.click();
    return {card:!!document.querySelector("#gkCardHost .gk-card.gk-dead"),
            died:!!document.getElementById("gkDied"),
            tracker:!!document.querySelector("#gkCardHost .gk-res")};})()`);
  assert.equal(fallenCard.fail, undefined);
  assert.equal(fallenCard.card, true);
  assert.equal(fallenCard.died, false);
  assert.equal(fallenCard.tracker, false, "fallen cards carry no tracker");
  ev(`(()=>{state.adv=state.adv.filter(x=>x.id!=="gk-test-adv");state.selAdv=null;closeModal();return 1;})()`);
});

test("result override (D-011): clicking a rolled class result reopens the table; picking another row cascades", async () => {
  const r = ev(`(()=>{
    const a=normalizeAdv({id:"gk-edit-adv",name:"Edit",encounters:[]});
    state.adv.unshift(a);state.selAdv=a.id;
    a.crew={sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},shareId:"",fallen:[]};
    openGenRitualDM(a);
    const d=_genR.draft;
    for(let i=0;i<6;i++)genRollStep(d,"stats");
    genRollStep(d,"cls");genRollStep(d,"asi");genRollStep(d,"feat");genRollStep(d,"skills");
    renderGenRitual();
    const before=d.steps.cls.value;
    const edit=document.querySelector('[data-gkedit="cls"]');
    if(!edit)return {fail:"class result is not clickable"};
    edit.click();
    const table=document.querySelector('.gk-step[data-step="cls"] .gk-tbl');
    if(!table)return {fail:"clicking the result did not reopen the table"};
    // pick a different class through the full pick list is select-based; table rows carry the top3 —
    // apply a different pick directly through the engine's own pick path via a row click
    const row=[...table.querySelectorAll("[data-gkopt]")].find(x=>x.dataset.gkopt!==before);
    if(!row)return {fail:"no alternative row"};
    row.click();
    const after=_genR.draft.steps.cls.value;
    const skillsCleared=!_genR.draft.steps.skills;
    _genR=null;closeModal();
    state.adv=state.adv.filter(x=>x.id!=="gk-edit-adv");state.selAdv=null;
    return {before,after,changed:after!==before,skillsCleared};})()`);
  assert.equal(r.fail, undefined);
  assert.equal(r.changed, true, "row click overrides the rolled class");
  assert.equal(r.skillsCleared, true, "class override cascades to dependents");
});

test("G1 (D-039): a finished ritual swaps Roll the rest for Reroll, and Reroll rolls a whole new character", async () => {
  const r = ev(`(()=>{
    const a=normalizeAdv({id:"gk-again-adv",name:"Again",encounters:[]});
    state.adv.unshift(a);state.selAdv=a.id;
    a.crew={sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},shareId:"",fallen:[]};
    openGenRitualDM(a);
    const openAll=!!document.getElementById("gkAll"),openAgain=!!document.getElementById("gkAgain");
    document.getElementById("gkAll").click();               // Roll the rest
    const doneAll=!!document.getElementById("gkAll"),doneAgain=!!document.getElementById("gkAgain");
    // D-044: Reroll applies to the CURRENT screen. On the summary it rerolls identity only…
    document.getElementById("gkNext").click();
    const nm=document.getElementById("gkId_name");
    nm.value="Sgrizzo";nm.dispatchEvent(new window.Event("change"));
    const clsBefore=_genR.draft.steps.cls.value;
    document.getElementById("gkAgain").click();
    const idOnly=_genR.draft.steps.cls.value===clsBefore
      &&_genR.draft.steps.name.value!=="Sgrizzo"
      &&!!document.querySelector(".gk-sum");
    // …and on the rolls it is a whole new character.
    document.getElementById("gkBackSteps").click();
    document.getElementById("gkId_name");
    const before=JSON.stringify(_genR.draft.steps),beforeName="Sgrizzo";
    document.getElementById("gkAgain").click();             // Reroll, from the rolls
    const d=_genR.draft;
    const out={openAll,openAgain,doneAll,doneAgain,before,beforeName,idOnly,
               backOnSteps:!!document.getElementById("gkNext")&&!document.querySelector(".gk-sum"),
               after:JSON.stringify(d.steps),
               afterName:d.steps.name?d.steps.name.value:null,
               cls:!!(d.steps.cls&&d.steps.cls.value),stats:!!(d.steps.stats&&d.steps.stats.value),
               sameCfg:d.sp==="kobold"&&d.set.stat==="3d6"&&d.set.asi===true};
    _genR=null;closeModal();
    state.adv=state.adv.filter(x=>x.id!=="gk-again-adv");state.selAdv=null;
    return out;})()`);
  assert.equal(r.openAll, true, "an unfinished ritual offers Roll the rest");
  assert.equal(r.openAgain, false, "…and not Reroll");
  assert.equal(r.doneAll, false, "a finished ritual drops Roll the rest");
  assert.equal(r.doneAgain, true, "…and offers Reroll in its place");
  assert.equal(r.idOnly, true, "Reroll on the summary rerolls identity only, and stays there (D-044)");
  assert.notEqual(r.after, r.before, "Reroll rolls every step again");
  assert.equal(r.afterName, null, "a reroll from the rolls clears identity — a new body, not the old name");
  assert.equal(r.backOnSteps, true, "a reroll from the summary lands back on the rolls");
  assert.equal(r.cls, true, "the fresh draft is rolled through, not left empty");
  assert.equal(r.stats, true);
  assert.equal(r.sameCfg, true, "the reroll keeps the crew's own settings");
});

test("crew mode (phone): claim → ritual → payload-only PUT to own subtree → card → reroll counts the death", async () => {
  const r = await evA(`(async()=>{
    const puts=[];
    jbinFetch=async(url,opts)=>{puts.push({url,body:opts&&opts.body?JSON.parse(opts.body):null});return {ok:true};};
    CREW_MODE=true;_crew={id:"tshare",pid:"pidA",pn:"",node:{v:1,kind:"crew",
      cfg:{name:"Kobold Cannon",sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true}},crew:{}}};
    let root=document.getElementById("crewRoot");
    if(!root){root=document.createElement("div");root.id="crewRoot";document.body.appendChild(root);}
    renderCrewScreen();
    if(!document.getElementById("crewPn"))return {fail:"name gate missing"};
    document.getElementById("crewPn").value="Marco";
    document.getElementById("crewJoin").click();
    if(!document.getElementById("crewRollBtn"))return {fail:"roll button missing after claim"};
    document.getElementById("crewRollBtn").click();
    ${ROLL_THROUGH}
    // the player's own flow: Next → summary → the name is REQUIRED here (D-041)
    document.getElementById("gkNext").click();
    const pnm=document.getElementById("gkId_name");
    const gatedEmpty=document.getElementById("gkFinish").disabled&&!pnm.value;
    pnm.value="Sgrizzo";pnm.dispatchEvent(new window.Event("change"));
    document.getElementById("gkFinish").click();
    document.getElementById("gkSave").click();
    await new Promise(res=>setTimeout(res,10));
    const put1=puts[puts.length-1];
    const rec1=_crew.node.crew.pidA;
    if(!rec1)return {fail:"local node not updated"};
    const cardUp=!!document.querySelector("#crewRoot .gk-card"),died=!!document.getElementById("crewDied");
    document.getElementById("crewDied").click();
    document.getElementById("cYes").click();
    ${ROLL_THROUGH}
    document.getElementById("gkNext").click();
    const pnm2=document.getElementById("gkId_name");
    pnm2.value="Braciola";pnm2.dispatchEvent(new window.Event("change"));
    document.getElementById("gkFinish").click();
    document.getElementById("gkSave").click();
    await new Promise(res=>setTimeout(res,10));
    const rec2=_crew.node.crew.pidA;
    return {putUrl:put1.url,recKeys:Object.keys(put1.body).sort(),gatedEmpty,
      curV:put1.body.cur&&put1.body.cur.v,
      noDerived:put1.body.cur&&put1.body.cur.hp===undefined&&put1.body.cur.ac===undefined,
      deaths0:rec1.deaths,deaths1:rec2.deaths,name2:rec2.cur.steps.name.value,cardUp,died};})()`);
  assert.equal(r.fail, undefined);
  assert.ok(/shares\/tshare\/crew\/pidA\.json$/.test(r.putUrl), "phone writes only its own subtree: " + r.putUrl);
  assert.deepEqual(r.recKeys, ["cur", "deaths", "pn"]);
  assert.equal(r.curV, 2);
  assert.equal(r.noDerived, true);
  assert.equal(r.cardUp, true);
  assert.equal(r.died, true);
  assert.equal(r.deaths0, 0);
  assert.equal(r.deaths1, 1);
  assert.equal(r.name2, "Braciola");
  assert.equal(r.gatedEmpty, true, "a player's card is gated on a name they type themselves (D-041)");
});

// B286 / D-029: the phone tracks its own HP (reported to the DM as two clamped numbers) and keeps
// notes strictly on the device — free text never reaches the wire.
test("crew mode (phone): HP row reports to its own hp leaf, notes stay local", async () => {
  const r = await evA(`(async()=>{
    const puts=[];
    jbinFetch=async(url,opts)=>{puts.push({url,body:opts&&opts.body?JSON.parse(opts.body):null});return {ok:true};};
    const d=genNewDraft({sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},counts:{}});
    genRollAll(d,(s=>{let x=s;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};})(9101));
    genApplyPick(d,"name","Ossobuco");
    const payload=genCompletePayload(d);
    CREW_MODE=true;_crew={id:"tshare2",pid:"pidB",pn:"Ada",node:{v:1,kind:"crew",
      cfg:{name:"Kobold Cannon",sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true}},
      crew:{pidB:{pn:"Ada",deaths:0,cur:payload}}}};
    let root=document.getElementById("crewRoot");
    if(!root){root=document.createElement("div");root.id="crewRoot";document.body.appendChild(root);}
    try{localStorage.removeItem("mf_crewhp:"+payload.id);localStorage.removeItem("mf_crewnote:"+payload.id);}catch(e){}
    renderCrewScreen();
    // D-046: the block repaints itself on every change, so each step re-queries it.
    const q=()=>document.querySelector("#crewRoot .gk-hp");
    if(!q())return {fail:"no HP block on the crew card"};
    const max=Number(q().dataset.max);
    const start=q().querySelector(".gk-hp-v b").textContent;
    q().querySelector(".gk-hp-in").value="1";
    q().querySelector(".gk-hp-apply").click();
    const afterHit=q().querySelector(".gk-hp-v b").textContent;
    const stored=JSON.parse(localStorage.getItem("mf_crewhp:"+payload.id)||"null");
    q().querySelector("[data-gkhpfull]").click();
    const afterFull=q().querySelector(".gk-hp-v b").textContent;
    const notes=document.getElementById("crewNotes");
    if(notes){notes.value="knows the sewer route";notes.dispatchEvent(new window.Event("change"));}
    await new Promise(res=>setTimeout(res,900));
    const hpPut=puts.filter(p=>/\\/hp\\.json$/.test(p.url));
    return {max,start:Number(start),afterHit:Number(afterHit),afterFull:Number(afterFull),
      stored,note:localStorage.getItem("mf_crewnote:"+payload.id),
      hpPutN:hpPut.length,hpUrl:hpPut.length?hpPut[hpPut.length-1].url:"",
      hpKeys:hpPut.length?Object.keys(hpPut[hpPut.length-1].body).sort():[],
      noteOnWire:puts.some(p=>JSON.stringify(p.body||"").indexOf("sewer route")>=0)};})()`);
  assert.equal(r.fail, undefined);
  assert.equal(r.start, r.max, "an untracked character starts at full HP");
  assert.equal(r.afterHit, r.max - 1);
  assert.deepEqual(r.stored, { cur: r.max - 1, tmp: 0 }, "HP persists per device like the pips");
  assert.equal(r.afterFull, r.max, "full resets the row");
  assert.ok(/shares\/tshare2\/crew\/pidB\/hp\.json$/.test(r.hpUrl), "own hp leaf only: " + r.hpUrl);
  assert.deepEqual(r.hpKeys, ["at", "cur", "tmp"], "two numbers and a stamp, nothing else");
  assert.equal(r.hpPutN, 1, "the report is debounced into one write");
  assert.equal(r.note, "knows the sewer route");
  assert.equal(r.noteOnWire, false, "notes never leave the phone (D-029)");
});

test("DM side: a reported HP is clamped, applied to the live combat instance, and idempotent", () => {
  const r = ev(`(()=>{
    const a=normalizeAdv({id:"gk-hp-adv",name:"HP sync",encounters:[]});
    state.adv.unshift(a);
    a.crew={sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},shareId:"",fallen:[]};
    const d=genNewDraft({sp:"kobold",set:a.crew.set,counts:{}});
    genRollAll(d,(s=>{let x=s;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};})(9202));
    genApplyPick(d,"name","Trippa");
    const pc=genIngestPayload(a,genCompletePayload(d),"Ada","p:devH");
    const max=Number(charFieldVal(pc,"hp"));
    a.encounters.push({id:"e1",name:"Fight",combatants:[],combat:{round:1,turnIndex:0,prompts:[],
      order:[{id:"i1",kind:"pc",srcId:pc.id,name:pc.name,hpMax:max,hpCur:max,hpTemp:0,conditions:[]}]}});
    const applied=crewApplyHp(a,"p:devH",{hp:{cur:3,tmp:5,at:1000}});
    const inst=()=>a.encounters[0].combat.order[0];
    const afterOne={cur:inst().hpCur,tmp:inst().hpTemp,pcHp:pc.gen.hp};
    const again=crewApplyHp(a,"p:devH",{hp:{cur:3,tmp:5,at:1000}});
    inst().hpCur=max; // the DM heals in their own tracker
    const stale=crewApplyHp(a,"p:devH",{hp:{cur:1,tmp:0,at:500}});
    const dmKept=inst().hpCur;
    const hostile=crewApplyHp(a,"p:devH",{hp:{cur:99999,tmp:-4,at:2000}});
    const clamped={cur:inst().hpCur,tmp:inst().hpTemp};
    const junk=[crewApplyHp(a,"p:devH",{hp:{cur:"lots",at:3000}}),
                crewApplyHp(a,"p:devH",{hp:"12"}),crewApplyHp(a,"p:devH",{})];
    const out={applied,afterOne,again,stale,dmKept,hostile,clamped,junk,max};
    state.adv=state.adv.filter(x=>x.id!=="gk-hp-adv");
    state.roster=state.roster.filter(x=>!(x.gen&&x.gen.pid==="p:devH"));
    return out;})()`);
  assert.equal(r.applied, true);
  assert.deepEqual(r.afterOne, { cur: 3, tmp: 5, pcHp: { cur: 3, tmp: 5 } });
  assert.equal(r.again, false, "the same stamped report never re-lands");
  assert.equal(r.stale, false, "an older report never overwrites a newer state");
  assert.equal(r.dmKept, r.max, "the DM's own edit survives a stale report");
  assert.equal(r.hostile, true);
  assert.deepEqual(r.clamped, { cur: r.max, tmp: 0 }, "cur clamps to max, temp can't go negative");
  assert.deepEqual(r.junk, [false, false, false], "non-numeric or shapeless reports are dropped");
});

test("DM ingest: same device slot replaces (predecessor falls), known payload ids are skipped", () => {
  const r = ev(`(()=>{
    const a=normalizeAdv({id:"gk-sync-adv",name:"Sync",encounters:[]});
    state.adv.unshift(a);
    a.crew={sp:"kobold",set:{stat:"3d6",mode:"plausible",asi:true},shareId:"",fallen:[]};
    const mk=(nm,seed)=>{const d=genNewDraft({sp:"kobold",set:a.crew.set,counts:{}});
      genRollAll(d,(s=>{let x=s;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};})(seed));
      genApplyPick(d,"name",nm);
      return genCompletePayload(d);};
    const p1=mk("Primo",7001),p2=mk("Secondo",7002);
    genIngestPayload(a,p1,"Marco","p:dev1");
    const afterFirst={party:a.party.length,fallen:a.crew.fallen.length};
    const dup=genIngestPayload(a,p1,"Marco","p:dev1");
    genIngestPayload(a,p2,"Marco","p:dev1");
    const out={afterFirst,dup:dup===null,party:a.party.length,
      fallen:a.crew.fallen.length,fallenName:a.crew.fallen[0]&&a.crew.fallen[0].name,
      living:a.party.map(id=>state.roster.find(x=>x.id===id)).filter(Boolean).map(p=>p.name)};
    state.adv=state.adv.filter(x=>x.id!=="gk-sync-adv");
    state.roster=state.roster.filter(x=>!(x.gen&&x.gen.pid==="p:dev1"));
    return out;})()`);
  assert.equal(r.afterFirst.party, 1);
  assert.equal(r.afterFirst.fallen, 0);
  assert.equal(r.dup, true);
  assert.equal(r.party, 1);
  assert.equal(r.fallen, 1);
  assert.equal(r.fallenName, "Primo");
  assert.deepEqual(r.living, ["Secondo"]);
});
