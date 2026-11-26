# site-look: what each SGS block looks like by default on one site

The cloning route needs two things about a block: where each of its settings paints, and what the block looks like by default on the client's site. The first is the setting record (`../setting-record/`, in the framework database). The second is the site look, built here offline from the block's code and the site's theme snapshot. It gives the route each block's default paint with no site and no browser; calibration's browser measurement of it is retired (setting-record plan, Task 4; Bean 2026-11-23).

## Use

```
python site_look.py --snapshot sites/<client>/theme-snapshot.json --site <site> --out DIR --blocks sgs/button,sgs/cart [--woocommerce]
python site_look.py --snapshot ... --site <site> --out DIR --all --jobs 4
python -m pytest tests                     each mechanism has a test that fails with SITE_LOOK_MUTATE=<mechanism>
```

A block's file is rebuilt only when its key changes: the code of this builder and the setting-record modules it reads (`builder_hash`, through `stamp.py::code_hash`, so a comment or docstring edit rebuilds nothing), the block's render code (the record renderer's code hash), the block's fixture entry as written, the snapshot, every plugin and theme stylesheet, and the switches in force. A warm build takes seconds a block; a cold one renders through the record's runner (renders cached under `SGS_SETTING_RECORD_CACHE`).

The key also holds `reach_hash()`: every Python module the builder imports (found by reading the `import` statements and the `.py` names it loads, `py_modules`), the route files its bridge runs and the data they read (`js_modules` follows `import`, `require` and `new URL(..., import.meta.url)` from `scripts/computed-route/tools/site-look-bridge.mjs`), the build's stylesheet rewriters (`setting-record/shipped-css.js`, `shadow-lift`, `hover-guard`, `shadow-fallback`), the theme's overlay script, and the framework database (`$SGS_FRAMEWORK_DB`, else the shared one). A new import is picked up on its own; `tests/test_look_store.py` fails if a module the builder loads is left out.

## The shared look store

| Setting | Effect |
|---|---|
| `SGS_LOOK_STORE` unset | looks are kept in and read from `E:/sgs-tmp/look-store/<site>/<block>.<key>.json`, shared by every checkout on the machine |
| `SGS_LOOK_STORE=<folder>` | the same, in that folder |
| `SGS_LOOK_STORE=` (empty) | no store: every look is built in the checkout, as before |

`write_block` looks in the checkout's own file first (`current`), then in the store (`current (store)`: the file is copied to the checkout, no build), then builds and writes the store copy by a temp name and a rename, so two processes building one key at once leave one whole file. A store file that does not parse, or names another block or key, is ignored and replaced. A look whose text names the checkout's folder (a PHP error message can) is not stored. A block's store files unused for 14 days are removed when its next look is stored. The route needs no change: `lib/setting-record.mjs::prepareLooks` and `siteLook` start the builder with the caller's environment, and `current (store)` counts as done.

## Facts every client shares

The value forms a setting takes (`settingFacts[*].forms`, 57% of a look's renders) and the content facts (`text`, `presence`, `link`) come out the same for every client, so `write_block` reads them once a code version and puts them in each client's look:

| Step | What happens |
|---|---|
| Shared reading | `shared_facts` reads them under the theme's own `theme.json` (`neutral_snapshot`: no client tokens, no custom CSS) and keeps them in `<out>/_shared/<block>[.woocommerce].json` and the store's `_shared/<block>.<key>.json`, keyed by `shared_key` (the look's key without the snapshot; the `--woocommerce` flag stays in it) |
| Client reading | `build_block(..., parts=CLIENT_PARTS, shared=...)` reads everything else (default paint, paint states, `discovered`, state looks, and the `slug` value form, whose marker is the client's own palette colour: `CLIENT_FORMS`) under the client's CSS and puts the shared facts in place (`with_forms`, `with_content`), in the order one whole reading gives |
| Read whole instead | the client's custom CSS has a rule whose required classes are all on a page the shared facts were read from (`custom_css_reaches`; a rule needing no class, or a palette `has-` class, counts as reaching), a render behind the shared facts failed, or `--per-client-facts` is given |

Proof: every block's look for Mama's, Indus and Eye Care, built with and without `--per-client-facts` at the same commit, is identical as canonical JSON (`tests/test_shared_facts.py` holds the assembly order, the key and the guard). Switches: `shared-facts` (read whole always), `shared-guard`, `shared-errors`.

A block with many settings reads many pages (a page is one render under one held state): `sgs/nav-bar-menu` has 873 marked renders (the lengths of the `discover`, `content`, `forms` and `states` lists printed by `node scripts/computed-route/tools/site-look-bridge.mjs plan sgs/nav-bar-menu sites/<client>/theme-snapshot.json`) and builds in about ten minutes warm and under 1 GB (`python site_look.py --snapshot sites/mamas-munches-redesign/theme-snapshot.json --site mamas-munches-redesign --out DIR --blocks sgs/nav-bar-menu --jobs 1 --woocommerce`, run time and the peak resident memory of the process tree sampled with psutil). The Reader (`site_look.py::Reader.page`) keeps the `PAGE_KEEP` most recently used pages and every reading, so memory does not grow with the page count. The route's `lib/setting-record.mjs::prepareLooks` builds a block again, alone with one worker, only when the builder's failure looks like running out of room (a killed worker, `MemoryError`, nothing printed for the block); any other failure is final, and a block that failed stays failed for the process, with the builder's own words as its reason.

## How a block's look is read

1. Each variant's default render and each paint state (the setting record's plan and fixtures, `../setting-record/fixtures.json`) is rendered by the record's runner (`render.py`), from the fixture's `attributes` alone: the plain block a new node renders. The `checkAttributes` the record check adds to test a part (a shown label, a background image) never reach the look, since a part the draft's element lacks makes the route refuse that element as the block's part (`scripts/computed-route/lib/fill-part-pairing.mjs::rootIsPart`). Switch: `plain-fixture` (and `fixture-key` for the key).
2. The render is drawn as a page draws it: inside a section (an `sgs/container`, the way a page draws every block; straight inside the post content the theme's constrained layout would cap its width). An `sgs/container` is drawn inside one too, as every section of a cloned page sits inside the page's root container, so its default is a nested section's: the snapshot's section padding (Spec 32 FR-32-15) skips a nested section. The block's root is the first element of its own `wp-block-sgs-<name>` class that is not the section's root (`SECTION_ROOT_ATTR` marks it). A block whose fixture names parents is drawn inside them instead (`proof.py::Pages`). What `wp_footer` printed is moved to the end of `<body>` and the theme's overlay-scroll script applied (`settle`).
3. The site's CSS is what WordPress prints for the site: the theme's `theme.json` with the snapshot merged over it, turned into global styles (presets, the element styles for buttons, links and headings, core block styles), the colour roles, the theme's front-end sheets, the type scale, and the snapshot's own custom CSS (`site_css`). A snapshot sets far more than token values, so only the whole ranking gives a part's look.
4. The record's cascade reader (`computed.py::Page`) computes every element at 375, 768 and 1440 px. Element paths are the route's (`element_path`, ported from `scripts/parity/lib/ref-trace.mjs::elementPath`); the block's root is the element its wrapper attributes print on (`wp-block-sgs-<name>`).

## What a file holds

The keys `scripts/computed-route/lib/cache.mjs::loadCalibration` hands the route's readers, which keep the shape calibration gave them:

| Key | What |
|---|---|
| `elements[path][width][property]` | The default look, inherited properties left out (an inherited value the element sets itself is `_own:<property>`), with `_tag`, `_fs`, `_parentDisplay`, `_position`; `::before`, `::after` and `::placeholder` where drawn; `@controls`, `@companion`, `@scrim` for a panel the block opens outside its root, a piece it prints elsewhere and its scrim |
| `pathClasses[path]`, `pathAttrs[path]` | Each element's classes, and the attributes it carries that a rule of the site's CSS tests (`site_look.py::tested_attrs`: the names in the stylesheets' attribute selectors, read with every declaration block emptied so a value such as a named grid line is never one, `class` and `style` aside; an element with none is left out): the item the fixture saves open carries `{open: ''}`, the current link `{aria-current: 'page'}`. The route's accordion pairing reads which fixture child is open from it (`scripts/computed-route/lib/skeleton-child-slots.mjs::unitSlots`). Switch: `path-attrs` |
| `paintStates[name]` | `{when, elements}` for each paint state of the record's fixture |
| `discovered[setting][property]` | `{slots, values: {value: {width: computed}}}`: what each value of a setting whose values are not CSS keywords paints |
| `text`, `link`, `presence` | Where a text or link setting lands, and which parts a value shows or hides |

The renders behind `discovered`, `text`, `link` and `presence` are planned, and their readings folded, by the pure functions the route kept from calibration (`lib/calibrate*.mjs`), through `scripts/computed-route/tools/site-look-bridge.mjs`; the fold is ported here for speed and held equal to the route's by `tests/test_site_look.py::test_fold_matches_the_route`.

## Not read offline

- Values a front-end script computes at load from derived state (`sgs/form`'s active step: `state.isStepActive`).
- Sizes that need layout (an `auto` width): the cascade's own value is kept; the route compares sizes as declared.
- Content a site supplies that the fixture's stand-ins lack (an email address in the site options leaves `sgs/business-info`'s email layout empty).

`props.json` is the route's `lib/calibrate-props.mjs` property lists, kept here so a build needs no Node; `tests/test_site_look.py::test_property_lists_match_the_route` fails when they part.
