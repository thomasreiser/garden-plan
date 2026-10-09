// Existing terrace furniture (used in every scene).
//   Table: Sklum "Marti" 210 × 100 cm, h 75 cm, aluminium frame + polypropylene top, Green Laurel.
//   Chairs: 6 × Sklum "Wendell" with armrests, 54 × 58 cm, h 81, seat 45, arms 66, one-piece PP shell, Pesto.
import * as THREE from 'three';

const laurel = new THREE.MeshStandardMaterial({ color: 0x6f7a5c, roughness: 0.75 });
const pesto = new THREE.MeshStandardMaterial({ color: 0x7d8650, roughness: 0.7, side: THREE.DoubleSide });

function piece(geo, material, x, y, z, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Table in local coordinates: length along x, centred on the origin.
function martiTable() {
  const g = new THREE.Group();
  piece(new THREE.BoxGeometry(2.10, 0.025, 1.00), laurel, 0, 0.7375, 0, g);   // top
  piece(new THREE.BoxGeometry(2.00, 0.06, 0.04), laurel, 0, 0.695, 0.44, g);  // aprons
  piece(new THREE.BoxGeometry(2.00, 0.06, 0.04), laurel, 0, 0.695, -0.44, g);
  piece(new THREE.BoxGeometry(0.04, 0.06, 0.88), laurel, 0.98, 0.695, 0, g);
  piece(new THREE.BoxGeometry(0.04, 0.06, 0.88), laurel, -0.98, 0.695, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    piece(new THREE.BoxGeometry(0.05, 0.725, 0.05), laurel, sx * 0.99, 0.3625, sz * 0.44, g);
  }
  return g;
}

// Chair in local coordinates: the sitter faces +z, backrest toward -z.
function wendellChair() {
  const g = new THREE.Group();
  const sx = 0.27, sz = 0.29; // half width / half depth of the shell
  const seat = piece(new THREE.CylinderGeometry(1, 1, 0.045, 28), pesto, 0, 0.43, 0.01, g);
  seat.scale.set(sx * 0.95, 1, sz * 0.92);
  // curved tub: wraps the back and both sides up to armrest height
  const tub = piece(new THREE.CylinderGeometry(1, 0.96, 0.23, 28, 1, true, Math.PI / 2, Math.PI), pesto, 0, 0.55, 0, g);
  tub.scale.set(sx, 1, sz);
  // taller backrest in the middle of the back
  const back = piece(new THREE.CylinderGeometry(1, 1, 0.16, 20, 1, true, Math.PI * 0.72, Math.PI * 0.56), pesto, 0, 0.73, 0, g);
  back.scale.set(sx * 0.99, 1, sz * 0.99);
  // rolled top edge of the armrests
  for (const s of [-1, 1]) piece(new THREE.BoxGeometry(0.04, 0.025, sz * 1.6), pesto, s * sx * 0.97, 0.665, 0.03, g);
  for (const [lx, lz] of [[-0.21, -0.22], [0.21, -0.22], [-0.21, 0.22], [0.21, 0.22]]) {
    const leg = piece(new THREE.CylinderGeometry(0.018, 0.022, 0.43, 8), pesto, lx, 0.215, lz, g);
    leg.rotation.set(Math.sign(lz) * 0.05, 0, -Math.sign(lx) * 0.05);
  }
  return g;
}

// Table with three chairs on each long side. `rotY` turns the set; length runs along local x.
export function diningSet(parent, x, z, rotY = 0) {
  const set = new THREE.Group();
  set.add(martiTable());
  for (const along of [-0.68, 0, 0.68]) {
    for (const side of [-1, 1]) {
      const c = wendellChair();
      c.position.set(along, 0, side * 0.78);
      c.rotation.y = side > 0 ? Math.PI : 0; // face the table
      set.add(c);
    }
  }
  set.position.set(x, 0.04, z);
  set.rotation.y = rotY;
  parent.add(set);
  return set;
}
