// Monster Forge — DEV SEED (local sandbox only).
// Loaded as a classic <script> sharing ONE global scope (after adventures.js, before app.js).
// Purpose: pre-fill the LOCAL preview with a realistic bestiary + adventures/party/scenes/encounters
// so the app (and the Combat Tracker) can be exercised without touching real data.
//
// SAFETY: this only runs on localhost (never on GitHub Pages) and never on the jsdom test harness.
// While active it sets window.__MF_SEED, which makes jbinSet (core.js) a no-op — so seed data lives
// in memory + the local cache only and is NEVER written to the real JSONBin. Edits to seed data don't
// persist across reloads (the dataset is re-applied each load, by fixed id, idempotently). It coexists
// with any real adventures already loaded rather than replacing them.

function maybeApplySeed(){
  try{
    if(typeof window==="undefined")return;
    if(window.__MF_SEED)return; // already applied this session
    if(/jsdom/i.test((typeof navigator!=="undefined"&&navigator.userAgent)||""))return; // never seed tests
    const h=(location&&location.hostname)||"";
    const isLocal=h==="localhost"||h==="127.0.0.1"||h==="[::1]"||h==="";
    if(!isLocal)return; // never seed the live site
    window.__MF_SEED=true; // from here on, cloud writes are neutered (see jbinSet)
    applySeedData();
  }catch(e){console.warn("[seed] skipped:",e);}
}

function applySeedData(){
  // Build a creature from blankMonster() so every field/default stays valid as the model evolves.
  const mk=o=>normalizeMonster(Object.assign(blankMonster(),{chassis:false,status:"Ready",_auto:{ac:false,hp:false}},o));
  const txt=(name,text)=>({name,text});
  const mons=[
    mk({id:"seed-mon-goblin",name:"Goblin",shortName:{word:"goblin",proper:false,plural:false},size:"Small",type:"Fey",align:"neutral evil",
      ac:15,acnote:"leather armor, shield",hp:7,hpf:"2d6",spd:{walk:30,climb:0,fly:0,swim:0,burrow:0,hover:false},
      str:8,dex:14,con:10,int:10,wis:8,cha:8,skills:[["Stealth","prof"]],senses:{darkvision:60,blindsight:0,tremorsense:0,truesight:0,blindBeyond:false,other:""},
      lang:"Common, Goblin",cr:"1/4",
      traits:[txt("Nimble Escape","The goblin takes the Disengage or Hide action as a bonus action.")],
      actions:[txt("Scimitar","Melee Attack Roll: [ATK], reach 5 ft. Hit: [1d6+2] slashing damage.")]}),
    mk({id:"seed-mon-wolf",name:"Dire Wolf",shortName:{word:"wolf",proper:false,plural:false},size:"Large",type:"Beast",align:"unaligned",
      ac:14,acnote:"natural armor",hp:37,hpf:"5d10+10",spd:{walk:50,climb:0,fly:0,swim:0,burrow:0,hover:false},
      str:17,dex:15,con:15,int:3,wis:12,cha:7,skills:[["Perception","prof"],["Stealth","prof"]],
      lang:"",cr:"1",
      actions:[txt("Bite","Melee Attack Roll: [ATK], reach 5 ft. Hit: [2d6+3] piercing damage. If the target is a creature, it has the Prone condition (DC 13 Strength save negates).")]}),
    mk({id:"seed-mon-bandit",name:"Bandit Captain",shortName:{word:"captain",proper:false,plural:false},size:"Medium",type:"Humanoid",align:"neutral",
      ac:15,acnote:"studded leather",hp:65,hpf:"10d8+20",spd:{walk:30,climb:0,fly:0,swim:0,burrow:0,hover:false},
      str:15,dex:16,con:14,int:14,wis:11,cha:14,saves:["str","dex","wis"],skills:[["Athletics","prof"],["Deception","prof"]],
      lang:"Common, Thieves' Cant",cr:"2",
      actions:[txt("Multiattack","The captain makes two melee attacks: two with its scimitar or one scimitar and one dagger."),
        txt("Scimitar","Melee Attack Roll: [ATK], reach 5 ft. Hit: [1d6+3] slashing damage."),
        txt("Dagger","Melee or Ranged Attack Roll: [ATK], reach 5 ft. or range 20/60 ft. Hit: [1d4+3] piercing damage.")],
      reactions:[{name:"Parry",trigger:"The captain is hit by a melee attack while holding a weapon.",response:"The captain adds 2 to its AC against that attack, possibly causing it to miss."}]}),
    mk({id:"seed-mon-ogre",name:"Ogre",shortName:{word:"ogre",proper:false,plural:false},size:"Large",type:"Giant",align:"chaotic evil",
      ac:11,acnote:"hide armor",hp:59,hpf:"7d10+21",spd:{walk:40,climb:0,fly:0,swim:0,burrow:0,hover:false},
      str:19,dex:8,con:16,int:5,wis:7,cha:7,senses:{darkvision:60,blindsight:0,tremorsense:0,truesight:0,blindBeyond:false,other:""},
      lang:"Common, Giant",cr:"2",
      actions:[txt("Greatclub","Melee Attack Roll: [ATK], reach 5 ft. Hit: [2d8+4] bludgeoning damage."),
        txt("Javelin","Melee or Ranged Attack Roll: [ATK], reach 5 ft. or range 30/120 ft. Hit: [2d6+4] piercing damage.")]}),
    mk({id:"seed-mon-fanatic",name:"Cult Fanatic",shortName:{word:"fanatic",proper:false,plural:false},size:"Medium",type:"Humanoid",align:"neutral evil",
      ac:13,acnote:"leather armor",hp:33,hpf:"6d8+6",spd:{walk:30,climb:0,fly:0,swim:0,burrow:0,hover:false},
      str:11,dex:14,con:12,int:10,wis:13,cha:14,skills:[["Deception","prof"],["Persuasion","prof"],["Religion","prof"]],
      lang:"Common",cr:"2",
      traits:[txt("Dark Devotion","The fanatic has Advantage on saves against being Charmed or Frightened.")],
      actions:[txt("Multiattack","The fanatic makes two Dagger attacks."),
        txt("Dagger","Melee or Ranged Attack Roll: [ATK], reach 5 ft. or range 20/60 ft. Hit: [1d4+2] piercing damage."),
        txt("Inflict Wounds (3/Day)","Melee Spell Attack: [ATK], reach 5 ft. Hit: [3d10] necrotic damage.")]}),
    mk({id:"seed-mon-dragon",name:"Young Green Dragon",shortName:{word:"dragon",proper:true,plural:false},size:"Large",type:"Dragon",align:"lawful evil",
      ac:18,acnote:"natural armor",hp:136,hpf:"16d10+48",spd:{walk:40,climb:0,fly:80,swim:40,burrow:0,hover:false},
      str:19,dex:12,con:17,int:16,wis:13,cha:15,saves:["dex","con","wis","cha"],skills:[["Deception","prof"],["Perception","prof"],["Stealth","prof"]],
      dmg:{Poison:"imm"},senses:{darkvision:120,blindsight:30,tremorsense:0,truesight:0,blindBeyond:true,other:""},
      lang:"Common, Draconic",cr:"8",
      traits:[txt("Amphibious","The dragon can breathe air and water.")],
      actions:[txt("Multiattack","The dragon makes one Bite attack and two Claw attacks."),
        txt("Bite","Melee Attack Roll: [ATK], reach 10 ft. Hit: [2d10+4] piercing damage plus [1d6] poison damage."),
        txt("Claw","Melee Attack Roll: [ATK], reach 5 ft. Hit: [2d6+4] slashing damage."),
        txt("Poison Breath (Recharge 5-6)","The dragon exhales poison gas in a 30-foot cone. Each creature in that area makes a DC 14 Constitution save, taking [12d6] poison damage on a failed save, or half as much on a success.")]})
  ];
  // Add seed creatures that aren't already present (keyed by their fixed id).
  const have=new Set(state.lib.map(m=>m.id));
  mons.forEach(m=>{if(!have.has(m.id))state.lib.push(m);});

  const C=(monsterId,count,faction)=>({type:"monster",id:uid(),monsterId,nickname:"",count:count||1,faction:faction||"Enemy"});
  const party=()=>[
    {id:uid(),name:"Thorin Ironbrow",ac:"18",hp:"32",init:"+1",fields:[{label:"Class",value:"Fighter"},{label:"Passive Perception",value:"12"}]},
    {id:uid(),name:"Lyra Vance",ac:"12",hp:"18",init:"+2",fields:[{label:"Class",value:"Wizard"},{label:"Spell Save DC",value:"13"}]},
    {id:uid(),name:"Brother Cael",ac:"16",hp:"24",init:"+0",fields:[{label:"Class",value:"Cleric"}]},
    {id:uid(),name:"Vex",ac:"14",hp:"22",init:"+3",fields:[{label:"Class",value:"Rogue"},{label:"Passive Perception",value:"15"}]}
  ];

  const sc1a="seed-sc-ford",sc1b="seed-sc-shrine";
  const adv1=normalizeAdv({id:"seed-adv-crossroads",name:"The Sunken Crossroads",color:"#3f8f7a",
    size:4,level:3,uneven:false,levels:[3,3,3,3],notes:"A flooded trade junction held by goblin raiders and a tidewater cult. Three days of rain have drowned the lower road.",
    notesOn:true,party:party(),
    scenes:[{id:sc1a,name:"Ambush at the Ford",notes:"The party reaches the washed-out ford at dusk.",notesOn:true},
      {id:sc1b,name:"The Drowned Shrine",notes:"Stairs descend into a half-flooded shrine of the Black Tide."}],
    encounters:[
      {id:"seed-enc-goblins",name:"Goblin Raiders",sceneId:sc1a,status:"ready",notes:"Goblins use the wrecked carts for cover.",notesOn:true,combatants:[C("seed-mon-goblin",4),C("seed-mon-wolf",1)]},
      {id:"seed-enc-toll",name:"The Bandit Toll",sceneId:sc1a,status:"draft",combatants:[C("seed-mon-bandit",1),C("seed-mon-goblin",2)]},
      {id:"seed-enc-cult",name:"Cult of the Black Tide",sceneId:sc1b,status:"draft",combatants:[C("seed-mon-fanatic",1),C("seed-mon-goblin",3)]},
      {id:"seed-enc-ogre",name:"Ogre Sentry",sceneId:sc1b,status:"draft",combatants:[C("seed-mon-ogre",1)]},
      {id:"seed-enc-levee",name:"Skirmish on the Levee",sceneId:null,status:"completed",combatants:[C("seed-mon-goblin",6,"Enemy"),C("seed-mon-wolf",1,"Ally")]}
    ]});

  const adv2=normalizeAdv({id:"seed-adv-ashfall",name:"Ashfall Keep",color:"#b5523f",
    size:4,level:6,uneven:false,levels:[6,6,6,6],notes:"A ruined hill fort claimed by a young green dragon and the marauders who serve it.",
    notesOn:true,party:party(),scenes:[],
    encounters:[
      {id:"seed-enc-marauders",name:"Marauders at the Gate",sceneId:null,status:"ready",combatants:[C("seed-mon-bandit",1),C("seed-mon-ogre",1),C("seed-mon-goblin",2)]},
      {id:"seed-enc-wyrm",name:"The Green Wyrm",sceneId:null,status:"draft",notes:"Boss fight — the dragon fights from the flooded courtyard, using its breath when it can catch two PCs.",notesOn:true,combatants:[C("seed-mon-dragon",1)]}
    ]});

  const haveAdv=new Set(state.adv.map(a=>a.id));
  [adv1,adv2].forEach(a=>{if(!haveAdv.has(a.id))state.adv.unshift(a);});
}
