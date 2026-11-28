---
status: active
doc_type: plan
created: 2026-11-24
---

# Clone root fixes: make the route clone a draft as well as last week's per-surface sessions did, on every surface

Status (2026-11-26): open, with RF7 and RF8 remaining. The fixes are built as branches landed by `.claude/plans/2026-11-25-land-fixes-and-editor-cleanup.md`, which governs where the two differ and holds each branch's state. On `main`: RF1, RF2, RF3, RF4, RF5, RF6, RF9 and RF10 with their review fixes. Remaining: RF7 (branch `fix/rf7-shop-forms`) and RF8 (branch `fix/rf8-plumbing`, under review fixes). The groups below still describe the diagnosis they were built from. Governing specs: `.claude/specs/48-CLONING-SYSTEM.md`, `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md`; parent plan `.claude/plans/2026-11-19-general-cloning-work.md` Task 8 (the proof run and the register).

## Goal and why

Bean clones two new sites (SGS, and MIC, which has a shop) from Claude Design drafts with no hand fixes (the 2026-11-28 target passed, so both go up as placeholder sites first; `.claude/plans/2026-11-25-land-fixes-and-editor-cleanup.md` Tasks 34, 35 and 10). The 2026-11-24 proof reclones of Mama's, Eye Care and Indus came out far worse than last week's per-surface sessions. Bean's rule for every fix (2026-11-24): remove the root cause at its layer, cure the same fault everywhere it occurs, and add a guard so the class cannot return in another context; never a patch that only crosses a register row off. Every fix makes the clone write what the framework already has (per-device settings, Custom CSS for non-tier widths and outliers, the motion panel for timings, the handoff's tokens for site defaults), checked against how the hand-built sites set the same look.

## Settled by Bean (do not reopen; check every brief against this list)

- Mama's "Build your Zookie" configurator is a custom build job, not a cloning target (2026-11-21, 2026-11-23); the buy box's configurator layout is not written by the route.
- Hover colour and shadow timing are set through the motion settings (the hover state's `paintDuration`, `paintEasing`, `shadowDuration`, `shadowEasing`); no new transition settings. The route's only job is to write them, including for a hover that changes colour or shadow without moving.
- Draft-first matching (Spec 48 R-47-4, FR-48-8): read the draft's values per width and state, match each to a setting through the tables, Custom CSS for anything no setting holds (RF1).
- "Featured", current, open, detached and pill are conditions of one kind; no stored per-placement condition schema.
- Forms, modals and flows are linked into pages by reference and are cloned before pages, like the header, footer, mega menus and drawer.
- Strict mode is for tests only (2026-11-21); a listed look never stops the clone.
- The clone writes the draft's exact stated value; the half-pixel tolerance is only for comparing measured renders.
- The setting record is fixed forward, not replaced by calibration.
- The trust bar scrolls as a ticker when its items do not fit (`00eac2c01`).
- "Glasses (soon)" menu entries are dropped (2026-10-09, confirmed 2026-11-22).
- The clone-coverage register stays (the intake review reads it).
- Last week's header, footer, drawer, mega-menu and shop fixes were route work that made the clones match: a fault there is a loss or regression to restore before anything new is designed.

## Evidence

All reports are read-only investigations, each checked by a second helper that did not write it. Index of every cause, correction and verdict: `E:\sgs-tmp\general-cloning\hunt\INDEX.md`. Reports: `E:\sgs-tmp\general-cloning\hunt\` (hunts H1–H5, `reconcile.out` on Bean's nine points, `rescan-b.out`, `element-finding.out`) and `E:\sgs-tmp\general-cloning\deep\` (`r1.out` and `r2.out` design reviews, `s1.out`–`s3.out` surface sweeps, `h1.out` history audit, `t1.out` tooling health, `spec.out` spec conformance, `calib-diff.out` calibration against the record), with fact-checks `v-*.out` beside each. Lost-fix lists: `E:\sgs-tmp\general-cloning\regression\b2-verified.md`, `hunt\rescan-b.out`, `deep\h1.out`. Before/after offline Fill of the setting-record switch: `E:\sgs-tmp\meas-out-B` (calibration, `d1723f886`), `E:\sgs-tmp\meas-out-A` (record, `c8b4a3f78`).

## How the work runs

- Each fix group runs on an API helper (`/delegate`) in its own worktree under `E:\sgs-tmp`; the main session reviews every diff and lands fixes on `main` one at a time (several touch `lib/resolve.mjs`, `fill.mjs`, `lib/setting-record.mjs`). Framework DB refreshes (`/sgs-update`) run from the main session only, one at a time.
- A fix is done only when the surfaces it touches run through Fill, build and apply (`tools/route-sweep.mjs --fill <client/surface,...>` offline, then `site-run.mjs --only <surface>` on a scratch copy), with a check that fails before and passes after. Every restored rewind fix brings its tests back.
- A change that alters what an existing site renders is listed with render-scope before that site's next deploy (`python scripts/render-scope/render-scope.py`). Nothing here is deployed.
- Then a per-surface reclone of all three clients (plain `site-run.mjs --only`, two clients at a time) and side-by-sides with the drafts for Bean.

## Fix groups (root class, the fix, where else it occurs, the guard, the proof)

### RF1. Match each draft value to the right setting: draft-first, with the setting's own element and variant respected

- **Method (Spec 48 R-47-4, FR-48-8, FR-48-50, FR-48-81, FR-48-109, already the route's method; Bean 2026-11-24):** start from the draft. Its code is run at each width and state (the drafts set per-device looks in JavaScript width flags and `sc-if` branches, hover in `style-hover` attributes, current, open and scrolled in JavaScript values; none uses responsive CSS rules), each value is matched to a block setting through `block_attributes` and `setting_placements` by element, property and state, and anything no setting holds goes to the block's Custom CSS. No stored per-placement conditions and no new record schema (the calibration-port design in `deep\calib-diff.out` is withdrawn for this: `deep\draft-forward.out`).
- **Where it breaks today (proven on real instances, `deep\draft-forward.out`):** (a) a setting that belongs to one variant of a block is offered for every node: `lib/setting-record.mjs::rowPaths` ignores the selector's ancestor modifier, so Mama's nav hover (`style-hover="background:#F9D5D3"` on plain links) was written into `featuredBgHover` with no featured item, and the cart's `pillBorderRadius`/`iconTriggerRadius` tie; (b) a setting that paints a `::before`/`::after` layer never matches the draft's plain element (`itemBgHover` on `__link::before`, `pillBgColourHover` on `__trigger::after`), so the value lands in Custom CSS or on the wrong setting; (c) the declared value and the placement sit on different elements of one part (cart button against its label, burger bar against its icon box); (d) settings with no CSS property (`collapsePoint`, `triggerMode`, `disabledItemIds`, `featuredItemIds`) need a rule from what the draft shows, which calibration's lost `enumReads` provided; (e) the current-page look on a menu written link by link: built and proven on 2026-10-29 (`7721da8e2`, `fill-current-attr.mjs`, reading the draft's `aria-current="{{ cur.<key> }}"` binding set by its `cur === k` logic) and deleted by the rewind `0ea1a6cb2`; restore it (Restore map).
- **Fix:** a variant gate in the resolver that reads each setting's own `css_element` and the ancestor modifier in its stored selector (`featured`, `detach-chip`, `pill`, `icon`) and offers a variant-only setting only to a node drawn in that variant (the cart's per-device `triggerStyle*` says which; a featured item is one whose look differs from its siblings, written as `featuredItemIds`); pseudo-layer equivalence, so a background on `::before`/`::after` counts as painting the element; element pairing within a part; a small map from what the draft shows to the settings with no CSS property (an element hidden below a width writes `triggerMode`/`collapsePoint`, a non-link item writes `disabledItemIds`); the current-page reader restored from `7721da8e2`. Separately, port calibration's measured boxes into the site look (`_box` per element at 375/768/1440), which restores the logo's `maxHeight` and `sgs/media` ratio and height (Spec S12).
- **Facts (DB, read only):** only `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` have a featured look (12 `featured*` settings each, `css_element = 'featured'`, chosen per item by `featuredItemIds`); no current draft styles one menu item unlike its siblings and none has a detached burger, so those paths are built for future drafts and tested on fixtures.
- **Featured items have no reader yet (status):** nothing in the route reads which menu item a draft singles out, so no node carries `drawnVariants` and `featuredItemIds` is not written. The variant gate (`lib/setting-variant.mjs::variantHeld`, called from `lib/resolve.mjs`) therefore offers a variant-only setting (`featured*`) to no node, which is what keeps a plain link's hover pill out of `featuredBgHover`. A featured-item reader that stamps `node.drawnVariants` is the one piece still to build; until it exists the featured looks of both nav menus are never written by Fill.
- **Guard:** a test lint refusing hand-typed setting keys no real record carries (58 test lines type `variants`; 0 of 1,703 real settings have it); a non-blocking seeder report where a setting's `css_element` or name prefix disagrees with its proved part; no "ambiguous" line may name a variant pair.
- **Proof:** offline Fill of Mama's header and drawer and Eye Care's header, diffed against `meas-out-B` and `meas-out-A` (`E:\sgs-tmp\deep-calib\treediff.py`): calibration's writes return or are explained, `featuredBgHover` is gone from Mama's nav and its hover pill is written to the item setting, the cart writes `pillBorderRadius` and `iconTriggerRadius` each in its own mode, Eye Care writes `collapsePoint` 1060 and `triggerMode`.

### RF2. One validity contract across stages

- **Cause:** each producer's output is checked only by the next consumer, and several writers emit shapes their consumer refuses: the review-platform handover as a string, numbered-steps style values on `sgs/process-steps` (the DB gives `steps` a `css_property`), handover kind `layout` (`lib/template-piece-woo-layout.mjs`), the order heading `level: 1` (`lib/template-piece-order.mjs::placeAccess`; the block takes "h1"), and the Indus header `::before` slot. `lint.mjs::lintSkeleton` names every setting with a `css_property` a "style value", though 37 of them are not CSS (`tag`, `fx:*`, `input:*`, `anim:*`, `grid-template-columns:count`). The refusal is right, and the message is wrong: a value the skeleton decides belongs in `decided`, which Fill writes. Template pieces added after propose are linted for style values only. Fill has no type or enum check, so `level: 1` passes Fill and fails at build.
- **Fix:** strict mode off by default (`lib/clone-surface.mjs::siteRunArgs`; implements Spec 48 §3.4 and Bean's 2026-11-21 ruling); one shared validator module (handover shape and kinds, attribute existence, type and enum from the framework DB, a lint message that points a skeleton-decided value to `decided`) called by every producer and consumer: propose, template pieces, Fill output, the build. Writers fixed at source: handover objects, numbered-steps values through `decided`, an allowed kind, the heading level from the DB enum.
- **Guard:** a contract test that runs every writer (each rule verdict, each template piece, each handover in `data/skeleton-decisions.json`) through the shared validator with real DB facts; it fails today on all five shapes and finds the `::before` writer.
- **Spec:** S1 (Bean 2026-11-25); R-47-10 unchanged. S11 dropped: §3.3 already defines the handover shape.

### RF3. A later stage never drops or overrides what an earlier stage decided or set aside

- **Instances:** Fill overwrites the skeleton's `splitSide` from a paint reading (Eye Care's second menu repeats the first half); the mega panel's wrapper cap and padding are set aside ("conserve") and never read (`lib/skeleton-panel-rules.mjs::panelChild`; Eye Care megas collapse); an absorbed list heading is never paired to its part (`listHeading`; footer heading looks lost); `headerStripBar` drops the trust bar's dot glyphs and nothing writes `textBadgeSeparator`; the drawer's two lists both take the header menu because `lib/site-build-map.mjs::boundMenu` looks for a menu named `drawer` while the site records `drawer-1`, `drawer-2`.
- **Fix:** the skeleton puts structural choices in `decided` (Fill's `owned` already respects it); every conserve or record-unverified entry has a reader in Fill; absorbed elements carry their part pairing; glyph siblings become the separator setting; the Nth drawer list binds `drawer-N`.
- **Guard:** propose fails when a conserve or record-unverified entry has no reader; paint conservation counts paint on absorbed elements.

### RF4. Read the draft completely

- **Instances:** the logic reader misses `return Object.assign(...)` (`lib/read-logic-conditions.mjs::valueOfKey`): Eye Care's 134 width conditions read none, so `collapsePoint` is never written and the phone button's 1160px hide is lost; `collapsePoint` has a second writer reading prose (`lib/skeleton-child-slots.mjs::collapsePoint`); presence steps from the width sweep are never written (`lib/fill-step-rungs.mjs::written`) and sweep edges are 16px off the draft's threshold; closed FAQ panels whose data is projected through `.map` are not read (Eye Care help: 7 of 8 answers); script-injected custom elements are invisible to the inventory (Indus logo; restore `2a393e23a` and `82bc238bf`); clock-decided words (restore `7f18560bd`); surfaces opened through the draft's own store call (lost `19b0b1395`, `8c48dec56`; Spec 48A still tells Claude Design to write these; matters for MIC's shop); link labels from plain href anchors (restore `5a2679014`'s branch beside `dff980b6e`'s handler form); single-file draft links (restore `a98de66c4`).
- **Fix:** one shared reader for a `renderVals` key's value node (built on `lib/intake-ast-eval.mjs::rootData`/`propRefs`), keeping ternary tests; one `collapsePoint` writer; presence steps written as the width gate's scoped Custom CSS with edges taken from the draft's code thresholds; the closed-panel reader extended to index fields; the restores above.
- **Guard:** every key an sc-if names resolves to a node or writes a gap row; every presence step in the sweep is explained by a written rule, flag or gate.

### RF5. Write exactly what the draft states, only where it applies

- **Instances:** the 0.5px tolerance decides whether to write (`lib/css-equivalence/tolerance.mjs`; burger bars 1.5px and 2.5px treated as the 2px default); initial values written over a block's own layout and into Custom CSS (Indus heroes `grid-template-columns: none` on 21 surfaces, `flex-grow: 0` on mega groups, default font properties on `sgs/media`); an unwrap promotes children into a grid without re-deriving its tracks (hero content squeezed; 250 unwrap rows); a residual rule cancels a setting (list-style against `markerType`); the residual writer refuses a static fixed copy (burger bar 3) and a value on a partly drawn element (basket icon); Mama's header order (`lib/skeleton-header-slots.mjs::mergeWidthAlternatives` drops moved nodes to the tail, from `647007ae1`); the apply width family writes the wrong `maxWidth` (`lib/apply-family-width.mjs::maxWidth`; Indus careers 720 against 1240, 20 surfaces).
- **Fix:** a stated value is written exactly unless it equals the default exactly; the tolerance stays only for comparing measured renders, in the one tolerance module, applied the same in Fill and in `confirm-live`; applicability through the existing `lib/css-equivalence/inert.mjs::appliesIn` inside `resolveProperty` and the residual writer; unwrap re-derives the parent's layout; the residual writer skips a property a setting on the node owns and allows a static set and the drawn widths; moved nodes keep their own slot in each width's order; the apply width op pairs per ref, not per template (prove the pairing first).
- **Guard:** a lint refusing tolerance literals outside the tolerance module; a reading-order gate (visible nodes follow their draft elements' order per width); a post-Fill check that explicit tracks match the in-flow child count.
- **Spec:** S3 approved by Bean 2026-11-25 as a reword. R-47-5 already says to write where the value differs, and the code departs from it. The 5% breakpoint snap stays (FR-48-50).

### RF6. Motion and timing through the existing controls

- **Instances:** a block's own transition survives where the draft has none (`lib/fill-prop.mjs::notPainted` skips an undeclared 0s even when the block default is non-zero; 3,700 walker rows); `holdDefaults` writes hover equal to rest, so `sgs/text` emits its fixed 300ms; a colour- or shadow-only hover gets no timing because the hover state is created only for a movement (`lib/fill-motion.mjs`); `rowShrinkDuration`/`Easing` had no writer (built: `lib/motion-behaviour-settings.mjs::shrinkTiming`, which always writes the draft's duration and turns `rowAnimate` off for 0ms); the row's inner padding transition is emitted only when a duration is set (framework: `includes/helpers-row-behaviour.php::sgs_row_shrink_settings_css`); the gradient hover holder `groundOf` was lost (restore `4d7f98389` with `partPresent` from `5b74d432b`).
- **Fix:** the timing-only hover state through `paintDuration`/`shadowDuration`; write 0 where the block's own default is non-zero (block timing setting, else the hover state, else Custom CSS); no transition from `sgs/text` when hover equals rest; the `rowShrink` writer also writes duration and easing; the framework emits the inner padding transition by default (a fix, render-scope listed); the restores.
- **Guard:** a contract test that every timing attribute with no `css_property` has a named writer or a listed reason; a post-Fill detector for elements whose default transition is non-zero, the draft declares none and nothing is written.
- **Spec:** S9, S10, S14.

### RF7. Commerce and forms (MIC has a shop: weighted highest)

- **Instances:** the product card is paired with the loop cell, not the card component's root (`commerceRegion`; Mama's `Root/30#0` against `Root>ProductCard@31#0/0#0`, Eye Care `Root>Frame Card@325#0/0#0`), so border, radius, shadow and parts are lost and `variantStyle` comes from the first item; the card, buy-box and account option rules (`showPickers`, `showLadder`, `showShadow`, `showCta`) live only in `part-look.mjs`, which writes scratch copies only and is never part of a run; shop filter chips (no `woocommerce/product-filters` wrapper; the filter block has no look); the catalogue chain (restore `ca6cc7ca5` then `463bd4d9a` then `23a3b93cb`, the catalogue part of `be77be626`, `a3e7fc27e`; `62d4707f5` may fix the pick-up-to-3 limit); forms: card and field paint dropped (`formSteps` host-unread), focus looks judged on the field though `sgs/form` holds `fieldFocus*`, conditional fields break field pairing, Indus step layout, form prefill (lost `1294b5ae3`).
- **Fix:** the card's `draftRef` is the component root; the part-look mode rules move into Fill's output; the filter wrapper is written and the filter blocks get looks; the restores; field state looks resolve through the parent form; fields pair by visible rest-state field.
- **Guard:** propose fails when a written block's `draftRef` is a layout cell (not a painted box or component root); no written block keeps unpaired parts.

### RF8. Foundation and run plumbing

- `lib/site-run-launch.mjs::startSolve` passes the draft address (one launch helper for every spawn); `solve.mjs` resolves its secrets path; strip clears layout ids and "same ids" follows `mirrorOf`; the rerun content marker (restore `9cb1e201c`); stored option scalars compared as WordPress stores them (restore `2d65a2be7` with its base `cb33ac9b1`); a proof run marks or clears surfaces it did not build; Indus posts keep the theme's title, image and comments around the cloned page (find the serving template); page parents and titles on rerun (restore `489e48e65`, check `39d3ea2c1`); the site check scrolls a form into view (restore `f4f63ec77`); the stale page map is refused against a fresh proposal.

- **RF8 still to build: the producer of skeleton site options.** The reader and the writer of a skeleton row's site options are built and tested (`lib/site-build-options.mjs::skeletonSiteOptions` reads `rows[].siteOptions` from `intake.json`, and `lib/intake-skeletons.mjs::rowsOf` carries the field through), but no proposer emits `siteOptions` on any row, so today the site build plans nothing from them. The skeleton rules that would (the reading progress bar, the fixed back-to-top control) remove the element and name the setting only in a handover row (`lib/fill-motion-account.mjs::readingProgressHandover`). Building the producer means reading the draft element's values (the bar's gradient, colour and height, as `apply-options.mjs` reads them from the mirror) at propose time and writing them onto the removing row; it is not built.

### RF9. Measurement

- The walker refuses a quarter of its runs ("not at rest after a fresh load", 81 of 95 the `auto-scrolled` state): prove the cause (two fresh loads compared) and make a refused state one open row, not a failed walk (Spec 48 §3.6 item 20); surfaces opened by a trigger are opened through their trigger before comparing (Eye Care lenses flow and mega); the parity text carrier reads the majority paint (restore `e2a7b0767`); the status writer records a failure class; `tools/run-tests.mjs` fails at once when the browser driver is absent.

### RF10. Protection

- Restore `content-coverage.mjs` (the only detector of content settings no code writes; removed 2026-11-24 in `53ee1a6c1` with nothing replacing it).
- A gate refusing a commit that deletes route tests without a stated reason (the rewind deleted the tests with the fixes, so nothing failed).
- Every restore brings its tests; test fixtures come from real records and the real DB.

## Restore map: the working design behind each fix (lost-design hunts, 2026-11-24)

Bean's rule: before building, find the design that once worked and restore or adapt it. Reports: `E:\sgs-tmp\general-cloning\deep\L1.out` (forms, modals, flows), `L2.out` (shop), `L3.out` (widths), `L4.out` (menus, drawers, footers, page frames), `L5.out` (the draft's JavaScript into settings). These correct the groups above where they differ.

| Fault | Design to restore or adapt | Kind |
|---|---|---|
| Indus section widths wrong (careers 720 against 1240; 87 of 88 width ops) | Fill writes them right; the apply stage reads the stale committed `build/<surface>.pairs.json` (34 Indus files from 2026-11-02) over the fresh origin in `lib/apply-targets.mjs::pairsReport`. Origin wins; delete the stale files; gate: every apply op's element equals the origin's | Regression |
| Eye Care drawer lists both on the header menu; Mama's drawer 4 items | Restore `421c512f9` (`drawerMenuNames`: `drawer`, `drawer-<n>`, by order; also the drawer's own close) with its tests | Rewind loss |
| Size-guide modal and openers never placed; lens flow measured on the home page | Today's `proposePageMap` writes `opens`; the rewind reset the page maps and nothing regenerated them. Rerun `intake.mjs --page-map` for all three clients; gate: refuse a page map older than its reader | Rewind loss (data) |
| Indus trade form: card gone, aside below; form padding and field look lost | Restore `bfb53147d` and `52aca34ef` (RC11: the linked form stands on the card, the page builds grid and aside) and `1294b5ae3` (form prefill) with tests | Rewind loss |
| Indus stepper 4 labels, review always visible | A schema step with no fields becomes an `sgs/form-step` holding `sgs/form-review` (`lib/skeleton-form-steps.mjs`) | Never built |
| Conditional fields break field pairing; "Companies House" always shown | `lib/apply-form-width.mjs::fieldWidths` pairs by `fieldName`, not position; an any-of condition in `sgs/form` `view.js` and `render.php` | Never reconciled / block gap |
| Forms, modals, flows cloned after pages | Pages already link them by reference (`formIsLinked`, `formId`, `flowId`; FR-48-57); move them before pages in the run, like the header and footer (Bean) | Order |
| Product card paired with the loop cell | `commerceRegion` adds a `card` field for the mounted component root (keep `item`); no `variantStyle` on a template card; related cards take the same look | Never worked through Fill |
| Card, buy-box, account options (`showPickers` and the rest) | `part-look.mjs` becomes a run stage after the shop-role builds, as the shop track ran it (`chain-pl.sh`); its strict verify must pass; no shop is done without it | Never wired |
| Shop filter chips without their wrapper | `categoryFilter` (`913dadb49`) wraps the taxonomy filter in `woocommerce/product-filters` with `overlayMode: off` | Regression |
| Cart template kind `layout`; order heading `level: 1` | The shop track's own bugs (`beab1574b`, `d4de9c1af`), caught by RF2's contract test | Regression |
| Eye Care shop shows test products | The catalogue step (or `strip`) hides existing fixture products | Gap |
| `sgs/media` ratio and height (Indus mega cards) | Spec 49's `style-rows`, `fill-height`, `absorb` modules are built but never wired: pass element reads through `slotFromReads` in `mediaDecisions` | Never wired |
| Eye Care mega panel cap and padding | `megaPanelRow` carries `decided` per device, as `formControl.wrapperCap` (`822b6b400`) does | Half built |
| Indus hero content in a two-column grid | `heroInner` used to unwrap the hero's layout wrappers (proven at `0ea1a6cb2~1`); restore the unwrap (trigger: `822b6b400` or the removed hero picture, to prove) | Regression |
| Mama's logo `maxHeight` | Lost when the offline look replaced measured paint; `blockPaint` treats a declared `max-*: none` as unbounded, or the look stores measured boxes | Regression |
| Footer column headings lose their look | Keep the design (`289a0b54c`, the heading written into the list block's own heading part; Bean 2026-11-25) and restore the pairing: the absorbed list heading is never paired to that part (`listHeading`), so its look is lost | Restore |
| Trust bar dots | `headerStripBar` writes `textBadgeSeparator` from the repeated glyph and its colour | Never built |
| Eye Care FAQ answers (7 of 8) | The reader cannot resolve `const C = Component; C.FAQS`; `memberRefs` resolves a class alias's static members (also `C.IMG`, `C.COLS`, `C.PRODUCTS`) | Never built |
| Page dimming behind drawers and the basket | Built and working on every site: `sgs/nav-drawer` and `sgs/cart` dim by default (black, 0.55); Mama's sets `scrimColour` `#3a2a22`, `scrimOpacity` 0.45, `scrimFadeDuration` 250, exactly its draft's `rgba(58,42,34,.45)` backdrop. The clone does not copy the draft's backdrop colour, opacity and blur into those settings: read the backdrop element through the universal matching | Clone gap |
| Indus posts with two titles and breadcrumbs | The proven design is an empty post body under the `single` template (FR-48-56); the proof ran posts with content. Narrowing a with-content body is new design: Bean's call | Run choice |
| Unrolled current items (Mama's nav) | Restore `7721da8e2` (`fill-current-attr.mjs`) with the state-parts module it deleted alongside | Rewind loss |
| Time-of-day text | Restore `7f18560bd` (`skeleton-clock.mjs`) | Rewind loss |
| Surfaces opened through the draft's store calls (MIC's shop) | Restore `19b0b1395`, `8c48dec56` (`intake-store-calls.mjs`) | Rewind loss |
| Indus logo from the draft, its part motion and touch effect | Restore `2a393e23a`, `82bc238bf`, `99770b683`; one owner for the logo's parts write (the client file `logo-svgparts.json` becomes a fallback) | Rewind loss |
| Script reveals; the older scrolled-header reader | Restore `36044f919`, `e8a7a8916`, and check `a979a54c9` against today's behaviour writer | Rewind loss |
| Eye Care width rules, phone hide, collapse point, shrink timing | Never built: see RF4 and RF6 | Never built |

## Built-check corrections (2026-11-24, governs the Restore map where it differs)

Every "never built / half built / partly built" verdict was checked against the project's own record (all plans live and archived, Spec 48, 48A and the area specs, git history, the track sessions' outputs): `E:\sgs-tmp\general-cloning\deep\BC1.out` (header, nav, drawer, mega, footer), `BC2.out` (pages, forms, media, motion), `BC3.out` (shop). Spec-first table: `.claude/reports/2026-11-24-clone-faults-spec-first.md`.

- **Eye Care collapse at 1060: built and lost.** The width gate wrote `collapsePoint` (1024, the snap rule) in Eye Care run 13 (2026-11-21); the proof wrote none (suspect: the split-menu change `ce642bca8`, to prove). Fix: the nav halves take the existing `ownAlternativeBelow` branch of `lib/fill-width-gate.mjs::widthGateWrites` (`05b44ffa4`); add the `Object.assign` case to `valueOfKey`. Most of Eye Care's width rules work (ladders, tier hides, step rungs).
- **Structured breakpoint reader: built and lost** (`8c48dec56` with its test, removed by the rewind): restore; `state_keys.w` is added through the same reader.
- **Phone hidden below 1160: one universal visibility rule (Bean 2026-11-24, Spec 48 FR-48-50).** A draft element whose visibility depends on screen width is a visibility setting: the threshold comes from the draft's code (here `phoneDisplay: effW >= 1160`); within 5% of a tier it becomes the tier hide flags, otherwise the block's own breakpoint setting where it has one, otherwise a scoped rule in the block's Custom CSS control. No presence search; the filter rail's `presenceStep` is a different feature.
- **Mega panel cap and padding: a working general mechanism is bypassed.** Bean's wrapper-absorb rule (`4a0a6e537`, `lib/skeleton-absorb-wrapper.mjs::absorbSlot`, `lib/fill-absorbed.mjs`) works; `megaPanelRow` unwraps around it. Route the panel wrapper through it.
- **Social icon sizes: built and broken.** Mama's footer wrote 48px and 20px on 2026-11-19 (`0acc3d028`); lost by a later change (suspects `43c395b42`, `d75dbf82b`, `60b253da1`, `0eaf001ec`): bisect with offline Fill.
- **Footer column headings:** keep the design, fix the pairing (see the Restore map row).
- **Filter chips: built and lost** (`d2bcd2a91`, removed by the rewind): restore the wrapper, taxonomy and chips into `categoryFilter`.
- **Card look: built and working through part-look** (the saved clone's card matches the hand-built one); the Fill pairing is still to fix, and `variantStyle` is never written for a template card. Related-product cards need the same card rules.
- **part-look: a standalone command by design** (template-rework Task 4); it becomes a run stage.
- **Test products: the hiding code exists** (`29f7008f7`, `shop-fixtures.mjs` `hide`), uncalled: call it from a run stage.
- **`disabledItemIds`: built and working**; "soon" entries are dropped by Bean's ruling. `featuredItemIds` and `triggerMode` are not built (`triggerMode` from the draft's hidden "Menu" label).
- **Shrink timing: built.** `lib/motion-behaviour-settings.mjs::shrinkTiming` reads the record through `lib/motion-record-text.mjs::durationOf` and `easingOf` and writes `rowShrinkDuration`, `rowShrinkEasing` and `rowShrinkEasingCustom`.
- **Logo `maxHeight`: built and broken** (`9454cb152`, `31ac60837`; broken by the site look's `max-height: none`).
- **Hero grid: built and broken**; leading suspect the paint guard `822b6b400` (to prove with propose before and after).
- **A block's own transition: narrower behaviour reversed** by `684491a03` (no reason given).
- **Image ratio and height: built modules left unwired by FR-49-35's rule;** the universal route cannot write the slot's `ratio`.
- **Indus review step: the block supports a review inside a step;** the clone's writer `7f957c87c` makes it a sibling; Spec 04's two trees disagree.
- **Not built after a full search:** the FAQ class alias, the "any of" form condition (the form fields' `conditionalOperator` offers equals, not equals, contains, greater than and is empty, ANDed; Spec 04 governs field conditions, Spec 42 the saved `sgs_form` posts), `triggerMode`, `state_keys.w`. The trust bar separator is a content setting of the block (`textBadgeSeparator`, the glyph printed after each text-only badge, and `textBadgeSeparatorColour`): the draft's repeated glyph between labels is matched to it like any other part, not dropped by `headerStripBar`. A featured menu item is left (no draft uses one).

## Custom CSS log, burger bars, basket icon (check of 2026-11-24, `E:\sgs-tmp\general-cloning\deep\w-s4.out`)

- **Custom CSS log per draft:** each surface's Fill report already lists its Custom CSS rules, refusals and gap rows (`fill-report.json` `residualCss`; the proof wrote them on every surface). Missing: one log per draft across all surfaces, and ruling F (archived plan `2026-10-23-cloning-tool-completion.md`, 2026-10-24: every Custom CSS write is cited in `divergences.json` as an accepted difference or in `gaps.json`, and a check refuses an uncited one), never built. Fix: a site-run step merging every surface's latest rules into `sites/<client>/build/qa/custom-css-log.json` and `.md` (surface, block, part, widths, declarations, refused with reason, the covering gap row or ruling), its check, and one line in FR-48-109.
- **The burger's shorter third bar:** the block holds it: each bar is a motion part whose `restWidth` sets its length (`sgsMotion.elements["burger-bar-3"]...restWidth`), with `burgerBarAlign` and `burgerIconWidth`; Mama's hand-built header sets `restWidth` 16px, `burgerBarAlign` start, `burgerIconWidth` 22px, which is exactly the draft's 16px bar with `margin-right: 6px` in a 22px stack. The clone wrote none: `lib/fill-motion-element.mjs::widthHover` fills `restWidth` only from a hover that changes width (`c73411aaf`), and the setting search never offers a motion part's `restWidth`. Fix: write `restWidth` for a static unequal bar, and `burgerBarAlign` and `burgerIconWidth` from the bars' widths and margin; no Custom CSS for it.
- **Basket and header icon sizes:** `sgs/cart.iconSize` has no CSS property in the framework DB, so the route cannot match it; Mama's hand-built header sets `iconSize`, `pillBadgeSize` and the trigger's shared `triggerSize` (the sweep below renamed its old `iconTriggerSize`). Fix: the record places `iconSize` on the svg, and the Custom CSS layout refusal counts only the widths where the element is drawn (it now refuses an element hidden at some widths).
- **Basket trigger: one set of settings for both modes (Bean 2026-11-25; replaces S2).**
  - **The cause.** The pill and the icon button are the same element (`.sgs-cart__trigger`), and each device shows only one of them. Yet the block kept two settings for three properties:
    - corner radius: `pillBorderRadius` and `iconTriggerRadius`;
    - size: `pillMinHeight` and `iconTriggerSize`;
    - padding: `pillPadding` (the icon button had none).

    Their record rows are identical, so no reader can tell them apart. That was S2. The new spec sentence is withdrawn.
  - **The settings.** One setting per property, whichever mode a device shows:
    - **Padding:** `triggerPadding`, the shared `ResponsiveBoxControl`.
    - **Size:** `triggerSize`, per-device `{desktop:{width,height}}` through the Shape size control exported from `blocks/icon/inspector-shape.js`, so Fill's `lib/resolve.mjs::isSizeBox` fills it as it fills `sgs/icon` `shapeSize`. It prints the size as saved, with no 24px floor: a swept pill height below 24px (20px, 0) must render as it did, and the editor control never clamped a new value.
    - **Radius:** `triggerBorderRadius`, one value.
    - **Background stays two settings** (decided 2026-11-25): `pillBgColour*` for the pill and `iconBg*` for the icon button, each with its hover and gradient, painted only in the devices that show that style. A colour setting is one value for every device and no colour setting in the framework is per device, so merging the two would make a header that shows the pill on desktop and the icon button on tablet lose one of its two fills (Mama's tablet hover is pink-soft, her desktop pill hover is yellow). Per-device colour objects would need a new editor control and a render change; two settings need neither.

    The pill's label, border, shadow and background and the icon's glyph, glyph size and background stay separate. Width and height copy the draft as stated: Mama's icon button is 48×48 with padding 0, and her pill is height 48px with padding 0 18 0 14. The old `iconTriggerSize` was a bare number that Fill never filled; `triggerSize` takes lengths and presets.
  - **The panels.** The Styles-tab "Icon button" panel goes. The shared settings move to a "Button" panel on the Settings tab, under "Trigger style".
  - **The migration.** A one-off WP-CLI sweep with no fallback (FP-14). Mama's `pillPadding` becomes `triggerPadding`. `pillMinHeight {desktop:48px}` and `iconTriggerSize {tablet:48}` become `triggerSize {desktop:{height:48px},tablet:{width:48px,height:48px}}`. The two 999px radii become one. The backgrounds are not touched. The sweep keeps what the old block printed: it drops a flat scalar `pillMinHeight` or `iconTriggerSize` (the old block ignored scalars), keeps a pill height of 0, and keeps the icon button's old 24px minimum. Where the pill and the icon button carried different radii only one can stay: `apply` leaves such a post unwritten, lists its id and exits with an error unless the word `accept-conflicts` is given. `build-deploy.py` refuses a deploy to a target whose saved content still holds an old key (`deploy_cart_trigger_guard.py`, a read-only dry run of the sweep on the target; the refusal names the backup `bash scripts/local-wp/backup-remote-db.sh <target> <label>` and the sweep commands), so the order on a live site is: back up, copy the sweep to the server home, dry run, apply, then deploy straight after.
  - **The proof.** render-scope, plus `render-check --only` on the header states on `local-mamas`, shows identical output. The live site gets the backup and the basket, checkout and account checks, and is deployed only with Bean's go.
- **Basket-count row (decided 2026-11-25, not a Bean question).** Mama's basket heading holds the item-count pill inside its line. The route splits it into a row (`lib/template-piece-woo-layout.mjs::countRow`). The row takes its gap (one word space at the heading's font size) and its centre alignment (the draft's `vertical-align: middle`) from the host heading's draft element. The `kind: 'layout'` handover goes.
- **Review-platform blocks (Bean 2026-11-25, parked).**
  - **Where the rule applies.** The rule picks a platform's block only when the draft shows the platform's logo (`rules.reviewPlatform` `needs: mark`). Mama's names Trustpilot without its logo and stays on `sgs/testimonial-slider`, which the 2026-11-24 proof confirmed.
  - **Styling capacity.** The Trustpilot block has 30 styling settings across 2 parts, against the slider's 69 across 6 and Google's 300 across 25. A draft that shows Trustpilot's logo on cards in the client's own colours would lose its look. No current draft does.
  - **Decision for Bean** when such a draft comes: extend the Trustpilot block's styling, or narrow the rule for Trustpilot.
- **FR-48-109's Status** is stale (the loop-copy rule was built in `c8779d5ac`); corrected with the fixes, no new requirement.

## Order

1. Wave A (hours, unblocks everything): RF2's strict default and shared validator with the writer fixes, RF8's Solve address, RF10.
2. Wave B (parallel): RF1, RF3, RF4, RF5, RF6, RF7.
3. Wave C: RF9 and the remaining restores.
4. Reclone all three clients surface by surface; side-by-sides for Bean.

## Decisions and rulings

- **D1 (Bean 2026-11-24):** build as much as possible in parallel, not piece by piece; the main session's agent owns integration: the fixes work together, cause no regressions, and each fix clears every issue it is credited with (checked on the real surfaces before it counts).
- **D2 (spec changes, Bean 2026-11-25):**
  - **Approved:**
    - **S1:** FR-48-113. Strict mode is for tests only.
    - **S3:** R-47-5, FR-48-36 and R-47-7 reworded. A stated value is written unless it equals the default exactly. The 0.5px tolerance is only for comparing renders. A length snaps to a token only when they are equal. The colour ΔE ≤ 2 match stays.
    - **R-47-10:** unchanged (Bean 2026-11-25). The skeleton lint's refusal stands, and a value the skeleton decides already travels in the node's `decided`, which Fill writes (`lib/fill-resolve.mjs`). The process-steps fault is its writer putting `headingLevel` among the attributes (RF2).
  - **Dropped:**
    - **S2:** replaced by the basket trigger unification ("Custom CSS log, burger bars, basket icon").
    - **S4:** FR-48-109 and FR-48-94 already say it. The per-draft Custom CSS log and the burger bars are fixes.
    - **S11:** Spec 48 §3.3 already defines the handover shape. The writers broke it, and two tests locked the wrong shapes in (`tests/skeleton-review-platform.test.mjs`, `tests/template-piece-order.test.mjs`).
      - The review-platform note's wrong shape alone failed Eye Care's home at Fill (`hunt\h5.out`).
      - Fixes, in RF2: the review-platform handover becomes an object (owner `site-info`, kind `presence`); `level: 'h1'` comes from the DB enum; `handoverProblems` is called from `lint.mjs::lintSkeleton`; the tests are corrected.
    - **FR-48-113 order:** already in the spec.
    - **S15:** the broken "built" requirements are recorded as broken here and in the ledger. The spec is left while the fixes land.
  - **Parked:** the "any of" form condition (Spec 04) is a task in `.claude/plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`.
- **Requirements marked built that the 2026-11-24 proof showed broken (fixed by this plan; the spec Status lines stay until the fixes land):** Spec 48 §3.2 and FR-48-3 (the setting record), FR-48-6 rule Links (single-file draft links), FR-48A-13 (the structured breakpoint reader), FR-48-113 (the foundation command's end-to-end run), FR-48-55 (page map, ids, labels), FR-48-81 (hover holds), FR-48-94 (apply stops on rows the block can hold), §3.6 item 20 (state isolation in the walker).
- **The 5% breakpoint snap stays** (Spec 48 FR-48-50, Spec 32 FR-32-13: 1060 snaps to 1024). Not reopened.
- **Blog posts:** an empty post body under the `single` template (Spec 48 FR-48-56, FR-48-96). Not reopened.
- **Footer column headings (Bean 2026-11-25):** keep the heading in the list block's own part; fix the pairing.
- **Visibility by screen width** follows FR-48-50 universally: tier flags within 5% of a tier, else the block's own breakpoint setting, else scoped Custom CSS.
- **D4** withdrawn. **"Glasses (soon)"** stays out. **Featured menu items:** left.
- **Mama's lingering drawer dimming: fixed on `main` (`dba68836d`, not deployed).** The scrim script keyed on the drawer's `[open]`, which the nav store keeps until every exit animation ends; it now treats a closing owner as closed, so the dimming fades with the close for the nav drawer, basket and search drawers (measured: zero at 205ms against 656ms before; `scripts/tests/test-scrim-state.mjs` red before, green after in three engines). Before Mama's next deploy: confirm on the live drawer, with the usual backup and basket, checkout and account checks.
