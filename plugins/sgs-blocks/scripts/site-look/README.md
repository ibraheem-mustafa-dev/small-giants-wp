# site-look: what each SGS block looks like by default on one site

The cloning route needs two things about a block: where each of its settings paints, and what the block looks like by default on the client's site. The first is the setting record (`../setting-record/`, in the framework database). The second is the site look, built here offline from the block's code and the site's theme snapshot. It replaces calibration's browser-measured default paint (setting-record plan, Task 4; Bean 2026-11-23): no site, no browser.

## Use

```
python site_look.py --snapshot sites/<client>/theme-snapshot.json --site <site> --out DIR --blocks sgs/button,sgs/cart [--woocommerce]
python site_look.py --snapshot ... --site <site> --out DIR --all --jobs 4
python -m pytest tests                     each mechanism has a test that fails with SITE_LOOK_MUTATE=<mechanism>
```

A block's file is rebuilt only when its key changes: this builder and the setting-record modules it reads, the block's render code (the record renderer's code hash), the snapshot, every plugin and theme stylesheet, and the switches in force. A warm build takes seconds a block; a cold one renders through the record's runner (renders cached under `SGS_SETTING_RECORD_CACHE`).

## How a block's look is read

1. Each variant's default render and each paint state (the setting record's plan and fixtures, `../setting-record/fixtures.json`) is rendered by the record's runner (`render.py`).
2. The render is drawn as a page draws it: inside a section (an `sgs/container`, the way calibration drew every block; straight inside the post content the theme's constrained layout would cap its width), inside its fixture's parents when it has them (`proof.py::Pages`), with what `wp_footer` printed moved to the end of `<body>` and the theme's overlay-scroll script applied (`settle`).
3. The site's CSS is what WordPress prints for the site: the theme's `theme.json` with the snapshot merged over it, turned into global styles (presets, the element styles for buttons, links and headings, core block styles), the colour roles, the theme's front-end sheets, the type scale, and the snapshot's own custom CSS (`site_css`). A snapshot sets far more than token values, so only the whole ranking gives a part's look.
4. The record's cascade reader (`computed.py::Page`) computes every element at 375, 768 and 1440 px. Element paths are the route's (`element_path`, ported from `scripts/parity/lib/ref-trace.mjs::elementPath`); the block's root is the element its wrapper attributes print on (`wp-block-sgs-<name>`).

## What a file holds

The keys `scripts/computed-route/lib/cache.mjs::loadCalibration` returned from calibration, in the same shape:

| Key | What |
|---|---|
| `elements[path][width][property]` | The default look, inherited properties left out (an inherited value the element sets itself is `_own:<property>`), with `_tag`, `_fs`, `_parentDisplay`, `_position`; `::before`, `::after` and `::placeholder` where drawn; `@controls`, `@companion`, `@scrim` for a panel the block opens outside its root, a piece it prints elsewhere and its scrim |
| `paintStates[name]` | `{when, elements}` for each paint state of the record's fixture |
| `discovered[setting][property]` | `{slots, values: {value: {width: computed}}}`: what each value of a setting whose values are not CSS keywords paints |
| `text`, `link`, `presence` | Where a text or link setting lands, and which parts a value shows or hides |

The renders behind `discovered`, `text`, `link` and `presence` are planned, and their readings folded, by calibration's own pure functions through `scripts/computed-route/tools/site-look-bridge.mjs`; the fold is ported here for speed and held equal to the route's by `tests/test_site_look.py::test_fold_matches_the_route`.

## Not read offline

- Values a front-end script computes at load from derived state (`sgs/form`'s active step: `state.isStepActive`).
- Sizes that need layout (an `auto` width): the cascade's own value is kept; the route compares sizes as declared.
- Content a site supplies that the fixture's stand-ins lack (an email address in the site options leaves `sgs/business-info`'s email layout empty).

`props.json` is the route's `lib/calibrate-props.mjs` property lists, kept here so a build needs no Node; `tests/test_site_look.py::test_property_lists_match_the_route` fails when they part.
