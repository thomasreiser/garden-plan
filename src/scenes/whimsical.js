// Whimsical garden design (see concept/paths.html for the plan and numbering).
// Same coordinate system as layout.js: x → east, z → south, y → up, metres.

export function buildWhimsical(ctx) {
  const { THREE, L, mat, add, box, patch, canvasTexture, fenceSeg, youngTree, rand, label, night, parent, diningSet } = ctx;
  const V2 = THREE.Vector2;
  const P = L.plot;
  const dz = P.south - 16.66; // south-border items were laid out for a 5.70 m lawn; they follow the fence

  // ---------- helpers ----------
  // Parse the absolute M/L/C subset of SVG path data (x, z) into a curve.
  function svgCurve(d) {
    const tok = d.match(/[MLC]|-?\d*\.?\d+/g);
    const cp = new THREE.CurvePath();
    let cur, cmd, i = 0;
    const n = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      if (/[MLC]/.test(tok[i])) cmd = tok[i++];
      if (cmd === 'M') cur = new V2(n(), n());
      else if (cmd === 'L') { const p = new V2(n(), n()); cp.add(new THREE.LineCurve(cur, p)); cur = p; }
      else if (cmd === 'C') {
        const a = new V2(n(), n()), b = new V2(n(), n()), p = new V2(n(), n());
        cp.add(new THREE.CubicBezierCurve(cur, a, b, p)); cur = p;
      }
    }
    return cp;
  }

  // Flat strip of `width` following a curve, UVs in metres / tile.
  function ribbon(curve, width, y, material, tile = 1) {
    const len = curve.getLength(), N = Math.max(8, Math.ceil(len / 0.15));
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      const nx = -t.y, nz = t.x;
      pos.push(p.x + nx * width / 2, y, p.y + nz * width / 2, p.x - nx * width / 2, y, p.y - nz * width / 2);
      uv.push(0, u * len / tile, width / tile, u * len / tile);
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return add(new THREE.Mesh(g, material), { cast: false });
  }

  // Batches many small meshes into InstancedMeshes (one per geometry+material).
  const batches = new Map();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function inst(geo, material, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, color) {
    const key = geo.uuid + material.uuid;
    if (!batches.has(key)) batches.set(key, { geo, material, items: [] });
    _q.setFromEuler(_e.set(rx, ry, rz));
    _m.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz));
    batches.get(key).items.push({ m: _m.clone(), color });
  }
  function flushBatches() {
    for (const { geo, material, items } of batches.values()) {
      const im = new THREE.InstancedMesh(geo, material, items.length);
      items.forEach((it, i) => {
        im.setMatrixAt(i, it.m);
        if (it.color !== undefined) im.setColorAt(i, new THREE.Color(it.color));
      });
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = im.receiveShadow = true;
      parent.add(im);
    }
  }
  const r = (a, b) => a + rand() * (b - a);
  const pick = arr => arr[Math.floor(rand() * arr.length)];

  // Emissive material that switches between day and night intensity.
  function glowMat(color, emissive, dayI, nightI, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: dayI, roughness: 0.4, ...extra });
    night.emissives.push({ mat: m, day: dayI, night: nightI });
    return m;
  }
  function lamp(x, y, z, intensity = 4, distance = 6, color = 0xffc27a) {
    const pl = new THREE.PointLight(color, intensity * 0.7, distance, 2);
    pl.position.set(x, y, z);
    pl.userData.variant = 'whimsical';
    night.lights.add(pl);
    return pl;
  }

  // ---------- shared geometry / materials ----------
  const G = {
    blob: new THREE.IcosahedronGeometry(1, 1),
    blobLow: new THREE.IcosahedronGeometry(1, 0),
    sphere: new THREE.SphereGeometry(1, 8, 6),
    cyl: (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 6); g.translate(0, 0.5, 0); return g; })(),
    cone: (() => { const g = new THREE.ConeGeometry(1, 1, 6); g.translate(0, 0.5, 0); return g; })(),
    strand: (() => { const g = new THREE.BoxGeometry(0.05, 1, 0.012); g.translate(0, -0.5, 0); return g; })(),
    stone: new THREE.CylinderGeometry(1, 1, 1, 7),
    bulb: new THREE.SphereGeometry(0.035, 8, 6),
  };
  const M = {
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
    whiteSmooth: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
    bamboo: new THREE.MeshStandardMaterial({ color: 0x7a9a3c, roughness: 0.6 }),
    stem: new THREE.MeshStandardMaterial({ color: 0x4f6e2c, roughness: 0.9 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 1 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.5, metalness: 0.5 }),
    cable: new THREE.LineBasicMaterial({ color: 0x222222 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa47c4e, roughness: 0.8 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x6e4f32, roughness: 0.85 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xb8643f, roughness: 0.85, side: THREE.DoubleSide }),
    stoneGrey: new THREE.MeshStandardMaterial({ color: 0x8f8b80, roughness: 0.95, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: 0xd9f2f2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  };
  const bulbMat = glowMat(0xfff3d6, 0xffc46b, 0.3, 3);
  const lanternMat = glowMat(0xffe2a8, 0xffb347, 0.15, 2.5);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xdcd8cc, roughness: 0.6 });
  const capMat = glowMat(0xf6e7c6, 0xffd38a, 0.0, 2);
  const upMat = glowMat(0x3a3a3a, 0xffd08a, 0.0, 5);

  // ---------- textures ----------
  const mosaicTex = canvasTexture(256, (c, s) => {
    c.fillStyle = '#efe9da'; c.fillRect(0, 0, s, s);
    const cols = ['#3c8fb5', '#e0a43a', '#c2574a', '#4f9a6a', '#8a5fb0', '#e6d38a', '#2f6f8f'];
    const n = 8, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      c.fillRect(i * w + 2, j * w + 2, w - 4, w - 4);
    }
  });
  const checkerTex = canvasTexture(256, (c, s) => {
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i + j) % 2) { c.fillStyle = '#d98b7a'; c.fillRect(i * w, j * w, w, w); c.fillStyle = 'rgba(120,60,50,.25)'; c.fillRect(i * w, j * w, w, 3); }
      else { c.fillStyle = '#5f8a3e'; c.fillRect(i * w, j * w, w, w); for (let k = 0; k < 120; k++) { c.fillStyle = Math.random() < 0.15 ? '#c9a3d8' : '#76a64e'; c.fillRect(i * w + Math.random() * w, j * w + Math.random() * w, 3, 3); } }
    }
  });
  const mossTex = canvasTexture(256, (c, s) => {
    c.fillStyle = '#56733a'; c.fillRect(0, 0, s, s);
    for (let k = 0; k < 4000; k++) { c.fillStyle = Math.random() < 0.5 ? '#6b8a45' : '#45602e'; c.fillRect(Math.random() * s, Math.random() * s, 3, 3); }
  });
  const gravelTex = canvasTexture(256, (c, s) => {
    c.fillStyle = '#cfc8b8'; c.fillRect(0, 0, s, s);
    for (let k = 0; k < 6000; k++) { const v = 150 + Math.random() * 90; c.fillStyle = `rgb(${v},${v - 6},${v - 18})`; c.fillRect(Math.random() * s, Math.random() * s, 3, 3); }
  });
  const shedTex = canvasTexture(256, (c, s) => {
    c.fillStyle = '#3a3d40'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#2b2d30';
    for (let y = 0; y < s; y += 16) c.fillRect(0, y, s, 3);
  });
  const M2 = {
    mosaic: new THREE.MeshStandardMaterial({ map: mosaicTex, roughness: 0.5 }),
    checker: new THREE.MeshStandardMaterial({ map: checkerTex, roughness: 0.9 }),
    moss: new THREE.MeshStandardMaterial({ map: mossTex, roughness: 1 }),
    gravel: new THREE.MeshStandardMaterial({ map: gravelTex, roughness: 1 }),
    shed: new THREE.MeshStandardMaterial({ map: shedTex, roughness: 0.8 }),
  };

  // ---------- plant builders (instanced) ----------
  const GREENS = [0x4e7a32, 0x5b8a3a, 0x6b9a44, 0x46702c];
  function mound(x, z, rad, h = 0.7, color = pick(GREENS), y = 0) {
    inst(G.blob, M.white, x, y + rad * h * 0.6, z, rad, rad * h, rad, 0, rand() * 6, 0, color);
  }
  function bamboo(x, z, rad = 0.6, H = 5.5, y = 0) {
    const n = Math.round(10 + rad * 8);
    for (let k = 0; k < n; k++) {
      const a = rand() * 6.283, d = rad * Math.sqrt(rand()) * 0.75;
      const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
      const h = H * r(0.7, 1.05), lx = r(-0.07, 0.07), lz = r(-0.07, 0.07);
      inst(G.cyl, M.white, cx, y, cz, 0.024, h, 0.024, lx, 0, lz, pick([0x7a9a3c, 0x6e8f34, 0x8aa648]));
      for (let j = 0; j < 5; j++) {
        const hh = h * (0.42 + 0.58 * j / 4), ang = rand() * 6.283, off = r(0.12, 0.38);
        inst(G.blobLow, M.white, cx - Math.sin(lz) * hh + Math.cos(ang) * off, y + hh, cz + Math.sin(lx) * hh + Math.sin(ang) * off,
          r(0.28, 0.42), r(0.16, 0.24), r(0.28, 0.42), 0, rand() * 6, r(-0.4, 0.4), pick([0x5a8a35, 0x6c9c3e, 0x4f7f2f]));
      }
    }
  }
  function tallGrass(x, z, H = 1.8) {
    for (let k = 0; k < 16; k++) {
      const a = rand() * 6.283, t = r(0.08, 0.3);
      inst(G.cone, M.white, x + Math.cos(a) * 0.08, 0, z + Math.sin(a) * 0.08, 0.035, H * r(0.75, 1.05), 0.035, Math.sin(a) * t, 0, -Math.cos(a) * t, pick([0xa9a46a, 0xb8b07a, 0x8d9a55]));
    }
    for (let k = 0; k < 6; k++) inst(G.cone, M.white, x + r(-0.25, 0.25), H * r(0.85, 1.05), z + r(-0.25, 0.25), 0.05, 0.3, 0.05, r(-0.3, 0.3), 0, r(-0.3, 0.3), 0xe7dcc0);
  }
  function spike(x, z, H, color, rad = 0.08, len = 0.5) { // foxglove / hollyhock / lupin
    inst(G.cyl, M.stem, x, 0, z, 0.012, H - len * 0.6, 0.012);
    inst(G.cone, M.white, x, H - len, z, rad, len, rad, 0, 0, 0, color);
    mound(x, z, 0.18, 0.6);
  }
  function allium(x, z, H = 0.85) {
    inst(G.cyl, M.stem, x, 0, z, 0.008, H, 0.008);
    inst(G.sphere, M.white, x, H, z, 0.08, 0.08, 0.08, 0, 0, 0, 0x8d5fc4);
  }
  function lavender(x, z, rad = 0.28, color = 0x8f7fd0) {
    mound(x, z, rad, 0.6, 0x8a9a7a);
    inst(G.sphere, M.white, x, rad * 0.75, z, rad * 0.95, rad * 0.35, rad * 0.95, 0, 0, 0, color);
  }
  function hydrangea(x, z, rad = 0.42) {
    mound(x, z, rad, 0.75, 0x4f7a34);
    for (let k = 0; k < 6; k++) {
      const a = rand() * 6.283, d = rad * r(0.2, 0.75);
      inst(G.sphere, M.white, x + Math.cos(a) * d, rad * r(0.75, 1.05), z + Math.sin(a) * d, 0.12, 0.11, 0.12, 0, 0, 0, pick([0xb9cdf0, 0xdfe7f7, 0xa7bde8]));
    }
  }
  function fern(x, z, rad = 0.3) { mound(x, z, rad, 0.45, pick([0x3f6b2b, 0x4a7a33, 0x5d7f6a])); }
  function flowers(x, z, colors, n = 5, spread = 0.25, h = 0.4) {
    mound(x, z, spread * 0.9, 0.5);
    for (let k = 0; k < n; k++) inst(G.sphere, M.white, x + r(-spread, spread), h * r(0.7, 1.1), z + r(-spread, spread), 0.05, 0.05, 0.05, 0, 0, 0, pick(colors));
  }
  function berryShrub(x, z, rad = 0.4, berry = 0xc8203a) {
    mound(x, z, rad, 0.85, pick([0x4e8a3c, 0x5a9440]));
    for (let k = 0; k < 14; k++) {
      const a = rand() * 6.283, el = r(0.1, 1.2);
      inst(G.sphere, M.white, x + Math.cos(a) * Math.cos(el) * rad * 1.02, rad * 0.85 * 0.6 + Math.sin(el) * rad * 0.7, z + Math.sin(a) * Math.cos(el) * rad * 1.02, 0.03, 0.03, 0.03, 0, 0, 0, berry);
    }
  }
  function rose(x, z, rad = 0.4) {
    mound(x, z, rad, 0.8, 0x3f6b2b);
    for (let k = 0; k < 8; k++) { const a = rand() * 6.283, d = rad * r(0.3, 0.9); inst(G.sphere, M.white, x + Math.cos(a) * d, rad * r(0.7, 1.2), z + Math.sin(a) * d, 0.06, 0.06, 0.06, 0, 0, 0, pick([0xe58fb0, 0xd9668f, 0xf2c1d1])); }
  }

  // ---------- paths ----------
  // A: little-forest path, north lawn (mossy flagstones), plus spur to the house path.
  const pathA = svgCurve('M6.0 -3.5 C5.0 -3.7 4.2 -3.5 3.0 -3.55 C1.8 -3.6 0.4 -3.55 -0.8 -3.2 C-1.6 -2.95 -2.2 -2.8 -2.7 -2.8');
  const spurA = svgCurve('M3.0 -1.25 L3.0 -3.55');
  function flagstones(curve, width, colors, spacing = 0.5) {
    const len = curve.getLength();
    for (let d = 0.2; d < len; d += spacing) {
      const p = curve.getPointAt(d / len), t = curve.getTangentAt(d / len);
      for (const side of [-1, 1]) {
        const off = side * width * 0.22 + r(-0.05, 0.05);
        inst(G.stone, M.white, p.x - t.y * off, 0.025, p.y + t.x * off, r(0.17, 0.24), 0.03, r(0.15, 0.22), 0, rand() * 6, 0, pick(colors));
      }
    }
  }
  const stoneCols = [0xb9b1a0, 0xa8a090, 0xc8c0ae, 0x9f9a8c];
  ribbon(pathA, 0.95, 0.012, M2.moss, 1.2);
  ribbon(spurA, 0.8, 0.012, M2.moss, 1.2);
  flagstones(pathA, 0.95, stoneCols);
  flagstones(spurA, 0.8, stoneCols);

  // C: glow path through the middle of the south lawn (light flagstones on gravel, pale pebble edge).
  const pathC = svgCurve('M-3.6 14.3 C-1.5 13.5 0.5 13.3 2.5 13.7 C4.0 14.0 5.5 13.9 6.6 13.3 C7.2 13.0 7.6 13.0 8.0 13.0 L10.6 13.0 C11.6 13.0 12.2 12.8 12.9 12.3 C13.4 11.9 13.8 11.5 14.3 11.3');
  const linkC = svgCurve('M3.6 13.85 C3.9 12.9 4.3 11.8 4.5 10.96');
  ribbon(pathC, 1.0, 0.012, M2.gravel, 1);
  ribbon(linkC, 0.7, 0.012, M2.gravel, 1);
  flagstones(pathC, 1.0, [0xe4ddcf, 0xd6cfbf, 0xebe5d8], 0.55);
  flagstones(linkC, 0.7, [0xe4ddcf, 0xd6cfbf], 0.55);
  {
    const len = pathC.getLength();
    for (let d = 0; d < len; d += 0.09) {
      const p = pathC.getPointAt(d / len), t = pathC.getTangentAt(d / len);
      for (const side of [-1, 1]) {
        const off = side * (0.5 + r(-0.03, 0.03));
        inst(G.sphere, edgeMat, p.x - t.y * off, 0.02, p.y + t.x * off, r(0.03, 0.05), 0.025, r(0.03, 0.05));
      }
    }
  }

  // Checkerboard patch (pink tiles + thyme) from the south garden door into the round course ring, same pattern.
  const mosaicPath = svgCurve('M14.3 11.3 C14.5 12.2 15.0 12.9 15.8 13.35');
  ribbon(mosaicPath, 0.55, 0.016, M2.checker, 0.9); // #24: small checkerboard patch, pink tiles and thyme
  {
    const g = new THREE.RingGeometry(1.075, 1.625, 72, 1);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 0.9, pos.getZ(i) / 0.9);
    const m = add(new THREE.Mesh(g, M2.checker), { cast: false });
    m.position.set(16.75, 0.016, 14.4);
    ribbon(svgCurve('M18.05 14.4 L18.4 14.4'), 0.55, 0.016, M2.checker, 0.9); // to the greenhouse door
  }

  // Checkerboard patch under the seating nook.
  patch({ x0: 0.2, x1: 2.6, z0: -5.6, z1: -4.0 }, 0.014, M2.checker, 0.9);
  // Shed apron.
  patch({ x0: 6.0, x1: 6.8, z0: -5.1, z1: -1.9 }, 0.03, mat.pavers, 1.6);

  // ---------- structures ----------
  // Garden shed 4.00 × 2.14, doors facing west (concept #14).
  {
    const x0 = 6.8, x1 = 8.94, z0 = -5.5, z1 = -1.5, h = 2.09;
    box(x0, x1, 0, 0.08, z0, z1, new THREE.MeshStandardMaterial({ color: 0xcdbb98 }));
    const body = box(x0 + 0.1, x1 - 0.05, 0.08, h - 0.1, z0 + 0.1, z1 - 0.1, M2.shed);
    body.material.map.repeat.set(2, 2);
    const roof = box(x0 - 0.3, x1 + 0.25, h - 0.12, h, z0 - 0.25, z1 + 0.25, M.darkMetal);
    roof.rotation.z = -0.04; // gentle fall toward the back
    const door = (za, zb, panes) => {
      const w = zb - za, dh = 1.85;
      box(x0 + 0.06, x0 + 0.1, 0.1, 0.1 + dh, za, zb, new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.7 }));
      const rows = 3, cols = panes;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const pz = za + (i + 0.5) * w / cols, py = 1.0 + j * 0.33;
        box(x0 + 0.04, x0 + 0.06, py - 0.13, py + 0.13, pz - w / cols * 0.36, pz + w / cols * 0.36, new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.4, emissive: 0x000000 }));
      }
    };
    door(-5.0, -3.8, 2);
    door(-2.9, -2.2, 1);
    // wall light above the doors
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.25), bulbMat);
    wl.position.set(x0 + 0.05, 2.0, -3.4); add(wl);
    lamp(x0 - 0.4, 1.9, -3.4, 4, 6);
  }

  // Garden doors separating the driveway from the garden (concept #13, #15).
  {
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.6, metalness: 0.3 });
    fenceSeg(9.0, P.north, 9.0, -5.5, 0, 1.2);
    fenceSeg(9.0, -1.5, 9.0, -1.25, 0, 1.2);
    // Gate leaf in the same double-rod mesh (Doppelstabmatte) as the fence: frame, vertical rods
    // every 5 cm, horizontal rod pairs every 20 cm. Runs along z at constant x.
    const gate = (x, za, zb, h) => {
      const w = zb - za, zc = (za + zb) / 2;
      for (const z of [za + 0.02, zb - 0.02]) inst(G.cyl, gateMat, x, 0.04, z, 0.022, h, 0.022); // stiles
      for (const y of [0.06, h + 0.02]) box(x - 0.02, x + 0.02, y, y + 0.04, za, zb, gateMat);    // rails
      for (let z = za + 0.06; z < zb - 0.04; z += 0.05) inst(G.cyl, gateMat, x, 0.08, z, 0.0035, h - 0.06, 0.0035);
      for (let y = 0.25; y < h; y += 0.2) for (const dx of [-0.008, 0.008]) inst(G.cyl, gateMat, x + dx, y, za + 0.02, 0.003, w - 0.04, 0.003, Math.PI / 2, 0, 0);
      box(x - 0.015, x + 0.045, h * 0.5 - 0.05, h * 0.5 + 0.05, zb - 0.12, zb - 0.06, gateMat); // handle/lock
      for (const z of [za - 0.04, zb + 0.04]) inst(G.cyl, gateMat, x, 0, z, 0.04, h + 0.1, 0.04);      // gate posts
      return zc;
    };
    gate(9.0, -1.2, -0.06, 1.2);                               // north gate across the house path
    gate(L.house.x1, L.house.z1 + 0.06, L.house.z1 + 0.94, 1.2); // south gate by the heat pump
    // No lights on the house walls here (only the front door and terrace door have one).
  }

  // Fairy-light arch with climbing rose over the spur (#1).
  {
    const cx = 3.0, cz = -1.9, rad = 0.6, legH = 1.75;
    for (const sx of [-1, 1]) inst(G.cyl, M.darkMetal, cx + sx * rad, 0, cz, 0.022, legH, 0.022);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.022, 6, 24, Math.PI), M.darkMetal);
    arc.position.set(cx, legH, cz); add(arc);
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI * k / 16;
      inst(G.bulb, bulbMat, cx + Math.cos(a) * rad, legH + Math.sin(a) * rad + 0.03, cz + 0.04);
    }
    for (let k = 0; k < 9; k++) inst(G.bulb, bulbMat, cx - rad, 0.25 + k * 0.17, cz + 0.04);
    for (let k = 0; k < 9; k++) inst(G.bulb, bulbMat, cx + rad, 0.25 + k * 0.17, cz + 0.04);
    for (let k = 0; k < 18; k++) { // rose
      const a = Math.PI * rand(), h = rand() < 0.5;
      const px = h ? cx + Math.cos(a) * rad : cx + (rand() < 0.5 ? -rad : rad);
      const py = h ? legH + Math.sin(a) * rad : r(0.3, legH);
      inst(G.blob, M.white, px, py, cz + r(-0.08, 0.08), 0.13, 0.11, 0.1, 0, rand() * 6, 0, 0x3f6b2b);
      if (rand() < 0.7) inst(G.sphere, M.white, px + r(-0.06, 0.06), py + 0.05, cz + r(-0.1, 0.1), 0.045, 0.045, 0.045, 0, 0, 0, pick([0xe58fb0, 0xf2c1d1]));
    }
    lamp(cx, legH + 0.3, cz, 3, 5);
  }

  // Wooden pavilion 3 × 3, open toward the house (#18).
  {
    const x0 = 7.8, x1 = 10.8, z0 = 12.2 + dz, z1 = 15.2 + dz, ph = 2.35;
    box(x0, x1, 0, 0.14, z0, z1, M.wood);
    for (const [x, z] of [[x0 + 0.08, z0 + 0.08], [x1 - 0.08, z0 + 0.08], [x0 + 0.08, z1 - 0.08], [x1 - 0.08, z1 - 0.08]]) box(x - 0.07, x + 0.07, 0.14, ph, z - 0.07, z + 0.07, M.woodDark);
    for (const z of [z0 + 0.08, z1 - 0.08]) box(x0, x1, ph - 0.18, ph, z - 0.06, z + 0.06, M.woodDark);
    for (const x of [x0 + 0.08, x1 - 0.08]) box(x - 0.06, x + 0.06, ph - 0.18, ph, z0, z1, M.woodDark);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 1.15, 4, 1), new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 0.9, flatShading: true }));
    roof.position.set((x0 + x1) / 2, ph + 0.57, (z0 + z1) / 2); roof.rotation.y = Math.PI / 4; add(roof);
    // bench along the back, a few cushions
    box(x0 + 0.3, x1 - 0.3, 0.14, 0.58, z1 - 0.6, z1 - 0.15, M.woodDark);
    for (let i = 0; i < 3; i++) box(x0 + 0.5 + i * 0.75, x0 + 1.1 + i * 0.75, 0.58, 0.68, z1 - 0.58, z1 - 0.18, new THREE.MeshStandardMaterial({ color: pick([0xc9576a, 0xe0a43a, 0x3c8fb5]), roughness: 1 }));
    // string lights around the eaves + pendant lantern
    const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
    for (let s = 0; s < 4; s++) for (let k = 0; k < 12; k++) {
      const t = k / 12, [ax, az] = pts[s], [bx, bz] = pts[s + 1];
      inst(G.bulb, bulbMat, ax + (bx - ax) * t, ph - 0.05 - Math.sin(t * Math.PI) * 0.12, az + (bz - az) * t);
    }
    const zc = (z0 + z1) / 2;
    inst(G.cyl, M.darkMetal, 9.3, ph - 0.5, zc, 0.006, 0.5, 0.006);
    const pend = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.2), lanternMat);
    pend.position.set(9.3, ph - 0.62, zc); add(pend);
    lamp(9.3, ph - 0.7, zc, 6, 7);

  }

  // Small glass greenhouse 2.0 × 2.5, door to the west onto the round course (#23).
  {
    const x0 = 18.35, x1 = 20.35, z0 = 13.15, z1 = 15.65, eave = 1.9, ridge = 2.5;
    box(x0, x1, 0, 0.12, z0, z1, new THREE.MeshStandardMaterial({ color: 0x9a9890 }));
    // glass box + gable roof panes
    box(x0 + 0.02, x1 - 0.02, 0.12, eave, z0 + 0.02, z1 - 0.02, M.glass, { cast: false });
    const w = (x1 - x0) / 2, slope = Math.hypot(w, ridge - eave), ang = Math.atan2(ridge - eave, w);
    for (const s of [-1, 1]) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.02, z1 - z0), M.glass);
      pane.position.set((x0 + x1) / 2 + s * w / 2, (eave + ridge) / 2, (z0 + z1) / 2);
      pane.rotation.z = -s * ang;
      add(pane, { cast: false });
    }
    const gable = new THREE.Shape([new V2(-w, 0), new V2(w, 0), new V2(0, ridge - eave)]);
    for (const z of [z0 + 0.02, z1 - 0.02]) {
      const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), M.glass);
      gm.position.set((x0 + x1) / 2, eave, z); add(gm, { cast: false });
    }
    // frame
    for (const x of [x0, x1]) for (const z of [z0, z1, (z0 + z1) / 2]) box(x - 0.025, x + 0.025, 0.12, eave, z - 0.025, z + 0.025, M.darkMetal);
    box(x0, x1, eave - 0.03, eave + 0.02, z0 - 0.02, z0 + 0.03, M.darkMetal);
    box(x0, x1, eave - 0.03, eave + 0.02, z1 - 0.03, z1 + 0.02, M.darkMetal);
    box((x0 + x1) / 2 - 0.03, (x0 + x1) / 2 + 0.03, ridge - 0.04, ridge + 0.02, z0, z1, M.darkMetal);
    // staging and plants inside
    box(x1 - 0.55, x1 - 0.1, 0.12, 0.8, z0 + 0.2, z1 - 0.2, M.wood);
    for (let k = 0; k < 6; k++) mound(x1 - 0.32, z0 + 0.4 + k * 0.33, 0.15, 1, 0x5f9a3e, 0.8);
    for (let k = 0; k < 3; k++) { inst(G.cyl, M.stem, x0 + 0.4, 0.12, z0 + 0.5 + k * 0.7, 0.01, 1.4, 0.01); mound(x0 + 0.4, z0 + 0.5 + k * 0.7, 0.18, 2.5, 0x4f8a34, 0.5); inst(G.sphere, M.white, x0 + 0.45, 0.9, z0 + 0.55 + k * 0.7, 0.04, 0.04, 0.04, 0, 0, 0, 0xd8402a); }
    for (let k = 0; k < 14; k++) inst(G.bulb, bulbMat, (x0 + x1) / 2 + Math.sin(k) * 0.05, eave + 0.1 - Math.sin(k / 13 * Math.PI) * 0.15, z0 + 0.15 + k * 0.17);
    lamp((x0 + x1) / 2, 1.6, (z0 + z1) / 2, 4, 5);
  }

  // Round course centre: fairy ring of mushroom lights and a mossy standing stone (#22).
  {
    const cx = 16.75, cz = 14.4;
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * 6.283, rr = 0.78;
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, s = r(0.8, 1.25);
      inst(G.cyl, M.whiteSmooth, x, 0, z, 0.025 * s, 0.13 * s, 0.025 * s);
      inst(G.sphere, capMat, x, 0.13 * s, z, 0.075 * s, 0.045 * s, 0.075 * s);
    }
    for (let k = 0; k < 30; k++) { const a = rand() * 6.283, d = r(0.2, 0.95); inst(G.sphere, M.white, cx + Math.cos(a) * d, 0.04, cz + Math.sin(a) * d, 0.025, 0.025, 0.025, 0, 0, 0, pick([0xd8203a, 0xf3f0e6])); } // wild strawberries
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), M.stoneGrey);
    stone.scale.set(0.28, 0.75, 0.22); stone.position.set(cx, 0.6, cz); stone.rotation.set(0.08, 0.6, -0.05); add(stone);
    const mossCap = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x5c7f36, roughness: 1, flatShading: true }));
    mossCap.scale.set(0.25, 0.18, 0.2); mossCap.position.set(cx + 0.02, 1.2, cz); add(mossCap);
    lamp(cx, 0.35, cz, 2.5, 4, 0xffd38a);
    // uplight on the stone
    inst(G.cyl, upMat, cx - 0.55, 0, cz + 0.2, 0.05, 0.06, 0.05);
  }

  // Terrace: 6 × 3 m roof against the house (centred on the living-room door), long table under it (#6).
  // String lights span the garden: raised beds (#5) → roof corner, roof corner → play-area corner.
  {
    const rx0 = -3.0, rz0 = 1.4, rz1 = 7.4, hHouse = 2.85, hFront = 2.55; // living-room door (5.30–7.31) stays under it
    for (const z of [rz0 + 0.06, (rz0 + rz1) / 2, rz1 - 0.06]) box(rx0 - 0.06, rx0 + 0.06, 0.04, hFront, z - 0.06, z + 0.06, M.darkMetal);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(-rx0, hHouse - hFront) + 0.2, 0.08, rz1 - rz0 + 0.1), new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.5, metalness: 0.4 }));
    roof.position.set(rx0 / 2 - 0.05, (hHouse + hFront) / 2 + 0.04, (rz0 + rz1) / 2);
    roof.rotation.z = Math.atan2(hHouse - hFront, -rx0); // high side against the house
    add(roof);
    for (let k = 0; k < 4; k++) { // recessed downlights
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), bulbMat);
      d.position.set(-1.5, (hHouse + hFront) / 2 - 0.01, rz0 + 0.9 + k * 1.4); add(d);
    }
    lamp(-1.5, 2.2, rz0 + 1.7, 5, 7);
    lamp(-1.5, 2.2, rz0 + 4.4, 5, 7);

    // Existing Marti table + 6 Wendell chairs, under the north half of the roof.
    const tx = -1.55, tz = rz0 + 1.8;
    diningSet(parent, tx, tz, Math.PI / 2);
    for (let k = -1; k <= 1; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), lanternMat); c.position.set(tx, 0.85, tz + k * 0.6); add(c); }

    // posts at the raised beds and in the play-area corner
    const postA = [-7.9, -4.9, 3.0], postB = [P.west + 0.35, P.south - 0.35, 3.0 + L.boundary.lWallHeight * 0];
    for (const [x, z, h] of [postA, postB]) box(x - 0.05, x + 0.05, 0, h, z - 0.05, z + 0.05, M.darkMetal);
    const spans = [[postA, [rx0, rz0, hFront]], [[rx0, rz1, hFront], postB]];
    for (const [[ax, az, ay], [bx, bz, by]] of spans) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.45), pts = [];
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.55;
        pts.push(new THREE.Vector3(x, y, z));
        if (k > 0 && k < n) inst(G.bulb, bulbMat, x, y - 0.05, z);
      }
      parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), M.cable));
      lamp((ax + bx) / 2, Math.min(ay, by) - 0.6, (az + bz) / 2, 3, 7);
    }
  }

  // Seating nook: mosaic table, two chairs, lanterns (#4).
  {
    const tx = 1.4, tz = -4.8;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), M2.mosaic); top.position.set(tx, 0.72, tz); add(top);
    inst(G.cyl, M.darkMetal, tx, 0, tz, 0.04, 0.7, 0.04);
    const chair = new THREE.MeshStandardMaterial({ color: 0xd9668f, roughness: 0.7 });
    for (const [dx, rot] of [[-0.75, Math.PI / 2], [0.75, -Math.PI / 2]]) {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), chair); seat.position.y = 0.45;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.04), chair); back.position.set(0, 0.7, -0.22);
      g.add(seat, back);
      for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.03), chair); l.position.set(lx, 0.225, lz); g.add(l); }
      g.position.set(tx + dx, 0, tz); g.rotation.y = rot;
      g.traverse(o => { o.castShadow = true; });
      parent.add(g);
    }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), lanternMat); tl.position.set(tx, 0.85, tz); add(tl);
    lamp(tx, 1.0, tz, 2, 4);
  }

  // Stone cairns (#10) and cairns at the willow's foot.
  {
    const cairn = (x, z, n) => {
      let y = 0;
      for (let k = 0; k < n; k++) {
        const w = 0.16 - k * 0.018, h = 0.06 - k * 0.004;
        inst(G.sphere, M.stoneGrey, x + r(-0.01, 0.01), y + h, z + r(-0.01, 0.01), w, h, w * 0.9, 0, rand() * 6, 0);
        y += h * 1.8;
      }
    };
    const g = new THREE.Mesh(new THREE.CircleGeometry(0.7, 28), M2.gravel); g.rotation.x = -Math.PI / 2; g.position.set(1.7, 0.012, 14.3 + dz); add(g, { cast: false });
    cairn(1.5, 14.1 + dz, 6); cairn(1.95, 14.45 + dz, 5); cairn(1.4, 14.6 + dz, 4); cairn(2.0, 14.0 + dz, 3);
    cairn(13.2, 15.3, 4); cairn(12.1, 15.4, 3);
  }

  // ---------- trees ----------
  // Weeping willow, ~4.5 m high, slender ~2 m crown (#11).
  {
    const x = 12.7, z = 14.7;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.4, 7), M.bark); trunk.position.set(x, 1.2, z); add(trunk);
    for (let k = 0; k < 4; k++) inst(G.cyl, M.bark, x, 2.2, z, 0.045, 1.9, 0.045, r(-0.2, 0.2), 0, r(-0.2, 0.2));
    for (let k = 0; k < 6; k++) inst(G.blob, M.white, x + r(-0.3, 0.3), r(3.6, 4.4), z + r(-0.3, 0.3), r(0.4, 0.55), r(0.35, 0.5), r(0.4, 0.55), 0, 0, 0, pick([0x93b85a, 0xa3c46a]));
    for (let k = 0; k < 190; k++) {
      const a = rand() * 6.283, d = r(0.25, 0.95), top = r(2.6, 4.4), len = top - r(0.6, 1.2);
      inst(G.strand, M.white, x + Math.cos(a) * d, top, z + Math.sin(a) * d, r(0.8, 1.4), len, 1, r(-0.04, 0.04), a, r(-0.04, 0.04), pick([0x9fbf5a, 0xb2cd6e, 0x8cae4c]));
    }
    inst(G.cyl, upMat, x + 0.5, 0, z - 0.4, 0.05, 0.06, 0.05);
    lamp(x + 0.45, 0.6, z - 0.45, 5, 7);
  }
  // Red Japanese maple in the arch bed (#19).
  {
    const x = 1.5, z = -2.15;
    inst(G.cyl, M.bark, x, 0, z, 0.06, 1.0, 0.06);
    [[0.8, 1.2], [0.65, 1.65], [0.45, 2.05]].forEach(([rad, y], i) => inst(G.blob, M.white, x + r(-0.1, 0.1), y, z + r(-0.1, 0.1), rad, rad * 0.35, rad, 0, rand(), 0, i % 2 ? 0xa8321e : 0xc2452a));
    inst(G.cyl, upMat, x + 0.35, 0, z + 0.3, 0.05, 0.06, 0.05);
    lamp(x + 0.3, 0.5, z + 0.3, 2.5, 4);
  }
  // Multi-stem serviceberry shading the nook (#20).
  {
    const x = -1.3, z = -4.75;
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; inst(G.cyl, M.bark, x + Math.cos(a) * 0.1, 0, z + Math.sin(a) * 0.1, 0.04, 2.8, 0.04, Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); }
    for (let k = 0; k < 7; k++) { const a = rand() * 6.283, d = r(0.1, 0.7); inst(G.blob, M.white, x + Math.cos(a) * d, r(2.6, 3.7), z + Math.sin(a) * d, r(0.45, 0.65), r(0.35, 0.5), r(0.45, 0.65), 0, 0, 0, pick([0x7fae55, 0x8bb85e, 0xd0743a])); }
    for (const [dx, dz, h] of [[-0.3, -0.2, 2.3], [0.35, 0.3, 2.1], [0.6, -0.1, 2.4]]) {
      inst(G.cyl, M.darkMetal, x + dx, h + 0.12, z + dz, 0.004, 0.4, 0.004);
      const ln = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.13), lanternMat); ln.position.set(x + dx, h, z + dz); add(ln);
    }
    lamp(x, 2.0, z, 3, 5);
  }
  // Globe locust on the front lawn with a catmint ring, lavender along the street edge (#16).
  {
    const x = 20.37, z = L.front.lawnBox.z1 - 1.76; // centred across the lawn, toward its south end
    inst(G.cyl, M.bark, x, 0, z, 0.06, 2.2, 0.06);
    inst(G.blob, M.white, x, 2.65, z, 0.55, 0.5, 0.55, 0, 0, 0, 0x8fbf4a);
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; lavender(x + Math.cos(a) * 0.65, z + Math.sin(a) * 0.65, 0.22, 0x8f9fe0); }
    for (let zz = L.front.lawnBox.z0 + 0.2; zz < L.front.lawnBox.z1 - 0.1; zz += 0.45) lavender(21.58, zz, 0.2);
    inst(G.cyl, upMat, x - 0.25, 0, z + 0.25, 0.05, 0.06, 0.05);
    lamp(x - 0.25, 0.4, z + 0.25, 3, 5);
  }
  youngTree(4.2, 15.6);           // peach tree, moved (#9)
  youngTree(-3.2, -4.2);          // existing young tree on the north lawn
  youngTree(5.3, -5.95, 0, 0.7);  // small sapling, moved into the cottage border
  lamp(4.2, 0.5, 15.1, 2.5, 4);
  inst(G.cyl, upMat, 4.2, 0, 15.15, 0.05, 0.06, 0.05);
  // Twisted hazel in the mythical corner.
  {
    const x = 15.05, z = 15.9;
    for (let k = 0; k < 7; k++) {
      const pts = [new THREE.Vector3(x, 0, z)];
      const a = rand() * 6.283;
      for (let j = 1; j <= 5; j++) pts.push(new THREE.Vector3(x + Math.cos(a) * j * 0.12 + r(-0.15, 0.15), j * r(0.35, 0.45), z + Math.sin(a) * j * 0.12 + r(-0.15, 0.15)));
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.022, 5), M.bark));
      for (let j = 0; j < 4; j++) { const p = pts[1 + Math.floor(rand() * 4)]; inst(G.cyl, M.white, p.x, p.y - 0.12, p.z, 0.012, 0.12, 0.012, 0, 0, 0, 0xd9c35a); }
    }
  }
  // Elderberry in the south-east corner (#27).
  {
    const x = 20.6, z = 16.3;
    for (let k = 0; k < 5; k++) inst(G.cyl, M.bark, x + r(-0.15, 0.15), 0, z + r(-0.15, 0.15), 0.035, 1.8, 0.035, r(-0.2, 0.2), 0, r(-0.2, 0.2));
    for (let k = 0; k < 6; k++) inst(G.blob, M.white, x + r(-0.35, 0.35), r(1.1, 2.3), z + r(-0.3, 0.3), r(0.4, 0.55), r(0.35, 0.45), r(0.4, 0.55), 0, 0, 0, pick([0x3d6b2a, 0x4a7a33]));
    for (let k = 0; k < 10; k++) inst(G.sphere, M.white, x + r(-0.5, 0.5), r(1.2, 2.2), z + r(-0.5, 0.2), 0.07, 0.04, 0.07, 0, 0, 0, 0x2a1e3a);
  }

  // ---------- planting ----------
  // Bamboo + tall plants along the south fence (#12), street fence, and one clump in the play area.
  // Continuous screens: dense bamboo with a leafy hedge base, so the fence disappears.
  function screen(x0, z0, x1, z1, H = 3) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (let d = 0.2; d < len; d += 0.65) {
      const t = d / len;
      bamboo(x0 + (x1 - x0) * t + r(-0.1, 0.1), z0 + (z1 - z0) * t + r(-0.1, 0.1), 0.42, H * r(0.88, 1.08));
    }
    for (let d = 0; d < len; d += 0.32) {
      const t = d / len, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      for (const y of [0.45, 1.1, 1.75]) inst(G.blob, M.white, x + r(-0.12, 0.12), y + r(-0.1, 0.1), z + r(-0.12, 0.12), r(0.42, 0.6), r(0.38, 0.52), r(0.42, 0.6), 0, rand() * 6, 0, pick([0x3f6e2c, 0x4a7a33, 0x56863a, 0x3a6328]));
    }
  }
  // Ivy covering a fence (and the L-wall face below it) as a dense flat layer of leaves.
  function ivy(x0, z0, x1, z1, y0, y1) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    for (let d = 0; d < len; d += 0.17) for (let y = y0; y < y1; y += 0.2) {
      const t = d / len;
      inst(G.blobLow, M.white, x0 + (x1 - x0) * t + r(-0.04, 0.04), y + r(-0.06, 0.08), z0 + (z1 - z0) * t + r(-0.04, 0.04),
        r(0.16, 0.24), r(0.13, 0.2), 0.07, 0, -ang, r(-0.5, 0.5), pick([0x2f5a24, 0x3a6a2a, 0x46773a, 0x2a4f20]));
    }
  }
  screen(P.west + 0.4, P.south - 0.45, P.east - 0.45, P.south - 0.45);   // whole south fence
  screen(P.east - 0.45, L.front.footpathFenceZ + 0.4, P.east - 0.45, P.south - 0.9); // fence along the street
  // North fence belongs to the neighbour: keep it open, just a few light climbers with gaps between.
  {
    const len = 9.0 - P.west;
    for (let d = 0.8; d < len - 0.4; d += r(1.6, 2.2)) {
      const x = P.west + d, z = P.north + 0.1;
      for (let k = 0; k < 14; k++) {
        const y = r(0.1, 1.25), spread = 0.15 + y * 0.25;
        inst(G.blobLow, M.white, x + r(-spread, spread), y, z + r(-0.03, 0.03), r(0.07, 0.12), r(0.06, 0.1), 0.04, 0, 0, r(-0.5, 0.5), pick([0x46773a, 0x56863a, 0x3a6a2a]));
        if (rand() < 0.35) inst(G.sphere, M.white, x + r(-spread, spread), y + 0.05, z + 0.04, 0.035, 0.035, 0.02, 0, 0, 0, pick([0xb07ad8, 0xffffff, 0xe58fb0]));
      }
    }
  }
  ivy(9.08, P.north, 9.08, -5.5, 0, 1.35);                                // short fence behind the shed
  ivy(P.west + 0.06, P.north, P.west + 0.06, P.south, 0, L.boundary.lWallHeight + 1.1); // L-wall + fence, west
  ivy(L.house.x1 + 0.1, L.front.footpathFenceZ + 0.08, P.east - 0.9, L.front.footpathFenceZ + 0.08, 0, 1.1); // footpath fence, garden side
  ivy(L.house.x1 + 0.08, L.house.z1 + 1.05, L.house.x1 + 0.08, L.front.footpathFenceZ, 0, 1.1);
  for (const [x, z] of [[2.4, 15.7], [6.3, 15.6], [10.0, 15.75], [13.4, 15.6], [17.0, 15.65], [20.0, 15.5]]) tallGrass(x, z + dz, r(1.6, 2.0));
  for (const x of [-1.6, 3.2, 7.2, 12.6, 16.2, 19.3]) spike(x, 15.8 + dz, 1.9, pick([0xe58fb0, 0xd9668f, 0xf4d3e0]), 0.11, 0.8); // hollyhocks / Joe-Pye
  for (let x = -2.2; x < 20.4; x += 0.6) {
    if (x > 7.6 && x < 11.0) continue; // behind the pavilion
    flowers(x + r(-0.1, 0.1), 15.25 + dz + r(-0.1, 0.1), [0xe7a6d0, 0xf4e17a, 0xffffff, 0xb07ad8, 0xf09a5a], 4, 0.22, 0.38);
  }
  bamboo(-7.7, 12.3 + dz, 0.6, 3);
  lamp(-7.2, 0.6, 12.6 + dz, 3, 6);
  inst(G.cyl, upMat, -7.2, 0, 12.6 + dz, 0.05, 0.06, 0.05);
  for (const [x, z] of [[2.5, 15.4 + dz], [11.7, 15.4 + dz], [20.9, 13.0]]) { inst(G.cyl, upMat, x, 0, z, 0.05, 0.06, 0.05); lamp(x, 0.6, z - 0.2, 3, 6); }

  // Cottage border along the north fence (#2).
  for (let x = -3.2; x < 5.9; x += 0.42) {
    const z = r(-6.3, -5.8), k = rand();
    if (k < 0.3) spike(x, z, r(1.1, 1.5), pick([0xc77ad8, 0xe58fb0, 0xf2f0f4]));
    else if (k < 0.55) allium(x, z, r(0.7, 1.0));
    else if (k < 0.8) lavender(x, z);
    else rose(x, z, 0.35);
  }
  // Low fern / hosta border along the house, east of the arch (#3), and the arch bed (#19).
  for (let x = 3.6; x < 5.9; x += 0.35) fern(x, r(-1.85, -1.55), r(0.22, 0.32));
  for (const [x, z] of [[0.3, -1.75], [1.0, -1.65], [2.2, -1.7]]) hydrangea(x, z, 0.36);
  for (const [x, z] of [[-0.2, -2.1], [0.6, -2.35], [2.3, -2.3]]) fern(x, z, 0.26);
  // Kitchen corner: planned second bed becomes real; greens in both beds (#5).
  {
    const nb = L.raisedBeds.find(b => b.planned);
    box(nb.x0, nb.x1, 0, nb.h, nb.z0, nb.z1, mat.metal);
    for (const b of L.raisedBeds.filter(b => !b.tree)) {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) mound(b.x0 + 0.2 + i * 0.32, b.z0 + 0.22 + j * 0.33, 0.13, 0.8, pick([0x6fa84a, 0x8cc05a, 0x5e8f3a, 0x9a4a6a]), b.h);
    }
  }
  // Mixed bed between the paved house path and the glow path (gap where the link crosses, none at the heat pump).
  {
    const pts = pathC.getSpacedPoints(200);
    const pathZ = x => pts.reduce((b, p) => Math.abs(p.x - x) < Math.abs(b.x - x) ? p : b).y;
    for (let x = -1.1; x < 11.2; x += 0.42) {
      if (x > 3.55 && x < 4.85) continue;
      const zEnd = pathZ(x) - 0.78;
      for (let z = 11.35; z < zEnd; z += 0.45) {
        const k = rand(), px = x + r(-0.12, 0.12), pz = z + r(-0.1, 0.1);
        if (k < 0.22) lavender(px, pz, 0.24);
        else if (k < 0.4) hydrangea(px, pz, 0.32);
        else if (k < 0.55) fern(px, pz, 0.26);
        else if (k < 0.68) spike(px, pz, r(0.9, 1.3), pick([0xc77ad8, 0xe58fb0, 0xf2f0f4]), 0.07, 0.4);
        else if (k < 0.8) allium(px, pz, r(0.6, 0.85));
        else if (k < 0.9) tallGrass(px, pz, 1.0);
        else flowers(px, pz, [0xe7a6d0, 0xf4e17a, 0xffffff, 0xb07ad8], 4, 0.2, 0.35);
      }
    }
  }
  // Pavilion planting (#21).
  for (const [x, z] of [[7.3, 12.9], [7.3, 14.4], [11.25, 14.6]]) hydrangea(x, z + dz, 0.4);
  for (const [x, z] of [[7.25, 13.65], [11.2, 15.2]]) tallGrass(x, z + dz, 1.5);
  // Snacking hedge: currants / gooseberries (#25).
  for (const [x, z, s] of [[13.6, 14.55, 0.35], [14.4, 14.8, 0.35], [13.85, 13.85, 0.3], [6.1, 14.85, 0.35], [6.85, 14.65, 0.3], [-0.05, 15.1, 0.35], [0.75, 15.2, 0.3]]) berryShrub(x, z + dz, s, pick([0xc8203a, 0xd8203a, 0x2a1e3a, 0x9a2a3a]));
  // Berry trellis: raspberries + thornless blackberries along the footpath fence (#26), gooseberries at the room's south edge.
  {
    const tz = L.front.footpathFenceZ + 0.2;
    for (const x of [15.95, 17.075, 18.2]) box(x - 0.03, x + 0.03, 0, 1.6, tz - 0.03, tz + 0.03, M.woodDark);
    for (const y of [0.6, 1.0, 1.4]) inst(G.cyl, M.darkMetal, 15.95, y, tz, 0.004, 2.25, 0.004, 0, 0, -Math.PI / 2);
    for (let x = 16.05; x < 18.15; x += 0.18) {
      const black = x > 17.1;
      inst(G.cyl, M.white, x, 0, tz + r(-0.05, 0.05), 0.012, r(1.3, 1.7), 0.012, r(-0.1, 0.1), 0, r(-0.1, 0.1), black ? 0x5b3a2a : 0x8a3a2a);
      for (let j = 0; j < 4; j++) {
        const y = r(0.4, 1.5);
        inst(G.blob, M.white, x + r(-0.1, 0.1), y, tz + r(-0.1, 0.15), 0.13, 0.08, 0.13, 0, 0, 0, pick([0x4e8a3c, 0x5a9440]));
        inst(G.sphere, M.white, x + r(-0.12, 0.12), y - 0.05, tz + 0.07 + r(-0.1, 0.1), 0.025, 0.03, 0.025, 0, 0, 0, black ? 0x2a1e3a : 0xd8203a);
      }
    }
    berryShrub(17.6, 16.25, 0.32, 0x9ab84a);
    berryShrub(18.3, 16.3, 0.32, 0x9ab84a);
  }
  // Front facade beds and pots by the door (#17).
  for (let z = 6.35; z < 9.75; z += 0.38) flowers(15.08, z, [0xb07ad8, 0xffffff, 0x8f9fe0], 3, 0.18, 0.32);
  for (let z = 3.0; z < 4.5; z += 0.38) flowers(15.08, z, [0xb07ad8, 0xffffff, 0x8f9fe0], 3, 0.18, 0.32);
  for (const z of [4.55, 6.1]) {
    inst(G.cyl, M.terracotta, 15.2, 0, z, 0.22, 0.5, 0.22);
    inst(G.blob, M.white, 15.2, 0.75, z, 0.28, 0.28, 0.28, 0, 0, 0, 0x3f6b2b);
  }
  // Lanterns along the glow path, mushroom path lights on the forest path / mosaic path / front walkway.
  {
    const lantern = (x, z) => {
      inst(G.cyl, M.darkMetal, x, 0, z, 0.08, 0.03, 0.08);
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.13), lanternMat); g.position.set(x, 0.13, z); add(g);
      inst(G.cone, M.darkMetal, x, 0.23, z, 0.1, 0.08, 0.1);
    };
    void lantern;
    // Low louvred bollards every ~3 m along the glow path, alternating sides: soft light onto the stones only.
    const bollardHead = glowMat(0x2f3236, 0xffc27a, 0, 1.2);
    const lenC = pathC.getLength();
    let side = 1;
    for (let d = 1.2; d < lenC - 0.5; d += 3) {
      const p = pathC.getPointAt(d / lenC), t = pathC.getTangentAt(d / lenC);
      const x = p.x - t.y * 0.65 * side, z = p.y + t.x * 0.65 * side;
      inst(G.cyl, M.darkMetal, x, 0, z, 0.05, 0.55, 0.05);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), bollardHead);
      head.position.set(x, 0.48, z); add(head);
      lamp(x + t.y * 0.3 * side, 0.35, z - t.x * 0.3 * side, 1.4, 2.6);
      side = -side;
    }
    const mush = (x, z) => {
      inst(G.cyl, M.whiteSmooth, x, 0, z, 0.03, 0.4, 0.03);
      inst(G.sphere, capMat, x, 0.42, z, 0.13, 0.07, 0.13);
    };
    [[5.1, -3.95], [2.2, -3.05], [-0.9, -2.85], [15.0, 12.9]].forEach(([x, z]) => mush(x, z));
    lamp(2.2, 0.5, -3.05, 2, 4); // the rest glow via bloom only
  }

  // ---------- labels ----------
  label('Forest path', 4.4, -3.7);
  label('Arch', 3.0, -1.9, 2.8);
  label('Seating nook', 1.4, -4.8, 1.4);
  label('Garden shed', 7.9, -3.5, 2.6);
  label('Raised beds', -6.0, -5.6, 1.4);
  label('Japanese maple', 1.5, -2.15, 2.6);
  label('Serviceberry', -1.3, -4.75, 4.0);
  label('Open lawn (stays free)', (P.west + L.terrace.x0) / 2, 4.5);
  label('Glow path', 2.0, 13.6);
  label('Pavilion', 9.3, 13.7 + dz, 3.8);
  label('Weeping willow', 12.7, 14.7, 4.8);
  label('Peach', 4.2, 15.6, 2.5);
  label('Terrace roof 6 × 3', -1.5, 4.4, 3.2);
  label('Stone cairns', 1.7, 14.3 + dz, 0.9);
  label('Bamboo screen', 8.0, 16.0 + dz, 3.4);
  label('Round course', 16.75, 14.4, 1.6);
  label('Greenhouse', 19.35, 14.4, 2.9);
  label('Berry trellis', 17.1, L.front.footpathFenceZ + 0.2, 1.9);
  label('Elderberry', 20.6, 16.3, 2.7);
  label('Globe locust', 20.37, L.front.lawnBox.z1 - 1.76, 3.4);
  label('Snacking hedge', 13.9, 14.4 + dz, 1.2);

  flushBatches();
}
