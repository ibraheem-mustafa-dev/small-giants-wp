---
status: active
---

# Replace calibration with a checked setting record and calculated defaults

## Goal and why

Calibration (a slow browser measurement on a mirror) is how the route learns where each block setting paints and what each site's default look is, and its records went stale because nothing checked them. Bean's design (2026-11-21): one written record per block, kept right by an offline check that runs the block's real code, and each site's defaults calculated from the block, the theme with the site's snapshot, and the browser's fixed defaults. Done looks like: changing a block so a setting paints differently fails `npm run build` with the exact entries to add, remove or change; a clone on a scratch mirror runs with no calibration cache folder.

Evidence: the trial on `sgs/button`, `sgs/cart`, `sgs/form` and `sgs/nav-bar-menu` (`E:\sgs-tmp\setting-record-trial\REPORT.md`; its scripts are the reference implementation): 1,127 placements confirmed both ways; of 1,485 disagreements, 1,075 traced one by one or by a rule tied to code and 410 sorted by default into "the setting switches on a whole look" (a sample of 15 held, the rest unproven until Task 1's exact check); four planted faults caught; Mama's defaults 97.4 to 99.2% exact with every difference named.

## Approach

The record lives in the framework database (Bean's choice) the way the reference tables already do: one git-tracked data file per block under `plugins/sgs-blocks/scripts/data/setting-records/`, loaded by `dbschema/seed_reference_data.py` on every reseed (rows the file drops are deleted), read by the route (FP-1). The check compares a block's code with its file both ways. Every record is filled by script (the trial's method); no record is typed by hand.

**Standards for every fix this work makes or finds (Bean, 2026-11-21):** rendered output follows Spec 32 (tokens, no inline style); parts, panels and controls follow Specs 35 and 35A; each fix goes through the shared file for its control type instead of per-block hand work: the mandated component per type in Spec 35A PART O (the control-type contract) and PART H (which component for which job), such as `SgsBorderControl`, `ResponsiveBoxControl`, `ShadowControl`, `SgsColourPanel`, `TypographyControls` with `sgs_typography_css_rule`, `BackgroundPanel` and `LinkPopoverField`, and the PHP helpers and editor components listed in `.claude/catalogues/helpers.md`; Spec 35A PART L (the per-block checklist) is the done test for any block a fix touches. A missing part declaration is generated from the check's printed-parts list, not written by hand.

## Out of scope

Solve and walker changes; client sites; new block features.

## Order

Everything lands before the 2026-11-28 cloning date (Bean, 2026-11-21 evening): the general cloning stream's test clones of all three sites run on the setting record. Order: Task 1 and Task 2 done; Task 3's reseed only after plugin round 6's reseed and publish (the general cloning session announced it on 2026-11-22 and will message when the new database is published), never at the same time, announced first; Task 4 (the route switch) after Task 3, its route commits sequenced with the general cloning session's route work. Handshake agreed with that session (2026-11-21, renewed 2026-11-22): before Task 3, wait for its message that plugin round 6's reseed and publish are done, with the new database sha256 (round 5's was `507ef1f8cae7`); Task 3's reseed starts from that database, announced first. Before Task 4, send that session the exact list of `scripts/computed-route` files Task 4 will change. That session is the local one named `small-giants-wp-3f` on 2026-11-22 (`ListAgents`). Task 5 joins the next plugin round.

## Risks

- The offline runner is shared: the PHPUnit suite renders through it (`tests/php/BlockHarnessRenderTrait.php` and the tests using it), as do `scripts/check-custom-colour-survives.py`, `scripts/check-motion-part-render-paths.py`, `scripts/qa/button-preset-parity.py`, `scripts/parity/extract-css-diff.js` and `tests/playwright/button-migration/probe.mjs`. Every Task 2 change is behind an opt-in flag the setting check alone turns on (Bean, 2026-11-21), and all of them run before and after with no flags (about 10 to 15 minutes, in the background).
- The browser pass writes posts on a mirror: it uses its own scratch copy of `local-mamas` (`scripts/local-wp/scratch-mirror.sh`), never the four shared mirrors, and drops it at the end.
- A stored reading may come from an older snapshot: match the paint key's md5 (Mama's form and menu readings used `7b0290ad1`).

## Session breaks

Read this plan and `git log --oneline -20`; take the first task whose Status is not done; rerun the previous task's Done-when check; continue.

## First action

Task 3: check for the general cloning session's message that plugin round 6 is published (its new database sha256); until it arrives, build Task 3's script and gate changes, which need no reseed (five minutes to check).

## Tasks

### Task 1: The check and the record format as repo tools
- **Why:** the proven check lives in a scratch folder. **Read first:** the trial's `check.py`, `probe.py`, `cascade.py`, `fill.py`, `plant.py`.
- **Changes:** new `plugins/sgs-blocks/scripts/setting-record/`: `check.py` (every setting run, compared both ways, parts in markup order, add/remove/change lists), setting instances generated from `block.json` (no calibration planner), the trial's cascade reader (nested `@media`, specificity), its vocabulary rules, a render cache keyed on the code, entries marked `value` or `switched-on`, fixtures that switch every part on (a framework menu with current, disabled and featured sub-links), the data-file schema, and a self-test whose planted faults must fail.
- **Touches:** the new folder only.
- **Done when:** `check.py --self-test` kills all four planted faults; the trial's four final records pass; and every switched-on entry is proved exactly, not sampled: for each, the cascade reader computes the part's property on the plain and the changed render and the value differs (the trial sorted 410 such entries by default and checked 15 by hand; an entry that fails is removed or re-filed).
- **Depends on:** none
- **Status:** done (`b6203c1e8`, `10fa92953`, `7c680fdc9`, this plan's commit). Results (outputs in `E:\sgs-tmp\setting-record-task1\`): Gate A, the trial's saved plans replayed on its code (`710f98de9`): 2,050 entries confirmed, 0 added; the only differences are 28 `-webkit-` twins folded and 16 forced-colours entries now under their real condition; 18 placements whose part the selector reader cannot name are listed apart. The 410: 323 proved by the cascade, 53 kept as blind (cause in the record's `unproved`), 29 `-webkit-` twins folded, 3 removed (`sgs/nav-bar-menu` burgerWidth restates the 44px tap floor the stylesheet already sets: same declaration with and without the setting, also at 152px), 2 part not named. Gate C, the block.json generator alone against the Gate B records: 0 removed, 0 changed on all four blocks, 796 entries of new coverage (every enum value, desktop-only per-device values). Final records (2,940 entries) pass `check.py` in shipping mode: 2,855 confirmed, 85 `runner` entries skipped; proof verdicts 2,228 proved, 620 blind (theme value 64, same value here 164, rule needs absent markup 96, script-built part 121, part not rendered 56, part printed nowhere 97, unnamed state 10, container query 12), 44 removed, 11 re-filed. `check.py --self-test` on `main`'s code, proof on: clean copy passes, 4 of 4 faults caught (345 s). On `main`'s code (post round 5) only sgs/button differs: 9 entries to add (`minWidth`, new in `193605a38`; `iconSize`, declared in `43c395b42`). Times: a cached check 4 s (button) to 18 s (form) without the proof; the proof 20 s to 7 min; a cold run of all four about 5 min. These figures were measured before the code review's fixes (Task 2, step 1); Task 2's join gives the current ones. Left for later tasks: the proof is not cached (Task 3, before the check joins the build); undeclared parts fail only with `--strict-parts` until Task 5 declares them; the cache hash still re-renders every block on an `includes/` edit until the runner reports the files a render loaded (Task 3).

### Task 2: Offline runner fixes and the browser pass for script-built parts
- **Why:** Task 1 kept 620 entries it could not prove, and its code review confirmed seven defects. Each unproven cause needed a mechanism that works on any block before Task 3 runs the check on about 100 of them.
- **Changes:** the review's defects (`30b0a2472`). The offline runner's four opt-in flags, which only the setting check passes (`render-css-harness.php`, `wp-stubs.php`; `d56974c46`, `3081a198b`):
  - `--render-block-filters`: the plugin's markup filters, plus the CSS they attach to the page.
  - `--print-footer`: what `wp_footer` prints.
  - `--wp-fidelity`: WordPress's wrapper class `wp-block-sgs-<name>` and its spacing styles.
  - `--interactivity-state`: the Interactivity state.

  `theme.py` (the theme in the proof). A mechanism for every cause, listed in the README's cause table. Kept browser verdicts (`browser/verdicts/`, applied while `check.py::script_hash` matches). The browser pass (`browser/`). Join fixes (`1b0904518`, `1f613c097`, `5e6f041e7`).
- **Done when:** met.
  - With no flags, the PHPUnit suite and the runner's other users give the same output before and after: 5,151 tests with identical per-test results, 206 block renders byte-identical, `check-custom-colour-survives`, `check-motion-part-render-paths` and the button migration probe identical, and `button-preset-parity` 312 of 312 the same.
  - `check.py` on the four blocks, with the flags and the proof on, passes against records rewritten by script: 3,006 entries confirmed, nothing to add, remove or change, and no `runner` entry left.
  - Every `script-built-part` entry is settled: 121 proved in Chromium.
  - Every Lane D mechanism is general, with a must-fail test.
  - `check.py --self-test` kills 4 of 4.
- **Status:** done. Records are in `E:\sgs-tmp\setting-record-task2\records\` (reports in `reports-join\`).
  - **Unproven, Task 1 to Task 2:** 620 to 237.

    | Cause | Task 1 | Task 2 |
    |---|---|---|
    | same value here | 164 | 111 |
    | rule needs markup the render lacks | 96 | 63 |
    | part not rendered | 56 | 44 |
    | theme value | 64 | 15 |
    | part printed elsewhere | (new cause) | 4 |
    | script-built part | 121 | 0 |
    | class printed nowhere | 97 | 0 |
    | container query | 12 | 0 |
    | unnamed state | 10 | 0 |

  - **Proof:** 2,639 proved, 20 re-filed, 59 removed (26 of them dead CSS: `sgs/form`'s `sgs-form-field__error-message`, for Task 5).
  - **Runner entries:** 84 of Task 1's 85 are now seen by the check. The 85th, `sgs/form` `fieldFocusRingColour` box-shadow, is painted by the theme's focus rule, whose stylesheet the diff does not read.
  - **Browser pass:** 8 tabs was fastest (about 12 pairs a minute).
  - **Times:** a cached check with the proof takes 1 minute (button) to 15 minutes (form).
  - **Found along the way and fixed:**
    - Blocks scope their rules `.uid.wp-block-sgs-<name>`, which the runner never printed.
    - A helper part (`.sgs-scrim`) passing its custom property on was read as another block shadowing it.
    - A class a setting adds changed the element's identity.
    - Rules wrapped whole in `:where()` named no part.
    - The fixture menu had no plain sub-link, so `submenuColour` showed nowhere.
    - Its links had no description, so no badge printed.
- **Depends on:** 1

### Task 3: Every block's record, seeded and gated
- **Why:** the route needs every block's record, kept right on every change. **Read first:** `dbschema/seed_reference_data.py`, `dbschema/schema.sql`, `scripts/build-with-gates.mjs`.
- **Changes:** one data file per block filled by script (agreement plus cause, as the trial did); tables `setting_placements`, `block_part_order`, `block_part_defaults` and `seed_reference_data.py::_seed_setting_records`; the check in the fast tier for changed blocks and the full tier for all.
  - The browser pass runs once per plugin round, before that round's records are written (Bean, 2026-11-21): one unattended command makes a scratch copy of `local-mamas`, runs `browser/prove_script_parts.py` on every entry left `script-built-part` or `part-printed-elsewhere` across the blocks, writes `browser/verdicts/<block>.json` and drops the copy (about 20 minutes). A verdict is applied only while its block's folder and `src/shared` hash the same (`check.py::script_hash`), so between rounds a changed block's script-built entries fall back to unproven, which is safe (the route never acts on an unproven kind). The pass knows how to put the cart's and form's script-built parts on screen; a block with new ones needs its own steps in `browser/measure.cjs`.
  - Render a block inside its fixture's `parents` (the `parents` key is in `fixtures.json` but nothing renders it yet), so a rule scoped by the parent (`sgs/nav-bar-menu`'s `triggerSurface` on `.sgs-site-header-row:has(.sgs-nav-bar-menu)`, cause `part-printed-elsewhere`) is proved offline instead of in the browser.
  - The four blocks' records written by Task 2 (`E:\sgs-tmp\setting-record-task2\records\`) are the first four data files; rewrite them from the code at the reseed, as every other block's.
- **Touches:** data files, schema, framework DB reseed, build gates.
- **Done when:** `check.py --all` passes with zero untraced entries and every switched-on entry proved by the cascade (as in Task 1), and a planted fault fails `npm run build`. Every entry still unproven carries its cause, settled by Task 2's mechanisms where one applies (README).
- **Depends on:** 2
- **Status:** not started

### Task 4: Calculated defaults and the route switch
- **Why:** calibration's second job, then its retirement. **Read first:** the trial's `defaults.py` and `theme_css.php`; `scripts/computed-route/lib/cache.mjs::readPaint`, `lib/fill-dimensions.mjs::blockPaint`, `lib/fill-width-ladder.mjs`. **From the general cloning session (2026-11-21):** route consumers read more than the paint from `lib/cache.mjs::loadCalibration` (`settings`, `discovered`, `elements`, `parts`, `paintStates`, `paintKey`; `fill-width-ladder.mjs` reads `.settings[attr]`, `gate-chain.mjs` reads `.discovered[attr]`, skeleton propose reads `calSettings`; 44 non-test route files take `calFor`), so Task 4 keeps those keys or names each consumer it changes. Before touching `scripts/computed-route`, send that session the exact files and keys. Its fixes RW-1, RW-2 and RW-20 (`lib/fill-regap.mjs::reresolve`, the width ladder) land before Task 4 (general cloning plan, "Route work to the finished tool"); plugin round 6's reseed comes before Task 3's, each announced.
- **Changes:** the defaults calculator (snapshot to global styles, the theme's PHP and stylesheets, the browser table from Chromium 145 incl. form controls) writing the shape `readPaint` returns; the route reads placements from the database; the two pixel-size reads compare declared values; slot maps, paint files and `calibrate.mjs` retired; Spec 48's calibration requirements and the LEDGER updated. The route reads an entry's `unproved` field and never acts on that entry's kind as proven (a guessed `value` or `switched-on`).
- **Touches:** `scripts/computed-route`.
- **Done when:** route tests pass with no `scripts/computed-route/cache` folder, and a clone on a scratch mirror matches its last calibrated run (`site-check.mjs`).
- **Depends on:** 3
- **Status:** not started

### Task 5: Block faults the check found (next plugin round)
- **Why:** real faults, fixed to the standards above. **Read first:** REPORT.md "Block faults found".
- **Changes:** `sgs/form` error-text rule styling a class nothing prints; the file input covering the file label's hover rules; step circles reading a progress colour set outside them; undeclared parts (button, cart, form, menu) generated into `supports.sgs.elements` from the check's list.
- **Touches:** those blocks.
- **Done when:** the check reports no block fault and no undeclared part for them.
- **Depends on:** 1
- **Status:** not started
