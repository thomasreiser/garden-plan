# Garden 3D

A browser fly-through of our house and garden, built with [three.js](https://threejs.org/).
It shows the garden as it is today (**Status quo**) and a design proposal (**Whimsical**),
by day and by night. A separate 2D plan page documents the design and its lighting concept.

## Screenshots

Same camera, two scenes: **Status quo** (left) and **Whimsical** (right).

| Status quo | Whimsical |
| --- | --- |
| ![Overview, status quo](docs/screenshots/status-overview.jpg) | ![Overview, whimsical](docs/screenshots/whimsical-overview.jpg) |
| ![South lawn, status quo](docs/screenshots/status-south.jpg) | ![South lawn, whimsical](docs/screenshots/whimsical-south.jpg) |
| ![North lawn, status quo](docs/screenshots/status-north.jpg) | ![North lawn, whimsical](docs/screenshots/whimsical-north.jpg) |
| ![Terrace, status quo](docs/screenshots/status-terrace.jpg) | ![Terrace, whimsical](docs/screenshots/whimsical-terrace.jpg) |
| ![Street side, status quo](docs/screenshots/status-street.jpg) | ![Street side, whimsical](docs/screenshots/whimsical-street.jpg) |

More of the Whimsical design:

| | |
| --- | --- |
| ![Pavilion](docs/screenshots/whimsical-pavilion.jpg) | ![Mythical corner with greenhouse](docs/screenshots/whimsical-mythical.jpg) |
| ![Play area](docs/screenshots/whimsical-playarea.jpg) | ![Pavilion at night](docs/screenshots/whimsical-pavilion-night.jpg) |
| ![South lawn at night](docs/screenshots/whimsical-south-night.jpg) | ![Terrace at night](docs/screenshots/whimsical-terrace-night.jpg) |

Design plan and lighting plan:

| | |
| --- | --- |
| ![Garden plan](docs/screenshots/plan.jpg) | ![Lighting plan](docs/screenshots/plan-lighting.jpg) |

## Planning without a mind's eye

This project exists partly because one of us has aphantasia, which means not being able to
picture things mentally. A description like "a willow behind the path" doesn't produce an image, so every idea
needs to be *seen*, not imagined. Some ways to use the tools for that:

**In the 3D viewer**
- **Compare by switching, not remembering.** Stand somewhere, then press `V` to flip between Status quo and
  Whimsical. The camera stays put, so the difference is right there on screen.
- **Use eye height.** The presets `3`–`9` stand at roughly eye height (1.7–2.1 m), where you'd actually be standing.
  Flying low with `Q` shows what a child sees from the play area.
- **Walk the real routes.** Go from the terrace door to the pavilion, or from the garden gate to the greenhouse,
  with `W` and the mouse, and watch what comes into view.
- **Check the evening.** Press `N` to see which lights are where and how much of the garden is dark.
- **Turn on labels** (`L`) to put names to the plants and objects you're looking at.

**On the plan page**
- **Show dimensions** puts real sizes on every element. Compare them with something familiar: the
  pavilion is 3 × 3 m, about the size of a small bedroom.
- The **Lighting plan** view shows every light on one picture instead of a list.

**In the real garden**
- **Mark outlines on the ground** with string, garden hose or marking spray before buying anything:
  the pavilion's 3 × 3 m, the glow path's curve, the shed's 4 × 2.14 m.
- **Stand in for height** with something physical: a 3 m pole or broom on a stick for the bamboo,
  a ladder for the 4.5 m willow, garden chairs where the seating nook goes.
- **Match photos to presets.** Take a photo from the same spot as a camera preset, for example from the terrace
  door, and put it next to the screenshot of that preset.
- **Change one thing at a time.** Try a single idea in the viewer, look at it from two or three presets, then decide
  before moving to the next.

To try an idea, ask for it to be added to a scene, or add a new scene (see below). Seeing it in place
works better than describing it.

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
| Hold left button + drag | Look around (works even if the browser refuses mouse capture) |
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
