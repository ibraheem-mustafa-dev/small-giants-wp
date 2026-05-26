---
doc_type: reference
title: Pipeline-state debug artefacts inventory
generated: 2026-05-23
canonical: true
purpose: |
  Single-source-of-truth catalogue of EVERY artefact written by /sgs-clone into
  pipeline-state/<run_id>/. Use this BEFORE conjecturing about pipeline failures
  (blub.db row 254 binding rule). Each artefact has a role + which stage writes
  it + which downstream stage reads it + how to read it for diagnostic purposes.
---

# Pipeline-state debug artefacts inventory

Every `/sgs-clone --deploy-target <target>` run writes 15+ JSON/log artefacts under `pipeline-state/<run_id>/`. This doc maps each one to its role + stage + diagnostic use. **Read this BEFORE diagnosing any pipeline failure** (blub.db row 254 binding rule).

## Mandatory diagnostic sequence

When investigating any pipeline issue, read these artefacts IN ORDER:

1. **`summary.log`** — what stages ran, what closed, what errored. Establishes pipeline-level health in 30 seconds.
2. **`trace.jsonl`** — per-stage per-decision event log. Filter by `stage` field to scope to the failing stage.
3. **`leftover-buckets.json`** — gap classification. **Trust the orchestrator's classification before conjecturing root cause.**
4. **Stage-specific artefact** for the failing stage (see table below)
5. **`stage-11-pixel-diff.json`** — empirical pixel-diff per section × viewport. The canonical "did the fix work" measurement.

## Full artefact inventory

| Artefact | Role | Written by | Read by (downstream) | Diagnostic use |
|---|---|---|---|---|
| `summary.log` | Session-level summary of every stage's events/errors/warnings | Stage 9c (`surface_pipeline_logs.py`, post Stage 9 close) | Operator only — human-readable | First-read. 30-sec pipeline-health check. Per-stage event counts surface stages that didn't fire or threw warnings. |
| `trace.jsonl` | Per-stage per-decision event log; `_trace()` calls from every walker branch + stage transition | Every stage that calls `_trace()` (mostly convert.py walker + stage handlers) | Stage 9c sorts into `chrome-skipped.log` / `errors.log` / `warnings.log` sidecars when bucket ≥ 1 | **Primary diagnostic.** Filter by `stage` field. For walker issues, also filter by `boundary_id`. Each event has a `branch` field naming the code path taken. |
| `errors.log` | Per-severity sidecar — error-level trace events only | Stage 9c (post Stage 9) | Operator only | Quick error scan when summary.log shows errors > 0. |
| `warnings.log` | Per-severity sidecar — warning-level trace events only | Stage 9c | Operator only | Quick warning scan. |
| `chrome-skipped.log` | Per-severity sidecar — chrome-skip events (WP admin bar, page-id wrappers, etc.) | Stage 9c | Operator only | Use when section count seems wrong (chrome may have been mis-classified as content). |
| **`stage-0.1-bem-lint.json`** | Stage 0.1 output — BEM compliance lint result | `stage_0_1_bem_lint` (orchestrator.py:116) | Operator + Stage 0.5 | Investigate "draft mode" warnings or strict-mode halts on non-SGS-BEM classes. |
| **`stage-0.5-token-lint.json`** | Stage 0.5 output — token-usage lint (additive token discovery) | `stage_0_5_token_lint` (orchestrator.py:188) | Operator + Stage 0.7 | Investigate new-token candidates; verify the overlay variation applied (top-level field). |
| **`variation-d0-d2.css`** (was `theme/sgs-theme/styles/<client>.css` pre-2026-05-23 commit `f2fdd091`) | Stage 0.7 output — D0 + D2 CSS rules (global + scoped client CSS) — pipeline-internal intermediate | `stage_0_7_css_lift` via `css_router.write_variation_css()` | **G2 merge READER** at orchestrator.py:1432 — merged into `_section_css` for cv2 | Use when cv2 reports `variation_css_rules=0` for a section that should have rules. Confirms the file exists + has the rules. |
| **`stage-7.json`** | Stage 0.7 artefact wrapper — output_path + D0/D1/D2/D3 counts + sources + chrome-skipped | `write_artefact(... stage_n=7, stage_name='css-lift', ...)` | Operator | Verify file path Stage 0.7 wrote to. Quick check that the D0/D1/D2/D3 router fired correctly. |
| **`css-d1-assignments.json`** | Stage 0.7 D1 sidecar — typed-attr assignments (block_attribute lift candidates) | Stage 0.7 router | Stage 4 cv2 (`extract` step) | When cv2 mis-extracts a typed attribute, check whether D1 assignment exists here. |
| **`stage-1.json`** / **`voter.json`** | Stage 1 boundary + convention voter output — list of section boundaries with their candidate block slug + confidence + convention | `stage_1_boundary` + `per-section-convention-voter.py` | Stage 2 confidence matrix | When Stage 2 falls a section through to `core/group`/`sgs/container`, check voter.json — voter usually IDs the right slug; Stage 2 may reject because the slug isn't a registered block. |
| **`stage-2.json`** / **`match.json`** | Stage 2 confidence matrix output — per-boundary `top_pick` + `confidence` + `tie_breaker` + `considered` array | `stage_2_match` (orchestrator.py:994) using confidence-matrix.py | Stage 3 + Stage 4 | **CRITICAL diagnostic for G1+G3+G5 symptoms.** Read `considered` array per boundary to see which slug candidates were rejected and why (registered: false / missing pattern PHP file / etc.). |
| **`stage-3.json`** / **`slot-list.json`** | Stage 3 slot list — per matched block, list of slots derived from block.json + DB canonical_slot lookups | `stage_3_slot_list` | Stage 4 extract + Stage 9 gap reporter | Verify slot_count + db_canonical_count + auto_derived_count per boundary. Mismatched expectations surface DB drift (block_attributes out of sync with src/ block.json). |
| **`stage-4.json`** | Stage 4 cv2 converter output — per-boundary `target_block` + `markup_lines` + `variation_css_rules` + `extracted_attr_count` | `stage_4_converter_v2` | Stage 4i + Stage 7 + Stage 9 | Primary measure of "did extraction work". Low `extracted_attr_count` for a registered block = extractor missed slots. |
| **`stage-4i.json`** | Stage 4i media-sideload manifest — image slots staged for upload | `stage_4i_media_sideload` | Stage 10 deploy | When deployed page renders broken images, check this artefact for `id=null` (dry-run mode) vs real WP media IDs. |
| **`stage-4j.json`** | Stage 4j wp-blocks validate — confirms emitted markup parses as valid WP blocks | `stage_4j_wp_blocks_validate` | Stage 9 + Stage 10 | When stage-10 deploy succeeds but live page shows "invalid block" warnings, check this. Should always be `valid` post-fix. |
| **`extract.json`** | Final per-section extraction summary — block_markup + extracted_attributes + warnings per section | `stage_4_converter_v2` (final step) | Stage 9 gap detector + Stage 10 upload | **Truth for "what did cv2 emit"** — read per-section `block_markup` to confirm hero CTAs / trust-bar items / etc. actually landed in the output. |
| **`extract-result.json`** | Stage 4 result wrapper — aggregates per-section results + overall counts | `stage_4_converter_v2` | Operator | High-level extract result. Less detail than extract.json. |
| **`stage-9.json`** | Stage 9 coverage + gap report output — bucket counts + autonomy chain stats + attribute_gap_writer + functionality_gap_detector results | `stage_9_report` | Operator + Stage 9b autonomy + +REGISTER | When leftover-buckets count seems wrong, check stage-9.json for the orchestration metadata (which writers fired, which gap candidates were detected). |
| **`leftover-buckets.json`** | Gap classification — 5-bucket router output (`unrecognised_class` / `unrecognised_section` / `extraction_failed` / `animation_unclassified` / `structural_mismatch_or_orphan`) + chrome_skipped + cv2_handled_no_top_level_match | `leftover-bucket-router.py` (Stage 9) | Operator + recognition_log + future councils | **THE binding artefact per blub.db row 254** — read BEFORE conjecturing about converter quality or pixel-diff causes. Each gap has section + slot + reason + severity. |
| **`stage-91.json`** | Stage 9.1 attribute_gap_candidates writer output — staged DB inserts | `attribute-gap-writer.py` (Stage 9) | sgs-framework.db `attribute_gap_candidates` table | Verify gap candidates were INSERTed correctly. Quote `dedupe_count` + `inserted_count` to confirm idempotency. |
| **`operator-review.html`** | Stage 9 human-review surface — per-section + per-slot interactive review | `simple_html_review_report.py` (Stage 9) | Operator only | Open in browser when a leftover gap needs human classification (e.g. unrecognised pattern → new SGS block candidate). |
| **`stage-10.json`** (sometimes inline in stage 10 stdout only) | Stage 10 deploy result — page-id patched + media-sideload status + theme-snapshot push status | `stage_10_deploy` | Stage 11 pixel-diff | Cite this when a deploy reports "OK" but page didn't update — exit codes 4/5/6 now surface phantom-page / id-mismatch / no-id-in-body halts (commit `700ff211` 2026-05-23). |
| **`stage-11-pixel-diff.json`** (NEW 2026-05-23 commit `1331f23a`) | Per-section pixel-diff against the deployed page, 27 captures (9 sections × 3 viewports 375/768/1440) | Stage 11 (post Stage 10 deploy) via `scripts/pixel-diff.py` subprocess | Operator + future councils | **The canonical "did the fix work" measurement.** Captures land in `pipeline-state/<run>/pixel-diff/<safe-sel>-<width>/`. Aggregate in `stage-11-pixel-diff.json` shows `mean_mismatch_percent` per run + per-section breakdown. |
| **`critical-fix-verification.json`** | Stage 4k lightweight acceptance harness (per Spec 14 FR18) — 5-check smoke test | `critical-fix-verification.py` (post Stage 4) | Operator | Should always show `4/4 checks passed` or `5/5`. When less, surfaces a regression in core invariants (block.json discoverable, slot list generated, etc.). |
| **`media-sideload-manifest.json`** | Media-sideload audit — per-image source URL + target attachment ID + status (uploaded / dry-run / failed) | Stage 4i | Stage 10 upload_and_patch | Use when live page shows broken/missing images. `id: null` means dry-run; `error: <msg>` means upload failed. |
| **`deliverable.md`** (in `pipeline-state/sgs-clone/<run>/`) | Autonomy-chain deliverable — synthesised outcome + autonomy decision + pattern-promotion summary | `orchestrator_main.run()` autonomy chain | Operator + +REGISTER | When +REGISTER fires unexpectedly OR fails to fire, check this for `outcome.overall` + `capture_mode` + `decision`. |
| **`proposed-patterns/`** (in `pipeline-state/sgs-clone/<run>/`) | Staged pattern PHP files (FR21 keystone — never mutates anything outside pipeline-state) | Stage 9b autonomy chain scaffold + +REGISTER stage | Operator (manual promote) + future /sgs-clone runs | Inspect when autonomy chain proposes new patterns. Files here are NOT yet in `theme/sgs-theme/patterns/`. |
| **`gap-review.md`** (in `pipeline-state/sgs-clone/<run>/`) | Operator-facing gap-review markdown | `gap-review-report.py` (Stage 9) | Operator only | Read when triaging unrecognised classes / unrecognised sections / extraction failures into actionable next-steps. |

## Per-stage diagnostic flowchart

When stage N appears to have failed, the diagnostic path is:

```
stage_0_1 BEM lint failure         → stage-0.1-bem-lint.json
stage_0_5 token lint failure       → stage-0.5-token-lint.json + overlay variation field
stage_0_7 CSS-lift / G2 merge      → stage-7.json output_path + variation-d0-d2.css contents + css-d1-assignments.json
stage_1 voter wrong slug           → stage-1.json / voter.json (per-boundary candidate slug)
stage_2 fall-through to fallback   → stage-2.json / match.json `considered` array per boundary
stage_3 slot list short            → stage-3.json / slot-list.json (slot_count vs expected)
stage_4 extraction missed          → stage-4.json per-boundary attrs/css + extract.json per-section block_markup
stage_4i media broken              → stage-4i.json + media-sideload-manifest.json
stage_4j WP blocks invalid         → stage-4j.json validate output
stage_9 wrong gap classification   → stage-9.json + leftover-buckets.json bucket distribution
stage_9b autonomy decision         → deliverable.md + proposed-patterns/
stage_10 deploy report OK but not  → exit code from upload_and_patch.py (4 = 404 / 5 = id-mismatch / 6 = no-id-in-body)
stage_11 pixel-diff numbers wrong  → pixel-diff/<sel>-<vp>/diff.json + mockup.png + sgs.png + heatmap.png
+REGISTER unexpected promotion     → deliverable.md `outcome.overall` + `capture_mode`
```

## Binding rules (blub.db rows)

- **Row 254** — Read `leftover-buckets.json` BEFORE conjecturing about converter quality or pixel-diff causes
- **Row 255** — Multi-model `/qc` panel before commits touching converter/pipeline/SGS-block logic. Read these artefacts to ground the panel.
- **Row 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`, never full-page. Stage 11 now does this automatically.
- **Row 272** — Schema enumeration via `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any "missing X" claim
- **Row 194** — Verify rendered output, not internal metrics. Stage 11's pixel-diff captures the rendered output.

## Reference doc cross-links

- `.claude/cloning-pipeline-flow.md` — per-stage block descriptions with WHERE each artefact gets written
- `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §2-§3 — canonical pipeline architecture (Spec 16 retired 2026-05-26; archived at `.claude/specs/archive/`)
- `.claude/specs/20-STRUCTURED-PIPELINE-LOG-SURFACING.md` — Stage 9c log-surfacing spec
- `~/.claude/skills/sgs-clone/SKILL.md` — pipeline orchestration + Hard Rules 1-14

## Maintenance

Update this doc whenever:
- A new stage artefact is added (e.g. Stage 11 added 2026-05-23)
- An artefact's filename changes (e.g. Stage 0.7 CSS path changed from `theme/sgs-theme/styles/<client>.css` to `pipeline-state/<run>/variation-d0-d2.css` on 2026-05-23 commit `f2fdd091`)
- An artefact is retired
- The diagnostic mapping changes

The single registry entry is in `.claude/docs-registry.yaml` under `canonical_docs`.
