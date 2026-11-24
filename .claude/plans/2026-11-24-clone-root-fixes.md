---
status: active
doc_type: plan
created: 2026-11-24
---

# Clone root fixes: make the route clone a draft as well as last week's per-surface sessions did, on every surface

Status (2026-11-24, evening): diagnosis complete and fact-checked; no fix built. Waiting for Bean's go on this plan and on the decisions below. Governing specs: `.claude/specs/48-CLONING-SYSTEM.md`, `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md`; parent plan `.claude/plans/2026-11-19-general-cloning-work.md` Task 8 (the proof run and the register).

## Goal and why

Bean clones two new sites (SGS, and MIC, which has a shop) from Claude Design drafts before 2026-11-28, with no hand fixes. The 2026-11-24 proof reclones of Mama's, Eye Care and Indus came out far worse than last week's per-surface sessions. Bean's rule for every fix (2026-11-24): remove the root cause at its layer, cure the same fault everywhere it occurs, and add a guard so the class cannot return in another context; never a patch that only crosses a register row off. Every fix makes the clone write what the framework already has (per-device settings, Custom CSS for non-tier widths and outliers, the motion panel for timings, the handoff's tokens for site defaults), checked against how the hand-built sites set the same look.

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
- **Guard:** a test lint refusing hand-typed setting keys no real record carries (58 test lines type `variants`; 0 of 1,703 real settings have it); a non-blocking seeder report where a setting's `css_element` or name prefix disagrees with its proved part; no "ambiguous" line may name a variant pair.
- **Proof:** offline Fill of Mama's header and drawer and Eye Care's header, diffed against `meas-out-B` and `meas-out-A` (`E:\sgs-tmp\deep-calib\treediff.py`): calibration's writes return or are explained, `featuredBgHover` is gone from Mama's nav and its hover pill is written to the item setting, the cart writes `pillBorderRadius` and `iconTriggerRadius` each in its own mode, Eye Care writes `collapsePoint` 1060 and `triggerMode`.

### RF2. One validity contract across stages

- **Cause:** each producer's output is checked only by the next consumer, and several writers emit shapes their consumer refuses: the review-platform handover as a string, numbered-steps style values on `sgs/process-steps` (the DB gives `steps` a `css_property`), handover kind `layout` (`lib/template-piece-woo-layout.mjs`), the order heading `level: 1` (`lib/template-piece-order.mjs::placeAccess`; the block takes "h1"), and the Indus header `::before` slot. `lint.mjs::lintSkeleton` treats any truthy `css_property` as a style value, though 37 DB values are not CSS (`tag`, `fx:*`, `input:*`, `anim:*`, `grid-template-columns:count`). Template pieces added after propose are linted for style values only. Fill has no type or enum check, so `level: 1` passes Fill and fails at build.
- **Fix:** strict mode off by default (`lib/clone-surface.mjs::siteRunArgs`; implements Spec 48 §3.4 and Bean's 2026-11-21 ruling); one shared validator module (handover shape and kinds, attribute existence, type and enum from the framework DB, a style-value predicate that knows the non-CSS kinds) called by every producer and consumer: propose, template pieces, Fill output, the build. Writers fixed at source: handover objects, numbered-steps values through `decided`, an allowed kind, the heading level from the DB enum.
- **Guard:** a contract test that runs every writer (each rule verdict, each template piece, each handover in `data/skeleton-decisions.json`) through the shared validator with real DB facts; it fails today on all five shapes and finds the `::before` writer.
- **Spec:** S1, S11.

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
- **Spec:** S3, S4. The 5% breakpoint snap stays (FR-48-50).

### RF6. Motion and timing through the existing controls

- **Instances:** a block's own transition survives where the draft has none (`lib/fill-prop.mjs::notPainted` skips an undeclared 0s even when the block default is non-zero; 3,700 walker rows); `holdDefaults` writes hover equal to rest, so `sgs/text` emits its fixed 300ms; a colour- or shadow-only hover gets no timing because the hover state is created only for a movement (`lib/fill-motion.mjs`); `rowShrinkDuration`/`Easing` have no writer (the `rowShrink` writer is in `lib/motion-behaviour-settings.mjs`); the row's inner padding transition is emitted only when a duration is set (framework: `includes/helpers-row-behaviour.php::sgs_row_shrink_settings_css`); the gradient hover holder `groundOf` was lost (restore `4d7f98389` with `partPresent` from `5b74d432b`).
- **Fix:** the timing-only hover state through `paintDuration`/`shadowDuration`; write 0 where the block's own default is non-zero (block timing setting, else the hover state, else Custom CSS); no transition from `sgs/text` when hover equals rest; the `rowShrink` writer also writes duration and easing; the framework emits the inner padding transition by default (a fix, render-scope listed); the restores.
- **Guard:** a contract test that every timing attribute with no `css_property` has a named writer or a listed reason; a post-Fill detector for elements whose default transition is non-zero, the draft declares none and nothing is written.
- **Spec:** S9, S10, S14.

### RF7. Commerce and forms (MIC has a shop: weighted highest)

- **Instances:** the product card is paired with the loop cell, not the card component's root (`commerceRegion`; Mama's `Root/30#0` against `Root>ProductCard@31#0/0#0`, Eye Care `Root>Frame Card@325#0/0#0`), so border, radius, shadow and parts are lost and `variantStyle` comes from the first item; the card, buy-box and account option rules (`showPickers`, `showLadder`, `showShadow`, `showCta`) live only in `part-look.mjs`, which writes scratch copies only and is never part of a run; shop filter chips (no `woocommerce/product-filters` wrapper; the filter block has no look); the catalogue chain (restore `ca6cc7ca5` then `463bd4d9a` then `23a3b93cb`, the catalogue part of `be77be626`, `a3e7fc27e`; `62d4707f5` may fix the pick-up-to-3 limit); forms: card and field paint dropped (`formSteps` host-unread), focus looks judged on the field though `sgs/form` holds `fieldFocus*`, conditional fields break field pairing, Indus step layout, form prefill (lost `1294b5ae3`).
- **Fix:** the card's `draftRef` is the component root; the part-look mode rules move into Fill's output; the filter wrapper is written and the filter blocks get looks; the restores; field state looks resolve through the parent form; fields pair by visible rest-state field.
- **Guard:** propose fails when a written block's `draftRef` is a layout cell (not a painted box or component root); no written block keeps unpaired parts.

### RF8. Foundation and run plumbing

- `lib/site-run-launch.mjs::startSolve` passes the draft address (one launch helper for every spawn); `solve.mjs` resolves its secrets path; strip clears layout ids and "same ids" follows `mirrorOf`; the rerun content marker (restore `9cb1e201c`); stored option scalars compared as WordPress stores them (restore `2d65a2be7` with its base `cb33ac9b1`); a proof run marks or clears surfaces it did not build; Indus posts keep the theme's title, image and comments around the cloned page (find the serving template); page parents and titles on rerun (restore `489e48e65`, check `39d3ea2c1`); the site check scrolls a form into view (restore `f4f63ec77`); the stale page map is refused against a fresh proposal.

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
| Footer column headings lose their look | Discuss with Bean next session: if the current logic (`289a0b54c`, the heading written into the list block) works, keep it; build differently (a standard heading block above the list) only if it is broken or must be built from scratch | Open |
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
- **Footer column headings:** discuss next session (see the Restore map row).
- **Filter chips: built and lost** (`d2bcd2a91`, removed by the rewind): restore the wrapper, taxonomy and chips into `categoryFilter`.
- **Card look: built and working through part-look** (the saved clone's card matches the hand-built one); the Fill pairing is still to fix, and `variantStyle` is never written for a template card. Related-product cards need the same card rules.
- **part-look: a standalone command by design** (template-rework Task 4); it becomes a run stage.
- **Test products: the hiding code exists** (`29f7008f7`, `shop-fixtures.mjs` `hide`), uncalled: call it from a run stage.
- **`disabledItemIds`: built and working**; "soon" entries are dropped by Bean's ruling. `featuredItemIds` and `triggerMode` are not built (`triggerMode` from the draft's hidden "Menu" label).
- **Shrink timing: partly built.** `lib/motion-record-text.mjs::durationOf` and `easingOf` exist; `scrollShrinkOf` does not call them.
- **Logo `maxHeight`: built and broken** (`9454cb152`, `31ac60837`; broken by the site look's `max-height: none`).
- **Hero grid: built and broken**; leading suspect the paint guard `822b6b400` (to prove with propose before and after).
- **A block's own transition: narrower behaviour reversed** by `684491a03` (no reason given).
- **Image ratio and height: built modules left unwired by FR-49-35's rule;** the universal route cannot write the slot's `ratio`.
- **Indus review step: the block supports a review inside a step;** the clone's writer `7f957c87c` makes it a sibling; Spec 04's two trees disagree.
- **Not built after a full search:** the FAQ class alias, the "any of" form condition (the form fields' `conditionalOperator` offers equals, not equals, contains, greater than and is empty, ANDed; Spec 04 governs field conditions, Spec 42 the saved `sgs_form` posts), `triggerMode`, `state_keys.w`. The trust bar separator is a content setting of the block (`textBadgeSeparator`, the glyph printed after each text-only badge, and `textBadgeSeparatorColour`): the draft's repeated glyph between labels is matched to it like any other part, not dropped by `headerStripBar`. A featured menu item is left (no draft uses one).

## Order

1. Wave A (hours, unblocks everything): RF2's strict default and shared validator with the writer fixes, RF8's Solve address, RF10.
2. Wave B (parallel): RF1, RF3, RF4, RF5, RF6, RF7.
3. Wave C: RF9 and the remaining restores.
4. Reclone all three clients surface by surface; side-by-sides for Bean.

## Decisions and rulings

- **D1 (Bean 2026-11-24):** build as much as possible in parallel, not piece by piece; the main session's agent owns integration: the fixes work together, cause no regressions, and each fix clears every issue it is credited with (checked on the real surfaces before it counts).
- **D2 (spec changes, not finalised; nothing changes in a spec until Bean says so):** S1 strict mode is for tests only; S2 a setting that belongs to one version of a block (the basket's pill or icon radius, whose two records are identical) is written only where the element is drawn in that version (one sentence in Spec 48 §3.2; source: `.claude/reports/2026-11-24-clone-faults-spec-first.md` row 2), open for Bean's questions; S3 exact stated values; R-47-10 reworded so non-CSS entries (heading tags) are not called style values. Dropped by Bean: S4 (FR-48-109 and FR-48-94 already say it; what is missing is the log of every Custom CSS setting the clone writes, per draft, and the burger's shorter third line is an existing block setting: both under check, `E:\sgs-tmp\general-cloning\deep\w-s4.out`), FR-48-113 order (already in the spec), S15 (the broken "built" requirements are recorded as broken here and in the ledger; the spec is left while the fixes land). S11 investigated (`w-s11.out`): mostly unnecessary. The rules were already written and enforced (Spec 48 §3.3 handover, FR-48-97 heading level, block.json and the build check own the level's type); the writers broke them and two tests locked the wrong shapes in (`tests/skeleton-review-platform.test.mjs`, `tests/template-piece-order.test.mjs` and its mutations). Only one sentence is proposed for Bean: §3.3 states the shape a skeleton node declares, `handover: [{ owner, kind, slot?, detail }]` with kind text, presence, link or behaviour. Fixes: the review-platform handover as an object (owner `site-info`, kind `presence` proposed), `level: 'h1'` from the DB enum, `handoverProblems` called from `lint.mjs::lintSkeleton` so a bad handover fails at propose, the two tests corrected. Open for Bean: the basket-count row the route creates has no draft element to read its gap and alignment from (proposed: read them at its host heading's draft element); until decided, its `kind: 'layout'` handover is replaced, not routed to Custom CSS. The "any of" form condition (Spec 04) is a task in the parked forms plan `.claude/plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`, not part of this work.
- **Requirements marked built that the 2026-11-24 proof showed broken (fixed by this plan; the spec Status lines stay until the fixes land):** Spec 48 §3.2 and FR-48-3 (the setting record), FR-48-6 rule Links (single-file draft links), FR-48A-13 (the structured breakpoint reader), FR-48-113 (the foundation command's end-to-end run), FR-48-55 (page map, ids, labels), FR-48-81 (hover holds), FR-48-94 (apply stops on rows the block can hold), §3.6 item 20 (state isolation in the walker).
- **The 5% breakpoint snap stays** (Spec 48 FR-48-50, Spec 32 FR-32-13: 1060 snaps to 1024). Not reopened.
- **Blog posts:** an empty post body under the `single` template (Spec 48 FR-48-56, FR-48-96). Not reopened.
- **Footer column headings:** discuss next session; keep the current logic if it works.
- **Visibility by screen width** follows FR-48-50 universally: tier flags within 5% of a tier, else the block's own breakpoint setting, else scoped Custom CSS.
- **D4** withdrawn. **"Glasses (soon)"** stays out. **Featured menu items:** left.
- **Framework bug to log (not a clone fault):** on Mama's live site the nav drawer's dimming stays for a few seconds after the drawer closes, while the other drawers and modals clear in step (Mama's `scrimFadeDuration` is 250); track it in the framework backlog before Mama's next deploy.
