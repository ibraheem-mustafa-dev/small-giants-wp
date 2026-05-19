---
doc_type: handoff
project: small-giants-wp
session_date: 2026-05-19
---

# Session Handoff — 2026-05-19

## Completed This Session

1. **5 RCs in cv2 universal-extraction silent-drop closure** — RC-1 D3 Mode 2 walks `bp_decls` + `_bp_lifted_keys` anti-double-emission; RC-2 `_SUPPORTS_HANDLED_PROPS` tightened 30→17 (justify-content / grid-template-columns / display / width / height / align-items / background-image now flow into D3); RC-3 `seed-slot-synonyms.py` adds split-image / bg-img / bg-video aliases (89 rows total); RC-4 `_collect_css_decls_for_element` splits grouped CSS selectors on `,` first; RC-5 universal `ensure_root_section_class` in `convert_section`. Mama's homepage spot-check: ≥10 of 11 prior silent-drops now surface via D1 or D3.
2. **Container — advanced backgrounds** (`ee15fe00`). 4 inspector tabs (Image / Video / Animation / Overlay), 15 new attrs (bgVideo, bgVideoMobile, bgKenBurns, bgParallax, bgAnimationDuration, overlayGradient + Angle + From + To, backgroundSize, backgroundPosition, backgroundRepeat, backgroundAttachment, backgroundImageTablet, backgroundImageMobile). View.js + render.php + style.css. No deprecations (additive).
3. **ALL 10 static SGS blocks → dynamic** (`8624d316` + `ef14f699`). Batch 1: certification-bar, counter, heading, notice-banner, process-steps, trust-bar. Batch 2: label, feature-grid, multi-button, mobile-nav. Each save→null, deprecated.js shim, render.php verified faithful. `_STILL_STATIC_SGS_BLOCKS = frozenset()`.
4. **Hero block.json dual-cascade fix** (`1ea586b2`). Removed `backgroundColor.default="primary-dark"` + `textColor.default="text-inverse"` — Section H6 anti-pattern. Page 144 hero now renders `has-surface-pink-background-color`.
5. **B1 cv2 chrome-skip leakage + Spec 20 structured log surfacing** (`1ea586b2` + `d2be3d6e`). `walk()` returns None for chrome-skip events; `surface_pipeline_logs.py` Stage 9c writes summary.log always + chrome-skipped/errors/warnings.log conditional. Placement-bug regression (after `--skip-autonomy-gate` early return) caught by /qc-inline against live pipeline.
6. **Lint 77→0** (`529439c9`). 56 false positives fixed by namespace-aware Rule 4; 20 WP-core hooks allow-listed (135-entry JSON catalogue); 1 real rename (`format_counter_number()` → `sgs_format_counter_number()`).
7. **DB enrichment — 10 targets** (`8d007a0a`). 1755 equivalent_implementations populated (100% Rosetta Stone); 811 inspector_control_type; 89 slot_synonyms; 8 style_variations; 39 design_tokens; 13 hooks. Dual-DB parity verified.
8. **wp-* CLI wiring into cloning pipeline** (`f6194921`). 5 integration points + `wp-pre-merge-gate.py` wrapper. 10/10 QC scenarios + `[stage-4j] wp-blocks validate: valid` live evidence.
9. **library-docs CLI repaired** + **/sgs-db default schema dump** + **/wp-blocks dump subcommand**. Tool-name `get-library-docs`→`query-docs`, param `context7CompatibleLibraryID`→`libraryId` (Context7 MCP server schema drift). `/wp-blocks dump` covers all 3 DBs at ~1500 tokens.
10. **Binding rule #4 in project CLAUDE.md** (schema-enumeration discipline, blub.db row 272) + **Spec 20** (renamed from 18 due to collision with 18-SGS-FLOATING-UI) + **Data Sources & Block-Equivalent Layers** consolidated section in flow doc + **flow doc TOC**.

## Current State

- **Branch:** `main` at `6119b93f`
- **Tests:** 16/16 converter_v2 (test_attribute_gap_candidate 8 + test_rc4_grouped_selectors 8 + test_root_supports_lift)
- **Build:** passes (`npm run build` green)
- **Uncommitted changes:** `lucide-icons.php` + `mamas-munches.css` timestamp regen only; untracked `plugins/sgs-blocks/src/blocks/footer/` (collateral from a parallel subagent — not in scope)
- **Live page 144:** https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/ carries cv2 output with hero pink, zero invalid blocks

## Known Issues / Blockers

- **Phase 3 pixel-diff residual differences** from WP global chrome (header/footer template parts + nav menu showing test pages) — theme-template-part work, not converter scope
- **`plugins/sgs-blocks/src/blocks/footer/` untracked** — created by a parallel subagent outside any authorised brief. Decide: integrate or `git clean -fd`
- **Static→dynamic + container changes NOT YET DEPLOYED** to palestine-lives.org. Without `/deploy`, live sites still serve old static save outputs.

## Next Priorities (in order)

1. **Run `/deploy` to palestine-lives.org** — build → tar → SCP → SSH extract → cache clear → OPcache reset. Lands the 10 static→dynamic conversions + container backgrounds + hero block.json fix on the live framework site.
2. **Investigate untracked `src/blocks/footer/`** — diff content; integrate intentionally OR `git clean -fd plugins/sgs-blocks/src/blocks/footer/`.
3. **Align WP global chrome with mockup** — `theme/sgs-theme/parts/header.html` + `footer.html` updates so cloned pages don't show test-page menu items. This is what's blocking Phase 3 pixel-diff from closing.
4. **Re-run pipeline + verify Stage 9c sidecar logs in production flow** (autonomy gate engaged). Today's verification was only against `--skip-autonomy-gate`.
5. **Container advanced backgrounds — operator UX trial** in WP admin on page 144. Exercise the 4 background tabs, verify inspector controls → render.php emission cycle works end-to-end.

## Files Modified

| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | RC-1 + RC-2 + RC-4 + A1 guard + B1 chrome-skip return None + /wp-blocks validate at emit |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | RC-5 ensure_root_section_class + section_id param |
| `plugins/sgs-blocks/scripts/orchestrator/surface_pipeline_logs.py` | NEW — Stage 9c surfacer |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Stage 9c wiring (moved above skip-autonomy early return) + /wp-blocks match cross-check + hook-audit |
| `plugins/sgs-blocks/scripts/wp-pre-merge-gate.py` | NEW — pre-commit gate wrapping wp-blocks + wp-hooks + wp-hook-graph |
| `plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py` | NEW — RC-3 seeder |
| `plugins/sgs-blocks/scripts/uimax-tools/enrich-db.py` | NEW — 10-target DB enrichment stage |
| `plugins/sgs-blocks/src/blocks/hero/block.json` | Removed backgroundColor + textColor defaults |
| `plugins/sgs-blocks/src/blocks/container/{block.json,edit.js,render.php,style.css,view.js}` | Advanced backgrounds (15 new attrs + 4 modes) |
| `plugins/sgs-blocks/src/blocks/{label,feature-grid,multi-button,mobile-nav,certification-bar,counter,heading,notice-banner,process-steps,trust-bar}/save.js` | save → null |
| `plugins/sgs-blocks/src/blocks/{label,feature-grid,multi-button,mobile-nav,heading}/deprecated.js` | NEW deprecation entries |
| `scripts/lint-naming-conventions.py` + `scripts/wp-core-hooks-allowlist.json` | Namespace-aware Rule 4 + 135-hook allow-list |
| `~/.claude/hooks/context7.py` | library-docs MCP tool-name + param rename |
| `~/.claude/hooks/wp-blocks.py` | NEW `dump` subcommand + UIMAX_DB constant |
| `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | No-args default = full schema dump |
| `.claude/specs/20-STRUCTURED-PIPELINE-LOG-SURFACING.md` | NEW (renumbered from 18) |
| `.claude/CLAUDE.md` + `.claude/architecture.md` + `.claude/cloning-pipeline-flow.md` + `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` + `.claude/docs-registry.yaml` | Spec 20 cross-refs + flow-doc TOC + Data Sources section + binding rule #4 |

## Notes for Next Session

- **/qc-inline on live pipeline catches placement bugs** subagent isolated-unit QC misses (blub.db row 273). For any wiring change, run the actual pipeline entry point and inspect artefacts dir — not just call the function in isolation.
- **Schema-enumeration discipline** is binding (blub.db row 272, CLAUDE.md rule #4). Run `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any "missing column" / "missing table" claim.
- **Page 144 = canonical canary** for Mama's Munches cv2 verification. Don't recreate; patch with `upload_and_patch.py` on each new pipeline run.
- **`/deploy` is project-scoped** (`.claude/skills/deploy/SKILL.md`) — distinct from user-level `/deploy-check`. Use `/deploy` for the actual deploy; `/deploy-check` for pre-flight checklist.

## Next Session Prompt

See [.claude/next-session-prompt.md](next-session-prompt.md) — orchestration plan with per-task dispatch annotations.
