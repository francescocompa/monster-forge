// Monster Forge — 3D dice overlay (B214). Real cannon.js physics + three.js; STONE material, sharp edges.
// Loaded as a classic <script> sharing the global scope; doRoll() (engine.js) calls rollDice3D() on each roll.
//
// SAFETY: every THREE / CANNON / WebGL touch is LAZY (created on the first real roll) and GUARDED, so the
// no-build page init and the jsdom smoke test — which load neither library and have no WebGL — never run any
// of it (rollDice3D returns immediately when THREE/CANNON are absent or WebGL init fails).
//
// Distilled from the dice spike: cannon pre-roll → paint the predetermined value onto the face that lands up
// → reset & replay the identical fixed-step sim (so the shown value never changes at settle). sRGB colour;
// Vecna numbers with the logo on the max face. Physics runs in small units (cannon explodes at pixel scale)
// scaled to CSS px for rendering.

const D3D_SCALE = 48, D3D_GRAV = 62, D3D_CAP = 20, D3D_BRAND = 0xe2654d;
const D3D_DWELL = 1300, D3D_VANISH = 300;           // ms — dice linger after settling, then implode
let d3dReady = false, d3dDead = false, d3dRoll = null, d3dLooping = false;
let d3dRenderer, d3dScene, d3dCamera, d3dWorld, d3dKey, d3dGround, d3dUP, d3dW = 0, d3dH = 0;
let d3dMatDie, d3dMatFloor, d3dMatWall, d3dWalls = [];
let d3dLogoTex = null, d3dStoneTex = null, d3dGemTex = null, d3dLive = [], d3dLiveMeshes = [], d3dCardEl = null;
// Read the user's dice look from settings (material / brand colour / cube edge style), with safe fallbacks.
function d3dLook(){ const d = (typeof state === "object" && state.settings && state.settings.dice3d) || {}; return { material: d.material || "stone", color: d.color || "#e2654d", edges: d.edges || "sharp" }; }
const d3dTexCache = new Map();
const d3dDieFont = '"Vecna", "Copperplate", "Luminari", fantasy, serif';
let d3dPX = 0, d3dPY = 0, d3dPrev = 0;
const d3dCl = (v, a, b) => v < a ? a : v > b ? b : v;
// Track the pointer so dice spawn from where the user clicked (safe in jsdom — just stores coords).
if (typeof addEventListener === "function") addEventListener("pointerdown", e => { d3dPX = e.clientX; d3dPY = e.clientY; }, true);

// Parse the engine's r.parts string into the dice that physically rolled (values, not kept/dropped):
//   "2d6:[3,5]"  "2d20kh1:[15,8]"  "d20(15,8)→15" (adv/dis).  Flat mods and d% are ignored (no 3D die).
// Which indices of `vals` are DROPPED by a keep/drop modifier (kh/kl/dh/dl) — for dimming the unkept dice.
function d3dDroppedSet(vals, kmod){
  const drop = new Set(); if (!kmod) return drop;
  const mt = kmod.slice(0,2).toLowerCase(), kn = Number(kmod.slice(2) || 1);
  const idx = vals.map((v,i) => i).sort((x,y) => vals[x] - vals[y]); // indices ascending by value
  let keep;
  if (mt === "kh") keep = new Set(idx.slice(-kn));
  else if (mt === "kl") keep = new Set(idx.slice(0, kn));
  else if (mt === "dh") keep = new Set(idx.slice(0, Math.max(0, vals.length - kn)));
  else keep = new Set(idx.slice(kn)); // dl
  vals.forEach((v,i) => { if (!keep.has(i)) drop.add(i); });
  return drop;
}
function d3dParse(parts){
  const out = []; const s = String(parts || "");
  let m, re = /(\d+)d(\d+)((?:kh|kl|dh|dl)\d*)?:\[([\d,]+)\]/gi;
  while ((m = re.exec(s))){
    const sides = +m[2], kmod = m[3] || "", vals = m[4].split(",").map(Number), dropped = d3dDroppedSet(vals, kmod);
    vals.forEach((v,i) => out.push({ sides, value:v, dropped:dropped.has(i) }));
  }
  let re2 = /\bd(\d+)\((\d+),(\d+)\)(?:→|->)?(\d+)?/gi; // adv/dis shorthand: d20(a,b)→keep
  while ((m = re2.exec(s))){
    const sides = +m[1], vals = [+m[2], +m[3]], keep = m[4] !== undefined ? +m[4] : Math.max(vals[0], vals[1]);
    let ki = vals.indexOf(keep); if (ki < 0) ki = 0;
    vals.forEach((v,i) => out.push({ sides, value:v, dropped:i !== ki }));
  }
  return out.slice(0, D3D_CAP);
}

// ---- textures -------------------------------------------------------------------------------------
function d3dNumTex(n, sides){
  const k = n + ":" + sides; if (d3dTexCache.has(k)) return d3dTexCache.get(k);
  const s = 160, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d"), str = String(n);
  g.font = "700 118px " + d3dDieFont; g.textAlign = "center"; g.textBaseline = "alphabetic";
  const me = g.measureText(str), asc = me.actualBoundingBoxAscent || 60, desc = me.actualBoundingBoxDescent || 0;
  const y = s/2 + (asc - desc)/2;
  g.lineJoin = "round"; g.lineWidth = 13; g.strokeStyle = "rgba(58,16,9,0.92)"; g.strokeText(str, s/2, y);
  g.fillStyle = "#fff4ee"; g.fillText(str, s/2, y);
  if (n === 6 || n === 9){ g.fillRect(s*0.36, y + desc + 10, s*0.28, 7); }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; d3dTexCache.set(k, t); return t;
}
function d3dStoneTexture(){
  if (d3dStoneTex) return d3dStoneTex;
  const s = 512, c = document.createElement("canvas"); c.width = c.height = s; const g = c.getContext("2d");
  g.fillStyle = "#c44a26"; g.fillRect(0,0,s,s);
  const img = g.getImageData(0,0,s,s), d = img.data;
  for (let i=0;i<d.length;i+=4){ const nz = (Math.random()-0.5)*26 + (Math.random()<0.04?(Math.random()-0.5)*60:0); d[i]+=nz; d[i+1]+=nz; d[i+2]+=nz; }
  g.putImageData(img,0,0);
  d3dStoneTex = new THREE.CanvasTexture(c); d3dStoneTex.encoding = THREE.sRGBEncoding;
  d3dStoneTex.wrapS = d3dStoneTex.wrapT = THREE.RepeatWrapping; d3dStoneTex.repeat.set(3,3); d3dStoneTex.anisotropy = 8;
  return d3dStoneTex;
}
function d3dLoadLogo(){
  fetch("logo-dice.svg").then(r => r.text()).then(svg => {
    svg = svg.replace(/width="[^"]*"/, 'width="256"').replace(/height="[^"]*"/, 'height="256"');
    const img = new Image();
    img.onload = () => {
      const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
      cv.getContext("2d").drawImage(img, s*0.1, s*0.1, s*0.8, s*0.8);
      d3dLogoTex = new THREE.CanvasTexture(cv); d3dLogoTex.anisotropy = 4; d3dLogoTex.encoding = THREE.sRGBEncoding;
      d3dLive.forEach(L => { if (L.value === L.sides){ L.mat.map = d3dLogoTex; L.mat.needsUpdate = true; } });
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }).catch(() => {});
}

// ---- geometry -------------------------------------------------------------------------------------
function d3dRoundedBox(size, radius, seg){
  const geo = new THREE.BoxGeometry(size, size, size, seg, seg, seg), p = geo.attributes.position, h = size/2 - radius;
  for (let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i), cx=d3dCl(x,-h,h), cy=d3dCl(y,-h,h), cz=d3dCl(z,-h,h);
    let dx=x-cx, dy=y-cy, dz=z-cz; const L=Math.hypot(dx,dy,dz)||1;
    p.setXYZ(i, cx+dx/L*radius, cy+dy/L*radius, cz+dz/L*radius);
  }
  geo.computeVertexNormals(); return geo;
}
const d3dIsBox = sides => sides === 6 || ![4,8,12,20].includes(sides);
function d3dFaceList(geo){
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, map = new Map();
  const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3(), n=new THREE.Vector3(), cb=new THREE.Vector3(), ab=new THREE.Vector3();
  for (let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i); b.fromBufferAttribute(p,i+1); c.fromBufferAttribute(p,i+2);
    cb.subVectors(c,b); ab.subVectors(a,b); n.crossVectors(cb,ab).normalize();
    const key = n.x.toFixed(2)+","+n.y.toFixed(2)+","+n.z.toFixed(2);
    let e = map.get(key); if (!e){ e = { normal:n.clone(), sum:new THREE.Vector3(), c:0, vert:a.clone() }; map.set(key,e); }
    e.sum.add(a).add(b).add(c); e.c += 3;
  }
  return [...map.values()].map(e => ({ normal:e.normal, centroid:e.sum.multiplyScalar(1/e.c), vert:e.vert }));
}
function d3dBuild(sides, R){
  if (d3dIsBox(sides)){
    const size = R*1.4, hs = size/2;
    const faces = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(nn => {
      const normal = new THREE.Vector3(nn[0],nn[1],nn[2]); return { normal, centroid: normal.clone().multiplyScalar(hs) };
    });
    const bevel = d3dLook().edges === "round" ? size*0.16 : size*0.04; // tiny bevel = sharp; bigger = rounded
    return { geo: d3dRoundedBox(size, bevel, 3), faces, box:true };
  }
  const geo = sides===4 ? new THREE.TetrahedronGeometry(R) : sides===8 ? new THREE.OctahedronGeometry(R)
            : sides===12 ? new THREE.DodecahedronGeometry(R) : new THREE.IcosahedronGeometry(R);
  return { geo, faces: d3dFaceList(geo), box:false };
}
function d3dConvex(geo){
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, map = new Map(), verts = [], idx = [];
  for (let i=0;i<p.count;i++){
    const x=+(p.getX(i)/D3D_SCALE).toFixed(4), y=+(p.getY(i)/D3D_SCALE).toFixed(4), z=+(p.getZ(i)/D3D_SCALE).toFixed(4), k=x+","+y+","+z;
    let id = map.get(k); if (id===undefined){ id = verts.length; map.set(k,id); verts.push(new CANNON.Vec3(x,y,z)); }
    idx.push(id);
  }
  const faces = []; for (let i=0;i<idx.length;i+=3) faces.push([idx[i], idx[i+1], idx[i+2]]);
  return new CANNON.ConvexPolyhedron(verts, faces);
}
const d3dSC = hex => new THREE.Color(hex).convertSRGBToLinear();
// Gem MATCAP — bakes a cut-gem's shading (hot highlight → vibrant coral → deep ruby edge + sparkle) into a
// sphere image. With flat-shaded facets each face samples a different part → reads as a real gem, no refraction.
function d3dGemMatcap(){
  if (d3dGemTex) return d3dGemTex;
  const s = 256, c = document.createElement("canvas"); c.width = c.height = s; const g = c.getContext("2d");
  g.fillStyle = "#1c0402"; g.fillRect(0,0,s,s);
  const rg = g.createRadialGradient(s*0.4,s*0.36,s*0.02, s*0.5,s*0.5,s*0.52);
  rg.addColorStop(0,"#ffe2d2"); rg.addColorStop(0.10,"#ff8a5c"); rg.addColorStop(0.42,"#e8331a"); rg.addColorStop(0.8,"#8c1207"); rg.addColorStop(1,"#360702");
  g.fillStyle = rg; g.beginPath(); g.arc(s/2,s/2,s/2,0,7); g.fill();
  const h = g.createRadialGradient(s*0.68,s*0.72,1, s*0.68,s*0.72,s*0.2); h.addColorStop(0,"rgba(255,225,205,0.85)"); h.addColorStop(1,"rgba(255,225,205,0)");
  g.save(); g.beginPath(); g.arc(s/2,s/2,s/2,0,7); g.clip(); g.fillStyle = h; g.fillRect(0,0,s,s); g.restore();
  d3dGemTex = new THREE.CanvasTexture(c); d3dGemTex.encoding = THREE.sRGBEncoding; return d3dGemTex;
}
// One die surface material, per the chosen preset. stone = baked mottled texture; crystal = baked gem matcap
// (both ignore the colour); default/metal/ceramic tint from the brand colour. scene.environment (set in
// d3dEnsure) gives metal/ceramic their reflections. flatShading matches the geometry (faceted polyhedra).
function d3dDieMat(box){
  const lk = d3dLook(), col = d3dSC(lk.color); let m;
  switch (lk.material){
    case "stone":   m = new THREE.MeshStandardMaterial({ map:d3dStoneTexture(), bumpMap:d3dStoneTexture(), bumpScale:0.6, metalness:0.0, roughness:1.0 }); break;
    case "metal":   m = new THREE.MeshStandardMaterial({ color:col, metalness:0.7, roughness:0.32, envMapIntensity:1.0 }); break;
    case "crystal": m = new THREE.MeshMatcapMaterial({ matcap:d3dGemMatcap() }); break;
    case "ceramic": m = new THREE.MeshPhysicalMaterial({ color:col, metalness:0.0, roughness:0.4, clearcoat:1.0, clearcoatRoughness:0.08, envMapIntensity:0.5 }); break;
    default:        m = new THREE.MeshStandardMaterial({ color:col, metalness:0.1, roughness:0.6 });
  }
  m.flatShading = !box; return m;
}
// Orient a face label so its number reads UPRIGHT: +Z along the face normal, +Y along a consistent "up"
// reference (world +Y, or world -Z for the top/bottom faces) — so the up-facing number isn't rotated/mirrored
// (the "trading-card" look). Uses a proper basis matrix rather than setFromUnitVectors (which left roll free).
function d3dLabelQuat(normal){
  const z = normal.clone().normalize();
  const yref = Math.abs(z.y) > 0.92 ? new THREE.Vector3(0,0,-1) : new THREE.Vector3(0,1,0);
  const x = new THREE.Vector3().crossVectors(yref, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
// A per-face orientation frame (tangent,bitangent,normal) — used to compute the icosahedral symmetry that
// shows the rolled value while keeping the STANDARD layout (instead of a value shift, which can't be a real
// rotation of a d20 and so scrambles the arrangement).
function d3dFrameQuat(f){
  const z = f.normal.clone().normalize();
  const t = f.vert.clone().sub(f.centroid); t.addScaledVector(z, -t.dot(z)); t.normalize(); // tangent ⟂ normal
  const y = new THREE.Vector3().crossVectors(z, t).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, y, z));
}
// Standard d20 numbering on whatever faces three gives us: opposite faces sum to 21, and 20 is adjacent to
// 2/8/14 (the canonical arrangement the user cited). Middle band filled deterministically (manufacturers vary
// there — there's no single universal standard beyond the sum-21 + 20-neighbourhood rules).
function d3dD20Layout(faces){
  const N = faces.length, val = new Array(N).fill(0);
  const opp = faces.map((f,i) => { let bi=0, bd=9; faces.forEach((g,j) => { if(j===i)return; const d=f.normal.clone().add(g.normal).length(); if(d<bd){bd=d;bi=j;} }); return bi; });
  const adjOf = i => faces.map((g,j) => ({ j, d:faces[i].normal.dot(g.normal) })).filter(o => o.j!==i).sort((a,b) => b.d-a.d).slice(0,3).map(o => o.j);
  const set = (i,v) => { val[i]=v; val[opp[i]]=21-v; };
  let top=0; faces.forEach((f,i) => { if(f.centroid.y>faces[top].centroid.y) top=i; });
  set(top,20);
  adjOf(top).forEach((fi,k) => set(fi, [2,8,14][k]));
  const pairs=[[3,18],[4,17],[5,16],[6,15],[9,12],[10,11]], rem=[], seen=new Set();
  faces.forEach((f,i) => { if(val[i]===0 && !seen.has(i)){ seen.add(i); seen.add(opp[i]); rem.push(i); } });
  rem.sort((a,b) => Math.atan2(faces[a].centroid.z,faces[a].centroid.x) - Math.atan2(faces[b].centroid.z,faces[b].centroid.x));
  rem.forEach((i,k) => { const lo=pairs[k%pairs.length][0]; const hi=faces[i].centroid.y>=faces[opp[i]].centroid.y?i:opp[i]; set(hi,lo); });
  return val;
}
function d3dMakeDie(sides, value, R, dropped){
  const { geo, faces, box } = d3dBuild(sides, R), grp = new THREE.Group();
  const mesh = new THREE.Mesh(geo, d3dDieMat(box)); mesh.userData.box = box; mesh.castShadow = true; grp.add(mesh); d3dLiveMeshes.push(mesh);
  const labelSize = R * (sides<=6 ? 0.92 : sides<=8 ? 0.78 : sides<=12 ? 0.62 : 0.58), labels = [];
  const std = sides === 20, layout = std ? d3dD20Layout(faces) : null;       // standard layout for the d20
  faces.forEach((f, idx) => {
    const v = std ? layout[idx] : idx + 1, isMax = v === sides, mat = new THREE.MeshBasicMaterial({ transparent:true, depthWrite:false });
    mat.map = (isMax && d3dLogoTex) ? d3dLogoTex : d3dNumTex(v, sides);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(labelSize, labelSize), mat);
    pl.position.copy(f.centroid).addScaledVector(f.normal, R*0.02);
    pl.quaternion.copy(d3dLabelQuat(f.normal)); grp.add(pl);
    const L = { mat, value:v, sides, normal:f.normal.clone() }; labels.push(L); d3dLive.push(L);
  });
  d3dScene.add(grp);
  const d = { grp, mesh, geo, box, R, value, sides, labels, dropped:!!dropped, body:null, scale:0, std };
  if (std){ d.layout = layout; d.normals = faces.map(f => f.normal.clone()); d.frames = faces.map(d3dFrameQuat); }
  return d;
}
function d3dAttachBody(d){
  const hb = d.R*0.7/D3D_SCALE, shape = d.box ? new CANNON.Box(new CANNON.Vec3(hb,hb,hb)) : d3dConvex(d.geo);
  const body = new CANNON.Body({ mass:1, material:d3dMatDie }); body.addShape(shape);
  body.linearDamping = 0.1; body.angularDamping = 0.22; body.allowSleep = true; body.sleepSpeedLimit = 0.6; body.sleepTimeLimit = 0.08;
  d.body = body; d3dWorld.addBody(body); return body;
}

// ---- lazy init ------------------------------------------------------------------------------------
function d3dEnsure(){
  if (d3dReady) return true; if (d3dDead) return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;z-index:400;pointer-events:none"; // above content + rolls
    document.body.appendChild(canvas);
    d3dRenderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
    d3dRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    d3dRenderer.shadowMap.enabled = true; d3dRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    d3dRenderer.outputEncoding = THREE.sRGBEncoding;
    d3dScene = new THREE.Scene(); d3dUP = new THREE.Vector3(0,1,0);
    d3dCamera = new THREE.OrthographicCamera(-1,1,1,-1,1,6000);
    d3dCamera.position.set(0,2000,0); d3dCamera.up.set(0,0,-1); d3dCamera.lookAt(0,0,0);
    d3dScene.add(new THREE.AmbientLight(0xfff1ea, 0.62));
    d3dKey = new THREE.DirectionalLight(0xffffff, 0.6); d3dKey.castShadow = true;
    d3dKey.shadow.mapSize.set(2048,2048); d3dKey.shadow.bias = -0.0008; d3dScene.add(d3dKey); d3dScene.add(d3dKey.target);
    const fill = new THREE.DirectionalLight(0xffd9c2, 0.28); fill.position.set(-400,500,-300); d3dScene.add(fill);
    // Soft studio environment (image-based light) — matches the spike's lighting so the stone reads as the
    // lighter coral the user approved (without it the stone renders darker/more orange).
    try {
      const ec = document.createElement("canvas"); ec.width = 256; ec.height = 128; const eg = ec.getContext("2d");
      const grd = eg.createLinearGradient(0,0,0,128); grd.addColorStop(0,"#7c869c"); grd.addColorStop(0.55,"#aab1c2"); grd.addColorStop(1,"#2b303e");
      eg.fillStyle = grd; eg.fillRect(0,0,256,128);
      const rg = eg.createRadialGradient(80,26,2,80,26,80); rg.addColorStop(0,"#ffffff"); rg.addColorStop(1,"rgba(255,255,255,0)"); eg.fillStyle = rg; eg.fillRect(0,0,256,128);
      const et = new THREE.CanvasTexture(ec); et.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(d3dRenderer); pm.compileEquirectangularShader();
      d3dScene.environment = pm.fromEquirectangular(et).texture; et.dispose();
    } catch (e) {}
    d3dGround = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.ShadowMaterial({ opacity:0.3 }));
    d3dGround.rotation.x = -Math.PI/2; d3dGround.receiveShadow = true; d3dScene.add(d3dGround);
    d3dWorld = new CANNON.World(); d3dWorld.gravity.set(0,-D3D_GRAV,0); d3dWorld.allowSleep = true;
    d3dWorld.broadphase = new CANNON.NaiveBroadphase(); d3dWorld.solver.iterations = 14;
    d3dMatDie = new CANNON.Material("d"); d3dMatFloor = new CANNON.Material("f"); d3dMatWall = new CANNON.Material("w");
    d3dWorld.addContactMaterial(new CANNON.ContactMaterial(d3dMatFloor, d3dMatDie, { friction:0.45, restitution:0.18 }));
    d3dWorld.addContactMaterial(new CANNON.ContactMaterial(d3dMatWall, d3dMatDie, { friction:0.0, restitution:0.45 }));
    d3dWorld.addContactMaterial(new CANNON.ContactMaterial(d3dMatDie, d3dMatDie, { friction:0.06, restitution:0.16 }));
    const floor = new CANNON.Body({ mass:0, material:d3dMatFloor, shape:new CANNON.Plane() });
    floor.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2); d3dWorld.addBody(floor);
    // Four walls; normals must point INWARD or cannon ejects the dice (a bug from the spike).
    const mk = () => { const bd = new CANNON.Body({ mass:0, material:d3dMatWall, shape:new CANNON.Plane() }); d3dWorld.addBody(bd); return bd; };
    const wL=mk(), wR=mk(), wF=mk(), wB=mk();
    wL.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),  Math.PI/2);
    wR.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), -Math.PI/2);
    wF.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),  Math.PI);
    d3dWalls = [wL,wR,wF,wB];
    addEventListener("resize", d3dResize); d3dResize();
    d3dLoadLogo();
    // Vecna bakes into the number textures only once it's loaded — re-bake the cache + live labels when ready.
    if (document.fonts && document.fonts.load){
      document.fonts.load("700 118px Vecna").then(() => {
        if (!document.fonts.check("700 118px Vecna")) return;
        d3dTexCache.clear();
        d3dLive.forEach(L => { if (!(L.value === L.sides && d3dLogoTex)){ L.mat.map = d3dNumTex(L.value, L.sides); L.mat.needsUpdate = true; } });
      }).catch(() => {});
    }
    d3dBuildCard();
    d3dReady = true; return true;
  } catch (e){ d3dDead = true; return false; }
}
// The result alert — total + label + auto-dismiss timer bar + a ghost reroll button. Hovering pauses the
// timer (so the dice persist as long as it's up). z above the dice canvas and the roll log.
function d3dBuildCard(){
  const el = document.createElement("div"); el.id = "d3dCard";
  el.innerHTML = '<div class="d3dc-text"></div>'
    + '<button class="d3dc-rr" title="Reroll" aria-label="Reroll">'
    + '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button>'
    + '<div class="d3dc-bar"></div>';
  document.body.appendChild(el); d3dCardEl = el;
  el.addEventListener("pointerenter", () => { if (d3dRoll) d3dRoll.paused = true; });
  el.addEventListener("pointerleave", () => { if (d3dRoll) d3dRoll.paused = false; });
  el.querySelector(".d3dc-rr").addEventListener("click", e => { e.stopPropagation(); d3dReroll(); });
}
function d3dShowCard(){
  if (!d3dCardEl || !d3dRoll) return; const d = d3dRoll.desc || {};
  // Same wording as the original roll toast.
  const txt = (typeof naturalRollText === "function")
    ? naturalRollText(d.label, d.type, d.total, d.dmgType, d.abil)
    : (typeof esc === "function" ? esc(d.label || "Roll") : (d.label || "Roll")) + ": " + (d.total != null ? d.total : "");
  d3dCardEl.querySelector(".d3dc-text").innerHTML = txt;
  d3dCardEl.querySelector(".d3dc-bar").style.width = "100%";
  d3dCardEl.classList.add("show");
}
function d3dHideCard(){ if (d3dCardEl) d3dCardEl.classList.remove("show"); }
function d3dReroll(){ const d = d3dRoll && d3dRoll.desc; if (d && typeof doRoll === "function"){ d3dClear(); doRoll(d.formula, d.opts || {}, d.meta || {}); } }
// Dim the dice dropped by advantage/disadvantage so the kept one reads as selected.
function d3dDimDropped(){
  if (!d3dRoll) return;
  d3dRoll.dice.forEach(d => { if (!d.dropped) return;
    d.mesh.material.transparent = true; d.mesh.material.opacity = 0.2; d.mesh.material.depthWrite = false; d.mesh.material.needsUpdate = true;
    d.labels.forEach(L => { L.mat.opacity = 0.28; });
  });
}
function d3dResize(){
  d3dW = innerWidth; d3dH = innerHeight;
  d3dRenderer.setSize(d3dW, d3dH);
  d3dCamera.left = -d3dW/2; d3dCamera.right = d3dW/2; d3dCamera.top = d3dH/2; d3dCamera.bottom = -d3dH/2; d3dCamera.updateProjectionMatrix();
  d3dGround.scale.set(d3dW*2, d3dH*2, 1);
  const span = Math.max(d3dW, d3dH);
  d3dKey.position.set(span*0.28, span*0.9, -span*0.2); d3dKey.target.position.set(0,0,0);
  const s = d3dKey.shadow.camera; s.left=-span; s.right=span; s.top=span; s.bottom=-span; s.near=1; s.far=span*3; s.updateProjectionMatrix();
  if (d3dWalls.length){ d3dWalls[0].position.set(-d3dW/2/D3D_SCALE,0,0); d3dWalls[1].position.set(d3dW/2/D3D_SCALE,0,0); d3dWalls[2].position.set(0,0,d3dH/2/D3D_SCALE); d3dWalls[3].position.set(0,0,-d3dH/2/D3D_SCALE); }
}
function d3dToWorld(sx, sy){
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(sx/d3dW*2-1, -(sy/d3dH*2-1)), d3dCamera);
  const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0), out = new THREE.Vector3(); ray.ray.intersectPlane(plane, out); return out;
}

// ---- the roll -------------------------------------------------------------------------------------
function d3dAtRest(d){
  if (!d.body) return true;
  if (d.body.sleepState === CANNON.Body.SLEEPING) return true;
  return d.body.position.y < (d.R/D3D_SCALE)*1.45 && d.body.velocity.lengthSquared() < 0.5 && d.body.angularVelocity.lengthSquared() < 1.0;
}
function d3dPreSim(dice){
  const MAX = 300; let restRun = 0, n = 0;
  for (; n < MAX; n++){ d3dWorld.step(1/60); if (dice.every(d3dAtRest)){ if (++restRun >= 8){ n++; break; } } else restRun = 0; }
  return n;
}
function d3dResetBody(b, s){
  b.position.copy(s.p); b.quaternion.copy(s.q); b.velocity.copy(s.v); b.angularVelocity.copy(s.av);
  ["previousPosition","interpolatedPosition","initPosition"].forEach(k => { if (b[k]) b[k].copy(s.p); });
  ["previousQuaternion","interpolatedQuaternion","initQuaternion"].forEach(k => { if (b[k]) b[k].copy(s.q); });
  b.force.set(0,0,0); b.torque.set(0,0,0); b.sleepState = 0; b.timeLastSleepy = 0;
}
const d3dTmpV = () => new THREE.Vector3();
function d3dUpValueBody(d){
  const q = d.body.quaternion, tq = new THREE.Quaternion(q.x,q.y,q.z,q.w), v = new THREE.Vector3();
  let best = -2, val = d.labels[0].value;
  d.labels.forEach(L => { v.copy(L.normal).applyQuaternion(tq); if (v.y > best){ best = v.y; val = L.value; } });
  return val;
}
// Paint the rolled value onto the up-facing face after the pre-roll. d20 = symmetry permutation (keeps the
// standard layout intact); other dice = simple value shift (their layout isn't user-scrutinised).
function d3dRelabel(d){
  if (d.std){
    const q = d.body.quaternion, tq = new THREE.Quaternion(q.x,q.y,q.z,q.w);
    let Fup = 0, best = -2;
    d.normals.forEach((nm,i) => { const y = nm.clone().applyQuaternion(tq).y; if (y > best){ best = y; Fup = i; } });
    const Ftar = d.layout.indexOf(d.value); if (Ftar < 0) return;
    const S = d.frames[Ftar].clone().multiply(d.frames[Fup].clone().invert()); // symmetry mapping Fup→Ftar
    d.labels.forEach((L,i) => {
      const sn = d.normals[i].clone().applyQuaternion(S); let bi = i, bd = -2;
      d.normals.forEach((nm,j) => { const dot = sn.dot(nm); if (dot > bd){ bd = dot; bi = j; } });
      const nv = d.layout[bi]; L.value = nv; L.mat.map = (nv===d.sides && d3dLogoTex) ? d3dLogoTex : d3dNumTex(nv, d.sides); L.mat.needsUpdate = true;
    });
  } else {
    const off = d.value - d3dUpValueBody(d);
    d.labels.forEach(L => { const nv = ((L.value-1+off)%d.sides + d.sides)%d.sides + 1; L.value = nv; L.mat.map = (nv===d.sides && d3dLogoTex) ? d3dLogoTex : d3dNumTex(nv, d.sides); L.mat.needsUpdate = true; });
  }
}
function d3dClear(){
  if (d3dRoll){ d3dRoll.dice.forEach(d => { d3dScene.remove(d.grp); if (d.body) d3dWorld.removeBody(d.body); }); }
  d3dRoll = null; d3dLive = []; d3dLiveMeshes = []; d3dHideCard();
  if (d3dRenderer) d3dRenderer.clear();
}
// Re-skin the dice currently on screen when the look settings change (so the Settings preview updates live);
// future rolls pick up the new look automatically since d3dMakeDie reads settings each time.
function d3dApplyLook(){
  if (!d3dReady || !d3dLiveMeshes.length) return;
  d3dLiveMeshes.forEach(mesh => { const nm = d3dDieMat(mesh.userData.box); if (mesh.material.dispose) mesh.material.dispose(); mesh.material = nm; });
  if (d3dRoll) d3dDimDropped();
  if (d3dRenderer && d3dScene && d3dCamera) d3dRenderer.render(d3dScene, d3dCamera);
}
function d3dSyncMeshes(){
  d3dRoll.dice.forEach(d => { if (d.body){ const p=d.body.position, q=d.body.quaternion; d.grp.position.set(p.x*D3D_SCALE,p.y*D3D_SCALE,p.z*D3D_SCALE); d.grp.quaternion.set(q.x,q.y,q.z,q.w); } });
}
// Public entry — engine.js doRoll calls this with a descriptor {formula,parts,total,label,type,dmgType,abil,opts,meta}.
// Returns true if it took over the notification (so doRoll skips its toast).
function rollDice3D(desc){
  if (typeof THREE === "undefined" || typeof CANNON === "undefined") return false;   // libs absent (jsdom)
  try { if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false; } catch (e) {}
  const plan = d3dParse(desc && desc.parts); if (!plan.length) return false;
  if (!d3dEnsure()) return false;
  d3dClear();
  const R = Math.max(20, Math.min(50, Math.round(Math.min(d3dW, d3dH) / (plan.length<=2?9:plan.length<=6?11:plan.length<=12?14:17))));
  const c = d3dToWorld(d3dPX || d3dW/2, d3dPY || d3dH/2);
  const dice = plan.map(p => d3dMakeDie(p.sides, p.value, R, p.dropped));
  // spawn grid above the cursor (overlapping bodies make cannon explode), clamped inside the walls
  const Rp = R/D3D_SCALE, cell = Rp*2.4, cols = Math.ceil(Math.sqrt(dice.length)), rows = Math.ceil(dice.length/cols);
  const cx = c.x/D3D_SCALE, cz = c.z/D3D_SCALE, bx = (d3dW/2 - R)/D3D_SCALE, bz = (d3dH/2 - R)/D3D_SCALE;
  dice.forEach((d, i) => {
    d3dAttachBody(d);
    const col = i%cols, rw = Math.floor(i/cols), gx = (col-(cols-1)/2)*cell, gz = (rw-(rows-1)/2)*cell;
    d.body.position.set(d3dCl(cx+gx,-bx,bx), Rp*1.7 + rw*Rp*0.6 + Math.random()*Rp*0.6, d3dCl(cz+gz,-bz,bz));
    d.body.quaternion.setFromEuler(Math.random()*6.28, Math.random()*6.28, Math.random()*6.28);
    const ox = gx||(Math.random()-0.5), oz = gz||(Math.random()-0.5), ol = Math.hypot(ox,oz)||1, sp = 6 + Math.random()*5;
    d.body.velocity.set(ox/ol*sp, 1.5+Math.random()*3, oz/ol*sp);
    d.body.angularVelocity.set((Math.random()-0.5)*22, (Math.random()-0.5)*22, (Math.random()-0.5)*22);
    d.body.wakeUp(); d.init = { p:d.body.position.clone(), q:d.body.quaternion.clone(), v:d.body.velocity.clone(), av:d.body.angularVelocity.clone() };
  });
  // deterministic pre-roll → paint the value onto the face that lands up → reset & replay (no settle flip)
  const N = d3dPreSim(dice);
  dice.forEach(d => { d3dRelabel(d); d3dResetBody(d.body, d.init); });
  d3dRoll = { dice, state:"fly", t:0, acc:0, replayN:N, played:0, paused:false, desc:desc || {} };
  d3dPrev = performance.now();
  if (!d3dLooping){ d3dLooping = true; requestAnimationFrame(d3dLoop); }
  return true;
}
function d3dLoop(now){
  const dt = Math.min(0.033, (now - d3dPrev)/1000); d3dPrev = now;
  if (d3dRoll){
    const r = d3dRoll;
    if (r.state === "fly"){
      r.t += dt*1000; r.acc += dt;
      while (r.acc >= 1/60 && r.played < r.replayN){ d3dWorld.step(1/60); r.acc -= 1/60; r.played++; }
      r.dice.forEach(d => d.scale += (1 - d.scale) * Math.min(1, dt*12));
      d3dSyncMeshes();
      if (r.played >= r.replayN){ r.dice.forEach(d => { if (d.body){ d3dWorld.removeBody(d.body); d.body = null; } }); r.state = "still"; r.t = 0; d3dDimDropped(); d3dShowCard(); }
    } else if (r.state === "still"){
      if (!r.paused) r.t += dt*1000;                                   // hovering the card pauses the dismiss
      if (d3dCardEl) d3dCardEl.querySelector(".d3dc-bar").style.width = (100 * (1 - d3dCl(r.t/D3D_DWELL,0,1))) + "%";
      if (r.t >= D3D_DWELL){ r.state = "vanish"; r.t = 0; d3dHideCard(); }
    } else if (r.state === "vanish"){
      r.t += dt*1000; const k = d3dCl(r.t/D3D_VANISH, 0, 1);
      r.dice.forEach(d => {
        if (k < 0.16){ d.scale = 1 + 0.1*(1-Math.pow(1-k/0.16,3)); } else { const ss = (k-0.16)/0.84; d.scale = 1.1*(1 - ss*ss*ss*ss); }
        const e = new THREE.Euler(0, 4*dt, 0); d.grp.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));
      });
      if (r.t >= D3D_VANISH){ d3dClear(); }
    }
    if (d3dRoll) d3dRoll.dice.forEach(d => { const s = Math.max(0, d.scale); d.grp.scale.set(s,s,s); });
    d3dRenderer.render(d3dScene, d3dCamera);
    requestAnimationFrame(d3dLoop);
  } else {
    d3dRenderer.render(d3dScene, d3dCamera); // one last clear frame
    d3dLooping = false;                       // idle → stop the loop until the next roll
  }
}

// Debug/preview hook: place a few static dice so the chosen material can be inspected (synthetic pointer
// events in the headless preview clear live rolls, so a real roll can't be screenshotted). window.__d3d.
function d3dShowcase(material){
  if (typeof THREE === "undefined" || typeof CANNON === "undefined") return false;
  if (!d3dEnsure()) return false;
  if (material && state.settings && state.settings.dice3d) state.settings.dice3d.material = material;
  d3dClear();
  const R = 64, spec = [[20,20],[6,6],[8,8]], xs = [-150,0,150];
  const dice = spec.map((p,i) => { const d = d3dMakeDie(p[0], p[1], R, false); d.scale = 1; d.grp.position.set(xs[i],0,0); d.grp.quaternion.setFromEuler(new THREE.Euler(-0.62, 0.6 + i*0.4, 0.18)); return d; });
  d3dRoll = { dice, state:"show", t:0, paused:true, desc:{} };
  if (d3dRenderer) d3dRenderer.render(d3dScene, d3dCamera);
  if (!d3dLooping){ d3dLooping = true; requestAnimationFrame(d3dLoop); }
  return true;
}
if (typeof window !== "undefined") window.__d3d = { showcase:d3dShowcase, clear:() => d3dClear(), look:d3dLook, applyLook:d3dApplyLook };
