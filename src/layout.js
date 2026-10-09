// All dimensions in metres.
// Coordinate system (matches the floor plan PDF, which has north at the top):
//   x → east   (house west wall at x = 0, east/street-side wall at x = 14.82)
//   z → south  (house north wall at z = 0, south wall at z = 9.96)
//   y → up
// Values marked "guess" are not in the plan or the sketch and were estimated from photos.

export const house = {
  x0: 0, x1: 14.82,
  z0: 0, z1: 9.96,
  eaveHeight: 5.9,     // guess
  ridgeHeight: 9.8,    // guess
  overhang: 0.45,      // guess
  floor2: 2.95,        // guess, upper floor level
  // Openings from Grundriss-EG.pdf: [start, end] along the wall, sill height, opening height.
  // Upper-floor and gable openings are guesses from photos.
  openings: {
    north: [ // measured from the west end (x)
      { a: 3.56, b: 4.57, sill: 0, h: 2.26 },
      { a: 5.75, b: 6.76, sill: 1.22, h: 1.04 },
      { a: 9.41, b: 10.42, sill: 1.22, h: 1.04 },
      { a: 4.2, b: 5.2, sill: 3.95, h: 1.3 },
      { a: 9.4, b: 10.4, sill: 3.95, h: 1.3 },
    ],
    south: [ // from the west end (x)
      { a: 1.09, b: 3.10, sill: 0, h: 2.26, door: true },
      { a: 4.54, b: 6.55, sill: 0, h: 2.26, door: true },
      { a: 8.33, b: 10.34, sill: 1.22, h: 1.04 },
      { a: 2.0, b: 3.0, sill: 3.95, h: 1.3 },
      { a: 11.5, b: 12.5, sill: 3.95, h: 1.3 },
    ],
    west: [ // from the north end (z)
      { a: 5.30, b: 7.31, sill: 0, h: 2.26, door: true },
      { a: 2.4, b: 3.3, sill: 3.6, h: 1.6 },
      { a: 6.6, b: 7.5, sill: 3.6, h: 1.6 },
      { a: 4.68, b: 5.28, sill: 6.8, h: 0.9 },
    ],
    east: [ // from the north end (z)
      { a: 1.49, b: 2.625, sill: 0.3, h: 1.96, shutter: true }, // tall window right of the front door (photo), shutter down
      { a: 4.765, b: 5.895, sill: 0, h: 2.26, door: true },
      { a: 7.345, b: 8.48, sill: 0.96, h: 1.30 },
      { a: 4.39, b: 5.27, sill: 3.25, h: 2.05 },               // single tall window on the upper floor (photo)
      { a: 4.68, b: 5.28, sill: 6.8, h: 0.9 },
    ],
  },
};

// Property boundary.
export const plot = {
  west: -(5.25 + 3.25),       // terrace 5.25 + lawn 3.25 (sketch); boundary kept when the terrace was shrunk
  north: -(1.25 + 5.25),      // north path 1.25 + north lawn 5.25
  south: 9.96 + 1.0 + 7.00,   // house + south path (1.0) + south lawn 7.00
  east: 14.82 + 7.05,         // front yard depth 7.05 to the street (sketch)
};

// Sketch says 10.00 × 5.25; reduced to leave more room before the play area, as it looks on site.
export const terrace = { x0: -4.75, x1: 0, z0: house.z0, z1: house.z1 }; // as wide as the house

export const paths = [
  // Both side paths extend 1.25 past the west wall, alongside the terrace.
  // North path along the house, 1.25 wide (sketch).
  { name: 'north path', x0: -1.25, x1: house.x1, z0: -1.25, z1: 0 },
  // South path, widened by 0.60 over 2.40 m at the heat pump, ending 1.10 before the front (sketch).
  { name: 'south path', x0: -1.25, x1: house.x1, z0: house.z1, z1: house.z1 + 1.0 },
  { name: 'heat pump pad', x0: house.x1 - 1.10 - 2.40, x1: house.x1 - 1.10, z0: house.z1 + 1.0, z1: house.z1 + 1.6 },
];

// Front yard between the house and the street, south → north:
// grass, footpath, grass, driveway (sketch).
// The south-east lawn by the street is 7.05 × 5.70; the strip north of it is the 3.00 m footpath.
const footpathFenceZ = plot.south - 5.70;
export const front = {
  footpathFenceZ,
  paving: { x0: house.x1, x1: plot.east, z0: plot.north, z1: footpathFenceZ },
  // 6.06 × 3.00 lawn (sketch); the footpath south of it to the footpath fence is 3.00 wide.
  lawnBox: { x0: plot.east - 3.0, x1: plot.east, z0: footpathFenceZ - 3.0 - 6.06, z1: footpathFenceZ - 3.0 },
  // Paved strip between the north path and the future carport.
  carportGap: { x0: 9.0, x1: 14.82, z0: -1.25 - 2.0, z1: -1.25 },
};

// Future carport (hatched in the sketch): 2.00 north of the north path, ending at the front of the house.
export const carport = { x0: 9.0, x1: house.x1, z0: plot.north + 0.25, z1: -1.25 - 2.0, height: 2.6 };

// Wood-chip play area: quarter circle, radius 7.00, in the south-west corner (sketch).
export const playArea = { cx: plot.west, cz: plot.south, r: 6.0 }; // sketch says 7.00; reduced to match the photos
// Playhouse (from photos): board-clad base, larger cabin on top with open windows,
// flat roof with a green fringe, wavy slide leaving the cabin to the west.
export const playhouse = {
  x: plot.west + 3.8, z: plot.south - 2.6,
  cabin: 1.6,      // cabin footprint, square
  deck: 1.2,       // cabin floor height
  wallH: 1.4,      // cabin wall height
  base: [1.1, 1.1] // base footprint (x, z)
};

export const raisedBeds = [
  { x0: plot.west + 0.3, x1: plot.west + 0.3 + 2.0, z0: plot.north + 0.3, z1: plot.north + 0.3 + 1.1, h: 0.8 }, // 2.00 × 1.10 (sketch), long side parallel to the house
  // Planned second bed, right next to the existing one (shown as a ghost).
  { x0: plot.west + 0.3 + 2.0 + 0.6, x1: plot.west + 0.3 + 2.0 + 0.6 + 2.0, z0: plot.north + 0.3, z1: plot.north + 0.3 + 1.1, h: 0.8, planned: true },
  // 1.00 × 1.00 planter with a tree, in the corner of the south path's end and the terrace.
  { x0: -2.25, x1: -1.25, z0: house.z1, z1: house.z1 + 1.0, h: 0.4, tree: true },
];

export const heatPump = { x: house.x1 - 1.10 - 1.2, z: house.z1 + 0.3, w: 1.1, h: 0.85, d: 0.45 };

// Stepping stones (approximate curves from photos).
export const steppingStones = [
  // From the corner of the north path end and the terrace (mirror of the planter) toward the raised beds,
  // splitting at the end: one branch to the existing bed, one to the planned bed beside it.
  { from: [-1.8, -0.7], via: [-3.0, -3.2], to: [-4.7, -3.9], count: 7 },
  { from: [-5.4, -4.2], via: [-6.3, -4.5], to: [-7.0, -4.75], count: 3 },
  { from: [-4.65, -4.75], via: [-4.65, -4.75], to: [-4.65, -4.75], count: 1 },
  { from: [-4.5, 10.45], via: [-5.0, 11.5], to: [-5.8, 12.4], count: 4 },
];

// [x, z, scale?]
export const youngTrees = [
  [-3.2, -4.2],          // north lawn, beside the stepping stones
  [6.3, plot.north + 1.5, 0.7], // small sapling near the fence, a few metres before the driveway
  [12.3, (house.z1 + 1.0 + plot.south) / 2], // centred between south path and fence
];

// Boundary treatment: retaining L-wall with fence on top (west, part of south), rod fence elsewhere.
export const boundary = {
  lWallHeight: 0.8,
  fenceHeight: 1.0,
  lWallSouthUntilX: 2.0, // guess: how far east the L-wall runs along the south boundary
};

export const street = { x0: plot.east, x1: plot.east + 6.0 }; // no sidewalk: the street starts at the plot edge

// Existing LED strips in the lawn along the outer edge of both house paths,
// from the paths' west end 10 m to the east.
export const ledStrips = [
  { x0: -1.25, x1: -1.25 + 10, z: -1.25 - 0.06 },
  { x0: -1.25, x1: -1.25 + 10, z: house.z1 + 1.0 + 0.06 },
];
