---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-19-phase-9b-intra-section
session_date: 2026-05-18
recommended_model: opus
last_verified: 2026-05-18
update_triggers:
  - "/handoff run"
companion_docs:
  - .claude/state.md
  - .claude/next-session-prompt.md
  - .claude/parking.md
  - .claude/decisions.md
  - .claude/plan.md
---

# Session Handoff — 2026-05-18 (P-WP-ALIGNMENT-WIDTH-SYSTEM full-cycle close + Opus handoff policy)

## Headline

**Full cycle of P-WP-ALIGNMENT-WIDTH-SYSTEM shipped today** across 5+ commits. Task 0 (pages-not-posts), Tasks 2-3 (widthMode infra), orchestrator wiring (cv2 + seed_pipeline_context), end-to-end pipeline run producing verified `widthMode` emission + style-variation auto-lift, clean per-section pixel-diff baseline measured at 1440 across all 9 Mama's sections. Also: `/handoff` skill restructured per Bean's directives — Opus is the default main-agent model, `/capture-lesson` is now a mandatory gate, and Gate 4.5 walks `docs-registry.yaml` authoritatively. Five parking entries opened for Phase 9b intra-section closure work.

## Completed This Session

1. **Task 0 — pages-not-posts (`c7f42003`)** — cv2 pipeline targets WP pages, page 131 created as canary, `upload_and_patch.py` argparse rewrite, brand-cropped pixel-diff at 1440 dropped 58.0% → 43.7% from this template change alone (14.3-point reduction).
2. **Tasks 2-3 — widthMode infrastructure (`86172812`)** — Branches A + B + C: sgs/container schema (`widthMode` + per-viewport + customWidth/Unit), render.php WP-native `alignfull`/`alignwide` emission, editor InspectorControls (98 LOC), converter `_detect_client_layout_widths` + `_write_client_layout_widths` + `_load_theme_widths` + `_match_theme_width` (±5% tolerance), `_lift_root_supports_to_style` emits semantic widthMode when matched. BEM regex correctness bug caught by `/qc-inline` #1 and fixed; editor UI scored 96/100 in pass #2.
3. **Docs walks — `16721374` + `8ec062bc`** — state, handoff, next-session, mistakes, decisions, parking, then architecture, plan, cloning-pipeline-flow, spec-16, common-wp-styling-errors (Section T for the BEM regex trap).
4. **`/sgs-update` refresh (`8995a15a`)** — 71 blocks, 1,714 attributes, 36 patterns, 8 style variations, uimax mirror synced (215 component_libraries rows). Fixed a Stage 4 print-statement KeyError on the retired-animation-table sentinel.
5. **Orchestrator wiring (pending commit)** — `convert_section()` gained `client_slug` + `repo_root` parameters; `seed_pipeline_context()` + `reset_pipeline_seed()` exported from converter_v2; orchestrator passes both at call site + resets at top of stage_4_5_6_7_8_extract. End-to-end run on Mama's mockup with `--converter-v2` produced 376 extracted attrs + 5 widthMode hits + populated `mamas-munches.json:settings.layout`.
6. **WP_DEBUG_DISPLAY suppressed on sandybrown** — diagnosed font-collection PHP Notice contaminating every pixel-diff by 15-40 points; suppressed in wp-config.php.
7. **Clean per-section pixel-diff baseline at 1440** measured across all 9 sections. Five Phase 9b parking entries + three lessons captured to all three persistence layers.
8. **Handoff skill restructured** (`~/.claude/commands/handoff.md`) — Opus-default policy, registry-first plan reconciliation, `/capture-lesson` gate inserted.

## Current State

- **Branch:** main at `8995a15a` (orchestrator wiring + parking + memory + state docs pending in next commit)
- **Tests:** no formal test suite; pixel-diff measurement is the empirical regression check, captured at `reports/brand-walkdown-2026-05-19/page131-clean-1440-*/`
- **Build:** sgs-blocks built clean (`npm run build`, webpack 5.105.2, 6.3s), deployed to sandybrown
- **Page 131 live:** carries fresh cv2-converter output; `<main class="...is-layout-flow...">` confirmed
- **Uncommitted changes:** orchestrator wiring (sgs-clone-orchestrator.py + converter_v2/__init__.py), theme/sgs-theme/styles/mamas-munches.json layout block, parking.md (5 new entries), memory/ (3 new feedback files + MEMORY.md), .claude/commands/handoff.md (gate restructure), state.md / handoff.md / next-session-prompt.md (this walk)

## Known Issues / Blockers

- **P-FOOTER-WRAPPER-CLASS-MISSING** — sgs/footer render.php doesn't emit `.sgs-footer` on the wrapper, so the `.sgs-footer` selector matches a stray `<h2 class="sgs-footer-label">` and inflates footer pixel-diff to 98.7% spuriously. Must fix before footer diffs are trustworthy.
- **P-HEADER-WRAPPER-CLASS-AUDIT** — suspected same pattern.
- `mamas-munches.json:settings.layout = {contentSize: 1000px, wideSize: 1000px}` is incomplete because the SGS-BEM block-root regex doesn't accept `__inner` element widths — see P-DETECT-INNER-ELEMENT-WIDTHS.

## Next Priorities (in order)

1. Fix the two selector-mismatch parking entries (P-FOOTER + P-HEADER) — foundation for trustworthy further measurements
2. Extend `_detect_client_layout_widths` to accept `__inner` element selectors (P-DETECT-INNER-ELEMENT-WIDTHS)
3. Re-run orchestrator with the regex extension; expect wideSize > contentSize in mamas-munches.json
4. Trace the UTF-8 mojibake in gift-section promo bar (P-UTF8-MOJIBAKE-IN-CONVERTER)
5. Open one parking entry per Mama's section under P-INTRA-SECTION-CLOSURE for Phase 9b sweep planning

## Files Modified This Session (post-`8995a15a`)

| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | `convert_section()` signature + `seed_pipeline_context` + `reset_pipeline_seed` helpers + `__all__` export |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | pass `client_slug` + `repo_root=REPO` at convert_section call site; reset_pipeline_seed at top of stage_4_5_6_7_8_extract |
| `theme/sgs-theme/styles/mamas-munches.json` | `settings.layout` block added by `_write_client_layout_widths` (production pipeline output) |
| `.claude/parking.md` | 5 new Phase 9b entries opened |
| `.claude/state.md`, `.claude/handoff.md`, `.claude/next-session-prompt.md` | Registry walk |
| `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_*.md` (×3) + MEMORY.md | 3 new lessons captured |
| `~/.claude/commands/handoff.md` | Gate 3.5 (Opus default) + Gate 4.5 (registry-first) + Gate 4.8 (capture-lesson) |

## Notes for Next Session

- **Always run orchestrator with `--converter-v2`** — without it every boundary's `_cv2_eligible` is False and the legacy extract path runs silently
- **WP_DEBUG_DISPLAY=false on sandybrown** — keep it that way; pixel-diffs need a clean rendered surface
- **Page 131 markup is fresh as of `mamas-munches-homepage-2026-05-17-105020` run** — the page-update endpoint accepts content directly; check `modified` timestamps if uncertain
- **Footer selector mismatch is the single biggest "fake" diff** at 98.7% — fixing it is mechanical (one line in render.php) but the impact on the overall summary numbers is dramatic
