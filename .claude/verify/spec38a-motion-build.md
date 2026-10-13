# Verification Criteria — Spec 38A build (the SGS motion model)

Reference: `.claude/plans/2026-10-12-spec38a-motion-build.md` (spec `.claude/specs/38A-SGS-MOTION-MODEL.md`). Generated 2026-10-12; STATUS is updated by handoff reconciliation. A phase passes when every row passes.

## M0 — Baseline before the support registration (PASSED 2026-10-13)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Baseline committed before the support registration | `git merge-base --is-ancestor $(git log --format=%h -1 --diff-filter=A -- plugins/sgs-blocks/scripts/perf/editor-typing-baseline.json) $(git log --format=%h -1 --diff-filter=A -- plugins/sgs-blocks/includes/motion/support-registration.php)` | exit 0 | PASS (9a9995d97 before 1277cd09e) |

## M1 — Foundations (PENDING, the spec status row open)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Schema check green and self-test catches plants | `python plugins/sgs-blocks/scripts/check-motion-schema.py --check && python plugins/sgs-blocks/scripts/check-motion-schema.py --self-test` | exit 0, every plant reported caught | PASS (2026-10-13) |
| Old easing and ms helpers gone | `git grep -n "sgs_motion_valid_cubic_bezier\|sgs_motion_ms" -- plugins` | no output | PASS (2026-10-13) |
| `sgsMotion` never declared in a block.json | `git grep -n '"sgsMotion"' -- 'plugins/sgs-blocks/src/blocks/*/block.json'` | no output | PASS (2026-10-13) |
| Every motion gate passes | `python plugins/sgs-blocks/scripts/run-motion-gates.py` | exit 0 | PASS (18/18 at session close, 16/16 at Gate 2 in `ac74ff0f7`, 2026-10-13; `gate:motion` runs it in the full tier, 126 s) |
| One easing list definition | `git grep -nE "const (MOTION_EASING_OPTIONS\|EASING_OPTIONS\|FX_EASE_OPTIONS) =" -- plugins/sgs-blocks/src` | one line, in `src/components/motion/easing-master-list.js` (re-exported by `EasingAtom.js`) | PASS (2026-10-13, M1.9 `0448d4365`; one match) |
| Motion field rows (decision 3 option B: `motion_targets`, `motion_fields` and the view `motion_field_rows`; nothing in `block_attributes`) | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT COUNT(*) FROM motion_field_rows"` and `python plugins/sgs-blocks/scripts/check-motion-db-rows.py --check` | non-zero; exit 0 | PASS (2026-10-13, M1.11 `ac74ff0f7`; `check-motion-db-rows.py --check`: OK, 279 schema fields (289 `motion_fields` rows), 418 targets after the M2.1b exclusions, 268,774 `motion_field_rows` view rows, 0 allow-list entries) |
| Presets table in, old table out | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT name FROM sqlite_master WHERE name IN ('motion_presets','animation_tokens')"` | `motion_presets` only | PASS (2026-10-13) |
| Spec status lines | `grep -nE "^- \*\*FR-38A-(1\|3\|14\|15\|55\|56) " .claude/specs/38A-SGS-MOTION-MODEL.md` | each says built | PENDING (14, 15, 55 and 56 say built at M1.11; FR-38A-1 and 3 close with their live editor, server and reader checks in M2.9, M3.3 and M7) |

## M2 — Renderer and runtime (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Renderer and refusal tests | `cd plugins/sgs-blocks && vendor/bin/phpunit --filter "MotionRendererTest\|MotionRefusalsTest"` | pass | PASS (2026-10-13, M2.1 `4217b7f5a`; 28 tests, 93 assertions) |
| Runtime stagger removed, formula frozen | `git grep -n staggerOffset -- plugins; ls plugins/sgs-blocks/tests/fixtures/motion/legacy-stagger-offset.json` | no grep output; file exists | PENDING |
| Scripts write custom properties only | `python plugins/sgs-blocks/scripts/check-motion-style-writes.py --check` | exit 0 (and `--self-test` exit 1) | PENDING |
| Live model probe, three engines | `node plugins/sgs-blocks/scripts/motion-qa/probe-motion-model.mjs` | pass, each negative control red | PENDING |
| No inline styles | `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` | exit 0 | PENDING |

## M3 — Inspector (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Three panels and the shell exist | `ls plugins/sgs-blocks/src/blocks/extensions/motion/{HoverPanel,EntrancePanel,EffectsPanel,MotionPanels}.js` | four files | PENDING |
| Control sets match §5.4 | `python plugins/sgs-blocks/scripts/check-motion-control-sets.py --check` | exit 0 | PENDING |
| Per-device, canvas and a11y probes | `node plugins/sgs-blocks/scripts/motion-qa/probe-motion-per-device.mjs && node plugins/sgs-blocks/scripts/motion-qa/probe-editor-canvas.mjs && node plugins/sgs-blocks/scripts/motion-qa/probe-motion-a11y.mjs` | pass, negative controls red | PENDING |
| Editor typing within 10% (A/B on one HEAD with `sgs_motion_support_enabled` off and on; the M3.0 baseline is the secondary reference) | `node plugins/sgs-blocks/scripts/perf/measure-editor-typing.mjs --ab` | exit 0 | PENDING |
| Hover rotate and translate (FR-38A-42) | `node plugins/sgs-blocks/scripts/motion-qa/probe-motion-per-device.mjs --fixture tilted-cards` | each card at its own rest angle, straightening on hover; polaroid frame matches | PENDING |
| Bean's inspector sign-off (Gate 5) | Bean sets a hover lift, a part entrance and a grid stagger on a canary card | done without help | PENDING |

## M4 — Stagger and nav motion (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| JS and PHP stagger parity | `php plugins/sgs-blocks/tests/php/run-motion-stagger-parity-standalone.php` | identical to the JS test cases | PENDING |
| Stagger drift gate | `python plugins/sgs-blocks/scripts/check-motion-stagger-drift.py --check` | exit 0 (and `--self-test` exit 1) | PENDING |
| Indus drawer and mega delays live | probe on indus-test (M4.5, M4.6) | measured equals stored: 55ms step drawer, 26ms step mega, both capped at 320ms | PENDING |

## M5 — Effects fold-in (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Every exposed parameter is read by its runtime | `python plugins/sgs-blocks/scripts/check-fx-list-drift.py --check` | exit 0 | PENDING |
| Stacked effects compose | `node plugins/sgs-blocks/scripts/motion-qa/probe-motion-stacks.mjs` | pass in three engines | PENDING |
| Nine new effects in the picker | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT COUNT(*) FROM fx_effects WHERE in_picker=1 AND effect IN ('parallax','tilt','ripple','sheen','scroll-progress','ambient-float','marquee','ken-burns','svg-loop')"` | 9 | PENDING |
| No motion literals | `python plugins/sgs-blocks/scripts/check-motion-literals.py --check` | exit 0 (and `--self-test` exit 1) | PENDING |
| Motion QA on the canary | `cd plugins/sgs-blocks && npm run qa:motion` | green | PENDING |

## M6 — Migration and removal (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| No old attribute in code or protected content | `python plugins/sgs-blocks/scripts/migrate-motion/migrate_motion.py --check` (code, then `--site` for each target) | exit 0 | PENDING |
| Nav index ladders gone | `git grep -nE "sibling-index\(\|sibling-count\(\|--sgs-(i\|gi\|gri\|ri\|nd-last-i\|ndm-si):" -- plugins/sgs-blocks/src/blocks/nav-bar-menu plugins/sgs-blocks/src/blocks/nav-drawer plugins/sgs-blocks/src/blocks/nav-drawer-menu` | no output | PENDING |
| Old runtimes deleted | `ls plugins/sgs-blocks/src/blocks/extensions/fx.js plugins/sgs-blocks/src/blocks/extensions/animation.js plugins/sgs-blocks/assets/js/tilt-3d.js` | all three missing | PENDING |
| No client names in code | `python scripts/check-no-client-names.py --check` | exit 0 | PENDING |
| Bean's final sign-off (Gate 9) | cropped before-and-after pairs at 1440, 768 and 375 | match | PENDING |
