# Verification Criteria — Architecture Programme 2026-05-21

Reference: `.claude/plans/2026-05-21-architecture-staging.md`

## Phase 0 — Data seeding (SHIPPED `aec54882`)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| `slot_synonyms.standalone_block` seeded for ~30 slots | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM slot_synonyms WHERE standalone_block IS NOT NULL"` | ≥ 30 | DONE |
| `blocks.parent_block` seeded for button family | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM blocks WHERE parent_block IS NOT NULL"` | ≥ 18 (form fields) + ~7 button/slider rows | DONE |
| `blocks.replaces` column exists + seeded | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM blocks WHERE replaces IS NOT NULL"` | ≥ 20 | DONE |
| `--client` auto-derive fires in orchestrator | `grep 'client.*auto-derive\|auto_derive_client' plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Match | DONE |

## Phase 0.5 — Structural QC hook (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Hook file exists | `ls .claude/hooks/qc-on-converter-edit.py` | File exists | PENDING |
| Hook wired in settings.json | `grep qc-on-converter-edit .claude/settings.json` | Match | PENDING |
| Hook fires on converter edit | Edit a line in `convert.py`, check systemMessage appears | Warning emitted | PENDING |
| Hook fires on orchestrator edit | Edit a line in `sgs-clone-orchestrator.py`, confirm | Warning emitted | PENDING |

## Phase 1 — DB merge (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| `source` column in blocks table | `python plugins/sgs-blocks/scripts/sgs-db.py query "PRAGMA table_info(blocks)"` | Column named `source` present | PENDING |
| Native WP blocks imported | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM blocks WHERE source='native_wp'"` | ≥ 70 (gutenberg core blocks) | PENDING |
| hooks.db rows present | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM hooks"` | ≥ 7000 (hooks.db had 7283 hooks) | PENDING |
| docs table has CLI doc_type | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM docs WHERE doc_type='cli-command'"` | ≥ 10 | PENDING |
| Single query spans WP + SGS | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM blocks"` | ≥ 140 (70 core + 73 SGS) | PENDING |

## Phase 3 — INNER_BLOCK_PATTERNS retirement (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Dict deleted from convert.py | `grep INNER_BLOCK_PATTERNS plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | No match | PENDING |
| Hero CTAs still render | Navigate to page 131, inspect DOM | Hero has visible CTA buttons | PENDING |
| Adjacent-button grouping works | Run clone on a mockup with 2 adjacent `sgs-button` siblings | Both wrapped in single `sgs/multi-button` parent block | PENDING |
| cv2 regression tests pass | `python -m pytest plugins/sgs-blocks/scripts/orchestrator/converter_v2/ -v` | All passing | PENDING |

## Phase 5a — Variation system kill (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| 3 PHP files deleted | `ls plugins/sgs-blocks/includes/class-sgs-variation-picker.php plugins/sgs-blocks/includes/class-variation-rest.php plugins/sgs-blocks/includes/class-sgs-legacy-theme-mod-migrator.php` | Files not found (exit 2) | PENDING |
| `theme/sgs-theme/styles/` empty | `ls theme/sgs-theme/styles/` | No JSON files | PENDING |
| Per-client snapshots exist | `ls sites/mamas-munches/theme-snapshot.json` | File exists | PENDING |
| push-theme-snapshot.py exists | `ls plugins/sgs-blocks/scripts/push-theme-snapshot.py` | File exists | PENDING |
| Push script deploys correctly | `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client mamas-munches --dry-run` | Outputs diff to stdout, no writes | PENDING |
| Browse-styles UI hidden | Visit WP Admin → Appearance → Editor → Styles | No style-switcher visible | PENDING |

## Phase 5b — Customiser migration + button presets (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| `class-button-presets-admin.php` deleted | `ls plugins/sgs-blocks/includes/class-button-presets-admin.php` | Not found | PENDING |
| `wp_options.sgs_button_presets` gone | `wp option get sgs_button_presets` | Error: option not found | PENDING |
| Button styles in theme.json | `grep hover theme/sgs-theme/theme.json` | Pseudo-element styles present | PENDING |
| Header Customiser section exists | Visit WP Admin → Appearance → Customise | "SGS Header" panel visible | PENDING |
| Footer Customiser section exists | Same location | "SGS Footer" panel visible | PENDING |
| Site Info Customiser section exists | Same location | "SGS Site Info" panel visible | PENDING |
| View Transitions fire in Customiser | Navigate between Customiser panels in WP 7.0 | Smooth transition animation | PENDING |

## Phase 6 — WP 7.0 audits (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| All blocks have apiVersion 3 | `grep -rL '"apiVersion": 3' plugins/sgs-blocks/src/blocks/` | No output (all blocks have it) | PENDING |
| role:content on content attrs | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM block_attributes WHERE role='content'"` | Significant increase from baseline | PENDING |
| Markup examples exist | `python plugins/sgs-blocks/scripts/sgs-db.py query "SELECT count(*) FROM markup_examples"` | ≥ 73 (one per block minimum) | PENDING |
| Lucide uses Icons REST | `grep WP_REST_Icons_Controller plugins/sgs-blocks/includes/lucide-icons.php` | Match | PENDING |

## Phase 7 — WP 7.0 skills audit (PENDING)

| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| Sgs_Ai_Connector exists | `ls plugins/sgs-blocks/includes/class-sgs-ai-connector.php` | File exists | PENDING |
| AI Connector registers properly | `grep wp_get_connectors plugins/sgs-blocks/includes/class-sgs-ai-connector.php` | Match | PENDING |
| WP-skills audit report exists | `ls .claude/reports/wp-skills-wp70-audit-*.md` | File exists | PENDING |
