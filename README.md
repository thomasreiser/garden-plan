# Garden 3D

A browser fly-through of our house and garden, built with [three.js](https://threejs.org/).
It shows the garden as it is today (**Status quo**) and a design proposal (**Whimsical**),
by day and by night. A separate 2D plan page documents the design and its lighting concept.

## Run it

The pages load ES modules, so they need to be served over HTTP (opening the file directly won't work):

```sh
python3 -m http.server 8765
```

Then open:

- **3D viewer:** http://localhost:8765
- **Design plan (2D):** http://localhost:8765/concept/paths.html

No build step and no dependencies to install. three.js is loaded from the jsDelivr CDN, so an internet connection is needed.

## 3D viewer controls

| Input | Action |
| --- | --- |
| Click the scene | Start flying (mouse look); `Esc` releases the mouse |
| `W` `A` `S` `D` / arrow keys | Move |
| `E` / `Space`, `Q` / `C` | Up / down |
| `Shift` | Move faster |
| `V` or the scene buttons | Switch between Status quo and Whimsical |
| `N` or the ☀/☾ button | Day / night |
| `L` | Show / hide labels |
| `1`–`9` | Camera presets (overview, top, terrace, street, play area, south lawn, north lawn, pavilion, mythical corner) |

The URL hash can preselect a view, scene and mode, e.g. `#pavilion&whimsical&night&nolabels`.

## Design plan page

`concept/paths.html` is the top-down plan of the Whimsical design with numbered features.
It has two views (**Garden plan** and **Lighting plan**) and a **Show dimensions** overlay.

## Project layout

```
index.html               3D viewer page (HUD, import map)
src/layout.js            All measurements of house and plot (single source of truth)
src/main.js              Shared scene: terrain, house, fences, play area, status quo, day/night, controls
src/furniture.js         Existing terrace furniture (Sklum "Marti" table, 6 × "Wendell" chairs)
src/scenes/whimsical.js  The Whimsical design scene
concept/paths.html       2D design plan + lighting plan
plan/                    Floor plan (Grundriss-EG.pdf) and hand sketch of the plot
photos/                  Reference photos of the garden
```

## Coordinates and measurements

All values are in metres, in the orientation of the floor plan (north up):

- `x` → east (house west wall at `x = 0`, street side at `x = 14.82`)
- `z` → south (house north wall at `z = 0`, south wall at `z = 9.96`)
- `y` → up

Measurements come from the floor plan, the sketch and on-site corrections. Values that were
estimated from photos are marked `guess` in `src/layout.js`. To correct something, change it there;
most of both scenes is derived from these values.

## Adding another scene

1. Create `src/scenes/<name>.js` exporting a build function, like `buildWhimsical`.
2. In `src/main.js`, add a group to `variants` and `variantLabels`, and call the builder inside `inGroup(...)`.
3. Add a button with `data-variant="<name>"` to `index.html`.
