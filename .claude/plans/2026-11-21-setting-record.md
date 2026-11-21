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

Everything lands before the 2026-11-28 cloning date (Bean, 2026-11-21 evening): the general cloning stream's test clones of all three sites run on the setting record. Order: Task 1 (new files only) now; Task 2 (the shared offline runner) next, announced to the general cloning session first; Task 3's reseed only after plugin round 5's reseed and publish, never at the same time, announced first; Task 4 (the route switch) after Task 3, its route commits sequenced with the general cloning session's route work. Handshake agreed with that session (2026-11-21): before Task 3, confirm with the session holding the general cloning work that plugin round 5's reseed and publish are done (its notice went to the session that wrote this plan, which may be closed); before Task 4, send that session the exact list of `scripts/computed-route` files Task 4 will change. Task 5 joins the next plugin round.

## Risks

- The offline runner is shared with other gates: Task 2 runs the full gate tier before and after and lists every changed output.
- A stored reading may come from an older snapshot: match the paint key's md5 (Mama's form and menu readings used `7b0290ad1`).

## Session breaks

Read this plan and `git log --oneline -20`; take the first task whose Status is not done; rerun the previous task's Done-when check; continue.

## First action

Read the four-block table and the runner gaps in `E:\sgs-tmp\setting-record-trial\REPORT.md` (five minutes).

## Tasks

### Task 1: The check and the record format as repo tools
- **Why:** the proven check lives in a scratch folder. **Read first:** the trial's `check.py`, `probe.py`, `cascade.py`, `fill.py`, `plant.py`.
- **Changes:** new `plugins/sgs-blocks/scripts/setting-record/`: `check.py` (every setting run, compared both ways, parts in markup order, add/remove/change lists), setting instances generated from `block.json` (no calibration planner), the trial's cascade reader (nested `@media`, specificity), its vocabulary rules, a render cache keyed on the code, entries marked `value` or `switched-on`, fixtures that switch every part on (a framework menu with current, disabled and featured sub-links), the data-file schema, and a self-test whose planted faults must fail.
- **Touches:** the new folder only.
- **Done when:** `check.py --self-test` kills all four planted faults; the trial's four final records pass; and every switched-on entry is proved exactly, not sampled: for each, the cascade reader computes the part's property on the plain and the changed render and the value differs (the trial sorted 410 such entries by default and checked 15 by hand; an entry that fails is removed or re-filed).
- **Depends on:** none
- **Status:** not started

### Task 2: Offline runner fixes
- **Why:** 128 trial disagreements were things the runner cannot see. **Read first:** REPORT.md runner gaps; `scripts/qa/lib/render-css-harness.php`, `wp-stubs.php`.
- **Changes:** fire the plugin's `render_block` filters; print the `wp_footer` queue; style-engine spacing; the `wp-block-sgs-<name>` wrapper class; `parsed_block` attributes; Interactivity directives from the block's initial state; theme CSS available to the check.
- **Touches:** the shared offline runner.
- **Done when:** the trial's four blocks rerun with no runner-side cause left; full gate tier output unchanged apart from listed improvements.
- **Depends on:** 1
- **Status:** not started

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
