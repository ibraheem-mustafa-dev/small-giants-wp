# Indus header slice: QC council fixes (step 20)

## Why

The first Indus header run (manifest, skeleton, Fill, build into post 201, three Solve rounds, 2026-10-21) ended with 308 open rows, 134 unresolved, 6 wrong writes and 36 unreadable state rows. A three-rater QC council (live and motion, skeleton structure, pipeline forensics) found the dominant cause and three more, each proven from code or by experiment. Ground truth and run history: the session scratchpad's `council-ground-truth.md`.

## Status

- [x] Wave 1 (tasks 1 and 2): `ceaffdb50`, `be62f06af`, `7cd17be8c`, `2b5b51e66`, `630ded9fa`, `60e585700`; the header is rebuilt on the right skeleton (`53dc54360`).
- [x] Wave 2 (tasks 3 and 4): `9df4e8518`, `9e1883275`, `0e075939a` (DB overrides; Spec 48 §5.4 Res 7 closed, `block_attributes` changed exactly the 8 overridden rows, 9217 rows before and after), `9398fad31` (nav child slots and collapse point), `6b68330a9` (reseed outputs), `27dba4540` (header wave 2 artefacts).
- [ ] Live pairing of the header at 375, 768 and 1440 with Bean's eye (FR-48-81's last done-when clause): not hit. The header is structurally Bean's approved one (`sgs/site-header` > `sgs/site-header-row` > `sgs/responsive-logo` with `logoId` 81, `sgs/nav-bar-menu` with `ref` 5, `collapsePoint` 1024 and item slots, `sgs/button`), built on indus-test post 201 (the active header) from `sites/indus-foods/build/trees/sgs_header/header.json`; skeleton decisions are `sites/indus-foods/build/skeleton/decisions.json` `surfaces['sticky-header']`. Last Solve (`sites/indus-foods/build/qa/solve/header/2026-10-21-0615/solve-report.md`): open rows 131, hardcode 12, missing 27, unresolved 44, wrong writes 1 of 4 settings; States 5 pairs, 2 match, 1 differs, 8 unreadable. No code deploy; the framework DB is reseeded at `0e075939a`.
- The walker pairs blocks only, so a block that draws its children (`sgs/nav-bar-menu`) is never compared item by item: fewer Solve rows can mean unmeasured, and the cropped pairs carry that check.

### Next wave (the cropped pairs at 1440, 768 and 375; built through the handoff readers plan)

Each item names its cause and where it now stands; the fixes are built on `main` by `.claude/plans/2026-10-21-handoff-readers.md` (waves 1 and 2, `d1bce54f1`) and none is live on indus-test yet. Resume from that plan's Status.

1. Logo about 170px high (draft `R.logoH` `clamp(54px,4.4vw,66px)` / 56px / `min(54px, …)`, `aspect-ratio:3741 / 848`): built as the `intrinsic-ratio` equivalents row (`lib/fill-equivalents.mjs`, predicted `maxHeight` 63.36px at 1440, 56px at 768, 54px at 375); waits for the migration `plugins/sgs-blocks/scripts/migrations/2026-10-21-property-equivalents-intrinsic-ratio.py`, the reseed and a header Fill rerun.
2. Header row wraps, CTA clipped: built: spacing from the declared `justify-content:space-between; gap:20px` (`lib/fill-spacing.mjs`, predicted 20px, not the measured 80.92px) and `display:flex` routed to the layout setting (`lib/resolve.mjs`); waits for the header Fill rerun.
3. Current item's blue and gold underline: wave 3 of the readers plan.
4. CTA shown at 375 (draft `showHeaderCta`, `w >= 1260`): wave 3 (width-gated `sc-if` to the block's breakpoint setting or a bounded custom CSS rule, FR-48-50).
5. Menu label "Contact Us" against "Contact": built (`lib/site-build-labels.mjs`: labels from the draft link text); live after `site-build.mjs --apply` on indus-test.
6. Not sticky, no scroll shadow (S-03's scrolled state, J-01 `scrollY > 8`): wave 3 (FR-48-80's sticky part); `sgs/site-header` needs recalibrating first (`headerSticky`, `scrolledOffset` have no cache entry).
7. Menu binding: carried from `sites/indus-foods/build/menu-map.json` (`lib/skeleton-carried.mjs`); its header entry 5 is the earlier hand value until `site-build.mjs --apply` rewrites the file from the live menus.
8. `lib/skeleton-rerun.mjs` not passing the proposal context: done (`lib/skeleton-context.mjs::proposalContext`).
9. Step 20 cannot fully close on today's code: binding grouping (FR-48-41), the breakpoint rule (FR-48-50), gates G0 to G7 (FR-48-64) and the R–L verdict half (FR-48-36) are not built.

Candidates from the first between-wave gate that wave 2 did not take: the CTA's exact `.25s` against a token (Spec 38A §7), button `letterSpacing` written at desktop changing 768, and the CTA's `#/apply` link.

## Trusted diagnoses

- D1 Wrong skeleton. `skeleton.mjs::proposeSurface` calls `lib/skeleton-propose.mjs::proposeSkeleton` without `surfaceKind`, `surfaceName`, `built` and `motion`, which `lib/intake-skeletons.mjs` and `lib/skeleton-rerun.mjs` pass. Without the kind the `navigation` rule cannot fire: the same served inventory gives 19 nodes (buttons and containers), with `kind: header` it gives Bean's approved 5 (`sgs/site-header` > `sgs/site-header-row` > `sgs/responsive-logo`, `sgs/nav-bar-menu`, `sgs/button`). About 140 of the 320 open rows follow from it.
- D2 The nav's code-declared timings (TR-009, TR-010) had no setting to land on only because the nav was built as containers: `sgs/nav-bar-menu` holds `itemMotionDuration`, `itemMotionEasing` and `submenuCaretTurnDuration`.
- D3 Fill without `--allow-external` reads nothing (the runtime loads React and Babel from unpkg) and exits 0 (`lib/fill-read.mjs::requestAllowed`, `::readDraft`), against Spec 48 R-48-3.
- D4 Key spaces. Intake keys a root element `<entry component>/<n>#<copy>`; the served draft keys it `Root/<n>#<copy>` (`scripts/parity/lib/collect.mjs::resolveFinder` matches the root host by name). `lib/skeleton-classify.mjs::overrideFor` joins client decisions with no translation, so a served-inventory proposal silently misses every footer decision (`decisions.json` `surfaces.footer` is keyed in intake's space); motion keys (`loopingKeys`) likewise.
- D5 Tree path. Spec 48 FR-48-55 and `lib/site-build-map.mjs` read a stage 3 tree from `sites/<client>/build/trees/<postType>/<slug>.json`; `lib/manifest-build.mjs` names `<key>.tree.json`.

## Named gaps (not fixed here; the owning requirement is not built)

- Sticky header and scrolled shadow from the draft's scroll script (J-12): the settings exist (`sgs/site-header` `headerSticky`, `scrolledOffset`, `shadowScrolled`), the reader is Spec 48 FR-48-80 (behaviour recognisers).
- The 1200 and 1260 header thresholds: FR-48-50 (breakpoint rule). Binding grouping: FR-48-41. Gates G0 to G7: FR-48-64. The R–L verdict half: FR-48-36.

## Wave 1

Two implementers on separate files, run side by side. BASE is the commit before dispatch.

### Task 1: Skeleton from intake's context, manifest link, key spaces and tree path

Files: `scripts/computed-route/skeleton.mjs`, `scripts/computed-route/lib/manifest-build.mjs`, `scripts/computed-route/manifest.mjs`, their tests (`tests/manifest-build.test.mjs`, a skeleton test file next to the existing ones), and `scripts/computed-route/README.md` rows only where an export or flag changes.

1. Manifest link (D1 needs it). `lib/manifest-build.mjs` adds `intakeSurface` to each entry: the slug of the `intake.json` `skeletons` entry for the same surface (match the handoff record the entry already matched, by its `id`, which equals the intake skeleton's `id`; never by position). An entry with no intake skeleton gets none and is listed. Existing-entry merge rules unchanged (a hand-set value is kept).
2. Tree path (D5). Generated `tree` is `trees/<postType>/<page-map slug>.json` (relative to `sites/<client>/build/`), the path `lib/site-build-map.mjs` reads. A hand-set `tree` is kept.
3. Proposal context (D1). `skeleton.mjs::proposeSurface` passes `surfaceKind`, `surfaceName`, `built` and `motion` exactly as `lib/skeleton-rerun.mjs::rerunSkeletons` does: kind and name from `intake.json` `skeletons[<intakeSurface>]`, `built` from `build/skeleton/built-surfaces.json` keyed by that skeleton's `id` or slug, `motion` from the intake inventory's looping records (reuse the rerun's helper, do not copy it). Client decisions are read under the intake slug (`clientDecisions.surfaces[<intakeSurface>]`), the name Bean's review saved them under. Without `intakeSurface` the command refuses and names the missing link.
4. Key spaces (D4). One root-segment rewrite, reusing `lib/fill-motion.mjs::elementKey`'s logic or a shared helper it then also uses: decision keys and motion keys written in intake's space (`<rootComponent>/…`) are matched against a served inventory's `Root/…` keys, with `rootComponent` from the intake skeleton entry's `inventory.checks.rootName`. Never rewrite an import chain's inner segments.

Baselines (measured before the change): `sites/indus-foods/build/skeleton/header.proposal.json` `counts.skeletonNodes` = 19 with no `sgs/nav-bar-menu`; no entry of `sites/indus-foods/build/surfaces.json` carries `intakeSurface`; the header entry's `tree` is `header.tree.json`; a footer proposal from a served-style inventory honours 0 client decisions.

Predicted after: `node scripts/computed-route/skeleton.mjs propose --client indus-foods --surface header` gives 5 skeleton nodes, one of them `sgs/nav-bar-menu`, 0 low confidence, 0 unresolved, and matches intake's `skeletons['sticky-header']` blocks; `node scripts/computed-route/check-approved.mjs indus-foods` still exits 0; the regenerated manifest (dry run) carries `intakeSurface` and `trees/<postType>/<slug>.json` on all 7 slice entries; a fixture footer proposal from a `Root/…` inventory applies its client decisions.

Commit gate: do not commit unless the header proposal has exactly the 5 approved blocks with `sgs/nav-bar-menu`, every new rule has a MUST FAIL test whose mutation turns red, and `node --test scripts/computed-route/tests/*.test.mjs` for the touched files, `node scripts/computed-route/lint.mjs` and `python scripts/check-no-client-names.py --check` pass. Do not run `--apply`, Fill, a build or Solve: the main session does that after review.

### Task 2: Fill fails loudly on an empty read

Files: `scripts/computed-route/lib/fill-read.mjs`, `scripts/computed-route/fill.mjs` if needed, their test.

`lib/fill-read.mjs::readDraft` throws a named error when a read width resolves none of its targets, naming the width, the target count and the requests the route aborted (with the hint that a Claude Design draft loads its runtime from unpkg, so `--allow-external` is needed). `fill.mjs` exits non-zero on it. The request policy itself is unchanged (allowing the pinned files by default is a separate design choice for Bean).

Baseline: `sites/indus-foods/build/qa/fill/header/2026-10-21-0435/fill.log` reads "read 375px: 0 of 19 targets" at every width and the run exited 0.

Predicted after: the same Fill command without `--allow-external` exits non-zero with the named error; with `--allow-external` it reads 19 of 19 at 1440 as before.

Commit gate: do not commit unless a MUST FAIL test plants a page whose targets all miss and expects the throw (red with the check removed), and the positive case still reads.

## Wave 2 (Bean, 2026-10-21: the three quick wins)

Measured after wave 1 (Solve `sites/indus-foods/build/qa/solve/header/2026-10-21-0605`: open rows 104 to 100, hardcode 0, missing 14, unresolved 48, wrong writes 0 of 2, 8 unreadable states; cropped pairs show the remaining visual gaps). The walker pairs blocks only, so the nav's drawn items were never compared; the cropped pairs carry that check.

### Task 3: A block that draws its children gets slot finders for them, and the nav's collapse point

Files: `scripts/computed-route/lib/skeleton-propose.mjs` and/or `lib/skeleton-rules.mjs`, their tests.

1. When a block absorbs the draft's children because it draws them (`rules.drawsChildren`, the `navigation` rule's `absorb`), the skeleton node gets `draftSlots` (`{ "<calibration element path>": finder }`, `lib/fill-skeleton.mjs`) for the elements the block's calibration measured on its drawn children: for `sgs/nav-bar-menu` the resting item link (`cache/nav-bar-menu.json` `settings.itemColour.slot`) takes a resting draft item, and the current item link (`settings.itemColourCurrent.slot`) takes the draft item the code marks current (the item whose current-section `sc-if` renders, intake's surface record state "current section"), each finder the item's own `tpl` key in the served space. Paths come from the block's calibration cache, never typed (FP-1); a block with no such calibration gets no slots and is listed.
2. A navigation block's `collapsePoint` is the width threshold of the breakpoint `sc-if` that shows the draft nav (intake's `breakpoints` thresholds and the `sc-if` classification; Indus: the nav shows at `w >= 1024`, so 1024), written in the skeleton (`collapsePoint` has no `css_property`, so the skeleton may carry it).

Baselines (measured): `header.skeleton.json` has no `draftSlots` (0) and no `collapsePoint`; the built tree has no `itemColour`, `itemColourCurrent` or `collapsePoint` (0); live at 768 shows the full nav, the draft shows the burger. Predicted after: the nav node carries two `draftSlots` and `collapsePoint` 1024; a Fill run writes `itemColour` (the draft's ink) and `itemColourCurrent` (the draft's blue). Commit gate: do not commit unless the header skeleton's nav node has the two slots and `collapsePoint` 1024, each rule has a MUST FAIL test with a red mutation, and lint and the touched tests pass.

### Task 4: Res 7 mis-tagged rows

Files: `plugins/sgs-blocks/scripts/attr-classification-overrides.json` and its test.

Spec 48 §5.4 Res 7 (handed to the DB seeder, never done): `sgs/responsive-logo.logoId` (an attachment ID, stored as `max-width` on `image`, role `enum-class-probe`), `sgs/nav-bar-menu.featuredItemIds` (`display,max-width,min-width`), `sgs/nav-drawer.closeStyle` (`display,min-height`), `sgs/diagram-dimension.endX`/`endY` (`left`/`top`; Spec 48 §3.6 item 14: line geometry has no `css_property`). Each gets an override entry with the field values its code means, each with a `_why` citing the render code that proves it. The skeleton lint refuses `logoId` today ("carries style value logoId"), so the header's logo decision (`decisions.json` `sticky-header` `Root/43#0` `logoId` 81) cannot be proposed. Baseline: the five rows above as read from the DB. Predicted after a reseed from a clean `origin/main` worktree: each row reads the intended fields and the header proposal carries `logoId` 81 with no problem. Commit gate: do not commit unless the seeder's own tests for the override file pass; the reseed is the main session's (serial queue).

## Between-wave gate

After wave 1 is reviewed and pushed, the main session regenerates the slice manifest, re-proposes the header skeleton, re-runs Fill (with `--allow-external`), builds into post 201 and runs Solve. Wave 2 is chosen from what that run still shows (rater C's partition predicts about 140 of 320 rows gone; the remaining candidates are the nav and CTA timings, the CTA's exact `.25s` against a token (Spec 38A §7), button `letterSpacing` written at desktop changing 768, and the CTA's `#/apply` link).
