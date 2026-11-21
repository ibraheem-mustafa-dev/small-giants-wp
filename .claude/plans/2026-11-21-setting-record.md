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

Everything lands before the 2026-11-28 cloning date (Bean, 2026-11-21 evening): the general cloning stream's test clones of all three sites run on the setting record. Order: Task 1 (new files only) done; Task 2 (the shared offline runner, plus one browser pass for script-built parts) starts after Task 1's `/handoff` and a compact (Bean, 2026-11-21), announced to the general cloning session first; Task 3's reseed only after plugin round 5's reseed and publish, never at the same time, announced first; Task 4 (the route switch) after Task 3, its route commits sequenced with the general cloning session's route work. Handshake agreed with that session (2026-11-21): before Task 3, confirm with the session holding the general cloning work that plugin round 5's reseed and publish are done (its notice went to the session that wrote this plan, which may be closed); before Task 4, send that session the exact list of `scripts/computed-route` files Task 4 will change. Plugin round 5 is published (2026-11-21: framework database sha256 `507ef1f8cae7`, `main` at `7fc49e323`); Task 3's reseed starts from that database, still announced first. Task 5 joins the next plugin round.

## Risks

- The offline runner is shared: the PHPUnit suite renders through it (`tests/php/BlockHarnessRenderTrait.php` and the tests using it), as do `scripts/check-custom-colour-survives.py`, `scripts/check-motion-part-render-paths.py`, `scripts/qa/button-preset-parity.py`, `scripts/parity/extract-css-diff.js` and `tests/playwright/button-migration/probe.mjs`. Every Task 2 change is behind an opt-in flag the setting check alone turns on (Bean, 2026-11-21), and all of them run before and after with no flags (about 10 to 15 minutes, in the background).
- The browser pass writes posts on a mirror: it uses its own scratch copy of `local-mamas` (`scripts/local-wp/scratch-mirror.sh`), never the four shared mirrors, and drops it at the end.
- A stored reading may come from an older snapshot: match the paint key's md5 (Mama's form and menu readings used `7b0290ad1`).

## Session breaks

Read this plan and `git log --oneline -20`; take the first task whose Status is not done; rerun the previous task's Done-when check; continue.

## First action

Task 2: `ListAgents`, find the session holding the general cloning work, and send it the runner files Task 2 changes (`plugins/sgs-blocks/scripts/qa/lib/wp-stubs.php`, `render-css-harness.php`) and that the hook behaviour is opt-in (five minutes).

## Tasks

### Task 1: The check and the record format as repo tools
- **Why:** the proven check lives in a scratch folder. **Read first:** the trial's `check.py`, `probe.py`, `cascade.py`, `fill.py`, `plant.py`.
- **Changes:** new `plugins/sgs-blocks/scripts/setting-record/`: `check.py` (every setting run, compared both ways, parts in markup order, add/remove/change lists), setting instances generated from `block.json` (no calibration planner), the trial's cascade reader (nested `@media`, specificity), its vocabulary rules, a render cache keyed on the code, entries marked `value` or `switched-on`, fixtures that switch every part on (a framework menu with current, disabled and featured sub-links), the data-file schema, and a self-test whose planted faults must fail.
- **Touches:** the new folder only.
- **Done when:** `check.py --self-test` kills all four planted faults; the trial's four final records pass; and every switched-on entry is proved exactly, not sampled: for each, the cascade reader computes the part's property on the plain and the changed render and the value differs (the trial sorted 410 such entries by default and checked 15 by hand; an entry that fails is removed or re-filed).
- **Depends on:** none
- **Status:** done (`b6203c1e8`, `10fa92953`, `7c680fdc9`, this plan's commit). Results (outputs in `E:\sgs-tmp\setting-record-task1\`): Gate A, the trial's saved plans replayed on its code (`710f98de9`): 2,050 entries confirmed, 0 added; the only differences are 28 `-webkit-` twins folded and 16 forced-colours entries now under their real condition; 18 placements whose part the selector reader cannot name are listed apart. The 410: 323 proved by the cascade, 53 kept as blind (cause in the record's `unproved`), 29 `-webkit-` twins folded, 3 removed (`sgs/nav-bar-menu` burgerWidth restates the 44px tap floor the stylesheet already sets: same declaration with and without the setting, also at 152px), 2 part not named. Gate C, the block.json generator alone against the Gate B records: 0 removed, 0 changed on all four blocks, 796 entries of new coverage (every enum value, desktop-only per-device values). Final records (2,940 entries) pass `check.py` in shipping mode: 2,855 confirmed, 85 `runner` entries skipped; proof verdicts 2,228 proved, 620 blind (theme value 64, same value here 164, rule needs absent markup 96, script-built part 121, part not rendered 56, part printed nowhere 97, unnamed state 10, container query 12), 44 removed, 11 re-filed. `check.py --self-test` on `main`'s code, proof on: clean copy passes, 4 of 4 faults caught (345 s). On `main`'s code (post round 5) only sgs/button differs: 9 entries to add (`minWidth`, new in `193605a38`; `iconSize`, declared in `43c395b42`). Times: a cached check 4 s (button) to 18 s (form) without the proof; the proof 20 s to 7 min; a cold run of all four about 5 min. Left for later tasks: the proof is not cached (Task 3, before the check joins the build); `:not(:placeholder-shown)` needs a state name in the record's vocabulary (Task 3); undeclared parts fail only with `--strict-parts` until Task 5 declares them; the cache hash still re-renders every block on an `includes/` edit until the runner reports the files a render loaded (Task 2).

### Task 2: Offline runner fixes and the browser pass for script-built parts
- **Why:** most of Task 1's 620 kept-but-unproven entries are things the offline runner cannot see (theme values 64, parts switched off or printed at `wp_footer` 56, rule needs markup the render lacks 96, render_block filters and style-engine spacing in the `runner` entries); 121 sit on parts only a front-end script builds, which no offline runner can see. **Read first:** this plan's Task 1 results; `plugins/sgs-blocks/scripts/setting-record/README.md`; `scripts/qa/lib/render-css-harness.php` (argument parsing, the child renderer) and `wp-stubs.php::add_filter`, `::apply_filters`, `::do_action`, `::get_block_wrapper_attributes`, `::wp_style_engine_get_styles`; the trial's `theme_css.php` and `defaults.py::global_css`.
- **Touches:** the shared runner (`scripts/qa/lib/`); `scripts/setting-record/`; a scratch mirror `local-mediatest-setrec` (created and dropped here). No database, no deploy, no live or test site; the local scratch mirror is the only site (Bean, 2026-11-21).
- **Done when:** with no flags, the PHPUnit suite and the five runner scripts give the same output before and after; `check.py` on the four blocks with the new runner flags passes against records rewritten by script, with the `runner` entries now checked and the blind entries down by the theme, footer, filter and spacing causes (counts reported); every `script-built-part` entry is proved, removed with browser evidence or re-filed; `check.py --self-test` still kills four of four.
- **Depends on:** 1
- **Status:** not started

#### Orchestration (three lanes, file-disjoint; only the main session commits)
- [ ] Step 0, main, 5 min: the announcement (First action); worktree `E:\sgs-tmp\wt-setrec-t2` on `origin/main`; start the before run in the background on a clean copy of `main` (it is off the critical path): the PHPUnit suite (546 files, 170 render through the runner; `composer install` in the worktree, a copy, never a link) and the five runner scripts, outputs into `E:\sgs-tmp\setting-record-task2\before\`.
- [ ] Lane A, main session (owns `wp-stubs.php` and `render-css-harness.php`, so their edits stay in one hand): every change is opt-in, so every other user of the runner renders byte for byte as before (Bean, 2026-11-21): a hook table that registers and fires only under `--render-block-filters` (the plugin's `render_block` filters: `includes/device-visibility.php::inject_device_visibility_classes`, `includes/float-position.php::inject_float_position`) and `--print-footer` (`do_action('wp_footer')` listeners: `includes/helpers-scrim.php::sgs_scrim_print_footer`, the detached menu chip); WordPress's own behaviour under `--wp-fidelity`: `get_block_wrapper_attributes` adds `wp-block-sgs-<name>`, `wp_style_engine_get_styles` writes spacing (padding, margin, blockGap), the WP_Block stub carries `parsed_block` attributes; the runner's JSON gains `interactivityState` (what `wp_interactivity_state` collected) under `--interactivity-state`.
- [ ] Lane B, subagent (owns new or changed files in `scripts/setting-record/` only): `theme.py` (the theme's CSS and global styles from `theme/sgs-theme/theme.json` defaults, ported from the trial's `theme_css.php` and `defaults.py::global_css`, loaded into the proof's pages ahead of the block's sheets); Interactivity directives applied after render from `interactivityState` (`data-wp-bind--hidden`, `data-wp-class--*`, `data-wp-style--*`, as WordPress's server-side directive processing does) in `render.py`; `check.py` passes `--render-block-filters --print-footer --wp-fidelity --interactivity-state`; the `runner` and `theme-value` paths tested with must-fail cases. Interface with Lane A fixed before both start: the four flag names and the `interactivityState` key.
- [ ] Lane C, subagent (owns `scripts/setting-record/browser/`, new): `scratch-mirror.sh create local-mamas local-mediatest-setrec <free port 8090-8199>`, sync a gated build of `main` into it (`sync-build.sh local-mediatest-setrec`; build from the deploy cache `~/.cache/sgs-deploy/<key>/build` for `main`'s gated commit, else `npm ci && npm run build` in the worktree from PowerShell); `prove_script_parts.py` takes each `script-built-part` entry from the records, creates the plain and changed posts by WP-CLI (block markup from the instance's attributes), and a Playwright script opens both, puts the part on screen the way a shopper does (a basket item added, the cart opened; the free-delivery bar reached), reads the part's computed property at the entry's widths and state, and returns proved / removed / re-filed with the values. Parallel tabs, tuned: the first 12 pairs at 2, 4, 6 and 8 tabs, then the rest at the count with the best pairs per minute (the mirror's Apache workers cap it). Drop the mirror at the end.
- [ ] Join, main: the after run of the PHPUnit suite and the five scripts with no flags, compared with the before run (any difference stops the push until it is traced); rerun `check.py` on the four blocks with the new flags (`--write-dir` to rewrite the records by script), fold in Lane C's verdicts (proved entries lose `unproved`; removed ones go, with the browser value pair in the report), rerun `--self-test`, commit per lane (runner; check side; browser pass), push, tell the cloning session the runner changes landed.
- [ ] Estimate: about 1.5 hours (lanes A to C at once, about 45 minutes; join 30 minutes).

### Task 3: Every block's record, seeded and gated
- **Why:** the route needs every block's record, kept right on every change. **Read first:** `dbschema/seed_reference_data.py`, `dbschema/schema.sql`, `scripts/build-with-gates.mjs`.
- **Changes:** one data file per block filled by script (agreement plus cause, as the trial did); tables `setting_placements`, `block_part_order`, `block_part_defaults` and `seed_reference_data.py::_seed_setting_records`; the check in the fast tier for changed blocks and the full tier for all.
- **Touches:** data files, schema, framework DB reseed, build gates.
- **Done when:** `check.py --all` passes with zero untraced entries and every switched-on entry proved by the cascade (as in Task 1), and a planted fault fails `npm run build`.
- **Depends on:** 2
- **Status:** not started

### Task 4: Calculated defaults and the route switch
- **Why:** calibration's second job, then its retirement. **Read first:** the trial's `defaults.py` and `theme_css.php`; `scripts/computed-route/lib/cache.mjs::readPaint`, `lib/fill-dimensions.mjs::blockPaint`, `lib/fill-width-ladder.mjs`.
- **Changes:** the defaults calculator (snapshot to global styles, the theme's PHP and stylesheets, the browser table from Chromium 145 incl. form controls) writing the shape `readPaint` returns; the route reads placements from the database; the two pixel-size reads compare declared values; slot maps, paint files and `calibrate.mjs` retired; Spec 48's calibration requirements and the LEDGER updated.
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
