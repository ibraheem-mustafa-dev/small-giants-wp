---
status: active
---

# Clone fixes before 28 November, then the block editor clean-up, in parallel tracks

**Goal and why:** Bean must clone SGS and MIC from Claude Design drafts by 2026-11-28 with no hand fixes. Phases 1 to 3 hold only what the clones need. Phase 4 is the block editor clean-up Bean approved on 2026-11-25, and runs after the deadline. Done for the deadline means: tonight's branch work and the clone root fixes are on `main`, the offline reclone of Mama's, Eye Care and Indus improves on every named surface with nothing worse, the render fixes are deployed to the test sites, and Bean's eye check passes.

**Evidence:** every proposal below comes from a read-only investigation dated 2026-11-25 in `E:\sgs-tmp\general-cloning\investigate\` (cited as `iN`). The fix groups RF1 to RF10 and the Restore map come from `.claude/plans/2026-11-24-clone-root-fixes.md`; this plan governs where they differ.

**How it runs:** at most 6 workers at once and 2 heavy runs (sweep, full suite, browser). Every worker's TEMP, TMP and TMPDIR point at `E:\sgs-tmp\tmp-<label>`. Workers commit on their own `fix/<label>` branch in an `E:\sgs-tmp\wt-<label>` worktree. The main session reviews each branch (`/code-review`, its tests, its stale mutation markers), then merges. There is no pre-commit gate (Bean, 2026-11-25). Combined checks run once per phase, not per branch, and a branch is bisected only when the combined check shows something worse. Deploys run last, one at a time. Mama's is the live shop: run `backup-remote-db.sh` before any content edit, and check basket, checkout and account before and after. `eye-care-test` is Bean's site: change it only at a deploy Bean approves.

**Out of scope:** the text-only trust bar style (Bean: not restored); the chrome style choices' repair (deferred, Task 30).

**Risks:** worker API credits are exhausted, so workers run as Agent-tool subagents and the session's usage needs watching. Tracks C and D both touch `site-look/site_look.py`, in different functions (`build_block` against `record_facts`), so merge them carefully.

**First action (5 minutes):** in PowerShell, `cd plugins/sgs-blocks; npm ci; npm run build` (the main checkout's `node_modules` has been empty since 2026-11-23).

## Phase 1: start now (Track 0 first, then all tracks in parallel)

### Task 1: Track 0, a safe machine (main session)
Why: the workers' system temp was on C:, which filled it and crashed the PC. Dead workers also left slot locks that blocked every sweep (`i1`). Read first: `~/.claude/skills/delegate/scripts/api-agent.py::main`, `scripts/computed-route/tools/run-tests.mjs`, `tools/route-sweep.mjs`.

Changes: `api-agent.py` sets temp to `E:\sgs-tmp\tmp-<label>` (a `~/.claude` change: restore-point commit first). `run-tests.mjs` and `route-sweep.mjs` refuse to start with temp on C:. Slot locks record the owner's process id and free a dead owner's slot. A `tests/lib/tmp.mjs::scratchDir` helper, plus a detector that moves the 85 leaking tests and the plugin's Python checks onto it. A one-off clear-out of C: temp leftovers. `npm ci` and build.

Done when: a full suite run leaves the C: temp entry count unchanged, the detector lists 0 leaks, and killing a sweep frees its slot within one poll. Depends on: none. Status: not started.

### Task 2: Track A, branch fixes, then land tonight's branches (main session plus 2 workers)
Why: the parts already built are proven, but four branches change behaviour nobody asked for, and 17 mutation markers are stale (`i1`). Read first: `i1-branches.out`.

Changes:
- rf1: set `node.drawnVariants` where the skeleton sees a variant, so featured items get their look.
- rf6: the header padding easing is written only from the draft; finish its in-flight cherry-pick.
- cart-trigger: the merged basket background settings become per device, and Mama's renders identically.
- rf4: restore the two deleted open-status tests.
- rf3: mega-panel cap and padding per device.
- rf5: write `tests/tolerance-literals.test.mjs`, and move its hand-written property tables into the DB.
- rf8: update `build-foundation.test.mjs`.
- rf2: a test for the Indus header slot, and the basket gap from the computed font size.
- Resolve the rf5/rf6 and rf3/rf7 conflicts. The `layout` branch is not started, so it is dropped (its items move to Tasks 8 and 9).

Done when: all 11 branches are merged; the full suite and `check-mutation-lists.mjs` pass; and one combined sweep (before against after) shows no surface worse. Depends on: 1. Status: not started.

### Task 3: Track C, every block part findable (1 worker)
Why: broken test content makes 726 of the drawer's 1,088 offline renders empty, so parts such as the trailing icon are never drawn. The site look also throws away part positions it already reads (`i15`). Read first: `i15-parts.out`, `i5-pairing.out`.

Changes: repair the record fixtures in `setting-record/fixtures.json` (the drawer's menu ref and unfilled placeholders, then business-info, social-icons and trust-bar). Add a check that fails any fixture variant that renders empty. `site_look.py::build_block` keeps non-default part positions as `conditionalParts`, and pairing offers them only when the default parts fail. Make the record's parts list a completeness check. Pick the block mode from the draft before pairing (bare against circled icon).

Done when: offline pairing gives 0 problems on Mama's drawer and Eye Care's drawer, and Mama's trust-strip icon colour is written. Depends on: 1. Status: not started.

### Task 4: Track D, choice readings and underlines (1 worker)
Why: `resolve-enum.mjs::holdsValue` and `::mapTiers` read `enumReads`, which only the retired calibration wrote, so 9 ties in the proof never broke. This includes Mama's 7 underlines (`i10`).

Changes: `tools/site-look-bridge.mjs::planFor` passes on the per-value instances, `site_look.py::record_facts` reads them, and `setting-record.mjs::settingEntry` copies `enumReads` (including default and hover). Fill reads the three underline looks by the table in `i10` (plus the sweep reads). Merge `sgs/account`'s duplicate empty-orders padding and min height. Run render-scope first, because up to 948 Fill writes may change.

Done when: Mama's 7 underline ties resolve. Depends on: 1. Status: not started.

### Task 5: Track G1, render fixes on every site (1 worker)
Why: proven block bugs that render wrong today (`i9`, `i13`).

Changes:
- Card grid: the frame owns padding, height and ratio, so logos are not cropped (PHP and JS emitters).
- Product card: the placeholder takes the photo's ratio or height.
- Brand strip: `sizes` uses the slot width, not the height cap. Add an off-by-default "even visual size" setting: equal ink area, scaled until the largest logo fits the slot like "fit".
- Media panel: a "Trim empty edges" button that saves a trimmed copy and keeps the original.
- Check the same media bug in form tiles and buy-box.

Done when: render-scope plus render-check `--only` on the changed states show only the intended changes; Eye Care's Brands panel shows whole logos at the current size; all cards' image areas are equal at 375, 768 and 1440. Depends on: 1. Status: not started.

### Task 6: Track G2, the trust bar (1 worker)
Why: `i3`, `i8`, `i12`, `i18` and `i22`.

Changes:
- One stored marquee value: the Overflow switch writes the Effects marquee layer, and the render-time default filter is removed after a sweep of saved bars.
- A lean layout: Flex and Grid only, through a new opt-in `supports.sgs.trim` list on the shared layout panel (empty everywhere else). One Columns control that can't go dead, plus Gap, alignment, and Justify on Flex. Saved Default and Stack bars keep rendering.
- Grid fixes: centre a lone last badge; "hide extras" hides only real overflow.
- One "Label colour" for every style.
- A bar-wide separator in every style and layout.
- The editor shows custom SVG icons through `IconPreview`.
- The label fill reaches path fills: on import, the clone swaps hard-coded SVG colours for the block's colour variables.
- Fill writes the marquee's "overflow" condition.

Done when: on a local copy running `main`, each of Bean's trust bar observations is gone; and Mama's three saved bars and Eye Care's bar render unchanged (render-check). Depends on: 1. Status: not started.

## Phase 2: after Task 2 lands (these touch route files the branches edited)

### Task 7: Track B, a look the clone cannot place never stops the run (1 worker)
Why: `site-run.mjs::applyDetail` stops a surface on any unresolved row. That stopped 9 surfaces, against Bean's ruling (`i2`).

Changes: list the rows and carry on to verify and walk; amend Spec 48. Then fix the upstream faults:
- the label probe reads an `<option>`;
- 36 two-property settings keep only one property;
- `normalLineHeight` is not collected;
- six account hover shadows are missing from the record;
- the modal pin gate matches the wrong setting.

Done when: all 9 surfaces reach verify and walk, and each upstream fault has a test that fails on main. Depends on: 2. Status: not started.

### Task 8: Track E, restores (2 workers)
Why: proven missing against today's code (`i6`).

Changes: E1 restores link-only lists (and amends Spec 48 §3.4), the slider visible-card count and `dcLogic` reach calls. E2 restores the code-reading motion recognisers (`de991e5c9`, `b2bd67359`, `86bee91ae`) and the 8 Restore-map items, each checked against today's files.

Done when: each restored test is red on old main and green after, and the named surfaces gain in the sweep. Depends on: 2. Status: not started.

### Task 9: Track F, the mega menu (1 worker)
Why: `i4`.

Changes: column titles become headings, by aligning `skeleton-classify.mjs::isColumnLabel` with `skeleton-panel-rules.mjs::headedRun`. A narrow text-tile rule builds one `sgs/card-grid` (three or more whole-link tiles, at most two text lines, no picture).

Done when: Eye Care's Help, Sunglasses and Brands panels show headings, and Brands is one card grid. Depends on: 2. Status: not started.

## Phase 3: prove and ship (main session, one at a time)

### Task 10: Combined proof, deploys and the reclone

Changes:
- The full suite, plus one combined sweep before and after.
- Render-scope, then render-check on the states each track named.
- Deploy to `sandybrown`, then the test sites.
- Swap BALENCIAGA's trimmed logo (`E:\sgs-tmp\logos\balenciaga-trimmed.png`) on `eye-care-test` at the deploy Bean approves.
- Before Eye Care's deploy, check that its saved trust bar's old string `justifyContent` still renders.
- Reclone Mama's, Eye Care and Indus offline, then `site-run.mjs --only` on the named surfaces.

Done when: every named surface improves and none gets worse, and Bean's eye check passes. Then SGS and MIC are cloned once their drafts are in `sites/*/handoff/`. Depends on: 2 to 9. Status: not started.

## Phase 4: block editor clean-up, alongside Phases 1 to 3 (Bean, 2026-11-25: do it now, defer only Task 29)

Workers own files, never share them: shared components first (no block files), then one stream of mechanical codemods across blocks, then per-block owners who apply every per-block change for their blocks. Each task builds its detector first; Bean sees each mass-change list before it is applied.

### Task 11: Stage E1, shared components and packages (3 workers, start with Phase 1)
- **W1:** device markers always on the label row plus a gate (21); the light collapsible inner section, screenshotted for Bean (18); Background surface and Extra SVG layer as inner sections of Background, and the lazy panel's slot mounted at once (18); a small per-panel reset component (20).
- **W2:** the separators package (pilot: bare mode, options from `block.json`, one canvas hook, the opt-in trim list and its gate, the fallback script on every flow-path block) (11); the shape-divider package: a working flip, a mirrored top shape, a preview on every block (17).
- **W3:** the shared element switcher from typography's, listing only drawn parts with settings if easy (14); border gains media's nine styles and greyed rows; shadow gains a "follow the shape" output for masks, and the editor preset bug is fixed (14); the carousel package (16).

### Task 12: Stage E2, codemods across blocks (1 worker, after Task 11's components it uses)
Only each tab's first panel opens (19); the 30 reset-only `ToolsPanel`s and 61 media menus get the small reset, standard menus stay (20); every block onto the shared spacing panel, including the 8 Dimensions blocks (12); kit colours join the main Colour panel, shown only when the feature is on (13); the per-block "Keyboard focus keeps the resting look" setting (`sgsFocusRests`) is retired: keyboard focus always plays the block's hover effects, as a tap does on a touch screen (Bean, 2026-11-25). Remove `extensions/focus-rests.js`, `includes/class-sgs-focus-rests.php` and the clone's writer `scripts/computed-route/lib/fill-state-focus.mjs`; sweep saved content to drop the attribute (FP-14, no `deprecated.js`); reseed the DB; a draft whose focus keeps the resting look is an accepted difference. Render-scope lists the pages whose focus behaviour changes (Eye Care's hand-built blocks hold it), checked before each site's next deploy.

### Task 13: Stage E3, per-block owners (up to 4 workers, after Task 12)
Each owner takes a set of blocks and applies, for those blocks: the register's moves (`i24`) and the placement rule (22); repeated panels dissolved, gallery Layout into Spacing and Border, the button's own focus style (`focusStyle`: duotone, signature) removed, as no clone or saved site uses it (Bean, 2026-11-25) (23); look controls and renames (27); more-than-12-colour part panels (13); switcher, separators, dividers and layout/width preview adoption (14, 15); retiring heading, quote and text styles (28). Named owners: product card (24: Settings "Buttons", one "Button style" with a switcher, Frame card removed, margin into Spacing, one shared shadow); nav drawer menu and nav bar menu (25: dissolve "List layout", "Mega menu", "Accordion open and close" in Settings); responsive logo (26: one "Logo" panel with the dark-backgrounds switch). Spec 32's native-supports rule, Spec 35A Part G and `plugins/sgs-blocks/CLAUDE.md` rule 1 are corrected (28).

Done when (Tasks 11 to 13): the browser panel census (`i8`) shows 0 single-control panels outside the register's kept cases, 0 duplicate titles, 0 order changes after a tab switch and only first panels open; render-check shows no front-end change except the listed fixes.

### Task 29: Deferred: stored conditions and "show when"
The setting record stores each setting's conditions in the DB (it computes them in `instances.py::preconditions` and discards them, `i17`); one shared rule hides controls with nothing to affect; the hand-built-panel and dead-control detectors (`i17`) and the panel census become gates, with an allowlist for the 10 intentionally different panels.

### Task 30: Later
Repair the chrome style choices (elevated, boxed, borderless and similar on 9 blocks) so each writes real settings, as card grid's do. Note only: "More options" (a collapsed section at the foot of a giant panel for rarely used controls) is more effort than it is worth for now (Bean, 2026-11-25).
