# Mistakes archive

<!-- retired 2026-07-21 to hold the active set at the 30 cap -->
### [2026-05-27] Spec 22 §FR-22-2.5 "Phase 0.1 backfill priority list" drift — 3 of 4 entries didn't grep-verify against codebase
- **Pattern key:** `spec-22-fr-22-2-5-priority-list-drift`
- **Feedback file:** `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_spec_22_fr_22_2_5_priority_list_drift.md`
- **Evidence:** Spec listed `sgs/social-proof.testimonials` (block doesn't exist), `sgs/info-box.items` (attr doesn't exist), `sgs/certification-bar.badges` (wrong attr name). Only `product-card.packSizes` grep-verified. Caught at Phase 1.3 dispatch by main-thread grep before Sonnet ran. Decision D89.
- **Rule:** Every load-bearing target name in any spec / next-session-prompt / cold-prompt MUST grep-verify against current codebase BEFORE dispatching action.

### [2026-05-25] Phases never ship as single commits; major-task cadence with /qc-council + /sgs-clone + predicted/actual delta per commit
- **Pattern key:** `phases-never-ship-as-single-commits`
- **blub.db row:** `288`
- **Feedback file:** [feedback_phases_never_ship_as_single_commits.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_phases_never_ship_as_single_commits.md)

### [2026-06-02] No composite block evades R-22-9 — composites with built-in wrappers mirror sgs/container
- **Pattern key:** `no-composite-evades-universal-rule`
- **Feedback file:** [feedback_no_composite_evades_universal_rule.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_composite_evades_universal_rule.md)

---

## Recurring patterns (older — stable reference)

| Lesson | One-line summary | Detail |
|--------|-----------------|--------|
| `always-screenshot-verify` | Take a frontend screenshot and inspect before claiming any fix complete | [feedback_always_screenshot_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_always_screenshot_verify.md) |
| `verify-rendered-output-not-internal-metrics` | Internal metrics never prove visual outcomes — live-DOM assertion required | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) (blub.db row 194) |
| `block-validation-recovery` | Attribute changes not rendering → check for block validation errors in editor | [feedback_block_validation_recovery.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_block_validation_recovery.md) |
| `parallel-dispatch-shared-files` | Never run parallel agents on the same file — sequentialise or scope by file | [feedback_parallel_dispatch_shared_files.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_parallel_dispatch_shared_files.md) |
| `read-leftover-buckets-before-conjecturing` | Read pipeline-state/<run>/leftover-buckets.json FIRST when diagnosing converter gaps | [feedback_read_leftover_buckets_before_conjecturing.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_leftover_buckets_before_conjecturing.md) (blub.db row 254) |
| `multi-model-qc-before-commit` | Multi-model /qc panel (Sonnet+Haiku+Gemini+Cerebras) BEFORE every converter commit | [feedback_multi_model_qc_before_commit.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_multi_model_qc_before_commit.md) (blub.db row 255) |
| `per-section-cropped-pixel-diff` | Pixel-diff via --selector .sgs-{section} at 3 viewports, not full-page | [feedback_per_section_cropped_pixel_diff.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_per_section_cropped_pixel_diff.md) (blub.db row 256) |

## Reference catalogues

- **Common WordPress styling errors** — 21+ failure patterns each with cause + fix: [`specs/common-wp-styling-errors.md`](specs/common-wp-styling-errors.md)
- **Full archive** — entries older than 2026-05-18: [`memory/mistakes-archive.md`](memory/mistakes-archive.md)

## How to add a lesson

Use `/capture-lesson`. It appends the keyword-stub format here automatically and writes full body to feedback_*.md + blub.db.
