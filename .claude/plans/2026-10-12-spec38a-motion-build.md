---
title: Spec 38A build plan (the SGS motion model)
project: small-giants-wp
created: 2026-10-12
status: draft
authors: Bean + Claude
governs: .claude/specs/38A-SGS-MOTION-MODEL.md v1.5 (phases M1 to M6; M7 cloning rides plan Phases 2 and 4 of .claude/plans/2026-10-12-clone-coverage-foundation.md)
---

# Spec 38A build plan: the SGS motion model

**Goal:** every FR-38A done-when (FR-38A-1 to 32 and 34 to 56; FR-38A-33 is M7) passes with its MUST FAIL control, on the canary and the three client test sites, with the old motion code deleted and no legacy fallback.

**Why it matters:** motion is the largest part of the clone coverage gap. Today a draft's hover lift, reveal stagger or cursor effect has no exact place to land: values hide inside fixed presets, only the whole block can move, and six reveal systems and seven hover systems disagree on data shape. After this build every element stores its own motion values and delays, every variable has an inspector control, and the cloning tool (M7) can write what it measures. It also unblocks the coverage plan's Phase 4 recognisers and Indus build steps 21 onwards.

**Scope (settled in Phase 1):** in: all of Spec 38A §16 M1 to M6, the spec-consumer updates (Specs 36, 37, 02, R11). Out: colour and shadow hover values (already compliant), Spec 38's tier doctrine, the coverage plan's recognisers, M7 cloning writes (FR-38A-33), GSAP licensing (settled).

**Total estimate:** see Effort summary. **Critical path:** M1.1 → M1.2 → M1.3 → M1.4 → M1.7 → M1.11 → M2.1 → M2.8 → M2.9 → M3.W → M4.4 → M4.5 → M4.6 → M5.17 → M5.W → M6.5 → M6.6 → M5.18 → M6.7.

**Unit detail lives in the two committed maps** (files, adapt-or-rebuild evidence per replaced file, surfaces covered, the four-layer test for critical-path units): `.claude/reports/2026-10-12-spec38a-unit-map-m1-m2.md` and `.claude/reports/2026-10-12-spec38a-unit-map-m3-m6.md`. This plan is the merged order, the reconciliations that override the maps, the model per unit, the gates, the risks, the estimates and the session split. Where this plan and a map disagree, this plan wins.

## Reconciliations that override the maps

- **R1 Panels:** the Hover, Entrance and reveal, and Effects inspector panels are built once, in M3 (M3.3 to M3.6). M1 builds the control atoms only; M2 builds the runtime only.
- **R2 Stacked effects:** M2 proves composition with test-written effect custom properties; the stacked-effect clauses of FR-38A-23, 47 and 49 close in M5.Z (spec v1.5 §16).
- **R3 One stagger function:** the JS delay function is built once, in M1.8b (`plugins/sgs-blocks/src/components/motion/stagger-delays.js`). M4.1 does not create `compute-delays.js`; it builds the PHP mirror (`plugins/sgs-blocks/includes/motion/class-sgs-motion-stagger.php`), the JS/PHP parity test and the generated grid-columns file. M2.4 freezes today's `staggerOffset` formula as `plugins/sgs-blocks/tests/fixtures/motion/legacy-stagger-offset.json` before deleting it, and M6.2's mapper reproduces that fixture.
- **R4 Wiring by convention from M1:** M1.2 adds one folder loader in `plugins/sgs-blocks/sgs-blocks.php` for `includes/motion/` (with `migrate/` and `migrate/mappers/`). M1.4 creates `plugins/sgs-blocks/src/blocks/extensions/motion/index.js`, imported once from `src/blocks/extensions/index.js`. M1.10 creates `plugins/sgs-blocks/scripts/run-motion-gates.py` (runs every `scripts/check-motion-*.py --check` and `--self-test`); M1.11 registers `gate:motion` once in `scripts/gates.json` and `package.json`. Later units only add their own files. M2.8 no longer edits `sgs-blocks.php`. M3.W keeps the rest: webpack entries by glob, the registry's stylesheet and module by naming convention, the editor iframe enqueue, the generator runner.
- **R5 Nav stagger ladders:** `src/shared/effects/stagger.js` is already gone (commit `01e4b5a5f`). The runtime staggers are `:nth-child()` index ladders in three stylesheets (`plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css`, `nav-drawer/style.css`, `nav-drawer-menu/style.css`). M6.6-G5 deletes all three; FR-38A-51(c) checks with `git grep -nE "sibling-index\(|sibling-count\(|--sgs-(g|gr|nd-last-)?i:" -- plugins/sgs-blocks/src/blocks/nav-bar-menu plugins/sgs-blocks/src/blocks/nav-drawer plugins/sgs-blocks/src/blocks/nav-drawer-menu` (red today).
- **R6 Ripple inputs:** `sgsClickEffect`, `sgsClickRippleColour` and `sgsClickRippleDuration` are migration inputs (spec v1.5 §13.1); M5.9's mapper owns them.
- **R7 Easing lists:** M1.9 leaves one vocabulary-tagged master list in the easing atom and re-points `fx.js::FX_EASE_OPTIONS` to an imported derived view; M3.8 keeps only the Dramatic-to-Bold rename and the cubic-bezier GSAP ease function.
- **R8 Baseline first:** M3.0 (editor typing baseline) is committed before M1.4 lands on `main`, because any session's `build-deploy.py` deploys HEAD and would ship the support registration.
- **R9 Migration core early:** M6.1 runs in wave 11 (it needs only M1's folder loader and field-type helper); M5.1, M4.5 and every mapper unit build on its interface.
- **R10 Wave fixes:** units that depended on a same-wave unit move one wave later: M5.10 and M5.12 (need M5.1) to wave 13; M5.13, M5.14 and M5.15 (need M5.12) to wave 14; M4.5 (needs M3.5) to wave 14; M4.6 to 15; M5.17 to 16.
- **R11 Spec consumers:** Specs 36 (FR-38-30 fx-magnet), 37 (`sgsAnimation` entrance) and 02 cite today's motion; M6.7 rewrites those citations to the new model when the build lands.

## Decisions for Bean (each needed by the unit named)

1. **Motion on core blocks** (needed by M6.6-G0, which deletes `src/blocks/extensions/animation.js`). Today that extension also gives `core/group`, `core/columns`, `core/cover` and `core/image` an entrance animation. Core blocks have no `block.json` we can add `supports.sgs.motion` to. Option A: declare the support for those four through a PHP and JS filter, so they get the three panels too. Benefit: drafts that wrap content in core groups keep their motion. Drawback: a second registration path to maintain, and the spec's non-goal list excludes core blocks' own motion. Option B: drop motion from core blocks; the migration moves any stored core-block entrance onto the nearest SGS container or reports it. Benefit: one path, matches the framework rule that SGS blocks replace banned core blocks. Drawback: a stored core-group entrance on a test site needs re-homing. **Recommendation: B**, because the framework already migrates banned core blocks to SGS replacements, so motion should live only on SGS blocks.
2. **Icon motion** (needed by M6.3's scope). The icon block, its motion panels and the social-icons group motion (`plugins/sgs-blocks/includes/helpers-icon-motion.php`, `src/blocks/icon/icon-motion.js`, `src/blocks/icon/motion-panels.js`, `src/blocks/social-icons/group-motion.js`) are not named in the spec. Option A: move icon hover motion onto the Hover panel as one more migration family (one mapper, one removal group). Benefit: one motion model everywhere, the cloner sees it. Drawback: about one extra unit of work. Option B: keep it block-private and only switch its literal times and curves to tokens under the M5.18 literals gate. Benefit: less work. Drawback: a second hover model survives. **Recommendation: A.**
3. **How the framework DB describes motion fields** (needed by M1.7, wave 4). The DB must list every motion setting so the coverage test and the cloner can see it. FR-38A-3 as written puts one `block_attributes` row per field, per target part, per device tier, per block. The risk assessment counted 97 blocks declaring 541 parts: with about 40 base fields that is about 77,000 new rows, and several hundred thousand once every effect parameter is added, against 13,304 rows today; about 145 existing queries read `block_attributes` without filtering by source and would start treating motion rows as ordinary attributes. Option A, as written: rows in `block_attributes` with `source = 'sgs-motion'` and `attr_name = sgsMotion/<target>/<panel>/<field>/<tier>`. Benefit: one table for every consumer, matches the spec. Drawback: a 6 to 30 times larger table, a consumer audit of about 145 queries, and slower reseeds. Option B: two small tables, `motion_targets` (block, target part, CSS element: about 640 rows) and `motion_fields` (panel, field, field type, CSS property, state, per-device flag: a few hundred rows from the schema), joined by a view `motion_field_rows` that the coverage test, calibration and cloner read. Benefit: about 1,000 rows, nothing else in the DB changes meaning, every motion field is still visible per block and part. Drawback: FR-38A-3 and §6.4 change (a v1.6 spec bump) and consumers that want motion read the view instead of `block_attributes`. **Recommendation: B.** Every motion field is the same on every target, so storing the cross product as rows repeats one fact tens of thousands of times; the view gives the same answer without bloating the shared table.
4. **Skill files outside git** (needed by M1.6). `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` and `~/.claude/skills/sgs-wp-engine/ANIMATIONS-INTEGRATION.md` name the `animation_tokens` table M1.6 retires. M1.6 shows Bean the exact diff before editing (rule: never edit under `~/.claude/` without approval). **Recommendation: approve the diff when shown.**
5. **Editor performance baseline** (needed by M3.11, only if the after-measurement fails by more than 10%): accept a new baseline or fix first. Asked only if it happens.

## Dependency graph (by wave; a unit's needs are all in earlier waves)

```
W0  M3.0 baseline   M1.0 token measure   M1.1 schema
W1  M1.2 field types (+folder loader)   M1.5 tokens   M1.10 atom gate + gate runner
W2  M1.3 helper re-point   M1.6 presets + fx columns
W3  M1.4 support registration (after M3.0 committed)   M1.8a value atoms
W4  M1.7 DB rows   M1.8b non-value atoms + stagger fn   M1.9 one easing list
W5  M1.11 wiring + RESEED + M1 close                                   [GATE 2]
W6  M2.1 renderer   M2.2 shared stylesheet   M2.7 paint-slot check
W7  M2.3 reveal   M2.4 WAAPI + stagger freeze   M2.5 scroll driver
W8  M2.6 script-writes gate + tilt
W9  M2.8 asset wiring
W10 M2.9 DEPLOY + live acceptance                                      [GATE 3]
W11 M3.W wiring (DEPLOY)   M3.1 effect data (RESEED)   M6.1 migration core   [GATE 4]
W12 M3.2 M3.3 M3.8 M3.12 | M4.1 M4.4 | M5.1 M5.2 M5.3 | M5.8
W13 M3.4 M3.5 M3.6 | M4.3 M6.2 M6.4 | M5.4 M5.5 M5.6 M5.7 M5.9 M5.10 M5.11 | M5.12 M5.16a M5.16b M5.16c M6.3
W14 M3.7 M3.9 | M4.2 M4.5 (RESEED, DEPLOY) | M5.Z | M5.13 M5.14 M5.15      [GATE 5, GATE 6]
W15 M3.10 M3.11 | M4.6 (RESEED, DEPLOY indus-test)
W16 M5.17
W17 M5.W (RESEED, DEPLOY all four targets)                             [GATE 7]
W18 M6.5 sweep, site by site
W19 M6.6C census, then M6.6 G0..G5 (RESEED and DEPLOY per group)       [GATE 8]
W20 M5.18 literals sweep
W21 M6.7 final acceptance                                              [GATE 9]
```

## Work units

Columns: **Model** is the `/delegate` route (2026-10-12, `~/.agents/skills/delegate/scripts/route.py`): Opus = high-complexity or over-8K-output code generation, routed to the strongest tier, built by an Opus subagent and QC'd by a Sonnet reviewer plus a main-thread diff read; Sonnet = normal code generation, extraction, synthesis, destructive or live-browser work, QC'd in the main thread (cross-tier rule); Haiku = small mechanical edits, QC'd in the main thread. **Edits** names the files the unit owns; the full list with every caller is in the unit map. **Needs** are hard blocks.

### M1 Foundations (waves 0 to 5)

| Unit | What it produces | FRs | Model | Needs | Edits (owned files) | Wave |
|---|---|---|---|---|---|---|
| M3.0 | Editor typing-latency harness and committed baseline | FR-38A-29 (before half) | Sonnet (MCP) | none | `plugins/sgs-blocks/scripts/perf/measure-editor-typing.mjs`, `scripts/perf/fixtures/editor-200-blocks.json`, `scripts/perf/editor-typing-baseline.json`; a new canary page | 0 |
| M1.0 | Token default measurement report | FR-38A-15 (report clause) | Sonnet (extraction) | none | `.claude/reports/2026-10-13-motion-token-defaults.md` | 0 |
| M1.1 | Motion JSON Schema, route validator, schema check | FR-38A-2, 55 (schema clause) | Opus | none | `plugins/sgs-blocks/schemas/motion.schema.json`, `scripts/computed-route/lib/motion-schema.mjs` and its test, `plugins/sgs-blocks/scripts/check-motion-schema.py`, `plugins/sgs-blocks/tests/fixtures/motion/` | 0 |
| M1.2 | Field-type helpers JS and PHP with parity; the `includes/motion/` folder loader | FR-38A-55 | Opus | M1.1 | `src/components/motion/field-types.js`, `includes/motion/class-sgs-motion-field-types.php`, `sgs-blocks.php` (folder loader), parity test and PHP dump fixture | 1 |
| M1.5 | Tokens kept and extended; snapshots; push refusal; consumer check | FR-38A-14, 15; FR-32-21 (snapshot side) | Sonnet | M1.0, M1.1 | `theme/sgs-theme/theme.json`, the four motion-bearing `sites/*/theme-snapshot.json`, `scripts/push-theme-snapshot.py`, `scripts/check-motion-token-consumers.py` | 1 |
| M1.10 | Behaviour-based shared-atom gate; the motion gate runner | FR-38A-56 | Sonnet | M1.2's file paths (known constants) | `scripts/check-motion-atoms.py`, `scripts/tests/fixtures/motion-atoms/`, `scripts/run-motion-gates.py` | 1 |
| M1.3 | Old easing and ms helpers deleted, 15 callers and 8 references re-pointed (migration-method) | FR-38A-55 | Sonnet | M1.2 | `scripts/migrate-motion-helpers.py`, `includes/helpers-motion-easing.php` and the 20 caller and reference files in the map | 2 |
| M1.6 | `motion_presets` table and file, `fx_effects.owned_properties` and `panels`, `animation_tokens` retired, generated editor copies | FR-38A-6 (DB clauses) | Sonnet (destructive DB) | M1.1, M1.5; Bean decision 4 | `scripts/data/motion-presets.json`, a dated migration and manifest entry, `seed_reference_data.py`, `seed-motion-fx-registry.py`, `seed-motion-shape-signatures.py`, `run-motion-fx-generators.js`, `dbschema/schema.sql` | 2 |
| M1.4 | `supports.sgs.motion` registers `sgsMotion` (JS and PHP), never in saved markup; compatible blocks declare it (migration-method) | FR-38A-1 | Sonnet | M1.1, M1.3, M3.0 committed | `src/blocks/extensions/motion/index.js` and `register.js`, `src/blocks/extensions/index.js`, `includes/motion/support-registration.php`, `scripts/generate-extension-attributes.js`, `scripts/check-extension-roster.js`, `scripts/migrate-motion-support.py`, about 74 `block.json` (by codemod) | 3 |
| M1.8a | Value atoms consolidated from today's components | FR-38A-54 (value atoms) | Sonnet | M1.2, M1.3, M1.6 | `src/components/motion/*Atom.js`, `CustomisedTag.js`, `index.js`, `MotionEasingControl.js`, `AnimationControl.js`, `SgsLengthControl.js`, value-atom test | 3 |
| M1.7 | One DB row per motion field per target per compatible block | FR-38A-3 | Sonnet | M1.1, M1.4; Bean decision 3 | `scripts/dbschema/seed_motion_fields.py`, `scripts/sgs-update-v2.py` (one import and call), `scripts/check-motion-db-rows.py` | 4 |
| M1.8b | Target, trigger, intensity, Replay and stagger-helper atoms; the one JS delay function | FR-38A-54, 6 (stamp clause) | Sonnet | M1.4, M1.6, M1.8a | `src/components/motion/TargetPicker.js`, `TriggerPicker.js`, `IntensityPicker.js`, `ReplayButton.js`, `StaggerHelper.js`, `stagger-delays.js`, `index.js`, `EntranceStaggerControls.js`, two tests | 4 |
| M1.9 | One easing master list with checked derived views (migration-method) | FR-38A-54 (easing clause) | Sonnet | M1.8a | `scripts/migrate-easing-option-lists.js`, `fx.js` (import only, net shrink), `hover-effects/constants.js` and the seven block-private option files | 4 |
| M1.11 | Gate wiring, the serial reseed, build, M1 FR close | gate clauses of FR-38A-2, 3, 14, 15, 54, 55, 56 | Haiku (wiring edit); reseed in main thread | all M1 units | `scripts/gates.json`, `package.json`, spec status lines | 5 |

### M2 Renderer and runtime (waves 6 to 10)

| Unit | What it produces | FRs | Model | Needs | Edits | Wave |
|---|---|---|---|---|---|---|
| M2.1 | Renderer: sanitise, target selectors, scoped per-device emission, data attributes, LCP rule, refusal drops, injected layers | FR-38A-16, 2, 18, 49, 23 (render parts) | Opus | M1.11 | `includes/motion/class-sgs-motion-{renderer,targets,emitter,layers}.php`, `includes/motion/scroll-ownership.php`, `includes/animation-attributes.php` (function moved out), two PHP tests | 6 |
| M2.2 | Shared motion stylesheet: `@property` owners, channels, entrance rule, hover gating, reduced motion, slot rules | FR-38A-17, 18, 23, 27, 49 (CSS) | Opus | M1.1, M1.5 | `assets/css/motion*.css`, `tests/js/motion-css-contract.test.js` | 6 |
| M2.7 | Paint-slot check | FR-38A-49 (check) | Sonnet | M1.1, M1.6 | `scripts/check-motion-paint-slots.py` | 6 |
| M2.3 | Reveal module (under 1.5 kB) | FR-38A-19, 27 | Sonnet | M2.2 | `assets/js/motion-reveal.js`, test | 7 |
| M2.4 | WAAPI multi-keyframe entrances; legacy stagger frozen then removed | FR-38A-20 | Sonnet | M2.2 | `assets/js/motion-keyframes.js`, `tests/fixtures/motion/legacy-stagger-offset.json`, `assets/js/animation-observer.js`, `assets/js/animation-entrance-timing.js`, test | 7 |
| M2.5 | Plain-JS scroll driver; parallax scroll-timeline rule removed; parallax writes a custom property | FR-38A-21, 47 (parallax) | Sonnet | M2.2 | `src/shared/effects/scroll-driver.js`, `webpack.config.js`, `assets/css/extensions.css`, `assets/js/parallax.js`, test | 7 |
| M2.6 | Script-writes gate; tilt writes custom properties | FR-38A-47, 50 (tilt part) | Sonnet | M2.2, M2.5 | `scripts/check-motion-style-writes.py`, `assets/js/tilt-3d.js`, `assets/css/extensions.css` | 8 |
| M2.8 | Conditional asset registration and editor iframe registration | loading for FR-38A-16 to 21 | Sonnet | M2.1 to M2.7 | `includes/motion/class-sgs-motion-assets.php` | 9 |
| M2.9 | Fixture pages, deploy, live probes in three engines at three widths; closes M2 and the deferred M1 clauses | closes FR-38A-16 to 21, 27, 47 and parts of 2, 6, 23, 49, 54, FR-32-21 | Sonnet (MCP) with main-thread read of every probe result | M2.8, M1.5 | `tests/fixtures/motion/pages/*.json`, `scripts/motion-qa/probe-motion-model.mjs`, `scripts/motion-qa/run-live-probes.mjs`, `.claude/rules/motion-qa.md` (new fixture IDs) | 10 |

### M3 to M6 (waves 11 to 21)

| Unit | What it produces | FRs | Model | Needs | Edits | Wave |
|---|---|---|---|---|---|---|
| M3.W | Effect scripts and stylesheets by naming convention; editor iframe enqueue; generator runner | enabler (R-31-1) | Sonnet | M2.9 | `webpack.config.js`, `includes/class-sgs-motion-registry.php`, `scripts/run-motion-generators.py`, `package.json` | 11 |
| M3.1 | Every §5.4 row and Appendix A control as schema and presets; nine new effect rows | FR-38A-11, 46, 9 (data) | Sonnet (extraction) | M1.11 | `schemas/motion.schema.json`, `scripts/data/motion-presets.json`, `scripts/seed-motion-fx-registry.py` | 11 |
| M6.1 | Migration detector triad, `wp sgs motion-migrate` with backup and rollback, mapper interface | FR-38A-31, 32 (core) | Opus | M1.2 | `scripts/migrate-motion/`, `includes/motion/migrate/class-sgs-motion-migrate-{command,runner,backup}.php`, test | 11 |
| M3.2 | Control-set and Intensity check | FR-38A-10, 11, 46 (checks) | Sonnet | M3.1 | `scripts/check-motion-control-sets.py`, fixtures | 12 |
| M3.3 | Panel shell, Target row, layer list, stamping, refusals | FR-38A-4, 10 | Opus | M1.8b, M3.W | `src/blocks/extensions/motion/MotionPanels.js`, `layers/*`, `index.js`, two tests | 12 |
| M3.8 | Dramatic renamed Bold; custom curves reach Tier G tweens | FR-38A-46, 12 (Tier G) | Sonnet | M1.9 | `fx-presets.json`, `src/shared/effects/gsap/bezier-ease.js`, `gsap/provider.js`, test | 12 |
| M4.1 | PHP mirror of the stagger function, parity, grid columns by DB role | FR-38A-24 | Sonnet | M1.8b, M3.W | `includes/motion/class-sgs-motion-stagger.php`, `scripts/generate-motion-stagger-columns.py`, generated JSON, parity test | 12 |
| M4.4 | `open` and `state` triggers | FR-38A-51, 53 (enablers) | Opus | M2.1 | `includes/motion/class-sgs-motion-trigger-open-state.php`, `assets/css/motion-triggers.css`, `src/shared/effects/motion-state.js`, test | 12 |
| M5.1 | Effect layers emitted to the `data-sgs-fx` grammar on any part; fx mapper | FR-38A-22 (emission) | Opus | M2.1, M3.1, M3.W, M6.1 | `includes/motion/class-sgs-motion-fx-emitter.php`, `includes/class-sgs-motion-registry.php`, `includes/motion/migrate/mappers/class-sgs-motion-map-fx.php`, test | 12 |
| M5.2 | Cloning-only custom selector | FR-38A-5 | Sonnet | M1.1, M2.1 | `scripts/computed-route/lib/motion-validate.mjs` and test, `includes/motion/class-sgs-motion-custom-target.php`, test | 12 |
| M5.3 | Runtime-reads gate | FR-38A-48 | Sonnet | M3.1 | `scripts/fx_drift/runtime_reads.py`, `scripts/check-fx-list-drift.py` | 12 |
| M5.8 | Scroll progress effect; dead global script deleted | FR-38A-36, 50 | Sonnet | M2.5, M3.W | `src/shared/effects/fx-scroll-progress.js`, `assets/css/fx-scroll-progress.css`, delete `assets/js/scroll-progress.js`, `includes/class-sgs-blocks.php`, probe | 12 |
| M3.12 | Editor-canvas emitter: the JS twin of M2.1's scoped emission inside the editor iframe, so hover preview and Replay play in the canvas; parity with the PHP output on shared fixtures | FR-38A-28 (canvas), FR-38A-54 (Replay clause) | Opus | M2.1, M3.W | `src/blocks/extensions/motion/canvas/emit-scoped-css.js`, `canvas/use-canvas-motion.js`, `tests/js/motion-canvas-emitter-parity.test.js` with a PHP dump fixture | 12 |
| M3.4 | Hover panel | FR-38A-7, 12 | Sonnet | M3.3 | `src/blocks/extensions/motion/HoverPanel.js`, test | 13 |
| M3.5 | Entrance and reveal panel | FR-38A-8 | Sonnet | M3.3 | `src/blocks/extensions/motion/EntrancePanel.js`, test | 13 |
| M3.6 | Effects panel, schema-driven layer controls, stories moved out of `fx.js` | FR-38A-9, 11 | Opus | M3.1, M3.3 | `src/blocks/extensions/motion/EffectsPanel.js`, `EffectLayerControls.js`, `effect-options.js`, `stories/`, `effect-helpers/`, `scripts/generate-motion-effect-meta.py`, test | 13 |
| M4.3 | Server-written loop delays | FR-38A-26 | Sonnet | M4.1 | `includes/motion/class-sgs-motion-loop-delays.php`, `src/blocks/post-grid/render-interior.php`, test, probe | 13 |
| M6.2 | Entrance and stagger mapper | FR-38A-31, 32 | Sonnet | M6.1, M4.1, M2.4 fixture | `includes/motion/migrate/mappers/class-sgs-motion-map-entrance.php`, test | 13 |
| M6.4 | Per-block reveal inputs mapper | FR-38A-31, 32 | Sonnet | M6.1, M4.1 | `includes/motion/migrate/mappers/class-sgs-motion-map-block-reveals.php`, test | 13 |
| M5.4 | Magnet engage modes and per-axis limits | FR-38A-40 | Sonnet | M5.1 | `src/shared/effects/fx-magnet.js`, `magnet.js`, `assets/css/fx-magnet.css`, `src/blocks/nav-bar-menu/style.css`, test, probe | 13 |
| M5.5 | Horizontal-panel parameters and proximity focus | FR-38A-38, 39, 50 | Sonnet | M5.1, M5.3 | `src/shared/effects/gsap/fx-horizontal-panel.js`, `assets/css/fx-horizontal-panel.css`, two probes | 13 |
| M5.6 | Tilt as a hover effect, custom properties only | FR-38A-41, 50 | Sonnet | M5.1 | `src/shared/effects/fx-tilt.js`, `assets/css/fx-tilt.css`, tilt mapper, test, probe | 13 |
| M5.7 | One parallax effect on the scroll driver | FR-38A-43, 50 | Sonnet | M5.1 | `assets/css/fx-parallax.css`, `src/shared/effects/fx-parallax.js`, parallax mapper, probe | 13 |
| M5.9 | Ripple controls | FR-38A-45 | Sonnet | M5.1 | `src/shared/effects/fx-ripple.js`, `assets/css/fx-ripple.css`, ripple mapper, probe | 13 |
| M5.10 | Sheen sweep | FR-38A-35 | Sonnet | M5.1 | `assets/css/fx-sheen.css`, probe | 13 |
| M5.11 | Cursor-field image-reveal | FR-38A-34 | Sonnet | M5.1 | `src/shared/effects/cursor-field.js`, `fx-cursor-field.js`, `assets/css/fx-cursor-field.css`, `includes/fx-cursor-field.php`, probe | 13 |
| M5.12 | Shared loop control and ambient float | FR-38A-37 | Sonnet | M5.1 | `src/shared/effects/fx-loop-control.js`, `assets/css/motion-loop-control.css`, `assets/css/fx-ambient-float.css`, test, probe | 13 |
| M5.16a | Tier G scroll-family parameters | FR-38A-22, 11 | Sonnet | M5.1, M3.8 | `gsap/fx-scrub.js`, `fx-pin-scrub.js`, `fx-image-sequence.js`, `fx-draggable.js` | 13 |
| M5.16b | Tier G text and SVG parameters | FR-38A-22, 11 | Sonnet | M5.1, M3.8 | `gsap/fx-split-reveal.js`, `fx-scramble.js`, `fx-draw.js`, `fx-morph.js`, `fx-motion-path.js`, `fx-flip.js` | 13 |
| M5.16c | Particles parameters | FR-38A-11 | Haiku | M5.1 | `src/shared/effects/fx-particles.js`, `particles.js` | 13 |
| M6.3 | Hover mapper (plus the icon family if Bean picks decision 2A) | FR-38A-31, 32 | Sonnet | M6.1; Bean decision 2 | `includes/motion/migrate/mappers/class-sgs-motion-map-hover.php` (and `-icon.php`), tests | 13 |
| M3.7 | Editor final state, preset thumbnails, iframe asset proof | FR-38A-28 | Sonnet | M3.4, M3.5, M3.6, M3.12 | `assets/css/motion-thumbnails.css`, `thumbnails/PresetThumbnail.js`, `includes/motion/class-sgs-motion-editor-canvas.php`, probe | 14 |
| M3.9 | Per-device, easing and targeting live acceptance | FR-38A-4, 12, 13 | Sonnet (MCP) | M3.4, M3.5 | `scripts/motion-qa/fixtures/motion-per-device.json`, probe | 14 |
| M4.2 | Helper re-run and stagger drift gate | FR-38A-25 | Sonnet | M4.1, M3.5 | `src/blocks/extensions/motion/stagger/use-stagger-rerun.js`, `scripts/check-motion-stagger-drift.py`, fixtures, test | 14 |
| M4.5 | Nav drawer on the Entrance model (reseed, deploy) | FR-38A-51 (drawer) | Sonnet | M4.1, M4.4, M3.5, M6.1 | `src/blocks/nav-drawer/*`, `src/blocks/nav-drawer-menu/{block.json,render.php,edit.js}`, `includes/helpers-nav-drawer-motion.php`, `includes/nav-drawer-menu-section-css.php`, nav-drawer mapper, `tests/php/run-u5-motion-standalone.php` | 14 |
| M5.13 | Ken Burns and SVG loop | FR-38A-52 | Sonnet | M5.12 | `assets/css/fx-ken-burns.css`, `fx-svg-loop.css`, looping-media mapper, probe | 14 |
| M5.14 | Lottie layers, logo draw and Lottie switch | FR-38A-52 | Sonnet | M5.12, M5.16b | `src/shared/effects/fx-lottie.js`, `includes/lottie-render.php`, lottie-logo mapper, test | 14 |
| M5.15 | Shared marquee primitive | FR-38A-44 | Sonnet | M5.12 | `src/shared/effects/fx-marquee.js`, `assets/css/fx-marquee.css`, marquee mapper, test, probe | 14 |
| M5.Z | Stacked-effect composition acceptance | FR-38A-23, 47, 49 (closing) | Sonnet (MCP) | M5.4, M5.6, M5.7, M5.9, M5.10, M5.11 | `scripts/motion-qa/probe-motion-stacks.mjs`, fixture | 14 |
| M3.10 | Motion accessibility acceptance | FR-38A-30 | Sonnet (MCP) | M3.4, M5.12, M5.13, M5.15 | `scripts/motion-qa/probe-motion-a11y.mjs`, fixture | 15 |
| M3.11 | Editor performance after-measurement | FR-38A-29 | Sonnet (MCP) | M3.0, M3.7 | `scripts/perf/editor-typing-after.json` | 15 |
| M4.6 | Submenu and mega panel motion (reseed, deploy indus-test) | FR-38A-51 (bar and mega) | Sonnet | M4.5 | `src/blocks/nav-bar-menu/{block.json,render.php,view.js,style.css}`, `src/blocks/mega-panel/{block.json,render.php,view.js}`, `includes/nav-menu-item-transition-css.php`, nav-bar mapper, `tests/php/MegaPanelGroupTileTest.php` | 15 |
| M5.17 | Cart pop, burger morph, accordion turn on the `state` trigger | FR-38A-53 | Sonnet | M4.4, M4.6 | `src/blocks/cart/*`, `src/blocks/nav-bar-menu/render.php`, `src/blocks/accordion/*`, state mapper | 16 |
| M5.W | Nine new effects into the picker; reseed; deploy all four targets | FR-38A-9 | Haiku (edit); deploys in main thread | M5.4 to M5.17 | `scripts/seed-motion-fx-registry.py` | 17 |
| M6.5 | Sweep every target site, one at a time | FR-38A-31, 32, 51 (live) | Sonnet (destructive) with main-thread read of each dry-run diff | M6.1 to M6.4, every mapper, M5.W | `.claude/reports/<date>-motion-migrate-survey.md` | 18 |
| M6.6C | Consumer census before removal: every path and attribute G0 to G5 delete, grepped across `plugins/`, `scripts/`, `theme/` and `sites/*/build`, each hit assigned to a group | FR-38A-32 (enabler) | Sonnet | M6.5 | `scripts/migrate-motion/migrate_motion.py` (`--consumers` mode), census report in `.claude/reports/` | 19a |
| M6.6 | Old motion code removed, six disjoint groups (G0 merges last) | FR-38A-32, 22, 43, 52, 54, 51 | Sonnet per group | M6.6C | per group, listed in the map plus the census assignments; G5 also deletes the `nav-bar-menu` and `nav-drawer` ladders (R5) | 19b |
| M5.18 | Motion literals gate and token sweep | FR-38A-53 (gate) | Sonnet (detector), Sonnet per partition | M6.6 | `scripts/check-motion-literals.py`, the files its survey lists | 20 |
| M6.7 | Final acceptance, probe promotion, spec-consumer updates (R11) | FR-38A-31, 32 and closing runs of 25, 26, 30, 53 | Sonnet with Bean's eye | M6.6, M5.18, M3.10, M5.Z | `scripts/motion-qa/run-live-probes.mjs`, `package.json`, Specs 36, 37, 02 citations | 21 |

## Risk-driven amendments (binding; each overrides the unit map)

From the Phase 3 Opus risk assessment (2026-10-12). Each amendment names the evidence command the assessor ran; the unit's subagent re-runs it before editing.

### Plan-wide rules

- **Nothing red lands on `main`.** Every session deploys HEAD, so a check that is red by design ships in the same commit as the change that turns it green, or with an allow-list entry that the fixing unit deletes. Before pushing any motion commit, `python plugins/sgs-blocks/scripts/run-gates.py --tier fast` exits 0.
- **Seeder and generator edits are reseed-class.** `npm run build`'s `prebuild` runs `scripts/run-motion-fx-generators.js` (which runs `seed-motion-fx-registry.py`) against the shared framework DB in every session. Any unit that edits a seeder or generator (M1.6, M3.1, M3.6, M5.W) commits and pushes the code change with its regenerated artefacts, tells peer sessions, and only then runs the DB-changing step in the serial queue.
- **One owner per hot file per wave.** In waves 12 to 14 these files have a single owning unit per wave; other units send their changes to that owner: `plugins/sgs-blocks/schemas/motion.schema.json`, `scripts/data/motion-presets.json`, `scripts/seed-motion-fx-registry.py`, `src/blocks/extensions/generated-fx-effect-meta.json`, `scripts/behavioural-analyser/css-property-classifications.json`, `src/blocks/extensions/extension-roster.json`. Schema and preset rows for wave 12 and 13 effects are written in M3.1 (wave 11), so no wave 13 unit needs to edit them; a missing row is a defect sent back to the M3.1 owner session.
- **Codemods skip dirty files.** Every migration-method `--fix` refuses a target with uncommitted changes (`git diff --quiet -- <file>` must exit 0), because peer sessions edit `block.json` files on the shared worktree.
- **Shared runtime modules are import-map externals.** The scroll driver (M2.5), loop control (M5.12), `motion-state.js` (M4.4) and `magnet.js` (M5.4) are registered as script modules (`@sgs/<name>`) and listed as webpack externals, like `@sgs/motion-provider`, so every block bundle shares one instance (each `view.js` otherwise bundles its own copy with its own listeners).
- **Editor and frontend asset guards.** Any enqueue on `enqueue_block_assets` (M2.8, M3.W) is guarded so it runs only in the editor iframe; frontend loading stays conditional on the renderer's flags. A page with no motion loads no motion asset.
- **The migration input is a census, not §13.1.** A read-only DB query found 43 motion-like attributes the spec does not name (`transitionDuration`, `transitionEasing`, `transitionEasingCustom`, `imageZoomHover`, `burgerMorph*`, `itemMotion*`, `rowShrink*`, `submenuCaretTurn*`, `panelSlide*`, `ink*`, `pathDraw*`, `scrimFade*` and others). M6.1's `--survey` enumerates by DB attribute name and `css_property`, not from §13.1, and lists every attribute with a destination or "unmapped"; Gate 7 does not pass while an attribute is unmapped without a Bean ruling.

- **What content the sweep protects (Bean, 2026-10-12).** No site has live content. The sweep migrates in place only two sets: the Eye Care pages, template parts and block posts on eye-care-test that were cloned from the draft, and the canary's motion-QA fixture pages 2103, 2109, 2113, 2603, 2740 and 3037 (never deleted or re-created, `.claude/rules/motion-qa.md`). Any other content on sandybrown, indus-test and mamas-test that carries old motion attributes is deleted, or rebuilt from its `sites/<client>/build/` block tree (which M6.6C's census updates to the new model) when the page is still needed for a probe or an FR check, whichever is less effort. The sweep tool's backup, rollback and product-safe writes therefore matter on eye-care-test; elsewhere the survey's per-site list says delete, rebuild or migrate for each post.

### Per unit

- **M3.0:** path is `plugins/sgs-blocks/scripts/perf/` (the precedent `measure-frame-cost.mjs` lives there). Because the baseline ages, M3.11 also measures A/B on one HEAD using M1.4's off switch; the M3.0 baseline is the secondary reference.
- **M1.0:** measure from the `handoff/` folders only (six Eye Care copies are tracked); prefer `sites/eye-care-ward-end/handoff/animations.json` and live computed values (Playwright) over regex on the markup.
- **M1.1:** the route test documents `npm ci` in `scripts/computed-route/` (its `node_modules` is gitignored) and imports `ajv/dist/2020`. Refusal rules are a pairwise table (layer A × layer B → error text), so the JS and PHP evaluators stay simple; M2.1 adds a parity test of both evaluators over the same fixtures.
- **M1.2:** `includes/helpers-motion-easing.php` itself does `require_once __DIR__ . '/motion/class-sgs-motion-field-types.php'` (eight includes load it directly, `git grep -n helpers-motion-easing -- plugins/sgs-blocks/includes`), so standalone tests and direct requirers get the class. The folder loader also covers `includes/motion/field-types/`. The decoded schema `$defs` is cached per request (static), or generated as a PHP array at build time (precedent: `generated-fx-effects.php`).
- **M1.3:** runs all three standalone PHP tests, `MegaPanelGroupTileTest` and `php -l` on every touched file; output CSS byte-identical before and after.
- **M1.4:** `scripts/generate-extension-attributes.js` excludes `sgsMotion` by name and its `--check` fails if the generated PHP contains `sgsMotion` (its regex scans every `.js` under `src/blocks/extensions/` recursively, so a literal in a later panel file would register the attribute on every block, core included). `sgsMotion` has no default (an object default reaches the editor as `[]`). Adds the filter `sgs_motion_support_enabled` (default true) so M3.11 can measure with and without the support on one HEAD. M3.3 modifies, never creates, `src/blocks/extensions/motion/index.js`.
- **M1.5:** every one of the nine snapshots carries the motion keys (framework values where a client has no draft; `sites/mamas-munches/theme-snapshot.json` today lacks the `entrance` family), following the `push-theme-snapshot.py` `missing_layout_tokens` precedent; the unit records which values go to `mamas-munches` (the canary) and which to `mamas-munches-redesign` (the draft). The retune changes every hover timing on every site, so M2.9's Bean check includes one hover on each test site.
- **M1.6:** two steps. First commit and push the seeder without `_reconcile_animation_tokens`, plus `scripts/generate-fx-effects-php.py` (the real writer of `generated-fx-effect-meta.json`) and `scripts/db-consistency/check_motion_fx_reseed.py`, and tell peers. Then retire the table with `retire_table.py` in the serial reseed slot, after peers confirm they have rebased.
- **M1.7:** depends on Bean decision 3 (DB shape). Before seeding, `seed_motion_fields.py --dry-run` prints the projected row count, and the unit lists every `block_attributes` consumer that does not filter on `source` (`git grep -n "FROM block_attributes" -- plugins scripts | grep -v source`, about 145 lines) with a decision per consumer. `sgs-update-v2.py::_prune_orphans_on_conn` gains the new source.
- **M1.10:** "sanitise" means a call to `sanitize_*`, `absint`, `intval`, a `preg_match` or a clamp on a raw sgsMotion value; arithmetic on a value already returned by the field-type helper is allowed. Exceptions live in an allow-list file with a reason per entry, read at QC.
- **M1.11:** one `gate:motion` entry in `gates.json` (not seven); commits the regenerated `scripts/behavioural-analyser/css-property-classifications.json` with the reseed after reading its diff.
- **M2.1:** emits per-device rules with its own media-query writer reusing the breakpoint constants (`helpers-responsive.php::sgs_responsive_css_rule` takes flat keys); refuses `sgsAnimation` and `sgsMotion` together on one block (a block carries one model at a time); moves `sgs_fx_owns_scroll_transform` in the same namespace in one commit; adds the filter `sgs_motion_entrance_trigger` that M4.4 hooks; adds the JS/PHP refusal-evaluator parity test.
- **M2.3:** updates the parity walker so it sees CSS reveals: `scripts/parity/lib/devtools.mjs::armedEntrances` gains a `[data-sgs-me]:not([data-sgs-in])` detector, with `scripts/computed-route/tests/walker-devtools.test.mjs`.
- **M2.4:** the frozen fixture records inputs and delays for the stored cases; M6.2's mapper encodes the formula `min(index, max) × step` in code (a server mapper cannot read `tests/`, which the deploy tarball excludes) and its standalone test compares against the fixture.
- **M2.5:** the driver is an import-map external (plan-wide rule).
- **M2.8:** see the asset-guard rule; hidden-start styles reach the page head through the collector's head output so no reveal flashes.
- **M2.9:** also deploys once to indus-test, eye-care-test and mamas-test (opt-in targets that have not been deployed for weeks), so non-motion drift caught by `build-deploy.py`'s old-shape audit is fixed now, not at M5.W.
- **M3.W:** renames `assets/css/fx-shape-routes.css` to `assets/css/fx-morph.css` and updates its nine referencing files (`git grep -ln fx-shape-routes -- plugins/sgs-blocks`), so the naming convention resolves morph; its test asserts every `fx_effects` row with a stylesheet resolves to an existing file, and a network check shows a page with no effects loads no `fx-*.css` (they total about 101 KB together).
- **M3.1:** commits the seeder change with every regenerated artefact in one commit (reseed-class rule).
- **M3.2:** anchors the §5.4 parse on the table header and self-tests against a fixture copy of the spec table.
- **M3.3:** panels register themselves into a slot registry, so `MotionPanels.js` never imports a panel that lands in a later wave; the `BlockEdit` filter memoises (FR-38A-29).
- **M3.4, M3.5:** canvas preview and Replay come from M3.12.
- **M3.6:** `scripts/generate-fx-effects-php.py` stays the single writer of the generated meta; moved stories leave a re-export in `fx.js` until G0 deletes it.
- **M3.8:** its test is "no local definition of `FX_EASE_OPTIONS`", not "no occurrence".
- **M4.1:** the PHP mirror takes columns from block attributes; the generated columns JSON under `src/` is editor-only (the deploy excludes `src/`).
- **M4.2:** `check-motion-stagger-drift.py --check` defaults to fixtures; `--site` runs only by hand.
- **M4.5, M4.6:** in the same commit, the old ladders are neutralised for items that carry stored delays, so old and new staggers never stack; both deploy their mapper to the target site before the dry run; Bean is told the test-site drawers run on the new model from this deploy.
- **M5.1:** the registry detects effects from flat attributes or layers until M6.6-G0, which removes the flat branch (`grep -n "attrs'\]\['fx" plugins/sgs-blocks/includes/class-sgs-motion-registry.php`); this keeps `qa:motion` green on pages 2103, 2109, 2113 and 2603.
- **M5.3 and M5.5:** land in one commit (the drift check is a fast-tier gate; red-first would break every session's build).
- **M5.4:** also edits `src/blocks/nav-drawer-menu/style.css` and `includes/nav-trigger-surface-css.php`, which read `--magnet-x/y` (`git grep -ln "\-\-magnet-x" -- plugins/sgs-blocks`).
- **M5.5:** `assets/css/fx-horizontal-panel.css` already exists (modify).
- **M5.13:** first surveys which of the seven host blocks declare a background or media part; missing parts are added through M1.4's codemod and a reseed.
- **M5.15:** keeps a duration mode beside px/s (a stored duration cannot become px/s without the content-dependent track width).
- **M5.16a, M5.16b:** each deploy runs `npm run qa:motion`; a red probe is reverted before anything else lands.
- **M5.17:** the mapper also covers the `burgerMorph*` attributes.
- **M5.18:** auto-fixes only literals that exactly equal a token; every other literal goes to Bean as a menu (nearest token, or a new token) in one batched list.
- **M6.1:** sweeps every block-bearing post type exactly as `plugins/sgs-blocks/scripts/build-deploy.py::step_oldshape_audit` enumerates them (the block CPTs in `class-sgs-block-cpts.php`, the mega menu and product-template CPTs, and `product`), with a self-test fixture of an old attribute in a header-type post; writes products with `$wpdb->update` plus `clean_post_cache` (a failing variable-product preflight drafts a product on re-save) and compares published counts before and after; writes backups outside the web root (pulled over SSH, then deleted) with a random name; loads the mapper interface explicitly before the mapper folder; the dry-run diff flags every value coerced to a default.
- **M6.3:** also maps `transitionDuration` (16 blocks), `transitionEasing` (15), `transitionEasingCustom` and `imageZoomHover` (4); `includes/container-bg-hover-zoom.php` joins G1.
- **M6.5:** follows the content ruling above: eye-care-test is swept with backup; the canary's fixture pages are swept in place; other stale content on sandybrown, indus-test and mamas-test is deleted or rebuilt from build trees (the survey lists each post with its action, read at Gate 7). Before eye-care-test's and the fixture pages' `--apply`, captures the pre-migration state M6.7 compares against (probe readings and cropped pairs at 1440, 768 and 375 of every fixture page).
- **M6.6C and M6.6:** the census (`migrate_motion.py --consumers`) must exit 0 before any group starts; it already knows 22 scripts that name G0's files (among them the wired gates `check-fx-list-drift.py`, `check-fx-registration.py`, `check-raw-spacing-controls.py`, `check-dead-pattern-attrs.py`, `check-dead-controls.js` and the prebuild `generate-fx-qualifying-blocks.py`), five theme patterns that carry `fx*` attributes, twelve `sites/*/build` trees, `scripts/computed-route/lib/triage.mjs` and `scripts/parity/lib/devtools.mjs::armedEntrances`. G0 also deletes `assets/js/animation-observer.js` and moves its `.sgs-js` class to a one-line inline-free setter in the reveal module (four files depend on `.sgs-js`). G1 adds `includes/container-bg-hover-zoom.php`, `assets/css/media-atoms/motion.css` and `src/components/media/atoms/motion.control.js`; G4 adds `src/blocks/post-grid/components/HoverEffectsPanel.js`. G0 and G4 both name `includes/hover-effects/vars.php` and `extension-roster.json`: G4 sends its edits to G0. Each group reseeds and deploys on merge (not once at the end), so the DB never lags the code between groups.

## Gates

Readiness score = four parts of 25: dependencies met, high-impact risks mitigated in the units' scope, estimates calibrated (15 of 25 throughout: calibrated against the Spec 48 Indus build actuals, about a third of the estimate, but the editor-panel, live-browser and removal units are first attempts), first action under 5 minutes with no dependency. Scores are at plan time; each gate re-scores when reached.

| Gate | After | Type | Pass | Fail (stop and reassess) | Readiness |
|---|---|---|---|---|---|
| GATE 0: Baseline and schema | wave 0 | auto | `editor-typing-baseline.json` committed before any commit adding `includes/motion/support-registration.php`; `check-motion-schema.py --check` exits 0 and `--self-test` catches every plant | the baseline spread across five runs is over 10%, or the schema check passes a plant | 90 (25, 25, 15, 25) |
| GATE 1: Bean's decisions | before wave 2 (decisions 3 and 4), before wave 13 (decision 2), before wave 19 (decision 1) | go/no-go | each decision answered and written into the spec (v1.6 if decision 3 is B) and this plan | a decision is still open when its wave is due: the wave waits; nothing is built on an assumed answer | 75 (25, 10, 15, 25): decisions open |
| GATE 2: Foundations | wave 5 | auto | `python plugins/sgs-blocks/scripts/run-gates.py --tier fast` and `--tier full` pass; `run-motion-gates.py` passes; the reseed ran from a clean HEAD; the M1 FRs' status lines updated | any M1 check red, or peers report a build broken by the reseed | 85 (25, 20, 15, 25) |
| GATE 3: First deploy | wave 10 | auto, main thread reads every probe result | `build-deploy.py --target sandybrown` and the three opt-in targets pass; `probe-motion-model.mjs` passes in Chromium, Firefox and WebKit with every negative control red; `npm run qa:motion` green; Bean glances at one hover on each test site (the token retune) | a probe passes with its negative control also passing (vacuous), or `qa:motion` red | 80 (25, 20, 15, 20) |
| GATE 4: Wiring and effect data | wave 11 | auto | `npm run qa:motion` green on 2103, 2109, 2113 (morph) and 2603 after M3.W's deploy; every `fx_effects` stylesheet resolves; the M3.1 reseed counts match | morph or any Tier G probe red | 85 |
| GATE 5: Inspector sign-off | wave 14 (M3.7, M3.9 done) | review (Bean, about 10 minutes) | Bean opens a canary card in the editor and sets a hover lift, a Fade up on one part and a stagger on a grid through the three panels without help; `probe-editor-canvas.mjs` and `probe-motion-per-device.mjs` pass | Bean cannot find or understand a control: the panel is fixed before wave 15 | 80 |
| GATE 6: Composition | wave 14 (M5.Z) | auto | `probe-motion-stacks.mjs` passes in three engines; `check-motion-style-writes.py --check` exits 0 | any stacked contribution missing | 85 |
| GATE 7: Ready to sweep | wave 17 | go/no-go (main thread; Bean only for census rulings) | every mapper's `--self-test` passes; the M6.1 census lists no unmapped attribute without a Bean ruling; M5.W deployed to all four targets; each site's dry-run diff read and its pre-migration captures taken; no post open in the editor | an unmapped attribute, a coerced value in a diff, or a missing capture | 75 (25, 15, 15, 20) |
| GATE 8: Removal | wave 19 | auto | `migrate_motion.py --consumers` and `--check` exit 0 in code and on four sites; `npm run gate:full`; reseed and deploy per group; `qa:motion` green; `audit-inline-styling.js --check` and `check-no-client-names.py --check` exit 0 | any wired gate red after a group: revert that group | 80 |
| GATE 9: Final acceptance | wave 21 | review (Bean's eye, R-31-13) | cropped before-and-after pairs at 1440, 768 and 375 of every migrated fixture match; every FR-38A status line except FR-38A-33 says built; Specs 36, 37 and 02 cite the new model | Bean sees a difference the probes missed: measure the extended set (`~/.claude/rules/measurement-vs-eye.md`) | 80 |

## Risk register

The full per-unit pre-mortem is folded into "Risk-driven amendments" above. The highest-ranked risks, each with the mitigation the plan now carries:

| # | Risk | Units | Likelihood | Impact | Mitigation in the plan |
|---|---|---|---|---|---|
| 1 | The sweep misses the post types that store headers, drawers, mega menus and products, so the post-removal deploy aborts and FR-38A-51 cannot pass | M6.1, M4.5, M4.6, M6.5 | H | H | M6.1 enumerates post types like `build-deploy.py::step_oldshape_audit`, self-tests on a header-type fixture, writes products without a status change |
| 2 | Removal breaks wired gates and builds (22 scripts, theme patterns, site build trees and the cloner name deleted files) | M6.6 | H | H | M6.6C consumer census must exit 0 first; reseed and deploy per group; G0 owns the `.sgs-js` replacement |
| 3 | A red-by-design fast gate lands on `main` and blocks every session | M5.3, gates generally | H | H | "Nothing red lands on main"; M5.3 ships with M5.5 |
| 4 | The naming convention cannot find morph's stylesheet, and an unguarded iframe enqueue loads about 101 KB of effect CSS everywhere | M3.W | H | H | rename to `fx-morph.css`; stylesheet-resolution test; editor-only guard; network check |
| 5 | Retiring `animation_tokens` crashes peer sessions' builds | M1.6 | H | H | two-step retirement after peers rebase |
| 6 | DB row explosion and 145 unfiltered consumers | M1.7, M3.1 | H | H | Bean decision 3 (recommend two small tables and a view); dry-run row count before seeding |
| 7 | The attribute generator mirrors `sgsMotion` onto every block | M1.4, M3.3 to M3.6 | H | H | exclusion by name plus a failing `--check`; no default |
| 8 | Hot shared files and cross-session dependencies in waves 12 to 14 | waves 12 to 14 | H | M | one owner per hot file per wave; schema and preset rows written in M3.1; codemods skip dirty files |

Plan-level: the spec must be committed before any dispatch (done with this plan); Bean's open decisions sit on the critical path (Gate 1); the migration input is a census, not §13.1 (43 unnamed motion-like attributes); no editor-side emitter existed in the maps (added as M3.12). Dependency: M1.7's DB shape is the weakest critical-path link; M5.1 gates eleven M5 units; waves 5, 11 and 19 are the fragile boundaries (each mixes a reseed or deploy with structural change). Integration: generator mirroring, enum coercion in migrated values (the dry-run diff flags coercions), editor iframe versus frontend loading, per-bundle module state (shared modules are import-map externals), old and new filters coexisting until M6 (one model per block, refused by M2.1).

## Effort summary

From the Phase 3 effort agent (Sonnet), calibrated on `~/.claude/rules/time-estimates.md` and the Spec 48 Indus build actuals (steps ran at about a third of their estimates). Headline = optimistic.

| Phase | Units | Subagent effort (optimistic / realistic) | Calendar (waves) |
|---|---|---|---|
| M1 (with M3.0) | 14 | 2 h / 4 h | waves 0 to 5: 2 h / 3.4 h |
| M2 | 9 | 1.3 h / 2.7 h | waves 6 to 10: 1.4 h / 2.5 h |
| M3 | 13 | 2 h / 4 h | shared with waves 11 to 15 |
| M4 | 6 | 1 h / 2 h | shared with waves 12 to 15 |
| M5 | 22 | 2.8 h / 5.6 h | shared with waves 12 to 20 |
| M6 | 8 | 1.6 h / 3 h | shared with waves 11 to 21 |
| **Total** | **72** | **about 10.5 h / 21 h of subagent work** | **about 8 h / 14 h of calendar time**, waves 12 and 13 run as parallel sessions |

Bean's time: decisions 1 to 4 in one sitting of about 10 minutes; the token-default check (Micro); a short look at each visual milestone (Gates 3 and 5, the drawer at M4.5, the effects at M5.Z), about 2 hours in total if batched into four sittings; final acceptance at Gate 9 (one Block, 15 to 45 minutes). Serial-queue waits (other sessions' deploys and reseeds) are not counted. First-attempt estimates (no history, confidence L): the panel units, the live-browser units, M5.1, M5.18 and the removal groups.

## Session plan

About 6 sessions of about 2 hours each (4 at the optimistic figure). Waves 12 and 13 run as parallel sessions; everything else is one stream with parallel subagents inside each wave.

| Session | Waves | Units | Estimate (optimistic) | Ends at |
|---|---|---|---|---|
| S1 | 0 to 3 | M3.0, M1.0, M1.1, M1.2, M1.5, M1.10, M1.3, M1.6, M1.4, M1.8a | 1.5 h | M1.4 landed after the baseline |
| S2 | 4 to 7 | M1.7, M1.8b, M1.9, M1.11 (reseed), M2.1, M2.2, M2.7, M2.3, M2.4, M2.5 | 1.2 h | Gate 2 |
| S3 | 8 to 11 | M2.6, M2.8, M2.9 (deploy), M3.W (deploy), M3.1 (reseed), M6.1 | 1.3 h | Gates 3 and 4 |
| S4 (four parallel sessions) | 12 to 16 | Track I: M3.2, M3.3, M3.8, M3.12, then M3.4, M3.5, M3.6, then M3.7, M3.9, then M3.10, M3.11. Track S: M4.1, M4.4, then M4.3, M6.2, M6.4, then M4.2, M4.5 (waits for Track I's M3.5), then M4.6, then M5.17. Track E: M5.1, M5.2, M5.3, then M5.4, M5.5 (with M5.3's commit), M5.6, M5.7, M5.9, M5.10, M5.11, then M5.Z. Track L: M5.8, then M5.12, M5.16a, M5.16b, M5.16c, M6.3 (wait for Track E's M5.1), then M5.13, M5.14, M5.15 | 1.5 h per track | Gates 5 and 6 |
| S5 | 17 to 18 | M5.W (reseed, four deploys), M6.5 (sweep site by site) | 1 h | Gate 7 then the sweep |
| S6 | 19 to 21 | M6.6C, M6.6 G0 to G5 (up to six parallel sessions, G0 last), M5.18 (partitioned), M6.7 | 1.2 h | Gate 9 |

Cross-track waits in S4: Track L's wave 13 units start when Track E pushes M5.1; Track S's M4.5 starts when Track I pushes M3.5; Track I's M3.10 starts when Track L pushes M5.12, M5.13 and M5.15. Every reseed and deploy in any track goes through the one serial queue (ListAgents and SendMessage before each).

## Standing rules for every unit

- **No client names in code, no hard-coding:** framework facts from the DB (R-31-1), values from tokens and each client's `sites/<client>/theme-snapshot.json`; Indus, Eye Care and Mama's draft values appear only in fixtures under `tests/`, `scripts/motion-qa/fixtures/` or `sites/`. `python scripts/check-no-client-names.py --check` exits 0 at every wave close.
- **No inline styles:** `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 after every build.
- **Migration-method before the fourth same-shape edit:** M1.3, M1.4, M1.9, M6.6-G1, G4, the `sgsParallax` roster edit and M5.18 each build their survey, fix, check and self-test detector first.
- **No legacy fallback (R-31-14), no `deprecated.js`:** old attributes are migrated by the sweep and deleted.
- **Serial queue:** every reseed (from a clean HEAD, never a dirty tree) and every deploy (`python plugins/sgs-blocks/scripts/build-deploy.py`, never by hand) is announced to peer sessions first via ListAgents and SendMessage.
- **Commits:** straight to `main`, explicit pathspecs, `git branch --show-current` in the same command, `git log origin/main..main` before pushing.
- **Every FR closes on its done-when with its MUST FAIL control,** and each unit's status line in the spec is updated as it lands.
- **Markdown:** one line per paragraph or bullet (`python scripts/check-md-wrap.py --write <file>`).

## Per-phase handoff

Each phase can go to `/phase-planner` for step-level detail, or run straight from this plan and the unit maps with subagent-driven waves (recommended: the units are already file-level).

- **M1 (S1, S2 first half):** invoke `/phase-planner` with scope "Spec 38A M1 Foundations". Entry context: this plan (reconciliations, amendments, decisions), `.claude/reports/2026-10-12-spec38a-unit-map-m1-m2.md` units M1.0 to M1.11, `.claude/specs/38A-SGS-MOTION-MODEL.md` §6, §7, §15 FR-38A-1 to 3, 6, 14, 15, 54 to 56, `.claude/rules/migration-scripts.md`. Plan-level label hint: opus.
- **M2 (S2 second half, S3):** scope "Spec 38A M2 Renderer and runtime". Entry: this plan, the M1-M2 map units M2.1 to M2.9, spec §9, §10, §12, FR-38A-16 to 21, 23, 27, 47, 49, `.claude/rules/motion-qa.md`. Label hint: opus.
- **M3 (Track I):** scope "Spec 38A M3 Inspector". Entry: this plan, `.claude/reports/2026-10-12-spec38a-unit-map-m3-m6.md` units M3.*, spec §5, §11, FR-38A-4, 7 to 13, 28 to 30, 46, `.claude/rules/block-editor-controls.md`, Spec 35. Label hint: opus.
- **M4 (Track S):** scope "Spec 38A M4 Stagger and nav motion". Entry: this plan, the M3-M6 map units M4.*, spec §8, FR-38A-24 to 26, 51, `.claude/reports/2026-09-24-u5-motion-design.md`. Label hint: sonnet.
- **M5 (Tracks E and L):** scope "Spec 38A M5 Effects fold-in". Entry: this plan, the M3-M6 map units M5.*, spec §5.3, §5.4, §10, Appendix A, FR-38A-5, 22, 34 to 45, 47 to 50, 52, 53, `.claude/reports/2026-10-12-motion-effects-audit.md`. Label hint: sonnet.
- **M6 (S5, S6):** scope "Spec 38A M6 Migration and removal". Entry: this plan, the M3-M6 map units M6.*, spec §13, FR-38A-31, 32, `.claude/rules/migration-scripts.md`, the migration-method skill. Label hint: opus.

## Pre-emptive decisions (hidden-decisions pass)

HIDDEN_DECISIONS_PLACEHOLDER
