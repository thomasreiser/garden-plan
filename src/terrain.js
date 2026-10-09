// Ground height of the lawn (metres). The lawn is not perfectly flat (photos): it rises gently toward
// the raised beds in the north-west corner and has small bumps elsewhere. It stays at 0 where it meets
// paving, the terrace, the house and the play area, so hard surfaces don't need to follow it.
import * as L from './layout.js';

const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

const hard = [
  { x0: -1.25, x1: L.house.x1, z0: -1.25, z1: L.house.z1 + 1.0 },          // house + both side paths
  { x0: L.terrace.x0, x1: L.terrace.x1, z0: L.terrace.z0, z1: L.terrace.z1 },
  { x0: L.house.x1, x1: L.plot.east, z0: L.plot.north, z1: L.front.footpathFenceZ }, // front paving + lawn box
  L.front.carportGap,
  { x0: L.carport.x0, x1: L.carport.x1, z0: L.carport.z0, z1: L.carport.z1 },
];

function distToHard(x, z) {
  let d = Infinity;
  for (const r of hard) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
    d = Math.min(d, Math.hypot(dx, dz));
  }
  const pa = L.playArea;
  return Math.min(d, Math.max(0, Math.hypot(x - pa.cx, z - pa.cz) - pa.r));
}

export function groundY(x, z) {
  const bumps = 0.03 * Math.sin(0.83 * x + 1.3) * Math.sin(0.71 * z + 0.4)
    + 0.018 * Math.sin(1.9 * x - 1.6 * z + 0.7)
    + 0.01 * Math.sin(3.1 * x + 2.3 * z);
  const rise = 0.3 * ss(-3.0, -7.2, x) * ss(-2.0, -5.4, z); // toward the raised beds (NW corner)
  return (bumps + rise) * ss(0.15, 1.2, distToHard(x, z));
}

// Offset every vertex of a mesh (already positioned, no rotation on the mesh itself) by the ground height.
export function drape(mesh) {
  const pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) + groundY(pos.getX(i) + mesh.position.x, pos.getZ(i) + mesh.position.z));
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  return mesh;
}
