---
status: active
---

# Replace calibration with a checked setting record and calculated defaults

## Goal and why

Calibration (a slow browser measurement on a mirror) is how the route learns where each block setting paints and what each site's default look is, and its records went stale because nothing checked them. Bean's design (2026-11-21): one written record per block, kept right by an offline check that runs the block's real code, and each site's defaults calculated from the block, the theme with the site's snapshot, and the browser's fixed defaults. Done looks like: changing a block so a setting paints differently fails `npm run build` with the exact entries to add, remove or change; a clone on a scratch mirror runs with no calibration cache folder.

Evidence: the trial on `sgs/button`, `sgs/cart`, `sgs/form` and `sgs/nav-bar-menu` (`E:\sgs-tmp\setting-record-trial\REPORT.md`; its scripts are the reference implementation): 1,127 placements confirmed both ways; of 1,485 disagreements, 1,075 traced one by one or by a rule tied to code and 410 sorted by default into "the setting switches on a whole look" (a sample of 15 held, the rest unproven until Task 1's exact check); four planted faults caught; Mama's defaults 97.4 to 99.2% exact with every difference named.

## Approach

The record lives in the framework database (Bean's choice) the way the reference tables already do: one git-tracked data file per block under `plugins/sgs-blocks/scripts/data/setting-records/`, loaded by `dbschema/seed_reference_data.py` on every reseed (rows the file drops are deleted), read by the route (FP-1). The check compares a block's code with its file both ways. Every record is filled by script (the trial's method); no record is typed by hand.

**Standards for every fix this work makes or finds (Bean, 2026-11-21):** rendered output follows Spec 32 (tokens, no inline style); parts, panels and controls follow Specs 35 and 35A; each fix goes through the shared file for its control type instead of per-block hand work: the mandated component per type in Spec 35 PART O (the control-type contract; Spec 35A PART O holds its enforcement layers) and Spec 35A PART H (which component for which job), such as `SgsBorderControl`, `ResponsiveBoxControl`, `ShadowControl`, `SgsColourPanel`, `TypographyControls` with `sgs_typography_css_rule`, `BackgroundPanel` and `LinkPopoverField`, and the PHP helpers and editor components listed in `.claude/catalogues/helpers.md`; Spec 35A PART L (the per-block checklist) is the done test for any block a fix touches. A missing part declaration is generated from the check's printed-parts list, not written by hand.

## Out of scope

Solve and walker changes; client sites; new block features.

## Order

Everything lands before the 2026-11-28 cloning date (Bean, 2026-11-21 evening): the general cloning stream's test clones of all three sites run on the setting record. Order: Task 1 done; Task 2 reopened for its completion (zero unproven entries, Bean 2026-11-22), finished before Task 3; Task 3's reseed after the template-rework session's reseed A (published 2026-11-22), never at the same time as another session's, announced first; the general cloning session's per-device alignment migration is already published (`28b717a8c`, framework database sha256 `4e515c3b46cc`, 2026-11-22), so Task 3's reseed builds on `4e515c3b46cc` and the first library run covers the 19 blocks that migration changed; Task 4 (the route switch) after Task 3, its route commits sequenced with the general cloning session's route work. Plugin round 6 is published (framework database sha256 `8bdb7c8e3cd4`, regenerated files on `main` as `d5df8b68b`, 2026-11-22). Task 3's script and gate work runs now; its reseed runs once the records are written and the gate is in: it starts from the current published database (sha256 `4e515c3b46cc`) and is announced first to the template-rework session (`small-giants-wp-d8` on 2026-11-22) and the general cloning session. When the Task 3 build check prints entries for blocks the template-rework lanes changed (`sgs/cart`, `sgs/account`, order items, buy box, option picker, product card, gift order, icon list, the commerce look extensions), send that session the list: it adds them. Before Task 4, send that session the exact list of `scripts/computed-route` files Task 4 will change. That session is the local one named `small-giants-wp-3f` on 2026-11-22 (`ListAgents`). Task 5 joins the next plugin round.

## Risks

- The offline runner is shared: the PHPUnit suite renders through it (`tests/php/BlockHarnessRenderTrait.php` and the tests using it), as do `scripts/check-custom-colour-survives.py`, `scripts/check-motion-part-render-paths.py`, `scripts/qa/button-preset-parity.py`, `scripts/parity/extract-css-diff.js` and `tests/playwright/button-migration/probe.mjs`. Every Task 2 change is behind an opt-in flag the setting check alone turns on (Bean, 2026-11-21), and all of them run before and after with no flags (about 10 to 15 minutes, in the background).
- The browser pass writes posts on a mirror: it uses its own scratch copy of `local-mamas` (`scripts/local-wp/scratch-mirror.sh`), never the four shared mirrors, and drops it at the end.
- A stored reading may come from an older snapshot: match the paint key's md5 (Mama's form and menu readings used `7b0290ad1`).

## Session breaks

Read this plan and `git log --oneline -20`; take the first task whose Status is not done; rerun the previous task's Done-when check; continue.

## First action

Task 3: read the library proof run's reports (`E:\sgs-tmp\setting-record-task3\reports-b1\`, log `pass-b1.log`; `python plugins/sgs-blocks/scripts/setting-record/summarise.py` on the folder) and settle the largest cause bucket first; then `/code-review` the Task 3 commits (below) before anything consumes the check (the review is the first thing to do before the gate lands, about 30 minutes).

## Tasks

### Task 1: The check and the record format as repo tools
- **Why:** the proven check lives in a scratch folder. **Read first:** the trial's `check.py`, `probe.py`, `cascade.py`, `fill.py`, `plant.py`.
- **Changes:** new `plugins/sgs-blocks/scripts/setting-record/`: `check.py` (every setting run, compared both ways, parts in markup order, add/remove/change lists), setting instances generated from `block.json` (no calibration planner), the trial's cascade reader (nested `@media`, specificity), its vocabulary rules, a render cache keyed on the code, entries marked `value` or `switched-on`, fixtures that switch every part on (a framework menu with current, disabled and featured sub-links), the data-file schema, and a self-test whose planted faults must fail.
- **Touches:** the new folder only.
- **Done when:** `check.py --self-test` kills all four planted faults; the trial's four final records pass; and every switched-on entry is proved exactly, not sampled: for each, the cascade reader computes the part's property on the plain and the changed render and the value differs (the trial sorted 410 such entries by default and checked 15 by hand; an entry that fails is removed or re-filed).
- **Depends on:** none
- **Status:** done (`b6203c1e8`, `10fa92953`, `7c680fdc9`, this plan's commit). Results (outputs in `E:\sgs-tmp\setting-record-task1\`): Gate A, the trial's saved plans replayed on its code (`710f98de9`): 2,050 entries confirmed, 0 added; the only differences are 28 `-webkit-` twins folded and 16 forced-colours entries now under their real condition; 18 placements whose part the selector reader cannot name are listed apart. The 410: 323 proved by the cascade, 53 kept as blind (cause in the record's `unproved`), 29 `-webkit-` twins folded, 3 removed (`sgs/nav-bar-menu` burgerWidth restates the 44px tap floor the stylesheet already sets: same declaration with and without the setting, also at 152px), 2 part not named. Gate C, the block.json generator alone against the Gate B records: 0 removed, 0 changed on all four blocks, 796 entries of new coverage (every enum value, desktop-only per-device values). Final records (2,940 entries) pass `check.py` in shipping mode: 2,855 confirmed, 85 `runner` entries skipped; proof verdicts 2,228 proved, 620 blind (theme value 64, same value here 164, rule needs absent markup 96, script-built part 121, part not rendered 56, part printed nowhere 97, unnamed state 10, container query 12), 44 removed, 11 re-filed. `check.py --self-test` on `main`'s code, proof on: clean copy passes, 4 of 4 faults caught (345 s). On `main`'s code (post round 5) only sgs/button differs: 9 entries to add (`minWidth`, new in `193605a38`; `iconSize`, declared in `43c395b42`). Times: a cached check 4 s (button) to 18 s (form) without the proof; the proof 20 s to 7 min; a cold run of all four about 5 min. These figures were measured before the code review's fixes (Task 2, step 1); Task 2's join gives the current ones. Left for later tasks: the proof is not cached (Task 3, before the check joins the build); undeclared parts fail only with `--strict-parts` until Task 5 declares them. (The runner now reports the files a render loaded, `included-files.php`, and the stamp uses them; Task 3.)

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
- **Status:** done, with its completion (pushed to `main` 2026-11-22, the commits titled `setting record` from `feat(setting record): per-device override sweep` on).
- **Completion (Bean, 2026-11-22): zero unproven entries on the four blocks, and every setting accounted for.** Every entry is proved, or removed with code evidence; every setting is in the record, tested with no paint (`testedNoPaint`), reported as one that removes or replaces the block (`replacesBlock`), or untested with a reason (`unvalued`). Each mechanism is general, with a must-fail test (`tests/test_proof_faults.py`, `test_completion.py`, `test_lane_d.py`). The README's cause table names every mechanism.
  - **Results** (records in `E:\sgs-tmp\setting-record-task2\records-c6\`, reports in `reports-c6\`; measured on `main` at `8a9276450`): 3,059 entries, **0 unproven**; 2,906 proved offline, 147 more proved in Chromium (cart 95, form 52), 24 re-filed, 159 removed offline and 2 in Chromium. `unvalued` is empty on all four; `testedNoPaint` 215 settings; `replacesBlock` 22 (the five visibility conditions on each block, the menu's `ref`, the form's `formIsLinked`).

    | Block | Entries | Unproven | Removed | Tested, no paint | Replaces the block |
    |---|---|---|---|---|---|
    | sgs/button | 296 | 0 | 16 | 41 | 5 |
    | sgs/cart | 916 | 0 | 46 | 82 | 5 |
    | sgs/form | 1,102 | 0 | 38 | 53 | 6 |
    | sgs/nav-bar-menu | 745 | 0 (2 removed in Chromium) | 59 | 39 | 6 |

  - **Removals, checked by hand by kind:** a fallback under `@supports not (...)` a current Chromium never takes (42); a rule that restates the value the plain page already has, seen at two values of the setting (38); a per-device override swept over every value it overrides that never moves the part (16, cart `triggerStyleTablet`/`Mobile`); the same winning declaration with and without the setting, also with a second value and at the probe widths (35); a class no source prints (26, `sgs-form-field__error-message`, Task 5); a rule that can match nothing (4: an `a` inside an `a`, an `a` inside an element every template fills with escaped text).
  - **Wrong removals found and fixed on the way** (each now a must-fail test): a test value equal to the block's own value (cart `panelTitleFontWeight`); a phone-only setting the block's own narrow-container rule hid at 375px (form `stepNamesHidden`: widths between the sampled screens are now probed); a script-set class held on both pages (cart `hideWhenEmpty`, `showZero`); a placeholder of the wrong kind (button `inheritStyle` transitions); a token another setting of the block defines (menu `featuredBgHover`).
  - **No-flag before/after** (the pushed commits themselves: `c8a16bdfa`, `main` just before Task 2's completion, against `9055af682`, its last commit; `baseline.sh` and `compare.py` in `E:\sgs-tmp\setting-record-task2\`, outputs in `ba3\`, 2026-11-22): 206 block renders byte-identical; `check-custom-colour-survives`, `check-motion-part-render-paths` and the button migration probe identical; `button-preset-parity` 312 of 312 the same; PHPUnit 5,211 tests with identical per-test results. An earlier run's renders finished before the product stand-in gained `get_image()`, so this run on the final code is the one that counts.
  - **Gates:** suites 303 and 64 (scanner) passed; `check.py --self-test` 4 of 4 caught; `check-length-unit-partners`, `check-no-client-names` and `check-md-wrap` pass; `/code-review` (medium): ten findings, all fixed with tests.
  - **The browser pass** now also settles `script-set-token` entries and the menu (`browser/measure.cjs` opens the probed item's own panel); `--write-verdicts <build>` writes `browser/verdicts/<block>.json` stamped with the code hash. The scratch site is `local-mediatest-setrec2` (port 8166), built from `E:\sgs-tmp\wt-setrec-build` (a worktree with `node_modules`, for the next round's build). `main`'s fast gate tier was failing on other sessions' cart and container work, so that build ran webpack and the post-build steps without the gate step, for the scratch site only.
- **First pass, results (2026-11-21):** records in `E:\sgs-tmp\setting-record-task2\records\` (reports in `reports-join\`).
  - **Unproven, Task 1 to Task 2's first pass:** 620 to 237.

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
- **Changes:** one data file per block filled by script (agreement plus cause, as the trial did); tables `setting_placements`, `block_part_order` and `setting_record_blocks` (the stamp, the accounted-for lists and the whole data file) and `seed_reference_data.py::_seed_setting_records`; the check in the fast tier for changed blocks (without the proof) and the full tier for the same blocks (with it), never on the whole library as a gate (Bean, 2026-11-22).
  - The browser pass runs once per plugin round, before that round's records are written (Bean, 2026-11-21): one unattended command makes a scratch copy of `local-mamas`, runs `browser/prove_script_parts.py --write-verdicts <build>` on every entry left `script-built-part` or `script-set-token` across the blocks, and drops the copy (about 20 minutes; Task 2's pass took 3 minutes for the cart's 95). A verdict is applied only while its block's folder and `src/shared` hash the same (`check.py::script_hash`), so between rounds a changed block's script-built entries fall back to unproven, which is safe (the route never acts on an unproven kind). The pass knows how to put the cart's, the form's and the menu's script-built parts on screen; a block with new ones needs its own steps in `browser/measure.cjs`.
  - The four blocks' records written by Task 2 (`E:\sgs-tmp\setting-record-task2\records-c6\`) are the first four data files; rewrite them from the code at the reseed, as every other block's. Expect new unproven entries on other blocks: each needs the fixture or mechanism work Task 2 did for these four (a fixture that switches every part on, stand-ins for the records a setting names).
  - A setting that names a breakpoint (`sgs/nav-bar-menu` `collapsePoint`) keeps its literal tier as the comparison key and carries a symbolic annotation `{edge, setting, offset}` (Bean, 2026-11-22): the max edge is the value minus 0.02 (`includes/nav-menu-submenu-css.php` writes `media_width('max', $collapse_point - 1)` and `class-sgs-breakpoints.php::query_width` adds .98), the min edge is the value. The schema holds `symbolic`; the writer does not fill it yet.
  - **Decisions (Bean, 2026-11-22):**
    - `block_part_defaults` is dropped: nothing reads it, and Task 4's calculator renders and reads the theme itself (`E:\sgs-tmp\setting-record-trial\defaults.py`).
    - The check runs only on blocks that need it. Each record's stamp holds the hash of every input (the PHP files its renders loaded, the stylesheets it reads, its folder, its fixture) and of the theme rules that can reach its rendered elements (`stamp.py::select`); a change re-checks only the blocks it touches. For the core files every render loads (the plugin bootstrap) there are two stages: re-render, then compare and prove only when the output differs. `check.py --all` is for this task's first library fill only.
    - Task 3 edits no block code: block faults the check finds go to Task 5's list (or to the template-rework session for its blocks).
    - Free custom CSS (`sgsCustomCss`) is accounted for as not valued, with the reason that it paints whatever its text says.
    - Proof by match to Task 2 (Bean's proposal) was measured (`E:\sgs-tmp\setting-record-task3\review-match\`): it clears 29% of entries with a 0.9% leave-one-out error (3 of 335, all overrides from PHP or a parent block's stylesheet), while the full proof costs about 3 hours serial and under 1 hour on 12 cores. The full proof stays; matching becomes a cross-block consistency check (a fixture-gap finder for settings that paint nothing although a shared writer paints elsewhere: 337 candidates; a disagreement flag), and `check-wiring-fingerprint.py`'s verdict (it already classifies each setting as painting by CSS, by script or not at all, with a reason: `E:\sgs-tmp\setting-record-task3\review-gates\`) is the triage of "paints nothing".
- **Touches:** data files, schema, framework DB reseed, build gates.
- **Done when:** the library fill (`check.py --all`, this task only) passes with zero untraced entries and every switched-on entry proved by the cascade (as in Task 1), and a planted fault in one block fails `npm run build` through the changed-blocks check (`check.py --changed`). Every entry still unproven carries its cause, settled by Task 2's mechanisms where one applies (README).
- **Depends on:** 2
- **Status:** in progress: the first library fill. Built and on `main` (2026-11-22): every block has a fixture (`8f6a5cc11`: `seed_fixtures.py` copied 100 fixtures from the route's calibration fixtures and the motion render stand-ins; `_shared` partners; inline stand-ins; `included-files.php`), the library run and record format 2 (`780342ef2`: `check.py --all --jobs`, the coverage floor, stamp, `proofKeys`, `accounted`, entry values, `summarise.py`, `stamp.py`, Sass stylesheets, four proof faults fixed), the database pieces (`1565305e7`: migration `migrations/2026-11-22-setting-record-tables.py`, `seed_reference_data.py::_seed_setting_records`, `ship.py::RESEED_TRIGGERS` gains the records folder, dev-setup column meanings; not yet applied to the shared database), the measured-removal guard and shipped stylesheets (`64effd5be`), and stand-ins for six shop blocks that rendered nothing plus gallery's fixture shapes (`69a139695`). Tests: setting-record suite 322 of 322, `test_dbschema_tools_regressions.py` 21 of 21, `test_ship.py` 19 of 19.
  - **First library run without the proof (103 blocks):** 20,607 placements; 3,608 settings paint nothing; 475 replace the block; 141 not valued (106 "a per-device value of unknown kind"); 201 parts declared but not printed (35 blocks) and 305 printed but not declared (58 blocks); 993 placements whose part cannot be named; 3,983 failed renders, 99% in `sgs/buybox`, `sgs/nav-drawer-menu` and `sgs/nav-drawer`. `sgs/heading` with the fixes: 221 proved, 11 removed (10 `@supports not` fallbacks, 1 restated value), 0 unproven. The library run with the proof (`check.py --all --jobs 10`, output `E:\sgs-tmp\setting-record-task3\reports-b1\`) was started 2026-11-22 about 13:00 and takes about an hour.
  - **Runner gaps the run found** (a helper is fixing them behind the runner's opt-in flags, in `E:\sgs-tmp\wt-setrec-runner`, not merged): 45 plugin files register `render_block` filters and the runner loads 9; CSS attached with `wp_add_inline_style` is not read; WordPress and WooCommerce stand-ins are missing (`wp_get_attachment_url`, `wp_get_registered_image_subsizes`, the product attribute methods). The README's Known limits lists them.
  - **Not done:** `/code-review` of the Task 3 commits (before the gate lands: nothing consumes the check yet); the proof cache; `check.py --changed` and the gate rows; the symbolic annotation for breakpoint settings; the records in `plugins/sgs-blocks/scripts/data/setting-records/`; the reseed; the browser pass for the new blocks; block faults found, compiled into Task 5's list from the reports (not yet compiled). The full tier means the proof on the changed blocks, never the whole library.

### Task 4: Calculated defaults and the route switch
- **Why:** calibration's second job, then its retirement. **Read first:** the trial's `defaults.py` and `theme_css.php`; `scripts/computed-route/lib/cache.mjs::readPaint`, `lib/fill-dimensions.mjs::blockPaint`, `lib/fill-width-ladder.mjs`. **From the general cloning session (2026-11-21):** route consumers read more than the paint from `lib/cache.mjs::loadCalibration` (`settings`, `discovered`, `elements`, `parts`, `paintStates`, `paintKey`; `fill-width-ladder.mjs` reads `.settings[attr]`, `gate-chain.mjs` reads `.discovered[attr]`, skeleton propose reads `calSettings`; 44 non-test route files take `calFor`), so Task 4 keeps those keys or names each consumer it changes. Before touching `scripts/computed-route`, send that session the exact files and keys. Its fixes RW-1, RW-2 and RW-20 (`lib/fill-regap.mjs::reresolve`, the width ladder) land before Task 4 (general cloning plan, "Route work to the finished tool").
- **Changes:** the defaults calculator (snapshot to global styles, the theme's PHP and stylesheets, the browser table from Chromium 145 incl. form controls) writing the shape `readPaint` returns; the route reads placements from the database; the two pixel-size reads compare declared values; slot maps, paint files and `calibrate.mjs` retired; Spec 48's calibration requirements and the LEDGER updated. The route reads an entry's `unproved` field and never acts on that entry's kind as proven (a guessed `value` or `switched-on`).
- **Touches:** `scripts/computed-route`.
- **Done when:** route tests pass with no `scripts/computed-route/cache` folder, and a clone on a scratch mirror matches its last calibrated run (`site-check.mjs`).
- **Depends on:** 3
- **Status:** not started

### Task 5: Block faults the check found (next plugin round)
- **Why:** real faults, fixed to the standards above. **Read first:** REPORT.md "Block faults found".
- **Changes:** `sgs/form` error-text rule styling a class nothing prints; the file input covering the file label's hover rules; step circles reading a progress colour set outside them (`form/render.php` prints `--sgs-progress-colour` on `.sgs-form__progress`, and the step numbers sit in its sibling `.sgs-form__progress-steps`, so the active circle always shows the theme's primary); a menu hidden by a visibility condition still printing its detached burger (`nav-bar-menu/render.php` queues it for `wp_footer` before `includes/conditional-visibility.php::check_conditional_visibility` empties the block, so `includes/nav-detach-chip.php::sgs_nav_detach_chip_print_footer` prints it on a page where the menu is hidden); undeclared parts (button, cart, form, menu) generated into `supports.sgs.elements` from the check's list. Task 3's library run adds more: 201 parts declared but not printed (35 blocks) and 305 printed but not declared (58 blocks), listed per block in `E:\sgs-tmp\setting-record-task3\reports-b1\` (`summarise.py` buckets `declaredNotPrinted`, `printedNotDeclared` and `deadParts`; the list is not yet compiled into this task).
- **Touches:** those blocks.
- **Done when:** the check reports no block fault and no undeclared part for them.
- **Depends on:** 1
- **Status:** not started
