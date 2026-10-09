---
doc_type: generated-catalogue
title: Tooling catalogue - every gate, audit and codemod
---

# Tooling catalogue - every gate, audit and codemod

**GENERATED** by `plugins/sgs-blocks/scripts/generate-tooling-catalogue.py`. Do not hand-edit; edits are overwritten.
Refresh: `python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py` (`--check` exits 1 if stale).

"I could not find a tool for that" has repeatedly meant "I looked in one of the script directories". There is more than one, and the big one holds hundreds of files. Before building any new checker, codemod or audit, grep this file and every directory it lists.

Derived from the build chain (the `prebuild` generators plus the `plugins/sgs-blocks/scripts/gates.json` roster run by `scripts/run-gates.py`, in execution order), the commit-time chain `.githooks/sgs-gates.sh`, and each script's own header.

<!-- TOOLING-CATALOGUE:START -->

### Where the tooling lives — **plural, and that matters**

Searching one directory and concluding a tool does not exist is a live
failure mode here — it is how something gets rebuilt that already existed.
Check every row before building anything new.

| Directory | Runnable files | Holds |
|---|---|---|
| `scripts/` | 235 | repo-wide tooling (naming lint, site utilities) |
| `plugins/sgs-blocks/scripts/` | 1051 | **the bulk** — every gate, audit, codemod, DB and pipeline tool |
| `.claude/scripts/` | 0 | working-area helpers |
| `.claude/hooks/` | 7 | session + commit hooks (handoff preflight, doc gates) |
| `.claude/skills/wp-sgs-deploy/scripts/` | 0 | deploy-skill helpers |

Worktrees under `.claude/worktrees/` mirror this tree — never cite them as a source.

### The prebuild gate chain — what actually blocks a build

Derived from `package.json`'s `prebuild` PLUS `scripts/gates.json`, in execution order. ⛔ **These are TWO tiers, not one chain.** The five generators and the `fast` tier run on every build. The `full` tier — `check-dead-api-calls`, `check-render-undefined-vars`, `check-render-undefined-vars-selftest`, `inspector-scan-run`, `audit-block-file-consistency`, `wiring-fingerprint-tests`, `wiring-fingerprint-mutation-proof` — was measured at 76.1% of the old chain's time and now runs PRE-DEPLOY only, via `build-deploy.py`'s `step_gate_full()`. Every gate that blocked before still blocks; only the timing changed. Run `npm run gate:list` for each gate's tier and measured cost, and `npm run gate:wired` to prove the `full` tier is still reachable. This chain is
what `npm run build` runs first, and what every `/handoff` and deploy relies on.
Each entry's purpose is quoted from the script's own header.

| # | Script | Purpose (from its own header) |
|---|---|---|
| 1 | `build-roster.py` | Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB. |
| 2 | `generate-icons.js` | Generates includes/lucide-icons.php from lucide-static SVG files, plus the SGS icon library (assets/icons/sgs-icons.json) merged into the same PHP map so… |
| 3 | `generate-extension-attributes.js` | Single source of truth for the cross-block `sgs*` editor-extension attributes. |
| 4 | `generate-svg-allowlist.js` | Single source of truth for the SVG sanitiser allowlist, PHP -> JS. |
| 5 | `generate-media-attributes.mjs` | Single source of truth for the media attribute TYPE map, JS -> PHP. |
| 6 | `generate-media-stylesheet.mjs` | Concatenate the media-atom CSS partials into the one enqueued stylesheet. |
| 7 | `run-motion-fx-generators.js` | motion-fx generator chain (seed-motion-fx-registry.py, generate-fx-effects-php.py, generate-fx-qualifying-blocks.py). |
| 8 | `run-consistency-gates.py` | Single orchestrator for the SGS blocks consistency-gate suite. Runs a fixed |
| 9 | `check-fx-list-drift.py` | the three-list (plus field-type triad) fx drift gate. |
| 10 | `check-dead-controls.js` | STRUCTURAL GUARD (HC2, 2026-06-08) — stops the "dead control" class of bug from regressing. A dead control is an editor control a client can change that… |
| 11 | `check-dead-pattern-attrs.py` | Find block attributes in theme patterns/parts that WordPress silently DISCARDS |
| 12 | `check-shared-panel-schema.js` | STRUCTURAL GUARD — closes the gap in the "dead control" family that check-dead-controls.js (control exists, nothing renders it) and… |
| 13 | `check-empty-inspector-containers.js` | STRUCTURAL GUARD — an inspector container rendered with NO children. |
| 14 | `check-wrapper-capability-preconditions.js` | STRUCTURAL GUARD for the shared-wrapper capability declarations in each block's `supports.sgs` — Spec 35A §F.2.1 + §F.2.2 (D637, step 7 of the… |
| 15 | `survey-background-colour-support.py` | Track A completion audit — native colour/gradient background support. |
| 16 | `check-image-controls-support.py` | Standing defence for the `imageControls` "declared-but-unverified capability" |
| 17 | `survey-control-parity.py` | do SGS inspector controls look like NATIVE WordPress? |
| 18 | `check-hardcoded-render-defaults.js` | STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of bug (F3) from regressing. An F3 violation occurs when a block declares an… |
| 19 | `check-control-ux.js` | STRUCTURAL GUARD (Step 7a, 2026-06-11) — prevents the two editor anti-patterns that produce a sub-standard inspector UX: |
| 20 | `survey-experimental-imports.js` | ONE DETECTOR, THREE MODES (D542, Bean-locked): |
| 21 | `check-product-search-guards.js` | STATIC PRE-FLIGHT GUARD for the product-search REST endpoint. |
| 22 | `check_schema_drift.py` | Detect drift between the committed ``schema.sql`` and the live database's DDL. |
| 23 | `check_value_identity.py` | Assert that named, load-bearing DB rows still hold the EXACT value they must. |
| 24 | `capture_seed_data.py` | Capture the Phase-1 Group-5 seed tables from a LIVE database into data files. |
| 25 | `run.py` | F6 DB-as-code consistency suite shared runner. |
| 26 | `lint-responsive-controls.py` | FR-36-24 structural gate (R-31-9 for responsive controls). |
| 27 | `check-tier-storage-shape.py` | Find per-device attribute families that are HALF-MIGRATED between storage shapes. |
| 28 | `check-inert-controls.py` | Find block attributes that are OVERWRITTEN in render.php before being used. |
| 29 | `check-undeclared-attrs.py` | Find block attributes destructured in edit.js that WordPress silently DISCARDS. |
| 30 | `check-undefined-refs.js` | THE GAP THIS CLOSES. On 2026-08-22 three blocks shipped broken editors: sgs/text, sgs/quote and sgs/testimonial referenced `borderColourHover` /… |
| 31 | `run.py` | F5 cheat-detection gate runner. |
| 32 | `run.py` | F5 excluded-literal tripwire gate for the SGS cloning pipeline. |
| 33 | `coverage_check.py` | ledger.coverage_check — F5 pipeline-close coverage-conservation gate (UNACCOUNTED leg). |
| 34 | `declare_input.py` | ledger.declare_input — F2 draft-derived CSS Accounting Ledger (input parser). |
| 35 | `audit-inline-styling.js` | WIRED INTO `prebuild` AS A REAL GATE — `node scripts/audit-inline-styling.js --check` runs on every `npm run build` and sets `process.exitCode = 1` on any… |
| 36 | `check-id-scoped-emits.js` | STRUCTURAL GUARD — ID-scoped CSS selector emissions. |
| 37 | `check-text-gradient-companion.js` | THE TRAP THIS GATE CATCHES. `sgs_text_decls()` (`includes/helpers-colour- variants.php`) returns `color:` DECLARATIONS ONLY. When a text GRADIENT is in… |
| 38 | `check-preset-token-naming.py` | STRUCTURAL GATE — Spec 32 FR-32-9 (Naming Convention) self-verifier. |
| 39 | `check-palette-slug-refs.py` | every referenced colour slug must actually exist. |
| 40 | `check-box-family-guard.py` | STRUCTURAL GUARD — box-object interface contract (2026-07-09 plan §6). |
| 41 | `check-jsonld-flags.py` | guard the ONE json_encode flag combination that is unsafe. |
| 42 | `remove-vacuous-style-engine-guard.py` | Delete the vacuous `function_exists( 'wp_style_engine_get_styles' )` guard. |
| 43 | `check-no-core-blocks.py` | Prebuild gate: NO banned core blocks in theme pattern/part/template FILES. |
| 44 | `check-no-inline.py` | Anti-regression GATE for the framework-wide inline-zero win (Spec 32 FR-32-1 / |
| 45 | `check-stranded-guards.py` | Anti-regression GATE for STRANDED inline-style guards (Spec 32). |
| 46 | `check-shared-css-state-rules.js` | STRUCTURAL GUARD — stops the "state-only shared-CSS size literal" class of bug from regressing. This is the class of defect that shipped LIVE on… |
| 47 | `check-element-manifest-conformance.js` | Spec 35 Task 2 — the CLUSTER-COHERENCE rule, made computable. |
| 48 | `audit-feature-parity.py` | Spec 35 UNIT A — feature-parity audit. |
| 49 | `audit-declared-vs-seeded-roles.py` | Audit: which `sgs/%` attributes LACK A MECHANISM that reaches them — the D497 gate. |
| 50 | `check-universal-fit.js` | WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension |
| 51 | `check-duplicate-controls.js` | STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug: the SAME setting exposed to the client through TWO different editor controls… |
| 52 | `check-simple-surface-cap.js` | FR-37-27 (Spec 37, .claude/specs/37-HEADER-FOOTER-BUILDER.md) — the SIMPLE SURFACE CAP, made computable. The Simple surface (`sgs/site-header` and… |
| 53 | `audit-block-uniformity.py` | SGS Block Uniformity Audit |
| 54 | `check-editor-render-parity.js` | NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate in this repo catches: "a control is set up correctly on ONE side (editor OR… |
| 55 | `check-wiring-fingerprint.py` | : every attribute that paints must be wired end to |
| 56 | `check-ksort-before-hash.py` | STOP-NO-KSORT gate — never reorder $attributes before it is hashed into a uid. |
| 57 | `check-tier-object-cast.py` | Tier-object-cast gate — never coerce a whole object-typed attribute to a string. |
| 58 | `check-single-instance-invariants.py` | Single-instance invariant register — four named prohibitions, one shared mechanism. |
| 59 | `check-withdrawn-figures.py` | a figure withdrawn in one file stays withdrawn everywhere. |
| 60 | `migrate-length-sanitiser.py` | Move every LENGTH-valued call site from the crude sanitiser to the hardened one. |
| 61 | `run-gates.py` | the consolidated gate runner. |
| 62 | `check-doc-citations.py` | a `file:line` citation in a doc must land on what it names. |
| 63 | `migrate-tier-object.py` | collapse a flat per-device attribute trio into ONE tier object. |
| 64 | `lint-patterns-for-personal-data.py` | Lint SGS pattern PHP files for hardcoded personal data. |
| 65 | `font-source-audit.js` | Font source audit — static analysis for external CDN URLs in theme.json fontFace declarations. |
| 66 | `migrate-render-closures.py` | Adopt the shared render helpers in place of per-file inline sanitiser closures. |
| 67 | `migrate-theme-native-spacing.py` | Migrate hand-authored `style.spacing` to the block-OWNED padding/margin attrs. |
| 68 | `migrate-shadow-mounts.js` | WHY. ShadowControl was parameterised by VALUES AND CALLBACKS: six props hand-wired at every mount, where GradientOverlayControl's callers pass one map.… |
| 69 | `fanout-overlay-sibling-attrs.py` | D6 (hover + responsive-tier siblings) and |
| 70 | `check-child-lift.py` | check-child-lift — every child-lift rule in the tree stays at ZERO specificity. |
| 71 | `check-fx-registration.py` | every shipped fx module is registered everywhere it must be. |
| 72 | `check-colour-preview-resolver.js` | check-colour-preview-resolver — the editor canvas must resolve a colour the same way the server does. |
| 73 | `check-border-style-without-width.py` | the "no width = no border" detector. |
| 74 | `check-control-helper-parity.py` | Which shared controls ship the standard helper pair, and which still don't. |
| 75 | `survey-border-control-migration.py` | Classify every block's border UI against the SgsBorderControl target shape. |
| 76 | `migrate-border-shape-b.js` | ⛔ THIS IS NOT A BRANCH OF migrate-border-control.js. That script's header declares a hard Shape-B exclusion, on the stated grounds that "there is no… |
| 77 | `migrate-border-element.py` | Border-element census: HOW each block's PHP glues its border CSS together today. |
| 78 | `check-hover-state-classification.py` | Gate: a `*Hover` attribute that carries a real CSS property MUST be classified |
| 79 | `verify-transform.mjs` | Verify the PRODUCTION transform maths against ground truth from the rig. |
| 80 | `test-sanitise-svg.mjs` | Standing gate for the editor SVG sanitiser (src/utils/sanitise-svg.js). |
| 81 | `test-media-attr-parity.mjs` | Standing gate: the L1 media-naming helpers must agree ACROSS LANGUAGES. |
| 82 | `test-media-injection-parity.mjs` | Standing gate: the JS injection filter and the PHP registration filter must inject the SAME attribute set for the same supports.sgs.mediaElements… |
| 83 | `check-media-breakpoints.js` | Gate: the media-element stylesheet's breakpoints must match the ONE source. |
| 84 | `test-media-atom-parity.mjs` | Standing gate: for every media ATOM, the JS value-setter and the PHP value- setter must emit BYTE-IDENTICAL custom-property declarations for a fixed… |
| 85 | `check-media-atom-purity.js` | Gate: a media atom's LOGIC module must be importable by plain Node. |
| 86 | `check-media-disclosure-coverage.js` | Gate: every media atom's `disclosure()` is exercised against REAL fixtures derived from its own `requires` map in registry.js — not a static scan. |
| 87 | `check-enum-control-shape.py` | the D812 enum control-shape GATE. |
| 88 | `test-hover-state-guard.mjs` | Gate wrapper for the touch-safe hover emitter's PHP self-test. |
| 89 | `check_preset_absence_no_slug_literal.py` | scoped static gate for |
| 90 | `audit-bindable-attrs.py` | C15-5/C15-12 detector: which SGS block attributes are SAFE Block Bindings targets? |
| 91 | `wire-border-contrast.js` | (a WCAG 3:1 border-contrast warning, built and working on the component itself — see `src/components/SgsBorderControl.js`) into every block's `edit.js`… |
| 92 | `check-colour-attr-css-property.py` | D962-adjacent gate: no colour attribute may reach the DB with a NULL/empty |
| 93 | `check-render-tier-object-spacing.py` | GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0 |
| 94 | `logical-props-lint.py` | RTL-readiness lint for the SGS nav blocks |
| 95 | `classify-end-shape.js` | WHY THIS EXISTS (2026-09-06, colour-conformance). Adversarial-council pre-mortem (6/6 personas graded D) found survey.js's AUTOFIXABLE verdict is… |
| 96 | `check-style-blob-sanitisation.py` | Gate: every render.php `<style>` blob echo must pass through wp_strip_all_tags(). |
| 97 | `check-ungated-paint-rules.py` | STRUCTURAL GUARD (WARN-ONLY for this build) — Spec 41 FR-41-35 / gate §11 G20c. |
| 98 | `audit-serverside-render-disabled.js` | Finds every `<ServerSideRender` JSX usage across `src/blocks/*\/edit.js` and flags any that is NOT wrapped in `<Disabled>` (from `@wordpress/components`)… |
| 99 | `test-create-drawer-seed.mjs` | Standing gate for the inline drawer-creation rules |
| 100 | `test-nonmodal-freeze-background.mjs` | The non-modal drawer's selective background freeze — pure-logic gate. |
| 101 | `test-panel-bounds.mjs` | Standing gate for nav panel horizontal bounds |
| 102 | `test-float-defaults.mjs` | Standing gate for the sgs/site-header float attribute defaults |
| 103 | `check-fixture-fidelity.py` | compare the nav-drawer POC content plan to the harvest. |
| 104 | `check-shadow-fallback-php.py` | Every PHP writer of a `box-shadow:` declaration must carry the forced-colours fallback. |
| 105 | `run.js` | Forced-colours shadow fallback for static stylesheets: census, fix and gate in one script. |
| 106 | `test-shadow-layers-js.mjs` | The JS shadow composer against the SAME table the PHP composer is tested against |
| 107 | `test-shadow-model.mjs` | The layered shadow model (src/utils/shadow-model.js): stored text <-> layers, the elevation builder and its recogniser, against the shared composer. |
| 108 | `migrate-shadow-presets.py` | Shadow preset migration (U-1 commit 4f-1 step 6): the four old theme shadows are replaced by |
| 109 | `sync-snapshot-shadow-presets.py` | Every client theme snapshot carries the framework's shadow presets, shadow colour and hover map. |
| 110 | `dedupe-shadow-colour-rows.py` | One writer for a shadow's colour: the ShadowControl. Any other colour row for the same attribute |
| 111 | `check-shadow-sources.py` | the shadow-source detector (D4/D5 follow-on, survey stage). |
| 112 | `fanout-surface-ground-attrs.py` | U-1 commit 4e fan-out of `surfaceBlur` / |
| 113 | `run.js` | Shadow lift on hover for static stylesheets: census, fix and gate in one script, mirroring scripts/shadow-fallback/run.js's shape (design H4, stylesheet… |
| 114 | `fanout-shadow-lift-attr.py` | adds the `shadowLiftOnHover` block-level switch (boolean, |
| 115 | `check-scrim.py` | the viewport-scrim detector (Wave 3C U-2, family M-14). |
| 116 | `check-no-src-requires.py` | Fail when plugin-level PHP loads a file from src/. |
| 117 | `check-exit-guards.py` | Fail when a PHP file's direct-access guard names a constant WordPress never defines. |
| 118 | `check-nested-global-settings.py` | reject nested-path wp_get_global_settings() reads. |
| 119 | `check-text-on-primary.py` | text on a primary-coloured ground must use the palette's |
| 120 | `check-raw-box-control.py` | every 4-side box editor in the inspector is SgsBoxControl. |
| 121 | `check-custom-colour-survives.py` | a custom colour picked in the editor must reach the live page. |
| 122 | `audit-ssr-http-method.js` | Every `<ServerSideRender>` preview under `src/` must come from the SGS drop-in `src/components/ServerSideRender.js`, which always POSTs. Fails when: |
| 123 | `test-media-enum-vocabulary.mjs` | A block that HAND-DECLARES a media-atom attribute with an `enum` must allow every value the atom's registry vocabulary offers. |
| 124 | `check-border-width-without-style.py` | the "a width paints solid" detector. |
| 125 | `check-separators-through-helper.py` | lines between items go through the helper. |
| 126 | `check-no-client-names.py` | : keep client names and reference-site names out of the framework. |
| 127 | `check-extension-roster.js` | Fails when src/blocks/extensions/extension-roster.json drifts from the code it describes. The roster feeds sgs-update-v2.py::_seed_extension_attr_rows, so… |
| 128 | `check-border-preview-twin.js` | check-border-preview-twin — every block that mounts the shared border panel previews that border through the panel's twin. |
| 129 | `check-border-width-defaults.py` | "the stylesheet never chooses a border width". |
| 130 | `check-focus-ring-token.py` | : every keyboard focus ring is drawn from the focus-ring token. |
| 131 | `migrate-box-longhands.py` | CR6: move padding, margin and corner-radius boxes off the shorthands that zero-fill unset sides. |
| 132 | `check-import-shadowing.js` | Fails when an editor file destructures a block attribute whose name is also a module-level binding in the same file: an import, or a top-level function… |
| 133 | `migrate-box-alignment.py` | physical `left\|right` to logical `start\|end` for five settings. |
| 134 | `check-editor-css-imported.js` | Fails when a block ships `src/blocks/<block>/editor.css` but no JavaScript file in that block imports it. The build bundles a stylesheet only if an entry… |
| 135 | `block_source_files.py` | Block source-file resolver shared by the gate scripts. |
| 136 | `block-source-files.js` | Block source-file resolver shared by the gate scripts. |
| 137 | `check-text-colour-defaults.py` | : no SGS text defaults to the brand colour. |
| 138 | `check-partial-use-imports.py` | : a render partial imports every class it names that its parent imports. |
| 139 | `check-dead-api-calls.py` | STRUCTURAL GUARD — catches a call to a PHP/WordPress/WooCommerce function |
| 140 | `check-render-undefined-vars.py` | Undefined-variable gate for block render templates (PHPStan level 1). |
| 141 | `run.js` | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=spec evidence=this is the entry point described in… |
| 142 | `audit-block-file-consistency.py` | WHOLE-BLOCK CROSS-FILE CONSISTENCY CHECKER. |
| 143 | `prove_rules_can_fail.py` | Prove every link and bug-class rule can fail: disable one rule at a time in a |

**143 gating scripts.** Regenerate this whole section with:

```bash
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py
```

### I/O inventory — what each prebuild + commit-gate script reads/writes

Scope: every script actually executed by the **prebuild chain** (143 resolved scripts) and the **commit-gate chain** (`.githooks/sgs-gates.sh`, 1 resolved scripts) — 144 unique scripts after de-duplication (2 run in both chains). This is the set that runs automatically, so it is the set documented with inputs/outputs first; the other ~450 scripts in the full library below are NOT covered here.

Every field below is extracted from the script's own executable code (regex over `open()`/`.read_text()`/`.write_text()`/`fs.readFileSync`/`fs.writeFileSync`/`sqlite3.connect()`/SQL keywords/argparse/`sys.exit()`/`process.exitCode`) — **never from a docstring or comment**, per this generator's own stale-header finding above. A script with no recognised call shape (e.g. I/O built dynamically, or delegated to a helper module) shows **UNVERIFIED** rather than an invented mechanism. `Read-only` is stated explicitly whenever no write call site was found at all.

**`plugins/sgs-blocks/scripts/audit-bindable-attrs.py`** (build)
- Path constants: `ROOT` = pathlib.Path(__file__).resolve().parent.parent
- Reads: `BINDINGS_SUPPORT_PHP`, `block_json_path`, `php_file`, `render_php`, `sibling`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--fix`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/audit-block-file-consistency.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `PLUGIN_DIR` = SCRIPT_DIR.parent; `REPO_ROOT` = PLUGIN_DIR.parent.parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/audit-block-uniformity.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: 2

**`plugins/sgs-blocks/scripts/audit-declared-vs-seeded-roles.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `SRC_BLOCKS` = SCRIPT_DIR.parent / "src" / "blocks"
- Reads: `OVERRIDES_PATH`, `sqlite3:f"file:{SGS_DB}?mode=ro"`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/audit-feature-parity.py`** (build)
- Path constants: `HERE` = Path(__file__).parent
- Reads: `EXCEPTIONS`, `ROSTER`, `sqlite3:str(DB_PATH`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes, block_supports
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/audit-inline-styling.js`** (build)
- Reads: `blockJsonPath`
- Writes: `OUT_JSON`, `OUT_MD`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/cheat-gate/run.py`** (build)
- Reads: `_BASELINE_PATH`, `sqlite3:str(_DB_PATH`
- Writes: `_BASELINE_PATH`
- CLI flags read: `--check`, `--report`, `--run-dir`, `--update-baseline`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-border-preview-twin.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `full`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-border-style-without-width.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `PLUGIN` = REPO / "plugins" / "sgs-blocks"; `BASELINE` = Path(__file__).with_name("border-style-without-width-baseline.json")
- Reads: `BASELINE`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-border-width-defaults.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parents[1]
- Reads: `sqlite3:f"file:{db_path.as_posix(`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes, plugins
- CLI flags read: `--check`, `--root`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-border-width-without-style.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parents[1]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): plugins
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-box-family-guard.py`** (build)
- Reads: `_BASELINE_PATH`
- Writes: `_BASELINE_PATH`
- CLI flags read: `--check`, `--report`, `--update-baseline`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-child-lift.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-colour-attr-css-property.py`** (build)
- Path constants: `ROOT` = pathlib.Path(__file__).resolve().parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-colour-preview-resolver.js`** (build)
- Reads: `TOKENS`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-control-helper-parity.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parent.parent; `BASELINE` = Path(__file__).resolve().parent / "control-helper-parity-baseline.json"
- Reads: `BASELINE`, `php`
- Writes: `BASELINE`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-control-ux.js`** (build)
- Reads: `BASELINE_FILE`, `blockJsonPath`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-custom-colour-survives.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parents[1]
- Reads: `LIVE_PROBE`, `bj`, `sqlite3:f"file:{DB}?mode=ro"`
- Writes: `json.dump->fh`
- DB tables (sgs-framework.db): block_attributes
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-dead-api-calls.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `fixture_php`
- CLI flags read: `--check`, `--json`, `--php-binary`, `--report`, `--self-test`, `--update-baseline`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-dead-controls.js`** (build)
- Reads: `BASELINE_FILE`, `blockJsonPath`, `fixturePath`
- Writes: `fixturePath`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `THEME_DIR` = REPO / 'theme' / 'sgs-theme'
- Reads: `FX_QUALIFYING_BLOCKS_PATH`, `bj`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-doc-citations.py`** (build)
- Reads: `doc`, `src`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-duplicate-controls.js`** (build)
- Reads: `BASELINE_FILE`, `editJsPath`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-editor-css-imported.js`** (build)
- Reads: `full`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-editor-render-parity.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-element-manifest-conformance.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exitCode=0, exitCode=1

**`plugins/sgs-blocks/scripts/check-empty-inspector-containers.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-enum-control-shape.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parent.parent; `BASELINE_PATH` = Path(__file__).resolve().parent / "check-enum-control-shape-baseline.json"
- Reads: `BASELINE_PATH`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-exit-guards.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `ROOTS` = [REPO / 'theme' / 'sgs-theme', REPO / 'plugins' / 'sgs-blocks']
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-extension-roster.js`** (build)
- Reads: `rosterFile`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/check-fx-list-drift.py`** (build)
- Reads: `dest_path`
- Writes: `temp.fx_js`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-fx-registration.py`** (build)
- Reads: `blank.registry_path`, `blank.webpack_path`, `target_path`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: 1

**`plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js`** (build)
- Reads: `BASELINE_FILE`, `blockJsonPath`, `target`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/check-hover-state-classification.py`** (build)
- Reads: `sqlite3:f"file:{SGS_DB}?mode=ro"`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-id-scoped-emits.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-import-shadowing.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-inert-controls.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `INCLUDES_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'includes'; `COMPONENTS_JS` = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'inspector-scan' / 'core' / 'components.js'
- Reads: `SHARED_CONTROLS_JS`, `bj`, `facade_path`, `panel_file`, `render_php_path`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-jsonld-flags.py`** (build)
- Reads: `bad`
- Writes: `bad`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-ksort-before-hash.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `fixture`
- Writes: `tmp_path`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-media-atom-purity.js`** (build)
- Reads: `loader`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-media-breakpoints.js`** (build)
- Reads: `CSS`, `JS_SRC`, `PHP_SRC`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-media-disclosure-coverage.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/check-nested-global-settings.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parents[1]; `REPO` = PLUGIN.parents[1]; `ROOTS` = [PLUGIN / "includes", PLUGIN / "src", REPO / "theme" / "sgs-theme"]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-no-core-blocks.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `MIG` = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'migrate-core-blocks'; `THEME` = REPO / 'theme' / 'sgs-theme'
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-no-src-requires.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parents[1]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-palette-slug-refs.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-partial-use-imports.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parents[1]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-preset-token-naming.py`** (build)
- Reads: `snapshot_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-product-search-guards.js`** (build)
- Reads: `TARGET`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-raw-box-control.py`** (build)
- Path constants: `ROOT` = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-render-tier-object-spacing.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `PLUGIN_DIR` = SCRIPT_DIR.parent
- Reads: `BASELINE_FILE`, `block_json_path`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/check-render-undefined-vars.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `BASELINE`, `CONFIG`, `FIXTURE_FILE`, `part`, `php`, `render`
- Writes: `dest`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-separators-through-helper.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parents[1]; `BASELINE` = Path(__file__).resolve().with_name("check-separators-through-helper-baseline.json")
- Reads: `BASELINE`, `manifest`
- Writes: `BASELINE`
- DB tables (sgs-framework.db): plugins
- CLI flags read: `--check`, `--self-test`, `--survey`, `--write-baseline`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-shadow-fallback-php.py`** (build)
- Path constants: `ROOT` = Path(__file__).resolve().parents[1]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-shadow-sources.py`** (build)
- Path constants: `HERE` = Path(__file__).resolve().parent               # plugins/sgs-blocks/scripts/; `PLUGIN` = HERE.parent                                  # plugins/sgs-blocks/; `ROOT` = PLUGIN.parents[1]                              # small-giants-wp/
- Reads: `BASELINE_JSON`, `abspath`, `black_css`, `block_json`, `fix_a_path`, `missing_fc_css`, `pass_css`, `snap`, `theme_json`
- Writes: `SURVEY_JSON`
- CLI flags read: `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-shared-css-state-rules.js`** (build)
- Reads: `BASELINE_FILE`, `fullPath`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1), exitCode=0, exitCode=1

**`plugins/sgs-blocks/scripts/check-shared-panel-schema.js`** (build)
- Reads: `blockJsonPath`, `editPath`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-simple-surface-cap.js`** (build)
- Reads: `target.file`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-single-instance-invariants.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `MEGA_PANEL_STYLE`, `SITE_HEADER_SCROLL_HELPER`, `VALUE_LADDER_HELPER`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-style-blob-sanitisation.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-text-colour-defaults.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `bj`, `sqlite3:f"file:{db.as_posix(`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-text-gradient-companion.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-text-on-primary.py`** (build)
- Path constants: `ROOT` = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-tier-object-cast.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `block_json_path`, `fixture`, `render_path`
- Writes: `tmp_render`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-tier-storage-shape.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
- Reads: `bj`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-undeclared-attrs.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `COMPONENTS_JS` = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'inspector-scan' / 'core' / 'components.js'
- Reads: `bj`, `block_json`, `edit_file`, `ext_file`, `gallery_edit`, `own_file`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-undefined-refs.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`** (build)
- Reads: `bj`, `style_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--block`, `--check`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-universal-fit.js`** (build)
- Reads: `BASELINE_FILE`, `ROSTER_FILE`, `blockJsonPath`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-wiring-fingerprint.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-withdrawn-figures.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `tmp`
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Env vars read: `SGS_REPO`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-wrapper-capability-preconditions.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/colour-codemod/classify-end-shape.js`** (build)
- Reads: `blockJsonFile`, `childJsonPath`, `renderFile`, `viewFile`
- Writes: `OUT_PATH`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/colour-codemod/migrate-shadow-mounts.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/colour-codemod/wire-border-contrast.js`** (build)
- Reads: `editPath`, `plan.editPath`, `planned.editPath`
- Writes: `tmp`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/consistency/audit-serverside-render-disabled.js`** (build)
- Reads: `blockJsonPath`
- Writes: `OUT_JSON`, `OUT_MD`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/consistency/audit-ssr-http-method.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/consistency/build-roster.py`** (build)
- Path constants: `OUT` = Path(__file__).parent / "roster.json"; `BLOCKS_DIR` = Path(__file__).parent.parent.parent / "src" / "blocks"
- Reads: `css_path`, `out_path`, `sqlite3:str(DB_PATH`
- Writes: `OUT`, `tmp_out`
- DB tables (sgs-framework.db): block_attributes, block_supports, blocks, sqlite_master
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/consistency/run-consistency-gates.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/converter/gates/check_preset_absence_no_slug_literal.py`** (build)
- Reads: `_TARGET`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/db-consistency/run.py`** (build)
- Reads: `sqlite3:str(_DB_PATH`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--report`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/dbschema/capture_seed_data.py`** (build)
- Path constants: `HERE` = Path(__file__).resolve().parent; `DATA` = HERE.parent / "data"; `DEFAULT_DB` = Path(
- Reads: `sqlite3:db`, `sqlite3:f"file:{db}?mode=ro"`, `target`
- Writes: `target`
- CLI flags read: `--check`, `--db`, `--self-test`, `--write`
- Env vars read: `SGS_FRAMEWORK_DB`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/dbschema/check_schema_drift.py`** (build)
- Path constants: `HERE` = Path(__file__).resolve().parent
- Reads: `schema_sql`, `sqlite3:f"file:{live_db}?mode=ro"`, `sqlite3:f"file:{live_path}?mode=ro"`, `sqlite3:str(mutated_both`, `sqlite3:str(mutated_col`, `sqlite3:str(mutated_tbl`, `sqlite3:str(schema_tmp`, `sqlite3:str(target`, `sqlite3:str(tmp`
- Writes: `schema_sql`
- DB tables (sgs-framework.db): sqlite_master
- CLI flags read: `--check`, `--live-db`, `--regenerate`, `--schema`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/dbschema/check_value_identity.py`** (build)
- Reads: `sqlite3:f"file:{db_path}?mode=ro"`, `sqlite3:f"file:{live_db}?mode=ro"`, `sqlite3:str(db_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--live-db`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/dedupe-shadow-colour-rows.py`** (build)
- Path constants: `ROOT` = Path(__file__).resolve().parents[3]
- Reads: `block_json`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/excluded-gate/run.py`** (build)
- Reads: `_BASELINE_PATH`, `sqlite3:str(_DB_PATH`
- Writes: `_BASELINE_PATH`
- CLI flags read: `--check`, `--report`, `--update-baseline`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/fanout-overlay-sibling-attrs.py`** (build)
- Path constants: `BLOCKS_DIR` = Path(__file__).resolve().parent.parent / 'src' / 'blocks'
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/fanout-shadow-lift-attr.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/fanout-surface-ground-attrs.py`** (build)
- Path constants: `REPO_ROOT` = Path(__file__).resolve().parent.parent.parent.parent; `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/generate-extension-attributes.js`** (build)
- Reads: `OUT_FILE`
- Writes: `OUT_FILE`
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/generate-icons.js`** (build)
- Reads: `ALLOWLIST_FILE`, `LIBRARY_FILE`, `OUTPUT_FILE`, `WP_ICONS_PHP`, `tagsSrc`, `target`
- Writes: `OUTPUT_FILE`, `target`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/generate-media-attributes.mjs`** (build)
- Reads: `OUT_FILE`
- Writes: `OUT_FILE`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/generate-media-stylesheet.mjs`** (build)
- Reads: `OUT`, `basePath`
- Writes: `OUT`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/generate-svg-allowlist.js`** (build)
- Reads: `OUT_FILE`
- Writes: `OUT_FILE`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/generative-background/verify-transform.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/inspector-scan/run.js`** (build)
- Reads: `RULES_JSON_PATH`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/ledger/coverage_check.py`** (build)
- Reads: `_BASELINE_PATH`, `artefact`, `fpath`, `sqlite3:str(db_path`
- Writes: `_BASELINE_PATH`
- DB tables (sgs-framework.db): excluded_properties
- CLI flags read: `--check`, `--conformance-dir`, `--db`, `--fixtures-dir`, `--no-conformance`, `--report`, `--update-baseline`, `--with-landed`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/ledger/declare_input.py`** (build)
- Reads: `agg_path`, `content_agg_path`, `content_golden_path`, `fpath`, `golden_path`
- Writes: `agg_path`, `content_agg_path`, `content_out_path`, `out_path`
- CLI flags read: `--check`, `--fixtures-dir`, `--out-dir`, `--reason`, `--regenerate`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/lib/block-source-files.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(2)

**`plugins/sgs-blocks/scripts/lib/block_source_files.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: 2

**`plugins/sgs-blocks/scripts/lint-responsive-controls.py`** (build)
- Path constants: `REPO_ROOT` = Path(__file__).resolve().parents[3]  # .../small-giants-wp
- Reads: `COMPONENTS_INDEX`, `module_file`, `source_file`
- Writes: `fixture_file`
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--check`, `--db-context`, `--quiet`, `--self-test`
- Non-zero exit sites found: 0

**`plugins/sgs-blocks/scripts/migrate-border-element.py`** (build)
- Path constants: `PLUGIN` = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); `CENSUS` = os.path.join(REPO, 'reports', 'migrations', 'border-element-census.json')
- Reads: `block_json`
- Writes: `CENSUS`, `json.dump->fh`
- DB tables (sgs-framework.db): plugins
- CLI flags read: `--check`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/migrate-border-shape-b.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `bjPath`, `editPath`, `phpPath`
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/migrate-box-alignment.py`** (build)
- Path constants: `ROOT` = next(p for p in Path(__file__).resolve().parents if (p / '.git').exists())
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `tmp`
- CLI flags read: `--apply`, `--check`, `--fix`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-box-longhands.py`** (build)
- Path constants: `PLUGIN` = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); `CENSUS` = os.path.join(REPO, 'reports', 'migrations', 'box-longhands-census.json')
- Reads: `BASELINE`
- Writes: `BASELINE`, `CENSUS`, `tmp`
- DB tables (sgs-framework.db): plugins
- CLI flags read: `--apply`, `--check`, `--fix`, `--json`, `--only`, `--self-test`, `--survey`, `--write-baseline`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-render-closures.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--only`, `--self-test`, `--skip`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-shadow-presets.py`** (build)
- Path constants: `ROOT` = Path(__file__).resolve().parents[3]
- Reads: `DARK`, `tj`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-theme-native-spacing.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `THEME` = REPO / "theme" / "sgs-theme"; `BLOCKS` = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"
- Reads: `bj`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-tier-object.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `INCLUDES_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'includes'
- Reads: `_bare_bj`, `_bj`, `bj`, `ej`, `rp`, `sqlite3:f'file:{SGS_DB}?mode=ro'`
- Writes: `bj`, `ej`
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--all-properties`, `--apply`, `--check`, `--check-db-parity`, `--fix`, `--json`, `--property`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/nav-qa/check-fixture-fidelity.py`** (build)
- Path constants: `HERE` = Path(__file__).resolve().parent; `REPO_ROOT` = HERE.parents[3]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--json`, `--labels-dir`, `--plan`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/nav-qa/logical-props-lint.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `SGS_BLOCKS_ROOT` = SCRIPT_DIR.parent.parent  # plugins/sgs-blocks/
- Reads: `BASELINE_PATH`, `css`
- Writes: `BASELINE_PATH`, `css`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/no-inline/check-no-inline.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--deep`, `--live`, `--live-default`, `--no-deep`, `--selftest`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/no-inline/check-stranded-guards.py`** (build)
- Path constants: `BLOCKS_DIR` = Path(__file__).resolve().parent.parent.parent / "src" / "blocks"
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--selftest`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/remove-vacuous-style-engine-guard.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: `header`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--only`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/run-gates.py`** (build)
- Reads: `_BUILD_DEPLOY`, `_GATES_JSON`
- Writes: `_GATES_JSON`, `tmp`, `tmp2`
- CLI flags read: `--assert-wired`, `--list`, `--no-write`, `--only`, `--self-test`, `--tier`, `--time`, `-v`
- Non-zero exit sites found: 0, 1, SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/run-motion-fx-generators.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/scrim/check-scrim.py`** (build)
- Path constants: `HERE` = Path(__file__).resolve().parent           # plugins/sgs-blocks/scripts/scrim/; `PLUGIN` = HERE.parents[1]                          # plugins/sgs-blocks/
- Reads: `inc`, `style`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/shadow-fallback/run.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1), exit(2)

**`plugins/sgs-blocks/scripts/shadow-lift/run.js`** (build)
- Reads: `THEME_JSON`, `candidate`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1), exit(2)

**`plugins/sgs-blocks/scripts/survey-border-control-migration.py`** (build)
- Path constants: `ROOT` = _find_repo_root(os.path.dirname(__file__))
- Reads: `os.path.join(synthetic_dir`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/surveys/check-image-controls-support.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[4]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
- Reads: `bj_path`, `save_path`, `style_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/surveys/survey-background-colour-support.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[4]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
- Reads: `bj_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/surveys/survey-control-parity.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parents[2]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--exclude`, `--fix`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: 1

**`plugins/sgs-blocks/scripts/surveys/survey-experimental-imports.js`** (build)
- Reads: `barrel`
- Writes: `full`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/sync-snapshot-shadow-presets.py`** (build)
- Path constants: `ROOT` = Path(__file__).resolve().parents[3]
- Reads: `FRAMEWORK`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-create-drawer-seed.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/tests/test-float-defaults.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-hover-state-guard.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(2)

**`plugins/sgs-blocks/scripts/tests/test-media-atom-parity.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-media-attr-parity.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-media-enum-vocabulary.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/tests/test-media-injection-parity.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-nonmodal-freeze-background.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/tests/test-panel-bounds.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-sanitise-svg.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-shadow-layers-js.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-shadow-model.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test_converter_conformance.py`** (commit)
- Reads: `_QUARANTINE_PATH`, `golden_path`, `html_path`, `sqlite3:_SGS_DB_PATH`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes, slots
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/wiring-fingerprint/tests/prove_rules_can_fail.py`** (build)
- Path constants: `SRC` = Path(__file__).resolve().parent.parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`scripts/check-focus-ring-token.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parent.parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`scripts/check-no-client-names.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parent.parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--files`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`scripts/font-source-audit.js`** (build)
- Reads: `filePath`
- Writes: `args.report`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`scripts/lint-patterns-for-personal-data.py`** (build)
- Reads: `file_path`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)


### The full library — grep this BEFORE building or hand-doing anything

Every runnable script, with the purpose its own author wrote and HOW IT
RUNS - npm / commit-gate / hook / skill / manifest / script-call /
test-import / dynamic. A dash means NO execution path was found, which is
a QUESTION (superseded, or built and forgotten?) and never a verdict.
Before writing a new checker, codemod, census, probe or audit — or before
doing that work by hand — search this list. Adapting one of these is nearly
always cheaper than a fresh build plus its brainstorm, QC and tests.

⚠ The naming is not consistent — the same idea appears as `census-*`,
`survey-*`, `audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`. Grep
for the SUBJECT (colour, gradient, token, element, inline, parity), never
for the verb you happen to have in mind.

#### `plugins/sgs-blocks/scripts/` — 885 scripts

| Script | Wired | Purpose (its own words) |
|---|---|---|
| `add-control.js` | manifest+script-call | hand-kept copies of the attribute names: block.json, edit.js, render.php. |
| `assert-comment-only-diff.py` | manifest | Assert a diff changed COMMENTS ONLY — no executable code. |
| `audit-bindable-attrs.py` | manifest+npm | C15-5/C15-12 detector: which SGS block attributes are SAFE Block Bindings targets? |
| `audit-block-file-consistency.py` | manifest+script-call | WHOLE-BLOCK CROSS-FILE CONSISTENCY CHECKER. |
| `audit-block-uniformity.py` | manifest+script-call | SGS Block Uniformity Audit |
| `audit-declared-vs-seeded-roles.py` | manifest+script-call | Audit: which `sgs/%` attributes LACK A MECHANISM that reaches them — the D497 gate. |
| `audit-feature-parity.py` | manifest+script-call | Spec 35 UNIT A — feature-parity audit. ⚠ **header disputes this — it IS wired** |
| `audit-inline-styling.js` | manifest+npm+script-call | WIRED INTO `prebuild` AS A REAL GATE — `node scripts/audit-inline-styling.js --check` runs on every `npm run build` and sets `process.exitCode = 1`… ⚠ **header disputes this — it IS wired** |
| `audit-post-content-blocks.py` | manifest+npm+script-call | Audit stored post_content for SGS blocks that can no longer render their content. |
| `audit-scoped-selector-live.js` | manifest+npm+script-call | "scoped selector whose class the element never carries" bug class (the multi-button regression, D303 / P-SCOPED-SELECTOR-MATCH-AUDIT-AND-GATE). |
| `audit-script-cull-candidates.py` | manifest | measured signals for a script-library cull. |
| `audit-script-reachability.py` | manifest+script-call | which scripts in this library actually RUN, and how. |
| `audit-shrink-to-fit.js` | manifest+script-call | WHY LIVE (not static) |
| `audit-typography-attr-declarations.js` | manifest | bug introduced while rolling out the full TypographyControls control set |
| `behavioural-analyser/assign-canonical.py` | manifest+script-call+test-import | Backfills `canonical_slot`, `role`, and `derived_selector` for every row in |
| `behavioural-analyser/backfill-coarse-roles.py` | manifest | Spec 31 Phase 3.5 — Refine Phase 1 coarse roles to role-templates taxonomy. |
| `behavioural-analyser/backfill-from-json-catalogue.py` | manifest | Spec 31 Phase 3 step 3.1 helper — one-shot backfill of role / derived_selector |
| `behavioural-analyser/extract-signatures.py` | manifest+script-call+test-import | SGS Block Behavioural Signature Extractor |
| `behavioural-analyser/helper_maps.py` | manifest+script-call | Derive the seeder's helper contracts from the helper PHP source. |
| `behavioural-analyser/hover_states.py` | manifest+script-call | Which values a helper paints only in the hover state, read from the helper body. |
| `behavioural-analyser/php_include_graph.py` | manifest+script-call+test-import | The PHP text the seeder's supplementary pass scans for one block. |
| `behavioural-analyser/php_preprocess.py` | manifest+script-call | Source rewrites that let the seeder's statement scanner read more PHP shapes. |
| `behavioural-analyser/php_source_index.py` | manifest+script-call+test-import | Index of the PHP functions the css_property seeder can follow. |
| `behavioural-analyser/seeder_shapes.py` | manifest+script-call+test-import | Evidence shapes the css_property seeder adds on top of its statement tracer. |
| `build-deploy.py` | manifest+script-call+settings+skill+test-import | One-shot SGS build + tar + scp + remote extract + cleanup. |
| `build-font-collection.py` | manifest | Generates a WordPress Font Library collection manifest (google-fonts.json) from the |
| `build-tier-fixture-page.py` | manifest+script-call | Build (and publish) ONE canary page carrying every block that has migrated |
| `business_info/__init__.py` | manifest+script-call+test-import | Business-details extraction and push for Spec 33 FR-33-14. |
| `business_info/credentials.py` | manifest+script-call+test-import | REST credential resolution for the Site Info push (mirrors push-theme-snapshot.py). |
| `business_info/extract.py` | manifest+script-call+skill+test-import | Extraction of high-confidence business-details fields from a draft's HTML. |
| `business_info/label_context.py` | manifest+script-call | Where a label is allowed to sit. A label inside a form, dialog, wizard or review summary is |
| `business_info/placeholder_map.py` | manifest+script-call | The placeholder map: which `{{ binding }}` in a draft template resolves to which Site Info key. |
| `business_info/push.py` | manifest+script-call+test-import | The Site Info REST push: POST /wp-json/sgs/v1/site-info (fill-if-empty unless overwrite). |
| `business_info/script_source.py` | manifest+script-call+test-import | Source 1: the draft script's runtime data object (`key: 'value'` pairs in VOCABULARY). |
| `business_info/shapes.py` | manifest+script-call+test-import | Shape validation: a value is kept only if it LOOKS like the field it claims to be. |
| `business_info/vocabulary.py` | manifest+script-call+test-import | Vocabulary and shape tables for the business-details extractor. DATA only, no behaviour. |
| `capture-tier-fixture.py` | manifest+script-call | Measure the tier-fixture page — one scoped measurement per block, three viewports. |
| `census-colour-paint-route.py` | manifest+script-call | Census: how does each block's render.php route its COLOUR PAINT? |
| `cheat-gate/__init__.py` | manifest+script-call+test-import | cheat-gate — F5 anti-cheat detection suite for the SGS cloning pipeline. |
| `cheat-gate/check_bound_emit.py` | manifest+script-call | Check #8: static sourceMode='bound' EMIT in converter source. |
| `cheat-gate/check_converter_source.py` | manifest+script-call | Check #9: static source cheats in the new converter/ tree. |
| `cheat-gate/check_d2_when_d1.py` | manifest+script-call | Check #6: D2-when-D1-exists (run_dir-dependent, best-effort). |
| `cheat-gate/check_hardcoded_dicts.py` | manifest+script-call | Check #2: hardcoded property→attr dict literals (R-31-1). |
| `cheat-gate/check_important_render.py` | manifest+script-call | Check #3: !important over a faithful CSS property. |
| `cheat-gate/check_parallel_bp.py` | manifest+script-call | Check #4: parallel breakpoint vocabulary. |
| `cheat-gate/check_sentinel.py` | manifest+script-call | Check #7: sentinel leakage ('unitless' string). |
| `cheat-gate/check_slug_literals.py` | manifest+script-call | Check #1: per-block slug literals (whole-tree + indirect forms). |
| `cheat-gate/models.py` | manifest+script-call+skill+test-import | shared data types for the F5 cheat-detection gate. |
| `cheat-gate/run.py` | commit-gate+manifest+npm+script-call+settings+skill+test-import | F5 cheat-detection gate runner. |
| `check-block-asset-targets.js` | manifest+npm+script-call | STRUCTURAL GUARD (post-D382 hardening) — stops the "block.json names a source filename that never gets compiled" class of bug from regressing. |
| `check-blockjson-metadata-only.py` | manifest+script-call | visual-diff-gate helper. |
| `check-border-preview-twin.js` | manifest | check-border-preview-twin — every block that mounts the shared border panel previews that border through the panel's twin. |
| `check-border-style-without-width.py` | manifest+script-call | the "no width = no border" detector. |
| `check-border-width-defaults.py` | manifest | "the stylesheet never chooses a border width". |
| `check-border-width-without-style.py` | manifest | the "a width paints solid" detector. |
| `check-box-family-guard.py` | manifest+npm+script-call | STRUCTURAL GUARD — box-object interface contract (2026-07-09 plan §6). |
| `check-child-lift.py` | manifest | check-child-lift — every child-lift rule in the tree stays at ZERO specificity. |
| `check-colour-attr-css-property.py` | manifest+npm | D962-adjacent gate: no colour attribute may reach the DB with a NULL/empty |
| `check-colour-preview-resolver.js` | manifest | check-colour-preview-resolver — the editor canvas must resolve a colour the same way the server does. |
| `check-control-helper-parity.py` | manifest+script-call | Which shared controls ship the standard helper pair, and which still don't. |
| `check-control-ux.js` | manifest+npm+script-call | STRUCTURAL GUARD (Step 7a, 2026-06-11) — prevents the two editor anti-patterns that produce a sub-standard inspector UX: |
| `check-converter-destination-shape.py` | manifest+script-call | GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0 |
| `check-css-layer-orphans.py` | manifest+script-call | DB-first orphan gate for ``block_attributes.css_layer``. |
| `check-custom-colour-survives.py` | manifest+npm+script-call | a custom colour picked in the editor must reach the live page. |
| `check-dead-api-calls.py` | manifest+npm+script-call | STRUCTURAL GUARD — catches a call to a PHP/WordPress/WooCommerce function |
| `check-dead-controls.js` | manifest+npm+script-call | STRUCTURAL GUARD (HC2, 2026-06-08) — stops the "dead control" class of bug from regressing. A dead control is an editor control a client can change… |
| `check-dead-pattern-attrs.py` | manifest+npm+script-call | Find block attributes in theme patterns/parts that WordPress silently DISCARDS |
| `check-destructive-only-controls.js` | manifest | STRUCTURAL GUARD (D787-class, 2026-08-27) — catches a defect class that sits in a gap none of the existing ~70 gates cover: `check-dead-controls.js`… |
| `check-device-toggle.js` | manifest+npm+script-call | (src/blocks/extensions/responsive-device-toggle.js). ⚠ **header disputes this — it IS wired** |
| `check-doc-citations.py` | manifest | a `file:line` citation in a doc must land on what it names. |
| `check-duplicate-controls.js` | manifest+script-call | STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug: the SAME setting exposed to the client through TWO different editor… |
| `check-editor-canvas-css.py` | manifest | visual-diff-gate helper (branch 6). |
| `check-editor-css-imported.js` | manifest | Fails when a block ships `src/blocks/<block>/editor.css` but no JavaScript file in that block imports it. The build bundles a stylesheet only if an… |
| `check-editor-only.py` | manifest+script-call | visual-diff-gate helper (branch 5). |
| `check-editor-render-parity.js` | manifest+npm+script-call | NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate in this repo catches: "a control is set up correctly on ONE side (editor… |
| `check-element-manifest-conformance.js` | manifest+npm+script-call | Spec 35 Task 2 — the CLUSTER-COHERENCE rule, made computable. |
| `check-empty-inspector-containers.js` | manifest+npm+script-call | STRUCTURAL GUARD — an inspector container rendered with NO children. |
| `check-enum-control-shape.py` | manifest | the D812 enum control-shape GATE. |
| `check-exit-guards.py` | manifest | Fail when a PHP file's direct-access guard names a constant WordPress never defines. |
| `check-extension-roster.js` | manifest+script-call | Fails when src/blocks/extensions/extension-roster.json drifts from the code it describes. The roster feeds… |
| `check-fx-list-drift.py` | manifest+npm+script-call | the three-list (plus field-type triad) fx drift gate. |
| `check-fx-registration.py` | manifest | every shipped fx module is registered everywhere it must be. |
| `check-hardcoded-render-defaults.js` | manifest+npm+script-call | STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of bug (F3) from regressing. An F3 violation occurs when a block declares an… |
| `check-hover-state-classification.py` | manifest+npm+script-call | Gate: a `*Hover` attribute that carries a real CSS property MUST be classified |
| `check-id-scoped-emits.js` | manifest+npm+script-call | STRUCTURAL GUARD — ID-scoped CSS selector emissions. |
| `check-import-shadowing.js` | manifest | Fails when an editor file destructures a block attribute whose name is also a module-level binding in the same file: an import, or a top-level… |
| `check-inert-controls.py` | manifest+npm+script-call | Find block attributes that are OVERWRITTEN in render.php before being used. |
| `check-interaction-only-css.py` | manifest+script-call | visual-diff-gate helper. |
| `check-jsonld-flags.py` | manifest+npm | guard the ONE json_encode flag combination that is unsafe. |
| `check-ksort-before-hash.py` | manifest+npm+script-call | STOP-NO-KSORT gate — never reorder $attributes before it is hashed into a uid. |
| `check-markup-neutral.py` | manifest+script-call | visual-diff-gate helper. |
| `check-media-atom-purity.js` | manifest+npm+script-call | Gate: a media atom's LOGIC module must be importable by plain Node. |
| `check-media-breakpoints.js` | manifest+npm | Gate: the media-element stylesheet's breakpoints must match the ONE source. |
| `check-media-disclosure-coverage.js` | manifest | Gate: every media atom's `disclosure()` is exercised against REAL fixtures derived from its own `requires` map in registry.js — not a static scan. |
| `check-motion-bundle-budget.py` | manifest+npm+script-call | Spec 38 (Motion System) Tier G bundle-size budget gate. |
| `check-nested-global-settings.py` | manifest | reject nested-path wp_get_global_settings() reads. |
| `check-no-core-blocks.py` | manifest+script-call | Prebuild gate: NO banned core blocks in theme pattern/part/template FILES. |
| `check-no-src-requires.py` | manifest | Fail when plugin-level PHP loads a file from src/. |
| `check-palette-slug-refs.py` | manifest+npm | every referenced colour slug must actually exist. |
| `check-partial-use-imports.py` | manifest | : a render partial imports every class it names that its parent imports. |
| `check-preset-token-naming.py` | manifest+npm | STRUCTURAL GATE — Spec 32 FR-32-9 (Naming Convention) self-verifier. |
| `check-product-search-guards.js` | manifest+npm+script-call | STATIC PRE-FLIGHT GUARD for the product-search REST endpoint. |
| `check-raw-box-control.py` | manifest+script-call | every 4-side box editor in the inspector is SgsBoxControl. |
| `check-render-tier-object-spacing.py` | manifest+npm+script-call | GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0 |
| `check-render-undefined-vars.py` | manifest+npm+script-call | Undefined-variable gate for block render templates (PHPStan level 1). |
| `check-rest-route-require.py` | manifest+npm | STRUCTURAL GUARD — catches a REST route registered against a callback class |
| `check-separators-through-helper.py` | manifest | lines between items go through the helper. |
| `check-shader-sources.py` | manifest+npm | structural gate for Tier W `*.frag.js` shader sources. |
| `check-shadow-fallback-php.py` | manifest+npm+script-call | Every PHP writer of a `box-shadow:` declaration must carry the forced-colours fallback. |
| `check-shadow-sources.py` | manifest | the shadow-source detector (D4/D5 follow-on, survey stage). |
| `check-shared-css-state-rules.js` | manifest+npm+script-call | STRUCTURAL GUARD — stops the "state-only shared-CSS size literal" class of bug from regressing. This is the class of defect that shipped LIVE on… |
| `check-shared-panel-schema.js` | manifest+npm+script-call | STRUCTURAL GUARD — closes the gap in the "dead control" family that check-dead-controls.js (control exists, nothing renders it) and… |
| `check-simple-surface-cap.js` | manifest+script-call | FR-37-27 (Spec 37, .claude/specs/37-HEADER-FOOTER-BUILDER.md) — the SIMPLE SURFACE CAP, made computable. The Simple surface (`sgs/site-header` and… |
| `check-single-instance-invariants.py` | manifest+npm | Single-instance invariant register — four named prohibitions, one shared mechanism. |
| `check-style-blob-sanitisation.py` | manifest+npm | Gate: every render.php `<style>` blob echo must pass through wp_strip_all_tags(). |
| `check-text-colour-defaults.py` | manifest | : no SGS text defaults to the brand colour. |
| `check-text-gradient-companion.js` | manifest+npm | THE TRAP THIS GATE CATCHES. `sgs_text_decls()` (`includes/helpers-colour- variants.php`) returns `color:` DECLARATIONS ONLY. When a text GRADIENT is… |
| `check-text-on-primary.py` | manifest | text on a primary-coloured ground must use the palette's |
| `check-tier-object-cast.py` | manifest+npm+script-call | Tier-object-cast gate — never coerce a whole object-typed attribute to a string. |
| `check-tier-storage-shape.py` | manifest+script-call | Find per-device attribute families that are HALF-MIGRATED between storage shapes. |
| `check-token-rename-neutral.py` | manifest | Is a block's staged change ONLY a preset-token RENAME whose resolved value is unchanged? |
| `check-undeclared-attrs.py` | manifest+npm+script-call | Find block attributes destructured in edit.js that WordPress silently DISCARDS. |
| `check-undefined-refs.js` | manifest+npm+script-call | THE GAP THIS CLOSES. On 2026-08-22 three blocks shipped broken editors: sgs/text, sgs/quote and sgs/testimonial referenced `borderColourHover` /… |
| `check-undefined-refs.selftest.js` | manifest+script-call | Self-test for check-undefined-refs.js. |
| `check-ungated-paint-rules.py` | manifest+npm+script-call | STRUCTURAL GUARD (WARN-ONLY for this build) — Spec 41 FR-41-35 / gate §11 G20c. |
| `check-universal-fit.js` | manifest+script-call | WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension |
| `check-unresolvable-token-refs.py` | manifest | advisory scan for var(--name) references |
| `check-wiring-fingerprint.py` | manifest+script-call | : every attribute that paints must be wired end to |
| `check-withdrawn-figures.py` | manifest | a figure withdrawn in one file stays withdrawn everywhere. |
| `check-wrapper-capability-preconditions.js` | manifest+npm+script-call | STRUCTURAL GUARD for the shared-wrapper capability declarations in each block's `supports.sgs` — Spec 35A §F.2.1 + §F.2.2 (D637, step 7 of the… |
| `codemods/add-box-families.js` | manifest+test-import | Declares the per-device box settings that were missing from `supports.sgs.boxFamilies`. Each one stores a `{desktop, tablet, mobile}` object whose… |
| `codemods/box-desktop-to-tier.js` | manifest | Moves the editor canvas's box previews (padding, margin, border-radius and other `{desktop,tablet,mobile}` box objects) from the desktop tier only to… |
| `codemods/remove-dead-context-keys.js` | manifest | Removes context keys nothing reads from every block.json: `sgs/formId`, `sgs/tabsOrientation`, `sgs/tabsStyle` (usesContext entries and… |
| `colour-codemod/adopt.js` | manifest+script-call | `<SgsColourPanel rows={[...]}>`) into a call to the shared row helper it is semantically identical to: fillRow / textRow |
| `colour-codemod/classify-end-shape.js` | manifest+npm+script-call | WHY THIS EXISTS (2026-09-06, colour-conformance). Adversarial-council pre-mortem (6/6 personas graded D) found survey.js's AUTOFIXABLE verdict is… |
| `colour-codemod/classify-gradient-path-deferred.js` | manifest+script-call | Splits every `gradient-path-deferred` refusal that fix.js's dry run |
| `colour-codemod/fix.js` | manifest+script-call+skill+test-import | Scope: TIER A ONLY — rows survey.js verdicts as `AUTOFIXABLE:helper-at-existing-selector`, AND (this file's own further narrowing, documented in… |
| `colour-codemod/migrate-fill-custom-property-gradient.js` | manifest+script-call | The narrow, proven codemod the adversarial council asked for instead of a universal auto-fix classifier: ONE shape, hand-verified 5+ times tonight |
| `colour-codemod/migrate-icon-gradient-css.js` | manifest | Migrates the remaining `sgs_svg_stroke_gradient()` direct-call sites onto the shared `sgs_icon_gradient_css()` composer (built 2026-09-05 as… |
| `colour-codemod/migrate-shadow-mounts.js` | manifest+npm | WHY. ShadowControl was parameterised by VALUES AND CALLBACKS: six props hand-wired at every mount, where GradientOverlayControl's callers pass one… |
| `colour-codemod/scan-undeclared-setattributes.js` | manifest+script-call | the cross-tier-review fix (post-Task-1 critical defect: fix.js could emit a `setAttributes({ X: ... })` write for an attribute X that block.json… |
| `colour-codemod/survey.js` | manifest+script-call | WHY THIS EXISTS. rule 31 already answers "which rows are wrong?" (388 findings across 61 blocks). It does NOT answer "which of those can a codemod… |
| `colour-codemod/wire-border-contrast.js` | manifest+npm | (a WCAG 3:1 border-contrast warning, built and working on the component itself — see `src/components/SgsBorderControl.js`) into every block's… |
| `consistency/audit-serverside-render-disabled.js` | manifest+npm | Finds every `<ServerSideRender` JSX usage across `src/blocks/*\/edit.js` and flags any that is NOT wrapped in `<Disabled>` (from… |
| `consistency/audit-ssr-http-method.js` | manifest | Every `<ServerSideRender>` preview under `src/` must come from the SGS drop-in `src/components/ServerSideRender.js`, which always POSTs. Fails when: |
| `consistency/build-roster.py` | manifest+npm+script-call | Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB. |
| `consistency/build-setting-types.py` | manifest | Spec 35 UNIT A+ Phase 1 — dedup every SGS attribute to its unique SEMANTIC SETTING. |
| `consistency/check-box-flat.py` | manifest+script-call | DISCOVERY GATE — flags box-object-capable controls still stored as FLAT |
| `consistency/check-cluster-coverage.py` | manifest+script-call | Spec 35 FR-35-3 — assert that every css:* and anim:* setting row belongs to exactly one cluster. |
| `consistency/check-reclassified-keys.py` | manifest+script-call | Spec 35 — REGENERATION GUARD for Bean-ruled reclassified setting keys. |
| `consistency/report-colour-alpha.py` | manifest+script-call | REPORT-ONLY (never non-zero exit) — surfaces colour controls that lack an |
| `consistency/run-consistency-gates.py` | manifest+npm+script-call | Single orchestrator for the SGS blocks consistency-gate suite. Runs a fixed |
| `content-role-detect/classify_detector1.py` | manifest+script-call | Detector 1 (step 2 of 2) — classify raw escaping-call facts extracted by |
| `content-role-detect/detector1_render_escaping.php` | manifest+script-call | Detector 1 — render.php output-escaping walk (structural, token-based). |
| `content-role-detect/detector2_editjs_controls.py` | manifest+script-call | Detector 2 — edit.js control-binding walk (structural, JSX-tag-aware). |
| `content-role-detect/detector3_i18n_default.py` | manifest+script-call | Detector 3 — i18n-wrapped default walk (structural, statement-scoped). |
| `content-role-detect/detector4_referenced_not_output.py` | manifest+script-call | Detector 4 — "referenced in code, but never escaped to output and never CSS". |
| `content-role-detect/detector5_image_alt_companion.py` | manifest+script-call | Detector 5 -- derive the image<->alt COMPANION relationship from render.php. |
| `content-role-detect/detector6_native_support_and_style_emission.py` | manifest+script-call | Detector 6 -- "WP-core native support" + "value painted inside a <style> element". |
| `content-role-detect/detector7_css_paint_flow.php` | script-call | Detector 7 — CSS PAINT FLOW (forward variable tracking to a paint site). |
| `content-role-detect/detector8_undeclared_enum.php` | — | Detector 8 — UNDECLARED ENUM (a schema gap, not a role gap). |
| `content-role-detect/fingerprint_content_roles.py` | manifest+script-call | Deterministic content-role fingerprint (Track A / Spec 35, Step 2). |
| `converter/__init__.py` | manifest+script-call+test-import | SGS clean modular converter (Spec 31 §12.4 / §12.6 step 2 — vertical slice). |
| `converter/block_serialization.py` | manifest+script-call | WP-core-faithful block-attribute serialisation. |
| `converter/context.py` | manifest+script-call+skill | typed per-element context + declaration for the modular converter. |
| `converter/coverage_report.py` | manifest+script-call | the Bean-visible sign-off grid (design §5). |
| `converter/db/__init__.py` | manifest+script-call+test-import | converter/db — the modular engine's own DB-accessor package. |
| `converter/db/db_lookup.py` | manifest+script-call+skill+test-import | DB-backed canonical lookups for the converter. |
| `converter/dispatch_spine.py` | manifest+script-call | dispatch + conservation spine (design §3 / §4). |
| `converter/dispatch_table.py` | manifest+script-call | the DB-sourced routing function (design §2). |
| `converter/entry.py` | manifest+script-call+skill+test-import | Stage 4 pipeline entry point for the modular converter (`converter/`). |
| `converter/gates/__init__.py` | manifest+script-call+test-import | Anti-cheat gates the scaffold ships (design §4.1). |
| `converter/gates/check_content_attr_collisions.py` | manifest | DB gate: attrs the content resolver cannot tell apart. |
| `converter/gates/check_preset_absence_no_slug_literal.py` | manifest+npm+script-call | scoped static gate for |
| `converter/gates/check_raw_sqlite.py` | commit-gate+manifest+script-call | AST gate: no converter/ file opens sqlite3 directly. |
| `converter/gates/import_ban.py` | commit-gate+manifest+script-call | AST gate: no converter/ file may import the frozen engine. |
| `converter/gates/no_slug_literal.py` | commit-gate+manifest+script-call | AST gate: no block-slug / variant / slot carve-outs in resolver bodies. |
| `converter/models.py` | manifest+script-call+skill+test-import | the Write / GAP result types every resolver returns. |
| `converter/recognition.py` | manifest+script-call | Stage-2 block recognition (modular rebuild, step-3 stage 1). |
| `converter/resolvers/__init__.py` | manifest+script-call+test-import | Resolver registry — resolver_id (from dispatch_table) → resolve callable. |
| `converter/resolvers/array_content.py` | manifest+script-call | Array / repeater content lift (Spec 31 §3.B4 / §13.3 FR-31-2.5). |
| `converter/resolvers/content_band.py` | manifest+script-call | content_band — the CONTENT-layer resolver (Spec 31 §3.A, layer L2). |
| `converter/resolvers/grid.py` | manifest+script-call+skill | grid — the GRID-layer resolver (Spec 31 §3.A, layer L3 / D207 grid engine). |
| `converter/resolvers/load_settle_probe.py` | manifest+script-call | - Tier 4b "page-load-settle" motion probe (D1032). |
| `converter/resolvers/marquee.py` | manifest+script-call | lift a draft's seamless-marquee animation onto the block's own marquee attrs. |
| `converter/resolvers/motion_library_signals.py` | manifest+script-call | Tier 4a DOM-runtime-signal detection for GSAP/Lenis/Three.js -- Phase R8 Step 10. |
| `converter/resolvers/motion_shape.py` | manifest+script-call | Tier 1 CSS declaration-shape classifier — Phase R8 Step 3. |
| `converter/resolvers/motion_stagger.py` | manifest+script-call | Tier 3 stagger/repetition detector — Phase R8 Step 9. |
| `converter/resolvers/motion_trigger.py` | manifest+script-call | Tier 2 trigger-mechanism classifier — Phase R8 Step 5. |
| `converter/resolvers/outer_box.py` | manifest+script-call | outer_box — the OUTER-layer resolver (Spec 31 §3.A, layer L1). |
| `converter/resolvers/preset_absence.py` | manifest+script-call | Build #3 Option B: preset-absence transfer (AUTO-DERIVE). |
| `converter/resolvers/scalar_content.py` | manifest+script-call | modularised ``_lift_scalar_attrs_by_selector`` (convert.py:3781). |
| `converter/resolvers/styling_content.py` | manifest+script-call | modularised ``_lift_styling_attrs_by_selector`` (convert.py:3903). |
| `converter/resolvers/test_find_load_settle_candidates_fixtures.py` | — | Ad-hoc verification harness for `_find_load_settle_candidates()` |
| `converter/resolvers/test_load_settle_probe_fixtures.py` | — | Ad-hoc verification harness for `load_settle_probe.py` (Tier 4b, D1032). |
| `converter/resolvers/test_motion_shape_fixtures.py` | — | Ad-hoc verification harness for `motion_shape.py` (Phase R8 Step 3). |
| `converter/resolvers/test_motion_trigger_fixtures.py` | — | Ad-hoc verification harness for motion_trigger.py (Phase R8 Step 5). |
| `converter/resolvers/typography.py` | manifest+script-call+test-import | typography — the typography resolver (Spec 31 §3.B2 / §3.A, layer-agnostic). |
| `converter/services/__init__.py` | manifest+script-call+test-import | Resolver services — the small typed steps a resolver composes. |
| `converter/services/arrangement.py` | manifest+script-call | Spec 31 §2.3/§2.4/§2.5 arrangement-layer helpers. |
| `converter/services/assembly.py` | manifest+script-call | Stage 3 §1 emit glue: build_block_markup (design §1). |
| `converter/services/attr_resolve.py` | manifest+script-call | attr_resolve — name-free (block, layer, property) → attr resolution (design §3.1). |
| `converter/services/border_side.py` | manifest+script-call | border_side — per-side border-width longhand → merged ``borderWidth`` object. |
| `converter/services/box_side.py` | manifest+script-call | box_side — per-side padding/margin longhand -> merged box-object attr. |
| `converter/services/button_group.py` | manifest | faithful port of the button-grouping pass. |
| `converter/services/content_gap_collector.py` | manifest+script-call | the content-side gap channel (observability only). |
| `converter/services/content_select.py` | manifest+script-call | content_select — bs4 selection + DOM-shape helpers for content extraction (Stage 3). |
| `converter/services/css_parse.py` | manifest+script-call | css_parse — shared CSS-text-to-rule-dict parser (ported off the frozen tree). |
| `converter/services/css_pass.py` | manifest+script-call | Stage 3 §3.A CSS pass: the CSS-declaration resolver dispatch. |
| `converter/services/dc_import_resolver.py` | manifest+script-call | resolve Claude Design `<dc-import>` cross-component |
| `converter/services/draft_oracle.py` | manifest+script-call | independent draft reader for the LANDED gate (Stage 3 §7). |
| `converter/services/extraction.py` | manifest+script-call+skill | Stage 3 content extraction: ScalarLifts / ChildBlocks / ContentGaps. |
| `converter/services/field_extractors.py` | manifest+script-call | Shared per-element role→value dispatch (Spec 31 §3.B.0). |
| `converter/services/fold_helpers.py` | manifest+script-call | ported CSS-fold helper functions for the modular rebuild. |
| `converter/services/gap_writer.py` | manifest+script-call | gap_writer — record a tracked GAP (design §3.1, FR-31-21 step 6). |
| `converter/services/has_inner.py` | manifest+script-call | has_inner — derive delegates_content at convert-time from save.js + render.php. |
| `converter/services/icon_resolver.py` | manifest+script-call | SGS Trust-Bar Icon Identity Resolver |
| `converter/services/l2_qualify.py` | manifest+script-call | the L2 (CONTENT-layer) relational qualifier. ONE function, unwired. |
| `converter/services/layer_detect.py` | manifest+script-call | layer_detect — classify a node's structural layer (design §2 / §2.2). |
| `converter/services/lift_helpers.py` | manifest+script-call | ported helper closure for the scalar-content lift. |
| `converter/services/pseudo_overlay.py` | manifest+script-call | ``::before``/``::after`` pseudo-element CSS lift (Unit B1). |
| `converter/services/recognise_helpers.py` | manifest+script-call | recognise_helpers — small DB-driven helpers for Stage-2 recognition. |
| `converter/services/render_emits.py` | manifest+script-call | render_emits — source-derived per-element nested-content signal (the render_reads gate). |
| `converter/services/repeated_sibling_detector.py` | manifest+script-call | - Q2 Tier 1 structural repeated-sibling detector. |
| `converter/services/root_supports.py` | manifest+script-call | root-CSS-to-WP-native-style lift for the modular engine. |
| `converter/services/sc_var_responsive_bridge.py` | manifest+script-call | - turns a correlated classless-draft measurement |
| `converter/services/section_passes.py` | manifest+script-call | the two universal section passes, ported from the frozen |
| `converter/services/shadow_layers.py` | manifest+script-call | shadow_layers — parse a draft `box-shadow` CSS value into the stored |
| `converter/services/sibling_shape_prefilter.py` | manifest+script-call | - standalone sibling shape-alike pre-filter. |
| `converter/services/state_value_lift.py` | manifest+script-call | state_value_lift — direct (block, css_property, css_state) resolution + |
| `converter/services/styling_helpers.py` | manifest+script-call | ported helper functions for the styling-attr lift. |
| `converter/services/template_binding.py` | manifest+script-call | template_binding -- refuse to lift a style value that is an unresolved template binding. |
| `converter/services/test_tier4a_gate_hardening_fixtures.py` | — | Ad-hoc verification harness for the Tier 4a gate hardening fix |
| `converter/services/test_webgl_reference_puller_fixtures.py` | — | Ad-hoc verification harness for webgl_reference_puller.py (Phase R8 Step 13). |
| `converter/services/text_leaf.py` | manifest+script-call | text-leaf detection + text-capability gate. |
| `converter/services/tier4a_gate_verification.py` | manifest+script-call | Shared Tier 4a gate re-verification helper (QC-council hardening, |
| `converter/services/tier_object.py` | manifest+script-call+test-import | tier_object — shared TIER-OBJECT accumulation mechanics (Spec 35 tier shape). |
| `converter/services/tier_suffix.py` | manifest+script-call | tier_suffix — re-append the device-tier breakpoint suffix to a base attr. |
| `converter/services/token_resolution_check.py` | manifest+script-call | advisory detector for unresolvable name references |
| `converter/services/token_snap.py` | manifest+script-call | token_snap — snap a value to a design token when within tolerance (design §3.1). |
| `converter/services/validate.py` | manifest+script-call+skill | validate — gate a (attr, value) write before it is emitted (design §3.1). |
| `converter/services/value_serialise.py` | manifest+script-call | value_serialise — render a raw draft value into the attr's stored form (design §3.1). |
| `converter/services/variant_detect.py` | manifest | variant_detect — recognise a block's variant from its BEM modifier + the DB. |
| `converter/services/webgl_reference_puller.py` | manifest+script-call | Tier 4d -- operator-confirmed WebGL reference-file pulling. |
| `converter/services/webgl_style_classifier.py` | manifest+script-call | Tier 4c -- WebGL visual-style approximation via screenshot classification. |
| `converter/walk.py` | manifest+script-call | the single walker entry + TOTAL structural-signature registry. |
| `converter/webgl_draw_call_probe.py` | manifest+script-call | - Tier 4a's ONE new execution probe (Step 10). |
| `copy-built-styles.js` | manifest+npm+script-call | Postbuild: copy style-index.css to style.css per block. |
| `coverage-matrix/classifier.py` | manifest+script-call | assigns a CellState to each (block, column) pair. |
| `coverage-matrix/db_queries.py` | manifest+script-call | all DB reads for the coverage-matrix module. |
| `coverage-matrix/generate-coverage-matrix.py` | manifest | Spec 31 §5 + MF-7 auto-generated coverage dashboard. |
| `coverage-matrix/models.py` | manifest+script-call+skill+test-import | shared data types for the coverage-matrix module. |
| `db-consistency/__init__.py` | manifest+script-call+test-import | db-consistency — F6 DB-as-code consistency suite. |
| `db-consistency/check_composition.py` | manifest+script-call | Check #2: block.json hasInnerBlocks override sanity. |
| `db-consistency/check_css_property_reseed.py` | manifest+script-call | Check #8: css_property/css_layer reseed-survival. |
| `db-consistency/check_dead_composition_signal.py` | manifest+script-call | Check #10: dead composition discriminator. |
| `db-consistency/check_fx_qualifying_blocks_stale.py` | manifest+script-call | Spec 38 fx qualifying-blocks map |
| `db-consistency/check_inert_composition_attr.py` | manifest+script-call | Check #11: inert child-attribute discriminator. |
| `db-consistency/check_motion_fx_reseed.py` | manifest+script-call | Spec 38 motion-fx registry reseed-survival guard. |
| `db-consistency/check_orphan_roles.py` | manifest+script-call | Check #6: role referential integrity. |
| `db-consistency/check_overrides_drift.py` | manifest+script-call | Check #4: override-dict drift. |
| `db-consistency/check_role_resolution_guess.py` | manifest+script-call | Check #12: order-dependent role resolution. |
| `db-consistency/check_routing.py` | manifest+script-call | Check #1: routing determinism guard. |
| `db-consistency/check_tier_composition.py` | manifest+script-call | Check #7: tier ↔ composition_role/container_kind. |
| `db-consistency/check_variant_reseed.py` | manifest+script-call | Check #5: variant_slots ↔ block.json determinism. |
| `db-consistency/check_variants.py` | manifest+script-call | Check #3: variant discriminator AMBIGUITY on the lift surface. |
| `db-consistency/models.py` | manifest+script-call+skill+test-import | shared data types for the F6 DB-consistency suite. |
| `db-consistency/resolver_bridge.py` | manifest+script-call | reuse the REAL resolver derivation for F6 checks. |
| `db-consistency/run.py` | commit-gate+manifest+npm+script-call+settings+skill+test-import | F6 DB-as-code consistency suite shared runner. |
| `dbschema/capture_seed_data.py` | manifest+script-call | Capture the Phase-1 Group-5 seed tables from a LIVE database into data files. |
| `dbschema/check_schema_drift.py` | manifest+script-call | Detect drift between the committed ``schema.sql`` and the live database's DDL. |
| `dbschema/check_value_identity.py` | manifest+script-call | Assert that named, load-bearing DB rows still hold the EXACT value they must. |
| `dbschema/migrate.py` | manifest+script-call | Migration runner + tracking table for the SGS knowledge-base DB. |
| `dbschema/rebuild_compare.py` | manifest+script-call | Rebuild the knowledge base from NOTHING and report honestly what returns. |
| `dbschema/refresh_wp_reference.py` | manifest+script-call | Refresh the WordPress reference corpus (`hooks` + `docs`) — and DROP stale rows. |
| `dbschema/retire_table.py` | manifest | Retire a knowledge-base table: back up, archive it reversibly, then DROP it. |
| `dbschema/sandbox.py` | manifest+script-call | Run DB-touching scripts against a throwaway database, never the live one. |
| `dbschema/seed-library-signatures.py` | manifest+script-call | Seed ``library_runtime_signals`` -- Tier 4a DOM-runtime-signal lookup table. |
| `dbschema/seed-motion-shape-signatures.py` | manifest+script-call | Seed ``motion_shape_signatures`` — Tier V CSS-shape lookup table. |
| `dbschema/seed_history.py` | manifest+script-call | Record the last N seeding runs' row counts and REPORT what moved unexpectedly. |
| `dbschema/wp_reference_archive.py` | manifest+script-call | Preserve the ORPHANED WordPress reference corpus (`hooks` + `docs`). |
| `dead-api-checker/tokenize-calls.php` | manifest+script-call | Tokenize-calls.php |
| `dedupe-shadow-colour-rows.py` | manifest+script-call | One writer for a shadow's colour: the ShadowControl. Any other colour row for the same attribute |
| `deploy-client-notes-quick.py` | manifest | a small, one-off deploy path for |
| `derive-dark-palette.py` | manifest+script-call+test-import | automatic dark palette derivation (U-12 §D). |
| `detect-repeated-siblings.py` | manifest+script-call | - Q2 Tier 1 structural repeated-sibling triad CLI. |
| `diff-gap-sanitiser.php` | — | Differential test: sgs_container_gap_value() old allowlist vs the new sgs_css_length_value()-delegating implementation. |
| `draft-manifest/build_order.py` | manifest+script-call | Build order: a dependency-respecting sequence, tiers first, dependencies always winning. |
| `draft-manifest/dc_script.py` | manifest+script-call | Read a Claude Design draft's script: what each handler does and what each flag means. |
| `draft-manifest/dc_template.py` | manifest+script-call | Read a Claude Design draft's template: its screens, overlay regions and the handlers wired to them. |
| `draft-manifest/manifest.py` | manifest+script-call | Spec 31 draft manifest: what a draft contains, what refers to what, and the order to build it in. |
| `draft-manifest/manifest_report.py` | manifest+script-call | Markdown report for a draft manifest: the same facts as the JSON, in reading order. |
| `draft-manifest/manifest_vocab.py` | manifest+script-call | Draft manifest vocabulary: every word-list and lookup the manifest uses, held as data. |
| `draft-manifest/readme_routes.py` | manifest+script-call | The README's routes table: which views the design says exist, their route and purpose. |
| `drift-validator/validate.py` | manifest+script-call+skill | Spec 19 Stage 9 — Drift Validator |
| `e2e-authoring-acceptance.php` | — | SGS QA-AUTHORING Gate — FR-27 Cluster C End-to-End Authoring Acceptance Test |
| `editor-render-parity/check-a-editor-canvas-desync.js` | manifest+script-call | CHECK A: editor-canvas desync. |
| `editor-render-parity/check-b-invalid-keyword.js` | manifest+script-call | CHECK B: invalid CSS keyword passthrough. |
| `editor-render-parity/lib-a-control-surface.js` | manifest+script-call | CHECK A: which JSX components are control surfaces, and which edit.js uses server-side render. |
| `editor-render-parity/lib-a-destructure.js` | manifest+script-call | CHECK A: destructured, aliased and written attribute collection outside excluded ranges. |
| `editor-render-parity/lib-a-exemptions.js` | manifest+script-call | CHECK A exemption signals 2 (companion co-write) and 3 (no-preview Notice branch). |
| `editor-render-parity/lib-a-helper-reads.js` | manifest+script-call | CHECK A signal 6 — an attribute the editor canvas reads through a helper. |
| `editor-render-parity/lib-a-live-data.js` | manifest+script-call | CHECK A exemption signals 4 (live-data placeholder) and 5 (declared open-state scrim). |
| `editor-render-parity/lib-ast.js` | manifest+script-call | JSX AST helpers shared by the checks. |
| `editor-render-parity/lib-baseline.js` | manifest+script-call | Baseline file loading and finding keys. |
| `editor-render-parity/lib-blocks.js` | manifest+script-call | Reading a block directory: block.json attributes, context keys, keyword table, file helpers. |
| `editor-render-parity/lib-ceiling.js` | manifest+script-call | Blocking flags and the CHECK A open-backlog ceiling, with the full ratchet history. |
| `editor-render-parity/lib-config.js` | manifest+script-call | Paths, the shared component-file map and the Babel options every check reads. |
| `editor-render-parity/lib-editor-invisible.js` | manifest+script-call | Attribute names that are editor-invisible by design (CHECK A exemption set). |
| `editor-render-parity/lib-php-attrvars.js` | manifest+script-call | Traces render.php variables back to the attributes they read (one and two hops). |
| `editor-render-parity/lib-php-gates.js` | manifest+script-call | Classifies if-condition gates and boolean keywords around a usage site (SIGNAL 1). |
| `editor-render-parity/lib-php-html-context.js` | manifest+script-call | Finds the assignment target or HTML attribute a render.php offset sits in. |
| `editor-render-parity/lib-php-mask.js` | manifest+script-call | PHP source masks (strings, comments) and bracket matching. |
| `editor-render-parity/lib-php-sinks.js` | manifest+script-call | Classifies CSS declaration sinks in render.php source. |
| `editor-render-parity/lib-php-usage.js` | manifest+script-call | Collects and classifies every render.php usage site of an attribute (SIGNAL 1 driver). |
| `editor-render-parity/lib-report.js` | manifest+script-call | Prints one check section of the survey report. |
| `editor-render-parity/lib-survey.js` | manifest+script-call | Runs both checks over every block directory. |
| `editor-render-parity/self-test-a-basic.js` | manifest+script-call | Self-test: CHECK A positive, negative, SSR and exemption fixtures. |
| `editor-render-parity/self-test-a-context.js` | manifest+script-call | Self-test: CHECK A block-context fixtures and the CHECK A verdict. |
| `editor-render-parity/self-test-a-exemptions.js` | manifest+script-call | Self-test: CHECK A hover and rename (alias) exemption fixtures. |
| `editor-render-parity/self-test-a-own-component.js` | manifest+script-call | Self-test: CHECK A reads a block's own canvas component (a preview card moved out of edit.js) as canvas code, and the same component mounted only… |
| `editor-render-parity/self-test-assert.js` | manifest+script-call | Assertion helper for the self-test fixtures. |
| `editor-render-parity/self-test-b-keyword.js` | manifest+script-call | Self-test: CHECK B fixtures. |
| `editor-render-parity/self-test-real-tree.js` | manifest+script-call | Self-test: regression tests that read the real block tree. |
| `editor-render-parity/self-test-signals-12.js` | manifest+script-call | Self-test: SIGNAL 1 and SIGNAL 2 fixtures. |
| `editor-render-parity/self-test-signals-345.js` | manifest+script-call | Self-test: SIGNAL 3, 5 and 4 fixtures. |
| `editor-render-parity/self-test.js` | manifest+script-call | Self-test runner: positive and negative fixtures for both checks. |
| `excluded-gate/__init__.py` | manifest+script-call+test-import | excluded-gate — F5 excluded-literal tripwire gate. |
| `excluded-gate/db_check.py` | manifest+script-call | cross-reference detected signatures against excluded_properties DB table. |
| `excluded-gate/models.py` | manifest+script-call+skill+test-import | shared data types for the F5 excluded-literal gate. |
| `excluded-gate/run.py` | commit-gate+manifest+npm+script-call+settings+skill+test-import | F5 excluded-literal tripwire gate for the SGS cloning pipeline. |
| `excluded-gate/scanner.py` | manifest+script-call | import-graph-wide scan for CSS-property exclusion literals. |
| `extract-button-presets.py` | manifest | Pipeline step: extract a draft mockup's `.sgs-button--{variant}` + `:hover` CSS |
| `extract-comment-narrative.py` | manifest | Find comment blocks that NARRATE CHANGES rather than describe behaviour. |
| `fanout-overlay-sibling-attrs.py` | manifest+npm+script-call | D6 (hover + responsive-tier siblings) and |
| `fanout-shadow-lift-attr.py` | manifest | adds the `shadowLiftOnHover` block-level switch (boolean, |
| `fanout-surface-ground-attrs.py` | manifest+script-call | U-1 commit 4e fan-out of `surfaceBlur` / |
| `fix-missing-padding-margin-destructure.py` | manifest | one-shot fix for a real bug |
| `fix-render-tier-object-spacing.py` | manifest+script-call | One-off fix (2026-09-06): render.php CSS-emission side of the tier-object |
| `fix-spacing-preset-names.py` | manifest | Renames numeric spacing-preset ``name`` fields (e.g. "2".."9") in per-client |
| `generate-attr-role-map.py` | manifest+script-call | Spec 35 orphan-triage support. Dumps `block_attributes.role` for every |
| `generate-block-reference.py` | manifest+script-call | SGS Blocks Reference Generator |
| `generate-extension-attributes.js` | commit-gate+manifest+npm+script-call | Single source of truth for the cross-block `sgs*` editor-extension attributes. |
| `generate-fx-effects-php.py` | manifest+script-call | writes includes/generated-fx-effects.php from fx_effects. |
| `generate-fx-qualifying-blocks.py` | manifest+script-call | derives the block -> qualifying-fx-effects |
| `generate-helper-catalogue.py` | manifest+script-call | DERIVE the helper/component/atom catalogue in |
| `generate-icons.js` | manifest+npm+script-call | Generates includes/lucide-icons.php from lucide-static SVG files, plus the SGS icon library (assets/icons/sgs-icons.json) merged into the same PHP… |
| `generate-markup-examples.py` | manifest+script-call | Generate markup examples for all 69 SGS blocks with block.json files. |
| `generate-media-attributes.mjs` | manifest+npm+script-call | Single source of truth for the media attribute TYPE map, JS -> PHP. |
| `generate-media-stylesheet.mjs` | manifest+npm+script-call | Concatenate the media-atom CSS partials into the one enqueued stylesheet. |
| `generate-svg-allowlist.js` | manifest+npm+script-call | Single source of truth for the SVG sanitiser allowlist, PHP -> JS. |
| `generate-tooling-catalogue.py` | manifest+script-call | DERIVE the tooling catalogue in .claude/catalogues/tooling.md. |
| `generative-background/capture-render.mjs` | manifest+script-call | Render the SHIPPING generative-background module and capture a PNG. |
| `generative-background/extract-reference-matrices.mjs` | manifest+script-call | Extract GROUND-TRUTH transform matrices from the reference rig. |
| `generative-background/fidelity-compare.mjs` | manifest+npm+script-call | The driver. Captures BOTH sides (the shipping generative-background engine, via poc-replica.html, and the reference rig… |
| `generative-background/flip-probe.mjs` | manifest+script-call | decision baked into poc-replica.html. |
| `generative-background/harness-lib.mjs` | manifest+script-call | scripts. |
| `generative-background/silhouette-probe.mjs` | manifest+script-call | ORIGIN (systematic-debugging, 2026-09-03, D926/D927). Built to isolate the measured silhouette-coverage deficit (D925 — ours covered 7-12 points LESS… |
| `generative-background/sweep-position-ranges.mjs` | manifest | static orientation/scale/framing overrides (rotationX/Y/Z, scaleX/Y/Z, offsetX/Y) added to `createGenerativeBackground()`. |
| `generative-background/verify-field-texture.mjs` | manifest+npm | Bean's live report ("so many white splotches") after the D939-era blob- density change shipped without checking its own white-coverage stat against… |
| `generative-background/verify-transform.mjs` | manifest+npm+script-call | Verify the PRODUCTION transform maths against ground truth from the rig. |
| `golden-master-acceptance.php` | — | SGS Golden-Master Acceptance Test — Spec 27 FR-27-R2 Empirical Acceptance Gate |
| `golden-master-harness.php` | script-call | SGS Golden-Master Harness — Spec 27 FR-27-R2 Acceptance Gate |
| `hover-guard/audit.js` | manifest+script-call | Pure (non-mutating) audit of `:hover` rules in a CSS source string. Used both for baseline measurement (before the transform runs) and by the checker… |
| `hover-guard/check.js` | manifest+script-call+skill | Build-failing checker. Three jobs (per the brief): |
| `hover-guard/classify.js` | manifest+script-call+skill | Declaration-level classification: is a hover rule "motion-only" (safe for the transform to guard automatically), or OUT OF SCOPE for this transform… |
| `hover-guard/php-hover-scan.php` | manifest+script-call | Static PHP-side hover-guard coverage scan. |
| `hover-guard/run-transform.js` | manifest+npm+script-call | CLI: run transform.js over every `build/blocks/*​/style.css` (or an explicit directory passed as argv[2]) and write the result back in place. |
| `hover-guard/selector-split.js` | manifest+script-call | Selector-level classification for the hover guard. |
| `hover-guard/test-fixtures/anti-vacuity-dead-detector.js` | manifest | ANTI-VACUITY PROOF, not a shipped part of the tool. Simulates a "dead detector" (one that has stopped detecting `:hover` rules at all — the failure… |
| `hover-guard/transform.js` | manifest+script-call+skill+test-import | Build-time transform: wraps motion-only `:hover` rules in compiled block CSS with BOTH touch-safety layers (see includes/helpers-hover-state.php for… |
| `image-sequence-prep.py` | manifest | turns a video into frames the sgs/image-sequence block can use. |
| `inspector-scan/core/baseline.js` | manifest+script-call+skill+test-import | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.7 source=spec evidence=hybrid baseline shape (keyed… |
| `inspector-scan/core/block-files.js` | manifest+script-call | The per-block source context every rule shares. A block's behaviour is not only in edit.js and render.php: edit.js imports components from inside the… |
| `inspector-scan/core/components.js` | manifest+script-call+test-import | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.5 source=file evidence=live-read… |
| `inspector-scan/core/extensions.js` | manifest+script-call+test-import | GROUND-TRUTH: spec=task brief 2026-08-08 (extensionsDir plumbing) source=file evidence=live-read plugins/sgs-blocks/src/blocks/extensions/ on… |
| `inspector-scan/core/finding.js` | manifest+script-call | GROUND-TRUTH: spec=none source=file evidence=live-read plugins/sgs-blocks/scripts/inspector-scan/core/roster.js (`BLOCKS_DIR =… |
| `inspector-scan/core/golden.js` | manifest+script-call | core/golden.js — the shared GOLDEN-CONTROL engine (C4 step 1, 2026-08-19). |
| `inspector-scan/core/report.js` | manifest+script-call | Report is generated by iterating the rule REGISTRY (rules.json order), never a second hand-written order list — this is the direct mitigation for H7… |
| `inspector-scan/core/roster.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=file evidence=live-read… |
| `inspector-scan/core/selftest.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.9 source=file evidence=live-read… |
| `inspector-scan/core/sources.js` | manifest+script-call+skill | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=file evidence=`@babel/*` confirmed NOT a declared… |
| `inspector-scan/export-colour-css-property.py` | manifest+script-call | DB-first mechanism source for rule 31. |
| `inspector-scan/rules/01-tab-group.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 1 source=file evidence=live-read… |
| `inspector-scan/rules/03-dense-panel-candidate.js` | manifest | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 3 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/04-colour-alpha.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 4 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/07-preset-only-shadow.js` | manifest | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 7 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/08-raw-url-link.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 8 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/14-media-upload-check.js` | manifest | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 14 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/17-reduced-motion-gate.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 17 source=file evidence=PORTED WHOLE (not re-derived — the migration order… |
| `inspector-scan/rules/18-decorative-image-aria.js` | manifest | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 18 source=file evidence=row 18 verdict "ABSENT (claim… |
| `inspector-scan/rules/20-pattern-template-lock.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 20 source=file evidence=row 20 verdict "ABSENT (claim… |
| `inspector-scan/rules/21-render-without-control.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"The defect register" ("The fourth quadrant: declared + rendered + NO… |
| `inspector-scan/rules/22-placement-rule-surfaces.js` | manifest | GROUND-TRUTH: spec=.claude/archive/decisions.md D537 (read verbatim 2026-08-09) + .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"THE… |
| `inspector-scan/rules/23-content-width-needs-inner-band.js` | manifest | GROUND-TRUTH: spec=.claude/archive/decisions.md D540 (read verbatim 2026-08-10) +… |
| `inspector-scan/rules/24-raw-canonical-component.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §1 COLOUR / §2 LINK (read live 2026-08-10). §1.1/§1.3: canonical =… |
| `inspector-scan/rules/25-no-own-device-switcher.js` | manifest | GROUND-TRUTH: spec=task brief 2026-08-10 (global device toggle regression guard) + live read of src/components/ResponsiveControl.js… |
| `inspector-scan/rules/26-responsive-duplicate.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §12 (THE RESPONSIVE WRAPPER FAMILY) source=file evidence=live-read… |
| `inspector-scan/rules/27-superseded-link-control.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §2 LINK |
| `inspector-scan/rules/28-fix-durability.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md (Part F, anti-patterns) source=file evidence=live-read… |
| `inspector-scan/rules/29-duplicate-visible-label.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 (canonical-assignment + banned-lookalike table) + Part A5 (nested ToolsPanel… |
| `inspector-scan/rules/30-raw-box-control.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 canonical-assignment line |
| `inspector-scan/rules/31-golden-colour-control.js` | manifest+script-call | GROUND-TRUTH: spec=plugins/sgs-blocks/scripts/consistency/golden-controls.json (written 2026-08-19, read live before writing this rule)… |
| `inspector-scan/rules/33-ineffective-typography-selector.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md Part F.1 source=file evidence=live-read 2026-08-18. |
| `inspector-scan/rules/34-declared-attr-unrendered.js` | manifest+script-call | GROUND-TRUTH: spec=.superpowers/sdd/task-2-brief.md ("make rule 34 consume the gate's verdicts, split by SURFACE") source=file evidence=live-read… |
| `inspector-scan/rules/35-pinned-panel-position.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART O §"THE PLACEMENT ORDER CONVENTION" (added alongside… |
| `inspector-scan/rules/36-box-control-presets-missing.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/scratch/2026-08-27-c16-spacing-presets-design.md (the C16 spacing-presets design) + src/components/SgsBoxControl.js's own… |
| `inspector-scan/rules/37-media-no-handroll.js` | manifest | GROUND-TRUTH: spec=coordinator brief 2026-08-31 ("Write ONE new inspector-scan rule module: media-no-handroll") source=file evidence=live-read… |
| `inspector-scan/rules/38-media-attr-parity.js` | manifest | GROUND-TRUTH: spec=.claude/plans/media-element-tingly-stallman.md ("Wave 6 — media-attr-parity: server-registered schema matches the JS keys")… |
| `inspector-scan/rules/39-media-control-coverage.js` | manifest | GROUND-TRUTH: spec=coordinator brief 2026-09-01 ("Write a rule that checks OTHER blocks adopt the media-atom system correctly") source=file… |
| `inspector-scan/rules/40-media-svg-sanitised.js` | manifest | GROUND-TRUTH: spec=coordinator brief 2026-09-01 ("Write ONE new inspector-scan rule module: media-svg-sanitised") source=file evidence=live-read… |
| `inspector-scan/rules/41-co2-element-grouping-order.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"THE PLACEMENT RULE" (D537, 2026-08-09) + Spec 35A CO-2 ("element-first… |
| `inspector-scan/rules/42-no-op-reset-controls.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART F |
| `inspector-scan/rules/43-colour-only-state-indicator.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART F |
| `inspector-scan/rules/44-help-text-not-described.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART F |
| `inspector-scan/rules/45-typography-full-replacement.js` | manifest | GROUND-TRUTH: spec=plugins/sgs-blocks/CLAUDE.md "Block Customisation Standard" item 2 (Bean R-22-13, 2026-06-11) +… |
| `inspector-scan/run.js` | manifest+npm+script-call+skill+test-import | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=spec evidence=this is the entry point described in… ⚠ **header disputes this — it IS wired** |
| `ledger/__init__.py` | manifest+script-call+test-import | ledger — F2 draft-derived CSS Accounting Ledger (input parser). |
| `ledger/content_gap_check.py` | commit-gate+manifest+script-call+test-import | ledger.content_gap_check — F5 ContentGap visibility gate (the content-dropping channel). |
| `ledger/coverage_check.py` | commit-gate+manifest+npm+script-call+test-import | ledger.coverage_check — F5 pipeline-close coverage-conservation gate (UNACCOUNTED leg). |
| `ledger/declare_input.py` | manifest+npm+script-call+test-import | ledger.declare_input — F2 draft-derived CSS Accounting Ledger (input parser). |
| `ledger/models.py` | manifest+script-call+skill+test-import | ledger.models — data model for F2 CSS Accounting Ledger (input half). |
| `lib/block-source-files.js` | manifest+script-call | Block source-file resolver shared by the gate scripts. |
| `lib/block_source_files.py` | manifest+script-call | Block source-file resolver shared by the gate scripts. |
| `lib/context-keys.js` | manifest+script-call | The one answer to "is this context key consumed?" for check-dead-controls.js, check-editor-render-parity.js and the wiring-fingerprint gate. A key is… |
| `lib/e14-js-leaf.js` | manifest+script-call | E14: a control whose element no PHP markup emits because front-end JS builds it (`const time = el( 'span', 'sgs-x__time', '0:00' );`). |
| `lib/e14-markup-splice.js` | manifest+script-call | E14 markup splice (triage section 7, gap 13). |
| `lib/e14-unknown-tag.js` | manifest+script-call | E14: a bare tag in a declaring selector (`.x figcaption`) against an element whose tag name the markup builds at run time (`<%1$s class="x__cap">`). |
| `lib/stage8-cli.js` | manifest+script-call | to keep stage8-audit.js under the repo's 250-line limit. No browser, no network — `makeRunId` is deterministic given an explicit `now` (never calls… |
| `lib/stage8-lighthouse.js` | manifest+script-call | out purely to keep stage8-audit.js under the repo's 250-line limit. This is the ONLY module in the stage8 family that touches a real browser/network… |
| `lib/stage8-network-console-builders.js` | manifest+script-call | stage8-audit.js. CWV builder + the shared LHR helpers (`hasRuntimeError`, `auditErrored`, `auditItems`, `hostnameOf`) live in the sibling… |
| `lib/stage8-report-builders.js` | manifest+script-call | stage8-audit.js. Network/console report builders live in the sibling `stage8-network-console-builders.js` (split purely to keep both files under the… |
| `lib/stage8-self-test-console.js` | manifest+script-call | purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by `stage8-self-test.js` via `runConsoleSelfTests(check)`. |
| `lib/stage8-self-test-cwv.js` | manifest+script-call | purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by `stage8-self-test.js` via `runCwvSelfTests(check)`. |
| `lib/stage8-self-test-fixtures.js` | manifest+script-call | family, split out purely so no self-test file exceeds the repo's 250-line limit. |
| `lib/stage8-self-test-network.js` | manifest+script-call | purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by `stage8-self-test.js` via `runNetworkSelfTests(check)`. |
| `lib/stage8-self-test.js` | manifest+script-call | launches a browser or touches the network — every assertion runs against fixture Lighthouse Result objects, so the SAME pure functions that a real… |
| `lint-responsive-controls.py` | manifest+script-call | FR-36-24 structural gate (R-31-9 for responsive controls). |
| `lints/__init__.py` | manifest+script-call+test-import |  |
| `lints/bem-lint.py` | manifest+script-call+skill | BEM compliance lint — Stage 0.1 of /sgs-clone (Spec 31). |
| `lints/lint-spec-drift.py` | manifest+npm+script-call | Spec-drift lint — do the specs describe things that actually EXIST? ⚠ **header disputes this — it IS wired** |
| `lints/lint-theme-css-hardcodes.py` | manifest+script-call | Theme-CSS hardcode lint — arbitrary typography/colour literals in THEME CSS. |
| `lints/token-lint.py` | manifest+script-call | Token-discovery lint — Stage 0.5 of /sgs-clone (Spec 31, FR38). |
| `make-visual-diff-reports.py` | manifest+script-call | Emit visual-diff reports, each citing ITS OWN measurement. |
| `migrate-border-content.php` | — | block-private Shape-B attributes. Run with `wp eval-file`. |
| `migrate-border-control.js` | manifest+script-call | an already block-private border UI (width + style + colour) in edit.js. |
| `migrate-border-element.py` | manifest | Border-element census: HOW each block's PHP glues its border CSS together today. |
| `migrate-border-radius-render.py` | manifest | Codemod: swap the per-block hand-rolled border-radius tier read in |
| `migrate-border-shape-b.js` | manifest+npm | ⛔ THIS IS NOT A BRANCH OF migrate-border-control.js. That script's header declares a hard Shape-B exclusion, on the stated grounds that "there is no… |
| `migrate-box-alignment.py` | manifest+npm | physical `left\|right` to logical `start\|end` for five settings. |
| `migrate-box-control-presets.py` | manifest+script-call | - roll the C16 spacing-preset dropdown out from its |
| `migrate-box-control-wiring.py` | manifest | Codemod: swap the flat-sibling <ResponsiveBoxControl> wiring for the |
| `migrate-box-longhands.py` | manifest+npm+script-call | CR6: move padding, margin and corner-radius boxes off the shorthands that zero-fill unset sides. |
| `migrate-colour-picker-to-panel.py` | manifest | - migrate raw <DesignTokenPicker> colour mounts in a |
| `migrate-container-flexwrap-and-stack-candidates.py` | manifest | census + safe single-apply for TWO |
| `migrate-content-collection-to-card-grid.php` | — | Migrate `sgs/content-collection` blocks to `sgs/card-grid` (source = cpt-collection). |
| `migrate-core-blocks/block_parser.py` | manifest+script-call | Span-preserving WordPress block-comment parser. |
| `migrate-core-blocks/build_register.py` | manifest+script-call | Track C register builder — read-only survey of replaceable core blocks. |
| `migrate-core-blocks/capture-page.js` | manifest | Generic Track C first-paint capture: screenshots a URL at 375/768/1440 into reports/visual-diff/ and flags horizontal overflow. |
| `migrate-core-blocks/contract.py` | manifest+script-call | Shared contract between the migration driver and pairing modules. |
| `migrate-core-blocks/driver.py` | manifest+script-call | Track C migration driver — swaps core blocks for their SGS replacements. |
| `migrate-core-blocks/lint-page.py` | manifest+script-call | Lint (and optionally fix) banned core blocks in a PAGE's block markup. |
| `migrate-core-blocks/migrate-details-to-accordion.py` | manifest | core/details -> sgs/accordion + sgs/accordion-item (N sibling details -> 1 accordion). |
| `migrate-core-blocks/pairings/__init__.py` | manifest+script-call+test-import |  |
| `migrate-core-blocks/pairings/button_pairing.py` | manifest+script-call+script-call(dynamic) | core/button -> sgs/button transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/buttons_pairing.py` | manifest+script-call(dynamic) | core/buttons -> sgs/multi-button transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/column_pairing.py` | manifest+script-call(dynamic) | core/column -> sgs/container (a grid cell). Track C pairing module. |
| `migrate-core-blocks/pairings/columns_pairing.py` | manifest+script-call(dynamic) | core/columns -> sgs/container (a grid row). Track C pairing module. |
| `migrate-core-blocks/pairings/cover_pairing.py` | manifest+script-call+script-call(dynamic) | core/cover → sgs/hero transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/group_pairing.py` | manifest+script-call+script-call(dynamic) | core/group -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/heading_pairing.py` | manifest+script-call(dynamic) | core/heading → sgs/heading transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/image_pairing.py` | manifest+script-call(dynamic) | core/image → sgs/media transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/latest_posts_pairing.py` | manifest+script-call+script-call(dynamic) | core/latest-posts → sgs/post-grid transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/paragraph_pairing.py` | manifest+script-call(dynamic) | core/paragraph → sgs/text transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/post_template_pairing.py` | manifest+script-call(dynamic) | core/post-template -> sgs/post-grid — REFUSE-ALL (no standalone target exists). |
| `migrate-core-blocks/pairings/query_pairing.py` | manifest+script-call+script-call(dynamic) | core/query -> sgs/post-grid — REFUSE-ALL (design-decision gap, not a bug). |
| `migrate-core-blocks/pairings/row_pairing.py` | manifest+script-call(dynamic) | core/row -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/separator_pairing.py` | manifest+script-call(dynamic) | core/separator -> sgs/separator transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/site_logo_pairing.py` | manifest+script-call(dynamic) | core/site-logo → sgs/responsive-logo transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/stack_pairing.py` | manifest+script-call(dynamic) | core/stack -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/typography_common.py` | manifest+script-call+script-call(dynamic) | Shared helpers for the core/heading + core/paragraph pairing modules. |
| `migrate-core-blocks/probe-accordion.js` | manifest | Verify the migrated FAQ accordion works end-to-end: all 5 questions present, answers hidden until clicked, and clicking a header reveals its answer. |
| `migrate-core-blocks/probe-button-equivalence.js` | manifest | Content-keyed button equivalence probe (rule 4a): compares each button's rendered geometry + paint between a BEFORE page (core/button) and an AFTER… |
| `migrate-core-blocks/probe-columns-responsive.js` | manifest | Columns→container responsive equivalence: compares the two column cells' geometry between BEFORE (core/columns) and AFTER (sgs/container grid) at… |
| `migrate-core-blocks/probe-cw-cause.js` | manifest | Prove-the-cause probe: on the minimal contentWidth:800 repro, find the sgs-container OUTER element and enumerate EXACTLY which CSS rule caps its… |
| `migrate-core-blocks/probe-group-layout.js` | manifest | Group→container layout equivalence: compare the wrapper element's box + background + the inner content-band width between a BEFORE (core/group) and… |
| `migrate-core-blocks/probe-heading-cascade.js` | manifest | Diagnose WHY a heading's colour/letter-spacing differs between the core and SGS renders: dump the theme's preset custom properties and enumerate… |
| `migrate-core-blocks/probe-image-pairing.js` | manifest | Track C image-pairing equivalence probe — compares the rendered geometry of the three representative images on the BEFORE (core/image) and AFTER |
| `migrate-core-blocks/probe-multibutton-margin.js` | manifest | Settles one question empirically: does `style.spacing.margin` actually RENDER on sgs/multi-button (which declares no spacing support, but routes… |
| `migrate-core-blocks/probe-overflow.js` | manifest | Track C overflow probe — at 375px, finds every element wider than the viewport and reports its selector path + the computed properties that govern… |
| `migrate-core-blocks/probe-page8-media.js` | manifest | Page-8 (homepage clone) media geometry probe — regression net for the sgs/media naked-mode max-width fix. Run before and after the deploy; the two… |
| `migrate-core-blocks/probe-preset-gap.js` | manifest | Track C preset-gap probe — measures the LIVE computed font-size of the four PROBE blocks on the canary test page (id 1468, /tc-preset-gap-probe/). |
| `migrate-core-blocks/probe-text-equivalence.js` | manifest | Content-keyed typography equivalence probe (rule 4a). |
| `migrate-core-blocks/publish-pattern-pair.py` | manifest | Publish a BEFORE/AFTER canary page pair for a migrated pattern file. |
| `migrate-core-blocks/upgrade-button-presets.py` | manifest | One-shot: upgrade already-emitted sgs/button instances to use PRESETS. |
| `migrate-font-size-ladder.py` | manifest | rehome theme font-size preset slugs after a ladder change. |
| `migrate-gallery-object-model.js` | manifest | onto the Spec 37 FR-37-16 {desktop,tablet,mobile} object model. |
| `migrate-length-sanitiser.py` | manifest+script-call | Move every LENGTH-valued call site from the crude sanitiser to the hardened one. |
| `migrate-nav-gap-tier.php` | — | Fold a stored flat `gap` on sgs/nav-bar-menu and sgs/nav-drawer-menu into its tier object (Wave 3C U-3, 2026-09-25): "gap":"28px" ->… |
| `migrate-off-native-spacing.py` | manifest+script-call+settings | move base padding/margin off WP-native |
| `migrate-overlay-tier-axis.py` | manifest | Move the overlay's responsive tier axis OFF colour and ONTO opacity (D739). |
| `migrate-pattern-template-lock.py` | manifest | add templateLock:"contentOnly" to the outermost |
| `migrate-phantom-colour-token.py` | manifest | Sweep colour-token slugs that no palette defines onto the real token they mean. |
| `migrate-product-card-image-id.py` | manifest | backfill `imageId` (a real WordPress |
| `migrate-render-closures.py` | manifest+npm+script-call | Adopt the shared render helpers in place of per-file inline sanitiser closures. |
| `migrate-shadow-presets.py` | manifest | Shadow preset migration (U-1 commit 4f-1 step 6): the four old theme shadows are replaced by |
| `migrate-stored-tier-scalars.py` | manifest+script-call | fold a flat per-device scalar into ONE tier object, |
| `migrate-theme-attr-rename.py` | manifest+script-call | rename ONE attribute key, scoped to ONE block slug, |
| `migrate-theme-native-spacing.py` | manifest+npm | Migrate hand-authored `style.spacing` to the block-OWNED padding/margin attrs. |
| `migrate-theme-tier-scalars.py` | manifest+script-call | fold a flat per-device scalar into ONE tier object, |
| `migrate-tier-object.py` | manifest+npm+script-call | collapse a flat per-device attribute trio into ONE tier object. |
| `migrate-typography-full-controls.js` | manifest | surface-taxonomy track): turn on the FULL `TypographyControls` control set on every already-adopting single-target call site, instead of the partial… |
| `migrations/2026-06-13-testimonial-selector-fingerprint-override.py` | manifest | Migration: write multi-alias derived_selector for sgs/testimonial styling attrs. |
| `migrations/2026-06-26-testimonial-media-role-selector.py` | manifest+script-call | Migration: set role + derived_selector for sgs/testimonial object media attrs. |
| `migrations/2026-08-13-register-core-role-and-seed-native-wp.py` | manifest | Migration: register the 'core' role + seed it onto every source='native_wp' row. |
| `migrations/2026-08-13-role-remediation-part2-overrides.py` | manifest | One-shot script: apply this session's confirmed one-off role classifications. |
| `migrations/2026-08-24-drop-fossil-columns.py` | manifest+script-call | retire three provably dead columns. |
| `migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py` | manifest | Migration: relabel sgs/before-after.boxShadowColour's css_element to |
| `migrations/2026-08-27-gradient-family-synthetic-css-property-census-fix.py` | manifest | Migration: correct every unreachable, synthetic `css_property` value on the |
| `migrations/2026-08-27-product-card-background-gradient-css-property-fix.py` | manifest | Migration: correct sgs/product-card.backgroundColourGradient's css_property |
| `migrations/2026-09-05-helper-function-catalogue.py` | manifest | per-FUNCTION rows for PHP helpers. |
| `migrations/2026-09-07-fix-border-radius-formats.py` | manifest | Fix borderRadius format issues: |
| `migrations/2026-09-07-migrate-dead-border-attrs.py` | manifest | Migrate style.border to typed border attributes in SGS pattern files. |
| `migrations/2026-09-10-add-tier-shape-column.py` | manifest+script-call | add block_attributes.tier_shape. |
| `migrations/2026-09-11-add-co-animates-opacity-column.py` | manifest | add |
| `migrations/2026-09-14-nav-menu-split-classify-harness.php` | script-call | Render harness for `2026-09-14-nav-menu-split-classify.py`. Runs INSIDE WordPress via `wp eval-file -` (STDIN — nothing is uploaded) and prints one… |
| `migrations/2026-09-14-nav-menu-split-classify-sentinels.php` | script-call | Test-value generator for `2026-09-14-nav-menu-split-classify-harness.php`. |
| `migrations/2026-09-14-nav-menu-split-classify.py` | manifest+script-call | deterministic bar / drawer / both verdict for every |
| `migrations/2026-09-14-nav-menu-split.py` | manifest | census + codemod for splitting `sgs/nav-menu` into |
| `motion-qa/probe-carousel-loop.mjs` | manifest | Live probe — looping carousels (Spec 38, Bean's independent-control ruling). |
| `motion-qa/probe-cursor-field.mjs` | manifest+script-call | Live probe — cursor-reactive field (Spec 38 §3.3, FR-38-25). |
| `motion-qa/probe-editor-css-warnings.mjs` | manifest | Failing-test probe for the editor iframe CSS-loading warnings. |
| `motion-qa/probe-first-paint.mjs` | manifest | gate's `first_paint_capture_passed` field is supposed to attest. |
| `motion-qa/probe-fr-38-35-connector-stack.mjs` | manifest | Verify the shipped glow + fill + head stack against the REAL compiled stylesheet and the REAL markup render.php now emits. |
| `motion-qa/probe-fr-38-35-live.mjs` | manifest | FR-38-35 LIVE verification against the canary, on the shipped mask stack. |
| `motion-qa/probe-fr-38-35-sparks.mjs` | manifest | async function run(reduced){ const p=await b.newPage({viewport:{width:1440,height:950},...(reduced?{reducedMotion:'reduce'}:{})}); await… |
| `motion-qa/probe-fr-38-35-timeline-progress.mjs` | manifest | FR-38-35 live probe — sgs/timeline scroll-driven progress connector. |
| `motion-qa/probe-good-by-default.mjs` | manifest+npm+script-call | Gap-register claim 7 — is "good by default" true for pin-scrub / scrub / scramble / split-reveal? (2026-08-21, D729) |
| `motion-qa/probe-horizontal-panel-focus.mjs` | manifest | Horizontal-panel keyboard-focus probe — Spec 38 FR-38-8 follow-up |
| `motion-qa/probe-horizontal-panel.js` | manifest+script-call | Horizontal-panel travel probe — Spec 38 FR-38-8. |
| `motion-qa/probe-morph-geometry.mjs` | manifest+npm+script-call | D452 close-out (2026-08-21) — does `fx-morph` actually morph on the live canary? |
| `motion-qa/probe-motion-path-repeat.mjs` | manifest+npm+script-call | D451 close-out (2026-08-21) — does motion-path re-animate on a SECOND downward pass? |
| `motion-qa/probe-reduced-motion.mjs` | manifest+script-call | Horizontal panel — reduced-motion arm probe. Spec 38 FR-38-8 / §10. |
| `motion-qa/probe-row-collapse-reduced-motion.mjs` | manifest | Header row-collapse under `prefers-reduced-motion` (Spec 37 FR-37-40 / Spec 38 §12). |
| `motion-qa/probe-step13-pin-focus.mjs` | manifest+script-call | Step 13 (Motion Wave D register) — pin + horizontal-panel keyboard story. |
| `motion-qa/probe-step14-scrub-focus.mjs` | manifest+script-call | Job 1/2 (2026-08-01, D453 follow-up register) — fx-scrub.js + fx-split-reveal.js keyboard-hold fix, verified IN SITU against the REAL deployed… |
| `motion-qa/probe-stepn-image-sequence-pin.mjs` | manifest | Step N (Motion Wave D register) — image-sequence PIN-ON path, first live observation. |
| `motion-qa/probe-tier-w-surface.mjs` | manifest | Live probe — Tier W surface-treatment effect (Spec 38 §1.2b, D479). |
| `motion-qa/probe-wave-c-editor.mjs` | manifest | Spec 38 Wave C — EDITOR-surface probe (D388). |
| `motion-qa/probe-wave-c.mjs` | manifest+script-call | Spec 38 Wave C — live browser probe for every shipped Wave C effect. |
| `motion-qa/run-live-probes.mjs` | manifest+npm+script-call | Live motion-QA runner — the standing post-deploy motion check. |
| `n8n/push-site-events.py` | manifest | Push or check the "Build emails" code of the live SGS site-events N8N workflow. |
| `n8n/site-events-build-emails.js` | manifest+script-call | SGS site events: turns one webhook POST into zero or more ready-to-send emails. |
| `nav-qa/axe-run.mjs` | manifest+script-call | blocks (Spec 36 §8 / FR-36-16: "axe = 0 on the OPEN drawer AND an OPEN desktop mega"). |
| `nav-qa/build-header-fixtures.py` | manifest | nav QA fixtures whose nav blocks sit INSIDE a real site header. |
| `nav-qa/build-poc-fixtures.py` | manifest | create the nav-drawer variant POC fixtures on the canary. |
| `nav-qa/check-fixture-fidelity.py` | manifest | compare the nav-drawer POC content plan to the harvest. |
| `nav-qa/crawl-assert.mjs` | manifest | bar+dropdown+mega link AND mega content must be present in the PRE-JS HTML (what a crawler / no-JS user gets), never injected client-side. |
| `nav-qa/elementfrompoint-sweep.mjs` | manifest+script-call | occlusion sweep, carried verbatim from Spec 34 FR-S9-5 / FR-34-7. |
| `nav-qa/extended-probe.mjs` | manifest | Extended open-drawer measurement probe (measurement-vs-eye rule). |
| `nav-qa/gate3c/parity-indus.mjs` | manifest | Parity config: the wholesale-food client's mega-menu draft against its copy on sandybrown (page 4465, header 4461). |
| `nav-qa/gate3c/parity-lamalama.mjs` | manifest | Parity config: the reference site's floating pill against its copy on sandybrown (page 4446, header 4435). |
| `nav-qa/gate3c/probe-drawer-row.mjs` | manifest | Opens a page, taps the burger, and prints computed layout for the drawer's first sgs/button and every ancestor up to the drawer, plus the email/call… |
| `nav-qa/lib/elementfrompoint-sweep-selftest.mjs` | manifest+script-call | `elementFromPoint` occlusion sweep. |
| `nav-qa/lib/openness-guard.mjs` | manifest+script-call | for every nav-qa script that measures or captures an interactive surface. |
| `nav-qa/lib/shoot-drawer-pairs-selftest.mjs` | manifest+script-call | WHY |
| `nav-qa/lib/sweep-drawer-variants-selftest.mjs` | manifest+script-call | A sweep whose assertions cannot fail reads green forever. Every control here runs one of the sweep's REAL decision functions (handed in as `targets`… |
| `nav-qa/logical-props-lint.py` | manifest | RTL-readiness lint for the SGS nav blocks |
| `nav-qa/m03-direction-probe.mjs` | manifest | U-13 M-03 live probe: direction-keyed restyle (fixture `direction-fade`, fantasy's cell). |
| `nav-qa/palette-contrast-sweep.mjs` | manifest+script-call | drafts (mega-menu panels and any other self-contained SGS-BEM draft). |
| `nav-qa/qa-close-fixture.php` | — | U-9+U-11 live-check fixture on sandybrown (wp eval-file qa-close-fixture.php <case>). Idempotent. |
| `nav-qa/qa-geometry-fixture.php` | script-call | U-3 + U-8 live-check fixture on sandybrown (wp eval-file qa-geometry-fixture.php <case>). Idempotent. |
| `nav-qa/qa-item-markup-fixture.php` | manifest+script-call | U-6 + U-7 live-check fixture on sandybrown (wp eval-file qa-item-markup-fixture.php <case>). Idempotent. |
| `nav-qa/qa-motion-fixture.php` | script-call | U-5 live-check fixture on sandybrown (wp eval-file qa-motion-fixture.php <case>). Idempotent. |
| `nav-qa/qa-u1-owed-fixture.php` | manifest+script-call | U-1 owed live checks on sandybrown (wp eval-file qa-u1-owed-fixture.php <case>). Idempotent. |
| `nav-qa/shoot-drawer-pairs.mjs` | manifest+script-call | WHY |
| `nav-qa/submenu-harness.php` | — | Stubbed harness for SGS_Nav_Menu_Bar_Renderer — walker AND render_items. |
| `nav-qa/sweep-drawer-variants.mjs` | manifest+script-call | WHY THIS SHAPE |
| `nav-qa/u1-owed-probe.mjs` | manifest | U-1 + U-2 owed live checks (Wave 3C), run against `qa-u1-owed-fixture.php`. |
| `nav-qa/u13-ink-probe.mjs` | manifest | U-13 live probe: section-adaptive header ink on /qa-section-ink/. |
| `nav-qa/u16-editor-check.mjs` | manifest | U-16 editor check: the entrance panel's Distance and delay options through the real inspector. |
| `nav-qa/u16-entrance-probe.mjs` | manifest | U-16 live probe: entrances as their own layer, on /qa-entrance/ (fixture case `entrance`). |
| `nav-qa/u18-copy-probe.mjs` | manifest | U-18 copy-parity probe (Wave 3C Gate 3C item 4): measures a composed header copy while it is the ACTIVE header, and screenshots it closed and open at… |
| `nav-qa/w2u-probe.mjs` | manifest | W2-u — mega-menu + drawer SAME-PAGE integration probe. |
| `no-inline/check-no-inline.py` | manifest+npm+script-call | Anti-regression GATE for the framework-wide inline-zero win (Spec 32 FR-32-1 / |
| `no-inline/check-stranded-guards.py` | manifest+npm | Anti-regression GATE for STRANDED inline-style guards (Spec 32). |
| `no-inline/detect.py` | manifest+script-call+skill | No-inline detector — the worklist generator for the framework-wide inline-zero |
| `no-inline-land-verify.js` | manifest+script-call+settings | For a manifest of blocks, it: |
| `oracle/__init__.py` | manifest+script-call+test-import | oracle — F3 LANDED render-oracle (F3-core). |
| `oracle/attribution_ground_truth.py` | manifest | Generate + check the attribution GROUND TRUTH (the falsifiable control). |
| `oracle/batch_runner.py` | manifest+script-call | oracle.batch_runner — F3 render-oracle LANDED runtime, multi-fixture BATCH mode. |
| `oracle/capture.py` | manifest+script-call+skill | oracle.capture — capture-adapter INTERFACE for the F3 LANDED oracle. |
| `oracle/decompose_unattributed.py` | manifest | Diagnostic: decompose the oracle's unattributed-cell count into named buckets. |
| `oracle/element_probe.py` | manifest+script-call | oracle.element_probe — resolve a DRAFT selector to the CLONE element to measure. |
| `oracle/golden_expectations.py` | manifest+script-call | oracle.golden_expectations — does a fixture's GOLDEN expect any rendered text? |
| `oracle/guards.py` | manifest+script-call | oracle.guards — the four false-win guards for the F3 LANDED oracle. |
| `oracle/metamorphic.py` | manifest+script-call | oracle.metamorphic — MR-2 metamorphic relation for the F3 LANDED oracle. |
| `oracle/models.py` | manifest+script-call+skill+test-import | oracle.models — data model for F3 LANDED render-oracle. |
| `oracle/provision_fixture_canaries.py` | manifest+script-call | oracle.provision_fixture_canaries — deploy the fixture corpus as live canary pages. |
| `oracle/render_oracle.py` | manifest+script-call | oracle.render_oracle — F3 render-oracle: the live Playwright capture leg. |
| `oracle/run_canary_proof.py` | manifest+script-call | oracle.run_canary_proof — F3-core-B: the live-canary LANDED proof (separate named command). |
| `oracle/verdict.py` | manifest+script-call+skill+test-import | oracle.verdict — the verdict function for the F3 LANDED oracle. |
| `orchestrator/atomic-block-scaffold.py` | manifest+script-call+skill | - Spec 31 Phase 5b.8 atomic-block scaffold. |
| `orchestrator/attribute-staged-apply.py` | manifest+script-call+skill | - Spec 31 Phase 5b.6 attribute staged-application. |
| `orchestrator/autonomy_gate.py` | manifest+script-call+skill | - Spec 31 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7. |
| `orchestrator/boundary_nesting.py` | manifest+script-call+test-import | Which loop-item boundaries sit inside another boundary. |
| `orchestrator/breakpoint_snap.py` | manifest+script-call+test-import | breakpoint_snap: round a draft script's width thresholds to our device edges (Bean's rule, D1129/D1132). |
| `orchestrator/check_attr_schema_conformance.py` | manifest+script-call | Task 3 (G2): fail closed when the converter |
| `orchestrator/check_flat_tier_regression.py` | manifest+script-call | Spec 35 flat-to-object migration divergence gate. |
| `orchestrator/check_no_mirror.py` | manifest+script-call | R-31-15 anti-mirror gate for the cloning converter. |
| `orchestrator/critical-fix-verification.py` | manifest+script-call+skill | - Spec 31 Phase 5f.1 acceptance harness. |
| `orchestrator/css_router.py` | manifest+script-call+test-import | Spec 16 §FR6 four-destination CSS router. |
| `orchestrator/draft-responsive-probe.js` | manifest+script-call+test-import | THE PROBLEM (plain English): `computed-parity.js` measures draft-vs-CLONE fidelity AFTER a clone exists — it hard-requires --draft AND --clone… |
| `orchestrator/draft_server.py` | manifest+script-call | Serve an original Claude Design draft folder over HTTP for Stage 11.6. |
| `orchestrator/expected_rules.py` | manifest+script-call | - Per-section CSS rule baseline for Phase 9 walkdown. |
| `orchestrator/functionality-bulk-apply.py` | manifest+script-call+skill | - Spec 31 Phase 5b.7 bulk-application. |
| `orchestrator/js_content_resolver.py` | manifest+script-call | expand `<sc-for>` loops whose repeated content lives ONLY in a draft's |
| `orchestrator/lingua_franca.py` | manifest+script-call+skill | - Spec 31 Phase 5c (FR9) convention-to-SGS-BEM converter. |
| `orchestrator/manifest_annotation.py` | manifest+script-call | manifest_annotation: turn a Claude Design draft's block proposals into SGS-BEM class names on the run copy. |
| `orchestrator/manifest_decisions_log.py` | manifest+script-call | Write the manifest annotation stage's decisions to Spec 44's audit log. |
| `orchestrator/manifest_layout_choices.py` | manifest+script-call | manifest_layout_choices: read a block's LAYOUT CHOICES from the draft's structure (design 2026-09-23 section 4). |
| `orchestrator/media-sideload.py` | manifest+script-call+skill | - Spec 31 Phase 5b.5 media sideloader. |
| `orchestrator/mutex.py` | manifest+script-call+skill | - Spec 31 Phase 5b.4 build mutex (FR19). |
| `orchestrator/object_attr_shape.py` | manifest+script-call | shared object-attribute shape discriminator. |
| `orchestrator/orchestrator_main.py` | manifest+script-call+skill+test-import | - Spec 31 Phase 5e.8 top-level entry point. |
| `orchestrator/pipeline-stage-gate.py` | manifest+script-call | post-clone structural gate for the SGS cloning pipeline. |
| `orchestrator/preflight_chain.py` | manifest+script-call+skill | - Spec 31 Phase 5e.1 + 5e.2. |
| `orchestrator/register_patterns.py` | manifest+script-call | - Spec 31 Phase 6 Step 0 +REGISTER tail. |
| `orchestrator/resolve-js-content.js` | manifest+script-call | THE PROVEN APPROACH (FR-31-26 preamble): a draft whose `<sc-for>` content lives only in a `static ARRAY = [...]` class property has zero usable… |
| `orchestrator/screen_route.py` | manifest+script-call+test-import | Screen route: which screen of a multi-screen draft a clone run turns into the page. |
| `orchestrator/script-bindings-eval.js` | manifest+script-call | Read by `script_bindings.py::resolve_tier_bindings`. It receives, as JSON on stdin, the draft's own declarations (`const effW = ...`, `const mob =… |
| `orchestrator/script_bindings.py` | manifest+script-call+test-import | Script bindings: the per-device values a Claude Design draft's script gives its template. |
| `orchestrator/script_bindings_stage.py` | manifest+script-call+test-import | script_bindings_stage: turn a draft script's own width rules into the per-run value map the converter reads. |
| `orchestrator/site_info_values.py` | manifest+script-call+test-import | site_info_values: put the draft's own business details in place of the `{{ name }}` bindings that carry them. |
| `orchestrator/stage1_boundary_hook.py` | manifest+script-call+skill+test-import | - Spec 31 Phase 5c.4 Stage 1 BOUNDARY hook. |
| `orchestrator/staged_merge.py` | manifest+script-call+skill | - Spec 31 Phase 5e.3 staged-merge orchestrator. |
| `orchestrator/staged_output.py` | manifest+script-call+skill | - Spec 31 Phase 5b.1 staged-output dir convention. |
| `orchestrator/surface_pipeline_logs.py` | manifest+script-call | Surface structured per-severity logs from trace.jsonl at pipeline end. |
| `orchestrator/test_atomic_block_scaffold.py` | — | Spec 31 Phase 5b.8 self-test for atomic-block-scaffold.py. |
| `orchestrator/test_attribute_staged_apply.py` | — | Spec 31 Phase 5b.6 self-test for attribute-staged-apply.py. |
| `orchestrator/test_autonomy_gate.py` | — | Spec 31 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7 self-test for autonomy_gate.py. |
| `orchestrator/test_check_no_mirror_baseline.py` | — | pytest suite for the --baseline / --update-baseline |
| `orchestrator/test_critical_fix_verification.py` | — | Spec 31 Phase 5f.1 self-test for critical-fix-verification.py. |
| `orchestrator/test_css_router.py` | — | Unit tests for css_router.py — Spec 16 §FR6 four-destination router. |
| `orchestrator/test_draft_server.py` | — | Stage 11.6 draft-server helper (D1116): a DSL draft is detected by content, served over |
| `orchestrator/test_functionality_bulk_apply.py` | — | Spec 31 Phase 5b.7 self-test for functionality-bulk-apply.py. |
| `orchestrator/test_js_content_resolver.py` | — | JS-array-sourced repeated content (Spec 31 FR-31-26; multi-field items and default-on in plan step A2b, D1134). |
| `orchestrator/test_lingua_franca.py` | — | Spec 31 Phase 5c.2 + 5c.3 self-test for lingua_franca.py. |
| `orchestrator/test_manifest_annotation.py` | — | manifest_annotation: a draft's `data-sgs-manifest` block proposals become SGS-BEM classes on the run copy. |
| `orchestrator/test_manifest_box_header.py` | — | manifest_annotation: the box owner climb, the header field ladder, the per-review rating and the avatar colour |
| `orchestrator/test_manifest_decisions_log.py` | — | Tests for manifest_decisions_log.py (Spec 31 FR-31-31 write-back to Spec 44's log). |
| `orchestrator/test_manifest_layout_choices.py` | — | manifest_layout_choices: layout choices read from the draft's structure (design 2026-09-23-google-reviews-baseline-and-slider-nav |
| `orchestrator/test_manifest_reviews_header.py` | — | manifest_annotation: the redesigned reviews header (design 2026-09-21-google-reviews-block-design.md section 5, R3). |
| `orchestrator/test_media_rewrite.py` | — | Group A (2026-09-21): closing the media loop. |
| `orchestrator/test_media_sideload.py` | — | Spec 31 Phase 5b.5 self-test for media-sideload.py. |
| `orchestrator/test_media_stage_4i.py` | — | Group A (2026-09-21): structural guards on the Stage 4i wiring in sgs-clone-orchestrator.py. |
| `orchestrator/test_mutex.py` | — | Spec 31 Phase 5b.4 self-test for mutex.py. |
| `orchestrator/test_orchestrator_main.py` | — | Spec 31 Phase 5e.8 self-test for orchestrator_main.py. |
| `orchestrator/test_preflight_chain.py` | — | Spec 31 Phase 5e.1 + 5e.2 self-test for preflight_chain.py. |
| `orchestrator/test_register_patterns.py` | — | Spec 31 Phase 6 Step 0 -- register_patterns.py contract tests. |
| `orchestrator/test_stage1_boundary_hook.py` | — | Spec 31 Phase 5c.4 self-test for stage1_boundary_hook. |
| `orchestrator/test_staged_merge.py` | — | Spec 31 Phase 5e.3 self-test for staged_merge.py. |
| `orchestrator/test_staged_output.py` | — | Spec 31 Phase 5b.1 self-test for staged_output.py. |
| `orchestrator/test_validate_stage_artifact.py` | — | Spec 31 Phase 5b.2 self-test for validate-stage-artifact.py. |
| `orchestrator/test_wp_integration.py` | — | Spec 31 Phase 5d.7 + 5d.9 + 5d.10 self-test for wp_integration.py. |
| `orchestrator/trace.py` | manifest+script-call | - Structured trace-logger for /sgs-clone pipeline runs. |
| `orchestrator/upload_and_patch.py` | manifest+script-call+skill+test-import | One-shot: upload all mockup images to sandybrown WP Media Library + |
| `orchestrator/validate-stage-artifact.py` | manifest+script-call+skill | - Spec 31 Phase 5b.2 per-stage validator. |
| `orchestrator/visual_qa_capture.py` | manifest+script-call | - Stage 8 autonomy-gate capture stub. |
| `orchestrator/wp_integration.py` | manifest+script-call+skill | - Spec 31 Phase 5d.7 + 5d.9 + 5d.10. |
| `parity/computed-parity.js` | manifest+script-call+skill | Spec 20 v1.1.0 (Clone Fidelity Measurement). The number tracks VISIBLE fidelity and PAIRS with Bean's eye — it never closes alone (Spec 31 §7b /… |
| `parity/draft-vs-live/side_by_side.py` | manifest | Put draft and live captures next to each other so they can be LOOKED at (method step 6, README.md). |
| `parity/extract-css-diff.js` | manifest+script-call | THE STANDARD first step for matching a clone section to its reference |
| `pattern-classify.py` | manifest+script-call+skill | SGS Pattern Classifier |
| `pattern-fingerprint.py` | manifest+script-call+skill | Compute a deterministic fingerprint for an HTML pattern + CSS bundle. |
| `pattern-register.py` | manifest+script-call+skill | Pattern registration orchestrator — Step 6 of /sgs-clone pipeline. 2026-05-06. |
| `perf/measure-frame-cost.mjs` | manifest | Q6 (generative-background engine) — what does a frame of the WebGL folded-ribbon layer actually cost? |
| `placement-reach.py` | manifest+npm+script-call | how far does THE PLACEMENT RULE actually reach? |
| `playwright-fetch.js` | manifest+script-call | Usage: node playwright-fetch.js <url> Writes the fully-rendered HTML to stdout. Used by sgs-update-v2.py Stage 2 Source 4 as a fallback when urllib… |
| `preflight-acceptance.php` | — | SGS Preflight Acceptance Test — FR-27-PREFLIGHT / SEC-5 Empirical Gate |
| `probes/build-noJS-autoplay-fixture.py` | manifest+script-call | Create (or verify) the canary page for owed-debt item 3 |
| `probes/build-smil-bypass-fixture.py` | manifest+script-call | Create the canary page carrying the REAL-PATH SMIL bypass payload for |
| `probes/extend-page-3145-video-svg.py` | manifest+script-call | Extend canary page 3145 (`[GATE - DO NOT DELETE] media atom object-fit |
| `probes/probe-media-object-fit-video-svg.mjs` | manifest | (.claude/prompts/2026-09-01-media-owed-debts.md): video and SVG object-fit were reasoned from the census and the deleted style.css selector, never… |
| `probes/probe-noJS-autoplay.mjs` | manifest | (.claude/prompts/2026-09-01-media-owed-debts.md): the video-behaviour atom coupling (VideoAutoplay -> [VideoMuted, VideoPlaysInline]) was verified at… |
| `probes/probe-smil-bypass.mjs` | manifest+script-call | (.claude/prompts/2026-09-01-media-owed-debts.md): the SMIL bypass |
| `product-search-leak-check.php` | manifest+script-call | SGS Product Search — Behavioural Leak Test (FR-30-5 Named Enforcement Runner). |
| `programme-progress.py` | manifest+npm+script-call | burn-down reporter for the tier-object migration programme. |
| `promote-icon.py` | manifest+script-call | human promote / reject step for SGS icon proposals. |
| `prove-selftest-can-fail.py` | manifest+script-call | Prove a detector's --self-test is LOAD-BEARING, not decorative. |
| `provision-site-mail.py` | manifest+script-call | : give a client site working SMTP email through FluentSMTP. |
| `push-theme-snapshot.py` | manifest+script-call+test-import | Deploy a per-client theme.json snapshot to a WP site. |
| `qa/assert-css-effect.js` | manifest+script-call | BACKGROUND. fix.js's own 15-assertion self-test (--self-test) is entirely edit-correctness: was the row planned fixable, does DRY RUN write nothing… |
| `qa/capture-native-colour-ui.js` | manifest | Visual verification for the native-colour-ui migration (16 blocks). |
| `qa/capture-ncui-final3.js` | manifest | The last 3 native-colour-ui blocks — the ones page-content probing could not reach. |
| `qa/capture-ncui-remainder.js` | manifest | Visual capture for the 9 native-colour-ui blocks NOT covered by reports/visual-diff/native-colour-ui-2026-08-22.md. |
| `qa/capture-ncui-templateparts.js` | manifest | The final 2 native-colour-ui blocks, verified IN THEIR REAL CONTEXT. |
| `qa/check-border-roundtrip.js` | manifest+script-call | Border round-trip probe — does the FRONTEND actually paint the border the block's `borderWidth` / `borderStyle` / `borderColour` attributes describe? |
| `qa/check-box-alignment-editor.js` | manifest | Editor pass for the logical box-alignment migration (icon, media, separator, nav-drawer, tabs) and the lens flow's note-link source. |
| `qa/check-box-corners-blocks-live.mjs` | manifest | CR6 P2-a live check across the corner-radius patterns: a radius set on every corner at desktop, then on ONE corner at tablet and ONE other corner at… |
| `qa/check-box-longhands-blocks-live.mjs` | manifest | CR6 U8 live check across migrated blocks: a padding box that sets three sides on desktop and only the top on tablet keeps the desktop sides at tablet… |
| `qa/check-box-longhands-live.mjs` | manifest | CR6 live check: padding set on one side, or a radius set on one corner, of one tier changes only that side or corner, on the front end AND in the… |
| `qa/check-box-var-holdouts-live.mjs` | manifest | CR6 P2-b live check across the former var() holdouts: each box is set on every side or corner at desktop, then on ONE side or corner at tablet and… |
| `qa/check-colour-editor-roundtrip.js` | manifest+script-call | QA Gate C — the EDITOR half. |
| `qa/check-colour-gradient-roundtrip.js` | manifest | Text-colour gradient round-trip probe — does the FRONTEND actually paint a `background-clip:text` gradient when a `{attr}Gradient` sibling is set… |
| `qa/fr30-15-alerts-live-proof.php` | — | FR-30-15 live proof: saved-item alerts and the Notify me sender, on a real site (unified-email plan phase 3 — the emails now go through the… |
| `qa/lib/google-reviews-settings-stub.php` | script-call | Thin stand-in for SGS\Blocks\Google_Reviews_Settings |
| `qa/lib/live-colour-probe.php` | script-call | WP-CLI probe for check-custom-colour-survives.py --live: renders each job's block through the real render_block() on a live site and prints the… |
| `qa/lib/render-css-harness.php` | manifest+script-call | Standalone render.php executor for CSS-effect assertions |
| `qa/lib/sgs-is-frontend-render-stub.php` | script-call | Reproduces SGS\Blocks\sgs_is_frontend_render() (class-sgs-css-registry.php) verbatim, for plugins/sgs-blocks/src/blocks/business-info/render.php. |
| `qa/lib/wp-stubs.php` | manifest+script-call | Minimal WordPress core function/class stubs for standalone render.php execution (scripts/qa/lib/render-css-harness.php). |
| `qa/probe-native-colour-ui-close.js` | manifest | intent_capture probe for the native-colour-ui class closure (2026-08-23). |
| `qa/probe-row-gradient.js` | manifest | Set an attribute on every instance of one block inside a header/footer CPT, measure the live paint, and restore. |
| `qa/verify-brand-logo.mjs` | manifest | S9 verification — brand logos instead of typed brand names. |
| `recogniser/__init__.py` | manifest+script-call+test-import | SGS clone-pipeline recogniser modules. |
| `recogniser/array_schema_eliminator.py` | manifest+script-call | Stage B recognition for a repeated, classless draft group — Spec 44 §5. |
| `recogniser/attribute-gap-writer.py` | manifest+script-call+skill | - Spec 31 Phase 5a.4 attribute-gap writes. |
| `recogniser/bucket-c-classifier.py` | manifest+script-call+skill | - Spec 31 Phase 5a.2 (FR10). |
| `recogniser/classless_draft_adapter.py` | manifest+script-call | Draft-side input adapter for Spec 44's Stage A / Stage B — the missing half. |
| `recogniser/classless_field_resolver.py` | manifest+script-call | - Spec 45 field-mapping resolver, Tiers 1-3. |
| `recogniser/classless_trust_gate.py` | manifest+script-call | FR-44-1's trust gate, §7's audit log, and the end-of-run summary — Spec 44 Task 4. |
| `recogniser/confidence-matrix.py` | manifest+script-call+skill | - Stage 2 of /sgs-clone pipeline. |
| `recogniser/dom_shape_classifier.py` | manifest+script-call | - Q1 Tier 2 DOM-shape heuristic classifier. |
| `recogniser/functionality-gap-detector.py` | manifest+script-call+skill | - Spec 31 Phase 5a.3 (FR8 functionality leg). |
| `recogniser/gap-review-report.py` | manifest+script-call+skill | - Spec 31 Phase 5a.5 operator-review surface. |
| `recogniser/leftover-bucket-router.py` | manifest+script-call+skill | - Stage 9 leftover routing. |
| `recogniser/per-section-convention-voter.py` | manifest+script-call+skill+test-import | - Stage 1 of /sgs-clone pipeline. |
| `recogniser/render_repeater_recogniser.py` | manifest+script-call | Stage A recognition for a repeated, classless draft group — Spec 44 §3.1/§4.1/§4.3/§4.4. |
| `recogniser/render_repeater_seeder.py` | manifest+script-call | Seed `block_render_repeaters` — Spec 44 §4.2/§4.3 Steps 1-2 (2026-09-17). |
| `recogniser/sc_var_classifier.py` | manifest+script-call | - Claude Design `sc-for` variable-name classifier. |
| `recogniser/sc_var_haiku_batch.py` | manifest+script-call | - Piece 1's Tier B: one Haiku call per DRAFT. |
| `recogniser/sc_var_responsive_correlator.py` | manifest+script-call | - joins Piece 1 identity to Piece 2 values. |
| `recogniser/simple_html_review_report.py` | manifest+script-call+skill | - Stage 9 operator-review HTML render. |
| `recogniser/test_array_schema_eliminator.py` | — | Self-test for array_schema_eliminator.py — Spec 44 §5, §5.2, §5.3, §10. |
| `recogniser/test_attribute_gap_writer.py` | — | Spec 31 Phase 5a.4 self-test for attribute-gap-writer.py. |
| `recogniser/test_auto_detect_class_section_boundary.py` | — | Self-test for per-section-convention-voter.py::auto_detect_sections -- |
| `recogniser/test_bucket_c_classifier.py` | — | Spec 31 Phase 5a.2 self-test for bucket-c-classifier.py. |
| `recogniser/test_classless_draft_adapter.py` | — | Self-test for classless_draft_adapter.py — Spec 44's DRAFT-side input derivation. |
| `recogniser/test_classless_field_resolver.py` | — | Self-test for classless_field_resolver.py (Spec 45 Tiers 1-3). |
| `recogniser/test_classless_trust_gate.py` | — | Self-test for classless_trust_gate.py — Spec 44 FR-44-1, §7, §9, §10. |
| `recogniser/test_confidence_threshold.py` | — | - Verify Stage 2 confidence threshold enforcement. |
| `recogniser/test_dom_shape_classifier.py` | — | Self-test for dom_shape_classifier.py -- Q1 Tier 2 (BEM-recognition brainstorm doc). |
| `recogniser/test_dom_shape_hint_wiring.py` | — | Self-test for per-section-convention-voter.py's dom_shape_hint wiring |
| `recogniser/test_functionality_gap_detector.py` | — | Spec 31 Phase 5a.3 self-test for functionality-gap-detector.py. |
| `recogniser/test_gap_review_report.py` | — | Spec 31 Phase 5a.5 self-test for gap-review-report.py. |
| `recogniser/test_leftover_bucket_router.py` | — | Spec 31 Phase 5a.1 self-test for leftover-bucket-router.py. |
| `recogniser/test_per_section_convention_voter.py` | — | Self-test for per-section-convention-voter.py — covers vote_block_slug. |
| `recogniser/test_render_repeater_recogniser.py` | — | Self-test for render_repeater_recogniser.py — Spec 44 §3.1/§4.1/§4.3, §10. |
| `recogniser/test_render_repeater_seeder.py` | — | Self-test for render_repeater_seeder.py — Spec 44 §4.2/§4.3, §10. |
| `recogniser/test_sc_var_classifier.py` | — | Self-test for sc_var_classifier.py (universal-pipeline upgrade, Piece 1). |
| `recogniser/test_sc_var_hint_wiring.py` | — | Self-test for per-section-convention-voter.py's sc_var_hint wiring + |
| `recogniser/test_sc_var_responsive_correlator.py` | — | - integration coverage for the |
| `recogniser/test_source_builder_detection.py` | — | Self-test for per-section-convention-voter.py's detect_source_builder() |
| `redirect-native-spacing-reads.py` | manifest+script-call | - the edit.js/render.php half of |
| `remove-dead-flat-spacing-destructure.py` | manifest | one-shot cleanup for the Group 1 |
| `remove-vacuous-style-engine-guard.py` | manifest+npm | Delete the vacuous `function_exists( 'wp_style_engine_get_styles' )` guard. |
| `row-fit-sweep.mjs` | manifest | row-fit-sweep — reusable Playwright width-sweep verification harness. |
| `run-gates.py` | commit-gate+manifest+npm+script-call+test-import | the consolidated gate runner. |
| `run-motion-fx-generators.js` | manifest+npm+script-call | motion-fx generator chain (seed-motion-fx-registry.py, generate-fx-effects-php.py, generate-fx-qualifying-blocks.py). |
| `scan-component-adoption.js` | manifest+script-call | WHY THIS EXISTS |
| `scrim/check-scrim.py` | manifest | the viewport-scrim detector (Wave 3C U-2, family M-14). |
| `seed-48-sku-fixture-v2.php` | — | SGS 48-SKU Fixture — v2 ADDITIVE presentation-meta seeder (Spec 27 Phase 2). |
| `seed-48-sku-fixture.php` | script-call | SGS 48-SKU WooCommerce Fixture — Developer Script |
| `seed-component-adoption.py` | manifest+script-call | write the unification ADOPTION LEDGER to `components`. |
| `seed-composition-roles.py` | manifest+script-call | idempotent corrections to block_composition.composition_role. |
| `seed-motion-fx-registry.py` | manifest+script-call | idempotent editorial seeder for the Spec 38 motion system. |
| `seed-render-composition.py` | manifest+script-call | write `block_render_composition` (Spec 31 §13.9). |
| `seed-render-singletons.py` | manifest+script-call | write `block_render_singletons` (Spec 31 §13.10). |
| `sgs-clone-orchestrator.py` | commit-gate+manifest+script-call+settings+skill+test-import | sgs-clone orchestrator (Phase 7 rewire). |
| `sgs-update-v2.py` | manifest+script-call+test-import | 13-stage holistic refresh of the SGS framework knowledge base. |
| `shadow-fallback/run.js` | manifest+npm+script-call+skill+test-import | Forced-colours shadow fallback for static stylesheets: census, fix and gate in one script. |
| `shadow-fallback/transform.js` | manifest+script-call+skill+test-import | Forced-colours shadow fallback for STATIC stylesheets (Wave 3C U-1 commit 4f-1). |
| `shadow-lift/fixtures.js` | manifest+script-call+test-import | Self-test fixtures for scripts/shadow-lift — one CSS input + an assertion function per case. run.js's `--self-test` drives these; kept in their own… |
| `shadow-lift/run.js` | manifest+npm+script-call+skill+test-import | Shadow lift on hover for static stylesheets: census, fix and gate in one script, mirroring scripts/shadow-fallback/run.js's shape (design H4… |
| `shadow-lift/transform.js` | manifest+script-call+skill+test-import | Shadow lift on hover for STATIC stylesheets (design H4, stylesheet part — `.claude/reports/2026-09-23-shadow-hover-lift-design.md`). |
| `shared_utils.py` | manifest+script-call+test-import | Shared, zero-dependency utilities for the SGS clone scripts. |
| `stage8-audit.js` | manifest+npm+script-call | ONE Lighthouse run. ⚠ **header disputes this — it IS wired** |
| `strip-dead-radius-legacy-args.py` | manifest | Strip the provably-dead legacy tier args from sgs_border_radius_tiers() calls. |
| `strip-dead-radius-tier-stanzas.py` | manifest | Delete the DEAD duplicate border-radius tier stanzas from render.php. |
| `survey-border-control-migration.py` | manifest+npm+script-call | Classify every block's border UI against the SgsBorderControl target shape. |
| `survey-flex-row-shape.py` | manifest+script-call | Classify every authored sgs/container flex ROW by what it is actually doing. |
| `survey-icon-oldshape.py` | manifest | find stored blocks that still carry the pre-rebuild icon shapes. |
| `surveys/audit-css-element-drift.py` | manifest | Audit `block_attributes.css_element` against each block's own element manifest. |
| `surveys/census-media-control-instances.py` | manifest | Every CONTROL INSTANCE in the library, for every media-atom attribute. |
| `surveys/census-media-presentation.py` | manifest+npm | Census extension — the PRESENTATION half of the media-element manifest. |
| `surveys/census-tier-siblings.sh` | manifest | Re-runnable census of per-device tier-sibling attribute instances |
| `surveys/check-control-parity-live.js` | manifest | property, against a native control on the same page. |
| `surveys/check-image-controls-support.py` | manifest+npm+script-call | Standing defence for the `imageControls` "declared-but-unverified capability" |
| `surveys/compare-reach-depth.py` | manifest+script-call | Does resolution DEPTH change the answer? Measure, do not assume. |
| `surveys/extract-native-contracts.py` | manifest | Extract the REQUIRED props (and the __next* opt-ins) from Gutenberg's own |
| `surveys/fetch-native-control-contracts.sh` | manifest+script-call | Fetch the CANONICAL prop contract for each WordPress core control primitive straight from the Gutenberg source, so a golden describes the real… |
| `surveys/lib/control-detection.js` | manifest+script-call | Answers ONE question per (block, attribute): **can a client set this?** |
| `surveys/lib/php-kind-consumption.js` | manifest+script-call | BRANCH-AWARE CONSUMPTION ANALYSER for the shared container wrapper. |
| `surveys/lib/primitive-alias-imports.js` | manifest+script-call | PROBLEM THIS EXISTS FOR |
| `surveys/lib/wrapper-capability-selftest.js` | manifest+script-call | Self-test for the wrapper-capability census. |
| `surveys/survey-background-colour-support.py` | manifest+npm+script-call | Track A completion audit — native colour/gradient background support. |
| `surveys/survey-box-controls.py` | manifest+npm | "--survey" census of the BOX (4-side) and BORDER |
| `surveys/survey-colour-controls.py` | manifest+npm+script-call | Phase 0.0 "--survey" census of the COLOUR property |
| `surveys/survey-colour-coverage.py` | manifest+npm | census of which PAINTED colours across sgs/ blocks ⚠ **header disputes this — it IS wired** |
| `surveys/survey-control-gaps.py` | manifest+npm | the SHOULD-BE census: a control weaker than its value. |
| `surveys/survey-control-mounts.py` | manifest+npm+script-call | Re-measure every control-population figure Spec 35 Part O asserts. |
| `surveys/survey-control-parity.py` | manifest+npm+script-call | do SGS inspector controls look like NATIVE WordPress? |
| `surveys/survey-dead-css.py` | manifest+npm | the DEAD-CSS census: a selector whose precondition the |
| `surveys/survey-enum-control-shape.py` | manifest+script-call | Every declared block.json enum, its option count, and the control shape rendering it. |
| `surveys/survey-experimental-imports.js` | manifest+npm+script-call | ONE DETECTOR, THREE MODES (D542, Bean-locked): |
| `surveys/survey-extension-usage.py` | manifest | Phase 2.1 usage derivation — the prerequisite before inverting a universal |
| `surveys/survey-golden-conformance.js` | manifest+npm+script-call | WHAT THIS IS FOR. `golden-controls.json` states what shape a control must have. Rule 31 enforces the colour contract and reports 409 findings.… |
| `surveys/survey-inspector-surface.js` | manifest+npm | inspector surface across all 83 sgs/ blocks, per D543/D544. |
| `surveys/survey-length-controls.py` | manifest+npm+script-call | Phase 0.0 "--survey" census of the LENGTH property |
| `surveys/survey-media-elements.py` | manifest | Wave 1 census for the unified media element. |
| `surveys/survey-native-supports.py` | manifest+npm+script-call | Phase 2.2 census — native WordPress `supports` capability routing. |
| `surveys/survey-responsive-shape.py` | manifest+npm+script-call | the responsive STORAGE-SHAPE census. |
| `surveys/survey-typography-controls.py` | manifest+npm | Phase 0.0 "--survey" census of the TYPOGRAPHY |
| `surveys/survey-wrapper-capability.js` | manifest+script-call | PHASE 0 CENSUS for the shared-wrapper decomposition. |
| `sync-business-info.py` | manifest+script-call+test-import | Tier-1 business-data extractor + pusher (D325, Spec 33 FR-33-14). |
| `sync-container-wrapping-blocks.py` | manifest+script-call | Detects every SGS block that is container-bearing (wraps children via InnerBlocks, |
| `sync-snapshot-shadow-presets.py` | manifest | Every client theme snapshot carries the framework's shadow presets, shadow colour and hover map. |
| `test-hover-state-guard.php` | manifest+test-import | Gate: the touch-safe hover emitter emits the shape it claims to. |
| `test-pack-pricing-cascade.php` | — | Standalone cascade-resolver test runner for Spec 28 P3 (FR-28-6). |
| `test_render_singleton_seeder.py` | — | Self-test for seed-render-singletons.py — Spec 31 §13.10. |
| `theme-extractor/colour.py` | manifest+script-call+skill | colour parsing + CIEDE2000 dedup for the Spec 33 extractor. |
| `theme-extractor/declared_layout.py` | manifest+script-call | Spec 33 declared layout and shape: the README's content width and corner radius as theme settings. |
| `theme-extractor/declared_reconcile.py` | manifest+script-call | Spec 33 declared design checked against the RENDERED page (FR-33-1: computed wins). |
| `theme-extractor/declared_sources.py` | manifest+script-call | Spec 33 declared-source readers: the design system a draft states outright. |
| `theme-extractor/derive.py` | manifest+script-call | Pass B: PROVISIONAL palette derivation for drafts that declare NO :root tokens (FR-33-5). |
| `theme-extractor/extract.py` | manifest+script-call+skill+test-import | the Spec 33 draft global-styles extractor (CLI orchestrator). |
| `theme-extractor/font-usage.js` | manifest+script-call | FONT_USAGE_SRC is serialised into the browser context by measure.js, so it must not close over anything in Node scope. |
| `theme-extractor/font_weights.py` | manifest+script-call | weight evidence for the Google fonts the extractor self-hosts (Spec 33). |
| `theme-extractor/heading_weight.py` | manifest+script-call | Heading font weight from measurement (Spec 33, declared-design path only). |
| `theme-extractor/layout-census.js` | manifest+script-call | LAYOUT_CENSUS_SRC is serialised into the browser context by measure.js, so it must not close over anything in Node scope. measure.js runs it once per… |
| `theme-extractor/measure-node.js` | manifest+script-call | read). Nothing here runs in the browser except HOVER_READ_SRC, which is serialised into the page and therefore must not close over anything. |
| `theme-extractor/measure.js` | manifest+script-call | THE IRON LAW (Spec 33 FR-33-1/33-3): the value the extractor ships is always the COMPUTED value on a really-rendered node — never a raw source… |
| `theme-extractor/palette.py` | manifest+script-call+test-import | build the theme colour palette from draft tokens (Spec 33 FR-33-1/2/9). |
| `theme-extractor/palette_refs.py` | manifest+script-call | Spec 33: route palette colours into buttons and the page base. |
| `theme-extractor/palette_vocab.py` | manifest+script-call | Spec 33 declared-design vocabulary: every role word and threshold as DATA, in one place. |
| `theme-extractor/presets.py` | manifest+script-call | button presets, layout, and font families for the Spec 33 extractor. |
| `theme-extractor/roles.py` | manifest+script-call+test-import | colour ROLE inference by usage-context (Spec 33 FR-33-2). |
| `theme-extractor/schema_validate.py` | manifest+script-call | theme.json v3 structural validation (Spec 33 FR-33-7). |
| `theme-extractor/site_palette.py` | manifest+script-call | Spec 33 declared-design overlay: a per-site palette built from what a draft DECLARES. |
| `theme-extractor/token_map.py` | manifest+script-call | declared-CSS parsing for the Spec 33 extractor (tinycss2, not regex). |
| `theme-extractor/typography.py` | manifest+script-call+test-import | base + heading typography from COMPUTED nodes (Spec 33 FR-33-3, the drift-killer). |
| `theme-extractor/usage_census.py` | manifest+script-call | Colour usage census for a draft's HTML and JavaScript. |
| `theme-extractor/usage_js.py` | manifest+script-call | Quote-aware bracket structure of a draft's script, for the colour census' JS-bound scan. |
| `theme-extractor/usage_roles.py` | manifest+script-call | Spec 33 usage-proposed fallback roles: neutral palette slots a README's wording did not fill. |
| `theme-extractor/used_fonts.py` | manifest+script-call | FR-33-18: every font family a draft LOADS and actually RENDERS becomes a |
| `theme-extractor/used_layout.py` | manifest+script-call | FR-33-19: the site's content width and wide width, read from the draft's RENDERED layout. |
| `theme-extractor/variant_sets.py` | manifest+script-call | Spec 33 script variant sets: switchable brand colour sets a draft holds in its own script. |
| `tls_urlopen.py` | manifest+script-call | open an HTTPS request against a live SGS site with a trust-store fallback. |
| `toolindex/build_index.py` | script-call | extracts a searchable purpose index from every script in |
| `toolindex/query.py` | manifest+script-call+skill | free-text search over the tool index built by build_index.py. |
| `uimax-tools/enrich-db.py` | manifest+script-call | SGS Framework DB Enrichment — 10 targets in one idempotent pass. |
| `uimax-tools/seed-block-compositions.py` | manifest | Seed `patterns.block_composition` JSON column from theme pattern files. |
| `uimax-tools/seed-slot-synonyms.py` | manifest+script-call | Seed sgs-framework.db `slots` table with BEM element → standalone_block mappings |
| `uimax-tools/sgs-update-uimax-sync.py` | manifest+script-call | sgs-update Stage 3 + Stage 4 — uimax sync extension. |
| `uimax-tools/test_uimax_write_validator.py` | — | Tests for uimax-write-validator.py — Rosetta Stone discipline (Row 213) only. |
| `uimax-tools/uimax-write-validator.py` | manifest+script-call+skill | Pre-write validator for uimax tables. |
| `uimax-tools/uimax_write.py` | manifest+script-call+skill | Validate-then-write helper for uimax tables. |
| `value-matcher/inheritance.py` | manifest+script-call+test-import | Default-inheritance lookup module. |
| `value-matcher/match.py` | manifest+script-call+test-import | Token value-matcher for the SGS Deterministic Draft-to-SGS Converter pipeline. |
| `variant-value-extractor/extract-variation-values.js` | manifest+script-call | each variation's `attributes` object as PLAIN JSON to stdout. |
| `verify-toast.mjs` | manifest | Verify the one shared "Added to bag" toast on a live site. |
| `visual-report-sha.py` | manifest+script-call | Content hash binding a visual-diff report to the change it actually describes. |
| `wiring-fingerprint/editor_facts.js` | manifest+script-call | Editor-side facts for the wiring-fingerprint gate (read-only). |
| `wiring-fingerprint/editor_facts_resolve.js` | manifest+script-call | Module resolution for editor_facts.js: parsing (cached), each file's exports, relative import specifiers, barrel re-exports followed to the declaring… |
| `wiring-fingerprint/wf_acceptance.py` | manifest | Acceptance measurements for the wiring-fingerprint gate (Task 2 of |
| `wiring-fingerprint/wf_baseline.py` | manifest+script-call | Ratchet baseline (Bean's decision D2, 2026-10-04): the gate blocks NEW gaps |
| `wiring-fingerprint/wf_bugs.py` | manifest+script-call | Bug-class rules and the selector-shaped links. |
| `wiring-fingerprint/wf_channel.py` | manifest+script-call | Front-end value flow (links L4 and L5, and the tokens L6/L7/C1/B3 read). |
| `wiring-fingerprint/wf_cli.py` | manifest+script-call | Command line for check-wiring-fingerprint.py. |
| `wiring-fingerprint/wf_css.py` | manifest+script-call | CSS consumer index (link L6 and the editor.css shadowing rule S1). |
| `wiring-fingerprint/wf_editor.py` | manifest+script-call | Editor model: links L2 (control) and L3 (editor canvas) from the collected |
| `wiring-fingerprint/wf_extensions.py` | manifest+script-call | Extension attributes from the roster (`src/blocks/extensions/extension-roster.json`, |
| `wiring-fingerprint/wf_frontend.py` | manifest+script-call | Front-end model per block: the PHP texts a block's render reaches, the |
| `wiring-fingerprint/wf_inputs.py` | manifest+script-call | Gate inputs: the framework DB (read-only), block.json files, the extension |
| `wiring-fingerprint/wf_links.py` | manifest+script-call | The wiring links one painting attribute must show (a finding is |
| `wiring-fingerprint/wf_media.py` | manifest+script-call | Media-atom read sites (blind spot: media atoms build their attribute keys). |
| `wiring-fingerprint/wf_paint.py` | manifest+script-call | Population: does an attribute paint, and through which category? |
| `wiring-fingerprint/wf_pass.py` | manifest+script-call | The front-end pass: for every block, the PHP texts its render reaches, the |
| `wiring-fingerprint/wf_paths.py` | manifest+script-call | Path resolution for the wiring-fingerprint gate. |
| `wiring-fingerprint/wf_php.py` | manifest+script-call | PHP source model: comment stripping, statement bounds, literal and variable |
| `wiring-fingerprint/wf_resolve.py` | manifest+script-call | Each attribute's final channel and paint category, as the scan uses them. |
| `wiring-fingerprint/wf_returns.py` | manifest+script-call | Keyed call returns (used by wf_channel.ChannelAnalyser.flow). |
| `wiring-fingerprint/wf_scan.py` | manifest+script-call | The scan: every SGS block attribute (DB `source='sgs'`) through the paint |
| `wiring-fingerprint/wf_tokens.py` | manifest+script-call | Channel tokens: what one PHP statement emits. |
| `wp-pre-merge-gate.py` | manifest | Pre-merge validation gate for SGS WordPress plugin changes. |

#### `scripts/` — 118 scripts

| Script | Wired | Purpose (its own words) |
|---|---|---|
| `apply-block-attrs-batch.js` | — | One-off companion to wp-update-block-attrs.js for the wholesale-food client's homepage attribute-mirror task (2026-07-16). Handles the case… |
| `brand-palette-sampler.py` | — |  |
| `check-focus-ring-token.py` | manifest+script-call | : every keyboard focus ring is drawn from the focus-ring token. |
| `check-no-client-names.py` | manifest+script-call | : keep client names and reference-site names out of the framework. |
| `colour-parity-audit.js` | — | Colour Parity Audit — automated comparison between mockup HTML brief and SGS variation JSON. |
| `computed-route/calibrate.mjs` | script-call | Block calibration command (FR-47-2). |
| `computed-route/confirm-canvas.mjs` | script-call | Live confirmation of lib/triage.mjs::canvasSettable's claims, BY FAMILY, read-only. |
| `computed-route/fill.mjs` | manifest+script-call+skill+test-import | Fill (FR-47-4): from a skeleton tree (which blocks, nested how, with the draft's words, each node naming the draft element it copies) to a tree… |
| `computed-route/ledger.mjs` | script-call+skill+test-import | Divergence ledger command (FR-47-5). |
| `computed-route/lib/cache.mjs` | manifest+script-call | The calibration cache (§3.2): one library-wide folder, one file per block, whichever site measured it. A block calibrated on one site is never… |
| `computed-route/lib/calibrate-chunk.mjs` | script-call | How calibration builds a block's page in pieces (FR-47-2): the child process that saves a calibration page, the size of each piece, and halving a… |
| `computed-route/lib/calibrate-container.mjs` | script-call | What a block's source says about how it renders, for calibration to act on before any browser opens (FR-47-2): whether its tiers follow its… |
| `computed-route/lib/calibrate-content.mjs` | script-call | The content side of calibration (FR-47-2, Spec 47 §3.2): which elements a setting makes appear or disappear |
| `computed-route/lib/calibrate-instances.mjs` | script-call | Which instances one block's calibration page holds (FR-47-2): a default per fixture variant, then one marked instance per setting and marker, each… |
| `computed-route/lib/calibrate-markers.mjs` | script-call | The marker values calibration writes into one setting (Spec 47 §3.2 marker table). Each marker: { label, attrs, expect: { width: value } \| null… |
| `computed-route/lib/calibrate-props.mjs` | script-call | What calibration reads and how a setting's css_property maps onto it (FR-47-2). |
| `computed-route/lib/calibrate-read.mjs` | script-call | The browser side of calibration: reads every element of each calibration instance at each width, at rest and under its state trigger. Element keys… |
| `computed-route/lib/calibrate.mjs` | script-call | Block calibration library (FR-47-2, R-47-6). Builds one calibration tree per block (a default instance plus one marked instance per setting and… |
| `computed-route/lib/calibration-lock.mjs` | script-call | One calibration per calibration page (R-47-11). Every run on a site builds its instances onto that site's one calibration page with the same instance… |
| `computed-route/lib/db.mjs` | manifest+script-call+skill+test-import | Read-only access to the framework database (R-47-2). Opened with node:sqlite in read-only mode, which refuses every write; the route never seeds… |
| `computed-route/lib/deploy-hash.mjs` | script-call | The deploy key calibration stamps on a cache: md5 of a block's front-end build files, locally and on the site, so a cache is used only while the… |
| `computed-route/lib/draft.mjs` | manifest+script-call+skill+test-import | Serves a draft that exists only as local files (Fill step 1, FR-47-4): a static server on 127.0.0.1 at an ephemeral port, so the browser reads the… |
| `computed-route/lib/entrance.mjs` | manifest+script-call | Entrance start (Spec 38, sgsAnimationStart): a block with an entrance that the draft shows at rest while live still holds it hidden is one whose… |
| `computed-route/lib/fill-config.mjs` | script-call | The walker config Fill generates (FR-47-4 step 4): one pair per skeleton node that has a draftRef, drawn from the node's own ref class, with… |
| `computed-route/lib/fill-diagram.mjs` | — | Measure a rendered draft's dimension diagram into sgs/diagram-dimension settings (plan archive/2026-10-07-measured-diagram-block.md §C). R-47-4… |
| `computed-route/lib/fill-entrance.mjs` | script-call | Entrances for Fill (FR-47-4 "values that need care"): what a draft element does as it paints in, measured in a real browser, and the settings that… |
| `computed-route/lib/fill-handover.mjs` | script-call | The handover list (§3.3, shared with Solve): content a draft shows that no block setting could hold, because it lives outside the tree. Each entry… |
| `computed-route/lib/fill-page.mjs` | script-call | The page baseline for inherited properties (R-47-5). Calibration records no default for an inherited property |
| `computed-route/lib/fill-presence.mjs` | script-call | Presence and content for Fill (FR-47-4): which elements a block shows, and the draft's words and links, decided from calibration's `presence`, `text`… |
| `computed-route/lib/fill-prop.mjs` | script-call | One property of one element, from the draft's measured values to the setting writes (FR-47-4 step 2). Every write comes from lib/resolve.mjs::resolve… |
| `computed-route/lib/fill-read.mjs` | script-call | Reading the draft for Fill (FR-47-4 step 1): the draft rendered in a real browser, every target's computed styles read through the walker's own… |
| `computed-route/lib/fill-report.mjs` | script-call | Fill's report (FR-47-4 step 5): fill-report.md for a reader and fill-report.json for a tool. The UNMAPPED list is the framework work for the surface… |
| `computed-route/lib/fill-resolve.mjs` | script-call | Fill's root-down resolution (FR-47-4 steps 2 and 3): every node and slot of the skeleton, every property that differs from what the node already… |
| `computed-route/lib/fill-skeleton.mjs` | script-call | The Fill skeleton (FR-47-4): a normal block tree whose nodes also carry `draftRef` (the walker finder of the draft element the block copies) and… |
| `computed-route/lib/fill-spacing.mjs` | script-call | Spacing ownership (FR-47-4 step 3). Who owns the space between a parent's children is decided per tier from what rendered, never from the draft's… |
| `computed-route/lib/fill-values.mjs` | script-call | The values FR-47-4 says need care. Fluid sizes: sampled at five widths, linear within 0.5px means fluid, written as clamp() only where calibration… |
| `computed-route/lib/guard.mjs` | manifest+script-call | The regression guard (R-47-9): when a round makes rows worse, find the write that did it and revert only that. |
| `computed-route/lib/issue-classes.mjs` | script-call | The one definition of what counts as a distinct open issue, and under which class (Spec 47 §3.3, FR-47-3). |
| `computed-route/lib/ledger.mjs` | script-call+skill+test-import | Divergence ledger library (FR-47-5): the rules an entry may name, matching a row, finding stale entries, migrating walker accepts, and building a new… |
| `computed-route/lib/normalise.mjs` | script-call | Value normalisation and token snapping (R-47-7). Measured values arrive as computed styles (px lengths, rgb() colours). Tokens come from the site's… |
| `computed-route/lib/pair-scope.mjs` | script-call | Twin containment: whether a hand pair's two elements hold the same words (scripts/computed-route/pairs.mjs). |
| `computed-route/lib/pairs-page.mjs` | script-call | In-page collectors for scripts/computed-route/pairs.mjs (block pairing, plan .claude/plans/2026-10-04-spec47-full-coverage.md). |
| `computed-route/lib/pairs.mjs` | manifest+script-call | Block pairing for full coverage (plan .claude/plans/2026-10-04-spec47-full-coverage.md): every block of a surface is paired with its draft element… |
| `computed-route/lib/references.mjs` | script-call+skill | Blocks that render another post (Spec 47 §3.3, reference blocks), found by reading each block's render.php, never listed by hand, so a new block is… |
| `computed-route/lib/register-sweep.mjs` | script-call | Register <-> sweep (A4): gives every fix-register item exactly one sweep status. |
| `computed-route/lib/resolve.mjs` | manifest+script-call | The one property-to-setting engine (FR-47-1, R-47-3). Given a block, the rendered element (slot) a difference sits on, a CSS property, a state and… |
| `computed-route/lib/solve-groups.mjs` | script-call | Two readings of Solve's surviving rows, built from the rows and never replacing them (the per-width tables stay). |
| `computed-route/lib/solve-report.mjs` | script-call | Writes Solve's report (FR-47-3): solve-report.json (everything) and solve-report.md (counts per class, every write with its before and after values… |
| `computed-route/lib/solve-rows.mjs` | manifest+script-call | Solve's reading of a walker report (FR-47-3): which open rows it may write, the draft value at every width for each |
| `computed-route/lib/sweep.mjs` | manifest+script-call | The whole-site sweep (FR-47-3): every surface's latest Solve report as one row per distinct open issue. An issue is solve-report.mjs::wholePage's: a… |
| `computed-route/lib/tree.mjs` | script-call | Layout trees: read, write, ref classes, setting writes, and the live-site safety guard (R-47-11). |
| `computed-route/lib/triage-source.mjs` | script-call | Triage's source pass (B1), string search only (no PHP or CSS parsing): what a block's own render.php and style.css say about a row's property and… |
| `computed-route/lib/triage.mjs` | script-call | Triage (Spec 47, Session B1): one candidate class per distinct open issue of a Solve report, with the evidence that decided it. Classes: W (walker or… |
| `computed-route/lib/winning-rule.mjs` | script-call | Names the CSS rule that wins for a row whose setting already holds the draft value (Hardcode rows the tree holds): the rule that paints the live… |
| `computed-route/lint.mjs` | script-call | The route's own gate (R-47-1, R-47-10). |
| `computed-route/pairs.mjs` | manifest+script-call | Block pairing command (plan .claude/plans/2026-10-04-spec47-full-coverage.md). |
| `computed-route/register-sweep.mjs` | script-call | Register <-> sweep command (A4). |
| `computed-route/solve.mjs` | script-call | Solve (FR-47-3): compare a built surface with its draft, turn each open style or hover difference into a setting write through the resolver, rebuild… |
| `computed-route/sweep.mjs` | manifest+script-call | Sweep command: reads every surface's latest Solve report (`<buildDir>/qa/solve/<surface>/<timestamp>/solve-report.json`) and writes… |
| `computed-route/triage.mjs` | script-call | Triage command (Spec 47, Session B1): a candidate class (W, F, T, U) with its evidence for every distinct open issue of a surface's Solve report… |
| `css-pattern-audit.js` | — | CSS pattern audit — static analysis for risky patterns in deployed/built CSS. |
| `font-source-audit.js` | manifest+npm | Font source audit — static analysis for external CDN URLs in theme.json fontFace declarations. |
| `global-styles-reset.js` | skill | wp_global_styles reset + reapply. |
| `lib/close-browser-on-exit.js` | script-call | close-browser-on-exit — make sure a Playwright browser dies with the script that launched it. |
| `lib/oldshape-mappings.js` | script-call | wp-migrate-oldshape-blocks.js (Track B content restore, 2026-07-15). |
| `lib/wp-session.js` | script-call | wp-session — one logged-in Chrome shared by a run and every child script it starts. |
| `lint-naming-conventions.py` | manifest+test-import | CI linter for the SGS WordPress Framework naming conventions. |
| `lint-patterns-for-personal-data.py` | manifest+npm+test-import | Lint SGS pattern PHP files for hardcoded personal data. |
| `local-wp/sync-build.sh` | — | Copies the repo's built plugins and theme into the local WSL mirror sites. |
| `parity/benchmark/cases.mjs` | manifest+script-call | The walker's catch-rate benchmark: six optician-client gaps the walker passed and Bean found by eye |
| `parity/benchmark/score.mjs` | manifest+script-call+skill | Scores a catch-rate benchmark run from its recorded walker reports (<out>/<config>-control and <out>/case-<id>): benchmark.mjs calls it after the… |
| `parity/benchmark.mjs` | script-call+skill | The walker's catch-rate benchmark. For each page config it runs the walker once as a control |
| `parity/draft-live-walk.mjs` | manifest+script-call | Draft-versus-live parity walker. Drives the design draft and the live site through the same states (tabs, steps, open panels, filters, modals) at… |
| `parity/flows/bag-second-unit.mjs` | script-call | Flow 2: a second unit of the same product, within 20 seconds (register N11(b)). |
| `parity/flows/bag-two-products.mjs` | script-call | Flow 1: two different products in the bag (register N11(a)). |
| `parity/flows/filter-apply-clear.mjs` | script-call | Flow 3: choose a shop filter, then clear it (register N25's own test). |
| `parity/flows/lens-skip-to-bag.mjs` | script-call | Flow 4: the lens pop-up's "Skip the lenses" adds the frame straight to the bag (register N38). |
| `parity/flows/lib/bag.mjs` | script-call | The bag, read and judged independently of how the drawer renders (Spec 47 FR-47-7). |
| `parity/flows/lib/browser.mjs` | script-call | Playwright launch, base-URL resolution and env loading for the functional flows (Spec 47 FR-47-7). |
| `parity/flows/lib/filters.mjs` | manifest+script-call | The shop filter panel, probed and judged (Spec 47 FR-47-7; register N25). |
| `parity/flows/lib/flow.mjs` | script-call | The flow result shape, the per-flow JSON writer, the flows-only table and the shared command-line entry |
| `parity/flows/run-all.mjs` | script-call | Runs the four functional flows in order against one site (Spec 47 FR-47-7). |
| `parity/flows/toast-added-to-bag.mjs` | — | Flow 5: the shared "Added to bag" toast actually speaks on an add (register 18). |
| `parity/lib/auto-align.mjs` | script-call | Word and control alignment for the walker's automatic check (auto-compare.mjs). |
| `parity/lib/auto-collect.mjs` | script-call | In-page collector for the walker's automatic check (GAP-CHECKLIST.md section 12): every painted word and every control or media item on the page, so… |
| `parity/lib/auto-compare.mjs` | script-call | The walker's automatic check (GAP-CHECKLIST.md section 12): aligns every painted word of the draft with the live page's, then reports what no config… |
| `parity/lib/auto-walk.mjs` | script-call | Walker glue for the automatic check (GAP-CHECKLIST.md section 12): the scrolled state every page gets, the in-page collection (rooted at an open… |
| `parity/lib/chrome-compare.mjs` | script-call | Full-check comparisons for draft-live-walk.mjs (GAP-CHECKLIST.md section 11): painted ground and text inset, a root's inventory (text, order, media… |
| `parity/lib/chrome-walk.mjs` | script-call | Full-check glue for draft-live-walk.mjs: samples motion after each action, collects each pair's painted ground, text inset and (for `inventory: true`… |
| `parity/lib/chrome.mjs` | manifest+script-call | Full-check in-page collectors for draft-live-walk.mjs. Each is passed to page.evaluate(), so each is self-contained. GAP-CHECKLIST.md section 11 says… |
| `parity/lib/collect.mjs` | script-call | In-page collectors for draft-live-walk.mjs. Every function here is passed to page.evaluate(), so each one is self-contained (no closures over module… |
| `parity/lib/compare-state.mjs` | script-call | One state's comparison for draft-live-walk.mjs: every named pair, the drive log, the automatic check, load entrances and links, each difference… |
| `parity/lib/compare.mjs` | manifest+script-call | Compares one pair's draft and live snapshots and returns the differences. |
| `parity/lib/devtools.mjs` | script-call | What DevTools reads, through the Chrome DevTools Protocol, for draft-live-walk.mjs (Spec 47 A-1, GAP-CHECKLIST.md section 19): the page read once its… |
| `parity/lib/divergences.mjs` | script-call | Divergence ledger (GAP-CHECKLIST.md section 16, Spec 47 FR-47-5). A config may name a site's divergences.json |
| `parity/lib/entrances.mjs` | script-call | The load-entrance check for draft-live-walk.mjs (GAP-CHECKLIST.md section 15). What moves or fades in as a page loads, judged by what paints, not by… |
| `parity/lib/focus.mjs` | manifest+script-call+skill | The keyboard focus pass for draft-live-walk.mjs (GAP-CHECKLIST.md section 13). A scripted el.focus() after mouse clicks never matches :focus-visible… |
| `parity/lib/helpers.mjs` | script-call+skill | The helpers handed to a config's open() and state actions, and the anchor-offset check, for draft-live-walk.mjs. |
| `parity/lib/links.mjs` | manifest+script-call | The links check for draft-live-walk.mjs (GAP-CHECKLIST.md section 14). A design draft is often a one-page prototype whose links are "#" and whose… |
| `parity/lib/lint.mjs` | script-call | Config lint for draft-live-walk.mjs: runs before any browser opens and fails the run on a config that cannot prove what it claims (GAP-CHECKLIST.md… |
| `parity/lib/paint.mjs` | script-call | Where a pair's properties are painted, for draft-live-walk.mjs's in-page collectors: collect.mjs::collectPair and hoverStyles rebuild these from… |
| `parity/lib/ratio.mjs` | manifest+script-call+test-import | The computed forms of `aspect-ratio`: "auto", "16 / 9", "1.5" (one number is "n / 1") and "auto 16 / 9". |
| `parity/lib/ref-trace.mjs` | script-call | Ref tracing (GAP-CHECKLIST.md section 16). A config with `refPrefix` (e.g. 'cr-ref-') gets, on every style, hover and box row, the measured live… |
| `parity/lib/report.mjs` | manifest+script-call | Writes the parity report: report.json (everything), report.md (the differences), and one side-by-side screenshot per state and width (draft left… |
| `parity/lib/review.mjs` | manifest+script-call+skill | The screenshot review gate for draft-live-walk.mjs. Writes contact.md: every state x width side-by-side shot, full size, with the config's review… |
| `parity/lib/state-passes.mjs` | script-call | The per-state passes of draft-live-walk.mjs that move the page: scroll-in reveals, the reveal sweep before a full-page shot, hover end states and… |
| `parity/lib/structure.mjs` | manifest+script-call+skill | Structure and drive checks for draft-live-walk.mjs: where each pair sits relative to the other pairs (inside which, in whose row), and how each state… |
| `qc-anti-cheat.py` | script-call+test-import | Static-analysis gate that fails on converter-cheating patterns. |
| `qc-correctness-regression.py` | — | Mechanical regression checker for the SGS clone pipeline. |
| `qc_anti_cheat_checks.py` | script-call+test-import | Cheat-pattern definitions, AST visitor, and file analysers. |
| `render-mobile-override-audit.js` | — | Render.php inline-vs-media audit. |
| `sgs-block-grep.py` | — | SGS block-name search utility — fixes the block-name-search-blindspot failure mode. |
| `verify-card-swatch-buttons.mjs` | — | Verify the product-card colour-swatch buttons on a live site. |
| `verify-restored-page.js` | — | The Track B definition-of-done requires the restore to be proven on the REAL page via computed DOM (R-31-11), not on assertion output or the emitted… |
| `wc-pages-responsive-audit.js` | manifest+script-call | FR-30-11 — WooCommerce page-type responsive + budget verification gate. |
| `wp-build-page.js` | manifest+script-call+settings | Builds a whole page (or header, footer, drawer, modal, mega menu) through the real block editor from a JSON block tree, so every block is serialised… |
| `wp-migrate-oldshape-blocks.js` | manifest+script-call | block migrations (Track B, 2026-07-15), through the BLOCK EDITOR ONLY. |
| `wp-update-block-attrs.js` | script-call+skill | Reusable Playwright helper that updates a block's attributes on a live WordPress post by going through the editor — using wp.blocks.createBlock(name… |

<!-- TOOLING-CATALOGUE:END -->
