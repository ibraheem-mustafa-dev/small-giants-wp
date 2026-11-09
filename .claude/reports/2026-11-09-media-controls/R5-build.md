# R5 Ship-PM review of Spec 49 section 14 (build plan), read against plugins/sgs-blocks at E:/sgs-tmp/wt-indus

Method: read the whole spec, then checked every named file, function, gate and baseline in the tree. Findings cite the symbol or path. Estimates are the smallest plausible for a cold subagent working from the spec, and assume the contracts below are written first.

## MUST-FIX

M1. Problem: "new ships beside old, removals in one commit" contradicts FP-14 and the block-authoring rule (no server-side legacy fallback, no dual path) and cannot pass the gates. Every adopter (WP-7, 8, 9, 11, 12) would have to keep a working old render path and a new one in the same render.php while the old attributes still exist, and the old sites' saved content only moves at WP-14. Exact fix: replace with per-block cutover waves. A block cuts over in ONE commit: block.json attributes swapped by the generator, render.php, edit.js, plus the migration mapping rows for that block run on the mirrors (the detector is already per-attribute-mapped, so run it with `--block <slug>`). Unmigrated blocks keep the old helpers untouched until their wave. The old helpers (`sgs_render_media`, `sgs_tier_media_render`, `helpers-media-element.php`, the loading trio, the atom registry, `class-sgs-media-element.php`, `media-element-attrs-register.php`, `media-element-attributes.generated.php`, `generate-media-attributes.mjs`, `generate-media-stylesheet.mjs`, `assets/css/media-atoms/`) are deleted in the final wave's commit once a grep for each is empty. Location: spec section 14 last paragraph, section 13 Order, AC-5, AC-25.

M2. Problem: the cutover collides with the gate suite (244 entries in `scripts/gates.json`; 11 are media gates: `check-media-atom-purity`, `check-media-breakpoints`, `generate-media-stylesheet`, `check-media-stylesheet`, `test-media-atom-parity`, `test-media-attr-parity`, `test-media-injection-parity`, `check-media-attributes-parity`, `check-media-disclosure-coverage`, `test-media-enum-vocabulary`, `generate-media-attributes`), and the inspector-scan rules 37 to 40 (`37-media-no-handroll` flags a block declaring media-family attrs without `supports.sgs.mediaElements`; the new slot attributes will trip it). Also `check-dead-controls`, `check-duplicate-controls`, `check-inert-controls`, `check-box-family-guard`, `check-wiring-fingerprint` (fails when a block.json attribute is not in the DB) and `check-markup-neutral` baseline on the old shapes. Exact fix: WP-15 is split. WP-15a (gate groundwork, runs right after WP-1, before any adopter) teaches each gate that `supports.sgs.mediaSlots` (the new declaration, written by the generator) exempts a block from the old-layer rules and routes it to the new ones, adds the new gates (AC-2 detector, AC-5 grep, AC-18 hand-rolled picker, G-7 CSS size), and lists in one file `scripts/data/media-cutover.json` the blocks already cut over. Gates read that one file. Location: section 14 WP-15 row.

M3. Problem: the framework DB is one shared file, a reseed takes about 330 s, runs only from a clean worktree at a commit that contains `origin/main`, and `check-wiring-fingerprint` fails the build for any attribute added to a committed block.json that the DB does not hold. The spec has eight parallel packages each adding or removing attributes, and says nothing about this. "No commits during a reseed" means eight agents committing to main will keep invalidating each other's reseed and publish (publish is keyed to HEAD's tree). Exact fix: add a "Reseed and deploy lane" section: (a) one agent, the Integrator (the main thread), owns every reseed, `css-property-classifications.json` commit and deploy; build agents never run `sgs-update`, never deploy. (b) Each build agent works in its own `git worktree` (copy, never link, node_modules), and hands the Integrator a commit list. (c) The Integrator lands cutovers in waves: merge a wave's commits to main, then reseed once, commit the regenerated tracked files, then run both gate tiers, then deploy. (d) During the 5 to 6 minute reseed and the publish step no agent commits to main (agents queue their commits; the lane is announced in the brief). Reseeds per plan: WP-1, one per cutover wave (about 4), one at final removal. Location: section 14 preamble; section 8.1.

M4. Problem: the contracts the packages are meant to code against are not defined, so every package would stub them differently. Missing: the exact JSON shape of `media-settings.json` (with an example entry), the slot object, the `$slot` and `$context` arguments of `SGS_Media_Renderer::render( $slot, $attrs, $context )`, the emitter contract, the rule-table format in section 9.3, the `mediaPreview` signature, `SGS_Media_Priority::resolve()` arguments, the `inspector-focus` store shape, the `media-shapes.json` shape, the stub each dependant codes against, and file names for everything (see "Missing contracts" and "Example contracts" below, which are written ready to paste into the spec as new section 14.0). Exact fix: add section 14.0 "Contracts" before the package table, written by the Ship-PM, then freeze it as spec_version 0.2 before WP-1. Location: spec section 14 and section 6.1, 6.2, 9.3.

M5. Problem: file ownership is not real. Verified overlaps: (1) `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` is 3842 lines and 14 commits touched it since 2026-10-20 (Indus, Eye Care, Mama's work). WP-8 owns "its background code" but the file also carries the media-box overflow/z-index rule (`:has(.sgs-media-box)`, around the hover-scale block), the overlay opacity tiers, the min-height tiers and the `::before` layer; WP-2 (helper, hover zoom, overlay inside the helper) and WP-10 (parallax overscan, `.sgs-bg-media` target) both need parts of it. (2) `src/blocks/hero/block.json` (1416 lines) and `render.php` (1710) belong to WP-9 but the hero background goes through the same wrapper (WP-8) and hero split image through WP-11-style code; Eye Care's hero is live and edited by the Eye Care stream (21 commits to `src/blocks/hero` since 2026-10-20). (3) `assets/css/media-element.css` is GENERATED from `assets/css/media-atoms/*.css` by `generate-media-stylesheet.mjs` (check gate fails on hand edit). WP-2 "owns assets/css/media*.css" and WP-6 owns "mask CSS" and WP-2 also owns overlay and hover zoom: three writers on one generated file, the exact clobber the generator's own docblock warns about. (4) The block.json files: the WP-1 generator writes attributes into every adopter's block.json, which WP-7, 8, 9, 11 and 12 own. (5) `src/components/MediaElementControls.js`, `MediaPicker.js`, `FocalPositionField.js`, `ResponsiveOverride.js`, `ResponsiveControl.js`, `MediaSizingPanel.js`, `MediaElementPanel.js` sit in `src/components/`, outside `src/components/media/`, so WP-4's ownership line does not cover the files it must rework; and `src/components/media/atoms/*` (old atoms) sits inside WP-4's directory while still in use by unmigrated blocks. (6) `src/blocks/extensions/motion/*` (WP-10) also holds `generated-fx-effect-meta.json`, written by `run-motion-fx-generators.js`, and the DB FX registry (`seed_motion_fx_data.py`), a reseed-time writer. (7) `tests/fixtures/motion/render-paths.json` (one hand-curated file: media and background need new path entries) and `tests/fixtures/motion/pages/{parallax,looping-media,motion-per-device}.json` (hold old attributes) have no owner. (8) Hot shared JSON baselines (`element-manifest-baseline.json`, `universal-fit-baseline.json`, `editor-render-parity-baseline.json`, `control-ux-baseline.json`, `dead-controls-baseline.json`, `wiring-fingerprint-baseline.json`, `shadow-sources-baseline.json`) would be edited by every adopter. Exact fix: add an ownership map with a "shared files" table: container-wrapper split first (see M6), one writer per generated file (the Integrator regenerates, agents never commit generated output), CSS partials one file per package (`media-base.css` WP-2, `media-mask.css` WP-6, `media-overlay.css` WP-2, `media-video.css` WP-2, `media-bg.css` WP-8) each loaded by section 6.8's conditional rule, baselines edited only by the Integrator, fixtures owned by named packages. Location: section 14 package table, "Owns" column.

M6. Problem: WP-8 is the hidden giant. It edits a 3842-line file (the project rule says 500 and a file over 1000 must not grow without a split) with media code interleaved with spacing, grid, separators, scroll-row and pin code. Exact fix: add a prerequisite package WP-0b "Wrapper split": mechanical extraction of the background and media code from `class-sgs-container-wrapper.php` into `includes/class-sgs-background-layer.php` (and the media-box overflow and hover rules into the renderer), no behaviour change, proved by the existing render fixtures and a before-and-after diff of rendered HTML for the canary pages, landed and pushed alone before the wave starts. Then WP-8 owns only the new file. Estimate 30 to 45 min. Location: section 14, before WP-8.

M7. Problem: the dependency order is wrong in three places. (a) WP-10 says "Needs WP-1" but parallax overscan is "computed by the renderer" (WP-2) and printed as `inset`/`height` on `.sgs-bg-media` (WP-8), and the Background target needs a real element in every state (WP-8). Parallax and Ken Burns runtime reads the markup shape from WP-2 and WP-8. (b) WP-5 (panel host and rule evaluator) needs the rule table format, which is defined only in WP-1's JSON; it does not need WP-4. (c) The byte-identical emitter and `mediaPreview` fixture (section 6.2) needs WP-2 and WP-4 and has no owner; WP-15 is last, too late for a contract the adopters depend on. Exact fix: WP-10 splits into WP-10a (inspector-focus store, Effects targets reading `absentIn`, `sgs/media` `motionSurface`, parallax and pinned control fields; needs WP-1 only) and WP-10b (overscan and `.sgs-bg-media` runtime wiring, pinned runtime; needs WP-2 and WP-8). The twin parity fixture is owned by WP-4 and runs against the WP-2 emitter, so WP-2 and WP-4 are both done when it is green. Location: section 14 table and the sentence below it.

M8. Problem: the proofs are in the wrong order and too few. PS-1 (DB acceptance) is a half-hour proof that also hides a schema decision: section 8.1 renames `css_element` to `paint_node`, but `css_element` is referenced by about 110 files (seeder, `schema.sql`, `block_attributes`, `motion` target tables, scripts, checkers, specs, `sgs-db`). That rename is itself a migration-method job (survey, fix, check) and is not sized anywhere. Exact fix: do not rename. Add a nullable `paint_node` column (a one-line migration, idempotent, seeded by the media seeder only) and have the new gates and the cloner read `paint_node`; leave `css_element` as the selector element. Rename never, or in a separate spec. Also add PS-6 "attribute-count blast" (the section 8 table times roughly 25 slots is hundreds of new `block_attributes` rows; prove the reseed still finishes in time and the budget gate on block.json size passes) and PS-7 "twin parity feasibility" (a one-table emitter that produces identical text in PHP and JS for 5 sample rows). Location: section 8.1, section 14 Proofs.

M9. Problem: the migration plan cannot run as written. WP-14 "Needs WP-1" only, but the mapping needs the final attribute names and each adopter's per-block shape; section 13 says nothing is rewritten until the survey is clean across all five mirrors, yet adopters need migrated content to verify their render. Eye Care is the site Bean presents ("no cloning-route step, push or calibration writes to it") and its hero Custom CSS lines are removed by the migration; Indus is signed off; Mama's is mid-build. Also the canary's motion fixture pages (2103, 2109, 2113, 2603, 2740, 3037, 5223, 5226, 5229, 5395) hold old attributes and must never be deleted, so they must be migrated and the motion probes re-run. Exact fix: WP-14 is built per wave (see M1), the detector is delivered with each wave's mapping rows, and a table "Site by site migration" says: mirrors first (local-indus, local-mamas, local-eye-care, the canary mirror), then sandybrown canary with its 10 fixtures and a motion QA full tier, then indus-test, mamas-test, eye-care-clone-test, and eye-care-test ONLY after Bean approves the date (it is the presented site and gets a database backup first and a visual comparison at 375, 768 and 1440). Location: section 13.

M10. Problem: nothing says how nine or ten parallel agents avoid destroying each other's work. Recorded failures: subagents destroy shared tree work, shared-worktree commit traps, builder commits reach peer deploys, never link node_modules into a worktree, one headed Chrome, the Hostinger edge 403s on burst, shared checkout runs stale. Exact fix: add "Agent working rules" (copy the memory-derived fence into every brief): own worktree under `E:/sgs-tmp/wt-<package>` created at the contracts commit; commit with explicit pathspecs; rebase on main and push after each task; never run `sgs-update`, deploy, `build-deploy.py`, or live Playwright against shared sites (the Integrator does, one at a time); editor checks on a local mirror only; eight agents at once maximum (`subagent concurrency ceiling is eight`). Location: section 14 preamble.

## SHOULD-FIX

S1. `render-paths`: `tests/fixtures/motion/render-paths.json` lists render branches per motion block and `check-motion-part-render-paths.py` reads it; `sgs/media` gains parts (`media`, `background`, `background-video`, `background-svg`) and the helper/no-helper branch. Add to the WP-10a deliverables a path entry per helper state (no helper, helper with fill, helper with mask, picture, mixed kind) and per background state (image, picture, video, svg, tile, none), each with an `absentIn` listing. Provide the fixtures as data the package edits; one owner (WP-10a).

S2. Motion fixtures and live QA: `scripts/motion-qa/full-tier-paths.json` already triggers the full tier on `view.js` changes; add `assets/css/media-*.css`, `includes/media/**`, and `src/components/media/**` so the cutover wave deploy runs the full tier (950 s) once per wave on the canary, with the Integrator taking turns with other sessions by message. Do not run motion probes in parallel.

S3. Section 14 says WP-2 to WP-6, WP-10, WP-13 and WP-14 can run together once WP-1 lands. In fact: WP-2, WP-3, WP-4, WP-6, WP-10a, WP-13 (schema reader only) are truly parallel after WP-1; WP-5 needs only the WP-1 rule-table format; WP-14 needs the per-wave mapping and is therefore serial per wave. Replace with the table below.

S4. Packages WP-11 and WP-12 are 4 and about 20 blocks. Split into four waves by shared render path, not by author: Wave 1 (`sgs/media` WP-7, `sgs/decorative-image`, gallery), Wave 2 (backgrounds: container, trust-bar, site-header, site-footer, multi-button, physics-canvas, nav-drawer, then hero), Wave 3 (card-grid, post-grid, product-card, buybox, brand-strip, responsive-logo), Wave 4 (team-member, testimonial, before-after, timeline, choice-flow, image-sequence, Lottie, cart thumbnails, product-search, swatches). The spec lists these blocks in section 10.4 and in the removal list (15 files reference the functions to remove) but only WP-7 to WP-9, WP-11 and WP-12 mention them, and trust-bar, site-header, site-footer, multi-button, physics-canvas, responsive-logo, info-box, testimonial and brand-strip have no named owner.

S5. Removal inventory is incomplete. Section 14 and FR-49-7/15 list `sgs_tier_media_render`, `sgs_render_media`, `helpers-media-element.php`, the loading trio. The tree also holds `includes/class-sgs-media-element.php`, `media-element-attrs-register.php`, `media-element-attributes.generated.php`, `helpers-media-position.php`, `helpers-tier-queries.php`, `image-controls.php`, `src/blocks/extensions/image-controls.js`, `media-elements.js`, `media-top-tone.php`, `product-card-image-size.php`, `sgs_responsive_image` (15 files call it), `scripts/surveys/check-image-controls-support.py` and `census-media-presentation.py`, and the `supports.sgs.imageControls` and `supports.sgs.mediaElements` flags the block-authoring rule requires. Add them to the removal list (generated by a grep script, AC-5) with each owner.

S6. Spec says SGS images declare `"imageControls": true` (block-authoring rule); the new system replaces that flag with `supports.sgs.mediaSlots`. Name the new flag, update `.claude/rules/block-authoring.md` in WP-15.

S7. Specs 02, 32, 35, 35A, 48 and rules are edited only by WP-15 at the end. Spec 35 D5 and Spec 32's inline rule are amended at WP-1 time (they govern the data model the packages build against): move the Spec 35 D5 and 32 amendments into WP-1's commit.

S8. Eye Care and Mama's (see the dedicated section): add a freeze line to the plan.

S9. Section 7.7 relies on "position comes from block context" (PS-5). The caching behaviour under LiteSpeed is a render-time fact, but block context reaching a nested image (header, first top-level section) depends on `render_block` filters and `SGS_Container_Wrapper` context; define the context array now (see contract C3).

S10. Estimates: the plan gives none. Add them (table below) so the owner can see the critical path (Contracts, Proofs, WP-1, WP-15a, Wave 1) is the length of the plan.

S11. OQ-1 (CSS budget) and G-7 (media.css under 10 KB, optional parts under 4 KB) are in the build path. State the measurement command now (`wc -c` on `assets/css/media-*.css`, compressed with `gzip -9`) so WP-2 has a pass/fail.

## MISSING

MS1. File names and paths. Add: `plugins/sgs-blocks/includes/data/media-settings.json`; `includes/data/media-shapes.json`; `schemas/media-slot.schema.json`; `schemas/media-settings.schema.json` (validates the truth table); `includes/media/class-sgs-media-renderer.php`; `includes/media/class-sgs-media-emitter.php`; `includes/media/class-sgs-media-priority.php`; `includes/media/class-sgs-media-settings.php` (loader, one place reading the JSON, cached by file mtime); `includes/media/class-sgs-media-validator.php` (FR-49-12 string validator); `src/components/media/emitter/mediaPreview.js`; `src/components/media/rules/evaluateRules.js`; `src/components/media/store/inspector-focus.js`; `scripts/generate-media-slots.mjs` (the new generator, which replaces `generate-media-attributes.mjs`); `scripts/migrate-media-system/`; `assets/css/media-base.css`, `media-mask.css`, `media-overlay.css`, `media-video.css`, `media-bg.css`; `scripts/data/media-cutover.json`; `tests/fixtures/media/` (the fixture matrix for AC-3, 6, 7, 16); `tests/php/Media/` and `src/components/media/__tests__/`.

MS2. Stub for dependants. Every Provides column needs a stub the dependant can build against before the real code lands: committed at the contracts commit, one file each: `SGS_Media_Renderer::render()` returns `<img>` with the first Source's URL only (no helper, no CSS); `SGS_Media_Priority::resolve()` returns `array( 'loading' => 'lazy', 'fetchpriority' => '' )`; `mediaPreview()` returns `{}`; `evaluateRules()` returns all controls visible; `ResponsiveField` and `MediaSlotField` as pass-through wrappers; the `inspector-focus` store as a plain `@wordpress/data` store with `open( clientId, panel, target )`. Each stub carries the final signature and a docblock "REPLACED BY WP-n", and the contracts commit includes a stub self-test.

MS3. The `$slot` argument: in section 14 `render( $slot, $attrs, $context )`. Define `$slot` as a descriptor array (prefix, kinds allowed, role), `$attrs` as the block's `$attributes`, `$context` as render facts (see C3). Currently none of the three is defined.

MS4. Emitter contract: how the generic emitter treats responsive values, inherit-down, the `paint_node` selectors (`.{uid}` surface, `.{uid} .sgs-media-el`, `.{uid}::after`, `.{uid} .sgs-media-box__mask`), the order of declarations, the media query wrapping (`SGS_Breakpoints::media`), and the scope hash (`ksort` before hash, `check-ksort-before-hash.py`). Without it the PHP and JS twins diverge.

MS5. Rule-table format, with the vocabulary (kinds, conditions, `omittedWhen`, `hiddenNote`, panel membership, order) in a JSON schema.

MS6. Definition of the `sgs-update` acceptance for the new attributes (PS-1): which columns (`css_property`, `tier_shape`, `emit_shape`, `meaning`, `role`, `canonical_slot`) each setting row needs, and the `attr-classification-overrides.json` entries, plus how the generator avoids classification drift (`css-property-classifications.json` regenerated by the reseed and committed before deploy).

MS7. Test harness per package: PHPUnit class names and the Jest layout, the Playwright fixture page ids on the canary or a local mirror, the three-browser run command (`probe-motion-model.mjs --engine chromium --engine firefox --engine webkit`), where AC results are recorded (`.claude/reports/2026-11-xx-media/ac-results.json`) and who signs off (Integrator reads the DOM at 375/768/1440 and Bean's eye per FP-13).

MS8. Rollback per wave: restore that site's DB backup and redeploy the previous tag; the plan names it in section 13 only for the final release. Per wave, state the tag and the backup path.

MS9. The Mama's and Eye Care freeze rule and the pairing table (below).

MS10. The reseed lane (M3), the agent rules (M10), the wave table (S4) and the owner/estimate columns.

## Dependency and parallelism, as it really is

Critical path: Contracts (writing, frozen) then Proofs then WP-1 then WP-15a (gates) then Wave 1 cutover (WP-7 media, which needs WP-2, WP-4, WP-5) then Wave 2 (backgrounds, needs WP-0b and WP-10b) then Waves 3 and 4 (parallel) then final removal and WP-15b.

Truly parallel right after WP-1 (6 agents): WP-2 (renderer, emitter, CSS), WP-3 (priority), WP-4 (editor fields and `mediaPreview`), WP-5 (rule evaluator and host, needs only the WP-1 format), WP-6 (mask registry, `MaskField`, mask CSS file), WP-10a (store, targets, parallax fields), WP-13 (cloner reads the schema), plus WP-0b (wrapper split) which can start before WP-1. Not parallel: WP-14 (per wave), WP-10b (needs WP-2 and WP-8), WP-8 (needs WP-0b), adopters (need their wave's dependencies), WP-15b.

Proof order: PS-1 (DB acceptance) and PS-7 (twin parity feasibility) first because they decide WP-1. PS-2 (fill fallback) decides WP-2. PS-3 (mask stroke) decides WP-6 and the border controls. PS-4 (pinned on WebKit) decides WP-10b. PS-5 (position-based loading on cached pages) decides WP-3. They are independent, so run them as five parallel agents, each 15 to 30 minutes. The spec says results update the spec before WP-1; make it "before the package that depends on it" so only PS-1 and PS-7 gate WP-1.

Are the proofs enough, and in order? Not enough for the cutover: add a no-regression proof PS-8 "render equivalence": for each cut-over block, render the old and the new from the same migrated attributes on the canary pages and compare computed styles (position, size, object-fit, object-position, padding, border, shadow) at 375, 768 and 1440. This is the closing check per FP-11 and FP-13 and is not a package acceptance in section 12 (AC-25 compares only before and after on sites, at the end).

## Test-site and deploy sequence (missing from section 14)

1. Local mirrors only for build and editor checks: local-indus, local-mamas, local-eye-care; the canary mirror for fixtures. 2. Integrator deploys one wave at a time to sandybrown (canary) with `build-deploy.py --target sandybrown` and the full motion tier (`--motion-qa-tier full`, since shared effects change). 3. Then `indus-test`, then `mamas-test` (named explicitly), one at a time with the network idle (the sandybrown upload dropped twice on 2026-11-08; "measure the link and CPU first"). 4. `eye-care-clone-test` is a clone target only, so it can take the wave. `eye-care-test` (the presented site) takes a wave only after Bean agrees and only with a database backup and a computed-style comparison at the three widths. 5. The reseed lane (M3) sits before every deploy.

Do not use `--allow-dirty` or `--skip-verify`. Both gate tiers run before pushing new attributes. Hostinger's edge blocks editor-load bursts: editor checks stay on the mirror.

## Is "new beside old, then remove" feasible with the gates?

No as written (M1, M2). Yes as per-block cutover with a cutover registry: the gates read `scripts/data/media-cutover.json`, old rules ignore a cut-over block, new rules apply to it, and the final commit empties the old rule set. FP-14 explicitly sanctions "the full roster migration plus a WP-CLI batch sweep" with no `deprecated.js`; per-wave sweeps over a mirror are the same method applied in slices.

## Check of the Eye Care parallel work

State: Eye Care (Front F) is hand-built, presented, and being finished by its own stream (LEDGER Front F; plugin `d78a2ef5e`; 15-item list investigated, not yet applied). The hero parallax is one of the listed Eye Care items and section 13 deletes its two Custom CSS lines and the heading move. The hero block (`src/blocks/hero/*`) is the file the Eye Care stream edits most (21 commits since 2026-10-20), and WP-9 rewrites it.

Collisions: (1) WP-9 and the Eye Care stream both own `src/blocks/hero/block.json` and `render.php`. (2) WP-1's attribute removals (the attributes in section 8, "Removed") hit blocks Eye Care uses: hero, container, trust-bar, header, footer, multi-button. (3) Wave deploys to `eye-care-test` would change the presented site mid-finish. (4) The cloning-pipeline rule says no pipeline step writes to `eye-care-test`; the migration is a write.

Fixes: Eye Care hero fixes that fit the existing controls land first (apply the 15-item list now, before Wave 2); a freeze line on `src/blocks/hero/*` and `class-sgs-container-wrapper.php` during WP-0b (30 to 45 min) and during Wave 2; after Wave 2 the Eye Care site gets its hero migrated by the detector with a backup and the two Custom CSS lines removed in the same operation, and Bean checks it by eye (FP-13). Eye Care's 3 choices recorded in its list file are independent of the media system. Eye Care must not wait for this spec: it ships on the current system, and the migration moves it later.

## Check of Mama's

State: Mama's (mamas-test, local-mamas, `sites/mamas-munches-redesign`) is in Phase 0 and Round 4; Bean has the "waits for this" rule for the media-related items. LEDGER shows its Phase 0 item list names the media and background difference classes (container padding, overlays through `sgs/decorative-image`, filters). Mama's uses `sgs/decorative-image` (WP-11 scope), `sgs/media` and container backgrounds.

Collisions: (1) the Mama's Phase 0 sweep already stored 30 container paddings per-device on local-mamas using the OLD attribute shapes; migration must carry them (the detector's mapping for container padding is not in section 13). (2) Mama's Round 4 work adds more old-shape media settings every day, enlarging the migration. (3) Any Mama's clone settings written by the cloner after WP-13 lands would use the new schema, while the live pages still carry the old shape, so the cloner switches only at the same wave as the blocks.

Fixes: Mama's finishes Phase 0 and Round 4 on the old system (no wait on the new one) EXCEPT the media-shaped items parked in its plan (overlays, circle and shaped images, per-device backgrounds, the fill-height collapse); those wait for Wave 1 and 2 and are listed in the plan against their section 11 rows. The detector's survey (AC-25) runs on local-mamas at each wave so the migration cost is known. Mama's pushes to mamas-test only between waves, never mid-wave.

## Secretly huge

H1. `class-sgs-container-wrapper.php` (3842 lines, interleaved concerns): 30 to 45 min to split, then 45 to 60 for the new background layer. H2. The `css_element` to `paint_node` rename (about 110 files): not needed; make it an additive column (5 to 10 min). H3. WP-12's roughly 20 blocks (about 10 min each for the simple ones, 30 min for buybox and product-card); 150 to 200 min of agent time, in 4 parallel packages. H4. The hero block (1416-line block.json, 1710-line render.php, `canvas-preview.js`): 45 to 60 min, with Eye Care's freeze. H5. The removal sweep across 15 render files, 25 `mediaElements` block.jsons, 48 files importing `MediaPicker`, `FocalPositionField` or `MediaUpload` (25 of them `MediaUpload`): the gate in FR-49-26 would fail the build at the first adopter; migrate the editor pickers by detector (migration-method, 3+ files), 30 to 40 min with the detector. H6. Tests: AC-3, AC-6, AC-16 fixtures need a PHP-and-JS harness that renders through the real render.php (the render harness runs in its own process); 30 to 45 min. H7. The 330 s reseed times at least 8 on the critical path.

## Example contracts (ready to paste as section 14.0)

C1. `includes/data/media-settings.json`

```
{
  "$schema": "../../schemas/media-settings.schema.json",
  "version": 1,
  "slots": {
    "media":      { "kinds": ["image","video","embed","svg","lottie"], "responsive": true },
    "background": { "kinds": ["image","video","svg","tile"],            "responsive": true },
    "layer":      { "kinds": ["image","svg"],                            "responsive": true }
  },
  "settings": [
    {
      "base": "Fit",
      "type": "string",
      "enum": ["cover","contain","fill","none","scale-down"],
      "enumByKind": { "background": ["tile","natural"] },
      "default": "cover",
      "responsive": true,
      "css": { "property": "object-fit", "paint_node": "media" },
      "control": { "component": "FitField", "label": "Fit", "help": "How the picture fills its space.", "panel": "size-and-crop", "order": 5 },
      "visible": { "kinds": ["image","video"], "when": [ { "kind": "file" }, { "not": { "size": "natural", "crop": false } } ] },
      "slots": ["media","background","layer","item","image","photo","logo","option"],
      "meaning": "Sets object-fit on the media element."
    }
  ]
}
```

Rules: `base` plus the slot prefix gives the attribute name (`mediaFit`, `backgroundFit`). Every responsive setting's stored value is `{ "desktop": ..., "tablet": ..., "mobile": ... }`. `paint_node` is one of `media`, `surface`, `overlay`, `mask`, `ring`. `visible.kinds` uses the letters of section 9.3 spelled out. `when` entries are atoms from a closed vocabulary (below).

C2. `schemas/media-slot.schema.json` (the shape the cloner and generator write)

```
{
  "mediaSource": { "desktop": { "kind": "image", "id": 123, "url": "https://x/y.jpg", "width": 1600, "height": 900, "mime": "image/jpeg" },
                   "mobile":  { "kind": "image", "id": 124, "url": "https://x/y-m.jpg", "width": 800, "height": 1000, "mime": "image/jpeg" } },
  "mediaAlt": "Optician testing a patient's eyes",
  "mediaDecorative": false,
  "mediaFit": { "desktop": "cover" },
  "mediaFocal": { "desktop": { "x": 0.5, "y": 0.3 }, "mobile": { "x": 0.2, "y": 0.4 } },
  "mediaHeight": { "desktop": "420px", "mobile": "260px" },
  "mediaRatio": { "tablet": "4 / 3" },
  "mediaRadius": { "desktop": { "topLeft": "12px", "topRight": "12px", "bottomRight": "12px", "bottomLeft": "12px" } }
}
```

Rules: additionalProperties false; an unknown key or a wrong-typed value is refused with the setting name; `url` must be a media-library URL or an `https` URL; no `javascript:`; `x` and `y` are numbers in [0,1]; a device key outside desktop, tablet, mobile is refused.

C3. `SGS_Media_Renderer`

```
final class SGS_Media_Renderer {
    /**
     * @param array  $slot    { prefix: string, kinds: string[], role: 'content'|'background'|'layer'|'item' }
     * @param array  $attrs   the block's $attributes (reads only keys starting with $slot['prefix'])
     * @param array  $context render facts, all optional, never a request counter:
     *                        { uid: string, block: string (e.g. 'sgs/media'), area: 'header'|'content'|'footer'|'hidden-surface',
     *                          section_index: int|null (0 for the first top-level section), item_set: array|null ({ index: int, columns: int }),
     *                          lead_allowed: bool, in_editor: bool, extra_class: string, anchor: string }
     * @return array{ html: string, css: string, needs_helper: bool, lead_candidate: bool, preload: array }
     */
    public static function render( array $slot, array $attrs, array $context = array() ): array;
}
```

Behaviour: `css` is the output of the emitter, passed by the caller to `sgs_collect_css`, never printed inline. The caller prints `html`. `preload` is the array of `{ href, imagesrcset, imagesizes, media }` that `SGS_Media_Priority` consumes. Throws nothing; an empty or deleted source returns `html` equal to the empty string.

C4. Emitter contract

```
SGS_Media_Emitter::declarations( array $setting_row, mixed $resolved_value, string $uid ): array  // list of "property:value" pairs
SGS_Media_Emitter::css( array $slot, array $attrs, string $uid ): string
```

Algorithm: for each setting in the JSON whose slot list includes the prefix; for each device present (desktop first) apply inherit-down per attribute; skip empty; validate with `SGS_Media_Validator::css_value()`; group by `paint_node` into selectors (`media` = `.{uid} .sgs-media-el` when a helper exists, else `.{uid}`; `surface` = `.{uid}`; `overlay` = `.{uid}::after`; `mask` = `.{uid} .sgs-media-box__mask`); wrap tablet and mobile in `SGS_Breakpoints::media()` and emit them after desktop; sort keys with `ksort` before hashing; the uid is the hash of the sorted slot values. JS twin: `mediaPreview( slot, attrs, uid ): string` returns the same text; the parity fixture compares the strings byte by byte over the `tests/fixtures/media/matrix.json` cases (every Height and Ratio combination, mixed kinds, a mask, a helper).

C5. Rule table (inside the settings rows, section 9.3)

```
"visible": {
  "kinds": ["image","video","embed","svg"],      // resolved kind at the active device; letters I V E S L B spelled out
  "when": [ { "attr": "Size", "in": ["height","ratio"] } ],   // closed atoms: attr/in, attr/notEmpty, kindIs/file, not, any, all, maskOn, helperOn
  "omittedWhen": [ { "maskOn": true } ],
  "panel": "size-and-crop", "order": 3,
  "hiddenNote": "Focal point ({device}) is saved but unused: {reason}."
}
```

Evaluator: `evaluateRules( settings, attrs, device, slotPrefix ) => { visible: string[], hiddenWithValue: { base, device, reason }[] }`. The same evaluator runs in Jest and in PHP's gate (`check-media-rules.py` reads the JSON, no second implementation).

C6. `mediaPreview( slot, attrs, uid )` returns `{ css: string, className: string }`; `className` is the scope class so the editor and front end rules are the same.

C7. `SGS_Media_Priority::resolve( array $context, array $slot_facts ): array` returns `{ loading: 'eager'|'lazy', fetchpriority: 'high'|'', claims: bool, preload: array }`; it keeps its state in the request's render-time block context, not a counter (PS-5).

C8. `inspector-focus` store: `open( { clientId: string, panel: 'effects'|'background'|..., target: string } )`, selectors `getRequest( clientId )`, `clear( clientId )`; Effects reads and clears.

C9. `media-shapes.json`: `{ "shapes": [ { "slug": "squircle", "label": "Squircle", "viewBox": "0 0 100 100", "path": "M...Z", "fit": "stretch" } ] }`, one closed path each; test: every path closes and parses; every slug unique; absorbed icon shapes keep their slug.

C10. `generate-media-slots.mjs`: reads the JSON plus a block's `supports.sgs.mediaSlots` (`[ { "prefix": "background", "kinds": ["image","video"], "role": "background" } ]`) and writes the attribute objects into that block's `block.json`, between `/* media-slots:begin */` and `end` markers (JSON has no comments, so use a reserved key block: `"_generated": "media-slots"` on each generated attribute so the detector finds them), `--check` fails on drift, `--block <slug>` limits the write. One writer per block.json: the package that owns the block runs it.

## Corrected package table (smallest plausible, one cold agent each)

| Pkg | Owns (only it edits) | Needs | Provides (frozen contract) | Est. |
|---|---|---|---|---|
| C0 Contracts (Ship-PM, main thread) | spec 14.0, stubs, `schemas/*`, example JSON, `scripts/data/media-cutover.json` (empty) | none | C1 to C10 stubs, ownership map | 30 min |
| PS-1, PS-7 | proof scripts and `.claude/reports/2026-11-xx-media/proofs/` | C0 | DB acceptance, twin parity verdicts | 20 min each |
| PS-2, PS-3, PS-4, PS-5 | same folder | C0 | verdicts that edit spec sections 7.2, 7.5, 10.3, 7.7 | 15 to 30 min each (PS-4 on WebKit longest) |
| WP-0b Wrapper split | `includes/class-sgs-container-wrapper.php`, new `class-sgs-background-layer.php` | none | no-behaviour-change file split | 30 to 45 min |
| WP-1 Core | `includes/data/media-settings.json`, `media-shapes.json` (empty list), schemas, `generate-media-slots.mjs`, additive `paint_node` column and seed rows, Spec 35 D5 and Spec 32 amendments | PS-1, PS-7 | C1, C2, C10; the Integrator reseeds | 45 to 60 min (+ 6 min reseed) |
| WP-15a Gates groundwork | `scripts/gates.json`, inspector-scan rules 37 to 40, new gates, `media-cutover.json` readers | WP-1 | gates keyed to the cutover list | 30 to 45 min |
| WP-2 Renderer and emitter | `includes/media/class-sgs-media-{renderer,emitter,validator,settings}.php`, `assets/css/media-{base,overlay,video}.css`, PHPUnit | WP-1 | C3, C4 | 90 min |
| WP-3 Loading | `includes/media/class-sgs-media-priority.php` | WP-1, PS-5 | C7 | 30 min |
| WP-4 Editor fields | `src/components/media/{fields,emitter}/*`, plus the moved root-level files (`MediaPicker.js`, `FocalPositionField.js`, `MediaElementControls.js`, `ResponsiveOverride.js`, `ResponsiveControl.js`, `MediaSizingPanel.js`, `MediaElementPanel.js` moved or replaced; old `atoms/` stays until the final removal) | WP-1 | C6, 9.2 components; twin parity fixture | 90 min |
| WP-5 Panel host and rules | `src/components/media/{MediaPanelHost.js,rules/*}` | WP-1 (rule format), C0 stubs for WP-4 | C5 evaluator | 30 to 45 min |
| WP-6 Masks | `includes/data/media-shapes.json`, `assets/css/media-mask.css`, `MaskField.js` | WP-1, PS-3 | C9 | 45 min |
| WP-10a Effects UI | `src/components/media/store/inspector-focus.js`, `src/blocks/extensions/motion/*` targets and fields, `generated-fx-*` (Integrator regenerates), `tests/fixtures/motion/render-paths.json` and motion fixture pages | WP-1 | C8, media in `elements`, parallax and pinned fields | 45 min |
| WP-13 Cloner | `scripts/computed-route/*`, `data/skeleton-decisions.json`, Spec 48 | WP-1 schema | section 11 rows, behind the same cutover list | 60 min |
| Wave 1: WP-7 `sgs/media`, decorative-image, gallery | `src/blocks/{media,decorative-image,gallery}/*` plus their mapping rows and `migrate-media-system --block` | WP-2, 3, 4, 5, 6, 15a | reference adopter; first cutover | 60 to 75 min + 15 min mirror proof |
| WP-8 Backgrounds | `includes/class-sgs-background-layer.php`, `BackgroundPanel`, `.sgs-bg-media`, `assets/css/media-bg.css`; the blocks container, trust-bar, site-header, site-footer, multi-button, physics-canvas, nav-drawer | WP-0b, WP-2, 4, 5 | `.sgs-bg-media` | 90 min |
| WP-10b Motion runtime | overscan emission, `fx-parallax.css`, pinned runtime, `view.js` of the motion layer | WP-2, WP-8, PS-4 | working parallax and pinned | 45 min |
| WP-9 Hero (Wave 2) | `src/blocks/hero/*` | WP-8, Eye Care freeze lifted | hero adopted | 60 min |
| Wave 3: card-grid, post-grid, product-card, buybox, brand-strip, responsive-logo | their block folders and mapping rows | Wave 1 | | 60 to 90 min (two agents) |
| Wave 4: team-member, testimonial, before-after, timeline, choice-flow, image-sequence, Lottie, cart, product-search, swatches, info-box | their block folders and mapping rows | Wave 1 | | 60 to 90 min (two agents) |
| WP-14 Migration detector | `scripts/migrate-media-system/*` (survey, fix, check, self-test, negative control), grown per wave | WP-1, then each wave's rows | detector + site-by-site run log | 45 min build + 10 to 15 min per wave and site |
| WP-15b Docs and final removal | Specs 02, 35A, 48, rules, CLAUDE files, the removal commit (the inventory in S5) | all waves | grep-empty proof (AC-5) | 45 min |
| Integrator (main thread) | reseeds, generated files, baselines, deploys, PS verification | per wave | wave deploy log | 6 min reseed + 10 to 20 min deploy and checks per wave |

Wall-clock estimate with 6 to 8 agents: C0 and proofs about 1 hour, WP-1 and WP-15a about 1 hour, the parallel layer about 1.5 hours, Wave 1 about 1.5 hours, Wave 2 about 1.5 hours, Waves 3 and 4 about 1.5 hours in parallel, final removal and docs about 1 hour; roughly 9 hours of elapsed time, against about 18 agent-hours. The critical path is the serial spine C0, proofs, WP-1, WP-15a, WP-2, Wave 1, Wave 2, removal.
