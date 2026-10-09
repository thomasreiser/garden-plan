import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as L from './layout.js';
import { buildWhimsical } from './scenes/whimsical.js';
import { diningSet } from './furniture.js';

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9d3dc);
scene.fog = new THREE.Fog(0xc9d3dc, 60, 180);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 500);

const hemi = new THREE.HemisphereLight(0xe4ecf5, 0x5a6b45, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e0, 1.7);
sun.position.set(-25, 35, 30); // south-west afternoon sun
sun.target.position.set(5, 0, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// ---------- textures ----------
function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function noise(ctx, s, base, spread, n) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) {
    const v = (Math.random() - 0.5) * spread;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 200 : 0},${Math.abs(v)})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 3);
  }
}

// Tiles: one texture repeat = `tileW × tileH` metres per tile, drawn as a grid of joints.
function tileTexture(base, joint, cols, rows, jitter) {
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = joint; ctx.fillRect(0, 0, s, s);
    const w = s / cols, h = s / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const off = (r % 2) * w * 0.5;
      const shade = 1 + (Math.random() - 0.5) * jitter;
      const col = new THREE.Color(base).multiplyScalar(shade);
      ctx.fillStyle = `#${col.getHexString()}`;
      ctx.fillRect(c * w + off + 2, r * h + 2, w - 4, h - 4);
      if (off) ctx.fillRect(off - w + 2, r * h + 2, w - 4, h - 4);
    }
  });
}

const tex = {
  grass: canvasTexture(256, (c, s) => noise(c, s, '#5f8a3a', 0.25, 6000), 1, 1),
  terrace: tileTexture('#d9d6cf', '#b8b4ab', 2, 4, 0.06),   // large light tiles, ~0.6 × 1.2 m (guess)
  pavers: tileTexture('#9c9d9b', '#7e7f7d', 2, 8, 0.18),    // grey-white mottled pavers
  chips: canvasTexture(256, (c, s) => noise(c, s, '#8a6a45', 0.6, 9000)),
  gravel: canvasTexture(256, (c, s) => noise(c, s, '#a59f90', 0.5, 9000)),
};

const mat = {
  grass: new THREE.MeshStandardMaterial({ map: tex.grass, roughness: 1 }),
  meadow: new THREE.MeshStandardMaterial({ color: 0x75864f, roughness: 1 }),
  terrace: new THREE.MeshStandardMaterial({ map: tex.terrace, roughness: 0.85 }),
  pavers: new THREE.MeshStandardMaterial({ map: tex.pavers, roughness: 0.9 }),
  chips: new THREE.MeshStandardMaterial({ map: tex.chips, roughness: 1 }),
  gravel: new THREE.MeshStandardMaterial({ map: tex.gravel, roughness: 1 }),
  asphalt: new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.95 }),
  render: new THREE.MeshStandardMaterial({ color: 0xdedad5, roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x3b3e42, roughness: 0.8 }),
  soffit: new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.9 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x33373b, roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x1d2730, roughness: 0.1, metalness: 0.6 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xb3b1ab, roughness: 0.95 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.55, metalness: 0.4 }),
  fence: new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.55 }),
  fencePost: new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.6, metalness: 0.3 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xa47c4e, roughness: 0.85 }),
  slide: new THREE.MeshStandardMaterial({ color: 0xb5b89a, roughness: 0.5 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xe8e3d6, roughness: 0.9 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 1 }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x6f8a46, roughness: 1, flatShading: true }),
  leavesAutumn: new THREE.MeshStandardMaterial({ color: 0xb08a3c, roughness: 1, flatShading: true }),
  pine: new THREE.MeshStandardMaterial({ color: 0x3f5536, roughness: 1, flatShading: true }),
  hedge: new THREE.MeshStandardMaterial({ color: 0x5d7340, roughness: 1, flatShading: true }),
  shutter: new THREE.MeshStandardMaterial({ map: canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#4b4f53'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#3a3d40';
    for (let y = 0; y < s; y += 8) ctx.fillRect(0, y, s, 2);
  }), roughness: 0.6 }),
  ghost: new THREE.MeshStandardMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.18, depthWrite: false }),
  ghostEdge: new THREE.LineBasicMaterial({ color: 0x2f6fd0 }),
};

// ---------- helpers ----------
// Everything is added to `parent`: the scene for shared geometry, or a per-variant group.
let parent = scene;
function inGroup(group, fn) { const prev = parent; parent = group; try { fn(); } finally { parent = prev; } }

function add(mesh, { cast = true, receive = true } = {}) {
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function box(x0, x1, y0, y1, z0, z1, material, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return add(m, opts);
}

// Flat ground patch with a world-scale texture (texture repeats every `tile` metres).
function patch(r, y, material, tile = 1) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * d / tile);
  const m = new THREE.Mesh(g, material);
  m.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
  return add(m, { cast: false });
}

// ---------- ground ----------
const P = L.plot;
patch({ x0: -80, x1: 90, z0: -80, z1: 90 }, -0.02, mat.meadow, 4);
patch({ x0: P.west, x1: P.east, z0: P.north, z1: P.south }, 0, mat.grass, 2);

// Terrain behind the retaining wall is higher (photos): raise the strip west and south-west.
const lw = L.boundary.lWallHeight;
box(-40, P.west - 0.2, -0.02, lw, -40, 45, mat.meadow, { cast: false });
box(P.west - 0.2, L.boundary.lWallSouthUntilX, -0.02, lw, P.south + 0.2, 45, mat.meadow, { cast: false });

patch(L.terrace, 0.04, mat.terrace, 2.4);
box(L.terrace.x0, L.terrace.x1, -0.1, 0.035, L.terrace.z0, L.terrace.z1, mat.concrete, { cast: false });
for (const p of L.paths) patch(p, 0.03, mat.pavers, 1.6);
patch(L.front.paving, 0.03, mat.pavers, 1.6);
patch(L.front.lawnBox, 0.04, mat.grass, 2);
patch(L.front.carportGap, 0.03, mat.pavers, 1.6);
patch({ x0: L.carport.x0, x1: L.carport.x1, z0: L.carport.z0, z1: L.carport.z1 }, 0.02, mat.gravel, 2);

// Street, directly at the plot edge.
const S = L.street;
patch({ x0: S.x0, x1: S.x1, z0: -80, z1: 90 }, 0.01, mat.asphalt, 4);

// Wood-chip play area (quarter circle) with black edging.
{
  const pa = L.playArea;
  const g = new THREE.CircleGeometry(pa.r, 48, 0, Math.PI / 2); // quadrant north-east of the corner
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * pa.r, uv.getY(i) * pa.r);
  const m = add(new THREE.Mesh(g, mat.chips), { cast: false });
  m.position.set(pa.cx, 0.05, pa.cz);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(pa.r, 0.03, 4, 64, Math.PI / 2), mat.metal);
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(pa.cx, 0.06, pa.cz);
  edge.scale.z = 3;
  add(edge);
}

// ---------- house ----------
const H = L.house;
const W = H.z1 - H.z0, Lh = H.x1 - H.x0;
{
  const shape = new THREE.Shape([
    new THREE.Vector2(0, 0), new THREE.Vector2(W, 0), new THREE.Vector2(W, H.eaveHeight),
    new THREE.Vector2(W / 2, H.ridgeHeight), new THREE.Vector2(0, H.eaveHeight),
  ]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Lh, bevelEnabled: false });
  const m = new THREE.Mesh(g, mat.render);
  m.rotation.y = -Math.PI / 2; // shape x → world z, extrusion → world -x
  m.position.set(H.x1, 0, H.z0);
  add(m);

  // roof slabs
  const pitch = Math.atan((H.ridgeHeight - H.eaveHeight) / (W / 2));
  const run = W / 2 + H.overhang;
  const slope = run / Math.cos(pitch);
  const t = 0.28;
  for (const side of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(Lh + 2 * H.overhang, t, slope), mat.roof);
    slab.rotation.x = side === -1 ? -pitch : pitch;
    const zc = H.z0 + W / 2 + side * run / 2;
    const yc = H.ridgeHeight - (run / 2) * Math.tan(pitch) + t / 2 / Math.cos(pitch);
    slab.position.set((H.x0 + H.x1) / 2, yc, zc);
    add(slab);
  }
  // white fascia boards along eaves
  for (const z of [H.z0 - H.overhang, H.z1 + H.overhang]) {
    box(H.x0 - H.overhang, H.x1 + H.overhang, H.eaveHeight - H.overhang * Math.tan(pitch) - 0.2,
      H.eaveHeight - H.overhang * Math.tan(pitch) + 0.1, z - 0.03, z + 0.03, mat.soffit);
  }
  // downpipes at the corners
  for (const [x, z] of [[H.x0 + 0.15, H.z0 - 0.12], [H.x1 - 0.15, H.z0 - 0.12], [H.x0 + 0.15, H.z1 + 0.12], [H.x1 - 0.15, H.z1 + 0.12]]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H.eaveHeight - 0.4), new THREE.MeshStandardMaterial({ color: 0x9da0a2, metalness: 0.6, roughness: 0.4 }));
    pipe.position.set(x, (H.eaveHeight - 0.4) / 2, z);
    add(pipe);
  }

  // openings: glass panel slightly proud of the wall + frame
  const depth = 0.06;
  function opening(wall, o) {
    const w = o.b - o.a, y0 = o.sill, y1 = o.sill + o.h;
    const along = (o.a + o.b) / 2;
    // rotY turns the group's +z (where the sill sits) to face outward
    let x, z, rotY;
    if (wall === 'north') { x = H.x0 + along; z = H.z0 - depth / 2; rotY = Math.PI; }
    if (wall === 'south') { x = H.x0 + along; z = H.z1 + depth / 2; rotY = 0; }
    if (wall === 'west') { x = H.x0 - depth / 2; z = H.z0 + along; rotY = -Math.PI / 2; }
    if (wall === 'east') { x = H.x1 + depth / 2; z = H.z0 + along; rotY = Math.PI / 2; }
    const grp = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, o.h, depth), mat.frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, o.h - 0.12, depth + 0.01), o.shutter ? mat.shutter : mat.glass);
    grp.add(frame, glass);
    if (o.door && w > 1.5) grp.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, o.h - 0.1, depth + 0.02), mat.frame));
    if (o.sill > 0.3) { // window sill
      const s = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.04, 0.16), mat.metal);
      s.position.set(0, -o.h / 2 - 0.02, 0.06);
      grp.add(s);
    }
    grp.position.set(x, (y0 + y1) / 2, z);
    grp.rotation.y = rotY;
    parent.add(grp);
  }
  for (const [wall, list] of Object.entries(H.openings)) list.forEach(o => opening(wall, o));
}

// ---------- boundary: L-wall + rod-mat fence ----------
// Double-rod mesh fence (Doppelstabmatte): posts every ~2.5 m, vertical rods every 5 cm,
// pairs of horizontal rods every 20 cm. Rods are batched into one InstancedMesh per segment.
const rodGeo = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 4); g.translate(0, 0.5, 0); return g; })();
function fenceSeg(x0, z0, x1, z1, baseY, h, privacy = false) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
  const along = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 0, dz));
  const up = new THREE.Quaternion();
  const mats = [];
  const m4 = (x, y, z, q, sx, sy) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sx));
  for (let d = 0.025; d < len; d += 0.05) mats.push(m4(x0 + dx * d, baseY + 0.04, z0 + dz * d, up, 0.0028, h - 0.06));
  for (let y = baseY + 0.15; y < baseY + h; y += 0.2) {
    for (const off of [-0.009, 0.009]) mats.push(m4(x0 - dz * off, y, z0 + dx * off, along, 0.003, len));
  }
  const im = new THREE.InstancedMesh(rodGeo, mat.fencePost, mats.length);
  mats.forEach((m, i) => im.setMatrixAt(i, m));
  im.castShadow = true;
  parent.add(im);
  if (privacy) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len, h * 0.45, 0.02), mat.fencePost);
    strip.position.set((x0 + x1) / 2, baseY + h * 0.225, (z0 + z1) / 2);
    strip.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    add(strip);
  }
  const n = Math.max(1, Math.round(len / 2.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.08, 0.04), mat.fencePost);
    post.position.set(x0 + (x1 - x0) * t, baseY + (h + 0.08) / 2, z0 + (z1 - z0) * t);
    post.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    add(post);
  }
}
{
  const B = L.boundary;
  // West: L-wall full length, fence on top.
  box(P.west - 0.2, P.west, 0, B.lWallHeight, P.north, P.south, mat.concrete);
  fenceSeg(P.west - 0.1, P.north, P.west - 0.1, P.south, B.lWallHeight, B.fenceHeight);
  // South: L-wall for the western part, then fence with dark privacy strips to the street.
  box(P.west, B.lWallSouthUntilX, 0, B.lWallHeight, P.south, P.south + 0.2, mat.concrete);
  fenceSeg(P.west, P.south + 0.1, B.lWallSouthUntilX, P.south + 0.1, B.lWallHeight, B.fenceHeight, true);
  fenceSeg(B.lWallSouthUntilX, P.south + 0.1, P.east, P.south + 0.1, 0, 1.2, true);
  // North: plain rod-mat fence up to where the driveway starts.
  fenceSeg(P.west, P.north, L.carport.x0, P.north, 0, 1.2);
  // Street side of the south front lawn.
  const fz = L.front.footpathFenceZ;
  fenceSeg(P.east, fz, P.east, P.south, 0, 1.0);
  // Along the footpath, from the street to the house corner (separates it from the south-east lawn).
  fenceSeg(L.house.x1, fz, P.east, fz, 0, 1.0);
  fenceSeg(L.house.x1, L.house.z1 + 1.0, L.house.x1, fz, 0, 1.0);
}

// ---------- garden objects ----------
function ghostBox(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const m = new THREE.Mesh(g, mat.ghost);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), mat.ghostEdge);
  e.position.copy(m.position);
  parent.add(m, e);
}
// Variant layers: things that differ between the status quo and a design scene.
const variants = { status: new THREE.Group(), whimsical: new THREE.Group() };
scene.add(variants.status, variants.whimsical);

for (const b of L.raisedBeds) {
  if (b.planned) inGroup(variants.status, () => ghostBox(b.x0, b.x1, 0, b.h, b.z0, b.z1));
  else box(b.x0, b.x1, 0, b.h, b.z0, b.z1, mat.metal);
}
{
  const hp = L.heatPump;
  box(hp.x - hp.w / 2, hp.x + hp.w / 2, 0.15, 0.15 + hp.h, hp.z, hp.z + hp.d, mat.metal);
  box(hp.x - hp.w / 2 + 0.05, hp.x + hp.w / 2 - 0.05, 0.03, 0.15, hp.z + 0.05, hp.z + hp.d - 0.05, mat.concrete);
}

// Stepping stones along quadratic curves.
for (const s of L.steppingStones) {
  for (let i = 0; i < s.count; i++) {
    const t = s.count > 1 ? i / (s.count - 1) : 1;
    const x = (1 - t) ** 2 * s.from[0] + 2 * (1 - t) * t * s.via[0] + t * t * s.to[0];
    const z = (1 - t) ** 2 * s.from[1] + 2 * (1 - t) * t * s.via[1] + t * t * s.to[1];
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 9), mat.stone);
    st.position.set(x, 0.02, z);
    st.rotation.y = Math.random() * Math.PI;
    st.scale.x = 1.2;
    add(st, { cast: false });
  }
}

// Playhouse (local frame: -x = west, where the slide leaves; -z = north, facing the terrace).
{
  const ph = L.playhouse;
  const c = ph.cabin / 2, t = 0.035;
  const g = new THREE.Group();
  const boards = canvasTexture(512, (ctx, s) => {
    const n = 8; // ~12.5 cm boards per metre
    for (let i = 0; i < n; i++) {
      const col = new THREE.Color(0xc49a63).multiplyScalar(0.85 + Math.random() * 0.25);
      ctx.fillStyle = `#${col.getHexString()}`;
      ctx.fillRect(i * s / n, 0, s / n, s);
      for (let k = 0; k < 40; k++) { // grain
        ctx.fillStyle = `rgba(80,50,20,${Math.random() * 0.12})`;
        ctx.fillRect(i * s / n + Math.random() * s / n, Math.random() * s, 1.5, 20 + Math.random() * 80);
      }
      ctx.fillStyle = 'rgba(40,25,10,0.7)';
      ctx.fillRect(i * s / n, 0, 3, s);
    }
  });
  const wood = new THREE.MeshStandardMaterial({ map: boards, roughness: 0.85, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.85 });
  const part = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };

  // Wall panel `w` wide, `h` high, with rectangular holes [x0, y0, x1, y1] (panel-local, origin bottom-left).
  function wall(w, h, holes) {
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(w, 0), new THREE.Vector2(w, h), new THREE.Vector2(0, h)]);
    for (const [x0, y0, x1, y1] of holes) {
      sh.holes.push(new THREE.Path([new THREE.Vector2(x0, y0), new THREE.Vector2(x0, y1), new THREE.Vector2(x1, y1), new THREE.Vector2(x1, y0)]));
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
    geo.translate(-w / 2, 0, -t / 2);
    return new THREE.Mesh(geo, wood);
  }
  const H = ph.wallH, y0 = ph.deck;
  // north: wide window with a counter; east: small window + flag; south: two windows; west: slide exit
  const walls = [
    { rot: Math.PI, pos: [0, y0, -c + t / 2], holes: [[0.3, 0.5, 1.3, 1.15]] },
    { rot: Math.PI / 2, pos: [c - t / 2, y0, 0], holes: [[0.95, 0.55, 1.4, 1.1]] },
    { rot: 0, pos: [0, y0, c - t / 2], holes: [[0.2, 0.6, 0.6, 1.1], [1.0, 0.6, 1.4, 1.1]] },
    { rot: -Math.PI / 2, pos: [-c + t / 2, y0, 0], holes: [[0.5, 0.0, 1.1, 0.85]] },
  ];
  for (const w of walls) {
    const m = wall(ph.cabin, H, w.holes);
    m.rotation.y = w.rot;
    m.position.set(...w.pos);
    g.add(m);
  }
  // cabin floor, corner trims, counter under the north window
  part(new THREE.BoxGeometry(ph.cabin, 0.06, ph.cabin), trim, 0, y0 - 0.03, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(new THREE.BoxGeometry(0.07, H, 0.07), trim, sx * (c - 0.02), y0 + H / 2, sz * (c - 0.02));
  }
  part(new THREE.BoxGeometry(1.1, 0.04, 0.28), trim, 0, y0 + 0.48, -c - 0.12);
  part(new THREE.BoxGeometry(0.05, 0.12, 0.2), trim, -0.45, y0 + 0.4, -c - 0.08);
  part(new THREE.BoxGeometry(0.05, 0.12, 0.2), trim, 0.45, y0 + 0.4, -c - 0.08);

  // base: board-clad box under the slide side, plus a corner post under the overhang
  const [bx, bz] = ph.base;
  const bxc = -c + bx / 2;
  for (const [rot, x, z, w] of [[0, bxc, bz / 2, bx], [Math.PI, bxc, -bz / 2, bx], [Math.PI / 2, bxc + bx / 2, 0, bz], [-Math.PI / 2, -c, 0, bz]]) {
    const m = wall(w, y0 - 0.03, []);
    m.rotation.y = rot; m.position.set(x, 0, z);
    g.add(m);
  }
  part(new THREE.BoxGeometry(0.09, y0, 0.09), trim, c - 0.08, y0 / 2, c - 0.08);
  part(new THREE.BoxGeometry(0.09, y0, 0.09), trim, c - 0.08, y0 / 2, -c + 0.08);

  // flat roof with a green fringe hanging over the edge
  part(new THREE.BoxGeometry(ph.cabin + 0.16, 0.06, ph.cabin + 0.16), trim, 0, y0 + H + 0.03, 0);
  const fringeTex = canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#3f6b3a';
    ctx.fillRect(0, 0, s, s * 0.35);
    for (let x = 0; x < s; x += 8) {
      ctx.fillStyle = Math.random() < 0.5 ? '#3f6b3a' : '#4f7d43';
      ctx.beginPath(); ctx.moveTo(x, s * 0.3); ctx.lineTo(x + 8, s * 0.3); ctx.lineTo(x + 4, s * (0.7 + Math.random() * 0.3)); ctx.fill();
    }
  }, 6, 1);
  const fringeMat = new THREE.MeshStandardMaterial({ map: fringeTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
  part(new THREE.BoxGeometry(ph.cabin + 0.18, 0.03, ph.cabin + 0.18), new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 1 }), 0, y0 + H + 0.075, 0);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(ph.cabin + 0.18, 0.2), fringeMat);
    const a = i * Math.PI / 2;
    f.position.set(Math.sin(a) * (c + 0.09), y0 + H + 0.0, Math.cos(a) * (c + 0.09));
    f.rotation.y = a;
    g.add(f);
  }

  // pirate flag on the east wall
  const flagTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, s, s * 0.7);
    ctx.fillStyle = '#f2f2f2';
    ctx.lineWidth = 16; ctx.strokeStyle = '#f2f2f2'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(70, 60); ctx.lineTo(186, 150); ctx.moveTo(186, 60); ctx.lineTo(70, 150); ctx.stroke();
    ctx.beginPath(); ctx.arc(128, 90, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(78, 52, 100, 12); ctx.beginPath(); ctx.arc(128, 54, 32, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(113, 92, 9, 0, 7); ctx.arc(143, 92, 9, 0, 7); ctx.fill();
  });
  flagTex.repeat.set(1, 1);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.385), new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.9 }));
  flag.geometry.attributes.uv.array.forEach((v, i, arr) => { if (i % 2) arr[i] = 0.3 + v * 0.7; });
  flag.position.set(c + 0.005, y0 + 0.85, 0.3);
  flag.rotation.y = Math.PI / 2;
  g.add(flag);

  // wavy slide: U-channel swept along a curve in the x-y plane, heading west
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-c, y0 + 0.02, 0), new THREE.Vector3(-c - 0.5, y0 - 0.2, 0),
    new THREE.Vector3(-c - 1.1, y0 - 0.7, 0), new THREE.Vector3(-c - 1.5, y0 - 0.82, 0),
    new THREE.Vector3(-c - 2.0, 0.3, 0), new THREE.Vector3(-c - 2.5, 0.12, 0), new THREE.Vector3(-c - 2.8, 0.14, 0),
  ]);
  const profile = [[-0.27, 0.16], [-0.24, 0.14], [-0.22, 0.02], [0.22, 0.02], [0.24, 0.14], [0.27, 0.16]]; // (side, up)
  const N = 60, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.getPoint(i / N), tg = curve.getTangent(i / N);
    const up = new THREE.Vector3(-tg.y, tg.x, 0).multiplyScalar(Math.sign(tg.x) || 1).normalize();
    for (const [sd, u] of profile) pos.push(p.x + up.x * u, p.y + up.y * u, sd);
  }
  const PL = profile.length;
  for (let i = 0; i < N; i++) for (let j = 0; j < PL - 1; j++) {
    const a = i * PL + j, b = a + PL;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setIndex(idx);
  sg.computeVertexNormals();
  g.add(new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xc2c3a2, roughness: 0.45, side: THREE.DoubleSide })));

  g.traverse(o => { o.castShadow = o.receiveShadow = true; });
  g.position.set(ph.x, 0.05, ph.z);
  parent.add(g);
}

// Future carport: translucent ghost volume.
ghostBox(L.carport.x0, L.carport.x1, 0, L.carport.height, L.carport.z0, L.carport.z1);

// ---------- vegetation ----------
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

function tree(x, z, y = 0, { h = 8, r = 2.5, kind = 'leaf' } = {}) {
  const g = new THREE.Group();
  const trunkH = kind === 'pine' ? h * 0.55 : h * 0.4;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * h / 8, 0.2 * h / 8, trunkH, 6), mat.trunk);
  trunk.position.y = trunkH / 2;
  g.add(trunk);
  if (kind === 'pine') {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(r * 0.7, h * 0.5, 7), mat.pine);
    crown.position.y = trunkH + h * 0.2;
    g.add(crown);
  } else {
    const m = rand() < 0.35 ? mat.leavesAutumn : mat.leaves;
    for (let i = 0; i < 3; i++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.6 + rand() * 0.35), 1), m);
      blob.position.set((rand() - 0.5) * r * 0.8, trunkH + r * 0.5 + rand() * r * 0.8, (rand() - 0.5) * r * 0.8);
      g.add(blob);
    }
  }
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  g.position.set(x, y, z);
  parent.add(g);
}

function youngTree(x, z, y = 0, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 5), mat.trunk);
  trunk.position.y = 0.8;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), mat.leaves);
  crown.position.y = 1.9; crown.scale.y = 1.2;
  g.add(trunk, crown);
  g.traverse(o => { o.castShadow = true; });
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
}
inGroup(variants.status, () => L.youngTrees.forEach(([x, z, scale]) => youngTree(x, z, 0, scale)));
// Existing dining set on the terrace (status quo position: middle of the terrace, along the house).
diningSet(variants.status, -2.4, 4.2, Math.PI / 2);
for (const b of L.raisedBeds) if (b.tree) youngTree((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, b.h);

// Woodland strip west and south of the plot, pines further out (photos).
for (let i = 0; i < 22; i++) { // west: dense
  tree(P.west - 2.5 - rand() * 9, P.north - 6 + rand() * 34, L.boundary.lWallHeight, { h: 7 + rand() * 6, r: 1.1 + rand() * 0.9 });
}
for (let i = 0; i < 6; i++) { // south neighbour: a few, mostly toward the west corner
  tree(P.west - 2 + rand() * 14, P.south + 3 + rand() * 6, L.boundary.lWallHeight, { h: 7 + rand() * 6, r: 1.1 + rand() * 0.9 });
}
for (let i = 0; i < 60; i++) {
  const a = rand() * Math.PI * 2, d = 70 + rand() * 30;
  tree(5 + Math.cos(a) * d, 5 + Math.sin(a) * d, 0, { h: 16 + rand() * 6, r: 3, kind: 'pine' });
}
// Shrubs along the inside of the north fence.
for (let x = P.west + 2; x < L.carport.x0 - 1; x += 2.2 + rand() * 1.5) {
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + rand() * 0.4, 1), mat.hedge);
  s.position.set(x, 0.5, P.north - 1.2);
  add(s);
}

// ---------- labels ----------
const labels = new THREE.Group();
const variantLabels = { status: new THREE.Group(), whimsical: new THREE.Group() };
labels.add(variantLabels.status, variantLabels.whimsical);
scene.add(labels);
function label(text, x, z, y = 0.6, group = labels) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = '600 40px system-ui, sans-serif';
  c.width = ctx.measureText(text).width + 32; c.height = 64;
  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(20,24,28,0.75)';
  ctx.beginPath(); ctx.roundRect(0, 0, c.width, c.height, 14); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 16, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, sizeAttenuation: false }));
  s.scale.set(c.width / 64 * 0.03, 0.03, 1); // constant on-screen size
  s.position.set(x, y, z);
  s.renderOrder = 10;
  group.add(s);
}
label(`Terrace ${(L.terrace.z1 - L.terrace.z0).toFixed(2)} × ${(L.terrace.x1 - L.terrace.x0).toFixed(2)}`, (L.terrace.x0 + L.terrace.x1) / 2, 5, 0.8);
label(`Lawn ${(L.terrace.x0 - P.west).toFixed(2)}`, (P.west + L.terrace.x0) / 2, 2);
label('North lawn', -1, -4, 0.6, variantLabels.status);
label('South lawn 7.00', 6, 14.5, 0.6, variantLabels.status);
label(`Play area r ${L.playArea.r.toFixed(2)}`, P.west + 3.5, P.south - 4);
label('Raised bed', P.west + 1.3, P.north + 0.85, 1.4);
label('Planned bed', P.west + 3.9, P.north + 0.85, 1.4, variantLabels.status);
label('Heat pump', L.heatPump.x, L.heatPump.z + 0.6, 1.5);
label('Future carport', (L.carport.x0 + L.carport.x1) / 2, (L.carport.z0 + L.carport.z1) / 2, 3.2);
label('Driveway', 18.3, -2);
label('Lawn 6.06 × 3.00', 20.3, (L.front.lawnBox.z0 + L.front.lawnBox.z1) / 2, 0.6, variantLabels.status);
label('Footpath 3.00', 18.3, L.front.footpathFenceZ - 1.5);
label('House', 7.4, 5, 10.6);
label('Street', S.x0 + 4, 4, 0.5);
label('N ↑', 5, -10, 0.5);

// ---------- whimsical design ----------
const night = { emissives: [], lights: new THREE.Group() };
scene.add(night.lights);
inGroup(variants.whimsical, () => buildWhimsical({
  THREE, L, mat, add, box, patch, canvasTexture, fenceSeg, tree, youngTree, rand, diningSet,
  parent: variants.whimsical,
  label: (text, x, z, y) => label(text, x, z, y, variantLabels.whimsical),
  night,
}));
// Existing wall lights: by the front door and by the terrace door (the only lights on the house walls).
{
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc46b, emissiveIntensity: 0 });
  night.emissives.push({ mat: lamp, day: 0, night: 2.5 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.22), lamp);
  m.position.set(L.house.x1 + 0.05, 2.35, 6.2); // left of the door seen from the street (photo)
  scene.add(m);
  const pl = new THREE.PointLight(0xffc27a, 4, 7, 2);
  pl.position.set(L.house.x1 + 0.4, 2.3, 6.2);
  night.lights.add(pl);
  // terrace door (west wall, door at 5.30–7.31): light just north of it
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.22), lamp);
  t.position.set(L.house.x0 - 0.05, 2.35, 5.05);
  scene.add(t);
  const tl = new THREE.PointLight(0xffc27a, 4, 7, 2);
  tl.position.set(L.house.x0 - 0.4, 2.3, 5.05);
  night.lights.add(tl);
}

// Existing LED strips set into the lawn along both house paths (both scenes).
{
  const strip = new THREE.MeshStandardMaterial({ color: 0xf3ead8, emissive: 0xffc878, emissiveIntensity: 0 });
  const glowBand = new THREE.MeshBasicMaterial({
    map: canvasTexture(64, (ctx, sz) => {
      const g = ctx.createLinearGradient(0, 0, 0, sz);
      g.addColorStop(0, 'rgba(255,200,120,0)'); g.addColorStop(0.5, 'rgba(255,200,120,0.55)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz);
    }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  night.emissives.push({ mat: strip, day: 0, night: 2 });
  for (const s of L.ledStrips) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0, 0.02, 0.04), strip);
    m.position.set((s.x0 + s.x1) / 2, 0.02, s.z);
    scene.add(m);
    // uniform glow band on the lawn (night only), no individual light pools
    const band = new THREE.Mesh(new THREE.PlaneGeometry(s.x1 - s.x0, 0.7), glowBand);
    band.rotation.x = -Math.PI / 2;
    band.position.set((s.x0 + s.x1) / 2, 0.025, s.z);
    night.lights.add(band);
  }
  // Existing LED strip around the top border of the raised bed.
  for (const b of L.raisedBeds.filter(b => !b.planned && !b.tree)) {
    const y = b.h - 0.03, t = 0.025, o = 0.012;
    for (const [x0, x1, z0, z1] of [[b.x0 - o, b.x1 + o, b.z0 - o, b.z0 - o + t], [b.x0 - o, b.x1 + o, b.z1 + o - t, b.z1 + o],
      [b.x0 - o, b.x0 - o + t, b.z0, b.z1], [b.x1 + o - t, b.x1 + o, b.z0, b.z1]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.02, z1 - z0), strip);
      m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      scene.add(m);
    }
    const pl = new THREE.PointLight(0xffc878, 1.2, 3, 2);
    pl.position.set((b.x0 + b.x1) / 2, b.h + 0.4, (b.z0 + b.z1) / 2);
    night.lights.add(pl);
  }
}

// ---------- scene variant + day/night ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.35, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const state = { variant: 'status', night: false };
const day = { bg: 0xc9d3dc, hemi: 0.75, sun: 1.7 };
function applyState() {
  for (const [k, g] of Object.entries(variants)) g.visible = k === state.variant;
  for (const [k, g] of Object.entries(variantLabels)) g.visible = k === state.variant;
  const n = state.night;
  const bg = n ? 0x0a1224 : day.bg;
  scene.background.setHex(bg);
  scene.fog.color.setHex(bg);
  hemi.intensity = n ? 0.12 : day.hemi;
  hemi.color.setHex(n ? 0x4a5f9a : 0xe4ecf5);
  sun.intensity = n ? 0.18 : day.sun;
  sun.color.setHex(n ? 0x9db4ff : 0xfff3e0);
  bloom.enabled = n;
  night.lights.visible = n;
  // design lights only exist in the design scene
  night.lights.children.forEach(l => { if (l.userData.variant) l.visible = l.userData.variant === state.variant; });
  for (const e of night.emissives) e.mat.emissiveIntensity = n ? e.night : e.day;
  document.querySelectorAll('[data-variant]').forEach(b => b.setAttribute('aria-pressed', b.dataset.variant === state.variant));
  const nb = document.querySelector('#night');
  if (nb) { nb.setAttribute('aria-pressed', n); nb.textContent = n ? '☾ Night' : '☀ Day'; }
}
function setVariant(v) { state.variant = v; applyState(); }
function toggleNight() { state.night = !state.night; applyState(); }
document.querySelectorAll('[data-variant]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); setVariant(b.dataset.variant); }));
document.querySelector('#night')?.addEventListener('click', e => { e.stopPropagation(); toggleNight(); });

// ---------- controls: fly camera ----------
const keys = new Set();
let yaw = 0, pitch = 0;
const look = () => camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

const views = {
  overview: { pos: [26, 26, 34], target: [2, 0, 4] },
  top: { pos: [6.5, 55, 4.8], target: [6.5, 0, 4.7] },
  terrace: { pos: [-4.2, 1.7, 11.2], target: [-3, 1.6, 2] },
  street: { pos: [27, 1.7, 2], target: [10, 3, 4] },
  playarea: { pos: [-0.6, 2.1, 12.4], target: [-5.6, 1.2, 14.2] },
  south: { pos: [11.0, 1.8, 11.3], target: [-5, 1.2, 14.5] },
  north: { pos: [6.2, 1.8, -0.9], target: [-8, 0.8, -5] },
  pavilion: { pos: [6.0, 1.7, 10.6], target: [11, 1.2, 15] },
  mythical: { pos: [14.9, 2.1, 12.5], target: [19, 0.6, 15.3] },
};
function setView(name) {
  const v = views[name];
  camera.position.set(...v.pos);
  const d = new THREE.Vector3(...v.target).sub(camera.position).normalize();
  yaw = Math.atan2(-d.x, -d.z);
  pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
  pitch = Math.max(-Math.PI / 2 + 0.001, pitch);
  look();
}
{
  const parts = location.hash.slice(1).split('&');
  setView(parts.find(p => views[p]) || 'overview');
  if (parts.includes('whimsical')) state.variant = 'whimsical';
  if (parts.includes('night')) state.night = true;
  if (parts.includes('nolabels')) labels.visible = false;
  applyState();
}

const canvas = renderer.domElement;
canvas.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('flying', document.pointerLockElement === canvas);
});
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= e.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  look();
});
addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'KeyL') labels.visible = !labels.visible;
  if (e.code === 'KeyN') toggleNight();
  if (e.code === 'KeyV') setVariant(state.variant === 'status' ? 'whimsical' : 'status');
  const n = { Digit1: 'overview', Digit2: 'top', Digit3: 'terrace', Digit4: 'street', Digit5: 'playarea', Digit6: 'south', Digit7: 'north', Digit8: 'pavilion', Digit9: 'mythical' }[e.code];
  if (n) setView(n);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); setView(b.dataset.view); }));
document.querySelector('#labels')?.addEventListener('click', e => { e.stopPropagation(); labels.visible = !labels.visible; });

// ---------- loop ----------
const clock = new THREE.Clock();
const v = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 12 : 3.5) * dt;
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  v.set(0, 0, 0);
  if (keys.has('KeyW') || keys.has('ArrowUp')) v.add(fwd);
  if (keys.has('KeyS') || keys.has('ArrowDown')) v.sub(fwd);
  if (keys.has('KeyD') || keys.has('ArrowRight')) v.add(right);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) v.sub(right);
  if (keys.has('KeyE') || keys.has('Space')) v.y += 1;
  if (keys.has('KeyQ') || keys.has('KeyC')) v.y -= 1;
  if (v.lengthSq()) camera.position.addScaledVector(v.normalize(), speed);
  camera.position.y = Math.max(0.3, camera.position.y);
  composer.render(dt);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
